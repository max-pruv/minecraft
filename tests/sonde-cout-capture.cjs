// SONDE — ce que coûte la capture de mouvement (personnages vivants) au fil
// principal, dans une rue de Paris : millisecondes d'animation par seconde,
// personnes animées, cadence, avec la capture puis avec la marche dessinée,
// en ordre alterné (ABBA). Isolée : aucune suite ne l'importe.
//     cd tests && node sonde-cout-capture.cjs [--rr=9]
const { Banc, dormir } = require('./banc.js');
const rr = +((process.argv.find((a) => a.startsWith('--rr=')) || '--rr=9').slice(5));
(async () => {
  const banc = new Banc({ portJeu: 8517, portPairs: 9517 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Cout', { rr, pret: true });
    await tab.evaluate(async () => {
      const g = window.__game;
      const { adresseParis } = await import('./src/paris.js');
      const [x, z] = adresseParis(-0.8, -0.9);
      g.player.pos.set(x + 0.5, g.world.terrainHeight(Math.floor(x), Math.floor(z)) + 1.01, z + 0.5);
    });
    await dormir(25000);
    const mesure = (capture) => tab.evaluate(async (capture) => {
      const H = await import('./src/humains.js');
      const g = window.__game;
      const gens = [];
      g.scene.traverse((o) => { if (o.userData && o.userData.rig) gens.push(o); });
      H.reglageCapture.actif = capture;
      for (const p of gens) {
        const u = p.userData;
        if (!capture && u.anim) { u.anim.mixer.stopAllAction(); u.anim = null; }
        if (capture && u.anim === null) u.anim = undefined;
      }
      await new Promise((r) => setTimeout(r, 2000));
      const ms0 = H.coutAnimation.ms, n0 = H.coutAnimation.appels, f0 = g.renderer.info.render.frame, t0 = performance.now();
      await new Promise((r) => setTimeout(r, 10000));
      const dt = (performance.now() - t0) / 1000;
      const mixers = gens.filter((p) => p.userData.anim && p.userData.anim.mixer).length;
      const visibles = gens.filter((p) => p.visible).length;
      return { capture, msParSeconde: +((H.coutAnimation.ms - ms0) / dt).toFixed(1), appelsParSeconde: Math.round((H.coutAnimation.appels - n0) / dt),
        usParAppel: +(1000 * (H.coutAnimation.ms - ms0) / Math.max(1, H.coutAnimation.appels - n0)).toFixed(1),
        images: +((g.renderer.info.render.frame - f0) / dt).toFixed(1), gens: gens.length, visibles, mixers };
    }, capture);
    for (const c of [true, false, false, true]) console.log(JSON.stringify(await mesure(c)));
  } finally { await banc.fermer(); process.exit(0); }
})();
