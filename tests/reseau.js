// Le monde partagé, vérifié à deux et à trois navigateurs réels.
//
// Chaque scénario reproduit une panne qui s'est réellement produite chez les
// enfants : un compteur qui annonçait des joueurs invisibles, un enfant que son
// propre monde refusait après une veille, un avatar resté planté là. On mesure
// ce que chacun VOIT, pas ce que le code croit — c'est le désaccord entre les
// deux qui trahissait les défauts.
//
//     cd tests && npm install && npm test
//
// Compter une bonne minute et demie : les délais d'attente doivent dépasser les
// seuils réels du jeu (vingt secondes de silence toléré, cinq de battement),
// sans quoi on ne testerait rien.

const { Banc, vu, nomsVus, endormir, reveiller, dormir, jusqua, relaisSourd } = require('./banc.js');

// Deux messages de PeerJS ne comptent pas comme des fautes, et seulement ceux-là :
//
// — « Could not connect to peer » : la boucle de reconnexion vers un hôte parti,
//   c'est-à-dire précisément le comportement qu'un des scénarios exige ;
// — « readyState is not open » : un lien qui se referme entre la vérification et
//   l'envoi. La course est de l'ordre de la microseconde et ne peut pas être
//   supprimée depuis le JavaScript ; le message perdu l'est sur un lien mourant,
//   que le battement de cœur constate juste après.
// — « ID … is taken » : un échelon voulu de l'ouverture d'un monde. Quand
//   rejoindre échoue, le jeu tente d'ouvrir le monde lui-même ; si quelqu'un
//   tient déjà le code, PeerJS le signale et l'on repart sur « rejoindre ».
//   C'est le mécanisme qui fait que « Jouer » finit toujours par entrer.
//   PeerJS fait précéder ce refus d'un « Aborting! » : c'est la même chose,
//   dite deux fois.
const TOLERE = /Could not connect to peer|readyState is not|is taken|Aborting!/;
const fautes = (p) => p.erreurs.filter((e) => !TOLERE.test(e));

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

(async () => {
  const banc = new Banc();
  await banc.ouvrir();
  try {
    // --- à trois, tout le monde se voit ---------------------------------------
    // Les invités ne sont pas reliés entre eux : leurs positions transitent par
    // l'hôte. C'est le chemin le plus fragile, donc celui qu'on ouvre.
    const { p: hote, code } = await banc.creerMonde('Marlon');
    const alice = await banc.rejoindre('Alice', code);
    const nina = await banc.rejoindre('Nina', code);
    const attendu = JSON.stringify([['Alice', 'Nina'], ['Marlon', 'Nina'], ['Alice', 'Marlon']]);
    await jusqua(async () => JSON.stringify(
      [await nomsVus(hote), await nomsVus(alice), await nomsVus(nina)]) === attendu);

    const trio = [await nomsVus(hote), await nomsVus(alice), await nomsVus(nina)];
    verifier('à trois, chacun voit les deux autres',
      JSON.stringify(trio) === attendu, JSON.stringify(trio));

    const compte = [(await vu(hote)).compteur, (await vu(alice)).compteur, (await vu(nina)).compteur];
    verifier('le compteur dit trois partout', compte.every((n) => n === 3), compte.join('/'));

    // Un lien en cours d'ouverture n'est pas un joueur : il ne doit jamais
    // apparaître sous la forme d'un bonhomme nommé « … » à l'origine du monde.
    const fantomes = (await vu(alice)).avatars.filter((a) => a.nom === '…' || !a.nom);
    verifier('aucun avatar sans nom', fantomes.length === 0, JSON.stringify(fantomes));

    // --- un départ propre disparaît des deux côtés ----------------------------
    await nina.close();
    await jusqua(async () => (await vu(hote)).compteur === 2 && (await vu(alice)).compteur === 2);
    verifier('un départ propre nettoie tout le monde',
      (await vu(hote)).compteur === 2 && (await vu(alice)).compteur === 2
      && !(await nomsVus(hote)).includes('Nina') && !(await nomsVus(alice)).includes('Nina'),
      `hôte ${JSON.stringify(await nomsVus(hote))} · Alice ${JSON.stringify(await nomsVus(alice))}`);

    // --- l'enfant passe à une autre application, puis revient -----------------
    // Le cas le plus courant, et celui qui coupait la partie : les minuteurs
    // gelés ne prouvent rien, et le lien est intact au retour.
    await endormir(alice);
    await dormir(26000);            // bien au-delà des vingt secondes de silence tolérées
    const pendant = await vu(hote);
    verifier('un joueur endormi n\'est pas éjecté',
      pendant.compteur === 2 && (await nomsVus(hote)).includes('Alice'),
      `compteur ${pendant.compteur}, ${JSON.stringify(pendant.conns)}`);

    await reveiller(alice);
    await jusqua(async () => (await vu(alice)).compteur === 2 && (await vu(hote)).compteur === 2);
    verifier('au réveil, la partie continue sans rien redemander',
      (await vu(alice)).compteur === 2 && (await vu(hote)).compteur === 2
      && (await nomsVus(alice)).includes('Marlon'),
      `Alice ${(await vu(alice)).compteur} · hôte ${(await vu(hote)).compteur}`);

    // --- l'appareil ne revient jamais : l'enfant rouvre le jeu ----------------
    // Ici le lien reste ouvert côté hôte mais l'application est morte. L'enfant
    // rouvre le monde depuis la même tablette : il doit être accueilli, pas
    // accusé de jouer déjà ailleurs.
    await endormir(alice);
    await dormir(1000);
    const alice2 = await banc.rejoindre('Alice', code);
    await jusqua(async () => (await vu(alice2)).compteur === 2);
    const retour = await vu(alice2);
    verifier('Alice retrouve son monde après une veille sans retour',
      retour.compteur === 2 && (await nomsVus(alice2)).includes('Marlon'),
      `compteur ${retour.compteur} ${JSON.stringify(await nomsVus(alice2))}`);
    verifier('sans boîte d\'alerte accusatrice', alice2.dialogues.length === 0,
      JSON.stringify(alice2.dialogues));

    // L'ancien appareil relance sa propre reconnexion : il ne doit pas
    // reprendre la place de l'enfant qui vient de rentrer.
    await dormir(25000);
    verifier('la reprise tient dans la durée',
      (await vu(hote)).compteur === 2 && (await vu(alice2)).compteur === 2,
      `hôte ${(await vu(hote)).compteur} · Alice ${(await vu(alice2)).compteur}`);

    // --- l'hôte s'en va -------------------------------------------------------
    await hote.close();
    await jusqua(async () => (await vu(alice2)).compteur === 1, 40000);
    const seule = await vu(alice2);
    verifier('seule après le départ de l\'hôte, et le compteur le dit',
      seule.compteur === 1 && seule.avatars.length === 0,
      `compteur ${seule.compteur}, avatars ${JSON.stringify(await nomsVus(alice2))}`);
    verifier('et le jeu continue d\'essayer de la reconnecter',
      seule.lien === 'reconnexion', String(seule.lien));

    // --- ouvrir un monde vide doit se voir ------------------------------------
    // Le défaut signalé par la famille : on tape un code, tout se passe sans la
    // moindre erreur, et l'enfant joue seul en croyant avoir rejoint l'autre.
    const solo = await banc.rejoindre('Nina', '77777');
    await jusqua(async () => /seul/i.test((await vu(solo)).bandeau));
    const etatSolo = await vu(solo);
    verifier('ouvrir un monde vide le dit franchement',
      /seul/i.test(etatSolo.bandeau) && etatSolo.bandeau.includes('77777'),
      JSON.stringify(etatSolo.bandeau));
    verifier('et le compteur reste honnête', etatSolo.compteur === 1 && etatSolo.avatars.length === 0,
      `compteur ${etatSolo.compteur}`);

    // Quand quelqu'un arrive enfin, l'avertissement s'efface de lui-même.
    const enfin = await banc.rejoindre('Tom', '77777');
    await jusqua(async () => (await vu(solo)).compteur === 2
      && (await nomsVus(solo)).includes('Tom') && (await nomsVus(enfin)).includes('Nina'));
    const apres = await vu(solo);
    verifier('l\'avertissement s\'efface dès qu\'un ami arrive',
      !/seul/i.test(apres.bandeau) && apres.compteur === 2,
      `bandeau ${JSON.stringify(apres.bandeau)}, compteur ${apres.compteur}`);
    verifier('et les deux se voient', (await nomsVus(solo)).includes('Tom')
      && (await nomsVus(enfin)).includes('Nina'),
      `${JSON.stringify(await nomsVus(solo))} / ${JSON.stringify(await nomsVus(enfin))}`);

    // --- un serveur de rendez-vous muet ne doit pas figer le menu -------------
    // Reproduit d'après une capture : le menu restait sur « Ouverture du
    // monde… » indéfiniment. Certains réseaux — hôtels, partages de connexion,
    // portails captifs — acceptent la connexion et ne répondent plus jamais.
    // Sans limite de temps, la promesse d'ouverture ne se règle pas, et
    // l'enfant n'a ni monde, ni erreur, ni rien à faire.
    const muet = require('net').createServer(() => { /* on garde la socket */ });
    await new Promise((ok) => muet.listen(9407, '127.0.0.1', ok));
    const perdu = await banc.joueurVers('Tim', 9407);
    await perdu.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await perdu.evaluate(() => {
      document.getElementById('join-code').value = '30953';
      document.getElementById('join-btn').click();
    });
    const t0 = Date.now();
    const dit = await jusqua(async () => /❌/.test(
      await perdu.evaluate(() => document.getElementById('online-status').textContent)), 40000);
    verifier('un serveur de rendez-vous muet finit par le dire', dit,
      `${((Date.now() - t0) / 1000).toFixed(0)} s · `
      + JSON.stringify(await perdu.evaluate(() => document.getElementById('online-status').textContent)));
    await perdu.close();
    muet.close();

    // --- rouvrir SON monde doit marcher, quoi qu'il arrive --------------------
    // Le parcours de la capture d'écran, et celui qui manquait : on éprouvait
    // « taper un code », jamais « Mes mondes → Jouer ». Deux conditions, la
    // seconde étant celle qui bloquait vraiment la famille : un serveur de
    // rendez-vous qui n'achemine pas les demandes de connexion. Le jeu ne doit
    // pas s'arrêter à un refus — le monde est vide, il l'ouvre.
    const { p: prem, code: sien } = await banc.creerMonde('Zoé');
    const appareil = prem.context();
    const url = prem.url();
    await dormir(1200);
    await prem.close();
    await dormir(1200);
    const retourZoe = await appareil.newPage();
    await retourZoe.goto(url, { waitUntil: 'load' });
    await retourZoe.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await banc.rouvrirSonMonde(retourZoe, sien);
    const rentree = await jusqua(async () => retourZoe.evaluate(
      () => document.getElementById('overlay').style.display === 'none'), 30000);
    verifier('rouvrir son propre monde depuis la liste', rentree,
      JSON.stringify(await retourZoe.evaluate(() => document.getElementById('online-status').textContent)));
    await retourZoe.close();

    const arreterSourd = await relaisSourd(9417, 9418);
    const sourd = await banc.joueurVers('Ilan', 9417);
    await sourd.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await sourd.evaluate(() => {
      document.getElementById('join-code').value = '30953';
      document.getElementById('join-btn').click();
    });
    const malgre = await jusqua(async () => sourd.evaluate(
      () => document.getElementById('overlay').style.display === 'none'), 30000);
    verifier('un serveur qui avale les demandes n\'empêche pas d\'entrer', malgre,
      JSON.stringify(await sourd.evaluate(() => document.getElementById('online-status').textContent)));
    await sourd.close();
    arreterSourd();

    // --- petites robustesses --------------------------------------------------
    const avant = fautes(alice2).length;
    await alice2.evaluate(() => {
      window.__game.__leaving?.();
      document.getElementById('online-play-btn').click();
    }).catch(() => { /* le clic est justement ce qu'on éprouve */ });
    await dormir(800);
    verifier('« Entrer dans le monde » ne casse rien sans session',
      fautes(alice2).length === avant, JSON.stringify(fautes(alice2).slice(avant)));

    // Filet final : rien ne doit avoir cassé en silence pendant tout ce parcours.
    const bruit = banc.pages.flatMap((p) => fautes(p).map((e) => `${p.prenom}: ${e}`));
    verifier('aucune erreur JavaScript de bout en bout', bruit.length === 0, JSON.stringify(bruit));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ le monde partagé tient dans tous les cas éprouvés');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
