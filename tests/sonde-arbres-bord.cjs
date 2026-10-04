// LES ARBRES AU BORD (suite de la v326) — sonde sous node, sans navigateur.
//
// Ce qu'elle compte : sur un échantillon de morceaux de campagne tirés autour
// des lieux du monde (120 à 900 blocs de leur centre, hors des villes), les
// arbres que `treeAt` plante, rangés par la matière que `matiereDuBord` donne
// au SOMMET de leur colonne : herbe (juste), roche (une crête de falaise),
// sable (une grève). On lit le bloc sous le tronc par `getBlock`, comme le
// monde le montre — pas la règle seule.
//
//   node tests/sonde-arbres-bord.cjs [morceaux] [graine]
(async () => {
  const N = Number(process.argv[2]) || 600;
  let graine = Number(process.argv[3]) || 7;
  const alea = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
  const W = await import('../src/world.js');
  const { World, CHUNK } = W;
  const { BLOCK, BLOCK_INFO } = await import('../src/blocks.js');
  const { dansVilleMonde } = await import('../src/villesmonde.js');
  const { lieuxDuMonde } = await import('../src/mondes.js');
  const w = new World();
  const nom = (id) => (BLOCK_INFO[id] && BLOCK_INFO[id].name) || String(id);
  const enVille = (x, z) => !!w.cityAt(x, z) || dansVilleMonde(x, z);
  const lieux = lieuxDuMonde().filter((l) => Number.isFinite(l.x));
  const sous = {};
  let arbres = 0, morceaux = 0;
  const t0 = Date.now();
  while (morceaux < N) {
    const l = lieux[Math.floor(alea() * lieux.length)];
    const a = alea() * Math.PI * 2, d = 120 + alea() * 780;
    const bx = Math.floor((l.x + Math.cos(a) * d) / CHUNK) * CHUNK;
    const bz = Math.floor((l.z + Math.sin(a) * d) / CHUNK) * CHUNK;
    if (enVille(bx + 8, bz + 8)) continue;
    morceaux++;
    for (let z = bz; z < bz + CHUNK; z++) {
      for (let x = bx; x < bx + CHUNK; x++) {
        const t = w.treeAt(x, z);
        if (!t || t.kind === 3) continue;
        arbres++;
        const id = w.getBlock(x, t.h, z);
        sous[nom(id)] = (sous[nom(id)] || 0) + 1;
      }
    }
    if (morceaux % 50 === 0) w.oublierLoinDe && w.oublierLoinDe(bx / CHUNK, bz / CHUNK, 4);
  }
  console.log(JSON.stringify({ morceaux, arbres, sous, ms: Date.now() - t0 }));
  process.exit(0);
})();
