// LE JOURNAL DE BORD DE L'APPAREIL (v296).
//
// Max : « un iPad d'ancienne génération se connecte, ça ne lague pas trop, et
// au bout de vingt secondes de jeu il plante. Il faudrait collecter des logs
// pour comprendre les pannes. » Un plantage sur iPad ne laisse RIEN : Safari
// tue la page sans un mot, la console est vide, et personne n'était devant
// la tablette avec un câble. Ce qu'on peut savoir d'une panne, il faut donc
// l'avoir ÉCRIT AVANT qu'elle n'arrive — et le relire au lancement suivant.
//
// Trois règles portent ce fichier.
//
// 1. LE JOURNAL S'ÉCRIT PENDANT, PAS APRÈS. Toutes les deux secondes le journal
//    de la session en cours est posé dans le stockage de l'appareil : la fiche
//    de l'appareil, les derniers relevés (où l'enfant est, la cadence, ce que
//    le jeu tient en mémoire), les derniers événements et les erreurs. Quand
//    la page meurt, ce qui est écrit reste ; c'est la seule trace possible.
// 2. UNE SESSION QUI N'A PAS DIT AU REVOIR EST UN PLANTAGE PRÉSUMÉ. On pose un
//    drapeau « session ouverte » au démarrage et on le retire quand la page
//    s'en va proprement (pagehide) ou passe en arrière-plan — iOS tue aussi
//    les onglets cachés, et ce n'est pas un plantage que l'enfant a vu. Au
//    lancement suivant, drapeau encore là = la session d'avant est morte
//    devant l'enfant : son journal part au nuage avec la mention `plantage`.
// 3. DEUX PLANTAGES DE SUITE, ET LE JEU S'ALLÈGE TOUT SEUL. Le palier ne se
//    range qu'après trente secondes de jeu (v284) : un appareil qui meurt à
//    vingt secondes n'est JAMAIS classé, et chaque relance repart au réglage
//    « moyen » qui vient de le tuer. C'est une boucle sans issue, et c'est
//    exactement ce que la v291 interdit à tout réglage automatique. Le
//    disjoncteur (`suretePalier`) écrit alors un verdict `bas` marqué `surete`,
//    que la mesure suivante n'écrase pas ; seule l'étendue choisie dans les
//    Réglages passe devant (`palierRetenu`, palier.js). Et on le DIT.
//
// Aucun import, aucun DOM : ce module est pur, lu sous node par un témoin ; ce
// qui touche à la page (`window`, `performance`) lui est passé.

export const JOURNAL_CLE = 'web-minecraft-journal-v1';          // le journal (ancien format : une seule session)
export const SESSION_CLE = 'web-minecraft-session-ouverte-v1';  // les sessions ouvertes, et leur dernier battement
export const PLANTAGES_CLE = 'web-minecraft-plantages-v1';      // plantages consécutifs
export const TABLE_JOURNAL = 'journal_appareil';

// UNE SESSION, UNE ENTRÉE (v425). L'iPhone de la famille a déclaré « plantée »
// une session qui a envoyé sa fermeture propre trois minutes plus tard (lignes
// 82 et 83 de `journal_appareil`) : DEUX PAGES vivaient sur le même stockage,
// la seconde a lu le drapeau de la première — vivante — comme un plantage, et
// un drapeau unique fait qu'une page qui se ferme efface aussi celui de l'autre.
// Reproduit au banc à coup sûr (`sonde-journal-relance.cjs`). Chaque session a
// donc son identifiant, son journal à elle (`JOURNAL_CLE#id`), et sa ligne dans
// la table des sessions ouvertes avec l'heure de son dernier BATTEMENT.
export const BATTEMENT_MS = 2000;
// Un battement plus récent que cela : la page vit peut-être encore. On ne la
// déclare pas plantée d'office ; on regarde si son battement avance
// (`verifierDouteuses`). Plus ancien : elle est morte sans dire au revoir.
export const VIVANT_MS = 10000;
export const cleJournal = (id) => `${JOURNAL_CLE}#${id}`;

// Deux plantages de suite : on ne parie pas une troisième partie de l'enfant
// sur le même réglage. Un seul serait trop : un onglet tué pour une raison
// sans rapport (mise à jour d'iOS, batterie) dégraderait l'appareil pour rien.
export const PLANTAGES_SURETE = 2;

// Ce qu'un journal peut peser : il part en `fetch` avec `keepalive`, dont la
// limite est de 64 Ko toutes requêtes confondues, et il vit dans localStorage
// à côté des blocs des enfants. On garde le récent, on jette l'ancien.
export const MAX_OCTETS = 24000;
export const MAX_EVENEMENTS = 80;
export const MAX_RELEVES = 60;
export const CADENCE_PERSISTANCE_MS = 2000;
export const CADENCE_RELEVE_MS = 5000;

// ── CE QUE LA SESSION D'AVANT A LAISSÉ (pur) ─────────────────────────────────
//
// `drapeau` : le drapeau « session ouverte » était-il encore là ?
// `journalBrut` : le journal qu'elle avait écrit, tel quel (chaîne ou null).
// `plantages` : le compteur de plantages consécutifs avant cette lecture.
// Rend le rapport à envoyer (ou null), le nouveau compteur, et `etendue` :
// l'étendue choisie sous laquelle la session morte jouait (fiche.reglage,
// v299), pour que la sûreté sache à quel choix elle s'oppose.
export function bilanPrecedent({ drapeau, journalBrut, plantages = 0 }) {
  if (!drapeau) return { rapport: null, plantages: plantages || 0, etendue: null };
  let journal = null;
  try { journal = journalBrut ? JSON.parse(journalBrut) : null; } catch { journal = null; }
  const rapport = journal && typeof journal === 'object'
    ? { ...journal, fin: 'plantage' }
    : { fin: 'plantage', sansJournal: true };
  const reglage = journal && journal.fiche && journal.fiche.reglage;
  const etendue = reglage && typeof reglage.etendue === 'string' ? reglage.etendue : null;
  return { rapport, plantages: (plantages || 0) + 1, etendue };
}

// Le disjoncteur : au-delà de `PLANTAGES_SURETE`, un verdict `bas` marqué
// `surete`, dans la forme que `palierRetenu` lit (palier.js).
// `sousChoix` (v299) : l'étendue CHOISIE sous laquelle ça a planté, si ce n'est
// pas `auto` — le verdict passe alors devant ce choix-là (`palierRetenu`).
export function suretePalier(plantages, sousChoix = null) {
  if (!(plantages >= PLANTAGES_SURETE)) return null;
  const v = { palier: 'bas', raison: `${plantages} plantages de suite`, surete: true, le: Date.now() };
  if (sousChoix && sousChoix !== 'auto') v.sousChoix = sousChoix;
  return v;
}

// Un document borné : on retire le plus ancien jusqu'à tenir dans MAX_OCTETS.
export function borner(doc, maxOctets = MAX_OCTETS) {
  const d = { ...doc, evenements: [...(doc.evenements || [])], releves: [...(doc.releves || [])] };
  let s = JSON.stringify(d);
  while (s.length > maxOctets && (d.releves.length > 4 || d.evenements.length > 4)) {
    if (d.releves.length > 4) d.releves.shift();
    if (d.evenements.length > 4) d.evenements.shift();
    s = JSON.stringify(d);
  }
  return d;
}

// LA TABLE DES SESSIONS OUVERTES (pur). Ancien format (v296 à v408) : une
// chaîne d'horodatage, une seule session, jamais de battement — on la rend
// comme une session `ancienne`, jugée comme avant : morte d'office, puisque
// rien ne peut dire qu'elle vit (c'est aussi le cas de la page d'avant une
// mise à jour). Rend { id: { vu, ancienne } }.
export function lireSessions(brut) {
  if (brut === null || brut === undefined || brut === '') return {};
  try {
    const o = JSON.parse(brut);
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      const r = {};
      for (const [id, vu] of Object.entries(o)) if (Number.isFinite(Number(vu))) r[id] = { vu: Number(vu), ancienne: false };
      return r;
    }
    if (Number.isFinite(Number(o))) return { ancienne: { vu: Number(o), ancienne: true } };
  } catch { /* abîmé */ }
  return { ancienne: { vu: 0, ancienne: true } };
}

// Ce que la page qui s'ouvre fait des sessions qu'elle trouve (pur) : une
// session ANCIENNE ou muette depuis plus de VIVANT_MS est morte ; une autre
// est DOUTEUSE — peut-être une page vivante à côté.
export function classerSessions(sessions, maintenant, vivantMs = VIVANT_MS) {
  const mortes = [], douteuses = [];
  for (const [id, s] of Object.entries(sessions)) {
    if (s.ancienne || maintenant - s.vu > vivantMs) mortes.push(id);
    else douteuses.push(id);
  }
  return { mortes, douteuses };
}

export class Journal {
  // `stockage` : {get, set, remove} sur le stockage BRUT de l'appareil — jamais
  // par profil : un plantage est une affaire de tablette, pas d'enfant.
  // `fiche` : ce qu'on sait de l'appareil et du réglage au démarrage.
  constructor({ stockage, fiche = {}, maintenant = () => Date.now(), id = null }) {
    this.stockage = stockage;
    this.maintenant = maintenant;
    this.id = id || `${maintenant().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    this.doc = { debut: maintenant(), id: this.id, fiche, evenements: [], releves: [], erreurs: 0 };
    this.ouvert = false;
    this.dernierePersistance = 0;
    this.dernierReleve = 0;
    this.douteuses = {};   // id → battement vu à l'ouverture
  }

  lire(cle) { try { return this.stockage.get(cle); } catch { return null; } }
  ecrire(cle, v) { try { this.stockage.set(cle, v); } catch { /* mode privé, ou plein */ } }
  effacer(cle) { try { this.stockage.remove(cle); } catch { /* mode privé */ } }

  sessions() { return lireSessions(this.lire(SESSION_CLE)); }
  // Relire, modifier, écrire : la table est partagée entre les pages ouvertes.
  majSessions(f) {
    const brut = this.sessions(), t = {};
    for (const [id, s] of Object.entries(brut)) if (!s.ancienne) t[id] = s.vu;
    f(t);
    if (Object.keys(t).length) this.ecrire(SESSION_CLE, JSON.stringify(t));
    else this.effacer(SESSION_CLE);
  }

  // Le journal qu'une session a laissé, et son effacement.
  journalDe(id, ancienne) { return this.lire(ancienne ? JOURNAL_CLE : cleJournal(id)); }
  oublier(id, ancienne) {
    if (ancienne) this.effacer(JOURNAL_CLE); else this.effacer(cleJournal(id));
  }

  // Relit ce que les sessions d'avant ont laissé, ouvre la session courante.
  // Rend { rapport, rapports, plantages, etendue, douteuses } : les rapports
  // partent au nuage, le compteur décide de la sûreté. Une session DOUTEUSE
  // (battement récent) ne compte pas encore : `verifierDouteuses` tranche.
  ouvrir() {
    const now = this.maintenant();
    const sessions = this.sessions();
    const { mortes, douteuses } = classerSessions(sessions, now);
    let plantages = Number(this.lire(PLANTAGES_CLE)) || 0;
    const rapports = [];
    let etendue = null;
    for (const id of mortes) {
      const b = bilanPrecedent({ drapeau: true, journalBrut: this.journalDe(id, sessions[id].ancienne), plantages });
      plantages = b.plantages;
      rapports.push(b.rapport);
      if (b.etendue) etendue = b.etendue;
      this.oublier(id, sessions[id].ancienne);
    }
    for (const id of douteuses) this.douteuses[id] = sessions[id].vu;
    this.ecrire(PLANTAGES_CLE, String(plantages));
    if (!mortes.some((id) => sessions[id].ancienne)) this.effacer(JOURNAL_CLE); // l'ancien format, refermé
    this.majSessions((t) => { for (const id of mortes) delete t[id]; t[this.id] = now; });
    this.ouvert = true;
    this.doc.debut = now;
    this.doc.plantagesAvant = plantages;
    if (douteuses.length) this.doc.douteuses = douteuses.length;
    this.persister(true);
    return { rapport: rapports[rapports.length - 1] || null, rapports, plantages, etendue, douteuses };
  }

  // LE BATTEMENT : « je vis encore ». Appelé toutes les BATTEMENT_MS par la
  // page (main.js), et à chaque persistance. Une page cachée n'en a pas.
  battre() {
    if (!this.ouvert) return;
    this.majSessions((t) => { t[this.id] = this.maintenant(); });
  }

  // Les sessions douteuses dont le battement a AVANCÉ vivent : on les oublie.
  // Celles qui ont disparu de la table ont dit au revoir. Celles dont le
  // battement n'a pas bougé sont mortes, si `trancher` : rapport, compteur.
  // Rend { vivantes, rapports }.
  verifierDouteuses(trancher = false) {
    const sessions = this.sessions();
    const vivantes = [], rapports = [];
    for (const [id, vu0] of Object.entries(this.douteuses)) {
      const s = sessions[id];
      if (!s) { delete this.douteuses[id]; continue; }
      if (s.vu > vu0) { vivantes.push(id); delete this.douteuses[id]; continue; }
      if (!trancher) continue;
      const b = bilanPrecedent({ drapeau: true, journalBrut: this.journalDe(id, false), plantages: this.plantages() });
      this.ecrire(PLANTAGES_CLE, String(b.plantages));
      rapports.push(b.rapport);
      this.oublier(id, false);
      this.majSessions((t) => { delete t[id]; });
      delete this.douteuses[id];
    }
    return { vivantes, rapports };
  }

  plantages() { return Number(this.lire(PLANTAGES_CLE)) || 0; }

  // CE QUE LE JEU A RÉGLÉ SE NOTE DANS LA FICHE (v299) : la distance
  // d'affichage, la file, la portée HD, son budget, le palier et d'où il
  // vient, l'étendue choisie. Le journal de l'iPhone de Max disait 1 089
  // morceaux et 55 morceaux HD, et il a fallu le DÉDUIRE : rr 16, donc
  // « Loin ». Une panne de réglage se lit dans le réglage, pas dans ses effets.
  regler(reglage) {
    this.doc.fiche.reglage = reglage;
    this.persister(true);
  }

  noter(type, detail = null) {
    const e = { t: this.secondes(), type };
    if (detail !== null && detail !== undefined) e.d = detail;
    this.doc.evenements.push(e);
    if (this.doc.evenements.length > MAX_EVENEMENTS) this.doc.evenements.shift();
    this.persister();
  }

  // Une erreur se note avec ce qui la distingue — message et premières lignes
  // de pile — jamais plus : c'est ce qui tient dans le document.
  erreur(message, source = '') {
    this.doc.erreurs++;
    this.noter('erreur', `${source ? source + ' : ' : ''}${String(message || '').slice(0, 300)}`);
  }

  // Un relevé de l'état du jeu, au plus toutes les CADENCE_RELEVE_MS.
  relever(obj, force = false) {
    const now = this.maintenant();
    if (!force && now - this.dernierReleve < CADENCE_RELEVE_MS) return false;
    this.dernierReleve = now;
    this.doc.releves.push({ t: this.secondes(), ...obj });
    if (this.doc.releves.length > MAX_RELEVES) this.doc.releves.shift();
    this.persister();
    return true;
  }

  secondes() { return Math.round((this.maintenant() - this.doc.debut) / 100) / 10; }

  persister(force = false) {
    if (!this.ouvert) return;
    const now = this.maintenant();
    if (!force && now - this.dernierePersistance < CADENCE_PERSISTANCE_MS) return;
    this.dernierePersistance = now;
    this.ecrire(cleJournal(this.id), JSON.stringify(borner(this.doc)));
  }

  // Le document tel qu'il part au nuage.
  document(fin) {
    return borner({ ...this.doc, fin, duree: this.secondes() });
  }

  // La session se termine PROPREMENT : au revoir (`fermeture`), relance voulue
  // par le jeu (`mise-a-jour`), ou passage en arrière-plan (`arriere-plan`).
  // Sa ligne quitte la table — et seulement la SIENNE : une autre page ouverte
  // garde la sienne (v425). Le compteur de plantages retombe : une session qui
  // a su dire au revoir n'est pas un plantage, et un plantage ancien ne doit
  // pas compter contre une relance qui a tenu. SAUF `garderCompteur` : une page
  // née cachée, que l'enfant n'a jamais vue, n'a rien prouvé (v425).
  fermer(fin = 'fermeture', { garderCompteur = false } = {}) {
    if (!this.ouvert) return null;
    this.ouvert = false;
    const doc = this.document(fin);
    this.majSessions((t) => { delete t[this.id]; });
    this.effacer(cleJournal(this.id));
    if (!garderCompteur) this.ecrire(PLANTAGES_CLE, '0');
    return doc;
  }

  // Retour au premier plan : la session repart, sa ligne avec elle.
  rouvrir() {
    if (this.ouvert) return;
    this.ouvert = true;
    this.majSessions((t) => { t[this.id] = this.maintenant(); });
    this.noter('premier-plan');
    this.persister(true);
  }
}

// ── CE QUE LA SCÈNE TIENT CÔTÉ CARTE GRAPHIQUE, EN OCTETS (v425) ─────────────
//
// Safari ne donne pas le tas (`tasMo` nul dans tous les relevés de l'iPhone),
// et c'est le COMPTE de textures qui a trahi les 734 Mo de la flotte (v413) —
// mais un compte n'est pas un poids : cinq cents textures de seize pixels
// pèsent moins qu'une de quatre mille. Quand le banc ne peut pas subir la
// panne, on mesure la CAUSE en octets (v236, v296). Une estimation, pas une
// mesure du pilote : une texture vaut largeur × hauteur × 4 octets × 4/3
// (mipmaps) par SOURCE distincte — des clones partagent la leur ; une
// géométrie, les octets de ses attributs et de son index, chaque tableau
// compté une fois (un attribut entrelacé partage le sien). Lu par forme, sans
// importer three : `racines` sont des Object3D (scène, ciel…) ; on parcourt
// TOUT, visible ou non — un objet caché tient sa mémoire.
const PROPRIETES_TEXTURE = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap',
  'bumpMap', 'displacementMap', 'envMap', 'lightMap', 'specularMap', 'clearcoatMap', 'clearcoatNormalMap',
  'clearcoatRoughnessMap', 'sheenColorMap', 'sheenRoughnessMap', 'transmissionMap', 'thicknessMap', 'iridescenceMap',
  'iridescenceThicknessMap', 'specularColorMap', 'specularIntensityMap', 'anisotropyMap', 'gradientMap', 'matcap'];

function octetsImage(img) {
  if (!img) return 0;
  if (Array.isArray(img)) return img.reduce((n, i) => n + octetsImage(i), 0);   // cube : six faces
  const w = img.width || img.videoWidth || 0, h = img.height || img.videoHeight || 0;
  return w * h * (img.depth || 1) * 4;
}

export function estimerMemoire(racines) {
  const geos = new Set(), tableaux = new Set(), sources = new Set(), mats = new Set();
  let octetsGeo = 0, octetsTex = 0;
  const tableau = (a) => {
    const arr = a && (a.array || (a.data && a.data.array));
    if (!arr || tableaux.has(arr)) return;
    tableaux.add(arr);
    octetsGeo += arr.byteLength || 0;
  };
  const texture = (t) => {
    if (!t || !t.isTexture) return;
    const src = t.source || t.image;
    if (!src || sources.has(src)) return;
    sources.add(src);
    const img = t.source ? t.source.data : t.image;
    const mip = t.generateMipmaps === false && !(t.mipmaps && t.mipmaps.length) ? 1 : 4 / 3;
    octetsTex += Math.round(octetsImage(img) * mip);
  };
  const materiau = (m) => {
    if (!m || mats.has(m)) return;
    mats.add(m);
    for (const p of PROPRIETES_TEXTURE) texture(m[p]);
    if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) texture(u.value);
  };
  const visiter = (o) => {
    const g = o.geometry;
    if (g && !geos.has(g)) {
      geos.add(g);
      if (g.attributes) for (const a of Object.values(g.attributes)) tableau(a);
      if (g.morphAttributes) for (const l of Object.values(g.morphAttributes)) for (const a of l) tableau(a);
      tableau(g.index);
    }
    if (o.instanceMatrix) tableau(o.instanceMatrix);
    if (o.instanceColor) tableau(o.instanceColor);
    if (Array.isArray(o.material)) o.material.forEach(materiau); else materiau(o.material);
    if (o.isScene) { texture(o.background); texture(o.environment); }
    const enfants = o.children || [];
    for (let i = 0; i < enfants.length; i++) visiter(enfants[i]);
  };
  for (const r of racines) if (r) visiter(r);
  return { texMo: octetsTex / 1048576, geoMo: octetsGeo / 1048576, sources: sources.size, geometries: geos.size };
}
