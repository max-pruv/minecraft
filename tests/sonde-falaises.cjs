// LES FALAISES ET LES BERGES (point (c) du kit « monde fidèle ») — la sonde
// d'état initial, sous node, sans navigateur.
//
// Ce qu'elle compte, et pourquoi : sur un échantillon de morceaux tirés sur
// toute la carte, hors des villes, chaque FACE LATÉRALE de bloc que le
// mailleur dessinerait (voisin d'air ou d'eau, et pas le sommet tu d'une
// colonne couverte par le sol continu), rangée par MATIÈRE et par CONTEXTE :
//   · falaise — la face donne sur l'air, au-dessus du sommet de la colonne
//     voisine (une marche de deux blocs ou plus, que le sol continu laisse en
//     voxel, `MARCHE_MAX`) ;
//   · liseré — même chose pour une marche d'un seul bloc (bord de zone voxel) ;
//   · berge — la face donne sur l'eau, ou sur l'air juste au-dessus de l'eau
//     d'une colonne voisine qui est un lac, un fleuve ou la mer.
// Et le nombre de marches (cellules non dessinées entre colonnes naturelles,
// écart ≥ 2). On lit le monde par `getBlock`, comme le mailleur.
//
//   node tests/sonde-falaises.cjs [morceaux] [graine]
(async () => {
  const N = Number(process.argv[2]) || 300;
  let graine = Number(process.argv[3]) || 7;
  const alea = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
  const W = await import('../src/world.js');
  const { World, CHUNK, WATER_LEVEL, CITIES } = W;
  const { BLOCK, BLOCK_INFO } = await import('../src/blocks.js');
  const { dansVilleMonde } = await import('../src/villesmonde.js');
  const { colonneCouverte, ficheColonne } = await import('../src/solcontinu.js');
  const { lieuxDuMonde } = await import('../src/mondes.js');
  const w = new World();
  const nom = (id) => (BLOCK_INFO[id] && BLOCK_INFO[id].name) || String(id);
  const enVille = (x, z) => !!w.cityAt(x, z) || dansVilleMonde(x, z);

  // On tire les morceaux AUTOUR des lieux du monde (là où l'on joue et où la
  // terre est), entre 120 et 900 blocs de leur centre — hors du disque.
  const lieux = lieuxDuMonde().filter((l) => Number.isFinite(l.x));
  const compte = { falaise: {}, liseré: {}, berge: {} };
  let marches = 0, cellules = 0, morceaux = 0, colonnes = 0;
  const parLieu = [];
  const ajoute = (ctx, id) => { compte[ctx][nom(id)] = (compte[ctx][nom(id)] || 0) + 1; };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const memoF = new Map();
  const fiche = (x, z) => { const k = x + ',' + z; let f = memoF.get(k); if (!f) { f = ficheColonne(w, x, z); memoF.set(k, f); } return f; };
  const t0 = Date.now();
  while (morceaux < N) {
    const l = lieux[Math.floor(alea() * lieux.length)];
    const a = alea() * Math.PI * 2, d = 120 + alea() * 780;
    const bx = Math.floor((l.x + Math.cos(a) * d) / CHUNK) * CHUNK;
    const bz = Math.floor((l.z + Math.sin(a) * d) / CHUNK) * CHUNK;
    if (enVille(bx + 8, bz + 8)) continue;
    morceaux++;
    const avant = { f: 0, terreF: 0, b: 0, terreB: 0 };
    for (let z = bz; z < bz + CHUNK; z++) {
      for (let x = bx; x < bx + CHUNK; x++) {
        if (enVille(x, z)) continue;
        colonnes++;
        const h = w.terrainHeight(x, z);
        const couverte = colonneCouverte(w, x, z, fiche);
        // les marches : la cellule (x, z) entre colonnes naturelles
        const f = [fiche(x, z), fiche(x + 1, z), fiche(x, z + 1), fiche(x + 1, z + 1)];
        if (f.every((q) => q.nat)) {
          cellules++;
          const c = f.map((q) => q.cote);
          if (Math.max(...c) - Math.min(...c) >= 2) marches++;
        }
        for (const [dx, dz] of DIRS) {
          const hv = w.terrainHeight(x + dx, z + dz);
          const eauV = hv < WATER_LEVEL;
          for (let y = Math.min(h, hv + 1); y <= h + 1 && y >= 0; y++) {
            const id = w.getBlock(x, y, z);
            if (id === BLOCK.AIR || id === BLOCK.WATER || !(BLOCK_INFO[id] && BLOCK_INFO[id].solid)) continue;
            if (y === h && couverte) continue;
            const v = w.getBlock(x + dx, y, z + dz);
            if (v !== BLOCK.AIR && v !== BLOCK.WATER) continue;
            const ctx = (v === BLOCK.WATER || (eauV && y <= WATER_LEVEL + 3)) ? 'berge' : (h - hv >= 2 ? 'falaise' : 'liseré');
            ajoute(ctx, id);
            const terre = id === BLOCK.DIRT || id === BLOCK.GRASS;
            if (ctx === 'falaise') { avant.f++; if (terre) avant.terreF++; }
            if (ctx === 'berge') { avant.b++; if (terre) avant.terreB++; }
          }
        }
      }
    }
    parLieu.push({ lieu: l.nom || l.cle, x: bx, z: bz, ...avant });
  }
  const tri = (o) => Object.entries(o).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${v}`).join(' · ');
  console.log(`${morceaux} morceaux, ${colonnes} colonnes hors ville, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(`marches (≥ 2 blocs) : ${marches} cellules sur ${cellules} cellules naturelles`);
  for (const ctx of Object.keys(compte)) {
    const tot = Object.values(compte[ctx]).reduce((s, v) => s + v, 0);
    console.log(`faces ${ctx} : ${tot} — ${tri(compte[ctx])}`);
  }
  const pires = parLieu.sort((p, q) => (q.terreF + q.terreB) - (p.terreF + p.terreB)).slice(0, 8);
  console.log('pires morceaux (terre/herbe falaise · berge) :');
  for (const p of pires) console.log(`  ${p.lieu} (${p.x}, ${p.z}) : ${p.terreF}/${p.f} · ${p.terreB}/${p.b}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
