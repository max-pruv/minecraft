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
// LE PAS DE COTE. Un convoi lit sa cote par interpolation entre deux points du
// tracé : entre deux sommets distants de trente blocs, la corde traverse tout
// ce que le terrain fait entre les deux. Mesuré à San Francisco, où la corde
// coupait les collines : à un point tous les six blocs, 17 % du trajet passe
// dans la roche ; à quatre blocs, 11,5 % ; à deux blocs, 3,3 %. On densifie
// donc le tracé à deux blocs — mille points par ville, que la recherche
// dichotomique du parcours avale sans y penser.
const PAS_COTE = 2;

// EN PENTE, LA COTE D'UN POINT EST CELLE DE SON PLUS HAUT VOISIN. Sinon la
// corde entre deux points s'enfonce d'un bloc dans la chaussée qu'elle
// descend, et la voiture roule dans le bitume : 37 pas à San Francisco,
// 18 à Nice, 9 à Washington. Quatre lectures de terrain, et il n'en reste
// aucun.
function coteEn(solDe, x, z) {
  let m = solDe(x, z);
  const v = solDe(x + 1, z); if (v > m) m = v;
  const w = solDe(x - 1, z); if (w > m) m = w;
  const n = solDe(x, z + 1); if (n > m) m = n;
  const s = solDe(x, z - 1); if (s > m) m = s;
  return m;
}

export function fabriqueCircuits({ cle, ancre, voies, roulant, chaines, seuil = 0.9, ajuster = null }) {
  return (solDe) => {
    const est = (x, z) => roulant.has(voies.sol ? voies.sol(x, z) : null);
    const out = [];
    for (const noms of chaines) {
      let pts = chainerVoies(voies.liste, noms);
      if (!pts) continue;
      if (ajuster) pts = ajuster(pts);
      // La mesure se fait sur le tracé D'AVANT la densification : ajouter des
      // points alignés ne change pas un pourcentage, et les chiffres écrits
      // au-dessus de chaque circuit restent ceux qu'on a mesurés.
      const verdict = circuitSurRue(pts, ancre, est, seuil);
      if (!verdict.bon) continue;
      // LE CONVOI SUIT LE SOL. Il roulait à une cote UNIQUE, prise au centre
      // de la ville — « la ville est plate », disait le commentaire. San
      // Francisco a treize collines et Nice le mont Boron : le sol s'écartait
      // de cette cote de trente-deux blocs à San Francisco, quatorze à Nice,
      // et les voitures s'enfonçaient dans le relief sur 27 % et 12 % de leur
      // trajet. Max, sur capture : « les voitures rentrent dans les murs ».
      const dense = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / PAS_COTE));
        for (let k = 0; k < n; k++) {
          const u = a[0] + ((b[0] - a[0]) * k) / n, v = a[1] + ((b[1] - a[1]) * k) / n;
          const x = ancre.x + u, z = ancre.z + v;
          dense.push({ x, y: coteEn(solDe, Math.round(x), Math.round(z)) + 1.05, z });
        }
      }
      out.push({
        cle, x: ancre.x, z: ancre.z, rang: out.length, part: Math.round(verdict.part * 100),
        pts: dense,
      });
    }
    return out;
  };
}

// --- contourner une place ronde ---------------------------------------------
//
// `chainerVoies` joint deux avenues en DROITE LIGNE d'un carrefour à l'autre,
// et deux avenues qui se rejoignent sur une place ronde s'y rejoignent en son
// CENTRE : le tracé y entre, y ressort, et l'angle entre les deux vaut ce que
// la géométrie décide — 174° à République, 161° à Nation. Un demi-tour, donc,
// alors que les deux avenues sont bien à leur place : ce n'est pas le tracé
// des rues qui est faux, c'est le raccourci par le milieu de la place.
//
// Une voiture, elle, fait le tour du rond-point. On remplace donc tout
// tronçon qui entre dans un cercle par l'ARC de ce cercle, dans le sens le
// plus court. Washington l'a payé le premier (ses ronds-points portaient un
// anneau de trottoir infranchissable) ; la fonction vit ici parce que Paris a
// exactement le même besoin, et que le remède d'une ville ne doit plus rester
// dans le fichier d'une ville — c'est la leçon du verre dans les murs.
//
// La retouche se fait AVANT la mesure : `fabriqueCircuits` appelle `ajuster`
// puis mesure. Un chiffre écrit au-dessus d'un circuit est celui du tracé
// contourné, jamais celui de la corde.
function arcAutour(cu, cv, rr, p1, p2) {
  const a1 = Math.atan2(p1[1] - cv, p1[0] - cu);
  let d = Math.atan2(p2[1] - cv, p2[0] - cu) - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  const n = Math.max(1, Math.ceil((Math.abs(d) * rr) / 1.5));
  const out = [];
  for (let i = 1; i < n; i++) {
    const a = a1 + (d * i) / n;
    out.push([Math.round((cu + rr * Math.cos(a)) * 10) / 10, Math.round((cv + rr * Math.sin(a)) * 10) / 10]);
  }
  return out;
}

function contournerUn(pts, cu, cv, rr) {
  const n = pts.length;
  // « Dedans » inclut le bord : un point de passage posé EXACTEMENT sur le
  // rayon de contournement n'est ni dehors ni dedans, et la corde qui y mène
  // coupait la place sans qu'aucune intersection ne la trahisse.
  const dedans = (p) => Math.hypot(p[0] - cu, p[1] - cv) <= rr + 1e-6;
  const s = pts.findIndex((p) => !dedans(p));
  if (s < 0) return pts;                                  // tout le tracé est dans la place
  const rot = [...pts.slice(s), ...pts.slice(0, s)];
  const out = [];
  let entree = null;
  for (let i = 0; i < n; i++) {
    const a = rot[i], b = rot[(i + 1) % n];
    if (entree === null) out.push(a);
    const dx = b[0] - a[0], dy = b[1] - a[1], fx = a[0] - cu, fy = a[1] - cv;
    const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - rr * rr;
    let ts = [];
    if (A > 0) {
      const disc = B * B - 4 * A * C;
      if (disc > 0) {
        const q = Math.sqrt(disc);
        ts = [(-B - q) / (2 * A), (-B + q) / (2 * A)].filter((t) => t > 0 && t < 1);
      }
    }
    const au = (t) => [a[0] + dx * t, a[1] + dy * t];
    const aIn = dedans(a), bIn = dedans(b);
    if (!aIn && !bIn) {
      if (ts.length === 2) {                              // le tronçon traverse la place
        const p1 = au(ts[0]), p2 = au(ts[1]);
        out.push(p1, ...arcAutour(cu, cv, rr, p1, p2), p2);
      }
    } else if (!aIn && bIn) {
      entree = ts.length ? au(ts[0]) : b;                 // sans intersection, b est SUR le bord
      out.push(entree);
    } else if (aIn && !bIn) {
      if (entree) {
        const p2 = ts.length ? au(ts[ts.length - 1]) : a; // idem : a est sur le bord
        out.push(...arcAutour(cu, cv, rr, entree, p2), p2);
      }
      entree = null;
    }
  }
  return out;
}

// `cercles` : des `{ u, v, r }` où `r` est le RAYON DE CONTOURNEMENT — le
// cercle que la voiture suit, pas le bord de la place. À chaque ville de le
// donner sur du roulant : l'anneau de chaussée à Washington, la couronne de
// bitume d'une place parisienne.
// --- contourner un socle de monument ----------------------------------------
//
// Un monument n'est pas un rond-point : son emprise est un RECTANGLE, et la
// contourner par un cercle coupe les coins dans le square planté — mesuré à
// Paris, la tenue de rue tombait de 94 à 82 %. On suit donc le PÉRIMÈTRE, dans
// le sens le plus court, en passant par les coins. C'est ce que fait une rue
// autour d'un pâté de maisons, et c'est ce que la ville pave pour elle.
//
// `blocs` : des `{ u, v, hu, hv }` où hu et hv sont les demi-côtés du tour à
// suivre — le socle plus la moitié de sa rue, pas le bord du bâtiment.
const EPS_BLOC = 1e-6;

// Où un tronçon entre et sort du rectangle. Découpage par tranches : deux
// comparaisons par côté, et l'on sort dès qu'un côté rejette.
function coupeBloc(a, b, cu, cv, hu, hv) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let t0 = 0, t1 = 1;
  const bords = [[-dx, a[0] - (cu - hu)], [dx, (cu + hu) - a[0]],
    [-dy, a[1] - (cv - hv)], [dy, (cv + hv) - a[1]]];
  for (const [p, q] of bords) {
    if (p > -EPS_BLOC && p < EPS_BLOC) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  if (t1 - t0 < EPS_BLOC) return null;
  return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
}

// Le tour du rectangle d'un point de son bord à l'autre. On paramètre le
// périmètre par sa longueur d'arc, ce qui rend le « sens le plus court »
// immédiat et fait tomber les coins tout seuls.
function tourDuBloc(cu, cv, hu, hv, p1, p2) {
  const P = 4 * hu + 4 * hv;
  const arc = (p) => {
    const du = p[0] - cu, dv = p[1] - cv;
    if (Math.abs(dv + hv) < 1e-3) return du + hu;
    if (Math.abs(du - hu) < 1e-3) return 2 * hu + (dv + hv);
    if (Math.abs(dv - hv) < 1e-3) return 2 * hu + 2 * hv + (hu - du);
    return 4 * hu + 2 * hv + (hv - dv);
  };
  const point = (t) => {
    let x = ((t % P) + P) % P;
    if (x <= 2 * hu) return [cu - hu + x, cv - hv];
    x -= 2 * hu;
    if (x <= 2 * hv) return [cu + hu, cv - hv + x];
    x -= 2 * hv;
    if (x <= 2 * hu) return [cu + hu - x, cv + hv];
    x -= 2 * hu;
    return [cu - hu, cv + hv - x];
  };
  const s1 = arc(p1);
  let d = arc(p2) - s1;
  while (d > P / 2) d -= P;
  while (d <= -P / 2) d += P;
  // Un point tous les 1,5 blocs : la mesure de tenue de rue lit le TRAJET, pas
  // ses seuls nœuds — c'est la leçon de Washington, où un témoin qui ne lisait
  // que les sommets ne voyait pas une corde qui traversait la place.
  const n = Math.max(1, Math.ceil(Math.abs(d) / 1.5));
  const out = [];
  for (let i = 1; i < n; i++) {
    const p = point(s1 + (d * i) / n);
    out.push([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
  }
  return out;
}

function contournerUnBloc(pts, cu, cv, hu, hv) {
  const n = pts.length;
  // « Dedans » inclut le bord, pour la même raison qu'aux ronds-points : un
  // point posé EXACTEMENT sur le tour n'est ni dehors ni dedans, et la corde
  // qui y mène traverse sans qu'aucune intersection ne la trahisse.
  const dedans = (p) => Math.abs(p[0] - cu) <= hu + EPS_BLOC && Math.abs(p[1] - cv) <= hv + EPS_BLOC;
  const s = pts.findIndex((p) => !dedans(p));
  if (s < 0) return pts;                                  // tout le tracé est dans l'emprise
  const rot = [...pts.slice(s), ...pts.slice(0, s)];
  const out = [];
  let entree = null;
  for (let i = 0; i < n; i++) {
    const a = rot[i], b = rot[(i + 1) % n];
    if (entree === null) out.push(a);
    const seg = coupeBloc(a, b, cu, cv, hu, hv);
    const aIn = dedans(a), bIn = dedans(b);
    if (!aIn && !bIn) {
      if (seg) out.push(seg[0], ...tourDuBloc(cu, cv, hu, hv, seg[0], seg[1]), seg[1]);
    } else if (!aIn && bIn) {
      entree = seg ? seg[0] : b;
      out.push(entree);
    } else if (aIn && !bIn) {
      if (entree) {
        const p2 = seg ? seg[1] : a;
        out.push(...tourDuBloc(cu, cv, hu, hv, entree, p2), p2);
      }
      entree = null;
    }
  }
  return out;
}

export function contournerBlocs(pts, blocs) {
  let out = pts;
  for (const b of blocs) out = contournerUnBloc(out, b.u, b.v, b.hu, b.hv);
  return out;
}

export function contournerRonds(pts, cercles) {
  let out = pts;
  for (const c of cercles) out = contournerUn(out, c.u, c.v, c.r);
  return out;
}
