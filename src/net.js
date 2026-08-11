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
// Un pair qui s'est annoncé endormi est épargné par le silence — mais pas
// indéfiniment : au-delà, l'application a été fermée pour de bon.
const SOMMEIL_MAX_MS = 300000;
// Après un réveil, on laisse au lien le temps de se rétablir avant de juger.
const GRACE_REVEIL_MS = 15000;
// La présentation entre deux pairs : on la relance à ce rythme, et on renonce
// au-delà de cette durée. Renoncer, c'est couper — un lien ouvert mais jamais
// présenté est une panne invisible qui dure pour toujours.
const RELANCE_MS = 3000;
const PRESENTATION_MS = 20000;
// Au-delà, on renonce à ouvrir la session et on le dit. Sans cette limite, un
// serveur de rendez-vous qui accepte la connexion sans jamais répondre — ce que
// font les réseaux captifs et certains partages de connexion — laissait la
// promesse d'ouverture en suspens pour toujours : l'enfant restait devant
// « Ouverture du monde… » sans erreur, sans monde, et sans rien à faire.
const OUVERTURE_MS = 9000;
// On garde la trace des appareils écartés, cf. le cas 'hello'. Le plafond n'est
// qu'un garde-fou : on n'écarte quelqu'un qu'en cas de prénom déjà pris.
const EVINCES_MAX = 50;

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

  // Un lien qui existe n'est pas un joueur.
  //
  // Une connexion est inscrite dès qu'elle est créée — il le faut, sinon on
  // raterait les premiers messages —, mais tant qu'elle n'a pas dit qui elle
  // est, elle ne compte pas et ne s'affiche pas. Sans cette distinction, une
  // tentative de reconnexion qui n'aboutit pas se voyait comptée comme un
  // joueur et dessinée dans le monde sous la forme d'un bonhomme nommé « … »,
  // planté à l'origine de la carte. C'est ce qui faisait dire « il y a deux
  // joueurs » à un enfant qui était seul.
  presents() { return [...this.conns.entries()].filter(([, c]) => c.pret); }

  playerCount() { return this.presents().length + 1; }

  state(text) { if (this.hooks.onState) this.hooks.onState(text); }

  playersChanged() {
    if (this.hooks.onPlayers) {
      this.hooks.onPlayers(this.presents().map(([id, c]) => ({
        id, name: c.name, lookIdx: c.lookIdx, look: c.look, pos: c.pos, yaw: c.yaw, moving: c.moving,
      })));
    }
  }

  // `patience` : combien de temps on laisse au canal de données pour s'ouvrir.
  // Cinq secondes suffisent sur un réseau ordinaire, et c'est ce qu'on veut
  // pour la première tentative — le cas courant est un monde vide, où toute
  // attente est du temps volé. Mais quand on SAIT que quelqu'un tient le
  // monde, cinq secondes ne suffisent plus : derrière un VPN, le trafic passe
  // par le relais en TCP sur le port 443, et la poignée de main y prend
  // couramment le double.
  start(code, isHost, profile, patience) {
    this.patience = patience;
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
      const abandon = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.active = false;
        try { this.peer.destroy(); } catch { /* déjà en morceaux */ }
        // Marqué : c'est le serveur de rendez-vous qui n'a pas répondu, pas le
        // monde d'en face. L'appelant n'a alors aucune raison de retenter en
        // hôte — il buterait sur exactement le même mur, et l'enfant
        // attendrait deux fois neuf secondes pour le même verdict.
        const muet = new Error('Le serveur de jeu ne répond pas — réessaie dans un moment');
        muet.signal = true;
        reject(muet);
      }, OUVERTURE_MS);
      // À partir d'ici, le pair vit : les délais suivants sont ceux de
      // connectToHost, qui a sa propre limite.
      const ouvert = () => clearTimeout(abandon);

      this.peer.on('open', () => {
        ouvert();
        this._reconnectTries = 0;
        // Pour un invité, ceci ne prouve rien : notre propre pair est ouvert,
        // mais nous n'avons encore joint personne. Annoncer « ok » ici, c'était
        // afficher un lien sain avant même d'avoir touché le monde d'en face —
        // exactement l'impression trompeuse que l'on cherche à supprimer. Le
        // « ok » de l'invité vient de connectToHost, quand le canal s'ouvre.
        if (isHost) this.link('ok');
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
        if (!this.active) { try { call.close(); } catch { /* déjà fermé */ } return; }
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
          if (!settled) { settled = true; ouvert(); reject(new Error('Ce code est déjà utilisé — réessaie !')); }
          else if (this.isHost && this.active) {
            // Notre identifiant nous a été pris pendant qu'on était coupé du
            // serveur de rendez-vous — typiquement l'iPad qui s'endort assez
            // longtemps pour que le serveur libère le code, et l'autre enfant
            // qui, ne trouvant plus personne, ouvre le monde à son tour.
            //
            // Sans réaction, on restait seul dans sa bulle en croyant héberger,
            // pendant que l'autre était seul dans la sienne : deux mondes
            // portant le même code, chacun persuadé que tout allait bien. On
            // rend donc la main, et la page rejoint le monde qui existe.
            this._rendreLaMain = true;
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
            this.link('reconnexion', 'Quelqu\'un a repris ce monde — on le rejoint…');
            if (this.onCodePris) this.onCodePris(this.code);
          }
        } else if (err.type === 'peer-unavailable') {
          if (!settled) { settled = true; ouvert(); reject(new Error('Partie introuvable — vérifie le code !')); }
        } else if (!settled && (err.type === 'network' || err.type === 'server-error')) {
          settled = true;
          ouvert();
          reject(new Error('Pas de connexion internet au serveur de jeu'));
        } else if (!settled) {
          // Tous les autres cas — navigateur incompatible, socket refusée,
          // certificat… Les ignorer laissait l'ouverture en suspens sans un mot.
          settled = true;
          ouvert();
          reject(new Error(`Connexion au serveur de jeu impossible (${err.type || 'inconnu'})`));
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
    // Le canal ne s'ouvre pas. On ne sait PAS pourquoi : le pair peut être
    // absent sans que le serveur de rendez-vous l'ait dit, ou présent mais
    // injoignable. L'ancien message tranchait — « le monde existe mais le
    // réseau bloque » — et se trompait sur les deux points à la fois, en
    // accusant un Wi-Fi parfaitement sain. On se contente de constater, et
    // l'appelant se rabat sur l'ouverture du monde.
    const minuteur = setTimeout(
      () => {
        // La tentative morte ne doit rien laisser derrière elle : inscrite mais
        // jamais présentée, elle gonflait le compte des joueurs à chaque essai.
        const c = this.conns.get(conn.peer);
        if (c && !c.pret) { this.conns.delete(conn.peer); this.playersChanged(); }
        const muet = new Error('Personne n\'a répondu dans ce monde');
        // L'appelant a besoin de distinguer « le monde est vide » de « le monde
        // est là mais on ne l'atteint pas » : ce n'est pas la même panne, et ce
        // n'est pas la même phrase à montrer à un enfant.
        muet.canal = true;
        rate(muet);
      },
      // Court par défaut : dans le cas courant — le monde est vide — cette
      // attente est du temps perdu avant de l'ouvrir soi-même. Quand on sait
      // déjà que quelqu'un est là, l'appelant demande plus de patience.
      this.patience || 5000,
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
  // On ne renonce pas.
  //
  // L'ancienne version abandonnait après six essais, en une trentaine de
  // secondes, sur un « reviens au menu et retente » qui est un cul-de-sac pour
  // un enfant de sept ans — d'autant que la cause la plus banale, l'autre iPad
  // qu'on repose deux minutes, se résout toute seule si l'on patiente. On
  // continue donc d'essayer tant que le monde est ouvert, en espaçant les
  // tentatives pour ne pas chauffer la tablette, et en disant simplement où
  // l'on en est. C'est l'enfant qui décide d'arrêter, pas le minuteur.
  rejoinHost() {
    if (this.isHost || !this.active || this._rejoining) return;
    this._rejoining = true;
    let essai = 0;
    const tenter = () => {
      if (!this.active || !this._rejoining || !this.peer || this.peer.destroyed) return;
      essai++;
      this.link('reconnexion', essai <= 6
        ? `Reconnexion au monde ${this.code}…`
        : `Le monde ${this.code} ne répond pas — on continue d'essayer`);
      if (this.peer.disconnected) { try { this.peer.reconnect(); } catch { /* au tour suivant */ } }
      // On a déjà été dans ce monde : il existe, et c'est le chemin qui a
      // lâché. Cinq secondes ne suffisent pas à le rétablir par le relais, et
      // renoncer si tôt condamnait à retenter en boucle sans jamais aboutir.
      this.patience = Math.max(this.patience || 0, 15000);
      this.connectToHost(null);
      // 3 s, 5 s, 7 s… jusqu'à un essai toutes les vingt secondes
      const attente = Math.min(3000 + essai * 2000, 20000);
      this._rejoinTimer = setTimeout(() => { if (this._rejoining) tenter(); }, attente);
    };
    tenter();
  }

  scheduleReconnect() {
    if (!this.active || this._reconnectTimer || this._rendreLaMain) return;
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
  // --- veille et retour ------------------------------------------------------
  //
  // La panne la plus fréquente n'était pas le réseau, c'était le système.
  // Quand l'enfant passe à une autre application, iOS gèle les minuteurs de la
  // page : plus un battement ne part. Vingt secondes plus tard, l'autre iPad
  // conclut à un lien mort et coupe — alors que le lien était intact et que
  // l'enfant revenait dix secondes après.
  //
  // On se prévient donc mutuellement : « je m'endors », « je reviens ». Un pair
  // endormi n'est plus jugé sur son silence, et à son réveil il annonce son
  // retour et prouve immédiatement qu'il est là, sans attendre le battement
  // suivant. C'est ce qui supprime les coupures intempestives.
  ecouterVeille() {
    if (this._veille) return;
    this._veille = () => {
      if (!this.active) return;
      if (document.visibilityState === 'hidden') {
        this.diffusionBrute({ t: 'dodo' });
      } else {
        this._reveilA = Date.now();
        for (const c of this.conns.values()) c.seen = Date.now();
        this.diffusionBrute({ t: 'coucou' });
        // le réseau a pu changer pendant l'absence : on vérifie tout de suite
        if (this.peer && this.peer.disconnected) { try { this.peer.reconnect(); } catch { /* au tour suivant */ } }
        if (!this.isHost && !this.conns.has(ID_PREFIX + this.code)) this.rejoinHost();
      }
    };
    this._auRetourDuReseau = () => {
      if (!this.active) return;
      this._reveilA = Date.now();
      if (this.peer && this.peer.disconnected) { try { this.peer.reconnect(); } catch { /* au tour suivant */ } }
      if (!this.isHost && !this.conns.has(ID_PREFIX + this.code)) this.rejoinHost();
    };
    document.addEventListener('visibilitychange', this._veille);
    window.addEventListener('online', this._auRetourDuReseau);
  }

  // Le seul endroit d'où l'on parle.
  //
  // Un lien inscrit n'est pas encore un lien ouvert : pendant une reconnexion,
  // la boucle des positions continuait d'émettre sur un canal en cours
  // d'établissement. PeerJS refusait chaque message avec une erreur, huit fois
  // par seconde, et surtout : on croyait avoir parlé. On vérifie donc, une fois
  // pour toutes et au même endroit, que le canal est réellement ouvert.
  envoyer(c, msg) {
    if (!c || !c.conn || !c.conn.open) return false;
    // On interroge le canal lui-même plutôt que la comptabilité de PeerJS :
    // `open` reste vrai un court instant après que le transport s'est refermé,
    // et c'est dans cet intervalle qu'un envoi partait dans le vide.
    const canal = c.conn.dataChannel;
    if (canal && canal.readyState !== 'open') return false;
    try { c.conn.send(msg); return true; } catch { return false; }
  }

  diffusionBrute(msg) {
    for (const c of this.conns.values()) this.envoyer(c, msg);
  }

  startHeartbeat() {
    if (this._hb) return;
    this.ecouterVeille();
    this._hb = setInterval(() => {
      const now = Date.now();
      // Nous-mêmes en arrière-plan : nos minuteurs sont bridés, le temps qui
      // passe ne prouve rien. On ne juge personne dans cet état, ni pendant les
      // quelques secondes qui suivent le réveil.
      if (document.visibilityState === 'hidden') return;
      if (this._reveilA && now - this._reveilA < GRACE_REVEIL_MS) return;
      for (const [id, c] of [...this.conns]) {
        if (c.dodo) {
          if (now - c.dodo > SOMMEIL_MAX_MS) this.dropPeer(id);
          continue;
        }
        // Un pair relayé n'a pas de lien direct à sonder, mais l'hôte nous
        // renvoie sa position dix fois par seconde : son silence prolongé
        // prouve son départ aussi sûrement qu'un lien coupé. Sans cela, un
        // « au revoir » perdu laissait son avatar planté là pour toujours.
        if (c.seen && now - c.seen > STALE_MS) { this.dropPeer(id); continue; }
        if (!c.conn) continue;
        if (!this.envoyer(c, { t: 'ping' }) && c.pret) this.dropPeer(id);
      }
    }, HEARTBEAT_MS);
  }

  registerConn(conn) {
    if (!this.active) { try { conn.close(); } catch { /* déjà fermée */ } return; }
    // `pret` reste faux jusqu'à la présentation : voir presents().
    this.conns.set(conn.peer, { conn, name: '…', pret: false, lookIdx: 0, pos: null, yaw: 0, moving: false, seen: Date.now() });
    conn.on('data', (msg) => this.onMessage(conn, msg));
    // On dit DE QUELLE connexion on parle. Sans cela, la fin d'un lien mort
    // emportait celui qui venait de le remplacer : les deux portent la même
    // clé — l'identifiant de l'hôte — et l'événement « close » du premier
    // arrive régulièrement après que le second est inscrit.
    conn.on('close', () => this.dropPeer(conn.peer, conn));
    conn.on('error', () => this.dropPeer(conn.peer, conn));
    this.startHeartbeat();
  }

  // La présentation, et RIEN d'autre.
  //
  // Le journal de blocs partait avec elle, dans le même souffle. C'est ce qui
  // rendait la panne suivante si tenace : sur un lien lent — relayé, partagé,
  // un peu chargé — un monde bien construit fait un gros message, et les
  // messages suivants attendent derrière lui dans le tampon d'envoi. Chaque
  // relance de présentation renvoyait le journal ENTIER, donc bouchait un peu
  // plus le tuyau qu'elle essayait de déboucher. On envoie maintenant le
  // journal une seule fois, et seulement une fois qu'on s'est reconnus.
  greet(conn) {
    const c = this.conns.get(conn.peer);
    // Se présenter sur un lien qu'on ne suit plus, c'est parler dans le vide :
    // rien ne relancera, rien ne coupera. On referme plutôt.
    if (!c) { try { conn.close(); } catch { /* déjà fermée */ } return; }
    if (!c.presenteA) c.presenteA = Date.now();
    try {
      conn.send({ t: 'hello', name: this.profile.name, lookIdx: this.profile.lookIdx, look: this.profile.look });
    } catch { return; }   // le lien est mort-né : dropPeer s'en charge
    this.startPosLoop();
    this.relancerPresentation(conn);
  }

  // Une présentation se perd dans UN sens seulement, et les deux sens font des
  // dégâts différents. Quand c'est celle de l'hôte qui manque, l'invité voit
  // les autres joueurs — l'hôte les lui relaie — mais pas l'hôte lui-même.
  // Quand c'est celle de l'invité, c'est l'hôte qui ne le compte pas, et
  // l'arrivant reste invisible pour tout le monde.
  //
  // Le pire est que rien ne le disait et que rien ne le rattrapait. On
  // relançait deux fois, puis on se taisait : le canal restait ouvert, les
  // battements de cœur continuaient de passer — donc le lien n'était jamais
  // jugé mort — et les deux enfants restaient chacun seul dans le même monde,
  // sans erreur, sans message, indéfiniment. C'est exactement ce qui a été
  // constaté à la maison, deux iPad sur la même connexion.
  //
  // On relance donc tant qu'il reste une chance, puis on coupe. Couper est ce
  // qui manquait : côté invité, cela relance la boucle de reconnexion, qui
  // repart sur un lien neuf.
  relancerPresentation(conn) {
    const c = this.conns.get(conn.peer);
    if (!c || c.relanceEnCours) return;
    c.relanceEnCours = true;
    const tenter = () => {
      const e = this.conns.get(conn.peer);
      if (!this.active || !e || e.pret) { if (e) e.relanceEnCours = false; return; }
      if (!conn.open) { e.relanceEnCours = false; return; }
      if (Date.now() - (e.presenteA || 0) > PRESENTATION_MS) {
        e.relanceEnCours = false;
        this.dropPeer(conn.peer, conn);
        try { conn.close(); } catch { /* déjà fermée */ }
        return;
      }
      try {
        conn.send({
          t: 'hello', encore: true,
          name: this.profile.name, lookIdx: this.profile.lookIdx, look: this.profile.look,
        });
      } catch { e.relanceEnCours = false; return; }
      setTimeout(tenter, RELANCE_MS);
    };
    setTimeout(tenter, RELANCE_MS);
  }

  // `conn` : la connexion à laquelle se rapporte l'adieu, quand on la connaît.
  //
  // Un invité range son lien vers l'hôte sous l'identifiant de l'hôte, qui ne
  // change jamais. Quand on coupe un lien et qu'on en rouvre aussitôt un autre,
  // les deux portent donc la même clé — et l'événement « close » du premier,
  // qui arrive après coup, effaçait le second. L'invité se retrouvait alors
  // avec une connexion ouverte qui n'était plus dans sa table : invisible au
  // battement de cœur, invisible au compteur, et sans reconnexion possible
  // puisque le drapeau de reprise était déjà retombé. Un fantôme, définitif.
  dropPeer(id, conn) {
    const c = this.conns.get(id);
    if (!c) return;
    if (conn && c.conn && c.conn !== conn) return;   // adieu d'un lien déjà remplacé
    this.conns.delete(id);
    // Pour un invité, perdre ce lien-là, c'est perdre le monde entier :
    // tout passe par l'hôte.
    if (!this.isHost && this.active && id === ID_PREFIX + this.code) this.rejoinHost();
    if (this.isHost && c.pret) { // tell the other guests this player is gone
      for (const o of this.conns.values()) this.envoyer(o, { t: 'bye', from: id });
    }
    // On n'annonce le départ que de quelqu'un dont on connaissait le nom : une
    // tentative de connexion avortée n'est pas un ami qui s'en va.
    if (c.pret) {
      if (this.onLeave) this.onLeave(c.name);
      else this.hooks.toast(`👋 ${c.name} est parti·e`, 0xcccccc);
    }
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
      // « Je passe en arrière-plan » : on cesse de compter son silence contre
      // lui. Il reste affiché — l'enfant est parti dix secondes, pas parti.
      case 'dodo':
        entry.dodo = Date.now();
        if (this.isHost) this.relay(conn.peer, { t: 'dodo_de', from: conn.peer });
        break;
      case 'coucou':
        entry.dodo = 0;
        if (this.isHost) this.relay(conn.peer, { t: 'coucou_de', from: conn.peer });
        break;
      case 'dodo_de': {
        const e = this.conns.get(msg.from);
        if (e) e.dodo = Date.now();
        break;
      }
      case 'coucou_de': {
        const e = this.conns.get(msg.from);
        if (e) { e.dodo = 0; e.seen = Date.now(); }
        break;
      }
      case 'hello': {
        const wanted = String(msg.name || 'Joueur').slice(0, 16);
        // Un seul Alice à la fois dans le monde — mais c'est le NOUVEAU qui
        // gagne, pas l'ancien.
        //
        // L'ancienne règle refusait l'arrivant. C'était le mauvais arbitrage :
        // quand l'iPad se met en veille ou que le Wi-Fi cligne, l'hôte garde le
        // lien mort pendant vingt secondes, et l'enfant qui revient dans son
        // propre monde se faisait jeter avec un « tu joues déjà ailleurs »
        // parfaitement incompréhensible — puis restait seul. Or entre deux
        // connexions au même prénom, la plus récente est forcément la vivante :
        // l'autre est un cadavre. On expulse donc le cadavre et on accueille
        // l'enfant. La garantie « un seul appareil par joueur » tient toujours,
        // et le vrai doublon (deux appareils réellement allumés) reçoit un
        // message clair au lieu d'un refus.
        if (this.isHost) {
          if (wanted === this.profile.name) {
            // Celui-là, on ne peut pas l'expulser : c'est nous.
            conn.send({ t: 'duplicate', name: wanted });
            setTimeout(() => { try { conn.close(); } catch { /* already gone */ } }, 400);
            this.conns.delete(conn.peer);
            this.playersChanged();
            break;
          }
          // Un appareil qu'on vient d'écarter se rebranche tout seul : sa boucle
          // de reconnexion était déjà lancée quand on l'a fermé. S'il pouvait se
          // représenter, il éjecterait à son tour celui qui l'a remplacé, et les
          // deux se chasseraient sans fin — mesuré : la reprise tenait dix
          // secondes, puis l'enfant revenu se faisait sortir à son tour.
          //
          // Un écart temporaire ne suffisait pas : le mourant retentait en
          // boucle et finissait par gagner à l'expiration. Écarté, il l'est donc
          // pour toute la partie. C'est sans risque : l'identifiant de pair est
          // retiré au sort à chaque chargement de page, si bien qu'un vrai
          // retour de l'enfant se présente toujours sous un identifiant neuf.
          if (this._evinces && this._evinces.has(conn.peer)) {
            conn.send({ t: 'remplace', name: wanted });
            setTimeout(() => { try { conn.close(); } catch { /* already gone */ } }, 400);
            this.conns.delete(conn.peer);
            this.playersChanged();
            break;
          }
          for (const [id, c] of [...this.conns]) {
            if (c === entry || c.name !== wanted) continue;
            if (c.conn) {
              this.envoyer(c, { t: 'remplace', name: wanted });
              setTimeout(() => { try { c.conn.close(); } catch { /* déjà fermée */ } }, 400);
            }
            this.conns.delete(id);
            if (!this._evinces) this._evinces = new Set();
            this._evinces.add(id);
            if (this._evinces.size > EVINCES_MAX) {
              this._evinces.delete(this._evinces.values().next().value);
            }
            for (const o of this.conns.values()) this.envoyer(o, { t: 'bye', from: id });
          }
        }
        // Une présentation relancée : notre première réponse s'est perdue en
        // route, on la renvoie. Le drapeau vient de l'autre côté, jamais de
        // nous — il n'y a donc pas d'échange qui s'entretient tout seul.
        if (msg.encore) this.greet(conn);
        const nouveau = !entry.pret;
        entry.pret = true;
        entry.name = wanted;
        entry.lookIdx = Number(msg.lookIdx) || 0;
        entry.look = msg.look && typeof msg.look === 'object' ? msg.look : null;
        // La page décide comment l'annoncer : une arrivée dans un monde
        // partagé mérite mieux qu'un message qui passe en trois secondes.
        // Le journal de blocs, maintenant seulement : la présentation a abouti,
        // le gros message ne peut plus lui barrer la route.
        if (nouveau) {
          try { conn.send({ t: 'sync', blocks: this.hooks.world.exportEdits() }); }
          catch { /* le lien vient de lâcher, le battement de cœur le verra */ }
        }
        if (this.onJoin) this.onJoin(entry.name);
        else this.hooks.toast(`🎉 ${entry.name} a rejoint la partie !`, 0x6ee06e);
        this.state(this.statusText());
        this.playersChanged();
        // On lui donne l'heure tout de suite, sans attendre le prochain
        // battement : sinon il débarque un instant dans une autre journée.
        if (this.isHost && this.donnerCiel) this.envoyer(entry, { t: 'ciel', ...this.donnerCiel() });
        // un seul appel : il porte l'image ET le son
        if (this.camOn) this.videoCallPeer(conn.peer);
        break;
      }
      case 'duplicate':
        if (this.onDuplicate) this.onDuplicate(msg.name);
        break;
      // Cet appareil-ci vient d'être remplacé par un autre portant le même
      // prénom. Ce n'est pas une erreur de l'enfant : on le dit autrement.
      case 'remplace':
        if (this.onRemplace) this.onRemplace(msg.name);
        else if (this.onDuplicate) this.onDuplicate(msg.name);
        break;
      case 'chat':
        if (this.onChat) this.onChat(String(msg.name || '').slice(0, 16), String(msg.msg || '').slice(0, 120));
        if (this.isHost) this.relay(conn.peer, msg);
        break;
      case 'duel': // friendly creature show-off between two players
        if (this.onDuel) this.onDuel(msg);
        if (this.isHost) this.relay(conn.peer, msg);
        break;
      case 'annonce': // une phrase de jeu qui passe et s'efface, pas un message
        if (this.onAnnonce) this.onAnnonce(String(msg.txt || '').slice(0, 120));
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
      // L'heure et le temps qu'il fait. Chaque appareil les tirait au sort de
      // son côté : deux enfants côte à côte pouvaient être l'un sous la pluie
      // en pleine nuit, l'autre au soleil de midi. C'est l'hôte qui décide, et
      // lui seul — on ignore donc ce message s'il vient d'un invité.
      case 'ciel':
        if (!this.isHost && this.onCiel) this.onCiel(msg);
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
          this.conns.set(msg.from, { conn: null, name: msg.name || 'Joueur', pret: true, lookIdx: msg.lookIdx || 0, look: msg.look || null, pos: null, yaw: 0, moving: false });
        }
        const e2 = this.conns.get(msg.from);
        if (e2) {
          e2.pos = { x: msg.x, y: msg.y, z: msg.z }; e2.yaw = msg.yaw; e2.moving = !!msg.m;
          e2.seen = Date.now();   // c'est sa seule preuve de vie, cf. startHeartbeat
        }
        this.playersChanged();
        break;
      }
    }
  }

  relay(fromId, msg) {
    for (const [id, c] of this.conns) {
      if (id !== fromId && c.conn) {
        this.envoyer(c, msg.t === 'pos' ? { ...msg, t: 'rpos' } : msg);
      }
    }
  }

  scheduleRemoteSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.hooks.world.saveEdits(), 800);
  }

  sendOp(k, id, ts) {
    for (const c of this.conns.values()) this.envoyer(c, { t: 'op', k, id, ts });
  }

  sendChat(name, msg) {
    for (const c of this.conns.values()) this.envoyer(c, { t: 'chat', name, msg });
  }

  broadcast(msg) { // generic fan-out for duels, emotes, signs and the chest
    this.diffusionBrute(msg);
  }

  // L'hôte annonce l'heure et la météo. Envoyé à chaque changement de temps et
  // à intervalle régulier : un invité qui arrive en cours de partie, ou dont la
  // tablette s'est endormie, se remet à l'heure sans avoir rien à demander.
  diffuserCiel(ciel) {
    if (!this.isHost) return;
    for (const c of this.conns.values()) this.envoyer(c, { t: 'ciel', ...ciel });
  }

  startPosLoop() {
    if (this.posTimer) return;
    this.posTimer = setInterval(() => {
      if (!this.getPos || this.conns.size === 0) return;
      const p = this.getPos();
      const msg = { t: 'pos', x: p.x, y: p.y, z: p.z, yaw: p.yaw, m: p.moving ? 1 : 0 };
      for (const c of this.conns.values()) this.envoyer(c, msg);
    }, 120);
  }

  // ---- voice chat -----------------------------------------------------------

  // Le micro n'a plus de flux à lui : c'est la piste audio de la caméra qu'on
  // rend muette. Il n'y a plus de bouton dédié dans le jeu, mais couper le son
  // sans couper l'image reste utile — et le reste du code peut le demander.
  async toggleMic() {
    const pistes = this.videoStream ? this.videoStream.getAudioTracks() : [];
    if (!pistes.length) {
      this.hooks.toast('🎤 Allume la caméra : elle porte aussi le son', 0xff9d5e);
      return false;
    }
    this.micOn = !this.micOn;
    pistes.forEach((t) => { t.enabled = this.micOn; });
    this.hooks.toast(this.micOn ? '🎤 Micro activé — parlez-vous !' : '🔇 Micro coupé', this.micOn ? 0x6ee06e : 0xcccccc);
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
        // UN SEUL getUserMedia pour l'image ET le son.
        //
        // Le micro était demandé dans un second appel, juste après la caméra.
        // Sur iOS, cette deuxième demande interrompt la capture en cours :
        // l'image partait, la voix non — exactement le symptôme constaté.
        // Un flux unique règle le problème, et il n'y a plus qu'un seul appel
        // à établir entre deux joueurs au lieu de deux.
        const VIDEO = { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } };
        try {
          this.videoStream = await navigator.mediaDevices.getUserMedia({ video: VIDEO, audio: true });
        } catch {
          // Micro refusé mais caméra acceptée : se voir sans s'entendre vaut
          // mieux que rien du tout.
          try {
            this.videoStream = await navigator.mediaDevices.getUserMedia({ video: VIDEO });
          } catch {
            this.hooks.toast('📷 Caméra refusée — autorise-la dans les réglages Safari', 0xff9d5e);
            return false;
          }
        }
      }
      this.videoStream.getTracks().forEach((t) => { t.enabled = true; });
      this.micOn = this.videoStream.getAudioTracks().length > 0;
      this.camOn = true;
      for (const id of this.conns.keys()) this.videoCallPeer(id);
      this.hooks.toast(this.micOn
        ? '🎥 Caméra et micro activés — coucou !'
        : '🎥 Caméra activée (sans micro)', 0x6ee06e);
    } else {
      this.camOn = false;
      this.micOn = false;
      for (const call of this.videoCalls.values()) call.close();
      this.videoCalls.clear();
      if (this.videoStream) {
        this.videoStream.getTracks().forEach((t) => t.stop());
        this.videoStream = null;
      }
      this.hooks.toast('📷 Caméra et micro coupés', 0xcccccc);
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
    // On se déclare éteint AVANT de tout démonter : PeerJS livre encore
    // quelques événements après destroy(), et ceux-là ré-inscrivaient des
    // connexions dans une session morte — d'où des avatars qui revenaient
    // hanter un monde qu'on venait de quitter.
    this.active = false;
    if (this._veille) {
      document.removeEventListener('visibilitychange', this._veille);
      window.removeEventListener('online', this._auRetourDuReseau);
      this._veille = null;
      this._auRetourDuReseau = null;
    }
    this._reveilA = 0;
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
  }
}
