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
**Quarante-sept ont été retirés du jeu et du dépôt en v572** (Max : « les
voitures qui se ressemblent ») ; seuls restent `ferrari-sf90.glb`,
`lamborghini-revuelto.glb` et `porsche-911-gt3-rs.glb`, fichiers d'avant
chargés par `?asset=0` derrière leurs modèles neufs.

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

## La police et la moto (octobre 2026)

Deux modèles fournis par Max, publiés sous licence **Creative Commons
Attribution 4.0** (CC-BY-4.0), qui exige le crédit ci-dessous, recopié tel quel
de leur `license.txt` :

> This work is based on "Police car"
> (https://sketchfab.com/3d-models/police-car-9166b13b6ae341f4bfc093edb71d74f4)
> by Mateusz Woliński (https://sketchfab.com/jeandiz) licensed under CC-BY-4.0
> (http://creativecommons.org/licenses/by/4.0/)

> This work is based on "Harley-Davidson Police"
> (https://sketchfab.com/3d-models/harley-davidson-police-79dc00298bf449d7bcfdf6eb32bd15ac)
> by Comrade1280 (https://sketchfab.com/comrade1280) licensed under CC-BY-4.0
> (http://creativecommons.org/licenses/by/4.0/)

Fichiers : `police-car.glb` (la voiture de police) et `moto-police.glb` (la
moto). Modifications, toutes faites par `scripts/convertir-police.mjs`
(reproductible, les paquets bruts restent hors du dépôt) :
- mise au contrat de la flotte : mètres, +Z vers l'avant, roues au sol à
  y = 0, pivots `Wheel_FL/FR/RL/RR` (la moto : `Wheel_F`, `Wheel_R`) ; la
  voiture mise à l'échelle sur l'empattement réel (2,913 m) ;
- carrosserie fusionnée par matériau, maillages simplifiés (meshoptimizer,
  bords verrouillés), textures redimensionnées et recompressées ;
- vitrage et rampe passés d'une transmission à une transparence simple ; les
  feux de la rampe séparés en deux lentilles (`Gyrophare_G`, `Gyrophare_D`) ;
- la moto redressée de sa béquille (environ 7°) et privée de son socle de
  vitrine.
Aucune forme ni texture inventée : ce sont celles des auteurs. Le jeu n'a pas
d'écran de crédits ; s'il en a un un jour, ces modèles y entrent.

## Dix-huit modèles Sketchfab déposés par Max (octobre 2026, v566)

Dix-huit paquets glTF fournis par Max, mis au contrat de la flotte par
`scripts/convertir-flotte.mjs` (les paquets bruts ne sont pas versionnés ; le
script se rejoue dessus). Chaque paquet est publié sous une licence Creative
Commons qui **exige le crédit de son auteur** : le texte ci-dessous est recopié
tel quel de son `license.txt`. Plusieurs licences sont **non commerciales**
(NC) — ce jeu est privé et familial, sans revenu — et certaines **à partage
dans les mêmes conditions** (SA) : les fichiers convertis restent sous la même
licence que leur original.

Modifications apportées à chaque œuvre, toutes par le script : transformations
cuites dans la géométrie ; repère du jeu (mètres, +Y en haut, +Z vers le nez) et
mise à l'échelle sur l'empattement réel ; roues détectées par leur géométrie et
regroupées sous quatre pivots `Wheel_FL/FR/RL/RR` ; fusion par matériau ;
simplification par meshoptimizer (environ 90 000 triangles par voiture) ; textures
redimensionnées (1 024 px pour la carrosserie, 512 px ailleurs) et recompressées ;
cartes de normales, de rugosité et d'émission retirées ; la laque renommée
`Paint_Primary` et vernie ; pièces invisibles retirées (moteurs, câbles) selon
la fiche de chaque modèle ; sur le SUV de police, la rampe séparée en deux
lentilles `Gyrophare_G` / `Gyrophare_D`.

- `tesla-model-y.glb` — This work is based on "2025 Tesla Model Y" (https://sketchfab.com/3d-models/2025-tesla-model-y-619601e7800d418da5922c4fa7833f74) by BloxBloger (https://sketchfab.com/BloxBloger) licensed under CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/)
- `tesla-cybertruck.glb` — This work is based on "Tesla Cybertruck" (https://sketchfab.com/3d-models/tesla-cybertruck-f12e67159f75486bb21213e573520612) by Lexyc16 (https://sketchfab.com/Lexyc16) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- `aston-martin-victor.glb` — This work is based on "2020 Aston Martin Victor" (https://sketchfab.com/3d-models/2020-aston-martin-victor-c46e1668332d4de092eef421fd234662) by Ddiaz Design (https://sketchfab.com/ddiaz-design) licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)
- `aston-martin-db11.glb` — This work is based on "Aston Martin DB11 - Description" (https://sketchfab.com/3d-models/aston-martin-db11-description-81ca13960be6456aa9c26bb4bb124e4a) by Outlaw Games™ (https://sketchfab.com/Outlaw_Games) licensed under CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/)
- `alpine-a110-gt4.glb` — This work is based on "A110 GT4 | www.vecarz.com" (https://sketchfab.com/3d-models/a110-gt4-wwwvecarzcom-7dc988bfd038404c849566364a79b03c) by vecarz (https://sketchfab.com/heynic) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- `bentley-mulliner-batur.glb` — This work is based on "2023 Bentley Mulliner Batur" (https://sketchfab.com/3d-models/2023-bentley-mulliner-batur-fe97c93398a648cb96ef3acacea22a21) by Ddiaz Design (https://sketchfab.com/ddiaz-design) licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)
- `rolls-royce-ghost.glb` — This work is based on "Rolls-Royce Ghost" (https://sketchfab.com/3d-models/rolls-royce-ghost-4a590f4afa094fa8b407a14db77a63a8) by Black Snow (https://sketchfab.com/BlackSnow02) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- `gmc-hummer-ev.glb` — This work is based on "2024 GMC Hummer EV SUV" (https://sketchfab.com/3d-models/2024-gmc-hummer-ev-suv-7cd584fc9ba54acd9002d4286a08e419) by Ddiaz Design (https://sketchfab.com/ddiaz-design) licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)
- `chevrolet-camaro-ss-1967.glb` — This work is based on "1967 Chevrolet Camaro SS 350 Coupe" (https://sketchfab.com/3d-models/1967-chevrolet-camaro-ss-350-coupe-37ecedd9b5284cbfae74956eea2ad3fd) by Ddiaz Design (https://sketchfab.com/ddiaz-design) licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)
- `cadillac-escalade-esv.glb` — This work is based on "2015 Cadillac Escalade ESV" (https://sketchfab.com/3d-models/2015-cadillac-escalade-esv-57204780d10648c59ceb3021e6f66116) by Ddiaz Design (https://sketchfab.com/ddiaz-design) licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)
- `renault-fuego.glb` — This work is based on "Renault FUEGO" (https://sketchfab.com/3d-models/renault-fuego-37a0f282de1046a680dbde3664cebacd) by boitaloran (https://sketchfab.com/boitaloran) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- `porsche-cayenne-turbo-gt.glb` — This work is based on "2022 Porsche Cayenne Turbo GT" (https://sketchfab.com/3d-models/2022-porsche-cayenne-turbo-gt-74fbea5a4dfc4197839fdd2bf654369a) by Ddiaz Design (https://sketchfab.com/ddiaz-design) licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)
- `abt-audi-rs6-r.glb` — This work is based on "2020 ABT Sportline Audi RS6-R" (https://sketchfab.com/3d-models/2020-abt-sportline-audi-rs6-r-8efe6fd313234bef9b63c64293114dbf) by Ddiaz Design (https://sketchfab.com/ddiaz-design) licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)
- `porsche-992-gt3-r.glb` — This work is based on "2024 Porsche 992 GT3 R" (https://sketchfab.com/3d-models/2024-porsche-992-gt3-r-b76c9b2ae2d548c3869426eac4ab8a19) by Dave Love SketchFab (https://sketchfab.com/Tyler_Dave) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- `bugatti-divo.glb` — This work is based on "Bugati Divo" (https://sketchfab.com/3d-models/bugati-divo-dca375fefc65461d8a383172b235d0a9) by Jonrss (https://sketchfab.com/huy14320000006) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- `ford-f150-raptor-r.glb` — This work is based on "2024 Ford F-150 Raptor R" (https://sketchfab.com/3d-models/2024-ford-f-150-raptor-r-9fbd01c5acfb45e7a7bbdf4c8e2c4aa8) by VTX (https://sketchfab.com/VTX_car) licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/)
- `ford-mondeo-taxi.glb` — This work is based on "Ford Mondeo TAXI" (https://sketchfab.com/3d-models/ford-mondeo-taxi-8bc1c46fe0334d03a5eb927b6a129dc8) by TSB3DMODELS (https://sketchfab.com/TSB3DMODELS) licensed under CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/)
- `police-suv.glb` — This work is based on "Police car SUV" (https://sketchfab.com/3d-models/police-car-suv-3c00056ec42b4552804fe5f4e5af768f) by k26_k29 (https://sketchfab.com/John_Benoveth) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
