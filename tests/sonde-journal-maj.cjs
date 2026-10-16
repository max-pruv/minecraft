// UNE VRAIE MISE À JOUR COMPTE-T-ELLE COMME UN PLANTAGE ? (dette v413)
//
// `journal_appareil` montrait, juste après une mise à jour, des sessions
// « plantage » vides ; deux plantages de suite rangent le palier bas pour de
// bon (v296). La sonde de la v426 rechargeait la page à la main ; celle-ci
// rejoue la VRAIE mise à jour : le banc publie une CACHE_VERSION neuve, le
// service worker vivant l'installe, et c'est le jeu qui recharge
// (`reloadOnce`) : le geste de Max — l'application s'endort, revient, et
// recharge — puis le lancement suivant. On lit ce que la page neuve a compté
// (`plantagesAvant`, le compteur après la vérification des douteuses à 7 s),
// et la TRACE des fermetures de la page qui part (sessionStorage).
// Mesuré v454 : compteur 0 → 1, « plantage-precedent confirmé » ; la trace
// montrait `rouvrir()` APRÈS `fermer('mise-a-jour')` et `pagehide`. v455 : 0.
// Usage : node sonde-journal-maj.cjs
const { Banc, dormir, jusqua } = require('./banc.js');

const cacher = (p) => p.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
});
const revenir = (p) => p.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
});

async function mesurer({ portJeu = 8419, portPairs = 9419 } = {}) {
  const banc = new Banc({ portJeu, portPairs });
  await banc.ouvrir();
  const envois = [];
  const nav = [];
  const lire = (p) => p.evaluate(() => {
    const j = window.__journal, s = window.__rawStorage;
    return j ? { id: j.id, avant: j.doc.plantagesAvant, compteur: j.plantages(), douteuses: j.doc.douteuses || 0,
      sessions: Object.keys(JSON.parse(s.get('web-minecraft-session-ouverte-v1') || '{}')).length,
      evts: j.doc.evenements.filter((e) => /plantage|voisine/.test(e.type)) } : null;
  });
  // On marque la page ET l'on trace, dans sessionStorage (qui survit au
  // rechargement), chaque fermeture et réouverture de SA session.
  const marquer = (p) => jusqua(async () => p.evaluate(() => {
    window.__marque = true;
    const j = window.__journal, log = (m) => { try { const a = JSON.parse(sessionStorage.getItem('sonde-j') || '[]'); a.push(`${Math.round(performance.timeOrigin + performance.now()) % 100000} ${j.id} ${m}`); sessionStorage.setItem('sonde-j', JSON.stringify(a)); } catch {} };
    for (const f of ['fermer', 'rouvrir']) { const o = j[f].bind(j); j[f] = (...x) => { log(`${f}(${x[0] || ''}) ouvert=${j.ouvert}`); return o(...x); }; }
    window.addEventListener('pagehide', () => log('pagehide'));
    log('marque');
    return true;
  }).catch(() => false), 30000);
  const trace = (p) => p.evaluate(() => { const a = sessionStorage.getItem('sonde-j'); sessionStorage.removeItem('sonde-j'); return JSON.parse(a || '[]'); }).catch(() => []);
  const recharge = (p, ms) => jusqua(async () => p.evaluate(() => !window.__marque && !!window.__journal).catch(() => false), ms);
  const res = {};
  try {
    const p = await banc.joueur('Journalmaj', { avecSW: true, prep: 1 });
    const t0 = Date.now();
    p.on('framenavigated', (f) => { if (f === p.mainFrame()) nav.push(Math.round((Date.now() - t0) / 100) / 10); });
    p.on('console', (m) => { if (/\[journal\]/.test(m.text())) nav.push(m.text()); });
    p.context().on('request', (r) => {
      if (!/journal_appareil/.test(r.url()) || r.method() !== 'POST') return;
      try { const b = JSON.parse(r.postData() || 'null'); for (const x of [].concat(b || [])) envois.push(x.fin); } catch { envois.push('?'); }
    });
    await p.evaluate(() => navigator.serviceWorker.ready);
    await jusqua(async () => p.evaluate(() => !!navigator.serviceWorker.controller), 30000);
    const url = p.url();
    res.depart = await lire(p);

    // A — publiée pendant la partie, l'application s'endort et revient.
    banc.jeu.publierVersion('web-minecraft-v990-sondeA');
    await marquer(p);
    await cacher(p); await dormir(1500); await revenir(p);
    const a = await recharge(p, 60000);
    await dormir(9000);                       // les douteuses se tranchent à 7 s
    res.A = { recharge: a, ...(await lire(p)), trace: await trace(p), envois: [...envois], nav: nav.splice(0) };

    // Le lancement suivant, sans mise à jour : ce que le compteur garde.
    envois.length = 0;
    await p.goto(url, { waitUntil: 'load' });
    await jusqua(async () => p.evaluate(() => !!window.__journal).catch(() => false), 90000);
    await dormir(9000);
    res.suivant = { ...(await lire(p)), envois: [...envois], nav: nav.splice(0) };

  } catch (e) { res.echec = e.message; }
  await banc.fermer();
  return res;
}

module.exports = { mesurer };
if (require.main === module) {
  mesurer().then((r) => { console.log(JSON.stringify(r, null, 1)); process.exit(0); });
}
