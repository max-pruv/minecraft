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

    // ---- une voiture ne vole pas ------------------------------------------
    //
    // Max, août 2026 : « je voudrais que le véhicule se comporte tel qu'un
    // véhicule normal. Aujourd'hui, on est capable de voler avec une voiture.
    // Je ne veux pas qu'une voiture vole. » Le témoin éprouve le geste de
    // l'enfant — il monte, il appuie sur la touche du vol — et regarde ce que
    // le monde en fait, pas ce que dit un drapeau.
    //
    // Les trois mesures comptent ENSEMBLE : sans « à pied, ça vole encore », on
    // prouverait seulement qu'on a cassé le vol partout ; sans « et ça revient
    // après », on aurait pu clouer l'enfant au sol pour toute la partie.
    const volVoiture = await tab.evaluate(async () => {
      const g = window.__game, p = g.player;
      const patiente = async (f) => {
        for (let k = 0; k < 120; k++) {
          if (f()) return true;
          await new Promise((r) => requestAnimationFrame(r));
        }
        return false;
      };
      const auto = g.animalManager.invoquer('voiture',
        Math.round(p.pos.x) + 3, Math.round(p.pos.z) + 3);
      if (!auto) return { erreur: 'pas de voiture' };
      p.toggleFly();
      const aPied = p.flying;
      if (p.flying) p.toggleFly();
      // se coller à la voiture, puis monter comme l'enfant le fait
      p.pos.set(auto.pos.x, auto.pos.y + 0.5, auto.pos.z);
      document.getElementById('ride-btn').click();
      const enVoiture = await patiente(
        () => document.getElementById('ride-btn').textContent.includes('Descendre'));
      p.toggleFly();
      const voleEnVoiture = p.flying;
      if (p.flying) p.toggleFly();
      document.getElementById('ride-btn').click();
      await patiente(
        () => !document.getElementById('ride-btn').textContent.includes('Descendre'));
      p.toggleFly();
      const apresDescente = p.flying;
      if (p.flying) p.toggleFly();
      return { aPied, enVoiture, voleEnVoiture, apresDescente };
    });
    verifier('à pied, l\'enfant vole toujours',
      volVoiture.aPied === true, JSON.stringify(volVoiture));
    verifier('mais une voiture ne décolle pas',
      volVoiture.enVoiture === true && volVoiture.voleEnVoiture === false,
      JSON.stringify(volVoiture));
    verifier('et le vol revient dès qu\'on est descendu',
      volVoiture.apresDescente === true, JSON.stringify(volVoiture));

    // ---- le garage garde la voiture ---------------------------------------
    //
    // La promesse de Max : « quand un véhicule est déposé dans un garage, il
    // reste tout le temps, un peu comme dans GTA ». C'est donc la promesse
    // qu'on éprouve, et rien d'autre : je gare, je recharge la page, ma
    // voiture est là — et c'est bien LA MIENNE, le même modèle.
    const garage = await tab.evaluate(async () => {
      const g = window.__game;
      const mods = await import('./src/monuments.js');
      // Sur l'ancien code, `src/garages.js` n'existe pas. Un témoin doit
      // échouer PROPREMENT là-dessus, pas emporter la suite avec lui : sans
      // cette garde, l'import rejeté fait tomber les quatre témoins suivants
      // et on ne voit jamais l'étendue réelle du défaut.
      const gar = await import('./src/garages.js').catch(() => null);
      if (!gar) return { erreur: 'pas de src/garages.js', inscrits: 0 };
      const def = mods.MONUMENTS.find((x) => x.id === 'garage');
      if (!def) return { erreur: 'pas de garage dans la bibliothèque', inscrits: 0 };
      const avant = Object.keys(gar.garagesDe(g.world.ctx)).length;
      g.fun.poserBati(mods.monumentBati('garage'));
      const liste = Object.entries(gar.garagesDe(g.world.ctx));
      if (liste.length <= avant) return { erreur: 'garage non inscrit', inscrits: liste.length };
      const [id, box] = liste[liste.length - 1];
      // On amène la voiture à sa place et on descend : exactement ce que fait
      // un enfant, sauf qu'on lui épargne la conduite.
      const [px, pz] = box.places[0];
      const auto = g.animalManager.invoquer('voiture', px, pz);
      if (!auto) return { erreur: 'pas de voiture' };
      auto.pos.set(px + 0.5, box.y + 1, pz + 0.5);
      g.player.pos.set(auto.pos.x, auto.pos.y + 0.5, auto.pos.z);
      const patiente = async (f) => {
        for (let k = 0; k < 120; k++) {
          if (f()) return true;
          await new Promise((r) => requestAnimationFrame(r));
        }
        return false;
      };
      document.getElementById('ride-btn').click();
      const monte = await patiente(
        () => document.getElementById('ride-btn').textContent.includes('Descendre'));
      document.getElementById('ride-btn').click();
      await patiente(
        () => !document.getElementById('ride-btn').textContent.includes('Descendre'));
      // On ne présume PAS lequel des garages a pris la voiture : deux
      // garages posés d'affilée devant l'enfant se chevauchent, et c'est très
      // bien ainsi — ce qui compte est qu'un garage l'ait gardée, pas lequel.
      const rangee = Object.values(gar.garagesDe(g.world.ctx)).find((b) => b.voiture);
      return {
        inscrits: liste.length, monte, id,
        rangee: !!rangee,
        modele: rangee ? rangee.voiture.flotte : null,
      };
    });
    verifier('un garage de la bibliothèque s\'inscrit là où on le pose',
      garage.inscrits >= 1, JSON.stringify(garage));
    verifier('la voiture qu\'on y laisse est rangée, avec son modèle',
      garage.rangee === true && !!garage.modele, JSON.stringify(garage));

    // LE RECHARGEMENT EST LE TÉMOIN. C'est lui qui distingue « la voiture est
    // encore à l'écran » de « la voiture est sauvegardée » — sans lui, tout
    // serait vert sur un code qui ne retient rien.
    await tab.reload({ waitUntil: 'load', timeout: 90000 });
    await tab.waitForFunction(() => !!window.__game, null, { timeout: 90000 });
    // Un rechargement ramène au menu : l'enfant rappuie sur « Jouer ». Sans ce
    // geste, on attendrait `running` pour toujours et le témoin ne dirait plus
    // rien sur les garages — il dirait seulement que le banc a lâché.
    await tab.evaluate(() => {
      window.__game.edu.today().libreJusqua = 86400;
      document.getElementById('play-btn').click();
    });
    await tab.waitForFunction(() => window.__game.running, null, { timeout: 90000 });
    await dormir(3500);
    const retrouvee = await tab.evaluate(async () => {
      const g = window.__game;
      const gar = await import('./src/garages.js').catch(() => null);
      if (!gar) return { garages: 0, modele: null };
      const boxes = Object.values(gar.garagesDe(g.world.ctx));
      const rangee = boxes.find((b) => b.voiture);
      return {
        garages: boxes.length,
        modele: rangee ? rangee.voiture.flotte : null,
      };
    });
    verifier('après un rechargement, la voiture est toujours au garage',
      retrouvee.modele === garage.modele && !!retrouvee.modele,
      `${JSON.stringify(retrouvee)} vs ${garage.modele}`);

    // ---- des voitures dans les villes, et sur la rue ------------------------
    //
    // « Ya toujours pas de voitures dans les villes » (Max). Il avait raison :
    // les anneaux étaient cherchés sous forme de CARRÉS posés au hasard autour
    // de l'ancre et validés sur le terrain brut — jamais sur les rues. Mesuré :
    // quarante-quatre pour cent de Paris est de la chaussée, et le meilleur
    // carré ne dépassait pas seize blocs de rayon à 93 %.
    //
    // Ce que le témoin éprouve, c'est la promesse : chaque grande ville a au
    // moins un circuit, et ce circuit TIENT LA RUE. Un tracé qui traverse la
    // Seine ou un pâté d'immeubles est pire que pas de voitures du tout.
    const circuits = await tab.evaluate(async () => {
      const sol = (x, z) => window.__game.world.terrainHeight(x, z);
      const out = {};
      const sources = [
        ['paris', './src/paris.js', 'circuitsParis'],
        ['londres', './src/londres.js', 'circuitsLondres'],
        ['sf', './src/sanfrancisco.js', 'circuitsSF'],
      ];
      for (const [cle, mod, fn] of sources) {
        try {
          const m = await import(mod);
          // Une méthode neuve appelée sans garde ferait tomber la suite
          // entière sur l'ancien code : on répond proprement à la place.
          if (typeof m[fn] !== 'function') { out[cle] = { absent: true }; continue; }
          const c = m[fn](sol);
          out[cle] = { nb: c.length, part: c.map((t) => t.part), pts: c.map((t) => t.pts.length) };
        } catch (e) { out[cle] = { erreur: String(e.message).slice(0, 50) }; }
      }
      return out;
    });
    const villesAvecCircuit = Object.entries(circuits)
      .filter(([, v]) => v && v.nb > 0);
    // Nice n'y est pas, et c'est écrit dans `nice.js` : aucune de ses paires
    // d'avenues ne referme une boucle au-dessus du seuil. Elle garde l'anneau
    // de secours jusqu'à sa remise à l'échelle.
    verifier('chaque grande ville a son circuit de voitures',
      villesAvecCircuit.length === 3, JSON.stringify(circuits));
    verifier('et le trajet tient la rue, sans traverser l\'eau ni les maisons',
      villesAvecCircuit.length > 0
      && villesAvecCircuit.every(([, v]) => v.part.every((q) => q >= 88)),
      JSON.stringify(Object.fromEntries(villesAvecCircuit.map(([k, v]) => [k, v.part]))));

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
