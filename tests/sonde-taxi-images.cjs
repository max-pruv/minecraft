// SONDE (banc-lot3) : « le taxi roule avec les contrôles tactiles » compte
// quarante images par `renderer.info.render.frame` — qui avance d'un cran par
// `render()`, et la sonde des reflets en fait un de plus par image près d'une
// voiture (une face par image, v245). Quarante « images » valent alors vingt
// tours de boucle, une seconde de jeu. On sépare : rendus, tours de boucle
// (requestAnimationFrame), temps de JEU (somme des dt bornés à 1/20, la règle
// de main.js) et distance roulée, pendant vingt secondes de montre.
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8474, portPairs: 9474 }); await banc.ouvrir();
  try {
    const { positionDe } = await import('../src/mondes.js');
    const NY = positionDe('ny');
    for (let passe = 0; passe < Number(process.env.PASSES || 2); passe++) {
      const p = await banc.joueur('SondeTaxiImg' + passe, { carte: 'manhattan', rr: 2, tactile: true, viewport: { width: 700, height: 460 } });
      await p.locator('.who-card.active').click();
      await p.getByRole('button', { name: 'Plus tard', exact: true }).click();
      await p.locator('#play-btn').click();
      await p.waitForFunction(() => __game.running);
      await p.evaluate((NY) => {
        const g = __game;
        g.player.pos.set(NY.x, 33.01, NY.z + 25); g.player.yaw = 0; g.player.pitch = 0; g.player.vel.set(0, 0, 0);
        for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
        g.animalManager.animals.length = 0;
        const s = g.passants?.sites?.find((q) => q.urbain);
        for (const h of s?.peuple || []) if (Math.hypot(h.pos.x - NY.x, h.pos.z - NY.z) < 60) h.pos.set(NY.x + 400, h.pos.y, NY.z + 400);
        g.animalManager.invoquer('voiture', NY.x, NY.z + 22, false, { flotte: 'ny-crown-victoria' });
      }, NY);
      await p.waitForFunction((NY) => __game.animalManager.animals.some((a) => a.mesh && Math.hypot(a.mesh.position.x - NY.x, a.mesh.position.z - NY.z - 22) < 3), NY, { timeout: 60000, polling: 250 }).catch(() => {});
      await p.locator('#ride-btn').waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
      await p.evaluate(() => document.getElementById('ride-btn').click());
      const doigt = await p.context().newCDPSession(p);
      await doigt.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y: 320 }] });
      await doigt.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 100, y: 270 }] });
      if (process.env.PETIT) await p.setViewportSize({ width: 16, height: 16 });
      const r = await p.evaluate(async () => {
        const g = __game, z0 = g.player.pos.z, f0 = g.renderer.info.render.frame;
        let tours = 0, jeu = 0, last = performance.now();
        const rel = [];
        const t0 = performance.now();
        await new Promise((fin) => {
          const tic = (now) => {
            tours++; jeu += Math.min(Math.max((now - last) / 1000, 0), 0.05); last = now;
            if (tours % 5 === 0) rel.push([tours, g.renderer.info.render.frame - f0, +jeu.toFixed(2), +(z0 - g.player.pos.z).toFixed(1)]);
            if (performance.now() - t0 > 20000) return fin();
            requestAnimationFrame(tic);
          };
          requestAnimationFrame(tic);
        });
        return { auVolant: !!(g.fun.montureConduite && g.fun.montureConduite()), tours, rendus: g.renderer.info.render.frame - f0,
          jeu: +jeu.toFixed(2), avance: +(z0 - g.player.pos.z).toFixed(2), rel: rel.slice(0, 12) };
      });
      await doigt.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      console.log('passe', passe, JSON.stringify(r));
      await p.close();
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
