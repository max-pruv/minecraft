// SONDE (banc-intermittents) : que coûte une page restée sur l'accueil, et
// le gel CDP (`Page.setWebLifecycleState`) la rend-il gratuite ? On lit
// l'occupation réelle des cœurs (charge.js, /proc/stat) avec deux voisines
// actives, gelées, puis fermées.
const { Banc, dormir } = require('./banc.js');
const { occupation } = require('./charge.js');
(async () => {
  const banc = new Banc({ portJeu: 8466, portPairs: 9466 }); await banc.ouvrir();
  try {
    const mesurer = async (nom) => { const o = []; for (let i = 0; i < 4; i++) o.push(await occupation(1000)); console.log(nom.padEnd(22), o.map((x) => x.toFixed(2)).join(' · ')); };
    await mesurer('aucune page');
    const vs = [await banc.joueur('V0'), await banc.joueur('V1')];
    await dormir(8000); await mesurer('deux voisines');
    const cdps = await Promise.all(vs.map((v) => v.context().newCDPSession(v)));
    for (const c of cdps) await c.send('Page.setWebLifecycleState', { state: 'frozen' });
    await dormir(2000); await mesurer('deux voisines gelées');
    for (const c of cdps) await c.send('Page.setWebLifecycleState', { state: 'active' });
    await dormir(3000); await mesurer('dégelées');
    const rafs = await vs[0].evaluate(() => new Promise((r) => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
    console.log('images/s d\'une voisine', rafs);
    for (const v of vs) await v.close();
    await dormir(2000); await mesurer('fermées');
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
