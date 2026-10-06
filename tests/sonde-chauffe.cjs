// La chauffe de New York sur une page neuve (v372) : combien de temps pour
// ses 321 programmes. Usage : node sonde-chauffe.cjs <dossier tests>,
// alterné entre deux arbres pour comparer.
const { Banc, souffler } = require(require('path').join(process.argv[2], 'banc.js'));
(async () => {
  const banc = new Banc({ portJeu: 8336, portPairs: 9336 });
  await banc.ouvrir();
  for (let k = 0; k < 2; k++) {
    await souffler();
    const p = await banc.joueur('Chauffe' + k + Date.now()%1000, { rr: 6 });
    const r = await p.evaluate(async () => {
      const t0 = performance.now(); let f0 = window.__game?.renderer?.info.render.frame;
      while (performance.now() - t0 < 60000) {
        const c = window.__chauffeNY && window.__chauffeNY();
        if (!c || c.finie) return { ...(c||{}), ms: Math.round(performance.now() - t0) };
        await new Promise((f) => setTimeout(f, 250));
      }
      const v = window.__vehicules?.etat?.();
      return { expire: true, ...window.__chauffeNY(), convois: v ? (v.convois||v.circuits||[]).length : null };
    });
    console.log(process.argv[2].includes('main-ref') ? 'MAIN' : 'BRANCHE', JSON.stringify(r));
    await p.close().catch(()=>{});
  }
  await banc.fermer(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
