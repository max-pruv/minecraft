// L'INTÉRIEUR DES TERMINAUX, AVANT ET APRÈS (v328). Usage :
//   node tests/sonde-captures-terminaux.cjs <dossier> <étiquette>
// Une vue par profil d'aérodrome — un hub (Heathrow), une ville (Orly), une
// base (Saint-Dizier) — et le hall 2A de Roissy. La caméra se pose DANS le
// hall, dans l'allée, et regarde le long de la façade : comptoirs d'un côté,
// sièges de l'autre. Les cotes se DEMANDENT au plan (`planAerodrome`), elles
// ne s'écrivent pas. Le banc sert le dépôt d'où l'on lance le script.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const VUES = [
  { nom: 'hub-departs', cle: 'lhr', cote: -1 },
  { nom: 'hub-arrivees', cle: 'lhr', cote: 1 },
  { nom: 'ville-departs', cle: 'orly', cote: -1 },
  { nom: 'base-departs', cle: 'bas-sd', cote: -1 },
  { nom: 'roissy-2a', cle: 'cdg', cote: 0 },
];
(async () => {
  const banc = new Banc({ portJeu: 8413, portPairs: 9413 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Terminal', { rr: 4, viewport: { width: 1280, height: 720 }, dpr: 1 });
    for (const v of VUES) {
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game, w = g.world;
          const mod = await import('./src/aeroport.js');
          const a = mod.AEROPORTS.find((q) => q.cle === v.cle);
          const sol = w.terrainHeight(a.x, a.z);
          let x, z, yaw;
          if (v.cote === 0) { x = a.x + 44.5; z = a.z - 12.5; yaw = Math.PI / 2; }
          else {
            const P = mod.planAerodrome(a.profil, a.r);
            // dans l'allée, au bord du hall, regard vers le fond du hall
            x = a.x + v.cote * 2 + 0.5; z = a.z + P.zt0 + 6.5;
            yaw = v.cote < 0 ? Math.PI / 2 : -Math.PI / 2;
          }
          g.player.flying = true;
          g.player.pos.set(x, sol + 1.2, z);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = yaw; g.player.pitch = -0.12;
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now();
          let n0 = -1, stable = 0;
          await dodo(8000);
          while (performance.now() - t0 < 90000) {
            await dodo(800);
            const n = g.chunkMeshes.size;
            if (n === n0) { if (++stable >= 4) break; } else { stable = 0; n0 = n; }
          }
          await dodo(1500);
          return { nom: a.nom, x: Math.round(x), z: Math.round(z), sol, attente: Math.round(performance.now() - t0) };
        }, v);
        const fch = path.join(dossier, `${tag}-${v.nom}.png`);
        await page.screenshot({ path: fch, timeout: 180000 });
        console.log(v.nom.padEnd(14), JSON.stringify(info), '→', fch);
      } catch (e) {
        console.log(v.nom.padEnd(14), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
      }
    }
  } catch (e) {
    console.log('ÉCHEC :', String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  } finally { await banc.fermer(); process.exit(0); }
})();
