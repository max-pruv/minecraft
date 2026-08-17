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

- [ ] **Les familles de bâtiments paramétrées** — aller des 21 monuments écrits
  à la main aux ~300 demandés. Maisons, immeubles haussmanniens, hôtels, tours
  de bureaux, boutiques, écoles : une famille avec une dizaine de réglages
  (hauteur, largeur, matériau, toit, balcons) donne des centaines de bâtiments
  tous différents. Écrire trois cents fichiers à la main est le mauvais chemin.

- [ ] **Paris et son métro souterrain** — consigne de Max : il n'y a pas de
  train aérien dans Paris. L'anneau actuel passe au-dessus des toits
  (`ville.js:metroAerien`, `vehicules.js:metro`, `main.js`). À refaire sous
  terre, avec bouches et quais. Et la place qu'il faut pour que Paris ressemble
  à Paris.

- [ ] **La carte sur la vraie géographie** — équirectangulaire centrée sur
  Paris, 1 bloc = 4 km, Atlantique (−74° à −10°) resserré à 60 %. New York
  956 blocs, San Francisco 1 840, Tokyo 2 538. On voyage par téléportation.
  **Le piège** : déplacer une ville déplace le sol sous les blocs des enfants.
  Générateur de terrain versionné + migration par colonne. Max autorise à casser
  ce qu'on ne sait pas suivre, pas à jeter ce qui se rattrape.

- [ ] **Recalibrer les monuments existants** dans le ciel à 160 blocs.

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

- [x] **v159** — la bibliothèque de monuments branchée (onglet 🏛️, 21 bâtiments,
  pose devant soi, envoi par lots) et le portail à deux voies.
- [x] **v158** — la sauvegarde cesse de jeter les blocs de Marlon.
- [x] **v157** — la monoplace freine dans les virages.
- [x] **v156** — l'enfant n'est plus seul dans un monde peuplé.
- [x] **v155** — on monte sur les bêtes, et on monte à bord.
