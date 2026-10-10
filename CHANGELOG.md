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

## v416 — Paris rejoint Lyon

**Pourquoi.** Paris–Lyon était dans la liste du kit « monde fidèle » depuis la
v310, laissé de côté tant que `paris.js` était la zone d'une autre session, et
parce que le TGV court sur l'axe direct : une route qui le croise poserait son
remblai sur le ballast. Et Paris n'avait qu'une destination pour toutes ses
autoroutes : l'entrée de chaque route menait à la Gare du Nord, au nord de la
ville — une route arrivant du sud aurait traversé tout Paris en diagonale.

**Ce que ça change.** L'A6, l'autoroute du Soleil, sort de Paris plein sud par
la porte d'Italie et descend vers Lyon à l'ouest du TGV, dans la plaine (à l'est
du rail, un massif de près de soixante blocs), avec un seul pont sur un
ruisseau. Dans
Paris, une avenue mène de la porte à la place d'Italie, au bout des Gobelins
et du boulevard Arago ; à Lyon, la route entre par l'axe de sa trame, de
l'autre côté de la ville que l'A7. Vingt voitures font l'aller-retour, et de
Lille on peut désormais rouler jusqu'à Marseille.

**Ce qui le prouve.** Un témoin neuf de `carteMonde.js`, rouge sur l'ancien
code (ni convoi ni entrée) : l'A6 n'a aucun rail sous son emprise, ne frôle ni
Paris ni Lyon hors de ses tronçons radiaux, ses deux entrées de Paris roulent
sur la chaussée sans un bloc à hauteur de carrosserie et finissent au bout
d'une voie nommée, et celle de Lyon arrive sur la rue. Les témoins de toutes
les routes (profil, déblai 4,1, remblai 1,1, aérodromes, sanctuaires, emprise
partagée) la lisent sans changement. L'empreinte des 490 morceaux change —
Paris en est un des neuf lieux — et se prouve : l'A6 retirée, la branche rend
la constante d'avant au bit près, et les quatre-vingt-cinq colonnes qui
diffèrent sont toutes à moins de 11,2 blocs de l'axe de l'entrée.

---

## v415 — Londres rejoint Birmingham

**Pourquoi.** Londres–Birmingham était le corridor court sans rail du kit
« en attente » depuis la v323 : une autre session élargissait les rues de
Londres. C'est livré (v339) ; restait à trouver un passage. L'axe direct est
barré par une crête de 46 à 55 blocs, nord-sud, et l'ouest de Londres bute sur
un mur de collines qui finit dans la marge de Heathrow.

**Ce que ça change.** La M40 sort de Londres par le nord, monte vers le seul
col de la crête (41 à 46 blocs, à la latitude de Birmingham), passe deux
ruisseaux sur des ponts et entre dans Birmingham par l'axe de sa trame. Dans
Londres, une entrée en ligne droite mène de la porte nord à Pentonville Road,
devant King's Cross ; vingt voitures font l'aller-retour. Une maison de la
vieille trame générique, qui se posait encore dans l'anneau extérieur de
Londres et barrait cette entrée, cède désormais à la route et à son entrée.

**Ce qui le prouve.** Un témoin neuf de `carteMonde.js` (rouge sur l'ancien
code : ni convoi ni entrée) : la M40 n'a aucun rail sous son emprise, ne frôle
aucune de ses villes, son entrée de Londres est sur la chaussée d'un bout à
l'autre sans un bloc à hauteur de carrosserie et finit sur une artère, celle de
Birmingham arrive sur la rue. Les témoins de toutes les routes la lisent aussi
(profil à six pour cent, asphalte et contact au sol, tablier libre, aucune
emprise volée, joints des ponts fermés). L'empreinte des 490 morceaux change
(Londres est un des neuf lieux) et se prouve : M40 retirée, la branche rend
celle d'`origin/main` au bit près.
## v414 — Des ponts sous toutes les voies

**Pourquoi.** Dans quatorze villes engendrées, des voitures roulaient sur
l'eau sans pont : 159 pas de voie sur un fleuve ou un canal, hors de tout
tablier (Shanghai 46, Kyoto 24, Chicago 22, Bangkok 18, Istanbul 14,
Stockholm 13…). Deux causes, mesurées : un tablier se mesurait sur l'AXE de la
rue, et la voie, une demi-chaussée à côté, touche l'eau plus tôt là où la rive
est en biais ; et un anneau que ses quarante points de contrôle voyaient au
sec pouvait encore couper un ruisseau (la Kamo de Kyoto) — sans aucun pont.
La v404 l'avait déclaré, avec la règle : on ne retire jamais un tablier (un
enfant a pu bâtir dessus), on les allonge.

**Ce que ça change.** Les ponts s'allongent au-dessus de l'eau là où passe la
voie, et les petits canaux traversés ont enfin leur pont (trois sur la Kamo à
Kyoto, vus en capture, le bus passe dessus). Aucune voiture ne roule plus sur
l'eau. Aucune ville ne change de circuits, de voitures en vue ni de
couverture ; aucun pont d'avant ne bouge ni ne change de pierre.

**Ce qui le prouve.** Deux témoins neufs dans `carteMonde.js`, rouges sur
`origin/main` : les pas de voie sur l'eau hors tablier (159 → 0) et « un
tablier ne se retire pas » — par les fonctions pures, sur toutes les villes à
pont, aucune colonne d'eau d'avant perdue ni changée de matière, 1 485 colonnes
gagnées, toutes sur l'eau. Une sonde compare les deux arbres ville par ville :
circuits, couverture et distance de la voiture au centre identiques au bit
près. L'empreinte des 490 morceaux change (Rome en est) et se prouve : le même
code, les allongements retirés, rend la constante d'`origin/main` au bit près.
Le prix : déplier les anneaux de toutes les villes coûte 15 % de plus
(1 070 → 1 250 ms au total, une ville à la fois à l'approche), la pire ville
inchangée (Rome ≈ 90 ms) ; rien au démarrage.
## v413 — Le jeu ne plante plus en roulant : la flotte partage ses images

**Pourquoi.** Max : « le jeu plante de temps en temps ». Le journal de bord de
l'iPhone (`journal_appareil`) a compté onze plantages en quarante minutes le
10 octobre, des parties d'une à sept minutes. Le palier de sûreté était déjà
au plus bas, la couche HD éteinte. Les journaux ne montrent ni erreur ni gel :
la cadence reste entre 25 et 60 images par seconde, et la page meurt au milieu
d'un relevé normal. Une seule grandeur montait d'un bout à l'autre de chaque
partie, le nombre de textures (409 → 702 en cinq minutes). La cause est dans
les fichiers : les cinquante modèles de voitures portent 225 images, dont
seulement CINQ distinctes, octet pour octet. Le chargeur décodait la copie de
chaque modèle et l'envoyait à la carte graphique, soit environ 15 Mo par
modèle et 734 Mo pour la flotte entière, que la rue découvre à mesure que
l'enfant roule. iOS ne prévient pas : il ferme la page. Deuxième fuite, plus
petite : une voiture repeinte qui quittait la rue rendait au pilote la texture
de son prototype, qu'il fallait alors renvoyer à la carte graphique pour la
voiture suivante.

**Ce que ça change.** Le chargeur reconnaît une image à son empreinte et rend
la texture déjà décodée : toute la flotte tient dans cinq images, quelques
mégaoctets au lieu de plusieurs centaines. Les textures partagées sont
marquées, et une voiture qui s'en va ne les jette plus. Les voitures ne
changent pas d'un pixel : chaque image garde son rôle (teinte ou relief) dans
les cinquante fichiers, vérifié.

**Ce qui le prouve.** Un témoin neuf dans `realisme.js` charge huit modèles
texturés et compte les images décodées qu'ils tiennent : 36 sur l'ancien code,
5 ici. Il repeint ensuite une voiture et la libère : aucune texture du
prototype n'est rendue au pilote, contre dix sur l'ancien code. La preuve
sur le téléphone viendra du journal de bord : des parties longues sans
plantage, et un compte de textures qui ne grimpe plus.

---

## v412 — New York à deux, vérifié jusqu'au bout

**Pourquoi.** `manhattan.js` s'arrêtait souvent à la ligne 674 sur un
`TimeoutError` : l'ami qui rejoint un monde ouvert dans New York ne
« démarrait » jamais. Cinq témoins venaient après (le bloc partagé, le code
Terre dans le nuage, l'archive reprise, deux clients sans erreur, le jeu hors
ligne) et ne tournaient donc presque jamais. Déclaré « intermittence sous la
charge » depuis la v381. Rejouée seule, la suite s'arrêtait là deux fois sur
deux, sur la branche comme sur `origin/main`.

**Ce que ça change.** Rien dans le jeu : la cause était le banc. La page de
l'invité s'ouvrait pendant que l'hôte rendait Manhattan, qui tourne à 0,4
image par seconde en rendu logiciel et occupe les quatre cœurs de la machine.
Sur deux vraies tablettes, chacune a son processeur. Le témoin ouvre
désormais la page de l'ami d'abord, puis l'hôte entre dans New York et l'ami
le rejoint avec le geste de l'enfant (code, Rejoindre, Jouer).

**Ce qui le prouve.** Sonde (`sonde-invite-ny.cjs`) : hôte dans Manhattan,
le jeu de l'invité apparaît en 44 s puis au-delà de 90 s, sans une erreur ;
hôte hors Manhattan, en 13 et 18 s. Page ouverte d'abord
(`sonde-invite-avant.cjs`) : 3 sur 3, bloc propagé en 0,2 à 6 s. Rejouée
seule, `manhattan.js` va jusqu'au bout et les cinq témoins d'après sont
verts ; reste le rouge déclaré du trou de façade (17 102 → 54 969).

---

## v411 — Un pas de côté ne fait plus traverser la rue

**Pourquoi.** Le témoin du feu de la v402 l'a publié deux fois sur quatre, des
deux côtés : un passant du trottoir, au coin d'un carrefour, faisait un pas de
côté devant une voiture qui tournait… et ressortait sur le trottoir d'en face,
au vert. Le pas de côté partait du côté où le passant était par rapport à
l'AXE de la voiture ; quand la voiture tourne, cet axe est en biais, et ce
côté-là, c'est la rue d'à côté. L'écart durait jusqu'à deux secondes, assez
pour la traverser.

**Ce que ça change.** Un passant sur le trottoir qui s'écarte d'une voiture
roulant sur la chaussée ne descend plus dans la rue : il s'écarte vers le
trottoir, en biais si le côté naturel mène à la rue, ou de l'autre côté s'il a
le temps de passer, ou il reste sur place au bord, et la voiture, qui freine
devant un piéton, passe. Rien ne change sur la chaussée, ni devant une voiture
qui roule sur le trottoir (l'enfant au volant) : là, on s'écarte comme avant.

**Ce qui le prouve.** Une sonde sous node (`sonde-ecart-trottoir.cjs`) PROVOQUE
la situation aux coins des feux de Rome, Zurich, Paris et Londres, avec des
voitures droites et en virage, sans freinage : 92 écarts sur 125 descendaient
sur la chaussée avec l'ancienne règle, zéro avec la neuve, et les contacts sans
freinage tombent de 82 à 19 (ceux d'une voiture qui frôle la bordure). Un témoin
de `monte.js` (rejoué seul par `sonde-ecart-trottoir-page.cjs`) pose cinq
passants au coin d'un feu de Rome et leur envoie une voiture en biais :
`origin/main` 4 sur 5 descendus, deux fois ; la branche 0 sur 5, deux fois.

---

## v410 — Le passager se voit assis, même sans courtier

**Pourquoi.** Quand le serveur de rendez-vous ne répond pas (Wi-Fi d'hôtel,
école), la partie passe entièrement par le nuage depuis la v154. Un enfant
pouvait y monter en passager dans la voiture d'un ami — chez les autres il
était bien assis, mais **chez le conducteur il restait debout à côté de la
voiture** : le conducteur ne se reconnaissait qu'à son identité de courtier,
qu'il n'a pas dans ce cas (dette de la v253). La portière animée (v377) ne
s'ouvrait pas chez lui non plus, pour la même raison.

**Ce que ça change.** Sans courtier, le conducteur voit son passager assis
dans sa voiture, et sa portière s'ouvrir.

**Ce qui le prouve.** Un témoin neuf dans `reseau.js`, dans la partie à deux
sans courtier du tout. Sonde (`sonde-passager-nuage.cjs`) : sur `origin/main`,
le passager écrit bien chez qui il est assis, mais reste debout chez le
conducteur, 2 fois sur 2 ; corrigé, assis 3 fois sur 3, en moins de 50 ms. Au portail, `reseau.js` est verte
entière ; les rouges de `maj.js`, `carte.js`, `manhattan.js` et `monte.js` sont
déjà déclarés, et la double mesure les retrouve des deux côtés (`TASKS.md`).
## v409 — Le frein à main fait déraper la voiture

**Pourquoi.** La conduite « comme GTA » que demande Max n'avait pas de frein à
main : au joystick, la voiture tournait comme un train sur ses rails, sans
jamais pouvoir glisser dans un virage. Et mesuré sur la v408 sous node : au
volant, la barre d'espace faisait SAUTER la voiture d'un tiers de bloc — le
saut de la marche, resté branché.

**Ce que ça change.** En voiture, un bouton 🛑 « DÉRAPER » apparaît dans la
colonne de droite, au-dessus de « Descendre », sous le pouce droit pendant que
le gauche tient le volant ; sur ordinateur, c'est la barre d'espace. Tenu en
tournant, les roues arrière lâchent : la caisse tourne près de deux fois plus
qu'au seul volant (77° au lieu de 46° en 1,2 s à 30 blocs/s), l'arrière glisse
jusqu'à 54°, la voiture garde la moitié de sa vitesse, et au lâcher elle se
remet dans l'axe en moins d'une demi-seconde, sans à-coup. Pas de tête-à-queue,
et le frein à main ne fait rien bouger à l'arrêt. La voiture ne saute plus.
`?diag=1` dit le dernier dérapage (angle le plus large, durée).

**Ce qui le prouve.** Trois témoins, tous rouges sur la v408 : la dynamique
pure, classe par classe (rotation 1,6 à 1,9 fois celle du volant, contre 1,2 à
1,3 sans frein à main ; 16 blocs/s gardés ; retour dans l'axe en 0,4 s ; rien
ne bouge à l'arrêt) ; le vrai joueur sous node, barre d'espace tenue (la caisse
tourne plus, ne monte pas d'un centième de bloc — 0,29 sur la v408) ; et au
banc, le bouton hors du quart du joystick, sans recouvrir « Descendre », qui
tient le frein au toucher et disparaît à pied. Et une preuve d'identité : sans
frein à main, 240 000 pas de dynamique tirés au hasard rendent exactement la
v408.

---

## v408 — La voiture sent les collines, et suit les voitures lentes

**Pourquoi.** Mesuré sur `origin/main` par une sonde qui cherche de vraies côtes,
descentes et crêtes dans la campagne et y fait rouler le vrai joueur : une
sportive à plein gaz faisait 26,4 blocs/s au bout de quarante blocs, que ça
monte, que ça descende ou que ce soit plat — la pente n'existait pas pour la
voiture, et une crête la plaquait au sol au lieu de la faire décoller. Et
derrière une voiture de la rue plus lente, joystick en avant, la nôtre la
touchait à presque chaque image (139 contacts en cinq secondes derrière une
voiture arrêtée).

**Ce que ça change.** La montée ralentit (24,1 blocs/s au lieu de 26,4) et la
descente accélère (28,6) ; une voiture arrêtée dans une pente ne repart pas
toute seule. Une crête prise vite fait décoller la voiture, qui retombe —
environ une seconde de vol à 40 blocs/s sur une vraie colline. Derrière une
voiture plus lente, on la suit à un bloc et demi, sans la toucher, et l'on
freine franchement si on l'a vue tard ; foncer dessus reste un choc. La physique publie pour la caméra et le
son (session des sensations) le tangage de la caisse et chaque atterrissage
(`player.tangage`, `player.atterrissage`), et `?diag=1` affiche la pente, le
dernier saut et la voiture suivie.

**Ce qui le prouve.** Trois témoins sous node dans `plafond.js`, tous rouges
sur `origin/main` : la dynamique de pente rejoint ses formules fermées (côte à plein
gaz 40,95 contre 40,95, roue libre 19,46 contre 19,67) et aucune classe ne
reste au pied d'une pente d'un bloc par bloc ; le joueur sur une côte en dents
de scie ralentit sans jamais décoller, accélère en descente, décolle d'une
crête vive et publie son atterrissage ; collé derrière une voiture arrêtée, à
6 et à 12 blocs/s, zéro contact (139, 7 et 133 sur `origin/main`), et foncer
dessus reste un choc plein. La sonde `sonde-pente.cjs` (dix-huit lignes de
campagne) donne les chiffres ci-dessus. Un non-résultat est déclaré : lire la
façade d'un mur sur six blocs ne bat pas la v397 sur les vraies façades de
Paris.

---

## v407 — Le passager suit la voiture de son ami

**Pourquoi.** Au portail, « le passager entre par la portière droite »
(`reseau.js`, v377) allait et venait : Lou restait en « approche » puis la
séquence s'annulait. La séquence tenait le MAILLAGE de la voiture de l'ami ;
or une tablette refait ce maillage quand sa clé change ou quand l'ami est
recréé (une reconnexion). Elle concluait « la voiture n'existe plus », et
l'enfant restait à pied à côté de la voiture de son ami.

**Ce que ça change.** La séquence redemande à chaque image la voiture de CE
conducteur : si le maillage a changé, elle s'y rebranche (même place, même
cap) et l'enfant s'assied quand même ; si la voiture manque, elle attend une
seconde et demie avant de renoncer. Même chose en descendant.

**Ce qui le prouve.** Un témoin neuf dans `reseau.js` PROVOQUE l'état (la
tablette de Lou refait la voiture de Marlon pendant la marche) : vert sur la
branche (rebranchée une fois, assise), rouge sur `origin/main`. Et les deux
témoins du passager publient désormais, image par image, ce qui arrive à la
voiture de l'ami (`suivi`) : le prochain rouge se démontera en une lecture.

---

## v406 — Le GPS d'un ami passe par l'hôte

**Pourquoi.** Depuis la v388, quand un enfant choisit une destination sur sa
carte, ses amis reçoivent une proposition (« Marlon va à Rome — y aller
aussi ? »). Entre l'hôte et un invité, un témoin le prouvait. Mais à trois,
deux invités ne sont pas reliés entre eux : la destination de l'un n'arrive à
l'autre que dans la position que l'hôte RELAIE (`rpos`) — le chemin que la
v374 avait déjà oublié une fois pour l'histoire des chocs. La lecture était
écrite, rien ne la gardait.

**Ce que ça change.** Rien de visible : c'est le filet qui manquait. Nina
choisit Rome, Alice — qui n'a jamais eu de lien direct avec Nina — voit
« Nina va à Rome — y aller aussi ? », et son GPS ne change pas tant qu'elle
n'a pas touché le bouton.

**Ce qui le prouve.** Un témoin neuf dans `reseau.js`, à trois tablettes,
pendant la partie à trois du début de la suite. Sonde isolée
(`sonde-gps-rpos.cjs`) : sur la branche, 3 propositions sur 3, en 0,5 à 2,6 s ;
sur une copie d'`origin/main` où `rpos` ne lit pas `g`, rien chez Alice en
trente secondes, 2 fois sur 2.

**Et le portail.** `reseau.js` verte entière. `maj.js` deux rouges de la
préparation de l'accueil (déjà déclarés) : rejouée seule, branche verte,
`origin/main` rouge sur trois témoins dont le même. Une ligne de données de
`nouveautes.js` ne peut pas les causer.

---

## v405 — Les voitures encaissent les chocs

**Pourquoi.** Max : « les voitures s'abîment beaucoup trop vite. On fonce dans
deux trucs et elles tombent en panne. » Mesuré sur la v404, sous node, murs de
face à pleine force : fumée au 1er, **panne au 2e**, feu au 3e. Deux causes :
la zone avant perdait 0,55 par choc et calait le moteur dès qu'elle passait
sous 0,3, quelle que soit la santé ; et la force publiée par la physique vaut 1
dès 20 blocs/s d'impact normal, quand une voiture roule à 40-60 — presque tout
vrai crash compte comme le pire. Même dix bordures (force 0,3) mettaient la
voiture en feu.

**Ce que ça change.** Une tolérance « à la GTA » : la tôle se froisse dès le
premier choc (la déformation suit la force, comme avant) et le moteur fume dès
le deuxième mur de face, mais la voiture ne cale qu'au **neuvième mur à pleine
force** et ne brûle qu'au **douzième**. Les petits chocs n'usent presque rien
(la perte suit le carré de la force, comme l'énergie du choc) : dix bordures
retirent 7 % de santé. Une zone avant enfoncée réduit l'allure et fait fumer,
elle ne cale plus la voiture à elle seule. Le garage remet toujours tout à neuf.

| murs à force… | 0,3 | 0,6 | 1 |
| --- | --- | --- | --- |
| v404 de face : panne / feu | 5 / 10 | 3 / 5 | 2 / 3 |
| v405 de face, flanc, arrière : panne / feu | 98 / 132 | 25 / 33 | 9 / 12 |

À plusieurs, l'ami rejoue l'historique des chocs, porté de 12 à 24 pour qu'il
retrouve la même santé jusqu'au feu ; une tablette restée sur la v404 rejoue
cet historique avec l'ancienne règle et voit la voiture de l'ami en panne plus
tôt (le receveur cède, le format du message ne change pas).

**Ce qui le prouve.** Quatre témoins neufs ou repointés dans `tests/degats.js`,
vérifiés rouges sur la v404 : huit murs ne calent pas, le neuvième cale, le
douzième brûle, de face, de flanc et par l'arrière (v404 : 2 / 3 / 3) ; dix
bordures n'usent presque rien (v404 : en feu) ; l'allure baisse avant la
panne ; et au banc, deux vrais murs pris pleins gaz par la physique laissent
la voiture roulante. Le témoin réseau, rouge avec l'ancien historique de douze
chocs, rejoue la même santé chez l'ami.

## v404 — Les voitures font le tour de la place

**Pourquoi.** Dans les villes engendrées, beaucoup d'anneaux de voitures
roulaient en ligne droite au travers de ce qui n'est pas une rue : la place
centrale pavée, sa fontaine (les voitures passaient dans l'eau), un parc, une
plage. Mesuré sur `origin/main` : 147 anneaux sur 809, 3 512 pas de voie hors
de la chaussée, 167 dans une fontaine. Et onze petites villes portuaires
(Newcastle, Cardiff, Tallinn, Bergen, Reykjavik, Aarhus, Kuala Lumpur,
Melbourne, San Diego, San José, Guayaquil) n'avaient qu'un seul circuit. La
v387 l'avait mesuré et déclaré ; filtrer ces anneaux vidait treize villes.

**Ce que ça change.** Un anneau qui passait par la place la contourne
désormais par les rues d'à côté, comme un vrai tour de place ; la voiture ne
traverse plus la fontaine. Rien ne disparaît : chaque ville garde ses
circuits et ses voitures en vue, et huit des onze petites villes reçoivent un
second circuit, la même boucle dans l'autre sens, avec le bout de pont qui
lui manquait au-dessus de l'eau.

**Ce qui le prouve.** Deux témoins neufs dans `carteMonde.js`, sur toutes
les villes engendrées : les anneaux hors chaussée (92 au lieu de 147, 2 437
pas au lieu de 3 512, 82 dans une fontaine au lieu de 167) et les villes à un
seul circuit (3 au lieu de 11) — tous deux rouges sur `origin/main`. Mesuré
ville par ville par une sonde : aucune ne perd un circuit ni un point de
couverture, le pire partage reste 18 blocs, la voiture la plus lointaine du
centre reste à 30 blocs, aucun tablier n'est retiré (642 colonnes d'eau en
gagnent un), et le relief ne bouge pas. Le prix, déclaré : le premier
dépliage d'une ville coûte plus cher (Rome ≈ 57 → 85-100 ms, une fois, à 220
blocs de la ville).
## v403 — Le monde se charge aussi vite chez qui a beaucoup bâti

**Pourquoi.** Chaque morceau de monde que le jeu fabrique reçoit les blocs que
l'enfant a posés. Pour les trouver, il relisait le journal ENTIER de l'enfant,
bloc par bloc, pour chaque morceau — même au milieu de la campagne, où il n'y
en a aucun. Mesuré sous node avec un journal fabriqué (une maison, des
villages) : 1,25 ms par morceau sans blocs, 10 avec vingt mille, **36,6 avec
quatre-vingt mille** — et le journal de Marlon en comptait 83 780 en septembre.
Un avion fait fabriquer des dizaines de morceaux par seconde : plus un enfant
avait construit, plus le monde arrivait en retard devant lui.

**Ce que ça change.** Le journal se range par morceau, et c'est le journal
lui-même qui tient ce rangement à chaque bloc posé, retiré, chargé ou reçu
d'un ami : un morceau ne lit plus que les blocs qui sont dedans. Avec
quatre-vingt mille blocs, un morceau de campagne revient à son coût d'enfant
qui n'a rien bâti. Aucun bloc ne bouge.

**Ce qui le prouve.** Deux témoins dans `plafond.js` : un morceau ne parcourt
plus le journal (0 entrée lue, contre 80 000 sur la v391, où il est rouge), et
l'empreinte des blocs de 362 morceaux d'un journal fabriqué de quarante mille,
par trois chemins d'écriture, est celle relevée sur `origin/main` au bit près.
L'empreinte des 490 morceaux (v352) est intacte.

## v402 — On traverse aux passages peints

**Pourquoi.** Depuis la v371, un passant change de trottoir à un carrefour à
feux, et à Paris sur un passage peint sans feu. Ailleurs, sans feu à cinq
blocs, il tournait au coin : Kyoto rendait deux traversées en une minute.
Mesuré sous node avant d'écrire : les 65 villes engendrées dont la trame suit
les axes du monde peignent un passage à l'abord de chaque carrefour, feu ou
pas (Tokyo : 119 chemins de traversée sur un passage peint, dont 55 loin de
tout feu). Rome, Zurich et Londres n'en peignent aucun.

**Ce que ça change.** Dans ces 65 villes, un passant traverse aussi sur le
passage peint d'un carrefour sans feu, avec la règle de Paris : il part quand
aucune voiture n'arrive sur son chemin pendant toute la traversée. Kyoto, une
minute : 8 traversées dont 5 sur un passage, contre 2 (`sonde-traversees.cjs`).
La recherche coûte 1,2 ms au pire, au coin seulement. Le chemin doit être
ENTIÈREMENT peint (à moitié, le passant marchait au bord de la bande), et
l'approche du point de départ se fait en temps réel comme la traversée (au pas
du jeu, un passant qui n'arrivait pas à temps traversait d'où il était). Et le
témoin du feu publie chaque traversée qui n'est pas au rouge : le seul « au
vert » qu'il rendait était un passant POUSSÉ de l'autre côté par un pas de côté
devant une voiture, pas une décision — compté à part, et déclaré en dette.

**Ce qui le prouve.** Un témoin neuf dans `monte.js` POSE huit passants au bord
d'un passage peint sans feu, à Kyoto, et compte leur première traversée, la peinture lue sur la LIGNE de la traversée :
22 sur 22 sur le passage en trois passages (`sonde-passage-peint.cjs`), zéro
traversée sur `origin/main`. Portail sur la v398 : mes trois témoins de piétons
verts ; les rouges (GPS et glissé de `carte.js`, `reglages.js`, Manhattan,
circulation, embarquement, train, trou en vol) se retrouvent rejoués seuls sur
`origin/main`, souvent en plus grand nombre.


## v401 — Le monde entier en relief

**Pourquoi.** L'Europe (v394), Washington et San Francisco (v398) et les
Amériques (v399) avaient leurs façades en relief ; les cent douze villes
engendrées d'Asie, du Moyen-Orient, d'Afrique et d'Océanie restaient plates à
toute distance.

**Ce que ça change.** De près, chaque ville a des fenêtres en relief dans son
propre mur, avec le registre de sa géographie : Tokyo, Séoul, Shanghai,
Singapour en béton enduit à baies larges (`asie`) ; Riyad, Dubaï, Téhéran,
Samarcande et Lhassa en enduit couleur de sable à baies profondes (`desert`) ;
Bombay, Dakar, Lagos, Nairobi, Hanoï et les îles du Pacifique en enduit de couleur,
persiennes et garde-corps de fer (`tropical`) ; Sydney, Melbourne, Auckland,
Le Cap et Johannesburg en brique victorienne à guillotine et à fonte
(`victorien`) ; la Russie, Oulan-Bator et Harbin comme l'Est de l'Europe
(`nord`) ; le Maghreb, le Levant, l'Anatolie et le Caucase comme la
Méditerranée (`sud`). Les quatre médinas — Marrakech, Fès, Jérusalem,
Tombouctou — restent comme elles sont, et c'est dit : aucun registre n'y
dessine leurs petites baies grillées. Un appareil au palier bas ne reçoit
rien de neuf.

**Ce qui le prouve.** Vingt-neuf témoins neufs dans `parishd.js` : sept par
ville pour Tokyo, Dubaï, Lagos et Sydney (le mur de la ville, ni pierre de
Paris ni bardage, le budget…), et la couverture — toute ville engendrée a son
registre sauf les quatre médinas, avec les cas qu'une règle classerait mal
(Lhassa, Tbilissi, Harbin, Maputo, Honolulu). Mesuré sur 681 morceaux :
0,46 Mo de façades en moyenne, 1,59 au pire (Delhi). Paris, l'Europe et les
Amériques identiques à l'octet.
## v400 — On descend d'un avion par son escalier

**Pourquoi.** Depuis la v389 on MONTE dans un avion par un escalier (une
échelle pour le chasseur) ; on en DESCENDAIT encore d'un coup — l'enfant se
retrouvait debout au milieu du fuselage, et sur un avion arrêté au bord d'un
lac il se posait DANS l'eau (mesuré sur `origin/main` : `eau: true`). C'était
la dette déclarée de la v389.

**Ce que ça change.** Au premier appui on n'est plus aux commandes ; puis
l'escalier revient contre la porte, la porte (la verrière) s'ouvre, l'enfant
sort en se redressant, descend les marches (de face, ou face aux barreaux de
l'échelle), la porte se referme et l'escalier s'en va. Un second appui le pose
tout de suite au pied des marches. La place où il se pose se MESURE sur le sol
de la colonne : si le pied des marches tombe dans l'eau, sur une pente de plus
de quatre blocs ou dans un mur, il se pose d'un coup à une place libre autour
de l'appareil. Le Concorde (sans porte) et un avion en vol descendent comme
avant ; sous `embarq=0` (le banc) rien ne change, par construction. La ligne
`?diag=1` dit « par l'escalier » ou « sans escalier » et pourquoi.

**Ce qui le prouve.** Quatre témoins dans `monte.js` (le passage vit dans
`sonde-descente-avion.cjs`, rejouable seul en deux minutes) : les quatre
phases et l'état qui bascule au premier appui, pour l'avion de ligne et le
chasseur ; le second appui et le Concorde ; le pied des marches dans l'eau ;
aucune clé de programme neuve et aucun bloc écrit. Rejoués sur `origin/main` :
trois rouges sur quatre (et l'enfant dans l'eau).

---


---

## v399 — Les Amériques en relief

**Pourquoi.** Washington et San Francisco avaient leur relief (v398), mais les
soixante et une villes engendrées des Amériques — Chicago, Montréal, Mexico,
La Havane, Rio, Buenos Aires… — restaient en façades plates à toute distance.

**Ce que ça change.** De près, chaque ville des Amériques a des fenêtres en
relief dans son propre mur. Aux États-Unis et au Canada, la maison de brique
rouge et sa guillotine au châssis blanc, l'appui et le linteau de pierre, le
calcaire crème des immeubles (`nordAmericain`). Au sud de 24° N, et à Monterrey
et à La Nouvelle-Orléans (le Vieux Carré espagnol), l'enduit de couleur à peine
patiné et le garde-corps de fer forgé (`latino`). Honolulu et Papeete sont dans
le Pacifique : elles attendent le palier suivant. Un appareil au palier bas ne
reçoit rien de neuf ; Paris, l'Europe, Washington et San Francisco n'ont pas
bougé d'un octet.

**Ce qui le prouve.** Quinze témoins neufs dans `parishd.js`, rouges sur
`origin/main` : sept par ville pour Chicago (brique et pierre, ni volet ni fer)
et Mexico (enduit et fer, ni pierre ni volet), et la couverture — les
soixante et une villes ont leur registre, aucune île du Pacifique. Mesuré sur
505 morceaux : 0,44 Mo de façades par morceau en moyenne, 1,62 au pire (Buenos
Aires), contre 0,55 et 1,71 pour l'Europe.

## v398 — Washington et San Francisco en relief

**Pourquoi.** L'Europe entière avait sa couche de relief (v394), mais les deux
villes bâties à la main de l'autre côté de l'Atlantique — Washington et San
Francisco — restaient en façades plates à toute distance.

**Ce que ça change.** À Washington, la maison de ville fédérale : brique rouge,
fenêtre à guillotine au châssis blanc, appui et linteau de pierre ; les
ministères et les monuments en pierre de taille de calcaire et de marbre. À San
Francisco, le registre suit le quartier : les Victoriennes d'Alamo Square en
bardage de clins de bois peint (une tuile neuve de l'atlas), aux couleurs de
leur palette, avec leurs guillotines blanches ; la pierre de taille au centre
(le mur-rideau des tours garde sa tuile, il n'est jamais un trou) ; la brique
des entrepôts de SoMa. Un appareil au palier bas ne reçoit rien de neuf ; Paris,
Londres, Nice, Lille et les villes d'Europe n'ont pas bougé d'un octet.

**Ce qui le prouve.** Seize témoins neufs dans `parishd.js` ; sur
`origin/main` la suite neuve rend quatre rouges (« la ville n'est pas dans
`VILLES_HD` » pour chacune, le quartier à 0/0, la brique du jeu non lue) : sept par ville (couverture,
aucun bloc posé, `hd 0` identique, chaque face exposée détaillée — 1 306 et
1 522 —, le mur de la ville, pas le mobilier de Paris, le budget), le registre
qui suit le quartier à San Francisco (pierre 3 060 et bardage 0 au centre,
bardage 10 700 et pierre 0 à Alamo Square), et le bloc de brique du jeu lu à
Washington et à San Francisco, pas à Londres ni à Paris. Une empreinte des
tampons de vingt-cinq morceaux par lieu, relevée sur `origin/main` : Paris,
Londres, Nice, Lille, Rome, Berlin, Manchester, Istanbul, Tokyo et Mexico
identiques à l'octet, avec et sans HD ; Washington et San Francisco identiques
sans HD. Mesuré : 0,23 Mo par morceau en moyenne à Washington (2,11 au pire),
0,11 à San Francisco (0,59) ; dans le worker, 5,4 → 16,2 ms par morceau à
Washington, 2,2 → 6,3 chez les Victoriennes, seulement à portée de `RAYON_HD`.

---

## v397 — La voiture glisse le long des façades, et frôle les autres voitures

**Pourquoi.** Le palier 1 de la conduite (v358) prenait deux normales
commodes et fausses. Contre une voiture de la rue, celle du MOUVEMENT : frôler
son flanc était un choc de face, on rebondissait en arrière et les dégâts
comptaient un choc plein. Contre un mur, celle d'un axe du monde : sur une
façade oblique — une trame tournée, Paris, la moitié des villes engendrées —
le mur est un escalier de cubes, et la voiture s'y arrêtait net ou en était
renvoyée. Mesuré sur seize vraies façades obliques de Paris : 1,4 à 1,5 bloc
de trajet médian après le contact, puis l'arrêt. Et à plusieurs, l'ami ne
voyait ni le volant ni la glisse.

**Ce que ça change.**

- **On glisse le long des façades obliques** : la façade se lit sur la droite
  de ses faces exposées, et la voiture la longe au lieu de s'y coincer — trajet
  médian après contact 1,4 → 10,4 blocs (approche à 10°) et 1,5 → 14,3 (25°) ;
  ce qui l'arrête ensuite est la rue elle-même, un trottoir, un coin d'îlot.
- **Contre une voiture de la rue, le choc se juge dans son repère** : la
  normale de SON rectangle, et la vitesse RELATIVE. Un flanc frôlé est un choc
  léger sur notre flanc, et l'on continue ; percuter par l'arrière une voiture
  qui roule est un petit choc, et l'on repart derrière elle ; pare-chocs contre
  pare-chocs au pas, c'est un contact, pas un choc qui use la voiture.
- **À plusieurs, le volant et la glisse voyagent** avec la voiture : la copie
  de l'ami porte son braquage et sa dérive (à dessiner par la session des
  sensations).
- **`?diag=1` au volant** dit la classe, la vitesse, la pointe, le monde déjà
  maillé devant la voiture (en blocs et en secondes de route) et la dernière
  roue libre : ce que le banc ne sait pas mesurer, Max le relève sur l'iPad.

**Ce qui le prouve.** Six témoins neufs, tous vérifiés rouges sur l'ancien
code. Trois sous node dans `plafond.js` : la normale d'une façade lue à 1,63°
près en moyenne sur 1 200 contacts de 0 à 87° ; le choc contre une voiture
dans son repère (l'arrière à 0,5 au lieu de 1, le flanc à 0,17) ; et le JOUEUR
contre un mur oblique à 24° et 37°, deux approches — 57 à 66 blocs de glisse
contre 0,2 à 1,7 puis l'arrêt sur l'ancien code. Deux dans `monte.js`, par le
VRAI crochet contre une voiture de la rue garée : le flanc frôlé (choc 0,21,
sur notre flanc, 12 blocs/s gardés ; l'ancien code rendait 0,83 sur le nez et
un rebond), l'arrière percuté (le crochet rend sa boîte, choc franc sur le
nez). Un à deux tablettes dans `reseau.js` : le braquage et la dérive de
Marlon arrivent chez Alice. Deux sondes : `sonde-mur-oblique.cjs` (les seize
façades de Paris) et `sonde-vraie-rue.cjs`. Et le témoin « l'avant du
joystick est l'accélérateur », rouge des deux côtés depuis la v379 (voiture
lâchée relevée à 9,1 b/s pour une barre à 9,0), attend désormais la roue libre
en images de jeu et non en secondes de montre : 3,75 s de jeu calculées, trois
ou quatre seulement accordées par l'ancien budget au banc.

---

## v396 — La montée en voiture se valide sur la tablette

**Pourquoi.** Les séquences de montée et de descente (v366, v377, v384, v389)
ne se jugent qu'au banc, qui les saute partout ailleurs et rend en logiciel :
leurs durées, leur caméra et l'absence d'image figée n'ont jamais été vues sur
l'iPad, et rien ne disait à Max quoi regarder.

**Ce que ça change.** Avec `?diag=1`, une ligne dit après chaque geste ce qui
vient de se passer : « embarquement : monter (voiture) en 2,1 s de jeu,
jusqu'au bout » — ou « second appui », « annulée », et pour une descente le
côté et la raison d'un refus du côté conducteur. `TASKS.md` porte la liste
des six gestes à faire sur la tablette (voiture, second appui, descente, avec
un ami, l'avion, ce qui ne doit pas arriver). Rien ne change pour les enfants.

**Ce qui le prouve.** Un témoin neuf dans `monte.js` (le diagnostic dit
« monter (voiture), second appui »), rouge sur `origin/main` — rejoué seul par
`sonde-diag-embarq.cjs` : `null` sur `origin/main`, la ligne attendue ici.

---

## v395 — La rue roule à l'allure d'une ville

**Pourquoi.** Max : « des vitesses de circulation cohérentes — aujourd'hui les
véhicules sont trop lents ». Mesuré au-dessus de Paris sur `origin/main` : une
voiture de ville roulait à 4,2 blocs par seconde — quinze km/h —, médiane
1,7 et jamais plus de 5 ; l'autoroute à douze (43 km/h) ; et chaque arrêt au
feu se faisait d'un relevé au suivant (vingt-quatre arrêts « secs » sur
vingt-sept), la voiture passant de son allure à zéro.

**Ce que ça change.** Chaque voie a sa limitation — quarante km/h dans les
rues des villes engendrées, cinquante sur les avenues des villes bâties à la
main, cent vingt sur l'autoroute, cinquante à l'entrée des villes —, chaque
convoi son conducteur (±8 %). La voiture freine AVANT un virage, une entrée de
ville, un feu rouge, la voiture qui la précède, l'enfant, et désormais un
piéton ; elle réaccélère comme une voiture (0 à 50 en cinq secondes et demie).
Dans une file, chaque voiture freine là où ELLE est : la file se resserre dans
le virage et se détend dans la ligne droite. Sur les avenues de Paris,
Londres, Nice, Lille, San Francisco et Washington on roule à droite — deux
files se croisent sans se rencontrer. Le bus roule dans la file de son
anneau, sans plus marquer d'arrêt. Une voiture de la rue que l'enfant heurte
(`player.choc`, quand la conduite le publie) s'arrête quelques secondes, feux
de détresse allumés, puis repart. Et tout cela reste une fonction de
l'horloge partagée (v305) : deux tablettes voient la même rue.

**Ce qui le prouve.** Sept témoins neufs ou réécrits. Dans `monte.js`,
au-dessus de Paris : la croisière d'une avenue (15 blocs/s) et le 90e centile
des voitures visibles (7,4 à 11,7 contre 4,2 sur `origin/main`, barre 6,5) ; les arrêts
au feu, tous progressifs (aucun sec, contre 24 sur 27) ; les voitures l'une
dans l'autre en TAUX sur les paires examinées (0,5 à 3,9 %, barre 4 — le
compte absolu d'avant allait de 0 à 53 sur le même code, v277) ; une voiture
heurtée qui s'arrête, clignote et repart ; une voiture qui s'arrête devant un
piéton posé sur sa route, à 4,4 blocs de lui. Dans `carteMonde.js` : la règle
pure (`circulation.js`) — 40/50/120 km/h, un coin pris à 3,1 blocs/s après
dix-huit points de freinage, une relance jamais plus vive que l'accélération
d'une voiture — et l'A1 à 120 km/h qui ralentit à moins de 6 pour entrer en
ville. Dans `reseau.js`, le témoin des deux tablettes mesure l'heure de rue et
la place à heure égale, parce qu'à cinquante km/h une seconde de lecture vaut
quatorze blocs. Tous rouges sur `origin/main` sauf la garde du taux de
chevauchement, verte des deux côtés à dessein (elle garde une capacité).
Et le portail a trouvé ce que les sondes n'avaient pas vu : au croisement du
circuit en huit de Paris, deux voitures de la même file se présentaient
ensemble et la seconde finissait par traverser la première (taux 7,5 %). La
grille choisit désormais un nombre de voitures qui ne s'y rencontrent pas :
0,4 à 1,6 % de paires au contact selon le passage (7,5 % avant), aucun
arrêt sec.
Coût mesuré : `vehicules.update` 0,7 → 1,5 à 1,7 ms par image au-dessus de
Paris (`sonde-cout-circulation.cjs`).

**Et un ami voit la même rue même quand l'hôte rame.** Second sujet de la
livraison. Pourquoi : `reseau.js` « deux tablettes voient la même
circulation » rougissait une fois sur deux, sur `origin/main` comme sur la
branche (35 blocs d'écart). L'hôte annonce l'heure de la rue avec celle du
ciel « toutes les trois secondes » — un compte à rebours en `dt`, borné à un
vingtième de seconde : à deux images par seconde, une annonce toutes les
trente secondes, et un invité qui avait calé gardait sa rue en retard jusque
là. Ce que ça change : l'annonce se cadence en temps réel (`cadence.js`,
v226). Ce qui le prouve : un témoin de `reseau.js` fait ramer l'hôte (400 ms
par image, douze secondes) et compte les annonces — quatre attendues, au
moins trois exigées.

**Et devant l'enfant, une voiture pile quand il le faut.** Le premier portail
de la v372 a rendu « la circulation s'arrête devant la voiture de l'enfant »
rouge : trois et quatre relevés au travers sur deux passages seuls de
`monte.js`, zéro sur la v363. Le freinage doux ne suffisait pas à une voiture
qui voit l'enfant tard, et une fois au contact elle passait au travers.
Devant une personne, elle pile désormais dès que le freinage d'urgence ne
suffit plus.

---


---

## v394 — Toute l'Europe en relief

**Pourquoi.** Après Londres, Nice et Lille, les quatre-vingt-dix villes
engendrées d'Europe — Rome, Berlin, Barcelone, Amsterdam, Édimbourg… —
restaient en façades plates à toute distance. C'était la fin de la consigne de
Max : « when done do all European cities ».

**Ce que ça change.** De près, chaque ville d'Europe a des fenêtres en relief
dans son propre mur (la couleur de sa palette, patinée) : au sud de 45,5° N,
les persiennes, le garde-corps de fer et le store de la boutique ; au nord,
l'encadrement et le linteau de pierre sur la brique ; dans les îles
britanniques, la guillotine géorgienne de Londres. Trottoirs relevés, arbres
maillés, devantures et corniches en relief. Ni Tbilissi, ni Ankara, ni le
Maghreb : ils ne sont pas en Europe. Un appareil au palier bas ne reçoit rien
de neuf ; Paris, Londres, Nice et Lille n'ont pas bougé d'un octet.

**Ce qui le prouve.** Vingt-deux témoins neufs dans `parishd.js`, rouges sur
`origin/main` : sept par ville pour Rome (sud), Berlin (nord) et Manchester
(îles britanniques) — couverture, aucun bloc posé, tampons d'avant sans HD,
chaque face exposée détaillée, le mur et les ornements du registre, pas de
mobilier parisien, morceau le plus lourd sous 3 Mo — sur 1 676 morceaux des villes engendrées, 0,55 Mo en moyenne et 1,71 au pire (Barcelone) — et
un témoin de liste : les villes de la boîte européenne ont leur registre, pas
celles qui n'en sont pas. Et le fer se compte enfin : la ferronnerie s'émet
en UV absolus, elle ne se reconnaissait pas à sa tuile, et les « pas de fer »
de Londres et de Lille étaient vrais à vide ; comptés à la matière, ils
rendent zéro (Rome : 8 304 sommets).

---

## v393 — Celui qui part dit au revoir

**Pourquoi.** À trois en ligne, quand un enfant quittait la partie, les deux
autres le gardaient parfois à l'écran une minute et demie : immobile, puis
évanoui sans qu'on sache pourquoi. Le jeu écrivait « on prévient les autres
joueurs avant de disparaître » — et n'envoyait rien : il comptait sur la
fermeture du lien, qui ne traverse pas toujours (une tablette qu'iOS suspend
au lieu de la tuer, un canal qui reste « ouvert » de l'autre côté). Le témoin
« un départ propre nettoie tout le monde » rougissait de loin en loin des deux
côtés depuis des versions.

**Ce que ça change.** Celui qui part envoie un adieu à chacun avant de couper ;
l'hôte le retire tout de suite et le dit aux autres. Une tablette restée sur
une ancienne version connaît déjà ce message. Et le témoin de la voix après
un appel vidéo, qui rougissait lui aussi de loin en loin, mesure désormais ce
qu'il annonce : le volume du jeu rendu après l'appel.

**Ce qui le prouve.** Une sonde reproduit le départ sans fermeture de lien :
ancien code 0 nettoyage en 60 s sur 2 passages, nouveau 3/3 en ≈ 1 s. Le
témoin de `reseau.js` provoque désormais ce cas lui-même — suite entière
verte, 80 témoins. Pour la voix : sans aucun appel, deux fenêtres de 1,5 s de
radio varient déjà de 0,68 à 1 ; la radio relancée sans appel et la radio
après l'appel rendent la même distribution, gain revenu à 1 cinq fois sur
cinq. Le témoin juge le gain et un niveau au-dessus de la moitié, et il rougit
sur une copie où la voix reste au quart (gain 0,25).
## v392 — Nice et Lille en relief

**Pourquoi.** Le palier A avait donné son relief à Londres ; Nice et Lille, les
deux autres villes d'Europe bâties à la main, restaient en façades plates à
toute distance — et leur palette de décor (l'orange de signalisation, le jaune
de balise à Nice ; un rouge de jouet à Lille) se voyait telle quelle.

**Ce que ça change.** De près, Nice a ses enduits ocre, rose et sable, patinés
vers un vrai ocre, ses persiennes ouvertes de part et d'autre des baies et son
garde-corps de fer. Lille a sa brique flamande patinée, l'encadrement et le
linteau de pierre blonde. Les deux villes ont le trottoir relevé et leurs
arbres maillés ; ni colonne Morris ni banc de Paris. Un appareil au palier bas
ne reçoit rien de neuf ; Paris et Londres n'ont pas bougé d'un octet.

**Ce qui le prouve.** Quatorze témoins neufs dans `parishd.js` (sept par
ville), rouges sur `origin/main` : la couche couvre la ville, ne pose aucun
bloc, rend les tampons d'avant sans HD, détaille chaque face exposée, pose le
mur de la ville (enduit et persiennes à Nice, brique à Lille, jamais la pierre
de Paris), sans mobilier parisien, et le morceau le plus lourd pèse moins de
1,1 Mo (Nice 0,74, Lille 1,06 ; Paris 10).

---

## v391 — La tablette mesure sa vitesse au sol

**Pourquoi.** Le plafond de vitesse des voitures (`VITESSE_SOL_MAX` : 70 blocs
par seconde en ville, 80 en campagne) a été mesuré au banc, qui rend en
logiciel à une cadence qui n'est pas celle de l'iPad. Il ne peut se confirmer
que sur la tablette, et rien ne permettait à Max de le relever sans une session
de développement à côté.

**Ce que ça change.** Avec `?diag=1`, dès qu'on roule, une ligne de plus :
« roulage : vitesse · trou devant soi (le monde maillé dans le champ, ±40°
autour du déplacement) · débit de morceaux par seconde · file · ordre ·
recharge ». Le journal de bord la range toutes les cinq secondes
(`roulage: { v, trou, debit }`), si bien qu'un essai de Max se relit dans le
nuage sans rien recopier. La marche exacte — adresse, ville, avenue, ce qu'il
faut relever et ce qui décide — est dans `TASKS.md`. Sans `?diag=1`, rien ne
change.

**Ce qui le prouve.** Deux témoins dans `monte.js` : la règle pure (un trou
connu, un débit connu) et la page (à quarante blocs par seconde, la ligne
paraît et porte des nombres ; à l'arrêt elle n'y est pas). Rouges sur l'ancien
code : la règle n'existe pas, la ligne non plus. Portail complet.

---

## v390 — Londres en relief

**Pourquoi.** Max : « when done do all European cities ». La couche de détail
(façades en relief, trottoirs relevés, arbres maillés) ne couvrait que Paris :
`couvreHD` testait le seul disque de Paris. Londres, à cinq heures de vol
virtuel, restait en cubes plats à toute distance — des fenêtres peintes sur
des murs de brique de jouet.

**Ce que ça change.** De près, Londres est en relief : chaque fenêtre est une
guillotine géorgienne en retrait, haute et étroite, son châssis blanc, le rail
de rencontre au milieu, l'appui de pierre et l'arc de briques au-dessus. Le mur
autour est celui de la maison : la brique (patinée, plus une brique de jouet)
ou le stuc blanc de Belgravia. Le trottoir est relevé, les arbres des squares
sont maillés. Pas de colonne Morris à Londres : le mobilier de Paris reste à
Paris. Un appareil au palier bas ne reçoit rien de neuf ; Paris n'a pas bougé
d'un octet.

**Ce qui le prouve.** Huit témoins neufs dans `parishd.js`, rouges sur
`origin/main` : la couche couvre Londres ; elle ne pose aucun bloc (morceau le
plus dense, à l'octet près) ; sans HD les tampons sont ceux d'avant ; chaque
face exposée d'une façade ou d'un mur reçoit son détail (1 274 sur 1 274) ; le
mur est de brique ou d'enduit, jamais de la pierre de Paris ; ni Morris ni
Davioud ; le morceau le plus lourd pèse 1,2 Mo (Paris en pèse 10) ; en vol au
palier moyen, 22,5 Mo de façades pour 128 de budget. Un bloc de décor à motif
posé par un enfant garde son dessin. L'empreinte des tampons HD de Paris
(256 morceaux) est identique sur `origin/main` et sur la branche.

---

## v389 — On monte dans l'avion par l'escalier

**Pourquoi.** Depuis la v366 on marche jusqu'à la portière d'une voiture,
on l'ouvre, on s'assied. Les avions, eux, montaient d'un coup : l'enfant
était aux commandes à l'instant même où il appuyait, sans jamais approcher
la porte.

**Ce que ça change.** Pour l'avion de ligne : un escalier roulant aux
rampes jaunes vient contre la porte avant gauche, l'enfant y marche, gravit
les marches, la porte s'ouvre, il entre en se baissant, il est aux
commandes, la porte se referme et l'escalier s'en va. Pour le chasseur : une
échelle contre le cockpit, et c'est la verrière qui se lève. Le Concorde
monte d'un coup comme avant — son fuselage mesure 0,94 bloc, une porte y
ferait la moitié de la taille de l'enfant ; c'est le modèle qui le déclare.
Un second appui met aux commandes tout de suite.

**Ce qui le prouve.** Trois témoins neufs dans `monte.js` (page `embarq: 1`),
rouges sur `origin/main` (rejoués par `sonde-embarquement-avion.cjs`,
deux minutes) : les phases approche → gravir → ouverture → entrée
pour l'avion de ligne et le chasseur, `montureConduite()` faux pendant chacune,
les pieds montés de plus d'un bloc, la porte ouverte puis refermée, l'escalier
posé puis rangé ; le second appui en pleine marche et le Concorde sans porte ;
et aucune clé de programme neuve, aucun bloc écrit.

---

## v388 — Le GPS se partage avec un ami

**Pourquoi.** Depuis la v306, un enfant choisit sa destination sur la carte et
une flèche le guide. À deux, Marlon qui part pour Rome ne pouvait pas le dire
à Alice autrement qu'à voix haute : la destination restait sur sa tablette
(dette de la v321).

**Ce que ça change.** Chez l'ami, un bandeau : « Marlon va à Rome — y aller
aussi ? ». Un toucher sur « 🧭 Y aller » lance son GPS vers le même endroit ;
sinon rien ne change — un GPS déjà en cours n'est jamais remplacé sans qu'on
le demande. La destination voyage avec la position, si bien qu'un ami qui
arrive en cours de route la reçoit aussi, et qu'une partie sous un hôte resté
sur une ancienne version la transmet quand même. Au passage, l'histoire des
chocs de la rue (v374) passe enfin aussi par la position relayée entre deux
invités.

**Ce qui le prouve.** Un témoin à deux pages dans `reseau.js` : Alice roule
vers Lyon, Marlon choisit Rome ; la proposition arrive (0,5 s à la sonde),
Alice garde Lyon jusqu'au geste, puis `__gps().nom === 'Rome'`. Sur
`origin/main` (v383), rien n'arrive en vingt secondes (`sonde-gps-ami.cjs`).

---

## v387 — Plusieurs circuits dans chaque ville, et les deux sens

**Pourquoi.** Dans 153 des 262 villes engendrées (sur la v379), les voitures
ne faisaient qu'UN tour, toujours dans le même sens — dont 48 villes à tours
(Houston, Melbourne, Taipei…) depuis la v282. Le plus petit circuit d'une
ville roulait au milieu de la rue au lieu de sa voie de droite. Et les
circuits passaient dans les monuments : la v378, livrée en parallèle par une
autre session, l'avait réglé de son côté ; cette livraison le règle aussi, et
il fallait n'en garder qu'une façon.

**Ce que ça change.** Presque chaque ville a désormais deux circuits ou plus
(251 sur 262), de nouveaux tours autour d'un, deux ou trois pâtés de maisons,
et des voitures dans les DEUX sens sur la même rue, chacune dans sa voie. Plus
aucune voiture ne passe dans un monument : à Agra, Istanbul, Rome, Munich,
Séoul, Dubaï, Amsterdam et Prague, des tours de quartier contournent les
monuments et rendent la couverture d'avant. Les circuits d'une ville se
calculent quand l'enfant en approche, plus pendant l'écran d'accueil — comme
en v378, dont le filtre et le dépliage sont remplacés par ceux-ci (un seul
code pour une seule règle), sans qu'aucune ville ne perde de couverture ni sa
voiture en vue par rapport à la v379.

**Ce qui le prouve.** Trois témoins neufs dans `carteMonde.js`, sur toutes
les villes et vérifiés rouges sur `origin/main` (v373) : 251/262 villes à
plusieurs circuits (115 avant, 109 sur la v379) ; 1 063 côtés de rue partagés, sens contraires à 3,2
blocs au moins pour deux demi-largeurs de 2,26 (49 avant, sans aucun sens
contraire) ; zéro pas de carrosserie dans un monument (1 613 avant, 43
anneaux). Les deux témoins de la v378 restent verts sur ce code : zéro
monument en travers sur 123, et les anneaux dépliés sont les mêmes que le
calcul entier (262 villes). Le témoin « à droite » de la v271 relu à l'axe de la rue : 0 relevé à
gauche (325 sur `origin/main`). Le témoin des ponts lit les 56 villes à pont
au lieu de quinze : Agra, Berlin et Munich réglés — un tablier d'anneau
porte désormais un bloc de plus à chaque bout, pour la colonne arrondie que la
voiture prend encore —, Séoul et Chicago déclarés (culées
d'anneaux d'avant, mêmes valeurs sur `origin/main`). Aucune ville ne perd de
couverture ni sa voiture en vue depuis le centre (sonde ville par ville), le
partage dans le même sens reste sous vingt blocs (14,8). L'empreinte des 490
morceaux change à Rome et à Tokyo seulement, et chaque colonne différente est
sur un tablier d'avant ou d'après.
## v386 — La chauffe de New York se mesure seule

**Pourquoi.** « Se téléporter dans une ville ne compile plus de programmes »
était rouge depuis des dizaines de versions, des deux côtés : la chauffe de New
York « expirée » à 44 à 163 sur 321. On ne savait pas si un enfant qui arrive à
New York voit l'image se figer, ou si c'était le banc.

**Ce que ça change.** Rien dans le jeu, parce que le jeu tient : la sonde
`sonde-programmes-paris.cjs` rejoue le trajet exact du témoin — chauffe finie en
9 s (16 s bridé ×6), zéro programme neuf à l'arrivée à Paris, New York et
Lille, de jour comme de nuit. Le témoin attend désormais la chauffe jusqu'à 150 s
et dit combien de temps elle a pris ; sa garde d'images suit le pire relevé
vivant ; et quand un programme se compile quand même, il nomme la case de sa clé
qui diffère.

**Ce qui le prouve.** La sonde, cinq passages (seul, nuit, bridé ×4 après la
chauffe, bridé ×6 depuis l'accueil). Portail : `monte.js` et la fumée.
## v385 — Les passants quittent la chaussée

**Pourquoi.** Le témoin de la v380 a nommé qui restait planté au milieu de la
rue à Rome : des flâneurs (des passants qui n'ont pas de trottoir à suivre), en
pause, encore à leur poste de naissance — sur l'asphalte. Le programme de
flâneur fait quelques pas au hasard autour d'un poste : posé sur la chaussée,
il y reste. Et `posteAutour`, faute de trottoir, gardait la chaussée comme
second choix de naissance. Mesuré avant d'écrire : sous node, 1 600 poses dans
Rome, Paris, Londres, du centre jusqu'au bord, toutes sur un trottoir ; sur une
page neuve, zéro naissance sur la chaussée en soixante secondes. L'état arrive
donc par des portes qu'une page neuve ne montre pas — d'où un remède qui ne
dépend pas de la porte.

**Ce que ça change.** Un flâneur qui se trouve sur la chaussée sans la
traverser marche jusqu'au bord le plus proche (le trottoir d'abord), en temps
réel, et y prend son poste : la flânerie reprend hors de la rue, et un trottoir
trouvé le refait promeneur. À la naissance, la bordure, l'esplanade et l'herbe
passent avant la chaussée, qui n'est plus qu'un tout dernier recours.

**Ce qui le prouve.** Un témoin neuf dans `monte.js` qui PROVOQUE la situation
— trois flâneurs posés sur l'asphalte de Rome, leur poste aussi, en pause —
et lit où ils sont arrivés : ici trois sur trois sur le trottoir en 3,3 à
4,5 s (poste compris) ; sur `origin/main`, trois sur trois encore sur la
chaussée après 17 s, poste compris (`sonde-sortie-chaussee.cjs`, des deux
côtés). Le témoin d'avant (« ne sont plus plantés au milieu de la chaussée »)
reste : c'était un tirage, celui-ci est un gardien. Portail : quatre suites,
les rouges sont des dettes déclarées (façade et taxi de Manhattan, compilation
à New York) et « un piéton frôlé sursaute » (1,24 s pour une barre à 1,2),
rejoué seul trois fois des deux côtés : 0,67 à 0,83 s ici, 0,70 à 0,91 s sur
`origin/main` — de la charge, et ce piéton est posé en mer, où la règle neuve
ne trouve jamais de chaussée.


## v384 — On descend de la voiture d'un ami par la portière

**Pourquoi.** La v377 faisait monter le passager d'un ami par la portière
droite ; la DESCENTE restait instantanée — Lou se retrouvait debout d'un
coup à côté de la voiture de Marlon, et la portière de Marlon ne bougeait
pas. La moitié du geste manquait.

**Ce que ça change.** Le passager ressort par la portière droite, à
l'envers de la montée : la portière s'ouvre, il sort, se pose debout à
côté, la portière se referme. Si la droite est bouchée (un mur, l'eau, une
voiture qui arrive), il sort côté conducteur ; si tout est bouché, il est
posé à côté sans animation. Le conducteur — et tout autre joueur — voit la
portière s'ouvrir chez lui, par le même message court que la montée. On
n'est plus passager dès le premier appui ; un second appui termine tout de
suite.

**Ce qui le prouve.** Un témoin neuf dans `reseau.js`, à deux tablettes lues
au même instant : phases « ouverture » et « sortie » chez Lou, portière
droite ouverte à 1,05 rad puis refermée chez Marlon, `passagerDe()` faux sur
chacun des 52 relevés. Rouge sur `origin/main` (aucune phase, portière
fermée de bout en bout), vert ici. La sonde `sonde-descente-passager.cjs`
rejoue montée et descente seules en deux minutes.

---

## v383 — La rue n'entre plus dans la voiture d'un ami

**Pourquoi.** Depuis la v305, la circulation cède le passage aux amis comme à
l'enfant : sur la tablette d'Alice, la voiture de Marlon arrête la rue. Le
témoin de `reseau.js` le prouvait pour la voiture qui arrive derrière lui,
mais publiait une gêne qu'il n'expliquait pas : une AUTRE voiture entrait
encore une fois dans celle de Marlon, sur l'ancien code comme sur le neuf.
Trois pistes étaient déclarées (le cap de l'ami lu sur son regard, sa position
réseau en retard, une voiture d'un convoi voisin arrivée de travers). Une sonde
qui relève, image par image chez Alice, chaque voiture qui touche celle de
Marlon et ce que la rue en pensait (`sonde-intrus-ami.cjs`) a tranché : ce
n'était aucune des trois. Les cinq voitures entrées avaient TOUTES l'ami et
une voiture de la rue dans leur liste de gêne ; la règle « devant l'enfant on
attend sans limite » ne valait que quand l'enfant était SEUL sur le chemin.
Avec un carrefour en plus, la voiture retombait sur la patience de quatre
secondes, puis se lançait deux secondes à l'aveugle — au travers. Et la même
règle valait pour l'enfant de la tablette : sa propre voiture n'était pas à
l'abri non plus à un carrefour.

**Ce que ça change.** Dès qu'un joueur (l'enfant, un ami) ou un train est sur
le chemin d'une voiture de la rue, elle attend, quoi qu'il y ait d'autre
devant elle ; la patience ne sert plus qu'à dénouer deux voitures de la rue
entre elles. À plusieurs, la voiture d'un ami garée dans la rue n'est plus
traversée.

**Ce qui le prouve.** La sonde, même protocole des deux côtés : ancien code,
cinq voitures entrées sur onze poses mesurées (toutes en `repart`, l'ami et
une voiture de la rue dans leur gêne) ; code neuf, zéro sur dix. L'écart de
position réseau mesuré (0 à 0,17 bloc) et le cap posé identique écartent les
deux pistes réseau. Le témoin de `reseau.js` fait désormais entrer ce compte
dans son verdict (« … et aucune ne lui passe au travers »).
Et un témoin de `monte.js` était vert GRÂCE à la panne : l'enfant posé sur la
piste voyait le bouton de la monoplace parce qu'elle finissait par lui passer
au travers (5,4 s sur l'ancien code). Il est posé au bord du circuit, comme
son commentaire l'annonçait (bouton en 0,3 s).

---

## v382 — Le cône se mesure à chaud

**Pourquoi.** Le témoin « à soixante blocs par seconde dans Paris, le monde se
maille dans le champ » était rouge des deux côtés depuis la v375 : écart 0,02 à
0,07 pour une barre à 0,13, quand la v346 mesurait 0,29. On croyait le gain de
l'ordre en cône perdu, peut-être absorbé par la recharge à l'arrivée des v360 et
v379 — et une dette de ma zone attendait qu'on choisisse entre baisser la barre
et retirer l'ordre.

**Ce que ça change.** Rien dans le jeu : c'était le témoin. Une sonde
(`sonde-cone-banc.cjs`, une seule page, trois paires en ordre alterné) a séparé
les cas. Ordre neuf 0,42 · 0,87 · 0,87, ordre d'avant 0,65 · 0,63 · 0,67 : le
gain est là (0,22), et c'est le PREMIER passage dans Paris — la première
arrivée, ses convois, ses passants, 5,3 images par seconde et 80 morceaux contre
11,9 et 281 — qui l'écrasait ; l'ABBA le mettait toujours sur l'ordre neuf. Le
témoin joue désormais un passage d'échauffement, non compté. Et la sonde dit ce
que le cône vaut vraiment : dans une scène vide (0,84 des deux côtés) et la
recharge à l'arrivée armée (0,72 contre 0,70, 90 morceaux par seconde), le
worker suit et l'ordre n'a plus rien à décider. Le cône ne compte que quand le
débit manque — une tablette qui arrive dans une ville.

**Ce qui le prouve.** La sonde, douze passages publiés dans le commit. Le
témoin repointé ; joué avec l'ordre d'avant des deux côtés, il rend l'écart des
passages « regard » de la sonde (0,02 à 0,04), sous la barre : il peut encore
rougir. Portail : `monte.js` et la fumée.

---

## v381 — Plus de trou au bout des ponts, et le Tōmei

**Pourquoi.** Au bout d'un pont de Berlin, une colonne d'eau sans tablier : la
voiture y tombait (dette déclarée en v362). Mesuré sur toutes les villes à
pont, ce n'était pas un cas : 437 colonnes d'eau sans tablier aux bouts des
ponts de quarante-neuf villes. Le tronçon mouillé se mesure sur l'axe du pont,
et une colonne du monde voisine de l'axe peut être de l'eau un demi-bloc avant
le premier point mouillé.

**Ce que ça change.** Le tablier se prolonge d'un demi-bloc à chaque bout, et
seulement sur l'eau : la terre ferme ne change pas d'un bloc. Les bouts des
ponts n'ont plus d'encoche où la voiture tombe.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js` lit toutes les villes
à pont : 437 encoches sur `origin/main`, zéro ici, sur 28 436 colonnes de
tablier. La dette de Berlin sort de la liste des ponts déclarés (Agra y
reste). L'empreinte des 490 morceaux change (Tokyo est un des neuf lieux, et
le raccord du Tōmei y entre), et la même branche, la règle désarmée et le
Tōmei retiré, rend celle d'`origin/main` au bit près.

**Et le Tōmei, Tokyo–Nagoya.** La dernière route libre du relevé de la v310,
laissée de côté parce qu'« un aérodrome est sur l'axe ». C'était pire : à
l'ouest de Tokyo, Haneda et Yokota ferment la plaine, le Shinkansen part vers
Kyoto à douze blocs de Haneda et traverse Nagoya, et la montagne de Hakone
occupe le milieu. La route passe par la bande côtière au sud du rail, entre la
montagne et la mer : 1 140 blocs, un seul pont (une crique au sud-ouest de
Tokyo), déblai et remblai de 1,8 bloc. Tokyo s'entre par 132°, porte à
vingt-quatre blocs du bord — l'entrée par 149°, plus propre, mettait un pont
sur un étang contre la porte —, Nagoya par 60°, à l'opposé de l'E1. Un témoin
neuf de `carteMonde.js` exige zéro colonne sur le rail, zéro ville frôlée, des
voitures sur la route et une rue propre aux deux entrées ; mesuré sous node
avant le banc : 9 985 colonnes d'emprise, aucune sur la voie ferrée ni à une
autre route, 283 colonnes d'asphalte sur 283.

---

## v380 — Deux témoins de la rue qui disent ce qu'ils voient

**Pourquoi.** Deux témoins de `monte.js` rendaient des rouges qu'on ne
pouvait pas démonter. « La voiture de l'enfant freine devant un piéton » a
rendu `voituresRue: 0` et 3,4 à 5,3 blocs d'avance aux portails des v279,
v346, v351 et v354 : il cherchait son couloir dans les rues de Rome, et ce qui
traîne autour d'une rue (façades, mobilier, bêtes, convois) changeait d'un
portail à l'autre — la situation n'avait souvent pas lieu. Et « les passants
ne sont plus plantés au milieu de la chaussée » rendait un seul nombre (6 sur
21 au rejeu de la v371) pour plusieurs pannes possibles.

**Ce que ça change.** Rien dans le jeu. Le témoin du freinage se pose sur un
rectangle plat de vingt blocs sur neuf, au sec, loin de toute ville, sans
bête ni convoi, et exige que l'écart ait eu lieu. Le témoin de la chaussée
publie QUI y est : état, traversée, écart, animé ou figé, à son poste de
naissance ou non.

**Ce qui le prouve.** Le témoin du freinage, rejoué seul trois fois : 105 à
107 relevés, zéro traversée, 26 à 33 relevés d'écart, 22,9 à 30,3 blocs
d'avance. Le couloir vide de la v237, où il devait d'abord se poser, est en
pleine mer (terrain à 24) : mesuré sous node, aucun de ses quatre cents
rectangles n'est au sec. La sonde des passants sur la chaussée à Rome
(`sonde-chaussee-rome.cjs`, 60 s, deux fois de chaque côté) : hors traversée,
0 et 5 relevés sur ~1 800 sur la branche, 3 et 2 sur `origin/main` — aucun
passant né sur la chaussée, aucun flâneur.

---

## v379 — On arrive plus vite après la carte

**Pourquoi.** Trois questions laissées ouvertes par la v360, et une quatrième
qui traînait au portail. Après une téléportation, la file de maillage ne se
rechargeait qu'une fois par image : sur un écran qui rame au milieu de Paris,
le disque d'affichage arrivait au compte-gouttes — au banc, 291 à 304
morceaux sur 625 au bout de vingt secondes. Londres plafonnait à 70 blocs par
seconde quand Paris tenait 80, sans cause mesurée. Et le témoin « l'écran ne
se fige pas en arrivant sur une ville » était rouge des deux côtés depuis
plusieurs portails, sans qu'on sache ce qu'il mesurait encore.

**Ce que ça change.** Après un saut par la carte, la file se recharge à
l'arrivée de chaque morceau — toujours quatre demandes en vol au plus — le
temps de remplir le disque, dix secondes au plus, puis redevient celle d'avant
(coupée en rendu logiciel, comme la recharge en roulant de la v360). Au banc,
90 % du disque de Paris en 5,5 à 6,4 s. Les morceaux du centre de Londres se
fabriquent un peu plus vite : `solLondres` y était appelé quatre fois par
colonne, une seule suffit (génération 2,8 → 2,1 ms sous node) — sans changer
un bloc. Le plafond de vitesse au sol, lui, ne bouge pas : Londres ne tient
toujours pas 80 au banc, il reste à 70 en ville.

**Ce qui le prouve.** Trois sondes qui séparent les cas. `sonde-londres.cjs` :
le centre de Londres, pile au milieu du trajet mesuré, porte 64 % de faces de
plus que celui de Paris et une génération 70 % plus chère ; avec la mémoire,
145–151 blocs devant soi contre 137–152 sur `origin/main` — les distributions
se recouvrent, le plafond ville reste donc à 70 ; et moins de 1 % des
morceaux reçus arrivent derrière l'enfant (un lot dépassé n'est pas
nuisible). `sonde-teleport-recharge.cjs` : dans une scène vide, les deux
recharges chargent Paris en 4,1–4,4 s à 57 images par seconde — le
chargement ne prend rien aux images ; ce que le banc perd en scène dessinée
(3,9 → 2,8–3,1 images par seconde) est SwiftShader qui dessine la ville plus
tôt. `sonde-arrivee-ville.cjs` : dans les images de plus de 300 ms du vol vers
Paris, 1 à 5 ms d'installation, zéro programme compilé, 18 à 49 ms de
JavaScript, pour des images de 1,3 à 1,5 s ; en scène vide, 100 ms au pire. Le
témoin de la v235 rend donc une scène vide pendant le vol (vert, 0 % ; rouge à
9–11 % quand on désarme son remède dans une copie), et un témoin neuf garde la
fenêtre d'arrivée (un saut l'arme, un pas non, elle se rend ; rouge sur
`origin/main`). L'empreinte des 490 morceaux est inchangée. À relire sur la
tablette : `?recharge=arrivee&diag=1` contre `?recharge=image&diag=1`, en se
téléportant à Paris.
## v378 — Les voitures ne traversent plus les monuments

**Pourquoi.** Le témoin de la v375 l'a mesuré : dans les villes engendrées, les
anneaux de voitures se choisissaient sur la trame sans regarder les monuments,
qui se posent après. Quarante-cinq monuments étaient bâtis en travers d'un
anneau à hauteur de carrosserie — le Taj Mahal sur 294 cases, le Colisée sur
53, Rashtrapati Bhavan, le Templo Mayor, Tō-ji, le palais royal de Madrid… :
des voitures qui passaient au travers des murs.

**Ce que ça change.** Un anneau qui passerait dans un monument est écarté, et
la ville en prend un autre. Plus une voiture ne traverse un monument. Agra et
Le Cap, qui perdaient trop de rues, reçoivent des anneaux de quartier. Et les
anneaux d'une ville ne se calculent plus au démarrage mais quand l'enfant
s'en approche : la page démarre plus vite.

**Ce qui le prouve.** `plafond.js` : le témoin des monuments en travers d'un
anneau passe de 45 dettes déclarées à zéro (48 à la mesure de la carrosserie
vraie sur `origin/main`), et un témoin neuf exige que les anneaux dépliés à
l'approche soient exactement ceux du calcul entier (262 villes). `carteMonde.js` :
les dettes des ponts d'Agra (le Taj et le Fort sur deux tabliers, 9 pas) et
de Berlin (l'anneau qui passait dans le Berliner Dom) tombent. L'empreinte des
490 morceaux change — les tabliers des anneaux sont du sol — et c'est prouvé :
le filtre désarmé, la branche rend celle de la v375 au bit près.
Mesuré sous node : aucune ville sans voitures, la moins couverte à 78,7 %
(barre 75) ; 445 → 430 anneaux ; démarrage 157 → 0 ms pour ce calcul.

---

## v377 — Le passager monte par la portière

**Pourquoi.** Depuis la v366, l'enfant qui prend le volant marche jusqu'à la
portière, l'ouvre et s'assied. Mais celui qui monte en PASSAGER dans la voiture
d'un ami (v253) était encore collé au siège d'un coup, et le conducteur ne
voyait rien bouger sur sa tablette.

**Ce que ça change.** « Monter avec Marlon » : l'enfant marche jusqu'à la
portière DROITE de la voiture de son ami, elle s'ouvre, il s'assied, elle se
referme — et Marlon, sur SA tablette, voit sa portière droite s'ouvrir et se
refermer. Un second appui termine tout de suite, comme au volant. Une tablette
restée sur l'ancienne version ne voit pas la portière bouger, et rien ne casse.

**Ce qui le prouve.** Un témoin neuf à deux tablettes dans `reseau.js` : Lou
(qui joue la séquence) monte avec Marlon ; on lit les deux pages au même
instant, relevé par relevé. Lou passe par l'approche, l'ouverture, l'entrée et
la fermeture avant d'être passagère ; chez Marlon, la portière droite de sa
voiture s'ouvre à 60° (1,047 rad) puis se referme. Sur `origin/main` : aucune
phase, Lou passagère d'un coup, la portière de Marlon jamais touchée. Le témoin
du passager de la v253 (sur des pages qui sautent la séquence) reste vert.

---

## v376 — Les passants réagissent à la route

**Pourquoi.** Un passant frôlé par une voiture faisait son pas de côté sans un
geste, puis restait planté au bord de la rue : la pause d'après l'écart valait
0,8 seconde de JEU, soit trois secondes de montre sur une tablette à cinq
images par seconde. Et un choc de voiture à vingt mètres ne faisait tourner la
tête à personne.

**Ce que ça change.** Quand une voiture arrive sur lui à moins d'une
demi-seconde, le passant sursaute — les bras se lèvent d'un coup, un petit
saut — pendant son pas de côté, puis il repart aussitôt (la pause se compte en
temps réel, un tiers de seconde). Quand la conduite publie un choc
(`player.choc`), les passants à portée se retournent vers le bruit, s'arrêtent
un instant, et reprennent leur chemin. Jamais de peur, jamais d'arrêt prolongé,
personne n'est touché.

**Ce qui le prouve.** Deux témoins neufs de `monte.js`, rouges sur
`origin/main` : un piéton frôlé à 40 b/s sur une tablette qui rame sursaute,
sort de la carrosserie et repart en moins de 1,2 s de montre ; six passants
qui marchent se tournent vers un choc posé au milieu d'eux, puis repartent.
## v375 — Les huit derniers palais ont leur vraie forme

**Pourquoi.** La v369 avait vidé le monde de ses coupoles de gabarit, et compté
huit palais encore bâtis par le gabarit `palaisLong` : un mur de trois blocs
d'épaisseur, une baie sur deux, que la table de la ville étirait — le palais du
Dam, le Rijksmuseum, le château de Prague, le palais royal de Stockholm,
Amalienborg, Gyeongbokgung, la Casa Rosada et le palais Bahia. Et, mesuré en
préparant leur place, quatre de ces gabarits étaient bâtis EN TRAVERS d'un
anneau de voitures (Dam, Rijksmuseum, Prague, Gyeongbokgung), celui de
Stockholm sur l'eau.

**Ce que ça change.** Chacun a son bâtisseur d'après sa vraie forme, dans la
partie de sa boîte que rien ne traverse : le Dam autour de ses deux cours, avec
son avant-corps et son lanternon ; le Rijksmuseum de brique rouge, ses deux
tours et le passage qu'on traverse à pied ; la longue façade du château de
Prague et la porte de Matthias ; le carré baroque de Stockholm et sa
balustrade ; les quatre palais d'Amalienborg autour de la place octogonale et
de la statue ; la salle du trône de Gyeongbokgung sur sa terrasse, sa galerie
et sa porte ; la Casa Rosada rose, son arche et ses pavillons coiffés ; le
palais Bahia de plain-pied, ses arcades de zellige et sa cour aux orangers.
Tous à leur hauteur du monde, un pour un, pour que leurs fenêtres ne se
répètent pas.

**Ce qui le prouve.** Deux témoins de `plafond.js`. Le témoin des gabarits
exige désormais zéro palais (huit sur `origin/main`). Un témoin neuf lit les
anneaux de voitures de toutes les villes engendrées contre les cent
vingt-trois monuments qui y sont : quarante-cinq coupent un anneau à hauteur de
carrosserie — un conflit de plan général, déclaré chiffre par chiffre dans
`TASKS.md` — et aucun ne doit en couper plus ; rouge sur `origin/main` (le Dam,
le Rijksmuseum, Prague et Gyeongbokgung). Captures de chaque palais au
portail. L'empreinte des 490 morceaux ne bouge pas : aucun des huit n'y est.

---

## v374 — Un choix de langue qui tient, et la conduite des dégâts éprouvée bout à bout

**Pourquoi.** Trois manques, trois sujets. (1) Le témoin « un choix fait sur
une tablette part au serveur » de `reglages.js` était rouge aux deux portails
de la v363 et vert seul : déclaré « rouge de charge », il ne l'était pas. Une
sonde qui relève chaque écriture des deux tablettes l'a montré sans charge
du tout : le choix part, puis la seconde tablette de la maison le réécrit
avec son ANCIENNE langue, sous une date plus ancienne — son battement de
présence, toutes les vingt secondes, écrivait sans relire. (2) Le contrat
avec la physique (v358) n'avait jamais été éprouvé de bout en bout : le seul
témoin publiait ses chocs à la main, et le témoin du coût d'un choc bornait
des millisecondes, qui suivent la charge du banc (15 seul, 31,1 au portail).
(3) Un hôte resté sur l'ancienne version ne relayait pas les chocs des
voitures de la rue (`rue_choc`, v363) entre deux amis à jour.

**Ce que ça change.** Une langue choisie sur une tablette n'est plus défaite,
même un instant, par l'autre tablette allumée à côté. La voiture de la rue
qu'un ami cabosse se voit cabossée chez les autres même quand celui qui
reçoit la partie n'a pas encore la mise à jour.

**Ce qui le prouve.** Cinq témoins neufs ou repointés. `reglages.js` : le
témoin provoque la course (il repère le battement de l'autre tablette et
clique juste avant) et observe le serveur toute la fenêtre — rouge sur
`origin/main` (un retour à l'ancienne langue), vert ici.
`degats.js` : un mur pris de face par la VRAIE physique rend un choc publié
pris par ce seul chemin, l'avant seul froissé, l'effet sur la conduite
appliqué une fois (rouge sur `origin/main` faute des compteurs, le
comportement y était déjà juste) ; le coût d'un choc se compte en sommets
(25,6 % déplacés, zéro normale réécrite hors d'eux — 63 avec
`computeVertexNormals`, vérifié rouge — et rien par image), les
millisecondes restent dans le message ; et un hôte qui ne relaie pas
`rue_choc` laisse passer le choc par la position, l'histoire identique choc
pour choc.
## v373 — Une portière ouverte se voit de derrière

**Pourquoi.** Aucun des cinquante modèles de la flotte n'a meublé l'intérieur
de sa portière : la carrosserie est une peau à une seule face, et la face
arrière d'un triangle n'est pas dessinée. Quand l'enfant arrive par l'arrière
de la voiture — le chemin le plus fréquent —, la portière ouverte devant lui
était invisible : on voyait au travers. Mesuré par la sonde du revers : de face,
une portière ouverte arrête 10 à 20 rayons sur 24 ; de derrière, ZÉRO, sur les
cinquante modèles.

**Ce que ça change.** La portière a désormais un revers, de la couleur de la
carrosserie, sur tous les modèles qui ont une portière animée. Elle se voit
pendant toute la séquence, de quelque côté qu'on arrive.

**Ce qui le prouve.** Un témoin neuf dans `monte.js` : des rayons visent la
portière ouverte de face, puis de derrière, et il en faut autant d'un côté que
de l'autre (10 et 10 ici, 10 et 0 sur `origin/main`) ; et la portière garde
autant de maillages qu'avant — le revers est DANS la même géométrie, pas un
appel de dessin de plus. Le témoin des programmes de l'embarquement reste vert :
aucun programme ne naît, parce que le revers n'est pas un `DoubleSide` (qui
changerait la clé de programme, v246) mais une copie des sommets, normales
retournées et triangles à l'envers.

**Et un mystère de la v366 s'éclaire.** Le témoin de la descente refusait
parfois la sortie côté passager pour « circulation », en pleine prairie. Une
sonde a relevé les voitures de la rue au moment du refus : la « prairie » était
DANS Manchester, et un vrai circuit de la ville passait à 3,5 blocs. Le refus
était juste, c'est le témoin qui choisissait mal son terrain : il cherche
désormais hors de toute ville, y compris des villes engendrées que `cityAt` ne
connaît pas. Sur le nouveau site : dix descentes, zéro refus.

---

## v372 — Des portières bien découpées

**Pourquoi.** Les portières de la v366 étaient fabriquées dans la
carrosserie en prenant chaque triangle par son centre : un grand triangle à
cheval sur le bord du volume partait ENTIER avec la portière, et le bord
avant ou arrière de la porte était en dents de scie. Mesuré par la sonde des
portières : 21 % de la surface de la portière à cheval sur un bord sur la
Lucid Gravity, 36 à 38 % sur les trois taxis — et sur la Lucid, une portière
de 1,49 bloc de long pour un volume de 1,25.

**Ce que ça change.** Le bord de chaque portière est droit sur les
cinquante-cinq modèles : les triangles qui chevauchent un bord du volume
(avant, arrière, bas de caisse, haut de vitre) sont COUPÉS au plan du bord, la
part du dedans part avec la portière, le reste reste sur la caisse. Rien ne
change de couleur ni de matière, et aucun programme graphique ne naît. Les
taxis ont désormais des bords nets eux aussi, mais restent sans portière
animée : derrière leur portière il n'y a rien (aucun des vingt-quatre rayons
tirés au travers de l'ouverture ne touche un habitacle).

**Ce qui le prouve.** Un témoin neuf dans `monte.js`, qui mesure la portière
de la Lucid SANS lire le plan — l'étendue de ses sommets contre le volume
(débord 0,24 bloc sur `origin/main`, 0 ici), la surface de la caisse et des
portières contre celle du prototype (66,98 des deux côtés : rien de perdu,
rien de doublé), puis un choc sur le flanc équipé (la portière reste sur son
pivot, la voiture à 70 % de santé). Le coût du plan, une fois par modèle, se
remesure : médiane 5 ms (4 avant), 15 ms sur la Lucid (13 avant), 21 ms au
pire hors taxis (28 avant) — chaque sommet ne passe plus qu'une fois dans le
repère de la voiture, et la recopie des attributs se fait d'un geste.

## v371 — Les passants traversent au feu

**Pourquoi.** Les passants marchaient le long de leur trottoir et, au coin,
tournaient : ils ne changeaient pour ainsi dire jamais de trottoir. Mesuré
(`tests/sonde-traversees.cjs`, soixante secondes, l'enfant immobile) : à Rome
une traversée pour vingt et un passants, et pas à un feu ; à Paris et à
Londres, zéro. Une ville où chacun reste sur son pâté de maisons, à côté de
feux qui changent pour personne.

**Ce que ça change.** À un carrefour à feux, un passant sur deux ou presque
s'arrête au bord, face à la rue, attend que les voitures qu'il va couper soient
au rouge — avec assez de rouge devant lui pour arriver de l'autre côté — puis
traverse d'un pas pressé. Il lit le même feu que les voitures. À Paris, aux
carrefours sans feu, il traverse sur le passage piéton peint quand aucune
voiture n'arrive. Ailleurs, il ne traverse pas : il tourne au coin comme avant.
Et la traversée se fait en temps réel, comme l'écart de la v351 : une tablette
qui rame ne laisse pas un passant au milieu de la rue quand le feu repasse au
vert.

**Ce qui le prouve.** Un témoin neuf de `monte.js` pose huit passants au bord
du trottoir, aux coins des feux de Rome, et compte les changements de
trottoir : `origin/main` rend 0 et 0 traversée (rouge) ; ici 9, 6 et 3, au feu
et au rouge des voitures coupées. Le témoin du réverbère éloigne désormais les
passants du capot (un passant qui traverse arrête la voiture, c'est voulu), et
une traversée au feu ne compte plus comme un passant planté sur la chaussée.
La sonde, au centre des trois villes : Rome 7 à 11 traversées au feu, Paris 2 à 5 sur les passages peints,
Londres 1 à 3 au feu. La recherche du passage coûte 0,6 ms par coin en moyenne,
3,6 au pire, une fois par seconde environ.
## v370 — La grille de Washington à la règle du kit

**Pourquoi.** La dernière des cinq villes bâties à la main restée hors règle
(dette v271, v307). Ses diagonales avaient déjà la chaussée d'une collectrice ;
sa GRILLE, non : deux colonnes de chaussée pour une voiture de 2,26 blocs, un
seul trottoir, une rue tous les douze blocs. Les rues de liaison où roulaient
les dix-neuf circuits faisaient deux colonnes de large.

**Ce que ça change.** Une rue de la grille est une rue locale du kit
(`sectionDeRue('locale')`) : trois colonnes de chaussée, deux trottoirs de
deux. Le pas suit dans le rapport des emprises (12 × 7 / 3 = 28) et l'îlot se
recompose au lieu de grandir : quatre maisons de neuf blocs — la même maison,
son escalier, ses deux portes — autour d'une ruelle de trois, une allée de
gravier entre deux jardins de derrière, comme en a tout îlot de Washington. Les
rues de liaison passent sur les axes neufs, à la section du kit, sous le nom
de la vraie rue la plus proche (D, H, M Street, la 3e, la 12e, la 20e, la
23e…), et sept s'ajoutent à l'est (Capitol Hill, NoMa) et au nord-ouest.
Quatorze circuits cherchés sous node remplacent les dix-neuf d'avant : la
part de la ville à portée d'une voiture passe de 50,8 à 56,2 %, la longueur
roulée de 1 881 à 2 026 blocs. La ville d'avant reste sous ce qu'un enfant a
bâti (`washington-v367.js`, `DATE_RUES_WASHINGTON`). Le prix : la part de lots
du disque passe de 14,2 à 11,2 %. Et l'I-95 (v367), dont l'avenue d'entrée
finissait sur une rue de l'ancienne grille, arrive par une bretelle sur la
rue v = 84. Le Triangle fédéral descend de 13–16 à 12–14 blocs : sa
ligne de corniche est celle des musées du Mall, et le Musée afro-américain
n'est plus plus bas que ses voisins (le portail l'a vu, la médiane de ses
quatre îlots voisins était passée de 10 à 14 avec la trame neuve).

**Ce qui le prouve.** Deux témoins neufs. `carteMonde.js` coupe la grille des
quartiers bâtis en travers et mesure chaque rue : 46 rues, chaussée médiane
3, trottoir 2, lots 11,2 % — rouge sur `origin/main` (11 rues trouvées,
trottoir 1). `plafond.js` joue pour Washington le témoin des villes figées
(une maison sur une ancienne rue n'est pas enfermée, une cabane garde son
toit). Le monde d'avant (`v308`) rend la production au bloc près sur
quatre-vingts morceaux de Washington. Le témoin des maisons de
`washington.js` demande le coin de chaque maison au module
(`coinDeMaisonDC`) au lieu d'un pas recopié.

---

## v369 — Plus une coupole de gabarit dans le monde

**Pourquoi.** La v365 avait donné leur édifice aux coupoles et aux palais de
gabarit qui montaient en tour, et déclaré ceux qui restaient plus bas : Walt
Disney Hall et le Rogers Centre étaient dessinés en coupole sur tambour, comme
le Panthéon de Rome (sans son portique), le dôme du Rocher (qui est un
octogone) et le Bean de Chicago (un haricot d'acier). L'ancien hôtel de ville de
Toronto était une colonne d'un bloc, et Navy Pier un palais.

**Ce que ça change.** Disney Hall a ses voiles d'acier qui s'évasent ; le
Rogers Centre est un stade rond à toit plat, à sa hauteur (un stade ne
s'étire pas : étiré au ciel de Toronto, il montait deux fois plus haut que
large) ; l'ancien hôtel de ville a son corps de grès et sa tour de l'horloge,
qui monte enfin au-dessus du stade ; le Panthéon de Rome a sa rotonde, son
oculus et son portique ; le dôme du Rocher son octogone de faïence bleue et sa
coupole d'or ; le Bean son haricot sur sa place ; Navy Pier sa jetée vers le
lac et sa grande roue.

**Ce qui le prouve.** Un témoin neuf de `plafond.js` — « aucune coupole de
gabarit ne reste dans le monde, quelle que soit sa hauteur » — rouge sur la
v365 (cinq), vert ici ; il compte aussi les huit palais de gabarit qui restent,
déclarés. Les témoins de hauteur, d'ordre du vrai ciel, des perches et des
gabarits en tour restent verts : le Panthéon, étiré à ses 43 m, passait
au-dessus du Colisée, il garde donc dix blocs ; Toronto garde son `k` de 0,3,
mesuré (à 1, l'hôtel de ville frôlait la CN Tower). L'empreinte des 490
morceaux change (Rome est un des neuf lieux) : bâtisseurs neufs désarmés, la
branche rend celle d'`origin/main` au bit près.

---

## v368 — Les rues de Lille à la règle du kit

**Pourquoi.** La quatrième des cinq villes bâties à la main restées sur leurs
largeurs relevées à la main (dette v271). Une rue du Vieux-Lille faisait 1,2
bloc de chaussée, une rue du centre 2, les boulevards 2,9 à 4,8 — une voiture
de 2,26 blocs y frôlait le trottoir.

**Ce que ça change.**

- **Les rues de Lille ont la section du kit**, à un bloc pour un mètre : deux
  voies et des trottoirs de 2,5 m pour les boulevards et les grandes rues (la
  rue Faidherbe, la rue Nationale, le boulevard de la Liberté, Vauban,
  Victor-Hugo) et pour les rues du centre et des faubourgs ; une voie de
  3,1 m pour l'Esquermoise, la rue Royale, la rue de la Monnaie et les rues du
  Vieux-Lille. Les entrées de l'A1 et de l'E429 sont des collectrices.
- **Les îlots se recomposent** et une rue de la trame ne double plus une
  avenue : Lille GAGNE des immeubles, 30,1 → 33,3 % du disque, et aucun
  quartier n'en perd (la Grand'Place 15,8 → 26,7, les gares 12,4 → 18,3).
- **Ce qu'un enfant a bâti à Lille ne bouge pas** : sous ses blocs d'avant la
  mise à jour, la Lille d'avant reste.

**Ce qui le prouve.** Quatre témoins neufs. `carteMonde.js` : les rues ont
la chaussée de leur type (boulevards 7,0, Vieux-Lille 3,8, trame 6,05 contre
4,0, 3,2 et 1,95 sur `origin/main`) ; Lille garde plus de 30 % de lots,
aucun quartier sous 10 %. `plafond.js` : une maison posée sur une ancienne rue
n'est pas enfermée et une cabane garde son toit — et le témoin choisit
désormais une rue qu'aucun monument ne recouvre dans la ville d'avant (le
premier jet tombait contre la Vieille Bourse). Les circuits de Lille restent
à 95-100 % sur la rue. Et la cour de la Vieille Bourse reste une cour : la
trame recomposée posait un îlot dans son emprise, une maison de cinq blocs la
remplissait — le témoin de `carte.js` l'a vu, l'emprise est désormais pavée.

---

## v367 — New York–Washington, et une ville qu'on n'entre que par le sud

**Pourquoi.** New York et Washington, les deux grandes villes de la côte est,
n'avaient aucune route entre elles : la dernière des liaisons courtes du kit
encore à faire hors des villes réservées. La v362 avait réglé la porte de
Manhattan (un rectangle, pas un disque) ; Washington pose le même problème
dans l'autre sens — c'est une BOÎTE bâtie de 311 × 205 blocs dans un disque
de 187, et la règle du disque y aurait posé la porte au milieu de la campagne,
ou écrit l'entrée de la route dans ses rues.

**Ce que ça change.** L'I-95 Sud part d'une seconde porte de New York, sur la
rive de l'Hudson à l'ouest de Manhattan, traverse le New Jersey en plaine sur
1 563 blocs avec un seul pont, et arrive à Washington par le sud, au niveau
de la rue d'Anacostia, où ses voitures entrent puis font demi-tour. Le relevé
a fermé les trois autres côtés : la montagne au nord, une crête de 43 à 49
blocs à six blocs de la boîte à l'est (une route au niveau de la ville ne
peut pas la déblayer), le Potomac dans la boîte à l'ouest. La route s'arrête
net au bord de la ville (`boutNet`) : son demi-cercle d'asphalte ordinaire
aurait écrit dans cinq colonnes de trottoir.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js`, rouge sur
`origin/main` (la route n'existe pas) : un convoi roule, aucune colonne de
route dans la ville, aucune marche de plus d'un bloc ni aucun bloc à hauteur
de carrosserie de la route à la rue, la porte de New York hors du rectangle
avec la rive à moins de soixante blocs, et la route ne longe ni l'une ni
l'autre ville. Le témoin « ne frôle pas ses villes » juge désormais une ville
qui n'est pas un disque à son emprise (la boîte de Washington, le rectangle
de Manhattan). Mesuré sous node avant le banc : profil à six pour cent, déblai
7,0, remblai 1,1, zéro colonne sur un rail ou sur une autre route, joint du
pont fermé (6 630 points, zéro trou), relief identique du worker et du fil
principal hors du rectangle.

---

## v366 — On monte en voiture comme dans un vrai jeu

**Pourquoi.** Max : « Quand on monte dans une voiture, on voit le personnage
qui avance et qui rentre dans la voiture avec le gameplay de la porte qui
s'ouvre… aller très très loin sur l'expérience. » « Monter » était instantané,
et faux : la voiture se TÉLÉPORTAIT sous l'enfant et pivotait sur son regard
(mesuré : quatre blocs de déplacement au premier appui). Et aucun des
cinquante-deux modèles de la flotte n'a de portière — leurs maillages sont
groupés par matériau.

**Ce que ça change.** Appuyer sur « Monter » : l'enfant MARCHE jusqu'à la
portière conducteur — en faisant le tour de la voiture s'il est du mauvais
côté —, la portière s'ouvre vers l'extérieur, il s'assied, elle se referme, et
la caméra glisse de la vue de côté à la vue de poursuite. La voiture ne bouge
plus d'un bloc. En descendant, la portière s'ouvre, il sort et se pose debout
À CÔTÉ, sur une place libre (ni mur, ni eau, ni devant une voiture qui
arrive) ; côté passager si le côté conducteur est bouché. Un second appui
termine tout de suite. Une voiture prise dans la rue s'arrête et il y monte de
la même façon — elle est vide, personne n'en est sorti. Les portières sont
fabriquées dans la carrosserie de cinquante et un modèles sur cinquante-cinq ;
les quatre autres (les trois taxis fabriqués, aux trop grands triangles, et la
Chiron Stealth, sans habitacle — sa portière ouverte ne montrait que du noir)
montent sans portière animée.

**Ce qui le prouve.** Neuf témoins neufs dans `monte.js`, sur une page qui
joue la séquence : la marche jusqu'à la portière en contournant, la portière
qui s'ouvre vers l'extérieur (lue dans sa matrice) puis se referme, l'enfant
assis au volant sans que la voiture ait bougé, la sortie debout à côté sur un
sol libre, la géométrie partagée intacte sur un autre exemplaire du même
modèle, le second appui qui termine, la descente rapide (pour la voiture qui
prend feu), et une voiture déjà froissée (v343) qui ne prend pas de portière
et garde son froissé. Huit rouges sur `origin/main` ; le huitième — aucun programme de
shader compilé — est vert des deux côtés à dessein, il garde une capacité. Le
banc saute la séquence partout ailleurs (`embarq=0`) : les témoins de conduite
existants gardent l'ancien geste au bit près.

---

## v365 — Les coupoles ont leur édifice

**Pourquoi.** La v357 avait donné sa basilique à Saint-Pierre de Rome et
déclaré la suite : les bâtisseurs partagés `dome` (une coupole sur son seul
tambour) et `palaisLong` (un palais de trois blocs d'épaisseur) servent de
gabarits à des dizaines de monuments, et remis à la hauteur de leur ville sans
l'édifice autour, ce sont des tours et des murs. Mesuré dans toutes les villes :
seize, du Berliner Dom au palais d'Hiver. Et à Londres, Big Ben (96 m) était à
soixante-neuf blocs, au-dessus du London Eye, quand St Paul (111 m) restait à
dix-sept, sous la colonne Nelson.

**Ce que ça change.**

- **Seize monuments ont leur vraie forme** : Santa Maria del Fiore avec sa nef
  de marbre, son octogone, la coupole de Brunelleschi et le campanile de Giotto ;
  le Berliner Dom et ses tours d'angle ; le Reichstag et sa coupole de verre ;
  le Rashtrapati Bhavan ; le Capitolio de La Havane ; le palais des Beaux-Arts
  et la cathédrale de Mexico ; la gare Victoria et le Taj Mahal Palace de
  Mumbai ; le baptistère et le Duomo de Pise ; Saint-Marc et ses cinq
  coupoles ; et quatre palais autour de leur cour — le palais royal de Madrid,
  la Hofburg, le palais d'Hiver, le Parlement d'Athènes.
- **Istanbul a ses minarets** : Sainte-Sophie (sa coupole basse, ses
  demi-coupoles et quatre minarets) et la Mosquée bleue (sa cascade de coupoles
  et six minarets) ; la tour de Galata a son cylindre de pierre et son toit
  conique, et le ciel de la ville, qu'elle bornait, se décomprime.
- **Le ciel de Londres est dans l'ordre** : Big Ben à trente-neuf blocs, à la
  proportion de la tour Elizabeth, St Paul sur son tambour et sa colonnade à
  quarante et un, sous le London Eye.
- **Les voitures de l'Autosole s'arrêtent sur le parvis du Duomo** au lieu de
  traverser sa nef : une avenue d'entrée s'arrête désormais devant le premier
  bloc qu'un monument pose à hauteur de carrosserie.

**Ce qui le prouve.** Un témoin neuf dans `plafond.js` — « aucune coupole ni
aucun palais partagé ne monte seul en tour » — cherche les gabarits dans toutes
les villes et mesure leur assise (l'emprise du pied sur celle du haut) ou leur
carrure : rouge sur `origin/main` (seize), vert ici. Le témoin d'ordre du vrai
ciel reçoit St Paul, Tower Bridge et le London Eye. L'empreinte des 490
morceaux se relève (Londres est un des neuf lieux), avec sa preuve : bâtisseurs
neufs désarmés, la branche rend l'empreinte d'`origin/main` au bit près. Jugé
sur captures, vingt et un monuments. Le portail a trouvé deux défauts de la livraison
elle-même — l'entrée de Florence dans le Duomo, la barre du témoin de Big Ben
écrite pour l'ancien modèle à soixante-neuf blocs — et le témoin de Londres
exige désormais que la roue reste au-dessus de la tour de l'horloge (rouge sur
`origin/main`).
Et le portail de la v365 en a trouvé un troisième : le Berliner Dom, bâti sur
toute sa boîte, recouvrait deux tabliers de pont de Berlin (dix pas bouchés,
« on le traverse à pied d'une rive à l'autre », `carteMonde.js`) ; il tient
désormais entre les deux ponts, son aile du nord lui gardant l'assise d'une
cathédrale.

---

## v364 — Ce que coûtent les dégâts, lu sur la tablette

**Pourquoi.** Le coût des dégâts n'a jamais été mesuré sur l'iPad. Au banc,
enfoncer une carrosserie coûte 12 à 22 ms au premier choc et 4 à 7 ensuite,
et le feu deux appels de dessin ; mais le banc rend en logiciel et ses
millisecondes ne se transposent pas (v247). La dette de la v343 le disait :
« reste le coût RÉEL sur la tablette, à lire avec `?diag=1` ». Il n'y avait
rien à lire.

**Ce que ça change.** La tablette mesure elle-même. Avec `?diag=1`, une ligne
de plus apparaît dès qu'une voiture s'est abîmée : le nombre d'enfoncements,
le premier, le dernier et le pire en millisecondes, et ce que coûte le feu en
appels de dessin et en carrés. Le journal de bord (v296) garde les mêmes
chiffres dans ses relevés : Max les relit après coup, sans rien installer. Tant
que rien ne s'est abîmé, rien n'est ajouté au relevé.

**Ce qui le prouve.** Un témoin neuf dans `degats.js`, rouge sur
`origin/main` (aucun relevé) : après le crash et le feu, le journal porte un
relevé `degats` avec ses enfoncements en millisecondes et un feu à un ou deux
appels (mesuré : 4 enfoncements, dernier 22,4 ms, premier 18,2, feu 2 appels
pour 36 carrés). Et le témoin du contrat avec la physique (v356) compte
désormais les chocs que la VRAIE physique publie (v358) pendant sa chute de
vitesse simulée : au portail, elle en avait publié un, légitime, et le témoin
l'accusait d'être le repli. Vert sur la branche, rouge quand on force le repli.

---

## v363 — Les coups suivent la voiture

**Pourquoi.** Deux manques laissés déclarés par la v356. Une voiture de la
rue que l'enfant avait froissée, puis qu'il PRENAIT, repartait neuve : la
monture qu'on lui fabrique ne portait pas les dégâts de la voiture vue dans la
rue — sa laque la suivait depuis la v305, ses coups non. Et à plusieurs,
chaque tablette a SA rue : une voiture de la rue percutée par Marlon n'était
froissée que chez lui, Alice la voyait intacte au même endroit. Enfin, un
témoin du portail (« aucun programme compilé au feu ») était rouge des deux
côtés en comptant 97 → 96 : un compte qui BAISSE, donc un programme rendu,
jamais une compilation.

**Ce que ça change.** Prendre une voiture de la rue abîmée, c'est la prendre
abîmée : la même tôle enfoncée, la même santé, le même moteur qui fume — et un
coup de plus peut la mettre en panne ou en feu, comme toute voiture qu'on
conduit. Ce n'est jamais une copie de géométrie : l'histoire des chocs passe à
la monture et se rejoue sur ses pièces, avec les mêmes fonctions et le même
bruit (v344). À plusieurs, la voiture de la rue que l'un percute est froissée
chez l'autre aussi, de la même histoire : elle se nomme par `clé#rang` (v305),
et un message court (`rue_choc`) porte le choc ; une tablette restée sur
l'ancienne version l'ignore. Si la voiture n'est pas encore dessinée chez
l'ami, l'histoire attend qu'elle naisse.

**Ce qui le prouve.** Deux témoins neufs dans `degats.js`, rouges sur
`origin/main` : la voiture prise porte la MÊME histoire de chocs que celle de
la rue, sa santé publiée et 17 pièces froissées (ancien code : santé 1, rien
de froissé) ; à deux tablettes, le même convoi, le même rang, la même histoire
chez Alice et 8 pièces froissées (ancien code : aucun choc). Le témoin des
programmes lit désormais les CLÉS neuves et non le compte : vert sur les deux
codes, et rouge (deux clés neuves) quand on désarme la chauffe des dégâts.

---

## v362 — New York–Boston, et une porte qui n'est pas sur un disque

**Pourquoi.** New York n'avait aucune route : son entrée était instruite
depuis la v355 et pas faite, parce que Manhattan n'est pas un disque. C'est
un rectangle de 480 × 2 300 blocs — l'île, et l'Hudson et l'East River
dedans — là où le registre dit « un disque de 152 ». La règle des portes
(sur le rayon, vingt blocs sous le bord) aurait posé la porte SUR l'île, et
le raccord aurait écrit son remblai dans les rues de Manhattan. Et deux
défauts de témoin, trouvés en passant : la porte de l'A3 creusait un pont de
Francfort sans qu'aucun témoin ne la regarde, et le témoin d'empreinte de la
v352 hachait TOUTES les routes du registre : rouge en production en v355 et
v356, re-relevé en v357 — et chaque route neuve l'aurait refait rougir.

**Ce que ça change.** L'I-95 relie New York à Boston : 390 blocs, un petit
pont, et des voitures qui roulent de la rive de l'East River, en face de
Manhattan (la tête du Triborough), jusqu'au centre de Boston par sa rue du
sud-ouest. La route s'arrête à la rive : le pont qui entrerait dans l'île est
déclaré, pas fait — le maillage de Manhattan ne passe pas par le mailleur
des routes, un tablier y serait invisible. Une route peut désormais DÉCLARER
sa porte (`portes`) quand la ville n'est pas un disque. Et une route ne pose
plus de talus au-delà de son bout : le tablier du pont de Francfort est
refait.

**Ce qui le prouve.** Trois témoins neufs dans `carteMonde.js`, et un
réécrit dans `morceaux-temoin.mjs`. L'I-95 (rouge sur l'ancien code : pas de
route) exige sa porte à plus d'une portée de talus du rectangle de
Manhattan, l'eau du rectangle à moins de soixante blocs, ZÉRO colonne
d'emprise dans le rectangle, et une entrée de Boston sur la rue. Le témoin
des ponts de villes lit désormais les dix-huit villes à pont qu'une route
touche (cinq avant), et un verdict neuf exige qu'aucune route n'en creuse un
tablier — Francfort en avait un, zéro ici. Il a vu deux défauts de ville qui
ne sont pas d'une route (une colonne à Berlin, neuf pas bouchés par le Taj
Mahal et le Fort d'Agra), déclarés dans le témoin et dans `TASKS.md`.
L'empreinte des 490 morceaux ne hache plus que les vingt et une routes
qu'elle a relevées (v357), et elle retombe au bit près sur sa valeur
(`3cc39830…`), talus-borne compris : le talus coupé au bout ne change rien à
ce qu'elle lit.
Le joint des ponts : 0 trou sur 143 509 points, toutes routes.

---

## v361 — Les rues de San Francisco à la règle du kit

**Pourquoi.** La troisième des cinq villes bâties à la main restées sur leurs
largeurs relevées à la main (dette v271). Une rue de quartier de San
Francisco faisait deux blocs de chaussée et Market Street trois : une voiture
de 2,26 blocs y roulait sur la ligne blanche, et deux ne s'y croisaient pas.

**Ce que ça change.**

- **Les rues de San Francisco ont la section du kit**, à un bloc pour un
  mètre : deux voies et des trottoirs de 2,5 m pour Market, Van Ness, Geary,
  Mission, la 19e Avenue, la Great Highway, les boulevards du Sunset ; une
  voie de 3,1 m pour Columbus, Valencia, Stanyan et la 16e Rue ; une voie pour
  la trame de 1847 et celle de l'ouest, deux pour SoMa.
- **Les îlots se recomposent** comme à Londres et à Nice, et une rue de la
  trame ne double plus une avenue. Le prix, déclaré : les avenues prennent
  27 % du disque contre 9, la part bâtie passe de 49,0 à 32,6 % — plus que
  Londres ou Paris ; le Richmond, que Geary traverse, est le plus touché
  (30,7 → 15,1), Pacific Heights et la Mission en gagnent.
- **Ce qu'un enfant a bâti à San Francisco ne bouge pas** : sous ses blocs
  d'avant la mise à jour, la ville d'avant reste.
- **Le centre reste un tapis d'où sortent quelques tours.** Les îlots plus
  grands faisaient du centre un tirage : médiane 23 blocs, le Ferry Building
  et le Bay Bridge dominés par leurs voisins. Chaque îlot se coupe désormais
  en quatre parcelles, quatre sur cinq font huit à quatorze étages, les tours
  restent le long de Market, et Fisherman's Wharf sort du centre (Pier 39
  n'y est plus dominé).

**Ce qui le prouve.** Quatre témoins neufs. `carteMonde.js` : les rues ont
la chaussée de leur type (artères 6,3, rues 4,0, trame 2,95, SoMa 6,35
contre 2,0, 1,7 et 0,95 sur `origin/main`) ; San Francisco garde plus de
30 % de lots, aucun quartier sous 10 %. `plafond.js` : une maison posée sur
une ancienne rue n'est pas enfermée et une cabane garde son toit (sur
`origin/main` : la date n'existe pas). Les six circuits restent à 100 % sur
la rue. `carte.js` : le centre a une médiane de 12 blocs, sa plus haute tour
36, aucune colonne de verre et 212 de façade ; `plafond.js` : aucun monument
de San Francisco plus bas que ses voisins. L'empreinte des 490 morceaux témoins change parce que San Francisco
en est un des neuf lieux ; sans elle, les 441 autres rendent `346a66cd…` sur
`origin/main` et sur la branche.

---

## v360 — Le monde suit la voiture jusqu'à 80

**Pourquoi.** Au banc, la ville ne suivait pas 80 blocs par seconde (Paris 125
blocs de monde devant soi pour 160 exigés) et le débit plafonnait vers 55
morceaux par seconde en ville, alors que la v352 avait divisé par deux le coût
d'un morceau. Deux pistes étaient déclarées sans mesure : l'installation des
géométries sur le fil principal, et la recharge de la file une fois par image.
Mesuré à 80 b/s, rr 12 : l'installation ne coûte que 0,1 à 0,9 ms par
morceau, le transit 2 à 8 ms — mais le worker était **à sec 55 à 72 % du
temps**. Et la boucle de recharge comptait chaque demande deux fois depuis la
v251 : une file « de huit » tenait de quatre à huit demandes en vol, selon
ce qui restait de l'image d'avant.

**Ce que ça change.** En roulant vite, chaque morceau qui arrive libère sa
place et elle repart tout de suite au worker, sans attendre l'image — toujours
quatre demandes en vol au plus, jamais plus que l'ancienne boucle au plus bas
(la profondeur mesurée nuisible en v269 ne revient pas). Le débit double (Paris 53 → 116 morceaux par seconde,
Rome 58 → 120, campagne 74 → 123), et le monde maillé devant soi à 80 b/s
passe de 101–128 à 176–192 blocs. Le plafond de vitesse au sol publié pour la
conduite (`plafond-sol.js`) monte de 60 à **70 b/s en ville** (Londres borne)
et de 70 à **80 b/s en campagne et sur l'autoroute** (l'A1 borne). À pied et à
l'arrêt rien ne change ; en rendu logiciel la recharge est coupée, comme
l'ordre en cône de la v346 (`?recharge=arrivee` la force). Les vitesses des
voitures, elles, ne bougent pas ici : c'est la conduite qui les applique.

**Ce qui le prouve.** Deux témoins dans `monte.js` : la recharge à l'arrivée
contre l'ancienne, en ABBA dans la même page, débit × 1,5 au moins et jamais
plus de quatre demandes en vol (× 0,95 sur `origin/main`, crochet absent ;
× 2,06 ici, quatre en vol contre six pour l'ancienne boucle) ; et
la même mesure dans une scène vide, où la recharge garde la cadence de
l'ancienne (51–57 images par seconde contre 53–57) — preuve que la cadence
perdue en ville au banc (14 → 5) est SwiftShader qui dessine enfin la ville
(15 → 190–290 appels de dessin), pas le chargement. La sonde
`sonde-monde-a-la-vitesse.cjs` publie désormais où passe le temps (worker à
sec, installation, rendu, transit) et `sonde-file-age.cjs` l'âge des demandes.
Ce qui reste à mesurer sur la tablette : la cadence à 70–80 b/s dans Paris
(`?diag=1`).

---

## v359 — Les rues de Nice à la règle du kit

**Pourquoi.** La deuxième des cinq villes bâties à la main restées sur leurs
largeurs relevées à la main (dette v271). La ruelle du Vieux-Nice faisait 1,2
bloc de chaussée, la rue de la ville neuve 2, les avenues 2,9 à 5,8 — et la
trame passait encore à quelques blocs des avenues parallèles.

**Ce que ça change.**

- **Les rues de Nice ont la section du kit**, à un bloc pour un mètre : deux
  voies et des trottoirs de 2,5 m pour la Promenade des Anglais, Jean-Médecin
  et les boulevards de la ville neuve ; une voie de 3,1 m pour la rue de
  France, à sens unique, et les rues de quartier ; deux voies pour les rues de
  la ville neuve et de Cimiez, une pour les ruelles du Vieux-Nice — « une
  ruelle héritée est une rue locale », comme à Paris.
- **Les îlots se recomposent** comme à Londres, et Nice garde ses immeubles :
  23,7 % du disque bâti contre 22,7. Le prix, déclaré : Masséna 13,2 → 8,6,
  les Musiciens 20,4 → 14,5, le port 21,8 → 16,4 ; Cimiez et Malausséna en
  gagnent.
- **Londres gagne encore deux points** (26,6 → 28,7 %) : la règle qui retire
  une rue de la trame trop proche d'une avenue comptait la demi-chaussée au
  lieu de la demi-emprise, et laissait des lots de trois blocs et demi.
- **Ce qu'un enfant a bâti à Nice ne bouge pas** : sous ses blocs d'avant la
  mise à jour, la Nice d'avant reste.

**Ce qui le prouve.** Quatre témoins neufs. `carteMonde.js` : les rues de
Nice ont la chaussée de leur type (artères 7,0, rues 3,0, ville neuve 6,95
contre 5,0, 2,95 et 0,95 sur `origin/main`) ; Nice garde plus de 21 % de
lots, aucun quartier sous 4 %. `plafond.js` : à Nice, une maison posée sur
une ancienne rue n'est pas enfermée et une cabane garde son toit (désarmé :
8 blocs de ville, toit absent) ; les deux témoins de Londres passent par la
même fonction. Les trois circuits de Nice restent à 99-100 % sur la rue.

---

## v358 — Des voitures qui se conduisent pour de vrai

**Pourquoi.** Max : « une grosse refonte de la façon de conduire… comme GTA :
des véhicules qui tournent de manière naturelle, des accélérations
cohérentes, des vitesses cohérentes — aujourd'hui les véhicules sont trop
lents —, des collisions cohérentes ». La voiture de l'enfant prenait son
allure en une demi-seconde, tournait au même taux à toute vitesse, plafonnait
à 92 km/h même en hypercar, et s'arrêtait net contre tout ce qu'elle touchait.
Sa boîte de collision ne tournait pas : le nez et le coffre traversaient ce
qui dépassait des côtés.

**Ce que ça change.** Un vrai modèle de voiture, toujours au joystick d'un
seul doigt : on accélère fort au départ, la poussée s'essouffle vers la
pointe ; le frein est franc ; lâcher le joystick laisse filer en roue libre ;
on tourne serré au pas et large à pleine vitesse, et un virage serré pris vite
fait glisser un peu la voiture, qui se rattrape toute seule. Les voitures vont
beaucoup plus vite, chacune selon sa classe : citadine 108 km/h, berline 122,
GT 151, sportive 173, hypercar 198 (0 à 100 en 2 s) — et toutes
bondissent au départ. Contre un mur pris en
rasant, la voiture glisse le long et se remet dans l'axe de la rue ; de face,
elle s'arrête avec un petit rebond ; une voiture de la rue ou un réverbère la
font rebondir ; devant un piéton elle freine à temps. Chaque choc est publié
(force, point d'impact) pour les dégâts et la caméra qui viennent — et il
s'efface quand on descend : une voiture neuve ne part plus abîmée par le
dernier choc de la précédente.

**Ce qui le prouve.** Le plafond de vitesse a été MESURÉ et non calculé : à 60
blocs/s, à la distance d'affichage de l'iPad, le monde se maille encore 125
blocs devant la voiture, dans Paris comme dans les champs
(`sonde-plafond-voiture.cjs`). Cinq témoins purs dans `plafond.js` (classes
sous le plafond, 0 → 100 simulé contre la formule, dérive bornée et rattrapée,
chocs, boîte orientée) et neuf témoins de trajet dans `monte.js` (0 → 100 en
2 s de jeu, pointe 52 blocs/s, frein, rayon de virage 3,9 au pas et 14,4 à
20 blocs/s, mur rasant, mur de face, voiture de la rue, panne) — treize rouges
sur `origin/main`, le frein franc gardé vert des deux côtés. Trois témoins
existants repointés (rapport des pointes, crochet qui nomme la famille, piste
de l'accélérateur). Au portail, les rouges restants sont des dettes déclarées
et rejouées seules des deux côtés : `manhattan.js` identique (23 verts, mêmes
deux rouges, même arrêt), et le gel d'arrivée de `monte.js` (vol du chasseur,
chemin que la livraison ne touche pas : 1 183–1 283 ms contre 1 050–1 150).

---

## v357 — Les tours ont une emprise

**Pourquoi.** La v353 avait laissé à leur hauteur d'auteur treize tours qui
dominaient déjà leurs toits — la Willis Tower, le John Hancock, la perle de
l'Orient, Jin Mao, les tours de Tokyo et de Séoul, la Skytree, la Banque de
Chine, l'IFC, l'hôtel de ville de Bruxelles, la Koutoubia, le campanile de
Venise — parce que leurs bâtisseurs étaient des colonnes d'un bloc : étirées
à leur vraie hauteur, des perches (vu en capture à Bruxelles et à Chicago).
Saint-Pierre de Rome, lui, était une coupole sans basilique, donc une tour.
Max : « Improve all cities ».

**Ce que ça change.** Chacune a son bâtisseur, d'après sa vraie silhouette et
dans la boîte de son repère (aucune rue, aucun terrain ne bouge) : les neuf
tubes de la Willis qui s'arrêtent l'un après l'autre et ses antennes,
l'obélisque noir du Hancock, les gradins de Jin Mao, les sphères roses de la
perle de l'Orient, le treillis orange et blanc de la tour de Tokyo, les
belvédères de la Skytree, les prismes de la Banque de Chine, la couronne de
l'IFC, la halle gothique de Bruxelles et sa tour, le bandeau turquoise de la
Koutoubia, la chambre des cloches et la pyramide verte du campanile. Leur ville
a désormais son ciel, et elles montent à leur hauteur : la Willis à
cinquante-sept blocs, le Hancock à cinquante-cinq. Le témoin neuf a trouvé dix
autres perches dans toutes les villes, refaites aussi — la Fernsehturm, la CN
Tower, la Torre Latino, Saint-Étienne de Vienne et Saint-Guy de Prague avec
leur nef, le Palazzo Vecchio avec son palais, la Frauenkirche, l'hôtel de ville
de Munich, la demi-tour Eiffel de Las Vegas sur ses quatre pieds, la Freedom
Tower — et les quatre pagodes, qui n'avaient qu'un poteau sous chaque toit,
ont leurs étages. Saint-Pierre a sa nef, son transept et sa façade. Deux inversions du vrai
ciel tombent : la grande roue du Prater, à son vrai rayon, passe au-dessus de
la Hofburg, et la tour du nord du château du Smithsonian au-dessus du
mémorial Jefferson. Le monde
d'avant garde ses colonnes : un bloc posé avant se juge sur le monde où il a
été posé.

**Ce qui le prouve.** Un témoin neuf dans `plafond.js` : aucun repère qui
monte à une fois et demie la corniche de sa ville n'est une perche (plus de la
moitié de ses couches sur une ou deux colonnes), sauf les quatre fûts vrais —
la colonne de Juillet, la colonne Nelson, celle de Colomb, l'Obélisque. Rouge
sur `origin/main` (vingt-trois perches), vert ici. Le témoin d'ordre du ciel
reste vert dans toutes les villes, la roue du Prater et le château du
Smithsonian y entrent, les deux empreintes du relief sont intactes, et l'empreinte des 490
morceaux de la v352 change pour une seule raison, prouvée : la même branche,
ses bâtisseurs neufs désarmés, rend celle d'`origin/main` au bit près (qui, elle, ne suivait plus les routes de la v355 : le témoin y était rouge, c'est réparé).

---

## v356 — L'épave reste, et la rue s'abîme aussi

**Pourquoi.** Trois manques laissés déclarés par la v343. À plusieurs, quand
la voiture de Marlon prenait feu et qu'il était déposé à côté, elle
s'évanouissait chez Alice au moment même où elle brûlait : la position de
Marlon n'emportait plus de voiture. Percuter une voiture de la rue n'abîmait
que celle de l'enfant — l'autre repartait comme neuve. Et la réparation au
garage n'était éprouvée qu'en appelant `reparer` à la main, jamais par le
geste de l'enfant.

**Ce que ça change.** Chez l'ami, l'épave en feu reste là où elle s'est
arrêtée : elle brûle, fume, puis s'en va au bout d'une minute et demie,
comme chez celui qui conduisait. Rien de neuf ne voyage sur le réseau : c'est
le receveur qui la garde. Une voiture de la rue qu'on percute se froisse à
son tour — sa tôle à elle, jamais celle que toute la rue partage —, garde ses
enfoncements, fume si elle est très touchée, et ne prend JAMAIS feu
(personne n'est jamais blessé, personne à déposer). Ranger sa voiture abîmée
au garage puis la ressortir la rend neuve.

**Ce qui le prouve.** Six témoins neufs dans `degats.js`, dont quatre ROUGES
sur l'ancien code : l'épave vue par Alice après le dépôt de Marlon (sur
l'ancien code, plus de voiture), l'épave qui s'en va et rend ses géométries
froissées (13 sur 13), la voiture de la rue percutée par le VRAI chemin du
choc (14 pièces clonées, zéro géométrie commune touchée, 14 encore portées
par une voiture neuve du même modèle), et la même très touchée qui fume sans
brûler puis rend ses 14 clones quand elle s'en va. Le garage par le trajet
(descendre dedans, remonter) est vert des deux côtés et rougit quand on
désarme la réparation ; le contrat avec la physique (un choc publié compte
une fois, l'allure n'est jamais réduite deux fois) garde une capacité pour le
jour où `player.choc` sera publié.

---

## v355 — Deux routes qui contournent une ville : Toronto–Montréal et Cologne–Hambourg

**Pourquoi.** Deux corridors du kit étaient restés « sans tracé » en v337.
Montréal est en contrebas de son pays à l'ouest, Hambourg au sud-ouest et
Cologne au nord-est : chaque fois, la ville est basse du côté qui regarde
l'autre. Les sondes d'avant ne savaient faire que deux coudes ou un chemin
lissé tout droit ; aucune ne savait tourner AUTOUR d'une ville pour y entrer
par son côté bas. À Hambourg, l'Elbe ferme le sud du disque et l'A24 son est ;
à Cologne, l'aérodrome de Francfort ferme l'est et l'ICE d'Amsterdam frôle le
nord-ouest.

**Ce que ça change.** La 401 relie Toronto à Montréal (2 711 blocs) : elle
contourne Montréal par le sud et y entre par son axe sud. La Hansalinie relie
Cologne à Hambourg (2 387 blocs) : elle sort de Cologne entre l'ICE et
l'aérodrome, puis fait le tour de Hambourg par l'ouest pour y entrer par le
nord-ouest. Deux fois deux voies, aucun pont, vingt voitures chacune, des
deux côtés une entrée sur une rue propre. Montréal a désormais deux autoroutes,
Hambourg et Cologne aussi. Le relief ne bouge pas.

**Ce qui le prouve.** Trois témoins neufs dans `carteMonde.js`. Les deux
routes (rouges sur `origin/main` : elles n'existent pas) — leurs voitures,
leurs entrées sur la rue, zéro colonne d'emprise sur un rail, et aucun point
d'axe à moins de r + 10 de leurs villes hors du tronçon radial. Et un témoin
général : aucune route ne prend une colonne d'emprise à une autre (Montréal,
Hambourg et Cologne en ont deux), et aucune ne frôle ses villes — zéro sur les
vingt et une, sous node. La sonde nouvelle cherche le COULOIR LE PLUS BAS sur
une grille qui porte le cap (on ne vire que d'un huitième de tour, après deux
pas droits), avec les rails, les autres routes et les aérodromes interdits,
puis lisse et appelle `profilDe` sur chaque candidat : 16 admissibles sur
3 000 pour la 401, 397 sur 1 500 pour la Hansalinie. Et le témoin des ponts de
villes l'a prouvé une fois de plus : la première Hansalinie entrait par l'axe
nord de Hambourg, au bout d'un pont de l'Alster, et le talus de la route en
creusait le tablier (six points sans sol, rouge sur la branche, vert sur
`origin/main`) ; la porte est passée au nord-ouest.

---

## v354 — Les passants de Manhattan se promènent

**Pourquoi.** Depuis la v278, les passants des villes marchent le long de leur
trottoir — sauf à New York, la seule ville dont le trottoir vit dans un plan et
non dans des blocs : ils y gardaient le vieux programme, une longue pause puis
un pas au hasard. Une avenue de Manhattan semblait peuplée de gens qui
attendent.

**Ce que ça change.** À Manhattan aussi, les passants marchent d'un pas
régulier le long du trottoir et tournent au coin de la rue. Ils ne descendent
pas sur la chaussée : là-bas, ce qui fait un trottoir se lit dans le plan de la
ville (`ruePietonne`), et c'est lui que `trottoirA` interroge désormais.

**Ce qui le prouve.** Un témoin neuf de `manhattan.js` fait avancer la troupe
de dix secondes de jeu d'un seul tenant et mesure un débit de chemin par
seconde : `origin/main` v351, 0 promeneur sur 10 et 0,54 bloc/s (rouge) ; ici
11 sur 11 puis 10 sur 10, 0,99 et 1,25 bloc/s, zéro passant sur la chaussée.
Le témoin du taxi fait désormais le vide des passants autour de lui, comme il
le faisait des bêtes.

---

## v353 — Le ciel de toutes les villes

**Pourquoi.** La v342 avait donné son ciel à vingt-cinq villes engendrées —
celles qui portaient une dette. Mesuré sur toutes les autres : vingt et une
villes avaient des repères au-dessus de leurs toits mais pas à leur vraie
hauteur (la Frauenkirche de Munich à quinze blocs pour quatre-vingt-dix-neuf
mètres, le Capitole de La Havane à onze pour quatre-vingt-douze, la pagode de
Sensō-ji à seize, à peine au-dessus des immeubles). Max : « lance sur toutes
les villes, pas juste celle-là ».

**Ce que ça change.** Seize monuments de neuf villes prennent la hauteur de
leur ciel — la corniche mesurée, la courbe de Paris posée dessus : le
Capitole de La Havane à trente-quatre blocs, la coupole de Saint-Marc à
dix-huit, les tours de la Frauenkirche et le beffroi de Munich à vingt-trois,
la colonne de Colomb à Barcelone, la Freedom Tower de Miami, la demi-tour
Eiffel de Las Vegas, et trois pagodes, Sensō-ji, Tō-ji et Kiyomizu-dera, dont
chaque étage s'étire et chaque toit reste un rang. Le ciel garde son ordre :
Tokyo et Munich compriment leur courbe pour que la tour de Tokyo et la
Frauenkirche restent au-dessus. Les tours d'un bloc qui dominent DÉJÀ leurs
toits (l'hôtel de ville de Bruxelles, la Koutoubia, la Willis Tower, la
Skytree…) ne bougent pas : étirées, ce sont des perches. L'emprise ne bouge
d'aucun bloc, le sol non plus.

**Ce qui le prouve.** Un témoin neuf dans `plafond.js`, rouge sur
`origin/main` (dix-neuf villes sans ciel) : toute ville engendrée dont un
repère est mesuré a son ciel, ou dit pourquoi ; et aucun fût qui domine déjà
ses toits n'est étiré. Le témoin d'ordre couvre cinquante-neuf monuments
contre quarante-huit, avec la Sagrada Família, le Luxor, le campanile, la tour
de Tokyo et la Skytree en repères fixes. Les deux empreintes du relief sont
intactes. Captures de rue et de ciel des onze villes : elles ont démonté le
premier jet (l'hôtel de ville de Bruxelles à trente-quatre blocs, la Willis
Tower à cinquante-cinq, des perches noires au-dessus de la ville).

---

## v352 — Un morceau de monde coûte deux fois moins

**Pourquoi.** La v346 avait mesuré qu'au-delà de 70 blocs par seconde la
ville ne suit plus une voiture, et que le seul levier restant était le coût
d'un morceau dans le worker. Profilé sous node, ce coût n'était pas là où on
l'attendait. La génération n'en faisait pas 45 % : à Paris le maillage pesait
le double de la génération. Et un cinquième du coût d'un morceau de Paris
était une lecture du relief dont la réponse était jetée : `routeEn` relisait
`terrainHeight` pour toute colonne de la case de 512 blocs qui contient une
autoroute, avant de conclure « pas de route ici ».

**Ce que ça change.** Rien à l'œil : pas un bloc, pas un sommet ne bouge. Le
worker engendre et maille un morceau de Paris en 3,3 ms au lieu de 8,3, Rome
en 4,1 au lieu de 10,5, Londres en 5,4 au lieu de 8,9, la campagne en 2,5 au
lieu de 4,1 (sous node, médianes en ordre alterné). En roulant à 80 b/s au
banc, la ville maillée devant soi gagne 5 à 25 blocs (Rome 113–122 → 129–138).
Cela ne suffit pas pour 80 b/s : au banc, la ville plafonne vers 55 morceaux
par seconde des deux côtés, et ce n'est plus le worker qui la limite. Le
plafond au sol publié reste donc à 60 et 70 b/s : on ne publie qu'une valeur
tenue. Sur la tablette, le worker a deux fois moins de calcul à faire par
morceau, et cela, l'iPad le reçoit.

Les cinq gains :
- `routeEn` s'arrête au talus le plus large possible ;
- le mailleur lit des tables par identifiant, garde ses voisins en main,
  calcule l'occlusion sans allouer, et prend une clé de fusion numérique ;
- le relief du morceau se lit une fois par colonne et se garde ;
- la Tamise et les fleuves ne calculent `hypot` que pour le segment qui peut
  gagner.

**Ce qui le prouve.** Deux témoins neufs dans `plafond.js` :
- **l'empreinte des blocs et de tous les tampons du mailleur** de 490
  morceaux, autour de neuf lieux (Paris avec et sans la couche HD, Rome,
  Londres, la campagne, l'A1, Washington, San Francisco, Marrakech, Tokyo),
  plus `routeEn` sur toutes les routes du registre, est **identique à celle
  de la v351**. Elle rougit si l'on casse la borne de `routeEn` à dix blocs ;
- **le travail d'un morceau en appels**, pas en millisecondes : à Paris
  **2 209 → 463 lectures de relief, 3 811 → 324 lectures de blocs** ; barre au
  milieu, rouge sur la v351.

Les deux empreintes du relief de `plafond.js` sont intactes. La Tamise a été
comparée à l'ancien code sur 4 millions de points : zéro écart. La sonde
`sonde-monde-a-la-vitesse.cjs` a été rejouée en ordre ABBA, avec ses chiffres
dans `plafond-sol.js`.
## v351 — Les piétons à l'abri des voitures rapides

**Pourquoi.** Le chantier « conduite » fait rouler les voitures trois fois plus
vite — 40 à 70 blocs par seconde. L'écart des piétons (v259) avait été réglé
pour 4 à 25 : il regardait trente blocs devant une voiture, une demi-seconde à
60 b/s, quand il en faut plus pour sortir d'une carrosserie au pas pressé. Et,
plus grave, la voiture roule sur l'horloge RÉELLE de la rue (v305) quand le
piéton marche en temps de jeu, borné à un vingtième de seconde : sur une
tablette qui rame, il marchait quatre fois moins vite que la voiture qui
arrive. Mesuré sous node : un piéton touché dès 50 b/s à soixante images par
seconde, dès 7 b/s à cinq.

**Ce que ça change.**

- **Un piéton voit venir une voiture 1,6 seconde à l'avance**, quelle que soit
  sa vitesse, et s'en écarte d'un pas pressé compté en temps réel : il sort de
  la trajectoire à temps même quand la tablette rame. Personne n'est touché.
- Loin devant, seul celui qui est DANS la trajectoire réagit : les passants du
  bord du trottoir continuent leur chemin.
- La pause qui suit un écart n'aveugle plus : on regarde la route en soufflant.

**Ce qui le prouve.** Un témoin de `monte.js` lance une voiture à 60 puis
70 b/s sur un passant immobile, six fois, dont une à cinq images par seconde
provoquées ; il juge le volume balayé par la carrosserie entre deux images et
la position d'arrivée du piéton. Rouge sur `origin/main` (trois passes sur six
touchées, arrivée à 0,68 bloc de l'axe), vert ici (zéro, arrivée à 2,9). La
sonde sous node : aucun choc jusqu'à 120 b/s, de 60 à 3 images par seconde.
Coût mesuré en ordre alterné : 0,05 à 0,1 ms par image pour cent piétons et
deux cents voitures.

---

## v350 — L'Opéra de Lille, Buckingham et les Archives à leur hauteur

**Pourquoi.** La mesure de la v335, lancée sur toutes les villes, avait laissé
huit monuments des villes bâties à la main plus bas que les immeubles autour
d'eux, déclarés en dette (« lot 2 ») : l'Opéra de Lille à six blocs pour des
toits à sept, Buckingham à sept pour huit, l'Arche de Washington à New York, et
à Washington le Trésor, les Archives, le Théâtre Ford, les musées d'Histoire
américaine et de l'Indien d'Amérique.

**Ce que ça change.** Trois montent dans le ciel de leur ville, la même règle
que les villes engendrées (la corniche mesurée, puis la courbe de Paris) :
l'Opéra de Lille passe de six à onze blocs, une fois et demie les toits de la
place du Théâtre (à seize, son petit bâtisseur faisait une tour blanche, vu en
capture) ; Buckingham de sept à
douze, à la hauteur de la Tour Blanche ; les Archives nationales de onze à
quinze, à la hauteur du dôme de la Bibliothèque du Congrès. Sous la troisième
couche rien ne s'étire : la porte, la locomotive du musée, les gardes et les
grilles de Buckingham gardent leur taille. Les cinq autres sont bas dans la
vraie ville aussi et le disent : l'Arche (23 m) au milieu des immeubles de NYU,
et à Washington, ville plafonnée par la loi de 1910, le Trésor, le Théâtre Ford
et les deux musées du Mall, qui monteraient sinon au-dessus des tours du
château du Smithsonian.

**Ce qui le prouve.** Le témoin des monuments de `plafond.js` n'a plus aucune
dette « lot 2 » (huit sur l'ancien code) ; celui de l'ordre du vrai ciel
compte désormais les villes bâties à la main, avec quinze repères fixes de
hauteur connue (le Capitole, Big Ben, la Tour Blanche, les beffrois de Lille…) :
aucune inversion, chaque monument à sa cible. Captures de rue et de ciel des
trois monuments (`tests/sonde-captures-lot2.cjs`).

**Et à Paris, des cubes ne dépassent plus des modèles étirés.** Second sujet de
la livraison. La corniche de l'Opéra, l'entablement du Panthéon et le pied de
la flèche de Notre-Dame faisaient quatre dixièmes de bloc ; la couche du voxel
qu'ils habillent en fait un, et une fois étirée par la v335 la fin de la couche
sortait du modèle en cubes. Les trois modèles prennent l'épaisseur de la
couche : au-dessus de la hauteur d'un enfant, l'Opéra passe de 15 cellules de
flanc découvertes à 0, le Panthéon de 6 à 0, Notre-Dame de 8 à 0, et un témoin
de `plafond.js` les compte. Restent les vingt-quatre cubes du parvis de
Notre-Dame, au sol, d'avant la v335 (dette déclarée).

---

## v349 — Les forêts tropicales

**Pourquoi.** L'Amazonie, le bassin du Congo, Bornéo étaient une campagne
tempérée clairsemée : 196 arbres au cœur de trois forêts tropicales sur
`origin/main`, et pas un palmier. C'est la dernière tranche de climat du
point (d) du kit « monde fidèle ».

**Ce que ça change.** Dix forêts tropicales humides réelles — l'Amazonie,
le golfe de Guinée et le Congo, l'Insulinde de Sumatra à la Nouvelle-Guinée,
les Philippines, l'Amérique centrale, la forêt atlantique du Brésil, l'est de
Madagascar, le Kerala, le Bengale et l'Assam, le Queensland — sont une forêt
dense de grands feuillus et de palmiers, l'herbe d'un vert profond. Le
paysage lointain et la carte disent la même chose. La forme du monde ne bouge
pas d'un bloc ; les villes gardent leur sol.

**Ce qui le prouve.** Un témoin neuf et un témoin élargi dans `plafond.js`,
rouges sur `origin/main` : au cœur de trois forêts tropicales, 472 arbres
contre 196 dont 112 palmiers, l'herbe teinte, zéro bloc de forme différente ;
vu de loin et sur la carte, la forêt tropicale est d'un vert plus profond
que le Kansas.

---

## v348 — Le feu ne coûte plus que deux appels

**Pourquoi.** Les dégâts de la v343 dessinaient chaque carré de fumée et
chaque flamme par son propre maillage : pendant un feu, jusqu'à
cinquante-quatre appels de dessin de plus, et mesuré au banc, trente appels
pour trente carrés. Or sur l'iPad ce sont les appels de dessin qui coûtent
(v196) : une voiture qui brûle pouvait faire ramer la tablette précisément au
moment où l'enfant regarde.

**Ce que ça change.** Rien à l'œil : la même fumée grise puis noire, les mêmes
flammes orangées. Mais toute la fumée est dessinée en UN appel et toutes les
flammes en un autre, quel que soit le nombre de carrés — un `InstancedMesh`
par effet, la couleur et l'opacité portées par chaque instance. Un essaim
vide est caché : sans feu, zéro appel.

**Ce qui le prouve.** Un témoin neuf de `degats.js` rend la même image deux
fois, l'essaim caché puis montré, au cœur du feu : **30 appels pour 30
carrés sur l'ancien code, 2 pour 28 ici** (barre : deux, un par effet).
Le témoin « aucun programme compilé au feu » reste vert (96 → 96) : la
chauffe de l'accueil compile désormais la forme instanciée elle-même.

---

## v347 — Les steppes

**Pourquoi.** Entre les forêts et les déserts, le monde réel a ses grandes
prairies sèches — de la mer Noire à la Mongolie, les Hautes Plaines, le Sahel,
la Patagonie — et le jeu y montrait la même prairie verte et boisée qu'en
Normandie : 326 arbres au cœur de quatre steppes sur `origin/main`. Quatrième
tranche du point (d) du kit « monde fidèle ».

**Ce que ça change.** Douze steppes réelles ont l'herbe sèche couleur de
paille, et un arbre là où la forêt tempérée en aurait vingt : le Kazakhstan,
l'Ukraine du Sud, la Mongolie, l'Anatolie, le plateau iranien, les Hautes
Plaines à l'ouest du 100e méridien, le Grand Bassin, le Sahel, la Corne de
l'Afrique, le Karoo, la Patagonie, l'intérieur australien autour du désert,
le nord du Mexique. Au loin et sur la carte, la steppe est blonde. La forme du
monde ne bouge pas d'un bloc ; le Kansas, l'Iowa, la Pampa et l'Ukraine du
Nord restent verts.

**Ce qui le prouve.** Un témoin neuf et un témoin élargi dans `plafond.js`,
rouges sur `origin/main` : au cœur de quatre steppes (Kazakhstan, Mongolie,
Montana, Patagonie), 11 arbres contre 326, l'herbe teinte, zéro bloc de forme
différente ; vu de loin et sur la carte, la steppe est blonde à côté du
Kansas. Le témoin tempéré de la v341 compte toujours zéro bloc différent.

---

## v346 — Le monde suit les voitures

**Pourquoi.** Max veut une conduite « comme GTA », et les voitures sont trop
lentes. Leur vitesse était plafonnée à vingt-huit blocs par seconde en ville
sur un chiffre de la v237 — « Paris se maille à 42 morceaux par seconde » —
mesuré AVANT que le maillage ne parte dans un worker (v251), et jamais
remesuré. Et en roulant vite, la file de maillage servait d'abord les côtés
qu'on dépasse : à soixante blocs par seconde dans Paris, la caméra ne
dessinait que huit appels devant elle — l'enfant roulait devant le seul
paysage lointain.

**Ce que ça change.** Quand on va vite, le monde se charge là où l'on va : la
file de maillage suit le déplacement réel (plus le regard), donne la priorité
aux morceaux dans l'axe, et ne demande plus ce qu'on laisse derrière soi. Et le
plafond de vitesse au sol est désormais MESURÉ et publié
(`src/plafond-sol.js`) : soixante blocs par seconde en ville, soixante-dix en
campagne et sur l'autoroute, soixante au palier bas — c'est ce que la conduite
pourra donner aux voitures (« on mesure, elle applique »). Rien ne change à
l'arrêt ni à pied, ni dans un navigateur sans carte graphique, qui garde
l'ordre d'avant (comme il garde déjà ses ombres éteintes).

**Ce qui le prouve.** Une sonde en roulant, régime établi
(`tests/sonde-monde-a-la-vitesse.cjs`) : à rr 12, le worker rend 43 à 58
morceaux par seconde en ville et 54 à 78 en campagne ; à 60 b/s le monde est
maillé dans le champ de la caméra jusqu'à 132 à 143 blocs en ville contre 101
à 107 sur l'ancienne file, sans aucune image au-delà de 300 ms. Deux témoins
dans `monte.js`, tous deux rouges sur `origin/main` : l'ordre de la file (le
morceau de l'axe à douze avant celui de côté à sept, rien derrière — 250
morceaux derrière sur l'ancienne), et à 60 b/s dans Paris l'écart de la part
des morceaux maillés dans le champ de la caméra entre l'ordre neuf et l'ordre
d'avant, joués dans la même page en alternance (0,29 ici, −0,04 sur
`origin/main`, barre 0,13).

---

## v345 — La toundra et la taïga

**Pourquoi.** La v341 a donné au monde ses déserts ; le reste du climat
manquait. Le Grand Nord canadien, la Iamalie, la Sibérie arctique étaient des
prairies vertes, et la grande forêt boréale — la Iakoutie, le Québec du Nord,
la Finlande — une plaine semée de chênes : mesuré sur `origin/main`, 185
arbres sur 15 119 colonnes au cœur de quatre taïgas, et 197 arbres et zéro
pierre au cœur de trois toundras. Deuxième tranche du point (d) du kit
« monde fidèle ».

**Ce que ça change.** Au nord de la vraie limite des arbres (68° sur le
Mackenzie, 59° au bord de la baie d'Hudson, 67° au pied de l'Oural, 72° sur la
Khatanga), et sur le haut plateau du Tibet, la campagne est une toundra :
herbe rase olive, plaques de roche nue, neige dès que le relief monte, et
presque plus un arbre. En dessous, la taïga fait le tour du pôle : une forêt
de pins presque partout, quelques bouleaux, l'herbe sombre et froide. Le
paysage lointain et la carte du monde disent la même chose que le sol. Les
villes gardent leur sol et leurs parcs ; la forme du monde ne bouge pas d'un
bloc ; là où un enfant a bâti avant cette version, ses arbres restent ceux
d'avant.

**Ce qui le prouve.** Cinq témoins neufs dans `plafond.js`, tous rouges sur
`origin/main` : au cœur de trois toundras, 1 441 colonnes de roche ou de
neige sur 9 263, 5 arbres contre 197, zéro bloc de forme différente ; au cœur
de quatre taïgas, 520 arbres contre 185 dont 445 pins, l'herbe teinte et rien
de teint au Kansas ; un morceau déclaré d'un climat l'est colonne par colonne
(3 657 morceaux, zéro désaccord) ; les arbres d'avant restent là où un enfant
a bâti ; vu de loin et sur la carte, la toundra est olive et la taïga sombre à
côté du Kansas. Coût mesuré sous node, ordre alterné : le mailleur inchangé
hors des zones (9,34 contre 9,32 ms par morceau), une question de climat
coûte 0,37 µs.

---

## v344 — Les amis voient les dégâts

**Pourquoi.** Depuis la v343 la voiture de l'enfant s'abîme, fume et brûle —
mais seulement sur SA tablette. À plusieurs, l'ami qui le regarde conduire
voyait une voiture neuve foncer dans un mur et repartir intacte : la moitié de
la scène manquait (« une voiture conduite doit se voir en ligne », CLAUDE.md).

**Ce que ça change.** La position du conducteur emporte désormais les dégâts
de sa voiture, en un champ court (`p.v.d` : les impacts et l'état du feu).
L'ami rejoue les mêmes impacts sur la voiture qu'il dessine : la même tôle
enfoncée, la même fumée, les mêmes flammes. Une tablette restée sur l'ancienne
version ignore le champ et voit la voiture comme avant.

**Ce qui le prouve.** Deux témoins à deux tablettes dans `tests/degats.js`,
ROUGES sur la v343 (santé 1 et aucune pièce froissée chez Alice ; pas de
flammes) et verts ici (santé 0,7 et quinze pièces froissées chez Alice ; puis
le feu, des flammes chez elle aussi, avant que Marlon ne soit déposé).

---

## v343 — La voiture s'abîme

**Pourquoi.** Max : « Comme dans GTA, quand tu crashes ton véhicule, il
s'abîme, tu vois vraiment les défauts de carrosserie… La voiture perd son sens,
à un moment elle ne marche plus, potentiellement elle prend feu, on se retrouve
à sortir de la voiture. » Jusqu'ici une voiture lancée à pleine vitesse dans un
mur s'arrêtait net et repartait comme neuve : rien ne se voyait, rien ne
comptait.

**Ce que ça change.** La voiture que l'enfant conduit a une santé, zone par
zone (avant, arrière, flancs, toit). Un choc enfonce la tôle là où il a eu
lieu : le nez se froisse, le pare-chocs s'affaisse, les phares s'éteignent, le
pare-brise s'étoile, l'aileron se détache. Le moteur touché fume (gris, puis
noir), la voiture va moins vite, la direction tire du côté abîmé ; sous un
seuil elle cale et ne repart plus. Sous le seuil critique elle prend feu — des
flammes orange, aucune lampe de plus —, le jeu dit « descends vite ! », et
trois secondes et demie plus tard l'enfant est déposé à côté, debout, sain et
sauf. La voiture brûle quatorze secondes, puis reste une carcasse noire qui
fume, qu'on ne peut plus prendre, et qui s'en va au bout d'une minute et demie.
Une voiture neuve est intacte ; garer la sienne au garage la répare. Personne
n'est jamais blessé, et s'arrêter devant un piéton ou au bord de l'eau n'est
jamais un choc.

**Ce qui le prouve.** Une suite neuve, `tests/degats.js` (une minute) : sept
témoins de la règle sous node (la santé suit la force, les zones à tous les
caps, la panne, le feu, le repli de détection, le réseau) et treize dans le
jeu, tous vérifiés ROUGES sur `origin/main`. Les plus importants : foncer dans
un mur à 20,5 blocs/s abîme l'AVANT ; les sommets lus dans la géométrie
s'enfoncent de 0,9 à l'avant et de 0 à l'arrière ; l'autre voiture du même
modèle garde la géométrie commune, intacte ; pleins gaz, la voiture en panne
ne bouge plus ; le feu dépose l'enfant à 2,4 blocs, hors de tout mur ; ni
lampe ni programme de shader de plus (94 → 96 si l'on désarme la chauffe,
96 → 96 armée) ; la carcasse partie rend ses géométries clonées au pilote.
Enfoncer coûte 12 ms au premier choc, 6 ensuite, rien par image. Captures de
jour et de nuit : neuve, avant enfoncé qui fume, flanc, feu, carcasse.

---

## v342 — Les monuments du monde dominent leurs villes

**Pourquoi.** La v335 a remis Paris à l'échelle de son ciel, et la même mesure,
lancée sur toutes les villes, a rendu quarante-sept monuments des villes
engendrées plus bas que les immeubles autour d'eux : St-Pierre de Rome à douze
blocs pour des toits à treize, le palais d'Hiver et la Hofburg à cinq, le
Parthénon à six, Sainte-Sophie, Saint-Basile et le Duomo de Florence noyés dans
la ville. Ils étaient déclarés en dette dans le témoin, « lot 3 ».

**Ce que ça change.** Chaque ville a désormais son ciel : un bloc pour un mètre
jusqu'à la corniche de SES immeubles (mesurée, de huit blocs à Jérusalem à vingt
à Los Angeles), puis la courbe de Paris posée sur cette corniche. St-Pierre
monte à trente-huit blocs, le Duomo de Florence à trente-six, le Berliner Dom à
trente-cinq, Saint-Sauveur-sur-le-Sang à trente et un, Saint-Basile à
vingt-sept, la gare Victoria de Bombay à vingt-six. L'emprise ne bouge pas d'un
bloc : on étire le corps (le tambour d'une coupole, les murs d'un palais), la
couronne s'étire moins. Et le ciel garde son ordre : là où un repère plus haut
dans la vraie ville est un fût d'un bloc (la Westerkerk, la tour de Galata, la
Torre Latino), la courbe de la ville passe SOUS lui ; un fût ne monte jamais
au-delà d'une fois et demie sa hauteur. Cinq monuments sortent de la dette parce
qu'ils sont bas dans la vraie ville aussi : la colonne de Marie, Topkapi, le
Templo Mayor, le Pavillon d'or et Wat Pho.

**Ce qui le prouve.** Deux témoins neufs dans `plafond.js` : plus aucun monument
du lot 3 en dette (quarante-sept sur l'ancien code), et l'ordre du vrai ciel
gardé ville par ville, contre les monuments étirés ET les repères fixes (tour de
Pise, Westerkerk, Fernsehturm, CN Tower…) — rouge quand on retire un repère de
la table. Le témoin des monuments mesure toujours 215 monuments contre la
médiane de leurs immeubles, sans une faute. Captures de rue et de ciel : elles
ont démonté trois premiers jets — des coupoles en obus (le corps étirait le bas
de la calotte), des minarets en aiguilles (Santa Justa à vingt-six blocs,
Galata montée pour l'ordre) et les tours d'angle du Kremlin et du Grand Palais,
poteaux d'un bloc étirés jusqu'à trente.


---

## v341 — Les déserts

**Pourquoi.** Le planisphère savait la terre, la mer et les grandes chaînes de
montagnes ; il ne savait pas le climat. Le cœur du Sahara, le Rub al-Khali,
l'intérieur australien, l'Atacama étaient des prairies boisées : mesuré sur
`origin/main`, 14 colonnes de sable sur 4 309 au cœur de cinq déserts, et 49
arbres. C'est le point (d) du kit « monde fidèle », les textures par climat,
dans sa plus petite tranche utile.

**Ce que ça change.** Les grands déserts chauds du monde réel — Sahara,
Arabie, Iran, Thar, Taklamakan et Gobi, Kalahari et Namib, intérieur
australien, Atacama, Mojave et Sonora — sont de sable, sans un arbre, avec un
bord qui tremble comme une côte. Autour de Las Vegas, de Phoenix, de Riyad,
d'Ispahan ou de Tombouctou, la campagne est blonde ; le delta du Nil, le
littoral méditerranéen et le Maroc restent verts. Le paysage lointain et la
carte du monde disent la même chose que le sol. Seule la matière change : la
forme du monde est identique bloc pour bloc, et les deux empreintes de
`plafond.js` ne bougent pas.

**Ce qui le prouve.** Trois témoins neufs, deux rouges sur `origin/main` : au
cœur de cinq déserts réels, 4 309 colonnes de sable sur 4 309 et aucun arbre
(14 de sable et 49 arbres avant) ; au Kansas, dans l'Iowa, la Pampa et en
Ukraine, zéro bloc différent du monde sans la règle, et dans les déserts zéro
bloc de forme différente ; vu de loin et sur la carte, le Sahara est blond et
le Kansas vert (`plafond.js`, dans la page). Mesuré sous node : 8 546 colonnes
passent de l'herbe au sable autour de douze villes, coût par morceau inchangé.

## v340 — Les arbres et les falaises

**Pourquoi.** La v326 a donné à la campagne des falaises de roche et des grèves
de sable, et elle a déclaré ce qu'elle ne faisait pas : les arbres poussaient
encore sur une crête de roche ou sur une grève (`treeAt` ne lisait que la
cote), et le paysage lointain gardait le vert de la carte là où le monde proche
montre la roche. Mesuré sur `origin/main` (`sonde-arbres-bord.cjs`, 4 000
morceaux de campagne, deux tirages) : 135 et 168 arbres sur de la roche, 6 sur
du sable, et 3 qui flottaient au-dessus d'un puits de grotte, sur 12 700 à
12 900.

**Ce que ça change.** Un arbre ne pousse plus que sur l'herbe : ni sur une
crête de roche, ni sur une grève, ni au-dessus d'un puits. Le reste de la forêt
ne bouge pas d'un tronc. Et vu d'avion, au-delà du monde chargé, les falaises
sont grises et les grèves blondes, comme de près.

Le paysage lointain pose le relief d'abord, à la même vitesse qu'avant, puis
la roche et le sable dans le temps qui reste (deux millisecondes par image au
plus, et seulement en jeu — jamais pendant la préparation de l'accueil) : la règle coûte quatre cotes de plus par sommet, et posée dans le
remplissage elle aurait fait arriver le paysage trois fois plus tard après une
téléportation. Rien n'est écrit dans le relief : les deux empreintes de
`plafond.js` ne bougent pas.

**Ce qui le prouve.** Quatre témoins neufs dans `plafond.js`, deux rouges sur
`origin/main` : aucun arbre ailleurs que sur l'herbe sur 600 morceaux (16 sur
de la roche avant, 0 ici) ; tout arbre d'herbe du monde sans la règle est
encore là (1 632 sur 1 632) ; vu de loin, les 674 sommets de roche ou de sable
de quatre sites ont la couleur que la règle du générateur leur donne (0 sur
674 avant) ; et les 48 876 autres gardent leur herbe, le relief rempli dans le
même nombre d'images. Le témoin « même forme, bloc pour bloc » des falaises
compare le relief sans les arbres, qui ne sont pas du sol.
## v339 — Les rues de Londres à la règle du kit

**Pourquoi.** Paris est passé à la section de rue du kit (`roadSection`) en
v303, les villes engendrées en v307 ; les cinq villes bâties à la main sont
restées à leurs largeurs relevées à la main (dette v271). À Londres, une
avenue nommée avait 1,4 à 2,4 blocs de chaussée pour une voiture de 2,26 —
les convois y roulaient plus larges que la rue —, et les bus et les taxis
étaient garés au milieu de la chaussée, là où roulent les convois : la
circulation passait au travers.

**Ce que ça change.**

- **Les rues de Londres ont la section du kit**, à un bloc pour un mètre :
  deux voies et des trottoirs de 2,5 m aux artères (Oxford Street, le Strand,
  Fleet Street, Park Lane, la New Road, l'Embankment, les ponts…), une voie
  de 3,1 m et des trottoirs de 2 m aux rues de quartier, deux voies aux rues
  de la trame. La plus petite rue est plus large que la plus large d'avant.
- **Les îlots se recomposent** : le pas de la trame suit l'élargissement, et
  une rue de la trame ne double plus une avenue parallèle — l'îlot va d'une
  avenue à l'autre, comme dans la vraie ville. Londres garde ses immeubles :
  26,6 % du disque bâti contre 26,1. Le prix, déclaré : Soho, Bloomsbury,
  Holborn et Southwark en perdent un tiers à la moitié (St James, Marylebone
  et la City en gagnent) — le plan de Londres est deux fois plus serré que
  celui de Paris.
- **Les bus et les taxis se garent contre le trottoir, les cabines sont sur
  le trottoir** : plus aucun ne se trouve sur la trajectoire d'un convoi.
- **Ce qu'un enfant a bâti à Londres ne bouge pas** : sous une colonne où il
  a posé un bloc avant la mise à jour (et autour), la Londres d'avant reste —
  une maison sur une ancienne rue n'est pas enfermée dans un immeuble neuf,
  une cabane sur un ancien toit garde son toit.

**Ce qui le prouve.** Cinq témoins neufs. `carteMonde.js` : les avenues et la
trame ont la chaussée de leur type (artères 7,0, rues 3,4, trame 6,95 contre
3,0 et 1,7 sur `origin/main`) ; Londres garde plus de 23 % de lots et aucun
quartier sous 6 % ; le mobilier est à plus de 1,63 bloc de tout circuit (0,11
sur `origin/main`). `plafond.js` : une maison sur une ancienne rue n'est pas
enfermée, une cabane garde son toit (désarmé : 21 blocs de ville autour de la
maison, toit absent). Les douze circuits de Londres restent à 100 % sur la
rue ; les deux empreintes de `plafond.js` ne bougent pas (les rues sont du
sol).

---

## v338 — L'autoroute Madrid–Barcelone

**Pourquoi.** Madrid–Barcelone relie les deux grandes villes d'Espagne, le
long de l'AVE qui suit tout l'axe direct. À l'approche de Barcelone, le pays
monte : une chaîne entre la ville et la côte, et Barcelone est en contrebas de
son pays à l'ouest. Le meilleur tracé creusait d'abord 9,17 blocs pour une
limite de neuf.

**Ce que ça change.** L'AP-2 relie Madrid à Barcelone : 2 094 blocs de deux
fois deux voies, quatre ponts, vingt voitures, sans jamais croiser l'AVE. Elle
entre à Barcelone par le côté bas de la ville. Madrid a désormais deux
autoroutes : vers Séville et vers Barcelone. Le relief ne bouge pas : les
deux empreintes de `plafond.js` sont intactes.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js`, rouge sur
`origin/main` (pas d'AP-2) : la route, ses voitures, ses deux entrées sur une
rue propre (seize relevés sur seize de chaque côté), aucune colonne d'emprise
sur le rail (0 sur 18 543 sous node). Le joint des ponts mesuré sur CHAQUE
candidat : le premier avait sept points d'accotement sans rien dessous, au bord
d'une mare qui commence plus tôt sur le côté que sur l'axe ; celui retenu, zéro
sur 136 879 points pour tous les ponts du registre.

---

## v337 — L'autoroute Lyon–Marseille

**Pourquoi.** Lyon–Marseille est l'autoroute du Soleil, la route des vacances
vers la Méditerranée. Le TGV suit tout l'axe direct : il fallait un côté et
s'y tenir. Et deux corridors plus simples sur le papier se sont révélés sans
tracé à cette livraison : Hambourg–Cologne et Toronto–Montréal, où les villes
sont assises sous leur pays du côté qui regarde l'autre.

**Ce que ça change.** L'A7 relie Lyon à Marseille : 1 419 blocs de deux fois
deux voies, trois ponts sur des vallons, vingt voitures, à l'ouest du TGV
qu'elle ne croise jamais. Le relief ne bouge pas : les deux empreintes de
`plafond.js` sont intactes.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js`, rouge sur
`origin/main` (pas d'A7) : la route, ses voitures, ses deux entrées sur une
rue propre (seize relevés sur seize de chaque côté), aucune colonne d'emprise
sur le rail (0 sur 12 545 sous node). Les trois ponts au témoin du joint :
zéro trou sur 19 760 points sous node. La sonde : 2 025 tracés, quatre
admissibles. Hambourg–Cologne et Toronto–Montréal sont instruites dans
`TASKS.md`, avec leurs mesures.

---

## v336 — L'autoroute Dallas–Houston

**Pourquoi.** Dallas–Houston vient ensuite dans le relevé de la v323 : 1 781
blocs sur l'axe direct, sans rail. Le pays entre les deux est ondulé, et
Houston est au pied d'une butte au nord : avec la recherche des livraisons
précédentes (deux points intermédiaires), le meilleur tracé creusait 9,14
blocs pour une limite de neuf.

**Ce que ça change.** L'I-45 relie Dallas à Houston : 2 168 blocs de deux fois
deux voies, trois ponts (deux ravins et un ruisseau), vingt voitures. C'est
la première autoroute des États-Unis du jeu. Elle contourne Houston par l'est
et y entre par le sud. Le relief ne bouge pas : les deux empreintes de
`plafond.js` sont intactes.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js`, rouge sur
`origin/main` (pas d'I-45) : la route, ses voitures, ses deux entrées sur une
rue propre (seize relevés sur seize de chaque côté), aucune colonne d'emprise
sur un rail (0 sur 19 271 sous node). Les trois ponts passent par le témoin
du joint de `plafond.js`, qui lit toutes les routes. La sonde tire désormais
des chemins lissés (un point tous les deux cents blocs) : cinq admissibles sur
vingt-quatre mille.

**Et le portail a trouvé un vrai trou.** Le premier pont de l'I-45 tombait
dans un coude du tracé, et le tablier y laissait le coin extérieur du virage
ouvert sur le vide : 402 points sans rien dessous au témoin du joint
(`plafond.js`). C'était un défaut du tablier, pas du tracé — aucune route
n'avait encore de pont dans un coude. `rubansDans` (routes.js) pose désormais
au sommet un ruban de comblement, côté extérieur, garde-corps compris : zéro
trou sur les quatorze ponts du registre (90 794 points sous node).

---

## v335 — Les monuments de Paris dominent les toits

**Pourquoi.** Un étage fait trois blocs depuis la v301 : les immeubles de Paris
montent à vingt et un, vingt-quatre blocs, et les monuments n'avaient pas suivi.
Mesuré sous node en appelant les bâtisseurs, l'Opéra faisait dix-neuf blocs au
milieu d'immeubles à vingt, les Invalides vingt-deux, le Sacré-Cœur vingt-trois,
Notre-Dame trente et un. Dans la vraie ville ils dominent les toits ; dans le
jeu, l'Opéra était plus bas que ses voisins. Et la même mesure sur toutes les
villes du monde rendait quatre-vingt-treize monuments plus bas que les immeubles
autour d'eux.

**Ce que ça change.** Les monuments de Paris passent au-dessus des toits, dans
l'ordre du vrai ciel de Paris : Montparnasse 60, les Invalides et Notre-Dame 48,
le Panthéon et le Sacré-Cœur 47, l'Opéra 41, la Bastille 36, l'Arc de Triomphe
35, sous la tour Eiffel qui reste à soixante-neuf. Un premier jet les posait à
leur vraie hauteur, à un bloc pour un mètre : les captures aériennes ont montré
les Invalides, Notre-Dame et le Sacré-Cœur au-dessus de la tour Eiffel, en
aiguilles. La règle garde donc un bloc pour un mètre jusqu'à la corniche, puis
une courbe qui mène la tour Eiffel à soixante-neuf. Les coupoles s'étirent par
leur pied, qui devient un tambour, les portes gardent la taille d'un enfant, et
les modèles en relief suivent leurs voxels. Rien ne change d'emprise : aucune
rue, aucun circuit de voiture n'est touché.

**Ce qui le prouve.** Trois témoins neufs dans `plafond.js`. Le premier boucle
sur toutes les villes — 215 monuments mesurés contre la médiane des immeubles
autour d'eux — et n'admet un monument plus bas que s'il est déclaré, avec sa
raison : rouge sur `origin/main` (l'Opéra 19/20, et 92 autres non déclarés). Le
deuxième vérifie que chaque exception nomme un monument mesuré. Le troisième
exige les huit hauteurs de Paris et qu'aucune ne dépasse la tour Eiffel : rouge
sur `origin/main` (l'Opéra 19 pour 41…). La sonde des monuments en relief rend
zéro mur invisible et moins de cubes qui dépassent qu'avant (Notre-Dame 34 → 32,
Sacré-Cœur 15 → 0). Les deux empreintes du relief ne bougent pas : un bâtisseur
de monument n'écrit pas `terrainHeight`.

---

## v334 — L'autoroute Berlin–Hambourg

**Pourquoi.** Berlin–Hambourg est le candidat suivant du relevé de la v323 :
1 293 blocs sur l'axe direct, ni rail ni aérodrome, dans la plaine de l'Elbe.
Une plaine basse et semée de mares, et au nord-est de Hambourg de l'eau qui
touche le disque de la ville : par là, tout tracé posait un pont contre la
porte.

**Ce que ça change.** L'A24 relie Berlin à Hambourg : 1 317 blocs de deux fois
deux voies, aucun pont, vingt voitures. Elle entre à Hambourg par l'est, où le
pays est sec. Première route du registre en Allemagne du Nord. Le relief ne
bouge pas : les deux empreintes de `plafond.js` sont intactes.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js`, rouge sur
`origin/main` (pas d'A24) : la route, ses voitures, ses deux entrées sur une
rue propre (seize relevés sur seize de chaque côté), aucune colonne d'emprise
sur un rail (0 sur 11 620 mesurées sous node). La sonde : 2 904 tracés,
trente-quatre admissibles, un seul sans pont — celui-ci.

---

## v333 — L'autoroute Milan–Bologne

**Pourquoi.** Milan–Bologne vient ensuite dans le relevé de la v323 : 924
blocs sur l'axe direct, et c'est la moitié manquante de l'Autostrada del Sole
(Milan–Bologne–Florence–Rome–Naples), dont l'Autosole et l'A1 Sud existaient
déjà. Une difficulté : la Frecciarossa sort de Milan presque dans le même axe
(51° contre 34°). Et un candidat s'est révélé impossible : Séoul–Busan, parce
que Busan est cerclée d'une crête.

**Ce que ça change.** L'A1 Nord relie Milan à Bologne : 969 blocs de deux fois
deux voies, aucun pont, vingt voitures, toute la route au nord du rail sans
jamais le croiser. De Milan, on peut désormais aller en voiture jusqu'à
Naples en enchaînant trois autoroutes. Le relief ne bouge pas : les deux
empreintes de `plafond.js` sont intactes.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js`, rouge sur
`origin/main` (pas d'A1 Nord) : la route, ses voitures, ses deux entrées sur
une rue propre, aucune colonne d'emprise sur le rail (0 sur 8 473 mesurées
sous node). La sonde : 5 082 tracés, trente et un admissibles, sept sans
pont, et elle arrondit désormais les points de passage avant de les juger.
Séoul–Busan, déclarée bloquée dans `TASKS.md` : la crête de Busan monte à
50–60 blocs à quarante blocs de son bord, pour une ville à 33.

---

## v332 — L'autoroute Vienne–Budapest

**Pourquoi.** Candidat suivant du relevé de la v323 : Vienne–Budapest, 957
blocs sur l'axe direct, ni rail ni aérodrome, dans la plaine du Danube. Et deux
candidats plus courts se sont révélés impossibles à cette livraison : Los
Angeles–San Diego (une crête à l'intérieur, l'aérodrome de LAX sur la côte) et
Manchester–Liverpool (une crête entre les deux villes).

**Ce que ça change.** La M1 relie Vienne à Budapest : 966 blocs de deux fois
deux voies, aucun pont, et vingt voitures qui font l'aller-retour, presque en
ligne droite.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Dans `carteMonde.js`, un témoin neuf, rouge sur
`origin/main` (pas de M1) : la route, ses voitures, ses deux entrées sur une
rue propre, aucune colonne sur un rail (0 sur 9 228 mesurées sous node). La
sonde : 18 216 tracés, 1 573 admissibles, 547 sans pont. Los Angeles–San Diego,
déclarée bloquée dans `TASKS.md` : 265 120 tracés, aucun admissible.

---

## v331 — Les villes se reconnaissent au loin

**Pourquoi.** Au-delà des morceaux de monde maillés (à peu près deux cents
blocs autour de l'enfant sur l'iPad), le paysage lointain (`horizon.js`) ne
dessinait que le relief : Paris, Londres, New York, Tokyo et les deux cent
soixante-neuf villes engendrées apparaissaient en PRAIRIE vue d'avion — un
mur d'immeubles au bord du monde chargé, puis de l'herbe verte là où la ville
continue. Dette déclarée dans `TASKS.md` depuis la v237.

**Ce que ça change.** Vu de loin, le sol d'une ville prend le gris de ses rues
mêlé à la couleur de ses toits, et la ville se dresse : un pavé par îlot de
huit blocs, à la couleur de ses murs (la pierre crème de Paris, la brique de
Londres, la palette de chaque ville engendrée), le toit plus sombre, à la
hauteur propre de la ville, avec ses tours là où elle en a (Tokyo, Dubaï,
New York). Un seul appel de dessin pour tout le paysage. Rien n'est écrit dans
le monde et le relief ne bouge pas : dès qu'un morceau est maillé, le vrai
monde reprend sa place.

**Ce qui le prouve.** Trois témoins dans `plafond.js`, sur le vrai monde de la
page (Paris, Londres, New York par `TerreUrbaine`, Rome) : le sol sous la ville
n'est plus vert, chaque ville a ses pavés et aucun n'est hors d'une ville, et
le bâti lointain se retire devant le monde maillé. Coût mesuré sous node, en
médiane de cinq passages alternés : +0,05 à +0,07 µs par colonne (environ 4 %),
la question « est-ce une ville ? » se posant par l'index de cases des villes
engendrées et par une boîte pour les sept villes bâties à la main. Captures en
vol à `rr=12`, avant/après, au-dessus de Paris, Londres, Rome et Tokyo
(`tests/sonde-villes-au-loin.cjs`). Le bâti se coupe quand le navigateur rend
sans carte graphique, comme les ombres : mesuré en A/B en vol vers Paris, il
y fait tomber la cadence de 15 à 5 images par seconde
(`tests/sonde-cout-villes-au-loin.cjs`) ; `?batiloin=1` le force.

---

## v330 — Les terminaux sont aménagés

**Pourquoi.** Depuis la v223, les terminaux des aérodromes se TRAVERSENT —
creux, de plain-pied, portes sur les deux faces, cloisons percées — mais ils
étaient vides : un hangar blanc entre deux portes, sans rien qui dise
« aéroport » à un enfant qui y entre. Et les quatre halls de l'aérogare 2 de
Roissy étaient creux mais FERMÉS : quatre murs pleins, aucune porte.

**Ce que ça change.**

- **Les dix-neuf terminaux sont meublés** (Roissy et les dix-huit génériques,
  hub, ville et base) : côté départs, les comptoirs d'enregistrement avec leur
  tapis derrière et l'enseigne bleue au-dessus, puis la salle d'embarquement
  et ses rangées de sièges dos à dos ; côté arrivées, la file des portiques de
  sûreté (on y passe debout) et le carrousel à bagages ; dans chaque hall, le
  tableau des départs suspendu au-dessus de l'allée.
- **On entre dans les halls de Roissy**, par la route comme par le tarmac.
- **Le trajet de l'enfant ne change pas** : ni les couloirs des portes ni
  l'allée des cloisons ne sont meublés, par construction. Rien ne sort du
  terminal, rien ne touche l'aire, les postes ni les pistes, et le relief ne
  bouge pas d'un bloc.

**Ce qui le prouve.** Deux témoins neufs dans `carteMonde.js`, rouges sur
`origin/main` : le mobilier compté aérodrome par aérodrome en interrogeant le
bâtisseur (0 sur 19 meublés avant, 19 sur 19 après), et la marche de la route
au tarmac à travers le hall 2A de Roissy. Le témoin de la marche d'un hall à
l'autre reste vert sur les trois profils. Le coût du bâtisseur, médiane de
huit mesures alternées de deux cents rejeux : Roissy 2,79 → 2,87 ms, Heathrow
0,75 → 0,75, Orly 0,52 → 0,54, Saint-Dizier 0,38 → 0,38. Captures intérieures
d'un hub, d'une ville, d'une base et de Roissy (`sonde-captures-terminaux.cjs`). Au
passage, un témoin de `monte.js` (« descendu de la voiture de Paris ») retirait
la voiture sous l'enfant encore assis quand il devait se poser deux fois ; il
descend désormais d'abord.

---

## v329 — L'autoroute Rome–Naples

**Pourquoi.** Candidat suivant du relevé de la v323 : Rome–Naples, 683 blocs
sur l'axe direct, ni rail ni aérodrome. Rome n'avait aucune route : vers le
nord, Fiumicino barre la seule entrée propre (v314) ; vers le sud, rien ne
l'empêchait.

**Ce que ça change.** L'A1 Sud — la seconde moitié de l'Autostrada del Sole —
relie Rome à Naples : 785 blocs de deux fois deux voies, aucun pont, et vingt
voitures qui font l'aller-retour. Elle sort de Rome par l'est, là où l'avenue
est propre, puis tourne doucement vers le sud-est.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Dans `carteMonde.js`, un témoin neuf, rouge sur
`origin/main` (pas d'A1 Sud) : la route, ses voitures, ses deux entrées sur une
rue propre, aucune colonne sur un rail (0 sur 7 640 mesurées sous node). La
sonde a dû apprendre à TOURNER en plusieurs fois : l'avenue propre de Rome est à
46° de l'axe, et les 40 536 tracés à un seul coude étaient tous refusés ; avec
un virage de 24° tous les quarante blocs, 8 115 admissibles, 1 176 sans pont.

---

## v328 — L'autoroute Delhi–Agra, la route du Taj Mahal

**Pourquoi.** Candidat suivant du relevé de la v323 : Delhi–Agra, 656 blocs sur
l'axe direct, sans rail ni repère. Agra porte le Taj Mahal, et l'on ne pouvait
s'y rendre qu'en se téléportant ou en volant.

**Ce que ça change.** Le Yamuna Expressway relie Delhi à Agra : 672 blocs de
deux fois deux voies, aucun pont, et vingt voitures qui font l'aller-retour. On
sort de Delhi par une avenue de quatre-vingt-dix-huit blocs et l'on entre dans
Agra par une avenue de cent vingt-sept, droit vers le centre.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Dans `carteMonde.js`, un témoin neuf, rouge sur
`origin/main` (pas de Yamuna) : la route, ses voitures, ses deux entrées sur une
rue propre, aucune colonne sur un rail (0 sur 8 595 mesurées sous node). La
sonde : 18 216 tracés, soixante-huit admissibles, tous sans pont — le pays est
semé de mares, et 7 334 tracés ont été refusés pour un pont trop près d'une
porte.

---

## v327 — L'autoroute Milan–Turin

**Pourquoi.** Candidat suivant du relevé de la v323 : Milan–Turin, 530 blocs
sur l'axe direct, dix colonnes d'eau, ni rail ni aérodrome. Deux grandes villes
du nord de l'Italie qui n'avaient aucune route.

**Ce que ça change.** L'A4 relie Milan à Turin : 552 blocs de deux fois deux
voies, aucun pont, et vingt voitures qui font l'aller-retour. Elle sort de Milan
par le sud-ouest (quarante-trois blocs d'avenue sur la rue) et entre dans Turin
par le nord-est.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Dans `carteMonde.js`, un témoin neuf, rouge sur
`origin/main` (pas d'A4) : la route, ses voitures, ses deux entrées sur une rue
propre, aucune colonne sur un rail (0 sur 8 249 mesurées sous node). La sonde :
36 432 tracés, refus 28 826 coude · 7 599 déblai · 1 031 remblai · 25 ponts
proches — sept admissibles, tous sans pont. La plaine du Pô n'est pas plate
partout : c'est le déblai qui a fait le tri.


## v326 — Des falaises de roche et des berges de sable

**Pourquoi.** Partout où le relief saute de deux blocs ou plus, le sol continu
(v297) laisse le voxel — « deux blocs, c'est un mur », et c'est juste. Mais ce
mur était le remplissage du monde : sous l'herbe, trois blocs de terre. Une
montagne se lisait comme un escalier de terre et d'herbe, et la rive d'un lac
ou d'un fleuve comme un talus de terre qui plonge dans l'eau. Mesuré sur 500
morceaux de campagne tirés autour des lieux de toute la carte : 2 863 faces de
terre et 1 164 d'herbe sur les flancs de falaise, 1 130 faces de terre sur les
berges.

**Ce que ça change.**

- **Une falaise est une paroi de roche** : sous le gazon, le flanc est de
  pierre dès deux blocs de dénivelée, et à partir de quatre la crête aussi.
- **Une berge est une grève** : au ras de l'eau, du sable ; dessous, du
  gravier ; et une rive basse (deux blocs au-dessus de l'eau au plus) a son
  sommet de sable.
- **Rien ne bouge** : seule la matière change, jamais la hauteur. Le sol sous
  les maisons des enfants est exactement le même, le sol continu, le contact,
  les tunnels et le franchissement aussi. Les villes, le désert, la banquise,
  Mars et le volcan gardent leur matière à eux.

**Ce qui le prouve.** Trois témoins neufs dans `plafond.js`, sous node, sur
soixante morceaux tirés sur toute la carte, rouges sur `origin/main` : aucune
face de terre ou d'herbe sur une falaise (0 sur 1 044), au plus deux pour cent
sur une berge (12 sur 1 409, 268 de sable ou de gravier), et la MÊME forme que
le monde sans la règle, bloc pour bloc (0 bloc de forme différente, 691 de
matière différente). Les deux empreintes du relief sont intactes. Le coût de
génération d'un morceau ne se mesure pas (1,59 contre 1,59 ms chauffé).
`sonde-falaises.cjs` refait la mesure, `sonde-captures-falaises.cjs` les
captures. Portail complet : trois rouges, tous des dettes déjà déclarées dans
`TASKS.md` avec leur double mesure et que la livraison ne touche pas — le
monument de Paris traversé (`carteMonde.js`, au chiffre près celui de la
v321), le gel en arrivant sur une ville (`monte.js`), le trou de façade de
Manhattan (`manhattan.js`, seul rouge rejouée seule) ; l'appui long de
`carte.js`, rouge au premier portail, est vert rejoué seul des deux côtés.

---

## v325 — Le North Shore de Sydney a ses voitures

**Pourquoi.** La v322 a mesuré la couverture de toutes les villes : après elle,
les villes engendrées les moins couvertes étaient Sydney (60,5 % — tout le
North Shore, au-delà du port, sans une voiture), Rome (88,3 %) et Tokyo
(88,7 %). Les anneaux s'y choisissent du plus grand au plus petit, quatre au
plus, sans regarder où la ville est vide. Et le tour des monuments de Paris
passait à un bloc du socle côté +u/+v : l'aile d'une voiture mordait de 0,13
bloc dans la dernière rangée, et traversait six fois un tronc au coin de la
Tour Eiffel et des Invalides (dette déclarée en v318, identique sur
`origin/main`).

**Ce que ça change.** Cinq anneaux de quartier, au sec et sans rien changer au
sol : Sydney passe à 95,3 % (le North Shore et l'ouest), Rome à 94,6 % (le
Vatican et Prati), Tokyo à 95,7 %. Et autour des monuments de Paris, les
voitures roulent un demi-bloc plus loin, des deux côtés : plus aucune ne
traverse un arbre du square.

**Ce qui le prouve.** Le témoin des 268 villes de `carteMonde.js` exige
désormais qu'aucune ville engendrée ne soit sous les trois quarts : rouge sur
`origin/main` (Sydney 60,5 %), vert ici (la pire, Las Vegas, 79,9 %). Le témoin
« aucune voiture ne traverse un monument de Paris » passe de 6 pas à 0, et la
tenue de rue comme le partage entre circuits ne bougent pas (pire paire 16
blocs) ; le recentrage, essayé d'abord, faisait monter un partage à 25 et a été
retiré.
## v324 — L'autoroute Bologne–Florence

**Pourquoi.** Premier des candidats instruits en v323 : Bologne–Florence, 342
blocs sur l'axe direct, sans eau, sans rail, sans aérodrome. Florence était
bloquée vers Rome par Fiumicino ; elle gagne ici sa première route, vers le
nord.

**Ce que ça change.** L'Autosole — le tronçon de l'Autostrada del Sole qui
passe l'Apennin — relie Bologne à Florence : 346 blocs de deux fois deux voies,
aucun pont, et vingt voitures qui font l'aller-retour. Elle entre dans Bologne
par le sud (vingt-six blocs d'avenue sur la rue) et dans Florence par le nord
(quarante blocs), sans traverser un bloc ni une flaque.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Dans `carteMonde.js`, un témoin neuf, rouge sur
`origin/main` (pas d'Autosole) : la route, ses voitures, ses deux entrées sur
une rue propre, aucune colonne sur un rail (0 sur 4 595 mesurées sous node).
La sonde de tracé a appris une règle de `routes.js` : la porte d'une ville vise
le premier point de passage, pas l'angle mesuré — un point sur le rayon de
chaque entrée la fixe. 18 216 tracés, refus 14 552 coude · 1 578 déblai ·
1 111 remblai · 369 ponts proches.

---

## v323 — L'autoroute Kyoto–Nagoya, au sud du Shinkansen

**Pourquoi.** Candidat le plus court du relevé de la v310 : Kyoto–Nagoya, 314
blocs sur l'axe direct, sans eau ni aérodrome — mais avec le Shinkansen
presque dans l'axe, qui file de Kyoto à Tokyo et traverse Nagoya à douze blocs
de son centre. Une route qui passerait d'un côté à l'autre du rail écrirait son
remblai sur le ballast.

**Ce que ça change.** L'E1, la Meishin, relie Kyoto à Nagoya : 327 blocs de
deux fois deux voies, aucun pont, et vingt voitures qui font l'aller-retour.

- **Elle reste tout entière au sud du rail**, à dix-neuf blocs au moins de ses
  colonnes : c'est le côté où les deux villes ont une entrée propre — Kyoto par
  son axe est (avenue de quatre-vingt-neuf blocs sur la rue), Nagoya par son axe
  ouest-sud-ouest (vingt-huit blocs). Au nord du rail, Nagoya n'offre qu'une
  avenue de dix blocs.
- **Elle contourne un étang par le nord**, au lieu de le franchir : un tracé
  sans pont sur trois cent vingt-sept blocs.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Dans `carteMonde.js`, un témoin neuf, rouge sur
`origin/main` (pas d'E1) : la route, ses voitures, ses deux entrées sur la rue,
et aucune colonne d'emprise sur un rail, un talus de voie ou une gare (0 sur
2 749). Le témoin du rail de la v320, qui lit toutes les routes, la lit aussi.
La sonde de tracé appelle `profilDe` et `largeurA` : 1 944 tracés au premier
tour, refus 1 136 coude · 229 rail · 16 remblai · 7 ponts proches ; 4 845
admissibles sans pont au second, à coudes de 25° au plus.

---

## v322 — Des voitures dans toutes les rues

**Pourquoi.** Paris doublé (v306) avait laissé ses huit circuits d'avenues au
milieu d'un disque quatre fois plus grand : mesuré ville par ville, 35 à 39 %
de Paris seulement était à moins de quarante-cinq blocs — la portée d'une
voiture — d'une rue où roule un convoi, rive gauche comme rive droite, et l'on
y voyait 2,8 voitures en moyenne, contre 15,7 à Londres. Tout l'anneau du
dehors, de Montmartre à la Porte d'Orléans, était une ville de rues vides. Et
partout ailleurs, le plafond de vingt voitures par circuit rendait les grands
anneaux presque déserts : Rome 25 voitures pour mille blocs de rue, Rio 30,
Barcelone 34, contre 72 à Londres, dont les circuits sont courts. Max : « lance
sur toutes les villes, pas juste celle-là ».

**Ce que ça change.** Paris gagne douze tours de quartier qui suivent les rues
de sa trame ordinaire, sur leur axe : 96 % de la ville a désormais des voitures
en vue (la rive gauche 94 %), dix à douze en moyenne. Aucune rue n'a été
ajoutée, aucune maison n'est devenue une rue. Et dans toutes les villes, il y a
une voiture tous les dix-huit blocs sur tout le tour : la ville la moins dense
en a 54 pour mille blocs (Rome passe de 25 à 55). Le point du monde qui voit le
plus de voitures en voit autant qu'avant.

**Ce qui le prouve.** Un témoin neuf de `carteMonde.js` boucle sur les 268
villes qui ont des voitures : couverture et densité, plus les tours de quartier
de Paris lus dans le monde (chaussée sous 99 % des points, rien de plein à
hauteur de carrosserie). Rouge sur `origin/main` (Paris 38,8 %, Rome 25), vert
ici.

Et la dette « une place de voiture à trois blocs sans voiture dessinée » (vue
en v306) est expliquée, pas corrigée : une sonde neuve (`sonde-place-vide.cjs`)
relève 47 cas sur 2 400, tous lus entre la téléportation et la première image
qui la suit — `montrer` n'avait pas encore vu l'enfant à sa nouvelle place.
Rien ne change pour la famille.
## v321 — Le GPS partout

**Pourquoi.** Le GPS de la v306 avait laissé quatre trous, déclarés : la
minicarte ne montrait pas la destination ; toucher le nom d'une ville sur la
carte, ou choisir un résultat de la recherche, emmenait d'office, sans
proposer « S'y rendre » — seul l'appui long posait la question ; la flèche du
haut faisait un tour presque complet quand la cible passait derrière
l'enfant ; et la destination ne se partageait pas avec un ami.

**Ce que ça change.**

- **La minicarte montre où l'on va** : un rond vert à la place de la
  destination quand elle est dans la vignette, une flèche verte au bord, du
  côté où aller, quand elle est plus loin — comme pour un ami.
- **Toucher un lieu ou choisir un résultat pose la question** « ✨ Téléporter »
  ou « 🧭 S'y rendre », comme l'appui long. Plus aucun voyage d'office. Le
  résultat de recherche centre d'abord la carte sur le lieu. Et le GPS garde
  le nom du lieu touché (« Tour Eiffel », « Rome »).
- **Partout** : villes bâties à la main, villes du registre, campagne.
- **La flèche tourne par le chemin le plus court**, plus jamais un grand tour.
- **Le partage avec un ami en ligne n'est pas livré** : il demande un message
  réseau neuf relayé par l'hôte et par le nuage, et un témoin à deux
  tablettes. Il est décrit dans `TASKS.md`, avec son témoin.

**Ce qui le prouve.** Six témoins neufs ou repointés dans `carte.js`, tous
vérifiés ROUGES sur `origin/main` avec la même suite : toucher un lieu propose
puis Téléporter y emmène ; toucher Rome (ville engendrée) puis « S'y rendre »
garde l'enfant sur place et nomme Rome ; la flèche ne saute que de 0,3 radian
au passage de ±π (le témoin lit le style écrit — la matrice calculée replie
l'angle et ne peut pas voir le tour) ; la minicarte dessine la flèche de bord
du bon côté et le repère au bon pixel, lus à la couleur ; toucher un résultat
de recherche pose la question sans partir. Les témoins de la v306 (appui long,
« S'y rendre », arrivée) restent verts.

---

## v320 — L'autoroute Cologne–Francfort, à côté de l'ICE

**Pourquoi.** Candidat suivant du relevé de la v310 : Cologne–Francfort, 739
blocs sur l'axe direct — et le premier corridor qui a une voie ferrée le long
de son axe : l'ICE va tout droit de gare à gare. Une route qui croise ou longe
le rail dans son emprise écrirait son remblai sur le ballast.

**Ce que ça change.** L'A3 relie Cologne à Francfort : 804 blocs de deux fois
deux voies, aucun pont, et vingt voitures qui font l'aller-retour.

- **Elle passe tout entière au sud du rail.** Au nord, l'aérodrome de Francfort
  (posé près de Cologne) n'est qu'à 108 blocs de l'axe de l'ICE : entre sa marge
  et le ballast il restait quatre ou cinq blocs pour dix-sept d'emprise.
- **Elle sort de Cologne par le sud et entre dans Francfort par l'ouest**, deux
  entrées choisies par l'angle où l'avenue est propre (22 et 27 blocs sur la
  rue, sans bloc ni eau).

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Dans `carteMonde.js`, un témoin neuf, rouge sur
`origin/main` (pas d'A3) : la route, ses voitures, ses deux entrées — et pour
TOUTES les routes, aucune colonne d'emprise sur un rail, un talus de voie ou une
gare (0 sur 14 047 pour l'A3, 0 partout ailleurs). La sonde de tracé appelle
désormais `profilDe` elle-même au lieu d'en recopier les règles : 4 852 tracés,
les refus comptés par contrainte (1 691 remblai, 891 pont près d'une porte, 626
déblai, 382 ponts trop proches, zéro rail une fois le tracé au sud).

## v319 — Arriver dans une ville ne compile plus rien

**Pourquoi.** Chaque programme de la carte graphique compilé à l'arrivée dans
une ville est une image figée sur la tablette — des centaines de millisecondes
chacun sous Safari. La v306 avait laissé deux ou trois programmes à l'arrivée à
Paris, sans savoir à qui ils étaient. Max : « lance sur toutes les villes, pas
juste celle-là ». Mesuré sur seize lieux, une page neuve par lieu : Paris 3,
Londres 3, San Francisco 3, Nice 3, Lille 3 ou 4, Shanghai 3, Mendoza, Kyoto,
Barcelone et Zurich 2, Marrakech 1 — et **New York 34**.

**Ce que ça change.** L'accueil compile aussi ce qui manquait : la coque que
porte une voiture de la rue en attendant son vrai modèle, le chien des passants
quand il apparaît en fondu, et un matériau uni vu à Lille. Et pendant qu'il
reste à l'écran, une fois « Jouer » libéré, il prépare New York : Manhattan
allume les ombres que la tablette n'a pas, ce qui recompilait tout ce qu'on
voit, et elle a ses propres façades. Cette seconde chauffe ne grise pas le
bouton : un enfant qui appuie tout de suite retrouve New York comme avant.

**Ce qui le prouve.** `sonde-programmes-villes.cjs` rend zéro programme neuf
dans les seize lieux — six villes bâties à la main, Manhattan, sept tissus de
villes engendrées, l'aérodrome de Francfort et la gare de Lyon. Le témoin de
`monte.js` fait désormais le tour (Paris, New York, Lille, Marrakech, Kyoto) :
0 · 0 · 0 · 0 · 0 sur la branche, 3 · 34 · 1 · 0 · 0 sur `origin/main`, barre à
un par lieu et deux sur le tour.

---


## v318 — Des contrôles plus justes

**Pourquoi.** Deux témoins du portail ne prouvaient rien, et `TASKS.md` le
disait. « Aucune voiture ne traverse un monument de Paris » ne lisait que les
points de circuit tombés DANS un socle ; depuis que les voitures font le tour
des monuments (v221), aucun n'y tombe : zéro pas lu, sur la branche comme sur
`origin/main`, donc vert sans avoir rien regardé. « On prend le volant d'une
voiture vue dans la rue » a attendu 124 secondes sans voiture au portail de la
v306 : il posait l'enfant SUR la voie, et devant l'enfant la rue attend sans
limite (v245) — la première voiture s'arrêtait à huit ou dix blocs, hors des
cinq où l'on peut monter, avec toute la file et le bus derrière elle.

**Ce que ça change.** Rien dans le jeu : ce sont des contrôles. Le premier lit
désormais la bande que le tour emprunte, tous les demi-blocs, sur toute la
largeur de la voiture, et il est rouge s'il n'a rien lu. Le second pose
l'enfant sur le sol à côté de la voie, loin de tout circuit, là où les voitures
passent sans s'arrêter pour lui ; la durée de l'attente entre dans son message.
**Et le premier a trouvé un vrai défaut** : côté nord et est des socles, le
tour passe à un bloc du socle au lieu de deux, et l'aile d'une voiture mord de
0,13 bloc dans la dernière rangée — des troncs d'arbre au pied de la Tour
Eiffel et des Invalides. Déclaré dans `TASKS.md` avec sa cause et son remède
probable, pour la session qui tient `paris.js` ; le témoin reste rouge en
attendant, parce qu'il dit vrai.

**Ce qui le prouve.** Le témoin des monuments lit 597 pas et en trouve 6 dans
un tronc ; avec `contournerBlocs` désarmé dans une copie de `src`, il en
trouve 166 (Opéra 29, Louvre 28, Invalides 38, Bastille 31…) — il sait rougir.
Mesuré à l'identique sur `origin/main`. Pour le volant, une sonde rejoue la
vraie circulation de Paris sous node, cession comprise, pour cent heures de
départ sur un tour d'horloge : posé sur la voie, 90e centile 68 s et pire
113 s ; à trois blocs de côté, 90e centile 0,5 s et pire 3,5 s. Deux sondes
neuves (`sonde-tour-monuments.cjs`, `sonde-attente-volant.cjs`) rejouent ces
mesures.

---


## v317 — Des quais en pierre dans toutes les villes

**Pourquoi.** La v316 avait rendu leurs murs de pierre aux quais de la Seine,
et seulement à eux. La même mesure faite ensuite sur toutes les rives de ville
rendait la terre comme face la plus vue partout : Londres 399 faces, Lille 392,
Amsterdam 364, Rome 190, Lyon 134, Stockholm 112, et jusqu'aux canaux de
Venise. Une ville n'écrit que son sol ; ce qui est dessous reste le remplissage
du monde, et contre l'eau c'est un mur qu'on regarde.

**Ce que ça change.** Dans toutes les villes — les six bâties à la main et les
villes engendrées —, une colonne qui borde l'eau et la domine d'au moins deux
blocs reçoit un mur maçonné entre l'eau et son sommet. Les plages restent en
sable. Rien ne change de hauteur, et rien de ce qu'un bâtisseur ou un enfant a
posé n'est touché.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js` lit les rives de
Londres, Lille, Amsterdam, Rome et Lyon sur un monde engendré pour l'occasion :
zéro face de terre, contre 1 137 sur `origin/main` (Londres 199, Lille 250,
Amsterdam 364, Rome 190, Lyon 134). Le témoin de la Seine
(v316) reste vert. Les empreintes du relief de `plafond.js` ne bougent pas, et
les mondes figés (`CONF_V308`, `CONF_AVANT`) n'ont pas la règle. Le coût par
morceau ne se distingue pas du bruit (2,4 à 2,9 ms contre 2,5 à 2,7 sur
`origin/main`, six villes au bord de l'eau, ordre alterné).

---

## v316 — Les quais de la Seine sont en pierre

**Pourquoi.** Sous la margelle de granit des quais de Paris, la paroi qui
descend à la Seine était de la TERRE : deux blocs brun-vert au-dessus de l'eau,
sur les deux rives et tout autour de l'île de la Cité et de l'île Saint-Louis.
C'était le remplissage ordinaire du monde, que personne n'avait remplacé. Vu en
capture en v306 et noté dans `TASKS.md` sans être mesuré.

**Ce que ça change.** Les murs des quais et le bord des deux îles sont en
pierre de Paris, de l'eau jusqu'à la margelle. Rien d'autre ne bouge : le sol,
les ponts, la voie sur berge et tout ce que les enfants ont bâti restent où ils
étaient.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js` lit le monde sur
toutes les colonnes qui touchent la Seine et compte les faces visibles
au-dessus de l'eau : sur `origin/main`, 639 faces de terre ; ici zéro, et 94 %
de pierre. Les deux empreintes du relief de `plafond.js` sont intactes : seule
la matière SOUS la surface change, jamais la hauteur d'une colonne.

---

## v315 — L'autoroute Nairobi–Mombasa : la première route d'Afrique

**Pourquoi.** Dernier corridor du relevé de la v310 sans voie ferrée ni
aérodrome sur l'axe : Nairobi–Mombasa, la route du port. L'Afrique n'avait
pas une route.

**Ce que ça change.** L'A109 relie Nairobi à Mombasa : 1 999 blocs de deux fois
deux voies — la plus longue du jeu —, deux ponts, et vingt voitures qui font
l'aller-retour.

- **Elle sort de Nairobi par l'est** : au sud, le pays est semé de mares, et
  chaque mare isolée aurait été comblée sur sept blocs de haut, ou coupée par
  deux ponts trop proches.
- **Mombasa est petite** : l'avenue d'entrée fait vingt et un blocs, par l'angle
  où elle est propre (−110°) et une porte à quatorze blocs du bord. À vingt,
  l'avenue était trop courte pour le témoin des entrées (19 pas pour 20) : c'est
  le premier portail qui l'a dit.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Dans `carteMonde.js`, un témoin neuf, rouge sur
`origin/main` (pas d'A109). Les témoins de route (profil, remblai ≤ 4, déblai
≤ 9) et le joint des ponts de `plafond.js` lisent toutes les routes. La sonde
de tracé recopie désormais les deux règles qui avaient fait échouer ses
premiers résultats : une suite d'ouvrage de moins de trois colonnes se comble,
et deux ponts doivent être séparés de huit blocs de sol.

## v314 — L'autoroute Madrid–Séville : la plus longue route du jeu

**Pourquoi.** Les trois corridors choisis en v310 étaient faits. Parmi les
suivants du relevé, Madrid–Séville n'a ni voie ferrée ni aérodrome sur l'axe :
l'Autovía del Sur, la première route d'Espagne.

**Ce que ça change.** L'A-4 relie Madrid à Séville : 1 908 blocs de deux fois
deux voies — la plus longue du jeu —, trois ponts, et vingt voitures qui font
l'aller-retour.

- **Les deux entrées** sont choisies par l'angle, comme à São Paulo : 75° à
  Madrid, −35° à Séville, là où l'avenue est la plus longue sur la chaussée.
- **Le tracé a été déplacé de trente blocs** au quatrième point de passage :
  une variante mettait deux ponts à un bloc l'un de l'autre, une autre comblait
  un ravin de deux colonnes sur dix blocs de haut.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Dans `carteMonde.js`, un témoin neuf, rouge sur
`origin/main` (pas d'A-4) : la route porte vingt voitures et entre dans les
deux villes sans eau ni bloc sur l'avenue. Les témoins de route (profil,
remblai ≤ 4, déblai ≤ 9) et le témoin du joint des ponts de `plafond.js`
lisent toutes les routes. Et **Florence–Rome n'est pas faite, à dessein** :
Fiumicino est posé au nord de Rome, sur la seule entrée nord propre, et
l'entrée ouest arrive par la mer — deux cents blocs de viaduc. Déclaré dans
`TASKS.md`.

## v313 — L'autoroute São Paulo–Rio, et le témoin des ponts lit toutes les routes

**Pourquoi.** Dernier des trois corridors instruits en v310 : São Paulo–Rio, la
Via Dutra. Les routes n'existaient pas encore dans l'hémisphère sud.

**Ce que ça change.** La BR-116 relie São Paulo à Rio : 701 blocs de deux fois
deux voies, un pont juste avant Rio, et vingt voitures qui font l'aller-retour.

- **À São Paulo**, la ville n'a pas ses rues sur les axes que sa fiche déclare :
  dans l'axe, l'avenue d'entrée tombait sur des immeubles, puis sur un banc de
  trottoir. L'entrée a été choisie parmi tous les angles de −30° à 0° : celle
  dont l'avenue est la plus longue sur la chaussée (46 blocs, 97 %).
- **À Rio**, de l'eau borde la ville à l'ouest : tous les tracés ont un pont,
  celui-ci à vingt-cinq blocs de l'entrée.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.**

- `carteMonde.js` : un témoin neuf, rouge sur `origin/main` (pas de BR-116) — la
  route existe, porte vingt voitures, et entre dans les deux villes sans eau ni
  bloc sur l'avenue.
- `plafond.js` : le témoin du joint des ponts (v302) ne lisait que l'A1, dans
  une fenêtre fixe de ±8 blocs. Il lit désormais les ponts de TOUTES les
  routes, dans la largeur réelle de la section. Ma première sonde, à ±8 blocs,
  comptait 397 « trous » au pont de Rio — tous hors de la route, là où la
  chaussée se resserre en avenue ; dans la largeur réelle, zéro sur 5 644.

## v312 — L'autoroute Montréal–Québec : la première route du Nouveau Monde

**Pourquoi.** Troisième corridor de l'ordre fixé en v310, après Lille–Bruxelles
et Bruxelles–Amsterdam : Montréal–Québec, la rive nord du Saint-Laurent. Les
routes n'existaient qu'en Europe.

**Ce que ça change.** L'A20 relie Montréal à Québec : 1 000 blocs de deux fois
deux voies, sans un pont, et vingt voitures qui font l'aller-retour.

- **Rien à contourner** : aucune ville, aucun aérodrome, aucun monument à moins
  de deux mille blocs, et un pays bas aux deux sorties. Tranchée de 2,1 blocs
  au plus.
- **À Québec**, la trame organique pose des immeubles SUR l'axe, à neuf blocs
  du centre. Les voitures y seraient entrées. L'avenue d'entrée d'une ville
  engendrée s'arrête désormais au premier immeuble qu'elle rencontre. Pour les
  trois villes déjà reliées, l'avenue est inchangée.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Dans `carteMonde.js`, un témoin neuf, rouge sur
`origin/main` (pas d'A20) : la route existe, porte un convoi de vingt voitures,
et entre dans les deux villes sans eau ni bloc sur l'avenue. Le témoin des
entrées lit désormais l'avenue telle que le jeu la fait rouler
(`avenueDEntree`, une seule règle pour la circulation et pour le témoin). Les
témoins de route de la v300 lisent les quatre segments.

## v311 — L'autoroute Bruxelles–Amsterdam : le relief dessine le tracé

**Pourquoi.** Le kit v4 de Max demande les routes interurbaines pour toute la
carte. La v310 avait instruit les candidats et fixé l'ordre : Bruxelles–
Amsterdam d'abord, parce qu'elle prolonge l'E429. Sur l'axe direct, elle
arrivait par le sud d'Amsterdam, où le pays est à 47-52 blocs pour une ville à
33 : un profil à six pour cent y creusait une tranchée de dix-huit blocs, un
canyon.

**Ce que ça change.** L'E19 relie Bruxelles à Amsterdam : 1 041 blocs de deux
fois deux voies, sans un pont, et vingt voitures qui font l'aller-retour. De
Paris, on roule maintenant jusqu'à Amsterdam.

- **À Amsterdam**, elle entre par l'ouest, le seul côté bas de la ville. La
  rue de l'axe ouest franchit les canaux sur des ponts ; l'axe sud les coupe
  sans pont, les voitures y auraient roulé sur l'eau.
- **Schiphol** est exactement entre les deux villes. La route le contourne par
  l'est, à quatre-vingt-cinq blocs de son disque, puis trois virages la
  tournent vers l'entrée ouest.
- **À Bruxelles**, elle sort par l'est. La sortie nord montait sur la colline
  de l'Atomium : 9,04 blocs de tranchée pour un plafond à 9, sur tous les
  tracés essayés.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Dans `carteMonde.js`, un témoin neuf et un témoin
élargi, rouges sur `origin/main` (un seul segment, aucune entrée à Bruxelles
ni à Amsterdam) :

- l'E19 existe, porte un convoi de vingt voitures, et l'entrée d'Amsterdam
  arrive sur la rue, sans eau ni bloc sur l'avenue ;
- le témoin des entrées lit désormais TOUTES les entrées des villes
  engendrées (Bruxelles deux fois, Amsterdam une), jusqu'au bout de l'avenue,
  et non plus la seule première entrée de Bruxelles sur trente blocs.

Les témoins de route de la v300 lisent tous les segments : pente 0,063,
déblai 8,4, remblai 2,2, épinglage aux deux portes, aucun aérodrome, aucune
ville traversée. Le tracé a été cherché sous node parmi 32 000 candidats, dont
6 400 écartés par Schiphol ; aucun ne passait sous le plafond de déblai par
la sortie nord de Bruxelles.

## v310 — L'autoroute Lille–Bruxelles : la première route vers une ville engendrée

**Pourquoi.** Le kit v4 de Max place les routes interurbaines juste après le
rail et les raccords de ville, pour toute la carte. Seule l'A1 Paris–Lille
existait (v300). Les vingt-trois corridors candidats du kit
(`road-candidates.json`) ont été instruits d'un coup sous node, sur l'axe
direct : longueur, eau, voie ferrée, villes, aérodromes, repères. Lille–
Bruxelles sort en tête : 409 blocs, zéro eau, zéro rail, aucun obstacle. Et
elle prolonge l'A1 : de Paris, on roule désormais jusqu'à Bruxelles.

**Ce que ça change.** L'E429 relie Lille à Bruxelles : deux fois deux voies,
deux ponts, un profil continu, et vingt voitures qui font l'aller-retour.

- **À Lille**, elle entre par l'est, au carrefour du boulevard Carnot et de
  l'avenue Willy-Brandt, devant Euralille.
- **À Bruxelles**, ville engendrée sans avenue d'entrée dessinée, elle arrive
  dans l'axe de la trame, sur la rue qui mène à la place centrale. Le point de
  passage est choisi pour cela. L'autoroute entre jusqu'à la première rue de
  l'axe, parce qu'un anneau de verdure coupait l'axe à vingt blocs du bord.
- **Les voitures** d'une ville à deux entrées prennent celle de leur route.
  L'ancien code prenait toujours la première entrée : les voitures de
  Bruxelles seraient entrées par la porte de Paris.

Rien n'est écrit dans le relief : les deux empreintes de `plafond.js` ne
bougent pas.

**Ce qui le prouve.** Deux témoins neufs dans `carteMonde.js`, rouges sur
`origin/main` :

- l'E429 existe et porte un convoi de vingt voitures ;
- ses entrées de ville ne traversent aucun monument (le premier jet finissait
  dans la tour de Lille) et arrivent sur une rue à Bruxelles.

Les témoins de route de la v300 bouclent déjà sur tous les segments (pente,
épinglage, remblai, asphalte, contact au sol, ponts au-dessus de l'eau) :
l'E429 y passe. Le joint des ponts a été mesuré sous node sur les deux routes :
aucun point ouvert sur 13 065 pour l'E429. Les points de passage plus proches
de Bruxelles mettaient un pont de deux blocs sur le coude, dont le joint
s'ouvrait (153 points).

## v309 — Les villes engendrées sortent de leur fosse, et le vol ne passe plus le toit du ciel

**Pourquoi.** La v308 avait déclaré ce qu'elle ne pouvait pas faire : une ville
engendrée aplanit son disque à sa cote et raccordait le pays sur quatorze blocs,
quel que soit l'écart. Là où le pays est vingt blocs plus haut, cela fait deux
blocs de dénivelée par bloc — une fosse à gradins que la surface continue ne
dessine pas. Mesuré, soixante-quatre rayons par ville : **651 rayons sur 15 434
plus raides qu'un bloc par bloc**, 27 villes à plus d'un huitième (Salvador
46/64, Jakarta 34, Ushuaïa 33, Bari 32, Busan 29), tous dans le même sens — la
ville sous son pays. Max : « Fait tout, arrête d'attendre. » Et le portail a
rendu, sur un témoin qui ne regardait pas la carte, un second défaut : le vol
dépassait son toit d'un bloc quand une image était lente (159 pour un toit à
158).

**Ce que ça change.** Hors du disque, le pays ne dépasse plus la cote de la
ville plus 0,7 bloc par bloc d'éloignement : autour de 149 villes, les gradins
deviennent une pente qu'on descend en marchant ou en roulant. Le cône ne fait
qu'abaisser, et seulement là où le fondu d'avant était trop raide — une ville
sur un plateau garde son pays, la mer garde son fond. C'est du RELIEF, donc
l'invariant 1, sous la forme bornée : 393 000 colonnes abaissées de 21 blocs au
plus, jusqu'à 64 blocs hors du disque, AUCUNE dans la fenêtre d'empreinte, près
d'une ville bâtie à la main, d'un aérodrome ou d'un repère — les deux empreintes
de `plafond.js` n'ont pas bougé. Les blocs posés dans ces couronnes descendent
avec leur sol, d'un seul tenant (marche 6 → 7 de la migration, appliquée à la
tablette et à chaque document du nuage), et le nuage est mis à l'abri avant
(`~avant-fondu-doux`). Ce qui ne suit pas, déclaré : la voie ferrée et ses gares
près de Barcelone, d'Amsterdam et de Florence descendent d'un bloc avec leur
profil. Et le vol s'arrête au toit du ciel quelle que soit la cadence.

**Ce qui le prouve.** Cinq témoins neufs dans `plafond.js` et deux dans
`sauvegarde.js`. Les rayons raides passent de 651 à 2 (barre 65, rouge sur
`origin/main`) ; le monde de la v308 (`new World({ v308: true })`), contre lequel
la migration juge, rend au bloc près le relief de la production autour de cinq
villes touchées (empreinte relevée sur `origin/main`) ; le cône n'a fait
qu'abaisser, seulement dans la couronne ; une maison de la couronne de Salvador
descend de quatre blocs d'un seul tenant, le reste ne bouge pas, la marche est
idempotente et la chaîne entière rend la même chose ; aucune couronne n'atteint
ce que les enfants ont bâti (la plus proche, Bruxelles, à 939 blocs) ; une
cabane reçue du nuage arrive sur le sol neuf sans fantôme, et la copie d'avant
est écrite. Le témoin du seuil des villes de la v308 passe de 14,5 % à 4,0 % de
rayons à marche. Le toit du vol : le témoin existant (« on ne sort plus du monde
par le haut »), rouge au portail sur une image lente, se tient désormais par
construction.

## v308 — Le raccord ville/campagne : on sort d'une ville sans marche

**Pourquoi.** Max : « Improve all cities ». Le kit v4 place le raccord
ville/campagne juste après le rail, pour TOUTE la carte. Mesuré avant d'écrire
une ligne, sur les 276 villes, 48 rayons chacune, en marchant au dixième de
bloc de r − 4 à r + 3 : **un seuil de ville sur trois (1 666 sur 5 011) a une
marche** — la chaussée voxel domine d'un bloc la campagne que le sol continu
(v297) a lissée. Et dans les villes à collines (San Francisco, Rio, Le Cap), la
rue en pente descend par marches d'un bloc.

**Ce que ça change.** Le sol d'une ville — chaussée, trottoir, pavé, marquage,
granit, square — rejoint la surface continue là où le relief change d'un ou deux
blocs, sur deux rangs de part et d'autre du ressaut : la marche du seuil devient
une pente, et une rue de colline devient une rampe. Sur le plat, la rue reste en
voxel (son ombre au pied des murs, ses marquages calés sur le bloc). Paris ne
change pas : sa chaussée a sa couche de sol HD, et son seuil n'avait pas de
marche. Rien n'est écrit, le relief ne bouge pas (les deux empreintes de
`plafond.js` sont intactes), un bloc posé sur la rue la rend au voxel comme
partout.

**Ce qui le prouve.** Trois témoins neufs dans `plafond.js`, dont deux rouges
sur `origin/main` : le seuil des villes (33,7 % des rayons à marche → 14,5 %, à
24 rayons ; barre 23 %), le seuil de Vilnius parcouru sur la surface continue
(16 points sans surface → 0), et une rue à plat qui reste en voxel (0 colonne
sur 1 624, vert des deux côtés à dessein : il garde la borne de la règle).
Captures avant/après au seuil de Vilnius et de Koweït. Ce qui reste, déclaré :
les seuils où le fondu est plus raide qu'un bloc par bloc (4 % des rayons, 129
marches de deux blocs, Salvador, Bari, Jakarta…) — les adoucir déplace le
relief hors des villes, c'est une décision de Max.

## v307 — Les rues du monde à la règle du kit, pas seulement celles de Paris

**Pourquoi.** Max : « Pourquoi tu n'as pas fait le reste du monde ? » Son kit
visait la carte entière, et la v303 n'avait appliqué la section de rue du kit
(`roadSection`) qu'à Paris. Les 262 villes engendrées à trame gardaient les
largeurs choisies à la main en v271 : 5,6 blocs de chaussée, 2,0 de trottoir,
une « avenue » centrale de 6,8 — et, sans que rien ne le dise, Barcelone avait
perdu ses coins coupés à la même v271 (le chanfrein restait écrit « 5,0 depuis
l'axe » quand le trottoir finissait à 4,8 : il ne coupait plus que deux
dixièmes de bloc).

**Ce que ça change.** Dans toutes les villes engendrées, la rue est une
collectrice du kit — deux voies de 3,2 m, 6,4 blocs de chaussée, trottoirs de
2,5 — et, dans les 47 grandes villes où l'îlot le permet, la croix centrale est
un boulevard à quatre voies (13 blocs de chaussée, trottoirs de 4). Les lots
sont recomposés comme à Paris : le pas de trame et la couronne bâtie grandissent
dans le rapport des emprises, si bien que la part bâtie reste la même (18,2 % →
18,4 %). Barcelone retrouve ses coins coupés. Quatre villes que l'heuristique
mettait en superîlot sont nommées avec leur vrai tissu (Mumbai, Lhassa,
Vientiane, Canberra). Le sol ne bouge pas — c'est du sol, pas du relief.

Le prix, déclaré : moins de rues, plus larges, donc moins de circuits de
voitures — 602 anneaux deviennent 440, la rue qui porte un convoi passe de
158 974 à 127 734 blocs (−20 %), aucune ville n'en perd tous. Les médinas
(Venise, Fès, Marrakech…) restent hors de la règle : la section `ruelle` du kit
leur ôterait tous leurs réverbères, c'est une décision de Max.

**Ce qui le prouve.** Quatre témoins neufs dans `carteMonde.js`, qui lisent le
SOL en traversant des rues au vingtième de bloc ; les trois premiers sont rouges
sur `origin/main` (même mesure rejouée sous node sur les deux arbres) :
chaussée médiane 5,25 → 6,25 pour une barre de 5,9, trottoir 2,02 → 2,50, croix
centrale 7,05 → 13,05, coins coupés de Barcelone 0/132 → 119/122 (Rome 0 des
deux côtés). Le quatrième est vert des deux côtés à dessein — il garde une
capacité qu'on vient de frôler : la part bâtie tient sa barre de 17, que le
premier jet (pas seul agrandi, 14,5) cassait. Et un témoin de la v280 est
repointé, pas assoupli : « deux villes ne sont plus la même ville » comparait
la distribution du sol de TOUTES les paires, et deux villes du même tissu
l'ont par construction — leur pire paire va de 0,988 à 0,996 selon la seule
taille de la fenêtre, des deux côtés, pour une barre à 0,995 : un tirage. La
distribution se compare désormais entre tissus différents (pire 0,972, barre
0,985 ; le plan unique d'avant la v280 n'en a aucune paire), l'identité
colonne par colonne toujours sur toutes. Les témoins d'avant — deux voitures côte à côte, îlot
de cinq blocs, voie de droite, partage de rue, mobilier hors du couloir, une
voiture visible du centre — restent verts.

---

## v306 — Paris double, et déménage : les quartiers retrouvent leurs immeubles

*Livrée en une seule fusion avec les v303, v304 et v305 — décision de Max :
« attends et fais un méga merge ». Les rues à la règle du kit (v303) vidaient
la rive gauche ; elles ne partent qu'avec la ville qui leur fait de la place.*

**Pourquoi.** Les rues de la v303 sont à la règle du kit — deux voies partout,
quatre sur les grands boulevards — et dans un disque de cent quatre-vingt-cinq
blocs elles mangeaient les quartiers : Saint-Germain passait de 168 colonnes
d'immeubles à 2, le Marais de 41 à 2, le Faubourg Saint-Antoine de 91 à 10.
Max a choisi, parmi trois propositions chiffrées : « Doubler Paris, déplacé ».
Doublé sur place, le disque aurait recouvert le point d'apparition, le musée et
le quartier des enfants.

**Ce que ça change.** Paris passe de 185 à 370 blocs de rayon et de
vingt-quatre à quarante-huit blocs par kilomètre ; son centre part de cent
soixante-dix blocs vers le sud-ouest. Les rues gardent leurs largeurs de la
v303 : ce sont les îlots, la Seine, les îles, la butte et les jardins qui
doublent — et chaque quartier retrouve plus d'immeubles qu'en production
(Saint-Germain 9,5 % du quartier → 12,8 %, le Marais 2,6 → 3,9, l'Étoile 1,8 →
12,1). Ce qu'il recouvrait déménage, chaque fois à l'endroit qu'une sonde a
MESURÉ (au sec, plat, loin des villes, des voies et de ce que les enfants ont
bâti) : Roissy au nord-ouest, Orly au sud, la base de Saint-Dizier à l'est, le
volcan plein sud, la caserne à l'ouest — et le village gaulois en Armorique, à
Erquy, au bord de la Manche. L'autoroute A1 est retracée jusqu'à la nouvelle
porte nord.

**Ce que les enfants ont bâti suit sa ville.** Une maison posée dans l'ancien
Paris part avec son quartier : elle se retrouve là où le plan doublé met le
même endroit de la vraie ville, posée sur son sol ; ce qui était perché sur un
ancien toit se pose dans la rue (le toit n'est plus là) ; une maison sur
l'ancien tarmac de Roissy suit l'aérodrome ; un trou creusé dans un ancien
immeuble part avec l'immeuble. Et là où une construction arrive, la ville
n'élève pas d'immeuble : elle laisse une cour pavée. Le document du nuage est
recopié tel qu'il était, sur son propre document, avant qu'on y touche.

**Ce qui le prouve.** Le sol, d'abord, et la casse se BORNE : avec la même
découpe (l'ancien et le nouveau Paris, les sites d'avant et d'après des trois
aérodromes, du village et du volcan), l'empreinte du paysage vaut
`2aeceaa1…` sur `origin/main`, sur la v305 et sur la branche — 154 158
colonnes, identiques. Le « monde d'avant », contre lequel la migration juge les
blocs d'avant, rend au bloc près le monde de la production : relief de l'ancien
Paris (40 401 colonnes) et blocs de seize morceaux autour de l'ancienne
Notre-Dame (253 952), deux empreintes relevées sur `origin/main`. Cinq témoins
purs de `plafond.js` : la maison suit son quartier et se pose sur son sol ;
l'ancien tarmac suit Roissy, le trou part avec l'immeuble, rien ne bouge au
point d'apparition ni après la date, la marche est idempotente ; la chaîne
entière ne perd pas une maison d'avant le ménage posée là où le relief a
changé (vérifié rouge avec un ménage jugé sur le monde neuf : zéro bloc
arrivé) ; le nouveau Paris ne bâtit pas sur ce qu'un enfant avait bâti mais
bâtit sous ce qu'on pose après. Deux témoins de `sauvegarde.js` : une maison de
l'ancien Paris reçue du nuage arrive dans le nouveau, sans fantôme, et le nuage
est mis à l'abri avant.

**Et ce que le doublement cassait sans bruit — trouvé par le portail, pas par
une relecture.** Un circuit de voitures de l'est parisien (Voltaire,
Belleville, Ménilmontant, Diderot) disparaissait : il tenait par un raccord
entre Diderot et le Faubourg Saint-Antoine qui n'existait que par un hasard
d'arrondi, et Nation tombe un bloc plus loin dans le plan doublé. Il passe
désormais par la gare de Lyon, où Diderot finit vraiment : huit circuits sur
huit, douze blocs de partage au pire, aucun pas dans la Seine. Et douze
carrefours sur quarante-quatre n'avaient plus un seul feu tricolore depuis
les rues de la v303 : un boulevard a treize à dix-sept blocs de chaussée, et
le jeu cherchait les coins d'un carrefour à sept blocs du croisement. La
portée se déduit désormais de la plus large section de Paris (quinze blocs) :
mesuré dans le monde, 14 carrefours sans feu avant, 3 après — 2 sur 42 en
production, des coins qu'un monument recouvre. Le Paris d'avant, qui doit
rendre la production au bloc près, garde ses sept blocs. Trois témoins de
`carteMonde.js` mesuraient encore l'ancien Paris (la fenêtre des feux, le
compte des ponts sur l'axe, la place de la caserne) : repointés, avec leur
mesure.

**Ce qui reste, et qui se dit.** Une tablette qui jouerait encore sur l'ancienne
version après la publication poserait dans l'ancien Paris des blocs que la
marche ne suivra pas. Un garage posé dans l'ancien Paris voit ses blocs partir
avec la ville, mais sa place de parking reste à l'ancienne adresse. Une
construction de campagne dont le sol a bougé de plus de vingt-quatre blocs
(une colline recouverte par la ville) reste où elle est. Détail dans
`TASKS.md`.

**Et ce que le déménagement a révélé dans la préparation.** Arrivé à Paris, le
jeu compilait cinq à neuf programmes de dessin sur place — le gel de la v246 —
parce que le tirage de la flotte, qui dépend de la place de la ville, met
désormais une berline citadine à portée. Elle se FABRIQUE au lieu de se charger
d'un fichier, et la préparation de l'accueil ne chauffait que les fichiers : le
trou existait en production dans toutes les villes, une voiture sur six.
L'accueil la compile désormais aussi, et les feux tricolores avec elle :
aucun feu n'est à portée du point d'apparition, leurs lentilles se
compilaient donc à la première ville — y compris en production. Mesuré par
`sonde-programmes-paris.cjs` : deux ou trois programmes neufs à l'arrivée,
qu'aucun objet de la scène n'utilise plus, contre quatre (les feux) sur
`origin/main` et cinq à neuf sur la branche avant. Trois témoins de
`monte.js` mesuraient encore l'ancien Paris : le train se cherche à sa hauteur
de tracé et non sur une voiture pas encore fabriquée, le cadran de cap lit
« le nez perd 90° » au lieu de « 152° → 062° » (Paris a bougé, le cap de
départ aussi), et la variété des voitures se compte en proportion (trois
modèles sur quatre) plutôt qu'en nombre absolu — **le prix se dit** : sur la
rive gauche, huit voitures à portée au lieu de quatorze, les huit circuits se
partageant un Paris quatre fois plus grand (dette dans `TASKS.md`).

### Et dans la même fusion : le GPS — s'y rendre au lieu de s'y téléporter

**Pourquoi.** Max : « une forme de GPS quand on veut se rendre dans une
destination. Soit on se téléporte, soit on fait GPS. Au clic long, deux
boutons : téléporter ou s'y rendre. » L'appui long sur la carte téléportait
d'office : on ne pouvait choisir un endroit que pour y sauter, jamais pour y
aller par ses propres moyens — à pied, en voiture, en avion.

**Ce que ça change.** L'appui long sur la carte pose la question sous le doigt :
« ✨ Téléporter » fait ce qu'il faisait, « 🧭 S'y rendre » laisse l'enfant où il
est, ferme la carte et allume en haut de l'écran une flèche qui tourne vers la
destination, son nom (la ville où tombe le point) et la distance, avec un mot —
« tout droit », « à droite », « à gauche », « fais demi-tour ». Sur la carte, un
drapeau et un trait pointillé depuis l'enfant. À douze blocs, le GPS s'éteint et
le dit (« Tu es arrivé ! ») ; ✕ l'arrête à tout moment. Le trajet survit à la
montée en voiture, au décollage et à une téléportation.

**Ce qui le prouve.** Quatre témoins de `carte.js` : l'appui long propose les
deux boutons sans partir tout seul, « S'y rendre » laisse l'enfant sur place et
montre le GPS vers le point visé, la flèche pointe du bon côté (face à la
cible, cible à droite, cible à gauche — un signe se regarde, v231), et le GPS
s'éteint à l'arrivée. Le témoin d'appui long d'avant choisit désormais
« Téléporter », comme l'enfant.

### Et dans la même fusion : prendre une voiture marche à chaque fois

**Pourquoi.** Le portail de la v306 a rendu rouge « on prend le volant d'une
voiture vue dans la rue », vert sur toutes les versions jusqu'à la v303. Deux
défauts empilés. Le témoin appelait le raccourci de page avec la mauvaise
signature et visait la voiture la plus proche DU MONDE (139 blocs) : il passait
par chance, jusqu'à ce que Paris doublé déplace son circuit. Et une fois visé
juste, le jeu répondait « 🚙 Tu montes dans le voiture ! Il t'emmène » : la place
la plus proche n'avait pas encore de voiture fabriquée, `emprunter` la refusait,
et l'enfant devenait passager comme dans un métro.

**Ce que ça change.** Une place de convoi se prend même quand sa voiture n'est
pas encore dessinée : elle se fabrique à l'instant, à sa place. Ce défaut est
aussi celui de la production.

**Ce qui le prouve.** Le témoin de `fumee.js`, rouge sur le code d'avant
(« Tu montes dans le voiture », à 2,8 blocs), vert après (« Tu prends le volant
de la Rimac Nevera », à 1,6 bloc) ; il publie désormais le bouton, le bandeau et
la place visée. Pourquoi une place à moins de trois blocs n'avait pas de
voiture dessinée reste ouvert, et c'est déclaré dans `TASKS.md`.

## v305 — En ligne, tout le monde voit la même rue

*Livrée avec la v306, dans la même fusion.*

**Pourquoi.** Max, en jouant à plusieurs : « les utilisateurs ne voient pas les
mêmes voitures en même temps. Et quand on monte dans une voiture, elle change
de couleur. Il n'y a pas de consistance entre les voitures et la scène dans les
mondes en ligne. » Sa capture montrait la voiture de Marlon au milieu d'un
convoi de Paris. Trois causes, et aucune n'était dans le réseau lui-même :
chaque tablette faisait rouler SA circulation, depuis l'instant où SA page avait
créé le convoi — deux enfants au même carrefour voyaient deux rues sans
rapport ; la voiture prise dans la rue emportait son modèle mais pas sa
couleur, et la monture neuve reprenait la teinte d'usine du fichier ; et pour
la tablette d'Alice, Marlon au volant n'était qu'un avatar, que la rue
traversait sans le voir.

**Ce que ça change.** La position d'un convoi n'est plus une somme de pas :
c'est une GRILLE HORAIRE, une fonction de l'heure de la rue — droite à vitesse
constante, paliers aux quais, et pour les voitures qui freinent dans les
virages, la marche d'avant simulée une fois sur un tour, si bien qu'elles
freinent exactement comme avant. L'hôte donne l'heure de la rue avec celle du
ciel, toutes les trois secondes, et les feux tricolores la lisent aussi : deux
amis au même carrefour voient le même feu arrêter les mêmes voitures. La
voiture qu'on prend garde sa couleur, sous l'enfant et chez l'ami qui le
regarde conduire ; elle quitte la circulation de TOUTES les tablettes, et les
voitures qui la suivaient ne font plus un bond en avant (sa place reste, vide).
Et chaque ami entre dans la liste de ceux à qui la rue cède le passage — à
pied ou au volant —, comme l'enfant depuis la v245.

**Ce qui le prouve.** Quatre témoins de `reseau.js`, Marlon et Alice emmenés à
Paris, chacun rejoué sur l'ancien code dans le même passage de banc :

| témoin | ancien code | code neuf |
| --- | --- | --- |
| les deux tablettes voient la même rue (écart médian, lu au même instant) | 37 blocs | 5 blocs |
| la voiture prise garde sa couleur, chez soi et chez l'ami | teinte perdue | gardée |
| chez l'ami, la voiture qui arrive derrière celle de l'enfant l'attend | 0 s | 19 s |
| sur la carte de l'ami, l'enfant au volant est là où il est | 300 blocs d'écart | sous un bloc |

Trois témoins ont d'abord été VERTS sur l'ancien code, et il a fallu six
versions du troisième pour qu'il sépare les deux : lu en deux temps sur deux
pages, l'écart de rue mesurait la cadence du banc ; posé sur une ligne droite,
Marlon ne croisait personne. On lit désormais les deux tablettes au même
instant, et l'on se pose sur la voie d'une voiture qui roule.

**Et ce que le témoin ne prouve pas, il le dit.** Sur les deux codes, une AUTRE
voiture que celle qui cède est entrée une fois dans celle de Marlon chez Alice.
Ce n'est pas dans le verdict, c'est dans le message et dans `TASKS.md`, avec
trois pistes à séparer par une sonde.

**Ce qui reste, et qui se dit.** Une tablette cède le passage à ce qu'ELLE voit
de l'enfant et de ses amis : à un instant près, deux tablettes ne font pas
attendre exactement la même voiture, et un train arrêté devant un enfant ne
l'est que chez ceux qui l'ont vu — il reprend sa grille là où il s'était
arrêté. Une voiture qu'un ami a prise puis laissée garée ne se voit que chez
lui. Et une partie rejointe en cours de route ne sait pas quelles voitures ont
déjà été prises avant son arrivée.

**Et la carte montre l'ami là où il est.** Max : « en multijoueur, la position
sur la carte n'est pas toujours à jour ». Depuis la v253 un ami au volant, ou
passager, est assis DANS le maillage de sa voiture ; la minicarte et la carte du
monde lisaient la position de ce maillage — celle du siège, à un bloc de zéro —
et le montraient figé près du point d'apparition tant qu'il conduisait. Elles
lisent désormais sa position vraie. Un quatrième témoin de `reseau.js` : Marlon
au volant, son point sur la carte d'Alice est à moins d'un bloc de là où il est.

## v304 — Le son de la visio n'est plus robotique, et un train s'arrête devant la voiture

*Livrée avec la v306, dans la même fusion.*

**Pourquoi.** Max : « Alice, quand elle utilise la fonctionnalité audio et
vidéo, elle entend un son hyper robotique de son côté sur son iPad. Ça n'arrive
pas avec tous les appareils, mais avec le sien, oui. » Dès qu'un appel porte du
son — le micro de l'enfant ouvert, ou la voix d'un ami qui arrive —, iOS passe
la session audio de la tablette en mode APPEL : traitement de la voix,
annulation d'écho, et sur certains iPad une autre fréquence d'échantillonnage
que la lecture ordinaire. Le contexte Web Audio du jeu, ouvert avant l'appel
(la radio, le moteur, les bruits de blocs), restait à l'ancienne fréquence et
passait par un rééchantillonnage de mauvaise qualité — le son robotique que
Safari connaît, et qui dépend du matériel, d'où « pas avec tous les
appareils ». Et la radio à pleine puissance dans le haut-parleur, l'annulation
d'écho la découpait en morceaux.

**Ce que ça change.** Quand un appel se met à porter du son, et quand il
cesse, le jeu ferme son contexte audio et en ouvre un neuf, qui prend le mode de
la tablette ; le moteur et la radio qui jouaient reprennent dessus, sans que
l'enfant touche à rien. Pendant l'appel, le jeu parle quatre fois plus bas, pour
laisser la place aux voix. Rien ne change pour qui ne passe pas d'appel.

**Ce qui le prouve.** Trois témoins de `visio.js`, sur le trajet des deux
enfants (Alice allume sa caméra et son micro, Marlon l'entend) : le micro
ouvert, le jeu joue sur un contexte audio NEUF et l'ancien est fermé ; pendant
l'appel la radio du jeu parle plus bas sans se taire (niveau mesuré sur la
sortie, pas sur un drapeau) ; caméra éteinte, le jeu reprend sa voix normale
sur un contexte neuf. Rouges tous les trois sur l'ancien code. Ce que le banc
ne peut pas prouver, et qui se dit : Chromium n'a pas de mode appel, donc le
banc éprouve le GESTE (le contexte change, la voix baisse), pas l'oreille
d'Alice — c'est sur son iPad que la correction se juge.

**Et le train ne traverse plus la voiture de l'enfant.** Max, trois captures
d'iPhone : « d'autres défauts de overlap » — sa voiture garée sur la voie
ferrée, le train qui passe au travers, et l'intérieur noir de la rame qui
remplit l'écran quand la caméra se retrouve dedans. Les trains et les métros
ne cédaient à personne : seule la circulation des rues (`routier`) regardait
l'enfant depuis la v245. Désormais, si ce que la motrice va balayer dans les
quatre blocs suivants touche l'enfant — à pied ou au volant —, la rame
s'arrête comme à quai, sans limite, et repart dès que la voie est libre ; ses
voitures entrent dans la liste des obstacles, si bien que la voiture de
l'enfant bute sur un train au lieu d'y entrer, et qu'une voiture de la rue
attend à un passage à niveau. Un train qui touche DÉJÀ l'enfant continue (y
rester, c'est y rester pour toujours), celui où il est assis aussi, et la
rame s'arrête assez près pour que « Monter à bord » la voie encore. Un témoin
de `monte.js` pose la voiture de l'enfant sur la voie d'un train de surface,
trente blocs devant la motrice : le train s'approche, s'arrête, et aucune de
ses voitures ne touche la sienne — sur l'ancien code, il passe au travers.

## v303 — Les rues de Paris suivent la règle du kit : deux voies partout, quatre sur les grands boulevards

*Livrée avec la v306, dans la même fusion.*

**Pourquoi.** Max : « Les rues de Paris sont encore beaucoup trop étroites. Je
comprends pas. T'as pas appliqué le code à la règle. » Il avait raison. Le kit
livre `road-section.mjs`, qui CALCULE la section d'une rue à partir de son
type et du véhicule qui y roule, à un bloc pour un mètre ; la v294 avait choisi
ses largeurs à la main pour qu'une seule voiture passe — 3,6 blocs de chaussée
et des trottoirs de 1,8 dans la ville d'Haussmann. Depuis que la v301 a donné
trois blocs à un étage, ces rues de sept blocs couraient entre des façades de
vingt-quatre : des canyons.

**Ce que ça change.** La section d'une rue se demande désormais à `voirie.js`,
le `roadSection` du kit recopié sans une valeur changée : une voie vaut la
largeur d'une voiture plus quarante centimètres de chaque côté. Les rues de
quartier d'Haussmann, de Saint-Germain, de Monceau, de l'Étoile et de Passy
sont des rues COLLECTRICES — deux voies de 3,2 m, trottoirs de 2,5 m, 11,4
blocs d'emprise contre 7,2 ; les ruelles du Marais, du Quartier latin, de
Montmartre, de Belleville et du Faubourg des rues LOCALES (une voie, trottoirs
de 2 m) ; les neuf percées de premier rang (Rivoli, les Grands Boulevards,
Sébastopol, Voltaire, la Grande Armée, Saint-Germain, Saint-Michel,
Montparnasse, Haussmann) des BOULEVARDS à quatre voies et trottoirs de 4 m,
21 blocs ; les Champs-Élysées gardent en plus le stationnement des deux côtés,
25,4. Les îlots grandissent dans la même proportion que les rues — le kit :
« si l'élargissement mange les bâtiments, recompose les lots » — si bien que
Paris garde sa part bâtie (22,6 % du disque → 21,6) et ses huit circuits de
voitures, tous à 94-100 % sur la chaussée. Le relevé des toits de la v301
lit la trame d'avant, figée (`paris-v302.js`), sans quoi il déplacerait des
blocs qui n'ont jamais été sur un toit. *(La règle qui gardait la ville
d'avant sous ce qu'un enfant avait bâti n'est pas partie telle quelle : la v306,
livrée dans la même fusion, déplace tout Paris, et c'est la ville neuve qui
cède à ses constructions.)*

**Ce qui le prouve.** Trois témoins de `carteMonde.js` : la rue de quartier
mesurée sur le MONDE (plus courte traversée de chaussée sur douze directions,
même fenêtre que la v294) a la chaussée d'une rue collectrice — médiane 4 sur
`origin/main`, 6 ici ; la part bâtie du disque ne s'effondre pas (barre 17 %,
au milieu de mon premier jet à 12,7 et du livré à 21,6) ; la règle connaît la
vraie largeur d'une voiture de la flotte. Deux témoins purs de `plafond.js` :
une maison posée sur une ancienne rue avant la date garde sa rue, et la même
colonne sans elle, ou avec un bloc posé après, reçoit l'immeuble neuf ; le
témoin du relevé des toits (v301) repointé sur la trame figée, et vérifié dans
un monde où la cabane est au journal. Mesuré avant d'écrire la règle finale,
et écarté : la section de boulevard pour toute « avenue » ou tout
« boulevard » (vingt-sept dans un disque de 370 blocs) faisait perdre 40 % des
immeubles, et l'îlot gardé tel quel un tiers.

**Le prix déclaré, et ce que le portail a démonté.** Les quartiers nommés du
jeu sont de petits disques d'un kilomètre, et les percées à la règle (vingt et
un blocs d'emprise) les traversent : le Marais garde deux colonnes de lot (41
en v302), Saint-Germain deux (168), le Faubourg Saint-Antoine dix (91) — mesuré
quartier par quartier ; les agrandir de trois quarts n'y change rien, ce sont
Rivoli, les Grands Boulevards et le boulevard Saint-Germain qui les occupent.
Le registre « ancien » (enduit et volets) reste au Quartier latin, et Paris
doublé (la livraison décidée par Max) rendra leurs immeubles aux trois. Le
portail complet a rendu cinq rouges de la livraison, tous démontés sous node :
le ménage du ciel jugeait « en l'air » un bloc collé à un immeuble de la ville
d'avant, parce que son générateur ne savait pas quelles colonnes le jeu garde
dans l'ancienne trame — il le sait désormais (`colonnesParisAvant`, la même
règle que le jeu) ; ce qui a montré qu'un bloc collé à une façade (dans la
colonne de la rue) perdait le mur qui le portait si l'immeuble passait à la
ville neuve : la ville d'avant se garde désormais sur les huit colonnes
voisines de toute construction, et un témoin de plus le prouve ; et quatre témoins mesuraient à côté — le morceau le plus
bâti de l'ouest n'a plus un carrefour (on cherche le plus proche qui porte une
rue), le Marais n'a plus d'immeubles (on garde le registre au Quartier latin,
modèles de monuments écartés par leur nom), un immeuble creux de la v301 a son
toit à vingt-quatre blocs quand le témoin du tissu ne lisait que vingt (176
lots « vides »), et la fenêtre de la rue était centrée sur la Seine et la Cité
(dix bordures de granit, toutes les rues de quartier y ayant cédé aux percées ;
elle vise désormais le quartier haussmannien du témoin du tissu).

## v302 — Le rail continu : les neuf lignes de train roulent sur un profil flottant, et le pont de l'A1 n'a plus de trou

**Pourquoi.** Quatrième livraison du programme « monde fidèle », et la
première du kit transport de Max (`transport-v298`, priorité 1 : « remplace
les rails voxel par une géométrie orientée continue ; partage le profil
flottant avec le train, les gares et les contacts »). Mesuré sur le TGV
Paris–Lyon avant d'écrire une ligne : le train montait par MARCHES D'UN BLOC
(sa cote était le profil arrondi, plus 2,05 — marche max 2,0 entre deux pas
de tracé), les quatre files de rail étaient 1 441 blocs d'obsidienne posés
sur une chaîne arrondie, et le sol continu de la v297 ne connaissait pas la
voie : il passait au RELIEF au-dessus des tranchées et refermait le déblai
d'une dalle d'herbe sous laquelle le train roulait — 53 colonnes de surface
justes sur 274, zéro sur les 439 colonnes en tranchée ou en remblai. Le
remblai était un mur de pierre vertical, la tranchée un puits.

**Ce que ça change.** Les neuf lignes (Eurostar, TGV, Shinkansen, AVE,
Frecciarossa, ICE — 11 667 blocs de voie, dix-huit gares) roulent sur UN
SEUL profil flottant, `coteContinue`, lu par les quatre lecteurs : le
générateur n'écrit plus que la plate-forme (remblai de pierre, ballast de
gravier, gabarit dégagé jusqu'au relief), le mailleur émet les quatre files de
rail et les traverses comme des prismes continus qui suivent la pente (les
rubans de l'A1, v300, une pièce de plus), le sol continu passe à la cote du
profil sur le ballast comme sur un TALUS neuf d'un bloc par bloc de chaque
côté (17 188 colonnes, treize blocs de large au plus, aucune dans un
aérodrome, la plus proche de ce que les enfants ont bâti à 191 blocs), la
gare pose son quai un bloc au-dessus du ballast, et le train roule sur le
dessus des rails — `cote + 0,3 + 0,05`, plus jamais « plus deux ». Plus un
bloc d'obsidienne ni de planche sur la voie ; les rails restent visibles avec
`?solcontinu=0` (ils sont de la géométrie, pas de la surface). **Le relief ne
bouge pas** : la voie est un ouvrage écrit en blocs depuis la v213, et les
deux empreintes de `plafond.js` sont intactes.

**Ce qui le prouve.** Trois témoins purs de `plafond.js` (node, sans
navigateur), rouges sur l'ancien code EN MESURANT LE MÊME DÉFAUT : « le train
roule sur le dessus de ses rails, sans une marche » (marche max 1,344 = la
pente du profil sur un pas de tracé, contre 2,0 ; écart au rail 0,0000 sur
451 pas), « les rails sont des prismes continus, plus un bloc d'obsidienne »
(400 pas à quatre files, 0 obsidienne sur 4 376 colonnes, contre 1 441),
« le sol continu suit le profil de la voie, dans la tranchée comme sur le
remblai » (3 932 colonnes de surface sur 4 376, écart 0,0000, 261/261 en
déblai ou remblai de deux blocs et plus, contre 0/439). Quatre témoins de
`carteMonde.js` re-pointés — on repointe, on ne supprime pas (v285) : « de
vrais rails, pas une marche de plus d'un bloc », « les quatre files dépassent
du ballast, sans un trou » (lues dans les rubans du mailleur), « le quai à
côté des voies, jamais dessus » (le talus cède au quai), « les dix-huit gares
ont leur quai ». Les vingt-deux essais node du kit passent tels quels ;
captures avant/après aux mêmes coordonnées, cap, heure et réglages (la voie,
la voie de côté, la tranchée, le remblai, la gare de Lyon, l'entrée du pont de
l'A1) dans `docs/monde-fidele/captures/v302-{avant,apres}-*.png` ; le coût
du mailleur, quatre morceaux de la voie Paris–Lyon en ordre alterné sous
node : médiane 5,7 à 6,6 ms contre 5,4 à 7,9 sur `origin/main`, dans le bruit
(une quarantaine de prismes par morceau de voie).

**Et le trou dans l'autoroute (second sujet de la livraison).** Max, capture
d'iPad à l'entrée du pont de l'A1 : « trou dans l'autoroute ». **Pourquoi** :
la route est OBLIQUE sur la grille ; la dernière colonne de chaussée finissait
en escalier, le tablier du pont (un ruban, v300) commençait à un pas
d'abscisse droit, et entre les deux restaient des triangles ouverts sur la
rivière — mesuré sous node, 464 points de chaussée sur 6 500 aux deux joints
du pont sans rien dessous. **Ce que ça change** : le tablier déborde de deux
pas sur la route à chaque bout (`CULEE`, `routes.js`), un centième au-dessus
de la chaussée qu'il recouvre ; le contact n'avait pas de trou (il lit
`tablierEn`), seul le dessin en avait. **Ce qui le prouve** : un témoin de
`plafond.js`, « la chaussée ne s'ouvre pas au joint du pont », qui
échantillonne la chaussée tous les dixièmes de bloc de part et d'autre des
deux bouts — 464 trous sur `origin/main`, zéro ici.

## v301 — Paris prend de la hauteur : un étage fait trois blocs

**Pourquoi.** Max, capture d'une rue de Paris à l'appui : « on a vraiment une
problématique de proportion où Paris est beaucoup trop compressé. » Mesuré :
une personne fait 1,8 bloc, un étage haussmannien faisait UN bloc (3,2 m dans
la vraie ville), et un immeuble de six niveaux culminait à dix blocs, toit et
cheminée compris — médiane sur 6 043 colonnes de lot. La femme sur le trottoir
de sa capture touchait le plafond du premier étage. Trois échelles vivaient
dans la même rue : le plan à vingt-quatre blocs par kilomètre, les personnes et
les voitures à un bloc pour un mètre, les étages entre les deux. Deux remèdes
lui ont été proposés, chiffrés ; il a tranché pour la verticale seule (« je
suis tes recommandations, augmente ») — l'horizontale multiplierait par neuf le
nombre de morceaux de Paris, ce que son iPhone, qui vient de mourir à 1 089
morceaux (v299), ne tiendrait pas.

**Ce que ça change.** Un étage courant fait trois blocs, le rez-de-chaussée
commerçant trois, l'entresol deux : un immeuble de six niveaux monte à
dix-sept blocs de façade, vingt et un avec la corniche et le comble — contre
six et dix. Une baie fait 1,7 bloc de haut : une personne passe la tête à la
fenêtre, ce qu'elle ne pouvait pas faire. Chaque niveau se lit de bas en haut
en bandes — l'allège et son appui, le bas de la baie et son garde-corps, le
haut de la baie et son linteau ; la dalle et la ferronnerie du balcon filant
aux étages nobles ; la devanture sur trois blocs, l'entresol sur deux — de
près en relief, de loin en tuiles, donc aussi sur un appareil sans couche HD.
Le plan ne bouge pas, les rues non plus, ni le relief : les deux empreintes de
`plafond.js` sont intactes. Ce qu'un enfant avait bâti SUR un toit de Paris
monte avec le toit, d'un seul tenant, sur l'appareil comme dans le nuage, une
copie d'avant prise sur le nuage ; ce qui est dans la rue, collé à une façade
ou hors de Paris ne bouge pas. Et Paris pèse MOINS : le châssis d'une fenêtre
est un seul quad ajouré au lieu de six boîtes de menuiserie — un morceau dense
de l'ouest passe de 10,9 à 9,2 mégaoctets avec des façades trois fois plus
hautes, ce qui garde le budget de la v299. Les monuments, eux, n'ont pas bougé
dans cette livraison : l'Opéra (19 blocs) et les Invalides (22) sont désormais
plus bas que les immeubles d'à côté (21 à 24), et leur remise à l'échelle,
avec leurs modèles en relief, est la prochaine livraison — déclarée dans
`TASKS.md` avec les hauteurs mesurées.

**Ce qui le prouve.** Sept témoins neufs, tous rouges sur l'ancien code. Dans
`parishd.js` : la façade se lit en bandes, dans l'ordre, à la hauteur que le
gabarit déclare ; le haut d'une baie s'allume avec son bas, jamais à moitié ;
un morceau dense de l'ouest pèse moins de dix mégaoctets de façades (10,88
avant). Dans `plafond.js` : une cabane sur un toit monte avec le toit, de ce
que le gabarit déclare et vérifié sur le monde ; rien d'autre ne bouge, la
passe est idempotente, la position de l'enfant suit, et la chaîne entière
(relever, puis ménager) la laisse sur le toit neuf. Dans `sauvegarde.js` : une
cabane reçue du nuage revient sur le toit neuf, et le nuage a été mis à l'abri
avant. Et les deux empreintes du relief de `plafond.js`, inchangées. Captures
avant et après dans `docs/monde-fidele/captures/v301-*.png`.

## v300 — Le couloir Paris–Lille : l'autoroute A1

**Pourquoi.** Troisième livraison du programme « monde fidèle » (kit de Max,
septembre 2026) : « la voiture roule de la rue de Rivoli à la Grand-Place de
Lille sans s'arrêter à une frontière de morceau, un pont se traverse dessus
et dessous ». Entre les deux villes il n'y avait rien qu'un relief lissé
(v297) : aucune route, aucun raccord, et une voiture qui sortait de Paris
tombait dans les champs. Mesuré sur l'axe direct : 810 colonnes hors villes,
47 tronçons de dix blocs sur 81 à plus de 6 % de pente, 37 colonnes sous
l'eau.

**Ce que ça change.** Une autoroute A1 relie la porte nord de Paris (la gare
du Nord) à l'entrée sud-ouest de Lille (la rue de Paris) : 869 blocs, deux
voies par sens, un terre-plein, des accotements, en remblai ou en déblai au
profil lissé (pente au plus 6 %, les deux bouts collés au sol des villes,
jamais sous le niveau de l'eau), avec un pont sur le lac de mi-parcours — on
roule dessus, on passe dessous. Le tracé se cherche sous node CONTRE TOUS LES
OBSTACLES : l'axe direct passait dans la marge de Roissy, la maison témoin de
`plafond.js` est de l'autre côté, et mon premier point de passage traversait
le Pôle Nord — sa banquise touche presque le disque de Lille. Deux points de
passage tiennent tout : 35 blocs de la maison (l'emprise et le talus en
prennent 21 au plus), 9 au-delà de la marge de Roissy, 32 de la banquise,
aucune voie ferrée croisée, deux coudes de 15° et 29°.
Vingt voitures y roulent dans les deux sens, sur la voie de droite, et
entrent dans chaque ville par une avenue de raccord ; la carte du monde
dessine la chaussée et son tablier. Le sol continu recouvre les talus, la
chaussée est de l'asphalte, les rubans blancs du marquage vivent dans le
mailleur, et le paysage lointain dessine la tranchée de la route au lieu du
relief qu'elle creuse. **Le relief ne bouge pas** : la route est un ouvrage
écrit en blocs, comme la voie ferrée, et les deux empreintes de `plafond.js`
sont intactes.

Les captures ont trouvé ce qu'aucun témoin ne gardait, et les trois se
corrigent ici : une dalle d'herbe flottait au-dessus de la route partout où
le relief la dominait de sept blocs (le déblai n'en dégageait que six) ; la
nappe d'un lac restait en l'air sur un talus creusé sous elle ; et la berge
d'un pont, décidé sur l'axe, montait au-dessus du tablier trois blocs plus
loin et arrêtait la voiture. Le déblai dégage jusqu'au relief, un talus sous
un lac est sous l'eau, une culée se creuse.

**Ce qui le prouve.** Neuf témoins neufs. Dans `carteMonde.js` : le profil
tient sa pente (≤ 0,07), ses bouts et ses bornes de remblai (≤ 4) et de
déblai (≤ 9) ; l'emprise ne touche ni ville, ni aérodrome, ni sanctuaire à
moins de trente blocs de l'axe (l'emprise et le talus en font 21,4, calculé) ;
le sommet est de l'asphalte et le contact suit la chaussée (95 % au moins,
écart < 0,6) ; le pont a des colonnes libres sous son tablier ; un convoi
porte `route: 'A1'` et au moins dix modèles. Dans `plafond.js` : on roule
quatre-vingts blocs sur la chaussée sans marche, sans chute, sans blocage ;
le premier pont se franchit sur son tablier ; sous le tablier on reste
dessous ; **rien ne flotte au-dessus des 6 269 colonnes du couloir** — ni
relief, ni nappe, ni repère posé après les colonnes (0 en faute, contre 122
couches d'herbe, 131 nappes et un chalet avant) ; et le paysage lointain est
à la cote de la route sur 1 572 colonnes (42 sans la correction). Mesuré
sous node : 0 croisement de voie ferrée, `routeEn` à 5,8 µs près de la route
et 0,03 µs loin.

---

## v299 — Le détail de Paris a un budget, et l'iPhone ne meurt plus en vol

**Pourquoi.** Max : « le jeu continue à planter sur la version 298, il crache
au bout de quelques secondes dès qu'on se déplace. » Le journal de bord de son
iPhone (v296) a dit où et comment : en vol à l'ouest de Paris, 1 089 morceaux
chargés — l'étendue « Loin » —, 55 morceaux de façades détaillées, zéro erreur
JavaScript. iOS a tué la page pour sa mémoire. Rejoué au banc sur le site :
avec la couche HD, les tampons de la scène TRIPLENT en vingt secondes de vol
(406 → 872 Mo) pendant que le nombre de morceaux baisse ; sans HD, rien ne
bouge. Ce ne sont pas des orphelins (zéro maillage retiré de la table et
resté en scène) : ce sont les façades détaillées elles-mêmes. Un morceau des
quartiers denses de l'ouest de Paris en porte 146 000 à 156 000 sommets, ONZE
mégaoctets, contre 1,6 Mo au centre, là où la v296 avait mesuré 2,93 et réglé
« on fabrique ce qu'on montre ». Un rayon de six morceaux en fait cent
soixante-neuf : plus d'un gigaoctet. Un rayon ne borne pas des octets.

**Ce que ça change.** Le détail des façades se dépense comme un budget
(128 Mo par palier, zéro au palier bas), du plus proche au plus loin : ce qui
dépasse montre sa tuile plate, comme au-delà du rayon, et un morceau lointain
cède sa place à un plus proche quand l'enfant avance. Au centre de Paris, où
la portée 3 tenait déjà dans le budget, rien ne change. Le journal de bord
note désormais le RÉGLAGE de l'appareil (distance, file, portée HD, budget,
palier, étendue) — il a fallu déduire « Loin » de 1 089 morceaux. Et deux
plantages de suite SOUS une étendue choisie passent devant cette étendue-là,
et devant elle seule : le disjoncteur de la v296 ne pouvait rien contre un
choix, et un enfant de sept ans n'ouvre pas les Réglages. Choisir une autre
étendue rouvre la porte, et le jeu dit pourquoi (bandeau, aide des Réglages,
`?diag=1`, qui affiche aussi ce que pèsent les façades tenues).

**Ce qui le prouve.** Quatre témoins neufs, tous rouges sur l'ancien code. Le
budget, règle pure (`planDetail`, palier.js) sous node ; à l'écran, posé à
l'ouest de Paris à rr 6 · hd 2, les façades tiennent dans le budget et le
morceau sous l'enfant a le sien (l'ancien code en fabrique 250 Mo) ; la
sûreté sous choix (parent.js) ; et le compte tenu par le jeu est celui de la
scène. Mesuré en vol sur le site du plantage, rr 16 · hd 6 : façades 231 →
727 → 763 Mo avant, **124 → 97 → 127 Mo** après ; scène entière 406 → 878 Mo
avant, 300 → 240 après. Le portail complet (seize suites) est vert, moins les
dettes déclarées avec leur double mesure dans `TASKS.md`.

---

## v298 — Le ciel de Paris est nettoyé

**Pourquoi.** Max, trois captures d'iPhone au-dessus de Paris, « Bizarre »,
puis « clean les trucs bizarres » : une spirale de planches et de verre
montait dans le ciel à côté de la tour Eiffel. Le générateur ne la produit
pas (mesuré sous node sur les 94 000 colonnes du disque : le seul bois du
jeu à Paris, ce sont les planchers d'îlot et les troncs, tous à moins de dix
blocs du sol), et personne ne pouvait lire les profils des enfants. C'est le
**journal de bord de son iPhone** (v296) qui a tranché : à la session des
captures, **505 blocs posés flottaient au-dessus du sol de Paris** — 318
planches, 101 verre, 73 grès, 7 feuilles, 3 planches sombres — dans un
journal de 83 780 blocs. Des blocs du journal, donc, posés en vol.

**Ce que ça change.** Tout ce qui FLOTTE au-dessus de Paris est retiré, d'un
seul tenant : un groupe de blocs posés qui ne touche ni le sol, ni un bloc
du jeu (un toit, un trottoir, le fer de la tour, l'eau de la Seine), ni un
bloc posé au sol. Une maison, un drapeau sur un toit, un radeau, un balcon,
une cabane dans un arbre restent où ils sont ; ce qui est posé après le
26 septembre à 19 h (UTC) reste aussi, quelle que soit sa hauteur — c'est un
ménage d'un jour, pas une interdiction de bâtir en vol. Le ménage se fait
sur la tablette au premier lancement, et sur chaque document reçu du nuage,
pour qu'une tablette restée sur l'ancienne version ne rapporte pas la
spirale. Une copie du document d'avant est gardée dans le nuage, sur son
propre document, une seule fois, et seulement si le ménage avait quelque
chose à retirer. Ce qui n'est PAS changé : la tour Eiffel rouge sombre à
longue flèche des captures est le squelette voxel du jeu, seul à l'écran
quand la couche en relief est éteinte ou de loin — c'est le jeu, pas un
défaut, et sa couleur est une décision à part.

**Ce qui le prouve.** Quatre témoins neufs, rouges sur l'ancien code parce
que la règle n'existe pas — et ils le disent (`plafond.js` 45 verts et
`sauvegarde.js` 21 verts rejouées seules sur la branche ; contre
`origin/main`, les quatre rouges attendus et rien d'autre). `plafond.js` éprouve la règle
PURE sur un document fabriqué : deux blocs suspendus partent, une maison, un
drapeau sur un toit du jeu, un bloc collé au fer de la tour, un bloc posé
après la date, un trou creusé, une tour au point d'apparition, une marque
d'import et une archive restent, et repasser ne change rien.
`sauvegarde.js` éprouve le chemin de l'enfant : un document du nuage tel
qu'une vieille tablette l'écrirait perd ses blocs suspendus à la fusion et
garde sa brique au sol, et la copie d'avant existe. Mesuré aussi, parce
qu'une fusion se paie toutes les quarante-cinq secondes : sur un journal de
quatre-vingt mille blocs hors de Paris, 50 ms (la migration de carte déjà en
place en coûte 65) ; sur quarante-quatre mille blocs de maisons dans Paris,
100 ms.

---

## v297 — Le sol continu : la campagne n'est plus en marches

**Pourquoi.** Le cahier de Max (kit « monde fidèle », septembre 2026) ouvre
sur le terrain : « remplace le terrain visible en blocs par des surfaces
continues ; fais partager la même géométrie au rendu, aux collisions et à la
navigation ; supprime marches et sauts ; un shader qui masque les blocs sans
corriger la physique ne répond pas à la demande. » Mesuré avant d'y toucher
(`docs/monde-fidele/etat-initial.md`) : sur l'axe Paris–Lille, 98 marches
d'un bloc sur 810 colonnes, une tous les huit pas. Et un enfant à pied ne
saute pas tout seul : devant la première marche, il s'arrête. Sur une pente
de huit marches relevée sur cet axe, le voxel d'avant le laisse faire **dix
blocs en trente secondes, 452 images sur 521 le pied contre un bloc**.

**Ce que ça change.** Hors des villes, hors des blocs posés, hors des
falaises, le sol n'est plus une suite de cubes : une surface passe par le
sommet de chaque colonne, en son centre, et c'est elle que l'on voit, que
l'on foule, et sur laquelle marchent les passants et les bêtes. Sur la même
pente : **73,7 blocs à pied, zéro image bloquée, zéro marche, jamais les
pieds sous la surface ni en l'air** ; au volant, 5 marches et 4 chutes
deviennent 0 et 1 (le bord d'une falaise, qui reste un bord). Les villes, les
monuments, les ouvrages, les arbres et tout ce que les enfants ont bâti
restent en cubes, exactement — un bloc posé sur l'herbe rend sa colonne au
voxel, retiré, elle redevient continue. **Le sol n'a pas bougé** : la surface
passe là où l'enfant marchait déjà, les deux empreintes de `plafond.js` sont
identiques, aucune migration. Une falaise reste une falaise (au-delà d'un
bloc d'écart on garde le cube), et le palier bas a le même sol que les
autres. Captures avant/après aux mêmes points de vue :
`docs/monde-fidele/captures/avant-campagne-a1*.png` et `v297-campagne-a1*.png`.

**Ce qui le prouve.** Quatorze témoins neufs dans `plafond.js` (rejouée seule) :
la surface existe hors des villes et tait le cube qu'elle remplace (zéro face
voxel de trop) ; deux morceaux cousent leurs cotes à l'identique ; le contact
lit la même triangulation que le maillage (exact au centre des colonnes,
moyenne à mi-arête, 196/196) ; un bloc posé rend sa colonne au voxel et la
cicatrice guérit ; en ville rien ne change ; `?solcontinu=0` rejoue le voxel
d'avant jusque dans le worker ; le coût est borné (+1,2 ms par morceau de
campagne, médiane de neuf) ; et en jouant, l'A/B sur la même page — voxel
puis surface, même pente, même cap — plus une vache posée sur la pente qui
se tient sur la même surface, et le palier bas qui la dessine aussi. Les deux
empreintes du relief, inchangées, sont la preuve de l'invariant 1. **Et le
portail complet a attrapé deux choses que la sonde n'avait pas vues.** « Une
voiture roule dans la nature au lieu de buter sur une marche » (`monte.js`)
est tombé rouge — bloquée à 13,4 blocs sur une pente d'un bloc par bloc : le
premier jet ne taisait que le SOMMET d'une colonne couverte, et le nez d'une
voiture de 2,26 blocs est deux colonnes devant son centre, où le cube sous
le sommet restait solide sous la surface. Et « quand la rame arrive, on
propose de monter à bord » : l'enfant posé sur un tracé de train à neuf
blocs sous une colline — un tunnel — était REMONTÉ sur l'herbe par le
contact. Ce que la surface tait, et où elle accroche, est désormais une
BANDE de deux cubes sous elle, ni plus ni moins, et le franchissement d'une
marche compte « un bloc » depuis le niveau VOXEL sous la voiture, pas depuis
la cote de la surface qui la porte : un tunnel garde son plancher et son
enfant (« Monter à bord » à 7,3 s, jamais en vingt secondes avant), et la
voiture regrimpe — 90 et 101 blocs sur le couloir de (−600, −520) contre
13,4, franchissement désarmé 13,4 des deux côtés. Deux témoins purs de
`plafond.js` le gardent (une pente à deux marches, un vide sous une colonne
naturelle).

---

## v296 — Le journal de bord de l'appareil, et Paris ne pèse plus un gigaoctet

**Pourquoi.** Max : « un iPad d'ancienne génération, six ans peut-être, se
connecte, ça ne lague pas trop, et au bout de vingt secondes de jeu, quand je
recharge complètement, il plante. Il faudrait collecter des logs pour
comprendre les bugs, et déjà chercher la cause. » C'était en se promenant à
Paris. Puis, la v296 en cours de validation : « le jeu plante aussi sur mon
téléphone à moi, sur la version actuelle » — un iPhone récent, donc. Un
plantage sur iOS ne laisse rien : Safari tue la page sans un mot, quel que
soit l'appareil, et personne n'était devant avec un câble. Deux causes,
mesurées, et la première ne dépend pas de l'âge de l'appareil.

- **Paris pesait un gigaoctet.** Mesuré au banc, disque rempli au centre de
  Paris, au réglage que reçoit un appareil jamais classé (rr 12 · hd 3) : la
  scène tenait **1 171 Mo de tampons de géométrie**, 1 272 Mo de tas
  JavaScript — contre 98 Mo et 203 Mo au palier bas. Un morceau HD de Paris
  pèse 2,93 Mo, dont 1,6 Mo de façades détaillées, contre 0,16 Mo sans HD ;
  et `world.hd` les faisait FABRIQUER pour tout le disque de la ville quand
  `RAYON_HD` n'en MONTRE que quarante-neuf — la dette déclarée en v291. Un
  iPad de trois gigaoctets meurt bien avant le gigaoctet ; les vingt secondes
  sont le temps que les morceaux arrivent.
- **Et il ne pouvait pas s'en sortir seul.** Le palier de l'appareil ne se
  range qu'après trente secondes de jeu (v284) : un appareil qui meurt à
  vingt secondes n'est JAMAIS classé, et chaque relance repart au réglage
  « moyen » qui vient de le tuer. Une boucle sans issue — exactement ce que
  la v291 interdit à tout réglage automatique.

**Ce que ça change.**

- **On fabrique ce qu'on montre.** Les façades détaillées de Paris ne sont
  demandées au mailleur qu'à portée de `RAYON_HD` plus un morceau de marge,
  et elles sont rendues à la carte graphique deux morceaux plus loin. Le sol
  HD et les faces plates restent partout : le loin ne change pas d'un pixel.
- **Le jeu tient un journal de bord** (`src/journal.js`) : la fiche de
  l'appareil, un relevé toutes les cinq secondes (où l'enfant est, la
  cadence, la pire image, ce que la page tient — morceaux, façades HD,
  géométries, tas), les événements et les erreurs, écrits dans le stockage
  de la tablette toutes les deux secondes. Une session qui n'a pas dit au
  revoir est un plantage présumé : au lancement suivant, son journal part au
  nuage avec la mention `plantage` ; une session qui se ferme part aussi.
- **Deux plantages de suite, et le jeu s'allège tout seul** : palier bas par
  sûreté, rangé, que la mesure suivante n'écrase pas, et que seule une
  étendue choisie dans les Réglages passe. Le jeu le dit à l'enfant (« il
  passe en mode léger — Réglages → Étendue pour changer »), et l'aide des
  Réglages le répète.
- **L'espace parent montre le journal de bord** : les trente dernières
  sessions, plantage présumé en rouge, avec le dernier relevé et le document
  complet replié, prêt à être copié.
- **Et le journal compte les blocs suspendus.** Max a dit que la structure de
  rondins vue dans le ciel de Paris (v295) n'est pas une construction des
  enfants ; le relief d'avant ne l'explique pas non plus (huit blocs au plus).
  Au démarrage d'une partie, le journal compte les blocs posés qui flottent à
  plus de six blocs au-dessus du sol d'une ville — combien, lesquels, où — et
  l'espace parent l'affiche. C'est l'instrument qui dira si ce sont des blocs
  écrits ou un rendu de travers, avant toute hypothèse de plus.

**Ce qui le prouve.** Cinq témoins neufs dans `parent.js` (la règle pure du
bilan et de la sûreté, le trajet d'une tablette morte sans au revoir qui
remonte son plantage et passe en palier bas, la session qui dit au revoir et
remet le compteur à zéro, l'espace parent qui montre le plantage) et trois
dans `parishd.js` (aucun morceau au-delà du rayon HD plus un ne porte de
façades détaillées ; en s'éloignant, les façades quittées sont rendues et
celles d'arrivée fabriquées ; le loin n'a plus de façades fabriquées). La
sonde `sonde-memoire-paris.cjs` mesure la cause en octets, palier par
palier, en ordre alterné, deux relevés par bras :

| réglage | tampons avant | tampons après | tas avant | tas après |
| --- | --- | --- | --- | --- |
| moyen (rr 12 · hd 3) | 1 171 Mo | **352 · 352 Mo** | 1 272 Mo | 452 · 454 Mo |
| bas (rr 8 · hd 0) | 98 Mo | 98 · 98 Mo | 203 Mo | 211 · 202 Mo |

Trois fois moins au réglage d'un appareil jamais classé, et rien ne change au
palier bas — ce qu'un témoin garde (« sans HD, les tampons sont ceux
d'avant »). Ce qui reste à voir sur le vrai iPad est déclaré dans `TASKS.md`.

## v295 — La tour Eiffel ne laisse plus flotter de cubes

**Pourquoi.** Max, capture d'iPad prise au centre de Paris : « Ya des trucs
bizarres dans Paris ». Deux choses sur l'image, et une seule vient du jeu.
Mesuré à la sonde des monuments en relief (`tests/sonde-monuments-hd.cjs`),
la tour Eiffel gardait **seize cellules de voxel que son modèle ne couvre
pas** — et le mailleur les laisse volontairement en cubes (règle de la
v292 : ce que le modèle ne dessine pas reste honnête et solide). Douze
d'entre elles étaient l'arche entre les jambes, écrite `P1 − 4 − creux` :
une arche À L'ENVERS, un ventre pendu qui descend au milieu et finit aux
quatre coins (±6, 12, ±6), à deux blocs de tout montant. Ce sont les cubes
noirs qu'on voyait flotter à côté de la tour depuis les Invalides, sur
`origin/main` comme sur la branche, depuis la v292. Les quatre autres
étaient une diagonale posée dans la travée du sol, que la vraie tour n'a
pas et que le modèle ne dessine pas non plus.

L'autre chose sur l'image — une grande structure de rondins et de laine
bleue, dans le ciel, au-dessus des toits — ne sort d'aucun bâtisseur :
balayé sous node sur les 94 000 colonnes du disque de Paris, le générateur
ne pose ni rondin, ni planche sombre, ni laine bleue en l'air ; le nom sous
le réticule (« Cheminée de pierre ») est celui du bloc EN MAIN, un meuble ;
et l'enfant est en selle, donc en vol. Tout désigne une construction des
enfants, et **on ne touche pas aux blocs des enfants** (invariant 1). La
copie de sauvegarde du nuage, qui l'aurait confirmé, n'a pas pu être lue
depuis cette session ; c'est déclaré dans `TASKS.md`, et c'est à Max de
dire s'il veut qu'on la retire.

**Ce que ça change.** La tour Eiffel n'a plus un cube en trop : son arche
monte au milieu et naît au pied des jambes, comme celle du modèle et comme
la vraie, et la baie entre les jambes est ouverte — on passe dessous sans
qu'une diagonale la barre. De loin, la silhouette en voxel suit la même
courbe.

**Ce qui le prouve.** Un témoin neuf dans `parishd.js` compte les cellules
de la tour hors du modèle : seize sur l'ancien code, zéro ici, barre à huit.
La sonde des monuments rend « cubes qui dépassent 0 = 0,0 % » pour la tour
(2,5 % avant), et les deux empreintes de `plafond.js` ne bougent pas : un
bâtisseur de monument n'écrit pas le relief. Captures prises des deux côtés
depuis les Invalides et le Champ-de-Mars.

## v294 — Les rues de Paris s'élargissent, et les ponts sortent de l'eau

**Pourquoi.** Max : « les rues de Paris sont trop étroites, élargis-les ». La
v293 l'avait mesuré sous les huit circuits de voitures — donc sous les
avenues, les rues les plus larges de la ville — et déclaré comme dette.
Mesuré cette fois sur TOUT le disque, 94 000 colonnes, la plus courte
traversée de chaussée sur douze directions : **la chaussée d'une rue de
quartier faisait 2,0 blocs pour une voiture de 2,26** (médiane 2,5 sur la
ville, Montmartre à 2,0 partout), le trottoir 0,55 bloc — un passant n'y
tient pas, un réverbère non plus —, les raccords d'avenue 3,1 blocs là où un
convoi croise l'enfant de face, l'anneau des places rondes UN bloc pour une
voiture qu'on y fait rouler, et la voie sur berge 2,1. L'enfant au volant
frottait les deux trottoirs.

Et en relisant `solParis` pour élargir les ponts : **les neuf ponts de Paris
étaient au fond de la Seine.** Le plan rendait bien du pavé sur le tablier,
mais `world.js` l'écrivait à la cote du terrain — le lit. Mesuré sous node :
terrain 28, eau à 30, le pavé du pont à 28. On traversait le fleuve à la nage.
C'est le piège de la Tamise (v208), que Paris n'avait jamais reçu.

**Ce que ça change.** Trois largeurs, et chacune est un résultat : une rue à
sens unique fait **3,6 blocs** de chaussée (la voiture au milieu, 0,67 de
chaque côté), une ruelle du Marais, du Quartier latin, de Montmartre ou de
Belleville **3,0**, un boulevard de Monceau, de l'Étoile ou de Passy **5,2** —
deux voitures côte à côte. Aucune avenue ne descend sous 5,2 : Rivoli fait
7,5, les Champs-Élysées 9 colonnes, un boulevard 6,1. Le trottoir passe à
1,45 bloc (0,95 dans les ruelles), deux sur les avenues. L'anneau des places
rondes fait trois blocs, la rue qui fait le tour d'un monument quatre, la voie
sur berge 4,1, et un pont sept blocs avec une chaussée au milieu — **posé
au-dessus de l'eau, à la cote de la ville, de plain-pied avec la voie sur
berge : on traverse la Seine en voiture.** Le pas des îlots monte de deux fois
ce que la façade recule, si bien que l'îlot garde sa largeur au dixième :
moins de rues, plus larges, pas un îlot de perdu (la méthode de la v271). Le
sol change, le relief non.

Mesuré sur le plan, des deux côtés, à douze blocs du bord du disque :

| | avant | après |
| --- | --- | --- |
| chaussée, toute la ville : 10ᵉ centile · médiane | 2 · 2,5 | 3,5 · 4,5 |
| rues de quartier au nord du centre : médiane · part sous 3 blocs | 2 · 56 % | 4 · 19 % |
| avenues sous les circuits : 10ᵉ centile · points où deux voitures tiennent | 3 · 65 % | 5 · 92 % |
| tablier des ponts, au-dessus d'une eau à 30 | 28 | 34 |
| colonnes de lot · de trottoir (part du disque) | 35,9 % · 17,5 % | 23,2 % · 24,8 % |

La table candidate (rue à sens unique 3,2 · 3,6 · 4,0) rendait 24,0 · 23,2 ·
22,0 % de lot : on prend 3,6, la plus petite qui laisse plus d'un demi-bloc
de chaque côté de la voiture.

Et au volant, sur le même trajet que la v293 (`tests/sonde-traversee-paris.cjs`,
douze secondes de temps de jeu sur le meilleur circuit) : **les 88 refus du
crochet d'obstacle qui ne venaient pas de la circulation — mobilier, piéton,
eau — tombent à ZÉRO** ; il en reste 110, tous de la circulation, parce que
la sonde suit le tracé du convoi et roule derrière lui. 23 blocs parcourus au
lieu de 19,8. La voiture n'avance plus en frottant : elle attend celle de
devant, ce qui est une autre affaire (`cederLePassage`, v244).

**Ce qui le prouve.** Trois témoins neufs dans `carteMonde.js`, tous trois
lisant le MONDE et non le plan, rouges sur `origin/main` :

- « une rue de quartier de Paris est plus large que la voiture, et pas
  seulement au milieu » — fenêtre de soixante blocs au nord du centre, médiane
  et part sous trois blocs ;
- « sur les avenues où roulent les convois, deux voitures tiennent côte à
  côte » — largeur perpendiculaire à la marche sous les huit circuits, la
  barre calculée depuis la demi-largeur que `vehicules.js` publie ;
- « les ponts de Paris ont leur tablier au-dessus de la Seine, à la cote de
  la ville » — neuf ponts trouvés par le plan, chaque colonne lue dans le
  monde, et `coteRoulable` d'accord avec le sommet de la colonne.

Les barres sont des milieux entre les deux régimes, mesurés des deux côtés.
Portail : dix suites ; trois rouges étaient des témoins qui portaient une
dimension de ville en dur (le rebord du disque compté comme un pont, le
morceau du Marais à cheval sur Haussmann, `bati > 700`), repointés et rejoués
verts ; « on ne marche pas dans une rue vide » est un héritage de suite,
rejoué vert seul des deux côtés ; les deux autres sont des dettes déjà
mesurées (`TASKS.md`). Le témoin de la v293 (« les circuits roulent sur la chaussée DANS LE MONDE »)
et les deux empreintes de `plafond.js` gardent le reste : le relief n'a pas
bougé d'un bloc. Et ce que la livraison laisse, déclaré dans `TASKS.md` : les
arcs de raccord entre deux avenues coupent encore le coin d'un trottoir — le
triangle de la Porte Maillot n'a que vingt-quatre points, dont quatre hors
chaussée.

---

## v293 — Le cœur de Paris rendu à Paris

**Pourquoi.** Max veut pouvoir marcher dans des rues crédibles, monter dans une
voiture et rouler dans la ville sans couture. Mesuré pour la première fois d'un
bout à l'autre : **deux des huit circuits de voitures de Paris ne roulaient sur
la chaussée que sur 47 % et 65 % de leur longueur.** Le reste du temps, ils
traversaient les murs d'un village.

Ce village, c'est « Caserne & Commissariat » — une caserne de pompiers et un
commissariat, bâtis par le bâtisseur générique d'avant Paris, posés au bloc près
sur l'ancre de la capitale. Emprise : quatre-vingt-treize blocs de côté.
`buildVille` y écrit 3 241 colonnes, dont **1 547 sur la chaussée du plan** et
834 sur son trottoir : trois quarts de son emprise tombent sur la trame des
avenues. Et le plan, lui, déclarait ces circuits à 100 % — c'est le piège des
ormes du Mall (v205) et des feux de Paris (v274), à l'échelle d'un village : un
repère se pose APRÈS les colonnes et pave la rue que `solParis` promettait.

**Ce que ça change.** La caserne et le commissariat déménagent en proche
banlieue, à huit kilomètres et demi à l'ouest et neuf au sud de Notre-Dame — on
y va toujours par la carte, et on peut maintenant y aller EN VOITURE. Le cœur
de Paris redevient Paris : les avenues se rejoignent, et deux circuits de plus
roulent vraiment dans la rue.

**Ce qui le prouve.**

- **Un témoin neuf, et c'est son absence qui avait laissé passer la chose :**
  « les circuits de Paris roulent sur la chaussée **DANS LE MONDE**, pas
  seulement dans le plan ». Mesuré sur `origin/main` : pire circuit **47 %**,
  quand le plan annonce 100 %. Ici : **88 %**, et 94,9 % sur l'ensemble des
  huit. La barre est à 80 % — elle sépare les deux régimes avec de la marge des
  deux côtés (65 → 80 → 88).
- **L'emplacement se MESURE** (v223). Une sonde a balayé l'anneau autour de
  Paris avec les cinq promesses des aérodromes : au sec (0 colonne d'eau sur
  2 209), à douze blocs au moins de toute ville, de tout aérodrome et de toute
  voie ferrée, à cent cinquante blocs de ce que les enfants ont bâti, et le plus
  plat possible. Le site retenu a **sept blocs d'écart de relief, contre onze
  sur son ancien site** au cœur de Paris : il y est mieux posé qu'avant.
- **L'adresse est en kilomètres, pas en blocs** : la caserne suit Paris à la
  prochaine remise à l'échelle, et c'était toute la raison d'être de l'ancienne
  ligne. Le témoin qui exigeait « au centre de Paris » exige désormais « à son
  écart de Paris ».
- Et le relief ne bouge pas : `VILLE` n'entre pas dans `terrainHeight`, donc les
  deux empreintes de `plafond.js` sont intactes et l'invariant 1 tient sans
  qu'on ait rien à déclarer.

Captures de la même caméra, à la même heure, des deux côtés : la cour de terre
battue et la halle rouge ont disparu du premier arrondissement.

Et le portail a trouvé un second témoin qui écrivait une adresse en blocs :
`metro.js` sondait l'anneau du village à `{ x: −240, z: 200 }`, l'ancien cœur de
Paris. Il demande maintenant l'adresse au module — tunnel 180 points sur 180,
quais 12 sur 12.

Portail complet (seize suites, depuis zéro) : cinq rouges, tous classés — un
corrigé ici (`metro.js`), un vert rejoué seul (`reseau.js`), trois dettes déjà
mesurées des deux côtés (`maj.js`, `manhattan.js`, les deux tirages de
`monte.js`). Détail dans `TASKS.md`.

## v292 — Les huit monuments de Paris, en relief et sans mur invisible

**Pourquoi.** Max : « les monuments reconnaissables ne suffisent pas ». Un bloc
de Paris fait quarante-deux mètres au sol : de près, la tour Eiffel est un
échafaudage de cubes, l'Arc de Triomphe une caisse percée, et la coupole du
Panthéon un escalier. La couche de relief de la v287 ne lisait que les façades
ordinaires — les monuments, eux, étaient restés en voxel.

**Ce que ça change.** Huit monuments ont désormais un modèle d'auteur que la
couche HD dessine quand l'enfant s'en approche : la tour Eiffel et son treillis
ajouré, l'Arc de Triomphe et ses deux passages voûtés, la pyramide du Louvre et
sa résille de verre, Notre-Dame avec sa rosace et ses arcs-boutants, le
Sacré-Cœur, le Panthéon et sa couronne de colonnes, les Invalides et leur dôme
d'or, l'Opéra Garnier. De loin, on voit exactement la silhouette d'avant : le
voxel reste le squelette, donc les collisions, les sauvegardes et le lointain ne
changent pas d'un octet. **Et l'on passe enfin SOUS la tour Eiffel** : une
ceinture de fer pleine au niveau de la rue en fermait le dessous.

Un enfant qui pose un bloc dans l'emprise d'un monument le rend éditable en
cubes, sur toute son emprise : ce qu'il construit passe toujours avant ce qu'on
lui montre.

**Ce qui le prouve.** Neuf témoins neufs dans `parishd.js`, et deux sondes qui
mesurent ce qu'aucun d'eux ne peut raconter.

- **Aucun mur invisible, et c'est une MESURE qui a imposé la règle.** Le premier
  jet masquait tout ce que le bâtisseur du voxel écrit ; mesuré à la sonde, cela
  laissait **325 cellules exposées sans rien devant elles aux Invalides, 128 à
  Notre-Dame** — dont les soixante-dix-neuf du parvis. L'enfant se cogne à rien,
  et une dalle disparaît sous ses pieds. On ne masque donc que ce que le modèle
  COUVRE : zéro mur invisible sur les huit, mesuré, et le prix déclaré est
  l'inverse — des cubes qui dépassent (Eiffel 64, Notre-Dame 58, zéro aux
  Invalides et au Louvre), honnêtes, qui arrêtent ce qu'ils ont l'air d'arrêter.
- **Les Invalides étaient à côté de leur voxel.** Le premier jet y posait la
  coque générique au milieu du repère : 25 % du modèle tombait dans le vide, dont
  7 097 points à hauteur d'enfant. Le voxel n'est pas centré — une longue façade
  au nord, l'église du Dôme au sud — et le modèle suit désormais ses cotes :
  0,0 %.
- **Le coût est mesuré, en ordre alterné.** +12,7 ms par morceau de monument au
  banc (1,36×), et zéro sur un morceau de Paris qui n'en porte pas. Le palier de
  la v284 lit une MÉDIANE sur des centaines de morceaux : huit d'entre eux ne la
  déplacent pas.
- Et le reste : le modèle ne pose aucun bloc (identité à l'octet près), il est
  découpé dans chacun des morceaux qu'il touche, le lointain garde son voxel, une
  édition désarme l'emprise entière, et un journal installé d'un bloc — ce que le
  worker de maillage fait à chaque resynchronisation — refait l'index.
- **Et le portail a trouvé un témoin qui cherchait son terrain.** « Chaque
  quartier a son registre » retenait un morceau de NOTRE-DAME pour juger le
  Marais, parce que le modèle du monument y ajoute deux mille sommets de pierre.
  Il écarte désormais tout morceau qui porte un monument.

Portail complet rejoué depuis zéro après correction : **quatorze suites vertes
sur seize**. Les deux restantes sont les dettes déjà mesurées des deux côtés —
le délai de `manhattan.js` et le gel de `monte.js` à l'arrivée dans une ville
(39,1 %, dans l'étendue 34,3–44,7 % relevée sur `origin/main` comme ici).
Détail dans `TASKS.md`.

## v291 — Le jeu ne se donne plus un réglage que personne n'a jamais essayé

**Pourquoi.** Capture d'iPhone de Max sur la production : « A problem repeatedly
occurred on https://minecraft-fam.vercel.app/ », et trois mots — « Game break
after 3sec ». Le jeu mort, pour Marlon et pour Alice, sur l'adresse de tous les
jours.

La cause est ma v290, et elle ne se lit pas dans ce qu'elle a écrit mais dans ce
qu'elle a DÉVERROUILLÉ. Le jeu se classe depuis la v284 en trois paliers ; celui
du haut — voir plus loin, charger plus de monde d'avance — était
**inatteignable**, parce que sa barre comparait la période de rafraîchissement de
l'écran à un temps de travail. Personne ne l'avait donc jamais reçu : ni un
appareil de la maison, ni une suite du banc. La v290 a rendu cette mesure juste,
et par là a livré cette ligne pour la première fois, à l'iPhone de Max. Son
appareil est passé du palier BAS au palier HAUT en une version — de 289 morceaux
de monde chargés à 1 089, et la couche de relief de Paris allumée d'un coup.

Et le contenu de ce palier n'avait jamais été mesuré non plus : sa profondeur de
file valait seize, le chiffre que la v269 avait mesuré comme impraticable sur
l'iPad — cadence 9,1 contre 18,3, pire image 383 ms contre 150 — et **retiré**.
La v284 l'avait remis en écrivant « sur un appareil qui a la réserve, il n'y a
pas de raison de le lui refuser » : c'est une phrase, et rien ne l'a mesurée.

**Ce que ça change.** Le jeu remarche, sans que personne n'ait à toucher un
réglage : un appareil que la mesure classe « Loin » retombe sur exactement ce
qu'il faisait en v289. Un réglage que le jeu n'a jamais fait tourner nulle part
n'est plus donné d'office — il est PROPOSÉ. Dans ⚙️ Réglages, la ligne 🔭 Étendue
des graphismes dit désormais « ta tablette pourrait aller jusqu'à Loin, que le
jeu ne donne pas tout seul — choisis-le si tu le veux » : la mesure propose, Max
décide, ce qui est sa décision de la v290. « Loin » garde sa distance d'affichage
et son relief, et reprend la profondeur de file et la vitesse d'avion que la v269
avait mesurées. Et la porte de secours de la panne — ouvrir le jeu avec
`?palier=moyen` — ne range plus un classement faux pour le lancement suivant.

**Et une chose qu'il faut dire, parce qu'elle est probablement plus grosse que la
panne.** En cherchant à quoi la correction rend son iPhone, j'ai calculé ce que
l'ancienne règle rendait sur un appareil à 59 images par seconde : le palier BAS,
où la couche de relief de Paris est **éteinte**. L'iPad l'affichait noir sur blanc
depuis la v284. Les v287, v288 et v289 — le relief, les quartiers, les toits à la
Mansart — ont donc toutes trois été livrées à des appareils qui ne pouvaient pas
les afficher, et ce que Max validait était mes captures de banc, jamais son écran.
La v291 rallume ce relief à la portée moyenne. Cela reste **à confirmer chez lui**,
en une capture : `?diag=1` au centre de Paris doit dire `hd 3`.

**Ce qui le prouve.** Trois témoins de `maj.js`, les trois vérifiés ROUGES sur
`origin/main` : un verdict « Loin » écrit dans le stockage de l'appareil, la page
rechargée, et c'est la PROFONDEUR DE FILE qu'on lit — le banc force toujours la
distance d'affichage dans son adresse, elle ne peut donc rien prouver ici ; l'un
rend « Loin / file 16 » sur l'ancien code et « sans palier / file 8 » ici ; le
deuxième que « Loin » choisi à la main donne bien la file et la vitesse mesurées ;
le troisième que `?palier=` compte comme une configuration imposée. La portée du
relief, elle, a été mesurée au banc au centre de Paris, quatre bras en ordre
alterné : 4,93 et 4,95 millions de triangles à la portée 6 contre 1,87 et 1,93 à
la portée 3, soit 2,6 fois, à nombre d'appels de dessin inchangé.

Le portail a rendu cinq rouges, et le tri a pris dix secondes : **deux étaient de
moi** — un titre de journal à sept mots pour une barre à six, et un témoin jumeau
que j'avais oublié de repointer sur les chiffres neufs, si bien que le portail
accusait une correction juste. Les **trois autres sont des dettes déjà déclarées
avec leur double mesure** (le fond de carte de `maj.js`, rouge sur cinq portails
d'affilée ; le délai de `manhattan.js:282`, démonté trois fois sur trois des deux
côtés ; le gel à l'arrivée dans une ville, mesuré PIRE sur `origin/main`). Et ce
qui les écarte n'est pas un rejeu mais une preuve structurelle : tout ce que cette
version change n'est lu que sous un palier non nul, et aucune page du banc sauf
une n'en a.

Et un non-résultat, déclaré parce qu'il compte : **la sonde n'a pas pu mesurer ce
que la distance d'affichage coûte en octets.** Elle a rendu 348 morceaux chargés
sur 625 attendus, et 384 sur 1 089 — le banc rend une image par seconde en
logiciel et ne remplit jamais son disque. Elle mesurait le banc, pas la
configuration, et c'est elle qui l'a dit : 384 ≈ 348 quand les cibles valent 625
et 1 089. Cette mesure-là se fait sur la tablette, avec `?diag=1`, et elle est
déclarée dans `TASKS.md`.

## v290 — Le palier mesurait l'écran, et l'étendue devient ton choix

**Pourquoi.** Max, deux captures d'iPad avec `?diag=1` : « palier pas encore
mesuré · rr 12 · file 8 → **bas** (morceau 37,0 ms ou image 17,0 ms au-delà de
63 / 16,7) au prochain lancement ». Le palier de la v284 — celui qu'il avait
justement réclamé, « ajuster en fonction de l'appareil et sa capacité » —
s'apprêtait à **dégrader son iPad** : distance d'affichage de 12 à 8, file de 8
à 6, jets de 120 à 95 blocs par seconde. L'inverse de la demande.

La cause tient dans un nombre. Le jeu classait l'appareil sur `now - lastTime`,
l'écart entre deux images. Sur un appareil synchronisé à son écran, cet écart
**est la période de rafraîchissement** : 59 images par seconde, 17,0 ms, soit
1000/59 au dixième près. Les deux barres devenaient fausses par construction —
au-delà de 16,7 ms, c'est-à-dire tout appareil en bonne santé à 60 Hz, on partait
en `bas` ; et la barre du palier haut, 8 ms, est inatteignable sous vsync, si bien
que `haut` ne pouvait **jamais** être atteint par personne. La v284 avait pourtant
écrit la règle en toutes lettres — « une cadence plafonnée par l'écran ne dit rien
de la réserve » — et l'a enfreinte dans le fichier d'à côté, une mesure plus loin.

Et le verdict était **déjà rangé** : sa capture dit « au prochain lancement »,
donc `localStorage` était écrit. Corriger la règle sans changer la clé aurait
laissé son iPad dégradé pour de bon — une mesure ne se reprend pas.

**Ce que ça change.** Le jeu mesure désormais le **travail** d'une image — ce
qu'il fait vraiment, du premier calcul jusqu'au rendu, sans l'attente du
balayage. Les barres, elles, ne bougent pas d'un chiffre : elles décrivaient
déjà un travail (« on demande la moitié des 16,7 ms »), il manquait seulement de
le leur donner. Le verdict rangé par l'ancienne règle est oublié : tout appareil
repart de la mesure d'aujourd'hui, et un appareil non mesuré garde exactement le
comportement de la v283. Le `?diag=1` affiche les deux grandeurs côte à côte,
travail et période, pour qu'un palier surprenant se démonte sur l'appareil.

**Ce qui le prouve.** Trois témoins de `maj.js`, dont deux neufs. « Le palier se
décide sur le travail d'une image, jamais sur la période de l'écran » lit ce que
le JEU a mesuré et compare les deux grandeurs : au banc, 166,6 ms de période
contre 22,8 de travail à rr 12, 66,6 contre 9,7 à rr 2 — un facteur sept, ce qui
rend la confusion visible. « Un verdict rangé par l'ancienne règle ne dégrade
plus l'appareil » rejoue la situation exacte de l'iPad : on écrit `bas` sous
l'ancienne clé, on recharge, et l'on regarde la file que l'enfant obtient. Les
deux sont rouges sur le code de production.

Et le témoin de la v284 est corrigé pour ce qu'il ne pouvait pas voir : il
**fabriquait** ses deux nombres, donc il vérifiait que la règle sait trier des
chiffres, jamais qu'un appareil puisse les produire.

**Et la même capture paie une dette de la v284 et en ouvre une plus grosse.**
Max a mis « Graphismes avancés » : `dpr 2,00`, ombres ON, **59 images par
seconde et 84 ms de pire image**, contre 79 et 75 à `dpr 1,25` sans ombres.
2,56 fois la surface plus une passe d'ombres entière coûtent cinq
millisecondes — la v284 avait raison de refuser de le deviner, et le prix
n'existe pas sur cet appareil. Rien n'entre pour autant dans la table du
palier : ces chiffres sont relevés à la distance d'affichage d'aujourd'hui, que
le palier `haut` change aussi. Ce que la capture établit surtout, c'est que
son iPad maille **un morceau de monde en 37 ms**, soit vingt-sept par seconde
là où voler en réclame cent quarante-deux : il n'est pas en peine, il attend.
C'est déclaré dans `TASKS.md`, avec les trois mesures à faire sur l'appareil.

### Et l'étendue des graphismes devient un réglage

**Pourquoi.** Max, depuis son iPhone 18 Pro, sur la v286 : « il n'y a aucun lag,
et pour autant les graphismes ne sont pas terribles — là où tu pourrais
certainement utiliser des graphismes à haute fidélité ». Puis, une fois le défaut
du palier nommé : « **permets-moi de choisir l'étendue des graphismes as a user
si tu sais pas la calibrer toi** ». C'est une décision, et elle est juste pour
trois raisons qui ne sont pas un renoncement. Une mesure répond très bien à « que
peut faire cet appareil » et pas du tout à « qu'est-ce que je veux voir ». Un
palier se range pour le lancement suivant, donc il arrive toujours une partie
trop tard, alors qu'un choix est immédiat. Et surtout un classement peut se
tromper — il vient de le faire, sur l'appareil même de Max : un réglage qu'on
atteint est le seul recours qui ne dépende pas de la justesse de ce qu'on a
écrit, exactement comme le bouton de mise à jour forcée du badge de version.

**Ce que ça change.** Dans ⚙️ Réglages, une rangée « 🔭 Étendue des graphismes »
avec quatre choix : **Auto · Court · Normal · Loin**. `Auto` est le défaut, donc
rien ne change pour qui n'y touche pas. Le choix décide de tout ce que le palier
décidait — jusqu'où le monde se dessine, la profondeur d'avance du mailleur, la
portée de la couche HD de Paris, la vitesse des jets — et il pousse aussi le
paysage lointain d'autant (634 blocs en `Normal`, 848 en `Loin`). Ce que le
réglage change est lu **au démarrage**, parce qu'une distance d'affichage qui
respire sous les yeux de l'enfant est pire que l'attente : l'aide de la rangée
annonce donc ce qui attend, et le bandeau dit le geste — revenir au menu 🏠 et
rejouer. Le choix est rangé **sur l'appareil**, pas dans le profil : l'iPad de la
maison et l'iPhone de Max n'ont pas la même réserve, et un enfant qui change de
tablette ne doit pas emporter le réglage de l'autre. Et une étendue choisie à la
main **ne classe plus l'appareil** : le jeu mesure quand même, l'affiche dans
`?diag=1`, mais ne la range pas — une page qui tourne à `rr 16` parce qu'on a
demandé « Loin » ne dit rien de ce que l'appareil ferait à sa distance naturelle,
et ce faux verdict resterait le jour où l'on repasse en « Auto ».

**Ce qui le prouve.** Six témoins de `maj.js`, tous neufs. Sous node, la règle
pure : le choix passe devant la mesure, `auto` retombe sur la mesure, une valeur
abîmée retombe aussi, et sans l'un ni l'autre on rend le comportement d'avant au
bit près ; et une étendue choisie à la main n'est pas rangée comme une mesure.
À l'écran, le trajet de l'enfant — le témoin JOUE avant d'ouvrir les réglages,
parce qu'à l'accueil le grand panneau recouvre le bouton ⚙️ et qu'aucun doigt ne
peut l'atteindre : les quatre mots sont là dans cet ordre, « Auto » est marquée au
départ, toucher « Loin » se garde et se marque, l'aide annonce alors le prochain
lancement ET le retour au menu — **et revenir sur un choix qui ne change rien
n'annonce aucune attente**, parce qu'une aide qui promet un changement qui ne
vient pas apprend à l'enfant à ne plus la lire. Enfin le seul verdict qui
compte : on relance la page, et le jeu porte vraiment l'étendue demandée — file
de seize, jets à 160. Les six sont rouges sur le code de production.

**Et TROIS défauts ont été trouvés par le banc, pas par une relecture.** Le
témoin de la règle pure appelait `palierRetenu` **sans garde** : il jetait sur
l'ancien code et tuait la suite au premier des six, si bien qu'on ne voyait plus
rien des cinq suivants. Une puce du journal faisait **neuf mots** pour une règle
de huit. Et surtout, **le témoin du travail comparait le verdict à une médiane
relue APRÈS coup** — le verdict est figé quand le palier se range, la médiane se
recalcule quand le témoin la lit, et le jeu empile des relevés entre les deux :
les deux nombres n'étaient égaux que par chance (10,4 contre 10,4 à un portail,
12,9 contre 12,6 au suivant, sur le MÊME code). C'est « un verdict lu à l'instant
d'une transition est un coup de dé » (v273) du côté d'une ÉGALITÉ. Le témoin lit
désormais ce que le verdict DIT — sa raison nomme le travail, jamais l'image — et
la médiane reste dans le message, où elle démonte un rouge sans jamais en faire
un.

**Les trois suites rouges du portail sont mesurées et déclarées** dans
`TASKS.md`, et aucune n'est causée par cette livraison : le loader d'installation
de `maj.js` est un intermittent qui rend **un rouge et un vert de chaque côté**
(la preuve que la v269 exige), le gel à l'arrivée en ville de `monte.js` est la
dette déclarée depuis la v284 (4 250 / 42,4 alors, 3 967 / 41,7 ici) que la
couche HD de la v287 a alourdie, et les rouges de `manhattan.js` sont la famille
des 0,4 image par seconde que la v259 a mesurée — sauf celui des ombres, qui est
un défaut d'épsilon dans le témoin (`1,0000000000000002 > 1`) et ne dépend
d'aucune cadence.

---

## v289 — Les toits de Paris ont leur pente, et les trottoirs leurs bancs

**Pourquoi.** Troisième livraison du programme « Paris, puis la conduite ». La
couche HD de la v287 creusait les fenêtres et posait les balcons, mais le comble
restait un escalier de blocs de zinc : vu d'une fenêtre ou d'un toit voisin —
c'est-à-dire dès qu'on monte — Paris était une ville de marches, et le comble à
la Mansart, la chose la plus reconnaissable d'un toit parisien après ses
cheminées, n'existait pas. Et le milieu des trottoirs était vide : ni banc, ni
colonne Morris, ni corbeille, alors que la v288 avait meublé les bords.

**Ce que ça change.** Les toits de Paris sont en pente. Un brisis raide monte de
la corniche, percé d'un chien-assis à fenêtre sur une travée sur trois ; au-dessus,
le terrasson est une surface CONTINUE qui suit la trame de chaque quartier, à
plat au faîte, avec des croupes aux coins et des pyramides sur les chapeaux de
piliers. Rien n'a bougé dans les blocs : c'est un champ de hauteurs que la couche
lit sur les colonnes de toit, et de loin le comble redevient ses marches. Les
trottoirs gagnent des bancs de bois à pieds de fonte tournés vers la rue, des
colonnes Morris à affiches et dôme vert sur les places, et des corbeilles de fil
vertes entre deux potelets. Captures : `docs/paris-captures/` (v289-toits,
v289-mansart, v289-morris).

**Ce qui le prouve.** `parishd.js` gagne quatre témoins, vérifiés rouges sur la
v288 : le comble est à la Mansart (2 512 sommets de brisis raide, 2 292 de
terrasson en pente, sur vingt-cinq morceaux) ; aucune pente n'est vrillée ni ne
sort de sa colonne ; le dessus des blocs de toit part dans le loin (1 552
sommets) ; et bancs, colonnes Morris et corbeilles sont dans les tampons (120
sommets d'affiche, 672 de lattes, 832 de fil). Mesuré aussi : un morceau du
Marais coûte 97 ms à mailler en HD, contre 99 sur la v288. Et ce que la
livraison a coûté à trouver vaut d'être dit : trois remèdes par face de bloc ont
été écrits avant le champ de hauteurs, et les deux derniers ne changeaient RIEN
aux captures — c'est une sonde (`sonde-ailerons`) qui a montré que les
« ailerons » étaient le voxel lui-même lu par face, sur une trame tournée.

**Pourquoi.** Deuxième livraison du programme « Paris, puis la conduite ». La
v287 avait donné son relief à Paris, mais UN SEUL Paris : le Marais, Montmartre
et Belleville recevaient la même pierre de taille et les mêmes balcons filants
que Monceau, alors que le vieux Paris est un mur d'enduit à petites fenêtres et
volets de bois. Les arbres restaient des cubes verts empilés, les trottoirs
étaient nus — ni potelet, ni terrasse, ni plaque de rue — et le réverbère
était un poteau carré. Ce sont ces quatre choses qu'on reconnaît depuis un
trottoir de Paris, et elles manquaient.

**Ce que ça change.** Chaque quartier a son registre de façade, tiré de la MÊME
trame que le voxel : le Marais et le Quartier latin sont en enduit ocre, crème
ou gris, à baies étroites, volets à persiennes et corniche simple ; Montmartre
en enduit pastel sur trois étages ; Belleville et le faubourg Saint-Antoine en
enduit crème à garde-corps simples, sans store ; l'ouest garde sa pierre de
taille et ses balcons filants. Les arbres de Paris sont de vrais arbres de
près — un fût à huit pans, deux branches maîtresses, une couronne de feuillage
ajouré centrée sur son tronc — et redeviennent leurs blocs au loin. Les
trottoirs portent un potelet de fonte tous les deux blocs au bord du caniveau,
une terrasse de café (table ronde à pied de fonte, deux chaises cannées) devant
une devanture sur trois, une plaque de rue bleue au coin de chaque immeuble, et
trois mitres sur chaque souche de cheminée. Le réverbère est parisien — fût de
fonte effilé sur socle renflé, lanterne à pans sous un chapeau pointu — et il ne
coûte que deux appels de dessin, sa fonte étant fusionnée. Aucun bloc n'a
bougé : tout est dessiné par la couche HD ou par le mobilier, à la cote des
blocs. Captures : `docs/paris-captures/` (v288-marais, v288-champs).

**Ce qui le prouve.** `parishd.js` gagne quatre témoins, vérifiés rouges sur la
v287 : chaque quartier a son registre (au Marais 4 516 sommets d'enduit et
8 320 de volets, zéro de pierre ; à Haussmann 480 de pierre, zéro d'enduit ni de
volet — le morceau du Marais se CHERCHE, le centre du quartier étant une
place) ; les coins portent une plaque ; des potelets de fonte bordent le
trottoir ; un arbre maillé par tronc (cinq troncs, cinq fûts) et les blocs de
l'arbre passent au loin (le tampon solide perd 2 500 sommets). Le réverbère se
compte : deux maillages, mesuré dans la page. Mesuré aussi : une rue du Marais
rend 942 appels de dessin avec le réverbère fusionné, 2 410 avec le premier jet
en douze pièces. Portail complet : seize suites, sept rouges, chacun rejoué
seul des deux côtés (`TASKS.md`) — `carte.js` et `reseau.js` vertes seules,
`maj.js` et `reglages.js` sur leurs dettes déclarées à l'identique,
`monte.js` un rouge sur la branche contre deux sur `origin/main`, et le témoin
près/loin de `parishd.js`, qui mesurait l'ordre d'arrivée de la file, corrigé
(vert seul, 23 témoins).

## v287 — Paris prend du relief : la couche HD

**Pourquoi.** Décision de Max, et c'est un changement de cap pour le jeu : Grand
Tour n'est plus « Minecraft avec des immeubles de Paris », c'est un monde ouvert
où Paris doit se reconnaître depuis un trottoir, sans voir la Tour Eiffel. Or
une façade de Paris était UNE TUILE DE SEIZE PIXELS par bloc : la fenêtre, le
balcon, la corniche y étaient dessinés, et depuis la rue tout était plat — une
boîte décorée, pas un immeuble. Le voxel doit devenir le squelette du monde, et
cesser d'être le dernier mot de ce qu'on voit.

**Ce que ça change.** Dans Paris, de près, chaque façade a du relief : les baies
sont EN RETRAIT dans le mur avec leur châssis et leurs petits bois, l'appui
saille, un garde-corps de fer forgé se dresse devant chaque fenêtre, le balcon
filant de l'étage noble et du dernier étage court sur toute la façade sur ses
consoles, la corniche porte trois ressauts et ses modillons, le chaînage
d'angle alterne ses pierres, la porte cochère s'enfonce sous son encadrement, la
devanture a sa vitrine, son bandeau d'enseigne et son store de toile, et le
comble en zinc laisse sortir ses chiens-assis. La pierre, le zinc, la vitre et
le fer ont chacun leur matière — la vitre reflète le ciel, le zinc est
métallique, la pierre est mate et tachée — et les sols de la ville (dalles de
trottoir, bordure de granit, asphalte, quais, pavés des cours) sont peints à
cent vingt-huit pixels par bloc au lieu de seize. **Et la rue est une rue de
Paris** — Max, sur les premières captures : « ils n'ont pas clairement de
route », puis « des vraies routes qui ressemblent à des vraies routes
parisiennes » : la chaussée est en asphalte presque noir, le trottoir en
asphalte gris (pas en dalles de béton) et SURÉLEVÉ d'une marche, la bordure de
granit clair monte entre les deux avec son caniveau de pavés, un passage piéton
à larges bandes blanches barre chaque débouché de carrefour, la ligne d'effet
des feux le précède en travers de la chaussée — et la ligne axiale, qu'une rue
de Paris à sens unique n'a pas, ne reste qu'aux boulevards à double sens. Tout
cela est déduit de la trame du quartier, jamais posé en blocs (le sol ne bouge
pas, l'enfant marche à la cote du bloc), et absent des vieux quartiers tordus
comme dans la vraie ville. De loin, rien ne change : la
tuile plate d'avant reste le lointain, et la ligne de corniche vue du ciel est
la même. Le mobilier de rue — réverbères, feux, bancs — est désormais éclairé
par le soleil et la nuit comme le reste du monde, ses lanternes et lentilles
restant émissives. **Aucun bloc n'a bougé** : la couche HD lit les blocs, elle
n'en écrit aucun ; sauvegardes, collisions, coordonnées sont intactes. Le
palier de l'appareil décide de la portée (trois morceaux au palier moyen, six
au palier haut, rien au palier bas — l'iPad de quatre ans ne perd rien), et
`?hd=` la force ; comme les ombres, la couche se coupe d'elle-même sur un
navigateur sans carte graphique. Captures avant/après dans
`docs/paris-captures/`.

**Ce qui le prouve.** Une suite neuve, `parishd.js`, seize témoins. Sous
node, sur les tampons du mailleur : sans HD, les tampons sont ceux d'avant ; le
morceau est identique à l'octet près avec et sans la couche ; chaque face de
façade exposée reçoit son détail, ni plus ni moins (136 sur 136, comptées
indépendamment) ; les vitres sont en retrait dans l'épaisseur du mur (128 sommets
sur 128) ; hors de Paris, la couche allumée ne change rien. À l'écran : sous
l'enfant le détail est visible et la tuile cachée, à cinq morceaux l'inverse ;
avec `?hd=0` rien de HD n'est installé ; et la rue porte son marquage, sa
bordure de granit qui monte et son trottoir relevé — sans un seul sommet de
trottoir resté à plat. Mesuré : un morceau de Paris passe de 30 à 44
millisecondes dans le worker, pour 14 000 sommets de façade. Captures :
`docs/paris-captures/` (v285 et v287, même rue).

## v286 — Le loader ne cache plus un « Jouer » déjà cliquable

**Pourquoi.** Max : « après la mise à jour, sur la home le jeu lag 1 à 2 min, ça a
été le cas depuis longtemps. Après c'est ok. » C'est le symptôme que la v257 (le
loader d'installation) et la v258 (la préparation avant « Jouer ») devaient
corriger, et il revenait après les deux. Devant un symptôme qui revient après deux
corrections justes, on cesse de régler et l'on va voir ce qui s'exécute.

**Ce que ça change.** Après une mise à jour, l'enfant n'attend plus derrière le
loader une fois que le jeu l'a autorisé à jouer. La cause ne se mesurait pas, elle
s'**additionnait** : deux attentes tournaient en parallèle sur des conditions
emboîtées, et c'était la plus longue qui gardait la plus faible — quarante-cinq
secondes pour dégriser « Jouer » (corps, programmes ET fond de carte),
quatre-vingt-dix pour effacer le loader (corps ET programmes seulement). Sur
l'iPad, où Safari compile un programme de shaders en centaines de millisecondes,
le jeu dégrisait donc « Jouer » à quarante-cinq secondes et le loader continuait de
le cacher jusqu'à quatre-vingt-dix. **45 + 90 = 135 secondes, exactement la
fourchette de Max.** Le loader suit désormais la seule décision qui vaille : le jeu
est prêt, ou il a renoncé à attendre — dans les deux cas l'enfant peut appuyer.

**Ce qui le prouve.** Un témoin neuf, et l'inversion **provoquée** : au banc la
séquence entière prend trois secondes, donc elle ne se reproduit jamais toute seule
et un témoin qui attendrait serait vert des deux côtés sans rien mesurer. Les
vraies dates ont été relevées dans l'horloge de la page — corps à 2,8-3,2 s, tout
prêt à 3,3 s — et une borne de préparation posée à deux secondes tombe entre les
deux. A/B sur la même page, la correction désarmée : **zéro relevé fautif armée,
onze sur 848 millisecondes désarmée**, corps absents et vingt et un programmes sur
vingt-cinq. Et un témoin de la v257 a dû être corrigé : il exigeait que TOUT soit
là à l'instant où le loader s'efface, donc il **interdisait au jeu de rendre la
main** — c'était le mécanisme même du blocage.

Deux réglages rejouables : `?prepms=` porte la borne de préparation, `?apresmaj=1`
rejoue le chemin d'après-mise-à-jour sans en faire une — utile au banc, et utile
sur la tablette pour voir ce que l'enfant voit sans attendre une livraison.

---

## v285 — Le mode d'attrape s'en va, et les voitures roulent dans la nature

Deux sujets, deux corps de témoins. Ils partent ensemble parce qu'ils ne se
touchent pas ; ils sont documentés séparément parce qu'une livraison à deux
sujets en documente deux (leçon de la v279).

### Le mode d'attrape de créatures s'en va

**Pourquoi.** Décision de Max : « Remove the Pokémon play entirely ». Le jeu
portait un mode complet — trente-deux espèces engendrées, des balles à lancer,
un Dex à remplir, un compagnon à choisir, des duels entre joueurs — et ce n'est
plus ce que Grand Tour raconte.

**Ce que ça change.** Plus de bouton ◓, plus de Dex, plus de compagnon, plus de
duel. Le musée n'expose plus de créatures, la carte ne les promet plus dans sa
légende, et les personnages ne parlent plus d'attraper : le Professeur
Cornichon pose ses questions sans être « expert en créatures », Marlon ne
réclame plus qu'on lance une balle, et Lise — qui étudiait les martiens, une
espèce de créature — est devenue géologue de Mars. La série de quiz finie donne
toujours ses minutes de jeu et ses félicitations, sans objet à gagner. **Et ce
que Marlon et Alice ont attrapé reste dans leur profil**, intact : on retire
l'écran et les commandes, jamais les données.

**Ce qui le prouve.** Trois témoins dans la fumée, tous rouges sur le code
d'aujourd'hui. Le premier lit ce que l'enfant voit — aucun bouton, aucun
panneau, les touches Q et B sans effet, la légende sans créature — et exige en
plus que le gestionnaire ne soit plus publié, pour qu'un bouton renommé ne
puisse pas le rendre vert à tort. Le deuxième écrit puis relit les deux clés de
stockage, avec leur suffixe de profil. Le troisième mesure le bandeau que
l'enfant LIT en appuyant sur ✈️ au volant — parce que `toast`, la voix du jeu,
vivait dans le module des créatures et était appelé de quarante-neuf endroits
qui n'ont rien à voir : il a désormais son fichier, `src/bandeau.js`. Deux
témoins de plus ferment un trou que `CLAUDE.md` portait sans preuve depuis la
v157 : tout module de `src/` est dans le cache hors ligne, et tout `import`
résout — `bandeau.js` avait failli partir sans sa ligne dans `sw.js`.

Mille cent vingt et une lignes retirées.

### Une voiture roule dans la nature

**Pourquoi.** Max : « je voudrais que les voitures puissent circuler
correctement […] qu'on n'ait pas vraiment des blocs carrés qui empêchent le
véhicule de circuler. » Mesuré avant d'écrire une ligne, sur le relief pur, huit
régions de la carte : **une voiture fait onze à vingt-deux blocs** avant d'être
arrêtée, et **92 à 97 % de ce qui l'arrête est une marche d'exactement un bloc**.

**Ce que ça change.** Une voiture franchit une marche d'un bloc, comme un avion
qui roule le fait depuis la v261. Mesuré dans les mêmes huit régions : **quatre-
vingts à deux cent vingt-six blocs**, soit six à dix-sept fois plus loin. Un mur
de deux blocs reste un mur — la règle ne monte que si la carrure entière passe.

**Ce qui le prouve.** Un témoin qui **cherche** le terrain qu'il prétend
éprouver : un couloir de soixante-dix blocs dont aucune marche ne dépasse un
bloc et qui en porte au moins trois, hors de l'eau. Il monte par le bouton et
mesure des BLOCS PARCOURUS, borné, le temps pris dans le message. **Et ma
première version de ce témoin n'avait jamais eu de marche devant elle** : elle
écrivait son terrain — « plaine au nord de Paris » — où le relief monte de trois
blocs d'un coup, ce qui est un mur par construction depuis la v261. Elle rendait
quarante centimètres parcourus en quarante secondes, au volant, et ne mesurait
rien. La barre vient donc d'un A/B sur la même page, en ordre alterné : **avec
le franchissement 59 et 116 blocs, sans 0,4 et 17,9** — les deux étendues ne se
recouvrent pas, et trente blocs est la moitié du pire bras armé. Et deux chemins
écartés par la mesure, qu'on ne réessaiera pas : une tolérance de deux blocs est
identique dans sept régions sur huit, et un sol lissé conduit MOINS bien qu'une
marche franchie (120 contre 142, 164 contre 181). Le lissage du paysage est une
affaire de rendu, elle viendra à part.

---

## v284 — Le jeu se règle sur l'appareil qu'il a

**Pourquoi.** Max, capture du chasseur en vol : « est-ce possible de pousser le
niveau de réalisme ? **Le unveil est late** », puis, depuis son iPhone 18 Pro :
« tu serais capable d'ajuster en fonction de l'appareil et sa capacité ? ». Ses
propres chiffres, relevés par `?diag=1` en vol, disent la panne mieux que la
capture : **douze appels de dessin**, trente mille triangles, cinquante-neuf
images par seconde. Douze appels, c'est un monde presque vide devant lui — et ce
n'est pas que l'appareil ne suive pas, c'est que **le jeu ne lui en demande
pas**. La profondeur de file du mailleur (huit, v269), la distance d'affichage
(douze morceaux en tactile) et la vitesse des jets (120 au lieu de 160, v269)
ont toutes été réglées sur l'**iPad de quatre ans** de la famille, qui devenait
injouable. Un téléphone de 2026 paie ce compromis sans en avoir besoin.

**Ce que ça change.** Le jeu mesure lui-même, en jouant, ce que son appareil
coûte : le temps d'un morceau maillé dans le worker, le temps d'une image sur le
fil principal. Au bout de trente secondes de jeu il en déduit un palier, le
range sur l'appareil, et **la partie suivante en profite**. Sur un appareil
rapide, le paysage se dévoile plus loin (distance d'affichage de douze à seize
morceaux), le mailleur travaille avec deux fois plus d'avance (file de huit à
seize) et les jets retrouvent leurs 160 blocs par seconde. Sur un vieil iPad, le
jeu se resserre au lieu de se figer. **Et un appareil que la mesure ne sait pas
classer ne perd rien : il joue exactement la v283.**

**Ce qui le prouve.** Cinq témoins dans `maj.js`. Sans mesure, le jeu est celui
d'avant au réglage près (file 8, jets 120). Un palier demandé s'applique
vraiment — et ce qui le prouve est la FILE, pas la distance d'affichage, que
l'adresse du banc force toujours. La règle elle-même est pure et se démonte sans
navigateur : les chiffres de l'iPhone rendent « haut », ceux de l'iPad de quatre
ans « bas », l'absence de mesure « moyen ». La chaîne entière se suit sur une
vraie partie — jouer, mesurer, ranger — avec la fenêtre raccourcie par un
réglage de banc qui se rejoue. Et une page dont on a forcé la configuration ne
classe pas l'appareil : c'est ce qui met le banc entier hors de portée sans une
ligne écrite pour lui.

**Et le palier « bas » est le seul que rien n'a mesuré.** Ses chiffres — huit
morceaux de distance, six de file — sont RAISONNÉS, pas relevés : la v269 a
mesuré huit et quatre sur l'iPad de quatre ans, jamais six, et aucun appareil de
la famille n'est plus lent que celui-là. Il ne s'applique qu'à un appareil que la
mesure a trouvé en peine, où le réglage d'aujourd'hui est de toute façon pire ;
mais il se remesurera le jour où une tablette y tombera, et c'est écrit dans
`TASKS.md` plutôt que passé sous silence.

**Ce qui n'est pas dans cette version, et pourquoi.** Mon premier jet faisait
aussi passer la résolution de son téléphone de 1,25 à 2,0 pixel par point et lui
rendait les ombres. Retiré : la mesure d'image a été prise à 1,25, et s'en
servir pour multiplier par 2,56 la surface de cette même image, c'est se servir
d'une mesure contre elle-même. Le prix d'une passe d'ombres n'a jamais été
mesuré sur cet appareil non plus. Les deux sont la prochaine étape, et c'est une
mesure — `?dpr=2&ombres=1&diag=1` sur son iPhone — pas une intuition.

**Et le second sujet de cette livraison : deux témoins de `monte.js` mesuraient
le banc.** Le portail a rendu deux rouges que les trois portails précédents
n'avaient jamais rendus, sur un diff qui ne touche aucune des deux zones — « le
sol dans l'ombre d'un pilier » à `168,4 · 168,4` là où trois passages donnaient
`58,4 · 103,5`, et « le monde se maille hors du fil principal » à dix-neuf blocs
parcourus pour une borne de quarante. Mon premier réflexe a été une explication
commode, « le banc tournait plus lentement », et c'est **la durée de la suite qui
l'a tuée** : 22 min 59 s au portail de la v283, où le témoin est VERT, contre
23 min 02 s ici, où il est ROUGE. Une sonde qui sépare les quatre candidats en
une exécution a montré la bonne valeur dès le premier relevé, stable huit
secondes, et deux cent soixante-dix blocs de vol là où le portail en comptait
dix-neuf. Ce qui tranche vient d'un relevé à part : **une dalle privée de son
ombre lit cent un, pas cent soixante-huit** — les deux points lisaient donc le
ciel à travers un morceau pas encore maillé. Les deux témoins attendent désormais
le RÉSULTAT, borné, et le temps qu'il a pris entre dans leur message ; chaque
correction est vérifiée ROUGE (ombres désarmées : rapport 0,98 ; maillage dans
l'image : 216 ms par seconde pour une barre de 120).

**Et le portail suivant en a révélé cinq autres, du même sang.** Les cinq témoins
d'avion rendaient « pas aux commandes » — sur la branche ET sur `origin/main`
rejoué seul, donc sur le code déjà en production. La double mesure disait « ce
n'est pas la livraison » ; elle ne disait pas si Marlon est touché, et c'est la
seule question qui compte. **Il ne l'est pas** : sur une page neuve, un seul
appui suffit pour monter aux commandes. Ce qui échouait, c'est le témoin — sa
boucle d'embarquement s'arrêtait dès que l'enfant était « sur quelque chose », et
une voiture compte autant qu'un avion. Et descendre ne suffisait pas : une
monture suit l'enfant, donc l'appui suivant la remonte. Les dix boucles
d'embarquement de la suite font désormais le vide avant d'embarquer — pas
seulement les quatre qui rougissaient.

---

## v283 — Les voitures se suivent, et personne n'escalade les murs

**Pourquoi.** Deux défauts que la famille voit. Max signale depuis plusieurs
versions **des voitures qui se traversent dans leur propre file** : une tête qui
attend au feu accumule son retard pendant que sa suiveuse, encore hors de la
fenêtre de surveillance, avance à pleine allure — elle la rejoint, la dépasse,
et le chevauchement ne se résorbe jamais. Et **un passant collé à une façade
remontait l'immeuble** : `onGround` ne retombait à faux que sur une descente
sans collision, si bien qu'un personnage contre un mur se redonnait son
impulsion à chaque image. Mesuré sur le code en production : **neuf
trajectoires sur seize montent au-dessus de deux blocs et demi, la plus haute à
7,03 blocs** — deux étages.

**Ce que ça change.** Les voitures d'un convoi gardent leur longueur d'écart,
partout, y compris là où l'enfant n'est pas et où la surveillance ne tourne pas
du tout. Et un passant coincé contre un mur reste au sol.

**Ce qui le prouve.** Trois témoins. Celui de la façade bâtit sa dalle et son
mur dans le couloir vide, seize caps, et rend 9/16 sur l'ancien code contre zéro
ici. Celui du convoi mesure une BORNE — le minimum de l'écart le long du tracé
sur toute la fenêtre — et non un compte d'instants comme celui de la v244, dont
`CLAUDE.md` dit qu'il tire à pile ou face. Et le témoin du métro de Washington
attend désormais son RÉSULTAT en secondes de jeu, avec la distance de la rame la
plus proche dans son message : `null` n'est pas un verdict, c'est une absence de
mesure.

**Un seuil de fenêtre ne pouvait pas régler le convoi.** Ce qui doit être vrai
se garantit PAR CONSTRUCTION : deux voisines gardent leur longueur d'écart si et
seulement si `retard[i] >= retard[i-1] − ecart + LONG_VOITURE`. La borne est une
géométrie — 4,4 blocs, lus là où ils se calculent — pas un réglage. Elle ne CRÉE
jamais d'écart, elle le préserve.

## v282 — Chaque ville a son tissu, et son fleuve

**Pourquoi.** Max, sur les villes engendrées : « que ce soit beaucoup plus
réaliste… que je me prenne à Barcelone, je le sentais l'ambiance de Barcelone et
pas toutes les villes qui sont copiées-collées les unes aux autres. » Mesuré
avant d'écrire une ligne, et c'était exact : sur les 269 villes il n'existait que
**huit plans de rue**, dont deux couvraient 255 villes, et la seule chose qui
changeait d'une ville à l'autre était l'angle de rotation. Deux villes pouvaient
avoir le même sol dans les mêmes proportions, à la virgule près. Et onze villes
dont la rivière EST l'identité n'en avaient aucune : Hambourg sans l'Elbe, Lyon
sans la Saône ni le Rhône, Budapest sans le Danube, Bâle sans le Rhin.

**Ce que ça change.** Cinq choses, et l'enfant les voit toutes de la rue.

- **Chaque ville a un tissu urbain nommé**, choisi ville par ville avec sa
  raison : l'Eixample de Barcelone et ses pans coupés, l'îlot à périmètre
  viennois, le faubourg, les arcades de Bologne et de Turin, le damier des Lois
  des Indes, le lacis organique, le superîlot. Le plan au sol change vraiment.
- **Les îlots ont un cœur** — une cour, un patio, un jardin — au lieu d'être
  bâtis d'un bord à l'autre. C'est l'illa de l'Eixample, la cour haussmannienne,
  le patio andalou, et ça se voit du ciel comme par une porte cochère.
- **Chaque ville a sa place, et elle n'est plus au même endroit.** Avant, 244
  villes sur 267 avaient exactement la même : quatre blocs sur quatre, au même
  décalage du centre.
- **On marche sous les arcades** à Bologne et à Turin, et nulle part ailleurs.
- **Onze villes retrouvent leur fleuve, et des ponts pour le franchir** — avec
  leur tablier, leurs parapets et leurs piles. On traverse en voiture comme à
  pied, d'une rive à l'autre.

**Ce qui le prouve.** Huit témoins de `carteMonde.js`, tous vérifiés ROUGES sur
l'ancien code. Deux villes ne sont plus la même ville (pire similarité de
distribution 1,000 → 0,988, pire identité colonne par colonne 95,9 % → 77,5 %,
sur 253 paires) ; chaque tissu a son espace libre (un seul plan et zéro point
d'écart deviennent huit tissus et 17,4 points) ; chaque ville a sa place, et la
forme la plus répandue passe de 91 % des villes à 30 % ; on marche sous les
arcades à Bologne et à Turin (0 % → 23,7 % et 24,7 %) et **nulle part ailleurs**
(Zurich et Copenhague à zéro) ; les onze rivières existent dans le monde
engendré et non dans une fiche ; aucune ville à trame ne perd toutes ses voitures
(258 → 261 sur 262, la dernière nommée) ; chaque pont a de l'eau sous son tablier
(73 à 85 % de son axe) ; et l'on le traverse à pied sans un trou, 41 à 116 pas.

**Et le témoin de la place a trouvé trois ancres dans l'eau** — Hambourg, Bâle et
Belgrade —, c'est-à-dire le point exact où la téléportation dépose l'enfant.
Corrigé avant le portail : les onze ancres sont au sec, l'eau la plus proche de
175 mètres (Cologne) à 900 (Séville).

**Et quatre défauts de cette livraison même, trouvés par le portail et corrigés
avant la fusion.** Ils étaient tous à moi, et la double mesure n'a demandé aucun
rejeu : les deux portails ont tourné dans la même configuration sur la même
machine. L'îlot le plus étroit tombait à **3,4 blocs** — plus un immeuble, une
cloison — parce que le lacis organique avait un pas de treize ; le chiffre se
dérive de la barre de cinq blocs de la v271 et vaut quinze. Les **portes de
boutique avaient disparu** de Rome, de Tokyo et de Bologne : leur tolérance était
écrite en blocs (`0,28`) contre un front de lot qui grandit avec le pas de trame,
et ce qui ne dépend pas du pas, c'est l'écartement des colonnes — une
demi-colonne. Le **damier n'était pas carré** (27 × 21), et ce pas de 27 coûtait
un circuit à 29 des 37 villes en damier. Enfin le titre du journal faisait sept
mots pour une borne de six.

**Ce que ça change pour la famille** : une rue de Rome ou de Tokyo a de nouveau
ses portes de boutique — mesuré sur la ville entière, 25,6 → **30,8** pour mille
colonnes de trottoir à Rome et 14,7 → **23,8** à Tokyo, plus qu'avant la refonte
— on marche sous les arcades de Bologne ET on entre dans ses boutiques, et aucun
îlot n'est trop mince pour qu'un immeuble y tienne.

**Le prix se déclare.** Le superîlot garde son pas de vingt-sept, parce qu'un
superîlot EST plus grand qu'un îlot ordinaire : quarante-six de ses
soixante-cinq villes gardent un seul circuit de voitures au lieu de deux. Sur le
monde entier, la longueur de rue qui porte un convoi passe de 159 133 à 158 974
blocs — un dixième de pour cent — et les villes servies de 261 à **262 sur
262**, aucune aveugle depuis son centre.

## v281 — De vrais rails, et deux voies

**Pourquoi.** Deux captures d'iPad de Max, à quatre secondes d'écart, et trois
phrases : « les rails ne sont pas des rails, les trains se rentrent dedans, il
faut 2 rails pour aller et retour ». Les trois défauts étaient réels et avaient
chacun une cause différente. La voie était **peinte à plat** — gravier,
obsidienne et planches tous à la même hauteur — ce qui se lit, depuis une
tablette, comme un damier au fond d'une tranchée et pas comme une voie ferrée.
Et les trains se traversaient **par construction, pas par hasard** : le trajet
d'une ligne faisait l'aller puis le retour sur exactement les mêmes points, si
bien que deux rames se rencontraient de face deux fois par tour. Simulé sur les
neuf lignes, la distance minimale entre deux rames était de zéro partout.

**Ce que ça change.** Chaque ligne a maintenant **deux voies** — une pour
chaque sens, comme une vraie ligne à grande vitesse — et les trains se croisent
côte à côte au lieu de se traverser. Les rails **dépassent du ballast** : quatre
files sombres et continues qu'on reconnaît de loin et du ciel, avec leurs
traverses entre elles. La voie ferrée passe de trois blocs de large à neuf, et
les quais des dix-huit gares reculent d'autant pour rester à côté des voies et
non dessus.

**Et le portail a nommé un témoin que cet élargissement rendait faux.** « Les
dix-huit gares ont leur quai, leur auvent et leur bâtiment » est tombé à **zéro
gare complète sur dix-huit** — sur un bâtisseur parfaitement juste, que son
voisin déclarait bon au même instant (1 513 colonnes de quai, aucune sur une
voie). Il ÉCRIVAIT ses cotes transversales — quai à 2,5 et 3 blocs de l'axe,
bâtiment à 4,5 et 6 — relevées quand la voie faisait trois blocs de large. La
voie doublée porte l'emprise à 4,5 et le quai à 4,7–7,7 : toutes les cotes du
témoin étaient tombées dans le ballast. Les quatre cotes se publient désormais
là où elles se calculent, et le témoin les DEMANDE. Deux tables qui décrivent la
même gare finissent par diverger.

**Ce qui le prouve.** Trois témoins neufs, rouges sur la version publiée. Les
quatre files de rail n'ont pas un trou : zéro bloc manquant sur 12 240 attendus,
contre 12 240 sur 12 240 avant. Deux rames ne s'approchent jamais à moins de
quatre blocs, là où le minimum était zéro. Et aucune des 1 513 colonnes de quai
n'est posée sur une voie. Le relief, lui, n'a pas bougé d'un bloc — la voie est
un ouvrage écrit en blocs, pas un terrain déplacé.
## v280 — Les pistes prennent le diamètre

**Pourquoi.** Trois signalements de Max en une phrase : « supprime les avions
qui ne volent pas, en format Minecraft ; places les avions normaux près des
pistes ; et fais les pistes plus longues ». C'était la même panne vue par trois
bouts, et il a fallu la mesurer pour le voir. Ce qu'une piste réclame se lit
dans la fiche de chaque appareil : le roulage avant que le nez se lève, plus la
distance de freinage, soit quatre-vingt-trois blocs pour l'avion de ligne,
quatre-vingt-dix-neuf pour le Concorde, trente-quatre pour le chasseur. Mesuré,
la piste d'Orly en faisait **quarante-neuf**. Aucun aérodrome du jeu, sauf les
deux pistes internes de Roissy, ne permettait au Concorde de décoller et de
s'arrêter : l'enfant arrivait au bout du bitume sans avoir levé le nez. Et ses
trois appareils, à Roissy, étaient coincés dans des interstices du complexe
terminal — jusqu'à trente-huit blocs de la piste la plus proche, derrière des
bâtiments — parce que huit avions de décor occupaient tout le tarmac.

**Ce que ça change.** Les huit avions en blocs ont disparu : ce qui ressemble à
un avion est désormais un avion dans lequel on monte. La piste de chaque
aérodrome traverse la plate-forme dans sa plus grande longueur, et tout le reste
— voie de service, aire de stationnement, terminal, tour de contrôle, hangar —
passe d'un seul côté, comme dans un vrai aéroport à une piste. Les pistes
mesurent maintenant de quatre-vingt-treize blocs sur une base militaire à cent
quarante-sept à JFK, et les dix-neuf servent tout ce qu'ils garent. On sort du
terminal, on traverse l'aire, et son avion est là, aligné sur la piste, à
quelques blocs du seuil : le décollage commence tout de suite.

**Ce qui le prouve.** Quatre témoins neufs, rouges sur la version publiée et
verts ici. Chaque piste sert son appareil le plus exigeant — treize aérodromes
étaient en faute, aucun ne l'est ; chaque appareil garé est à portée du bord de
piste ; l'aire de Roissy tient un gros porteur à ciel ouvert, et pas seulement
dans une poche (neuf places avant, huit cent cinq) ; rien de solide ne dépasse
sur une piste (cent quatre-vingt-quatre blocs avant — les passerelles et les
avions de décor mordaient sur la bande). Le sol, lui, n'a pas bougé d'un bloc :
la piste est un ouvrage, remblai et tranchée écrits en blocs comme la voie
ferrée, et les deux empreintes du relief sont identiques.

---

## v279 — Ce que la v278 a livré sans le dire

**Pourquoi.** La v278 portait **deux sujets**, et n'en a documenté qu'un. À côté
des avions garés, elle livrait les demandes de Max sur la rue et la conduite :
un passant qui marche vraiment au lieu de faire le pied de grue, un passant qui
se tient sur le trottoir et non au milieu de la chaussée, l'enfant à pied qui ne
traverse plus une voiture, et la caméra qui laisse la voiture montrer son flanc
en virage. Le journal — celui du dépôt comme celui du jeu — n'a parlé que des
avions : la famille ouvre « Quoi de neuf » et n'y trouve pas quatre choses
qu'elle a pourtant sous les doigts. Et ces quatre-là sont parties en production
**sans un seul témoin**. Deux instruments disaient pourtant que tout allait
bien, et c'est le plus instructif : le témoin du journal de `maj.js` compare la
tête de `nouveautes.js` à `sw.js` et compte les **entrées**, jamais les sujets ;
et un portail est vert par construction sur du code que rien ne garde.

**Ce que ça change.**

- **Le journal du jeu dit la vérité sur la v278.** Son entrée porte les sept
  choses qu'elle a apportées, pas les quatre qu'on avait racontées.
- **La caméra de voiture recule un peu**, de 5,2 à 6,4 blocs. C'était la moitié
  non livrée de la demande de Max — « il faudrait la zoom out un petit peu **et**
  faire comme dans GTA, quand la voiture tourne, on voit le flanc » : la v278
  avait donné à la caméra son propre cap, jamais sa distance. Jugé sur trois
  captures du boulevard Voltaire prises **depuis le même point** : à 5,2 la
  carrosserie mange le bas du cadre, à 7,6 la voiture devient un objet lointain,
  à 6,4 elle tient entière et la rue s'ouvre devant.
- **Et quatre comportements que la famille a déjà sous les doigts sont
  désormais gardés.** Cela ne se voit pas, et c'est ce qui fera qu'ils le
  resteront.

**Ce qui le prouve.** Quatre témoins neufs dans `monte.js`, chacun rejoué sur le
code d'avant la v278 (`d9852ac`), avec la même mesure et les mêmes conditions de
banc :

| ce qu'il mesure | avant la v278 | ici | barre |
| --- | --- | --- | --- |
| l'angle caméra/voiture en virage tenu | **0,0° à chacun des treize relevés** | 11,6 à 18,3°, un seul signe | 6° |
| les passants au milieu de la chaussée | Rome 12 puis 10 sur 21 (57 et 48 %), Paris 3 sur 6 | Rome 2 sur 21 (9,5 %), Paris 0 sur 21 | 1/5 |
| leur chemin par seconde de JEU | 0,26 à 0,73, médiane **0,50** | 1,13 à 1,43 bloc/s | 0,8 |
| où l'enfant à pied s'arrête devant une voiture | **+0,2 · +1,53 · +1,6** — il ressort de l'autre côté | −1,16, juste au flanc | −0,5 |

**Et trois de ces quatre témoins ont d'abord été verts sur le code qu'ils
devaient accuser.** C'est la partie de cette livraison qui vaut d'être lue :

- **Un minimum échantillonné est une propriété de la cadence, pas du monde.** Le
  témoin du piéton comptait d'abord « il n'avance plus » sur des relevés espacés
  de trois cents millisecondes, quand le banc rend trois images par seconde :
  deux relevés tombaient dans la même image, et il concluait en 1,8 s après huit
  dixièmes de bloc. Réécrit sur la distance MINIMALE au centre, il lisait 0,93 —
  vert — pendant que l'enfant traversait la voiture de part en part, les relevés
  enjambant le point le plus proche. Ce qui ne dépend d'aucun relevé
  intermédiaire, c'est la position d'**arrivée**.
- **Une marche au hasard finit par dériver.** Le témoin de la marche exigeait
  quatre blocs de déplacement NET, borné sur le résultat : le vieux programme
  tirait un cap neuf toutes les une à trois secondes dans un rayon de huit blocs,
  et sur vingt-deux secondes de jeu cela suffit à les atteindre. Une borne sur le
  résultat donne à l'ancien code tout le temps dont il a besoin. Ce que Max
  décrit — « figé » — est un DÉBIT : du chemin par seconde de jeu.
- **Et un passant que personne ne voit n'est pas un passant figé.** Mon premier
  relevé rendait seize immobiles sur vingt et un, sur du code sain : au-delà de
  quatre-vingts blocs, `npc.update` n'est jamais appelé. Le chemin parcouru
  valait **exactement zéro**, ce qui distingue à coup sûr « pas animé » de « en
  pause ».
- **Et le quatrième a été rouge sur la correction qu'il devait garder** — une
  barre relevée à Paris (21 passants sur 21 sur le trottoir), appliquée à Rome,
  qui en rend 14 sur 21. Les sept autres ne sont pas au milieu de la rue : cinq
  sont sur une esplanade, pour qui le programme de flâneur est le bon. Ce qui se
  compte est ce que Max a signalé — la part SUR LA CHAUSSÉE — et « la chaussée »
  n'est pas le même bloc à Rome (`ASPHALT`) et à Paris (`ARCHI.PAVE`).

**Et deux rouges du portail étaient une hypothèse de banc que personne n'avait
écrite.** `contreLeMur` mesure la carrure de l'enfant : il creuse un couloir de
blocs à la position courante et le fait marcher vers un mur. Son hypothèse
muette — « le couloir est vide dès qu'on a dégagé les BLOCS » — était vraie tant
qu'un piéton traversait les voitures, et la v278 l'a rendue fausse. Le témoin
d'avant laisse l'enfant SUR un circuit de Paris, où il vient de compter cent
soixante relevés de voiture à moins de douze blocs : l'enfant butait sur la
circulation au lieu du mur, **7,78 blocs au lieu de 0,3**. Les trois mesures se
font désormais dans le couloir vide de la v237, ce qui les rend comparables par
construction.

**Et ma première explication était commode et fausse.** J'avais accusé mon
propre témoin voisin, qui gare une voiture et ne la rangeait pas ; l'histoire se
lisait très bien, je l'ai écrite dans un commit, et le rouge a persisté après le
nettoyage. Ranger sa voiture reste juste, mais ce n'était pas la cause — une
explication qu'on n'a pas mesurée est une dette, pas un diagnostic, **y compris
quand elle accuse son propre code**.

**Et ce n'était pas un accident : TROIS témoins de la même suite mesuraient
l'endroit où le précédent s'était arrêté.** Un second passage de `monte.js`
seule, sur un code de jeu inchangé, a retourné deux verdicts de plus, et les deux
avaient la forme de `contreLeMur`. Le piéton contre la voiture marchait depuis la
position et le CAP où la conduite d'avant avait fini : arrivée −1,18 au premier
passage, **−4,19 au second**, l'enfant arrêté après neuf dixièmes de seconde de
jeu à plus de quatre blocs de la voiture — donc contre tout autre chose. Et la
circulation qui cède, verte quatre passages de suite avec zéro relevé au travers,
en a rendu **51 sur 214** au cinquième : une voiture était déjà dans la nôtre à
la première image, et le jeu la laisse EXPRÈS sortir — attendre là, c'est y
rester pour toujours. Un témoin qui mesure une distance, une durée ou une
position se place donc lui-même, et « se placer » veut dire les trois choses à la
fois : l'endroit, le cap, et ce qui traîne autour. Le fichier se lit comme une
liste de mesures indépendantes ; il ne l'est pas, et tant qu'aucune n'est rouge
l'héritage passe pour une économie de gestes.

**Et ce que cela coûte au banc se dit** : les quatre témoins ajoutent environ
une minute et demie à `monte.js` — douze secondes de virage tenu, la marche à
pied bornée à trente, et quarante-cinq secondes d'observation de la rue. Après
la v277, qui a ramené le portail de cinquante-neuf à cinquante et une minutes,
c'est le prix de quatre comportements qui n'avaient aucun gardien.

Portail complet : quinze suites, **treize vertes**. Les deux rouges sont
`manhattan.js` et `monte.js`, et aucun n'appartient à cette livraison — la double
mesure de chacun, rejouée SEULE des deux côtés, est jointe dans `TASKS.md`. Les
dettes que la livraison laisse y sont aussi : les passants de Manhattan, qui
gardent l'ancien programme parce que leur trottoir vit dans un plan et non dans
des blocs, et le recul de la caméra, jugé sur le banc et pas encore par Max.

## v278 — Les avions sortent des murs

**Pourquoi.** Max, capture d'iPad : « les avions ne devraient pas être par
défaut dans les buildings ». Un chasseur, le nez et le réacteur dans une paroi
d'aérogare. Deux instruments disaient pourtant que tout allait bien — le témoin
qui garde les postes de stationnement depuis des dizaines de versions, et une
sonde qui relit le monde aux mêmes coordonnées : *zéro sur cinquante-sept en
faute*, tous les deux. Ils étaient verts parce qu'ils **mesuraient le
fuselage** : la fiche d'un avion de ligne annonce 1,8 bloc de large, et ses
ailes en font 15,2.

**Ce que ça change.** Les avions garés sont sur le tarmac, en entier, à ciel
ouvert — aux dix-neuf aérodromes.

- **Chaque appareil a une place à sa taille.** La dalle de stationnement est
  dessinée sur l'envergure et non plus sur un chiffre rond : à Orly, l'avion de
  ligne débordait de vingt et une colonnes sur l'herbe.
- **Les hangars ont changé de côté.** Ils tenaient le tarmac juste là où la
  rangée se gare ; ils sont passés côté ville, et le tarmac est libre d'un bout
  à l'autre.
- **Les trois avions de Roissy ont déménagé.** Le tarmac de Roissy n'a que deux
  espaces assez grands pour un gros porteur : le couloir entre le tambour de
  l'aérogare 1 et les halls, et la trouée entre les halls 2C et 2E. C'est là
  qu'ils sont, et c'est une mesure, pas un choix.

**Ce qui le prouve.** Le témoin des postes a été réécrit et rejoué sur la
version en production : **26 postes sur 57 en faute**, contre zéro ici. Il ne
demande plus « y a-t-il du bâti dans l'emprise » — vrai à l'intérieur d'une
aérogare, qui est creuse pour qu'on la visite — mais **« l'emprise est-elle à
ciel ouvert »**, colonne par colonne, chez le bâtisseur. Un second témoin
compare l'envergure annoncée à celle du modèle rendu, pour qu'une table que
personne ne relit ne redevienne jamais un piège. Portail complet vert.

## v277 — Le banc mesuré, et une panne qu'il cachait

**Pourquoi.** Max : « revamp the testing process way too heavy and long and
costly and painful ». Le portail d'essai durait une heure, et personne n'avait
jamais regardé où cette heure passait — ni combien de fois il fallait le rejouer
pour une seule livraison (cinq, pour la v276). Ce n'est pas la longueur qui
coûte, c'est la boucle.

**Ce que ça change.** Rien que la famille voie, et c'est dit franchement. Le jeu
est le même sur l'iPad, au pixel près. Ce qui change est en coulisse, et cela
décide de la cadence des versions à venir.

- **Le plus gros fichier d'essais dit enfin où passent ses minutes.** Mesuré
  témoin par témoin : dix-neuf minutes et demie, et les vingt-cinq témoins les
  plus chers en portent **85 %** — les cent quinze autres coûtent moins de deux
  secondes chacun.
- **Deux des plus chers attendent désormais un RÉSULTAT et non une durée.** La
  rue de Paris passe de cinquante-six secondes à **neuf** ; la monoplace sort du
  classement. Le fichier tombe de 19 min 30 s à 17 min 24 s.
- **Et deux interrupteurs de banc**, pour que ses réglages se rejouent au lieu
  de se croire : la résolution et la parure de l'accueil.

**Ce qu'il a trouvé, et qui vaut plus que le gain.**

- **La préparation de l'accueil dépassait sa propre limite**, sur un navigateur
  sans carte graphique : « Jouer » se libérait à quarante-cinq secondes avec six
  à dix-huit couleurs de shaders sur vingt-cinq et aucun fond de carte — c'est-à-
  dire exactement ce que la v258 avait bâti pour empêcher. La cause est le
  remplissage des deux calques de fond, que le processeur paie à la place de la
  carte graphique. Ils attendent maintenant, le temps de la préparation, comme
  les ombres le font depuis la v247. **Sur l'iPad, rien ne change** : la carte
  graphique est là.
- **Et un témoin de voitures qui tire à pile ou face.** « Les voitures ne se
  traversent plus » compte les chevauchements sur trente secondes au centre de
  Paris. Sept mesures, deux versions du jeu, deux résolutions : **de zéro à
  cinquante-trois**, sans qu'une ligne du jeu ait bougé — et sa barre, quarante-
  cinq, tombe au milieu de cette étendue. Ce n'est pas un gardien, c'est un
  tirage. **J'ai d'abord annoncé l'inverse** — que le banc accéléré révélait un
  défaut de production — sur un seul passage par côté ; l'étendue mesurée à une
  seule résolution suffit à tout expliquer. Ce que le jeu fait vraiment reste
  donc à mesurer, et c'est déclaré comme tel.

**Ce qui le prouve.** Les mesures sont toutes en ordre alterné, avec les pages
refermées entre les bras. Et **deux remèdes ont été écrits, mesurés, puis
RETIRÉS** : donner leur propre couche de composition aux deux calques (12, 11, 6
puis 25 sur 25 — pire au pire passage), et, en v276 déjà, la moitié d'un
soupçon. Un remède qui ne se mesure pas ne se garde pas.

**Et trois erreurs à moi, toutes trouvées par une bascule plutôt que par un
raisonnement.** J'ai mesuré la résolution dans une configuration que deux pages
sur sept utilisent, et annoncé quarante pour cent de gain là où il y en a vingt.
J'ai rendu rouge un témoin voisin en supprimant un sommeil dont il vivait sans
le dire. Et j'avais conclu en v276 que les deux calques de fond ne coûtaient
**rien** — mesuré sur une page sans préparation, où rien ne les invalide. **Un
« innocent » ne vaut que dans les conditions où il a été mesuré**, et c'est pour
cela qu'on les écrit à côté.

**Ce qui ne bouge pas.** Les mondes, les blocs, les photos, les records, et
l'apparence du jeu sur l'iPad.

---

## v276 — Un jeu tout clair

**Pourquoi.** Max, devant la proposition de design : « je trouve qu'ils
ressemblent trop aux précédents ; j'aurais une interface beaucoup plus
moderne, beaucoup plus light, avec beaucoup plus de glass design ». Le jeu
était bleu nuit depuis le premier jour, écrit dans la police d'une machine à
écrire, et parsemé d'emojis qui ne sont pas les mêmes d'un appareil à l'autre.

**Ce que ça change.**

- **L'accueil est clair.** Un fond gris-bleu très doux, deux nappes de lumière,
  et les méridiens d'un globe au trait fin — on y fait le tour du monde.
- **Les panneaux sont en verre dépoli**, comme sur un téléphone récent : on
  voit la couleur à travers.
- **Deux vraies polices** : un titre large et serré, un texte rond et lisible.
- **Plus un seul emoji sur l'accueil.** Chaque signe est dessiné au trait, à la
  même épaisseur, et il est le même partout.
- **Les commandes du clavier parlent enfin français.** Elles étaient en anglais
  depuis les tout premiers jours.
- **Ça bouge.** Les blocs de l'accueil se posent l'un après l'autre, la lumière
  du fond dérive lentement, et le cube du chargement balaie comme une boussole.
  Rien ne s'anime pendant la partie : le jeu garde ses images pour le monde.
- **Le jeu dit ce qu'on y fait.** « Explore le monde entier. Construis le
  tien. » — parce qu'on y bâtit autant qu'on y voyage. L'ancienne phrase se
  vantait que tout était sauvegardé, ce qui va de soi.
- **Et le verre se dépolit quand le jeu est prêt.** Pendant que l'accueil
  charge ses personnages et ses couleurs, les panneaux sont clairs et nets ;
  au moment où « Jouer » s'allume, ils se dépolissent en une demi-seconde. On
  voit le jeu devenir prêt.

**Ce qui le prouve.** Cinq témoins dans `maj.js`. Le fond se lit par sa
**luminance calculée** — « clair » est une grandeur mesurable, « la classe est
posée » n'en est pas une. Les polices se comptent dans ce que la page a
**réellement demandé** : zéro requête chez Google, deux fichiers depuis le
dépôt. L'accueil ne doit plus porter un seul point de code d'emoji dans le
texte que l'enfant voit. Et le quatrième calcule le **contraste** de dix textes
en composant les fonds translucides — c'est lui qui a trouvé, dans ma propre
livraison, que la pastille de version tombait à 3,77 pour une barre de 4,5.
Les animations, elles, ne portent que sur `transform` et `opacity` — ce qui se
calcule sur la carte graphique, jamais sur la mise en page — et
`prefers-reduced-motion` les coupe toutes.

**Et ce que le portail a trouvé, parce que c'est le plus utile de la
livraison.** Le premier jet a rendu trois suites rouges et ralenti toutes les
autres — `carte.js` passait de 4 min 39 s à 11 min 33 s. La cause : le verre
dépoli coûte **la moitié des images de l'accueil** (5,7 · 8,3 · 8,3 contre
15,3 · 15,7 · 15,2 par seconde, mesuré en ordre alterné), et ce sont justement
celles dont la préparation a besoin — le jeu compile une couleur de shader par
image. Le verre attend donc que l'accueil ait fini : mêmes machine et même
passage, la préparation passe de 7 couleurs sur 25 à 25 sur 25. Deux fausses
pistes écartées par la mesure, et il faut le dire : les animations et les deux
nappes de lumière ne coûtent **rien** (vérifié trois fois), et en jeu la
refonte ne coûte rien non plus — j'avais failli déclarer une régression qui
n'existait pas, sur deux relevés au lieu de six.

Et le même défaut se cachait à côté, depuis bien avant cette livraison : le jeu
préparait ses couleurs de shader **une par image**, donc vingt-cinq images — ce
qui dure quarante secondes quand l'accueil n'en rend qu'une et demie par
seconde, alors que les vingt-cinq ne coûtent ensemble qu'une demi-seconde de
calcul. Elles se font désormais par tranches de temps : cinq images au lieu de
vingt-cinq ici, et sur l'iPad rien ne change, parce qu'une seule compilation y
remplit déjà la tranche. Ce qui reste, et qui est écrit dans la liste des
dettes : la préparation tient encore sur le bord de sa limite (43 à 45 s pour
une limite de 45), et six de ces secondes ne sont attribuées à rien.

**Ce qui ne bouge pas.** Les mondes, les blocs, les photos, les records. La
refonte est une couche de peinture posée par-dessus la mise en page : elle ne
change que les couleurs, les bords et les lettres.

## v275 — Grand Tour

**Pourquoi.** Le jeu s'appelait « Web Minecraft » — un nom d'atelier, emprunté,
qui ne dit pas ce qu'on y fait. Max a validé le nom et le logo : on y fait le
tour du monde.

**Ce que ça change.**

- **Le jeu s'appelle Grand Tour** : l'onglet, le grand titre de l'accueil, et
  surtout le nom sous l'icône sur l'écran d'accueil de l'iPad.
- **Une icône neuve** — une boussole graduée dont le globe porte une route en
  pointillé — aux trois tailles que réclament la tablette.
- **La page parle enfin français** (`lang="fr"`), et l'écran de lancement ne
  clignote plus en bleu avant de devenir noir.
- **Rien d'autre ne bouge.** Les mondes, les blocs, les photos, les records :
  tout est exactement là où il était.

**Ce qui le prouve.**

Trois témoins dans `maj.js`. Le premier n'est pas satisfait par le titre au
chargement — il entre en jeu, revient au menu par 🏠 et RELIT, parce que c'est
là que `main.js` réécrivait l'ancien nom par-dessus. Le deuxième vérifie que le
manifeste et les **quatre** fichiers d'icône arrivent et pèsent quelque chose.
Le troisième garde les clés qui portent les mondes des enfants : trente clés de
stockage intactes, dont les cinq qui comptent, et le cache immuable inchangé.

**Ce qu'on n'a pas renommé, et pourquoi.** Sur les soixante-dix-neuf mentions
de l'ancien nom dans le code, la grande majorité sont des **clés de données**.
Les renommer effacerait les mondes de Marlon et d'Alice ; renommer le cache
immuable ferait re-télécharger treize mégaoctets à chaque iPad pour un nom que
personne ne voit. On renomme ce que l'enfant voit, jamais ce qui porte ses
données.

## v274 — Les feux arrivent à Paris, Londres et les quatre autres

**Pourquoi.** La v273 a donné aux feux leur horloge et fait s'arrêter la
circulation — mais seulement dans les villes ENGENDRÉES. Paris, Londres, Nice,
Lille, San Francisco et Washington n'avaient pas **un seul feu**, et ce sont
justement celles où les enfants conduisent le plus. Mesuré à la livraison
précédente : 167 coins de carrefour à Paris, 622 à Lille, zéro feu.

**Ce que ça change.**

- **Les six villes bâties à la main ont leurs feux tricolores**, aux vrais
  carrefours : Paris 118, Londres 130, Washington 158, San Francisco 74, Nice
  55, Lille 36. Ils s'allument et la circulation s'y arrête, exactement comme
  ailleurs.
- **Quatre feux par carrefour, un par coin** — et c'est le carrefour qui les
  choisit, pas la colonne qui se déclare.

**Ce qui le prouve.**

Deux témoins neufs dans `carteMonde.js`, qui LISENT LES BLOCS posés et non une
table : les six villes ont leurs feux, chacun au coin d'un carrefour, et aucun
collé à un autre (zéro dans les six villes). Rouges sur l'ancien code, où le
compte est zéro partout.

Et trois mesures ont décidé du dessin, chacune contre une intuition :

| ce qu'on croyait | ce que la mesure a dit |
| --- | --- |
| un coin de trottoir = un carrefour | c'est un caniveau en DIAGONALE : une grappe de 28 colonnes à Lille |
| deux croisements distincts = deux carrefours | les doublons sont à 1,0–2,0 bloc, les vrais voisins à 3,0 et plus |
| écarter l'emprise des monuments | Paris ET Londres tombent à zéro feu — écrit, mesuré, retiré |

Sur le disque entier, 97 % des feux de Paris et 99 % de ceux de Londres sont
au coin d'un carrefour ; les trois pour cent restants sont sous un monument qui
pave la rue par-dessus, et c'est déclaré.

## v273 — Les feux tricolores s'allument, et la circulation s'y arrête

**Pourquoi.** Le programme de réalisme écrit dans `CLAUDE.md` avait un point 4
resté ouvert depuis des mois : « la vie dense — voitures qui s'arrêtent aux
feux ». Mesuré en capture à Zurich avant d'y toucher : les feux existaient bien,
un par coin de carrefour, mais leur boîtier montrait ses **trois lentilles
allumées en même temps** — rouge, orange et vert. Ce n'est pas un feu, c'est une
guirlande. Et les voitures leur passaient devant sans les voir.

**Ce que ça change.**

- **Un feu montre une couleur à la fois, et il change.** Vert neuf secondes,
  orange deux, puis rouge pendant que l'autre rue passe : un tour complet de
  vingt-deux secondes, compté en temps réel — un feu ne ralentit pas parce que
  la tablette rame.
- **Les deux rues d'un carrefour ne sont jamais vertes ensemble.** Les feux se
  répondent en diagonale, comme dans une vraie ville.
- **Le feu regarde la file qu'il arrête**, et plus la première rue venue.
- **Les voitures s'arrêtent au rouge et repartent au vert** — sans patience :
  un feu ne se force pas, on attend qu'il passe. Une voiture déjà engagée dans
  le carrefour le traverse, elle ne s'y arrête pas.

**Ce qui le prouve.**

Trois témoins neufs dans `carteMonde.js`, rouges sur l'ancien code parce que
rien n'y publie l'état d'un feu :

| témoin | ce qu'il rend |
| --- | --- |
| un feu ne montre qu'une couleur, et il change | **53 feux** autour de l'enfant, **zéro** dont le compte de lentilles vives soit différent de un, et le feu suivi change d'état en 1,5 s |
| les deux axes ne sont jamais verts ensemble | sur tout le cycle (22 s, lu par pas de 100 ms) : zéro instant à deux verts, zéro vert pendant l'orange de l'autre |
| la circulation s'arrête au rouge, puis repart | 1 455 relevés de voitures : **140** à l'arrêt devant un feu non vert, **112** qui roulent au vert, et **4 redémarrages** au passage au vert |

La règle du feu est PURE (`src/feux.js`, sans import) : c'est elle que lisent
celui qui allume les lentilles et celle qui s'arrête devant. Deux tables qui
décrivent le même feu finissent par diverger.

Portail complet, huit suites : six vertes. Les quatre rouges de `manhattan.js`
et le gel d'arrivée en ville sont des dettes déjà déclarées et mesurées identiques
en production. Un sixième rouge était neuf et ne venait pas du jeu — le témoin
de l'atterrissage manuel lisait la vitesse à l'instant exact où l'appareil
touche le sol, doigt encore posé sur le joystick, donc au moment où la marche
arrière de la v269 commence : il mesurait la date de son échantillon. Il
relâche désormais le joystick avant de mesurer.

**Ce qui n'y est pas, et qui est déclaré.** Les feux n'existent que dans les
villes ENGENDRÉES : Paris, Londres, Nice, Lille, San Francisco, Washington et
Manhattan n'en ont pas un seul. Mesuré sous node, fenêtre de 81 × 81 blocs au
centre : 167 coins de carrefour à Paris, 622 à Lille, zéro feu ; Rome, ville
engendrée, en a 49. Poser un feu sur chaque coin donnerait donc trois à douze
fois la densité de Rome — le « carrefour hérissé » déjà payé une fois. Max juge
sur captures : c'est une livraison à part, avec sa mesure de densité et sa vue
de rue.

## v272 — Une voiture n'est pas un avion : ni jauge, ni eau sous les roues

**Pourquoi.** Max, capture d'iPhone à Hambourg, quatre défauts sur une seule
image : sa voiture au milieu du port, « il est marqué 86 km/h » alors qu'elle ne
bougeait pas, le bouton « Descendre » posé en plein milieu du bas de l'écran, et
« la jauge de vitesse, je ne veux pas qu'elle soit existante pour une voiture ».
Les quatre avaient des causes différentes, et aucune n'était là où l'image la
mettait. Un cinquième, de la même famille que le bouton mal placé, a été trouvé
en instrumentant le témoin : la pastille de viande volait le doigt.

**Ce que ça change.**

- **Une voiture s'arrête au bord de l'eau** au lieu d'aller rouler au fond du
  port, et le jeu dit quoi faire : « fais demi-tour ». Une voiture déjà tombée à
  l'eau peut en ressortir — on ne bloque que l'entrée.
- **Plus de cadran ni de compteur en voiture.** Elle se conduit au joystick,
  d'un seul doigt : l'avant accélère, l'arrière freine puis recule, le côté
  tourne le volant. La manette des gaz et le compteur redeviennent ce qu'ils
  étaient — des instruments d'avion. Le chiffre en km/h disparaît donc aussi de
  la voiture : un bloc ne vaut un mètre nulle part dans ce jeu, et ce compteur
  mentait depuis toujours.
- **Le bouton « Descendre » rejoint le bord droit.** Il était dans la zone du
  joystick, qui n'est pas le cercle qu'on voit mais tout le quart bas-gauche de
  l'écran : un doigt posé là ne prenait plus le volant, il faisait descendre. La
  pastille de viande, au même endroit, faisait la même chose.
- **Et une voiture arrêtée par un mur perd sa vitesse** : le moteur se calme et
  les roues s'arrêtent, au lieu de tourner dans le vide à pleine allure.

**Ce qui le prouve.**

Cent trente-sept témoins de `monte.js`, dont **sept neufs pour cette
livraison**, chacun mesuré :

| ce qu'il mesure | ce qu'il rend |
| --- | --- |
| une voiture n'entre pas dans l'eau | s'arrête à 10,8 blocs, bord du quai à 12, zéro colonne d'eau — et elle recule de 1,04 pour en sortir |
| un mur arrête le compteur | lancée à 10,94 blocs/s, contre le mur **vitesse 0**, quatre relevés immobiles d'affilée |
| la jauge n'existe pas en voiture | cadran, compteur et socle tous à `none`, `player.gaz` resté nul |
| « Descendre » hors de la zone du joystick | bouton en (300, 626), zone du joystick x < 189 et y > 304 |
| rien d'autre ne vole le doigt | `elementFromPoint` rend le canvas du jeu au **premier** essai, pastille de viande affichée exprès |
| le joystick accélère, et relâché ralentit | médiane **12,16** blocs/s pour 12,2 d'allure de la classe |
| le joystick tourne le volant | le cap passe de −1,571 à −1,901 en accélérant |

Et deux témoins anciens ont été corrigés parce qu'ils mesuraient le banc et non
le jeu : celui du piéton recommence quand une voiture de la rue est venue
pendant la mesure, et celui de la marche arrière mesure le recul **depuis le
point de rebroussement** — freiner, c'est encore avancer.

## v271 — Les rues sont deux fois plus larges, et on roule à droite

**Pourquoi.** Max, après la v270 : « increase les routes ». La chaussée des
deux cent soixante-quatre villes du tour du monde faisait **3,4 blocs** pour une
voiture de 2,26 : une seule file. C'est ce que la v211 avait mesuré, et c'est ce
qui l'avait fait écarter la conduite à droite — « il n'y a la place que pour UNE
file ». Une voiture roulait donc au milieu de la rue, et deux ne pouvaient pas
se croiser.

**Ce que ça change.** Les rues font **5,6 blocs**, deux voitures s'y croisent
avec un demi-bloc entre elles, et **la circulation roule à droite** au lieu du
milieu — il reste donc toujours une voie libre pour la voiture de l'enfant. Et
les immeubles y ont gagné : plus un seul îlot sous cinq blocs de large, quand il
y en avait 196 sur 528.

**Ce qui le prouve — le chiffre est un résultat, pas un goût.** Élargir touche
trois choses à la fois, et il fallait les regarder ensemble, parce que l'îlot est
ce qui reste (`pas de trame − 2 × emprise`) :

| facteur de trame | chaussée | trottoir | îlot min · médian | îlots sous 5 blocs |
| --- | --- | --- | --- | --- |
| 3,00 (v270) | 3,4 | 2,30 | 4,0 · 7,0 | **196 sur 528** |
| 3,00 | 5,2 | 1,40 | 4,0 · 7,0 | 196 |
| 3,00 | 5,2 | 2,00 | **2,8** · 5,8 | 196 (dont 196 sous 3) |
| **3,75** | **5,6** | **2,00** | **5,4 · 9,4** | **0** |

À emprise constante, la chaussée mange le trottoir — donc le mobilier, donc
l'éclairage de nuit de la v248. En élargissant l'emprise sans toucher au pas de
la trame, l'îlot tombe à 2,8 blocs sur les villes à trame serrée : des cloisons,
pas des immeubles. Le pas est donc le troisième levier, et il rend la ville
**meilleure** qu'avant.

**ET LE COMPTE BRUT DE MOBILIER N'ÉTAIT PAS LA BONNE GRANDEUR.** Il tombe d'un
tiers, et c'est sans intérêt : la ville a moins de rues, plus larges. Ce qu'un
enfant voit, c'est l'espacement des réverbères **le long** de la rue, et il ne
bouge pas — 123 → 138 pour mille blocs de rue à Zurich, 130 → 116 à Rome,
172 → 130 à Tokyo, pour un voisin le plus proche à 3 à 5 blocs. C'est le
reproche qu'on fait aux témoins — compter un motif n'est pas compter la chose —
appliqué à une mesure de contenu.

**Ce qui le prouve — la conduite à droite.** Le signe se **mesure**, il ne se
déduit pas : dans three.js la caméra regarde vers −Z et sa droite est +X, donc
pour une direction (fx, fz) la droite vaut (−fz, fx) — et relevée sur les quatre
côtés d'un anneau réel, elle pointe vers le **centre** du rectangle. Rouler à
droite, c'est donc rétrécir l'anneau d'une demi-chaussée.

| mesuré sur cinq villes | v270 | v271 |
| --- | --- | --- |
| écart du convoi à l'axe de la rue | 0,00 — au milieu | **1,40 = une demi-chaussée** |
| la voiture du convoi est sur la chaussée | 66,3 % | **76,9 %** |
| **il reste la place d'une voiture dans l'autre voie** | **52,7 %** | **94,5 %** |

**Ce qui le prouve — le banc.** Quatre témoins neufs dans `carteMonde.js`,
**rouges tous les quatre sur la version publiée**. Et les cinq de la v270 —
partage, convois, voiture en vue du centre, mobilier traversé, dégagement —
restent verts : zéro case de mobilier traversée, zéro ville aveugle, pire partage
19 pour une barre de 20. Le dégagement du mobilier a dû suivre la voie décalée
(la voiture n'est plus centrée sur l'axe, son flanc est à 2,53 blocs) ; la bande
garde 1,56 bloc, plus large qu'avant.

**Et c'est du sol, pas du relief.** `hauteurVillesMonde` ne lit ni le pas de la
trame ni la largeur de chaussée : les deux empreintes de `plafond.js` ne bougent
pas, et l'invariant du terrain tient sans rien avoir à déclarer — même raison que
la passe de rues de Londres en v206.

**Le prix, déclaré.** 16 % de rue portant un convoi en moins (195 060 → 163 036
blocs) et 788 → 628 anneaux, parce que la ville a moins de rues mais plus
larges. Les six villes bâties à la main gardent leurs largeurs relevées sur de
vrais plans — leur élargissement est la livraison suivante.

---

## v270 — Les voitures des villes ne se traversent plus, ni elles ni les trottoirs

**Pourquoi.** Max, deux captures. À Stuttgart, une voiture posée DANS le
mobilier de la rue. À Zurich, « deux voitures de la rue l'une dans l'autre,
et des caisses du marché sur la chaussée ». La « caisse », c'est la
jardinière — et le banc.

**Ce que ça change.** Dans les deux cent soixante-quatre villes du tour du
monde, deux files de voitures ne roulent plus l'une dans l'autre, et aucune
carrosserie ne traverse plus un réverbère, un banc, une jardinière ou un feu.
Les rues ont même PLUS de mobilier qu'avant. Et les trois médinas — Venise,
Jérusalem, Marrakech — n'ont plus de voitures du tout : leurs ruelles font
1,8 bloc et une voiture en fait 2,26, elle n'y tenait pas.

**Ce qui le prouve — deux files dans la même rue.** La règle existait depuis
la v211 : « deux circuits ne peuvent avoir plus d'une vingtaine de blocs de
chaussée en commun — c'est la taille d'un carrefour, et cela distingue se
CROISER de se SUIVRE. » Elle avait été écrite pour les six villes bâties à
la main et **n'a jamais atteint les villes engendrées**. Mesuré sur les
fonctions pures, avant d'accuser quoi que ce soit :

| | avant | après |
| --- | --- | --- |
| villes au-dessus de la barre | **265 sur 267** | 0 sur 264 |
| pire partage | 576 blocs (Shanghai) | 18 blocs |
| Zurich | 106 blocs | 0 |

Le prix se déclare : 1 062 anneaux de circulation deviennent 764, et la
longueur de rue portant un convoi tombe d'un quart. Mais ces blocs-là
portaient DEUX convois superposés — ce qu'on retire, ce sont des doublons qui
se traversaient, pas de la variété. Aucune ville ne perd tous ses convois, et
un témoin le garde.

**Ce qui le prouve — le mobilier sous la carrosserie.** Mesuré au recouvrement
exact du rectangle de la voiture contre la case du meuble : **32 410 cases,
267 villes sur 267**. La cause est géométrique et ne se devinait pas. La
chaussée fait 3,4 blocs et la voiture 2,26 — 0,57 de marge par côté — mais le
mobilier était posé sur la PREMIÈRE colonne de trottoir, et comme la trame
d'une ville est tournée par rapport au monde (24° à Zurich), une case entière
mord jusqu'à 1,13 bloc dans la chaussée, c'est-à-dire jusqu'à l'axe de la rue.

La bande du mobilier se DÉCALE désormais, elle ne se rogne pas : un simple
plancher dégageait tout mais coûtait 47 % des réverbères, donc des rues
noires. Résultat mesuré : **0 case traversée**, et plus de mobilier qu'avant
— Zurich 490 → 541, Rome 917 → 934, Marrakech 669 → 783.

**Et deux régressions de ma propre correction, trouvées par la mesure.** Mon
premier jet élargissait la fenêtre du feu tricolore à toute la bande : Zurich
passait de 110 feux à 277, Rome de 235 à 563 — un carrefour hérissé. Et il
décalait l'échantillon d'un demi-bloc À CHAQUE TOUR de la boucle sur les
villes voisines, donc d'un bloc entier pour la seconde. Aucune capture ne les
aurait montrés ; c'est le comptage avant/après, ville par ville, qui les a
dits.

**Et le dégagement se CALCULE, il ne se mesure pas sur une ville.** Mon
premier chiffre — 0,3 bloc de marge — était réglé sur Zurich : juste là, faux
ailleurs, parce que ce qui déborde dépend de l'ANGLE de la trame. Une case
unitaire tournée de θ s'étend de (|cos θ| + |sin θ|) / 2 de son centre. Écrite
ainsi, la règle a réglé d'un coup les trois médinas que le chiffre rond
laissait en faute.

**ET LE PORTAIL A TROUVÉ UNE RÉGRESSION QUE MES QUATRE TÉMOINS NE POUVAIENT
PAS VOIR.** La contrainte de partage trie les anneaux par taille, et elle
sacrifiait les anneaux DÉCALÉS — ceux dont un côté passe près du centre. Rome
gardait bien ses quatre anneaux, mais le plus proche passait de **douze blocs
du centre à quarante-cinq**, pile la portée à laquelle une voiture cesse
d'être dessinée : un enfant qui se pose sur la place ne voyait plus une seule
voiture. C'est exactement la panne que la v201 avait corrigée sur signalement
de Max (« les villes n'ont pas de vie »).

Un seul témoin l'a dit — « la circulation naît à l'approche » (`monte.js`),
qui se téléporte à Rome et exige une voiture EN VUE. Les miens comptaient des
ANNEAUX, et ils étaient tous verts. **Le premier anneau retenu est désormais
celui que l'enfant voit** : 788 anneaux au lieu de 764, zéro ville aveugle sur
les 264 qui ont des convois, partage inchangé (pire 18), et le calcul est même
plus rapide qu'avant la livraison (104 ms contre 117). Un témoin neuf le garde,
vérifié rouge sur la version fautive.

**ET TROIS TÉMOINS SONT TOMBÉS POUR LA MÊME RAISON, DANS TROIS FICHIERS.** Un
verdict qui compte des PAS ou qui dort un temps FIXE mesure la cadence du banc,
pas le jeu — parce que `main.js` borne `dt` à un vingtième de seconde. Les
trois sont réécrits pour attendre le RÉSULTAT, borné, au lieu d'un temps :
l'escalier du métro de Washington descend jusqu'au quai ou jusqu'à ne plus
descendre (7,0 blocs mesurés pour une barre à 8, quand la même suite rejouée
seule en rend 13,0) ; la seconde tablette de `reglages.js` est observée pendant
toute la fenêtre au lieu d'être lue une fois à la fin ; et la marche arrière de
`monte.js` recule jusqu'à avoir reculé (0,26 bloc en trois secondes de banc,
pour une physique qui en rendait le double la veille).

**Ce qui reste rouge, et qui ne vient pas d'ici.** Trois défauts du métro de
Washington et un délai de `manhattan.js` : rejoués SEULS des deux côtés, ils
sont rouges à l'identique sur la version publiée — quatre passages sur quatre
pour le métro, avec les mêmes valeurs. Ils partent en dette déclarée dans
`TASKS.md` avec leurs mesures. Et une supposition de ma part y est corrigée :
je les croyais verts rejoués seuls, sur la foi d'un relevé vieux de quatorze
versions. Une mesure d'hier n'est pas une mesure d'aujourd'hui.

**Ce qui le prouve — le banc.** Cinq témoins neufs dans `carteMonde.js`,
rouges sur la version publiée (265 villes au-dessus de la barre, 32 410 cases
traversées, dégagement absent), verts ici — et le cinquième, celui de la vue,
rouge sur la première version de cette branche. Ils interrogent les fonctions PURES et jamais le monde chargé :
`getBlock` ne répond que sur les morceaux déjà engendrés, et lire deux cent
soixante villes sans y aller rendrait zéro partout — un vert qui ne prouve
rien.

---

## v269 — Le jeu remarche sur l'iPad, on recule, et les véhicules font du bruit

**Pourquoi.** Max, sur la version publiée : « le lag est absolument énorme,
alors qu'avant il était pas mal réduit. C'est quasiment impraticable. En
avion, on voit l'image bouger pendant une seconde, elle s'arrête pendant
quasiment cinq secondes. À pied, quand on ouvre la carte, le personnage est
figé dix secondes avant de pouvoir faire un pas. » Et, séparément : « aussi
impossible de faire marche arrière avec un avion ou une voiture. »

**Ce que ça change.** Le jeu redevient jouable. La file d'avance du mailleur
revient de seize morceaux à huit : c'est la v265 qui l'avait doublée, et
c'est elle qui produisait les gels. Tirer le joystick en arrière freine puis
fait reculer — la voiture comme l'avion, quoi que dise le cadran des gaz. Et
les véhicules font enfin du bruit : le moteur tourne au ralenti dès qu'on
monte et monte en régime avec l'allure, une radio s'allume dans la voiture
(trois stations écrites pour ce jeu), les réacteurs soufflent en vol, et une
ligne 🔊 dans les Réglages coupe absolument tout.

**Ce qui le prouve — le lag.** Mesuré au-dessus de PARIS, à la distance
d'affichage de l'iPad, vingt secondes de vol, sur les deux critères qui
comptent : la cadence que l'enfant subit et le trou qu'il voit devant lui.

| file | cadence | image médiane | pire image | > 300 ms | trou devant |
| --- | --- | --- | --- | --- | --- |
| 4 | 20,1 | 50 ms | 317 | 1,3 % | 36 |
| **8** | **18,3** | **50 ms** | **150** | **0 %** | 66 |
| 12 | 15,0 | 67 ms | 183 | 0 % | 93 |
| 16 | 9,1 | 100 ms | 383 | 3,1 % | 132 |

La file de seize est la seule à produire des images de plus de trois cents
millisecondes : ce sont les gels. Et comme le pas de temps du jeu est borné,
elle faisait tourner le jeu **au ralenti** — à vitesse demandée identique,
l'avion parcourait 1 757 blocs au lieu de 3 303. Le prix du retour se
déclare : les bâtiments se dessinent plus tard (trou 132 → 66 blocs). Entre
« les détails arrivent en retard » et « le jeu s'arrête cinq secondes »,
c'est Max qui a tranché.

**Et deux remèdes ont été écrits, mesurés, puis retirés.** Borner la pose des
géométries image par image — la dette que la v265 avait elle-même déclarée —
ne change rien : 10,63 images par seconde contre 10,20, du bruit. La raison
est arithmétique : borner le travail par IMAGE ne réduit pas le travail par
SECONDE, puisque le mailleur continue de produire. Et faire de la file un
TEMPS plutôt qu'un compte, la règle que la v265 avait écrite en titre et
codée à l'envers, ne marche pas non plus : mesuré, le coût d'un morceau ne
sépare pas la ville de la campagne en vol (4,4 à 12,2 ms à Paris, 3,4 à 8,3
en campagne), la file partait à son plafond partout et rendait 6,0 images par
seconde — pire que seize.

**Et les avions reviennent à la vitesse que le monde sait charger.** C'est
le témoin du chargement qui l'a dit, et c'est la vraie leçon de cette
livraison : la v265 avait monté les jets de 110 à 160 blocs par seconde
**parce que** la file de seize le permettait. La file revenue à huit, 160
ne tient plus — l'enfant volait littéralement dans le vide. Remesuré au
même critère (le trou devant soi, médiane de six relevés) :

| vitesse | trou devant soi | il en faut (une demi-seconde de vol) |
| --- | --- | --- |
| 95 | 115 | 48 |
| **120** | **93** | **60** |
| 130 | 80 | 65 |
| 160 | 64 | 80 |

L'avion de ligne repasse à 95, le Concorde et le chasseur à 120 — toujours
au-dessus des 110 d'avant la demande de Max. **Le compteur, lui, ne bouge
pas d'un kilomètre-heure** : il affiche toujours Mach 1,8, parce que la v267
a séparé ce qu'on affiche de ce qu'on parcourt. Et la barre du témoin ne
s'écrit plus, elle se CALCULE d'après la fiche : elle valait quatre-vingts
depuis la v229 et n'était juste que par accident.

**Ce qui le prouve — la marche arrière.** Deux témoins neufs qui montent par
le bouton, poussent le cadran à fond, puis tirent le joystick en arrière —
la situation exacte qui ne marchait pas. Sur la version publiée la voiture
**avance** de 18,4 blocs et l'avion de 12,5, le cadran reste à fond, et
l'attente de l'arrêt expire à ses huit secondes. Ici la voiture s'arrête en
0,8 s puis recule de 6,9 blocs, l'avion en 0,4 s puis de 2,1, et le cadran
est retombé à zéro.

**Ce qui le prouve — les sons.** Rien n'est téléchargé : tout est fabriqué
dans la page, parce que le jeu entier pèse 1,12 Mo compressé et qu'une seule
boucle de moteur en MP3 pèserait davantage. Deux témoins neufs qui lisent des
ÉCHANTILLONS, jamais un drapeau — un analyseur accroché à la sortie du jeu :
zéro à pied, 0,028 au ralenti au volant, 0,048 à pleins gaz, zéro à la
descente. L'horloge audio du banc a été mesurée avant d'écrire le témoin
(0,212 pour une sinusoïde d'amplitude 0,3, soit 0,3/√2), sans quoi il aurait
mesuré le banc. Et le son ne coûte rien de mesurable : 7,78 · 7,71 · 8,00 ·
7,24 images par seconde, ordre alterné, pages refermées entre chaque.

---

## v267 — Les jets passent le mur du son, et on ne se pose plus dans la mer

**Pourquoi.** Max : « un avion ne peut pas atterrir dans l'eau. Et peut-être
fake la vraie vitesse, mais quand ton avion de chasse vole, il devrait voler à
une vitesse supersonique. Idem, un Concorde, ça ne vole pas à 500 km/h. » Les
deux étaient vrais. En finale au-dessus de la mer, l'appareil traversait la
surface et se posait sur le fond, puis roulait sous l'eau. Et le compteur
annonçait 576 km/h pour un Concorde, qui volait à 2 180.

**Ce que ça change.** Devant de l'eau, l'avion ne descend plus : il remet les
gaz, remonte, et le jeu dit à l'enfant d'aller vers la terre — c'est le geste
qu'un vrai pilote fait devant une piste impraticable. Et le compteur dit
enfin la vitesse de l'appareil qu'on pilote : 900 km/h pour l'avion de ligne,
2 180 pour le Concorde, 2 200 pour le chasseur. Passé le mur du son, la petite
ligne troque ses km/h contre le nombre de Mach — « Mach 1,8 ». Ce que l'avion
PARCOURT ne change pas d'un bloc : c'est ce que le monde sait charger, mesuré
en v265, et ça reste.

**Ce qui le prouve.** La sonde a d'abord menti, et c'est noté : elle volait
vers la côte, l'appareil rejoignait la terre en descendant, et elle concluait
que tout allait bien sans avoir jamais mesuré d'eau. Cap au large, elle a rendu
le vrai chiffre — posé à y = 25, sous cinq blocs d'eau, à rouler au fond de la
Méditerranée. Deux témoins neufs dans `monte.js`, tous deux rouges sur la
version publiée et verts ici : en finale au large de Nice l'appareil ne descend
pas sous la surface (46,2 contre 26) et la remise des gaz a bien eu lieu ; et
le compteur RENDU — celui que l'enfant lit, pas la fiche — affiche 900 km/h,
Mach 1,8 et Mach 1,8, là où la version publiée affichait 432, 576 et 576.

Portail complet, quinze suites, soixante-huit minutes : les deux témoins neufs
verts, et quatre suites rouges dont AUCUNE ne vient d'ici. Trois sont des
dettes déjà écrites (le métro de Washington, le délai de `manhattan.js`, la
poule et le gel du premier survol de Paris). La quatrième est neuve au
registre et vieille en production : le fond de la carte du monde ne finit pas
son calcul dans les quarante-cinq secondes de la préparation. Rejouée SEULE
dans les deux arbres le même jour, elle rend le même verdict — 45 121 ms ici,
45 128 sur la version publiée, la carte encore au travail des deux côtés. Elle
part dans `TASKS.md` avec ce qu'il faut mesurer avant d'y toucher.

---

## v266 — Un enfant qui charge son monde n'est pas un enfant parti

**Pourquoi.** À trois joueurs, le dernier arrivé disparaissait pour les deux
autres une vingtaine de secondes après être entré, puis revenait. Le défaut
allait et venait depuis la v259 et résistait à six livraisons : rouge une fois
sur deux, à l'identique sur la version publiée comme sur la branche, donc
impossible à mettre sur le dos de ce qu'on venait d'écrire. C'est Marlon,
Alice et un ami qui le vivaient.

**Ce que ça change.** Le troisième enfant reste là. Sa tablette peut mettre une
demi-minute à charger le monde : les deux autres continuent de le voir, à sa
place, et quand elle a fini il n'a rien à refaire — il n'est jamais parti.
Avant la correction, dans la même situation, il disparaissait pour tout le
monde et se retrouvait lui-même seul dans un monde vide.

**Ce qui le prouve.** Trois sondes successives, chacune répondant à une seule
question, parce qu'une hypothèse de plus aurait coûté une livraison de plus.
La première : son lien est direct, ouvert, sain, et l'hôte reçoit bien ce
qu'il envoie — ce n'est pas un problème de tuyau. La deuxième : les trois
pages sont éveillées d'un bout à l'autre, aucune ne dort — ce n'est pas la
mise en veille. La troisième a nommé la cause : **le fil principal du nouvel
arrivant est bloqué vingt-neuf secondes dans une seule tâche** pendant que son
monde se charge. Il n'émet rien, ne reçoit rien, et l'hôte le retire à
vingt-deux secondes de silence alors que son canal est grand ouvert. Le témoin
neuf ne l'attend plus : il GÈLE la page du troisième joueur vingt-cinq
secondes et vérifie que les deux autres le voient toujours. Rouge sur la
version publiée (le joueur disparaît pour les deux autres, et lui-même perd
tout le monde), vert deux fois de suite sur la correction.

---

## v265 — Les jets volent bien plus vite, et les commandes de vol tiennent ensemble

**Pourquoi.** Max, capture d'iPhone du chasseur en vol de nuit : « Jet should
fly faster, button pour les roues mal placé, pas élégant ». Les trois avions
volaient à 95 et 110 blocs par seconde depuis la v229, et ce n'était pas un
goût : le monde ne se maillait pas assez vite pour suivre plus rapide. La
v229 l'avait écrit noir sur blanc — « le seul moyen de reprendre est de
mailler plus vite ». Et sur la capture, les deux boutons du vol flottaient en
plein ciel, dans deux colonnes différentes, au-dessus d'une manette qu'ils ne
touchaient pas, pendant que le compteur « 684 km/h » se repliait sur deux
lignes sous le curseur blanc.

**Ce que ça change.** Le chasseur et le Concorde passent de 110 à 160 blocs
par seconde — 576 km/h au compteur, presque la moitié en plus — et l'avion de
ligne de 95 à 120. Le paysage arrive quand même : il est même plus complet
qu'avant, parce que le mailleur ne travaille plus à sec. Décollage, approche
et atterrissage ne bougent pas d'un chiffre : ce qu'un enfant a appris
continue de marcher. Et les commandes de vol deviennent un seul instrument
dans le coin bas-droit : deux colonnes jumelles, la manette des gaz à
l'extrême droite, à sa gauche ✈️ et 🛞 l'un sous l'autre avec la vitesse
dessous. Chaque bouton porte son mot, et le mot dit l'état — DÉCOLLER ou SE
POSER, train SORTI ou RENTRÉ. Le bandeau de message ne déborde plus de
l'écran et passe sous le cadran de cap.

**Ce qui le prouve.** La vitesse a été remesurée au même critère que la v229 —
le trou devant soi, médiane sur six relevés, à la distance d'affichage de
l'iPad, en campagne et sur un couloir de villes. Avec l'ancienne file de huit
morceaux, voler à 110 laissait un trou à 91 et 82 blocs, et 160 l'aurait
laissé à 51 ; avec la file de seize, 160 blocs par seconde rend 125 et 122 —
exactement la qualité que la v229 avait retenue pour fixer son plafond, et
bien mieux que ce que la famille a aujourd'hui. Et le premier jet de cette
livraison, qui poussait la file à quarante-huit et les avions à 190, a été
REFUSÉ par le portail : sept suites rouges, toutes de cadence, parce que le
fil principal passait son temps à installer les géométries. La file se choisit
sur deux chiffres, le débit et la cadence ; seize est le genou mesuré. Le
témoin du chargement en vol prend le chasseur, qui n'y était pas. Trois témoins neufs
mesurent les commandes sur l'écran rendu : une seule colonne collée à la
manette, la vitesse hors de la manette et sur une ligne, rien qui recouvre
« Descendre », et le mot de chaque bouton. Captures au sol et en vol, à la
taille d'un iPhone.

---

## v264 — Les flammes des réacteurs

**Pourquoi.** Max, capture du chasseur en vol : « j'aimerais qu'on puisse
voir les flammes sortir du réacteur quand l'avion se déplace ». Un avion à
pleins gaz sur la piste et un avion garé se ressemblaient trait pour trait :
rien ne disait que les moteurs tournaient, ni combien la manette demandait.

**Ce que ça change.** Chaque réacteur a sa flamme — deux sur l'avion de
ligne, quatre sur le Concorde, une à la tuyère du chasseur — un cœur clair
et une gaine orange qui sortent de la sortie du réacteur, vers la queue. La
longueur suit la manette des gaz (v262) — et, manette non touchée, le
trajet assisté de ✈️ : à fond au décollage, l'approche en finale, ralenti
au freinage — rien à l'arrêt moteurs coupés, longue à pleins gaz, plus
courte dès qu'on réduit ; elle vacille un peu. Les flammes s'éteignent quand on descend. Aucune lampe en
plus (quatre pour tout le jeu), l'éclairage du monde ne change pas.

**Ce qui le prouve.** Trois témoins neufs dans `monte.js`, qui lisent les
maillages de flamme du modèle (`userData.tuyeres`) : les trois fabriques
comptent 2, 4 et 1 tuyère ; monté par le bouton sur une piste, à l'arrêt
aucune flamme n'est dessinée, et en vol après ✈️ chacune est visible et
longue ; manette à fond puis réduite à 20 %, la flamme raccourcit de plus de
moitié, et elle est éteinte une fois descendu. Rouges sur l'ancien code
(pas de tuyère). Captures de derrière, avion de ligne et chasseur, dans
`scratchpad/v264/captures`.

Portail complet, sept suites : `carteMonde`, `maj`, `carte` et `reglages`
vertes. Les rouges de `monte.js` et de `reseau.js` ont été rejoués SEULS
dans les deux arbres et sont déclarés dans `TASKS.md` — le gel du premier
survol de Paris (branche 4 133 ms, `origin/main` 4 117), le maillage en vol
dont la borne de garde n'est pas atteinte (66 blocs parcourus contre 76), et
surtout un défaut de PRODUCTION que cette livraison n'a pas causé : à trois
joueurs, le second invité voit les deux autres et n'est vu de personne —
même relevé au caractère près sur `origin/main`. Le conteneur du banc a
redémarré en cours de route et rend 4,4 images par seconde là où il en
rendait 5,4 : deux bornes de garde de `monte.js` tombent sous ce régime en
ne mesurant rien, ce qui est noté comme une passe à faire.

## v263 — Le cadran de cap : la ville visée au loin

**Pourquoi.** Max : « un cadran de pilote en avion : la ville visée au
loin ». Aux commandes, l'enfant tient l'altitude et le cap au joystick
(v228) ; rien ne lui disait vers QUOI il volait. Le monde fait des milliers
de blocs de large, à cent blocs par seconde on ne reconnaît rien avant d'y
être, et un enfant qui a décollé de Roissy pour aller à Lyon partait au
jugé, souvent vers la mer.

**Ce que ça change.** Aux commandes, et seulement là, un cadran en haut de
l'écran : le cap en degrés et sa lettre (152° SE), la ville la plus proche
dans le cône devant l'appareil — les villes bâties comme les deux cents
engendrées, toutes celles du registre — avec sa distance en kilomètres, et
un repère jaune qui glisse sur une règle quand on tourne : au centre, la
ville est pile devant. Si aucune ville n'est devant, la plus proche est
nommée quand même, avec une flèche du côté où tourner, le repère orange au
bord. Deux villes à distance presque égale ne se relaient pas à chaque
image : celle qu'on nomme reste tant qu'elle est devant et à moins de
quinze pour cent de plus. À pied et en voiture, rien : le cadran s'efface
avec le mode pilote.

**Ce qui le prouve.** Le calcul est pur (`src/cap.js`, lu sous node par la
sonde) et demande son échelle à la projection : depuis Paris cap sur Lyon,
il nomme Lyon à 389 km — 392 dans la vraie vie. Trois témoins neufs dans
`monte.js`, qui lisent le TEXTE du cadran : aux commandes cap sur Lyon,
il nomme Lyon avec sa distance, et la distance diminue de plus de cent
blocs en trois secondes de jeu ; un quart de tour à droite, le cap affiché
passe de 152° à 062° et une autre ville passe devant, et vers +x il dit
090° E — le signe se regarde ; à pied le cadran est `display: none`, et il
l'est de nouveau une fois descendu. Rouges sur l'ancien code (le cadran
n'existe pas, et le témoin le dit). Captures en vol dans
`scratchpad/v263/captures`. Portail rejoué depuis zéro sur les sept suites
que l'aiguillage retient (fumée, `maj`, `carte`, `washington`, `reglages`,
`manhattan`, `monte`) : 387 témoins verts ; cinq rouges, tous dettes
déclarées dans `TASKS.md` aux mêmes valeurs qu'aux v261 et v262 — les
quatre de `manhattan.js` (11684 → 51734, [1,−1]) et le gel du premier
survol de Paris (`monte.js`, 3 283 ms / 37,3 %).

## v262 — Une manette des gaz à droite, le joystick pour le volant

**Pourquoi.** Max, capture en vol : « une vraie option pour faire un vrai
atterrissage, un bouton pour gérer la vitesse : le joystick à gauche pour
la direction et, en multitouch, à droite un cadran qu'on monte/baisse pour
la vitesse. Accélérer et ralentir les voitures, idem pour les avions » ; et
« au volant ou aux commandes, nettoyer les boutons inutiles ». Sur la
tablette une voiture partait à son allure maximale dès que le joystick
touchait l'avant, sans inertie, et tournait de côté comme un piéton ; en
avion la vitesse était automatique (v228) ; et l'écran gardait le saut, la
pioche, la capture et la barre de blocs pendant qu'on conduisait.

**Ce que ça change.** Un cadran vertical à droite de l'écran, en véhicule
seulement : on le monte et on le baisse, en même temps que le joystick à
gauche, et il affiche la vitesse en km/h. En voiture il fixe la vitesse
visée — 60 % du cadran, c'est 60 % de l'allure du modèle —, la voiture
prend sa vitesse en une demi-seconde et freine plus fort qu'elle n'accélère, et
le joystick ↔ tourne le volant, d'autant plus qu'elle roule. Tant qu'on
n'a pas touché le cadran, l'avant du joystick reste l'accélérateur : rien
de ce qu'un enfant sait ne cesse de marcher ; tiré vers soi à l'arrêt, il
fait reculer lentement. En avion le cadran est la manette des gaz : en
croisière il fixe la vitesse, et sous la vitesse de décrochage l'appareil
descend — gaz en bas et manche en avant, on se pose soi-même sur la piste,
train sorti par son bouton 🛞 (rentré par défaut en vol) ; sans le train,
c'est sur le ventre, ça freine deux fois plus fort et le jeu le dit. ✈️
garde ses deux trajets assistés (v261), et le cadran les suit. Au volant,
le saut, la pioche, la capture, le coffre et la barre de blocs s'effacent
et reviennent à pied ; en voiture ✈️ s'efface aussi.

**Ce qui le prouve.** Six témoins neufs dans `monte.js`, sur la page
tactile, à deux doigts par le protocole du navigateur : le cadran à 60 %
fait rouler la citadine à 60 % de son allure (médiane lue sur quatre
secondes, la consigne tenue après avoir lâché) ; le joystick à droite
tourne le volant pendant que le cadran tient la vitesse, sans quitter la
piste ; au volant les cinq boutons de la marche sont `display: none` et le
cadran `block`, et ils reviennent à pied ; aux commandes 🛞 sort et rentre
le train (les trois jambes) et n'existe qu'en avion ; gaz à zéro et manche
en avant, l'appareil touche la piste train sorti, sans ✈️, freine jusqu'à
zéro. Deux témoins de vitesse anciens comptent désormais en secondes de jeu :
le banc rend deux images par seconde et l'inertie se joue par image (une
sonde l'a tracé, `scratchpad/v262/sonde-vitesse.cjs`). Captures du cadran
au volant et en vol (`scratchpad/v262/captures`). Portail complet rejoué :
482 témoins verts ; six rouges, tous dettes déclarées dans `TASKS.md` — les
quatre de `manhattan.js` (mêmes valeurs), le gel du premier survol de Paris
(`monte.js`) et « la reprise tient dans la durée » (`reseau.js`, le même
délai de silence qu'à la v261, `seen` à 20 295 ms) — et la fin de
`manhattan.js` qui a PENDU seize minutes sur un `evaluate` sans délai, deux
Manhattan rendues en logiciel, terminée à la main et déclarée.

## v261 — L'avion décolle de sa piste, et s'y pose

**Pourquoi.** Max : « les avions devraient avoir une vraie motion de
décollage-atterrissage, avec accélération sur la piste puis décollage en
levant le nez ; idem à l'atterrissage, baisser l'altitude et ouvrir le
train ; et aussi le roulage sur la piste. » Depuis la v228 le bouton ✈️
arrachait l'appareil du sol sur place, à plat, et « se poser » était une
descente à l'aveugle jusqu'au sol, train jamais rentré ; au sol, un avion
ne roulait pas — on montait dedans et l'on partait à la verticale.

**Ce que ça change.** Un vol se fait comme un vrai. Au sol, le joystick
fait rouler l'appareil (six blocs par seconde) et la roue avant le fait
tourner — seulement s'il roule. ✈️ met les gaz : l'appareil accélère sur la
piste, nez au sol, et à sa vitesse de rotation le nez se lève et il monte
au palier ; le train rentre huit blocs plus haut. En vol, rien ne change
(joystick pour la hauteur et le cap, regard libre). ✈️ à nouveau : la
vitesse tombe à l'approche, le train sort, l'appareil descend nez un peu
bas, s'arrondit sous six blocs, touche, freine jusqu'à l'arrêt — et l'on
roule à nouveau au joystick. Un second ✈️ en finale remet les gaz. Chaque
appareil garde son caractère, dans sa fiche : l'avion de ligne roule 49
blocs avant de lever le nez, le Concorde 57, le chasseur 13 ; ils freinent
sur 34, 43 et 21. Les messages disent chaque étape (« Pleins gaz ! Le nez
se lève tout seul », « Posé·e ! On freine… », « À l'arrêt. Le joystick
fait rouler, ✈️ redécolle »), et le bouton de la monture dit « Descendre »
au lieu de « Se poser », qui est désormais le travail de ✈️.

**Ce qui le prouve.** Cinq témoins neufs dans `monte.js`, sur une piste de
pierre de trois cents blocs posée au-dessus du relief, aux commandes PAR LE
BOUTON, un relevé tous les dixièmes de seconde : ✈️ accélère sur la piste
et le nez ne se lève qu'à la vitesse de rotation (roulement mesuré 49
blocs, entre 20 et 90 exigés, assiette nulle au sol) ; à la rotation le nez
du MAILLAGE est plus haut que sa queue (2,7 blocs, lus dans la matrice
monde — le signe est mesuré, pas déduit) ; l'appareil monte au palier et le
train est rentré en croisière (les trois jambes invisibles) ; 🛬 descend
train sorti, touche, freine jusqu'à zéro sur la piste (arrêt à 271 blocs) ;
à l'arrêt le joystick fait rouler sans quitter la piste et tourne (0,87
radian en une seconde et demie). L'ancien témoin « le bouton ✈️ fait
décoller » est remplacé : il mesurait un appareil qui monte sur place, ce
qui est devenu le défaut. Captures de côté et vue de l'enfant à chaque
étape (`scratchpad/v261/captures`). Portail complet rejoué : 542 témoins
verts ; neuf rouges, tous dettes déclarées dans `TASKS.md` — les quatre de
`manhattan.js` (mêmes valeurs que les deux portails précédents), le gel du
premier survol de Paris (`monte.js`), et `reseau.js` sous charge, dont « la
reprise tient dans la durée » qui dit enfin POURQUOI grâce au journal des
retraits posé dans cette livraison : un délai de silence (`STALE`), l'hôte
n'entendant plus un invité neuf qui, lui, l'entend.

## v260 — Chaque voiture roule à l'allure de son modèle

**Pourquoi.** Max : « les voitures devraient aller plus vite et surtout une
vitesse en fonction du modèle (sportive faster than sedan basic) ». Toute
voiture conduite roulait à la même allure, ×3,4 de la marche (10,9 blocs par
seconde), qu'on soit dans la citadine ou dans une Koenigsegg Jesko, et sur
la tablette — où le joystick ne court pas — c'était le maximum absolu.

**Ce que ça change.** Chaque modèle de la flotte a une classe, et chaque
classe son allure : citadine ×3,8 (12 blocs/s), berline et SUV ×4,4 (14),
GT ×5,4 (17), sportive ×6,4 (20), hypercar ×8 (26). La citadine elle-même
va un peu plus vite qu'avant ; une Bugatti, une Koenigsegg, une Rimac vont
plus de deux fois plus vite qu'une berline. Le message « En selle ! Vitesse
×N » dit l'allure du modèle. Le plafond n'est pas un goût : Paris se maille
à 42 morceaux par seconde et une vitesse v en réclame 1,5 × v (v229, v237),
soit 28 blocs par seconde en ville ; l'hypercar reste dessous. À remesurer
sur la tablette.

**Ce qui le prouve.** Un témoin neuf dans `monte.js`, rouge sur l'ancien
code : « une hypercar va plus vite qu'une citadine, et la citadine plus vite
qu'avant » — une citadine et une Jesko invoquées sur un champ plat, montées,
accélérateur enfoncé trois secondes, et l'on lit la vitesse que l'enfant
obtient : la Jesko au moins 1,8 fois la citadine, la citadine au-dessus de
11 — mesuré à la sonde : 11,4 et 24,0 ici, 10,2 et 10,2 sur l'ancien code,
deux tours chacun. Portail complet rejoué.

## v259 — Les passants ne traversent plus la voiture de l'enfant

**Pourquoi.** Max, deux captures : à la Bastille, des passants qui marchent
AU TRAVERS de sa voiture à l'arrêt ; à New York, une passante au travers de
son taxi — « trouve une solution élégante, je ne veux pas un mode violent
comme GTA où ils sont écrasés ». Un piéton ne connaît que les blocs solides
— c'est ainsi qu'il évite les murs et monte les marches — et une voiture n'en
est pas un : ni celle de la rue, ni celle de l'enfant au volant, ni une
voiture garée. Mesuré au banc, huit passants lancés sur la voiture de
l'enfant à l'arrêt pendant douze secondes : entre 287 et 449 relevés sur 120
avec un passant les pieds dans la carrosserie — ils y entraient et y
restaient. Et en roulant sur trois passants plantés dans la rue, la voiture
leur passait au travers.

**Ce que ça change.** Trois gestes de piéton, aucun de GTA. Un passant regarde
un pas devant lui avant d'avancer : si c'est une voiture — de la rue, celle
de l'enfant au volant, une voiture garée ou un avion au poste —, il ne fait
pas ce pas, marque une courte pause et repart de biais, comme il le fait déjà
au bord d'une rue de Manhattan. Devant une voiture qui ARRIVE — de la rue,
ou celle de l'enfant quand il appuie sur l'accélérateur —, il presse le pas
de côté, du côté où il est déjà, sort de son chemin avec de la marge, souffle
un instant et reprend sa promenade. Et la voiture de l'enfant FREINE devant
un piéton au lieu de le traverser, puis repart dès qu'il s'est écarté : on
ne reste pas coincé derrière lui, on ne l'écrase jamais. Une voiture qui a
roulé sur un passant le laisse sortir, même règle que pour la voiture de
l'enfant. Un passant ne NAÎT plus dans une voiture : la place qu'on lui tire
n'est retenue que si elle est libre. L'enfant à pied n'est pas une voiture :
on passe toujours à côté de lui.

**Ce qui le prouve.** Un témoin neuf dans `monte.js`, rouge sur l'ancien
code : « un passant lancé sur la voiture de l'enfant s'arrête et la
contourne au lieu de la traverser » — l'enfant monte dans une voiture à
Rome, huit passants partent droit dessus depuis des points AU NIVEAU DE LA
RUE (un départ tombé dans un immeuble posait le passant sur son toit, d'où il
retombait dans la voiture : vu à la sonde, corrigé dans le témoin), relancés
toutes les deux secondes ; zéro relevé dedans sur trois tours ici, 287 à 449
sur l'ancien code, et les huit marchent des deux côtés. Un second, rouge
aussi sur l'ancien code : « la voiture de l'enfant freine devant un piéton,
qui s'écarte, et elle repart sans lui passer au travers » — trois passants
plantés sur l'axe de la voiture, douze secondes d'accélérateur, zéro relevé
dedans et la voiture a avancé (seize blocs mesurés à la sonde, freinage de
deux secondes pendant que le piéton sort du couloir) ; sur l'ancien code
elle les traverse. Il part d'une rue sans voiture de la rue à portée, sans
mobilier ni marche sur le couloir, sinon il mesure deux voitures nez à nez
ou un réverbère. Et Marlon ne se replace plus dans le nez de la voiture
quand l'enfant conduit. Le portail complet rejoué.

## v258 — Le jeu se prépare avant « Jouer », et la carte ne fige plus l'image

**Pourquoi.** Max, après la v255 : « quand on ouvre la carte, beaucoup de
lag au début, sur les premières minutes » et « ne devrait-il pas y avoir le
temps de télécharger tous les fichiers nécessaires avant de permettre à
l'utilisateur de démarrer le jeu, pour éviter une expérience de lag ? ».
Mesuré au banc, processeur bridé ×4 comme une tablette : le premier fond de
la minicarte bloquait le fil principal 690 ms — 37 000 colonnes d'un coup,
et le fond entier refait toutes les deux secondes, 90 à 240 ms chaque fois
tant qu'elle est affichée ; le fond de la carte du monde, 1 637 ms à
l'ouverture (les deux tiers en hauteurs de terrain, le tiers en couleurs).
Et ce qui lague dans les premières minutes n'est pas un fichier qui manque
— le service worker les a tous — mais ce qui se calcule au premier usage :
les corps réalistes, les programmes de la flotte, le monde autour de
l'enfant (qui se chargeait au point d'apparition pendant l'accueil, puis se
rechargeait là où « Jouer » le téléportait) et les deux fonds de carte.

**Ce que ça change.** Sur l'accueil, une ligne sous les boutons dit ce que
le jeu prépare — « ⏳ Préparation du jeu… personnages 3/9 · programmes
12/25 · carte … » — et « Jouer » comme « Jouer en ligne » restent grisés
jusqu'à ce que tout soit là, borné à quarante-cinq secondes. La position
locale est restaurée dès l'accueil : le monde se charge là où l'enfant va
jouer. La minicarte et la carte du monde préparent leur premier fond
pendant ce temps. Ouverte, la carte du monde calcule son fond par tranches
de huit millisecondes par image, en étirant l'ancien en attendant, et ne le
recalcule que quand la vue en sort ou que le zoom a changé — un glisser
d'un dixième de l'écran n'a plus rien à recalculer. La minicarte repeint
son fond deux lignes par image, en tournant sans fin — le tour en deux
secondes, la cadence d'avant sans son à-coup : un bloc posé apparaît dans
les deux secondes et aucune image ne le paie en entier ; après une téléportation, elle se remplit au lieu de se calculer
d'un bloc, et elle n'engendre plus jamais un morceau sur le fil principal :
un morceau que le worker n'a pas encore livré se peint d'après le relief,
puis se repeint avec ses blocs. Le banc, lui, demande `?prep=0`.

**Ce qui le prouve.** Six témoins neufs, rouges sur l'ancien code. Dans
`maj.js` : « avant « Jouer », le bouton attend que le jeu soit prêt, et une
ligne dit ce qu'il prépare », « et quand il se libère, corps, programmes et
fond de carte sont vraiment là » (sur l'ancien code, le bouton n'attend
jamais et la ligne n'existe pas). Dans `carte.js`, bridés ×4 : « allumer la
minicarte ne fige pas l'image », « ouvrir la carte du monde ne fige pas
l'image », « et la faire glisser non plus » (barre 700 ms ; mesuré 67, 158
et moins de 160 ms ici, 690 et 1 637 sur l'ancien code) ; et « le fond par
tranches est identique au fond d'un seul tenant », octet pour octet — une
optimisation qui découpe doit prouver qu'elle ne ment pas. Et le premier
portail a rendu `maj.js` rouge : la préparation de la minicarte, en boucle
sans fin sur l'accueil, retenait la mise à jour du service worker cinquante
secondes (mesuré, bissection par `?prepmini=0`) — un tour puis l'arrêt, et
le scénario de mise à jour se joue désormais pendant la préparation. Le
deuxième a rendu `carte.js` rouge par intermittence (l'appui long refusé,
« #map-tout jamais stable ») : profil à l'appui, c'était la chauffe des
programmes que le banc faisait EN JEU en appuyant sur « Jouer » tout de
suite — une compilation par image, 1,5 à 2,4 s chacune en rendu logiciel ;
les pages de `carte.js` attendent désormais la chauffe (`pret: true`),
comme l'enfant derrière ses boutons grisés. Portail complet : 639 témoins
verts sur les quinze suites (dix rejouées vertes sur ce code exact, cinq
rejouées après les corrections du banc), 76 minutes en tout ; seuls rouges,
ceux déjà déclarés de `manhattan.js` (quatre, plus sa fin instable) et de
`monte.js` (un). Au portail, allumer la minicarte coûte 10 ms et ouvrir la
carte 37, contre 964 et 872 sur l'ancien code rejoué seul.

## v257 — L'installation se voit, et la tablette dit où passe le temps

**Pourquoi.** Max, après la v255 : « comme dernièrement après chaque mise à
jour, le jeu reste quasiment bloqué pendant une ou deux minutes sur la
home », « s'il y a une installation nécessaire et qu'elle prend une minute,
mets un loader », « le jeu lag énormément sur iPad », et « dans les
réglages, un mode normal ou un mode avancé de qualité de graphisme ».
Mesuré au banc : la mise à jour elle-même se fait en 6 s (installation
0,4 s), mais la page redemandait au réseau ses 78 fichiers à chaque
démarrage pendant que le service worker téléchargeait les mêmes 78 ; le
loader s'effaçait à la première image alors que le fil principal analysait
huit mégaoctets de corps et compilait une cinquantaine de programmes (4,8 s
bloquées au banc, 10,5 s bridé ×4 — et sur Safari une compilation coûte
des centaines de millisecondes, pas dix) ; et le monde était rendu à deux
pixels par point, ombres et quatre lampes comprises, sur une tablette dont
personne ne pouvait lire la cadence.

**Ce que ça change.** Pendant une mise à jour, le loader compte les
fichiers rangés (« 📦 Mise à jour du jeu… 24 / 90 fichiers »). Après le
rechargement sur la version neuve, il reste — « ✨ Installation de la
nouvelle version… personnages 3 / 9, programmes 12 / 38 » — jusqu'à ce que
corps et programmes soient prêts, borné à quatre-vingt-dix secondes ; puis
la fête de mise à jour. Une version ne se revalide plus : son cache se sert
tel quel, et le réseau ne sert qu'à découvrir la suivante. Dans ⚙️
Réglages, « ✨ Graphismes avancés » : éteint, 1,25 pixel par point et pas
d'ombres — le réglage par défaut d'une tablette ou d'un téléphone ; allumé,
pleine résolution et ombres — le réglage d'un ordinateur. Mémorisé sur
l'appareil, appliqué sur place. Et `?diag=1` affiche en haut de l'écran la
cadence médiane réelle, la pire image, les appels de dessin, la résolution
et les réglages actifs ; `?ombres=0`, `?reflets=0`, `?lampes=0`,
`?qualite=tablette` et `?dpr=` isolent un poste en trente secondes, sur
l'appareil.

**Ce qui le prouve.** Trois témoins neufs, rouges sur l'ancien code : dans
`maj.js`, « pendant l'installation, le loader dit combien de fichiers sont
rangés » et « après le rechargement, le loader ne s'efface qu'une fois les
corps et les programmes prêts » ; dans `fumee.js`, « les Réglages ont une
ligne Graphismes qui bascule entre normal et avancé, mémorisée sur
l'appareil ». Trois sondes mesurées avant d'écrire une ligne (mise à jour,
accueil bridé ×1 et ×4, carte bridée ×4), consignées dans `TASKS.md`.
Portail complet : 621 témoins verts en 52 minutes, quinze suites ; les
rouges déclarés de `manhattan.js` (quatre) et de `monte.js` (un), rien
d'autre — et un rouge de HASARD sur le témoin passager de `reseau.js` : un
cerf né près du point d'apparition sur la page d'Alice passait avant la
voiture de l'ami (« 🦌 Monter »). Le témoin vide désormais les bêtes des
deux pages ; rejoué seul sur la branche, il est vert (« 🚗 Monter avec
Marlon », suivi 3,54 blocs, écart 0,59) — et ce rejeu seul a rendu à son
tour la panne de `plafond.js` en v251, cinq « Couldn't load texture blob: »
chez Milo, dont la page se recharge pendant que les corps s'analysent ; même
remède dans le banc, les corps d'abord, et la suite rejouée seule est verte
de bout en bout. Les trois témoins neufs, rejoués
sur `origin/main` (v256) : rouges tous les trois — le loader n'y dit que
« il faut la dernière version pour jouer », s'efface avec 3 programmes sur
25 et les corps absents, et les Réglages n'ont pas de ligne Graphismes.

## v256 — Le panneau 🛠️ s'en va, les Souvenirs restent

**Pourquoi.** Max : « je veux que tu supprimes la fonctionnalité de pouvoir
faire les feux d'artifice, et tout ça — Atelier, Coffre, Quête, Panneau,
Chantier, Records, Chapeaux — à part les souvenirs photos. » Sept onglets
que personne n'ouvrait, une pastille de garde-manger et une jauge de
chantier « qui ne font rien quand on clique » (déjà reproché en v190), une
touche G qui lançait une fusée. Du bruit à l'écran, pour un enfant de sept
ans qui cherche la carte.

**Ce que ça change.** Le bouton 🛠️ devient 🖼️ « Souvenirs » et ouvre
directement l'album photo, sans onglet. Le bouton 🎆 et la touche G ne
lancent plus rien ; le coffre commun, le chantier partagé, la quête, les
records, les chapeaux et l'atelier n'ont plus d'écran ; on ne plante plus
de panneau, mais ceux qu'un enfant a déjà écrits restent dans le monde. Le
garde-manger 🍖 compte encore ce qu'on récolte, sans s'ouvrir. **Aucune
donnée n'est effacée** : records, sac, quête, coffre, chantier, panneaux et
photos restent dans le stockage et dans le nuage, sous leurs clés, tels
quels. Et une tablette restée sur l'ancienne version peut encore envoyer un
coffre ou un chantier : le receveur l'ignore sans casse, et l'hôte relaie
pour que deux anciennes tablettes continuent de se comprendre.

**Ce qui le prouve.** Huit cent cinquante-deux lignes retirées, deux cent
vingt-trois ajoutées, onze fichiers. Huit témoins retirés avec ce qu'ils
gardaient (la pastille touchable, le 🍖 qui ouvre l'atelier, la jauge du
chantier, le chantier commun de bout en bout), trois reformulés, quatre
ajoutés : « le feu d'artifice n'a plus de bouton », « le bouton 🖼️ ouvre
les Souvenirs, sans autre onglet », « la touche G ne lance plus de fusée »
(ni nuage de points dans la scène, ni compteur dans les records) dans
`fumee.js`, et « un chantier ou un coffre envoyé par une ancienne version
est ignoré sans casse » dans `reseau.js`.
Les trois témoins de la fumée sont ROUGES sur l'ancien code, mesurés (le
bouton 🎆 présent, pas de bouton Souvenirs, la touche G ajoute un nuage de
points et compte un feu). Portail : fumée verte, puis onze suites rejouées
en 45 minutes ; sept vertes (parent, visio, maj, carte, hote, reglages,
`reseau.js` au portail suivant seule : 71 témoins verts, la reprise dans la
durée comprise — son rouge de portail est celui de charge déclaré en v253) ;
`manhattan.js` et `monte.js` sur leurs seuls témoins déclarés en dette ;
et la Rotonde de `washington.js`, rouge deux portails de suite au même
endroit et verte seule, corrigée dans le témoin (il marche jusqu'à être
entré, ressorti ou figé trois pas, plus en quatorze pas : plafond 22,
x = −4,0, verte).

## v255 — Le portail d'essai attend ce qui compte, plus le temps

**Pourquoi.** Max : « je veux que tu trouves des solutions pour accélérer la
partie testing, en garantissant le même niveau de qualité, mais beaucoup
plus vite. » Mesuré sur le portail complet de la v251 : 64 minutes de suites
et NEUF minutes d'attente entre elles, 74 en tout. Un inventaire de chaque
attente du banc a nommé les postes : `souffler`, appelé avant chaque page,
lisait la charge MOYENNE d'une minute — un instrument qui retarde de cent
secondes et ne peut pas voir qu'une page vient de mourir : dix minutes par
portail à regarder un nombre qui ne descendait pas, vingt-deux appels sur
trente-huit au bout de leur budget. Entre deux suites, vingt secondes de
sommeil inconditionnel, quinze fois. Et `reseau.js`, la plus longue, passait
en premier : un rouge de `metro.js` se découvrait à la cinquante-neuvième
minute.

**Ce que ça change.** Rien dans le jeu. Le banc lit l'occupation RÉELLE des
cœurs sur la dernière demi-seconde (`tests/charge.js`) : une page fermée
rend la main en moins d'une seconde, une page qu'on garde ouverte exprès
(l'hôte d'une partie) donne une charge stable que rien ne fera baisser, et
l'on cesse de l'attendre en le disant. Le repos entre suites est une
condition bornée, plus un sommeil. `jouerSeul` attend que les neuf morceaux
autour de l'enfant soient maillés, jamais plus que les 3,5 s d'avant. Les
suites courtes passent d'abord : un rouge de géométrie arrive dans les cinq
minutes qui suivent la fumée. Et régler une borne du banc n'annule plus les
quinze acquis de reprise — l'empreinte prend la forme des fichiers du banc,
chiffres effacés, la règle que `bancAnodin` appliquait déjà à l'aiguillage.

**Ce qui le prouve.** Les mêmes quinze suites, les mêmes témoins, et le
portail se chronomètre lui-même : voir « Portail » ci-dessous.
Portail complet, les quinze suites depuis zéro, même machine, même
rendu logiciel, avant et après :

| | v251 (ancien banc) | v255 |
| --- | --- | --- |
| suites | 64 min | 50 min |
| attente entre suites | 9 min | 0 min |
| respiration (`souffler`) | ≈ 615 s | 119 s |
| total | **74 min** | **51 min** |
| premier rouge possible | 20e minute | 4e minute |

Treize suites vertes dont `reseau.js` (15 min 03 s contre 19 min 46 s) ;
`manhattan.js` rouge sur ses quatre témoins déclarés en dette, `monte.js`
sur le seul témoin déclaré des deux côtés (« l'écran ne se fige pas »), rien
d'autre. Deux rouges de portail attrapés et démontés en route : une borne
de garde de `monte.js` posée à 98 % d'une mesure de banc (500 pour 490
relevés, zéro saut — ramenée à la moitié, 568 relevés au rejeu) et la
Rotonde de `washington.js`, verte rejouée seule (plafond 21, x = −4,9),
déclarée dans `TASKS.md` avec ses deux mesures. Et un rouge de fumée qui
était à moi : la première condition de `jouerSeul` lisait un champ absent
et jetait dans la page — une condition de banc ne doit jamais pouvoir
jeter dans la page.

## v254 — Le badge de version raconte les nouveautés

**Pourquoi.** Max : « quand l'utilisateur clique sur le logo de mise à jour,
ça lui affiche une modale, il peut la fermer, pour voir tout ce qui est
nouveau sur chaque version. Du contenu extrêmement court, des bullet points,
des phrases de quelques mots. Et un backfill complet des anciennes mises à
jour. » Jusqu'ici, toucher le badge forçait une mise à jour — un geste de
parent, pas de curiosité — et rien dans le jeu ne disait ce qu'une version
apportait ; le journal complet vit dans le dépôt, pas sur l'iPad.

**Ce que ça change.** Toucher le badge de version, sur l'accueil, ouvre
« ✨ Quoi de neuf ? » : chaque version, de la plus récente à la première,
avec un titre de quelques mots et deux à cinq puces d'au plus huit mots,
écrites pour un enfant ; la version installée est marquée « ← ta version ».
La croix, un toucher à côté ou Échap la ferment. La mise à jour forcée
reste possible : c'est le bouton « 🔄 Mettre à jour » en bas de la modale.
Cent deux entrées reprennent tout le journal depuis les débuts.

**Ce qui le prouve.** Deux témoins de plus dans `maj.js`, rouges sur
l'ancien code (pas de modale ; pas de fichier) : sur l'accueil, le badge
ouvre le journal, la version servie par `sw.js` est en tête avec au moins
une puce, la version installée est marquée, la croix le ferme ; et, sous
node sans navigateur, chaque « ## vNNN » de `CHANGELOG.md` a son entrée dans
`src/nouveautes.js`, aucune puce ne dépasse huit mots, aucun titre six.
Et un troisième rouge attrapé AVANT la fusion par le portail lui-même :
fermée, la modale couvrait tout l'écran (`display: flex` l'emportait sur
`hidden`) et avalait les gestes de la carte — `carte.js` l'a dit, le témoin
vérifie désormais par `elementFromPoint` qu'aucun voile ne reste.
Portail : fumée verte, puis `reglages.js`, `carte.js`, `maj.js` vertes (220
témoins) ; `manhattan.js` rouge sur exactement les quatre témoins déclarés en
dette dans `TASKS.md` depuis la v242 (rendu logiciel), rien d'autre.

## v253 — À plusieurs, on voit l'ami dans sa voiture, et l'on monte avec lui

**Pourquoi.** Max, après la v249 : « En multijoueur, on ne voit pas si un
user est dans une voiture, il est piéton alors qu'il est dans une voiture.
Aussi permets que plusieurs joueurs rentrent dans un moyen de transport : le
premier conduit, les autres restent passagers. » Le réseau ne diffusait que
la position des joueurs : Marlon au volant, Alice voyait un enfant à pied
qui glisse à toute vitesse. C'est la dette de la v155 (« un véhicule conduit
doit se voir en ligne »).

**Ce que ça change.** La position d'un joueur emporte désormais son
véhicule (l'espèce et, pour une voiture, son modèle de flotte) : chez les
autres, l'ami est assis dans SA voiture — dessinée avec la même fabrique
que la monture, l'avatar assis au volant comme le sien depuis la v249 — et
redescend à pied quand il descend. Et l'on monte avec lui : à moins de neuf
blocs de la voiture d'un ami, le bouton dit « Monter avec Marlon » ; on est
assis sur un siège passager (trois sièges par voiture, dans la fiche), la
voiture nous emmène, les commandes ne servent à rien, un appui descend.
Chez le conducteur comme chez les autres, le passager est vu assis dans la
voiture. Une tablette restée sur l'ancienne version ignore les deux
nouveaux champs et voit l'ami à pied, comme avant.

**Ce qui le prouve.** Trois témoins de plus dans `reseau.js`, rouges sur
l'ancien code, sur la partie à trois qui ouvre la suite : Marlon prend le
volant d'une voiture posée devant lui, et chez Alice son avatar est assis
dans une voiture dessinée (enfant de son maillage) ; Alice se place à trois
blocs, appuie sur « Monter avec Marlon », Marlon roule trois secondes sans
qu'elle touche à rien — elle a suivi de 3.54 blocs (lui : 3.81), à
0.59 bloc de lui ; et chez Marlon, Alice est assise dans sa voiture.
Portail : voie longue, sept suites ; `reseau.js` (74 témoins), `visio.js`,
`carte.js`, `washington.js` et `hote.js` vertes, `monte.js` sur le seul gel
de téléportation déclaré, `manhattan.js` sur ses quatre rouges déclarés de
ce banc. Deux rouges de charge démontés en route : « la reprise tient dans
la durée » (rouge après un `souffler` à sa limite, vert à la passe
suivante et seul), et un témoin du banc qui lisait le cache du plafond
comme un nombre — corrigé dans le banc, pas dans le jeu.

## v252 — La voiture de l'enfant ne traverse plus le mobilier des rues

**Pourquoi.** Max, après la v249 : « les voitures peuvent aussi passer à
travers des fois le mobilier urbain comme les tables de Times Square ».
Mesuré d'abord : les soixante-dix-neuf tracés de taxis de Manhattan restent
à neuf blocs des trente-deux tables — la circulation ne les touche jamais.
C'est la voiture de l'ENFANT : sa boîte de collision ne connaît que les
blocs solides, et un réverbère, une jardinière, un banc, une table sont des
props non solides (c'est voulu pour la marche, un enfant passe entre), et à
Manhattan le mobilier est un maillage sans bloc du tout. Sur une rue de
Paris, un réverbère posé six blocs devant la voiture : elle passait dessus à
0,2 bloc du poteau.

**Ce que ça change.** Au volant, la voiture s'arrête devant le mobilier —
réverbères, feux, jardinières, meubles et objets posés par les enfants dans
toutes les villes, et à Manhattan les tables et chaises de Broadway piéton,
les bancs, les réverbères, les arbres et les bornes. À pied, rien ne change.
Une voiture garée contre un banc repart quand même : on ne bloque que le pas
qui ENTRE dans le mobilier, pas celui qui en sort. Et une voiture de la rue
collée à la nôtre ne nous laisse plus traverser un réverbère pour autant :
l'exception « déjà dedans » se juge famille par famille (circulation d'un
côté, mobilier de l'autre).

**Ce qui le prouve.** Deux témoins de plus dans `monte.js`, rouges sur
l'ancien code. Le premier prend le volant sur une rue de Paris sans voiture
de rue à portée, pose un réverbère six blocs devant et roule jusqu'à
l'arrêt : la voiture s'immobilise à 2,5 blocs du poteau (0,2 sur l'ancien
code, 15 blocs parcourus au travers). Le second vérifie ce qui rend la même
chose possible à Times Square, où ce banc ne conduit pas (une image par
seconde à Manhattan en rendu logiciel) : le secteur de Broadway bâti, la
table du plan (−91, −60) est notée au registre du renderer et le crochet du
joueur refuse le pas qui l'atteindrait, pas celui qui en reste à six blocs
(pas de registre sur l'ancien code). Portail : voie longue, cinq suites ;
`carte.js`, `washington.js` et `plafond.js` vertes, `monte.js` sur le seul
gel de téléportation déclaré, `manhattan.js` sur ses quatre rouges déclarés
de ce banc. Trois rouges de banc démontés en route et corrigés dans le banc,
pas dans le jeu : `plafond.js` rechargeait pendant l'analyse des corps
réalistes ; la boucle de montée de `monte.js` recliquait sur un bouton-bascule ;
et le témoin de circulation posait l'enfant hors du tracé sur une rue qui
tourne.

## v251 — Le monde se maille hors du fil principal : moins de lag en avion et en voiture

**Pourquoi.** Max, sur l'iPad, après la v248 : « Lag mieux mais pas
suffisant. En avion le lag est fort. En voiture lag et aussi la définition
des bâtiments s'affiche trop tard. » Mesuré : engendrer et mailler un
morceau de Paris coûte 24 ms, et cela se faisait DANS l'image, sur le fil
qui anime et dessine. Le budget de maillage (720 ms par seconde, v237)
prenait aux images tout ce qu'il pouvait — c'est le lag — et ne suffisait
même pas à suivre une voiture : 27 morceaux par seconde pour 30 réclamés,
d'où les bâtiments qui arrivent tard. En vol au-dessus de Paris, le fil
principal passait 324 ms de chaque seconde à mailler.

**Ce que ça change.** Un monde jumeau — le même générateur, les mêmes blocs
de l'enfant — engendre et maille les morceaux sur son propre fil (un Web
Worker) et rend au jeu des tampons prêts pour la carte graphique, plus les
blocs pour les collisions ; le fil principal ne fait plus que les installer.
Les images ne paient plus le maillage, et le monde se charge à la vitesse
du worker, quelle que soit la cadence d'affichage. Manhattan (ses façades,
ses journaux importés) reste maillée comme avant ; poser un bloc se voit
toujours dans l'image. Un navigateur sans worker de module retombe sur
l'ancien chemin. Ce qui n'a pas bougé : les blocs eux-mêmes, bloc pour
bloc — un témoin le garde.

**Ce qui le prouve.** Deux témoins de plus dans `monte.js`, rouges sur
l'ancien code (qui n'a pas le compteur et le dit). En vol au-dessus de
Paris à la distance d'affichage de l'iPad, le fil principal passe
0 ms par seconde à mailler (324 avant) et 428 morceaux
arrivent du worker en huit secondes ; et 12 morceaux adoptés du
worker, comparés à ce que le fil principal engendrerait, sont identiques
bloc pour bloc. Sur le même vol, le fil principal n'engendre plus que
vingt-neuf morceaux en huit secondes (41 ms, pour les bras des réverbères
et un passant) contre quatre cent soixante-neuf. La pire image de ce banc,
elle, ne tranche pas (202 ms sur l'ancien code, 252 avec le worker, 457 sur
le repli local de la branche : une seule fenêtre de huit secondes, en rendu
logiciel) — on mesure la cause, pas l'effet. Et ce que ce banc ne peut pas
montrer : ses quatre cœurs font tourner le worker À CÔTÉ du rendu logiciel,
et le front de chargement y recule un peu (144 → 120 blocs devant l'avion)
— sur l'iPad, le rendu est sur la carte graphique et le worker a un cœur à
lui. Les témoins de
chargement en vol (« on ne rattrape pas le bout du monde qui se charge »)
restent verts. Les gardiens du mailleur sont toutes les suites : portail
complet — et ce portail complet a trouvé une dette de la v249 : « à minuit,
les fenêtres de la ville restent allumées » (`carteMonde.js`) comparait le
NIVEAU des lampes à la COULEUR du matériau des fenêtres, et les planchers
de nuit de la v249 l'avaient rendu rouge pour toujours sans que personne ne
le voie (cette suite ne garde pas `main.js`). Il lit désormais des pixels :
un mur de pierre percé de fenêtres d'étage, à minuit, fenêtre allumée à
178 contre 33 pour le mur (fenêtre éteinte à 73).

## v250 — Les roues de la Lucid tournent autour de leur essieu, et toute la flotte est passée en revue

**Pourquoi.** Max, capture d'iPhone : « Gravity design ko, wheels ». Les
roues de la Lucid Gravity sortaient de leurs passages de roue, de biais,
comme des assiettes qu'on fait tourner sur la tranche. La cause n'était pas
dans le modèle : `rotation.x += angle`, qui fait tourner toute roue du jeu,
est un Euler XYZ dont la rotation en x s'applique EN DERNIER, donc autour du
x du PARENT du pivot. Les pivots que le jeu fabrique pour un modèle hors
manifeste naissaient directement sous le modèle, avant qu'il ne soit tourné
d'un quart de tour ; sur un modèle dont la longueur est x — la Lucid, la
Chiron Stealth — ce x était l'axe avant-arrière. Les cinquante modèles du
manifeste, dont les pivots sont ceux de l'auteur, n'ont jamais eu ce défaut.

**Ce que ça change.** Chaque pivot fabriqué naît dans un groupe-essieu dont
le x est la voie, orienté pour qu'un angle positif avance le haut du pneu
vers le nez comme sur le manifeste : la Lucid Gravity et la Chiron Stealth
roulent roues dans leurs arches. Et, comme Max l'a demandé (« sois proactif
sur ce genre de bug »), la flotte entière a été passée en revue : une sonde
rend les cinquante-deux modèles de trois quarts et de côté, roues tournées
d'un tiers de tour, et mesure pour chacune des deux cent huit roues l'axe
autour duquel elle tourne et où part le haut du pneu.

**Ce qui le prouve.** Un témoin de plus dans `monte.js` : il charge les
cinquante-deux modèles et exige, pour chaque roue, que l'axe de
`rotation.x` soit la voie et qu'un tiers de tour avance le haut du pneu vers
le nez sans le déplacer de côté. Le même bloc de mesure, rejoué sur
`origin/main` et sur la branche : huit roues fausses sur deux cent huit
(les deux modèles hors manifeste, axe (0, 0, 1) et pneu qui part de côté)
contre zéro. Planche-contact des cinquante-deux modèles, avant et après,
regardée à la main.

## v249 — Paris n'est plus dans le noir, et l'on voit le personnage conduire

**Pourquoi.** Deux signalements de Max, capture d'iPad à l'appui. « Paris est
dans le noir » : une rue de nuit noire, des façades noires, seules les
fenêtres allumées se devinaient. La cause est une erreur de mesure : le banc
coupe ses ombres (rendu logiciel), donc les captures de nuit de la v247
étaient éclairées par la lune partout ; sur l'iPad les ombres existent, la
rue est dans l'ombre des immeubles, et il n'y restait que la lueur du ciel,
réglée à 5,7 sur 255 au sol et 2,6 sur un mur. Et « fais en sorte qu'on voit
le personnage conduire » : la vue de poursuite montrait une voiture vide.

**Ce que ça change.** La nuit, une rue dans l'ombre de la lune reste lisible
— la lueur du ciel et la lune sont réglées sur une page à ombres forcées,
comme sur la tablette ; le jour ne change pas d'un cran. Et quand l'enfant
conduit, son personnage — le même que les autres joueurs voient de lui,
avec sa tenue choisie et sa propre peau — est assis au volant, cuisses en
avant, bras tendus vers le volant, visible à travers le pare-brise et la
lunette arrière, la tête sous le pavillon — mesuré dans la carrosserie de
chaque modèle, une voiture basse assied l'enfant plus bas (Max : « le
personnage passe à travers la carrosserie ») ; il descend avec lui. Le siège est déclaré dans la fiche
de la voiture (`siege`), à côté de `montable` et `gabarit` : un cheval ou un
avion sculpté n'en a pas et ne le montre pas.

**Ce qui le prouve.** Deux témoins de plus dans `monte.js`, rouges sur
l'ancien code. Le premier lit des pixels sur la page à ombres forcées : un
mur de pierre de huit blocs fait une façade, et le sol dans son ombre de
lune passe de 5,7 à 41,5, le mur de 2,6 à 28,2 (bornes à la moitié : 22 et
14). Le second monte dans une voiture par le bouton et vérifie que
l'avatar de l'enfant est enfant du maillage de la voiture, dans son
habitacle, dans le cadre de la caméra, le visage tourné vers la route
(Max a attrapé le premier jet, assis de dos), et qu'il en sort quand on
descend — absent sur l'ancien code. Captures rue et ciel, jour et nuit, à Paris.

## v248 — Les réverbères éclairent la rue la nuit, dans toutes les villes

**Pourquoi.** Deuxième étape du programme « New York partout » (Max : « sois
autonome, améliore la carte, le réalisme partout »). Manhattan a quatre
lampes de rue qui font des flaques de lumière chaude sur ses avenues la
nuit. Ailleurs, mesuré à Paris, Londres et Rome sur captures de nuit : les
deux cent soixante-neuf villes engendrées plantent bien un réverbère tous
les neuf blocs, mais sa lanterne est un bloc peint qui n'éclaire rien — la
rue sous lui est aussi noire qu'à côté ; et les six villes bâties à la main
(Paris, Londres, Nice, Lille, San Francisco, Washington) n'avaient AUCUN
réverbère, pas un seul. Une ville la nuit, c'était des vitres allumées et
des rues noires.

**Ce que ça change.** Chaque ville bâtie à la main a désormais ses
réverbères au bord du caniveau, un tous les neuf blocs, la crosse tournée
vers la rue — sans rien connaître de la trame de la ville : le monde regarde
de quel côté du trottoir est la chaussée. Et la nuit, les quatre réverbères
les plus proches de l'enfant éclairent vraiment : une flaque de lumière
chaude sur le trottoir et la chaussée, qui suit l'enfant de lanterne en
lanterne quand il marche. Cela vaut pour les villes engendrées aussi, dont
les réverbères existaient déjà, et pour un réverbère que l'enfant pose
lui-même (l'objet 🛞 de l'inventaire) devant sa maison. Le jour, rien ne
change. Et New York garde ses lampes : ce sont les MÊMES quatre lumières,
prêtées à Manhattan quand l'enfant y est — parce qu'en ajouter d'autres
aurait recompilé tous les programmes de shaders à chaque entrée et sortie de
la ville, c'est-à-dire rendu le gel de téléportation que la v246 vient
d'enlever.

**Ce qui le prouve.** Deux témoins de plus dans `monte.js`, rouges sur
l'ancien code. Le premier lit des PIXELS : l'enfant pose un réverbère sur
une dalle de pierre, la nuit tombe, et le sol à son pied est mesuré contre
le sol huit blocs plus loin — 132 contre 19 ici, 12,9 contre 12,4 sur
l'ancien code (rapport un : la lanterne ne faisait rien). Le second lit les
BLOCS que le générateur pose autour du centre de Paris, Londres, San
Francisco et Washington : 29, 48, 141 et 12 réverbères, chacun (à trois
près, sous les culées des ponts de Paris) avec de la chaussée pour voisin ;
zéro partout sur l'ancien code. Le témoin des villes engendrées de
`carteMonde.js`, qui compte déjà leurs réverbères, ne bouge pas.
L'intensité (28, portée dix-huit blocs) est réglée sur captures de nuit à
Paris et à Rome, rue et ciel.

## v247 — Le regard de New York partout : le soleil éclaire le monde, les ombres se portent, le ciel est une voûte

**Pourquoi.** Max : « regarde les améliorations qu'il y a encore eu dans la
ville de New York et reproduis-les sur l'ensemble de la carte. Sois
autonome, améliore la carte, le réalisme partout. » Mesuré sur captures, rue
et ciel, jour et nuit, à Paris et à New York : Manhattan était éclairée par
le soleil, portait des ombres et passait par une correspondance tonale ; le
reste du monde était un matériau NON éclairé dont la couleur servait de
lumière. Une façade au soleil et une façade à l'ombre avaient la même
teinte, rien ne portait d'ombre, le ciel était une couleur unie, et la nuit
n'était qu'un jour assombri — Paris à minuit ressemblait à Paris à midi en
gris. C'est la première étape du programme « New York partout » : le
regard.

**Ce que ça change.** Sur toute la carte, les blocs, l'eau et le paysage
lointain sont éclairés par le ciel et par le soleil, qui porte des ombres
autour de l'enfant (une caméra d'ombre de cent quatre-vingt-dix blocs qui le
suit, comme à Manhattan) ; le rendu passe par la même correspondance tonale
que New York ; le ciel est une voûte dégradée, plus profonde au zénith ; la
nuit, la lune éclaire bleu et faible, le ciel est noir d'étoiles et les
villes gardent leurs vitres allumées. Le matin, la face est d'un immeuble
est au soleil ; le soir, sa face ouest. En quittant New York, le monde garde
ses ombres. Ce qui n'a pas bougé : les blocs, les textures, l'occlusion
ambiante cuite dans les sommets, les villes elles-mêmes.

**Ce qui le prouve.** Trois témoins de plus dans `monte.js`, lus dans les
PIXELS rendus et rouges sur l'ancien code (les trois rapports y valent un) :
à midi, le sol dans l'ombre d'un pilier est plus sombre que le sol au soleil
(58 contre 104) ; le matin la face est du pilier est au soleil (72 contre
31), le soir sa face ouest ; le ciel est plus profond au zénith qu'à
l'horizon (156 contre 181). Les intensités ont été réglées sur captures — le
premier jet, calqué sur Manhattan, rendait un ciel blanc et des toits
blancs. Et le coût est mesuré : au banc en rendu logiciel, à Paris, une image
passe de 217 ms sans ombres à 383 avec (carte de 1 024, filtre simple, seuls
les morceaux proches portent une ombre) — assez pour faire tomber quatre
bornes de garde d'autres témoins au premier portail, sur du code sain. Le jeu
coupe donc ses ombres de lui-même quand il rend en logiciel, sans carte
graphique ; les trois témoins du regard les forcent sur leur propre page. Le
coût sur l'iPad, qui a sa carte graphique, est déclaré dans `TASKS.md` avec
ses leviers.

## v246 — La téléportation ne fige plus l'écran, la Bugatti roule sans traînées, et chaque ville a ses propres voitures

**Pourquoi.** Max, capture d'iPad à l'appui, le 12 septembre : « Le lag est
bien présent quand on fait une téléportation, à peu près dix secondes », « la
Bugatti quand elle avance, il y a des trucs noirs qui bougent autour, pas très
propres », « assure-toi que toutes les villes ont de la diversité dans les
voitures », « améliore le design de la Lucid Gravity ». Mesuré : à l'arrivée à
Paris, la carte graphique compilait VINGT programmes de shaders dans les
images où les premières voitures apparaissaient — seize avant, trente-six
après, une seconde et demie au banc, et sur une tablette c'est l'écran qui se
fige — et les dix-huit passants naissaient dans la MÊME image, chacun avec son
clone de squelette. Les « trucs noirs » de la Chiron Stealth étaient ses
bandes de carrosserie accrochées au pivot de la roue arrière droite : le
chargeur reconnaissait une pièce de roue à la sous-chaîne « rim », et
« trim » — la garniture — en contient une ; la garniture tournait donc avec
la roue, jusqu'au toit. Le MÊME défaut déformait la Lucid Gravity, dont des
panneaux entiers tournaient sur eux-mêmes. Et la graine d'un convoi valait
« nombre de points du tracé + rang dans la file » : les villes engendrées,
aux anneaux semblables, tiraient les mêmes vingt modèles dans le même
ordre, et chaque modèle arrivait toujours dans sa couleur cuite dans le
fichier — vingt Bugatti bleues dans vingt villes.

**Ce que ça change.** Les programmes de la flotte, des corps humains et du
chien se compilent pendant que l'enfant lit l'accueil, une signature par
image, à partir d'une table LUE dans les fichiers (dix-neuf signatures, pas
les onze que mon premier relevé des matériaux annonçait : la plupart des
carrosseries arrivent sans normales et se rendent en ombrage plat, un
programme à part) ; à l'arrivée en ville, plus rien ne se compile. Les
passants naissent par tranches de cinq millisecondes par image. Une pièce
de roue est un mot entier (`wheel`, `tire`, `rim`…) ET une géométrie qui
tient dans le pneu : la Bugatti roule propre, la Lucid retrouve sa forme —
quatre pivots de trois pièces chacun. Chaque convoi tire sa graine de la
position de sa ville, et deux voitures sur trois reçoivent une laque à elles
(la troisième garde sa livrée d'origine, pour qu'une Ferrari rouge reste
rouge) : à Moscou, douze voitures visibles, sept modèles, huit couleurs.

**Ce qui le prouve.** Six témoins de plus dans `monte.js`, tous rouges sur
l'ancien code : rien de la carrosserie ne tourne avec une roue sur les deux
modèles déposés ; les passants naissent par tranches, jamais tous dans la
même image ; à Moscou, les voitures visibles sont de modèles et de couleurs
différents ; deux villes aux anneaux semblables ne tirent pas la même file ;
se téléporter à Paris, sur une page neuve, ne compile plus les programmes des
voitures sur place (zéro programme neuf, vingt avant — et le témoin vérifie
que le RENDU a tourné : une boucle morte rend zéro programme et ne prouve
rien, vu au banc sur une erreur de ma propre livraison) ; et la table des
programmes à chauffer est exactement ce que les soixante et un fichiers de
voitures et d'humains contiennent, ni signature manquante ni signature morte
— le jour où Max dépose un modèle d'une autre facture, c'est ce témoin qui
le dit.

## v245 — L'accueil répond tout de suite, la voiture ne saccade plus, et la rue s'arrête devant l'enfant

**Pourquoi.** Max, sur l'iPad de quatre ans : « quand on allume le jeu, il
faut attendre quasiment vingt secondes le temps de pouvoir cliquer sur le
bouton », et « quand on essaie de conduire une voiture, la voiture avance de
manière hyper saccadée. La marche, c'est ok. » Mesuré : les neuf corps
réalistes des personnages (8,2 Mo, quatre-vingts pour cent de tout ce que le
jeu télécharge) étaient attendus par `humains.js` AVANT que `main.js` ne
s'exécute — aucun bouton n'était attaché tant qu'ils n'étaient pas arrivés
et analysés — et ils se re-téléchargeaient à CHAQUE livraison, c'est-à-dire
tous les jours. Au volant, assis dans une voiture à l'arrêt, une image sur
quatre durait trois fois la médiane, par paires à une demi-seconde d'écart :
la sonde des reflets de carrosserie rendait ses six faces dans la même
image, et chaque face soumettait au pilote autant d'appels de dessin que la
vue de l'enfant (jusqu'à 455). À pied elle ne tourne pas — c'est exactement
« la marche, c'est ok ». Et Max, dans la foulée : « les voitures passent les
unes sur les autres ». Mesuré sur la rue de Rivoli, l'enfant au volant : à
l'arrêt sur la chaussée, un convoi entier lui passait AU TRAVERS (79 relevés
sur 100 avec une voiture de la rue dans la sienne ; 71 sur 94 en roulant). Les
convois cédaient entre eux depuis la v244 — jamais à l'enfant, qui n'était pas
dans la liste.

**Ce que ça change.** L'accueil s'attache dès que le code est là ; les corps
réalistes arrivent pendant qu'on lit l'accueil, un par un, sans bloquer, et
les gens nés en attendant — le château, l'avatar, les passants — reçoivent
leur corps réaliste sur place, sans changer d'objet, épée et torche
comprises. Rien n'est perdu : les mêmes personnages, les mêmes corps. Les
neuf modèles vivent dans le cache immuable avec le scanner et la flotte : une
mise à jour ne les reprend plus. Au volant, la sonde des reflets rend UNE
face par image et ne dessine que le décor (ciel, façades, rue, eau) : un
reflet complet six images plus tard, ce qu'aucun œil ne voit sur un
pare-brise, pour un coût par face passé de 15-455 appels de dessin à 8-39.
Et ses programmes se compilent pendant l'accueil, au point d'apparition,
plutôt qu'à l'arrivée de la première voiture (vingt-six programmes, une
seconde d'image figée, mesurés). Enfin la rue s'arrête devant l'enfant, à pied
comme au volant : sa voiture — ou lui-même, à sa carrure — est un obstacle que
la circulation respecte comme toute voiture — et devant lui seul, elle
attend sans limite ; sa propre voiture s'arrête contre une voiture de la rue
au lieu d'entrer dedans. Et un voyage par la carte au volant garde la
voiture : le gestionnaire d'animaux la retirait avant qu'elle ne rejoigne
l'enfant, qui restait à pied avec la carrure d'une voiture — coincé entre
deux murs sans comprendre pourquoi.

**Ce qui le prouve.** Six témoins neufs, rouges sur l'ancien code. Dans
`realisme.js`, on ralentit chaque modèle de cinq secondes et l'on compte
combien sont arrivés quand le jeu s'attache : zéro ici, neuf avant ; puis on
joue, et les 123 personnes nées avant les modèles doivent être mises à niveau
sur place — même objet, même scène, présence cohérente, aucune erreur. Dans
`monte.js`, au volant, le compteur d'images du moteur ne doit pas avancer de
plus de deux par tour d'affichage (sept avant), et d'au moins deux une fois
(les reflets vivent). Dans `maj.js`, un corps demandé se range dans le cache
immuable. Dans `monte.js` encore, au volant sur le tracé d'un convoi de
Rivoli, à l'arrêt, douze secondes après l'arrivée de la première voiture :
zéro voiture de la rue dans la sienne et au moins une qui attend derrière
(avant, elles passaient au travers) — et à la sonde, en fonçant sur une
voiture arrêtée, il s'arrête contre elle (3,6 blocs) au lieu de la traverser
(10,7).
Et un saut de trois cents blocs au volant doit laisser l'enfant au volant :
c'est ce témoin-là qui a trouvé la voiture retirée sous lui.
Le banc ne peut pas mesurer le gain de l'iPad — ses fichiers
arrivent en trente millisecondes depuis le disque et la première image y
coûte 2,9 s de contexte WebGL en logiciel — donc chaque témoin mesure la
CAUSE : le nombre de fichiers attendus, le nombre de rendus par image, le
cache où va un fichier.

## v244 — Les voitures ne se traversent plus, et elles prennent leurs virages en s'inclinant

**Pourquoi.** Max : « évite que les voitures puissent se chevaucher et fait
en sorte que quand la voiture tourne, ce soit beaucoup plus naturel, avec un
vrai virage, une vraie inclinaison ». Mesuré à Paris sur trente secondes :
soixante-dix-huit relevés de deux voitures l'une dans l'autre — là où deux
circuits se croisent, en équerre ou en biais, et sur les tronçons qu'ils
partagent — et cinquante-neuf sauts de cap de plus de trente-quatre degrés :
une voiture prenait le carrefour en UNE image, pivotant sur place comme une
maquette qu'on tourne sur une table.

**Ce que ça change.** Le cap d'une voiture est celui de son empattement, pas
du segment sous ses roues : elle pivote en franchissant le coin, sur la
longueur de son châssis. Son corps roule vers l'extérieur du virage, de ce que
lui impose la force centrifuge — quatre degrés au pire coin, rien en ligne
droite — et cette inclinaison est purement visuelle, composée avant le cap
comme celle de l'avion. Et chaque voiture cède le passage pour elle-même :
elle regarde où son tracé la mène dans les huit blocs qui viennent, et si son
rectangle y toucherait une autre voiture, elle attend — le convoi est
élastique, celles qui suivent font la queue derrière elle, et dans une paire
mutuelle la plus engagée passe. Métro et trains, sur rails, ne font ni l'un ni
l'autre.

**Ce qui le prouve.** Trois témoins de `monte.js`, sur les voitures visibles
du convoi routier à Paris pendant trente secondes. « Les voitures ne se
traversent plus » compte les intersections VRAIES des rectangles (4,4 × 2,26,
orientés, par séparation d'axes) : 78 sur l'ancien code, 17 à 25 ici. « Elles
tournent progressivement » : 59 sauts de cap → 1 ou 2. « Elles s'inclinent du
bon côté » lit la MATRICE de la voiture — le haut du corps penche du côté que
le roulis annonce, 239 relevés sur 239, roulis maximal 0,078 — et rien ne
penche sur l'ancien code. Quatre jets ont précédé celui-ci, chacun mesuré :
arrêter le convoi entier (78 → 65), un couloir devant soi (→ 61), un balayage
chemin contre chemin (17 → 77). Le reliquat est un raccord à cent soixante
degrés entre deux circuits de Rivoli : une affaire de tracé, déclarée dans
`TASKS.md`.

Et le portail a démasqué un pile ou face : « à Moscou, les rues sont pleines
de voitures » exigeait huit voitures visibles à la fois, quand la densité des
anneaux — une voiture tous les trente blocs — n'en garantit que six à
quarante-cinq blocs du centre. Mesuré des deux côtés avec la même séquence :
quatre à six, jamais huit ; le huit tenait à l'heure d'arrivée, et trois
témoins de plus avant lui ont déplacé la phase. Il exige six, en quarante-cinq
secondes — rouge tout de même sur l'ancien code, où Moscou n'avait aucune
voiture.

---

## v243 — Les passants se promènent pour eux-mêmes, et la dame n'a plus de voile

**Pourquoi.** Max : « elles regardent le joueur principal au lieu de continuer
à se promener ». À moins de cinq blocs et demi, tout habitant se figeait et se
tournait vers l'enfant — « on salue celui qui vient à soi », écrit pour trois
gardes de château et hérité par les dix-huit passants de chaque ville. Une rue
entière s'immobilisait et fixait l'enfant. Et Max a demandé de retirer « la
femme avec le voile » : la dame du château portait une guimpe, le linge qui
entoure le cou, le menton et le sommet de la tête, et la dame Renaissance un
voile derrière son attifet.

Il a aussi demandé de s'assurer que les corps réalistes de la v241 sont
déployés dans toutes les villes du monde. Lecture faite, ils le sont par
construction — ils se chargent pour tout le jeu et s'appliquent à toute tenue
de passant — mais une phrase ne garde rien : un témoin le prouve désormais.

**Ce que ça change.** Chacun garde son propre programme — pause, marche, geste
de métier — que l'enfant soit là ou non ; les phrases partent toujours quand
on passe près. La dame du château montre ses cheveux sous son touret, la dame
Renaissance son attifet sans voile. La lavandière garde son fichu noué, qui
est un foulard de travail.

**Ce qui le prouve.** Trois témoins de `monte.js`. « Un passant qu'on approche
continue son chemin » : rouge sur l'ancien code (zéro bloc en douze secondes,
l'enfant posé à trois blocs), 1,6 bloc en 1,6 s ici. « La dame n'a plus de
guimpe, la Renaissance plus de voile », mesuré sur les SOMMETS colorés
au-dessus du cou : 129 et 30 sur l'ancien code, zéro et zéro ici. « Les
passants ont des corps réalistes ailleurs qu'à New York » : 18 sur 18 à Paris,
vert des deux côtés à dessein — c'est une capacité que Max a demandé de
garantir.

---

## v242 — Le monde ×2 : New York respire, et les blocs suivent leur ville

**Pourquoi.** Max : « la ville de New York touche quasiment Montréal ». Depuis
la v240, Manhattan n'est plus un disque de 152 blocs mais un rectangle de
480 × 2 300 blocs, et à 0,375 km par bloc il ne lui restait, bord à bord, que
41 blocs avant Boston, 52 avant Montréal, 82 avant Ottawa, 164 avant
Washington — et l'aéroport JFK tombait DEDANS. Le registre disait pourtant
tout va bien : son `r: 152` est celui de l'ancienne ville voxel, et le témoin
« aucune ville n'en chevauche une autre » jugeait sur lui. Un vert du disque,
un rouge du rectangle.

Et la carte suivante ne pouvait pas se faire comme la précédente. La migration
de v199 ne déplaçait les blocs qu'en HAUTEUR : quand une ville s'éloignait de
Paris, ce qu'un enfant y avait bâti restait à l'ancienne adresse, en pleine
campagne. Personne n'y avait bâti — c'est ce qui l'avait rendu acceptable.
New York vient d'être refaite, on y bâtit ; ses blocs DOIVENT partir avec elle.

**Ce que ça change.** Le monde double une seconde fois — 0,1875 km par bloc,
86 000 blocs de large — Paris restant l'ancre qui ne bouge pas. Manhattan
laisse désormais 386 blocs à Boston, 759 à Washington, 1 472 à Montréal, et
JFK est ressorti du rectangle. Les dix-neuf aérodromes ont suivi leur ville :
onze gardent exactement leur écart d'avant, huit sont recherchés depuis leur
cap réel parce qu'à l'échelle neuve le même écart tombait dans l'eau (Dubaï à
89 % dans le golfe) ou sur une voisine ; le sol de chacun est remesuré.

Et la migration des blocs est une CHAÎNE : un bloc posé dans une ville — le
rectangle de Manhattan, le disque de Lille ou de Rome — se déplace de ce que
sa ville se déplace, en entier, sans changer de hauteur ; un bloc de campagne
ne bouge qu'en hauteur, comme en v199. La position où l'enfant s'était arrêté
suit de même : endormi à Times Square, il ne se réveille pas en mer. Une
copie des blocs et des positions d'avant est prise sur le nuage, sur son
propre document (`prénom~avant-carte-2`), avant qu'une tablette à jour n'y
pousse quoi que ce soit.

Ce que cela n'attrape pas, et c'est déclaré : une tablette qui continuerait de
jouer sur la v241 après l'heure de la refonte poserait des blocs que la
migration laissera où ils sont.

Et le bouton « Explorer New York » de l'accueil disparaît, sur demande de Max
— « il n'y a qu'une seule carte et ça doit rester le cas ». Il ne faisait que
recharger la page pour poser l'enfant à New York, ce que la carte du monde
fait déjà pour toute ville.

**Ce qui le prouve.** Le témoin qui porte l'invariant numéro un est vert :
sous le point d'apparition et sous Paris, la carte d'AVANT (figée) et celle
d'APRÈS rendent le même sol — **4 040 colonnes, zéro déplacée** —, les
dix-huit colonnes de référence et le Mall gardent leur cote, et la maison
sauvegardée avant le changement repose toujours sur le sol. Les deux
empreintes de `plafond.js` changent, comme en v199 : la casse ne se borne pas,
et c'est ce témoin-là, pas un hash, qui la garde.

Sept témoins neufs, tous rouges sur `origin/main` : les blocs suivent leur
ville (Manhattan par son rectangle, Lille par son disque, une marque d'import
comme un bloc) sans toucher à Paris, au point d'apparition ni à ce qui est
posé sur la carte neuve, et repasser la migration ne change rien ; le
rectangle de Manhattan laisse deux cents blocs à chaque voisine et aucun
aérodrome ne tombe dedans ; un bloc d'avant reçu du nuage arrive à la nouvelle
adresse de sa ville SANS fantôme à l'ancienne — la fusion est une union, et
c'est le receveur qui cède ; la copie d'avant existe, dit de quelle carte elle
vient, et ne se réécrit pas. Les cinq promesses des aérodromes sont
remesurées à la sonde : voie ferrée la plus proche à 12 blocs (Haneda), ville
la plus serrée à 14 (Los Angeles), sanctuaire le plus proche à 55 (Roissy).

Et le portail a trouvé ce que la carte neuve révélait : l'index des rails
rangeait chaque ligne par un point tous les 256 blocs, si bien qu'une
diagonale qui coupe le coin d'une case y passait sans être vue — sur l'ICE
Amsterdam–Cologne, soixante blocs de voie sans rails, une marche de cinq et un
arbre planté dessus. Le segment se range désormais bloc par bloc. Et le témoin
de la minicarte volait au-dessus d'un couloir devenu Pacifique, où une carte
uniformément bleue ne change jamais : il vole au-dessus du Sahara.

Quatre témoins de `manhattan.js` restent rouges sur ce banc — géométrie
retirée, nuit, ombres, taxi tactile — et ils le sont À L'IDENTIQUE sur
`origin/main`, rejoués seuls des deux côtés dans un arbre séparé : c'est la
règle de la v195, la dette est déclarée dans `TASKS.md` (le portail de la v240
avait été mesuré en rendu matériel). La marche devant la façade, elle, était
un pile ou face à une image par seconde ; elle marche désormais jusqu'à
l'arrêt.
Et depuis la fusion de la v241 (#244), « l'écran ne se fige pas en arrivant
sur une ville » est rouge des deux côtés, rejoué seul : 1 233 ms sur
`origin/main`, 2 117 sur la branche, pour une barre à 550 — dette déclarée,
cause probable la naissance des corps Rocketbox à l'arrivée.
**Portail : voie longue, dix suites, huit vertes ; `manhattan.js` et le gel
d'arrivée de `monte.js` rouges à l'identique sur `origin/main`.**

---

## v241 — Des visages, des berlines et des voisins qui restent

**Pourquoi.** Les personnages et voitures restaient trop rudimentaires. Les
passants disparaissaient au seuil de distance ou étaient replacés derrière
la caméra, ce qu’un demi-tour rendait visible.

**Ce que ça change.** Anatomies humaines articulées et texturées, mains et
vêtements détaillés, marche avec genoux et coudes fléchis. Les costumes
historiques gardent leurs rôles et reçoivent des visages texturés. Berlines à
surfaces galbées, vrais passages de roue, vitrage, habitacle et optiques ; taxis
jaunes à New York et berlines citadines dans les autres villes. Les voisins
proches gardent leur place ; l’éloignement s’efface progressivement. Ressources
partagées, population bornée et cache PWA v241.

**Ce qui le prouve.** Les treize contrôles de `realisme.js` reproduisent le demi-tour,
le seuil de visibilité, le voyage rapide, la déformation des genoux et la
création d’un enfant sans modifier l’adulte. Les reflets renouvelés ne génèrent
plus de boucle WebGL. Le portail garde aussi sauvegardes,
multijoueur, édition, conduite tactile, mode éducatif et fonctionnement hors
ligne. Portail complet vert (15 suites et fumée). La traversée de rue garde
zéro arrêt vide et 9,13 passants dans le cadre en moyenne ; le trafic montre
11 modèles différents autour du joueur. Captures rapprochées et vues en
mouvement dans le moteur et dans le jeu.

## v240 — Une seule Terre, Manhattan et ses habitants

**Pourquoi.** La carte Manhattan séparée compliquait l'exploration du monde.
Ses monuments restaient peu reconnaissables, Times Square manquait d'activité
et les avatars cubiques limitaient le réalisme dans toutes les villes.

**Ce que ça change.** Manhattan rejoint la Terre et son code de partie. Les
constructions existantes gardent leurs supports ; les anciens journaux Manhattan
sont repris par translation, sans réduire leurs blocs ni supprimer les archives.
Empire State reçoit dix retraits, une terrasse et son mât ; Chrysler une couronne
métallique. Times Square réunit écrans, marches rouges, espace piéton et foule.
Les humains et avatars ont une anatomie galbée et des habits contemporains.
Des taxis jaunes inspirés de la Crown Victoria et des berlines circulent à New
York ; ils restent conduisibles. Cache PWA v240, budgets ordinateur/tablette.

**Ce qui le prouve.** Le témoin Manhattan éprouve terrain hors zone, supports
anciens, conflits et répétitions d'import, priorité du cloud, édition visible,
conduite tactile, partage Terre/New York, archive cloud et fonctionnement hors
ligne. Les captures couvrent Times Square jour/nuit, Empire State au sol/en
hauteur, Midtown, Central Park et taxis. Le guide documente les références,
licences et limites : géographie comprimée, style encore simplifié, publicités
fixes et validation iPad physique restante. **Portail complet vert : 14 suites
et la fumée ; 30 contrôles Manhattan.** Les 79 circuits, dont 20 au sud de la
14e Rue, ont zéro collision avec les bâtiments et restent sur la chaussée sur
2,2 m de largeur. Les empreintes historiques du terrain restent inchangées,
avec 4 040 colonnes de constructions de référence intactes et une sauvegarde
de 40 000 blocs récupérée intégralement sur un second appareil.

---

## v239 — Manhattan à l'échelle du joueur, sans déplacer les constructions

**Pourquoi.** La Manhattan de la Terre est trop comprimée pour accueillir des
rues à la largeur des voitures, des vitrines et une architecture détaillée.
Un remplacement de ses blocs déplacerait les constructions sauvegardées.
La PR #226 avait par ailleurs divergé de `main` et devait conserver ses
corrections de voirie tout en intégrant les améliorations de mémoire et de vol
de la v238.

**Ce que ça change.** Le menu propose une carte Manhattan indépendante :
2 353 bâtiments, treize quartiers, Broadway, Central Park et sept monuments
aux volumes spécifiques. Les façades proches ont fenêtres en retrait,
encadrements, corniches, commerces et équipements de toiture. Les matériaux
physiques, ombres, reflets d'environnement, lumières nocturnes, mobilier,
arbres, passants et 84 circuits de voitures sont intégrés au jeu existant.
On peut se déplacer, construire, détruire, conduire, jouer au toucher et
rejoindre ses amis ; l'éducation reste active. La Terre garde ses blocs et ses
positions. Les contextes de sauvegarde, le cloud et le réseau sont séparés
par carte. Les ressources urbaines sont originales et procédurales.

Le rendu combine instancing, façades proches et silhouettes lointaines,
chargement progressif et budgets ordinateur/tablette. Les quatre nouveaux
modules entrent dans le cache PWA v239. La migration historique du relief
ignore les cartes autonomes et `cloud=` désactive effectivement les services
distants dans le banc d'essai. Le portail a aussi révélé une course déjà
présente sur `main` : une reconnexion à vingt secondes effaçait la réponse du
relais et affichait un conseil Wi-Fi erroné. Le diagnostic conserve désormais
cette preuve pendant la session.

**Ce qui le prouve.** Le scénario `tests/manhattan.js` vérifie les sauvegardes
séparées, le mur qui bloque puis se détruit visiblement, la construction,
la conduite au joystick, les destinations, les circuits sans obstacle, les
lumières de nuit, le quiz, deux joueurs échangeant blocs et avatars, la clé
de sauvegarde cloud et le redémarrage hors ligne. Son contrôle d'entrée est
rouge sur `main` v238. Le portail est vert : démarrage et quatorze suites, dont les 24 témoins
Manhattan. Onze captures de jeu ont été inspectées, au sol et en hauteur,
de jour comme de nuit, sans erreur JavaScript/WebGL dans ce parcours.
Les résultats et conditions sont consignés dans `docs/manhattan-validation.md`.

La portée exacte et les limites se lisent dans `docs/manhattan.md` : ville
interprétée et comprimée, intérieurs sommaires, reflets statiques, transitions
de détail visibles et circulation qui ne répond pas encore aux feux. Aucune
fidélité AAA ni validation sur iPad physique n'est revendiquée.

---

## PR #226 — Des avenues réelles où aucune voiture n'a jamais roulé

Une passe ville par ville sur la dette déclarée depuis la v211 : des avenues
qui existent, qu'un enfant peut nommer, et sur lesquelles aucun circuit de
voitures ne passait. Les quatre villes que la v211 avait laissées derrière elle
— San Francisco, Lille, Londres, Washington — ont chacune leur entrée
ci-dessous ; ces changements attendaient la fusion de la PR #226.

Et chacune a une cause DIFFÉRENTE, ce qui est la leçon de la passe : à San
Francisco les avenues n'étaient pas des rues ; à Lille l'une était une impasse
et l'autre collée à sa voisine ; à Londres Bloomsbury n'avait que deux liens
nord-sud, et le témoin qui gardait la dette se trompait ; à Washington la
grille était simplement saturée. On mesure chaque avenue avant de chercher un
remède commun.

### San Francisco — six avenues qui n'étaient pas des rues

**Pourquoi.** Six des quatorze voies nommées de San Francisco n'avaient aucune
voiture depuis la v207, et la dette était écrite ainsi dans `TASKS.md` :
« ces cinq-là bordent le Golden Gate Park et la côte, où il n'y a rien à
boucler ». C'était une explication, pas une mesure.

Mesurée — chaque avenue sur son propre sol, colonne par colonne, avant de
chercher la moindre boucle — elle est fausse. **La Great Highway tenait la rue
à ZÉRO pour cent** : onze blocs de sable et quatre-vingt-dix-neuf hors de la
presqu'île, c'est-à-dire dans le Pacifique. Fulton Street 50 %, Third Street
70 %, Lincoln Way 70 %, la 19e Avenue 81 % — de l'herbe, du feuillage, et huit
blocs d'**eau** pour la 19e, qui traversait le lac du parc. Ce n'étaient pas
des avenues sans boucle : ce n'étaient pas des rues.

La cause tient en une ligne : l'ellipse du Golden Gate Park faisait un
kilomètre de haut et débordait sur ses deux rues de bord, et les parcs passent
avant les rues dans `solSF`. Le vrai parc est borné au nord par Fulton et au
sud par Lincoln Way.

**Ce que ça change.** Les enfants trouvent des voitures dans tout l'ouest et
tout le sud de la ville — le Richmond, le Sunset, le tour du Golden Gate Park,
la Mission, Mission Bay et Dogpatch — là où il n'y en avait jamais eu une
seule. Le parc s'arrête au trottoir de ses deux avenues, la 19e Avenue le
traverse comme le fait Crossover Drive au lieu de disparaître dans un lac, la
Great Highway longe Ocean Beach côté ville, et Third Street est revenue à terre.
Cinq vraies rues de plus, prises sur le plan : Stanyan Street, Sunset
Boulevard, Sloat Boulevard, la 16e Rue et Cesar Chavez Street.

**Ce qui le prouve.** Le portail est vert. Les dix-neuf voies de la ville
tiennent la rue à **100 %**, mesuré une par une. Six circuits mesurés à 100 %
couvrent **dix-neuf avenues sur dix-neuf** — contre huit sur quatorze — sans
qu'aucun ne fasse demi-tour (virage maximum 143°) et **sans toucher au seuil de
partage de la v211** : la pire paire de convois se partage vingt blocs, la
taille d'un carrefour. Aucun des quatre circuits neufs ne traverse un socle de
monument, et les deux anciens en traversent exactement autant qu'avant —
mesuré des deux côtés.

Et **le sol n'a pas bougé d'un bloc** : `hauteurSF` ne lit ni les lieux ni les
voies, la livraison ne touche que du SOL, et les deux empreintes de
`plafond.js` le confirment — vérifié, pas supposé.

### Lille — quatre avenues sans boucle, chacune pour sa propre raison

**Pourquoi.** Quatre des quinze voies de Lille n'avaient aucune voiture depuis
la v211, et la dette les nommait sans les expliquer. Mesurées, elles ne
tombaient pas toutes pour la même cause :

- **la rue Royale n'avait qu'UNE porte.** Elle ne rencontrait la rue
  Esquermoise et l'avenue du Peuple-Belge qu'en un seul point, le Lion d'Or :
  tout circuit qui y entrait devait en ressortir par là. C'est l'îlot en
  sucette de la City de Londres, v206.
- **la rue de Paris ne rencontrait personne** à moins de dix blocs.
- **le boulevard Victor-Hugo courait à QUATRE BLOCS ou moins de la rue
  Léon-Gambetta** sur plus de la moitié de sa longueur, et à zéro au bout.
  Toute boucle qui le prenait se superposait de **soixante-deux blocs** au
  convoi de Gambetta — trois fois le seuil de partage de la v211. Ce n'était
  pas le seuil qu'il fallait changer, c'était le tracé : cent vingt-cinq
  mètres entre deux boulevards que la vraie ville sépare de quatre cents.
- **la rue Gustave-Delory** suivait, dès que les trois autres avaient de quoi
  boucler.

**Ce que ça change.** Des voitures roulent dans le Vieux-Lille et jusqu'au
Champ de Mars, autour de la Porte de Paris, et à Wazemmes — trois quartiers qui
n'en avaient jamais vu. Trois vraies rues de plus, prises sur le plan :
l'avenue Mathias-Delobel le long du Champ de Mars, la rue Pierre-Mauroy de la
Grand'Place à la République, la rue du Molinel de la rue de Paris aux gares. Le
boulevard Victor-Hugo est revenu à sa place, dans la ceinture de boulevards du
sud.

Et la Porte de Paris et la Colonne de la Déesse ont désormais **une rue autour
d'elles** : `chainerVoies` joignait la rue de Paris à la rue Gustave-Delory en
droite ligne, et cette ligne passait au travers de la Porte — qui est pleine,
on ne passe pas dessous. C'est la leçon de Paris en v221, appliquée le jour
même où Lille gagne des circuits plutôt que quatre versions plus tard.

**Ce qui le prouve.** Le portail est vert. Quatre circuits mesurés (94, 99, 100
et 100 %) couvrent les **dix-huit voies sur dix-huit**, sans demi-tour, pire
paire de convois vingt-et-un blocs. Un témoin neuf de `carteMonde.js` mesure ce
qu'aucun ne mesurait à Lille : le BLOC à la cote du convoi, sur toute la
largeur de la voiture. Désarmé le contournement, il rend cinq pas de
carrosserie dans la Colonne de la Déesse — il peut rougir, et il a rougi.

Au passage, **les quarante-et-un points de voie de Lille étaient écrits en
blocs**, pas en kilomètres : justes aujourd'hui, faux à la prochaine remise à
l'échelle, et rien n'aurait rougi. Ils sont convertis, et la conversion est
prouvée exacte — quarante-et-un points comparés, zéro écart.

### Londres — King's Cross était un cul-de-sac, et le témoin se trompait

**Pourquoi.** Euston Road côté King's Cross n'avait aucune voiture depuis la
v206 : rien ne partait de King's Cross ni vers l'est ni vers le sud, donc
aucune boucle ne pouvait la prendre. `TASKS.md` nommait déjà la piste —
Pentonville Road et Gray's Inn Road — sans qu'elle ait été mesurée.

Elle ne suffisait pas, et il a fallu le mesurer : avec cinq rues de raccord,
**aucun échange ne donnait ses voitures à King's Cross sans en retirer à
Tottenham Court Road, au Strand et à Charing Cross Road** — éprouvé en
retirant jusqu'à trois des dix circuits en place et en recomblant à chaque
fois. La cause : Bloomsbury n'avait que **deux** liens nord-sud, Euston Road et
Woburn Place, et un seul circuit les prenait tous les deux.

**Et le témoin qui gardait cette dette se trompait.** Il déclarait une avenue
« sans voitures » quand l'un de ses points de passage n'était pas un sommet de
circuit — ce qui mesure « parcourue d'un bout à l'autre », pas « des voitures y
roulent ». Il nommait ainsi le Strand et Charing Cross Road, qui en ont ; et il
comptait couvertes des avenues dont deux circuits ne faisaient que toucher les
deux bouts sans jamais les emprunter.

**Ce que ça change.** Des voitures roulent enfin à King's Cross, à Islington et
à Clerkenwell. Sept vraies rues de plus, aux vraies adresses : Gray's Inn Road,
Pentonville Road, Farringdon Road, Clerkenwell Road, Theobald's Road, Gower
Street (celle de l'University College) et Judd Street. King William Street, à
la Banque d'Angleterre, en récupère aussi.

**Ce qui le prouve.** Le portail est vert. Douze circuits mesurés à **100 %**,
**cinquante-sept avenues sur soixante-dix** réellement parcourues, aucun
demi-tour, pire paire de convois vingt-et-un blocs — le seuil de la v211 est
inchangé, et **aucune rue ne perd ses voitures** : c'est la contrainte sous
laquelle l'échange a été cherché. Le témoin remesure désormais la part de la
LONGUEUR d'une avenue qui porte un convoi à moins de deux blocs ; rejoué sur
`origin/main`, il est **rouge** et nomme précisément les deux rues que cette
livraison fait rouler. La dette déclarée passe de quatorze avenues à treize.

### Washington — Virginia Avenue, et une grille saturée

**Pourquoi.** Virginia Avenue NO n'avait aucune boucle depuis la v205 : elle
meurt sur Constitution à la 21e Rue, comme la vraie, et rien ne remontait de là
vers K Street. `TASKS.md` nommait la piste — « la 21e ou la 23e Rue » — sans
qu'elle ait été tracée.

**Et la grille était SATURÉE.** Mesuré : sur vingt-six mille chaînes
candidates, **zéro** n'était compatible avec les dix-neuf circuits en place sous
le seuil de partage de vingt blocs. Dix-neuf convois occupent déjà le
centre-ville de L'Enfant ; on ne peut rien ajouter sans retirer.

**Ce que ça change.** La 23e Rue NO monte de Constitution à Washington Circle en
croisant Virginia à Foggy Bottom — une rue de la grille, elle ne pose aucun sol
de plus. Trois voies gagnent des voitures : **Virginia Avenue NO**,
**Constitution Avenue** et la 23e Rue.

La 17e Rue, elle, a été essayée et **retirée** : entre Constitution et F Street
elle traverse le parc de la Maison-Blanche, qui passe avant les voies dans
`solWashington` — mesuré, neuf blocs de pelouse sur quarante. Une rue qu'on ne
peut pas tracer ne se force pas ; l'Ellipse fait ici trente blocs de large, à
peu près sa vraie taille.

**Ce qui le prouve.** Le portail est vert, rejoué **depuis zéro**. La boucle de
Virginia gêne exactement deux circuits, de vingt-cinq et vingt-sept blocs ; on
les retire, on la force, on recomble — la passe de réparation de la v216 — et le
recomblement rend à la 15e Rue ses voitures par un autre chemin, si bien
qu'**aucune rue ne perd les siennes**. Cinquante voies sur soixante portent un
convoi, contre quarante-sept ; la pire paire reste à vingt-deux blocs. Aucune
traversée de monument n'est ajoutée : cinquante-neuf pas dans une emprise sur la
branche comme sur `origin/main`, mêmes monuments, mêmes comptes.

**Et un trou dans la table des gardiens, signalé et non corrigé.**
`src/washington.js` déclare pour gardiens `washington.js` et `plafond.js`
seulement — pas `carte.js` ni `carteMonde.js`, alors que les deux l'importent
et que `carteMonde.js` mesure ses dix-neuf circuits. Toutes les autres villes
bâties à la main déclarent les trois. Le portail a donc annoncé « déjà vert sur
ce code » pour les deux suites qui testent précisément ce qui venait de changer.
`tests/tout.js` est hors de la zone de cette session : la correction est
déclarée dans `TASKS.md`, et le portail a été rejoué depuis zéro en attendant.

---

## v238 — Le jeu ne ralentit plus à mesure qu'on y joue

**Pourquoi.** Max : « le jeu lague de plus en plus depuis un moment », et
« l'avion avance une seconde, il reste une seconde » — hors pilotage aussi, et
notamment juste après une mise à jour.

Deux mesures ont écarté les suspects évidents, qui étaient mes propres
changements de la veille. Debout au centre de Paris, à la distance d'affichage
de l'iPad, la **v236 rend 3,7 images par seconde et la v237 3,3** : le paysage
lointain et le budget de maillage en temps réel ne sont pas la cause. Et le
profil renverse la question — **le fil principal est inactif 81 % du temps**. Le
banc rend en logiciel : sa cadence mesure SwiftShader, pas le jeu, et il ne peut
donc pas *subir* la panne de Max.

**On mesure alors la cause, pas l'effet** — la leçon de la v236, reprise telle
quelle. Elle tient dans une ligne : **une créature coûte dix-neuf géométries et
demie sur la carte graphique, et le jeu n'en rendait aucune quand elle
disparaissait de l'écran.** `scene.remove()` détache un objet de l'affichage ;
il ne rend pas un octet au pilote graphique. Le jeu fait naître une créature
toutes les 1,2 seconde, et chacune emporte ses vingt géométries pour toujours.
Sur un iPad, dont la mémoire graphique est partagée avec le système, cela
s'accumule pendant toute la partie et la tablette finit par se figer pour faire
de la place.

C'est la fuite de la v236 **par l'autre bout** : là, `world.chunks` gardait les
blocs en mémoire vive. La règle « ce qui s'engendre s'oublie » n'avait jamais
été cherchée ailleurs que dans le monde — et le bon remède était **déjà écrit
dans le fichier d'à côté**, `poissons.js` libérant les siens depuis toujours.
Quatrième fois que ce dépôt paie la *portée* d'un remède et non la règle.

**Ce que ça change.** Une partie d'une demi-heure reste aussi fluide qu'à la
première minute.

Le remède vit dans un module commun, `liberer.js`, et non en cinq copies. Il est
branché aux cinq endroits où le jeu retire vraiment quelque chose qui se
renouvelle : les deux d'`animals.js`, les deux de `creatures.js`, la mascotte
refabriquée de `fun.js`, et le corps d'un ami qui quitte la partie.

**Et une ressource partagée ne se libère pas — c'est tout le piège.** Les
personnages humains partagent deux matériaux pour tout le jeu ; le mobilier de
rue clone un modèle unique, donc partage sa géométrie. Un `dispose()` aveugle
n'aurait pas fait fuir le jeu : il aurait fait **disparaître** tous les
personnages du monde et le décor avec. La règle vit désormais dans la ressource
elle-même (`userData.partagee`), à côté de `montable`, `nourrissable` et `vole`.

**Ce qui le prouve.** Un témoin neuf, qui compte des **géométries et non des
millisecondes** : ce conteneur a de la mémoire à revendre, un verdict en durée
serait vert des deux côtés sans rien prouver. Dix créatures nées puis retirées,
mesuré séparément des deux côtés :

| | `origin/main` | ici |
| --- | --- | --- |
| géométries prises | 166 | 157 |
| **rendues** | **0** | **157** |
| **perdues** | **166** | **0** |

**Et il a fallu quatre sondes avant celle-là.** Joueur immobile, aucune créature
n'était retirée — elles remplissaient seulement leur plafond de seize, ce qui
s'arrête tout seul. À pied, un enfant avance à **15 % du temps réel** sur ce
banc (`dt` borné, trois images par seconde) : six blocs en trente secondes,
jamais les soixante-dix qui déclenchent un retrait. Dix allers-retours
provoquaient bien le renouvellement, mais le disque de morceaux ne revenait pas
au même endroit des deux côtés : le verdict aurait mesuré le banc. Et la
première mesure unitaire rendait « 96 avant, 96 pendant, 96 après » — les bêtes
naissaient derrière la caméra, et **le compteur du moteur n'enregistre que ce
qui est dessiné**. Elle ne mesurait rien et serait passée au vert des deux
côtés : le pire des témoins.

**Ce que cette version ne règle pas, et qui est déclaré dans `TASKS.md`.** Une
pousse résiduelle subsiste, qui ne vient **pas** des créatures — c'est prouvé à
l'unité. Le suspect est nommé : les voitures de convoi, trente-deux maillages
chacune, fabriquées à la demande et jamais détruites, seulement rendues
invisibles. Et une cinquième occurrence du piège de `dt` a été trouvée en
chemin : les cadences de naissance des bêtes comptent en temps d'affichage.

---

## v237 — En vol, on voit enfin un paysage

**Pourquoi.** Max, capture à l'appui après la v236 : du ciel bleu entouré au
feutre rouge, et « 0 improvement ». La v236 avait corrigé une vraie fuite de
mémoire — deux gigaoctets et demi après cinq minutes de vol — mais ce n'était
pas ce qu'il voyait.

Mesuré dans le champ de la caméra, en vol au-dessus de Paris : **trente et un
maillages, et le plus lointain à cinquante-neuf blocs**, pour un brouillard qui
portait à cent quatre-vingt-huit. L'enfant survolait un disque de monde qui
durait une demi-seconde.

**Et la cause est arithmétique, pas une lenteur qu'on optimise.** Un morceau de
monde coûte :

| | coût d'un morceau | morceaux par seconde |
| --- | --- | --- |
| campagne vide | 6,6 ms | 153 |
| **couloir du témoin** (30 000, 30 000) | 6,8 ms | **147** |
| **Paris** | 23,5 ms | **42** |
| **Londres** | 22,6 ms | **44** |

Voler à cent dix blocs par seconde en réclame **cent soixante-cinq**. Au-dessus
d'une ville on en produit quarante-deux : il manque un facteur quatre. Et le
« 154 morceaux/s » de la v229, sur lequel les vitesses des avions ont été
réglées, avait été mesuré **dans un couloir vide** — c'est aussi là que vole le
témoin censé garder le chargement du monde. Il ne pouvait pas voir ce que Max
voyait.

**Ce que ça change.** Le monde a un **paysage lointain**. Il ne se bâtit pas
bloc à bloc : il lit `terrainHeight`, une fonction **pure**, qui rend la cote
d'une colonne sans engendrer un morceau ni mailler une seule face. Vingt-cinq
mille colonnes — un carré de plus d'un kilomètre de côté — coûtent 120 ms ; la
même surface en vrais morceaux en coûterait **cent cinquante secondes**.

Marlon et Alice voient donc, en vol, le relief, les fleuves, les plages et les
côtes s'étendre jusqu'à l'horizon, et les vrais blocs prendre la place du
paysage à mesure qu'ils approchent. Le brouillard, qui s'arrêtait au bord du
monde chargé, porte maintenant jusque-là.

**Et le portail rouge a fait trouver plus gros que le paysage.** Le témoin de
chargement du monde est tombé : le paysage lointain coûte des images au banc
(qui rend en logiciel), et **le budget de maillage était compté PAR IMAGE**.
Douze millisecondes par image, c'est mille deux cents par seconde à cent
images — mais **trente-six** à trois images par seconde. Or trois images par
seconde, c'est exactement l'état d'une tablette qui ARRIVE dans une ville : le
monde se chargeait vingt fois plus lentement au moment précis où l'enfant en a
besoin. C'est le piège de `dt` de la v226, un étage plus haut, sur le chemin le
plus chaud du jeu. Le budget vise désormais un DÉBIT — des millisecondes par
seconde RÉELLE — plafonné pour qu'une image ne soit jamais dominée par le
maillage. À cadence haute rien ne change ; la correction ne fait qu'AJOUTER du
budget quand les images s'allongent. Mesuré, même vol, même page :

| | monde chargé devant soi |
| --- | --- |
| avant, avec le paysage | 86 blocs |
| **après** | **129 blocs** |
| avant, sans le paysage | 143 |
| après, sans le paysage | **167** |

**Ce qui le prouve.** Un témoin neuf dans `monte.js`, et le portail complet en
vert. Il mesure ce que l'enfant VOIT, pas ce que le moteur charge : vingt-cinq
lignes de visée réparties sur la moitié basse de l'écran, et l'on compte celles
qui rencontrent quelque chose. Cinq relevés, même vol, même endroit :

```
origin/main    0 ·  8 ·  9 ·  1 · 11   sur 25     (portée médiane  86 blocs)
ici           25 · 25 · 25 · 25 · 25              (portée médiane 120, jusqu'à 244)
```

Et **la portée du paysage suit la distance d'affichage**, ce qui n'est pas un
réglage de confort : un joueur qui demande un monde de deux morceaux ne demande
pas un panorama de six cents blocs. Écrite en dur, elle coûtait vingt-neuf pour
cent de la cadence du banc — qui ouvre toutes ses suites à cette distance-là —
pour un paysage que personne n'avait demandé. Remise à l'échelle : **32,0
images par seconde contre 31,6 sans**, c'est-à-dire rien.

---

## v236 — Le monde oublie enfin ce que l'avion a dépassé

**Pourquoi.** Max, après la v235 : « Lag is very bad avec les avions fix it
for real. » Il avait raison : la v235 avait corrigé un symptôme réel — les
voitures d'une ville qui naissaient toutes dans la même image — et le gel
revenait quand même.

Cette fois j'ai décomposé avant de toucher quoi que ce soit, et **les trois
coupables que je soupçonnais sont innocents**. Le rendu fait **4,6 %** du temps
d'un vol. La caméra cubique qui fabrique les reflets de carrosserie ne tourne
**jamais** en vol — zéro image sur cent huit. Couper le contrôle des shaders ne
rend rien de mesurable. Le maillage tient son budget.

Le vrai défaut ne se voyait pas en millisecondes, parce qu'il ne coûte pas de
temps : **le jeu n'a jamais rendu un seul morceau de monde.** `main.js` défait
bien les MAILLAGES des morceaux qu'on laisse derrière soi — c'est écrit depuis
toujours — mais les **blocs**, quatre-vingts kilo-octets par morceau,
restaient dans la mémoire pour la partie entière. À cent dix blocs par seconde,
l'avion en engendre **quatre-vingt-sept par seconde**. Mesuré sur le même vol,
à la même distance parcourue :

|  | après 30 s | après 90 s | après 5 min |
| --- | --- | --- | --- |
| avant | 245 Mo | 693 Mo | **2 328 Mo** |
| après | 27 Mo | 27 Mo | **35 Mo** |

Deux gigaoctets et demi de blocs après cinq minutes de vol : un iPad ferme
l'onglet bien avant, et **longtemps avant de le fermer, il se fige pour faire
de la place**. Trois secondes d'arrêt, une seconde de jeu.

**Ce que ça change.** Marlon et Alice peuvent voler aussi longtemps qu'ils
veulent. La mémoire du jeu ne monte plus : elle se stabilise autour de trente
mégaoctets de blocs, quelle que soit la distance parcourue. Rien n'est perdu au
passage — le relief se recalcule à l'identique, et les blocs posés à la main
sont réappliqués depuis leur propre registre. Voler dix minutes coûte
désormais autant que voler dix secondes.

**Ce qui le prouve.** Deux témoins neufs dans `monte.js`, et le portail complet
en vert.

Le premier vole trente secondes au-dessus de Paris et pèse les blocs retenus :
**245 Mo sur `origin/main`, 27 ici**, pour une barre à cent. Et **son verdict
est en mégaoctets, pas en millisecondes** : sur ce conteneur, qui a de la
mémoire à revendre, la cadence est identique des deux côtés (35,6 contre 34,5
sur cinq minutes) et le temps de ramasse-miettes aussi (4,3 s contre 4,2). Le
banc ne souffre pas de ce défaut ; un iPad, si. Une durée aurait mesuré la
machine.

Le second garde l'invariant du sol contre ma propre correction : on pose une
brique, on force l'oubli du morceau qui la porte, et l'on vérifie qu'elle est
toujours là quand le morceau revient — avec le terrain d'à côté inchangé, bloc
pour bloc.

---

## v235 — L'écran ne se fige plus en arrivant sur une ville

**Pourquoi.** Max, en vol : « il y a vraiment un lag, il n'est pas capable de
naviguer avec fluidité. L'écran s'arrête pendant trois secondes, il redémarre
pendant une seconde. »

Ce n'était **ni le maillage du monde ni le rendu**. Profilé et mesuré, vingt
secondes de vol au-dessus de Paris : le maillage tient son budget (16 ms par
image), le rendu en coûte 4 — et une seule image en prenait **557**. Tout était
dans `animerLesVilles`. Les huit circuits de voitures de Paris naissaient
**ensemble**, dans la même image, à l'instant où l'avion franchissait leur
rayon de deux cent vingt blocs. Chacun fabrique une vingtaine de voitures, et
une voiture coûte trente-deux maillages : cinq mille maillages d'un coup, pour
des voitures que personne ne peut voir avant deux secondes de vol — un convoi
ne se montre qu'à quarante-cinq blocs.

**Ce que ça change.** Deux choses, et la seconde est la vraie. On **étale** :
un circuit par tour, le plus proche d'abord, le tour passant de deux secondes
et demie à un huitième de seconde. Et surtout, **un convoi ne fabrique plus ce
que personne ne voit** : chaque place reste vide jusqu'à ce qu'elle entre dans
le champ. Une ville survolée de loin ne coûte plus rien du tout.

**Ce qui le prouve.** Un témoin neuf dans `monte.js`, rouge sur l'ancien code.
Il mesure ce que l'enfant subit — la durée de chaque image pendant qu'on
survole Paris en chasseur — sans aucune instrumentation dans le jeu, donc à
l'identique des deux côtés :

| | avant | après |
| --- | --- | --- |
| pire image | 800 ms | **233 ms** |
| part du temps en images de plus de 300 ms | 10,3 % | **0 %** |
| cadence moyenne | 17 im/s | 20,3 im/s |

**Et une piste mesurée qui n'a rien donné, écrite pour qu'on ne la reprenne
pas à l'aveugle.** Le profil accusait aussi les matrices de three.js — dix pour
cent du vol à replacer des morceaux de monde qui ne bougent jamais. Les figer
n'a **rien changé de mesurable** (28,5 → 27,7 images par seconde, gel 683 →
667) : ce coût vient des personnages, qui bougent. La correction a été retirée.

---

## v234 — Une minute de jeu compte pour une minute

**Pourquoi.** `main.js` borne `dt` à un vingtième de seconde, et c'est juste
pour la physique : sans cette borne, une chute de cadence fait traverser les
murs. Mais `education.js` comptait la journée de l'enfant avec ce `dt`. Mesuré
à la sonde, sur douze secondes réelles : à vingt-quatre images par seconde le
compteur en retient onze ; **à cinq, il n'en retient que trois**.

Autrement dit, sur une tablette qui rame — c'est-à-dire précisément quand un
enfant arrive dans une ville et que le monde se charge — une limite de
quarante-cinq minutes par jour en laissait passer près de trois heures. Personne
ne contournait rien : l'invariant 2 tombait tout seul. Et le même `dt` gouvernait
le compte à rebours du prochain quiz et la cadence de sauvegarde, qui s'espaçait
d'autant.

**Ce que ça change.** Le temps d'écran, le prochain quiz et la sauvegarde
comptent en temps réel. Un parent qui règle quarante-cinq minutes obtient
quarante-cinq minutes de pendule, quelle que soit la tablette.

**Et le plafond n'est pas une précaution, c'est le cœur de la chose.** Quand
l'onglet passe à l'arrière-plan ou que l'appareil s'endort, le navigateur cesse
d'appeler la boucle : au réveil, l'écart réel vaut des minutes. C'est la borne
de `dt` qui protégeait de cela par accident ; `chronoReel` le fait exprès, à
deux secondes — de quoi laisser passer en entier l'image la plus lente qu'on ait
mesurée, et couper net tout ce qui ressemble à une absence.

**Et l'horloge vit chez l'appelant.** Mon premier montage la mettait dans
`education.js`, qui ignorait alors le `dt` qu'on lui passe. Le portail l'a
refusé : `reglages.js` simule le temps en appelant `update` deux cents fois
pour éprouver que le quiz se cumule d'un mode de jeu à l'autre, et ce témoin
est tombé aussitôt. `main.js` sert désormais le temps réel, `education.js` le
compte — une classe qui va lire l'horloge du monde ne se met plus à l'heure
qu'on veut.

**Ce qui le prouve.** Un témoin neuf dans `parent.js`, rouge sur l'ancien code.
Il alourdit chaque image pour retrouver la cadence d'une tablette fatiguée, puis
regarde ce que le compteur retient d'une fenêtre de temps réel connue : **0,25
avant, 0,98 après**, à 5,1 images par seconde. Et la table des gardiens gagne
deux entrées : `cadence.js` a désormais `education.js` pour client, donc
`parent.js` et `reglages.js` doivent se réveiller quand l'horloge change.
Portail complet vert.

---

## v233 — La minicarte suit l'avion au lieu de le regarder partir

**Pourquoi.** Max, capture en vol : « pas dingue la carte en retard ». Mesuré à
la sonde, à 95 blocs/s et à la distance d'affichage de l'iPad : **soixante-
quatorze blocs parcourus entre deux redessins en moyenne, 99,7 au pire** — pour
une minicarte qui fait 96 blocs de rayon. Elle montrait donc, en moyenne, un
paysage laissé aux trois quarts derrière soi, et au pire un paysage entièrement
sorti du cadre.

Deux causes se cumulaient, et la seconde interdisait de corriger la première.
Le minuteur comptait en `dt` — c'est le piège de la v226, et la minicarte est
la **seule** cadence de ménage à ne pas y être passée : le jeu borne `dt` à un
vingtième de seconde, si bien qu'une seconde de minuteur en réclame 2,4 réelles
dès que la cadence tombe, c'est-à-dire précisément en vol. Et redessiner plus
souvent coûtait trop cher : 30,8 ms pour vingt-cinq mille points dont chacun
descend une colonne du monde.

**Ce que ça change.** La carte se rafraîchit quand l'enfant a **bougé**, pas
quand une horloge sonne — debout sans bouger, elle ne coûte plus rien. Et le
fond **défile** au lieu d'être recalculé : entre deux rafraîchissements on
recopie ce qui reste à l'écran et l'on ne calcule que la bande neuve. Le retard
tombe de 74 blocs à 9,7, pour le même coût total.

**Ce qui le prouve.** Deux témoins neufs dans `monte.js`, rouges sur l'ancien
code. Le premier mesure une **distance**, pas une durée : mon premier jet
comptait le plus long moment sans changement et rendait 1,01 s contre une barre
d'une seconde — un pour cent de marge, un chiffre qui bouge avec la cadence du
banc. Ce que l'enfant subit, c'est le nombre de blocs de retard, et il ne dépend
pas de la vitesse d'affichage : 97,3 en moyenne sur l'ancien code, 12 sur
celui-ci. Le second vérifie que le fond défilé montre **exactement** ce qu'un
calcul entier montrerait — 37 249 points, zéro écart —, sans quoi une recopie
qui dérive d'un point afficherait un paysage faux sans que personne ne le voie.
**Et un poisson ne se retrouve plus enterré dans la roche.** Le portail a rendu
rouge un témoin sans rapport avec la carte : « chacun est dans l'eau ». La sonde
l'a démonté sur `origin/main`, donc en production — vingt-quatre relevés hors de
l'eau sur cent vingt à un rivage donné, des poissons à la cote de l'eau avec le
terrain quatorze blocs plus haut. Le demi-tour devant un obstacle est
progressif : le poisson continue d'avancer pendant qu'il vire, et il lui arrive
de franchir le rivage avant d'avoir fini ; le clampage de profondeur ne le
rattrape pas, il le maintient à la cote de l'eau **dans** la colline. Le remède
n'est pas un meilleur clampage, c'est de ne pas y aller : on calcule le pas, on
regarde si l'arrivée est de l'eau, sinon on reste où l'on est en virant plus
franchement.

Portail complet vert.

---

## v232 — Les avions ressemblent enfin à des avions

**Pourquoi.** Max, capture à l'appui : « fix plane design, they are not
realistic ». C'était vrai, et pas pour des raisons de goût — trois défauts se
mesurent.

Le fuselage n'était pas un tube mais une **planche** : l'atelier met à
l'échelle une primitive unitaire, si bien que le rayon écrit dans le code était
en réalité un diamètre. L'avion de ligne avait donc un corps de 1,05 bloc
d'épaisseur, des hublots posés à ±0,99 — presque le double du rayon, flottant
dans le vide — et une bande de livrée large de 2,12, deux fois le fuselage :
c'est elle qu'on voyait, une planche bleue plus grosse que l'avion.

Chaque appareil **débordait de son poste de stationnement** : seize blocs
réservés, 21,5 rendus ; vingt pour le Concorde, trente et un rendus — à cheval
sur son voisin, passage compris. Et le train descendait à 0,68 bloc **sous le
sol** : un avion garé avait les roues enterrées jusqu'à l'essieu.

**Ce que ça change.** Les trois appareils sont redessinés sur les proportions
réelles de leur type — 37,6 m de long pour 4,0 de fuselage et 35,8 d'envergure
pour l'avion de ligne, et tout le reste s'en déduit. Le fuselage est un vrai
tube, à nez arrondi pour les avions civils et pointu pour le chasseur ; les
ailes s'effilent au lieu d'être des plaques rectangulaires ; les réacteurs
pendent à un mât au lieu de flotter sous l'aile ; les dérives sont en flèche ;
les hublots et la livrée sont sur la peau. Chacun tient exactement dans le
poste que l'aéroport lui réserve, et se pose sur ses roues.

**Ce qui le prouve.** Trois témoins neufs dans `carteMonde.js`, tous rouges sur
l'ancien code : chaque appareil tient dans son poste (21,5/16 → 15,92/16), rien
ne passe sous le sol (−0,68 → +0,01), et le saumon d'une aile est court
(0,142 de la longueur → 0,040). Ce dernier ne porte que sur deux appareils sur
trois, et le dit : l'ancien Concorde était déjà bâti en panneaux de corde
décroissante, aucun seuil ne l'aurait séparé sans le déclarer bon avant la
correction. Le reste se juge en capture, comme le veut la règle du projet — vue
de rue et vue aérienne, avant et après. Portail complet vert.

---

## v231 — L'avion penche dans son virage

**Pourquoi.** Max, après avoir volé : « ça serait bien que quand on vole avec
un avion et qu'on va à gauche, il tilte un peu. Idem pour la partie droite. »
Depuis la v228 le joystick tient le cap, et l'appareil tournait **à plat** —
comme une maquette qu'on pousse sur une table. Un virage se sentait aux
commandes et ne se voyait nulle part.

**Ce que ça change.** Les trois appareils s'inclinent maintenant dans leurs
virages, jusqu'à trente degrés — le virage d'un avion de ligne en croisière,
pas de la voltige. On entre dans l'inclinaison et l'on en sort progressivement,
à la VIVACITÉ de la fiche : le chasseur s'incline sec, le Concorde prend son
temps, exactement comme ils virent. C'est purement visuel : le cap vient
toujours du joystick et la trajectoire ne change pas d'un bloc. Lâcher les
commandes remet les ailes à plat, et descendre aussi.

**Ce qui le prouve.** Deux témoins neufs dans `monte.js`, tous deux rouges sur
l'ancien code, et le SIGNE vérifié en capture avant d'être écrit — à gauche
l'aile gauche descend, à droite c'est le miroir exact. Un témoin qui ne
mesurerait que l'amplitude laisserait passer une inclinaison à l'envers, ce
qui est pire que pas d'inclinaison. Le second témoin exige d'abord que
l'appareil se soit penché avant de vérifier qu'il se redresse : sans cette
clause il serait vert à vide sur un code qui ne s'incline jamais. Portail
complet vert.

---

## v230 — Deux voitures de plus, et le jeu accepte désormais un modèle qu'on lui donne

**Pourquoi.** Max a déposé trois fichiers `.glb` : « ajoute cette voiture ».
Deux étaient **octet pour octet identiques** — ce sont donc deux voitures, une
Lucid Gravity et une Bugatti Chiron « white stealth ».

Elles ne suivent pas le manifeste de la flotte
(`vendor/voitures/LICENSE.md`), auquel trois endroits du jeu se fient :
maillages quantifiés, chaque roue éclatée en **huit nœuds** — un par matériau
— aucun matériau nommé `Paint`, et le nez sur un autre axe. Livrées telles
quelles : voiture en travers, flottant au-dessus du sol, roues figées, pas de
reflets sur la carrosserie.

**Ce que ça change.** Convertir chaque fichier à la main aurait marché **une**
fois. Le chargeur MESURE désormais le modèle qu'on lui donne : il retrouve les
roues par leur lignée de noms, en déduit l'axe de la longueur (un empattement
est toujours plus long qu'une voie), lit l'avant sur les noms plutôt que sur
la géométrie, regroupe chaque roue sous un vrai pivot, tourne le modèle par
quarts de tour et le pose au sol. Les prochains modèles que Max dépose
marcheront sans conversion.

Et **il ne touche à rien quand le manifeste est respecté** : les cinquante
d'origine ne changent pas d'un pixel.

La flotte passe de cinquante à cinquante-deux modèles. Le pas de tirage reste
17, qui est premier avec cinquante-deux — les cinquante-deux défilent donc
toujours sans se répéter.

**Ce qui le prouve.** Deux témoins dans `monte.js`, et l'un des deux est un
**témoin de contrôle**, vert des deux côtés à dessein : les modèles du
manifeste doivent rester identiques. Mesuré par le vrai chargeur du jeu :

| | forme | roues | rayon | posée au sol | longueur |
| --- | --- | --- | --- | --- | --- |
| Lucid Gravity | mesuré | 4 | 0,404 | oui | 5,11 m |
| Bugatti Chiron Stealth | mesuré | 4 | 0,371 | oui | 4,60 m |
| Bugatti Chiron (d'origine) | manifeste | 4 | 0,344 | oui | 4,64 m |
| Audi R8 (d'origine) | manifeste | 4 | 0,344 | oui | 4,53 m |

Les dimensions collent au réel : une Lucid Gravity fait 5,03 m, une Chiron
4,54 m.

**Un piège évité de justesse.** Un témoin existant vérifie que « le volant
reste dans l'habitacle, visible par les vitres » sur la voiture que l'enfant
conduit — tirée au hasard de la flotte. Or ces deux modèles sont des
carrosseries seules : la Chiron Stealth n'a aucun intérieur, la Lucid une
planche de bord sans volant. Le témoin aurait basculé **deux fois sur
cinquante-trois**, soit quatre pour cent des exécutions — le genre de rouge
intermittent qu'on met des jours à démonter. La règle vit donc dans la FICHE
(`habitacle: false`), jamais dans une liste écrite dans le témoin — même
discipline que `montable`, `nourrissable` et `vole`.

Les fichiers ne sont pas dans la liste `ASSETS` du service worker : chaque
voiture se télécharge à sa première rencontre, donc le premier chargement ne
s'alourdit pas.

## v229 — Le monde se charge deux fois plus vite, et les avions ne le dépassent plus

**Pourquoi.** Max : « les jets volent trop vite, la carte n'arrive pas à
suivre et ça rame. Améliore l'efficacité de la carte et réduis un peu la
vitesse. » Mesuré à 264 blocs par seconde : **quatre à sept pour cent** du
paysage devant l'enfant était réellement construit, le premier trou à
trente-deux blocs, et **deux appels de dessin par image** — il n'y avait
littéralement rien à afficher. L'avion volait devant son monde.

La cause n'était pas celle qu'on devine. Ce n'était pas la file d'attente des
morceaux, que je soupçonnais : elle coûte trois millisecondes par seconde,
mesuré. C'était le budget. `MESH_BUDGET_MS` valait **six** millisecondes quand
construire un morceau en coûte **5,4** : la boucle en construisait un,
regardait l'heure, en construisait un second et s'arrêtait. Le budget ne
bornait donc rien — il figeait le débit à deux morceaux par image, quoi qu'on
écrive.

**Ce que ça change.** Le monde se construit **deux fois plus vite** — 76 à 154
morceaux par seconde, sans coûter une image — et les avions volent à une
vitesse que ce monde sait servir. Concrètement, à quelle distance devant soi
commence le paysage pas encore construit :

| | avant | après |
| --- | --- | --- |
| avion de ligne | 96 blocs | **132–137** |
| Concorde et chasseur | 32–51 blocs | **125–138** |

Le brouillard commence à 106 blocs : le trou est désormais **derrière** lui,
donc invisible. L'enfant ne rattrape plus le bord du monde.

**Ce qu'on perd, et c'est une décision de Max.** Le plafond du chargement est
cent dix blocs par seconde. Garder le rapport réel — 900 km/h contre 2 180,
soit 1 à 2,4 — voulait dire un Concorde qui vole toujours devant le monde.
Devant le choix, Max a tranché : **tout le monde autour de cent.** 95 pour
l'avion de ligne (juste au-dessus des 88 du vol libre, sinon prendre l'avion
ne sert à rien), 110 pour le Concorde et le chasseur, qui ne se distinguent
plus que par leur agilité. Le rapport tombe à 1,16 ; c'est déclaré dans
`TASKS.md`, et le seul moyen de le reprendre est de construire encore plus
vite.

**Ce qui le prouve.** Un témoin neuf dans `monte.js`, et il a fallu le
corriger **deux fois** avant qu'il ne prouve quoi que ce soit.

- D'abord il était **vert sur `origin/main` à 264 blocs par seconde** : le
  banc ouvre le jeu avec une distance d'affichage de deux morceaux, où le
  brouillard commence à dix-huit blocs et où rien ne peut manquer. Il mesurait
  le banc. Il demande désormais la distance de l'iPad.
- Ensuite il lisait **un instantané**, et un front de chargement est
  irrégulier : le même code rendait 68, 91 puis 101 blocs. J'ai failli
  descendre les avions pour poursuivre un chiffre qui bougeait tout seul — à
  140 il rendait moins qu'à 170. Six relevés et la médiane : les
  distributions se séparent alors nettement.

Rouge sur `origin/main` (trou à trente-deux blocs), vert ici, la même mesure
des deux côtés.

## v228 — Les avions sont garés au poste, et le bouton les fait décoller

**Pourquoi.** Max, trois captures à l'appui : « les avions sont moches, posés
n'importe où et inutilisables », puis « le Concorde, il ne décolle pas ».
Trois défauts distincts, et la sonde en a trouvé les trois causes — dont
aucune n'était celle qu'on aurait devinée en regardant l'image.

*Posés n'importe où.* Vingt et un postes de stationnement sur cinquante-sept
étaient **dans un bâtiment**. Roissy n'avait aucune branche dans le plan des
postes : il tombait dans le cas des villes moyennes, donc à vingt-deux blocs
du centre — entre `HALL_INT` (8) et `HALL_EXT` (18), c'est-à-dire dans le hall
de l'aérogare 2. Et les appareils étaient posés nez vers le nord, ce qui
réclame vingt blocs de profondeur pour une aire qui en fait douze — sept à
Roissy. Enfin le cap venait d'un `Math.random()` : l'espèce étant `immobile`,
un avion garé pointait dans une direction quelconque, pour toujours.

*Inutilisables.* Le bouton ✈️ appelait `toggleFly()`, qui réussissait et
basculait un drapeau que la physique de vol **ignore complètement**. Aucun
effet, aucun message : l'enfant appuie et il ne se passe rien. Et pour
décoller il fallait deviner qu'on tient « avant » pour les gaz, qu'on lève les
yeux pour l'assiette, et qu'il faut d'abord dépasser la vitesse de décrochage.

**Ce que ça change.** Les cinquante-sept appareils sont au poste, sur le
revêtement, alignés le long de l'aérogare comme au large d'un vrai aéroport.
À Roissy, les deux avions **en blocs** du poste nord ont cédé la place aux
trois qu'on pilote : l'avion qu'un enfant voit à la porte est celui dans
lequel il monte.

Et les commandes sont celles que Max a demandées : **le bouton ✈️ décolle**
(l'appareil monte tout seul de vingt blocs, au-dessus des terminaux et des
tours de contrôle), **le joystick tient l'altitude et le cap**, la vitesse est
automatique, et le regard reste libre pour le paysage. Un second appui se
pose. Trois commandes à deviner sont devenues deux axes et un bouton.

**Ce qui le prouve.** Trois témoins neufs. Celui des postes interroge le
**bâtisseur** — `buildAeroport` et `buildAerodrome` sont des fonctions pures,
on leur donne un `poser` qui note tout — et il mesure les dix-neuf aérodromes
en quelques millisecondes sans y aller : **21 en faute sur `origin/main`, zéro
ici**, la même mesure des deux côtés. Un deuxième vérifie que les appareils
d'un même aérodrome pointent tous dans le même sens. Le troisième éprouve le
trajet de l'enfant : on se met aux commandes, on appuie sur la touche du
bouton, et l'on regarde si l'appareil **prend de l'altitude** — pas si un
drapeau a changé.

**Ce qui n'est pas fait, et pourquoi.** Les modèles restent sculptés à la
main, et la capture montre qu'un avion **en blocs** posé à côté se lit mieux
qu'eux : fuselage trop fin, ailes en plaques plates. C'est le plafond que la
voiture avait atteint avant `voiture.glb`. Le chargeur de modèles pour les
avions n'est pas écrit : ce serait une brique dont rien ne se sert tant qu'il
n'y a pas de fichier — la panne de `monuments.js`, livré sans un seul
`import`. Dette déclarée.

## v227 — Le premier chargement ne télécharge plus ce qui ne sert pas à jouer

**Pourquoi.** Max : « Le jeu lag, on peut pas l'alléger… ? » puis, tout de
suite après, la vraie phrase : « En fait c'est just long à load le first
time. » Mesuré sur la production, fichier par fichier : le premier
chargement pèse **5,79 Mo compressés**, dont **4,67 Mo pour le seul scanner
de visages** — contre **1,12 Mo pour le jeu ENTIER, ses 78 fichiers**.
Quatre-vingts pour cent du premier chargement partaient donc dans une
bibliothèque de reconnaissance faciale dont l'enfant n'a pas besoin pour
jouer.

Et ils partaient au pire moment. Le préchargement s'annonçait « pendant que
l'enfant lit l'accueil » ; il était armé par `requestIdleCallback`, qui rend
la main dès que la boucle respire — c'est-à-dire **pendant que le monde
s'engendre**, juste après que l'enfant a appuyé sur « Jouer ». Ce n'est pas
seulement un téléchargement : il charge aussi trois réseaux de neurones en
mémoire, sur le processeur dont le monde a besoin.

**Ce que ça change.** Le premier lancement ne prend plus que ce qu'il faut
pour jouer. Le scanner attend que la page ait autre chose à faire : l'enfant
qui reste sur l'accueil l'obtient comme avant, celui qui part jouer l'obtient
à sa première pause, et celui qui touche « Reconnais-moi » sans attendre a
toujours sa barre de progression, qui dit ce qu'elle fait. Rien n'est retiré ;
c'est l'ordre qui change.

**Ce qui le prouve.** Onze témoins, dont deux neufs dans `maj.js`. Le premier
regarde les REQUÊTES, pas une variable : l'enfant ouvre le jeu, appuie sur
« Jouer », joue vingt-cinq secondes, et pas un octet de scanner ne doit passer
sur le fil. Rouge sur `origin/main` — quatorze fichiers — vert ici. Le second
est vert des deux côtés à dessein : il vérifie que le remède ne va PAS trop
loin, en gardant le préchargement pour l'enfant qui reste sur l'accueil.

Ce qui est **établi**, c'est le poids : quatorze requêtes de scanner pendant
qu'on joue sur `origin/main`, zéro ici. Le temps, lui, se dit avec prudence —
le banc rend en logiciel et il bouge beaucoup. Quatre passages de chaque côté
à 12 Mb/s : **10,9 s de moyenne avant de pouvoir jouer contre 8,2**, et
surtout un écart entre passages qui tombe de 7,7–15,8 s à 7,5–9,3. À 4 Mb/s,
deux passages chacun, aucune différence mesurable. **On ne promet donc pas de
secondes sur l'iPad de Max** : on promet 4,67 Mo qui ne partent plus pendant
qu'il attend.

## v226 — Les villes ne sont plus vides quand on y arrive

**Pourquoi.** Max, deux fois : « clairement pas de piétons, pas de vie dans les
villes », et « it took a while to see cars in paris ». Le témoin de fumée le
disait aussi, en rouge et **en production** : trois passants dans les
soixante-deux blocs au milieu d'une traversée de Paris, au lieu de dix-huit.

Deux versions avaient déjà tenté de le corriger. La **v217** a réglé le seuil
de rapatriement sur la portée de rendu ; la **v218** a réglé la répartition sur
le champ de vision. Les deux avaient raison — et aucune ne pouvait suffire,
**parce que la boucle qui les applique ne tournait pas**.

**Ce que ça change.** `main.js` borne `dt` à un vingtième de seconde. C'est
juste, et c'est écrit depuis Washington : sans cette borne, une chute de cadence
fait traverser les murs. Mais un minuteur écrit `minuteur -= dt` **hérite de la
borne**. Relevé en traversant Paris, arrêt par arrêt :

| arrêt | cadence | tours de rapatriement | passants à moins de 62 blocs |
| --- | --- | --- | --- |
| 1 | 6,9 im/s | 18 | 18 |
| 3 | **2,7** | **0** | 7 |
| 4 | **2,8** | **0** | 3 |
| 5 | 3,0 | 18 | 18 |

À 2,75 images par seconde, deux secondes de minuteur réclament quarante images,
soit **quatorze secondes réelles**. Le tour ne venait jamais. Et la cadence
s'effondre précisément quand l'enfant **arrive** quelque part et que les
morceaux de monde se chargent : la ville était vide au moment exact où il la
regardait, et pleine dès qu'il n'y faisait plus attention.

`src/cadence.js` porte désormais la distinction, et elle vaut au-delà de ce
défaut-ci : une **animation** suit le temps du jeu — une bête qui fuit, une
balle qui rebondit, une flamme qui s'éteint ralentissent avec le reste, et
c'est cohérent. Une cadence de **ménage** — repeupler, faire naître une
voiture, regarnir un poste de stationnement — décide si le monde *existe*
autour de l'enfant : elle ne doit rien devoir à la vitesse d'affichage. Les
quatre cadences de ménage y passent (passants, circulation, garagiste,
aéroportiste).

| | avant | après |
| --- | --- | --- |
| Pire creux d'une traversée de Paris | **3** passants | **16** (seuil du témoin : 3) |
| Peuplement à l'arrivée dans une ville | 6 à 8,5 s | **1,5 s** |

**Ce qui le prouve.** Voie longue complète, **les treize suites vertes**. Le
témoin « et elle reste habitée quand on la traverse à pied », rouge en
production depuis des versions, passe avec cinq fois la marge du seuil — et la
cadence d'affichage est identique des deux côtés (2,5 à 6,7 images/s), donc
c'est bien le jeu qui a changé, pas le banc.

**Et le banc avait le même mal, à trente lignes de là.** Le témoin « chaque
îlot a sa porte » marchait **2,2 secondes de temps réel** pour franchir six
blocs, quand le joueur avance en `dt` borné : à trois images par seconde, cela
ne fait plus qu'un bloc, et le témoin rougissait sur le perron. Il marche
désormais jusqu'à être entré ou jusqu'à ne plus avancer sur trois pas — le
remède que son voisin « on entre dans l'Air et l'Espace » avait déjà payé — et
**il dit ce qu'il a vu** : façade essayée, plafond, murs, position. Il ne
rendait aucun détail, et un rouge muet ne se démonte pas.

**Ce que j'aurais pu faire et n'ai pas fait.** Ce rouge-là était vert rejoué
seul, deux fois sur la branche et deux fois sur `origin/main` : la règle de la
v195 autorisait la fusion avec une dette déclarée. Mais j'ai déjà expliqué deux
rouges par « la charge du banc » sans le mesurer, et `CLAUDE.md` en garde la
trace. Quand la cause est identifiable et que le remède existe déjà dans le
fichier, on corrige au lieu de déclarer.

---

## v225 — Et le portail passe de 59 à 48 minutes

**Pourquoi.** La v224 avait ramené la limite de `souffler()` de deux minutes à
trente secondes. Le relevé qu'elle a livré du même coup disait que ce n'était
pas fini : **les trente-huit appels tapaient encore leur limite**, avec une
charge qui restait entre 3,0 et 5,7 et ne repassait jamais sous le seuil de
2,0. Une attente qui expire à tous les coups n'est pas une condition.

**Ce que ça change.** La question posée à la machine, plutôt qu'un chiffre
choisi : **que coûte une page ?**

```
machine au repos          0,14
UNE page ouverte          1,16 → 2,02 → 3,08 → 3,77 → 4,04   (régime établi)
DEUX pages ouvertes       4,13 → 4,66 → 4,83
```

Sur quatre cœurs, **une seule page de jeu porte déjà la charge à près de 4**.
Le seuil de 2,0 était donc SOUS le coût d'une page : inatteignable dès qu'un
navigateur était ouvert, et l'attente était constante *par construction*. Ce
n'était pas un réglage trop prudent, c'était un délai fixe déguisé en
condition.

4,2 sépare ce que les mesures séparent : une page passe sans attendre, deux
pages attendent — et c'est bien la concurrence DANS une suite que la v220
avait mesurée comme coûteuse (42,9 → 20,8 → 14,8 images/s). Le relevé par
tablette le montre à l'œuvre : `souffler 0,0 s` quand une seule page est
ouverte, `30,0 s` quand il y en a plusieurs.

| suite | v223 | v224 | **v225** |
| --- | --- | --- | --- |
| `reseau.js` | 29 min 46 s | 26 min 48 s | **18 min 13 s** |
| `reglages.js` | 19 min 41 s | 7 min 14 s | **6 min 20 s** |
| `carte.js` | 10 min 49 s | 4 min 17 s | **3 min 43 s** |
| **le portail** | **83 min** | **59 min** | **≈ 48 min** |

**Ce qui le prouve.** Les treize suites vertes avec le seuil neuf. Le témoin de
fumée reste rouge sur la vie de rue — dette déclarée dans `TASKS.md`, prouvée
en production (rouge deux fois sur trois sur `origin/main`, suite rejouée seule
des deux côtés dans un arbre séparé), et sans rapport avec cette livraison.

**Et le conteneur a redémarré au milieu du portail** — la reprise a fait son
travail exactement comme elle est écrite : douze verdicts déjà tombés, gardés
parce que l'empreinte du code n'avait pas bougé d'un octet (`banc.js` est dans
l'empreinte de CHAQUE suite, ce qui rend la reprise sûre ici), et seule la
treizième a été rejouée. Une reprise ne vaut que par la finesse de son
empreinte ; celle-ci le vaut.

Cette version ne change rien au jeu — elle change le banc.

---

## v224 — Le portail passe de 83 à 59 minutes

**Pourquoi.** Max : « pourquoi ça prend autant de temps de construire, et
trouve des solutions pour que ça aille dix fois plus vite. » Le portail durait
une heure et demie et **n'avait jamais dit où elle passait** : chaque
proposition d'accélération était donc une intuition. J'en ai formulé quatre.
Les quatre étaient fausses.

| j'ai annoncé | la mesure |
| --- | --- |
| « les attentes fixes sont le gros morceau » | 7 % de `reseau.js` |
| « 43 ouvertures de jeu, 16 pour `carte.js` » | mauvais motif : c'était le *panneau* de la carte |
| « 16 démarrages pour 13 suites, rien à couper » | mauvais motif encore : il y en a 37 |
| « donc ~100 s par page » | **4,7 à 8,7 s** — une division, pas une mesure |

**Ce que ça change.** Le portail se chronomètre, suite par suite et témoin par
témoin, et il finit par un classement « où passe le temps ». C'est ce relevé
qui a montré la cause en une exécution, là où quatre hypothèses avaient échoué :

```
souffler   0,0 s · chargement  5,1 s · __game 0,0 s
souffler 120,0 s · chargement  9,4 s · __game 1,3 s
souffler 120,0 s · chargement 10,1 s · __game 1,9 s
souffler 120,0 s · chargement 13,7 s · __game 0,1 s
```

**`souffler()` avait un défaut de deux minutes et l'atteignait cinq fois sur
six.** Ce n'est pas une attente qui converge, c'est une attente qui expire :
six cents secondes sur les mille quatre-vingts de `reglages.js` — la moitié de
la suite — à regarder un nombre qui ne redescendra pas.

| suite | avant | après | |
| --- | --- | --- | --- |
| `reglages.js` | 19 min 41 s | **7 min 14 s** | −63 % |
| `carte.js` | 10 min 49 s | **4 min 17 s** | −60 % |
| `monte.js` | 5 min 50 s | 4 min 05 s | −30 % |
| `reseau.js` | 29 min 46 s | 26 min 48 s | −10 % |
| **le portail** | **83 min** | **59 min** | **−29 %** |

**Et une heure de plus était rendue en amont** : élargir la table des gardiens
est désormais reconnu comme anodin. Déclarer un module neuf coûtait le portail
entier — deux lignes, soixante minutes — alors qu'un gardien AJOUTÉ ne peut
faire tourner que *plus* de suites, jamais moins. La preuve n'est pas dans le
diff mais dans les deux tables : la nouvelle doit être un sur-ensemble de celle
d'`origin/main`, clé par clé.

**Ce qui le prouve.** Portail complet vert, les treize suites, **après** la
coupe : rien n'a rougi d'avoir moins attendu, ce qui est la seule façon de
savoir que ces deux minutes ne protégeaient rien. Et la raison était déjà
mesurée et écrite dans `CLAUDE.md` depuis la v220 — la charge d'une minute est
une moyenne **qui décroît**, sans relation avec la cadence réelle (58,5 · 43,0 ·
45,9 · 47,4 · 55,9 images/s pendant qu'elle montait de 3,40 à 5,16, 14,7 Go
libres d'un bout à l'autre). `attendreLeCalme` était passé de 180 à 30 s pour
ce motif exact. **Le remède était resté dans le fichier qu'on regardait** :
`souffler`, la même idée dans le fichier d'à côté, a gardé ses deux minutes
deux versions de plus.

Cette version ne change rien au jeu — elle change le banc. Le numéro monte
quand même, parce que c'est lui qui fait foi.

---

## v223 — On pilote un avion, et il y a désormais où atterrir

**Pourquoi.** Max : « add planes, airbus, concord and military jets and allow
us to fly with them at relevant speed for each ».

Le projet prévoit **trois façons d'être portées** depuis la v155 : la monture
suit le joueur, le convoi suit son tracé précalculé, et le **pilote** décide où
l'on va. Les deux premières existaient ; la troisième était déclarée « à
faire », avec son branchement déjà écrit noir sur blanc. Il ne restait qu'à la
faire.

**Ce que ça change.** Trois appareils attendent sur le tarmac de Roissy, et
l'on s'y installe comme on monte à cheval — le bouton dit « ✈️ Piloter », et
« ⬇️ Se poser » pour redescendre.

| appareil | vitesse de pointe | ce qui le distingue |
| --- | --- | --- |
| Avion de ligne | 110 blocs/s | deux réacteurs sous l'aile, des hublots |
| Concorde | **264** | l'aile delta, le nez fin, quatre réacteurs |
| Avion de chasse | 264 | des canards, deux dérives, deux missiles |

**Les vitesses sont des rapports réels, pas des goûts** : 900 km/h pour un
avion de ligne, 2 180 pour le Concorde, 2 200 pour un chasseur — soit
1 : 2,4 : 2,4. Le chasseur ne se distingue donc pas par sa pointe mais par son
**agilité** : il grimpe trois fois plus vite et vire trois fois plus court.
L'ancre absolue, elle, est mesurée dans le jeu : un enfant qui vole librement
atteint 88 blocs/s, donc un avion de ligne doit faire mieux — sinon prendre
l'avion ne sert à rien.

**Et le pilotage n'invente aucune commande.** C'est l'idée de Max, et elle
reste juste : tout se réduit aux trois nombres que le clavier et le joystick
tactile alimentent déjà. `forward` est la manette des gaz — et la vitesse **se
garde** quand on lâche, ce qui distingue un avion d'une voiture et permet de
regarder le paysage sans tomber. `strafe` est le roulis, qui ne fait virer
qu'en volant : un avion à l'arrêt ne pivote pas sur place. Le regard donne
l'assiette. Et **la portance dépend de la vitesse** : sous le décrochage,
l'appareil descend — c'est ce qui oblige à prendre son élan avant de tirer sur
le manche.

**Ce qui le prouve.** Trois témoins de `monte.js`, rouges sur l'ancien code
(où le mode n'existe pas) :

| appareil | pointe atteinte | parcouru en 2 s de croisière |
| --- | --- | --- |
| Avion de ligne | 110 blocs/s | 227 blocs |
| Concorde | 264 | 546 (× 2,4) |
| Avion de chasse | 264 | 541 (× 2,4) |

Portail complet vert.

**Et une erreur de témoin, dite parce qu'elle instruit.** Mon premier jet
donnait quatre secondes d'accélération à tout le monde et concluait que l'avion
de ligne n'atteignait pas sa vitesse. Il l'atteignait très bien : à 18 blocs/s²
de poussée, quatre secondes font 73 blocs/s — exactement ce que sa fiche
annonce. C'était la mesure qui était trop courte, pas la physique. Le temps
d'accélération vient désormais de la fiche (`max / poussee`), jamais d'un
chiffre rond.

### Et dix-neuf aérodromes, parce qu'un avion sans destination ne sert à rien

**Pourquoi.** Max, capture à l'appui : « il faut que tu refasses l'aéroport de
Charles-de-Gaulle parce qu'il est maintenant **sur** la ville de Paris et pas à
côté de la ville de Paris, et j'aimerais bien que tu rajoutes des aéroports
fidèles aux aéroports originaux, des buildings dans lesquels on peut rentrer,
se promener avec ses différents terminaux […] Et rajoute des bases militaires
pour les avions de chasse. »

Roissy était bien sur Paris : **cent vingt et un blocs de chevauchement** avec
le disque de la capitale, mesurés. La cause est celle qu'on connaît par cœur —
Paris est passé de 55 à 185 blocs de rayon lors de sa remise à l'échelle
(v187), et l'aéroport, posé bien avant, n'a jamais suivi. C'est mot pour mot le
piège du Bay Bridge planté au milieu de San Francisco.

Et il n'y en avait qu'UN sur toute la carte. Un avion qui décolle de Roissy
n'avait nulle part où se poser.

**Ce que ça change.** Roissy déménage à deux cent quatre-vingt-onze blocs au
nord de Paris, et **dix-huit aérodromes** s'y ajoutent : quatorze aéroports —
Orly, Heathrow, JFK, Barajas, El Prat, Schiphol, Francfort, Fiumicino, Haneda,
Dubaï, Delhi, San Francisco, Los Angeles, Istanbul — et **quatre bases
aériennes** d'où partent les chasseurs. Ils sont sur la carte, donc on s'y
téléporte.

**Le terminal se visite.** On entre de plain-pied, on traverse les halls par
leurs cloisons percées, et l'on ressort côté pistes pour rejoindre son avion.
Il y a la tour de contrôle, les hangars, les pistes numérotées avec leurs
seuils en échelle, le tarmac et ses postes de stationnement — et trois
appareils qui attendent, toujours, à l'aérodrome où l'on se trouve.

**Chaque aéroport est placé dans le cap RÉEL depuis sa ville**, juste au-delà
de son disque, et l'écart au vrai cap est écrit ligne à ligne quand la carte ne
l'a pas permis. Quand le cap réel tombe à l'eau — JFK est sur la baie de
Jamaica, Fiumicino sur la mer, Haneda dans la baie de Tokyo — on prend le cap
terrestre le plus proche plutôt qu'un aéroport noyé. Le nord-est de Paris, lui,
tombe pile sur le quartier des enfants et sur le musée : Roissy part donc plein
nord. **Le sol des enfants passe avant la fidélité du plan, toujours.**

**Ce qui le prouve.** C'est la **septième fois** que l'exception accordée par
Max sur l'invariant du sol sert, et elle se borne comme en v162, v187 et v204 :

|  | colonnes | empreinte |
| --- | --- | --- |
| Le relief entier — **il change, c'est déclaré** | 218 089 | `c20adb73…` → `47fbedd4…` |
| Hors des villes **et des aérodromes**, sur `origin/main` | 170 278 | `b2566e0e…` |
| Hors des villes et des aérodromes, sur la branche | 170 278 | **`b2566e0e…`** |

La même découpe des deux côtés, colonne pour colonne. On ne met pas un hash à
jour : on mesure les deux côtés. Et le déménagement **rend son sol** — la
colonne (−140, 80), aplanie à 35 sous l'ancien tarmac, retrouve sa cote
naturelle de 34, exactement comme l'avait promis le déménagement de Washington
en v162.

Trois témoins neufs, rouges sur l'ancien code :

- **on entre dans un terminal, on va d'un hall à l'autre et l'on ressort côté
  pistes** — le témoin se pose dehors, côté ville, et cherche par où l'on peut
  MARCHER, de proche en proche. Un bâtiment fermé, un plancher surélevé d'un
  bloc, une cloison pleine : chacun de ces trois défauts arrête la marche.
  3 sur 3 (un grand aéroport, un moyen, une base) ; 0 sur 3 avant.
- **aucun aérodrome ne se pose sur ce que les enfants ont bâti** — le plus
  proche en reste à cinquante-cinq blocs.
- **ni sur une ville** — la paire la plus serrée garde quatorze blocs.

**LA CINQUIÈME PROMESSE EST NÉE D'UN ROUGE.** La sonde en avait quatre — au
sec, à l'écart des villes, à l'écart de ce que les enfants ont bâti, plate — et
il en manquait une : **pas sur une voie ferrée**. Trois aérodromes se sont posés
sur une ligne de train (Haneda sur le Shinkansen, quarante-cinq blocs dedans ;
Fiumicino sur la Frecciarossa ; Francfort sur l'ICE), et un terminal bâti
par-dessus des rails les mure. C'est un témoin qui existait déjà — « rien de
solide ne barre la route du train » — qui l'a dit, pas une relecture. Les trois
sont déplacés, et **seulement les trois** : rejouer les dix-neuf sous une
promesse de plus les dégradait tous (Roissy repartait au sud-est, JFK sous
trente-deux pour cent d'eau). Une contrainte neuve se paie là où elle mord.

**Et un lieu ne se renomme pas sous les pieds d'un enfant.** Roissy s'appelait
« Aéroport Charles-de-Gaulle » sur la carte ; je l'avais renommé
« Paris–Charles-de-Gaulle » par cohérence avec les dix-huit autres. Le témoin
des grandes destinations l'a perdu — et un enfant qui cherche son aéroport sur
la carte l'aurait perdu aussi. Il a repris son nom.

**Et la sonde de placement a rattrapé ce que la relecture n'aurait pas vu.**
Mon premier brouillon posait Roissy à (−102, −100) : à **deux blocs** de la
maison sauvegardée du témoin de `plafond.js`, celle qui prouve depuis des
dizaines de versions qu'un plancher d'enfant ne bouge pas. La ligne se lisait
très bien. Un aérodrome se place en MESURANT ce qu'il recouvre, jamais en
écrivant deux nombres.

---

## v222 — Un train toutes les trente secondes sur le quai

**Pourquoi.** Max : « make sure trains arrive and depart from train stations ».
On pouvait rester une minute devant une gare sans rien voir venir.

Les gares, elles, étaient au bon endroit — mesuré, les **dix-huit arrêts
déclarés tombent à zéro bloc d'une gare**, et le mécanisme d'arrêt marche
depuis la v179. Ce qui manquait, ce sont les trains : chaque ligne n'en avait
que **deux**, pour un tour qui dure jusqu'à cent vingt-sept secondes entre
Madrid et Barcelone. L'attente sur un quai allait donc de vingt-six à
**soixante-quatre secondes**, pour un arrêt de quatre.

Et la règle était déjà écrite dans le code, deux versions plus tôt, pour le
métro de Washington : « trois rames ramènent l'attente sous la demi-minute, ce
qui est déjà l'intervalle du vrai métro aux heures creuses ». Elle n'avait
jamais été appliquée aux trains intervilles, qui sont pourtant bien plus longs.
Six lignes sur neuf la violaient.

**Ce que ça change.** Le nombre de trains d'une ligne devient un **résultat** :
le tour divisé par la demi-minute, au minimum deux. Et le bouton
d'embarquement dit désormais où l'on va — « train TGV Paris–Lyon » plutôt que
« train TGV ».

| | avant | après |
| --- | --- | --- |
| Pire attente sur un quai | 64 s (Madrid–Barcelone) | **30 s** |
| Trains en circulation | 18 | 29 |

**Ce qui le prouve.** Un témoin de `metro.js`, rouge sur `origin/main` (« 64 s
avec 2 trains ») et vert sur la branche (« 30 s avec 3 trains »). Il ne
chronomètre RIEN : une durée mesurée sur ce banc mesure le banc. Il lit le
nombre de convois que le jeu a réellement créés, recalcule le tour depuis la
géométrie de la voie, et divise. Portail complet vert.

**Et une erreur de témoin, corrigée deux fois.** Le premier jet comptait les
convois par nom de ligne puis divisait par le nombre de segments : il annonçait
« 3,5 trains », un chiffre qui n'existe pas. Le second comptait par le nom de
segment — mais ce nom a changé dans cette même livraison, si bien qu'il
trouvait **zéro** train sur l'ancien code et rendait le bon verdict pour la
mauvaise raison. Un témoin doit échouer *proprement*, avec un message vrai. Il
compte désormais par la LONGUEUR du tour, qui ne dépend d'aucun nom.

---

## v221 — Chaque monument de Paris a sa rue

**Pourquoi.** Des voitures traversaient l'Opéra, les Invalides, la colonne de
la Bastille et la tour Montparnasse. Quarante-neuf pas de convoi, carrosserie
dans la pierre, sur les huit circuits de Paris.

La cause est plus générale que ce qu'on croyait. On avait noté « une voie a le
centre d'un monument pour point de passage » ; c'est vrai, mais partiel. Un
monument de Paris est **plus grand que la place déclarée avec lui**, et les DIX
le sont sans exception : le socle de l'Opéra fait 8 × 7 blocs de demi-emprise
pour une place de rayon 2,2, celui du Louvre 6 × 6 pour une place de 5. Or la
voiture contourne une place en roulant sur son anneau, à un demi-bloc du bord —
donc DANS le bâtiment, quel que soit le tracé des rues.

Et rien ne le montrait. Le cœur d'un socle est **dallé** — c'est le parvis — et
la mesure de tenue de rue annonçait donc 95 à 100 % en lisant le sol SOUS le
monument. C'est exactement le piège déjà écrit dans `CLAUDE.md` : un témoin de
circuit lit le BLOC à la cote du convoi, pas le sol sous lui.

**Ce que ça change.** Chaque monument a désormais sa rue : trois blocs de
chaussée sur son pourtour, comme la rue de Rivoli le long du Louvre ou l'avenue
de Suffren le long du Champ-de-Mars. Les circuits suivent le **périmètre** du
socle — pas un cercle, qui est la fausse piste déjà mesurée : le tour d'un socle
par un cercle coupe les coins dans le square planté et fait tomber la tenue de
rue de 94 à 82 %.

C'est du SOL, pas du relief : les deux empreintes de `plafond.js` ne bougent pas
d'un octet, même raison que la passe de rues de Londres.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js`, mesuré des deux
côtés avec la même découpe : **quarante-neuf pas dans un monument sur
`origin/main`, zéro sur la branche.** Il lit le bloc à la cote du convoi et sur
toute la largeur de la voiture (2,26 blocs) — une aile dans un mur se voit
autant qu'un capot. La tenue de rue des huit circuits passe de 95 · 98 · 100 ·
99 · 96 · 100 · 100 · 100 à 94 · **100 · 100 · 100** · 96 · 100 · 100 · 100 :
deux y gagnent, le pire perd un point. Le virage le plus fermé reste à 140°,
sous la borne de 150°. L'anneau ne prend que 423 colonnes de lot sur les 2 382
qu'il couvre — le reste était déjà du parvis ou de la rue. Portail complet vert.

**Et deux erreurs de méthode, dites parce qu'elles se referont.** J'ai d'abord
compté les pas dans l'EMPRISE d'un monument — cent trente-cinq — et c'était la
mauvaise mesure : un arc de triomphe est creux, passer sous sa voûte n'est pas
le traverser. Puis mon premier remède posait la rue autour des DIX monuments,
butte comprise, et c'était **pire** : dix-neuf pas de carrosserie dans le coteau
sous le Sacré-Cœur, cinq sous le Moulin Rouge. L'anneau y traverse douze et
dix-huit blocs de dénivelée. Une rue ne fait pas le tour d'une colline, et le
vrai Montmartre n'a pas de boulevard autour de la basilique — il a des ruelles
et un escalier. La butte est donc déclarée sans tour dans la fiche du lieu, avec
sa mesure en commentaire, et les onze pas qui y restent sont une dette écrite.

---

## v220 — Revenir dans le jeu ne laisse plus l'enfant devant le bandeau

**Pourquoi.** Sur un iPad, l'application n'est jamais vraiment fermée : elle
s'endort et l'on y revient. C'est le geste NORMAL, et depuis la v159 le jeu
vérifie à ce moment-là s'il existe une version plus récente. Quand il en
trouve une, il pose le bandeau « 📦 Mise à jour du jeu… il faut la dernière
version pour jouer » et attend.

Il pouvait attendre pour toujours. Le minuteur de secours — celui qui devait
sortir l'enfant de cet écran — n'était armé qu'**après** l'installation
complète du service worker, c'est-à-dire après la remise en cache des
soixante-treize fichiers du jeu. Tant que l'installation traîne, rien n'est
armé ; si elle ne finit jamais, rien n'arrivera jamais. Le commentaire du code
annonçait pourtant « si l'installation traîne, on laisse jouer plutôt que de
retenir un enfant devant un écran fixe » : c'était exactement le cas qu'il ne
couvrait pas.

Et le dernier recours était pris au même piège. `forcerMaj` — « 🔄 On va
chercher la dernière version… », le bouton qu'un parent touche sur le badge de
version quand plus rien ne marche — commence par désinscrire le service
worker. Or cette désinscription fait la queue derrière l'installation en
cours : le remède écrit pour un service worker bloqué **attendait le service
worker bloqué**.

**Ce que ça change.** Le filet est désormais unique, écrit une fois pour les
deux chemins (le démarrage et le retour), et sa minuterie part à l'instant où
le jeu décide qu'il y a une mise à jour — plus jamais après l'installation. Il
a trois étapes : à quatre secondes, recharger si la version neuve a déjà pris
la main pendant la veille ; à vingt secondes, repartir de zéro si rien ne
s'installe ; et à quarante-cinq secondes, un plancher — l'enfant a la version
neuve, ou l'on repart de zéro. « Ça s'installe » ne veut pas dire « ça va
finir ». Chaque étape de `forcerMaj` a maintenant son délai, et la page se
recharge dans tous les cas : partir avec un cache à moitié nettoyé vaut
infiniment mieux qu'un écran qui ne bouge plus.

Mesuré sur une installation qui se bloque : l'enfant peut rejouer à **28,3 s**
au lieu de 65,9 s, et le chemin qu'il emprunte est un filet, plus un hasard.

**Ce qui le prouve.** Le témoin « revenir dans l'application recharge sur la
version neuve » était rouge **trois fois sur trois** dès qu'une suite tournait
avant lui, et vert joué seul — trois portails de suite bloqués dessus. Il est
vert. La sonde qui compte les requêtes atteignant vraiment le serveur montre
le mécanisme sans ambiguïté : **huit requêtes pendant cinquante-huit
secondes**, puis cent quarante-huit d'un coup. Portail complet vert.

**Et ce qui n'est PAS prouvé par un témoin, dit comme tel.** Le blocage de
`forcerMaj` est établi par la sonde — le filet l'appelle à vingt secondes,
`wm-maj-forcee` passe à 1, et plus rien pendant vingt-huit secondes — mais
aucun témoin ne le garde. J'en ai écrit deux, ils étaient verts sur l'ancien
code comme sur le neuf (27,8 contre 65,9 s, puis 28,3 contre 36,5 s) : l'ancien
code s'en sort quand même, non par un filet mais parce que l'installation finit
par échouer. Un témoin vert des deux côtés ne prouve rien, et le borner sur ces
durées reviendrait à mesurer le banc. Les deux sont retirés, la brique du banc
qui ne servait qu'à eux aussi, et la dette est déclarée dans `TASKS.md`.

**Au passage, une explication à moi qui était fausse.** J'avais écrit deux fois
que ces rouges venaient de « la charge du banc ». Mesuré : la charge d'une
minute est une moyenne QUI DÉCROÎT — quand une suite se termine, la machine est
libre mais le chiffre met cent secondes à le reconnaître. Même navigateur,
pendant que la charge montait de 3,40 à 5,16 : **58,5 · 43,0 · 43,0 · 45,9 ·
43,2 · 47,4 · 38,3 · 55,9** images par seconde, aucune relation, 14,7 Go libres
d'un bout à l'autre. Une charge RÉELLE se voit tout de suite : deux pages de
jeu ouvertes en même temps font tomber la cadence de **42,9 à 20,8 puis 14,8**.
Le portail attendait jusqu'à trois minutes par suite que ce nombre retombe ;
la pause tombe à trente secondes, ce qui rend **neuf minutes** par portail sans
rien perdre. Une explication commode qu'on ne mesure pas est une dette, pas un
diagnostic.

---

## v219 — Couper sa caméra coupe vraiment l'image et le son

**Pourquoi.** Quand Alice éteignait sa caméra, **Marlon continuait de la voir
et de l'entendre.** Sa vignette restait à l'écran — la piste vidéo tombait bien
à 0 × 0, mais elle restait dans la liste — et sa piste audio n'était ni arrêtée
ni muette. Pour deux enfants qui s'appellent, ce n'est pas un détail
d'affichage : couper sa caméra, c'est le geste par lequel on décide qu'on n'est
plus vu ni entendu. Il devait donc être tenu.

Le défaut était déclaré depuis la v218, mesuré des deux côtés dans un arbre
séparé — il était déjà en production, pas causé par la livraison de ce jour-là.

**Ce que ça change.** La cause était visible dans le verdict lui-même : le
même témoin, pour le chemin du **nuage**, était VERT. Le nuage ANNONCE la fin
par le tuyau des blocs ; le chemin **direct**, lui, s'en remettait au `close`
de la connexion média de PeerJS — un événement qui ne traverse pas jusqu'à
l'autre bout quand on ferme de son côté. On attendait donc un signal qui
n'arrivait jamais.

L'extinction s'annonce désormais à **tous** les pairs, par le même tuyau que
les blocs, qui lui arrive toujours. À la réception, on retire ce qu'on montrait
de ce pair quel que soit son chemin — la photo du nuage comme la vignette du
direct — et l'on ferme l'appel entrant. Le nom du message reste `photo-fin` :
une tablette restée sur l'ancienne version le comprend et retire au moins la
photo, là où un nom neuf ne lui dirait rien.

**Ce qui le prouve.** Les deux témoins de `visio.js` qui portaient la dette
rendent désormais `[]` là où ils rendaient une piste vidéo et une piste audio
survivantes ; la suite est entièrement verte. Aucun témoin n'a été ajouté et
c'est voulu : ceux qui existaient décrivaient exactement le défaut, ils
n'attendaient qu'un remède. Le cas du nuage reste vert, comme avant — c'est lui
qui avait montré la voie.

---

## v218 — Les rues sont peuplées là où l'enfant regarde

**Pourquoi.** La v217 avait empêché la ville de se vider : les dix-huit
habitants restent bien autour de l'enfant quand il marche. Il ne les VOYAIT
toujours pas. Le chiffre qui l'explique tient en une ligne : **le champ de
vision fait quarante-six degrés**, un huitième du tour d'horizon. Dix-huit
passants répartis en couronne en donnent 18 × 46/360 = **2,3** dans le cadre —
et c'est exactement ce qui se mesure.

Deux fausses pistes écartées par la mesure, et il faut le dire parce que la
première était la mienne. **Resserrer la couronne ne change rien** : elle est
uniforme en angle, son rayon ne décide pas combien de gens tombent dans un
secteur de 46° — mesuré 2,3 à 14-55 blocs, 2,33 à 14-34. Et **en acheter plus
se paie** : un passant coûte onze maillages, les dix-huit en valent déjà deux
cents.

**Ce que ça change.** Deux remèdes, tous deux gratuits en appels de dessin.
Deux passants sur trois sont posés **devant** l'enfant, dans un cône de ±60° —
le tiers restant garde la rue derrière habitée. Et l'on replace aussi celui qui
est passé **derrière la ligne des épaules**, pas seulement le lointain : sans
cela, un pas de vingt blocs laisse ceux qu'on vient de dépasser juste sous le
seuil de distance, et la rue se vide à mesure qu'on avance. La couronne se
resserre tout de même à trente-quatre blocs — non pour en voir plus, mais
parce qu'à cette distance un personnage est encore lisible et rarement caché
par un immeuble.

Rien de tout cela ne se voit quand on tourne sur place, et c'est voulu : on ne
déplace jamais quelqu'un que l'enfant a dans son champ.

**Ce qui le prouve.** Un témoin neuf dans `monte.js` **marche**, cap dans le
sens de la marche, et compte les passants **dans le cadre** — un décompte « à
moins de soixante-deux blocs » ne peut pas voir ce défaut, les dix-huit y sont
des deux côtés. Rejoué dans un arbre séparé sur `origin/main` : moyenne **1,5**
par arrêt, un arrêt vide. Sur la branche : **5,25**, aucun arrêt vide. Le
verdict porte sur les arrêts VIDES autant que sur la moyenne — c'est de marcher
dans une rue déserte qu'un enfant se plaint, et un creux ne se rattrape pas par
une moyenne. Le brassage réglé en v217 n'est pas rouvert (zéro déplacement
inutile par tour), et la traversée de la v217 tient (pire 11).

---

## v217 — La ville reste habitée quand on la traverse

**Pourquoi.** Max, après la v216 : « clairement pas de piétons, pas de vie
dans les villes. » Les passants existaient pourtant, et un témoin le
vérifiait — mais ce témoin se posait quelque part et **attendait**. Or le
défaut ne se montre qu'en marchant. Mesuré en traversant Paris d'ouest en
est, en comptant les piétons **réellement dessinés** : 10, 8, 7, 4, **zéro**,
2, 1. Les dix étaient toujours là ; ils étaient restés derrière.

La cause tient en deux nombres qui ne se parlaient pas. Un passant n'était
ramené devant l'enfant qu'au-delà de **cent cinquante blocs**, alors qu'un
personnage cesse d'être dessiné à **soixante-deux**. Entre les deux, il est
invisible ET pas rapatrié : la ville se vide dès qu'on marche cent blocs, et
se repeuple une minute plus tard.

**Ce que ça change.** On rapatrie désormais celui qu'on ne VOIT plus, pas
celui qui est loin : soixante-quatre blocs, juste au-delà de la portée de
rendu. C'est ce qui rend le déplacement honnête — on ne déplace jamais
quelqu'un que l'enfant a sous les yeux, personne ne saute d'un bout de la rue
à l'autre. Et chaque ville passe de dix à **dix-huit** habitants, dont un sur
cinq est un chien.

**Le piège trouvé en chemin, et qui n'était pas dans le plan.** Resserrer le
seuil a créé un défaut que le seuil large cachait : `dansLaVille` ramène tout
candidat DANS la ville, donc quand l'enfant est DEHORS, le passant reposé reste
hors de portée et se fait reprendre au tour suivant. Mesuré au point
d'apparition : **dix-sept à dix-huit passants sur dix-huit replacés toutes les
deux secondes, indéfiniment, et aucun jamais en vue.** La page en devenait assez
occupée pour ne plus finir son rechargement — et c'est la suite de MISE À JOUR
qui l'a dit, rouge sur la branche et verte sur `origin/main`. Un déplacement qui
ne ramène personne dans le champ ne se fait plus : 17-18 par tour → **0**.

**Ce qui le prouve.** Un témoin neuf dans `fumee.js` traverse Paris par bonds
de vingt-cinq blocs et mesure le **pire** de la traversée — c'est le creux qui
fait dire à un enfant que la ville est morte, pas la moyenne. Sur
`origin/main` il rend `[0, 10, 7, 4, 2, 1, 5]`, pire **zéro** : rouge. Sur la
branche, plus jamais de rue vide. Et le prix est mesuré : 88 à 265 appels de
dessin sur la traversée, là où le budget d'une ville est de l'ordre de 450 —
un passant ne se dessine que sous soixante-deux blocs, les dix-huit ne sont
donc jamais tous à l'écran. L'ancien témoin, lui, reste vert sur l'ancien
code : c'est la preuve qu'il ne pouvait pas voir ce défaut.

---

## v216 — Toutes les avenues de Paris ont retrouvé leurs voitures

**Pourquoi.** La v211 avait réglé ce que Max avait vu — « les voitures passent
à travers les unes des autres » — en choisissant les circuits sous contrainte
de partage : deux convois ne peuvent avoir plus de vingt blocs de chaussée en
commun, la taille d'un carrefour. Le prix était déclaré dans `TASKS.md` et il
était réel : **trois avenues de Paris n'avaient plus une seule voiture** —
l'avenue de l'Opéra, le Faubourg Saint-Antoine et le boulevard Haussmann. Un
enfant qui descendait avenue de l'Opéra trouvait une rue morte au milieu d'une
ville qui roule.

**Ce que ça change.** Paris a **douze rues de plus**, toutes réelles, prises
sur le plan : Beaumarchais, Turbigo, les quais de la rive droite, Diderot,
Bourdon, Ledru-Rollin, la rue du Louvre, le Quatre-Septembre, la rue de la
Paix, Castiglione, Tronchet et Malesherbes. Elles ne sont pas là pour décorer :
ce sont elles qui donnent à ces trois avenues une boucle à ELLES, au lieu de
repasser sur celle du voisin. Les **quarante** avenues de la ville sont
désormais parcourues, par huit circuits, et le seuil de la v211 n'a pas bougé
d'un bloc.

Deux choses se voient au sol. Le Faubourg Saint-Antoine se fait comme dans la
vraie ville — on revient à la Bastille par les quais et le boulevard Bourdon,
donc par le SUD, parce que Bastille, Nation et le retour sont presque alignés
et que toute autre boucle y faisait un demi-tour. Et l'avenue de l'Opéra a ses
deux tours : le triangle Rivoli / Bourse / Opéra par la rue du Louvre, et la
descente sur les Tuileries par la place Vendôme.

**Ce qui le prouve.** Les huit chaînes ont été mesurées une à une contre
`solParis` — 95 à 100 % de tenue sur la chaussée, virage le plus serré 140° —
et aucune n'est jetée par `fabriqueCircuits`. Le témoin de couverture de
`carteMonde.js` exige désormais **zéro avenue sans boucle** sur un registre de
quarante : sur l'ancien code il en compte trois pour un registre de
vingt-huit, donc rouge par les deux bouts. Le témoin de partage de la v211
tient sans être touché : la pire paire de Paris tombe de 17 à **13 blocs**.
Zéro pas dans la Seine, zéro pas au milieu d'une place. Et le relief n'a pas
bougé d'un octet — une rue est du SOL, pas du terrain : les deux empreintes de
`plafond.js` sont intactes sans qu'on ait rien à déclarer.

---

## v215 — Les visages ne font plus peur

**Pourquoi.** Max, capture à l'appui : « personnages are scary ». Le visage
d'un villageois était construit avec soin — crâne, nez, oreilles, menton — mais
son regard était faux. L'iris faisait **55 % de la largeur du blanc de l'œil**,
il était posé **plus en avant que lui**, et il était presque noir : de face, on
ne voyait que deux billes sombres globuleuses, sans blanc autour. Sous des
sourcils épais et bas, avec une moustache qui mangeait la bouche, cela donnait
un masque figé et renfrogné. Pour un enfant de sept ans, ce n'est plus un
villageois.

**Ce que ça change.** Un œil se lit à son BLANC : l'iris n'en occupe plus
qu'une petite part (38 % au lieu de 55), il est plus clair, et il reste **en
retrait dans l'orbite** au lieu de saillir devant. Les sourcils sont plus fins
et plus hauts — bas et épais, ils froncent. La bouche **sourit** : trois
petites boîtes suffisent à relever les coins, là où une barre droite faisait la
moue. Et la moustache se pose au-dessus de la lèvre au lieu de la remplacer.

**Ce qui le prouve.** L'esthétique se juge en capture, et deux gros plans
comparables sont joints. Mais la GÉOMÉTRIE se mesure, et deux témoins neufs
dans `monte.js` le font : les couleurs vivent dans les sommets, on relève la
boîte du blanc et celle de l'iris sur un seul œil, et l'on demande deux choses
qu'un visage doux respecte toujours. Sur `origin/main` les deux sont rouges —
iris à 55 % de l'œil, et posé 8 millièmes devant le blanc. Sur la branche,
38 % et en retrait.

Deux pièges de mesure valent d'être notés : filtrer sur la seule couleur
attrapait la **ceinture de cuir**, dont le brun est à un cheveu de celui de
l'iris (elle rendait un « iris » de 178 % de large) ; et mesurer les **deux
yeux ensemble** écrase le rapport, parce que la largeur inclut l'écart entre
eux — 89 % contre 82 %, quand l'œil seul dit 55 contre 38.

---

## v214 — Chaque bout de ligne a sa gare

**Pourquoi.** Troisième moitié du signalement de Max : « no end stations ». Le
train marquait bien l'arrêt aux deux bouts de chaque ligne — c'est écrit dans
le code depuis la v179 — mais rien n'y était bâti. On attendait le train debout
dans l'herbe, à six blocs des portes de la ville.

**Ce que ça change.** Les dix-huit gares existent : un **quai** de granit, un
bloc au-dessus des rails comme un vrai quai et de part et d'autre de la voie ;
un **auvent** quatre blocs plus haut, porté par des piliers tous les trois
blocs ; un **bâtiment** de brique derrière, avec sa porte et ses fenêtres. La
gare est plate même quand le terrain ne l'est pas : elle comble en dessous et
dégage au-dessus, exactement comme la voie.

Elle est à l'échelle du JOUEUR, pas du sol — c'est là qu'on marche, qu'on
attend et qu'on monte à bord.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js`, qui ne demande pas
au jeu où chercher : il calcule lui-même les emplacements depuis la géométrie
des segments, puis lit les blocs. C'est ce qui lui permet de mesurer la même
chose sur l'ancien code, où il trouve **zéro gare complète sur dix-huit**, quai
et auvent à zéro. Sur la branche, les dix-huit sont complètes : 39 à 47
colonnes de quai, 33 à 39 d'auvent, 29 à 34 de bâtiment. Un second témoin garde
la régression que le premier rend possible — que l'auvent ou les piliers
bouchent le quai.

---

## v213 — La voie ferrée a de vrais rails, et ne fait plus d'escalier

**Pourquoi.** Max, capture à l'appui : « train no rails, holes, no end
stations ». Le ballast était une bande de gravier posée à la hauteur du
TERRAIN, colonne par colonne, et le train roulait dessus. Mesuré ligne par
ligne, la dénivelée entre deux colonnes voisines montait à **vingt-sept
blocs** sur Cologne-Francfort, treize sur le Shinkansen et le TGV : le train
sautait les marches et s'enfonçait dans la roche. Ce sont les « trous ». Et
une bande de gravier n'est pas une voie ferrée.

**Ce que ça change.**

- **La voie se nivelle.** Elle remblaie et elle creuse au lieu de suivre le
  terrain en escalier : plus une seule marche de plus d'un bloc sur les neuf
  lignes. Le relief, lui, n'a pas bougé d'un bloc — c'est un ouvrage posé
  par-dessus, pas un terrassement.
- **De vrais rails.** Deux files sombres continues, des traverses de bois au
  milieu, le ballast en bordure. C'est à cela qu'on reconnaît une voie ferrée,
  et cela tient dans les trois blocs de large qu'elle fait.
- **Plus rien ne barre la route.** Une ville engendrée traversée par la ligne
  rebâtissait par-dessus les rails — vingt-sept colonnes d'immeuble en travers
  du Shinkansen. La voie a désormais le dernier mot sur sa colonne. Et les
  arbres s'écartent d'un bloc de plus, parce qu'une couronne plantée à trois
  blocs de l'axe débordait encore sur le train.

**Ce qui le prouve.** Deux témoins neufs dans `carteMonde.js`, qui mesurent
bloc par bloc les 4 744 colonnes des neuf lignes. Ils mesurent le MÊME défaut
des deux côtés — sur l'ancien code ils retombent sur l'ancienne règle plutôt
que d'échouer faute d'un export. Sur `origin/main` : marche de 27 blocs, **zéro
rail sur 4 744 colonnes**, 36 pas dans un bloc solide. Sur la branche : marche
d'un bloc, des rails sur 96 à 99 % des colonnes, et **aucun obstacle**.

Les gares manquent toujours, et c'est déclaré dans `TASKS.md` : le train
s'arrête aux deux bouts, mais rien n'y est bâti.

---

## v212 — Au volant, on ne traverse plus les murs

**Pourquoi.** Max, capture à l'appui : « cars crashing into walls » — une
voiture rouge encastrée dans une façade haussmannienne, dans une rue de Paris.
Conduire, dans ce jeu, c'est brancher le véhicule sur les commandes du joueur,
donc sur SA physique — boîte de collision comprise. Celle-ci fait **soixante
centimètres de large**, quand une voiture en fait **2,26**. Tant que le point
central restait dans la rue, toute la carrosserie passait au travers de ce qui
la bordait. La dette était écrite noir sur blanc depuis la v155 : « le véhicule
a besoin de sa propre boîte de collision ».

**Ce que ça change.** Une voiture conduite a désormais sa carrure. Elle
s'arrête contre les murs au lieu d'entrer dedans, elle ne passe plus dans une
ruelle où elle ne tient pas, et l'on retrouve sa taille de piéton en
descendant. La largeur vit dans la fiche de l'espèce (`gabarit`), à côté de
`montable`, `nourrissable` et `vole` — jamais dans une liste écrite ailleurs.

La boîte prend la LARGEUR du véhicule, pas sa longueur : une boîte alignée sur
les axes ne tourne pas, et 4,4 blocs ne passeraient dans aucune rue même en
roulant droit. Une voiture mise en travers mord donc encore un peu, et c'est un
prix très inférieur à celui d'une voiture fantôme.

**Ce qui le prouve.** Un témoin neuf dans `monte.js`, qui éprouve le trajet de
l'enfant et non la variable : on dresse un mur, on fonce dedans à pied puis au
volant, et l'on regarde où l'on s'arrête. Sur `origin/main` les deux distances
sont identiques — 0,3 bloc, la demi-largeur d'un piéton. Sur la branche, 0,3 à
pied et **1,1 au volant**. Un second témoin garde la régression que le premier
rend possible : une fois descendu, on repasse partout où un piéton passe.

---

## v211 — Les circuits se croisent, ils ne se suivent plus

**Pourquoi.** Max, après la v210 : « Et passent à travers les unes des
autres. » Elles se traversaient, et ce n'était ni le tracé ni la cote : le
choix des circuits par couverture gloutonne réutilisait les grands axes dans
presque tous les circuits. Mesuré : à Paris, **1 524 blocs de tracé sur 2 317
portaient au moins deux convois**, et la rue de Rivoli en portait trois,
superposés. Londres 1 316 sur 2 038, Lille 605 sur 870, San Francisco 568 sur
1 026. Deux voitures au même endroit au même instant, c'est deux voitures qui
se traversent.

Décaler les convois côte à côte ne pouvait rien : une voiture fait **2,26
blocs de large** pour une chaussée qui en fait 2,86. Il n'y a pas la place
pour deux files, et la mesure l'a écarté avant qu'on ne l'écrive.

**Ce que ça change.**

- **Les circuits sont choisis sous contrainte de partage** : deux d'entre eux
  ne peuvent pas avoir plus d'une vingtaine de blocs de chaussée en commun, la
  taille d'un carrefour. Ils se croisent, ils ne se suivent pas.
- **Les six villes ont été rechoisies** : Paris 5 circuits, Londres 10, Nice 3,
  Lille 3, San Francisco 2, Washington 19. Les combinaisons ont été éprouvées
  contre le sol de chaque ville, comme d'habitude.
- **Le prix, dit honnêtement** : quelques avenues perdent leurs voitures faute
  d'une boucle à elles. Les rues qu'un enfant nomme sont gardées en priorité —
  les Champs-Élysées roulent, Pennsylvania Avenue et Market Street aussi. Ce
  qui manque est nommé dans `TASKS.md`, avec la même piste qu'en v209 : des
  voies de raccord, à tracer et à mesurer.

**Ce qui le prouve.** Un témoin neuf dans `carteMonde.js`, qui mesure bloc par
bloc la chaussée que deux convois se partagent. Rouge sur `origin/main` : 253
blocs pour la pire paire à Paris, 237 à San Francisco, 142 à Lille. Sur la
branche, **aucune paire ne dépasse 22 blocs**, et San Francisco comme Lille
tombent à zéro. Deux témoins existants ont été ajustés, et cela se dit : le
compte minimal de circuits par ville passe de trois à deux, et la couverture
de Paris n'est plus exigée totale.

---

## v210 — Les voitures suivent le sol : plus une seule dans une colline

**Pourquoi.** Max, après avoir visité la v209 : « Les voitures rentrent dans
les murs. » Elles y rentraient, et ce n'était pas le tracé des rues : chaque
circuit recevait une cote UNIQUE, celle du sol au centre de la ville. Le
commentaire l'assumait — « la ville est plate, et un convoi qui suivrait le
relief ferait des montagnes russes ». San Francisco a treize collines et Nice
le mont Boron. Mesuré : le sol s'écarte de cette cote de trente-deux blocs à
San Francisco, seize à Paris, quatorze à Nice, et les convois traversaient la
roche sur 27 % de leur trajet à San Francisco, 12 % à Nice. Là où le sol
descendait, les voitures volaient.

**Ce que ça change.**

- **Chaque point du trajet a sa propre cote**, prise sur le sol. Les voitures
  montent Nob Hill et redescendent sur Market Street, longent la colline du
  Château à Nice, au lieu de les traverser.
- **Le tracé est densifié à deux blocs.** Entre deux carrefours distants de
  trente blocs, la ligne droite passait au travers de tout ce que le terrain
  fait entre les deux : à six blocs de pas, 17 % du trajet de San Francisco
  reste dans la roche ; à quatre, 11,5 % ; à deux, 3,3 %.
- **En pente, la cote est celle du plus haut voisin**, sinon la voiture roule
  d'un bloc DANS la chaussée qu'elle descend — trente-sept pas à San
  Francisco, dix-huit à Nice.
- **Sur un pont, la cote est celle du tablier**, pas du lit du fleuve. Sans
  cela, suivre le sol faisait passer soixante-treize pas de convoi sous la
  Tamise, dans les trois ponts livrés en v208.

**Ce qui le prouve.** Deux témoins neufs dans `carteMonde.js`, rouges sur
`origin/main` avec des chiffres, pas avec une absence : 452 pas dans la roche
à San Francisco, 167 à Nice, 88 à Paris, et un écart de cote de 32 blocs. Sur
la branche, **zéro pas dans le relief dans les six villes**, et l'écart au sol
ne dépasse jamais un bloc. Le relief lui-même n'a pas bougé : les deux
empreintes de `plafond.js` sont identiques. Ce qui reste sur les trajets est du
BÂTI — des monuments, des façades, les fontaines de Trafalgar Square — et c'est
une dette déclarée dans `TASKS.md`, mesurée ville par ville.

---

## v209 — Les vingt-huit avenues de Paris ont toutes leur boucle

**Pourquoi.** En supprimant les demi-tours (v207), on a laissé la moitié de
Paris sans voitures. Les avenues se chaînent depuis lors entre leurs
carrefours, et tout virage au-delà de 150° est rejeté : il ne restait que cinq
circuits, sur DIX des dix-huit avenues. Le boulevard de Clichy et l'avenue de
la Grande Armée ne rencontraient aucune autre voie ; les Gobelins, la
Motte-Picquet et Belleville n'en touchaient qu'une, donc ne se parcouraient
qu'en rebroussant chemin ; le boulevard Saint-Michel traversait le jardin du
Luxembourg et tombait à 88 % ; et le triangle de l'est — Grands Boulevards,
Faubourg Saint-Antoine, Voltaire — était à cent pour cent sur la rue mais
faisait un angle de 174° à République. Montmartre, l'Étoile, Belleville et
tout le sud de la rive gauche ne voyaient pas passer une voiture.

**Ce que ça change.**

- **Les places rondes se contournent.** Deux avenues qui se rejoignent sur une
  place s'y rejoignaient en son CENTRE : ce n'était pas le tracé des rues qui
  était faux, c'était le raccourci par le milieu de la place. Une voiture fait
  le tour du rond-point, et c'est désormais ce qu'elle fait — République passe
  de 174° à 90°, Nation de 161° à 80°.
- **Dix rues de plus, prises sur le vrai plan de Paris** : les Champs-Élysées
  et le boulevard Haussmann autour de l'Étoile, l'avenue de Wagram et les
  Batignolles pour rejoindre Clichy, l'avenue des Ternes pour la Grande Armée,
  Rochechouart pour redescendre sur la Gare du Nord, Ménilmontant pour
  Belleville, Port-Royal et Arago pour les Gobelins, l'avenue de Suffren pour
  la Motte-Picquet. Et la Porte Maillot est devenue le rond-point qu'elle est
  dans la vraie ville.
- **Huit circuits au lieu de cinq, et les vingt-huit avenues sont couvertes.**
  On roule maintenant sur les Champs-Élysées, autour de l'Étoile, à Montmartre,
  à Belleville, sur le boulevard Saint-Michel et jusqu'à la place d'Italie.

**Ce qui le prouve.** Le portail complet, dix suites. Deux témoins neufs dans
`carteMonde.js`, tous deux rouges sur `origin/main` — et le second l'est pour
le fond, pas faute d'un export : les cinq circuits d'avant y mettaient 17, 9,
12, 1 et 1 pas au milieu d'une place. Les huit chaînes déclarées passent
toutes la mesure (une chaîne sous le seuil est jetée, le compte le dirait), la
plus faible tient la rue à 97 %, aucune ne met un pas dans la Seine, aucune ne
coupe par le milieu d'une place. Le relief, lui, n'a pas bougé : les deux
empreintes de `plafond.js` sont identiques — une rue est du SOL.

---

## v208 — Trois ponts routiers sur la Tamise : des voitures changent de rive à Londres

**Pourquoi.** La passe de rues de Londres (v206) a laissé une dette écrite
noir sur blanc : « les ponts routiers sur la Tamise n'existent pas encore, ce
qui interdit toute boucle rive à rive ». Quinze circuits, cinquante-neuf voies
couvertes — et pas une voiture qui traverse le fleuve. La City et Southwark
étaient deux villes qui se tournaient le dos, à trois blocs d'eau l'une de
l'autre. Dans la vraie ville, on passe la Tamise tous les cinq cents mètres ;
c'est ce que voit quiconque regarde une carte de Londres avant de la bâtir.

**Ce que ça change.**

- **Trois ponts routiers aux vraies adresses** — Waterloo Bridge, Blackfriars
  Bridge et London Bridge — deux blocs d'ouverture chacun, bitume au milieu,
  granit aux bords comme les quais. Chaque bout est posé SUR la chaussée d'une
  avenue de la rive (leçon de Nice), et le tablier se pose AU-DESSUS de l'eau,
  à la cote des quais : le relief ne bouge pas d'un bloc, l'eau reste dessous,
  et l'on passe en voiture ou à pied d'une rive à l'autre.
- **Trois circuits rive à rive**, mesurés à 100 % et sans demi-tour : le
  Strand et l'Embankment vers la rive sud par Blackfriars et Waterloo
  (128 blocs) ; York Road et Westminster Bridge Road par Waterloo et
  Blackfriars (111 blocs) ; la City, Southwark et Borough par Blackfriars et
  London Bridge (85 blocs). Dix-huit circuits couvrent soixante-deux voies sur
  soixante-trois.
- **Ce qui manque encore, dit honnêtement** : Westminster Bridge traverserait
  l'emprise de Big Ben et le pied du London Eye, Hungerford couperait la grande
  roue, Southwark Bridge tomberait sur le Globe. Ce sont des dettes déclarées
  dans `TASKS.md`, pas des oublis.

**Ce qui le prouve.**

- Deux témoins neufs dans `carteMonde.js`, par le bâtisseur pur de Londres et
  le monde chargé, jamais par un (u, v) en dur — la cote du tablier se lit
  dans le registre des villes, les colonnes se prennent bloc par bloc sur les
  points des ponts : *trois ponts routiers franchissent la Tamise, et sous
  chaque tablier il y a de l'eau* (onze colonnes au-dessus du lit par pont,
  onze roulantes, onze avec de l'eau dessous) ; *et des voitures changent de
  rive par chacun d'eux* (trois circuits rive à rive, Waterloo emprunté par
  deux, Blackfriars par trois, London Bridge par un). Les deux sont **ROUGES
  sur `origin/main`** (rejoués seuls dans `/root/main-ref` : `{"absent":
  true}`), verts sur la branche.
- `hauteurLondres` n'a pas changé d'une ligne : l'empreinte du relief de
  `plafond.js` est identique, et la double empreinte n'est pas requise — même
  raison qu'en v206. Un pont est du SOL posé au-dessus de l'eau, pas du relief.
- Enchaînements mesurés sur une copie de `src/` avec le chaînage de
  carrefour en carrefour, toutes combinaisons de deux à six voies, puis
  couverture gloutonne ; le chiffre en commentaire au-dessus de chaque circuit
  est celui de la mesure.

---

## v207 — Plus aucune voiture ne fait demi-tour : les circuits roulent de carrefour en carrefour

**Pourquoi.** Le témoin de Londres (v206) rejetait tout virage au-delà de
150°, et la dette disait : « les autres villes en ont sûrement ». Mesuré le
jour même sur les cinq autres villes à circuits : **vingt-quatre des
quarante-et-un circuits rebroussaient chemin** — Paris cinq sur cinq, San
Francisco quatre sur quatre, Lille cinq sur six, Washington sept sur onze,
Nice quatre sur cinq. « Market et Divisadero », à deux, n'était qu'un
aller-retour de 468 blocs ; « l'axe Esquermoise–Royale, aller et retour » de
Lille l'était littéralement. Personne ne l'avait vu parce qu'un demi-tour est
INVISIBLE à la mesure de rue : une voiture qui repart d'où elle vient roule à
100 % sur la chaussée. La cause n'était dans aucune ville — elle était dans le
chaînage partagé de `voies.js`, qui accrochait chaque avenue par son bout le
plus proche et la PARCOURAIT EN ENTIER. Une avenue dont le carrefour de sortie
est au milieu se fait donc en aller-retour, à chaque fois.

**Ce que ça change.**

- **Un circuit roule de carrefour en carrefour.** Le chaînage calcule où
  chaque avenue croise la suivante et ne parcourt que le tronçon entre son
  carrefour d'entrée et son carrefour de sortie. Une chaîne qui entre et sort
  d'une avenue par le même carrefour est une impasse : elle est refusée,
  jamais rafistolée.
- **Vingt-cinq circuits remesurés, aucun au-dessus de 146°** : Paris cinq
  (98–100 %, jusqu'à 241 blocs par Rivoli, les Grands Boulevards, Sébastopol,
  Magenta, La Fayette et l'Opéra ; deux boucles rive gauche par
  Saint-Germain, Rennes, Montparnasse et Raspail), Nice cinq (tous à 100 %,
  le tour par la Californie et René-Cassin, le front de mer par Rauba-Capeu et
  Carabacel, Cimiez), Lille six (99–100 %, du Vieux-Lille à Vauban, Euralille
  par Faidherbe et Willy-Brandt), San Francisco quatre (100 %, le grand tour
  Market–Embarcadero–Columbus–Lombard–Van Ness–Geary–Divisadero à 427 blocs),
  Washington onze (99–100 %, listes inchangées : le nouveau chaînage suffit).
  Londres, déjà mesuré au virage, ne bouge pas : quinze circuits.
- **Ce que la règle coûte, dit honnêtement.** Refuser les allers-retours
  découvre les voies qui n'avaient AUCUNE boucle : à Paris huit avenues sur
  dix-huit sortent des circuits (Clichy et la Grande-Armée ne croisent rien ;
  les Gobelins, la Motte-Picquet et Belleville sont des impasses ;
  Saint-Michel bute sur le Luxembourg à 88 % ; le triangle de l'est fait 174°
  à République) ; à Lille la rue Royale ; à San Francisco Valencia. Toutes
  sont des dettes déclarées, avec les raccords qu'il leur faudrait. Une
  avenue parcourue en aller-retour n'était pas « couverte » : elle donnait
  l'illusion de l'être.
- **Le sol ne bouge pas.** Les listes de points des avenues (`VOIES`), qui
  dessinent la chaussée, ne changent d'un bloc dans aucune ville : seul
  l'ordre dans lequel les voitures les enchaînent change.

**Ce qui le prouve.**

- Deux témoins neufs dans `carteMonde.js`, par les bâtisseurs purs
  (`circuitsParis`, `circuitsNice`, `circuitsLille`, `circuitsSF`,
  `circuitsWashington`, `circuitsLondres`) et jamais par un (u, v) en dur :
  **dans les six villes à circuits, aucune voiture ne fait demi-tour** (aucun
  virage au-delà de 150°, au moins trois circuits par ville) ; et chaque
  circuit, mesuré entre ses carrefours, tient toujours la rue à 90 %. Le
  premier est ROUGE sur `origin/main` — c'est lui qui compte, et le compte
  qu'il rend là-bas est celui de l'audit.
- Les enchaînements ont été mesurés sur une copie de `src/` avec le nouveau
  chaînage, toutes combinaisons de deux à sept avenues par ville, puis
  choisis par couverture gloutonne ; le chiffre en commentaire au-dessus de
  chaque circuit est celui de cette mesure.
- `voies.js` gagne `carteMonde.js` comme gardien dans `tests/tout.js` : un
  demi-tour né du chaînage se voit là et nulle part ailleurs.

**Portail** (voie longue) : un seul passage, **490 ✅ / 0 ❌** — fumée et
les treize suites, dont `carteMonde.js` (48 témoins, les deux neufs compris),
`carte.js`, `monte.js`, `plafond.js` avec ses deux empreintes IDENTIQUES à la
v206 (relief 218 089 colonnes · c20adb7308ae ; hors villes 184 656 ·
c79c2f3b0135 ; 4 040 colonnes sous les enfants, zéro déplacée). Le rouge
intermittent de `reseau.js` (« quand le relais répond, on accuse le VPN ») est
passé vert cette fois ; il reste déclaré dans `TASKS.md`.

## v206 — Londres roule : soixante avenues qui se croisent et quinze circuits mesurés

**Pourquoi.** Depuis la v201 Londres n'avait qu'UN circuit de voitures, le
triangle de Mayfair à 96 % — et toute la ville autour, de la City à la rive
sud, n'avait jamais vu une voiture. L'entrée de `TASKS.md` avait d'abord
accusé l'échelle ; c'était faux, Londres est à vingt-quatre blocs par
kilomètre comme Paris. Le vrai défaut : neuf avenues nommées, tracées bout à
bout SANS SE CROISER, et une chaîne d'avenues ne se referme que sur des
carrefours. La Tamise et les parcs coupaient le reste — chaque combinaison
des six autres voies plafonnait entre 57 et 85 %.

**Ce que ça change.**

- **Soixante avenues nommées, à leurs vraies coordonnées** (contre neuf) :
  Whitehall, le Strand et Fleet Street, Cheapside, Cannon Street, King
  William Street, Moorgate, London Wall, Holborn, Kingsway, Oxford Street en
  trois tronçons, Regent Street, Portland Place, Baker Street, Marylebone
  Road, Edgware Road, Park Lane, Knightsbridge, Bayswater Road, West
  Carriage Drive, Constitution Hill, Birdcage Walk, Buckingham Gate,
  Victoria Street, l'Embankment, Blackfriars Road, Waterloo Road, Stamford
  Street, Southwark Street, Borough High Street… — et chacune est posée pour
  que ses bouts tombent SUR la chaussée d'une autre.
- **Quinze circuits mesurés, de 92 à 100 %**, couvrent cinquante-neuf des
  soixante avenues : Westminster et St James's, la City par le nord (Old
  Bailey, Cheapside, Moorgate) et par le sud (Cannon Street, Queen Victoria
  Street), la rive sud (Borough, Southwark, Waterloo), le grand tour du Mall
  par Park Lane et Oxford Street, Fitzrovia et Soho, Victoria et Belgravia,
  Bloomsbury et Holborn, Marylebone, le tour de Hyde Park, Birdcage Walk,
  Fleet Street et le Strand, Stamford Street, Baker Street et Portland Place,
  l'Embankment. Le seul cul-de-sac, Euston Road côté King's Cross, est une
  dette déclarée.
- **La City tient à la ville par TROIS carrefours et plus par un seul.** Un
  îlot accroché par un unique carrefour est un demi-tour garanti : c'est ce
  qu'était la City avant Old Bailey, Cannon Street et Queen Victoria Street.
- **Les parcs ont leurs vrais contours** : Hyde Park en rectangle arrondi
  jusqu'à Marble Arch, Green Park en triangle entre Piccadilly et
  Constitution Hill, St James's Park et Regent's Park à leur place. Les
  avenues qui les longent y passent — Park Lane, Bayswater, Knightsbridge,
  West Carriage Drive — et aucune n'y met un pas.
- **Le sol ne bouge pas.** Tout se joue dans la NATURE du sol (chaussée,
  trottoir, pelouse, arbres), jamais dans le relief : `hauteurLondres` ne
  lit que la Tamise, les lacs des parcs et Primrose Hill, et aucun des trois
  n'a changé. L'empreinte du relief de `plafond.js` est identique.

**Ce qui le prouve.**

- Quatre témoins neufs de `carteMonde.js`, tous par le bâtisseur pur
  `solLondres` et par le registre `VOIES_LONDRES`, jamais par un (u, v) en
  dur : au moins quatorze circuits à 90 % ; presque chaque avenue est sur une
  boucle (une seule sans, Euston Road côté King's Cross, nommée) ; **aucun
  circuit ne met un pas dans la Tamise ni dans un parc**, échantillonné bloc
  par bloc ; et **aucun virage de plus de 150°**. Ce dernier existe parce
  qu'une chaîne peut mesurer 100 % sur la rue ET faire demi-tour au milieu
  d'un carrefour — `chainerVoies` accroche chaque avenue par le bout le plus
  proche, et un cycle du graphe des carrefours qui repasse par le même
  carrefour se replie sur lui-même. Le banc a éprouvé quarante-trois chaînes :
  quarante-deux au seuil, dont DIX rejetées pour demi-tour, invisibles à la
  mesure de rue. Tous quatre `{ absent: true }` sur `origin/main`, où
  `VOIES_LONDRES` n'existe pas.
- La fumée compte toujours six villes à circuit : Londres y était déjà, avec
  son unique triangle.
- Jugé sur captures (`rr=9`) : aérien la City et Westminster ; rue Cheapside,
  Whitehall, Oxford Street, Borough High Street vers London Bridge et vers le
  sud — voitures sur la chaussée et bouton « Conduire cette voiture » à
  chaque fois. Une capture a révélé un défaut qui n'est PAS de cette
  livraison : le Shard est un treillis de verre transparent, dette déclarée.
- **Le premier portail a rendu UN rouge, démonté et non rejoué** : « 0/5
  bus ». Le témoin de `carte.js` portait les cinq arrêts des bus impériaux
  EN DUR, relevés sur les rues d'avant ; la passe de rues a déplacé les bus
  avec les rues, et le témoin les cherchait là où ils n'étaient plus — le
  piège de `r: 66` à San Francisco, du côté du banc. Le mobilier est
  désormais EXPORTÉ (`MOBILIER_LONDRES`) et le témoin le demande à la ville.
  Un témoin neuf en sort, « chaque bus est sur la chaussée, pas sur un
  trottoir ni dans un jardin » : sur la branche il a attrapé un bus posé sur
  le trottoir de Trafalgar (4/5), déplacé de deux blocs ; sur `origin/main`
  il est ROUGE à 4/5 — un bus de la City était planté dans un lot depuis
  toujours, et l'ancien témoin, qui ne regardait que la couleur, ne le voyait
  pas.

**Portail** (voie longue) : deux passages. Premier : 182 ✅ / 1 ❌, le rouge
des bus démonté et non rejoué. Second, sur le code corrigé : **187 ✅ / 0 ❌**
— fumée, `carte.js` (5/5 bus, 5/5 sur le bitume), `plafond.js` avec ses deux
empreintes IDENTIQUES à la v205 (relief 218 089 colonnes · c20adb7308ae ;
hors villes 184 656 · c79c2f3b0135 ; 4 040 colonnes sous les enfants, zéro
déplacée) et `carteMonde.js`.


## v205 — Washington roule : des ronds-points qui tournent et onze circuits mesurés

**Pourquoi.** Depuis la v201, chaque grande ville a ses voitures — sauf
Washington, la seule sans un seul circuit. Le carré de secours n'y trouvait
jamais une rue : sur le plan de L'Enfant, la moitié des avenues sont des
diagonales, et une droite qui va de la Maison-Blanche à Dupont Circle traverse
quatre ronds-points par le milieu. Pire, les ronds-points eux-mêmes étaient
infranchissables : leur anneau entier était un TROTTOIR, si bien qu'aucune
voiture ne pouvait passer Dupont, Logan ou Lafayette, et que toute boucle qui
les touchait tombait à quatre-vingts pour cent sur des pelouses. Le Mall,
lui, collait au parc du Capitole sans qu'une rue puisse les séparer — un tour
du Mall n'avait pas de retour.

**Ce que ça change.**

- **Les quatorze ronds-points de Washington ont une chaussée qui en fait le
  tour**, un jardin (ou une fontaine) au milieu et un trottoir extérieur percé
  là où débouche une avenue. Une voiture prend un rond-point comme une
  voiture : par l'arc le plus court, jamais à travers le jardin.
- **Onze circuits mesurés, tous à 99 ou 100 %**, font rouler des voitures sur
  trente-trois des trente-six avenues nommées : le tour du Mall, le
  centre-ville, Penn Quarter, Chinatown, Georgetown, le sud-ouest, Capitol
  Hill, la grande diagonale Pennsylvania–Connecticut–Massachusetts (cinq
  ronds-points contournés), Rhode Island, et le nord par la 16e et Logan
  Circle. Virginia Avenue, New York Avenue et Constitution ouest restent sans
  boucle, dette déclarée.
- La 3e Rue passe entre le Mall et le parc du Capitole, comme dans la vraie
  ville ; Independence et Constitution passent DERRIÈRE les musées (v ±17,
  trois colonnes de chaussée comme les vraies trente mètres), plus au travers
  — à ±13 et sept blocs de large, elles mettaient du bitume sous les galeries
  depuis cinq versions, et les premières voitures du tour du Mall ont traversé
  l'Air et l'Espace ; Georgetown est à ses vraies adresses (M Street à 1,7 km au nord du
  Capitole, pas au bord de l'eau) ; Washington Circle est à la 23e et
  Pennsylvania, plus dans Rock Creek.
- **Le sol ne bouge pas** : tout se joue dans la NATURE du sol (chaussée,
  trottoir, pelouse), jamais dans le relief. L'empreinte du relief de
  `plafond.js` est identique.
- **Les ormes du Mall et les bosquets des parcs ont enfin un tronc et une
  couronne** — on marche dessous. Depuis la v161 ils étaient des feuilles
  posées À PLAT sur le gravier des allées : Washington bâtit ses colonnes
  hors de la boucle générique et n'avait jamais reçu le remède de Paris,
  Londres, Nice et Lille. Et un arbre ne pousse plus dans un musée ni sur
  une bouche de métro (892 colonnes d'arbre sous des monuments avant, 172
  sous le Pentagone ; zéro après).

**Ce qui le prouve.**

- Trois témoins neufs de `carteMonde.js` interrogent le bâtisseur
  `solWashington` directement, sans charger le monde : chaque rond-point a
  huit points roulants sur son anneau et aucun au centre ; au moins dix
  circuits passent 90 % ; et **aucun circuit ne met un pas dans un jardin** —
  échantillonné bloc par bloc sur chaque tronçon, pas seulement aux sommets.
  C'est ce dernier qui a attrapé un bout de Connecticut posé EXACTEMENT sur
  l'anneau de Farragut : ni dehors ni dedans, et la corde coupait la place.
- La fumée compte six villes à circuit. Tous vérifiés ROUGES sur
  `origin/main`, où `circuitsWashington` et `CERCLES` n'existent pas.
- Un témoin neuf de `washington.js` lit la rangée d'ormes de v = ±4 dans le
  monde chargé : un tronc de trois blocs une colonne sur deux, de l'air sous
  la couronne sur l'autre, zéro feuille au sol sur tout le Mall. Rouge sur
  `origin/main` (0 orme, 74 feuillages à plat sur 130 colonnes).
- Jugé sur captures : aérien Dupont Circle, K Street et le Mall ; rue
  Connecticut, Farragut Square, Pennsylvania et Dupont.
- Le premier portail a rendu trois rouges, démontés et non rejoués : la boîte
  du musée des Amérindiens (corrigée) ; « on entre dans l'Air et l'Espace »,
  rouge sur la branche et vert sur `origin/main` avec le même musée — le banc
  y rend à 4,5 images par seconde au lieu de 15 depuis que des voitures
  roulent sur Independence, et huit pas de 700 ms ne faisaient plus que
  quatre blocs (le témoin marche désormais jusqu'à être entré ou jusqu'à ne
  plus avancer) ; et les voitures dans les musées, qui ont déplacé les deux
  avenues. Les onze circuits ont été remesurés après : 99 à 100 %.

- Le second portail a rendu UN rouge : le même « on entre dans l'Air et
  l'Espace », arrêté sur la pelouse à trois blocs de la porte, rien autour
  (« plafond à -1, 0 mur(s), à (u -45, v 3) »). Le remède du premier portail
  abandonnait dès qu'UN pas de 700 ms ne faisait pas bouger le joueur, et un
  pas entier peut tomber dans un hoquet du banc à quatre images par seconde.
  Vert seul, vert sur `origin/main`. Le témoin n'abandonne plus qu'après trois
  pas consécutifs sans mouvement — un mur arrête à chaque pas, un hoquet à un
  seul.

**Portail** (voie longue) : trois passages. Premier : 268 ✅ / 3 ❌, démontés
ci-dessus ; second : 217 ✅ / 1 ❌, démonté ci-dessus ; troisième : **vert**,
52 témoins rejoués (fumée 23, `washington.js` 29, dont l'Air et l'Espace à
« plafond à 10, (u -45, v 7) ») et cinq suites reprises vertes sur le même
code — `carte.js`, `monte.js`, `plafond.js` (les deux empreintes), `metro.js`,
`carteMonde.js` — l'empreinte de reprise étant tenue par suite depuis la v195.

## v204 — Lille à l'échelle GTA, et la citadelle en étoile

**Pourquoi.** Lille était la dernière grande ville de France à son échelle
d'origine : **seize blocs par kilomètre**, un bloc pour soixante-deux mètres.
La rue Faidherbe — la perspective de Lille, de la place du Théâtre à la gare
— faisait dix blocs de long, on la traversait en cinq secondes ; la citadelle
de Vauban, l'étoile qui fait reconnaître la ville de n'importe quelle vue
aérienne, tenait dans un disque de sept blocs ; et aucune des sept rues n'était
assez longue pour refermer une boucle de voitures. Depuis la v201 Lille était,
avec Nice, la seule grande ville à rouler sur un anneau de secours. Nice est
passée en v203 ; Lille est la neuvième ville remise à l'échelle, et la
première depuis Paris à être DANS la fenêtre d'empreinte du relief.

**Ce que ça change.** Lille passe à **trente-deux blocs par kilomètre** et
son disque de 46 à 92 blocs : il couvre Lille intra-muros, de la citadelle à
Euralille et de Wazemmes au Vieux-Lille. La citadelle est une vraie étoile à
cinq branches de onze blocs, ses douves en eau tout autour, la Deûle qui
l'enveloppe et le quai du Wault qui pointe vers le centre. La Grand'Place a
son damier, la Vieille Bourse et la colonne de la Déesse ; la rue Faidherbe
file droit sur la gare Lille-Flandres ; l'Opéra et le beffroi de la Chambre
de commerce sont côte à côte place du Théâtre ; la Porte de Paris a le grand
beffroi de l'hôtel de ville derrière elle — posé en kilomètres réels, plus en
`LILLE.x + 6` — et la tour « chaussure de ski » ferme Euralille. Le beffroi
ne laisse plus voir le ciel par ses meurtrières : ses fenêtres sont un
dessin, comme partout depuis la v202.

Et **six circuits de voitures mesurés couvrent les quinze avenues** : la
grande boucle du sud-ouest par Nationale, Vauban, Gambetta et la Liberté
(100 %, 189 blocs), la Grand'Place à la Porte de Paris (100 %, 144), le
quartier des gares par Carnot, Willy-Brandt, Tournai et Faidherbe (99 %, 96),
le tour du Vieux-Lille par la Monnaie et le Peuple-Belge (100 %, 94), l'axe
Esquermoise–Royale jusqu'à la citadelle (100 %, 82), le triangle de Wazemmes
(100 %, 97).

**Ce qui le prouve.** Lille est à (−102, −326), DANS la fenêtre que
`plafond.js` observe : la casse se borne donc **au bit près**, comme Paris en
v187. L'empreinte du relief change (c20adb73…) ; celle HORS des villes, mesurée
avec la MÊME découpe — le disque de 92 plus quarante de fondu — sur
`origin/main` et sur la branche, rend le même hash des deux côtés
(c79c2f3b…, **184 656 colonnes**, zéro déplacée). Un troisième témoin vérifie
que le disque agrandi n'atteint aucun des trois endroits où les enfants ont
bâti : le plus proche, le quartier des enfants, en reste à deux cent
vingt-neuf blocs.

Trois témoins neufs de `carteMonde.js` interrogent le bâtisseur pur
(`solLille`), jamais le monde chargé : six adresses en kilomètres réels toutes
sur terre et un rayon d'au moins 90 ; les douves de la citadelle en eau
(217 colonnes sur les 200 exigées), le Wault et la Deûle aussi ; et au moins
cinq circuits qui tiennent la rue à 90 %. Le témoin de `carte.js` balaie le
disque de la fiche au lieu d'un rayon écrit en dur, exige plus de deux cent
soixante-dix colonnes de douves et retrouve Faidherbe, la citadelle et la
hiérarchie des tours (CCI < hôtel de ville < tour de Lille) par
`adresseLille` et `VOIES_LILLE`. La fumée compte Lille parmi les cinq villes
à circuit. Tous ont été vérifiés ROUGES sur `origin/main` (`adresseLille`
absente, rayon 46 < 90, quatre villes à circuit au lieu de cinq).

Jugé sur captures : vue aérienne de la citadelle et du centre, vue de rue
sur la Grand'Place, dans le Vieux-Lille et devant Euralille. La première
passe de rue a montré des briques orange et saumon — les « briques de
plastique » de Rome — : la palette est passée au rouge, au brun et au kaki,
et la seconde passe l'a confirmé.

Portail (voie ciblée, sept suites — fumée, carte, monte, washington, plafond,
métro, carte du monde) : **vert**, deux cent quatre-vingt-un témoins, aucun
rouge au premier passage.

---

## v203 — Nice à l'échelle GTA, avec ses voitures

**Pourquoi.** Nice était la dernière grande ville de la Côte encore à son
échelle d'origine : **dix blocs par kilomètre**, un bloc pour cent mètres. La
baie des Anges tenait en quatre-vingt-seize blocs, la Promenade en une
minute de marche, et surtout aucune avenue n'était assez longue pour refermer
une boucle de voitures — la meilleure paire tenait la rue à 89 %, sous le
seuil. Depuis la v191 la ville roulait sur un anneau de secours, et depuis la
v201 c'était la seule des grandes villes, avec Lille, à ne pas avoir un vrai
circuit. Consigne de Max : accélérer la remise à l'échelle de toutes les
villes. Nice est la huitième.

**Ce que ça change.** Nice passe à **trente blocs par kilomètre** et son
disque de 48 à 144 blocs : la baie des Anges fait cinq kilomètres de courbe,
la Promenade des Anglais la longe d'un bout à l'autre avec sa plage de
galets, ses palmiers et ses chaises bleues, le Vieux-Nice tient entre le
Paillon et la colline, le port Lympia est un bassin creusé derrière le cap et
ouvert sur la mer, et la ville monte jusqu'à Cimiez au nord, la Californie à
l'ouest et le mont Boron à l'est. Le Negresco est en face de la mer, le cours
Saleya sur le sol et non sur les galets, la cathédrale russe et la baleine du
Paillon à leur place.

La colline du Château et le mont Boron sont des **bois sur un rocher**, pas
des quartiers : dans la vraie ville ce sont des parcs de pins, et la capture
du port montrait des maisons empilées dans un talus de pierre. Ils sont
désormais en herbe et en pins, le sommet du Château dégagé pour ses ruines.

Et **cinq circuits de voitures mesurés couvrent les seize avenues** : le grand
tour de l'ouest par la rue de France et la Promenade (100 %, 486 blocs), la
montée de Cimiez (100 %), le carré de la gare (100 %), le tour du vieux Nice
par les quais, le cap, Carabacel et Verdun (99 %, 153 blocs), la Californie
(100 %). Pour cela les avenues ont été **refermées sur des carrefours** : une
avenue dont le bout tombe au milieu d'un îlot ne peut appartenir à aucune
boucle. Les tracés restent ceux du vrai plan ; ce sont les bouts qui sont
recalés.

**Ce qui le prouve.** Trois témoins neufs de `carteMonde.js` : Nice tient de
la Californie à Cimiez et au mont Boron (six adresses en kilomètres réels,
toutes sur terre, rayon ≥ 140) ; la mer commence au sud de Masséna et le port
Lympia est en eau — lu dans `solNice`, le bâtisseur pur, pas dans le monde
chargé ; et au moins quatre circuits se referment sur de la chaussée à 90 %.
Le témoin de `carte.js` balaie tout le disque de la fiche au lieu d'un rayon
de 44 écrit en dur, exige un dixième du disque en mer et un sommet à 56. La
fumée compte Nice parmi les quatre villes à circuit et exige que chaque
trajet tienne la rue à 88 %. Tous ont été vérifiés ROUGES sur `origin/main`
(`monde absent`, `sommetNice 47 < 56`, trois villes à circuit au lieu de
quatre).

La sonde de la ville, rejouée après le boisement des collines : bassin,
Negresco, Saint-Nicolas, Saleya au sec, sept statues, quatre chaises bleues,
six palmiers, tous verts. Et les circuits se sont mesurés deux fois : le front
de mer en deux quais tenait à 93 % tant que la colline portait des rues ;
boisée, la même paire tombe à 72 %, parce que sa ligne de retour la traversait
en droite ligne. Le tour se fait donc comme dans la vraie ville, par Carabacel
derrière la colline — 99 %. Un circuit qu'on ne mesure pas n'existe pas.

Et le portail a attrapé ce que la sonde ne regardait pas : au zoom qui
montre Nice ENTIÈRE sur un téléphone, le plan effaçait Vieux-Nice, la
Promenade et le port — le seuil de ses lieux (`carte.js`) datait d'une ville
trois fois plus petite. Même piège que Paris en v187 et San Francisco en
v192 ; relevé à 0,8 bloc par pixel, et le témoin qui l'a vu reste.

Portail (voie ciblée, sept suites) : **vert**, deux cent soixante-dix-sept
témoins. Le premier passage avait rendu un rouge — « la mer commence au sud de Masséna »,
`enMer: false` — et c'était le témoin qui se trompait, pas la ville : sa sonde
visait quatre cents mètres au sud de Masséna, et le rivage relevé du vrai
plan est à cinq cents. On avait les pieds sur les galets. Une distance de
sonde se mesure contre le relevé (`surTerreNice` en node, dz par dz), elle
ne se devine pas ; la sonde vise désormais sept cents mètres, au large.

Jugé sur captures : vue aérienne de la baie, vue de rue à Masséna, sur la
Promenade et au pied de la colline côté port.

---

## v202 — Les sept villes bâties à la main cessent d'être transparentes

**Pourquoi.** La v195 avait sorti le verre du Financial District de San
Francisco, la v200 des deux cent soixante-neuf villes engendrées. À chaque
fois le remède avait été écrit dans le fichier de la ville qu'on regardait, et
à chaque fois il s'était arrêté là. Restaient les villes écrites à la main,
chacune avec sa propre boucle de façade et son propre bloc de `GLASS` un rang
sur deux.

Mesuré dans le volume bâti, sur le code en production : **New York 30,4 %**,
Londres 23,1 %, Nice 18,7 %, Lille 16,4 %, San Francisco 14,2 % hors de son
centre, Washington 1,2 %. Presque un tiers de Manhattan était un trou — et
comme un bâtiment est creux, on voyait à travers les tours jusqu'au ciel. Le
commentaire de `manhattan.js` le disait déjà, mot pour mot : « les tours
devenaient des cages de verre transparentes ». Il avait limité les fenêtres à
la façade ; il restait à ne plus les percer du tout.

**Ce que ça change.** Une fenêtre est un DESSIN. Chaque ville garde SES
matériaux : le mur-rideau à meneaux pour la finance et Midtown, pour les tours
de la City de Londres et pour le centre de San Francisco ; les petits bois de
l'étage haussmannien pour la brique du Village, les maisons victoriennes de
Londres, les façades ocre de Nice, la brique de Lille, les Painted Ladies de
San Francisco et les immeubles de calcaire de Washington. Tous ces blocs sont
opaques, portent leurs meneaux dans leur texture, et s'allument déjà la nuit.

**Ce qui le prouve.** Les sept villes passent à **0,0 %** de verre dans leur
volume bâti. Un témoin neuf de `carteMonde.js` l'exige sous 2 % — le reliquat
autorisé, ce sont les verrières voulues des monuments. Il a été vérifié ROUGE
sur `origin/main`, avec les valeurs ci-dessus, et vert sur la branche.

Et il interroge les `batirColonne*` directement, pas le monde chargé : sept
villes lues avec `getBlock` sans y aller rendraient zéro bloc partout, et le
témoin passerait au vert en ne prouvant rien. Un compte nul est donc traité
comme un défaut — un bâtisseur qui ne pose rien ne prouve pas que ses murs
sont opaques, il prouve qu'on ne l'a pas appelé.

Portail complet (voie longue, treize suites) : douze vertes, `reseau.js` avec
un seul rouge — `quand le relais répond, on accuse le VPN et pas le Wi-Fi`,
la dette déclarée dans `TASKS.md` depuis la v195, identique sur `origin/main`.

---

## v201 — Paris a enfin des voitures, et on peut monter dedans

**Pourquoi.** Max, après une visite : « je viens d'aller visiter Paris et je
n'ai vu aucun véhicule en circulation. » Il avait raison, et pas seulement un
peu. Paris publie seize avenues et n'en déclarait que DEUX enchaînements, tous
les deux sur la rive droite : Saint-Germain, Saint-Michel, Rennes,
Montparnasse, Raspail, les Gobelins, Rivoli, la Grande Armée n'avaient jamais
vu passer une voiture. Toute la rive gauche et tout l'ouest étaient vides.

Trois autres choses ne marchaient pas, et il les avait vues aussi. Le code
calculait `min(10, longueur / 28)` voitures par circuit alors que son propre
commentaire, juste au-dessus, promettait « une tous les vingt-cinq blocs, à
quatorze au plus » — dix-huit voitures pour tout Paris. La flotte de cinquante
modèles n'en montrait que vingt, et le pas de tirage (13 sur 50) revient sur
ses pas au bout de cinquante. Et pour monter dans une voiture qui roule, il
fallait être à moins de CINQ blocs d'elle : à 4,2 m/s, une fenêtre d'une
seconde — un enfant de sept ans la rate à tous les coups et croit que le jeu
refuse.

**Ce que ça change.** Paris passe de 2 à **5 circuits qui couvrent ses dix-huit
avenues**, rive gauche comprise, et de 18 à **95 voitures**. San Francisco de 2
à 4 circuits (neuf de ses quatorze voies parcourues, contre trois). Les deux
cent soixante-neuf villes engendrées passent de deux anneaux à quatre — et
comme un anneau peut désormais être RECTANGULAIRE et décalé en diagonale, les
quatre villes qui n'avaient aucune voiture (Agra, Berlin, Mumbai, Chicago,
coupées par un fleuve, un lac ou une côte) en ont enfin. **Plus une seule ville
à trame n'est vide : 267 sur 267.** Le rayon d'embarquement passe à neuf blocs,
et le bouton « Conduire cette voiture » s'offre tout seul quand on marche dans
la rue.

**Ce qui le prouve, et c'est là que se cachait le vrai défaut.** Mettre cinq
fois plus de voitures a d'abord fait passer Paris de 537 à **1 018 appels de
dessin** — exactement ce que la v196 avait gagné, rendu d'un coup. La sonde a
donné le chiffre que personne n'avait jamais mesuré : **une voiture coûte 32,6
maillages**, trois fois un personnage. Et la portée se testait sur la TÊTE du
convoi : les vingt voitures d'une boucle de 431 blocs se dessinaient dès qu'on
approchait d'un seul de ses points — quatre-vingt-neuf voitures dessinées à
Paris, dont celles de l'autre rive. C'est la leçon de la v196 d'un cran plus
haut : cesser d'animer ne suffit pas, il faut cesser de DESSINER.

Corrigé — portée par voiture, et 45 blocs au lieu de 110 (un bloc de ville vaut
ici trente à quarante mètres : à 110 blocs une voiture est à quatre kilomètres,
et les immeubles la cachent depuis longtemps) — le compte retombe **SOUS** son
point de départ : Paris centre **537 → 498**, San Francisco **407 → 376**. Cinq
fois plus de voitures dans la ville, deux fois plus visibles à la fois, et
moins d'appels de dessin qu'avant.

Mesuré sur les cinq circuits de Paris : 16 à 31 voitures visibles, **toutes à
moins de 45 blocs** — plus une seule dessinée pour personne — et 16 à 28
modèles différents. Quatre témoins neufs dans `monte.js`, rouges sur le code
d'aujourd'hui : la rive gauche a des voitures, aucune ne se dessine hors de
portée, ce ne sont pas dix fois la même, et le bouton s'offre tout seul.

Londres garde son unique circuit, et c'est mesuré, pas résigné : ses six autres
voies plafonnent entre 57 % et 85 % du trajet sur la rue — sous le seuil. On ne
déclare pas un circuit qui ne valide jamais.

---

## v200 — On ne voit plus au travers des immeubles, et les villes ont la place

**Pourquoi.** La v199 avait rendu la place aux villes ; il restait à la leur
donner. Un bloc de Rome valait CINQUANTE MÈTRES au sol : ses îlots faisaient
sept cent cinquante mètres de côté, un seul bâtiment les remplissait, et c'est
ce que Max avait signalé en capture — ce qui cloche à Rome n'est pas la
hauteur, c'est l'emprise.

Mais la capture prise pour vérifier a montré autre chose, bien pire, et que
personne n'avait jamais regardé au ras de la rue : **la moitié des murs était
en verre.** La grammaire des façades posait un bloc de VERRE une colonne sur
deux à tous les étages, et les tours deux rangs sur trois. Comme un bâtiment
est creux — il l'est partout, c'est ce qui rend une ville possible — on voyait
au travers. Rome n'était pas faite d'immeubles mais d'étagères, des bandes
blanches empilées sur des poteaux d'angle. C'est exactement la panne que San
Francisco avait payée en v195 ; le remède avait été écrit pour San Francisco
seule, et les deux cent soixante-neuf autres villes le portaient encore.

**Ce que ça change.** Une fenêtre est un DESSIN, plus un trou : la baie et la
devanture portent leurs meneaux dans leur texture, elles sont opaques, et elles
s'allument déjà la nuit. Les bâtiments ont une masse ; les tours de Tokyo, de
Séoul, de Shanghai et de Dubaï sont des tours. Et les villes engendrées passent
de 20 à 36 blocs par kilomètre — entre Paris (24) et Washington (48) : Rome
grandit de 120 à 216 blocs de rayon, ses îlots tombent de 750 à 417 mètres, sa
chaussée de 170 à 94, et l'on marche du Colisée au Panthéon en cinquante-six
blocs au lieu de trente et un. Ce qui grandit est la RÉSOLUTION, pas la
géographie : le disque couvre les mêmes kilomètres, le Tibre garde sa largeur
en mètres.

**Ce qui le prouve.** Le verre dans le volume bâti, mesuré des deux côtés :
Rome **24,7 % → 0**, Tokyo **47,4 % → 0**, Marrakech 33,3 % → 0, Séoul 40,4 %
→ 0, Dubaï 37,0 % → 0. Presque la moitié de Tokyo était un trou. Un témoin
neuf de `carteMonde.js` l'exige désormais sous 2 %, et les seize points d'eau
des cinquante grandes visent en unités de fiche — plus jamais un (u, v) en dur
qui meurt à la prochaine échelle.

Le facteur d'échelle est un résultat, pas un goût : la pire marge entre deux
disques donne k=1,7 → 37 blocs, k=1,8 → 31, k=1,9 → 24, k=2,0 → 17, k=2,2 → 1.
On prend 1,8. Deux villes tombent dans la fenêtre d'empreinte de `plafond.js`,
Bruxelles et Cologne : l'exception de Max sert donc une cinquième fois, et pour
la première fois depuis Paris elle se BORNE. La même découpe, mesurée sur
`origin/main` et sur la branche, rend **188 166 colonnes et le même hash des
deux côtés** — hors de ces deux disques, pas un bloc n'a bougé. Un témoin de
plus vérifie qu'aucune des deux cent soixante-neuf villes ne s'approche de ce
que les enfants ont bâti : la plus proche, Bruxelles, en reste à 228 blocs.

Corrigé au passage, et trouvé par la même mesure : la sonde qui cherche la mer
autour de chaque ville convertissait ses blocs en kilomètres avec un `0,75` figé
depuis la carte d'avant — la v199 l'avait divisée par deux sans que rien ne
rougisse. Beyrouth, Koweït et Reykjavik retrouvent leur rivage, et Bilbao,
Colombo, Hangzhou et Maputo le leur.

---

## v199 — La carte double, et le sol des enfants ne bouge pas d'un bloc

**Pourquoi.** Max : « agrandir la carte entière ». Les villes n'avaient plus la
place de grandir — huit blocs entre Pise et Florence, neuf entre Johannesburg
et Pretoria, quarante et un entre Paris et Lille. Rome est mince et haute sur
des îlots de cinquante mètres, et la remettre à l'échelle comme Paris ou San
Francisco l'aurait fait toucher Naples.

L'échelle ne s'est pas choisie, elle s'est balayée — le raisonnement même qui
avait donné 0,75 km/bloc en son temps, refait avec les emprises d'aujourd'hui.
À chaque échelle candidate on demande ce qui resterait si chaque ville DOUBLAIT
son emprise, puisque c'est la raison de l'agrandissement : 0,75 → −279 blocs,
0,50 → −79, 0,429 → −4, **0,375 → +17**, 0,30 → +53. La première qui tient.

**Ce que ça change.** Les distances doublent et la marge la plus étroite de
toute la carte passe de HUIT blocs à SOIXANTE-QUINZE. Chaque ville a désormais
de quoi doubler. Le monde s'étend de 21 000 à 43 000 blocs — on voyage par la
carte, c'était déjà tranché, et le terrain s'engendre à la demande.

**Ce qui le prouve, et c'est là que tout se joue.** Le sol se réécrit partout
où la projection décide de la géographie : c'est la casse que Max avait
autorisée pour cette refonte-là. Mais **là où les enfants ont bâti, il ne bouge
pas d'un bloc** — 4 040 colonnes mesurées autour du point d'apparition et
autour de Paris, cent pour cent identiques. L'ancre de la projection est
plantée sur Paris exprès, et le bruit du terrain ne dépend que de la position.
Les dix-huit colonnes de référence de `plafond.js` ont gardé leur cote au bloc
près, et la maison sauvegardée avant le changement repose toujours sur le sol.

Trois filets ont été posés dans cet ordre, avant que rien ne bouge : une COPIE
des blocs de chaque enfant sur son propre document, écrite une seule fois ; une
MIGRATION qui décale chaque bloc de la différence de sol sous sa colonne, la
carte d'avant étant figée pour toujours dans `MONDES.terreAvant` ; et un TÉMOIN
qui compare les deux cartes et qu'aucune mise à jour de valeur ne peut
satisfaire — c'est lui, désormais, qui porte l'invariant du sol, à la place
d'une empreinte devenue impossible à borner.

**Et l'agrandissement a révélé mieux que lui-même.** Quatre témoins de
`carteMonde.js` portaient l'échelle ÉCRITE EN DUR : `blocDe` calculait son `z`
avec `/ 0.75` et l'ancre `200`, et cherchait donc le sommet de l'Everest à
mi-chemin de l'Everest — 40 blocs au lieu de 78, le Grand Canyon creusé de 3 au
lieu de 23, la Manche annoncée sans une goutte d'eau. Ils étaient verts depuis
toujours parce que rien n'avait bougé, pas parce qu'ils étaient justes. Un
témoin qui ne peut pas voir un changement n'en prouve pas l'absence : il en
donne l'illusion.

---

## v198 — La carte cesse d'être peinte en bonbon, et ses parcs ont des arbres

**Pourquoi.** Max, capture de Rome à l'appui : « refais toute la carte ». La
ville était un champ de bâtonnets orange, jaune citron et rose, coiffés de
rouge pompier — et aucun de ses parcs n'avait d'arbre. C'est l'état des deux
cent cinquante villes que le réalisme v2 n'avait jamais atteintes.

Quatre constantes mal choisies expliquent la couleur, et elles peignent
dix-neuf villes à la fois. `OCRE` n'était pas de l'ocre : `uni(1)` est
l'orange de signalisation (232, 137, 44), et il peint les murs de Rome,
Florence, Venise, Barcelone, Lisbonne, Prague, Munich, Vienne. Le nom disait
déjà ce qu'il fallait peindre — il n'a jamais été suivi. `ROSE` était un saumon
vif, employé trente-trois fois. `uni(2)`, le jaune de balise, était écrit EN
DUR dans douze fiches, hors de portée de toute constante. Et `TUILE`, le rouge
de la palette, coiffait chaque ville méditerranéenne de casquettes écarlates.

Le plus frappant : la carte 2D disait DÉJÀ la bonne couleur de toits depuis
toujours — `couleurToits: [178, 108, 82]`, un brun orangé — pendant que le bloc
posait du rouge vif. Les deux ne s'étaient jamais parlé.

Les arbres, eux, sont le même défaut pour la quatrième fois. `solVillesMonde`
les marque dans ses parcs, ses oasis et ses forêts — le Tiergarten de Berlin,
le Retiro de Madrid, le jardin anglais de Munich, le parc Güell — et la boucle
qui dessine le monde les posait à plat, comme n'importe quel identifiant de
sol. Paris l'a payé en v187, Londres, Nice et Lille en v197 ; il ne manquait
plus que la boucle du monde entier.

**Ce que ça change.** Les villes méditerranéennes sont en pierre chaude et en
travertin, coiffées de terre cuite à rangs de tuiles, au lieu de plastique
orange sous des toits écarlates. Et l'on marche sous les arbres dans les parcs
du tour du monde.

**Ce qui le prouve.** Portail vert, cinq suites. Le témoin des parcs nomme les
deux moitiés du défaut, parce que « il y a du vert » ne distingue pas un arbre
d'une pelouse : **0 arbre et 37 feuillages posés à plat** au Tiergarten avant,
**37 arbres et 0 aplat** après. Les couleurs, elles, se jugent en capture —
c'est la règle de Max — et le lot entier a été photographié en une passe, cinq
villes, deux vues chacune.

Un rouge est tombé en chemin et ne venait pas de là : « à minuit, les fenêtres
de la ville restent allumées » mesurait DEUX choses, dont un compte de morceaux
de monde CHARGÉS après deux secondes et demie. Ses deux autres mesures étaient
justes. Il attend désormais la ville, borné dans le temps : dix morceaux
éclairés au lieu d'un. Écarté en dix secondes par le code plutôt qu'en vingt
minutes de portail — Moscou n'emploie aucune des constantes du lot.

---

## v197 — Les rues de Londres ont leurs platanes

**Pourquoi.** Max, capture d'une rue londonienne à l'appui : « les villes sont
vides : pas d'arbres ». Deux défauts en un, et le second durait depuis des
versions sans que personne ne puisse le voir.

Les rues n'en avaient aucun — le platane à écorce tachetée est pourtant l'arbre
de Londres, celui de toutes les photos de Bloomsbury. Et les parcs en
marquaient déjà : `solLondres` rendait du feuillage dans Hyde Park, Regent's
Park et Primrose Hill, mais la boucle générique le posait comme n'importe quel
sol — à plat, au ras de l'herbe. Vus du ciel, de belles taches vertes ; vus de
la rue, de la pelouse d'une autre nuance. C'est mot pour mot ce que Paris avait
payé en v187, et **Nice et Lille faisaient exactement pareil** : aucune des
trois n'avait reçu le remède.

**Ce que ça change.** On marche sous les arbres dans les rues de Londres, et
Hyde Park est une vraie masse d'arbres au lieu d'un aplat vert. Nice et Lille
en profitent d'un coup, sans que leur code ait bougé : le remède est désormais
partagé.

**Ce qui le prouve.** Portail vert. Trois témoins neufs, vérifiés sur la
version précédente : zéro arbre dans Hyde Park, zéro dans les rues. Ce qui
distingue un arbre d'une pelouse n'est pas sa couleur — c'est du tronc au-dessus
du sol et du feuillage en l'air, l'un sur l'autre ; et de l'air libre à hauteur
d'enfant entre les deux, sinon c'est un fourré.

Quatre défauts ont été trouvés en chemin, chacun par un moyen que les autres ne
pouvaient pas remplacer. Les captures ont attrapé le mur vert d'un bout à
l'autre de la rue, puis la couronne à hauteur de visage. Un témoin écrit il y a
des versions pour garder la couleur de Hyde Park a attrapé le trottoir posé
sous les arbres du parc. Et une sonde sur la colonne exacte a montré pourquoi
il rougissait encore : un `continue` qui sortait de la boucle des VILLES au
lieu de celle des colonnes laissait la grille de rues générique repasser
derrière et écraser le sol. Le tronc et la couronne, eux, survivaient — le
défaut était donc invisible en capture.

---

## v196 — L'iPad respire : on ne dessine plus ce que personne ne voit

**Pourquoi.** Max, sur son iPad : « depuis ces dernières mises à jour,
l'application lag un peu, ce n'est pas très fluide et saccadé ». Et un jeu qui
saccade n'est pas seulement inconfortable : sous vingt images par seconde, le
monde avance moins vite que le temps réel — Marlon appuie aussi longtemps sur
la même touche et court moins loin.

La cause n'était ni les pixels ni les triangles. Mesuré à la sonde au centre de
Paris : **1 522 appels de dessin par image, dont 1 353 pour des personnages** —
quatre-vingt-neuf pour cent. Un personnage coûte onze maillages, un par membre
articulé plus son verre, et c'est le juste prix d'une marche qui se voit. Ce
qui ne l'est pas, c'est de le payer pour quelqu'un qui fait quatorze pixels de
haut : **cent treize des cent cinquante-trois personnages du monde étaient à
plus de quatre-vingt-dix blocs** — la garnison du château, les villageois, les
astronautes de Mars — et partaient au dessin à chaque image. Le jeu avait cessé
de les ANIMER au loin depuis longtemps ; il ne les avait jamais retirés du
RENDU.

**Ce que ça change.** Le jeu bouge souple sur l'iPad, et rien d'autre ne bouge :
même distance de vue, mêmes détails, mêmes habitants, mêmes textures. On cesse
seulement de dessiner des gens que personne ne regarde. La distance retenue,
soixante-deux blocs, est celle que le code appliquait DÉJÀ aux personnages des
châteaux et des villages depuis des versions, sans que personne ne l'ait jamais
remarqué — c'est ce qui prouve qu'elle est bonne.

**Ce qui le prouve.** 1 522 → 451 appels de dessin au centre de Paris, et 1 353
→ 47 maillages de personnages dans le champ de la caméra. Deux témoins qui vont
par paire : le premier vérifie qu'aucun personnage lointain n'est dessiné —
vérifié ROUGE sur la version précédente, 81 sur 163 ; le second qu'on n'a pas
vidé la rue pour autant, et il est vert des deux côtés, c'est son rôle.

Le portail a par ailleurs cessé d'être bavard sur une relance de page. Depuis la
v189, la synchronisation relance la page quand elle rapporte vraiment quelque
chose — comportement voulu. Trois témoins tombaient dessus en l'accusant : la
seconde tablette d'un enfant dans les réglages, et la barre de recherche de la
carte, deux fois. Ils rouvrent désormais ce qui s'est fermé et recommencent,
comme le ferait un enfant.

---

## v195 — Le pont sort de la ville, et le Financial District se tient debout

**Pourquoi.** Deux captures de Max, prises sur son iPhone dans San Francisco :
« there is no bridge in the middle of the city and building of fidi are not
looking great ». Sur la première, le Financial District est un nuage de cubes
gris suspendus dans le vide. Sur la seconde, un pont suspendu gris traverse la
ville par-dessus les rues.

Les deux ont la même racine. La remise à l'échelle de la v192 a fait passer San
Francisco de neuf à vingt-sept blocs par kilomètre ; le Golden Gate a suivi son
adresse réelle, mais le Bay Bridge et le phare étaient posés par des décalages
en blocs, jamais convertis. Mesuré : sur les soixante-trois colonnes du tablier,
**zéro n'était de l'eau**. Aucun témoin ne le voyait — celui du Bay Bridge
cherchait de la pierre grise dans un rayon de huit blocs, et il en trouvait,
celle des immeubles. Un témoin qui ne peut pas échouer ne prouve rien.

Le Financial District, lui, cumulait quatre défauts dont aucun n'avait de
témoin. Les tours posaient du VERRE partout sauf aux fenêtres : comme
l'intérieur d'un bâtiment est creux, on voyait au travers. C'est mot pour mot
le défaut que Manhattan avait payé et documenté deux versions plus tôt.

**Ce que ça change.** Le Bay Bridge enjambe la travée ouest, du Rincon à Yerba
Buena, et le phare veille à Point Bonita, sur son rocher au large de la passe.
Les tours du centre sont opaques, en pierre claire et en mur-rideau — au pied
d'une tour on longe une façade, plus un aquarium. Le centre est devenu un tapis
d'immeubles d'où sortent quelques tours, au lieu d'une brosse de crayons tous de
la même taille. Et San Francisco n'est plus enneigée : la corniche blanche est
redescendue sur la façade, où elle est en vrai, et les toits sont du goudron
sombre. Les Victoriennes perdent leurs trois tons acides — citron, vert clair,
turquoise — qui leur donnaient l'air de briques de plastique.

**Et le portail arrête de faire perdre du temps.** Max : « je ne vois pas
pourquoi on vient tester réseau quand on change la carte ». Il avait raison, et
la cause était mesurable : porter UNE limite d'attente de dix à trente secondes
dans le banc relançait les treize suites — trois quarts d'heure. Un diff limité
à des délais et des commentaires est désormais anodin, comme l'est déjà celui
qui monte `CACHE_VERSION`. Et le cache de reprise est tenu PAR SUITE : le
verdict d'une suite reste acquis tant qu'aucun fichier qui la garde n'a bougé,
au lieu d'être annulé au moindre octet du dépôt — ce qui obligeait à tout
rejouer dès qu'on corrigeait le rouge qu'on venait de trouver.

Au passage, la table des gardiens a récupéré **trente fichiers qui n'y étaient
pas**, dont deux vrais trous : `src/visio.js` ne lançait pas la suite `visio`,
et `src/garages.js` — qui écrit dans le profil de l'enfant, à côté de ses
blocs — ne lançait pas la suite de sauvegarde. Aucune ville bâtie à la main n'y
figurait non plus : c'est par ce trou que le pont de cette version est arrivé
en production.

**Ce qui le prouve.** Douze suites vertes sur treize, 462 témoins. Cinq témoins
neufs, tous vérifiés ROUGES sur le code livré avant d'être écrits : de l'eau sur
toute la travée du pont (0 → 57 colonnes sur 57), le phare sur son rocher, zéro
colonne de verre plein dans le centre (contre 123 pour 152 de façade), une
médiane de dix blocs au lieu de dix-huit, et 73 toits blancs pour 687 sombres au
lieu de 738 pour 94. `plafond.js` est vert : l'empreinte du relief sur 218 089
colonnes n'a pas bougé d'un bloc — déplacer un repère ne déplace pas le sol, et
l'invariant 1 n'a pas eu à être entamé.

Quatre vieux rouges du portail ont été démontés au passage, dont un qui était
de nous : le témoin du musée de l'Air et de l'Espace accordait 2,6 s pour
franchir huit blocs, ce qui tenait à 4,3 blocs par seconde et ne tenait plus à
3,2 depuis que la marche a été calmée en v192. L'enfant s'arrêtait sur le
perron.

---

## v194 — On conduit la voiture qu'on a vue passer

**Pourquoi.** Max : « je veux que l'on puisse conduire n'importe quel type de
voiture dans le jeu. » Les voitures qui roulent en ville n'étaient qu'un
SIÈGE : on montait à bord, le convoi suivait son tracé, et les commandes de
l'enfant ne servaient à rien. Il regardait passer les voitures et pouvait, au
mieux, se laisser porter par elles.

**Ce que ça change.** Le bouton dit désormais « 🚗 Conduire cette voiture », et
c'est ce qu'il fait : la voiture SORT du convoi et devient une monture — le
mode qui sait déjà conduire, avec sa caméra de poursuite et son interdiction de
voler. La circulation perd une voiture, et c'est honnête : l'enfant vient de la
prendre.

Et c'est bien CELLE-LÀ. Les voitures de ville tiraient déjà leur modèle parmi
les cinquante-et-un de la flotte ; elles retiennent désormais lequel, si bien
qu'on repart au volant de la Rimac Nevera qu'on a vue arriver, et pas d'une
inconnue de la même couleur. Le métro, les rames et les monoplaces gardent
l'ancien comportement : on ne conduit pas un métro.

**Ce qui le prouve.** Deux témoins neufs dans `fumee.js`, vérifiés rouges sur
l'ancien code : « on prend le volant d'une voiture vue dans la rue » — le
convoi passe de 32 à 31 voitures et `volInterdit` se pose, ce que seule la
monte d'un véhicule fait — et « c'est bien celle-là, avec son modèle ». Plus
une capture : l'enfant au volant d'une Rimac Nevera dans une rue de Paris.

**Ce qui reste.** C'est le mode `monture` qui conduit, pas encore le mode
`pilote` décrit dans `CLAUDE.md` : le véhicule emprunte toujours la boîte de
collision du joueur (0,6 bloc de large), et il ne se voit pas encore en ligne.

---

## v193 — La voiture rangée revient sur le plancher, pas sur le toit

**Pourquoi.** Max : « j'ai mis une voiture dans un garage et quand je suis
revenu, la voiture a été mise au-dessus du garage, elle n'a pas exactement
respecté les mêmes localisations, elle est passée sur le toit. » C'est la
promesse du garage qui tombe, et c'est un défaut introduit avec lui en v188.

La hauteur où l'enfant laisse sa voiture était pourtant enregistrée depuis le
début — on la range en même temps que la place et le modèle. Mais au moment de
la refabriquer, on gardait celle que venait de calculer `sommetColonne`, qui
répond sur la COLONNE : et le sommet de la colonne, sous un garage, c'est la
casquette de béton. C'est le même contresens que celui trouvé le matin même
dans `passants.js` — quand on sait où l'on a laissé quelque chose, on ne le
redemande pas au monde.

**Ce que ça change.** La voiture revient exactement où elle était : même
plancher, même place, même cap.

**Ce qui le prouve.** Un témoin neuf dans `fumee.js`, vérifié rouge sur
l'ancien code, qui mesure la chose que le témoin d'avant ne regardait pas :
non pas que la voiture soit ENREGISTRÉE, mais qu'elle revienne AU BON ENDROIT.
Garée à y = 36, elle revenait à y = 40 — trois blocs et demi plus haut, sur le
toit ; l'écart est désormais nul.

---

## v192 — San Francisco à l'échelle GTA, une marche plus calme, et des villes habitées

**Pourquoi (la marche et la vie).** Max, capture à l'appui depuis une rue de
Londres : « la vitesse de marche est trop rapide ! Et les villes sont vides :
pas d'arbres, pas de piétons, de chien, de voitures, de bus ».

Les deux venaient de valeurs écrites quand le jeu était plus petit. La marche
était à 4,3 m/s — la vitesse de Minecraft, où un bloc fait un mètre ; ici un
pâté d'immeubles en fait quarante, et on le traversait en deux secondes. Et les
passants étaient posés UNE FOIS POUR TOUTES dans un rayon **plafonné à quarante
blocs** autour du centre : Londres fait 112 blocs de rayon, Paris 185, San
Francisco 220. Toute la vie de la ville tenait dans un disque de trente blocs
au milieu, et Max était à soixante blocs de là.

**Ce que ça change (la marche et la vie).** La marche passe à 3,2 m/s et la
course à 5,4 — les distances se font en volant ou par la carte, pas à pied. Et
les passants vivent désormais **là où l'enfant se trouve** : ils naissent
autour de lui, sur le trottoir — le monde répond tout seul, il suffit de
regarder le bloc de surface — et ceux qu'il distance reviennent devant lui. Dix
habitants par ville, comme avant : ce n'est pas leur nombre qui manquait, c'est
leur place.

**Pourquoi (San Francisco).** La quatrième ville remise à l'échelle, et la pire des quatre.
San Francisco était bâtie à NEUF blocs par kilomètre : un bloc valait cent
onze mètres, Market Street en faisait trois cents de large, et un enfant ne
pouvait pas plus s'y promener qu'il ne le pouvait dans le Paris d'avant la
v187. Le plan était juste — la presqu'île, les deux quadrillages qui ne sont
pas parallèles, les treize collines à leur vraie hauteur — mais on le
survolait.

**Ce que ça change.**

*L'échelle.* Vingt-sept blocs par kilomètre, soit trente-sept mètres par bloc,
et le disque passe de 66 à 220 blocs de rayon : toute la presqu'île, du Ferry
Building à Ocean Beach, du Golden Gate à Bernal Heights. Les rues font deux
blocs de chaussée et un trottoir de chaque côté, les îlots huit à quinze
blocs — de quoi marcher entre les maisons pastel au lieu de les survoler.

*Le Golden Gate traverse vraiment le détroit.* Il faisait vingt-cinq blocs de
tablier, ce qui était juste à l'ancienne échelle ; il en fait soixante-treize.
Et il était posé par un décalage en blocs, pas par une adresse : après la
remise à l'échelle il s'est retrouvé trois fois trop près du centre, au milieu
des maisons, pendant que le détroit restait vide. C'est une capture qui l'a
montré.

*Les Marin Headlands sont redevenues des collines.* Leur courbe saturait sur
toute la moitié intérieure de l'ellipse — invisible à vingt blocs, une mesa à
table à soixante.

*Et les voitures suivent Columbus et Lombard*, remesurées après la remise à
l'échelle : les enchaînements d'avant ne valaient plus que 92 %.

**Ce qui le prouve (la vie).** Un témoin neuf dans `fumee.js`, vérifié rouge
sur l'ancien code : « loin du centre, la ville est habitée quand même » — aux
quatre cinquièmes du rayon de Londres, on comptait ZÉRO habitant dans les
quarante-cinq blocs alentour ; on en compte six, en trois secondes. La première
version du témoin, mesurée à mi-rayon et à soixante-dix blocs, passait sur
l'ancien code et ne prouvait rien.

**Ce qui le prouve (San Francisco).** San Francisco est à dix mille blocs du point
d'apparition, donc HORS de la fenêtre d'empreinte de `plafond.js` : la casse ne
peut pas s'y prouver, et la refonte apporte donc ses propres témoins, comme
Manhattan en v186. Deux témoins neufs dans `carteMonde.js`, vérifiés rouges
sur l'ancien code : « San Francisco tient du Ferry Building à Ocean Beach » et
« le Golden Gate traverse vraiment le détroit » (25 blocs avant, 73 après).
`plafond.js` reste vert — le sol du reste du monde n'a pas bougé d'un bloc — et
`carteMonde.js` confirme qu'aucune ville n'en chevauche une autre.

---

## v191 — Des voitures qui roulent vraiment dans les villes

**Pourquoi.** Max, deux versions après qu'on ait cru le sujet réglé : « ya
toujours pas de voitures dans les villes ». Il avait raison, et la cause était
dans la manière de chercher où les faire rouler.

Le jeu cherchait un CARRÉ autour du centre de la ville et le validait sur le
terrain brut — la hauteur du sol, pas la nature de la rue. Sur Paris, la sonde
a mesuré que **quarante-quatre pour cent de la ville est de la chaussée**, et
que le meilleur carré aligné sur les axes du monde ne dépassait pourtant pas
seize blocs de rayon à 93 % ; tourné dans le repère du quartier, on ne trouvait
qu'un rectangle de dix-neuf sur seize. Une rue fait deux à quatre blocs de
large : il faudrait la suivre au demi-bloc près sur toute sa longueur, et aucun
carré ne sait faire cela dans une ville radiale. Résultat : six anneaux pour
six villes, posés n'importe où, et zéro voiture visible à Paris.

**Ce que ça change.**

*Les voitures suivent de vraies avenues.* Un circuit se fabrique désormais en
mettant des avenues bout à bout — les Grands Boulevards, l'avenue de l'Opéra
et la rue La Fayette pour le cœur de Paris ; Oxford, Regent et Piccadilly à
Londres ; Columbus, Van Ness et Geary à San Francisco. C'est la méthode de
Manhattan, qui fait rouler ses voitures sur la 5e et la 8e depuis toujours, et
les villes publiaient déjà leurs voies nommées.

*Et la ville valide son propre trajet.* Un circuit qui traverserait la Seine,
un jardin ou un pâté d'immeubles ne part pas : chaque point est éprouvé contre
le sol de la ville. Nice et Lille n'ont rien qui passe le seuil — leurs rues
sont trop courtes pour refermer une boucle — et gardent l'anneau de secours
jusqu'à leur remise à l'échelle. On ne déclare pas un circuit qui ne valide
jamais.

**Ce qui le prouve.** Deux témoins neufs dans `fumee.js`, vérifiés rouges sur
l'ancien code : « chaque grande ville a son circuit de voitures » et « le
trajet tient la rue, sans traverser l'eau ni les maisons ». Mesuré à la sonde :
Paris passe de **zéro à dix-huit voitures visibles**, San Francisco de zéro à
quinze. Et deux captures de rue — une voiture sur les Grands Boulevards entre
les façades haussmanniennes, une autre sur Market Street entre les maisons
pastel.

---

## v190 — Sur un Wi-Fi qui bloque, l'enfant reste vraiment dans la partie

**Pourquoi.** Max, depuis son iPhone : « j'ai quitté l'app et je suis revenu,
j'étais déconnecté, et impossible de me reconnecter — j'ai dû quitter le online
pour revenir. » Le secours par le nuage existait pourtant, et il marchait : la
panne était qu'il se faisait chasser.

Chez l'invité, le lien direct et le lien de secours portent la **même clé** —
l'identifiant de l'hôte —, donc la même case. Le jeu inscrit sa tentative de
lien direct AVANT qu'elle ne s'ouvre, et c'est voulu : sans cela il raterait
les premiers messages. Mais quand le réseau interdit le pair-à-pair — hôtel,
école, gare —, cette tentative ne s'ouvre **jamais**, et elle prenait quand
même la place du lien par le nuage qui portait la partie. Chaque tentative de
reconnexion rechassait le secours qui venait de marcher, et la boucle ne
s'arrêtait jamais.

Vu de l'hôte, tout allait bien — il voyait l'enfant. Vu de l'enfant, il n'y
avait plus qu'un lien mort et un bandeau « reconnexion » qui tournait pour
toujours.

**Ce que ça change.** Sur un Wi-Fi qui bloque le jeu à plusieurs, l'enfant
rejoint, VOIT l'autre, et ses blocs arrivent. Il n'a plus à quitter le mode en
ligne pour y revenir.

**Ce qui le prouve.** Une sonde qui coupe le pair-à-pair à la racine, avant et
après, sur une machine au repos :

    avant  hôte ["…/direct", "…:pret/nuage"] · invité ["…/direct"] reconnexion
           ils ne se voient pas, le bloc de l'invité n'arrive jamais (60 s)
    après  hôte ["…/direct", "…:pret/nuage"] · invité ["…:pret/nuage"] nuage
           ils se voient, le bloc traverse en moins de deux secondes

Dans `reseau.js`, « Alice retrouve son monde après une veille sans retour »
repasse au vert et la suite monte à cinquante-huit témoins. Trois scénarios de
nuage y restent rouges **sous la charge du banc** — la même sonde les rend
verts sur une machine vide : c'est le prochain chantier, et il est écrit dans
`TASKS.md`.

---

## v189 — La page ne se recharge plus toute seule en pleine partie

**Pourquoi.** La v188 est partie avec une régression, et elle touchait tout le
monde. Le nuage fusionne le profil de l'enfant en tâche de fond, et compare le
résultat à ce que la tablette avait déjà pour répondre à une seule question :
la fusion a-t-elle vraiment rapporté quelque chose ? C'est cette réponse qui
décide si la page se relance. Le champ neuf des garages fabriquait un objet
vide là où il n'y avait rien — et « rien » contre « objet vide », c'est
différent. Donc « oui » à la première fusion de toute tablette qui n'avait
jamais eu de garage. Donc **un rechargement de la page en pleine partie**, une
fois par appareil.

C'est exactement le piège que le banc documente depuis des mois — une page qui
se relance au milieu d'un scénario et emporte la session avec elle — reconstruit
avec un champ neuf.

**Ce que ça change.** Un enfant qui joue ne voit plus son jeu se relancer tout
seul au bout de quelques secondes. En ligne, sa partie ne meurt plus dans la
seconde qui suit son arrivée.

**Ce qui le prouve.** Un témoin neuf dans `sauvegarde.js`, vérifié rouge sur la
v188 : **fusionner le profil avec lui-même ne change rien**. Sa subtilité est
qu'il faut se remettre dans l'état d'une TABLETTE NEUVE — une fois la première
fusion passée, le champ existe des deux côtés et la comparaison retombe juste ;
une première version du témoin était verte des deux côtés et ne prouvait rien.
Celui-ci nomme le coupable : `bouges ["garages"]`, et montre que les autres
champs jamais écrits — `pet`, `quest`, `hotbar` — ne bougent pas. Dans
`reseau.js`, le témoin « Alice retrouve son monde après une veille sans
retour » repasse de `compteur 1 []` à `compteur 2 ["Marlon"]` — et c'est LUI
qui a démasqué la panne, rejoué sur une machine vide pour écarter la charge.

---

## v188 — Un garage où la voiture reste, et une voiture qui ne vole plus

**Pourquoi.** Deux demandes de Max le même jour, et elles vont ensemble : « je
voudrais que dans les monuments que tu as, tu puisses avoir des garages, et que
quand un véhicule est déposé dans un garage, il reste tout le temps, un peu
comme dans GTA » ; et « je voudrais que le véhicule se comporte tel qu'un
véhicule normal. Aujourd'hui, on est capable de voler avec une voiture. Je ne
veux pas qu'une voiture vole ».

Les deux disent la même chose : une voiture n'était pas encore un véhicule.
Elle volait, parce que conduire consiste à brancher le véhicule sur les
commandes du joueur — donc sur sa physique, vol compris, ce que personne
n'avait jamais décidé. Et elle ne durait pas : les voitures repeuplent le monde
à chaque lancement comme les poules et les vaches, si bien qu'une voiture aimée
disparaissait au premier rechargement de la page.

Cette version rattrape aussi un défaut resté VINGT-TROIS versions en
production. Un invité dont le lien direct traîne finit par basculer sur le
nuage ; l'hôte recevait alors deux présentations au même prénom, sous deux
identifiants différents mais venant du même iPad, et sa garde anti-doublon
renvoyait l'enfant au menu d'accueil. Mesuré à la sonde : Alice rejoint par le
nuage, se fait éjecter trois secondes plus tard par son propre écho, et reste
devant « ☁️ Connecté par le nuage — ça marche même sur ce Wi-Fi ! » sans être
connectée à quoi que ce soit, pendant que les deux autres jouent sans elle.

**Ce que ça change.**

*Les garages.* Deux modèles neufs dans la bibliothèque 🏛️ — « Garage », une
place, et « Grand garage », deux. On y entre en voiture, on descend, et la
voiture RESTE : elle est écrite dans la sauvegarde de l'enfant à côté de ses
blocs, monde par monde, et elle revient avec SON modèle — la Bugatti reste la
Bugatti, pas une inconnue de la même couleur. Elle traverse le rechargement de
la page, l'extinction de l'iPad, et se retrouve sur la seconde tablette.

*Les bâtiments à façade pivotent.* La bibliothèque posait tout dans la même
direction — sans gêne pour la Tour Eiffel, qui se regarde de partout. Un
garage, si : une porte qui regarde toujours le sud, c'est un enfant qui fait le
tour de son propre garage sans trouver l'entrée. La façade regarde désormais
celui qui vient de la poser.

*La voiture ne vole plus*, et le jeu dit pourquoi au lieu de ne rien faire :
« 🚗 Une voiture ne vole pas — descends d'abord ». À pied, rien ne change.

*En ligne, plus personne ne disparaît.* Un enfant dont le Wi-Fi impose le nuage
reste dans la partie, et les autres le voient.

*La carte se centre dans l'écran utile* : l'encoche de l'iPhone n'est plus de
la place perdue, et le haut de la fiche ne passe plus sous la barre d'état.

**Ce qui le prouve.** `hote.js` passe de trois échecs à zéro et `visio.js` de
cinq à zéro — le témoin « avant le départ, les trois se voient » existait déjà
et rendait `[["Nina"],[],["Marlon"]]` au lieu des trois qui se voient tous.
Quatre témoins neufs dans `fumee.js`, tous vérifiés rouges sur l'ancien code :
« à pied, l'enfant vole toujours », « mais une voiture ne décolle pas », « et le
vol revient dès qu'on est descendu » — les trois comptent ENSEMBLE, sans le
premier on prouverait seulement qu'on a cassé le vol partout — puis « après un
rechargement, la voiture est toujours au garage », qui est le seul à distinguer
une voiture sauvegardée d'une voiture encore à l'écran. Et deux séries de
captures : le premier garage ressemblait à un kiosque à musique, il a fallu lui
rendre sa porte, la baisser et raccourcir son parvis.

---

## v187 — Paris à l'échelle GTA, et une carte où l'on cherche un lieu

**Pourquoi.** Max, après New York : « Est-ce que tu peux maintenant
retravailler sur toutes les villes ? » Paris venait en premier — c'est la
ville de la maison, et c'est celle qui allait le plus mal. Elle était bâtie à
HUIT blocs par kilomètre : un pâté d'immeubles y faisait quatre blocs, une rue
en faisait un, et un enfant qui descendait dans une rue de Paris se cognait
le nez dans une façade sans jamais voir la rue. Le plan était juste — la
Seine, les îles, l'Étoile, les percées d'Haussmann, chaque lieu à sa vraie
adresse — mais on le survolait, on n'y entrait pas. C'est mot pour mot le
verdict que Washington avait reçu en v161 (« une version très low cost ») et
Manhattan en v186.

**Ce que ça change.**

*L'échelle.* Vingt-quatre blocs par kilomètre au lieu de huit, et le disque de
la ville passe de 55 à 185 blocs de rayon — tout Paris intra-muros, le bois de
Boulogne à l'ouest et celui de Vincennes à l'est. Les rues font trois à cinq
blocs de large entre les façades, les immeubles six étages plus le comble : on
marche entre des murs de pierre de taille, on lève la tête, on voit le ciel.
Chaque quartier a maintenant SA rue — cinq mètres de venelle dans le Marais,
trente mètres d'avenue à Monceau —, ce qui à l'ancienne échelle ne pouvait pas
se voir puisque tout faisait un bloc.

*Ce qui se reconnaît enfin.* La place de l'Étoile et ses douze avenues : deux
cent quarante mètres de rond-point et des avenues de quarante mètres, au lieu
d'une esplanade de onze cents mètres qui mangeait tout l'ouest de la ville.
L'Arc de Triomphe est un vrai arc à quatre faces, deux fois et demie la
corniche des immeubles, et non plus une dalle de neuf blocs. La Tour Eiffel
est un TREILLIS de soixante-quatre blocs — on voit le ciel à travers, ses
jambes s'écartent, ses trois plateformes se lisent de loin. Notre-Dame a ses
deux tours, sa rosace, ses arcs-boutants et sa flèche sur une nef de vingt
blocs. Le Panthéon a un tambour à colonnes plus haut que large. Et les
marronniers des Champs-Élysées sont des ARBRES — un fût et une couronne —
alors qu'un bloc de feuillage posé à plat faisait de la pelouse sur le bitume.

*Ce qui a été rangé au passage.* La Seine est dessinée à sa vraie largeur (à
huit blocs par kilomètre il fallait l'élargir cinq fois pour qu'elle se voie,
et elle engloutissait le Louvre) ; le toit du commissariat n'est plus une
bâche bleue de vingt-cinq blocs à côté de Notre-Dame — le bleu de la police
reste en bandeau de façade, là où un enfant le lit.

*La carte, sur un téléphone.* Deux défauts signalés par Max, capture à
l'appui. **Couchée, la carte s'étirait** : la feuille de style lui donnait une
largeur et un plafond de hauteur — 560 sur 289 — pendant que le dessin, lui,
restait carré, et le navigateur l'écrasait dedans. Le golfe du Mexique
ressortait deux fois trop large. La carte assume maintenant un cadre
rectangulaire de bout en bout, et elle remplit la place qu'on lui donne dans
les deux sens : couché on voit large, debout on voit loin. La fiche entière
tient enfin dans l'écran couché — elle en débordait de dix-neuf pixels en haut
comme en bas —, et le bouton du trésor, qui était posé au bas de l'écran et
venait s'asseoir sur la légende, rejoint la rangée d'outils. Le bandeau du
réseau, lui, s'efface le temps de la carte : posé plus haut que tous les
panneaux du jeu, il interceptait les touchers.

Et **on peut chercher un lieu par son nom.** Deux cent soixante-dix-huit lieux
au registre, plus les places de Paris, les quartiers de Manhattan, les
monuments de Washington : les atteindre demandait de faire glisser la carte
jusqu'à eux, donc de savoir où ils sont — ce qu'un enfant ne sait justement
pas. On tape « tokyo », on touche, on y est. Sans accent ni majuscule, ce qui
commence par la saisie d'abord, et chaque résultat dit sa distance.

**Ce qui le prouve.** Le portail, neuf suites. Et surtout la forme que
prend l'invariant numéro un quand on a le droit de le casser : l'empreinte du
relief change, puisque la ville a triplé ; l'empreinte HORS des villes, elle,
est identique au bit près à celle de la v186 — 153 382 colonnes des deux côtés,
mesurées avec la même découpe sur `origin/main` et sur la branche. Hors du
disque de Paris, pas un bloc n'a bougé. Un troisième témoin vérifie que ce
disque, malgré son emprise triplée, reste à soixante-six blocs du plus proche
des trois endroits où les enfants ont bâti.

Cinq témoins neufs gardent la carte, tous vérifiés rouges sur la v186 : cent
blocs vers l'est font autant de pixels À L'ÉCRAN que cent vers le sud (143
contre 74 avant), le dessin a le rapport de sa boîte, la fiche tient dans
l'écran couché, la recherche trouve « washing » et « eiffel », et le résultat
touché dépose l'enfant à moins de huit blocs de Washington. Le premier a dû
être réécrit : mesuré dans le repère du DESSIN, il passait au vert sur le code
fautif — l'ancienne carte y était parfaitement carrée, et la déformation naît
une étape plus loin.

Trois témoins de Paris ont dû être réparés, tous pour la même raison : ils
visaient en dur ce qui aurait dû se calculer. Le zoom de la carte (0,24 bloc
par pixel) ne montrait plus que le premier arrondissement et annonçait « la
Tour Eiffel a disparu » ; la fenêtre qui mesure le tissu était centrée sur
l'ancre, soit à cette échelle le Louvre, les Tuileries et la Seine — on y
comptait des monuments en croyant compter des immeubles. Et le témoin de la
monoplace mesurait SEIZE SECONDES DE MONTRE là où il voulait mesurer un tour
de circuit : comme le métro dépose l'enfant au milieu de Paris, la vue la plus
chargée du jeu, la voiture ne parcourait plus qu'un bout de ligne droite. Il
compte maintenant deux cent cinquante blocs de tracé.

**Ce que la voie longue a trouvé au passage, et qui ne vient pas de Paris.**
Quatre suites — `reseau.js`, `visio.js`, `reglages.js`, `hote.js` — sont
rouges, et elles le sont AUSSI sur la version en production : mêmes témoins,
mêmes valeurs, mesuré des deux côtés. Le code réseau n'a pas bougé depuis la
v164, vingt-trois versions plus tôt ; ces suites n'étaient simplement plus
sélectionnées par l'aiguillage du portail et ont rougi sans que personne ne le
voie. C'est un chantier à part, inscrit dans `TASKS.md`.

## v186 — New York à l'échelle GTA, des voitures partout, et des fenêtres allumées la nuit

**Pourquoi.** Trois verdicts de Max, dans l'ordre. « Remettre à l'échelle,
beaucoup plus riches, des choses qui se passent, Times Square » : Manhattan
était à 11,7 blocs par kilomètre, l'échelle maquette qui avait déjà fait
refaire Washington. « Les villes sont toujours désespérément vides, rajoute
les flottes de voitures qui circulent » : capture de Moscou de nuit à
l'appui — des feux, des lampadaires, des passages piétons, et rien qui
roule. Et sur la même image, un manque que personne n'avait nommé : pas
UNE fenêtre éclairée.

**Ce que ça change.**

*New York.* Trente-quatre blocs par kilomètre, de Battery à la 68e Rue —
le haut de l'île attend que le monde grandisse, comme la Cathédrale
nationale à Washington. Les avenues ont trois voies et des trottoirs, les
pâtés sont minces et longs comme les vrais, et la ville n'est plus une
brosse à dents : un tapis de dix à vingt étages d'où sortent quelques
tours. Times Square a son nœud papillon, ses six tours d'écrans en grands
aplats, One Times Square et sa boule, les gradins rouges du TKTS. Les
monuments sont à leur vraie adresse, avec leur vraie emprise au sol, et
les ponts franchissent enfin l'East River.

*Les voitures.* Une tous les vingt-huit blocs au lieu d'une tous les
soixante-six, chacune un modèle différent de la flotte des cinquante, les
roues qui tournent. Surtout : une ville traversée par un fleuve n'avait
AUCUNE voiture — l'anneau de circulation tombait dans l'eau et le code
abandonnait. Moscou, Rome, Tokyo étaient vides pour cette raison. Et les
villes bâties à la main — Paris, Londres, Nice, Lille, Washington, San
Francisco — n'en avaient jamais eu du tout. Paris est la ville de la
maison.

*La nuit.* Les fenêtres restent allumées quand le jour tombe. Une sur
trois environ, toujours les mêmes, dans toutes les villes du monde.

**Ce qui casse, et c'est assumé.** Les blocs posés par les enfants sur
l'ancienne île de New York se retrouvent déplacés : l'île entière a changé
d'échelle. C'est l'exception accordée par Max pour la refonte de la carte,
et elle ne vaut que pour elle — hors de l'emprise de Manhattan, le sol n'a
pas bougé d'un bloc.

**Ce qui le prouve.** Six témoins neufs : l'île tient de Battery à la 68e
et reste plate, ses deux fleuves l'entourent, Times Square compte ses
écrans, Moscou a huit voitures visibles au moins, les roues tournent avec
le sol qui défile, et à minuit les fenêtres brillent près de deux fois
plus que les murs. Tous rouges sur l'ancien code. Deux témoins anciens ont
été remis d'aplomb au passage : la grille de 1811 mesurait encore dans
l'ancienne unité, et la disparition du bouton « Monter » s'attendait par
un sommeil fixe. Portail complet — sept suites.

## v185 — les roues tournent

**Pourquoi.** Les cinquante modèles arrivés en v184 portent des pivots de
roue nommés, prêts à servir : une voiture dont les roues restent figées ne
roule pas, elle glisse comme une savonnette, et un enfant de sept ans le
voit au premier mètre.

**Ce que ça change.** Les quatre roues de chaque voiture de la flotte
tournent avec le sol qui défile — d'autant plus vite que la voiture va
vite, à l'arrêt quand elle est garée, à l'envers en marche arrière. Le
rayon est mesuré sur chaque modèle : la petite roue d'une Countach tourne
plus vite que la grande d'une Rolls, comme dans la vraie vie. Et un
voyage par la carte ne les fait plus tournoyer : un téléport n'est pas un
roulement.

**Ce qui le prouve.** Un témoin neuf : après une demi-seconde de conduite,
l'angle de la roue vaut la distance parcourue divisée par le rayon (20,5
radians mesurés pour 22,5 attendus sur huit mètres), et il grandit dans le
bon sens. Rouge sur l'ancien code, qui ne collectait aucun pivot — et
rouge une seconde fois, à raison, sur le téléport du banc, qui a révélé le
défaut. Le SENS, lui, s'est mesuré à la sonde et ne s'est pas deviné :
voiture à l'arrêt, on tourne la roue d'un dixième de radian et le point de
contact doit reculer de r × 0,1 — il recule de 0,0343 m pour 0,0344
attendu. Portail : fumée, monte, washington, metro.

## v184 — cinquante voitures de plus, chacune la sienne

**Pourquoi.** Max, trois archives de modèles à l'appui : « add those cars
for better diversity in cars driving. » Toutes les voitures du jeu
sortaient du même moule — trois Chiron identiques sur le parc de la
Giga-usine.

**Ce que ça change.** Cinquante modèles rejoignent le Chiron d'artiste :
Ferrari, Lamborghini, Porsche, McLaren, Koenigsegg, Pagani, Rolls,
Bugatti… Des paramétriques stylisés, homogènes, aux vraies proportions
(1 m = 1 bloc, du Huracán de 4,4 m à la Spectre de 5,46 m), avec vitres
teintées et intérieurs complets — visibles à travers la lunette en vue
GTA. Chaque voiture neuve tire son modèle au sort ; le garagiste gare
désormais un parc varié. Les 83 Mo ne pèsent PAS sur les mises à jour :
chaque modèle se télécharge à sa première rencontre, une fois par
appareil, par le canal statique du service worker (celui du scanner de
visages) — hors ligne avant cette rencontre, la coque d'attente reste.

En chemin, le portail complet a débusqué un vrai défaut d'iPad : le filet
qui répare la moitié d'écran noire comptait en RENDUS (une demi-seconde à
60 images par seconde — mais dix secondes quand l'application bégaie au
réveil, précisément le moment où l'écran casse). Il compte désormais en
temps réel : l'écran se répare en une demi-seconde, quoi qu'il arrive.

**Ce qui le prouve.** Un témoin neuf : huit voitures invoquées, au moins
trois modèles différents — rouge sur l'ancien code, qui n'en connaissait
qu'un. Les témoins d'habitacle acceptent les deux familles (volant en
tore ou nœud SteeringWheel, vitres à opacité basse ou vitrage nommé). Et
le témoin de l'écran cassé, rouge sous charge sur l'ancien filet, vert en
temps réel. Portail complet — quatorze suites, tout rejoué deux fois.

## v183 — la vue GTA au volant, et la voiture remise à l'endroit

**Pourquoi.** Max : « La vue depuis l'intérieur du cockpit de la Bugatti
n'est pas beau. » Sous ce verdict, l'inventaire des maillages du modèle a
révélé plus grave : depuis v181 la voiture roulait À L'ENVERS — le
chargeur alignait le grand axe sur z sans vérifier quel bout est l'avant,
les phares regardaient l'arrière et, du volant, on contemplait l'aileron.
Deux refontes de vue intérieure plus tard, verdict final de Max sur
captures : « on va rester dans une vue un peu comme GTA, où on voit la
voiture par derrière. »

**Ce que ça change.** Au volant, la caméra suit la voiture de derrière et
d'un peu au-dessus, comme dans GTA : on voit SA voiture filer dans la
rue. Si un mur ou un trottoir se glisse derrière, la caméra avance devant
l'obstacle au lieu d'entrer dans la roche — jamais plus près que la
carrosserie. La voiture est remise à l'endroit (l'avant vérifié par les
phares, mesuré, pas deviné), ses vitres sont enfin transparentes, et un
vrai cockpit sculpté — sièges crème, volant, compteurs — se voit à
travers elles.

**Ce qui le prouve.** Trois témoins neufs : la caméra est derrière la
voiture (à l'opposé du regard, plusieurs blocs en retrait), elle prend de
la hauteur, et le volant reste dans l'habitacle. Rouge sur l'ancien code,
qui asseyait l'œil dans la voiture à un tiers de bloc des pieds. Portail :
la voie choisie par l'aiguillage — fumée, monte, carte, washington,
metro.

## v182 — la voiture garée ne bouge plus, la marche n'accélère plus

**Pourquoi.** Deux bogues signalés par Max en jouant avec la nouvelle
voiture. « Les Bugatti bougent de manière hyper brusque… elles font que
bouger, tac, tac, tac » : une voiture garée héritait de la vie d'un animal —
errance qui claque le cap d'un coup toutes les quelques secondes, sursaut
contre les obstacles, fuite quand on la frappe. Et « on est à pied et pas en
vol, la vitesse ne doit pas accélérer » : la rampe de vitesse du vol
continuait de monter après l'atterrissage, parce qu'en vol le sol ne se
détecte pas par la chute — on marchait à 88 blocs par seconde. En chemin, un
troisième défaut, invisible celui-là : la suite de fumée accusait un onglet
de monuments disparu depuis v176 — huit versions au rouge sans que personne
ne le voie, parce que les barrières rejouaient des suites choisies à la main
au lieu du portail entier.

**Ce que ça change.** La voiture garée est parfaitement immobile : elle ne
bouge que quand un enfant la conduit. La marche redevient de la marche,
partout — la rampe ne se construit qu'en l'air. Et le portail redevient
digne de confiance : la fumée éprouve la bibliothèque là où elle vit
vraiment (l'inventaire, onglet Bâtiments), et la règle « le portail, c'est
`npm test`, jamais une liste de suites » entre dans `CLAUDE.md`.

**Ce qui le prouve.** Trois témoins neufs, chacun vérifié rouge sur
l'ancien code : la voiture garée ne dérive ni ne pivote sur cinq secondes de
jeu ; après une longue montée en vol, la marche reste sous 9 blocs par
seconde (l'ancien code : 88) ; la fumée ouvre l'inventaire, clique
Bâtiments et pose un monument comme le ferait l'enfant. Portail complet
vert — toutes les suites.

## v181 — réalisme v2, deuxième acte : les routes, les façades partout, et LA voiture

**Pourquoi.** Trois verdicts de Max, capture à l'appui à chaque fois. « Les
routes ne ressemblent pas à des routes » : l'asphalte était noir charbon et
les marquages des BLOCS entièrement blancs — une ligne d'un tiers de
chaussée, des zébras pleine largeur, un damier vu du ciel. « Refait une
passe sur toutes les villes » : la belle grammaire de façades du pilote
Moscou n'existait que là. Et la voiture : « pas en format minecraft mais en
format de la vraie vie… ça reste tout très cubique… prends du recul, ça ne
ressemble pas à ça du tout » — quatre sculptures de primitives plus tard,
le constat était sans appel : coder une carrosserie en coordonnées plafonne
au low-poly, quoi qu'on tape.

**Ce que ça change.** Les chaussées sont en vrai bitume gris, la peinture
vit DANS la texture — ligne médiane en tirets fins qui s'interrompt aux
passages piétons, zébras orientés dans l'axe, aux carrefours seulement — et
trois blocs de marquage rejoignent l'inventaire. Les auvents des boutiques
deviennent de vrais stores : segments courts, couleurs sobres. La grammaire
à travées (étages réguliers, baies encadrées, corniches) s'étend à TOUTES
les villes à trame, chacune avec ses matériaux et sa hauteur — les médinas
gardent leurs ruelles. En voiture, on s'assied enfin DERRIÈRE le pare-brise
(l'œil était au-dessus du toit), et la voiture ne se « nourrit » plus.
Surtout : la voiture EST désormais le modèle 3D d'artiste fourni par Max —
99 000 triangles, cockpit compris — allégé de 12,4 à 1,3 Mo pour l'iPad,
avec de VRAIS reflets : une caméra cubique rend la ville autour de la
voiture et l'horizon glisse sur la carrosserie. Si le fichier manque, une
coque sculptée prend le relais : le jeu démarre toujours.

**Ce qui le prouve.** Barrière complète verte (six suites), avec les
témoins neufs du programme : zéro bloc de blanc plein sur la chaussée et
des marquages dans les deux orientations (134/192/341 à Moscou) ; des
corniches à Rome (709) et Tokyo (569) et AUCUNE à Marrakech ; l'œil au
volant sous le toit ; des vitres transparentes et une carrosserie qui n'est
plus un empilement de cubes. Et le juge qui compte : les captures
envoyées à Max à chaque itération — c'est sa photo de Chiron qui a fait
basculer la méthode.

## v180 — réalisme v2, premier acte : la rue se reconnaît

**Pourquoi.** Max, capture de Moscou à l'appui : « rien de ce screenshot
n'est montrable ». Il avait raison trois fois. Les lampadaires en blocs —
trois noirs, un or — se lisaient comme des monolithes dorés ; les bacs à
fleurs comme des cubes de bonbon empilés ; et sur les trames en diagonale,
pointillés et passages piétons se pixellisaient en mouchetis blanc aléatoire.

**Ce que ça change.** Le mobilier de rue devient des MESHES fins, comme les
meubles : un réverbère de trois mètres au fût de dix centimètres, à crosse
et lanterne ; un feu tricolore à chaque coin de carrefour (jamais dans la
médina de Marrakech — elle n'en a pas dans la vraie vie non plus) ; une
jardinière basse en bois, fleurie. Et le marquage ne se peint que s'il
reste NET : une trame quasi alignée garde pointillés et zèbres, une trame
penchée roule sur de l'asphalte propre — mieux vaut pas de marque qu'un
mouchetis. Les trois accessoires rejoignent aussi l'inventaire des blocs :
un enfant peut poser son propre réverbère.

**Ce qui le prouve.** Le témoin du mobilier compte désormais les vrais
réverbères et les feux (Rome 68 et 43, Tokyo 88 et 34, Moscou 90 et 40 sur
la fenêtre de mesure), et la capture avant/après de la même rue de Moscou,
dans la discussion.

## v179 — les trains intervilles, sur les vraies lignes

**Pourquoi.** Max : « add train connecting cities from real life train
lanes ». Le monde a deux cent soixante-dix-huit villes et l'on ne voyage
qu'en se téléportant — aucun chemin visible ne relie rien.

**Ce que ça change.** Six vraies lignes — l'Eurostar (Londres-Paris), le
TGV (Paris-Lyon-Marseille), le Shinkansen (Tokyo-Kyoto), l'AVE
(Madrid-Barcelone), le Frecciarossa (Milan-Florence-Rome), l'ICE
(Amsterdam-Cologne-Francfort) — découpées en neuf navettes de gare en gare.
Le ballast de gravier court sur la campagne, un VIADUC de pierre porte la
voie au ras des flots (l'Eurostar voit la Manche passer sous ses fenêtres —
un viaduc plutôt qu'un tunnel : un enfant veut voir la mer), la carte
dessine le trait qui relie les villes, et plus un arbre ne pousse sur les
voies. Les gares sont aux portes des villes — jamais un rail à travers une
rue — et « Monter à bord » fait le reste : deux rames par navette, arrêt à
chaque gare, quatre secondes pour monter.

**Ce qui le prouve.** Deux témoins neufs — le milieu de chaque navette
porte son ballast ou son viaduc (neuf sur neuf, dont la Manche), et une
rame suivie par son rang avance de plus de dix blocs — plus les sondes :
neuf navettes tracées entre 121 et 410 blocs, 200 000 requêtes « suis-je
sur la voie ? » en neuf millisecondes loin des lignes. Captures du viaduc
et d'une rame en voie, dans la discussion.

## v178 — les villes respirent, et elles vivent

**Pourquoi.** Deux verdicts de Max, captures à l'appui. Sur Westminster :
« too packed » — Londres avait échappé au grand recalibrage v172, rues d'un
bloc, un bâtiment sur chaque case, pas un square. Et : « i expect much more
life in cities, cars, buses, metros, dogs, people walking ».

**Ce que ça change.** Londres reçoit le gabarit v172 — chaussées de trois
blocs, trottoirs, maisons à étages, et chaque trame garde son angle (le
damier penché de la City reste penché). Partout, dans les deux cent
soixante-dix-huit villes comme à Londres : UN LOT SUR DIX ne se bâtit plus —
un jardin de poche, son arbre, ses fleurs. Et la vie : les deux anneaux de
circulation roulent (six voitures par ville au lieu de trois), chaque ville
gagne son BUS — long, haut, à sa couleur, qui marque quatre arrêts par tour
et se prend par « Monter à bord » — les passants passent de six à dix, et
deux promeneurs sur dix sont des CHIENS qui trottinent. Les métros des
grandes villes générées suivront avec les trains.

**Ce qui le prouve.** Trois témoins neufs — le bus roule sur le grand
anneau, dix promeneurs peuplent Rome, deux chiens parmi eux — plus les
témoins de vie de v171 inchangés ; la sonde des jardins (sept arbres et
cent soixante-dix-sept parterres autour du centre de Rome) ; et la capture
de Londres vue du ciel, dans la discussion. Le premier chien a d'ailleurs
attrapé un vrai piège avant la barrière : sans pattes déclarées, il plantait
l'animation de toute la troupe — vécu en sonde, corrigé, et c'est pour cela
que le chien trotte.

## v177 — les calottes polaires sont blanches

**Pourquoi.** Max, capture à l'appui : « bug on top and bottom on the map »
— deux bandes de prairie mouchetée barraient le haut et le bas de la carte.
C'étaient la banquise arctique et l'Antarctique : le planisphère les déclare
« terre » pour que le monde n'ait pas de trous, mais rien ne leur donnait
leur visage — elles se rendaient en campagne verte, au sol comme sur la
carte.

**Ce que ça change.** Au-delà du cercle arctique (78°) et de la lisière de
l'Antarctique (−63°), le sol du monde est neige, glace au ras de l'eau —
plus de plage de sable au pôle, plus un arbre sur la banquise — et la carte
les peint en blanc. La lisière se lit en une ligne z calculée une fois
(la latitude ne dépend que de z) : le test par colonne est gratuit.

**Ce qui le prouve.** Un témoin neuf sonde le sol de part et d'autre des
deux lisières — neige ou glace au-delà sur neuf colonnes sur neuf, jamais en
deçà (rouge sur l'ancien code : il y trouvait de l'herbe) — et la capture de
la carte monde, calottes blanches, dans la discussion.

## v176 — l'onglet Bâtiments : six cents modèles dans le +

**Pourquoi.** Max : « les bâtiments, je voudrais que tu les déplaces dans le
bouton plus, là où tu as les blocs, la déco et les meubles, que tu rajoutes
un onglet bâtiment et rajoutes-en trois cents de plus avec des bâtiments de
très haute fidélité, très recherchés. » La bibliothèque vivait dans le
panneau des pilules, sans images — des lignes de texte pour choisir une
Tour Eiffel.

**Ce que ça change.** Un onglet 🏛️ Bâtiments dans l'inventaire du +, à côté
des blocs, de la déco et des meubles : chaque bâtiment se montre en VIGNETTE
— sa façade dessinée bloc par bloc aux couleurs réelles de l'atlas — et se
pose devant soi d'un tap. Et quinze familles nouvelles, trois cents modèles
de plus (six cent un en tout), chacune sur la vraie grammaire de son type :
maison à colombages et son encorbellement, brownstone de New York et son
perron, pagode à toits superposés, riad tourné vers son patio, église
gothique à contreforts et vitraux, mosquée à minaret, temple grec
périptère, chalet à balcon filant, maison de canal d'Amsterdam à pignon,
gratte-ciel Art déco en gradins, phare rayé, moulin à ailes, gare à
verrière, hanok au toit gris incurvé, shophouse arcadée. Six blocs
d'architecture neufs les servent : pan de bois, grès brun, zellige,
vitrail, panneau shoji, tuile grise — dans l'inventaire eux aussi.

Et le vol, réglé une deuxième fois sur verdict de Max : la rampe de v175
(« la vitesse de flight n'avance pas assez vite ») était encore molle. La
montée démarre dès deux secondes, gagne un cran toutes les deux secondes et
demie, et culmine plus haut — huit fois la vitesse de base, quatre-vingt-huit
blocs par seconde, atteints en dix-sept secondes au lieu de vingt-sept.

**Ce qui le prouve.** Les trois cents variantes neuves bâties une à une en
sonde (aucune vide, toutes sous le plafond du ciel — l'Art déco culmine à
107 blocs) ; deux témoins réécrits sur le nouveau trajet — l'onglet montre
ses vignettes (une par cellule, pas une de moins), et un tap pose des
centaines de blocs devant l'enfant ; et les captures de l'onglet et d'une
pagode posée, dans la discussion.

## v175 — le vol prend sa vitesse de croisière

**Pourquoi.** Max : « comme la carte est beaucoup plus grande, ça serait bien
que, en fonction du temps de vol, la vitesse s'accélère de manière
progressive jusqu'à une vitesse assez rapide pour vite progresser sur la
carte. » Le vol doublait après trois secondes et s'arrêtait là — vingt-deux
blocs par seconde pour un monde de plusieurs milliers.

**Ce que ça change.** L'allure du vol grandit maintenant sans à-coup avec le
temps de vol continu : les trois premières secondes gardent la vitesse de
toujours (sauter de toit en toit reste précis), puis l'élan (« et ça
continue d'accélérer ! ») monte cran par cran jusqu'à la croisière — six
fois la vitesse de base, saluée d'un mot (« ✈️ Vitesse de croisière »).
Paris-Rome se survole en une demi-minute. Se poser remet tout à zéro.

**Ce qui le prouve.** Un témoin neuf mesure ce que l'enfant obtient — des
blocs parcourus par seconde de JEU — à trois moments du même vol : calme au
départ, plus du double à quinze secondes, et un plafond net en croisière
(vérifié rouge sur l'ancien code, qui échoue à l'égalité 22 = 2 × 11). Et la
sonde de croisière : 1 583 blocs parcourus en trente secondes, zéro morceau
de monde en retard derrière.

## v174 — les poissons : la mer aussi est vivante

**Pourquoi.** Max : « add fish swimming ». Le monde a des océans sur tout le
planisphère, des fleuves dans les villes, des lacs dans la campagne — et
toute cette eau était parfaitement immobile. Un enfant qui plongeait n'y
trouvait rien.

**Ce que ça change.** Des poissons de récif — six robes vives : clown,
chirurgien bleu, demoiselle jaune, vivaneau rose, turquoise, gramma violet —
nagent partout où il y a de l'eau. Ils avancent, ondulent de la queue,
virent devant les berges, respirent en profondeur sans jamais crever la
surface ni racler le fond. Le banc s'entretient autour de l'enfant (une
vingtaine de poissons, nés à portée de vue en quelques secondes) : le monde
entier semble peuplé pour le prix d'un petit banc. Première coupe corrigée
sur capture : nés à quarante-six blocs ils étaient invisibles dans la brume
bleue, et l'éclairage sous-marin éteignait leurs robes — naissance
rapprochée, couleurs pleines.

**Ce qui le prouve.** Trois témoins neufs dans la suite de la monte, au
large de Marseille — des poissons existent, chacun est DANS l'eau (pas dans
le pré, pas dans le ciel), et quatre secondes de jeu les déplacent — la
fenêtre comptée en secondes de JEU, leçon du métro gelé. Et la capture du
banc dans la discussion.

## v173 — les deux cents villes : le monde entier se peuple

**Pourquoi.** Max : « recalibrate all cities, and 200 other cities ». Le
recalibrage (v172) avait donné de vraies rues aux cinquante grandes — mais
entre elles, le globe restait vide : pas de Lyon, pas de Marseille, pas de
Manchester, pas de Lagos. Un enfant qui survolait la France ne croisait que
des forêts.

**Ce que ça change.** Deux cent vingt-trois villes réelles de plus, à leurs
vraies coordonnées — le registre passe de 55 à 278 lieux. Chacune reçoit de
la machine tout ce que les grandes ont : rues et avenues à passages piétons,
place centrale à fontaine, devantures, toits variés, passants, circulation.
Onze archétypes régionaux (Europe, monde britannique, Nordique, Méditerranée,
Orient, Asie, tours modernes, Amériques, Afrique, tropiques) donnent à chaque
région sa palette, ses hauteurs, ses tours. La côte est automatique : le
générateur sonde le planisphère autour du disque de chaque ville, et
Marseille reçoit sa plage au sud, Göteborg ses quais à l'ouest — orientés
comme sur la carte. Et les captures d'écran ont attrapé un vieux défaut
devenu criant : la forêt sauvage poussait dans les rues (Lyon disparaissait
sous les feuillages) — plus aucun arbre sauvage ne pousse dans une ville de
la machine, leurs parcs suffisent.

Et la barrière a attrapé un bug de production qui dormait depuis que le
métro marque les stations : un piège de flottants recollait chaque rame une
poignée de milliardièmes de bloc AVANT son quai, et au redémarrage l'arrêt
paraissait encore devant — refranchi, re-pause, à l'infini. Toutes les
rames de Washington gelaient une à une en quelques minutes de jeu, la
première de chaque ligne dès la vingt-deuxième image. Un enfant qui montait
dedans n'allait nulle part. C'est corrigé — et le même correctif protège la
chaîne de la Giga-usine, qui partage cette mécanique.

**Ce qui le prouve.** Les 278 lieux sans un seul chevauchement (marge
minimale 8 blocs, Pise/Florence), tous au sec ; l'empreinte du paysage hors
villes, mesurée avec la même découpe sur main et sur cette branche :
identique au bloc près (c5a30b6f…, 167 512 colonnes des deux côtés) — les
deux cents villes n'ont pas déplacé un caillou ailleurs. Les captures de
Marseille et Lyon, avant/après, dans la discussion. Et pour le métro gelé :
la reproduction en node pur — 194 pauses fantômes au même arrêt en dix
minutes avant le correctif, les douze rames de la capitale bouclant leurs
tours complets après.

## v172 — le grand recalibrage : de vraies rues, de vraies villes

**Pourquoi.** Max, captures d'écran à l'appui : « je ne vois pas du tout le
côté réalisé. Les rues sont hyper petites. Faut reformater les rues, le
sizing des villes. Tokyo ne ressemble pas à Tokyo. » Il avait raison : les
trames faisaient des rues d'UN bloc et des îlots de trois — un tapis de
cubes, pas une ville — et on arrivait de la carte le nez dans un mur.

**Ce que ça change.** Le gabarit de TOUTES les villes de la machine, refait
en un seul endroit (la normalisation de `fabrique`) :

- **De vraies rues** : chaussée d'asphalte de trois blocs avec ligne médiane
  pointillée, trottoirs de deux, **passages piétons zébrés** à chaque
  carrefour, et une **croix d'avenues** deux fois plus larges qui structure
  chaque ville — bordées de boutiques, comme les vraies.
- **Le sizing** : trente-six villes gagnent ×1,6 de rayon (Rome 75 → 120,
  Tokyo 60 → 96, Rio 85 → 136…), vérifié contre chaque voisine ; les villes
  d'eau serrée (Venise, Stockholm, Hong Kong…) gardent leur taille, c'est
  leur identité. Les fleuves se prolongent jusqu'aux nouveaux bords — le
  Bosphore traverse à nouveau tout Istanbul.
- **Les hauteurs** : maisons 5–10 selon la ville, et les métropoles ont une
  **skyline** qui culmine au centre et redescend — Dubaï monte à 58, Tokyo
  à 46, chaque tour avec son pied commerçant.
- **La place centrale** : pavée, avec sa fontaine (sauf là où un monument
  EST la place, comme l'Obélisque de Buenos Aires) — on arrive de la carte
  sur une place dégagée, plus jamais dans un mur.
- **Venise, Marrakech et la vieille Jérusalem gardent leurs ruelles** — à
  peine élargies : c'est leur âme.

**Ce qui le prouve.** La sonde des 142 monuments repasse (la Yamuna
recourbée épargne le fort d'Agra), les seuils des devantures sont recalés
sur les nouvelles mesures, et la preuve d'intégrité est refaite : la même
découpe aux nouveaux rayons, mesurée sur main et sur la branche, rend le
même hash hors des villes — pas un bloc n'a bougé ailleurs. Et surtout : la
discipline du regard — Tokyo, capturée à hauteur d'yeux et du ciel, se lit
enfin comme une ville, rues noires, zèbres blancs, skyline.


## v171 — la vie : des voitures qui circulent, des passants qui marchent

**Pourquoi.** Max : « les villes n'ont pas de vie. Il n'y a pas de voitures
qui circulent, il n'y a pas de piétons. » Deuxième étage du programme
« villes vivantes », après les devantures de v170.

**Ce que ça change.**

- **La circulation** : vingt-neuf villes reçoivent un anneau de circulation
  qui suit leurs rues, coins posés sur les intersections — trois voitures
  par ville, chacune sa couleur stable, qui freinent dans les virages.
  L'anneau évite l'eau, mesuré sur la géographie de chaque fiche : les
  quinze villes de fleuves et de canaux restent piétonnes — Venise n'aura
  jamais de voitures, et c'est très bien comme ça.
- **Les passants** : toutes les villes à rues — les cinquante grandes ET
  Paris, New York, Nice, Lille, Londres… — reçoivent six habitants en tenue
  d'aujourd'hui (t-shirt de couleur, pantalon sombre, quelques robes), qui
  flânent, s'écartent, reviennent, et saluent l'enfant qui s'approche.
  Chaque ville a les siens, tirés d'une graine : le passant à la chemise
  rouge de Rome y sera encore demain.
- **Et la tablette ne le paie pas** : villes paresseuses — la circulation et
  les passants d'une ville ne naissent qu'à l'approche de l'enfant, jamais à
  l'ouverture ; l'animation reste bornée au champ de vision, comme pour les
  gens des châteaux.

**Ce qui le prouve.** Trois témoins neufs dans `monte.js` : on arrive à
Rome, l'anneau naît et ses voitures se montrent ; six passants peuplent les
rues ; et huit secondes plus tard, ils ont MARCHÉ — ce sont des passants,
pas des statues.


## v170 — les devantures : les villes prennent des couleurs de vraies rues

**Pourquoi.** Max : « on n'a pas suffisamment de diversité d'un point de vue
objet, d'un point de vue couleur. On ne retrouve pas des façades de
magasins, de bâtiments. C'est une version assez low cost. Je veux un
réalisme quasi GTA. » Premier étage du programme « villes vivantes » : les
façades — le reste (circulation, piétons) suit dans les prochaines versions.

**Ce que ça change.** Les quarante-six villes de la machine, d'un coup,
reçoivent la grammaire des vraies devantures (relevée sur les guides de
conservation des shopfronts) :

- **Le rez-de-chaussée commerçant** : la moitié des lots du centre — la
  vitrine sur deux blocs, la porte de bois au milieu du front, et le
  **bandeau d'enseigne** coloré au-dessus, huit teintes rayées, chaque
  boutique gardant la sienne de visite en visite.
- **L'auvent rayé** qui s'avance au-dessus du trottoir, de la couleur de
  l'enseigne qu'il prolonge.
- **Le mobilier de rue** : lampadaires allumés au bord du caniveau (un tous
  les neuf blocs), bancs de bois, bacs à fleurs.
- **Les toits ne sont plus uniformes** : deux tiers gardent la couleur de la
  ville, le reste pioche — ardoise, tuile — et une maison sur deux a sa
  **cheminée de brique** au coin du lot.

**Ce qui le prouve.** Deux témoins neufs sondent Rome, Tokyo et Marrakech —
trois trames, trois palettes : vitrines (≥ 60), portes (≥ 40), enseignes
(≥ 100), auvents (≥ 60), lampadaires (≥ 8), bancs (≥ 4), et la diversité de
blocs COMPTÉE (≥ 18 sortes par quartier ; mesuré : 27 à 31). Les empreintes
du plafond ne bougent pas : les façades ne touchent pas au terrain.


## v169 — la carte ne lague plus

**Pourquoi.** Max : « la carte lag un peu. » Mesuré au banc : un fond de
carte coûtait de 450 à 1 000 ms, rejoué en continu pendant un glisser ou un
pincement. Les cinquante grandes en étaient la cause silencieuse : chaque
colonne de terrain interrogeait les 46 villes de la machine une à une
(217 ms rien que pour elles), puis ~250 zones de protection une à une —
142 monuments dans la liste.

**Ce que ça change.** Rien à l'œil — tout sous le doigt :

- **Deux index en cases de 512 blocs** : une colonne ne regarde plus que sa
  case (zéro ou une ville, presque toujours aucune zone). Prouvé équivalent
  à l'ancien parcours sur 18 400 points : zéro écart, et les deux empreintes
  du plafond sont inchangées au hash près.
- **Un cache de colonnes côté carte** : la hauteur d'une colonne ne change
  jamais — le rendu suivant ne paie que la tranche neuve.
- **Le fond au quart pendant le geste** : quatre fois moins de colonnes tant
  que le doigt bouge, la pleine finesse revient dès qu'il se pose.

Au banc : la vue monde passe de 781 à 152 ms à froid, la vue continent de
1 026 à 199 ms — et les rendus suivants sont presque gratuits.

- **Et une vraie panne attrapée au passage** : sur une machine chargée, le
  minuteur d'appui long tirait pendant un glisser — les déplacements du
  doigt attendaient leur tour dans la file, le minuteur passait devant, et
  l'enfant était téléporté au point de départ de son propre geste, carte
  refermée. La décision attend désormais l'image suivante, où les entrées
  ont été dépouillées : glisser ne téléporte jamais.

**Ce qui le prouve.** Trois témoins neufs dans `carte.js` : le fond entier à
froid sous 400 ms (mesuré 134), le rendu suivant sous 150 ms (mesuré 34), et
le glisser qui ne téléporte jamais même le fil principal étouffé 700 ms. Les
témoins existants de la carte, du plafond et du tour du monde repassent au
vert — même monde, au bloc près, juste plus vite.


## v168 — la Giga-usine : la chaîne de production, la peinture qui opère, et le volant

**Pourquoi.** Max : « une usine automobile comme une Tesla factory,
extrêmement réaliste, tant de l'extérieur que de l'intérieur : des chaînes de
production, des robots, des voitures qui avancent, des steps de process —
châssis, assemblage, peinture. On peut monter dedans, les suivre ; finies,
elles se garent sur un géant parking. Je veux conduire la voiture quand elle
est finie. »

**Ce que ça change.**

- **La Giga-usine d'Austin, Texas** — aux vraies coordonnées (30,22 / −97,62),
  destination du tour du monde. Le long hall blanc au bandeau vitré, les
  lettres GIGA rouges en façade, et dedans, dans l'ordre du vrai process :
  les presses géantes, la Giga-presse de fonderie (la signature d'Austin),
  huit bras-robots orange qui soudent au-dessus de la ligne, le tunnel de
  peinture vitré et ses buses, les racks de roues et de portes de
  l'assemblage, le portique jaune du test.
- **La chaîne roule pour de vrai** : huit voitures avancent de poste en
  poste, marquent l'arrêt à chacun, sortent faire le tour du parc et
  reviennent. On monte à bord (bouton « Monter à bord », comme le métro) et
  on suit SA voiture d'un bout à l'autre.
- **La peinture opère sous les yeux** : les caisses sont GRISES jusqu'au
  tunnel de peinture, elles en ressortent COLORÉES — et chaque voiture garde
  sa teinte, stable de tour en tour.
- **Le parc des voitures neuves** : trois rangées de livrées colorées sur le
  parking géant, ses places marquées de blanc.
- **On conduit, enfin** : trois voitures neuves attendent sur le parc, clés
  sur le contact — ce sont des montures, comme le cheval, mais à 3,4 fois la
  vitesse à pied : la plus rapide du jeu au sol. Une voiture emmenée au loin
  « rentre à l'usine » : le garagiste en gare une neuve à sa place.

**Ce qui le prouve.** Sept témoins neufs. Dans `monte.js` : la chaîne roule
et se montre, la peinture opère (du gris ET de la couleur sur la même
chaîne), les postes marquent l'arrêt, le garagiste gare trois voitures, la
voiture propose de monter, on file plus de 2,2 fois plus vite qu'à pied, et
elle reste sous nous. Dans `carteMonde.js` : le hall vitré, les lettres, les
robots, le tunnel et le parc garni, sondés dans le monde engendré. Les deux
empreintes du plafond sont inchangées au hash près : l'usine n'a pas bougé
un bloc hors de son site.


## v167 — les pastilles répondent au doigt, et la bibliothèque de bâtiments se trouve

**Pourquoi.** Max, capture d'écran à l'appui : « je ne comprends pas à quoi
servent ces boutons. Quand on clique, il ne se passe rien — et tu n'as jamais
livré la liste de bâtiments préconçus. » Les deux pastilles (🍖 le
garde-manger, 🏡 la jauge du chantier commun) étaient des indicateurs muets,
`pointer-events: none`. Et la bibliothèque de bâtiments existait bel et bien
— 21 monuments célèbres + ~300 bâtiments de ville par familles — mais cachée
derrière un onglet nommé « Monuments » au fond de l'atelier : personne ne
pouvait deviner qu'elle était là.

**Ce que ça change.**

- **Toucher 🍖 ouvre l'atelier** — là où la viande se dépense (recettes,
  nourrir les bêtes), le garde-manger sous les yeux.
- **Toucher 🏡 0/71 ouvre l'onglet Chantier**, qui dit maintenant OÙ est le
  chantier : « À 48 blocs, direction ↗ nord-est. Cherche les blocs bleus
  translucides. » Une jauge sans direction ne servait à rien.
- **Les pastilles quittent le milieu de l'écran** : elles flottaient en plein
  champ de vision, décollées de tout. Elles habitent désormais le rail
  bas-gauche, au-dessus du bouton émotes, à portée de pouce — en flux, comme
  tout le bord gauche.
- **L'onglet s'appelle « 🏛️ Bâtiments »** — son vrai contenu : les monuments
  célèbres ET les familles de bâtiments de ville (maisons, pavillons,
  immeubles…), chacun posable devant soi d'un bouton, avec 🔀 pour faire
  défiler les dizaines de modèles de chaque famille.

**Ce qui le prouve.** Quatre témoins neufs dans la suite `monte.js`, qui
suivent le doigt de l'enfant : la récolte fait naître la pastille (visible et
touchable), le toucher ouvre l'atelier sur le garde-manger ; poser une cabane
fait naître la jauge, la toucher ouvre le Chantier avec la ligne 📍 ; et
l'onglet Bâtiments montre bien monuments célèbres et bâtiments de ville.


## v166 — les cinquante grandes : le tour du monde au complet

**Pourquoi.** Max : « refais les 50 plus grosses et famous villes mondiales en
détail. » Après Londres bâtie à la main et huit villes par la machine (v165),
le monde comptait seize destinations — et il manquait tout le reste : pas de
Tokyo, pas de Moscou, pas de Venise, pas de Rio de l'hémisphère nord au sud
d'un continent à l'autre.

**Ce que ça change.**

- **Trente-huit villes de plus, toutes par la machine à villes** — le monde
  passe à cinquante-quatre destinations. Chacune est une fiche relevée sur
  documents : son eau, sa trame de rues, sa palette, ses monuments aux vraies
  coordonnées, ses lieux sur la carte. L'Europe de Madrid à Copenhague (16),
  l'Asie et le Moyen-Orient de Tokyo à Delhi (11), les Amériques de Chicago
  au Machu Picchu (9), l'Afrique avec Marrakech et Le Cap (2).
- **Cent vingt monuments nouveaux, chacun chez lui** : Saint-Basile en cinq
  bulbes de couleurs devant le Kremlin, la Sainte-Sophie face au Bosphore, le
  Burj Khalifa à 116 blocs (le seul monument compté à 7 m par bloc, sinon il
  crèverait le ciel), la perle de l'Orient au-dessus du Huangpu, les toriis
  vermillon de Fushimi Inari, le Parthénon sur sa mesa de l'Acropole, la
  Petite Sirène sur son rocher DANS l'eau du port, l'Obélisque exactement à
  l'ancre de Buenos Aires — et trois monuments volontairement HORS du rayon
  de leur ville, parce qu'ils le sont en vrai : l'Atomium à Heysel, le
  panneau Hollywood sur sa colline, le Burj al Arab sur son île.
- **Le moteur a appris sept géographies nouvelles** : la lagune de Venise
  (la ville flotte au milieu), les canaux concentriques d'Amsterdam, les
  passes de Stockholm et du port Victoria de Hong Kong, la montagne-table du
  Cap (plate au sommet, falaise au bord), le sol d'altitude du Machu Picchu
  (la citadelle vit à 52, pas à 33), l'île-barrière de Miami Beach et sa
  plage, la bande du Strip dans le désert du Nevada.
- **Les ponts tiennent au-dessus de l'eau** : le Rialto, le Ponte Vecchio et
  ses boutiques, le pont Charles et ses statues — tablier à +6, appris en
  posant le premier tablier sous la ligne de flottaison.

**Ce qui le prouve.** La sonde de fabrication passe les 142 monuments des 46
villes de la machine : chacun dans son rayon (ou hors-rayon déclaré), au sec
(ou dans l'eau exprès — El Morro, la Sirène, les ponts). Le témoin du tour du
monde compte désormais les 142 debout, lit la flèche des huit grands du
catalogue à son adresse exacte, et vérifie neuf signatures d'eau nouvelles
(lagune, canaux, Bosphore, port Victoria…) plus le centre de chaque ville au
sec. Les deux empreintes du plafond sont recalculées avec Bruxelles et
Amsterdam dans la découpe — et la preuve d'intégrité est refaite : la même
découpe, mesurée sur main et sur v166, rend le MÊME hash hors des villes
(5e54e15c…) : pas un bloc n'a bougé ailleurs.


## v165 — la Terre se reconnaît, et le tour du monde devient un vrai tour du monde

**Pourquoi.** Max, devant la carte de v164 : « quand je regarde la carte, je ne
reconnais pas la vraie carte du monde… je veux une espèce de carte du monde un
peu réduite. Et surtout, les villes sont une vraie déception. Quand tu vois
Londres aujourd'hui, il n'y a qu'un seul bâtiment… je veux un petit bout de
Londres avec une vraie fidélité — les rues, les maisons — qu'on ait
l'impression d'être à Londres. Il y a aussi le relief : les Alpes, l'Himalaya,
le Grand Canyon. Je veux un revamp deep, deep, deep. » Il avait raison deux
fois : les villes étaient aux bonnes coordonnées, mais posées sur du bruit —
ni océans, ni continents, ni relief — et les neuf villes du tour du monde
n'étaient que des monuments sur des esplanades.

**Ce que ça change.**

- **La Terre, la vraie.** Vingt et un contours de continents relevés au degré
  près : l'Atlantique s'étend entre Paris et New York, la Manche sépare
  Londres de Lille, la Méditerranée borde Nice, l'Afrique a sa corne et
  l'Amérique du Sud sa pointe. Au dézoom entier, la carte EST un planisphère.
- **Le relief, demandé dans la même phrase.** Dix-sept chaînes et sommets sur
  documents : les Alpes entre Nice et Rome (Mont Blanc), l'Himalaya au nord
  d'Agra (l'Everest culmine à 74 blocs, sous le plafond du terrain), les
  Andes, les Rocheuses, le mont Rainier au-dessus de Seattle, le Kilimandjaro,
  le Fuji, Uluru — et le Grand Canyon, le seul qui creuse : gorge de 28 blocs,
  le Colorado se remplissant tout seul.
- **Londres, ville entière — la première du tour du monde au niveau de Nice
  et Lille.** Tout est relevé sur documents, ancré à Charing Cross, le point
  d'où les distances à Londres se mesurent depuis le XIXᵉ siècle :
  - **la Tamise et son « S »** : elle coule vers le nord à Vauxhall, Lambeth
    et Westminster, tourne plein est à Charing Cross — le coude qu'on voit
    sur tous les plans — et repart vers Tower Bridge ;
  - **les monuments à leurs coordonnées** : Big Ben au bord de l'eau
    (51,5007/−0,1246), le palais de Westminster et sa tour Victoria, le
    London Eye juste en face sur l'autre rive, Tower Bridge TOURNÉ pour
    enjamber le fleuve, St Paul et son dôme dans la City, la Tour de Londres,
    Buckingham et ses gardes en tunique rouge, la colonne Nelson et ses
    lions, le Shard — 310 m, le sommet de la ville, comme le vrai ;
  - **trois tissus de rues** : les terrasses victoriennes de brique aux
    fenêtres blanches et aux cheminées par paires, le stuc blanc de Mayfair,
    les tours de verre de la City sur son lacis médiéval de guingois ;
  - **le Mall ROUGE** — l'avenue à l'oxyde de fer qui mène à Buckingham —
    les parcs royaux avec la Serpentine et le lac de St James, Primrose Hill
    d'où l'on voit toute la ville, les bus impériaux, les cabines
    téléphoniques, les taxis noirs.

**Une faute débusquée par la Terre elle-même.** La projection quantifiait la
longitude au degré près — Rome était posée 60 km trop à l'est depuis v164, et
personne ne pouvait le voir tant que la carte n'avait pas de côtes. C'est la
projection inverse, exacte, qui l'a trahie. Corrigée : chaque ville est au
kilomètre de sa vraie place, aller-retour juste à 0,008°.

**Ce qui casse, et c'était demandé.** « Je veux vraiment que tu refasses toute
la carte. » La mer de bruit qui inventait des océans au hasard a vécu ; le
relief change là où la Terre a pris ses droits. Les DIX-HUIT colonnes témoins
de plafond.js n'ont pas bougé d'un bloc, la maison sauvegardée non plus : la
casse est confinée à ce que la géographie réclame.

**Ce qui le prouve.** Six témoins neufs sur Londres dans carte.js (le coude de
la Tamise, Big Ben et l'Eye, Tower Bridge au-dessus de l'eau, St Paul et le
Shard, le Mall rouge et la Serpentine, la brique et les bus) ; cinq sur la
Terre dans carteMonde.js (océans en eau, continents à terre, seize villes au
sec, l'Everest et le mont Blanc qui culminent, la gorge du canyon) ; trois
sur les huit villes (les vingt-deux monuments debout chacun chez lui, les
huit grands du catalogue à leur vraie hauteur, l'eau là où la géographie la
met et chaque centre-ville au sec) ; les empreintes de plafond.js
recalculées et racontées.

**Et les huit autres, dans la même livraison.** Max : « fais pas que Londres,
hein — je veux plein de villes iconiques. » Londres a fixé la recette ; la
machine à villes (src/villesmonde.js) la déroule sur les huit autres, chacune
relevée sur documents :

- **Rome** : le Tibre et son S, le Colisée, le Panthéon, Saint-Pierre de
  l'autre côté du fleuve, le Forum, l'ocre et la terracotta ;
- **Barcelone** : la grille de l'Eixample aux angles CHANFREINÉS — la
  signature aérienne unique de la ville —, la Rambla, la Sagrada, la plage
  de la Barceloneta ;
- **Pise** : l'Arno, et les trois de la piazza dei Miracoli alignés comme
  sur place — la tour penchée, le Duomo, le baptistère rond ;
- **Gizeh** : le plateau de sable, les TROIS pyramides en taille
  décroissante — Khéphren garde sa coiffe de calcaire —, le Sphinx tourné
  vers le levant, la vallée verte du Nil ;
- **Agra** : le Taj sur la Yamuna, le charbagh — le jardin moghol en croix
  coupé de canaux —, la mosquée de grès rouge, le fort d'Agra ;
- **Sydney** : le port entre ses deux rives, l'Opéra sur la pointe
  Bennelong, le Harbour Bridge d'une seule arche, les tours du CBD ;
- **Rio** : la baie de Guanabara, le Pain de Sucre, le Christ posé AU SOMMET
  du Corcovado — la statue hérite de l'altitude de son morne —, le croissant
  de Copacabana, la forêt de Tijuca, les maisons vives des pentes ;
- **Seattle** : la baie d'Elliott, la Space Needle, Pike Place, la grande
  roue du front de mer — et le mont Rainier à l'horizon, déjà levé par le
  relief.

Une ville de plus, demain, c'est une fiche de plus dans la machine.

---

## v164 — la carte prend ses vraies coordonnées, et le tour du monde commence

**Pourquoi.** Max, en jouant : « il y a un vrai sujet structurel, elles sont
beaucoup trop rapprochées… considère cette opportunité comme un reset de la
carte pour laisser beaucoup plus d'espace ». Et, sur Paris : « la ville de Paris
ne ressemble pas du tout à la ville de Paris » — faute de place. Les villes
étaient posées à des coordonnées écrites à la main, choisies au fil des versions
pour qu'elles ne se marchent pas dessus ; aucune n'était où elle devait être, et
aucune ne pouvait grandir.

Deux pannes de la partie en ligne, signalées le même jour : « quand la personne
qui est le host du jeu en ligne part, les autres se retrouvent déconnectés » ;
et « le son qui passait d'un côté avait une voix de robot, il a fallu éteindre
et remettre plusieurs fois ».

**Ce que ça change.**

- **La carte est la vraie carte.** Chaque ville est donnée par sa latitude et sa
  longitude, et une projection décide du reste. Personne n'écrit plus « Lille est
  en (−300, −200) ». Lille est au nord de Paris parce qu'elle y est vraiment, et
  Paris–Lille fait 204 km à l'échelle. L'Atlantique est resserré à 60 % — décision
  de Max —, tout le reste est à l'échelle exacte.
- **Le tour du monde.** Vingt et un monuments étaient bâtis au bloc près depuis
  des versions, et **aucun ne se dressait nulle part** : on ne pouvait que les
  poser soi-même depuis le menu du constructeur. Neuf villes rejoignent la carte —
  Londres, Rome, Barcelone, Pise, Gizeh, Agra, Sydney, Rio, Seattle — et dix
  monuments s'y dressent enfin : Big Ben, Tower Bridge, le Colisée, la Sagrada
  Família, la tour de Pise, la pyramide de Khéops, le Taj Mahal, l'Opéra de
  Sydney, le Christ Rédempteur, la Space Needle.
- **Le monde ne se referme plus quand l'hôte s'en va.** Un invité reprend
  automatiquement la maison : il vérifie que l'hôte est bien parti — et non que
  c'est son propre réseau qui flanche — puis réclame son identifiant. Le serveur
  de rendez-vous ne l'accorde qu'à un seul, ce qui suffit à les départager sans
  qu'aucune poignée de main entre enfants soit nécessaire. La partie continue,
  sous le même code.
- **La voix de robot se répare toute seule.** Un appel restait « ouvert » aux
  yeux de la visio pendant que le lien dessous se hachait : rien ne le rattrapait,
  et il fallait éteindre et rallumer. La veille surveille désormais l'état réel de
  la liaison et recompose l'appel après huit secondes de panne soutenue — assez
  pour laisser passer un clignotement de réseau, assez court pour un enfant qui
  attend.
- **Nice a enfin sa baie.** Elle sortait parfaitement plate — ni mer, ni collines —
  et personne ne l'avait vu. Avec son relief actif, deux défauts d'assise sont
  apparus et ont été corrigés : la Promenade des Anglais enterrait ses chaises
  bleues trois blocs sous le sable, et la colline du Château débordait sur la
  place Masséna, où deux des sept statues étaient prises dans le talus et une
  troisième noyée sous la cascade.
- **La carte montre enfin tout le monde.** Son dézoom butait sur un plafond écrit
  à la main, fixé quand le monde faisait mille cinq cents blocs de large. Il en
  fait aujourd'hui vingt-quatre mille : le bouton 🌍 n'en montrait qu'un huitième,
  et San Francisco n'existait plus pour personne.

**Ce qui casse, et c'était accordé.** Le relief change là où les villes étaient
et là où elles sont désormais. Max l'avait tranché pour ce chantier précis : « on
peut se permettre de casser certaines choses pour refaire bien le fond. » Hors des
villes, le paysage n'a pas bougé d'un bloc, et c'est vérifié colonne par colonne.

**Ce qui le prouve.** Une suite neuve, `carteMonde.js` : aucune ville n'en
chevauche une autre (marge la plus étroite : 58 blocs), les distances sont les
vraies distances, chaque ville est du bon côté de sa voisine, et les dix
monuments se dressent pour de vrai — jusqu'à leur flèche, sur un parvis de
plain-pied. Une autre, `hote.js`, éprouve le départ de l'hôte sur trois
navigateurs réels.

Deux témoins ont été trouvés **menteurs** en chemin, et c'est le plus instructif
de cette version :

- `plafond.js` jurait que « hors de Washington, le paysage n'a pas bougé » — en
  vert, et sans plus rien prouver. La capitale ayant déménagé à x ≈ −5 500, sa
  soustraction ne retirait plus une seule colonne de la fenêtre observée :
  l'empreinte était devenue la copie exacte de la précédente. Il découpe désormais
  autour de **toutes** les villes, et un garde-fou lui interdit de se vider en
  silence.
- `carte.js` recopiait les coordonnées des villes à la main — « New York est en
  (295, −110) ». Vingt-cinq témoins sont tombés d'un coup au premier déménagement,
  en annonçant des quartiers disparus qui avaient seulement changé d'adresse. Un
  test qui recopie ce qu'il éprouve n'éprouve que sa propre copie : il lit
  maintenant le registre. Et son « toutes les destinations tiennent à l'écran au
  dézoom maximum » interdisait au monde de grandir — douze domaines dans trente-six
  pixels ; il vérifie désormais que chacune est repérable **à son échelle**, ce qui
  est plus exigeant.

---

## v163 — le métro de Paris passe sous terre

**Pourquoi.** Max, en jouant : « pas du tout de métro ou de train aérien à
Paris. Typiquement, la réalité voudrait dire qu'on devrait avoir un métro
souterrain. Le train ne devrait pas être aérien. » Il a raison — un anneau aérien
faisant le tour de Paris n'existe nulle part, et le viaduc parisien se limite à
deux tronçons des lignes 2 et 6. Le nôtre passait au-dessus des toits, porté sur
quarante piliers.

**Ce que ça change.**

- **Un tunnel annulaire**, sept blocs sous la rue, avec ses piédroits carrelés
  de blanc, sa voûte arrondie — un couloir carré fait cave, c'est la courbe du
  plafond qui fait métro — et ses lampes tous les sept blocs, sans lesquelles on
  ne sait plus de quel côté on regarde sous terre.
- **Quatre stations avec de vrais quais** : un renfoncement à côté de la voie,
  pas la voie elle-même. Un enfant qui attend se tient **hors** du passage de la
  rame, sur un quai surélevé bordé de sa bande d'éveil jaune.
- **Des bouches de métro au bord du trottoir** : édicule vert, escalier,
  balustrade. C'est le seul morceau du métro visible depuis la rue, donc c'est
  lui qui rend le reste trouvable — un tunnel parfait mais invisible ne sert à
  personne.
- **Plus un seul pilier, plus un seul rail en l'air.**

**Ce qui ne bouge pas : le sol.** L'empreinte du relief mesure `terrainHeight`,
le paysage engendré — creuser un tunnel dessous n'y touche pas. Et les blocs
posés par un enfant sont réappliqués **après** la ville : une cabane enterrée
sur le tracé reste intacte, et c'est le tunnel qui a un trou.

**Ce qui le prouve.** Une suite neuve, `metro.js`, éprouve ce qu'un enfant vit,
pas la présence d'un tunnel quelque part. Sur l'ancien code, quatre témoins
tombent — « hauteur la plus pleine : +9, **100 % du tour** », « 8 points dégagés
sur 180 », « 0 point praticable sur 12 », « la rame roule à y=44 pour un sol à
34 ». Sur le nouveau : 35 % du tour au plus (les immeubles, que l'anneau
traverse), 180 points dégagés sur 180, 12 quais praticables sur 12, et la rame à
**y=27 pour un sol à 34**.

Le premier témoin, écrit trop vite, comptait *tout* ce qui était solide au-dessus
du sol le long de l'anneau : il rendait 2 459 blocs, et c'étaient les immeubles
de Paris. Il accusait la ville d'être un viaduc. Ce qui distingue un viaduc d'un
quartier, c'est la **continuité** — d'où la mesure actuelle, la hauteur la plus
pleine du tour.
## v162 — Washington repris à zéro : trois fois plus grand, et on habite dedans

**Pourquoi.** Le verdict de Max sur v161, quelques heures après sa mise en
ligne : « une version très low cost de Washington ». Et il avait raison sur le
fond : à seize blocs par kilomètre, le Capitole faisait vingt blocs de long, un
musée en faisait dix, une « salle » était une pièce de trois blocs — une
maquette qu'on survole, pas une ville qu'on habite. Sa demande : « me promener
quasiment comme dans GTA, dans une immersion » — la grande esplanade avec tous
les musées, des vrais bâtiments dans lesquels on entre, un métro qui connecte
vraiment.

**Ce que ça change.**

- **L'échelle triple : quarante-huit blocs par kilomètre.** La carte couvre le
  cœur monumental — d'Arlington à Union Station, de Dupont Circle au
  Pentagone, 311 × 206 blocs — et à ce prix les grands bâtiments sont à leur
  taille quasi réelle. La ville déménage au sud, sur la rive du grand estuaire :
  l'ancienne emprise rend son relief d'avant v161 **au bloc près** — vérifié
  colonne par colonne contre v160.
- **Les DOUZE musées du Mall**, dans l'ordre vrai, rive nord puis rive sud, et
  la pelouse entre les deux n'est plus mangée : les façades s'alignent sur les
  allées, comme les vraies sur Madison et Jefferson Drive.
- **On habite dedans.** Trente-deux bâtiments à intérieur, chacun avec la chose
  qu'on vient voir : le Spirit of St. Louis et le Bell X-1 suspendus au plafond
  de l'Air et de l'Espace, les capsules Apollo 11 et Friendship 7 au sol ;
  l'éléphant sous la rotonde de l'Histoire naturelle, le squelette de la salle
  des dinosaures, le diamant Hope sous sa vitrine ; la Bannière étoilée et la
  locomotive de l'Histoire américaine ; la Rotonde du Capitole sous sa coupole
  — désormais étanche — ET les deux hémicycles, Sénat au nord, Chambre au sud,
  pupitres en arcs de cercle ; la Maison-Blanche avec l'East Room, la salle à
  manger d'État, la colonnade, la roseraie et le Bureau ovale — ovale ; la
  salle de lecture de la Bibliothèque du Congrès ; la grande halle dorée
  d'Union Station et ses quais ; le théâtre Ford avec la loge du 14 avril 1865.
  Le mémorial Roosevelt, sacrifié en v161 faute de place, est revenu — ses
  quatre salles, ses cascades, et Fala.
- **Les maisons ordinaires ont des étages.** Chaque îlot porte un vrai
  escalier de granit en zigzag, des dalles tous les quatre blocs, des meubles à
  chaque niveau, deux portes. Les rues font trois blocs, les trottoirs un, la
  grille est celle de L'Enfant avec ses seize places et ronds-points.
- **Le métro relie pour de vrai.** Quatre lignes aux vraies stations — vingt
  quais, les distances vraies — rails et traverses visibles dans les tunnels,
  quais de vingt-cinq blocs sous des voûtes à caissons de neuf blocs de haut,
  mezzanine des portillons à mi-profondeur. **Et la Jaune fait la chose la plus
  spectaculaire du vrai réseau : elle sort de terre dans East Potomac Park,
  franchit le Potomac À L'AIR LIBRE sur son pont** — le pont routier de la 14e
  Rue en parallèle, comme en vrai — et replonge vers Pentagon. La rame se voit
  de loin sur le pont, de près dans les tunnels.
- **Réparé en creusant** : la Bleue traversait déjà le Potomac en v161… dans un
  tunnel fantôme jamais creusé — le générateur sautait les colonnes d'eau. Le
  fleuve appartient maintenant à la ville : tunnel creusé sous le lit, pont
  bâti au-dessus.

**Ce qui le prouve.** `tests/washington.js` refaite : vingt-huit témoins, du
trajet d'un enfant — pousser la porte du Capitole et se retrouver sous la
coupole, entrer chez les gens, descendre les treize marches et la mezzanine
jusqu'au quai, monter dans la Bleue à Smithsonian et descendre à L'Enfant
Plaza — jusqu'aux deux témoins neufs : le pont de la Jaune (tablier sous le
ciel, eau dessous, soixante-huit points de voie à l'air libre) et les avions
suspendus au-dessus de la tête. Douze photos prises dans le jeu, regardées, et
envoyées à Max.

Et `tests/plafond.js` : l'empreinte hors-zone de v162 est **identique à celle
de v160** — même découpe, 209 764 colonnes, le même condensat. Là où la
capitale n'est plus, le sol est redevenu ce qu'il a toujours été ; là où elle
s'installe, trois sanctuaires vérifiés et deux colonnes de référence figées.

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
- **Georgetown n'a pas de station**, comme dans la vraie ville. Et les deux
  stations les plus profondes sont de l'autre côté du Potomac — Pentagon à
  dix-neuf blocs sous la rue, Rosslyn à dix-sept — parce que le tunnel doit
  plonger sous le fleuve pour y arriver, puis remonter.
- **Le bouton « Monter à bord » ne ment plus.** Il restait affiché après le
  départ de la rame — plus personne ne lui disait de disparaître — et l'enfant
  appuyait dans le vide. Il se cache maintenant dès qu'il n'y a plus rien à
  prendre. Le défaut existait déjà pour le métro de la ville et la monoplace du
  circuit ; il est corrigé pour les trois.
- **Et le jeu est plus fluide au point d'apparition qu'avant Washington.** Un
  convoi se dessine tant qu'il est à moins de cent cinquante blocs — la portée
  du regard à ciel ouvert. Mais un train enterré à douze blocs est caché par
  douze blocs de roche, et la capitale n'est qu'à cent trente-sept blocs du point
  d'apparition : dix des douze rames s'y dessinaient **dans la pierre**, au-dessus
  de l'endroit précis où chaque partie commence. Un convoi souterrain ne se montre
  plus que depuis son tunnel. Au passage, la fonction qui cherche la place à
  portée de main recalculait la position de **tous** les wagons de tous les
  convois à chaque image ; un seul test de distance par convoi suffisait.

**Ce qui le prouve.** Une suite neuve, `tests/washington.js`, vingt-trois témoins
qui suivent le trajet d'un enfant : arriver sur le Mall, pousser la porte du
Capitole et se retrouver sous la coupole, entrer chez les gens, descendre
l'escalier du métro, attendre, monter et **arriver à la station suivante**
(Smithsonian → Federal Triangle). Elle est rouge sur la version d'avant, et
proprement : le module n'existe pas, elle le dit au lieu de s'effondrer.

La fluidité, elle, a été trouvée par un témoin qui ne la cherchait pas :
`monte.js` compare depuis longtemps la vitesse à pied et en selle, et il est
passé au rouge. Ce n'était pas la monture — c'était le nombre d'images. Mesuré
sur la même machine, avant et après : quarante wagons rendus au point
d'apparition, puis zéro ; huit images par demi-seconde, puis douze ; et
l'éléphant qui retrouve enfin l'allure que le code lui promet, 1,66 fois la
marche pour un `allure: 1.6` annoncé. Même la version d'avant Washington
n'atteignait que 1,46.

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
