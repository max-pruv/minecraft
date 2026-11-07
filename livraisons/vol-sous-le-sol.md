---
titre: Plus de chute sous le sol
puces:
  - En vol, on peut descendre très vite
  - On s'arrête toujours sur l'herbe
  - Coincé dessous ? On remonte tout seul
---
## vNEXT — En vol, on ne passe plus sous le sol

**Pourquoi.** Max, captures d'iPad : en volant et en descendant très vite, le
personnage passait sous le sol — on voyait le dessous des collines, puis la
roche et ses minerais. Hors des villes, le sommet du terrain est une surface
lisse qui remplace les deux cubes du dessus ; en descendant vite, le joueur
traversait ces deux cubes et s'arrêtait sur le troisième, juste sous la
surface, là où le jeu croyait à un tunnel. En glissant de colonne en colonne,
on s'enfonçait encore de deux blocs à chaque fois.

**Ce que ça change.** En vol, on peut piquer aussi vite qu'on veut : on se pose
sur l'herbe. Le même garde-fou vaut pour l'avion et la voiture. Un enfant déjà
coincé sous le sol par une ancienne version remonte tout seul. Les vrais
tunnels et les grottes ouvertes restent praticables.

**Ce qui le prouve.** Un témoin de `plafond.js` (`sonde-plongee-vol.cjs`, le
vrai joueur dans le vrai monde) : 150 descentes en croisière à trois cadences,
zéro sous la surface (4 sur `origin/main`), et vingt enfants coincés dessous,
vingt repris (0 sur `origin/main`). Le témoin du tunnel sous une colonne
naturelle reste vert.

