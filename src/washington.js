// Washington — le cœur monumental, à hauteur d'enfant.
//
// Une capitale qui ne ressemble à aucune autre ville américaine, et pour trois
// raisons qu'un enfant voit en dix secondes sur une photo aérienne.
//
// D'abord **le plan de L'Enfant** (1791). Une grille ordinaire — rues
// numérotées du nord au sud, rues lettrées d'est en ouest — mais **fendue en
// diagonale** par de grandes avenues nommées d'après les États, qui se coupent
// sur des ronds-points. La grille vient d'Amérique, les diagonales viennent de
// Versailles : L'Enfant était français. C'est ce croisement-là qu'on lit sur un
// plan de Washington avant tout le reste.
//
// Ensuite **le Mall**. Pas un parc : un axe. Le Capitole à un bout, le monument
// de Washington au milieu, le Lincoln Memorial à l'autre bout, et LES DOUZE
// MUSÉES alignés de part et d'autre de la pelouse. Rien d'autre au monde n'est
// bâti comme ça.
//
// Enfin — et c'est le plus surprenant — **il n'y a pas de gratte-ciel**. La loi
// de 1910 (*Height of Buildings Act*) plafonne les immeubles à la largeur de la
// rue plus vingt pieds, cent trente pieds au maximum. Résultat : une ville
// basse et plate d'où seuls émergent le dôme du Capitole, l'obélisque et les
// clochers. Après Manhattan, c'est le contraste qui frappe — et il est voulu.
//
// **Le point zéro de la ville est le Capitole.** Ce n'est pas une commodité de
// programmeur : c'est la vérité du plan. Les quatre quadrants rayonnent de la
// coupole, les rues se numérotent à partir d'elle, et une adresse à Washington
// se lit comme des coordonnées. Le module fait pareil.
//
// --- l'échelle ---------------------------------------------------------------
//
// **Quarante-huit blocs par kilomètre** (un bloc ≈ vingt et un mètres), trois
// fois l'échelle de la première version — parce que la première version était
// une maquette qu'on survolait, pas une ville qu'on habitait. À ce prix, la
// carte ne couvre plus tout le District : elle couvre **le cœur monumental**,
// du cimetière d'Arlington à Union Station et de Dupont Circle au Pentagone.
// Ce qui déborde — la Cathédrale nationale, Georgetown University, Rosslyn —
// attend que la carte du monde grandisse.
//
// Chaque lieu est donné par sa vraie latitude et sa vraie longitude ; `de()`
// fait le reste. Le jour où l'échelle change, toute la ville suit.
//
// Trois entorses, les seules, toutes déclarées ici :
//
//   · **les monuments sont dessinés deux à trois fois trop grands** — plus
//     l'obélisque, six fois trop large pour porter son colimaçon. C'est tout :
//     à cette échelle, un musée de deux cents mètres fait dix blocs de large
//     pour de vrai, et la plupart des grands bâtiments sont à leur taille.
//   · **les îlots sont agrandis d'un facteur 1,7** (`PAS_RUE` = 12 pour des
//     rues vraies tous les sept blocs) : c'est ce qui donne à chaque maison la
//     place d'un étage et d'un escalier.
//   · **quelques écarts de position, chacun commenté à sa ligne** : le
//     cimetière d'Arlington rentré de huit blocs (le bord du monde le coupait),
//     la station Pentagon remontée sur l'esplanade, deux musées mitoyens
//     décalés d'un bloc pour ne pas se toucher.
//
// Le reste — les rives, les collines, le tracé des avenues, les stations de
// métro — est à sa place réelle, calculé et non deviné.

import { BLOCK, CITY_BLOCK, DECOR_START, PROP_START, ARCHI } from './blocks.js';
import { rangerVoies, solDesVoies, fabriqueCircuits } from './voies.js';
import { positionDe } from './mondes.js';

const uni = (c) => DECOR_START + c * 10;

// --- la palette --------------------------------------------------------------
//
// Washington est une ville de calcaire et de brique. Le marbre blanc est
// réservé aux monuments ; le calcaire crème fait les ministères ; la brique
// rouge fait les maisons de ville, sur Capitol Hill comme autour de Logan
// Circle.

const MARBRE = uni(27);          // le marbre blanc des monuments
const CALCAIRE = uni(28);        // le calcaire crème des ministères
const GRANIT = CITY_BLOCK.GRANITE;
const BRIQUE = BLOCK.BRICK;      // les maisons de ville
const BRIQUE_SOMBRE = uni(18);
const TUILE = BLOCK.TERRACOTTA;  // les toits rouges du Triangle fédéral
const ARDOISE = uni(25);
const ACIER = uni(24);
const VERRE = BLOCK.GLASS;
const VERRE_BLEU = CITY_BLOCK.CURTAIN;
const BETON = BLOCK.STONEBRICK;
const BETON_CLAIR = uni(23);
const PLANCHER = BLOCK.PLANK;

const BITUME = CITY_BLOCK.ASPHALT;
const TROTTOIR = CITY_BLOCK.SIDEWALK;
const LIGNE = CITY_BLOCK.ROADLINE;
const PASSAGE = CITY_BLOCK.CROSSWALK;

const HERBE = BLOCK.GRASS;
const EAU = BLOCK.WATER;
const ARBRE = BLOCK.LEAVES;

// UN ARBRE NE POUSSE PAS DANS UN MUSÉE. `solWashington` rend ARBRE comme un
// identifiant de SOL, et c'est `world.js` qui en fait pousser le fût et la
// couronne (`arbreDeVille`) — jusqu'à la v205 il ne le faisait pas pour
// Washington, et les ormes du Mall étaient de la pelouse sur le gravier. Mais
// les monuments se posent APRÈS les colonnes, et n'écrivent que leurs propres
// blocs : un arbre planté sous l'emprise d'un musée y survit, DEDANS, tronc et
// feuillage dans la rotonde. Mesuré avant le remède : 892 colonnes d'arbre
// sous une emprise de monument, 172 rien que sous le Pentagone. Même chose
// pour une bouche de métro. Là où un arbre ne peut pas pousser, on rend le sol
// d'à côté.
function arbreOu(u, v, sinon) {
  return surMonument(u, v) || surBouche(u, v) ? sinon : ARBRE;
}
const GRAVIER = BLOCK.GRAVEL;    // les allées de sable du Mall
const SABLE = BLOCK.SAND;
const CERISIER = uni(15);        // les cerisiers du Tidal Basin, en fleur

// Le métro : les matières de Harry Weese.
const CARREAU = uni(18);         // le carrelage hexagonal brun, marque de fabrique
const QUAI_BORD = uni(26);       // le granit noir du bord de quai
const RAIL = uni(24);            // l'acier des rails
const TRAVERSE = uni(6);         // les traverses sombres sous les rails

// --- l'ancre et la conversion -------------------------------------------------

const CAPITOLE_LAT = 38.88972;
const CAPITOLE_LON = -77.00889;

const BLOCS_PAR_KM = 48;
const KM_PAR_DEGRE_LAT = 110.99;
const KM_PAR_DEGRE_LON = 86.65;   // à 38,9° de latitude nord

const PAR_LAT = KM_PAR_DEGRE_LAT * BLOCS_PAR_KM;
const PAR_LON = KM_PAR_DEGRE_LON * BLOCS_PAR_KM;

// (lat, lon) → (u, v) : u vers l'est, v vers le sud, le Capitole en (0, 0).
const de = (lat, lon) => [
  Math.round((lon - CAPITOLE_LON) * PAR_LON),
  Math.round((CAPITOLE_LAT - lat) * PAR_LAT),
];

// Où le Capitole se pose dans le monde. La ville occupe la bande au sud du
// château médiéval, entre le volcan et Nice — le seul rectangle de trois cents
// blocs encore libre — et son coin sud-est plonge dans la mer existante, qui
// joue l'estuaire du Potomac. C'est la disposition vraie : la ville sur la
// rive nord, le fleuve qui s'élargit vers le sud-est.
export const WASHINGTON = positionDe('washington');

export const BOITE = { u0: -244, u1: 67, v0: -109, v1: 96 };
export const WASHINGTON_R = 187;   // le cercle qui contient la boîte

const dansBoite = (u, v) => u >= BOITE.u0 && u <= BOITE.u1 && v >= BOITE.v0 && v <= BOITE.v1;

// Le relief de la capitale se fond dans la campagne sur les dix derniers blocs
// de son emprise. ZONE_WASHINGTON est l'emprise TOTALE de cette influence —
// c'est elle que `plafond.js` vérifie : dehors, pas un bloc ne bouge.
const MARGE = 10;
function partDeVille(u, v) {
  const du = Math.max(BOITE.u0 - u, 0, u - BOITE.u1);
  const dv = Math.max(BOITE.v0 - v, 0, v - BOITE.v1);
  const d = Math.max(du, dv);
  if (d >= MARGE) return 0;
  return 1 - d / MARGE;
}

export const ZONE_WASHINGTON = {
  x0: WASHINGTON.x + BOITE.u0 - MARGE, x1: WASHINGTON.x + BOITE.u1 + MARGE,
  z0: WASHINGTON.z + BOITE.v0 - MARGE, z1: WASHINGTON.z + BOITE.v1 + MARGE,
};

export function surTerreWashington(x, z) {
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  if (!dansBoite(u, v)) return false;
  return !surEauWashington(u, v);
}

// L'eau DE LA CAPITALE — le Potomac, l'Anacostia, le bassin. `cityAt` s'arrête
// à la rive, mais le générateur doit quand même bâtir sur ces colonnes-là :
// le tunnel de la Bleue passe sous le fleuve, le pont de la Jaune au-dessus.
export function dansEauWashington(x, z) {
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  return dansBoite(u, v) && surEauWashington(u, v);
}

// --- l'eau --------------------------------------------------------------------
//
// Le Potomac descend du nord-ouest, longe Georgetown, passe sous le pont du
// Mémorial et s'élargit plein sud en estuaire — c'est lui qui rejoint la mer
// du monde au bord sud de l'emprise. L'Anacostia le rejoint par l'est, le
// Washington Channel s'en détache derrière East Potomac Park, et le Tidal
// Basin est la poche d'eau au pied du Jefferson.

const POTOMAC = [
  [-244, -84], [-232, -70], [-220, -56], [-210, -42], [-203, -26],
  [-199, -10], [-197, 6], [-193, 22], [-186, 38], [-176, 54],
  [-163, 70], [-148, 84], [-132, 96], [-116, 106],
];
const ANACOSTIA = [
  [67, 48], [52, 56], [36, 64], [18, 73], [0, 82], [-20, 92], [-40, 100],
];

// La largeur du Potomac grandit vers l'aval — quatorze blocs à Georgetown,
// vingt-six à l'estuaire, comme le vrai (300 m puis 1 200 m).
const largeurPotomac = (v) => (v < -40 ? 7 : v < 0 ? 8.5 : v < 40 ? 10 : v < 70 ? 12 : 14);
const largeurAnacostia = (v) => (v < 50 ? 4.5 : 6);

// Distance d'un point à une polyligne, plus l'ordonnée du point le plus proche
// (elle sert à faire varier la largeur le long du fleuve).
function versLigne(pts, u, v) {
  let d = 1e9, vy = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [au, av] = pts[i], [bu, bv] = pts[i + 1];
    const du = bu - au, dv = bv - av;
    const len2 = du * du + dv * dv;
    let t = len2 > 0 ? ((u - au) * du + (v - av) * dv) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dd = Math.hypot(u - (au + t * du), v - (av + t * dv));
    if (dd < d) { d = dd; vy = av + t * dv; }
  }
  return { d, v: vy };
}

// Le Tidal Basin, au pied du Jefferson. Le mémorial FDR est sur sa rive
// ouest : le bassin est calibré pour que ses quatre salles restent au sec.
const BASSIN = { u: -125, v: 36, ru: 10, rv: 8 };
const dansBassin = (u, v, marge = 0) =>
  ((u - BASSIN.u) / (BASSIN.ru + marge)) ** 2 + ((v - BASSIN.v) / (BASSIN.rv + marge)) ** 2 < 1;

// Le Washington Channel, entre East Potomac Park et le front de mer sud-ouest.
const CHENAL = [[-88, 42], [-80, 52], [-72, 64], [-64, 76], [-58, 88], [-54, 96]];

// Rock Creek : le ravin boisé qui descend du nord et sépare Georgetown du
// reste de la ville.
const ROCK_CREEK = [
  [-172, -109], [-174, -94], [-177, -80], [-186, -62], [-196, -50], [-204, -42], [-210, -36],
];

// Le canal C&O, le long de M Street à Georgetown.
const CANAL = [[-244, -62], [-230, -55], [-216, -49], [-206, -44]];

// TOUTE L'HYDROGRAPHIE D'UNE COLONNE, CALCULÉE UNE FOIS.
//
// Trois fonctions — l'eau, le relief, la surface — avaient chacune besoin des
// mêmes distances aux mêmes rivières, et chacune les recalculait : six
// polylignes par appel, trois appels par colonne. C'était le premier poste de
// coût de toute la ville. Une colonne calcule ses distances UNE fois, et tout
// le monde lit le même résultat.
const MEMO_HYDRO = new Map();
function hydroDe(u, v) {
  const cle = u * 4096 + v;
  const memo = MEMO_HYDRO.get(cle);
  if (memo !== undefined) return memo;
  const p = versLigne(POTOMAC, u, v);
  const a = versLigne(ANACOSTIA, u, v);
  const h = {
    p, a,
    lp: largeurPotomac(p.v), la: largeurAnacostia(a.v),
    chenal: versLigne(CHENAL, u, v).d,
    creek: versLigne(ROCK_CREEK, u, v).d,
    canal: versLigne(CANAL, u, v).d,
    bassin: dansBassin(u, v),
  };
  h.eau = p.d < h.lp || a.d < h.la || h.bassin || h.chenal < 3.5 || h.creek < 1.6 || h.canal < 1.2;
  if (MEMO_HYDRO.size > 60000) MEMO_HYDRO.clear();
  MEMO_HYDRO.set(cle, h);
  return h;
}

export function surEauWashington(u, v) {
  return hydroDe(u, v).eau;
}

// --- le relief ----------------------------------------------------------------

const BASE = 33;                 // le Mall, le Triangle fédéral, le centre
const WATER_LEVEL_DC = 30;       // la ligne d'eau du monde, recopiée pour ne pas
//                                  dépendre du sens d'import
const WATER_BED = 26;            // le lit des rivières, sous la ligne d'eau
const WATER_RIVE = 31;           // la berge, juste au-dessus

// Les collines qui comptent : celle du Capitole — le dôme est SUR une butte,
// c'est pour cela qu'on le voit du fond du Mall — et la crête d'Arlington, qui
// porte le cimetière au-dessus du fleuve.
const COLLINES = [
  [10, 2, 40, 3],        // Capitol Hill
  [-232, 52, 42, 6],     // la crête d'Arlington
  [-148, -100, 30, 2],   // la montée vers Dupont
];

function solBrutWashington(x, z) {
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  let h = BASE;
  for (const [cu, cv, r, mont] of COLLINES) {
    const d = Math.hypot(u - cu, v - cv);
    if (d >= r) continue;
    h += mont * 0.5 * (1 + Math.cos((d / r) * Math.PI));
  }

  // Les rivières se creusent, et leurs berges descendent vers elles. Toutes
  // les distances sortent de hydroDe — calculées une seule fois par colonne.
  const hy = hydroDe(u, v);
  if (hy.p.d < hy.lp + 9) {
    const t = Math.min(1, Math.max(0, (hy.lp + 9 - hy.p.d) / 9));
    h = h * (1 - t) + (hy.p.d < hy.lp ? WATER_BED : WATER_RIVE) * t;
  }
  if (hy.a.d < hy.la + 7) {
    const t = Math.min(1, Math.max(0, (hy.la + 7 - hy.a.d) / 7));
    h = h * (1 - t) + (hy.a.d < hy.la ? WATER_BED : WATER_RIVE) * t;
  }
  if (hy.chenal < 6.5) {
    const t = Math.min(1, (6.5 - hy.chenal) / 3);
    h = h * (1 - t) + (hy.chenal < 3.5 ? WATER_BED : WATER_RIVE) * t;
  }
  if (dansBassin(u, v, 3)) {
    const t = hy.bassin ? 1 : 0.5;
    h = h * (1 - t) + (hy.bassin ? WATER_BED + 1 : WATER_RIVE) * t;
  }
  if (hy.creek < 10) {
    const t = Math.min(1, (10 - hy.creek) / 10);
    const fond = hy.creek < 1.6 ? WATER_BED + 2 : BASE - 1;
    h = h * (1 - t * t) + fond * (t * t);
  }
  if (hy.canal < 3) {
    const t = Math.min(1, (3 - hy.canal) / 1.8);
    h = h * (1 - t) + (hy.canal < 1.2 ? WATER_LEVEL_DC - 1 : WATER_RIVE) * t;
  }
  return h;
}

// Ce que `terrainHeight` appelle : le relief de la capitale, esplanades des
// monuments comprises, fondu dans la campagne sur les dix derniers blocs.
export function hauteurWashington(x, z, h) {
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  const part = partDeVille(u, v);
  if (part <= 0) return h;
  return h * (1 - part) + solDeWashington(x, z) * part;
}

// --- le plan de L'Enfant ------------------------------------------------------
//
// Dans la vraie ville, une rue tous les cent quarante mètres — sept blocs à
// cette échelle. On dessine la grille tous les DOUZE blocs (entorse déclarée) :
// c'est ce qui donne aux îlots la profondeur d'une maison à étage.

const PAS_RUE = 12;              // une rue dessinée tous les douze blocs
const DEMI_CHAUSSEE = 2;         // trois blocs de chaussée, un trottoir de chaque côté
const ANNEAU_DEDANS = 3;         // un rond-point : le jardin s'arrête à r − 3…
const ANNEAU_DEHORS = 1;         // …la chaussée tourne jusqu'à r − 1, puis le trottoir

// Les grandes avenues d'État, chacune par ses points de passage réels.
// Pennsylvania Avenue relie le Capitole à la Maison-Blanche : c'est la rue des
// défilés d'investiture, et L'Enfant l'a voulue ainsi pour que le président et
// le Congrès se voient d'un bout à l'autre.
const AVENUES = [
  // Pennsylvania part de la 3e Rue, là où elle se détache de Constitution —
  // dans le parc du Capitole elle n'est qu'une allée — et s'arrête à la 15e :
  // devant la Maison-Blanche, la vraie est fermée aux voitures depuis 1995.
  { nom: 'Pennsylvania Avenue NO', l: 3.4, pts: [[-27, -17], [-53, -21], [-70, -24], [-88, -30], [-104, -37]] },
  { nom: 'Pennsylvania Avenue SE', l: 3, pts: [[20, 16], [30, 22], [46, 32], [62, 42]] },
  { nom: 'Maryland Avenue SO', l: 3, pts: [[-23, 17], [-28, 20], [-42, 28], [-52, 34], [-58.5, 38]] },   // finit SUR la 7e Rue, pour qu'un circuit s'y referme
  { nom: 'Massachusetts Avenue NO', l: 3.2, pts: [[36, -20], [16, -26], [-8, -32], [-32, -38], [-54, -46], [-76, -56], [-100, -68], [-124, -82], [-148, -100], [-160, -109]] },
  { nom: 'Connecticut Avenue NO', l: 3, pts: [[-115, -50], [-122, -60], [-129, -68], [-140, -84], [-148, -100], [-152, -109]] },
  { nom: 'New York Avenue NO', l: 3, pts: [[-108, -46], [-92, -54], [-72, -62], [-50, -70], [-28, -78], [0, -88]] },
  { nom: 'Vermont Avenue NO', l: 2.6, pts: [[-110, -48], [-104, -62], [-98, -78], [-92, -94], [-88, -106]] },
  { nom: 'Rhode Island Avenue NO', l: 2.6, pts: [[-148, -102], [-124, -94], [-100, -86], [-76, -78], [-52, -70]] },
  // Virginia Avenue finit sur Constitution, à la 21e Rue, comme la vraie ;
  // son ancien tracé mourait dans l'Ellipse.
  { nom: 'Virginia Avenue NO', l: 2.6, pts: [[-180, -40], [-166, -31], [-152, -22], [-137, -17]] },
  // Les deux avenues du Mall, coupées à la 17e : à l'ouest, Constitution
  // continue seule jusqu'au Lincoln, et c'est une autre voie.
  //
  // ELLES PASSENT DERRIÈRE LES MUSÉES, PAS AU TRAVERS. À v = ±13 et sept
  // blocs de large, chacune traversait la rangée de musées (v ±6 à ±15) : du
  // bitume sous les galeries, invisible tant que rien n'y roulait — et en
  // v205 les voitures du tour du Mall auraient traversé l'Air et l'Espace.
  // Les vraies font trente mètres de large, soit un bloc et demi ici : trois
  // colonnes de chaussée à v = ±17, le trottoir à ±15 le long des façades.
  { nom: 'Independence Avenue', l: 1.6, pts: [[-20, 17], [-60, 17], [-100, 17], [-121, 17]] },
  { nom: 'Constitution Avenue', l: 1.6, pts: [[-20, -17], [-60, -17], [-100, -17], [-121, -17]] },
  { nom: 'Constitution Avenue (ouest)', l: 1.6, pts: [[-121, -17], [-140, -17], [-166, -17]] },
  { nom: 'North Capitol Street', l: 2.8, sol: BITUME, pts: [[0, -22], [0, -50], [0, -80], [0, -109]] },
  { nom: 'South Capitol Street', l: 2.8, sol: BITUME, pts: [[0, 22], [0, 44], [0, 61]] },
  { nom: '16e Rue NO', l: 2.8, pts: [[-115, -52], [-115, -70], [-115, -90], [-115, -109]] },
  { nom: '7e Rue NO', l: 2.8, sol: BITUME, pts: [[-54, -96], [-54, -70], [-54, -44], [-54, -18]] },
  { nom: 'K Street NO', l: 3, pts: [[-170, -66], [-144, -66], [-118, -66], [-92, -66], [-66, -66], [-40, -66]] },
  // Georgetown, à ses vraies adresses (M Street est à 1,7 km au nord du
  // Capitole, pas au bord de l'eau) : M Street d'ouest en est jusqu'à Rock
  // Creek, Wisconsin qui monte vers le nord, P Street et la 28e Rue pour
  // refermer le tour du quartier.
  { nom: 'M Street (Georgetown)', l: 2.8, pts: [[-228, -80], [-216, -81], [-200, -82], [-186, -84]] },
  { nom: 'Wisconsin Avenue NO', l: 2.6, pts: [[-224, -81], [-227, -95], [-231, -109]] },
  { nom: 'P Street (Georgetown)', l: 2.2, pts: [[-228, -100], [-212, -100], [-197, -101]] },
  { nom: '28e Rue NO', l: 2.2, pts: [[-197, -101], [-197, -92], [-198, -82]] },
  // LES RUES DE LIAISON : celles de la grille qu'un circuit emprunte pour se
  // refermer. Chacune est posée SUR sa rue de la grille (centre à 12k + 1,5 :
  // la chaussée reste aux colonnes 1 et 2, sans trottoir en plus, pour ne pas
  // mordre un lot) — sauf la 3e et la 17e, qui longent le Mall à leur vraie
  // adresse. Une rue déclarée ici existe même là où la grille s'arrête.
  { nom: '3e Rue', l: 1.05, t: 0, sol: BITUME, pts: [[-25.5, 17], [-25.5, -17]] },        // vraie adresse u −27,4 : +2, le bord du parc
  { nom: '17e Rue', l: 1.05, t: 0, sol: BITUME, pts: [[-121, 17], [-121, -17]] },         // entre l'obélisque et le mémorial
  { nom: '3e Rue NO', l: 1.05, t: 0, sol: BITUME, pts: [[-25.5, -17], [-22.5, -19], [-22.5, -60], [-22.5, -109]] },
  { nom: '9e Rue NO', l: 1.05, t: 0, sol: BITUME, pts: [[-58.5, -17], [-58.5, -60], [-58.5, -109]] },
  { nom: '14e Rue NO', l: 1.05, t: 0, sol: BITUME, pts: [[-94.5, -17], [-94.5, -60], [-94.5, -109]] },
  { nom: 'C Street NO', l: 1.05, t: 0, sol: BITUME, pts: [[1.5, -22.5], [-60, -22.5], [-103, -22.5]] },   // s'arrête à l'Ellipse
  { nom: 'F Street NO', l: 1.05, t: 0, sol: BITUME, pts: [[1.5, -46.5], [-60, -46.5], [-121, -46.5]] },
  { nom: 'H Street NO', l: 1.05, t: 0, sol: BITUME, pts: [[1.5, -58.5], [-60, -58.5], [-121, -58.5], [-170, -58.5]] },
  { nom: 'D Street SE', l: 1.05, t: 0, sol: BITUME, pts: [[61.5, 25.5], [25.5, 25.5], [1.5, 25.5]] },      // E Street SE est sous l'Anacostia ici
  { nom: 'E Street SO', l: 1.05, t: 0, sol: BITUME, pts: [[1.5, 61.5], [-22.5, 61.5]] },                 // au-delà, les berges du chenal
  { nom: '3e Rue SE', l: 1.05, t: 0, sol: BITUME, pts: [[25.5, 19], [25.5, 25.5]] },
  { nom: '8e Rue SE', l: 1.05, t: 0, sol: BITUME, pts: [[61.5, 42], [61.5, 25.5]] },
  { nom: '3e Rue SO', l: 1.05, t: 0, sol: BITUME, pts: [[-25.5, 17], [-22.5, 19], [-22.5, 40], [-22.5, 61.5]] },
  { nom: '7e Rue SO', l: 1.05, t: 0, sol: BITUME, pts: [[-58.5, 17], [-58.5, 40]] },                    // croise Maryland Avenue
  { nom: 'D Street SO', l: 1.05, t: 0, sol: BITUME, pts: [[1.5, 25.5], [-22.5, 25.5]] },                 // sous le Rayburn, de South Capitol à la 3e
];

const BANDES_AVENUES = rangerVoies(AVENUES);

// Les ronds-points. À Washington, une avenue diagonale ne coupe pas la grille :
// elle **crée une place**. Chacune porte une statue, un bassin ou les deux.
// Logan Circle est rentré de cinq blocs (sa vraie ordonnée sort d'un bloc de
// l'emprise) — écart déclaré.
export const CERCLES = [
  { nom: 'Dupont Circle', u: -148, v: -102, r: 9, fontaine: true },
  { nom: 'Logan Circle', u: -90, v: -104, r: 7, jardin: true },
  { nom: 'Thomas Circle', u: -98, v: -84, r: 6 },
  { nom: 'Scott Circle', u: -121, v: -85, r: 6 },
  { nom: 'Washington Circle', u: -172, v: -66, r: 7 },   // à sa vraie adresse (23e & Pennsylvania) : à −179 il trempait dans Rock Creek
  { nom: 'Mount Vernon Square', u: -54, v: -84, r: 7, jardin: true },
  { nom: 'Farragut Square', u: -129, v: -64, r: 6, jardin: true },
  { nom: 'Lafayette Square', u: -115, v: -56, r: 7, jardin: true },
  { nom: 'McPherson Square', u: -104, v: -62, r: 6, jardin: true },
  { nom: 'Franklin Square', u: -92, v: -64, r: 6, jardin: true },
  { nom: 'Judiciary Square', u: -30, v: -32, r: 6 },
  { nom: 'Stanton Park', u: 29, v: -22, r: 6, jardin: true },
  { nom: 'Seward Square', u: 34, v: 20, r: 5, jardin: true },
  { nom: 'Folger Park', u: 24, v: 30, r: 5, jardin: true },
];

// --- les circuits de voitures ---------------------------------------------------
//
// UN CIRCUIT DE WASHINGTON CONTOURNE SES RONDS-POINTS. `chainerVoies` joint les
// avenues en droite ligne, et une droite qui passe par Dupont Circle traverse
// son jardin et sa fontaine : le tracé mesuré tombait à 80 % sur des pelouses.
// Chaque rond-point porte donc un anneau de chaussée (`ANNEAU_DEDANS`), et
// `contournerCercles` remplace tout tronçon qui entre dans un cercle par l'arc
// de cet anneau — dans le sens le plus court, comme une voiture prend une
// place. C'est le crochet `ajuster` de `fabriqueCircuits` : on retouche le
// tracé AVANT de le mesurer, jamais après.
const RAYON_ANNEAU = ANNEAU_DEDANS - 1;                   // au milieu de la bande roulante

function arcAutour(cu, cv, rr, p1, p2) {
  const a1 = Math.atan2(p1[1] - cv, p1[0] - cu);
  let d = Math.atan2(p2[1] - cv, p2[0] - cu) - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  const n = Math.max(1, Math.ceil((Math.abs(d) * rr) / 1.5));
  const out = [];
  for (let i = 1; i < n; i++) {
    const a = a1 + (d * i) / n;
    out.push([Math.round((cu + rr * Math.cos(a)) * 10) / 10, Math.round((cv + rr * Math.sin(a)) * 10) / 10]);
  }
  return out;
}

function contournerUn(pts, cu, cv, rr) {
  const n = pts.length;
  // « Dedans » inclut le bord : un point de passage posé EXACTEMENT sur le
  // rayon de contournement — le bout de Connecticut sur l'anneau de Farragut
  // — n'est ni dehors ni dedans, et la corde qui y mène coupait le jardin
  // sans qu'aucune intersection ne la trahisse. Le témoin qui échantillonne
  // les segments bloc par bloc l'a vu, pas celui qui ne lisait que les sommets.
  const dedans = (p) => Math.hypot(p[0] - cu, p[1] - cv) <= rr + 1e-6;
  const s = pts.findIndex((p) => !dedans(p));
  if (s < 0) return pts;                                  // tout le tracé est dans la place
  const rot = [...pts.slice(s), ...pts.slice(0, s)];
  const out = [];
  let entree = null;
  for (let i = 0; i < n; i++) {
    const a = rot[i], b = rot[(i + 1) % n];
    if (entree === null) out.push(a);
    const dx = b[0] - a[0], dy = b[1] - a[1], fx = a[0] - cu, fy = a[1] - cv;
    const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - rr * rr;
    let ts = [];
    if (A > 0) {
      const disc = B * B - 4 * A * C;
      if (disc > 0) {
        const q = Math.sqrt(disc);
        ts = [(-B - q) / (2 * A), (-B + q) / (2 * A)].filter((t) => t > 0 && t < 1);
      }
    }
    const au = (t) => [a[0] + dx * t, a[1] + dy * t];
    const aIn = dedans(a), bIn = dedans(b);
    if (!aIn && !bIn) {
      if (ts.length === 2) {                              // le tronçon traverse la place
        const p1 = au(ts[0]), p2 = au(ts[1]);
        out.push(p1, ...arcAutour(cu, cv, rr, p1, p2), p2);
      }
    } else if (!aIn && bIn) {
      entree = ts.length ? au(ts[0]) : b;                 // sans intersection, b est SUR le bord
      out.push(entree);
    } else if (aIn && !bIn) {
      if (entree) {
        const p2 = ts.length ? au(ts[ts.length - 1]) : a; // idem : a est sur le bord
        out.push(...arcAutour(cu, cv, rr, entree, p2), p2);
      }
      entree = null;
    }
  }
  return out;
}

export function contournerCercles(pts) {
  let out = pts;
  for (const c of CERCLES) out = contournerUn(out, c.u, c.v, c.r - RAYON_ANNEAU);
  return out;
}

export const VOIES_WASHINGTON = AVENUES;
const ROULANT = new Set([BITUME, LIGNE, PASSAGE]);

// UN CIRCUIT SE REFERME SUR DES CARREFOURS (leçon de Nice) : `chainerVoies`
// n'accroche une voie que par ses BOUTS, et les rues de la grille traversent
// le centre d'un bord à l'autre — la 14e Rue va de Constitution à l'emprise
// nord sans qu'aucun bout ne touche K Street. Les raccords ci-dessous sont des
// TRONÇONS de ces mêmes rues, coupés au carrefour, pour que les convois
// puissent tourner. Ils ne posent aucun sol : la chaussée est déjà là.
const RACCORDS = [
  // Le centre-ville : de North Capitol à la 7e, puis de la 7e à la 14e.
  { nom: 'C Street NO, de North Capitol à la 7e', pts: [[0, -22.5], [-54, -22.5]] },
  { nom: 'C Street NO, de la 7e à la 14e', pts: [[-54, -22.5], [-94.5, -22.5]] },
  { nom: 'H Street NO, de North Capitol à la 7e', pts: [[0, -58.5], [-54, -58.5]] },
  { nom: 'K Street NO, de la 7e à la 14e', pts: [[-54, -66], [-94.5, -66]] },
  { nom: 'North Capitol Street, de C à H', pts: [[0, -22.5], [0, -58.5]] },
  { nom: '7e Rue NO, de C à H', pts: [[-54, -22.5], [-54, -58.5]] },
  { nom: '7e Rue NO, de C à K', pts: [[-54, -22.5], [-54, -66]] },
  { nom: '14e Rue NO, de C à K', pts: [[-94.5, -22.5], [-94.5, -66]] },
  { nom: 'F Street NO, de la 9e à la 14e', pts: [[-58.5, -46.5], [-94.5, -46.5]] },
  { nom: 'H Street NO, de la 9e à la 14e', pts: [[-58.5, -58.5], [-94.5, -58.5]] },
  { nom: '9e Rue NO, de F à H', pts: [[-58.5, -46.5], [-58.5, -58.5]] },
  { nom: '14e Rue NO, de F à H', pts: [[-94.5, -46.5], [-94.5, -58.5]] },
  // Les diagonales : de la Maison-Blanche à Dupont Circle et retour par
  // Massachusetts. Pennsylvania finit sur la 15e ; on remonte à H Street.
  { nom: '15e Rue NO, de Pennsylvania à H', pts: [[-106.5, -37], [-106.5, -58.5]] },
  { nom: 'H Street NO, de la 15e à Connecticut', pts: [[-106.5, -58.5], [-121, -58.5]] },
  { nom: 'Connecticut Avenue NO, de H à Dupont', pts: [[-121, -58.5], [-122, -60], [-129, -68], [-140, -84], [-148, -100]] },
  { nom: 'Massachusetts Avenue NO, de Dupont à la 3e', pts: [[-148, -100], [-124, -82], [-100, -68], [-76, -56], [-54, -46], [-32, -38], [-22.5, -35.6]] },
  { nom: 'Massachusetts Avenue NO, de Dupont à la 7e', pts: [[-148, -100], [-124, -82], [-100, -68], [-76, -56], [-54, -46]] },
  { nom: '3e Rue NO, de Massachusetts à Pennsylvania', pts: [[-22.5, -35.6], [-22.5, -19]] },
  { nom: '7e Rue NO, de Massachusetts à Rhode Island', pts: [[-54, -46], [-54, -70]] },
  // Le nord : P Street relie la 16e à Logan Circle.
  { nom: 'P Street NO, de la 16e à Logan Circle', pts: [[-115, -106.5], [-88, -106.5]] },
  // Le sud-ouest et Capitol Hill.
  { nom: 'Independence Avenue, de la 3e à la 7e', pts: [[-25.5, 17], [-58.5, 17]] },
  { nom: '3e Rue SO, de D à E', pts: [[-22.5, 25.5], [-22.5, 61.5]] },
  { nom: 'D Street SE, de la 3e à la 8e', pts: [[25.5, 25.5], [61.5, 25.5]] },
];
export const VOIES_CIRCUITS_DC = [...AVENUES, ...RACCORDS];

// LES CIRCUITS SE MESURENT, ILS NE SE DEVINENT PAS. Chaque enchaînement
// ci-dessous a été éprouvé contre `solWashington` (part de chaussée, longueur
// en blocs) — le chiffre en commentaire est celui de la mesure, prise APRÈS le
// contournement des ronds-points. Jusqu'en v205 Washington n'avait AUCUN
// circuit : un carré posé au hasard sur le plan de L'Enfant ne trouve jamais
// une rue, et ses diagonales traversent quatorze ronds-points. Onze circuits
// font rouler des voitures sur trente-trois des trente-six avenues nommées
// (en entier ou par un raccord) ; Virginia, New York et Constitution ouest
// restent sans boucle qui se referme à quatre-vingt-dix pour cent.
const CIRCUITS = [
  // 100 %, 281 — le tour du Mall : Constitution vers l'ouest, la 17e, retour
  // par Independence jusqu'à la 3e — derrière les musées, jamais au travers.
  ['3e Rue', 'Constitution Avenue', '17e Rue', 'Independence Avenue'],
  // 100 %, 180 — le centre-ville, de North Capitol à la 7e entre C et H.
  ['C Street NO, de North Capitol à la 7e', '7e Rue NO, de C à H', 'H Street NO, de North Capitol à la 7e', 'North Capitol Street, de C à H'],
  // 100 %, 168 — Penn Quarter : de la 7e à la 14e entre C Street et K Street.
  ['C Street NO, de la 7e à la 14e', '14e Rue NO, de C à K', 'K Street NO, de la 7e à la 14e', '7e Rue NO, de C à K'],
  // 100 %, 96 — le petit tour de Chinatown, entre F et H, de la 9e à la 14e.
  ['F Street NO, de la 9e à la 14e', '14e Rue NO, de F à H', 'H Street NO, de la 9e à la 14e', '9e Rue NO, de F à H'],
  // 100 %, 199 — Georgetown : M Street, Wisconsin, P Street et la 28e.
  ['M Street (Georgetown)', 'Wisconsin Avenue NO', 'P Street (Georgetown)', '28e Rue NO'],
  // 100 %, 128 — le sud-ouest : sous le Rayburn, la 3e, E Street et South Capitol.
  ['D Street SO', '3e Rue SO, de D à E', 'E Street SO', 'South Capitol Street'],
  // 99 %, 102 — Maryland Avenue jusqu'à la 7e, retour par Independence.
  ['Maryland Avenue SO', '7e Rue SO', 'Independence Avenue, de la 3e à la 7e'],
  // 100 %, 115 — Capitol Hill : la 3e, D Street, la 8e et Pennsylvania SE.
  ['3e Rue SE', 'D Street SE, de la 3e à la 8e', '8e Rue SE', 'Pennsylvania Avenue SE'],
  // 100 %, 331 — la grande diagonale : Pennsylvania de la 3e à la Maison-Blanche,
  // la 15e et H Street, Connecticut jusqu'à Dupont Circle, Massachusetts pour
  // redescendre à la 3e. Cinq ronds-points contournés.
  ['Pennsylvania Avenue NO', '15e Rue NO, de Pennsylvania à H', 'H Street NO, de la 15e à Connecticut', 'Connecticut Avenue NO, de H à Dupont', 'Massachusetts Avenue NO, de Dupont à la 3e', '3e Rue NO, de Massachusetts à Pennsylvania'],
  // 100 %, 234 — Rhode Island de Dupont à la 7e, retour par Massachusetts.
  ['Rhode Island Avenue NO', '7e Rue NO, de Massachusetts à Rhode Island', 'Massachusetts Avenue NO, de Dupont à la 7e'],
  // 99 %, 161 — le nord : la 16e jusqu'à P Street, Logan Circle, Vermont.
  ['16e Rue NO', 'P Street NO, de la 16e à Logan Circle', 'Vermont Avenue NO'],
];

export const circuitsWashington = fabriqueCircuits({
  cle: 'dc',
  ancre: WASHINGTON,
  chaines: CIRCUITS,
  roulant: ROULANT,
  voies: { liste: VOIES_CIRCUITS_DC, sol: solWashington },
  ajuster: contournerCercles,
});

// --- le Mall ------------------------------------------------------------------
//
// L'axe de la capitale, aux distances exactes : cent dix blocs du Capitole à
// l'obélisque, cent soixante-douze jusqu'au Lincoln. Constitution Avenue passe
// au nord (v = −17), Independence au sud (v = +17), et les douze musées
// s'alignent entre les deux, chacun à sa vraie adresse, façade sur le trottoir.

// La pelouse s'arrête à la 3e Rue (u −27,4), comme dans la vraie ville : v205
// la ramène de −22 à −27 pour que la 3e Rue passe entre le Mall et le parc du
// Capitole. Avant, le Mall collait à l'ellipse du parc et AUCUNE rue ne pouvait
// les séparer — un circuit qui faisait le tour du Mall n'avait pas de retour.
const MALL = { u0: -100, u1: -27, dv: 5 };            // la pelouse et ses allées
const OBELISQUE = { u: -110, v: 0, r: 9 };            // le tertre du monument
const MIROIR = { u0: -166, u1: -136, dv: 3 };         // le miroir d'eau
const CONSTITUTION_GARDENS = { u: -150, v: -8, ru: 12, rv: 4 };
const LINCOLN = { u: -172, v: 2 };
const CAPITOLE_PARC = { u0: -24, u1: 26, v0: -21, v1: 21 };

const dansMall = (u, v) => u >= MALL.u0 && u <= MALL.u1 && Math.abs(v) <= MALL.dv;
const dansMiroir = (u, v) => u >= MIROIR.u0 && u <= MIROIR.u1 && Math.abs(v - 2) <= MIROIR.dv;
const dansObelisque = (u, v) => Math.hypot(u - OBELISQUE.u, v - OBELISQUE.v) < OBELISQUE.r;
const dansJardinConstitution = (u, v) =>
  ((u - CONSTITUTION_GARDENS.u) / CONSTITUTION_GARDENS.ru) ** 2
  + ((v - CONSTITUTION_GARDENS.v) / CONSTITUTION_GARDENS.rv) ** 2 < 1;
// Le parc du Capitole est une ELLIPSE, pas un rectangle : Olmsted l'a dessiné
// arrondi.
const dansParcCapitole = (u, v) => {
  const cu = (CAPITOLE_PARC.u0 + CAPITOLE_PARC.u1) / 2, cv = (CAPITOLE_PARC.v0 + CAPITOLE_PARC.v1) / 2;
  const ru = (CAPITOLE_PARC.u1 - CAPITOLE_PARC.u0) / 2, rv = (CAPITOLE_PARC.v1 - CAPITOLE_PARC.v0) / 2;
  return ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2 <= 1;
};

// L'Ellipse et le parc du Président, entre la Maison-Blanche et l'obélisque.
const ELLIPSE = { u: -115, v: -24, ru: 10, rv: 6 };
const dansEllipse = (u, v) =>
  ((u - ELLIPSE.u) / ELLIPSE.ru) ** 2 + ((v - ELLIPSE.v) / ELLIPSE.rv) ** 2 < 1;

// East Potomac Park : la langue de terre entre le Potomac et le Washington
// Channel, plantée de cerisiers, qui finit à Hains Point.
const dansPotomacPark = (u, v) => {
  if (v < 40 || v > 96) return false;
  const hy = hydroDe(u, v);
  return hy.p.d > hy.lp + 0.5 && hy.chenal > 3.5 && u > -116 && u < -50;
};

// West Potomac Park : la pelouse entre le miroir d'eau, le fleuve et le
// bassin — c'est là que vivent les mémoriaux.
const dansWestPotomacPark = (u, v) => u >= -196 && u <= -100 && v >= -12 && v <= 44
  && !surEauWashington(u, v);

// Le cimetière d'Arlington, sur la crête de l'autre côté du fleuve. Son vrai
// centre est à u = −252 : il est rentré de huit blocs pour tenir dans le
// monde — écart déclaré.
const ARLINGTON = { u: -230, v: 52, r: 26 };
const dansArlington = (u, v) => Math.hypot(u - ARLINGTON.u, v - ARLINGTON.v) < ARLINGTON.r;

// Rock Creek Park : la forêt qui descend du nord le long du ravin.
const dansRockCreekPark = (u, v) => hydroDe(u, v).creek < 8;

// --- le sol -------------------------------------------------------------------

// Petit tirage déterministe : le même point donne toujours le même résultat.
function tirage(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Ce que la colonne pose en surface, ou null si un bâtiment peut s'y élever.
//
// MÉMORISÉ : la génération d'un morceau interroge chaque colonne jusqu'à six
// fois — pour elle-même, puis comme voisine de ses quatre voisines, puis par
// la carte — et chaque calcul refait cinq polylignes de fleuve. Sans ce mémo,
// un morceau du Mall coûtait vingt-cinq millisecondes ; avec, huit.
const MEMO_SOL = new Map();
export function solWashington(x, z) {
  const cle = x * 4096 + z;
  const memo = MEMO_SOL.get(cle);
  if (memo !== undefined) return memo;
  const sol = solWashingtonCalcul(x, z);
  if (MEMO_SOL.size > 40000) MEMO_SOL.clear();
  MEMO_SOL.set(cle, sol);
  return sol;
}

function solWashingtonCalcul(x, z) {
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  if (!dansBoite(u, v)) return null;

  if (surEauWashington(u, v)) return EAU;

  // Le bord des rivières : du sable, pas du bitume.
  const hy = hydroDe(u, v);
  if (hy.p.d < hy.lp + 1.6) return SABLE;
  if (hy.a.d < hy.la + 1.4) return SABLE;

  // Les cerisiers du Tidal Basin : une couronne rose tout autour du bassin.
  if (dansBassin(u, v, 3.5)) {
    return tirage(u, v, 31) < 0.5 ? CERISIER : HERBE;
  }
  if (dansPotomacPark(u, v)) {
    if (tirage(u, v, 32) < 0.14) return CERISIER;
    return tirage(u, v, 33) < 0.08 ? GRAVIER : HERBE;
  }

  // Le miroir d'eau, entre le mémorial de la Seconde Guerre et le Lincoln.
  if (dansMiroir(u, v)) return EAU;
  if (dansJardinConstitution(u, v)) return EAU;

  // Le Mall : la pelouse, les allées de sable, les rangées d'ormes.
  if (dansMall(u, v)) {
    const av = Math.abs(v);
    if (av > MALL.dv - 0.8) return GRAVIER;                        // Jefferson et Madison Drive
    if (av > MALL.dv - 2) return (u & 1) === 0 ? arbreOu(u, v, HERBE) : HERBE;    // les ormes
    return HERBE;
  }
  if (dansObelisque(u, v)) {
    const d = Math.hypot(u - OBELISQUE.u, v - OBELISQUE.v);
    // le cercle de cinquante drapeaux qui entoure le tertre
    if (d > OBELISQUE.r - 1.2 && d < OBELISQUE.r - 0.4) return GRAVIER;
    return HERBE;
  }

  // Le parc du Capitole : pelouse, bosquets, allées d'honneur.
  if (dansParcCapitole(u, v)) {
    if (Math.abs(v) < 1.6 && u < -11) return GRAVIER;              // vers le Mall
    if (Math.abs(u - 20) < 1.2 || Math.abs(u + 19) < 1.2) return GRAVIER;
    return tirage(u, v, 34) < 0.12 ? arbreOu(u, v, HERBE) : HERBE;
  }
  if (dansEllipse(u, v)) {
    return tirage(u, v, 40) < 0.08 ? arbreOu(u, v, HERBE) : HERBE;
  }

  // Le cimetière d'Arlington : l'herbe, et les stèles alignées au cordeau.
  if (dansArlington(u, v)) {
    if ((((u % 3) + 3) % 3) === 0 && (((v % 3) + 3) % 3) === 0) return MARBRE;
    return tirage(u, v, 35) < 0.06 ? arbreOu(u, v, HERBE) : HERBE;
  }

  if (dansWestPotomacPark(u, v)) {
    // Independence et la 17e Rue traversent le parc — comme dans la vraie
    // ville, où l'on fait le tour du Mall en voiture.
    const av = solDesVoies(BANDES_AVENUES, u, v, BITUME, TROTTOIR);
    if (av !== null) return av;
    if (tirage(u, v, 41) < 0.1) return arbreOu(u, v, HERBE);
    return tirage(u, v, 42) < 0.06 ? GRAVIER : HERBE;
  }

  // Les ronds-points de L'Enfant : un jardin au milieu, une CHAUSSÉE qui en
  // fait le tour, et le trottoir extérieur percé là où une avenue ou une rue
  // débouche. Jusqu'à la v204 l'anneau entier était un trottoir : aucune
  // voiture ne pouvait traverser un cercle, et Dupont, Logan ou Lafayette
  // coupaient toute boucle qui les touchait. L'anneau roule sur
  // [r − 3, r − 1) ; c'est le rayon r − 2 que suit `contournerCercles`.
  for (const c of CERCLES) {
    const d = Math.hypot(u - c.u, v - c.v);
    if (d >= c.r) continue;
    if (c.fontaine && d < 2.2) return EAU;
    if (d < c.r - ANNEAU_DEDANS) {
      return tirage(u, v, c.jardin ? 37 : 38) < (c.jardin ? 0.3 : 0.22) ? arbreOu(u, v, HERBE) : HERBE;
    }
    if (d < c.r - ANNEAU_DEHORS) return BITUME;                    // l'anneau qui roule
    if (solDesVoies(BANDES_AVENUES, u, v, BITUME, TROTTOIR) === BITUME) return BITUME;
    const mu0 = ((u % PAS_RUE) + PAS_RUE) % PAS_RUE, mv0 = ((v % PAS_RUE) + PAS_RUE) % PAS_RUE;
    if ((mu0 > 0 && mu0 <= DEMI_CHAUSSEE) || (mv0 > 0 && mv0 <= DEMI_CHAUSSEE)) return BITUME;
    return TROTTOIR;                                               // le trottoir du tour
  }
  // Le parc de Rock Creek se lit APRÈS les ronds-points : Washington Circle,
  // à sa vraie adresse (23e & Pennsylvania), a son bord ouest à sept blocs du
  // ruisseau, dans la bande boisée du parc — et le sol y est plat (33), le
  // ravin ne commence qu'à cinq blocs de l'eau. Lu avant, le parc mangeait
  // deux colonnes de l'anneau et aucune voiture ne pouvait en faire le tour.
  if (dansRockCreekPark(u, v)) {
    if (hydroDe(u, v).creek < 1.6) return EAU;
    return tirage(u, v, 36) < 0.45 ? arbreOu(u, v, HERBE) : HERBE;
  }

  const enVille = batiIci(u, v);

  // Les avenues d'État, tracées avant la grille : à Washington la diagonale
  // gagne toujours sur la rue ordinaire.
  const av2 = solDesVoies(BANDES_AVENUES, u, v, BITUME, TROTTOIR);
  if (av2 !== null) {
    if (av2 === BITUME && (((u + v) % 9) + 9) % 9 === 0) return LIGNE;
    return av2;
  }

  if (!enVille) {
    return tirage(u, v, 39) < 0.35 ? arbreOu(u, v, HERBE) : HERBE;
  }

  // La grille : rues numérotées nord-sud, rues lettrées est-ouest.
  const mu = ((u % PAS_RUE) + PAS_RUE) % PAS_RUE;
  const mv = ((v % PAS_RUE) + PAS_RUE) % PAS_RUE;
  const surRueNS = mu <= DEMI_CHAUSSEE;
  const surRueEO = mv <= DEMI_CHAUSSEE;
  if (surRueNS || surRueEO) {
    if (surRueNS && surRueEO) return ((u + v) & 1) === 0 ? PASSAGE : BITUME;
    if ((surRueNS && mu === 0) || (surRueEO && mv === 0)) return TROTTOIR;
    if (surRueNS && mu === 1 && (((v & 7) < 4))) return LIGNE;
    if (surRueEO && mv === 1 && (((u & 7) < 4))) return LIGNE;
    return BITUME;
  }
  return null;
}

// Un lot peut-il porter un bâtiment ?
// Mémorisé : chaque colonne bâtie interroge ses quatre voisines, qui
// l'interrogent en retour — et surMonument compare trente-cinq boîtes à
// chaque fois. Une réponse par colonne suffit.
const MEMO_LOT = new Map();
export function lotWashingtonLibre(x, z) {
  const cle = x * 4096 + z;
  const memo = MEMO_LOT.get(cle);
  if (memo !== undefined) return memo;
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  let libre = true;
  if (!dansBoite(u, v)) libre = false;
  else if (solWashington(x, z) !== null) libre = false;
  else if (surMonument(u, v)) libre = false;
  else if (surBouche(u, v)) libre = false;
  if (MEMO_LOT.size > 40000) MEMO_LOT.clear();
  MEMO_LOT.set(cle, libre);
  return libre;
}

// --- les quartiers ------------------------------------------------------------
//
// Ce qui distingue un quartier d'un autre à Washington, ce n'est pas la
// hauteur — la loi l'interdit — c'est la MATIÈRE : le calcaire des ministères
// au centre, la brique rouge des maisons de ville, le verre des bureaux de
// K Street.

const QUARTIERS = [
  { nom: 'Georgetown', u: -222, v: -66, r: 26, genre: 'brique', hMin: 8, hMax: 12 },
  { nom: 'Foggy Bottom', u: -178, v: -48, r: 20, genre: 'calcaire', hMin: 12, hMax: 16 },
  { nom: 'West End', u: -156, v: -66, r: 14, genre: 'bureaux', hMin: 13, hMax: 17 },
  { nom: 'Dupont Circle', u: -148, v: -96, r: 20, genre: 'brique', hMin: 9, hMax: 13 },
  { nom: 'K Street', u: -110, v: -68, r: 24, genre: 'bureaux', hMin: 14, hMax: 17 },
  { nom: 'Logan Circle', u: -84, v: -96, r: 18, genre: 'brique', hMin: 8, hMax: 12 },
  { nom: 'Shaw', u: -50, v: -100, r: 16, genre: 'brique', hMin: 8, hMax: 12 },
  { nom: 'Penn Quarter', u: -62, v: -40, r: 18, genre: 'calcaire', hMin: 13, hMax: 17 },
  { nom: 'Chinatown', u: -50, v: -54, r: 9, genre: 'chinois', hMin: 9, hMax: 13 },
  { nom: 'Le Triangle fédéral', u: -82, v: -22, r: 16, genre: 'ministere', hMin: 13, hMax: 16 },
  { nom: 'Judiciary Square', u: -28, v: -36, r: 12, genre: 'calcaire', hMin: 12, hMax: 16 },
  { nom: 'Capitol Hill', u: 40, v: 6, r: 26, genre: 'brique', hMin: 7, hMax: 10 },
  { nom: 'NoMa', u: 34, v: -66, r: 20, genre: 'bureaux', hMin: 13, hMax: 17 },
  { nom: 'Navy Yard', u: 40, v: 76, r: 18, genre: 'bureaux', hMin: 12, hMax: 16 },
  { nom: 'Southwest Waterfront', u: -40, v: 58, r: 16, genre: 'calcaire', hMin: 11, hMax: 15 },
  { nom: 'Mount Vernon', u: -46, v: -78, r: 12, genre: 'brique', hMin: 9, hMax: 13 },
  { nom: 'Pentagon City', u: -178, v: 92, r: 14, genre: 'bureaux', hMin: 13, hMax: 17 },
];

const ORDINAIRE = { nom: 'Washington', genre: 'brique', hMin: 7, hMax: 10 };
function quartierDe(u, v) {
  let best = null, bestD = 1e9;
  for (const q of QUARTIERS) {
    const d = Math.hypot(u - q.u, v - q.v);
    if (d < q.r && d < bestD) { best = q; bestD = d; }
  }
  return best || ORDINAIRE;
}

// LA VILLE S'ARRÊTE QUELQUE PART : on bâtit là où il y a un quartier, et
// au-delà d'une fois et demie son rayon commencent les bois et les parcs.
function batiIci(u, v) {
  const bruit = (tirage(Math.floor(u / 5), Math.floor(v / 5), 92) - 0.5) * 0.55;
  for (const q of QUARTIERS) if (Math.hypot(u - q.u, v - q.v) < q.r * (1.5 + bruit)) return true;
  return false;
}

function quartiersDeWashington() {
  return QUARTIERS.map((q) => ({
    name: q.nom, x: WASHINGTON.x + q.u, z: WASHINGTON.z + q.v, r: 0,
  }));
}

// La loi de 1910 : cent trente pieds au maximum. À quatre blocs par étage,
// dix-sept blocs — et le dôme du Capitole culmine bien au-dessus.
const PLAFOND_LOI = 17;

const MURS = {
  brique: [BRIQUE, BRIQUE_SOMBRE, uni(17), BRIQUE],
  calcaire: [CALCAIRE, MARBRE, uni(19), CALCAIRE],
  ministere: [CALCAIRE, CALCAIRE, GRANIT],
  bureaux: [ACIER, VERRE_BLEU, BETON_CLAIR],
  chinois: [uni(0), uni(13), BRIQUE],
};
const TOITS = {
  brique: ARDOISE, calcaire: ARDOISE, ministere: TUILE, bureaux: ACIER, chinois: uni(5),
};

// --- les monuments -------------------------------------------------------------
//
// Chacun à sa vraie latitude et sa vraie longitude, converties par `de()` —
// les valeurs sont figées ici avec l'écart en commentaire quand il y en a un.
// `bu` et `bv` sont les demi-emprises ; à cette échelle la plupart des grands
// bâtiments sont à leur taille vraie, les petits mémoriaux deux à trois fois
// trop grands pour qu'on y entre.

export const MONUMENTS_DC = [
  // L'AXE DU MALL, d'est en ouest, aux adresses exactes.
  { nom: 'Capitole des États-Unis', u: 0, v: 0, bu: 12, bv: 19 },
  { nom: 'Monument de Washington', u: -110, v: 0, bu: 5, bv: 5 },
  { nom: 'Mémorial de la Seconde Guerre mondiale', u: -131, v: 2, bu: 8, bv: 6 },
  { nom: 'Lincoln Memorial', u: -172, v: 2, bu: 9, bv: 7 },
  // LES DOUZE MUSÉES DU MALL — rive nord d'est en ouest, puis rive sud. Les
  // deux rangées sont reculées d'un à deux blocs de leur vraie adresse (v ±8)
  // pour laisser la pelouse et ses allées intactes : leurs façades s'alignent
  // sur v ±5, au bord du gravier, comme les vraies sur Madison et Jefferson
  // Drive.
  // Leurs largeurs sont quasi vraies ; leurs profondeurs aussi. Deux écarts
  // d'un bloc (Arts et Industries, Freer) pour que des voisins mitoyens dans
  // la vraie ville ne se chevauchent pas ici.
  { nom: "Galerie nationale d'art — Est", u: -33, v: -10, bu: 4, bv: 4, seuil: 0.3 },
  { nom: "Galerie nationale d'art", u: -46, v: -10, bu: 7, bv: 5, seuil: 0.3 },
  { nom: "Musée d'Histoire naturelle", u: -71, v: -10, bu: 8, bv: 5, seuil: 0.3 },
  { nom: "Musée d'Histoire américaine", u: -88, v: -10, bu: 7, bv: 4, seuil: 0.3 },
  { nom: 'Musée afro-américain', u: -100, v: -9, bu: 4, bv: 3, seuil: 0.3 },
  { nom: "Musée de l'Indien d'Amérique", u: -32, v: 10, bu: 5, bv: 4, seuil: 0.3 },   // u −1 : entre la 3e et la 4e Rue, comme le vrai — la 3e passe à l'est
  { nom: "Musée de l'Air et de l'Espace", u: -46, v: 10, bu: 7, bv: 4 },
  { nom: 'Hirshhorn', u: -58, v: 10, bu: 4, bv: 4, seuil: 0.3 },
  { nom: 'Arts et Industries', u: -65, v: 10, bu: 2, bv: 3, seuil: 0.3 },   // u +1, v +1 : mitoyen du Château
  { nom: 'Château du Smithsonian', u: -71, v: 10, bu: 3, bv: 2, seuil: 0.3 },
  { nom: 'Galerie Freer', u: -77, v: 10, bu: 2, bv: 2, seuil: 0.3 },       // u −1 : mitoyen du Château
  // Autour de la Maison-Blanche et du centre.
  { nom: 'Maison-Blanche', u: -115, v: -42, bu: 12, bv: 6 },
  { nom: 'Le Trésor', u: -99, v: -44, bu: 3, bv: 5, seuil: 0.3 },          // u +6 : l'aile ouest agrandie le pousse
  { nom: 'Archives nationales', u: -59, v: -19, bu: 5, bv: 3, seuil: 0.3 },    // v −3 : l'Histoire naturelle élargie
  { nom: 'Arc de Chinatown', u: -53, v: -53, bu: 4, bv: 2, seuil: 0.3 },
  { nom: 'Théâtre Ford', u: -70, v: -37, bu: 3, bv: 3, seuil: 0.3 },
  // Capitol Hill.
  { nom: 'Cour suprême', u: 21, v: -4, bu: 7, bv: 4, seuil: 0.3 },         // u +2 : le perron du Capitole le pousse
  { nom: 'Bibliothèque du Congrès', u: 18, v: 6, bu: 5, bv: 4, seuil: 0.3 },   // u +1 : le perron du Capitole
  { nom: 'Union Station', u: 52, v: -42, bu: 9, bv: 6 },
  // West Potomac Park et le Tidal Basin — et le mémorial Roosevelt est LÀ,
  // sur la rive ouest du bassin, ses quatre salles à ciel ouvert.
  { nom: 'Mémorial des vétérans du Vietnam', u: -161, v: -9, bu: 6, bv: 3, seuil: 0.3 },
  { nom: 'Mémorial de la guerre de Corée', u: -162, v: 13, bu: 5, bv: 3, seuil: 0.3 },  // v +1 : le Lincoln agrandi le touche
  { nom: 'Mémorial Martin Luther King', u: -147, v: 19, bu: 4, bv: 4, seuil: 0.3 },
  { nom: 'Mémorial Roosevelt', u: -139, v: 33, bu: 4, bv: 8, seuil: 0.3 },
  { nom: 'Mémorial Jefferson', u: -112, v: 51, bu: 6, bv: 9 },             // u +3, v +6 : sur la rive, pas dans le bassin
  // L'ouest.
  { nom: 'Kennedy Center', u: -186, v: -32, bu: 5, bv: 9, seuil: 0.3 },    // u +8 : le vrai surplombe le fleuve
  // La Virginie, de l'autre côté du fleuve.
  { nom: 'Pentagone', u: -197, v: 82, bu: 13, bv: 13 },                    // v −17 : recentré sur l'esplanade
  { nom: 'Tombe du Soldat inconnu', u: -238, v: 70, bu: 6, bv: 5, seuil: 0.3 },
  { nom: 'Mémorial Iwo Jima', u: -240, v: -2, bu: 5, bv: 4, seuil: 0.3 },  // u +12 : le vrai sort du monde
  // Les ponts, posés avant les monuments : un pont TOUCHE ce qu'il dessert.
  { nom: 'Pont du Mémorial', u: -186, v: 11, bu: 16, bv: 4, eau: true, pont: true },
  { nom: 'Pont de la 14e Rue', u: -157, v: 60, bu: 3, bv: 14, eau: true, pont: true },
  { nom: 'Key Bridge', u: -218, v: -50, bu: 3, bv: 9, eau: true, pont: true, seuil: 0.3 },
];

// LES ESPLANADES : chaque monument terrasse son emprise, le raccord se fait
// sur huit blocs autour, la plus forte l'emporte, et l'eau n'est jamais
// remblayée.
const ESPLANADES = MONUMENTS_DC.filter((m) => !m.pont).map((m) => ({
  u: m.u, v: m.v, bu: m.bu, bv: m.bv,
  h: solBrutWashington(WASHINGTON.x + m.u, WASHINGTON.z + m.v),
}));

// Mémorisé pour la même raison que solWashington : terrainHeight repasse sur
// les mêmes colonnes à chaque voisin, et les esplanades coûtent trente-cinq
// comparaisons par appel.
const MEMO_RELIEF = new Map();
function solDeWashington(x, z) {
  const cle = x * 4096 + z;
  const memo = MEMO_RELIEF.get(cle);
  if (memo !== undefined) return memo;
  const h = solDeWashingtonCalcul(x, z);
  if (MEMO_RELIEF.size > 40000) MEMO_RELIEF.clear();
  MEMO_RELIEF.set(cle, h);
  return h;
}

function solDeWashingtonCalcul(x, z) {
  const brut = solBrutWashington(x, z);
  if (brut < WATER_LEVEL_DC + 1) return brut;      // ni fleuve ni bassin ne se comblent
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  let meilleur = null, force = 0;
  for (const e of ESPLANADES) {
    const d = Math.max(Math.abs(u - e.u) - e.bu, Math.abs(v - e.v) - e.bv);
    if (d >= 8) continue;
    const t = d <= 0 ? 1 : 1 - d / 8;
    if (t > force) { force = t; meilleur = e; }
  }
  return meilleur ? brut * (1 - force) + meilleur.h * force : brut;
}

// L'emprise réservée d'un monument : rien d'ordinaire ne s'y bâtit.
function surMonument(u, v) {
  for (const m of MONUMENTS_DC) {
    if (Math.abs(u - m.u) <= m.bu + 1 && Math.abs(v - m.v) <= m.bv + 1) return true;
  }
  return false;
}

// --- LE MÉTRO -----------------------------------------------------------------
//
// Le Metro de Washington a ouvert en 1976, et c'est le plus beau du monde pour
// une raison qui n'a rien du hasard : Harry Weese a refusé le carrelage et les
// colonnes. Ses stations sont **une seule voûte de béton nu**, sans un poteau,
// creusée de caissons rectangulaires — un gaufrier retourné au-dessus des
// voies. Le quai est central, carrelé d'hexagones bruns, et son bord s'allume
// quand un train approche.
//
// Six lignes de couleur dans la vraie ville. Ici quatre lignes — et **la Jaune
// fait la chose la plus spectaculaire du réseau, qui est vraie** : elle sort
// de terre dans East Potomac Park, franchit le Potomac À L'AIR LIBRE sur son
// pont posé dans le fleuve, et replonge vers Pentagon. C'est le seul endroit
// du centre où le métro voit le jour.
//
// **Georgetown n'a pas de station.** C'est vrai, c'est célèbre, et on ne
// corrige pas la vraie ville.

const STATIONS = [
  // la ligne Bleue — celle du Mall, d'est en ouest puis sous le fleuve
  { nom: 'Eastern Market', u: 56, v: 32 },
  { nom: 'Capitol South', u: 16, v: 25 },
  { nom: 'Federal Center SO', u: -29, v: 25 },
  { nom: "L'Enfant Plaza", u: -54, v: 26 },
  { nom: 'Smithsonian', u: -81, v: 10 },
  { nom: 'Federal Triangle', u: -80, v: -22 },
  { nom: 'Metro Center', u: -99, v: -46 },
  { nom: 'McPherson Square', u: -104, v: -61 },
  { nom: 'Farragut West', u: -138, v: -63 },
  { nom: 'Foggy Bottom', u: -173, v: -58 },
  { nom: 'Arlington Cemetery', u: -228, v: 27 },
  // La vraie station Pentagon est à v = 109, hors du monde : elle est remontée
  // au bord de l'esplanade — écart déclaré.
  { nom: 'Pentagon', u: -187, v: 93 },
  // la ligne Rouge — l'arc nord
  { nom: 'Union Station', u: 59, v: -43 },
  { nom: 'Judiciary Square', u: -30, v: -34 },
  { nom: 'Gallery Place', u: -54, v: -46 },
  { nom: 'Farragut North', u: -128, v: -71 },
  { nom: 'Dupont Circle', u: -148, v: -102 },
  // la ligne Verte — la 7e Rue, plein sud
  { nom: 'Mount Vernon Square', u: -54, v: -84 },
  { nom: 'Archives', u: -53, v: -21 },
  { nom: 'Waterfront', u: -34, v: 71 },
];
const PAR_NOM = new Map(STATIONS.map((s) => [s.nom, s]));

export const LIGNES = [
  {
    nom: 'Bleue', teinte: 0x2f6cc4, emoji: '🔵',
    arrets: ['Eastern Market', 'Capitol South', 'Federal Center SO', "L'Enfant Plaza",
      'Smithsonian', 'Federal Triangle', 'Metro Center', 'McPherson Square',
      'Farragut West', 'Foggy Bottom', 'Arlington Cemetery', 'Pentagon'],
  },
  {
    nom: 'Rouge', teinte: 0xd0342c, emoji: '🔴',
    arrets: ['Union Station', 'Judiciary Square', 'Gallery Place', 'Metro Center',
      'Farragut North', 'Dupont Circle'],
  },
  {
    nom: 'Verte', teinte: 0x1c9c5c, emoji: '🟢',
    arrets: ['Mount Vernon Square', 'Gallery Place', 'Archives', "L'Enfant Plaza", 'Waterfront'],
  },
  {
    // LA JAUNE ET SON PONT. Elle quitte L'Enfant Plaza sous terre, sort de
    // terre dans East Potomac Park, franchit le fleuve sur son pont — on voit
    // le train passer au-dessus de l'eau — et replonge devant Pentagon.
    nom: 'Jaune', teinte: 0xe8c33a, emoji: '🟡', pont: true,
    arrets: ["L'Enfant Plaza", 'Pentagon'],
  },
];

const PROFONDEUR = 14;         // le ballast, sous le sol
const DEMI_TUNNEL = 4;         // le tunnel courant : neuf blocs de large
const H_TUNNEL = 5;            // et cinq blocs de hauteur libre
const DEMI_VOUTE = 7;          // la station : quinze blocs sous la voûte
const H_VOUTE = 9;             // neuf blocs sous la clef, au-dessus du quai
const DEMI_STATION = 12;       // le quai fait vingt-cinq blocs de long
const ECART_VOIE = 4;          // l'écart de chaque voie à l'axe du tunnel
const PENTE = 0.28;            // la pente maximale de la voie, en blocs par bloc
const TIROIR = 9;              // le prolongement au-delà du terminus
const PONT_Y = WATER_LEVEL_DC + 4;   // le tablier du pont de la Jaune

// Chaque ligne, échantillonnée bloc par bloc, avec sa cote.
function calculerTrace(ligne) {
  const arrets = ligne.arrets.map((n) => PAR_NOM.get(n));
  const pts = [];
  for (let i = 0; i < arrets.length - 1; i++) {
    const a = arrets[i], b = arrets[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(b.u - a.u, b.v - a.v)));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push({ u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t, arret: k === 0 ? a : null });
    }
  }
  pts.push({ nom: 'fin', u: arrets[arrets.length - 1].u, v: arrets[arrets.length - 1].v, arret: arrets[arrets.length - 1] });

  // Le tiroir de retournement, au-delà de chaque terminus : sans lui, le
  // demi-cercle du demi-tour se referme SUR le quai.
  const prolonger = (a, b, ou) => {
    const len = Math.hypot(b.u - a.u, b.v - a.v) || 1;
    const du = (b.u - a.u) / len, dv = (b.v - a.v) / len;
    const suite = [];
    for (let k = 1; k <= TIROIR; k++) suite.push({ u: b.u + du * k, v: b.v + dv * k, arret: null });
    if (ou === 'fin') pts.push(...suite); else pts.unshift(...suite.reverse());
  };
  prolonger(pts[pts.length - 2], pts[pts.length - 1], 'fin');
  prolonger(pts[1], pts[0], 'debut');

  const sol = pts.map((p) => solDeWashington(WASHINGTON.x + p.u, WASHINGTON.z + p.v));

  // D'abord l'ENVELOPPE BASSE des tunnels : quatorze blocs sous la rue, et
  // jamais plus de pente qu'un quart de bloc par bloc. C'est elle qui fait
  // plonger la Bleue sous le fleuve et remonter tout seule.
  const y = pts.map((_, i) => sol[i] - PROFONDEUR);
  for (let i = 1; i < pts.length; i++) y[i] = Math.min(y[i], y[i - 1] + PENTE);
  for (let i = pts.length - 2; i >= 0; i--) y[i] = Math.min(y[i], y[i + 1] + PENTE);

  // Puis, pour la Jaune, LE PROFIL DU PONT : le tablier au-dessus de l'eau, et
  // une rampe qui en redescend à la pente maximale de part et d'autre. On prend
  // le MAX des deux profils — l'enveloppe basse rabotait le tablier à la cote
  // du tunnel, et le « pont » restait un tube sous le fleuve. Le max de deux
  // profils valides en pente est valide en pente : au croisement, chaque côté
  // suit l'un des deux.
  if (ligne.pont) {
    const rampe = pts.map(() => -1e9);
    let d = 1e9;
    for (let i = 0; i < pts.length; i++) {
      d = surEauWashington(pts[i].u, pts[i].v) ? 0 : d + 1;
      rampe[i] = Math.max(rampe[i], PONT_Y - d * PENTE);
    }
    d = 1e9;
    for (let i = pts.length - 1; i >= 0; i--) {
      d = surEauWashington(pts[i].u, pts[i].v) ? 0 : d + 1;
      rampe[i] = Math.max(rampe[i], PONT_Y - d * PENTE);
    }
    for (let i = 0; i < pts.length; i++) y[i] = Math.max(y[i], rampe[i]);
  }
  pts.forEach((p, i) => { p.y = Math.round(y[i]); });
  return pts;
}

const TRACES = new Map(LIGNES.map((l) => [l.nom, calculerTrace(l)]));

// Les stations, avec la cote de leur quai. Une station desservie par deux
// lignes garde la plus profonde : la voûte du dessous commande.
const QUAIS = new Map();
for (const [nom, pts] of TRACES) {
  for (let i = 0; i < pts.length; i++) {
    if (!pts[i].arret) continue;
    const s = pts[i].arret;
    const av = pts[Math.max(0, i - 1)], ap = pts[Math.min(pts.length - 1, i + 1)];
    const du = ap.u - av.u, dv = ap.v - av.v;
    const len = Math.hypot(du, dv) || 1;
    const existant = QUAIS.get(s.nom);
    if (existant && existant.y <= pts[i].y) continue;
    QUAIS.set(s.nom, {
      nom: s.nom, u: s.u, v: s.v, y: pts[i].y,
      du: du / len, dv: dv / len, ligne: nom,
    });
  }
}
export const QUAIS_METRO = [...QUAIS.values()];

// La bouche d'accès : l'escalier droit qui remonte du quai à la rue, avec un
// palier tous les six, et la MEZZANINE à mi-hauteur — la salle des portillons,
// comme dans les vraies stations.
export const BOUCHES_METRO = QUAIS_METRO.map((q) => {
  const cotes = [[-q.dv, q.du], [q.dv, -q.du], [q.du, q.dv], [-q.du, -q.dv]];
  const sol = Math.round(solDeWashington(WASHINGTON.x + q.u, WASHINGTON.z + q.v));
  const marches = Math.max(4, sol - 1 - (q.y + 1));
  const paliers = Math.floor(marches / 6);
  const longueur = DEMI_VOUTE + 1 + marches + paliers * 2;
  const note = ([nu, nv]) => {
    let mal = 0;
    for (let d = DEMI_VOUTE + 1; d <= longueur + 2; d++) {
      const u = q.u + nu * d, v = q.v + nv * d;
      if (surEauWashington(u, v)) mal += 100;
      if (!dansBoite(u, v)) mal += 100;
      if (d >= longueur - 4 && surMonument(u, v)) mal += 30;
      if (d === longueur) {
        mal += Math.abs(solDeWashington(WASHINGTON.x + u, WASHINGTON.z + v) - sol) * 4;
      }
    }
    return mal;
  };
  const [nu, nv] = cotes.reduce((a, b) => (note(b) < note(a) ? b : a));
  return {
    nom: q.nom, u: q.u, v: q.v, y: q.y, sol, nu, nv, marches, longueur,
    tu: q.u + nu * longueur, tv: q.v + nv * longueur,
  };
});

// LES DEUX VOIES D'UNE LIGNE. La rame roule à droite, comme partout aux
// États-Unis ; au terminus elle fait demi-tour dans le tiroir.
function voiesDeLigne(nom) {
  const pts = TRACES.get(nom);
  if (!pts) return [];
  const sens = (i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b.u - a.u, b.v - a.v) || 1;
    return [(b.u - a.u) / len, (b.v - a.v) / len];
  };
  const cote = (i, signe) => {
    const [du, dv] = sens(i);
    return {
      u: pts[i].u + -dv * ECART_VOIE * signe,
      v: pts[i].v + du * ECART_VOIE * signe,
      y: pts[i].y,
    };
  };
  const arc = (i, signe) => {
    const [du, dv] = sens(i);
    const out = [];
    for (let k = 1; k <= 5; k++) {
      const ang = (k / 6) * Math.PI, co = Math.cos(ang), si = Math.sin(ang);
      out.push({
        u: pts[i].u + ECART_VOIE * signe * (-dv * co + du * si),
        v: pts[i].v + ECART_VOIE * signe * (du * co + dv * si),
        y: pts[i].y,
      });
    }
    return out;
  };
  return [
    ...pts.map((_, i) => cote(i, 1)),
    ...arc(pts.length - 1, 1),
    ...pts.map((_, i) => cote(i, -1)).reverse(),
    ...arc(0, -1),
  ];
}

// Rangement par CASES — sur u ET v, pas seulement v. La première version
// indexait par bande de v : une colonne de Georgetown consultait alors tous
// les segments du réseau à sa latitude, soit des dizaines, pour n'en garder
// aucun. Sur soixante-cinq mille colonnes, c'était le premier poste de coût
// de toute la ville. Une case de huit sur huit ne contient que ce qui la
// traverse vraiment.
const BANDE = 8;
const GRILLE_METRO = new Map();
const cleCase = (bu, bv) => bu * 1024 + bv;
function ranger(u0, u1, v0, v1, obj) {
  for (let bu = Math.floor(u0 / BANDE); bu <= Math.floor(u1 / BANDE); bu++) {
    for (let bv = Math.floor(v0 / BANDE); bv <= Math.floor(v1 / BANDE); bv++) {
      const cle = cleCase(bu, bv);
      if (!GRILLE_METRO.has(cle)) GRILLE_METRO.set(cle, []);
      GRILLE_METRO.get(cle).push(obj);
    }
  }
}
for (const [nom, pts] of TRACES) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const seg = {
      quoi: 'voie', ligne: nom, u0: a.u, v0: a.v, u1: b.u, v1: b.v,
      y0: a.y, y1: b.y, uMin: Math.min(a.u, b.u), uMax: Math.max(a.u, b.u),
    };
    ranger(seg.uMin - 10, seg.uMax + 10, Math.min(a.v, b.v) - 10, Math.max(a.v, b.v) + 10, seg);
  }
}
for (const q of QUAIS_METRO) {
  const st = { quoi: 'station', ...q };
  const r = DEMI_STATION + 9;
  ranger(q.u - r, q.u + r, q.v - r, q.v + r, st);
}
// Le gabarit des rames, creusé en tout dernier : rien ne peut se mettre en
// travers d'un train.
for (const l of LIGNES) {
  const voie = voiesDeLigne(l.nom);
  for (let i = 0; i < voie.length; i++) {
    const a = voie[i], b = voie[(i + 1) % voie.length];
    const seg = {
      quoi: 'gabarit', u0: a.u, v0: a.v, u1: b.u, v1: b.v, y0: a.y, y1: b.y,
      uMin: Math.min(a.u, b.u), uMax: Math.max(a.u, b.u),
    };
    ranger(seg.uMin - 3, seg.uMax + 3, Math.min(a.v, b.v) - 3, Math.max(a.v, b.v) + 3, seg);
  }
}
for (const b of BOUCHES_METRO) {
  const st = { quoi: 'bouche', ...b };
  ranger(Math.min(b.u, b.tu) - 4, Math.max(b.u, b.tu) + 4,
    Math.min(b.v, b.tv) - 4, Math.max(b.v, b.tv) + 4, st);
}

// Coordonnées le long d'un objet : `le` suit l'axe, `tr` en travers.
function repere(u, v, cu, cv, du, dv) {
  const eu = u - cu, ev = v - cv;
  return { le: eu * du + ev * dv, tr: eu * -dv + ev * du };
}

// Une colonne est-elle sur une bouche de métro ?
function surBouche(u, v) {
  const segs = GRILLE_METRO.get(cleCase(Math.floor(u / BANDE), Math.floor(v / BANDE)));
  if (!segs) return false;
  for (const s of segs) {
    if (s.quoi !== 'bouche') continue;
    const r = repere(u, v, s.u, s.v, s.nu, s.nv);
    if (r.le > DEMI_VOUTE - 1 && r.le < s.longueur + 4 && Math.abs(r.tr) <= 3) return true;
  }
  return false;
}

// Où la rame s'arrête, en rangs de points du tracé — une fois par sens.
export function arretsDeLigne(nom) {
  const pts = TRACES.get(nom);
  if (!pts) return [];
  const n = pts.length;
  const rangs = [];
  pts.forEach((p, i) => {
    if (!p.arret) return;
    rangs.push(i);
    rangs.push(n + 5 + (n - 1 - i));
  });
  return rangs;
}

export function traceLigneMetro(nom) {
  return voiesDeLigne(nom).map((p) => ({
    x: WASHINGTON.x + p.u, y: p.y + 0.4, z: WASHINGTON.z + p.v,
  }));
}

// --- creuser (et parfois BÂTIR) le métro ----------------------------------------
//
// Tout se fait colonne par colonne. On collecte ce que chaque tronçon a à dire,
// on pose LE VIDE D'ABORD, on abandonne les pleins qui tomberaient dedans, le
// mobilier de station se pose sans condition, et le gabarit des rames se creuse
// en tout dernier. C'est l'ordre qui a fait passer la Bleue de soixante et un
// points murés à zéro, et il ne se change pas.

const hauteurVoute = (tr) => Math.round(H_VOUTE * Math.sqrt(Math.max(0, 1 - (tr / (DEMI_VOUTE + 0.4)) ** 2)));

// Le caisson en damier : la signature de Harry Weese, un gaufrier retourné.
const caisson = (a, b) => (((Math.floor(a / 2) + Math.floor(b / 2)) & 1) === 0 ? BETON : BETON_CLAIR);

function creuserMetro(u, v, h, poser) {
  const segs = GRILLE_METRO.get(cleCase(Math.floor(u / BANDE), Math.floor(v / BANDE)));
  if (!segs) return false;
  const vides = [];      // [y0, y1] : ce qui doit être creusé
  const pleins = [];     // [y, id] : structure, abandonnée si elle tombe dans un vide
  const apres = [];      // [y, id] : mobilier, posé quoi qu'il arrive
  const gabarit = [];    // [y0, y1] : le passage des rames, creusé en tout dernier
  const creuser = (y0, y1) => { if (y1 >= y0) vides.push([y0, y1]); };

  for (const s of segs) {
    if (s.quoi === 'gabarit') {
      if (u < s.uMin - 3 || u > s.uMax + 3) continue;
      const du = s.u1 - s.u0, dv = s.v1 - s.v0;
      const len2 = du * du + dv * dv;
      let t = len2 > 0 ? ((u - s.u0) * du + (v - s.v0) * dv) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      if (Math.hypot(u - (s.u0 + t * du), v - (s.v0 + t * dv)) > 1.4) continue;
      const yr = Math.round(s.y0 + (s.y1 - s.y0) * t);
      gabarit.push([yr + 1, yr + 3]);
      continue;
    }
    if (s.quoi === 'voie') {
      if (u < s.uMin - 6 || u > s.uMax + 6) continue;
      const du = s.u1 - s.u0, dv = s.v1 - s.v0;
      const len2 = du * du + dv * dv;
      let t = len2 > 0 ? ((u - s.u0) * du + (v - s.v0) * dv) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const tr = Math.hypot(u - (s.u0 + t * du), v - (s.v0 + t * dv));
      if (tr > DEMI_TUNNEL + 1.2) continue;
      const yr = Math.round(s.y0 + (s.y1 - s.y0) * t);
      const rail = Math.abs(tr - ECART_VOIE) < 0.7 || Math.abs(tr + ECART_VOIE) < 0.7;
      // la traverse : un bloc sombre sous les deux rails, un bloc sur deux le
      // long de la voie — c'est elle qui fait « chemin de fer » vu du quai
      const traverse = (Math.round(t * Math.hypot(du, dv) + s.u0 + s.v0) & 1) === 0;

      // LE PONT DE LA JAUNE. Quand la voie est au niveau du sol ou au-dessus,
      // on ne creuse pas un tunnel : on BÂTIT — un tablier qui porte LES DEUX
      // VOIES (elles sont à quatre blocs de l'axe : le tablier va jusqu'à
      // quatre et demi, sans quoi les rails flottaient au-dessus du fleuve),
      // une bordure basse en guise de parapet — basse, parce que le gabarit
      // des rames évide tout ce qui dépasse au-dessus du tablier — et une
      // pile jusqu'au lit du fleuve, une rangée sur cinq. C'est le seul
      // endroit du réseau où le train voit le jour, comme dans la vraie ville.
      if (yr >= h - 1) {
        if (tr > DEMI_TUNNEL + 0.5) {
          pleins.push([yr, BETON]);                        // la bordure du tablier
          continue;
        }
        pleins.push([yr, rail ? RAIL : (traverse ? TRAVERSE : BETON)]);   // le tablier
        creuser(yr + 1, yr + 4);                           // rien au-dessus du tablier
        if (tr < 1.2 && ((Math.round(v) % 5) + 5) % 5 === 0) {
          for (let y = yr - 1; y >= WATER_BED - 1; y--) pleins.push([y, BETON]);
        }
        continue;
      }

      if (tr > DEMI_TUNNEL) {                              // le piédroit
        for (let y = yr; y <= yr + H_TUNNEL + 1; y++) pleins.push([y, BETON]);
        continue;
      }
      pleins.push([yr, rail ? RAIL : (traverse && tr < ECART_VOIE + 1 ? TRAVERSE : BETON)]);
      creuser(yr + 1, yr + H_TUNNEL);
      pleins.push([yr + H_TUNNEL + 1, caisson(u, v)]);
      continue;
    }

    if (s.quoi === 'station') {
      const r = repere(u, v, s.u, s.v, s.du, s.dv);
      if (Math.abs(r.le) > DEMI_STATION + 1 || Math.abs(r.tr) > DEMI_VOUTE + 1.2) continue;
      const yr = s.y, atr = Math.abs(r.tr);
      if (atr > DEMI_VOUTE || Math.abs(r.le) > DEMI_STATION) {
        for (let y = yr; y <= yr + 1 + hauteurVoute(0); y++) pleins.push([y, BETON]);
        continue;
      }
      // Le sol est PLEIN sous les voies, le quai ne dépasse que d'un bloc :
      // un enfant qui tombe du quai remonte d'une seule marche.
      const surRail = Math.abs(atr - ECART_VOIE) < 0.7;
      pleins.push([yr, surRail ? RAIL : ((Math.round(r.le) & 1) === 0 && atr > 2.4 ? TRAVERSE : BETON)]);
      const haut = yr + 1 + hauteurVoute(atr);
      creuser(yr + 1, haut - 1);
      pleins.push([haut, caisson(r.le, r.tr)]);            // les caissons de la voûte
      if (atr <= 2.4) {
        // le quai central : carrelage hexagonal brun, bordure de granit noir
        apres.push([yr + 1, atr > 1.7 ? QUAI_BORD : CARREAU]);
        // le pylône brun, tous les huit blocs
        if (atr < 0.6 && (((Math.round(r.le) % 8) + 8) % 8 === 0)) {
          apres.push([yr + 2, CARREAU], [yr + 3, CARREAU], [yr + 4, CARREAU]);
        }
        // un banc au milieu du quai, entre les pylônes
        if (atr < 0.6 && (((Math.round(r.le) % 8) + 8) % 8 === 4)) {
          apres.push([yr + 2, PROP_START + 4]);
        }
        // la lampe du quai, à chaque bout
        if (atr < 0.6 && Math.abs(Math.abs(r.le) - (DEMI_STATION - 2)) < 0.5) {
          apres.push([yr + 2, PROP_START + 9]);
        }
      }
      continue;
    }

    if (s.quoi === 'bouche') {
      const r = repere(u, v, s.u, s.v, s.nu, s.nv);
      if (r.le < DEMI_VOUTE - 0.5 || r.le > s.longueur + 3.5 || Math.abs(r.tr) > 2.6) continue;
      // le pylône brun de la rue : le « M » du Metro, sur le sol LOCAL.
      if (r.le > s.longueur + 0.5) {
        if (Math.abs(r.tr) < 0.6) {
          for (let y = h; y <= h + 3; y++) apres.push([y, CARREAU]);
          apres.push([h + 4, MARBRE]);
        }
        continue;
      }
      // LA MEZZANINE : six blocs de salle des portillons à mi-profondeur,
      // juste après la voûte. L'escalier de la rue y atterrit, une dernière
      // volée descend au quai — comme dans les vraies stations de Weese.
      const MEZZ = 6;
      const yMezz = Math.min(h - 5, s.y + 6);
      if (r.le <= DEMI_VOUTE + MEZZ) {
        if (Math.abs(r.tr) > 1.8) {                        // les joues de la salle
          for (let yy = yMezz - 1; yy <= yMezz + 4; yy++) pleins.push([yy, BETON]);
          continue;
        }
        // la volée quai → mezzanine : une marche par bloc depuis la voûte
        const monteBas = Math.round(r.le) - (DEMI_VOUTE - 1);
        const yBas = Math.min(yMezz, s.y + 1 + Math.max(0, monteBas));
        apres.push([yBas, GRANIT]);
        creuser(yBas + 1, yBas + 3);
        pleins.push([yBas + 4, caisson(r.le, r.tr)]);
        // les portillons, au milieu de la salle : deux montants et la barrière
        if (Math.abs(r.le - (DEMI_VOUTE + MEZZ - 2)) < 0.5 && yBas === yMezz) {
          if (Math.abs(r.tr) > 0.8) apres.push([yMezz + 1, QUAI_BORD]);
        }
        continue;
      }
      // la volée mezzanine → rue, avec un palier tous les six
      const pas = Math.max(0, Math.round(r.le) - (DEMI_VOUTE + MEZZ + 1));
      const monte = Math.floor(pas / 8) * 6 + Math.min(6, pas % 8);
      const y = Math.min(h - 1, yMezz + 1 + monte);
      if (Math.abs(r.tr) > 1.8) {                          // les joues de l'escalier
        for (let yy = y; yy <= Math.min(h, y + 4); yy++) pleins.push([yy, GRANIT]);
        continue;
      }
      apres.push([y, GRANIT]);
      creuser(y + 1, y + 3);
      if (y + 4 < h) pleins.push([y + 4, GRANIT]);
      continue;
    }
  }

  if (!vides.length && !pleins.length && !apres.length && !gabarit.length) return false;
  for (const [y0, y1] of vides) for (let y = y0; y <= y1; y++) poser(y - h, BLOCK.AIR);
  const dansLeVide = (y) => vides.some(([a, b]) => y >= a && y <= b);
  for (const [y, id] of pleins) if (!dansLeVide(y)) poser(y - h, id);
  for (const [y, id] of apres) poser(y - h, id);
  for (const [y0, y1] of gabarit) for (let y = y0; y <= y1; y++) poser(y - h, BLOCK.AIR);
  return true;
}

// --- le bâti ordinaire ---------------------------------------------------------
//
// Aucune tour — la loi de 1910. Et **on habite dedans** : chaque maison a un
// rez-de-chaussée meublé, un vrai escalier, un étage, et deux portes face à
// face. Ce n'est pas un décor peint, c'est un bâtiment.
//
// L'îlot fait douze blocs de côté : trois de rue, neuf de bâti. À l'intérieur,
// les coordonnées locales (iu, iv) vont de 0 à 8.

const AXE_ILOT = new Map();
function axeDeLot(la, lb) {
  const cle = `${la},${lb}`;
  const memo = AXE_ILOT.get(cle);
  if (memo !== undefined) return memo;
  const libre = (mu, mv) => lotWashingtonLibre(
    WASHINGTON.x + la * PAS_RUE + mu, WASHINGTON.z + lb * PAS_RUE + mv);
  const ns = (libre(6, 3) || libre(7, 3)) && (libre(6, 11) || libre(7, 11));
  const eo = (libre(3, 6) || libre(3, 7)) && (libre(11, 6) || libre(11, 7));
  const tire = tirage(la, lb, 73) < 0.5;
  const axe = (tire && ns) || !eo;
  if (AXE_ILOT.size > 8192) AXE_ILOT.clear();
  AXE_ILOT.set(cle, axe);
  return axe;
}

export function batirColonneWashington(x, z, h, poser) {
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  if (!dansBoite(u, v)) return;

  creuserMetro(u, v, h, poser);
  if (!lotWashingtonLibre(x, z)) return;

  const q = quartierDe(u, v);
  const la = Math.floor(u / PAS_RUE), lb = Math.floor(v / PAS_RUE);
  const r = tirage(la, lb, 71);
  const bh = Math.min(PLAFOND_LOI, q.hMin + Math.floor(r * (q.hMax - q.hMin + 1)));
  const palette = MURS[q.genre] || MURS.brique;
  const mur = palette[Math.floor(tirage(la, lb, 72) * palette.length) % palette.length];
  const toit = TOITS[q.genre] || ARDOISE;

  const oE = lotWashingtonLibre(x + 1, z), oO = lotWashingtonLibre(x - 1, z);
  const oS = lotWashingtonLibre(x, z + 1), oN = lotWashingtonLibre(x, z - 1);
  const dedans = oE && oO && oS && oN;

  // La position dans l'îlot : la rue occupe les trois premières colonnes, le
  // bâti les neuf suivantes — (iu, iv) de 0 à 8 à l'intérieur.
  const mu = ((u % PAS_RUE) + PAS_RUE) % PAS_RUE;
  const mv = ((v % PAS_RUE) + PAS_RUE) % PAS_RUE;
  const iu = mu - (DEMI_CHAUSSEE + 1), iv = mv - (DEMI_CHAUSSEE + 1);
  const axeNS = axeDeLot(la, lb);
  // Les portes : deux blocs de large, au milieu de deux façades opposées.
  const porte = axeNS
    ? (mv === DEMI_CHAUSSEE + 1 || mv === PAS_RUE - 1) && (mu === 6 || mu === 7)
    : (mu === DEMI_CHAUSSEE + 1 || mu === PAS_RUE - 1) && (mv === 6 || mv === 7);

  // Les niveaux : un étage tous les quatre blocs, autant que la hauteur en
  // laisse. Le dernier plancher est le toit.
  const etages = Math.max(1, Math.floor(bh / 4));

  if (dedans) {
    poser(0, q.genre === 'brique' ? PLANCHER : GRANIT);      // le rez-de-chaussée

    // L'ESCALIER : une volée droite le long du mur du fond, qui monte d'un
    // bloc par bloc — iv 6 monte, iv 7 redescend vers l'étage suivant, en
    // zigzag. La trémie au-dessus des marches reste ouverte.
    const surMontee = iv === 6 && iu >= 1 && iu <= 4;
    const surRedescente = iv === 7 && iu >= 1 && iu <= 4;
    for (let e = 0; e < etages; e++) {
      const dalle = (e + 1) * 4;
      if (dalle >= bh) break;
      // la trémie : pas de dalle au-dessus de l'escalier
      const tremie = (e % 2 === 0) ? surMontee || (iv === 6 && iu === 5)
        : surRedescente || (iv === 7 && iu === 0);
      if (!tremie) poser(dalle, e === etages - 1 ? toit : PLANCHER);
    }
    // les marches elles-mêmes
    for (let e = 0; e < etages - 1; e++) {
      const base = e * 4;
      if (e % 2 === 0 && surMontee) poser(base + iu, GRANIT);
      if (e % 2 === 1 && surRedescente) poser(base + (5 - iu), GRANIT);
    }

    // DE QUOI HABITER, étage par étage : une lampe, une table, un canapé —
    // pas les mêmes coins à chaque étage, pour que monter serve à quelque
    // chose.
    for (let e = 0; e < etages; e++) {
      const sol = e * 4;
      if (sol + 1 >= bh) break;
      if (iu === 4 && iv === 3) poser(sol + 1, PROP_START + 9);            // la lampe
      if (iu === 2 && iv === 2 && e === 0) poser(sol + 1, PROP_START + 6); // la table
      if (iu === 6 && iv === 3 && tirage(la, lb, 74 + e) > 0.4) poser(sol + 1, PROP_START + 4);
    }
    poser(bh, toit);
    return;
  }

  // Les façades.
  const face = (!oE || !oO) ? v : u;
  for (let y = 1; y < bh; y++) {
    if (porte && y <= 2) continue;                            // l'entrée
    // une fenêtre par étage, sur un rythme de façade
    const dansEtage = y % 4;
    const fenetre = (dansEtage === 2 || dansEtage === 3) && (face & 1) === 1;
    // Les bureaux avaient déjà leur mur-rideau opaque ; les immeubles de
    // brique et de calcaire, eux, posaient encore du VERRE — 1,2 % du volume
    // bâti, le reliquat de la même panne que New York, Londres, Nice, Lille
    // et San Francisco. `ARCHI.ETAGE` porte ses petits bois dans sa texture.
    let id = fenetre ? (q.genre === 'bureaux' ? VERRE_BLEU : ARCHI.ETAGE) : mur;
    if (!fenetre && dansEtage === 0 && q.genre === 'brique') id = CALCAIRE;  // le bandeau
    poser(y, id);
  }
  poser(0, q.genre === 'brique' ? PLANCHER : GRANIT);
  poser(bh, toit);
  if (porte && q.genre === 'brique') poser(0, GRANIT);        // le perron
}

// --- ce que la carte doit peindre ----------------------------------------------

const GRIS_RUE = [62, 64, 70];
const BEIGE_PLACE = [206, 198, 178];
const VERT_PELOUSE = [118, 176, 96];
const VERT_ARBRE = [60, 122, 62];
const EAU_VILLE = [70, 122, 190];
const ROSE_CERISIER = [232, 168, 198];
const BLANC_STELE = [232, 230, 224];
const SABLE_RIVE = [216, 204, 164];

export function couleurCarteWashington(x, z) {
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  if (!dansBoite(u, v)) return null;
  const sol = solWashington(x, z);
  if (sol === EAU) return EAU_VILLE;
  if (sol === CERISIER) return ROSE_CERISIER;
  if (sol === ARBRE) return VERT_ARBRE;
  if (sol === HERBE) return VERT_PELOUSE;
  if (sol === MARBRE) return BLANC_STELE;
  if (sol === SABLE) return SABLE_RIVE;
  if (sol === GRAVIER) return BEIGE_PLACE;
  if (sol === TROTTOIR) return [150, 150, 146];
  if (sol !== null) return GRIS_RUE;
  const q = quartierDe(u, v);
  const base = q.genre === 'brique' ? [150, 96, 82]
    : q.genre === 'bureaux' ? [138, 146, 158]
      : q.genre === 'chinois' ? [168, 88, 76] : [214, 206, 184];
  const t = 0.82 + tirage(Math.floor(u / PAS_RUE), Math.floor(v / PAS_RUE), 91) * 0.34;
  return [base[0] * t, base[1] * t, base[2] * t];
}

// Les lieux nommés que la carte affiche de près.
export function lieuxDeWashington() {
  return [
    ...CERCLES.map((c) => ({ name: c.nom, x: WASHINGTON.x + c.u, z: WASHINGTON.z + c.v, r: 0 })),
    ...quartiersDeWashington(),
  ];
}
