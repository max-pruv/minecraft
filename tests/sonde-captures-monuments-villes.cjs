// CAPTURES DES MONUMENTS DES VILLES ENGENDRÉES À L'ÉCHELLE DE LEUR CIEL (v342).
// Usage : node tests/sonde-captures-monuments-villes.cjs <dossier> [étiquette] [Villes,séparées]
//
// Consigne de Max : on juge sur captures, de la rue et du ciel. Deux vues par
// ville : la rue, au pied de son plus haut monument remis à l'échelle, et le
// ciel, au-dessus du centre de gravité de ses repères. Tout se déduit des
// repères du registre (`REPERES`, `villeDuRepere`) — jamais une coordonnée
// écrite à la main (v223).
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const VILLES = (process.argv[4] || 'Rome,Florence,Berlin,Moscou,Istanbul,Stockholm,Amsterdam,Prague,Toronto,Mexico,Bangkok,Singapour').split(',');

(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1&batiloin=1' });
    for (const ville of VILLES) for (const vue of ['rue', 'proche', 'ciel']) {
      try {
        const info = await page.evaluate(async ({ ville, vue }) => {
          const g = window.__game;
          const W = await import('./src/world.js');
          const EM = await import('./src/echelle-monuments.js');
          const reps = W.REPERES.filter((l) => W.villeDuRepere(l) === ville && !/mobilier/.test(l.name));
          if (!reps.length) return { erreur: `aucun repère pour ${ville}` };
          const haut = (l) => { const e = EM.echelleDe(ville, l.name); return e ? e.cible : 0; };
          const cx = reps.reduce((s, l) => s + l.x, 0) / reps.length;
          const cz = reps.reduce((s, l) => s + l.z, 0) / reps.length;
          const tete = [...reps].sort((a, b) => haut(b) - haut(a))[0];
          const degage = (x, z) => g.world.sommetColonne(x, z) <= g.world.terrainHeight(x, z) + 1;
          let x, z, y, cibleX, cibleZ, cibleY;
          if (vue === 'ciel') {
            x = Math.round(cx - 70); z = Math.round(cz + 70);
            y = g.world.terrainHeight(cx, cz) + 75;
            cibleX = cx; cibleZ = cz; cibleY = g.world.terrainHeight(cx, cz) + 10;
          } else if (vue === 'proche') {
            const ht = haut(tete), sol = g.world.terrainHeight(tete.x, tete.z);
            x = Math.round(tete.x - 30); z = Math.round(tete.z + 30);
            y = sol + ht + 14;
            cibleX = tete.x; cibleZ = tete.z; cibleY = sol + ht * 0.55;
          } else {
            // Un poste D'OÙ L'ON VOIT : une colonne dégagée, et rien qui dépasse
            // du sol entre elle et le monument (la règle de la sonde de Paris).
            const voit = (px, pz) => {
              const dx = tete.x - px, dz = tete.z - pz, n = Math.hypot(dx, dz);
              for (let t = 2; t < n - tete.box - 1; t++) {
                const qx = Math.round(px + dx * t / n), qz = Math.round(pz + dz * t / n);
                if (g.world.sommetColonne(qx, qz) > g.world.terrainHeight(qx, qz) + 2) return false;
              }
              return true;
            };
            let ok = false;
            for (const d of [28, 22, 36, 18, 44]) {
              for (let t = 0; t < 32 && !ok; t++) {
                const cap = t * Math.PI / 16;
                const px = Math.round(tete.x - Math.sin(cap) * d), pz = Math.round(tete.z - Math.cos(cap) * d);
                if (degage(px, pz) && voit(px, pz)) { x = px; z = pz; ok = true; }
              }
              if (ok) break;
            }
            if (!ok) { x = Math.round(tete.x - 28); z = Math.round(tete.z); }
            y = g.world.sommetColonne(x, z) + 2.6;
            cibleX = tete.x; cibleZ = tete.z; cibleY = g.world.terrainHeight(tete.x, tete.z) + haut(tete) * 0.6;
          }
          g.player.flying = true;
          g.player.pos.set(x + 0.5, y, z + 0.5);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = Math.atan2(-(cibleX - x), -(cibleZ - z));
          g.player.pitch = Math.atan2(cibleY - y, Math.max(1, Math.hypot(cibleX - x, cibleZ - z)));
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now();
          let n0 = -1, stable = 0;
          while (performance.now() - t0 < 60000) {
            await dodo(700);
            const n = g.chunkMeshes.size;
            if (n === n0) { if (++stable >= 4) break; } else { stable = 0; n0 = n; }
          }
          await dodo(1500);
          return { x, z, y: Math.round(y), tete: tete.name, h: haut(tete), attente: Math.round(performance.now() - t0), morceaux: g.chunkMeshes.size };
        }, { ville, vue });
        const f = path.join(dossier, `${tag}-${ville.replace(/[^a-zA-Z]/g, '')}-${vue}.png`);
        await page.screenshot({ path: f, timeout: 180000 });
        console.log(`${ville} ${vue}`.padEnd(28), JSON.stringify(info), '→', f);
      } catch (e) {
        console.log(`${ville} ${vue}`.padEnd(28), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
      }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
