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
const { epreuve, juger } = require('./sonde-sw-coince.cjs');
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
    // CE TÉMOIN PASSE EN PREMIER, SEUL SUR LA MACHINE (banc-intermittents).
    // Il jugeait la préparation à côté de TROIS autres pages : `tab` et
    // `accueil` restées sur l'accueil, `onglet` en jeu. Mesuré
    // (`sonde-voisines.cjs`, /proc/stat) : deux pages sur l'accueil occupent
    // 2,4 à 3,7 cœurs sur quatre — l'accueil rend le monde derrière lui — et le
    // gel CDP n'y change rien, seule la fermeture. Préparation seule 3,4 et
    // 4,4 s ; avec deux voisines 38,5 et 43,9 s (`sonde-prep-duree.cjs`) :
    // la borne de 45 s tombait au portail, et le verdict rougissait des deux
    // côtés depuis la v265 (dette « vraiment là »). Le verdict ne change pas
    // d'un caractère ; c'est sa SITUATION qui est désormais celle d'une
    // tablette, où une seule page prépare.
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
    // ET LE RETOUR DU VERRE S'ATTEND, IL NE SE LIT PAS À L'INSTANT DE LA
    // LIBÉRATION (v277). La boucle ci-dessus s'arrête au PREMIER relevé non
    // grisé ; or `verreQuandPret` (main.js) sonde toutes les 250 ms et la
    // transition du flou dure une demi-seconde. Lu là, `body.prepare` est
    // encore posée une fois sur quatre — mesuré, quatre passages de cette suite
    // seule — et le verdict du verre tombait sur une course de MON fait, pas
    // sur un défaut du jeu. C'est la famille de la v249 : un témoin qui lit
    // l'effet d'un minuteur l'attend, et il borne.
    //
    // DEUX INSTANTANÉS, ET C'EST LE POINT. `liberation` reste le PREMIER relevé
    // non grisé — l'état AU MOMENT où l'enfant peut jouer, que le verdict
    // d'au-dessus lit et qu'il ne faut surtout pas adoucir en échantillonnant
    // plus tard (les programmes continuent de se compiler). Le retour du verre
    // a le sien.
    let verreRevenu = liberation;
    const finVerre = Date.now() + 4000;
    while (liberation && (verreRevenu.prepare || verreRevenu.flous.length === 0)
           && Date.now() < finVerre) {
      await dormir(150);
      const e = await prune.evaluate(() => {
        const PORTEURS = ['#who-screen', '#play-btn', '#app-version',
          '#overlay .controls', '#profile-menu', '#online-menu'];
        const flous = PORTEURS.filter((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const f = getComputedStyle(el);
          const v = f.backdropFilter || f.webkitBackdropFilter || 'none';
          return !!v && v !== 'none';
        });
        return { flous, prepare: document.body.classList.contains('prepare') };
      }).catch(() => null);
      if (e) verreRevenu = { ...verreRevenu, ...e };
    }
    const attenduVerre = +((4000 - Math.max(0, finVerre - Date.now())) / 1000).toFixed(1);
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
      && !!verreRevenu && verreRevenu.prepare === false && verreRevenu.flous.length > 0,
      `${tours} relevé(s) grisés · floutés en préparant : ${[...floutesEnPreparant].join(', ') || 'aucun'}`
      + ` · une fois prêt : ${verreRevenu ? verreRevenu.flous.join(', ') : '?'}`
      + ` (attendu ${verreRevenu ? attenduVerre : '?'} s)`);
    await prune.evaluate(() => { window.__game.edu.today().libreJusqua = 86400; document.getElementById('play-btn').click(); });
    const lance = await prune.waitForFunction(() => window.__game.running, null, { timeout: 30000 }).then(() => true).catch(() => false);
    verifier('et « Jouer » lance bien la partie une fois libéré', lance);
    await prune.close();

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
          const b = document.getElementById('play-btn');
          return { cache, texte: document.getElementById('boot-text').textContent, humains, programmes, aChauffer,
            jouable: b ? !b.disabled : null };
        }).catch(() => null);
        if (e && !e.cache) textesApres.add(e.texte);
        if (e && e.cache) aLEffacement = e;
        await dormir(100);
      }
      const msEffacement = Date.now() - debutAttente;
      console.log(`   🔎 loader après rechargement : ${JSON.stringify([...textesApres].slice(0, 3))} · à l'effacement ${JSON.stringify(aLEffacement)}`);
      // ET « PRÊT » N'EST PAS LA SEULE FIN ACCEPTABLE — LE RENONCEMENT EN EST UNE
      // (v286). Ce verdict exigeait que TOUT soit là à l'instant de l'effacement.
      // C'est trop absolu : il interdit au jeu de rendre la main, et c'est
      // exactement ce qui retenait l'enfant derrière le loader pendant
      // quarante-cinq secondes de plus alors que « Jouer » était déjà cliquable.
      // « Ça s'installe » ne veut pas dire « ça va finir » (v220) : ce qui compte
      // est le critère de l'enfant. On accepte donc prêt OU la préparation a
      // rendu la main, et la durée entre dans le message — sans elle, le rouge
      // suivant ne se démonte pas.
      const renonce = aLEffacement && aLEffacement.jouable === true;
      verifier('après le rechargement, le loader ne s\'efface qu\'une fois les corps et les programmes prêts — ou que le jeu a rendu la main',
        !!aLEffacement && ((aLEffacement.humains === true && aLEffacement.programmes !== null
        && aLEffacement.aChauffer !== null && aLEffacement.programmes >= aLEffacement.aChauffer)
        || renonce),
        `${JSON.stringify(aLEffacement)} · ${msEffacement} ms`);
      const rejouable = await jusqua(async () => tab.evaluate(
        () => !!document.getElementById('play-btn')).catch(() => false), 45000);
      verifier('et le jeu se relance normalement après', rejouable);
    }

    // UNE MISE À JOUR N'EST PAS UN PLANTAGE (v464). La page qui part disait au
    // revoir (`fermer('mise-a-jour')`), puis un `visibilitychange` pendant le
    // déchargement la ROUVRAIT : sa ligne restait, la page neuve la jugeait
    // douteuse puis morte à 7 s. Deux mises à jour, et le disjoncteur de sûreté
    // (v296) rangeait le palier bas pour de bon. Mesuré sur la v454 : compteur
    // 1, « plantage-precedent confirmé ». On lit la page neuve après ses 7 s.
    if (recharge) {
      await dormir(9000);
      const bilan = await tab.evaluate(() => {
        const j = window.__journal;
        return j ? { compteur: j.plantages(), avant: j.doc.plantagesAvant,
          confirmes: j.doc.evenements.filter((e) => e.type === 'plantage-precedent').length } : null;
      }).catch((e) => ({ erreur: e.message }));
      verifier('une mise à jour ne compte pas comme un plantage dans le journal de bord',
        !!bilan && bilan.compteur === 0 && bilan.confirmes === 0, JSON.stringify(bilan));
    }

    // UN SERVICE WORKER VRAIMENT COINCÉ SE RATTRAPE (dette v220). Le filet de
    // mise à jour et la borne de `forcerMaj` n'avaient aucun témoin : les deux
    // de la v220 provoquaient un blocage que le navigateur finissait par
    // épuiser, et l'ancien code s'en sortait sans filet. Ici l'installation ne
    // finit JAMAIS (`sonde-sw-coince.cjs`, appelée telle quelle), et l'on juge
    // un ÉTAT : la page rechargée, sous la version neuve ou sur les fichiers du
    // serveur. Vérifié rouge deux fois sur une copie : filet désarmé (marque
    // gardée, loader « 126 / 126 » à jamais) et `forcerMaj` sans borne (loader
    // « On va chercher la dernière version… » à jamais).
    const mCoince = await epreuve(banc, 'Anatole');
    const vCoince = juger(mCoince);
    verifier('une installation qui ne finit jamais : on repart de zéro, et l\'enfant tourne sur les fichiers du serveur',
      mCoince.controle && vCoince.repart, JSON.stringify(mCoince));
    verifier('et après ce départ, le loader s\'efface et « Jouer » est là', vCoince.jouable,
      `${mCoince.msRecharge} ms jusqu'au rechargement`);

    // LE LOADER NE CACHE JAMAIS UN « JOUER » QUI EST DÉJÀ CLIQUABLE (v286).
    //
    // Max : « après la mise à jour, sur la home le jeu lag 1 à 2 min, ça a été le
    // cas depuis longtemps » — le symptôme que la v257 et la v258 devaient
    // corriger. Ce qu'on trouve ne se mesure pas, il s'ADDITIONNE : deux attentes
    // tournent sur des conditions EMBOÎTÉES et c'est la plus longue qui garde la
    // plus faible (45 s pour dégriser « Jouer » sur corps ET chauffe ET carte,
    // 90 s pour effacer le loader sur corps ET chauffe). Entre les deux, l'enfant
    // a le droit de jouer et le loader le lui cache.
    //
    // ON PROVOQUE, ON N'ATTEND PAS (leçon des poissons, v233). Au banc la séquence
    // entière prend trois secondes : l'inversion ne se reproduit donc JAMAIS toute
    // seule, et un témoin qui attendrait serait vert des deux côtés sans rien
    // mesurer. Mesuré à la sonde, dans l'horloge de la page : les corps arrivent à
    // 2,8-3,2 s et tout est prêt à 3,3 s. Une borne de préparation posée à DEUX
    // secondes (`?prepms=2000`) tombe donc entre les deux, et `?apresmaj=1` rejoue
    // le chemin d'après-mise-à-jour sans en faire une.
    //
    // A/B sur la même page (`tests/sonde-loader.cjs`), la correction désarmée dans
    // `src/main.js` :
    //   armée     « Jouer » dégrisé 2 226 ms · loader effacé 2 226 ms · ZÉRO fautif
    //   désarmée  « Jouer » dégrisé 2 314 ms · loader effacé 3 213 ms · ONZE fautifs
    //             sur 848 ms, corps `false`, programmes 21/25
    // La barre est donc ZÉRO relevé fautif, et les deux dates entrent dans le
    // message : un rouge qui ne dit pas QUAND ne se démonte pas.
    const lent = await banc.joueur('Solène', { prep: 1, params: '&apresmaj=1&prepms=2000' });
    const cache = await lent.evaluate(async () => {
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const depart = performance.now();
      const pas = [];
      while (performance.now() - depart < 30000) {
        const l = document.getElementById('boot-loader');
        const b = document.getElementById('play-btn');
        if (!l || !b) { await dodo(50); continue; }
        const p = window.__preparation ? window.__preparation() : null;
        pas.push({ depuis: p ? p.depuis : null, humains: p ? p.humains : null,
          loader: !l.classList.contains('hidden'), jouable: !b.disabled });
        if (l.classList.contains('hidden') && !b.disabled) break;
        await dodo(50);
      }
      const fautifs = pas.filter((x) => x.loader && x.jouable);
      const degrise = pas.find((x) => x.jouable);
      const efface = pas.find((x) => !x.loader);
      return { releves: pas.length, fautifs: fautifs.length,
        degriseA: degrise ? degrise.depuis : null, effaceA: efface ? efface.depuis : null,
        premierFautif: fautifs.length ? fautifs[0] : null };
    }).catch((e) => ({ err: String(e && e.message || e) }));
    await lent.close();
    // La borne de GARDE vérifie que la mesure a EU LIEU : sans relevé, « zéro
    // fautif » est une absence de mesure et non un verdict (v272). Elle valait
    // trois, et la suite rejouée SEULE en a rendu DEUX sur une page prête à
    // 3 130 ms (v290) : le nombre de relevés est le temps entre l'ouverture de
    // la boucle et la page prête, divisé par cinquante millisecondes — une
    // grandeur du banc, pas du jeu. Une borne de garde se pose à la moitié de
    // la plus petite mesure (v237), donc à un : la boucle a vu le loader et le
    // bouton au moins une fois.
    verifier('après une mise à jour, le loader ne cache jamais un « Jouer » déjà cliquable',
      !cache.err && cache.releves >= 1 && cache.fautifs === 0,
      `${JSON.stringify(cache)} (désarmé : 11 fautifs sur 848 ms)`);

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
    // ET CETTE PARTIE SE FERME QUAND ELLE A RENDU SON VERDICT (banc-intermittents).
    // Personne ne relit `onglet` ensuite, et il restait EN JEU jusqu'à la fin
    // de la suite : un monde rendu en logiciel, un à deux cœurs occupés
    // (`sonde-voisines.cjs`), à côté de chaque témoin qui suit. Un témoin se
    // place lui-même, et « se placer » veut dire aussi ce qui traîne autour
    // (v279, v284) — et ce qu'on laisse traîner derrière soi.
    await onglet.close();

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

    // ── LE PALIER DE L'APPAREIL (v284) ─────────────────────────────────────
    //
    // Max, sur iPhone 18 Pro : douze appels de dessin, 59 i/s, un septième de
    // sa définition d'écran. Le jeu se règle désormais sur ce qu'il MESURE.
    //
    // CE QUE CE BANC NE PEUT PAS PROUVER, ET IL FAUT LE DIRE : il rend en
    // LOGICIEL, sans carte graphique. Il ne dira jamais si le palier haut est
    // le bon palier pour un iPhone — cela se mesure sur l'appareil, par
    // `?diag=1`, et c'est la leçon que la v245 et la v249 ont payée en
    // transposant des chiffres de conteneur à une tablette. Ce qu'il prouve,
    // c'est le MÉCANISME : sans mesure rien ne change, et un palier demandé
    // s'applique vraiment.
    const sansMesure = await banc.joueur('Gaspard', { rr: 12 });
    await sansMesure.waitForFunction(() => window.__game, null, { timeout: 90000 });
    const avant = await sansMesure.evaluate(() => window.__game.reglageApplique);
    // LE PAYSAGE LOINTAIN TEL QUE LA PAGE LE REND (v497) : le brouillard, le plan
    // lointain de la caméra, et ce qui porte un nom d'horizon dans la scène. Lu
    // dans la SCÈNE, pas dans une table : c'est ce que l'écran montre.
    const vueDe = (p) => p.evaluate(() => {
      const g = window.__game;
      const l = g.scene.getObjectByName('horizon-loin');
      return { brouillard: g.scene.fog.far, planLointain: g.camera.far,
        fine: g.horizon.rayon, pasFine: g.horizon.pas || 8, abaisseFine: g.horizon.abaisse || 0,
        loin: l ? Math.round(g.horizonLoin.rayon) : 0, pasLoin: l ? g.horizonLoin.pas : 0,
        tresLoin: g.scene.getObjectByName('horizon-tres-loin') && g.horizonTresLoin ? Math.round(g.horizonTresLoin.rayon) : 0,
        pasTresLoin: g.horizonTresLoin ? g.horizonTresLoin.pas : 0,
        abaisses: [g.horizonLoin ? g.horizonLoin.abaisse : 0, g.horizonTresLoin ? g.horizonTresLoin.abaisse : 0] };
    });
    const vueSans = await vueDe(sansMesure);
    await sansMesure.close();
    const moyen = await banc.joueur('Léontine', { rr: 12, params: '&palier=moyen' });
    await moyen.waitForFunction(() => window.__game, null, { timeout: 90000 });
    const vueMoyen = await vueDe(moyen);
    await moyen.close();
    // ET LES PALIERS QUI NE SONT PAS « LOIN » NE VOIENT PAS PLUS LOIN (v497).
    // Sans palier comme au palier moyen, le paysage est celui de la v487 au bit
    // près : la grille fine à 632 blocs (rr 12), le brouillard au même endroit,
    // le plan lointain à 900, et aucune couronne lointaine. Vert des deux côtés
    // à dessein (v220) : il garde ce qu'on ne veut pas casser — la mémoire que
    // l'iPhone a déjà payée deux fois (v291, v299).
    const vueInchangee = (v) => v.brouillard === 632 && v.planLointain === 900 && v.fine === 632
      && v.pasFine === 8 && v.abaisseFine === 0 && v.loin === 0 && v.tresLoin === 0;
    verifier('sans palier et au palier moyen, le paysage lointain est celui d\'avant',
      vueInchangee(vueSans) && vueInchangee(vueMoyen), JSON.stringify({ sans: vueSans, moyen: vueMoyen }));
    verifier('sans mesure, le jeu est celui d\'avant — un appareil non mesuré ne perd rien',
      avant.palier === null && avant.file === 8 && avant.jet === 120,
      JSON.stringify(avant));
    // ET LE BANC NE RANGE RIEN, SANS UNE LIGNE ÉCRITE POUR LUI. Toute page du
    // banc reçoit `rr=` et `dpr=` (banc.js) : sa configuration est IMPOSÉE, donc
    // sa mesure ne dit rien de ce que l'appareil fait en vrai et le jeu ne la
    // range pas. Sans cette règle, une suite qui joue longtemps rangerait un
    // palier « bas » et la page SUIVANTE de la même suite en hériterait — un
    // témoin mesurerait alors ce que son voisin a laissé (la famille de la
    // v279). Ce verdict-là ne peut pas être vert sur `origin/main` : le champ
    // n'y existe pas.
    verifier('et une page dont on a forcé la configuration ne classe pas l\'appareil',
      avant.seRange === false, JSON.stringify({ seRange: avant.seRange }));

    const haut = await banc.joueur('Isaure', { rr: 12, params: '&palier=haut' });
    await haut.waitForFunction(() => window.__game, null, { timeout: 90000 });
    const applique = await haut.evaluate(() => window.__game.reglageApplique);
    const vueHaut = await vueDe(haut);
    // ET LA RÈGLE EST PURE, donc elle se démonte sans navigateur : on lui donne
    // les chiffres de l'iPhone de Max et ceux de l'iPad de quatre ans.
    const regle = await haut.evaluate(() => ({
      iphone: window.__game.choisirPalier({ msMorceau: 6, msTravail: 5 }).palier,
      vieilIpad: window.__game.choisirPalier({ msMorceau: 70, msTravail: 20 }).palier,
      sansRien: window.__game.choisirPalier({}).palier,
      rrHaut: window.__game.PALIERS.haut.rr,
    }));
    await haut.close();
    // CE QUI PROUVE QUE LE PALIER S'APPLIQUE, C'EST LA FILE — pas `rr`. Le banc
    // met toujours `rr=` dans l'adresse (banc.js) et l'adresse l'emporte, à
    // dessein : on doit pouvoir mesurer une distance d'affichage choisie. La
    // profondeur de file, elle, n'est forcée par personne ici, et c'est le
    // levier que la v269 a mesuré comme LE levier. On vérifie donc les deux
    // faits : la file suit le palier, et `rr` suit l'adresse.
    // ET LES CHIFFRES ONT CHANGÉ EN v291, PARCE QUE LE PALIER A CHANGÉ. La file
    // de seize et la vitesse de 160 étaient le couple que la v269 avait mesuré
    // comme impraticable et RETIRÉ ; la v284 les avait remises sur un
    // raisonnement, derrière une barrière qui les rendait inatteignables, et la
    // v290 a levé la barrière — c'est la panne de production que Max a
    // photographiée. `haut` garde `rr` 16 et la portée HD, rend sa file à huit
    // et sa vitesse à 120. Un témoin qui aurait gardé ses anciens chiffres
    // aurait accusé la correction (v281, les cotes de gare écrites en dur).
    verifier('un palier CHOISI donne plus de monde devant l\'enfant, avec la file que la v269 a mesurée',
      applique.palier === 'haut' && applique.file === 8 && applique.jet === 120
        && applique.rr === 12 && regle.rrHaut === 16,
      JSON.stringify({ ...applique, rrDuPalierHaut: regle.rrHaut }));
    // ET « LOIN » VOIT TROIS FOIS PLUS LOIN (v497). Max : « que le mode Loin,
    // quand on voit de loin, soit encore beaucoup plus loin. » La couronne
    // lointaine porte à 2 560 blocs, le brouillard recule avec elle et le plan
    // lointain de la caméra aussi — sinon elle serait coupée net à 900. Et `rr`
    // et la file ne bougent pas : ce sont les chiffres que le dépôt a mesurés
    // comme nuisibles (v269, v291). Rouge sur l'ancien code : pas de couronne,
    // brouillard à 632.
    // ET « LOIN » VOIT ENCORE QUATRE FOIS PLUS LOIN (v518). Max : « le mode
    // Loin n'est pas assez loin. » La couronne garde ses 2 560 blocs et une
    // troisième grille, de cent vingt-huit blocs, porte jusqu'à 10 240 ; le
    // brouillard et le plan lointain reculent avec elle. Chaque grille plus
    // lâche est posée plus bas que celle de dedans (la fine gagne, puis la
    // couronne). Rouge sur la v504 : brouillard à 2 560, pas de troisième grille.
    verifier('« Loin » voit beaucoup plus loin : une couronne à 2 560 blocs, une troisième grille à 10 240, sans toucher rr ni la file',
      vueHaut.loin === 2560 && vueHaut.pasLoin === 32 && vueHaut.tresLoin === 10240 && vueHaut.pasTresLoin === 128
        && vueHaut.brouillard === 10240 && vueHaut.planLointain >= 10240
        && vueHaut.abaisses[1] > vueHaut.abaisses[0] && vueHaut.abaisses[0] > 0
        && vueHaut.fine === 632 && applique.file === 8 && applique.rr === 12,
      JSON.stringify(vueHaut));
    // ET LA CHAÎNE ENTIÈRE SE SUIT : jouer, mesurer, ranger. La fenêtre vaut
    // trente secondes de JEU par défaut — `?palierms=` la raccourcit ici, et
    // c'est un réglage de banc qui se REJOUE (v277), pas un chiffre caché.
    const mesure = await banc.jouerSeul('Fantine', { rr: 12, params: '&palierms=2000' });
    await mesure.waitForFunction(() => window.__game && window.__game.running, null, { timeout: 90000 });
    const range = await mesure.evaluate(async () => {
      const t0 = performance.now();
      while (performance.now() - t0 < 60000) {
        await new Promise((f) => setTimeout(f, 500));
        const m = window.__game.mesurePalier;
        if (m.range) break;
      }
      const m = window.__game.mesurePalier;
      let garde = null;
      try { garde = JSON.parse(localStorage.getItem('web-minecraft-palier-v2') || 'null'); } catch { /* mode privé */ }
      const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
      return { range: m.range, morceaux: m.morceaux.length, images: m.images.length,
        travaux: m.travaux ? m.travaux.length : 0,
        medPeriode: med(m.images), medTravail: m.travaux ? med(m.travaux) : null,
        verdict: m.verdict || null, garde };
    });
    await mesure.close();
    verifier('le jeu se mesure en jouant, et range son verdict pour la partie suivante',
      range.range && !!range.garde && !!range.garde.palier && range.garde.raison
        && range.garde.msMorceau > 0 && range.garde.msTravail > 0,
      JSON.stringify(range));

    // ── LE PALIER SE DÉCIDE SUR LE TRAVAIL, JAMAIS SUR LA PÉRIODE (v290) ──────
    //
    // La v284 lui donnait `now - lastTime`, l'écart entre deux images. Sur un
    // appareil synchronisé à son écran cet écart EST la période de
    // rafraîchissement — l'iPad de Max : 59 i/s, 17,0 ms, soit 1000/59 — si
    // bien que `> 16,7` renvoyait en `bas` tout appareil en bonne santé à 60 Hz
    // et que `≤ 8` mettait `haut` hors de portée.
    //
    // ET LE TÉMOIN DE LA v284 NE POUVAIT PAS LE VOIR : il FABRIQUAIT ses deux
    // nombres (`{ msMorceau: 6, msImage: 5 }`) et vérifiait donc que la règle
    // sait trier des chiffres, pas qu'un appareil puisse les produire. Celui-ci
    // lit ce que le JEU a mesuré, et il compare les deux grandeurs côte à côte.
    //
    // La garde est ce qui le rend non vide : si période et travail se
    // confondaient sur cette machine, le témoin ne prouverait rien. Mesuré au
    // banc, deux configurations : rr 12 → 166,6 contre 22,8 ms ; rr 2 → 66,6
    // contre 9,7. On demande un facteur TROIS, la moitié du plus petit des deux
    // rapports mesurés (v237).
    //
    // ET IL NE COMPARE PLUS LE VERDICT À UNE MÉDIANE RELUE APRÈS COUP (v290).
    // Mon premier jet exigeait `v.msTravail === range.medTravail` : le verdict
    // est figé à l'instant où `rangerLePalier` tire, la médiane est RECALCULÉE
    // quand le témoin la lit, et le jeu continue d'empiler des relevés entre les
    // deux. Les deux nombres ne sont donc égaux que par chance — 10,4 contre
    // 10,4 à un portail, 12,9 contre 12,6 au suivant, sur le MÊME code. C'est
    // « un verdict lu à l'instant d'une transition est un coup de dé » (v273)
    // du côté d'une égalité, et la comparaison n'apportait rien : ce que le
    // témoin annonce, c'est que le verdict porte un TRAVAIL et que ce travail
    // n'est pas la période. On lit donc ce que le verdict DIT — sa raison nomme
    // le travail, jamais l'image — et l'on garde la médiane dans le MESSAGE,
    // où elle sert à démonter un rouge sans jamais en faire un.
    const v = range.verdict;
    verifier('le palier se décide sur le TRAVAIL d\'une image, jamais sur la période de l\'écran',
      !!v && v.msTravail > 0 && v.msPeriode > 0
        && /travail/.test(v.raison) && !/image/.test(v.raison)
        && v.msPeriode > 3 * v.msTravail,
      JSON.stringify({ verdict: v, medTravail: range.medTravail, medPeriode: range.medPeriode,
        rapport: v && v.msTravail ? +(v.msPeriode / v.msTravail).toFixed(1) : null }));

    // ── ET UN VERDICT RANGÉ PAR L'ANCIENNE RÈGLE NE DÉGRADE PLUS L'APPAREIL ────
    //
    // C'est la situation EXACTE de l'iPad de Max : sa capture disait « → bas au
    // prochain lancement », donc `localStorage` était DÉJÀ écrit. Corriger la
    // règle sans changer la CLÉ aurait laissé son appareil en `bas` — la mesure
    // ne se reprend pas, elle est rangée une fois pour toutes. On écrit donc le
    // verdict de l'ancienne clé, on recharge, et l'on regarde ce que l'enfant
    // obtient : la file, que personne ne force dans l'adresse (v284).
    const ancien = await banc.joueur('Gwenaëlle', { rr: 12 });
    await ancien.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await ancien.evaluate(() => localStorage.setItem('web-minecraft-palier-v1',
      JSON.stringify({ palier: 'bas', raison: 'période 17,0 ms — la règle de la v284', msMorceau: 37, msImage: 17, le: Date.now() })));
    await ancien.reload({ waitUntil: 'load', timeout: 90000 });
    await ancien.waitForFunction(() => window.__game, null, { timeout: 90000 });
    const apresAncien = await ancien.evaluate(() => window.__game.reglageApplique);
    await ancien.close();
    verifier('un verdict rangé par l\'ancienne règle ne dégrade plus l\'appareil',
      apresAncien.palier === null && apresAncien.file === 8,
      JSON.stringify(apresAncien));

    // ── ET UNE MESURE NE DONNE PAS UN PALIER QUI N'A JAMAIS TOURNÉ (v291) ─────
    //
    // C'est la panne de production que Max a photographiée : « A problem
    // repeatedly occurred », « Game break after 3sec ». La v290 a rendu la
    // grandeur juste et, par là, a rendu `haut` ATTEIGNABLE pour la première
    // fois — rr 16, file 16, portée HD 6, une ligne que personne n'avait jamais
    // exécutée, ni un appareil ni une suite. L'iPhone de Max est passé de `bas`
    // à `haut` en une version.
    //
    // LE TÉMOIN REJOUE LA SITUATION EXACTE DE SON APPAREIL, comme celui de la
    // v290 juste au-dessus : on écrit le verdict dans la clé COURANTE, on
    // recharge, et l'on lit ce que l'enfant obtient. Et ce qu'on lit, c'est la
    // FILE — le banc force toujours `rr` dans son adresse (v284), donc `rr` ne
    // peut rien prouver ici ; la file, elle, n'est forcée par personne, et
    // c'est le levier que la v269 a mesuré comme LE levier.
    //
    // Sur l'ancien code il rend `haut` / file 16 ; ici `null` / file 8, c'est-à-
    // dire la v283 au bit près. Et la mesure n'est pas perdue : `palierPropose`
    // la nomme, pour que `?diag=1` et l'aide des Réglages puissent l'offrir.
    const jamais = await banc.joueur('Maëlys', { rr: 12 });
    await jamais.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await jamais.evaluate(() => localStorage.setItem('web-minecraft-palier-v2',
      JSON.stringify({ palier: 'haut', raison: 'morceau 6.0 ms ≤ 17 et travail 5.0 ms ≤ 8', msMorceau: 6, msTravail: 5, le: Date.now() })));
    await jamais.reload({ waitUntil: 'load', timeout: 90000 });
    await jamais.waitForFunction(() => window.__game, null, { timeout: 90000 });
    const apresJamais = await jamais.evaluate(() => {
      const g = window.__game;
      const pp = typeof g.palierPropose === 'function' ? g.palierPropose : null;
      return { ...g.reglageApplique, propose: pp ? pp({ palier: 'haut' }) : 'fonction absente' };
    });
    await jamais.close();
    verifier('un palier que le jeu n\'a jamais fait tourner n\'est pas donné d\'office',
      apresJamais.palier === null && apresJamais.file === 8 && apresJamais.propose === 'haut',
      JSON.stringify(apresJamais));

    verifier('et la règle classe l\'appareil sur ce qu\'il coûte, pas sur son nom',
      regle.iphone === 'haut' && regle.vieilIpad === 'bas' && regle.sansRien === 'moyen',
      JSON.stringify(regle));

    // ── L'ÉTENDUE DES GRAPHISMES EST UN CHOIX DE MAX (v290) ────────────────────
    //
    // « Permets-moi de choisir l'étendue des graphismes as a user si tu sais pas
    // la calibrer toi » — sa décision, après avoir vu son iPhone 18 Pro tourner
    // sans à-coup avec des graphismes qu'il trouve pauvres. La mesure ne décide
    // plus, elle propose.
    //
    // CE QUI SE MESURE ICI EST LE TRAJET DE L'ENFANT, pas la table : on ouvre
    // les réglages, on touche un bouton, on relance, et l'on regarde ce que le
    // jeu porte ensuite. Un témoin qui lirait `PALIERS.haut.rr` vérifierait la
    // table (v284).
    // ET L'ON JOUE POUR L'ATTEINDRE : `#overlay` (z-index 16) recouvre le bouton
    // ⚙️ (z-index 11), donc à l'accueil aucun doigt ne peut l'ouvrir. Un témoin
    // qui cliquerait le bouton depuis l'accueil éprouverait un chemin que
    // l'enfant n'a pas — on entre en jeu, comme lui.
    const choisi = await banc.jouerSeul('Nolwenn', { rr: 12 });
    await choisi.waitForFunction(() => window.__game, null, { timeout: 90000 });
    // LA RÈGLE EST PURE, donc elle se démonte sans navigateur — et les trois cas
    // qui comptent sont les trois branches : le choix passe devant la mesure,
    // `auto` retombe sur la mesure, et sans rien du tout on rend `null`, c'est-
    // à-dire le comportement d'avant au bit près.
    // ET IL FAUT ÉCHOUER PROPREMENT SUR L'ANCIEN CODE, PAS S'EFFONDRER : appelée
    // sans garde, `palierRetenu` absente jette et la suite meurt au premier
    // témoin — on ne voit alors plus rien des quatre suivants. Le portail de
    // `origin/main` l'a rendu exactement comme ça.
    const regleEtendue = await choisi.evaluate(() => {
      const r = window.__game.palierRetenu;
      const er = window.__game.etendueRange;
      if (typeof r !== 'function' || typeof er !== 'function') return { absente: true };
      const mes = { palier: 'bas', raison: 'mesuré' };
      const a = r({ choix: 'haut', mesure: mes });
      const b = r({ choix: 'auto', mesure: mes });
      const c = r({ choix: 'auto', mesure: null });
      const d = r({ choix: 'nimportequoi', mesure: mes });
      return {
        choixDevant: a && a.nom + '/' + a.source,
        autoSuitLaMesure: b && b.nom + '/' + b.source,
        rienDuTout: c,
        valeurAbimee: d && d.nom + '/' + d.source,
        rangeEnAuto: er('auto'),
        rangeEnChoix: er('haut'),
        // ET `?palier=` EST UNE CONFIGURATION FORCÉE (v291). Il manquait dans la
        // liste : la seule porte de secours de la panne de production rangeait
        // donc son verdict et repoisonnait le lancement suivant. Le banc ne peut
        // PAS l'éprouver par une page — il met toujours `rr=` dans son adresse
        // (v284), donc aucune page d'ici ne peut isoler ce paramètre. On lit
        // alors la liste, qui vit à côté de la règle qu'elle sert : c'est un
        // témoin de TABLE, plus faible qu'un témoin de trajet, et il est là pour
        // qu'on ne la vide pas sans le voir.
        forcants: window.__game.PARAMS_FORCANTS || null,
      };
    });
    verifier('le choix de l\'enfant passe devant la mesure, et « Auto » la suit',
      regleEtendue.choixDevant === 'haut/choix'
      && regleEtendue.autoSuitLaMesure === 'bas/mesure'
      && regleEtendue.rienDuTout === null
      && regleEtendue.valeurAbimee === 'bas/mesure',
      JSON.stringify(regleEtendue));
    // ET UNE ÉTENDUE CHOISIE À LA MAIN NE SE CLASSE PAS (règle de la v284, qui
    // n'avait jamais servi qu'au banc) : une page qui tourne à `rr 16` parce que
    // Max a demandé « Loin » ne dit rien de ce que l'appareil ferait à sa
    // distance naturelle, et ranger ce verdict lui laisserait un faux classement
    // le jour où il repasse en « Auto ».
    verifier('et une étendue choisie à la main n\'est pas rangée comme une mesure',
      regleEtendue.rangeEnAuto === true && regleEtendue.rangeEnChoix === false,
      JSON.stringify({ auto: regleEtendue.rangeEnAuto, choix: regleEtendue.rangeEnChoix }));
    // ET `?palier=` EN EST UNE AUSSI (v291) — la porte de secours de la panne de
    // production rangeait son verdict et repoisonnait le lancement suivant.
    verifier('et un palier forcé par l\'adresse compte comme une configuration imposée',
      Array.isArray(regleEtendue.forcants) && regleEtendue.forcants.includes('palier')
        && regleEtendue.forcants.includes('rr'),
      JSON.stringify({ forcants: regleEtendue.forcants }));

    // ── ET LE RÉGLAGE EXISTE DANS L'ÉCRAN, ET IL DIT QUOI FAIRE ───────────────
    //
    // UN BOUTON QUI NE FAIT RIEN TOUT DE SUITE DOIT DIRE QUOI FAIRE (v228, vu du
    // côté d'un réglage différé) : ce que l'étendue change est lu AU DÉMARRAGE,
    // donc l'enfant qui touche « Loin » ne voit rien bouger. On vérifie les
    // quatre boutons, la marque sur celui qui est actif, et surtout que l'aide
    // ANNONCE l'effet en attente après le clic.
    const ecran = await choisi.evaluate(() => {
      document.getElementById('settings-btn')?.click();
      // `null` n'est pas un verdict, c'est une absence de mesure (v272) : on dit
      // si le panneau s'est ouvert, sinon un rouge ne distingue pas « les
      // boutons sont faux » de « l'écran n'était pas là ».
      const ouvert = document.getElementById('settings-panel')?.style.display === 'flex';
      const btns = [...document.querySelectorAll('.etendue-btn')];
      const avantClic = {
        ouvert,
        mots: btns.map((b) => b.textContent),
        actif: btns.filter((b) => b.classList.contains('on')).map((b) => b.dataset.cle),
        aide: document.getElementById('etendue-hint')?.textContent || '',
      };
      btns.find((b) => b.dataset.cle === 'haut')?.click();
      const apresClic = {
        actif: [...document.querySelectorAll('.etendue-btn')].filter((b) => b.classList.contains('on')).map((b) => b.dataset.cle),
        aide: document.getElementById('etendue-hint')?.textContent || '',
        range: localStorage.getItem('web-minecraft-etendue-v1'),
      };
      // ET L'AUTRE MOITIÉ : revenir sur un choix qui ne change RIEN ne doit pas
      // annoncer d'attente. Sans mesure rangée, « Auto » rend exactement ce que
      // porte la page — une aide qui promettrait un changement qui ne vient pas
      // apprendrait à l'enfant à ne plus la lire.
      btns.find((b) => b.dataset.cle === 'auto')?.click();
      const retourAuto = { aide: document.getElementById('etendue-hint')?.textContent || '' };
      // Et l'on remet le choix de Max pour la suite du témoin.
      btns.find((b) => b.dataset.cle === 'haut')?.click();
      return { avantClic, apresClic, retourAuto };
    });
    verifier('quatre étendues dans les réglages, « Auto » marquée au départ',
      ecran.avantClic.ouvert === true
      && ecran.avantClic.mots.join('·') === 'Auto·Court·Normal·Loin'
      && ecran.avantClic.actif.join() === 'auto',
      JSON.stringify(ecran.avantClic));
    verifier('et choisir « Loin » se garde, se marque, et dit de revenir au menu',
      ecran.apresClic.range === 'haut'
      && ecran.apresClic.actif.join() === 'haut'
      && /prochain lancement/.test(ecran.apresClic.aide)
      && /menu/.test(ecran.apresClic.aide),
      JSON.stringify(ecran.apresClic));
    // ET L'ON EXIGE QUE L'AIDE EXISTE AVANT DE SE RÉJOUIR DE CE QU'ELLE NE DIT
    // PAS : une aide absente ne dit rien non plus, et ce verdict serait vert sur
    // du code qui n'a pas le réglage (`null` n'est pas un verdict, v272).
    verifier('et un choix qui ne change rien n\'annonce aucune attente',
      /Auto/.test(ecran.retourAuto.aide) && !/prochain lancement/.test(ecran.retourAuto.aide),
      JSON.stringify(ecran.retourAuto));

    // ── ET CE QUE L'ENFANT OBTIENT AU LANCEMENT SUIVANT ───────────────────────
    //
    // Le seul verdict qui compte : on relance la page, et le jeu porte VRAIMENT
    // l'étendue demandée. La FILE est ce qui le prouve — le banc met toujours
    // `rr=` dans l'adresse et l'adresse l'emporte, à dessein (v284) — et la
    // vitesse des jets suit la file depuis la v269.
    //
    // ET CE TÉMOIN EST LE JUMEAU DE CELUI DE LA LIGNE 770 : j'ai repointé l'un
    // sur les chiffres de la v291 (file 8, vitesse 120) et pas l'autre, et le
    // portail l'a rendu rouge sur une correction juste. C'est exactement « quand
    // une panne touche une grammaire partagée, on cherche TOUTES ses occurrences
    // le jour même », appliqué à mes propres barres de témoin — et le geste qui
    // l'évite prend dix secondes : `grep -n "=== 16\|=== 160" tests/*.js`.
    await choisi.reload({ waitUntil: 'load', timeout: 90000 });
    await choisi.waitForFunction(() => window.__game, null, { timeout: 90000 });
    const apresChoix = await choisi.evaluate(() => window.__game.reglageApplique);
    await choisi.close();
    verifier('au lancement suivant, le jeu joue vraiment à l\'étendue choisie',
      apresChoix.palier === 'haut' && apresChoix.source === 'choix'
      && apresChoix.etendue === 'haut' && apresChoix.file === 8 && apresChoix.jet === 120,
      JSON.stringify(apresChoix));

    // ================= LES COMMANDES SIMPLIFIÉES ============================
    //
    // Max : « une main pour bouger, une main pour agir », et sur la maquette
    // « plus de transparence, moins de texte ». Les petits boutons dispersés
    // (pause, sac, réglages, maison, caméra, messages, joueurs, souvenirs,
    // photo) passent dans UN menu, Construire devient un mode qu'on choisit.
    // Quatre choses se mesurent, chacune sur une page tactile, aux deux tailles
    // (le banc et l'iPhone de Max), formulées sans dimension (v265, v445).
    for (const vue of [{ width: 420, height: 760 }, { width: 430, height: 932 }]) {
      const cmd = await banc.jouerSeul('Commandes' + vue.width, { viewport: vue, tactile: true, rr: 2 });
      const r = await cmd.evaluate(async () => {
        const att = (ms) => new Promise((f) => setTimeout(f, ms));
        const g = window.__game, C = window.__commandes;
        if (!C) return { err: 'pas de menu unique' };
        const { REMPLACES, LIGNES, avecIcone } = await import('./src/commandes.js');
        const vis = (el) => { if (!el) return null; const st = getComputedStyle(el), b = el.getBoundingClientRect();
          return st.display === 'none' || st.visibility === 'hidden' || b.width === 0 ? null
            : { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
        const ACTIONS = ['jump-btn', 'fly-btn', 'down-btn', 'construire-btn', 'poser-btn', 'casser-btn', 'fm-btn', 'fun-target'];
        const HUD = ['menu-btn', 'map-btn', 'minimap', 'gps', 'construction-pill', 'hotbar', ...ACTIONS];
        const releve = () => {
          const R = {};
          for (const id of HUD) { const b = vis(document.getElementById(id)); if (b) R[id] = b; }
          const lbs = [...document.querySelectorAll('#touch-ui .tbtn .lb')].map(vis).filter((b) => b && (b.w > 2 || b.h > 2));
          return { R, actions: ACTIONS.filter((id) => R[id]), lbsVisibles: lbs.length };
        };
        // Explorer, au point d'apparition, une monture devant soi : la pilule
        // d'action s'allume, c'est le cas le plus chargé à pied.
        const am = g.animalManager;
        for (const a of [...am.animals]) am.scene.remove(a.mesh);
        am.animals.length = 0;
        const P = g.player;
        // ON ATTEND LE RÉSULTAT, BORNÉ (v270) : sous la charge d'un portail, la
        // pilule s'allume plusieurs secondes plus tard, et le cheval broute —
        // on le ramène devant l'enfant à chaque tour.
        const devant = () => [P.pos.x - Math.sin(P.yaw) * 3, P.pos.z - Math.cos(P.yaw) * 3];
        const cheval = am.invoquer('horse', ...devant());
        const t0 = performance.now();
        while (performance.now() - t0 < 20000 && !vis(document.getElementById('fun-target'))) {
          await att(500);
          if (cheval && cheval.pos) { const [x, z] = devant(); cheval.pos.x = x; cheval.pos.z = z; }
        }
        await att(300);
        const explorer = releve();
        explorer.attendu = Math.round(performance.now() - t0);
        // EN VOL, MONTER EST AU-DESSUS DE DESCENDRE (v510, Max : « le bouton
        // pour monter est en bas, et le bouton pour descendre est en haut ») —
        // à pied ici, en construction plus bas. On prend le vol comme le jeu
        // (`player.flying`) et l'on attend la classe que main.js pose.
        const enVol = async (oui) => {
          P.flying = oui;
          const tv = performance.now();
          while (performance.now() - tv < 30000 && document.body.classList.contains('en-vol') !== oui) await att(100);
          await att(300);
          return Math.round(performance.now() - tv);
        };
        const volMs = await enVol(true);
        const vol = releve();
        vol.ms = volMs;
        await enVol(false);
        // UNE pilule, et son mot tient sur une ligne sans être coupé — y
        // compris le plus long que le jeu écrive à pied.
        const pilules = () => [...document.querySelectorAll('#fun-target button')].filter((b) => vis(b))
          .map((b) => ({ t: b.textContent, coupe: b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().height > 50 }));
        explorer.pilules = pilules();
        const fb = document.getElementById('board-btn'), rb = document.getElementById('ride-btn'), fe = document.getElementById('feed-btn');
        const sauve = [fb.innerHTML, fb.style.display, rb.style.display, fe.style.display];
        fb.innerHTML = avecIcone('volant', 'Conduire cette voiture'); fb.style.display = 'block'; rb.style.display = 'none'; fe.style.display = 'none';
        explorer.longue = pilules();
        [fb.innerHTML, fb.style.display, rb.style.display, fe.style.display] = sauve;
        // Inventaire : chaque bouton remplacé existe encore, n'est plus à
        // l'écran, et le menu a une ligne qui l'appuie (le menu lui-même tient
        // lieu de pause).
        const inventaire = REMPLACES.map((sel) => {
          const el = document.querySelector(sel);
          const ligne = sel === '#pause-btn' ? '#menu-btn'
            : document.querySelector(`.menu-ligne[data-cible='${sel}']`) ? 'ligne' : null;
          return { sel, existe: !!el, cache: !vis(el), ligne };
        });
        // On ouvre : la partie s'arrête, le menu ne recouvre que lui-même.
        document.getElementById('chat-btn').style.display = 'block';
        document.getElementById('cam-btn').style.display = 'block';
        document.getElementById('menu-btn').click();
        await att(300);
        const pause = { ouvert: C.estOuvert(), running: g.running, carte: vis(document.getElementById('menu-carte')) };
        // Chaque ligne appuie le bouton d'avant : on remplace son `click` le
        // temps du témoin, et l'on ferme/rouvre entre deux lignes.
        const appuis = [];
        for (const l of LIGNES) {
          const el = l.cible ? document.querySelector(l.cible) : null;
          if (!el) { appuis.push({ cle: l.cle, cible: l.cible, appuye: !!l.repli && !l.cible }); continue; }
          const vrai = el.click; let vu = false;
          el.click = () => { vu = true; };
          if (!C.estOuvert()) document.getElementById('menu-btn').click();
          const ligne = document.querySelector(`.menu-ligne[data-cle='${l.cle}']`);
          const offerte = !!vis(ligne);
          if (ligne && l.cle !== 'ami') ligne.click();
          else if (ligne) { el.style.display = 'block'; C.majLignes(); ligne.click(); el.style.display = ''; }
          el.click = vrai;
          appuis.push({ cle: l.cle, offerte, appuye: vu });
        }
        if (C.estOuvert()) document.getElementById('menu-reprendre').click();
        document.getElementById('chat-btn').style.display = 'none';
        document.getElementById('cam-btn').style.display = 'none';
        await att(200);
        const repris = g.running;
        // Construire : toucher l'écran hors construction ne casse rien ; en
        // construction, si. On retire le cheval (casser ATTAQUE d'abord une bête
        // à portée) et l'on vise un bloc de pierre posé devant les yeux — viser
        // le sol pouvait tomber sur de l'eau, que rien ne casse.
        for (const a of [...am.animals]) am.scene.remove(a.mesh);
        am.animals.length = 0;
        P.pitch = 0;
        const bx = Math.floor(P.pos.x - Math.sin(P.yaw) * 2.5), bz = Math.floor(P.pos.z - Math.cos(P.yaw) * 2.5);
        for (const dy of [0, 1, 2]) g.world.setBlock(bx, Math.floor(P.pos.y) + dy, bz, 3);
        await att(600);
        const tap = async () => {
          const c = document.getElementById('game'), x = innerWidth * 0.62, y = innerHeight * 0.5;
          const t = new Touch({ identifier: 7, target: c, clientX: x, clientY: y });
          c.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], cancelable: true, bubbles: true }));
          await att(60);
          c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t], cancelable: true, bubbles: true }));
          await att(400);
          // casser un bloc qu'on vient de poser ne change pas le NOMBRE de
          // modifications (même clé) : on compte les blocs visés devenus air
          return [0, 1, 2].filter((dy) => g.world.getBlock(bx, Math.floor(P.pos.y) + dy, bz) === 0).length;
        };
        const n0 = 0;
        const n1 = await tap();
        C.construire(true); C.outil(true);
        await att(400);
        const construction = releve();
        // POSER, CASSER, SAUTER DANS UNE COLONNE, ET L'OUTIL ACTIF DANS LA
        // PALETTE DES AUTRES (v533, revue d'écran ligne 4) : les centres x, et
        // la clarté du fond de Casser actif contre celle de Poser au repos.
        {
          const cx = (id) => { const b = document.getElementById(id); if (!b) return null; const r = b.getBoundingClientRect(); return r.width ? r.left + r.width / 2 : null; };
          const fond = (id) => {
            const c = getComputedStyle(document.getElementById(id)).backgroundColor.match(/[\d.]+/g) || [0, 0, 0, 0];
            return { lum: +(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]).toFixed(0), a: c.length > 3 ? +c[3] : 1 };
          };
          construction.outils = { poser: cx('poser-btn'), casser: cx('casser-btn'), sauter: cx('jump-btn'),
            actif: document.getElementById('casser-btn').classList.contains('actif'),
            fondActif: fond('casser-btn'), fondRepos: fond('poser-btn'),
            plein: !!document.querySelector('#casser-btn svg [fill="currentColor"]') };
        }
        const n2 = await tap();
        const volCMs = await enVol(true);
        const volConstruction = releve();
        volConstruction.ms = volCMs;
        await enVol(false);
        // LA BARRE EST EN BAS, ET LE JOYSTICK GARDE LE QUART AU-DESSUS (v503,
        // décision de Max). Trois gestes de l'enfant, dans la même page :
        // le doigt posé dans le quart du joystick tombe sur le canvas (on
        // sonde une grille, `elementFromPoint` ignore ce qui ne prend pas le
        // doigt), ce doigt fait marcher l'enfant, et une case de la barre se
        // touche et se choisit.
        const cv = document.getElementById('game'), hb = document.getElementById('hotbar');
        const bande = hb.getBoundingClientRect();
        const horsCanvas = [];
        const y0 = innerHeight * 0.42, y1 = bande.top - 4;
        for (let i = 0; i <= 5; i++) for (let j = 0; j <= 5; j++) {
          const x = innerWidth * (0.04 + 0.08 * i), y = y0 + (y1 - y0) * j / 5;
          const el = document.elementFromPoint(x, y);
          if (el !== cv) horsCanvas.push([Math.round(x), Math.round(y), el ? el.id || String(el.className) : null]);
        }
        // on recule : devant, il y a la colonne de pierre du témoin d'avant
        const jx = innerWidth * 0.2, jy = (innerHeight * 0.4 + bande.top) / 2;
        const p0 = [P.pos.x, P.pos.z];
        const ta = new Touch({ identifier: 11, target: cv, clientX: jx, clientY: jy });
        cv.dispatchEvent(new TouchEvent('touchstart', { touches: [ta], changedTouches: [ta], cancelable: true, bubbles: true }));
        const tb = new Touch({ identifier: 11, target: cv, clientX: jx, clientY: jy + 50 });
        cv.dispatchEvent(new TouchEvent('touchmove', { touches: [tb], changedTouches: [tb], cancelable: true, bubbles: true }));
        const tm = performance.now(); let marche = 0;
        while (performance.now() - tm < 10000 && (marche = Math.hypot(P.pos.x - p0[0], P.pos.z - p0[1])) < 1.2) await att(200);
        const marcheMs = Math.round(performance.now() - tm);
        cv.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [tb], cancelable: true, bubbles: true }));
        const cases = [...hb.querySelectorAll('.slot:not(.slot-more)')], cible = cases[3];
        const cb = cible.getBoundingClientRect();
        const dessus = document.elementFromPoint(cb.left + cb.width / 2, cb.top + cb.height / 2);
        const atteinte = !!dessus && dessus.closest('.slot') === cible;
        cible.click();
        const choisie = cible.classList.contains('selected');
        const entieres = [...hb.querySelectorAll('.slot')].filter((c) => { const b = c.getBoundingClientRect(); return b.left >= bande.left - 0.5 && b.right <= bande.right + 0.5; }).length;
        const deborde = hb.scrollWidth > hb.clientWidth + 1;
        hb.scrollLeft = 120; const glisse = hb.scrollLeft > 0; hb.scrollLeft = 0;
        const fin = document.getElementById('construction-fin');
        const barre = { bande: { x: Math.round(bande.left), y: Math.round(bande.top), w: Math.round(bande.width), h: Math.round(bande.height) },
          caseMin: Math.round(Math.min(cb.width, cb.height)), entieres, deborde, glisse, defile: getComputedStyle(hb).overflowX,
          horsCanvas, marche: +marche.toFixed(2), marcheMs, atteinte, choisie,
          fin: vis(fin), finMot: (fin.getAttribute('aria-label') || '') + '|' + ((fin.querySelector('.lb') || {}).textContent || ''),
          finLb: vis(fin.querySelector('.lb')), finLbTexte: (fin.querySelector('.lb') || {}).textContent || '',
          finLbCoupe: (() => { const l = fin.querySelector('.lb'); return !l || l.scrollWidth > l.clientWidth + 0.5; })() };
        document.getElementById('construction-fin').click();
        await att(300);
        P.pitch = 0;
        return { vue: [innerWidth, innerHeight], explorer, construction, vol, volConstruction, barre, inventaire, pause, appuis, repris,
          gestes: { explorer: n1 - n0, construction: n2 - n1 }, enConstruction: C.enConstruction() };
      });
      await cmd.close();
      const croise = (a, b) => Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) && Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y);
      // En construction, la barre de blocs vit en bas (v503) : le quart du
      // joystick s'arrête au-dessus d'elle, et rien d'autre n'y entre.
      const juge = (et) => {
        const R = (et && et.R) || {}, k = Object.keys(R), recouvre = [];
        for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) if (croise(R[k[i]], R[k[j]])) recouvre.push(k[i] + '×' + k[j]);
        const bas = R.hotbar ? R.hotbar.y : r.vue[1];
        const joy = k.filter((n) => n !== 'hotbar' && R[n].x < r.vue[0] * 0.45 && R[n].y + R[n].h > r.vue[1] * 0.4 && R[n].y < bas);
        const ronds = k.filter((n) => /-btn$/.test(n)).filter((n) => R[n].w !== R[n].h || R[n].w < 44 || R[n].w > 44);
        return { recouvre, joy, ronds, actions: et ? et.actions.length : 99, lbs: et ? et.lbsVisibles : 99 };
      };
      const ex = juge(r.explorer), co = juge(r.construction);
      verifier(`commandes (${vue.width} × ${vue.height}) : à pied, quatre boutons d'action au plus, ronds de 44 px, sans mot sous eux, rien ne se recouvre ni n'entre dans le quart du joystick`,
        !r.err && ex.recouvre.length === 0 && ex.joy.length === 0 && ex.ronds.length === 0
        && ex.actions >= 3 && ex.actions <= 4 && ex.lbs === 0 && !!r.explorer.R['fun-target'] && !r.explorer.R.hotbar,
        `${r.err || ''} ${JSON.stringify(ex)} pilule attendue ${r.explorer && r.explorer.attendu} ms ${JSON.stringify(r.explorer && r.explorer.R)}`);
      verifier(`commandes (${vue.width} × ${vue.height}) : une seule pilule d'action, et son mot tient sur une ligne sans être coupé`,
        !r.err && r.explorer.pilules.length === 1 && !r.explorer.pilules[0].coupe
        && r.explorer.longue.length === 1 && !r.explorer.longue[0].coupe,
        `${r.err || ''} ${JSON.stringify({ pilules: r.explorer && r.explorer.pilules, longue: r.explorer && r.explorer.longue })}`);
      verifier(`commandes (${vue.width} × ${vue.height}) : en construction, la barre de blocs, Poser et Casser — et toujours rien qui se recouvre`,
        !r.err && co.recouvre.length === 0 && co.joy.length === 0 && co.actions <= 4
        && !!r.construction.R.hotbar && !!r.construction.R['poser-btn'] && !!r.construction.R['casser-btn']
        && !!r.construction.R['construction-pill'] && !r.construction.R['construire-btn'] && !r.enConstruction,
        `${r.err || ''} ${JSON.stringify(co)} ${JSON.stringify(r.construction && r.construction.R)} terminé ${!r.enConstruction}`);
      {
        const O = (r.construction && r.construction.outils) || {};
        const aligne = [O.casser, O.sauter].every((x) => x != null && O.poser != null && Math.abs(x - O.poser) < 2);
        const fa = O.fondActif || {}, fr = O.fondRepos || {};
        verifier(`commandes (${vue.width} × ${vue.height}) : en construction, Poser, Casser et Sauter ont le même x, et Casser actif garde le voile des autres boutons (un anneau, pas un fond blanc) — revue d'écran ligne 4`,
          !r.err && aligne && O.actif && O.plein && Math.abs((fa.lum || 0) - (fr.lum || 0)) < 30 && Math.abs((fa.a || 0) - (fr.a || 0)) < 0.2,
          `${r.err || ''} ${JSON.stringify(O)}`);
      }
      const B = r.barre || {}, bd = B.bande || {}, F = B.fin || {};
      const R2 = (r.construction && r.construction.R) || {};
      const finCroise = ['hotbar', 'poser-btn', 'casser-btn', 'jump-btn', 'down-btn'].filter((n) => R2[n] && B.fin && croise(B.fin, R2[n]));
      verifier(`commandes (${vue.width} × ${vue.height}) : en construction, la barre de blocs est EN BAS, sur presque toute la largeur avec « Terminer » au bout, des cases d'au moins 44 px, et elle défile au doigt`,
        !r.err && bd.y + bd.h >= r.vue[1] * 0.95 && bd.w + (F.w || 0) >= r.vue[0] * 0.9 && B.caseMin >= 44 && B.entieres >= 6
        && (!B.deborde || (B.defile === 'auto' && B.glisse)),
        `${r.err || ''} ${JSON.stringify({ bande: bd, caseMin: B.caseMin, entieres: B.entieres, deborde: B.deborde, defile: B.defile, glisse: B.glisse })}`);
      verifier(`commandes (${vue.width} × ${vue.height}) : en construction, on marche au joystick ET l'on choisit un bloc dans la barre`,
        !r.err && (B.horsCanvas || [1]).length === 0 && B.marche >= 1.2 && B.atteinte && B.choisie,
        `${r.err || ''} ${JSON.stringify({ horsCanvas: B.horsCanvas, marche: B.marche, ms: B.marcheMs, atteinte: B.atteinte, choisie: B.choisie })}`);
      // ON SORT PAR LÀ OÙ L'ON EST ENTRÉ (v520, décision de Max) : en
      // construction, « Terminer » est à l'endroit de Construire — même
      // colonne, les deux boîtes se recouvrent —, il porte son mot ÉCRIT (pas
      // seulement dans aria-label), il ne recouvre ni la barre ni Poser,
      // Casser, Sauter, et l'appuyer fait sortir du mode. Sans dimension.
      const cons = (r.explorer && r.explorer.R && r.explorer.R['construire-btn']) || null;
      const colonne = !!cons && !!B.fin && Math.min(cons.x + cons.w, B.fin.x + B.fin.w) > Math.max(cons.x, B.fin.x);
      const surPlace = !!cons && !!B.fin && croise(cons, B.fin);
      const motVu = !!B.finLb && B.finLb.w > 12 && B.finLb.h > 6 && /^(Terminer|Fini)$/.test((B.finLbTexte || '').trim()) && !B.finLbCoupe;
      verifier(`commandes (${vue.width} × ${vue.height}) : en construction, « Terminer » est à la place de Construire, son mot écrit, sans rien recouvrir, et il fait sortir du mode`,
        !r.err && colonne && surPlace && motVu && /Terminer/.test(B.finMot || '') && finCroise.length === 0
        && F.w <= r.vue[0] * 0.2 && !r.enConstruction,
        `${r.err || ''} ${JSON.stringify({ construire: cons, fin: F, colonne, surPlace, finCroise, mot: B.finMot, lb: B.finLb, texte: B.finLbTexte, coupe: B.finLbCoupe, sorti: !r.enConstruction })}`);
      // Monter (Sauter, qui fait monter en vol) au-dessus de Descendre : le
      // HAUT de l'un au-dessus du haut de l'autre, sans dimension (v265) ; et
      // la même règle que les autres états — rien ne se recouvre, rien dans
      // le quart du joystick.
      const ordre = (et) => {
        const R = (et && et.R) || {}, m = R['jump-btn'], d = R['down-btn'];
        return { monter: m && m.y, descendre: d && d.y, ok: !!m && !!d && m.y < d.y };
      };
      const vo = ordre(r.vol), vc = ordre(r.volConstruction), jv = juge(r.vol), jc = juge(r.volConstruction);
      verifier(`commandes (${vue.width} × ${vue.height}) : en vol, le bouton qui fait monter est AU-DESSUS de celui qui fait descendre, à pied comme en construction`,
        !r.err && vo.ok && vc.ok,
        `${r.err || ''} à pied ${JSON.stringify(vo)} (${r.vol && r.vol.ms} ms) construction ${JSON.stringify(vc)} (${r.volConstruction && r.volConstruction.ms} ms)`);
      verifier(`commandes (${vue.width} × ${vue.height}) : en vol, rien ne se recouvre ni n'entre dans le quart du joystick, à pied comme en construction`,
        !r.err && jv.recouvre.length === 0 && jv.joy.length === 0 && jc.recouvre.length === 0 && jc.joy.length === 0,
        `${r.err || ''} à pied ${JSON.stringify(jv)} construction ${JSON.stringify(jc)}`);
      verifier(`commandes (${vue.width} × ${vue.height}) : toucher l'écran ne casse rien hors construction, et casse en construction`,
        !r.err && r.gestes.explorer === 0 && r.gestes.construction > 0, JSON.stringify(r.gestes));
      if (vue.width === 420) {
        const manque = (r.inventaire || []).filter((i) => !i.existe || !i.cache || !i.ligne);
        verifier('le menu unique remplace les petits boutons — chacun existe encore, hors de l\'écran, et une ligne du menu l\'appuie',
          !r.err && r.inventaire.length >= 9 && manque.length === 0, JSON.stringify(manque.length ? manque : r.inventaire));
        const rate = (r.appuis || []).filter((a) => !a.appuye || a.offerte === false);
        verifier('ouvrir le menu met la partie en pause, chaque ligne appuie son bouton, et « Reprendre » rend la partie',
          !r.err && r.pause.ouvert && r.pause.running === false && !!r.pause.carte && rate.length === 0 && r.repris === true,
          JSON.stringify({ pause: r.pause, rate, repris: r.repris }));
      }
    }

    // DE VRAIES ICÔNES, PLUS UN EMOJI SUR UN BOUTON (v504). Max : « les icônes
    // ne sont pas suffisamment claires, le bouton pour voler n'est pas
    // suffisamment clair, et je veux que tu enlèves les emojis sur les
    // boutons ». Trois choses se mesurent sur une page tactile à la taille de
    // son iPhone : (1) aucun bouton de la page — visible ou rangé, créé par la
    // page ou par le jeu — ne porte un emoji (les émotes, qui SONT des
    // emojis, exceptées) ; (2) chaque bouton rond porte une icône dessinée au
    // trait épais (2,2 au moins sur 24) ou en aplat ; (3) le bouton Voler
    // change d'icône aux commandes d'un avion — Décoller, Se poser — et la
    // retrouve à pied. Rouge sur l'ancien code : ✈️ 🛑 🛞 ⤒ 🐴 🚇 dans les
    // boutons, et des icônes à 1,8.
    const ico = await banc.jouerSeul('Icones', { viewport: { width: 430, height: 932 }, tactile: true, rr: 2 });
    const icones = await ico.evaluate(async () => {
      const att = (ms) => new Promise((f) => setTimeout(f, ms));
      const g = window.__game;
      const em = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u;
      const avecEmoji = () => [...document.querySelectorAll('button')]
        .filter((b) => !b.closest('#emote-row') && em.test(b.textContent))
        .map((b) => `${b.id || b.className} « ${b.textContent.trim().slice(0, 30)} »`);
      const epaisseur = (b) => {
        const svg = b && b.querySelector('svg');
        if (!svg) return 0;
        const plein = [...svg.querySelectorAll('[fill]')].some((n) => n.getAttribute('fill') === 'currentColor');
        const w = Math.max(...[svg, ...svg.querySelectorAll('[stroke-width]')].map((n) => +(n.getAttribute('stroke-width') || 0)));
        return plein ? Math.max(w, 9) : w;
      };
      const RONDS = ['menu-btn', 'jump-btn', 'fly-btn', 'down-btn', 'construire-btn', 'poser-btn', 'casser-btn', 'fm-btn', 'train-btn'];
      const traits = Object.fromEntries(RONDS.map((id) => [id, epaisseur(document.getElementById(id))]));
      // Les pilules : une monture devant soi, puis on lit la pilule.
      const am = g.animalManager;
      for (const a of [...am.animals]) am.scene.remove(a.mesh);
      am.animals.length = 0;
      const P = g.player;
      const cheval = am.invoquer('horse', P.pos.x - Math.sin(P.yaw) * 3, P.pos.z - Math.cos(P.yaw) * 3);
      const t0 = performance.now();
      const rb = document.getElementById('ride-btn');
      while (performance.now() - t0 < 20000 && rb.style.display !== 'block') {
        await att(400);
        if (cheval && cheval.pos) { cheval.pos.x = P.pos.x - Math.sin(P.yaw) * 3; cheval.pos.z = P.pos.z - Math.cos(P.yaw) * 3; }
      }
      const pilule = { texte: rb.textContent.trim(), icone: !!rb.querySelector('svg'), quoi: rb.dataset.quoi || '' };
      // Le bouton Voler aux commandes, par la fonction que la boucle appelle.
      const fly = () => (document.querySelector('#fly-btn .ic') || {}).innerHTML || '';
      const aPied = fly();
      const sauve = { pilote: P.pilote, etat: P.avionEtat, running: g.running };
      P.pilote = { max: 95, kmh: 900 }; P.avionEtat = 'sol';
      window.__majBoutonsVehicule();
      const auSol = fly();
      // LA MANETTE DIT CE QU'ELLE EST (v533, revue d'écran ligne 7) : un mot,
      // des chevrons dans la course, et le doigt tombe toujours sur la
      // manette elle-même, qui capture son pointeur (v262).
      const gb = document.getElementById('gaz-base'), gr = gb.getBoundingClientRect();
      const doigts = [0.08, 0.3, 0.5, 0.7, 0.92].map((f) => document.elementFromPoint(gr.left + gr.width / 2, gr.top + gr.height * f));
      const gaz = { mot: (gb.textContent || '').trim(), chevrons: gb.querySelectorAll('svg path').length,
        voit: gr.width > 0 && gr.height > 0, doigt: doigts.map((e) => (e ? e.id || e.tagName : null)) };
      P.avionEtat = 'vol';
      window.__majBoutonsVehicule();
      const enVol = fly();
      P.pilote = sauve.pilote; P.avionEtat = sauve.etat;
      window.__majBoutonsVehicule();
      const retour = fly();
      document.getElementById('menu-btn').click();
      await att(300);
      const menuEmoji = avecEmoji();
      document.getElementById('menu-reprendre').click();
      return { emojis: avecEmoji(), menuEmoji, traits, pilule, gaz,
        voler: { aPied: !!aPied, auSol: auSol !== aPied && !!auSol, enVol: enVol !== auSol && enVol !== aPied && !!enVol, retour: retour === aPied } };
    });
    await ico.close();
    verifier('la manette des gaz porte son mot et ses chevrons, et le doigt tombe sur elle partout — revue d\'écran ligne 7',
      !!icones.gaz && icones.gaz.voit && /Gaz/.test(icones.gaz.mot) && icones.gaz.chevrons >= 1
        && icones.gaz.doigt.every((d) => d === 'gaz-base'),
      JSON.stringify(icones.gaz));
    verifier('plus un emoji sur un bouton du jeu — HUD, pilules, menu et panneaux',
      icones.emojis.length === 0 && icones.menuEmoji.length === 0,
      JSON.stringify({ emojis: icones.emojis.slice(0, 12), menu: icones.menuEmoji.slice(0, 6) }));
    const fins = Object.entries(icones.traits).filter(([, w]) => !(w >= 2.2)).map(([id, w]) => `${id} ${w}`);
    verifier('chaque bouton rond porte une icône dessinée, au trait épais ou en aplat',
      fins.length === 0, fins.join(' · ') || JSON.stringify(icones.traits));
    verifier('la pilule porte une icône et dit quelle bête — le mot, plus l\'emoji',
      icones.pilule.icone && icones.pilule.quoi === 'horse' && /Monter/.test(icones.pilule.texte) && /Cheval/i.test(icones.pilule.texte),
      JSON.stringify(icones.pilule));
    verifier('Voler a son aile à pied, un avion qui décolle au sol, un avion qui se pose en vol — et retrouve son aile',
      icones.voler.aPied && icones.voler.auSol && icones.voler.enVol && icones.voler.retour, JSON.stringify(icones.voler));

    // LE CONTRASTE DES COMMANDES, SUR LE CIEL DE MIDI ET SUR LA NUIT. Le verre
    // est presque invisible (retour de Max) : c'est exactement ce qui casse un
    // contraste. Le fond effectif se COMPOSE (v276) — les fonds translucides de
    // l'élément et de ses ancêtres, posés sur la couleur du ciel que le jeu
    // dessine. Une icône blanche tient 3:1 (WCAG, éléments graphiques), un
    // texte de pilule 4,5:1.
    const ciel = await banc.jouerSeul('CommandesCiel', { tactile: true, rr: 2 });
    const cont = await ciel.evaluate(async () => {
      const att = (ms) => new Promise((f) => setTimeout(f, ms));
      const g = window.__game;
      const nb = (c) => { const m = (c || '').match(/[\d.]+/g) || []; return m.length < 3 ? null : { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 }; };
      const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const sur = (haut, bas) => ({ r: haut.r * haut.a + bas.r * (1 - haut.a), g: haut.g * haut.a + bas.g * (1 - haut.a), b: haut.b * haut.a + bas.b * (1 - haut.a), a: 1 });
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const fond = (el, sous) => {
        const pile = [];
        for (let n = el; n && n !== document.body; n = n.parentElement) { const c = nb(getComputedStyle(n).backgroundColor); if (c && c.a > 0) pile.push(c); }
        let acc = sous;
        for (const c of pile.reverse()) acc = sur(c, acc);
        return acc;
      };
      const lire = async (fr) => {
        window.__setDayTime(fr);
        let avant = '', stable = 0;
        for (let i = 0; i < 40 && stable < 3; i++) { await att(250); const h = g.scene.background.getHexString(); stable = h === avant ? stable + 1 : 0; avant = h; }
        const h = g.scene.background.getHexString();
        return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1, hex: h };
      };
      // « Terminer » porte une icône (3:1) ET son mot écrit (4,5:1) depuis la
      // v520.
      const icones = ['menu-btn', 'jump-btn', 'fly-btn', 'construire-btn', 'construction-fin'];
      const textes = [['fun-target button', '#ride-btn'], ['gps', '#gps-texte'], ['terminer', '#construction-fin .lb']];
      const out = {};
      for (const [moment, fr] of [['midi', 0.25], ['minuit', 0.75]]) {
        const s = await lire(fr);
        const res = { ciel: s.hex, icones: {}, textes: {} };
        for (const id of icones) { const el = document.getElementById(id); res.icones[id] = +ratio(nb(getComputedStyle(el).color), fond(el, s)).toFixed(2); }
        for (const [nom, sel] of textes) { const el = document.querySelector(sel); res.textes[nom] = +ratio(nb(getComputedStyle(el).color), fond(el, s)).toFixed(2); }
        out[moment] = res;
      }
      return out;
    });
    await ciel.close();
    const bas = (o, barre) => Object.entries(o || {}).filter(([, v]) => !(v >= barre)).map(([k, v]) => `${k} ${v}`);
    const fautes = ['midi', 'minuit'].flatMap((m) => [...bas(cont[m] && cont[m].icones, 3), ...bas(cont[m] && cont[m].textes, 4.5)].map((f) => `${m} : ${f}`));
    verifier('les commandes se lisent sur le ciel de midi comme sur la nuit — icônes 3:1, textes des pilules 4,5:1, fonds translucides composés',
      fautes.length === 0 && !!cont.midi && !!cont.minuit, `${fautes.join(' · ')} ${JSON.stringify(cont)}`);

    // LES ARBRES LOINTAINS SE CHAUFFENT À L'ACCUEIL (v553). Une page prête
    // (`pret`, la chauffe finie), les arbres lointains forcés (`arbresloin=1` :
    // le banc rend en logiciel, où ils sont coupés comme le bâti lointain), et
    // l'on vole à cent blocs au-dessus d'une forêt. Ce que l'enfant voit : des
    // silhouettes d'arbres au loin, et aucune clé de programme neuve entre
    // l'accueil et la forêt — la silhouette partage le matériau du bâti
    // lointain, que `chaufferLeLointain` a compilé. Sur l'ancien code : aucun
    // arbre au loin.
    {
      const cles = () => [...new Set((window.__game.renderer.info.programs || []).map((q) => q.cacheKey))];
      const sylve = await banc.jouerSeul('Sylve', { rr: 4, params: '&arbresloin=1', pret: true });
      await sylve.waitForTimeout(2000);   // le dernier pas de la chauffe suit la flotte d'une image
      const clesAvant = await sylve.evaluate(cles);
      const vol = await sylve.evaluate(async () => {
        const g = window.__game, att = (ms) => new Promise((f) => setTimeout(f, ms));
        const x = -1176, z = -1648;
        g.player.pos.set(x, g.world.terrainHeight(x, z) + 100, z); g.player.vel.set(0, 0, 0);
        g.player.flying = true; g.player.yaw = 0; g.player.pitch = -0.35;
        const t0 = performance.now();
        let arbres = 0;
        while (performance.now() - t0 < 40000) {
          await att(500);
          arbres = g.horizon.arb ? g.horizon.arb.count : 0;
          if (arbres > 100) break;
        }
        const f0 = g.renderer.info.render.frame;
        while (g.renderer.info.render.frame < f0 + 6 && performance.now() - t0 < 60000) await att(200);
        return { arbres, visibles: !!(g.horizon.arb && g.horizon.arb.visible), ms: Math.round(performance.now() - t0) };
      });
      const clesApres = await sylve.evaluate(cles);
      await sylve.close();
      const neuves = clesApres.filter((k) => !clesAvant.includes(k));
      verifier('au-dessus d\'une forêt, le paysage lointain a ses arbres, et aucune clé de programme neuve depuis l\'accueil',
        vol.arbres > 100 && vol.visibles && neuves.length === 0,
        `${JSON.stringify(vol)} · ${neuves.length} clé(s) neuve(s) ${JSON.stringify(neuves.map((k) => k.slice(0, 60)).slice(0, 3))}`);
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
