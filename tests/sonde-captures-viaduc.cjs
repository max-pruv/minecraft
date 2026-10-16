// CAPTURES DU VIADUC DE LA MANCHE (v455) : l'Eurostar sur la mer, vu de côté
// à hauteur du tablier, à `rr=9` (le banc ouvre à 2). Avant la v455, une digue
// de pierre au ras des flots ; après, un tablier sur piles.
// Usage : node tests/sonde-captures-viaduc.cjs <dossier> [suffixe]
const { Banc, souffler } = require('./banc.js');
const dossier = process.argv[2] || '.', suffixe = process.argv[3] || '';
(async () => {
  const banc = new Banc({ portJeu: 8437, portPairs: 9437 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Viaduc', { rr: 9, dpr: 1 });
    const r = await page.evaluate(async () => {
      const g = window.__game, dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      const T = await import('./src/trains.js');
      const s = T.segmentsDeTrain().find((q) => q.de === 'londres');
      const L = s.longueur, ux = (s.x1 - s.x0) / L, uz = (s.z1 - s.z0) / L;
      const k = 400, ax = s.x0 + ux * k, az = s.z0 + uz * k;
      // vingt blocs de côté, deux au-dessus de la mer, le regard sur la voie
      const x = ax - uz * 22 - ux * 12, z = az + ux * 22 - uz * 12;
      g.player.flying = true; g.player.pos.set(x, 33, z); g.player.vel.set(0, 0, 0);
      g.player.yaw = Math.atan2(x - (ax + ux * 6), z - (az + uz * 6)); g.player.pitch = 0.05;
      await dodo(20000);
      return { x: Math.round(x), z: Math.round(z), cote: T.coteContinue(s, k / L) };
    });
    await page.screenshot({ path: `${dossier}/viaduc${suffixe}.png` });
    console.log(JSON.stringify(r));
    await page.close();
  } finally { await banc.fermer(); process.exit(0); }
})();
