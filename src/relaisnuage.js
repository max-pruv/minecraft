// Le relais de secours : jouer à plusieurs même quand le pair-à-pair est mort.
//
// Sur un Wi-Fi public — hôtel, école, gare, café —, le trafic direct entre
// deux tablettes n'a aucune chance : l'UDP est coupé, et ce qui reste est
// inspecté. Même le relais TURN classique n'en sort pas toujours. Dire à
// l'enfant « change de réseau » n'est pas une réponse : il n'y peut rien.
//
// Or une chose passe forcément, sans quoi le jeu ne se serait même pas
// ouvert : le HTTPS vers le nuage, celui qui charge la page et sauvegarde les
// mondes. Ce module s'en sert comme d'un tuyau. Les tablettes ne se parlent
// plus directement : elles déposent leurs messages dans une table et lisent
// ce qui leur est adressé. C'est plus lent qu'un lien direct — le tour de
// boucle se compte en demi-secondes, pas en millisecondes — mais ça marche
// partout où le jeu s'ouvre, et c'est exactement le point.
//
// Le tuyau se fait passer pour une connexion PeerJS : même surface, mêmes
// événements. Tout le reste du réseau — présentation, journal de blocs,
// positions, chat — continue sans savoir par où il voyage.

const SONDAGE_MS = 500;          // le tour de boucle quand quelqu'un est là
const SONDAGE_LENT_MS = 2000;    // quand le monde est vide, on se fait discret
const OUBLI_MS = 120000;         // au-delà, un message n'intéresse plus personne

// Une connexion qui ressemble à s'y méprendre à celle de PeerJS : c'est ce
// qui permet de la donner telle quelle à registerConn().
export class ConnexionNuage {
  constructor(bus, idDistant) {
    this.bus = bus;
    this.peer = idDistant;
    this.open = true;
    this.parNuage = true;        // le jeu peut le dire à l'enfant
    this.dataChannel = null;     // pas de canal WebRTC : rien à vérifier
    this.peerConnection = null;
    this._ecoutes = new Map();
  }

  on(evt, cb) {
    if (!this._ecoutes.has(evt)) this._ecoutes.set(evt, []);
    this._ecoutes.get(evt).push(cb);
    return this;
  }

  emettre(evt, arg) {
    for (const cb of this._ecoutes.get(evt) || []) {
      try { cb(arg); } catch { /* un écouteur fautif n'emporte pas les autres */ }
    }
  }

  send(msg) {
    if (!this.open) return;
    this.bus.envoyer(this.peer, msg);
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.bus.envoyer(this.peer, { t: 'nuage-adieu' });
    this.bus.oublier(this.peer);
    this.emettre('close');
  }
}

export class BusNuage {
  // cloud : l'objet CloudSave (il sait parler à la base et connaît la clé).
  // surPair(conn) : appelé quand un pair inconnu se manifeste.
  constructor(cloud, code, monId, { surPair } = {}) {
    this.cloud = cloud;
    this.code = String(code);
    this.monId = monId;
    this.surPair = surPair;
    this.conns = new Map();      // idDistant -> ConnexionNuage
    this.dernierId = 0;
    this.actif = false;
    this._timer = null;
    this._menage = 0;
    // Vrai dès qu'UNE lecture a abouti. C'est la pièce qui manquait au
    // diagnostic : « personne ne répond » n'a pas le même sens selon que le
    // relais nous parle ou pas. S'il nous parle, le réseau n'y est pour rien
    // — accuser le Wi-Fi à ce moment-là, c'était mentir à l'enfant.
    this.joignable = false;
  }

  get disponible() { return !!(this.cloud && this.cloud.configured); }

  demarrer() {
    if (this.actif || !this.disponible) return false;
    this.actif = true;
    // On ne relit pas le passé du monde : seuls les messages postérieurs à
    // notre arrivée nous concernent. Sans cela, un enfant qui rejoint rejouait
    // toute la conversation précédente.
    this._amorcer().then(() => this._boucler());
    return true;
  }

  async _amorcer() {
    try {
      const lignes = await this.cloud.relaisLire(this.code, 0, 1);
      // le dernier numéro connu, quel qu'il soit : on part de maintenant
      const dernier = await this.cloud.relaisDernier(this.code);
      this.dernierId = dernier || (lignes[0] ? lignes[0].id : 0);
    } catch { /* on repartira de zéro, au pire on relit un peu */ }
  }

  _boucler() {
    if (!this.actif) return;
    const attente = this.conns.size ? SONDAGE_MS : SONDAGE_LENT_MS;
    this._timer = setTimeout(async () => {
      await this.relever();
      this._boucler();
    }, attente);
  }

  // Va chercher ce qui nous est adressé depuis le dernier passage.
  async relever() {
    if (!this.actif || !this.disponible) return;
    let lignes = [];
    try { lignes = await this.cloud.relaisLire(this.code, this.dernierId); }
    catch { return; }             // réseau capricieux : on retentera
    this.joignable = true;        // le relais nous parle : le réseau est sain
    for (const l of lignes) {
      if (l.id > this.dernierId) this.dernierId = l.id;
      if (l.de === this.monId) continue;                       // notre propre écho
      if (l.vers && l.vers !== this.monId) continue;           // ce n'est pas pour nous
      this._recevoir(l.de, l.msg);
    }
    // Le ménage : les messages d'il y a deux minutes n'intéressent plus
    // personne, et une table qui enfle finit par coûter cher à relire.
    if (Date.now() - this._menage > 60000) {
      this._menage = Date.now();
      this.cloud.relaisNettoyer(this.code, OUBLI_MS).catch(() => {});
    }
  }

  _recevoir(de, msg) {
    if (msg && msg.t === 'nuage-adieu') {
      const c = this.conns.get(de);
      if (c) { c.open = false; this.conns.delete(de); c.emettre('close'); }
      return;
    }
    let conn = this.conns.get(de);
    const nouveau = !conn;
    if (!conn) {
      conn = new ConnexionNuage(this, de);
      this.conns.set(de, conn);
    }
    // Un lien refermé par un adieu peut revivre : c'est exactement ce qui se
    // passe quand un enfant quitte l'application et y revient.
    if (!conn.open) conn.open = true;
    // « nuage-coucou » ne sert qu'à se faire connaître — et à SE REFAIRE
    // connaître. On re-présente donc le pair au réseau à chaque coucou, pas
    // seulement au premier : pendant que l'iPhone dormait, l'hôte a pu
    // l'oublier, et sans cette re-présentation l'enfant revenait dans un
    // monde qui ne l'écoutait plus.
    if (nouveau || (msg && msg.t === 'nuage-coucou')) {
      if (this.surPair) this.surPair(conn);
      if (nouveau) conn.emettre('open');
    }
    if (msg && msg.t === 'nuage-coucou') return;
    conn.emettre('data', msg);
  }

  // Ouvre un lien vers un pair dont on connaît déjà l'identifiant — c'est le
  // cas de l'invité, qui sait que l'hôte s'appelle du nom du monde.
  connecter(idDistant) {
    let conn = this.conns.get(idDistant);
    if (!conn) {
      conn = new ConnexionNuage(this, idDistant);
      this.conns.set(idDistant, conn);
    }
    // On frappe à la porte : l'hôte nous découvrira en relevant sa boîte.
    this.envoyer(idDistant, { t: 'nuage-coucou' });
    return conn;
  }

  envoyer(vers, msg) {
    if (!this.disponible) return;
    this.cloud.relaisEcrire(this.code, this.monId, vers, msg).catch(() => {});
  }

  oublier(idDistant) { this.conns.delete(idDistant); }

  // Le retour d'un appareil endormi. iOS gèle les minuteurs d'une page en
  // arrière-plan : la boucle de relève s'arrête net et peut mettre longtemps
  // à repartir. On la relance sur-le-champ, sans attendre son tour.
  reveiller() {
    if (!this.actif) { this.demarrer(); return; }
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this.relever().then(() => this._boucler());
  }

  arreter() {
    this.actif = false;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    for (const c of this.conns.values()) { c.open = false; }
    this.conns.clear();
  }
}
