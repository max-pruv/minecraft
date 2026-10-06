// SONDE (v385) : captures de la montée dans un avion (escalier, porte), et
// les hauteurs relevées à chaque phase. Écrit les images dans le dossier passé.
const { Banc } = require('./banc.js');
const DOSSIER = process.argv[2] || '.';
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  try {
    const p = await banc.jouerSeul('SondeCapAvion', { embarq: 1, rr: 6 });
    for (const key of ['avionligne', 'chasseur']) {
      await p.evaluate(async (key) => {
        const THREE = await import('three');
        const g = window.__game, am = g.animalManager;
        for (const a of [...am.animals]) { am.scene.remove(a.mesh); am.animals.splice(am.animals.indexOf(a), 1); }
        if (g.fun.montureConduite && g.fun.montureConduite()) document.getElementById('ride-btn').click();
        g.player.pilote = null; g.player.avionEtat = undefined; g.player.avionEnVol = undefined; g.player.flying = false;
        window.__setDayTime && window.__setDayTime(0.3);
        const x0 = 20000.5, z0 = 20000.5;
        g.player.pos.set(x0, g.world.terrainHeight(x0, z0) + 2, z0);
        await new Promise((r) => setTimeout(r, 5000));
        const a = am.invoquer(key, x0, z0, false);
        a.yaw = 0; a.mesh.rotation.y = Math.PI; a.mesh.position.copy(a.pos); a.mesh.updateMatrixWorld(true);
        const ici = a.mesh.localToWorld(new THREE.Vector3(-3.5, 0, -5));
        g.player.pos.set(ici.x, g.world.sommetColonne(Math.floor(ici.x), Math.floor(ici.z)) + 1, ici.z);
        g.player.yaw = Math.atan2(-(a.pos.x - ici.x), -(a.pos.z - ici.z));
        window.__avion = a;
        await new Promise((r) => setTimeout(r, 3000));
        document.getElementById('ride-btn').click();
      }, key);
      const vues = new Set();
      const t0 = Date.now();
      while (Date.now() - t0 < 60000) {
        const e = await p.evaluate(() => { const g = window.__game, a = window.__avion; const e = g.player.embarquement;
          return e ? { ph: e.phase, k: e.t, py: +g.player.pos.y.toFixed(2), ay: +a.pos.y.toFixed(2), my: +a.mesh.position.y.toFixed(2) } : null; });
        if (!e) break;
        if (!vues.has(e.ph) && (e.ph !== 'approche' || e.k > 0.6)) {
          vues.add(e.ph); console.log(key, JSON.stringify(e));
          await p.screenshot({ path: DOSSIER + '/' + key + '-' + e.ph + '.png' });
        }
        await new Promise((r) => setTimeout(r, 80));
      }
    }
  } catch (e) { console.log('ERREUR', e && e.stack || e); }
  await banc.fermer().catch(() => {}); process.exit(0);
})();
