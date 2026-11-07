---
titre: Un moteur d'image à l'essai
puces:
  - Rien ne change pour toi aujourd'hui
  - Un nouveau rendu se teste derrière un réglage
  - Pour un jeu plus beau et plus rapide
---
## vNEXT — Un rendu WebGPU à l'essai, derrière un drapeau

**Pourquoi.** Chantier « réalisme » 3 sur 5 : avant de décider si Grand Tour
quitte le `WebGLRenderer` de three r160 pour le `WebGPURenderer`, il fallait
savoir ce qui bloque, ce que ça coûte, et le voir tourner. Rien de tout cela
ne se devine : le jeu écrit du GLSL en six endroits, appelle dix-sept fois une
compilation synchrone, et dix témoins lisent des clés de programmes WebGL.

**Ce que ça change.** Rien par défaut : le rendu est la ligne d'avant. Sous
`?rendu=webgpu`, le jeu charge three r187 (servi en local, cache immuable),
crée un rendu WebGPU — ou son dos WebGL2 si l'appareil n'a pas d'adaptateur,
et le dit — et dessine Paris, le ciel, la couche HD, la fumée, les traces et
une voiture avec les greffons portés en nœuds (TSL). `?diag=1` nomme le rendu,
le dos, l'adaptateur et les pipelines : c'est ce que Max lit sur son iPhone.
Et le drapeau a sa porte de sortie : si WebGPU ne démarre pas — un module qui
ne se lie pas (le KTX2Loader de r160 importait deux noms que r187 n'a plus :
c'est ce qui gelait l'iPhone de Max sur « Chargement du monde… »), une
initialisation qui jette ou qui pend, une première image qui ne vient pas — la
page repart sous WebGL en quelques secondes et dit pourquoi dans `?diag=1` et
au journal de bord.
`docs/webgpu.md` porte l'inventaire, les mesures et le plan en huit étapes ;
`docs/webgpu/`, les captures du Marais côte à côte.

**Ce qui le prouve.** La sonde isolée `sonde-rendu-webgpu.cjs` (six passages,
trois rendus, même endroit) : mêmes appels de dessin (≈ 650), moitié moins de
pipelines que de programmes, un tiers de textures en moins, et des durées
d'image de rastériseur logiciel qui ne se transposent pas. Elle a trouvé en
chemin un canvas figé par une compilation asynchrone lancée sans attendre
(l'état de précompilation de three laissé en place) et des compteurs remis à
zéro par la boucle interne de three — corrigés, vérifiés par la couleur de
l'image présentée (ciel, sol) après « Jouer ». Le portail ne joue pas le
prototype : la fumée vérifie que le module neuf arrive sur la tablette et que
tout nom importé de `three` existe dans les deux builds (rouge sur le
KTX2Loader de la v590), deux témoins de `maj.js` forcent la porte de sortie
(`?webgpu=echec`, `?webgpu=gel`) et lisent la page WebGL d'arrivée, et le
reste du jeu ne le lit que sous le drapeau.

---

