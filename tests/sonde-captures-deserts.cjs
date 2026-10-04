// LES DÉSERTS CHAUDS, AVANT ET APRÈS (v341).
//   node tests/sonde-captures-deserts.cjs <dossier> <étiquette>
// Le banc sert le dépôt d'où l'on lance le script : lancé depuis un arbre
// d'`origin/main`, il photographie l'avant. Les points sont donnés en
// latitude et longitude réelles et se retrouvent par la projection
// (`cielDe`, dichotomie sur x) — jamais en blocs écrits.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const VUES = [
  { nom: 'sahara-ciel', lat: 23, lon: 6, h: 45, pitch: -0.45, yaw: 0.6 },
  { nom: 'phoenix-ciel', lat: 33.25, lon: -112.3, h: 45, pitch: -0.4, yaw: 2.4 },
  { nom: 'riyad-sol', lat: 24.95, lon: 46.4, h: 4, pitch: -0.05, yaw: 1.2 },
];
(async () => {
  const banc = new Banc({ portJeu: 8414, portPairs: 9414 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Desert', { rr: 8, viewport: { width: 1280, height: 720 }, dpr: 1 });
    for (const v of VUES) {
      try {
        const info = await page.evaluate(async (v) => {
          const { cielDe, zDeLatitude } = await import('./src/mondes.js');
          const g = window.__game, w = g.world;
          const z = Math.round(zDeLatitude(v.lat));
          let a = -80000, b = 80000;
          for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (cielDe(m, z).lon < v.lon) a = m; else b = m; }
          const x = Math.round(a) + 0.5;
          const sol = Math.max(w.terrainHeight(Math.floor(x), z), 30);
          g.player.flying = true;
          g.player.pos.set(x, sol + 1 + v.h, z + 0.5);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = v.yaw; g.player.pitch = v.pitch;
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now();
          let n0 = -1, stable = 0;
          await dodo(8000);
          while (performance.now() - t0 < 90000) {
            await dodo(800);
            const n = g.chunkMeshes.size, e = g.horizon.etat();
            if (n === n0 && e.manquantes === 0) { if (++stable >= 4) break; } else { stable = 0; n0 = n; }
          }
          await dodo(1500);
          return { x: Math.round(x), z, attente: Math.round(performance.now() - t0), morceaux: g.chunkMeshes.size };
        }, v);
        const fch = path.join(dossier, `${tag}-${v.nom}.png`);
        await page.screenshot({ path: fch, timeout: 180000 });
        console.log(v.nom.padEnd(14), JSON.stringify(info), '→', fch);
      } catch (e) {
        console.log(v.nom.padEnd(14), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
      }
    }
  } catch (e) {
    console.log('ÉCHEC :', String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  } finally { await banc.fermer(); process.exit(0); }
})();
