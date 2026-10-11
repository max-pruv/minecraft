// LE COÛT DES TRACES DE PNEUS EN RENDU LOGICIEL (v434) : 480 traces devant la
// caméra, l'essaim visible contre caché, en ordre alterné (ABBA, v268). Elle
// imprime les cadences, pas un verdict.
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8399, portPairs: 9399 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeTracesCout', { rr: 3 });
    const out = await page.evaluate(async () => {
      const g = window.__game, T = await import('./src/traces.js'); T.reglageTraces.dessin = true;
      const tenir = (n) => new Promise((f) => { let c = 0, p = performance.now(); const s = (t) => { c += (t - p) / 1000; p = t; if (c >= n) f(); else requestAnimationFrame(s); }; requestAnimationFrame(s); });
      const P = g.player, x0 = Math.floor(P.pos.x), z0 = Math.floor(P.pos.z), y = P.pos.y;
      const faux = { userData: {}, rotation: { y: 0 }, position: { x: x0, z: z0 } }, suivi = {};
      for (let n = 0; n < 700; n++) { const k = n % 60; faux.position.x = x0 - 15 + (k < 30 ? k : 60 - k); faux.position.z = z0 - 8 - Math.floor(n / 60); T.marquerRoues(faux, suivi, 1, y); }
      P.yaw = 0; P.pitch = -0.5;
      let im = null; g.scene.traverse((o) => { if (o.name === 'traces-pneus') im = o; });
      const mesure = async (vis) => { im.visible = vis; await tenir(1); const f0 = g.renderer.info.render.frame, t0 = performance.now(); await tenir(5); return +((g.renderer.info.render.frame - f0) / ((performance.now() - t0) / 1000)).toFixed(2); };
      const r = { avec: [], sans: [], vivantes: T.etatTraces().vivantes };
      for (const v of [true, false, false, true, true, false]) r[v ? 'avec' : 'sans'].push(await mesure(v));
      return r;
    });
    console.log(JSON.stringify(out));
  } catch (e) { console.log('ÉCHEC', e.message); }
  finally { await banc.fermer(); process.exit(0); }
})();
