// CAPTURES DES UTILITAIRES (v438) : la fourgonnette et le pickup posés côte à
// côte devant la caméra, de trois quarts avant puis arrière, et le compte de
// maillages de chacun (le prix en appels de dessin, v322).
// Usage : node tests/sonde-captures-utilitaires.cjs <dossier>
const { Banc, souffler } = require('./banc.js');
const dossier = process.argv[2] || '.';
(async () => {
  const banc = new Banc({ portJeu: 8436, portPairs: 9436 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('CaptureUtil', { rr: 4, dpr: 1 });
    for (const vue of ['avant', 'arriere']) {
      const r = await page.evaluate(async (vue) => {
        const g = window.__game, dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        const U = await import('./src/utilitaires.js');
        window.__utilVus ||= [];
        for (const m of window.__utilVus) g.scene.remove(m);
        const x = Math.floor(g.player.pos.x), z = Math.floor(g.player.pos.z);
        const y = g.world.terrainHeight(x, z) + 3;
        const f = U.construireUtilitaire(), p = U.construirePickup({ couleur: 0x8a1f1f, chargement: true });
        f.position.set(x - 2.5, y, z - 9); p.position.set(x + 2.5, y, z - 9);
        if (vue === 'avant') { f.rotation.y = Math.PI; p.rotation.y = Math.PI; f.position.x = x + 2.5; p.position.x = x - 2.5; }
        f.rotation.y += 0.5; p.rotation.y += 0.5;
        g.scene.add(f, p); window.__utilVus = [f, p];
        g.player.flying = true; g.player.pos.set(x, y + 1.4, z); g.player.vel.set(0, 0, 0); g.player.yaw = 0; g.player.pitch = -0.15;
        await dodo(2500);
        const n = (o) => { let k = 0; o.traverse((q) => { if (q.isMesh) k++; }); return k; };
        return { fourgon: n(f), pickup: n(p) };
      }, vue);
      await page.screenshot({ path: `${dossier}/utilitaires-${vue}.png` });
      console.log(vue, JSON.stringify(r));
    }
    await page.close();
  } finally { await banc.fermer(); process.exit(0); }
})();
