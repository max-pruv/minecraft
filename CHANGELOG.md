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

**Ce qui le prouve.** Un témoin neuf : huit voitures invoquées, au moins
trois modèles différents — rouge sur l'ancien code, qui n'en connaissait
qu'un. Les témoins d'habitacle acceptent les deux familles (volant en
tore ou nœud SteeringWheel, vitres à opacité basse ou vitrage nommé).
Portail complet — la modification du service worker rejoue tout.

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
