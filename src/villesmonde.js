// Le tour du monde, pour de vrai : huit villes iconiques d'un coup.
//
// Max : « fais pas que Londres, hein — je veux plein de villes iconiques. »
// Londres a fixé la recette (src/londres.js) ; ce fichier en fait une MACHINE
// et la déroule sur les huit autres. Chaque ville est une fiche de données —
// son eau, sa trame de rues, sa palette, ses monuments aux coordonnées — et
// le moteur commun s'occupe du reste. Une ville de plus, demain, c'est une
// fiche de plus.
//
// TOUT EST RELEVÉ SUR DOCUMENTS, ville par ville :
// — ROME : le Tibre et l'île Tibérine, le Colisée (41,8902/12,4922), le
//   Panthéon, Saint-Pierre de l'autre côté du fleuve, le Forum. Ocre et
//   terracotta, ruelles serrées.
// — BARCELONE : la grille de l'Eixample aux angles CHANFREINÉS — la signature
//   aérienne de la ville, unique au monde —, la Rambla qui descend au port,
//   la Sagrada Família (41,4036/2,1744), la plage de la Barceloneta.
// — PISE : l'Arno, et la piazza dei Miracoli : la tour penchée, le Duomo et
//   le baptistère rond, ALIGNÉS comme sur place (43,7229/10,3966).
// — GIZEH : le plateau désertique, les TROIS pyramides sur leur diagonale
//   exacte — Khéops, Khéphren et sa coiffe de calcaire, Mykérinos — et le
//   Sphinx qui regarde le levant. La vallée verte du Nil à l'est.
// — AGRA : le Taj Mahal sur la Yamuna, son charbagh — le jardin moghol en
//   croix, coupé de canaux — la mosquée de grès rouge et son miroir, le fort
//   d'Agra en amont (27,1795/78,0211).
// — SYDNEY : LE PORT. L'Opéra sur la pointe Bennelong, le Harbour Bridge qui
//   enjambe la baie d'une seule arche, les tours du CBD, le jardin botanique.
// — RIO : la baie de Guanabara, le Pain de Sucre à l'entrée, le Corcovado et
//   son Christ à 700 m au-dessus de la ville, le croissant de Copacabana,
//   la forêt de Tijuca, les maisons vives accrochées aux pentes.
// — SEATTLE : la baie d'Elliott, la Space Needle (47,6205/−122,3493), le
//   marché de Pike Place, les tours du centre — et le mont Rainier à
//   l'horizon, déjà levé par le relief de la Terre.

import { BLOCK, CITY_BLOCK, DECOR_START } from './blocks.js';
import { positionDe } from './mondes.js';
import { monumentBati } from './monuments.js';

const uni = (c) => DECOR_START + c * 10;
const brique = (c) => DECOR_START + c * 10 + 1;

const BITUME = CITY_BLOCK.ASPHALT;
const TROTTOIR = CITY_BLOCK.SIDEWALK;
const PAVE = CITY_BLOCK.GRANITE;
const HERBE = BLOCK.GRASS;
const ARBRE = BLOCK.LEAVES;
const EAU = BLOCK.WATER;
const SABLE = BLOCK.SAND;
const GRES = BLOCK.SANDSTONE;
const VERRE = BLOCK.GLASS;
const OR = BLOCK.GOLD;
const PIERRE = uni(19);
const BLANC = uni(27);
const CREME = uni(28);
const OCRE = uni(1);
const ROSE = uni(16);
const TUILE = uni(0);
const ARDOISE = uni(25);
const ACIER = uni(24);
const ROUGE_GRES = brique(18);

// --- les fiches --------------------------------------------------------------
//
// Chaque ville : son échelle (blocs/km), son eau, sa trame, sa palette, ses
// monuments et ses lieux — tous en latitude/longitude réelles, convertis à la
// volée autour de l'ancre du registre.

function fabrique(cle, fiche) {
  const ancre = positionDe(cle);
  const kmLon = 111.32 * Math.cos((fiche.lat0 * Math.PI) / 180);
  const u = (lon) => Math.round((lon - fiche.lon0) * kmLon * fiche.echelle);
  const v = (lat) => Math.round(-(lat - fiche.lat0) * 111.19 * fiche.echelle);
  const local = (lat, lon) => [u(lon), v(lat)];
  return { cle, ancre, ...fiche, u, v, local };
}

// Un pavillon de ville, tiré au sort mais toujours le même au même endroit.
function tirage(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Les petits constructeurs partagés.
const pyramide = (base, haut, coiffe) => (poser) => {
  for (let y = 0; y <= haut; y++) {
    const r = Math.round(base * (1 - y / haut));
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) === r || Math.abs(dz) === r) {
          poser(dx, y + 1, dz, coiffe && y > haut - coiffe ? BLANC : GRES);
        }
      }
    }
  }
};

const dome = (r, mur, calotte) => (poser) => {
  for (let y = 1; y <= 4; y++) {
    for (let a = 0; a < 360; a += 15) {
      const rad = (a * Math.PI) / 180;
      poser(Math.round(Math.cos(rad) * r), y, Math.round(Math.sin(rad) * r), mur);
    }
  }
  for (let dy = 0; dy <= r; dy++) {
    const rr = Math.sqrt(Math.max(0, r * r - dy * dy));
    for (let a = 0; a < 360; a += 12) {
      const rad = (a * Math.PI) / 180;
      poser(Math.round(Math.cos(rad) * rr), 5 + dy, Math.round(Math.sin(rad) * rr), calotte);
    }
  }
  poser(0, 6 + r, 0, OR);
};

const depuisCatalogue = (id, tourner = false) => (poser) => {
  const m = monumentBati(id);
  if (!m) return;
  const e = m.emprise;
  const cx = Math.round((e.minX + e.maxX) / 2);
  const cz = Math.round((e.minZ + e.maxZ) / 2);
  for (const [bx, by, bz, bloc] of m.blocs) {
    const dx = bx - cx, dz = bz - cz;
    if (tourner) poser(dz, by - e.minY, dx, bloc);
    else poser(dx, by - e.minY, dz, bloc);
  }
};

// Le Sphinx : le corps couché, les pattes vers le levant, la tête qui regarde
// l'est — depuis quatre mille cinq cents ans.
function buildSphinx(poser) {
  for (let dx = -3; dx <= 2; dx++) {
    for (let dz = -1; dz <= 1; dz++) { poser(dx, 1, dz, GRES); poser(dx, 2, dz, GRES); }
  }
  for (const dz of [-1, 1]) { poser(3, 1, dz, GRES); poser(4, 1, dz, GRES); }   // les pattes
  poser(2, 3, 0, GRES); poser(2, 4, 0, GRES);                                   // la tête
  poser(3, 4, 0, GRES);                                                          // le némès
}

// L'arche du Harbour Bridge : une seule portée au-dessus de la baie, le
// tablier suspendu dessous, les deux pylônes de granit aux culées.
function buildHarbourBridge(poser) {
  const L = 13, H = 12;
  for (let k = -L; k <= L; k++) {
    const y = Math.round(H * Math.cos((k / L) * (Math.PI / 2.2)));
    for (const du of [-2, 2]) poser(du, 6 + y, k, ACIER);
    poser(-2, 6, k, ACIER); poser(2, 6, k, ACIER);                 // le tablier
    for (let du = -1; du <= 1; du++) poser(du, 5, k, BITUME);
    if ((k & 3) === 0 && y > 2) { poser(-2, 6 + Math.round(y / 2), k, ACIER); poser(2, 6 + Math.round(y / 2), k, ACIER); }
  }
  for (const k of [-L, L]) {
    for (let y = 1; y <= 9; y++) { poser(-3, y, k, PIERRE); poser(3, y, k, PIERRE); }
  }
}

// La colonne de colonnes : ce qui reste d'un forum.
function buildForum(poser) {
  for (const [dx, dz] of [[-4, 0], [-2, 0], [0, 0], [2, 0], [4, 0], [-3, 3], [1, 3]]) {
    const h = 3 + ((dx + dz) & 1) * 2;
    for (let y = 1; y <= h; y++) poser(dx, y, dz, CREME);
    if (h >= 5) poser(dx, h + 1, dz, PIERRE);
  }
}

// La mosquée moghole : trois dômes blancs sur le grès rouge.
function buildMosqueeRouge(poser) {
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let y = 1; y <= 3; y++) {
        if (Math.abs(dx) === 4 || Math.abs(dz) === 2 || y === 3) poser(dx, y, dz, ROUGE_GRES);
      }
    }
  }
  for (const dx of [-3, 0, 3]) { poser(dx, 4, 0, BLANC); poser(dx, 5, 0, BLANC); }
}

// Le fort rouge : la muraille circulaire de grès.
function buildFortRouge(poser) {
  for (let a = 0; a < 360; a += 6) {
    const rad = (a * Math.PI) / 180;
    const dx = Math.round(Math.cos(rad) * 8), dz = Math.round(Math.sin(rad) * 8);
    for (let y = 1; y <= 5; y++) poser(dx, y, dz, ROUGE_GRES);
    if (a % 45 === 0) poser(dx, 6, dz, ROUGE_GRES);
  }
}

// La grande roue du front de mer de Seattle.
function buildGrandeRoue(poser) {
  const R = 7;
  for (let a = 0; a < 360; a += 12) {
    const rad = (a * Math.PI) / 180;
    poser(0, R + 2 + Math.round(Math.sin(rad) * R), Math.round(Math.cos(rad) * R), BLANC);
  }
  for (let y = 1; y <= R + 2; y++) poser(0, y, 0, ACIER);
}

// La halle de Pike Place et son enseigne rouge.
function buildPikePlace(poser) {
  for (let dz = -4; dz <= 4; dz++) {
    for (let y = 1; y <= 2; y++) { poser(-1, y, dz, brique(0)); poser(1, y, dz, brique(0)); }
    poser(0, 3, dz, ARDOISE); poser(-1, 3, dz, ARDOISE); poser(1, 3, dz, ARDOISE);
  }
  poser(0, 4, -3, BLOCK.WOOL_RED); poser(0, 4, -2, BLOCK.WOOL_RED);   // l'enseigne
}

// La colonne de Colomb, au bas de la Rambla.
function buildColom(poser) {
  for (let y = 1; y <= 3; y++) for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) poser(a, y, b, PIERRE);
  for (let y = 4; y <= 12; y++) poser(0, y, 0, PIERRE);
  poser(0, 13, 0, OR);
}

// --- les huit fiches ---------------------------------------------------------

const FICHES = {
  rome: {
    lat0: 41.9028, lon0: 12.4964, echelle: 20, rayon: 75,
    fleuve: { pts: [[-49, -62], [-44, -20], [-50, 1], [-44, 25], [-41, 30], [-44, 55], [-46, 75]], l: 3 },
    trame: { ang: 0.2, pu: 5, pv: 4, w: 0.45, s: 0.8 },
    palette: [OCRE, uni(2), CREME, ROSE], toit: TUILE, hMaison: [3, 5],
    monuments: [
      { nom: 'Colisée', lat: 41.8902, lon: 12.4922, build: depuisCatalogue('colisee') },
      { nom: 'Panthéon', lat: 41.8986, lon: 12.4769, box: 6, build: dome(4, CREME, PIERRE) },
      { nom: 'Basilique St-Pierre', lat: 41.9022, lon: 12.4539, box: 9, build: dome(6, CREME, ARDOISE) },
      { nom: 'Forum romain', lat: 41.8925, lon: 12.4853, box: 6, seuil: 0.4, build: buildForum },
    ],
    lieux: [['Fontaine de Trevi', 41.9009, 12.4833], ['Vatican', 41.9029, 12.4534],
      ['Île Tibérine', 41.8905, 12.4776], ['Circus Maximus', 41.886, 12.485]],
    couleurToits: [178, 108, 82],
  },
  barcelone: {
    lat0: 41.3874, lon0: 2.1686, echelle: 20, rayon: 66,
    mer: { nx: 0.55, nz: 0.84, d: 40, plage: 3 },
    trame: { ang: 0.55, pu: 6, pv: 6, w: 0.5, s: 0.85, chanfrein: 1.6 },
    palette: [uni(20), CREME, ROSE, OCRE], toit: TUILE, hMaison: [4, 6],
    voies: [{ pts: [[0, 0], [15, 26]], l: 1.0 }],                  // la Rambla
    parcs: [{ cu: -26, cv: -60, ru: 8, rv: 6, mosaique: true }],   // le parc Güell
    monuments: [
      { nom: 'Sagrada Família', lat: 41.4036, lon: 2.1744, build: depuisCatalogue('sagrada') },
      { nom: 'Colonne de Colom', lat: 41.3758, lon: 2.1778, box: 4, seuil: 0.4, build: buildColom },
    ],
    lieux: [['La Rambla', 41.3809, 2.1735], ['Barceloneta', 41.3785, 2.1925],
      ['Parc Güell', 41.4145, 2.1527], ['Plaça Catalunya', 41.3874, 2.1686]],
    couleurToits: [186, 138, 96],
  },
  pise: {
    lat0: 43.7228, lon0: 10.3966, echelle: 20, rayon: 42,
    fleuve: { pts: [[-40, 17], [-10, 13], [15, 16], [40, 14]], l: 2.5 },
    trame: { ang: 0.15, pu: 5, pv: 4, w: 0.45, s: 0.8 },
    palette: [OCRE, CREME, uni(2)], toit: TUILE, hMaison: [3, 4],
    monuments: [
      { nom: 'Tour de Pise', lat: 43.7229, lon: 10.3966, build: depuisCatalogue('tour-pise') },
      { nom: 'Duomo de Pise', lat: 43.7231, lon: 10.3955, box: 6, build: dome(4, BLANC, TUILE) },
      { nom: 'Baptistère', lat: 43.7233, lon: 10.3941, box: 5, seuil: 0.4, build: dome(3, BLANC, TUILE) },
    ],
    lieux: [['Piazza dei Miracoli', 43.7229, 10.3958], ["L'Arno", 43.7160, 10.4000]],
    couleurToits: [182, 116, 88],
  },
  gizeh: {
    lat0: 29.9773, lon0: 31.1325, echelle: 24, rayon: 62,
    desert: true, oasis: { u0: 40 },                              // la vallée du Nil, à l'est
    monuments: [
      { nom: 'Pyramide de Khéops', lat: 29.9792, lon: 31.1342, build: depuisCatalogue('pyramide-gizeh') },
      // Khéphren garde sa coiffe : le sommet a conservé son calcaire lisse.
      { nom: 'Pyramide de Khéphren', lat: 29.9761, lon: 31.1308, box: 18, build: pyramide(15, 26, 5) },
      { nom: 'Pyramide de Mykérinos', lat: 29.9725, lon: 31.1281, box: 11, build: pyramide(8, 13, 0) },
      { nom: 'Le Sphinx', lat: 29.9753, lon: 31.1376, box: 6, seuil: 0.4, build: buildSphinx },
    ],
    lieux: [['Plateau de Gizeh', 29.9773, 31.1325], ['La vallée du Nil', 29.977, 31.152]],
    couleurToits: [216, 192, 150],
  },
  agra: {
    lat0: 27.1751, lon0: 78.0421, echelle: 24, rayon: 58,
    fleuve: { pts: [[-40, -12], [-10, -8], [10, -6], [30, -12], [45, -20]], l: 4 },
    charbagh: { v0: 3, v1: 30, demi: 14 },                        // le jardin moghol en croix
    trame: { ang: 0, pu: 6, pv: 5, w: 0.45, s: 0.8, sud: 34 },
    palette: [uni(20), CREME, ROSE], toit: CREME, hMaison: [2, 4],
    monuments: [
      { nom: 'Taj Mahal', lat: 27.1751, lon: 78.0421, build: depuisCatalogue('taj-mahal') },
      { nom: 'Mosquée du Taj', lat: 27.1751, lon: 78.0399, box: 6, seuil: 0.4, build: buildMosqueeRouge },
      { nom: "Fort d'Agra", lat: 27.1795, lon: 78.0211, box: 10, build: buildFortRouge },
    ],
    lieux: [['Charbagh', 27.1731, 78.0421], ['La Yamuna', 27.1785, 78.045]],
    couleurToits: [206, 178, 140],
  },
  sydney: {
    lat0: -33.8688, lon0: 151.2093, echelle: 20, rayon: 66,
    baie: { v0: -9, v1: -30, presquile: { u0: 7, u1: 14, v1: -28 } },   // le port, et Bennelong Point
    trame: { ang: 0.1, pu: 6, pv: 5, w: 0.5, s: 0.85, tours: 0.55 },
    palette: [CREME, uni(20), brique(0)], toit: ARDOISE, hMaison: [4, 6],
    parcs: [{ cu: 14, cv: 2, ru: 9, rv: 6 }],                     // le jardin botanique
    monuments: [
      { nom: "Opéra de Sydney", lat: -33.8568, lon: 151.2153, build: depuisCatalogue('opera-sydney') },
      { nom: 'Harbour Bridge', lat: -33.8598, lon: 151.2108, box: 16, build: buildHarbourBridge },
    ],
    lieux: [['Circular Quay', -33.8609, 151.2105], ['Le CBD', -33.868, 151.207],
      ['Jardin botanique', -33.8642, 151.2166]],
    couleurToits: [150, 158, 168],
  },
  rio: {
    lat0: -22.9068, lon0: -43.1729, echelle: 10, rayon: 85,
    baieRio: true,                                                 // la géographie la plus singulière du jeu
    collines: [
      { nom: 'Pain de Sucre', cu: 17, cv: 48, r: 5, h: 22, roche: true },
      { nom: 'Corcovado', cu: -39, cv: 50, r: 11, h: 30, roche: true },
      { nom: 'Santa Marta', cu: -15, cv: 35, r: 6, h: 10, favela: true },
    ],
    foret: { u1: -20, v0: 20 },                                    // la forêt de Tijuca
    plage: { v0: 70, v1: 78 },                                     // Copacabana
    trame: { ang: 0.05, pu: 6, pv: 5, w: 0.5, s: 0.85 },
    palette: [BLANC, CREME, uni(20)], toit: TUILE, hMaison: [3, 6],
    paletteFavela: [ROSE, uni(10), uni(2), uni(5), OCRE],
    monuments: [
      // Le Christ est posé AU SOMMET du Corcovado : le monument hérite de
      // l'altitude de sa colline, bras ouverts au-dessus de la baie.
      { nom: 'Christ Rédempteur', lat: -22.9519, lon: -43.2105, build: depuisCatalogue('christ-redempteur') },
    ],
    lieux: [['Pain de Sucre', -22.9486, -43.1566], ['Copacabana', -22.9714, -43.1822],
      ['Forêt de Tijuca', -22.94, -43.21], ['Centro', -22.9068, -43.1729]],
    couleurToits: [188, 148, 108],
  },
  seattle: {
    lat0: 47.6062, lon0: -122.3321, echelle: 20, rayon: 54,
    cote: { base: -16, pente: 0.35, quais: true },                // la baie d'Elliott, au nord-ouest
    trame: { ang: -0.3, pu: 6, pv: 5, w: 0.5, s: 0.85, tours: 0.6 },
    palette: [brique(0), CREME, ACIER], toit: ARDOISE, hMaison: [4, 6],
    monuments: [
      { nom: 'Space Needle', lat: 47.6205, lon: -122.3493, build: depuisCatalogue('space-needle') },
      { nom: 'Pike Place', lat: 47.6097, lon: -122.3422, box: 6, seuil: 0.4, build: buildPikePlace },
      { nom: 'La grande roue', lat: 47.6061, lon: -122.3425, box: 9, seuil: 0.4, build: buildGrandeRoue },
    ],
    lieux: [['Le front de mer', 47.605, -122.34], ['Downtown', 47.608, -122.335]],
    couleurToits: [140, 146, 156],
  },
};

export const VILLES_MONDE = Object.entries(FICHES).map(([cle, f]) => fabrique(cle, f));

// --- la géométrie commune ----------------------------------------------------

function distancePolyligne(pts, u, v) {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [u0, v0] = pts[i], [u1, v1] = pts[i + 1];
    const du = u1 - u0, dv = v1 - v0;
    const l2 = du * du + dv * dv || 1;
    const t = Math.max(0, Math.min(1, ((u - u0) * du + (v - v0) * dv) / l2));
    min = Math.min(min, Math.hypot(u - (u0 + du * t), v - (v0 + dv * t)));
  }
  return min;
}

// L'eau d'une ville, en ce point ? (hors Tamise : Londres a son propre module)
function eauDeVille(f, u, v) {
  if (f.fleuve && distancePolyligne(f.fleuve.pts, u, v) < f.fleuve.l) return true;
  if (f.mer && u * f.mer.nx + v * f.mer.nz > f.mer.d) return true;
  if (f.cote && u < f.cote.base + f.cote.pente * v) return true;
  if (f.baie) {
    if (v < f.baie.v0 && v > f.baie.v1) {
      const p = f.baie.presquile;
      if (!(u >= p.u0 && u <= p.u1 && v >= p.v1)) return true;    // sauf la pointe de l'Opéra
    }
  }
  if (f.baieRio) {
    // la baie de Guanabara à l'est, l'océan au sud — et les presqu'îles.
    if (u > 28 + Math.max(0, v - 40) * 0.5 && !(Math.hypot(u - 17, v - 48) < 8)) return true;
    if (v > 78 && !(Math.hypot(u - 17, v - 48) < 8)) return true;
  }
  if (f.charbagh) {
    const c = f.charbagh;
    if (v >= c.v0 && v <= c.v1 && Math.abs(u) <= c.demi) {
      if (Math.abs(u) < 1.2) return true;                          // le canal axial
      const milieu = (c.v0 + c.v1) / 2;
      if (Math.abs(v - milieu) < 1.2) return true;                 // le canal croisé
    }
  }
  for (const p of f.parcs || []) {
    if (p.lac && ((u - p.lac.cu) / p.lac.ru) ** 2 + ((v - p.lac.cv) / p.lac.rv) ** 2 < 1) return true;
  }
  return false;
}

function collineDeVille(f, u, v) {
  let plus = 0;
  for (const c of f.collines || []) {
    const d = Math.hypot(u - c.cu, v - c.cv);
    if (d >= c.r) continue;
    const m = Math.cos((d / c.r) * Math.PI * 0.5);
    plus = Math.max(plus, m * m * c.h);
  }
  return plus;
}

// --- ce que world.js appelle -------------------------------------------------

export function hauteurVillesMonde(x, z, h) {
  for (const f of VILLES_MONDE) {
    const u = x - f.ancre.x, v = z - f.ancre.z;
    const d = Math.hypot(u, v);
    if (d > f.rayon + 14) continue;
    const marge = Math.min(1, (f.rayon + 14 - d) / 14);
    let cible = 33;
    if (eauDeVille(f, u, v)) cible = 26;
    else cible += collineDeVille(f, u, v);
    return h * (1 - marge) + cible * marge;
  }
  return h;
}

export function solVillesMonde(x, z) {
  for (const f of VILLES_MONDE) {
    const u = x - f.ancre.x, v = z - f.ancre.z;
    if (Math.hypot(u, v) > f.rayon) continue;

    if (eauDeVille(f, u, v)) return null;                          // l'eau se remplit seule
    if (f.mer && f.mer.plage && u * f.mer.nx + v * f.mer.nz > f.mer.d - f.mer.plage) return SABLE;
    if (f.mer && f.mer.quais && u * f.mer.nx + v * f.mer.nz > f.mer.d - 2) return PAVE;
    if (f.cote && f.cote.quais && u < f.cote.base + f.cote.pente * v + 2) return PAVE;
    if (f.plage && v >= f.plage.v0 && v <= f.plage.v1) return SABLE;
    if (f.desert) {
      if (f.oasis && u > f.oasis.u0) return ((u + v) & 3) === 0 ? ARBRE : HERBE;
      return SABLE;
    }
    if (f.charbagh) {
      const c = f.charbagh;
      if (v >= c.v0 && v <= c.v1 && Math.abs(u) <= c.demi) {
        if (Math.abs(u) < 2.4 || Math.abs(v - (c.v0 + c.v1) / 2) < 2.4) return TROTTOIR;
        return HERBE;
      }
    }
    for (const p of f.parcs || []) {
      if (((u - p.cu) / p.ru) ** 2 + ((v - p.cv) / p.rv) ** 2 < 1) {
        if (p.mosaique && ((u + v) & 1) === 0) return uni(((u * 7 + v * 13) & 3) * 5);
        return ((u + v) & 3) === 0 ? ARBRE : HERBE;
      }
    }
    const colline = collineDeVille(f, u, v);
    if (colline > 1) {
      const c = (f.collines || []).find((k) => Math.hypot(u - k.cu, v - k.cv) < k.r);
      if (c && c.roche) return PIERRE;
      if (c && c.favela) return 'lot';                             // les maisons s'accrochent
      return ((u + v) & 3) === 0 ? ARBRE : HERBE;
    }
    if (f.foret && u < f.foret.u1 && v > f.foret.v0) return ((u + v) & 1) === 0 ? ARBRE : HERBE;

    for (const voie of f.voies || []) {
      if (distancePolyligne(voie.pts, u, v) < voie.l) return BITUME;
      if (distancePolyligne(voie.pts, u, v) < voie.l + 0.8) return TROTTOIR;
    }
    if (!f.trame) return null;
    const t = f.trame;
    if (t.sud && v > t.sud) return null;
    const co = Math.cos(t.ang), si = Math.sin(t.ang);
    const a = u * co - v * si, b = u * si + v * co;
    const ra = a - Math.round(a / t.pu) * t.pu, rb = b - Math.round(b / t.pv) * t.pv;
    const dRue = Math.min(Math.abs(ra), Math.abs(rb));
    if (dRue < t.w) return BITUME;
    if (dRue < t.s) return TROTTOIR;
    // Les chanfreins de l'Eixample : aux carrefours, le coin est coupé —
    // c'est CE dessin-là qu'on voit du ciel à Barcelone, et nulle part
    // ailleurs au monde.
    if (t.chanfrein && Math.abs(ra) < t.chanfrein && Math.abs(rb) < t.chanfrein
      && Math.abs(ra) + Math.abs(rb) < t.chanfrein * 1.7) return TROTTOIR;
    return 'lot';
  }
  return null;
}

export function batirColonneVillesMonde(x, z, poser) {
  for (const f of VILLES_MONDE) {
    const u = x - f.ancre.x, v = z - f.ancre.z;
    if (Math.hypot(u, v) > f.rayon) continue;
    if (!f.trame && !f.collines) return;
    const t = f.trame || { ang: 0, pu: 6, pv: 5 };
    const co = Math.cos(t.ang), si = Math.sin(t.ang);
    const a = Math.round((u * co - v * si) / t.pu), b = Math.round((u * si + v * co) / t.pv);
    const r = tirage(a, b, f.rayon * 7 + 11);

    const c = (f.collines || []).find((k) => Math.hypot(u - k.cu, v - k.cv) < k.r);
    const favela = c && c.favela;
    const tour = !favela && t.tours && r > t.tours && Math.hypot(u, v) < f.rayon * 0.4;
    const palette = favela ? f.paletteFavela : f.palette;
    const [h0, h1] = favela ? [2, 3] : (f.hMaison || [3, 5]);
    const bh = tour ? 10 + Math.floor(r * 14) : h0 + Math.floor(r * (h1 - h0 + 1));
    const mur = tour ? ACIER : palette[Math.floor(tirage(a, b, 97) * palette.length) % palette.length];
    const face = (u & 1) === 0 ? v : u;
    for (let y = 0; y < bh; y++) {
      if (tour) { poser(y + 1, y % 3 === 2 ? ACIER : VERRE); continue; }
      const fenetre = y > 0 && y % 2 === 1 && (face & 1) === 1;
      poser(y + 1, fenetre ? VERRE : mur);
    }
    poser(bh + 1, tour ? ACIER : f.toit);
    return;
  }
}

// Les monuments, pour la liste LANDMARKS de world.js.
export function landmarksVillesMonde() {
  const out = [];
  for (const f of VILLES_MONDE) {
    for (const m of f.monuments) {
      const [du, dv] = f.local(m.lat, m.lon);
      let box = m.box;
      if (!box) {
        // la boîte se lit sur le monument déjà bâti, jamais recopiée
        const nomCat = { 'Colisée': 'colisee', 'Sagrada Família': 'sagrada', 'Tour de Pise': 'tour-pise',
          'Pyramide de Khéops': 'pyramide-gizeh', 'Taj Mahal': 'taj-mahal', "Opéra de Sydney": 'opera-sydney',
          'Christ Rédempteur': 'christ-redempteur', 'Space Needle': 'space-needle' }[m.nom];
        const bati = nomCat && monumentBati(nomCat);
        box = bati ? Math.ceil(Math.max(bati.emprise.l, bati.emprise.p) / 2) + 2 : 8;
      }
      out.push({ name: m.nom, x: f.ancre.x + du, z: f.ancre.z + dv, box, seuil: m.seuil, build: m.build });
    }
  }
  return out;
}

// Les destinations et les étiquettes de la carte.
export function placesVillesMonde() {
  const out = [];
  for (const f of VILLES_MONDE) {
    out.push({ name: f.ancre.nom, x: f.ancre.x, z: f.ancre.z, r: f.rayon });
    for (const m of f.monuments) {
      const [du, dv] = f.local(m.lat, m.lon);
      out.push({ name: m.nom, x: f.ancre.x + du, z: f.ancre.z + dv, r: 0 });
    }
    for (const [nom, lat, lon] of f.lieux || []) {
      const [du, dv] = f.local(lat, lon);
      out.push({ name: nom, x: f.ancre.x + du, z: f.ancre.z + dv, r: 0 });
    }
  }
  return out;
}

export function lieuxDesVillesMonde() {
  return placesVillesMonde().filter((p) => p.r === 0).map((p) => ({ ...p, r: 6 }));
}

// La couleur sur la carte, vue du ciel.
export function couleurCarteVillesMonde(x, z) {
  for (const f of VILLES_MONDE) {
    const u = x - f.ancre.x, v = z - f.ancre.z;
    if (Math.hypot(u, v) > f.rayon) continue;
    if (eauDeVille(f, u, v)) return [92, 142, 196];
    const sol = solVillesMonde(x, z);
    if (sol === SABLE) return [226, 206, 156];
    if (sol === ARBRE || sol === HERBE) return [96, 156, 92];
    if (sol === BITUME) return [76, 78, 86];
    if (sol === TROTTOIR || sol === PAVE) return [178, 174, 166];
    return f.couleurToits;
  }
  return null;
}
