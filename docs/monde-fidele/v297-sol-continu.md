# v297 — Le sol continu, avant / après

Mêmes points de vue, mêmes réglages (`tests/sonde-etat-initial.cjs`, rendu
logiciel, `rr 9`, `hd 6`, ombres, 1280 × 720), le monde chargé (361 morceaux
dans les deux cas). L'« avant » est rejoué sur le même code avec
`?solcontinu=0`, qui rend le voxel d'avant à l'octet près dans le mailleur
(témoin de `plafond.js` : zéro cellule de surface, le voxel décide).

| vue | avant | après |
| --- | --- | --- |
| campagne, à hauteur d'yeux | `captures/avant-campagne-a1.png` — des terrasses d'un bloc, les flancs de terre visibles | `captures/v297-campagne-a1.png` — des pentes ; les arbres et le liseré voxel au bord d'une falaise restent en cubes |
| campagne, du ciel (40 blocs) | `captures/avant-campagne-a1-ciel.png` | `captures/v297-campagne-a1-ciel.png` |
| sortie nord de Paris | `captures/avant-paris-sortie-nord.png` | `captures/v297-paris-sortie-nord.png` — la ville s'arrête toujours net (c'est la livraison 3, le couloir) |
| entrée sud de Lille | `captures/avant-lille-entree-sud.png` | `captures/v297-lille-entree-sud.png` |

## Ce qui se mesure (`tests/sonde-sol-continu.cjs`)

Sur une pente de huit marches d'un bloc en quarante blocs, relevée sur l'axe
Paris–Lille (départ (−165, −85), cap −0,256), trente secondes joystick en
avant, deux pages, même banc :

| | à pied, voxel | à pied, surface | au volant, voxel | au volant, surface |
| --- | --- | --- | --- | --- |
| blocs parcourus | 10,2 | **73,7** | 106,5 | 106,5 |
| images bloquées (pied contre un bloc) | **452 / 521** | 0 | 8 | 25 (le bord d'un lac) |
| marches (dénivelée > avance) | 0 | 0 | 5 (jusqu'à 1,0) | 0 |
| chutes d'un demi-bloc et plus | 0 | 0 | 4 | 1 |
| images les pieds sous la surface | — | 0 | — | 0 |
| images au sol en flottant | — | 0 | — | 7 (montée du liseré, 1,0) |

À pied, l'enfant d'avant s'arrête à la première marche et y reste ; sur la
surface il traverse la pente. Au volant, la voiture d'avant sautait chaque
marche (cinq bonds d'un bloc, quatre chutes) ; sur la surface elle ne saute
plus — le seul événement restant est le liseré voxel au bord du lac de
Reims, à 107 blocs, qu'elle monte d'un bloc comme avant : c'est le bord
d'une falaise de quatorze blocs, gardé en cubes à dessein.

## Ce que ça coûte au mailleur (médianes de neuf passages alternés, node)

| morceau | avec | sans | surcoût |
| --- | --- | --- | --- |
| couloir vide (30 000, 30 000) | 6,8 ms | 5,6 | +1,2 |
| campagne A1 | 4,9 | 3,7 | +1,2 |
| colline | 5,2 | 3,7 | +1,5 |
| bord de Paris | 9,4 | 8,7 | +0,7 |

Le premier chiffre était +3,4 à +5,7 ms : la question « est-ce une ville ? »
se posait à 280 villes pour chacune des colonnes de la grille. Elle se pose
désormais une fois par morceau (`villesProches`), et `terrainHeight` une fois
par colonne.

## Ce que ça ne fait pas encore

- La surface n'a ni herbe haute ni variation de tuile : la tuile est celle du
  bloc de sommet, répétée par cellule.
- L'eau garde ses cubes ; la surface passe sous le lac.
- Un liseré d'un bloc reste voxel au bord de toute zone voxel (ville, bloc
  posé, falaise) ; une voiture y monte d'un bloc comme avant.
- Le coût sur une tablette n'est pas mesuré (le banc est en rendu logiciel) ;
  `?diag=1` et le journal de bord le diront.
