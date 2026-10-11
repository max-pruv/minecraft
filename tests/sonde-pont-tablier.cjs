// Sonde (v430) : « le premier pont se franchit sur son tablier » est tombé
// rouge une fois au portail — la voiture a fini SOUS le tablier (80 images sur
// 80 au-dessus de l'ouvrage, 5,95 blocs sous la cote) — et vert rejoué seul.
// Une intermittence se juge sur une DISTRIBUTION des deux côtés (v269) : on
// refait la traversée N fois sur une même page et l'on publie, pour chaque
// passage, l'image où la voiture quitte la cote du tablier (position, cote,
// `tablierEn`, `routeEn` au coin et au point, sol continu, blocs dessous).
// Usage : node sonde-pont-tablier.cjs [passages] [pages]  (sert l'arbre de banc.js)
const { Banc } = require('./banc.js');

(async () => {
  const N = +(process.argv[2] || 6);
  const banc = new Banc({ portJeu: 8341, portPairs: 9341 });
  await banc.ouvrir();
  try {
    // `pages` : un passage par page NEUVE — c'est au premier passage d'une
    // page que la voiture tombait (morceaux pas encore tous là).
    const pages = process.argv[3] === 'pages';
    const tout = { pont: null, out: [] };
    for (let k = 0; k < (pages ? N : 1); k++) {
    const tab = await banc.jouerSeul('Pontier' + (pages ? k : ''));
    const res = await tab.evaluate(async (N) => {
      const g = window.__game, p = g.player;
      const R = await import('./src/routes.js');
      const seg = R.segmentsDeRoute()[0], pr = R.profilDe(seg);
      const pont = { s0: Math.round(pr.spans[0].s0), s1: Math.round(pr.spans[0].s1) };
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      const sortir = async () => { for (let e = 0; e < 4 && auVolant(); e++) { document.getElementById('ride-btn').click(); await dodo(800); } };
      const out = [];
      for (let n = 0; n < N; n++) {
        await sortir();
        const s0 = pont.s0 - 12;
        const q = R.pointA(seg, s0), L = R.largeurA(seg, s0);
        const o = L.terrePlein + L.demiChaussee / 2;
        const X = q.x + (-q.fz) * o, Z = q.z + q.fx * o, yaw = Math.atan2(-q.fx, -q.fz);
        g.world.sansSolContinu = false;
        p.flying = false; p.pos.set(X, R.coteA(seg, s0) + 1.5, Z); p.vel.set(0, 0, 0); p.yaw = yaw; p.pitch = 0;
        for (const a of [...g.animalManager.animals]) if (a.def.key !== 'poisson') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
        await dodo(3000);
        g.animalManager.invoquer('voiture', X - Math.sin(yaw) * 3, Z - Math.cos(yaw) * 3);
        await dodo(1500);
        for (let e = 0; e < 6 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await dodo(1000); }
        if (!auVolant()) { out.push({ echec: 'pas monté' }); continue; }
        const r = { images: 0, sous: 0, premier: null, depart: { x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2) } };
        let prec = null;
        const t0 = performance.now();
        p.touchMove.f = 1;
        await new Promise((fin) => {
          const tour = () => {
            r.images++;
            const rr = R.routeEn(Math.round(p.pos.x), Math.round(p.pos.z));
            const ici = { x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), sol: p.onGround,
              tab: g.world.tablierEn(p.pos.x, p.pos.z), coin: (() => { const c = R.routeEn(Math.floor(p.pos.x), Math.floor(p.pos.z)); return c ? (c.ouvrage ? 'pont' : c.piece) : null; })(),
              s: +R.projeter(seg, p.pos.x, p.pos.z).s.toFixed(1), solc: g.world.solContinu(p.pos.x, p.pos.z),
              dessous: g.world.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y) - 1, Math.floor(p.pos.z)) };
            if (rr && rr.ouvrage && p.pos.y - rr.cote < -0.3) { r.sous++; if (!r.premier) r.premier = { avant: prec, ici, cote: rr.cote }; }
            prec = ici;
            const s = R.projeter(seg, p.pos.x, p.pos.z).s;
            if (s > pont.s1 + 6 || r.images > 400 || performance.now() - t0 > 90000) fin(); else requestAnimationFrame(tour);
          };
          requestAnimationFrame(tour);
        });
        p.touchMove.f = 0;
        r.sFin = +R.projeter(seg, p.pos.x, p.pos.z).s.toFixed(1);
        r.ms = Math.round(performance.now() - t0);
        out.push(r);
      }
      return { pont, out };
    }, pages ? 1 : N);
    tout.pont = res.pont; tout.out.push(...res.out);
    if (pages) await tab.close();
    }
    const res = tout;
    console.log(JSON.stringify(res.pont));
    for (const r of res.out) console.log(JSON.stringify(r));
    const sous = res.out.filter((r) => r.sous > 0).length;
    console.log(`→ ${sous} passage(s) sur ${res.out.length} sous le tablier`);
  } catch (e) { console.log('ERREUR', e && e.message); }
  await banc.fermer();
  process.exit(0);
})();
