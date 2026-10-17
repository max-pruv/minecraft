// SONDE (commandes simplifiées) : les cinq états — Explorer, Construire, au
// volant, aux commandes, le menu — de jour et de nuit, à la taille de l'iPhone
// de Max (430 × 932) et d'un iPad (820 × 1180). Une capture par état, et pour
// chacun les rectangles visibles du HUD, les paires qui se recouvrent et ce qui
// tombe dans le quart du joystick (x < 45 %, y > 40 %, v272).
//   node tests/sonde-commandes.cjs <dossier> [430x932,820x1180]
const { Banc } = require('./banc.js');
const DOSSIER = process.argv[2] || '.';
const TAILLES = (process.argv[3] || '430x932,820x1180').split(',').map((t) => {
  const [w, h] = t.split('x').map(Number); return { width: w, height: h };
});
const IDS = ['menu-btn', 'map-btn', 'minimap', 'edu-timer', 'gps', 'cap-avion', 'construction-pill', 'hotbar',
  'fun-target', 'construire-btn', 'jump-btn', 'fly-btn', 'down-btn', 'poser-btn', 'casser-btn', 'fm-btn',
  'train-btn', 'gaz-base', 'gaz-val', 'left-rail', 'left-rail-bottom', 'menu-carte'];
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  try {
    for (const vp of TAILLES) {
      const p = await banc.jouerSeul('SondeCmd' + vp.width, { viewport: vp, tactile: true, rr: 4 });
      const releve = (etat) => p.evaluate((ids) => {
        const R = {};
        for (const id of ids) {
          const e = document.getElementById(id); if (!e) continue;
          const st = getComputedStyle(e), b = e.getBoundingClientRect();
          if (st.display === 'none' || st.visibility === 'hidden' || b.width === 0) continue;
          R[id] = { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
        }
        return { vue: [innerWidth, innerHeight], R };
      }, IDS).then((r) => {
        const croise = (a, b) => Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) && Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y);
        const k = Object.keys(r.R).filter((n) => n !== 'menu-carte'), recouvre = [];
        for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
          const a = k[i], b = k[j];
          if ((a === 'left-rail' && b === 'map-btn') || (a === 'map-btn' && b === 'left-rail')) continue;
          if (croise(r.R[a], r.R[b])) recouvre.push(a + '×' + b);
        }
        const joy = k.filter((n) => { const b = r.R[n]; return b.x < r.vue[0] * 0.45 && b.y + b.h > r.vue[1] * 0.4; });
        console.log(JSON.stringify({ etat, vue: r.vue, recouvre, joy, R: r.R }));
      });
      const shot = (nom) => p.screenshot({ path: `${DOSSIER}/${nom}-${vp.width}x${vp.height}.png` });
      for (const [moment, fr] of [['jour', 0.25], ['nuit', 0.75]]) {
        await p.evaluate(async (fr) => {
          const g = window.__game, am = g.animalManager;
          const att = (ms) => new Promise((f) => setTimeout(f, ms));
          window.__setDayTime(fr);
          for (const a of [...am.animals]) am.scene.remove(a.mesh);
          am.animals.length = 0;
          const x0 = -1500.5, z0 = -2500.5;
          g.player.pos.set(x0, g.world.sommetColonne(Math.floor(x0), Math.floor(z0)) + 1.5, z0);
          g.player.yaw = -Math.PI / 2; g.player.pitch = 0.05;
          window.__commandes.construire(false);
          if (document.getElementById('minimap').style.display !== 'block') document.getElementById('map-btn').click();
          window.__gpsVers(x0 - 900, z0 + 40, 'Tour Eiffel');
          am.invoquer('horse', x0 + 4, z0);
          await att(4000);
        }, fr);
        await releve('explorer-' + moment); await shot('1-explorer-' + moment);
        await p.evaluate(async () => { window.__commandes.construire(true); await new Promise((f) => setTimeout(f, 900)); });
        await releve('construire-' + moment); await shot('2-construire-' + moment);
        await p.evaluate(async () => {
          window.__commandes.construire(false);
          const g = window.__game, am = g.animalManager, att = (ms) => new Promise((f) => setTimeout(f, ms));
          for (const a of [...am.animals]) am.scene.remove(a.mesh);
          am.animals.length = 0;
          am.invoquer('voiture', g.player.pos.x + 3, g.player.pos.z);
          await att(800);
          for (let e = 0; e < 8 && !(g.fun.montureConduite && g.fun.montureConduite()); e++) { document.getElementById('ride-btn').click(); await att(500); }
          await att(1500);
        });
        await releve('volant-' + moment); await shot('3-volant-' + moment);
        await p.evaluate(async () => {
          const g = window.__game, am = g.animalManager, att = (ms) => new Promise((f) => setTimeout(f, ms));
          for (let e = 0; e < 6 && g.fun.montureConduite && g.fun.montureConduite(); e++) { document.getElementById('ride-btn').click(); await att(500); }
          for (const a of [...am.animals]) am.scene.remove(a.mesh);
          am.animals.length = 0;
          am.invoquer('chasseur', g.player.pos.x + 3, g.player.pos.z);
          await att(800);
          for (let e = 0; e < 8 && !g.player.pilote; e++) { document.getElementById('ride-btn').click(); await att(500); }
          g.player.pos.y += 40; g.player.avionEtat = 'vol'; g.player.avionEnVol = true; g.player.vitesseAvion = 80;
          await att(1500);
        });
        await releve('avion-' + moment); await shot('4-avion-' + moment);
        await p.evaluate(async () => {
          const g = window.__game, att = (ms) => new Promise((f) => setTimeout(f, ms));
          for (let e = 0; e < 6 && g.player.pilote; e++) { document.getElementById('ride-btn').click(); await att(500); }
          g.player.flying = false;
          await att(1200);
          document.getElementById('menu-btn').click();
          await att(600);
        });
        await releve('menu-' + moment); await shot('5-menu-' + moment);
        await p.evaluate(() => document.getElementById('menu-reprendre').click());
      }
      await p.close();
    }
  } catch (e) { console.log('ERREUR', e && e.stack || e); }
  await banc.fermer().catch(() => {}); process.exit(0);
})();
