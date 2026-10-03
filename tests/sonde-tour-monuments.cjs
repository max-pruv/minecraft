// CE QUE LIT LE TÉMOIN « AUCUNE VOITURE NE TRAVERSE UN MONUMENT DE PARIS » (v318)
//
// La même mesure que carteMonde.js, sous node, sur l'arbre qu'on lui donne :
// les circuits de Paris parcourus tous les demi-blocs dans la BANDE que le tour
// emprunte (socle + AXE_TOUR + demi-largeur d'une voiture), le bloc lu en
// `Math.floor` sur cinq points en travers de la marche et aux deux hauteurs
// d'une voiture. Pour la vérifier ROUGE, on la lance sur une copie de `src`
// où `contournerBlocs` rend ses points tels quels :
//
//   node tests/sonde-tour-monuments.cjs [racine d'un arbre, défaut : ce dépôt]
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const racine = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const src = (f) => pathToFileURL(path.join(racine, 'src', f)).href;
  const { World } = await import(src('world.js'));
  const b = await import(src('blocks.js'));
  const m = await import(src('paris.js'));
  const w = new World();
  const nomDe = Object.fromEntries(Object.entries(b.BLOCK).map(([k, v]) => [v, k]));
  const AVEC_RUE = ['Louvre', 'Opéra', 'Arc de Triomphe', 'Tour Eiffel',
    'Invalides', 'Montparnasse', 'Panthéon', 'Bastille'];
  const AXE = typeof m.AXE_TOUR === 'number' ? m.AXE_TOUR : 2, DEMI = 1.13;
  const socles = m.LIEUX.filter((p) => p.socle && AVEC_RUE.includes(p.nom))
    .map((p) => ({ nom: p.nom, u: p.u, v: p.v, bu: p.socle[0] + 1, bv: p.socle[1] + 1 }));
  const circuits = m.circuitsParis((x, z) => (w.coteRoulable ? w.coteRoulable(x, z) : w.terrainHeight(x, z)));
  let lus = 0, dur = 0;
  const par = {}, lusPar = {}, exemples = [];
  for (const c of circuits) {
    const P = c.pts, n = P.length;
    for (let k = 0; k < n; k++) {
      const a = P[k], q = P[(k + 1) % n];
      const L = Math.hypot(q.x - a.x, q.z - a.z);
      if (!(L > 1e-6)) continue;
      const lx = -(q.z - a.z) / L, lz = (q.x - a.x) / L;
      for (let s = 0; s < L; s += 0.5) {
        const t = s / L, x = a.x + (q.x - a.x) * t, z = a.z + (q.z - a.z) * t, y = a.y + (q.y - a.y) * t;
        const u = x - m.PARIS.x, v = z - m.PARIS.z;
        const so = socles.find((o) => Math.abs(u - o.u) <= o.bu + AXE + DEMI && Math.abs(v - o.v) <= o.bv + AXE + DEMI);
        if (!so) continue;
        lus++; lusPar[so.nom] = (lusPar[so.nom] || 0) + 1;
        let bloque = null;
        for (const d of [-DEMI, -DEMI / 2, 0, DEMI / 2, DEMI]) for (const dy of [0, 1]) {
          const bx = Math.floor(x + lx * d), by = Math.floor(y + dy), bz = Math.floor(z + lz * d);
          const id = w.getBlock(bx, by, bz);
          if (!bloque && id && b.isSolid(id)) bloque = [bx, by, bz, nomDe[id] || id];
        }
        if (!bloque) continue;
        dur++; par[so.nom] = (par[so.nom] || 0) + 1;
        if (exemples.length < 8) exemples.push([so.nom, +x.toFixed(2), +z.toFixed(2), ...bloque,
          'socle u', so.u - so.bu, so.u + so.bu, 'v', so.v - so.bv, so.v + so.bv]);
      }
    }
  }
  console.log(JSON.stringify({ racine, circuits: circuits.length, lus, dur, lusPar, par, exemples }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
