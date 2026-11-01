// LES BANLIEUES DE NEW YORK (v583). Max : « améliorer la ville de New York, créer
// des banlieues, augmenter le réalisme, parce qu'aujourd'hui tout se ressemble. »
//
// Autour de Manhattan il n'y avait que la campagne du monde et la mer. Ce module
// est le PLAN de ce qui l'entoure, dans les coordonnées de Manhattan (origine
// `positionDe('ny')`), et il est pur : aucun import de rendu, lu par le monde, le
// rendu et les témoins sous node. Le plan se branche sur celui de l'île
// (`surface`, `BATIMENTS`, manhattan-plan.js) : les quartiers ont donc tout ce que
// Manhattan a déjà — façades, sol, collisions, passants, voitures, minicarte.
//
// DIX PAYSAGES, ET C'EST CE QUI COMPTE : on ne fabrique pas dix fois la même
// ville. Un front d'Hudson en brique (Hoboken, Jersey City), des barres et des
// pelouses (le Bronx), des rangées de grès brun et un grand parc à lac (Brooklyn),
// des rues basses (Queens), des pavillons sur des rues courbes (Fort Lee, Long
// Island), une île boisée (Staten Island), un port à conteneurs (Port Newark), une
// plage et sa promenade de planches (Coney Island).
//
// LA GÉOGRAPHIE EST CELLE QU'ON RECONNAÎT SUR UN PLAN, PAS UNE MESURE : la carte
// comprime Manhattan (480 × 2 300 blocs). Ce qui compte : l'Hudson à l'ouest, l'East
// River à l'est, le Bronx au nord, Brooklyn et Coney Island au sud-est, Staten
// Island dans la baie.
//
// L'INVARIANT 1, ET COMMENT IL TIENT (CLAUDE.md, « Les banlieues de New York »).
// Dans `ZONES`, plus `TALUS` blocs autour, `terrainHeight` change : c'est une casse
// DÉCLARÉE (décision de Max) et BORNÉE, et la borne se vérifie (`plafond.js`). Les
// zones sont MESURÉES : hors des routes (I-95, I-95 Sud), de JFK, de Liberty Island
// et de tout repère (`tests/sonde-banlieues-sites.mjs`). Un bloc posé par un enfant
// avant `DATE_BANLIEUES` garde sa colonne de relief, sa marge de deux blocs, et le
// bâtiment qui y tomberait s'efface (`TerreUrbaine.refreshProtection`).
import { FORMES_QUARTIERS as F } from "./new-york-quartiers-donnees.js";

// La date se relit à la fusion (v309).
export const DATE_BANLIEUES = Date.parse("2026-11-01T15:08:35Z");
export const TALUS = 28;
export const CREDIT_QUARTIERS =
  '"CCity Building Set 1" (https://sketchfab.com/3d-models/ccity-building-set-1-a2d5c7bfcc2148fb8994864c43dfcc97) by Neberkenezer (https://sketchfab.com/neberkenezer), CC-BY-4.0';

// le même tirage que `ALEA` (manhattan-plan.js), sans dépendance circulaire
const alea = (a, b = 0) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ 90210;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// ---- les zones ----------------------------------------------------------------
// `cotes` : les côtés du rectangle qui sont un rivage, et sa largeur d'eau moyenne.
// `ax`, `az` : le pas de la trame ; `ra`, `rr` : la demi-chaussée des avenues (qui
// courent le long de z) et des rues (le long de x) ; `mix` : ce qu'on y bâtit.
export const ZONES = [
  {
    id: "hoboken", nom: "Hoboken", genre: "ville", x0: -430, x1: -240, z0: -700, z1: 50,
    cotes: { est: 16 }, rive: "promenade", ax: 62, az: 44, ra: 4, rr: 3,
    mix: [["immeuble", 5], ["brownstone", 7], ["appartements", 3], ["lavomatique", 1], ["cinema", 0.4]],
    hauteurs: [12, 15, 18],
  },
  {
    id: "fortlee", nom: "Fort Lee", genre: "pavillons", x0: -620, x1: -240, z0: -1250, z1: -730,
    cotes: { est: 18 }, rive: "foret", ax: 150, az: 44,
  },
  {
    id: "jersey", nom: "Jersey City", genre: "ville", x0: -450, x1: -240, z0: 350, z1: 1120,
    cotes: { est: 20, sud: 22 }, rive: "promenade", ax: 72, az: 48, ra: 4, rr: 3,
    mix: [["immeuble", 4], ["appartements", 5], ["brownstone", 4], ["clinique", 0.6], ["barre", 0.8], ["lavomatique", 1]],
    hauteurs: [12, 18, 24],
  },
  {
    id: "newark", nom: "Port Newark", genre: "port", x0: -690, x1: -450, z0: 800, z1: 1160,
    cotes: { sud: 26 }, ax: 86, az: 74, ra: 5, rr: 4,
  },
  {
    id: "bronx", nom: "The Bronx", genre: "barres", x0: -230, x1: 360, z0: -1790, z1: -1300,
    cotes: {}, ax: 84, az: 74, ra: 5, rr: 3,
    mix: [["barre", 5], ["appartements", 3], ["clinique", 0.7], ["immeuble", 2], ["basket", 1.4]],
  },
  {
    id: "queens", nom: "Queens", genre: "ville", x0: 240, x1: 900, z0: -820, z1: -420,
    cotes: { ouest: 22 }, rive: "promenade", ax: 70, az: 40, ra: 4, rr: 3,
    mix: [["appartements", 5], ["lavomatique", 2.5], ["immeuble", 3], ["brownstone", 2], ["cinema", 0.4], ["clinique", 0.3]],
    hauteurs: [9, 12, 15],
    parcs: [{ nom: "Flushing Meadows", x0: 690, x1: 880, z0: -760, z1: -470, lac: true }],
  },
  {
    id: "brooklyn", nom: "Brooklyn", genre: "ville", x0: 240, x1: 760, z0: -130, z1: 1050,
    cotes: { ouest: 24 }, rive: "promenade", ax: 86, az: 44, ra: 4, rr: 3,
    mix: [["brownstone", 10], ["immeuble", 3], ["appartements", 2], ["cinema", 0.5], ["lavomatique", 1], ["clinique", 0.25]],
    hauteurs: [9, 12, 12, 15],
    parcs: [{ nom: "Prospect Park", x0: 470, x1: 690, z0: 360, z1: 700, lac: true }],
    diagonales: [{ x0: 290, z0: 40, x1: 720, z1: 1040, demi: 5 }],
  },
  {
    id: "coney", nom: "Coney Island", genre: "plage", x0: 240, x1: 1120, z0: 1050, z1: 1400,
    cotes: { ouest: 26, sud: 40, est: 44 }, ax: 90, az: 42, ra: 4, rr: 3,
    mix: [["immeuble", 3], ["appartements", 4], ["lavomatique", 2], ["cinema", 0.8], ["brownstone", 3]],
    hauteurs: [9, 12],
  },
  {
    id: "longisland", nom: "Long Island", genre: "pavillons", x0: 760, x1: 1420, z0: -130, z1: 1050,
    cotes: { nord: 34, est: 50 }, rive: "plage", ax: 170, az: 42,
    parcs: [{ nom: "Hempstead Lake", x0: 1050, x1: 1230, z0: 280, z1: 560, lac: true }],
  },
  {
    id: "staten", nom: "Staten Island", genre: "pavillons", x0: -640, x1: -270, z0: 1330, z1: 1900,
    cotes: { nord: 40, est: 44, sud: 50, ouest: 40 }, rive: "plage", ax: 120, az: 46,
    parcs: [{ nom: "Greenbelt", x0: -560, x1: -360, z0: 1500, z1: 1720, lac: false, foret: true }],
  },
];

export const BOITE_ZONES = ZONES.reduce(
  (b, q) => ({ x0: Math.min(b.x0, q.x0), x1: Math.max(b.x1, q.x1), z0: Math.min(b.z0, q.z0), z1: Math.max(b.z1, q.z1) }),
  { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity },
);
let derniere = ZONES[0];
export function zoneA(x, z) {
  if (x < BOITE_ZONES.x0 || x >= BOITE_ZONES.x1 || z < BOITE_ZONES.z0 || z >= BOITE_ZONES.z1) return null;
  const d = derniere;
  if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  for (const q of ZONES) if (x >= q.x0 && x < q.x1 && z >= q.z0 && z < q.z1) return (derniere = q);
  return null;
}
// Dans une zone (ou à `marge` blocs d'une zone) ?
export function dansZones(x, z, marge = 0) {
  if (x < BOITE_ZONES.x0 - marge || x >= BOITE_ZONES.x1 + marge || z < BOITE_ZONES.z0 - marge || z >= BOITE_ZONES.z1 + marge) return false;
  for (const q of ZONES) if (x >= q.x0 - marge && x < q.x1 + marge && z >= q.z0 - marge && z < q.z1 + marge) return true;
  return false;
}
// Deux coins dans la MÊME zone : le morceau est tout entier dans le plan.
export function memeZone(x0, z0, x1, z1) {
  const q = zoneA(x0, z0);
  return !!q && x1 < q.x1 && z1 < q.z1 && x1 >= q.x0 && z1 >= q.z0;
}

// ---- les ponts ------------------------------------------------------------------
// Une chaussée sur l'eau, dans l'axe d'une rue de Manhattan (les rues sont tous
// les 19,2 blocs). Sans eux, on n'irait aux banlieues qu'en volant.
export const PONTS = [
  { nom: "Pont de Queensboro", axe: "x", z: -614.4, a: 170, b: 262, demi: 5, style: "acier" },
  { nom: "Pont de Williamsburg", axe: "x", z: 134.4, a: 170, b: 264, demi: 5, style: "acier" },
  { nom: "Pont de Brooklyn", axe: "x", z: 576, a: 170, b: 268, demi: 5, style: "granit" },
  { nom: "Pont George-Washington", axe: "x", z: -1056, a: -258, b: -160, demi: 6, style: "acier" },
  { nom: "Pont de l'Hudson", axe: "x", z: -268.8, a: -256, b: -170, demi: 5, style: "acier" },
  { nom: "Pont de Jersey City", axe: "x", z: 672, a: -260, b: -150, demi: 5, style: "granit" },
  { nom: "Pont de Harlem", axe: "z", x: 40, a: -1320, b: -1236, demi: 4, style: "acier" },
];
export function pontA(x, z) {
  for (const p of PONTS) {
    const l = p.axe === "x" ? x : z, t = p.axe === "x" ? z - p.z : x - p.x;
    if (l >= p.a && l < p.b && Math.abs(t) < p.demi) return p;
  }
  return null;
}

// ---- le sol ------------------------------------------------------------------------
// Un rivage n'est pas une règle : trois sinus, jamais les mêmes d'une zone à l'autre,
// et leur amplitude suit la largeur d'eau déclarée pour ne jamais sortir de la zone.
const rivage = (q, t, k, c) => {
  const A = Math.min(c * 0.7, 30);
  return A * (0.55 * Math.sin(t * 0.0093 + k * 1.7 + q.x0 * 0.01) + 0.3 * Math.sin(t * 0.027 + k * 2.3) + 0.15 * Math.sin(t * 0.071 + k));
};
// Deux côtés se rejoignent en courbe : un coin droit dans la mer se voit du ciel.
const ARRONDI = 70;
const unir = (a, b) => (a < ARRONDI && b < ARRONDI ? ARRONDI - Math.hypot(ARRONDI - a, ARRONDI - b) : Math.min(a, b));
// Distance au rivage, positive à terre, négative dans l'eau. Infinity sans rivage.
export function distanceRivage(q, x, z) {
  let d = Infinity;
  const c = q.cotes;
  if (c.est) d = unir(d, q.x1 - x - c.est - rivage(q, z, 1, c.est));
  if (c.ouest) d = unir(d, x - q.x0 - c.ouest - rivage(q, z, 2, c.ouest));
  if (c.nord) d = unir(d, z - q.z0 - c.nord - rivage(q, x, 3, c.nord));
  if (c.sud) d = unir(d, q.z1 - z - c.sud - rivage(q, x, 4, c.sud));
  return d;
}
const parcA = (q, x, z) => q.parcs?.find((p) => x >= p.x0 && x < p.x1 && z >= p.z0 && z < p.z1) || null;
function surfaceParc(p, x, z) {
  const cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2, rx = (p.x1 - p.x0) / 2, rz = (p.z1 - p.z0) / 2;
  const u = (x - cx) / rx, v = (z - cz) / rz, r = Math.hypot(u, v);
  if (p.lac && Math.hypot((x - cx - rx * 0.12) / (rx * 0.46), (z - cz + rz * 0.1) / (rz * 0.36)) + 0.12 * Math.sin(x * 0.04 + z * 0.03) < 1) return "water";
  // deux allées qui se croisent, une ronde
  if (Math.abs(r - 0.82) < 0.018 || Math.abs(x - cx + 8 * Math.sin(z * 0.02)) < 2 || Math.abs(z - cz + rz * 0.62 + 6 * Math.sin(x * 0.03)) < 2) return "path";
  return p.foret ? "foret" : "grass";
}
// Les rues courbes d'un quartier de pavillons : chaque rue a son sinus.
export const zRue = (q, k, x) => k * q.az + 8 * Math.sin(x * 0.019 + k * 2.1) + 3 * Math.sin(x * 0.047 + k);
export const xRue = (q, k, z) => k * q.ax + 10 * Math.sin(z * 0.017 + k * 1.3);
function surfacePavillons(q, x, z) {
  const k = Math.round(z / q.az), j = Math.round(x / q.ax);
  for (const n of [k - 1, k, k + 1]) if (Math.abs(z - zRue(q, n, x)) < 2.8) return "road";
  for (const n of [j - 1, j, j + 1]) if (Math.abs(x - xRue(q, n, z)) < 3.2) return "road";
  return "gazon";
}
const surDiagonale = (q, x, z) => {
  for (const d of q.diagonales || []) {
    const lx = d.x1 - d.x0, lz = d.z1 - d.z0, l2 = lx * lx + lz * lz;
    const t = Math.max(0, Math.min(1, ((x - d.x0) * lx + (z - d.z0) * lz) / l2));
    const e = Math.hypot(x - d.x0 - t * lx, z - d.z0 - t * lz);
    if (e < d.demi) return "road";
    if (e < d.demi + 2) return "sidewalk";
  }
  return null;
};
const BASSINS = (q) => q.bassins || (q.bassins = q.genre === "port"
  ? [0, 1, 2].map((i) => ({ x0: q.x0 + 30 + i * 52, x1: q.x0 + 50 + i * 52, z0: q.z1 - 170, z1: q.z1 }))
  : []);
export function surfaceDeZone(q, x, z) {
  const d = distanceRivage(q, x, z);
  if (d < 0) return "water";
  if (q.genre === "plage" && z > q.z1 - q.cotes.sud - 86) {
    // la plage de sable, puis la promenade de planches, tout le long du sud
    if (d < 46) return "beach";
    if (d < 54) return "boardwalk";
  }
  if (q.genre === "plage" && d < 12) return "path";
  if (d < 10) {
    if (q.rive === "promenade") return "path";
    if (q.rive === "plage") return "beach";
    if (q.rive === "foret") return "foret";
  }
  if (q.genre === "port") {
    for (const b of BASSINS(q)) if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1) return "water";
    // un port n'a pas de trottoirs : du béton, et des voies larges
    const a = Math.abs(x - Math.round(x / q.ax) * q.ax), r = Math.abs(z - Math.round(z / q.az) * q.az);
    if (r < q.rr || a < q.ra) return "road";
    return "quai";
  }
  const p = parcA(q, x, z);
  if (p) return surfaceParc(p, x, z);
  if (q.genre === "pavillons") return surfacePavillons(q, x, z);
  const diag = surDiagonale(q, x, z);
  if (diag) return diag;
  const a = Math.abs(x - Math.round(x / q.ax) * q.ax), r = Math.abs(z - Math.round(z / q.az) * q.az);
  if (a < q.ra || r < q.rr) return "road";
  if (a < q.ra + 2 || r < q.rr + 2) return "sidewalk";
  if (q.genre === "barres") return "gazon";
  // un pâté que le bord de la zone coupe n'a rien de bâti : un square, pas une dalle
  const j = Math.floor(x / q.ax), k = Math.floor(z / q.az);
  if (j * q.ax + q.ra + 2.6 < q.x0 || (j + 1) * q.ax - q.ra - 2.6 > q.x1) return "gazon";
  return "lot";
}
// La surface du plan, ou null hors des quartiers et des ponts.
export function surfaceBanlieue(x, z) {
  const q = zoneA(x, z);
  const s = q ? surfaceDeZone(q, x, z) : null;
  // un pont ne remplace que l'eau : il atterrit sur la rue qui l'attend
  if (s === null || s === "water") {
    const p = pontA(x, z);
    if (p) return Math.abs((p.axe === "x" ? z - p.z : x - p.x)) < p.demi - 1.6 ? "road" : "sidewalk";
  }
  return s;
}
// La plage descend vers l'eau : trois marches, jamais un mur.
export function solDeBanlieue(x, z, SOL) {
  const q = zoneA(x, z);
  if (!q) return SOL;
  if (surfaceDeZone(q, x, z) !== "beach") return SOL;
  const d = distanceRivage(q, x, z);
  return d < 10 ? SOL - 2 : d < 26 ? SOL - 1 : SOL;
}

// ---- le bâti -------------------------------------------------------------------------
// Rien ne se pose sur ce qui n'est pas un lot : on sonde le périmètre et le centre.
function libre(q, x0, x1, z0, z1, permis) {
  for (let x = x0; x <= x1; x += Math.max(2, (x1 - x0) / 6)) for (const z of [z0, (z0 + z1) / 2, z1]) if (!permis.has(surfaceDeZone(q, x, z))) return false;
  for (let z = z0; z <= z1; z += Math.max(2, (z1 - z0) / 6)) for (const x of [x0, x1]) if (!permis.has(surfaceDeZone(q, x, z))) return false;
  return true;
}
const SOL_LOT = new Set(["lot", "gazon", "quai"]);
const pris = (mix, r) => {
  const total = mix.reduce((n, [, p]) => n + p, 0);
  let t = r * total;
  for (const [k, p] of mix) { t -= p; if (t <= 0) return k; }
  return mix[0][0];
};
const TEINTES = [[1, 1, 1], [1.06, 1, 0.94], [0.93, 0.95, 1], [1.1, 1.05, 0.98], [0.9, 0.88, 0.86]];
// Une forme du paquet, posée à l'échelle du paquet. `cap` amène sa devanture face à
// la rue ; le voxel est son corps (`h` : les couches sous le toit).
function posee(q, nom, cx, cz, cap) {
  const f = F[nom], quart = Math.abs(Math.sin(cap)) > 0.5;
  const w = Math.round(quart ? f.p : f.l), d = Math.round(quart ? f.l : f.p);
  const x0 = Math.round(cx - w / 2), z0 = Math.round(cz - d / 2);
  return {
    x0, x1: x0 + w, z0, z1: z0 + d,
    h: nom === "basket" ? -1 : Math.max(2, Math.floor(f.h) - 1),
    hModele: f.h,
    mat: nom === "conserverie" ? "limestone" : nom === "clinique" || nom === "barre" ? "limestone" : "brick",
    style: nom === "basket" ? "terrain" : "masonry",
    modele: nom, cap,
    teinte: TEINTES[Math.floor(alea(x0, z0) * TEINTES.length)],
    quartier: q.id, sansPorte: true,
  };
}
const brownstone = (q, x0, z0, w, d, r) => ({
  x0, x1: x0 + w, z0, z1: z0 + d,
  h: q.hauteurs[Math.floor(r * q.hauteurs.length)],
  mat: alea(x0, z0 + 7) < 0.72 ? "brownstone" : "brick",
  style: "masonry", quartier: q.id,
});
const LARGEUR = (nom) => (nom === "brownstone" ? 8 : nom === "lavomatique" ? 18 : F[nom].l);
const PROFONDEUR = (nom) => (nom === "brownstone" ? 12 : nom === "lavomatique" ? 18 : F[nom].p);
// Une rangée le long d'une rue : la devanture regarde la rue, on avance jusqu'au
// bout du pâté. Une forme qui ne tient plus laisse la place à la suivante.
function rangee(q, out, x0, x1, zRangee, sens, graine) {
  let x = x0, i = 0;
  while (x < x1 - 7) {
    const r = alea(graine + i, Math.round(x));
    let nom = pris(q.mix, r);
    if (LARGEUR(nom) > x1 - x) nom = "brownstone";
    if (LARGEUR(nom) > x1 - x) break;
    const w = LARGEUR(nom), d = PROFONDEUR(nom);
    const z0 = sens > 0 ? zRangee - d : zRangee, z1 = z0 + d;
    if (libre(q, x, x + w, z0, z1, SOL_LOT)) {
      if (nom === "brownstone") out.push(brownstone(q, Math.round(x), Math.round(z0), 8, 12, alea(x, i + 3)));
      else out.push(posee(q, nom, x + w / 2, (z0 + z1) / 2, sens > 0 ? 0 : Math.PI));
    }
    x += w + (nom === "brownstone" ? 0 : 1 + Math.floor(alea(i, graine) * 3));
    i++;
  }
}
function batirVille(q, out) {
  const sw = 2;
  for (let k = Math.ceil(q.z0 / q.az); k * q.az < q.z1; k++)
    for (let j = Math.ceil(q.x0 / q.ax); j * q.ax < q.x1; j++) {
      const bx0 = j * q.ax + q.ra + sw + 0.6, bx1 = (j + 1) * q.ax - q.ra - sw - 0.6;
      const bz0 = k * q.az + q.rr + sw + 0.6, bz1 = (k + 1) * q.az - q.rr - sw - 0.6;
      if (bx0 < q.x0 || bx1 > q.x1) continue;
      if (q.genre === "barres") {
        const g = j * 991 + k * 37;
        if (alea(j * 3 + 1, k * 5) < 0.62) {
          // un pâté de rue : deux rangées d'immeubles, comme ailleurs, sur leur herbe
          const basse = { ...q, mix: [["immeuble", 4], ["appartements", 4], ["lavomatique", 1], ["clinique", 0.5]], hauteurs: [12, 15] };
          rangee(basse, out, bx0, bx1, bz0, -1, g);
          rangee(basse, out, bx0, bx1, bz1, 1, g + 500);
        } else {
          // ce qui fait le Bronx : deux barres sur leur pelouse, un terrain de basket
          const cx = (bx0 + bx1) / 2 + (alea(j, k + 3) - 0.5) * 6;
          for (const [pz, cap] of [[bz0 + 9, Math.PI], [bz1 - 9, 0]]) {
            const b = posee(q, "barre", cx, pz, cap);
            if (libre(q, b.x0, b.x1, b.z0, b.z1, SOL_LOT)) out.push(b);
          }
          const t = posee(q, "basket", (bx0 + bx1) / 2, (bz0 + bz1) / 2, Math.PI / 2);
          if (libre(q, t.x0, t.x1, t.z0, t.z1, SOL_LOT)) out.push(t);
        }
        continue;
      }
      // deux rangées dos à dos : la première regarde le nord, la seconde le sud
      const g = j * 1009 + k * 31;
      rangee(q, out, bx0, bx1, bz0, -1, g);
      const avant = out.length;
      rangee(q, out, bx0, bx1, bz1, 1, g + 500);
      // la seconde rangée ne mord jamais la première (un pâté étroit)
      for (let i = out.length - 1; i >= avant; i--) {
        const b = out[i];
        if (out.slice(0, avant).some((a) => a.quartier === q.id && a.x1 > b.x0 && a.x0 < b.x1 && a.z1 > b.z0 && a.z0 < b.z1)) out.splice(i, 1);
      }
    }
}
// Un pavillon : un rez-de-chaussée et un étage, un toit à deux pentes, garé sur sa
// rue. Pas de modèle au paquet : c'est du dessin (`maison`, manhattan-render.js).
const COULEURS_MAISON = [[1, 0.98, 0.92], [0.86, 0.91, 0.96], [0.97, 0.87, 0.76], [0.8, 0.84, 0.74], [1, 0.9, 0.86], [0.92, 0.92, 0.9], [0.74, 0.8, 0.88]];
function batirPavillons(q, out) {
  for (let k = Math.ceil(q.z0 / q.az); k * q.az < q.z1; k++)
    for (let x = q.x0 + 8; x < q.x1 - 8; ) {
      const r = alea(Math.round(x), k * 7);
      const w = 9 + Math.floor(r * 4), pas = w + 8 + Math.floor(alea(k, Math.round(x)) * 10);
      for (const sens of [-1, 1]) {
        if (alea(Math.round(x) + sens, k) < 0.14) continue;
        const d = 8 + Math.floor(alea(k + sens, Math.round(x)) * 3);
        const zr = zRue(q, k, x);
        const z0 = Math.round(sens > 0 ? zr + 8 : zr - 8 - d), x0 = Math.round(x);
        if (!libre(q, x0 - 1, x0 + w + 1, z0 - 1, z0 + d + 1, SOL_LOT)) continue;
        out.push({
          x0, x1: x0 + w, z0, z1: z0 + d, h: 5,
          mat: "limestone", style: "maison", cap: sens > 0 ? Math.PI : 0, sansPorte: true,
          teinte: COULEURS_MAISON[Math.floor(alea(x0, z0) * COULEURS_MAISON.length)],
          toit: alea(z0, x0) < 0.5 ? "roof" : "wood",
          quartier: q.id,
        });
      }
      x += pas;
    }
}
function batirPort(q, out) {
  for (let k = Math.ceil(q.z0 / q.az); k * q.az < q.z1; k++)
    for (let j = Math.ceil(q.x0 / q.ax); j * q.ax < q.x1; j++) {
      const bx0 = j * q.ax + q.ra + 1, bx1 = (j + 1) * q.ax - q.ra - 1, bz0 = k * q.az + q.rr + 1, bz1 = (k + 1) * q.az - q.rr - 1;
      if (bx0 < q.x0 || bx1 > q.x1) continue;
      const r = alea(j, k);
      if (r < 0.72) {
        const cap = alea(j + 2, k) < 0.5 ? 0 : Math.PI;
        const b = posee(q, "conserverie", (bx0 + bx1) / 2, bz0 + 12, cap);
        if (libre(q, b.x0, b.x1, b.z0, b.z1, SOL_LOT)) { b.mat = "brick"; out.push(b); }
      }
      // les conteneurs : des piles sur le quai, un voxel plein de leur hauteur
      for (let n = 0; n < 16; n++) {
        const w = 6, d = 14, x0 = Math.round(bx0 + 2 + (n % 8) * 8), z0 = Math.round(bz1 - 16 - (n >> 3) * 17);
        if (z0 < bz0 + 26 && r < 0.72) continue;
        if (alea(x0, z0) < 0.25) continue;
        if (!libre(q, x0, x0 + w, z0, z0 + d, SOL_LOT)) continue;
        out.push({
          x0, x1: x0 + w, z0, z1: z0 + d, h: 2 + Math.floor(alea(z0, x0) * 3) * 3, mat: "brick", style: "conteneurs", sansPorte: true,
          graine: Math.floor(alea(x0, z0 + 3) * 1000), quartier: q.id,
        });
      }
    }
}
export function batimentsBanlieues() {
  const out = [];
  for (const q of ZONES) {
    if (q.genre === "pavillons") batirPavillons(q, out);
    else if (q.genre === "port") batirPort(q, out);
    else batirVille(q, out);
  }
  // une forme ne tombe jamais dans sa voisine : le premier posé garde sa place
  const grille = new Map(), gardes = [];
  for (const b of out) {
    let pris = false;
    const cases = [];
    for (let a = Math.floor(b.x0 / 32); a <= Math.floor(b.x1 / 32); a++)
      for (let c = Math.floor(b.z0 / 32); c <= Math.floor(b.z1 / 32); c++) cases.push(`${a},${c}`);
    for (const k of cases) for (const v of grille.get(k) || []) if (v.x1 > b.x0 && v.x0 < b.x1 && v.z1 > b.z0 && v.z0 < b.z1) pris = true;
    if (pris) continue;
    // et le tour exact : l'arrondi d'un lot ne le pose jamais sur une rue ni dans l'eau
    const q = zoneA(b.x0, b.z0);
    let bord = !q || b.x1 > q.x1 || b.z1 > q.z1;
    for (let x = b.x0; x < b.x1 && !bord; x++) for (const z of [b.z0, b.z1 - 1]) if (!SOL_LOT.has(surfaceDeZone(q, x + 0.5, z + 0.5))) bord = true;
    for (let z = b.z0; z < b.z1 && !bord; z++) for (const x of [b.x0, b.x1 - 1]) if (!SOL_LOT.has(surfaceDeZone(q, x + 0.5, z + 0.5))) bord = true;
    if (bord) continue;
    gardes.push(b);
    for (const k of cases) { if (!grille.has(k)) grille.set(k, []); grille.get(k).push(b); }
  }
  return gardes;
}

// ---- ce qui se voit de loin et qu'on ne visite pas --------------------------------------
// Les décors n'ont pas de bloc : une pièce au sol note son obstacle pour la voiture.
export const DECORS = [
  { type: "roue", nom: "Grande roue de Coney Island", x: 560, z: 1215, r: 18 },
  { type: "montagnes", nom: "Montagnes russes", x: 700, z: 1218 },
  { type: "phare", nom: "Phare de Long Island", x: 1370, z: 500 },
  { type: "phare", nom: "Phare de Staten Island", x: -290, z: 1860 },
  { type: "globe", nom: "Le globe de Flushing Meadows", x: 785, z: 0 - 545, r: 14 },
  { type: "grue", x: -622, z: 1000, cap: 0 },
  { type: "grue", x: -570, z: 1000, cap: 0 },
  { type: "grue", x: -518, z: 1000, cap: 0 },
];

// ---- ce que la carte connaît ------------------------------------------------------------
const centre = (q) => ({ x: (q.x0 + q.x1) / 2, z: (q.z0 + q.z1) / 2, r: Math.min(q.x1 - q.x0, q.z1 - q.z0) / 2 });
export const QUARTIERS_BANLIEUE = [
  ...ZONES.map((q) => ({ name: q.nom, ...centre(q) })),
  { name: "Prospect Park", x: 580, z: 530, r: 90 },
  { name: "Flushing Meadows", x: 785, z: -615, r: 90 },
  { name: "Coney Island · la plage", x: 620, z: 1320, r: 60 },
];
export const COULEURS_BANLIEUE = {
  beach: [214, 196, 150],
  boardwalk: [136, 104, 76],
  gazon: [96, 128, 78],
  foret: [58, 92, 58],
  quai: [132, 134, 130],
};

// ---- les voitures ---------------------------------------------------------------------
// Un tour de pâté tous les trois pâtés : ce qui roule se voit, sans remplir la carte.
export function boucles() {
  const out = [];
  for (const q of ZONES) {
    if (q.genre === "pavillons") continue;
    for (let k = Math.ceil(q.z0 / q.az); (k + 1) * q.az < q.z1; k += 2)
      for (let j = Math.ceil(q.x0 / q.ax) + ((k >> 1) % 2 ? 1 : 0); (j + 1) * q.ax < q.x1; j += 3) {
        const x = j * q.ax, z = k * q.az;
        out.push([
          [x + 1.6, z + 1.2],
          [x + 1.6, z + q.az - 1.2],
          [x + q.ax - 1.6, z + q.az - 1.2],
          [x + q.ax - 1.6, z + 1.2],
        ]);
      }
  }
  return out;
}
