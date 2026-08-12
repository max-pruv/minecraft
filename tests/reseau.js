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

    // Et sur la carte, ce sont des prénoms.
    //
    // La table des autres joueurs est rangée par identifiant de pair, et c'est
    // cette clé qui servait d'étiquette : sous le point bleu, un enfant lisait
    // « 632f7014-f54e-4ab2-9df2-eac67daa1b1c ». Le prénom était pourtant là,
    // juste à côté, depuis toujours.
    const surLaCarte = await hote.evaluate(() => window.__carte.autres().map((a) => a.nom));
    const unIdentifiant = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
    verifier('sur la carte, les autres joueurs portent leur prénom',
      surLaCarte.length === 2 && surLaCarte.every((n) => n && !unIdentifiant.test(n))
      && ['Alice', 'Nina'].every((n) => surLaCarte.includes(n)),
      JSON.stringify(surLaCarte));

    // Un lien en cours d'ouverture n'est pas un joueur : il ne doit jamais
    // apparaître sous la forme d'un bonhomme nommé « … » à l'origine du monde.
    const fantomes = (await vu(alice)).avatars.filter((a) => a.nom === '…' || !a.nom);
    verifier('aucun avatar sans nom', fantomes.length === 0, JSON.stringify(fantomes));

    // --- un seul ciel pour tout le monde --------------------------------------
    //
    // Chaque tablette tirait son heure et sa météo au sort. Deux enfants dans le
    // même monde pouvaient donc décrire le même endroit sans se comprendre :
    // l'un sous la pluie en pleine nuit, l'autre au soleil de midi.
    const ciel = (p) => p.evaluate(() => window.__ciel());
    // On pousse l'horloge de l'hôte à l'autre bout de la journée et on force la
    // pluie : ce sont les deux choses que l'invité doit adopter.
    await hote.evaluate(() => { window.__setDayTime(0.85); window.__setMeteo('rain'); });
    const alignes = await jusqua(async () => {
      const a = await ciel(hote), b = await ciel(alice);
      return b.meteo === a.meteo && Math.abs(a.h - b.h) < 0.03;
    }, 20000);
    const ch = await ciel(hote), ca = await ciel(alice);
    verifier('l\'invité voit le même temps et la même heure que l\'hôte', alignes,
      `hôte ${ch.meteo} ${ch.h.toFixed(2)} · invité ${ca.meteo} ${ca.h.toFixed(2)}`);

    // Et il ne repart pas dans sa propre journée dès qu'on a le dos tourné.
    await dormir(12000);
    const ch2 = await ciel(hote), ca2 = await ciel(alice);
    verifier('et il le reste', ca2.meteo === ch2.meteo && Math.abs(ch2.h - ca2.h) < 0.03,
      `hôte ${ch2.meteo} ${ch2.h.toFixed(2)} · invité ${ca2.meteo} ${ca2.h.toFixed(2)}`);

    // L'invité ne décide de rien : même si sa propre minuterie de météo arrive à
    // échéance, c'est l'hôte qui tranche.
    await alice.evaluate(() => window.__setMeteo('clear'));
    const repris = await jusqua(async () =>
      (await ciel(alice)).meteo === (await ciel(hote)).meteo, 20000);
    verifier('un invité ne change pas le temps pour lui tout seul', repris,
      `hôte ${(await ciel(hote)).meteo} · invité ${(await ciel(alice)).meteo}`);

    // --- un départ propre disparaît des deux côtés ----------------------------
    await nina.close();
    // Quarante secondes, pas vingt-cinq. Une page qui se ferme ne coupe pas
    // toujours son canal proprement : il reste alors les vingt secondes de
    // silence tolérées, plus un battement de cœur pour s'en apercevoir. La
    // limite était posée juste au-dessus de cette somme, et le scénario
    // échouait une fois sur trois sans que rien ne soit cassé.
    await jusqua(async () => (await vu(hote)).compteur === 2 && (await vu(alice)).compteur === 2, 40000);
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

    // --- petites robustesses --------------------------------------------------
    const avant = fautes(alice2).length;
    await alice2.evaluate(() => {
      window.__game.__leaving?.();
      document.getElementById('online-play-btn').click();
    }).catch(() => { /* le clic est justement ce qu'on éprouve */ });
    await dormir(800);
    verifier('« Entrer dans le monde » ne casse rien sans session',
      fautes(alice2).length === avant, JSON.stringify(fautes(alice2).slice(avant)));

    // Alice a quitté : sans cela sa page relance une tentative de reconnexion
    // toutes les trois à vingt secondes jusqu'à la fin de la suite, contre un
    // hôte qui n'existe plus. Ce n'est pas un test, c'est du bruit — et c'est
    // ce bruit qui faisait échouer, une fois sur deux, le monde vide qui suit.
    await alice2.close();


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
    // On referme ce qui a servi. Chaque page laissée ouverte continue de
    // dessiner un monde en trois dimensions à plein régime : à quatre parties
    // vivantes, les minuteurs du navigateur partent en retard et ce sont les
    // scénarios de la fin — ceux qui mesurent des délais — qui en paient le
    // prix. Un test qui échoue parce que la machine peine ne prouve rien.
    await solo.close();
    await enfin.close();

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
    // Et il doit le dire vite. Le jeu tentait de rejoindre, puis d'héberger,
    // et attendait deux fois la même limite avant de conclure : quarante
    // secondes devant « Ouverture du monde… » pour un verdict que la première
    // tentative connaissait déjà. On mesure donc aussi le temps, pas seulement
    // le message — c'est le temps qui était le défaut.
    const t0 = Date.now();
    const dit = await jusqua(async () => /❌/.test(
      await perdu.evaluate(() => document.getElementById('online-status').textContent)), 40000);
    const mis = (Date.now() - t0) / 1000;
    verifier('un serveur de rendez-vous muet le dit, et vite', dit && mis < 20,
      `${mis.toFixed(0)} s · `
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

    // --- un VPN allumé --------------------------------------------------------
    //
    // Constaté à la maison, capture d'écran à l'appui : « ❌ Personne n'a
    // répondu dans ce monde », alors que quelqu'un le tenait bel et bien.
    //
    // Ce que fait un VPN : la signalisation passe — le serveur de rendez-vous
    // répond et sait qui tient quel monde — mais le canal de données entre les
    // deux tablettes ne s'ouvre pas, ou met bien plus de cinq secondes à le
    // faire. Le jeu renonçait donc au bout de cinq secondes, puis annonçait
    // une chose fausse : personne n'a répondu, alors que le code était pris.
    const { p: tenu, code: codeVPN } = await banc.creerMonde('Lou');
    const derriereVPN = await banc.joueur('Sam', { sansPairAPair: true });
    await derriereVPN.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await derriereVPN.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, codeVPN);
    const verdict = await jusqua(async () => derriereVPN.evaluate(
      () => (document.getElementById('online-status').textContent || '').startsWith('❌')), 60000);
    const phrase = await derriereVPN.evaluate(
      () => document.getElementById('online-status').textContent);
    verifier('un VPN ne fait plus dire que le monde est vide',
      verdict && !/Personne n'a répondu/.test(phrase), phrase);
    verifier('et le message dit quoi faire', /VPN/.test(phrase) && phrase.includes(codeVPN), phrase);
    await derriereVPN.close();
    await tenu.close();

    // --- une présentation qui met du temps à passer -----------------------------
    //
    // Signalé à la maison, sans VPN cette fois : deux iPad sur la même
    // connexion, dans le même monde, et chacun seul. Aucune erreur, aucun
    // message.
    //
    // Le canal est bon — les battements de cœur passent, donc le lien n'est
    // jamais jugé mort — mais les présentations, elles, se sont perdues. On
    // relançait deux fois, puis on se taisait pour toujours. Rien ne rattrapait
    // ensuite : ni le battement, qui voit un lien vivant, ni la reconnexion,
    // qui n'a aucune raison de partir.
    //
    // Ici, les présentations sont avalées douze secondes — bien au-delà des six
    // secondes que couvraient les deux anciennes relances.
    const { p: patiente, code: codeLent } = await banc.creerMonde('Théo');
    const lent = await banc.joueur('Zoé', { helloFragile: true });
    // Au premier plan : Chromium bride les minuteurs d'un onglet caché, et le
    // filtre du banc s'installe justement sur un minuteur. Sans cela il
    // arrivait après les présentations qu'il devait avaler — le scénario
    // passait alors sans avoir rien éprouvé, ce que le garde-fou plus bas a
    // fini par attraper.
    await lent.bringToFront();
    await lent.evaluate(() => { window.__avalerHelloSecondes = 11; });
    await lent.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await lent.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, codeLent);
    await dormir(1500);
    await lent.evaluate(() => document.getElementById('online-play-btn')?.click());

    const seRetrouvent = await jusqua(async () => {
      const a = await nomsVus(patiente);
      const b = await nomsVus(lent);
      return a.includes('Zoé') && b.includes('Théo');
    }, 60000);
    verifier('une présentation perdue finit par passer', seRetrouvent,
      JSON.stringify([await nomsVus(patiente), await nomsVus(lent)]));
    const compteFinal = [(await vu(patiente)).compteur, (await vu(lent)).compteur];
    verifier('et le compteur le dit des deux côtés',
      compteFinal.every((n) => n === 2), compteFinal.join('/'));
    // Sans cette garantie, le scénario pourrait passer sans avoir rien éprouvé :
    // c'est déjà arrivé une fois, la fenêtre s'étant écoulée avant la connexion.
    const avalees = await lent.evaluate(() => window.__avalerHelloComptes || 0);
    verifier('et des présentations ont bien été perdues en chemin', avalees >= 2,
      `${avalees} avalées`);
    await lent.close();
    await patiente.close();

    // --- une présentation qui ne passe JAMAIS -----------------------------------
    //
    // L'autre bout du même correctif, et celui qu'on ajoute en dernier parce
    // qu'il éprouve du code écrit pour réparer le précédent : au bout de vingt
    // secondes, on renonce et on COUPE. Reste à prouver que couper laisse le jeu
    // dans un état honnête plutôt que dans un autre limbe — pas de faux
    // compteur, pas d'avatar fantôme, et une reconnexion qui repart.
    const { p: muet2, code: codeMuet } = await banc.creerMonde('Iris');
    const jamais = await banc.joueur('Noé', { helloFragile: true });
    await jamais.bringToFront();
    await jamais.evaluate(() => { window.__avalerHelloSecondes = 600; });
    await jamais.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await jamais.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, codeMuet);
    await dormir(1500);
    await jamais.evaluate(() => document.getElementById('online-play-btn')?.click());
    // Bien au-delà des vingt secondes : le lien doit avoir été coupé et repris
    // au moins une fois, sans que personne n'apparaisse pour autant.
    await dormir(35000);
    const etatMuet = await vu(jamais);
    verifier('un lien jamais présenté ne devient pas un joueur fantôme',
      etatMuet.compteur === 1 && etatMuet.avatars.length === 0,
      `compteur ${etatMuet.compteur} · ${JSON.stringify(etatMuet.avatars)}`);
    // Et le lien est bel et bien REFAIT. Il a fallu trois rédactions pour
    // trouver le bon témoin, et les deux ratées valent d'être dites :
    //
    //   · un drapeau interne de reconnexion ne vaut que l'instant où on le lit ;
    //   · la clé d'une connexion d'invité est l'identifiant de l'hôte, qui ne
    //     change jamais — donc la voir changer était impossible ;
    //   · et le bandeau ne dit rien de la reconnexion, pour une raison qui est
    //     juste : le canal, lui, s'ouvre très bien. Le lien EST « ok ». Ce qui
    //     ne passe pas, c'est la présentation par-dessus. L'enfant lit donc
    //     « Seul·e dans ce monde », ce qui est exact de son point de vue.
    //
    // Ce qu'on suit est la date de présentation de la connexion en cours : elle
    // est posée à chaque nouvelle connexion, et la voir changer prouve qu'on a
    // coupé le lien muet et qu'on en a rouvert un autre.
    const presentations = new Set();
    for (let i = 0; i < 16; i++) {
      const d = await jamais.evaluate(() => {
        const n = window.__game.net;
        if (!n || !n.active) return null;
        const c = [...n.conns.values()][0];
        return c ? c.presenteA || 0 : null;
      });
      if (d) presentations.add(d);
      await dormir(2500);
    }
    verifier('et le lien muet est coupé puis rouvert, au lieu de durer pour toujours',
      presentations.size >= 2, `${presentations.size} présentations successives`);
    const avaleesMuet = await jamais.evaluate(() => window.__avalerHelloComptes || 0);
    verifier('et ce scénario a bien eu quelque chose à faire perdre', avaleesMuet >= 2,
      `${avaleesMuet} avalées`);
    await jamais.close();
    await muet2.close();

    // --- deux enfants ouvrent le même monde en même temps -----------------------
    //
    // Le geste réel d'une fratrie : le même code tapé sur les deux iPad, et
    // « Jouer » pressé dans la même seconde. Aucun des deux ne trouve personne,
    // les deux tentent donc d'ouvrir le monde — un seul peut l'obtenir, et
    // l'autre doit se rabattre sur « rejoindre » sans que l'enfant ait rien à
    // refaire. C'est le chemin le plus court vers deux mondes du même nom,
    // chacun avec un enfant seul dedans.
    const codeCourse = '31415';
    const [unA, unB] = await Promise.all([banc.joueur('Ana'), banc.joueur('Bo')]);
    await Promise.all([unA, unB].map((p) => p.evaluate(() =>
      document.getElementById('online-btn').click())));
    await dormir(400);
    await Promise.all([unA, unB].map((p) => p.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, codeCourse)));
    await dormir(2500);
    await Promise.all([unA, unB].map((p) =>
      p.evaluate(() => document.getElementById('online-play-btn')?.click())));
    const ensemble = await jusqua(async () => {
      const a = await nomsVus(unA), b = await nomsVus(unB);
      return a.includes('Bo') && b.includes('Ana');
    }, 60000);
    verifier('deux enfants qui ouvrent le même monde en même temps se retrouvent',
      ensemble, JSON.stringify([await nomsVus(unA), await nomsVus(unB)]));
    const courseCompte = [(await vu(unA)).compteur, (await vu(unB)).compteur];
    verifier('et il n\'y a bien qu\'un seul monde', courseCompte.every((n) => n === 2),
      courseCompte.join('/'));
    await unA.close();
    await unB.close();

    // --- un monde bien rempli ---------------------------------------------------
    //
    // Le journal de blocs ne part plus avec la présentation mais après elle,
    // précisément pour qu'un gros monde ne retarde pas les retrouvailles. Sans
    // un scénario qui le mesure, cette phrase n'est qu'une intention : on
    // remplit donc le monde de l'hôte, et l'on chronomètre.
    const { p: riche, code: codeRiche } = await banc.creerMonde('Elio');
    const poses = await riche.evaluate(() => {
      const g = window.__game;
      let n = 0;
      for (let x = 0; x < 40; x++) {
        for (let z = 0; z < 40; z++) {
          const y = g.world.terrainHeight(x + 60, z + 60) + 1;
          g.world.setBlock(x + 60, y, z + 60, 5);
          n++;
        }
      }
      return n;
    });
    // On chronomètre à partir du CLIC, pas de la création de la page : sur cette
    // machine, ouvrir un onglet et charger le jeu prend une dizaine de secondes,
    // et les compter ici, c'était mesurer le banc au lieu du jeu.
    const arrivant = await banc.joueur('Fara');
    await arrivant.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    const depart = Date.now();
    await arrivant.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, codeRiche);
    const vite = await jusqua(async () => (await nomsVus(riche)).includes('Fara')
      && (await nomsVus(arrivant)).includes('Elio'), 40000);
    const misRiche = Math.round((Date.now() - depart) / 1000);
    verifier('un monde bien rempli ne retarde pas les retrouvailles',
      vite && misRiche < 25, `${poses} blocs posés · ${misRiche} s`);
    // Et le monde arrive quand même : c'est l'autre moitié de la promesse.
    const recus = await jusqua(async () => arrivant.evaluate(
      () => window.__game.world.edits.size > 1000), 40000);
    verifier('et le monde de l\'hôte arrive bien chez l\'invité', recus,
      String(await arrivant.evaluate(() => window.__game.world.edits.size)));
    await arrivant.close();
    await riche.close();

    // --- la sonde de version dit la vérité --------------------------------------
    //
    // Constaté sur une capture d'écran : « version v128 · à jour » alors que la
    // v130 était publiée. La page demande la dernière version en lisant sw.js —
    // mais le service worker interceptait cette lecture et la servait depuis
    // son propre cache. L'accueil comparait donc la version avec elle-même, et
    // affichait « à jour » pour toujours.
    //
    // Le témoin honnête est le journal du serveur : deux sondes de suite
    // doivent TOUTES DEUX l'atteindre. La première atteint le réseau même sur
    // le code fautif (rien en cache encore) ; c'est la seconde qui le trahit,
    // servie depuis la copie que la première a laissée derrière elle.
    const sonde = await banc.joueur('Vera', { avecSW: true });
    await sonde.evaluate(() => navigator.serviceWorker.ready);
    const controle = await jusqua(async () =>
      sonde.evaluate(() => !!navigator.serviceWorker.controller), 30000);
    const sonder = () => sonde.evaluate(async () => {
      const r = await fetch('./sw.js', { cache: 'no-store' });
      return ((await r.text()).match(/CACHE_VERSION\s*=\s*'([^']+)'/) || [])[1] || null;
    });
    await sonder();
    banc.jeu.hits.length = 0;
    const version2 = await sonder();
    const atteint = banc.jeu.hits.filter((u) => u.includes('sw.js')).length;
    const publiee = (require('fs').readFileSync(require('path').join(__dirname, '..', 'sw.js'), 'utf8')
      .match(/CACHE_VERSION\s*=\s*'([^']+)'/) || [])[1];
    verifier('la sonde de version traverse le service worker jusqu\'au réseau',
      controle && atteint >= 1 && version2 === publiee,
      `contrôlée ${controle} · ${atteint} requête(s) au serveur · lu ${version2}`);
    await sonde.close();

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
