// SONDE — LE MOBILIER SE CASSE (v535) : le scénario du témoin de monte.js,
// seul, pour itérer vite. Lu par personne.
//   node tests/sonde-mobilier-casse.cjs
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8391, portPairs: 9391 });
  await banc.ouvrir();
  try {
    const mobPage = await banc.jouerSeul('SondeCasse', { rr: 4 });
    const tombe = await mobPage.evaluate(async () => {
      const g = window.__game, w = g.world, p = g.player;
      const { RUE } = await import('./src/blocks.js');
      const { CHAUSSEE, World, CHUNK } = await import('./src/world.js');
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      // on descend de la voiture du témoin d'avant, on retire les bêtes
      if (g.fun.montureConduite && g.fun.montureConduite()) { document.getElementById('ride-btn').click(); await dodo(800); }
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const { positionDe } = await import('./src/mondes.js');
      const P = positionDe('paris');
      window.__carte.surTeleport(P.x + 40, P.z + 60);
      await dodo(9000);
      const px = Math.round(p.pos.x), pz = Math.round(p.pos.z);
      const sol = (x, z) => w.sommetColonne(x, z);
      const route = (x, z) => CHAUSSEE.has(w.getBlock(x, sol(x, z), z));
      let lieu = null;
      for (let r = 0; r < 40 && !lieu; r++) for (let dx = -r; dx <= r && !lieu; dx++) for (let dz = -r; dz <= r && !lieu; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = px + dx, z = pz + dz;
        if (!route(x, z)) continue;
        for (const [ax, az, yaw] of [[1, 0, -Math.PI / 2], [0, 1, Math.PI], [-1, 0, Math.PI / 2], [0, -1, 0]]) {
          let ok = true;
          for (let k = -4; k <= 22 && ok; k++) for (const l of [-1, 0, 1]) {
            const qx = x + ax * k + az * l, qz = z + az * k + ax * l;
            if (!route(qx, qz) || Math.abs(sol(qx, qz) - sol(x, z)) > 0) { ok = false; break; }
          }
          if (!ok) continue;
          if (g.vehicules.placeProche({ x: x + 0.5, y: sol(x, z) + 1, z: z + 0.5 }, 16)) continue;
          lieu = { x, z, ax, az, yaw };
          break;
        }
      }
      if (!lieu) return { lieu: null };
      const { x, z, ax, az, yaw } = lieu;
      const lx = x + ax * 10, lz = z + az * 10, ly = sol(lx, lz) + 1;
      // le réverbère de la ville : dans le morceau, PAS dans le journal
      const cx = Math.floor(lx / CHUNK), cz = Math.floor(lz / CHUNK);
      const data = w.ensureChunk(cx, cz);
      data[World.index(lx - cx * CHUNK, ly, lz - cz * CHUNK)] = RUE.REVERBERE;
      w.dirty.add(World.key(cx, cz));
      const cle = `${lx},${ly},${lz}`;
      let t = performance.now();
      while (!(g.mobilierCasse && g.mobilierCasse.piece(cle)) && performance.now() - t < 8000) await dodo(150);
      const piecePrete = !!(g.mobilierCasse && g.mobilierCasse.piece(cle));
      p.pos.set(x + 0.5, sol(x, z) + 1.01, z + 0.5); p.vel.set(0, 0, 0);
      p.yaw = yaw; p.pitch = 0; p.flying = false;
      // à l'arrêt contre : rien ne tombe, c'est un obstacle (le crochet, à la vitesse nulle)
      const cap = yaw + Math.PI;
      p.gabarit = 2.2; p.vitesseVoiture = 0;
      const contreArret = p.obstacleVehicule(lx + 0.5 - ax * 2.3, lz + 0.5 - az * 2.3, cap, lx + 0.5 - ax * 3, lz + 0.5 - az * 3);
      const tombeArret = !!(g.mobilierCasse && g.mobilierCasse.casses.has(cle));
      p.gabarit = 0.6;
      const cles = () => new Set(g.renderer.info.programs.map((q) => q.cacheKey));
      const avant = cles();
      g.animalManager.invoquer('voiture', p.pos.x + ax * 2.5, p.pos.z + az * 2.5);
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      for (let e = 0; e < 8 && !auVolant(); e++) { await dodo(e ? 0 : 1500); document.getElementById('ride-btn').click(); const t2 = performance.now(); while (!auVolant() && performance.now() - t2 < 2500) await dodo(150); }
      p.pos.set(x + 0.5, sol(x, z) + 1.01, z + 0.5); p.yaw = yaw; p.vel.set(0, 0, 0); p.vitesseVoiture = 0;
      const depart = { x: p.pos.x, z: p.pos.z };
      p.keys.add('KeyW');
      let vImpact = null, depasse = 0;
      t = performance.now();
      while (performance.now() - t < 40000) {
        await dodo(80);
        const avance = (p.pos.x - depart.x) * ax + (p.pos.z - depart.z) * az;
        if (vImpact === null && avance >= 7) vImpact = Math.abs(p.vitesseVoiture || 0);
        depasse = avance - 10;
        if (depasse > 4) break;
      }
      p.keys.delete('KeyW');
      const tombe = !!(g.mobilierCasse && g.mobilierCasse.casses.has(cle));
      await dodo(1500);
      const mesh = g.mobilierCasse ? g.mobilierCasse.piece(cle) : null;
      let haut = null;
      if (mesh) { const q = mesh.quaternion; haut = +(1 - 2 * (q.x * q.x + q.z * q.z)).toFixed(2); }   // le haut du fût, rendu par son quaternion
      const neuves = [...cles()].filter((k) => !avant.has(k)).length;
      return { lieu: { x, z }, piecePrete, contreArret, tombeArret, auVolant: auVolant(), vImpact: vImpact && +vImpact.toFixed(1), depasse: +depasse.toFixed(1), tombe, haut, neuves, n: g.mobilierCasse ? g.mobilierCasse.stats.n : 'absent', duree: Math.round(performance.now() - t) };
    });
    console.log(JSON.stringify(tombe));
  } finally { await banc.fermer(); process.exit(0); }
})();
