// Captures en vol au-dessus de villes, à la distance d'affichage de l'iPad
// (rr=12), pour juger le paysage lointain sur image (v329 : les villes se
// reconnaissent au loin). Usage :
//   node tests/sonde-villes-au-loin.cjs <dossier> [avant|apres]
// La caméra se pose à 520 blocs au sud du centre, à 110 blocs d'altitude, et
// regarde la ville : au-delà des 192 blocs maillés, tout ce qu'on voit d'elle
// est le paysage lointain.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';

(async () => {
  const banc = new Banc({ portJeu: 8396, portPairs: 9396 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Loin', { rr: 12, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&batiloin=1' });
    for (const nom of ['paris', 'londres', 'rome', 'tokyo']) {
      try {
        const info = await page.evaluate(async (nom) => {
          const g = window.__game;
          const VM = await import('./src/villesmonde.js');
          const c = g.world.conf.villes.find((v) => v.key === nom);
          const f = VM.VILLES_MONDE.find((v) => v.cle === nom);
          const x = c ? c.x : f.ancre.x, z = (c ? c.z : f.ancre.z) + 520;
          g.player.flying = true;
          g.player.pos.set(x + 0.5, 110, z + 0.5);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = 0; g.player.pitch = -0.18;      // cap au nord, vers la ville
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now(); let n0 = -1;
          while (performance.now() - t0 < 40000) {
            await dodo(1500);
            const n = g.chunkMeshes.size; if (n === n0 && g.horizon.etat().manquantes === 0) break; n0 = n;
          }
          await dodo(800);
          const e = g.horizon.etat();
          return { morceaux: g.chunkMeshes.size, appels: g.renderer.info.render.calls, ...e };
        }, nom);
        const fi = path.join(dossier, `${tag}-${nom}.png`);
        await page.screenshot({ path: fi, timeout: 120000 });
        console.log(nom, JSON.stringify(info), '→', fi);
      } catch (e) { console.log(nom, 'ÉCHEC :', String(e && e.message || e).split('\n')[0]); }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
