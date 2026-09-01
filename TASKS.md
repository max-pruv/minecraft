# Ce qui est en cours

**Pourquoi ce fichier est dans le dépôt.** La liste de tâches de la session vit
dans le conteneur, et le conteneur a été recyclé sept fois en deux jours. Deux
entrées ont disparu avec lui — la refonte de la sauvegarde et la géographie —
sans que personne ne s'en aperçoive sur le moment. Ce qui compte assez pour être
suivi compte assez pour être versionné.

Tenu à jour à chaque livraison, comme `CHANGELOG.md`. Le journal dit ce qui est
**fait** ; ce fichier dit ce qui **reste**.

---

## En cours

- [ ] **Nice et Lille n'ont pas de circuit de voitures** — mesuré en v191 :
  aucune combinaison de leurs avenues ne referme une boucle qui tienne la rue
  à 90 % (Nice plafonne à 89 %, Lille à rien). Leurs rues sont trop courtes,
  parce que les deux villes sont encore à leur échelle d'origine (10 et 16
  blocs/km). Leur remise à l'échelle réglera les deux d'un coup. Washington
  n'a pas de voies nommées du tout — son plan de L'Enfant demande sa propre
  méthode.

- [ ] **Londres n'a qu'un circuit de voitures** — remesuré en v201 sur toutes
  les combinaisons : le triangle de Mayfair passe à 95 %, et les six autres
  voies (le Mall, Whitehall, le Strand, Victoria Street, le Victoria
  Embankment, Borough High Street) plafonnent entre 57 % et 85 % — la Tamise
  et les parcs les coupent. Même cause qu'à Nice et Lille : la ville est
  encore à son échelle d'origine. Sa remise à l'échelle réglera les trois.

- [ ] **Cinq voies de San Francisco restent sans circuit** — Fulton, Lincoln
  Way, la Great Highway, la 19e Avenue et Third Street ne referment aucune
  boucle au-dessus du seuil. La ville en a quatre qui la couvrent aux neuf
  dixièmes ; ces cinq-là bordent le Golden Gate Park et la côte, où il n'y a
  rien à boucler.

- [ ] **Une voiture coûte 32,6 maillages** — mesuré en v201, et c'est ce qui
  borne tout le reste : trois fois un personnage, pour un objet qui n'a ni
  bras ni jambes. Le modèle `.glb` arrive découpé en trente-deux morceaux, et
  seuls les quatre pivots `Wheel_*` ont besoin de tourner. Fusionner le reste
  par matériau, une fois au chargement, diviserait le coût par cinq et
  permettrait d'en dessiner beaucoup plus. À faire hors ligne ou à la volée,
  jamais avec un décodeur embarqué dans la PWA.

- [ ] **SoMa et les quartiers de maisons ont encore des fenêtres de verre
  plein** — le centre de San Francisco est passé au mur-rideau en v195, pas le
  reste. Un bloc de `GLASS` fait trente-sept mètres de large : au pied d'un
  entrepôt de SoMa, la façade reste un aquarium. Il manque au jeu un bloc de
  façade « fenêtre industrielle » et un « fenêtre de Victorienne » — deux
  tuiles à peindre dans `textures.js`, sur le modèle des blocs `ARCHI`.

- [x] **Des arbres dans les rues de Londres — FAIT en v197.** Et le remède
  vaut pour Nice et Lille, qui avaient le même défaut : leurs parcs
  marquaient déjà des arbres, posés à plat comme n'importe quel sol.

- [ ] **(historique) Des arbres dans les rues de Londres** — Max, même capture : « pas
  d'arbres ». Paris en a depuis la v187 (le feuillage pousse dans `world.js` à
  partir des marques de `solParis`), Londres non : ses rues n'ont que des
  façades. Même recette à appliquer — et il faut ESPACER, sinon une colonne sur
  deux fait une haie pleine qui bouche la rue.

- [ ] **Programme réalisme v2** (prompt de Max, 28/08) — il juge uniquement
  sur captures ; chaque ville retravaillée est montrée AVANT fusion (rue +
  aérien + photo de référence), généralisation seulement après validation.
  Fait : 1) mobilier (v180), 2) routes (v181), 3) façades partout, matériaux
  par ville, médinas préservées (v181) — et LA voiture : le modèle 3D
  d'artiste fourni par Max, reflets par caméra cubique, vue cockpit (v181).
  À venir : 4) vie dense — voitures arrêtées aux feux, enseignes lumineuses
  la nuit.

- [ ] **Moderniser les villes bâties à la main** — New York est faite (v186,
  validée par Max : « Manhattan est mieux, je valide fort ») et **Paris aussi
  (v187, 8 → 24 blocs/km)**. Restent Londres, Nice, Lille et San Francisco,
  qui vivent encore à leur échelle d'origine. **San Francisco est faite
  (v192, 9 → 27 blocs/km)** ; **Londres était DÉJÀ à 24 blocs/km** — il ne lui
  manque pas une remise à l'échelle mais la passe de rue. Restent donc Nice
  (10 blocs/km, 668 blocs de marge) et Lille (16, mais seulement 41 blocs de
  marge avant le disque de Paris : c'est un arbitrage à trancher, pas un
  chantier). Même recette : le cœur à grande
  échelle, casse déclarée et bornée, vie de rue, captures avant fusion. Le
  piège est écrit dans `CLAUDE.md` (section Paris) : les largeurs ne se
  projettent pas, elles se relèvent — et il faut refaire les monuments, qui
  ne grandissent pas avec la carte.

- [ ] **Le métro de Paris, pour de vrai** — l'anneau souterrain de v163 est
  resté à trente-huit blocs de rayon pendant que la ville en prenait 185 :
  il fait donc désormais la boucle du centre historique, ce qui est juste mais
  petit. Paris mérite ses vraies lignes (1, 4, 6) avec leurs stations, par le
  creuseur de Washington. Et la caserne et le commissariat, eux, sont restés
  au cœur — plausible (la Préfecture est bien sur la Cité) mais à reprendre en
  façades de pierre plutôt qu'en halles de béton.

- [x] **Le rouge ancien des suites réseau du portail — CLOS en v195/v196.**
  Les treize suites sont vertes. Sept vieux rouges ont été démontés, et
  AUCUN n'était un défaut du jeu : une durée mesurée sans laisser souffler la
  machine (55 s annoncés, six mesurés seule), un appui long que la carte
  refuse à bon droit depuis la v173, une fausse encoche d'iPhone jamais
  retirée, un fond de carte qui dépendait d'où le test précédent avait laissé
  l'enfant, une horloge écrite « la valeur d'avant + 1 », un document de
  destination erroné, et une relance de page — voulue depuis la v189 — prise
  pour une panne à trois reprises. Le seul qui venait de nous était le témoin
  du musée de l'Air et de l'Espace, cassé en calmant la marche en v192.

- [x] **Une page légère pour les tests réseau — ABANDONNÉ, et mesuré.**
  L'idée était de sauter la scène Three.js pour les suites réseau, en
  estimant le démarrage d'une page à dix secondes dont l'essentiel en 3D.
  **La mesure dit le contraire** : le démarrage tient en 4,6 s, dont
  4 532 ms de CHARGEMENT (78 requêtes, 3,5 Mo de modules) et seulement
  84 ms pour la scène et le lancement de la partie. Le banc charge déjà
  chaque page avec `rr=2` — deux morceaux de monde de rayon — donc la
  génération du terrain est réduite depuis longtemps.

  Une page légère chargerait exactement les mêmes modules : le gain serait
  d'une fraction de seconde par page, pour un changement au chemin de
  DÉMARRAGE du jeu — celui que les enfants lancent. Refait, le calcul donne
  2,5 minutes sur `reseau.js`, pas les cinq à six annoncées. Le rapport
  n'y est pas.

  Ce qui reste vrai et gagnable sans toucher au jeu : les **124 s
  d'attentes fixes** de la suite, à remplacer par des conditions bornées.

- [ ] **(historique) Le rouge ancien des suites réseau** — `hote.js`, `visio.js`
  et `reglages.js` sont réparées. `reseau.js` **va au bout pour la première
  fois** : elle s'effondrait au 27ᵉ témoin, elle en passe désormais soixante.

  Ce qui l'a débloquée n'était pas le jeu. `endormir()` ne fait dormir que le
  RÉSEAU — la page continue de dessiner un monde en 3D à plein régime, et le
  navigateur du banc tourne avec `--disable-renderer-backgrounding`. Cette
  page-là n'était jamais refermée : elle brûlait un cœur sur quatre du milieu
  de la suite jusqu'à la fin, pile sous les scénarios qui chronomètrent.
  Mesuré à la sonde, page seule : renoncer sur un courtier muet met **13,0 s**
  (9 s d'attente du courtier, 4 s de course vers le nuage), contre 24 à 29 s
  avec le fantôme à côté. Aucun seuil n'a été relevé.

  **v190 corrige le plus gros** : chez l'invité, un lien direct jamais ouvert
  chassait le lien par le nuage qui portait la partie. Prouvé à la sonde, sur
  machine vide, pair-à-pair coupé à la racine — le bloc passait de « jamais en
  soixante secondes » à « moins de deux secondes ». `reseau.js` monte à
  cinquante-huit témoins verts.

  **Restent cinq rouges, et ils se ressemblent tous :**

  1. `un bloc posé par le nuage arrive chez l'autre`, `revenir dans
     l'application remet dans la partie` et `et les blocs repassent après le
     retour` — les trois scénarios de NUAGE, tous rouges dans la suite et tous
     VERTS à la sonde sur machine vide. La chronologie montre `liens: 1,
     prets: 0` des deux côtés pendant quatre-vingt-dix secondes : le lien
     existe, la présentation n'aboutit jamais. Le prochain pas est celui qui a
     marché pour le courtier muet — reproduire à la sonde AVEC la charge, pour
     savoir ce qui expire.
  2. `quand le relais répond, on accuse le VPN et pas le Wi-Fi` — le message
     bascule d'un tour à l'autre : `relaisJoignable` dépend de la première
     réponse du relais, qui arrive parfois après la limite de douze secondes.
  3. `un monde bien rempli ne retarde pas les retrouvailles` — mille six cents
     blocs, 41 s. Mesure de durée : à éprouver d'abord à la sonde, page seule.

  **Et un mensonge à corriger, vu à la sonde :** même réparé, le bandeau de
  l'invité repasse à « reconnexion » alors que le nuage porte la partie très
  bien. Pour un enfant, lire « reconnexion » pendant que tout marche est le
  même défaut que le « ça marche ! » affiché sur une session morte, dans
  l'autre sens.

- [ ] **Les métros des grandes villes générées** — le creuseur de Washington
  sait faire ; après les trains intervilles.

- [ ] **Le tour du monde, approfondissements** — DEUX CENT SOIXANTE-DIX-HUIT
  lieux au registre (v173) : Londres à la main, les autres par la machine.
  La suite est du raffinement : donner à Tokyo, Rome ou Rio la profondeur
  artisanale de Londres (voies nommées, mobilier, intérieurs), et les mers
  manquantes du planisphère (mer Noire, Caspienne, Baltique fine) quand un
  enfant les cherchera. Question produit ouverte : que se passe-t-il quand
  un enfant se dépose volontairement en plein océan ? (Aujourd'hui : il
  nage.)
  Neuf monuments du catalogue attendent encore leur adresse dans des villes
  déjà bâties : Notre-Dame, le Sacré-Cœur et l'Élysée à Paris ; l'Empire
  State, le Chrysler, la Statue de la Liberté et le Flatiron à New York ;
  le Golden Gate à San Francisco.

- [ ] **Recalibrer les monuments existants** dans le ciel à 160 blocs. Ceux de
  Washington sont à leur échelle depuis v162 — l'obélisque à soixante-douze
  blocs, la ville entière à 48 blocs/km.

- [ ] **Le reste de Washington** — la Cathédrale nationale et Georgetown
  University, sorties de l'emprise quand l'échelle a triplé (elles attendent
  que le monde grandisse) ; les lignes Orange et Argent, qui partagent le
  tunnel de la Bleue dans la vraie ville ; les guides qui racontent ce qu'on
  visite. Le mémorial Roosevelt, lui, est revenu en v162.

- [ ] **Ce que Washington a à apprendre** — la ville est pleine de choses qui
  se racontent : pourquoi les avenues coupent la grille en diagonale, pourquoi
  aucun immeuble ne dépasse le dôme, pourquoi les cerisiers du Tidal Basin
  viennent du Japon, pourquoi Georgetown n'a pas de métro. Rien de tout cela
  n'atteint l'enfant pour l'instant — c'est dans les commentaires du code, et
  un enfant de sept ans ne lit pas le code. Des questions dans `education.js`,
  ou des panneaux à lire sur place.

- [ ] **L'usine automobile et le mode conduite** — chaîne de production
  documentée sur de vraies recherches (emboutissage, carrosserie robotisée,
  peinture, mariage batterie-caisse, piste d'essai), la voiture qui se construit
  de poste en poste, et à la sortie **on monte dedans et on la conduit**. Le
  travail est dans le mode `pilote`, pas dans la chaîne — voir la section
  « Conduire » de `CLAUDE.md`. **v188 a posé la première brique** : une voiture
  ne vole plus (`vole: false` dans la fiche, `player.volInterdit` l'applique).
  Restent les deux difficultés réelles, écrites dans `CLAUDE.md` : le véhicule
  a besoin de SA boîte de collision — celle du joueur fait 0,6 bloc, une
  voiture qui l'emprunte traverse les murs — et un véhicule conduit doit se
  voir en ligne, sinon Alice ne verra qu'un enfant qui glisse à toute vitesse.

- [ ] **Les garages, la suite** — v188 en pose deux dans la bibliothèque et
  garde la voiture qu'on y laisse. Ce qui manque : un garage posé sur une
  PENTE s'enterre, parce que la pose cherche le point le plus bas sous
  l'emprise (juste pour un monument, fatal pour un bâtiment de plain-pied) ;
  un garage démoli laisse une place de parking invisible ; et rien ne garde
  encore les autres véhicules — la voiture seule est `garable`.

- [ ] **Apprendre** — guides dans les villes, questions audio.

- [ ] **Notifications push** — l'invitation atteint l'application fermée.

- [ ] **Intérieurs** — les monuments se visitent.

---

## Fait récemment

- [x] **v187** — Paris à l'échelle GTA : 24 blocs par kilomètre, un disque de
  185, des rues où l'on marche, une rue par quartier, l'Étoile à sa vraie
  taille, et quatre monuments refaits (Tour Eiffel en treillis, Arc de
  Triomphe à quatre faces, Notre-Dame, Panthéon). Plus la carte : elle ne
  s'étire plus sur un téléphone couché, et on y cherche un lieu par son nom.

- [x] **v186** — New York à l'échelle GTA (34 blocs/km, Times Square, les
  monuments à leur vraie emprise), des voitures dans TOUTES les villes (les
  villes de fleuve n'avaient aucun anneau, les villes bâties à la main
  aucun tout court), et les fenêtres qui restent allumées la nuit.

- [x] **v185** — les roues tournent avec le sol qui défile, rayon mesuré par
  modèle, et un téléport ne les fait plus tournoyer.

- [x] **v184** — la flotte : cinquante modèles fournis par Max tirés au sort
  (le Chiron d'artiste reste en rotation), téléchargés à la première
  rencontre par le canal statique — et le filet de l'écran compte en temps
  réel (la moitié noire d'iPad se répare même quand les images bégaient).

- [x] **v183** — la vue GTA au volant (fiche `poursuite`, caméra derrière,
  anti-mur), la voiture remise à l'endroit (l'avant vérifié par les phares —
  elle roulait à l'envers depuis v181), vitres transparentes, nez fermé.

- [x] **v182** — la voiture garée ne bouge plus (« tac tac tac »), la marche
  n'hérite plus de la rampe de vol, et la fumée éprouve la bibliothèque là où
  v176 l'a mise — le portail redevient `npm test`, jamais une liste de suites.

- [x] **v181** — réalisme v2, deuxième acte : vrai bitume et marquages dans la
  texture, la grammaire de façades généralisée aux 278 villes, et LA voiture —
  le modèle d'artiste fourni par Max, reflets par caméra cubique, vue cockpit.

- [x] **v180** — réalisme v2, premier acte : réverbères-meshes fins, feux
  tricolores aux carrefours, jardinières, marquage net ou rien.

- [x] **v179** — les trains intervilles : six vraies lignes en neuf navettes
  de gare en gare, ballast, viaduc sur la Manche, le trait sur la carte, et
  « Monter à bord » pour voyager.

- [x] **v178** — les villes respirent (Londres recalibrée, un lot sur dix en
  jardin de poche dans les 278 villes) et vivent (bus montables, six
  voitures, dix passants dont deux chiens par ville).

- [x] **v177** — les calottes polaires sont blanches : neige et glace au-delà
  de 78° nord et 63° sud, au sol comme sur la carte.

- [x] **v176** — l'onglet 🏛️ Bâtiments dans le + (601 modèles, vignettes en
  élévation, 15 familles nouvelles, 6 blocs d'architecture neufs) — et le vol
  reréglé sur verdict : croisière ×8 en dix-sept secondes.

- [x] **v175** — le vol prend sa vitesse de croisière : l'allure grandit sans
  à-coup avec le temps de vol, jusqu'à ×6 (66 blocs/s) — Paris-Rome en une
  demi-minute.

- [x] **v174** — les poissons : un banc de récif entretenu autour de
  l'enfant, partout où il y a de l'eau — six robes vives, nage vraie,
  naissance à portée de vue.
- [x] **v173** — les deux cents villes : 223 villes générées par archétypes
  régionaux avec côte automatique, 278 lieux au registre, plus d'arbres
  sauvages dans les rues — et le métro de Washington dégelé (le piège de
  flottants qui remettait la pause à l'infini, bug de production attrapé
  par la barrière).
- [x] **v164** — la carte prend ses vraies coordonnées : chaque ville déduite
  de sa latitude et de sa longitude, aucun chevauchement (marge la plus étroite
  58 blocs), et le tour du monde commence — neuf villes, dix monuments qui se
  dressent enfin quelque part. Plus : la reprise d'hôte automatique quand celui
  qui héberge s'en va, la voix de robot qui se répare seule, la baie de Nice
  qui existe enfin, et deux témoins pris en flagrant délit de mensonge (voir le
  journal).


- [x] **v163** — le métro de Paris passe sous terre : tunnel annulaire, quatre
  stations à quais, bouches de métro au bord du trottoir, plus un seul pilier.
- [x] **v162** — Washington repris à zéro sur le verdict de Max (« très low
  cost ») : échelle triplée (48 blocs/km), le cœur monumental seulement, les
  douze musées du Mall, trente-deux intérieurs réels (hémicycles du Capitole,
  Bureau ovale, avions suspendus), maisons à étages, vingt vraies stations, et
  le pont de la Jaune sur le Potomac. L'ancienne emprise rend son relief de
  v160 au bloc près.

- [x] **v161** — Washington : le plan de L'Enfant, le Mall, vingt-quatre
  monuments dans lesquels on entre, trois ponts, et quatre lignes de métro dont
  les rames s'arrêtent en station. Le sol a bougé sous la ville, et **nulle part
  ailleurs** — c'est vérifié par une seconde empreinte.

- [x] **v160** — les huit familles de bâtiments : 301 modèles en tout, variés
  pour de vrai (123 à 3 921 blocs), atteignables sans liste de 301 lignes.

- [x] **v159** — la bibliothèque de monuments branchée (onglet 🏛️, 21 bâtiments,
  pose devant soi, envoi par lots) et le portail à deux voies.
- [x] **v158** — la sauvegarde cesse de jeter les blocs de Marlon.
- [x] **v157** — la monoplace freine dans les virages.
- [x] **v156** — l'enfant n'est plus seul dans un monde peuplé.
- [x] **v155** — on monte sur les bêtes, et on monte à bord.
