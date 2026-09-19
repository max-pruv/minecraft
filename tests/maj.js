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
    // `prep: 1` (v258) : le geste de Max se fait sur l'accueil, pendant que
    // le jeu SE PRÉPARE — corps, programmes, monde et cartes. La mise à jour
    // doit passer au travers ; sans préparation elle ne mesurerait pas le
    // trajet de l'enfant.
    const tab = await banc.joueur('Camille', { avecSW: true, prep: 1 });
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

    // --- le jeu se prépare AVANT « Jouer », et le bouton attend (v258) --------
    //
    // Max : « ne devrait-il pas y avoir le temps de télécharger tous les
    // fichiers nécessaires avant de permettre à l'utilisateur de démarrer le
    // jeu, pour éviter une expérience de lag ? » Ce qui lague au début n'est
    // pas un fichier mais ce qui se calcule au premier usage : les corps, les
    // programmes, le fond de la carte. La page se prépare derrière l'accueil,
    // une ligne dit où elle en est, et « Jouer » reste grisé jusque-là. On
    // ÉPROUVE LE TRAJET DE L'ENFANT : il ouvre le jeu, le bouton attend, la
    // ligne compte, et quand le bouton se libère tout est vraiment prêt. Sur
    // l'ancien code, le bouton n'attend jamais et la ligne n'existe pas.
    // (`prep: 1` : le banc demande d'ordinaire `?prep=0`.)
    const prune = await banc.joueur('Prune', { prep: 1 });
    const debutPrep = Date.now();
    let premier = null, liberation = null, tours = 0;
    const lignes = new Set();
    const floutesEnPreparant = new Set();
    while (!liberation && Date.now() - debutPrep < 60000) {
      const e = await prune.evaluate(() => {
        const b = document.getElementById('play-btn');
        const l = document.getElementById('prep-line');
        // LE VERRE DÉPOLI PENDANT LA PRÉPARATION, C'EST DES IMAGES EN MOINS.
        // Un `backdrop-filter` est un calque que le navigateur relit et
        // refloute ; mesuré, il coûte la moitié des images de l'accueil, et ce
        // sont celles dont la chauffe des programmes (une compilation par
        // image, v246) et le fond de carte ont besoin. On ne compte que les
        // quelques éléments qui portent le verre : parcourir la page entière à
        // chaque tour, c'est le témoin qui ralentirait la page qu'il mesure.
        const PORTEURS = ['#who-screen', '#play-btn', '#app-version',
          '#overlay .controls', '#profile-menu', '#online-menu'];
        const flous = PORTEURS.filter((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const f = getComputedStyle(el);
          const v = f.backdropFilter || f.webkitBackdropFilter || 'none';
          return v !== 'none' && v !== '';
        });
        return { grise: !!(b && b.disabled), ligne: l ? l.textContent : null,
          flous, prepare: document.body.classList.contains('prepare'),
          prep: window.__preparation ? window.__preparation() : null };
      }).catch(() => null);
      if (e) {
        if (!premier) premier = e;
        if (e.ligne) lignes.add(e.ligne);
        if (e.grise) { for (const f of e.flous) floutesEnPreparant.add(f); tours++; }
        if (!e.grise) liberation = { ...e, apres: Date.now() - debutPrep };
      }
      await dormir(100);
    }
    console.log(`   🔎 préparation : ${[...lignes].slice(0, 3).join(' | ')} · libération ${JSON.stringify(liberation)}`);
    verifier('avant « Jouer », le bouton attend que le jeu soit prêt, et une ligne dit ce qu\'il prépare',
      !!premier && premier.grise === true && /Préparation/.test(premier.ligne || '') && /\d+\/\d+/.test(premier.ligne || ''),
      JSON.stringify(premier));
    // DEUX HORLOGES, ET LA BORNE APPARTENAIT À L'AUTRE (v276).
    //
    // Ce verdict exigeait `liberation.apres < 45000`. Or `apres` est l'horloge
    // du BANC — elle part avant `banc.joueur()`, donc elle compte aussi
    // l'ouverture de la page — tandis que les quarante-cinq secondes sont la
    // borne que la PAGE s'applique à elle-même, comptée depuis `departPrep`.
    // Mesuré au portail : `depuis` 43 761 ms (donc en deçà de sa propre borne,
    // tout était là) pour `apres` 47 710. Le témoin rougissait en comparant une
    // horloge à la borne de l'autre.
    //
    // Et la durée n'a rien à faire dans le verdict, parce que ce n'est pas ce
    // qu'il annonce : ce qu'il annonce, c'est qu'AU MOMENT où le bouton se
    // libère, tout est vraiment là. Si la page se libérait à sa borne en ayant
    // fini, l'enfant n'y perdrait rien ; si elle se libérait sans avoir fini,
    // c'est l'état qui le dit — c'est ce qui s'est passé, deux fois, et l'état
    // l'a vu (8 programmes sur 25, fond de carte absent). La durée reste dans
    // le MESSAGE, où elle sert à démonter un rouge, jamais à en faire un.
    verifier('et quand il se libère, corps, programmes et fond de carte sont vraiment là',
      !!liberation && !!liberation.prep && liberation.prep.humains === true
      && liberation.prep.programmes >= liberation.prep.aChauffer && liberation.prep.carte === true,
      JSON.stringify(liberation));
    // PENDANT QU'IL PRÉPARE, IL NE FLOUTE RIEN — ET UNE FOIS PRÊT, SI.
    //
    // Ce témoin est vert sur `origin/main` par une autre raison qu'ici : là-bas
    // il n'y a pas de verre du tout. Il est gardé quand même, et la règle de la
    // v220 dit laquelle : il garde une CAPACITÉ qu'on vient de frôler, et que
    // les passes de rebranding suivantes — qui posent du verre sur les
    // Réglages, le journal, le HUD — frôleront encore. Vérifié rouge en
    // désarmant la suspension : « floutés en préparant: #who-screen, #play-btn,
    // #app-version, #overlay .controls ».
    verifier('et pendant qu\'il prépare, la page ne floute rien — les images vont au jeu',
      tours >= 3 && floutesEnPreparant.size === 0
      && !!liberation && liberation.prepare === false && liberation.flous.length > 0,
      `${tours} relevé(s) grisés · floutés en préparant : ${[...floutesEnPreparant].join(', ') || 'aucun'}`
      + ` · à la libération : ${liberation ? liberation.flous.join(', ') : '?'}`);
    await prune.evaluate(() => { window.__game.edu.today().libreJusqua = 86400; document.getElementById('play-btn').click(); });
    const lance = await prune.waitForFunction(() => window.__game.running, null, { timeout: 30000 }).then(() => true).catch(() => false);
    verifier('et « Jouer » lance bien la partie une fois libéré', lance);
    await prune.close();

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

    // ================= GRAND TOUR (v275) ====================================
    //
    // Max a validé le nom et le logo. Le jeu s'appelle Grand Tour : l'onglet,
    // l'accueil, le manifeste et les icônes le disent.
    //
    // ET LE NOM SE DIT UNE FOIS. `index.html` porte la valeur de départ dans
    // son `<h1>`, mais `main.js` la RÉÉCRIVAIT en dur à deux endroits — au
    // « Reprendre » d'une pause et au retour au menu principal. Le témoin ne
    // lit donc pas le titre au chargement, ce qui ne prouverait rien : il
    // revient au menu et RELIT. Sur l'ancien code le titre reprend l'ancien
    // nom à cet instant précis, l'onglet disant déjà le nouveau.
    const nom = await tab.evaluate(async () => {
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      const lire = () => (document.getElementById('overlay-title') || {}).textContent || '';
      const depart = lire().trim();
      // on entre en jeu, on met en pause, on revient au menu — le chemin qui
      // réécrivait le titre
      const jouer = document.getElementById('play-btn');
      if (jouer && !jouer.disabled) { jouer.click(); await dodo(2500); }
      // 🏠 est le trajet de l'enfant vers le menu (`home-btn` → `leaveToMainMenu`),
      // et c'est là que le titre était réécrit en dur.
      const maison = document.getElementById('home-btn');
      if (maison) { maison.click(); await dodo(1200); }
      return { depart, apresRetour: lire().trim(), titreOnglet: document.title,
        bouton: !!maison };
    });
    verifier('l\'accueil porte le nom du jeu, et il le garde en revenant au menu',
      nom.depart === 'GRAND TOUR' && nom.titreOnglet === 'Grand Tour'
        && (!nom.bouton || nom.apresRetour === 'GRAND TOUR'),
      JSON.stringify(nom));

    // LE MANIFESTE ET LES ICÔNES. C'est lui qui donne son nom et son image à
    // l'application posée sur l'écran d'accueil de l'iPad — le seul endroit où
    // le nom se voit quand le jeu est fermé. Et les trois PNG sont RENDUS
    // depuis `icone.svg` : on vérifie que les quatre fichiers arrivent et
    // pèsent quelque chose, pas seulement que le manifeste les cite.
    const marque = await tab.evaluate(async () => {
      const m = await (await fetch('./manifest.webmanifest')).json();
      const fichiers = {};
      for (const f of ['icone.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) {
        try {
          const r = await fetch('./' + f);
          fichiers[f] = r.ok ? (await r.blob()).size : 0;
        } catch { fichiers[f] = 0; }
      }
      return { nom: m.name, court: m.short_name, langue: m.lang, icones: (m.icons || []).length, fichiers };
    });
    verifier('le manifeste et les quatre icônes portent Grand Tour',
      marque.nom === 'Grand Tour' && marque.court === 'Grand Tour' && marque.langue === 'fr'
        && marque.icones >= 3
        && Object.values(marque.fichiers).every((o) => o > 1000),
      JSON.stringify(marque));

    // ET LES MONDES DES ENFANTS NE BOUGENT PAS D'UN OCTET.
    //
    // C'est la règle de ce rebranding, et elle vaut plus que le nom : sur les
    // soixante-dix-neuf mentions de l'ancien nom dans le code, la grande
    // majorité ne sont pas du nom affiché — ce sont les CLÉS qui portent les
    // données (`web-minecraft-worlds-v1`, `web-minecraft-edits-v3`, leurs
    // blocs ; `-pos-`, `-photos-`, `-records-`). Les renommer effacerait les
    // mondes de Marlon et d'Alice, et `web-minecraft-static-v1` ferait
    // re-télécharger treize mégaoctets à chaque iPad pour un nom que personne
    // ne voit. On renomme ce que l'enfant VOIT, jamais ce qui porte ses
    // données.
    //
    // Ce témoin est VERT DES DEUX CÔTÉS à dessein — comme le second témoin de
    // cette suite (v220) : il ne garde pas une correction, il garde une
    // capacité qu'on vient de frôler, et que la prochaine passe de
    // rebranding frôlera encore.
    let cles;
    try {
      const dir = path.join(__dirname, '..', 'src');
      const vus = new Set();
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.js')) continue;
        for (const m of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/['"`](web-minecraft-[a-z0-9-]+)['"`]/g)) vus.add(m[1]);
      }
      const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
      cles = { stockage: vus.size,
        essentielles: ['web-minecraft-worlds-v1', 'web-minecraft-edits-v3', 'web-minecraft-pos-v1',
          'web-minecraft-photos-v1', 'web-minecraft-profile-v1'].filter((k) => !vus.has(k)),
        cacheImmuable: /web-minecraft-static-v1/.test(sw) };
    } catch (e) { cles = { erreur: String(e.message || e) }; }
    verifier('et les clés qui portent les mondes des enfants n\'ont pas bougé',
      !cles.erreur && cles.stockage >= 25 && cles.essentielles.length === 0 && cles.cacheImmuable,
      JSON.stringify(cles));

    // ================= LA MATIÈRE CLAIRE (v276) ==============================
    //
    // Max, sur la proposition de design : « beaucoup plus light, beaucoup plus
    // de glass design ». Trois choses se mesurent, et la troisième est celle
    // qui a trouvé un vrai défaut avant la livraison.

    // UN TÉMOIN D'APPARENCE LIT DES PIXELS, PAS UN NOM DE CLASSE (v247). Le
    // fond de l'accueil se lit par sa LUMINANCE calculée : « clair » est une
    // grandeur, « la classe .clair est posée » n'en est pas une. Et la police
    // de titre se demande à `document.fonts`, qui ne répond vrai que si le
    // fichier est arrivé ET analysé.
    const matiere = await tab.evaluate(async () => {
      await document.fonts.ready;
      const lum = (c) => {
        const m = (c || '').match(/[\d.]+/g) || [];
        const [r, g, b] = m.slice(0, 3).map((v) => {
          const x = +v / 255;
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ov = document.getElementById('overlay');
      const fond = getComputedStyle(ov).backgroundColor;
      const h1 = document.getElementById('overlay-title');
      return {
        fond, fondLum: +lum(fond).toFixed(3),
        titrePolice: getComputedStyle(h1).fontFamily,
        corpsPolice: getComputedStyle(document.body).fontFamily,
        titreChargee: document.fonts.check('800 40px "Bricolage Grotesque"'),
        corpsChargee: document.fonts.check('600 16px "Plus Jakarta Sans"'),
      };
    });
    verifier('l\'accueil est clair, et il porte les lettres du jeu',
      matiere.fondLum > 0.7 && matiere.titreChargee && matiere.corpsChargee
        && /Bricolage/.test(matiere.titrePolice) && /Jakarta/.test(matiere.corpsPolice),
      JSON.stringify(matiere));

    // ET LES POLICES VIENNENT DU DÉPÔT, PAS DU RÉSEAU. Le jeu marche hors
    // ligne : un `<link>` vers fonts.googleapis.com casserait l'accueil dans
    // l'avion, à l'école ou sur le Wi-Fi d'un hôtel — et ce n'est pas une
    // hypothèse, c'est la moitié des endroits où ces deux enfants jouent. On
    // compte donc ce que la page a RÉELLEMENT demandé.
    const reseauPolices = await tab.evaluate(() => {
      const r = performance.getEntriesByType('resource').map((e) => e.name);
      return {
        chezGoogle: r.filter((n) => /fonts\.(googleapis|gstatic)\.com/.test(n)).length,
        duDepot: r.filter((n) => /\/vendor\/polices\/.*\.woff2/.test(n)).length,
      };
    });
    verifier('et ses deux polices viennent du dépôt, jamais du réseau',
      reseauPolices.chezGoogle === 0 && reseauPolices.duDepot === 2,
      JSON.stringify(reseauPolices));

    // LE CONTRASTE SE CALCULE, IL NE SE REGARDE PAS — ET IL A DÉMONTÉ MA PROPRE
    // PHRASE. J'avais annoncé que le bouton « Me connecter à mon compte »
    // portait du #cdd sur du #2c3a58, « 2,9 pour une barre de 4,5 ». Ce témoin
    // rend 8,07 sur l'ancien code : le bouton était parfaitement lisible, et ce
    // qui clochait était sa COULEUR, pas son contraste. Un défaut de palette et
    // un défaut de lisibilité ne sont pas la même chose ; seul le second se
    // mesure en ratio, et je l'ai affirmé avant de le mesurer.
    //
    // CE TÉMOIN EST DONC VERT DES DEUX CÔTÉS, et il se garde quand même — comme
    // le témoin des clés de la v275, et pour la même raison (v220) : il ne
    // garde pas une correction, il garde une CAPACITÉ qu'on vient de frôler.
    // Renverser une palette est exactement ce qui casse un contraste, et il
    // reste trois renversements à faire (v277, v278, v279). Qu'il PUISSE rougir
    // se vérifie, cela ne se raconte pas : désarmé dans une copie d'index.html
    // (`#account-login-btn { color: #9AA6BC }` sur le verre clair), il rend
    // 2,26 et nomme le bouton.
    //
    // Le fond EFFECTIF se compose : les panneaux de verre sont translucides,
    // donc on empile les fonds des ancêtres jusqu'à l'opacité pleine. Lire le
    // seul `background-color` de l'élément rendrait « transparent » et le
    // témoin passerait au vert sans rien mesurer.
    const contraste = await tab.evaluate(() => {
      const nb = (c) => {
        const m = (c || '').match(/[\d.]+/g) || [];
        if (m.length < 3) return null;
        return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
      };
      const lum = (c) => {
        const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
      };
      const fondEffectif = (el) => {
        let acc = null;
        for (let n = el; n; n = n.parentElement) {
          const c = nb(getComputedStyle(n).backgroundColor);
          if (!c || c.a === 0) continue;
          acc = acc === null
            ? { r: c.r, g: c.g, b: c.b, a: c.a }
            : { r: acc.r + (c.r - acc.r) * (1 - acc.a), g: acc.g + (c.g - acc.g) * (1 - acc.a),
                b: acc.b + (c.b - acc.b) * (1 - acc.a), a: acc.a + c.a * (1 - acc.a) };
          if (acc.a >= 0.99) break;
        }
        return acc;
      };
      const cibles = ['#overlay-title', '#overlay .subtitle', '#play-btn', '#online-btn',
        '#face-login-btn', '#account-login-btn', '#switch-player-btn', '#app-version',
        '#overlay .controls div', '.online-title'];
      const faibles = [];
      const mesures = {};
      for (const sel of cibles) {
        const el = document.querySelector(sel);
        if (!el || !el.offsetParent) continue;
        const texte = nb(getComputedStyle(el).color);
        const fond = fondEffectif(el);
        if (!texte || !fond) continue;
        const a = lum(texte), b = lum(fond);
        const ratio = +(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05))).toFixed(2);
        mesures[sel] = ratio;
        if (ratio < 4.5) faibles.push(sel + ' ' + ratio);
      }
      return { mesures, faibles, lus: Object.keys(mesures).length };
    });
    verifier('et chaque texte de l\'accueil se lit — quatre et demi de contraste au moins',
      contraste.lus >= 6 && contraste.faibles.length === 0,
      JSON.stringify(contraste));

    // PLUS UN SEUL EMOJI SUR L'ACCUEIL. Un pictogramme dessiné se reconnaît à
    // sept ans ; un emoji se devine, et il change de dessin d'un appareil à
    // l'autre — la fusée de « Mon personnage » n'était pas la même sur l'iPad
    // et sur le portable. On lit le TEXTE que l'enfant voit, pas le source.
    const signes = await tab.evaluate(() => {
      const ov = document.getElementById('overlay');
      const txt = ov ? ov.innerText || '' : '';
      const emojis = [...txt].filter((c) => {
        const p = c.codePointAt(0);
        return (p >= 0x1F000 && p <= 0x1FAFF) || (p >= 0x2600 && p <= 0x27BF)
          || p === 0x25D3 || p === 0x2B50;
      });
      return { emojis: [...new Set(emojis)], icones: ov ? ov.querySelectorAll('svg.ic').length : 0 };
    });
    verifier('et l\'accueil ne porte plus un seul emoji : des signes dessinés',
      signes.emojis.length === 0 && signes.icones >= 8,
      JSON.stringify(signes));

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
