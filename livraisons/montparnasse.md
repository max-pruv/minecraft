---
titre: Montparnasse n'est plus transparente
puces:
  - La tour a de vrais murs
  - On ne voit plus le ciel au travers
---
## vNEXT — La tour Montparnasse n'est plus un treillis de verre

**Pourquoi.** Sur la capture « croisement » des matériaux scannés, la tour
Montparnasse se lisait comme une cage : ses murs étaient en bloc de verre, et
comme la tour est creuse, chaque bloc de verre était un trou par lequel on
voyait le ciel et l'intérieur vide. C'est la panne du « verre dans les murs »
(v195, v202, le Shard en v449), restée dans ce bâtisseur-là.

**Ce que ça change.** Les murs de la tour sont un mur-rideau opaque
(`CITY_BLOCK.CURTAIN`) : vitrage sombre avec ses meneaux, qui s'allume la nuit,
entre les bandeaux noirs de chaque étage. La forme ne change pas d'un bloc :
les deux blocs sont solides, donc rien ne bouge pour la circulation, les
passants ou ce qu'un enfant a bâti autour.

**Ce qui le prouve.** Un témoin de `carteMonde.js` appelle le bâtisseur et
compte le verre : 500 blocs sur 718 sur l'ancien code, 0 ici. La capture
avant/après du croisement est dans `docs/montparnasse/croisement.jpg`.
