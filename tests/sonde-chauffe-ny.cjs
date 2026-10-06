// LA CHAUFFE DE NEW YORK TOURNE-T-ELLE, ET À QUEL PRIX ? (v380)
//
// `monte.js` attend la chauffe de New York soixante secondes à l'accueil et la
// trouve expirée (44 à 163 sur 321) depuis des dizaines de versions, des deux
// côtés. Cette sonde ouvre la MÊME page (`banc.joueur`, rr 6), enveloppe
// `renderer.compile` et `renderer.render`, et relève chaque seconde : étapes
// faites, images de la page, temps passé dans compile et dans render, nombre
// de programmes. Elle dit donc si la chauffe tourne, ce que coûte une étape,
// et ce qui la ralentit (le budget par image, la cadence, ou le rendu).
// Usage : node sonde-chauffe-ny.cjs [secondes] [params]
const { Banc, souffler } = require('./banc.js');
const duree = Number(process.argv[2] || 90);
const params = process.argv[3] || '';
(async () => {
  const banc = new Banc({ portJeu: 8399, portPairs: 9399 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.joueur('Chauffine', { rr: 6, params });
    const r = await page.evaluate(async (duree) => {
      const g = window.__game, R = g.renderer;
      const t = { compile: 0, nc: 0, render: 0, nr: 0, rPetit: 0, nrPetit: 0 };
      const comp = R.compile.bind(R), rend = R.render.bind(R);

      R.compile = (...a) => { const t0 = performance.now(); try { return comp(...a); } finally { t.compile += performance.now() - t0; t.nc++; } };
      R.render = (...a) => {
        const t0 = performance.now();
        try { return rend(...a); } finally {
          const d = performance.now() - t0;
          const vp = R.getScissorTest();
          if (vp) { t.rPetit += d; t.nrPetit++; } else { t.render += d; t.nr++; }
        }
      };
      let images = 0; const tic = () => { images++; requestAnimationFrame(tic); }; requestAnimationFrame(tic);
      const rel = [];
      const t0 = performance.now();
      while (performance.now() - t0 < duree * 1000) {
        await new Promise((f) => setTimeout(f, 2000));
        const c = window.__chauffeNY();
        rel.push({ s: Math.round((performance.now() - t0) / 1000), faites: c.faites, total: c.total, finie: c.finie,
          images, prog: R.info.programs.length, compile: Math.round(t.compile), nc: t.nc,
          rendu: Math.round(t.render), nr: t.nr, rPetit: Math.round(t.rPetit), nrPetit: t.nrPetit,
          running: g.running, prete: window.__preparation().prete });
        if (c.finie) break;
      }
      return rel;
    }, duree);
    for (const l of r) console.log(JSON.stringify(l));
  } finally { await banc.fermer(); process.exit(0); }
})();
