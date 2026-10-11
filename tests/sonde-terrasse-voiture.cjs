// UNE TERRASSE ARRÊTE LA VOITURE DE L'ENFANT (v436) — le témoin de
// `parishd.js`, joué seul sur une page de Paris (hd=2). La fonction est LUE
// dans parishd.js (v400) : une copie de sonde finit par diverger du témoin.
//   node tests/sonde-terrasse-voiture.cjs [chemin/vers/un/autre/arbre/tests]
const path = require('path'), fs = require('fs');
const dossier = path.resolve(process.argv[2] || __dirname);
const { Banc, souffler } = require(path.join(dossier, 'banc.js'));
const src = fs.readFileSync(path.join(__dirname, 'parishd.js'), 'utf8');
const marque = 'const auVolant = await tab.evaluate(';
const debut = src.indexOf(marque) + marque.length;
const fin = src.indexOf('});\n    // la voiture fait 4,4 blocs', debut);
const corps = src.slice(debut, fin + 1);
(async () => {
  const { adresseParis } = await import(path.join(dossier, '..', 'src', 'paris.js'));
  const [px, pz] = adresseParis(0.6, -0.3);
  const banc = new Banc({ portJeu: 8438, portPairs: 9438 });
  await banc.ouvrir();
  try {
    await souffler();
    const tab = await banc.jouerSeul('TerrasseVoiture', { rr: 6, params: '&hd=2' });
    await tab.evaluate(async ([x, z]) => {
      const g = window.__game;
      g.player.pos.set(x + 0.5, g.world.terrainHeight(x, z) + 2, z + 0.5); g.player.vel.set(0, 0, 0);
      await new Promise((f) => setTimeout(f, 30000));
    }, [px, pz]);
    const r = await tab.evaluate(eval(corps));
    console.log(JSON.stringify(r));
  } catch (e) { console.log('ERREUR', e.message); } finally { await banc.fermer(); process.exit(0); }
})();
