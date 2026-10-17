// CAPTURES DES VILLES PASSÉES À LA FICHE (v474, lot 1) — reprise de celle
// d'Édimbourg (v450). Usage : node tests/sonde-captures-fiches.cjs <dossier>
// [étiquette] [vues]. Une vue est `lieu:ciel` ou `lieu:rue` ; le lieu est une
// clé de ville ou le nom d'un repère.
// Lancée depuis un arbre détaché sur origin/main, elle rend l'« avant ». Les
// positions se déduisent du registre (`VILLES_MONDE`, `REPERES`), jamais
// écrites (v223).
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const VUES = (process.argv[4] || 'dublin:ciel,dublin:rue,Le Spire:rue,toulouse:ciel,toulouse:rue,melbourne:ciel,melbourne:rue,nantes:ciel,Château des ducs de Bretagne:ciel,montpellier:ciel,Arc de triomphe:rue').split(',').map((v) => v.split(':'));

(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1&batiloin=1' });
    for (const [lieu, vue] of VUES) {
      try {
        const info = await page.evaluate(async ({ lieu, vue }) => {
          const g = window.__game;
          const W = await import('./src/world.js');
          const VM = await import('./src/villesmonde.js');
          let cx, cz;
          const f = VM.VILLES_MONDE.find((v) => v.cle === lieu);
          if (f) { cx = f.ancre.x; cz = f.ancre.z; }
          else { const l = W.REPERES.find((r) => r.name === lieu); cx = l.x; cz = l.z; }
          const sol = g.world.terrainHeight(cx, cz);
          let x, z, y, ty;
          if (vue === 'ciel') { x = cx - 45; z = cz + 45; y = sol + 45; ty = sol + 6; }
          else {
            // Une colonne de rue dégagée à vingt blocs du centre, regard vers lui.
            let ok = false;
            for (let t = 0; t < 32 && !ok; t++) {
              const a = t * Math.PI / 16, px = Math.round(cx + Math.sin(a) * 20), pz = Math.round(cz + Math.cos(a) * 20);
              // une colonne de rue SÈCHE : sous l'eau, `sommetColonne` rend le lit
              // du fleuve, et la caméra se retrouvait sous un tablier (Dublin)
              const som = g.world.sommetColonne(px, pz);
              if (som <= g.world.terrainHeight(px, pz) + 1 && !VM.eauVillesMonde(px, pz)) { x = px; z = pz; ok = true; }
            }
            if (!ok) { x = cx + 20; z = cz; }
            y = g.world.sommetColonne(x, z) + 2.6; ty = y + 6;
          }
          g.player.flying = true;
          g.player.pos.set(x + 0.5, y, z + 0.5);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = Math.atan2(-(cx - x), -(cz - z));
          g.player.pitch = Math.atan2(ty - y, Math.max(1, Math.hypot(cx - x, cz - z)));
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
          return { x, z, y: Math.round(y), attente: Math.round(performance.now() - t0), morceaux: g.chunkMeshes.size };
        }, { lieu, vue });
        const f = path.join(dossier, `${tag}-${lieu.replace(/[^a-zA-Z]/g, '')}-${vue}.png`);
        await page.screenshot({ path: f, timeout: 180000 });
        console.log(`${lieu} ${vue}`.padEnd(24), JSON.stringify(info), '→', f);
      } catch (e) {
        console.log(`${lieu} ${vue}`.padEnd(24), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
      }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
