// LES DÉCORS SOMBRES (v589). Max, capture d'iPad à Flushing Meadows : une voiture
// de police toute noire, un sol noir à bord en escalier, un ciel encore clair.
// Usage : node tests/sonde-decors-sombres.cjs <dossier> [heures,séparées] [tablette]
// Sonde isolée : aucune suite ne l'importe.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const heures = (process.argv[3] || '0.42,0.5,0.53,0.58,0.75').split(',').map(Number);
const tablette = process.argv[4] === 'tablette';
const LIEUX = { flushing: { x: 785, z: -560, vx: 790, vz: -640, h: 2.2 }, queens: { x: 351, z: -560, vx: 490, vz: -560, h: 2.2 }, plonge: { x: 700, z: -470, vx: 700, vz: -400, h: 40 } };
const lieu = LIEUX[process.env.LIEU || 'flushing'];

(async () => {
  const banc = new Banc({ portJeu: 8413, portPairs: 9413 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Sombre', {
      rr: 7, viewport: { width: 1180, height: 820 }, dpr: 1,
      params: `&ombres=1${tablette ? '&qualite=tablette' : ''}`,
    });
    page.on('pageerror', (e) => console.log('ERREUR PAGE :', e.message));
    for (const heure of heures) {
      const info = await page.evaluate(async ({ lieu, heure }) => {
        const g = window.__game;
        const { ORIGINE_MANHATTAN: O } = await import('./src/manhattan-world.js');
        const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
        const rue = 33;
        if (!window.__voitPolice) {
          g.player.flying = false;
          g.player.pos.set(O.x + lieu.x, rue + 0.1, O.z + lieu.z);
          await dodo(2500);
          for (const a of [...g.animalManager.animals]) if (!a.montee) g.animalManager.retirer?.(a);
          const fx = (lieu.vx - lieu.x), fz = (lieu.vz - lieu.z), n = Math.hypot(fx, fz);
          window.__voitPolice = g.animalManager.invoquer('voiture', O.x + lieu.x + fx / n * 7, O.z + lieu.z + fz / n * 7, false, { flotte: 'police-car.glb' });
        }
        g.player.flying = true;
        const dx = lieu.vx - lieu.x, dz = lieu.vz - lieu.z;
        g.player.pos.set(O.x + lieu.x, rue + lieu.h, O.z + lieu.z);
        g.player.yaw = Math.atan2(-dx, -dz);
        g.player.pitch = lieu.h > 10 ? -0.9 : -0.18;
        window.__setDayTime(heure);
        const pos = g.player.pos.clone();
        clearInterval(window.__tenir);
        window.__tenir = setInterval(() => { g.player.flying = true; g.player.pos.copy(pos); g.player.vel.set(0, 0, 0); }, 30);
        const t0 = performance.now();
        let n0 = -1, stable = 0;
        while (performance.now() - t0 < 60000) {
          await dodo(600);
          const n = g.chunkMeshes.size + (g.villeRealiste?.buildings?.size || 0);
          if (n === n0) { if (++stable >= 4) break; } else { stable = 0; n0 = n; }
        }
        await dodo(1500);
        const s = g.scene;
        const l = {};
        s.traverse((o) => { if (o.isHemisphereLight) l.hemi = +o.intensity.toFixed(2); if (o.isDirectionalLight) l.soleil = +o.intensity.toFixed(2); });
        return { heure, actif: g.villeRealiste?.active, ...l, bg: s.background?.getHexString?.(), expo: g.renderer.toneMappingExposure, tone: g.renderer.toneMapping };
      }, { lieu, heure });
      const f = path.join(dossier, `${process.env.LIEU || 'flushing'}-${heure}${tablette ? '-tab' : ''}.png`);
      await page.screenshot({ path: f });
      console.log(JSON.stringify(info), '→', f);
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
