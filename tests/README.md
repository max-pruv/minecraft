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

Simulé : la présentation perdue. On avale les « hello » à l'arrivée pendant
quelques secondes — l'effet est le même que s'ils s'étaient perdus, et le test
décide quand ça s'arrête. La fenêtre est comptée DANS la page, à partir du
premier message avalé : cette machine met parfois une seconde et demie à
répondre à un `evaluate` pendant qu'une partie tourne, et une fenêtre posée
depuis le banc était déjà écoulée quand le lien s'ouvrait. Le scénario passait
alors sur le code fautif comme sur le code réparé — la pire des deux façons
d'échouer. Il compte donc maintenant ce qu'il a réellement avalé, et le dit.

Simulé : le VPN. On lui reprend ses deux effets, et rien d'autre — la
signalisation passe, le canal de données entre les deux tablettes ne s'ouvre
jamais. C'est la seule façon de reproduire à la demande ce qu'un VPN resté
allumé fait au jeu à plusieurs.

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
| sur la carte, les autres joueurs portent leur prénom | la table des joueurs est rangée par identifiant de pair, et c'est cette clé qui servait d'étiquette : sous le point bleu, un enfant lisait `632f7014-f54e-4ab2-9df2-eac67daa1b1c` |
| un départ propre nettoie tout le monde | l'avatar restait planté là |
| un joueur endormi n'est pas éjecté | la partie coupait au bout de vingt secondes en arrière-plan |
| au réveil, la partie continue | il fallait tout recommencer |
| Alice retrouve son monde après une veille | « tu joues déjà depuis un autre appareil », et elle restait dehors |
| la reprise tient dans la durée | l'ancien appareil la rechassait dix secondes plus tard |
| seule après le départ de l'hôte | le compteur affichait encore deux joueurs |
| un serveur de rendez-vous muet le dit, et vite | le menu restait sur « Ouverture du monde… » indéfiniment ; puis quarante secondes, parce que le jeu retentait en hôte ce que la première tentative avait déjà tranché — mesuré 10,7 s après correction |
| rouvrir son propre monde depuis la liste | le parcours réel de l'enfant, qu'aucun test ne couvrait |
| un serveur qui avale les demandes n'empêche pas d'entrer | « le monde existe mais le réseau bloque » — sur un réseau sain |
| la sonde de version traverse le service worker jusqu'au réseau | « version v128 · à jour » alors que la v130 était publiée : le service worker servait la sonde depuis son propre cache, et l'accueil comparait la version avec elle-même |
| un lien jamais présenté ne devient pas un joueur fantôme | — |
| et le lien muet est coupé puis rouvert, au lieu de durer pour toujours | la coupure au bout de vingt secondes rouvrait bien un lien — puis l'adieu de l'ancien, arrivé après coup, effaçait le nouveau : les deux portent la même clé, l'identifiant de l'hôte. L'invité gardait alors une connexion ouverte absente de sa table, invisible au battement comme au compteur, et sans reconnexion possible. Un fantôme, définitif |
| et ce scénario a bien eu quelque chose à faire perdre | — |
| deux enfants qui ouvrent le même monde en même temps se retrouvent · et il n'y a bien qu'un seul monde | le geste réel d'une fratrie : le même code, « Jouer » pressé dans la même seconde, et le chemin le plus court vers deux mondes du même nom |
| un monde bien rempli ne retarde pas les retrouvailles · et le monde de l'hôte arrive bien chez l'invité | le journal de blocs ne part plus avec la présentation mais après elle ; sans un scénario qui le mesure, cette phrase n'est qu'une intention |
| une présentation perdue finit par passer · et le compteur le dit des deux côtés | deux iPad sur la même connexion, dans le même monde, et chacun seul. On relançait la présentation deux fois puis on se taisait pour toujours : le canal restait ouvert, les battements passaient — donc le lien n'était jamais jugé mort — et rien ne rattrapait plus rien. Mesuré sur le code fautif : `[["Zoé"],[]]`, compteurs 2/1 |
| et des présentations ont bien été perdues en chemin | le scénario a d'abord passé sur les deux codes : sa fenêtre s'écoulait avant même la connexion, et il ne mesurait rien |
| un VPN ne fait plus dire que le monde est vide · et le message dit quoi faire | capture d'écran à l'appui : « ❌ Personne n'a répondu dans ce monde », alors que le code était pris et que quelqu'un le tenait bel et bien |
| l'invité voit le même temps et la même heure que l'hôte | chacun tirait sa météo au sort : l'un sous la pluie en pleine nuit, l'autre au soleil de midi |
| et il le reste · un invité ne change pas le temps tout seul | mesuré : hôte 0,86 sous la pluie, invité 0,32 au sec |

Deux de ces scénarios ont longtemps échoué une fois sur deux, et pas pour la
même raison. Le serveur muet mettait quarante secondes à se déclarer parce que
le jeu retentait en hôte ce que la première tentative avait déjà tranché ;
c'est réparé, et le scénario mesure désormais aussi le temps. Le trio, lui,
perdait parfois une présentation : l'invité voyait le troisième joueur — que
l'hôte lui relayait — mais pas l'hôte, dont la connexion restait « en cours de
présentation » pour toujours. La présentation se relance maintenant d'elle-même
au bout de trois secondes.

Le geste à deux doigts, lui, dépend du temps de calcul disponible. En rendant
le tissu de Paris, le fond de carte est passé de 95 à 139 ms ; les contacts
envoyés pendant ce temps-là n'étaient plus lus comme un geste mais comme des
appuis, et le joueur se retrouvait téléporté. Le scénario du zoom l'a vu tout
de suite, deux fois sur deux. La réponse n'était pas d'attendre plus longtemps
mais de rendre `solParis` moins cher — la carte l'appelle une fois par pixel, et
il balayait vingt-huit lieux trois fois. Un test qui échoue parce que le jeu est
devenu lent dit quelque chose de vrai sur le jeu.

Et le banc referme les pages dont il n'a plus besoin. Chacune dessine un monde
en trois dimensions à plein régime ; à quatre parties vivantes sur quatre
cœurs, les minuteurs du navigateur partent en retard et ce sont les scénarios
qui mesurent des délais qui en paient le prix. Un test qui échoue parce que la
machine peine ne prouve rien.

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
| retirer l'arrêt depuis l'espace parent rend les quiz sans relancer | une consigne RETIRÉE ne se retirait jamais en cours de partie : on ne copiait que les clés présentes, et la valeur d'avant restait en mémoire jusqu'au redémarrage — mesuré : l'arrêt restait gelé à 900 s |
| la tablette annonce le prochain quiz avec sa présence · et l'espace parent dit « quiz dans 4 min » | la contre-épreuve du réglage de rythme : le jour du « panneau à 10, compteur à 6 », rien ne permettait de le constater sans regarder par-dessus l'épaule de l'enfant |
| pour un enfant jamais configuré, le panneau dit ce que fait la tablette | « configuré à dix sur l'espace des parents », compteur à six sur la tablette — or il n'était configuré nulle part : le panneau affichait SA valeur par défaut, la tablette tournait sur SA valeur d'usine, deux constantes dans deux fichiers qui avaient divergé |
| le tout premier lancement ne commence pas par un quiz | une dette jamais écrite était confondue avec une dette de zéro : profil neuf, appareil neuf ou données effacées, chaque premier lancement commençait par un quiz avant la première seconde de jeu |
| et l'intervalle d'usine est bien de dix minutes | il était de six, et personne ne l'avait jamais réglé |
| les dix minutes se cumulent du local à l'en ligne | mesuré sur le code fautif : quiz à la seconde 1 après la bascule, parce que la dette du lancement traînait encore |
| finir sa série puis recharger ne redonne pas un quiz | la dette n'était réglée qu'au clic sur « Continuer » ; entre l'écran de victoire et ce clic, iOS pouvait recharger la page, et l'enfant qui venait de finir recevait une série entière de plus |
| un monde retiré ne revient pas du nuage · ni sur l'autre tablette | la liste des mondes était fusionnée par union avec celle du serveur, et une union ne sait pas représenter une absence voulue : le monde effacé revenait tout seul, avec ses blocs |
| mais retaper le code le ramène | une suppression irréversible est une suppression qu'on n'ose pas faire |
| la tablette d'Alice dit au serveur qu'elle est là | la présence était écrite depuis toujours, mais seul l'espace parent la lisait |
| Marlon voit qu'Alice est connectée ailleurs | le compteur ne dit que ce qui se passe *ici* : un enfant seul dans son monde ne pouvait pas savoir que son frère était devant sa tablette |
| un bouton suffit à l'inviter | il fallait crier dans le couloir, ou dicter un code à six chiffres |
| la tablette d'Alice l'annonce sans rien lui demander | — |
| « Rejoindre » l'emmène dans le monde de Marlon | le parcours entier, d'un enfant à l'autre : chacune des moitiés prise séparément marchait déjà |
| et elle ne se remontre pas en boucle | la boucle relit le même document toutes les deux secondes |

L'invitation traverse deux tablettes pour de vrai : Alice joue de son côté,
Marlon ouvre un monde en ligne — vrai serveur de rendez-vous, vraie session —
la voit dans sa liste, l'invite, et elle arrive chez lui. C'est le seul
scénario qui prouve quelque chose : la liste, l'écriture au serveur, la lecture
et l'ouverture du monde marchaient déjà chacune de leur côté.

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
| les créatures restent visibles en dézoomant | « je ne vois plus de Pokémon sur la carte » : elles disparaissaient sans un mot au-delà d'un seuil de zoom, pendant que la légende continuait de les promettre — mesuré 0 pixel violet dès l'échelle de 150 blocs |
| on ne peut ni zoomer à l'infini ni sortir du monde | — |
| les quartiers du bas de l'île ont la place d'exister | de Battery à la 14e Rue il y avait quinze blocs, moins qu'un pâté de Midtown : TriBeCa, SoHo, Chinatown, le Village et Wall Street s'y superposaient |
| la grille de 1811 s'arrête bien à la 14e Rue | elle descendait jusqu'à la mer — mesuré : 0,63 des rangées de rue sur un multiple de six au sud, contre 0,28 avec le vrai plan |
| les lieux de Paris sont sur la carte | l'Opéra, le Panthéon, les Invalides, la Bastille et le Luxembourg n'existaient pas |
| chaque monument de Paris est sur sa rive et au sec | la Tour Eiffel se dressait rive droite et le Louvre rive gauche |
| Paris est bâtie de pierre de taille et de zinc | elle ne l'était pas du tout : la trame générique écarte tout lot voisin d'un repère, et le repère « Caserne & Commissariat » couvre Paris entière — le pâté haussmannien n'a jamais été bâti une seule fois. Mesuré 236 colonnes de pierre ou de zinc avant, 1036 après |
| ses îlots ont une cour | il n'y avait pas d'îlots : des immeubles carrés isolés, du vide entre eux, aucune cour — zéro pavé de cour avant, 77 après |
| et on ne la traverse plus dans l'herbe | 762 colonnes d'herbe nue au milieu de la ville, sur 5025 ; il en reste 218, et ce sont les squares des monuments |
| le parc a du relief, un lac et des attractions | le parc tenait dans cinquante blocs — une roue, un carrousel, un anneau de rails — et son allée dallée était posée un bloc trop bas, donc enterrée |
| et ses villages sont des destinations | on arrivait au parc par son seul nom, sans savoir où aller ensuite |
| San Francisco a ses collines et sa presqu'île | un disque de maisons pastel posé sur un bruit de terrain : ni côte, ni relief, ni plan — mesuré 13 buttes distinctes et 903 points en mer contre 1918 à terre |
| et ses quartiers sont des destinations | Twin Peaks, le Golden Gate Park, la Mission, le Castro, Chinatown, le Presidio n'existaient pas |
| Nice a sa baie et ses collines | une ville « au bord de la mer » sans mer — mesuré 519 points en mer pour 998 à terre |
| Lille a sa citadelle en étoile, entourée d'eau | un beffroi posé au milieu de rien : l'étoile de Vauban se compte par ses douves, 415 blocs |
| la rue Faidherbe file droit vers l'horloge de la gare | il n'y avait pas de gare : la perspective de 1869 s'arrêtait dans des maisons quelconques |
| la Déesse veille sur le damier, la Vieille Bourse sur sa cour | la Vieille Bourse était posée SUR la Grand'Place, la colonne à côté, et le damier de granit n'existait pas |
| trois tours, trois tailles : CCI, beffroi, chaussure de ski | ni beffroi de la CCI, ni tour de Lille : des tours d'acier au hasard, parfois plus hautes que le beffroi de l'hôtel de ville |
| le quai du Wault est en eau, la Treille montre sa façade de verre | l'ancien port et la cathédrale n'existaient pas du tout |
| le port Lympia est un vrai bassin, et ses pointus sont à quai | un ovale sans bateaux : les coins du vrai rectangle étaient à sec |
| la coupole rose du Negresco, les bulbes verts de Saint-Nicolas | pas de Negresco ; la cathédrale russe, mal placée, portait des bulbes multicolores |
| sept statues perchées veillent sur Masséna | six : la septième de « Conversation à Nice » manquait |
| chaises bleues, palmiers, stores rayés et la baleine du Paillon | la Promenade n'était qu'un trottoir, Saleya un pavage, le Paillon une pelouse |
| la version d'une tablette éteinte reste lisible deux jours après | la présence périmée était jetée en bloc, version comprise : « version inconnue » pour une tablette dont la version était connue |
| le hub éducation propose chaque enfant de la famille | le panneau ne montrait que l'enfant connecté, aujourd'hui, point |
| l'enfant choisi montre ses journées à lui, sans les niveaux du mien | aucun sélecteur n'existait |
| les raccourcis de période cumulent — « Tout » dépasse « 7 jours » | le panneau ne savait compter qu'aujourd'hui et dessiner 14 jours |
| le Golden Gate, orange, va du Presidio aux Marin Headlands | un pont rouge vif couché est-ouest, qui ne menait nulle part : pas de Headlands du tout |
| Karl the Fog coule sur la passe, et les pylônes en dépassent | aucun brouillard — la signature atmosphérique de la ville manquait |
| le Bay Bridge est gris — on ne le confond plus avec le Golden Gate | les deux ponts sortaient du même moule, rouge laine tous les deux |
| les otaries de Pier 39, Lombard fleurie et le Dragon Gate | aucune des trois icônes que cherchent les enfants n'existait |
| le hub trace le taux de réussite par jour | le hub disait combien l'enfant avait joué, jamais s'il progressait |
| et un jour sans question n'y compte pas pour zéro | une journée de vacances aurait ressemblé à un échec |
| la Grande Muraille serpente sur les crêtes | entre San Francisco et le Pôle Nord, il n'y avait que du bruit de terrain |
| la Cité interdite : vermillon, tuiles jaunes et lions de bronze | la Chine n'existait pas |
| les karsts de Guilin au bord de la rivière turquoise | idem |
| les rizières en marches d'eau, les pandas dans les bambous | idem |
| les lieux de Nice · de Lille sont sur la carte | on arrivait par le seul nom de la ville |

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

Trois vérifications de suite se sont trompées de témoin avant de trouver le bon,
et les trois erreurs valent d'être connues, parce qu'elles se ressemblent :
un drapeau interne ne vaut que l'instant où on le lit ; la clé d'une connexion
d'invité est l'identifiant de l'hôte, qui ne change jamais ; et le bandeau ne
dit rien d'une reconnexion quand le canal, lui, s'ouvre parfaitement — c'est la
présentation par-dessus qui manque. Chaque fois, le témoin choisi disait
quelque chose de vrai sur autre chose que ce qu'on éprouvait.

Et avant de croire un test qui passe, faites-le échouer : remettez le défaut,
vérifiez qu'il le voit. Un test vert des deux côtés ne prouve rien.
