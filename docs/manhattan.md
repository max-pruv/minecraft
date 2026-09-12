# Manhattan appartient à la Terre

Il existe une seule carte. **Explorer New York** ouvre Manhattan dans la Terre,
avec les mêmes outils, personnages, créatures, véhicules et règles éducatives.
L'adresse `/?lieu=manhattan` choisit simplement le point d'arrivée. Les anciens
liens `?carte=manhattan` sont encore compris. Une partie partagée utilise un seul
code, que les joueurs soient à New York, Paris ou ailleurs.

## Architecture et vie urbaine

L'île comprend environ 2 000 bâtiments, des quartiers de Battery à Washington Heights, Broadway, Central
Park et ses promenades. Le plan est comprimé horizontalement à 40 % de celui de
v239 pour tenir à New York sans atteindre les disques de Boston, Montréal ou
Washington. Les hauteurs gardent leur échelle jouable. L'origine terrestre est
calculée par `positionDe('ny')`, jamais recopiée dans les systèmes du jeu.

L'Empire State a une base à retraits, une longue tour centrale, une terrasse
au 86e, un couronnement et une antenne. Dix volumes sont partagés entre ses
collisions et ses deux niveaux de rendu. Chrysler a une couronne métallique
à sept arcs et une flèche ; Rockefeller conserve sa silhouette en dalle.
Grand Central, Flatiron, One World Trade Center et Trinity restent visitables.

Au sud de la 14e Rue, le Village, SoHo, TriBeCa et Chinatown retrouvent des
trames distinctes. Leurs rues tournent avec le quartier et les trajets suivent
ces rotations ; vingt circuits desservent le sud de Manhattan. Les destinations
de la carte sont recalées sur le nouveau plan.

Times Square réunit One Times Square couvert d'écrans, une place piétonne,
les marches rouges de Duffy Square, tables et chaises, enseignes orientées vers
la place et une voie de circulation à l'ouest. Les campagnes publicitaires
sont fictives et dessinées dans le jeu. Jusqu'à 88 passants sont distribués
sur les trottoirs et dans les places de New York. Leur marche respecte les
espaces piétons ; le modèle des humains et des avatars est amélioré partout,
avec membres galbés, visages, chemises, vestes et sacs.

Les 79 circuits automobiles ont été sondés sur toute la largeur de la
carrosserie. À New York, ils utilisent une berline noire et un taxi jaune
inspiré des proportions de la Ford Crown Victoria : pavillon, quatre roues,
arches, calandre, feux, vitres, habitacle, marquages et voyant de toit. Le modèle
reste le même après la prise du volant et le rangement dans un garage.
Il s'agit d'une interprétation originale, pas d'un modèle constructeur ou
d'une flotte contemporaine exhaustive : la Crown Victoria est un taxi historique.

## Façades, matériaux et éclairage

Les fenêtres ont des embrasures géométriques, encadrements et appuis. Corniches,
portes, commerces, escaliers de secours, ventilation et réservoirs occupent de
vrais volumes. Les matériaux de brique, pierre, verre, métal, asphalte et
pavage utilisent rugosité, micro-relief et éclairage physique. Les tours
lointaines sont simplifiées ; les bâtiments proches restent éditables.

Le cycle du jeu commande l'éclairage, les ombres et les fenêtres. La nuit,
lampadaires et écrans éclairent les abords de Times Square. Les reflets des
façades utilisent un environnement préfiltré ; les voitures conservent le
système de reflet du jeu. La pluie modifie la rugosité des chaussées. En
quittant Manhattan, le rendu restaure les réglages de la Terre.

## Protection et reprise des constructions

`TerreUrbaine` étend `World` sans modifier son générateur historique. Le nouveau
terrain est limité au rectangle local x ∈ [−240,240), z ∈ [−1300,1000).
Hors de cette zone, la Terre conserve son relief. Une construction ancienne
sur la Terre conserve ses coordonnées et les colonnes du terrain historique
sous elle, avec une marge de deux blocs ; les bâtiments procéduraux qui
recouvriraient ces colonnes sont retirés.

Les journaux `manhattan-v1:local` et `manhattan-v1:<code>` sont repris par
translation entière vers New York, sans réduire les blocs. Si une case cible
est occupée, tout le journal est décalé ensemble de 4096 blocs vers l'est
jusqu'à trouver un emplacement libre (256 essais au maximum). Si aucun n'est
libre, l'archive demeure intacte et n'est pas importée. Les anciens journaux
sont conservés. Les blocs importés reçoivent un support à la cote 32 ; cette
protection peut donc aussi créer des colonnes de support hors de Manhattan.
Les volumes procéduraux de l'ancienne ville ne sont pas intégralement copiés.

La provenance `[bloc, date, type]` voyage avec les blocs : type 0 pour la
nouvelle Terre, 1 pour l'ancienne Terre, 2 pour l'ancienne Manhattan. Les
marques d'import sont stockées dans le même document, dans la même écriture
atomique. Elles survivent à l'effacement explicite d'une partie pour éviter
qu'un ancien journal ressuscite. Un quota local dépassé laisse les archives
originales intactes ; l'import peut être recommencé sans journal partiellement
validé. Les profils restent isolés par le stockage existant.

Les archives du profil et du cloud de partie sont reprises. Les positions
anciennes locales ou reçues du cloud sont translatées ; un voyage explicite vers New York a
priorité sur la restauration initiale. Les versions antérieures à v240
continuent de voir leur propre carte : mettre à jour tous les appareils avant
de construire ensemble dans Manhattan.

## Budgets et vérifications

| Réglage | Détails proches | Silhouettes | Secteurs proches | Ombres | DPR maximum |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ordinateur | 78 blocs | 1400 blocs | 20 | 2048 | 1,75 |
| Tablette | 52 blocs | 780 blocs | 12 | 1024 | 1,25 |

La distance choisie dans le jeu peut réduire ces budgets. Les primitives et
matériaux sont partagés, les détails instanciés, les façades construites par
tranches de 4 ms et remplacées progressivement par les silhouettes.

Validation reproductible :

```sh
cd tests
CHROMIUM_ANGLE=metal node manhattan.js
CHROMIUM_ANGLE=metal npm test
```

Les 30 contrôles Manhattan couvrent le relief hors zone, les supports sauvegardés,
les conflits et répétitions d'import, la position d'un chantier déplacé, le cloud ancien, les échanges Terre/New
York, les collisions, l'édition visible, les contrôles tactiles, les taxis,
l'anatomie, le rechargement, les quiz, l'alignement soleil/ombres et la PWA hors ligne. Le portail conserve
les empreintes historiques : elles ne sont pas remplacées pour accepter la refonte.
Le portail complet est vert : quatorze suites et la fumée. Les contrôles
réseau, visio, parental, réglages, carte, conduite/vol, Washington, terrain,
sauvegarde, PWA, métro, géographie, hôte et Manhattan passent. Les 4 040 colonnes
historiques de référence restent intactes ; une sauvegarde de 40 000 blocs est
récupérée intégralement sur un second appareil.
Les captures au sol et en hauteur servent à juger l'aspect ; un portail vert
ne démontre jamais à lui seul la qualité graphique.

## Références et licences

Références consultées et inspectées visuellement :

- [Empire State Building, site officiel](https://www.esbnyc.com/about/facts-figures) : silhouette, retraits, terrasse, mât ; 443 m avec antenne, toit vers 381 m.
- [Times Square Alliance, écrans et place](https://www.timessquarenyc.org/business-community/advertisement-sponsorships) : One Times Square face au nord, écrans enveloppants, place et abords des marches rouges.

Les photographies de référence restent la propriété de leurs auteurs. Elles
ne sont pas distribuées comme assets du jeu. Architecture, matériaux,
publicités fictives et nouvelles berlines sont originaux et couverts par
[la licence des assets urbains](manhattan-assets-license.txt). Les assets
existants gardent leurs licences, notamment l'usage privé/familial des voitures
fournies dans `vendor/voitures/LICENSE.md`. Aucun asset de GTA n'est utilisé.

## Limites connues

Cette version reste stylisée, avec une géographie comprimée et des collisions
voxelisées ; elle ne revendique pas une fidélité AAA. Les tours génériques se
répètent, le passage au détail distant est perceptible, les berges rencontrent
le terrain mondial à une limite visible et les intérieurs sont peu aménagés.
Les feux ne commandent pas encore les convois ; les voitures ralentissent
selon le système existant et ne négocient pas toutes les priorités. Les écrans
sont lumineux mais leurs publicités sont fixes. Les monuments secondaires,
les ponts et la Statue de la Liberté demandent une passe supplémentaire.
Un iPad physique reste nécessaire pour mesurer Safari et la pression mémoire.
Deux imports simultanés hors ligne dont les journaux Terre diffèrent peuvent
choisir des emplacements de secours différents ; les archives conservées
permettent la récupération, mais ces chantiers nécessitent une réconciliation.

Les modèles humains, les voitures et les transitions de présence ont été repris en v241 : voir [le guide personnages et voitures](personnages-v241.md).
