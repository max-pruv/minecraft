// LE SIGNE DE LA DÉRIVE DESSINÉE (v438) : au frein à main dans un virage à
// gauche, l'angle de la caisse RENDUE (matrice monde) contre la direction de la
// vitesse, et la dérive que la physique publie. Imprime les médianes.
const { Banc, souffler } = require('./banc.js');
const { mesurerDeriveDessinee } = require('./derive-mesure.js');
(async () => {
  const banc = new Banc({ portJeu: 8401, portPairs: 9401 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeDerive', { rr: 3 });
    console.log(JSON.stringify(await page.evaluate(`(${mesurerDeriveDessinee.toString()})()`)));
  } catch (e) { console.log('ÉCHEC', e.message); }
  finally { await banc.fermer(); process.exit(0); }
})();
