// Londres.
//
// Max : « quand tu vois Londres aujourd'hui, il n'y a qu'un seul bâtiment…
// je veux un petit bout de Londres avec une vraie fidélité — les rues, les
// maisons — qu'on ait l'impression d'être à Londres. » C'était deux monuments
// sur une esplanade. Voici la ville.
//
// TOUT EST RELEVÉ SUR DOCUMENTS, comme Nice et Lille avant elle. L'ancrage
// est Charing Cross (51,5074 N, 0,1278 O) — le point d'où les distances à
// Londres se mesurent officiellement depuis le XIXᵉ siècle. L'échelle est de
// 24 blocs par kilomètre, et chaque lieu est posé À SES COORDONNÉES : Big Ben
// (51,5007, −0,1246), Tower Bridge (51,5055, −0,0754), Buckingham (51,5014,
// −0,1419), St Paul (51,5138, −0,0984), le London Eye (51,5033, −0,1195)…
//
// CE QUI FAIT QU'ON RECONNAÎT LONDRES, dans l'ordre où un enfant le voit :
//
// 1. LA TAMISE ET SON « S ». Elle coule vers le NORD à Vauxhall, Lambeth et
//    Westminster, tourne plein EST à Charing Cross, et repart vers Tower
//    Bridge. Le Parlement est posé SUR le fleuve au coude exact, et le London
//    Eye juste en face, sur l'autre rive. C'est ce coude-là qu'on voit sur
//    tous les plans.
// 2. LES MONUMENTS À LEUR PLACE : Big Ben au bord de l'eau, l'abbaye de
//    Westminster derrière, Whitehall qui remonte vers Trafalgar et la colonne
//    Nelson, le Mall — rouge, comme le vrai — qui file vers Buckingham, la
//    City et ses tours de verre autour de St Paul, la Tour de Londres devant
//    Tower Bridge, le Shard sur la rive sud.
// 3. LES RUES ET LES MAISONS : des terrasses victoriennes de brique aux
//    fenêtres à guillotine blanches et aux cheminées par paires, du stuc
//    blanc vers Mayfair et Belgravia, des tours de verre dans la City — trois
//    quartiers, trois architectures, comme la vraie ville.
// 4. LE MOBILIER QUI SIGNE LA VILLE : bus impériaux rouges, cabines
//    téléphoniques rouges, taxis noirs.
// 5. LES PARCS ROYAUX : Hyde Park et la Serpentine, St James's Park et son
//    lac entre Buckingham et Whitehall, Green Park, Regent's Park — et la
//    butte de Primrose Hill d'où l'on voit toute la ville.

import { BLOCK, CITY_BLOCK, DECOR_START } from './blocks.js';
import { rangerVoies, solDesVoies } from './voies.js';
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
const VERRE = BLOCK.GLASS;
const OR = BLOCK.GOLD;
const ROUGE = BLOCK.WOOL_RED;
const BRIQUE = brique(0);
const BRIQUE_SOMBRE = brique(18);
const BRIQUE_BRUNE = brique(17);
const PIERRE = uni(19);
const BLANC = uni(27);
const CREME = uni(28);
const ARDOISE = uni(25);
const ACIER = uni(24);
const NOIR = uni(25);
// Le Mall est ROUGE dans la vraie ville — un tapis d'asphalte teinté d'oxyde
// de fer qui mène à Buckingham. C'est un détail que tout le monde a vu sans
// le savoir, et qui fait « Londres » instantanément vu du ciel.
const MALL_ROUGE = brique(16);

export const LONDRES = { ...positionDe('londres'), r: 112 };

// 24 blocs par kilomètre : un bloc fait 42 mètres. Le centre est Charing
// Cross ; u croît vers l'est, v vers le sud, comme partout dans le jeu.
const BLOCS_PAR_KM = 24;
const LAT0 = 51.5074, LON0 = -0.1278;
const uDe = (lon) => Math.round((lon - LON0) * 69.2 * BLOCS_PAR_KM);
const vDe = (lat) => Math.round(-(lat - LAT0) * 111.19 * BLOCS_PAR_KM);
const de = (lat, lon) => [uDe(lon), vDe(lat)];

// --- la Tamise ---------------------------------------------------------------
//
// Le tracé, pont par pont, chacun à ses coordonnées : Battersea, Chelsea
// (51,4846/−0,1497), Vauxhall (51,4877/−0,1265), Lambeth (51,4944/−0,1237),
// Westminster (51,5008/−0,1219), Hungerford (51,5063/−0,1201), Waterloo
// (51,5085/−0,1169), Blackfriars (51,5096/−0,1046), le pont du Millénaire
// (51,5094/−0,0985), London Bridge (51,5079/−0,0878), Tower Bridge
// (51,5055/−0,0754), puis l'estuaire vers Wapping.
export const TAMISE = [
  [-70, 64], de(51.4846, -0.1497), de(51.4877, -0.1265), de(51.4944, -0.1237),
  de(51.5008, -0.1219), de(51.5063, -0.1201), de(51.5085, -0.1169),
  de(51.5096, -0.1046), de(51.5094, -0.0985), de(51.5079, -0.0878),
  de(51.5055, -0.0754), [120, 10],
];

const LARGEUR_TAMISE = 5;      // demi-largeur : ~420 m d'une rive à l'autre

export function distanceTamise(u, v) {
  let min = Infinity;
  for (let i = 0; i < TAMISE.length - 1; i++) {
    const [u0, v0] = TAMISE[i], [u1, v1] = TAMISE[i + 1];
    const du = u1 - u0, dv = v1 - v0;
    const l2 = du * du + dv * dv || 1;
    const t = Math.max(0, Math.min(1, ((u - u0) * du + (v - v0) * dv) / l2));
    min = Math.min(min, Math.hypot(u - (u0 + du * t), v - (v0 + dv * t)));
  }
  return min;
}

// --- les parcs royaux --------------------------------------------------------

const PARCS = [
  // Hyde Park et les jardins de Kensington : 2,5 km d'ouest en est, avec la
  // Serpentine en travers (51,5057/−0,1650).
  { nom: 'Hyde Park', cu: -70, cv: 0, ru: 30, rv: 14,
    lac: { cu: -62, cv: 5, ru: 10, rv: 2.5 } },
  { nom: 'Green Park', cu: -27, cv: 7, ru: 8, rv: 6 },
  // St James's Park : son lac entre Buckingham et Whitehall, celui des
  // pélicans — un cadeau de l'ambassadeur de Russie en 1664.
  { nom: "St James's Park", cu: -12, cv: 14, ru: 11, rv: 4,
    lac: { cu: -12, cv: 13, ru: 8, rv: 2 } },
  { nom: "Regent's Park", cu: -48, cv: -64, ru: 14, rv: 10 },
];

// Primrose Hill : la butte au nord de Regent's Park d'où toute la ville se
// découvre. 51,5390/−0,1607 — un des panoramas protégés de Londres.
const PRIMROSE = { cu: -55, cv: -84, r: 9, h: 8 };

// --- les lieux (les étiquettes de la carte) ----------------------------------

const L = (nom, lat, lon, reste = {}) => {
  const [u, v] = de(lat, lon);
  return { nom, u, v, ...reste };
};

export const LIEUX_LONDRES = [
  L('Trafalgar Square', 51.5074, -0.1278, { r: 6, sol: PIERRE }),
  L('Big Ben', 51.5007, -0.1246),
  L('Westminster', 51.4994, -0.1273),
  L('Buckingham Palace', 51.5014, -0.1419),
  L('London Eye', 51.5033, -0.1195),
  L('Cathédrale St Paul', 51.5138, -0.0984),
  L('Tour de Londres', 51.5081, -0.0759),
  L('Tower Bridge', 51.5055, -0.0754),
  L('The Shard', 51.5045, -0.0865),
  L('Hyde Park', 51.5073, -0.1657),
  L("St James's Park", 51.5027, -0.1349),
  L('Piccadilly Circus', 51.5101, -0.1341, { r: 2.5, sol: PAVE }),
  L('Oxford Street', 51.5152, -0.1418),
  L('Soho', 51.5136, -0.1365),
  L('Covent Garden', 51.5117, -0.124, { r: 3, sol: PAVE }),
  L('La City', 51.5133, -0.089),
  L('British Museum', 51.5194, -0.127),
  L("King's Cross", 51.5308, -0.1238),
  L('Le Globe', 51.5077, -0.097),
  L('Primrose Hill', 51.539, -0.1607),
];

export const lieuxDeLondres = () => LIEUX_LONDRES
  .map((p) => ({ name: p.nom, x: LONDRES.x + p.u, z: LONDRES.z + p.v, r: 6 }));

// --- les voies nommées -------------------------------------------------------

const VOIES = [
  // Le Mall : l'avenue rouge de Trafalgar à Buckingham, bordée de platanes.
  { nom: 'The Mall', l: 1.2, sol: MALL_ROUGE, pts: [[-2, 2], [-21, 14]] },
  // Whitehall : des ministères de Trafalgar au Parlement.
  { nom: 'Whitehall', l: 1.1, pts: [[0, 2], [4, 16]] },
  // Le Strand puis Fleet Street : la couture entre Westminster et la City.
  { nom: 'Strand & Fleet Street', l: 1.0, pts: [[2, -2], [18, -6], [38, -9], [46, -14]] },
  { nom: 'Oxford Street', l: 1.0, pts: [[-40, -22], [-23, -21], [-5, -17]] },
  { nom: 'Regent Street', l: 0.9, pts: [[-10, -7], [-17, -14], [-23, -21]] },
  { nom: 'Piccadilly', l: 0.9, pts: [[-10, -7], [-27, -1], [-38, 3]] },
  { nom: 'Victoria Street', l: 0.8, pts: [[1, 21], [-20, 26]] },
  // L'Embankment : le quai bâti par Bazalgette, qui suit la rive nord.
  { nom: 'Victoria Embankment', l: 0.7, pts: [[8, 17], [11, 3], [17, -5], [38, -8], [48, -7], [64, -3]] },
  { nom: 'Borough High Street', l: 0.8, pts: [[66, 2], [69, 10], [70, 18]] },
];

const BANDES = rangerVoies(VOIES);

// --- les trames de rues ------------------------------------------------------
//
// Trois tissus, comme la vraie ville : Westminster et Mayfair tracés large,
// la City sur son lacis médiéval serré et de guingois — elle a brûlé en 1666
// et s'est rebâtie sur ses propres ruelles —, la rive sud plus industrielle.
// LE GRAND RECALIBRAGE DE LONDRES (v178). Max, capture à l'appui sur
// Westminster : « too packed ». Londres avait échappé au recalibrage v172
// des villes machine : rues d'UN bloc, îlots de quatre — un tapis de
// maisons sans respiration. Même remède, même gabarit : périodes ×3,
// chaussée de trois blocs, trottoirs de deux. Chaque trame garde son ANGLE
// — le damier penché de la City reste penché — c'est lui qui fait Londres.
const TRAMES = {
  ouest: { ang: 0, pu: 21, pv: 18, cu: 0, cv: 0, w: 1.7, s: 4.0 },
  city: { ang: 0.32, pu: 15, pv: 12, cu: 60, cv: -14, w: 1.7, s: 4.0 },
  sud: { ang: 0.08, pu: 24, pv: 18, cu: 40, cv: 14, w: 1.7, s: 4.0 },
};

const auNordDeLaTamise = (u, v) => {
  // de quel côté du fleuve ? On regarde le point le plus proche du tracé.
  let min = Infinity, cote = 0;
  for (let i = 0; i < TAMISE.length - 1; i++) {
    const [u0, v0] = TAMISE[i], [u1, v1] = TAMISE[i + 1];
    const du = u1 - u0, dv = v1 - v0;
    const l2 = du * du + dv * dv || 1;
    const t = Math.max(0, Math.min(1, ((u - u0) * du + (v - v0) * dv) / l2));
    const d = Math.hypot(u - (u0 + du * t), v - (v0 + dv * t));
    if (d < min) { min = d; cote = du * (v - v0) - dv * (u - u0); }
  }
  return cote < 0;
};

function trameDeLondres(u, v) {
  if (!auNordDeLaTamise(u, v)) return TRAMES.sud;
  if (u > 38) return TRAMES.city;
  return TRAMES.ouest;
}

// --- le relief ---------------------------------------------------------------

export function hauteurLondres(x, z, h, base) {
  const u = x - LONDRES.x, v = z - LONDRES.z;
  const d = Math.hypot(u, v);
  if (d > LONDRES.r + 14) return h;
  const marge = Math.min(1, (LONDRES.r + 14 - d) / 14);

  let cible = base;
  const dT = distanceTamise(u, v);
  if (dT < LARGEUR_TAMISE) cible = base - 7;                    // le lit du fleuve
  else if (dT < LARGEUR_TAMISE + 1.5) cible = base + 1;         // le parapet du quai
  for (const p of PARCS) {
    if (p.lac && ((u - p.lac.cu) / p.lac.ru) ** 2 + ((v - p.lac.cv) / p.lac.rv) ** 2 < 1) {
      cible = base - 4;                                          // la Serpentine et le lac
    }
  }
  const dP = Math.hypot(u - PRIMROSE.cu, v - PRIMROSE.cv);
  if (dP < PRIMROSE.r) {
    const m = Math.cos((dP / PRIMROSE.r) * Math.PI * 0.5);
    cible += m * m * PRIMROSE.h;                                 // Primrose Hill
  }
  return h * (1 - marge) + cible * marge;
}

export const surTerreLondres = (x, z) => {
  const u = x - LONDRES.x, v = z - LONDRES.z;
  if (Math.hypot(u, v) > LONDRES.r) return false;
  return distanceTamise(u, v) >= LARGEUR_TAMISE;
};

// --- le sol ------------------------------------------------------------------

export function solLondres(x, z) {
  const u = x - LONDRES.x, v = z - LONDRES.z;
  if (Math.hypot(u, v) > LONDRES.r) return null;

  const dT = distanceTamise(u, v);
  if (dT < LARGEUR_TAMISE) return null;                          // l'eau se remplit seule
  if (dT < LARGEUR_TAMISE + 1.5) return PAVE;                    // le quai de granit

  for (const p of PARCS) {
    if (p.lac && ((u - p.lac.cu) / p.lac.ru) ** 2 + ((v - p.lac.cv) / p.lac.rv) ** 2 < 1) return EAU;
    if (((u - p.cu) / p.ru) ** 2 + ((v - p.cv) / p.rv) ** 2 < 1) {
      if (Math.abs(u - p.cu) < 0.6 || Math.abs(v - p.cv) < 0.6) return TROTTOIR;
      return ((u + v) & 3) === 0 ? ARBRE : HERBE;
    }
  }
  const dP = Math.hypot(u - PRIMROSE.cu, v - PRIMROSE.cv);
  if (dP < PRIMROSE.r) return ((u + v) & 3) === 0 ? ARBRE : HERBE;

  for (const p of LIEUX_LONDRES) {
    if (p.sol && Math.hypot(u - p.u, v - p.v) < p.r) return p.sol;
  }

  const voie = solDesVoies(BANDES, u, v, BITUME, TROTTOIR);
  if (voie !== null) return voie;

  const t = trameDeLondres(u, v);
  const c = Math.cos(t.ang), s = Math.sin(t.ang);
  const du = u - t.cu, dv = v - t.cv;
  const a = du * c - dv * s, b = du * s + dv * c;
  const dRue = Math.min(
    Math.abs(a - Math.round(a / t.pu) * t.pu),
    Math.abs(b - Math.round(b / t.pv) * t.pv),
  );
  if (dRue < t.w) return BITUME;
  if (dRue < t.s) return TROTTOIR;
  return null;
}

// Les emprises des monuments : aucune maison ne pousse dans la cour de
// Buckingham ni sous le dôme de St Paul.
const DEBLAIS = [
  [5, 20, 11], [1, 21, 6], [0, 0, 7], [-23, 16, 12], [-20, 15, 4],
  [14, 11, 8], [49, -17, 11], [86, -2, 12], [87, 5, 9], [69, 8, 8],
  [51, -1, 5], [1, -32, 8], [7, -62, 7], [-10, -7, 3],
];

export function lotLondresLibre(x, z) {
  const u = x - LONDRES.x, v = z - LONDRES.z;
  if (Math.hypot(u, v) > LONDRES.r) return false;
  if (distanceTamise(u, v) < LARGEUR_TAMISE + 2.5) return false;
  for (const [du2, dv2, r] of DEBLAIS) {
    if (Math.hypot(u - du2, v - dv2) < r) return false;
  }
  return solLondres(x, z) === null;
}

// --- les maisons -------------------------------------------------------------

function tirageLondres(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const BRIQUES_LONDRES = [BRIQUE, BRIQUE_SOMBRE, BRIQUE_BRUNE];

export function batirColonneLondres(x, z, poser) {
  const u = x - LONDRES.x, v = z - LONDRES.z;
  const t = trameDeLondres(u, v);
  const c = Math.cos(t.ang), s = Math.sin(t.ang);
  const du = u - t.cu, dv = v - t.cv;
  const a = Math.round((du * c - dv * s) / t.pu), b = Math.round((du * s + dv * c) / t.pv);
  const r = tirageLondres(a, b, 731);

  const city = t === TRAMES.city;
  const stuc = t === TRAMES.ouest && u < -18 && v > -14 && r > 0.35;

  // LE JARDIN DE POCHE (v178) : un lot sur huit ne se bâtit pas — un arbre,
  // des fleurs, de l'air. C'est ce qui manquait à la capture de Max : les
  // squares sont l'âme de Londres, pas une exception.
  if (tirageLondres(a, b, 733) < 0.12 && !(city && r > 0.62)) {
    if ((((u * 7 + v * 13) % 23) + 23) % 23 === 0) {
      poser(1, BLOCK.LOG); poser(2, BLOCK.LOG); poser(3, BLOCK.LOG);
      poser(4, ARBRE); poser(5, ARBRE);
    } else if ((((u + v) % 6) + 6) % 6 === 0) {
      poser(1, DECOR_START + ((u * 3 + v * 5) & 3) * 50);
    }
    return;
  }
  // La City : des tours de verre — mais aucune ne dépasse le Shard (310 m),
  // qui reste, comme dans la vraie ville, le sommet de Londres.
  const tour = city && r > 0.62;
  // Les maisons grandissent avec les rues (leçon de v172) : un canyon d'un
  // étage n'est pas une rue, c'est une tranchée.
  const bh = tour ? 14 + Math.floor(r * 20)
    : stuc ? 7 + Math.floor(r * 3)
      : 6 + Math.floor(r * 3);
  const mur = tour ? ACIER
    : stuc ? BLANC
      : BRIQUES_LONDRES[Math.floor(tirageLondres(a, b, 732) * 3) % 3];

  const oE = lotLondresLibre(x + 1, z), oO = lotLondresLibre(x - 1, z);
  const oS = lotLondresLibre(x, z + 1), oN = lotLondresLibre(x, z - 1);
  const dedans = oE && oO && oS && oN;
  const face = (!oE || !oO) ? v : u;

  for (let y = 0; y < bh; y++) {
    if (dedans) { if (y === 0) poser(1, BLOCK.PLANK); continue; }
    if (tour) { poser(y + 1, y % 3 === 2 ? ACIER : VERRE); continue; }
    // la fenêtre à guillotine : un carreau sur deux, encadré de blanc
    const fenetre = y > 0 && y % 2 === 1 && (face & 1) === 1;
    let id = fenetre ? VERRE : mur;
    if (stuc && y === 0) id = CREME;                     // le soubassement à refends
    if (!stuc && !fenetre && y > 0 && y % 2 === 0 && (face & 3) === 2) id = BLANC;
    poser(y + 1, id);
  }
  poser(bh + 1, tour ? ACIER : ARDOISE);
  // les cheminées par paires : la ligne de toits victorienne
  if (!tour && !dedans && (face & 3) === 1) {
    poser(bh + 2, BRIQUE_SOMBRE);
    poser(bh + 3, BRIQUE_SOMBRE);
  }
}

// --- les monuments -----------------------------------------------------------

// Rejouer un monument du catalogue, tourné d'un quart de tour si la géographie
// l'exige : Tower Bridge est modelé le long de l'axe est-ouest, or la Tamise
// coule ici d'ouest en est — le pont doit l'ENJAMBER, pas la longer.
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

function buildPalaisWestminster(poser) {
  // Le palais : 300 m de gothique perpendiculaire le long du fleuve, en
  // pierre d'Anston couleur miel. La tour Victoria au sud (98 m), les
  // pinacles tout du long, Westminster Hall côté rue.
  for (let dv = -4; dv <= 5; dv++) {
    for (let du = -2; du <= 2; du++) {
      for (let y = 1; y <= 5; y++) poser(du, y, dv, y === 5 ? ARDOISE : CREME);
      if ((dv & 1) === 0) { poser(-3, 3, dv, CREME); poser(3, 3, dv, CREME); }
    }
    if ((dv & 1) === 1) { poser(-2, 6, dv, CREME); poser(2, 6, dv, CREME); }  // les pinacles
  }
  // la tour Victoria, au coin sud-ouest — la plus massive
  for (let y = 1; y <= 12; y++) {
    for (const [dx, dz] of [[-2, 5], [-1, 5], [-2, 4], [-1, 4]]) poser(dx, y, dz, CREME);
  }
  poser(-2, 13, 5, OR); poser(-1, 13, 4, OR);
  // Westminster Hall et son toit de plomb
  for (let du = -4; du <= -3; du++) for (let dv = -2; dv <= 2; dv++) {
    for (let y = 1; y <= 3; y++) poser(du, y, dv, PIERRE);
    poser(du, 4, dv, ARDOISE);
  }
}

function buildLondonEye(poser) {
  // 135 m : la grande roue du millénaire, blanche, en porte-à-faux sur la
  // rive sud. La roue tourne dans le plan du fleuve, comme la vraie.
  const R = 20, cy = R + 3;
  for (let a = 0; a < 360; a += 3) {
    const rad = (a * Math.PI) / 180;
    const dv = Math.round(Math.cos(rad) * R), dy = Math.round(Math.sin(rad) * R);
    poser(0, cy + dy, dv, BLANC);
    if (a % 30 === 0) {
      // un rayon sur douze, et sa capsule ovale à l'extérieur
      for (let k = 1; k < R; k += 1) {
        poser(0, cy + Math.round(Math.sin(rad) * k), Math.round(Math.cos(rad) * k), ACIER);
      }
      poser(1, cy + dy, dv, VERRE);
    }
  }
  // le moyeu et les jambes en A, ancrées côté rive
  poser(0, cy, 0, ACIER); poser(1, cy, 0, ACIER);
  for (let k = 0; k <= cy; k++) {
    poser(1, k, Math.round((k / cy) * -6), ACIER);
    poser(1, k, Math.round((k / cy) * 6), ACIER);
  }
}

function buildStPauls(poser) {
  // 111 m : la nef, le grand dôme sur son tambour à colonnes, les deux tours
  // de la façade ouest. Le dôme a sauvé la silhouette de la ville en 1940.
  for (let du = -7; du <= 5; du++) {
    for (let dv = -3; dv <= 3; dv++) {
      for (let y = 1; y <= 5; y++) poser(du, y, dv, y === 5 ? PIERRE : CREME);
    }
  }
  // le transept
  for (let dv = -5; dv <= 5; dv++) for (let du = -2; du <= 0; du++) {
    for (let y = 1; y <= 5; y++) poser(du, y, dv, CREME);
  }
  // le tambour à colonnes, puis le dôme
  for (let y = 6; y <= 9; y++) {
    for (let a = 0; a < 360; a += 20) {
      const rad = (a * Math.PI) / 180;
      poser(Math.round(Math.cos(rad) * 4) - 1, y, Math.round(Math.sin(rad) * 4),
        (a % 40 === 0) ? BLANC : PIERRE);
    }
  }
  for (let dy = 0; dy <= 5; dy++) {
    const r = Math.sqrt(Math.max(0, 25 - dy * dy)) * 0.9;
    for (let a = 0; a < 360; a += 12) {
      const rad = (a * Math.PI) / 180;
      poser(Math.round(Math.cos(rad) * r) - 1, 10 + dy, Math.round(Math.sin(rad) * r), ARDOISE);
    }
  }
  poser(-1, 16, 0, PIERRE); poser(-1, 17, 0, OR);      // la lanterne et sa croix
  // les deux tours ouest
  for (const dv of [-3, 3]) {
    for (let y = 1; y <= 8; y++) poser(-7, y, dv, CREME);
    poser(-7, 9, dv, PIERRE);
  }
}

function buildBuckingham(poser) {
  // La façade est de 1913 : 108 m de pierre de Portland, le balcon central,
  // la cour d'honneur fermée de grilles dorées, et le mémorial Victoria.
  for (let du = -1; du <= 1; du++) {
    for (let dv = -8; dv <= 8; dv++) {
      for (let y = 1; y <= 6; y++) {
        const fenetre = y >= 2 && y <= 5 && (dv & 1) === 1;
        poser(du, y, dv, fenetre && du === 1 ? VERRE : CREME);
      }
      poser(du, 7, dv, PIERRE);
    }
  }
  poser(1, 4, 0, OR);                                   // le balcon du salut
  // les grilles de la cour, et quatre gardes en tunique rouge
  for (let dv = -8; dv <= 8; dv++) poser(5, 1, dv, dv % 3 === 0 ? OR : NOIR);
  for (const dv of [-5, -2, 2, 5]) {
    poser(3, 1, dv, ROUGE); poser(3, 2, dv, NOIR);      // tunique, puis bonnet d'ourson
  }
  // le mémorial Victoria, dans l'axe du Mall
  for (let y = 1; y <= 4; y++) poser(8, y, 0, BLANC);
  poser(8, 5, 0, OR);
}

function buildTourDeLondres(poser) {
  // La Tour Blanche de Guillaume le Conquérant (1078), ses quatre tourelles,
  // et l'enceinte intérieure sur sa pelouse.
  for (let du = -3; du <= 3; du++) for (let dv = -3; dv <= 3; dv++) {
    const bord = Math.abs(du) === 3 || Math.abs(dv) === 3;
    for (let y = 1; y <= 8; y++) {
      if (bord || y === 8) poser(du, y, dv, y % 3 === 0 ? PIERRE : CREME);
    }
  }
  for (const [du, dv] of [[-3, -3], [-3, 3], [3, -3], [3, 3]]) {
    for (let y = 9; y <= 11; y++) poser(du, y, dv, CREME);
    poser(du, 12, dv, ARDOISE);
  }
  // l'enceinte et ses tours d'angle
  for (let k = -8; k <= 8; k++) {
    for (const [du, dv] of [[k, -8], [k, 8], [-8, k], [8, k]]) {
      poser(du, 1, dv, PIERRE); poser(du, 2, dv, PIERRE);
      if ((k & 3) === 0) poser(du, 3, dv, PIERRE);
    }
  }
}

function buildTrafalgar(poser) {
  // La colonne Nelson : 52 m de granit, l'amiral au sommet, les quatre lions
  // de bronze de Landseer, les deux fontaines.
  for (let y = 1; y <= 3; y++) for (let du = -1; du <= 1; du++) {
    for (let dv = -1; dv <= 1; dv++) poser(du, y, dv, PIERRE);
  }
  for (let y = 4; y <= 16; y++) poser(0, y, 0, PIERRE);
  poser(0, 17, 0, NOIR);                                // l'amiral
  for (const [du, dv] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) poser(du, 4, dv, NOIR);
  for (const dv of [-4, 4]) {
    for (let du = -1; du <= 1; du++) poser(du, 1, dv + (du === 0 ? 0 : 0), EAU);
  }
}

function buildShard(poser) {
  // 310 m : la plus haute flèche d'Europe occidentale à son inauguration, une
  // pyramide de verre qui s'effile jusqu'à un sommet volontairement inachevé.
  const H = 100;
  for (let y = 1; y <= H; y++) {
    const r = Math.max(0.6, 5 * (1 - y / H));
    const n = Math.max(1, Math.round(r));
    for (let du = -n; du <= n; du++) for (let dv = -n; dv <= n; dv++) {
      if (Math.abs(du) === n || Math.abs(dv) === n) {
        poser(du, y, dv, y % 7 === 0 ? ACIER : VERRE);
      }
    }
  }
}

function buildGlobe(poser) {
  // Le théâtre du Globe, reconstruit en 1997 à 200 m de l'original : un
  // polygone blanc à colombages, le toit de chaume en anneau, la scène à ciel
  // ouvert.
  for (let a = 0; a < 360; a += 15) {
    const rad = (a * Math.PI) / 180;
    const du = Math.round(Math.cos(rad) * 3), dv = Math.round(Math.sin(rad) * 3);
    for (let y = 1; y <= 3; y++) poser(du, y, dv, y === 2 ? BLOCK.PLANK : BLANC);
    poser(du, 4, dv, BLOCK.SAND);                       // le chaume
  }
  poser(0, 1, 1, BLOCK.PLANK); poser(0, 1, 0, BLOCK.PLANK);  // la scène
}

// Le mobilier qui signe la ville : les bus impériaux sur Oxford Street, le
// Strand et Whitehall, les cabines K2 aux carrefours, les taxis noirs.
function buildMobilier(poser) {
  const BUS = [[-30, -21], [-12, -19], [10, -4], [2, 8], [30, -8]];
  for (const [du, dv] of BUS) {
    for (let k = 0; k <= 2; k++) {
      poser(du + k, 1, dv, ROUGE);
      poser(du + k, 2, dv, k === 1 ? VERRE : ROUGE);
    }
  }
  const CABINES = [[-3, 1], [-24, -20], [44, -13], [-11, -6], [7, -12], [63, -5]];
  for (const [du, dv] of CABINES) {
    poser(du, 1, dv, ROUGE); poser(du, 2, dv, VERRE); poser(du, 3, dv, ROUGE);
  }
  const TAXIS = [[-6, 3], [20, -7], [-25, -18], [50, -8]];
  for (const [du, dv] of TAXIS) { poser(du, 1, dv, NOIR); poser(du + 1, 1, dv, NOIR); }
}

// La liste que world.js déroule : chaque monument à ses coordonnées.
export const MONUMENTS_LONDRES = [
  { nom: 'Big Ben', u: 8, v: 18, box: 26, build: depuisCatalogue('big-ben') },
  { nom: 'Palais de Westminster', u: 4, v: 21, box: 9, build: buildPalaisWestminster },
  { nom: 'Tower Bridge', u: 87, v: 5, box: 34, build: depuisCatalogue('tower-bridge', true) },
  { nom: 'London Eye', u: 14, v: 11, box: 24, build: buildLondonEye },
  { nom: 'Cathédrale St Paul', u: 49, v: -17, box: 10, build: buildStPauls },
  { nom: 'Buckingham Palace', u: -23, v: 16, box: 11, build: buildBuckingham },
  { nom: 'Tour de Londres', u: 86, v: -2, box: 10, build: buildTourDeLondres },
  { nom: 'Colonne Nelson', u: 0, v: 0, box: 6, seuil: 0.4, build: buildTrafalgar },
  { nom: 'The Shard', u: 69, v: 8, box: 7, build: buildShard },
  { nom: 'Le Globe', u: 51, v: -1, box: 5, seuil: 0.35, build: buildGlobe },
  { nom: 'Le mobilier de Londres', u: 0, v: 0, box: 70, seuil: 0, build: buildMobilier },
];

// --- la couleur sur la carte -------------------------------------------------

export function couleurCarteLondres(x, z) {
  const u = x - LONDRES.x, v = z - LONDRES.z;
  if (Math.hypot(u, v) > LONDRES.r) return null;
  const sol = solLondres(x, z);
  if (distanceTamise(u, v) < LARGEUR_TAMISE || sol === EAU) return [92, 142, 196];
  if (sol === ARBRE || sol === HERBE) return [96, 156, 92];
  if (sol === MALL_ROUGE) return [176, 92, 80];
  if (sol === BITUME) return [72, 74, 82];
  if (sol === TROTTOIR || sol === PAVE || sol === PIERRE) return [178, 174, 166];
  const t = trameDeLondres(u, v);
  if (t === TRAMES.city) return [148, 158, 170];       // les toits de verre et d'acier
  return [166, 118, 92];                                // la brique, vue du ciel
}
