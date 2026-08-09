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
  const PORT_JEU = 8322, PORT_NUAGE = 9322;
  const nuage = await servirLeNuage(PORT_NUAGE);
  const jeu = await banc.servirLeJeuPour(PORT_JEU);
  const navigateur = await chromium.launch({
    executablePath: banc.trouverChromium(),
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const adresse = `http://127.0.0.1:${PORT_JEU}/index.html`
    + `?cloud=http://127.0.0.1:${PORT_NUAGE}&cloudkey=test&stay=1&rr=2`;

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
      await a.setArret('Marlon', '30');
      await a.setRythme('Marlon', 12);
      return true;
    });
    verifier('le panneau parent écrit sans lever d\'erreur', parLePanneau === true);
    const viaPanneau = await jusqua(async () => {
      const parent = nuage.reglages('Marlon~parent') || {};
      return parent.lang === 'fr' && parent.grade === 2
        && parent.quizStopMin === 30 && parent.sessionMin === 12;
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

    verifier('aucune erreur JavaScript', marlon.erreurs.length === 0,
      JSON.stringify(marlon.erreurs));
  } finally {
    await navigateur.close();
    jeu.close();
    nuage.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ les réglages tiennent, côté enfant comme côté parent');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
