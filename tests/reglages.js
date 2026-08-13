// Les réglages : ceux de l'enfant, ceux du parent, et la frontière entre les deux.
//
// Tous ces scénarios viennent de pannes constatées à la maison : un réglage
// parental qui « ne s'enregistrait pas », une langue de quiz qui revenait toute
// seule à la précédente, une partie en ligne mise en pause qu'on ne pouvait plus
// reprendre. Aucune n'était visible sans regarder ce que le serveur contient
// VRAIMENT — d'où le petit Supabase de poche de nuage.js.
//
//     cd tests && npm install && npm run reglages

const path = require('path');
const { chromium } = require('playwright-core');
const { servirLeNuage } = require('./nuage.js');
const banc = require('./banc.js');

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}
// Attendre qu'une chose devienne vraie plutôt que d'attendre longtemps.
async function jusqua(cond, limiteMs = 25000, pas = 500) {
  const fin = Date.now() + limiteMs;
  for (;;) {
    if (await cond()) return true;
    if (Date.now() > fin) return false;
    await dormir(pas);
  }
}

(async () => {
  const PORT_JEU = 8322, PORT_NUAGE = 9322, PORT_PAIRS = 9522;
  const nuage = await servirLeNuage(PORT_NUAGE);
  const jeu = await banc.servirLeJeuPour(PORT_JEU);
  // Inviter un ami suppose un vrai monde en ligne : le serveur de rendez-vous
  // du banc en fournit un, local, sans rien devoir à l'extérieur.
  const pairs = await banc.servirLesPairsPour(PORT_PAIRS);
  const navigateur = await chromium.launch({
    executablePath: banc.trouverChromium(),
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const adresse = `http://127.0.0.1:${PORT_JEU}/index.html`
    + `?cloud=http://127.0.0.1:${PORT_NUAGE}&cloudkey=test&stay=1&rr=2`
    + `&peerhost=127.0.0.1:${PORT_PAIRS}`;

  async function joueur(prenom) {
    const ctx = await navigateur.newContext({ viewport: { width: 420, height: 760 } });
    const p = await ctx.newPage();
    p.erreurs = [];
    p.on('pageerror', (e) => p.erreurs.push(e.message));
    await p.addInitScript((prenom) => {
      localStorage.setItem('web-minecraft-profile-v1', JSON.stringify({ name: prenom, lookIdx: 0 }));
      localStorage.setItem('wm-notif-propose', JSON.stringify({ n: 9, t: Date.now() }));
      if (navigator.serviceWorker) {
        navigator.serviceWorker.register = () => Promise.reject(new Error('désactivé pour les tests'));
      }
    }, prenom);
    await p.goto(adresse, { waitUntil: 'load' });
    await p.waitForFunction(() => window.__game, null, { timeout: 90000 });
    return p;
  }

  try {
    // ================= 1. la consigne parentale survit à l'enfant =============
    // Le défaut d'origine : la tablette réécrit le document de réglages entier
    // toutes les quinze secondes, avec SA valeur. Le réglage du parent était
    // donc consciencieusement écrasé dans le quart de minute qui suivait.
    nuage.poserReglages('Marlon', { lang: 'both', grade: 1 });
    nuage.poserReglages('Marlon~parent', { sessionMin: 5 });
    const marlon = await joueur('Marlon');
    await jusqua(async () => (await marlon.evaluate(() => window.__game.edu.sessionMinutes())) === 5);
    verifier('le rythme du serveur est appliqué au lancement',
      (await marlon.evaluate(() => window.__game.edu.sessionMinutes())) === 5);

    // le parent change le rythne pendant que l'enfant joue
    nuage.poserReglages('Marlon~parent', { sessionMin: 20 });
    const tenu = await jusqua(async () => (nuage.reglages('Marlon~parent') || {}).sessionMin === 20, 30000);
    verifier('la tablette n\'écrase plus le réglage du parent', tenu,
      `serveur : ${JSON.stringify((nuage.reglages('Marlon~parent') || {}).sessionMin)}`);

    // et l'enfant l'adopte sans avoir à relancer le jeu
    const adopte = await jusqua(
      async () => (await marlon.evaluate(() => window.__game.edu.sessionMinutes())) === 20, 90000);
    verifier('et l\'enfant l\'adopte sans relancer le jeu', adopte,
      `dans le jeu : ${await marlon.evaluate(() => window.__game.edu.sessionMinutes())} min`);

    // ================= 2. la langue choisie remonte au serveur ===============
    // Le choix partait bien au serveur — c'est la lecture des réglages, qui
    // arrive une fraction de seconde après l'ouverture, qui le reprenait
    // aussitôt. Mesuré : trois cents millisecondes suffisaient.
    await marlon.evaluate(() => {
      const b = document.querySelector('.pb-toggle[data-lang="fr"]');
      b.click();
    });
    const langue = await jusqua(async () => (nuage.reglages('Marlon') || {}).lang === 'fr');
    verifier('la langue choisie part au serveur', langue,
      `serveur : ${JSON.stringify((nuage.reglages('Marlon') || {}).lang)}`);

    // le niveau scolaire aussi
    await marlon.evaluate(() => {
      const s = document.getElementById('grade-select');
      s.value = '3';
      s.dispatchEvent(new Event('change'));
    });
    const niveau = await jusqua(async () => (nuage.reglages('Marlon') || {}).grade === 3);
    verifier('le niveau scolaire aussi', niveau,
      `serveur : ${JSON.stringify((nuage.reglages('Marlon') || {}).grade)}`);

    // et le changement de langue n'a pas emporté la consigne du parent
    verifier('sans emporter la consigne du parent au passage',
      (nuage.reglages('Marlon~parent') || {}).sessionMin === 20,
      JSON.stringify((nuage.reglages('Marlon~parent') || {}).sessionMin));

    // Ce que l'enfant constate vraiment, ce n'est pas un réglage enregistré,
    // c'est la langue des questions qu'on lui pose. On tire donc pour de bon.
    const cats = await marlon.evaluate(() => {
      const vues = {};
      for (let i = 0; i < 60; i++) {
        const q = window.__game.edu.pickQuestion();
        if (q) vues[q.category] = (vues[q.category] || 0) + 1;
      }
      return vues;
    });
    verifier('en français, plus aucune question d\'anglais',
      !cats.English, JSON.stringify(cats));

    // …et le choix survit à un redémarrage, servi depuis le serveur.
    await marlon.reload({ waitUntil: 'load' });
    await marlon.waitForFunction(() => window.__game, null, { timeout: 90000 });
    const apresRelance = await jusqua(async () => (await marlon.evaluate(
      () => window.__game.edu.__prefs().lang)) === 'fr');
    verifier('et il survit au redémarrage', apresRelance,
      `au redémarrage : ${await marlon.evaluate(() => window.__game.edu.__prefs().lang)}`);

    // ================= 3. deux appareils ouverts en même temps ===============
    // Le second iPad de la maison, resté allumé sur le menu, réécrit lui aussi
    // les réglages toutes les quinze secondes — avec SA langue, la plus
    // ancienne. C'est ainsi qu'un choix fait sur une tablette se défaisait tout
    // seul quelques secondes plus tard, sans que personne n'y touche.
    const autreIpad = await joueur('Marlon');
    await dormir(2000);
    await marlon.evaluate(() => document.querySelector('.pb-toggle[data-lang="en"]').click());
    const tientAdeux = await jusqua(async () => (nuage.reglages('Marlon') || {}).lang === 'en');
    verifier('un choix fait sur une tablette part au serveur', tientAdeux,
      JSON.stringify((nuage.reglages('Marlon') || {}).lang));
    // on laisse largement le temps à l'autre appareil de pousser sa version
    await dormir(20000);
    verifier('et l\'autre tablette ne le défait pas',
      (nuage.reglages('Marlon') || {}).lang === 'en',
      `serveur : ${JSON.stringify((nuage.reglages('Marlon') || {}).lang)}`);
    verifier('elle s\'aligne même dessus',
      (await autreIpad.evaluate(() => window.__game.edu.__prefs().lang)) === 'en',
      await autreIpad.evaluate(() => window.__game.edu.__prefs().lang));
    await autreIpad.close();

    // ================= 4. le parent règle la langue et le niveau =============
    // Ces deux-là, l'enfant peut aussi les changer depuis son écran : deux mains
    // écrivent au même endroit. C'est la date du dernier choix qui tranche, et
    // c'est ce qui doit empêcher la tablette de réimposer sa version.
    nuage.poserReglages('Marlon', {
      ...nuage.reglages('Marlon'), lang: 'both', grade: 5,
      majProfil: (nuage.reglages('Marlon').majProfil || 0) + 1,   // strictement plus récent
    });
    const suivi = await jusqua(async () => (await marlon.evaluate(
      () => window.__game.edu.__prefs().lang)) === 'both', 60000);
    verifier('la langue réglée par le parent arrive sur la tablette', suivi,
      await marlon.evaluate(() => window.__game.edu.__prefs().lang));
    verifier('le niveau scolaire aussi',
      (await marlon.evaluate(() => JSON.parse(localStorage.getItem('web-minecraft-profile-v1')).grade)) === 5,
      String(await marlon.evaluate(() => JSON.parse(localStorage.getItem('web-minecraft-profile-v1')).grade)));
    // et la tablette ne repart pas en sens inverse à l'envoi suivant
    await dormir(20000);
    verifier('et la tablette ne le défait pas ensuite',
      (nuage.reglages('Marlon') || {}).lang === 'both' && (nuage.reglages('Marlon') || {}).grade === 5,
      `serveur : ${JSON.stringify({ lang: nuage.reglages('Marlon').lang, grade: nuage.reglages('Marlon').grade })}`);

    // Et depuis l'espace parent pour de bon : on actionne les vrais menus du
    // tableau, pas seulement l'écriture qu'ils déclenchent.
    const parLePanneau = await marlon.evaluate(async () => {
      const a = window.__game.admin;
      await a.setProfil('Marlon', { lang: 'fr' }, 'langue : Français');
      await a.setProfil('Marlon', { grade: 2 }, 'niveau : CE1');
      await a.setQuiz('Marlon', 'p30');
      return true;
    });
    verifier('le panneau parent écrit sans lever d\'erreur', parLePanneau === true);
    const viaPanneau = await jusqua(async () => {
      const parent = nuage.reglages('Marlon~parent') || {};
      return parent.lang === 'fr' && parent.grade === 2
        && parent.quizStopMin === 30 && parent.sessionMin === 10;
    });
    // Tout ce que pose le parent va dans SON document. C'est ce qui le met hors
    // de portée de la tablette, qui réécrit le sien toutes les quinze secondes.
    verifier('chaque réglage atterrit dans le document du parent', viaPanneau,
      JSON.stringify(nuage.reglages('Marlon~parent')));
    const suiviPanneau = await jusqua(async () => (await marlon.evaluate(() => ({
      lang: window.__game.edu.__prefs().lang, min: window.__game.edu.sessionMinutes(),
      arret: window.__game.edu.arretApresSecondes,
      grade: JSON.parse(localStorage.getItem('web-minecraft-profile-v1')).grade,
    }))).lang === 'fr', 60000);
    verifier('et la tablette suit le panneau', suiviPanneau,
      JSON.stringify(await marlon.evaluate(() => ({
        lang: window.__game.edu.__prefs().lang, min: window.__game.edu.sessionMinutes(),
        arret: window.__game.edu.arretApresSecondes,
        grade: JSON.parse(localStorage.getItem('web-minecraft-profile-v1')).grade }))));

    // Combien de temps entre la décision du parent et son effet sur la tablette.
    // C'est ce délai que l'on mesure ici, pas seulement le fait qu'il finisse
    // par arriver : debout à côté de l'enfant, quinze secondes de silence font
    // douter du réglage et donner un second tour de menu.
    const debut = Date.now();
    await marlon.evaluate(async () => {
      await window.__game.admin.setQuiz('Marlon', '5');
    });
    const vite = await jusqua(
      async () => (await marlon.evaluate(() => window.__game.edu.sessionMinutes())) === 5, 15000, 200);
    const delai = Date.now() - debut;
    verifier('une décision du parent prend effet en quelques secondes',
      vite && delai < 6000, `${(delai / 1000).toFixed(1)} s`);

    // ================= 5. arrêter les questions après N minutes ==============
    const edu = async (expr) => marlon.evaluate(expr);
    await marlon.evaluate(() => { window.__game.edu.setArretApres(30); });
    verifier('sous le seuil, les questions continuent',
      (await edu(() => { window.__game.edu.today().play = 10 * 60; return window.__game.edu.quizArrete(); })) === false);
    verifier('au-delà du seuil, elles s\'arrêtent',
      (await edu(() => { window.__game.edu.today().play = 31 * 60; return window.__game.edu.quizArrete(); })) === true);
    verifier('« aucune question » vaut dès la première seconde',
      (await edu(() => {
        window.__game.edu.setArretApres(0);
        window.__game.edu.today().play = 0;
        return window.__game.edu.quizArrete();
      })) === true);
    verifier('« toujours » rétablit le comportement d\'origine',
      (await edu(() => {
        window.__game.edu.setArretApres(undefined);
        window.__game.edu.today().play = 999 * 60;
        return window.__game.edu.quizArrete();
      })) === false);

    // la consigne arrive bien du serveur, comme le rythme
    await marlon.evaluate(() => { window.__game.edu.setArretApres(undefined); });
    nuage.poserReglages('Marlon~parent', { ...nuage.reglages('Marlon~parent'), quizStopMin: 15 });
    const arret = await jusqua(async () => (await marlon.evaluate(
      () => window.__game.edu.arretApresSecondes)) === 15 * 60, 90000);
    verifier('l\'arrêt des questions vient du serveur lui aussi', arret,
      `dans le jeu : ${await marlon.evaluate(() => window.__game.edu.arretApresSecondes)}`);

    // ================= 6. reprendre une partie mise en pause =================
    // Depuis un monde en ligne, la pause était sans retour : « Jouer en local »
    // basculait vers l'autre monde et rien ne ramenait à celui qu'on quittait.
    await marlon.evaluate(() => document.getElementById('play-btn').click());
    await dormir(1200);
    await marlon.evaluate(() => document.getElementById('pause-btn').click());
    await dormir(500);
    const reprise = await marlon.evaluate(() => {
      const b = document.getElementById('resume-btn');
      return { visible: !!b && b.style.display !== 'none',
        menu: document.getElementById('overlay').style.display };
    });
    verifier('en pause, un bouton propose de reprendre',
      reprise.visible && reprise.menu === 'flex', JSON.stringify(reprise));

    await marlon.evaluate(() => document.getElementById('resume-btn').click());
    await dormir(800);
    verifier('et il ramène bien dans la partie',
      (await marlon.evaluate(() => document.getElementById('overlay').style.display)) === 'none');

    // --- la version de chaque tablette, visible depuis l'espace parent -------
    //
    // Une tablette restée sur une vieille version explique bien des choses :
    // un correctif qui « n'a rien changé », une carte qui ne zoome pas. Encore
    // faut-il pouvoir le constater sans avoir la tablette en main.
    const versionVue = await jusqua(async () => {
      const p2 = nuage.reglages('Marlon') || {};
      return !!(p2.live && p2.live.version);
    }, 30000);
    const enregistree = ((nuage.reglages('Marlon') || {}).live || {}).version;
    verifier('la version de la tablette part au serveur avec sa présence',
      versionVue && /^v\d+$/.test(String(enregistree)), String(enregistree));

    const affichee = await marlon.evaluate(() => {
      const l = { nom: 'Marlon', appareils: new Set(['a']), live: { version: 'v99', monde: null, joue: true, joueurs: 0 }, vu: null };
      window.__version = 'v99';
      return window.__adminPresence ? window.__adminPresence(l) : null;
    });
    verifier('et l\'espace parent l\'affiche', affichee === null || /v99/.test(affichee),
      String(affichee).slice(0, 120));

    // Un scénario précédent a posé un arrêt de quiz (quizStopMin 15). Le
    // retirer du document du parent doit suffire — et c'est un scénario à part
    // entière : une consigne RETIRÉE ne se retirait jamais en cours de partie,
    // la clé absente laissant l'ancienne valeur en mémoire. Un parent qui
    // rendait les quiz à l'enfant ne les rendait donc pas, jusqu'au
    // redémarrage du jeu.
    const consignesQuiz = { ...(nuage.reglages('Marlon~parent') || {}) };
    delete consignesQuiz.quizStopMin;
    nuage.poserReglages('Marlon~parent', consignesQuiz);
    const rendu = await jusqua(async () => (await marlon.evaluate(
      () => window.__game.edu.arretApresSecondes)) === null, 30000);
    verifier('retirer l\'arrêt depuis l\'espace parent rend les quiz sans relancer',
      rendu, `arretApresSecondes = ${await marlon.evaluate(
        () => window.__game.edu.arretApresSecondes)}`);

    // Le prochain quiz, en direct dans l'espace parent. C'est la contre-épreuve
    // du réglage de rythme : le jour où le panneau affichait « dix minutes »
    // pendant que le compteur en tournait six, rien ne permettait de s'en
    // apercevoir sans regarder par-dessus l'épaule de l'enfant.
    await marlon.evaluate(() => {
      const e = window.__game.edu;
      e.today().libreJusqua = 0;        // pas de répit : un quiz viendra…
      e.quizDue = false;
      e.remaining = e.sessionSeconds;   // …mais pas tout de suite. Un quiz déjà
      // ouvert met le jeu en pause, et quizDans serait nul à bon droit :
      // c'est l'intervalle qu'on mesure, pas l'écran de quiz.
      document.getElementById('play-btn').click();
    });
    await marlon.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    await marlon.evaluate(() => window.__game.__pushPresence());
    const compteVu = await jusqua(async () => {
      const p2 = (nuage.reglages('Marlon') || {}).live || {};
      return Number.isFinite(p2.quizDans);
    }, 30000);
    const quizDans = ((nuage.reglages('Marlon') || {}).live || {}).quizDans;
    const temoin = await marlon.evaluate(() => {
      const g = window.__game, e = g.edu;
      return { running: g.running, free: e.quizFree(), arrete: e.quizArrete(),
        remaining: Math.round(e.remaining), direct: (g.__presenceNow || (() => null))() };
    });
    verifier('la tablette annonce le prochain quiz avec sa présence',
      compteVu && quizDans > 0 && quizDans <= 30 * 60,
      `dans ${quizDans} s · témoin ${JSON.stringify(temoin)}`);
    const ligneQuiz = await marlon.evaluate(() => {
      const l = { nom: 'Marlon', appareils: new Set(['a']), vu: null,
        live: { version: 'v99', monde: null, joue: true, joueurs: 0, quizDans: 240 } };
      return window.__adminPresence ? window.__adminPresence(l) : null;
    });
    verifier('et l\'espace parent dit « quiz dans 4 min »',
      ligneQuiz !== null && /quiz dans 4 min/.test(ligneQuiz),
      String(ligneQuiz).slice(0, 160));
    await marlon.evaluate(() => document.getElementById('home-btn').click());
    await dormir(500);

    // --- retirer un monde de sa liste ---------------------------------------
    //
    // Signalé à la maison : « quand on supprime un monde qu'on ne veut plus,
    // en ligne il ne se supprime pas ». Il disparaît bien de l'écran, puis il
    // revient tout seul quelques secondes plus tard — parce que la liste des
    // mondes est fusionnée avec celle du serveur par UNION, et qu'une union
    // ne sait pas représenter une absence voulue. Le monde effacé revenait
    // donc du nuage, avec ses blocs, sur cette tablette comme sur l'autre.
    await marlon.evaluate(() => {
      localStorage.setItem('web-minecraft-worlds-v1', JSON.stringify([
        { code: '424242', t: Date.now() }, { code: '515151', t: Date.now() - 1000 },
      ]));
      const blocs = JSON.parse(localStorage.getItem('web-minecraft-edits-v3') || '{}');
      blocs['424242'] = { '10,40,10': [3, Date.now()] };
      localStorage.setItem('web-minecraft-edits-v3', JSON.stringify(blocs));
    });
    await marlon.evaluate(() => window.__game.profileSync.push());
    const monteAuNuage = await jusqua(async () =>
      ((nuage.etat('Marlon') || {}).worlds || []).some((w) => w.code === '424242'), 20000);
    verifier('le monde figure d\'abord dans le profil en ligne', monteAuNuage,
      JSON.stringify(((nuage.etat('Marlon') || {}).worlds || []).map((w) => w.code)));

    // On refait la liste à l'écran, puis on clique la croix du premier monde,
    // exactement comme l'enfant.
    const retire = await marlon.evaluate(async () => {
      window.gameConfirm = () => Promise.resolve(true);
      document.getElementById('online-btn').click();
      await new Promise((r) => setTimeout(r, 300));
      const croix = document.querySelector('#recent-worlds .world-chip .world-del');
      if (!croix) return 'pas de croix';
      croix.click();
      await new Promise((r) => setTimeout(r, 600));
      return JSON.parse(localStorage.getItem('web-minecraft-worlds-v1') || '[]').map((w) => w.code).join(',');
    });
    verifier('la croix retire le monde de l\'écran', retire === '515151', String(retire));

    // Et maintenant l'épreuve : la synchronisation suivante ne doit pas le
    // ramener, ni sur cette tablette, ni dans le document du serveur.
    await marlon.evaluate(() => window.__game.profileSync.pull());
    await dormir(1500);
    const revenu = await marlon.evaluate(() =>
      JSON.parse(localStorage.getItem('web-minecraft-worlds-v1') || '[]').map((w) => w.code));
    verifier('et il ne revient pas du nuage', !revenu.includes('424242'), JSON.stringify(revenu));

    const auNuage = ((nuage.etat('Marlon') || {}).worlds || []).map((w) => w.code);
    const blocsRestants = Object.keys(((nuage.etat('Marlon') || {}).edits || {}));
    verifier('le serveur l\'oublie aussi, avec ses blocs',
      !auNuage.includes('424242') && !blocsRestants.includes('424242'),
      `mondes ${JSON.stringify(auNuage)} · blocs ${JSON.stringify(blocsRestants)}`);

    // L'autre tablette de l'enfant doit l'apprendre : c'est là que la panne se
    // voyait le mieux, un monde effacé le matin et revenu le soir.
    const autre = await joueur('Marlon');
    const propre = await jusqua(async () => {
      const l = await autre.evaluate(() =>
        JSON.parse(localStorage.getItem('web-minecraft-worlds-v1') || '[]').map((w) => w.code));
      return !l.includes('424242');
    }, 30000);
    verifier('et l\'autre tablette ne le ressuscite pas', propre,
      JSON.stringify(await autre.evaluate(() =>
        JSON.parse(localStorage.getItem('web-minecraft-worlds-v1') || '[]').map((w) => w.code))));
    await autre.close();

    // Une pierre tombale n'est pas définitive : retaper le code doit tout
    // ramener. Sans cela, un enfant qui se trompe de croix perd son monde pour
    // de bon — et c'est justement la crainte qui empêche de ranger sa liste.
    await marlon.evaluate(() => window.__game.__reprendreMonde('424242'));
    await marlon.evaluate(() => window.__game.profileSync.push());
    await dormir(800);
    await marlon.evaluate(() => window.__game.profileSync.pull());
    await dormir(1200);
    const revenuVoulu = await marlon.evaluate(() =>
      JSON.parse(localStorage.getItem('web-minecraft-worlds-v1') || '[]').map((w) => w.code));
    verifier('mais retaper le code le ramène', revenuVoulu.includes('424242'),
      JSON.stringify(revenuVoulu));

    // --- inviter un ami qui joue ailleurs ------------------------------------
    //
    // Le compteur du monde ne dit que ce qui se passe ICI. Un enfant seul dans
    // son monde ne pouvait pas savoir que son frère était devant sa tablette,
    // ni le lui demander autrement qu'en criant dans le couloir. La présence
    // était pourtant déjà écrite — chaque tablette la pose dans ses réglages —
    // mais seul l'espace parent la lisait.
    //
    // Le parcours est suivi d'un bout à l'autre, sur deux tablettes : Alice
    // joue de son côté, Marlon ouvre un monde, la voit, l'invite, et elle
    // arrive. C'est le seul scénario qui prouve quelque chose : chacune des
    // moitiés prise séparément marchait déjà.
    const alice = await joueur('Alice');
    await alice.evaluate(() => {
      window.__game.edu.today().libreJusqua = 86400;
      document.getElementById('play-btn').click();
    });
    await alice.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    await alice.evaluate(() => window.__game.__pushPresence());
    const presente = await jusqua(async () => !!((nuage.reglages('Alice') || {}).live));
    verifier('la tablette d\'Alice dit au serveur qu\'elle est là', presente,
      JSON.stringify((nuage.reglages('Alice') || {}).live));

    // Marlon ouvre un monde en ligne, comme un enfant le fait : le menu, puis
    // le bouton, puis « Jouer ».
    await marlon.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await marlon.evaluate(() => document.getElementById('host-btn').click());
    await marlon.waitForFunction(
      () => document.getElementById('room-code').textContent.trim().length >= 4,
      null, { timeout: 40000 });
    const codeMarlon = await marlon.evaluate(() =>
      document.getElementById('room-code').textContent.trim());
    await marlon.evaluate(() => document.getElementById('online-play-btn').click());
    await dormir(1500);

    const listeAmis = await marlon.evaluate(async () => {
      await window.__listerLesAmis();
      return [...document.querySelectorAll('#pp-amis .pp-row')].map((r) => r.textContent);
    });
    verifier('Marlon voit qu\'Alice est connectée ailleurs',
      listeAmis.some((t) => t.includes('Alice')), JSON.stringify(listeAmis));

    const envoyee = await marlon.evaluate(() => window.__inviter('Alice'));
    const auServeur = await jusqua(async () =>
      (nuage.reglages('Alice~invit') || {}).code === codeMarlon);
    verifier('un bouton suffit à l\'inviter', envoyee && auServeur,
      JSON.stringify(nuage.reglages('Alice~invit')));

    // Et voici ce qui compte : la tablette d'Alice l'apprend toute seule, sans
    // qu'elle ait rien à ouvrir ni à rafraîchir.
    const panneauOuvert = await jusqua(async () => alice.evaluate(() =>
      getComputedStyle(document.getElementById('invit-panel')).display !== 'none'), 20000);
    const texte = await alice.evaluate(() =>
      `${document.getElementById('invit-txt').textContent} ${document.getElementById('invit-code').textContent}`);
    verifier('la tablette d\'Alice l\'annonce sans rien lui demander',
      panneauOuvert && texte.includes('Marlon') && texte.includes(codeMarlon), texte);

    await alice.evaluate(() => document.getElementById('invit-rejoindre').click());
    const arrivee = await jusqua(async () => alice.evaluate(() => {
      const n = window.__game.net;
      return !!(n && n.active && n.code);
    }), 45000);
    const ouEstElle = await alice.evaluate(() =>
      (window.__game.net && window.__game.net.code) || 'nulle part');
    verifier('« Rejoindre » l\'emmène dans le monde de Marlon',
      arrivee && ouEstElle === codeMarlon, `${ouEstElle} (attendu ${codeMarlon})`);

    // Une invitation ne doit se montrer qu'une fois : la boucle relit le même
    // document toutes les deux secondes, et sans mémoire de la dernière vue le
    // panneau se rouvrait sans cesse par-dessus la partie.
    await alice.evaluate(() => document.getElementById('invit-plus-tard').click());
    await dormir(5000);
    const revenue = await alice.evaluate(() =>
      getComputedStyle(document.getElementById('invit-panel')).display !== 'none');
    verifier('et elle ne se remontre pas en boucle', !revenue);

    // --- le rythme des questions ---------------------------------------------
    //
    // Constaté à la maison : « Marlon a enchaîné des questions sans beaucoup de
    // temps de jeu ». Trois causes trouvées en creusant, chacune éprouvée ici.
    //
    // La première : chaque premier lancement — profil neuf, appareil neuf,
    // données effacées — commençait par un quiz avant la première seconde de
    // jeu, parce qu'une dette jamais écrite était confondue avec une dette de
    // zéro.
    const neuf = await joueur('Basile');
    const auDepart = await neuf.evaluate(() => {
      const e = window.__game.edu;
      return { quizDue: e.quizDue, remaining: Math.round(e.remaining), session: e.sessionSeconds };
    });
    verifier('le tout premier lancement ne commence pas par un quiz',
      !auDepart.quizDue && auDepart.remaining === auDepart.session,
      JSON.stringify(auDepart));
    verifier('et l\'intervalle d\'usine est bien de dix minutes',
      auDepart.session === 600, `${auDepart.session} s`);

    // Ce que le panneau parent AFFICHE pour un enfant jamais configuré doit
    // être ce que sa tablette FAIT. Constaté à la maison : « le compteur tourne
    // toutes les six minutes alors qu'il est configuré à dix sur l'espace des
    // parents » — or il n'était configuré nulle part, aucun document ~parent
    // n'existait. Le panneau affichait SA valeur par défaut (10), la tablette
    // tournait sur SA valeur d'usine (6) : deux constantes dans deux fichiers,
    // qui avaient divergé. Basile n'a aucun réglage : les deux nombres doivent
    // être le même.
    const coherent = await neuf.evaluate(() => ({
      panneau: window.__adminQuizChoisi ? window.__adminQuizChoisi(undefined, undefined) : null,
      tablette: String(window.__game.edu.sessionMinutes()),
    }));
    verifier('pour un enfant jamais configuré, le panneau dit ce que fait la tablette',
      coherent.panneau !== null && coherent.panneau === coherent.tablette,
      JSON.stringify(coherent));

    // La deuxième : le temps de jeu est cumulatif à travers les modes. On joue
    // 200 secondes en local, on ouvre un monde en ligne, et le quiz suivant ne
    // tombe qu'une fois les dix minutes CUMULÉES écoulées — pas avant, pas à
    // la bascule. Le temps est simulé par le vrai chemin du jeu, une seconde
    // à la fois.
    const enLocal = await neuf.evaluate(() => {
      const e = window.__game.edu;
      let tombe = -1;
      document.getElementById('play-btn').click();
      for (let t = 1; t <= 200; t++) { e.update(1, true); if (e.quizActive && tombe < 0) tombe = t; }
      return { tombe, remaining: Math.round(e.remaining) };
    });
    await neuf.evaluate(() => document.getElementById('home-btn').click());
    await dormir(600);
    await neuf.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await neuf.evaluate(() => document.getElementById('host-btn').click());
    await neuf.waitForFunction(
      () => document.getElementById('room-code').textContent.trim().length >= 4,
      null, { timeout: 40000 });
    await neuf.evaluate(() => document.getElementById('online-play-btn').click());
    await dormir(1500);
    const enLigne = await neuf.evaluate(() => {
      const e = window.__game.edu;
      let tombe = -1;
      for (let t = 1; t <= 500; t++) { e.update(1, true); if (e.quizActive && tombe < 0) tombe = t; }
      return { tombe };
    });
    const cumule = 200 + enLigne.tombe;
    verifier('les dix minutes se cumulent du local à l\'en ligne',
      enLocal.tombe === -1 && cumule >= 590 && cumule <= 615,
      `rien en local (200 s), quiz en ligne à ${enLigne.tombe} s — cumul ${cumule} s`);

    // La troisième : l'enfant finit sa série, l'écran de victoire s'affiche —
    // et l'iPad recharge la page avant qu'il touche « Continuer » (iOS le fait
    // sans prévenir). La dette n'était réglée qu'au clic : il recevait une
    // série entière de plus. On répond aux vraies questions, par les vrais
    // boutons.
    await neuf.evaluate(() => { const e = window.__game.edu; e.remaining = 0; });
    await neuf.waitForFunction(() => window.__game.edu.quizActive, null, { timeout: 15000 });
    for (let q = 0; q < 30; q++) {
      const victoire = await neuf.evaluate(() => !!document.querySelector('.quiz-continue'));
      if (victoire) break;
      await dormir(1700);   // le délai anti-clic-au-hasard, puis l'animation
      await neuf.evaluate(() => {
        const e = window.__game.edu;
        const btns = [...document.querySelectorAll('#quiz-options .quiz-opt')];
        if (e.current && btns[e.current.answerIndex]) btns[e.current.answerIndex].click();
      });
    }
    const dette = await neuf.evaluate(() => {
      window.__game.edu.save();
      return JSON.parse(localStorage.getItem('web-minecraft-edu-v1') || '{}').remaining;
    });
    await neuf.reload({ waitUntil: 'load' });
    await neuf.waitForFunction(() => window.__game, null, { timeout: 90000 });
    const auRetour = await neuf.evaluate(() => {
      const e = window.__game.edu;
      return { quizDue: e.quizDue, remaining: Math.round(e.remaining) };
    });
    verifier('finir sa série puis recharger ne redonne pas un quiz',
      dette > 500 && !auRetour.quizDue && auRetour.remaining > 500,
      `enregistré ${dette} · au retour ${JSON.stringify(auRetour)}`);
    await neuf.close();

    // --- la pastille « Temps libre » et les photos -----------------------------
    //
    // Deux retours d'écran de téléphone. « 🎨 Temps libre » s'affichait en
    // permanence quand les quiz sont arrêtés — une pastille qui n'apprend
    // jamais rien. Et le toast de la photo montrait « (menu 🏆) », un bouton
    // qui n'existe plus depuis que les records ont déménagé dans l'atelier.
    nuage.poserReglages('Alice~parent', { sessionMin: 10, quizStopMin: 0 });
    await jusqua(async () => (await alice.evaluate(
      () => window.__game.edu.arretApresSecondes)) === 0, 30000);
    await alice.evaluate(() => document.getElementById('play-btn').click());
    await alice.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    await dormir(1500);
    const pastille = await alice.evaluate(() =>
      getComputedStyle(document.getElementById('edu-timer')).display);
    verifier('quiz arrêtés : la pastille « Temps libre » disparaît',
      pastille === 'none', `display ${pastille}`);

    const photo = await alice.evaluate(() => {
      document.querySelector('.fun-btn[title="Photo"]').click();
      return document.getElementById('toast').textContent;
    });
    verifier('le toast de la photo montre le vrai chemin',
      /Atelier/.test(photo) && !/🏆/.test(photo), photo);
    const galerie = await alice.evaluate(async () => {
      document.querySelector('.fun-btn[title="Atelier"]').click();
      document.querySelector('.fun-tab[data-t="photos"]').click();
      await new Promise((r) => setTimeout(r, 300));
      return {
        photos: document.querySelectorAll('.photo-grid .ph').length,
        garder: document.querySelectorAll('.photo-grid .garder').length,
      };
    });
    verifier('chaque souvenir a son bouton « garder »',
      galerie.photos >= 1 && galerie.garder === galerie.photos, JSON.stringify(galerie));

    // --- l'espace parent filtre par enfant et par période ---------------------
    //
    // « Voir un enfant en particulier », et « les 7 ou 30 derniers jours » :
    // les données existaient — une ligne par enfant, appareil et JOUR — mais le
    // panneau n'en montrait que l'agrégat d'aujourd'hui et de toujours.
    const j = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    nuage.poserTemps({ name: 'Marlon', device_id: 'd1', day: j(0), play: 600, quiz: 60, correct: 5, wrong: 1 });
    nuage.poserTemps({ name: 'Marlon', device_id: 'd1', day: j(3), play: 1200, quiz: 120, correct: 8, wrong: 2 });
    nuage.poserTemps({ name: 'Marlon', device_id: 'd1', day: j(10), play: 1800, quiz: 0, correct: 0, wrong: 0 });
    nuage.poserTemps({ name: 'Alice', device_id: 'd2', day: j(0), play: 300, quiz: 30, correct: 3, wrong: 0 });

    const panneau = await marlon.evaluate(async () => {
      const a = window.__game.admin;
      a.mount();
      await a.load();
      const sel = a.el.querySelector('#adm-filtre-enfant');
      return {
        enfants: [...sel.options].map((o) => o.value).filter(Boolean),
        lignes: a.el.querySelectorAll('#adm-rows tr').length,
      };
    });
    verifier('la liste déroulante propose chaque enfant',
      panneau.enfants.includes('Marlon') && panneau.enfants.includes('Alice'),
      JSON.stringify(panneau.enfants));
    // Attrapé par ce scénario à sa première exécution : le document de service
    // des invitations (« Alice~invit ») apparaissait comme un enfant de plus.
    verifier('et aucun document de service ne s\'y glisse',
      panneau.enfants.every((n) => !n.includes('~')), JSON.stringify(panneau.enfants));

    const filtre = await marlon.evaluate(async () => {
      const a = window.__game.admin;
      // la période : 7 derniers jours
      const per = a.el.querySelector('#adm-filtre-periode');
      per.value = '7'; per.dispatchEvent(new Event('change'));
      // l'enfant : Marlon seul
      const sel = a.el.querySelector('#adm-filtre-enfant');
      sel.value = 'Marlon'; sel.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 200));
      return {
        lignes: a.el.querySelectorAll('#adm-rows tr').length,
        entete: a.el.querySelector('#adm-th-periode').textContent,
        detailJours: [...a.el.querySelectorAll('#adm-detail tbody tr td:first-child')].map((td) => td.textContent),
        detailTexte: a.el.querySelector('#adm-detail').textContent,
      };
    });
    verifier('l\'enfant choisi reste seul dans le tableau',
      filtre.lignes === 1 && /7 jours/i.test(filtre.entete),
      JSON.stringify({ lignes: filtre.lignes, entete: filtre.entete }));
    verifier('son détail montre les jours de la période, et eux seuls',
      filtre.detailJours.includes(j(0)) && filtre.detailJours.includes(j(3))
      && !filtre.detailJours.includes(j(10)) && /8 justes · 2 faux/.test(filtre.detailTexte),
      JSON.stringify(filtre.detailJours));
    await marlon.evaluate(() => { const a = window.__game.admin; a.el.style.display = 'none'; });

    // --- la version d'une tablette éteinte reste lisible ---------------------
    //
    // Alice s'était connectée deux jours plus tôt : sa présence, avec sa
    // version, dormait dans son document — et l'espace parent la jetait parce
    // qu'elle n'était plus « fraîche ». Le parent lisait « version inconnue »
    // pour une tablette dont la version était parfaitement connue, et ne
    // pouvait pas voir qu'elle était restée en arrière.
    nuage.poserReglages('Zoé', { live: { at: Date.now() - 2 * 86400000, device: 'dz',
      monde: null, joue: false, joueurs: 0, version: 'v901' } });
    const horsLigne = await marlon.evaluate(async () => {
      const a = window.__game.admin;
      a.mount();
      await a.load();
      const sel = a.el.querySelector('#adm-filtre-enfant');
      sel.value = ''; sel.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 200));
      const ligne = [...a.el.querySelectorAll('#adm-rows tr')]
        .find((tr) => tr.textContent.includes('Zoé'));
      a.el.style.display = 'none';
      return ligne ? ligne.innerHTML : null;
    });
    verifier('la version d\'une tablette éteinte reste lisible deux jours après',
      !!horsLigne && /v901/.test(horsLigne) && !/version inconnue/.test(horsLigne),
      String(horsLigne).slice(0, 160));

    verifier('aucune erreur JavaScript', marlon.erreurs.length === 0 && alice.erreurs.length === 0,
      JSON.stringify([...marlon.erreurs, ...alice.erreurs]));
  } finally {
    await navigateur.close();
    jeu.close();
    pairs.close();
    nuage.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ les réglages tiennent, côté enfant comme côté parent');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
