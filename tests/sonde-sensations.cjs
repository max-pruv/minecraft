// LES SENSATIONS AU VOLANT (v340) — la mesure du témoin de `monte.js`, rejouée
// seule : sur la branche, et sur `origin/main` dans un arbre détaché (on y
// recopie ce fichier et `sensations-mesure.js`). Elle imprime tous les
// chiffres, pas un verdict.
const { Banc, souffler } = require('./banc.js');
const { mesurerSensations } = require('./sensations-mesure.js');

(async () => {
  const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeSensations', { rr: 3 });
    const out = await page.evaluate(`(${mesurerSensations.toString()})()`);
    console.log(JSON.stringify(out, null, 1));
  } catch (e) { console.log('ÉCHEC', e.message); }
  finally { await banc.fermer(); process.exit(0); }
})();
