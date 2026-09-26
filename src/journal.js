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

export const JOURNAL_CLE = 'web-minecraft-journal-v1';          // le journal de la session en cours
export const SESSION_CLE = 'web-minecraft-session-ouverte-v1';  // « une session est ouverte »
export const PLANTAGES_CLE = 'web-minecraft-plantages-v1';      // plantages consécutifs
export const TABLE_JOURNAL = 'journal_appareil';

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
// Rend le rapport à envoyer (ou null) et le nouveau compteur.
export function bilanPrecedent({ drapeau, journalBrut, plantages = 0 }) {
  if (!drapeau) return { rapport: null, plantages: plantages || 0 };
  let journal = null;
  try { journal = journalBrut ? JSON.parse(journalBrut) : null; } catch { journal = null; }
  const rapport = journal && typeof journal === 'object'
    ? { ...journal, fin: 'plantage' }
    : { fin: 'plantage', sansJournal: true };
  return { rapport, plantages: (plantages || 0) + 1 };
}

// Le disjoncteur : au-delà de `PLANTAGES_SURETE`, un verdict `bas` marqué
// `surete`, dans la forme que `palierRetenu` lit (palier.js).
export function suretePalier(plantages) {
  if (!(plantages >= PLANTAGES_SURETE)) return null;
  return { palier: 'bas', raison: `${plantages} plantages de suite`, surete: true, le: Date.now() };
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

export class Journal {
  // `stockage` : {get, set, remove} sur le stockage BRUT de l'appareil — jamais
  // par profil : un plantage est une affaire de tablette, pas d'enfant.
  // `fiche` : ce qu'on sait de l'appareil et du réglage au démarrage.
  constructor({ stockage, fiche = {}, maintenant = () => Date.now() }) {
    this.stockage = stockage;
    this.maintenant = maintenant;
    this.doc = { debut: maintenant(), fiche, evenements: [], releves: [], erreurs: 0 };
    this.ouvert = false;
    this.dernierePersistance = 0;
    this.dernierReleve = 0;
  }

  lire(cle) { try { return this.stockage.get(cle); } catch { return null; } }
  ecrire(cle, v) { try { this.stockage.set(cle, v); } catch { /* mode privé, ou plein */ } }
  effacer(cle) { try { this.stockage.remove(cle); } catch { /* mode privé */ } }

  // Relit ce que la session d'avant a laissé, pose le drapeau, ouvre la
  // session courante. Rend { rapport, plantages } : le rapport part au nuage,
  // le compteur décide de la sûreté.
  ouvrir() {
    const bilan = bilanPrecedent({
      drapeau: !!this.lire(SESSION_CLE),
      journalBrut: this.lire(JOURNAL_CLE),
      plantages: Number(this.lire(PLANTAGES_CLE)) || 0,
    });
    this.ecrire(PLANTAGES_CLE, String(bilan.plantages));
    this.ecrire(SESSION_CLE, String(this.maintenant()));
    this.ouvert = true;
    this.doc.debut = this.maintenant();
    this.doc.plantagesAvant = bilan.plantages;
    this.persister(true);
    return bilan;
  }

  plantages() { return Number(this.lire(PLANTAGES_CLE)) || 0; }

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
    const now = this.maintenant();
    if (!force && now - this.dernierePersistance < CADENCE_PERSISTANCE_MS) return;
    this.dernierePersistance = now;
    this.ecrire(JOURNAL_CLE, JSON.stringify(borner(this.doc)));
  }

  // Le document tel qu'il part au nuage.
  document(fin) {
    return borner({ ...this.doc, fin, duree: this.secondes() });
  }

  // La session se termine PROPREMENT : au revoir (`fermeture`), ou passage en
  // arrière-plan (`arriere-plan`). Le drapeau tombe, le compteur de plantages
  // aussi — une session qui a su dire au revoir n'est pas un plantage, et un
  // plantage ancien ne doit pas compter contre une relance qui a tenu.
  fermer(fin = 'fermeture') {
    if (!this.ouvert) return null;
    this.ouvert = false;
    const doc = this.document(fin);
    this.effacer(SESSION_CLE);
    this.ecrire(PLANTAGES_CLE, '0');
    this.ecrire(JOURNAL_CLE, JSON.stringify(doc));
    return doc;
  }

  // Retour au premier plan : la session repart, le drapeau avec elle.
  rouvrir() {
    if (this.ouvert) return;
    this.ouvert = true;
    this.ecrire(SESSION_CLE, String(this.maintenant()));
    this.noter('premier-plan');
    this.persister(true);
  }
}
