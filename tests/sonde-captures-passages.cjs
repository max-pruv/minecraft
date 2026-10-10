// LES PASSAGES EN BIAIS, VUS (v412). Une vue de rue et une vue d'en haut à un
// carrefour de Rome et de Zurich. Le banc sert le dépôt d'où l'on lance le
// script : lancé depuis un arbre d'`origin/main`, il photographie l'avant.
// Le carrefour se cherche avec la règle de la branche (`passages.js`, lu par
// node), jamais un point écrit en blocs.
//   node tests/sonde-captures-passages.cjs <dossier> <étiquette> [branche/src]
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const srcBranche = path.resolve(process.argv[4] || path.join(__dirname, '..', 'src'));
(async () => {
  const { passageEn } = await import(path.join(srcBranche, 'passages.js'));
  const { positionDe } = await import(path.join(srcBranche, 'mondes.js'));
  const vues = [];
  for (const cle of ['rome', 'zurich']) {
    const p = positionDe(cle);
    let best = null;
    for (let r = 8; r < 60 && !best; r++) for (let k = 0; k < 48 && !best; k++) {
      const x = Math.floor(p.x + Math.cos(k / 48 * 6.283) * r) + 0.5, z = Math.floor(p.z + Math.sin(k / 48 * 6.283) * r) + 0.5;
      const q = passageEn(x, z); if (q) best = { x, z, ux: q.ux, uz: q.uz };
    }
    if (!best) continue;
    // de la rue : debout sur le trottoir d'en face, regardant le passage dans l'axe de la rue
    vues.push({ nom: cle + '-rue', x: best.x - best.ux * 9, z: best.z - best.uz * 9, h: 2.2, yaw: Math.atan2(best.ux, best.uz) + Math.PI, pitch: -0.18 });
    vues.push({ nom: cle + '-ciel', x: best.x - best.ux * 6, z: best.z - best.uz * 6, h: 16, yaw: Math.atan2(best.ux, best.uz) + Math.PI, pitch: -0.9 });
  }
  const banc = new Banc({ portJeu: 8435, portPairs: 9435 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Passages', { rr: 6, viewport: { width: 1280, height: 720 }, dpr: 1 });
    for (const v of vues) {
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game, w = g.world;
          g.player.flying = true;
          g.player.pos.set(v.x, w.terrainHeight(Math.floor(v.x), Math.floor(v.z)) + 1 + v.h, v.z);
          g.player.vel.set(0, 0, 0); g.player.yaw = v.yaw; g.player.pitch = v.pitch;
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          await dodo(8000);
          let n0 = -1, stable = 0; const t0 = performance.now();
          while (performance.now() - t0 < 60000) { await dodo(800); const n = g.chunkMeshes.size; if (n === n0) { if (++stable >= 4) break; } else { stable = 0; n0 = n; } }
          for (const h of (g.passants.sites || []).flatMap((s) => s.peuple || [])) if (h.mesh) h.mesh.visible = false;
          await dodo(1500);
          g.player.pos.set(v.x, w.terrainHeight(Math.floor(v.x), Math.floor(v.z)) + 1 + v.h, v.z); g.player.yaw = v.yaw; g.player.pitch = v.pitch;
          await dodo(600);
          return { morceaux: g.chunkMeshes.size };
        }, v);
        const fch = path.join(dossier, `${tag}-${v.nom}.png`);
        await page.screenshot({ path: fch, timeout: 180000 });
        console.log(v.nom.padEnd(12), JSON.stringify(info), '→', fch);
      } catch (e) { console.log(v.nom, 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]); }
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
