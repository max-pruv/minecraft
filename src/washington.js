// Washington.
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
// de Washington au milieu, le Lincoln Memorial à l'autre bout, et les musées
// alignés de part et d'autre. Rien d'autre au monde n'est bâti comme ça.
//
// Enfin — et c'est le plus surprenant — **il n'y a pas de gratte-ciel**. La loi
// de 1910 (*Height of Buildings Act*) plafonne les immeubles à la largeur de la
// rue plus vingt pieds, cent trente pieds au maximum, soit une douzaine
// d'étages. Résultat : une ville basse et plate d'où seuls émergent le dôme du
// Capitole, l'obélisque et les clochers. Après Manhattan, c'est le contraste
// qui frappe — et il est voulu, pas subi.
//
// **Le point zéro de la ville est le Capitole.** Ce n'est pas une commodité de
// programmeur : c'est la vérité du plan. Les quatre quadrants (NO, NE, SO, SE)
// rayonnent de la coupole, les rues se numérotent à partir d'elle, et une
// adresse à Washington se lit comme des coordonnées. Le module fait pareil.
//
// --- l'échelle ---------------------------------------------------------------
//
// Une seule, comme à Manhattan et à San Francisco : **seize blocs par
// kilomètre**, et un ancrage, le Capitole. Chaque lieu est donné par sa vraie
// latitude et sa vraie longitude ; `de()` fait le reste. Le jour où l'échelle
// change, toute la ville suit — rien n'est recopié à la main.
//
// Trois entorses, les seules, et toutes trois pour la même raison : à seize
// blocs par kilomètre un bâtiment vrai tient sur trois blocs, et on n'entre pas
// dans trois blocs.
//
//   · **les monuments sont dessinés bien plus grands que nature**, et pas tous
//     du même facteur. Chacun est fait aussi petit qu'il peut l'être en restant
//     visitable — un couloir fait un bloc, une salle en fait trois — ce qui
//     exagère surtout les petits : le Pentagone, immense pour de vrai, tient
//     presque à l'échelle (trois fois) ; le Capitole est six fois trop long ;
//     l'obélisque, qui ne mesure que dix-sept mètres de côté, est trente fois
//     trop large. C'est la même entorse qu'à Manhattan, où l'Empire State
//     occupe onze blocs pour cent vingt-neuf mètres.
//   · **la largeur du Mall est étirée**, sa longueur non. L'axe garde ses
//     distances vraies au bloc près ; la bande nord-sud est écartée pour que
//     les musées se posent de part et d'autre sans manger la pelouse.
//   · **quelques monuments reculent de leur vraie adresse**, et c'est la
//     conséquence directe de la première entorse : agrandis, ils se
//     recouvriraient. La Cour suprême et la Bibliothèque du Congrès s'écartent
//     d'un Capitole devenu six fois trop large ; les cinq mémoriaux de West
//     Potomac Park, serrés dans quelques centaines de mètres réels, s'espacent
//     de dix blocs. **Leur ordre et leur côté sont gardés** — le Vietnam au nord
//     du Lincoln, la Corée au sud — et chaque écart est écrit à côté de sa ligne
//     dans `MONUMENTS_DC`.
//
// Le reste — les rives, les collines, les cercles, le tracé des avenues, les
// stations de métro — est à sa place réelle, calculé et non deviné.

import { BLOCK, CITY_BLOCK, DECOR_START, PROP_START } from './blocks.js';
import { rangerVoies, solDesVoies } from './voies.js';

const uni = (c) => DECOR_START + c * 10;

// --- la palette --------------------------------------------------------------
//
// Washington est une ville de calcaire et de brique. Le marbre blanc est
// réservé aux monuments ; le calcaire crème fait les ministères ; la brique
// rouge fait les maisons de ville, à Georgetown comme sur Capitol Hill.

const MARBRE = uni(27);          // le marbre blanc des monuments
const CALCAIRE = uni(28);        // le calcaire crème des ministères
const GRANIT = CITY_BLOCK.GRANITE;
const BRIQUE = BLOCK.BRICK;      // les maisons de ville
const BRIQUE_SOMBRE = uni(18);
const TUILE = BLOCK.TERRACOTTA;  // les toits rouges du Triangle fédéral
const CUIVRE = CITY_BLOCK.COPPER;
const ARDOISE = uni(25);
const ACIER = uni(24);
const VERRE = BLOCK.GLASS;
const VERRE_BLEU = CITY_BLOCK.CURTAIN;
const BETON = BLOCK.STONEBRICK;
const BETON_CLAIR = uni(23);

const BITUME = CITY_BLOCK.ASPHALT;
const TROTTOIR = CITY_BLOCK.SIDEWALK;
const LIGNE = CITY_BLOCK.ROADLINE;
const PASSAGE = CITY_BLOCK.CROSSWALK;

const HERBE = BLOCK.GRASS;
const EAU = BLOCK.WATER;
const ARBRE = BLOCK.LEAVES;
const GRAVIER = BLOCK.GRAVEL;    // les allées de sable du Mall
const SABLE = BLOCK.SAND;
const CERISIER = uni(15);        // les cerisiers du Tidal Basin, en fleur

// Le métro : béton brut des voûtes, carrelage brun des quais, et la couleur de
// chaque ligne.
const CARREAU = uni(18);         // le carrelage hexagonal brun, marque de fabrique
const QUAI_BORD = uni(26);       // le granit noir du bord de quai
const RAIL = uni(24);

// --- l'ancrage et l'échelle ---------------------------------------------------

// Le Capitole, à sa vraie latitude et sa vraie longitude. Tout part de là.
const CAPITOLE_LAT = 38.88972;
const CAPITOLE_LON = -77.00889;

const BLOCS_PAR_KM = 16;
const KM_PAR_DEGRE_LAT = 110.99;
const KM_PAR_DEGRE_LON = 86.65;   // à 38,9° de latitude nord

const PAR_LAT = KM_PAR_DEGRE_LAT * BLOCS_PAR_KM;   // blocs par degré de latitude
const PAR_LON = KM_PAR_DEGRE_LON * BLOCS_PAR_KM;

// Un lieu réel → ses coordonnées locales. `u` vers l'est, `v` vers le sud,
// exactement comme x et z dans le monde.
const de = (lat, lon) => [
  Math.round((lon - CAPITOLE_LON) * PAR_LON),
  Math.round((CAPITOLE_LAT - lat) * PAR_LAT),
];

// LE CAPITOLE, DANS LE MONDE.
//
// Placer une ville sur cette carte-ci, c'est un compromis assumé : la carte du
// jeu n'est pas encore géographique (la refonte équirectangulaire est une tâche
// ouverte), et le sud-ouest de New York — là où est Washington — est justement
// l'endroit le plus encombré du monde : le point d'apparition, le musée et le
// quartier des enfants y sont déjà, et on ne déplace pas les maisons des
// enfants.
//
// Ce qu'on garde donc, c'est **la direction** : depuis Manhattan, Washington
// est au sud-ouest, à 44° de l'axe nord-sud là où la vraie relève 52°. Huit
// degrés d'écart, et la ville la plus proche de New York que la place
// disponible permette. La refonte de la carte la replacera au kilomètre près ;
// d'ici là, un enfant qui compare avec un vrai plan trouve Washington du bon
// côté de New York.
//
// L'emprise, elle, va **au-delà des terminus** : le tiroir de retournement et
// le demi-tour des rames dépassent Rosslyn de dix blocs à l'ouest et
// Stadium-Armory d'autant à l'est. Une emprise réglée sur les seules stations
// laissait les rames rouler dans la roche pour ce qui n'est pas de la ville.
export const WASHINGTON = { x: 90, z: 105 };

// L'emprise réelle de la ville, en blocs, autour du Capitole. Au-delà, la
// campagne reprend la main : ni sol de ville, ni relief de ville, ni bâti.
// Elle tient Georgetown et Arlington à l'ouest, la cathédrale au nord,
// Stadium-Armory à l'est, le confluent des deux rivières au sud.
export const BOITE = { u0: -98, u1: 56, v0: -88, v1: 52 };
export const WASHINGTON_R = 133;   // le cercle qui contient la boîte

const dansBoite = (u, v) => u >= BOITE.u0 && u <= BOITE.u1 && v >= BOITE.v0 && v <= BOITE.v1;

// LE FONDU DU POURTOUR, ET POURQUOI IL EST COURT.
//
// La campagne monte vers la capitale au lieu de buter dessus : sans ce fondu,
// le bord de la ville serait une falaise. Mais il déborde de l'emprise, et
// c'est là qu'est le danger — la première version le faisait sur vingt blocs,
// et vingt blocs suffisaient à atteindre le point d'apparition : le sol s'y
// relevait d'un demi-bloc, ce qui, une fois arrondi, enterre le plancher d'une
// maison d'enfant. L'invariant numéro un dit exactement cela.
//
// Dix blocs, donc, et la ville placée de telle sorte que ces dix blocs
// n'atteignent ni le point d'apparition, ni le musée, ni le quartier des
// enfants. `ZONE_WASHINGTON` dit jusqu'où va l'influence ; le témoin du
// plafond vérifie qu'au-delà, le paysage n'a pas bougé d'un bloc.
const MARGE = 10;
function partDeVille(u, v) {
  const du = Math.min(u - BOITE.u0, BOITE.u1 - u);
  const dv = Math.min(v - BOITE.v0, BOITE.v1 - v);
  const d = Math.min(du, dv);
  if (d <= -MARGE) return 0;
  if (d >= 0) return 1;
  return (d + MARGE) / MARGE;
}

// Jusqu'où la capitale touche au relief, fondu compris. Rien ne change au-delà.
export const ZONE_WASHINGTON = {
  x0: WASHINGTON.x + BOITE.u0 - MARGE, x1: WASHINGTON.x + BOITE.u1 + MARGE,
  z0: WASHINGTON.z + BOITE.v0 - MARGE, z1: WASHINGTON.z + BOITE.v1 + MARGE,
};

export function surTerreWashington(x, z) {
  return dansBoite(x - WASHINGTON.x, z - WASHINGTON.z);
}

// --- les deux rivières --------------------------------------------------------
//
// Washington est née d'un confluent : le Potomac descend du nord-ouest, l'Anacostia
// du nord-est, et ils se rejoignent au sud de la ville. C'est ce V d'eau qui
// donne à la carte de la capitale sa forme, et à la ville ses limites.

// Le Potomac, relevé de Chain Bridge au confluent. Chaque point est un couple
// (u, v) de notre grille ; entre deux points, le cours s'interpole.
const POTOMAC = [
  [-104, -44], [-95, -32], [-84, -22], [-78, -14], [-75, -6], [-71, 4],
  [-67, 14], [-58, 24], [-52, 34], [-44, 46], [-36, 56], [-28, 66],
];
// L'Anacostia, de Bladensburg au confluent.
const ANACOSTIA = [
  [56, 2], [48, 12], [42, 22], [36, 29], [28, 33], [20, 31], [12, 33],
  [4, 39], [-4, 46], [-12, 53], [-22, 62],
];

// Demi-largeur du Potomac : étroit à Georgetown, large en aval de l'île de
// Roosevelt, très large sous le pont du Mémorial et au confluent.
const largeurPotomac = (v) => (v < -24 ? 4.5 : v < -6 ? 5.5 : v < 20 ? 6.5 : v < 44 ? 7.5 : 9);
const largeurAnacostia = (v) => (v < 20 ? 3 : 4);

// Distance d'un point à une polyligne, et l'abscisse curviligne au plus près.
function versLigne(pts, u, v) {
  let best = 1e9, bestV = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [u0, v0] = pts[i], [u1, v1] = pts[i + 1];
    const du = u1 - u0, dv = v1 - v0;
    const len2 = du * du + dv * dv;
    let t = len2 > 0 ? ((u - u0) * du + (v - v0) * dv) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(u - (u0 + t * du), v - (v0 + t * dv));
    if (d < best) { best = d; bestV = v0 + t * dv; }
  }
  return { d: best, v: bestV };
}

// Le Tidal Basin : le bassin rond creusé en 1882 pour chasser la vase du
// Washington Channel, et devenu le plus beau lieu de la ville le jour où le
// Japon y a offert trois mille cerisiers. Le mémorial Jefferson est sur sa
// rive sud, Roosevelt et King sur sa rive ouest.
const BASSIN = { u: -41, v: 8, ru: 5, rv: 3 };
const dansBassin = (u, v, marge = 0) =>
  ((u - BASSIN.u) / (BASSIN.ru + marge)) ** 2 + ((v - BASSIN.v) / (BASSIN.rv + marge)) ** 2 < 1;

// Le Washington Channel : le bras d'eau qui sépare East Potomac Park du
// quai sud-ouest. C'est lui qui fait de Hains Point une presqu'île.
const CHENAL = [[-30, 14], [-27, 21], [-23, 29], [-19, 38], [-16, 47]];

// Rock Creek : le ravin boisé qui coupe la ville en deux et sépare Georgetown
// du reste. Ce n'est pas un décor : c'est pour lui que le nord-ouest de
// Washington est une forêt.
const ROCK_CREEK = [
  [-50, -74], [-52, -66], [-55, -57], [-57, -47], [-59, -36], [-61, -26],
  [-64, -17], [-66, -10],
];

// Le canal C&O, à Georgetown : neuf pieds de large, des écluses, et le chemin
// de halage. Il finit dans le Potomac au pied de la ville.
const CANAL = [[-92, -27], [-86, -26], [-80, -25], [-74, -23], [-70, -20]];

export function surEauWashington(u, v) {
  if (dansBassin(u, v)) return true;
  const p = versLigne(POTOMAC, u, v);
  if (p.d < largeurPotomac(p.v)) return true;
  const a = versLigne(ANACOSTIA, u, v);
  if (a.d < largeurAnacostia(a.v)) return true;
  if (versLigne(CHENAL, u, v).d < 2.2) return true;
  return false;
}

// --- le relief ----------------------------------------------------------------
//
// On croit Washington plate parce que le Mall l'est. C'est faux, et de
// beaucoup : le Capitole est bâti sur une colline (Jenkins Hill, que L'Enfant
// appelait « un piédestal qui attend son monument »), la cathédrale couronne le
// point le plus haut de la ville, et Arlington regarde la capitale du haut de
// sa crête, de l'autre côté du fleuve. Chaque hauteur est ici à sa vraie
// altitude, ramenée au neuvième — les mètres du monde valent neuf mètres vrais.

const BASE = 33;                 // le Mall, Foggy Bottom, le Triangle fédéral
const WATER_LEVEL_DC = 30;       // la ligne d'eau du monde, recopiée pour ne pas
                                 // dépendre de world.js, qui dépend de ce fichier
const WATER_BED = 26;            // le lit des rivières, sous la ligne d'eau (30)
const WATER_RIVE = 31;           // la berge, juste au-dessus

// [u, v, rayon, ce que la hauteur ajoute au-dessus de la base]
const COLLINES = [
  [0, 0, 20, 3.5],        // Capitol Hill (Jenkins Hill), 27 m
  [-86, -73, 26, 13],     // Mount Saint Alban, la cathédrale — le toit de la ville
  [-33, -62, 28, 6],      // Columbia Heights et Meridian Hill
  [-25, -74, 24, 5.5],    // Petworth
  [-84, 22, 34, 7.5],     // la crête d'Arlington, et son cimetière
  [24, 46, 28, 6],        // les hauteurs d'Anacostia
  [-80, -34, 18, 4.5],    // les hauteurs de Georgetown
  [-58, -44, 18, 5],      // Kalorama
  [-70, -60, 20, 6],      // Cleveland Park
  [30, -30, 20, 3],       // le plateau du nord-est
];

// La hauteur propre de Washington en un point, AVANT les terrassements : celle
// qu'aurait le sol si l'on n'avait rien bâti dessus. Les esplanades des
// monuments s'ajoutent plus bas, une fois qu'on sait où ils sont.
function solBrutWashington(x, z) {
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  let h = BASE;
  for (const [cu, cv, r, mont] of COLLINES) {
    const d = Math.hypot(u - cu, v - cv);
    if (d >= r) continue;
    // un cosinus surélevé : le sommet est arrondi, le pied se raccorde à plat
    h += mont * 0.5 * (1 + Math.cos((d / r) * Math.PI));
  }

  // Les rivières se creusent, et leurs berges descendent vers elles. Le Mall
  // touche presque l'eau — c'est un marais asséché — d'où des rives basses.
  const p = versLigne(POTOMAC, u, v);
  const lp = largeurPotomac(p.v);
  if (p.d < lp + 7) {
    const t = Math.min(1, Math.max(0, (lp + 7 - p.d) / 7));
    h = h * (1 - t) + (p.d < lp ? WATER_BED : WATER_RIVE) * t;
  }
  const a = versLigne(ANACOSTIA, u, v);
  const la = largeurAnacostia(a.v);
  if (a.d < la + 6) {
    const t = Math.min(1, Math.max(0, (la + 6 - a.d) / 6));
    h = h * (1 - t) + (a.d < la ? WATER_BED : WATER_RIVE) * t;
  }
  const c = versLigne(CHENAL, u, v);
  if (c.d < 4.5) {
    const t = Math.min(1, (4.5 - c.d) / 2.4);
    h = h * (1 - t) + (c.d < 2.2 ? WATER_BED : WATER_RIVE) * t;
  }
  if (dansBassin(u, v, 3)) {
    const t = dansBassin(u, v) ? 1 : 0.5;
    h = h * (1 - t) + (dansBassin(u, v) ? WATER_BED + 1 : WATER_RIVE) * t;
  }

  // Rock Creek : un ravin étroit et profond, pas une rivière large. C'est ce
  // creux-là qui isole Georgetown et fait du nord-ouest une forêt.
  const rc = versLigne(ROCK_CREEK, u, v);
  if (rc.d < 9) {
    const t = Math.min(1, (9 - rc.d) / 9);
    const fond = rc.d < 1.6 ? WATER_BED + 2 : BASE - 1;
    h = h * (1 - t * t) + fond * (t * t);
  }
  return h;
}

// Ce que `terrainHeight` appelle : le relief de la capitale se fond dans celui
// de la campagne sur les vingt derniers blocs de son emprise. Ce n'est pas
// solBrutWashington qu'il appelle mais solDeWashington, terrassements compris —
// sans quoi le Pentagone flotterait au-dessus de la berge.
export function hauteurWashington(x, z, h) {
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  const part = partDeVille(u, v);
  if (part <= 0) return h;
  return h * (1 - part) + solDeWashington(x, z) * part;
}

// --- le plan de L'Enfant ------------------------------------------------------
//
// Les rues numérotées courent du nord au sud, les rues lettrées d'est en ouest,
// et les deux se comptent **à partir du Capitole** — d'où les quatre quadrants.
// À Washington, une adresse est une coordonnée : « 14e et K, nord-ouest », et
// on sait exactement où l'on est.
//
// Dans la vraie ville, une rue tous les cent vingt mètres : à seize blocs par
// kilomètre, ce serait une rue tous les deux blocs, et la capitale ne serait
// que du bitume. On en dessine donc une sur trois — pas assez pour l'adresse
// exacte, assez pour que le quadrillage se lise et que les diagonales aient
// quelque chose à couper.

const PAS_RUE = 6;               // une rue dessinée tous les six blocs
const DEMI_CHAUSSEE = 1;         // deux blocs de bitume, un trottoir de chaque côté

// Les rues lettrées sautent le J — L'Enfant l'a omis, et personne ne sait
// pourquoi avec certitude. Les deux B, elles, ont été rebaptisées Constitution
// et Independence Avenue.

// Les grandes avenues d'État : chacune par ses points de passage réels. C'est
// **elles** qui font Washington — sans elles, la capitale serait un damier de
// plus. Pennsylvania Avenue relie le Capitole à la Maison-Blanche : c'est la
// rue des défilés d'investiture, et L'Enfant l'a voulue ainsi pour que le
// président et le Congrès se voient d'un bout à l'autre.
const AVENUES = [
  {
    nom: 'Pennsylvania Avenue NO', l: 2.6,
    pts: [[8, -6], [-2, -8], [-14, -11], [-26, -12], [-34, -13], [-38, -15], [-46, -19], [-57, -23], [-68, -26], [-80, -26]],
  },
  {
    nom: 'Pennsylvania Avenue SE', l: 2.2,
    pts: [[6, 6], [14, 11], [22, 16], [30, 22], [38, 28]],
  },
  {
    nom: 'Maryland Avenue SO', l: 2.2,
    pts: [[-6, 6], [-14, 11], [-22, 16], [-30, 21], [-38, 26]],
  },
  {
    nom: 'Massachusetts Avenue NO', l: 2.4,
    pts: [[16, -8], [8, -12], [-2, -16], [-12, -20], [-20, -23], [-30, -27], [-41, -29], [-48, -35], [-58, -43], [-70, -54], [-82, -66], [-88, -74]],
  },
  {
    nom: 'Connecticut Avenue NO', l: 2.2,
    pts: [[-38, -18], [-41, -24], [-44, -29], [-48, -35], [-51, -44], [-54, -54], [-57, -64], [-58, -74]],
  },
  {
    nom: 'New York Avenue NO', l: 2.2,
    pts: [[-38, -17], [-32, -21], [-26, -22], [-20, -23], [-10, -26], [0, -30], [10, -34], [20, -38]],
  },
  {
    nom: 'Vermont Avenue NO', l: 1.8,
    pts: [[-37, -17], [-34, -25], [-32, -28], [-30, -36], [-27, -48]],
  },
  {
    nom: 'Rhode Island Avenue NO', l: 1.8,
    pts: [[-48, -35], [-41, -35], [-30, -36], [-20, -33], [-8, -29], [4, -25], [16, -21]],
  },
  {
    nom: 'Virginia Avenue NO', l: 1.8,
    pts: [[-62, -14], [-54, -14], [-46, -15], [-40, -18], [-34, -22]],
  },
  {
    nom: 'Louisiana Avenue NO', l: 1.6,
    pts: [[-9, -9], [-4, -12], [1, -13]],
  },
  {
    nom: 'Delaware Avenue NE', l: 1.6,
    pts: [[3, -12], [3, -4], [3, 4], [3, 12]],
  },
  {
    nom: 'North Capitol Street', l: 2, sol: BITUME,
    pts: [[0, -13], [0, -26], [0, -40], [0, -56], [0, -72]],
  },
  {
    nom: 'South Capitol Street', l: 2, sol: BITUME,
    pts: [[0, 13], [0, 22], [0, 32], [0, 40]],
  },
  {
    // La 16e Rue : l'axe qui monte plein nord depuis la Maison-Blanche, et le
    // seul de la ville d'où l'on voit la façade du président en enfilade.
    nom: '16e Rue NO', l: 2,
    pts: [[-33, -18], [-33, -30], [-33, -44], [-33, -58], [-33, -74]],
  },
  {
    nom: 'Constitution Avenue NO', l: 2.4,
    pts: [[-8, -15], [-20, -15], [-34, -15], [-46, -15], [-58, -15]],
  },
  {
    nom: 'Independence Avenue SO', l: 2.4,
    pts: [[-8, 14], [-20, 14], [-34, 14], [-46, 14], [-54, 14]],
  },
  {
    nom: 'Wisconsin Avenue NO', l: 2,
    pts: [[-75, -22], [-76, -32], [-78, -44], [-80, -56], [-83, -70]],
  },
  {
    nom: 'M Street NO', l: 2,
    pts: [[-88, -26], [-80, -26], [-72, -25], [-64, -24], [-56, -23]],
  },
];

const BANDES_AVENUES = rangerVoies(AVENUES);

// Les ronds-points. À Washington, une avenue diagonale ne coupe pas la grille :
// elle **crée une place**. Chacune porte une statue, un bassin ou les deux, et
// c'est autour d'elles que la ville s'organise.
const CERCLES = [
  { nom: 'Dupont Circle', u: -48, v: -35, r: 6, fontaine: true },
  { nom: 'Logan Circle', u: -30, v: -36, r: 5, fontaine: true },
  { nom: 'Thomas Circle', u: -32, v: -28, r: 4.5 },
  { nom: 'Scott Circle', u: -41, v: -29, r: 4 },
  { nom: 'Washington Circle', u: -57, v: -23, r: 5 },
  { nom: 'Mount Vernon Square', u: -20, v: -23, r: 5 },
  { nom: 'Farragut Square', u: -42, v: -19, r: 4 },
  { nom: 'Lafayette Square', u: -38, v: -18, r: 4.5, jardin: true },
  { nom: 'McPherson Square', u: -34, v: -21, r: 4, jardin: true },
  { nom: 'Judiciary Square', u: -13, v: -10, r: 4 },
  { nom: 'Lincoln Park', u: 27, v: 0, r: 6, jardin: true },
  { nom: 'Stanton Park', u: 10, v: -8, r: 4.5, jardin: true },
  { nom: 'Folger Park', u: 10, v: 8, r: 4, jardin: true },
  { nom: 'Sheridan Circle', u: -58, v: -42, r: 4 },
  { nom: 'Ward Circle', u: -85, v: -60, r: 4 },
  { nom: 'Meridian Hill Park', u: -33, v: -55, r: 6, jardin: true },
];

// --- le Mall ------------------------------------------------------------------
//
// L'axe de la capitale : le Capitole à l'est, l'obélisque au milieu, le Lincoln
// Memorial à l'ouest, et le miroir d'eau entre les deux. La longueur est
// exacte — 1,93 km du Capitole à l'obélisque, 3,60 km jusqu'au Lincoln, soit
// trente et un et cinquante-huit blocs. La largeur, elle, est étirée : sans
// cela les musées se poseraient sur la pelouse.

const MALL = { u0: -33, u1: -11, dv: 4 };             // la pelouse et ses allées
const OBELISQUE = { u: -37, v: 0, r: 5.5 };           // le tertre du monument
const MIROIR = { u0: -48, u1: -42, dv: 1.8 };         // le miroir d'eau
const CONSTITUTION_GARDENS = { u: -48, v: -5, ru: 4.5, rv: 3 };
const LINCOLN = { u: -57, v: 1 };
const CAPITOLE_PARC = { u0: -14, u1: 13, v0: -14, v1: 14 };

const dansMall = (u, v) => u >= MALL.u0 && u <= MALL.u1 && Math.abs(v) <= MALL.dv;
const dansMiroir = (u, v) => u >= MIROIR.u0 && u <= MIROIR.u1 && Math.abs(v - 1) <= MIROIR.dv;
const dansObelisque = (u, v) => Math.hypot(u - OBELISQUE.u, v - OBELISQUE.v) < OBELISQUE.r;
const dansJardinConstitution = (u, v) =>
  ((u - CONSTITUTION_GARDENS.u) / CONSTITUTION_GARDENS.ru) ** 2
  + ((v - CONSTITUTION_GARDENS.v) / CONSTITUTION_GARDENS.rv) ** 2 < 1;
// Le parc du Capitole est une ELLIPSE, pas un rectangle : Olmsted l'a dessiné
// arrondi, et un carré de verdure au bout du Mall se voit de très loin sur la
// carte comme une erreur.
const dansParcCapitole = (u, v) => {
  const cu = (CAPITOLE_PARC.u0 + CAPITOLE_PARC.u1) / 2, cv = (CAPITOLE_PARC.v0 + CAPITOLE_PARC.v1) / 2;
  const ru = (CAPITOLE_PARC.u1 - CAPITOLE_PARC.u0) / 2, rv = (CAPITOLE_PARC.v1 - CAPITOLE_PARC.v0) / 2;
  return ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2 <= 1;
};

// East Potomac Park : la langue de terre entre le Potomac et le Washington
// Channel, qui se termine à Hains Point. On y a planté les cerisiers qui ne
// tenaient pas autour du bassin.
const dansPotomacPark = (u, v) => {
  if (v < 12 || v > 48) return false;
  const p = versLigne(POTOMAC, u, v);
  const c = versLigne(CHENAL, u, v);
  return p.d > largeurPotomac(p.v) + 0.5 && c.d > 2.4 && u > -50 && u < -12;
};

// Le cimetière d'Arlington : les rangées de stèles blanches sur la crête, de
// l'autre côté du fleuve. C'est la chose la plus reconnaissable de la rive
// virginienne, et on ne la dessine pas autrement que ce qu'elle est.
const ARLINGTON = { u: -86, v: 20, r: 16 };
const dansArlington = (u, v) => Math.hypot(u - ARLINGTON.u, v - ARLINGTON.v) < ARLINGTON.r;

// Le Pentagone : cinq côtés, cinq anneaux, et la plus grande surface de bureaux
// du monde. Il est en Virginie, au bord du fleuve, pas dans la ville.
const PENTAGONE = { u: -64, v: 34, r: 9 };

// Rock Creek Park : la forêt qui descend du nord jusqu'au fleuve. C'est elle
// qui coupe la ville en deux et fait du nord-ouest un bois.
const dansRockCreekPark = (u, v) => versLigne(ROCK_CREEK, u, v).d < 7;

// --- le sol -------------------------------------------------------------------

// Petit tirage déterministe : le même point donne toujours le même résultat.
function tirage(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Ce que la colonne pose en surface, ou null si un bâtiment peut s'y élever.
export function solWashington(x, z) {
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  if (!dansBoite(u, v)) return null;

  // l'eau d'abord : elle a le dernier mot sur tout le reste
  if (surEauWashington(u, v)) return EAU;

  // Le bord des rivières : du sable et de l'herbe, pas du bitume.
  const p = versLigne(POTOMAC, u, v);
  if (p.d < largeurPotomac(p.v) + 1.4) return SABLE;
  const a = versLigne(ANACOSTIA, u, v);
  if (a.d < largeurAnacostia(a.v) + 1.2) return SABLE;

  // Les cerisiers du Tidal Basin : une couronne rose tout autour du bassin,
  // c'est l'image de Washington au printemps.
  if (dansBassin(u, v, 2.6)) {
    return tirage(u, v, 31) < 0.55 ? CERISIER : HERBE;
  }
  if (dansPotomacPark(u, v)) {
    if (tirage(u, v, 32) < 0.16) return CERISIER;
    return tirage(u, v, 33) < 0.08 ? GRAVIER : HERBE;
  }

  // Le miroir d'eau, entre l'obélisque et le Lincoln.
  if (dansMiroir(u, v)) return EAU;
  if (dansJardinConstitution(u, v)) return EAU;

  // Le Mall : de la pelouse, deux allées de sable qui le bordent, et les
  // rangées d'ormes qui les doublent.
  if (dansMall(u, v)) {
    const av = Math.abs(v);
    if (av > MALL.dv - 0.6) return GRAVIER;                    // Jefferson et Madison Drive
    if (av > MALL.dv - 1.8) return (u & 1) === 0 ? ARBRE : HERBE;  // les ormes
    return HERBE;
  }
  if (dansObelisque(u, v)) {
    const d = Math.hypot(u - OBELISQUE.u, v - OBELISQUE.v);
    // le cercle de cinquante drapeaux qui entoure le tertre
    if (d > OBELISQUE.r - 1 && d < OBELISQUE.r - 0.2) return GRAVIER;
    return HERBE;
  }

  // Le parc du Capitole, dessiné par Olmsted : pelouse, bosquets et allées.
  if (dansParcCapitole(u, v)) {
    if (Math.abs(v) < 1.2 && u < -4) return GRAVIER;           // l'allée d'honneur, vers le Mall
    if (Math.abs(u - 9) < 1 || Math.abs(u + 10) < 1) return GRAVIER;
    return tirage(u, v, 34) < 0.14 ? ARBRE : HERBE;
  }

  // Le cimetière d'Arlington : l'herbe, et les stèles alignées au cordeau.
  if (dansArlington(u, v)) {
    if ((((u % 2) + 2) % 2) === 0 && (((v % 2) + 2) % 2) === 0) return MARBRE;
    return tirage(u, v, 35) < 0.05 ? ARBRE : HERBE;
  }

  // Rock Creek Park et les parcs des cercles.
  if (dansRockCreekPark(u, v)) {
    const rc = versLigne(ROCK_CREEK, u, v);
    if (rc.d < 1.6) return EAU;
    return tirage(u, v, 36) < 0.45 ? ARBRE : HERBE;
  }
  for (const c of CERCLES) {
    const d = Math.hypot(u - c.u, v - c.v);
    if (d >= c.r) continue;
    if (c.fontaine && d < 1.4) return EAU;
    if (c.jardin) return tirage(u, v, 37) < 0.3 ? ARBRE : HERBE;
    if (d < c.r - 1.6) return tirage(u, v, 38) < 0.22 ? ARBRE : HERBE;
    return TROTTOIR;                                            // l'anneau qui tourne
  }

  // Hors des quartiers, ce sont les bois et les parcs — pas des rues qui ne
  // mènent nulle part. Les avenues, elles, continuent : elles traversent la
  // campagne comme les vraies routes qui sortent de la ville.
  const enVille = batiIci(u, v);

  // Les avenues d'État, tracées avant la grille : à Washington la diagonale
  // gagne toujours sur la rue ordinaire.
  const av = solDesVoies(BANDES_AVENUES, u, v, BITUME, TROTTOIR);
  if (av !== null) {
    if (av === BITUME && (((u + v) % 9) + 9) % 9 === 0) return LIGNE;
    return av;
  }

  if (!enVille) {
    return tirage(u, v, 39) < 0.35 ? ARBRE : HERBE;
  }

  // La grille : rues numérotées nord-sud, rues lettrées est-ouest.
  const mu = ((u % PAS_RUE) + PAS_RUE) % PAS_RUE;
  const mv = ((v % PAS_RUE) + PAS_RUE) % PAS_RUE;
  const surRueNS = mu <= DEMI_CHAUSSEE;
  const surRueEO = mv <= DEMI_CHAUSSEE;
  if (surRueNS || surRueEO) {
    if (surRueNS && surRueEO) return ((u + v) & 1) === 0 ? PASSAGE : BITUME;
    if ((surRueNS && mu === 0) || (surRueEO && mv === 0)) return TROTTOIR;
    // la ligne médiane, pointillée
    if (surRueNS && mu === 1 && (((v & 7) < 4))) return LIGNE;
    if (surRueEO && mv === 1 && (((u & 7) < 4))) return LIGNE;
    return BITUME;
  }
  return null;
}

// Un lot peut-il porter un bâtiment ?
export function lotWashingtonLibre(x, z) {
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  if (!dansBoite(u, v)) return false;
  if (solWashington(x, z) !== null) return false;
  // On ne bâtit pas sur l'emprise d'un monument, ni sur une bouche de métro.
  if (surMonument(u, v)) return false;
  if (surBouche(u, v)) return false;
  return true;
}

// --- les quartiers ------------------------------------------------------------
//
// Washington n'est pas uniforme, et la loi de 1910 lui interdit d'être haute.
// Ce qui la distingue, c'est donc la MATIÈRE : le calcaire des ministères au
// centre, la brique rouge des maisons de ville partout ailleurs, et le verre
// des bureaux neufs le long des grandes avenues.

const QUARTIERS = [
  { nom: 'Georgetown', u: -78, v: -26, r: 16, genre: 'brique', hMin: 4, hMax: 6 },
  { nom: 'Foggy Bottom', u: -56, v: -14, r: 12, genre: 'calcaire', hMin: 7, hMax: 10 },
  { nom: 'Dupont Circle', u: -48, v: -35, r: 14, genre: 'brique', hMin: 5, hMax: 8 },
  { nom: 'Adams Morgan', u: -47, v: -58, r: 14, genre: 'brique', hMin: 4, hMax: 6 },
  { nom: 'Columbia Heights', u: -33, v: -69, r: 15, genre: 'brique', hMin: 4, hMax: 7 },
  { nom: 'Shaw', u: -22, v: -42, r: 14, genre: 'brique', hMin: 4, hMax: 6 },
  { nom: 'U Street', u: -27, v: -48, r: 9, genre: 'brique', hMin: 5, hMax: 7 },
  { nom: 'Le Triangle fédéral', u: -24, v: -8, r: 12, genre: 'ministere', hMin: 8, hMax: 10 },
  { nom: 'Penn Quarter', u: -19, v: -14, r: 10, genre: 'calcaire', hMin: 8, hMax: 11 },
  { nom: 'Chinatown', u: -18, v: -17, r: 5, genre: 'chinois', hMin: 5, hMax: 7 },
  { nom: 'K Street', u: -36, v: -22, r: 12, genre: 'bureaux', hMin: 9, hMax: 11 },
  { nom: 'Capitol Hill', u: 16, v: 2, r: 20, genre: 'brique', hMin: 4, hMax: 6 },
  { nom: 'NoMa', u: 8, v: -31, r: 12, genre: 'bureaux', hMin: 8, hMax: 11 },
  { nom: 'Navy Yard', u: 6, v: 23, r: 12, genre: 'bureaux', hMin: 7, hMax: 10 },
  { nom: 'Southwest Waterfront', u: -18, v: 18, r: 11, genre: 'calcaire', hMin: 7, hMax: 9 },
  { nom: 'Brookland', u: 22, v: -46, r: 16, genre: 'brique', hMin: 3, hMax: 5 },
  { nom: 'Anacostia', u: 20, v: 44, r: 16, genre: 'brique', hMin: 3, hMax: 5 },
  { nom: 'Rosslyn', u: -87, v: -11, r: 11, genre: 'bureaux', hMin: 10, hMax: 13 },
  { nom: 'Crystal City', u: -58, v: 40, r: 12, genre: 'bureaux', hMin: 9, hMax: 12 },
  { nom: 'Cathedral Heights', u: -84, v: -68, r: 16, genre: 'brique', hMin: 3, hMax: 5 },
  { nom: 'Woodley Park', u: -60, v: -60, r: 11, genre: 'brique', hMin: 4, hMax: 6 },
];

// À quel quartier appartient ce point ? Le plus proche dont on est dans le
// rayon ; à défaut, le tissu ordinaire de la capitale.
const ORDINAIRE = { nom: 'Washington', genre: 'brique', hMin: 3, hMax: 5 };
function quartierDe(u, v) {
  let best = null, bestD = 1e9;
  for (const q of QUARTIERS) {
    const d = Math.hypot(u - q.u, v - q.v);
    if (d < q.r && d < bestD) { best = q; bestD = d; }
  }
  return best || ORDINAIRE;
}

// LA VILLE S'ARRÊTE QUELQUE PART.
//
// Sans cette question, le bâti remplissait l'emprise entière : cent
// cinquante blocs de maisons de brique d'un bord à l'autre, y compris de
// l'autre côté du Potomac où il n'y a que le cimetière d'Arlington, et
// jusqu'aux confins du nord où commence Rock Creek Park. Vue du ciel, la
// capitale n'avait plus de forme — c'était un damier plein.
//
// La règle est simple et elle suit la vraie ville : **on bâtit là où il y a
// un quartier**. Au-delà d'une fois et demie son rayon, on est dans les bois
// et les parcs, ce qui est exactement ce qu'on trouve en s'éloignant du
// centre de Washington.
function batiIci(u, v) {
  // La lisière est bruitée : sans cela, la ville vue du ciel était une
  // vingtaine de disques nets, ce qui ne ressemble à aucune ville du monde.
  const bruit = (tirage(Math.floor(u / 5), Math.floor(v / 5), 92) - 0.5) * 0.55;
  for (const q of QUARTIERS) if (Math.hypot(u - q.u, v - q.v) < q.r * (1.5 + bruit)) return true;
  return false;
}

function quartiersDeWashington() {
  return QUARTIERS.map((q) => ({
    name: q.nom, x: WASHINGTON.x + q.u, z: WASHINGTON.z + q.v, r: 0,
  }));
}

// La hauteur maximale que la loi de 1910 laisse : cent trente pieds, soit une
// douzaine d'étages. Aucun immeuble de cette ville ne la dépasse — c'est ce qui
// fait qu'on voit le dôme du Capitole de partout.
const PLAFOND_LOI = 13;

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
// Chacun à sa vraie latitude et sa vraie longitude, converties par `de()`. Deux
// exceptions, et elles se voient : le Capitole et la Maison-Blanche sont
// dessinés six fois trop grands pour qu'on puisse y entrer, si bien que leurs
// voisins immédiats — la Cour suprême, la Bibliothèque du Congrès, le Trésor —
// sont poussés juste au-delà de leur emprise. À Washington ces bâtiments se
// touchent presque ; ici il leur faut un trottoir.
//
// `box` est la demi-emprise du repère ; `bu` et `bv` la précisent quand le
// monument est plus long que large — le Capitole fait deux fois plus de nord au
// sud que d'est en ouest, parce que ses deux ailes sont le Sénat et la Chambre.

export const MONUMENTS_DC = [
  // L'AXE DU MALL, d'est en ouest. Ces quatre-là sont à l'adresse exacte : ce
  // sont eux qui donnent son axe à la capitale, et un seul bloc de décalage se
  // verrait de l'autre bout de la pelouse.
  { nom: 'Capitole des États-Unis', u: 0, v: 0, bu: 10, bv: 11 },
  { nom: 'Monument de Washington', u: -37, v: 0, bu: 4, bv: 4 },
  { nom: 'Mémorial de la Seconde Guerre mondiale', u: -46, v: 0, bu: 3, bv: 4, seuil: 0.3 },
  { nom: 'Lincoln Memorial', u: -57, v: 1, bu: 7, bv: 5 },
  // Les musées bordent la pelouse, trois au nord et deux au sud, dans l'ordre
  // vrai. Leur écart à l'axe, lui, est ÉTIRÉ : à seize blocs par kilomètre ils
  // seraient à deux blocs du gazon, et un musée de neuf blocs de large mangerait
  // le Mall. C'est la seule entorse de cette page, et elle ne touche que la
  // largeur — les distances d'est en ouest sont exactes.
  { nom: 'Musée afro-américain', u: -34, v: -9, bu: 5, bv: 4, seuil: 0.3 },
  { nom: "Musée d'Histoire naturelle", u: -24, v: -9, bu: 4, bv: 4, seuil: 0.3 },
  { nom: "Galerie nationale d'art", u: -15, v: -8, bu: 4, bv: 4, seuil: 0.3 },
  { nom: 'Château du Smithsonian', u: -26, v: 8, bu: 4, bv: 4 },
  { nom: "Musée de l'Air et de l'Espace", u: -16, v: 8, bu: 5, bv: 3 },
  // Au nord de Constitution Avenue : la Maison-Blanche, les Archives, Chinatown.
  { nom: 'Maison-Blanche', u: -40, v: -21, bu: 8, bv: 6 },
  { nom: 'Archives nationales', u: -20, v: -18, bu: 4, bv: 4, seuil: 0.3 },
  { nom: 'Arc de Chinatown', u: -18, v: -26, bu: 5, bv: 2, seuil: 0.3 },
  // Capitol Hill. Ces deux-là sont de l'autre côté de la rue dans la vraie
  // ville ; le Capitole étant dessiné six fois trop grand, ils reculent d'autant.
  { nom: 'Cour suprême', u: 16, v: -5, bu: 5, bv: 4, seuil: 0.3 },
  { nom: 'Bibliothèque du Congrès', u: 16, v: 6, bu: 5, bv: 4, seuil: 0.3 },
  { nom: 'Union Station', u: 4, v: -22, bu: 8, bv: 8 },
  // West Potomac Park et le Tidal Basin. Les cinq mémoriaux y sont serrés dans
  // la vraie ville — quelques centaines de mètres les séparent — et il faut les
  // écarter de dix blocs pour qu'ils tiennent côte à côte. On garde leur ordre
  // et leur côté : le Vietnam au nord du Lincoln, la Corée au sud, King au bord
  // du bassin, Jefferson sur la rive d'en face.
  //
  // Le mémorial Roosevelt manque, et c'est faute de place : quatre salles à
  // ciel ouvert de quinze blocs de long entre le Potomac et le Tidal Basin, il
  // n'y avait pas trente blocs pour les poser sans mordre sur l'eau ou sur King.
  // Mieux vaut un mémorial de moins qu'un mémorial les pieds dans le fleuve.
  { nom: 'Mémorial des vétérans du Vietnam', u: -54, v: -11, bu: 4, bv: 6, seuil: 0.3 },
  { nom: 'Mémorial de la guerre de Corée', u: -56, v: 11, bu: 3, bv: 3, seuil: 0.3 },
  { nom: 'Mémorial Martin Luther King', u: -49, v: 15, bu: 3, bv: 3, seuil: 0.3 },
  { nom: 'Mémorial Jefferson', u: -38, v: 21, bu: 6, bv: 7 },
  // L'ouest et le nord
  { nom: 'Kennedy Center', u: -63, v: -16, bu: 4, bv: 8, seuil: 0.3 },
  { nom: 'Université de Georgetown', u: -80, v: -36, bu: 8, bv: 7, seuil: 0.3 },
  { nom: 'Cathédrale nationale', u: -86, v: -73, bu: 9, bv: 12 },
  // La Virginie, de l'autre côté du fleuve
  { nom: 'Pentagone', u: -73, v: 36, bu: 9, bv: 9 },
  { nom: 'Tombe du Soldat inconnu', u: -89, v: 14, bu: 8, bv: 9 },
  // Les ponts sont exclus du contrôle de chevauchement : un pont TOUCHE ce
  // qu'il dessert, et celui du Mémorial part du pied du Lincoln — c'est même
  // tout son propos. Ils sont posés avant les monuments, qui gardent donc la
  // main sur les colonnes communes.
  { nom: 'Pont du Mémorial', u: -72, v: 4, bu: 12, bv: 2, eau: true, pont: true },
  { nom: 'Pont Frederick Douglass', u: 5, v: 38, bu: 2, bv: 10, eau: true, pont: true },
  { nom: 'Key Bridge', u: -85, v: -23, bu: 10, bv: 2, eau: true, pont: true, seuil: 0.3 },
];

// LES ESPLANADES.
//
// Un monument est posé à une seule cote — celle de son centre — et le
// générateur de repères ne sait rien de la pente sous ses pieds. Sur un
// terrain qui descend, il flotte : le Pentagone est au bord du Potomac, la
// berge lui tombe de deux blocs sous l'angle est, et le bâtiment se retrouvait
// en porte-à-faux au-dessus du vide.
//
// On terrasse donc son emprise, comme le fait toute architecture monumentale —
// le Capitole, le Lincoln, le Jefferson sont tous sur une plateforme. Le
// raccord se fait sur six blocs autour. **L'eau n'est jamais remblayée** :
// sans cette réserve, l'esplanade du Jefferson comblait le Tidal Basin sur
// lequel il donne.
const ESPLANADES = MONUMENTS_DC.filter((m) => !m.pont).map((m) => ({
  u: m.u, v: m.v, bu: m.bu, bv: m.bv,
  h: solBrutWashington(WASHINGTON.x + m.u, WASHINGTON.z + m.v),
}));

function solDeWashington(x, z) {
  const brut = solBrutWashington(x, z);
  if (brut < WATER_LEVEL_DC + 1) return brut;      // ni fleuve ni bassin ne se comblent
  const u = x - WASHINGTON.x, v = z - WASHINGTON.z;
  // C'est la PLUS FORTE esplanade qui commande, pas la somme de toutes. En les
  // cumulant, l'emmarchement de la Cour suprême — six blocs plus loin — tirait
  // le sol du Capitole de trois blocs, et la colline retrouvait sa pente sous
  // le dôme. Le monument le plus proche décide, les autres se taisent.
  let meilleur = null, force = 0;
  for (const e of ESPLANADES) {
    const d = Math.max(Math.abs(u - e.u) - e.bu, Math.abs(v - e.v) - e.bv);
    if (d >= 6) continue;
    const t = d <= 0 ? 1 : 1 - d / 6;
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
// voies. Le quai est central, carrelé de petits hexagones bruns, et son bord
// s'allume quand un train approche. Aucune publicité, aucune enseigne : rien
// que la voûte, la lumière rasante et le nom de la station.
//
// Six lignes de couleur dans la vraie ville. Ici quatre lignes, parce que
// quatre suffisent à desservir tout ce qu'un enfant veut voir, et que deux
// lignes qui partagent le même tunnel donnent deux trains qui se traversent.
//
// **Georgetown n'a pas de station.** C'est vrai, c'est célèbre, et c'est resté
// une écharde dans le pied du quartier depuis cinquante ans : le tracé y a
// renoncé au moment des travaux. On ne corrige pas la vraie ville.

const STATIONS = [
  // la ligne Bleue (avec l'Orange et l'Argent) — celle du Mall
  { nom: 'Rosslyn', u: -87, v: -11 },
  { nom: 'Foggy Bottom', u: -58, v: -20 },
  { nom: 'Farragut West', u: -42, v: -21 },
  { nom: 'McPherson Square', u: -34, v: -21 },
  { nom: 'Metro Center', u: -27, v: -15 },
  { nom: 'Federal Triangle', u: -27, v: -7 },
  { nom: 'Smithsonian', u: -27, v: 1 },
  { nom: "L'Enfant Plaza", u: -18, v: 9 },
  { nom: 'Federal Center SO', u: -9, v: 8 },
  { nom: 'Capitol South', u: 4, v: 7 },
  { nom: 'Eastern Market', u: 18, v: 10 },
  { nom: 'Potomac Avenue', u: 33, v: 16 },
  { nom: 'Stadium-Armory', u: 44, v: 3 },
  // la ligne Rouge
  { nom: 'Woodley Park', u: -60, v: -62 },
  { nom: 'Dupont Circle', u: -48, v: -35 },
  { nom: 'Farragut North', u: -43, v: -24 },
  { nom: 'Gallery Place', u: -18, v: -16 },
  { nom: 'Judiciary Square', u: -11, v: -11 },
  { nom: 'Union Station', u: 3, v: -14 },
  { nom: 'NoMa', u: 8, v: -31 },
  // la ligne Verte
  { nom: 'Columbia Heights', u: -33, v: -69 },
  { nom: 'U Street', u: -27, v: -48 },
  { nom: 'Shaw-Howard', u: -18, v: -41 },
  { nom: 'Mount Vernon Square', u: -18, v: -28 },
  { nom: 'Archives', u: -18, v: -7 },
  { nom: 'Waterfront', u: -12, v: 23 },
  { nom: 'Navy Yard', u: 6, v: 23 },
  // la ligne Jaune
  { nom: 'Pentagon', u: -62, v: 36 },
];
const PAR_NOM = new Map(STATIONS.map((s) => [s.nom, s]));

export const LIGNES = [
  {
    nom: 'Bleue', teinte: 0x2f6cc4, emoji: '🔵',
    arrets: ['Rosslyn', 'Foggy Bottom', 'Farragut West', 'McPherson Square', 'Metro Center',
      'Federal Triangle', 'Smithsonian', "L'Enfant Plaza", 'Federal Center SO', 'Capitol South',
      'Eastern Market', 'Potomac Avenue', 'Stadium-Armory'],
  },
  {
    nom: 'Rouge', teinte: 0xd0342c, emoji: '🔴',
    arrets: ['Woodley Park', 'Dupont Circle', 'Farragut North', 'Metro Center', 'Gallery Place',
      'Judiciary Square', 'Union Station', 'NoMa'],
  },
  {
    nom: 'Verte', teinte: 0x1c9c5c, emoji: '🟢',
    arrets: ['Columbia Heights', 'U Street', 'Shaw-Howard', 'Mount Vernon Square', 'Gallery Place',
      'Archives', "L'Enfant Plaza", 'Waterfront', 'Navy Yard'],
  },
  {
    // La Jaune passe SOUS le Potomac pour rejoindre la Virginie, comme la
    // Bleue. Une première version la faisait franchir le fleuve sur un
    // viaduc — c'est vrai du vrai réseau, le pont de la Jaune est le seul
    // endroit du centre où le métro voit le jour — mais la station du
    // Pentagone est à quatre blocs de la rive : la rampe du portail n'avait
    // pas la place de monter, et le train sautait de dix-huit blocs en un.
    // Un tunnel qui marche vaut mieux qu'un pont qui saute.
    nom: 'Jaune', teinte: 0xe8c33a, emoji: '🟡',
    arrets: ['Pentagon', "L'Enfant Plaza"],
  },
];

const PROFONDEUR = 12;         // le ballast, sous le sol
const DEMI_TUNNEL = 4;         // le tunnel courant : neuf blocs de large
const H_TUNNEL = 5;            // et cinq blocs de hauteur libre
const DEMI_VOUTE = 5;          // la station : onze blocs sous la voûte
const H_VOUTE = 7;             // sept blocs sous la clef, au-dessus du quai
const DEMI_STATION = 5;        // le quai fait onze blocs de long
const ECART_VOIE = 3;          // l'écart de chaque voie à l'axe du tunnel
const PENTE = 0.28;            // la pente maximale de la voie, en blocs par bloc
const TIROIR = 7;              // le prolongement au-delà du terminus, pour le demi-tour

// Chaque ligne, échantillonnée bloc par bloc, avec sa cote et son régime.
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
  pts.push({ u: arrets[arrets.length - 1].u, v: arrets[arrets.length - 1].v, arret: arrets[arrets.length - 1] });

  // LE TIROIR DE RETOURNEMENT, AU-DELÀ DE CHAQUE TERMINUS.
  //
  // La rame fait demi-tour en décrivant un demi-cercle de rayon trois pour
  // passer de la voie de droite à celle de gauche. Sans ce prolongement, ce
  // demi-cercle se refermait AU MILIEU DE LA STATION : son sommet tombait pile
  // sur le quai, et le train butait sur la dalle qu'il est censé desservir. Les
  // vrais réseaux ont la même chose, et pour la même raison — on l'appelle un
  // tiroir, et il est toujours derrière le terminus.
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
  // Le plafond de sécurité : jamais moins de douze blocs de couverture. Sous
  // le Potomac, c'est le lit de la rivière qui commande — d'où le plongeon.
  const plafond = pts.map((_, i) => sol[i] - PROFONDEUR);
  pts.forEach((p, i) => { p.y = plafond[i]; });

  // LA PENTE, ET POURQUOI ELLE SE CALCULE AINSI.
  //
  // La première version prenait, pour chaque point, le plus bas de ses voisins
  // à huit blocs à la ronde : c'était une manière brutale de garantir la
  // couverture, et elle enterrait Foggy Bottom à quatorze blocs sous la rue
  // parce que le Potomac passe à vingt blocs de là. Une station qu'on n'atteint
  // qu'après quatorze marches n'est pas une station, c'est une punition.
  //
  // On limite donc la PENTE au lieu de la profondeur : chaque point descend
  // juste assez pour que son voisin puisse le rejoindre en montant d'un peu
  // plus d'un quart de bloc par bloc. Le tunnel plonge sous le fleuve puis remonte tout seul,
  // et les stations retrouvent leur profondeur normale dès qu'elles le peuvent.
  // C'est aussi ce qui laisse Rosslyn profonde — elle l'est pour de vrai,
  // c'est la plus longue remontée du réseau.
  for (let i = 1; i < pts.length; i++) pts[i].y = Math.min(pts[i].y, pts[i - 1].y + PENTE);
  for (let i = pts.length - 2; i >= 0; i--) pts[i].y = Math.min(pts[i].y, pts[i + 1].y + PENTE);
  for (const p of pts) p.y = Math.round(p.y);
  return pts;
}

const TRACES = new Map(LIGNES.map((l) => [l.nom, calculerTrace(l)]));

// Les stations, avec la cote de leur quai : c'est elle que la bouche d'accès
// doit rejoindre, et elle ne se devine pas — elle sort du tracé.
const QUAIS = new Map();
for (const [nom, pts] of TRACES) {
  for (let i = 0; i < pts.length; i++) {
    if (!pts[i].arret) continue;
    const s = pts[i].arret;
    const av = pts[Math.max(0, i - 1)], ap = pts[Math.min(pts.length - 1, i + 1)];
    const du = ap.u - av.u, dv = ap.v - av.v;
    const len = Math.hypot(du, dv) || 1;
    const existant = QUAIS.get(s.nom);
    // Une station desservie par deux lignes garde la plus profonde : c'est la
    // voûte du dessous qui commande, l'autre s'y raccorde.
    if (existant && existant.y <= pts[i].y) continue;
    QUAIS.set(s.nom, {
      nom: s.nom, u: s.u, v: s.v, y: pts[i].y,
      du: du / len, dv: dv / len, ligne: nom,
    });
  }
}
export const QUAIS_METRO = [...QUAIS.values()];

// La bouche d'accès : un escalier droit, perpendiculaire au quai, qui remonte
// à la rue. Il descend d'un bloc par bloc, avec un palier tous les six — sans
// lui, la remontée de Rosslyn serait un mur.
export const BOUCHES_METRO = QUAIS_METRO.map((q) => {
  // DE QUEL CÔTÉ SORT L'ESCALIER ?
  //
  // Quatre candidats — les deux côtés du quai, puis ses deux bouts — et on
  // prend le premier qui débouche à l'air libre. Sans ce choix, la sortie de
  // Federal Triangle remontait à l'intérieur du musée d'Histoire naturelle :
  // les monuments sont posés APRÈS les colonnes de la ville, ils écrasent donc
  // l'escalier, et la station devenait un cul-de-sac.
  const cotes = [[-q.dv, q.du], [q.dv, -q.du], [q.du, q.dv], [-q.du, -q.dv]];
  const sol = Math.round(solDeWashington(WASHINGTON.x + q.u, WASHINGTON.z + q.v));
  // De la dalle du quai (y + 1) à la marche qui affleure la rue (sol - 1).
  const marches = Math.max(4, sol - 1 - (q.y + 1));
  const paliers = Math.floor(marches / 6);
  const longueur = DEMI_VOUTE + 1 + marches + paliers * 2;
  // Ce qui disqualifie un côté n'est pas le même en bas et en haut. L'escalier
  // est SOUS terre sur presque toute sa longueur : passer sous un musée ne
  // gêne personne. Ce qui compte, c'est que la trémie ne prenne pas l'eau sur
  // tout son parcours, et que le pylône débouche à l'air libre — pas dans le
  // Tidal Basin, comme le faisait la sortie du Smithsonian, et pas au milieu
  // d'un musée, comme celle de Federal Triangle.
  const note = ([nu, nv]) => {
    let mal = 0;
    for (let d = DEMI_VOUTE + 1; d <= longueur + 2; d++) {
      const u = q.u + nu * d, v = q.v + nv * d;
      if (surEauWashington(u, v)) mal += 100;
      if (!dansBoite(u, v)) mal += 100;
      if (d >= longueur - 4 && surMonument(u, v)) mal += 30;
      // et une rue à peu près de niveau : un escalier qui débouche onze blocs
      // plus bas que son quai n'est plus un escalier
      if (d === longueur) {
        mal += Math.abs(solDeWashington(WASHINGTON.x + u, WASHINGTON.z + v) - sol) * 4;
      }
    }
    return mal;
  };
  const [nu, nv] = cotes.reduce((a, b) => (note(b) < note(a) ? b : a));
  return {
    nom: q.nom, u: q.u, v: q.v, y: q.y, sol, nu, nv, marches, longueur,
    // le haut de l'escalier, là où se dresse le pylône brun
    tu: q.u + nu * longueur, tv: q.v + nv * longueur,
  };
});

// LES DEUX VOIES D'UNE LIGNE, en coordonnées locales.
//
// La rame roule à droite, comme partout aux États-Unis : à l'aller elle est
// décalée de trois blocs sur la droite du sens de marche, au retour de trois
// blocs sur l'autre — ce qui, dans le repère fixe, est la voie d'en face.
// C'est cette liste qui sert deux fois : aux rames pour rouler, et au
// creusement pour garantir qu'elles ont la place de passer.
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
  // Le demi-tour au terminus, dans le tiroir. Le point d'angle θ vaut
  // P + 3·sens·(droite·cos θ + marche·sin θ) : θ = 0 sort de la voie de
  // droite, θ = π/2 dépasse le bout, θ = π arrive sur celle de gauche.
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

// Rangement par bandes, comme pour les voies : une colonne ne consulte que sa
// bande. Sans cela, chaque colonne de la capitale comparerait sa position aux
// quatre cents segments du réseau.
const BANDE = 8;
const GRILLE_METRO = new Map();
function ranger(cle, obj) {
  if (!GRILLE_METRO.has(cle)) GRILLE_METRO.set(cle, []);
  GRILLE_METRO.get(cle).push(obj);
}
for (const [nom, pts] of TRACES) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const seg = {
      quoi: 'voie', ligne: nom, u0: a.u, v0: a.v, u1: b.u, v1: b.v,
      y0: a.y, y1: b.y, uMin: Math.min(a.u, b.u), uMax: Math.max(a.u, b.u),
    };
    const b0 = Math.floor((Math.min(a.v, b.v) - 8) / BANDE);
    const b1 = Math.floor((Math.max(a.v, b.v) + 8) / BANDE);
    for (let k = b0; k <= b1; k++) ranger(k, seg);
  }
}
for (const q of QUAIS_METRO) {
  const st = { quoi: 'station', ...q };
  const b0 = Math.floor((q.v - DEMI_STATION - 7) / BANDE);
  const b1 = Math.floor((q.v + DEMI_STATION + 7) / BANDE);
  for (let k = b0; k <= b1; k++) ranger(k, st);
}
// LE GABARIT DE LA RAME, creusé en dernier.
//
// Une voûte, un piédroit ou surtout un QUAI pouvait se retrouver en travers
// d'une voie : Federal Triangle et Smithsonian sont à huit blocs l'un de
// l'autre, leurs deux salles se rejoignaient, et le quai de la seconde barrait
// la voie de la première. Vingt-cinq points de la Bleue muraient la rame.
//
// Plutôt que de faire la police entre les stations, on enregistre le passage
// exact des trains — les deux voies, au bloc près — et on le creuse APRÈS tout
// le reste. Rien ne peut plus se mettre en travers d'un train.
for (const l of LIGNES) {
  const voie = voiesDeLigne(l.nom);
  for (let i = 0; i < voie.length; i++) {
    const a = voie[i], b = voie[(i + 1) % voie.length];
    const seg = {
      quoi: 'gabarit', u0: a.u, v0: a.v, u1: b.u, v1: b.v, y0: a.y, y1: b.y,
      uMin: Math.min(a.u, b.u), uMax: Math.max(a.u, b.u),
    };
    const b0 = Math.floor((Math.min(a.v, b.v) - 3) / BANDE);
    const b1 = Math.floor((Math.max(a.v, b.v) + 3) / BANDE);
    for (let k = b0; k <= b1; k++) ranger(k, seg);
  }
}
for (const b of BOUCHES_METRO) {
  const st = { quoi: 'bouche', ...b };
  const vMin = Math.min(b.v, b.tv) - 4, vMax = Math.max(b.v, b.tv) + 4;
  for (let k = Math.floor(vMin / BANDE); k <= Math.floor(vMax / BANDE); k++) ranger(k, st);
}

// Coordonnées le long d'un objet : `le` suit l'axe, `tr` en travers.
function repere(u, v, cu, cv, du, dv) {
  const eu = u - cu, ev = v - cv;
  return { le: eu * du + ev * dv, tr: eu * -dv + ev * du };
}

// Une colonne est-elle sur une bouche de métro ? Le bâti ordinaire doit lui
// laisser la place, sinon l'escalier débouche dans un salon.
function surBouche(u, v) {
  const segs = GRILLE_METRO.get(Math.floor(v / BANDE));
  if (!segs) return false;
  for (const s of segs) {
    if (s.quoi !== 'bouche') continue;
    const r = repere(u, v, s.u, s.v, s.nu, s.nv);
    if (r.le > DEMI_VOUTE - 1 && r.le < s.longueur + 4 && Math.abs(r.tr) <= 3) return true;
  }
  return false;
}

// Le tracé d'une ligne, tel que les rames doivent le suivre : la voie de
// droite à l'aller, celle de gauche au retour, et une boucle de retournement à
// chaque terminus. Ce sont les MÊMES points que ceux qui ont creusé le tunnel —
// une rame ne peut donc pas rouler à côté de sa voie.
// OÙ LA RAME S'ARRÊTE, en rangs de points du tracé.
//
// La boucle est faite de quatre morceaux : l'aller, le demi-tour, le retour, le
// second demi-tour. Une station apparaît donc DEUX fois — une par sens — et il
// faut les deux, sinon le train ne dessert la station que dans un sens.
export function arretsDeLigne(nom) {
  const pts = TRACES.get(nom);
  if (!pts) return [];
  const n = pts.length;
  const rangs = [];
  pts.forEach((p, i) => {
    if (!p.arret) return;
    rangs.push(i);                    // à l'aller
    rangs.push(n + 5 + (n - 1 - i));  // au retour, après le premier demi-tour
  });
  return rangs;
}

export function traceLigneMetro(nom) {
  return voiesDeLigne(nom).map((p) => ({
    x: WASHINGTON.x + p.u, y: p.y + 0.4, z: WASHINGTON.z + p.v,
  }));
}


// --- creuser le métro ----------------------------------------------------------
//
// Tout se fait colonne par colonne, comme le reste de la ville : on demande à
// chaque point du sol « qu'y a-t-il sous toi ? », et la réponse dit s'il faut
// creuser un tunnel, une voûte de station ou un escalier. C'est ce qui permet
// au réseau d'exister partout sans qu'aucun morceau de monde n'ait à connaître
// les autres.

// La voûte en berceau : sa hauteur au-dessus du quai, selon l'écart à l'axe.
const hauteurVoute = (tr) => Math.round(H_VOUTE * Math.sqrt(Math.max(0, 1 - (tr / (DEMI_VOUTE + 0.4)) ** 2)));

// Le caisson : c'est lui qui fait la signature du métro de Washington. Deux
// bétons alternés en damier de deux blocs — vu d'en dessous, un gaufrier.
const caisson = (a, b) => (((Math.floor(a / 2) + Math.floor(b / 2)) & 1) === 0 ? BETON : BETON_CLAIR);

// CREUSER D'ABORD, REMPLIR ENSUITE — et jamais l'inverse.
//
// La première version traitait chaque tronçon de tunnel de bout en bout :
// ballast, vide, calotte. Elle marchait à plat et se refermait en pente. En
// approchant du Potomac, la Bleue plonge de huit blocs en trente ; deux
// tronçons voisins couvrent alors la même colonne à deux cotes différentes, et
// le ballast du plus haut retombait au milieu du vide du plus bas. Résultat :
// soixante et un points du tracé de la Bleue murés, et une rame qui traverse
// la roche à hauteur de Rosslyn.
//
// On collecte donc tout ce que les tronçons ont à dire sur la colonne, puis on
// pose **le vide en premier**. Un plein qui tomberait dans le vide d'un voisin
// est simplement abandonné : entre un trou et un mur en travers de la voie, le
// trou ne coûte rien. Le quai et les pylônes, eux, se posent en dernier et
// sans condition — ils sont dans leur propre vide, c'est leur raison d'être.
function creuserMetro(u, v, h, poser) {
  const segs = GRILLE_METRO.get(Math.floor(v / BANDE));
  if (!segs) return false;
  const vides = [];      // [y0, y1] : ce qui doit être creusé
  const pleins = [];     // [y, id] : structure, abandonnée si elle tombe dans un vide
  const apres = [];      // [y, id] : mobilier de station, posé quoi qu'il arrive
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
      const rail = Math.abs(tr - ECART_VOIE) < 0.7;
      if (tr > DEMI_TUNNEL) {                        // le piédroit
        for (let y = yr; y <= yr + H_TUNNEL + 1; y++) pleins.push([y, BETON]);
        continue;
      }
      pleins.push([yr, rail ? RAIL : BETON]);        // le ballast
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
      // Le sol de la station est PLEIN sous les voies, et le quai ne le dépasse
      // que d'un bloc. C'est ce qui rend la chute réversible : un enfant qui
      // tombe du quai remonte d'une seule marche. Avec un ballast creusé un
      // bloc plus bas, il restait coincé sur la voie.
      pleins.push([yr, Math.abs(atr - ECART_VOIE) < 0.7 ? RAIL : BETON]);
      const haut = yr + 1 + hauteurVoute(atr);
      creuser(yr + 1, haut - 1);
      pleins.push([haut, caisson(r.le, r.tr)]);      // les caissons de la voûte
      if (atr <= 1.7) {
        // le quai central : carrelage hexagonal brun, bordure de granit noir
        apres.push([yr + 1, atr > 1.1 ? QUAI_BORD : CARREAU]);
        // le pylône brun, tous les six blocs : nom de la station, haut-parleur,
        // bouche d'air et lampe, tout réuni dans un seul montant
        if (atr < 0.6 && (((Math.round(r.le) % 6) + 6) % 6 === 0)) {
          apres.push([yr + 2, CARREAU], [yr + 3, CARREAU]);
        }
      }
      continue;
    }

    if (s.quoi === 'bouche') {
      const r = repere(u, v, s.u, s.v, s.nu, s.nv);
      if (r.le < DEMI_VOUTE - 0.5 || r.le > s.longueur + 3.5 || Math.abs(r.tr) > 2.2) continue;
      // le pylône brun de la rue : le « M » du Metro, qu'on repère de loin.
      // Il se dresse sur le sol LOCAL, pas sur celui de la station : à Columbia
      // Heights la rue descend de onze blocs entre le quai et la sortie, et le
      // pylône plantait dans le vide.
      if (r.le > s.longueur + 0.5) {
        if (Math.abs(r.tr) < 0.6) {
          for (let y = h; y <= h + 3; y++) apres.push([y, CARREAU]);
          apres.push([h + 4, MARBRE]);
        }
        continue;
      }
      const pas = Math.max(0, Math.round(r.le) - (DEMI_VOUTE + 1));
      // six marches, deux blocs de palier, et on recommence — sans palier, la
      // remontée de Rosslyn serait un mur de quinze blocs
      const monte = Math.floor(pas / 8) * 6 + Math.min(6, pas % 8);
      // La marche ne monte jamais plus haut que le sol de SA colonne : sans
      // cela, un escalier qui remonte vers une rue en pente sortait de terre
      // en plein ciel, ou restait enterré sans jamais déboucher.
      const y = Math.min(h - 1, s.y + 1 + monte);
      if (Math.abs(r.tr) > 1.4) {                    // les joues de l'escalier
        for (let yy = y; yy <= Math.min(h, y + 4); yy++) pleins.push([yy, GRANIT]);
        continue;
      }
      apres.push([y, GRANIT]);                       // la marche
      creuser(y + 1, y + 3);
      if (y + 4 < h) pleins.push([y + 4, GRANIT]);   // le plafond de la descenderie
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
// Aucune tour. La loi de 1910 plafonne l'immeuble à la largeur de sa rue plus
// vingt pieds, cent trente pieds au plus — et c'est pour cela qu'on voit le
// dôme du Capitole de n'importe quel trottoir de la ville. Ce qui distingue un
// quartier d'un autre, ce n'est donc pas la hauteur : c'est la matière. Brique
// rouge à Georgetown et sur Capitol Hill, calcaire crème au centre, verre le
// long des grandes avenues de bureaux.
//
// Et **on entre dans les maisons**. Chaque îlot est creux, avec deux portes
// face à face : on traverse. Ce n'est pas un décor peint, c'est un bâtiment.

// PAR OÙ ENTRE-T-ON ?
//
// Chaque îlot fait quatre blocs de côté et porte deux portes face à face : on
// entre d'un côté, on ressort de l'autre. Reste à choisir l'axe — et le tirage
// au sort ne suffisait pas. Une avenue diagonale, un rond-point ou une bouche
// de métro peut manger la moitié d'un îlot ; si c'est justement la moitié qui
// portait les portes, la maison devient un bloc plein. Un îlot sur quatre était
// dans ce cas au sud de Capitol Hill.
//
// On regarde donc si l'axe tiré au sort a bien ses deux façades, et on prend
// l'autre sinon. Le résultat est mémorisé par îlot : le générateur repasse cinq
// fois sur la même colonne, et la question ne vaut d'être posée qu'une.
const AXE_ILOT = new Map();
function axeDeLot(la, lb) {
  const cle = `${la},${lb}`;
  const memo = AXE_ILOT.get(cle);
  if (memo !== undefined) return memo;
  const libre = (mu, mv) => lotWashingtonLibre(
    WASHINGTON.x + la * PAS_RUE + mu, WASHINGTON.z + lb * PAS_RUE + mv);
  const ns = (libre(3, 2) || libre(4, 2)) && (libre(3, 5) || libre(4, 5));
  const eo = (libre(2, 3) || libre(2, 4)) && (libre(5, 3) || libre(5, 4));
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

  // La position dans l'îlot : la rue occupe les deux premières colonnes, le
  // bâtiment les quatre suivantes. Les portes sont donc au milieu de deux
  // façades opposées — on entre d'un côté, on ressort de l'autre.
  const mu = ((u % PAS_RUE) + PAS_RUE) % PAS_RUE;
  const mv = ((v % PAS_RUE) + PAS_RUE) % PAS_RUE;
  const axeNS = axeDeLot(la, lb);
  const porte = axeNS
    ? (mv === DEMI_CHAUSSEE + 1 || mv === PAS_RUE - 1) && (mu === 3 || mu === 4)
    : (mu === DEMI_CHAUSSEE + 1 || mu === PAS_RUE - 1) && (mv === 3 || mv === 4);

  if (dedans) {
    poser(0, q.genre === 'brique' ? BLOCK.PLANK : GRANIT);   // le plancher
    // De quoi habiter : une lampe au milieu, un meuble dans un coin. Une pièce
    // vide n'est pas une pièce — un enfant qui entre veut trouver quelque chose.
    if (mu === 3 && mv === 3) poser(1, PROP_START + 9);      // la lampe
    else if (mu === 4 && mv === 4) poser(1, PROP_START + 6);  // la table
    else if (mu === 4 && mv === 3 && r > 0.5) poser(1, PROP_START + 4); // le canapé
    poser(bh, toit);
    return;
  }

  const face = (!oE || !oO) ? v : u;
  for (let y = 1; y < bh; y++) {
    if (porte && y <= 2) continue;                            // l'entrée
    const fenetre = y % 2 === 1 && (face & 1) === 1;
    let id = fenetre ? (q.genre === 'bureaux' ? VERRE_BLEU : VERRE) : mur;
    // le bandeau de pierre à hauteur de premier étage, comme sur les vraies
    // maisons de ville de la capitale
    if (!fenetre && y === 3 && q.genre === 'brique') id = CALCAIRE;
    poser(y, id);
  }
  poser(0, q.genre === 'brique' ? BLOCK.PLANK : GRANIT);
  poser(bh, toit);
  // le perron de trois marches, marque de la maison de ville de Washington
  if (porte && q.genre === 'brique') poser(0, GRANIT);
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
  if (sol === MARBRE) return BLANC_STELE;          // les stèles d'Arlington
  if (sol === SABLE) return SABLE_RIVE;
  if (sol === GRAVIER) return BEIGE_PLACE;
  if (sol === TROTTOIR) return [150, 150, 146];
  if (sol !== null) return GRIS_RUE;
  // Un pâté de maisons : le calcaire du centre est clair, la brique est
  // sombre. Vue du ciel, c'est ce contraste-là qui dit où l'on est dans la
  // capitale — mais d'un seul ton, la ville entière devenait un aplat rouge.
  // La teinte varie donc d'un ÎLOT à l'autre, comme les toits varient.
  const q = quartierDe(u, v);
  const base = q.genre === 'brique' ? [150, 96, 82]
    : q.genre === 'bureaux' ? [138, 146, 158]
      : q.genre === 'chinois' ? [168, 88, 76] : [214, 206, 184];
  const t = 0.82 + tirage(Math.floor(u / PAS_RUE), Math.floor(v / PAS_RUE), 91) * 0.34;
  return [base[0] * t, base[1] * t, base[2] * t];
}

// Les lieux nommés que la carte affiche de près : quartiers, cercles, stations.
// Un plan de Washington se lit par ses ronds-points comme un plan de New York
// se lit par ses quartiers.
export function lieuxDeWashington() {
  return [
    ...CERCLES.map((c) => ({ name: c.nom, x: WASHINGTON.x + c.u, z: WASHINGTON.z + c.v, r: 0 })),
    ...quartiersDeWashington(),
  ];
}

