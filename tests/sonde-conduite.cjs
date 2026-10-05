// LA CONDUITE SE COMPORTE-T-ELLE COMME ANNONCÉ ? (v337) Une dalle de pierre
// loin de tout, une voiture invoquée, et l'on mesure en TEMPS DE JEU (dt borné,
// v277) : pointe, 0→100, rayon de virage à deux vitesses, mur rasant, mur de
// face, et une panne posée à la main.
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8396, portPairs: 9396 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeConduite', { rr: 3 });
    page.on('pageerror', (e) => console.log('ERREUR PAGE', e.message));
    const out = await page.evaluate(async (flotte) => {
      const g = window.__game;
      const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
      const { BLOCK } = await import('./src/blocks.js');
      const C = await import('./src/conduite.js');
      const x0 = 40000, z0 = 40000; let y0 = 0;
      for (let d = -20; d <= 420; d += 4) for (let w = -60; w <= 60; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 3;
      // une grande dalle : 440 × 121
      for (let d = -20; d <= 420; d++) for (let w = -60; w <= 60; w++) g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      const vider = () => { for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh); g.animalManager.animals.length = 0; };
      const monter = async (fl) => {
        for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await dormir(400); }
        vider();
        g.player.flying = false; g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
        g.player.pos.set(x0, y0 + 1.2, z0 + 0.5); g.player.vel.set(0, 0, 0);
        g.animalManager.invoquer('voiture', x0 + 3, z0 + 0.5, false, { flotte: fl });
        await dormir(600);
        for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); const t = performance.now(); while (!auVolant() && performance.now() - t < 2500) await dormir(150); }
        g.player.pos.set(x0, y0 + 1.05, z0 + 0.5); g.player.yaw = -Math.PI / 2; g.player.vel.set(0, 0, 0); g.player.vitesseVoiture = 0;
        return auVolant();
      };
      // temps de jeu : on cumule min(dt, 0,05) par image
      const enJeu = (n, cb) => new Promise((fin) => { let c = 0, p = performance.now(); const pas = (t) => { const d = Math.min(Math.max((t - p) / 1000, 0), 0.05); c += d; p = t; if (cb) cb(c, d); if (c >= n) fin(c); else requestAnimationFrame(pas); }; requestAnimationFrame(pas); });
      const res = {};
      if (!(await monter(flotte))) return { err: 'pas monté' };
      const P = g.player;
      res.boost = P.boost; res.fiche = P.ficheVoiture;
      // 0→100 et pointe
      const placer = (x, z, yaw, v) => { P.pos.set(x0 + x, y0 + 1.05, z0 + z); P.yaw = yaw; P.vitesseVoiture = v; P.derive = 0; P.braquage = 0; P.vel.set(-Math.sin(yaw) * v, 0, -Math.cos(yaw) * v); };
      await enJeu(0.3);
      placer(0, 0.5, -Math.PI / 2, 0);
      P.touchMove.f = 1; P.touchMove.s = 0;
      let t100 = null, imgs = 0; const tw0 = performance.now();
      await enJeu(7, (c) => { imgs++; if (t100 === null && P.vitesseVoiture >= 27.78) t100 = c; });
      res.cadence = +(imgs / ((performance.now() - tw0) / 1000)).toFixed(1);
      res.fiche = P.ficheVoiture; res.boost = P.boost;
      res.t100 = t100 && +t100.toFixed(2); res.pointe7s = +P.vitesseVoiture.toFixed(1); res.x7s = +(P.pos.x - x0).toFixed(0);
      P.touchMove.f = 0;
      // freinage
      P.touchMove.f = -1; let tf = 0; await enJeu(6, (c) => { if (!tf && P.vitesseVoiture <= 0.5) tf = c; }); res.freinage = +tf.toFixed(2); P.touchMove.f = 0;
      // rayon à deux vitesses : gaz réglé pour tenir la vitesse, volant à fond à droite
      const rayon = async (v) => {
        placer(150, 0, -Math.PI / 2, v);
        P.touchMove.s = 1;
        const pts = [];
        const f = v / P.ficheVoiture.vmax;
        await enJeu(5, (c) => { P.touchMove.f = Math.min(1, f + (v - P.vitesseVoiture) * 0.2); if (c > 1.5) pts.push([P.pos.x, P.pos.z, P.vitesseVoiture, P.derive || 0]); });
        P.touchMove.s = 0; P.touchMove.f = 0;
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        const R = pts.reduce((a, p) => a + Math.hypot(p[0] - cx, p[1] - cz), 0) / pts.length;
        const der = Math.max(...pts.map((p) => Math.abs(p[3])));
        return { v, R: +R.toFixed(1), vMoy: +(pts.reduce((a, p) => a + p[2], 0) / pts.length).toFixed(1), deriveMax: +der.toFixed(3), theorie: +C.rayonDeVirage(v, P.ficheVoiture).toFixed(1), n: pts.length };
      };
      res.rayonLent = await rayon(6);
      res.rayonVite = await rayon(20);
      // mur rasant : un mur le long de x à z = 20, la voiture à 10° vers lui
      for (let x = 100; x <= 400; x++) for (let h = 1; h <= 3; h++) g.world.setBlock(x0 + x, y0 + h, z0 + 20, BLOCK.STONE);
      const ang = 12 * Math.PI / 180;
      placer(110, 15, -Math.PI / 2 - ang, 24);
      P.touchMove.f = 0.75; P.choc = null; const c0 = P.chocs || 0;
      let contact = null; const xs = [];
      await enJeu(2.5, (c) => { xs.push(P.pos.x - x0); if (!contact && (P.chocs || 0) > c0) contact = { t: +c.toFixed(2), v: +P.vitesseVoiture.toFixed(1), choc: P.choc }; });
      res.rasant = { contact, apres: { x: +(P.pos.x - x0).toFixed(1), z: +(P.pos.z - z0).toFixed(1), v: +P.vitesseVoiture.toFixed(1), yawDeg: +((P.yaw + Math.PI / 2) * 180 / Math.PI).toFixed(1) } };
      P.touchMove.f = 0;
      // mur de face : un mur en travers à x = 90, de z = -20 à 0
      for (let z = -30; z <= 0; z++) for (let h = 1; h <= 3; h++) g.world.setBlock(x0 + 90, y0 + h, z0 + z, BLOCK.STONE);
      placer(50, -12, -Math.PI / 2, 22);
      P.touchMove.f = 0; P.choc = null; const c1 = P.chocs || 0;
      let face = null;
      await enJeu(3, (c) => { if (!face && (P.chocs || 0) > c1) face = { t: +c.toFixed(2), vApres: +P.vitesseVoiture.toFixed(2), choc: P.choc }; });
      res.face = { face, x: +(P.pos.x - x0).toFixed(1), v: +P.vitesseVoiture.toFixed(2) };
      // panne
      placer(0, -40, -Math.PI / 2, 0);
      P.etatVoiture = { sante: 0, moteur: 0, direction: 0, enPanne: true, enFeu: false };
      P.touchMove.f = 1; await enJeu(2); res.panne = { v: +P.vitesseVoiture.toFixed(2), x: +(P.pos.x - x0).toFixed(1) };
      P.touchMove.f = 0; P.etatVoiture = undefined;
      return res;
    }, process.env.FLOTTE || 'koenigsegg-jesko.glb');
    console.log(JSON.stringify(out));
  } finally { await banc.fermer(); process.exit(0); }
})();
