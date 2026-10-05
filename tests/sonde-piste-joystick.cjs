// QUI RALENTIT LA VOITURE DU TÉMOIN DE L'ACCÉLÉRATEUR ? (v354) Au rejeu seul
// de `monte.js`, la citadine tombait de 27 à 2 blocs/s vers x ≈ 97 et son cap
// tournait de 0,68 rad sans volant, sans choc compté. On refait la piste du
// témoin et l'on note, image par image, tout ce qui peut toucher la vitesse :
// la famille d'obstacle, les chocs (même sous le seuil), le frein piéton,
// l'état des dégâts, la position des passants proches.
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondePiste', { rr: 3 });
    page.on('pageerror', (e) => console.log('ERREUR PAGE', e.message));
    const out = await page.evaluate(async () => {
      const g = window.__game, P = g.player;
      const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
      const { BLOCK } = await import('./src/blocks.js');
      const x0 = 30000, z0 = 30600, L = 300, W = 36;
      let y0 = 0;
      for (let d = -6; d <= L; d += 4) for (let w = -W; w <= W; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 2;
      for (let d = -6; d <= L; d++) for (let w = -W; w <= W; w++) {
        g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
        for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
      }
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      P.yaw = -Math.PI / 2; P.pitch = 0; P.flying = false;
      P.pos.set(x0, y0 + 1.01, z0 + 0.5); P.vel.set(0, 0, 0);
      await dormir(1200);
      for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
      g.animalManager.animals.length = 0;
      g.animalManager.invoquer('voiture', x0 + 3, z0, false, { flotte: 'berline-citadine' });
      await dormir(800);
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await dormir(500); }
      if (!auVolant()) return { err: 'pas monté' };
      for (const n of (g.npcs || [])) if (n.pos) n.pos.y = -500;
      // instruments
      const evts = [];
      const hook = P.obstacleVehicule;
      P.obstacleVehicule = function (...a) { const r = hook.apply(this, a); if (r) evts.push({ t: 'fam', r, x: +(P.pos.x - x0).toFixed(1) }); return r; };
      const pc = P.publierChoc.bind(P);
      P.publierChoc = (f, dx, dz) => { evts.push({ t: 'choc', f: +f.toFixed(3), x: +(P.pos.x - x0).toFixed(1), z: +(P.pos.z - z0).toFixed(1) }); return pc(f, dx, dz); };
      const rel = [];
      P.touchMove.f = 1; P.touchMove.s = 0;
      let img = 0, prevYaw = P.yaw;
      await new Promise((fin) => {
        const pas = () => {
          img++;
          const v = Math.hypot(P.vel.x, P.vel.z);
          const ev = P.etatVoiture;
          if (img % 5 === 0 || Math.abs(P.yaw - prevYaw) > 0.01) rel.push({ i: img, x: +(P.pos.x - x0).toFixed(1), z: +(P.pos.z - z0).toFixed(2), v: +v.toFixed(1), yaw: +P.yaw.toFixed(3), der: +(P.derive || 0).toFixed(3), fp: !!P.freinePieton, ev: ev ? { m: ev.moteur, d: ev.direction, p: ev.enPanne } : null, f: P.touchMove.f });
          prevYaw = P.yaw;
          if (P.pos.x - x0 > 200 || img > 1500) fin(); else requestAnimationFrame(pas);
        };
        requestAnimationFrame(pas);
      });
      P.touchMove.f = 0;
      const pres = (g.npcs || []).filter((n) => n.pos && Math.abs(n.pos.x - P.pos.x) < 30 && Math.abs(n.pos.z - P.pos.z) < 30).map((n) => [n.constructor.name, +(n.pos.x - x0).toFixed(1), +(n.pos.y - y0).toFixed(1), +(n.pos.z - z0).toFixed(1)]);
      return { rel: rel.filter((r, k) => k % 3 === 0 || r.v < 20), evts: evts.slice(0, 60), pres };
    });
    console.log(JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n{'));
  } catch (e) { console.log('ERREUR', e.message); }
  await banc.fermer();
  process.exit(0);
})();
