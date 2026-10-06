// Captures des villes hors d'Europe en couche HD (v398) : rue et ciel, pour juger
// sur image contre une vraie photo du même endroit, comme Max juge.
//   node tests/sonde-captures-hd-villes.cjs <dossier> [tag] [vue,vue…]
// Les postes ont été cherchés sous node : un trottoir face à une façade qui
// porte des fenêtres (`ARCHI.ETAGE`) à trois à neuf blocs.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';

const VUES = [
  // Washington : la brique fédérale de Logan Circle, le calcaire de Penn Quarter
  { nom: 'dc-logan', x: -21310, z: 6004, yaw: -Math.PI / 2, pitch: 0.2, h: 1.6 },
  { nom: 'dc-logan-2', x: -21310, z: 6005, yaw: Math.PI / 2, pitch: 0.15, h: 1.6 },
  { nom: 'dc-penn', x: -21287, z: 6063, yaw: Math.PI / 2, pitch: 0.25, h: 1.6 },
  { nom: 'dc-ciel', x: -21300, z: 6020, yaw: Math.PI / 2, pitch: -0.6, h: 30 },
  // San Francisco : les Victoriennes, le centre, SoMa
  { nom: 'sf-alamo', x: -38924, z: 6770, yaw: -Math.PI / 2, pitch: 0.2, h: 1.6 },
  { nom: 'sf-alamo-2', x: -38902, z: 6772, yaw: Math.PI / 2, pitch: 0.2, h: 1.6 },
  { nom: 'sf-centre', x: -38802, z: 6734, yaw: 0, pitch: 0.2, h: 1.6 },
  { nom: 'sf-soma', x: -38798, z: 6807, yaw: 0, pitch: 0.2, h: 1.6 },
  { nom: 'sf-ciel', x: -38920, z: 6785, yaw: -Math.PI / 2, pitch: -0.6, h: 30 },
  // les villes engendrées des Amériques (v397) et du reste du monde (v398)
  { nom: 'mexico-rue', x: -29831, z: 17658, yaw: Math.PI, pitch: 0.2, h: 1.6 },
  { nom: 'havane-rue', x: -23290, z: 15484, yaw: Math.PI, pitch: 0.2, h: 1.6 },
  { nom: 'chicago-rue', x: -25333, z: 4350, yaw: -Math.PI / 2, pitch: 0.2, h: 1.6 },
  { nom: 'tokyo-rue', x: 53389, z: 7986, yaw: 0, pitch: 0.2, h: 1.6 },
  { nom: 'dubai-rue', x: 20423, z: 14241, yaw: 0, pitch: 0.2, h: 1.6 },
  { nom: 'nairobi-rue', x: 13229, z: 29948, yaw: -Math.PI / 2, pitch: 0.2, h: 1.6 },
  { nom: 'hanoi-rue', x: 40122, z: 16704, yaw: 0, pitch: 0.2, h: 1.6 },
];

(async () => {
  const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
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
            const n = g.chunkMeshes.size; if (n > 12 && n === (window.__n0 || -1)) { await dodo(3000); break; } window.__n0 = n;
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
