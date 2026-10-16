// Captures du Panthéon de Rome visitable (v455) : dehors depuis la place,
// dedans vers l'autel, dedans sous l'oculus. `node sonde-captures-pantheon.cjs <dossier> <tag>`
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.', tag = process.argv[3] || 'apres';
const VUES = [
  { nom: 'dehors', du: 0, dv: -16, h: 1.6, cdu: 0, cdv: 0, ch: 5 },
  { nom: 'dedans', du: 0, dv: -2, h: 1.6, cdu: 0, cdv: 4, ch: 2 },
  { nom: 'oculus', du: 0, dv: 1.5, h: 1.6, cdu: 0, cdv: -1, ch: 12 },
];
(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 6, viewport: { width: 1280, height: 720 }, dpr: 1 });
    for (const v of VUES) {
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game, W = await import('./src/world.js');
          const lm = W.REPERES.find((l) => l.name === 'Panthéon' && W.villeDuRepere(l) === 'Rome');
          const sol = g.world.terrainHeight(lm.x, lm.z);
          const x = lm.x + v.du + 0.5, z = lm.z + v.dv + 0.5, y = sol + 1 + v.h;
          const cx = lm.x + v.cdu + 0.5, cz = lm.z + v.cdv + 0.5, cy = sol + 1 + v.ch;
          g.player.flying = true; g.player.pos.set(x, sol + 1, z); g.player.vel.set(0, 0, 0);
          g.player.yaw = Math.atan2(-(cx - x), -(cz - z));
          g.player.pitch = Math.atan2(cy - y, Math.max(0.5, Math.hypot(cx - x, cz - z)));
          window.__setDayTime(0.45);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          let n0 = -1, st = 0; const t0 = performance.now();
          while (performance.now() - t0 < 60000) { await dodo(700); const n = g.chunkMeshes.size; if (n === n0) { if (++st >= 4) break; } else { st = 0; n0 = n; } }
          await dodo(1500);
          return { x: lm.x, z: lm.z, sol };
        }, v);
        const f = path.join(dossier, `${tag}-pantheon-${v.nom}.png`);
        await page.screenshot({ path: f, timeout: 180000 });
        console.log(v.nom, JSON.stringify(info), '→', f);
      } catch (e) { console.log(v.nom, 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]); }
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
