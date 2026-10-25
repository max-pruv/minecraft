// LE PRIX DES AVIONS GARÉS (v565) — isolée : aucune suite ne l'importe.
// Au-dessus d'un aérodrome, on compte les appels de dessin avec et sans les
// appareils garés (cachés le temps d'un rendu), et l'on prend une capture.
//     cd tests && node sonde-appels-aeroport.cjs [cle=orly] [hauteur=70] [dossier]
const { Banc, dormir } = require('./banc.js');
const path = require('path');
const [cle = 'orly', haut = '70', dossier = '/tmp'] = process.argv.slice(2);
(async () => {
  const banc = new Banc({ portJeu: 8506, portPairs: 9506 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Appels', { tactile: true, viewport: { width: 820, height: 1180 }, rr: 9, params: '&ombres=1&hd=3', pret: true });
    const a = await tab.evaluate(async ([cle, haut]) => {
      const { AEROPORTS } = await import('./src/aeroport.js');
      const q = AEROPORTS.find((x) => x.cle === cle);
      const g = window.__game;
      g.player.flying = true;
      g.player.pos.set(q.x + 0.5, q.sol + Number(haut), q.z - 60.5); g.player.vel.set(0, 0, 0);
      g.player.yaw = Math.PI; g.player.pitch = -0.7;
      return q;
    }, [cle, haut]);
    await dormir(20000);
    const r = await tab.evaluate(() => {
      const g = window.__game, am = g.animalManager, R = g.renderer;
      const gares = am.animals.filter((b) => b.gare);
      const compte = () => { R.info.autoReset = false; R.info.reset(); R.render(g.scene, g.camera); const c = R.info.render.calls; R.info.autoReset = true; return c; };
      const avec = compte();
      for (const b of gares) b.mesh.visible = false;
      const sans = compte();
      for (const b of gares) b.mesh.visible = true;
      const modeles = {};
      for (const b of gares) { const k = b.mesh.userData.variante || b.def.key; modeles[k] = (modeles[k] || 0) + 1; }
      return { gares: gares.length, modeles, avec, sans, parAvion: +((avec - sans) / Math.max(1, gares.length)).toFixed(1) };
    });
    console.log(cle, JSON.stringify(r));
    await tab.screenshot({ path: path.join(dossier, `appels-${cle}.png`) });
  } finally { await banc.fermer().catch(() => {}); process.exit(0); }
})();
