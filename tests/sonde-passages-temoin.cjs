// Sonde (claude/temoins-intermittents) : rejoue N fois le témoin des passages
// peints de `monte.js` (« hors de Paris aussi… » à Kyoto, « à Rome aussi, en
// biais… »), en LISANT sa fonction dans monte.js (v400 : une copie de sonde
// finit par diverger du témoin), et imprime le détail de chaque traversée —
// ce qui sépare « pas sur le passage » de « poussé par un écart » ou « au feu ».
//     node tests/sonde-passages-temoin.cjs [kyoto|rome] [passes]
const fs = require('fs'), path = require('path');
const { Banc } = require('./banc.js');
const src = fs.readFileSync(path.join(__dirname, 'monte.js'), 'utf8');
const a = src.indexOf('const auPassageDans = (cle, biais) =>'), b = src.indexOf('}, { cle, biais });', a);
const corps = src.slice(a + 'const auPassageDans = '.length, b + '}, { cle, biais });'.length);
const fabrique = new Function('tab', `return ${corps};`);
(async () => {
  const ville = process.argv[2] || 'kyoto', passes = Number(process.argv[3] || 3);
  const banc = new Banc({ portJeu: 8473, portPairs: 9473 });
  await banc.ouvrir();
  try {
    for (let k = 0; k < passes; k++) {
      const tab = await banc.jouerSeul('Passage' + k, { rr: 2, pret: true });
      const r = await fabrique(tab)(ville, ville !== 'kyoto');
      console.log(JSON.stringify(r));
      await tab.close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
