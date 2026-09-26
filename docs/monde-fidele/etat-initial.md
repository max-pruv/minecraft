# État initial — v296, avant la première ligne du programme

Pris par `tests/sonde-etat-initial.cjs` le 26 septembre 2026, sur le banc
(rendu logiciel SwiftShader, quatre cœurs, `rr 9`, `hd 6`, ombres forcées,
1280 × 720, dpr 1). **Ces chiffres mesurent le banc, jamais une tablette** :
ce qui se compare, c'est avant/après sur cette même machine, mêmes points de
vue, mêmes réglages, mêmes durées. Les captures sont dans `captures/avant-*.png`,
les nombres dans `captures/avant.json`.

## Les dix vues fixes

| vue | où | appels de dessin | k-triangles | morceaux | ce qu'on voit |
| --- | --- | --- | --- | --- | --- |
| paris-rue | rue de quartier, −0,8 ; −0,9 km de Notre-Dame | 716 | 791 | 25 | façades HD, chaussée, trottoir relevé, passants |
| paris-carrefour | vue plongeante à 14 blocs | 289 | 415 | 45 | trame des rues, feux, voitures |
| paris-monument | tour Eiffel depuis le Champ-de-Mars | 616 | 761 | 99 | le modèle en relief, l'arche sans cubes (v295) |
| paris-sortie-nord | (−240, 24), au bord nord du disque | 744 | 850 | 109 | **la ville s'arrête net** : dernières façades, puis de l'herbe en marches, aucune route |
| campagne-a1 | (−110, −330), à mi-chemin de Lille | 23 | 28 | 12 | **des terrasses de blocs** d'un bloc de haut, des arbres cubiques, un lac ; aucun chemin |
| campagne-a1-ciel | même point, 40 blocs de haut | 250 | 179 | 294 | le relief en escaliers vu du ciel, le lointain lissé (`horizon.js`) qui tranche avec le proche |
| lille-entree-sud | (35, −752), 100 blocs au sud du centre, depuis un toit (y 44) | 294 | 168 | 54 | les toits de brique de Lille en cubes, le beffroi, et la campagne qui commence sans transition derrière la dernière rangée |
| lille-centre | rue du centre, sur la chaussée | 537 | 482 | 97 | immeubles de brique en cubes, un bus, un taxi, des feux ; pas de couche HD |
| gare-paris | gare TGV/Eurostar, (−349, 36), depuis le toit du bâtiment de gare | 213 | 578 | 14 | la gare est un bloc de planches encastré dans les immeubles haussmanniens du bord nord ; le ballast est une tranchée de bois ; aucun parvis, aucune rue qui y mène |
| paris-nuit | même rue que paris-rue, à minuit | 437 | 1197 | 27 | fenêtres allumées, réverbères |

**Deux vues sur dix étaient inutilisables au premier passage**, et c'est la
sonde qui était en cause, pas le jeu : elle posait la caméra à
`terrainHeight`, qui est le RELIEF — sous le quai d'une gare, qui est un
ouvrage en remblai — et elle ne regardait pas si la colonne portait un tronc.
C'est « une caméra de capture se place, et se placer veut dire voir » (v292),
une fois de plus. La sonde cherche désormais une colonne dégagée (deux blocs
d'air au-dessus du sommet solide) et pose la caméra de la gare SUR le quai.
Les deux vues ont été reprises avec cette règle et remplacent les premières
— et la colonne dégagée trouvée est un TOIT dans les deux cas (y 36 et 44) :
au sol, ni la gare ni cette entrée de Lille n'ont un endroit d'où l'on voit.
C'est un fait de l'état initial, pas un défaut de la sonde, et la vue
« après » devra pouvoir se prendre depuis la rue.

## Les deux parcours

Soixante secondes de MONTRE chacun, dans Paris, images échantillonnées à
`requestAnimationFrame`.

| parcours | images | P50 | P95 | P99 | pire | blocs parcourus | morceaux | appels | k-tri | tas (Mo) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| à pied, vers l'est | 22 | 3 017 ms | 3 867 | 3 933 | 3 933 | 3,6 | 128 | 871 | 1 311 | 593 |
| au volant, vers l'est | 13 | 5 083 ms | 6 600 | 6 600 | 6 600 | 2,2 | 178 | 1 180 | 2 668 | 928 |

Ce que ces deux lignes disent, et ce qu'elles ne disent pas :

- **Le banc rend une image toutes les trois à cinq secondes à `rr 9` avec la
  couche HD et les ombres.** C'est le remplissage que SwiftShader paie au
  processeur (v287) ; sur un iPad la carte graphique le fait. Le chiffre
  utile n'est pas la cadence, ce sont les APPELS et les TRIANGLES, qui se
  transposent, et le TAS, qui dit ce que le jeu tient.
- **Trois blocs et demi en soixante secondes à pied.** `dt` est borné à un
  vingtième : à 0,3 image par seconde le monde avance à 1,5 % du temps réel.
  Le parcours mesure donc surtout le coût d'UNE rue, pas une traversée. Pour
  comparer avant/après, on lit les colonnes appels · k-tri · tas au même
  point ; la distance parcourue ne bougera qu'avec la cadence du banc.
- **Le tas monte de 593 à 928 Mo entre les deux parcours** sur la même page —
  c'est la couche HD (89 Mo de façades tenues, v296) plus les morceaux
  chargés en roulant. Une régression de mémoire se verrait ici.

## Le couloir Paris → Lille, mesuré sous node

Sur l'axe direct entre les deux centres, 1 086 blocs, dont 810 hors des deux
disques :

| grandeur | valeur |
| --- | --- |
| marches d'un bloc entre deux colonnes voisines | 98 (12,1 % des pas) |
| marches de deux blocs ou plus | 8, la plus haute 13 |
| tronçons de dix blocs à plus de 6 % de pente | 47 sur 81 |
| colonnes sous l'eau | 37 |
| cote min · max | 21 · 45 |

Une marche d'un bloc tous les huit pas, c'est la « terrasse » de la vue
campagne-a1 ; c'est ce que le sol continu doit faire disparaître SANS
déplacer un sommet de colonne. Les huit marches de deux blocs et plus sont
des falaises et restent en voxel — et le couloir routier devra les franchir
en déblai ou en remblai, pas en les lissant.

## Le rail

`traceSegment` rend la cote du convoi ARRONDIE au bloc :

| ligne | points | cotes entières | sauts d'un bloc | pente max |
| --- | --- | --- | --- | --- |
| Eurostar Londres→Paris | 768 | 767 | 272 | 0,50 |
| TGV Paris→Lyon | 900 | 899 | 329 | 0,50 |
| TGV Lyon→Marseille | 656 | 655 | 257 | 0,50 |

Un train qui saute d'un bloc un point sur trois, c'est ce que la vue
gare-paris montrera de près une fois repointée, et c'est la quatrième
livraison du programme qui le corrige.

## Ce qui est absent, et qui se mesure par son absence

- **Aucune route entre deux villes.** `voies.js` ne connaît que les avenues
  nommées à l'intérieur des disques ; hors d'une ville, il n'y a ni chaussée,
  ni chemin, ni carte de réseau. La vue paris-sortie-nord le montre : la
  dernière rue s'arrête au bord du disque.
- **Aucune entrée de ville** : Lille commence par un bloc d'immeuble posé sur
  l'herbe.
- **Les largeurs de chaussée** exportées par l'inventaire du kit (unités
  moteur) : Paris 5,2–8,2 · San Francisco 1,54–3,08 · Nice 2,9–5,8 · Lille
  2,9–4,8 · Londres 1,4–2,4 · Washington 2,1–6,8. Une voiture fait 2,26 :
  Londres et San Francisco ne laissent pas passer une voiture sur leurs
  avenues nommées.

## Comment rejouer

```
cd tests && node sonde-etat-initial.cjs ../docs/monde-fidele/captures apres
```

produit `apres-*.png` et `apres.json` aux mêmes points de vue ; une liste de
vues en quatrième argument (`gare-paris,lille-entree-sud`) rejoue celles-là
seulement et complète le JSON existant au lieu de l'écraser.
