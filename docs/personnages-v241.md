# Personnages et voitures — v241

## Ce qui change

Les passants modernes et les avatars utilisent des anatomies articulées Microsoft Rocketbox, avec textures de visage, cheveux, vêtements et relief. Les costumes historiques restent ceux du jeu, avec des visages texturés adaptés. Les mains ont des doigts ; la marche plie les genoux et les coudes. Les accessoires, les gestes de métier et les pivots du réseau restent pilotables.

Les berlines new-yorkaises ont des surfaces cintrées, des passages de roue ouverts, pneus et jantes détaillés, vitres courbes, optiques, joints de portes, essuie-glaces, sièges et volant. La nouvelle berline citadine rejoint aussi la circulation des autres villes ; les voitures existantes restent dans le catalogue et les garages. Les taxis restent jaunes à New York. Les reflets du moteur sont maintenant raccordés aux matériaux des modèles construits par code. Les surfaces qui utilisent la sonde sont exclues pendant sa capture pour éviter une boucle de lecture/écriture WebGL.

## Présence continue

`src/presence.js` possède la visibilité des personnages : présence complète jusqu’à 80 m, fondu spatial entre 80 et 112 m, transitions temporelles sur 0,8 s. Un fondu alpha lisse évite les points de tramage visibles de près. Les corps pleinement présents retrouvent leur profondeur opaque. Chaque personnage possède son matériau de présence ; les textures restent partagées.

Tourner la tête ne recycle personne. Un passant ne peut être replacé qu’au-delà de 136 m, lorsque son fondu est complètement terminé. L’approche des rues suivantes ajoute progressivement des habitants, au plus quatre toutes les deux secondes, sans retirer les voisins proches. Le plafond est de 88 par ville visitée. Le peuplement compte les personnes dans le champ horizontal réel de la caméra ; celles hors du cadre ne font pas croire que la rue visible est déjà habitée. Les personnages continuent donc d’exister derrière le joueur lors d’un demi-tour.

Les volumes de visibilité sont calculés sur les corps articulés puis élargis de 40 cm pour couvrir leur foulée. Les boîtes statiques trop serrées des modèles importés ne coupent plus leurs membres animés. La simulation reste à chaque image près du joueur, à 15 Hz au-delà de 35 m et à 10 Hz au-delà de 80 m ; la présence est actualisée à chaque image.

## Assets, budget et reproduction

Source : [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox), révision `0943055db6ec570bcef9f2c8b41c9e5467c808f9`. Licence MIT, copyright Microsoft 2020, distribuée dans `vendor/humains/LICENSE.md`.

| Asset livré | Source Rocketbox |
| --- | --- |
| homme-chemise.glb | Adults/Male_Adult_01 |
| homme-veste.glb | Adults/Male_Adult_05 |
| femme-chemise.glb | Adults/Female_Adult_01 |
| femme-manteau.glb | Adults/Female_Adult_06 |
| homme-denim.glb | Adults/Male_Adult_12 |
| homme-costume.glb | Professions/Business_Male_02 |
| femme-tailleur.glb | Professions/Business_Female_02 |
| garcon.glb | Children/Male_Child_01 |
| fille.glb | Children/Female_Child_01 |

Les FBX/TGA ne sont pas distribués dans le jeu. La conversion conserve les poids du squelette, indexe les sommets et regroupe les triangles par matériau. Les cartes de visage font 1 024 px, les tissus, cheveux et normales 512 px. Les neuf GLB totalisent environ 8 Mio ; les corps contiennent 6 660 à 8 732 triangles, avec deux ou trois matériaux. Ils sont inclus dans le cache PWA v241.

Pour reproduire : télécharger les dossiers sources ci-dessus depuis la révision indiquée, garder leur arborescence `Assets/Avatars/…` et la licence à la racine, puis lancer depuis `scripts/` :

```sh
npm ci
node convertir-humains.mjs /chemin/rocketbox/Assets/Avatars ../vendor/humains
```

`vendor/SkeletonUtils.js` provient de three.js r160, sous MIT (voir `vendor/THREE_LICENSE`). Les taxis, leur géométrie et leurs décors sont originaux MIT. Les autres véhicules conservent leurs licences existantes.

Les instances partagent textures et géométries ; leurs squelettes sont indépendants. Créer un enfant ne modifie jamais la géométrie d’un adulte. Les textures de squelette et les matériaux privés sont libérés avec l’instance, y compris après les portraits du sélecteur.

## Validation

`cd tests && CHROMIUM_ANGLE=metal npm test` lance le portail. `realisme.js` couvre le demi-tour, le fondu, le voyage rapide, l’anatomie articulée, les genoux, les proportions enfant/adulte, le partage des ressources, les visages des costumes, les dimensions automobiles et la console. `manhattan.js` garde les interactions, les sauvegardes, les deux clients et le mode hors ligne. `monte.js` garde la vie des rues et la conduite.

Validation du 12 septembre 2026 sur Mac M3 Pro, Chromium avec ANGLE Metal :
portail complet vert (15 suites, plus la fumée). Les deux écarts initiaux de
variété automobile et de densité ont été corrigés puis leur suite rejouée :
11 modèles automobiles visibles et zéro arrêt vide, avec 9,13 passants dans le
cadre en moyenne sur le parcours. Les autres suites sont reprises par les
empreintes du portail quand leurs fichiers gardiens sont inchangés.

`tests/vitrine.html` présente les personnages ; `?taxi` présente la berline et `?walk` anime la marche. C’est un atelier de contrôle dans le même moteur, pas une carte distincte du jeu. Les captures de livraison incluent aussi le vrai jeu à hauteur de joueur.

## Limites

Il s’agit de modèles de jeu réalistes, pas de scans photoréalistes récents : sept silhouettes adultes et deux enfants se répètent ; les costumes historiques restent plus simples que les vêtements modernes. Les expressions du visage ne sont pas animées. Les teintes et accessoires des avatars restent interprétés sur les nouvelles anatomies.

Les voitures sont des interprétations originales de berlines, sans fidélité constructeur garantie. Leurs surfaces sont plus détaillées, mais les modèles n’atteignent pas la fidélité d’une production AAA. Les anciens modèles du catalogue ne sont pas tous remplacés. Les résultats mesurés sur cet ordinateur et en émulation tactile ne garantissent pas les performances sur un iPad physique.
