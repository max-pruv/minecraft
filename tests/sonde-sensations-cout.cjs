// CE QUE COÛTENT LES SENSATIONS AU VOLANT (v340) — A/B sur la MÊME page, en
// ordre alterné (v268) : `reglage.actif` rejoue la conduite d'avant. On roule
// en rond sur la plate-forme du témoin et l'on compte les images, les appels
// de dessin et les programmes de shader.
const { Banc, souffler } = require('./banc.js');
const { mesurerSensations } = require('./sensations-mesure.js');

(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeSensationsCout', { rr: Number(process.env.RR || 3) });
    // la plate-forme et la voiture, par la mesure elle-même (on s'arrête au
    // moment où elle descend : on remonte tout de suite)
    await page.evaluate(`(${mesurerSensations.toString()})()`);
    const out = await page.evaluate(async () => {
      const g = window.__game, P = g.player;
      const R = await import('./src/sensations.js');
      const tenir = (n) => new Promise((fin) => { let c = 0, p = performance.now(); const f = (t) => { c += (t - p) / 1000; p = t; if (c >= n) fin(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
      for (let e = 0; e < 8 && !g.fun.montureConduite(); e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
      const ax = 30750, az = 30600;
      P.pos.set(ax, 121.01, az + 8); P.vitesseVoiture = 0; P.gaz = 0.5; P.keys.add('KeyA');
      await tenir(2);
      const bras = [];
      for (const actif of [true, false, false, true, true, false]) {
        R.reglage.actif = actif;
        await tenir(1);
        const f0 = g.renderer.info.render.frame, t0 = performance.now();
        let appels = 0, n = 0, pire = 0, prec = performance.now();
        while (performance.now() - t0 < 6000) {
          await new Promise((r) => requestAnimationFrame(() => r()));
          const t = performance.now(); pire = Math.max(pire, t - prec); prec = t;
          appels += g.renderer.info.render.calls; n++;
        }
        bras.push({ actif, ips: +((g.renderer.info.render.frame - f0) / ((performance.now() - t0) / 1000)).toFixed(2),
          appels: Math.round(appels / n), pire: Math.round(pire), programmes: g.renderer.info.programs.length });
      }
      P.keys.clear(); P.gaz = 0;
      return bras;
    });
    console.log(JSON.stringify(out, null, 1));
  } catch (e) { console.log('ÉCHEC', e.message); }
  finally { await banc.fermer(); process.exit(0); }
})();
