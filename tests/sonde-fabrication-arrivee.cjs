// LA RUE SE FABRIQUE PAR TRANCHES (v429) — combien de voitures apparaissent
// dans une même image à l'arrivée d'une téléportation. On saute dans une
// ville et l'on relève, image par image, la hausse du nombre de voitures
// visibles (`etat().visibles`, que l'ancien code publie aussi) : sur
// l'ancien code toute la rue se fabrique dans l'image où elle entre dans les
// quarante-cinq blocs. Usage : node tests/sonde-fabrication-arrivee.cjs [villes…]
const { Banc, souffler } = require('./banc.js');
const villes = process.argv.slice(2).length ? process.argv.slice(2) : ['rome', 'paris', 'londres'];
(async () => {
  const banc = new Banc({ portJeu: 8434, portPairs: 9434 });
  await banc.ouvrir();
  const out = {};
  try {
    for (const v of villes) {
      await souffler();
      const page = await banc.jouerSeul('Fab' + v, { rr: 6 });
      out[v] = await page.evaluate(async (ville) => {
        const { positionDe } = await import('./src/mondes.js');
        const g = window.__game, p = positionDe(ville);
        const vues = () => (window.__vehicules.etat() || []).reduce((n, c) => n + (c.visibles || 0), 0);
        const hausses = []; let prec = vues(), actif = true, images = 0;
        const tic = () => { const e = vues(); if (e > prec) hausses.push(e - prec); prec = e; images++; if (actif) requestAnimationFrame(tic); };
        requestAnimationFrame(tic);
        g.player.flying = true;
        g.player.pos.set(p.x + 0.5, g.world.terrainHeight(p.x, p.z) + 6, p.z + 0.5); g.player.vel.set(0, 0, 0);
        await new Promise((f) => setTimeout(f, 12000));
        actif = false;
        return { vues: vues(), images, maxParImage: Math.max(0, ...hausses), hausses: hausses.length };
      }, v);
      await page.close();
    }
  } catch (e) { out.echec = e.message; } finally {
    console.log(JSON.stringify(out));
    await banc.fermer(); process.exit(0);
  }
})();
