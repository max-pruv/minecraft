// CAPTURES DES COUPOLES QUI ONT REÇU LEUR ÉDIFICE (v364), d'après celle des
// tours (v357), avec quatre vues de trois quarts (`ne`, `no`, `se`, `so`) : la
// vue « proche » de la v357 se pose toujours au sud-ouest, et à Florence le
// Palazzo Vecchio était entre elle et le Duomo.
// Usage : node tests/sonde-captures-coupoles.cjs <dossier> [étiquette] [Ville|Nom;Ville|Nom] [vues]
//
// La sonde des monuments des villes (v342), visée tour par tour : la rue au
// pied de la tour, la vue proche, et le ciel au-dessus des repères de sa ville.
// Les positions se déduisent du registre (`REPERES`), jamais écrites (v223).
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const VISEES = (process.argv[4] || "Chicago|La Willis Tower;Chicago|Le John Hancock;Shanghai|La tour Jin Mao;Shanghai|La perle de l'Orient;Tokyo|La tour de Tokyo;Tokyo|La Skytree;Séoul|La tour de Séoul;Hong Kong|La Banque de Chine;Hong Kong|L'IFC;Bruxelles|L'hôtel de ville;Marrakech|La Koutoubia;Venise|Le campanile").split(';');
const VUES = (process.argv[5] || 'rue,proche,ciel').split(',');

(async () => {
  const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1&batiloin=1' });
    for (const visee of VISEES) for (const vue of VUES) {
      const [ville, nom] = visee.split('|');
      try {
        const info = await page.evaluate(async ({ ville, vue, nom }) => {
          const g = window.__game;
          const W = await import('./src/world.js');
          const EM = await import('./src/echelle-monuments.js');
          const reps = W.REPERES.filter((l) => W.villeDuRepere(l) === ville && !/mobilier/.test(l.name));
          if (!reps.length) return { erreur: `aucun repère pour ${ville}` };
          const haut = (l) => { const e = EM.echelleDe(ville, l.name); if (e) return e.cible; let h = 0; const lm = W.CONF_NEUF.reperes.find((q) => q.name === l.name && q.x === l.x); if (lm) lm.build((dx, dy, dz, id) => { if (id && dy > h) h = dy; }); return h; };
          const cx = reps.reduce((s, l) => s + l.x, 0) / reps.length;
          const cz = reps.reduce((s, l) => s + l.z, 0) / reps.length;
          const tete = reps.find((l) => l.name === nom) || [...reps].sort((a, b) => haut(b) - haut(a))[0];
          const degage = (x, z) => g.world.sommetColonne(x, z) <= g.world.terrainHeight(x, z) + 1;
          let x, z, y, cibleX, cibleZ, cibleY;
          if (vue === 'ciel') {
            x = Math.round(tete.x - 75); z = Math.round(tete.z + 75);
            y = g.world.terrainHeight(tete.x, tete.z) + 60;
            cibleX = tete.x; cibleZ = tete.z; cibleY = g.world.terrainHeight(tete.x, tete.z) + 22;
          } else if (['ne', 'no', 'se', 'so'].includes(vue)) {
            const ht = haut(tete) || 30, sol = g.world.terrainHeight(tete.x, tete.z);
            const sx = vue.endsWith('e') ? 1 : -1, sz = vue.startsWith('s') ? 1 : -1;
            x = Math.round(tete.x + sx * 30); z = Math.round(tete.z + sz * 30);
            y = sol + ht * 0.7 + 10;
            cibleX = tete.x; cibleZ = tete.z; cibleY = sol + ht * 0.45;
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
        }, { ville, vue, nom });
        const f = path.join(dossier, `${tag}-${(ville + nom).replace(/[^a-zA-Z]/g, '')}-${vue}.png`);
        await page.screenshot({ path: f, timeout: 180000 });
        console.log(`${nom} ${vue}`.padEnd(34), JSON.stringify(info), '→', f);
      } catch (e) {
        console.log(`${nom} ${vue}`.padEnd(34), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
      }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
