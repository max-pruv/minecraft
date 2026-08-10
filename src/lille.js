// Lille.
//
// C'était un disque de maisons avec un beffroi posé au milieu. Or Lille se
// reconnaît à deux choses, et la première est une forme : **la citadelle de
// Vauban**, une étoile à cinq branches entourée d'eau, « la reine des
// citadelles ». On la voit sur n'importe quelle vue aérienne, et rien d'autre
// en France ne lui ressemble à cet endroit.
//
// La seconde, c'est la **Grand'Place** — la Vieille Bourse et ses vingt-quatre
// maisons serrées autour d'une cour, la colonne de la Déesse, le beffroi — et
// autour d'elle le **Vieux-Lille** : des façades de brique rouge à pignons, des
// rues étroites qui tournent, et pas un angle droit.
//
// Seize blocs par kilomètre — la ville est compacte — et un point d'ancrage, la
// Grand'Place.

import { BLOCK, CITY_BLOCK, DECOR_START } from './blocks.js';
import { rangerVoies, solDesVoies } from './voies.js';

const uni = (c) => DECOR_START + c * 10;
const brique = (c) => DECOR_START + c * 10 + 1;

const BITUME = CITY_BLOCK.ASPHALT;
const TROTTOIR = CITY_BLOCK.SIDEWALK;
const PAVE = CITY_BLOCK.GRANITE;
const HERBE = BLOCK.GRASS;
const ARBRE = BLOCK.LEAVES;
const EAU = BLOCK.WATER;
const BRIQUE = brique(0);
const BRIQUE_SOMBRE = brique(18);
const PIERRE = uni(19);
const BLANC = uni(27);
const CREME = uni(28);
const ARDOISE = uni(25);
const VERRE = BLOCK.GLASS;
const OR = BLOCK.GOLD;
const ACIER = uni(24);

export const LILLE = { x: -300, z: -200, r: 46 };

const BLOCS_PAR_KM = 16;
const GRAND_PLACE = { u: 0, v: 0 };
const de = (dx, dz) => [
  Math.round(GRAND_PLACE.u + dx * BLOCS_PAR_KM),
  Math.round(GRAND_PLACE.v + dz * BLOCS_PAR_KM),
];

// --- la citadelle -------------------------------------------------------------------

// L'étoile à cinq branches. Son rayon varie avec l'angle : c'est cette formule,
// et elle seule, qui donne les cinq bastions pointus et les cinq courtines
// rentrantes entre eux.
export const CITADELLE = (() => {
  const [u, v] = de(-1.25, -0.85);
  return { u, v, R: 11, pointe: 4.5 };
})();

const rayonCitadelle = (a) => CITADELLE.R + CITADELLE.pointe * Math.cos(5 * (a + 0.3));

// Où sommes-nous par rapport à l'étoile ? Négatif dedans, positif dehors.
function versCitadelle(u, v) {
  const du = u - CITADELLE.u, dv = v - CITADELLE.v;
  const d = Math.hypot(du, dv);
  if (d > CITADELLE.R + CITADELLE.pointe + 9) return 99;
  return d - rayonCitadelle(Math.atan2(dv, du));
}

// --- la Deûle -----------------------------------------------------------------------

// Le canal contourne la citadelle par l'ouest et file vers le nord. Il alimente
// aussi les douves, ce qui est exactement son rôle historique.
// Le canal passe à l'OUEST de la citadelle, il ne la traverse pas. Tracé huit
// blocs trop à l'est, il coupait l'étoile en deux et noyait deux de ses cinq
// bastions — la forme, qui est toute la raison d'être de cette citadelle, ne se
// lisait plus.
const DEULE = [
  [-44, 22], [-42, 10], [-40, -2], [-41, -14], [-39, -26], [-34, -38],
];
const uDeule = (v) => {
  if (v >= DEULE[0][1]) return DEULE[0][0];
  const fin = DEULE[DEULE.length - 1];
  if (v <= fin[1]) return fin[0];
  for (let i = 0; i < DEULE.length - 1; i++) {
    const [ua, va] = DEULE[i], [ub, vb] = DEULE[i + 1];
    if (v <= va && v >= vb) return ua + (ub - ua) * ((va - v) / (va - vb));
  }
  return fin[0];
};

export function hauteurLille(x, z, h, base) {
  const u = x - LILLE.x, v = z - LILLE.z;
  const d = Math.hypot(u, v);
  if (d > LILLE.r + 10) return h;
  const marge = Math.min(1, (LILLE.r + 10 - d) / 10);

  let cible = base;
  // le canal
  if (Math.abs(u - uDeule(v)) < 3) cible = base - 5;
  // les douves de la citadelle, et son glacis relevé
  const c = versCitadelle(u, v);
  if (c < 99) {
    if (c > 0 && c < 3.5) cible = base - 5;
    else if (c <= 0) cible = base + (c < -3 ? 2 : 3);      // le rempart, plus haut que la ville
  }
  return h * (1 - marge) + cible * marge;
}

// --- les lieux -----------------------------------------------------------------------

const L = (nom, dx, dz, reste = {}) => {
  const [u, v] = de(dx, dz);
  return { nom, u, v, ...reste };
};

export const LIEUX_LILLE = [
  L("Grand'Place", 0, 0, { r: 4, sol: PAVE }),
  L('Vieux-Lille', -0.15, -0.5, { r: 5 }),
  L('Citadelle', -1.25, -0.85, { r: 5 }),
  L('Porte de Paris', 0.35, 0.65, { r: 3, sol: PAVE }),
  L('Gare Lille-Flandres', 0.45, -0.05, { r: 3, sol: PAVE }),
  L('Euralille', 0.85, -0.2, { r: 4 }),
  L('Palais des Beaux-Arts', 0.15, 0.85, { r: 3, sol: PAVE }),
  L('Wazemmes', -0.6, 1.15, { r: 4 }),
  L('Jardin Vauban', -1.0, -0.15, { ru: 5, rv: 4, jardin: true }),
  L('Parc de la Citadelle', -1.6, -1.25, { ru: 6, rv: 5, jardin: true }),
];

export const lieuxDeLille = () => LIEUX_LILLE
  .filter((p) => p.r || p.jardin)
  .map((p) => ({ name: p.nom, x: LILLE.x + p.u, z: LILLE.z + p.v, r: 6 }));

// --- les rues ------------------------------------------------------------------------

const TRAMES = {
  // le Vieux-Lille : des rues étroites qui ne sont parallèles à rien
  vieux: { ang: 0.28, pu: 4, pv: 3.5, cu: -2, cv: -8, w: 0.45, s: 0.75 },
  // le centre du XIXe, percé après la démolition des remparts
  centre: { ang: -0.14, pu: 6, pv: 5.5, cu: 4, cv: 4, w: 0.55, s: 0.95 },
  // les faubourgs du sud, tracés au cordeau autour de leurs usines
  sud: { ang: 0, pu: 6, pv: 6, cu: -8, cv: 18, w: 0.55, s: 0.95 },
};

function trameDeLille(u, v) {
  if (v > 12) return TRAMES.sud;
  if (v < -3 && u < 8) return TRAMES.vieux;
  return TRAMES.centre;
}

const VOIES = [
  { nom: 'Rue Faidherbe', l: 1.0, pts: [de(0.05, 0), de(0.45, -0.05)] },
  { nom: 'Rue Nationale', l: 0.9, pts: [de(-0.05, -0.02), de(-0.6, -0.1), de(-1.05, -0.15)] },
  { nom: 'Rue Esquermoise', l: 0.7, pts: [de(-0.02, -0.05), de(-0.2, -0.4), de(-0.3, -0.75)] },
  { nom: 'Rue de Paris', l: 0.8, pts: [de(0.05, 0.08), de(0.2, 0.4), de(0.35, 0.65)] },
  { nom: 'Boulevard de la Liberté', l: 1.0, pts: [de(-1.1, -0.35), de(-0.5, 0.3), de(0.15, 0.85)] },
  { nom: 'Avenue du Peuple-Belge', l: 0.8, pts: [de(-0.3, -0.3), de(-0.5, -0.7), de(-0.6, -1.0)] },
  { nom: 'Boulevard Vauban', l: 0.8, pts: [de(-1.15, -0.5), de(-1.05, 0.0), de(-0.9, 0.5)] },
];

const BANDES = rangerVoies(VOIES);

export function solLille(x, z) {
  const u = x - LILLE.x, v = z - LILLE.z;
  if (Math.hypot(u, v) > LILLE.r) return null;

  // le canal, et les douves
  if (Math.abs(u - uDeule(v)) < 2.5) return EAU;
  const c = versCitadelle(u, v);
  if (c < 99) {
    if (c > 0.5 && c < 3) return EAU;                       // les douves en eau
    if (c >= -1.2 && c <= 0.5) return PAVE;                 // le rempart de brique et pierre
    if (c < -1.2) {
      // l'intérieur : la place d'armes, ses casernes et ses arbres
      if (Math.abs(u - CITADELLE.u) < 1 || Math.abs(v - CITADELLE.v) < 1) return PAVE;
      return ((u + v) & 3) === 0 ? ARBRE : HERBE;
    }
  }

  for (const p of LIEUX_LILLE) {
    if (p.jardin) {
      if (((u - p.u) / p.ru) ** 2 + ((v - p.v) / p.rv) ** 2 < 1) {
        if (Math.abs(v - p.v) < 0.6) return TROTTOIR;
        return ((u * 3 + v) & 3) === 0 ? ARBRE : HERBE;
      }
      continue;
    }
    if (!p.sol) continue;
    if (Math.hypot(u - p.u, v - p.v) < p.r) return p.sol;
  }

  const voie = solDesVoies(BANDES, u, v, BITUME, TROTTOIR);
  if (voie !== null) return voie;

  const t = trameDeLille(u, v);
  const co = Math.cos(t.ang), si = Math.sin(t.ang);
  const du = u - t.cu, dv = v - t.cv;
  const a = du * co - dv * si, b = du * si + dv * co;
  const d = Math.min(
    Math.abs(a - Math.round(a / t.pu) * t.pu),
    Math.abs(b - Math.round(b / t.pv) * t.pv),
  );
  if (d < t.w) return BITUME;
  if (d < t.s) return TROTTOIR;
  return null;
}

export function lotLilleLibre(x, z) {
  const u = x - LILLE.x, v = z - LILLE.z;
  if (Math.hypot(u, v) > LILLE.r) return false;
  if (versCitadelle(u, v) < 6) return false;                // on ne bâtit pas sur le glacis
  if (Math.abs(u - uDeule(v)) < 4) return false;
  return solLille(x, z) === null;
}

// --- les maisons ---------------------------------------------------------------------

// La brique rouge et le pignon à redents : c'est cela, une rue de Lille. Les
// maisons sont étroites — trois blocs — et hautes, parce que l'impôt se payait
// à la largeur de façade.
const BRIQUES = [brique(0), brique(18), brique(17), brique(16), brique(1)];

function tirageLille(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function batirColonneLille(x, z, poser) {
  const u = x - LILLE.x, v = z - LILLE.z;
  const t = trameDeLille(u, v);
  const co = Math.cos(t.ang), si = Math.sin(t.ang);
  const du = u - t.cu, dv = v - t.cv;
  const a = Math.round((du * co - dv * si) / t.pu), b = Math.round((du * si + dv * co) / t.pv);
  const r = tirageLille(a, b, 641);
  const tour = u > 8 && v > -10 && v < 6 && r > 0.72;       // Euralille : quelques tours
  const bh = tour ? 16 + Math.floor(r * 14) : 5 + Math.floor(r * 3);
  const mur = tour ? ACIER : BRIQUES[Math.floor(tirageLille(a, b, 642) * BRIQUES.length) % BRIQUES.length];

  const oE = lotLilleLibre(x + 1, z), oO = lotLilleLibre(x - 1, z);
  const oS = lotLilleLibre(x, z + 1), oN = lotLilleLibre(x, z - 1);
  const dedans = oE && oO && oS && oN;
  const face = (!oE || !oO) ? v : u;

  for (let y = 0; y < bh; y++) {
    if (dedans) { if (y === 0) poser(1, BLOCK.PLANK); continue; }
    const fenetre = y > 0 && y % 2 === 1 && (face & 1) === 1;
    poser(y + 1, fenetre ? VERRE : mur);
  }
  poser(bh + 1, tour ? ACIER : ARDOISE);
  // le pignon à redents : deux marches de pierre blanche au-dessus de la façade
  if (!tour && !dedans && (face & 3) === 1) {
    poser(bh + 2, PIERRE);
    poser(bh + 3, PIERRE);
  }
}

// --- ce que la carte doit peindre -------------------------------------------------------

const GRIS_RUE = [64, 66, 72];
const BEIGE = [214, 202, 176];
const VERT_JARDIN = [96, 156, 84];
const TOIT = [150, 84, 72];

export function couleurCarteLille(x, z) {
  const u = x - LILLE.x, v = z - LILLE.z;
  if (u < -LILLE.r || u > LILLE.r || v < -LILLE.r || v > LILLE.r) return null;
  const sol = solLille(x, z);
  if (sol === null) return Math.hypot(u, v) > LILLE.r ? null : TOIT;
  if (sol === EAU) return null;
  if (sol === ARBRE || sol === HERBE) return VERT_JARDIN;
  if (sol === PAVE) return BEIGE;
  return GRIS_RUE;
}

// --- les monuments -----------------------------------------------------------------------

export const MONUMENTS_LILLE = [
  { nom: "Vieille Bourse", dx: 0.02, dz: 0.02, box: 8 },
  { nom: 'Porte de Paris', dx: 0.35, dz: 0.65, box: 7 },
  { nom: 'Citadelle de Vauban', dx: -1.25, dz: -0.85, box: 18 },
].map((m) => { const [u, v] = de(m.dx, m.dz); return { ...m, u, v }; });

const boite = (poser) => {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
  };
  return { set, bloc };
};

// La Vieille Bourse : vingt-quatre maisons identiques serrées autour d'une cour
// carrée, chacune avec son pignon. Et devant, la colonne de la Déesse.
export function buildVieilleBourse(poser) {
  const { set, bloc } = boite(poser);
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      const bord = Math.abs(dx) === 5 || Math.abs(dz) === 5;
      if (!bord) { set(dx, 0, dz, PAVE); continue; }
      for (let y = 0; y <= 7; y++) set(dx, y, dz, BRIQUE);
      // un pignon tous les deux blocs : ce sont les vingt-quatre maisons
      if ((dx + dz) % 2 === 0) { set(dx, 8, dz, PIERRE); set(dx, 9, dz, PIERRE); }
      if (Math.abs(dx) === 5 && Math.abs(dz) < 4 && dz % 2 === 0) set(dx, 3, dz, VERRE);
      if (Math.abs(dz) === 5 && Math.abs(dx) < 4 && dx % 2 === 0) set(dx, 3, dz, VERRE);
    }
  }
  for (let y = 0; y <= 2; y++) { set(0, y, 5, BLOCK.AIR); set(0, y, -5, BLOCK.AIR); }
  // la colonne de la Déesse, sur la place au nord
  for (let y = 0; y <= 10; y++) set(0, y, -9, PIERRE);
  set(0, 11, -9, OR);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(dx, -1 + 1, dz - 9, PIERRE);
}

// La Porte de Paris : un arc de triomphe pour Louis XIV, tout seul au milieu
// d'un rond-point, avec ses trophées et sa renommée dorée au sommet.
export function buildPorteDeParis(poser) {
  const { set, bloc } = boite(poser);
  bloc(-5, 5, 0, 11, -2, 2, PIERRE);
  bloc(-2, 2, 0, 7, -3, 3, BLOCK.AIR);
  for (let k = 0; k <= 2; k++) {
    for (let dx = -2 + k; dx <= 2 - k; dx++) for (let dz = -3; dz <= 3; dz++) set(dx, 8 + k, dz, BLOCK.AIR);
  }
  for (const dx of [-4, 4]) for (let y = 2; y <= 9; y += 3) { set(dx, y, -2, OR); set(dx, y, 2, OR); }
  bloc(-6, 6, 12, 12, -3, 3, PIERRE);
  for (let k = 0; k <= 3; k++) {
    for (let dx = -4 + k; dx <= 4 - k; dx++) set(dx, 13 + k, 0, PIERRE);
  }
  set(0, 17, 0, OR);
}

// La citadelle : cinq bastions, cinq courtines, la porte royale et la place
// d'armes. Vauban en a construit trois cents ; celle-ci était sa préférée.
export function buildCitadelle(poser) {
  const { set } = boite(poser);
  const { R, pointe } = CITADELLE;
  // le rempart, suivi angle par angle
  for (let i = 0; i < 1440; i++) {
    const a = (i / 1440) * Math.PI * 2;
    const r = R + pointe * Math.cos(5 * (a + 0.3));
    for (let e = 0; e <= 1; e++) {
      const x = Math.round(Math.cos(a) * (r - e)), z = Math.round(Math.sin(a) * (r - e));
      for (let y = 0; y <= 5; y++) set(x, y, z, y >= 4 ? PIERRE : BRIQUE);
      if (e === 0 && i % 12 === 0) set(x, 6, z, PIERRE);      // les créneaux
    }
  }
  // la porte royale, plein est, et son pont sur les douves
  for (let y = 0; y <= 3; y++) for (let dz = -1; dz <= 1; dz++) {
    set(Math.round(R + pointe * Math.cos(5 * 0.3)), y, dz, BLOCK.AIR);
  }
  for (let k = 0; k <= 5; k++) for (let dz = -1; dz <= 1; dz++) set(R + 1 + k, 0, dz, PAVE);
  // les casernes autour de la place d'armes, en brique
  for (const [cx, cz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let y = 0; y <= 4; y++) set(cx + dx, y, cz + dz, BRIQUE_SOMBRE);
        set(cx + dx, 5, cz + dz, ARDOISE);
      }
    }
  }
  // le mât au centre de la place d'armes
  for (let y = 0; y <= 8; y++) set(0, y, 0, PIERRE);
  set(0, 9, 0, OR);
}
