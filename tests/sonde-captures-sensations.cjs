// CAPTURES DES SENSATIONS AU VOLANT (v340) : à l'arrêt, pleins gaz en ligne
// droite, et dans un virage tenu — sur la branche, puis sur `origin/main`
// (CAPTURES=dossier). Le jugement se fait en capture (règle de Max).
const { Banc, souffler } = require('./banc.js');
const DOSSIER = process.env.CAPTURES || '/tmp/claude-0/-home-user-minecraft/2589768a-042e-5a60-8e05-0db8a5c8a492/scratchpad/capt';
require('fs').mkdirSync(DOSSIER, { recursive: true });
(async () => {
  const banc = new Banc({ portJeu: 8399, portPairs: 9399 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeCapturesSens', { rr: 6 });
    const tenir = (n) => page.evaluate((n) => new Promise((fin) => { let c = 0, p = performance.now(); const f = (t) => { c += (t - p) / 1000; p = t; if (c >= n) fin(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
    // une longue ligne droite dégagée près du point d'apparition
    const depart = await page.evaluate(() => {
      const g = window.__game, P = g.player, w = g.world;
      for (let r = 0; r < 400; r += 16) for (let k = 0; k < 16; k++) {
        const x0 = Math.round(P.pos.x + r * Math.cos(k)), z0 = Math.round(P.pos.z + r * Math.sin(k));
        for (const [dx, dz, yaw] of [[1, 0, -Math.PI / 2], [-1, 0, Math.PI / 2], [0, -1, 0], [0, 1, Math.PI]]) {
          const h0 = w.sommetColonne(x0, z0); let ok = true;
          for (let d = -10; d <= 90 && ok; d++) for (let l = -3; l <= 3 && ok; l++) {
            const x = x0 + dx * d + (dz ? l : 0), z = z0 + dz * d + (dx ? l : 0);
            const h = w.sommetColonne(x, z);
            if (Math.abs(h - h0) > 1 || w.getBlock(x, h + 1, z) !== 0 || w.getBlock(x, h, z) === 9) ok = false;
          }
          if (ok) return { x: x0 + 0.5, z: z0 + 0.5, y: h0 + 1.01, yaw };
        }
      }
      return null;
    });
    console.log('départ', JSON.stringify(depart));
    await page.evaluate(async (d) => {
      const g = window.__game, P = g.player;
      for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
      g.animalManager.animals.length = 0;
      P.pos.set(d.x, d.y, d.z); P.yaw = d.yaw; P.pitch = -0.08;
      g.animalManager.invoquer('voiture', d.x - Math.sin(d.yaw) * 3, d.z - Math.cos(d.yaw) * 3);
    }, depart);
    await tenir(1);
    for (let e = 0; e < 8 && !(await page.evaluate(() => !!window.__game.fun.montureConduite())); e++) { await page.evaluate(() => document.getElementById('ride-btn').click()); await tenir(0.5); }
    await page.evaluate((d) => { const P = window.__game.player; P.pos.set(d.x, d.y, d.z); P.yaw = d.yaw; P.pitch = -0.08; }, depart);
    await tenir(4);
    await page.screenshot({ path: `${DOSSIER}/1-arret.png` });
    await page.evaluate(() => { window.__game.player.gaz = 1; });
    await tenir(2.2);
    await page.screenshot({ path: `${DOSSIER}/2-pleins-gaz.png` });
    await page.evaluate(() => { window.__game.player.keys.add('KeyA'); });
    await tenir(0.9);
    await page.screenshot({ path: `${DOSSIER}/3-virage.png` });
    await tenir(0.6);
    await page.screenshot({ path: `${DOSSIER}/4-virage-tenu.png` });
    console.log(JSON.stringify(await page.evaluate(() => ({ fov: window.__game.camera.fov, v: window.__game.player.vitesseVoiture }))));
  } catch (e) { console.log('ÉCHEC', e.message); }
  finally { await banc.fermer(); process.exit(0); }
})();
