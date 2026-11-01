# Manhattan : volumes issus du modèle OSM

Les immeubles ordinaires avaient tous une emprise presque identique, sans cour
ni retrait, avec une hauteur tirée au hasard. Le nouveau tissu utilise un atlas
de silhouettes extraites du modèle fourni par Max. Les maisons basses, les
lofts, les résidences à cour et les tours ne sont plus le même cube repeint.

## Source et attribution

This work is based on **[Manhattan OSM Complete Model](https://sketchfab.com/3d-models/manhattan-osm-complete-model-bad7b7c7c6a64febb83950c24fee4d00)**
by **[MENUDQ2](https://sketchfab.com/noahquintana9)**, licensed under
**[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**.

Le fichier fourni contient `scene.gltf`, `scene.bin` et `license.txt`.
Le modèle est présenté comme issu d'OpenStreetMap : © les contributeurs
[OpenStreetMap](https://www.openstreetmap.org/copyright), données sous ODbL.
Le crédit CC BY et la provenance OSM accompagnent l'atlas dérivé.

Cette refonte reprend la PR #587 : ses dix quartiers périphériques, ses modèles
de l'Empire State Building et de la Liberté, ainsi que ses textures restent
présents. Les façades photographiques proviennent de **New York Buildings**,
par **sumitmangela**, également sous CC BY 4.0 : c'est la seconde archive fournie
par Max, déjà convertie dans cette PR. Les attributions complètes et les
transformations figurent dans [vendor/newyork/LICENSE.md](../vendor/newyork/LICENSE.md).
Les photographies de façades restent utilisées par les modèles hérités ; les
immeubles OSM utilisent une architecture en relief, décrite ci-dessous. Les
modèles pleins CCity restent dans les quartiers périphériques : ils ne remplacent
pas les bâtiments OSM, dont ils boucheraient les cours et les retraits.

Transformations réalisées : extraction des composantes géométriques, rotation
du plan de 29°, sélection par quartiers, rasterisation des toits en 12 × 12,
quantification des hauteurs, puis adaptation aux parcelles du jeu. Les sources,
empreintes SHA-256, effectifs et distributions sont conservés dans
[le rapport d'extraction](manhattan-osm-extraction.json).

## Ce qui change dans le jeu

- Huit traitements de façade : brownstone, tenement, loft, cour, résidence,
  Art déco, tour vitrée et tour à retraits. Les travées, pilastres, corniches,
  vitrines et escaliers de secours varient avec le traitement.
- Les façades OSM proches ont de vraies embrasures : verre transparent en
  retrait, fond à 48 cm derrière la vitre, tableaux de maçonnerie, châssis,
  appuis et linteaux. Corniches à trois profils, pilastres, rideaux et certains
  balconnets en ferronnerie sont des volumes distincts, avec leur parallaxe.
  Les balconnets sont des garde-corps décoratifs, sans plancher praticable.
  La brique mesure environ 20 × 7,5 cm ; pierre et bois ont leurs propres
  textures, rugosités et microreliefs. Aucune photo de façade entière ne couvre
  un bâtiment OSM, même au loin : les baies distantes sont simplifiées en 3D.
- De une à trois parcelles par îlot au nord de la 14e Rue, avec des façades
  allant jusqu'à 28 unités. Le réseau plus serré du sud garde ses petites
  parcelles afin que les bâtiments ne coupent pas les rues tournées.
- Chaque quartier utilise ses propres profils. Les distributions du modèle
  donnent un Village plus bas, et des concentrations de tours à Midtown et
  dans le Financial District. Les hauteurs ne sont plus tirées indépendamment
  de la morphologie du bâtiment.
- Les cours, ailes et terrasses sont partagées par les collisions, les façades
  proches, les toitures et les silhouettes lointaines. Les volumes lointains
  sont fusionnés par rectangles de hauteur égale, sans remplir les vides.
- Les équipements de toit sont posés sur une terrasse réelle. Les commerces
  et escaliers de secours s'accrochent à une façade existante.
- La nuit, les fonds des fenêtres OSM s'allument derrière les vitres. Sur les
  modèles photographiques conservés, les baies repérées s'allument sans éclairer
  les ombres d'escaliers. Les dix variantes suivent le même cycle.
  Les masques se régénèrent avec `node scripts/new-york-fenetres.mjs vendor/newyork`.

## Échelle et géographie

Il s'agit d'une **adaptation compacte**, pas d'une reconstruction cadastrale.
L'atlas est échantillonné par quartier, puis les silhouettes sont adaptées aux
lots jouables : un bâtiment n'est pas nécessairement à son adresse OSM exacte.
Les rues, les berges, Central Park, les monuments et les coordonnées des
sauvegardes conservent le plan existant. Les hauteurs sont celles du **modèle**,
qui ne fournit pas les tags OSM permettant de distinguer une mesure d'une
estimation. Elles ne sont donc pas présentées comme des relevés certifiés.

Le joueur reste haut de 1,8 unité et les adultes de 1,76. Les véhicules gardent
leurs dimensions existantes ; les bâtiments s'adaptent à cette échelle de jeu.
Les étages font trois unités, donc le joueur peut circuler à l'intérieur. Pour
les bâtiments bas, 1 m du modèle devient 0,65 unité ; au-dessus de 36 m, les
hauteurs supplémentaires se compriment à 0,22 unité/m. Le sommet est arrondi
à un étage et plafonné à 108 unités au-dessus du sol urbain, sous le plafond
du monde. Cette fonction est la même dans tous les quartiers et monotone.

Le champ de chaque bâtiment est découpé contre **toutes** les colonnes de rue,
de place et d'eau : tester seulement les quatre coins ne protège pas Broadway.
Le relief et les données des joueurs restent en place. Une construction
antérieure à la refonte conserve tout son immeuble ordinaire v582, y compris
son toit : `manhattan-avant-osm.js` est le relevé immuable de main 7cb7a4b,
et `manhattan-historique.js` sélectionne les volumes nécessaires par monde.
Le proche, le lointain et la collision les partagent ; les nouveaux volumes
qui les chevaucheraient sont écartés. Les importations Terre/legacy gardent
leurs protections existantes.

## Régénérer l'atlas

Le modèle complet (environ 307 Mo de géométrie) reste hors du dépôt et n'est
jamais téléchargé par le jeu. L'atlas JavaScript fait moins de 200 Ko et figure
dans le cache hors ligne du service worker.

Avec Python 3, NumPy et SciPy disponibles, depuis la racine du dépôt :

```sh
python3 scripts/extraire-manhattan-osm.py /chemin/du/modele/scene.gltf
```

Un cache de travail optionnel, contrôlé par l'empreinte des deux fichiers source,
peut être ajouté avec `--cache /tmp/manhattan-composantes.npz`. L'importeur lit
les coordonnées OSM brutes ; les matrices de présentation Sketchfab changent
l'échelle d'affichage de l'objet, elles ne définissent pas les mètres OSM.

## Vérifier

```sh
node --test tests/architecture-manhattan.mjs
cd tests
npm run manhattan
npm test
```

Le contrat d'architecture est aussi lancé par la suite Manhattan. Il vérifie la
provenance, les quartiers, la diversité, les cours, les limites de hauteur, la
cohérence du lointain, l'absence de murs sur la chaussée, les 79 circuits de
l'île et les 48 circuits des quartiers périphériques.
La suite navigateur vérifie notamment la profondeur des fenêtres par lancer
de rayons, les collisions, la destruction visible, les sauvegardes, les taxis,
les joueurs et le démarrage hors ligne.

Le rendu demeure stylisé et voxelisé. Les captures sur Chromium avec SwiftShader
ne mesurent ni Safari ni les performances sur un iPad physique.
