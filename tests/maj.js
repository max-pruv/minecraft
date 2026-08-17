// Revenir dans l'application doit suffire à voir la nouveauté.
//
// CE QUI S'EST PASSÉ. La bibliothèque de monuments est partie en production en
// v159. Max a ouvert le jeu sur son iPad et n'a pas vu le bouton — alors que le
// serveur servait bien la bonne version, vérifiée à la main.
//
// La cause : le retour dans l'application appelait `reg.update()` et rien
// d'autre. Le service worker passait donc à la version neuve, le badge
// l'affichait, et LA PAGE CONTINUAIT DE FAIRE TOURNER L'ANCIEN JAVASCRIPT. Le
// rechargement n'avait lieu que dans le chemin du démarrage complet.
//
// Sur un iPad, l'application n'est jamais vraiment fermée : elle s'endort et
// revient. C'était donc le cas normal, pas le cas rare — et rien ne l'éprouvait.
//
//     cd tests && npm run maj

const { Banc, dormir, jusqua } = require('./banc.js');

// La veille d'un iPad, vue de la page : elle se déclare cachée, puis revient.
// On n'emprunte pas `endormir` du banc — il gèle aussi le réseau du jeu à
// plusieurs, qui n'existe pas dans une partie solo.
const cacher = (p) => p.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
});
const revenir = (p) => p.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
});

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

(async () => {
  const banc = new Banc({ portJeu: 8361, portPairs: 9361 });
  await banc.ouvrir();
  try {
    // Le service worker doit être VIVANT : c'est lui tout le sujet. Le banc le
    // débranche partout ailleurs, à raison — ici on le garde.
    const tab = await banc.joueur('Camille', { avecSW: true });
    await tab.evaluate(() => navigator.serviceWorker.ready);

    // Le service worker a pris la main : sans lui, rien de ce qui suit n'a de
    // sens — on éprouverait une page ordinaire, pas une application installée.
    const controle = await jusqua(async () => tab.evaluate(
      () => !!navigator.serviceWorker.controller), 30000);
    verifier('le service worker contrôle la page', controle);

    // On publie une version neuve PENDANT qu'il joue. C'est exactement ce qui
    // s'est passé : la livraison part alors que l'iPad est en veille.
    banc.jeu.publierVersion('web-minecraft-v999-essai');
    const vu = await tab.evaluate(async () => {
      const t = await (await fetch('./sw.js', { cache: 'no-store' })).text();
      return (t.match(/CACHE_VERSION\s*=\s*'([^']+)'/) || [])[1];
    });
    verifier('le serveur annonce bien une version neuve',
      vu === 'web-minecraft-v999-essai', vu);

    // Les deux versions que la page compare, lues comme elle les lit. Sans
    // cela, un témoin rouge ne dit pas SI la comparaison a eu lieu ni ce
    // qu'elle a vu — et on repart deviner.
    const versions = await tab.evaluate(async () => {
      const serveur = ((await (await fetch('./sw.js', { cache: 'no-store' })).text())
        .match(/CACHE_VERSION\s*=\s*'([^']+)'/) || [])[1] || null;
      const active = await new Promise((ok) => {
        const c = navigator.serviceWorker.controller;
        if (!c) return ok('(pas de contrôleur)');
        const ch = new MessageChannel();
        ch.port1.onmessage = (e) => ok(e.data && e.data.version);
        c.postMessage({ type: 'version' }, [ch.port2]);
        setTimeout(() => ok('(pas de réponse)'), 3000);
      });
      return { serveur, active };
    });
    console.log(`   🔎 la page compare : serveur=${versions.serveur} · active=${versions.active}`);
    verifier('la page sait lire les deux versions qu\'elle compare',
      !!versions.serveur && !!versions.active
      && !String(versions.active).startsWith('('), JSON.stringify(versions));

    // LE GESTE DE MAX : l'application s'endort, puis on y revient.
    //
    // On marque la page avant de l'endormir. Un rechargement efface la marque,
    // et rien d'autre ne le fait — c'est le témoin le moins discutable qui
    // soit, plus sûr qu'une horloge qu'on doit interpréter.
    await tab.evaluate(() => { window.__marqueAvantVeille = true; });
    await cacher(tab);
    await dormir(1500);
    await revenir(tab);
    await dormir(1500);
    const trace = await tab.evaluate(() => ({
      passages: window.__majVerif || 0, erreur: window.__majErreur || null,
      drapeau: sessionStorage.getItem('wm-updating'),
    })).catch(() => 'page partie');
    console.log(`   🔎 retour : ${JSON.stringify(trace)}`);

    // LE TÉMOIN QUI COMPTE : la marque a-t-elle disparu ?
    //
    // Première version de ce témoin : comparer `performance.now()` avant et
    // après, en supposant qu'un rechargement remet l'horloge à zéro. Il rendait
    // rouge alors que le correctif marchait — une heure passée à soupçonner le
    // code à cause d'une mesure. La marque, elle, ne s'interprète pas.
    const recharge = await jusqua(async () => (await tab.evaluate(
      () => !window.__marqueAvantVeille).catch(() => false)), 45000);
    verifier('revenir dans l\'application recharge sur la version neuve',
      recharge, recharge ? '' : 'la page tourne toujours sur l\'ancienne');

    // Et l'enfant n'est pas laissé devant un écran figé : le jeu revient.
    if (recharge) {
      const rejouable = await jusqua(async () => tab.evaluate(
        () => !!document.getElementById('play-btn')).catch(() => false), 45000);
      verifier('et le jeu se relance normalement après', rejouable);
    }

    verifier('aucune erreur JavaScript de bout en bout',
      tab.erreurs.length === 0, JSON.stringify(tab.erreurs.slice(0, 3)));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ une nouvelle version arrive jusqu\'à l\'enfant');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
