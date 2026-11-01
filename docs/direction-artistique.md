# Direction artistique permanente — réalisme et high fidelity

## Décision de référence

Max demande explicitement que le jeu abandonne complètement tout design qui
ressemble à Minecraft ou à du pixel art, et que **le rendu high fidelity soit
un principe de chaque édition future, partout dans le jeu**. Cette décision
est issue de la conversation de refonte des paysages et des animaux du
1er novembre 2026. Elle précise et généralise le programme « monde fidèle ».

Cette charte est normative pour les futures modifications. Elle prévaut sur
les anciennes recommandations graphiques qui toléraient un aspect cubique,
pixelisé ou grossièrement simplifié. Les descriptions historiques du moteur
et les constats de défauts ne constituent pas des exceptions à cette règle.

## Champ d'application

Le principe couvre les paysages, reliefs et falaises, sols et routes, eau,
végétation, animaux terrestres, oiseaux et poissons, personnages, véhicules,
bâtiments, monuments, accessoires, effets, illustrations et éléments visuels
de l'interface. Il vaut pour les modèles neufs et existants, toutes leurs
variantes, les animations, les vues proches et lointaines, les paliers de
qualité et les solutions de secours.

L'identité éducative et familiale du jeu reste compatible avec un monde
visuellement réaliste. Des commandes lisibles et des couleurs accueillantes
ne justifient pas un retour au pixel art dans le décor ou les personnages.

## Ce que signifie high fidelity

- **Géométrie :** silhouettes naturelles ou fidèles à l'objet réel, bonnes
  proportions, détails utiles à l'échelle du joueur, surfaces et raccords
  propres. Une anatomie doit être identifiable par sa forme, ses membres et
  son mouvement, avec des articulations plausibles.
- **Matières :** textures suffisamment détaillées à la distance de jeu,
  filtrage adapté, variations de surface crédibles, échelles cohérentes,
  transitions entre matières et réponse à la lumière appropriées. Employer
  les cartes de normales, de rugosité et les autres propriétés physiques
  lorsqu'elles améliorent le résultat.
- **Animation et contact :** appuis au sol, marche, nage et vol crédibles,
  déformations maîtrisées, absence de glissement et d'interpénétration
  visibles. Les roues suivent la surface que le joueur voit.
- **Cohérence :** un animal, un objet ou un paysage conserve son identité
  visuelle quand on s'approche, s'éloigne, change de caméra ou de palier.
  L'éclairage et les ombres restent cohérents de jour comme de nuit.

La qualité se juge sur le résultat visible dans le jeu. Une photographie
plaquée sur un cube, une collection de sphères et de cylindres reconnaissable,
un nombre élevé de polygones ou l'étiquette « HD » ne suffisent pas.
La génération procédurale reste possible si son résultat atteint ces critères.

## Résultats visuels à refuser

- Style Minecraft, voxels apparents employés comme esthétique, pixel art,
  textures à gros pixels ou motifs grossis visibles à la distance normale.
- Animaux ou personnages constitués de blocs, membres en bâtons, volumes
  grossiers et proportions artificielles tenant lieu d'anatomie détaillée.
- Facettes grossières, triangles déformés ou étirés, textures étirées,
  raccords carrés, marches de terrain artificielles, trous dans le paysage.
- Motifs de texture qui répètent visiblement la grille des blocs, coutures
  entre morceaux, scintillement ou changements brutaux de niveau de détail.
- Retour à un modèle cubique ou pixelisé pour le lointain, un appareil moins
  puissant, une animation, une panne de chargement ou un mode de secours.

Les triangles de triangulation, la structure voxel interne et les volumes
rectangulaires réellement présents dans un objet ne sont pas interdits.
Ils doivent produire une image fidèle ; cette charte ne se réduit donc pas
à interdire une classe de géométrie ou un mot dans le code.

## Performance et compatibilité

La fidélité visuelle et la fluidité sont deux exigences à satisfaire ensemble.
Prioriser le partage des géométries et textures, les instances lorsque cela
convient, le culling, le streaming, les budgets mémoire et des LOD préparés
avec soin. Réduire la densité ou la portée du détail en préservant des
silhouettes crédibles et des matières lisibles. Un palier bas conserve la
même direction artistique.

Un asset manquant ou trop lourd doit être remplacé par une solution conforme,
ou son intégration rester signalée comme inachevée. Un modèle provisoire
simpliste ne devient pas acceptable en étant nommé « secours » ou « optimisé ».
Les licences, crédits et conditions d'utilisation des sources restent respectés.

Les sauvegardes et les constructions existantes doivent être préservées.
Une refonte du terrain visible doit traiter ensemble rendu, collisions et
circulation. Une amélioration graphique ne doit pas masquer un mur invisible,
faire flotter les roues ou interrompre un passage auparavant praticable.

## Critères de revue pour chaque modification visuelle

Avant de considérer une modification comme terminée :

1. Examiner des captures ou une séquence du jeu réel, en taille d'affichage
   normale, de près et aux distances courantes. Utiliser les références
   artistiques pertinentes pour comparer formes, matières et proportions.
2. Vérifier les vues à pied et au volant lorsqu'elles sont concernées, ainsi
   que les transitions de distance, les animations, le jour et la nuit.
3. Vérifier les paliers et les états de chargement ou de secours concernés :
   aucune réapparition de l'esthétique Minecraft ou de pixels grossiers.
4. Vérifier les contacts, la circulation et les sauvegardes concernés, puis
   mesurer le coût graphique sur les appareils visés.
5. Déclarer les défauts restants dans `TASKS.md`. Des tests verts ou une
   amélioration relative ne permettent pas de déclarer le rendu photoréaliste
   si des écarts visuels restent présents.

La [revue d'écran](revue-ecran.md) complète ces critères. Choisir les vues et
les tests selon la zone modifiée ; une modification documentaire seule ne
nécessite pas de rejouer les suites de rendu.

## Situation héritée et travaux restants

La refonte nature et animaux (PR #588) est suspendue après une preview refusée
par Max : matières plaquées, ruptures carrées du terrain et faune incohérente
avec sa région. Elle doit être reprise avant publication. New York v583 améliore
les volumes et les façades ; son feuillage hérité et certains environnements
restent en dessous du niveau demandé. Aucune de ces livraisons ne permet
d'affirmer que le jeu entier est devenu photoréaliste.

Le suivi se trouve dans [TASKS.md](../TASKS.md). Cette charte fixe l'objectif
permanent ; elle ne prétend pas que la refonte graphique intégrale est achevée.
