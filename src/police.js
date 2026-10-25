// LA POLICE, LA RÈGLE (v553). Max : « Ajoute le concept de police dans le
// jeu. Dès lors, tu fais une bêtise ou tu fais un accident, tu fonces dans
// quelqu'un » — la police arrive.
//
// Ce module est PUR (aucun import) : le banc le lit sous node, et
// `patrouille.js` ne fait qu'appliquer ce qu'il décide. Trois choses y vivent.
//
//  1. LE BARÈME. Une bêtise ajoute des points ; les points font des étoiles,
//     comme dans GTA. Ce qui compte : un choc contre une autre voiture, un
//     piéton qu'on a forcé à sauter de côté (on ne renverse jamais personne,
//     v259 — mais foncer sur quelqu'un est une bêtise), un gros choc contre
//     un mur, le mobilier de rue qu'on renverse, et la police elle-même.
//  2. L'OUBLI. Hors de la vue de la police, les points s'effacent peu à peu ;
//     sous ses yeux, ils restent. On s'en sort donc en la semant… ou en
//     s'arrêtant : c'est le CONTRÔLE, et c'est la sortie qu'on veut apprendre
//     à un enfant de sept ans. Rien de violent : le policier descend, dit ce
//     qui s'est passé et quoi faire, et souhaite bonne route.
//  3. LA POURSUITE. La voiture de police suit la PISTE de l'enfant — les
//     positions qu'il a vraiment occupées. C'est ce qui la garde sur la route
//     sans un seul calcul de chemin : là où l'enfant a roulé, elle roule. Elle
//     se cale à quelques longueurs derrière lui et ne le percute jamais.
//
// Toutes les durées sont en temps RÉEL (secondes de montre) : une poursuite,
// un oubli, un contrôle sont des cadences du monde, pas des animations (le
// piège de `dt`, v226).

// --- 1. le barème ----------------------------------------------------------
export const BETISES = Object.freeze({
  voiture: 45,     // une autre voiture heurtée (de la rue, garée, d'un ami)
  pieton: 55,      // une personne qu'on a forcée à sauter de côté
  mur: 20,         // un gros choc contre un mur (force ≥ FORCE_MUR)
  mobilier: 15,    // un réverbère, un feu, une jardinière renversés
  police: 80,      // la police elle-même
});
// un choc contre une voiture plus faible que ceci est un frôlement, pas un
// accident ; contre un mur, seul un vrai choc compte (se cogner en se garant
// n'est pas une bêtise)
export const FORCE_VOITURE = 0.15;
export const FORCE_MUR = 0.6;
// le piéton : on ne compte que si la voiture fonçait vraiment sur lui
export const VITESSE_PIETON = 9;   // blocs/s

// une étoile, deux, trois : la première bêtise sérieuse suffit à appeler une
// voiture ; la seconde unité (la moto) vient à deux étoiles
export const SEUILS = Object.freeze([30, 120, 240]);
export const POINTS_MAX = 320;

export function etoiles(points) {
  let n = 0;
  for (const s of SEUILS) if (points >= s) n++;
  return n;
}

// Une bêtise. `etat` = { points, derniere: { quoi, t } | null } ; rend l'état
// neuf (jamais muté : une fonction pure se rejoue).
export function ajouterBetise(etat, quoi, t) {
  const n = BETISES[quoi] || 0;
  if (!n) return etat;
  return { points: Math.min(POINTS_MAX, (etat.points || 0) + n), derniere: { quoi, t } };
}

// --- 2. l'oubli ------------------------------------------------------------
// Hors de la vue de la police (`vu` faux), passé OUBLI_DELAI secondes après la
// dernière bêtise, les points baissent de OUBLI_VITESSE par seconde. Sous ses
// yeux, rien ne s'oublie. Une étoile s'efface en une quinzaine de secondes.
export const OUBLI_DELAI = 8;
export const OUBLI_VITESSE = 7;
// la police voit l'enfant à moins de VU_POLICE blocs
export const VU_POLICE = 55;

export function oublier(etat, t, dt, vu) {
  if (!(etat.points > 0)) return etat;
  const depuis = etat.derniere ? t - etat.derniere.t : Infinity;
  if (vu || depuis < OUBLI_DELAI) return etat;
  const points = Math.max(0, etat.points - OUBLI_VITESSE * dt);
  return points === etat.points ? etat : { ...etat, points };
}

// --- 3. la poursuite -------------------------------------------------------
// LA PISTE : les positions de l'enfant, un point tous les PAS blocs, avec leur
// abscisse curviligne. Une piste bornée (les points de plus de LONGUEUR_MAX
// blocs derrière tombent), et qui se COUPE quand l'enfant saute (la carte, un
// téléport) : on ne relie jamais deux points qu'aucune route ne relie.
export const PAS_PISTE = 1.5;
export const LONGUEUR_MAX = 600;
export const SAUT = 30;

export class Piste {
  constructor() { this.pts = []; this.coupures = 0; }
  // rend 'saut' quand la piste vient d'être coupée
  ajouter(x, y, z) {
    const d = this.pts.length ? this.pts[this.pts.length - 1] : null;
    if (d) {
      const l = Math.hypot(x - d.x, z - d.z);
      if (l > SAUT) { this.pts = [{ x, y, z, s: d.s + l }]; this.coupures++; return 'saut'; }
      if (l < PAS_PISTE) return null;
      this.pts.push({ x, y, z, s: d.s + l });
    } else this.pts.push({ x, y, z, s: 0 });
    while (this.pts.length > 2 && this.pts[this.pts.length - 1].s - this.pts[1].s > LONGUEUR_MAX) this.pts.shift();
    return null;
  }
  get fin() { return this.pts.length ? this.pts[this.pts.length - 1].s : 0; }
  get debut() { return this.pts.length ? this.pts[0].s : 0; }
  // la position et le CAP (sens de la marche) à l'abscisse s
  positionA(s) {
    const p = this.pts;
    if (!p.length) return null;
    if (s <= p[0].s || p.length === 1) return { x: p[0].x, y: p[0].y, z: p[0].z, ...capEntre(p[0], p[1] || p[0]) };
    let lo = 0, hi = p.length - 1;
    if (s >= p[hi].s) return { x: p[hi].x, y: p[hi].y, z: p[hi].z, ...capEntre(p[hi - 1], p[hi]) };
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m].s <= s) lo = m; else hi = m; }
    const a = p[lo], b = p[hi], u = (s - a.s) / Math.max(1e-9, b.s - a.s);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u, ...capEntre(a, b) };
  }
}
// cap au sens du bestiaire (animals.js) : une bête avance vers
// (sin cap, cos cap) — le `yaw` d'une monture
function capEntre(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  return { cap: Math.hypot(dx, dz) > 1e-6 ? Math.atan2(dx, dz) : null };
}

// LA LOI DE POURSUITE. La police vise un écart ECART blocs derrière l'enfant
// le long de sa piste : plus loin, elle accélère ; trop près, elle ralentit.
// Bornée à `vmax` (une hypercar la sème, une citadine non) et à une
// accélération de voiture — elle ne bondit pas d'un coup.
export const ECART = 10;
// et elle ne s'approche jamais à moins de PLANCHER fois son écart : à sept
// blocs de centre à centre, deux voitures de 4,4 blocs gardent 2,6 blocs entre
// leurs pare-chocs — on la voit dans le rétroviseur, elle ne touche pas.
export const PLANCHER = 0.7;
export const ACCEL_POLICE = 14;   // blocs/s²
export const VMAX_POLICE = 40;    // blocs/s, 144 km/h
export function vitessePoursuite(v, ecart, vEnfant, dt, { cible = ECART, vmax = VMAX_POLICE } = {}) {
  const voulue = Math.max(0, Math.min(vmax, vEnfant + 1.2 * (ecart - cible)));
  // elle freine deux fois plus fort qu'elle n'accélère : arrivée trop vite
  // derrière l'enfant arrêté, elle s'arrête à temps
  const dv = Math.max(-ACCEL_POLICE * 2 * dt, Math.min(ACCEL_POLICE * dt, voulue - v));
  // et à son plancher, elle est à l'arrêt quoi qu'il arrive
  return ecart <= cible * PLANCHER ? 0 : Math.max(0, v + dv);
}

// où la police apparaît : DERRIÈRE l'enfant sur sa piste, hors de sa vue
export const APPARITION = 48;
export const APPARITION_MIN = 18;    // une piste plus courte : on attend
export function abscisseApparition(piste, retard = APPARITION) {
  const s = piste.fin - retard;
  if (piste.fin - piste.debut < APPARITION_MIN) return null;
  return Math.max(piste.debut, s);
}

// LE CONTRÔLE : l'enfant s'est arrêté, la police est à son écart derrière lui,
// depuis ARRET_CONTROLE secondes. Elle s'arrête, le policier descend.
export const ARRET_CONTROLE = 1.2;
export const VITESSE_ARRET = 1.2;   // blocs/s
export const DUREE_CONTROLE = 8;    // le policier parle, puis remonte
export function pretAuControle(ecart, vEnfant, arretDepuis) {
  return ecart < ECART + 4 && vEnfant < VITESSE_ARRET && arretDepuis >= ARRET_CONTROLE;
}

// --- ce que dit le policier --------------------------------------------------
// Une phrase par cause, qui dit ce qui s'est passé et QUOI FAIRE — jamais
// d'accusation fausse (CLAUDE.md : « un message faux est pire que pas de
// message »). Dite à voix haute (la règle des guides, v538), dans la langue
// du profil.
const PHRASES = {
  fr: {
    appel: 'Police ! Arrête-toi sur le côté, s\'il te plaît.',
    voiture: 'Bonjour ! Contrôle de police. Tu as heurté une voiture. Regarde bien devant toi et roule doucement. Bonne route !',
    pieton: 'Bonjour ! Contrôle de police. Tu as foncé vers quelqu\'un. Ralentis quand il y a des piétons. Bonne route !',
    mur: 'Bonjour ! Contrôle de police. Tu as eu un accident. Doucement dans les rues, d\'accord ? Bonne route !',
    mobilier: 'Bonjour ! Contrôle de police. Tu as renversé ce qui est sur le trottoir. Reste sur la route. Bonne route !',
    police: 'Bonjour ! On ne fonce pas dans la police. Doucement, maintenant. Bonne route !',
    defaut: 'Bonjour ! Contrôle de police. Roule doucement et fais attention aux autres. Bonne route !',
  },
  en: {
    appel: 'Police! Please pull over.',
    voiture: 'Hello! Police check. You hit a car. Look ahead and drive slowly. Have a nice trip!',
    pieton: 'Hello! Police check. You drove at someone. Slow down when people are around. Have a nice trip!',
    mur: 'Hello! Police check. You had an accident. Take it easy in the streets, okay? Have a nice trip!',
    mobilier: 'Hello! Police check. You knocked over things on the sidewalk. Stay on the road. Have a nice trip!',
    police: 'Hello! Don\'t crash into the police. Easy now. Have a nice trip!',
    defaut: 'Hello! Police check. Drive slowly and watch out for others. Have a nice trip!',
  },
};
export function phrasePolice(cle, langue = 'fr', alterne = 0) {
  const l = langue === 'en' ? 'en' : langue === 'both' ? (alterne % 2 ? 'en' : 'fr') : 'fr';
  return { texte: PHRASES[l][cle] || PHRASES[l].defaut, langue: l };
}
