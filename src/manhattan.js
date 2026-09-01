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
// Mais le plan de 1811 ne dit rien du bas de l'île, et c'est là que Manhattan
// est la plus reconnaissable. Au sud de la 14e Rue la grille n'existe pas :
// chaque quartier y a gardé la trame de son époque, et **c'est l'angle entre
// ces trames** qu'on lit sur un plan avant tout le reste — SoHo aligné sur
// Broadway, le West Village en biais sur l'ancienne rive, Chinatown penché sur
// le Bowery, la pointe hollandaise en désordre. Un enfant qui compare avec un
// vrai plan voit cela immédiatement.
//
// Une seule liberté d'échelle, mais assumée et **uniforme** : 11,7 blocs par
// kilomètre. L'île fait 20,6 km, elle en fait 240 ici. C'est ce chiffre unique
// qui remet le bas de l'île à sa taille — quarante-sept blocs de Battery à la
// 14e Rue, et non quinze comme dans la première version, où aucun plan réel
// n'aurait tenu. L'orientation, elle, reste droite : la vraie grille est
// inclinée de 29°, ce qui en blocs donnerait des rues en escalier illisibles.

import { BLOCK, CITY_BLOCK, DECOR_START, ARCHI } from './blocks.js';
import { rangerVoies, solDesVoies } from './voies.js';
import { positionDe } from './mondes.js';

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
export const NY = positionDe('ny');

// LA REFONTE À L'ÉCHELLE GTA (v182). Verdict de Max sur les villes à la
// main : « remettre à l'échelle, beaucoup plus riches, des choses qui se
// passent ». Manhattan passe de 11,7 à TRENTE-QUATRE blocs par kilomètre —
// l'esprit de Washington (48), tenu par un budget : Boston est à 299 blocs
// de l'ancre, l'île ne peut plus tout couvrir. Elle va donc de Battery à la
// ~68e Rue : Wall Street et la pointe, les Villages, Chelsea, Midtown,
// Times Square, Grand Central — et la lisière SUD de Central Park, avec son
// étang, qui referme l'île en pelouse. Harlem, le corps du parc et le haut
// de l'île attendent que le monde grandisse, comme la Cathédrale nationale
// à Washington.
//
// Le plan d'auteur reste écrit dans l'ANCIENNE unité — il code la vraie
// géographie, rive par rive — et K le projette dans le monde ; les LARGEURS
// (rues, trames, pas de grille), elles, se redonnent en absolu : c'est
// exactement ça, changer d'échelle sans redessiner la ville.
export const K = 2.9;
const uK = (u) => Math.round(u * K);
// L'ancien repère avait Battery à +110 ; on recentre sur la ~18e Rue (+61)
// pour que l'ancre — donc la téléportation « New York » — tombe en ville.
const vK = (v) => Math.round((v - 61) * K);

export const NY_LONG = 152;   // demi-longueur couverte (Battery ↔ ~68e Rue)
export const NY_LARGE = 75;   // demi-largeur maximale de l'île
export const NY_EAU = 44;     // l'Hudson ; l'East River est plus étroite
export const NY_SOL = 33;     // l'île est plate, comme la vraie sous ses rues
// La zone n'est plus symétrique : Liberty Island tire le sud dans la baie.
// La zone déborde l'île de quelques blocs de chaque côté : la pointe nord se
// referme à −171, la zone s'arrête à −178, et le fondu de terrain occupe
// l'écart. Sans cette marge, l'île se terminait par une falaise droite —
// des rues posées sur du relief qu'on n'avait pas aplani.
const NORD_V = -178;
const SUD_V = 200;

const KM_14E = 4.0;          // de la pointe de Battery à la 14e Rue
const KM_PAR_RUE = 0.0805;   // 80 mètres : un pâté du plan de 1811

// Le plan d'auteur est écrit dans l'ancienne unité ; `vDuPlan` le projette
// pour ceux qui le lisent de l'extérieur — world.js, qui ancre les ponts sur
// des rives données rue par rue.
export const vDuPlan = (v) => vK(v);
export const vDeKm = (d) => vK(110 - d * 11.7);
export const vDeRue = (n) => vDeKm(KM_14E + (n - 14) * KM_PAR_RUE);
export const rueDeV = (v) => Math.round(14 + ((110 - (v / K + 61)) / 11.7 - KM_14E) / KM_PAR_RUE);

// Au sud de cette ligne, la grille de 1811 n'a jamais été tracée.
export const BAS_V = vDeRue(14);   // ≈ +6

// Le pas de la grille : cent quarante-cinq mètres réels — on ne garde
// qu'une rue sur deux du plan de 1811, et c'est le bon compromis : une
// chaussée, un trottoir de chaque côté, et un pâté de deux blocs de
// profondeur — les pâtés MINCES de Manhattan, enfin reconnaissables.
const RUE_PAS = 5;
const cranRue = (v) => ((v % RUE_PAS) + RUE_PAS) % RUE_PAS;
const estRue = (v) => cranRue(v) === 0;
const estTrottoirDeRue = (v) => cranRue(v) === 1 || cranRue(v) === RUE_PAS - 1;
// Les quinze rues élargies du plan de 1811, ramenées à notre grille.
const LARGES = new Set([14, 23, 34, 42, 57, 72, 79, 86, 96, 106, 116, 125, 135, 145, 155]
  .map((n) => Math.round(vDeRue(n) / RUE_PAS) * RUE_PAS));

// Les avenues, d'est en ouest. Leurs écarts relatifs restent ceux de la vraie
// ville : 280 m entre la 5e et la 6e, 120 m seulement entre la 5e, Madison et
// Park — d'où des pâtés quatre fois plus longs d'est en ouest que du nord au
// sud.
//
// `vFin` est leur extrémité **sud**, et ce n'est pas un détail : à New York
// aucune avenue ne descend jusqu'à la mer. La 5e s'arrête à Washington Square,
// la 3e au Bowery, la 8e à Abingdon Square où elle devient Hudson Street. Une
// avenue qui traverserait SoHo trahirait le plan aussi sûrement qu'une rue de
// travers.
export const AVENUES = [
  { u: 22, nom: '1re Avenue', l: 0, vFin: 76 },
  { u: 18, nom: '2e Avenue', l: 0, vFin: 76 },
  { u: 14, nom: '3e Avenue', l: 0, vFin: 73 },
  { u: 11, nom: 'Lexington Avenue', l: 0, vFin: 57 },
  { u: 8, nom: 'Park Avenue', l: 1, vFin: 63 },
  { u: 4, nom: 'Madison Avenue', l: 0, vFin: 55 },
  { u: 0, nom: '5e Avenue', l: 0, vFin: 70 },      // s'arrête à Washington Square
  { u: -6, nom: '6e Avenue', l: 0, vFin: 92 },     // devient Church Street à TriBeCa
  { u: -11, nom: '7e Avenue', l: 0, vFin: 65 },
  { u: -16, nom: '8e Avenue', l: 0, vFin: 68 },    // Central Park West au droit du parc
  { u: -20, nom: '9e Avenue', l: 0, vFin: 63 },    // Columbus au-dessus de la 59e
];

// Central Park : de la 59e à la 110e, de la 5e Avenue à Central Park West.
// Quarante-huit blocs sur seize — le vrai parc fait 4,1 km sur 800 m, et occupe
// un cinquième de la longueur de l'île. C'est cette proportion-là qu'on
// reconnaît, pas un carré de verdure au milieu.
// La LISIÈRE du parc, pas le parc entier : la couverture s'arrête à la 68e
// Rue, on en tient donc les dix premiers pâtés — l'étang, la patinoire, et
// assez de pelouse pour que la 59e Rue ferme Midtown sur du vert.
export const PARC = { u0: -46, u1: 0, v0: -168, v1: vDeRue(59) };
const dansParc = (u, v) => u > PARC.u0 && u < PARC.u1 && v > PARC.v0 && v < PARC.v1;
// La même question, posée en coordonnées du monde : le générateur d'arbres en
// a besoin pour laisser repousser la forêt du parc, et elle seule.
export const dansCentralPark = (x, z) => dansParc(x - NY.x, z - NY.z);

// Broadway. Chemin indien devenu route de poste, il est antérieur à la grille
// et l'ignore : à chaque avenue qu'il croise naît une place. En bas de l'île il
// passe à l'ouest, remonte vers l'est jusqu'à Union Square, puis redescend
// vers l'ouest en coupant toutes les avenues l'une après l'autre.
//
// `brut` marque les points donnés dans l'ancienne unité — le bas de l'île,
// où les rues n'ont pas de numéro : ceux-là passent par le projecteur, les
// autres sont déjà projetés par `vDeRue`. Sans ce marqueur, la moitié de
// Broadway se serait retrouvée projetée deux fois.
const BROADWAY = [
  { v: 108, u: -1, brut: true },      // Bowling Green, au pied de l'île
  { v: 96, u: -3, brut: true },       // devant l'Hôtel de Ville
  { v: 87, u: -2, brut: true },       // Canal Street
  { v: 76, u: 2, brut: true },        // Houston : le voilà à l'est de l'axe
  { v: vDeRue(14), u: 3 },            // Union Square
  { v: vDeRue(23), u: 0 },            // Madison Square, la 5e Avenue
  { v: vDeRue(34), u: -6 },           // Herald Square, la 6e
  { v: vDeRue(42), u: -11 },          // Times Square, la 7e
  { v: vDeRue(59), u: -16 },          // Columbus Circle, la 8e
  { v: vDeRue(68), u: -18 },          // au-delà, l'île sort de la couverture
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
  { nom: 'Union Square', u: 3, v: vDeRue(14), r: 4 },
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

// La couverture s'arrête à la 68e Rue : l'Upper West et l'Upper East Side,
// Harlem, Washington Heights et Inwood attendent que le monde grandisse —
// comme la Cathédrale nationale à Washington quand l'échelle a triplé. Ce
// qu'on garde, on le rend habitable ; ce qu'on ne peut pas tenir, on le dit.
export const QUARTIERS = [
  { nom: 'Financial District', u: 0, v: 101, brut: true },
  { nom: 'Battery Park City', u: -8, v: 101, brut: true },
  { nom: 'TriBeCa', u: -9, v: 92, brut: true },
  { nom: 'Chinatown', u: 7, v: 88, brut: true },
  { nom: 'Little Italy', u: 1, v: 86, brut: true },
  { nom: 'SoHo', u: -5, v: 82, brut: true },
  { nom: 'Lower East Side', u: 13, v: 82, brut: true },
  { nom: 'Greenwich Village', u: -5, v: 72, brut: true },
  { nom: 'West Village', u: -14, v: 71, brut: true },
  { nom: 'East Village', u: 11, v: 70, brut: true },
  { nom: 'Gramercy', u: 7, v: vDeRue(21) },
  { nom: 'Chelsea', u: -14, v: vDeRue(24) },
  { nom: 'Midtown', u: -4, v: vDeRue(48) },
  { nom: 'Times Square', u: -11, v: vDeRue(43) },
  { nom: 'Central Park (lisière)', u: -8, v: vDeRue(62) },
];

// La silhouette. Le côté Hudson est presque rectiligne — c'est lui qui a donné
// son alignement à la grille. L'île est la plus large vers la 14e Rue, puis
// tout se resserre vers Inwood, et la pointe de Battery s'effile.
// La couverture s'arrêtant à la 68e Rue, les rives se referment juste
// au-dessus : la queue nord (v ≤ 8 dans l'unité du plan) remplace les
// relevés de Harlem et d'Inwood. Sans cette fermeture, l'île se terminait
// par une falaise droite en travers de l'Hudson.
const RIVE_OUEST = [
  { v: 110, l: 1 }, { v: 106, l: 6 }, { v: 103, l: 8 }, { v: 101, l: 9 },
  { v: 96, l: 11 }, { v: 87, l: 13 }, { v: 76, l: 17 }, { v: 63, l: 21 },
  { v: 54, l: 23 }, { v: 44, l: 23 }, { v: 21, l: 24 },
  { v: 8, l: 23 }, { v: 5, l: 14 }, { v: 2, l: 0 },
];
const RIVE_EST = [
  { v: 110, l: 1 }, { v: 106, l: 6 }, { v: 103, l: 10 }, { v: 101, l: 11 },
  { v: 96, l: 12 }, { v: 87, l: 14 }, { v: 76, l: 20 }, { v: 63, l: 23 },
  { v: 54, l: 23 }, { v: 44, l: 22 }, { v: 36, l: 21 }, { v: 21, l: 21 },
  { v: 8, l: 21 }, { v: 5, l: 13 }, { v: 2, l: 0 },
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

// Wall Street, Battery Park et Liberty Island : le bas de l'île, celui dont on
// connaît les noms avant d'y être allé.
export const WALL = { v: vDeKm(0.6), u0: -23, u1: 23 };
export const BATTERY = { v: vDeKm(0.35) };
export const LIBERTE = { u: -64, v: 177, r: 16 };
export const PAVE_SOMBRE = CITY_BLOCK.GRANITE;

// Roosevelt Island : le long ruban posé dans l'East River, de la 46e à la 86e.
// Deux blocs de large, et pourtant personne ne confond un plan de Manhattan
// avec ou sans lui.
// L'île s'arrête au bord de la couverture : au nord de la 68e Rue, il n'y a
// plus de monde à border.
export const ROOSEVELT = { u: 78, v0: -152, v1: vDeRue(46), l: 4.5 };
export const surRoosevelt = (x, z) => {
  const u = x - NY.x, v = z - NY.z;
  return v > ROOSEVELT.v0 && v < ROOSEVELT.v1 && Math.abs(u - ROOSEVELT.u) <= ROOSEVELT.l;
};

// --- ce que le monde demande -------------------------------------------------

// La zone d'influence : l'île ET ses deux fleuves. Au-delà, le terrain reprend
// ses droits. Un rectangle plutôt qu'un disque — une île longue de deux cent
// quarante blocs ne tient dans aucun cercle raisonnable.
// La zone n'est plus symétrique autour de l'ancre : au sud elle va chercher
// Liberty Island au large, au nord elle s'arrête net à la limite de la
// couverture, un peu au-delà de la pointe de l'île.
export function zoneManhattan(x, z) {
  const u = x - NY.x, v = z - NY.z;
  return v > NORD_V && v < SUD_V && Math.abs(u) < NY_LARGE + NY_EAU;
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
  if (v <= NORD_V || v >= SUD_V || Math.abs(u) >= NY_LARGE + NY_EAU) return h;

  const bord = versRive(u, v);   // < 0 sur l'île, > 0 dans le fleuve
  // fondu vers le terrain d'origine sur les derniers blocs de la zone
  const marge = Math.min(
    1,
    (v - NORD_V) / 20,
    (SUD_V - v) / 20,
    (NY_LARGE + NY_EAU - Math.abs(u)) / 20,
  );
  if (marge <= 0) return h;

  // Le quai et le lit du fleuve suivent l'échelle comme le reste : à
  // trente-quatre blocs par kilomètre, la berge qui descendait en trois
  // blocs en prend six, et le fleuve est assez large pour qu'on le traverse
  // à la nage — ou sous un pont.
  let cible;
  if (bord < 0) cible = NY_SOL;                              // la ville
  else if (bord < 6) cible = NY_SOL - 1 - bord * 0.6;        // le quai qui descend
  else cible = Math.max(16, 22 - Math.min(8, bord - 6));     // le lit du fleuve
  return h * (1 - marge) + cible * marge;
}

// --- le plan du bas de l'île --------------------------------------------------
//
// Au sud de la 14e Rue, rien n'a été tracé d'un coup : chaque quartier a gardé
// la trame de son siècle, et ces trames ne sont pas parallèles. C'est cet
// écart d'angles qui fait le plan de Lower Manhattan, bien plus que le tracé
// de telle ou telle rue.
//
// Un point du bas de l'île appartient donc à une trame, et une seule ; les
// voies qui portent un nom passent par-dessus.

const TRAMES = {
  // Le West Village : ses rues suivent l'ancienne rive de l'Hudson et le
  // découpage des fermes du XVIIIe. C'est là que West 4th croise West 10th,
  // l'anomalie la plus célèbre du plan de New York.
  // Les PAS sont donnés en absolu, dans l'unité du monde : à trente-quatre
  // blocs par kilomètre, un pâté du Village fait quatre blocs de côté et non
  // six et demi. Changer d'échelle multiplie les positions, jamais les
  // largeurs — sinon SoHo aurait des rues de quatre blocs de large.
  village: { ang: 0.55, pu: 4.4, pv: 4.0, cu: -13, cv: 71, w: 0.8, s: 1.6 },
  // Autour de Washington Square : presque droit, mais pas tout à fait.
  washington: { ang: 0.09, pu: 4.2, pv: 4.0, cu: -3, cv: 66, w: 0.8, s: 1.6 },
  // L'East Village : ici, et ici seulement en bas de l'île, la grille de 1811
  // descend jusqu'à Houston. Ses rues prolongent exactement celles du nord.
  grille: { ang: 0, pu: 3.2, pv: 4.0, cu: 8, cv: 66, w: 0.8, s: 1.6 },
  // SoHo et TriBeCa : la trame la plus régulière du bas, alignée sur Broadway
  // — c'est le quartier des façades en fonte, bâti d'un seul mouvement.
  soho: { ang: -0.16, pu: 3.6, pv: 4.6, cu: -6, cv: 84, w: 0.8, s: 1.6, travers: true },
  // Chinatown et le Lower East Side, penchés sur le Bowery.
  chinatown: { ang: 0.40, pu: 3.4, pv: 4.2, cu: 8, cv: 86, w: 0.8, s: 1.6, travers: true },
};

// La pointe hollandaise n'a pas de trame du tout, et c'est exactement ce qui
// la caractérise : ses ruelles portent chacune un nom depuis le XVIIe siècle et
// ne se répètent jamais. Elles sont donc toutes dessinées à la main, et rien
// d'autre ne s'y ajoute — sinon le quartier n'était plus que du bitume.
function trameDe(u, v) {
  if (v > vK(95)) return null;
  if (v > vK(76)) return u < uK(3) ? TRAMES.soho : TRAMES.chinatown;
  if (u < uK(-8)) return TRAMES.village;
  if (u < uK(3)) return TRAMES.washington;
  return TRAMES.grille;
}

// Les coordonnées d'un point dans le repère de sa trame.
function repere(t, u, v) {
  const du = u - t.cu, dv = v - t.cv;
  const c = Math.cos(t.ang), s = Math.sin(t.ang);
  return [du * c - dv * s, du * s + dv * c];
}

// Les voies qui portent un nom : celles qu'on trouve sur n'importe quel plan,
// et dont un enfant a déjà entendu parler. Elles sont données par leurs points
// de passage réels, ramenés à notre échelle.
const VOIES = [
  // les grandes traversées est-ouest
  { nom: 'Canal Street', l: 1.0, t: 0.4, pts: [[-12, 88], [-4, 87], [6, 86], [13, 85]] },
  { nom: 'Houston Street', l: 1.0, t: 0.4, pts: [[-16, 78], [-6, 76], [6, 75], [19, 74]] },
  { nom: 'Delancey Street', l: 0.7, t: 0.3, pts: [[5, 82], [11, 81], [17, 80]] },
  { nom: 'Grand Street', l: 0.5, t: 0.25, pts: [[-9, 85], [3, 84], [15, 82]] },
  { nom: 'Chambers Street', l: 0.6, t: 0.3, pts: [[-11, 95], [-3, 95], [2, 94]] },
  { nom: 'Bleecker Street', l: 0.5, t: 0.25, pts: [[-16, 72], [-8, 74], [-1, 76], [5, 78]] },
  { nom: 'Christopher Street', l: 0.5, t: 0.25, pts: [[-18, 71], [-9, 72]] },
  // La pointe hollandaise : des ruelles d'un bloc de large. À notre échelle,
  // Fulton et Maiden Lane sont distantes d'un bloc et demi — dessinées à la
  // largeur d'une avenue, elles recouvraient tout le quartier de bitume, et le
  // Financial District n'avait plus un seul immeuble.
  { nom: 'Wall Street', l: 0.7, t: 0.25, sol: PAVE_SOMBRE, pts: [[-8, 103], [8, 103]] },
  { nom: 'Fulton Street', l: 0.5, t: 0.35, pts: [[-9, 100], [9, 100]] },
  { nom: 'Beaver Street', l: 0.5, t: 0.3, pts: [[-3, 105], [3, 105]] },
  { nom: 'Vesey Street', l: 0.5, t: 0.35, pts: [[-10, 97], [-1, 97]] },
  { nom: 'Battery Place', l: 0.5, t: 0.35, pts: [[-4, 108], [1, 108]] },
  // les grands axes nord-sud
  { nom: 'Bowery', l: 0.8, t: 0.3, pts: [[8, 91], [6, 82], [5, 76]] },
  { nom: '4e Avenue', l: 0.6, t: 0.3, pts: [[5, 76], [7, 70], [8, 64]] },
  { nom: 'Lafayette Street', l: 0.5, t: 0.25, pts: [[2, 92], [2, 84], [1, 77]] },
  { nom: 'West Broadway', l: 0.5, t: 0.25, pts: [[-8, 95], [-7, 84], [-6, 77]] },
  { nom: 'Hudson Street', l: 0.6, t: 0.25, pts: [[-12, 94], [-14, 84], [-16, 74], [-16, 68]] },
  { nom: '7e Avenue Sud', l: 0.6, t: 0.3, pts: [[-11, 65], [-9, 72], [-7, 78]] },
  { nom: 'Greenwich Avenue', l: 0.5, t: 0.25, pts: [[-6, 68], [-11, 65], [-16, 63]] },
  { nom: 'Greenwich Street', l: 0.5, t: 0.35, pts: [[-7, 101], [-9, 96], [-11, 90]] },
  { nom: 'Essex Street', l: 0.5, t: 0.25, pts: [[12, 86], [14, 78], [15, 70], [16, 63]] },
  { nom: 'East Broadway', l: 0.5, t: 0.25, pts: [[8, 91], [11, 88], [13, 86]] },
  { nom: 'Park Row', l: 0.6, t: 0.3, pts: [[-2, 96], [3, 93], [7, 91]] },
  { nom: 'William Street', l: 0.5, t: 0.35, pts: [[4, 105], [2, 97]] },
  { nom: 'Pearl Street', l: 0.5, t: 0.35, pts: [[1, 107], [6, 103], [8, 99], [7, 96]] },
  { nom: 'Trinity Place', l: 0.5, t: 0.35, pts: [[-5, 106], [-5, 99]] },
];

// Les places et les squares du bas. Ils comptent autant que les rues : c'est
// autour d'eux que le quartier s'organise, et ce sont eux qu'on cherche des
// yeux sur un plan.
const SQUARES = [
  { nom: 'Bowling Green', u: -2, v: 107, ru: 1.6, rv: 1.2, sol: PIERRE_CLAIRE },
  { nom: "Parc de l'Hôtel de Ville", u: -1, v: 96.5, ru: 2.6, rv: 1.6, sol: BLOCK.GRASS },
  { nom: 'Foley Square', u: 1, v: 93.5, ru: 1.6, rv: 1.2, sol: PIERRE_CLAIRE },
  { nom: 'Chatham Square', u: 8, v: 91, ru: 1.4, rv: 1.2, sol: PIERRE_CLAIRE },
  { nom: 'Columbus Park', u: 5, v: 89, ru: 1.6, rv: 1.4, sol: BLOCK.GRASS },
  { nom: 'Seward Park', u: 12, v: 85.5, ru: 1.6, rv: 1.2, sol: BLOCK.GRASS },
  { nom: 'Washington Square', u: -2, v: 70, ru: 3, rv: 2.4, sol: BLOCK.GRASS },
  { nom: 'Astor Place', u: 6, v: 72, ru: 1.4, rv: 1.2, sol: PIERRE_CLAIRE },
  { nom: 'Tompkins Square', u: 12, v: 69, ru: 2.2, rv: 1.8, sol: BLOCK.GRASS },
];

// LE PROJECTEUR.
//
// Tout le plan ci-dessus — avenues, Broadway, rives, voies nommées, squares,
// trames — est écrit dans l'ANCIENNE unité, 11,7 blocs par kilomètre. Ce
// n'est pas de la paresse : c'est là qu'il a été relevé, rive par rive et
// avenue par avenue, sur la vraie carte. Le réécrire à la main aurait voulu
// dire tout re-relever, et perdre en route la géographie qu'on avait
// gagnée. On le PROJETTE donc, une fois, au chargement du module.
//
// Ce qui se multiplie, ce sont les POSITIONS. Les largeurs, elles, sont
// redonnées en absolu dans chaque table — la chaussée d'une avenue, le pas
// d'une trame, le rayon d'une place. C'est exactement cela, changer
// d'échelle sans redessiner la ville : les mêmes lieux, plus de place entre
// eux, et des rues qui restent des rues.
function projeter() {
  for (const a of AVENUES) { a.u = uK(a.u); a.vFin = vK(a.vFin); a.l = a.l ? 2 : 1; }
  for (const p of BROADWAY) { p.u = uK(p.u); if (p.brut) p.v = vK(p.v); }
  for (const p of PLACES_NY) { p.u = uK(p.u); p.r = p.nom === 'Times Square' ? 14 : p.r * 2.2; }
  for (const q of QUARTIERS) { q.u = uK(q.u); if (q.brut) q.v = vK(q.v); }
  for (const table of [RIVE_OUEST, RIVE_EST]) {
    for (const r of table) { r.v = vK(r.v); r.l = Math.round(r.l * K); }
  }
  for (const w of VOIES) {
    w.pts = w.pts.map(([u, v]) => [uK(u), vK(v)]);
    w.l *= 2.2; w.t *= 2;
  }
  for (const s of SQUARES) { s.u = uK(s.u); s.v = vK(s.v); s.ru *= 2.4; s.rv *= 2.4; }
  for (const t of Object.values(TRAMES)) { t.cu = uK(t.cu); t.cv = vK(t.cv); }
}
projeter();

const BANDES = rangerVoies(VOIES);

// Le sol du bas de l'île : Battery Park, les squares, les voies nommées, puis
// la trame du quartier.
function solBasManhattan(u, v) {
  // Battery Park : la pointe verte de l'île, d'où partent les bateaux.
  if (v > BATTERY.v) {
    return Math.abs(Math.sin(u * 0.17 + v * 0.1)) < 0.15 ? PIERRE_CLAIRE : BLOCK.GRASS;
  }

  for (const s of SQUARES) {
    if (((u - s.u) / s.ru) ** 2 + ((v - s.v) / s.rv) ** 2 < 1) {
      // une allée en croix dans les squares plantés, un dallage plein ailleurs
      if (s.sol !== BLOCK.GRASS) return s.sol;
      return (Math.abs(u - s.u) < 0.5 || Math.abs(v - s.v) < 0.5) ? TROTTOIR : BLOCK.GRASS;
    }
  }

  const voie = solDesVoies(BANDES, u, v, BITUME, TROTTOIR);
  if (voie !== null) return voie;

  const t = trameDe(u, v);
  if (t === null) return null;
  const [a, b] = repere(t, u, v);
  // `travers` : à SoHo et à Chinatown, les rues du sens long portent déjà un
  // nom et sont tracées plus haut. La trame n'a plus qu'à donner les traverses,
  // sinon on comptait deux fois les mêmes rues et le quartier disparaissait
  // sous le bitume — quatorze pour cent de terrain à bâtir contre quarante
  // au nord de la 14e Rue.
  const db = Math.abs(b - Math.round(b / t.pv) * t.pv);
  const d = t.travers ? db : Math.min(Math.abs(a - Math.round(a / t.pu) * t.pu), db);
  if (d < t.w) return BITUME;
  if (d < t.s) return TROTTOIR;
  return null;   // le pâté de maisons
}

// --- la surface : rues, trottoirs, parc, places ------------------------------

// Les deux voies rapides qui font le tour de l'île, au ras de l'eau : la West
// Side Highway sur l'Hudson, le FDR Drive sur l'East River. Elles ne sont pas
// dans la liste des avenues parce qu'elles n'ont pas d'abscisse fixe — elles
// suivent la rive, d'un bout à l'autre.
function surLaVoieDeRive(u, v) {
  if (demiLargeur(v) < 14) return false;
  return Math.abs(u - (bordOuest(v) + 4.5)) <= 1.5 || Math.abs(u - (bordEst(v) - 4.5)) <= 1.5;
}

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

  if (surLaVoieDeRive(u, v)) return BITUME;

  // Broadway, la diagonale. Elle passe AVANT la grille : là où elle croise une
  // avenue, c'est elle qui donne son dessin à la chaussée.
  // Broadway est large au nord et étroite au sud : passé la 14e Rue ce n'est
  // plus une avenue mais une rue ordinaire, et une chaussée de cinq blocs y
  // mangeait tout le quartier.
  const ub = uBroadway(v);
  const large = v > BAS_V ? 2 : 3;
  if (ub !== null && Math.abs(u - ub) <= large + 1) {
    const d = Math.abs(u - ub);
    if (d > large) return TROTTOIR;
    return (Math.round(v) % 8 < 4) ? LIGNE : BITUME;
  }

  // Les avenues, chacune jusqu'à son extrémité sud et pas au-delà. À cette
  // échelle une avenue porte enfin ce qu'elle porte dans la vraie ville :
  // deux blocs de chaussée, un trottoir de chaque côté — et l'on marche sur
  // le trottoir sans avoir les pieds dans le caniveau.
  for (const a of AVENUES) {
    if (v > a.vFin) continue;
    const d = Math.abs(u - a.u);
    if (d > a.l + 1) continue;
    if (d === a.l + 1) return TROTTOIR;
    if (v <= BAS_V && estRue(v)) return PASSAGE;                 // le carrefour
    if (a.nom === 'Park Avenue' && d === 0) return BLOCK.LEAVES; // le terre-plein planté
    return (v & 7) < 4 ? LIGNE : BITUME;
  }

  // Au sud de la 14e Rue, le plan réel ; au nord, la grille de 1811.
  if (v > BAS_V) return solBasManhattan(u, v);

  if (estRue(v)) return (u & 7) < 4 ? LIGNE : BITUME;
  // LES QUINZE RUES ÉLARGIES du plan de 1811 — la 14e, la 23e, la 34e, la
  // 42e, la 57e — sont les seules à valoir trois blocs de chaussée et leurs
  // trottoirs. Les autres n'en ont pas : une rue transversale de Manhattan
  // fait dix-huit mètres, soit moins d'un bloc à notre échelle, et lui
  // donner un trottoir de chaque côté revenait à tripler sa largeur. Trois
  // rangs de bitume sur cinq, et l'île n'était plus qu'un parking : onze
  // pour cent de terrain à bâtir, là où la vraie ville en a soixante-dix.
  if (LARGES.has(v - 1) || LARGES.has(v + 1)) return BITUME;
  if (LARGES.has(v - 2) || LARGES.has(v + 2)) return TROTTOIR;
  return null;   // le pâté de maisons
}

// Central Park vu du sol. Les pièces retenues sont celles qu'un enfant repère
// sur un plan : le réservoir, la grande pelouse, le lac, l'allée du Mall, le
// pré aux moutons, l'étang du sud-est et le Harlem Meer, tout au nord.
// Les pièces d'eau du parc, à leurs vraies proportions. Le réservoir occupe
// environ la moitié de la largeur du parc et le quart de sa longueur ; dessiné
// trop grand — l'erreur du premier jet —, il transformait Central Park en lac.
// LA LISIÈRE, PAS LE PARC ENTIER. À trente-quatre blocs par kilomètre, le
// vrai parc ferait cent quarante blocs de long — le double de ce que la
// couverture peut tenir. On garde donc son angle sud-est, celui qu'on
// traverse en sortant de Midtown : l'étang, la patinoire de Wollman, les
// allées qui serpentent. Le réservoir, le lac et le Harlem Meer attendent
// que le monde grandisse ; les nommer ici aurait été les mentir.
function solDuParc(u, v) {
  const cu = (PARC.u0 + PARC.u1) / 2;
  const eau = (du, dv, ru, rv) => ((u - du) / ru) ** 2 + ((v - dv) / rv) ** 2 < 1;
  if (eau(cu + 14, vDeRue(61), 6, 4)) return BLOCK.WATER;     // The Pond, à la 59e
  // La patinoire de Wollman : de la pierre claire, pas de la glace — un
  // enfant qui la voit blanche en plein été ne comprendrait pas.
  if (eau(cu + 4, vDeRue(63), 4, 3)) return PIERRE_CLAIRE;
  // le mur d'enceinte sud, qui longe la 59e Rue
  if (v > PARC.v1 - 1) return TROTTOIR;
  // les allées sinueuses ; les pelouses restent nues
  if (Math.abs(Math.sin(u * 0.08 + v * 0.05)) < 0.04) return CITY_BLOCK.SIDEWALK;
  return BLOCK.GRASS;
}

// --- les immeubles, colonne par colonne ---------------------------------------
//
// Les autres villes posent leurs immeubles lot par lot, sur une grille carrée
// indépendante du dessin des rues. Ici c'est impossible : les avenues ne sont
// pas également espacées, Broadway coupe la grille en biais, et en bas de l'île
// chaque quartier a sa propre trame. Un pâté dessiné sur sa propre grille se
// serait retrouvé à cheval sur une chaussée.
//
// On procède donc comme pour le sol : une colonne, une décision. Les bords du
// pâté se déduisent des mêmes rues que celles qu'on vient de tracer, et tout
// tombe juste par construction.

// La silhouette de Manhattan n'est pas uniforme, et c'est ce qui la rend
// reconnaissable : deux massifs de tours — Midtown et la pointe financière —
// séparés par tout le bas de l'île, resté bas parce que le socle rocheux y
// plonge et que rien n'y a été rasé.
export function quartier(v) {
  if (v >= vK(95)) return 'finance';     // au sud de Chambers : la seconde forêt
  if (v >= BAS_V) return 'village';      // tout le bas de l'île, cinq à huit étages
  if (v >= vDeRue(34)) return 'chelsea'; // de la 14e à la 34e
  if (v >= vDeRue(59)) return 'midtown'; // de la 34e à la 59e : le plus haut
  return 'uptown';                       // au droit du parc
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
// À la nouvelle échelle un étage vaut à peu près un bloc : une tour de
// soixante blocs, c'est soixante étages, et Midtown ressemble enfin à
// Midtown. Le plafond du monde (160) et le sol de l'île (33) laissent cent
// vingt-cinq blocs — les plus hautes s'en tiennent aux deux tiers, les
// monuments gardent le dessus.
// La courbe compte autant que les bornes. Tirée à plat, elle donnait une
// forêt de crayons tous de la même taille — vue du ciel, une brosse. La
// vraie ville est un TAPIS de dix à vingt étages d'où sortent quelques
// tours : c'est ce que fait t³, qui garde la plupart des immeubles bas et
// n'envoie au sommet que le dernier dixième des tirages.
function hauteurQuartier(q, t) {
  const rare = t * t * t;
  switch (q) {
    case 'finance': return 12 + Math.floor(rare * 52);
    case 'midtown': return 14 + Math.floor(rare * 56);
    case 'chelsea': return 9 + Math.floor(t * t * 15);
    case 'village': return 6 + Math.floor(t * t * 8);
    default: return 8 + Math.floor(t * t * 10);
  }
}

// Un tirage stable : même pâté, même immeuble, à chaque visite.
function tirage(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Les bornes du pâté qui contient ce point : entre deux rues au nord et au sud,
// entre deux avenues à l'est et à l'ouest. Valable au-dessus de la 14e Rue,
// là où la grille de 1811 existe.
function lotDeLaGrille(u, v) {
  const kv = Math.floor(v / RUE_PAS);
  // Quatre rangs entre deux rues : c'est le rapport de la vraie ville —
  // dix-huit mètres de chaussée pour quatre-vingts de pâté — et ce sont les
  // pâtés MINCES et longs de Manhattan, larges d'une avenue à l'autre.
  const v0 = kv * RUE_PAS + 1, v1 = kv * RUE_PAS + RUE_PAS - 1;
  // les avenues sont rangées d'est en ouest : on cherche celles qui encadrent u
  let est = null, ouest = null;
  for (const a of AVENUES) {
    if (v > a.vFin) continue;
    if (a.u >= u && (est === null || a.u < est.u)) est = a;
    if (a.u <= u && (ouest === null || a.u > ouest.u)) ouest = a;
  }
  const u1 = est ? est.u - est.l - 2 : Math.floor(bordEst(v)) - 2;
  const u0 = ouest ? ouest.u + ouest.l + 2 : Math.ceil(bordOuest(v)) + 2;
  return { u0, u1, v0, v1, kv, ku: ouest ? ouest.u : 99 };
}

// En bas de l'île il n'y a pas de pâté rectangulaire à trouver : l'îlot est la
// case de la trame locale. Elle suffit à donner à chaque immeuble sa hauteur et
// sa couleur, stables d'une visite à l'autre.
function ilotDuBas(u, v) {
  const t = trameDe(u, v);
  // La pointe hollandaise n'a pas de trame : ses îlots sont de petits carrés de
  // trois blocs, ce qui donne à la skyline de Wall Street le désordre serré
  // qu'on lui connaît, chaque tour d'une hauteur différente de sa voisine.
  if (t === null) return { kv: Math.floor(v / 3), ku: Math.floor(u / 3) };
  const [a, b] = repere(t, u, v);
  return { kv: Math.round(a / t.pu), ku: Math.round(b / t.pv) };
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

// La hauteur de l'immeuble qui occupe ce point. La carte s'en sert pour teinter
// les pâtés sans fabriquer un seul bloc — c'est ce qui lui permet de dessiner
// l'île entière avant même qu'on y soit allé.
function hauteurIci(u, v) {
  const q = quartier(v);
  const lot = v > BAS_V ? ilotDuBas(u, v) : lotDeLaGrille(u, v);
  return hauteurQuartier(q, tirage(lot.kv, lot.ku, 811));
}

// Bâtit la colonne. `poser(dy, id)` place un bloc dy au-dessus du sol.
// Renvoie false s'il n'y a rien à bâtir ici.
export function batirColonne(x, z, poser, solDejaNul = false) {
  if (!solDejaNul && !lotConstructible(x, z)) return false;
  if (solDejaNul && (!surTerre(x, z) || versRive(x - NY.x, z - NY.z) >= -1)) return false;
  const u = x - NY.x, v = z - NY.z;
  const bas = v > BAS_V;
  const lot = bas ? ilotDuBas(u, v) : lotDeLaGrille(u, v);
  const q = quartier(v);
  const t = tirage(lot.kv, lot.ku, 811);
  let bh = hauteurQuartier(q, t);
  const mur = PALETTES[q][Math.floor(tirage(lot.kv, lot.ku, 812) * PALETTES[q].length) % PALETTES[q].length];

  // Où en est-on dans le pâté ? Un seul anneau de voisins suffit à savoir qu'on
  // est en façade — et c'est la seule chose dont le rez-de-chaussée ait besoin.
  // Sonder plus loin coûtait douze appels par colonne, soit trois millions par
  // morceau de monde.
  const oE = lotConstructible(x + 1, z), oO = lotConstructible(x - 1, z);
  const oS = lotConstructible(x, z + 1), oN = lotConstructible(x, z - 1);
  const interieur = oE && oO && oS && oN;
  // De combien de blocs cette colonne est-elle à l'intérieur ? Zéro sur la
  // façade. C'est ce nombre qui décide des retraits en hauteur : la loi de
  // zonage de 1916 imposait aux tours de se rétrécir en montant, pour que le
  // jour atteigne encore la rue. De là vient la silhouette en gradins des
  // gratte-ciel d'avant-guerre.
  // L'enfoncement ne se mesure QUE d'est en ouest : un pâté n'a que deux
  // rangs de profondeur, donc tout y est façade dans le sens nord-sud. Le
  // mesurer aussi en v aurait rendu tout enfoncement nul, et supprimé les
  // gradins de toute la ville d'un coup.
  let d = 0;
  if (interieur) d = bas ? 1 : Math.max(1, Math.min(u - lot.u0, lot.u1 - u));

  // Un immeuble ne peut pas être plus haut que son terrain ne le porte : une
  // tour de quarante blocs sur une emprise de trois, c'est un crayon, pas un
  // gratte-ciel. La vraie ville obéit à la même règle — les plus hautes tours
  // occupent les plus grands terrains.
  // Le rapport n'est pas celui d'une maquette : au sol un bloc vaut trente
  // mètres, en hauteur il vaut un étage. Un pâté de quatre rangs de
  // profondeur porte donc soixante-dix blocs de tour sans être un crayon —
  // c'est exactement ce que fait Manhattan, des tours minces sur des lots
  // étroits. La borne ne sert plus qu'aux chutes de terrain.
  const emprise = bas ? 6 : Math.min(lot.u1 - lot.u0, lot.v1 - lot.v0) + 1;
  bh = Math.min(bh, 10 + 14 * emprise);

  // Les gradins. À la nouvelle échelle ils se voient enfin : deux blocs de
  // retrait, puis quatre — la silhouette que le zonage de 1916 a imposée à
  // toute la ville d'avant-guerre, et qu'on reconnaît sur les photos.
  // Les retraits se mesurent à ce que le pâté peut porter : quatre rangs de
  // profondeur ne permettent pas de rentrer de quatre blocs, sinon la tour
  // s'arrête net aux trois quarts de sa hauteur — c'est ce qui donnait, vue
  // du ciel, une forêt de crayons décapités.
  const t1 = Math.floor(bh * 0.5), t2 = Math.floor(bh * 0.78);
  const retraitA = bas
    ? (y) => (bh < 26 || y < t1 ? 0 : 1)
    : (y) => (bh < 26 ? 0 : y < t1 ? 0 : y < t2 ? 1 : 2);

  // À chaque niveau, l'immeuble occupe le rectangle du pâté rentré de r blocs.
  // La colonne existe tant que son enfoncement le permet ; elle est en façade
  // quand les deux coïncident. Là où elle s'arrête commence une terrasse — et
  // c'est là que va la dalle. La première version posait cette dalle deux
  // niveaux au-dessus du dernier bloc posé : au-dessus des colonnes creuses,
  // elle flottait toute seule en plein ciel.
  //
  // Les fenêtres suivent la façade : le long d'un mur est-ouest c'est v qui les
  // égrène, le long d'un mur nord-sud c'est u. La première version en mettait
  // partout : les tours devenaient des cages de verre transparentes, et l'on
  // voyait le ciel au travers de Midtown.
  const face = (!oE || !oO) ? v : u;
  let toit = bh;
  for (let y = 0; y < bh; y++) {
    const r = retraitA(y);
    if (d < r) { toit = y; break; }
    if (d > r) { if (y === 0) poser(0, BLOCK.PLANK); continue; }   // l'intérieur
    // UNE FENÊTRE EST UN DESSIN, PAS UN TROU — et Manhattan était la pire de
    // toutes : 30,4 % de son volume bâti était du VERRE, donc un trou par
    // lequel on voyait l'intérieur creux des tours. Le commentaire du dessus
    // disait déjà « les tours devenaient des cages de verre transparentes » et
    // avait limité les fenêtres à la façade ; il restait à ne plus les percer
    // du tout. Chaque quartier garde SON matériau : le mur-rideau à meneaux
    // pour la finance et Midtown, les petits bois pour la brique du Village,
    // de Chelsea et de l'Upper East Side.
    const fenetre = y > 0 && y % 4 !== 0 && (face & 1) === 1;
    const baie = (q === 'finance' || q === 'midtown') ? CITY_BLOCK.CURTAIN : ARCHI.ETAGE;
    poser(y + 1, fenetre ? baie : mur);
  }
  poser(toit + 1, GRANIT);

  // Le château d'eau en bois sur le toit : la signature des immeubles bas de
  // la ville, et ce qu'on remarque en premier en levant les yeux.
  const auMilieu = bas
    ? (((u % 8) + 8) % 8 === 0 && ((v % 8) + 8) % 8 === 0)
    : ((u - lot.u0) === 1 && (v - lot.v0) === 1);
  if (bh < 20 && toit === bh && d === 1 && tirage(lot.kv, lot.ku, 813) < 0.4 && auMilieu) {
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
  // Les squares du bas de l'île et les pelouses de Roosevelt : du vert, sinon
  // Battery Park et Washington Square se lisaient comme du bitume.
  if (sol === BLOCK.GRASS || sol === BLOCK.LEAVES) return VERT_PELOUSE;
  if (sol === BLOCK.WATER) return EAU_PARC;
  if (sol === PIERRE_CLAIRE) return BEIGE_PLACE;
  if (sol !== null) return GRIS_RUE;        // rue, avenue, trottoir, Broadway
  // un pâté de maisons : la teinte dit la hauteur, donc le quartier
  const clair = Math.min(1, hauteurIci(u, v) / 40);
  return [148 + clair * 60, 146 + clair * 58, 144 + clair * 62];
}

// LA CIRCULATION DE MANHATTAN. Les villes générées ont leurs anneaux
// (villesmonde.js) ; New York, bâtie à la main, n'en avait aucun — pas une
// voiture sur la 5e Avenue. Ces deux boucles suivent de VRAIES avenues et
// de VRAIES rues, choisies parce qu'elles se croisent : Midtown autour de
// Times Square, et le bas de l'île autour de Washington Square. Les points
// tombent au milieu de la chaussée, là où les voitures roulent.
export function tracesCirculationNY(solDe) {
  const y = solDe(NY.x, NY.z) + 1.05;
  const boucles = [
    // Midtown : la 5e et la 8e Avenue, de la 34e à la 59e Rue
    [[uK(0), vDeRue(34)], [uK(-16), vDeRue(34)], [uK(-16), vDeRue(59)], [uK(0), vDeRue(59)]],
    // le bas de l'île : la 5e et la 6e, de la 14e à la 23e
    [[uK(0), vDeRue(14)], [uK(-6), vDeRue(14)], [uK(-6), vDeRue(23)], [uK(0), vDeRue(23)]],
  ];
  return boucles.map((pts, rang) => ({
    cle: 'ny', x: NY.x, z: NY.z, rang,
    pts: pts.map(([u, v]) => ({ x: NY.x + u, y, z: NY.z + v })),
  }));
}

// --- les monuments -------------------------------------------------------------
//
// Chacun est à sa vraie adresse, ramenée à notre grille. Ils sont déclarés ici
// plutôt que dans world.js pour une raison simple : le générateur d'immeubles
// doit connaître leur emprise, sinon il bâtirait par-dessus.
//
// Au nord de la 14e Rue l'adresse est un numéro de rue, et suit donc l'échelle
// toute seule. Au sud, les rues n'ont pas de numéro : l'adresse est alors
// donnée en blocs depuis la pointe de Battery, comme le reste du bas de l'île.
export const MONUMENTS = [
  { nom: 'Empire State', u: uK(1), v: vDeRue(34), box: 8 },         // 350 Cinquième Avenue
  // Chrysler et Grand Central se touchent dans la vraie ville — la gare
  // occupe tout l'îlot de Park à Lexington, la tour est juste en face. Ici
  // la tour est poussée d'un demi-îlot à l'est pour que les deux emprises
  // se rangent côte à côte au lieu de se marcher dessus.
  { nom: 'Chrysler Building', u: uK(15), v: vDeRue(42), box: 6 },   // 42e et Lexington
  { nom: 'Grand Central', u: uK(8), v: vDeRue(43), box: 11, bv: 8 }, // 42e et Park
  { nom: 'Flatiron', u: uK(1), v: vDeRue(23), box: 7, bv: 10 },     // 23e, Broadway et la 5e
  { nom: 'Rockefeller Center', u: uK(-2), v: vDeRue(50), box: 8 },  // entre la 5e et la 6e
  // One WTC recule d'un îlot vers l'Hudson (son vrai coin, Vesey et West
  // Street) : à sa place exacte, son emprise de treize blocs recouvrait
  // Trinity Church, qui est pourtant à deux rues de là.
  { nom: 'One World Trade Center', u: uK(-9), v: vK(97), box: 9 },
  { nom: 'Times Square', u: uK(-11), v: vDeRue(45), box: 15, bv: 16 },
  { nom: 'Bourse de New York', u: uK(3), v: vK(105), box: 7 },      // Wall Street et Broad
  { nom: 'Trinity Church', u: uK(-2), v: vK(101), box: 6, bu: 7 },  // sur Broadway, face à Wall Street
  { nom: 'Arche de Washington', u: uK(-2), v: vK(67), box: 9, bv: 5 },
];

const dansMonument = (u, v) =>
  MONUMENTS.some((m) => Math.abs(u - m.u) <= (m.bu || m.box) + 1 && Math.abs(v - m.v) <= (m.bv || m.box) + 1);

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
  // Cent deux étages, et à cette échelle un bloc vaut à peu près un étage :
  // la base de cinq étages, les deux grands retraits, puis le fût, comme sur
  // les photos de 1931.
  // DEUX ÉCHELLES, ET C'EST VOULU. Au sol, un bloc vaut trente mètres ; en
  // hauteur, un étage. Un gratte-ciel est donc plus élancé ici que dans la
  // vraie vie — c'est la convention de tout le jeu (l'obélisque de
  // Washington la suit depuis v162) et c'est elle qui rend une skyline
  // lisible. Mais l'emprise, elle, suit le SOL : l'Empire State fait cent
  // trente mètres de côté, donc quatre à sept blocs — pas vingt-six, qui en
  // auraient fait un plateau.
  let y = tourGradins(set, [[7, 8], [5, 46], [4, 72]], PIERRE_CLAIRE, VERRE);
  for (; y < 96; y++) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        if (Math.abs(dx) !== 3 && Math.abs(dz) !== 3) continue;
        const uu = Math.abs(dx) === 3 ? dz : dx;
        set(dx, y, dz, y % 4 !== 0 && (uu & 1) === 1 ? VERRE : PIERRE_CLAIRE);
      }
    }
  }
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) set(dx, y, dz, GRANIT);
  // la couronne à gradins, puis le mât d'amarrage des dirigeables
  for (let k = 0; k < 3; k++) {
    const demi = 3 - k;
    for (let dx = -demi; dx <= demi; dx++) {
      for (let dz = -demi; dz <= demi; dz++) set(dx, y + 1 + k, dz, k === 2 ? ACIER : PIERRE_CLAIRE);
    }
  }
  y += 4;
  for (let k = 0; k < 8; k++) set(0, y + k, 0, ACIER);
  set(0, y + 8, 0, VERRE);                                    // le phare, tout en haut
}

// Le Chrysler : sa couronne d'arcs en acier inoxydable, et sa longue aiguille.
export function buildChrysler(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  let y = tourGradins(set, [[5, 12], [4, 56]], BRIQUE_ROUGE, VERRE);
  // la couronne : sept arcs de plus en plus petits, en acier inoxydable,
  // chacun percé de ses fenêtres triangulaires — c'est elle qu'on reconnaît
  // à des kilomètres, bien avant la tour qui la porte.
  for (let k = 0; k < 7; k++) {
    const demi = Math.max(1, 4 - Math.floor(k * 0.6));
    for (let dx = -demi; dx <= demi; dx++) {
      for (let dz = -demi; dz <= demi; dz++) {
        if (Math.abs(dx) === demi || Math.abs(dz) === demi) set(dx, y, dz, ACIER);
      }
    }
    for (const s of [-1, 1]) { set(0, y, s * demi, VERRE); set(s * demi, y, 0, VERRE); }
    y += 2;
  }
  for (let k = 0; k < 14; k++) set(0, y + k, 0, ACIER);       // l'aiguille
}

// Le Flatiron : un fer à repasser, coincé dans l'angle aigu que Broadway
// découpe en croisant la 5e Avenue. Sa forme vient entièrement de là.
export function buildFlatiron(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const H = 38;
  for (let dz = -9; dz <= 9; dz++) {
    // le triangle s'affine vers le nord : c'est la pointe qu'on photographie
    const demi = Math.min(6, Math.max(0, Math.round((dz + 9) / 2.6)));
    for (let dx = -demi; dx <= demi; dx++) {
      const bord = Math.abs(dx) === demi || dz === -9 || dz === 9;
      for (let y = 0; y < H; y++) {
        if (!bord) continue;
        const fen = y % 4 !== 0 && ((dx + dz) & 1) === 1;
        set(dx, y, dz, fen ? VERRE : PIERRE_CLAIRE);
      }
      set(dx, H, dz, CUIVRE);       // la corniche de cuivre patiné
      if (Math.abs(dx) === demi || dz === -9 || dz === 9) set(dx, H + 1, dz, PIERRE_CLAIRE);
    }
  }
}

// One World Trade Center : un carré qui se change en octogone en montant, puis
// se referme en un carré tourné de quarante-cinq degrés. Et sa flèche, qui
// porte l'immeuble à 1776 pieds — l'année de l'indépendance.
export function buildOneWTC(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  // Cent quatre blocs de verre et dix-huit de flèche : mille sept cent
  // soixante-seize pieds à notre échelle, et le plus haut de l'île — comme
  // il se doit. Sol à 33, sommet à 155 : sous le plafond du monde, de trois
  // blocs.
  const H = 104;
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const demi = 8 - Math.round(t * 3);
    for (let dx = -demi; dx <= demi; dx++) {
      for (let dz = -demi; dz <= demi; dz++) {
        const bord = Math.abs(dx) === demi || Math.abs(dz) === demi;
        if (!bord) continue;
        // les angles se biseautent à mesure qu'on monte : le carré devient octogone
        const coin = Math.abs(dx) === demi && Math.abs(dz) === demi;
        if (coin && t > 0.15 && ((y + dx + dz) & 1) === 0) continue;
        set(dx, y, dz, VERRE_BLEU);
      }
    }
  }
  for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) set(dx, H, dz, GRANIT);
  for (let k = 1; k <= 18; k++) set(0, H + k, 0, ACIER);      // la flèche
  set(0, H + 19, 0, VERRE);
}

// Grand Central : une gare basse et large, sa façade à trois grandes arches et
// son horloge. On ne la remarque pas de loin — mais on la cherche à pied.
export function buildGrandCentral(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const H = 16;
  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -7; dz <= 7; dz++) {
      const bord = Math.abs(dx) === 10 || Math.abs(dz) === 7;
      for (let y = 0; y < H; y++) if (bord) set(dx, y, dz, PIERRE_CLAIRE);
      // la verrière du grand hall, en bandes : c'est par elle que tombent
      // les rayons de lumière qu'on voit sur toutes les photos
      set(dx, H, dz, (!bord && (dx & 1) === 0) ? VERRE : PIERRE_CLAIRE);
    }
  }
  // les trois grandes arches de la façade sud, et l'horloge au-dessus de
  // celle du milieu — quatre blocs de large, neuf de haut
  for (const ax of [-6, 0, 6]) {
    for (let y = 1; y <= 9; y++) {
      for (let dx = -1; dx <= 1; dx++) set(ax + dx, y, 7, BLOCK.AIR);
    }
    for (let dx = -1; dx <= 1; dx++) set(ax + dx, 10, 7, VERRE);
  }
  for (let dx = -1; dx <= 0; dx++) for (let dy = 12; dy <= 13; dy++) set(dx, dy, 7, JAUNE_TAXI);  // l'horloge
  // la corniche et les statues du fronton
  for (let dx = -10; dx <= 10; dx++) set(dx, H + 1, 7, CUIVRE);
  for (const dx of [-10, 0, 10]) for (let k = 1; k <= 3; k++) set(dx, H + k, 0, PIERRE_CLAIRE);
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
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const bord = Math.abs(dx) === 3 || Math.abs(dz) === 2;
      for (let y = 0; y <= 9; y++) if (bord) set(dx, y, dz, PIERRE_CLAIRE);
      set(dx, 10, dz, PIERRE_CLAIRE);
    }
  }
  // les colonnes de la façade nord, tournée vers Wall Street, et le fronton
  for (let dx = -3; dx <= 3; dx += 2) for (let y = 0; y <= 8; y++) set(dx, y, -3, PIERRE_CLAIRE);
  for (let k = 0; k <= 2; k++) {
    for (let dx = -3 + k; dx <= 3 - k; dx++) set(dx, 9 + k, -3, PIERRE_CLAIRE);
  }
  // le drapeau, tendu sur toute la colonnade
  for (let dx = -2; dx <= 2; dx++) {
    for (let y = 5; y <= 8; y++) set(dx, y, -4, dx < -1 ? VERRE_BLEU : ((y + dx) & 1 ? BRIQUE_ROUGE : PIERRE_CLAIRE));
  }
}

// Trinity Church : la flèche noire au bout de Wall Street. Pendant cinquante
// ans, c'était le plus haut point de New York — d'où le fait qu'elle regarde
// encore la rue dans l'axe.
export function buildTrinity(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  // La nef court d'ouest en est, dans l'axe de Wall Street : c'est la vue que
  // tout le monde connaît, la flèche qui ferme la perspective de la rue.
  for (let dx = -2; dx <= 8; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const bord = dx === 8 || Math.abs(dz) === 2;
      for (let y = 0; y <= 8; y++) if (bord) set(dx, y, dz, GRANIT);
      set(dx, 9, dz, ARDOISE);
    }
  }
  for (let dx = -1; dx <= 7; dx += 2) { set(dx, 5, -2, VERRE); set(dx, 5, 2, VERRE); }
  for (let y = 0; y <= 2; y++) set(8, y, 0, BLOCK.AIR);        // le portail, plein est
  // le clocher, à l'ouest, sur Broadway
  for (let y = 0; y <= 20; y++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -6; dx <= -2; dx++) {
        if (Math.abs(dz) === 2 || dx === -6 || dx === -2) set(dx, y, dz, GRANIT);
      }
    }
  }
  for (let k = 0; k <= 5; k++) {
    const r = 2 - Math.floor(k / 2);
    for (let dz = -r; dz <= r; dz++) for (let dx = -4 - r; dx <= -4 + r; dx++) set(dx, 21 + k, dz, ARDOISE);
  }
  for (let y = 14; y <= 17; y++) { set(-6, y, 0, VERRE); set(-2, y, 0, VERRE); }
  set(-4, 27, 0, BLOCK.GOLD);   // la croix
}

// L'arche de Washington Square : le pied de la Cinquième Avenue, en marbre
// blanc. C'est là que l'avenue commence — et c'est ce qui explique qu'elle ne
// descende pas plus bas.
export function buildArcheWashington(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  for (const dx of [-3, 3]) {
    for (let y = 0; y <= 8; y++) {
      for (let dz = -1; dz <= 1; dz++) set(dx, y, dz, PIERRE_CLAIRE);
    }
  }
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -1; dz <= 1; dz++) { set(dx, 9, dz, PIERRE_CLAIRE); set(dx, 10, dz, PIERRE_CLAIRE); }
  }
  for (const dx of [-2, 2]) for (let dz = -1; dz <= 1; dz++) set(dx, 8, dz, PIERRE_CLAIRE);
  set(0, 11, 0, PIERRE_CLAIRE);
}

// Times Square : le carrefour le plus éclairé du monde. Ce qu'on en retient,
// ce ne sont pas les immeubles mais leurs façades d'écrans, du sol au toit —
// alors c'est cela qu'on bâtit, en bandes de couleurs vives.
export function buildTimesSquare(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  // Les couleurs des panneaux : des aplats francs, tenus. Une publicité, ça
  // ne dégrade pas — c'est un rectangle d'une couleur, et c'est justement
  // pour ça qu'on la voit de l'autre bout de la place.
  const PUBS = [uni(0), uni(2), uni(9), uni(6), uni(14), uni(4), uni(10)];

  // LE NŒUD PAPILLON. Broadway et la 7e Avenue se croisent en X entre la 42e
  // et la 47e Rue, et ce croisement laisse deux triangles ouverts : c'est ça,
  // Times Square — pas une place carrée mais deux échancrures face à face,
  // bordées de tours dont les façades sont des écrans du sol au toit.
  const tours = [
    [-10, -14, 42], [10, -12, 36], [-11, -2, 46],
    [11, 0, 38], [-9, 10, 34], [10, 8, 40],
  ];
  for (const [cx, cz, h] of tours) {
    const graine = Math.abs(cx * 7 + cz * 13);
    for (let y = 0; y < h; y++) {
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          if (Math.abs(dx) !== 3 && Math.abs(dz) !== 3) continue;
          // la façade tournée vers la place est un mur d'écrans ; les autres
          // sont de l'acier ordinaire — comme dans la vraie ville, où les
          // panneaux ne regardent que le carrefour
          const versPlace = (cx < 0 ? dx === 3 : dx === -3);
          if (!versPlace || y < 3) { set(cx + dx, y, cz + dz, ACIER); continue; }
          // UNE PUB, UN APLAT. Des bandes de quatre rangs, chacune d'UNE
          // seule couleur sur toute la largeur de la façade, séparées par
          // une réglette sombre. La première version tirait la couleur par
          // colonne : de loin, un damier de confettis — le défaut que Max
          // avait déjà relevé sur les marquages au sol et les auvents. Une
          // enseigne se lit à cent mètres parce que c'est un rectangle
          // d'une couleur, pas une mosaïque.
          const bande = Math.floor((y - 3) / 5);
          const reglette = (y - 3) % 5 === 4;
          set(cx + dx, y, cz + dz,
            reglette ? ARDOISE : PUBS[(graine + bande * 3) % PUBS.length]);
        }
      }
    }
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) set(cx + dx, h, cz + dz, GRANIT);
  }

  // ONE TIMES SQUARE : la tour de la boule, plantée dans la pointe sud du
  // nœud papillon. C'est elle qu'on regarde le 31 décembre.
  for (let y = 0; y < 40; y++) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        if (Math.abs(dx) !== 3 && Math.abs(dz) !== 3) continue;
        const ecran = y > 4 && (dz === 3 || dx === -3 || dx === 3);
        const bande = Math.floor((y - 5) / 6);
        set(dx, y, -20 + dz,
          ecran ? ((y - 5) % 6 === 5 ? ARDOISE : PUBS[(bande * 2 + 1) % PUBS.length]) : GRANIT);
      }
    }
  }
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) set(dx, 40, -20 + dz, GRANIT);
  for (let k = 1; k <= 12; k++) set(0, 40 + k, -20, ACIER);          // le mât
  for (let dx = -1; dx <= 1; dx++) {                                  // LA BOULE
    for (let dy = 0; dy <= 2; dy++) {
      for (let dz = -1; dz <= 1; dz++) set(dx, 53 + dy, -20 + dz, BLOCK.DIAMOND);
    }
  }

  // LES GRADINS ROUGES DE TKTS : sept marches de verre rouge au milieu de la
  // place, la billetterie dessous. On s'y assied pour regarder les écrans, et
  // c'est la photo que tout le monde rapporte.
  for (let k = 0; k <= 6; k++) {
    for (let dx = -5; dx <= 5; dx++) set(dx, k, 3 + k, BRIQUE_ROUGE);
  }
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = 3; dz <= 5; dz++) set(dx, 0, dz, VERRE);
  }

  // LES BANDEAUX LUMINEUX au ras des façades — les « zippers », ces rubans
  // de texte qui font le tour des immeubles au niveau du premier étage.
  for (const [cx, cz] of [[-10, -14], [10, -12], [-11, -2], [11, 0]]) {
    const face = cx < 0 ? 3 : -3;
    for (let dz = -3; dz <= 3; dz++) {
      for (let y = 4; y <= 5; y++) {
        set(cx + face, y, cz + dz, ((dz + y) & 1) === 0 ? BLOCK.GOLD : ARDOISE);
      }
    }
  }
}

// Liberty Island : l'étoile de pierre du vieux fort, le socle, et la statue
// verte qui lève son flambeau. Elle regarde vers le large, comme la vraie.
export function buildLiberte(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  // l'île et le fort en étoile à onze branches
  for (let dx = -16; dx <= 16; dx++) {
    for (let dz = -16; dz <= 16; dz++) {
      const d = Math.hypot(dx, dz);
      const branche = Math.abs(Math.sin(Math.atan2(dz, dx) * 5.5));
      if (d > 14 + branche * 2.5) continue;
      set(dx, -1, dz, d > 10 ? GRANIT : BLOCK.GRASS);
    }
  }
  // le socle, en trois gradins
  for (let y = 0; y <= 11; y++) {
    const r = y < 4 ? 9 : y < 8 ? 7 : 5;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (y < 11 && Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        set(dx, y, dz, GRANIT);
      }
    }
  }
  // la robe, qui s'affine en montant
  for (let y = 12; y <= 37; y++) {
    const r = y < 20 ? 4 : y < 30 ? 3 : 2;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        // les plis de la robe : la façade n'est pas lisse
        if (Math.abs(dx) !== r && Math.abs(dz) !== r && y > 13) continue;
        set(dx, y, dz, CUIVRE);
      }
    }
  }
  // la tête et la couronne à sept pointes — une par continent
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) set(dx, 38, dz, CUIVRE);
  for (let y = 39; y <= 41; y++) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(dx, y, dz, CUIVRE);
  }
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    set(Math.round(Math.cos(a) * 2), 42, Math.round(Math.sin(a) * 2), CUIVRE);
  }
  // le bras levé et le flambeau, tout en haut
  for (let y = 34; y <= 48; y++) set(5, y, 0, CUIVRE);
  set(5, 49, 0, CUIVRE);
  for (let dx = 4; dx <= 6; dx++) for (let dz = -1; dz <= 1; dz++) set(dx, 50, dz, BLOCK.GOLD);
  set(5, 51, 0, BLOCK.GOLD);                                   // la flamme
  // la tablette, tenue de l'autre bras
  for (let y = 26; y <= 31; y++) { set(-4, y, 0, PIERRE_CLAIRE); set(-4, y, 1, PIERRE_CLAIRE); }
}

// Le pont de Brooklyn : deux tours de granit percées de deux arches gothiques,
// et les câbles en éventail. C'est le premier pont suspendu en acier du monde,
// et la silhouette qu'on met sur les cartes postales.
export function buildBrooklyn(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const TABLIER = 14;
  // le tablier, d'une rive à l'autre — l'East River fait maintenant cent
  // vingt blocs de large, et le pont les franchit tous
  for (let dx = -60; dx <= 60; dx++) {
    const h = TABLIER + Math.round(Math.cos((dx / 60) * Math.PI) * -4);
    for (let dz = -5; dz <= 5; dz++) set(dx, h, dz, Math.abs(dz) === 5 ? GRANIT : PAVE_SOMBRE);
    // les câbles porteurs, en chaînette entre les deux tours
    const cable = h + 22 + Math.round(Math.cos((dx / 38) * Math.PI) * -16);
    if (Math.abs(dx) < 39) for (const dz of [-5, 5]) set(dx, cable, dz, ACIER);
  }
  // les deux tours de granit, leurs piles dans l'eau
  for (const tx of [-38, 38]) {
    for (let y = -6; y <= TABLIER + 30; y++) {
      for (let dz = -6; dz <= 6; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dz) > 4 && Math.abs(dx) < 2) continue;
          set(tx + dx, y, dz, GRANIT);
        }
      }
    }
    // les deux arches gothiques : le vide en ogive, pas un simple trou
    for (const z0 of [-3, 3]) {
      for (let y = TABLIER + 1; y <= TABLIER + 14; y++) {
        const demi = y < TABLIER + 10 ? 2 : Math.max(0, 2 - (y - TABLIER - 9));
        for (let dz = -demi; dz <= demi; dz++) {
          for (let dx = -2; dx <= 2; dx++) set(tx + dx, y, z0 + dz, BLOCK.AIR);
        }
      }
    }
  }
}

// Les deux autres ponts de l'East River, ceux dans lesquels débouchent Canal
// Street et Delancey Street. Ils ne sont pas en pierre mais en acier ajouré,
// et c'est ce qui les distingue du pont de Brooklyn quand on les voit ensemble
// depuis la pointe de l'île — ce qui arrive tout le temps.
export function buildPontAcier(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const TABLIER = 12;
  for (let dx = -52; dx <= 52; dx++) {
    for (let dz = -4; dz <= 4; dz++) set(dx, TABLIER, dz, Math.abs(dz) === 4 ? ACIER : PAVE_SOMBRE);
    // le câble, en chaînette entre les deux tours
    const cable = TABLIER + 26 + Math.round(Math.cos((dx / 32) * Math.PI) * -16);
    if (Math.abs(dx) < 33) for (const dz of [-4, 4]) set(dx, cable, dz, ACIER);
    // les piles dans l'eau, tous les douze blocs
    if (Math.abs(dx) > 33 && dx % 12 === 0) {
      for (let y = -4; y < TABLIER; y++) for (const dz of [-4, 4]) set(dx, y, dz, ACIER);
    }
  }
  for (const tx of [-32, 32]) {
    for (let y = -4; y <= TABLIER + 30; y++) {
      for (const dz of [-4, 4]) { set(tx, y, dz, ACIER); set(tx, y, 0, y > TABLIER ? ACIER : BLOCK.AIR); }
    }
    for (let dz = -4; dz <= 4; dz++) set(tx, TABLIER + 30, dz, ACIER);
  }
}
