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

const { Banc, vu, nomsVus, endormir, reveiller, dormir, jusqua, relaisSourd, souffler } = require('./banc.js');
const { servirLeNuage } = require('./nuage.js');

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
// Trois messages de PeerJS supplémentaires ne comptent pas comme des fautes :
// ce sont exactement les CONDITIONS du scénario sans courtier — un serveur de
// rendez-vous injoignable. Les compter en fautes reviendrait à reprocher au
// jeu la panne qu'on lui demande de traverser.
const TOLERE = /Could not connect to peer|readyState is not|is taken|Aborting!|Lost connection to server|Could not get an ID from the server|Error retrieving ID/;
const fautes = (p) => p.erreurs.filter((e) => !TOLERE.test(e));

const echecs = [];
// COMBIEN DE TEMPS CHAQUE TÉMOIN A-T-IL COÛTÉ.
//
// Cette suite est la plus longue du portail — 29 min 46 s sur 83, mesuré en
// v223 — et personne ne savait pourquoi. Ni les attentes écrites en dur
// (123 s, soit 7 %), ni le coût d'ouvrir ses dix-sept pages de jeu (6 s
// pièce, mesuré) ne l'expliquent. Le seul relevé qui tranche est celui-ci,
// et il ne coûte rien.
let _dernier = Date.now();
function verifier(nom, ok, detail = '') {
  const dt = Math.round((Date.now() - _dernier) / 1000);
  _dernier = Date.now();
  console.log(`${ok ? '✅' : '❌'} [${String(dt).padStart(3)} s] ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

(async () => {
  const banc = new Banc();
  await banc.ouvrir();
  // Le relais de secours passe par le nuage : il faut donc un nuage. On ne
  // lance PAS un second navigateur pour autant — deux Chromium sur quatre
  // cœurs suffisaient à faire tomber la suite entière. C'est le joueur, pas
  // le banc, qui reçoit l'adresse du nuage.
  const nuageRelais = await servirLeNuage(9721);
  const AVEC_NUAGE = { portNuage: 9721 };
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

    // UN ENFANT QUI CHARGE SON MONDE N'EST PAS UN ENFANT PARTI (v266).
    //
    // C'est la cause, enfin mesurée, du rouge qui allait et venait sur les
    // DEUX arbres depuis la v259 : « à trois, chacun voit les deux autres »
    // rendait [["Alice"],["Marlon"],["Alice","Marlon"]] une fois sur deux.
    // Relevé à la sonde (`scratchpad/v266/sonde-famine.cjs`) : le fil
    // principal du troisième invité est bloqué VINGT-NEUF SECONDES dans une
    // SEULE tâche pendant que son monde se charge — pas médian de son
    // minuteur de 100 ms : 100 ms, pire tour : 29 128 ms. Il n'émet rien,
    // il ne reçoit rien, et l'hôte le retire à 22 s de silence alors que son
    // lien est `open` et son canal `open`.
    //
    // ON PROVOQUE LE BLOCAGE AU LIEU DE L'ATTENDRE. Attendre qu'une page
    // rame, c'est le pile ou face qui a coûté six versions ; une boucle
    // synchrone de vingt-cinq secondes rend la MÊME situation à tous les
    // coups, et elle est plus courte que ce que la sonde a mesuré. Le
    // minuteur la lance et rend la main tout de suite : `evaluate` ne peut
    // pas attendre une page qu'il vient de geler.
    //
    // Ce que le témoin exige est ce qu'un enfant voit : Nina reste là,
    // pour l'hôte ET pour Alice, pendant tout le gel — et elle n'a jamais
    // eu besoin de revenir.
    const geler = (p, ms) => p.evaluate((ms) => {
      setTimeout(() => { const t = Date.now(); while (Date.now() - t < ms) { /* le fil est pris */ } }, 0);
    }, ms);
    await geler(nina, 25000);
    // On relève PENDANT le gel, après la fenêtre de vingt secondes qui
    // décidait du retrait : c'est le seul instant où le défaut existe.
    await dormir(24000);
    const pendantLeGel = [await nomsVus(hote), await nomsVus(alice)];
    verifier('un enfant dont la tablette charge son monde n\'est pas retiré de la partie',
      JSON.stringify(pendantLeGel) === JSON.stringify([['Alice', 'Nina'], ['Marlon', 'Nina']]),
      JSON.stringify(pendantLeGel));
    // Et quand il rend la main, rien n'a à se reconstruire : il était là.
    await jusqua(async () => JSON.stringify(
      [await nomsVus(hote), await nomsVus(alice), await nomsVus(nina)]) === attendu, 30000);
    const apresLeGel = [await nomsVus(hote), await nomsVus(alice), await nomsVus(nina)];
    verifier('et il retrouve les deux autres sans avoir eu à revenir',
      JSON.stringify(apresLeGel) === attendu, JSON.stringify(apresLeGel));

    // Un lien en cours d'ouverture n'est pas un joueur : il ne doit jamais
    // apparaître sous la forme d'un bonhomme nommé « … » à l'origine du monde.
    const fantomes = (await vu(alice)).avatars.filter((a) => a.nom === '…' || !a.nom);
    verifier('aucun avatar sans nom', fantomes.length === 0, JSON.stringify(fantomes));

    // LE GPS D'UN INVITÉ TRAVERSE L'HÔTE (v406). La v388 éprouvait l'hôte et
    // un invité ; entre DEUX invités, la destination n'existe que dans la
    // position RELAYÉE (`rpos`), et c'est le chemin que la v374 avait déjà
    // oublié pour l'histoire des chocs. Nina choisit Rome : Alice, qui n'a
    // jamais eu de lien avec elle, doit voir « Nina va à Rome » — et la
    // proposition ne touche pas son GPS (elle n'en a pas). Rouge sur une copie
    // où `rpos` ne lit pas `g` : rien n'arrive chez Alice.
    const gpsRelaye = { proposee: null, ms: null, gpsAlice: null };
    {
      const rome = await nina.evaluate(async () => (await import('./src/mondes.js')).positionDe('rome'));
      const t0 = Date.now();
      await nina.evaluate((r) => window.__carte.surGPS(r.x, r.z, 'Rome'), rome);
      const vue = await jusqua(async () => !!(await alice.evaluate(() => window.__gpsAmi && window.__gpsAmi())), 30000);
      gpsRelaye.ms = vue ? Date.now() - t0 : null;
      gpsRelaye.proposee = await alice.evaluate(() => {
        const p = window.__gpsAmi ? window.__gpsAmi() : null; const el = document.getElementById('gps-ami-texte');
        return p ? { qui: p.qui, nom: p.nom, texte: el ? el.textContent : '' } : null;
      });
      gpsRelaye.gpsAlice = await alice.evaluate(() => (window.__gps() ? window.__gps().nom : null));
      await alice.evaluate(() => document.getElementById('gps-ami-non')?.click());
      await nina.evaluate(() => document.getElementById('gps-stop')?.click());
    }
    verifier('le GPS d\'un invité est proposé à l\'autre invité, à travers l\'hôte',
      !!gpsRelaye.proposee && gpsRelaye.proposee.qui === 'Nina' && gpsRelaye.proposee.nom === 'Rome'
      && /Nina va à Rome/.test(gpsRelaye.proposee.texte) && gpsRelaye.gpsAlice === null,
      JSON.stringify(gpsRelaye));

    // --- l'ami au volant est vu dans sa voiture, et l'on monte avec lui (v253)
    //
    // Max : « en multijoueur, on ne voit pas si un user est dans une voiture,
    // il est piéton alors qu'il est dans une voiture. Aussi permets que
    // plusieurs joueurs rentrent dans un moyen de transport : le premier
    // conduit, les autres restent passagers. » Marlon prend le volant d'une
    // voiture posée devant lui ; chez Alice, l'avatar de Marlon doit être
    // ASSIS dans une voiture dessinée (enfant de son maillage), pas debout.
    // Puis Alice se place à côté, appuie sur « Monter avec Marlon », et quand
    // Marlon roule trois secondes sans qu'elle touche à rien, elle suit.
    // Sur l'ancien code, pas de voiture chez Alice, pas de bouton.
    const idDe = (page, nom) => page.evaluate((nom) => {
      for (const [id, rp] of window.__game.remotePlayers) if (rp.name === nom) return id;
      return null;
    }, nom);
    const volant = await hote.evaluate(async () => {
      const g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
      g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5);
      await dodo(1500);
      document.getElementById('ride-btn').click();
      await dodo(800);
      const a = g.fun.montureConduite && g.fun.montureConduite();
      return { auVolant: !!a, flotte: a && a.mesh && a.mesh.userData ? a.mesh.userData.flotte : null };
    });
    const marlonChezAlice = await idDe(alice, 'Marlon');
    const dansSaVoiture = (id) => alice.evaluate((id) => {
      const rp = window.__game.remotePlayers.get(id);
      if (!rp) return { absent: true };
      return { vehicule: !!rp.vehicule, cle: rp.vehicule ? rp.vehicule.cle : null,
        assis: !!(rp.vehicule && rp.mesh.parent === rp.vehicule.mesh) };
    }, id);
    await jusqua(async () => (await dansSaVoiture(marlonChezAlice)).assis === true, 20000);
    const vuParAlice = await dansSaVoiture(marlonChezAlice);
    verifier('au volant, l\'ami est vu dans sa voiture, pas à pied',
      volant.auVolant && vuParAlice.assis === true, JSON.stringify({ volant, vuParAlice }));

    // LE VOLANT ET LA GLISSE VOYAGENT AVEC LA VOITURE (v397). Marlon tourne le
    // volant à fond (le joystick, l'arrêt suffit : le volant se braque même
    // sans rouler) et sa voiture glisse — la dérive est FIGÉE à 0,2 le temps
    // de la mesure, sans quoi il faudrait rouler vite dans un virage sur un
    // banc qui rend deux images par seconde. Chez Alice, la copie de la
    // voiture de Marlon porte les deux nombres. Sur l'ancien code, rien.
    await hote.evaluate(() => {
      const P = window.__game.player;
      P.touchMove.s = 1;
      Object.defineProperty(P, 'derive', { configurable: true, get: () => 0.2, set: () => {} });
    });
    const volantVu = () => alice.evaluate((id) => {
      const rp = window.__game.remotePlayers.get(id);
      const u = rp && rp.vehicule ? rp.vehicule.mesh.userData : null;
      return u ? { braquage: u.braquage, derive: u.derive } : null;
    }, marlonChezAlice);
    await jusqua(async () => { const v = await volantVu(); return !!(v && v.braquage > 0.9 && v.derive > 0.15); }, 20000);
    const vuVolant = await volantVu();
    const chezMarlon = await hote.evaluate(() => {
      const P = window.__game.player; const b = P.braquage;
      P.touchMove.s = 0; delete P.derive; P.derive = 0;
      return { braquage: +(b || 0).toFixed(2) };
    });
    verifier('au volant, l\'ami voit aussi les roues braquées et la glisse de sa voiture',
      !!vuVolant && vuVolant.braquage > 0.9 && Math.abs(vuVolant.derive - 0.2) < 0.01,
      JSON.stringify({ chezMarlon, chezAlice: vuVolant }));

    const chezHote = await hote.evaluate(() => ({ x: window.__game.player.pos.x, y: window.__game.player.pos.y, z: window.__game.player.pos.z }));
    // Les bêtes ne voyagent pas par le réseau : chaque page a les siennes, et
    // une bête montable à moins de huit blocs devant Alice PASSE AVANT la
    // voiture de l'ami (c'est le choix de `fun.js`, et il est juste). Au
    // portail de la v257, un cerf né près du point d'apparition a rendu
    // « 🦌 Monter » à la place de « Monter avec Marlon » — un rouge de hasard,
    // pas de code. On vide donc AUSSI les bêtes de la page d'Alice, comme on
    // l'a fait chez l'hôte, avant de la poser à côté de la voiture.
    await alice.evaluate((p) => {
      const g = window.__game;
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      g.player.pos.set(p.x + 3, p.y, p.z); g.player.vel.set(0, 0, 0);
    }, chezHote);
    const boutonPassager = () => alice.evaluate(() => {
      const b = document.getElementById('ride-btn');
      return { texte: b.textContent, visible: b.style.display !== 'none' };
    });
    await jusqua(async () => { const b = await boutonPassager(); return b.visible && /Monter avec/.test(b.texte); }, 15000);
    const bouton = await boutonPassager();
    await alice.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(1000);
    const passagere = await alice.evaluate(() => {
      const g = window.__game; const p = g.fun.passagerDe ? g.fun.passagerDe() : null;
      return p ? { de: p.de, s: p.s } : null;
    });
    const aliceAvant = await alice.evaluate(() => ({ x: window.__game.player.pos.x, z: window.__game.player.pos.z }));
    // ON CONDUIT JUSQU'À AVOIR ROULÉ, PAS PENDANT TROIS SECONDES (v272).
    // `main.js` borne `dt` à un vingtième : avec DEUX pages ouvertes le banc
    // rend deux images par seconde, donc trois secondes de temps réel font un
    // tiers de seconde de jeu — la voiture n'a pas fini d'accélérer. Mesuré au
    // portail de la v272 : 0,58 bloc pour une barre à un, là où la sonde en
    // mesure 4,4 sur une page seule, même code. C'est le piège de la v270, une
    // troisième fois : un verdict qui compte des blocs pendant une durée FIXE
    // mesure la cadence du banc. On attend le RÉSULTAT, borné, et le temps
    // qu'il a pris entre dans le message.
    const conduite = await hote.evaluate(async () => {
      const g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      const x0 = g.player.pos.x, z0 = g.player.pos.z;
      g.player.keys.add('KeyW');
      let ms = 0, parcouru = 0;
      while (ms < 20000 && parcouru < 2.5) {
        await dodo(250); ms += 250;
        parcouru = Math.hypot(g.player.pos.x - x0, g.player.pos.z - z0);
      }
      g.player.keys.delete('KeyW');
      return { ms, parcouru: +parcouru.toFixed(2) };
    });
    await dormir(800);
    const aliceApres = await alice.evaluate(() => ({ x: window.__game.player.pos.x, z: window.__game.player.pos.z }));
    const hoteApres = await hote.evaluate(() => ({ x: window.__game.player.pos.x, z: window.__game.player.pos.z }));
    const suivi = +Math.hypot(aliceApres.x - aliceAvant.x, aliceApres.z - aliceAvant.z).toFixed(2);
    const ecart = +Math.hypot(aliceApres.x - hoteApres.x, aliceApres.z - hoteApres.z).toFixed(2);
    const roule = +Math.hypot(hoteApres.x - chezHote.x, hoteApres.z - chezHote.z).toFixed(2);
    verifier('et l\'on monte en passager : la voiture de l\'ami nous emmène',
      /Monter avec/.test(bouton.texte) && !!passagere && roule > 1 && suivi > 1 && ecart < 4,
      JSON.stringify({ bouton: bouton.texte, passagere, roule, suivi, ecart, conduite }));
    const aliceChezHote = await idDe(hote, 'Alice');
    const assise = await hote.evaluate((id) => {
      const g = window.__game; const rp = g.remotePlayers.get(id); const a = g.fun.montureConduite && g.fun.montureConduite();
      return { passager: rp ? rp.passager : null, assise: !!(rp && a && rp.mesh.parent === a.mesh) };
    }, aliceChezHote);
    verifier('et le conducteur voit son passager assis dans sa voiture', assise.assise === true, JSON.stringify(assise));
    // on redescend, on range : la suite continue à pied
    await alice.evaluate(() => { const g = window.__game; if (g.fun.passagerDe && g.fun.passagerDe()) document.getElementById('ride-btn').click(); });
    await hote.evaluate(() => { const g = window.__game; if (g.fun.montureConduite && g.fun.montureConduite()) document.getElementById('ride-btn').click(); });
    await dormir(500);

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
    //
    // ON PROVOQUE LE CAS QUI ROUGISSAIT (v393), on ne l'attend pas (v233). Au
    // portail, le lien de Nina restait chez l'hôte canal `open`, ICE
    // `connected`, silence 74 s : la page partie, le transport n'avait rien
    // dit, et un pair sondable se garde 90 s (v266). C'est aussi la tablette
    // qu'iOS suspend au lieu de la tuer. Nina fait donc ce que fait `pagehide`
    // (`net.stop()`) avec un transport qui reste debout, puis se fige. Sur
    // l'ancien code, rien n'est envoyé : 0 nettoyage en 60 s, deux fois sur
    // deux (`sonde-depart-transport-muet.cjs`) ; ici l'adieu part, ≈ 1 s.
    await nina.evaluate(() => {
      const n = window.__game.net;
      n.peer.destroy = () => {};
      for (const c of n.conns.values()) if (c.conn) c.conn.close = () => {};
      n.stop();
      setTimeout(() => { const t = Date.now(); while (Date.now() - t < 60000) { /* suspendue */ } }, 50);
    });
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
    await nina.close().catch(() => {});
    // --- le passager entre par la portière, et l'ami la voit s'ouvrir (v377)
    //
    // Le passager d'un ami (v253) était collé au siège d'un coup. Il marche
    // désormais jusqu'à la portière DROITE, l'ouvre, s'assied, la referme —
    // et le conducteur voit SA portière s'ouvrir, sur sa tablette, par un
    // message court (`portiere`). Lou joue la séquence (`embarq: 1`) ; Marlon
    // conduit, sur une page qui la saute. On lit les DEUX pages au même
    // instant, relevé par relevé (v305) : la phase de Lou, et l'angle de la
    // portière droite de la voiture de Marlon, lu chez Marlon. Sur l'ancien
    // code, Lou est passagère d'un coup et la portière de Marlon ne bouge pas.
    const lou = await banc.rejoindre('Lou', code, { embarq: 1 });
    await jusqua(async () => (await nomsVus(hote)).includes('Lou') && (await nomsVus(lou)).includes('Marlon'), 30000);
    const volantLou = await hote.evaluate(async () => {
      const g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
      const a = g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5, false, { flotte: 'amg-gt-black-series.glb' });
      for (let i = 0; i < 80 && !(a && a.mesh.userData.modele); i++) await dodo(100);
      document.getElementById('ride-btn').click();
      await dodo(800);
      const m = g.fun.montureConduite && g.fun.montureConduite();
      return { auVolant: !!m, modele: !!(m && m.mesh.userData.modele), x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z };
    });
    const marlonChezLou = await idDe(lou, 'Marlon');
    await jusqua(async () => lou.evaluate((id) => { const rp = window.__game.remotePlayers.get(id); return !!(rp && rp.vehicule && rp.vehicule.mesh.userData.modele); }, marlonChezLou), 20000);
    await lou.evaluate((p) => {
      const g = window.__game;
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      g.player.pos.set(p.x + 3, p.y, p.z); g.player.vel.set(0, 0, 0);
    }, volantLou);
    const boutonLou = () => lou.evaluate(() => { const b = document.getElementById('ride-btn'); return { texte: b.textContent, visible: b.style.display !== 'none' }; });
    await jusqua(async () => { const b = await boutonLou(); return b.visible && /Monter avec/.test(b.texte); }, 15000);
    // CE QUE LA TABLETTE DE LOU FAIT DE LA VOITURE DE MARLON, image par image
    // (v407) : quand l'ami est recréé, quand son maillage de voiture change,
    // quand la phase change. Le rouge qui allait et venait (v377) disait
    // seulement « la séquence s'annule » ; ce relevé dit pourquoi, et il entre
    // dans le message des deux témoins du passager.
    await lou.evaluate((id) => {
      const g = window.__game, log = [], t0 = performance.now();
      let rp = g.remotePlayers.get(id), m = rp && rp.vehicule ? rp.vehicule.mesh : null, ph;
      const pas = () => {
        const t = Math.round(performance.now() - t0);
        const r = g.remotePlayers.get(id), mm = r && r.vehicule ? r.vehicule.mesh : null;
        const e = g.player.embarquement, p2 = e ? e.phase : null;
        if (r !== rp) { log.push({ t, quoi: r ? 'ami recréé' : 'ami parti' }); rp = r; }
        if (mm !== m) { log.push({ t, quoi: mm ? 'maillage neuf' : 'plus de voiture', cle: r && r.vehicule ? r.vehicule.cle : null }); m = mm; }
        if (p2 !== ph) { log.push({ t, ph: p2 }); ph = p2; }
        if (t < 150000) requestAnimationFrame(pas);
      };
      window.__suiviVoitureAmi = log;
      requestAnimationFrame(pas);
    }, marlonChezLou);
    const suiviAmi = () => lou.evaluate(() => (window.__suiviVoitureAmi || []).slice(0, 40));
    await lou.evaluate(() => document.getElementById('ride-btn').click());
    const t0 = Date.now();
    const releves = [];
    while (Date.now() - t0 < 45000) {
      const [cL, cM] = await Promise.all([
        lou.evaluate(() => { const g = window.__game; const e = g.player.embarquement; return { ph: e ? e.phase : null, passager: !!(g.fun.passagerDe && g.fun.passagerDe()) }; }),
        hote.evaluate(() => {
          const m = window.__game.fun.montureConduite && window.__game.fun.montureConduite();
          const p = m && m.mesh.userData.portieres ? m.mesh.userData.portieres['1'] : null;
          return { angle: p ? +p.rotation.y.toFixed(3) : null };
        }),
      ]);
      releves.push({ t: Date.now() - t0, ...cL, ...cM });
      if (cL.passager && !cL.ph && releves.some((r) => r.angle > 0.5) && cM.angle !== null && Math.abs(cM.angle) < 0.02) break;
      await dormir(150);
    }
    const phases = [...new Set(releves.map((r) => r.ph).filter(Boolean))];
    const ouverteChezMarlon = releves.filter((r) => r.angle > 0.5);
    const fin = releves[releves.length - 1];
    verifier('le passager entre par la portière droite, et le conducteur la voit s\'ouvrir chez lui',
      volantLou.auVolant && phases.includes('ouverture') && phases.includes('entree') && fin.passager
        && ouverteChezMarlon.length > 0 && fin.angle !== null && Math.abs(fin.angle) < 0.02,
      JSON.stringify({ volantLou, phases, ouvertes: ouverteChezMarlon.length, max: Math.max(...releves.map((r) => r.angle || 0)), fin, n: releves.length, ms: fin.t, suivi: await suiviAmi() }));
    // --- et il en DESCEND par la portière (v384) ------------------------------
    //
    // La descente du passager était instantanée : Lou se retrouvait debout
    // d'un coup, la portière de Marlon ne bougeait pas. Elle ressort désormais
    // par la portière droite, à l'envers de la montée, et Marlon la voit
    // s'ouvrir chez lui. Même lecture des deux pages au même instant ; et
    // `passagerDe()` doit être FAUX dès le premier relevé — on n'est plus
    // passager au premier appui (comme `montureConduite()` pour le conducteur,
    // v366). On attend le RÉSULTAT, borné : à deux pages une séquence de deux
    // secondes de jeu prend des dizaines de secondes de montre (v377). Sur
    // l'ancien code : aucune phase, portière fermée de bout en bout.
    const descenteLou = [];
    if (fin.passager) {
      await lou.evaluate(() => document.getElementById('ride-btn').click());
      const t1 = Date.now();
      while (Date.now() - t1 < 45000) {
        const [cL, cM] = await Promise.all([
          lou.evaluate(() => { const g = window.__game; const e = g.player.embarquement; return { ph: e ? e.phase : null, sens: e ? e.sens : null, passager: !!(g.fun.passagerDe && g.fun.passagerDe()) }; }),
          hote.evaluate(() => {
            const m = window.__game.fun.montureConduite && window.__game.fun.montureConduite();
            const p = m && m.mesh.userData.portieres ? m.mesh.userData.portieres['1'] : null;
            return { angle: p ? +p.rotation.y.toFixed(3) : null };
          }),
        ]);
        descenteLou.push({ t: Date.now() - t1, ...cL, ...cM });
        if (!cL.ph && descenteLou.some((r) => r.angle > 0.5) && cM.angle !== null && Math.abs(cM.angle) < 0.02) break;
        if (!cL.ph && Date.now() - t1 > 8000 && !descenteLou.some((r) => r.ph)) break;   // rien ne s'est joué
        await dormir(150);
      }
    }
    const phasesD = [...new Set(descenteLou.filter((r) => r.sens === 'descendre').map((r) => r.ph))];
    const finD = descenteLou[descenteLou.length - 1] || {};
    verifier('le passager descend par la portière droite, et le conducteur la voit s\'ouvrir chez lui',
      fin.passager && descenteLou.length > 0 && descenteLou.every((r) => !r.passager)
        && phasesD.includes('ouverture') && phasesD.includes('sortie')
        && descenteLou.some((r) => r.angle > 0.5) && !finD.ph && finD.angle !== null && Math.abs(finD.angle) < 0.02,
      JSON.stringify({ phasesD, ouvertes: descenteLou.filter((r) => r.angle > 0.5).length, max: Math.max(0, ...descenteLou.map((r) => r.angle || 0)),
        passagerPendant: descenteLou.filter((r) => r.passager).length, fin: finD, n: descenteLou.length, suivi: await suiviAmi() }));
    // --- la voiture de l'ami se refait pendant la marche (v407) ----------------
    //
    // ON PROVOQUE L'ÉTAT DU PORTAIL, on ne l'attend pas (v393) : la tablette de
    // Lou refait le maillage de la voiture de Marlon (une clé qui change, une
    // reconnexion) pendant que Lou marche vers la portière. La séquence
    // tenait l'ancien maillage, voyait « la voiture n'existe plus » et
    // s'annulait : Lou restait à pied. Elle suit désormais la voiture de CE
    // conducteur, et s'y rebranche. Sur l'ancien code : annulée, pas passagère.
    let refaite = null;
    if (!finD.ph) {
      await jusqua(async () => { const b = await boutonLou(); return b.visible && /Monter avec/.test(b.texte); }, 15000);
      await lou.evaluate(() => document.getElementById('ride-btn').click());
      const enMarche = await jusqua(async () => lou.evaluate(() => { const e = window.__game.player.embarquement; return !!(e && e.phase === 'approche'); }), 10000);
      // la clé change : au prochain message de position, la tablette refait le maillage
      const refait = await lou.evaluate((id) => { const rp = window.__game.remotePlayers.get(id); if (!rp || !rp.vehicule) return false; rp.vehicule.cle = 'refaite'; return true; }, marlonChezLou);
      const t2 = Date.now(), vus = [];
      while (Date.now() - t2 < 45000) {
        const e = await lou.evaluate(() => { const g = window.__game; const x = g.fun.embarquement ? g.fun.embarquement() : null; return { ph: x ? x.phase : null, rebranchee: x ? x.rebranchee || 0 : 0, passager: !!(g.fun.passagerDe && g.fun.passagerDe()) }; });
        vus.push(e);
        if (!e.ph && Date.now() - t2 > 1500) break;
        await dormir(150);
      }
      refaite = { enMarche, refait, rebranchee: Math.max(0, ...vus.map((v) => v.rebranchee)), passager: !!(vus[vus.length - 1] || {}).passager,
        dernier: await lou.evaluate(() => { const f = window.__game.fun; return f.embarquementDernier ? f.embarquementDernier() : null; }), suivi: (await suiviAmi()).slice(-8) };
    }
    verifier('la voiture de l\'ami se refait pendant la marche : le passager s\'y rebranche et s\'assied quand même',
      !!refaite && refaite.enMarche && refaite.refait && refaite.passager && refaite.rebranchee >= 1,
      JSON.stringify(refaite));
    await lou.evaluate(() => { const g = window.__game; if (g.fun.passagerDe && g.fun.passagerDe()) document.getElementById('ride-btn').click(); });
    await hote.evaluate(() => { const g = window.__game; if (g.fun.montureConduite && g.fun.montureConduite()) document.getElementById('ride-btn').click(); });
    await lou.close();
    await jusqua(async () => (await vu(hote)).compteur === 2 && (await vu(alice)).compteur === 2, 40000);
    // --- une seule rue pour tout le monde (v305) ------------------------------
    //
    // Max, en ligne : « les utilisateurs ne voient pas les mêmes voitures en
    // même temps. Et quand on monte dans une voiture, elle change de couleur. »
    // Chaque tablette faisait rouler SA circulation, depuis l'instant où SA page
    // avait créé le convoi : deux enfants au même carrefour voyaient deux rues.
    // On emmène Marlon et Alice au même endroit de Paris et l'on compare, convoi
    // par convoi, où en est la tête — sur l'ancien code, n'importe où sur le
    // tour. Le convoi se reconnaît à ce qui ne dépend que de son tracé (nom,
    // longueur, graine) : son RANG dans la liste dépend de l'ordre où la page
    // a approché les villes, et n'est pas le même d'une tablette à l'autre.
    const departRue = { hote: await hote.evaluate(() => { const p = window.__game.player.pos; return { x: p.x, y: p.y, z: p.z }; }),
      alice: await alice.evaluate(() => { const p = window.__game.player.pos; return { x: p.x, y: p.y, z: p.z }; }) };
    const allerAParis = (page) => page.evaluate(async () => {
      const g = window.__game;
      const { PARIS } = await import('./src/paris.js');
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      g.player.pos.set(PARIS.x, g.world.terrainHeight(PARIS.x, PARIS.z) + 30, PARIS.z);
      g.player.vel.set(0, 0, 0);
      g.player.flying = true;
    });
    // L'HÔTE ARRIVE D'ABORD, ALICE UNE MINUTE PLUS TARD. Un convoi naît
    // quand la page approche sa ville : sur l'ancien code, chaque tablette
    // part donc de SA naissance, et le décalage d'arrivée devient un décalage
    // de rue. Le gel de six secondes seul ne suffisait pas — mesuré, écart
    // médian 5 sur l'ancien code contre 3 sur le neuf : les deux pages rendent
    // si peu d'images par seconde que `dt` (borné) avance d'aussi peu chez
    // l'une que chez l'autre, et le gel ne coûte qu'une image.
    await allerAParis(hote);
    await dormir(60000);
    await allerAParis(alice);
    // LES DEUX PAGES SE LISENT L'UNE APRÈS L'AUTRE, À UNE DEMI-SECONDE D'ÉCART
    // OU PLUS sur ce banc : les voitures roulent entre les deux lectures, et le
    // premier jet comptait ce trajet comme un désaccord (écart médian 8 sur le
    // code neuf pour une barre à 8). Chaque relevé porte donc l'heure de la
    // MACHINE (`Date.now`, la même pour les deux pages) et la vitesse du
    // convoi, et l'on ramène la première lecture à l'instant de la seconde.
    const convoisDe = (page) => page.evaluate(() => {
      const v = window.__game && window.__game.vehicules;
      const out = { t: Date.now(), h: v && v.horloge ? v.horloge() : null };
      for (const c of (window.__vehicules.etat() || [])) {
        if (!c.routier || c.nom !== 'voiture') continue;
        out[`${c.nom}|${c.longueur}|${c.graine}`] = { d: c.distance, L: c.longueur, v: c.vitesse || 0, arret: !!c.attente, cle: c.cle };
      }
      return out;
    });
    await jusqua(async () => {
      const a = await convoisDe(hote), b = await convoisDe(alice);
      return Object.keys(a).filter((k) => k !== 't' && k !== 'h' && b[k]).length >= 3;
    }, 60000);
    // ON PROVOQUE LA DIVERGENCE, ON NE L'ATTEND PAS (v233, v266). Deux pages
    // ouvertes presque ensemble ont des circulations presque en phase par
    // hasard : sur l'ancien code ce témoin était VERT (écart médian 1 bloc),
    // sans rien prouver. On gèle donc la page d'Alice six secondes — une
    // tablette qui rame, un onglet qui dort : sur l'ancien code sa rue garde six
    // secondes de retard pour toujours ; sur le neuf, l'heure de l'hôte, qui
    // voyage avec celle du ciel toutes les trois secondes, la rattrape.
    await alice.evaluate(() => { setTimeout(() => { const t = performance.now(); while (performance.now() - t < 6000) { /* gel */ } }, 50); });
    await dormir(6500);
    await dormir(7000);
    // LA RUE ROULE TROIS FOIS PLUS VITE DEPUIS LA v372, ET LA LECTURE DES
    // DEUX PAGES N'EST PLUS GRATUITE : à cinquante km/h, une seconde de
    // décalage entre deux lectures vaut quatorze blocs. On mesure donc
    // séparément les DEUX choses que la règle de la v305 garantit :
    //   (1) LA MÊME RUE À LA MÊME HEURE — on demande à la page d'Alice où SA
    //       grille met chaque convoi à l'heure que l'hôte vient de lire
    //       (`distanceA`) : exact, sans aucune lecture intermédiaire ;
    //   (2) LA MÊME HEURE — l'heure d'Alice ramenée à l'instant de la lecture
    //       de l'hôte par l'heure de la machine. Sur ce banc une page rend une
    //       image par seconde ou moins et `dtReel` est borné à deux secondes :
    //       l'heure de rue de CHAQUE page prend du retard sur la machine entre
    //       deux annonces du ciel (trois secondes). La barre est donc cinq
    //       secondes — l'ancien code, sans heure partagée, s'écartait d'une
    //       minute (le temps d'arrivée).
    const ecartsRue = [], ecartsHeure = [];
    for (let k = 0; k < 5; k++) {
      const a = await convoisDe(hote), b = await convoisDe(alice);
      const dt = (b.t - a.t) / 1000;
      if (a.h !== null && b.h !== null) ecartsHeure.push(Math.abs(b.h - (a.h + dt)));
      const cles = Object.keys(a).filter((cle) => cle !== 't' && cle !== 'h' && b[cle] && a[cle].cle);
      const chezAlice = a.h === null ? {} : await alice.evaluate(({ cles, h }) => {
        const v = window.__game && window.__game.vehicules, out = {};
        if (!v || !v.distanceA) return out;
        for (const c of cles) out[c] = v.distanceA(c, h);
        return out;
      }, { cles: cles.map((c) => a[c].cle), h: a.h });
      for (const cle of cles) {
        const L = a[cle].L || 1, dB = chezAlice[a[cle].cle];
        if (typeof dB !== 'number') continue;
        const e = Math.abs((((a[cle].d - dB) % L) + L) % L);
        ecartsRue.push(Math.min(e, L - e));
      }
      await dormir(600);
    }
    ecartsHeure.sort((x, y) => x - y);
    const medianeHeure = ecartsHeure.length ? ecartsHeure[ecartsHeure.length >> 1] : null;
    ecartsRue.sort((x, y) => x - y);
    const medianeRue = ecartsRue.length ? ecartsRue[ecartsRue.length >> 1] : null;
    verifier('deux tablettes d\'une partie voient la même circulation, au même endroit',
      ecartsRue.length >= 5 && ecartsRue[ecartsRue.length - 1] < 1 && medianeHeure !== null && medianeHeure < 5,
      `à heure égale : écart médian ${medianeRue === null ? null : medianeRue.toFixed(2)} bloc(s), pire ${ecartsRue.length ? ecartsRue[ecartsRue.length - 1].toFixed(2) : null}, sur ${ecartsRue.length} relevé(s) · écart d'heure médian ${medianeHeure === null ? null : medianeHeure.toFixed(2)} s`);

    // L'HÔTE QUI RAME ANNONCE QUAND MÊME L'HEURE DE LA RUE (v372). Le compte à
    // rebours de l'annonce était en `dt`, borné à un vingtième : à deux images
    // par seconde, « toutes les trois secondes » devenait une fois par
    // demi-minute, et l'heure de rue d'un invité qui avait calé restait en
    // retard jusque-là — l'intermittence déclarée sous la v351 (35 blocs
    // d'écart une fois sur deux). On PROVOQUE la tablette qui rame : chaque
    // image de l'hôte coûte 400 ms pendant douze secondes, et l'on compte les
    // annonces. Ancien code : zéro ou une ; neuf : quatre.
    const annonces = await hote.evaluate(async () => {
      const n = window.__game.net, dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      if (!n || !n.diffuserCiel) return { err: 'pas de net' };
      const orig = n.diffuserCiel.bind(n); let k = 0;
      n.diffuserCiel = (c) => { if (typeof c.rue === 'number') k++; return orig(c); };
      let actif = true, images = 0;
      const lourd = () => { if (!actif) return; images++; const t = performance.now(); while (performance.now() - t < 400) { /* rame */ } requestAnimationFrame(lourd); };
      requestAnimationFrame(lourd);
      const t0 = performance.now(); await dodo(12000); actif = false;
      n.diffuserCiel = orig;
      return { annonces: k, images, secondes: +((performance.now() - t0) / 1000).toFixed(1) };
    });
    verifier('l\'hôte qui rame annonce encore l\'heure de la rue toutes les trois secondes',
      annonces.annonces >= 3, JSON.stringify(annonces));

    // Marlon prend le volant d'une voiture de la rue — celle que la rue avait
    // repeinte, pour que la couleur ait quelque chose à perdre.
    const prise = await hote.evaluate(async () => {
      const g = window.__game, v = window.__vehicules; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      g.player.flying = false;
      for (let essai = 0; essai < 40; essai++) {
        for (const c of v.etat()) {
          if (!c.routier || c.nom !== 'voiture') continue;
          for (const pl of c.places) {
            const peinture = pl[6];
            if (peinture === null) continue;              // livrée d'origine : rien à perdre
            // LA TEINTE DE CHAQUE VOITURE AVANT LA MONTE (v401) : on compare
            // la monture à la voiture RÉELLEMENT prise, lue dans `pris`, pas à
            // celle qu'on visait — un convoi roule, et quand le premier appui
            // ne monte pas, le suivant peut prendre la voisine (deux rouges
            // sur cinq passages pour ce seul motif, monture d'une autre teinte).
            const avant = new Map();
            for (const c2 of v.etat()) for (const p2 of c2.places || []) avant.set(c2.cle + '#' + p2[3], p2[6]);
            const prisAvant = new Set(v.etat().flatMap((c2) => (c2.pris || []).map((i) => c2.cle + '#' + i)));
            g.player.pos.set(pl[0] + 0.5, g.world.terrainHeight(pl[0], pl[1]) + 1.2, pl[1]);
            g.player.vel.set(0, 0, 0);
            await dodo(150);
            // LA VOITURE QU'ON PREND EST CELLE QUI EST LÀ AU MOMENT DE L'APPUI
            // (v372) : à cinquante à l'heure, celle qu'on visait est quinze blocs
            // plus loin une seconde et demie après, et c'est la suivante — d'une
            // autre teinte — qui monte. On lit donc la peinture de la voiture
            // que `placeProche` désigne À L'INSTANT de l'appui.
            const vise = v.placeProche(9);
            if (!vise) continue;
            const [vci, vi] = vise.id.split(':').map(Number);
            const pv = (v.etat()[vci] || { places: [] }).places.find((q) => q[3] === vi);
            const teinte = pv ? pv[6] : null;
            if (teinte === null || teinte === undefined) continue;
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
            await dodo(1500);
            const a = g.fun.montureConduite && g.fun.montureConduite();
            if (!a || !a.mesh) continue;
            const prise = v.etat().flatMap((c2) => (c2.pris || []).map((i) => c2.cle + '#' + i)).find((k) => !prisAvant.has(k));
            const teinteP = prise !== undefined && avant.has(prise) ? avant.get(prise) : teinte;
            if (teinteP === null) {             // on a pris une livrée d'origine : rien à perdre, on redescend
              document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
              await dodo(800);
              continue;
            }
            const couleurs = [];
            a.mesh.traverse((o) => { if (o.isMesh && o.material && o.material.color) couleurs.push(o.material.color.getHex()); });
            return { auVolant: true, rue: teinteP === undefined ? null : teinteP, visee: peinture, prise: prise || null,
              monture: a.mesh.userData.peinture ?? null,
              peinte: teinteP !== undefined && couleurs.includes(teinteP), flotte: a.mesh.userData.flotte,
              x: a.pos.x, z: a.pos.z, cap: a.yaw };
          }
        }
        await dodo(500);
      }
      return { auVolant: false };
    });
    const marlonChezAlice2 = await idDe(alice, 'Marlon');
    const vueAlice = () => alice.evaluate((id) => {
      const rp = window.__game.remotePlayers.get(id);
      if (!rp || !rp.vehicule) return null;
      const couleurs = [];
      rp.vehicule.mesh.traverse((o) => { if (o.isMesh && o.material && o.material.color) couleurs.push(o.material.color.getHex()); });
      return { peinture: rp.vehicule.mesh.userData.peinture ?? null, couleurs };
    }, marlonChezAlice2);
    await jusqua(async () => { const v = await vueAlice(); return !!v && v.couleurs.includes(prise.rue); }, 15000);
    const chezAlice = await vueAlice();
    verifier('la voiture qu\'on prend dans la rue garde sa couleur, chez soi et chez l\'ami',
      prise.auVolant && prise.rue !== null && prise.peinte && prise.monture === prise.rue
      && !!chezAlice && chezAlice.couleurs.includes(prise.rue),
      JSON.stringify({ prise, chezAlice: chezAlice && { peinture: chezAlice.peinture, laTeinte: chezAlice.couleurs.includes(prise.rue) } }));

    // Et chez Alice, la rue ne passe plus AU TRAVERS de la voiture de Marlon.
    // ON POSE LA SITUATION (v252, v279) : Marlon se gare DANS la voie, douze
    // blocs devant une voiture de la rue d'Alice qui arrive, et l'on regarde
    // chez Alice. Sur l'ancien code la voiture le traverse ; sur le neuf elle
    // s'arrête derrière lui. Attendre qu'une voiture passe « par hasard » à
    // côté d'une voiture garée rendait ce témoin VERT sur l'ancien code (aucune
    // n'était venue en douze secondes) : une mesure où personne ne vient n'est
    // pas une mesure.
    const idMarlon2 = marlonChezAlice2;
    let traversee = { dedans: 0, plusPres: Infinity, releves: 0, essais: 0, suivie: null };
    for (let essai = 0; essai < 5; essai++) {
      // L'ORDRE COMPTE, ET C'EST CE QUI A COÛTÉ QUATRE JETS. On choisissait une
      // voiture, on posait Marlon devant elle, puis on attendait qu'Alice le
      // voie arrivé (une à deux secondes de réseau) : pendant ce temps la
      // voiture l'avait rejoint, et au premier relevé elle était « déjà
      // dedans », donc exclue du compte — vert ou rouge au hasard, des deux
      // côtés. Désormais Marlon se pose d'abord sur le tracé (là où est une
      // voiture de la rue, qui repart), et c'est UNE FOIS QU'ALICE LE VOIT
      // ARRIVÉ qu'on choisit la voiture qui arrive derrière lui : dans sa voie,
      // entre 4,5 et 14 blocs de son pare-chocs. Sur l'ancien code elle le
      // traverse ; sur le neuf elle reste derrière, et son RETARD dans le
      // convoi grandit. Quarante secondes : sur ce banc l'ancien code fait
      // rouler ses voitures au rythme des images (`dt` borné), donc lentement.
      const pose = await alice.evaluate((k) => {
        const cands = [];
        for (const c of window.__vehicules.etat()) {
          if (!c.routier || c.nom !== 'voiture') continue;
          for (const pl of c.places) if (!pl[5]) cands.push(pl);
        }
        if (!cands.length) return null;
        const pl = cands[(k * 7) % cands.length];
        return { x: pl[0], z: pl[1], cap: pl[2] };
      }, essai);
      if (!pose) { await dormir(1000); continue; }
      await hote.evaluate((c) => {
        const g = window.__game;
        g.player.pos.set(c.x, g.world.terrainHeight(Math.floor(c.x), Math.floor(c.z)) + 1.2, c.z);
        g.player.vel.set(0, 0, 0);
        g.player.yaw = c.cap + Math.PI;
      }, pose);
      const r = await alice.evaluate(async ({ id, m }) => {
        const v = window.__vehicules; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        const rect = (x, z, cap, dl = 2.2, dw = 1.13) => {
          const ux = Math.sin(cap), uz = Math.cos(cap), lx = uz, lz = -ux;
          return [[x + ux * dl + lx * dw, z + uz * dl + lz * dw], [x + ux * dl - lx * dw, z + uz * dl - lz * dw],
            [x - ux * dl - lx * dw, z - uz * dl - lz * dw], [x - ux * dl + lx * dw, z - uz * dl + lz * dw]];
        };
        const separe = (A, B) => {
          for (const P of [A, B]) for (let k = 0; k < 4; k++) {
            const a = P[k], b = P[(k + 1) % 4], nx = b[1] - a[1], nz = a[0] - b[0];
            const pa = A.map((p) => p[0] * nx + p[1] * nz), pb = B.map((p) => p[0] * nx + p[1] * nz);
            if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return true;
          }
          return false;
        };
        const rp = window.__game.remotePlayers.get(id);
        if (!rp) return { absent: true };
        // Marlon tel qu'Alice le voit : sa position RÉSEAU, attendue ARRIVÉE
        const t00 = performance.now();
        while (performance.now() - t00 < 8000 && Math.hypot(rp.pos.x - m.x, rp.pos.z - m.z) > 1.5) await dodo(100);
        const arrive = +Math.hypot(rp.pos.x - m.x, rp.pos.z - m.z).toFixed(1);
        // la voiture qui arrive derrière lui, dans sa voie
        let suivie = null;
        const t01 = performance.now();
        while (!suivie && performance.now() - t01 < 15000) {
          for (const c of v.etat()) {
            if (!c.routier || c.nom !== 'voiture') continue;
            for (const pl of c.places) {
              const dx = rp.pos.x - pl[0], dz = rp.pos.z - pl[1];
              const devant = dx * Math.sin(pl[2]) + dz * Math.cos(pl[2]);
              const cote = Math.abs(dx * Math.cos(pl[2]) - dz * Math.sin(pl[2]));
              if (devant > 4.5 && devant < 14 && cote < 1.5 && (!suivie || devant < suivie.devant)) {
                suivie = { qui: `${c.cle}#${pl[3]}`, devant: +devant.toFixed(1), retard0: pl[4], retard: 0, dMin: Infinity, vue: 0 };
              }
            }
          }
          if (!suivie) await dodo(200);
        }
        if (!suivie) return { arrive, personne: true };
        const deja = new Set();
        let dedans = 0, plusPres = Infinity, releves = 0, intrus = null;
        const t0 = performance.now();
        while (performance.now() - t0 < 40000) {
          const R = rect(rp.pos.x, rp.pos.z, m.cap);
          for (const c of v.etat()) {
            if (!c.routier) continue;
            for (const pl of c.places) {
              const qui = `${c.cle}#${pl[3]}`;
              const d = Math.hypot(pl[0] - rp.pos.x, pl[1] - rp.pos.z);
              if (qui === suivie.qui) {
                // ce qui la retient, relevé au plus près (v372) : un rouge de
                // portail l'a vue passer au travers une fois sur trois passages,
                // et sans sa cause il ne se démontait pas
                if (d < suivie.dMin) {
                  suivie.dMin = +d.toFixed(1);
                  suivie.cause = Array.isArray(c.causes) ? c.causes[pl[3]] : undefined;
                  const me = window.__game.player.pos;
                  suivie.alice = +Math.hypot(me.x - rp.pos.x, me.z - rp.pos.z).toFixed(1);
                }
                suivie.vue++;
                suivie.retard = pl[4] - (suivie.retard0 || 0);
              }
              const touche = d < 6 && !separe(R, rect(pl[0], pl[1], pl[2]));
              if (releves === 0) { if (touche) deja.add(qui); continue; }
              if (deja.has(qui)) continue;
              if (d < plusPres) plusPres = d;
              if (touche) { dedans++; if (!intrus) intrus = { qui, d: +d.toFixed(1), cap: +pl[2].toFixed(2), capMarlon: +m.cap.toFixed(2) }; }
            }
          }
          releves++;
          if (suivie.retard > 6 && performance.now() - t0 > 10000) break;  // retenue : verdict acquis
          await dodo(250);
        }
        return { dedans, intrus, plusPres: +plusPres.toFixed(1), releves, deja: deja.size, arrive, suivie,
          ms: Math.round(performance.now() - t0) };
      }, { id: idMarlon2, m: pose });
      traversee = { ...r, essais: essai + 1 };
      if (r.suivie && r.suivie.vue > 20) break;     // la situation a eu lieu
    }
    // ET LA SEPTIÈME VOITURE, CELLE QUI ENTRAIT QUAND MÊME (v383). Le compte
    // `dedans` valait 1 des deux côtés : la sonde `sonde-intrus-ami.cjs` l'a
    // démonté — toutes les voitures entrées avaient l'ami ET une voiture de la
    // rue dans leur `veut`, donc la patience de quatre secondes, puis `repart`
    // les lançait au travers. La règle corrigée (vehicules.js), `dedans` entre
    // dans le verdict : sur l'ancien code il rougit quand un carrefour s'en
    // mêle (une fois sur quatorze poses à la sonde), sur le neuf jamais.
    // CE QUE CE TÉMOIN PROUVE, ET CE QU'IL NE PROUVE PAS (v306). Six versions
    // de ce témoin ; la sixième sépare enfin les deux codes, et elle le fait
    // par le RETARD de la voiture qui arrive derrière Marlon — 0 s sur
    // l'ancien code, 19 s sur le neuf. Le compte `dedans` (une voiture de la
    // rue DANS la sienne) valait 1 des DEUX côtés au même passage : une autre
    // voiture que celle qui cède entre encore une fois chez Alice. Il reste
    // dans le message, pour qu'une sonde le démonte (dette dans TASKS.md), et
    // n'entre pas dans le verdict : un témoin annonce ce qu'il mesure.
    verifier('et chez l\'ami, la voiture de la rue qui arrive derrière celle de l\'enfant l\'attend, et aucune ne lui passe au travers',
      prise.auVolant && !!traversee.suivie
      && traversee.suivie.vue > 20 && traversee.suivie.retard > 3 && traversee.dedans === 0,
      JSON.stringify(traversee));


    // Max : « en multijoueur, la position sur la carte n'est pas toujours à
    // jour ». Un ami au volant est ASSIS dans le maillage de sa voiture (v253) :
    // la carte lisait la position de ce maillage — celle du siège, à un bloc de
    // zéro — et le montrait figé près du point d'apparition tant qu'il
    // conduisait. Marlon est au volant : le point de la carte d'Alice doit être
    // là où Marlon est vraiment.
    const pointAmi = await alice.evaluate((id) => {
      const g = window.__game, rp = g.remotePlayers.get(id);
      const pt = window.__carte && window.__carte.autres ? window.__carte.autres().find((a) => a.nom === 'Marlon') : null;
      if (!rp || !pt) return { absent: true };
      return { carte: [Math.round(pt.x), Math.round(pt.z)], vrai: [Math.round(rp.pos.x), Math.round(rp.pos.z)],
        ecart: +Math.hypot(pt.x - rp.pos.x, pt.z - rp.pos.z).toFixed(1), assis: !!(rp.vehicule && rp.mesh.parent === rp.vehicule.mesh) };
    }, marlonChezAlice2);
    const marlonVrai = await hote.evaluate(() => { const p = window.__game.player.pos; return [Math.round(p.x), Math.round(p.z)]; });
    verifier('sur la carte de l\'ami, l\'enfant au volant est là où il est vraiment',
      !pointAmi.absent && pointAmi.assis && pointAmi.ecart < 1
      && Math.hypot(pointAmi.carte[0] - marlonVrai[0], pointAmi.carte[1] - marlonVrai[1]) < 4,
      JSON.stringify({ ...pointAmi, marlonChezLui: marlonVrai }));
    await hote.evaluate(() => { const g = window.__game; if (g.fun.montureConduite && g.fun.montureConduite()) document.getElementById('ride-btn').click(); });

    // LE GPS SE PARTAGE (v388). Marlon choisit Rome sur sa carte : chez Alice,
    // une PROPOSITION (« Marlon va à Rome — 🧭 y aller aussi ? »), et jamais un
    // ordre — elle roulait déjà vers Lyon, son GPS ne change pas tant qu'elle
    // n'a pas touché le bouton. Sur l'ancien code rien n'arrive chez elle :
    // la destination ne voyageait pas.
    const gpsPartage = { proposee: null, avant: null, apres: null, ms: 0 };
    {
      const lieux = await alice.evaluate(async () => {
        const { positionDe } = await import('./src/mondes.js');
        return { rome: positionDe('rome'), lyon: positionDe('lyon') };
      });
      await alice.evaluate((l) => window.__carte.surGPS(l.x, l.z, 'Lyon'), lieux.lyon);
      await hote.evaluate((r) => window.__carte.surGPS(r.x, r.z, 'Rome'), lieux.rome);
      const t0 = Date.now();
      await jusqua(async () => !!(await alice.evaluate(() => window.__gpsAmi && window.__gpsAmi())), 20000);
      gpsPartage.ms = Date.now() - t0;
      gpsPartage.proposee = await alice.evaluate(() => {
        const p = window.__gpsAmi ? window.__gpsAmi() : null; const el = document.getElementById('gps-ami');
        return p ? { ...p, vue: !!el && getComputedStyle(el).display !== 'none', texte: el ? el.textContent : '' } : null;
      });
      gpsPartage.avant = await alice.evaluate(() => (window.__gps() ? window.__gps().nom : null));
      if (gpsPartage.proposee) await alice.evaluate(() => document.getElementById('gps-ami-oui').click());
      await dormir(300);
      gpsPartage.apres = await alice.evaluate(() => (window.__gps() ? window.__gps().nom : null));
      gpsPartage.reste = await alice.evaluate(() => !!(window.__gpsAmi && window.__gpsAmi()));
      await hote.evaluate(() => document.getElementById('gps-stop').click());
      await alice.evaluate(() => document.getElementById('gps-stop').click());
    }
    verifier('l\'ami voit où l\'on va, et la proposition ne remplace pas son GPS sans qu\'il le demande',
      !!gpsPartage.proposee && gpsPartage.proposee.nom === 'Rome' && gpsPartage.proposee.vue
      && /Marlon va à Rome/.test(gpsPartage.proposee.texte)
      && gpsPartage.avant === 'Lyon' && gpsPartage.apres === 'Rome' && !gpsPartage.reste,
      JSON.stringify(gpsPartage));
    for (const [page, p] of [[hote, departRue.hote], [alice, departRue.alice]]) {
      await page.evaluate((p) => { const g = window.__game; g.player.flying = false; g.player.pos.set(p.x, p.y, p.z); g.player.vel.set(0, 0, 0); }, p);
    }

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
    const alice2 = await banc.rejoindre('Alice', code, { memePrenom: true });
    // ON ATTEND LE RÉSULTAT QU'ON VÉRIFIE, PAS UN SIGNE QUI LE PRÉCÈDE. Le
    // compteur monte à deux dès que le lien est inscrit ; le PRÉNOM de
    // l'avatar, lui, n'arrive qu'avec la présentation, un instant plus tard.
    // Attendre le premier pour affirmer le second, c'est se donner rendez-vous
    // trop tôt : vu au banc, « compteur 2 [] » sur un retour parfaitement
    // réussi.
    await jusqua(async () => (await vu(alice2)).compteur === 2
      && (await nomsVus(alice2)).includes('Marlon'));
    const retour = await vu(alice2);
    verifier('Alice retrouve son monde après une veille sans retour',
      retour.compteur === 2 && (await nomsVus(alice2)).includes('Marlon'),
      `compteur ${retour.compteur} ${JSON.stringify(await nomsVus(alice2))}`);
    verifier('sans boîte d\'alerte accusatrice', alice2.dialogues.length === 0,
      JSON.stringify(alice2.dialogues));

    // L'ancien appareil relance sa propre reconnexion : il ne doit pas
    // reprendre la place de l'enfant qui vient de rentrer.
    // UN ROUGE DE CE TÉMOIN NE SE DÉMONTE QU'AVEC LES RETRAITS DE L'HÔTE
    // (v261) : qui a été retiré, quand, par quel chemin (battement, lien
    // fermé, présentation d'un fantôme). Rouge seule sur v259 et v260 un
    // soir, verte seule sur v258 le même soir, et deux sondes qui rejouent
    // ce scénario seul — jusqu'au trio, au sommeil et au réveil d'Alice —
    // vertes des deux côtés : la panne a besoin du contexte de la suite, et
    // « hôte 1 · Alice 2 » tout seul ne dit pas lequel.
    await hote.evaluate(() => {
      const n = window.__game.net;
      window.__drops = [];
      const t0 = Date.now();
      const trace = (id, quoi) => {
        const c = n.conns.get(id);
        window.__drops.push({ dt: Date.now() - t0, id: String(id).slice(-6), nom: c && c.name,
          pret: !!(c && c.pret), seen: c && c.seen ? Date.now() - c.seen : null, quoi,
          pile: new Error().stack.split('\n').slice(3, 6)
            .map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/\S+\//, '')).join(' | ') });
      };
      const o = n.dropPeer.bind(n);
      n.dropPeer = (id, conn) => { trace(id, conn ? 'drop(lien)' : 'drop'); return o(id, conn); };
      const d = n.conns.delete.bind(n.conns);
      n.conns.delete = (id) => { trace(id, 'delete'); return d(id); };
    });
    await dormir(25000);
    const reprise = { hote: (await vu(hote)).compteur, alice: (await vu(alice2)).compteur };
    const retraits = reprise.hote === 2 ? '' : ` · retraits côté hôte : ${JSON.stringify(
      await hote.evaluate(() => window.__drops.filter((r) => r.pret || r.quoi !== 'delete')))}`;
    verifier('la reprise tient dans la durée',
      reprise.hote === 2 && reprise.alice === 2,
      `hôte ${reprise.hote} · Alice ${reprise.alice}${retraits}`);

    // ENDORMIE N'EST PAS ÉTEINTE, et c'est ce qui faussait la fin de la suite.
    //
    // `endormir()` ne fait dormir que le RÉSEAU : elle ment sur
    // `visibilityState`, gèle `onMessage` et arrête les battements. La page,
    // elle, continue de dessiner un monde en trois dimensions à plein régime —
    // et le navigateur du banc est lancé avec `--disable-renderer-backgrounding`,
    // donc rien ne la ralentit non plus. Cette page-ci n'était jamais refermée :
    // elle brûlait un cœur sur quatre, en rendu logiciel, depuis le milieu de la
    // suite jusqu'à la fin.
    //
    // Ce sont les scénarios qui CHRONOMÈTRENT qui le payaient — la suite le dit
    // déjà plus bas pour `solo` et `enfin`, il manquait celle-là. Mesuré : le
    // renoncement sur courtier muet met 13,0 s quand la page est seule (9 s
    // d'attente du courtier, 4 s de course vers le nuage), et 24 à 29 s avec ce
    // fantôme qui tourne à côté. Le jeu n'y était pour rien.
    await alice.close();

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
    const solo = await banc.rejoindre('Elsa', '77777');
    await jusqua(async () => /seul/i.test((await vu(solo)).bandeau));
    const etatSolo = await vu(solo);
    verifier('ouvrir un monde vide le dit franchement',
      /seul/i.test(etatSolo.bandeau) && etatSolo.bandeau.includes('77777'),
      JSON.stringify(etatSolo.bandeau));
    verifier('et le compteur reste honnête', etatSolo.compteur === 1 && etatSolo.avatars.length === 0,
      `compteur ${etatSolo.compteur}`);

    // Quand quelqu'un arrive enfin, l'avertissement s'efface de lui-même.
    const enfin = await banc.rejoindre('Yanis', '77777');
    await jusqua(async () => (await vu(solo)).compteur === 2
      && (await nomsVus(solo)).includes('Yanis') && (await nomsVus(enfin)).includes('Elsa'));
    const apres = await vu(solo);
    verifier('l\'avertissement s\'efface dès qu\'un ami arrive',
      !/seul/i.test(apres.bandeau) && apres.compteur === 2,
      `bandeau ${JSON.stringify(apres.bandeau)}, compteur ${apres.compteur}`);
    verifier('et les deux se voient', (await nomsVus(solo)).includes('Yanis')
      && (await nomsVus(enfin)).includes('Elsa'),
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
    // ON CHRONOMÈTRE DANS LA PAGE, PAS DEPUIS LE BANC. Compter d'ici, c'est
    // compter aussi les allers-retours du protocole du navigateur, qui
    // s'allongent précisément quand la machine peine — donc accuser le jeu
    // d'une lenteur qui est celle de la mesure. Ce que l'enfant voit, c'est le
    // délai entre son doigt et le message : c'est cela qu'on observe, à la
    // source, sans rien interroger en boucle.
    const mesure = await perdu.evaluate(() => new Promise((ok) => {
      const el = document.getElementById('online-status');
      const debut = performance.now();
      const fini = () => {
        if (!/❌/.test(el.textContent)) return false;
        ok((performance.now() - debut) / 1000);
        return true;
      };
      if (fini()) return;
      const obs = new MutationObserver(() => { if (fini()) obs.disconnect(); });
      obs.observe(el, { childList: true, characterData: true, subtree: true });
      setTimeout(() => { obs.disconnect(); ok(-1); }, 40000);
    }));
    const dit = mesure >= 0;
    const mis = dit ? mesure : 40;
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
    // L'onglet seulement : l'appareil doit survivre, c'est tout le propos.
    await prem.fermerOnglet();
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
      // Deux minutes : ce chemin-là cumule volontairement les patiences du jeu
      // — cinq secondes pour le canal, neuf pour le serveur de rendez-vous,
      // vingt de plus une fois qu'on sait le monde tenu. Soixante secondes
      // suffisaient sur une machine au repos, jamais sur un conteneur chargé.
      () => (document.getElementById('online-status').textContent || '').startsWith('❌')), 120000);
    const phrase = await derriereVPN.evaluate(
      () => document.getElementById('online-status').textContent);
    verifier('un VPN ne fait plus dire que le monde est vide',
      verdict && !/Personne n'a répondu/.test(phrase), phrase);
    verifier('et le message dit quoi faire', /VPN/.test(phrase) && phrase.includes(codeVPN), phrase);
    // Aucun relais n'a répondu ici : c'est le réseau qui barre la route, et le
    // conseil doit être d'en changer.
    verifier('un réseau qui bloque tout renvoie vers un autre réseau',
      /Wi-Fi|partage de connexion/.test(phrase), phrase);
    await derriereVPN.close();
    await tenu.close();

    // --- le Wi-Fi d'hôtel et le VPN de la maison ne se soignent pas pareil ---
    //
    // Signalé par Max : « la connexion sur un réseau wifi public ne marche
    // pas ». Les deux pannes se ressemblent à l'écran — le monde existe, on
    // ne l'atteint pas — mais elles n'appellent pas le même geste. Quand le
    // relais répond et que le lien échoue quand même, c'est la maison
    // derrière un VPN : on dit de le couper. Quand même le relais est
    // injoignable, couper le VPN ne servira à rien : il faut sortir de ce
    // Wi-Fi. Ici le relais répond — on attend donc le conseil « VPN », et
    // surtout PAS celui du Wi-Fi public.
    const { p: tenu2, code: codeMaison } = await banc.creerMonde('Awa');
    const chezSoi = await banc.joueur('Rémi', { sansPairAPair: true, avecRelais: true });
    await chezSoi.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await chezSoi.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, codeMaison);
    await jusqua(async () => chezSoi.evaluate(
      // Deux minutes : ce chemin-là cumule volontairement les patiences du jeu
      // — cinq secondes pour le canal, neuf pour le serveur de rendez-vous,
      // vingt de plus une fois qu'on sait le monde tenu. Soixante secondes
      // suffisaient sur une machine au repos, jamais sur un conteneur chargé.
      () => (document.getElementById('online-status').textContent || '').startsWith('❌')), 120000);
    const phraseMaison = await chezSoi.evaluate(
      () => document.getElementById('online-status').textContent);
    verifier('quand le relais répond, on accuse le VPN et pas le Wi-Fi',
      /VPN/.test(phraseMaison) && !/hôtels/.test(phraseMaison), phraseMaison);
    await chezSoi.close();
    await tenu2.close();

    // --- refusé par son propre reflet ----------------------------------------
    //
    // « Max joue déjà dans ce monde depuis un autre appareil ! » — alors qu'il
    // n'y avait personne. En rouvrant son monde, une session précédente peut
    // être restée accrochée : elle entend l'arrivant, voit son prénom, et le
    // renvoie au menu. Trois fois de suite, sur une capture d'écran.
    //
    // Le jeu applique partout la règle « entre deux connexions au même prénom,
    // la vivante est la plus récente ». L'hôte était la seule exception, et
    // c'est là que l'enfant tombait.
    const { p: refletHote, code: codeReflet } = await banc.creerMonde('Ludo');
    const refletNeuf = await banc.rejoindre('Ludo', codeReflet, { memePrenom: true });
    // La reprise passe par une seconde et demie d'attente — le temps que le
    // fantôme lâche le code — puis par une réouverture complète du monde.
    const refletRepris = await jusqua(async () => refletNeuf.evaluate(
      () => !!(window.__game.net && window.__game.net.active && window.__game.net.isHost)), 90000);
    const accusation = refletNeuf.dialogues.filter((d) => /joue déjà/.test(d));
    verifier('on n\'est plus refusé par son propre reflet', accusation.length === 0,
      JSON.stringify(refletNeuf.dialogues));
    verifier('et l\'enfant reprend bien son monde', refletRepris,
      JSON.stringify(await refletNeuf.evaluate(() => ({
        actif: !!window.__game.net.active, hote: !!window.__game.net.isHost }))));
    await refletNeuf.close();
    await refletHote.close();

    // --- l'enfant tue ses propres fantômes en arrivant -----------------------
    //
    // Relevé sur la base de PRODUCTION : trois identités d'invité différentes
    // dans le même monde, et l'hôte parlant à deux d'entre elles à la fois.
    // C'était un seul téléphone, présent plusieurs fois chez lui — chaque
    // relance laissait une identité vivante deux minutes, or l'enfant revient
    // en dix secondes. D'où « un joueur arrive » et un compteur à deux alors
    // qu'il est seul, et d'où le fait que fermer l'application n'y changeait
    // rien : il revenait plus vite que son fantôme ne s'effaçait.
    //
    // Attendre l'expiration ne suffit pas. Celui qui arrive sait exactement
    // quelles lignes sont mortes — ce sont les siennes — et il est le seul à
    // avoir le droit de les effacer.
    const FANTOME = 'dev-fantomedemax-vieux';
    nuageRelais.relaisSemer({ code: '44444', de: FANTOME, vers: 'wmc-marlon-44444',
      msg: { t: 'hello', name: 'Milo' } });
    nuageRelais.relaisSemer({ code: '44444', de: 'dev-unautreenfant-x',
      vers: 'wmc-marlon-44444', msg: { t: 'hello', name: 'Autre' } });
    // Le même appareil que le fantôme : c'est toute la question. On pose
    // l'identifiant d'appareil AVANT le chargement, comme s'il venait d'un
    // lancement précédent sur ce téléphone.
    const revenant = await banc.joueur('Milo', AVEC_NUAGE);
    await revenant.evaluate((d) => localStorage.setItem('web-minecraft-device-id-v1', d),
      'fantomedemax');
    // Recharger pendant que les neuf corps réalistes s'analysent coupe leurs
    // textures, et le chargeur l'écrit en erreur de console (« Couldn't load
    // texture blob: ») — la panne de `plafond.js` en v251, rejouée ici SEUL
    // à la v257 (cinq erreurs chez Milo). Même remède : les corps d'abord.
    for (let fin = Date.now() + 45000; Date.now() < fin;) {
      const ok = await revenant.evaluate(async () => { const H = await import('./src/humains.js'); return H.humainsCharges(); }).catch(() => false);
      if (ok) break;
      await dormir(500);
    }
    await revenant.reload({ waitUntil: 'load' });
    await revenant.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await revenant.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await revenant.evaluate(() => {
      document.getElementById('join-code').value = '44444';
      document.getElementById('join-btn').click();
    });
    const purge = await jusqua(async () =>
      !nuageRelais.relaisEmetteurs('44444').includes(FANTOME), 60000);
    const restants = nuageRelais.relaisEmetteurs('44444');
    verifier('en arrivant, l\'enfant efface ses propres fantômes', purge,
      JSON.stringify(restants));
    verifier('et il ne touche pas à ceux des autres',
      restants.includes('dev-unautreenfant-x'), JSON.stringify(restants));
    await revenant.close();

    // --- un hôte d'ANCIENNE version ne bloque plus l'enfant ------------------
    //
    // Le correctif précédent demandait à l'hôte de céder la place. Mais l'hôte,
    // dans cette panne, c'est le FANTÔME — la session restée accrochée en
    // arrière-plan — et le fantôme tourne par définition le code d'avant. Il ne
    // peut pas obéir à une règle qu'il ne connaît pas.
    //
    // On rejoue donc exactement cela : un hôte qui se comporte comme la v151,
    // c'est-à-dire qui refuse l'arrivant au lieu de s'effacer. Le seul côté
    // toujours à jour est celui qui arrive, et c'est lui qu'on éprouve.
    const { p: vieilHote, code: codeVieux } = await banc.creerMonde('Zia');
    await vieilHote.evaluate(() => {
      const n = window.__game.net;
      const vrai = n.onMessage.bind(n);
      n.onMessage = (conn, msg) => {
        if (msg && msg.t === 'hello' && msg.name === 'Zia') {
          // Le comportement d'avant : « tu joues déjà ailleurs », et rien d'autre.
          try { conn.send({ t: 'duplicate', name: 'Zia' }); } catch { /* lien mort */ }
          return;
        }
        return vrai(conn, msg);
      };
    });
    const zia = await banc.rejoindre('Zia', codeVieux, { memePrenom: true });
    await dormir(6000);
    const accuseVieux = zia.dialogues.filter((d) => /joue déjà/.test(d));
    verifier('un hôte d\'ancienne version ne renvoie plus au menu',
      accuseVieux.length === 0, JSON.stringify(zia.dialogues));
    // Le jeu ne se tait pas non plus : il DIT ce qu'il fait, et il insiste.
    const insiste = await jusqua(async () => zia.evaluate(
      () => /reprend ton monde/i.test(document.body.textContent || '')), 30000);
    verifier('il annonce qu\'il reprend le monde, au lieu d\'un cul-de-sac', insiste,
      JSON.stringify(await zia.evaluate(
        () => (document.getElementById('online-status') || {}).textContent || '')));

    // Tant que la vieille session tient l'identifiant, personne ne peut le
    // reprendre — c'est physique. Ce qu'on exige, c'est qu'à la SECONDE où
    // elle lâche prise, l'enfant retrouve son monde sans avoir rien à faire.
    // Un fantôme finit toujours par mourir ; le cul-de-sac, lui, ne finit pas.
    await vieilHote.close();
    const ziaReprend = await jusqua(async () => zia.evaluate(
      () => !!(window.__game.net && window.__game.net.active && window.__game.net.isHost)), 90000);
    verifier('et dès que le fantôme lâche prise, l\'enfant retrouve son monde', ziaReprend,
      JSON.stringify(await zia.evaluate(() => ({
        actif: !!(window.__game.net && window.__game.net.active),
        hote: !!(window.__game.net && window.__game.net.isHost) }))));
    await zia.close();

    // --- le courtier muet ne renvoie plus l'enfant au menu -------------------
    //
    // « Le serveur de jeu ne répond pas — réessaie dans un moment », sur un
    // téléphone dont la connexion marchait parfaitement. Ce serveur ne sert
    // qu'aux présentations ; le nuage, lui, n'a besoin d'aucun courtier. Un
    // service extérieur indisponible n'est pas une raison de refuser de jouer.
    //
    // Ici le courtier est injoignable À LA RACINE : le port ne répond pas du
    // tout. C'est le cas le plus franc, et le plus proche de celui de Max.
    const sansCourtier = await banc.joueurVers('Sacha', 9798, AVEC_NUAGE);
    await sansCourtier.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await sansCourtier.evaluate(() => document.getElementById('host-btn').click());
    // Le jeu laisse neuf secondes au courtier avant de choisir le nuage : on
    // lui donne de quoi le faire, et de la marge.
    // On attend que le NUAGE ait pris la main, pas que la session existe :
    // `active` est vrai dès la première milliseconde de l'ouverture et ne
    // prouve rien. Un témoin qui mesure trop tôt lit l'état de départ et
    // conclut à une panne là où le jeu n'avait simplement pas fini.
    const ouvertSansCourtier = await jusqua(async () => sansCourtier.evaluate(
      () => !!(window.__game.net && window.__game.net.bus)), 60000);
    const etatSans = await sansCourtier.evaluate(() => {
      const n = window.__game.net;
      return {
        actif: !!(n && n.active), bus: !!(n && n.bus), pair: !!(n && n.peer),
        statut: (document.getElementById('online-status') || {}).textContent || '',
      };
    });
    verifier('un courtier muet n\'empêche plus d\'ouvrir un monde',
      ouvertSansCourtier && etatSans.actif, JSON.stringify(etatSans));
    verifier('et c\'est le nuage qui porte la partie, sans courtier du tout',
      etatSans.bus === true && etatSans.pair === false, JSON.stringify(etatSans));
    verifier('l\'enfant ne lit plus « le serveur ne répond pas »',
      !/ne répond pas|Pas de connexion/.test(etatSans.statut), JSON.stringify(etatSans.statut));

    // Et l'essentiel : à DEUX, sans courtier ni d'un côté ni de l'autre. C'est
    // la promesse entière — le jeu à plusieurs ne dépend plus d'aucun service
    // extérieur autre que celui qui sert déjà la page.
    const codeSans = await sansCourtier.evaluate(
      () => document.getElementById('room-code').textContent.trim());
    const secondSans = await banc.joueurVers('Alba', 9798, AVEC_NUAGE);
    await secondSans.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await secondSans.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, codeSans);
    await dormir(2000);
    await secondSans.evaluate(() => document.getElementById('online-play-btn')?.click());
    await sansCourtier.evaluate(() => document.getElementById('online-play-btn')?.click());
    const ensembleSans = await jusqua(async () => {
      const a = await nomsVus(sansCourtier), b = await nomsVus(secondSans);
      return a.includes('Alba') && b.includes('Sacha');
    }, 120000);
    verifier('et deux enfants se retrouvent sans courtier du tout', ensembleSans,
      JSON.stringify([await nomsVus(sansCourtier), await nomsVus(secondSans)]));
    // SANS COURTIER, LE CONDUCTEUR VOIT SON PASSAGER (v410). La dette de la
    // v253 : la partie passe par le nuage, il n'y a pas de pair, et le
    // conducteur ne se reconnaissait qu'à `peer.id` — le passager écrivait
    // pourtant chez qui il était assis (`p.de`, l'identité du BUS), et chez
    // Sacha Alba restait debout à côté de la voiture. Mesuré avant
    // (`sonde-passager-nuage.cjs`) : Alba passagère chez elle, debout chez
    // Sacha. On se reconnaît désormais à ses deux identités (`net.estMoi`).
    const passagerSans = { volant: false, bouton: false, passagere: null, assise: false, ms: null };
    if (ensembleSans) {
      passagerSans.volant = await sansCourtier.evaluate(async () => {
        const g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
        g.animalManager.animals.length = 0;
        const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
        g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5);
        await dodo(1500); document.getElementById('ride-btn').click(); await dodo(800);
        return !!(g.fun.montureConduite && g.fun.montureConduite());
      });
      const p0 = await sansCourtier.evaluate(() => { const p = window.__game.player.pos; return { x: p.x, y: p.y, z: p.z }; });
      await secondSans.evaluate((p) => {
        const g = window.__game;
        for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
        g.animalManager.animals.length = 0;
        g.player.pos.set(p.x + 3, p.y, p.z); g.player.vel.set(0, 0, 0);
      }, p0);
      passagerSans.bouton = await jusqua(async () => secondSans.evaluate(() => {
        const b = document.getElementById('ride-btn'); return b.style.display !== 'none' && /Monter avec/.test(b.textContent);
      }), 20000);
      if (passagerSans.bouton) await secondSans.evaluate(() => document.getElementById('ride-btn').click());
      await dormir(1000);
      passagerSans.passagere = await secondSans.evaluate(() => { const p = window.__game.fun.passagerDe(); return p ? { de: p.de, s: p.s } : null; });
      const t0 = Date.now();
      passagerSans.assise = await jusqua(async () => sansCourtier.evaluate(() => {
        const g = window.__game; const a = g.fun.montureConduite && g.fun.montureConduite();
        for (const rp of g.remotePlayers.values()) if (rp.name === 'Alba') return !!(a && rp.mesh.parent === a.mesh);
        return false;
      }), 20000);
      passagerSans.ms = Date.now() - t0;
    }
    verifier('sans courtier, le conducteur voit son passager assis dans sa voiture',
      passagerSans.volant && !!passagerSans.passagere && passagerSans.assise, JSON.stringify(passagerSans));
    await secondSans.close();
    await sansCourtier.close();
    await souffler();

    // --- la diagonale qui a eu Marlon : hôte SANS courtier, invité AVEC ------
    //
    // La v154 avait éprouvé « les deux sans courtier ». Restait l'autre moitié
    // du monde réel : l'hôte vit par le nuage seul, et l'invité, lui, a un
    // courtier qui répond — lequel lui jure que ce monde n'existe pas. Vu en
    // production sur le monde de la maison : l'hôte saluait l'invité par le
    // relais en deux secondes, pendant que l'invité lisait « ce Wi-Fi bloque
    // le jeu » sur le Wi-Fi familial. Pire : l'ancien code rouvrait alors le
    // monde en hôte — deux mondes jumeaux sous le même code, qui divergent
    // sans que personne le voie.
    const hotePhare = await banc.joueurVers('Léo', 9798, AVEC_NUAGE);
    await hotePhare.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await hotePhare.evaluate(() => document.getElementById('host-btn').click());
    await jusqua(async () => hotePhare.evaluate(
      () => !!(window.__game.net && window.__game.net.bus)), 60000);
    const codeTenu = await hotePhare.evaluate(
      () => document.getElementById('room-code').textContent.trim());

    const inviteSain = await banc.joueur('Basile', AVEC_NUAGE);
    await inviteSain.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await inviteSain.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, codeTenu);
    await dormir(2000);
    await inviteSain.evaluate(() => document.getElementById('online-play-btn')?.click());
    await hotePhare.evaluate(() => document.getElementById('online-play-btn')?.click());
    const retrouves = await jusqua(async () => {
      const a = await nomsVus(hotePhare), b = await nomsVus(inviteSain);
      return a.includes('Basile') && b.includes('Léo');
    }, 120000);
    verifier('un hôte sans courtier est trouvé par un invité dont le courtier marche',
      retrouves, JSON.stringify([await nomsVus(hotePhare), await nomsVus(inviteSain)]));
    const rolesTenus = await inviteSain.evaluate(() => ({
      hote: window.__game.net ? window.__game.net.isHost : null,
      actif: !!(window.__game.net && window.__game.net.active),
    }));
    verifier('et il le REJOINT, au lieu d\'ouvrir un monde jumeau sous le même code',
      rolesTenus.actif && rolesTenus.hote === false, JSON.stringify(rolesTenus));
    await inviteSain.close();
    await hotePhare.close();
    await souffler();

    // --- et quand l'hôte vient VRAIMENT de partir, on dit la vérité ----------
    //
    // Le phare de l'hôte brille encore — il était là il y a moins de deux
    // minutes — mais plus personne ne répond. L'ancien message accusait le
    // Wi-Fi de la maison, plein écran, avec un conseil inapplicable. Le seul
    // texte honnête : le monde est là, personne n'y répond, réessaie.
    nuageRelais.relaisSemer({ code: '80808', de: 'wmc-marlon-80808', vers: 'monde',
      msg: { t: 'phare' } });
    const prudente = await banc.joueur('Théa', AVEC_NUAGE);
    await prudente.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await prudente.evaluate(() => {
      document.getElementById('join-code').value = '80808';
      document.getElementById('join-btn').click();
    });
    await jusqua(async () => prudente.evaluate(
      () => (document.getElementById('online-status').textContent || '').startsWith('❌')), 90000);
    const phraseHonnete = await prudente.evaluate(
      () => document.getElementById('online-status').textContent);
    verifier('quand l\'hôte vient de partir, le message dit que personne ne répond',
      /personne n'y répond/i.test(phraseHonnete), phraseHonnete);
    verifier('sans accuser le Wi-Fi de la maison', !/Wi-Fi bloque|hôtels/.test(phraseHonnete),
      phraseHonnete);
    const pasDeJumeau = await prudente.evaluate(() => ({
      enJeu: window.__game.running,
      hote: window.__game.net ? window.__game.net.isHost : null,
    }));
    verifier('et l\'enfant n\'est pas devenu l\'hôte d\'un monde jumeau',
      !pasDeJumeau.enJeu && pasDeJumeau.hote !== true, JSON.stringify(pasDeJumeau));
    await prudente.close();

    // --- l'enfant qui entend tout le monde et que personne n'entend ----------
    //
    // Le secours par le nuage est rouvert à chaque tentative de reconnexion et
    // à chaque réveil. S'il prend la place d'un lien direct qui marche,
    // l'enfant devient muet : il reçoit encore par les écouteurs de l'ancien
    // lien — il voit les autres bouger, il croit tout normal — mais rien de ce
    // qu'il envoie n'arrive. Et le troisième joueur, qui n'apprend l'existence
    // des autres que par ces positions relayées, ne le voit jamais arriver.
    //
    // Ici le nuage pointe sur un port où personne n'écoute : c'est la version
    // brutale d'un nuage lent, et elle rend la panne franche au lieu de la
    // laisser dépendre de la vitesse de la machine.
    const NUAGE_MORT = { portNuage: 9799 };
    const { p: chef, code: codeMuet2 } = await banc.creerMonde('Léa', NUAGE_MORT);
    const cadette = await banc.rejoindre('Jules', codeMuet2, NUAGE_MORT);
    await jusqua(async () => (await nomsVus(chef)).includes('Jules'), 45000);
    // Le geste qui déclenchait la panne, et que le jeu fait tout seul.
    await cadette.evaluate(() => window.__game.net.reprendreParLeNuage());
    await dormir(2000);
    const lienGarde = await cadette.evaluate(() => {
      const c = [...window.__game.net.conns.values()][0];
      return !!(c && c.conn && !c.conn.parNuage);
    });
    verifier('un secours qui s\'ouvre ne débranche pas le lien direct', lienGarde);
    // La mesure qui compte : la voix de l'enfant arrive-t-elle encore ? Les
    // positions partent huit fois par seconde, c'est le débit le plus franc.
    await chef.evaluate(() => {
      window.__posRecues = 0;
      const net = window.__game.net;
      const vrai = net.onMessage.bind(net);
      net.onMessage = (conn, msg) => {
        if (msg && msg.t === 'pos') window.__posRecues++;
        return vrai(conn, msg);
      };
    });
    await dormir(3000);
    const entendu = await chef.evaluate(() => window.__posRecues);
    verifier('et l\'enfant continue de se faire entendre', entendu > 0,
      `${entendu} positions reçues en 3 s`);
    await chef.close();
    await cadette.close();

    await souffler();
    // --- le Wi-Fi public ne doit plus empêcher de jouer ----------------------
    //
    // « Ça me paraît aberrant que sur une connexion publique, je ne puisse pas
    // juste jouer au réseau. » Et c'est vrai : une chose passe forcément, sans
    // quoi le jeu ne se serait pas ouvert — le HTTPS vers le nuage. Quand le
    // pair-à-pair est mort, la partie emprunte donc ce tuyau-là.
    //
    // Ici le pair-à-pair est coupé À LA RACINE : aucun candidat ne circule,
    // aucun lien direct n'est possible, quel que soit le relais. C'est le
    // Wi-Fi d'hôtel dans ce qu'il a de pire. Les deux enfants doivent malgré
    // tout se voir — et sans que personne n'ait rien à faire.
    const { p: hoteNuage, code: codeNuage } = await banc.creerMonde('Emma', AVEC_NUAGE);
    const bloque = await banc.joueur('Tom', { sansPairAPair: true, ...AVEC_NUAGE });
    await bloque.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await bloque.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, codeNuage);
    await bloque.evaluate(() => document.getElementById('online-play-btn')?.click());
    const seVoient = await jusqua(async () => {
      const a = await nomsVus(hoteNuage);
      const b = await nomsVus(bloque);
      return a.includes('Tom') && b.includes('Emma');
    }, 90000);
    // À l'échec, on veut l'autopsie, pas juste le constat : l'état réseau des
    // deux côtés dit lequel a lâché, et où.
    const autopsie = async (p) => p.evaluate(() => {
      const n = window.__game.net;
      return {
        actif: !!(n && n.active), hote: n ? n.isHost : null, bus: !!(n && n.bus),
        conns: n ? [...n.conns.entries()].map(([k, c]) => [k.slice(0, 18), c.pret, !!c.conn.parNuage]) : [],
        statut: (document.getElementById('online-status') || {}).textContent || '',
        lien: n ? n.linkState : null,
      };
    });
    verifier('pair-à-pair mort, les deux enfants se voient quand même',
      seVoient, seVoient ? '' : JSON.stringify({
        noms: [await nomsVus(hoteNuage), await nomsVus(bloque)],
        emma: await autopsie(hoteNuage), tom: await autopsie(bloque),
        erreursTom: bloque.erreurs.slice(0, 3),
      }));
    // Et c'est bien par le tuyau de secours que c'est passé : sans cette
    // mesure, un lien direct rétabli en douce ferait passer le scénario sans
    // rien prouver du tout.
    verifier('et c\'est bien le nuage qui a porté la partie',
      nuageRelais.relaisCompte(codeNuage.toUpperCase()) > 2,
      `${nuageRelais.relaisCompte(codeNuage.toUpperCase())} messages relayés`);
    // Ce qu'un enfant fait en premier : poser un bloc, et que l'autre le voie.
    const posePassee = await bloque.evaluate(() => {
      const w = window.__game.world;
      const p = window.__game.player;
      const x = Math.round(p.pos.x) + 2, z = Math.round(p.pos.z);
      const y = w.terrainHeight(x, z) + 1;
      w.setBlock(x, y, z, 23);          // laine rouge
      return { x, y, z };
    });
    const vuEnFace = await jusqua(async () => hoteNuage.evaluate(
      ({ x, y, z }) => window.__game.world.getBlock(x, y, z) === 23, posePassee), 60000);
    verifier('un bloc posé par le nuage arrive chez l\'autre',
      vuEnFace, JSON.stringify(posePassee));

    // --- quitter l'application et y revenir, en jouant par le nuage ----------
    //
    // Signalé par Max sur son iPhone : « j'ai quitté l'app et je suis revenu,
    // j'étais déconnecté, et impossible de me reconnecter — j'ai dû quitter le
    // online pour revenir. » La reconnexion existait pourtant : elle ne
    // retentait que le lien DIRECT, c'est-à-dire précisément celui que ce
    // réseau interdit. Elle tournait donc en boucle sans aucune issue.
    //
    // On refait le geste exact : l'enfant part, reste absent plus longtemps
    // que le silence toléré — de quoi se faire oublier de l'hôte — puis
    // revient. Il doit retrouver la partie tout seul.
    // Ce scénario-ci est le plus long de la suite : deux navigateurs, un tuyau
    // de secours qui sonde toutes les deux secondes, une absence de vingt-six
    // secondes, puis une reconnexion qui a droit à quatre-vingt-dix secondes.
    // Il démarrait sur une machine que tout ce qui précède vient de chauffer,
    // et c'est le seul de la suite dont la fenêtre soit trop courte pour
    // absorber cela. On le fait donc partir au calme, comme les cinq autres
    // passages lourds — sans toucher à la fenêtre, qui mesure le jeu.
    await souffler();
    await endormir(bloque);
    await dormir(26000);                       // au-delà des vingt secondes tolérées
    await reveiller(bloque);
    // UNE CHRONOLOGIE, PAS UN VERDICT SEC.
    //
    // Ce scénario est le seul du dépôt à échouer dans le portail et à réussir
    // en solo, trois fois sur cinq. Un booléen au bout de quatre-vingt-dix
    // secondes ne dit rien de ce qui s'est passé pendant : on a soupçonné la
    // charge, le prénom, ma garde d'envoi — sans jamais regarder. On note donc
    // ce que chacun voit, toutes les cinq secondes, et l'état de sa session.
    // Si tout va bien la chronologie ne coûte rien ; si ça retombe, elle dit
    // lequel des deux n'est pas revenu, et à quelle seconde.
    const etatCourt = async (p) => p.evaluate(() => {
      const n = window.__game.net;
      return n ? { actif: !!n.active, hote: !!n.isHost, liens: n.conns ? n.conns.size : -1,
        prets: n.conns ? [...n.conns.values()].filter((c) => c.pret).length : -1 } : null;
    }).catch(() => 'page morte');
    const chrono = [];
    const tRetour = Date.now();
    const retrouve = await jusqua(async () => {
      const a = await nomsVus(hoteNuage);
      const b = await nomsVus(bloque);
      const s = Math.round((Date.now() - tRetour) / 1000);
      if (!chrono.length || s - chrono[chrono.length - 1].s >= 5) {
        chrono.push({ s, hote: a, revenu: b,
          eH: await etatCourt(hoteNuage), eR: await etatCourt(bloque) });
      }
      return a.includes('Tom') && b.includes('Emma');
    }, 90000);
    if (!retrouve) {
      console.log('   🔎 chronologie du retour (5 s) :');
      for (const l of chrono) console.log(`      ${String(l.s).padStart(2)} s  ${JSON.stringify(l)}`);
    }
    verifier('revenir dans l\'application remet dans la partie, sans rien redemander',
      retrouve, JSON.stringify([await nomsVus(hoteNuage), await nomsVus(bloque)]));
    // Et le monde répond encore : un lien qui se rétablit sans porter les
    // blocs ne servirait à rien.
    const poseApres = await bloque.evaluate(() => {
      const w = window.__game.world;
      const p = window.__game.player;
      const x = Math.round(p.pos.x) + 3, z = Math.round(p.pos.z) + 1;
      const y = w.terrainHeight(x, z) + 1;
      w.setBlock(x, y, z, 26);                 // laine verte
      return { x, y, z };
    });
    verifier('et les blocs repassent après le retour',
      await jusqua(async () => hoteNuage.evaluate(
        ({ x, y, z }) => window.__game.world.getBlock(x, y, z) === 26, poseApres), 60000),
      JSON.stringify(poseApres));
    await bloque.close();
    await hoteNuage.close();

    // On laisse la machine redescendre : ce qui suit empile les délais du jeu
    // et n'a rien à prouver sur un conteneur essoufflé.
    await souffler();
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
    // Ici, les présentations sont avalées quatorze secondes — bien au-delà des
    // six secondes que couvraient les deux anciennes relances, et toujours en
    // deçà de la coupure à vingt. Quatorze et pas onze : la fenêtre part du
    // premier hello avalé, et l'invité vient d'entrer dans le monde — sur une
    // machine chargée, la génération des morceaux retarde ses minuteurs de
    // relance de plusieurs secondes. Avec trois créneaux de relance seulement,
    // le garde-fou « au moins deux perdues » tombait parfois à une seule
    // (mesuré : 1 avalée, deux passes sur trois un jour de machine lente).
    const { p: patiente, code: codeLent } = await banc.creerMonde('Théo');
    const lent = await banc.joueur('Camille', { helloFragile: true });
    // Au premier plan : Chromium bride les minuteurs d'un onglet caché, et le
    // filtre du banc s'installe justement sur un minuteur. Sans cela il
    // arrivait après les présentations qu'il devait avaler — le scénario
    // passait alors sans avoir rien éprouvé, ce que le garde-fou plus bas a
    // fini par attraper.
    await lent.bringToFront();
    // Deux présentations avalées, quel que soit l'état de la machine.
    //
    // Un COMPTE plutôt qu'une fenêtre en secondes : une fenêtre mesurait
    // surtout la vitesse du conteneur. Et DEUX plutôt que cinq : ce que le
    // scénario doit établir, c'est qu'une présentation perdue finit par
    // passer — deux pertes le prouvent aussi bien que cinq, et le prouvent en
    // une dizaine de secondes au lieu d'empiler assez de cycles de reprise
    // pour déborder l'attente sur une machine chargée. Cinq était un chiffre
    // de mon cru, pas une exigence du jeu.
    await lent.evaluate(() => { window.__avalerHelloNombre = 2; });
    await lent.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await lent.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, codeLent);
    await dormir(1500);
    await lent.evaluate(() => document.getElementById('online-play-btn')?.click());

    // Deux minutes. Ce scénario empile volontairement les délais du jeu :
    // quatorze secondes de présentations avalées, la coupure du lien muet à
    // vingt, puis la reconnexion. Soixante secondes suffisaient quand il
    // arrivait tôt dans la suite ; depuis que les scénarios de réseau bloqué
    // le précèdent, la machine est chaude et il lui faut plus d'air. Vérifié
    // en isolation : le jeu s'en sort, avec cinq présentations perdues.
    const seRetrouvent = await jusqua(async () => {
      const a = await nomsVus(patiente);
      const b = await nomsVus(lent);
      return a.includes('Camille') && b.includes('Théo');
    }, 200000);
    verifier('une présentation perdue finit par passer', seRetrouvent,
      JSON.stringify([await nomsVus(patiente), await nomsVus(lent)]));
    const compteFinal = [(await vu(patiente)).compteur, (await vu(lent)).compteur];
    verifier('et le compteur le dit des deux côtés',
      compteFinal.every((n) => n === 2), compteFinal.join('/'));
    // Sans cette garantie, le scénario pourrait passer sans avoir rien éprouvé :
    // c'est déjà arrivé une fois, la fenêtre s'étant écoulée avant la connexion.
    const avalees = await lent.evaluate(() => window.__avalerHelloComptes || 0);
    // Le garde-fou n'a qu'un travail : établir que le scénario n'était pas
    // vide. Puisque le banc avale maintenant un nombre fixe, on exige ce
    // nombre exactement — ni plus, ni moins.
    verifier('et des présentations ont bien été perdues en chemin', avalees >= 2,
      `${avalees} avalées`);
    await lent.close();
    await patiente.close();

    await souffler();
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
    //
    // On observe DÈS MAINTENANT, et pas seulement après l'attente : la date de
    // présentation du premier lien ne vit que vingt secondes, et un témoin qui
    // n'ouvre l'œil qu'après trente-cinq ne voyait jamais que le second. Sur
    // une machine au repos plusieurs cycles tenaient encore dans sa fenêtre et
    // il passait ; sur un conteneur chargé, il n'en voyait qu'un seul et
    // tombait — sans que le jeu y soit pour rien.
    const presentations = new Set();
    const echantillonner = async () => {
      const d = await jamais.evaluate(() => {
        const n = window.__game.net;
        if (!n || !n.active) return null;
        const c = [...n.conns.values()][0];
        return c ? c.presenteA || 0 : null;
      });
      if (d) presentations.add(d);
    };
    for (let i = 0; i < 14; i++) { await echantillonner(); await dormir(2500); }
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
    // On attend que la seconde présentation arrive, on ne compte pas les tours.
    // Le cycle dure vingt secondes de jeu, mais sur un conteneur qui enchaîne
    // sept suites les minuteries du navigateur glissent : un nombre fixe
    // d'échantillons mesure la vitesse de la machine, pas le comportement du
    // jeu. « Finit par arriver » se prouve avec une échéance, pas un compteur.
    await jusqua(async () => {
      await echantillonner();
      return presentations.size >= 2;
    }, 150000);
    verifier('et le lien muet est coupé puis rouvert, au lieu de durer pour toujours',
      presentations.size >= 2, `${presentations.size} présentations successives`);
    await jusqua(async () => (await jamais.evaluate(
      () => window.__avalerHelloComptes || 0)) >= 2, 60000);
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
    // ON LAISSE SOUFFLER AVANT CE PASSAGE-LÀ, et c'est la règle générale du
    // banc qui manquait ici. Ce scénario ouvre deux navigateurs de plus après
    // une vingtaine de scénarios, et il CHRONOMÈTRE : c'est le seul de la
    // suite dont le verdict soit une durée. Mesuré à la sonde sur une machine
    // qui respire, la rencontre se fait en SIX secondes ; dans la suite, à la
    // file, le même scénario annonçait 55 à 57 s — au-delà même de sa propre
    // limite d'attente, ce qui ne peut pas venir du jeu. Rouge à l'identique
    // sur origin/main, donc en production, et depuis longtemps : personne ne
    // l'avait rejoué seul.
    await souffler();
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
    // Et une seconde fois : ouvrir un onglet et charger le jeu chauffe la
    // machine juste avant le coup de chronomètre.
    await souffler();
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

    // --- un message d'une ancienne version ne casse rien ----------------------
    //
    // Le chantier commun et le coffre partagé n'existent plus (v255), mais une
    // tablette restée sur l'ancienne version peut encore les envoyer. Le
    // receveur cède : pas de jauge, pas de fantôme, et surtout pas d'erreur.
    // (Le chantier s'éprouvait ici jusqu'à la v254 ; Jade et Rui restent,
    // pour les émotes.)
    const { p: lea, code: codeLea } = await banc.creerMonde('Jade');
    const rui = await banc.rejoindre('Rui', codeLea);
    const erreursAvant = lea.erreurs.length;
    await rui.evaluate(() => {
      const net = window.__game.net;
      net.broadcast({ t: 'chantier', c: { plan: 'cabane', x: 0, y: 40, z: 0, t: Date.now() } });
      net.broadcast({ t: 'chest', items: { '🍓 Baies': 1 } });
    });
    await dormir(2500);
    const ancien = await lea.evaluate(() => ({
      tourne: !!window.__game.running,
      jauge: !!document.getElementById('chantier-hud'),
    }));
    verifier('un chantier ou un coffre envoyé par une ancienne version est ignoré sans casse',
      ancien.tourne && !ancien.jauge && lea.erreurs.length === erreursAvant,
      JSON.stringify({ ...ancien, erreurs: lea.erreurs.slice(erreursAvant, erreursAvant + 2) }));

    // --- les émotes, repliées et à bon escient --------------------------------
    //
    // Trois boutons d'émotes vivaient en permanence à l'écran — y compris seul
    // dans un monde en ligne, où personne n'est là pour les voir : l'animation
    // se joue sur notre avatar, que nous ne voyons pas nous-mêmes. Ils se
    // replient désormais derrière UN bouton, qui n'apparaît que quand un ami
    // est vraiment là.
    const emotesChez = (page) => page.evaluate(() => ({
      bouton: getComputedStyle(document.getElementById('emote-toggle')).display !== 'none',
      rangee: getComputedStyle(document.getElementById('emote-row')).display !== 'none',
    }));
    await jusqua(async () => (await emotesChez(lea)).bouton, 20000);
    const eAvant = await emotesChez(lea);
    verifier('avec un ami là, un seul bouton d\'émotes, replié',
      eAvant.bouton && !eAvant.rangee, JSON.stringify(eAvant));
    await lea.evaluate(() => document.getElementById('emote-toggle').click());
    const eOuvert = await emotesChez(lea);
    await lea.evaluate(() => document.querySelector('#emote-row button').click());
    const eApres = await emotesChez(lea);
    verifier('il se déplie au toucher, et se replie après l\'émote',
      eOuvert.rangee && !eApres.rangee, JSON.stringify({ eOuvert, eApres }));

    // --- la flèche vers l'ami -------------------------------------------------
    // Les enfants passaient leur temps à se chercher. Quand l'ami sort du cadre
    // de la minicarte, une flèche à son bord montre la direction.
    await rui.evaluate(() => { const g = window.__game; g.player.pos.x += 400; });
    await dormir(1500);
    const fleches = await lea.evaluate(() => {
      const g = window.__game;
      document.getElementById('map-btn').click();
      return new Promise((ok) => setTimeout(() => ok(window.__flechesAmis), 400));
    });
    verifier('un ami hors du cadre devient une flèche au bord de la minicarte',
      fleches >= 1, `${fleches} flèche(s)`);
    await rui.close();
    const emoteRangee = await jusqua(async () => !(await emotesChez(lea)).bouton, 45000);
    verifier('seul dans le monde, le bouton d\'émotes se range', emoteRangee,
      JSON.stringify(await emotesChez(lea)));
    await lea.close();

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
    nuageRelais.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ le monde partagé tient dans tous les cas éprouvés');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
