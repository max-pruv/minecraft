// SONDE (v384) : le GPS d'un enfant proposé à son ami — sur deux pages.
const { Banc, dormir, jusqua } = require('./banc.js');
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  try {
    const { p: hote, code } = await banc.creerMonde('Marlon');
    const alice = await banc.rejoindre('Alice', code);
    await jusqua(async () => (await hote.evaluate(() => window.__game.net.presents().length)) === 1, 30000);
    const lieux = await alice.evaluate(async () => { const { positionDe } = await import('./src/mondes.js'); return { rome: positionDe('rome'), lyon: positionDe('lyon') }; });
    await alice.evaluate((l) => window.__carte.surGPS(l.x, l.z, 'Lyon'), lieux.lyon);
    await hote.evaluate((r) => window.__carte.surGPS(r.x, r.z, 'Rome'), lieux.rome);
    const t0 = Date.now();
    const ok = await jusqua(async () => !!(await alice.evaluate(() => window.__gpsAmi && window.__gpsAmi())), 20000);
    const p = await alice.evaluate(() => { const el = document.getElementById('gps-ami'); return { p: window.__gpsAmi && window.__gpsAmi(), vue: el && getComputedStyle(el).display, texte: el && el.textContent, gps: window.__gps() && window.__gps().nom }; });
    console.log('proposee', ok, Date.now() - t0, JSON.stringify(p));
    await alice.screenshot({ path: process.env.CAPTURE || '/tmp/gps-ami.png' });
    if (ok) await alice.evaluate(() => document.getElementById('gps-ami-oui').click());
    await dormir(300);
    console.log('apres', JSON.stringify(await alice.evaluate(() => ({ gps: window.__gps() && window.__gps().nom, reste: !!window.__gpsAmi() }))));
    console.log('fautes', JSON.stringify([hote.erreurs, alice.erreurs]));
  } finally { process.exit(0); }
})();
