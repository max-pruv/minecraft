// Sonde (banc, après la v547) : une page de jeu dont la voisine se charge reste-t-elle en
// jeu, et son canvas revient-il à sa taille ? `aLEcart` contre `mettreDeCote`.
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  try {
    const { p } = await banc.creerMonde('Sondeur');
    const etat = () => p.evaluate(() => { const c = window.__game.renderer.domElement;
      return { running: window.__game.running, verrou: document.pointerLockElement === c, canvas: c.width + 'x' + c.height }; });
    console.log('avant      ', JSON.stringify(await etat()));
    await banc.aLEcart(async () => { await new Promise((r) => setTimeout(r, 1500)); console.log('à l\'écart  ', JSON.stringify(await etat())); });
    console.log('après      ', JSON.stringify(await etat()));
    await banc.mettreDeCote(p); await banc.ramener(p); await new Promise((r) => setTimeout(r, 1000));
    console.log('fenêtre    ', JSON.stringify(await etat()), '(mettreDeCote : la pause)');
  } finally { await banc.fermer(); process.exit(0); }
})();
