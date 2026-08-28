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
    //
    // DEPUIS v176 elle vit dans l'inventaire (bouton +), onglet Bâtiments,
    // monuments en tête — plus dans l'Atelier. Ce témoin est resté HUIT
    // versions sur l'ancien onglet, rouge sans que personne ne le voie :
    // les barrières de v176 à v181 rejouaient des suites choisies à la main
    // et jamais la fumée. La leçon est dans CLAUDE.md — le portail, c'est
    // `npm test`, pas une liste de suites.
    const biblio = await tab.evaluate(async () => {
      document.getElementById('inv-panel').style.display = 'flex';
      const onglet = document.querySelector('#inv-tabs button[data-tab="batiments"]');
      if (!onglet) return { onglet: false };
      onglet.click();
      // les vignettes arrivent par petits paquets : on les attend
      for (let k = 0; k < 200; k++) {
        await new Promise((r) => requestAnimationFrame(r));
        if (document.querySelectorAll('#inv-grid .inv-bat').length >= 20) break;
      }
      return { onglet: true, cellules: document.querySelectorAll('#inv-grid .inv-bat').length };
    });
    verifier('l\'onglet des monuments existe et se remplit',
      biblio.onglet && biblio.cellules > 0, JSON.stringify(biblio));

    if (biblio.onglet && biblio.cellules > 0) {
      const avant = await tab.evaluate(
        () => Object.keys(window.__game.world.exportEdits()).length);
      await tab.evaluate(() => {
        const cell = document.querySelector('#inv-grid .inv-bat');
        if (cell) cell.click();
      });
      const posee = await jusqua(async () => (await tab.evaluate(
        () => Object.keys(window.__game.world.exportEdits()).length)) > avant + 80, 30000);
      const apresPose = await tab.evaluate(
        () => Object.keys(window.__game.world.exportEdits()).length);
      verifier('et un monument se pose vraiment devant l\'enfant',
        posee, `${avant} → ${apresPose} blocs`);
    }

    // Les familles de bâtiments : ce sont elles qui portent les trois cents.
    //
    // On les bâtit TOUTES, pas un échantillon : une variante sur trois cents
    // qui lève une exception, c'est un enfant qui clique et à qui rien
    // n'arrive. C'est bon marché — quelques secondes — parce qu'elles sont
    // gardées en mémoire une fois construites.
    const familles = await tab.evaluate(async () => {
      const m = await import('./src/batiments.js');
      const bilan = { total: m.NB_BATIMENTS, batis: 0, vides: [], erreurs: [], trop: [] };
      for (const f of m.FAMILLES) {
        for (let n = 0; n < f.variantes; n++) {
          try {
            const b = m.batimentVariante(f.id, n);
            if (!b || !b.blocs.length) { bilan.vides.push(`${f.id}#${n}`); continue; }
            // Le monde plafonne à 160 blocs : un bâtiment plus haut serait
            // tronqué en silence, et l'enfant verrait un immeuble décapité.
            if (b.emprise.h > 120) bilan.trop.push(`${f.id}#${n} (${b.emprise.h})`);
            bilan.batis++;
          } catch (e) { bilan.erreurs.push(`${f.id}#${n} : ${e.message}`); }
        }
      }
      return bilan;
    });
    verifier('les trois cents bâtiments se construisent tous',
      familles.batis === familles.total && !familles.erreurs.length,
      `${familles.batis}/${familles.total}`
      + (familles.erreurs.length ? ` · ${familles.erreurs.slice(0, 2).join(' ; ')}` : '')
      + (familles.vides.length ? ` · vides : ${familles.vides.slice(0, 3).join(', ')}` : ''));
    verifier('et aucun ne dépasse le plafond du monde',
      familles.trop.length === 0, JSON.stringify(familles.trop.slice(0, 3)));

    // Le même numéro doit rendre le même bâtiment : un enfant qui aime le
    // septième modèle doit le retrouver demain.
    const stable = await tab.evaluate(async () => {
      const m = await import('./src/batiments.js');
      const a = m.batimentVariante('maison', 7).blocs.length;
      const b = m.batimentVariante('maison', 7).blocs.length;
      const autre = m.batimentVariante('maison', 8).blocs.length;
      return { a, b, autre };
    });
    verifier('un modèle gardé est bien toujours le même',
      stable.a === stable.b && stable.a !== stable.autre, JSON.stringify(stable));

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
