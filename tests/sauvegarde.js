// La sauvegarde d'un enfant qui bâtit beaucoup.
//
// Découvert dans la vraie base : le profil de Marlon pesait 901 886 octets
// pour une limite de 900 000. Le jeu jetait donc, à chaque envoi, d'abord ses
// photos puis SES BLOCS LES PLUS ANCIENS — il n'en gardait que quatre mille.
// Un enfant qui construit beaucoup était puni de construire.
//
// Deux causes, dans le même document : ses photos y pesaient un tiers de la
// place alors que ce sont des JPEG déjà compressés, et ses blocs y étaient en
// clair alors qu'ils se compressent cinq fois.
//
//     cd tests && npm install && npm run sauvegarde

const { Banc, dormir, jusqua } = require('./banc.js');
const { servirLeNuage } = require('./nuage.js');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

// Marlon en est à dix-sept mille quatre cent trente-cinq, et il continue.
// Quarante mille, c'est un grand château : quelques mois de plus au même
// rythme. C'est là que l'ancienne sauvegarde le punissait pour de bon, en ne
// gardant que quatre mille blocs sur quarante mille.
const BLOCS = 40000;

(async () => {
  const nuage = await servirLeNuage(9731);
  const AVEC_NUAGE = { portNuage: 9731 };
  const banc = new Banc({ portJeu: 8341, portPairs: 9341 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Marlon', AVEC_NUAGE);

    // On lui fait poser autant de blocs qu'il en a vraiment, et huit photos.
    const pose = await tab.evaluate((n) => {
      const g = window.__game;
      const w = g.world;
      const p = g.player.pos;
      let faits = 0;
      // Un mur long et haut, comme un enfant qui construit vraiment : des
      // coordonnées voisines, donc très compressibles — c'est le cas réel.
      for (let i = 0; faits < n; i++) {
        const x = Math.floor(p.x) + (i % 120) - 60;
        const z = Math.floor(p.z) + Math.floor(i / 120) % 40 - 20;
        const y = w.terrainHeight(x, z) + 1 + Math.floor(i / 4800);
        w.setBlock(x, y, z, 23);
        faits++;
      }
      w.saveEdits();
      // Huit photos, la limite du jeu. Une vraie photo fait quarante kilos.
      const fausse = 'data:image/jpeg;base64,' + 'A'.repeat(40000);
      localStorage.setItem('web-minecraft-photos-v1', JSON.stringify(Array(8).fill(fausse)));
      return faits;
    }, BLOCS);
    verifier('l\'enfant a posé autant de blocs que dans la vraie vie',
      pose === BLOCS, `${pose} blocs`);

    // La sauvegarde part, et on regarde ce que le nuage a VRAIMENT reçu.
    await tab.evaluate(async () => {
      const s = window.__game.profileSync;
      s.hydrated = true;          // le jeu a déjà lu le nuage au démarrage
      s.lastPushed = '';          // on force cet envoi-ci
      await s.push();
    });
    const recu = await jusqua(async () => !!nuage.etatDe('Marlon'), 30000);
    verifier('la sauvegarde arrive dans le nuage', recu);

    const doc = nuage.etatDe('Marlon') || {};
    const taille = JSON.stringify(doc).length;
    verifier('elle tient largement sous le plafond', taille < 4000000,
      `${taille.toLocaleString('fr')} octets`);

    // LE TÉMOIN QUI COMPTE : aucun bloc n'a été sacrifié en chemin.
    const blocsRecus = await tab.evaluate(async (nom) => {
      const s = window.__game.profileSync;
      const brut = await window.__game.cloud.statePull(nom);
      // `dilater` n'existe pas sur l'ancienne version : on relit alors le
      // document tel quel, pour que le témoin dise « des blocs manquent »
      // plutôt que de s'effondrer sur une méthode absente.
      const clair = s.dilater ? await s.dilater(brut) : brut;
      let n = 0;
      for (const monde of Object.values(clair.edits || {})) n += Object.keys(monde || {}).length;
      return n;
    }, 'Marlon');
    verifier('et aucun bloc n\'a été jeté en route',
      blocsRecus >= BLOCS, `${blocsRecus} blocs relus sur ${BLOCS} posés`);

    // Les blocs partent compressés : c'est ce qui fait tenir le reste.
    verifier('les blocs voyagent compressés', typeof doc.editsz === 'string',
      doc.editsz ? `${doc.editsz.length.toLocaleString('fr')} octets compressés` : 'en clair');
    if (typeof doc.editsz === 'string') {
      const brut = await tab.evaluate(() => JSON.stringify(window.__game.world.exportEdits()).length);
      verifier('et la compression rend au moins trois fois la place',
        brut / doc.editsz.length > 3, `${(brut / doc.editsz.length).toFixed(1)}x`);
    }

    // Les photos ne pèsent plus sur les blocs : elles ont leur document.
    verifier('les photos ne sont plus dans le document du profil',
      doc.photos === undefined, JSON.stringify(Object.keys(doc)));
    await tab.evaluate(() => {
      const s = window.__game.profileSync;
      return s.photosPousser ? s.photosPousser() : null;
    });
    const albumRecu = await jusqua(async () => {
      const a = nuage.etatDe('Marlon~photos');
      return !!(a && a.photos && a.photos.length === 8);
    }, 20000);
    verifier('mais elles arrivent bien, sur le leur', albumRecu,
      JSON.stringify((nuage.etatDe('Marlon~photos') || {}).photos?.length));

    // LES BLOCS SONT MIS À L'ABRI AVANT QUE LA CARTE NE CHANGE.
    //
    // Max a tranché l'agrandissement de la carte d'un facteur deux : le relief
    // changera partout sauf à Paris. `CLAUDE.md` est net sur la manière — « on
    // casse ce qu'on ne sait pas suivre, pas ce qu'on n'a pas envie de
    // suivre » — et la première marche est une copie des blocs de l'enfant,
    // sur son propre document, comme les photos.
    //
    // Ce que le témoin éprouve, c'est ce qui compte pour la famille : la copie
    // existe, elle contient VRAIMENT la construction, et elle ne pèse pas sur
    // le profil vivant.
    const copieFaite = await jusqua(async () => {
      const a = nuage.etatDe('Marlon~avant-carte');
      return !!(a && (a.editsz || a.edits));
    }, 30000);
    const copie = nuage.etatDe('Marlon~avant-carte') || {};
    verifier('les blocs sont mis à l\'abri avant que la carte ne change',
      copieFaite, JSON.stringify(Object.keys(copie)));
    verifier('et la copie porte bien la construction, pas un document vide',
      !!(copie.editsz && copie.editsz.length > 200) || !!(copie.edits
        && Object.keys(copie.edits).length),
      copie.editsz ? `${copie.editsz.length} octets compressés` : 'pas de blocs');
    // Elle ne se réécrit JAMAIS : repasser dessus remplacerait la copie
    // d'AVANT par une copie d'APRÈS — exactement ce qu'on veut empêcher.
    const empreinteUn = copie.editsz || JSON.stringify(copie.edits || {});
    await tab.evaluate(() => window.__game.world.setBlock(70, 40, 70, 1));
    await tab.evaluate(() => {
      const s = window.__game.profileSync;
      return s.sauverAvantLaRefonte ? s.sauverAvantLaRefonte() : null;
    });
    await dormir(1500);
    const apres = nuage.etatDe('Marlon~avant-carte') || {};
    verifier('et elle ne se réécrit pas au lancement suivant',
      (apres.editsz || JSON.stringify(apres.edits || {})) === empreinteUn,
      'la copie d\'avant reste la copie d\'avant');

    // Et le retour : un autre appareil doit retrouver la construction entière.
    // C'est le témoin qui compte pour l'enfant — pas le contenu du document,
    // mais ce qu'il retrouve en ouvrant le jeu sur la tablette de la maison.
    const autre = await banc.jouerSeul('Marlon', { ...AVEC_NUAGE, memePrenom: true });
    const retrouves = await jusqua(async () => (await autre.evaluate(
      () => Object.keys(window.__game.world.exportEdits()).length,
    )) >= BLOCS * 0.99, 120000);
    const compte = await autre.evaluate(() => Object.keys(window.__game.world.exportEdits()).length);
    verifier('un second appareil retrouve la construction entière',
      retrouves, `${compte} blocs sur ${BLOCS}`);

    // FUSIONNER UN DOCUMENT AVEC LUI-MÊME NE CHANGE RIEN.
    //
    // C'est l'invariant qui protège l'enfant du rechargement en pleine partie :
    // `changed` ne vaut vrai que si la fusion a VRAIMENT rapporté quelque
    // chose, et c'est lui qui décide si la page se relance. Le champ des
    // garages, ajouté en v188, fabriquait un objet vide là où il n'y avait
    // rien — `undefined` contre `{}`, donc « oui » à chaque première fusion,
    // donc une page qui se recharge sur toute tablette neuve. Alice rejoignait
    // le monde et sa session mourait dans la seconde.
    //
    // Le témoin se lit tout seul : je prends le document tel qu'il est, je le
    // fusionne avec lui-même, et rien ne doit avoir bougé.
    //
    // LA TABLETTE NEUVE, et c'est tout le témoin. Une fois la première fusion
    // passée, le champ existe des deux côtés et la comparaison retombe juste :
    // le défaut ne mord QUE la première fois, sur un appareil qui n'a jamais
    // rien synchronisé. On retire donc les champs jamais écrits — ceux qui
    // n'existent que le jour où l'enfant s'en sert — pour se remettre dans
    // l'état exact du premier lancement.
    const surPlace = await tab.evaluate(() => {
      const ps = window.__game.profileSync;
      if (!ps || !ps.snapshot || !ps.merge) return { absent: true };
      const doc = ps.snapshot();
      for (const jamaisEcrit of ['garages', 'pet', 'quest', 'hotbar']) delete doc[jamaisEcrit];
      const r = ps.merge(doc, JSON.parse(JSON.stringify(doc)));
      const bouges = [];
      for (const k of new Set([...Object.keys(doc), ...Object.keys(r.state || {})])) {
        if (k === '_t') continue;
        if (JSON.stringify(doc[k] ?? null) !== JSON.stringify((r.state || {})[k] ?? null)) bouges.push(k);
      }
      return { changed: !!r.changed, bouges };
    });
    verifier('fusionner le profil avec lui-même ne recharge pas la page',
      surPlace.changed === false && (surPlace.bouges || []).length === 0,
      JSON.stringify(surPlace));

    verifier('aucune erreur JavaScript de bout en bout',
      tab.erreurs.length === 0 && autre.erreurs.length === 0,
      JSON.stringify([tab.erreurs.slice(0, 2), autre.erreurs.slice(0, 2)]));
  } finally {
    await banc.fermer();
    nuage.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ un enfant qui bâtit beaucoup ne perd plus rien');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
