# Matériaux scannés de la couche HD (vNEXT)

Tous les matériaux ci-dessous sont publiés sous licence **CC0 1.0 Universel**
(domaine public) : ni attribution ni restriction requises. On les crédite quand
même, par honnêteté et pour pouvoir retrouver la source.

- Poly Haven — https://polyhaven.com/license (CC0)
- ambientCG — https://docs.ambientcg.com/license/ (CC0)

Les fichiers de ce dossier sont **produits** par `scripts/materiaux-scannes.mjs`
(rejouable : `cd scripts && node materiaux-scannes.mjs`) à partir des sources
1K suivantes. Les scans originaux ne sont pas versionnés.

| Tuile du jeu | Source | Page | Taille réelle | Pourquoi |
| --- | --- | --- | --- | --- |
| `pierre` | ambientCG Tiles143 | https://ambientcg.com/a/Tiles143 | 2,6 m (scan de 2 m, assises de ≈ 45 cm) | calcaire clair en assises décalées : la pierre de taille haussmannienne |
| `enduit` | Poly Haven painted_plaster_wall | https://polyhaven.com/a/painted_plaster_wall | 2 m | enduit peint, grain fin et usure : les vieux quartiers |
| `brique` | Poly Haven brick_wall_02 | https://polyhaven.com/a/brick_wall_02 | 2 m | brique rouge jointoyée |
| `bitume` | Poly Haven asphalt_01 | https://polyhaven.com/a/asphalt_01 | 2,08 m | asphalte de chaussée usé |
| `trottoir` | Poly Haven asphalt_floor | https://polyhaven.com/a/asphalt_floor | 2,35 m | asphalte fin des trottoirs, plus clair |
| `pave` | Poly Haven cobblestone_square | https://polyhaven.com/a/cobblestone_square | 1 m | pavés de granit en rangs |
| `pierre-lisse` | Poly Haven grey_plaster_02 | https://polyhaven.com/a/grey_plaster_02 | 1 m | pierre lisse des encadrements, sans joint |
| `cour` | Poly Haven cobblestone_floor_01 | https://polyhaven.com/a/cobblestone_floor_01 | 1 m | pavés irréguliers d'une cour |
| `ecorce` | Poly Haven bark_platanus | https://polyhaven.com/a/bark_platanus | 1,5 m | écorce de platane, l'arbre des rues de Paris |

## Modifications apportées par le script

- Réduction à 256 px (régions de 2 × 2 cases) ou 128 px (sur place), avec
  raccord préservé (mosaïque 3 × 3 puis centre).
- Occlusion ambiante cuite dans la couleur (puissance 0,4 à 0,6).
- Basses fréquences aplanies (taches de plus de S/16 réduites de 40 à 90 %
  selon le matériau) et contraste réduit (0,45 à 1) : un scan d'un mètre carré
  répété sur une façade de vingt mètres ne doit pas faire de camouflage.
- Couleur ramenée, canal par canal et en linéaire, à la moyenne de la tuile
  peinte qu'elle remplace (les teintes du jeu en dépendent).
- Normale OpenGL renormalisée en R, G ; rugosité rangée en B, en rapport à sa
  moyenne (bornée de 0,5 à 1,5).
