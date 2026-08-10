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
