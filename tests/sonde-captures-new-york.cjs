// CAPTURES DE NEW YORK D'APRÈS LES MODÈLES DE MAX (v565), pour juger sur image.
// Usage :
//   node tests/sonde-captures-new-york.cjs <dossier> [avant|apres] [vues,séparées]
//
// « avant » rejoue le New York d'avant (`?photo=0` : les volumes de l'Empire et
// la statue en blocs). Chaque vue se cadre depuis la position du monument dans
// le PLAN (manhattan-plan.js), jamais une coordonnée écrite à la main (v223).
// Sonde isolée : aucune suite ne l'importe.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const choix = process.argv[4] ? process.argv[4].split(',') : null;

// mon : 'empire' ou 'liberte' ; d : distance horizontale au monument ; cap :
// d'où l'on regarde (radians, 0 = depuis −z) ; h : hauteur de l'œil au-dessus
// de la rue ; cible : hauteur visée au-dessus de la rue ; heure : 0,42 midi.
const VUES = [
  { nom: 'empire-rue', mon: 'empire', d: 40, cap: Math.PI * 0.5, h: 2, cible: 60 },
  { nom: 'empire-avenue', mon: 'empire', d: 75, cap: Math.PI * 0.85, h: 2, cible: 70 },
  { nom: 'empire-ciel', mon: 'empire', d: 140, cap: Math.PI * 0.7, h: 95, cible: 70 },
  { nom: 'empire-sommet', mon: 'empire', d: 30, cap: Math.PI * 0.3, h: 100, cible: 105 },
  { nom: 'empire-nuit', mon: 'empire', d: 75, cap: Math.PI * 0.85, h: 2, cible: 70, heure: 0.75 },
  { nom: 'rue', mon: 'empire', d: 52, cap: 0.35, h: 1.7, cible: 6 },
  { nom: 'skyline', mon: 'empire', d: 900, cap: Math.PI * 1.04, h: 40, cible: 50 },
  { nom: 'skyline-nuit', mon: 'empire', d: 900, cap: Math.PI * 1.04, h: 40, cible: 50, heure: 0.75 },
  { nom: 'empire-pied', mon: 'empire', d: 24, cap: Math.PI * 0.5, h: 1.7, cible: 14 },
  { nom: 'liberte-terrasse', mon: 'liberte', d: 8, cap: Math.PI * 0.75, h: 4.7, cible: 22 },
  { nom: 'liberte-fort', mon: 'liberte', d: 16, cap: Math.PI, h: 1.7, cible: 26 },
  { nom: 'liberte-face', mon: 'liberte', d: 45, cap: -Math.PI / 2, h: 10, cible: 24 },
  { nom: 'liberte-baie', mon: 'liberte', d: 160, cap: Math.PI * 1.1, h: 14, cible: 24 },
  { nom: 'liberte-nuit', mon: 'liberte', d: 45, cap: -Math.PI / 2, h: 10, cible: 24, heure: 0.75 },
];

(async () => {
  const banc = new Banc({ portJeu: 8411, portPairs: 9411 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', {
      rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1,
      params: `&ombres=1${tag === 'avant' ? '&photo=0' : ''}`,
    });
    for (const v of VUES) {
      if (choix && !choix.includes(v.nom)) continue;
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game;
          const { ORIGINE_MANHATTAN: O } = await import('./src/manhattan-world.js');
          const { BATIMENTS, ILE_LIBERTE, SOL } = await import('./src/manhattan-plan.js');
          const ny = await import('./src/new-york-modeles.js');
          const b = BATIMENTS.find((x) => x.photo === 'empire');
          const c = v.mon === 'empire'
            ? { x: O.x + (b.x0 + b.x1) / 2, z: O.z + (b.z0 + b.z1) / 2 }
            : { x: O.x + ILE_LIBERTE.x, z: O.z + ILE_LIBERTE.z };
          const x = c.x - Math.sin(v.cap) * v.d, z = c.z - Math.cos(v.cap) * v.d;
          const rue = SOL + 1;
          g.player.flying = true;
          g.player.pos.set(x, rue + v.h, z);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = Math.atan2(-(c.x - x), -(c.z - z));
          g.player.pitch = Math.atan2(v.cible - v.h - 1.6, Math.max(1, v.d));
          window.__setDayTime(v.heure !== undefined ? v.heure : 0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now();
          if (ny.PHOTO_NY) await Promise.all([ny.chargerModeleNY('empire'), ny.chargerModeleNY('liberte')]);
          let n0 = -1, stable = 0;
          while (performance.now() - t0 < 120000) {
            await dodo(800);
            // les morceaux ont cessé d'arriver ET la ville n'a plus rien en file
            // (façades proches, sol, silhouettes) — `stats.queued`, relu chaque seconde
            const n = g.chunkMeshes.size + (g.villeRealiste?.buildings?.size || 0);
            const file = g.villeRealiste?.active ? g.villeRealiste.stats.queued || 0 : 0;
            if (n === n0 && file === 0) { if (++stable >= 4) break; } else { stable = 0; n0 = n; }
          }
          await dodo(2000);
          const i = g.renderer.info;
          return { x: Math.round(x), z: Math.round(z), attente: Math.round(performance.now() - t0),
            appels: i.render.calls, tri: i.render.triangles };
        }, v);
        const f = path.join(dossier, `${tag}-${v.nom}.png`);
        await page.screenshot({ path: f, timeout: 180000 });
        console.log(v.nom.padEnd(18), JSON.stringify(info), '→', f);
      } catch (e) {
        console.log(v.nom.padEnd(18), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
      }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
