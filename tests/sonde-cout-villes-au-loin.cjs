// Ce que coûte le bâti lointain (v327) à l'arrivée en vol sur Paris : la même
// page, le même vol que le témoin « l'écran ne se fige pas en arrivant sur une
// ville » (monte.js), le bâti visible ou caché, en ORDRE ALTERNÉ (v268).
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8395, portPairs: 9395 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Cout', { rr: 12 });
    for (const bati of [true, false, false, true, true, false]) {
      await souffler();
      const r = await page.evaluate(async (bati) => {
        const g = window.__game;
        const m = await import('./src/montures.js');
        const { positionDe } = await import('./src/mondes.js');
        const def = m.MONTURES.find((d) => d.key === 'chasseur');
        const b = g.horizon.mesh.children.find((o) => o.isInstancedMesh);
        if (b) b.visible = bati;
        const V = positionDe('paris');
        g.player.pos.set(V.x - 700, 96, V.z);
        g.player.vel.set(0, 0, 0);
        g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
        g.player.flying = true; g.player.pilote = def.pilote; g.player.vitesseAvion = def.pilote.max;
        g.player.avionEnVol = true; g.player.avionEtat = 'vol'; g.player.altitudeDecollage = -9999;
        await new Promise((f) => setTimeout(f, 3000));
        const durees = []; let prec = performance.now(), actif = true;
        const tic = (t) => { durees.push(t - prec); prec = t; if (actif) requestAnimationFrame(tic); };
        requestAnimationFrame(tic);
        await new Promise((f) => setTimeout(f, 18000));
        actif = false;
        g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
        g.player.vitesseAvion = undefined; g.player.flying = false;
        const total = durees.reduce((a, c) => a + c, 0);
        return { bati, images: durees.length, pire: Math.round(Math.max(...durees)),
          au300: +(durees.filter((d) => d > 300).reduce((a, c) => a + c, 0) / total * 100).toFixed(1),
          cadence: +(durees.length / (total / 1000)).toFixed(1), instances: b ? b.count : -1 };
      }, bati);
      console.log(JSON.stringify(r));
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
