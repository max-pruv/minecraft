# v299 — Le couloir Paris–Lille : l'autoroute A1

Troisième livraison du programme « monde fidèle » (`programme.md`, § 5.3).
Entre la porte nord de Paris (la gare du Nord) et l'entrée sud de Lille (la
rue de Paris), une autoroute écrite comme un ouvrage : un registre
(`src/routes.js`), un profil, une section, un pont, une circulation, deux
entrées de ville, et la carte.

## Ce qui est mesuré sous node (`scratchpad/v299/harness*.mjs`)

| grandeur | valeur |
| --- | --- |
| longueur de l'axe | 869 blocs (porte Paris (−181, 46) → vias (−140, −60) et (−70, −700) → porte Lille (−6, −792)) |
| pente maximale du profil | 0,060 (borne 0,06 du cône, plus les rampes d'épinglage) |
| écart aux bouts (cote − sol de la porte) | 0,00 et 0,00 |
| remblai · déblai maximaux | 3,6 · 7,2 blocs |
| pont (remblai > 4, ou l'eau sous l'axe) | s 530–542 |
| coudes de l'axe | 15° et 29° (deux points de passage — un seul ne passe pas à l'ouest du Pôle Nord) |
| distance de l'axe à la maison témoin (−100, −100) | 35 blocs (emprise + talus ≤ 21,4) |
| marge au disque de Roissy (r + 12) | 9 blocs |
| marge à la banquise du Pôle Nord (r 60) · voie ferrée croisée | 32 blocs · 0 |
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
| au volant sur l'A1, quatre-vingts blocs à la cote du profil | 80 blocs, 0 marche, 0 chute, 0 image bloquée, écart max 0,06 |
| le premier pont, d'un bout à l'autre sur son tablier | abscisse d'arrivée 555 pour un pont 530–542, 16 relevés sur le tablier, 0 hors, 0 chute, 0 image bloquée |
| rien ne flotte au-dessus du couloir | 0 colonne en faute sur 6 269 (0,7 s) — 122 couches d'herbe, 131 nappes et un chalet avant |
| le paysage lointain est à la cote de la route | 1 572 / 1 572 colonnes (42 sans `coteHorizon`) |
| sous le tablier, on reste en bas | on reste sous le tablier (témoin `plafond.js`) |
| sommet des colonnes de route (une voie) | asphalte et contact au profil ≥ 95 %, écart max 0,04 |
| pont | 3 colonnes libres sous le tablier |
| convoi | `route: 'A1'`, ≥ 10 modèles |

Six défauts trouvés avant la livraison, trois par ces témoins et trois par
les captures. Par les témoins : un point sur le prolongement de l'axe passait pour de la route (le
centre de Paris rendait 112 colonnes « A1 ») ; une cote de talus rangée en
simple précision changeait de bloc entre le générateur et le mailleur ; le
tablier, qui n'est pas un bloc, était invisible au contrôle de l'eau devant
la voiture (60 images bloquées sur 78). Par les captures — une dalle de terre
au-dessus de la route sur les vues du pont et de la porte de Paris — : le
déblai ne dégageait que six blocs et le relief en dominait sept (la couche
d'herbe restait en l'air, 122 colonnes) ; la nappe d'un lac restait sur un
talus creusé sous elle (131 colonnes) ; et le premier via traversait le Pôle
Nord, un repère posé après les colonnes (un chalet sur la chaussée). Le tracé
à deux vias qui en sort a révélé une culée qui dépassait le tablier (la
voiture butait, 60 images) et une chaussée abaissée à la cote de l'eau par la
rampe d'épinglage (8 colonnes) — corrigés de même.

## Captures (`tests/sonde-etat-initial.cjs … v299`)

Mêmes réglages que l'état initial (rendu logiciel, `rr 9`, `hd 6`, ombres,
1280 × 720). Les vues de la route : `v299-a1-route.png` (s 300, à hauteur
d'yeux), `v299-a1-ciel.png` (du ciel), `v299-a1-pont.png` (s 528, devant le
premier pont), `v299-a1-porte-paris.png`, `v299-a1-porte-lille.png`. Les
chiffres des vues et des deux parcours sont dans `captures/v299.json`.

## Ce qui reste déclaré (`TASKS.md`)

Une seule route ; la trame des villes écrasée dans les vingt derniers blocs
du disque (raccord au sol propre, façades non remaniées) ; les convois de
l'A1 ne se cousent pas encore aux circuits des villes ; pas de parapet
solide ; passants et bêtes ne connaissent pas l'autoroute.
