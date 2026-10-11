// LES FAUX PLANTAGES DU JOURNAL DE BORD (v426) — ce qui sépare les cas.
//
// L'iPhone de la famille a rapporté des sessions « plantage » VIDES (aucun
// relevé, aucun événement) juste après une mise à jour, et une session
// déclarée plantée (ligne 82) qui a envoyé sa fermeture propre trois minutes
// plus tard (ligne 83). Deux hypothèses, deux bras :
//   A. un rechargement voulu par le jeu (`reloadOnce`) à divers instants du
//      démarrage laisse-t-il le drapeau ? — on recharge à T ms et l'on lit ce
//      que la page suivante a compté ;
//   B. deux pages sur le même stockage : la seconde déclare-t-elle la
//      première plantée alors qu'elle vit, et la page d'après lit-elle un
//      compteur périmé ?
// Usage : node sonde-journal-relance.cjs
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8417, portPairs: 9417 });
  await banc.ouvrir();
  const lire = (p) => p.evaluate(() => {
    const j = window.__journal;
    return j ? { avant: j.doc.plantagesAvant, compteur: j.plantages(), debut: j.doc.debut } : null;
  });
  try {
    const p = await banc.joueur('Relance', { params: '&apresmaj=1' });
    await p.waitForFunction(() => window.__journal, null, { timeout: 90000 });
    const url = p.url();
    console.log('départ', JSON.stringify(await lire(p)));
    // A — la relance du service worker, à divers instants après le chargement
    for (const t of [200, 600, 1200, 2500, 5000]) {
      await p.evaluate((ms) => setTimeout(() => location.reload(), ms), t).catch(() => {});
      await p.waitForTimeout(t + 300);
      await p.waitForFunction(() => window.__journal, null, { timeout: 90000 }).catch(() => {});
      await p.waitForTimeout(500);
      console.log(`A relance à ${t} ms →`, JSON.stringify(await lire(p).catch((e) => e.message)));
    }
    // A' — relance dès la navigation (avant même main.js)
    await p.goto(url, { waitUntil: 'commit' });
    await p.waitForTimeout(150);
    await p.reload({ waitUntil: 'load' });
    await p.waitForFunction(() => window.__journal, null, { timeout: 90000 });
    console.log('A\' relance pendant le chargement →', JSON.stringify(await lire(p)));
    // B — deux pages sur le même stockage
    const q = await p.context().newPage();
    await q.goto(url, { waitUntil: 'load' });
    await q.waitForFunction(() => window.__journal, null, { timeout: 90000 });
    console.log('B seconde page ouverte pendant que la première vit →', JSON.stringify(await lire(q)));
    await p.waitForTimeout(3000);
    console.log('ids', await p.evaluate(() => window.__journal.id), await q.evaluate(() => window.__journal.id));
    console.log('après dispatch, p :', JSON.stringify(await p.evaluate(() => { window.dispatchEvent(new Event('pagehide')); return { ouvert: window.__journal.ouvert, tab: window.__rawStorage.get('web-minecraft-session-ouverte-v1'), vis: document.visibilityState }; })));
    console.log('B la première dit au revoir ; stockage :', JSON.stringify(await q.evaluate(() => ({
      drapeau: window.__rawStorage.get('web-minecraft-session-ouverte-v1'), compteur: window.__rawStorage.get('web-minecraft-plantages-v1') }))));
    const r = await p.context().newPage();
    await q.waitForTimeout(3000);
    await r.goto(url, { waitUntil: 'load' });
    await r.waitForFunction(() => window.__journal, null, { timeout: 90000 });
    console.log('B troisième page, la seconde encore vivante →', JSON.stringify(await lire(r)));
    await p.close();
  } catch (e) { console.log('ÉCHEC', e.message); }
  await banc.fermer();
  process.exit(0);
})();
