# Consignes permanentes du projet

Avant toute modification, lire `CLAUDE.md` et
[la direction artistique](docs/direction-artistique.md).

## Direction artistique obligatoire pour toutes les versions futures

Décision explicite de Max : **le jeu vise un rendu réaliste et high fidelity
partout. Aucun nouveau design de style Minecraft, voxel apparent ou pixel art.**
Cette règle couvre toute création, modification, optimisation, variante,
importation de modèle, niveau de détail et solution de secours, sur tous les
appareils. Elle s'applique à l'ensemble du jeu, pas seulement à la nature.

- Rechercher des silhouettes crédibles, une anatomie et des proportions
  justes, des surfaces détaillées, des matériaux et un éclairage cohérents.
- Refuser les textures pixelisées ou grossies, les assemblages de cubes
  figurant un être vivant, les facettes grossières, les triangles étirés,
  les déformations et les raccords visibles.
- Une texture photographique, un maillage simplement arrondi ou un fichier
  nommé « HD » ne suffisent pas à atteindre le niveau demandé.
- Optimiser par le partage des ressources, le culling, le streaming et des
  LOD soignés. Conserver cette direction artistique dans les paliers bas,
  le lointain, les animations et les états de chargement ou d'erreur.
- Vérifier le résultat dans le jeu, aux distances réellement utilisées,
  notamment au volant. Des tests techniques verts seuls ne valident pas
  la fidélité visuelle.

Les voxels peuvent rester une représentation interne des données. Ils ne
définissent plus le style visible. Les formes naturellement rectangulaires
(architecture, carrosserie, interface) et les triangles internes au GPU ne
sont pas interdits : c'est leur résultat visuel qui doit être crédible.

Préserver les sauvegardes, les constructions et la circulation automobile.
Les écarts hérités sont des défauts à corriger ; ils n'autorisent aucune
nouvelle exception à cette direction artistique. Ne pas présenter le rendu
actuel comme intégralement photoréaliste tant que ces écarts subsistent.
