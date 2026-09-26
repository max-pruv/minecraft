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

1. **État initial** (cette livraison) : la sonde, les captures, les mesures.
2. **Le sol continu** : rendu + contact + navigation hors villes, couture
   entre morceaux, eau, qualité basse identique. Preuve : zéro marche sur le
   parcours du pilote, empreintes de `plafond.js` intactes, maison sauvegardée
   posée au bloc près.
3. **Le couloir Paris–Lille** : registre des routes, profil, section,
   ouvrages, circulation interurbaine, entrées de ville, carte.
4. **Le rail continu et la gare accessible** : cote continue, quai à niveau.
5. **Les autres couloirs et villes**, par lots, avec la matrice de couverture.
6. **La fidélité architecturale** : registre unifié des quartiers, grammaires
   par ville, mobilier, végétation.

Ce qui reste conceptuel tant qu'une livraison ne l'a pas prouvé : tout ce qui
est au-dessous de la ligne 1.
