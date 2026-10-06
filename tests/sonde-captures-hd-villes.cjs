// Captures des villes d'Europe en couche HD (v390) : rue et ciel, pour juger
// sur image contre une vraie photo du même endroit, comme Max juge.
//   node tests/sonde-captures-hd-villes.cjs <dossier> [tag] [vue,vue…]
// Les postes ont été cherchés sous node : un trottoir face à une façade qui
// porte des fenêtres (`ARCHI.ETAGE`) à trois à neuf blocs.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';

const VUES = [
  // Londres : les terrasses victoriennes de brique
  { nom: 'londres-rue', x: -1286, z: -1351, yaw: Math.PI / 2, pitch: 0.12, h: 1.6 },
  { nom: 'londres-rue-2', x: -1283, z: -1354, yaw: Math.PI, pitch: 0.15, h: 1.6 },
  { nom: 'londres-facade', x: -1286, z: -1351, yaw: Math.PI / 2, pitch: 0.2, h: 3.5 },
  { nom: 'londres-ciel', x: -1290, z: -1340, yaw: Math.PI / 2, pitch: -0.6, h: 30 },
];

(async () => {
  const banc = new Banc({ portJeu: 8396, portPairs: 9396 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1&hd=2' });
    for (const v of VUES.filter((v) => !process.argv[4] || process.argv[4].split(',').includes(v.nom))) {
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game;
          const y = g.world.terrainHeight(v.x, v.z);
          g.player.flying = true;
          g.player.pos.set(v.x + 0.5, y + 1 + v.h, v.z + 0.5);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = v.yaw; g.player.pitch = v.pitch;
          window.__setDayTime(v.heure ?? 0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now();
          while (performance.now() - t0 < 30000) {
            await dodo(500);
            const n = g.chunkMeshes.size; if (n === (window.__n0 || -1)) { await dodo(3000); break; } window.__n0 = n;
          }
          const info = g.renderer.info;
          return { appels: info.render.calls, tri: info.render.triangles, morceaux: g.chunkMeshes.size };
        }, v);
        const f = path.join(dossier, `${tag}-${v.nom}.png`);
        await page.screenshot({ path: f, timeout: 120000 });
        console.log(v.nom, JSON.stringify(info), '→', f);
      } catch (e) { console.log(v.nom, 'ÉCHEC :', String(e && e.message || e).split('\n')[0]); }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
