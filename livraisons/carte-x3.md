---
titre: Un monde trois fois plus grand
puces:
  - New York ne touche plus Boston
  - Les villes ont de la place autour
  - Tes constructions suivent leur ville
  - Routes, trains et aéroports refaits partout
---
## vNEXT — La carte trois fois plus grande

**Pourquoi.** Max : « New York aujourd'hui mange Boston ». Mesuré : à 0,1875 km
par bloc, Boston tombait DANS la boîte du plan de New York (banlieues comprises),
et aucune ville ne pouvait grandir sans en recouvrir une autre ou le quartier des
enfants (`docs/carte-x3.md`). C'est le palier 1 de « routes et villes plus larges » :
la place d'abord, les rues ensuite.

**Ce que ça change.** La carte passe à 0,0625 km par bloc, ancrée sur Paris :
toutes les distances entre villes triplent, New York garde son plan et Boston en
sort de plus de mille blocs. Les vingt-neuf routes, les lignes de train et leurs
gares, les dix-neuf aérodromes (Barajas et Schiphol relogés), Changi, les sites
de la carte et les monuments sont remesurés par sonde sur la nouvelle carte.
L'I-95 Sud entre à Washington par une tranchée hors norme (13,7 blocs, décision
de Max). Ce que les enfants ont bâti suit sa ville (marche de migration 8 → 9),
avec une copie d'avant sur le nuage (`~avant-carte-x3`) ; le monde de la
production est figé (`CONF_V587`, `terreV4`) pour juger les blocs d'avant sur le
monde où ils ont été posés.

**Ce qui le prouve.** Le sol sous le point d'apparition et sous Paris est
identique avant et après (témoin des 4 040 colonnes, et 17 265 colonnes mesurées
à la sonde). Les copies figées rendent la production au bloc près (2 167 653
colonnes, trois mondes). La marche 8 → 9 a ses témoins (pure, idempotente, un
bloc suit sa ville, la fusion du nuage migre). Les empreintes du relief changent
et sont déclarées dans `plafond.js` : comme en v199 et v242, la casse n'est pas
bornée, c'est le témoin des 4 040 colonnes qui porte la preuve. Les témoins
écrits en blocs de l'ancienne carte demandent désormais leurs sites à la
projection.
