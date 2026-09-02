// Tracer une rue nommée.
//
// Manhattan et Paris ont le même besoin : poser au sol une trentaine de voies
// données par leurs points de passage réels, et savoir pour chaque colonne du
// monde si elle tombe dessus. Une colonne peut être demandée cinq fois — une
// fois pour son sol, quatre fois pour les voisins d'un immeuble — et un morceau
// de monde en compte deux cent cinquante-six. Comparer chaque fois la colonne à
// toutes les voies coûtait assez cher pour que la ville se charge par bribes
// sous les yeux de l'enfant.
//
// D'où ce rangement : les voies sont découpées en segments et classées par
// bandes horizontales. Une colonne ne consulte que sa bande, soit une poignée
// de segments au lieu de la centaine que compte une ville.

const BANDE = 6;

// `voies` : [{ nom, l, t, pts: [[u, v], …], sol }]
//   l  demi-largeur de la chaussée
//   t  ce qu'ajoute le trottoir de part et d'autre (0,45 par défaut)
//   sol ce que la chaussée pose, si ce n'est pas du bitume
export function rangerVoies(voies) {
  const bandes = new Map();
  for (const voie of voies) {
    const t = voie.t === undefined ? 0.45 : voie.t;
    for (let i = 0; i < voie.pts.length - 1; i++) {
      const [u0, v0] = voie.pts[i], [u1, v1] = voie.pts[i + 1];
      const seg = {
        u0, v0, u1, v1, l: voie.l, t, sol: voie.sol,
        uMin: Math.min(u0, u1), uMax: Math.max(u0, u1),
      };
      const b0 = Math.floor((Math.min(v0, v1) - voie.l - t - 1) / BANDE);
      const b1 = Math.floor((Math.max(v0, v1) + voie.l + t + 1) / BANDE);
      for (let b = b0; b <= b1; b++) {
        if (!bandes.has(b)) bandes.set(b, []);
        bandes.get(b).push(seg);
      }
    }
  }
  return bandes;
}

function distanceSegment(u, v, s) {
  const du = s.u1 - s.u0, dv = s.v1 - s.v0;
  const len2 = du * du + dv * dv;
  let t = len2 > 0 ? ((u - s.u0) * du + (v - s.v0) * dv) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(u - (s.u0 + t * du), v - (s.v0 + t * dv));
}

// Ce qu'une voie nommée pose en ce point, ou null si aucune ne passe par là.
// `chaussee` et `trottoir` sont les blocs par défaut ; une voie peut imposer
// le sien.
export function solDesVoies(bandes, u, v, chaussee, trottoir) {
  const segs = bandes.get(Math.floor(v / BANDE));
  if (!segs) return null;
  let dedans = null;
  for (const s of segs) {
    const marge = s.l + s.t;
    if (u < s.uMin - marge || u > s.uMax + marge) continue;
    const d = distanceSegment(u, v, s);
    if (d <= s.l) return s.sol === undefined ? chaussee : s.sol;
    if (d <= marge) dedans = trottoir;
  }
  return dedans;
}

// --- les circuits de circulation ---------------------------------------------
//
// « Ya toujours pas de voitures dans les villes » (Max). Il avait raison, et la
// cause tenait à la manière dont on cherchait où les faire rouler : un CARRÉ
// posé au hasard autour de l'ancre, validé sur le TERRAIN BRUT — la hauteur du
// sol, pas la nature de la rue. Mesuré à la sonde sur Paris : quarante-quatre
// pour cent de la ville est de la chaussée, et pourtant le meilleur carré
// aligné sur les axes du monde ne dépassait pas seize blocs de rayon à 93 % sur
// la rue ; en le faisant tourner dans le repère du quartier, on ne trouvait
// qu'un rectangle de 19 × 16. Une rue fait deux à quatre blocs de large : il
// faudrait la suivre au demi-bloc près sur toute sa longueur, et aucun carré ne
// sait faire cela dans une ville radiale.
//
// Les villes bâties à la main publient pourtant déjà leurs avenues, avec leurs
// points de passage. Un circuit se fabrique donc en METTANT DES AVENUES BOUT À
// BOUT — la Rivoli à l'aller, les Grands Boulevards au retour — exactement
// comme Manhattan fait rouler ses voitures sur la 5e et la 8e. C'est la ville
// qui sait quelles avenues se suivent ; ce fichier ne sait que les chaîner.

// --- où deux voies se rencontrent ---------------------------------------------
//
// Le point d'une polyligne le plus proche d'un point donné, avec sa position
// le long d'elle (`s` = numéro du segment + fraction). C'est cette position
// qui permet ensuite de ne parcourir une avenue QU'ENTRE deux carrefours.
function plusProche(pts, q) {
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [u0, v0] = pts[i], [u1, v1] = pts[i + 1];
    const du = u1 - u0, dv = v1 - v0;
    const len2 = du * du + dv * dv;
    let t = len2 > 0 ? ((q[0] - u0) * du + (q[1] - v0) * dv) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const pu = u0 + t * du, pv = v0 + t * dv;
    const d = Math.hypot(q[0] - pu, q[1] - pv);
    if (!best || d < best.d) best = { d, s: i + t, pt: [pu, pv] };
  }
  return best;
}

// Là où deux segments se croisent, s'ils se croisent.
function croisement(a0, a1, b0, b1) {
  const rx = a1[0] - a0[0], rz = a1[1] - a0[1];
  const sx = b1[0] - b0[0], sz = b1[1] - b0[1];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = b0[0] - a0[0], qz = b0[1] - a0[1];
  const t = (qx * sz - qz * sx) / den;
  const u = (qx * rz - qz * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, u, pt: [a0[0] + t * rx, a0[1] + t * rz] };
}

// Le carrefour entre deux voies : la paire de points la plus proche entre
// leurs deux tracés. Un vrai croisement compte pour zéro et gagne toujours ;
// sinon c'est le sommet de l'une projeté sur l'autre — le bout d'une rue qui
// débouche au milieu d'une avenue. Rend la position sur chacune (`sa`, `sb`).
function carrefour(a, b) {
  let best = null;
  const garder = (d, sa, sb, pt) => {
    if (!best || d < best.d - 1e-9) best = { d, sa, sb, pt };
  };
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      const x = croisement(a[i], a[i + 1], b[j], b[j + 1]);
      if (x) garder(0, i + x.t, j + x.u, x.pt);
    }
  }
  if (best && best.d === 0) return best;
  a.forEach((q, i) => { const p = plusProche(b, q); garder(p.d, i, p.s, p.pt); });
  b.forEach((q, j) => { const p = plusProche(a, q); garder(p.d, p.s, j, p.pt); });
  return best;
}

// Le tronçon d'une voie entre deux positions le long d'elle, dans l'ordre où
// on le parcourt — retourné si l'on entre par le bout le plus loin.
function troncon(pts, sEntree, sSortie) {
  const at = (s) => {
    const i = Math.min(pts.length - 2, Math.floor(s));
    const t = s - i;
    return [pts[i][0] + t * (pts[i + 1][0] - pts[i][0]), pts[i][1] + t * (pts[i + 1][1] - pts[i][1])];
  };
  const out = [at(sEntree)];
  if (sEntree < sSortie) {
    for (let i = Math.floor(sEntree) + 1; i <= Math.min(pts.length - 1, Math.floor(sSortie)); i++) out.push(pts[i]);
  } else {
    for (let i = Math.ceil(sEntree) - 1; i >= Math.max(0, Math.ceil(sSortie)); i--) out.push(pts[i]);
  }
  out.push(at(sSortie));
  return out;
}

// Mettre des voies bout à bout — ENTRE LEURS CARREFOURS. La première version
// accrochait chaque avenue par celle de ses extrémités qui était la plus
// proche et la parcourait EN ENTIER : quand la suivante débouchait à mi-chemin,
// le convoi allait jusqu'au bout de l'avenue et revenait sur ses pas. Mesuré
// sur les cinq villes qui roulaient ainsi : vingt-quatre circuits sur
// quarante et un faisaient demi-tour, invisibles au pourcentage de rue — un
// demi-tour reste à cent pour cent sur la chaussée. Chaque voie n'est donc
// parcourue que du carrefour par lequel on y entre à celui par lequel on la
// quitte ; le circuit est fermé par le convoi lui-même, la dernière voie
// rejoint la première, et l'on ne répète pas le premier point. Une voie qu'on
// quitterait par le carrefour où l'on est entré — une impasse — ne peut se
// parcourir qu'en faisant demi-tour : la chaîne est refusée.
export function chainerVoies(voies, noms) {
  const liste = [];
  for (const nom of noms) {
    const v = voies.find((w) => w.nom === nom);
    if (!v || !v.pts || v.pts.length < 2) return null;
    liste.push(v.pts);
  }
  if (liste.length < 2) return null;
  const n = liste.length;
  const carrefours = [];
  for (let i = 0; i < n; i++) {
    const c = carrefour(liste[i], liste[(i + 1) % n]);
    if (!c) return null;
    carrefours.push(c);
  }
  const pts = [];
  for (let i = 0; i < n; i++) {
    const entree = carrefours[(i - 1 + n) % n].sb, sortie = carrefours[i].sa;
    if (Math.abs(entree - sortie) < 1e-6) return null;
    for (const q of troncon(liste[i], entree, sortie)) {
      const p = [Math.round(q[0] * 100) / 100, Math.round(q[1] * 100) / 100];
      const dernier = pts[pts.length - 1];
      if (dernier && Math.abs(dernier[0] - p[0]) < 0.011 && Math.abs(dernier[1] - p[1]) < 0.011) continue;
      pts.push(p);
    }
  }
  const premier = pts[0], dernier = pts[pts.length - 1];
  if (pts.length > 1 && Math.abs(dernier[0] - premier[0]) < 0.011 && Math.abs(dernier[1] - premier[1]) < 0.011) pts.pop();
  return pts.length >= 3 ? pts : null;
}

// LA VILLE VALIDE SON PROPRE CIRCUIT. Un tracé qui traverse la Seine, un
// jardin ou un pâté d'immeubles est pire que pas de voitures du tout : on
// échantillonne le trajet entier et l'on exige que presque tout tombe sur du
// roulant. `estRoulant(x, z)` est rendu par la ville, qui seule connaît ses
// sols.
export function circuitSurRue(pts, ancre, estRoulant, seuil = 0.9) {
  let bons = 0, n = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const long = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const pas = Math.max(2, Math.round(long));
    for (let k = 0; k < pas; k++) {
      const t = k / pas;
      n++;
      if (estRoulant(Math.round(ancre.x + a[0] + (b[0] - a[0]) * t),
        Math.round(ancre.z + a[1] + (b[1] - a[1]) * t))) bons++;
    }
  }
  return { part: n ? bons / n : 0, bon: n > 0 && bons / n >= seuil, n };
}

// La fabrique : une ville déclare ses enchaînements d'avenues et ce qui, chez
// elle, se roule ; elle reçoit une fonction qui rend ses circuits en
// coordonnées du monde — et SEULEMENT ceux qui tiennent la rue.
//
// Les enchaînements ne se devinent pas : ils ont été trouvés en éprouvant
// toutes les combinaisons d'avenues de chaque ville contre son propre sol, et
// l'on n'a gardé que ce qui passe. Un circuit qui traverserait la Seine, un
// jardin ou un pâté d'immeubles ne part pas — le témoin s'en assure.
//
// `ajuster`, s'il est donné, retouche le tracé chaîné AVANT qu'on ne le
// mesure : c'est ainsi que Washington fait contourner ses ronds-points, que
// la ligne droite d'une avenue à l'autre traverserait en plein jardin.
export function fabriqueCircuits({ cle, ancre, voies, roulant, chaines, seuil = 0.9, ajuster = null }) {
  return (solDe) => {
    const est = (x, z) => roulant.has(voies.sol ? voies.sol(x, z) : null);
    const out = [];
    // La cote se prend au centre : la ville est plate, et un convoi qui
    // suivrait le relief bloc à bloc ferait des montagnes russes.
    const y = solDe(ancre.x, ancre.z) + 1.05;
    for (const noms of chaines) {
      let pts = chainerVoies(voies.liste, noms);
      if (!pts) continue;
      if (ajuster) pts = ajuster(pts);
      const verdict = circuitSurRue(pts, ancre, est, seuil);
      if (!verdict.bon) continue;
      out.push({
        cle, x: ancre.x, z: ancre.z, rang: out.length, part: Math.round(verdict.part * 100),
        pts: pts.map(([u, v]) => ({ x: ancre.x + u, y, z: ancre.z + v })),
      });
    }
    return out;
  };
}
