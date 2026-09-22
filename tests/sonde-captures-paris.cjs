// Captures de Paris pour juger sur image : rue, ciel, nuit. Usage :
//   node tests/sonde-captures-paris.cjs <dossier> [nom]
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'avant';

const VUES = [
  // dx, dz en km depuis Notre-Dame ; yaw ; pitch ; hauteur au-dessus du sol ; nom
  { nom: 'rue-haussmann', dx: -0.8, dz: -0.9, yaw: Math.PI / 2, pitch: 0.05, h: 1.6 },
  { nom: 'commerce', dx: -0.8, dz: -0.9, yaw: 0, pitch: 0.12, h: 1.6, rue: true },
  { nom: 'germain', dx: -1.7, dz: 0.8, yaw: Math.PI / 4, pitch: 0.18, h: 1.6, rue: true },
  { nom: 'germain-face', dx: -1.7, dz: 0.8, yaw: 0, pitch: 0.1, h: 1.6, rue: true },
  { nom: 'monceau', dx: -3.2, dz: -2.2, yaw: -Math.PI / 4, pitch: 0.15, h: 1.6, rue: true },
  { nom: 'coin', dx: -0.8, dz: -0.9, yaw: Math.PI / 4, pitch: 0.25, h: 1.6, rue: true },
  { nom: 'rue-rivoli', dx: -0.6, dz: -0.2, yaw: -Math.PI / 2, pitch: 0.05, h: 1.6 },
  { nom: 'quai', dx: 0.0, dz: -0.35, yaw: Math.PI, pitch: 0.05, h: 1.6 },
  { nom: 'ciel', dx: -1.2, dz: -0.5, yaw: Math.PI / 2, pitch: -0.5, h: 45 },
  { nom: 'nuit-rue', dx: -0.8, dz: -0.9, yaw: Math.PI / 2, pitch: 0.05, h: 1.6, heure: 0.0 },
  { nom: 'eiffel', dx: -3.6, dz: 0.9, yaw: Math.PI / 2, pitch: 0.15, h: 1.6 },
];

(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1' });
    for (const v of VUES.filter((v) => !process.argv[4] || process.argv[4].split(',').includes(v.nom))) {
      const info = await page.evaluate(async (v) => {
        const g = window.__game;
        const { adresseParis } = await import('./src/paris.js');
        let [x, z] = adresseParis(v.dx, v.dz);
        if (v.rue) {
          // le milieu de la première chaussée trouvée, face à une façade
          const { solParis } = await import('./src/paris.js');
          const { ARCHI } = await import('./src/blocks.js');
          cherche: for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (solParis(x + dx, z + dz) === ARCHI.PAVE && solParis(x + dx, z + dz - 3) === null) { x += dx; z += dz; break cherche; }
          }
        }
        const y = g.world.terrainHeight(x, z);
        g.player.flying = true;
        g.player.pos.set(x + 0.5, y + 1 + v.h, z + 0.5);
        g.player.vel.set(0, 0, 0);
        g.player.yaw = v.yaw; g.player.pitch = v.pitch;
        if (v.heure !== undefined) window.__setDayTime(v.heure); else window.__setDayTime(0.42);
        const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
        const t0 = performance.now();
        while (performance.now() - t0 < 25000) {
          await dodo(500);
          const n = g.chunkMeshes.size; if (n === (window.__n0 || -1)) { await dodo(2000); break; } window.__n0 = n;
        }
        const info = g.renderer.info;
        return { x, z, y, appels: info.render.calls, tri: info.render.triangles, morceaux: g.chunkMeshes.size };
      }, v);
      const f = path.join(dossier, `${tag}-${v.nom}.png`);
      await page.screenshot({ path: f });
      console.log(v.nom, JSON.stringify(info), '→', f);
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
