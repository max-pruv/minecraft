// CAPTURES DES DIX VOITURES DE TOUS LES JOURS (v570) : le « Generic passenger
// car pack » de Comrade1280, converti par scripts/convertir-flotte.mjs. Les
// dix posées en rang devant la caméra, de trois quarts avant puis arrière, de
// jour et de nuit, chargées comme le jeu les charge (`chargerVoitureFlotte`,
// donc par `normaliserVoiture` et la sonde des reflets) ; le compte de
// maillages de chacune (le prix en appels de dessin, v322).
// Usage : node tests/sonde-captures-generiques.cjs <dossier>
const { Banc, souffler } = require('./banc.js');
const dossier = process.argv[2] || '.';
(async () => {
  const banc = new Banc({ portJeu: 8437, portPairs: 9437 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('CaptureGen', { rr: 4, dpr: 1 });
    await page.setViewportSize({ width: 1280, height: 720 });
    for (const [vue, heure] of [['avant', 0.25], ['arriere', 0.25], ['avant-nuit', 0.75]]) {
      const r = await page.evaluate(async ([vue, heure]) => {
        const g = window.__game, dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        const V = await import('./src/vehicules.js');
        window.__genVus ||= [];
        for (const m of window.__genVus) g.scene.remove(m);
        window.__genVus = [];
        window.__setDayTime(heure);
        // une dalle de pierre au-dessus du relief, loin de tout
        const x0 = 30000, z0 = 30000, y = Math.max(g.world.terrainHeight(x0, z0), 40) + 4;
        for (let x = x0 - 30; x <= x0 + 30; x++) for (let z = z0 - 22; z <= z0 + 4; z++) g.world.setBlock(x, y - 1, z, 1);
        const fiches = V.FLOTTE.filter((e) => /^generique-/.test(e.fichier));
        const out = [];
        for (const [i, e] of fiches.entries()) {
          const proto = await V.chargerVoitureFlotte(e);
          if (!proto) { out.push({ f: e.fichier, err: 'absent' }); continue; }
          const m = proto.clone(true);
          const col = i % 5, rang = Math.floor(i / 5);
          m.position.set(x0 - 13 + col * 6.5, y, z0 - 9 - rang * 8);
          m.rotation.y = (vue.startsWith('avant') ? Math.PI : 0) + 0.55;
          g.scene.add(m); window.__genVus.push(m);
          let k = 0, tri = 0; m.traverse((q) => { if (q.isMesh) { k++; tri += (q.geometry.index ? q.geometry.index.count : q.geometry.attributes.position.count) / 3; } });
          out.push({ f: e.fichier, maillages: k, tri });
        }
        g.player.flying = true; g.player.pos.set(x0, y + 5, z0 + 2); g.player.vel.set(0, 0, 0); g.player.yaw = 0; g.player.pitch = -0.38;
        await dodo(3000);
        return out;
      }, [vue, heure]);
      await page.screenshot({ path: `${dossier}/generiques-${vue}.png` });
      console.log(vue, JSON.stringify(r));
    }
    await page.close();
  } finally { await banc.fermer(); process.exit(0); }
})();
