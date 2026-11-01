// LES BANLIEUES DE NEW YORK SUR IMAGE (v583). Chaque vue se cadre en coordonnées
// du PLAN (new-york-banlieues.js), jamais du monde (v223).
// Usage : node tests/sonde-captures-banlieues.cjs <dossier> [vues,séparées] [tablette]
// Sonde isolée : aucune suite ne l'importe.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const choix = process.argv[3] && process.argv[3] !== 'toutes' ? process.argv[3].split(',') : null;
const tablette = process.argv[4] === 'tablette';

// x, z : l'œil ; vx, vz : le point visé ; h, vh : leurs hauteurs au-dessus de la rue
const VUES = [
  { nom: 'ciel-baie', x: 150, z: 2050, h: 260, vx: 150, vz: 700, vh: 0 },
  { nom: 'ciel-brooklyn', x: 150, z: 1000, h: 170, vx: 600, vz: 300, vh: 0 },
  { nom: 'ciel-nord', x: -600, z: -1950, h: 200, vx: 50, vz: -1200, vh: 0 },
  { nom: 'brooklyn-rue', x: 343, z: 212, h: 1.7, vx: 344, vz: 300, vh: 6 },
  { nom: 'brooklyn-pont', x: 150, z: 570, h: 3, vx: 300, vz: 578, vh: 12 },
  { nom: 'prospect', x: 600, z: 340, h: 18, vx: 580, vz: 520, vh: 2 },
  { nom: 'queens-rue', x: 351, z: -560, h: 1.7, vx: 490, vz: -560, vh: 5 },
  { nom: 'bronx', x: -100, z: -1290, h: 26, vx: 60, vz: -1500, vh: 8 },
  { nom: 'bronx-rue', x: 100, z: -1584, h: 1.7, vx: 100, vz: -1480, vh: 8 },
  { nom: 'hoboken-rue', x: -310, z: -220, h: 1.7, vx: -310, vz: -60, vh: 6 },
  { nom: 'hudson', x: -210, z: -250, h: 12, vx: -420, vz: -280, vh: 10 },
  { nom: 'jersey', x: -290, z: 640, h: 20, vx: -400, vz: 760, vh: 4 },
  { nom: 'port', x: -600, z: 930, h: 34, vx: -590, vz: 1090, vh: 2 },
  { nom: 'coney', x: 620, z: 1275, h: 9, vx: 560, vz: 1150, vh: 18 },
  { nom: 'plage', x: 640, z: 1250, h: 8, vx: 700, vz: 1370, vh: 0 },
  { nom: 'longisland', x: 950, z: 330, h: 20, vx: 1000, vz: 450, vh: 1 },
  { nom: 'pavillons-rue', x: 1000, z: 422, h: 1.7, vx: 1100, vz: 423, vh: 3 },
  { nom: 'staten', x: -480, z: 1300, h: 70, vx: -450, vz: 1600, vh: 0 },
  { nom: 'harlem', x: 40, z: -1010, h: 2.5, vx: 40, vz: -920, vh: 7 },
  { nom: 'chelsea', x: -60, z: 680, h: 22, vx: -10, vz: 770, vh: 8 },
  { nom: 'brooklyn-nuit', x: 343, z: 212, h: 12, vx: 400, vz: 300, vh: 6, heure: 0.75 },
  { nom: 'ciel-nuit', x: 150, z: 1000, h: 170, vx: 600, vz: 300, vh: 0, heure: 0.75 },
];

(async () => {
  const banc = new Banc({ portJeu: 8412, portPairs: 9412 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', {
      rr: tablette ? 7 : 9, viewport: { width: 1280, height: 720 }, dpr: 1,
      params: `&ombres=1${tablette ? '&qualite=tablette' : ''}`,
    });
    page.on('pageerror', (e) => console.log('ERREUR PAGE :', e.message));
    for (const v of VUES) {
      if (choix && !choix.includes(v.nom)) continue;
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game;
          const { ORIGINE_MANHATTAN: O } = await import('./src/manhattan-world.js');
          const { chargerQuartiers } = await import('./src/new-york-modeles.js');
          await chargerQuartiers();
          const rue = 33, dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          g.player.flying = true;
          g.player.pos.set(O.x + v.x, rue + v.h, O.z + v.z);
          g.player.vel.set(0, 0, 0);
          const dx = v.vx - v.x, dz = v.vz - v.z;
          g.player.yaw = Math.atan2(-dx, -dz);
          g.player.pitch = Math.atan2(v.vh - v.h - 1.6, Math.max(1, Math.hypot(dx, dz)));
          window.__setDayTime(v.heure !== undefined ? v.heure : 0.42);
          // la physique ne le ramène pas au sol pendant qu'on attend
          const pos = g.player.pos.clone();
          clearInterval(window.__tenir);
          window.__tenir = setInterval(() => { g.player.flying = true; g.player.pos.copy(pos); g.player.vel.set(0, 0, 0); }, 30);
          const t0 = performance.now();
          let n0 = -1, stable = 0;
          while (performance.now() - t0 < 90000) {
            await dodo(600);
            const n = g.chunkMeshes.size + (g.villeRealiste?.buildings?.size || 0);
            const file = g.villeRealiste?.active ? g.villeRealiste.stats.queued || 0 : 0;
            if (n === n0 && file === 0) { if (++stable >= 4) break; } else { stable = 0; n0 = n; }
          }
          await dodo(1500);
          const i = g.renderer.info;
          return { attente: Math.round(performance.now() - t0), appels: i.render.calls, tri: i.render.triangles,
            actif: g.villeRealiste?.active, proches: g.villeRealiste?.buildings?.size, fps: Math.round(g.villeRealiste?.stats?.fps || 0) };
        }, v);
        const f = path.join(dossier, `${v.nom}.png`);
        await page.screenshot({ path: f, timeout: 180000 });
        console.log(v.nom.padEnd(18), JSON.stringify(info));
      } catch (e) {
        console.log(v.nom.padEnd(18), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
      }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
