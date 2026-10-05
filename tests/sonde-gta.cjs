// Sonde : joue SEULE la page « conduite à la GTA » de monte.js (v358, v375).
//     node tests/sonde-gta.cjs
const fs = require('fs');
const { Banc } = require('./banc.js');
(async () => {
  const s = fs.readFileSync(__dirname + '/monte.js', 'utf8');
  const i = s.indexOf("const gta = await pageGta.evaluate(") + "const gta = await pageGta.evaluate(".length;
  const j = s.indexOf("\n    await pageGta.close()", i);
  const corps = s.slice(i, j).replace(/\);\s*$/, '');
  const banc = new Banc({ portJeu: 8336, portPairs: 9336 });
  await banc.ouvrir();
  try {
    const page = await banc.jouerSeul('SondeGta', { tactile: true });
    const fn = eval(corps);
    const r = await page.evaluate(fn);
    console.log(JSON.stringify(r, null, 1));
  } finally { await banc.fermer(); process.exit(0); }
})().catch((e) => { console.error(e); process.exit(2); });
