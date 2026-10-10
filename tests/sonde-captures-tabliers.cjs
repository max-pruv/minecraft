// Captures des tabliers allongés sous la voie (v414) : vue plongeante au-dessus
// du point où la voie touchait l'eau sans tablier.
// Usage : node tests/sonde-captures-tabliers.cjs <dossier> <tag> [vue,vue]
// Le même script se lance depuis un arbre d'`origin/main` pour l'« avant ».
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
// (ville, P, Q) dans le repère de la trame : relevés par la sonde des pas sur
// l'eau hors tablier de la v404.
const VUES = [
  { nom: 'kyoto', cle: 'kyoto', P: 7, Q: -1.6 },
  { nom: 'shanghai', cle: 'shanghai', P: 62.4, Q: 60 },
  { nom: 'stockholm', cle: 'stockholm', P: -13, Q: 25.4 },
  // v417 : le Strip et sa grille de rues, vus de haut
  { nom: 'lasvegas', cle: 'lasvegas', P: 0, Q: 0, h: 90 },
];
// argv[4] : les vues à prendre, par nom (toutes sinon)
const choix = process.argv[4] ? process.argv[4].split(',') : null;
(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 6, viewport: { width: 1280, height: 720 }, dpr: 1 });
    for (const v of VUES.filter((w) => !choix || choix.includes(w.nom))) {
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game;
          const vm = await import('./src/villesmonde.js');
          const f = vm.VILLES_MONDE.find((h) => h.cle === v.cle), t = f.trame;
          const co = Math.cos(t.ang), si = Math.sin(t.ang);
          const x = f.ancre.x + v.P * co + v.Q * si, z = f.ancre.z - v.P * si + v.Q * co;
          g.player.flying = true;
          g.player.pos.set(x, 33 + (v.h || 30), z + (v.h ? 50 : 18));
          g.player.vel.set(0, 0, 0);
          g.player.yaw = 0; g.player.pitch = -0.95;
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          await dodo(6000);
          let n0 = -1;
          for (let k = 0; k < 40; k++) { await dodo(700); const n = g.chunkMeshes.size; if (n === n0) break; n0 = n; }
          await dodo(1500);
          return { x: Math.round(x), z: Math.round(z), morceaux: g.chunkMeshes.size };
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
