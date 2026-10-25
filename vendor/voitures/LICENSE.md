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
