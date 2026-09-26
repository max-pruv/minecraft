# Le programme « monde fidèle » — décisions, hypothèses, état initial

Brief de Max (26 septembre 2026, kit `world-fidelity-kit` v2) : transformer
Grand Tour en monde ouvert crédible et agréable à parcourir — terrain
continu partagé par le rendu, les collisions et la navigation ; villes
reliées par un vrai réseau ; fidélité architecturale ; corrections
proactives ; performances sur les anciens appareils. Le kit est un cahier de
conception et des modules d'algorithmes ; rien n'y est branché au jeu, et
c'est ici que se décide comment il le sera.

Ce document est tenu à jour à chaque livraison du programme. Il dit **ce qui
est décidé**, **ce qui est mesuré** et **ce qui reste conceptuel**. Le journal
des versions (`CHANGELOG.md`) dit ce que chaque livraison apporte ;
`CLAUDE.md` ce qu'il ne faut pas casser.

## 1. Ce qui existe déjà, et qu'on ne remplace pas

| Élément du dépôt | Ce qu'il apporte au programme |
| --- | --- |
| `horizon.js` | Déjà un maillage CONTINU de hauteurs (`terrainHeight` pure, défilé, jamais refait) — pour le lointain. C'est le modèle du terrain continu proche. |
| `trains.js` | Neuf segments, profils lissés à pente bornée (`PENTE = 1/3`), gares bâties. Mais la cote du convoi est ARRONDIE au bloc (mesuré ci-dessous). |
| `voies.js`, `paris.js`, `londres.js`… | Les avenues nommées, les circuits mesurés sur le sol, `contournerRonds`, `coteRoulable`. Aucune route ENTRE les villes. |
| `facadeshd.js`, `paris-monuments-hd.js` | La couche de détail qui lit les blocs sans en écrire un : le modèle de toute couche de rendu à venir. Couverture : Paris seulement. |
| `palier.js`, `journal.js`, `liberer.js`, `cadence.js` | Paliers, sûreté, libération des ressources, cadences réelles — à respecter, pas à doubler. |
| `plafond.js` (deux empreintes), `carteMonde.js` | Les gardiens de l'invariant 1 : le sol ne bouge pas sous les blocs des enfants. |

## 2. Décisions d'architecture

1. **Le bloc reste le squelette des DONNÉES ; il cesse d'être la forme du SOL
   NATUREL.** Les blocs posés par les enfants, les bâtiments, les rues des
   villes et les monuments restent en voxel (collisions, sauvegardes,
   édition). Le sol naturel — les colonnes hors villes, hors ouvrages, hors
   blocs posés — devient une surface triangulée par morceau, qui passe par le
   sommet de chaque colonne en son centre. Un bloc posé sur ce sol repose donc
   exactement où il reposait : **aucune migration de coordonnées n'est
   nécessaire pour cette étape**, et les deux empreintes de `plafond.js` ne
   bougent pas. Le prix déclaré : sur une pente, la surface s'écarte d'au plus
   un demi-bloc du sommet des colonnes voisines.
2. **Une seule hauteur pour trois lecteurs.** `solContinu(x, z)` (échantillon
   triangulaire sur les mêmes sommets que le maillage) devient l'autorité du
   contact au sol du joueur, des véhicules, des passants et des bêtes dans les
   zones converties ; les murs, dalles et blocs posés gardent la boîte voxel.
   C'est la règle « une seule règle, trois lecteurs » du dépôt (`postesAvion`,
   `feux.js`, `anneauxDeVille`) appliquée au sol.
3. **Les routes entre villes sont un REGISTRE** (`routes.js`) : par corridor,
   les deux portes (position, altitude, tangente, largeur), l'axe, le profil
   vertical ajusté à pente bornée (module `fitProfile` du kit, adapté), la
   section (module `roadSection`, adapté), et les ouvrages là où le profil
   quitte le terrain (remblai, déblai, pont, tunnel). Le sol continu LIT ce
   registre : sous un corridor, la surface est celle du profil, raccordée au
   terrain par un talus. Le rendu, le contact, la circulation interurbaine et
   la carte lisent la même chose.
4. **Le rail garde son profil et perd son arrondi.** `traceSegment` rend une
   cote arrondie au bloc à chaque point : c'est ce que le convoi suit, et ce
   que le cahier interdit. Le profil lissé (`profilDe`) reste ; la cote du
   convoi et celle des gares deviennent continues, le ballast voxel étant
   remplacé par la même surface que le sol.
5. **Chaque famille de ville reçoit un ADAPTATEUR, jamais huit copies.** Les
   grammaires du kit (`standards.mjs`) et les registres de quartiers de
   `facadeshd.js` (`STYLES`) fusionnent dans un seul registre ; une ville
   déclare ses quartiers, la couche HD les lit.
6. **Aucun asset propriétaire, provenance écrite.** Les modèles ajoutés (s'il
   y en a) vont dans `vendor/` avec leur licence, comme la flotte et les corps.
7. **Un bâtiment de la bibliothèque se place à l'échelle du JOUEUR, et cette
   échelle est UN BLOC POUR UN MÈTRE** — voir la section 6 : c'est ce que le
   kit v3 exige (« `unitsPerMeter` calibrée sur le joueur et les véhicules »),
   et c'est ce que le dépôt mesure déjà (joueur 1,8 bloc, voiture 4,4 × 2,26).
   Le prix, chiffré plus bas, est que la trame actuelle des villes ne peut pas
   l'accueillir : la bibliothèque impose une retrame, ville par ville, dans une
   zone bornée — jamais un étirement du modèle ni une échelle intermédiaire.

## 3. La zone pilote : Paris nord → A1 → Lille

- **Pourquoi ce couloir.** Paris est la ville la plus travaillée (couche HD,
  circuits, monuments) ; Lille est bâtie à la main, à l'échelle ; entre les
  deux, 1 086 blocs entre centres, 810 hors villes, une géographie de plaine
  avec des lacs : de quoi une sortie de ville, une route interurbaine, au
  moins un ouvrage, et l'entrée d'une seconde ville. La gare TGV/Eurostar de
  Paris donne la gare.
- **Ce qui doit être prouvé sur le pilote** : le sol continu se voit et se
  marche (pas une marche sur le parcours), la voiture roule de la rue de
  Rivoli à la Grand-Place de Lille sans s'arrêter à une frontière de morceau,
  un pont se traverse dessus et dessous, la gare de Paris est accessible à
  pied et le train y entre sans saut de cote.

## 4. État initial (v296, avant toute ligne du programme)

Mesuré sous node (`scratchpad/etat-couloir.mjs`, à rejouer) sur l'axe direct
Paris→Lille hors villes, 810 colonnes :

| grandeur | valeur |
| --- | --- |
| marches d'un bloc entre deux colonnes | 98 (12,1 % des pas) |
| marches de deux blocs ou plus | 8, la plus haute 13 |
| tronçons de dix blocs à plus de 6 % de pente | 47 sur 81 |
| colonnes sous l'eau | 37 |
| cote min · max | 21 · 45 |

Le rail (`traceSegment`, cote du convoi) :

| ligne | points | cotes entières | sauts d'un bloc | pente max entre deux points |
| --- | --- | --- | --- | --- |
| Eurostar Londres→Paris | 768 | 767 | 272 | 0,50 |
| TGV Paris→Lyon | 900 | 899 | 329 | 0,50 |
| TGV Lyon→Marseille | 656 | 655 | 257 | 0,50 |

Les largeurs de chaussée exportées (inventaire du kit sur ce dépôt, unités
moteur) : Paris 5,2–8,2 ; San Francisco 1,54–3,08 ; Nice 2,9–5,8 ; Lille
2,9–4,8 ; Londres 1,4–2,4 ; Washington 2,1–6,8. Une voiture fait 2,26 de
large : Londres et San Francisco ne laissent pas passer une voiture sur leurs
avenues nommées telles quelles.

Les vues fixes et les deux parcours (à pied, au volant) sont pris par
`tests/sonde-etat-initial.cjs` ; leurs chiffres et captures vivent dans
`docs/monde-fidele/captures/avant.json` et `avant-*.png` — voir
`etat-initial.md`.

## 5. Ordre des livraisons

1. **État initial** — FAIT : la sonde (`tests/sonde-etat-initial.cjs`), les
   captures, les mesures (`etat-initial.md`).
2. **Le sol continu** — FAIT (v297, `src/solcontinu.js`) : rendu + contact +
   navigation hors villes, couture entre morceaux, palier bas identique.
   Mesuré sur une pente de huit marches de l'axe Paris–Lille, trente secondes
   joystick en avant : à pied 10,2 → 73,7 blocs (452 images bloquées → 0) ;
   au volant 5 marches et 4 chutes → 0 et 1. Empreintes de `plafond.js`
   intactes, maison sauvegardée posée au bloc près, +1,2 ms par morceau de
   campagne. **Ce qui reste voxel, et se déclare** : les falaises (au-delà
   d'un bloc d'écart dans une cellule), un liseré d'un bloc au bord de toute
   zone voxel (ville, bloc posé, falaise), l'eau (la surface passe sous le
   lac, l'eau garde ses cubes), les arbres.
3. **Le couloir Paris–Lille** : registre des routes, profil, section,
   ouvrages, circulation interurbaine, entrées de ville, carte.
4. **Le rail continu et la gare accessible** : cote continue, quai à niveau.
5. **Les autres couloirs et villes**, par lots, avec la matrice de couverture.
6. **La fidélité architecturale** : registre unifié des quartiers, grammaires
   par ville, mobilier, végétation — et, depuis le kit v3, la bibliothèque de
   modèles (section 6), avec un quartier témoin AVANT toute généralisation.

Ce qui reste conceptuel tant qu'une livraison ne l'a pas prouvé : tout ce qui
est au-dessous de la ligne 1.

## 6. La bibliothèque architecturale (kit v3, 26 septembre 2026)

Max a livré une troisième version du kit, dont la nouveauté est une
bibliothèque de modèles : **32 familles × 3 variantes × 3 niveaux de détail =
288 bâtiments, plus 42 objets et composants de monument, 330 GLB, 46 Mo**.
Unité le mètre, +Y en haut, façade vers −Z, pivot au centre de la façade au
sol. Avec elle : `data/assets.json` (96 variantes : `boundsM`, colliders,
entrée, fichiers par LOD avec triangles, appels de dessin, octets),
`data/cities.json` (278 fiches de ville : quartiers `baseline`,
`heritage_candidate`, `contemporary`, `industrial`, `placementMode`, liste
`never`), `data/recipes.json`, `data/families.json`, des guides par famille et
par ville, et `integration/library.mjs` (`chooseBuilding` déterministe par
identifiant de parcelle, `createBuildingLoader` à cache partagé). Rien n'est
branché au jeu (`DELIVERY.json` : `integratedIntoGame: false`,
`browserValidated: false`), et le kit le dit lui-même : « no browser or mobile
FPS benchmark, not an architectural survey ».

### Ce qui est utilisable tel quel

- **Les modèles sont des conceptions originales**, sans géométrie, texture ni
  photographie tierce (`SOURCES-ET-STATUT.md`) — l'invariant 4 tient. Ils sont
  en aplats PBR sans UV ni textures ; latéraux et arrières simplifiés ; portes
  fermées ; pas d'intérieurs. Le kit annonce lui-même la passe suivante :
  angles, UV, patine, accès.
- **Le poids est raisonnable PAR FAMILLE, pas en bloc** : les trois familles de
  Paris font 5,0 Mo, les trois de Bruxelles (celles que la fiche de Lille
  demande) 3,3 Mo. Un immeuble haussmannien au LOD 0 coûte 7 162 triangles et
  6 appels de dessin, 507 Ko ; au LOD 2, 2 230 triangles, 160 Ko. Rien de tout
  cela ne va dans la liste versionnée de `sw.js` (la leçon des 8,2 Mo de la
  v245) : une famille se charge à l'entrée du quartier qui la demande, dans le
  cache IMMUABLE (`isStaticAsset`), et jamais les 330 fichiers au démarrage —
  c'est écrit dans le mandat du kit et c'est ce que le dépôt fait déjà pour la
  flotte et les corps.
- **La discipline du choix** est celle du dépôt : famille par quartier (jamais
  par latitude), variante par identifiant STABLE de parcelle (jamais par
  morceau, sinon le tirage change au remaillage — c'est la leçon des fenêtres
  allumées, tirées en coordonnées du monde pour cette raison), aucun étirement, collider identique à tous les LODs.
- **Le chargeur** est le `GLTFLoader` r160 déjà dans `vendor/`, et le cache
  partagé du kit marque ses ressources `userData.partagee` — la règle de
  `liberer.js` (v238) est respectée par construction.

### Ce qui ne colle pas, et se chiffre : l'échelle

Le kit exige une échelle uniforme « calibrée sur le joueur et les véhicules »
et refuse la projection kilomètres/bloc comme échelle de bâtiment. Mesuré dans
le dépôt : le joueur fait **1,8 bloc**, une voiture **4,4 × 2,26 blocs**. À
l'échelle du joueur, **un bloc vaut un mètre**, et c'est la seule valeur de
`unitsPerMeter` qui satisfasse le mandat.

Or les villes ont été bâties sur DEUX échelles (règle « deux échelles dans la
même ville » de `CLAUDE.md`) : au sol un bloc vaut 40 m à Paris (24 blocs par
kilomètre), en hauteur un bloc vaut un étage. Ce que cela donne pour un
immeuble haussmannien de la bibliothèque (18 × 12 m, 22,55 m, six niveaux) :

| grandeur | ville actuelle (Étoile) | bibliothèque à 1 bloc = 1 m |
| --- | --- | --- |
| hauteur d'un immeuble de six niveaux | 6 blocs (`etages: 6`) | 22,5 blocs |
| façade | épaisseur de lot 4,4 blocs, pas d'îlot 21,4 | 18 × 12 blocs |
| îlot | 12,6 blocs (= 500 m au sol) | un vrai îlot fait 60 à 100 m, donc 60 à 100 blocs |
| disque de Paris (r = 185) | tout Paris intra-muros | 370 m de côté, un quartier |

**Aucune parcelle actuelle ne peut recevoir un modèle sans l'étirer**, et un
modèle placé à cette échelle serait quatre fois plus haut que ses voisins en
voxel. Une échelle intermédiaire (un bloc par étage, `unitsPerMeter` ≈ 0,27)
ferait entrer la bibliothèque dans la trame d'aujourd'hui — mais elle
enfreindrait le mandat, et surtout elle mettrait des portes de 0,75 bloc
devant un enfant de 1,8 : c'est exactement le monde « maquette » que Max a
refusé à Washington en v161. On ne la retient pas.

**Ce que la bibliothèque impose donc, et c'est une décision de Max, pas de
rendu** : une ville qui la reçoit se RETRAME à un bloc pour un mètre, dans une
zone bornée (comme `ZONE_WASHINGTON`), avec des îlots de 40 à 100 blocs et des
rues de 8 à 25. À cette échelle, le disque de Paris ne contient plus la ville
entière mais un quartier de 370 m : c'est le choix de tout jeu à monde ouvert
(une capitale comprimée, des bâtiments vrais, des monuments rapprochés). La
retrame d'une ville bâtie à la main est une casse de l'invariant 1 — la
neuvième — qui se déclare, se borne et se prouve par la double empreinte,
avec la copie et la migration des blocs des enfants (v199, v242).

### Le quartier témoin, et l'ordre proposé

1. **Un quartier de Paris, borné**, retramé à 1 bloc = 1 m sur le vrai plan
   (l'Étoile ou Monceau : `paris_haussmann` seul, six niveaux, îlots réguliers,
   c'est la famille la mieux définie du kit). La zone se déclare
   (`ZONE_TEMOIN`), le reste de Paris ne bouge pas, la couture entre les deux
   échelles est visible et DITE. Captures aux mêmes points de vue avant/après,
   appels de dessin, triangles, mémoire, sur l'iPad de la maison — c'est le
   rapport que le kit demande.
2. **Lille en second**, avec les familles bruxelloises que sa fiche demande
   (`brussels_townhouse`, `brussels_neoclassical`, `brussels_eclectic`) : plus
   petite, bâtie à la main, à l'échelle du dépôt depuis la v204.
3. **La généralisation** ne se décide qu'après ces deux-là, sur mesure : coût
   par morceau, cadence sur tablette, part du disque retramée.

Ce qui reste conceptuel tant que le quartier témoin n'est pas livré : tout ce
qui est au-dessus. Et une chose que ce document ne tranche pas, parce qu'elle
n'est pas à lui : **si Max préfère garder Paris entier à sa trame actuelle,
la bibliothèque ne s'y place pas, et la fidélité architecturale passe par la
couche HD (`facadeshd.js`) comme depuis la v287.** Les deux voies sont
écrites ; une seule sera bâtie.

