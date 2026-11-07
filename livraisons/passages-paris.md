---
titre: Les passages piétons de Paris
puces:
  - Un passage traverse toute la chaussée
  - Les avenues ont les leurs
  - Plus de bandes sur le trottoir
---
## vNEXT — Les passages piétons de Paris couvrent toute la chaussée

**Pourquoi.** Max, à pied dans Paris : « sur certaines rues, le passage
piéton ne couvre pas toute la chaussée. Il s'arrête parfois à la moitié de la
route. » Mesuré AVANT d'écrire une ligne, sous node, sur tout le disque de
Paris et sur `origin/main` : 329 passages sur 1 963 s'arrêtaient hors de la
chaussée, 3 302 colonnes de passage peintes là où le sol n'est pas une rue. La
cause n'était pas une largeur : le marquage (`marquageParis`) ne lisait que la
trame des rues ordinaires, pendant que le sol (`solParis`) fait passer AVANT
elle les avenues nommées, les places, les quais et les socles. Au débouché
d'une rue de trame sur une avenue, la bande de la rue tombait pour moitié sur
le trottoir de l'avenue — et il n'y avait aucun passage en travers de
l'avenue elle-même.

**Ce que ça change.** À Paris, un passage piéton va d'un trottoir à l'autre,
sur la chaussée, et nulle part ailleurs. Au débouché d'une rue sur une avenue
nommée (Grande Armée, Magenta, Sébastopol…), un passage traverse l'avenue
dans le sens de la marche, d'un bord à l'autre. Aucun bloc ne change, aucune
rue ne bouge : c'est du dessin, et les passants traversent aux mêmes endroits
qu'avant plus ceux-là. Ce qui reste, déclaré dans `TASKS.md` : quelques
passages d'avenue coupés au joint de deux tronçons d'une même avenue, et une
vingtaine de passages de trame que des blocs du monde (une couronne d'arbre,
un monument, une route) recouvrent.

**Ce qui le prouve.** Deux témoins neufs dans `plafond.js`, lus par
`tests/sonde-passages-paris.mjs` (pure, sous node, moins d'une seconde, tout
le disque) : aucun passage d'une rue de trame ne s'arrête hors de la chaussée
(0 coupé sur 1 605 ; 329 sur 1 963 sur `origin/main`), et les avenues ont
leurs passages d'un bord à l'autre (78 entiers sur 90 ; aucun sur
`origin/main`). Les deux sont rouges sur l'ancien code. Le sol est identique
colonne par colonne sur les 549 081 colonnes du disque. L'empreinte des 490
morceaux, règle désarmée (`reglageMarquage`), rend la constante au bit près ;
le coût de maillage d'un morceau de Paris ne bouge pas (13,7–15,6 ms contre
13,7–14,7 avec le détail). Captures avant/après de l'avenue de la Grande
Armée, à l'iPhone, dans `docs/revue-ecran/passages-paris/`.
