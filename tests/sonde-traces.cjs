// LES TRACES DE PNEUS (v434) — la mesure du témoin de `monte.js`, rejouée
// seule : sur la branche, et sur `origin/main` dans un arbre détaché (on y
// recopie ce fichier et `traces-mesure.js`). Elle imprime tous les chiffres,
// pas un verdict.
const { Banc, souffler } = require('./banc.js');
const { mesurerTraces } = require('./traces-mesure.js');

(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeTraces', { rr: 3 });
    const out = await page.evaluate(`(${mesurerTraces.toString()})()`);
    console.log(JSON.stringify(out, null, 1));
  } catch (e) { console.log('ÉCHEC', e.message); }
  finally { await banc.fermer(); process.exit(0); }
})();
