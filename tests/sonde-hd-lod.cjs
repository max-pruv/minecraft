// Sonde : pourquoi le relais près/loin de parishd.js ne trouve-t-il pas son
// morceau lointain ? Elle sépare les cas que le témoin confond — le morceau
// proche sans façades, le lointain jamais maillé, le worker mort — et imprime
// une chronologie. Lancée à part, jamais par le portail.
//   node tests/sonde-hd-lod.cjs [rr] [hd]
const path = require('path');
(async () => {
  const { Banc } = await import(path.join(__dirname, 'banc.js'));
  const { adresseParis } = await import(path.join(__dirname, '..', 'src', 'paris.js'));
  const rr = Number(process.argv[2] || 6), hd = process.argv[3] || '2';
  const [px, pz] = adresseParis(-0.8, -0.9);
  const banc = new Banc({ portJeu: 8412, portPairs: 9412 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Sonde', { rr, params: `&hd=${hd}` });
    const res = await tab.evaluate(async ([x, z]) => {
      const g = window.__game;
      const y = g.world.terrainHeight(x, z);
      g.player.pos.set(x + 0.5, y + 2, z + 0.5); g.player.vel.set(0, 0, 0);
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
      const releves = [];
      const t0 = performance.now();
      for (let i = 0; i < 24; i++) {
        await dodo(2000);
        const m = g.chunkMeshes;
        let maxD = -1, avecFacades = 0, avecPlat = 0;
        for (const [k, e] of m) {
          const [a, b] = k.split(',').map(Number);
          const d = Math.max(Math.abs(a - cx), Math.abs(b - cz));
          if (d > maxD) maxD = d;
          if (e.facades) avecFacades++;
          if (e.plat) avecPlat++;
        }
        const ici = m.get(`${cx},${cz}`);
        releves.push({
          t: Math.round(performance.now() - t0), n: m.size, maxD, avecFacades, avecPlat,
          ici: ici ? { facades: !!ici.facades, plat: !!ici.plat, sol: !!ici.sol } : null,
          loin: [[5, 0], [-5, 0], [0, 5], [0, -5]].map(([dx, dz]) => !!m.get(`${cx + dx},${cz + dz}`)),
          images: g.renderer.info.render.frame,
          pos: [Math.round(g.player.pos.x), Math.round(g.player.pos.y), Math.round(g.player.pos.z)],
          pc: [Math.floor(g.player.pos.x / 16), Math.floor(g.player.pos.z / 16)],
          stats: g.statsMaillage ? JSON.parse(JSON.stringify({ ...g.statsMaillage, recus: undefined })) : null,
        });
      }
      return {
        cible: [cx, cz], rayon: g.RAYON_HD, atlas: !!g.atlasHD, worldHd: g.world.hd,
        renderRadius: g.RENDER_RADIUS, releves,
      };
    }, [px, pz]);
    console.log(JSON.stringify({ cible: res.cible, rayon: res.rayon, atlas: res.atlas, worldHd: res.worldHd, renderRadius: res.renderRadius }));
    for (const r of res.releves) console.log(JSON.stringify(r));
    console.log('erreurs :', JSON.stringify(tab.erreurs.slice(0, 5)));
    await tab.close();
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
