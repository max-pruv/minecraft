// Captures d'une ville bâtie à la main pour juger sur image : rue et ciel.
// Usage : node tests/sonde-captures-villes.cjs <dossier> <tag> <ville> [vues]
// Les vues se donnent en blocs depuis l'ancre de la ville (u vers l'est, v vers
// le sud) ; `rue` cherche la chaussée la plus proche, pour que la caméra ne se
// pose pas dans un immeuble (v292). Le même script se lance depuis un arbre
// d'`origin/main` (le banc sert le dossier au-dessus de lui) pour l'« avant ».
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'avant';
const ville = process.argv[4] || 'londres';

const VUES = {
  londres: [
    { nom: 'oxford-street', u: -34, v: -18, yaw: Math.PI / 2, pitch: 0.06, h: 1.6, rue: true },
    { nom: 'soho', u: -6, v: -12, yaw: Math.PI / 2, pitch: 0.08, h: 1.6, rue: true },
    { nom: 'strand', u: 8, v: -6, yaw: -Math.PI * 0.75, pitch: 0.06, h: 1.6, rue: true },
    { nom: 'city', u: 62, v: -20, yaw: Math.PI / 2, pitch: 0.08, h: 1.6, rue: true },
    { nom: 'marylebone', u: -40, v: -28, yaw: 0, pitch: 0.08, h: 1.6, rue: true },
    { nom: 'ciel-ouest', u: -20, v: -15, yaw: 0, pitch: -1.1, h: 70 },
    { nom: 'ciel-city', u: 45, v: -15, yaw: 0, pitch: -1.1, h: 70 },
  ],
  nice: [
    { nom: 'jean-medecin', u: -4, v: -20, yaw: 0, pitch: 0.06, h: 1.6, rue: true },
    { nom: 'promenade', u: -60, v: 18, yaw: Math.PI / 2, pitch: 0.06, h: 1.6, rue: true },
    { nom: 'musiciens', u: -40, v: -22, yaw: Math.PI / 2, pitch: 0.08, h: 1.6, rue: true },
    { nom: 'vieux-nice', u: 15, v: 4, yaw: -Math.PI / 2, pitch: 0.08, h: 1.6, rue: true },
    { nom: 'ciel-centre', u: -20, v: -10, yaw: 0, pitch: -1.1, h: 70 },
    { nom: 'ciel-ouest', u: -80, v: -5, yaw: 0, pitch: -1.1, h: 70 },
  ],
  sf: [
    { nom: 'market', u: 76, v: 7, yaw: Math.PI / 2 - 0.31, pitch: 0.06, h: 1.6, rue: true },
    { nom: 'soma', u: 103, v: 12, yaw: Math.PI / 2, pitch: 0.06, h: 1.6, rue: true },
    { nom: 'mission', u: 43, v: 53, yaw: 0, pitch: 0.08, h: 1.6, rue: true },
    { nom: 'sunset', u: -67, v: 42, yaw: 0, pitch: 0.08, h: 1.6, rue: true },
    { nom: 'ciel-centre', u: 108, v: -25, yaw: 0, pitch: -1.1, h: 70 },
    { nom: 'ciel-ouest', u: -27, v: 15, yaw: 0, pitch: -1.1, h: 70 },
  ],
  lille: [
    { nom: 'nationale', u: -10, v: 1, yaw: Math.PI / 2, pitch: 0.06, h: 1.6, rue: true },
    { nom: 'liberte', u: -18, v: 12, yaw: Math.PI / 4, pitch: 0.06, h: 1.6, rue: true },
    { nom: 'vieux-lille', u: -8, v: -18, yaw: 0, pitch: 0.08, h: 1.6, rue: true },
    { nom: 'wazemmes', u: -27, v: 38, yaw: 0, pitch: 0.08, h: 1.6, rue: true },
    { nom: 'ciel-centre', u: 0, v: 0, yaw: 0, pitch: -1.1, h: 70 },
    { nom: 'ciel-sud', u: -10, v: 35, yaw: 0, pitch: -1.1, h: 70 },
  ],
};

(async () => {
  const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1' });
    for (const v of VUES[ville].filter((v) => !process.argv[5] || process.argv[5].split(',').includes(v.nom))) {
      try {
        const info = await page.evaluate(async ({ v, ville }) => {
          const g = window.__game;
          const W = await import('./src/world.js');
          const fiche = W.CITIES.find((c) => c.key === ville);
          let x = fiche.x + v.u, z = fiche.z + v.v;
          if (v.rue) {
            const { CITY_BLOCK } = await import('./src/blocks.js');
            const sol = (xx, zz) => g.world.getBlock(xx, g.world.terrainHeight(xx, zz), zz);
            cherche: for (let r = 0; r < 14; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
              if (sol(x + dx, z + dz) === CITY_BLOCK.ASPHALT) { x += dx; z += dz; break cherche; }
            }
          }
          const y = g.world.terrainHeight(x, z);
          g.player.flying = true;
          g.player.pos.set(x + 0.5, y + 1 + v.h, z + 0.5);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = v.yaw; g.player.pitch = v.pitch;
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          await dodo(8000);
          let n0 = -1;
          for (let k = 0; k < 40; k++) { await dodo(700); const n = g.chunkMeshes.size; if (n === n0) break; n0 = n; }
          await dodo(1500);
          return { x, z, y, morceaux: g.chunkMeshes.size };
        }, { v, ville });
        const f = path.join(dossier, `${tag}-${ville}-${v.nom}.png`);
        await page.screenshot({ path: f, timeout: 120000 });
        console.log(v.nom, JSON.stringify(info), '→', f);
      } catch (e) { console.log(v.nom, 'ÉCHEC :', String(e && e.message || e).split('\n')[0]); }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
