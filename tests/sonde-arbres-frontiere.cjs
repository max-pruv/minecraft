// Sonde (isolée) : les feuilles tues au bord du disque chargé et à la
// frontière du détail (dettes v499 et v528). Sous node, sans navigateur.
// Pour un carré de morceaux maillés (rayon R autour d'une forêt dense), on
// relit chaque feuille d'arbre RECONNU et l'on demande : son arbre est-il
// dessiné par un morceau maillé (sa base dans le carré) ? Sinon, elle manque.
// Et la frontière du détail : chaque arbre a-t-il un seul modèle par régime ?
const path = require('path');
(async () => {
  const src = process.argv[2] || path.join(__dirname, '..', 'src');
  const W = await import(path.join(src, 'world.js'));
  const { buildChunkTampons } = await import(path.join(src, 'mesher.js'));
  const A = await import(path.join(src, 'arbreshd.js'));
  const C = W.CHUNK;
  const w = new W.World(); w.arbres = 1;
  // la forêt la plus dense autour de (X0, Z0) — par défaut (6000, 4000), relevé
  const X0 = +(process.argv[4] || 6000), Z0 = +(process.argv[5] || 4000);
  let best = null;
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    const cx = Math.floor(X0 / C) + dx, cz = Math.floor(Z0 / C) + dz; let n = 0;
    for (let lx = 0; lx < C; lx += 2) for (let lz = 0; lz < C; lz += 2) if (w.treeAt(cx * C + lx, cz * C + lz)) n++;
    if (!best || n > best.n) best = { cx, cz, n };
  }
  const R = +(process.argv[3] || 3);
  const dedans = (cx, cz) => Math.abs(cx - best.cx) <= R && Math.abs(cz - best.cz) <= R;
  let orphelines = 0, feuillesBord = 0, arbresOrphelins = 0, morceauxTouches = 0, ms = 0, n = 0;
  const vus = new Set();
  for (let cx = best.cx - R; cx <= best.cx + R; cx++) for (let cz = best.cz - R; cz <= best.cz + R; cz++) {
    const ox = cx * C, oz = cz * C;
    const get = (x, y, z) => w.getBlock(ox + x, y, oz + z);
    const t0 = process.hrtime.bigint();
    buildChunkTampons(w, cx, cz, { detail: false });
    ms += Number(process.hrtime.bigint() - t0) / 1e6; n++;
    const r = A.reconnaitreArbres(get, (lx, lz) => w.treeAt(ox + lx, oz + lz), C, 20, 120, W.HEIGHT);
    let touche = false;
    for (const a of (r.bord || [])) {
      const bcx = Math.floor((ox + a.x) / C), bcz = Math.floor((oz + a.z) / C);
      feuillesBord++;
      if (!dedans(bcx, bcz)) { orphelines += a.dedans || 1; touche = true; const k = (ox + a.x) + ',' + (oz + a.z); if (!vus.has(k)) { vus.add(k); arbresOrphelins++; } }
    }
    if (touche) morceauxTouches++;
  }
  console.log(JSON.stringify({ centre: best, R, morceaux: n, msParMorceau: +(ms / n).toFixed(2), arbresDuBord: feuillesBord, arbresOrphelins, morceauxTouches, cellulesOrphelines: orphelines }));
})();
