// Paris.
//
// Le quartier existait déjà — pierre de taille, toits de zinc, la Tour Eiffel,
// l'Arc de Triomphe et la pyramide du Louvre. Mais il lui manquait ce qui fait
// Paris avant tout le reste : le fleuve.
//
// Paris s'est construite autour de la Seine et de son île. Tout part de là —
// la ville romaine sur l'île, les deux rives, les ponts, les quais. Et par
// dessus, le geste du XIXe siècle : les percées d'Haussmann, la place de
// l'Étoile d'où douze avenues rayonnent, et les Champs-Élysées qui descendent
// de l'Arc jusqu'à la Concorde.
//
// Comme pour Manhattan, une liberté d'échelle assumée : la ville fait dix
// kilomètres de large, on en garde le cœur sur cent dix blocs. Les positions
// relatives, elles, sont justes : l'Arc au nord-ouest, la Tour Eiffel au
// sud-ouest sur la rive gauche, le Louvre au centre sur la rive droite,
// Notre-Dame sur l'île, le Sacré-Cœur sur sa butte au nord.

import { BLOCK, CITY_BLOCK, DECOR_START } from './blocks.js';

const uni = (couleur) => DECOR_START + couleur * 10;

const PAVE = CITY_BLOCK.SIDEWALK;
const BITUME = CITY_BLOCK.ASPHALT;
const PIERRE = CITY_BLOCK.HAUSSMANN;
const ZINC = CITY_BLOCK.ZINC;
const QUAI = CITY_BLOCK.GRANITE;
const ARBRE = BLOCK.LEAVES;
const BLANC = uni(27);
const VERRE = BLOCK.GLASS;

export const PARIS = { x: -240, z: 200, r: 55 };

// La Seine traverse d'ouest en est en décrivant une grande courbe vers le sud,
// puis remonte : c'est ce méandre qui donne à la ville sa forme, et qui place
// la Tour Eiffel et le Louvre de part et d'autre.
export function zSeine(x) {
  const u = x - PARIS.x;
  return PARIS.z + 6 + Math.sin(u * 0.045) * 9 + Math.sin(u * 0.017) * 4;
}
const LARGEUR_SEINE = 5;    // demi-largeur du lit

// L'île de la Cité : un fuseau posé au milieu du fleuve, un peu à l'est du
// centre. C'est là qu'est née la ville, et là qu'est Notre-Dame.
export const CITE = { u: 6, long: 13, large: 3 };
// Le centre de l'île, là où se pose Notre-Dame. On le calcule plutôt que de
// le recopier : la courbe du fleuve déplace l'île avec elle.
export const zCite = () => Math.round(zSeine(PARIS.x + CITE.u));

export function surLIle(x, z) {
  const u = x - PARIS.x - CITE.u;
  if (Math.abs(u) > CITE.long) return false;
  const e = CITE.large * Math.sqrt(Math.max(0, 1 - (u / CITE.long) ** 2));
  return Math.abs(z - zSeine(x)) <= e;
}

// Distance au fleuve, négative sur l'eau. L'île n'en fait pas partie.
export function versSeine(x, z) {
  if (Math.hypot(x - PARIS.x, z - PARIS.z) > PARIS.r + 6) return 99;
  if (surLIle(x, z)) return 3;
  return Math.abs(z - zSeine(x)) - LARGEUR_SEINE;
}

// Le terrain : on creuse le lit, on relève les quais, et on bombe la butte
// Montmartre au nord — la seule vraie colline de Paris, et celle qui porte le
// Sacré-Cœur.
export const BUTTE = { u: -4, v: -40, r: 15 };
export function hauteurParis(x, z, h, base) {
  const d = versSeine(x, z);
  // Le lit doit descendre SOUS le niveau de l'eau, sinon la Seine n'est qu'un
  // fossé sec : c'est le remplissage général du monde qui la met en eau.
  if (d < 0) return Math.min(h, base - 6);
  if (d < 2) return base - 1;                        // le quai bas, au ras de l'eau
  const bd = Math.hypot(x - (PARIS.x + BUTTE.u), z - (PARIS.z + BUTTE.v));
  if (bd < BUTTE.r) {
    const m = Math.cos((bd / BUTTE.r) * Math.PI * 0.5);
    return h + Math.round(m * m * 11);               // la butte
  }
  return h;
}

// --- les percées --------------------------------------------------------------

// La place de l'Étoile, sur l'Arc de Triomphe, et ses douze avenues. C'est la
// figure la plus reconnaissable du plan de Paris — une étoile, littéralement.
export const ETOILE = { u: -23, v: 0, r: 9 };
// La Concorde, au bout des Champs-Élysées, à l'est de l'Étoile.
export const CONCORDE = { u: -6, v: -4, r: 6 };

// Ce qu'il faut poser au sol, ou null si la trame ordinaire de la ville doit
// reprendre la main.
export function solParis(x, z) {
  const u = x - PARIS.x, v = z - PARIS.z;
  if (Math.hypot(u, v) > PARIS.r) return null;

  const d = versSeine(x, z);
  if (d < 0) return BLOCK.WATER;
  if (d < 2) return QUAI;                    // les quais de pierre

  // Les ponts : trois passages sur le fleuve, dont un qui dessert l'île.
  for (const pu of [-18, CITE.u - 2, CITE.u + 10]) {
    if (Math.abs(u - pu) <= 1 && d < 8) return PAVE;
  }

  // La place de l'Étoile et ses douze avenues rayonnantes.
  const de = Math.hypot(u - ETOILE.u, v - ETOILE.v);
  if (de < ETOILE.r) return de > ETOILE.r - 2 ? BITUME : PAVE;
  if (de < 34) {
    const a = Math.atan2(v - ETOILE.v, u - ETOILE.u);
    const secteur = a / (Math.PI * 2 / 12);
    if (Math.abs(secteur - Math.round(secteur)) * de < 1.1) return BITUME;
  }

  // Les Champs-Élysées : de l'Étoile à la Concorde, large et plantée d'arbres.
  const t = (u - ETOILE.u) / (CONCORDE.u - ETOILE.u);
  if (t >= 0 && t <= 1) {
    const axe = ETOILE.v + (CONCORDE.v - ETOILE.v) * t;
    const dv = Math.abs(v - axe);
    if (dv <= 1) return BITUME;
    if (dv <= 3) return dv === 3 ? ARBRE : PAVE;
  }
  const dc = Math.hypot(u - CONCORDE.u, v - CONCORDE.v);
  if (dc < CONCORDE.r) return PAVE;

  return null;
}

// Un lot est-il bâtissable ? Non sur l'eau, les quais, les percées et les
// places — sinon un immeuble se retrouverait les pieds dans la Seine.
export function lotParisLibre(x, z) {
  if (versSeine(x, z) < 4) return false;
  return solParis(x, z) === null;
}

// --- Notre-Dame ----------------------------------------------------------------

// Sur l'île, tournée vers l'ouest : la façade à deux tours carrées, la grande
// rosace entre elles, la nef longue et la flèche au-dessus de la croisée.
export function buildNotreDame(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
  };
  // la nef, d'ouest en est
  bloc(-9, 8, 0, 9, -3, 3, PIERRE);
  bloc(-8, 7, 0, 8, -2, 2, BLOCK.AIR);
  for (let x = -8; x <= 7; x++) {
    for (let z = -3; z <= 3; z += 6) {
      for (let y = 3; y <= 6; y++) if ((x & 1) === 0) set(x, y, z, VERRE);
    }
  }
  // le toit à deux pentes
  for (let k = 0; k <= 3; k++) {
    for (let x = -9; x <= 8; x++) { set(x, 10 + k, -3 + k, ZINC); set(x, 10 + k, 3 - k, ZINC); }
  }
  // les deux tours de la façade ouest
  for (const dz of [-2, 2]) {
    bloc(-11, -9, 0, 15, dz - 1, dz + 1, PIERRE);
    for (let y = 11; y <= 14; y += 3) set(-11, y, dz, VERRE);
    bloc(-11, -9, 16, 16, dz - 1, dz + 1, ZINC);
  }
  // la rosace, entre les tours
  for (let y = 6; y <= 9; y++) for (let dz = -1; dz <= 1; dz++) set(-10, y, dz, VERRE);
  bloc(-11, -9, 0, 12, -1, 1, PIERRE);
  bloc(-10, -10, 6, 9, -1, 1, VERRE);
  // le portail
  for (let y = 0; y <= 2; y++) set(-11, y, 0, BLOCK.AIR);
  // la flèche, à la croisée
  for (let k = 0; k <= 9; k++) set(0, 13 + k, 0, k > 6 ? BLOCK.GOLD : ZINC);
}

// --- le Sacré-Cœur --------------------------------------------------------------

// Blanc, sur sa butte, avec sa grande coupole et ses deux coupoles d'angle.
// C'est le point le plus haut de la ville : on le voit de partout.
export function buildSacreCoeur(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
  };
  bloc(-7, 7, 0, 8, -7, 7, BLANC);
  bloc(-6, 6, 0, 7, -6, 6, BLOCK.AIR);
  for (let x = -6; x <= 6; x += 2) { set(x, 4, -7, VERRE); set(x, 4, 7, VERRE); }
  for (let y = 0; y <= 2; y++) set(0, y, 7, BLOCK.AIR);        // le portail, plein sud
  bloc(-7, 7, 9, 9, -7, 7, BLANC);

  // la coupole centrale : une demi-sphère, puis le lanternon
  for (let y = 0; y <= 7; y++) {
    const r = Math.round(Math.sqrt(Math.max(0, 49 - y * y)) * 0.72);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.hypot(dx, dz) > r || Math.hypot(dx, dz) < r - 1.2) continue;
        set(dx, 10 + y, dz, BLANC);
      }
    }
  }
  for (let k = 0; k <= 3; k++) set(0, 18 + k, 0, BLANC);
  set(0, 22, 0, BLOCK.GOLD);
  // les deux coupoles d'angle, plus petites
  for (const [cx, cz] of [[-5, -5], [-5, 5]]) {
    for (let y = 0; y <= 3; y++) {
      const r = 3 - y;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.hypot(dx, dz) <= r) set(cx + dx, 10 + y, cz + dz, BLANC);
        }
      }
    }
  }
  // le grand escalier, au sud
  for (let k = 1; k <= 8; k++) {
    for (let dx = -4; dx <= 4; dx++) set(dx, -k, 7 + k, PAVE);
  }
}
