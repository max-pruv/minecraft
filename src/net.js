// Peer-to-peer multiplayer over WebRTC. PeerJS (vendored, window.Peer)
// handles signaling through its free public cloud broker, so two devices
// anywhere on the internet can meet with just a shared room code.
//
// Topology: the session creator claims the peer id derived from the room
// code; joiners connect to it. The host relays ops/positions between
// guests, so 3+ players work too. The world itself is an edit log with
// per-block timestamps — on every connection both sides exchange full logs
// and merge them last-writer-wins, which is what makes the session
// "continue": each child can build alone offline, and the next time any
// two devices meet, their histories converge automatically.

const ID_PREFIX = 'wmc-marlon-';

// Sans relais, deux appareils derrière le même partage de connexion mobile ne
// se joignent pas : l'opérateur place tout le monde derrière une traduction
// d'adresses qui change de port à chaque destination, et les candidats
// directs ne mènent nulle part. Le trafic passe alors par le relais, plus
// lent mais qui, lui, aboutit toujours. C'est ce qui manquait le jour où
// Alice et Marlon étaient dans le même monde sans se voir.
const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// Un lien mort ne se signale pas tout seul : le navigateur peut mettre une
// minute à s'en apercevoir, et pendant ce temps l'enfant construit dans le
// vide. On envoie donc un battement régulier et on coupe ce qui ne répond plus.
const HEARTBEAT_MS = 5000;
const STALE_MS = 20000;

export function randomCode() {
  // 5 digits: easy for kids to read out loud and type on a phone keypad
  return String(10000 + Math.floor(Math.random() * 90000));
}

export class NetSession {
  // hooks: { world, toast(msg,color), onPlayers(list), onState(text) }
  constructor(hooks) {
    this.hooks = hooks;
    this.peer = null;
    this.conns = new Map();   // peerId -> { conn, name, lookIdx, pos, yaw, moving }
    this.calls = new Map();   // peerId -> MediaConnection
    this.audios = new Map();  // peerId -> <audio>
    this.isHost = false;
    this.code = null;
    this.profile = null;      // { name, lookIdx }
    this.localStream = null;
    this.micOn = false;
    this.videoStream = null;
    this.camOn = false;
    this.videoCalls = new Map();   // peerId -> outbound video MediaConnection
    this.inboundVideo = new Map(); // peerId -> inbound video MediaConnection
    this.onRemoteVideo = null;     // hook(peerId, stream) — main shows the tile
    this.onRemoteVideoClosed = null;
    this.posTimer = null;
    this.getPos = null;       // set by main: () => ({x,y,z,yaw,moving})
    this.active = false;
  }

  playerCount() { return this.conns.size + 1; }

  state(text) { if (this.hooks.onState) this.hooks.onState(text); }

  playersChanged() {
    if (this.hooks.onPlayers) {
      this.hooks.onPlayers([...this.conns.entries()].map(([id, c]) => ({
        id, name: c.name, lookIdx: c.lookIdx, look: c.look, pos: c.pos, yaw: c.yaw, moving: c.moving,
      })));
    }
  }

  start(code, isHost, profile) {
    this.code = code.toUpperCase();
    this.isHost = isHost;
    this.profile = profile;
    this.active = true;
    this.state(isHost ? 'Création de la partie…' : 'Connexion à la partie…');

    return new Promise((resolve, reject) => {
      const peerOpts = { debug: 1, config: { iceServers: ICE_SERVERS } };
      // tests can point signaling at a local server via ?peerhost=host:port
      const m = location.search.match(/[?&]peerhost=([^&]+)/);
      if (m) {
        const [h, p] = decodeURIComponent(m[1]).split(':');
        Object.assign(peerOpts, { host: h, port: Number(p) || 443, path: '/', secure: false, key: 'peerjs' });
      }
      this.peer = isHost ? new Peer(ID_PREFIX + this.code, peerOpts) : new Peer(peerOpts);
      let settled = false;

      this.peer.on('open', () => {
        this._reconnectTries = 0;
        this.link('ok');
        if (isHost) {
          this.state(`En attente d'un joueur… code : ${this.code}`);
          settled = true;
          resolve(this.code);
        } else {
          this.connectToHost((err) => {
            if (settled) return;
            settled = true;
            if (err) reject(err); else resolve(this.code);
          });
        }
      });

      this.peer.on('connection', (conn) => {
        this.registerConn(conn); // handlers BEFORE open — no missed messages
        if (conn.open) this.greet(conn);
        else conn.on('open', () => this.greet(conn));
      });

      this.peer.on('call', (call) => {
        if (call.metadata && call.metadata.kind === 'video') {
          call.answer(undefined); // video flows one-way per call; we place our own
          this.attachVideoCall(call, true);
        } else {
          call.answer(this.localStream || undefined);
          this.attachCall(call);
        }
      });

      // L'iPad qui s'endort perd le serveur de rendez-vous. Sans reconnexion,
      // la partie continue avec ceux déjà là mais plus personne ne peut
      // rejoindre — et personne n'en est averti.
      this.peer.on('disconnected', () => {
        if (!this.active) return;
        this.link('signal', 'Reconnexion au serveur de jeu…');
        this.scheduleReconnect();
      });
      this.peer.on('close', () => { if (this.active) this.link('perdu', 'Connexion au serveur de jeu perdue'); });

      this.peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          if (!settled) { settled = true; reject(new Error('Ce code est déjà utilisé — réessaie !')); }
        } else if (err.type === 'peer-unavailable') {
          if (!settled) { settled = true; reject(new Error('Partie introuvable — vérifie le code !')); }
        } else if (!settled && (err.type === 'network' || err.type === 'server-error')) {
          settled = true;
          reject(new Error('Pas de connexion internet au serveur de jeu'));
        } else if (err.type === 'network' || err.type === 'server-error') {
          this.link('signal', 'Serveur de jeu injoignable — je réessaie…');
          this.scheduleReconnect();
        }
      });
    });
  }

  // État du lien, pour que la page puisse le montrer. Un enfant ne doit pas
  // continuer à construire en croyant que tout va bien.
  link(state, detail) {
    if (this.linkState === state && !detail) return;
    this.linkState = state;
    if (this.onLink) this.onLink(state, detail || '');
  }

  // Un invité rejoint toujours par le même chemin — au démarrage comme après
  // une coupure. `done` n'est appelé qu'à la première tentative.
  connectToHost(done) {
    const conn = this.peer.connect(ID_PREFIX + this.code, { reliable: true });
    if (!conn) { done?.(new Error('Connexion impossible')); return; }
    this.registerConn(conn); // handlers BEFORE open — no missed messages
    let fini = false;
    const rate = (err) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuteur);
      done?.(err);
    };
    // Le pair existe (sinon PeerJS aurait dit « introuvable ») mais le canal
    // ne s'ouvre pas : c'est le réseau qui bloque, pas le code qui est faux.
    // Le dire franchement évite de chercher une faute de frappe pendant que
    // le vrai coupable est le Wi-Fi de l'école.
    const minuteur = setTimeout(
      () => rate(new Error('Le monde existe mais le réseau bloque la connexion — essaie un autre Wi-Fi ou le partage de connexion')),
      12000,
    );
    conn.on('open', () => {
      clearTimeout(minuteur);
      this._rejoining = false;
      this.greet(conn);
      this.link('ok');
      if (!fini) { fini = true; done?.(null); }
    });
    conn.on('error', () => rate(new Error('Connexion impossible')));
  }

  // L'hôte a disparu ou la connexion a sauté : on retente, en le disant.
  // Sans cela, l'invité restait seul dans un monde qui semblait normal.
  rejoinHost() {
    if (this.isHost || !this.active || this._rejoining) return;
    this._rejoining = true;
    let essai = 0;
    const tenter = () => {
      if (!this.active || !this._rejoining || !this.peer || this.peer.destroyed) return;
      if (essai >= 6) {
        this._rejoining = false;
        this.link('perdu', 'Le monde en ligne ne répond plus — reviens au menu et retente');
        return;
      }
      essai++;
      this.link('reconnexion', `Reconnexion au monde ${this.code}… (${essai}/6)`);
      if (this.peer.disconnected) { try { this.peer.reconnect(); } catch { /* au tour suivant */ } }
      this.connectToHost(null);
      this._rejoinTimer = setTimeout(() => { if (this._rejoining) tenter(); }, 3000 + essai * 2000);
    };
    tenter();
  }

  scheduleReconnect() {
    if (!this.active || this._reconnectTimer) return;
    const essai = Math.min(this._reconnectTries || 0, 5);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (!this.active || !this.peer || this.peer.destroyed) return;
      this._reconnectTries = (this._reconnectTries || 0) + 1;
      try { this.peer.reconnect(); } catch { /* on repasse par ici */ }
      if (this.peer.disconnected) this.scheduleReconnect();
    }, 1000 * 2 ** essai);
  }

  // Battement de cœur : on prouve régulièrement que le lien vit, et on coupe
  // ce qui ne répond plus. Un pair fantôme laissait sinon un avatar figé au
  // milieu du monde et faussait le compte des joueurs.
  startHeartbeat() {
    if (this._hb) return;
    this._hb = setInterval(() => {
      const now = Date.now();
      for (const [id, c] of [...this.conns]) {
        if (!c.conn) continue;
        if (c.seen && now - c.seen > STALE_MS) { this.dropPeer(id); continue; }
        try { c.conn.send({ t: 'ping' }); } catch { this.dropPeer(id); }
      }
    }, HEARTBEAT_MS);
  }

  registerConn(conn) {
    this.conns.set(conn.peer, { conn, name: '…', lookIdx: 0, pos: null, yaw: 0, moving: false, seen: Date.now() });
    conn.on('data', (msg) => this.onMessage(conn, msg));
    conn.on('close', () => this.dropPeer(conn.peer));
    conn.on('error', () => this.dropPeer(conn.peer));
    this.startHeartbeat();
  }

  greet(conn) {
    // handshake: who we are + everything we know about the world
    conn.send({ t: 'hello', name: this.profile.name, lookIdx: this.profile.lookIdx, look: this.profile.look });
    conn.send({ t: 'sync', blocks: this.hooks.world.exportEdits() });
    this.startPosLoop();
  }

  dropPeer(id) {
    const c = this.conns.get(id);
    if (!c) return;
    this.conns.delete(id);
    // Pour un invité, perdre ce lien-là, c'est perdre le monde entier :
    // tout passe par l'hôte.
    if (!this.isHost && this.active && id === ID_PREFIX + this.code) this.rejoinHost();
    if (this.isHost) { // tell the other guests this player is gone
      for (const o of this.conns.values()) if (o.conn) o.conn.send({ t: 'bye', from: id });
    }
    this.hooks.toast(`👋 ${c.name} est parti·e`, 0xcccccc);
    this.state(this.statusText());
    const call = this.calls.get(id);
    if (call) { call.close(); this.calls.delete(id); }
    const audio = this.audios.get(id);
    if (audio) { audio.remove(); this.audios.delete(id); }
    const vOut = this.videoCalls.get(id);
    if (vOut) { vOut.close(); this.videoCalls.delete(id); }
    const vIn = this.inboundVideo.get(id);
    if (vIn) { vIn.close(); this.inboundVideo.delete(id); }
    if (this.onRemoteVideoClosed) this.onRemoteVideoClosed(id);
    this.playersChanged();
  }

  statusText() {
    const n = this.playerCount();
    return n > 1 ? `🌐 ${n} joueurs · code ${this.code}` : `En attente d'un joueur… code : ${this.code}`;
  }

  onMessage(conn, msg) {
    const entry = this.conns.get(conn.peer);
    if (!entry || !msg || typeof msg !== 'object') return;
    entry.seen = Date.now(); // tout message vaut preuve de vie
    switch (msg.t) {
      case 'ping':
        try { conn.send({ t: 'pong' }); } catch { /* le lien se ferme, on le verra */ }
        break;
      case 'pong':
        break;
      case 'hello': {
        const wanted = String(msg.name || 'Joueur').slice(0, 16);
        // one session per player name: the host refuses a duplicate so the
        // same account can't be online from two devices at once
        if (this.isHost) {
          const taken = wanted === this.profile.name ||
            [...this.conns.values()].some((c) => c !== entry && c.name === wanted);
          if (taken) {
            conn.send({ t: 'duplicate', name: wanted });
            setTimeout(() => { try { conn.close(); } catch { /* already gone */ } }, 400);
            this.conns.delete(conn.peer);
            this.playersChanged();
            break;
          }
        }
        entry.name = wanted;
        entry.lookIdx = Number(msg.lookIdx) || 0;
        entry.look = msg.look && typeof msg.look === 'object' ? msg.look : null;
        this.hooks.toast(`🎉 ${entry.name} a rejoint la partie !`, 0x6ee06e);
        this.state(this.statusText());
        this.playersChanged();
        if (this.micOn) this.callPeer(conn.peer);      // start voice with newcomers
        if (this.camOn) this.videoCallPeer(conn.peer); // and video too
        break;
      }
      case 'duplicate':
        if (this.onDuplicate) this.onDuplicate(msg.name);
        break;
      case 'chat':
        if (this.onChat) this.onChat(String(msg.name || '').slice(0, 16), String(msg.msg || '').slice(0, 120));
        if (this.isHost) this.relay(conn.peer, msg);
        break;
      case 'duel': // friendly creature show-off between two players
        if (this.onDuel) this.onDuel(msg);
        if (this.isHost) this.relay(conn.peer, msg);
        break;
      case 'emote': // a dance/wave played on the sender's avatar
        if (this.onEmote) this.onEmote(msg.from || conn.peer, String(msg.k || '👋'), String(msg.name || ''));
        if (this.isHost) this.relay(conn.peer, { ...msg, from: conn.peer });
        break;
      case 'sign': // a text sign planted in the world
        if (this.onSign) this.onSign(msg.sign);
        if (this.isHost) this.relay(conn.peer, msg);
        break;
      case 'chest': // the shared world chest changed
        if (this.onChest) this.onChest(msg.items);
        if (this.isHost) this.relay(conn.peer, msg);
        break;
      case 'sync': {
        const applied = this.hooks.world.mergeEdits(msg.blocks);
        if (applied > 0) {
          this.hooks.world.saveEdits(); // remote history must survive a reload
          this.hooks.toast(`🔄 Monde synchronisé (${applied} blocs)`, 0x9fd8e8);
        }
        break;
      }
      case 'op':
        if (this.hooks.world.mergeEdits({ [msg.k]: [msg.id, msg.ts] }) > 0) {
          this.scheduleRemoteSave();
        }
        if (this.isHost) this.relay(conn.peer, msg);
        break;
      case 'pos':
        entry.pos = { x: msg.x, y: msg.y, z: msg.z };
        entry.yaw = msg.yaw;
        entry.moving = !!msg.m;
        this.playersChanged();
        if (this.isHost) {
          this.relay(conn.peer, { ...msg, from: conn.peer, name: entry.name, lookIdx: entry.lookIdx, look: entry.look });
        }
        break;
      case 'bye':
        this.conns.delete(msg.from);
        this.playersChanged();
        break;
      case 'rpos': { // relayed position of another guest (host-mediated)
        // treat the origin guest as a virtual peer entry
        if (!this.conns.has(msg.from) && msg.from !== this.peer.id) {
          this.conns.set(msg.from, { conn: null, name: msg.name || 'Joueur', lookIdx: msg.lookIdx || 0, look: msg.look || null, pos: null, yaw: 0, moving: false });
        }
        const e2 = this.conns.get(msg.from);
        if (e2) { e2.pos = { x: msg.x, y: msg.y, z: msg.z }; e2.yaw = msg.yaw; e2.moving = !!msg.m; }
        this.playersChanged();
        break;
      }
    }
  }

  relay(fromId, msg) {
    for (const [id, c] of this.conns) {
      if (id !== fromId && c.conn) {
        c.conn.send(msg.t === 'pos' ? { ...msg, t: 'rpos' } : msg);
      }
    }
  }

  scheduleRemoteSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.hooks.world.saveEdits(), 800);
  }

  sendOp(k, id, ts) {
    for (const c of this.conns.values()) if (c.conn) c.conn.send({ t: 'op', k, id, ts });
  }

  sendChat(name, msg) {
    for (const c of this.conns.values()) if (c.conn) c.conn.send({ t: 'chat', name, msg });
  }

  broadcast(msg) { // generic fan-out for duels, emotes, signs and the chest
    for (const c of this.conns.values()) if (c.conn) c.conn.send(msg);
  }

  startPosLoop() {
    if (this.posTimer) return;
    this.posTimer = setInterval(() => {
      if (!this.getPos || this.conns.size === 0) return;
      const p = this.getPos();
      const msg = { t: 'pos', x: p.x, y: p.y, z: p.z, yaw: p.yaw, m: p.moving ? 1 : 0 };
      for (const c of this.conns.values()) if (c.conn) c.conn.send(msg);
    }, 120);
  }

  // ---- voice chat -----------------------------------------------------------

  async toggleMic() {
    if (!this.micOn) {
      if (!this.localStream) {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          this.hooks.toast('🎤 Micro refusé — autorise-le dans les réglages Safari', 0xff9d5e);
          return false;
        }
      }
      this.localStream.getAudioTracks().forEach((t) => { t.enabled = true; });
      this.micOn = true;
      for (const id of this.conns.keys()) this.callPeer(id);
      this.hooks.toast('🎤 Micro activé — parlez-vous !', 0x6ee06e);
    } else {
      this.localStream.getAudioTracks().forEach((t) => { t.enabled = false; });
      this.micOn = false;
      this.hooks.toast('🔇 Micro coupé', 0xcccccc);
    }
    return this.micOn;
  }

  callPeer(id) {
    if (this.calls.has(id) || !this.localStream) return;
    const entry = this.conns.get(id);
    if (!entry || !entry.conn) return; // voice runs on direct connections
    const call = this.peer.call(id, this.localStream);
    if (call) this.attachCall(call);
  }

  // ---- video chat (mini FaceTime with the front camera) ---------------------

  async toggleCam() {
    if (!this.camOn) {
      if (!this.videoStream) {
        try {
          this.videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
          });
        } catch {
          this.hooks.toast('📷 Caméra refusée — autorise-la dans les réglages Safari', 0xff9d5e);
          return false;
        }
      }
      this.videoStream.getVideoTracks().forEach((t) => { t.enabled = true; });
      this.camOn = true;
      for (const id of this.conns.keys()) this.videoCallPeer(id);
      this.hooks.toast('🎥 Caméra activée — coucou !', 0x6ee06e);
    } else {
      this.camOn = false;
      for (const call of this.videoCalls.values()) call.close();
      this.videoCalls.clear();
      if (this.videoStream) {
        this.videoStream.getTracks().forEach((t) => t.stop());
        this.videoStream = null;
      }
      this.hooks.toast('📷 Caméra coupée', 0xcccccc);
    }
    return this.camOn;
  }

  videoCallPeer(id) {
    if (this.videoCalls.has(id) || !this.videoStream) return;
    const entry = this.conns.get(id);
    if (!entry || !entry.conn) return;
    const call = this.peer.call(id, this.videoStream, { metadata: { kind: 'video' } });
    if (call) this.videoCalls.set(id, call);
  }

  attachVideoCall(call, inbound) {
    if (inbound) this.inboundVideo.set(call.peer, call);
    call.on('stream', (remote) => {
      if (this.onRemoteVideo) this.onRemoteVideo(call.peer, remote);
    });
    call.on('close', () => {
      this.inboundVideo.delete(call.peer);
      if (this.onRemoteVideoClosed) this.onRemoteVideoClosed(call.peer);
    });
  }

  attachCall(call) {
    this.calls.set(call.peer, call);
    call.on('stream', (remote) => {
      let audio = this.audios.get(call.peer);
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.setAttribute('playsinline', '');
        document.body.appendChild(audio);
        this.audios.set(call.peer, audio);
      }
      audio.srcObject = remote;
      audio.play().catch(() => { /* iOS will allow it after the next tap */ });
    });
    call.on('close', () => this.calls.delete(call.peer));
  }

  stop() {
    clearInterval(this.posTimer);
    this.posTimer = null;
    clearInterval(this._hb);
    this._hb = null;
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = null;
    clearTimeout(this._rejoinTimer);
    this._rejoining = false;
    this.link('arret');
    for (const a of this.audios.values()) a.remove();
    if (this.localStream) this.localStream.getTracks().forEach((t) => t.stop());
    if (this.videoStream) this.videoStream.getTracks().forEach((t) => t.stop());
    if (this.peer) this.peer.destroy();
    this.conns.clear();
    this.calls.clear();
    this.audios.clear();
    this.videoCalls.clear();
    this.inboundVideo.clear();
    this.active = false;
  }
}
