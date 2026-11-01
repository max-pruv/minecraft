// LES TRACES DE PNEUS, MODÈLE PAR MODÈLE (v579). Sans les placeholders, la
// voiture qu'on invoque est tirée parmi les modèles déposés ; un rouge de
// `monte.js` (la dérive : parcouru −0,7, la voiture arrêtée) ne disait pas
// lequel. On rejoue `mesurerTraces` avec chaque modèle forcé (`?voiture=`).
// Usage : node tests/sonde-traces-flotte.cjs [sous-chaîne,…]
const { Banc } = require('./banc.js');
const { mesurerTraces } = require('./traces-mesure.js');
(async () => {
  const banc = new Banc({ portJeu: 8433, portPairs: 9433 });
  await banc.ouvrir();
  try {
    const liste = process.argv[2] ? process.argv[2].split(',') : await (async () => {
      const p = await banc.joueur('SondeTF0', { rr: 2 });
      const l = await p.evaluate(async () => (await import('./src/vehicules.js')).FLOTTE.filter((f) => !f.horsRue && !f.police && !f.fabrique).map((f) => f.fichier.replace('.glb', '')));
      await p.close(); return l;
    })();
    let n = 0;
    for (const m of liste) {
      const p = await banc.jouerSeul(`SondeTF${++n}`, { rr: 2, params: `&voiture=${m}` });
      const r = await p.evaluate(`(${mesurerTraces.toString()})()`).catch((e) => ({ err: String(e) }));
      const d = r.derive || {}, f = r.frein || {};
      console.log(m.padEnd(34), JSON.stringify({ err: r.err, droit: r.droit && r.droit.parcouru, derive: d.parcouru, poseesD: d.posees, frein: f.v0, poseesF: f.posees }));
      await p.close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
