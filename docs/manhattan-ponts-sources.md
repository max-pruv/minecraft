# Ponts fournis pour la refonte de Manhattan

Les deux sources ont été téléchargées et inspectées le 1er novembre 2026.
Elles restent hors du dépôt et ne sont pas chargées par le jeu : chaque modèle
contient le pont, mais aussi de larges morceaux des deux rives et de leurs
bâtiments. Les poser tels quels recouvrirait les quartiers du plan jouable.
Cette livraison conserve donc les ponts procéduraux de la PR #587.

## Brooklyn Bridge

- Archive : `brooklyn_bridge_manhattan_new_york_ny_usa.zip`, 116 271 666 octets.
- SHA-256 : `30f3b6dad42b2d3acbd931e0ec6ae8da55a2b0682e72b1a6f4572d0cf292a432`.
- Contenu : glTF, 159 913 224 octets de géométrie, photo de 65 649 310 octets,
  licence explicite. 68 maillages.
- [Source](https://sketchfab.com/3d-models/brooklyn-bridge-manhattan-new-york-ny-usa-0aeb37ea6cdf480aab19eb204f5255ee),
  par [Brian Trepanier](https://sketchfab.com/CMBC),
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Manhattan Bridge

- Archive : `Manhattan_Bridge_Brooklyn_New_York_NY_USA.usdz`, 144 524 224 octets.
- SHA-256 : `2589f6732bba69bb1055f95ced9475e50b86ac449843b96759ff097e2774c7e8`.
- Contenu : `scene.usdc`, 134 891 829 octets, photo de 9 632 063 octets.
  Lecture vérifiée avec OpenUSD 26.11 ; auteur, titre, URL et licence sont dans
  `customLayerData` de la couche USD. Les transformations de la scène doivent
  être appliquées avant toute mesure : les coordonnées brutes des maillages
  ne suivent pas directement l'axe vertical déclaré à la racine.
- [Source](https://sketchfab.com/3d-models/manhattan-bridge-brooklyn-new-york-ny-usa-70106cd239f64a31aaf1c62d41b2d373),
  par [Brian Trepanier](https://sketchfab.com/CMBC),
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Une intégration ultérieure devra découper les rives, simplifier les maillages,
recuire les textures et raccorder le tablier aux rues du jeu. Les piles et les
passages devront partager leurs emprises avec les collisions. Les sept ponts
actuels ne comprennent pas de pont de Manhattan : celui-ci demande également
un raccordement géographique propre, sans renommer un autre pont.
