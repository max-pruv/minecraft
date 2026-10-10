// À ROME, UN PASSANT TRAVERSE SUR LE PASSAGE EN BIAIS (v412) — le témoin de
// `monte.js`, joué seul. La fonction est LUE dans monte.js (v400).
//   node tests/sonde-passages-biais.cjs [ville] [chemin/vers/un/autre/arbre/tests]
const path = require('path'), fs = require('fs');
const cle = process.argv[2] || 'rome';
const dossier = path.resolve(process.argv[3] || __dirname);
const { Banc, souffler } = require(path.join(dossier, 'banc.js'));
const src = fs.readFileSync(path.join(__dirname, 'monte.js'), 'utf8');
const marque = 'const auPassageDans = (cle, biais) => tab.evaluate(';
const debut = src.indexOf(marque) + marque.length;
const fin = src.indexOf('}, { cle, biais });', debut);
const corps = src.slice(debut, fin + 1);
(async () => {
  const banc = new Banc({ portJeu: 8433, portPairs: 9433 });
  await banc.ouvrir();
  try {
    await souffler();
    const tab = await banc.jouerSeul('PassageBiais');
    const r = await tab.evaluate(eval(corps), { cle, biais: true });
    console.log(JSON.stringify(r));
  } catch (e) { console.log('ERREUR', e.message); } finally { await banc.fermer(); process.exit(0); }
})();
