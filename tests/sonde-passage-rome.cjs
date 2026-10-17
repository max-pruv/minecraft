// LE PASSAGE PEINT DE ROME, REJOUÉ SEUL (v500) — le témoin de `monte.js`
// (« à Rome aussi, en biais, un passant traverse sur le passage peint ») lu
// TEL QUEL dans monte.js et joué N fois sur une page neuve, pour comparer une
// DISTRIBUTION des deux côtés (règle v269), pas un passage de chaque côté.
//
//     node tests/sonde-passage-rome.cjs [N]
const fs = require('fs');
const path = require('path');
const { Banc } = require('./banc.js');
const N = +process.argv[2] || 3;
const src = fs.readFileSync(path.join(__dirname, 'monte.js'), 'utf8');
const a = src.indexOf('const auPassageDans = (cle, biais) => tab.evaluate(');
const b = src.indexOf('}, { cle, biais });', a) + '}, { cle, biais });'.length;
(async () => {
  const banc = new Banc({ portJeu: 8417, portPairs: 9417 });
  await banc.ouvrir();
  try {
    for (let i = 0; i < N; i++) {
      const tab = await banc.jouerSeul(`Passant${i}`, { tactile: true });
      await tab.evaluate(() => { window.__game.edu.today().unlocks = 99; });
      // eslint-disable-next-line no-eval
      const auPassageDans = eval(src.slice(a, b).replace('const auPassageDans = ', ''));
      const r = await auPassageDans('rome', true);
      console.log(JSON.stringify({ passe: i, traversees: r.traversees, surPassage: r.surPassage, secondes: r.secondes, jeu: r.secondesDeJeu, err: r.err }));
      await tab.close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
