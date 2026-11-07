---
titre: New York se range au loin
puces:
  - Les photos de New York se rangent ailleurs
  - Elles reviennent quand on y retourne
---
## vNEXT — Les photos de New York se rendent loin de New York

**Pourquoi.** Les trois photos recuites de New York (Empire State, statue de la
Liberté, atlas des quartiers) se chargeaient au démarrage et restaient tenues
partout : 69 Mo en RGBA, 17 encore en KTX2, mesurés à Paris, à l'autre bout de
la carte. iOS ferme la page vers 500 Mo de géométrie et de textures (v580).

**Ce que ça change.** Au-delà de 1 300 blocs du plan de New York, chaque
matériau reprend sa carte d'attente (même clé de programme) et la photo est
rendue à la carte graphique ; à moins de 1 000 blocs, le fichier se relit et les
photos se reposent sans compiler de programme. Rien ne change à l'écran : loin
de New York, on ne voit pas ses monuments de près.

**Ce qui le prouve.** Un témoin neuf de `manhattan.js` part à 4 000 blocs (les
photos quittent le matériau), revient à Brooklyn (elles reviennent, zéro clé
neuve) — rouge sur la v590. Le témoin des modèles lit la photo sur le matériau.
`manhattan.js` rejoué seul deux fois de chaque côté : les rouges restants sont
identiques sur `origin/main` (deux programmes compilés à l'entrée des banlieues,
mêmes clés ; erreurs PeerJS du courtier local), déclarés dans `TASKS.md`. Les
trois accueils de `manhattan.js` appuient par le document (v427) : le clic de
la carte de joueur y prenait 11 à 38 s.
