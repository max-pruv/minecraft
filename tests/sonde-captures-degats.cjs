// Les captures des dégâts (v338) : la voiture neuve, puis enfoncée à l'avant
// qui fume, puis en feu, puis la carcasse — de jour, et le feu de nuit. Une vue
// de face (l'enfant descendu, debout devant) et une vue de poursuite au volant.
//
//     cd tests && node sonde-captures-degats.cjs [dossier]
const { Banc, dormir } = require('./banc.js');
const path = require('path');
const fs = require('fs');

const dossier = process.argv[2] || path.join(__dirname, '..', 'captures-degats');
fs.mkdirSync(dossier, { recursive: true });

(async () => {
  const banc = new Banc({ portJeu: 8418, portPairs: 9418 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Photographe', { rr: 6, pret: true });
    await tab.setViewportSize({ width: 960, height: 600 }).catch(() => {});
    const r = await tab.evaluate(async () => {
      const g = window.__game;
      const { BLOCK } = await import('./src/blocks.js');
      const tenir = (n) => new Promise((fin) => {
        let c = 0, p = performance.now();
        const pas = (t) => { c += (t - p) / 1000; p = t; if (c >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      // une place pavée dans la campagne, au sec
      const x0 = 30000, z0 = 32400;
      let y0 = 0;
      for (let d = -20; d <= 20; d += 4) for (let w = -20; w <= 20; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 1;
      for (let d = -20; d <= 20; d++) for (let w = -20; w <= 20; w++) {
        g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
        for (let h = 1; h <= 10; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
      }
      for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
      g.animalManager.animals.length = 0;
      g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
      const a = g.animalManager.invoquer('voiture', x0 + 3, z0, false, { flotte: 'porsche-911-gt3-rs.glb', peinture: 0x2a4e9c });
      const t0 = performance.now();
      while (performance.now() - t0 < 30000 && !a.mesh.userData.roues) await tenir(0.3);
      a.pos.set(x0 + 0.5, y0 + 1.01, z0 + 0.5); a.mesh.position.copy(a.pos);
      a.yaw = Math.PI / 2 + Math.PI; a.mesh.rotation.y = Math.PI / 2;  // nez vers -x
      window.__photo = { a, x0, z0, y0 };
      return { ok: !!a.mesh.userData.roues, y0 };
    });
    console.log(JSON.stringify(r));
    // l'enfant devant la voiture, de trois quarts, qui la regarde
    const poser = (h, dist = 6.5, angle = -0.55, haut = 1.4) => tab.evaluate(({ h, dist, angle, haut }) => {
      const g = window.__game, { a } = window.__photo;
      window.__setDayTime(h);
      // le nez regarde −x : on se met devant, un peu de côté
      const px = a.pos.x - Math.cos(angle) * dist, pz = a.pos.z + Math.sin(angle) * dist;
      g.player.pos.set(px, a.pos.y + haut, pz);
      g.player.flying = true;
      g.player.yaw = Math.atan2(-(a.pos.x - px), -(a.pos.z - pz));
      g.player.pitch = -0.18;
      g.player.vel.set(0, 0, 0);
    }, { h, dist, angle, haut });
    const prendre = async (nom, attente = 2500) => {
      await dormir(attente);
      await tab.screenshot({ path: path.join(dossier, nom), timeout: 120000 });
      console.log('📸', nom);
    };
    await poser(0.3);
    await prendre('1-neuve.png', 5000);
    await tab.evaluate(() => {
      const g = window.__game, { a } = window.__photo, d = g.fun.degats;
      d.choc(a.mesh, { force: 0.9, lx: -0.4, lz: -2.2 });
      d.choc(a.mesh, { force: 0.5, lx: 0.6, lz: -2.2 });
    });
    await prendre('2-avant-enfonce-fume.png', 3000);
    await poser(0.3, 6.5, 0.9);
    await prendre('3-flanc.png');
    await tab.evaluate(() => {
      const g = window.__game, { a } = window.__photo, d = g.fun.degats;
      while (!d.etat(a.mesh).enFeu) d.choc(a.mesh, { force: 0.6, lx: 1.1, lz: 0.3 });
    });
    await poser(0.3, 8, -0.55, 2.2);
    await prendre('4-feu-jour.png', 3000);
    await tab.evaluate(() => window.__setDayTime(0.75));
    await poser(0.75, 8, -0.55, 2.2);
    await prendre('5-feu-nuit.png', 2500);
    await tab.evaluate(() => { const g = window.__game, { a } = window.__photo; g.fun.degats.etat(a.mesh).feu = 13.5; });
    await poser(0.3, 7, -0.3, 1.6);
    await prendre('6-carcasse.png', 4000);
  } finally {
    await banc.fermer();
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
