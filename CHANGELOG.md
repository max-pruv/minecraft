# Journal des versions

Ce que chaque livraison apporte, et à quoi elle sert. Une entrée par version
publiée, la plus récente en haut.

**Règle de tenue : rien ne part en production sans son entrée ici, écrite dans
la même fusion.** Le numéro de version est celui de `CACHE_VERSION` dans
`sw.js` — c'est lui qui décide si une tablette déjà installée reçoit la mise à
jour, et c'est donc lui qui fait foi.

Chaque entrée dit trois choses, dans cet ordre :

- **Pourquoi** — la panne vécue, ou le manque constaté. Pas la solution.
- **Ce que ça change** — ce que la famille voit ou peut faire.
- **Ce qui le prouve** — le nombre de témoins, et ceux qui comptent.

Le détail technique reste dans `git log` : les messages de commit sont écrits
pour être lus. Les invariants et les décisions d'architecture, eux, vivent dans
`CLAUDE.md`.

---

## v161 — Washington, et un métro dans lequel on monte

**Pourquoi.** Max voulait la capitale américaine, « très high fidelity, beaucoup
de détails, bien placée sur la carte », avec deux exigences précises : **qu'on
puisse rentrer dans les bâtiments**, et **qu'il y ait le métro, et qu'on puisse
le prendre**. Le jeu avait cinq villes, et aucune ne se visitait de l'intérieur :
on tournait autour de la tour Eiffel et du Chrysler Building sans jamais pousser
une porte. Quant au seul métro existant, il tournait en rond au-dessus des toits
d'une ville générique et ne s'arrêtait jamais nulle part.

**Ce que ça change.**

- **Washington, cent soixante-quinze blocs de large**, sur le confluent du
  Potomac et de l'Anacostia. Le plan de L'Enfant est là pour de vrai : la grille
  des rues numérotées et lettrées, **fendue en diagonale** par dix-huit avenues
  d'État qui se coupent sur seize ronds-points — Dupont, Logan, Thomas, Scott,
  Washington Circle. C'est ce croisement-là qu'on lit sur un plan de Washington
  avant tout le reste, et c'est ce qu'on voit en ouvrant la carte du jeu.
- **Le Mall**, du Capitole au Lincoln Memorial en passant par l'obélisque, aux
  distances exactes : trente-sept blocs jusqu'au monument de Washington,
  cinquante-sept jusqu'au Lincoln. Les musées bordent la pelouse dans le bon
  ordre et du bon côté.
- **Aucun gratte-ciel.** La loi de 1910 plafonne l'immeuble à cent trente pieds,
  et c'est pour cela qu'on voit le dôme du Capitole de n'importe quel trottoir.
  Après Manhattan, le contraste est le premier détail qu'un enfant remarque —
  et il est vrai.
- **Vingt-quatre monuments, et on entre dans tous** — plus les trois ponts. La
  Rotonde du Capitole, avec la coupole creuse au-dessus de la tête ; le Lincoln
  assis dans sa chambre à colonnes ; l'obélisque et son **escalier en
  colimaçon** de cinquante-deux marches jusqu'aux fenêtres du sommet ; la
  Maison-Blanche et son portique arrondi ; les avions suspendus au plafond du
  musée de l'Air et de l'Espace ; le diplodocus de l'Histoire naturelle ; la
  salle de lecture ronde de la Bibliothèque du Congrès ; le mur noir du
  Vietnam, enfoncé dans la pelouse.
- **Et les maisons ordinaires aussi.** Chaque îlot de la ville est creux, avec
  deux portes face à face : on entre d'un côté, on ressort de l'autre. Il y a
  une lampe, une table, parfois un canapé.
- **Le métro, quatre lignes de couleur, sous terre.** Des voûtes de béton à
  caissons — le gaufrier de Harry Weese, qui fait la beauté du vrai réseau — un
  quai central carrelé de brun, des rails de part et d'autre, un escalier qui
  remonte à la rue et un pylône brun marqué M. **Les rames s'arrêtent en
  station** trois secondes, trois par ligne : on descend, on attend sur le quai,
  le train arrive, on monte, il nous emmène à la suivante.
- **Georgetown n'a pas de station**, comme dans la vraie ville. Et Rosslyn est
  la plus profonde du réseau, quinze marches sous la rue, parce que la Bleue
  passe sous le Potomac pour y arriver.
- **Le bouton « Monter à bord » ne ment plus.** Il restait affiché après le
  départ de la rame — plus personne ne lui disait de disparaître — et l'enfant
  appuyait dans le vide. Il se cache maintenant dès qu'il n'y a plus rien à
  prendre. Le défaut existait déjà pour le métro de la ville et la monoplace du
  circuit ; il est corrigé pour les trois.

**Ce qui le prouve.** Une suite neuve, `tests/washington.js`, dix-sept témoins
qui suivent le trajet d'un enfant : arriver sur le Mall, pousser la porte du
Capitole et se retrouver sous la coupole, entrer chez les gens, descendre
l'escalier du métro, attendre, monter et **arriver à la station suivante**
(Smithsonian → Federal Triangle). Elle est rouge sur la version d'avant, et
proprement : le module n'existe pas, elle le dit au lieu de s'effondrer.

Et surtout, `tests/plafond.js` gagne un second témoin. Bâtir une ville de cent
soixante-quinze blocs déplace forcément le sol sous elle : l'empreinte du relief
change, pour la première fois, et c'est la seule exception que Max ait accordée
— celle de la remise à plat de la carte. Mais **une seconde empreinte, calculée
en retirant la zone d'influence de la capitale, doit rester identique au bloc
près**, et elle l'est. Un troisième témoin vérifie que cette zone ne touche ni
le point d'apparition, ni le musée, ni le quartier des enfants. Autrement dit :
on a bâti une ville, et on n'a rien cassé ailleurs — c'est vérifié, pas espéré.

---

## v160 — trois cents bâtiments, sans écrire trois cents fichiers

**Pourquoi.** Max en voulait « à peu près trois cents ». v159 en a livré 21,
écrits un par un — justifié pour la Tour Eiffel, qui mérite ses quatre piliers
évasés, mais pas pour un immeuble de rue. À ce rythme, trois cents, c'était des
semaines de travail pour un résultat *moins* varié qu'une famille bien
paramétrée.

**Ce que ça change.**

- **Huit familles de bâtiments**, et **301 modèles** en tout avec les monuments :
  maison de village, immeuble haussmannien, tour de bureaux, hôtel, boutique,
  école, pavillon de banlieue, ferme.
- **Une famille est un dessin à trous.** L'immeuble haussmannien sait où vont la
  devanture, l'entresol, l'étage noble et son balcon, la corniche et le comble
  en zinc — cette grammaire-là existait déjà dans l'atlas depuis v152. Ce qu'on
  lui donne, c'est la largeur, la profondeur, le nombre d'étages et la pierre.
- **La variété est réelle**, pas cosmétique : de 123 blocs pour la plus petite
  maison à 3 921 pour la plus haute tour, et jusqu'à 37 tailles distinctes sur
  38 variantes. Ce n'est pas la même boîte repeinte.
- **Une liste de 301 lignes serait illisible à sept ans.** L'onglet montre donc
  les 8 familles avec un bouton 🔀 « modèle suivant » et un bouton « Poser ».
  Tous les modèles restent atteignables, aucun écran n'est noyé.
- **Le même numéro rend toujours le même bâtiment.** Un enfant qui aime le
  septième modèle le retrouve demain — les réglages viennent d'une suite
  déterministe, pas d'un tirage au sort.

**Et un défaut que Max a trouvé avant nous : la nouveauté n'arrivait pas
jusqu'à l'iPad.** Il a ouvert le jeu après la livraison de v159 et n'a pas vu le
bouton des monuments, alors que le serveur servait bien la bonne version. La
cause : le retour dans l'application appelait `reg.update()` et **rien d'autre**.
Le service worker passait donc à la version neuve, le badge l'affichait, et **la
page continuait de faire tourner l'ancien JavaScript** — le rechargement n'avait
lieu que dans le chemin du démarrage complet. Sur un iPad, l'application n'est
jamais vraiment fermée : elle s'endort et revient. C'était donc le cas *normal*,
et rien ne l'éprouvait. Revenir dans l'application refait maintenant la même
comparaison qu'au démarrage, et recharge.

**Ce qui le prouve.** `fumee.js` construit **les 280 variantes**, pas un
échantillon : une seule qui lèverait une exception, et c'est un enfant qui
clique et à qui rien n'arrive. Il vérifie aussi qu'aucune ne dépasse le plafond
du monde — un immeuble décapité en silence — et que deux appels au même numéro
rendent bien le même bâtiment.

Et une suite neuve, `maj.js` : elle publie une version pendant que l'enfant
joue, endort l'application, y revient, et vérifie que la page a rechargé. Sur
l'ancien code, la trace dit tout — « vérifications déclenchées par le retour :
0 ». Avec le correctif : 1, et la page repart sur la version neuve.

L'aiguillage a par ailleurs gagné une règle en chemin : **une suite d'essai
qu'on modifie se rejoue elle-même, et rien d'autre.** Sans cela, retoucher un
témoin relançait les huit suites, et le gain disparaissait dès qu'on améliorait
un essai.

---

## v159 — la bibliothèque de monuments s'ouvre enfin

**Pourquoi.** Max, après deux jours : « la bibliothèque, ça fait quand même deux
jours que tu travailles dessus. On n'arrive pas à avancer. » Il avait raison, et
le dépôt le prouvait : `src/monuments.js` existait — 803 lignes, 21 monuments
relevés sur leurs vraies proportions — et **personne ne l'importait**. Il avait
été livré à l'intérieur de v157 sans être branché. Du code mort : ça ressemble à
de l'avancement dans le journal, et Marlon n'y a jamais eu accès une seconde.

En cherchant pourquoi, une cause plus large est apparue. Le portail d'essai est
passé de cinq suites à huit, de 2 588 à 5 297 lignes, et **chaque livraison le
payait en entier — une heure, même pour ajouter un bâtiment**. La cadence est
tombée de neuf versions par jour à deux ou trois, et ce qui n'était pas urgent
attendait indéfiniment.

**Ce que ça change.**

- **Un onglet 🏛️ Monuments dans l'atelier.** Vingt-et-un bâtiments rangés par
  ville — Tour Eiffel, Notre-Dame, Empire State, Colisée, Taj Mahal, Opéra de
  Sydney… — chacun avec sa hauteur en blocs et en mètres réels. On en choisit
  un, il se pose devant soi.
- **Il se pose bien**, pas n'importe comment : devant l'enfant et non sur lui,
  et le sol est cherché **sous chaque colonne de l'emprise** plutôt qu'une fois
  au centre — sans quoi un monument à cheval sur une pente flotterait d'un côté.
- **Un lot au lieu de sept mille messages.** La Tour Eiffel fait 6 972 blocs.
  Le jeu envoyait un message réseau **par bloc** : l'ami d'en face aurait vu le
  monument pousser pendant une minute, ou pas du tout. Les blocs partent
  désormais groupés, par tranches de mille.
- **`src/monuments.js` est enfin dans la liste des fichiers mis en cache** — il
  n'y était pas non plus, donc il ne serait jamais arrivé sur l'iPad.

**Et le portail apprend à choisir sa voie.** Une voie rapide (`fumee.js`, cinq
minutes) couvre ce qui casse vraiment quand on ne touche qu'au contenu : un
module qui ne charge pas, une erreur au démarrage, un enfant qui traverse le
sol, un bâtiment qui ne se pose pas. La voie complète reste **obligatoire** dès
qu'un fichier délicat bouge — réseau, sauvegarde, terrain, espace parent, ou le
banc lui-même. **C'est le code modifié qui décide, pas celui qui livre** : au
moindre doute, ou si git ne répond pas, voie longue.

**Ce qui le prouve.** `fumee.js` ouvre l'atelier comme l'enfant, compte les
21 monuments dans l'onglet, clique sur « Poser » et vérifie que le monde passe
de 1 à 6 973 blocs — puis qu'aucune erreur JavaScript n'est apparue. Et cette
livraison-ci, parce qu'elle touche `net.js`, est passée par le portail complet.

---

## v158 — construire beaucoup ne coûte plus ses blocs

**Pourquoi.** En regardant la vraie base : le profil de Marlon pesait
**901 886 octets** pour une limite fixée à 900 000. Il était donc *déjà*
au-delà. À chaque sauvegarde, le jeu taillait pour rentrer — d'abord ses
photos, puis **ses blocs les plus anciens**, dont il ne gardait que quatre
mille sur dix-sept mille quatre cent trente-cinq. En silence. Un enfant qui
construit beaucoup était puni de construire, et plus il bâtissait, plus il
perdait.

Deux causes, dans le même document. Ses huit photos y pesaient **319 Ko**, un
tiers de la place — or ce sont des JPEG déjà compressés, ils ne se réduisent
pas d'un octet. Et ses blocs y voyageaient **en clair**, alors que ce sont des
coordonnées répétitives qui se compressent dix fois.

**Ce que ça change.**

- **Les photos ont leur propre document**, rangé sous `prénom~photos`. Elles ne
  barrent plus jamais la route à une construction, et elles suivent toujours
  l'enfant d'un appareil à l'autre.
- **Les blocs partent compressés.** Mesuré sur la sauvegarde de Marlon :
  **848 849 → 157 054 octets**, cinq fois moins, blocs identiques au retour. Le
  navigateur sait le faire seul depuis iOS 16.4, sans rien installer.
- **Le plafond passe de 900 Ko à 4 Mo**, et surtout **il se mesure enfin sur ce
  qui part vraiment** — après compression, pas avant. L'ancienne version se
  croyait pleine cinq fois trop tôt. Il y a désormais la place pour des
  **centaines de milliers de blocs** ; le plafond est un garde-fou contre un
  document devenu fou, plus une limite qu'un enfant rencontre.
- **Quand il faut vraiment tailler**, on divise par deux jusqu'à ce que ça
  rentre au lieu de retomber d'un coup à quatre mille.

Le champ compressé porte un nom neuf (`editsz`) plutôt que de remplacer
`edits` : une tablette restée sur l'ancienne version ne le comprend pas, garde
donc ses propres blocs et les republie en clair. Elle n'abîme rien — là où un
`edits` devenu illisible lui aurait fait croire à un monde vide.

**Deux défauts de plus, trouvés par le portail en route.**

- **Un document de service apparaissait comme un enfant.** Le nouveau document
  des photos se glissait dans l'espace parent : tu voyais un quatrième prénom,
  « Alice~photos », dans ta liste déroulante. Le tri existait déjà — écrit la
  première fois que le cas s'est produit, avec « Alice~invit » — mais il se
  faisait table par table et ne couvrait que celle des réglages. Il est
  désormais au seul endroit où une fiche d'enfant naît : une table de plus ou
  un document de service de plus ne demandent plus rien à repenser.
- **Le réseau perdait des messages en silence.** Quatre envois contournaient la
  garde du jeu, dont **le journal de blocs envoyé à un enfant qui arrive** —
  celui qui porte tout le monde bâti. Ils étaient entourés d'un `try/catch`
  qui n'attrapait rien, parce que PeerJS n'échoue pas en levant une exception :
  il écrit l'erreur dans la console et rend la main. Le message partait dans le
  vide sans que personne ne le sache. Les quatre passent maintenant par la même
  garde, qui interroge le canal lui-même.

**Ce qui le prouve.** Une suite neuve, `sauvegarde.js` : un enfant pose
**quarante mille blocs** et huit photos, et l'on regarde ce que le nuage a
*vraiment* reçu. Sur l'ancien code, cinq témoins tombent — « 4 000 blocs relus
sur 40 000 posés », et le second appareil ne retrouve que ces quatre mille. Sur
le nouveau : quarante mille sur quarante mille, 121 Ko en tout, compression de
10,1×, et l'album arrive sur son propre document.

Et le **portail complet est vert, les huit suites dans la même exécution** —
c'est ce qui a coûté le plus de travail. Six portails ont été nécessaires, et
chacun a rendu un verdict rouge différent : quatre témoins jugeaient trop tôt
(un zoom lu avant le redessin, un décollage lu avant le premier tour
d'affichage, deux règles de monte lues pendant que la bête marche) et une suite
ne laissait jamais souffler la machine. Ils observent maintenant pendant la
fenêtre, et disent toujours la vérité si rien ne vient.

---

## v157 — la monoplace freine dans les virages

**Pourquoi.** Max, en essayant de jouer : « je n'arrive pas à monter sur la
formule un parce qu'elle va trop vite ». Elle roulait à dix-sept mètres par
seconde **partout**, épingles comprises — et le bouton d'embarquement ne se
rafraîchissait que quatre fois par seconde. La voiture traversait donc toute la
zone d'embarquement **entre deux clignements**.

**Ce que ça change.**

- **La monoplace regarde devant elle.** Le tracé sait dire de combien il tourne
  dans les seize prochains mètres ; la voiture freine avant le virage et relance
  en ligne droite, avec l'inertie qui rend le geste visible. De **14,5 m/s** en
  ligne droite à **4,5 m/s** en épingle — trois fois plus lente là où on veut la
  rejoindre. Le métro, lui, garde son allure : il roule sur des rails.
- **Le bouton regarde huit fois plus souvent** dès qu'un véhicule s'approche à
  moins de quinze mètres. Il ne propose d'embarquer qu'à quatre mètres — on ne
  monte pas dans une voiture qu'on ne touche pas — mais il ne rate plus le
  passage.

**Ce qui le prouve.** `monte.js` suit **une seule** monoplace pendant seize
secondes : « la monoplace ne roule pas à la même allure partout » (rapport de
3,2), « et elle ralentit assez pour qu'on puisse la rejoindre ». Puis le trajet
réel : l'enfant se poste au bord du circuit et attend — « quand la monoplace
arrive, on a le temps de voir le bouton ».

---

## v156 — l'enfant n'est plus seul dans un monde peuplé

**Pourquoi.** Marlon ne pouvait pas rejoindre le monde de la maison. Le jeu
disait « ce Wi-Fi bloque le jeu à plusieurs » sur un Wi-Fi familial parfaitement
sain. Le journal de production a montré la vérité : l'hôte répondait **en deux
secondes** par le nuage, mais la tentative de Marlon avait déjà fermé sa
connexion — deux millisecondes après l'avoir ouverte.

En cherchant, le banc d'essai en a sorti deux autres, plus graves parce que
muettes. Il reproduit une machine chargée — un iPad de famille un soir de
semaine — et c'est là qu'elles vivaient. J'ai cru trois fois qu'il se trompait
avant d'accepter qu'il avait raison.

**Ce que ça change.**

- **Le lien fantôme.** Quand le lien direct traîne, le nuage prend le relais —
  puis le direct aboutit quand même et le remplace. La boucle de présentation
  tenait encore l'ancien lien : à son réveil elle le trouvait fermé, se
  déclarait terminée, et personne ne la réarmait. L'enfant gardait un lien
  **ouvert, vivant, jamais présenté**. Aucune erreur, aucun message : juste
  invisible pour toujours. La relance ne retient plus qu'une clé de joueur et
  relit à chaque tour le lien du moment.
- **Le monde perdu en silence.** Le journal de blocs ne part qu'une fois, à la
  présentation. S'il tombait sur un canal pas tout à fait prêt — PeerJS le dit
  « ouvert » un instant trop tôt — il disparaissait sans un mot, et l'enfant
  arrivait dans un monde vide de tout ce que les autres avaient bâti. Il se
  renvoie maintenant jusqu'à passer.

- Une session arrêtée ne frappe plus à aucune porte : les minuteries des
  tentatives abandonnées ne réveillent plus le relais.
- **Le phare de l'hôte** : un hôte qui vit par le nuage écrit une ligne toutes
  les quinze secondes. Un invité dont le courtier répond « introuvable »
  l'interroge avant de conclure, et frappe par le nuage si le phare brille.
- **Plus de monde jumeau** : on ne peut plus ouvrir un monde dont le phare
  brille. C'était le pire risque — deux mondes sous le même code, qui divergent
  en silence sans que personne le voie.
- **Le message dit vrai** : quand le relais nous parle mais que personne ne
  répond, le réseau est hors de cause, et on le dit. « Le monde est bien là,
  personne n'y répond à l'instant » remplace l'accusation du Wi-Fi.
- **Le plafond du monde passe de 96 à 160 blocs** — la fondation des monuments
  à l'échelle. Le sol, lui, ne bouge pas d'un bloc : `SOMMET_TERRAIN` est figé
  et découplé du plafond.
- Le vol a un toit : on ne sort plus du monde par le haut.

**Ce qui le prouve.** **277 témoins**, sept suites. `plafond.js` est neuve :
elle vérifie l'empreinte du paysage sur **218 089 colonnes** et qu'une maison
sauvegardée avant le changement repose toujours sur son sol, ni enterrée ni en
l'air. Nouveaux témoins réseau : « un hôte sans courtier est trouvé par un
invité dont le courtier marche », « et il le REJOINT, au lieu d'ouvrir un monde
jumeau ». Et trois témoins qui existaient déjà ont fini par avoir raison contre
moi — « une présentation perdue finit par passer », « le lien muet est coupé
puis rouvert », « les blocs repassent après le retour » : ce sont eux qui
tenaient les deux défauts muets.

---

## v155 — on monte sur les bêtes, et on monte à bord

**Pourquoi.** Monter à cheval existait depuis longtemps et presque personne ne
l'avait jamais fait : il fallait viser l'animal dans un cône d'une vingtaine de
degrés, deviner qu'une touche existait, et tomber sur l'une des trois seules
espèces d'une liste écrite en dur.

**Ce que ça change.** Huit bêtes montables de plus — éléphant, zèbre, âne,
chameau, lama, autruche, sanglier, ours brun. Le bouton apparaît pour la
monture la plus proche devant soi, même de biais. La caméra s'élève à la hauteur
du dos : sur un âne on est à hauteur d'homme, sur un éléphant on domine les
toits. Et le métro et les monoplaces transportent enfin — un bouton apparaît
quand une rame arrive à portée.

**Ce qui le prouve.** 256 témoins. `monte.js` est neuve et suit le trajet
complet, dont « là où l'ancienne visée ne trouvait rien, la monte la voit » —
les deux règles comparées au même instant.

---

## v154 — l'enfant tue ses propres fantômes

**Pourquoi.** « Tu es déjà connecté ailleurs », trois lancements de suite, alors
que personne ne l'était. Chaque relance laissait derrière elle une identité qui
met deux minutes à mourir ; le jeu prenait ce cadavre pour l'enfant.

**Ce que ça change.** Chaque appareil signe son identité en ligne et efface
**ses propres** fantômes en entrant dans un monde — jamais ceux des autres.
C'est le receveur qui cède, pas l'émetteur : le fantôme tourne du vieux code et
ne peut obéir à une règle qu'il ne connaît pas. Et le nuage porte la partie
quand le serveur de rendez-vous se tait — après avoir vérifié qu'il répond
vraiment.

**Ce qui le prouve.** 234 témoins, dont « en arrivant, l'enfant efface ses
propres fantômes » et « et il ne touche pas à ceux des autres ».

---

## Avant v154

L'historique complet est dans `git log origin/main`, une fusion par version,
avec un message écrit pour être lu. Les grandes étapes :

| Version | Ce que ça apportait |
| --- | --- |
| v153 | Le courtier devient facultatif ; l'enfant n'est plus refusé par son propre reflet |
| v152 | Paris : douze registres d'architecture haussmannienne sur les façades |
| v151 | La moitié d'écran restée noire au retour dans l'application |
| v150 | La caméra marche, l'enfant muet retrouve sa voix, l'espace parent dit ce qu'il lit |
| v148 | Le nuage porte la partie quand le Wi-Fi bloque ; l'usine du Père Noël s'anime |
| v144 | La Chine dans la zone morte du nord ; le taux de réussite jour par jour |
| v142 | San Francisco relevée sur documents : Golden Gate, Karl the Fog, Pier 39 |
| v141 | Le hub Éducation filtre par enfant et par période |
| v139 | Nice relevée sur documents : port Lympia, Negresco, chaises bleues |
| v138 | Lille relevée sur documents : gare, deux beffrois, Treille, quai du Wault |
| v136 | Le chantier commun et la flèche vers l'ami |
| v133 | Le quiz revient toutes les dix minutes de jeu, et pas avant |
| v130 | Un VPN ne fait plus croire que le monde est vide |
| v128 | Voir qui est connecté, et l'inviter à venir jouer |
| v127 | Paris : ses îlots, ses cours et sa ligne de corniche |
| v125 | San Francisco : la presqu'île, les treize collines, les deux quadrillages |
| v124 | Le parc d'attractions, bâti d'après un vrai parc |
