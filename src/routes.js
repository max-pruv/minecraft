// Les routes entre les villes — le REGISTRE des corridors (v300).
//
// Programme « monde fidèle », livraison 3. Une route interurbaine est un
// corridor : deux portes de ville, un axe (une polyligne, jamais une droite
// quand un aérodrome est sur le chemin), un PROFIL vertical à pente bornée,
// une SECTION, et des OUVRAGES là où le profil quitte le terrain. Le sol
// continu (`solcontinu.js`) LIT ce registre : sous un corridor, la surface est
// celle du profil, raccordée au terrain par un talus ; le rendu, le contact au
// sol, la circulation interurbaine et la carte lisent la même chose. C'est la
// discipline de `trains.js` (une pièce de voie publiée, lue par le monde et
// par les témoins), appliquée à la route — et c'est de `trains.js` que vient la
// forme : un index spatial par cases de 512, un profil en filtre en cône.
//
// PUR : ni three, ni document. Importé par `world.js`, donc par le worker de
// maillage — le premier `import 'three'` de ce graphe le tuerait (v251).
//
// TOUTE COTE EST CONTINUE. Le rail arrondit sa cote au bloc et le train saute
// (272 sauts d'un bloc sur Londres–Paris, mesuré en v297) ; ici `routeEn`
// rend un flottant, et le voxel sous la route n'est que le REMBLAI — la
// surface, le contact et le convoi lisent le profil, jamais le bloc.

import { positionDe } from './mondes.js';

// --- le registre --------------------------------------------------------------
//
// `via` : les points de passage ÉCRITS EN BLOCS DU MONDE, parce qu'ils sont
// des résultats de mesure et non des adresses de ville. Celui de l'A1 est le
// contournement de Roissy : l'axe direct Paris–Lille passe à 83 blocs du
// centre de l'aérodrome, dont le disque fait 92 (mesuré sous node, v300) ; le
// point de passage est à l'est, à r + 12 + demi-emprise du centre — la
// promesse des aérodromes (v223) — et le détour coûte 5 blocs contre 151 par
// l'ouest. Le vrai A1 passe à l'ouest de Roissy ; le Roissy du jeu a été
// déplacé (v223), et l'on contourne celui du jeu.
//
// CARTE ×3 (chantier carte-x3, session C) : les vingt-neuf `via` ont été
// RETRACÉS sur la carte à 0,0625 km par bloc, pas multipliés par trois —
// couloir le plus bas avec cap, `profilDe` sur chaque candidat, puis la porte
// de chaque ville engendrée choisie par sa rue (avenue d'entrée propre) ET
// par son relief. Les villes bâties à la main gardent leur angle d'entrée.
// Les commentaires de mesure ci-dessous (blocs, ponts, déblai) datent de la
// carte d'avant ; les mesures d'aujourd'hui sont dans docs/carte-x3-C.md.
export const ROUTES = [
  // LE POINT DE PASSAGE SE MESURE (v223, v300) — CONTRE TOUS LES OBSTACLES.
  // L'axe direct Paris–Lille passe DANS la marge de Roissy et la maison
  // témoin de plafond.js (−100, −100) est de l'autre côté. Mon premier via
  // (−150, −50) tenait les deux — et traversait le PÔLE NORD (40, −690,
  // banquise de 60 blocs) à quarante blocs de son centre : les repères posés
  // après les colonnes n'étaient pas dans la sonde, et un chalet s'est
  // retrouvé sur la chaussée (vu en capture). Cherché sous node (scratchpad
  // cherche-via5.mjs : sanctuaires ≥ 30, Roissy ≥ 2 au-delà de r + 12,
  // villes et repères hors du couloir de 24 blocs, aucun croisement de voie
  // ferrée, coudes ≤ 30°) : aucun via unique ne tient, parce que la banquise
  // touche presque le disque de Lille et que la porte doit passer à
  // l'ouest ; deux vias, 94 tracés admissibles. Celui-ci : 35 blocs de la
  // maison, 9 au-delà de la marge de Roissy, 32 de la banquise, deux coudes
  // (15° et 29°), pente 0,06, remblai 3,6, déblai 7,2, UN pont (s 530–542).
  //
  // RETRACÉE EN v306, PARCE QUE PARIS A DOUBLÉ ET BOUGÉ. La porte nord est
  // cent soixante blocs plus à l'ouest, et Roissy est parti au nord-ouest de
  // la ville : le couloir entre l'aérodrome et la maison témoin n'existe plus.
  // Même sonde, même règle (scratchpad cherche-via6.mjs) : 102 140 tracés
  // tiennent les coudes, 43 508 les repères. MON PREMIER CHOIX — la plus
  // grande plus petite marge — finissait par un pont à quinze blocs de la
  // porte de Lille, que le témoin du joint (v302) a trouvé ouvert sur 1 180
  // points : la route s'y arrête avant que le tablier n'ait rejoint une
  // chaussée. Un bout de route ne se pose pas sur l'eau. On garde donc les
  // tracés sans eau à moins de quatre-vingts blocs des deux portes (8 690),
  // et parmi eux celui qui ne laisse aucun trou aux joints de ses trois ponts
  // — le premier, cinq blocs au-dessus de son lit, se franchit dessus et
  // dessous : 22 blocs de marge au-delà de toutes les barres, coudes ≤ 27°.
  { nom: 'A1', villes: ['paris', 'lille'], via: [[-254, -76], [-253, -124], [-243, -155], [-225, -179], [-147, -233], [-102, -280], [0, -472], [212, -690], [228, -719], [238, -763], [236, -822], [210, -907], [210, -938], [222, -989], [243, -1221], [262, -1296], [314, -1434], [320, -1456], [318, -1525], [292, -1610], [288, -1673], [320, -1780], [326, -1921], [357, -2002], [358, -2021], [336, -2105], [336, -2199], [341, -2221], [372, -2292], [412, -2425], [418, -2465], [418, -2573], [424, -2613], [449, -2692], [456, -2803], [458, -2809], [469, -2832]] },
  // L'E429 (v310), LILLE–BRUXELLES : la première vers une ville ENGENDRÉE.
  // Une ville engendrée n'a pas d'avenue d'entrée dessinée ; on arrive donc
  // DANS L'AXE DE SA TRAME, sur la rue qui mène au centre — le point de
  // passage est sur cet axe (angle 0,15 + π, à r + 49 du centre), et c'est ce
  // qui fait tomber la porte sur la rue. Et l'autoroute entre jusqu'à la
  // première rue de l'axe (`bord`, 34 blocs sous le bord du disque, soit 27
  // du centre) : entre 30 et 39 blocs du centre, un anneau de verdure et de
  // lots coupe l'axe, et une porte à vingt blocs du bord (la règle de l'A1)
  // laissait les voitures finir dans un parc. L'emprise de l'autoroute (8,5
  // de demi-largeur) est celle de la rue de l'axe (chaussée 3,2 + trottoir
  // 5,7) : elle la remplace sans mordre les lots.
  // Mesuré sous node (scratchpad routes/) : 420 blocs, un coude de 29°, deux
  // ponts (s 62–74 et 329–360), joints fermés (0 / 13 065 points), remblai
  // 8,2 et déblai 4,5 au plus, zéro rail, zéro repère, aucun aérodrome, le
  // premier sanctuaire à 802 blocs. Le point de passage a été choisi parmi
  // cinq sur l'axe (r + 29 à r + 69) : les plus proches mettaient un pont de
  // deux blocs sur le coude, dont le joint s'ouvrait (153 trous).
  { nom: 'E429', villes: ['lille', 'bruxelles'], via: [[732, -3004], [935, -3152], [992, -3187], [1158, -3251], [1228, -3298], [1304, -3333], [1349, -3339], [1505, -3340], [1666, -3386], [1894, -3387], [1974, -3379], [1979, -3376], [1989, -3372], [2012, -3362]], bord: { bruxelles: 34 } },
  // L'E19 (v311), BRUXELLES–AMSTERDAM : deux villes engendrées, et c'est le
  // RELIEF qui a dessiné le tracé, pas la carte. L'axe direct arrive par le
  // sud d'Amsterdam, où le pays est à 47-52 pour une ville à 33 : un profil à
  // six pour cent y creuse DIX-HUIT blocs (mesuré 18,3), un canyon. Le sud et
  // l'est d'Amsterdam sont pareils ; seul l'ouest est bas (42 à r + 25, puis
  // la mer) — on y entre donc par l'axe ouest, dont la rue franchit les
  // canaux sur des ponts (l'axe sud, lui, les coupe sans pont). Et Schiphol
  // (502, −1519, r 74) est exactement entre les deux : on le contourne par
  // l'est, puis trois coudes de trente degrés tournent vers l'ouest juste
  // avant le disque. À Bruxelles, la sortie nord monte sur la colline de
  // l'Atomium (49 à 150 blocs) : déblai 9,04 pour une barre à 9, sur tous les
  // tracés qui la prennent. La sortie EST, basse (34 à 40), puis deux coudes
  // vers le nord, la tient à 8,4.
  // Mesuré sous node (scratchpad ams/, cherche9.mjs) : 1 041 blocs, aucun
  // pont, déblai 8,4, remblai 2,2, pente 0,063, zéro rail, zéro repère,
  // Schiphol à 85 blocs au-delà de son disque, l'Atomium à 146, et les deux
  // avenues d'entrée sur la rue de bout en bout (75 et 93 colonnes, aucune
  // dans un bloc, aucune sur l'eau).
  { nom: 'E19', villes: ['bruxelles', 'amsterdam'], via: [[2113, -3465], [2115, -3470], [2132, -3493], [2177, -3624], [2182, -3665], [2150, -3795], [2146, -3926], [2136, -3969], [2120, -4015], [2129, -4080], [2096, -4206], [2056, -4344], [2048, -4479], [2020, -4594], [2014, -4765], [1975, -4898], [1975, -4935], [2017, -5038], [2036, -5132], [2109, -5361], [2231, -5646], [2408, -5791], [2548, -5895], [2606, -5928]], bord: { bruxelles: 34 } },
  // L'A20 (v312), MONTRÉAL–QUÉBEC : la rive nord du Saint-Laurent, sur le
  // Nouveau Monde. Rien à contourner — aucune ville, aucun aérodrome, aucun
  // repère à moins de deux mille blocs — et un pays bas, 34 à 40 blocs à la
  // sortie est de Montréal comme à l'entrée ouest-sud-ouest de Québec : le
  // relief ne pose ici aucune des contraintes de l'E19. Deux coudes à chaque
  // bout ramènent les axes des deux trames sur la ligne droite.
  // Mesuré sous node (scratchpad trace.mjs, 72 260 tracés, tous admissibles) :
  // 998 blocs, aucun pont, déblai 2,1, remblai 1,6. Québec a une trame
  // ORGANIQUE qui pose ses îlots SUR l'axe à neuf blocs du centre : l'avenue
  // d'entrée s'arrête au premier îlot (`avenueDEntree`, villesmonde.js). Et la
  // porte, à vingt blocs du bord, tombait SUR un îlot (34 blocs du centre) :
  // à vingt-deux, elle est sur la rue, et l'avenue fait quinze blocs.
  { nom: 'A20', villes: ['montreal', 'quebec'], via: [[-59257, 6160], [-59228, 6157], [-59216, 6156], [-59211, 6154], [-59197, 6144], [-59193, 6139], [-59188, 6130], [-59186, 6120], [-59190, 6023], [-59187, 6004], [-59169, 5959], [-59017, 5734], [-58961, 5668], [-58942, 5633], [-58879, 5434], [-58804, 5244], [-58663, 5017], [-58627, 4978], [-58559, 4921], [-58497, 4778], [-58469, 4744], [-58414, 4671], [-58299, 4589], [-58242, 4512], [-58186, 4451], [-58087, 4300], [-57984, 4206], [-57917, 4115], [-57877, 4072], [-57799, 4014], [-57686, 3953], [-57668, 3938], [-57663, 3935], [-57660, 3930], [-57659, 3923]], bord: { quebec: 22 } },
  // LA BR-116 (v313), SÃO PAULO–RIO, la Via Dutra. Deux leçons de mesure.
  // São Paulo n'a pas sa trame là où sa fiche la déclare : sur les axes de
  // `trame.ang`, l'avenue d'entrée tombe sur des îlots (zéro colonne) et, un
  // peu de biais, sur un banc de trottoir. On a donc balayé l'ANGLE d'entrée
  // de −30° à 0° et gardé celui dont l'avenue est la plus longue, sur la
  // chaussée (97 %) et sans aucun bloc à hauteur de carrosserie : −15°,
  // 46 blocs. Et Rio a de l'eau juste à l'ouest de son disque : tous les
  // tracés ont un pont, celui-ci à 25 blocs de la porte, dans le RACCORD où
  // la chaussée se resserre en avenue — ma première sonde de joint mesurait
  // à ±8 blocs quelle que soit la largeur et y comptait 397 « trous » hors
  // de la route ; dans la largeur réelle, zéro sur 5 644.
  // Mesuré sous node : 701 blocs, un pont (s 664–676), déblai 7,4, remblai
  // 2,9, zéro rail, zéro repère, avenue de Rio 87 colonnes sur la rue.
  { nom: 'BR-116', villes: ['saopaulo', 'rio'], via: [[-40324, 128993], [-40169, 128990], [-40049, 129016], [-40019, 129018], [-40008, 129015], [-39941, 128981], [-39863, 128927], [-39810, 128827], [-39799, 128786], [-39774, 128695], [-39749, 128604], [-39649, 128406], [-39582, 128315], [-39430, 128154], [-39359, 128094], [-39320, 128063], [-39304, 128023], [-39288, 127928], [-39268, 127888], [-39253, 127871], [-39169, 127816], [-39093, 127796], [-39004, 127779], [-38907, 127723], [-38858, 127711], [-38534, 127710], [-38489, 127716], [-38415, 127773], [-38336, 127810], [-38294, 127826], [-38289, 127830], [-38260, 127834]] },
  // L'A-4 (v314), MADRID–SÉVILLE, l'Autovía del Sur : la plus longue du
  // registre. L'entrée de chaque ville se choisit par l'ANGLE (la règle de
  // São Paulo, v313) : 75° à Madrid, où l'axe de la trame vers le sud porte des
  // îlots, et −35° à Séville — l'avenue la plus longue sur la chaussée, sans
  // bloc ni eau. Mesuré sous node (scratchpad sondes/trace-vite.mjs, grille
  // grossière : la fine ne finit pas en trente minutes sur deux mille blocs) :
  // 1 908 blocs, trois ponts, déblai 6,2, remblai 3,3, zéro rail, zéro repère,
  // Madrid–Barajas hors du couloir. Le quatrième point de passage a été
  // déplacé de trente blocs, et c'est une mesure : le premier tracé mettait
  // deux ponts à UN bloc l'un de l'autre (deux points ouverts au joint) ; un
  // voisin franchissait un ravin de deux colonnes, trop étroit pour un pont
  // (il faut trois colonnes), donc COMBLÉ — dix blocs de remblai pour une
  // barre à quatre. Le profil exact se relit sur chaque variante.
  { nom: 'A-4', villes: ['madrid', 'seville'], via: [[-7276, 15411], [-7285, 15450], [-7325, 15495], [-7330, 15499], [-7334, 15503], [-7336, 15508], [-7341, 15583], [-7342, 15750], [-7355, 15799], [-7401, 15876], [-7418, 15917], [-7429, 15984], [-7444, 16027], [-7579, 16234], [-7595, 16266], [-7601, 16349], [-7657, 16458], [-7686, 16494], [-7730, 16593], [-7740, 16691], [-7767, 16781], [-7803, 16820], [-7871, 16875], [-7953, 16994], [-7987, 17070], [-8068, 17200], [-8077, 17283], [-8111, 17369], [-8144, 17474], [-8218, 17653], [-8238, 17734], [-8243, 17876], [-8270, 17967], [-8329, 18087], [-8421, 18217], [-8454, 18281], [-8535, 18595], [-8549, 18632], [-8584, 18689], [-8634, 18746], [-8771, 18948], [-8862, 19162], [-8930, 19272], [-8976, 19391], [-8997, 19418], [-9101, 19496], [-9142, 19547], [-9177, 19616], [-9224, 19681], [-9261, 19720], [-9305, 19779], [-9371, 19896], [-9463, 20116], [-9480, 20175], [-9530, 20262], [-9657, 20388], [-9750, 20453], [-9840, 20494], [-9872, 20503], [-9882, 20509]] },
  // L'A109 (v315), NAIROBI–MOMBASA : la première route d'Afrique, et la plus
  // longue (1 999 blocs). Au sud de Nairobi, là où le cap mène, le pays est
  // semé de mares : chaque colonne d'eau isolée se COMBLE (une buse, règle de
  // `profilDe`) jusqu'à sept blocs de haut, et deux mares voisines font deux
  // ponts à deux blocs l'un de l'autre, dont le joint s'ouvre (150 points).
  // On sort donc par l'EST, puis trois coudes tournent vers la côte. Mombasa
  // est petite (rayon 47) : à vingt blocs du bord son avenue faisait quinze
  // blocs, dont l'autoroute couvre une partie, et le témoin des entrées a lu
  // 19 pas pour une barre à 20 ; la porte à quatorze blocs du bord (−110°)
  // lui en donne vingt et un, propres. Mesuré sous node (sondes/
  // trace-vite.mjs, qui recopie désormais la règle de la buse et exige huit
  // blocs de sol entre deux ponts) : deux ponts, déblai 7,3, remblai 3,5,
  // pente 0,061, joint fermé (0 / 13 065), zéro rail, zéro repère.
  { nom: 'A109', villes: ['nairobi', 'mombasa'], via: [[40199, 89421], [40199, 89421], [40244, 89465], [40248, 89466], [40290, 89477], [40301, 89480], [40343, 89493], [40393, 89545], [40455, 89734], [40509, 89807], [40544, 89864], [40606, 89934], [40682, 90041], [40944, 90303], [41063, 90379], [41109, 90424], [41203, 90559], [41222, 90599], [41240, 90664], [41282, 90766], [41320, 90925], [41366, 91049], [41452, 91200], [41503, 91353], [41550, 91430], [41593, 91555], [41653, 91675], [41693, 91736], [41817, 91865], [41872, 91944], [41901, 91998], [41995, 92127], [42036, 92206], [42112, 92307], [42132, 92346], [42155, 92475], [42185, 92534], [42232, 92605], [42269, 92709], [42289, 92785], [42363, 92977], [42389, 93020], [42516, 93146], [42631, 93229], [42643, 93246], [42737, 93293], [43023, 93699], [43141, 93833], [43245, 93940], [43295, 93990], [43364, 94126], [43395, 94196], [43397, 94203], [43406, 94230]], bord: { mombasa: 14 } },
  // L'A3 (v320), COLOGNE–FRANCFORT : la première route qui a une VOIE FERRÉE
  // le long de son axe — l'ICE va droit de gare à gare (36°), et la route ne
  // doit ni le croiser ni le longer dans son emprise. Elle passe donc tout
  // entière à sa DROITE, au sud : au nord, l'aérodrome de Francfort (1734,
  // −1040, r 74) n'est qu'à 108 blocs de l'axe du rail, et entre sa marge et
  // le ballast il ne reste que quatre ou cinq blocs pour dix-sept d'emprise.
  // L'entrée se choisit par l'ANGLE (v313) : à Cologne, 104° (avenue de
  // vingt-deux blocs sur la rue, sans bloc ni eau), à Francfort 186° (vingt-
  // sept blocs) ; trois coudes de vingt-cinq degrés font tourner le tracé de
  // la sortie sud de Cologne vers l'est-nord-est, deux autres l'amènent dans
  // l'axe ouest de Francfort. Mesuré sous node (scratchpad tourne.mjs, qui lit
  // `profilDe` lui-même — la sonde ne recopie plus les règles du profil, elle
  // les appelle) : 4 852 tracés, refus 1 691 remblai · 626 déblai · 382 ponts
  // proches · 891 pont près d'une porte · 0 rail · 0 aérodrome ; celui-ci :
  // 804 blocs, aucun pont, déblai 4,8, remblai 1,4, pente 0,063, zéro colonne
  // d'emprise ou de talus sur le rail, la gare ou son quai, l'aérodrome à 118
  // blocs au-delà de son disque, zéro repère.
  { nom: 'A3', villes: ['cologne', 'francfort'], via: [[5136, -3429], [5140, -3410], [5151, -3393], [5219, -3332], [5334, -3287], [5437, -3228], [5467, -3213], [5492, -3180], [5556, -3069], [5693, -2928], [5780, -2808], [5933, -2656], [5976, -2630], [6008, -2620], [6082, -2610], [6133, -2589], [6285, -2479], [6380, -2389], [6424, -2365], [6467, -2353], [6556, -2349], [6599, -2338], [6764, -2229], [6879, -2116], [6916, -2088], [6962, -2069], [7054, -2062], [7058, -2061], [7092, -2040]] },
  // L'E1 (v323), KYOTO–NAGOYA, la Meishin : la seconde route qui a un rail le
  // long de son axe — le Shinkansen va droit de Kyoto à Tokyo et traverse
  // Nagoya à douze blocs de son centre, presque dans l'axe de la route (−14°
  // contre −13°). On choisit un côté et l'on n'en change plus (v320) : le SUD,
  // parce que les deux trames y ont une entrée propre — Kyoto par son axe est
  // (0°, avenue de quatre-vingt-neuf blocs sur la rue), Nagoya par son axe
  // ouest-sud-ouest (150°, vingt-huit blocs) — et qu'au nord du rail, Nagoya
  // n'a qu'une avenue de dix blocs. Un étang coupe le sud de l'axe direct
  // (52 130–52 150, z ≥ 8 384) : le second point de passage le contourne par
  // le nord, et le tracé n'a aucun pont. Mesuré sous node (scratchpad
  // nk3.mjs, qui appelle `profilDe` et `largeurA`) : 4 845 tracés admissibles
  // sans pont à coudes ≤ 25° ; celui-ci : 327 blocs, coudes de 19°, déblai
  // 5,4, remblai 0,8, pente 0,067, aucune colonne d'emprise ou de talus à
  // moins de dix-neuf blocs du rail, aucun aérodrome à moins de 732 blocs,
  // le premier repère à 77.
  { nom: 'E1', villes: ['kyoto', 'nagoya'], via: [[156040, 24712], [156045, 24686], [156038, 24629], [156036, 24624], [156027, 24610], [156023, 24606], [155998, 24595], [155981, 24592], [155948, 24598], [155908, 24617], [155850, 24677], [155787, 24789], [155779, 24826], [155781, 24847], [155788, 24868], [155813, 24911], [155859, 24957], [155924, 25002], [155966, 25017], [156007, 25022], [156037, 25015], [156176, 24973], [156221, 24925], [156425, 24796], [156673, 24695], [156686, 24694], [156798, 24680], [156869, 24661], [156939, 24628], [157028, 24611], [157123, 24611], [157147, 24612], [157178, 24601]] },
  // L'AUTOSOLE (v324), BOLOGNE–FLORENCE, le tronçon de l'Autostrada del Sole
  // qui passe l'Apennin. L'axe direct est sec, sans rail ni aérodrome ; ce
  // qui a dessiné le tracé, c'est une règle de `routes.js` qu'une sonde
  // oublie facilement : LA PORTE VISE LE PREMIER POINT DE PASSAGE, pas
  // l'angle qu'on a mesuré. Mes premiers tracés posaient leur premier point à
  // 83° de Bologne, où l'avenue n'existe pas : un point sur le RAYON de
  // chaque entrée (dix blocs hors du disque) fixe la porte là où l'avenue a
  // été mesurée — Bologne 104° (vingt-six blocs sur la rue), Florence −93°
  // (quarante blocs, sans bloc ni eau : à −90°, deux blocs sur l'avenue). Le
  // Duomo est à trente-deux blocs de l'axe au bout de l'avenue.
  // Mesuré sous node (scratchpad cherche2.mjs, qui appelle `profilDe`) :
  // 18 216 tracés, refus 14 552 coude · 1 578 déblai · 1 111 remblai · 369
  // ponts proches ; celui-ci : 346 blocs, aucun pont, déblai 7,4, remblai 0,8,
  // pente 0,067, coudes de 20°, zéro rail, zéro aérodrome à moins de 835.
  { nom: 'Autosole', villes: ['bologne', 'florence'], bord: { bologne: 14 }, via: [[10172, 8033], [10160, 8047], [10158, 8052], [10150, 8132], [10153, 8227], [10177, 8312], [10178, 8381], [10157, 8515], [10122, 8621], [10114, 8666], [10114, 8762], [10122, 8843], [10125, 8848], [10138, 8862], [10167, 8922], [10186, 8998]] },
  // L'A4 ITALIENNE (v327), MILAN–TURIN, la Torino–Milano : la plaine du Pô,
  // mais pas plate partout — l'axe direct creusait au-delà de neuf blocs, et
  // c'est le déblai qui a fait le tri (7 599 refus). Sorties par le RAYON
  // (règle de la v324) : Milan à 128°, où l'avenue de l'axe fait quarante-
  // trois blocs sur la rue, Turin à −28° (vingt). Mesuré sous node (scratchpad
  // cherche2.mjs, qui appelle `profilDe`) : 36 432 tracés, refus 28 826 coude
  // · 7 599 déblai · 1 031 remblai · 25 ponts proches, sept admissibles, tous
  // sans pont ; celui-ci : 552 blocs, déblai 7,5, remblai 0,7, pente 0,060,
  // zéro rail, l'aérodrome le plus proche à 2 046 blocs.
  { nom: 'A4', villes: ['milan', 'turin'], via: [[7729, 6314], [7679, 6347], [7612, 6376], [7552, 6405], [7485, 6431], [7362, 6509], [7318, 6520], [7242, 6524], [7199, 6536], [7164, 6554], [7110, 6598], [7071, 6618], [6964, 6635], [6869, 6666], [6737, 6725], [6694, 6736], [6575, 6739], [6444, 6770], [6364, 6782], [6227, 6827], [6188, 6834], [6178, 6839], [6159, 6856]] },
  // LE YAMUNA EXPRESSWAY (v328), DELHI–AGRA : la route du Taj Mahal. Les deux
  // villes sont grandes (rayons 130 et 167) et leurs trames ont chacune une
  // avenue très longue dans l'axe du trajet — Delhi à 58° (quatre-vingt-dix-
  // huit blocs sur la rue), Agra à −90° (cent vingt-sept) ; un point sur le
  // RAYON de chaque entrée fixe la porte (v324). Le pays entre les deux est
  // semé de mares : 7 334 tracés refusés pour un pont près d'une porte, 3 959
  // pour deux ponts trop proches. Mesuré sous node (scratchpad cherche2.mjs,
  // qui appelle `profilDe`) : 18 216 tracés, soixante-huit admissibles, tous
  // sans pont ; celui-ci : 672 blocs, déblai 7,0, remblai 1,0, pente 0,060,
  // zéro rail, l'aérodrome de Delhi à 395 blocs au-delà de sa marge.
  { nom: 'Yamuna', villes: ['delhi', 'agra'], via: [[87506, 36284], [87526, 36318], [87538, 36450], [87543, 36496], [87543, 36892], [87549, 36938], [87597, 37062], [87603, 37107], [87603, 37335], [87609, 37381], [87651, 37484], [87661, 37527], [87665, 37622], [87688, 37702], [87749, 37797], [87807, 37857], [87851, 37917], [87925, 38066], [87976, 38123], [88007, 38173], [88047, 38250], [88140, 38354], [88156, 38382], [88204, 38486], [88215, 38501], [88257, 38532], [88391, 38578], [88406, 38594], [88412, 38623]] },
  // L'A1 ITALIENNE, SUD (v329), ROME–NAPLES : la seconde moitié de l'Autostrada
  // del Sole. Rome est immense (rayon 216) et ses avenues propres ne sont PAS
  // dans l'axe de Naples (42°) : l'est (−4°, trente-sept blocs sur la rue) est
  // la plus proche. Une sortie à 46° de l'axe et des coudes bornés à 25° : il
  // faut TOURNER EN PLUSIEURS FOIS. La sonde (scratchpad cherche3.mjs) pose
  // après le point du rayon une suite de points qui virent de 24° tous les
  // quarante blocs vers la cible ; sans eux, ses 40 536 tracés étaient tous
  // refusés pour leur coude. Naples par son axe −140° (vingt-cinq blocs).
  // Fiumicino est au NORD de Rome : la route part à l'est, loin de sa marge
  // (358 blocs). Mesuré sous node : 8 115 admissibles, 1 176 sans pont ;
  // celui-ci : 785 blocs, aucun pont, déblai 3,5, remblai 1,2, pente 0,062.
  { nom: 'A1 Sud', villes: ['rome', 'naples'], via: [[11859, 12556], [11897, 12570], [11926, 12598], [11930, 12602], [11933, 12607], [11935, 12612], [11937, 12647], [12009, 12816], [12026, 12875], [12065, 12960], [12130, 13053], [12244, 13168], [12281, 13196], [12363, 13228], [12448, 13289], [12671, 13486], [12732, 13520], [12837, 13577], [12911, 13587], [12957, 13605], [12995, 13631], [13096, 13732], [13124, 13769], [13175, 13862], [13300, 14044]] },
  // L'A4/M1 (v332), VIENNE–BUDAPEST : la plaine du Danube, la plus facile du
  // registre — les deux villes ont une avenue propre presque dans l'axe
  // (Vienne à 4°, trente-quatre blocs sur la rue ; Budapest à −160°, vingt-
  // deux), et le pays est bas. Mesuré sous node (scratchpad cherche3.mjs, qui
  // appelle `profilDe`) : 18 216 tracés, 1 573 admissibles, 547 sans pont ;
  // celui-ci : 966 blocs, aucun pont, déblai 1,9, remblai 1,1, pente 0,061,
  // coudes de 17°, zéro rail, zéro aérodrome à moins de 3 701 blocs.
  { nom: 'M1', villes: ['vienne', 'budapest'], via: [[16304, 1296], [16309, 1297], [16327, 1303], [16346, 1312], [16461, 1405], [16509, 1409], [16676, 1514], [16821, 1565], [16909, 1612], [17098, 1750], [17147, 1777], [17334, 1905], [17391, 1955], [17431, 1976], [17478, 1981], [17732, 2002], [17833, 2040], [17943, 2058], [17972, 2063], [18110, 2074], [18253, 2106], [18329, 2110], [18372, 2122], [18413, 2131], [18543, 2241], [18559, 2251], [18622, 2272], [18678, 2280], [18752, 2305], [18796, 2319], [18984, 2372], [19105, 2473], [19177, 2554], [19205, 2574], [19209, 2577]] },
  // L'A1 ITALIENNE, NORD (v333), MILAN–BOLOGNE : la première moitié de
  // l'Autostrada del Sole, qui rejoint l'Autosole à Bologne. La Frecciarossa
  // sort de Milan à 51° et Bologne est à 34°, à trois cents blocs à GAUCHE du
  // rail : on choisit ce côté et l'on n'en change plus (v320). Milan sort donc
  // à −16° (trente blocs d'avenue, quatorze relevés sur quinze sur la rue),
  // puis la route tourne en plusieurs fois (v329) ; Bologne par son axe −156°
  // (vingt-six blocs). LA SONDE ARRONDIT SES POINTS AVANT DE LES JUGER : mon
  // premier tracé, mesuré en flottants, rendait un remblai de 1,4 ; écrit en
  // blocs entiers dans ce registre, son axe passait sur une mare d'UNE
  // colonne, comblée en buse à 5,3 blocs — au-dessus de la barre de quatre
  // que le témoin de l'A1 applique à toutes les routes. Mesuré sous node
  // (scratchpad cherche.mjs, qui appelle `profilDe` sur les points arrondis) :
  // 5 082 tracés, refus 4 529 coude · 181 remblai · 134 pont près d'une
  // porte · 106 trop de ponts · 76 ponts proches · 25 rail ; trente et un
  // admissibles, sept sans pont ; celui-ci : 969 blocs, aucun pont, déblai
  // 3,6, remblai 1,4, pente 0,062, aucune colonne d'emprise sur le rail.
  { nom: 'A1 Nord', villes: ['milan', 'bologne'], via: [[7864, 6293], [7906, 6335], [7954, 6391], [8257, 6668], [8724, 6917], [8808, 6967], [9118, 7119], [9204, 7186], [9257, 7232], [9343, 7257], [9372, 7273], [9389, 7287], [9469, 7409], [9537, 7483], [9582, 7549], [9603, 7594], [9653, 7659], [9812, 7766], [9857, 7787], [10076, 7924], [10149, 7993], [10154, 7995], [10202, 7995]] },
  // L'A24 (v334), BERLIN–HAMBOURG : la plaine de l'Elbe, basse et semée de
  // mares, sans rail ni aérodrome sur l'axe. Hambourg a de l'eau qui touche
  // son disque au nord-est (entre 20° et 50°, l'Alster et ses bras, à r − 10
  // et r + 30) : par là, tout tracé posait un pont dans les quatre-vingts
  // blocs de la porte. On entre donc par l'EST (−8°), où le relief est sec, et
  // la porte se pose à vingt-quatre blocs du bord, là où l'avenue tient seize
  // relevés sur seize sur la rue (à vingt, −8° n'en avait pas : la profondeur
  // de la porte se MESURE, v310). Berlin par −156° (trente-huit blocs). Mesuré
  // sous node (scratchpad cherche.mjs, qui appelle `profilDe` sur les points
  // arrondis, v333) : 2 904 tracés, refus 2 249 coude · 346 remblai · 122 trop
  // de ponts · 103 pont près d'une porte · 50 ponts proches ; trente-quatre
  // admissibles, UN sans pont — celui-ci : 1 317 blocs, déblai 3,9, remblai
  // 1,3, pente 0,061, zéro rail, zéro aérodrome.
  { nom: 'A24', villes: ['berlin', 'hambourg'], via: [[12522, -6401], [12410, -6420], [12337, -6446], [12282, -6474], [12257, -6479], [12217, -6479], [12102, -6460], [11682, -6460], [11637, -6466], [11539, -6506], [11428, -6527], [11361, -6554], [11308, -6585], [11193, -6627], [11011, -6666], [10927, -6710], [10810, -6758], [10719, -6813], [10694, -6841], [10630, -6953], [10602, -6983], [10369, -7146], [10297, -7217], [10207, -7329], [10010, -7473], [9991, -7492], [9928, -7592], [9856, -7652], [9803, -7683], [9674, -7742], [9545, -7832], [9477, -7885], [9447, -7899], [9403, -7910], [9309, -7913], [9260, -7926], [9214, -7946], [9121, -8011], [9060, -8066], [9000, -8096], [8917, -8112], [8864, -8130], [8846, -8145], [8837, -8151], [8832, -8152], [8821, -8152], [8782, -8163]], bord: { hambourg: 24 } },
  // L'I-45 (v336), DALLAS–HOUSTON : la première route des États-Unis. Le
  // pays entre les deux est ondulé — des croupes de dix à quinze blocs tous
  // les quelques centaines de blocs — et Houston est assise au pied d'une
  // butte au nord (44 à 57 blocs à quarante blocs de son bord, pour une ville
  // à 33) : par le nord, tous les tracés creusaient au-delà de neuf blocs. On
  // entre donc par le SUD (88°, trente-six blocs d'avenue sur la rue), après
  // avoir contourné la ville par l'est, en virages de 24° (v329) ; Dallas par
  // l'est (86°, trente-trois blocs). LA SONDE TIRE DES CHEMINS LISSÉS : deux
  // points intermédiaires ne suffisaient pas, le meilleur déblai valait 9,14 ;
  // un point tous les deux cents blocs, à écart borné et virage borné, en a
  // trouvé cinq sur vingt-quatre mille (scratchpad cherche.mjs, MARCHE).
  // Refus : 19 465 déblai au milieu · 1 364 déblai à Houston · 2 667 coude ·
  // 443 remblai. Celui-ci : 2 168 blocs, trois ponts (deux ravins et un
  // ruisseau, à plus de cent quatre-vingts blocs des portes), déblai 7,7,
  // remblai 3,9, pente 0,061, zéro rail, zéro aérodrome.
  { nom: 'I-45', villes: ['dallas', 'houston'], via: [[-86328, 28937], [-86297, 29026], [-86232, 29161], [-86208, 29259], [-86120, 29396], [-86093, 29475], [-86080, 29584], [-86036, 29691], [-86018, 29768], [-85981, 29831], [-85924, 29891], [-85851, 29992], [-85758, 30066], [-85709, 30117], [-85683, 30161], [-85637, 30285], [-85595, 30364], [-85567, 30400], [-85414, 30559], [-85319, 30729], [-85300, 30800], [-85291, 30916], [-85209, 31140], [-85177, 31283], [-85125, 31369], [-85085, 31419], [-85065, 31464], [-85047, 31553], [-85003, 31661], [-84997, 31706], [-84993, 31879], [-84965, 31993], [-84957, 32073], [-84926, 32205], [-84914, 32290], [-84883, 32349], [-84846, 32406], [-84801, 32507], [-84785, 32572], [-84777, 32659], [-84741, 32770], [-84733, 32815], [-84731, 32898], [-84702, 33024], [-84695, 33105], [-84683, 33148], [-84650, 33224], [-84639, 33268], [-84637, 33315], [-84645, 33360], [-84666, 33437], [-84681, 33520], [-84712, 33633], [-84740, 33716], [-84793, 33826], [-84803, 33870], [-84809, 34054], [-84841, 34178], [-84844, 34219], [-84849, 34235], [-84847, 34259], [-84841, 34277], [-84817, 34309], [-84782, 34328], [-84742, 34331], [-84704, 34317], [-84675, 34289], [-84660, 34252]] },
  // L'A7 (v337), LYON–MARSEILLE : l'autoroute du Soleil, le long du Rhône.
  // Le TGV va droit de gare à gare (82°) : la route passe à l'OUEST du rail
  // de bout en bout, sans le croiser (v320). Lyon sort par son axe sud-est
  // (130°, trente-trois blocs d'avenue sur la rue), Marseille par son axe
  // nord-ouest (−136°, quarante-sept). Mesuré sous node (scratchpad
  // cherche.mjs, qui appelle `profilDe` sur les points arrondis) : 2 025
  // tracés, refus 1 554 coude · 154 déblai · 152 remblai · 29 rail · 26 pont
  // dans un coude ; quatre admissibles, tous avec des ponts. Celui-ci :
  // 1 419 blocs, trois ponts sur des vallons (aucun dans un coude), déblai
  // 7,4, remblai 1,4, pente 0,061, zéro colonne sur le rail. Le premier
  // candidat (deux ponts) a été écarté : son entrée à Lyon (50°) n'avait que
  // dix-neuf relevés sur la rue, pour vingt exigés.
  { nom: 'A7', villes: ['lyon', 'marseille'], via: [[2612, 5768], [2605, 5806], [2603, 5825], [2581, 5861], [2564, 5870], [2538, 5878], [2526, 5886], [2467, 5971], [2431, 6027], [2394, 6103], [2344, 6202], [2321, 6299], [2309, 6338], [2304, 6379], [2378, 6556], [2456, 6699], [2491, 6756], [2516, 6824], [2528, 6981], [2599, 7191], [2683, 7330], [2726, 7445], [2773, 7510], [2806, 7598], [2857, 7804], [2861, 7836], [2846, 7930], [2846, 7950], [2876, 8049], [2882, 8094], [2883, 8370], [2904, 8451], [2937, 8522], [2953, 8599], [2952, 8616], [2919, 8758], [2918, 8866], [2924, 8911], [2957, 9011], [2957, 9064], [2924, 9164], [2918, 9210], [2919, 9353], [2925, 9385], [2985, 9577], [3042, 9643], [3051, 9659], [3053, 9680], [3044, 9781], [3045, 9804], [3052, 9823], [3079, 9859], [3210, 9990], [3213, 9993], [3228, 10030]] },
  // L'AP-2 (v338), MADRID–BARCELONE : la plus longue de l'Espagne, le long
  // de l'AVE qui va droit de gare à gare (−14°) ; la route ne le croise
  // jamais. Le pays monte vers la Catalogne : à l'approche de Barcelone, une
  // chaîne à 45–60 blocs entre la ville et la côte, et Barcelone est sous
  // son pays à l'ouest (43 à 47 à r + 10). Elle s'entre par son côté bas,
  // −170° (trente-cinq blocs d'avenue sur la rue) ; Madrid par −28°
  // (trente-quatre). Mesuré sous node (scratchpad cherche.mjs, chemins
  // lissés) : 16 000 tracés, refus 14 646 déblai au milieu · 686 coude · 292
  // aérodrome · 162 remblai · 96 ponts proches ; neuf admissibles, tous à
  // ponts. LE JOINT SE MESURE SUR CHAQUE CANDIDAT : le premier avait une
  // mare qui commence plus tôt sur le bord que sur l'axe, et sept points
  // d'accotement sans rien dessous, 2,5 blocs avant la culée (v300 : une
  // décision prise sur l'axe se vérifie sur toute la largeur). Celui-ci :
  // 2 094 blocs, quatre ponts, joint fermé, déblai 8,8, remblai 3,1, pente
  // 0,062, zéro colonne sur le rail.
  { nom: 'AP-2', villes: ['madrid', 'barcelone'], via: [[-7161, 15119], [-7014, 15054], [-6866, 15006], [-6785, 14969], [-6670, 14942], [-6579, 14910], [-6536, 14894], [-6337, 14891], [-6294, 14880], [-6236, 14846], [-6187, 14804], [-6132, 14778], [-5975, 14766], [-5875, 14732], [-5765, 14707], [-5701, 14674], [-5634, 14648], [-5589, 14640], [-5506, 14638], [-5452, 14623], [-5373, 14582], [-5275, 14557], [-5217, 14523], [-5178, 14488], [-5067, 14408], [-5014, 14362], [-4907, 14302], [-4844, 14252], [-4809, 14234], [-4675, 14195], [-4491, 14120], [-4230, 13981], [-4150, 13958], [-3971, 13954], [-3854, 13919], [-3695, 13854], [-3649, 13848], [-3587, 13858], [-3313, 13964], [-3221, 13987], [-3073, 13993], [-3024, 14006], [-2895, 14048], [-2883, 14049], [-2812, 14031], [-2758, 14003], [-2641, 13967], [-2388, 13867], [-2213, 13827], [-2140, 13816], [-2039, 13782], [-1930, 13772], [-1839, 13745], [-1805, 13726], [-1667, 13682], [-1546, 13626], [-1501, 13620], [-1361, 13621], [-1250, 13596], [-1191, 13562], [-1092, 13550], [-986, 13545], [-849, 13513], [-785, 13507], [-732, 13491], [-722, 13486], [-701, 13467], [-696, 13464], [-674, 13454], [-653, 13454]] },
  // LA 401 (v355), TORONTO–MONTRÉAL : la première route qui CONTOURNE une
  // ville au lieu d'y entrer par le côté qui la regarde. Montréal est sous
  // son pays à l'ouest et au sud-ouest (45 à 49 blocs à r + 25, ville à 33),
  // et la v337 l'avait laissée sans tracé : deux coudes ne tournent pas
  // autour d'un disque. La sonde de la v355 (scratchpad cherche.mjs, mode
  // « couloir ») cherche d'abord le COULOIR LE PLUS BAS (Dijkstra sur une
  // grille de vingt blocs, coût en carré de la hauteur au-dessus de 40, l'eau
  // très chère), puis en tire des points avec du jeu, lisse par Chaikin en
  // gardant les deux tronçons radiaux, simplifie tant que les coudes restent
  // sous 22°, et APPELLE `profilDe` sur chaque candidat. Le couloir passe à
  // l'est de Toronto, remonte au nord de la colline qui la borde à l'est,
  // file à l'est par la plaine (35 à 40) et prend Montréal par le SUD, son
  // axe de trame (88°, avenue de 36 blocs) : le pays y est à 39–42.
  // Toronto s'entre par −18°, son axe est-nord-est (avenue de 94 blocs).
  // 3 000 tracés, refus 2 971 coude · 7 déblai au milieu · 5 remblai ; seize
  // admissibles, deux sans pont. Puis on RETIRE un à un les points dont le
  // tracé se passe sans rien perdre (même sonde, mêmes barres) : 56 → 26.
  // Celui-ci : 2 711 blocs, aucun pont, déblai 6,6, remblai 1,0, pente
  // 0,060, coudes ≤ 24°, zéro colonne sur un rail, aucune colonne d'emprise
  // prise à une autre route (l'A20 sort de Montréal par l'est, à 88° de là).
  { nom: '401', villes: ['toronto', 'montreal'], via: [[-65857, 9313], [-65848, 9307], [-65760, 9275], [-65754, 9276], [-65742, 9277], [-65737, 9275], [-65722, 9267], [-65510, 9114], [-65347, 9043], [-65266, 8993], [-65204, 8966], [-65101, 8866], [-64986, 8807], [-64858, 8757], [-64785, 8719], [-64682, 8663], [-64618, 8645], [-64537, 8637], [-64357, 8594], [-64255, 8552], [-64234, 8550], [-64218, 8552], [-64118, 8584], [-64097, 8586], [-64061, 8578], [-63753, 8424], [-63677, 8362], [-63622, 8336], [-63543, 8322], [-63477, 8295], [-63384, 8230], [-63304, 8162], [-63068, 8050], [-63025, 8008], [-62973, 7905], [-62920, 7844], [-62810, 7780], [-62736, 7727], [-62677, 7669], [-62574, 7531], [-62497, 7457], [-62454, 7431], [-62366, 7413], [-62270, 7381], [-62190, 7343], [-62111, 7275], [-62013, 7206], [-61954, 7176], [-61786, 7131], [-61710, 7126], [-61653, 7104], [-61532, 7021], [-61417, 6952], [-61361, 6927], [-61312, 6914], [-61156, 6913], [-61090, 6900], [-60985, 6849], [-60940, 6841], [-60833, 6839], [-60742, 6812], [-60682, 6784], [-60596, 6774], [-60516, 6762], [-60471, 6745], [-60413, 6707], [-60387, 6669], [-60320, 6629], [-60180, 6561], [-60043, 6472], [-60000, 6460], [-59911, 6443], [-59857, 6415], [-59759, 6346], [-59677, 6269], [-59537, 6172], [-59526, 6169], [-59503, 6175]] },
  // LA HANSALINIE (v355), COLOGNE–HAMBOURG : l'A1 allemande, rebaptisée de
  // son surnom parce que « A1 » est déjà Paris–Lille. Les deux villes sont
  // sous leur pays du côté qui regarde l'autre, et la v337 avait buté sur
  // 20 000 chemins lissés (déblai 10,1 au mieux pour neuf). Les portes
  // étaient fermées une à une : à Cologne, l'aérodrome de Francfort à 176
  // blocs à l'est, l'A3 au sud, l'ICE d'Amsterdam qui sort vers −130° ; à
  // Hambourg, l'A24 à l'est (−8°), l'Elbe qui longe le sud du disque entre 38
  // et 70 blocs du centre (toute entrée par le sud franchissait le fleuve dans
  // le raccord), et l'Alster au nord : la porte de l'axe nord (−106°) tombait
  // au bout d'un pont de la ville, et le TALUS de la route en creusait le
  // tablier — six points sans sol, rouges au témoin des ponts de villes. La
  // sonde de la 401, au cap, rails et autres routes INTERDITS dans la grille,
  // a donc pris Cologne par son axe nord-nord-ouest (−104°, entre l'ICE et
  // l'aérodrome), filé au nord-est par les vallons, et CONTOURNÉ Hambourg par
  // l'ouest pour y entrer par le nord-ouest (−134°, avenue de 29 blocs).
  // 1 500 tracés, refus 439 entrée · 325 déblai au milieu · 163 remblai · 127
  // coude · 49 ponts proches ; 397 admissibles, puis les points superflus
  // retirés un à un par la même sonde (72 → 25). Celui-ci : 2 387 blocs,
  // aucun pont, déblai 5,4, remblai 1,4, pente 0,060, coudes ≤ 22°, zéro
  // colonne sur un rail ni sur un pont de ville, aucune prise à une autre
  // route.
  { nom: 'Hansalinie', villes: ['cologne', 'hambourg'], via: [[5197, -3576], [5203, -3583], [5257, -3615], [5397, -3708], [5434, -3736], [5565, -3867], [5593, -3903], [5634, -4012], [5716, -4164], [5819, -4320], [5907, -4432], [6001, -4513], [6065, -4611], [6106, -4696], [6112, -4741], [6112, -4885], [6120, -4930], [6154, -5000], [6191, -5057], [6274, -5285], [6347, -5400], [6467, -5605], [6478, -5641], [6601, -5861], [6642, -5908], [6667, -5994], [6693, -6037], [6819, -6163], [6939, -6250], [7144, -6451], [7241, -6521], [7259, -6540], [7337, -6658], [7407, -6734], [7490, -6790], [7715, -7053], [7804, -7115], [7894, -7264], [8085, -7455], [8113, -7491], [8167, -7589], [8225, -7655], [8305, -7778], [8492, -7970], [8521, -8006], [8597, -8191], [8601, -8218], [8604, -8223], [8608, -8227], [8612, -8230], [8617, -8231], [8628, -8228]] },
  // L'I-95 (v362), NEW YORK–BOSTON : la première route qui touche MANHATTAN,
  // et Manhattan n'est pas un disque. C'est un RECTANGLE de 480 × 2 300 blocs
  // (`BORNES`, manhattan-plan.js) — l'île au milieu, l'Hudson et l'East River
  // dedans, à l'ouest et à l'est — et non le disque de 152 du registre :
  // `porte()` (r − 20 sur le rayon) aurait posé la porte SUR l'île, et le
  // raccord aurait écrit son remblai dans ses rues. La porte de New York est
  // donc DÉCLARÉE (`portes`), sur la rive est, hors du rectangle — la tête du
  // Triborough. Deux raisons la tiennent hors de l'île, et elles sont
  // d'architecture, pas de goût : le profil d'une route se lit sur le relief
  // du monde qui la bâtit, et le worker de maillage (un `World`) ne connaît
  // pas le plan de Manhattan que le fil principal (`TerreUrbaine`) y lit — un
  // seul point du profil dans le rectangle donnerait deux routes différentes
  // aux deux fils ; et les morceaux du rectangle sans bloc posé ne passent
  // pas par le mailleur ordinaire (le rendu urbain les dessine), si bien
  // qu'un tablier y serait invisible. La route s'arrête donc à la rive, en
  // face de l'île (dette déclarée : le pont lui-même). Elle part vers l'est,
  // à trente-six blocs du rectangle (la portée d'un talus est de vingt-trois),
  // puis rejoint Boston par son axe sud-ouest (145°, avenue de trente blocs
  // sur la rue). Mesuré sous node (scratchpad ny/cherche-bos.mjs, qui appelle
  // `profilDe`) : 12 000 tracés, refus 10 551 coude · 4 590 pont près d'une
  // porte · 2 334 remblai · 1 940 ponts proches · 119 ville ; quatre-vingt-six
  // admissibles, tous à un pont au moins ; celui-ci : 390 blocs, un pont
  // (s 152–160, un ruisseau), coudes ≤ 18°, déblai 1,5, remblai 1,7, JFK à
  // 512 blocs au-delà de sa marge, le premier repère à 526.
  { nom: 'I-95', villes: ['ny', 'boston'], portes: { ny: [-59382, 13805] }, via: [[-59328, 13800], [-59323, 13799], [-59309, 13789], [-59286, 13767], [-59201, 13615], [-59174, 13560], [-59060, 13384], [-59056, 13380], [-58920, 13272], [-58848, 13200], [-58761, 13080], [-58657, 12973], [-58570, 12853], [-58470, 12685], [-58383, 12612], [-58289, 12506], [-58252, 12415], [-58223, 12373], [-58109, 12258], [-58037, 12163], [-57942, 12077], [-57809, 11883], [-57767, 11849], [-57657, 11767]] },
  // L'I-95 SUD (v367) : New York–Washington. Deux villes qui ne sont pas des
  // disques. À New York, la porte de l'I-95 regarde le nord-est : celle-ci est
  // une SECONDE porte déclarée, sur la rive de l'Hudson, trente-six blocs à
  // l'ouest du rectangle (la rive à trente-huit blocs vers l'île). Washington
  // est une BOÎTE (`BOITE`, washington.js) dans un disque de 187, et le relevé
  // l'a fermée de trois côtés : au nord la montagne (plus de cinquante blocs),
  // à l'est une crête de 43 à 49 qui commence à six blocs de la boîte — une
  // route épinglée au niveau de la ville y monte d'un bloc en seize et ne peut
  // pas déblayer douze blocs (DEBLAI_MAX 9) —, à l'ouest le Potomac DANS la
  // boîte. Le seul côté bas est le sud, et ce qui touche le bord sud, ce sont
  // les rues d'Anacostia (la vraie I-295 y passe) : la porte est sous la rue de
  // u = 37, un bloc hors de la boîte, au niveau de la rue (`boutNet` : pas de
  // demi-cercle d'asphalte dans la ville), et la route en sort plein sud puis
  // tourne vers l'est sur un arc de soixante blocs de rayon, entre la boîte et
  // la marge de la base d'Andrews. Ce quartier n'a pas de pont sur l'Anacostia :
  // les voitures entrent par sa rue et y font demi-tour (`avenues`), la rue
  // nommée la plus proche est de l'autre côté de l'eau (dette déclarée).
  // Mesuré sous node (scratchpad nydc.mjs, couloir le plus bas avec cap sur
  // une grille de dix blocs, puis cand.mjs, qui appelle `profilDe`) : 2 500
  // tracés, refus 2 392 coude · 44 remblai · 22 ponts proches · 21 pont près
  // d'une porte ; vingt et un admissibles, aucun sans pont ; celui-ci : 1 560
  // blocs, un pont (s 1 048–1 070), coudes ≤ 21°, déblai 7,0 (5,5 avant que le
  // bout ne descende au niveau de la rue), remblai 1,1.
  { nom: 'I-95 Sud', villes: ['ny', 'washington'], portes: { ny: [-59932, 14789], washington: [-63167, 17998] }, boutNet: ['washington'],
    // La grille de la v370 (pas de 28) n'a plus de rue en u = 37, v = 73 :
    // l'avenue s'arrête sur la rue de la grille v = 84, au bout de la
    // bretelle de l'I-295 que pose `washington.js`.
    avenues: { washington: [[-63167, 17998], [-63167, 17997], [-63167, 17985], [-63148, 17985], [-63148, 17939], [-63158, 17933], [-63174, 17923], [-63184, 17917]] },
    via: [[-59978, 14789], [-59983, 14790], [-60122, 14847], [-60161, 14895], [-60164, 14918], [-60202, 14972], [-60211, 15054], [-60320, 15223], [-60417, 15357], [-60451, 15384], [-60506, 15487], [-60655, 15681], [-60720, 15754], [-60809, 15849], [-61042, 16011], [-61064, 16037], [-61137, 16151], [-61261, 16279], [-61303, 16328], [-61336, 16357], [-61373, 16366], [-61560, 16443], [-61627, 16465], [-61706, 16545], [-61809, 16694], [-61926, 16937], [-62012, 17046], [-62029, 17060], [-62077, 17089], [-62140, 17111], [-62230, 17154], [-62347, 17247], [-62417, 17281], [-62488, 17327], [-62534, 17372], [-62591, 17466], [-62611, 17488], [-62669, 17528], [-62699, 17564], [-62743, 17654], [-62770, 17690], [-62883, 17806], [-62925, 17872], [-62975, 17967], [-62995, 17990], [-63026, 18006], [-63038, 18008], [-63088, 18012]] },
  // LE TŌMEI (v381), TOKYO–NAGOYA, le long de la côte du Tōkaidō. Le relevé de
  // la v310 le disait : « un aérodrome sur l'axe ». C'est pire : à l'ouest de
  // Tokyo, Haneda (r 76) et Yokota (r 56) ferment la plaine, le Shinkansen
  // part de Tokyo vers Kyoto à douze blocs de Haneda et TRAVERSE Nagoya, et
  // la montagne (Hakone, au-delà de 48) occupe tout le milieu. Le seul couloir
  // est la bande côtière AU SUD du rail, entre la montagne et la mer : on n'y
  // croise jamais la voie ferrée. Les deux entrées se mesurent du même côté
  // (scratchpad entrees2.mjs, la grandeur du témoin des entrées) : Tokyo par
  // 132°, porte à vingt-quatre blocs du bord (vingt-sept blocs d'avenue propre
  // — à 149°, son autre entrée sud, le raccord passait sur un étang et y
  // posait un pont contre la porte) ; Nagoya par 60°, côté opposé à l'E1
  // (146°). Mesuré sous node (couloir.mjs : couloir le plus bas avec cap sur
  // une grille de vingt blocs, trois pas droits après chaque virage, lissage
  // par moyenne glissante, `profilDe` appelé sur chaque candidat) : 300
  // tracés, refus 254 pont près d'une porte · 16 coude · 8 remblai ; 22
  // admissibles ; celui-ci : 1 140 blocs, UN pont (s 264–271, une crique au
  // sud-ouest de Tokyo), déblai et remblai 1,8, coudes ≤ 25°.
  { nom: 'Tōmei', villes: ['tokyo', 'nagoya'], bord: { tokyo: 24 },
    via: [[160414, 23576], [160386, 23567], [160368, 23567], [160363, 23565], [160349, 23556], [160342, 23548], [160337, 23538], [160331, 23512], [160330, 23503], [160335, 23487], [160340, 23479], [160353, 23466], [160375, 23456], [160396, 23454], [160465, 23466], [160503, 23464], [160599, 23429], [160637, 23427], [160669, 23437], [160737, 23470], [160770, 23510], [160785, 23553], [160801, 23572], [160812, 23611], [160793, 23690], [160753, 23783], [160734, 23802], [160671, 23839], [160438, 23897], [160406, 23896], [160288, 23851], [160268, 23850], [160247, 23854], [160166, 23889], [160117, 23901], [159962, 23905], [159919, 23915], [159791, 23969], [159688, 23995], [159515, 23999], [159470, 24005], [159398, 24034], [159195, 24139], [159107, 24201], [159058, 24243], [158977, 24292], [158846, 24354], [158765, 24403], [158711, 24447], [158632, 24489], [158387, 24548], [158293, 24553], [158249, 24564], [158117, 24650], [158047, 24684], [157991, 24695], [157800, 24697], [157664, 24726], [157643, 24724], [157530, 24678], [157429, 24661], [157379, 24639], [157353, 24617], [157348, 24614], [157344, 24614], [157324, 24603], [157295, 24569]] },
  // LA M40 (v415), LONDRES–BIRMINGHAM. L'axe direct est barré par une crête
  // de 46 à 55 blocs, nord-sud, de z −2 110 à z −1 430 ; au sud elle vient
  // mourir dans la marge de Heathrow, à l'ouest de Londres un mur de 43 à 50
  // borde le disque à cinq blocs. Le relevé en couronne (scratchpad ring.mjs,
  // carte.mjs) montre le seul passage : un COL à 41-46 vers z −1 945, à la
  // latitude même de Birmingham. On sort donc de Londres par le NORD (−82°,
  // la porte face à King's Cross, où l'entrée rejoint Pentonville Road —
  // `ENTREES_LONDRES`), on monte vers le col en le prenant par l'est, et l'on
  // entre dans Birmingham par l'axe de sa trame (45°, vingt-neuf blocs
  // d'avenue sur la rue). Mesuré sous node (couloir.mjs : couloir le plus bas
  // avec cap sur une grille de dix blocs, trois pas droits après chaque
  // virage, lissage par moyenne glissante, `profilDe` appelé sur chaque
  // candidat ; verif.mjs relit le registre réel) : 480 tracés, refus 288
  // coude · 160 pont près d'une porte · 95 remblai · 64 ponts proches ;
  // soixante-neuf admissibles, aucun sans pont ; celui-ci : 1 168 blocs, deux
  // ponts (s 209–227 et 927–942, joints fermés), déblai 7,5, remblai 2,4,
  // coudes ≤ 21°, aucun rail, aucun repère, Heathrow loin derrière.
  { nom: 'M40', villes: ['londres', 'birmingham'],
    via: [[-3087, -4689], [-3077, -4718], [-3077, -4723], [-3080, -4728], [-3158, -4809], [-3251, -4905], [-3316, -5049], [-3342, -5081], [-3410, -5111], [-3484, -5136], [-3654, -5173], [-3749, -5205], [-3816, -5247], [-3897, -5282], [-3943, -5288], [-4086, -5291], [-4156, -5310], [-4170, -5321], [-4217, -5384], [-4305, -5482], [-4390, -5589], [-4653, -5858], [-4690, -5886], [-4815, -5961], [-4906, -6046], [-5013, -6106], [-5105, -6186], [-5127, -6195]] },
  // L'A6 (v419), PARIS–LYON, l'autoroute du Soleil. Le TGV va droit de gare à
  // gare (57,6° depuis Paris) : règle de la v320, on choisit un côté et l'on
  // n'en change plus. À l'EST du rail, un massif de 46 à plus de 60 blocs de
  // z 500 à z 1 300 (scratchpad carte.mjs) ; à l'OUEST, une plaine de 30 à
  // 38. La route passe donc à l'ouest, et y reste. À Paris, l'anneau du fondu
  // monte à 41-43 blocs juste au bord du disque entre 65° et 80° (ring.mjs) :
  // une porte là déblaie neuf blocs à vingt de la ville ; à 86° le bord est à
  // 38. La porte est donc plein sud, la porte d'Italie, et l'entrée déclarée
  // de paris.js mène à la place d'Italie (Gobelins, Arago) au lieu de la Gare
  // du Nord, à l'autre bout de la ville. Lyon par −144° (entrees.mjs : sa
  // trame est tournée de 46,7°, l'avenue proche de l'axe −133° fait
  // trente-quatre blocs et demi de rue, et le TGV, qui arrive par −122°, est
  // à vingt-six blocs de la porte — à −133° il en aurait dix). La plus longue
  // avenue, −147°, a des bancs sur la chaussée à cinq et vingt blocs de la
  // porte (dansav.mjs : les blocs pleins à hauteur de carrosserie) ; −144° et
  // −145° sont propres. Mesuré sous node (couloir.mjs : couloir le plus bas
  // avec cap sur une grille de dix blocs, rail à quarante-trois blocs
  // interdit, trois pas droits après chaque virage, lissage par moyenne
  // glissante, `profilDe` appelé sur chaque candidat, puis le registre réel
  // relu colonne par colonne contre le rail et les autres routes ;
  // elaguer.mjs retire un à un les points qui ne servent pas) : 720 tracés
  // sur quinze couples de portes, refus 194 remblai · 143 ponts proches · 80
  // introuvable (le rail ferme −141°) · 53 pont près d'une porte · 10 coude ;
  // deux cent quatre-vingt-dix-huit admissibles ; celui-ci : 1 774 blocs, UN
  // pont (s 657–660, un ruisseau), déblai 4,1, remblai 1,1, coudes ≤ 21°,
  // aucun rail, aucun repère, aucun aérodrome à moins de sa marge et d'une
  // portée de talus.
  { nom: 'A6', villes: ['paris', 'lyon'],
    via: [[-333, 699], [-336, 732], [-360, 781], [-364, 798], [-363, 806], [-359, 810], [-356, 821], [-348, 848], [-303, 939], [-204, 1051], [-135, 1160], [-67, 1272], [-42, 1315], [12, 1455], [51, 1522], [74, 1591], [109, 1665], [144, 1755], [165, 1809], [246, 1934], [333, 2054], [369, 2104], [441, 2183], [523, 2269], [555, 2306], [642, 2389], [672, 2446], [715, 2512], [762, 2679], [839, 2815], [845, 2837], [847, 2859], [840, 2897], [794, 3034], [769, 3138], [765, 3172], [771, 3211], [817, 3325], [825, 3369], [827, 3440], [871, 3596], [874, 3763], [885, 3806], [920, 3864], [957, 3902], [1041, 4018], [1162, 4110], [1209, 4155], [1290, 4278], [1361, 4356], [1431, 4463], [1528, 4543], [1556, 4584], [1631, 4745], [1681, 4796], [1709, 4814], [1861, 4883], [2012, 4994], [2164, 5147], [2190, 5190], [2227, 5319], [2282, 5404], [2298, 5418], [2514, 5559], [2528, 5577], [2530, 5582], [2531, 5587], [2532, 5591], [2597, 5651]] },
  // L'A8 (v428), MARSEILLE–NICE, la Provençale. L'axe direct est en mer
  // (401 blocs d'eau sur 596) : la route passe par l'intérieur, et le relevé
  // en couronne (scratchpad ring.mjs) ferme Marseille de presque tous les
  // côtés — la ville est à 33, son est et son nord-est montent à 46-50 dès
  // vingt blocs du disque (« une ville assise sous son pays ne s'entre que
  // par son côté bas », v311), et un massif de plus de 46 blocs s'étend de
  // x 980 à 1 220 au nord-est. Le côté bas est le nord, entre le TGV (qui
  // arrive par −98°) et ce massif : la porte est à −78°, quatorze blocs sous
  // le bord (`bord`, dix-sept blocs et demi d'avenue sur la rue,
  // entrees.mjs), la route monte au nord le long du massif, le contourne par
  // le col de 42-46 vers z 3 150, puis redescend dans la plaine jusqu'à
  // Nice. Nice est bâtie à la main : la porte est plein ouest (182°), et
  // l'entrée déclarée de nice.js mène au carrefour de la Californie et de
  // René-Cassin. Mesuré sous node (couloir.mjs, la sonde de l'A6, plus une
  // RAMPE : une case qui dépasse ce que 0,06 par bloc permet depuis la porte
  // coûte au carré — sans elle, cent pour cent des tracés déblayaient trop
  // au pied de Marseille, le défaut de la recherche de la v329) : 1 080
  // tracés sur vingt-cinq couples de portes et de bords, refus 708 déblai ·
  // 601 remblai · 272 ponts proches · 60 rail · 2 coude · 1 pont près d'une
  // porte ; quatre-vingt-quatre admissibles. La porte à −82°, la meilleure
  // de la sonde, passait le TGV dans le talus : relu au vrai `routeEn`, ses
  // colonnes touchaient la gare de Marseille. Celui-ci : 829 blocs, trois
  // ponts (s 259–263, 307–323, 404–416), déblai 7,5, remblai 0,6, pente
  // 0,064, coudes ≤ 22°, aucune colonne sur le rail, aucun repère. Le
  // sommet (1108, 3212) remplace (1111, 3208) : celui-ci tombait à s 308,5,
  // un bloc et demi avant le deuxième pont, et le coin de son coude laissait
  // deux points du joint sans cube ni tablier (le témoin du joint, plafond.js).
  { nom: 'A8', villes: ['marseille', 'nice'], bord: { marseille: 14 },
    via: [[3318, 9941], [3319, 9924], [3342, 9871], [3342, 9865], [3342, 9853], [3344, 9848], [3353, 9833], [3361, 9826], [3409, 9806], [3470, 9800], [3586, 9799], [3646, 9785], [3811, 9706], [3961, 9648], [4126, 9524], [4231, 9460], [4297, 9430], [4340, 9418], [4421, 9411], [4547, 9382], [4666, 9381], [4804, 9423], [4868, 9429], [4971, 9451], [5027, 9449], [5048, 9442], [5175, 9357], [5224, 9335], [5235, 9334], [5258, 9336], [5263, 9337], [5267, 9340], [5290, 9343], [5327, 9340]] },
  // L'US-101 (v439), SAN FRANCISCO–LOS ANGELES. L'axe direct (2 403 blocs)
  // passe dans la marge de SFO et sur deux repères. San Francisco est une
  // presqu'île : la baie à l'est DANS le disque, le Pacifique à l'ouest, et au
  // sud SFO (−38 774, 7 120) avec, à l'ouest de l'aérodrome, des collines de
  // 46 à 55 et des étangs (carte.mjs, ring.mjs du scratchpad). Le seul
  // passage est AU NORD de SFO : la porte est au sud-est de la ville (68°),
  // sur la terre ferme au bout de la baie, et l'entrée déclarée de
  // sanfrancisco.js mène au bout de Third Street. La route longe ensuite, à l'est de
  // l'aérodrome, une bande de 38 à 41 blocs, passe le col de la chaîne
  // côtière vers z 7 500, descend la plaine côtière (33 à 41) jusqu'au
  // sud-ouest, et entre dans Los Angeles par l'OUEST (180°, quarante blocs
  // sous le bord : à −128°, la plus longue avenue, le pays monte à 47 au nord
  // de la ville et la route y déblaie plus de neuf blocs ; plein ouest, vingt-
  // trois blocs et demi d'avenue sur la rue, entrees.mjs). Mesuré sous node
  // (couloir.mjs : couloir le plus bas avec cap sur une grille de dix blocs,
  // la RAMPE de l'A8, l'eau interdite à moins de quarante blocs des portes,
  // les collines à l'ouest de SFO exclues ; puis affiner.mjs, qui déplace un
  // point de passage à la fois sous les contraintes des témoins, et
  // verif.mjs, qui relit le registre réel colonne par colonne) : 2 618 blocs,
  // cinq ponts (s 69–77, 394–408, 972–979, 1 259–1 267, 1 509–1 525, joints
  // fermés), déblai 7,2, remblai 3,3, coudes ≤ 22°, aucune colonne sur un
  // rail, un repère ou une autre route, l'axe à trente-cinq blocs au moins
  // de la marge de tout aérodrome.
  { nom: 'US-101', villes: ['sf', 'losangeles'], bord: { losangeles: 40 },
    via: [[-116245, 20120], [-116240, 20128], [-116233, 20134], [-116213, 20141], [-116207, 20141], [-116201, 20139], [-116156, 20109], [-116147, 20106], [-116146, 20106], [-116131, 20111], [-116101, 20134], [-116078, 20161], [-116066, 20192], [-115984, 20307], [-115959, 20375], [-115943, 20464], [-115891, 20551], [-115856, 20662], [-115823, 20733], [-115810, 20849], [-115769, 20971], [-115595, 21207], [-115500, 21297], [-115350, 21401], [-115313, 21429], [-115279, 21457], [-115207, 21488], [-115092, 21583], [-115042, 21645], [-115007, 21676], [-114957, 21744], [-114835, 21867], [-114727, 21950], [-114682, 22005], [-114663, 22039], [-114615, 22163], [-114568, 22252], [-114514, 22331], [-114424, 22426], [-114387, 22483], [-114355, 22553], [-114310, 22619], [-114265, 22666], [-114143, 22758], [-114131, 22776], [-114115, 22817], [-114109, 22862], [-114108, 23054], [-114097, 23098], [-113998, 23278], [-113930, 23365], [-113876, 23462], [-113795, 23608], [-113775, 23626], [-113622, 23789], [-113595, 23825], [-113523, 23970], [-113494, 24054], [-113475, 24088], [-113416, 24153], [-113326, 24314], [-113263, 24456], [-113227, 24495], [-113181, 24557], [-113121, 24601], [-113078, 24651], [-113041, 24721], [-112944, 24886], [-112885, 24946], [-112730, 25138], [-112672, 25215], [-112637, 25246], [-112559, 25298], [-112477, 25377], [-112387, 25445], [-112373, 25460], [-112304, 25573], [-112237, 25639], [-112101, 25730], [-112075, 25762], [-111907, 26018], [-111789, 26225], [-111668, 26499], [-111652, 26517], [-111630, 26529], [-111594, 26535]] },
  // L'A1 CENTRE (v461), FLORENCE–ROME : le maillon qui manquait à l'Autostrada
  // del Sole — Milan–Bologne (A1 Nord), Bologne–Florence (Autosole) et
  // Rome–Naples (A1 Sud) étaient faites. L'axe direct est celui de la
  // Frecciarossa, droite de gare à gare, et Fiumicino est à son bout, au nord
  // de Rome (boîte de repère de 63). On choisit un côté et l'on n'en change
  // plus (v320) : l'EST, parce qu'à l'ouest c'est la mer dès z 3 360. Le
  // relevé (carte.mjs du scratchpad) montre un massif de 44 à plus de 48 blocs
  // en travers, de x 3 240 à 3 800 entre z 3 600 et 3 800 ; la route le
  // contourne par l'est (36 à 44), puis descend la plaine au nord de Rome à
  // l'est de l'aérodrome. Rome par −66° (dix-huit blocs et demi d'avenue sur
  // la rue). Mesuré sous node (couloir.mjs : couloir le plus bas avec cap sur
  // une grille de dix blocs, rails, aérodromes, repères et autres routes dans
  // la grille, la RAMPE de l'A8 ; puis moyenne glissante et réparation des
  // coudes, `profilDe` APPELÉ sur chaque candidat) : 144 tracés, 39
  // admissibles, tous sortant de Florence par 32°. MAIS LA TABLE DES RACCORDS
  // L'A REFUSÉE : à 32° comme à 34°, 50°, 54° et 120°, l'avenue d'entrée roule
  // dans la voie d'un anneau dès la porte (`finAvantAnneaux` rend 0, la
  // règle de la v442), alors qu'à 0°, −10°, 80° et 90° elle ne touche rien —
  // 80° et 90° sont contre le rail. Et plein est (0°), le TALUS de la route
  // au bout de la porte descendait sur la culée d'un pont de la ville, au bord
  // de l'Arno (dix-huit pas de tablier sans sol, le témoin des ponts de
  // villes). Florence sort donc à −10° (quarante blocs d'avenue, quinze blocs
  // au nord de ce pont) et tourne de 16° en trois fois vers le tracé de 32°
  // (la règle de la v329, tourner en plusieurs fois). Relu sur le registre
  // réel (verif.mjs, joint.mjs, tab.mjs, sonde-ponts-eau.cjs,
  // sonde-rue-dense.cjs) : 1 217 blocs, trois ponts (s 135–157, 187–196,
  // 217–229 : l'eau à l'est de Florence, joints fermés), déblai 2,2, remblai
  // 1,9, coudes ≤ 21°, zéro colonne d'emprise sur un rail, un repère ou une
  // autre route, aucun tablier de ville creusé, l'axe à 83 blocs au moins du
  // rail et à 98 au-delà de la marge de Fiumicino.
  { nom: 'A1 Centre', villes: ['florence', 'rome'],
    via: [[10263, 9237], [10303, 9239], [10340, 9257], [10344, 9259], [10349, 9267], [10497, 9512], [10576, 9667], [10630, 9747], [10702, 9825], [10768, 9942], [10905, 10119], [10963, 10179], [11100, 10356], [11118, 10391], [11190, 10661], [11306, 10847], [11359, 10987], [11442, 11121], [11454, 11169], [11459, 11299], [11517, 11533], [11586, 11673], [11607, 11736], [11635, 11857], [11641, 11920], [11653, 11967], [11701, 12067], [11755, 12227], [11754, 12268], [11741, 12340]] },
];

// --- la section -----------------------------------------------------------------
//
// Une route à deux fois deux voies, dimensionnée sur la VOITURE (2,26 blocs de
// large, `DEMI_LARG_VOITURE` de vehicules.js) et non sur la projection : c'est
// la section `highway` du cahier de Max (`roadSection`, `unitsPerMeter` = 1 —
// le joueur fait 1,8 bloc, une voiture 4,4 : un bloc vaut un mètre à l'échelle
// de ce qui roule). Voie 3,5 ; deux voies par sens ; un terre-plein d'un bloc ;
// un accotement d'un bloc de chaque côté. Dix-sept blocs d'emprise, contre
// neuf pour la voie ferrée double.
export const VOIE = 3.5;
export const VOIES_PAR_SENS = 2;
export const TERRE_PLEIN = 1;
export const ACCOTEMENT = 1;
export const DEMI_CHAUSSEE = VOIE * VOIES_PAR_SENS;                      // 7 : un sens
export const DEMI_EMPRISE = TERRE_PLEIN / 2 + DEMI_CHAUSSEE + ACCOTEMENT; // 8,5
// En ville la route devient une avenue : sur les derniers `RACCORD` blocs de
// chaque bout, la section se resserre jusqu'à `DEMI_VILLE` — la demi-chaussée
// d'un boulevard à double sens (5,6 blocs, v271, v294).
export const DEMI_VILLE = 2.8;
export const RACCORD = 40;
// Le corridor entre DANS le disque de la ville jusqu'à `BORD_VILLE` du bord :
// c'est la largeur du raccord de relief d'une ville à sa campagne (vingt blocs,
// la même que les aérodromes), et le profil s'y épingle sur le sol de la ville,
// qui est plat. Mesuré à Paris : de 42 à la porte à 34 seize blocs plus loin.
export const BORD_VILLE = 20;

// --- le profil -------------------------------------------------------------------
//
// Six pour cent : la cible du cahier pour une route principale, mesurée
// praticable sur Paris–Lille (pente max 0,063 bouts épinglés, remblai 5,5 au
// pire, déblai 7,2). Le filtre en cône de `trains.js` garantit la pente par
// construction ; puis les deux bouts s'ÉPINGLENT sur le sol des portes par une
// rampe linéaire, qui ajoute au plus |écart| / longueur de pente — un
// centième sur huit cents blocs.
export const PENTE = 0.06;
// Au-delà de `VIADUC` blocs de remblai, ou sur l'eau, le remblai devient un
// PONT : tablier au profil, piles, et le sol dessous reste le sol. Un déblai
// se creuse jusqu'à `DEBLAI_MAX` — au-delà ce serait un tunnel, et aucun
// corridor n'en a besoin (mesuré : 7,2 au pire).
export const VIADUC = 4;
export const DEBLAI_MAX = 9;
// La pente du talus, par bloc d'écart à l'axe : 0,7 et non 1, parce que les
// quatre coins d'une cellule de surface s'écartent de l'axe de |fx| + |fz|
// blocs entre eux — jusqu'à √2 sur une route à 45° — et qu'à un bloc par bloc
// la cellule dépassait `MARCHE_MAX` et rendait la main au voxel. Mesuré sur le
// premier jet : 270 cellules de talus sur 3 705 refusées à 0,8, aucune à 0,7.
export const TALUS_PENTE = 0.7;
export const PILE_PAS = 8;          // une paire de piles tous les huit blocs
export const NIVEAU_EAU = 30;       // `WATER_LEVEL` : l'importer de world.js ferait un cycle

let SOL = null;
const PROFILS = new Map();
export function brancherSol(fn) { SOL = fn; PROFILS.clear(); }

// --- les segments ---------------------------------------------------------------

// LA PORTE D'UNE VILLE : sur le rayon qui vise le premier point de passage,
// à `bord` blocs sous le bord du disque. Une ville qui n'est pas un disque
// (Manhattan, v362) a sa porte DÉCLARÉE dans la fiche de la route
// (`portes: { cle: [x, z] }`, en blocs du monde, mesurée) — la règle du
// disque la poserait au mauvais endroit.
function porte(C, vers, bord = BORD_VILLE) {
  const vx = vers[0] - C.x, vz = vers[1] - C.z, l = Math.hypot(vx, vz) || 1;
  const r = C.r - bord;
  return [C.x + vx / l * r, C.z + vz / l * r];
}

let SEGMENTS = null;
export function segmentsDeRoute() {
  if (SEGMENTS) return SEGMENTS;
  SEGMENTS = [];
  for (const route of ROUTES) {
    for (let i = 0; i < route.villes.length - 1; i++) {
      const A = positionDe(route.villes[i]), B = positionDe(route.villes[i + 1]);
      const via = i === 0 ? route.via || [] : [];
      const bord = route.bord || {};
      const portes = route.portes || {};
      const pA = portes[route.villes[i]] || porte(A, via[0] || [B.x, B.z], bord[route.villes[i]]);
      const pB = portes[route.villes[i + 1]] || porte(B, via[via.length - 1] || [A.x, A.z], bord[route.villes[i + 1]]);
      const pts = [pA, ...via, pB];
      const cumul = [0];
      for (let k = 1; k < pts.length; k++) cumul.push(cumul[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      SEGMENTS.push({ route, de: route.villes[i], vers: route.villes[i + 1], pts, cumul, longueur: cumul[cumul.length - 1] });
    }
  }
  return SEGMENTS;
}

// L'index spatial, bloc par bloc le long de l'axe (leçon de l'ICE, v242 : un
// échantillon tous les 256 blocs rate une case dont on coupe le coin).
const CASE = 512;
let INDEX = null;
function indexer() {
  INDEX = new Map();
  for (const s of segmentsDeRoute()) {
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [x0, z0] = s.pts[k], [x1, z1] = s.pts[k + 1];
      const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0)) + 1;
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
        const m = DEMI_EMPRISE + DEBLAI_MAX / TALUS_PENTE + 2;
        for (let cx = Math.floor((x - m) / CASE); cx <= Math.floor((x + m) / CASE); cx++) {
          for (let cz = Math.floor((z - m) / CASE); cz <= Math.floor((z + m) / CASE); cz++) {
            const cle = cx * 100000 + cz;
            let liste = INDEX.get(cle);
            if (!liste) INDEX.set(cle, liste = []);
            if (!liste.includes(s)) liste.push(s);
          }
        }
      }
    }
  }
}
const RIEN = [];
const pres = (x, z) => {
  if (!INDEX) indexer();
  return INDEX.get(Math.floor(x / CASE) * 100000 + Math.floor(z / CASE)) || RIEN;
};

// La projection d'un point sur l'axe : l'abscisse `s` le long de la polyligne,
// l'écart SIGNÉ `d` (positif à droite du sens de marche, la droite valant
// (−fz, fx) — la convention de la conduite à droite, v271), et la direction.
export function projeter(seg, x, z) {
  let best = null;
  for (let k = 0; k + 1 < seg.pts.length; k++) {
    const [x0, z0] = seg.pts[k], [x1, z1] = seg.pts[k + 1];
    const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz || 1, l = Math.sqrt(l2);
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / l2));
    const px = x0 + dx * t, pz = z0 + dz * t;
    const fx = dx / l, fz = dz / l;
    const d = (x - px) * (-fz) + (z - pz) * fx;
    const dist = Math.hypot(x - px, z - pz);
    if (!best || dist < best.dist) best = { dist, d, s: seg.cumul[k] + l * t, fx, fz, px, pz };
  }
  return best;
}

// Le point de l'axe à l'abscisse `s`.
export function pointA(seg, s) {
  s = Math.max(0, Math.min(seg.longueur, s));
  let k = 0;
  while (k + 2 < seg.pts.length && seg.cumul[k + 1] < s) k++;
  const [x0, z0] = seg.pts[k], [x1, z1] = seg.pts[k + 1];
  const l = seg.cumul[k + 1] - seg.cumul[k] || 1, t = (s - seg.cumul[k]) / l;
  return { x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, fx: (x1 - x0) / l, fz: (z1 - z0) / l };
}

// Le profil : une cote par bloc d'abscisse, continue, bouts épinglés au sol
// des portes. Rend aussi le terrain sous l'axe (pour les ouvrages).
export function profilDe(seg) {
  let p = PROFILS.get(seg);
  if (p) return p;
  if (!SOL) return null;
  const n = Math.max(2, Math.round(seg.longueur));
  const terr = new Float64Array(n + 1), base = new Float64Array(n + 1);
  for (let k = 0; k <= n; k++) {
    const q = pointA(seg, k * seg.longueur / n);
    const h = SOL(Math.round(q.x), Math.round(q.z));
    terr[k] = h + 1;
    base[k] = Math.max(h, NIVEAU_EAU) + 1;   // jamais sous les flots
  }
  const bas = Float64Array.from(base), haut = Float64Array.from(base);
  for (let k = 1; k <= n; k++) bas[k] = Math.min(bas[k], bas[k - 1] + PENTE);
  for (let k = n - 1; k >= 0; k--) bas[k] = Math.min(bas[k], bas[k + 1] + PENTE);
  for (let k = 1; k <= n; k++) haut[k] = Math.max(haut[k], haut[k - 1] - PENTE);
  for (let k = n - 1; k >= 0; k--) haut[k] = Math.max(haut[k], haut[k + 1] - PENTE);
  const cote = new Float64Array(n + 1);
  for (let k = 0; k <= n; k++) cote[k] = (bas[k] + haut[k]) / 2;
  const d0 = terr[0] - cote[0], d1 = terr[n] - cote[n];
  for (let k = 0; k <= n; k++) cote[k] += d0 * (1 - k / n) + d1 * (k / n);
  // ET JAMAIS SOUS LES FLOTS, MÊME APRÈS L'ÉPINGLAGE : la rampe qui ramène
  // les bouts au sol des portes peut abaisser tout le profil de quelques
  // dixièmes, et une chaussée en déblai au bord d'un lac passait à 30 — la
  // nappe se posait dessus (mesuré : huit colonnes de chaussée sous l'eau à
  // l'approche du pont).
  for (let k = 0; k <= n; k++) if (cote[k] < NIVEAU_EAU + 1) cote[k] = NIVEAU_EAU + 1;
  // LES OUVRAGES : là où le remblai dépasse `VIADUC`, ou sur l'eau, un pont.
  // Une seule colonne d'eau isolée se remblaie (une buse), pas un pont.
  const ouvrage = new Uint8Array(n + 1);
  for (let k = 0; k <= n; k++) if (cote[k] - terr[k] > VIADUC || terr[k] - 1 < NIVEAU_EAU) ouvrage[k] = 1;
  for (let k = 0; k <= n; k++) {
    if (!ouvrage[k]) continue;
    let j = k; while (j + 1 <= n && ouvrage[j + 1]) j++;
    if (j - k + 1 < 3) for (let i = k; i <= j; i++) ouvrage[i] = 0;
    k = j;
  }
  const spans = [];
  for (let k = 0; k <= n; k++) {
    if (!ouvrage[k]) continue;
    let j = k; while (j + 1 <= n && ouvrage[j + 1]) j++;
    spans.push({ s0: k * seg.longueur / n, s1: j * seg.longueur / n });
    k = j;
  }
  p = { n, cote, terr, ouvrage, spans, pas: seg.longueur / n };
  PROFILS.set(seg, p);
  return p;
}

export function coteA(seg, s) {
  const p = profilDe(seg);
  if (!p) return null;
  const q = Math.max(0, Math.min(p.n, s / p.pas));
  const k = Math.min(p.n - 1, Math.floor(q));
  return p.cote[k] + (p.cote[k + 1] - p.cote[k]) * (q - k);
}

function ouvrageA(seg, s) {
  const p = profilDe(seg);
  if (!p) return false;
  return p.ouvrage[Math.max(0, Math.min(p.n, Math.round(s / p.pas)))] === 1;
}

// Un tablier à moins de `CULEE` pas de cette abscisse (sans en être un).
export const CULEE = 2;
function ouvrageProche(seg, s) {
  for (let k = 1; k <= CULEE; k++) if (ouvrageA(seg, s - k) || ouvrageA(seg, s + k)) return true;
  return false;
}

// La section à l'abscisse `s` : pleine en rase campagne, resserrée sur les
// raccords de ville.
export function largeurA(seg, s) {
  const bout = Math.min(s, seg.longueur - s);
  const f = bout >= RACCORD ? 1 : bout / RACCORD;
  const demiChaussee = DEMI_VILLE + (DEMI_CHAUSSEE - DEMI_VILLE) * f;
  return { demiChaussee, demiEmprise: TERRE_PLEIN / 2 + demiChaussee + ACCOTEMENT, terrePlein: TERRE_PLEIN / 2 * f };
}

// LA ROUTE SOUS CETTE COLONNE, ou null. `world.js` la pose (remblai, déblai,
// piles), `solcontinu.js` en fait la surface et le contact, la carte la
// dessine, les témoins la mesurent — une seule règle, quatre lecteurs.
//
//   piece : 'chaussee' | 'terreplein' | 'accotement' | 'talus' | 'tablier'
//   cote  : la cote CONTINUE de la surface ici (talus : raccordé au terrain)
//   ouvrage : vrai sous un pont — le sol reste le sol, le tablier est un ruban
//   pile  : vrai sur une colonne de pile
const q64 = (v) => Math.round(v * 64) / 64;

// La boîte d'un segment, élargie de tout ce qu'une colonne peut porter de
// route (emprise pleine et talus le plus large, plus un bloc de marge) : un
// point hors d'elle est à plus de cette distance de l'axe, donc `routeEn` ne
// peut rien y rendre — on ne le projette pas (v352). Conservateur par
// construction : la boîte ne retire que des segments qui rendraient null.
const PORTEE_ROUTE = DEMI_EMPRISE + DEBLAI_MAX / TALUS_PENTE + 1;
const BOITES = new WeakMap();
function boiteDe(seg) {
  let b = BOITES.get(seg);
  if (!b) {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of seg.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
    b = { x0: x0 - PORTEE_ROUTE, z0: z0 - PORTEE_ROUTE, x1: x1 + PORTEE_ROUTE, z1: z1 + PORTEE_ROUTE };
    BOITES.set(seg, b);
  }
  return b;
}

export function routeEn(x, z) {
  let best = null;
  for (const seg of pres(x, z)) {
    const b = boiteDe(seg);
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    const pr = projeter(seg, x, z);
    if (best && pr.dist >= best.pr.dist) continue;
    best = { seg, pr };
  }
  if (!best) return null;
  const { seg, pr } = best;
  // LE TALUS LE PLUS LARGE BORNE LA ROUTE (v352). Au-delà de la demi-emprise
  // plus `DEBLAI_MAX / TALUS_PENTE`, aucune pièce ne peut répondre — c'est
  // exactement la borne du talus plus bas (`w` ne la dépasse jamais) — et
  // l'on rendait null APRÈS avoir lu le profil et le terrain de la colonne :
  // l'index par cases de 512 donne la route à toute colonne de la case, et
  // ce `terrainHeight` de trop faisait un cinquième du coût d'un morceau de
  // Paris dans le worker (mesuré, sonde-cout-morceau.mjs). Même réponse, au
  // bit près : le témoin compare les blocs et les tampons.
  if (pr.dist - largeurA(seg, pr.s).demiEmprise >= DEBLAI_MAX / TALUS_PENTE) return null;
  const p = profilDe(seg);
  if (!p) return null;
  const L = largeurA(seg, pr.s);
  // LA DISTANCE, PAS L'ÉCART PERPENDICULAIRE. `d` est l'écart à la DROITE
  // de l'axe, mesuré au point projeté puis borné au tronçon : au-delà d'un
  // bout, un point sur le prolongement de l'axe avait d ≈ 0 et passait pour
  // de la chaussée — le centre de Paris, à 150 blocs de la porte, rendait
  // 112 colonnes « A1 » et 62 cellules de surface dans le morceau du témoin
  // de plafond.js (« dans une ville, rien ne change »). `dist` est la
  // distance au point borné : dans le tronçon elle vaut |d|, au-delà elle
  // compte le dépassement, et un point hors du ruban est refusé.
  const ad = pr.dist;
  // UNE COTE SE RANGE EN SIMPLE PRÉCISION DANS LA GRILLE DU MAILLEUR
  // (`Float32Array`, solcontinu.js) : 34,999999 y devient 35 tout rond, le
  // générateur posait l'herbe à 33 et le mailleur cherchait une tuile à 34,
  // dans l'air — une erreur par morceau de talus, et le contact (double
  // précision) ne lisait plus la triangulation du maillage. Toute cote de
  // route est donc un soixante-quatrième de bloc, exact dans les deux.
  // UNE VILLE QUI N'EST PAS UN DISQUE N'A PAS DE RACCORD (v367). Au bout,
  // la chaussée continue d'ordinaire dans la ville en demi-cercle (la
  // distance au point borné) : c'est l'entrée de la ville. Washington est une
  // BOÎTE bâtie jusqu'à son bord ; ce demi-cercle y écrivait de l'asphalte dans
  // ses rues et ses trottoirs. Un bout déclaré `boutNet` s'arrête net, chaussée
  // comprise, au quart de bloc près (une colonne se lit en son coin dans le
  // générateur, en son milieu dans les témoins).
  if (seg.route.boutNet && (pr.s <= 1e-9 || pr.s >= seg.longueur - 1e-9)) {
    const cle = pr.s <= 1e-9 ? seg.de : seg.vers;
    if (seg.route.boutNet.includes(cle)) {
      const au = (x - pr.px) * pr.fx + (z - pr.pz) * pr.fz;
      if ((pr.s <= 1e-9 ? -au : au) > 0.25) return null;
    }
  }
  const cote = q64(coteA(seg, pr.s));
  const ouvrage = ouvrageA(seg, pr.s);
  if (ouvrage) {
    if (ad > L.demiEmprise) return null;
    const rang = Math.round(pr.s / PILE_PAS) * PILE_PAS;
    const pile = Math.abs(pr.s - rang) < 0.5 && Math.abs(ad - (L.demiChaussee - 1)) < 0.5;
    return { seg, s: pr.s, d: pr.d, cote, piece: 'tablier', ouvrage: true, pile };
  }
  if (ad <= L.terrePlein) return { seg, s: pr.s, d: pr.d, cote, piece: 'terreplein', ouvrage: false };
  if (ad <= L.terrePlein + L.demiChaussee) return { seg, s: pr.s, d: pr.d, cote, piece: 'chaussee', ouvrage: false };
  if (ad <= L.demiEmprise) return { seg, s: pr.s, d: pr.d, cote, piece: 'accotement', ouvrage: false };
  // LE TALUS : de la cote de la route à celle du terrain, un bloc par bloc,
  // aussi large que l'écart. C'est ce qui rend la cellule dessinable (écart
  // d'un bloc au plus par cellule) et le raccord continu.
  // La cote se raccorde au terrain de CETTE colonne : au bout du talus, la
  // surface est le sol naturel, et la couture avec la colonne voisine tient.
  // PAS DE TALUS AU-DELÀ D'UN BOUT (v362). Une route finit à sa porte, sur le
  // sol de la ville où son profil s'épingle : le talus n'a rien à y raccorder.
  // Mais la distance au point borné dessine un CHAPEAU autour de la porte, et
  // là où le sol au-delà n'est pas celui de la porte — un fleuve de ville — ce
  // chapeau creusait : l'A3 descendait à treize blocs au-delà de sa porte de
  // Francfort jusqu'à l'eau, à travers le tablier d'un pont de la ville. Au
  // bout, la chaussée continue dans la ville ; le talus, lui, s'arrête net.
  // Un bloc de jeu, parce qu'une colonne arrondie au ras de la porte dépasse
  // le bout d'un demi-bloc sans être au-delà.
  if (pr.s <= 1e-9 || pr.s >= seg.longueur - 1e-9) {
    const au = (x - pr.px) * pr.fx + (z - pr.pz) * pr.fz;
    if ((pr.s <= 1e-9 ? -au : au) > 1) return null;
  }
  const terr = SOL(x, z) + 1;
  const ecart = cote - terr;
  const w = Math.min(Math.abs(ecart), DEBLAI_MAX) / TALUS_PENTE;
  const u = ad - L.demiEmprise;
  if (u >= w) return null;
  return { seg, s: pr.s, d: pr.d, cote: q64(terr + ecart * (1 - u / w)), piece: 'talus', ouvrage: false };
}

// Pour la carte : la route sous ce pixel ?
export function surLaRoute(x, z) {
  const r = routeEn(x, z);
  return r ? r.piece : null;
}

// --- ce que les autres lisent ------------------------------------------------------

// L'ENTRÉE D'UNE VILLE : le point où le corridor s'arrête dans le disque, en
// coordonnées du MONDE, et la direction dans laquelle il en vient. La ville en
// fait une avenue jusqu'à sa première voie nommée (Paris : la Gare du Nord).
export function entreesDe(cle) {
  const out = [];
  for (const seg of segmentsDeRoute()) {
    if (seg.de === cle) out.push({ x: seg.pts[0][0], z: seg.pts[0][1], route: seg.route.nom, vers: seg.vers });
    if (seg.vers === cle) { const q = seg.pts[seg.pts.length - 1]; out.push({ x: q[0], z: q[1], route: seg.route.nom, vers: seg.de }); }
  }
  return out;
}

// LE TRACÉ ROULANT d'un segment : aller sur la chaussée de droite du sens
// A→B, retour sur l'autre — une boucle fermée, un point par `PAS` blocs, la
// cote CONTINUE du profil (jamais arrondie : c'est là que le train saute).
// `avant` et `apres` prolongent la boucle DANS les villes, par leur avenue
// d'entrée (des points du monde, du bout du corridor vers la ville) ; leur
// cote est celle de la ville, `coteDe(x, z)`, parce qu'en ville le sol est
// voxel et que c'est `coteRoulable` qui sait où l'on roule (v210).
export const PAS = 4;
export function traceRoute(seg, { avant = null, apres = null, coteDe = null } = {}) {
  const p = profilDe(seg);
  const n = Math.max(2, Math.round(seg.longueur / PAS));
  const aller = [], retour = [];
  // en ville, on roule à droite de l'axe de l'avenue, à une demi-chaussée de ville
  const jambe = (pts, sens) => {
    const out = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      const l = Math.hypot(x1 - x0, z1 - z0) || 1, fx = (x1 - x0) / l * sens, fz = (z1 - z0) / l * sens;
      const o = DEMI_VILLE / 2 + 0.3, rx = -fz, rz = fx;
      const m = Math.max(1, Math.round(l / PAS));
      for (let k = (i ? 1 : 0); k <= m; k++) {
        const x = x0 + (x1 - x0) * k / m + rx * o, z = z0 + (z1 - z0) * k / m + rz * o;
        out.push({ x, y: (coteDe ? coteDe(Math.round(x), Math.round(z)) : 0) + 0.05, z });
      }
    }
    return out;
  };
  for (let k = 0; k <= n; k++) {
    const s = k * seg.longueur / n;
    const q = pointA(seg, s), L = largeurA(seg, s);
    const o = L.terrePlein + L.demiChaussee / 2;          // le milieu de la chaussée de ce sens
    const y = (p ? coteA(seg, s) : 0) + 0.05;
    const rx = -q.fz, rz = q.fx;                             // la droite du sens A→B
    // la demi-chaussée sous ce point : la seconde voie la lit (v423)
    aller.push({ x: q.x + rx * o, y, z: q.z + rz * o, dc: L.demiChaussee });
    retour.push({ x: q.x - rx * o, y, z: q.z - rz * o, dc: L.demiChaussee });
  }
  retour.reverse();
  // avant : de la ville A au corridor (sens ville → route), puis l'aller,
  // puis l'entrée de B (corridor → ville), et le retour de chacun
  const entreeA = avant ? [...avant].reverse() : null;   // [bout du corridor, …, ville]  → renversé : ville → corridor
  const entreeB = apres || null;                          // [bout du corridor, …, ville]
  const pts = [];
  if (entreeA) pts.push(...jambe(entreeA, 1));
  pts.push(...aller);
  if (entreeB) { pts.push(...jambe(entreeB, 1)); pts.push(...jambe([...entreeB].reverse(), 1)); }
  pts.push(...retour);
  if (entreeA) pts.push(...jambe([...entreeA].reverse(), 1));
  // DEUX POINTS CONFONDUS FONT UN TRONÇON DE LONGUEUR NULLE, et le parcours
  // (`Parcours.a`) y divise par zéro : au raccord d'une jambe et de la
  // suivante, le dernier point de l'une est le premier de l'autre.
  const propre = [];
  for (const q of pts) { const d = propre.length ? propre[propre.length - 1] : null; if (!d || Math.hypot(q.x - d.x, q.z - d.z) > 0.05) propre.push(q); }
  if (propre.length > 2 && Math.hypot(propre[0].x - propre[propre.length - 1].x, propre[0].z - propre[propre.length - 1].z) <= 0.05) propre.pop();
  return propre;
}

// LES RUBANS d'un morceau : ce que la surface ne peut pas dire par colonne —
// les tabliers des ponts (dessus, dessous, deux parapets) et le marquage au
// sol (une ligne blanche entre les deux voies de chaque sens, une au bord de
// chaque chaussée). Une tuile n'a pas d'orientation ; un trait qui suit un axe
// oblique est de la géométrie (leçon des rails, v281). Chaque quad va de `s`
// à `s + 1` et appartient au morceau où tombe son point d'axe.
//   { x0, z0, x1, z1 : les deux points d'axe ; y0, y1 : cotes ; fx, fz ;
//     o0, o1 : les écarts latéraux ; genre : 'tablier' | 'ligne' ; dy }
export function rubansDans(x0, z0, x1, z1) {
  const out = [];
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, portee = Math.hypot(x1 - x0, z1 - z0) / 2 + DEMI_EMPRISE + 2;
  for (const seg of pres(cx, cz)) {
    const p = profilDe(seg);
    if (!p) continue;
    const pr = projeter(seg, cx, cz);
    if (pr.dist > portee + 1) continue;
    const sA = Math.max(0, Math.floor(pr.s - portee - 2)), sB = Math.min(seg.longueur - 1, Math.ceil(pr.s + portee + 2));
    for (let s = sA; s < sB; s++) {
      const a = pointA(seg, s), b = pointA(seg, s + 1);
      if (a.x < x0 || a.x >= x1 || a.z < z0 || a.z >= z1) continue;
      const L = largeurA(seg, s), ya = coteA(seg, s), yb = coteA(seg, s + 1);
      const base = { seg, s, ax: a.x, az: a.z, bx: b.x, bz: b.z, ya, yb, fx: a.fx, fz: a.fz };
      const pont = ouvrageA(seg, s);
      // LE TABLIER DÉBORDE SUR LA ROUTE À CHAQUE BOUT (v302). Max, capture
      // d'iPad : « trou dans l'autoroute ». La route est OBLIQUE sur la
      // grille : la dernière colonne de chaussée s'arrête en escalier, le
      // tablier commence à un pas d'abscisse droit, et entre les deux restaient
      // des triangles ouverts sur la rivière — mesuré, 464 points de chaussée
      // sur 6 500 aux deux joints du pont sans rien dessous. Le tablier
      // commence donc `CULEE` pas plus tôt et finit `CULEE` pas plus tard,
      // posé un centième au-dessus de la chaussée qu'il recouvre (sinon les
      // deux faces se disputeraient le même plan).
      const culee = !pont && ouvrageProche(seg, s);
      if (pont || culee) {
        const lift = culee ? 0.01 : 0;
        out.push({ ...base, ya: ya + lift, yb: yb + lift, genre: 'tablier', o0: -L.demiEmprise, o1: L.demiEmprise, dy: 0 });
        // UN PONT DANS UN COUDE (v336). Le ruban suit la direction du tronçon
        // où le pas commence : au sommet d'une polyligne, entre la fin d'un
        // tronçon et le début du suivant, le côté EXTÉRIEUR du virage restait
        // un coin ouvert sur le vide — mesuré au premier pont de l'I-45, 402
        // points sans rien dessous (témoin du joint, plafond.js). Le côté
        // intérieur, lui, est couvert deux fois. On comble le coin par un
        // ruban posé au sommet, dans l'axe du tronçon d'arrivée, sur la moitié
        // extérieure seulement et long de w·tan θ : il couvre tout le secteur
        // entre les deux bords de tronçon, et son garde-corps ferme le virage.
        for (let k = 1; k + 1 < seg.pts.length; k++) {
          const c = seg.cumul[k];
          if (c < s || c >= s + 1) continue;
          const [px, pz] = seg.pts[k - 1], [vx, vz] = seg.pts[k], [nx, nz] = seg.pts[k + 1];
          const l1 = Math.hypot(vx - px, vz - pz) || 1, l2 = Math.hypot(nx - vx, nz - vz) || 1;
          const d1x = (vx - px) / l1, d1z = (vz - pz) / l1, d2x = (nx - vx) / l2, d2z = (nz - vz) / l2;
          const croix = d1x * d2z - d1z * d2x, theta = Math.acos(Math.max(-1, Math.min(1, d1x * d2x + d1z * d2z)));
          if (theta < 1e-3) continue;
          const Lc = largeurA(seg, c), e = Lc.demiEmprise * Math.tan(theta) + 0.5, yc = coteA(seg, c) + lift + 0.003;
          const exterieur = croix > 0 ? { o0: -Lc.demiEmprise, o1: 0, garde: 'o0' } : { o0: 0, o1: Lc.demiEmprise, garde: 'o1' };
          out.push({ seg, s: c, ax: vx, az: vz, bx: vx + d1x * e, bz: vz + d1z * e, ya: yc, yb: yc, fx: d1x, fz: d1z, genre: 'tablier', dy: 0, ...exterieur });
        }
      }
      if (!pont) {
        // le bord de chaque chaussée, continu ; entre les deux voies d'un sens, pointillé (3 sur 6)
        for (const o of [-(L.terrePlein + L.demiChaussee), L.terrePlein + L.demiChaussee]) {
          out.push({ ...base, genre: 'ligne', o0: o - 0.08, o1: o + 0.08, dy: 0.02 });
        }
        if ((s % 6) < 3 && L.demiChaussee > DEMI_VILLE + 0.5) {
          for (const o of [-(L.terrePlein + L.demiChaussee / 2), L.terrePlein + L.demiChaussee / 2]) {
            out.push({ ...base, genre: 'ligne', o0: o - 0.08, o1: o + 0.08, dy: 0.02 });
          }
        }
      }
    }
  }
  return out;
}
