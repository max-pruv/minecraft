// Manhattan.
//
// New York n'était qu'une ville générique de plus : un disque de gratte-ciel
// tirés au sort. Or Manhattan est reconnaissable entre mille, et pour des
// raisons précises — c'est une île étroite entre deux fleuves, quadrillée par
// le plan des commissaires de 1811, fendue en diagonale par Broadway, et
// creusée en son milieu par un rectangle de verdure.
//
// Ce que dit le plan de 1811, et qu'on reproduit ici :
//   · douze avenues nord-sud de 30 m de large, numérotées d'est en ouest
//   · 155 rues est-ouest de 18 m, espacées de 60 m — vingt pâtés par mile
//   · quinze rues élargies à 30 m : 14e, 23e, 34e, 42e, 57e, 72e, 79e, 86e,
//     96e, 106e, 116e, 125e, 135e, 145e, 155e
//   · Broadway, chemin bien antérieur, ignore la grille et la traverse ; à
//     chaque avenue coupée naît une place : Union (14e), Madison (23e),
//     Herald (34e), Times (42e), Columbus Circle (59e)
//   · Central Park : de la 59e à la 110e, de la 5e Avenue à Central Park West
//
// Deux libertés assumées. D'abord l'échelle : l'île fait 21 km, on en garde
// les neuf premiers — de la pointe de Battery au haut du parc — sur cent
// soixante-seize blocs. Ensuite l'orientation : la vraie grille est inclinée
// de 29°, ce qui, en blocs, donnerait des rues en escalier illisibles ; la
// nôtre est droite. Tout le reste — l'ordre des avenues, la place de chaque
// monument, la silhouette qui monte à Midtown, redescend au Village et remonte
// à Wall Street — est fidèle.

import { BLOCK, CITY_BLOCK, DECOR_START } from './blocks.js';

const uni = (couleur) => DECOR_START + couleur * 10;

const BRIQUE_ROUGE = uni(18);
const PIERRE_CLAIRE = uni(27);
const ACIER = uni(24);
const CUIVRE = CITY_BLOCK.COPPER;
const VERRE = BLOCK.GLASS;
const VERRE_BLEU = CITY_BLOCK.CURTAIN;
const GRANIT = CITY_BLOCK.GRANITE;
const BROWNSTONE = CITY_BLOCK.BROWNSTONE;
const BITUME = CITY_BLOCK.ASPHALT;
const TROTTOIR = CITY_BLOCK.SIDEWALK;
const LIGNE = CITY_BLOCK.ROADLINE;
const PASSAGE = CITY_BLOCK.CROSSWALK;
const JAUNE_TAXI = uni(2);
const ARDOISE = uni(23);

// Le centre de l'île, qui reste celui de l'ancienne ville : les mondes déjà
// sauvegardés gardent ainsi leurs constructions au même endroit.
export const NY = { x: 295, z: -110 };

export const NY_LONG = 130;   // demi-longueur nord-sud, en blocs
export const NY_LARGE = 26;   // demi-largeur maximale
export const NY_EAU = 26;     // largeur des fleuves de part et d'autre
export const NY_SOL = 33;     // l'île est plate, comme la vraie sous ses rues

// L'île fait 21,6 km de long pour 3,7 km au plus large : **presque six fois
// plus longue que large**. C'est la première chose qu'on voit sur un plan, et
// c'est ce que le premier jet ratait — une amande deux fois et demie plus
// longue que large ne ressemble à rien. Deux cent quarante blocs sur quarante-
// huit rétablissent la proportion.
//
// v = 110 à la pointe de Battery, v = −130 à Inwood : deux cent vingt rues sur
// deux cent quarante blocs, soit 1,09 bloc par numéro de rue.
const RUE_PAR_BLOC = 240 / 220;
export const vDeRue = (n) => Math.round(110 - n * RUE_PAR_BLOC);
export const rueDeV = (v) => Math.round((110 - v) / RUE_PAR_BLOC);

// Une rue tous les six blocs : c'est le plus petit pas qui laisse de la place
// pour bâtir. À la vraie échelle — 18 m de chaussée pour 60 m d'entraxe — un
// pâté de maisons ne ferait qu'un bloc de profondeur, et l'île entière ne
// serait que du bitume.
const RUE_PAS = 6;
const estRue = (v) => ((v % RUE_PAS) + RUE_PAS) % RUE_PAS === 0;
// Les quinze rues élargies du plan de 1811, ramenées à notre grille.
const LARGES = new Set([14, 23, 34, 42, 57, 72, 79, 86, 96, 106, 116, 125, 135, 145, 155]
  .map((n) => Math.round(vDeRue(n) / RUE_PAS) * RUE_PAS));

// Les avenues, d'est en ouest, resserrées pour tenir dans une île enfin
// étroite. Leurs écarts relatifs restent ceux de la vraie ville : 280 m entre
// la 5e et la 6e, 120 m seulement entre la 5e, Madison et Park — d'où des
// pâtés quatre fois plus longs d'est en ouest que du nord au sud.
export const AVENUES = [
  { u: 22, nom: '1re Avenue', l: 0 },
  { u: 18, nom: '2e Avenue', l: 0 },
  { u: 14, nom: '3e Avenue', l: 0 },
  { u: 11, nom: 'Lexington Avenue', l: 0 },
  { u: 8, nom: 'Park Avenue', l: 1 },
  { u: 4, nom: 'Madison Avenue', l: 0 },
  { u: 0, nom: '5e Avenue', l: 0 },     // la colonne vertébrale, bord est du parc
  { u: -6, nom: '6e Avenue', l: 0 },
  { u: -11, nom: '7e Avenue', l: 0 },
  { u: -16, nom: '8e Avenue', l: 0 },   // Central Park West au droit du parc
  { u: -20, nom: '9e Avenue', l: 0 },   // Columbus au-dessus de la 59e
  { u: -24, nom: 'West Side Highway', l: 0 },
];

// Central Park : de la 59e à la 110e, de la 5e Avenue à Central Park West.
// Cinquante-six blocs sur seize — le vrai parc fait 4 km sur 800 m, et occupe
// un cinquième de la longueur de l'île. C'est cette proportion-là qu'on
// reconnaît, pas un carré de verdure au milieu.
export const PARC = { u0: -16, u1: 0, v0: vDeRue(110), v1: vDeRue(59) };
const dansParc = (u, v) => u > PARC.u0 && u < PARC.u1 && v > PARC.v0 && v < PARC.v1;
// La même question, posée en coordonnées du monde : le générateur d'arbres en
// a besoin pour laisser repousser la forêt du parc, et elle seule.
export const dansCentralPark = (x, z) => dansParc(x - NY.x, z - NY.z);

// Broadway. Chemin indien devenu route de poste, il est antérieur à la grille
// et l'ignore : à chaque avenue qu'il croise naît une place.
const BROADWAY = [
  { v: 108, u: 1 }, { v: vDeRue(23), u: 0 }, { v: vDeRue(34), u: -6 },
  { v: vDeRue(42), u: -11 }, { v: vDeRue(59), u: -16 }, { v: vDeRue(110), u: -19 },
  { v: -130, u: -12 },
];
export function uBroadway(v) {
  if (v > BROADWAY[0].v || v < BROADWAY[BROADWAY.length - 1].v) return null;
  for (let i = 0; i < BROADWAY.length - 1; i++) {
    const a = BROADWAY[i], b = BROADWAY[i + 1];
    if (v <= a.v && v >= b.v) return a.u + (b.u - a.u) * ((a.v - v) / (a.v - b.v));
  }
  return null;
}

// Les places nées du croisement de Broadway et d'une avenue.
export const PLACES_NY = [
  { nom: 'Union Square', u: 1, v: vDeRue(14), r: 4 },
  { nom: 'Madison Square', u: 0, v: vDeRue(23), r: 4 },
  { nom: 'Herald Square', u: -6, v: vDeRue(34), r: 4 },
  { nom: 'Times Square', u: -11, v: vDeRue(42), r: 5 },
  { nom: 'Columbus Circle', u: -16, v: vDeRue(59), r: 5 },
];

// Les quartiers, du sud au nord. Ce sont eux qu'on lit sur un plan avant les
// noms de rue — et ce sont eux qui disent que Manhattan n'est pas une ville
// uniforme mais une file de villages soudés.
// En coordonnées du monde, prêtes pour la carte : chaque quartier est aussi une
// destination, parce qu'un enfant qui lit « SoHo » a envie d'y aller.
export const quartiersDuMonde = () => QUARTIERS.map((q) => ({
  name: q.nom, x: NY.x + q.u, z: NY.z + q.v, r: 8,
}));

export const QUARTIERS = [
  { nom: 'Financial District', u: 0, v: vDeRue(4) },
  { nom: 'TriBeCa', u: -9, v: vDeRue(11) },
  { nom: 'Chinatown', u: 9, v: vDeRue(12) },
  { nom: 'SoHo', u: -3, v: vDeRue(18) },
  { nom: 'Lower East Side', u: 14, v: vDeRue(19) },
  { nom: 'Greenwich Village', u: -8, v: vDeRue(25) },
  { nom: 'East Village', u: 10, v: vDeRue(26) },
  { nom: 'Chelsea', u: -12, v: vDeRue(35) },
  { nom: 'Gramercy', u: 6, v: vDeRue(34) },
  { nom: 'Midtown', u: -4, v: vDeRue(48) },
  { nom: 'Upper West Side', u: -20, v: vDeRue(75) },
  { nom: 'Upper East Side', u: 12, v: vDeRue(75) },
  { nom: 'Harlem', u: 2, v: vDeRue(122) },
  { nom: 'Washington Heights', u: -6, v: vDeRue(175) },
  { nom: 'Inwood', u: -8, v: vDeRue(210) },
];

// La silhouette. Le côté Hudson est presque rectiligne — c'est lui qui a donné
// son alignement à la grille. Le côté East River s'évase entre la 14e et la
// 96e : c'est le ventre de l'île. Puis tout se resserre vers Inwood, et la
// pointe de Battery s'effile.
const RIVE_OUEST = [
  { v: 110, l: 2 }, { v: 102, l: 8 }, { v: 95, l: 16 }, { v: 85, l: 20 },
  { v: 73, l: 22 }, { v: 46, l: 24 }, { v: 16, l: 24 }, { v: -10, l: 23 },
  // Harlem reste large jusqu'à la 155e : c'est seulement au-dessus que l'île
  // se réduit à la crête de Washington Heights, puis à la pointe d'Inwood.
  { v: -40, l: 22 }, { v: -70, l: 18 }, { v: -100, l: 11 }, { v: -130, l: 3 },
];
const RIVE_EST = [
  { v: 110, l: 2 }, { v: 104, l: 9 }, { v: 97, l: 17 }, { v: 92, l: 22 },
  { v: 85, l: 23 }, { v: 73, l: 22 }, { v: 64, l: 21 }, { v: 46, l: 22 },
  { v: 24, l: 24 }, { v: 5, l: 24 }, { v: -10, l: 21 }, { v: -40, l: 18 },
  { v: -70, l: 14 }, { v: -100, l: 8 }, { v: -130, l: 2 },
];
function interp(table, v) {
  if (v >= table[0].v || v <= table[table.length - 1].v) return 0;
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i], b = table[i + 1];
    if (v <= a.v && v >= b.v) return a.l + (b.l - a.l) * ((a.v - v) / (a.v - b.v));
  }
  return 0;
}
export const bordOuest = (v) => -interp(RIVE_OUEST, v);
export const bordEst = (v) => interp(RIVE_EST, v);
export const demiLargeur = (v) => (bordEst(v) - bordOuest(v)) / 2;

// Roosevelt Island : le long ruban posé dans l'East River, de la 46e à la 86e.
// Deux blocs de large, et pourtant personne ne confond un plan de Manhattan
// avec ou sans lui.
// Wall Street, Battery Park et Liberty Island : le bas de l'île, celui dont on
// connaît les noms avant d'y être allé.
export const WALL = { v: 100, u0: -8, u1: 10 };
export const BATTERY = { v: 106 };
export const LIBERTE = { u: -22, v: 122, r: 7 };
export const PAVE_SOMBRE = CITY_BLOCK.GRANITE;

export const ROOSEVELT = { u: 27, v0: vDeRue(86), v1: vDeRue(46), l: 1.6 };
export const surRoosevelt = (x, z) => {
  const u = x - NY.x, v = z - NY.z;
  return v > ROOSEVELT.v0 && v < ROOSEVELT.v1 && Math.abs(u - ROOSEVELT.u) <= ROOSEVELT.l;
};

// --- ce que le monde demande -------------------------------------------------

// La zone d'influence : l'île ET ses deux fleuves. Au-delà, le terrain reprend
// ses droits. Un rectangle plutôt qu'un disque — une île longue de cent
// soixante-seize blocs ne tient dans aucun cercle raisonnable.
export function zoneManhattan(x, z) {
  const u = x - NY.x, v = z - NY.z;
  return Math.abs(v) < NY_LONG + 18 && Math.abs(u) < NY_LARGE + NY_EAU;
}

export const surTerre = (x, z) => {
  const u = x - NY.x, v = z - NY.z;
  const e = bordEst(v);
  if (e > 0 && u > bordOuest(v) && u < e) return true;
  return surRoosevelt(x, z);
};

// Distance jusqu'à la rive la plus proche : négative sur l'île, positive dans
// le fleuve. Elle sert au terrain comme aux quais.
function versRive(u, v) {
  if (v > ROOSEVELT.v0 && v < ROOSEVELT.v1 && Math.abs(u - ROOSEVELT.u) <= ROOSEVELT.l) {
    return -(ROOSEVELT.l - Math.abs(u - ROOSEVELT.u));
  }
  const o = bordOuest(v), e = bordEst(v);
  if (e <= 0) return Math.abs(u);
  if (u < o) return o - u;
  if (u > e) return u - e;
  return -Math.min(u - o, e - u);
}

// Hauteur du terrain. L'île est une table plate ; de part et d'autre, le fond
// des fleuves. Entre les deux, une berge courte : à New York on passe du quai
// à l'eau profonde en quelques mètres.
export function hauteurManhattan(x, z, h) {
  const u = x - NY.x, v = z - NY.z;
  if (Math.abs(v) >= NY_LONG + 18 || Math.abs(u) >= NY_LARGE + NY_EAU) return h;

  const bord = versRive(u, v);   // < 0 sur l'île, > 0 dans le fleuve
  // fondu vers le terrain d'origine sur les derniers blocs de la zone
  const marge = Math.min(
    1,
    (NY_LONG + 18 - Math.abs(v)) / 14,
    (NY_LARGE + NY_EAU - Math.abs(u)) / 14,
  );
  if (marge <= 0) return h;

  let cible;
  if (bord < 0) cible = NY_SOL;                          // la ville
  else if (bord < 3) cible = NY_SOL - 1 - bord;          // le quai qui descend
  else cible = Math.max(18, 24 - Math.min(6, bord - 3)); // le lit du fleuve
  return h * (1 - marge) + cible * marge;
}

// --- la surface : rues, trottoirs, parc, places ------------------------------

// Ce qu'il faut poser au niveau du sol en un point donné, ou null si c'est un
// terrain à bâtir. Appelé une fois par colonne, comme la trame des autres
// villes : c'est ce qui permet d'habiller une île entière sans jamais
// fabriquer les blocs qu'on ne regarde pas.
export function solManhattan(x, z) {
  if (!surTerre(x, z)) return null;
  const u = x - NY.x, v = z - NY.z;

  // Roosevelt Island : une allée centrale, des pelouses, rien de la grille.
  if (surRoosevelt(x, z)) return Math.abs(u - ROOSEVELT.u) < 0.6 ? TROTTOIR : BLOCK.GRASS;

  // Central Park : de l'herbe, ses pièces d'eau et ses allées.
  if (dansParc(u, v)) return solDuParc(u, v);

  // Les places : un dallage clair, reconnaissable de loin.
  for (const p of PLACES_NY) {
    if (Math.hypot(u - p.u, v - p.v) < p.r) return PIERRE_CLAIRE;
  }

  // Broadway, la diagonale. Elle passe AVANT la grille : là où elle croise une
  // avenue, c'est elle qui donne son dessin à la chaussée.
  const ub = uBroadway(v);
  if (ub !== null && Math.abs(u - ub) <= 2) {
    return Math.abs(u - ub) > 1.5 ? TROTTOIR : (Math.round(v) % 4 < 2 ? LIGNE : BITUME);
  }

  // Les avenues.
  for (const a of AVENUES) {
    const d = Math.abs(u - a.u);
    if (d > a.l) continue;
    if (estRue(v)) return PASSAGE;                              // le carrefour
    if (a.nom === 'Park Avenue' && d === 0) return BLOCK.LEAVES; // le terre-plein planté
    return (v & 7) < 4 ? LIGNE : BITUME;
  }

  // Les rues. La grille de 1811 s'arrête à la 14e : au sud, les rues suivent
  // encore les chemins hollandais et les anciennes limites de fermes. Le
  // premier jet plaçait cette frontière à la 1re Rue — soit un bloc — et tout
  // le bas de l'île se retrouvait quadrillé au cordeau, ce qu'il n'est pas.
  if (v <= vDeRue(14)) {
    if (estRue(v)) return (u & 7) < 4 ? LIGNE : BITUME;
    if (LARGES.has(v - 1) || LARGES.has(v + 1)) return BITUME;  // les quinze rues élargies
    return null;   // le pâté de maisons
  }
  return solVieilleVille(u, v);
}

// La ville d'avant le plan de 1811 : Greenwich Village, SoHo, Chinatown, la
// pointe de la finance. Pas de grille — des rues qui tournent, héritées des
// chemins hollandais. On les tire d'un bruit régulier plutôt que du hasard :
// il faut qu'elles soient les mêmes à chaque visite.
function solVieilleVille(u, v) {
  // Battery Park : la pointe verte de l'île, d'où partent les bateaux.
  if (v > BATTERY.v) return Math.abs(Math.sin(u * 0.5 + v * 0.3)) < 0.15 ? PIERRE_CLAIRE : BLOCK.GRASS;

  // Wall Street. Elle porte le nom du mur que les Hollandais avaient dressé
  // là, à la limite nord de leur ville : une saignée droite d'un fleuve à
  // l'autre, étroite, au milieu des tours.
  if (Math.abs(v - WALL.v) <= 0.5 && u > WALL.u0 && u < WALL.u1) return PAVE_SOMBRE;

  const a = Math.sin(u * 0.31 + v * 0.11) + Math.sin(v * 0.27 - u * 0.07);
  const b = Math.sin(u * 0.09 - v * 0.33) + Math.sin(v * 0.19 + u * 0.23);
  const rue = Math.min(Math.abs(a), Math.abs(b));
  if (rue < 0.18) return BITUME;
  if (rue < 0.30) return TROTTOIR;
  return null;
}

// Central Park vu du sol. Les pièces retenues sont celles qu'un enfant repère
// sur un plan : le réservoir, la grande pelouse, le lac, l'allée du Mall, le
// pré aux moutons, l'étang du sud-est et le Harlem Meer, tout au nord.
// Les pièces d'eau du parc, à leurs vraies proportions. Le réservoir occupe
// environ la moitié de la largeur du parc et le quart de sa longueur ; dessiné
// trop grand — l'erreur du premier jet —, il transformait Central Park en lac.
function solDuParc(u, v) {
  const cu = (PARC.u0 + PARC.u1) / 2;
  const eau = (du, dv, ru, rv) => ((u - du) / ru) ** 2 + ((v - dv) / rv) ** 2 < 1;
  // Chaque pièce d'eau à son numéro de rue, comme sur le plan.
  if (eau(cu, vDeRue(91), 4.5, 5.5)) return BLOCK.WATER;   // le réservoir, 86e-96e
  if (eau(cu - 1, vDeRue(75), 3.5, 2.5)) return BLOCK.WATER; // le lac, vers la 74e
  if (eau(cu + 3, vDeRue(107), 2.5, 1.8)) return BLOCK.WATER; // Harlem Meer, angle nord-est
  if (eau(cu - 4, vDeRue(103), 2, 1.5)) return BLOCK.WATER;   // The Pool, angle nord-ouest
  if (eau(cu + 5, vDeRue(61), 2, 1.4)) return BLOCK.WATER;    // The Pond, angle sud-est
  // le Mall, la seule allée droite du parc, plein sud
  if (Math.abs(u - (cu + 2)) < 0.6 && v > vDeRue(72) && v < vDeRue(66)) return CITY_BLOCK.SIDEWALK;
  // les allées sinueuses ; la grande pelouse et le pré aux moutons restent nus
  if (Math.abs(Math.sin(u * 0.22 + v * 0.09)) < 0.04) return CITY_BLOCK.SIDEWALK;
  return BLOCK.GRASS;
}

// --- les immeubles, colonne par colonne ---------------------------------------
//
// Les autres villes posent leurs immeubles lot par lot, sur une grille carrée
// indépendante du dessin des rues. Ici c'est impossible : les avenues ne sont
// pas également espacées, et Broadway coupe la grille en biais. Un pâté dessiné
// sur sa propre trame se serait retrouvé à cheval sur une chaussée.
//
// On procède donc comme pour le sol : une colonne, une décision. Les bords du
// pâté se déduisent des mêmes rues que celles qu'on vient de tracer, et tout
// tombe juste par construction.

// La silhouette de Manhattan n'est pas uniforme, et c'est ce qui la rend
// reconnaissable : deux massifs de tours — Midtown et la pointe financière —
// séparés par un creux au Village, parce que le socle rocheux y plonge.
export function quartier(v) {
  if (v >= 62) return 'finance';
  if (v >= 33) return 'village';
  if (v >= 14) return 'chelsea';
  if (v >= -30) return 'midtown';
  return 'uptown';
}

const PALETTES = {
  finance: [GRANIT, VERRE_BLEU, ACIER, PIERRE_CLAIRE],
  village: [BRIQUE_ROUGE, BROWNSTONE, BRIQUE_ROUGE, PIERRE_CLAIRE],
  chelsea: [BRIQUE_ROUGE, PIERRE_CLAIRE, GRANIT],
  midtown: [VERRE_BLEU, ACIER, GRANIT, PIERRE_CLAIRE],
  uptown: [BROWNSTONE, BRIQUE_ROUGE, PIERRE_CLAIRE],
};

// Hauteur d'un immeuble selon son quartier, en blocs. Les bornes viennent de la
// vraie ville : une trentaine d'étages courants à Midtown, cinq à SoHo.
function hauteurQuartier(q, t) {
  switch (q) {
    case 'finance': return 16 + Math.floor(t * 26);
    case 'midtown': return 14 + Math.floor(t * 26);
    case 'chelsea': return 8 + Math.floor(t * 7);
    case 'village': return 5 + Math.floor(t * 4);
    default: return 7 + Math.floor(t * 8);
  }
}

// Un tirage stable : même pâté, même immeuble, à chaque visite.
function tirage(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Les bornes du pâté qui contient ce point : entre deux rues au nord et au sud,
// entre deux avenues à l'est et à l'ouest.
function lotDe(u, v) {
  const kv = Math.floor(v / RUE_PAS);
  const v0 = kv * RUE_PAS + 1, v1 = kv * RUE_PAS + RUE_PAS - 1;
  // les avenues sont rangées d'est en ouest : on cherche celles qui encadrent u
  let est = null, ouest = null;
  for (const a of AVENUES) {
    if (a.u >= u && (est === null || a.u < est.u)) est = a;
    if (a.u <= u && (ouest === null || a.u > ouest.u)) ouest = a;
  }
  const u1 = est ? est.u - est.l - 1 : Math.floor(bordEst(v)) - 1;
  const u0 = ouest ? ouest.u + ouest.l + 1 : Math.ceil(bordOuest(v)) + 1;
  return { u0, u1, v0, v1, kv, ku: ouest ? ouest.u : 99 };
}

// Un lot est constructible s'il n'est ni rue, ni place, ni parc, ni fleuve.
export function lotConstructible(x, z) {
  if (!surTerre(x, z)) return false;
  const u = x - NY.x, v = z - NY.z;
  if (dansParc(u, v)) return false;
  if (versRive(u, v) >= -1) return false;
  // les monuments ont leur parvis : rien ne se bâtit dessus
  if (dansMonument(u, v)) return false;
  return solManhattan(x, z) === null;
}

// De combien de blocs cette colonne est-elle à l'intérieur de son pâté ? Zéro
// sur la façade. C'est ce nombre qui décide des retraits en hauteur : la loi de
// zonage de 1916 imposait aux tours de se rétrécir en montant, pour que le jour
// atteigne encore la rue. C'est de là que vient la silhouette en gradins des
// gratte-ciel d'avant-guerre.
function enfoncement(x, z, lot) {
  const u = x - NY.x, v = z - NY.z;
  const d = Math.min(u - lot.u0, lot.u1 - u, v - lot.v0, lot.v1 - v);
  if (d <= 0) return 0;
  // Broadway et les places rognent le pâté en biais. Un seul anneau de voisins
  // suffit à savoir qu'on est en façade — et c'est la seule chose dont le
  // rez-de-chaussée ait besoin. Sonder plus loin coûtait douze appels par
  // colonne, soit trois millions par morceau de monde : l'île se chargeait
  // par bribes sous les yeux de l'enfant.
  if (!lotConstructible(x + 1, z) || !lotConstructible(x - 1, z)
    || !lotConstructible(x, z + 1) || !lotConstructible(x, z - 1)) return 0;
  return d;
}

// Bâtit la colonne. `poser(dy, id)` place un bloc dy au-dessus du sol.
// Renvoie false s'il n'y a rien à bâtir ici.
export function batirColonne(x, z, poser, solDejaNul = false) {
  if (!solDejaNul && !lotConstructible(x, z)) return false;
  if (solDejaNul && (!surTerre(x, z) || versRive(x - NY.x, z - NY.z) >= -1)) return false;
  const u = x - NY.x, v = z - NY.z;
  const lot = lotDe(u, v);
  const q = quartier(v);
  const t = tirage(lot.kv, lot.ku, 811);
  let bh = hauteurQuartier(q, t);
  const mur = PALETTES[q][Math.floor(tirage(lot.kv, lot.ku, 812) * PALETTES[q].length) % PALETTES[q].length];
  const d = enfoncement(x, z, lot);

  // Un immeuble ne peut pas être plus haut que son terrain ne le porte : une
  // tour de quarante blocs sur une emprise de trois, c'est un crayon, pas un
  // gratte-ciel. La vraie ville obéit à la même règle — les plus hautes tours
  // occupent les plus grands terrains.
  const emprise = Math.min(lot.u1 - lot.u0, lot.v1 - lot.v0) + 1;
  const bhMax = 6 + 5 * emprise;

  // Les gradins : deux retraits, plus haut on monte.
  bh = Math.min(bh, bhMax);
  const t1 = Math.floor(bh * 0.55), t2 = Math.floor(bh * 0.8);
  const retraitA = (y) => (bh < 14 ? 0 : y < t1 ? 0 : y < t2 ? 1 : 2);

  // À chaque niveau, l'immeuble occupe le rectangle du pâté rentré de r blocs.
  // La colonne existe tant que son enfoncement le permet ; elle est en façade
  // quand les deux coïncident. Là où elle s'arrête commence une terrasse — et
  // c'est là que va la dalle. La première version posait cette dalle deux
  // niveaux au-dessus du dernier bloc posé : au-dessus des colonnes creuses,
  // elle flottait toute seule en plein ciel.
  let toit = bh;
  for (let y = 0; y < bh; y++) {
    const r = retraitA(y);
    if (d < r) { toit = y; break; }
    if (d > r) { if (y === 0) poser(0, BLOCK.PLANK); continue; }   // l'intérieur
    // Une fenêtre une rangée sur trois, une colonne sur deux. La première
    // version en mettait partout : les tours devenaient des cages de verre
    // transparentes, et l'on voyait le ciel au travers de Midtown.
    const uu = (Math.abs(u - lot.u0) === r || Math.abs(u - lot.u1) === r) ? v : u;
    const fenetre = y > 0 && y % 3 !== 0 && (uu & 1) === 1;
    poser(y + 1, fenetre ? VERRE : mur);
  }
  poser(toit + 1, GRANIT);

  // Le château d'eau en bois sur le toit : la signature des immeubles bas de
  // la ville, et ce qu'on remarque en premier en levant les yeux.
  if (bh < 16 && toit === bh && d === 1 && tirage(lot.kv, lot.ku, 813) < 0.4
    && (u - lot.u0) === 1 && (v - lot.v0) === 1) {
    for (let k = 2; k <= 4; k++) poser(toit + k, BLOCK.DARKPLANK);
  }
  return true;
}

// --- ce que la carte doit peindre ---------------------------------------------

// Vue du ciel et de loin, aucun bloc n'est en mémoire : la carte doit pouvoir
// dessiner Manhattan à partir des seules règles ci-dessus. Sans cela, l'île
// n'était qu'un rectangle gris uniforme, Central Park compris.
const VERT_PARC = [86, 148, 70];
const VERT_PELOUSE = [112, 174, 90];
const EAU_PARC = [72, 132, 196];
const GRIS_RUE = [64, 66, 72];
const BEIGE_PLACE = [212, 204, 188];

export function couleurCarteManhattan(x, z) {
  if (!surTerre(x, z)) return null;         // au fleuve de décider
  const u = x - NY.x, v = z - NY.z;
  const sol = solManhattan(x, z);
  if (dansParc(u, v)) {
    if (sol === BLOCK.WATER) return EAU_PARC;
    if (sol === CITY_BLOCK.SIDEWALK) return BEIGE_PLACE;
    return Math.abs(Math.sin(u * 0.3 + v * 0.17)) > 0.5 ? VERT_PARC : VERT_PELOUSE;
  }
  if (sol === PIERRE_CLAIRE) return BEIGE_PLACE;
  if (sol !== null) return GRIS_RUE;        // rue, avenue, trottoir, Broadway
  // un pâté de maisons : la teinte dit la hauteur, donc le quartier
  const lot = lotDe(u, v);
  const q = quartier(v);
  const t = tirage(lot.kv, lot.ku, 811);
  const bh = hauteurQuartier(q, t);
  const clair = Math.min(1, bh / 40);
  return [148 + clair * 60, 146 + clair * 58, 144 + clair * 62];
}

// --- les monuments -------------------------------------------------------------
//
// Chacun est à sa vraie adresse, ramenée à notre grille. Ils sont déclarés ici
// plutôt que dans world.js pour une raison simple : le générateur d'immeubles
// doit connaître leur emprise, sinon il bâtirait par-dessus.

// Chacun à son adresse, exprimée en numéro de rue : le jour où l'échelle de
// l'île change, ils suivent d'eux-mêmes au lieu de se retrouver à la mer.
export const MONUMENTS = [
  { nom: 'Empire State Building', u: 1, v: vDeRue(34), box: 5 },   // 350 Cinquième Avenue
  { nom: 'Chrysler Building', u: 11, v: vDeRue(42), box: 4 },      // 42e et Lexington
  { nom: 'Grand Central Terminal', u: 8, v: vDeRue(43), box: 4 },  // 42e et Park
  { nom: 'Flatiron Building', u: 1, v: vDeRue(23), box: 4 },       // 23e, Broadway et la 5e
  { nom: 'Rockefeller Center', u: -4, v: vDeRue(50), box: 4 },     // entre la 5e et la 6e
  { nom: 'One World Trade Center', u: -7, v: vDeRue(9), box: 5 },  // Financial District
  { nom: 'Times Square', u: -11, v: vDeRue(42), box: 11 },        // la place et ses écrans
  { nom: 'Bourse de New York', u: 3, v: WALL.v + 3, box: 7 },     // Wall Street et Broad
  { nom: 'Trinity Church', u: -6, v: WALL.v + 4, box: 7 },        // au bout de Wall Street
];

const dansMonument = (u, v) =>
  MONUMENTS.some((m) => Math.abs(u - m.u) <= m.box + 1 && Math.abs(v - m.v) <= m.box + 1);

// Une tour à gradins : le corps monte en se rétrécissant par paliers. C'est le
// dessin qu'imposait le zonage de 1916, et celui de tous les gratte-ciel
// d'avant-guerre.
function tourGradins(set, etages, mur, verre) {
  let y = 0;
  for (const [demi, haut] of etages) {
    for (; y < haut; y++) {
      for (let dx = -demi; dx <= demi; dx++) {
        for (let dz = -demi; dz <= demi; dz++) {
          const bord = Math.abs(dx) === demi || Math.abs(dz) === demi;
          if (!bord) continue;
          const uu = Math.abs(dx) === demi ? dz : dx;
          const fen = y % 3 !== 0 && (uu & 1) === 1;
          set(dx, y, dz, fen ? verre : mur);
        }
      }
    }
    for (let dx = -demi; dx <= demi; dx++) {
      for (let dz = -demi; dz <= demi; dz++) set(dx, y, dz, GRANIT);
    }
    y++;
  }
  return y;
}

// L'Empire State : 102 étages, une base large, deux retraits, et le mât
// d'amarrage des dirigeables qui lui a valu sa flèche.
export function buildEmpireState(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  let y = tourGradins(set, [[6, 4], [4, 22], [3, 34]], PIERRE_CLAIRE, VERRE);
  for (; y < 40; y++) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) === 2 || Math.abs(dz) === 2) set(dx, y, dz, PIERRE_CLAIRE);
      }
    }
  }
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) set(dx, y, dz, GRANIT);
  for (let k = 1; k <= 6; k++) set(0, y + k, 0, ACIER);       // le mât d'amarrage
  set(0, y + 7, 0, VERRE);                                    // le phare, tout en haut
}

// Le Chrysler : sa couronne d'arcs en acier inoxydable, et sa longue aiguille.
export function buildChrysler(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  let y = tourGradins(set, [[4, 6], [3, 24]], BRIQUE_ROUGE, VERRE);
  // la couronne : des arcs de plus en plus petits, en métal clair
  for (let k = 0; k < 5; k++) {
    const demi = 3 - Math.floor(k * 0.6);
    for (let dx = -demi; dx <= demi; dx++) {
      for (let dz = -demi; dz <= demi; dz++) {
        if (Math.abs(dx) === demi || Math.abs(dz) === demi) set(dx, y, dz, ACIER);
      }
    }
    // les fenêtres triangulaires de la couronne
    if (k < 4) { set(0, y, -demi, VERRE); set(0, y, demi, VERRE); }
    y += 2;
  }
  for (let k = 0; k < 8; k++) set(0, y + k, 0, ACIER);        // l'aiguille
}

// Le Flatiron : un fer à repasser, coincé dans l'angle aigu que Broadway
// découpe en croisant la 5e Avenue. Sa forme vient entièrement de là.
export function buildFlatiron(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const H = 16;
  for (let dz = -5; dz <= 5; dz++) {
    // le triangle s'affine vers le nord : c'est la pointe qu'on photographie
    const demi = Math.max(0, Math.round((dz + 5) / 3));
    for (let dx = -demi; dx <= demi; dx++) {
      const bord = Math.abs(dx) === demi || dz === -5 || dz === 5;
      for (let y = 0; y < H; y++) {
        if (!bord) continue;
        const fen = y % 3 !== 0 && ((dx + dz) & 1) === 1;
        set(dx, y, dz, fen ? VERRE : PIERRE_CLAIRE);
      }
      set(dx, H, dz, CUIVRE);   // la corniche de cuivre patiné
    }
  }
}

// One World Trade Center : un carré qui se change en octogone en montant, puis
// se referme en un carré tourné de quarante-cinq degrés. Et sa flèche, qui
// porte l'immeuble à 1776 pieds — l'année de l'indépendance.
export function buildOneWTC(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const H = 46;
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const demi = 5 - Math.round(t * 2);
    for (let dx = -demi; dx <= demi; dx++) {
      for (let dz = -demi; dz <= demi; dz++) {
        const bord = Math.abs(dx) === demi || Math.abs(dz) === demi;
        if (!bord) continue;
        // les angles se biseautent à mesure qu'on monte : le carré devient octogone
        const coin = Math.abs(dx) === demi && Math.abs(dz) === demi;
        if (coin && t > 0.2 && ((y + dx + dz) & 1) === 0) continue;
        set(dx, y, dz, VERRE_BLEU);
      }
    }
  }
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) set(dx, H, dz, GRANIT);
  for (let k = 1; k <= 10; k++) set(0, H + k, 0, ACIER);      // la flèche
  set(0, H + 11, 0, VERRE);
}

// Grand Central : une gare basse et large, sa façade à trois grandes arches et
// son horloge. On ne la remarque pas de loin — mais on la cherche à pied.
export function buildGrandCentral(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      const bord = Math.abs(dx) === 5 || Math.abs(dz) === 4;
      for (let y = 0; y < 8; y++) if (bord) set(dx, y, dz, PIERRE_CLAIRE);
      set(dx, 8, dz, PIERRE_CLAIRE);
    }
  }
  // les trois arches de la façade sud, et l'horloge au-dessus de celle du milieu
  for (const ax of [-3, 0, 3]) {
    for (let y = 1; y <= 5; y++) { set(ax, y, 4, BLOCK.AIR); set(ax - 1, y, 4, BLOCK.AIR); set(ax + 1, y, 4, BLOCK.AIR); }
    for (let dx = -1; dx <= 1; dx++) set(ax + dx, 6, 4, VERRE);
  }
  set(0, 7, 4, JAUNE_TAXI);   // l'horloge
  for (const dx of [-5, 0, 5]) for (let k = 1; k <= 2; k++) set(dx, 8 + k, 0, PIERRE_CLAIRE);
}

// --- les lieux dont on connaît le nom avant d'y être allé ---------------------
//
// Une carte juste ne suffit pas. Un enfant qui arrive à New York cherche des
// choses précises : la Statue de la Liberté, Times Square et ses écrans, Wall
// Street et sa bourse, le pont de Brooklyn. Tant qu'ils ne sont pas là, l'île
// n'est qu'une belle grille.

// La Bourse de New York : le temple grec au coin de Wall Street et Broad, sa
// colonnade, son fronton et le grand drapeau qui le couvre.
export function buildBourse(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  for (let dx = -6; dx <= 6; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      const bord = Math.abs(dx) === 6 || Math.abs(dz) === 5;
      for (let y = 0; y <= 11; y++) if (bord) set(dx, y, dz, PIERRE_CLAIRE);
      set(dx, 12, dz, PIERRE_CLAIRE);
    }
  }
  // les six colonnes de la façade sud, et le fronton au-dessus
  for (let dx = -5; dx <= 5; dx += 2) {
    for (let y = 0; y <= 10; y++) set(dx, y, 6, PIERRE_CLAIRE);
  }
  for (let k = 0; k <= 3; k++) {
    for (let dx = -5 + k; dx <= 5 - k; dx++) set(dx, 11 + k, 6, PIERRE_CLAIRE);
  }
  // le drapeau, tendu sur toute la colonnade
  for (let dx = -4; dx <= 4; dx++) {
    for (let y = 7; y <= 10; y++) set(dx, y, 7, dx < -1 ? VERRE_BLEU : ((y + dx) & 1 ? BRIQUE_ROUGE : PIERRE_CLAIRE));
  }
}

// Trinity Church : la flèche noire au bout de Wall Street. Pendant cinquante
// ans, c'était le plus haut point de New York — d'où le fait qu'elle regarde
// encore la rue dans l'axe.
export function buildTrinity(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -6; dz <= 6; dz++) {
      const bord = Math.abs(dx) === 3 || Math.abs(dz) === 6;
      for (let y = 0; y <= 8; y++) if (bord) set(dx, y, dz, GRANIT);
      set(dx, 9, dz, ARDOISE);
    }
  }
  for (let dz = -5; dz <= 5; dz += 2) { set(-3, 5, dz, VERRE); set(3, 5, dz, VERRE); }
  // le clocher, au sud
  for (let y = 0; y <= 20; y++) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = 4; dz <= 8; dz++) {
        if (Math.abs(dx) === 2 || dz === 4 || dz === 8) set(dx, y, dz, GRANIT);
      }
    }
  }
  for (let k = 0; k <= 5; k++) {
    const r = 2 - Math.floor(k / 2);
    for (let dx = -r; dx <= r; dx++) for (let dz = 6 - r; dz <= 6 + r; dz++) set(dx, 21 + k, dz, ARDOISE);
  }
  for (let y = 14; y <= 17; y++) { set(0, y, 4, VERRE); set(0, y, 8, VERRE); }
  set(0, 27, 6, BLOCK.GOLD);   // la croix
}

// Times Square : le carrefour le plus éclairé du monde. Ce qu'on en retient,
// ce ne sont pas les immeubles mais leurs façades d'écrans, du sol au toit —
// alors c'est cela qu'on bâtit, en bandes de couleurs vives.
export function buildTimesSquare(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const ECRANS = [BRIQUE_ROUGE, JAUNE_TAXI, VERRE_BLEU, uni(6), uni(10), uni(2)];
  // quatre tours d'affichage autour de la place
  const tours = [[-7, -6, 22], [7, -6, 18], [-7, 7, 16], [7, 7, 20]];
  for (const [cx, cz, h] of tours) {
    for (let y = 0; y < h; y++) {
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          if (Math.abs(dx) !== 3 && Math.abs(dz) !== 3) continue;
          // les faces tournées vers la place sont entièrement en écrans
          const versPlace = (cx < 0 ? dx === 3 : dx === -3) || (cz < 0 ? dz === 3 : dz === -3);
          set(cx + dx, y, cz + dz,
            versPlace && y > 1 ? ECRANS[(y + Math.abs(dx + dz)) % ECRANS.length] : ACIER);
        }
      }
    }
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) set(cx + dx, h, cz + dz, GRANIT);
  }
  // les gradins rouges, au milieu, face au sud
  for (let k = 0; k <= 4; k++) {
    for (let dx = -4; dx <= 4; dx++) set(dx, k, 1 + k, BRIQUE_ROUGE);
  }
  // le mât de la boule du Nouvel An
  for (let y = 0; y <= 14; y++) set(0, y, -2, ACIER);
  for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) set(dx, 15, -2 + dz, BLOCK.DIAMOND);
}

// Liberty Island : l'étoile de pierre du vieux fort, le socle, et la statue
// verte qui lève son flambeau. Elle regarde vers le large, comme la vraie.
export function buildLiberte(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  // l'île et le fort en étoile
  for (let dx = -7; dx <= 7; dx++) {
    for (let dz = -7; dz <= 7; dz++) {
      const d = Math.hypot(dx, dz);
      const branche = Math.abs(Math.sin(Math.atan2(dz, dx) * 5.5));
      if (d > 6.5 + branche * 1.2) continue;
      set(dx, -1, dz, d > 4.5 ? GRANIT : BLOCK.GRASS);
    }
  }
  // le socle
  for (let y = 0; y <= 5; y++) {
    const r = 4 - Math.floor(y / 3);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) set(dx, y, dz, GRANIT);
    }
  }
  // la robe, qui s'affine
  for (let y = 6; y <= 16; y++) {
    const r = y < 10 ? 2 : 1;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) set(dx, y, dz, CUIVRE);
    }
  }
  // les bras, la tête, la couronne et le flambeau
  set(0, 17, 0, CUIVRE);
  for (let y = 17; y <= 21; y++) set(2, y, 0, CUIVRE);        // le bras levé
  set(2, 22, 0, BLOCK.GOLD);                                   // la flamme
  set(-1, 17, 0, CUIVRE); set(-2, 16, 0, CUIVRE);             // la tablette
  set(0, 18, 0, CUIVRE);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(dx, 19, dz, CUIVRE);
  set(0, 19, 0, BLOCK.GOLD);                                   // la couronne
}

// Le pont de Brooklyn : deux tours de granit percées de deux arches gothiques,
// et les câbles en éventail. C'est le premier pont suspendu en acier du monde,
// et la silhouette qu'on met sur les cartes postales.
export function buildBrooklyn(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const TABLIER = 9;
  // le tablier, d'une rive à l'autre
  for (let dx = -26; dx <= 26; dx++) {
    const h = TABLIER + Math.round(Math.cos((dx / 26) * Math.PI) * -2);
    for (let dz = -2; dz <= 2; dz++) set(dx, h, dz, Math.abs(dz) === 2 ? GRANIT : PAVE_SOMBRE);
    // les câbles porteurs, en arc
    const cable = h + 10 + Math.round(Math.cos((dx / 16) * Math.PI) * -6);
    if (Math.abs(dx) < 17) for (const dz of [-2, 2]) set(dx, cable, dz, ACIER);
  }
  // les deux tours
  for (const tx of [-16, 16]) {
    for (let y = 0; y <= TABLIER + 16; y++) {
      for (let dz = -3; dz <= 3; dz++) {
        for (const dx of [-1, 1]) set(tx + dx, y, dz, GRANIT);
      }
    }
    // les deux arches gothiques
    for (const az of [-1.6, 1.6]) {
      const z0 = Math.round(az);
      for (let y = TABLIER + 1; y <= TABLIER + 6; y++) {
        for (const dx of [-1, 1]) set(tx + dx, y, z0, BLOCK.AIR);
      }
    }
  }
}
