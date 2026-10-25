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

**La SF90 XX Stradale (octobre 2026)** — `ferrari-sf90-xx.glb`, fournie par
Max, remplace à l'affichage `ferrari-sf90.glb` (gardée sur le disque ;
l'identifiant `fichier` des sauvegardes ne change pas, le champ `asset` de
FLOTTE choisit le fichier chargé). C'est l'adaptation d'un modèle publié sous
licence **Creative Commons Attribution 4.0** (CC-BY-4.0), qui exige le crédit
ci-dessous, recopié tel quel de son `license.txt` (copie dans `docs/sf90-xx/`) :

> This work is based on "2023 Ferrari SF90 XX Stradale"
> (https://sketchfab.com/3d-models/2023-ferrari-sf90-xx-stradale-2c80c667232544649328cf3589921bcd)
> by Ddiaz Design (https://sketchfab.com/ddiaz-design) licensed under CC-BY-4.0
> (http://creativecommons.org/licenses/by/4.0/)

Modifications apportées à l'œuvre d'origine, toutes par
`scripts/ferrari-sf90-xx.py` (reproductible, empreintes du paquet dans
`docs/sf90-xx/SHA256.json`) :
- transformations cuites, puis posées au manifeste (mètres, +Z vers le nez,
  roues à y = 0) ; échelle uniforme sur l'empattement réel (2,650 m) ;
- maillages fusionnés par matériau (1 097 → 32), sommets identiques fusionnés,
  sommets inutilisés retirés ; aucune simplification : 262 651 triangles ;
- pièces de roue réparties en quatre pivots `Wheel_FL/FR/RL/RR`, étriers fixes ;
  volant (`Interior_SteeringWheel`) découpé dans l'habitacle ;
- matériaux renommés et simplifiés : couleurs de sommets, tangentes et second
  jeu d'UV retirés, spéculaire et transmission retirés (vitrages en
  transparence simple), cartes métal/rugosité remplacées par leur moyenne,
  vernis sur la laque ; 29 images d'origine recopiées octet pour octet.

Le modèle n'est affilié ni à Ferrari ni à Sketchfab ; marques et écussons
restent ceux du modèle d'origine. Portières non séparées — d'où
`portiere: false`. Même usage privé et familial.

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
