// SONDE (v389) : « un départ propre nettoie tout le monde » DANS les
// conditions de reseau.js — Nina a été gelée 25 s plus tôt. Quand elle ferme
// sa page, que voit l'hôte de son lien (nuage ? canal ouvert ? muet ?
// endormie ?), seconde par seconde, pendant 60 s ?
const { Banc, dormir, jusqua, nomsVus } = require('./banc.js');
const { servirLeNuage } = require('./nuage.js');
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  const nuage = await servirLeNuage(9721);
  try {
    for (let k = 0; k < Number(process.env.N || 2); k++) {
      const { p: hote, code } = await banc.creerMonde('Marlon' + k);
      const alice = await banc.rejoindre('Alice' + k, code);
      const nina = await banc.rejoindre('Nina' + k, code);
      await jusqua(async () => (await hote.evaluate(() => window.__game.net.presents().length)) === 2, 40000);
      const etat = () => hote.evaluate(() => {
        const net = window.__game.net; const out = [];
        for (const [id, c] of net.conns) if (/Nina/.test(c.name)) out.push({ nuage: !!(c.conn && c.conn.parNuage), canal: c.conn && c.conn.dataChannel ? c.conn.dataChannel.readyState : null,
          ouvert: c.conn ? !!c.conn.open : null, vivant: c.conn ? net.lienVivant(c.conn) : null, silence: c.seen ? Date.now() - c.seen : null, muet: !!c.muet, ice: c.conn && c.conn.peerConnection ? c.conn.peerConnection.iceConnectionState : null, pc: c.conn && c.conn.peerConnection ? c.conn.peerConnection.connectionState : null });
        return out;
      });
      if (!process.env.SANS_GEL) {
        await nina.evaluate((ms) => { setTimeout(() => { const t = Date.now(); while (Date.now() - t < ms) {} }, 0); }, 25000);
        await dormir(12000);
        console.log(`passage ${k} pendant le gel`, JSON.stringify(await etat()));
        await dormir(12000);
        await jusqua(async () => (await hote.evaluate(() => window.__game.net.presents().length)) === 2, 30000);
        await dormir(15000);
      }
      console.log(`passage ${k} avant`, JSON.stringify(await etat()));
      console.log(`  hôte, tous les liens`, JSON.stringify(await hote.evaluate(() => [...window.__game.net.conns].map(([id, c]) => [id.slice(-12), c.name, !!c.pret, c.seen ? Date.now() - c.seen : null, c.conn ? String(c.conn.peer).slice(-12) : null, !!(c.conn && c.conn.parNuage)]))));
      console.log(`  Nina est`, JSON.stringify(await nina.evaluate(() => { const n = window.__game.net; if (!n) return null; return { moi: n && n.peer ? n.peer.id.slice(-12) : null, liens: [...n.conns.keys()].map((k) => k.slice(-12)), tampons: [...n.conns.values()].map((c) => c.conn ? [c.conn.dataChannel ? c.conn.dataChannel.bufferedAmount : null, c.conn._buffer ? c.conn._buffer.length : null, c.conn.bufferSize ?? null, !!c.conn._buffering] : null), nuage: [...n.conns.values()].map((c) => !!(c.conn && c.conn.parNuage)) }; })));
      console.log(`  Nina voit`, JSON.stringify(await nina.evaluate(() => { const n = window.__game.net; return [...n.conns.values()].map((c) => ({ silence: c.seen ? Date.now() - c.seen : null, pos: !!n.posTimer, ice: c.conn && c.conn.peerConnection ? c.conn.peerConnection.iceConnectionState : null })); })));
      await nina.close();
      const t0 = Date.now(); let fin = null;
      for (let s = 0; s < 60; s += 5) {
        await dormir(5000);
        const e = await etat(); const vus = [await nomsVus(hote), await nomsVus(alice)];
        console.log(`  +${Math.round((Date.now() - t0) / 1000)} s`, JSON.stringify(e).slice(0, 200), JSON.stringify(vus));
        if (!e.length && !vus[1].some((n) => /Nina/.test(n))) { fin = Date.now() - t0; break; }
      }
      console.log(`passage ${k} : nettoyé ${fin === null ? 'NON en 60 s' : fin + ' ms'}`);
      await alice.close(); await hote.close();
    }
  } catch (e) { console.log("ERREUR", e.message); } finally { process.exit(0); }
})();
