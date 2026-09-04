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
