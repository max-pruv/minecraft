// QUELLE GRANDEUR LE PALIER LIT-IL, ET QUE VAUT-ELLE AU BANC ? (v290)
//
// La v284 classait l'appareil sur `now - lastTime` — la PÉRIODE entre deux
// images. Sur l'iPad de Max, synchronisé à son écran, elle vaut 17,0 ms pour
// 59 i/s, c'est-à-dire 1000/59 : la barre `> 16,7` le renvoyait en `bas` et la
// barre `≤ 8` mettait `haut` hors de portée.
//
// Cette sonde relève les DEUX médianes côte à côte — période et travail — pour
// savoir ce qu'un témoin peut prouver ICI : si le banc n'est pas synchronisé,
// les deux se confondent et aucun témoin de banc ne peut voir la différence ;
// s'il l'est, elles se séparent et c'est mesurable.
const { Banc, souffler } = require('./banc.js');

(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondePalier', { rr: 2, params: '&palierms=8000' });
    const r = await page.evaluate(async () => {
      const dodo = (ms) => new Promise((x) => setTimeout(x, ms));
      const depart = performance.now();
      while (performance.now() - depart < 20000) {
        const m = window.__game && window.__game.mesurePalier;
        if (m && m.range) break;
        await dodo(250);
      }
      const m = window.__game.mesurePalier;
      const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
      const info = window.__game.renderer.info;
      return {
        periode: med(m.images), travail: med(m.travaux),
        nPeriode: m.images.length, nTravail: m.travaux.length,
        morceau: med(m.morceaux), nMorceau: m.morceaux.length,
        verdict: m.verdict || null,
        appels: info.render.calls,
        applique: window.__game.palierApplique ? window.__game.palierApplique() : null,
      };
    });
    console.log(JSON.stringify(r, null, 1));
  } finally { await banc.fermer(); }
  process.exit(0);
})();
