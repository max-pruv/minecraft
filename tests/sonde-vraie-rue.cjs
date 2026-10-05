// Sonde (v365) : la voiture de l'enfant contre une VRAIE voiture de la rue, par
// le vrai crochet — positions relevées image par image, pour démonter le témoin
// de monte.js s'il rougit.     node tests/sonde-vraie-rue.cjs
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8337, portPairs: 9337 });
  await banc.ouvrir();
  try {
    const page = await banc.jouerSeul('SondeRue', { tactile: true });
    const r = await page.evaluate(async () => {
      const g = window.__game, P = g.player;
      const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
      const { BLOCK } = await import('./src/blocks.js');
      if (g.npcs) for (const n of g.npcs) if (n.pos) n.pos.set(n.pos.x, -500, n.pos.z);
      const x0 = 41000, z0 = 41000; let y0 = 0;
      for (let d = -20; d <= 420; d += 4) for (let w = -60; w <= 0; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 3;
      for (let d = -20; d <= 420; d++) for (let w = -60; w <= 0; w++) g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh); g.animalManager.animals.length = 0;
      P.flying = false; P.yaw = -Math.PI / 2; P.pos.set(x0, y0 + 1.2, z0 - 20.5); P.vel.set(0, 0, 0);
      g.animalManager.invoquer('voiture', x0 + 3, z0 - 20.5, false, { flotte: 'koenigsegg-jesko.glb' });
      await dormir(600);
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); const t = performance.now(); while (!auVolant() && performance.now() - t < 2500) await dormir(150); }
      if (!auVolant()) return { err: 'pas au volant' };
      const zr = z0 - 50;
      const anneau = [[250, 0], [410, 0], [410, -8], [120, -8], [120, 0], [250, 0]].map(([dx, dz]) => ({ x: x0 + dx, y: y0 + 1, z: zr + dz }));
      const conv = g.vehicules.circulation(anneau, 77, { nb: 1, vitesse: 0 });
      await dormir(500);
      const q = conv.place(0);
      const a = 15 * Math.PI / 180, yaw = Math.atan2(-Math.cos(a), Math.sin(a));
      P.pos.set(q.x - 1, y0 + 1.05, q.z + 3); P.yaw = yaw; P.vitesseVoiture = 0; P.vel.set(0,0,0); await dormir(800); P.pos.set(q.x - 1, y0 + 1.05, q.z + 3); P.vitesseVoiture = 16; P.derive = 0; P.vel.set(-Math.sin(yaw) * 16, 0, -Math.cos(yaw) * 16);
      P.touchMove.f = 0.6;
      const trace = []; const h0 = P.obstacleVehicule, vc0 = P.voitureContre;
      P.obstacleVehicule = (x, z, cap, xa, za) => { const r = h0(x, z, cap, xa, za); if (trace.length < 400) trace.push(['obs', +(x - x0).toFixed(2), +(z - zr).toFixed(2), +(cap).toFixed(3), r, g.vehicules.obstacleDevant(x, z, cap), g.vehicules.obstacleDevant(xa, za, cap)]); return r; };
      const C = await import('./src/conduite.js'); P.voitureContre = (x, z, cap) => { const r = vc0(x, z, cap); trace.push(['vc', r, +(x - x0).toFixed(2), +(z - zr).toFixed(2), cap, r && C.normaleEntreBoites(C.boiteVoiture(x, z, cap, 2.2, P.gabarit / 2), r), P.gabarit]); return r; };
      window.__trace = trace;
      const dv0 = P.deplacerVoiture.bind(P), up0 = P.update.bind(P);
      P.deplacerVoiture = (dt) => { trace.push(['dv<', +(P.pos.x - x0).toFixed(2), +(P.pos.z - zr).toFixed(2), dt]); dv0(dt); trace.push(['dv>', +(P.pos.x - x0).toFixed(2), +(P.pos.z - zr).toFixed(2)]); };
      P.update = (dt) => { trace.push(['up<', +(P.pos.x - x0).toFixed(2), +(P.pos.z - zr).toFixed(2), dt]); up0(dt); trace.push(['up>', +(P.pos.x - x0).toFixed(2), +(P.pos.z - zr).toFixed(2)]); };
      const log = [];
      const t1 = performance.now();
      while (performance.now() - t1 < 4000) {
        await dormir(100);
        const o = conv.place(0);
        log.push({ px: +(P.pos.x - x0).toFixed(1), pz: +(P.pos.z - zr).toFixed(1), py: +(P.pos.y - y0).toFixed(2), v: +(P.vitesseVoiture || 0).toFixed(1), ox: +(o.x - x0).toFixed(1), oz: +(o.z - zr).toFixed(1), oy: +(o.y - y0).toFixed(2), d0: +conv.dElement(0).toFixed(2), ret: conv.retard ? conv.retard[0] : null, dist: conv.distance, ici: g.vehicules.obstacleDevant(P.pos.x, P.pos.z, P.yaw + Math.PI), chocs: P.chocs || 0, att: conv.attend[0], fp: P.freinePieton });
      }
      P.touchMove.f = 0;
      const tr = window.__trace; const k = tr.findIndex((t) => t[0] === 'vc'); return { autour: tr.slice(Math.max(0, k - 14), k + 3), n: tr.length, pos: [P.pos.x - x0, P.pos.z - zr] };
    });
    console.log(JSON.stringify(r));
  } finally { await banc.fermer(); process.exit(0); }
})().catch((e) => { console.error(e); process.exit(2); });
