# Manhattan : une seconde carte jouable

Depuis le menu, choisir **Manhattan · ville réaliste**, puis son profil et
« Jouer en local » ou une partie en ligne. L'adresse directe est
`/?carte=manhattan`. Le bouton **La Terre** ramène au monde existant.

## Ce qui est construit

La nouvelle île comprend 2 353 bâtiments procéduraux, treize destinations de
quartier, une grille d'avenues et de rues, Broadway en diagonale et Central
Park avec lac, promenades et arbres. Empire State, Chrysler, Grand Central,
Rockefeller, Flatiron, One World Trade Center et Trinity ont des volumes
spécifiques. La carte permet de voyager vers leurs abords.

Les façades proches sont des géométries : verre en retrait de 27 cm, appuis,
encadrements, meneaux, corniches, portes ouvertes, devantures, auvents,
escaliers de secours et équipements de toiture. Le verre utilise un
environnement de réflexion préfiltré ; brique, pierre, métal, asphalte et
trottoirs ont des matériaux physiques avec micro-relief procédural.
Le cycle du jeu commande soleil, ombres, fenêtres, enseignes et lampadaires.
La pluie réduit la rugosité de la chaussée.

La circulation réutilise les voitures du jeu sur 84 boucles mesurées. Les
passants utilisent ses personnages et ses animations. Les créatures,
l'inventaire, le vol, la conduite, les commandes tactiles et les quiz restent
ceux du jeu existant. Le mode éducatif est toujours actif.

## Sauvegardes : aucune migration du terrain existant

La Manhattan de la Terre est trop comprimée pour des voies et des façades à
l'échelle du joueur. L'agrandir à sa place déplacerait les constructions.
La nouvelle géométrie est donc dans **une carte indépendante**.

| Donnée | Terre | Nouvelle Manhattan |
| --- | --- | --- |
| Partie locale | `local` | `manhattan-v1:local` |
| Exemple de partie partagée | `12345` | `manhattan-v1:12345` |
| Position du joueur | clé existante | clé préfixée de la carte |
| Canal des pairs et relais | code existant | code préfixé de la carte |

Les blocs de l'ancienne Manhattan restent sur la Terre, à leurs coordonnées
actuelles. Ils ne sont ni déplacés, ni copiés automatiquement dans la nouvelle
île. Les deux cartes partagent le profil, l'éducation et les outils du jeu,
mais pas leurs constructions ni leurs positions. Le code court reste visible
dans l'interface ; une invitation transporte aussi la carte à rejoindre.

`ManhattanWorld` hérite du journal d'opérations, des horodatages de fusion et
du stockage de `World`. Le plan du bâtiment sert à la fois aux collisions et
aux façades. Détruire un bloc retire ses détails architecturaux ; placer un
bloc utilise le mailleur ordinaire. Les planchers intérieurs suivent la même
grille de collision. Les changements de partie et les réinitialisations
invalident les géométries urbaines.

## Rendu et budgets

Les détails sont regroupés dans des `InstancedMesh` par matériau, primitive
et bâtiment. Le sol intact est rendu une seule fois : le mailleur voxel se réactive autour
des éditions, notamment pour les excavations aux frontières de morceaux.
Le sol urbain est fusionné par rangée et chargé par secteurs de
64 unités. Au-delà, des secteurs de 256 unités portent le sol et des
silhouettes avec façades texturées. Les façades détaillées se construisent
progressivement, puis remplacent leur silhouette. Les groupes retirés rendent
leurs tampons d'instances ; les primitives sont partagées.

| Réglage | Ordinateur | Tablette |
| --- | --- | --- |
| Architecture détaillée, rayon maximal | 145 unités | 95 unités |
| Horizon avec brouillard | 1 600 unités | 900 unités |
| Secteurs de sol proches, maximum | 28 (25 candidats actuels) | 16 |
| Densité de pixels maximale | 1,75 | 1,25 |
| Carte d'ombres | 2 048² | 1 024² |
| Lampes ponctuelles réutilisées | 4 | 4 |

`?qualite=tablette` permet de demander le budget tablette sur ordinateur.
`?rr=` borne aussi le détail et la portée, utile au banc. Le constructeur
vise des tranches de 4 ms ; cette cible n'est pas une garantie de durée
maximale pour le transfert d'un lot au pilote graphique.

## Assets et droits

Le plan, les géométries architecturales, les textures de matériaux, le
feuillage et l'atlas d'enseignes ajoutés dans les quatre modules
`manhattan-*.js` sont générés par le code du projet. Aucun asset, texture,
logo ou fichier issu de GTA n'est utilisé. Les noms des monuments servent
à identifier les lieux ; les enseignes commerciales dessinées sont fictives.
Ces nouveaux éléments procéduraux sont proposés sous licence MIT, voir
[licence des assets Manhattan](manhattan-assets-license.txt).

Les voitures fournies précédemment par Max conservent leur restriction
d’usage privé et familial, non commercial, dans ce jeu. Elles ne sont pas
relicenciées MIT par cette refonte : voir `vendor/voitures/LICENSE.md` et
`vendor/VOITURE_LICENSE`. Les bibliothèques gardent leurs licences dans
`vendor/`. Aucun nouveau modèle tiers n’a été ajouté.

## Limites assumées

- C'est une interprétation comprimée de Manhattan, pas une reconstruction
  cadastrale ni une fidélité AAA. Les monuments sont reconnaissables par leur
  implantation et leurs volumes, avec des détails simplifiés.
- Les personnages et créatures conservent le style du jeu existant.
- Les quartiers réutilisent des familles de façades ; les intérieurs ont
  portes et planchers, mais pas d'aménagement pièce par pièce ni d'escaliers
  intérieurs complets. Le vol et l'édition permettent l'accès aux étages.
- Les silhouettes distantes simplifient les ouvertures et les modifications
  fines. Les détails reviennent à l'approche. Le changement de niveau de
  détail reste perceptible.
- Les reflets proviennent d'un environnement statique, sans ray tracing ni
  réflexion dynamique complète des voitures ou du joueur.
- Les voitures gardent le comportement de convoi existant : elles ne
  réagissent pas encore aux feux. Le mobilier et les feuilles sont décoratifs.
- La statue de la Liberté, Brooklyn Bridge et une reconstruction détaillée
  des berges restent à faire.
- L'émulation tactile sur Mac ne remplace pas une validation sur iPad
  physique. Le coût mémoire cumulé des populations du jeu reste une dette
  documentée dans `TASKS.md`.

## Vérifier

Depuis `tests/`, `npm ci`, puis `npx playwright-core install chromium` si
nécessaire. Le banc trouve aussi le navigateur installé par Playwright. Sur
macOS, `CHROMIUM_ANGLE=metal npm test` utilise le GPU natif ; sans cette
variable, le banc conserve SwiftShader. `npm run manhattan` vérifie la carte et `npm test` constitue le
portail de non-régression du dépôt. Les mesures de performances doivent
indiquer le moteur graphique : SwiftShader est un rendu logiciel, distinct
du GPU natif utilisé pour les captures.

Les captures requises sont Midtown au sol et en hauteur, de jour et de nuit,
puis une vue de Central Park. Il faut aussi vérifier un mur détruit, une
construction rechargée, le déplacement, la conduite, les gestes tactiles,
les quiz et deux joueurs partageant la même carte.
