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

import { BusNuage } from './relaisnuage.js';

const ID_PREFIX = 'wmc-marlon-';

// Sans relais, deux appareils derrière le même partage de connexion mobile ne
// se joignent pas : l'opérateur place tout le monde derrière une traduction
// d'adresses qui change de port à chaque destination, et les candidats
// directs ne mènent nulle part. Le trafic passe alors par le relais, plus
// lent mais qui, lui, aboutit toujours. C'est ce qui manquait le jour où
// Alice et Marlon étaient dans le même monde sans se voir.
//
// Le relais ne suffit pas : encore faut-il qu'il puisse SORTIR du réseau.
// Sur un Wi-Fi public — hôtel, école, gare, café —, l'UDP est coupé net, et
// ce qui reste est inspecté : du trafic quelconque sur le port 443, port
// réservé au web chiffré, est jeté par le filtre. Nos trois anciennes
// adresses tombaient donc toutes les trois, et l'enfant lisait « Connexion
// impossible » sur un réseau qui, lui, marchait très bien.
//
// D'où « turns: » en tête, le relais enveloppé dans du TLS : pour le filtre,
// c'est une page web ordinaire, et il passe là où tout le reste est arrêté.
// Les autres restent derrière, du plus rapide au plus obstiné — le navigateur
// les essaie tous et garde celui qui aboutit.
const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  {
    urls: [
      'turns:openrelay.metered.ca:443?transport=tcp',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:80',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// Un candidat de relais a-t-il seulement pu être obtenu ? C'est la question
// qui sépare deux pannes que rien ne distinguait : « il n'y a personne au
// bout » et « ce réseau interdit les jeux à plusieurs ». Sans relais obtenu,
// couper un VPN ne servira à rien — il faut changer de réseau.
const EST_RELAIS = / typ relay /;

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
    this.onPhoto = null;           // hook(peerId, dataURL, nom) — la caméra lente
    this.onPhotoFin = null;        // hook(peerId) — elle s'arrête
    this.onCamChange = null;       // hook(allumee) — le jeu ajuste ses vignettes
    this.posTimer = null;
    this.bus = null;          // le relais par le nuage, quand le direct échoue
    this.relaisVu = false;
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

    // ON TUE SES FANTÔMES EN ENTRANT, PAS EN ARRIVANT.
    //
    // Le nettoyage se faisait à l'ouverture du relais en nuage — donc
    // seulement quand la partie empruntait ce chemin-là. Un enfant qui
    // rejoignait par le lien direct laissait ses vieilles lignes en place, et
    // c'est précisément lui qu'elles allaient accuser au lancement suivant.
    // Le moment juste est celui-ci : dès qu'on entre dans un monde, tout ce
    // que cet appareil y a écrit auparavant est mort, quel que soit le chemin
    // qu'on prendra ensuite. Aucune identité à épargner : on n'en a pas encore.
    this.purgerMesFantomes(null);

    return new Promise((resolve, reject) => {
      // tests can point signaling at a local server via ?peerhost=host:port
      const m = location.search.match(/[?&]peerhost=([^&]+)/);
      // La même liste partout, banc d'essai compris. Deux tentatives d'alléger
      // celle du banc — tout retirer, puis ne garder que le STUN — ont chacune
      // cassé la visibilité entre invités : le troisième joueur ne voyait plus
      // le deuxième, trois exécutions de suite. Ce que les navigateurs font de
      // ces adresses est plus subtil qu'il n'y paraît, et le banc doit éprouver
      // la configuration réelle, pas une variante commode.
      const peerOpts = { debug: 1, config: { iceServers: ICE_SERVERS } };
      if (m) {
        const [h, p] = decodeURIComponent(m[1]).split(':');
        Object.assign(peerOpts, { host: h, port: Number(p) || 443, path: '/', secure: false, key: 'peerjs' });
      }
      this.peer = isHost ? new Peer(ID_PREFIX + this.code, peerOpts) : new Peer(peerOpts);
      let settled = false;
      const abandon = setTimeout(() => {
        if (settled) return;
        try { this.peer.destroy(); } catch { /* déjà en morceaux */ }
        // LE COURTIER EST MUET — CE N'EST PLUS UN REFUS.
        //
        // Ce serveur ne sert qu'aux présentations : il attribue un identifiant
        // et transmet la première poignée de main. Tout le reste de la partie
        // passe ailleurs. Or il existe un second chemin, celui qui traverse
        // déjà les Wi-Fi d'hôtel : le nuage. Lui n'a besoin d'aucun courtier —
        // l'hôte relève sa boîte, l'invité y dépose, et le code du monde suffit
        // à se reconnaître.
        //
        // Renvoyer l'enfant au menu parce qu'un service extérieur ne répond
        // pas, alors qu'un chemin praticable est grand ouvert, n'a aucune
        // raison d'être. C'est pourtant ce que disait l'écran — « Le serveur de
        // jeu ne répond pas » — sur un téléphone dont la connexion marchait
        // parfaitement.
        settled = true;
        this.jouerSansCourtier().then((parLeNuage) => {
          if (parLeNuage) { resolve(this.code); return; }
          this.active = false;
          // Marqué : c'est le serveur de rendez-vous qui n'a pas répondu, pas
          // le monde d'en face. L'appelant n'a alors aucune raison de retenter
          // en hôte — il buterait sur le même mur, et l'enfant attendrait deux
          // fois neuf secondes pour le même verdict.
          const muet = new Error('Le serveur de jeu ne répond pas — réessaie dans un moment');
          muet.signal = true;
          reject(muet);
        });
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
          // L'hôte relève sa boîte aux lettres dès l'ouverture : un invité
          // coincé derrière un Wi-Fi public n'a que ce chemin-là pour se
          // manifester, et il ne doit pas trouver porte close.
          this.ouvrirRelaisNuage();
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
          ouvert();
          // Le courtier crie au lieu de se taire — même panne, autre symptôme,
          // et donc même issue : le nuage n'a pas besoin de lui. Sans cette
          // branche, un port injoignable renvoyait l'enfant au menu avec « Pas
          // de connexion internet au serveur de jeu », sur un téléphone dont la
          // connexion était parfaite.
          settled = true;
          this.jouerSansCourtier().then((parLeNuage) => {
            if (parLeNuage) { resolve(this.code); return; }
            reject(new Error('Pas de connexion internet au serveur de jeu'));
          });
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
  // Écoute les candidats que le navigateur récolte pour ce lien. On ne
  // cherche qu'une chose : est-ce qu'un relais a répondu ? La réponse change
  // le conseil qu'on donnera à l'enfant si le lien échoue.
  surveillerLesChemins(conn) {
    const brancher = () => {
      const pc = conn && conn.peerConnection;
      if (!pc || !pc.addEventListener) return false;
      pc.addEventListener('icecandidate', (e) => {
        const c = e && e.candidate && e.candidate.candidate;
        if (c && EST_RELAIS.test(c)) this.relaisVu = true;
      });
      return true;
    };
    // PeerJS fabrique la connexion au moment du connect : elle n'est parfois
    // là qu'au tour de boucle suivant.
    if (!brancher()) setTimeout(brancher, 0);
  }

  // --- le relais par le nuage -------------------------------------------------
  //
  // Le dernier chemin, celui qui ne dépend d'aucune ouverture de port : les
  // tablettes se déposent des messages dans la base, exactement comme elles y
  // déposent déjà leurs mondes. Il n'est jamais choisi tant que le lien direct
  // marche — il est plus lent — mais il rattrape les réseaux qui interdisent
  // tout le reste, et l'enfant n'a rien à faire pour cela.
  ouvrirRelaisNuage() {
    if (this.bus || !this.hooks.cloud) return null;
    // L'IDENTITÉ PORTE L'APPAREIL.
    //
    // Une session prenait jusqu'ici une identité tirée au sort à chaque
    // lancement : rien ne reliait les trois incarnations successives d'un même
    // téléphone, et personne — pas même lui — ne pouvait reconnaître ses
    // propres échos. En préfixant par l'appareil, un enfant qui revient sait
    // exactement quelles lignes du relais sont les siennes et peut les
    // effacer. L'hôte, lui, reconnaît son écho sans même avoir besoin de la
    // présentation.
    const monId = this.isHost ? ID_PREFIX + this.code
      : `${this.prefixeAppareil()}${Math.random().toString(36).slice(2, 8)}`;
    this.bus = new BusNuage(this.hooks.cloud, this.code, monId, {
      surPair: (conn) => {
        // Un pair arrivé par le nuage est un pair comme un autre : on
        // l'inscrit et on se présente. Tout ce qui suit l'ignore.
        //
        // Appelé aussi à chaque « coucou », donc au retour d'un appareil
        // endormi. On réinscrit dès que le lien n'est PAS celui qu'on suivait
        // — un lien neuf sous une clé connue reste un lien neuf, et sauter son
        // inscription le laissait sans écouteurs : il envoyait sans jamais
        // rien recevoir. C'est ce qui a cassé la poignée de main pendant une
        // demi-heure. Se représenter, en revanche, se fait à chaque fois :
        // c'est cette présentation-là qui remet l'enfant dans le monde.
        this.inscrireSiNouveau(conn);
        this.greet(conn);
      },
    });
    if (!this.bus.demarrer()) { this.bus = null; return null; }
    this.purgerMesFantomes(monId);
    return this.bus;
  }

  // Le préfixe qui désigne cet appareil, et lui seul.
  prefixeAppareil() {
    const brut = String(this.deviceId || 'sansappareil').replace(/[^a-z0-9]/gi, '').slice(0, 18);
    return `dev-${brut}-`;
  }

  // Tuer ses propres fantômes, tout de suite, plutôt que d'attendre qu'ils
  // expirent. On n'efface QUE ce que cet appareil a écrit sous une autre
  // identité : jamais les lignes d'un autre enfant, jamais les siennes.
  purgerMesFantomes(monId) {
    const cloud = this.hooks.cloud;
    if (!cloud || !cloud.configured || !this.deviceId) return;
    cloud.relaisPurgerMesFantomes(this.code, this.prefixeAppareil(), monId).catch(() => {});
  }

  // Jouer sans courtier du tout : le nuage porte la présentation ET la partie.
  //
  // On abandonne le pair — il n'a jamais reçu d'identifiant, il ne servira à
  // rien. Tout ce qui suit doit donc supporter `this.peer` absent : c'est la
  // contrepartie honnête de ce chemin, et elle est explicite.
  async jouerSansCourtier() {
    const cloud = this.hooks.cloud;
    if (!cloud || !cloud.configured) return false;
    // ON NE PROMET PAS UN CHEMIN QU'ON N'A PAS VÉRIFIÉ.
    //
    // Le nuage est « configuré » sur tous les appareils — c'est une adresse
    // écrite dans la page, pas une garantie. Configuré n'est pas joignable :
    // un enfant vraiment hors ligne se serait retrouvé dans un monde qui ne
    // mène nulle part, sans un mot, au lieu de lire une phrase honnête. Un
    // aller-retour tranche, et quatre secondes suffisent à le savoir.
    const repond = await Promise.race([
      cloud.relaisDernier(this.code).then(() => true).catch(() => false),
      new Promise((ok) => setTimeout(() => ok(false), 4000)),
    ]);
    if (!repond || !this.active) return false;
    this.peer = null;
    const bus = this.ouvrirRelaisNuage();
    if (!bus) return false;
    this.link('nuage');
    if (!this.isHost) {
      const conn = bus.connecter(ID_PREFIX + this.code);
      this.inscrireSiNouveau(conn);
      this.greet(conn);
    }
    this.state(this.statusText());
    this.startHeartbeat();
    return true;
  }

  // Reprendre le chemin du nuage, ou le rouvrir s'il s'était refermé. C'est
  // idempotent à dessein : on l'appelle au réveil, à chaque tentative de
  // reconnexion, et le coucou qui en part suffit à se refaire connaître de
  // l'hôte. Sans cela, un enfant qui jouait par le nuage et qui quittait
  // l'application ne revenait jamais dans la partie : la reconnexion ne
  // retentait que le lien direct, précisément celui que son réseau interdit.
  reprendreParLeNuage() {
    const bus = this.ouvrirRelaisNuage();
    if (!bus) return false;
    bus.reveiller();
    const conn = bus.connecter(ID_PREFIX + this.code);
    this.inscrireSiNouveau(conn);
    this.greet(conn);
    return true;
  }

  // Inscrire un lien, sauf si c'est exactement celui qu'on suit déjà. La
  // nuance est tout : deux liens successifs vers le même pair portent la même
  // clé, et ne pas inscrire le second revient à écouter un lien mort.
  // C'EST ICI QU'UN ENFANT DEVENAIT MUET.
  //
  // Le relais par le nuage est rouvert à chaque tentative de reconnexion et à
  // chaque réveil — c'est voulu, c'est ce qui ramène dans la partie un enfant
  // dont le réseau interdit le direct. Mais il fabriquait alors un lien de
  // secours qui prenait la place du lien DIRECT, même quand celui-ci marchait
  // parfaitement.
  //
  // L'enfant continuait de tout RECEVOIR : les écouteurs de l'ancien lien
  // vivaient encore, il voyait les autres bouger, construire, parler. Tout ce
  // qu'il ENVOYAIT, en revanche, partait désormais dans le nuage. Là où le
  // nuage répond, cela ne fait que ralentir. Là où il ne répond pas — et il ne
  // répond pas toujours — l'enfant entendait tout le monde sans que personne
  // ne l'entende, et rien à l'écran ne le disait : les avatars restaient là,
  // figés sur leur dernière position connue.
  //
  // Mesuré sur le banc : l'hôte n'avait pas reçu UNE seule position de lui en
  // trois secondes, quand son voisin en envoyait vingt-cinq. Et le troisième
  // joueur, qui n'apprend l'existence des autres que par ces positions
  // relayées, ne le voyait jamais arriver.
  //
  // La règle est donc : un lien direct vivant l'emporte toujours sur le
  // nuage. Et l'inverse vaut aussi — un direct qui s'ouvre alors qu'on est
  // au nuage reprend la main, ce qui donne gratuitement la remontée du
  // secours vers le lien rapide.
  inscrireSiNouveau(conn) {
    const c = this.conns.get(conn.peer);
    if (!c || !c.conn) { this.registerConn(conn); return; }
    if (c.conn === conn) return;
    if (conn.parNuage && !c.conn.parNuage && this.lienVivant(c.conn)) return;
    this.registerConn(conn);
  }

  // Un lien qui porte vraiment quelque chose. `open` ne suffit pas : PeerJS le
  // laisse à vrai un court instant après que le transport s'est refermé.
  lienVivant(conn) {
    if (!conn || conn.open === false) return false;
    if (conn.parNuage) return true;      // le nuage n'a pas de canal à sonder
    return !!(conn.dataChannel && conn.dataChannel.readyState === 'open');
  }

  // L'invité bascule : le lien direct n'a pas abouti, on passe par la base.
  // On ne renonce qu'après avoir essayé cela aussi.
  basculerSurLeNuage(done) {
    const bus = this.ouvrirRelaisNuage();
    if (!bus) return false;
    this.link('signal', 'Passage par le nuage…');
    const conn = bus.connecter(ID_PREFIX + this.code);
    this.registerConn(conn);
    this.greet(conn);
    // On laisse à l'hôte le temps de relever sa boîte et de répondre. Deux
    // tours de sondage suffisent en général ; on en accorde largement plus.
    const limite = setTimeout(() => {
      const c = this.conns.get(conn.peer);
      if (c && c.pret) return;                   // quelqu'un a répondu : tout va bien
      this.conns.delete(conn.peer);
      this.playersChanged();
      try { bus.arreter(); } catch { /* déjà arrêté */ }
      this.bus = null;
      const muet = new Error('Personne n\'a répondu dans ce monde');
      muet.canal = true;
      muet.reseauFerme = !this.relaisVu;
      done?.(muet);
    }, 12000);
    // La présentation reçue par le nuage vaut réussite : c'est onMessage qui
    // marque `pret`, on se contente de guetter.
    const guetter = setInterval(() => {
      const c = this.conns.get(conn.peer);
      if (!this.active || !c) { clearInterval(guetter); return; }
      if (!c.pret) return;
      clearInterval(guetter);
      clearTimeout(limite);
      this.link('nuage', 'Partie relayée par le nuage — un peu plus lente, mais elle marche.');
      done?.(null);
    }, 300);
    return true;
  }

  connectToHost(done) {
    this.relaisVu = false;
    // UNE SEULE TENTATIVE VIVANTE À LA FOIS.
    //
    // Chaque essai fabrique un canal WebRTC, et un canal jamais refermé garde
    // sa RTCPeerConnection pour toujours. La boucle de reconnexion en ouvre un
    // toutes les trois à vingt secondes ; au bout d'un moment le navigateur
    // refuse d'en construire davantage — « Cannot create so many
    // PeerConnections » — et à partir de cet instant plus AUCUNE connexion
    // n'est possible, ni directe ni relayée. La tablette est bonne à
    // recharger, et l'enfant lit « impossible de rejoindre » pour toujours.
    //
    // On referme donc l'essai précédent au moment d'en lancer un nouveau — et
    // seulement à ce moment-là : couper plus tôt condamnerait un lien lent qui
    // allait aboutir, ce que la remontée vers le direct sait justement
    // rattraper.
    if (this._essai && !this._essai.open) {
      try { this._essai.close(); } catch { /* déjà refermée */ }
    }
    const conn = this.peer.connect(ID_PREFIX + this.code, { reliable: true });
    if (!conn) { done?.(new Error('Connexion impossible')); return; }
    this._essai = conn;
    this.surveillerLesChemins(conn);
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
        // Avant de renoncer, le dernier chemin : la base. Sur un Wi-Fi
        // public c'est le seul qui reste, et il n'appartient pas à l'enfant
        // de le deviner.
        if (!this.bus && this.basculerSurLeNuage((e) => rate(e || null))) return;
        const muet = new Error('Personne n\'a répondu dans ce monde');
        // L'appelant a besoin de distinguer « le monde est vide » de « le monde
        // est là mais on ne l'atteint pas » : ce n'est pas la même panne, et ce
        // n'est pas la même phrase à montrer à un enfant.
        muet.canal = true;
        muet.reseauFerme = !this.relaisVu;
        rate(muet);
      },
      // Court par défaut : dans le cas courant — le monde est vide — cette
      // attente est du temps perdu avant de l'ouvrir soi-même. Quand on sait
      // déjà que quelqu'un est là, l'appelant demande plus de patience.
      this.patience || 5000,
    );
    conn.on('open', () => {
      clearTimeout(minuteur);
      if (this._essai === conn) this._essai = null;   // celle-ci a abouti
      this._rejoining = false;
      this.greet(conn);
      this.link('ok');
      if (!fini) { fini = true; done?.(null); }
    });
    // Le lien refuse de s'ouvrir. C'est la même panne que le silence
    // ci-dessus, vue d'un autre côté : le canal n'existera pas. On la marque
    // pareil, sans quoi l'enfant recevait « Connexion impossible » tout court
    // — deux mots, aucun conseil, alors que c'est précisément le cas où il a
    // besoin qu'on lui dise quoi essayer.
    conn.on('error', () => {
      if (fini) return;
      if (!this.bus && this.basculerSurLeNuage((err) => rate(err || null))) return;
      const e = new Error('Connexion impossible');
      e.canal = true;
      e.reseauFerme = !this.relaisVu;
      rate(e);
    });
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
      // Et le chemin du nuage, en parallèle. Sur un réseau qui interdit le
      // pair-à-pair, retenter le lien direct seul, c'est retenter à l'infini
      // ce qui n'a jamais marché : l'enfant restait sur « Reconnexion… » sans
      // aucune issue, et devait quitter le mode en ligne pour y revenir.
      if (this.bus || essai >= 2) this.reprendreParLeNuage();
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
        // Le tuyau du nuage, lui, a été gelé avec la page : on le relance
        // tout de suite et on se re-annonce, plutôt que d'attendre un tour de
        // sondage qui peut tarder après une longue veille.
        if (this.bus) this.reprendreParLeNuage();
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
      // LE FILET : un invité en ligne a un lien vers l'hôte, ou il en cherche
      // un. Jamais ni l'un ni l'autre.
      //
      // Mesuré sur le banc : un invité s'est retrouvé sans aucun lien ET sans
      // boucle de reconnexion en cours — donc seul pour toujours, dans un
      // monde qui avait l'air normal, sans erreur, sans message, sans rien à
      // faire. Le chemin exact importe peu : il y en a plusieurs (une reprise
      // qui aboutit puis meurt aussitôt, une relance annulée par une autre),
      // et il y en aura d'autres. On rétablit donc l'invariant à chaque
      // battement plutôt que de courir après chacun d'eux.
      if (!this.isHost && this.active && !this._rejoining
        && !this.conns.has(ID_PREFIX + this.code)) {
        this.rejoinHost();
      }
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
    // LA REMONTÉE DU SECOURS VERS LE LIEN RAPIDE.
    //
    // L'autre moitié de la panne du muet. Quand le direct met plus de cinq
    // secondes à s'ouvrir — machine chargée, réseau qui traîne —, le secours
    // par le nuage prend la main légitimement : à cet instant le direct ne
    // porte encore rien. Mais il finit par s'ouvrir une seconde plus tard, et
    // PLUS RIEN ne lui rendait sa place : l'enfant restait sur le tuyau lent,
    // ou muet là où le nuage ne répond pas.
    //
    // Un lien direct qui s'ouvre reprend donc la main sur le nuage — sans
    // effacer ce qu'on sait déjà du joueur, sinon il redeviendrait un inconnu
    // le temps d'une présentation.
    if (!conn.parNuage) {
      if (conn.open) this.promouvoirSiDirect(conn);
      else conn.on('open', () => this.promouvoirSiDirect(conn));
    }
    this.startHeartbeat();
  }

  promouvoirSiDirect(conn) {
    if (!this.active || conn.parNuage) return;
    const c = this.conns.get(conn.peer);
    if (!c || c.conn === conn) return;
    if (c.conn && !c.conn.parNuage) return;   // un direct en vaut un autre
    c.conn = conn;
    this.state(this.statusText());
    // On se represente sur le nouveau chemin : l'hôte doit savoir par où
    // répondre, et c'est gratuit quand on est déjà connus l'un de l'autre.
    this.greet(conn);
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
      conn.send({ t: 'hello', name: this.profile.name, lookIdx: this.profile.lookIdx, look: this.profile.look, device: this.deviceId });
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
          t: 'hello', encore: true, device: this.deviceId,
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
    if (this.onPhotoFin) this.onPhotoFin(id);
    this.playersChanged();
  }

  statusText() {
    const n = this.playerCount();
    return n > 1 ? `🌐 ${n} joueurs · code ${this.code}` : `En attente d'un joueur… code : ${this.code}`;
  }

  onMessage(conn, msg) {
    // La couture du banc d'essai : un filtre posé par les tests peut retenir un
    // message, comme le ferait un tuyau encombré. Inerte en jeu — le banc l'a
    // longtemps installée en enveloppant cette méthode depuis l'extérieur, par
    // un sondage qui perdait sa course une fois sur trois sur machine chargée :
    // le scénario passait alors sans avoir rien éprouvé.
    if (typeof window !== 'undefined' && window.__filtreMessages
      && window.__filtreMessages(msg) === false) return;
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
            // LE FANTÔME DE SOI-MÊME.
            //
            // Même prénom ET même appareil : ce n'est pas un doublon, c'est
            // nous — une session précédente restée accrochée pendant que
            // l'enfant rouvrait l'application. Un appareil ne joue pas deux
            // fois en même temps ; entre les deux, le vivant est celui qui
            // arrive.
            //
            // L'ancienne règle refusait l'arrivant avec « tu joues déjà depuis
            // un autre appareil », ce qui était faux et sans issue : l'enfant
            // était renvoyé au menu par son propre reflet. On cède donc la
            // place, et il rouvre son monde.
            //
            // L'EXCEPTION EST SUPPRIMÉE, ET C'EST LE FOND DE L'AFFAIRE.
            //
            // Le jeu applique partout la même règle : entre deux connexions au
            // même prénom, la vivante est la plus récente — l'autre est un
            // cadavre. Un seul endroit y dérogeait, l'hôte, qui se protégeait
            // lui-même au motif que « c'est nous ». C'est précisément là que
            // l'enfant se faisait piéger : renvoyé au menu par son propre
            // reflet, avec une phrase fausse et aucune issue, trois fois de
            // suite.
            //
            // On cède donc toujours. Le seul délogé possible est soi-même
            // depuis un autre appareil, ce qui est exactement ce que la règle
            // promet — « chaque joueur ne peut être connecté qu'à un seul
            // endroit à la fois ». Un autre enfant ne peut rien déloger : il
            // faudrait qu'il porte le même prénom.
            //
            // MON PROPRE ÉCHO N'EST PAS UN JOUEUR.
            //
            // Corrige la règle posée en v153, qui était trop large. « Le plus
            // récent gagne » est juste entre deux vrais appareils ; c'est faux
            // quand le prétendu arrivant est une incarnation précédente du
            // MÊME téléphone, encore vivante côté nuage. La session vivante
            // cédait alors la place à un fantôme qui n'était plus là pour
            // prendre le relais — d'où un manège que fermer l'application
            // n'interrompait pas.
            //
            // Trois cas, et un seul mérite qu'on s'efface :
            //   — même appareil : c'est moi, je referme en silence ;
            //   — appareil inconnu : une version d'avant, qui n'annonce pas le
            //     sien. Une session vivante d'aujourd'hui l'annonce toujours,
            //     donc c'est un fantôme : je referme aussi ;
            //   — un autre appareil réel : là, et là seulement, je cède.
            const memeAppareil = !!(msg.device && this.deviceId && msg.device === this.deviceId);
            const sansAppareil = !msg.device;
            const echoDeMoi = memeAppareil || sansAppareil
              || String(conn.peer || '').startsWith(this.prefixeAppareil());
            if (echoDeMoi) {
              this.conns.delete(conn.peer);
              setTimeout(() => { try { conn.close(); } catch { /* déjà fermée */ } }, 200);
              this.playersChanged();
              break;
            }
            conn.send({ t: 'cede', name: wanted });
            setTimeout(() => { if (this.onCeder) this.onCeder(); }, 300);
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
          try {
            conn.send({
              t: 'sync', blocks: this.hooks.world.exportEdits(),
              // le chantier en cours part avec le monde : un arrivant voit le
              // fantôme et la jauge sans que personne n'ait rien à refaire
              chantier: this.chantierActuel ? this.chantierActuel() : undefined,
            });
          }
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
      // Notre propre fantôme nous rend la main : on rouvre le monde, qu'il
      // vient de libérer. Rien à dire à l'enfant — de son point de vue, il a
      // simplement rejoint sa partie.
      case 'cede':
        // On laisse au fantôme le temps de LÂCHER le code avant de le
        // reprendre. Sans ce délai, l'arrivant se rebranchait sur une session
        // en train de mourir : il redevenait invité d'un hôte qui n'existait
        // déjà plus, et n'était jamais l'hôte de son propre monde. Une seconde
        // et demie suffit à ce que le pair soit détruit et l'identifiant rendu.
        setTimeout(() => { if (this.onCodePris) this.onCodePris(this.code); }, 1500);
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
      case 'chantier': // le plan commun posé ou retiré
        if (this.onChantier) this.onChantier(msg.c);
        if (this.isHost) this.relay(conn.peer, msg);
        break;
      // La caméra lente. Sur un Wi-Fi public, le flux vidéo ne passe pas :
      // c'est une photo toutes les deux secondes qui voyage à sa place, par le
      // même tuyau que les blocs. On se voit, on se reconnaît, on se fait
      // coucou — et c'est infiniment mieux qu'un carré noir.
      case 'photo':
        if (this.onPhoto) {
          this.onPhoto(msg.from || conn.peer, String(msg.img || ''), String(msg.name || ''));
        }
        if (this.isHost) this.relay(conn.peer, { ...msg, from: conn.peer });
        break;
      case 'photo-fin':
        if (this.onPhotoFin) this.onPhotoFin(msg.from || conn.peer);
        if (this.isHost) this.relay(conn.peer, { ...msg, from: conn.peer });
        break;
      // L'heure et le temps qu'il fait. Chaque appareil les tirait au sort de
      // son côté : deux enfants côte à côte pouvaient être l'un sous la pluie
      // en pleine nuit, l'autre au soleil de midi. C'est l'hôte qui décide, et
      // lui seul — on ignore donc ce message s'il vient d'un invité.
      case 'ciel':
        if (!this.isHost && this.onCiel) this.onCiel(msg);
        break;
      case 'sync': {
        if (msg.chantier !== undefined && msg.chantier !== null && this.onChantier) {
          this.onChantier(msg.chantier);
        }
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
        // `this.peer` peut être absent : quand le courtier est muet, la partie
        // se joue entièrement par le nuage et il n'y a jamais eu de pair.
        const monId = this.peer ? this.peer.id : null;
        if (!this.conns.has(msg.from) && msg.from !== monId) {
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
      this.reconcilierVideo();
      this.veillerSurLaVideo();
      this.hooks.toast(this.micOn
        ? '🎥 Caméra et micro activés — coucou !'
        : '🎥 Caméra activée (sans micro)', 0x6ee06e);
      if (this.onCamChange) this.onCamChange(true);
    } else {
      this.camOn = false;
      this.micOn = false;
      this.cesserDeVeillerSurLaVideo();
      for (const call of this.videoCalls.values()) call.close();
      this.videoCalls.clear();
      if (this.videoStream) {
        this.videoStream.getTracks().forEach((t) => t.stop());
        this.videoStream = null;
      }
      this.annoncerFinDePhoto();
      this.hooks.toast('📷 Caméra et micro coupés', 0xcccccc);
      if (this.onCamChange) this.onCamChange(false);
    }
    return this.camOn;
  }

  videoCallPeer(id) {
    if (this.videoCalls.has(id) || !this.videoStream || !this.peer) return;
    const entry = this.conns.get(id);
    if (!entry || !entry.conn) return;
    // Un pair rejoint par le nuage n'a aucun chemin pour un flux vidéo : le
    // Wi-Fi qui a forcé le relais bloque exactement ce que la visio demande.
    // Appeler quand même laissait une sonnerie sans fin — et un cadre noir.
    // C'est la caméra lente qui prend le relais, par images.
    if (entry.conn.parNuage) return;
    let call = null;
    try { call = this.peer.call(id, this.videoStream, { metadata: { kind: 'video' } }); }
    catch { return; }            // la veille repassera
    if (!call) return;
    call.placeA = Date.now();
    this.videoCalls.set(id, call);
    // Un appel mort doit LIBÉRER sa place, sinon la veille le croit vivant et
    // n'en replace jamais. C'est ce qui laissait un carré noir définitif.
    const oublier = () => { if (this.videoCalls.get(id) === call) this.videoCalls.delete(id); };
    call.on('close', oublier);
    call.on('error', oublier);
  }

  // LA VISIO SE REMET D'APLOMB TOUTE SEULE.
  //
  // L'appel était placé une seule fois, à l'instant où l'on presse le bouton.
  // C'est trop fragile pour ce que la famille en fait : le pair qui n'était
  // pas encore tout à fait inscrit quand l'enfant a appuyé, celui qui arrive
  // après, l'appel qui n'aboutit pas, le lien qui cligne — chacun de ces cas
  // laissait un carré noir que RIEN ne venait réparer, et l'enfant en était
  // réduit à éteindre et rallumer. Mesuré sur le banc : selon l'instant du
  // clic, l'appel n'était parfois même jamais placé.
  //
  // On repasse donc toutes les deux secondes : chaque voisin en direct doit
  // avoir son appel vivant, sinon on le rappelle. On laisse dix secondes à
  // une négociation en cours — c'est long pour un réseau, court pour un
  // enfant qui attend, et cela évite de couper un appel qui allait aboutir.
  reconcilierVideo() {
    if (!this.camOn || !this.videoStream || !this.active) return;
    for (const [id, c] of this.conns) {
      if (!c.conn || c.conn.parNuage) continue;
      const appel = this.videoCalls.get(id);
      if (!appel) { this.videoCallPeer(id); continue; }
      if (appel.open) continue;
      if (Date.now() - (appel.placeA || 0) < 10000) continue;
      try { appel.close(); } catch { /* déjà fermé */ }
      this.videoCalls.delete(id);
      this.videoCallPeer(id);
    }
  }

  veillerSurLaVideo() {
    if (this._veilleVideo) return;
    this._veilleVideo = setInterval(() => this.reconcilierVideo(), 2000);
  }

  cesserDeVeillerSurLaVideo() {
    if (this._veilleVideo) { clearInterval(this._veilleVideo); this._veilleVideo = null; }
  }

  // Y a-t-il quelqu'un que seul le nuage nous relie ? C'est ce qui décide si
  // la caméra lente doit tourner en plus — ou à la place — du flux vidéo.
  aDesPairsNuage() {
    for (const c of this.conns.values()) if (c.conn && c.conn.parNuage) return true;
    return false;
  }

  // Une image fixe part vers ceux qu'on ne peut joindre que par le nuage. Les
  // autres reçoivent déjà du vrai film : leur en envoyer serait du gâchis.
  envoyerPhoto(img) {
    for (const c of this.conns.values()) {
      if (c.conn && c.conn.parNuage) this.envoyer(c, { t: 'photo', img, name: this.profile.name });
    }
  }

  // La caméra s'éteint : on le dit, sinon la dernière image resterait affichée
  // comme un portrait au mur.
  annoncerFinDePhoto() {
    for (const c of this.conns.values()) {
      if (c.conn && c.conn.parNuage) this.envoyer(c, { t: 'photo-fin' });
    }
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
    if (this.bus) { try { this.bus.arreter(); } catch { /* déjà arrêté */ } this.bus = null; }
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
    this.cesserDeVeillerSurLaVideo();
    if (this.videoStream) this.videoStream.getTracks().forEach((t) => t.stop());
    if (this.peer) this.peer.destroy();
    this.conns.clear();
    this.calls.clear();
    this.audios.clear();
    this.videoCalls.clear();
    this.inboundVideo.clear();
  }
}
