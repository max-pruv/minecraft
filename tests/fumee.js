// La voie rapide : cinq minutes au lieu d'une heure.
//
// POURQUOI ELLE EXISTE. Le portail complet est passé de cinq suites à huit, et
// chaque livraison le payait en entier — une heure, même pour ajouter un
// bâtiment. La cadence est tombée de neuf versions par jour à deux ou trois, et
// la bibliothèque de monuments est restée un jour entier dans le dépôt sans
// jamais être branchée, faute de place dans la file.
//
// Ce témoin-ci couvre ce qui casse VRAIMENT quand on ne touche qu'au contenu :
// un fichier qui ne se charge pas, une erreur au démarrage, un monde qui ne
// s'ouvre pas, un joueur qui tombe à travers le sol, un bâtiment qui ne se
// pose pas. Il ne remplace PAS le portail pour le réseau, la sauvegarde, le
// terrain ou l'espace parent — c'est `tout.js` qui décide, sur les fichiers
// modifiés, et pas le jugement de qui livre.
//
//     cd tests && npm run fumee

const { Banc, dormir, jusqua } = require('./banc.js');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

(async () => {
  const banc = new Banc({ portJeu: 8351, portPairs: 9351 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Camille');

    verifier('le jeu démarre et le monde tourne',
      await tab.evaluate(() => !!window.__game && window.__game.running));

    // Tous les modules ont bien été chargés. Un fichier neuf oublié dans la
    // liste du cache passe ici, et nulle part ailleurs sans navigateur.
    const modules = await tab.evaluate(() => ({
      monde: !!window.__game.world,
      joueur: !!window.__game.player,
      betes: !!window.__game.animalManager,
      edu: !!window.__game.edu,
      vehicules: !!window.__vehicules,
    }));
    verifier('tous les morceaux du jeu sont là',
      Object.values(modules).every(Boolean), JSON.stringify(modules));

    // L'enfant tient debout : le sol est sous lui et il ne traverse pas.
    const depart = await tab.evaluate(() => ({ ...window.__game.player.pos }));
    await dormir(3000);
    const apres = await tab.evaluate(() => ({ ...window.__game.player.pos }));
    verifier('l\'enfant ne tombe pas à travers le monde',
      apres.y > 0 && Math.abs(apres.y - depart.y) < 30,
      `${depart.y.toFixed(1)} → ${apres.y.toFixed(1)}`);

    // Poser et retirer un bloc : le geste le plus fréquent du jeu.
    const pose = await tab.evaluate(() => {
      const w = window.__game.world, p = window.__game.player;
      const x = Math.round(p.pos.x) + 2, z = Math.round(p.pos.z) + 2;
      const y = w.terrainHeight(x, z) + 1;
      w.setBlock(x, y, z, 23);
      return { pose: w.getBlock(x, y, z) === 23, x, y, z };
    });
    verifier('poser un bloc marche encore', pose.pose, JSON.stringify(pose));

    // La bibliothèque de monuments : elle se feuillette et elle pose.
    const biblio = await tab.evaluate(() => {
      // On ouvre par le bouton de l'atelier, comme l'enfant.
      const inv = [...document.querySelectorAll('.fun-btn')]
        .find((b) => b.title === 'Atelier');
      if (inv) inv.click();
      const onglet = document.querySelector('.fun-tab[data-t="monuments"]');
      if (!onglet) return { onglet: false };
      onglet.click();
      const lignes = document.querySelectorAll('#fun-tab-body .fun-row').length;
      return { onglet: true, lignes };
    });
    verifier('l\'onglet des monuments existe et se remplit',
      biblio.onglet && biblio.lignes > 0, JSON.stringify(biblio));

    if (biblio.onglet && biblio.lignes > 0) {
      const avant = await tab.evaluate(
        () => Object.keys(window.__game.world.exportEdits()).length);
      await tab.evaluate(() => {
        const b = [...document.querySelectorAll('#fun-tab-body .fun-row button')]
          .find((x) => x.textContent === 'Poser');
        if (b) b.click();
      });
      const posee = await jusqua(async () => (await tab.evaluate(
        () => Object.keys(window.__game.world.exportEdits()).length)) > avant + 500, 30000);
      const apresPose = await tab.evaluate(
        () => Object.keys(window.__game.world.exportEdits()).length);
      verifier('et un monument se pose vraiment devant l\'enfant',
        posee, `${avant} → ${apresPose} blocs`);
    }

    verifier('aucune erreur JavaScript de bout en bout',
      tab.erreurs.length === 0, JSON.stringify(tab.erreurs.slice(0, 3)));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ le jeu démarre, se joue et se bâtit');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
