// L'ENFANT DÉPOSÉ APRÈS UN CRASH D'AVION RETOMBE-T-IL ? (v455)
//   node tests/sonde-crash-depot.cjs
// Rejoue le crash sur la dalle du témoin de monte.js (deux cas : cassé au sol,
// cassé en l'air) et imprime, après le dépôt, ce qui décide de la chute :
// running, flying, pilote, monture, onGround, pos, vel, le bloc sous les pieds,
// le morceau chargé, et le nombre d'appels de player.update.
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8417, portPairs: 9417 });
  await banc.ouvrir();
  try {
    const page = await banc.jouerSeul('Crash', {});
    for (const cas of ['sol', 'air']) {
      const r = await page.evaluate(async (cas) => {
        const g = window.__game, dormir = (ms) => new Promise((f) => setTimeout(f, ms));
        const { BLOCK } = await import('./src/blocks.js');
        for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
        g.animalManager.animals.length = 0;
        g.player.pilote = null; g.player.avionEtat = undefined; g.player.flying = false;
        const x0 = 30000, z0 = 30600, L = 60, W = 12;
        let y0 = 0;
        for (let d = -6; d <= L; d += 4) for (let w = -W; w <= W; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
        y0 += 2;
        for (let d = -6; d <= L; d++) for (let w = -W; w <= W; w++) {
          g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
          for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
        }
        g.player.yaw = -Math.PI / 2; g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
        await dormir(1200);
        g.animalManager.invoquer('avionligne', x0 + 3, z0);
        await dormir(800);
        for (let e = 0; e < 8 && !g.player.pilote; e++) { document.getElementById('ride-btn').click(); await dormir(500); }
        if (!g.player.pilote) return { err: 'pas aux commandes' };
        if (cas === 'air') { g.player.pos.set(x0 + 10, y0 + 6, z0 + 0.5); g.player.vel.set(0, -5, 0); }
        let appels = 0; const orig = g.player.update.bind(g.player);
        g.player.update = (dt) => { appels++; return orig(dt); };
        g.player.ecraserAvion('vite');
        const t0 = performance.now(); let depose = null;
        while (performance.now() - t0 < 8000 && g.player.pilote) await dormir(100);
        depose = Math.round(performance.now() - t0);
        const rel = [];
        for (let i = 0; i < 12; i++) {
          const p = g.player.pos, fx = Math.floor(p.x), fz = Math.floor(p.z);
          rel.push({ t: Math.round(performance.now() - t0), running: g.running, fly: g.player.flying, pilote: !!g.player.pilote,
            monture: !!(g.fun.montureConduite && g.fun.montureConduite()), etat: g.player.avionEtat, sol: g.player.onGround,
            y: +p.y.toFixed(2), vy: +g.player.vel.y.toFixed(2), sous: g.world.getBlock(fx, Math.floor(p.y - 0.5), fz),
            sommet: g.world.sommetColonne(fx, fz), morceau: !!(g.world.chunks && g.world.chunks.get && [...g.world.chunks.keys()].length), appels });
          await dormir(400);
        }
        g.player.update = orig;
        for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
        g.animalManager.animals.length = 0;
        return { y0, depose, rel };
      }, cas);
      console.log(cas, JSON.stringify(r));
    }
  } catch (e) { console.log('ERREUR', e.message); }
  finally { await banc.fermer(); process.exit(0); }
})();
