// UN SERVICE WORKER VRAIMENT COINCÉ (dette de la v220).
//
// Les deux témoins écrits en v220 étaient verts des deux côtés : leur blocage
// finissait toujours par rendre la main (le délai d'en-têtes de node, puis
// l'échec de l'installation), si bien que l'ancien code s'en sortait SANS
// filet. Celui-ci ne rend jamais la main : le service worker publié porte un
// `install` dont la promesse ne se tient jamais. Le navigateur ne peut pas
// l'épuiser dans la fenêtre du filet — Chromium borne un événement à cinq
// minutes, le filet tire à quarante-cinq secondes.
//
// Ce qu'on mesure est un ÉTAT, pas une durée : la page a été rechargée, et
// elle tourne soit sous la version neuve, soit sur des fichiers repris au
// SERVEUR (on est reparti de zéro). Mesuré sur la v473, filet armé :
// rechargée à 45-48 s, `main.js` redemandé au serveur, l'installation
// toujours coincée. Filet désarmé : la page garde sa marque, le loader « 📦
// Mise à jour du jeu… 126 / 126 » reste à l'écran — indéfiniment.
//
// Et ce que la sonde a démenti : on s'attendait à ce que le retour suivant
// dans l'application rebloque l'enfant quarante-cinq secondes. Il n'en est
// rien — `register()` reste suspendu derrière l'installation coincée, donc la
// vérification au retour n'est même pas posée. Pas de second défaut.
//
// `maj.js` appelle `epreuve` telle quelle : une copie de sonde finit par
// diverger du témoin (v400).
//
//     cd tests && node sonde-sw-coince.cjs
const { Banc, dormir, jusqua } = require('./banc.js');

// Le banc réécrit `CACHE_VERSION` à la volée (`publierVersion`) : on y glisse
// un `install` qui ne finit jamais. La page lit la version par la même
// expression (`CACHE_VERSION = '…'`) et voit « web-minecraft-v998-coince ».
// Pas de `$` ici : la chaîne passe par un `String.replace`.
const ATTENDUE = 'web-minecraft-v998-coince';
const COINCE = `${ATTENDUE}'; self.addEventListener('install', (e) => e.waitUntil(new Promise(() => {}))); void '`;

const versionActive = (p) => p.evaluate(() => new Promise((ok) => {
  const c = navigator.serviceWorker.controller;
  if (!c) return ok(null);
  const ch = new MessageChannel();
  ch.port1.onmessage = (m) => ok(m.data && m.data.version);
  c.postMessage({ type: 'version' }, [ch.port2]);
  setTimeout(() => ok('(muet)'), 1500);
})).catch(() => '(page partie)');

async function epreuve(banc, prenom = 'Anatole') {
  banc.jeu.publierVersion(null); // la page s'installe sur la version du dépôt
  const p = await banc.joueur(prenom, { avecSW: true });
  try {
    await p.evaluate(() => navigator.serviceWorker.ready);
    const controle = await jusqua(async () => p.evaluate(() => !!navigator.serviceWorker.controller), 30000);
    const depart = await versionActive(p);
    banc.jeu.publierVersion(COINCE);
    const avant = banc.jeu.hits.length;
    await p.evaluate(() => {
      window.__marqueCoince = true;
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const t0 = Date.now();
    // Le filet tire à 45 s ; 80 s de borne, et la durée entre dans le message.
    const recharge = await jusqua(async () => p.evaluate(() => !window.__marqueCoince).catch(() => false), 80000);
    const msRecharge = Date.now() - t0;
    let jouable = false, active = null, installe = null, loader = null;
    if (recharge) {
      jouable = await jusqua(async () => p.evaluate(() => {
        const l = document.getElementById('boot-loader');
        return !!document.getElementById('play-btn') && !!l && l.classList.contains('hidden');
      }).catch(() => false), 45000);
      active = await versionActive(p);
      installe = await p.evaluate(() => Promise.race([
        navigator.serviceWorker.getRegistration().then((r) => !!(r && r.installing)),
        new Promise((ok) => setTimeout(() => ok('(file bloquée)'), 1500)),
      ])).catch(() => null);
    } else {
      loader = await p.evaluate(() => document.getElementById('boot-text').textContent).catch(() => null);
    }
    // L'installateur prend `main.js` une fois ; une seconde demande est celle
    // de la page rechargée, qui l'a donc reçu du serveur et non d'un cache.
    const mainServi = banc.jeu.hits.slice(avant).filter((u) => /^\/src\/main\.js(\?|$)/.test(u)).length;
    return { controle, depart, recharge, msRecharge, jouable, active, installe, mainServi, loader,
      erreurs: (p.erreurs || []).slice(0, 3) };
  } finally {
    banc.jeu.publierVersion(null);
    await p.close().catch(() => {});
  }
}

// Le verdict, partagé : rechargée, et sous la version neuve OU repartie des
// fichiers du serveur ; puis l'enfant peut jouer.
const juger = (m) => ({
  repart: m.recharge && (m.active === ATTENDUE || m.mainServi >= 2),
  jouable: m.recharge && m.jouable,
});

module.exports = { epreuve, juger, ATTENDUE };

if (require.main === module) {
  (async () => {
    const banc = new Banc({ portJeu: 8395, portPairs: 9395 });
    await banc.ouvrir();
    try {
      const m = await epreuve(banc);
      console.log(JSON.stringify(m), JSON.stringify(juger(m)));
    } finally { await banc.fermer(); process.exit(0); }
  })();
}
