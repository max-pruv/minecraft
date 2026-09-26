# v299 — Le couloir Paris–Lille : l'autoroute A1

Troisième livraison du programme « monde fidèle » (`programme.md`, § 5.3).
Entre la porte nord de Paris (la gare du Nord) et l'entrée sud de Lille (la
rue de Paris), une autoroute écrite comme un ouvrage : un registre
(`src/routes.js`), un profil, une section, deux ponts, une circulation, deux
entrées de ville, et la carte.

## Ce qui est mesuré sous node (`scratchpad/v299/harness*.mjs`)

| grandeur | valeur |
| --- | --- |
| longueur de l'axe | 851 blocs (porte Paris (−184, 45) → via (−150, −50) → porte Lille (19, −781)) |
| pente maximale du profil | 0,064 (borne 0,06 du cône, plus les rampes d'épinglage) |
| écart aux bouts (cote − sol de la porte) | 0,00 et 0,00 |
| remblai · déblai maximaux | 4,0 · 6,6 blocs |
| ponts (remblai > 4) | s 726–738 et s 815–820 |
| coude de l'axe | 5,3° (un seul point de passage) |
| distance de l'axe à la maison témoin (−100, −100) | 37 blocs (emprise + talus ≤ 21,4) |
| marge au disque de Roissy (r + 12) | 2,7 blocs |
| section (unités moteur, 1 bloc = 1 m au joueur) | 2 × 2 voies de 3,5, terre-plein 1, accotements 1 : demi-chaussée 7, demi-emprise 8,5 |
| talus | pente 0,7, déblai borné à 9 |
| tracé des convois | 428 points, 0 saut > 0,5 bloc, aller et retour sur les voies intérieures |
| `routeEn` par colonne | 5,8 µs près de la route, 0,03 µs loin (index par cases de 512) |
| maillage d'un morceau de route | 8 à 22 ms (campagne 5 à 22 ; le pont 16) |

**Le relief ne bouge pas** : la route est un ouvrage écrit en blocs (remblai,
déblai, asphalte, piles), comme la voie ferrée ; les deux empreintes de
`plafond.js` sont identiques.

## Ce qui est mesuré dans le jeu (`tests/plafond.js`, `tests/carteMonde.js`)

| témoin | résultat |
| --- | --- |
| au volant sur l'A1, quatre-vingts blocs à la cote du profil | 80,6 blocs, 0 marche, 0 chute, 0 image bloquée, écart max 0,06 |
| le premier pont, d'un bout à l'autre sur son tablier | abscisse d'arrivée 747,7 pour un pont 726–738, 0 hors tablier, 0 chute |
| sous le tablier, on reste en bas | tablier 35,25, sol 29, y 29 |
| sommet des colonnes de route (une voie) | asphalte et contact au profil ≥ 95 %, écart max 0,04 |
| ponts | colonnes libres sous chaque tablier |
| convoi | `route: 'A1'`, ≥ 10 modèles |

Trois défauts trouvés par ces témoins et corrigés avant la livraison, dans
l'ordre : un point sur le prolongement de l'axe passait pour de la route (le
centre de Paris rendait 112 colonnes « A1 ») ; une cote de talus rangée en
simple précision changeait de bloc entre le générateur et le mailleur ; le
tablier, qui n'est pas un bloc, était invisible au contrôle de l'eau devant
la voiture (60 images bloquées sur 78).

## Captures (`tests/sonde-etat-initial.cjs … v299`)

Mêmes réglages que l'état initial (rendu logiciel, `rr 9`, `hd 6`, ombres,
1280 × 720). Les vues de la route : `v299-a1-route.png` (s 300, à hauteur
d'yeux), `v299-a1-ciel.png` (du ciel), `v299-a1-pont.png` (s 712, devant le
premier pont), `v299-a1-porte-paris.png`, `v299-a1-porte-lille.png`. Les
chiffres des vues et des deux parcours sont dans `captures/v299.json`.

## Ce qui reste déclaré (`TASKS.md`)

Une seule route ; la trame des villes écrasée dans les vingt derniers blocs
du disque (raccord au sol propre, façades non remaniées) ; les convois de
l'A1 ne se cousent pas encore aux circuits des villes ; pas de parapet
solide ; passants et bêtes ne connaissent pas l'autoroute.
