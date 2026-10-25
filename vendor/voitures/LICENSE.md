# La flotte de voitures (vendor/voitures/*.glb)

## Reconstruction 911 (octobre 2026)

`porsche-911-gt3-rs-hd-v2-compact.glb` est une reconstruction originale générée
par `scripts/porsche911-v2.py`, puis compactée sans perte par
`scripts/optimiser-glb.py` (mêmes triangles et textures, bit pour bit). Elle ne provient pas des archives
luxurycarfleet et ne réutilise pas leur géométrie. Les références visuelles
officielles sont listées dans `docs/porsche-911-rebuild.md` ; aucune photo ni
texture du constructeur n'est incorporée. Même destination privée et familiale,
sans affiliation avec Porsche. Le niveau de fidélité reste à valider.


Cinquante modèles fournis par Max (août 2026, archives
`luxurycarfleet` partie 1 à 3) pour la diversité des voitures à conduire.

Ce sont des **modèles paramétriques stylisés générés par code** — le
manifeste d'origine le dit expressément : « proportions, empattement,
couleurs et signatures suivent chaque véhicule réel, mais ce ne sont PAS
des reproductions photoréalistes des designs propriétaires. Prévus comme
placeholders homogènes […] à remplacer par des assets licenciés pour la
production. »

Usage : privé et familial, non commercial, dans ce jeu uniquement.

**Deux modèles de plus, d'une autre provenance (septembre 2026)** —
`lucid-gravity.glb` et `bugatti-chiron-stealth.glb`, fournis par Max. Ils NE
suivent PAS le manifeste ci-dessous : maillages quantifiés
(`KHR_mesh_quantization`), chaque roue éclatée en huit nœuds — un par
matériau — aucun matériau nommé `Paint`, et le nez sur un autre axe. C'est
`normaliserVoiture` (vehicules.js) qui les remet au contrat À L'EXÉCUTION,
en les MESURANT : elle ne touche à rien quand le manifeste est déjà respecté,
pour que les cinquante d'origine ne changent pas d'un pixel. Même usage privé
et familial.

**La Maserati MC12 GT1 Red Bull (octobre 2026)** — `maserati-mc12-gt1.glb`,
fournie par Max, entre dans la flotte (une voiture de plus, rien de remplacé).
C'est l'adaptation d'un modèle publié sous licence **Creative Commons
Attribution 4.0** (CC-BY-4.0), qui exige le crédit ci-dessous, recopié tel quel
du `license.txt` du paquet :

> This work is based on "2005 Maserati MC12 GT1 Redbull"
> (https://sketchfab.com/3d-models/2005-maserati-mc12-gt1-redbull-f5e55567ced04ef78b2386fcb7637410)
> by Dave Love SketchFab (https://sketchfab.com/Tyler_Dave) licensed under
> CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

Modifications apportées à l'œuvre d'origine, toutes par
`scripts/convertir-mc12.py` (le paquet glTF n'est pas versionné ; le script se
rejoue sur lui) :
- transformations de la racine Sketchfab cuites dans la géométrie, roues
  posées à y = 0 (+0,032 m) ; aucun sommet déplacé par rapport aux autres,
  aucune simplification ni subdivision (161 346 triangles) ;
- roues découpées par la position de leurs triangles en quatre pivots
  `Wheel_FL/FR/RL/RR` (pneu, bande de roulement, jante, disque), étriers fixes ;
- volant (jante, moyeu, palettes, boutons) séparé dans `Interior_SteeringWheel`
  par pièces entières ;
- le flou de jante (`WHEEL_BLUR_RIM`, opacité nulle dans le paquet) retiré ;
- `KHR_materials_specular` retiré (la texture de reflet des étriers avec),
  cartes de normales à échelle nulle retirées, `KHR_texture_transform` de la
  livrée cuit dans les UV, matériaux identiques fusionnés (sauf feux, vitrages,
  rétroviseurs et laque, qui gardent leur nom), laque renommée `Paint_RedBull`
  et réglée métal 0,15 / rugosité 0,3 au lieu de 0,8 / 0,15 (la livrée sortait
  noire dans le jeu, sans le studio d'éclairage de Sketchfab) ;
- images unies remplacées par une couleur (sans perte) ; trois images de
  2 048² réduites à 1 024² ; les autres recopiées.

SHA-256 du fichier livré : `63439db6274857499d306547f657d7d8a21aa9d4267e0c092899f931937a7b63`. Le modèle n'est affilié ni à Maserati, ni à
Red Bull, ni à Sketchfab ; les marques et logos de la livrée sont ceux de la
voiture de course réelle, reproduits par l'auteur du modèle. Même usage privé et
familial.

**La Revuelto adaptée (octobre 2026)** — `lamborghini-revuelto-wip.glb`,
fournie par Max, remplace à l'affichage `lamborghini-revuelto.glb` (gardée sur
le disque ; l'identifiant `fichier` des sauvegardes ne change pas, le champ
`asset` de FLOTTE choisit le fichier chargé). Ce n'est PAS un modèle
paramétrique : c'est l'adaptation d'un modèle publié sous licence
**Creative Commons Attribution 4.0** (CC-BY-4.0), qui exige le crédit
ci-dessous, recopié tel quel de son `ATTRIBUTION.txt` :

> This work is based on "Black Lamborghini_revuelto"
> (https://sketchfab.com/3d-models/black-lamborghini-revuelto-1a00d7d7fea6492bb960ec595cf79464)
> by BRO (https://sketchfab.com/musawork786) licensed under CC-BY-4.0
> (http://creativecommons.org/licenses/by/4.0/)

Modifications apportées à l'œuvre d'origine (paquet de Max, puis ce dépôt) :
- normalisation uniforme de l'échelle sur l'empattement (2,779 m) ;
- transformations « cuites » dans la géométrie, aucune simplification ni
  subdivision ;
- pivots de roue (`Wheel_FL/FR/RL/RR`) et de volant (`Interior_SteeringWheel`)
  indépendants, étriers fixes ;
- réglage des matériaux, textures d'origine restaurées (sept images) ;
- dans ce dépôt : aucune modification du fichier ; le jeu le pose au manifeste
  à l'exécution (`normaliserVoiture`, rotation π) et repeint sa laque comme
  celle de la flotte.

Travail en cours de l'aveu même du paquet (jointures de panneaux, habitacle,
longueur 4,739 m contre 4,947 m réels, portières non séparées — d'où
`portiere: false`). Le modèle n'est affilié ni à Lamborghini ni à Sketchfab.
Le visualiseur three.js du paquet n'est pas repris. Les rendus et le rapport de
fabrication sont dans `docs/revuelto/`. Même usage privé et familial.

Caractéristiques communes (héritées du manifeste, le code s'y fie) :
- unités en mètres, +Y vers le haut, **+Z vers le nez**, origine au centre
  du corps, roues posées à y = 0 — d'où la rotation π unique au chargement ;
- vitrage `Glass_Windows` déjà en alpha BLEND ;
- nœuds nommés : `Body_PrimaryPaint`, `Body_SecondaryPaint`,
  `Carbon_Exterior`, `Chrome_Trim`, `Lights_*`, `Wheel_FL/FR/RL/RR`
  (pivots), `Interior` (Tub, Dashboard, SteeringWheel, Seats…) ;
- 37 à 46 mille triangles par voiture, ~1,6 Mo par fichier.

Ces fichiers ne sont **pas** dans la liste `ASSETS` du service worker :
ils passent par le `STATIC_CACHE` (téléchargés à la première rencontre,
gardés à travers les mises à jour), comme les modèles du scanner de
visages — 83 Mo re-téléchargés à chaque livraison auraient tué la cadence.
