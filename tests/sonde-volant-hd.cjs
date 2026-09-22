// POURQUOI « on prend le volant d'une voiture vue dans la rue » ROUGIT-IL AVEC
// LA COUCHE HD ? Deux bras sur la même page-type que la fumée (rr par défaut),
// hd allumé puis éteint : les voitures existent-elles, bougent-elles, la boucle
// vit-elle, à quelle distance passent-elles ?
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8403, portPairs: 9403 });
  await banc.ouvrir();
  try {
    for (const hd of [3, 0]) {
      await souffler();
      const tab = await banc.jouerSeul('Sonde' + hd, { params: `&hd=${hd}` });
      const out = await tab.evaluate(async () => {
        const P = await import('./src/paris.js');
        const g = window.__game;
        const c = P.circuitsParis((x, z) => g.world.terrainHeight(x, z))[0];
        const A = c.pts[2], B = c.pts[3];
        const x = A.x + (B.x - A.x) * 0.4, z = A.z + (B.z - A.z) * 0.4;
        g.player.pos.set(x, g.world.sommetColonne(Math.floor(x), Math.floor(z)) + 1, z);
        g.player.vel.set(0, 0, 0);
        const releves = [];
        const f0 = g.renderer.info.render.frame, t0 = performance.now();
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const v = window.__vehicules;
          const e = v.etat();
          const voitures = e.filter((k) => k.nom === 'voiture');
          const places = voitures.flatMap((k) => k.places || []);
          let dmin = Infinity;
          for (const p of places) dmin = Math.min(dmin, Math.hypot(p.x - g.player.pos.x, p.z - g.player.pos.z));
          const place = v.placeProche(g.player.pos, 5);
          releves.push({ s: i + 1, convois: voitures.length, total: voitures.reduce((s, k) => s + k.total, 0), visibles: voitures.reduce((s, k) => s + (k.visibles || 0), 0), dmin: Math.round(dmin * 10) / 10, place: place ? place.nom : null, images: g.renderer.info.render.frame - f0, morceaux: g.chunkMeshes.size });
          if (place && place.nom === 'voiture') break;
        }
        return { x: Math.round(x), z: Math.round(z), ms: Math.round(performance.now() - t0), releves: releves.filter((r, i) => i % 5 === 0 || i === releves.length - 1), etatCle: Object.keys((window.__vehicules.etat()[0]) || {}) };
      });
      console.log('hd=' + hd, JSON.stringify(out), 'erreurs', JSON.stringify(tab.erreurs.slice(0, 3)));
      await tab.close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
