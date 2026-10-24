# Porsche 911 GT3 RS — deuxième reconstruction

La géométrie est intégralement nouvelle : aucun maillage de production ou de la
première proposition n'est réutilisé. Voir `docs/porsche-911-rebuild.md` pour la
provenance, les détails, les vérifications et les limites restantes.

## Voir l'aperçu interactif

Dans ce dossier décompressé, exécuter `python3 -m http.server 8000`, puis ouvrir
http://localhost:8000/docs/porsche-911-preview.html. Les dépendances Three.js du
dépôt sont incluses pour rendre cet aperçu autonome hors du repo.
Les PNG dans `renders/` proviennent directement du GLB livré. L'éclairage studio
du rendu de contrôle n'est pas celui du jeu.

## Intégrer dans max-pruv/minecraft

La connexion GitHub a refusé l'écriture (403) : ni main ni la PR #539 n'ont changé.
Le patch porte uniquement les modifications aux fichiers existants. Il a été
vérifié sur les versions récupérées du dépôt lors de cette session ; en cas de
conflit sur une version plus récente, réconcilier les modifications localement.

1. Copier le nouveau GLB dans `vendor/voitures/`, le générateur dans `scripts/`,
   les deux documents dans `docs/` et les trois tests Porsche dans `tests/`.
   Ne pas remplacer les dépendances vendor du dépôt si elles ont évolué.
2. Depuis la racine du dépôt :
   `git apply --check /chemin/porsche-911-integration.patch`
   puis `git apply /chemin/porsche-911-integration.patch`.
3. Exécuter les tests ciblés décrits dans la documentation, puis le portail
   complet du projet et la revue visuelle/mobile avant toute publication.

Le nom sauvegardé du véhicule reste stable. La nouvelle URL du modèle renouvelle
le cache. Aucune version de production n'est réservée ou publiée par ce paquet.

## Validation artistique

Cette livraison reste soumise à la validation de Max. Elle ne constitue pas
un standard de qualité approuvé. Aucun fichier définissant les attentes pour
les prochaines voitures ne sera rédigé avant son approbation explicite.
