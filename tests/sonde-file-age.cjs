// L'ÂGE DES DEMANDES EN ATTENTE (v360) : on roule à 80 b/s et l'on regarde,
// toutes les 250 ms, combien de demandes sont en attente au worker et depuis
// combien de temps.
const { Banc, souffler } = require('./banc.js');
const lieu = process.argv[2] || 'paris';
(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  await souffler();
  const page = await banc.jouerSeul('Age', { rr: 12, params: '&file=cone' });
  const r = await page.evaluate(async (lieu) => {
    const g = window.__game; const { positionDe } = await import('./src/mondes.js');
    const P = lieu === 'campagne' ? { x: 30000, z: 30000 } : positionDe(lieu);
    const v = 80, x0 = P.x - v * 7, p = g.player;
    const poser = (x) => { p.pos.set(x, 140, P.z + 0.5); p.vel.set(0, 0, 0); p.yaw = -Math.PI / 2; };
    p.flying = true; poser(x0);
    const att = (ms) => new Promise((f) => setTimeout(f, ms));
    await att(15000);
    const dep = performance.now(); let roule = true;
    const tic = () => { if (!roule) return; poser(x0 + v * (performance.now() - dep) / 1000); requestAnimationFrame(tic); };
    requestAnimationFrame(tic);
    await att(4000);
    const rel = [];
    for (let i = 0; i < 20; i++) {
      await att(250);
      const now = performance.now();
      const ages = [...g.statsMaillage.enAttente.values()].map((a) => Math.round(now - (a.depuis || now)));
      rel.push(ages.sort((a, b) => a - b));
    }
    roule = false;
    return rel;
  }, lieu);
  for (const a of r) console.log(JSON.stringify(a));
  process.exit(0);
})();
