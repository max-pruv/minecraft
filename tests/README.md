# Les tests du monde partagé

Le jeu n'a pas d'étape de construction : on l'ouvre, il tourne. Ces tests
suivent la même règle — ils lancent le jeu **tel qu'il est publié** et le font
jouer par de vrais navigateurs.

```sh
cd tests
npm install
npm test          # les trois suites
npm run reseau    # le monde partagé
npm run reglages  # les réglages, enfant et parent
npm run carte     # la carte : glisser, zoomer, voyager
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
| un serveur de rendez-vous muet finit par le dire | le menu restait sur « Ouverture du monde… » indéfiniment |
| rouvrir son propre monde depuis la liste | le parcours réel de l'enfant, qu'aucun test ne couvrait |
| un serveur qui avale les demandes n'empêche pas d'entrer | « le monde existe mais le réseau bloque » — sur un réseau sain |
| l'invité voit le même temps et la même heure que l'hôte | chacun tirait sa météo au sort : l'un sous la pluie en pleine nuit, l'autre au soleil de midi |
| et il le reste · un invité ne change pas le temps tout seul | mesuré : hôte 0,86 sous la pluie, invité 0,32 au sec |

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
| le quiz se règle en une seule liste | deux menus côte à côte, illisibles ensemble |
| la langue réglée par le parent arrive sur la tablette | l'espace parent ne réglait que le rythme |
| chaque réglage atterrit dans le document du parent | logé avec ceux de l'enfant, il pouvait être écrasé |
| et la tablette suit le panneau | elle réimposait sa version périmée |
| une décision du parent prend effet en quelques secondes | jusqu'à quinze secondes d'attente : mesuré 14,6 s avant, 1,6 s après |
| en pause, un bouton propose de reprendre | une pause en ligne était sans retour |
| la version de la tablette part au serveur, et l'espace parent l'affiche | une tablette restée en arrière expliquait des correctifs « sans effet », sans moyen de le constater |

Le serveur est simulé par `nuage.js`, un Supabase de poche : le test peut ainsi
regarder ce qui est **réellement** enregistré, ce qu'aucune capture d'écran ne
montre.

## La carte (`npm run carte`)

Deux joueurs : une tablette — contexte tactile, vrais contacts multiples envoyés
par le protocole du navigateur — et un ordinateur à la souris. C'est la
différence entre les deux qui a mis au jour le défaut le plus grave.

| Scénario | La panne d'origine |
|---|---|
| la carte s'ouvre sur le joueur | — |
| le menu du jeu ne recouvre pas la carte | à la souris, ouvrir la carte relâchait le pointeur, ce que le jeu prenait pour une pause : son menu se posait dessus et plus rien ne répondait |
| glisser promène la carte | il n'y avait ni déplacement ni zoom |
| écarter deux doigts rapproche, les rapprocher éloigne | idem |
| zoomer sur une ville n'y emmène pas | le second doigt levé était pris pour un appui bref, et le zoom finissait en téléportation |
| toutes les grandes destinations restent repérables | deux domaines voisins tombaient sur le même pixel, l'un s'effaçait — et devenait injoignable |
| aucun nom ne déborde de la carte | « Base spatia », coupé par le bord, illisible et intouchable |
| toucher un lieu emmène en voyage · un appui long dépose n'importe où | ce qui marchait avant, et qui devait continuer |
| en s'approchant, Paris révèle ses rues | la vue générale ne montrait que des taches de couleur |
| ce que l'enfant construit apparaît sur la carte de près | la carte ne lisait que le terrain d'origine |
| on ne peut ni zoomer à l'infini ni sortir du monde | — |
| les quartiers du bas de l'île ont la place d'exister | de Battery à la 14e Rue il y avait quinze blocs, moins qu'un pâté de Midtown : TriBeCa, SoHo, Chinatown, le Village et Wall Street s'y superposaient |
| la grille de 1811 s'arrête bien à la 14e Rue | elle descendait jusqu'à la mer — mesuré : 0,63 des rangées de rue sur un multiple de six au sud, contre 0,28 avec le vrai plan |
| les lieux de Paris sont sur la carte | l'Opéra, le Panthéon, les Invalides, la Bastille et le Luxembourg n'existaient pas |
| chaque monument de Paris est sur sa rive et au sec | la Tour Eiffel se dressait rive droite et le Louvre rive gauche |

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
