// LES TRACES DE PNEUS EN CAPTURE (v434) : une glissade au frein à main, volant
// braqué, puis la voiture arrêtée et vue de derrière — de jour et de nuit, sur
// une piste de pierre puis sur l'herbe du point d'apparition (surface
// continue). Le dessin est forcé (rendu logiciel). Dossier : argument 1.
const { Banc, souffler } = require('./banc.js');
const dir = process.argv[2] || '.';
(async () => {
  const banc = new Banc({ portJeu: 8400, portPairs: 9400 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeTracesCap', { rr: 4 });
    const glisser = (ou) => page.evaluate(async (ou) => {
      const g = window.__game, T = await import('./src/traces.js'); T.reglageTraces.dessin = true; T.effacerTraces();
      const { BLOCK } = await import('./src/blocks.js');
      const tenir = (n) => new Promise((f) => { let c = 0, p = performance.now(); const s = (t) => { c += (t - p) / 1000; p = t; if (c >= n) f(); else requestAnimationFrame(s); }; requestAnimationFrame(s); });
      const P = g.player, auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
      let x0, z0, y;
      if (ou === 'piste') {
        x0 = 31800; z0 = 30600; y = 120;
        for (let x = x0 - 10; x <= x0 + 120; x++) for (let z = z0 - 40; z <= z0 + 40; z++) if (g.world.getBlock(x, y, z) !== BLOCK.STONE) g.world.setBlock(x, y, z, BLOCK.STONE);
        y += 1;
      } else { x0 = 40; z0 = 40; P.flying = false; y = g.world.solContinu(x0, z0) ?? (g.world.terrainHeight(x0, z0) + 1); }
      for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
      g.animalManager.animals.length = 0;
      P.yaw = -Math.PI / 2; P.pos.set(x0, y + 0.01, z0 + 0.5); P.vel.set(0, 0, 0); P.gaz = null; P.freinMain = false;
      await tenir(0.6);
      g.animalManager.invoquer('voiture', x0 + 3, z0);
      await tenir(0.5);
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
      const a = g.fun.montureConduite();
      const t0 = performance.now();
      while (!(a.mesh.userData.roues && a.mesh.userData.roues.length >= 4) && performance.now() - t0 < 20000) await tenir(0.3);
      P.yaw = -Math.PI / 2; P.pos.set(x0, y + 0.01, z0 + 0.5);
      P.gaz = 1; await tenir(2.2);
      P.freinMain = true; P.keys.add('KeyA');
      await tenir(1.6);
      P.keys.delete('KeyA'); P.freinMain = false; P.gaz = null;
      await tenir(2.0);
      // on descend et l'on regarde d'en haut, en arrière de la glissade
      const vx = P.pos.x, vz = P.pos.z, vy = P.pos.y;
      for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
      P.flying = true; P.vel.set(0, 0, 0);
      P.pos.set(vx - 4, vy + 7, vz + 10); P.yaw = 0.35; P.pitch = -0.75;
      await tenir(1.0);
      return T.etatTraces();
    }, ou);
    for (const [ou, heure, nom] of [['piste', 0.42, 'jour'], ['piste', 0.0, 'nuit'], ['herbe', 0.42, 'herbe']]) {
      const e = await glisser(ou);
      await page.evaluate((h) => window.__setDayTime(h), heure);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${dir}/traces-${nom}.png` });
      console.log(nom, JSON.stringify({ vivantes: e.vivantes, ys: e.ys.slice(-3) }));
    }
  } catch (e) { console.log('ÉCHEC', e.message); }
  finally { await banc.fermer(); process.exit(0); }
})();
