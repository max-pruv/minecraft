# Standard de création des voitures

## Référence approuvée par Max

Le 24 octobre 2026, Max a approuvé le rendu de la deuxième reconstruction de la
Porsche 911 GT3 RS (992) : « OK, c'est correct, j'approuve. » Il a demandé de
formaliser ces attentes pour les prochaines voitures.

Référence : `vendor/voitures/porsche-911-gt3-rs-hd-v2.glb`, générée par
`scripts/porsche911-v2.py`. SHA-256 :
`c929874f70ce67e56dddea1d94d76ed187dbdb9596549ee266c95507e07c360f`.
Les vues approuvées sont conservées dans `docs/references/porsche-911-approved/`.
Ce niveau de soin constitue le minimum visuel attendu, pas une certification
photographique, dimensionnelle ou de performance. L'approbation porte sur le
rendu présenté ; elle ne remplace pas les contrôles dans le jeu.

**Lire ce document avant de commencer une voiture.** Une voiture reconnaissable
seulement par sa couleur, son nom ou ses accessoires ne répond pas à la demande.

## Construire à partir de la voiture réelle

- Identifier le modèle, la génération et la version exacte. Pour « dernière
  génération », vérifier la gamme constructeur actuelle et annoncer le choix.
- Réunir des références constructeur de face, profil, arrière et habitacle.
  Relever longueur, largeur hors rétroviseurs, hauteur, empattement, voies et
  dimensions de roues quand elles sont disponibles. Conserver les sources.
- Construire une géométrie indépendante. Le placeholder de production ne sert
  pas de base de forme ou de proportions. Les outils génériques de maillage,
  d'export et de contrôle peuvent être réutilisés.
- Ne pas transformer une autre voiture en changeant seulement le nez, les feux
  et le badge. La caisse, la baie vitrée, les passages de roue et l'habitacle
  doivent correspondre au nouveau modèle.

## Attentes visuelles

| Sujet | Résultat attendu | Défaut à corriger avant présentation |
| --- | --- | --- |
| Proportions | Silhouette, empattement, porte-à-faux, largeur, toit et roues cohérents avec les références | Caisse générique, toit trop haut, petites roues, essieux déplacés |
| Carrosserie | Volumes sculptés, courbes continues là où la vraie tôle l'est, arêtes placées selon le modèle | Flancs en boîte, bosses artificielles, raccords cassés, surfaces qui flottent |
| Vitrages | Pare-brise, custodes et montants raccordés au pavillon ; transparence lisible | Vitres peintes sur une caisse pleine, trous entre montants, intérieur vide visible |
| Optiques | Forme spécifique, implantation affleurante, lentilles et éléments internes lisibles | Disques posés sur la carrosserie, feux flottants ou simples points lumineux |
| Roues | Pneus profilés, jantes propres au modèle, disques et étriers ; contact au sol correct | Cylindres simples, freins absents, roues qui traversent les ailes |
| Aérodynamique | Prises d'air avec profondeur, lames, diffuseur et aileron conformes à la version | Fausses entrées d'air plates, accessoires génériques ou surdimensionnés |
| Habitacle | Sièges, volant, planche de bord, console et instruments visibles aux bons endroits | Habitacle vide, conducteur qui dépasse du toit, volant mal orienté |
| Matières | Peinture vernie, carbone, caoutchouc, métal et verre distincts sous le même éclairage | Plastique uniforme, reflets qui masquent les défauts, noir sans lecture des volumes |
| Petits détails | Joints, poignées, rétroviseurs, marquages, échappements et éléments de freinage | Détails ajoutés seulement à l'image d'aperçu, texte inversé ou flottant |

Les détails se construisent après la silhouette. Augmenter le nombre de triangles
ne corrige pas les mauvaises proportions. Les marquages ou écussons approximatifs
restent signalés comme tels ; ne pas revendiquer une exactitude non vérifiée.

## Séquence de travail et présentation

1. Fixer les cotes et construire les volumes principaux. Contrôler la face,
   le profil et l'arrière avant de détailler.
2. Raccorder panneaux, passages de roue et vitrages ; contrôler les normales
   avec le masquage des faces arrière activé.
3. Ajouter optiques, roues, aérodynamique, habitacle et matériaux/textures.
4. Exporter le vrai GLB et le recharger avec le chargeur utilisé par le jeu.
5. Examiner des rendus du **même GLB** : trois-quarts avant, trois-quarts arrière,
   profil et détail de l'habitacle. Ajouter une vue frontale si nécessaire.
6. Corriger les défauts visibles avant de demander une revue. Présenter clairement
   une version en construction comme telle. L'approbation de la Porsche ne vaut
   pas approbation automatique des voitures suivantes.

Les aperçus doivent montrer la géométrie et les textures livrées. Une image
conceptuelle générée ou une retouche ne peut pas servir de preuve du rendu du
modèle. Nommer l'environnement de rendu : studio hors ligne, visualiseur ou jeu.
Garder un éclairage neutre et des vues comparables pour évaluer les volumes.

## Contrat du moteur et performances

- Mètres, +Y vers le haut, +Z vers l'avant, roues au sol à y=0 ; respecter la
  normalisation existante et la rotation unique du chargeur.
- Quatre pivots indépendants `Wheel_FL`, `Wheel_FR`, `Wheel_RL`, `Wheel_RR` ;
  étriers hors de la rotation de roulement. Garder `Interior_SteeringWheel`.
- Vérifier les portières, les caméras, le siège et la place du conducteur.
  Pour une porte en élytre, vérifier ou adapter la cinématique ; une ouverture
  conventionnelle ne devient pas correcte parce que la carrosserie est réaliste.
- Préserver l'identifiant persistant `FLOTTE.fichier` et les données de garage/
  réseau. Renouveler l'URL d'un GLB remplacé via `asset || fichier` pour éviter
  l'ancien modèle gardé dans STATIC_CACHE.
- Embarquer les textures, documenter leur provenance, déclarer les nouvelles
  signatures de matériaux pour le préchauffage. Ne pas modifier les autres voitures.
- Mesurer triangles, maillages, textures et octets. Les 362 868 triangles et
  11 602 448 octets de la Porsche approuvée sont un constat, pas un quota à copier
  ni une garantie mobile. Fusionner les pièces compatibles, mesurer en circulation
  et prévoir des niveaux de détail si les mesures le demandent.

## Budget et compaction obligatoires

Fournir le poids brut, le poids compact et le poids de transfert compressé séparément.
Appliquer les optimisations sans perte avant livraison : index adaptés, sommets
inutilisés/dupliqués et attributs inutiles. Comparer les triangles et les textures
à la référence approuvée. Voir [les mesures et la méthode](voitures-poids-et-compression.md).
Une cible plus légère ne doit pas faire revenir au placeholder ou dégrader les
volumes ; une simplification perceptuelle demande sa propre revue visuelle.

## Avant une publication

Les tests ciblés doivent vérifier chargement, données finies, index, textures,
roues, préchauffage, identité/cache et animations concernées. Appliquer ensuite
le portail complet et la revue iPhone/iPad jour/nuit définis dans `CLAUDE.md`.
Contrôler le modèle à l'arrêt, en mouvement, au volant et portes ouvertes.
Consigner séparément : rendu approuvé, tests exécutés, essais non effectués,
limites connues et mesures de performance. Un test vert ne valide pas l'esthétique.

Toute PR doit expliquer le défaut remplacé, le résultat visible, la provenance
des fichiers, les vues de contrôle et les preuves/limites de validation.
La version, le cache et les nouveautés se mettent à jour selon la procédure de
publication du repo ; ne pas prétendre qu'une approbation visuelle vaut déploiement.
