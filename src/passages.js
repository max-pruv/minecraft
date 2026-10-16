// LES PASSAGES PIÉTONS EN BIAIS (v421) — la règle pure, lue par le mailleur
// (qui dessine les bandes), par main.js (où un passant traverse) et, sous
// node, par les témoins. Aucun bloc écrit : l'invariant 1 tient par
// construction.
//
// POURQUOI. Les villes engendrées dont la trame suit les axes du monde (`t.net`,
// 65 sur 267) peignent leur passage dans la TUILE d'un bloc (`PASSAGE_NS`,
// `PASSAGE_EO`). Une tuile ne se tourne pas : Rome, Zurich, Tokyo… — toutes les
// trames en biais — n'avaient aucun passage, et leurs passants ne traversaient
// qu'aux feux. La règle est EXACTEMENT celle de `solVillesMonde` pour les
// trames alignées (la bande va de `wX + 0,4` à `wX + 2,1` du croisement, dans
// toute la chaussée de la rue), écrite cette fois dans le repère de la trame,
// et dessinée en géométrie : des bandes de cinquante centimètres, une par bloc
// en travers, dans l'axe de la circulation — celles de Paris (v287).
import { villeMondeEn, solVillesMonde } from './villesmonde.js';
import { CITY_BLOCK } from './blocks.js';
import { carrefoursDeVoies } from './voies.js';
import { VOIES_LONDRES, LONDRES, solLondres } from './londres.js';
import { VOIES_NICE, NICE, solNice } from './nice.js';
import { VOIES_LILLE, LILLE, solLille } from './lille.js';
import { VOIES_SF, SF, solSF } from './sanfrancisco.js';
import { VOIES_CIRCUITS_DC, WASHINGTON, solWashington } from './washington.js';

export const BANDE_DEBUT = 0.4;    // du bord de la chaussée croisée
export const BANDE_FIN = 2.1;
export const LARGEUR_BANDE = 0.5;  // une bande de 0,5, un vide de 0,5

// La trame d'une fiche qui porte des passages en biais, ou null.
function trameEnBiais(f) {
  const t = f && f.trame;
  if (!t || t.ruelles || t.net) return null;
  return t;
}

// Le passage sous le point (x, z) d'une ville engendrée en biais, ou null.
// Rend { ux, uz, raye } : (ux, uz) la direction de la rue (celle des bandes et
// de la circulation), `raye` vrai sur une bande peinte, faux dans un vide.
// `sol` dit si la colonne est de la chaussée de la trame (BITUME) : sans lui,
// une place, un parc, un pont auraient leur passage.
export function passageEn(x, z) {
  const f = villeMondeEn(x, z);
  const t = trameEnBiais(f);
  if (!t) return passageVilleMain(x, z);
  const u = x - f.ancre.x, v = z - f.ancre.z;
  if (t.sud && v / f.K > t.sud) return null;
  const co = Math.cos(t.ang), si = Math.sin(t.ang);
  const a = u * co - v * si, b = u * si + v * co;
  if (t.axe && Math.min(Math.abs(a), Math.abs(b)) < t.axe.s) return null;
  const ia = Math.round(a / t.pu), ib = Math.round(b / t.pv);
  const ra0 = a - ia * t.pu, rb0 = b - ib * t.pv;
  if (Math.min(Math.abs(ra0), Math.abs(rb0)) >= t.w) return null;
  const pres = Math.abs(ra0) < Math.abs(rb0);
  const travers = pres ? ra0 : rb0;
  const versCarrefour = pres ? Math.abs(rb0) : Math.abs(ra0);
  const wX = t.axe && (pres ? ib : ia) === 0 ? t.axe.w : t.w;
  if (!(versCarrefour > wX + BANDE_DEBUT && versCarrefour < wX + BANDE_FIN)) return null;
  // le sol de la colonne doit être la chaussée de la trame : la place, les
  // parcs, l'eau et les voies nommées passent avant elle dans `solVillesMonde`
  if (solVillesMonde(Math.floor(x) + 0.5, Math.floor(z) + 0.5) !== CITY_BLOCK.ASPHALT) return null;
  // la rue « à a constant » court le long de b : (si, co) dans le monde
  const ux = pres ? si : co, uz = pres ? co : -si;
  const k = travers - Math.round(travers);
  return { ux, uz, raye: Math.abs(k) < LARGEUR_BANDE / 2 };
}

// Les bandes peintes qui touchent la colonne (cx, cz) : des polygones convexes
// en coordonnées du MONDE (le carré de la colonne découpé par chaque bande),
// pour le mailleur. Vide hors d'un passage en biais.
export function bandesDeColonne(cx, cz, quoi = { biais: true, villes: true }) {
  const xc = cx + 0.5, zc = cz + 0.5;
  const f = villeMondeEn(xc, zc);
  const t = trameEnBiais(f);
  if (!t) return quoi.villes ? bandesVilleMain(cx, cz) : [];
  if (!quoi.biais || !passageEnColonne(cx, cz)) return [];
  const co = Math.cos(t.ang), si = Math.sin(t.ang);
  const versT = (x, z) => { const u = x - f.ancre.x, v = z - f.ancre.z; return [u * co - v * si, u * si + v * co]; };
  const versM = (a, b) => [a * co + b * si + f.ancre.x, -a * si + b * co + f.ancre.z];
  const carre = [[cx, cz], [cx + 1, cz], [cx + 1, cz + 1], [cx, cz + 1]].map(([x, z]) => versT(x, z));
  const [ac, bc] = versT(xc, zc);
  const ia = Math.round(ac / t.pu), ib = Math.round(bc / t.pv);
  const ra0 = ac - ia * t.pu, rb0 = bc - ib * t.pv;
  const pres = Math.abs(ra0) < Math.abs(rb0);
  const wX = t.axe && (pres ? ib : ia) === 0 ? t.axe.w : t.w;
  const out = [];
  // les bandes de la rue : entières de `travers`, dans la chaussée de la rue,
  // sur la bande d'approche du carrefour (des deux côtés du croisement)
  const centreT = pres ? ia * t.pu : ib * t.pv, centreL = pres ? ib * t.pv : ia * t.pu;
  const tr0 = (pres ? ra0 : rb0);
  for (let k = Math.round(tr0) - 1; k <= Math.round(tr0) + 1; k++) {
    if (Math.abs(k) + LARGEUR_BANDE / 2 > t.w - 0.15) continue;
    for (const s of [1, -1]) {
      const l0 = centreL + s * (wX + BANDE_DEBUT), l1 = centreL + s * (wX + BANDE_FIN);
      const lo = Math.min(l0, l1), hi = Math.max(l0, l1);
      const tlo = centreT + k - LARGEUR_BANDE / 2, thi = centreT + k + LARGEUR_BANDE / 2;
      // la bande en (a, b) : travers sur l'axe de la rue, long sur l'autre
      const [amin, amax, bmin, bmax] = pres ? [tlo, thi, lo, hi] : [lo, hi, tlo, thi];
      const poly = decouper(carre, amin, amax, bmin, bmax);
      if (poly.length >= 3) out.push(poly.map(([a, b]) => versM(a, b)));
    }
  }
  return out;
}

// La colonne porte-t-elle un passage (son centre ou un coin dans la bande) ?
function passageEnColonne(cx, cz) {
  return !!(passageEn(cx + 0.5, cz + 0.5) || passageEn(cx + 0.05, cz + 0.05) || passageEn(cx + 0.95, cz + 0.05)
    || passageEn(cx + 0.05, cz + 0.95) || passageEn(cx + 0.95, cz + 0.95));
}

// Sutherland–Hodgman : un polygone découpé par un rectangle aligné sur ses axes.
function decouper(poly, amin, amax, bmin, bmax) {
  const plan = (p, i, lim, garde) => {
    const out = [];
    for (let k = 0; k < p.length; k++) {
      const A = p[k], B = p[(k + 1) % p.length];
      const ia = garde(A[i], lim), ib = garde(B[i], lim);
      if (ia) out.push(A);
      if (ia !== ib) { const r = (lim - A[i]) / (B[i] - A[i]); out.push([A[0] + (B[0] - A[0]) * r, A[1] + (B[1] - A[1]) * r]); }
    }
    return out;
  };
  let p = poly;
  p = plan(p, 0, amin, (x, l) => x >= l); if (p.length < 3) return [];
  p = plan(p, 0, amax, (x, l) => x <= l); if (p.length < 3) return [];
  p = plan(p, 1, bmin, (x, l) => x >= l); if (p.length < 3) return [];
  p = plan(p, 1, bmax, (x, l) => x <= l);
  return p;
}

// --- LES VILLES BÂTIES À LA MAIN (v466) -------------------------------------
//
// Londres, Nice, Lille, San Francisco et Washington n'ont pas de trame : leurs
// rues sont des AVENUES NOMMÉES (`VOIES`), tracées sur le vrai plan, et leurs
// carrefours sont les croisements de ces avenues (`carrefoursDeVoies`, la
// table que les feux lisent déjà, v274). Le passage se pose donc à l'abord de
// chaque croisement, sur chacune des deux avenues, à la règle de la v421 : la
// bande commence `BANDE_DEBUT` après la chaussée croisée et finit à
// `BANDE_FIN`, mesurés le LONG de l'avenue (la demi-chaussée croisée divisée
// par le sinus de l'angle : un croisement oblique est plus long à franchir),
// et ses bandes de cinquante centimètres courent dans l'axe de la
// circulation. Paris a son propre marquage, dans la tuile (`marquageParis`).
//
// UN « BRAS » est une avenue au voisinage d'un carrefour : centre, direction,
// demi-chaussée, étendue de la bande. Trois avenues concourantes donnent trois
// croisements : un même bras à moins de `MEME_CARREFOUR` blocs n'en fait qu'un,
// et il prend la plus LARGE des chaussées croisées — sinon sa bande tomberait
// au milieu du carrefour. Un croisement trop rasant (moins de 30°) n'a pas de
// passage : sa bande ferait dix blocs de long.
//
// La règle lit le SOL de la ville (`sol*`, pur) : seule la chaussée de bitume
// porte un passage — une place, un pont, le bout d'une avenue qui s'arrête au
// carrefour (le côté où elle n'existe pas est un trottoir ou un lot) n'en ont
// pas. Le mailleur exige en plus que le bloc écrit soit du bitume.
const MEME_CARREFOUR = 3;
const SIN_MIN = 0.5;
const CASE = 32;
const VILLES_MAIN = [
  ['londres', () => [VOIES_LONDRES, LONDRES, solLondres]],
  ['nice', () => [VOIES_NICE, NICE, solNice]],
  ['lille', () => [VOIES_LILLE, LILLE, solLille]],
  ['sf', () => [VOIES_SF, SF, solSF]],
  ['dc', () => [VOIES_CIRCUITS_DC, WASHINGTON, solWashington]],
];
let INDEX = null;
function direction(pts, u, v) {
  // le segment de la polyligne le plus proche du point : sa direction unitaire
  let best = null, bd = Infinity;
  for (let k = 0; k < pts.length - 1; k++) {
    const [u0, v0] = pts[k], [u1, v1] = pts[k + 1];
    const du = u1 - u0, dv = v1 - v0, l2 = du * du + dv * dv;
    if (!l2) continue;
    let r = ((u - u0) * du + (v - v0) * dv) / l2; r = r < 0 ? 0 : r > 1 ? 1 : r;
    const d = Math.hypot(u - u0 - r * du, v - v0 - r * dv);
    if (d < bd) { bd = d; const n = Math.sqrt(l2); best = [du / n, dv / n]; }
  }
  return best;
}
export function brasDesVillesMain() {
  const bras = [];
  for (const [cle, src] of VILLES_MAIN) {
    const [voies, o, sol] = src();
    const propres = [];
    const voisins = [];
    for (let i = 0; i < voies.length; i++) {
      for (let j = i + 1; j < voies.length; j++) {
        for (const q of carrefoursDeVoies([voies[i], voies[j]])) {
          const di = direction(voies[i].pts, q.u, q.v), dj = direction(voies[j].pts, q.u, q.v);
          if (!di || !dj) continue;
          const sin = Math.abs(di[0] * dj[1] - di[1] * dj[0]);
          if (sin < SIN_MIN) continue;
          for (const [vi, d, w] of [[i, di, voies[j]], [j, dj, voies[i]]]) {
            const s0 = (w.l || 3.2) / sin + BANDE_DEBUT;
            const ex = voisins.find((b) => b.voie === vi && Math.hypot(b.u - q.u, b.v - q.v) < MEME_CARREFOUR);
            if (ex) { ex.s0 = Math.max(ex.s0, s0); continue; }
            const b = { ville: cle, voie: vi, u: q.u, v: q.v, x: o.x + q.u, z: o.z + q.v, dx: d[0], dz: d[1],
              l: voies[vi].l || 3.2, s0, sol };
            voisins.push(b); propres.push(b);
          }
        }
      }
    }
    for (const b of propres) { b.s1 = b.s0 + (BANDE_FIN - BANDE_DEBUT); bras.push(b); }
  }
  return bras;
}
function index() {
  if (INDEX) return INDEX;
  INDEX = new Map();
  for (const b of brasDesVillesMain()) {
    const r = b.s1 + b.l + 1;
    for (let gx = Math.floor((b.x - r) / CASE); gx <= Math.floor((b.x + r) / CASE); gx++) {
      for (let gz = Math.floor((b.z - r) / CASE); gz <= Math.floor((b.z + r) / CASE); gz++) {
        const k = gx + ':' + gz;
        if (!INDEX.has(k)) INDEX.set(k, []);
        INDEX.get(k).push(b);
      }
    }
  }
  return INDEX;
}
const brasPres = (x, z) => index().get(Math.floor(x / CASE) + ':' + Math.floor(z / CASE)) || null;
// Un morceau touche-t-il un bras ? (le mailleur, une question par morceau)
export function morceauAvecPassagesMain(x0, z0, taille) {
  for (let gx = Math.floor(x0 / CASE); gx <= Math.floor((x0 + taille - 1) / CASE); gx++) {
    for (let gz = Math.floor(z0 / CASE); gz <= Math.floor((z0 + taille - 1) / CASE); gz++) {
      if (index().has(gx + ':' + gz)) return true;
    }
  }
  return false;
}
// le point dans le repère du bras : s le long de l'avenue, t en travers
const repere = (b, x, z) => [(x - b.x) * b.dx + (z - b.z) * b.dz, -(x - b.x) * b.dz + (z - b.z) * b.dx];
const bandesK = (b) => { const ks = []; for (let k = -Math.floor(b.l); k <= Math.floor(b.l); k++) if (Math.abs(k) + LARGEUR_BANDE / 2 <= b.l - 0.15) ks.push(k); return ks; };
function passageVilleMain(x, z) {
  const liste = brasPres(x, z);
  if (!liste) return null;
  for (const b of liste) {
    const [s, t] = repere(b, x, z);
    const as = Math.abs(s);
    if (!(as > b.s0 && as < b.s1) || Math.abs(t) >= b.l) continue;
    if (b.sol(Math.floor(x) + 0.5, Math.floor(z) + 0.5) !== CITY_BLOCK.ASPHALT) continue;
    const k = Math.round(t);
    const raye = Math.abs(t - k) < LARGEUR_BANDE / 2 && Math.abs(k) + LARGEUR_BANDE / 2 <= b.l - 0.15;
    return { ux: b.dx, uz: b.dz, raye };
  }
  return null;
}
function bandesVilleMain(cx, cz) {
  const liste = brasPres(cx + 0.5, cz + 0.5);
  if (!liste) return [];
  const out = [];
  for (const b of liste) {
    const carre = [[cx, cz], [cx + 1, cz], [cx + 1, cz + 1], [cx, cz + 1]].map(([x, z]) => repere(b, x, z));
    const [sc, tc] = repere(b, cx + 0.5, cz + 0.5);
    if (Math.abs(sc) > b.s1 + 1 || Math.abs(sc) < b.s0 - 1 || Math.abs(tc) > b.l + 1) continue;
    if (b.sol(cx + 0.5, cz + 0.5) !== CITY_BLOCK.ASPHALT) continue;
    for (const k of bandesK(b)) {
      for (const sg of [1, -1]) {
        const lo = Math.min(sg * b.s0, sg * b.s1), hi = Math.max(sg * b.s0, sg * b.s1);
        const poly = decouper(carre, lo, hi, k - LARGEUR_BANDE / 2, k + LARGEUR_BANDE / 2);
        if (poly.length >= 3) out.push(poly.map(([s, t]) => [b.x + s * b.dx - t * b.dz, b.z + s * b.dz + t * b.dx]));
      }
    }
  }
  return out;
}
