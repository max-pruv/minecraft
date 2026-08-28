// San Francisco.
//
// Il n'y avait ni collines, ni côte, ni plan : un disque de maisons pastel
// posé sur un bruit de terrain qui n'avait rien de San Francisco. Or cette
// ville-là se reconnaît à trois choses, et à ces trois-là seulement.
//
// D'abord la **presqu'île** : l'océan à l'ouest, la passe du Golden Gate au
// nord-ouest, la baie à l'est. La ville s'arrête net sur trois côtés.
//
// Ensuite les **collines**. Elles ne sont pas un décor, elles sont la ville :
// Twin Peaks à deux cent quatre-vingts mètres au milieu, Nob Hill et Russian
// Hill au-dessus du centre, Telegraph Hill sur la baie, Bernal Heights au sud.
// C'est d'elles que viennent les rues qui montent tout droit et les vues qui
// s'ouvrent d'un coup.
//
// Enfin **Market Street**, et le fait que la ville a deux quadrillages qui ne
// sont pas parallèles. Celui du nord-est, hérité de 1847, est tourné de vingt
// degrés ; celui de l'ouest est orienté nord-sud. Market Street est la couture
// entre les deux — et sur un plan, c'est la première chose qu'on voit.
//
// Une échelle unique, comme à Manhattan et à Paris : neuf blocs par kilomètre,
// et un point d'ancrage, le Ferry Building, au pied de Market. Chaque lieu est
// donné par son écart réel à lui.

import { BLOCK, CITY_BLOCK, DECOR_START } from './blocks.js';
import { rangerVoies, solDesVoies } from './voies.js';
import { positionDe } from './mondes.js';

const uni = (c) => DECOR_START + c * 10;

const BITUME = CITY_BLOCK.ASPHALT;
const TROTTOIR = CITY_BLOCK.SIDEWALK;
const PAVE = CITY_BLOCK.GRANITE;
const HERBE = BLOCK.GRASS;
const SABLE = BLOCK.SAND;
const EAU = BLOCK.WATER;
const ARBRE = BLOCK.LEAVES;
const BLANC = uni(27);
const CREME = uni(28);
const ROUGE_PONT = uni(0);
const ACIER = uni(24);
const ANTHRACITE = uni(25);
const VERRE = BLOCK.GLASS;
const BETON = BLOCK.STONEBRICK;
const OR = BLOCK.GOLD;
const DORE = uni(22);        // l'herbe sèche des Marin Headlands
const OLIVE = uni(21);
const MARRON = uni(17);      // les otaries
const GRIS_QUAI = uni(23);
const VERT_TOIT = uni(5);    // les toits de pagode de Chinatown

export const SF = { ...positionDe('sf'), r: 66 };

const BLOCS_PAR_KM = 9;
// Le Ferry Building : le pied de Market Street, et le point d'où tout se mesure.
const FERRY = { u: 45, v: -4 };
const de = (dx, dz) => [
  Math.round(FERRY.u + dx * BLOCS_PAR_KM),
  Math.round(FERRY.v + dz * BLOCS_PAR_KM),
];

// --- la presqu'île ------------------------------------------------------------------

// Les trois rives, relevées point par point. Au sud il n'y en a pas : la
// presqu'île continue vers Daly City, et la campagne du monde reprend la main.
const RIVE_OUEST = [   // le Pacifique, de Lands End à la plage
  [-41, -28], [-44, -20], [-46, -8], [-46, 6], [-45, 20], [-43, 34], [-41, 44],
];
const RIVE_NORD = [    // la passe du Golden Gate, puis la baie
  [-44, -26], [-30, -32], [-21, -36], [-10, -33], [0, -30], [12, -28], [26, -26],
  [36, -24], [45, -20],
];
const RIVE_EST = [     // la baie, du Fisherman's Wharf à Hunters Point
  [43, -24], [47, -14], [49, -2], [50, 10], [46, 22], [40, 32], [34, 44],
];

// Interpolation sur une table triée : la première coordonnée est l'abscisse
// dont on cherche l'ordonnée.
function long(table, t) {
  if (t <= table[0][0]) return table[0][1];
  const fin = table[table.length - 1];
  if (t >= fin[0]) return fin[1];
  for (let i = 0; i < table.length - 1; i++) {
    const [a, va] = table[i], [b, vb] = table[i + 1];
    if (t >= a && t <= b) return va + (vb - va) * ((t - a) / (b - a));
  }
  return fin[1];
}
// Les rives ouest et est sont données par v → u ; la rive nord par u → v.
const bordOuest = (v) => long(RIVE_OUEST.map(([u, vv]) => [vv, u]), v);
const bordEst = (v) => long(RIVE_EST.map(([u, vv]) => [vv, u]), v);
const bordNord = (u) => long(RIVE_NORD, u);

export function surTerreSF(x, z) {
  const u = x - SF.x, v = z - SF.z;
  if (Math.hypot(u, v) > SF.r) return false;
  if (v < bordNord(u)) return false;
  if (u < bordOuest(v) || u > bordEst(v)) return false;
  return true;
}

// Distance à la mer la plus proche, négative sur la terre ferme.
function versMer(u, v) {
  return -Math.min(v - bordNord(u), u - bordOuest(v), bordEst(v) - u);
}

// Les Marin Headlands : les collines dorées et vides de l'autre côté du
// détroit. Sans elles, le Golden Gate ne menait nulle part — et c'est bien le
// détroit qu'il enjambe, pas le large. Positif dedans, à la manière d'une
// ellipse : 1 au cœur, 0 au rivage.
const MARIN = { u: -22, v: -52, ru: 12, rv: 7 };
const versMarin = (u, v) =>
  1 - ((u - MARIN.u) / MARIN.ru) ** 2 - ((v - MARIN.v) / MARIN.rv) ** 2;
// Le générateur ne donne un sol de ville qu'aux colonnes de la ville : les
// Headlands doivent en être, sinon leur herbe sèche reste l'herbe de la
// campagne — vérifié : des collines vertes, et la fiche dit dorées.
export const surMarin = (x, z) => versMarin(x - SF.x, z - SF.z) > 0;

// --- les collines -----------------------------------------------------------------
//
// Chacune à sa hauteur réelle, comptée en blocs de dix mètres. Twin Peaks fait
// deux cent quatre-vingts mètres : vingt-huit blocs au-dessus de la ville, et
// l'on voit tout depuis là-haut.

export const COLLINES = [
  { nom: 'Twin Peaks', dx: -5.6, dz: 2.2, r: 13, h: 28 },
  { nom: 'Mont Sutro', dx: -4.9, dz: 1.2, r: 8, h: 24 },
  { nom: 'Mont Davidson', dx: -5.4, dz: 4.2, r: 10, h: 26 },
  { nom: 'Buena Vista', dx: -5.0, dz: 1.2, r: 6, h: 16 },
  { nom: 'Corona Heights', dx: -4.4, dz: 1.5, r: 5, h: 14 },
  { nom: 'Lone Mountain', dx: -5.9, dz: -0.3, r: 6, h: 13 },
  { nom: 'Pacific Heights', dx: -2.8, dz: -1.1, r: 8, h: 11 },
  { nom: 'Nob Hill', dx: -1.3, dz: -0.8, r: 6, h: 10 },
  { nom: 'Russian Hill', dx: -1.7, dz: -1.5, r: 6, h: 9 },
  { nom: 'Telegraph Hill', dx: -0.6, dz: -1.3, r: 5, h: 9 },
  { nom: 'Potrero Hill', dx: -0.6, dz: 2.6, r: 7, h: 9 },
  { nom: 'Bernal Heights', dx: -2.4, dz: 4.2, r: 7, h: 13 },
  { nom: 'le Presidio', dx: -6.5, dz: -2.6, r: 9, h: 12 },
].map((c) => { const [u, v] = de(c.dx, c.dz); return { ...c, u, v }; });

// La hauteur du terrain. La ville est posée au niveau de la mer et ses collines
// se dressent dessus ; hors de la presqu'île, on descend dans l'eau.
export function hauteurSF(x, z, h, base) {
  const u = x - SF.x, v = z - SF.z;
  const d = Math.hypot(u, v);
  if (d > SF.r + 14) return h;
  const marge = Math.min(1, (SF.r + 14 - d) / 14);

  const mer = versMer(u, v);
  const marin = versMarin(u, v);
  let cible;
  if (marin > 0) {
    // les Marin Headlands : une rive basse qui monte vite en collines rondes
    cible = base - 2 + Math.min(1, marin * 2) * 8;
  } else if (mer >= 0) {
    // l'eau : une berge courte, puis le fond
    cible = mer < 2 ? base - 1 - mer : Math.max(20, 26 - Math.min(6, mer - 2));
  } else {
    cible = base;
    for (const c of COLLINES) {
      const dc = Math.hypot(u - c.u, v - c.v);
      if (dc >= c.r) continue;
      const m = Math.cos((dc / c.r) * Math.PI * 0.5);
      cible += m * m * c.h;
    }
  }
  return h * (1 - marge) + cible * marge;
}

// --- les lieux ----------------------------------------------------------------------

const L = (nom, dx, dz, reste = {}) => {
  const [u, v] = de(dx, dz);
  return { nom, u, v, ...reste };
};

export const LIEUX_SF = [
  L('Ferry Building', 0, 0),
  L('Union Square', -0.9, -0.2, { r: 2.5, sol: PAVE }),
  L('Chinatown', -1.0, -0.6, { r: 3 }),
  L('North Beach', -1.2, -1.6, { r: 3 }),
  L('Fisherman\'s Wharf', -1.4, -2.1, { r: 3, sol: PAVE }),
  L('Nob Hill', -1.3, -0.8, { r: 3 }),
  L('Russian Hill', -1.7, -1.5, { r: 3 }),
  L('Civic Center', -2.2, 0.5, { r: 3, sol: PAVE }),
  L('Alamo Square', -4.2, 0.6, { ru: 3, rv: 2.5, jardin: true }),
  L('Haight-Ashbury', -5.2, 0.9, { r: 3 }),
  L('Castro', -4.6, 1.7, { r: 3 }),
  L('Mission', -3.4, 1.9, { r: 4 }),
  L('Twin Peaks', -5.6, 2.2, { r: 4 }),
  L('Golden Gate Park', -7.5, 0.4, { ru: 20, rv: 4.5, jardin: true }),
  L('Le Presidio', -6.5, -2.6, { ru: 8, rv: 6, jardin: true }),
  L('Ocean Beach', -10, 1, { r: 4 }),
  L('Potrero Hill', -0.6, 2.6, { r: 3 }),
  L('Bernal Heights', -2.4, 4.2, { r: 3 }),
  L('Sunset', -8, 2.4, { r: 4 }),
  L('Richmond', -8, -0.6, { r: 4 }),
];

const lieu = (nom) => LIEUX_SF.find((p) => p.nom === nom);

export const lieuxDeSF = () => LIEUX_SF
  .filter((p) => p.r || p.jardin)
  .map((p) => ({ name: p.nom, x: SF.x + p.u, z: SF.z + p.v, r: 6 }));

// --- les deux quadrillages et Market Street -------------------------------------------
//
// Le quadrillage du nord-est date de 1847 et suit la rive de l'époque : il est
// tourné d'environ vingt degrés. Celui de l'ouest, tracé plus tard, est orienté
// nord-sud. Market Street file entre les deux, et ne s'aligne sur aucun — c'est
// pour cela qu'elle coupe des angles aigus partout, et que ses carrefours sont
// des places en triangle.

const MARKET = [de(0, 0), de(-2.2, 0.7), de(-4.2, 1.4), de(-5.4, 2.0)];

const TRAMES = {
  // le centre, la Chine, North Beach : la trame de 1847, en biais
  nord: { ang: -0.36, pu: 5, pv: 5, cu: FERRY.u - 10, cv: FERRY.v - 10, w: 0.6, s: 1.0 },
  // South of Market : mêmes angles, mais des îlots quatre fois plus grands —
  // c'est ce qui saute aux yeux sur un plan, et ce qui a fait de SoMa un
  // quartier d'entrepôts puis de bureaux.
  soma: { ang: -0.36, pu: 9, pv: 7, cu: FERRY.u - 6, cv: FERRY.v + 8, w: 0.6, s: 1.0 },
  // tout l'ouest : la Mission, le Castro, le Sunset, le Richmond — nord-sud
  ouest: { ang: 0, pu: 6, pv: 6, cu: 0, cv: 0, w: 0.55, s: 0.95 },
};

// De quel côté de Market est-on ? Le produit vectoriel avec le segment le plus
// proche suffit, et il donne aussi la distance à l'axe.
function versMarket(u, v) {
  let mieux = { d: 1e9, cote: 1 };
  for (let i = 0; i < MARKET.length - 1; i++) {
    const [ax, az] = MARKET[i], [bx, bz] = MARKET[i + 1];
    const dx = bx - ax, dz = bz - az;
    const l2 = dx * dx + dz * dz;
    let t = ((u - ax) * dx + (v - az) * dz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + dx * t, pz = az + dz * t;
    const d = Math.hypot(u - px, v - pz);
    if (d < mieux.d) mieux = { d, cote: Math.sign((u - ax) * dz - (v - az) * dx) || 1 };
  }
  return mieux;
}

function trameDe(u, v) {
  // à l'ouest de Van Ness, la trame nord-sud gouverne toute la ville
  if (u < FERRY.u - 26) return TRAMES.ouest;
  const m = versMarket(u, v);
  if (m.d > 26) return TRAMES.ouest;
  return m.cote < 0 ? TRAMES.nord : TRAMES.soma;
}

// Les voies qui portent un nom. Market d'abord — c'est l'épine dorsale — puis
// celles qu'on cite quand on décrit la ville.
const VOIES = [
  { nom: 'Market Street', l: 1.4, t: 0.5, pts: MARKET.concat([de(-6.2, 2.4)]) },
  { nom: 'The Embarcadero', l: 1.0, pts: [de(-1.5, -2.2), de(-0.4, -1.2), de(0.2, -0.2), de(0.4, 1.2), de(0.2, 2.4)] },
  { nom: 'Columbus Avenue', l: 0.9, pts: [de(-0.4, -0.5), de(-1.0, -1.3), de(-1.5, -2.0)] },
  { nom: 'Van Ness Avenue', l: 1.0, pts: [de(-2.6, -2.2), de(-2.5, 0.2), de(-2.4, 2.0)] },
  { nom: 'Geary Boulevard', l: 0.9, pts: [de(-1.0, -0.3), de(-4.0, -0.4), de(-8.0, -0.5), de(-10, -0.5)] },
  { nom: 'Divisadero Street', l: 0.7, pts: [de(-4.6, -2.0), de(-4.7, 0.4), de(-4.7, 2.2)] },
  { nom: 'Mission Street', l: 0.9, pts: [de(-1.6, 0.6), de(-3.0, 1.6), de(-3.6, 3.4), de(-3.8, 4.6)] },
  { nom: 'Valencia Street', l: 0.7, pts: [de(-3.2, 1.4), de(-3.4, 3.6)] },
  { nom: 'Lombard Street', l: 0.7, pts: [de(-2.8, -2.0), de(-1.7, -1.6), de(-0.6, -1.5)] },
  { nom: 'Fulton Street', l: 0.7, pts: [de(-3.0, 0.2), de(-6.0, 0.1), de(-9.6, 0.0)] },
  { nom: 'Lincoln Way', l: 0.7, pts: [de(-5.6, 0.9), de(-9.6, 0.9)] },
  { nom: 'Great Highway', l: 0.8, pts: [de(-10.1, -0.6), de(-10.2, 1.6), de(-10.0, 3.4)] },
  { nom: '19e Avenue', l: 0.8, pts: [de(-7.6, -0.8), de(-7.7, 1.6), de(-7.8, 4.2)] },
  { nom: 'Third Street', l: 0.8, pts: [de(-0.2, 0.8), de(0.0, 2.6), de(-0.4, 4.4)] },
];

const BANDES = rangerVoies(VOIES);

// --- le sol ---------------------------------------------------------------------------

export function solSF(x, z) {
  const u0 = x - SF.x, v0 = z - SF.z;
  // Les Marin Headlands : de l'herbe sèche dorée, quelques touffes d'olive,
  // et rien d'autre — pas de rues, pas de maisons, comme les vraies.
  if (versMarin(u0, v0) > 0) return ((u0 * 3 + v0) % 5 === 0) ? OLIVE : DORE;
  if (!surTerreSF(x, z)) return null;
  const u = u0, v = v0;

  // la plage, tout le long du Pacifique
  if (u - bordOuest(v) < 2.5) return SABLE;
  // les quais de la baie
  if (bordEst(v) - u < 2 || v - bordNord(u) < 2) return PAVE;

  // les parcs et les places : ils passent avant les rues.
  for (const p of LIEUX_SF) {
    if (p.jardin) {
      if (((u - p.u) / (p.ru * BLOCS_PAR_KM / 9)) ** 2 + ((v - p.v) / (p.rv * BLOCS_PAR_KM / 9)) ** 2 < 1) {
        if (Math.abs(v - p.v) < 0.6) return TROTTOIR;         // l'allée centrale
        // les deux lacs du Golden Gate Park, et les bosquets du Presidio
        if (p.nom === 'Golden Gate Park' && ((u - (p.u - 8)) ** 2 / 9 + (v - p.v) ** 2 / 2) < 1) return EAU;
        return ((u * 3 + v * 5) % 7 === 0) ? ARBRE : HERBE;
      }
      continue;
    }
    if (!p.sol) continue;
    if (Math.hypot(u - p.u, v - p.v) < p.r) return p.sol;
  }

  const voie = solDesVoies(BANDES, u, v, BITUME, TROTTOIR);
  if (voie !== null) return voie;

  const t = trameDe(u, v);
  const c = Math.cos(t.ang), s = Math.sin(t.ang);
  const du = u - t.cu, dv = v - t.cv;
  const a = du * c - dv * s, b = du * s + dv * c;
  const d = Math.min(
    Math.abs(a - Math.round(a / t.pu) * t.pu),
    Math.abs(b - Math.round(b / t.pv) * t.pv),
  );
  if (d < t.w) return BITUME;
  if (d < t.s) return TROTTOIR;
  return null;
}

// Un lot est bâtissable s'il n'est ni rue, ni parc, ni plage, ni trop près de
// l'eau — et pas sur le sommet de Twin Peaks, qui reste sauvage comme le vrai.
export function lotSFLibre(x, z) {
  if (!surTerreSF(x, z)) return false;
  const u = x - SF.x, v = z - SF.z;
  if (versMer(u, v) > -2) return false;
  for (const c of COLLINES) {
    if (c.h >= 24 && Math.hypot(u - c.u, v - c.v) < c.r * 0.5) return false;
  }
  return solSF(x, z) === null;
}

// --- les maisons, colonne par colonne ---------------------------------------------------
//
// Comme à Manhattan, et pour la même raison : les deux quadrillages n'ont ni le
// même pas ni le même angle, et aucune grille carrée posée par-dessus ne tombe
// juste. Un lot dessiné sur sa propre trame se retrouvait à cheval sur une rue
// — et le générateur, qui refuse de bâtir sur une chaussée, ne bâtissait alors
// plus rien du tout : tout l'ouest de la ville restait en herbe.

const PASTELS_MAISONS = [15, 9, 29, 28, 16, 3, 4, 7, 19, 20].map(uni);

function tirageSF(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// L'îlot auquel appartient ce point, dans le repère de sa trame.
function ilotSF(u, v) {
  const t = trameDe(u, v);
  const c = Math.cos(t.ang), s = Math.sin(t.ang);
  const du = u - t.cu, dv = v - t.cv;
  return {
    a: Math.round((du * c - dv * s) / t.pu),
    b: Math.round((du * s + dv * c) / t.pv),
  };
}

// Combien d'étages ? Le centre des affaires monte, le reste est une ville basse
// de maisons de trois étages — c'est ce contraste qui fait la silhouette de San
// Francisco vue depuis la baie.
function hauteurSFQuartier(u, v, t) {
  const centre = u > FERRY.u - 16 && v > FERRY.v - 12 && v < FERRY.v + 8;
  if (centre) return 12 + Math.floor(t * 22);
  const soma = u > FERRY.u - 24 && v > FERRY.v + 6 && v < FERRY.v + 22;
  if (soma) return 5 + Math.floor(t * 7);
  return 3 + Math.floor(t * 4);
}

// Bâtit la colonne. `poser(dy, id)` place un bloc dy au-dessus du sol.
export function batirColonneSF(x, z, poser) {
  const u = x - SF.x, v = z - SF.z;
  const lot = ilotSF(u, v);
  const t = tirageSF(lot.a, lot.b, 911);
  const bh = hauteurSFQuartier(u, v, t);
  const mur = PASTELS_MAISONS[Math.floor(tirageSF(lot.a, lot.b, 912) * PASTELS_MAISONS.length) % PASTELS_MAISONS.length];
  const tour = bh >= 12;

  const oE = lotSFLibre(x + 1, z), oO = lotSFLibre(x - 1, z);
  const oS = lotSFLibre(x, z + 1), oN = lotSFLibre(x, z - 1);
  const dedans = oE && oO && oS && oN;

  // Les fenêtres suivent la façade : le long d'un mur est-ouest c'est v qui les
  // égrène, le long d'un mur nord-sud c'est u.
  const face = (!oE || !oO) ? v : u;
  for (let y = 0; y < bh; y++) {
    if (dedans) { if (y === 0) poser(1, BLOCK.PLANK); continue; }
    const fenetre = y > 0 && y % 3 !== 0 && (face & 1) === 1;
    poser(y + 1, fenetre ? VERRE : (tour ? (y % 4 === 0 ? BETON : VERRE) : mur));
  }
  // La corniche blanche des victoriennes, et le bow-window sur la rue : deux
  // détails, mais ce sont eux qu'on reconnaît sur les cartes postales.
  poser(bh + 1, tour ? BETON : BLANC);
  if (!tour && !dedans && (face & 3) === 1) {
    poser(2, BLANC); poser(3, BLANC);
  }
}

// --- ce que la carte doit peindre ------------------------------------------------------

const VERT_PARC = [96, 156, 84];
const VERT_BOIS = [70, 130, 68];
const GRIS_RUE = [64, 66, 72];
const BEIGE_PLACE = [212, 204, 188];
const SABLE_PLAGE = [232, 216, 170];

export function couleurCarteSF(x, z) {
  const u = x - SF.x, v = z - SF.z;
  if (u < -SF.r || u > SF.r || v < -SF.r || v > SF.r) return null;
  const sol = solSF(x, z);
  if (sol === null) {
    if (!surTerreSF(x, z)) return null;      // à la mer de décider
    // un pâté de maisons : plus la colline est haute, plus la teinte est claire
    let hh = 0;
    for (const c of COLLINES) {
      const d = Math.hypot(u - c.u, v - c.v);
      if (d < c.r) { const m = Math.cos((d / c.r) * Math.PI * 0.5); hh += m * m * c.h; }
    }
    const t = Math.min(1, hh / 28);
    return [150 + t * 70, 145 + t * 65, 140 + t * 60];
  }
  if (sol === EAU) return null;
  if (sol === DORE || sol === OLIVE) return [178, 162, 112];   // les Headlands
  if (sol === SABLE) return SABLE_PLAGE;
  if (sol === ARBRE) return VERT_BOIS;
  if (sol === HERBE) return VERT_PARC;
  if (sol === PAVE) return BEIGE_PLACE;
  return GRIS_RUE;
}

// --- les monuments ----------------------------------------------------------------------

export const MONUMENTS_SF = [
  { nom: 'Transamerica Pyramid', dx: -0.5, dz: -0.5, box: 6 },
  { nom: 'Coit Tower', dx: -0.6, dz: -1.35, box: 5 },
  { nom: 'Sutro Tower', dx: -5.5, dz: 2.0, box: 8 },
  { nom: 'Ferry Building', dx: 0, dz: 0, box: 9 },
  { nom: 'Painted Ladies', dx: -4.3, dz: 0.75, box: 10 },
  { nom: 'Palais des Beaux-Arts', dx: -4.6, dz: -2.5, box: 10 },
  { nom: 'Alcatraz', dx: -1.2, dz: -3.5, box: 9 },
  // Les trois icônes que les enfants cherchent — et que les reconstitutions
  // oublient presque toujours (fiche de terrain).
  // Seuil 0,25 : au zoom des quartiers (0,3), leurs pastilles chassaient le
  // nom de Chinatown — vu au premier passage du scénario des destinations.
  { nom: 'Pier 39', dx: -1.3, dz: -2.45, box: 6, seuil: 0.25, waterBase: true },
  { nom: 'Lombard Street', dx: -1.45, dz: -1.55, box: 5, seuil: 0.25 },
  { nom: 'Dragon Gate', dx: -1.0, dz: -0.55, box: 5, seuil: 0.25 },
].map((m) => { const [u, v] = de(m.dx, m.dz); return { ...m, u, v }; });

const boite = (poser) => {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
  };
  return { set, bloc };
};

// La Transamerica Pyramid : une flèche de quarante-huit étages qui s'affine sur
// toute sa hauteur, avec ses deux ailerons. Aucun autre gratte-ciel ne lui
// ressemble, et c'est elle qu'on cherche sur une photo de la ville.
export function buildTransamerica(poser) {
  const { set } = boite(poser);
  const H = 40;
  for (let y = 0; y < H; y++) {
    const r = Math.max(0, Math.round(5 - (y / H) * 5));
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r && y > 0) continue;
        set(dx, y, dz, y % 3 === 0 ? CREME : VERRE);
      }
    }
  }
  for (let k = 0; k <= 6; k++) set(0, H + k, 0, ACIER);
  // les deux ailerons, à mi-hauteur
  for (let y = 14; y < 30; y++) {
    for (const dz of [-3, 3]) set(0, y, dz, CREME);
  }
}

// Coit Tower : une colonne blanche cannelée au sommet de Telegraph Hill.
export function buildCoit(poser) {
  const { set } = boite(poser);
  for (let y = 0; y <= 20; y++) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.hypot(dx, dz) > 2.4) continue;
        set(dx, y, dz, (dx + dz) % 2 === 0 ? BLANC : CREME);
      }
    }
  }
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dx, dz) <= 3.2) set(dx, 21, dz, BLANC);
  }
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) if (Math.hypot(dx, dz) > 1.2 && Math.hypot(dx, dz) <= 2.4) set(dx, 22, dz, VERRE);
  }
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.hypot(dx, dz) <= 2.4) set(dx, 23, dz, BLANC);
}

// Sutro Tower : trois pieds, trois mâts rouges et blancs, et les barres qui les
// relient. Elle dépasse tout, on la voit de la moitié de la ville, et les
// enfants la prennent pour un vaisseau.
// Vingt-six blocs et pas quarante : posée sur Twin Peaks, à soixante et un, une
// tour de quarante aurait dépassé le plafond du monde et se serait retrouvée
// décapitée sans que rien ne le dise.
export function buildSutro(poser) {
  const { set } = boite(poser);
  const pieds = [[0, -4], [-4, 3], [4, 3]];
  const H = 26;
  for (const [dx, dz] of pieds) {
    for (let y = 0; y <= H; y++) {
      const t = y / H;
      const x = Math.round(dx * (1 - t * 0.55)), z = Math.round(dz * (1 - t * 0.55));
      set(x, y, z, Math.floor(y / 4) % 2 === 0 ? ROUGE_PONT : BLANC);
    }
  }
  for (let y = 6; y <= H - 4; y += 6) {
    for (let k = 0; k < 3; k++) {
      const [ax, az] = pieds[k], [bx, bz] = pieds[(k + 1) % 3];
      const t = y / H;
      for (let s = 0; s <= 8; s++) {
        const p = s / 8;
        set(Math.round((ax + (bx - ax) * p) * (1 - t * 0.55)), y,
          Math.round((az + (bz - az) * p) * (1 - t * 0.55)), ACIER);
      }
    }
  }
  for (let k = 0; k <= 5; k++) set(0, H + 1 + k, 0, k % 2 === 0 ? ROUGE_PONT : BLANC);
}

// Le Ferry Building : une longue halle sur le port et sa tour à horloge, copiée
// d'un clocher de Séville. C'est le pied de Market Street.
export function buildFerryBuilding(poser) {
  const { set, bloc } = boite(poser);
  bloc(-9, 9, 0, 6, -2, 2, CREME);
  bloc(-8, 8, 0, 5, -1, 1, BLOCK.AIR);
  for (let dx = -8; dx <= 8; dx += 2) { set(dx, 3, -2, VERRE); set(dx, 3, 2, VERRE); }
  for (let dx = -1; dx <= 1; dx++) for (let y = 0; y <= 3; y++) set(dx, y, 2, BLOCK.AIR);
  bloc(-9, 9, 7, 7, -3, 3, BLANC);
  // la tour à horloge
  bloc(-2, 2, 8, 24, -2, 2, CREME);
  for (let y = 12; y <= 20; y += 4) { set(-2, y, 0, VERRE); set(2, y, 0, VERRE); }
  set(0, 22, -2, BLOCK.GOLD); set(0, 22, 2, BLOCK.GOLD);   // les cadrans
  for (let k = 0; k <= 3; k++) {
    const r = 2 - Math.floor(k * 0.7);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) set(dx, 25 + k, dz, BLANC);
  }
}

// Les Painted Ladies : six maisons victoriennes en rang, chacune de sa couleur,
// devant la pelouse d'Alamo Square. La carte postale de la ville.
const PASTELS = [15, 9, 29, 28, 16, 3].map(uni);
export function buildPaintedLadies(poser) {
  const { set, bloc } = boite(poser);
  for (let i = 0; i < 6; i++) {
    const x0 = -9 + i * 3;
    const c = PASTELS[i];
    bloc(x0, x0 + 2, 0, 8, -2, 1, c);
    bloc(x0, x0 + 2, 0, 7, -1, 0, BLOCK.AIR);
    for (let y = 2; y <= 6; y += 2) set(x0 + 1, y, 1, VERRE);
    for (let y = 0; y <= 1; y++) set(x0 + 1, y, 1, BLOCK.AIR);        // la porte
    // le pignon pointu et la corniche blanche
    bloc(x0, x0 + 2, 9, 9, -2, 1, BLANC);
    set(x0 + 1, 10, -1, BLANC); set(x0 + 1, 10, 0, BLANC);
    set(x0 + 1, 11, 0, BLANC);
    for (let k = 0; k <= 4; k++) set(x0 + 1, 3 + k, 2, BLANC);        // le perron
  }
  // la pelouse en pente, devant
  for (let dx = -11; dx <= 9; dx++) for (let dz = 3; dz <= 9; dz++) set(dx, 0, dz, HERBE);
}

// Le palais des Beaux-Arts : une rotonde ocre et sa colonnade courbe, au bord
// d'un étang. Il ne reste que lui de l'exposition de 1915.
export function buildPalaisBeauxArts(poser) {
  const { set } = boite(poser);
  const OCRE = uni(19);
  for (let a = 0; a < 360; a += 6) {
    const r = (a * Math.PI) / 180;
    const x = Math.round(Math.cos(r) * 5), z = Math.round(Math.sin(r) * 5);
    for (let y = 0; y <= 11; y++) set(x, y, z, OCRE);
  }
  for (let dx = -6; dx <= 6; dx++) {
    for (let dz = -6; dz <= 6; dz++) {
      const d = Math.hypot(dx, dz);
      if (d <= 6.4 && d >= 5) set(dx, 12, dz, OCRE);
      if (d < 5) set(dx, 13, dz, OCRE);
    }
  }
  for (let k = 0; k <= 3; k++) {
    const r = 4 - k;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.hypot(dx, dz) <= r) set(dx, 14 + k, dz, OCRE);
    }
  }
  // la colonnade en arc de cercle, et l'étang devant
  for (let a = 200; a <= 340; a += 10) {
    const r = (a * Math.PI) / 180;
    const x = Math.round(Math.cos(r) * 10), z = Math.round(Math.sin(r) * 10);
    for (let y = 0; y <= 7; y++) set(x, y, z, OCRE);
    set(x, 8, z, OCRE);
  }
  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = 6; dz <= 12; dz++) if (Math.hypot(dx, dz - 9) <= 5) set(dx, -1, dz, EAU);
  }
}

// Alcatraz : le rocher, son bloc de cellules et son phare, au milieu de la baie.
export function buildAlcatraz(poser) {
  const { set, bloc } = boite(poser);
  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = -6; dz <= 6; dz++) {
      const d = Math.hypot(dx / 1.3, dz);
      if (d > 6.5) continue;
      for (let y = -2; y <= Math.round(2 - d * 0.2); y++) set(dx, y, dz, y < 1 ? BETON : HERBE);
    }
  }
  bloc(-6, 5, 3, 8, -2, 2, CREME);
  for (let dx = -5; dx <= 4; dx += 2) for (let y = 4; y <= 7; y += 2) { set(dx, y, -2, VERRE); set(dx, y, 2, VERRE); }
  bloc(-6, 5, 9, 9, -3, 3, ANTHRACITE);
  for (let y = 3; y <= 16; y++) set(6, y, -4, BLANC);
  set(6, 17, -4, BLOCK.GOLD);      // le phare
}

// Le Golden Gate, le vrai : orange international — un rouge-orangé brûlé,
// jamais rouge vif —, orienté nord-sud du Presidio aux Marin Headlands,
// pylônes Art déco à gradins exagérés en hauteur pour qu'ils dominent tout
// sauf les collines, câbles paraboliques et suspentes. L'ancien pont était
// rouge laine, couché est-ouest, et ne menait nulle part.
export function buildGoldenGate(poser) {
  const { set, bloc } = boite(poser);
  const O = ROUGE_PONT;
  // le tablier, du Presidio aux Headlands
  for (let dz = -12; dz <= 12; dz++) {
    for (const dx of [-1, 0]) set(dx, 10, dz, BITUME);
    set(-2, 11, dz, O);
    set(1, 11, dz, O);
  }
  // les deux pylônes : un socle, un retrait, puis les jambes et leurs
  // traverses — les gradins Art déco, pas de simples poteaux
  for (const tz of [-7, 7]) {
    bloc(-3, 2, 0, 8, tz, tz + 1, O);
    bloc(-2, 1, 9, 16, tz, tz + 1, O);
    for (const dx of [-2, 1]) bloc(dx, dx, 17, 24, tz, tz + 1, O);
    for (const yy of [12, 18, 24]) bloc(-2, 1, yy, yy, tz, tz + 1, O);
  }
  // les câbles paraboliques entre les pylônes, et leurs suspentes
  for (let dz = -7; dz <= 7; dz++) {
    const t = Math.abs(dz) / 7;
    const cy = 24 - Math.round((1 - t * t) * 12);
    set(-2, cy, dz, O);
    set(1, cy, dz, O);
    if ((dz + 12) % 3 === 0) {
      for (let y = 12; y < cy; y++) { set(-2, y, dz, O); set(1, y, dz, O); }
    }
  }
  // les travées de rive, qui redescendent vers les ancrages
  for (const s of [-1, 1]) {
    for (let i = 1; i <= 5; i++) {
      const dz = s * (7 + i), cy = 24 - i * 3;
      if (cy > 11) { set(-2, cy, dz, O); set(1, cy, dz, O); }
    }
  }
}

// Karl the Fog : le brouillard d'été qui entre par la passe et coule sur
// l'ouest en laissant l'est ensoleillé. Une nappe translucide à mi-hauteur —
// et les sommets des pylônes du pont qui en dépassent. C'est la signature
// atmosphérique de la ville, et aucun décor ne peut la remplacer.
export function buildKarl(poser) {
  const { set } = boite(poser);
  for (let dx = -14; dx <= 14; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      if (((dx + dz) & 1) === 0) set(dx, 16, dz, BLOCK.ICE);
      else if ((dx * 3 + dz) % 5 === 0) set(dx, 17, dz, BLOCK.ICE);
    }
  }
}

// Pier 39 : la jetée des otaries. Des pontons flottants gris couverts de
// grosses formes brunes vautrées au soleil, et le petit carrousel au bout —
// l'attraction préférée des enfants, presque toujours oubliée.
export function buildPier39(poser) {
  const { set, bloc } = boite(poser);
  // la jetée sur pilotis, vers le large
  for (let dz = -4; dz <= 2; dz++) {
    for (let dx = -1; dx <= 1; dx++) set(dx, 2, dz, GRIS_QUAI);
    if (dz % 2 === 0) { set(-1, 0, dz, BLOCK.LOG); set(1, 0, dz, BLOCK.LOG); set(-1, 1, dz, BLOCK.LOG); set(1, 1, dz, BLOCK.LOG); }
  }
  // le K-Dock : les pontons des otaries, à fleur d'eau côté ouest
  for (const dz of [-3, -1]) {
    for (let dx = -4; dx <= -3; dx++) set(dx, 0, dz, GRIS_QUAI);
    set(-4, 1, dz, MARRON);
    set(-3, 1, dz, MARRON);
  }
  set(-4, 1, -2, MARRON);                                    // une otarie de plus
  // le carrousel, au bout de la jetée
  for (const [dx, dz, c] of [[-1, -4, BLOCK.WOOL_RED], [1, -4, BLOCK.WOOL_BLUE], [0, -5, BLOCK.WOOL_YELLOW]]) {
    set(dx, 3, dz, c);
  }
  set(0, 4, -4, OR);
}

// Lombard Street : huit virages en épingle sur un seul pâté de maisons, la
// chaussée de briques rouges, les hortensias roses et violets. À notre
// échelle c'est un micro-décor : un zigzag fleuri qui dévale Russian Hill
// vers l'est.
export function buildLombard(poser) {
  const { set } = boite(poser);
  const chemin = [
    [-3, -1], [-2, -1], [-2, 0], [-1, 0], [-1, -1], [0, -1], [0, 0], [1, 0], [1, -1], [2, -1], [2, 0], [3, 0],
  ];
  for (const [dx, dz] of chemin) { set(dx, 0, dz, BLOCK.BRICK); set(dx, -1, dz, BLOCK.BRICK); }
  // les hortensias, entre les épingles
  for (const [dx, dz] of [[-2, 1], [0, 1], [2, 1], [-1, -2], [1, -2], [3, -2]]) {
    set(dx, 1, dz, ((dx + dz) & 1) ? BLOCK.WOOL_PURPLE : ARBRE);
  }
}

// Le Dragon Gate : la porte verte de Chinatown offerte par Taïwan, ses lions
// gardiens, et les lanternes rouges de Grant Avenue derrière — un quartier
// qui change de couleur d'un coup.
export function buildDragonGate(poser) {
  const { set, bloc } = boite(poser);
  for (const dx of [-2, 0, 2]) for (let y = 0; y <= 2; y++) set(dx, y, 0, ROUGE_PONT);
  bloc(-3, 3, 3, 3, 0, 0, VERT_TOIT);
  set(-3, 4, 0, VERT_TOIT);
  set(3, 4, 0, VERT_TOIT);
  set(0, 4, 0, VERT_TOIT);
  set(0, 5, 0, OR);
  set(-3, 0, 1, GRIS_QUAI);                                  // les lions de pierre
  set(3, 0, 1, GRIS_QUAI);
  // les lanternes de Grant Avenue, vers le nord
  for (const dz of [-2, -4]) { set(-2, 2, dz, BLOCK.WOOL_RED); set(2, 2, dz, BLOCK.WOOL_RED); }
}
