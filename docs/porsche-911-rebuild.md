# Porsche 911 GT3 RS (992) — deuxième reconstruction approuvée

**Rendu approuvé par Max le 24 octobre 2026.** Le niveau visuel de cette version
sert désormais de référence au [standard de création des voitures](standard-creation-voitures.md).
Les validations techniques dans le jeu restent à effectuer avant publication.

Le modèle a été entièrement reconstruit avec `scripts/porsche911-v2.py`.
Le générateur ne lit ni le GLB de production, ni celui de la première proposition.
Les profils et les pièces sont créés à partir de coordonnées originales ; les
photos publiques servent de référence visuelle. Ce n'est pas une CAO constructeur.

## Travail réalisé

- Nouveaux profils de caisse, empattement de 2,457 m, galbe des épaules et des ailes,
  passages de roue ouverts et pare-chocs avec prises d'air en retrait.
- Pavillon et vitrages reconstruits, montants raccordés, joints, poignées,
  rétroviseurs et découpes de porte.
- Phares inclinés à quatre modules, lentilles, réflecteurs et bandeau arrière.
- Extracteurs de capot, ouïes d'ailes, splitter, diffuseur, échappements creux,
  aileron à deux profils et supports en col-de-cygne.
- Jantes à branches doubles, écrou central, disques percés, étriers fixes,
  pneus profilés et marquages de flanc.
- Baquets, harnais, arceau, volant animé, compte-tours et écran central.
- Peinture PBR vernie, vitrage transparent, carbone avec texture normale.
  Quatre PNG originaux embarqués : atlas des marquages/instruments, pneus,
  couleur carbone et relief carbone. Aucune texture externe téléchargée.

Le blason et la typographie sont dessinés dans le générateur ; ce ne sont pas
des décalcomanies officielles. La mention de diamètre de pneu est commune aux
quatre roues dans l'atlas, tandis que les dimensions géométriques avant/arrière
diffèrent. Ce détail et la fidélité des raccords demandent encore une revue.

## Résultat mesuré et limites

362 868 triangles, 40 maillages, quatre textures PNG. Le fichier approuvé initial
faisait 11 602 448 octets ; sa version compactée sans perte fait 7 736 576 octets
(1 846 624 octets en Brotli ou 3 453 103 octets en gzip ; transfert à configurer). Voir
[les mesures et preuves](voitures-poids-et-compression.md).
Les pièces sont fusionnées par matériau et par pivot. La densité est élevée ;
aucune performance en circulation dense ou sur iPhone/iPad n'est revendiquée.
Ce modèle n'est pas présenté comme une reproduction photoréaliste validée.

Les rendus fournis montrent directement ce GLB dans un moteur OpenGL ES de
contrôle : éclairage studio, ombres, textures et faces arrière masquées.
Ce sont des rendus de revue, pas des captures du jeu. Le visualiseur HTML
utilise, lui, la version Three.js r160 du dépôt ; il reste à vérifier en navigateur.

## Intégration préparée

`FLOTTE.fichier` conserve la clé `porsche-911-gt3-rs.glb` pour les garages et le
réseau. Le champ facultatif `asset` sélectionne le nouveau fichier
`porsche-911-gt3-rs-hd-v2-compact.glb` avec `asset || fichier`, afin de renouveler l'URL
stockée dans STATIC_CACHE. Les quatre signatures de matériaux supplémentaires
sont ajoutées au préchauffage. Garder le GLB historique pour les anciens clients.

Les nœuds `Wheel_FL/FR/RL/RR` restent indépendants ; les étriers sont hors des
pivots tournants. Le volant garde le nom `Interior_SteeringWheel`.

## Reproduire et tester

Python 3, NumPy, SciPy, Pillow et polices DejaVu Sans sont nécessaires pour
régénérer le modèle. Le jeu n'a besoin que du GLB, sans Python.

```bash
python3 scripts/porsche911-v2.py
cd tests && node degats.js   # témoins de tests/porsche-911.mjs
python3 -m http.server 8000
```

Ouvrir `http://localhost:8000/docs/porsche-911-preview.html` pour tourner autour
du modèle, zoomer, examiner le profil et afficher le maillage.

Les tests ciblés vérifient le vrai GLTFLoader du dépôt, les index et coordonnées,
le budget de fichier, le contact et la rotation des roues, le préchauffage,
l'identité persistée, les portières et les matériaux/textures. Sous Node, un
adaptateur décode réellement les PNG vers des DataTexture : il remplace seulement
le chargement d'images du navigateur, pas le chargement des géométries.

Le portail `npm test` reste bloqué par l'absence d'Express ; l'installation du
navigateur a également échoué en HTTP 403. Avant publication, exécuter le portail
complet et la revue jour/nuit sur mobile, mesurer les performances et attribuer
la prochaine version libre avec CACHE_VERSION et nouveautes.js selon CLAUDE.md.

## État du dépôt distant

Les fichiers d'intégration sont préparés localement. Aucune branche, PR ou version
de production n'a été modifiée : GitHub a refusé la création de branche avec
`403 Resource not accessible by integration`. La PR #539 est inchangée.

## Références visuelles

- [Présentation officielle Porsche de la 992 GT3 RS](https://newsroom.porsche.com/en/2022/products/porsche-911-gt3-rs-world-premiere-29177.html)
- [Galerie officielle Porsche](https://newsroom.porsche.com/en_US/model-range/911/911-GT3-RS.html)

Les photographies restent sur le site constructeur et ne sont pas redistribuées.
Destination privée et familiale du projet ; aucune affiliation avec Porsche.
