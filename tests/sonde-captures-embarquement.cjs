// LA SÉQUENCE D'EMBARQUEMENT EN CAPTURES, MODÈLE PAR MODÈLE (vNEXT) : la
// voiture posée dans le couloir vide, « Monter », et une capture de l'écran
// à chaque phase (marche, ouverture, entrée, fermeture), puis assis. Rejouée
// dans un arbre d'`origin/main`, elle donne la planche d'avant.
// `node sonde-captures-embarquement.cjs <dossier> fichier1.glb,fichier2.glb`
const { Banc } = require('./banc.js');
const fs = require('fs');
const DOSSIER = process.argv[2] || '.';
const LISTE = (process.argv[3] || 'generique-suv.glb').split(',');
(async () => {
  const banc = new Banc({ portJeu: 8421, portPairs: 9421 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('SondeCapEmbarq', { embarq: 1 });
    await tab.evaluate(async () => {
      const g = window.__game;
      const x = 30000, z = 30000;
      g.player.pos.set(x, g.world.terrainHeight(x, z) + 1, z);
      await new Promise((r) => setTimeout(r, 4000));
    });
    for (const nom of LISTE) {
      const prep = await tab.evaluate(async (nom) => {
        const g = window.__game;
        const x = 30000, z = 30000;
        if (g.fun.montureConduite()) document.getElementById('ride-btn').click();
        await new Promise((r) => setTimeout(r, 300));
        g.player.pos.set(x, g.world.sommetColonne(x, z) + 1, z); g.player.vel.set(0, 0, 0); g.player.yaw = 0;
        for (const a of [...g.animalManager.animals]) { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
        const a = g.animalManager.invoquer('voiture', x + 3, z - 4, false, { flotte: nom });
        a.yaw = Math.PI / 2; a.mesh.rotation.y = a.yaw + Math.PI;
        for (let i = 0; i < 80 && !(a.mesh.userData.roues || []).length; i++) await new Promise((r) => setTimeout(r, 100));
        await new Promise((r) => setTimeout(r, 800));
        return { roues: (a.mesh.userData.roues || []).length };
      }, nom);
      await tab.evaluate(() => document.getElementById('ride-btn').click());
      const t0 = Date.now(); let vu = false; const pris = {};
      while (Date.now() - t0 < 30000) {
        const e = await tab.evaluate(() => {
          const g = window.__game; const em = g.player.embarquement;
          return { ph: em ? em.phase : '-', t: em ? em.t : 0, volant: !!g.fun.montureConduite() };
        });
        if (e.ph !== '-') vu = true;
        const cle = e.ph === 'entree' ? (e.t < 0.45 ? 'entree1' : 'entree2') : e.ph;
        if (e.ph !== '-' && !pris[cle]) { pris[cle] = 1; await tab.screenshot({ path: `${DOSSIER}/${nom.replace('.glb', '')}-${Object.keys(pris).length}-${cle}.png` }); }
        if (vu && e.ph === '-') break;
        await new Promise((r) => setTimeout(r, 60));
      }
      await new Promise((r) => setTimeout(r, 1200));
      await tab.screenshot({ path: `${DOSSIER}/${nom.replace('.glb', '')}-9-assis.png` });
      console.log(nom, JSON.stringify(prep), Object.keys(pris).join(' '));
    }
    console.log('erreurs', JSON.stringify(tab.erreurs.slice(0, 5)));
  } catch (e) { console.log('ÉCHEC', e && e.stack); } finally { await banc.fermer(); process.exit(0); }
})();
