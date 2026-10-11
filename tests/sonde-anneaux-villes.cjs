// LES ANNEAUX DES VILLES ENGENDRÉES, VILLE PAR VILLE (v422).
//   node tests/sonde-anneaux-villes.cjs [dossier src] [villes…]  → JSON
// Par ville : coût du premier calcul des anneaux (ms), circuits, pas de voie
// hors de la chaussée (la règle du témoin de carteMonde.js, v404) et leur
// répartition par anneau, pire partage de voie entre deux anneaux (v270),
// distance du centre à la voie la plus proche (la voiture en vue), couverture
// (la règle du témoin v322 : un point tous les six blocs, vu à 45 blocs d'un
// échantillon de tracé). Le dossier `src` se donne pour mesurer un autre arbre
// (`git worktree add --detach`), avant et après.
(async () => {
const path = require('path'), { pathToFileURL } = require('url');
const SRC = path.resolve(process.argv[2] || path.join(__dirname, '../src'));
const filtre = process.argv.slice(3);
const R = pathToFileURL(SRC + '/').href;
const vm = await import(R + 'villesmonde.js');
const wo = await import(R + 'world.js');
const { CITY_BLOCK, BLOCK } = await import(R + 'blocks.js');
const W = new wo.World();
const fiches = vm.VILLES_MONDE.filter((f) => f.trame && !f.trame.ruelles && (!filtre.length || filtre.includes(f.cle)));
const res = {};
for (const f of fiches) {
  const t0 = performance.now();
  vm.anneauxDeVille(f);
  const cout = performance.now() - t0;
  res[f.cle] = { cout: Math.round(cout) };
}
const traces = vm.tracesCirculation(() => 35);
const par = new Map();
for (const tr of traces) (par.get(tr.cle) || par.set(tr.cle, []).get(tr.cle)).push(tr);
const cotes = (tr) => tr.pts.map((a, i) => [a, tr.pts[(i + 1) % tr.pts.length]]);
const partage = (A, B) => { let s = 0;
  for (const [a1, a2] of cotes(A)) { const L = Math.hypot(a2.x - a1.x, a2.z - a1.z); if (L < 1e-6) continue;
    const ux = (a2.x - a1.x) / L, uz = (a2.z - a1.z) / L;
    for (const [b1, b2] of cotes(B)) { const M = Math.hypot(b2.x - b1.x, b2.z - b1.z); if (M < 1e-6) continue;
      const vx = (b2.x - b1.x) / M, vz = (b2.z - b1.z) / M;
      if (Math.abs(ux * vz - uz * vx) > 0.02) continue;
      if (Math.abs((b1.x - a1.x) * (-uz) + (b1.z - a1.z) * ux) > 2) continue;
      const q1 = (b1.x - a1.x) * ux + (b1.z - a1.z) * uz, q2 = (b2.x - a1.x) * ux + (b2.z - a1.z) * uz;
      s += Math.max(0, Math.min(L, Math.max(q1, q2)) - Math.max(0, Math.min(q1, q2))); } } return s; };
const dC = (tr) => { let d = Infinity; for (const [a, b] of cotes(tr)) { const L = Math.hypot(b.x - a.x, b.z - a.z); if (L < 1e-6) continue;
  const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L; let q = (tr.x - a.x) * ux + (tr.z - a.z) * uz; q = Math.max(0, Math.min(L, q));
  d = Math.min(d, Math.hypot(a.x + ux * q - tr.x, a.z + uz * q - tr.z)); } return d; };
for (const f of fiches) {
  const g = par.get(f.cle) || [];
  const r = res[f.cle]; r.circuits = g.length;
  const t = f.trame, co = Math.cos(t.ang), si = Math.sin(t.ang);
  let pas = 0; const parAnneau = [];
  for (const tr of g) { const vus = new Set(); let n = 0;
    for (let i = 0; i < tr.pts.length; i++) { const a = tr.pts[i], b = tr.pts[(i + 1) % tr.pts.length];
      const m = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5);
      for (let k = 0; k < m; k++) { const X = Math.floor(a.x + (b.x - a.x) * k / m), Z = Math.floor(a.z + (b.z - a.z) * k / m);
        if (vus.has(X * 65536 + Z)) continue; vus.add(X * 65536 + Z);
        const s = vm.solVillesMonde(X, Z);
        if (s === null) { if (!vm.pontVillesMonde(X, Z)) n++; continue; }
        if (s !== 'lot' && wo.CHAUSSEE.has(s)) continue;
        const u = X - f.ancre.x, v = Z - f.ancre.z, P = u * co - v * si, Q = u * si + v * co, U = u / f.K, V = v / f.K;
        if (s === CITY_BLOCK.SIDEWALK && t.axe && Math.min(Math.abs(P), Math.abs(Q)) < t.axe.s + 1) continue;
        const quai = (f.mer && f.mer.quais && U * f.mer.nx + V * f.mer.nz > f.mer.d - 2) || (f.cote && f.cote.quais && U < f.cote.base + f.cote.pente * V + 2);
        if (s === CITY_BLOCK.GRANITE && quai) continue;
        n++; } }
    pas += n; parAnneau.push(n); }
  r.pas = pas; r.parAnneau = parAnneau.join('/');
  let pire = 0; for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) pire = Math.max(pire, partage(g[i], g[j]));
  r.partage = Math.round(pire);
  r.vue = g.length ? Math.round(Math.min(...g.map(dC))) : null;
  // couverture
  const ech = []; for (const tr of g) for (const [a, b] of cotes(tr)) { const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2));
    for (let k = 0; k < n; k++) ech.push([a.x + (b.x - a.x) * k / n, a.z + (b.z - a.z) * k / n]); }
  let tot = 0, cou = 0; const RR = f.rayon * 0.9;
  for (let dx = -RR; dx <= RR; dx += 6) for (let dz = -RR; dz <= RR; dz += 6) { if (dx * dx + dz * dz > RR * RR) continue;
    const x = Math.floor(f.ancre.x + dx), z = Math.floor(f.ancre.z + dz);
    if (W.terrainHeight(x, z) < wo.WATER_LEVEL) continue; if (vm.solVillesMonde(x, z) === null) continue; tot++;
    if (ech.some(([ex, ez]) => (ex - x) ** 2 + (ez - z) ** 2 < 45 * 45)) cou++; }
  r.couv = tot ? Math.round(1000 * cou / tot) / 10 : 0;
}
console.log(JSON.stringify(res));
})();
