// Nice.
//
// C'était un disque de maisons posé au bord de rien. Or Nice se reconnaît à
// quatre choses : **la baie des Anges**, cette courbe que la ville épouse sur
// cinq kilomètres ; **la Promenade des Anglais** qui la longe d'un bout à
// l'autre ; **le Vieux-Nice**, un lacis de ruelles italiennes serrées entre le
// Paillon et la colline ; et **la colline du Château**, qui ferme la baie à
// l'est et sépare la vieille ville du port.
//
// Une échelle unique, comme partout ailleurs : dix blocs par kilomètre, et un
// point d'ancrage, la place Masséna. Chaque lieu est donné par son écart réel
// à elle.

import { BLOCK, CITY_BLOCK, DECOR_START } from './blocks.js';
import { rangerVoies, solDesVoies } from './voies.js';

const uni = (c) => DECOR_START + c * 10;
const damier = (c) => DECOR_START + c * 10 + 3;

const BITUME = CITY_BLOCK.ASPHALT;
const TROTTOIR = CITY_BLOCK.SIDEWALK;
const PAVE = CITY_BLOCK.GRANITE;
const HERBE = BLOCK.GRASS;
const ARBRE = BLOCK.LEAVES;
const EAU = BLOCK.WATER;
const GALETS = BLOCK.GRAVEL === undefined ? BLOCK.SAND : BLOCK.SAND;
const OCRE = uni(1);
const ROSE = uni(16);
const SABLE = uni(20);
const TUILE = uni(0);
const BLANC = uni(27);
const CREME = uni(28);
const VERRE = BLOCK.GLASS;
const OR = BLOCK.GOLD;
const BLEU = uni(10);
const VERT = uni(5);

export const NICE = { x: 300, z: 260, r: 48 };

const BLOCS_PAR_KM = 10;
// La place Masséna : le point où tout se croise, et d'où tout se mesure.
const MASSENA = { u: 0, v: 0 };
const de = (dx, dz) => [
  Math.round(MASSENA.u + dx * BLOCS_PAR_KM),
  Math.round(MASSENA.v + dz * BLOCS_PAR_KM),
];

// --- la baie des Anges ---------------------------------------------------------------

// Le rivage, relevé point par point : une courbe très ouverte, qui se relève à
// l'est où la colline du Château vient fermer la baie, puis retombe au port.
const RIVAGE = [
  [-48, 16], [-38, 13], [-26, 10], [-14, 7], [-4, 5], [4, 5], [9, 8], [13, 10],
  [16, 6], [22, 4], [30, 2], [48, 0],
];

const vRivage = (u) => {
  if (u <= RIVAGE[0][0]) return RIVAGE[0][1];
  const fin = RIVAGE[RIVAGE.length - 1];
  if (u >= fin[0]) return fin[1];
  for (let i = 0; i < RIVAGE.length - 1; i++) {
    const [a, va] = RIVAGE[i], [b, vb] = RIVAGE[i + 1];
    if (u >= a && u <= b) return va + (vb - va) * ((u - a) / (b - a));
  }
  return fin[1];
};

export const surTerreNice = (x, z) => {
  const u = x - NICE.x, v = z - NICE.z;
  if (Math.hypot(u, v) > NICE.r) return false;
  return v < vRivage(u);
};

// --- les collines ------------------------------------------------------------------

export const COLLINES_NICE = [
  // La colline du Château : pas de château dessus depuis 1706, mais le nom est
  // resté, et c'est elle qui coupe la ville en deux.
  { nom: 'Colline du Château', dx: 0.9, dz: 0.2, r: 8, h: 10 },
  { nom: 'Cimiez', dx: 0.3, dz: -1.7, r: 11, h: 13 },
  { nom: 'Mont Boron', dx: 2.1, dz: 0.1, r: 9, h: 16 },
].map((c) => { const [u, v] = de(c.dx, c.dz); return { ...c, u, v }; });

export function hauteurNice(x, z, h, base) {
  const u = x - NICE.x, v = z - NICE.z;
  const d = Math.hypot(u, v);
  if (d > NICE.r + 12) return h;
  const marge = Math.min(1, (NICE.r + 12 - d) / 12);

  const mer = v - vRivage(u);
  let cible;
  if (mer >= 0) cible = mer < 3 ? base - 1 - mer : Math.max(20, 26 - Math.min(6, mer - 3));
  else {
    cible = base;
    for (const c of COLLINES_NICE) {
      const dc = Math.hypot(u - c.u, v - c.v);
      if (dc >= c.r) continue;
      const m = Math.cos((dc / c.r) * Math.PI * 0.5);
      cible += m * m * c.h;
    }
  }
  return h * (1 - marge) + cible * marge;
}

// --- les lieux -----------------------------------------------------------------------

const L = (nom, dx, dz, reste = {}) => {
  const [u, v] = de(dx, dz);
  return { nom, u, v, ...reste };
};

export const LIEUX_NICE = [
  L('Place Masséna', 0, 0, { r: 4, sol: damier(0) }),
  L('Vieux-Nice', 0.5, 0.3, { r: 4 }),
  L('Cours Saleya', 0.5, 0.45, { discret: true, r: 2, sol: PAVE }),
  L('Colline du Château', 0.9, 0.2, { r: 4 }),
  L('Port Lympia', 1.4, 0.25, { ru: 3, rv: 2.5, bassin: true }),
  L('Promenade des Anglais', -1.6, 0.75, { r: 4 }),
  L('Cimiez', 0.3, -1.7, { r: 4 }),
  L('Gare de Nice', -0.7, -0.9, { r: 3, sol: PAVE }),
  L('Jardin du Paillon', 0.05, -0.35, { ru: 1.6, rv: 3.5, jardin: true }),
  L('Mont Boron', 2.1, 0.1, { r: 4 }),
];

export const lieuxDeNice = () => LIEUX_NICE
  .filter((p) => (p.r || p.jardin || p.bassin) && !p.discret)
  .map((p) => ({ name: p.nom, x: NICE.x + p.u, z: NICE.z + p.v, r: 6 }));

// --- les rues ------------------------------------------------------------------------
//
// Deux trames, et elles n'ont rien à voir. Le Vieux-Nice est génois : des
// ruelles d'un mètre cinquante, tortueuses, orientées n'importe comment. La
// ville du XIXe, à l'ouest du Paillon, est tracée au cordeau pour les hivernants
// anglais et russes. La frontière entre les deux, c'est le Paillon — aujourd'hui
// couvert, et devenu jardin.

const TRAMES = {
  vieux: { ang: 0.34, pu: 3.5, pv: 3, cu: 5, cv: 3, w: 0.4, s: 0.7 },
  neuve: { ang: 0, pu: 6, pv: 5, cu: -6, cv: -4, w: 0.55, s: 0.95 },
  cimiez: { ang: 0.15, pu: 7, pv: 6, cu: 3, cv: -17, w: 0.5, s: 0.9 },
};

function trameDeNice(u, v) {
  if (v < -10) return TRAMES.cimiez;
  if (u >= 2 && u <= 12 && v >= -2) return TRAMES.vieux;
  return TRAMES.neuve;
}

const pt = (nom) => [lieu(nom).u, lieu(nom).v];
const lieu = (nom) => LIEUX_NICE.find((p) => p.nom === nom);

const VOIES = [
  // La Promenade des Anglais, puis le quai des États-Unis : cinq kilomètres de
  // front de mer, l'un dans le prolongement de l'autre.
  { nom: 'Promenade des Anglais', l: 1.6, t: 0.6, pts: RIVAGE.slice(0, 6).map(([u, v]) => [u, v - 2]) },
  { nom: 'Quai des États-Unis', l: 1.2, pts: [[4, 3], [9, 6], [13, 8]] },
  { nom: 'Avenue Jean-Médecin', l: 1.1, pts: [de(0, -0.1), de(-0.2, -0.6), de(-0.6, -0.95)] },
  { nom: 'Boulevard Victor-Hugo', l: 0.8, pts: [de(-0.2, -0.25), de(-1.4, -0.35), de(-2.4, -0.3)] },
  { nom: 'Rue de France', l: 0.7, pts: [de(-0.3, 0.35), de(-1.6, 0.5), de(-2.8, 0.6)] },
  { nom: 'Boulevard de Cimiez', l: 0.8, pts: [de(0.2, -0.5), de(0.3, -1.1), de(0.3, -1.7)] },
  { nom: 'Boulevard Gambetta', l: 0.7, pts: [de(-1.5, 0.55), de(-1.6, -0.4), de(-1.6, -1.2)] },
];

const BANDES = rangerVoies(VOIES);

export function solNice(x, z) {
  if (!surTerreNice(x, z)) return null;
  const u = x - NICE.x, v = z - NICE.z;

  // La plage de galets : Nice n'a pas de sable, et c'est la première chose que
  // remarque un enfant qui y met les pieds.
  if (vRivage(u) - v < 2.5) return GALETS;

  for (const p of LIEUX_NICE) {
    if (p.bassin) {
      if (((u - p.u) / p.ru) ** 2 + ((v - p.v) / p.rv) ** 2 < 1) return EAU;
      continue;
    }
    if (p.jardin) {
      if (((u - p.u) / p.ru) ** 2 + ((v - p.v) / p.rv) ** 2 < 1) {
        if (Math.abs(u - p.u) < 0.6) return TROTTOIR;
        return ((u + v) & 3) === 0 ? ARBRE : HERBE;
      }
      continue;
    }
    if (!p.sol) continue;
    if (Math.hypot(u - p.u, v - p.v) < p.r) return p.sol;
  }

  const voie = solDesVoies(BANDES, u, v, BITUME, TROTTOIR);
  if (voie !== null) return voie;

  const t = trameDeNice(u, v);
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

export function lotNiceLibre(x, z) {
  if (!surTerreNice(x, z)) return false;
  const u = x - NICE.x, v = z - NICE.z;
  if (vRivage(u) - v < 3.5) return false;
  // le sommet de la colline du Château reste un jardin, comme le vrai
  const ch = COLLINES_NICE[0];
  if (Math.hypot(u - ch.u, v - ch.v) < ch.r * 0.55) return false;
  return solNice(x, z) === null;
}

// --- les maisons ---------------------------------------------------------------------

// L'ocre, le rose et le sable : les trois couleurs des façades niçoises, avec
// leurs tuiles rondes. Dans le Vieux-Nice, les maisons sont hautes et étroites ;
// à l'ouest, plus basses et plus larges.
const FACADES = [OCRE, ROSE, SABLE, uni(2), uni(16), CREME];

function tirageNice(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function batirColonneNice(x, z, poser) {
  const u = x - NICE.x, v = z - NICE.z;
  const t = trameDeNice(u, v);
  const c = Math.cos(t.ang), s = Math.sin(t.ang);
  const du = u - t.cu, dv = v - t.cv;
  const a = Math.round((du * c - dv * s) / t.pu), b = Math.round((du * s + dv * c) / t.pv);
  const r = tirageNice(a, b, 731);
  const vieux = t === TRAMES.vieux;
  const bh = vieux ? 5 + Math.floor(r * 4) : 4 + Math.floor(r * 3);
  const mur = FACADES[Math.floor(tirageNice(a, b, 732) * FACADES.length) % FACADES.length];

  const oE = lotNiceLibre(x + 1, z), oO = lotNiceLibre(x - 1, z);
  const oS = lotNiceLibre(x, z + 1), oN = lotNiceLibre(x, z - 1);
  const dedans = oE && oO && oS && oN;
  const face = (!oE || !oO) ? v : u;

  for (let y = 0; y < bh; y++) {
    if (dedans) { if (y === 0) poser(1, BLOCK.PLANK); continue; }
    const fenetre = y > 0 && y % 2 === 1 && (face & 1) === 1;
    poser(y + 1, fenetre ? VERRE : mur);
  }
  // les tuiles rondes, et les volets peints du Vieux-Nice
  poser(bh + 1, TUILE);
  if (vieux && !dedans && (face & 3) === 0) poser(3, VERT);
}

// --- ce que la carte doit peindre -------------------------------------------------------

const GRIS_RUE = [64, 66, 72];
const BEIGE = [214, 200, 168];
const GALET = [206, 198, 186];
const VERT_JARDIN = [96, 156, 84];

export function couleurCarteNice(x, z) {
  const u = x - NICE.x, v = z - NICE.z;
  if (u < -NICE.r || u > NICE.r || v < -NICE.r || v > NICE.r) return null;
  const sol = solNice(x, z);
  if (sol === null) {
    if (!surTerreNice(x, z)) return null;
    return [206, 168, 132];     // les toits de tuiles, vus du ciel
  }
  if (sol === EAU) return null;
  if (sol === GALETS) return GALET;
  if (sol === ARBRE || sol === HERBE) return VERT_JARDIN;
  if (sol === PAVE || sol === damier(0)) return BEIGE;
  return GRIS_RUE;
}

// --- les monuments -----------------------------------------------------------------------

export const MONUMENTS_NICE = [
  { nom: 'Place Masséna', dx: 0, dz: 0, box: 9 },
  { nom: 'Cathédrale russe', dx: -0.8, dz: -0.8, box: 8 },
  { nom: 'Colline du Château', dx: 0.9, dz: 0.2, box: 8 },
].map((m) => { const [u, v] = de(m.dx, m.dz); return { ...m, u, v }; });

const boite = (poser) => {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
  };
  return { set, bloc };
};

// La place Masséna : son dallage en damier noir et blanc, et les immeubles
// rouge ocre à arcades qui la bordent au sud. Aucune autre place n'a ces
// deux-là ensemble.
export function buildMassena(poser) {
  const { set, bloc } = boite(poser);
  for (let dx = -7; dx <= 7; dx++) {
    for (let dz = -6; dz <= 6; dz++) {
      poser(dx, 0, dz, ((Math.floor((dx + 40) / 2) + Math.floor((dz + 40) / 2)) & 1) ? BLANC : uni(25));
    }
  }
  for (const dz of [-6, 6]) {
    bloc(-7, 7, 0, 9, dz, dz + Math.sign(dz), uni(0));
    for (let dx = -6; dx <= 6; dx += 2) {
      for (let y = 1; y <= 2; y++) set(dx, y, dz, BLOCK.AIR);          // les arcades
      for (let y = 4; y <= 8; y += 2) set(dx, y, dz, VERRE);
    }
    bloc(-7, 7, 10, 10, dz - Math.sign(dz), dz + Math.sign(dz), TUILE);
  }
  // la fontaine du Soleil, au milieu
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) if (Math.hypot(dx, dz) <= 2.4) poser(dx, 0, dz, EAU);
  }
  for (let y = 1; y <= 5; y++) set(0, y, 0, BLANC);
  set(0, 6, 0, OR);
  // les sept statues sur leurs colonnes, autour de la place
  for (const [dx, dz] of [[-6, -3], [-6, 3], [6, -3], [6, 3], [0, -4], [0, 4]]) {
    for (let y = 1; y <= 6; y++) set(dx, y, dz, BLANC);
    set(dx, 7, dz, uni(19));
  }
}

// La cathédrale orthodoxe russe : six bulbes colorés, bâtie pour les hivernants
// du tsar. C'est la plus grande hors de Russie, et elle est à Nice.
export function buildCathedraleRusse(poser) {
  const { set, bloc } = boite(poser);
  const OCRE_MUR = uni(1);
  bloc(-5, 5, 0, 9, -4, 4, OCRE_MUR);
  bloc(-4, 4, 0, 8, -3, 3, BLOCK.AIR);
  for (let dx = -4; dx <= 4; dx += 2) for (let y = 3; y <= 7; y += 2) { set(dx, y, -4, VERRE); set(dx, y, 4, VERRE); }
  for (let y = 0; y <= 2; y++) set(0, y, 4, BLOCK.AIR);
  bloc(-5, 5, 10, 10, -4, 4, uni(5));
  const bulbes = [[0, 0, 4, OR], [-4, -3, 2, uni(5)], [4, -3, 2, uni(10)], [-4, 3, 2, uni(0)], [4, 3, 2, uni(7)]];
  for (const [dx, dz, r, c] of bulbes) {
    const base = dx || dz ? 11 : 13;
    for (let k = 0; k < 2; k++) set(dx, 11 + k, dz, BLANC);
    for (let y = 0; y <= r; y++) {
      const rr = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
      for (let ax = -rr; ax <= rr; ax++) {
        for (let az = -rr; az <= rr; az++) {
          const hh = Math.hypot(ax, az);
          if (hh > rr || hh < rr - 1.3) continue;
          set(dx + ax, base + y, dz + az, c);
        }
      }
    }
    for (let y = base + r; y <= base + r + 1; y++) set(dx, y, dz, OR);
  }
}

// La colline du Château : il n'y a plus de château, mais il y a la cascade, les
// ruines de la cathédrale et le belvédère d'où l'on voit toute la baie.
export function buildCollineChateau(poser) {
  const { set } = boite(poser);
  // la cascade, sur le flanc ouest
  for (let k = 0; k <= 9; k++) {
    for (let dx = -2; dx <= 2; dx++) set(-6 + Math.round(k * 0.3) + dx, 8 - k, -1 + Math.round(k * 0.2), EAU);
  }
  for (let dx = -4; dx <= 4; dx++) for (let dz = -3; dz <= 3; dz++) {
    if (Math.hypot(dx, dz) <= 4) set(dx, 0, dz, HERBE);
  }
  // les ruines : des pans de mur et deux colonnes
  for (const [x0, x1, z0] of [[-3, 2, -3], [-3, -3, -3], [2, 2, -3]]) {
    for (let x = x0; x <= x1; x++) for (let y = 1; y <= 4; y++) set(x, y, z0, PAVE);
  }
  for (const dx of [-2, 2]) for (let y = 1; y <= 6; y++) set(dx, y, 2, BLANC);
  // le belvédère et son mât
  for (let y = 1; y <= 8; y++) set(0, y, 0, PAVE);
  set(0, 9, 0, uni(0));
}
