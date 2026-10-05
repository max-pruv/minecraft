// SONDE (v370) — « un choix fait sur une tablette part au serveur », rouge
// aux portails de la v363 et vert seul. Elle distingue les cas que le témoin
// confond en un seul « fr » : le choix n'est JAMAIS PARTI (aucune écriture
// « en » de la tablette qui a cliqué), il est parti puis a été ÉCRASÉ (une
// écriture « fr » de l'autre tablette après lui), ou la tablette qui a cliqué
// est elle-même REVENUE à « fr ».
//
// Chaque écriture de `player_prefs` est relevée par page (page.route), avec
// son heure, sa langue et sa date de choix (`majProfil`) ; la valeur du
// serveur est relue toutes les 250 ms. `CHARGE=n` lance n boucles de calcul
// pour faire ce que le portail fait au banc : retarder les minuteurs.
//
//     cd tests && CHARGE=3 node sonde-reglages-deux.cjs
const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const { servirLeNuage } = require('./nuage.js');
const banc = require('./banc.js');

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const PORT_JEU = 8342, PORT_NUAGE = 9342;
  const nuage = await servirLeNuage(PORT_NUAGE);
  await banc.servirLeJeuPour(PORT_JEU);
  const charges = [];
  for (let i = 0; i < Number(process.env.CHARGE || 0); i++) {
    charges.push(spawn(process.execPath, ['-e', 'for(;;){}']));
  }
  const navigateur = await chromium.launch({
    executablePath: banc.trouverChromium(),
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const adresse = `http://127.0.0.1:${PORT_JEU}/index.html`
    + `?cloud=http://127.0.0.1:${PORT_NUAGE}&cloudkey=test&stay=1&rr=2&prep=0`;
  const t0 = Date.now();
  const journal = [];
  const note = (qui, quoi) => journal.push(`${String(((Date.now() - t0) / 1000).toFixed(2)).padStart(7)} s  ${qui.padEnd(7)} ${quoi}`);

  async function tablette(nom) {
    const ctx = await navigateur.newContext({ viewport: { width: 420, height: 760 } });
    const p = await ctx.newPage();
    await p.route('**/rest/v1/player_prefs**', async (route) => {
      const r = route.request();
      if (r.method() === 'GET' && /name=eq\.Marlon(&|$)/.test(r.url())) note(nom, 'LIT');
      if (r.method() === 'POST') {
        try {
          for (const l of JSON.parse(r.postData() || '[]')) {
            if (l.name === 'Marlon') note(nom, `ÉCRIT  lang=${l.prefs.lang} majProfil=${l.prefs.majProfil ? l.prefs.majProfil - t0 : 0}`);
          }
        } catch { /* rien */ }
      }
      route.continue();
    });
    await p.addInitScript(() => {
      localStorage.setItem('web-minecraft-profile-v1', JSON.stringify({ name: 'Marlon', lookIdx: 0 }));
      localStorage.setItem('wm-notif-propose', JSON.stringify({ n: 9, t: Date.now() }));
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('non'));
    });
    await p.goto(adresse, { waitUntil: 'load', timeout: 120000 });
    await p.waitForFunction(() => window.__game, null, { timeout: 120000 });
    note(nom, 'prête');
    return p;
  }

  nuage.poserReglages('Marlon', { lang: 'fr', grade: 3, majProfil: Date.now() - 60000 });
  let serveur = null;
  const guet = setInterval(() => {
    const v = (nuage.reglages('Marlon') || {}).lang;
    if (v !== serveur) { note('serveur', `→ ${v}`); serveur = v; }
  }, 250);

  const marlon = await tablette('Marlon');
  await dormir(8000);
  const autre = await tablette('autre');
  await dormir(2000);
  await marlon.evaluate(() => document.querySelector('.pb-toggle[data-lang="en"]').click());
  note('Marlon', `CLIC en (local ${await marlon.evaluate(() => window.__game.edu.__prefs().lang)})`);
  const local = async (p) => { try { return await p.evaluate(() => window.__game.edu.__prefs().lang); } catch { return '?'; } };
  for (let i = 0; i < 26; i++) {
    await dormir(2500);
    note('locales', `Marlon=${await local(marlon)} autre=${await local(autre)}`);
  }
  clearInterval(guet);
  console.log(journal.join('\n'));
  for (const c of charges) c.kill();
  await navigateur.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
