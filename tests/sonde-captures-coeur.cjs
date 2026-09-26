// LE CŒUR DE PARIS, AVANT ET APRÈS (v293). Usage :
//   node tests/sonde-captures-coeur.cjs <dossier> <étiquette>
//
// Même caméra, même heure, des deux côtés : c'est la seule façon de juger un
// déménagement sur image. Les vues se calculent depuis l'ancre de Paris, jamais
// écrites en blocs (v223).
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'avant';

const VUES = [
  { nom: 'ciel', h: 70, pitch: -0.75, yaw: 0.6 },
  { nom: 'ciel-bas', h: 34, pitch: -0.45, yaw: 0.6 },
  { nom: 'rue', h: 2, pitch: 0.12, yaw: 0.6 },
];

(async () => {
  const banc = new Banc({ portJeu: 8407, portPairs: 9407 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Coeur', { rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1&hd=6' });
    for (const v of VUES) {
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game;
          const { PARIS } = await import('./src/paris.js');
          const x = PARIS.x, z = PARIS.z;
          const y = v.h > 20 ? g.world.terrainHeight(x, z) : g.world.sommetColonne(x, z);
          g.player.flying = true;
          g.player.pos.set(x + 0.5, y + 1 + v.h, z + 0.5);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = v.yaw; g.player.pitch = v.pitch;
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now();
          let n0 = -1, stable = 0;
          while (performance.now() - t0 < 60000) {
            await dodo(800);
            const n = g.chunkMeshes.size;
            if (n === n0) { if (++stable >= 3) break; } else { stable = 0; n0 = n; }
          }
          await dodo(1500);
          const i = g.renderer.info;
          return { x, z, y, attente: Math.round(performance.now() - t0),
            appels: i.render.calls, tri: i.render.triangles, morceaux: g.chunkMeshes.size };
        }, v);
        const f = path.join(dossier, `${tag}-coeur-${v.nom}.png`);
        await page.screenshot({ path: f, timeout: 180000 });
        console.log(`${v.nom}`.padEnd(12), JSON.stringify(info), '→', f);
      } catch (e) {
        console.log(`${v.nom}`.padEnd(12), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
      }
    }
  } catch (e) {
    console.log('ÉCHEC :', String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  } finally { await banc.fermer(); process.exit(0); }
})();
