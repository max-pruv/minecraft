// SONDE (banc-intermittents) : combien de temps la préparation de l'accueil
// prend-elle VRAIMENT sur ce banc, quand on lui laisse le temps de finir ?
// Le témoin « vraiment là » de maj.js lit l'état à la libération, et la
// libération tombe sur la borne de 45 s (`BORNE_PREP`) dès que le banc rame :
// il faut savoir quelle pièce arrive quand (corps, programmes, carte).
const { Banc, dormir } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8462, portPairs: 9462 }); await banc.ouvrir();
  const borne = Number(process.env.BORNE || 180000);
  try {
    // VOISINES=n : n pages restées sur l'accueil, comme `tab` et `accueil` dans
    // maj.js (SW=1 : la première garde son service worker, comme `tab`) ;
    // ENJEU=1 : une partie qui tourne à côté (l'ancien `onglet`).
    const voisines = [];
    for (let v = 0; v < Number(process.env.VOISINES || 0); v++) voisines.push(await banc.joueur('Voisine' + v, v === 0 && process.env.SW ? { avecSW: process.env.SW !== 'prep', prep: process.env.SW !== 'sw' ? 1 : 0 } : {}));
    // GELER=1 : les voisines sont gelées le temps de la mesure (CDP)
    if (process.env.GELER) for (const v of voisines) await (await v.context().newCDPSession(v)).send('Page.setWebLifecycleState', { state: 'frozen' });
    if (process.env.ENJEU) await banc.jouerSeul('EnJeu');
    for (let k = 0; k < Number(process.env.N || 2); k++) {
      const p = await banc.joueur('Prep' + k, { prep: 1, params: `&prepms=${borne}` });
      const quand = {}; let e = null; const t0 = Date.now();
      while (Date.now() - t0 < borne + 20000) {
        e = await p.evaluate(() => window.__preparation && window.__preparation()).catch(() => null);
        if (e) {
          if (e.humains && !quand.corps) quand.corps = e.depuis;
          if (e.programmes >= e.aChauffer && !quand.programmes) quand.programmes = e.depuis;
          if (e.carte && !quand.carte) quand.carte = e.depuis;
          if (e.prete) break;
        }
        await dormir(500);
      }
      console.log(`passage ${k} : prête à ${e && e.depuis} ms`, JSON.stringify(quand), JSON.stringify(e));
      await p.close();
    }
  } catch (err) { console.log('ERREUR', err.message); } finally { process.exit(0); }
})();
