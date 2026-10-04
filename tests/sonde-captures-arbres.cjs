// LES ARBRES AU BORD ET LES FALAISES VUES DE LOIN, AVANT ET APRÈS (v339).
//   node tests/sonde-captures-arbres.cjs <dossier> <étiquette>
// Le banc sert le dépôt d'où l'on lance le script : lancé depuis un arbre
// d'`origin/main`, il photographie l'avant. Les points viennent de
// `sonde-arbres-bord.cjs` (des chênes sur une crête de roche près de Xi'an et
// de Kazan, sur `origin/main`). Pas de vue lointaine : même au site le plus
// escarpé trouvé (près de Montpellier), la règle des bords ne touche que 3 %
// des sommets du paysage lointain — c'est le témoin de `plafond.js` qui le
// prouve, une capture ne le montrerait pas.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const PAGES = [
  { rr: 6, vues: [
    { nom: 'crete-xian', x: 40760, z: 9429, recul: 12, h: 22, pitch: -0.75 },
    { nom: 'crete-kazan', x: 18688, z: -3883, recul: 12, h: 22, pitch: -0.75 },
  ] },
];
(async () => {
  const banc = new Banc({ portJeu: 8413, portPairs: 9413 });
  await banc.ouvrir();
  try {
    for (const P of PAGES) {
      await souffler();
      const page = await banc.jouerSeul('Bosquet' + P.rr, { rr: P.rr, viewport: { width: 1280, height: 720 }, dpr: 1 });
      for (const v of P.vues) {
        try {
          const info = await page.evaluate(async (v) => {
            const g = window.__game, w = g.world;
            let ux = 1, uz = 0, bas = Infinity;
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const hv = w.terrainHeight(v.x + dx * 3, v.z + dz * 3);
              if (hv < bas) { bas = hv; ux = dx; uz = dz; }
            }
            const x = v.x + 0.5 + ux * v.recul, z = v.z + 0.5 + uz * v.recul;
            const sol = Math.max(w.terrainHeight(Math.floor(x), Math.floor(z)), 30);
            g.player.flying = true;
            g.player.pos.set(x, sol + 1 + v.h, z);
            g.player.vel.set(0, 0, 0);
            g.player.yaw = v.yaw != null ? v.yaw : Math.atan2(ux, uz); g.player.pitch = v.pitch;
            window.__setDayTime(0.42);
            const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
            const t0 = performance.now();
            let n0 = -1, stable = 0;
            await dodo(8000);
            while (performance.now() - t0 < 90000) {
              await dodo(800);
              const n = g.chunkMeshes.size, e = g.horizon.etat();
              if (n === n0 && e.manquantes === 0 && !(e.aRaffiner > 0)) { if (++stable >= 4) break; } else { stable = 0; n0 = n; }
            }
            await dodo(1500);
            return { x: Math.round(x), z: Math.round(z), attente: Math.round(performance.now() - t0), morceaux: g.chunkMeshes.size };
          }, v);
          const fch = path.join(dossier, `${tag}-${v.nom}.png`);
          await page.screenshot({ path: fch, timeout: 180000 });
          console.log(v.nom.padEnd(14), JSON.stringify(info), '→', fch);
        } catch (e) {
          console.log(v.nom.padEnd(14), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
        }
      }
      await page.close();
    }
  } catch (e) {
    console.log('ÉCHEC :', String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  } finally { await banc.fermer(); process.exit(0); }
})();
