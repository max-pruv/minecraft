// QUELS PROGRAMMES SE COMPILENT EN ARRIVANT À PARIS ? Le témoin de monte.js
// ne publie qu'un compte (« neufs: 5 » pour une barre à 4) : cette sonde
// nomme chacun — le type de matériau et ses définitions — pour dire QUI les
// fait naître. Même geste que le témoin : page rr=6, programmes stables,
// téléportation à (P.x + 20, P.z − 30), vingt secondes.
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8404, portPairs: 9404 });
  await banc.ouvrir();
  try {
    await souffler();
    const tab = await banc.jouerSeul('SondeProg', { rr: 6 });
    const out = await tab.evaluate(async () => {
      const g = window.__game, info = g.renderer.info;
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      let n = info.programs.length, stable = 0;
      const t0 = performance.now();
      while (stable < 3 && performance.now() - t0 < 40000) {
        await dodo(1000);
        if (info.programs.length === n) stable++; else { stable = 0; n = info.programs.length; }
      }
      const avant = new Set(info.programs.map((p) => p.cacheKey));
      const { positionDe } = await import('./src/mondes.js');
      const P = positionDe('paris');
      window.__carte.surTeleport(P.x + 20, P.z - 30);
      await dodo(20000);
      const neufs = info.programs.filter((p) => !avant.has(p.cacheKey)).map((p) => {
        const k = p.cacheKey.split(',');
        return { nom: p.name, cle: k.slice(0, 60).join(',').slice(0, 400) };
      });
      // qui porte ces programmes dans la scène ?
      const qui = {};
      g.scene.traverse((o) => {
        if (!o.material) return;
        for (const m of [].concat(o.material)) {
          const prog = g.renderer.properties.get(m).currentProgram;
          if (prog && !avant.has(prog.cacheKey)) {
            let p = o, nom = '';
            for (let i = 0; i < 4 && p; i++, p = p.parent) nom += (p.name || p.type) + '<';
            qui[m.type + ' ' + nom] = (qui[m.type + ' ' + nom] || 0) + 1;
          }
        }
      });
      return { avant: avant.size, neufs, qui };
    });
    console.log(JSON.stringify({ avant: out.avant, neufs: out.neufs.length, noms: out.neufs.map((p) => p.nom + " " + p.cle.split(",").slice(-3, -1).join(",")), qui: out.qui }, null, 1));
    await tab.close();
  } finally { await banc.fermer(); process.exit(0); }
})();
