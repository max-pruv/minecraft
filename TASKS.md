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

- [ ] **Paris et son métro souterrain** — consigne de Max : il n'y a pas de
  train aérien dans Paris. L'anneau actuel passe au-dessus des toits
  (`ville.js:metroAerien`, `vehicules.js:metro`, `main.js`). À refaire sous
  terre, avec bouches et quais. Et la place qu'il faut pour que Paris ressemble
  à Paris.

- [ ] **La carte sur la vraie géographie** — équirectangulaire centrée sur
  Paris, 1 bloc = 4 km, Atlantique (−74° à −10°) resserré à 60 %. New York
  956 blocs, San Francisco 1 840, Tokyo 2 538. On voyage par téléportation.
  Washington est posée au sud-ouest de New York, à 44° de l'axe nord-sud là où
  la vraie relève 52° : c'est la place disponible qui a décidé, pas la
  géographie, et c'est cette refonte qui la replacera au kilomètre près.
  **Le piège** : déplacer une ville déplace le sol sous les blocs des enfants.
  Générateur de terrain versionné + migration par colonne. Max autorise à casser
  ce qu'on ne sait pas suivre, pas à jeter ce qui se rattrape.

- [ ] **Recalibrer les monuments existants** dans le ciel à 160 blocs. Ceux de
  Washington sont déjà à leur échelle (v161) : chacun aussi grand que sa place
  le permet, l'obélisque à soixante-quatre blocs, le Capitole à trente-trois.

- [ ] **Le reste de Washington** — le mémorial Roosevelt, qui n'a pas trouvé
  trente blocs entre le Potomac et le Tidal Basin ; les lignes Orange et
  Argent, qui partagent le tunnel de la Bleue dans la vraie ville ; les guides
  qui raconteraient ce qu'on visite.

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
