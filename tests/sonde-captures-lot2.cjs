// Captures d'un monument pour juger sur image : la rue et le ciel (v350).
// Usage : node tests/sonde-captures-lot2.cjs <dossier> <tag> ["Nom|du|repère", …]
// Chaque vue se pose à un écart (en blocs) du repère et le REGARDE : la caméra
// vise le milieu de sa hauteur, quel que soit le côté d'où l'on vient. Le même
// script se lance depuis un arbre d'`origin/main` pour l'« avant ». `PARAMS=&hd=2`
// force la couche HD (les modèles en relief de Paris), coupée en rendu logiciel.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'avant';
const VUES = [
  { nom: 'Opéra de Lille', vues: [{ n: 'rue', dx: 0, dz: 13, h: 1 }, { n: 'ciel', dx: 30, dz: 30, h: 34 }] },
  { nom: 'Buckingham Palace', vues: [{ n: 'rue', dx: 15, dz: 5, h: 1 }, { n: 'ciel', dx: 40, dz: 30, h: 34 }] },
  { nom: 'Opéra', vues: [{ n: 'ciel', dx: 22, dz: -22, h: 30 }] },
  { nom: 'Panthéon', vues: [{ n: 'ciel', dx: 20, dz: 22, h: 26 }] },
  { nom: 'Archives nationales', vues: [{ n: 'rue', dx: -2, dz: -15, h: 1 }, { n: 'ciel', dx: 30, dz: -30, h: 34 }] },
];
const choix = process.argv.slice(4);

(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1' + (process.env.PARAMS || '') });
    for (const m of VUES.filter((m) => !choix.length || choix.includes(m.nom))) {
      for (const v of m.vues) {
        try {
          const info = await page.evaluate(async ({ nom, v }) => {
            const g = window.__game;
            const W = await import('./src/world.js');
            const r = W.REPERES.find((l) => l.name === nom);
            const sol = g.world.terrainHeight(r.x, r.z);
            const px = r.x + v.dx, pz = r.z + v.dz;
            const py = Math.max(g.world.terrainHeight(px, pz), sol) + 1 + v.h;
            g.player.flying = true;
            g.player.pos.set(px + 0.5, py, pz + 0.5);
            g.player.vel.set(0, 0, 0);
            const ex = r.x + 0.5 - g.player.pos.x, ez = r.z + 0.5 - g.player.pos.z;
            g.player.yaw = Math.atan2(-ex, -ez);
            g.player.pitch = Math.atan2(sol + 6 - (py + 1.6), Math.hypot(ex, ez));
            window.__setDayTime(0.42);
            const dodo = (ms) => new Promise((res) => setTimeout(res, ms));
            await dodo(8000);
            let n0 = -1;
            for (let k = 0; k < 40; k++) { await dodo(700); const n = g.chunkMeshes.size; if (n === n0) break; n0 = n; }
            await dodo(1500);
            return { x: r.x, z: r.z, sol, morceaux: g.chunkMeshes.size };
          }, { nom: m.nom, v });
          const f = path.join(dossier, `${tag}-${m.nom.replace(/\W+/g, '-')}-${v.n}.png`);
          await page.screenshot({ path: f, timeout: 120000 });
          console.log(m.nom, v.n, JSON.stringify(info), '→', f);
        } catch (e) { console.log(m.nom, v.n, 'ÉCHEC', e.message.split('\n')[0]); }
      }
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
