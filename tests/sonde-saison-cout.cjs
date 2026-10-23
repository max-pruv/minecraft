// LE COÛT DES EFFETS DE SAISON EN RENDU LOGICIEL (v505) : l'essaim dessiné
// contre caché (`material.visible`), au sol dans un champ, en ordre alterné
// (ABBA, v268). Elle imprime les cadences, pas un verdict.
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8395, portPairs: 9395 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeSaisonCout', { rr: 3, params: '&saison=' + (process.argv[2] || 'automne') });
    const out = await page.evaluate(async () => {
      const g = window.__game, m = g.saison.mesh;
      const tenir = (n) => new Promise((f) => { let c = 0, p = performance.now(); const s = (t) => { c += (t - p) / 1000; p = t; if (c >= n) f(); else requestAnimationFrame(s); }; requestAnimationFrame(s); });
      await tenir(4);
      const mesure = async (vis) => { m.material.visible = vis; await tenir(1); const f0 = g.renderer.info.render.frame, t0 = performance.now(); await tenir(5); return +((g.renderer.info.render.frame - f0) / ((performance.now() - t0) / 1000)).toFixed(2); };
      const r = { avec: [], sans: [], etat: g.saison.etat() };
      for (const v of [true, false, false, true, true, false]) r[v ? 'avec' : 'sans'].push(await mesure(v));
      m.material.visible = true;
      return r;
    });
    console.log(JSON.stringify(out));
  } catch (e) { console.log('ÉCHEC', e.message); }
  finally { await banc.fermer(); process.exit(0); }
})();
