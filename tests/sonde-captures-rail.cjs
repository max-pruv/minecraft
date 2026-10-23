// CAPTURES DE LA VOIE FERRÉE (v537) : le TGV Paris–Lyon vu en vol bas, à la
// taille de l'iPhone de Max, aux endroits de ses deux captures (le viaduc du
// pas 716, la tranchée du pas 786). Usage :
//   node tests/sonde-captures-rail.cjs <dossier> [k,k,…] [segment=1]
const { Banc, souffler } = require('./banc.js');
const dossier = process.argv[2] || '.';
const ks = (process.argv[3] || '700,716,786').split(',').map(Number);
const iseg = Number(process.argv[4] || 1);
const VUE = process.argv[5] || 'oblique';
const TAILLES = { iphone: { width: 430, height: 932 }, ipad: { width: 820, height: 1180 } };
const vues = (process.env.VUES || 'iphone').split(','), heures = (process.env.HEURES || '0.42').split(',').map(Number);   // 'dessus' : à la verticale, pour lire le plan
(async () => {
  const banc = new Banc({ portJeu: 8437, portPairs: 9437 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('CaptureRail', { rr: 9, dpr: 1, ombres: 1, hd: 3 });
    for (const vue of vues) for (const heure of heures) {
    await page.setViewportSize(TAILLES[vue]);
    for (const k of ks) {
      for (const cote of [-1, 1]) {
        const r = await page.evaluate(async ({ k, iseg, cote, VUE, heure }) => {
          const g = window.__game, dodo = (ms) => new Promise((f) => setTimeout(f, ms));
          const T = await import('./src/trains.js');
          const s = T.segmentsDeTrain()[iseg];
          const L = s.longueur, ux = (s.x1 - s.x0) / L, uz = (s.z1 - s.z0) / L;
          const x = s.x0 + ux * k - uz * cote * 7, z = s.z0 + uz * k + ux * cote * 7;
          const c = T.coteContinue(s, k / L);
          window.__setDayTime && window.__setDayTime(heure);
          g.player.flying = true; g.player.pos.set(VUE === 'dessus' ? s.x0 + ux * k : x, c + (VUE === 'dessus' ? 22 : 6), VUE === 'dessus' ? s.z0 + uz * k : z); g.player.vel.set(0, 0, 0);
          // regard le long de la voie, vers l'avant, un peu vers le bas
          g.player.yaw = Math.atan2(-ux, -uz) + cote * 0.25; g.player.pitch = VUE === 'dessus' ? -1.55 : -0.35;
          await dodo(12000);
          return { x: Math.round(x), z: Math.round(z), cote: c };
        }, { k, iseg, cote, VUE, heure });
        await page.screenshot({ path: `${dossier}/rail-${iseg}-${k}-${cote > 0 ? 'd' : 'g'}-${vue}-${heure === 0.75 ? 'nuit' : 'jour'}.png` });
        console.log(vue, heure, k, cote, JSON.stringify(r));
      }
    }
    }
    await page.close();
  } finally { await banc.fermer(); process.exit(0); }
})();
