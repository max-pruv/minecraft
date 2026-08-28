// La Chine.
//
// Une région culturelle entière dans ce qui était une zone morte de la carte,
// entre San Francisco et le Pôle Nord. Tout vient de la fiche de terrain :
//
// La **Grande Muraille** serpente SUR LES CRÊTES — jamais en fond de vallée :
// c'est toute sa logique militaire, et c'est ce qui la rend reconnaissable de
// loin. Cinq blocs de large, un chemin de ronde praticable, un créneau sur
// deux, et une tour de guet à deux étages tous les vingt-cinq blocs.
//
// La **Cité interdite**, compacte, sur son axe sud-nord : la porte au mur
// vermillon coiffée d'un pavillon à toit jaune, la cour dallée de blanc, le
// grand hall sur sa terrasse de marbre, et deux lions de bronze.
//
// Le **village** : des siheyuan — quatre bâtiments gris autour d'une cour,
// la porte rouge au sud-est —, un paifang à l'entrée, des lanternes rouges.
//
// Le **paysage** : les karsts de Guilin, colonnes de pierre coiffées d'herbe
// au bord d'une rivière turquoise avec son radeau de bambou ; des rizières en
// terrasses, marches d'eau bordées de terre ; et une bambouseraie où vivent
// trois pandas — l'habitat avec l'animal, c'est le message.

import { BLOCK, CITY_BLOCK, DECOR_START } from './blocks.js';
import { positionDe } from './mondes.js';

const uni = (c) => DECOR_START + c * 10;

const EAU = BLOCK.WATER;
const HERBE = BLOCK.GRASS;
const TERRE = BLOCK.DIRT;
const PIERRE = BLOCK.STONE;
const ARBRE = BLOCK.LEAVES;
const TIGE = BLOCK.LOG;
const VERMILLON = uni(0);       // les murs rouges
const JAUNE_OR = uni(2);        // les tuiles vernissées impériales
const GRIS = uni(24);           // les toits du village
const GRIS_MUR = BLOCK.STONEBRICK;
const MARBRE = uni(27);
const TURQUOISE = uni(7);       // la rive de la rivière de Guilin
const NOIR = BLOCK.WOOL_BLACK;
const BLANC_PANDA = uni(27);
const OR = BLOCK.GOLD;
const DALLE = CITY_BLOCK.GRANITE;

export const CHINE = { ...positionDe('chine'), r: 70 };

// --- le relief -----------------------------------------------------------------------
//
// Trois bandes, du nord au sud : les crêtes de la muraille, la plaine de la
// Cité et du village, la rivière et ses karsts à l'est, les rizières au
// sud-est sur le flanc d'un coteau.

// La ligne de crête : elle ondule d'ouest en est, et la muraille la suit.
export const creteV = (u) => -34 + Math.round(6 * Math.sin(u / 9) + u * 0.12);
const creteH = (u) => 12 + Math.round(4 * Math.sin(u / 7 + 2));

// La rivière Li : elle descend du nord au sud à l'est de la région, en
// serpentant. uRiviere(v) donne son axe.
export const uRiviere = (v) => 34 + Math.round(5 * Math.sin(v / 11));

// Les karsts : des colonnes quasi verticales, chacune à sa place au bord de
// la rivière. [u, v, rayon, hauteur]
export const KARSTS = [
  [24, -8, 2, 17], [27, 4, 3, 22], [22, 14, 2, 15], [44, -2, 2, 19],
  [46, 10, 3, 24], [41, 20, 2, 16], [25, 26, 2, 18], [47, 30, 2, 14],
];

// Les rizières : un coteau en marches au sud-est.
const RIZ = { u0: 8, u1: 30, v0: 34, v1: 52 };

export function hauteurChine(x, z, h) {
  const u = x - CHINE.x, v = z - CHINE.z;
  const d = Math.hypot(u, v);
  if (d > CHINE.r + 12) return h;
  const marge = Math.min(1, (CHINE.r + 12 - d) / 12);
  const base = 34;

  let cible = base;
  // les crêtes du nord, qui portent la muraille
  const dc = v - creteV(u);
  if (Math.abs(dc) < 14) {
    const m = Math.cos((Math.abs(dc) / 14) * Math.PI * 0.5);
    cible += m * m * creteH(u);
  }
  // la rivière, creusée sous le niveau de l'eau
  const dr = Math.abs(u - uRiviere(v));
  if (v > -20 && dr < 3) cible = base - 5;
  else if (v > -20 && dr < 5) cible = base - 2;
  // les karsts : des tours de terrain quasi verticales
  for (const [ku, kv, kr, kh] of KARSTS) {
    const dk = Math.hypot(u - ku, v - kv);
    if (dk < kr + 1) cible = Math.max(cible, base + (dk <= kr ? kh : Math.round(kh * 0.4)));
  }
  // les rizières : des marches d'un bloc sur le coteau
  if (u >= RIZ.u0 && u <= RIZ.u1 && v >= RIZ.v0 && v <= RIZ.v1) {
    cible = base + Math.max(0, Math.floor((RIZ.v1 - v) / 3));
  }
  return h * (1 - marge) + cible * marge;
}

// Le sol : la rivière et ses rives turquoise, l'eau des rizières, l'herbe des
// sommets de karsts — le reste est laissé au terrain.
export function solChine(x, z) {
  const u = x - CHINE.x, v = z - CHINE.z;
  if (Math.hypot(u, v) > CHINE.r) return null;
  const dr = Math.abs(u - uRiviere(v));
  if (v > -20 && dr < 3) return EAU;
  if (v > -20 && dr < 5) return TURQUOISE;
  if (u >= RIZ.u0 && u <= RIZ.u1 && v >= RIZ.v0 && v <= RIZ.v1) {
    // une marche sur trois est en eau : c'est la rizière inondée
    return ((RIZ.v1 - v) % 3 === 0) ? EAU : HERBE;
  }
  return null;
}

// --- les lieux, pour la carte --------------------------------------------------------

export const LIEUX_CHINE = [
  { name: 'Grande Muraille', x: CHINE.x, z: CHINE.z + creteV(0), r: 6 },
  { name: 'Cité interdite', x: CHINE.x - 6, z: CHINE.z + 2, r: 6 },
  { name: 'Village chinois', x: CHINE.x - 34, z: CHINE.z + 26, r: 6 },
  { name: 'Karsts de Guilin', x: CHINE.x + 36, z: CHINE.z + 8, r: 6 },
  { name: 'Rizières', x: CHINE.x + 19, z: CHINE.z + 42, r: 6 },
  { name: 'Bambouseraie', x: CHINE.x - 14, z: CHINE.z + 40, r: 6 },
];

// --- les monuments -------------------------------------------------------------------

const boite = (poser) => {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
  };
  return { set, bloc };
};

// La Grande Muraille. Le landmark est centré sur (CHINE.x, CHINE.z) et suit
// la crête de son propre chef : pour chaque colonne du tracé, il pose le mur
// SUR le terrain de la crête — dont il connaît la formule, la même que le
// relief. C'est ce qui la fait serpenter sur les sommets.
export function buildMuraille(poser) {
  const base = 34;
  for (let u = -58; u <= 58; u++) {
    const vc = creteV(u);
    const sol = base + creteH(u);              // le sommet de la crête ici
    const tour = ((u + 58) % 25) === 0;
    for (let dv = -2; dv <= 2; dv++) {
      const bord = Math.abs(dv) === 2;
      // le corps du mur : quatre blocs au-dessus de la crête
      for (let y = 0; y <= 3; y++) poser(u, sol + y - 33, vc + dv, GRIS_MUR);
      // le chemin de ronde et ses créneaux, un plein sur deux
      if (bord && (u & 1)) poser(u, sol + 4 - 33, vc + dv, GRIS_MUR);
    }
    if (tour) {
      // une tour de guet : deux étages et un toit en pavillon
      for (let dv = -3; dv <= 3; dv++) {
        for (let du = -2; du <= 2; du++) {
          for (let y = 0; y <= 7; y++) {
            if (Math.abs(du) === 2 || Math.abs(dv) === 3) poser(u + du, sol + y - 33, vc + dv, GRIS_MUR);
          }
        }
      }
      for (let du = -3; du <= 3; du++) for (let dv = -4; dv <= 4; dv++) {
        poser(u + du, sol + 8 - 33, vc + dv, GRIS);
      }
      poser(u, sol + 9 - 33, vc, GRIS);
    }
  }
}

// La Cité interdite, compacte, sur son axe sud-nord : la porte, la cour
// dallée, le grand hall sur sa terrasse de marbre.
export function buildCiteInterdite(poser) {
  const { set, bloc } = boite(poser);
  // la porte Tian'anmen, au sud : mur vermillon, trois arches, pavillon jaune
  bloc(-6, 6, 0, 4, 8, 9, VERMILLON);
  for (const ax of [-4, 0, 4]) for (let y = 0; y <= 2; y++) { set(ax, y, 8, BLOCK.AIR); set(ax, y, 9, BLOCK.AIR); }
  bloc(-5, 5, 5, 5, 8, 9, JAUNE_OR);
  bloc(-3, 3, 6, 6, 8, 9, VERMILLON);
  bloc(-4, 4, 7, 7, 8, 9, JAUNE_OR);
  // les deux lions de bronze devant la porte
  set(-2, 0, 11, OR);
  set(2, 0, 11, OR);
  // la cour dallée de blanc
  bloc(-6, 6, 0, 0, 1, 7, MARBRE);
  // le grand hall, au nord, sur sa terrasse de marbre
  bloc(-7, 7, 0, 1, -8, 0, MARBRE);
  bloc(-5, 5, 2, 5, -6, -2, VERMILLON);
  for (let ax = -4; ax <= 4; ax += 2) { set(ax, 3, -2, BLOCK.AIR); }
  bloc(-6, 6, 6, 6, -7, -1, JAUNE_OR);
  bloc(-4, 4, 7, 7, -6, -2, JAUNE_OR);
  bloc(-2, 2, 8, 8, -5, -3, JAUNE_OR);
}

// Le village : deux siheyuan autour de leurs cours, le paifang à l'entrée,
// et les lanternes rouges suspendues.
export function buildVillageChinois(poser) {
  const { set, bloc } = boite(poser);
  for (const [cu, cv] of [[-5, -4], [5, 5]]) {
    // quatre bâtiments gris autour d'une cour de neuf sur neuf
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        const bord = Math.abs(dx) === 4 || Math.abs(dz) === 4;
        if (!bord) { set(cu + dx, 0, cv + dz, DALLE); continue; }
        for (let y = 0; y <= 2; y++) set(cu + dx, y, cv + dz, GRIS_MUR);
        set(cu + dx, 3, cv + dz, GRIS);
        // les coins retroussés du toit
        if (Math.abs(dx) === 4 && Math.abs(dz) === 4) set(cu + dx, 4, cv + dz, GRIS);
      }
    }
    // la porte rouge, au sud-est, comme le veut la tradition
    for (let y = 0; y <= 1; y++) set(cu + 3, y, cv + 4, BLOCK.AIR);
    set(cu + 3, 2, cv + 4, VERMILLON);
    // une lanterne rouge à la porte
    set(cu + 2, 2, cv + 5, BLOCK.WOOL_RED);
  }
  // le paifang : le portique d'entrée du village
  for (const dx of [-3, 3]) for (let y = 0; y <= 3; y++) set(dx, y, 10, VERMILLON);
  bloc(-4, 4, 4, 4, 10, 10, JAUNE_OR);
  bloc(-2, 2, 5, 5, 10, 10, GRIS);
  // les lanternes du chemin
  for (const dz of [12, 14]) { set(-2, 2, dz, BLOCK.WOOL_RED); set(2, 2, dz, BLOCK.WOOL_RED); }
}

// Les karsts sont dans le terrain ; ici, le radeau de bambou sur la rivière,
// et l'herbe qui coiffe chaque colonne.
export function buildGuilin(poser) {
  const { set } = boite(poser);
  // le radeau de bambou, amarré au bord
  for (let dx = -1; dx <= 2; dx++) { set(dx, -1, 0, TIGE); set(dx, -1, 1, TIGE); }
  set(2, 0, 0, BLOCK.WOOL_YELLOW);           // le chapeau du batelier
}

// La bambouseraie et ses trois pandas : des tiges vertes serrées, et les
// habitants noir et blanc qui les mangent.
export function buildPandas(poser) {
  const { set, bloc } = boite(poser);
  // la bambouseraie : des tiges hautes et fines, en quinconce
  for (let dx = -8; dx <= 8; dx += 2) {
    for (let dz = -6; dz <= 6; dz += 2) {
      if ((dx + dz) % 4 === 0) continue;                    // des clairières
      const hh = 4 + ((dx * 3 + dz * 5) & 3);
      for (let y = 0; y <= hh; y++) set(dx, y, dz, y === hh ? ARBRE : TIGE);
    }
  }
  // trois pandas : corps blanc, tête blanche aux oreilles noires, pattes noires
  for (const [pu, pv, face] of [[-4, 0, 1], [2, -2, -1], [5, 4, 1]]) {
    set(pu, 0, pv, NOIR); set(pu + 1, 0, pv, NOIR);          // les pattes
    set(pu, 1, pv, BLANC_PANDA); set(pu + 1, 1, pv, BLANC_PANDA); // le corps
    set(pu + (face > 0 ? 2 : -1), 1, pv, BLANC_PANDA);       // la tête
    set(pu + (face > 0 ? 2 : -1), 2, pv, NOIR);              // les oreilles
  }
}

// Ce que la carte peint : la rivière turquoise et les rizières se voient du
// ciel, le reste est du terrain ordinaire.
export function couleurCarteChine(x, z) {
  const u = x - CHINE.x, v = z - CHINE.z;
  if (Math.hypot(u, v) > CHINE.r) return null;
  const sol = solChine(x, z);
  if (sol === TURQUOISE) return [80, 180, 180];
  if (sol === EAU) return null;
  if (sol === HERBE) return [120, 180, 90];
  return null;
}
