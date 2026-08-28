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

- [ ] **Paris a la place qu'il lui faut** — le métro est passé sous terre
  (v163) et la carte lui a donné l'espace (v164) : la ville peut maintenant
  grandir jusqu'à son rayon réel sans toucher Lille ni Londres. Reste à
  l'étaler pour de bon.

- [ ] **Les villes vivantes ET aérées** (verdicts de Max, captures à
  l'appui) — « too packed » sur Londres : des places, des squares, des cours,
  des dents creuses ; et « much more life » : des bus, des métros dans les
  grandes villes générées, des chiens, plus de passants et de voitures.

- [ ] **Les trains intervilles sur les vraies lignes** (Eurostar, Shinkansen,
  AVE…), à monter via le bouton « Monter à bord » existant.

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
