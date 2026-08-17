// Jetable : le seul scénario du lien muet, isolé, avec un mouchard.
// Passe-t-il seul ? Alors c'est l'ordre ou la charge. Échoue-t-il seul ?
// Alors le jeu est en cause, et c'est mon code d'aujourd'hui.
const { Banc, vu, dormir, jusqua } = require('./banc.js');

(async () => {
  const banc = new Banc({ portJeu: 8336, portPairs: 9336 });
  await banc.ouvrir();
  try {
    const { p: muet2, code: codeMuet } = await banc.creerMonde('Iris');
    const jamais = await banc.joueur('Noé', { helloFragile: true });
    await jamais.bringToFront();
    await jamais.evaluate(() => { window.__avalerHelloSecondes = 600; });
    await jamais.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await jamais.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, codeMuet);
    await dormir(1500);
    await jamais.evaluate(() => document.getElementById('online-play-btn')?.click());

    const presentations = new Set();
    for (let i = 0; i < 24; i++) {
      await dormir(2500);
      const e = await jamais.evaluate(() => {
        const n = window.__game.net;
        return {
          actif: !!(n && n.active),
          conns: n ? [...n.conns.entries()].map(([k, c]) => [k.slice(0, 16), c.pret, c.presenteA || 0]) : [],
          avalees: window.__avalerHelloComptes || 0,
          lien: n ? n.linkState : null,
          bus: !!(n && n.bus),
        };
      });
      for (const [, , p] of e.conns) if (p) presentations.add(p);
      if (i % 4 === 0 || i === 23) {
        console.log(`+${(i + 1) * 2.5}s`, JSON.stringify(e), 'presentations=' + presentations.size);
      }
      if (presentations.size >= 2 && e.avalees >= 2) { console.log('OK au tour', i); break; }
    }
    const cote = await muet2.evaluate(() => {
      const n = window.__game.net;
      return {
        actif: !!(n && n.active), hote: n ? n.isHost : null,
        conns: n ? [...n.conns.entries()].map(([k, c]) => [k.slice(0, 16), c.pret]) : [],
      };
    });
    console.log('IRIS', JSON.stringify(cote));
    console.log('vu(Noé)', JSON.stringify(await vu(jamais)));
    console.log('erreurs Noé', JSON.stringify(jamais.erreurs.slice(0, 3)));
    console.log('erreurs Iris', JSON.stringify(muet2.erreurs.slice(0, 3)));
  } finally {
    await banc.fermer();
  }
  process.exit(0);
})().catch((e) => { console.error('💥', e); process.exit(2); });
