// LES FALAISES ET LES BERGES, AVANT ET APRÈS (v326). Usage :
//   node tests/sonde-captures-falaises.cjs <dossier> <étiquette>
// Même caméra, même heure des deux côtés. Chaque vue part d'une colonne
// mesurée sous node (`sonde-falaises.cjs`) : la caméra se pose du côté BAS
// de la marche (ou au-dessus de l'eau) et regarde la paroi, puis une vue
// aérienne au-dessus du même point. Le banc sert le dépôt d'où l'on lance le
// script : lancé depuis un arbre d'`origin/main`, il photographie l'avant.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const VUES = [
  { nom: 'falaise-sol', x: 2991, z: 1758, recul: 18, h: 3, pitch: 0.18 },
  { nom: 'falaise-ciel', x: 2991, z: 1758, recul: 22, h: 30, pitch: -0.8 },
  { nom: 'lac-sol', x: 18, z: 237, recul: 12, h: 2, pitch: -0.05 },
  { nom: 'lac-ciel', x: 18, z: 237, recul: 18, h: 26, pitch: -0.9 },
];
(async () => {
  const banc = new Banc({ portJeu: 8412, portPairs: 9412 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Falaise', { rr: 6, viewport: { width: 1280, height: 720 }, dpr: 1 });
    for (const v of VUES) {
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game, w = g.world;
          const h = w.terrainHeight(v.x, v.z);
          // le côté bas : la voisine la plus basse (l'eau compte à sa surface)
          let ux = 1, uz = 0, bas = Infinity;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const hv = w.terrainHeight(v.x + dx, v.z + dz);
            if (hv < bas) { bas = hv; ux = dx; uz = dz; }
          }
          const x = v.x + 0.5 + ux * v.recul, z = v.z + 0.5 + uz * v.recul;
          const sol = Math.max(w.terrainHeight(Math.floor(x), Math.floor(z)), 30);
          g.player.flying = true;
          g.player.pos.set(x, sol + 1 + v.h, z);
          g.player.vel.set(0, 0, 0);
          // regarder vers la colonne : la caméra avance en (−sin yaw, −cos yaw)
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
          return { x: Math.round(x), z: Math.round(z), h, bas, attente: Math.round(performance.now() - t0), morceaux: g.chunkMeshes.size };
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
