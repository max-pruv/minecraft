// UN ÉCART NE FAIT PAS TRAVERSER LA RUE (v405) — le témoin de `monte.js`, joué
// seul sur une page de Rome. La fonction est LUE dans monte.js, pas recopiée
// (une copie de sonde finit par diverger du témoin, v400).
//   node tests/sonde-ecart-trottoir-page.cjs [chemin/vers/un/autre/arbre/tests]
const path = require('path'), fs = require('fs');
const dossier = path.resolve(process.argv[2] || __dirname);
const { Banc, souffler } = require(path.join(dossier, 'banc.js'));
const src = fs.readFileSync(path.join(__dirname, 'monte.js'), 'utf8');
const debut = src.indexOf('const ecartTrottoir = await tab.evaluate(') + 'const ecartTrottoir = await tab.evaluate('.length;
const fin = src.indexOf("});\n    verifier('un passant du trottoir", debut);
const corps = src.slice(debut, fin + 1);
(async () => {
  const banc = new Banc({ portJeu: 8431, portPairs: 9431 });
  await banc.ouvrir();
  try {
    await souffler();
    const tab = await banc.jouerSeul('EcartBord');
    await tab.evaluate(async () => {
      const g = window.__game;
      const { positionDe } = await import('./src/mondes.js');
      const p = positionDe('rome');
      g.player.flying = true;
      g.player.pos.set(p.x, g.world.terrainHeight(p.x, p.z) + 6, p.z);
      g.player.vel.set(0, 0, 0);
      await new Promise((f) => setTimeout(f, 16000));
    });
    const r = await tab.evaluate(eval(corps));
    console.log(JSON.stringify(r));
  } catch (e) { console.log('ERREUR', e.message); } finally { await banc.fermer(); process.exit(0); }
})();
