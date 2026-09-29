// LE SEUIL D'UNE VILLE, AVANT ET APRÈS (v308). Usage :
//   node tests/sonde-captures-raccord.cjs <dossier> <étiquette>
// Même caméra, même heure des deux côtés : posée DEHORS, à six blocs du bord
// du disque, elle regarde la ville en travers du seuil. Les postes se
// calculent depuis l'ancre de la ville, jamais écrits en blocs (v223).
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'avant';
const VUES = [
  { nom: 'vilnius-sol', ville: 'vilnius', a: 3.19, h: 2, pitch: -0.12 },
  { nom: 'vilnius-haut', ville: 'vilnius', a: 3.19, h: 9, pitch: -0.45 },
  { nom: 'koweit-sol', ville: 'koweit', a: 1.75, h: 2, pitch: -0.12 },
];
(async () => {
  const banc = new Banc({ portJeu: 8408, portPairs: 9408 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Seuil', { rr: 6, viewport: { width: 1280, height: 720 }, dpr: 1 });
    for (const v of VUES) {
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game;
          const { VILLES_MONDE } = await import('./src/villesmonde.js');
          const f = VILLES_MONDE.find((c) => (c.cle || c.nom) === v.ville);
          const d = f.rayon + 6, ux = Math.cos(v.a), uz = Math.sin(v.a);
          const x = f.ancre.x + ux * d, z = f.ancre.z + uz * d;
          const y = g.world.terrainHeight(Math.floor(x), Math.floor(z));
          g.player.flying = true;
          g.player.pos.set(x, y + 1 + v.h, z);
          g.player.vel.set(0, 0, 0);
          // regarder vers le centre : la caméra avance en (−sin yaw, −cos yaw)
          g.player.yaw = Math.atan2(ux, uz); g.player.pitch = v.pitch;
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now();
          let n0 = -1, stable = 0;
          await dodo(8000);
          while (performance.now() - t0 < 90000) {
            await dodo(800);
            const n = g.chunkMeshes.size;
            if (n === n0) { if (++stable >= 4) break; } else { stable = 0; n0 = n; }
          }
          await dodo(1500);
          return { x: Math.round(x), z: Math.round(z), y, attente: Math.round(performance.now() - t0), morceaux: g.chunkMeshes.size };
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
