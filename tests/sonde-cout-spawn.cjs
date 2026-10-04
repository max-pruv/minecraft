// CE QUE COÛTE UNE PAGE EN JEU AU POINT D'APPARITION (v318) : images rendues en
// vingt secondes, convois nés, voitures dessinées. C'est la page voisine qui
// tient la machine pendant que maj.js mesure la préparation d'une autre.
// Usage : node tests/sonde-cout-spawn.cjs [passages]
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8423, portPairs: 9423 });
  await banc.ouvrir();
  try {
    for (let k = 0; k < +(process.argv[2] || 2); k++) {
      await souffler();
      const page = await banc.jouerSeul('Spawn' + k);
      const r = await page.evaluate(async () => {
        const g = window.__game;
        await new Promise((f) => setTimeout(f, 5000));
        const f0 = g.renderer.info.render.frame, t0 = performance.now();
        let calls = 0, n = 0;
        while (performance.now() - t0 < 20000) {
          await new Promise((f) => setTimeout(f, 1000));
          calls += g.renderer.info.render.calls; n++;
        }
        const e = window.__vehicules.etat() || [];
        return { images: g.renderer.info.render.frame - f0, appels: Math.round(calls / n), convois: e.length,
          voitures: e.filter((c) => c.nom === 'voiture').reduce((s, c) => s + c.total, 0),
          visibles: e.reduce((s, c) => s + c.visibles, 0), x: Math.round(g.player.pos.x), z: Math.round(g.player.pos.z) };
      });
      console.log(JSON.stringify(r));
      await page.close();
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
