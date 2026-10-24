// La porte de sortie unique : toutes les suites, dans l'ordre, avec un verdict
// pour l'ensemble.
//
// Pourquoi ce fichier existe : les suites étaient lancées à la main, une par
// une, et il est arrivé plus d'une fois qu'on publie sur la foi de deux
// suites vertes et d'une troisième « probablement bonne ». Deux régressions
// sont passées comme cela — la visibilité entre invités, cassée deux fois par
// une simplification du banc qui semblait sans risque.
//
// Elles ne tournent JAMAIS en parallèle : le conteneur a quatre cœurs, et
// deux navigateurs qui se les disputent produisent des échecs qui n'existent
// pas dans le jeu. On laisse même la machine souffler entre deux suites, pour
// la même raison.
//
//     cd tests && npm test

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { attendreLaCharge } = require('./charge.js');

// LES COURTES D'ABORD (v255). L'ordre ne change rien au total — chaque suite
// monte son propre banc, ses propres ports, et aucune ne dépend d'une autre —
// mais il change TOUT au temps qu'on attend un premier rouge : `reseau.js` en
// tête, un rouge de `metro.js` se découvrait à la cinquante-neuvième minute.
// Rangées par durée mesurée sur le portail complet de la v251 (de 14 s à
// 19 min 46 s), le rouge d'une petite suite arrive dans les cinq minutes qui
// suivent la fumée. On remesure l'ordre quand une suite change de poids.
const SUITES = [
  'metro.js',        //  0 min 14 s
  'parent.js',       //  0 min 30 s
  'parishd.js',      //  0 min 45 s (v287)
  'carteMonde.js',   //  0 min 34 s
  'sauvegarde.js',   //  0 min 34 s
  'plafond.js',      //  0 min 51 s
  'degats.js',       //  0 min 55 s (v343)
  'visio.js',        //  1 min 03 s
  'maj.js',          //  1 min 34 s
  'realisme.js',     //  1 min 37 s
  'carte.js',        //  1 min 56 s
  'hote.js',         //  2 min 20 s
  'washington.js',   //  2 min 41 s
  'reglages.js',     //  7 min 02 s
  'manhattan.js',    //  8 min 35 s
  'monte.js',        // 15 min 21 s
  'reseau.js',       // 19 min 46 s
];

// QUELLE SUITE PROTÈGE QUOI.
//
// Le portail est passé de cinq suites à huit, et chaque livraison le payait en
// entier : une heure, même pour ajouter un bâtiment. La cadence est tombée de
// neuf versions par jour à deux ou trois, et la bibliothèque de monuments est
// restée un jour entier dans le dépôt sans être branchée, faute de place dans
// la file.
//
// Première version de cet aiguillage : deux voies, rapide ou complète. Mesurée
// sur les douze dernières livraisons, elle aurait pris la voie complète DOUZE
// fois sur douze — donc elle ne servait à rien. Deux raisons : `sw.js` change à
// chaque livraison puisqu'il faut monter CACHE_VERSION, et `main.js` change
// presque toujours puisque c'est là que tout se branche.
//
// Le bon découpage n'est pas « rapide ou tout », c'est « ce qui protège la zone
// touchée ». Toucher au réseau lance les deux suites qui l'éprouvent, pas les
// huit. La couverture ne baisse pas : elle cesse seulement de rejouer ce que le
// changement ne peut pas casser.
//
// Un fichier absent de cette table est du contenu — décor, villes, monuments,
// créatures : la voie rapide suffit. Tout ce qui peut coûter les données d'un
// enfant est ici, et la table doit grandir avec le code.
const GARDIENS = {
  'src/humains.js': ['realisme.js', 'monte.js', 'reglages.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'src/presence.js': ['realisme.js', 'monte.js', 'manhattan.js'],
  'vendor/SkeletonUtils.js': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'vendor/humains/homme-denim.glb': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'vendor/humains/homme-costume.glb': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'vendor/humains/femme-tailleur.glb': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'vendor/humains/homme-chemise.glb': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'vendor/humains/homme-veste.glb': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'vendor/humains/femme-chemise.glb': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'vendor/humains/femme-manteau.glb': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'vendor/humains/garcon.glb': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'vendor/humains/fille.glb': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  // La 911 reconstruite (v545) : ses témoins vivent dans porsche-911.mjs, que
  // degats.js lance ; la table des programmes la lit dans monte.js.
  'vendor/voitures/porsche-911-gt3-rs-hd-v2-compact.glb': ['degats.js', 'monte.js'],
  'tests/porsche-911.mjs': ['degats.js'],
  'tests/porsche-911-textures.mjs': ['degats.js'],
  // les lumières de la flotte (v550), lues par degats.js sous node
  'tests/sonde-feux-flotte.mjs': ['degats.js'],
  'src/net.js': ['reseau.js', 'visio.js', 'hote.js', 'manhattan.js', 'degats.js', 'reglages.js'],
  'src/nouveautes.js': ['maj.js'],
  'src/cloud.js': ['reseau.js', 'reglages.js', 'manhattan.js', 'parent.js'],
  'src/relaisnuage.js': ['reseau.js'],
  'src/fluidite.js': ['reseau.js'],
  // Le tempo du banc (v501) : lu par `main.js`, donc gardé par ses gardiens ;
  // `reglages.js` est la suite qui le déclare et le relit sous node.
  'src/tempo.js': ['reglages.js', 'carte.js', 'monte.js', 'washington.js', 'manhattan.js', 'degats.js'],
  'src/sync.js': ['sauvegarde.js', 'reglages.js', 'manhattan.js', 'monte.js', 'carte.js', 'reseau.js', 'degats.js'],
  // `monte.js` depuis la v236 : c'est lui qui éprouve l'oubli des morceaux
  // dépassés, la seule chose qui garde la mémoire d'un iPad en vol.
  // `horizon.js` lit `terrainHeight` et dessine ce que les morceaux n'ont pas
  // eu le temps de bâtir : `monte.js` l'éprouve en vol, `carte.js` garde le
  // rendu, `plafond.js` garde le sol qu'il lit.
  'src/horizon.js': ['monte.js', 'carte.js', 'plafond.js', 'maj.js'],
  'src/plafond-sol.js': ['monte.js', 'plafond.js', 'manhattan.js', 'carteMonde.js', 'washington.js', 'metro.js'],
  // LE PALIER DE L'APPAREIL (v284). Il décide la distance d'affichage, la
  // profondeur de file du mailleur et la vitesse des jets : `monte.js` garde le
  // trou devant soi et cette vitesse, `maj.js` la préparation et l'accueil — et
  // c'est lui qui porte les témoins du palier —, `reglages.js` l'espace où l'on
  // reprend la main sur la qualité, `carte.js` la distance d'affichage vue de la
  // carte.
  'src/palier.js': ['monte.js', 'maj.js', 'reglages.js', 'carte.js', 'parishd.js', 'parent.js'],
  'src/journal.js': ['parent.js', 'reglages.js', 'maj.js'],
  // le sol continu (v297) : lu par le mailleur et par toute physique au sol
  'src/solcontinu.js': ['plafond.js', 'monte.js', 'manhattan.js', 'carte.js', 'carteMonde.js', 'parishd.js', 'washington.js'],
  'src/routes.js': ['plafond.js', 'carteMonde.js', 'carte.js', 'monte.js'],
  // La couche HD de Paris (v287) : ses tampons et son relais près/loin dans
  // `parishd.js` ; ce qu'elle coûte à la rue dans `monte.js`.
  'src/facadeshd.js': ['parishd.js', 'monte.js', 'plafond.js'],
  'src/arbreshd.js': ['parishd.js', 'plafond.js'],
  // Les monuments en relief (v292) : la couche HD les dessine (`parishd.js`),
  // ils ne posent aucun bloc (`plafond.js`), et l'enfant marche autour d'eux
  // (`monte.js`). `carteMonde.js` garde les rues qui les longent.
  'src/paris-monuments-hd.js': ['parishd.js', 'plafond.js', 'monte.js', 'carteMonde.js'],
  'src/matierehd.js': ['parishd.js', 'monte.js'],
  // LES MONUMENTS À LA HAUTEUR DE LEUR VILLE (v335). Importé par `world.js`
  // et `paris-monuments-hd.js` : l'union de leurs gardiens. Le témoin de la
  // hauteur des monuments est dans `plafond.js`.
  'src/echelle-monuments.js': ['plafond.js', 'parishd.js', 'carte.js', 'washington.js', 'metro.js',
    'carteMonde.js', 'monte.js', 'manhattan.js'],
  // UNE TABLE DE GARDIENS SUIT LES IMPORTS. `liberer.js` est importé par
  // `modeles.js`, `props.js`, `animals.js`, `fun.js` et
  // `main.js` : ses gardiens sont l'UNION de ceux de ses clients, sinon une
  // libération de trop passerait sans réveiller la suite qui la verrait.
  'src/liberer.js': ['realisme.js', 'monte.js', 'fumee.js', 'carte.js', 'reglages.js'],
  'src/couches.js': ['realisme.js', 'monte.js', 'manhattan.js'],
  'src/signatures.js': ['monte.js'],
  'src/world.js': ['plafond.js', 'carte.js', 'washington.js', 'metro.js', 'carteMonde.js', 'monte.js', 'manhattan.js'],
  // Le registre des mondes décide OÙ sont les villes : y toucher les déplace
  // toutes, donc tout ce qui les dessine se rejoue.
  'src/mondes.js': ['carteMonde.js', 'carte.js', 'plafond.js', 'washington.js', 'metro.js'],
  // La Terre elle-même : ses côtes et son relief décident du sol partout.
  'src/terre.js': ['carteMonde.js', 'plafond.js', 'carte.js'],
  // Londres, ville entière du tour du monde.
  'src/londres.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'parishd.js', 'monte.js'],    // la couche HD lit Londres (v390)
  'src/londres-v332.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'sauvegarde.js'],    // la Londres d'avant le kit, sous ce qu'un enfant a bâti (v339)
  // La machine à villes : les cinquante grandes du tour du monde.
  'src/villesmonde.js': ['carteMonde.js', 'carte.js', 'plafond.js', 'monte.js', 'parishd.js'],    // la couche HD lit les villes d'Europe (v394)
  // Les deux cents villes : des données pures, jugées par les mêmes témoins
  // que la machine qui les lit.
  'src/villes200.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  // Les trains intervilles : les voies touchent le terrain et la carte, les
  // rames se prouvent dans monte.js.
  'src/trains.js': ['carteMonde.js', 'carte.js', 'plafond.js', 'monte.js'],
  'src/convoitrain.js': ['carteMonde.js', 'monte.js'],
  // Le tour du monde : neuf sites, dix monuments. Ils aplanissent leur parvis
  // (donc le témoin du relief) et s'ajoutent aux destinations de la carte.
  'src/capitales.js': ['carteMonde.js', 'plafond.js', 'carte.js'],
  'src/monuments.js': ['carteMonde.js', 'plafond.js'],    // un bâtisseur ne tire pas au hasard (v450)
  // Les familles de bâtiments : la bibliothèque de l'inventaire se prouve
  // dans monte.js (onglet, vignettes, pose).
  'src/batiments.js': ['monte.js'],
  'src/nice.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'parishd.js'],    // la couche HD lit Nice (v392)
  'src/nice-v340.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'sauvegarde.js'],    // la Nice d'avant le kit, sous ce qu'un enfant a bâti (v359)
  'src/sanfrancisco-v343.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'sauvegarde.js'],    // la San Francisco d'avant le kit, sous ce qu'un enfant a bâti (v361)
  'src/lille-v344.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'sauvegarde.js'],    // la Lille d'avant le kit, sous ce qu'un enfant a bâti (v368)
  'src/paris-v531.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'sauvegarde.js'],    // Paris d'avant les rues à la GTA, sous ce qu'un enfant a bâti
  'src/londres-v531.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'sauvegarde.js'],    // Londres d'avant les rues à la GTA, sous ce qu'un enfant a bâti
  'src/nice-v531.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'sauvegarde.js'],    // Nice d'avant les rues à la GTA, sous ce qu'un enfant a bâti
  'src/lille-v531.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'sauvegarde.js'],    // Lille d'avant les rues à la GTA, sous ce qu'un enfant a bâti
  'src/sanfrancisco-v531.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'sauvegarde.js'],    // San Francisco d'avant les rues à la GTA, sous ce qu'un enfant a bâti
  'src/villesmonde-v531.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'sauvegarde.js'],    // les villes engendrées d'avant les rues à la GTA, sous ce qu'un enfant a bâti
  'src/carte.js': ['carte.js', 'carteMonde.js', 'manhattan.js'],
  // La capitale : son relief, son métro et ses bâtiments ouverts. Elle touche
  // au sol de la carte, donc le témoin du plafond la surveille aussi.
  'src/washington.js': ['washington.js', 'plafond.js', 'carteMonde.js', 'carte.js', 'parishd.js'],
  'src/washington-v367.js': ['washington.js', 'carteMonde.js', 'plafond.js', 'sauvegarde.js'],    // la Washington d'avant le kit, sous ce qu'un enfant a bâti (v370)
  'src/dcmonuments.js': ['washington.js'],
  // La ville : c'est elle qui bâtit le métro de Paris, la caserne et le
  // commissariat.
  'src/ville.js': ['metro.js', 'carte.js', 'plafond.js'],
  'src/metromonde.js': ['plafond.js', 'metro.js', 'monte.js', 'carteMonde.js'],
  // le nom de chaque station de métro, écrit sur le quai (v529) : la place
  // des plaques se relit sous node (`plafond.js`), leur dessin en jeu (`metro.js`)
  'src/stations.js': ['metro.js', 'plafond.js', 'maj.js'],
  'src/player.js': ['plafond.js', 'monte.js', 'manhattan.js', 'carteMonde.js'],
  'src/conduite.js': ['plafond.js', 'monte.js', 'manhattan.js', 'carteMonde.js', 'washington.js', 'metro.js'],
  'src/admin.js': ['parent.js', 'reglages.js'],
  'src/identity.js': ['reglages.js', 'parent.js'],
  'src/education.js': ['reglages.js', 'parent.js', 'manhattan.js'],
  'src/taxis.js': ['realisme.js', 'monte.js', 'sauvegarde.js', 'manhattan.js', 'degats.js'],
  'src/utilitaires.js': ['carteMonde.js', 'realisme.js', 'monte.js'], // v438 : la fourgonnette et le pickup de la rue
  'src/vehicules.js': ['monte.js', 'washington.js', 'metro.js', 'manhattan.js', 'carteMonde.js', 'reseau.js', 'degats.js'],
  'src/voiesdoubles.js': ['monte.js', 'carteMonde.js', 'reseau.js'],
  'src/raccords.js': ['plafond.js', 'monte.js', 'carteMonde.js'],   // les raccords d'autoroute courts (v440)
  // LE FEU TRICOLORE (v273) : il s'allume dans le monde (carteMonde.js) et il
  // arrête la circulation (monte.js). Un module neuf sans gardien annule tous
  // les acquis du cache de reprise — c'est fait pour se voir tout de suite.
  'src/feux.js': ['carteMonde.js', 'monte.js', 'realisme.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'src/circulation.js': ['monte.js', 'carteMonde.js', 'reseau.js', 'washington.js', 'metro.js', 'manhattan.js'],
  // La Giga-usine : son site touche le terrain (plafond), la carte, le tour
  // du monde — et sa chaîne comme sa voiture à conduire vivent dans monte.js.
  'src/usine.js': ['carteMonde.js', 'carte.js', 'plafond.js', 'monte.js'],
  // Les passants des villes : la vie des rues se prouve dans monte.js.
  'src/passants.js': ['realisme.js', 'monte.js', 'manhattan.js'],
  // Les poissons : la vie de la mer se prouve au même endroit.
  'src/poissons.js': ['monte.js'],
  'src/animals.js': ['monte.js', 'manhattan.js', 'degats.js'],
  'src/montures.js': ['monte.js', 'manhattan.js'],
  'src/avions.js': ['monte.js', 'carteMonde.js'],
  // La cadence de ménage décide si le monde est peuplé : elle se voit dans la
  // vie de rue (fumée + monte) et dans les durées (maj).
  // `education.js` en est client depuis la v234 : ses deux gardiens rejoignent
  // la liste, sinon un changement d'horloge ne réveille pas l'espace parent.
  'src/cadence.js': ['monte.js', 'maj.js', 'carte.js', 'parent.js', 'reglages.js', 'manhattan.js', 'degats.js', 'reseau.js'],
  // Le cadran de cap lit le registre et s'affiche aux commandes : la monte le garde.
  'src/cap.js': ['monte.js', 'carte.js'],
  'src/approche.js': ['monte.js', 'carteMonde.js'],
  'src/gps.js': ['carte.js'],
  // LES COMMANDES SIMPLIFIÉES : le menu unique, Construire, et les boutons ronds.
  'src/commandes.js': ['maj.js', 'monte.js', 'manhattan.js', 'reglages.js', 'carte.js', 'fumee.js'],
  'src/fun.js': ['monte.js', 'carte.js', 'reglages.js', 'reseau.js', 'degats.js'],
  // LES DÉGÂTS DE LA VOITURE (v343) : la règle pure et ce qui se voit.
  'src/degats.js': ['degats.js'],
  'src/degats3d.js': ['degats.js'],
  // la séquence d'embarquement et ses portières (v366) : monte.js les éprouve
  // sur une page qui la joue, reseau.js garde la position qui voyage avec
  'src/embarquement.js': ['monte.js', 'reseau.js'],
  'src/portieres.js': ['monte.js', 'degats.js'],
  // Le hub : presque toute livraison y passe. Deux suites larges le couvrent —
  // la carte traverse l'interface entière, la monte traverse la boucle de jeu.
  'src/main.js': ['carte.js', 'monte.js', 'washington.js', 'manhattan.js', 'degats.js', 'reglages.js', 'parishd.js'],   // parishd : les arbres au palier bas (v541)
  'index.html': ['carte.js', 'reglages.js', 'maj.js', 'manhattan.js'],

  // --- v195 : TRENTE FICHIERS MANQUAIENT, et deux d'entre eux étaient des
  // trous, pas des oublis de confort. `src/visio.js` ne lançait pas
  // `visio.js` ; `src/garages.js`, qui écrit dans le profil de l'enfant à
  // côté de ses blocs, ne lançait pas `sauvegarde.js`. Le fichier disait
  // déjà « la table doit grandir avec le code » — elle n'avait pas grandi.
  //
  // Les villes bâties à la main : elles dessinent leur relief et leurs
  // destinations, exactement comme Nice et Londres, déjà listées.
  'src/paris.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'metro.js', 'parishd.js'],
  'src/paris-v302.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'metro.js', 'parishd.js', 'sauvegarde.js'],
  'src/voirie.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'metro.js', 'parishd.js'],
  'src/manhattan-plan.js': ['manhattan.js', 'plafond.js', 'carte.js', 'carteMonde.js'],
  'src/manhattan-world.js': ['manhattan.js', 'sauvegarde.js', 'plafond.js', 'carte.js', 'washington.js', 'metro.js', 'carteMonde.js', 'monte.js', 'reseau.js', 'hote.js'],
  'src/manhattan-materiaux.js': ['manhattan.js', 'carte.js'],
  'src/manhattan-render.js': ['manhattan.js', 'monte.js'],
  'src/manhattan.js': ['carte.js', 'carteMonde.js', 'plafond.js'],
  'src/sanfrancisco.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'parishd.js'],
  'src/lille.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'parishd.js'],    // la couche HD lit Lille (v392)
  // Les régions et les sites du tour du monde : ils aplanissent leur parvis,
  // donc le témoin du relief, et s'ajoutent aux destinations de la carte.
  'src/chine.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/pole.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/espace.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/gaulois.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/villandry.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/parc.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/aeroport.js': ['carteMonde.js', 'carte.js', 'plafond.js', 'monte.js'],
  'src/circuit.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  // Les voies nommées : elles portent les circuits de voitures de toutes les
  // villes bâties à la main. C'est `carteMonde.js` qui mesure leurs virages
  // dans les six villes — un demi-tour né du chaînage se voit là, nulle part
  // ailleurs.
  'src/voies.js': ['carte.js', 'monte.js', 'carteMonde.js', 'plafond.js'],
  // Le garage écrit dans le profil de l'enfant, à côté de ses blocs : c'est
  // de la sauvegarde, et cela doit se prouver comme telle.
  'src/garages.js': ['sauvegarde.js', 'monte.js'],
  'src/visio.js': ['visio.js', 'reseau.js'],
  'src/partage.js': ['reseau.js', 'parent.js', 'manhattan.js'],
  'src/siege.js': ['monte.js', 'washington.js'],
  // `sons.js` possède le contexte audio de TOUT le jeu depuis la v268 : le
  // moteur et la radio se prennent dans `monte.js` (c'est là qu'on monte),
  // le réglage qui coupe tout dans `reglages.js`, et le carillon du chat
  // comme les bruits de blocs passent par sa sortie — d'où `reseau.js`.
  'src/sons.js': ['monte.js', 'reglages.js', 'reseau.js'],
  'src/radio.js': ['monte.js', 'reglages.js', 'reseau.js'],   // le programme de la radio (v543), pur
  'src/phares.js': ['monte.js', 'degats.js'],
  'src/sensations.js': ['monte.js', 'reglages.js', 'reseau.js'],
  'src/traces.js': ['monte.js', 'reglages.js', 'reseau.js'],
  // les effets de saison en vraies formes (v505) : le témoin des cubes du ciel
  'src/saisons.js': ['monte.js'],
  // Le socle du rendu : un registre de blocs, un atlas ou un mailleur faux
  // n'abîme pas une ville, il les abîme toutes.
  'src/blocks.js': SUITES,
  'src/mesher.js': SUITES,
  'src/tuiles.js': SUITES,
  'src/maillage-worker.js': ['monte.js', 'plafond.js', 'carte.js', 'manhattan.js', 'parishd.js'],
  'src/textures.js': SUITES,
  'src/sky.js': ['carte.js', 'monte.js', 'manhattan.js'],
  'src/effects.js': ['monte.js', 'carte.js'],
  'src/props.js': ['monte.js', 'carte.js'],
  'src/mobiliercasse.js': ['monte.js', 'plafond.js'],
  'src/modeles.js': ['monte.js'],
  'src/betes.js': ['monte.js'],
  // LE BANDEAU DU JEU (v285). Il vivait dans `creatures.js` — retiré avec le mode
  // d'attrape — et c'est la VOIX du jeu : « fais demi-tour », « Sauvegarde
  // allégée », « un parent vient de changer tes réglages ». Ses gardiens sont donc
  // ceux de `main.js`, plus les suites où un message est lui-même un verdict.
  'src/guides.js': ['washington.js'],
  'src/guidesvilles.js': ['washington.js'],
  'src/bandeau.js': ['carte.js', 'monte.js', 'washington.js', 'manhattan.js',
    'maj.js', 'reglages.js', 'reseau.js'],
  'src/personnages.js': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'src/vie.js': ['realisme.js', 'monte.js', 'manhattan.js', 'washington.js'],
  'src/marlon.js': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'src/pietons.js': ['realisme.js', 'monte.js', 'reseau.js', 'visio.js', 'manhattan.js'],
  'src/passages.js': ['plafond.js', 'monte.js', 'carteMonde.js'],   // les passages en biais (v421)
  'src/face-worker.js': ['parent.js'],
};

// Le banc lui-même : s'il bouge, plus rien de ce qu'il dit n'est acquis.
const BANC = ['tests/banc.js', 'tests/nuage.js', 'tests/tout.js', 'tests/charge.js', 'tests/couverture.js', 'tests/aiguillage.js'];

// SAUF QUAND CE QUI BOUGE EST UN DÉLAI OU UN COMMENTAIRE.
//
// Même raisonnement que `swAnodin`, et pour la même raison mesurée : porter
// UNE limite d'attente de dix à trente secondes dans `banc.js` a relancé les
// treize suites — trois quarts d'heure — alors que le changement ne pouvait
// rien casser. C'est ce qui a fait dire à Max, à juste titre, « je ne vois pas
// pourquoi on vient tester réseau quand on change la carte ».
//
// Est anodin : un commentaire, une ligne vide, ou une ligne dont la SEULE
// différence est un nombre — une temporisation, une borne. Tout le reste — une
// signature, un appel, une structure — reste du banc qui bouge.
// ET ÉLARGIR LA TABLE DES GARDIENS EST ANODIN AUSSI — c'est une heure par
// livraison, mesurée.
//
// Déclarer `src/avions.js` et ajouter `monte.js` aux gardiens de
// `src/aeroport.js` : deux lignes, et le portail entier s'est rejoué, une
// heure. Or un gardien AJOUTÉ ne peut faire tourner que PLUS de suites, jamais
// moins : il ne peut donc rien cacher. Un gardien RETIRÉ, si — et c'est
// exactement ce que cette fonction refuse.
//
// La preuve n'est pas dans le diff mais dans les deux TABLES : on lit celle
// d'`origin/main` et celle d'ici, et l'on exige que la nouvelle soit un
// SUR-ENSEMBLE de l'ancienne, clé par clé. Une clé neuve est permise, une
// suite en plus aussi ; une suite en moins ferme la porte.
function tableGardiens(texte) {
  const bloc = texte.slice(texte.indexOf('const GARDIENS = {'));
  const table = new Map();
  for (const l of bloc.slice(0, bloc.indexOf('\n};')).split('\n')) {
    const m = l.match(/^\s*'([^']+)':\s*\[([^\]]*)\]/);
    if (m) table.set(m[1], new Set(m[2].match(/'[^']+'/g)?.map((q) => q.slice(1, -1)) || []));
  }
  return table;
}
function gardiensElargis(base, fichier) {
  if (fichier !== 'tests/tout.js') return false;
  try {
    const { execSync } = require('child_process');
    const avant = execSync('git show origin/main:tests/tout.js',
      { cwd: base, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const apres = fs.readFileSync(path.join(base, 'tests/tout.js'), 'utf8');
    const a = tableGardiens(avant), b = tableGardiens(apres);
    if (!a.size || !b.size) return false;
    for (const [cle, suites] of a) {
      const neuves = b.get(cle);
      if (!neuves) return false;                        // une clé disparue
      for (const s of suites) if (!neuves.has(s)) return false;   // une suite retirée
    }
    // Et RIEN d'autre que la table n'a bougé : sinon c'est du banc qui change.
    const horsTable = (t) => t.slice(0, t.indexOf('const GARDIENS = {'))
      + t.slice(t.indexOf('\n};', t.indexOf('const GARDIENS = {')));
    return horsTable(avant) === horsTable(apres);
  } catch { return false; }
}

function bancAnodin(base, fichier) {
  try {
    const { execSync } = require('child_process');
    const d = execSync(`git diff origin/main...HEAD -- ${fichier}; git diff HEAD -- ${fichier}`,
      { cwd: base, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const bouge = d.split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
    if (!bouge.length) return true;
    // Un commentaire ou une ligne vide ne change rien à ce que le banc fait.
    const utile = (l) => l.slice(1).trim() && !/^\s*(\/\/|\*|\/\*)/.test(l.slice(1));
    // Une ligne de code, effacée de ses nombres : c'est sa FORME. Si chaque
    // ligne ajoutée a une jumelle retirée de même forme, seuls des nombres ont
    // bougé — des délais, des bornes.
    const forme = (l) => l.slice(1).replace(/\d+/g, '#').trim();
    const ajoutees = bouge.filter((l) => l[0] === '+' && utile(l)).map(forme);
    const retirees = bouge.filter((l) => l[0] === '-' && utile(l)).map(forme);
    if (ajoutees.length !== retirees.length) return false;
    const reste = [...retirees];
    for (const a of ajoutees) {
      const k = reste.indexOf(a);
      if (k === -1) return false;
      reste.splice(k, 1);
    }
    return true;
  } catch { return false; }
}

// `sw.js` SE JUGE SUR CE QUI A CHANGÉ, PAS SUR LE FAIT QU'IL A CHANGÉ.
//
// Monter CACHE_VERSION et ajouter un fichier à la liste du cache, c'est la
// procédure de publication elle-même : cela arrive à CHAQUE livraison et ne
// risque rien. Une vraie modification de sa logique, en revanche, touche à ce
// que toutes les tablettes téléchargent — et là, tout se rejoue.
function swAnodin(base) {
  try {
    const { execSync } = require('child_process');
    const d = execSync('git diff origin/main...HEAD -- sw.js; git diff HEAD -- sw.js',
      { cwd: base, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lignes = d.split('\n')
      .filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
    if (!lignes.length) return true;
    return lignes.every((l) => /CACHE_VERSION/.test(l) || /^[+-]\s*'\.\/[\w./-]+',?\s*$/.test(l));
  } catch { return false; }
}

// Ce qui a bougé depuis la dernière livraison. Sans réponse de git — dépôt
// absent, historique tronqué — on prend la voie longue : ne pas savoir n'est
// pas une raison d'aller vite.
function fichiersModifies() {
  try {
    const { execSync } = require('child_process');
    const base = path.resolve(__dirname, '..');
    const sorti = execSync('git diff --name-only origin/main...HEAD; git diff --name-only HEAD',
      { cwd: base, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const liste = [...new Set(sorti.split('\n').map((s) => s.trim()).filter(Boolean))];
    return liste.length ? liste : null;
  } catch { return null; }
}

// Une sonde est isolée si rien de ce que le portail lance ne la charge. On le
// MESURE — la fumée et les quinze suites, plus le banc lui-même — parce qu'une
// règle qui se contente du nom du fichier se retourne à la première sonde qu'on
// branche dans un témoin.
function sondeIsolee(base, f) {
  const nom = f.replace(/^tests\//, '');
  if (SUITES.includes(nom) || nom === 'fumee.js') return false;
  const lecteurs = [...SUITES, 'fumee.js', ...BANC.map((b) => b.replace(/^tests\//, ''))];
  for (const l of lecteurs) {
    let src = '';
    try { src = fs.readFileSync(path.join(base, 'tests', l), 'utf8'); } catch { return false; }
    // un `require` ou un `import` du fichier, pas une mention en commentaire
    if (new RegExp(`(require|from)\\s*\\(?\\s*['\"\`][^'\"\`]*${nom.replace('.', '\\.')}`).test(src)) return false;
  }
  return true;
}

// ─── LA SÉLECTION À LA LIGNE (couverture) ───
//
// La table dit QUELLES suites gardent un fichier ; la carte de couverture
// (`couverture.js`) dit QUELLES LIGNES de ce fichier chaque suite exécute.
// Pour un fichier gardé, on ne rejoue que les gardiens qui exécutent au moins
// une ligne que le changement touche. C'est une INTERSECTION : aucune suite
// n'est ajoutée à ce que la table demandait, donc rien de ce que l'ancien
// aiguillage attrapait ne lui échappe — une suite qui n'exécute pas une ligne
// ne pouvait pas en voir le défaut.
//
// Au moindre doute, la table entière, sans discuter : pas de carte, une carte
// trop vieille, un commit qui n'est pas un ancêtre, un blob qui ne correspond
// pas, un fichier que la carte ne connaît pas, un fichier lu par un worker
// (la couverture ne voit pas les workers), une suite absente de la carte, ou
// git qui ne répond pas.
const CARTE_AGE_MAX_JOURS = 7;       // au-delà, la carte se relève : c'est le rejeu complet périodique
const CARTE_RETARD_MAX = 25;         // commits de `origin/main` depuis la carte, au plus

// CE QU'UNE SUITE LIT EN TEXTE, ELLE EN DÉPEND EN ENTIER. Un témoin qui lit la
// source d'un fichier (un `readFileSync`, une expression régulière sur le
// code) voit un changement qu'il n'exécute pas. Chaque lecture est déclarée
// ici avec ce qu'elle cherche ; `lecturesDeclarees` vérifie à chaque portail
// que les suites n'en font pas d'autres — sinon la sélection à la ligne se
// désarme d'elle-même.
const LECTURES_TEXTE = {
  'reglages.js': { fichiers: ['src/main.js', 'src/net.js'] },
  'parent.js': { fichiers: ['src/cloud.js'] },
  'plafond.js': { fichiers: ['src/arbreshd.js'] },
  // maj.js relit les clés de stockage de TOUT `src/` (« on ne renomme jamais
  // ce qui porte les données ») : seul un changement qui en touche une compte.
  'maj.js': { tout: true, motif: /web-minecraft-/ },
};
function lecturesDeclarees(base, table = LECTURES_TEXTE) {
  for (const s of SUITES) {
    let src;
    try { src = fs.readFileSync(path.join(base, 'tests', s), 'utf8'); } catch { return `${s} illisible`; }
    const lignes = src.split('\n');
    const vus = new Set();
    let dossier = false;
    lignes.forEach((l, i) => {
      if (!/readFileSync\(|readdirSync\(/.test(l) || /^\s*\/\//.test(l)) return;
      const contexte = lignes.slice(Math.max(0, i - 4), i + 1).join('\n');
      if (!/['"`/]src['"`/]|\.\.\/src/.test(contexte)) return;
      const noms = [...l.matchAll(/(?:['"`]|src\/)([\w-]+\.js)['"`]/g)].map((m) => `src/${m[1]}`);
      if (noms.length) noms.forEach((n) => vus.add(n)); else dossier = true;
    });
    const d = table[s] || { fichiers: [] };
    if (dossier && !d.tout) return `${s} lit un dossier de src/ sans le déclarer`;
    for (const n of vus) if (!(d.fichiers || []).includes(n) && !d.tout) return `${s} lit ${n} en texte sans le déclarer`;
  }
  return null;
}

// Les fichiers qu'un worker charge : la couverture du navigateur ne les voit
// que sur le fil principal, jamais dans le worker. On suit les imports
// statiques et dynamiques depuis chaque worker du jeu.
function fermetureDesWorkers(base) {
  const vus = new Set();
  const pile = [];
  try {
    for (const f of fs.readdirSync(path.join(base, 'src'))) {
      if (!f.endsWith('.js')) continue;
      const t = fs.readFileSync(path.join(base, 'src', f), 'utf8');
      for (const m of t.matchAll(/new\s+Worker\(\s*new URL\(\s*['"]\.\/([\w-]+\.js)['"]/g)) pile.push(`src/${m[1]}`);
    }
  } catch { return null; }
  while (pile.length) {
    const f = pile.pop();
    if (vus.has(f)) continue;
    vus.add(f);
    let t;
    try { t = fs.readFileSync(path.join(base, f), 'utf8'); } catch { continue; }
    for (const m of t.matchAll(/(?:from|import)\s*\(?\s*['"]\.\/([\w-]+\.js)['"]/g)) pile.push(`src/${m[1]}`);
  }
  return vus;
}

let _carte;
function carteUtilisable(base) {
  if (_carte !== undefined) return _carte;
  _carte = { carte: null, pourquoi: 'pas de carte de couverture' };
  const C = require('./couverture.js');
  const carte = C.lireCarte();
  if (!carte) return _carte;
  const ageJ = (Date.now() - Date.parse(carte.date)) / 86400000;
  if (!(ageJ <= CARTE_AGE_MAX_JOURS)) { _carte.pourquoi = `carte de ${ageJ.toFixed(0)} jours — npm run couverture`; return _carte; }
  try {
    C.git(['merge-base', '--is-ancestor', carte.commit, 'HEAD']);
    const retard = Number(C.git(['rev-list', '--count', `${carte.commit}..origin/main`]).trim());
    if (retard > CARTE_RETARD_MAX) { _carte.pourquoi = `carte en retard de ${retard} commits — npm run couverture`; return _carte; }
  } catch { _carte.pourquoi = 'commit de la carte inconnu ici'; return _carte; }
  const lectures = lecturesDeclarees(base);
  if (lectures) { _carte.pourquoi = `lecture de texte non déclarée (${lectures})`; return _carte; }
  const workers = fermetureDesWorkers(base);
  if (!workers) { _carte.pourquoi = 'imports des workers illisibles'; return _carte; }
  _carte = { carte, workers, C };
  return _carte;
}

// La table pour ce fichier, affinée par la carte quand elle le peut. Rend
// toujours des suites : au pire, celles de la table.
function affiner(base, f, gardiens) {
  const tel = { suites: gardiens, raison: f, sautees: [] };
  if (process.env.SANS_CARTE) return tel;
  if (!/^src\/[\w-]+\.js$/.test(f)) return tel;
  const u = carteUtilisable(base);
  if (!u.carte) return { ...tel, raison: `${f} (table : ${u.pourquoi})` };
  const { carte, workers, C } = u;
  if (workers.has(f)) return { ...tel, raison: `${f} (table : lu par un worker)` };
  const fiche = carte.fichiers[f];
  if (!fiche) return { ...tel, raison: `${f} (table : inconnu de la carte)` };
  let blob;
  try { blob = C.git(['rev-parse', `${carte.commit}:${f}`]).trim(); } catch { blob = null; }
  if (blob !== fiche.blob) return { ...tel, raison: `${f} (table : blob de la carte introuvable)` };
  // CE QUI A BOUGÉ DEPUIS LA CARTE, DES DEUX CÔTÉS. Une suite qui n'exécute
  // aucune ligne changée entre la carte et ICI rend ici le verdict qu'elle
  // rendait à la carte — mais celui-là n'est prouvé vert que sur `origin/main`.
  // On ajoute donc ce qui a changé entre la carte et `origin/main` : une suite
  // qui n'exécute rien de tout cela rend le même verdict sur les trois, et
  // `origin/main` est publiée. Sans la seconde moitié, une branche qui
  // REVIENT sur une correction de `origin/main` serait jugée « identique à la
  // carte » et passerait sans la suite qui l'avait vue.
  const ici = C.lignesTouchees(carte.commit, f);
  const main = C.lignesTouchees(carte.commit, f, 'origin/main');
  if (!ici || !main) return { ...tel, raison: `${f} (table : git muet)` };
  const touchees = [...new Set([...ici, ...main])];
  if (!touchees.length) return { suites: [], raison: `${f} (identique à la carte)`, sautees: gardiens };
  let diffTexte = null;
  const lireDiff = () => {
    if (diffTexte === null) {
      try {
        diffTexte = C.git(['diff', '-U0', '--no-color', carte.commit, '--', f])
          + C.git(['diff', '-U0', '--no-color', carte.commit, 'origin/main', '--', f]);
      } catch { diffTexte = false; }
    }
    return diffTexte;
  };
  const { garde, saute } = decider(f, gardiens, touchees, fiche, carte.suites, LECTURES_TEXTE, lireDiff, C);
  return {
    suites: garde,
    raison: saute.length ? `${f} (carte : ${garde.length}/${gardiens.length} gardiens exécutent les lignes touchées)` : f,
    sautees: saute,
  };
}

// LA DÉCISION, PURE : rien n'y lit le disque ni git, pour qu'un témoin la
// rejoue sur des cas fabriqués (`aiguillage.js`).
function decider(f, gardiens, touchees, fiche, suitesCarte, lectures, lireDiff, C) {
  const garde = [];
  const saute = [];
  for (const s of gardiens) {
    if (!suitesCarte.includes(s)) { garde.push(s); continue; }      // jamais relevée : on ne sait pas
    const lt = lectures[s];
    if (lt && ((lt.fichiers || []).includes(f) || lt.tout)) {
      if (!lt.motif) { garde.push(s); continue; }
      const d = lireDiff();
      if (d === false) { garde.push(s); continue; }
      const bouge = d.split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
      if (bouge.some((l) => lt.motif.test(l))) { garde.push(s); continue; }
    }
    const plages = C.dePlages((fiche.suites || {})[s]);
    if (touchees.some((l) => C.dansPlages(plages, l))) garde.push(s); else saute.push(s);
  }
  return { garde, saute };
}

// Ce qu'il faut rejouer pour ce changement-ci. Rend la liste des suites, dans
// l'ordre du portail, et la raison — qui s'affiche : un choix d'essais qu'on ne
// peut pas relire est un choix qu'on ne peut pas contester.
function suitesNecessaires() {
  const base = path.resolve(__dirname, '..');
  const changes = fichiersModifies();
  if (!changes) return { suites: SUITES, pourquoi: 'git muet — on ne parie pas' };

  const besoin = new Set();
  const raisons = [];
  const sautees = [];          // [suite, fichier] : gardien déclaré, mais qui n'exécute aucune ligne touchée
  let tout = false;
  for (const f of changes) {
    if (BANC.includes(f)) {
      if (bancAnodin(base, f)) { raisons.push(`${f} (délais seulement)`); continue; }
      if (gardiensElargis(base, f)) { raisons.push(`${f} (gardiens élargis)`); continue; }
      tout = true; raisons.push(`${f} (le banc)`); continue;
    }
    if (GARDIENS[f]) {
      const r = affiner(base, f, GARDIENS[f]);
      r.suites.forEach((s) => besoin.add(s));
      raisons.push(r.raison);
      if (r.sautees.length) sautees.push(...r.sautees.map((s) => [s, f]));
      continue;
    }
    if (f === 'sw.js') {
      if (swAnodin(base)) { raisons.push('sw.js (version + cache seulement)'); continue; }
      tout = true; raisons.push('sw.js (logique modifiée)'); continue;
    }
    // Une suite d'essai qu'on modifie se rejoue elle-même, et rien d'autre :
    // elle ne peut pas casser le jeu, seulement se tromper sur lui. Sans cette
    // règle, retoucher un témoin relançait les huit suites — et le gain de
    // l'aiguillage disparaissait dès qu'on améliorait un essai.
    const suite = f.match(/^tests\/([\w-]+\.js)$/);
    if (suite && SUITES.includes(suite[1])) { besoin.add(suite[1]); raisons.push(f); continue; }
    if (suite && suite[1] === 'fumee.js') { raisons.push(f); continue; }
    // UNE SONDE QUE LE PORTAIL NE LANCE JAMAIS NE PEUT CHANGER AUCUN VERDICT.
    //
    // Les sondes qui ont produit un chiffre écrit dans un témoin vivent dans le
    // dépôt, pour qu'on puisse les REJOUER (règle de la v277). Elles ne
    // correspondaient à aucun motif, donc elles tombaient dans « inconnu » et
    // forçaient le portail ENTIER — soixante-dix-huit minutes par livraison, pour
    // toujours, à cause d'un fichier que rien n'exécute. C'est le raisonnement de
    // `gardiensElargis` : ce qui ne peut faire tourner QUE PLUS de suites, ou rien
    // du tout, ne peut rien cacher.
    //
    // ET CELA SE PROUVE, à chaque portail, au lieu de se déclarer : le fichier
    // n'est pas dans `SUITES`, et AUCUNE suite ne le `require`. Le jour où une
    // suite en importe une, la règle se désarme d'elle-même et le portail entier
    // se rejoue.
    if (/^tests\/sonde-[\w-]+\.cjs$/.test(f) && sondeIsolee(base, f)) {
      raisons.push(`${f} (sonde, jamais lancée par le portail)`); continue;
    }
    // LA CARTE DE COUVERTURE NE CHANGE RIEN AU JEU : elle ne décide que de ce
    // qu'on rejoue la fois suivante. Elle se relève par un portail COMPLET
    // (`npm run couverture`), et ce qui la rend sûre se vérifie à chaque lecture
    // (son commit est un ancêtre, ses blobs sont les siens). Une carte qui ne
    // passe pas ces contrôles est simplement ignorée : on retombe sur la table.
    if (f === 'tests/carte-couverture.json') { raisons.push(`${f} (carte de couverture)`); continue; }
    // Contenu : décor, villes, monuments, créatures, journaux. Le témoin de
    // fumée les couvre — il charge le jeu, le joue et pose un bâtiment.
    if (/^src\/[\w-]+\.js$/.test(f) || /\.(md|png|webmanifest)$/.test(f)) continue;
    // Tout le reste : on ne sait pas, donc on ne parie pas.
    tout = true; raisons.push(`${f} (inconnu)`);
  }
  if (tout) return { suites: SUITES, pourquoi: raisons.join(', '), sautees: [] };
  const liste = SUITES.filter((s) => besoin.has(s));
  // Une suite sautée pour UN fichier peut être demandée par un autre : on ne
  // dit « sautée » que de celles qui ne tournent pas du tout.
  const vraimentSautees = new Map();
  for (const [s, f] of sautees) if (!besoin.has(s)) vraimentSautees.set(s, [...(vraimentSautees.get(s) || []), f]);
  return {
    suites: liste,
    pourquoi: raisons.length ? raisons.join(', ') : `${changes.length} fichier(s) de contenu`,
    sautees: [...vraimentSautees].map(([s, fs2]) => `${s} (gardien de ${fs2.join(', ')}, n'en exécute aucune ligne touchée)`),
  };
}
// La durée de chaque suite, lue dans le commentaire de `SUITES` — la seule
// table des durées, pour qu'on n'en tienne pas deux.
const DUREE_MESUREE = (() => {
  const t = {};
  try {
    const src = fs.readFileSync(__filename, 'utf8');
    for (const m of src.matchAll(/^\s*'([\w-]+\.js)',\s*\/\/\s*(\d+) min (\d+) s/gm)) t[m[1]] = +m[2] * 60 + +m[3];
  } catch {}
  return t;
})();
function trancher(liste, n) {
  const parts = Array.from({ length: n }, () => []);
  const poids = Array(n).fill(0);
  for (const s of [...liste].sort((a, b) => (DUREE_MESUREE[b] || 60) - (DUREE_MESUREE[a] || 60))) {
    const i = poids.indexOf(Math.min(...poids));
    parts[i].push(s);
    poids[i] += DUREE_MESUREE[s] || 60;
  }
  return parts;
}

const REPOS_MS = 20000;        // BORNE du repos entre deux suites — voir `reposer`
const CHARGE_MAX = 2.0;        // cœurs occupés au-delà desquels on attend encore

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// LE PORTAIL SE SOUVIENT DE CE QU'IL A DÉJÀ PROUVÉ.
//
// Sept suites, trois quarts d'heure. Le conteneur de la session, lui, peut
// être recyclé à tout moment — c'est arrivé à la sixième suite sur sept, et
// les six verdicts verts sont partis avec la mémoire du processus. Tout était
// à refaire, à l'identique, pour rien.
//
// Chaque verdict est donc écrit sur le disque dès qu'il tombe, et une reprise
// saute ce qui est déjà vert. Mais SEULEMENT si le code n'a pas bougé d'un
// octet : c'est là tout le danger, et c'est précisément le travers que ce
// fichier existe pour empêcher — publier sur la foi de suites « probablement
// encore bonnes ». L'empreinte couvre src/, tests/, sw.js et index.html ; au
// moindre changement, tous les acquis sont annulés et tout se rejoue.
// v195 : L'EMPREINTE EST DÉSORMAIS PAR SUITE, ET C'EST LE PLUS GROS LEVIER
// SUR L'ITÉRATION.
//
// Une empreinte unique sur tout `src/` et tout `tests/` annulait TOUS les
// acquis au moindre octet — donc dès qu'on corrigeait le rouge qu'on venait de
// trouver, les douze suites vertes se rejouaient pour rien. Mesuré sur la
// session de la v195 : trois passages de `carte.js`, trois quarts d'heure, là
// où un seul suffisait.
//
// Le verdict d'une suite reste valable tant qu'aucun fichier qui la GARDE n'a
// bougé. Ses gardiens, c'est exactement la table ci-dessus, lue à l'envers —
// plus son propre fichier, le banc, `sw.js` et `index.html`. Et, par prudence,
// tout fichier de `src/` que la table ne connaît PAS encore : un module neuf
// n'a pas de gardien déclaré, et ne pas savoir n'est pas une raison de garder
// un acquis.
const MEMOIRE = '/tmp/portail-verdicts-v3.json';
const RACINE = path.join(__dirname, '..');

function listeSrc() {
  try { return fs.readdirSync(path.join(RACINE, 'src')).filter((f) => f.endsWith('.js')).sort(); }
  catch { return []; }
}

function gardiensDe(suite) {
  const fichiers = new Set([`tests/${suite}`, ...BANC, 'sw.js', 'index.html']);
  for (const [f, suites] of Object.entries(GARDIENS)) {
    if (suites.includes(suite)) fichiers.add(f);
  }
  for (const f of listeSrc()) if (!GARDIENS[`src/${f}`]) fichiers.add(`src/${f}`);
  return [...fichiers].sort();
}

// LE BANC ENTRE DANS L'EMPREINTE PAR SA FORME, PAS PAR SES NOMBRES (v255).
//
// `bancAnodin` juge depuis la v195 qu'un banc dont seuls des nombres ont bougé
// — des délais, des bornes — ne change rien à ce qu'il éprouve, et l'aiguillage
// ne rejoue rien pour cela. L'empreinte de reprise, elle, prenait `banc.js`
// BRUT : régler une borne annulait les quinze acquis, trois quarts d'heure
// pour un chiffre. La même règle vaut aux deux endroits : les fichiers du banc
// s'empreignent chiffres effacés — la forme de chaque ligne, comme
// `bancAnodin` la lit. Le code du jeu, lui, entre brut : un nombre y est une
// règle.
function empreinteDe(fichiers) {
  const h = crypto.createHash('sha1');
  for (const f of fichiers) {
    try {
      const brut = fs.readFileSync(path.join(RACINE, f));
      h.update(f).update(BANC.includes(f) ? brut.toString('utf8').replace(/\d+/g, '#') : brut);
    } catch { h.update(f).update('absent'); }
  }
  return h.digest('hex');
}

function acquisLus() {
  let m;
  try { m = JSON.parse(fs.readFileSync(MEMOIRE, 'utf8')); } catch { return {}; }
  const verts = {};
  for (const [suite, note] of Object.entries(m.verts || {})) {
    if (note && note.empreinte === empreinteDe(gardiensDe(suite))) verts[suite] = true;
  }
  return verts;
}

// LES ROUGES D'HIER PASSENT D'ABORD. Une suite qui a rougi au dernier
// portail est la plus probable à rougir encore : la jouer en tête rend le
// rouge en minutes au lieu de le faire attendre derrière `monte.js`. L'ordre
// ne change aucun verdict — chaque suite monte son banc — seulement le temps
// jusqu'au premier.
function rougesLus() {
  try { return JSON.parse(fs.readFileSync(MEMOIRE, 'utf8')).rouges || {}; } catch { return {}; }
}
function acquisEcrits(_ignore, verts) {
  const note = {};
  for (const suite of Object.keys(verts)) {
    if (verts[suite]) note[suite] = { empreinte: empreinteDe(gardiensDe(suite)) };
  }
  const rouges = rougesLus();
  for (const [suite, v] of Object.entries(verts)) { if (v) delete rouges[suite]; else rouges[suite] = Date.now(); }
  try { fs.writeFileSync(MEMOIRE, JSON.stringify({ verts: note, rouges }, null, 2)); }
  catch { /* sans mémoire, on rejouera tout : c'est le pire, pas le faux */ }
}

const charge = () => {
  try { return Number(fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0]); }
  catch { return 0; }          // ailleurs que sous Linux, on ne sait pas : on avance
};

// LA CHARGE MOYENNE NE DÉCRIT PAS CE QUE LE BANC PEUT RENDRE — mesuré.
//
// Cette attente pouvait durer TROIS MINUTES par suite, sur un nombre qui ne
// dit pas ce qu'on croit. La charge d'une minute est une moyenne QUI DÉCROÎT :
// quand une suite se termine, ses processus sont morts et la machine est
// libre, mais le chiffre met cent secondes à le reconnaître.
//
// Mesuré, même navigateur, pendant que la charge laissée par `monte.js`
// montait de 3,40 à 5,16 : 58,5 · 43,0 · 43,0 · 45,9 · 43,2 · 47,4 · 38,3 ·
// 55,9 images par seconde. Aucune relation, et 14,7 Go de mémoire libre d'un
// bout à l'autre. À titre de comparaison, une charge RÉELLE se voit tout de
// suite : deux pages de jeu ouvertes en même temps font tomber la cadence de
// 42,9 à 20,8 puis 14,8 images/s.
//
// On garde donc une PAUSE COURTE — les processus de la suite précédente ont
// besoin d'un instant pour mourir — et l'on cesse d'attendre un nombre qui
// retarde. Trente secondes au lieu de cent quatre-vingts : c'est neuf minutes
// rendues sur un portail de quatorze suites.
//
// v255 : LA PAUSE COURTE ÉTAIT ENCORE UN DÉLAI FIXE. `REPOS_MS` dormait vingt
// secondes entre chaque paire de suites, quoi qu'il arrive — cinq minutes par
// portail —, et `attendreLeCalme` lisait le même nombre qui retarde. Les deux
// lisent désormais l'occupation RÉELLE des cœurs (`charge.js`) : quand la
// suite d'avant a rendu la main, ses navigateurs sont morts et la machine est
// à 0,2 en moins d'une seconde. Le repos attend que la machine soit presque
// vide (un cœur), l'attente de calme qu'elle soit sous CHARGE_MAX ; chacun
// garde son ancienne durée comme BORNE et dit ce qu'il a vu.
async function attendreLeCalme(limiteMs = 30000) {
  const r = await attendreLaCharge(limiteMs, CHARGE_MAX);
  if (r.ms >= 2000) console.log(`   🧘 calme : ${(r.ms / 1000).toFixed(1)} s · ${r.motif} · ${r.occupation.toFixed(2)} cœur(s)`);
}
async function reposer() {
  const r = await attendreLaCharge(REPOS_MS, 1.0);
  if (r.motif !== 'libre') console.log(`   🧘 repos : ${(r.ms / 1000).toFixed(1)} s · ${r.motif} · ${r.occupation.toFixed(2)} cœur(s) encore occupé(s)`);
}

// `--couverture` : chaque suite tourne instrumentée (`couverture.js`, chargé
// par `-r`), et ses relevés tombent dans COUVERTURE_DIR.
const COUVERTURE = process.argv.includes('--couverture')
  ? path.join(require('os').tmpdir(), `couverture-${Date.now()}`) : null;
function lancer(fichier) {
  return new Promise((ok) => {
    const args = COUVERTURE ? ['-r', './couverture.js', fichier] : [fichier];
    const env = COUVERTURE ? { ...process.env, COUVERTURE_DIR: COUVERTURE, COUVERTURE_SUITE: fichier } : process.env;
    const p = spawn(process.execPath, args, { stdio: 'inherit', cwd: __dirname, env });
    p.on('close', (code) => ok(code === 0));
  });
}

module.exports = { SUITES, GARDIENS, LECTURES_TEXTE, DUREE_MESUREE, trancher, suitesNecessaires, affiner, decider, lecturesDeclarees, fermetureDesWorkers };

if (require.main === module) (async () => {
  // `--tempo=1` (v501) : le tour de nuit, minuteries du jeu à l'échelle
  // réelle même dans les suites qui déclarent un tempo (`banc.fixerTempo`).
  // Une course révélée à tempo 4 peut ne pas exister dans le vrai jeu, et
  // l'inverse. Il rejoue tout : un acquis pris à tempo 4 ne vaut pas pour lui.
  const argTempo = process.argv.find((a) => a.startsWith('--tempo='));
  if (argTempo) process.env.BANC_TEMPO = argTempo.slice('--tempo='.length);
  const depuisZero = process.argv.includes('--depuis-zero') || !!argTempo;

  // `--voie` : on demande au dépôt ce qu'il faut rejouer pour ce changement.
  // `--long` force les huit suites, toujours disponible sans discuter.
  let aJouer = SUITES;
  let fumeeRouge = false;
  if (process.argv.includes('--voie') && !process.argv.includes('--long')) {
    // L'AIGUILLAGE SE PROUVE AVANT DE CHOISIR (une seconde, sous node) : un
    // choix faux rendrait un portail vert et aveugle.
    if (!(await lancer('aiguillage.js'))) {
      console.log('\n❌ l\'aiguillage n\'est pas sûr — on ne publie pas (npm run long rejoue tout)');
      process.exit(1);
    }
    const { suites, pourquoi, sautees } = suitesNecessaires();
    aJouer = suites;
    console.log(`🎯 ${suites.length === SUITES.length ? 'tout le portail' : `${suites.length + 1} suite(s)`}`
      + ` — ${pourquoi}`);
    console.log(`   fumee.js${suites.length ? ' + ' + suites.join(', ') : ' seul'}`);
    // CE QU'ON SAUTE SE DIT, avec sa raison : un choix d'essais qu'on ne peut
    // pas relire est un choix qu'on ne peut pas contester.
    for (const s of sautees) console.log(`   ⏭️  sautée : ${s}`);
    console.log('');
    // Le témoin de fumée passe TOUJOURS en premier : trois minutes qui
    // attrapent un module qui ne charge pas, avant d'en dépenser cinquante.
    // ET UN ROUGE DE FUMÉE CACHE L'ÉTAT DES DOUZE AUTRES SUITES.
    //
    // La barrière est bonne par défaut : elle évite d'attendre cinquante
    // minutes quand un module ne charge pas. Mais un témoin de CONTENU rouge —
    // le jeu démarre très bien — arrête tout, et l'on ne sait plus rien des
    // douze suites qui suivent. C'est arrivé en v223 : la vie de rue de Paris
    // était rouge SUR `origin/main` DEUX FOIS SUR TROIS (dette déclarée dans
    // `TASKS.md`), et la livraison en cours n'y était pour rien.
    //
    // `--malgre-fumee` continue quand même, et le verdict global reste ROUGE.
    // On ne se donne pas le vert, on se donne la VUE. À n'employer qu'avec la
    // double mesure en main — la règle de la v195 s'applique telle quelle.
    const fumeeVerte = await lancer('fumee.js');
    if (!fumeeVerte && !process.argv.includes('--malgre-fumee')) {
      console.log('\n❌ la fumée a échoué — on ne publie pas');
      console.log('   (npm test -- --malgre-fumee pour voir quand même les douze autres)');
      process.exit(1);
    }
    if (!fumeeVerte) {
      console.log('\n⚠️  fumée ROUGE — on continue pour voir les autres, le verdict restera rouge');
      fumeeRouge = true;
    }
    if (!suites.length) {
      console.log('\n✅ voie rapide verte — on peut publier');
      process.exit(0);
    }
    await reposer();
  }

  const empreinte = null;      // l'empreinte est désormais tenue par suite
  const verts = depuisZero ? {} : acquisLus();
  const dejaVus = Object.keys(verts).filter((s) => verts[s]);
  if (dejaVus.length) {
    console.log(`↩️  reprise : ${dejaVus.length} suite(s) déjà verte(s) sur ce code exact`
      + ` — ${dejaVus.join(', ')}`);
    console.log('   (npm test -- --depuis-zero pour tout rejouer)\n');
  }
  // `--tranche=k/n` : ce portail ne joue que sa part des suites choisies,
  // réparties par durée MESURÉE (`SUITES`, le chiffre en commentaire) — la plus
  // longue d'abord, chaque fois dans la tranche la moins chargée. n machines,
  // n tranches, et le portail est vert quand les n le sont. Ce n'est pas un
  // raccourci : chaque suite tourne, entière, sur une machine qui ne fait
  // qu'elle. Ce que cela coûte, c'est n fois le conteneur.
  const argTranche = process.argv.find((a) => a.startsWith('--tranche='));
  if (argTranche) {
    const [k, n] = argTranche.slice('--tranche='.length).split('/').map(Number);
    if (!(n >= 1 && k >= 1 && k <= n)) { console.log(`❌ ${argTranche} : il faut k/n avec 1 ≤ k ≤ n`); process.exit(2); }
    const parts = trancher(aJouer, n);
    console.log(`🔪 tranche ${k}/${n} : ${parts[k - 1].join(', ') || 'rien'}`
      + `  (≈ ${Math.round(parts[k - 1].reduce((t, s) => t + (DUREE_MESUREE[s] || 60), 0) / 60)} min)`);
    for (let i = 0; i < n; i++) if (i !== k - 1) console.log(`   tranche ${i + 1}/${n} : ${parts[i].join(', ') || 'rien'}`);
    console.log('');
    aJouer = SUITES.filter((s) => parts[k - 1].includes(s));
  }
  const rougesAvant = rougesLus();
  const enTete = aJouer.filter((s) => rougesAvant[s] && !verts[s]);
  if (enTete.length) {
    aJouer = [...enTete, ...aJouer.filter((s) => !enTete.includes(s))];
    console.log(`🔴 en tête, parce qu'elles ont rougi au dernier portail : ${enTete.join(', ')}\n`);
  }
  const verdicts = [];
  const durees = [];
  const departPortail = Date.now();
  for (const suite of aJouer) {
    if (verts[suite]) {
      console.log(`\n════════ ${suite} ════════\n⏭️  déjà vert sur ce code, on ne le rejoue pas`);
      verdicts.push([suite, true]);
      continue;
    }
    // LA CHARGE AU MOMENT DU DÉPART, ÉCRITE NOIR SUR BLANC.
    //
    // Trois portails de suite, trois verdicts rouges différents, et chaque
    // suite verte quand on la joue seule. On a soupçonné la charge sans jamais
    // la mesurer à l'instant qui compte : celui où la suite démarre. Deux
    // lignes règlent la question au lieu d'une heure d'hypothèses.
    const avant = charge();
    await attendreLeCalme();
    console.log(`\n════════ ${suite} ════════`);
    // Le chiffre reste affiché parce qu'il est gratuit, mais il est dit pour
    // ce qu'il est : un retard, pas un diagnostic. Un rouge ne s'explique
    // JAMAIS par lui — voir la note d'`attendreLeCalme`.
    console.log(`   charge ${avant.toFixed(2)} avant l'attente, ${charge().toFixed(2)} au départ`);
    console.log('   (la charge d\'une minute RETARDE : elle n\'explique aucun rouge)\n');
    // ON CHRONOMÈTRE, PARCE QU'ON NE PEUT PAS ACCÉLÉRER CE QU'ON NE MESURE PAS.
    // Le portail dure une heure et n'a jamais dit où elle passe : toute
    // proposition de gain était donc une intuition. Deux lignes y suffisent.
    const depart = Date.now();
    const vert = await lancer(suite);
    const duree = Math.round((Date.now() - depart) / 1000);
    durees.push([suite, duree]);
    console.log(`   ⏱️  ${suite} : ${Math.floor(duree / 60)} min ${String(duree % 60).padStart(2, '0')} s`);
    verdicts.push([suite, vert]);
    // Écrit MAINTENANT, pas à la fin : c'est tout l'objet de la manœuvre.
    verts[suite] = vert;
    acquisEcrits(empreinte, verts);
    if (suite !== aJouer[aJouer.length - 1]) await reposer();
  }
  console.log('\n════════ verdict ════════');
  for (const [suite, vert] of verdicts) console.log(`${vert ? '✅' : '❌'} ${suite}`);
  if (durees.length) {
    const total = Math.round((Date.now() - departPortail) / 1000);
    const joue = durees.reduce((n, [, d]) => n + d, 0);
    console.log('\n════════ où passe le temps ════════');
    for (const [suite, d] of [...durees].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${String(Math.floor(d / 60)).padStart(2)} min ${String(d % 60).padStart(2, '0')} s  ${suite}`);
    }
    console.log(`   ─────────────`);
    console.log(`   ${Math.floor(joue / 60)} min de suites · ${Math.floor((total - joue) / 60)} min `
      + `d'attente entre elles · ${Math.floor(total / 60)} min en tout`);
  }
  // LA CARTE SE RELÈVE MÊME SI UNE SUITE A ROUGI : elle décrit ce qui
  // s'EXÉCUTE, pas ce qui passe. Mais elle ne se relève que si toutes les
  // suites ont tourné — une suite absente de la carte se rejouerait toujours,
  // ce qui est prudent, mais une carte partielle ne doit pas se faire passer
  // pour un portail complet.
  if (COUVERTURE) {
    const joues = new Set(durees.map(([s]) => s));
    if (SUITES.every((s) => joues.has(s))) {
      try {
        const c = require('./couverture.js').fabriquerCarte([COUVERTURE]);
        console.log(`\n🗺️  carte de couverture relevée : ${c.suites.length} suites, `
          + `${Object.keys(c.fichiers).length} fichiers, commit ${c.commit.slice(0, 7)}, passage ${c.passages}`);
      } catch (e) { console.log(`\n⚠️  carte de couverture non écrite : ${e.message}`); }
    } else console.log('\n⚠️  carte de couverture non écrite : il faut le portail entier (--depuis-zero)');
  }
  const tout = verdicts.every(([, v]) => v) && !fumeeRouge;
  if (fumeeRouge) console.log('❌ fumee.js');
  const laTranche = process.argv.find((a) => a.startsWith('--tranche='));
  console.log(tout
    ? (laTranche ? `\n✅ ${laTranche.slice(2)} verte — on publie quand TOUTES les tranches le sont`
      : '\n✅ toutes les suites sont vertes — on peut publier')
    : '\n❌ une suite au moins a échoué — on ne publie pas');
  process.exit(tout ? 0 : 1);
})();
