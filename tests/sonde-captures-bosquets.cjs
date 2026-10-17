// LES BOSQUETS, AVANT ET APRÈS (v513).
//   node tests/sonde-captures-bosquets.cjs <dossier> <étiquette> [filtre]
// Le banc sert le dépôt d'où l'on lance le script : lancé depuis un arbre
// d'`origin/main`, il photographie l'avant. Les sites sont des forêts trouvées
// sous node sur le bruit de forêt d'avant les bosquets (forêt tempérée dense,
// taïga, tropiques), au relief doux : la même colonne des deux côtés. Une vue
// du ciel, et une vue à hauteur de conducteur.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const SITES = { foret: { x: 13984, z: 21234 }, taiga: { x: 4668, z: -8487 }, tropiques: { x: 8581, z: 31505 } };
const TOUTES = [];
for (const [nom, p] of Object.entries(SITES)) {
  TOUTES.push({ nom: `${nom}-ciel`, ...p, h: 70, pitch: -0.75, yaw: 0.6 });
  TOUTES.push({ nom: `${nom}-volant`, ...p, h: 1.4, pitch: -0.03, yaw: 1.2 });
}
const filtre = process.argv[4];
const VUES = filtre ? TOUTES.filter((v) => v.nom.startsWith(filtre)) : TOUTES;
(async () => {
  const banc = new Banc({ portJeu: 8415, portPairs: 9415 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Bosquets', { rr: 8, viewport: { width: 1280, height: 720 }, dpr: 1 });
    for (const v of VUES) {
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game, w = g.world;
          const x = v.x + 0.5, z = v.z + 0.5;
          const sol = w.solContinu ? (w.solContinu(x, z) ?? w.terrainHeight(v.x, v.z) + 1) : w.terrainHeight(v.x, v.z) + 1;
          g.player.flying = true;
          g.player.pos.set(x, sol + v.h, z);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = v.yaw; g.player.pitch = v.pitch;
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now();
          let n0 = -1, stable = 0;
          await dodo(8000);
          while (performance.now() - t0 < 90000) {
            await dodo(800);
            const n = g.chunkMeshes.size, e = g.horizon.etat();
            if (n === n0 && e.manquantes === 0) { if (++stable >= 4) break; } else { stable = 0; n0 = n; }
          }
          await dodo(1500);
          return { x: v.x, z: v.z, attente: Math.round(performance.now() - t0), morceaux: g.chunkMeshes.size };
        }, v);
        const fch = path.join(dossier, `${tag}-${v.nom}.png`);
        await page.screenshot({ path: fch, timeout: 180000 });
        console.log(v.nom.padEnd(16), JSON.stringify(info), '→', fch);
      } catch (e) {
        console.log(v.nom.padEnd(16), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
      }
    }
  } catch (e) {
    console.log('ÉCHEC :', String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  } finally { await banc.fermer(); process.exit(0); }
})();
