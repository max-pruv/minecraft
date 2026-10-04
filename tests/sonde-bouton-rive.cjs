// LE BOUTON « CONDUIRE » SUR LA RIVE GAUCHE (v318) : le témoin de monte.js,
// seul, plusieurs fois, sur une page neuve. On se pose au milieu du premier
// tronçon du circuit le plus au sud de Paris, et l'on relève, toutes les
// demi-secondes pendant soixante secondes : l'état du bouton, la place de
// voiture la plus proche (`diagPlace`, quand elle existe) et le nombre de
// convois de la ville. Usage : node tests/sonde-bouton-rive.cjs [passages]
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8419, portPairs: 9419 });
  await banc.ouvrir();
  const n = +(process.argv[2] || 3);
  try {
    for (let k = 0; k < n; k++) {
      await souffler();
      const page = await banc.jouerSeul('BoutonRive' + k);
      const r = await page.evaluate(async () => {
        const P = await import('./src/paris.js');
        const g = window.__game;
        const cs = P.circuitsParis((x, z) => g.world.terrainHeight(Math.round(x), Math.round(z)));
        const sud = cs.map((c) => ({ c, dz: c.pts.reduce((s, q) => s + q.z, 0) / c.pts.length - P.PARIS.z })).sort((a, b) => b.dz - a.dz)[0];
        const p0 = sud.c.pts[0], p1 = sud.c.pts[1];
        const x = Math.round((p0.x + p1.x) / 2), z = Math.round((p0.z + p1.z) / 2);
        g.player.flying = false;
        g.player.pos.set(x, g.world.sommetColonne(x, z) + 3, z);
        g.player.vel.set(0, 0, 0);
        const t0 = performance.now(), f0 = g.renderer.info.render.frame;
        const releves = [];
        let premier = null;
        while (performance.now() - t0 < 60000) {
          await new Promise((r2) => setTimeout(r2, 500));
          const b = document.getElementById('board-btn');
          const vis = getComputedStyle(b).display !== 'none' && b.textContent.includes('Conduire');
          const d = window.__vehicules.diagPlace(12);
          const e = window.__vehicules.etat().filter((c) => c.nom === 'voiture');
          if (vis && premier === null) premier = Math.round(performance.now() - t0);
          if (releves.length < 200) releves.push({ t: Math.round((performance.now() - t0) / 100) / 10, vis, d: d ? d.d : null, dess: d ? d.visible : null, convois: e.length });
          if (premier !== null && performance.now() - t0 > premier + 3000) break;
        }
        return { premier, images: g.renderer.info.render.frame - f0, debut: releves.slice(0, 6), fin: releves.slice(-4),
          plusPres: Math.min(...releves.filter((q) => q.d !== null).map((q) => q.d)) };
      });
      console.log(JSON.stringify(r));
      await page.close();
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
