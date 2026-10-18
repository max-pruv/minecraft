// Sonde : en vol, où sont Sauter (monter) et Descendre ? À pied et en
// construction, aux deux tailles. Rejoue le relevé du témoin de maj.js.
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8371, portPairs: 9371 });
  await banc.ouvrir();
  for (const vue of [{ width: 420, height: 760 }, { width: 430, height: 932 }]) {
    const p = await banc.jouerSeul('Vol' + vue.width, { viewport: vue, tactile: true, rr: 2 });
    const r = await p.evaluate(async () => {
      const att = (ms) => new Promise((f) => setTimeout(f, ms));
      const g = window.__game, C = window.__commandes, P = g.player;
      const box = (id) => { const e = document.getElementById(id), st = getComputedStyle(e), b = e.getBoundingClientRect();
        return st.display === 'none' ? null : { x: Math.round(b.left), y: Math.round(b.top) }; };
      const enVol = async (oui) => { P.flying = oui; const t = performance.now();
        while (performance.now() - t < 8000 && document.body.classList.contains('en-vol') !== oui) await att(100); await att(200); };
      await enVol(true);
      const pied = { monter: box('jump-btn'), descendre: box('down-btn') };
      await enVol(false); C.construire(true); C.outil(true); await att(300); await enVol(true);
      const constr = { monter: box('jump-btn'), descendre: box('down-btn') };
      return { pied, constr };
    });
    console.log(vue.width, JSON.stringify(r));
    await p.close();
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
