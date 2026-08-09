# Les tests du monde partagé

Le jeu n'a pas d'étape de construction : on l'ouvre, il tourne. Ces tests
suivent la même règle — ils lancent le jeu **tel qu'il est publié** et le font
jouer par de vrais navigateurs.

```sh
cd tests
npm install
npm test          # les deux suites
npm run reseau    # le monde partagé
npm run reglages  # les réglages, enfant et parent
```

Compter environ deux minutes. C'est normal et voulu : les attentes doivent
dépasser les seuils réels du jeu — vingt secondes de silence toléré avant de
couper un lien, cinq secondes entre deux battements de cœur. Un test plus
rapide ne prouverait rien de ce qu'on cherche à prouver.

## Ce qui est réel, ce qui ne l'est pas

Réel : le vrai `index.html`, le vrai `src/net.js`, de vraies connexions WebRTC
entre de vrais navigateurs, chacun dans son contexte isolé comme deux tablettes
distinctes.

Local : le serveur de fichiers et le serveur de rendez-vous. Le jeu accepte
`?peerhost=` exactement pour cela, et rien ne dépend d'un service extérieur —
les tests passent sans internet.

Simulé : la mise en veille d'iOS. On reproduit ses deux effets dans l'ordre où
ils surviennent — la page se déclare cachée, puis tout se fige, le lien restant
ouvert. C'est la seule façon de reproduire à la demande ce qui arrive dès qu'un
enfant regarde une autre application.

## Ce qui est vérifié

Chaque scénario correspond à une panne qui s'est réellement produite :

| Scénario | La panne d'origine |
|---|---|
| à trois, chacun voit les deux autres | un invité voyait `Alice` et `…` |
| aucun avatar sans nom | un lien en cours d'ouverture était dessiné à l'origine du monde |
| le compteur dit trois partout | il annonçait des joueurs invisibles |
| un départ propre nettoie tout le monde | l'avatar restait planté là |
| un joueur endormi n'est pas éjecté | la partie coupait au bout de vingt secondes en arrière-plan |
| au réveil, la partie continue | il fallait tout recommencer |
| Alice retrouve son monde après une veille | « tu joues déjà depuis un autre appareil », et elle restait dehors |
| la reprise tient dans la durée | l'ancien appareil la rechassait dix secondes plus tard |
| seule après le départ de l'hôte | le compteur affichait encore deux joueurs |

## Les réglages (`npm run reglages`)

Ceux de l'enfant et ceux du parent vivent dans le même document, écrit par deux
mains. C'est là que naissaient les réglages « qui ne s'enregistrent pas ».

| Scénario | La panne d'origine |
|---|---|
| la tablette n'écrase plus le réglage du parent | la tablette réécrit tout toutes les 15 s, avec sa valeur |
| l'enfant l'adopte sans relancer le jeu | il fallait fermer et rouvrir le jeu |
| la langue choisie part au serveur | jusqu'à 15 s de retard, perdues si l'on refermait |
| en français, plus aucune question d'anglais | ce que l'enfant constate vraiment |
| et il survit au redémarrage | la lecture de démarrage reprenait l'ancienne valeur 300 ms après le clic |
| l'autre tablette ne le défait pas | un second appareil allumé réécrivait sa version périmée |
| arrêter les questions après N minutes | nouvelle consigne parentale |
| la langue réglée par le parent arrive sur la tablette | l'espace parent ne réglait que le rythme |
| chaque réglage atterrit dans le document du parent | logé avec ceux de l'enfant, il pouvait être écrasé |
| et la tablette suit le panneau | elle réimposait sa version périmée |
| une décision du parent prend effet en quelques secondes | jusqu'à quinze secondes d'attente : mesuré 14,6 s avant, 1,6 s après |
| en pause, un bouton propose de reprendre | une pause en ligne était sans retour |

Le serveur est simulé par `nuage.js`, un Supabase de poche : le test peut ainsi
regarder ce qui est **réellement** enregistré, ce qu'aucune capture d'écran ne
montre.

## Si Chromium n'est pas trouvé

Le banc cherche aux endroits habituels. Pour lui indiquer un autre chemin :

```sh
CHROMIUM=/chemin/vers/chrome npm test
```

## Ajouter un scénario

Tout part de `banc.js` : `creerMonde`, `rejoindre`, `endormir`, `reveiller`, et
`vu()` qui rapporte ce qu'un joueur voit à l'écran. La règle qui a permis de
trouver ces défauts tient en une phrase : **comparer ce que le compteur annonce
à ce qui est réellement dessiné**. C'est leur désaccord qui trahit les pannes.

Et avant de croire un test qui passe, faites-le échouer : remettez le défaut,
vérifiez qu'il le voit. Un test vert des deux côtés ne prouve rien.
