# Les avions déposés (vendor/avions/*.glb)

Quatre modèles fournis par Max (octobre 2026), adaptés au contrat des avions du
jeu par `scripts/convertir-avions.py` (voir son en-tête) : transformations
cuites, nez retourné vers −z, mise à l'échelle des postes de l'aéroport
(`GABARITS_AVION`, aeroport.js), primitives fusionnées par matériau, train et
verrière séparés en nœuds qui bougent, textures ramenées à 1 024 pixels,
matériaux simplifiés (aucune extension). Usage privé et familial, dans ce jeu
uniquement.

## `airbus-a320.glb` — CC-BY-NC-SA-4.0

> This work is based on "Airbus A320"
> (https://sketchfab.com/3d-models/airbus-a320-f65582ef4c9d4055bf6117aeee35b5a4)
> by OUTPISTON (https://sketchfab.com/outpiston) licensed under CC-BY-NC-SA-4.0
> (http://creativecommons.org/licenses/by-nc-sa/4.0/)

**Pas d'usage commercial, et partage dans les mêmes conditions** : le fichier
adapté de ce dépôt est lui aussi sous CC-BY-NC-SA-4.0. Modifications : retrait
des halos translucides des phares d'atterrissage et de roulage ; échelle
uniforme (0,4249 bloc par mètre, 16 blocs de long) ; facteur de couleur de la
livrée ramené à 1. L'archive n'a pas de train : le jeu en fabrique un
(`AVIONS_GLB.a320.trainAtelier`, avions.js), qui ne fait pas partie du fichier.

## `airbus-a321.glb` — CC-BY-4.0

> This work is based on "Airbus A321-232"
> (https://sketchfab.com/3d-models/airbus-a321-232-22721a53dabc4ca282fbda3b8cd7f030)
> by piggyrockstarYT (https://sketchfab.com/piggyrockstar15) licensed under
> CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

Modifications : retrait des yeux de dessin animé posés dans le cockpit, de
trois pièces posées de travers (une lame qui sortait de la dérive, deux qui
prolongeaient l'empennage) et de deux vérins de train qui traversaient l'aile ;
enroulement rétabli sur l'aile gauche, un plan fixe et une nacelle (normales à
l'envers dans l'archive) ; échelle ramenée à 16 blocs de long (les postes de
stationnement sont dimensionnés pour un avion de ligne de 16 blocs) ;
textures dédoublonnées.

## `chasseur-f35.glb` — CC-BY-4.0

> This work is based on "Lockheed Martin F35 Lightning II"
> (https://sketchfab.com/3d-models/lockheed-martin-f35-lightning-ii-db911de503c74285a8d506951df786d6)
> by andertan (https://sketchfab.com/andertan) licensed under CC-BY-4.0
> (http://creativecommons.org/licenses/by/4.0/)

Modifications : retrait des deux feux de bout d'aile (le jeu pose les siens) ;
roulette de nez extraite du fuselage et train principal séparés en jambes
repliables ; verrière séparée (elle bascule à l'embarquement) ; matière
translucide de la verrière rendue opaque sur les jambes de train ; extension
`KHR_materials_specular` retirée ; échelle ramenée à 10 blocs de long ;
simplification bornée de 81 000 à 38 000 triangles (`gltf-transform simplify`,
`--ratio 0.35 --error 0.0008`).

## `jet-prive.glb` — CC-BY-4.0 (v565)

> This work is based on "Luxury Private Jet 3D Model  Business Aircraft"
> (https://sketchfab.com/3d-models/luxury-private-jet-3d-model-business-aircraft-7fdfa52cb61a4ad09f0b218045400e9d)
> by pranavy94 (https://sketchfab.com/pranavy94) licensed under CC-BY-4.0
> (http://creativecommons.org/licenses/by/4.0/)

Modifications : rotation de présentation de l'archive retirée (l'appareil était
de travers dans la scène) ; échelle ramenée à 13 blocs de long, la proportion
d'un jet d'affaires à côté de l'A320 ; vitrage gris clair opaque rendu sombre ;
extensions `KHR_materials_clearcoat` et `KHR_materials_specular` retirées ;
simplification bornée de 45 000 à 36 000 triangles (`gltf-transform simplify`,
`--ratio 0.8 --error 0.0008`). L'archive n'a pas de train : le jeu en fabrique
un (`AVIONS_GLB.jet.trainAtelier`, avions.js), qui ne fait pas partie du
fichier.

Le jeu n'a pas d'écran de crédits : si un jour il en a un, ces quatre modèles
y entrent, comme ceux de `vendor/voitures/LICENSE.md`.
