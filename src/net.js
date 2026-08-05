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
    this.posTimer = null;
    this.getPos = null;       // set by main: () => ({x,y,z,yaw,moving})
    this.active = false;
  }

  playerCount() { return this.conns.size + 1; }

  state(text) { if (this.hooks.onState) this.hooks.onState(text); }

  playersChanged() {
    if (this.hooks.onPlayers) {
      this.hooks.onPlayers([...this.conns.entries()].map(([id, c]) => ({
        id, name: c.name, lookIdx: c.lookIdx, pos: c.pos, yaw: c.yaw, moving: c.moving,
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
      const peerOpts = { debug: 1 };
      // tests can point signaling at a local server via ?peerhost=host:port
      const m = location.search.match(/[?&]peerhost=([^&]+)/);
      if (m) {
        const [h, p] = decodeURIComponent(m[1]).split(':');
        Object.assign(peerOpts, { host: h, port: Number(p) || 443, path: '/', secure: false, key: 'peerjs' });
      }
      this.peer = isHost ? new Peer(ID_PREFIX + this.code, peerOpts) : new Peer(peerOpts);
      let settled = false;

      this.peer.on('open', () => {
        if (isHost) {
          this.state(`En attente d'un joueur… code : ${this.code}`);
          settled = true;
          resolve(this.code);
        } else {
          const conn = this.peer.connect(ID_PREFIX + this.code, { reliable: true });
          this.registerConn(conn); // handlers BEFORE open — no missed messages
          const fail = setTimeout(() => {
            if (!settled) { settled = true; reject(new Error('Partie introuvable — vérifie le code !')); }
          }, 12000);
          conn.on('open', () => {
            clearTimeout(fail);
            this.greet(conn);
            if (!settled) { settled = true; resolve(this.code); }
          });
          conn.on('error', () => {
            clearTimeout(fail);
            if (!settled) { settled = true; reject(new Error('Connexion impossible')); }
          });
        }
      });

      this.peer.on('connection', (conn) => {
        this.registerConn(conn); // handlers BEFORE open — no missed messages
        if (conn.open) this.greet(conn);
        else conn.on('open', () => this.greet(conn));
      });

      this.peer.on('call', (call) => {
        call.answer(this.localStream || undefined);
        this.attachCall(call);
      });

      this.peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          if (!settled) { settled = true; reject(new Error('Ce code est déjà utilisé — réessaie !')); }
        } else if (err.type === 'peer-unavailable') {
          if (!settled) { settled = true; reject(new Error('Partie introuvable — vérifie le code !')); }
        } else if (!settled && (err.type === 'network' || err.type === 'server-error')) {
          settled = true;
          reject(new Error('Pas de connexion internet au serveur de jeu'));
        }
      });
    });
  }

  registerConn(conn) {
    this.conns.set(conn.peer, { conn, name: '…', lookIdx: 0, pos: null, yaw: 0, moving: false });
    conn.on('data', (msg) => this.onMessage(conn, msg));
    conn.on('close', () => this.dropPeer(conn.peer));
    conn.on('error', () => this.dropPeer(conn.peer));
  }

  greet(conn) {
    // handshake: who we are + everything we know about the world
    conn.send({ t: 'hello', name: this.profile.name, lookIdx: this.profile.lookIdx });
    conn.send({ t: 'sync', blocks: this.hooks.world.exportEdits() });
    this.startPosLoop();
  }

  dropPeer(id) {
    const c = this.conns.get(id);
    if (!c) return;
    this.conns.delete(id);
    if (this.isHost) { // tell the other guests this player is gone
      for (const o of this.conns.values()) if (o.conn) o.conn.send({ t: 'bye', from: id });
    }
    this.hooks.toast(`👋 ${c.name} est parti·e`, 0xcccccc);
    this.state(this.statusText());
    const call = this.calls.get(id);
    if (call) { call.close(); this.calls.delete(id); }
    const audio = this.audios.get(id);
    if (audio) { audio.remove(); this.audios.delete(id); }
    this.playersChanged();
  }

  statusText() {
    const n = this.playerCount();
    return n > 1 ? `🌐 ${n} joueurs · code ${this.code}` : `En attente d'un joueur… code : ${this.code}`;
  }

  onMessage(conn, msg) {
    const entry = this.conns.get(conn.peer);
    if (!entry || !msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'hello':
        entry.name = String(msg.name || 'Joueur').slice(0, 16);
        entry.lookIdx = Number(msg.lookIdx) || 0;
        this.hooks.toast(`🎉 ${entry.name} a rejoint la partie !`, 0x6ee06e);
        this.state(this.statusText());
        this.playersChanged();
        if (this.micOn) this.callPeer(conn.peer); // start voice with newcomers
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
          this.relay(conn.peer, { ...msg, from: conn.peer, name: entry.name, lookIdx: entry.lookIdx });
        }
        break;
      case 'bye':
        this.conns.delete(msg.from);
        this.playersChanged();
        break;
      case 'rpos': { // relayed position of another guest (host-mediated)
        // treat the origin guest as a virtual peer entry
        if (!this.conns.has(msg.from) && msg.from !== this.peer.id) {
          this.conns.set(msg.from, { conn: null, name: msg.name || 'Joueur', lookIdx: msg.lookIdx || 0, pos: null, yaw: 0, moving: false });
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
    for (const a of this.audios.values()) a.remove();
    if (this.localStream) this.localStream.getTracks().forEach((t) => t.stop());
    if (this.peer) this.peer.destroy();
    this.conns.clear();
    this.calls.clear();
    this.audios.clear();
    this.active = false;
  }
}
