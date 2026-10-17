// SONDE (v474) : « un hôte sans courtier est trouvé » rend parfois un monde
// JUMEAU (`hote: true`) chez l'invité. Piste écrite : le sondage du phare
// (`relaisHoteRecent`) n'a que trois secondes (`Promise.race`, net.js), et une
// requête lente rend « introuvable ». Mesuré au repos : 2,9 à 4,2 s, verdict
// « tenu » à chaque fois, et le plus long gel du fil principal de l'invité
// pendant ce temps (`trouMax`) dit pourquoi. On rejoue la scène du témoin N fois
// (l'hôte sans courtier, l'invité avec) et l'on chronomètre CHAQUE sondage de
// l'invité : durée, verdict, et l'issue (jumeau ou invité). CHARGE=1 brûle le
// fil principal de l'invité pendant qu'il frappe, comme une page qui prépare.
const { Banc, dormir, jusqua } = require('./banc.js');
const { servirLeNuage } = require('./nuage.js');
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  await servirLeNuage(9723);
  const N = Number(process.env.N || 4);
  try {
    for (let k = 0; k < N; k++) {
      const hote = await banc.joueurVers('Leo' + k, 9798, { portNuage: 9723 });
      await hote.evaluate(() => document.getElementById('online-btn').click());
      await dormir(400);
      await hote.evaluate(() => document.getElementById('host-btn').click());
      await jusqua(async () => hote.evaluate(() => !!(window.__game.net && window.__game.net.bus)), 60000);
      const code = await hote.evaluate(() => document.getElementById('room-code').textContent.trim());
      const inv = await banc.joueur('Basile' + k, { portNuage: 9723 });
      await inv.evaluate(async (charge) => {
        const { CloudSave } = await import('/src/cloud.js');
        const vrai = CloudSave.prototype.relaisHoteRecent;
        window.__sondages = [];
        CloudSave.prototype.relaisHoteRecent = async function (...a) {
          const t0 = performance.now();
          const r = await vrai.apply(this, a);
          window.__sondages.push({ ms: Math.round(performance.now() - t0), tenu: r });
          return r;
        };
        // le fil principal : le plus long trou entre deux tours de minuteur
        window.__trou = 0; let der = performance.now();
        const veille = () => { const n = performance.now(); window.__trou = Math.max(window.__trou, n - der); der = n; setTimeout(veille, 50); };
        veille();
        if (charge) { const fin = Date.now() + 15000; const brule = () => { const t = Date.now(); while (Date.now() - t < 400) {} if (Date.now() < fin) setTimeout(brule, 30); }; brule(); }
      }, !!process.env.CHARGE);
      await inv.evaluate(() => document.getElementById('online-btn').click());
      await dormir(400);
      await inv.evaluate((c) => { document.getElementById('join-code').value = c; document.getElementById('join-btn').click(); }, code);
      await jusqua(async () => inv.evaluate(() => {
        const t = (document.getElementById('online-status') || {}).textContent || '';
        return !/Ouverture du monde/.test(t) && (!!(window.__game.net && window.__game.net.active) || /❌/.test(t));
      }), 60000);
      await dormir(1500);
      const vu = await inv.evaluate(() => ({ sondages: window.__sondages, trouMax: Math.round(window.__trou),
        hote: window.__game.net ? window.__game.net.isHost : null,
        statut: (document.getElementById('online-status') || {}).textContent || '' }));
      console.log(`passage ${k} : ${JSON.stringify(vu)}`);
      await inv.close(); await hote.close();
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
