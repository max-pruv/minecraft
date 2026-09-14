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
const fs = require('fs');
const path = require('path');

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

    // LES CORPS RÉALISTES NE SE RE-TÉLÉCHARGENT PAS À CHAQUE VERSION (v245).
    // Huit mégaoctets immuables étaient dans la liste des ASSETS : chaque
    // livraison — c'est-à-dire chaque jour — les faisait reprendre en entier
    // sur l'iPad, et le premier lancement après une mise à jour se les
    // disputait avec la page. Ils vivent dans le cache immuable, comme le
    // scanner et la flotte : on en demande un, et c'est là qu'il doit être.
    const immuable = await tab.evaluate(async () => {
      const u = './vendor/humains/garcon.glb';
      const r = await fetch(u);
      const statique = await caches.open('web-minecraft-static-v1');
      return { ok: r.ok, octets: (await r.arrayBuffer()).byteLength,
        dansLImmuable: !!(await statique.match(new Request(u))) };
    });
    verifier('un corps réaliste demandé se range dans le cache immuable, pas dans celui de la version',
      immuable.ok && immuable.octets > 100000 && immuable.dansLImmuable, JSON.stringify(immuable));

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
    // L'INSTALLATION SE VOIT (v257). Pendant qu'on attend le rechargement, on
    // lit le loader dix fois par seconde : le service worker neuf annonce
    // chaque fichier rangé, et le texte doit porter un compte « n / total ».
    // Sur l'ancien code il ne dit qu'une phrase fixe.
    const textesLoader = new Set();
    let finSondage = false;
    const sondageLoader = (async () => {
      while (!finSondage) {
        const t = await tab.evaluate(() => {
          const l = document.getElementById('boot-loader');
          return l && !l.classList.contains('hidden') ? document.getElementById('boot-text').textContent : '';
        }).catch(() => '');
        if (t) textesLoader.add(t);
        await dormir(100);
      }
    })();
    const recharge = await jusqua(async () => (await tab.evaluate(
      () => !window.__marqueAvantVeille).catch(() => false)), 45000);
    finSondage = true; await sondageLoader;
    verifier('revenir dans l\'application recharge sur la version neuve',
      recharge, recharge ? '' : 'la page tourne toujours sur l\'ancienne');
    const avancement = [...textesLoader].filter((t) => /\d+ \/ \d+ fichiers/.test(t));
    verifier('pendant l\'installation, le loader dit combien de fichiers sont rangés',
      avancement.length > 0, `textes vus : ${JSON.stringify([...textesLoader].slice(0, 6))}`);

    // ET APRÈS LE RECHARGEMENT, LE LOADER RESTE JUSQU'À CE QUE LE JEU SOIT PRÊT
    // (v257) : à l'instant où il s'efface, les corps réalistes sont chargés et
    // les programmes chauffés. Sur l'ancien code il s'effaçait à la première
    // image, corps pas encore là — l'accueil « quasiment bloqué » de Max.
    if (recharge) {
      let aLEffacement = null;
      const textesApres = new Set();
      const debutAttente = Date.now();
      while (!aLEffacement && Date.now() - debutAttente < 120000) {
        const e = await tab.evaluate(async () => {
          const l = document.getElementById('boot-loader');
          if (!l) return null;
          const cache = l.classList.contains('hidden');
          let humains = null, programmes = null, aChauffer = null;
          try { humains = (await import('./src/humains.js')).humainsCharges(); } catch { /* ancien code */ }
          try { const v = await import('./src/vehicules.js'); programmes = v.programmesChauffes(); aChauffer = v.programmesAChauffer ? v.programmesAChauffer() : null; } catch { /* ancien code */ }
          return { cache, texte: document.getElementById('boot-text').textContent, humains, programmes, aChauffer };
        }).catch(() => null);
        if (e && !e.cache) textesApres.add(e.texte);
        if (e && e.cache) aLEffacement = e;
        await dormir(100);
      }
      console.log(`   🔎 loader après rechargement : ${JSON.stringify([...textesApres].slice(0, 3))} · à l'effacement ${JSON.stringify(aLEffacement)}`);
      verifier('après le rechargement, le loader ne s\'efface qu\'une fois les corps et les programmes prêts',
        !!aLEffacement && aLEffacement.humains === true && aLEffacement.programmes !== null
        && aLEffacement.aChauffer !== null && aLEffacement.programmes >= aLEffacement.aChauffer,
        JSON.stringify(aLEffacement));
      const rejouable = await jusqua(async () => tab.evaluate(
        () => !!document.getElementById('play-btn')).catch(() => false), 45000);
      verifier('et le jeu se relance normalement après', rejouable);
    }

    // LE PREMIER CHARGEMENT NE TÉLÉCHARGE PAS CE QUI NE SERT PAS À JOUER.
    //
    // Mesuré sur la production : 1,12 Mo compressés pour le jeu entier, et
    // 4,67 Mo pour le seul scanner de visages — quatre-vingts pour cent du
    // premier chargement. Il partait pendant que le monde s'engendre, parce
    // que `requestIdleCallback` rend la main dès que la boucle respire.
    //
    // On ÉPROUVE LE TRAJET DE L'ENFANT : il ouvre le jeu, il appuie sur
    // « Jouer », il joue. Pendant tout ce temps-là, aucun octet de scanner ne
    // doit passer sur le fil. On regarde les requêtes, pas une variable
    // interne — c'est la bande passante de la famille qui est en jeu.
    const onglet = await banc.joueur('Timothée');
    const scanner = [];
    onglet.on('request', (r) => {
      if (/\/vendor\/face/.test(r.url())) scanner.push(new URL(r.url()).pathname);
    });
    await onglet.evaluate(() => {
      window.__game.edu.today().libreJusqua = 86400;
      document.getElementById('play-btn').click();
    });
    await onglet.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    await dormir(25000);   // trois fois le répit du préchargement
    verifier('le premier chargement ne télécharge pas le scanner de visages pendant qu\'on joue',
      scanner.length === 0, scanner.length ? `${scanner.length} fichier(s) : ${scanner.slice(0, 3).join(', ')}` : '');

    // ET LE REMÈDE NE VA PAS TROP LOIN. Retirer le préchargement tout court
    // serait plus simple — et l'enfant qui touche « Reconnais-moi » depuis
    // l'accueil attendrait alors ses quatre mégaoctets et demi derrière une
    // barre de progression. Celui qui RESTE sur l'accueil doit donc l'obtenir
    // comme avant. Ce témoin-là est vert des deux côtés à dessein : c'est ce
    // qu'on ne veut pas casser, pas ce qu'on vient de réparer.
    const accueil = await banc.joueur('Bérénice');
    const surAccueil = [];
    accueil.on('request', (r) => {
      if (/\/vendor\/face/.test(r.url())) surAccueil.push(1);
    });
    await dormir(25000);   // on ne touche à rien : l'enfant lit l'accueil
    verifier('mais l\'enfant qui reste sur l\'accueil l\'obtient quand même',
      surAccueil.length > 0, `${surAccueil.length} requête(s)`);

    // --- le badge de version ouvre le journal des nouveautés (v254) --------
    //
    // Max : « quand l'utilisateur clique sur le logo de mise à jour, une
    // modale, qu'il peut fermer, pour voir tout ce qui est nouveau sur chaque
    // version ». Sur l'accueil de Bérénice : le badge, la modale, la version
    // installée en tête et marquée, une puce au moins, et la croix la ferme.
    // Sur l'ancien code il n'y a pas de modale : le témoin le dit, sans
    // s'effondrer.
    const journal = await accueil.evaluate(async () => {
      const badge = document.getElementById('app-version');
      const modale = document.getElementById('nouveautes-modale');
      if (!badge || !modale) return { badge: !!badge, modale: !!modale };
      // FERMÉE, LA MODALE NE COUVRE RIEN : `hidden` perd contre un
      // `display: flex` d'auteur, et le voile avalait tous les gestes du jeu
      // (portail de la v254 : la carte ne glissait plus). Ce qui fait foi,
      // c'est l'élément sous le doigt au milieu de l'écran.
      const sous = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      const voileAvant = getComputedStyle(modale).display !== 'none' || (sous && modale.contains(sous));
      badge.click();
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      for (let i = 0; i < 40 && !document.querySelector('#nouveautes-liste section'); i++) await dodo(250);
      const sections = [...document.querySelectorAll('#nouveautes-liste section')];
      const ouverte = !modale.hidden && getComputedStyle(modale).display !== 'none';
      const courante = document.querySelector('#nouveautes-liste section.courante');
      const res = { badge: true, modale: true, voileAvant, ouverte, sections: sections.length,
        premiere: sections[0] ? +sections[0].dataset.v : null,
        premierePuces: sections[0] ? sections[0].querySelectorAll('li').length : 0,
        marquee: courante ? +courante.dataset.v : null,
        versionBadge: +((badge.textContent.match(/v(\d+)/) || [])[1] || 0) };
      // Dans cette suite, le service worker finit sur la version fabriquée
      // « v999-essai » : le badge la porte, et le journal n'a pas d'entrée
      // pour elle — rien à marquer, c'est juste. On n'exige la marque que
      // quand le journal connaît la version du badge.
      res.entreePourBadge = !!document.querySelector(`#nouveautes-liste section[data-v="${res.versionBadge}"]`);
      document.getElementById('nouveautes-fermer').click();
      await dodo(100);
      res.fermee = modale.hidden;
      return res;
    });
    const versionServie = +((fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8').match(/CACHE_VERSION = 'web-minecraft-v(\d+)'/) || [])[1] || 0);
    verifier('le badge de version ouvre le journal des nouveautés, la version installée en tête, et la croix le ferme',
      journal.modale && !journal.voileAvant && journal.ouverte && journal.sections > 50 && journal.premiere === versionServie
        && journal.premierePuces >= 1 && (!journal.entreePourBadge || journal.marquee === journal.versionBadge) && journal.fermee,
      `${JSON.stringify(journal)} · version servie v${versionServie}`);
    // ET LE JOURNAL COUVRE TOUTES LES VERSIONS, EN QUELQUES MOTS. Lu sous
    // node, sans navigateur : chaque « ## vNNN » de CHANGELOG.md a son entrée,
    // chaque puce fait huit mots au plus, chaque titre six.
    let couverture;
    try {
      const { NOUVEAUTES } = await import(path.join(__dirname, '..', 'src', 'nouveautes.js'));
      const versions = [...fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8').matchAll(/^## v(\d+)/gm)].map((m) => +m[1]);
      const connues = new Set(NOUVEAUTES.map((n) => n.v));
      const manquantes = versions.filter((v) => !connues.has(v));
      const longues = NOUVEAUTES.flatMap((n) => n.puces.filter((p) => p.trim().split(/\s+/).length > 8).map((p) => `v${n.v}: ${p}`));
      const titresLongs = NOUVEAUTES.filter((n) => n.titre.trim().split(/\s+/).length > 6).map((n) => `v${n.v}`);
      const vides = NOUVEAUTES.filter((n) => !n.puces || !n.puces.length).map((n) => `v${n.v}`);
      couverture = { entrees: NOUVEAUTES.length, versions: versions.length, manquantes, longues, titresLongs, vides };
    } catch (e) { couverture = { erreur: String(e.message || e) }; }
    verifier('et il couvre toutes les versions du journal, en quelques mots par puce',
      !couverture.erreur && couverture.manquantes.length === 0 && couverture.longues.length === 0
        && couverture.titresLongs.length === 0 && couverture.vides.length === 0,
      JSON.stringify(couverture).slice(0, 400));

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
