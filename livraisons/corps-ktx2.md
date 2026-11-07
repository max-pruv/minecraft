---
titre: Les personnages pèsent quatre fois moins
puces:
  - Les mêmes visages, en plus léger
  - Moins de mémoire pour la tablette
---
## vNEXT — Les corps des personnages en KTX2

**Pourquoi.** La v590 a comprimé les textures des voitures, des avions et de New
York, mais pas celles des corps humains : les dix corps (neuf Rocketbox et le
policier) gardaient 38 images en RGBA, 97,7 Mo de carte graphique au banc, la
plus grosse part de mémoire de texture qui restait dans une rue peuplée.

**Ce que ça change.** Chaque corps a un fichier `-ktx2.glb` à côté de
l'original (`scripts/compresser-textures-ktx2.mjs`) : ETC1S pour la couleur et
les données, UASTC pour les normales et pour toute face sous 33 dB en ETC1S.
Les visages restent en ETC1S, de 35,5 à 40,6 dB. Textures des corps 97,7 →
24,4 Mo au banc. Rien d'autre ne change : sur un corps à squelette, le GLB est
réécrit à la main (seules les images changent de vue), parce que l'écrivain de
gltf-transform arrondit à 1 les échelles d'os proches de 1. `?ktx2=0` charge
les originaux, et les deux variantes sont dans le cache immuable.

**Ce qui le prouve.** `tests/ktx2.mjs` (lu par `degats.js`) : chaque fichier
comprimé est son original accesseur pour accesseur, octet pour octet et disposé
de même (le policier, produit entrelacé au premier jet, a été regénéré).
`verifierSquelette` exige nœuds, peaux, accesseurs, animations et vues non image
identiques à l'octet. `tests/sonde-ktx2-corps.cjs` : aucune clé de programme
différente entre les deux bras. Captures côte à côte validées par Max.
