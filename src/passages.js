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
  if (!t) return null;
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
export function bandesDeColonne(cx, cz) {
  const xc = cx + 0.5, zc = cz + 0.5;
  const f = villeMondeEn(xc, zc);
  const t = trameEnBiais(f);
  if (!t || !passageEnColonne(cx, cz)) return [];
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
