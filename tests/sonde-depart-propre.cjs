// SONDE (v375) : « un départ propre nettoie tout le monde » — quand Nina
// ferme sa page, l'hôte reçoit-il le `close` de son lien, et quand ? La page
// de Nina dit-elle au revoir (pagehide → net.stop) ? On le fait N fois.
const { Banc, dormir, jusqua } = require('./banc.js');
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  try {
    const { p: hote, code } = await banc.creerMonde('Marlon');
    const alice = await banc.rejoindre('Alice', code);
    for (let k = 0; k < Number(process.env.N || 4); k++) {
      const nina = await banc.rejoindre('Nina' + k, code);
      await jusqua(async () => (await hote.evaluate(() => window.__game.net.presents().length)) === 2, 30000);
      await hote.evaluate(() => {
        const net = window.__game.net; window.__journalDepart = [];
        for (const [id, c] of net.conns) if (c.conn && !c.__espion && /Nina/.test(c.name)) {
          c.__espion = true; c.conn.on('close', () => window.__journalDepart.push(['close', Math.round(performance.now())]));
          window.__idNina = id;
        }
        window.__t0 = performance.now();
      });
      await nina.evaluate(() => { window.addEventListener('pagehide', () => { try { localStorage.setItem('sonde-pagehide', '1'); } catch {} }); });
      const t0 = Date.now();
      await nina.close();
      const fin = await jusqua(async () => (await hote.evaluate(() => window.__game.net.presents().length)) === 1
        && (await alice.evaluate(() => window.__game.net.presents().length)) === 1, 120000);
      const j = await hote.evaluate(() => ({ evts: window.__journalDepart.map(([e, t]) => [e, t - Math.round(window.__t0)]),
        encore: window.__game.net.conns.has(window.__idNina) }));
      console.log(`depart ${k}: nettoye ${fin} en ${Date.now() - t0} ms, hote ${JSON.stringify(j)}`);
    }
  } finally { process.exit(0); }
})();
