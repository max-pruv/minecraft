// SONDE (aviation) : les rectangles du HUD aux commandes d'un avion EN VOL,
// minicarte ouverte, GPS actif, un bandeau affiché — à la taille de l'iPhone
// de Max (430 × 932) et à celle du banc (420 × 760). Rend la liste des
// paires qui se recouvrent, et une capture par taille.
const { Banc } = require('./banc.js');
const DOSSIER = process.argv[2] || '.';
const TAILLES = [{ width: 430, height: 932 }, { width: 420, height: 760 }];
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  try {
    for (const vp of TAILLES) {
      const p = await banc.jouerSeul('SondeHud' + vp.width, { viewport: vp, tactile: true, rr: 4 });
      const r = await p.evaluate(async () => {
        const g = window.__game, am = g.animalManager;
        const att = (ms) => new Promise((f) => setTimeout(f, ms));
        for (const a of [...am.animals]) am.scene.remove(a.mesh);
        am.animals.length = 0;
        const x0 = -1500.5, z0 = -2500.5;
        g.player.pos.set(x0, g.world.sommetColonne(Math.floor(x0), Math.floor(z0)) + 1.5, z0); g.player.yaw = -Math.PI / 2;
        await att(1500);
        am.invoquer('chasseur', x0 + 3, z0);
        await att(800);
        for (let e = 0; e < 8 && !g.player.pilote; e++) { document.getElementById('ride-btn').click(); await att(500); }
        if (!g.player.pilote) return { err: 'pas aux commandes' };
        // en vol, comme sur la capture
        g.player.pos.y += 60; g.player.avionEtat = 'vol'; g.player.avionEnVol = true; g.player.vitesseAvion = 100;
        if (document.getElementById('minimap').style.display !== 'block') document.getElementById('map-btn').click();
        window.__gpsVers(x0 + 2000, z0 - 9000, 'Minneapolis');
        await att(500);
        const { toast } = await import('./src/bandeau.js');
        toast('🛑 À l\'arrêt. Le joystick fait rouler, ✈️ redécolle.', 0xffffff, 60000);
        await att(900);
        const ids = ['cap-avion', 'minimap', 'gps', 'toast', 'fun-target', 'fly-btn', 'train-btn', 'gaz-base', 'gaz-val', 'cmd-vol', 'edu-timer', 'left-rail', 'left-rail-bottom', 'pause-btn', 'gps-ami'];
        const rects = {};
        for (const id of ids) {
          const e = document.getElementById(id); if (!e) continue;
          const st = getComputedStyle(e), b = e.getBoundingClientRect();
          if (st.display === 'none' || b.width === 0 || (id === 'toast' && st.opacity === '0')) continue;
          rects[id] = { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
        }
        return { vue: [innerWidth, innerHeight], rects };
      });
      await p.screenshot({ path: `${DOSSIER}/hud-${vp.width}x${vp.height}.png` });
      const R = r.rects || {};
      const croise = (a, b) => Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) && Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y);
      const k = Object.keys(R), recouvre = [];
      for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) if (croise(R[k[i]], R[k[j]])) recouvre.push(k[i] + '×' + k[j]);
      console.log(JSON.stringify({ vue: r.vue, err: r.err, rects: R, recouvre }));
      await p.close();
    }
  } catch (e) { console.log('ERREUR', e && e.stack || e); }
  await banc.fermer().catch(() => {}); process.exit(0);
})();
