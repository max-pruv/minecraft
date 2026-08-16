// Combien d'images par seconde, une page seule, sans rien d'autre autour.
const { Banc, dormir } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
  await banc.ouvrir();
  try {
    const p = await banc.jouerSeul('Marlon');
    await dormir(3000);
    const r = await p.evaluate(() => new Promise((res) => {
      let n = 0;
      const t0 = performance.now();
      const tick = () => {
        n++;
        if (performance.now() - t0 < 6000) requestAnimationFrame(tick);
        else res({ images: n, ms: performance.now() - t0 });
      };
      requestAnimationFrame(tick);
    }));
    const memo = await p.evaluate(() => ({
      morceaux: window.__game.world.chunks.size,
      tas: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null,
    }));
    console.log(JSON.stringify({ fps: +(r.images / (r.ms / 1000)).toFixed(1), ...memo }));
  } finally { await banc.fermer(); }
})().catch((e) => { console.error(e); process.exit(2); });
