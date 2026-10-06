// SONDE (v393) : « un départ propre » quand le transport ne dit rien. On
// reproduit l'état relevé au portail (canal `open`, ICE `connected`, silence
// qui grimpe) : Nina part (`net.stop()`, comme `pagehide`) mais son
// RTCPeerConnection reste debout et sa page se fige — une tablette que iOS
// suspend au lieu de la tuer. Combien de temps l'hôte et Alice la gardent-ils ?
const { Banc, dormir, jusqua, nomsVus } = require('./banc.js');
const { servirLeNuage } = require('./nuage.js');
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  await servirLeNuage(9722);
  try {
    for (let k = 0; k < Number(process.env.N || 2); k++) {
      const { p: hote, code } = await banc.creerMonde('Marlon' + k);
      const alice = await banc.rejoindre('Alice' + k, code);
      const nina = await banc.rejoindre('Nina' + k, code);
      await jusqua(async () => (await hote.evaluate(() => window.__game.net.presents().length)) === 2
        && (await nomsVus(alice)).some((n) => /Nina/.test(n)), 40000);
      await nina.evaluate(() => {
        const n = window.__game.net;
        n.peer.destroy = () => {};                    // le transport reste debout
        for (const c of n.conns.values()) if (c.conn) c.conn.close = () => {};
        n.stop();                                     // ce que fait pagehide
        setTimeout(() => { const t = Date.now(); while (Date.now() - t < 70000) {} }, 50); // suspendue
      });
      const t0 = Date.now(); let fin = null;
      while (Date.now() - t0 < 60000) {
        await dormir(1000);
        const vus = [await nomsVus(hote), await nomsVus(alice)];
        if (!vus[0].some((n) => /Nina/.test(n)) && !vus[1].some((n) => /Nina/.test(n))) { fin = Date.now() - t0; break; }
      }
      console.log(`passage ${k} : nettoyé ${fin === null ? 'NON en 60 s' : fin + ' ms'}`);
      await nina.close().catch(() => {}); await alice.close(); await hote.close();
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
