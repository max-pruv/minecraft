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
  qui vivent encore à leur échelle d'origine. Même recette : le cœur à grande
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

- [ ] **Le rouge ancien des suites réseau du portail** — découvert en v187 en
  prenant la voie longue : `reseau.js`, `visio.js`, `reglages.js` et `hote.js`
  sont rouges, et ils le sont AUSSI sur `origin/main` — mesuré, pas supposé :
  `hote.js` échoue sur les trois mêmes témoins aux mêmes valeurs, `reseau.js`
  sur les quatre mêmes plus un, avec le même effondrement du banc. Le code
  réseau n'a pas bougé depuis v164, vingt-trois versions : ces suites ne sont
  plus sélectionnées par l'aiguillage, et elles ont rougi sans que personne ne
  le voie — la panne exacte que `CLAUDE.md` documente (« six suites vertes ne
  valent pas un portail vert »). Deux pistes : le mandataire signale 188
  connexions refusées vers le vrai Supabase pendant ces essais (le navigateur
  du conteneur n'a pas d'Internet sortant), et plusieurs témoins mesurent des
  durées de MONTRE sur un banc qui rend en logiciel. À démonter suite par
  suite, hors d'un chantier de contenu.

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
  « Conduire » de `CLAUDE.md`.

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
