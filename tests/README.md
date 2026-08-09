# Les tests du monde partagé

Le jeu n'a pas d'étape de construction : on l'ouvre, il tourne. Ces tests
suivent la même règle — ils lancent le jeu **tel qu'il est publié** et le font
jouer par de vrais navigateurs.

```sh
cd tests
npm install
npm test
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
