// LES MINUTEURS DE LA VRAIE VIE À CINQ IMAGES PAR SECONDE (v483) : la naissance
// des bêtes et le chronomètre de la course, mesurés par la MÊME fonction que le
// témoin de `monte.js` (`minuteurs-mesure.js`). Elle imprime, elle ne juge pas.
// `PASSES=3 node tests/sonde-minuteurs.cjs` rejoue la mesure sur des pages neuves.
const { Banc, souffler } = require('./banc.js');
const { mesurerMinuteurs } = require('./minuteurs-mesure.js');
(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    for (let i = 0; i < Number(process.env.PASSES || 1); i++) {
      await souffler();
      const page = await banc.jouerSeul('SondeMinuteurs' + i, { rr: 2 });
      console.log(JSON.stringify(await mesurerMinuteurs(page)));
      await page.close();
    }
  } catch (e) { console.log('ÉCHEC', e.message); }
  finally { await banc.fermer(); process.exit(0); }
})();
