# Ce qui est en cours

- [ ] **LE JOURNAL DE BORD COMPTE PEUT-ÊTRE UNE MISE À JOUR COMME UN PLANTAGE
  (v413).** Session 84 (iPhone, v408) : zéro relevé, zéro événement, envoyée
  cinq secondes après la fermeture propre de la v406 — la relance du service
  worker tue sans doute la page neuve avant `pagehide`. Même forme pour la
  session 70 (v404). Si c'est le cas, chaque mise à jour pousse le disjoncteur
  de sûreté (`suretePalier`, deux plantages) vers le palier bas. À mesurer :
  `?apresmaj=1`, et ne compter comme plantage qu'une session qui a écrit au
  moins un relevé, ou marquer la session fermée avant `reloadOnce`.
- [ ] **LA v413 SE JUGE DANS LE JOURNAL DE BORD DE L'IPHONE.** Le partage des
  textures de la flotte retire la cause mesurée (734 Mo de copies) ; il faut
  lire `journal_appareil` après la prochaine partie longue : plus de
  `plantage`, et `textures` qui ne grimpe plus à mesure que la rue montre de nouveaux modèles. Si
  l'iPhone plante encore avec un compte stable, le suivant à mesurer est le
  clone de géométrie des dégâts (`degats3d.js`, une pièce par voiture touchée,
  66 à 87 chocs dans les parties qui ont planté).

- [x] **UN ÉCART QUI FAIT TRAVERSER LA RUE (v402) — corrigé en v411.**
  `coteDEcart` (pietons.js) : depuis le trottoir, devant une voiture sur la
  chaussée, l'écart ne descend plus. Sonde node 92/125 → 0/125 ; témoin de
  `monte.js` 4/5 → 0/5 (deux fois de chaque côté). Reste déclaré : une voiture
  qui FRÔLE la bordure peut encore toucher, sans freinage, un passant resté au
  bord (19 contacts sur 125 à la sonde, 82 avant) — c'est le freinage de la
  voiture (v395) qui le protège, pas son pas de côté.
  PORTAIL DE LA v411 (base v404, règle de la v195) : `carte.js` (flèche du
  GPS, glisser bridé ×4) et `manhattan.js` (trou de façade, taxi) — dettes déjà
  déclarées plus bas. `monte.js` : la cascade « pas aux commandes » du portail
  (famille v317, v359) disparaît rejouée SEULE des deux côtés (195 verts
  chacun) ; restent, des deux côtés, « la téléportation ne compile plus de
  programmes » et « son flanc frôlé ne nous arrête pas ». Et « deux voitures ne
  sont jamais l'une dans l'autre — en taux » : 4,7 % au portail, 4,9 % seule
  sur la branche, 1,0 % seule sur `origin/main`. Rejoué témoin seul, page
  neuve : branche 1,6 · 0 · 0, `origin/main` 0,7 · 0 · 0 ; après une visite à
  Rome (le régime à 1 500-2 900 paires) : branche 1,6 · 0,6 · 0,7 et, avec le
  témoin de l'écart avant, 5,3 · 0,3 · 2,0 ; `origin/main` 1,3 · 0 · 3,0. La
  barre de 4 % tombe dans l'étendue naturelle du témoin (le tirage de la v277) ;
  la règle de l'écart ne touche que des passants SUR le trottoir. Dette : un
  témoin de taux qui va de 0 à 5 % sur le même code n'est pas un gardien.
- [ ] **`maj.js`, LE PALIER — UNE INTERMITTENCE DE CADENCE (v405).** « le jeu se
  mesure en jouant, et range son verdict » et « le palier se décide sur le
  TRAVAIL d'une image » : rouges UNE fois sur deux passages seuls de la
  branche (page à 350 ms par image, 30 images, `range: false`, verdict nul),
  verts au second passage (41/41) et sur `origin/main` v404 (41/41). La v405
  ne touche que `degats.js`, `degats3d.js` et `nouveautes.js`, que le palier
  ne lit pas. Au portail de la v405, `maj.js` rendait à la place le fond de
  carte (dette ci-dessous, v267) et le badge à `v404` (bump pas encore fait).
  Piste : le témoin juge sur trente images ; il devrait attendre un nombre
  d'images avant de conclure, borné, la durée dans le message.
- [ ] **LA TOLÉRANCE DES VOITURES (v405) — ce qui reste, déclaré.** (1) Sur la
  tablette : Max essaie neuf murs pleins gaz (la voiture doit caler au 9e,
  fumer dès le 2e de face) et dit si le rythme lui va — les constantes sont
  `PERTE_SANTE` et `COURBE_FORCE` (degats.js), la promesse `CHOCS_AVANT_PANNE`.
  (2) La force publiée sature à 1 dès 20 b/s normaux (`CHOC_PLEIN`,
  conduite.js, session physique) : un mur à 60 b/s coûte autant qu'à 20, et un
  frôlement rasant à 60 b/s publie 0,78 (0,6 mur). Une force qui suivrait la
  vitesse jusqu'à 60 se décide côté physique. (3) Au-delà de 24 chocs
  (`MAX_CHOCS`), l'ami ne rejoue que les 24 derniers : il peut voir une
  voiture moins abîmée que le conducteur (le feu voyage à part, la panne non).
  Et `rattraper` (degats3d.js) ne rejoue plus la tôle une fois l'historique
  plein — défaut d'avant, invisible tant que le feu venait au 3e choc.

- [x] **ROME, ZURICH : PASSAGES EN BIAIS — fait en v421** (`passages.js`, 197
  villes engendrées). Reste : **LONDRES ET LES VILLES BÂTIES À LA MAIN** n'ont
  toujours aucun passage peint hors Paris. Leurs avenues sont des polylignes
  (`VOIES`), pas une trame : il faut une bande par bras de chaque carrefour
  (`carrefoursDeVoies`, voies.js, rend le point mais pas les deux voies ni
  leurs largeurs) — la même géométrie que `bandesDeColonne`, sur un autre
  repère. Zone piétons.
  PORTAIL DE LA v421 (base v411, règle de la v195) : le premier a trouvé un
  défaut de la livraison (les bandes lisaient le monde : 4 203 blocs lus par
  morceau de Rome pour une barre de 2 521 — corrigé, 832) et un témoin mal posé
  (une traversée au FEU comptée hors passage). Second portail : `maj.js` rejouée
  seule des deux côtés (« le loader dit combien de fichiers » rouge des deux
  côtés ; « vraiment là » sur la branche, le palier sur `origin/main` —
  intermittences déclarées ; l'entrée 421 du journal, ajoutée à la fusion),
  `carte.js` (flèche du GPS) et `manhattan.js` (trou, taxi) déclarés,
  `monte.js` les deux rouges des deux côtés de la v411 (compilation à
  l'arrivée, flanc frôlé). Le témoin de Rome : vert au portail.
- [ ] **`realisme.js` MEURT AU CLIC « JOUER » (v385-v402, intermittent).**
  `locator.click: Timeout 30000ms` sur `#play-btn`, machine au repos ; vu sur la
  v381 et la v384 (mort), la v382 (vivant) : antérieur, pas de la zone piétons.

- [x] **LES DEUX ROUGES RÉSEAU RÉCURRENTS (v393).** « Un départ propre
  nettoie tout le monde » : CORRIGÉ dans le jeu — `net.stop()` n'envoyait
  aucun adieu, un pair au transport muet restait 90 s (v266). Sonde
  `sonde-depart-transport-muet.cjs` : `origin/main` 0/2 nettoyé en 60 s,
  branche 3/3 en ≈ 1 s ; `reseau.js` seule sur la branche 80/80. « Caméra
  éteinte, le jeu reprend sa voix normale » : TÉMOIN REPOINTÉ — il comparait
  deux moments de mélodie (sans appel, 0,0195 à 0,0285 d'une fenêtre à
  l'autre ; radio relancée sans appel ≡ après l'appel, gain 1 cinq fois sur
  cinq). Il juge le gain rendu et un niveau > ½ ; rouge sur une copie où la
  voix reste au quart. Les entrées plus bas qui déclarent ces deux témoins
  « intermittents des deux côtés » sont closes par celle-ci.
  Portail (base v388) : `degats`, `visio`, `hote`, `reseau` VERTS ; seul
  rouge `manhattan.js` « le trou enlève aussi la géométrie visible de la
  façade » (17 102 → 54 969) — la dette déclarée en v291 (22 326 → 51 734 sur
  `origin/main`), un compte qui suit ce que la file a installé ; la livraison
  ne touche ni la façade ni Manhattan.
  Second portail (rebasé sur la v392) : `degats`, `visio`, `hote`, `reseau`
  VERTS (départ nettoyé en 1 s, voix gain 1). Rouges, tous déjà déclarés :
  `maj.js` « le loader dit combien de fichiers » (intermittent, table plus
  bas), `manhattan.js` trou (9 203 → 51 734), « le taxi roule » (bouton
  jamais visible) et l'invité de la ligne 674 qui ne rejoint pas.
- [x] **L'INVITÉ DE `manhattan.js:674` QUI NE REJOINT PAS — FAIT en v412.**
  Pas une intermittence : rejouée seule, 2/2 des deux côtés. La page de
  l'invité s'ouvrait pendant que l'hôte rendait Manhattan (4 cœurs pris) :
  `__game` en 44 s puis >90 s, contre 13–18 s hôte hors Manhattan. Le témoin
  ouvre la page de l'ami d'abord ; 3/3 en sonde, suite jusqu'au bout.
  Portail : le témoin vert ; rouges déclarés `maj.js` (loader ×2) et
  `manhattan.js` (trou, taxi) — mêmes rouges seuls sur `origin/main` v406,
  mesurés le même jour (portail de la v410).
- [ ] **LE PORTAIL DE LA v410 (le passager sans courtier), DOUBLE MESURE
  FAITE.** Dix suites ; `reseau.js` VERTE entière (le témoin neuf : assise en
  510 ms). Rouges, tous déjà déclarés : `maj.js` (loader, libération, palier
  ×2), `carte.js` (la flèche du GPS à gauche lue à 1,57), `manhattan.js` (trou
  22 326 → 51 734), `monte.js` (flâneur de Rome, compilation de New York,
  flanc frôlé). Rejouées SEULES : `maj.js` branche 3 rouges / `origin/main`
  (v406) 0 — à l'INVERSE de la mesure faite deux heures plus tôt pour la v406
  (branche 0, `origin/main` 3) : la même intermittence des deux côtés ;
  `carte.js` branche « glisser bridé ×4 » 405 ms pour 400, `origin/main` la
  flèche du GPS ; `manhattan.js` trou et taxi des deux côtés. `monte.js` : preuve
  structurelle, la suite n'ouvre aucune partie en ligne (`net` nul, `estMoi`
  jamais appelé).
- [x] **LE GPS PARTAGÉ PAR UN HÔTE QUI RELAIE (`rpos`) A SON TÉMOIN À
  TROIS TABLETTES (v406).** `reseau.js`, pendant la partie à trois : la
  destination de Nina proposée à Alice à travers l'hôte. Sonde isolée 3/3
  (0,5–2,6 s) ; `rpos` désarmé, 0/2 en 30 s. Portail : `reseau.js` verte ;
  `maj.js` « vraiment là » et « ne floute rien » rouges (déclarés) — seule,
  branche VERTE, `origin/main` v404 rouge sur trois dont « vraiment là ».
- [ ] **LE PORTAIL DE LA v391 (la tablette mesure sa vitesse au sol), DOUBLE
  MESURE FAITE.** Onze suites ; mes deux témoins verts (règle 36/192/2 ; ligne
  « roulage : 43 b/s · trou devant 16 blocs · débit 4 morceaux/s »). Rouges :
  `maj.js` (libération `null`, « ne floute rien » — déclarés), `carte.js`
  (glisser bridé ×4, 414 ms pour 400 — déclaré), `manhattan.js` (façade
  11 684 → 42 919, taxi — déclarés) et un NEUF de `monte.js` : « un passant
  change de trottoir au feu » (4 traversées, 3 au rouge, **1 au vert**).
  `monte.js` rejouée SEULE : branche VERTE en entier (5 traversées, 0 au vert) ;
  `origin/main` (v386) verte sur ce témoin avec **1 au vert sur 5** aussi, et
  rouge sur le trou du chasseur en vol (intermittence déclarée). Le témoin du
  feu est une proportion qui frôle sa barre sous la charge, des deux côtés ;
  zone des piétons, non reprise ici. La livraison ne touche les piétons par
  aucun chemin (une ligne de `?diag=1`, un champ du journal de bord).
- [ ] **LE PORTAIL DE LA v388 (le GPS se partage).** Rouges : `maj.js` « il
  couvre toutes les versions du journal » (`manquantes: [384]` — À MOI :
  l'entrée du journal écrite pendant le portail, la ligne de `nouveautes.js`
  ajoutée ensuite) ; `manhattan.js` (trou, taxi — déclarés) ; `monte.js` (la
  téléportation qui compile — déclarée) ; `reseau.js` trois rouges : « un
  départ propre » (la famille du point C ci-dessous), « la même circulation »
  (34,1, déclarée v371) et « la voiture prise garde sa couleur »
  (`monture: null`, intermittence vue sur `origin/main` v326). `reseau.js`
  REJOUÉE SEULE sur la branche : 79 verts, zéro rouge (mon témoin du GPS
  compris).
- [ ] **LE PORTAIL DE LA v420 (le pilote graphique lu une fois).** Huit suites.
  Rouges, tous déjà vus ou déclarés : `maj.js` libération (programmes 22/27,
  carte faux) ; `carte.js` flèche du GPS et glisser bridé ×4 (402 ms pour
  400) ; `manhattan.js` façade 11 684 → 46 592 et taxi ; `monte.js` 37 rouges,
  la cascade « pas aux commandes » rejouée le même jour sur `origin/main` (21
  rouges, v404). Preuve STRUCTURELLE pour la livraison : `renduLogiciel()`
  rend la même valeur qu'avant, il ne la demande qu'une fois. **Signe neuf à
  démonter (conduite) :** dans ce passage, le doigt du joystick tombait sur
  `"cible":"quiz"` — un quiz du mode éducatif ouvert en pleine suite prend les
  clics (« au volant, l'avant du joystick », « la zone du joystick ») ; sur
  `origin/main` la même ligne dit `"cible":"game"`. Une suite de soixante
  minutes dépasse peut-être le minuteur du quiz : à mesurer (`education.js`,
  temps réel depuis la v234) avant d'accuser autre chose.
- [ ] **LE PORTAIL DE LA v417 (le témoin vole au-dessus des villes), DOUBLE
  MESURE FAITE.** Le banc tournait à une charge stable de 3,8 cœurs (les pages
  `tab` et `ciel` de `monte.js`). `maj.js` : libération avec `carte: false`
  (déclarée). `monte.js` : le premier jet de mon témoin OUVRAIT une troisième
  page (trou 16 pour 60 à Paris — la leçon de la v346) ; repointé dans `ciel`,
  placé après ses autres témoins, et la page rendue à sa place en sortant (sans
  cela la conduite de `pageGta` tombait à 2,8 images par seconde : quatre
  rouges de conduite de plus). Rejouée SEULE, version finale : 195 verts,
  3 rouges — « la rue roule à l'allure d'une ville », la compilation à New York,
  le flanc frôlé — tous trois rouges sur `origin/main` (v404) rejouée seule
  (21 rouges ce jour-là, dont la cascade « pas aux commandes » des avions et le
  trou du chasseur au-dessus du désert, 58 pour 60). Mon témoin : Paris 137 ·
  112, barres 48 · 60. Un passage est mort au démarrage d'une page (90 s,
  `banc.joueur`), la panne déclarée sous la v397.
- [ ] **LE PORTAIL DE LA v404 (les anneaux contournent), DOUBLE MESURE FAITE.**
  Verts : `fumee.js`, `carteMonde.js` (les deux témoins neufs), `plafond.js`
  (empreintes, celle des 490 morceaux comprise). `carte.js` : « la flèche du
  GPS » (1,92 rad) et « la faire glisser non plus » rouges des DEUX côtés
  rejoués seuls (444 ms `origin/main` v389, 618 ms branche, barre 400), dettes
  déjà déclarées. `monte.js` change de rouges à chaque passage : portail
  (réverbère dans Paris, recharge à l'arrivée 0,74 pour 0,75), seule sur la
  branche (le train Eurostar Londres–Paris, le flâneur de Rome 2 sur 3), seule
  sur `origin/main` (le trou en vol). Le flâneur, le seul qui passe dans une
  ville engendrée, rejoué par `sonde-sortie-chaussee.cjs` trois fois de chaque
  côté en alternance : 9 sur 9 au bord des deux côtés (3,1 à 5 s). Le train
  et le réverbère sont dans Paris et Londres, que la v404 ne touche pas.
  Après la fusion de la v394 (portail de sept suites) : verts `parishd.js`,
  `carteMonde.js`, `plafond.js`. Un rouge À MOI, corrigé : le titre de la
  nouveauté faisait sept mots (`maj.js`). Les autres sont déclarés plus haut,
  mêmes valeurs : `maj.js` libération `null` et « ne floute rien », `carte.js`
  flèche du GPS (1,92 rad) et glisser (719 ms), `monte.js` « l'avant du
  joystick est l'accélérateur » (médiane 27,18, 27,23 sur `origin/main`).
  Après la fusion de la v397 (sept suites) : verts `parishd.js`,
  `carteMonde.js`, `plafond.js` ; `maj.js` libération `null` et flou
  (déclarés). Rejouées SEULES des deux côtés (`origin/main` v397) :
  `carte.js` branche 2 rouges (GPS, glisser — déclarés), `origin/main` 9 (dont
  l'appui long et tout le GPS) ; `monte.js` branche 188 verts et 4 rouges
  (« la rue roule à l'allure d'une ville » médiane 0 dans un bouchon, la
  compilation à New York, le trou en vol, le flanc frôlé), `origin/main` 189
  verts et 3 rouges (la monoplace 9,1, le flâneur, le flanc frôlé). Preuve
  structurelle pour « la rue roule » : le témoin se joue à Paris, et la ville
  engendrée la plus proche (Rennes) est à 1 518 blocs — aucun anneau engendré
  ne s'y déplie (220 blocs). Un premier passage de la branche est mort au
  démarrage d'une page sous une charge stable de 3,8 cœurs (`banc.joueur`,
  90 s), rejoué complet ensuite.
  Après la fusion de la v399 (sept suites) : verts `parishd.js`,
  `carteMonde.js`, `plafond.js`. Rouges, tous déjà vus sur `origin/main` ou
  déclarés : `maj.js` libération ; `carte.js` glisser (617 ms) et « le rendu
  suivant, cache chaud » 152 ms pour 150 (une durée, anneaux déjà en cache) ;
  `monte.js` monoplace 9,1, piéton frôlé (couloir vide de 30 000, aucune
  ville — déclaré v371), feu, compilation New York, réverbère, trou en vol,
  flanc frôlé.
- [ ] **LE PORTAIL DE LA v387 (les circuits des villes engendrées), DOUBLE
  MESURE FAITE.** Verts : `carteMonde.js`, `plafond.js`, `degats.js`,
  `carte.js`, `washington.js`. `maj.js` : un seul rouge, À MOI et corrigé (le
  titre de la nouveauté faisait sept mots). Rouges déjà déclarés, mêmes
  valeurs : `manhattan.js` façade 22 326 → 51 734 ; `monte.js` chauffe de New
  York expirée à 68 sur 321. Le gel d'arrivée (1 300 ms · 37,8 % au portail)
  me concernait peut-être — `deplier()` calcule désormais les anneaux d'une
  ville à l'approche. Rejoué SEUL, même vol, en ordre alterné, deux passages
  par page (`sonde-gel` du brouillon) : branche 1,8 · 10,4 · 0 · 7,3 % (pire
  image 283 à 1 517 ms), `origin/main` v375 10,7 · 13,1 · 9,6 · 0 % (283 à
  1 400 ms). Même distribution, la branche n'est pas pire : c'est la dette
  connue, pas la livraison.
  Après la fusion de la v375 (portail de dix suites) : un rouge À MOI,
  corrigé — le témoin de la v375 « aucun monument en travers d'un anneau »
  rendait sa dette « déclarée pour rien » : les anneaux de la livraison la
  remboursent entière (123 monuments lus, zéro en travers), sa table est
  vidée. Les autres, déjà déclarés et rejoués SEULS des deux côtés : `carte.js`
  flèche du GPS (gauche à 1,92 rad, même valeur sur `origin/main` v375) ;
  `plafond.js` « la surface coûte… » (10,4 puis 8,0 ms avec contre 1,2 et
  2,2 sans sur la branche ; 10,5 contre 8,6 sur `origin/main` — sous node, ordre
  alterné, 31 passages : branche 2,16·1,91·1,64 contre 1,60·1,23·1,09 ms,
  `origin/main` 2,05·2,75·2,07 contre 1,51·1,77·1,09, le même écart) ;
  `maj.js` le loader de l'installation ; `manhattan.js` façade 17 102 →
  51 734 et le taxi (bouton jamais visible) ; `monte.js` gel 700 ms · 13,9 %.
  Après la fusion de la v379 (dix suites) : huit vertes ; `manhattan.js`
  façade 27 926 → 51 734 (déclarée) ; `carte.js` les deux témoins d'appui long
  (« pointeurs 0 », la dette de charge de la v258) — rejoués SEULS deux fois de
  chaque côté, verts sur la branche ET sur `origin/main` v379 ; au troisième
  passage de la branche, la flèche du GPS seule (gauche 1,92 rad, déclarée).
  Après la fusion de la v382 : huit suites vertes ; `manhattan.js` façade
  (déclarée) et `maj.js` les deux témoins du loader d'installation (dette
  déclarée) — après la fusion de la v386, `maj.js` et `plafond.js` rejoués
  SEULS sur la branche, et `maj.js` seul sur `origin/main` v386 : verts tous
  les trois.

- [ ] **LE PORTAIL DE LA v395 (la rue à l'allure d'une ville), DOUBLE MESURE
  Portail du rebase sur la v380 : `monte.js` rouge sur « en vol, on ne rattrape pas le bout du monde » (chasseur 58/60) — rejouée SEULE sur la branche : 184 verts, zéro rouge (chasseur 72/60). `reseau.js` verte ; `manhattan.js` façade 22 326 → 51 734, déclarée.
  Portail du rebase sur la v394 : douze rouges, tous déjà déclarés (appui long « pointeurs 0 » et sa cascade GPS dans `carte.js`, flanc en virage et atterrissage dans `monte.js`, façade et taxi dans `manhattan.js`, loader de `maj.js`). `carte.js` rejouée SEULE sur la branche : 101 verts, un rouge — la flèche GPS « gauche 1,92 », dette v321.
  FAITE.** **Portail complet après la correction de l'annonce du ciel** :
  neuf suites, quatre vertes ; cinq rouges, tous déjà déclarés ici avec leur
  double mesure — la flèche du GPS (`carte.js`, gauche 1,92 rad), « chaque
  îlot a sa porte » (`washington.js`), le trou de façade et le taxi tactile
  (`manhattan.js`), le gel à l'arrivée (`monte.js`, 22,5 %), le départ propre
  (`reseau.js`). Le diff ne touche ni Washington ni Manhattan. Et le témoin
  neuf « l'hôte qui rame annonce encore l'heure de la rue » est ROUGE sur
  `origin/main` rejoué seul (1 annonce en 12,5 s, 30 images) — vert ici.
  **Portail du rebase sur la v371, puis rebase sur la v373** (87 min) :
  `carte.js` (flèche du GPS) et `manhattan.js` (trou de façade) rouges,
  déclarés ; `monte.js` cinq rouges — chauffe, trou en vol (chasseur 58/60),
  gel à l'arrivée, atterrissage, et « rendue dans une scène vide, la
  recharge à l'arrivée garde la cadence » (8,8 contre 12,1 images/s, sous
  les trois quarts). `monte.js` rejouée SEULE sur la v374 (devenue v395) : 178 verts, deux
  rouges (chauffe de New York expirée 53/321, gel 32,7 %) ; sur
  `origin/main` v373 seule : 172 verts, les MÊMES deux rouges plus « elle
  ralentit assez pour qu'on la rejoigne ». La scène vide, le trou et
  l'atterrissage sont verts seuls : rouges de portail, sous charge.
  **Portail v395, et la voiture qui pilait trop tard.** `monte.js` rejouée
  seule sur le rebase v363 : « la circulation s'arrête devant la voiture de
  l'enfant » rouge (3 et 4 relevés au travers, deux passages), zéro sur
  `origin/main` — la v395 elle-même : une voiture à cinquante, vue tard,
  touchait la voiture de l'enfant et « pas si l'on est déjà dedans » la
  laissait traverser. Corrigé (on PILE devant une personne quand le freinage
  ne suffit plus, et l'urgence vaut dans le second chemin) : 0 au travers,
  154/154 arrêtées. Restent, rejouée seule : le gel d'arrivée (déclaré) ;
  « 🛬 descend train sorti… jusqu'à l'arrêt » (arrêt x 304,8 pour une piste
  de 300 — le piège de la v273 déjà déclaré ci-dessous, aucune ligne d'avion
  touchée) ; et une fois « en vol au-dessus de Paris, le monde se maille hors
  du fil principal » (33 blocs en 64,1 s pour une borne de 40 s : page
  figée), vert quatre passages sur la branche et sur `origin/main` — un avion
  en vol est écarté de `cederLePassage` par la hauteur (± 2,5), la correction
  ne peut pas l'atteindre.
  **Portail du rebase sur la v366** (84 min) : metro, carteMonde, degats,
  washington verts ; les rouges sont tous déclarés ici — le loader (`maj.js`),
  la flèche du GPS à gauche 1,92 rad (`carte.js`), le trou de façade 14 460 →
  51 734 et le taxi tactile (`manhattan.js`), le départ propre (`reseau.js`),
  et dans `monte.js` la chauffe (ZÉRO programme neuf dans les cinq lieux, la
  garde `images` tombe à Paris et New York, 9), le réverbère « parcouru 0 »
  (rouge aussi sur `origin/main`, ci-dessous) et le gel d'arrivée (29,7 %). Le
  maillage en vol et l'atterrissage sont VERTS à ce portail.
  **Portail du rebase sur la v369** (94 min) : mêmes rouges déclarés, plus
  `reseau.js` « à trois, chacun voit les deux autres » et ses quatre
  suivants (`[["Alice"],["Marlon"],[]]`). Rejouée SEULE : branche 75 verts,
  « à trois » VERT, seuls rouges « un hôte sans courtier est trouvé » et « il
  le REJOINT » (`[[],[]]`, l'intermittence déclarée plus bas, rouge seule sur
  `origin/main` aux passages précédents) ; `origin/main` v370 seule, 77 verts.
  « À trois » rouge au portail seulement : la famille du fil principal bloqué
  sous charge (v266), déjà déclarée. `manhattan.js` « sans erreur de jeu »
  (PeerJS « Lost connection to server ») : déclarée.
  Portail d'avant : `manhattan.js` « le trou enlève aussi la géométrie »
  (11 684 → 51 734, dette déclarée, rouge des deux côtés) ; `monte.js` « se
  téléporter ne compile plus de programmes » (ZÉRO programme neuf dans les cinq
  lieux, mais la garde `images > 10` tombe : Paris 7 images) et « l'écran ne se
  fige pas en arrivant » (23,7 %). `monte.js` rejouée SEULE : branche — le trou
  en vol (82/58/64, barre 48/60/60) et la chauffe de New York expirée (30/321
  en 60 s, donc 20 programmes à New York) ; `origin/main` (v348) — le MÊME trou
  au bloc près et l'arrivée figée (22,1 %), chauffe finie en 29 s. La chauffe
  se démonte à part (`sonde-chauffe.cjs`, page neuve, ordre alterné, deux
  passages par arbre) : branche 6,8 · 4,8 · 6,4 · 4,5 s, `origin/main` 5,7 ·
  3,8 · 6,6 · 4,7 s — aucune différence ; c'est l'état de la machine après
  vingt minutes de suite qui la fait expirer, une fois sur deux des deux côtés
  (déjà déclaré « chauffe expirée » sur `origin/main`).
  **Portail du rebase sur la v353** : sept suites vertes ; `manhattan.js`
  (14 460 → 51 734, dette déclarée) ; `monte.js` quatre rouges au portail
  (5 relevés « au travers » devant l'enfant, programmes à Paris 6/7 images,
  réverbère « parcouru 0 », écran figé 22,2 %). `monte.js` rejouée SEULE :
  branche — l'écran figé seul (15,3 %, pire 1 983 ms) ; `origin/main` (v353) —
  le MÊME seul (22,9 %, pire 2 150 ms). Les trois autres sont les
  intermittences de portail déjà déclarées (vertes seules).
  **Portail du rebase sur la v356** : cinq suites vertes ; `maj.js` (le
  loader et le nombre de fichiers, intermittence déclarée), `manhattan.js`
  (11 684 → 54 969, et « le taxi roule », bouton jamais visible — déclarés),
  `monte.js` (programmes à New York 15 neufs, chauffe expirée ; écran figé
  16,8 % — déclarés ; et « au feu, la voiture freine » : UN arrêt « sec » sur
  deux en 26 s — le témoin comptait les relevés entre 13 b/s et l'arrêt, et
  une image de portail dure jusqu'à deux secondes : il se juge désormais en
  DÉCÉLÉRATION lue à l'horloge de la page, sec au-delà de 10 b/s²).
  `reseau.js` « chez l'ami, la voiture qui arrive derrière celle de l'enfant
  l'attend » : au portail la voiture suivie (retard initial 108) a rattrapé
  son retard AU TRAVERS de Marlon (dMin 0,4, dix relevés dedans). Rejouée
  SEULE : branche verte (retard +49, dMin 6,2), `origin/main` v356 verte
  (+20, dMin 9). Intermittence vue une fois sur trois passages ; le témoin
  publie désormais la CAUSE retenue par la voiture au plus près et la
  distance d'Alice à Marlon (la rue ne cède qu'aux amis à moins de 90 blocs
  d'elle), pour que le prochain rouge se démonte. Piste : le rattrapage à
  1,3 × de la grille d'une voiture très en retard.
  Et `monte.js` rejouée SEULE : branche — « se téléporter ne compile plus de
  programmes » rouge (Paris : 3 programmes `physical` neufs) et l'écran figé
  (26,3 %) ; `origin/main` v356 — l'écran figé seul (20,7 %), Paris à zéro. La
  sonde qui nomme les matériaux (`sonde-programmes-paris.cjs`, trois pages
  neuves) rend ZÉRO programme neuf à Paris trois fois sur trois : sur la
  branche, Paris est à zéro trois passages sur quatre (portail, sonde ×3) et
  à trois une fois. Intermittence des voitures `physical` à l'arrivée ; la
  sonde nommera le matériau le jour où elle le voit.

- [ ] **LA CIRCULATION VIVANTE, PALIERS SUIVANTS (v395, session
  `claude/circulation-vivante`).** Livré : limitations par voie, profil de
  vitesse dans la grille, grille par voiture, freinage local (feu, file,
  enfant, piéton), voiture heurtée, voie de droite sur les avenues. Reste :
  (1) **le bus ne marque plus d'arrêt** — il roule dans la file de son anneau
  parce qu'un convoi ne double pas ; un vrai arrêt demande une voie de bus ou
  un arrêt hors chaussée. (2) **La variance est par convoi**, pas par voiture
  ni par classe de modèle (camion, taxi) : une voiture d'un convoi ne peut pas
  rouler plus vite que la grille sans casser la v305 — piste : une petite
  oscillation de phase par voiture, fonction de l'horloge, bornée par
  l'écart de la file. (3) **Le type de voie suit le circuit** (rue engendrée,
  avenue nommée, autoroute), pas le tronçon : un boulevard et une ruelle d'un
  même circuit roulent à la même limitation — piste : demander la section à
  `voirie.js` au point du tracé. (4) **Le croisement du circuit en huit de
  Paris** (−333, 271) : cadencé par `nbSansCroisement` (le nombre de voitures
  évite les arrivées simultanées) et la légitimité se propage dans la file ;
  reste 0,4 à 1,6 % des paires au contact (sonde et témoin) : une voiture qui
  rattrape son retard arrive au croisement hors de sa grille, ou la grille est saturée
  et que la patience dénoue un nœud de la même file. Piste si cela revient :
  un vrai créneau alterné dans `horaire()`, ou casser le huit en deux
  circuits. (5)
  **L'arrêt d'une voiture heurtée et le freinage devant l'enfant sont
  LOCAUX** : l'ami ne les voit pas — pas de témoin à deux tablettes pour eux,
  seulement pour la grille (`reseau.js`). (6) Coût mesuré au banc : 0,7 →
  1,5 à 1,7 ms par image pour `vehicules.update` au-dessus de Paris ; à
  mesurer sur l'iPad (`?diag=1`).
- [ ] **LA COMPILATION À L'ARRIVÉE (monte.js) : CE QUE LE BANC SOUS CHARGE
  MESURE (v386).** Rouge chronique, des deux côtés : « chauffe de New York
  expirée » (44 à 163 sur 321 en soixante secondes). Sondé
  (`sonde-programmes-paris.cjs`, le trajet exact du témoin) : seule, la chauffe
  finit en 9,3 s, bridée ×4 en 9,1 s, bridée ×6 (depuis l'accueil) en 15,8 s ;
  et à l'arrivée, Paris, New York, Lille rendent ZÉRO programme neuf — de jour
  comme de nuit. L'enfant n'est pas touché ; le témoin attendait soixante
  secondes un état que la charge du portail retarde. Repointé : attente bornée
  à 150 s (un état, pas un taux, v285), la durée dans le message, garde
  d'images à plus de trois (Paris a rendu 8 images en 20 s au portail de la
  v382, page vivante). **Reste ouvert** : au portail de la v382 la chauffe a
  FINI (321/321 en 31 s) et Paris a rendu trois programmes `physical` que ni la
  nuit ni le bridage ne reproduisent seuls. Le message nomme désormais la case
  de la clé qui diffère (méthode v319) : au prochain rouge, on saura laquelle.
  Portail de la v386 : `monte.js` VERT en entier — chauffe finie en 94,8 s
  (elle aurait « expiré » à 60), zéro programme neuf dans les cinq lieux,
  Paris à 7 images ; `maj.js` : la préparation (corps 7/9, dette déclarée) et
  le badge avant le bump.
- [ ] **LE PORTAIL DE LA v383 (la rue n'entre plus chez un ami) : DEUX PASSAGES.**
  Premier passage, trois suites rouges : `manhattan.js` (trou de façade, taxi
  — déclarés), `monte.js` (la monoplace — À MOI, repointée, voir CLAUDE.md ;
  la compilation à la téléportation et le gel d'arrivée — familles déclarées),
  `reseau.js` (« la même circulation », écart médian 35,1 — la famille
  intermittente déclarée en v371 ; preuve structurelle : les deux joueurs
  volent trente blocs au-dessus de la rue, `|a.y − b.y| > 2,5` les écarte de
  `veut`, la règle neuve n'est pas atteinte). Second passage (reprise) :
  `reseau.js` ENTIÈREMENT vert (mon témoin compris) ; `monte.js` : le seul gel
  d'arrivée (24,8 %, déclaré) ; `manhattan.js` : trou, taxi, « Lost
  connection to server » de PeerJS — déclarés.
- [ ] **SAN FRANCISCO–LOS ANGELES, INSTRUIT EN v419 SANS LE FAIRE** (relevé
  du scratchpad, carte.mjs et ring.mjs ; aucune sonde de tracé). L'axe direct
  (2 403 blocs) passe dans la marge de SFO (−38 774, 7 120, r 72, au sud de la
  ville) et sur deux repères, et la bande côtière disparaît au sud de z 8 000 :
  la mer y vient battre la chaîne côtière. Le couloir praticable est
  INTÉRIEUR : sortir de San Francisco par l'est (0° à 30° : 33 à 41 blocs
  jusqu'à r + 260, le reste du pourtour monte à 42-53 au-delà de r + 40, et le
  sud est SFO), descendre la vallée centrale (x −38 050 à −37 500, z 7 000 à
  8 200, 30 à 38 blocs) entre la chaîne côtière (x ≈ −38 450) et le massif
  de l'est (x ≈ −37 500), passer le col vers z 8 500, x −37 450 à −37 000
  (38 à 42), et entrer dans Los Angeles par le NORD-OUEST. Los Angeles est
  « assise sous son pays » (v311) : à vingt blocs du bord, 46 à 59 blocs
  partout sauf vers −130° à −140° (38, 40-43, 46 en s'éloignant) et la côte
  (−160°, l'eau) ; LAX (−37 536, 9 087, r 78) est au sud-ouest. Ce que la
  livraison demande : une entrée DÉCLARÉE dans `sanfrancisco.js` (ville bâtie
  à la main) jusqu'à une artère de l'est (Market Street ou la 3e Rue, à
  mesurer), une porte de Los Angeles par −130° avec un bord profond et la
  RAMPE de la sonde de l'A8, et la vérification `exact` (lib.mjs) contre le
  rail et les autres routes. La règle des repères et de SFO tient sur ce
  couloir ; elle est à remesurer sur le tracé, pas sur l'axe.

- [ ] **LE PORTAIL DE L'A6 (v419), DOUBLE MESURE FAITE.** Quatre suites
  rouges. `plafond.js` : le joint du premier pont de l'A6 rendait deux
  « trous » à d 7,92, faux — le point est dans l'emprise, le centre de sa
  colonne (−97, 1236) ne l'est pas et porte le sol naturel plein à la cote
  de l'accotement ; le témoin lit désormais la cote au point, et la suite
  rejouée seule sur la branche est verte. `carte.js` : la flèche du GPS
  (gauche 1,92 rad) et le glisser bridé ×4 (414 ms pour 400) — rejouée
  seule, verte sur la branche, rouge sur `origin/main` v415 (glisser 410 ms) :
  intermittence des deux côtés. `maj.js` : le fond de carte au moment où
  « Jouer » se libère, rouge rejouée seule sur la branche ET sur
  `origin/main` (qui ajoute « la page ne floute rien »). `monte.js` (55 min) :
  la chauffe de New York expirée (54/321) et le flanc frôlé (`c` nul) — les
  deux dettes chroniques déclarées plus bas, non rejouées une fois de plus.
- [ ] **LE PORTAIL DE LA M40 (après fusion de la v411), DOUBLE MESURE FAITE.**
  Mêmes rouges que ci-dessous, plus deux : `degats.js` « très touchée elle
  fume, ne prend JAMAIS feu… » rouge À L'IDENTIQUE sur `origin/main` (v414),
  rejouée seule des deux côtés (`sante 0,33`, `fumee 0`, 14/14 rendues) ; et
  dans `monte.js` « la rue roule à l'allure d'une ville » et « freine au feu »
  (médiane 0, aucun arrêt — déjà rouges sur `origin/main` v398, ci-dessous),
  « 🛬 descend train sorti » et le trou en vol, des sessions conduite et
  aviation. `carteMonde.js` et `plafond.js`, qui gardent les routes, verts.
  `origin/main` étant passé à la v414 pendant ce portail, la M40 devient la
  v415 ; l'empreinte des 490 morceaux se reprouve sur la base neuve (M40
  retirée : 863d4203…, la constante de la v414, au bit près).

- [ ] **LE PORTAIL DE LA M40 (après fusion de la v404), DOUBLE MESURE FAITE.**
  Quatre suites rouges au portail (105 min), rejouées SEULES des deux côtés, à
  la suite. `maj.js` (« corps, programmes et fond de carte » `null`, « ne floute
  rien ») rouge à l'identique sur `origin/main` (v404) ; la branche y ajoute ce
  passage-ci le palier non rangé (neuf images mesurées en tout : la page n'a pas
  joué assez longtemps). `carte.js` « la faire glisser (bridé ×4) » : 430 ms au
  portail, 466 ms sur `origin/main`, verte seule sur la branche ; la flèche du
  GPS rouge sur `origin/main` seul (1,92 rad, l'intermittence de la v329).
  `manhattan.js` « le trou enlève la géométrie » rouge partout (11 684 · 9 203
  branche, 17 102 `origin/main`), le taxi tactile rouge sur la branche. `monte.js`
  : la chauffe de New York (`expire`, 53/321) et le flanc frôlé
  (`{"c":null,"lu":false}`) rouges des deux côtés ; au portail, deux voitures
  l'une dans l'autre et le trou en vol (des sondes de route tournaient à côté) ;
  seule, le flâneur sorti de la chaussée et le réverbère (0,35 bloc parcouru) —
  chacun vu une fois, sur une suite de cinquante-cinq minutes, aucun dans la
  zone de la M40 (`routes.js`, `londres.js`, l'anneau de Londres de `world.js`,
  la table des entrées de `main.js`). Ce sont des dettes des sessions conduite et
  piétons.

- [ ] **LE PORTAIL DE LA M40 (v415, après fusion de la v398), DOUBLE MESURE
  FAITE.** Quatre suites rouges. `maj.js` (fond de carte, personnages 6/9),
  `carte.js` (flèche du GPS, gauche 1,92 rad), `manhattan.js` (trou de façade
  11 684 → 42 919, taxi tactile, PeerJS « Lost connection ») : mêmes rouges que
  la double mesure ci-dessous. `monte.js` rejouée SEULE des deux côtés : sur la
  branche deux rouges — « au feu, la voiture freine sur plusieurs relevés »
  (1 progressif sur 2 arrêts) et « une vraie voiture de la rue : son flanc
  frôlé ne nous arrête pas » (`{"c":null,"lu":false,"garee":[410,0]}`) ; sur
  `origin/main` (v398) cinq — le même flanc frôlé à l'identique, « la rue roule
  à l'allure d'une ville » et « freine au feu » (médiane 0, aucun arrêt, comme
  au portail), le train devant la voiture et le flâneur au milieu de la
  chaussée, le trou en vol. Les rouges de la rue (v395) et du flanc (dégâts et
  conduite) sont des dettes des sessions conduite ; la M40 ne touche ni
  `vehicules.js`, ni `player.js`, ni `circulation.js`.

- [ ] **LE PORTAIL DE LA M40 (v415, après fusion de la v394, précédent), DOUBLE MESURE
  FAITE.** Six rouges, tous déjà déclarés, rejoués SEULS des deux côtés.
  `maj.js` libération `null` et « ne floute rien » : identiques sur la branche
  et sur `origin/main` (v394). `carte.js` « la faire glisser (bridé ×4) » :
  574 · 675 · 766 ms branche, 492 ms `origin/main`, barre 400 — rouge partout ;
  « la flèche du GPS » : rouge 1 fois sur 3 sur la branche (gauche lue à 1,92
  rad, comme en v329), verte sur `origin/main` ce passage-ci et rouge en v329 —
  l'intermittence connue. `manhattan.js` « le trou enlève la géométrie »
  (11 684 branche, 9 203 `origin/main`, pour 42 919) et « les deux clients sans
  erreur » (PeerJS « Lost connection ») rouges des deux côtés ; « le taxi
  tactile » rouge sur `origin/main` seul. La M40 ne touche ni l'accueil, ni la
  carte, ni Manhattan, ni le réseau.

- [ ] **LE PORTAIL DE LA M40 (Londres–Birmingham), DOUBLE MESURE FAITE.**
  Trois rouges, tous déjà déclarés. `carte.js` « et la faire glisser non plus
  (bridé ×4) » : 663 ms au portail, où mes sondes de couloir tournaient en même
  temps ; rejouée SEULE, verte des deux côtés (103/103 branche, 103/103
  `origin/main` v392) — l'intermittence autour de 400 ms. `manhattan.js` « le
  trou enlève aussi la géométrie » : rouge des deux côtés rejouée seule
  (9 203 branche, 22 326 `origin/main`, pour 48 958) ; « le taxi roule avec
  les contrôles tactiles » (bouton jamais visible) et « les deux clients
  restent sans erreur » (PeerJS « Lost connection ») rouges sur la branche,
  NON atteints sur `origin/main` (la suite y meurt plus tôt, `rejoindre`
  expiré, ligne 674). Preuve structurelle : la M40 ne touche ni Manhattan ni
  le réseau (londres.js, une condition `londres` de world.js, un segment du
  registre à 4 000 blocs de New York).
- [ ] **LE PORTAIL DE LA v381 (ponts des villes engendrées, le Tōmei), DOUBLE
  MESURE FAITE.** `carteMonde.js` et `plafond.js` verts (empreinte des 490
  morceaux 36b34a87…, la même branche règle désarmée rend 27789d06…, la
  constante d'`origin/main`). Rouges, tous rejoués SEULS des deux côtés
  (`origin/main` v369 ; portail rejoué après la fusion de la v374) : `carte.js` « la faire glisser non plus » — 444 ms
  branche, 416 `origin/main` (barre 400), seul rouge de chaque côté ; `maj.js`
  quatre rouges sur la branche (libération `null`, le flou, le palier qui ne se
  range pas ×2), cinq sur `origin/main` (loader, libération, palier ×2) — la
  dette de charge déclarée plus bas ; `monte.js` cinq de chaque côté : la
  chauffe de New York expirée et le trou en vol et le gel d'arrivée (des deux
  côtés), plus l'accélérateur (27,2 pour 30) et le piéton sur `origin/main`
  seul, la recharge en scène vide (100 contre 37 morceaux/s, 6,5 contre 9,3
  images/s) et l'atterrissage (intermittence déclarée) sur la branche seule.
  La recharge en scène vide était VERTE au portail sur la branche et verte sur
  `origin/main` : preuve structurelle qu'elle n'est pas de la v381, une scène
  vide (`vide=1`) ne dessine ni route ni ville. Au portail (monte.js 43 min au
  lieu de 23 : banc lent), trois rouges de plus qui sont VERTS rejoués seuls
  sur la branche : la poule qui ne propose pas de monter, le maillage en vol
  au-dessus de Paris (33 blocs parcourus), la mémoire en vol (462 blocs).
  PORTAIL APRÈS LA FUSION DE LA v374 : `plafond.js` vert ; `carteMonde.js`
  rouge sur les ponts de Tokyo seulement (le Sensō-ji, déclaré depuis dans
  `DETTE_PONTS`), VERTE rejouée seule (159 verts) ; `maj.js` la libération et
  `carte.js` le glissé (465 ms) — ci-dessus ; `monte.js` cinq rouges, rejouée
  SEULE des deux côtés (`origin/main` v374) : 170 verts de chaque côté, en
  commun le métro qui ralentit (9,0 m/s), la compilation à New York, le trou en
  vol, le gel d'arrivée ; la branche seule « les passants ne sont plus plantés
  au milieu de la chaussée » (5 sur 21 à Rome, la dette de la v371),
  `origin/main` seul « rien d'autre ne vole le doigt dans la zone du joystick ».
  Les reflets (7 tours pour une garde à 8) et l'ordre de maillage (écart 0,05)
  du portail sont VERTS rejoués seuls sur la branche.
- [ ] **« UN PIÉTON FRÔLÉ SURSAUTE » ROUGE DE CHARGE (portail v385).** 1,24 s pour
  une barre à 1,2 ; rejoué seul trois fois : 0,67-0,83 s (branche), 0,70-0,91 s
  (`origin/main`). La barre est à 1,5 fois le pire relevé seul : à surveiller.
- [x] **(v385 : un flâneur sur la chaussée en sort d'abord — témoin provoqué, rouge sur l'ancien code.)**
  **LES PASSANTS SUR LA CHAUSSÉE À ROME : LE TÉMOIN DIT DÉSORMAIS QUI
  (v380).** Au portail de la v380, 3 sur 18 (vert, barre un cinquième) et le
  témoin publie : les TROIS sont des flâneurs (`surTrottoir` faux) en `pause`,
  animés, et deux sont encore À LEUR POSTE DE NAISSANCE — nés sur la chaussée
  (`posteAutour` en dernier recours ?) et jamais repartis. La sonde à l'arrêt
  (60 s) n'en voit presque pas : c'est un état de naissance, pas une dérive.
  Piste à mesurer avant d'écrire : où `posteAutour` pose un flâneur quand il
  ne trouve pas de trottoir, et si un flâneur né sur la chaussée doit d'abord
  en sortir. Portail de la v380 : rouges `maj.js` (préparation, déclarée) et
  `monte.js` (trou en vol — vert rejoué seul des deux côtés en v371 — et gel
  d'arrivée, déclaré des deux côtés).
- [ ] **LE PORTAIL DE LA v379 (l'arrivée après la carte), DOUBLE MESURE FAITE.**
  Dix suites, quatre rouges, toutes des dettes déjà déclarées sauf une.
  `maj.js` (libération `null`, « ne floute rien »), `carte.js` (glisser bridé ×4,
  460 ms), `manhattan.js` (façade 11 684 → 42 919, taxi) : déclarées plus bas.
  `monte.js` : « elle ralentit assez pour qu'on puisse la rejoindre » (9,0 m/s,
  déclaré), compilation à l'arrivée à New York (chauffe expirée 44/321, déclaré),
  le trou du chasseur en vol (58 pour 60, l'intermittence déclarée). NEUF :
  « au volant, l'avant du joystick est l'accélérateur » — la voiture lâchée garde
  9,13 b/s pour une barre à 9,0 (30 × 0,3). `monte.js` rejouée SEULE sur
  `origin/main` (v369) : **le même rouge, 9,04**, médiane 27,23 des deux côtés —
  dette de la zone conduite-physique (la décélération au lâcher frôle sa barre).
  **Démonté en v397** : ce n'était pas le frein. La roue libre de 27 à 9 b/s
  vaut 3,75 s de JEU (frein moteur 3,5 + air 0,004 v², intégré) ; le témoin
  l'attendait trente secondes de MONTRE, soit trois à quatre secondes de jeu au
  banc — il relevait la fin de la roue libre. Le budget se compte désormais en
  images (quatre cents, vingt secondes de jeu), comme la montée du même témoin
  (v277), et les images et la durée entrent dans le message.
  Et ce rejeu sur `origin/main` rend rouges les deux témoins que la v379 garde
  (« la recharge à l'arrivée garde la cadence », « l'écran ne se fige pas en
  arrivant sur une ville », 1 400 ms · 38,7 %) : verts sur la branche.
  Après la fusion de la v372, portail rejoué : mêmes dettes (`maj.js` 5/9,
  façade 11 684 → 44 615, taxi, PeerJS « Lost connection » déclaré, chauffe de
  New York, accélérateur 9,1) ; `carte.js` et le trou en vol verts.
  Après la fusion de la v375 : mêmes dettes, plus la flèche du GPS (déclarée,
  v367) et « à soixante blocs par seconde dans Paris, le monde se maille dans le
  champ » : écart 0,07 sur la branche, **0,02 sur `origin/main`** rejouée seule,
  pour une barre à 0,13. **Démontée en v382** : le premier passage dans Paris,
  à froid, écrasait l'ordre neuf (0,42 contre 0,87 · 0,87) ; échauffement non
  compté (`sonde-cone-banc.cjs`).
- [ ] **LE PORTAIL DE LA v376 (les passants réagissent à la route).** Mes
  quatre témoins verts (sursaut 1, arrêt 0,82 s ; six passants sur six se
  retournent vers le choc ; traversées 6 sur 6 au rouge ; chaussée de Rome 2
  sur 21). Rouges : `maj.js` (préparation, programmes 18/27 — l'intermittence
  déclarée v371, des deux côtés), `manhattan.js` (façade 11 684 → 51 734 et un
  délai de 30 s — dette déclarée), `reseau.js` (« même circulation », la dette
  de la session circulation-vivante), `monte.js` (compilation à New York, gel
  d'arrivée — déclarés des deux côtés ; « la recharge à l'arrivée garde la
  cadence », rouge au portail de la v371 et à celui-ci, VERTE rejouée seule des
  deux côtés à la v371 : un témoin de cadence sous la charge du portail), et
  `realisme.js` morte au départ sur « Jouer » « not stable » à une charge de
  4,86, AVANT tout témoin — rejouée seule : verte. Avant la correction du
  sursaut, sur `origin/main` (v371) : « un piéton frôlé sursaute » rouge
  (`sursauts: 0`, arrêt 3,92 s), « les passants se retournent vers un choc »
  rouge (0 tourné sur 6).
- [ ] **LE PORTAIL DE LA v371 (les passants traversent au feu), DOUBLE MESURE
  FAITE.** Premier portail (base v354) : deux rouges de `monte.js` étaient à
  MOI et sont corrigés dans la livraison — le témoin des traversées (une seule
  en soixante secondes à trois images par seconde : il PROVOQUE désormais la
  situation) et le réverbère (la voiture figée à zéro bloc par un passant qui
  traversait devant : le témoin fait le vide des passants). Portail après le
  rebase sur la v365 : mes trois témoins verts (6 traversées sur 6 au rouge,
  réverbère, zéro passant sur la chaussée à Rome) ; rouges : `monte.js`
  (chauffe de New York expirée à 54 sur 321, gel d'arrivée 1 417 ms · 32,7 % —
  déclarés rouges des deux côtés plus bas, v362), `manhattan.js` (façade
  22 326 → 54 969, dette connue des deux côtés) et `maj.js` cinq rouges (le
  loader d'installation, la préparation, le flou, et les deux témoins du
  palier à 25 images pour 383 ms la période). `maj.js` rejouée SEULE deux fois
  de chaque côté (`origin/main` v365, arbre détaché) : branche 41 verts / 0
  rouge puis 39 / 1 (« corps, programmes et fond de carte », programmes
  18/27) ; `origin/main` 41 / 0 puis 38 / 2 (le même, et le loader
  d'installation). Les deux témoins du palier ne reviennent pas seuls : ils
  manquaient d'images au portail (25 pour une fenêtre qui en réclame plus).
  La préparation est la même intermittence des deux côtés, et la livraison ne
  touche ni l'accueil, ni la chauffe, ni le palier.
  Après le rebase sur la v366 (portail de la v371) : mes trois témoins verts ;
  rouges `maj.js` (préparation, loader — ci-dessus), `carte.js` (flèche du GPS
  à gauche, 1,92 rad — intermittence déclarée), `manhattan.js` (façade, taxi
  « 🐴 Monter » — déclarés), `reseau.js` (« même circulation » : l'intermittence
  de la session circulation-vivante, non reprise ici), `washington.js` (l'Air et
  l'Espace) et `monte.js` (compilation à New York, trou en vol, recharge à
  l'arrivée, gel d'arrivée). Rejouées SEULES (`origin/main` v366) :
  `washington.js` verte des deux côtés ; `monte.js` compilation et gel rouges
  des deux côtés, trou et recharge verts des deux côtés, et « les passants ne
  sont plus plantés au milieu de la chaussée » ROUGE sur la branche (6 sur 21,
  29 %, une traversée en cours) et vert sur `origin/main` (2 sur 18). C'est la
  valeur même des rouges d'`origin/main` aux portails passés (5/21, 4/18,
  29 %) : la dette des passants sur la chaussée à Rome. La sonde qui sépare
  les cas (`sonde-chaussee-rome.cjs`, 60 s, deux fois de chaque côté) rend
  hors traversée 0 et 5 relevés sur ~1 800 sur la branche, 3 et 2 sur
  `origin/main` : aucun « né sur la chaussée », aucun flâneur. Le témoin lit un
  instantané au sortir du témoin précédent ; c'est le palier suivant.
- [ ] **TRAVERSER À LONDRES ET AUX PASSAGES DES VILLES ENGENDRÉES SANS FEU
  (v371).** Les passages peints sans feu ne sont lus qu'à Paris
  (`marquageParis`) ; ailleurs on ne traverse qu'au feu. Londres : 1 à 3
  traversées par minute au centre, parce que la plupart des coins n'ont pas de
  feu. À voir : `CITY_BLOCK.CROSSWALK` des villes engendrées.

- [ ] **LE PORTAIL DE LA v367 (I-95 Sud), DOUBLE MESURE FAITE.** Neuf suites,
  cinq rouges. `plafond.js` : l'empreinte des 490 morceaux, changée par la route
  dans les morceaux de Washington — relevée avec preuve (sans Washington,
  9bae2257… des deux côtés), verte rejouée seule. `degats.js` (voiture de la rue
  percutée puis prise) : verte rejouée seule des deux côtés — charge. `carte.js` :
  la flèche du GPS à gauche 1,92 rad rouge seule des deux côtés (dette déjà
  déclarée) ; la tâche de 417 ms ne revient pas seule. `manhattan.js` : façade
  (22 326 → 54 969 branche, 11 684 → 51 734 `origin/main`) et taxi rouges des deux côtés, délai de
  `rejoindre` des deux côtés. `monte.js` : gel d'arrivée et compilation à
  l'arrivée rouges des deux côtés ; « le monde se maille hors du fil
  principal » (avion à 28 blocs en 40 s au portail) vert seul ; « en vol, on
  ne rattrape pas le bout du monde » rouge seul sur la branche (Concorde 72) —
  l'intermittence déclarée plus bas, « rouge une fois sur deux DES DEUX CÔTÉS ».
  Après le rebase sur la v366 : `carteMonde.js` verte, l'empreinte relevée
  (7d235907…, sans Washington ad9949da… des deux côtés) verte ; « la surface
  coûte au plus quelques millisecondes par morceau de campagne » rouge deux
  fois seule sur la branche (13,3 · 11,0 ms), verte une fois sur `origin/main`
  (2,2) — sous node, ordre alterné, quatre passages : branche 2,8 à 11,2 ms,
  la branche SANS la route neuve 4,8 à 11,5, `origin/main` 3,3 à 6,5 — la même
  dispersion avec et sans la route (le seul fichier de `src/` lu par ce
  témoin qui change est routes.js) : le témoin de durée déjà déclaré ici en
  v362, pas la livraison.
  Preuve structurelle : la livraison n'ajoute de route qu'entre New York et
  Washington, et ces témoins volent au-dessus de Paris et du couloir (30000,
  30000).
- [ ] **LE PORTAIL DE LA v362 (I-95, porte de Manhattan), DOUBLE MESURE FAITE.**
  Portail complet : six suites rouges, dont une de mon fait (la borne de vingt
  pas du témoin des ponts, que Madrid ne passe pas — corrigée). Mes sondes de
  recherche ont tourné PENDANT une partie de ce portail : les durées de
  `plafond.js` (surface 7,1 ms) et de `carte.js` (glissement 449 ms) étaient
  la charge — vertes rejouées seules des deux côtés. Rejouées SEULES, branche
  puis `origin/main` (v358) : `carteMonde.js` et `plafond.js` vertes des deux
  côtés ; `manhattan.js` identique (façade 14 460 → 48 958, taxi « 🐴 Monter »
  jamais visible, délai à la ligne 654) ; `maj.js` fond de carte rouge des
  deux côtés (`origin/main` rend en plus le flou en préparation) ; `carte.js`
  la flèche du GPS à gauche rouge sur la branche (1,92 rad), verte sur
  `origin/main` à ce passage — intermittence déjà déclarée, la v362 ne touche
  pas au GPS ; `monte.js` : compilation à New York et gel d'arrivée rouges des
  deux côtés, la monoplace à 9,0/9,1 m/s (barre 9) des deux côtés, et « au
  volant, la voiture de l'enfant s'arrête devant un réverbère » ROUGE sur la
  branche (`parcouru 0`, la boucle s'arrête après dix relevés immobiles, soit
  une seconde — la conduite de la v358 accélère depuis zéro) et vert sur
  `origin/main`. Preuve structurelle qu'il n'est pas de la v362 : le témoin se
  joue dans Paris, `routeEn` est nul sur toutes les colonnes à 25 blocs de sa
  cible, et la v362 ne change que des colonnes de route et une route à New
  York. Piste : n'arrêter la boucle qu'après un premier mouvement, ou
  attendre l'allure de croisière (session conduite).
  Après le rebase sur la v360 : `carteMonde.js` toute verte (I-95, ponts,
  empreinte `5fa54c5c…`) ; `plafond.js` « la surface coûte au plus quelques
  millisecondes par morceau de campagne » rouge UNE fois (12,6 ms pour 1,7),
  verte rejouée seule (3,0) et sur `origin/main` (3,3) ; sous node, ordre
  alterné, 3,3 · 3,7 ms branche contre 3,6 · 3,3 `origin/main` — un témoin
  de durée qui tire, pas la livraison.
- [ ] **LE PONT QUI ENTRE DANS MANHATTAN (v362).** L'I-95 s'arrête sur la rive
  est, en face de l'île : sa porte est déclarée hors du rectangle (`BORNES`).
  Le pont lui-même demande deux choses qui ne sont pas des tracés : (1) que le
  profil d'une route lise le MÊME relief dans le worker (`World`) et dans le
  fil principal (`TerreUrbaine`) — par exemple un `SOL` de routes.js qui
  demande `surface()` de manhattan-plan.js dans le rectangle, pur et lu des
  deux côtés ; (2) que les morceaux du rectangle portant un ruban de route
  passent par le mailleur ordinaire (`hasVisualEdits`, manhattan-world.js)
  sans doubler l'eau et le sol que le rendu urbain dessine. Mesuré : le
  rectangle a ~60 blocs d'eau de chaque côté de l'île (Hudson, East River) et
  au nord ; un tablier de soixante blocs suffit.
  INSTRUIT EN v367, et c'est une décision d'architecture, pas un crochet. (1)
  est faisable par un crochet : `manhattan-plan.js` n'importe que blocks.js, donc
  `surface()` peut servir de `SOL` à routes.js dans le rectangle, à l'identique
  dans le worker et le fil principal (hors du rectangle les deux reliefs sont
  déjà identiques : 64 561 colonnes à l'ouest, seule la colonne x0 diffère, et
  elle est DANS le rectangle). (2) touche TROIS méthodes de `TerreUrbaine` :
  `generateChunk` réécrit toute colonne du rectangle avec `originalBlock`
  (les blocs de la route s'y perdraient), `visualChunk` efface tout ce qui est
  au-dessus de `SOL` sauf les blocs d'enfant, et `hasVisualEdits` rend faux pour
  un morceau entier du rectangle sans bloc posé (le mailleur ordinaire ne le
  voit pas). Mesuré sur le plan : l'Hudson fait 56 à 64 blocs de large de
  lz −300 à +600, le bord de l'île est une promenade (`p`) devant des lots, et
  la seule rue qui touche l'eau des deux côtés dans la fenêtre relevée est à
  lz = 0. Les deux portes de New York (I-95 à l'est, I-95 Sud à l'ouest, v367)
  sont prêtes à recevoir ce pont.
- [ ] **WASHINGTON PAR ANACOSTIA : LA RUE N'EST PAS RELIÉE À LA VILLE (v367).**
  L'I-95 Sud entre par la rue de u = 37 au sud de l'Anacostia (x −21191, de
  z 6197 à 6173) ; ce quartier (u 20–66, v 60–96) n'a AUCUN pont vers le reste
  de Washington — l'Anacostia le coupe en diagonale de (62, 44) à (−50, 98) —
  et ses voitures y font demi-tour sur une rue sans nom. La vraie ville a deux
  ponts là (11th Street, Sousa pour Pennsylvania Avenue SE, qui finit ici à
  (62, 42) sur la rive nord). Un pont de rue est du SOL de washington.js
  (`dansEauWashington`, `solWashington`), hors de la zone des routes : à faire
  avec la session qui tient Washington, puis allonger `avenues.washington`
  jusqu'à Pennsylvania Avenue SE. Relevé des autres côtés, pour ne pas le
  refaire : nord montagne (≥ 50), est crête 43–49 de u 73 à 121 (une route au
  niveau de la rue déblaierait douze blocs), ouest le Potomac dans la boîte ;
  la base d'Andrews (102, 281) ferme le sud-est.
- [x] **DEUX PONTS DE VILLE À REPRENDRE, VUS PAR LE TÉMOIN ÉLARGI (v362).**
  Réglés par le PLAN (v378, puis v387 qui la remplace) : à Agra c'était l'anneau qui passait dans le Taj
  Mahal et le Fort (un anneau ne traverse plus un monument), à Berlin l'anneau
  au tablier trop court n'est plus retenu, et la v381 couvre l'eau au-delà des bouts de tout tablier (437 encoches dans 49 villes). Le témoin lit désormais TOUTES les
  villes à pont (56) : il reste deux culées qui mordent dans un parc ou une
  colline, Séoul (2 pas, le rocher de Namsan) et Chicago (1 pas, un tronc près
  du Bean) — anneaux d'avant, mêmes valeurs sur `origin/main`, déclarées dans
  `DETTE_PONTS` et rattachées à la dette ci-dessous.
- [ ] **PORTAIL DE LA v418 (contour dans l'autre sens, rues du Strip), sept
  suites, joué sur la v416 fusionnée.** Verts `parishd.js`, `carteMonde.js`
  (deux témoins neufs, rouges sur `origin/main`), `plafond.js`. Rouges, tous
  déjà déclarés : `maj.js` libération et les deux témoins du palier (« range
  son verdict », « le TRAVAIL d'une image » — rouges une fois sur deux seuls) ;
  `carte.js` appui long (deux) et glisser (429 ms) ; `monte.js` (56 min,
  machine chargée) : flâneur, piéton frôlé, programmes, réverbère de Paris,
  « on ne rattrape pas le bout du monde », flanc frôlé — tous vus aux portails
  ou aux passages seuls précédents —, et « un mur pris de face » (rebond
  −1,89), au couloir vide (41 090, 40 988) : aucune ville engendrée à moins de
  200 blocs, donc hors de la livraison par construction (elle ne change que le
  sol de Las Vegas et des contours d'anneaux).
- [ ] **LES ANNEAUX D'AVANT ROULENT PARFOIS HORS DE LA CHAUSSÉE (mesuré v387,
  repris v404, v418).** v418 : 2 257 → 1 228 pas, 87 → 75 anneaux (contour
  dans l'autre sens, rues autour du Strip : Las Vegas 689 → 21). Reste, mesuré :
  Rio (446 : la forêt de Tijuca au sud-ouest des deux grands anneaux, ~16 îlots
  à retirer, au-delà de la borne de 12 du contour — la relâcher ne change rien,
  mesuré —, et la bande de Copacabana), puis des anneaux de la phase 1 qui
  traversent encore la place (Tokyo, Bangkok, Séoul, Shanghai, Dubaï, São
  Paulo, ~25-30 pas chacun) : leur contour éloigne la voiture du centre
  au-delà de `VU_ANNEAU` (30 blocs) ; Agra #1 (42, parc), Los Angeles (39),
  Lisbonne (33, un lot). Ancien texte : Ils CONTOURNENT désormais (phase 4, `contourner`) : 147
  anneaux et 3 512 pas hors chaussée sur `origin/main` v389, 92 et 2 437 en
  v404 (fontaines 167 → 82). Ce qui reste, mesuré par la sonde de la v404 :
  Las Vegas (le désert hors de la bande du Strip, 689 pas : la bande ne tient
  qu'UNE rue de la trame, 16 unités de fiche pour un pas de 32 blocs, donc
  aucun anneau ne peut y tenir — le remède est de SOL, des rues à travers le
  désert), Rio (la plage de Copacabana en bande sur toute la ville, 589), puis
  des anneaux dont tout contour coupe une rivière sans tablier (Rome, Moscou,
  Delhi) ou gêne un autre anneau au-delà de la barre de partage. Pistes : pour
  Las Vegas et Rio, des anneaux choisis DANS la bande (une sélection, donc
  mesurer la couverture) ; pour les rivières, un contour qui publie son tablier
  (un tablier neuf est du sol : Rome est dans l'empreinte des 490 morceaux).
- [ ] **PORTAIL DE LA v414 (les tabliers s'allongent), DOUBLE MESURE FAITE.**
  (Portail joué sur la v408 fusionnée ; `origin/main` est passée à la v413
  pendant la double mesure. Après la fusion, rejouées SEULES sur le code
  fusionné : `carteMonde.js` et `plafond.js` vertes, empreinte des 490
  morceaux inchangée (863d4203…). Les v409-v413 ne touchent pas
  `villesmonde.js` ; leurs suites ont été jouées par leurs sessions. Fait pour
  sortir de la course aux numéros, comme la v357 ; le prochain portail complet
  le confirme.)
  Sept suites. Verts : `parishd.js`, `carteMonde.js` (deux témoins neufs),
  `plafond.js` (empreinte relevée). Rouges, tous déjà déclarés : `maj.js`
  libération `null` et « ne floute rien » ; `carte.js` appui long (deux témoins)
  et glisser bridé ×4 (484 ms). `monte.js` au portail : 16 rouges en 60 min
  (machine chargée, avions et conduite). Rejouée SEULE : `origin/main` (v408)
  3 rouges (« elle ralentit assez pour qu'on la rejoigne », programmes à
  l'arrivée, flanc frôlé d'une voiture de la rue) ; branche 6 rouges (passant
  lancé sur la voiture — dette v277 —, la rue à l'allure d'une ville,
  programmes, réverbère de Paris `parcouru 0,18`, nature `d 18,8`, flanc
  frôlé). Les deux qui diffèrent (réverbère à (−313, 382), nature à
  (−600, −520)) sont prouvés hors de la livraison PAR CONSTRUCTION : aucune
  ville engendrée à moins de 150 blocs, et sol et tabliers identiques entre
  les deux arbres sur 181 202 colonnes (sonde `struct.mjs`) ; les circuits de
  toutes les villes engendrées sont identiques au bit près. Intermittences de
  conduite à démonter par distribution (v269) — chantier conduite.
- [x] **DES ANNEAUX D'AVANT ROULENT SUR L'EAU HORS DE TOUT TABLIER (v404) — RÉGLÉ EN v414** : les tabliers s'allongent sous la voie (`traverseesDe`, allongements `ext`), 159 → 0 pas, aucune colonne perdue ni changée, 1 485 gagnées sur l'eau. La
  règle de la v387 (`horsChaussee`) tenait toute eau sous un anneau pour un
  pont : 159 pas sur l'eau sans tablier en v404 (195 sur `origin/main`), dont
  des anneaux de la phase 2 bis. Le contrôle strict (`surUnTablier`) est
  appliqué aux contresens et aux contours ; l'appliquer à la phase 2 bis est
  mesuré : il retire des anneaux ET leurs tabliers (Vienne 212 colonnes,
  Shanghai 502) — un enfant a pu bâtir dessus. Le remède est d'ALLONGER ces
  tabliers (`traverseesDe` sur la voie, comme le contresens), en vérifiant
  l'empreinte des 490 morceaux.
- [ ] **PORTAIL DE LA v416 (San Diego), sept suites.** Verts `parishd.js`,
  `carteMonde.js`, `plafond.js`. Rouges déjà déclarés : `maj.js` (libération
  `null`, « ne floute rien »), `carte.js` (glisser bridé ×4, 501 ms) ;
  `monte.js` (20 min) : piéton frôlé, rue de Paris à l'allure d'une ville,
  programmes à l'arrivée — les trois vus au portail ou sur `origin/main`
  rejouée seule pour la v414 (ci-dessous) ; la livraison ne change QUE le
  contresens de San Diego (sonde : aucune autre ville, aucun tablier, aucun
  sol).
- [ ] **DEUX VILLES ENGENDRÉES N'ONT QU'UN CIRCUIT (v387 : onze ; v404 :
  trois ; v416 : deux — San Diego a son contresens).** Mesuré en v416 : à San
  José et Guayaquil la place occupe le nœud central, ses quatre demi-rues sont
  fermées, et le grand anneau est le SEUL cycle de la trame (3 × 3 nœuds dans
  le disque). Son contresens roule sur la voie extérieure : à San José elle
  longe la mer sur une quarantaine de blocs (plus que `PONT_MAX`, un quai sur
  pilotis serait du sol), à Guayaquil la plage (11 pas). Remèdes, tous de SOL,
  donc décision de Max : un rayon de fiche plus grand, une place non décalée
  ou plus petite, un quai sur pilotis. Ancien texte : Huit ports ont reçu leur contresens (quai toléré, tablier mesuré
  sur sa voie). Restent San Diego, San José et Guayaquil : leur contresens
  touche la fontaine de la place déplacée (San José, `place` à décalage) ou la
  plage (Guayaquil) que leur seul anneau traverse déjà. Pistes : un rayon de
  fiche plus grand (le SOL, décision de Max) ou une place non décalée pour ces
  trois (le sol aussi).
- [ ] **LA v358 (conduite) N'A PAS REJOUÉ LE PORTAIL ENTIER APRÈS LA FUSION
  DE LA v357** : dernier portail complet sur la v356 fusionnée (rouges
  ci-dessous, tous déclarés) ; la v357 ne touche que villesmonde, world,
  echelle-monuments et dcmonuments, aucun fichier de la conduite, et le seul
  fichier commun, `tests/plafond.js`, a été rejoué seul sur le code fusionné :
  108 verts, zéro rouge. Fait pour sortir de la course aux numéros (quatre
  fusions de `main` pendant quatre portails). Le prochain portail complet le
  confirme.

- [ ] **PORTAIL DE LA CONDUITE (sur la v355 fusionnée)** — deux rouges neufs, ni
  l'un ni l'autre de la conduite. (1) `plafond.js` « engendrer et mailler moins
  cher ne change ni un bloc ni un sommet » : empreinte `69381f2e…` pour une
  référence `b31099b9…` (v351). Calculée sur `origin/main` (v355) :
  `69381f2e…` à l'identique — ce sont les deux routes neuves de la v355
  (Toronto–Montréal, Cologne–Hambourg), lues par le balayage « toutes les
  routes ». La référence se relève sur la v355 si la session des routes
  confirme que seul `routeEn` a bougé ; et l'égalité branche = `origin/main`
  prouve que la conduite ne change ni un bloc ni un sommet — RÉGLÉ par la v357, qui a
  relevé la référence (`3cc39830…`, vert sur la v358 fusionnée). (2) `degats.js`
  « enfoncer coûte quelques millisecondes » : premier choc 31 ms pour une
  barre de 30 au portail ; rejouée seule, branche 15,6 et 17,6 ms,
  `origin/main` 12,8 ms — un coût de charge. Le reste (gel d'arrivée,
  programmes de NY, appui long de `carte.js`, façade et taxi de Manhattan)
  est déjà déclaré ci-dessous.

- [ ] **PORTAIL DE LA CONDUITE (après la fusion avec la v354)** : rouges
  `monte.js` gel d'arrivée (2 350 ms · 20,6 %, dette ci-dessous),
  `manhattan.js` façade (17 102 → 51 734), taxi (bouton jamais visible) et
  PeerJS « Lost connection » (déclarés), et `maj.js` « le loader ne s'efface
  qu'une fois les corps et les programmes prêts » (20/27 programmes à 1 252 ms
  au portail) — rejoué SEUL sur la branche : vert, 27/27 à 3 161 ms ; c'est
  l'intermittence déjà mesurée rouge une fois sur quatre sur `origin/main`
  (tableau plus bas). Le témoin neuf « une voiture neuve n'hérite pas du
  dernier choc » est vert au portail.

- [ ] **AU PORTAIL DE LA v358 (la conduite), LES ROUGES RESTANTS SONT DÉJÀ
  CONNUS, rejoués SEULS des deux côtés.** `monte.js` « l'écran ne se fige pas
  en arrivant sur une ville » (vol du chasseur, chemin que la v358 ne touche
  pas) : branche 1 283 ms · 7,2 % et 1 183 · 8,7 %, `origin/main` 1 050 · 5,9 %
  et 1 150 · 6,4 % (ordre alterné), et rouge à chaque `monte.js` complet des
  deux côtés (3 417 ms · 27,1 % sur `origin/main`). `monte.js` « se
  téléporter dans une ville ne compile plus de programmes » : trois puis six
  programmes physiques à Paris dans la suite complète, sur la branche ET sur
  `origin/main` ; vert quatre fois sur quatre rejoué seul (deux de chaque
  côté) — une intermittence de charge. `monte.js` « le bouton Conduire
  s'offre tout seul dans la rue » : rouge une fois au portail (un métro plus
  proche, « 🚇 Monter à bord »), vert aux deux `monte.js` complets précédents
  sur la branche et vert sur `origin/main`. `maj.js` « le loader dit combien
  de fichiers sont rangés » et `washington.js` « chaque îlot a sa porte » :
  verts rejoués seuls des deux côtés. `manhattan.js` : « le trou enlève aussi
  la géométrie visible » rouge des deux côtés (14 460 à 25 316 → 51 734), et
  la suite s'arrête des deux côtés sur l'attente de 90 s après le
  rechargement (même ligne, même délai) ; le taxi, qui ne pouvait PAS rouler
  huit blocs en quinze secondes de montre à 0,45 image par seconde
  (sonde : 18 et 19 images en quarante secondes, l'ancienne voiture 6 blocs,
  la nouvelle 3,3), se mesure désormais en quarante images rendues — vert.
  Dernier portail (57 min, 9 suites) : tous les témoins de la conduite verts ;
  rouges `monte.js` l'arrivée sur une ville (2 017 ms · 18,7 %), `manhattan.js`
  la façade (11 684 → 51 734) et le taxi (« bouton jamais visible », une bête,
  rouge des deux côtés), `carte.js` l'appui long (quatre refus « pointeurs
  0 », la dette de la v258) — rejouée SEULE : branche verte au premier appui,
  `origin/main` (v348) verte au deuxième, le premier refusé pareil.
  `manhattan.js` « les deux clients restent sans erreur de jeu » (PeerJS
  « Lost connection to server ») : vu rouge une fois sur la branche, NON
  comparé sur `origin/main` — la suite s'y arrête plus tôt (attente de 90 s
  après rechargement, puis une attente de 30 s avec le témoin recopié). Un
  courtier qui perd la connexion n'est pas du code de conduite (la v358 ne
  touche ni `net.js` ni le banc réseau) ; à rejouer sur `origin/main` le jour
  où la suite y va jusqu'au bout.
- [ ] **LE PORTAIL DE LA v352 (le coût d'un morceau), DOUBLE MESURE FAITE.**
  Treize suites vertes, dont `plafond.js` et ses deux témoins neufs. Rouges,
  chacun rejoué SEUL des deux côtés (`origin/main` v348, arbre détaché) :
  `manhattan.js` — trou de façade 11 684 → 51 734 sur la branche, 14 326 →
  51 734 sur `origin/main`, et la suite meurt sur le MÊME `locator.tap`
  (30 s) des deux côtés ; au portail s'y ajoutaient le taxi (bouton jamais
  visible) et `PeerJS: Lost connection`, déjà déclarés. `monte.js` — l'arrivée
  figée, seul rouge, 18,6 % au-delà de 300 ms au portail (branche), 25,4 % sur
  `origin/main` seul. `reseau.js` — « un hôte sans courtier est trouvé » et
  « il le REJOINT » au portail ; rejouée seule, **verte des deux côtés** :
  l'intermittence déjà déclarée. `maj.js` — le badge (version servie v348 au
  portail, avant le bump) et le loader qui compte ses fichiers (rouge au
  premier passage, vert à la reprise). La livraison ne touche ni Manhattan,
  ni le réseau, ni le rendu : seulement le générateur et le mailleur, dont
  l'empreinte (blocs et tampons) est celle d'`origin/main`, bit pour bit.
- [ ] **LE PORTAIL DE LA v354 (Manhattan au long cap), DOUBLE MESURE FAITE.**
  Portail : `degats.js` (programmes au feu 93 → 92), `maj.js` et
  `manhattan.js` (déjà déclarés), et cinq rouges de `monte.js` — la rame qui
  ralentit (9,1 m/s), « Conduire cette voiture » non proposé (rame à portée),
  les passants sur la chaussée à Rome (5 sur 21), la téléportation sans
  compilation, le gel d'arrivée. Rejouées SEULES des deux côtés (v351) :
  `degats.js` vert/vert ; Rome vert/vert (1 et 0 sur la chaussée) ; trou en
  vol et gel d'arrivée rouges/rouges ; la téléportation rouge sur la branche
  seulement, avec ZÉRO programme neuf partout — c'est la garde `images > 10`
  qui tombe (Paris 6 images contre 12 sur `origin/main`), donc la cadence du
  banc. Preuve structurelle : le diff n'atteint que le site urbain (New York) ;
  partout ailleurs `piedPieton` rend `undefined` et `trottoirA` est inchangé.

- [ ] **LE PORTAIL DE LA v351 (les piétons rapides), DOUBLE MESURE FAITE.**
  Rouges de portail déjà déclarés : `maj.js` « corps, programmes et fond de
  carte », `manhattan.js` (trou de façade 27 926 → 51 734, `#ride-btn` caché,
  `PeerJS: Lost connection`), `monte.js` « l'écran ne se fige pas en arrivant
  sur une ville » (1 550 ms · 25,4 %). Un rouge NON déclaré jusqu'ici, et c'est
  une intermittence : `reseau.js` « deux tablettes d'une partie voient la même
  circulation, au même endroit ». Portail (branche) : médiane 37,1 blocs, pire
  63,6. Rejouée SEULE : `origin/main` v348 **rouge**, 35,0 · 62,2 ; branche
  **verte**, 5,9 · 14,2. Les deux régimes existent des deux côtés ; à trouver :
  ce qui fait diverger l'horloge de la rue (v305) d'une tablette à l'autre une
  fois sur deux. La livraison ne touche ni `vehicules.js` ni l'heure de la rue.
  **CAUSE TROUVÉE ET CORRIGÉE EN v395** : l'hôte annonçait l'heure de rue sur
  un compte à rebours en `dt` borné — une fois par demi-minute à deux images
  par seconde ; l'annonce se cadence désormais en temps réel, et un témoin
  fait ramer l'hôte pour la compter.

- [ ] **LE PORTAIL DE LA v346 (le monde à la vitesse), DOUBLE MESURE FAITE.**
  Portail : `manhattan.js` (délai ligne 282) et `monte.js` « l'écran ne se
  fige pas en arrivant sur une ville » (2 833 ms · 46,4 %). Rejouées SEULES :
  `manhattan.js:282` identique des deux côtés ; l'arrivée rouge des deux
  côtés, MOINS grave sur la branche (983 ms · 20,1 %) que sur `origin/main`
  v340 (3 700 ms · 28 %). La branche seule a rendu deux rouges de plus, déjà
  déclarés comme intermittents : les programmes à la téléportation (chauffe de
  New York expirée, 53/321) et « la voiture freine devant un piéton »
  (`voituresRue: 0`, avance 3,4 : la situation n'a pas eu lieu ; vert aux
  quatre portails de la branche). Preuve structurelle : en rendu logiciel,
  l'ordre de file de la v346 est celui d'avant au bit près (`fileAuRegard`) ;
  seul s'ajoute le suivi du déplacement, de l'arithmétique sur la position.
  Dernier portail, sur la fusion avec la v343, puis la v345 : les deux témoins de la file
  verts (écart 0,32) ; rouges, tous déjà déclarés avec leur double mesure —
  le loader qui compte ses fichiers (`maj.js`), la façade et le taxi
  (`manhattan.js`), « la monoplace ralentit assez » (9,1 m/s, identique sur
  `origin/main`), le bouton « Conduire » (un métro à portée), les programmes à
  la téléportation et l'arrivée sur une ville (2 267 ms · 26,4 %).
- [ ] **LE COÛT D'UN MORCEAU DE VILLE : PROFIL PLAT APRÈS LA v391.** Mesuré sous
  node (monde neuf, 117 morceaux engendrés, 77 maillés sans HD) : Paris 4,4 ms
  de génération et 7,2 de maillage par morceau, Rome 3,5 et 9,9, Londres 4,5 et
  10,7. Profil `--cpu-prof` de Londres, temps propre : `generateChunk` 10,5 %,
  `buildChunkTampons` 9,3 %, ramasse-miettes 7 %, `terrainHeight` 5,1 %,
  `addFace` 3,5 %, `solLondresCalcul` 2,5 %, `chunkTop` 2,4 %, `hauteurTerre`
  2,4 %, `cityAtParmi` 1,9 % — aucun poste ne domine. La méthode « une ligne à
  la fois » de la v352 n'a plus de ligne lourde à prendre : le prochain gain
  est de structure (moins de faces émises, moins d'allocations dans le
  mailleur), à prouver par l'empreinte des 490 morceaux. Et le chemin HD du
  mailleur est la zone de claude/hd-villes-europe.
- [ ] **LE PLAFOND AU SOL SUR L'IPAD — LA MARCHE POUR MAX (v391).** Le banc
  ne peut pas relever `VITESSE_SOL_MAX` (ville 70, campagne 80) : il rend en
  logiciel, à une cadence qui n'est pas celle de la tablette. `?diag=1` affiche
  désormais, en roulant, une ligne « roulage : V b/s · trou devant T blocs ·
  débit D morceaux/s · file F · ordre … · recharge … », et le journal de bord
  la range toutes les cinq secondes (`roulage: { v, trou, debit }` dans
  `journal_appareil`) — je peux donc la relire sans que Max ne recopie rien.
  La marche, sur l'iPad de la maison, étendue « Auto » :
  1. ouvrir `https://minecraft-fam.vercel.app/?diag=1`, jouer, ouvrir la carte,
     se téléporter au centre de **Paris**, attendre que le compteur de morceaux
     ne monte plus (une dizaine de secondes) ;
  2. prendre une voiture de la rue (« Conduire »), choisir une grande avenue
     droite (les Champs-Élysées, ou le boulevard Haussmann), pleins gaz dix
     secondes ;
  3. relever trois fois la ligne « roulage » (capture d'écran) : la vitesse, le
     trou, le débit ; et la première ligne (images par seconde, pire image) ;
  4. refaire la même chose en **campagne**, sur l'A1 (la carte, « A1 »), à
     pleins gaz ;
  5. si l'avion est plus simple : un vol bas au-dessus de Paris donne le même
     trou (la vitesse est plus haute, ce qui dit le plafond par l'autre bout).
  Ce qui décide : le plafond tient si le trou reste au-dessus de **deux
  secondes de route** (à 70 b/s, 140 blocs) ; s'il tombe sous une seconde,
  le plafond doit baisser pour ce palier ; s'il reste au-dessus de 190 (le
  bord du disque à rr 12), il peut monter. Le débit dit pourquoi : sous ~50
  morceaux par seconde la file attend l'image (ordre en cône utile, v380),
  au-dessus de 90 le worker suit. Sans session de ma part : le journal du
  nuage garde les relevés, je les relirai à la prochaine.
- [ ] **LE PLAFOND DE VITESSE AU SOL EST MESURÉ ET PUBLIÉ (v346) — À APPLIQUER
  PAR LA CONDUITE, ET À CONFIRMER SUR LA TABLETTE.** `src/plafond-sol.js` :
  `VITESSE_SOL_MAX` = 60 b/s en ville, 70 en campagne et sur l'autoroute ;
  `plafondSol({ ville, rr })` le borne par le disque (60 partout au palier bas,
  rr 8). Critère : le monde maillé dans le champ de la caméra (±40°) jusqu'à
  deux secondes de route, médiane de six relevés en régime établi
  (`tests/sonde-monde-a-la-vitesse.cjs`). Le « 42 morceaux par seconde » qui
  bornait `ALLURES` à 28 b/s datait d'avant le worker : en roulant, 43 à 58 en
  ville, 54 à 78 en campagne. Reste : (1) la session conduite lit `plafondSol`
  pour relever `ALLURES` — ce n'est pas à cette zone de changer les vitesses ;
  (2) le banc rend en logiciel à 11-20 images par seconde et la file se
  recharge une fois par image : sur l'iPad, mesurer le trou en roulant
  (`?diag=1`) et la cadence à 60 b/s avant de croire que la cadence tient — les
  millisecondes du worker et de rendu ne se transposent pas, l'ordre et les
  nombres de morceaux oui ; (3) ~~le coût d'un morceau dans le worker~~ —
  **fait en v352** : Paris 8,3 → 3,3 ms, Rome 10,5 → 4,1 sous node, sortie
  identique (empreinte de `plafond.js`). Au banc la ville ne suit toujours pas
  80 b/s (Paris 125, Rome 129–138, A1 158 pour 160) : le débit y plafonne vers
  55 morceaux par seconde en ville DES DEUX CÔTÉS, donc ce n'est plus le worker.
  ~~Pistes, non mesurées : l'installation des géométries sur le fil principal en
  ville, et la recharge de la file une fois par image~~ — **mesurées et réglées
  en v360** : installation 0,1 à 0,9 ms par morceau, transit 2 à 8 ms, worker À
  SEC 55 à 72 % du temps ; la boucle comptait chaque demande deux fois (quatre
  en vol pour « huit »). Recharge à l'arrivée en roulant vite, quatre en vol :
  Paris 53 → 116 morceaux/s, Rome 58 → 120, et 80 b/s tient à Paris, Rome, A1
  et campagne (176–192 pour 160) ; Londres 148–152, 182–192 à 70 — cause NON
  mesurée : son worker coûte autant que Paris (6,4 ms contre 6,3–7) et reste à
  sec 23–28 %. Plafond publié : **ville 70, campagne 80**. La cadence
  du banc tombe en ville de 14 à 5 images/s — c'est le DESSIN de la ville
  (scène vide : 51–57 contre 53–57) ; sur l'iPad, **relire la cadence à 70–80
  b/s dans Paris avec `?diag=1` avant de monter `ALLURES`**. ~~Reste : pourquoi
  Londres plafonne à 70~~ — **mesuré en v379** (`sonde-londres.cjs`) : ni
  l'eau (3 % des morceaux), ni la file (les manquants « absents » sont au bord
  du disque, la file refaite un morceau plus tôt), ni le worker en moyenne —
  le CENTRE de Londres, pile au milieu du trajet, porte 64 % de faces de plus
  que celui de Paris et une génération 70 % plus chère. `solLondres` mémoïsé
  (2,8 → 2,1 ms) ; au banc 145–151 contre 137–152 : le plafond ville reste à
  70. Le reste est la géométrie de la ville (faces), pas un défaut ;
  ~~la recharge forcée après une téléportation~~ — **armée en v379**, dans
  une fenêtre de dix secondes après un saut, hors rendu logiciel (scène vide :
  57 images/s et 4,1–4,4 s des deux côtés). À relire sur la tablette :
  `?recharge=arrivee&diag=1` contre `?recharge=image&diag=1`, se téléporter à
  Paris, pire image et cadence pendant les dix premières secondes. Les trois non-résultats de la file (borner la pose, file en
  temps, deux mailleurs) et la file de seize (v269) restent écartés. Sur
  l'iPad, deux fois moins de calcul par morceau est un fait, mais le plafond
  ne se relève que sur une mesure `?diag=1` en roulant ; (4) un lot déjà parti au worker ne
  s'annule pas quand on le dépasse — **mesuré en v379** : 0 à 6 morceaux sur
  400 à 700 arrivent derrière l'enfant à 80 b/s, zéro refusé, moins de 1 % :
  laissé.

- [ ] **AU PORTAIL DE LA v360 (la recharge de la file), LES AUTRES ROUGES SONT
  DÉCLARÉS, rejoués SEULS des deux côtés.** `monte.js` « l'écran ne se fige pas
  en arrivant sur une ville » : branche 1 367 ms · 21,7 %, `origin/main` 2 350 ms
  · 20,5 % — **démonté en v379** (`sonde-arrivee-ville.cjs`) : c'est le dessin
  SwiftShader, le témoin rend désormais une scène vide (vérifié rouge en
  désarmant la v235) ; reste à relire le vol vers Paris sur la tablette
  (`?diag=1`, pire image) ; « se téléporter ne compile plus de programmes » : branche rouge
  (chauffe de New York expirée, 75/321), `origin/main` vert ce passage — rouge
  à 68/320 et 55/321 aux portails précédents, témoin AVANT celui de la v360 et
  sur une autre page ; « 🛬 descend train sorti… freine jusqu'à l'arrêt » rouge
  au portail seulement (arrêt à x 303 sur 300), vert seul. `maj.js` : rouge des
  deux côtés sur le loader et « corps, programmes et fond de carte » (palier
  rouge au portail, vert seul). `carte.js` : la flèche du GPS, rouge seule sur
  la branche, verte sur `origin/main` — l'intermittence déjà déclarée, dans un
  module (`gps.js`) que la v360 ne touche pas.

- [ ] **AU PORTAIL DE LA v379 (l'arrivée après la carte), QUATRE SUITES ROUGES,
  rejouées SEULES des deux côtés** (branche rebasée sur la v364, `origin/main`
  f7f34d3). Aucune n'est causée par la livraison, dont tout ce qui touche la
  file est inerte en rendu logiciel. `maj.js` : le loader et « corps,
  programmes et fond de carte » (puis « ne floute rien », qui en dépend),
  rouges à l'identique des deux côtés. `manhattan.js` : la façade
  (9 203 → 42 919) et le taxi tactile (« 🐴 Monter », bouton jamais visible),
  identiques des deux côtés. `carte.js` « et la faire glisser non plus
  (bridé ×4) » : 411 et 451 ms sur la branche, 415 au portail précédent et 369
  sur `origin/main` — l'intermittence déjà déclarée, autour de sa barre (400).
  `monte.js` « se téléporter ne compile plus de programmes » : chauffe de New
  York expirée des deux côtés (43 et 53/321 branche, 55/321 `origin/main`).
  Deux témoins réparés au passage, parce que leur barre tombait SUR la
  mesure : « voler une demi-minute ne remplit pas la mémoire » (parcours
  490 · 494 branche, 528 `origin/main`, garde 500 → 250, rejoué 700) et
  « rendue dans une scène vide, la recharge garde la cadence » (une paire,
  0,726 branche contre 0,753 `origin/main` pour 0,75, recharge FORCÉE des deux
  côtés → deux paires ABBA, rejoué 0,79). Et `plafond.js` « la surface
  coûte » : rouge au premier portail (10,8 contre 2,5), vert six fois de suite
  ensuite des deux côtés (écarts 1,0 à 2,2 ms) — `solLondres` n'est jamais
  appelé pour ce morceau de campagne ; l'écart se prend désormais par paire
  alternée (désarmé de 6 ms : rouge, 7,2).

- [ ] **LES DÉGÂTS (v343) : CE QUI RESTE, DÉCLARÉ.**
  - ~~Cinquante-quatre appels de dessin pendant un feu~~ — **fait en v348** :
    deux `InstancedMesh`, 30 → 2 appels mesurés, gardé par un témoin. Le coût
    RÉEL sur la tablette se mesure depuis la v364 (journal de bord et
    `?diag=1`) : reste à le LIRE sur l'iPad de Max, une voiture qu'on fait
    brûler, et à décider sur ses chiffres.
  - ~~La carcasse n'est vue que par celui qui conduisait~~ — **fait en v356**
    (le receveur garde l'épave).
  - ~~Les voitures de la rue ne s'abîment pas~~ — **fait en v356** ; la
    voiture prise qui repartait neuve et l'ami qui ne voyait pas les
    enfoncements de SA rue — **faits en v363** (l'histoire suit, `rue_choc`).
    ~~Un hôte resté sur l'ancienne version ne relaie pas `rue_choc`~~ —
    **fait en v374** : l'histoire récente voyage aussi dans la position, que
    tout hôte relaie telle quelle, et le receveur ne l'adopte que si la
    sienne en est le début (idempotente). Reste, déclaré : deux amis qui
    percutent la MÊME voiture par un ancien hôte ont deux histoires qui
    divergent — chacun garde la sienne.
  - Le témoin « aucun programme compilé au feu » lit les clés depuis la
    v363 (le compte baissait : 93 → 92, 97 → 96). ~~« Enfoncer coûte
    quelques millisecondes » mesure le processeur partagé~~ — **repointé en
    v374** : part des sommets déplacés (25,6 %, barre à la moitié), zéro
    normale réécrite hors d'eux (63 avec `computeVertexNormals`, vérifié
    rouge), rien par image ; les ms restent dans le message.
  - ~~Le garage n'est éprouvé que par `reparer`~~ — **fait en v356** : un
    témoin par le trajet (descendre dedans, remonter).
  - ~~**Le contrat avec la physique** attend la session
    « conduite-physique »~~ — arrivé en v358, **éprouvé bout à bout en
    v374** par la vraie physique (mur de face : un choc publié, pris par ce
    chemin seul, l'avant seul froissé, l'effet appliqué une fois). Le repli
    de vitesse ne sert plus en jeu (`chemins().repli` reste à zéro) : il est
    GARDÉ pour l'ancien chemin — une physique qui ne publierait pas — et sa
    règle (`detecterChoc`) reste gardée par le témoin pur de `degats.js`.
  - **Les avions ne s'abîment pas** (`pilote` est écarté) : une décision, pas
    un oubli — un atterrissage manqué n'a pas de « choc » dans `player.js`.

- [ ] **AU PORTAIL DE LA v374 (le battement qui relit, le contrat des dégâts
  éprouvé, les chocs de la rue par la position), CINQ SUITES ROUGES — une à
  moi, réglée par le bump ; les autres déjà déclarées, double mesure faite.**
  - `maj.js` « le badge de version ouvre le journal… » : la tête du journal
    (365) devant la version servie (364) — le bump de `sw.js`, fait à la
    fusion. « Quand il se libère… fond de carte » : la famille déclarée.
  - `visio.js` « caméra éteinte, le jeu reprend sa voix normale » : rejouée
    SEULE, VERTE sur la branche (26/26) et ROUGE sur `origin/main` (0,0177) —
    la famille déclarée en v363, des deux côtés.
  - `reseau.js` « un départ propre nettoie tout le monde » (et au second
    passage « un hôte sans courtier est trouvé », déclaré) : rejouée seule,
    branche rouge 2/2, `origin/main` rouge 1/2 (« hôte ["Alice","Nina"] »
    identique) — la famille intermittente des deux côtés (table de la v285).
    Passages courts alternés (la suite arrêtée après ce témoin) : branche
    1/4, `origin/main` 0/2, branche SANS le battement qui relit 0/2. Total à
    ce témoin : branche 4/7, `origin/main` 1/4 — même rouge, même message,
    écart non significatif sur onze passages ; on ne le classe pas réglé, on
    le déclare avec ces chiffres. Preuve structurelle : le départ
    se lit sur `remotePlayers` ; la v374 n'ajoute au message `pos` qu'un
    champ `rc` ABSENT tant qu'aucune voiture de la rue n'est percutée (aucune
    dans `reseau.js`), et le battement des réglages n'écrit que dans
    `player_prefs`.
  - `manhattan.js` (trou de façade, taxi, PeerJS) et `monte.js` (chauffe de
    New York 53/321, gel d'arrivée 38 %) : les familles déclarées aux
    portails des v356 à v364, aucune ne lit les réglages ni les dégâts de la
    rue.
  - SECOND PORTAIL, après rebase sur la v369 : `degats`, `reglages`,
    `visio`, `hote`, `washington` VERTS. Rouges : `maj.js` (loader, flou —
    déclarés), `carte.js` (la flèche du GPS à 1,92 rad, déclarée v327 ; le
    glissé bridé 418 ms, déclaré v364), `manhattan.js` (trou, taxi),
    `reseau.js` (départ propre, voir plus haut) et `monte.js` : passants de
    Rome sur la chaussée (le tirage déclaré), téléportation qui compile, trou
    en vol, gel d'arrivée, et « rendue dans une scène vide, la recharge à
    l'arrivée garde la cadence » (v360, 6,5 contre 9,9 images/s). `monte.js`
    REJOUÉE SEULE des deux côtés (v369 dans un arbre détaché) : la scène vide
    VERTE des deux côtés — un rouge de charge ; le gel d'arrivée rouge des
    deux côtés ; la téléportation qui compile et le trou en vol rouges sur la
    branche seule à ce passage, familles déclarées (rouges des deux côtés en
    v363–v364, intermittent pour le second). Aucune ne passe par le champ
    `rc` (aucune voiture de la rue percutée) ni par les réglages.

- [ ] **AU PORTAIL DE LA v364 (le coût des dégâts dans le journal), CINQ
  SUITES ROUGES — une à moi, corrigée ; les autres déjà déclarées.**
  - `degats.js` « le contrat avec la physique » : la vraie physique (v358) a
    publié un choc pendant la chute simulée, et le témoin le prenait pour le
    repli. Repointé (il compte les chocs publiés), vert seul, rouge repli forcé.
  - `maj.js` (le loader, le flou), `carte.js` « la faire glisser (bridé ×4) »
    (657 ms), `manhattan.js` (trou de façade, taxi), `monte.js` (téléportation
    qui compile, chauffe de New York 55/321 ; gel d'arrivée 34,6 %) : les
    familles déjà déclarées plus haut, rouges des deux côtés à la v362. La
    livraison n'ajoute qu'une lecture dans le relevé du journal et une ligne
    de `?diag=1`, ni carte, ni loader, ni rendu.

- [ ] **AU PORTAIL DE LA v363 (les coups suivent la voiture), CINQ SUITES
  ROUGES — aucune causée par la livraison, double mesure faite (rejouées SEULES
  sur la branche et sur `origin/main` v358, arbre détaché).**
  - `reglages.js` « un choix fait sur une tablette part au serveur » et ses
    deux suivants (`"fr"`) : rouge aux DEUX portails de la livraison, et
    69 verts seule des deux côtés. Rouge de charge, à démonter par une sonde
    qui distingue « jamais envoyé » de « relu trop tôt ». Preuve
    structurelle : le diff ne touche ni la langue, ni les réglages, ni le
    nuage — trois lignes de branchement des dégâts dans `main.js`.
  - `monte.js` : la téléportation qui compile (chauffe de New York expirée,
    55/321 et 56/321) et le gel d'arrivée (34 % · 25,4 %), rouges des deux
    côtés ; « un train s'arrête devant la voiture de l'enfant » rouge au
    portail seulement (13 relevés dedans), VERT seul sur la branche ;
    `origin/main` seul rend en plus « s'arrête devant un réverbère ».
  - `visio.js` (la voix après la caméra, 0,0177 contre 0,0241), `maj.js`
    (personnages 8/9), `manhattan.js` (le trou de façade, PeerJS) : les
    familles déjà déclarées.

- [ ] **AU PORTAIL DE LA v356 (l'épave et la rue, mesurée sur la v348, la v351 et la v354), DEUX SUITES ROUGES — aucune
  causée par la livraison, double mesure faite (rejouées SEULES sur la branche
  et sur `origin/main` v348, chacune dans un arbre détaché ; `monte.js` deux
  fois de chaque côté, règle v269).**
  - `manhattan.js` : branche seule, « le trou enlève aussi la géométrie
    visible de la façade » (14 460 → 51 734) et « le taxi roule » (bouton
    jamais visible, une bête devant) — deux dettes déclarées ; `origin/main`
    seul meurt au délai de la ligne 282 (dette v269) avant de les atteindre.
  - `monte.js` : « l'écran ne se fige pas en arrivant sur une ville » rouge
    aux QUATRE passages (branche 33,4 % · 32,3 % ; `origin/main` 24,6 % ·
    25,8 %). « En vol, on ne rattrape pas le bout du monde » : rouge une fois
    sur deux DES DEUX CÔTÉS (Concorde 58 pour une barre à 60, branche 1er
    passage et `origin/main` 2e passage) — intermittence, même distribution.
    « Ne compile plus de programmes sur place » : branche 6 `physical` à
    Paris, `origin/main` 13 à New York (chauffe expirée) — la famille de la
    v324 (un modèle de flotte tiré à portée pour la première fois). Preuve
    structurelle : la v356 ne clone un matériau qu'APRÈS un choc, et aucun
    de ces témoins ne percute rien.
  - Rebasée sur la v351, portail rejoué : mêmes rouges de `manhattan.js` et
    `monte.js`, plus `maj.js` « le loader ne s'efface qu'une fois les corps
    et les programmes prêts » (programmes 1/27). Rejouée SEULE : branche
    39 verts, un rouge — « le loader dit combien de fichiers sont rangés » ;
    `origin/main` v351 41 verts. Deux intermittences déjà démontées des deux
    côtés (tableaux plus bas : 2 rouges sur 5 sur la branche de la v333, 1
    sur 4 sur `origin/main`), et la livraison ne touche ni `index.html` ni le
    loader ni l'installation.
  - Rebasée sur la v355 (routes seules) : `maj.js` « corps, programmes et
    fond de carte » (personnages 5/9) et « la page ne floute rien » — les
    deux familles déjà rouges des deux côtés aux portails v343 et v348 ;
    `monte.js` l'arrivée figée (6,9 %) et le trou en vol ; le trou de façade.

- [ ] **AU PORTAIL DE LA v355 (la 401 et la Hansalinie), UN ROUGE, DÉJÀ
  DÉCLARÉ** — `monte.js` « l'écran ne se fige pas en arrivant sur une ville »
  (portail : 1 967 ms, 26,9 %). Rejouée SEULE des deux côtés : `origin/main`
  2 567 ms · 34,6 % (et trois autres rouges : passants sur la chaussée à Rome,
  téléportation qui compile — chauffe de New York 68/321 —, « en vol, on ne
  rattrape pas le bout du monde ») ; branche 2 300 ms · 27,0 %
  (plus « se téléporter ne compile plus de programmes », chauffe de New York
  163/321, rouge aussi sur `origin/main`). La livraison n'ajoute que deux
  routes à Toronto, Montréal, Cologne et Hambourg, loin du vol vers Paris.
- [ ] **AU PORTAIL DE LA v349 (les forêts tropicales), TROIS ROUGES, TOUS DÉJÀ
  DÉCLARÉS** — `manhattan.js` « le trou enlève aussi la géométrie visible de la
  façade » (22 326 → 51 734, dette du compte de tous les immeubles) ; `monte.js`
  « se téléporter ne compile plus de programmes » (Paris 3 neufs) et « l'écran
  ne se fige pas en arrivant sur une ville » (pire image 1 200 ms, 26,4 %). Les
  trois sont rouges seuls sur `origin/main` aux portails v345 à v348 ; la
  livraison ne touche ni la flotte, ni Manhattan, ni la file de maillage.

- [ ] **AU PORTAIL DE LA v348 (le feu en deux appels), DEUX SUITES ROUGES — aucune
  causée par la livraison, double mesure faite (rejouées SEULES sur la branche
  v348 et sur `origin/main` v345, chacun dans un arbre détaché).**
  - `degats.js` « enfoncer coûte quelques millisecondes » : premier choc
    31,1 ms pour une barre à 30 au portail ; SEULE, 13 ms sur la branche et
    11,7 sur `origin/main`. La boucle d'enfoncement n'a pas bougé d'une ligne :
    c'est la charge du portail (`maj.js` tournait à côté, 3,8 cœurs).
  - `maj.js` : rouge des deux côtés, jamais le même témoin — portail : le
    loader d'installation, « corps, programmes et fond de carte », le flou ;
    branche seule : le loader et le palier (période médiane 283 ms) ;
    `origin/main` seul : « corps, programmes et fond de carte » (personnages
    7/9). Les mêmes familles qu'au portail de la v343, déclarées.

- [ ] **AU PORTAIL DE LA v343 (les dégâts), CINQ SUITES ROUGES — aucune causée
  par la livraison, double mesure faite (chaque suite rejouée SEULE sur la
  branche, puis sur `origin/main` v339 dans un arbre détaché).**
  - `visio.js` « pendant l'appel la radio parle plus bas » (avant 0,0000) :
    rouge au portail seulement, VERTE seule des deux côtés — intermittence.
  - `maj.js` : rouge des deux côtés, jamais le même témoin — portail : le
    loader d'installation ; branche seule : « corps, programmes et fond de
    carte » (personnages 6/9, déjà déclaré) et le flou ; `origin/main` seul :
    le loader et le palier (période médiane 1 817 ms, machine chargée).
  - `manhattan.js` : le délai de la ligne 282 tue la suite DES DEUX CÔTÉS
    rejouée seule (v269). Au portail, « le taxi roule » (1,06 bloc) : sonde à
    part de la seule scène du taxi, trois essais — ZÉRO choc compté, santé 1,
    allure de classe intacte (`boost` 4,4) ; il rampe à une image toutes les
    trois secondes (v259). Les dégâts n'y sont pour rien, par la mesure.
  - `monte.js` : « l'écran ne se fige pas en arrivant sur une ville » et « se
    téléporter… ne compile plus » (14 à New York, chauffe expirée) — les deux
    rouges sur `origin/main` rejoué seul (plus les passants de Rome).
  - `reseau.js` : « un hôte sans courtier est trouvé » et « il le REJOINT » —
    rouges à l'identique sur `origin/main` seul ; la branche seule rend « deux
    enfants sans courtier du tout ». Famille des parties par le nuage,
    intermittente, en production.
- [ ] **AU PORTAIL DE LA v397 (la normale de ce qu'on touche), CINQ ROUGES,
  TOUS DÉJÀ VUS SUR `origin/main`.** `reseau.js` « un départ propre nettoie
  tout le monde », `manhattan.js` « le trou enlève aussi la géométrie »,
  `maj.js` « corps, programmes et fond de carte » (programmes 15/27, carte
  fausse à 65 s) et `monte.js` « l'écran ne se fige pas » : dettes déjà
  déclarées ci-dessous. Le cinquième, `monte.js` « se téléporter dans une
  ville ne compile plus de programmes », a été rejoué SEUL des deux côtés :
  branche rouge (Paris 8 images pour une garde à 10, chauffe de New York
  expirée 44/321, 18 programmes neufs à NY), `origin/main` (v369) rouge aussi
  (chauffe NY expirée 56/321) — plus un rouge que la branche n'a pas (« en
  vol, on ne rattrape pas le bout du monde », chasseur 58 pour 60). C'est la
  chauffe de New York qui n'aboutit pas sur ce banc chargé, pas la
  conduite : la v397 ne touche à rien de ce chemin (branche AU VOLANT de
  `player.js`, crochets d'obstacle). Piste : borner l'attente du témoin sur la
  chauffe (`finie`), et sinon le dire au lieu de juger NY.
- [x] **(FAIT en v407 : la séquence suit la voiture du conducteur et s'y rebranche ; témoin provoqué dans `reseau.js`.) AU PORTAIL DE LA v397, « LE PASSAGER ENTRE PAR LA PORTIÈRE DROITE »
  (`reseau.js`, v377) VA ET VIENT — DÉCLARÉ AVEC SA DISTRIBUTION.** Suite
  entière : branche 2 vertes sur 5 (deux portails, trois rejeux seuls),
  `origin/main` 3 sur 3. Le rouge est toujours le même : Lou reste en
  « approche » puis la séquence s'annule (`existe` faux : la voiture distante
  de Marlon a changé de maillage), et il tombe dans les passages où le réseau
  rougit ailleurs (veille sans retour, reprise, compteur après le départ de
  l'hôte). Isolé : `sonde-portiere-ami.cjs`, cinq tours sur cinq verts sur la
  branche ; la suite coupée après les portières, en ABBA, avec et sans le
  témoin du volant qui la précède (seul ajout de la branche en amont) : six
  sur six verts. Ce n'est donc ni la physique (Marlon immobile, zéro choc,
  zéro contact, volant gardé) ni le témoin neuf. Piste : relever la clé et le
  maillage de la voiture distante À L'INSTANT de l'annulation, dans la suite
  entière, et chercher ce qui recrée `rp` côté Lou (une reconnexion).
- [ ] **LA CONDUITE À LA GTA, PALIERS 1 (v358) ET 2 (v397) LIVRÉS
  (conduite-physique) — CE QUI RESTE, DÉCLARÉ.** Faits en v397 : le choc
  contre une voiture de la rue prend la normale de SON rectangle et se juge
  sur la vitesse RELATIVE (`chocContreVoiture`, lu par le vrai crochet
  `voitureContre`) ; la normale d'un mur se lit sur la droite des faces
  exposées (`normaleDeMur`), et la voiture glisse le long d'une façade oblique
  (sonde `sonde-mur-oblique.cjs`, seize vraies façades de Paris : trajet
  médian après contact 1,4 → 10,4 et 1,5 → 14,3 blocs) ; le braquage et la
  dérive voyagent dans `p.v` (`b`, `r`) et le receveur les pose sur
  `userData.braquage` / `.derive` de sa copie. RESTE : (1) le PLAFOND DE LA
  TABLETTE et la ROUE LIBRE ne se mesurent que sur l'iPad — `?diag=1`, au
  volant, affiche désormais classe, vitesse, pointe, monde maillé devant la
  voiture (blocs et secondes de route) et la dernière roue libre : Max le
  relève en hypercar dans Paris (cible : au moins une seconde et demie de
  route devant soi à 55 blocs/s). (2) PERSONNE NE DESSINE ENCORE le braquage
  ni la dérive, ni chez soi ni chez l'ami : c'est la session des sensations
  (`conduite-sensations`), qui lit `player.braquage` pour la sienne et
  `userData.braquage` pour celle d'un ami. (3) Une voiture de la rue ne se
  pousse pas (horloge partagée, v305) : collé derrière une plus lente,
  joystick en avant, on la touche à chaque image — ces contacts sous
  `CONTACT_DOUX` (11 km/h relatifs) ne sont pas des chocs — **FAIT en v405** :
  on la suit (`suiviDevant`), zéro contact mesuré sous node. (4) La normale lue
  sur un escalier se trompe d'un ou deux degrés (pire 9,8° sur 1 200
  contacts) : la voiture s'écarte de la façade d'un cheveu au lieu de la
  suivre, et `glisserLeLong` la décolle d'une marche si elle s'y coince —
  **mesuré en v408, rien ne la bat sur de vraies façades** (lecture sur 6
  blocs : mieux sur le mur synthétique, pire à 10° sur Paris ; coque convexe :
  pire partout). La dette reste, déclarée.
  **PALIER 3 (v408) LIVRÉ : la pente et la bosse.** RESTE : (5) la pente ne se
  lit que sur la surface continue — **MESURÉ en v409, la dette ne mord
  presque pas** : sur les 3 189 colonnes de chaussée EN PENTE de San Francisco
  (cote > 34, 200 000 tirages dans le disque), 2 132 sont sous la surface
  continue (la voiture y sent déjà la pente), et les 1 057 autres sont le
  liseré d'un bloc au bord des zones voxel (523 contre une marche de deux
  blocs, 534 d'un bloc). Une lecture voxel de secours n'est pas écrite :
  elle ne servirait qu'à ce liseré (sonde `sonde-pente-ville.cjs`, qui ne
  trouve AUCUNE ligne de cinquante blocs de chaussée voxel en pente) ; (6) personne ne
  DESSINE encore `tangage` ni `atterrissage` (session des sensations) ; (7) la
  vitesse est le long de la route, le déplacement horizontal ne la réduit pas
  du cosinus de la pente (1,4 % à 0,17) ; (8) en l'air, on ne braque pas et
  le moteur ne pousse pas, et une crête vive à 40 blocs/s fait voler une
  seconde (mesuré, `sonde-pente.cjs`) — c'est voulu (GTA), à juger avec
  Marlon sur la tablette ; (9) LE FREIN À MAIN (palier C) — **FAIT en v409** :
  bouton 🛑 de la colonne de droite, ou Espace. RESTE du palier C : (10) le
  moteur ne pousse pas pendant le frein à main (un vrai drift « gaz + frein à
  main » demanderait un second doigt sur l'accélérateur, et le joystick n'en a
  qu'un — décidé, pas oublié) ; (11) personne ne DESSINE encore le dérapage
  (traces de pneus, crissement : la session des sensations lit
  `player.freinMainTire` et `player.derive`) ; (12) le frein à main ne se voit
  pas chez l'ami au-delà de la dérive qui voyage déjà (`p.v.r`).
- [ ] **AU PORTAIL DE LA v408 (la pente, la bosse et la file), DES ROUGES QUI NE
  SONT PAS LA LIVRAISON — mesurés.** Mes trois rouges (percuter une voiture de
  la rue, elle s'arrête en feux de détresse, son flanc frôlé) venaient du
  suivi qui freinait AUSSI devant une voiture qu'on voulait percuter : corrigé
  (`SUIVI_DELTA`), `degats.js` rejouée seule 39/39. `monte.js` rejouée SEULE :
  branche 182 verts, 10 rouges ; `origin/main` 188 verts, 4 rouges. Des deux
  côtés : « son flanc frôlé ne nous arrête pas » (`c: null` sur `origin/main`
  aussi, `lu: false` — NEUF ET DÉCLARÉ : le crochet n'y lit même pas la
  voiture garée à 410 blocs du site, le témoin la pose loin de son terrain),
  le sursaut du piéton. Sur la branche seulement, et hors de son chemin
  (preuve structurelle, v291) : le train 🛞 (0,95 pour 0,97, chemin
  `pilote`), la remise de gaz sur la mer (`pilote`), « un mur pris de face »
  (sur une dalle de blocs POSÉS : ni pente ni suivi n'y sont lus ; recul
  −1,25 encore en cours à la fin d'une fenêtre de 0,65 s — vert au portail
  complet de la branche et sur `origin/main` seul), la monoplace (déclarée),
  le flâneur (déclaré), le trou en vol et l'arrivée sur une ville (déclarés),
  le taux de chevauchement de la circulation (5,5 % ; sur `origin/main` c'est
  sa voisine « la rue roule à l'allure » qui a rougi au même passage). Au
  portail complet, `maj.js`, `carte.js`, `reglages.js` et `manhattan.js` ont
  rendu des rouges déjà déclarés (loader, préparation, glisser bridé, PeerJS,
  trou de façade, taxi tactile). Portail complet de la reprise (10 octobre,
  99 min, dix suites) : huit rouges, TOUS déjà déclarés — `monte.js` la
  chauffe de New York (29/321) et le flanc frôlé (`c: null`, `lu: true`) ;
  `maj.js` le loader et la préparation ; `carte.js` la flèche du GPS (1,92)
  et le glisser bridé (486 ms) ; `manhattan.js` le trou de façade et le taxi
  tactile.
  Après la fusion de la v406, `degats.js` rejouée seule : « percuter une
  voiture de la rue » était MON défaut (le suivi ne lisait le sens d'une
  voiture que si elle roulait — corrigé, vert). Et « très touchée elle fume »
  est un TIRAGE, déclaré à la session des dégâts : il compte les particules de
  fumée visibles à UN instant (`particulesVisibles().fumee > 0`), et ce compte
  vaut 0, 1, 2 sur la branche contre 1, 2 sur `origin/main` v406, même santé
  (0,33), même module. La grandeur juste est l'émission sur une fenêtre (v279 :
  un minimum échantillonné est une propriété de la cadence).
  Portail complet de la v409 (le frein à main) : neuf rouges, TOUS déjà
  déclarés ci-dessus et plus haut (fumée 0, préparation de `maj.js`, flèche du
  GPS, glisser bridé 684 ms, trou de façade, taxi tactile, PeerJS, chauffe de
  New York 44/321, flanc frôlé) ; les trois témoins du frein à main verts.
- [ ] **POUR MAX, SUR LA TABLETTE — la pente, la bosse et la file (v408).**
  Ouvrir `https://minecraft-fam.vercel.app/?diag=1`, prendre une voiture. La
  ligne « au volant : … » dit désormais la `pente` sous la caisse, le
  `dernier saut` (durée, hauteur, choc) et `suit une voiture à … blocs/s, …
  blocs devant`.
  1. **La côte.** Hors des villes, plein gaz dans une montée : la vitesse
     affichée doit baisser par rapport au plat (pente 20 à 40 %), et
     REMONTER en descente. Lâcher le joystick arrêté dans une pente : la
     voiture ne doit PAS repartir seule.
  2. **La bosse.** Une crête de colline prise à fond : la voiture décolle,
     retombe, et la ligne dit `dernier saut 0,5 à 1,5 s`. Ce qui ne doit pas
     arriver : des sauts en pleine montée régulière, ou une voiture qui
     tremble sur une pente douce.
  3. **La file.** En ville, derrière une voiture plus lente, joystick en
     avant : on la suit à un bloc et demi environ (`suit une voiture`), sans
     à-coups. Braquer pour la doubler : le suivi s'arrête.
  4. **La cadence.** La première ligne (`pire image`) ne doit pas changer
     par rapport à la v404 en roulant hors des villes.
- [ ] **POUR MAX, SUR LA TABLETTE — le frein à main (v409).** Ouvrir
  `https://minecraft-fam.vercel.app/?diag=1`, prendre une voiture sur une
  grande place ou en campagne.
  1. **Le bouton.** 🛑 DÉRAPER est au-dessus de « Descendre », sous le pouce
     droit. Le pouce gauche garde le volant pendant qu'on le tient : si le
     volant lâche quand le pouce droit se pose, c'est un défaut (multitouch).
  2. **Le dérapage.** À bonne vitesse, volant à fond et 🛑 tenu une seconde :
     l'arrière glisse franchement, la voiture tourne bien plus qu'au volant
     seul, et la ligne `au volant` dit `dernier dérapage 40 à 55° en … s`.
  3. **La sortie.** On lâche 🛑 : la voiture se remet droite toute seule en
     moins d'une seconde, sans secousse. Ce qui ne doit pas arriver : un
     tête-à-queue, ou une voiture qui repart toute seule à l'arrêt.
  4. **À juger avec Marlon** : 30 → 16 blocs/s pendant un dérapage d'une
     seconde, est-ce assez « GTA » ou faut-il garder plus de vitesse
     (`GLISSE_MAIN`, `FREIN_MAIN` dans conduite.js) ?
- [x] **DEUX OU TROIS PROGRAMMES SE COMPILENT ENCORE À L'ARRIVÉE À PARIS
  (mesuré en v306) — ÉLARGI À TOUTES LES VILLES ET FAIT EN v319.**
  `sonde-programmes-villes.cjs` (seize lieux, page neuve par lieu) rendait sur
  `origin/main` 0 à 4 partout et 34 à New York ; 0 partout ensuite. Causes
  nommées : la coque d'attente des voitures de ville (deux Phong à reflets),
  le chien en fondu (`Lambert+alpha`), un `Basic` uni (Lille), et à New York
  les ombres que Manhattan allume (22) plus ses matériaux (12).
- [ ] **LA CHAUFFE DE NEW YORK N'EST PAS UNE BARRIÈRE DE « JOUER » (v319,
  décision de prudence, pas de Max).** Elle tourne après la préparation, tant
  que l'accueil ou le menu de pause est à l'écran : 320 étapes, quatre à six
  secondes au banc. Un enfant qui appuie sur « Jouer » avant qu'elle ait fini
  retrouve à New York les compilations d'avant (jamais plus). Sur l'iPad, son
  coût réel est À MESURER (`?diag=1`, et `?chauffeny=0` pour la couper) : la
  grande majorité des étapes sont des programmes déjà compilés, la trentaine
  restante coûte des centaines de millisecondes chacune sous Safari (v257).
  **Une alternative est une décision de Max** : que Manhattan respecte le
  réglage d'ombres de l'appareil (éteintes sur tablette depuis v257) — 22
  programmes de moins ET une passe d'ombre de moins par image dans la ville la
  plus lourde du jeu, au prix des ombres de New York sur l'iPad.
- [ ] **AU PORTAIL DE LA v331 (les villes au loin), TROIS ROUGES DÉJÀ
  DÉCLARÉS, rejoués SEULS des deux côtés.** `monte.js` « l'écran ne se fige
  pas en arrivant sur une ville » : branche 2 967 ms · 21,9 % (bâti lointain
  coupé en rendu logiciel), `origin/main` 3 183 ms · 24,6 % — avant cette
  coupure la branche rendait 3 683 ms · 45,6 %, et l'A/B (bâti visible 5 im/s,
  caché 15) a nommé la cause. `manhattan.js` « le trou enlève aussi la
  géométrie visible de la façade » 11 684 → 51 734 sur la branche, 14 460 →
  51 734 sur `origin/main` ; « le taxi roule avec les contrôles tactiles »
  rouge des deux côtés (`#ride-btn` caché, une bête). `carte.js` « la flèche
  du GPS pointe vers la destination » rouge au portail, VERTE rejouée seule
  sur la branche ET sur `origin/main` : intermittence à démonter.
  Rebasé sur la v330, trois rouges de `monte.js` VONT ET VIENNENT d'un passage
  à l'autre, jamais deux fois : « se téléporter dans une ville ne compile plus
  de programmes » (chauffe de New York expirée, 163/321 au portail, 68/320 sur
  `origin/main` rejoué seul — deux programmes `physical` de Manhattan, pas le
  Lambert du paysage), « les passants ne sont plus plantés au milieu de la
  chaussée » (Rome 4/18, portail seul), « le bouton Conduire s'offre tout
  seul » (branche seule, le bouton disait « Monter à bord » : un métro à
  portée). Preuve STRUCTURELLE (v291) : sur le banc, le bâti lointain est coupé
  (rendu logiciel) et la livraison n'y ajoute qu'un test « est-ce une ville ? »
  par sommet du paysage lointain (+0,05 µs).
- [ ] **AU PORTAIL DE LA v319, LES DEUX ROUGES SONT DES DETTES DÉJÀ
  DÉCLARÉES.** `manhattan.js` « le trou enlève aussi la géométrie visible de la
  façade » 17 102 → 51 734 (mêmes nombres qu'au tableau plus bas) ; `monte.js`
  « l'écran ne se fige pas en arrivant sur une ville » 3 283 ms · 27,3 %
  au-delà de 300 ms, sous les 3 517 ms · 41,4 % relevés sur `origin/main` — la
  chauffe ne l'a pas aggravé, sans le régler : ce témoin mesure la cadence
  d'arrivée, pas les compilations (qui sont à zéro). Au second portail
  (après rebase sur la v318) : mêmes deux rouges (gel 3 583 ms · 29 %), plus
  `washington.js` « on entre chez les gens » avec le message exact de la v250
  et de la v272 (« façade 0,1, plafond à −1, 1 mur ») — rejouée SEULE, verte
  sur la branche ET sur `origin/main` : l'intermittence de charge déjà
  déclarée plus bas.
- [ ] **LA PASSE D'OMBRE DE THREE LIT LES LAMPES DE L'IMAGE PRÉCÉDENTE (vu en
  v319).** À la bascule des ombres, la première image compile une variante de
  profondeur « zéro ombre portée », les suivantes « une » ; et le matériau de
  profondeur, partagé, ne se recompile que quand la forme du maillage change.
  La chauffe compile les deux variantes en alternant les formes. Si une
  version future de three change cet ordre, la sonde le dira (clé `depth`).
- [x] **LA RIVE GAUCHE A DEUX FOIS MOINS DE VOITURES DEPUIS PARIS DOUBLÉ —
  FAIT EN v322, ET POUR TOUTES LES VILLES.** Mesuré sous node, ville par ville
  (couverture : part de la ville à moins de 45 blocs d'un tracé qui porte un
  convoi ; densité : voitures pour mille blocs de rue). Paris 38,8 % → 96,4 %
  (rive gauche 38,3 → 94,2), douze tours de quartier sur la trame d'Haussmann
  (`circuitsQuartiersParis`), sol inchangé ; et `nb` sans plafond à vingt
  (`voituresDuCircuit`, une voiture tous les dix-huit blocs) : densité la plus
  basse 25,1 (Rome) → 54,3, maximum de voitures en vue d'un point du monde
  inchangé (72,7, Washington). Témoin « toutes les villes ont des voitures »
  de `carteMonde.js`. **En v325** : Sydney 60,5 → 95,3 %, Rome 88,3 → 94,6 %,
  Tokyo 88,7 → 95,7 % (phase 3 des anneaux, `ANNEAUX_EN_PLUS`). **Reste,
  déclaré** : Nice 59,8 % et San Francisco 69,1 % — leurs rues de trame font
  deux blocs de chaussée pour une voiture de 2,26 (`w` 1,0, une passe
  d'élargissement à part, v271) : aucune boucle de quartier n'y tient, il
  faudrait de vraies avenues nommées (méthode v216), et le sud du disque de
  San Francisco est au-delà de la vraie ville. Las Vegas 79,9 % : pas de trame
  de 32 blocs pour un rayon de 126, tout anneau à l'ouest déborde du disque
  ou suit le côté d'un anneau existant — mesuré, aucun candidat ; Mumbai
  86,8 %, même cas. Et des anneaux EXISTANTS ont des pas dans du plein à
  hauteur de carrosserie (Rome 3 : 10, Tokyo 2 : 14, Berlin 1 : 11, Sydney 0 :
  16) — un monument posé après la trame, le piège des ormes du Mall (v205) :
  aucun témoin ne lit les anneaux des villes engendrées dans le monde ; et les voitures fabriquées ne quittent jamais la scène
  une fois cachées (`montrer` les rend invisibles, jamais ne les détache) :
  avec trois fois plus de voitures à Paris, une ville parcourue en entier en
  garde davantage dans le graphe — coût de parcours des matrices à mesurer
  sur la tablette avant de les détacher.
- [x] **CÔTÉ +u ET +v, LE TOUR DES MONUMENTS DE PARIS N'EST QU'À UN BLOC DU
  SOCLE — FAIT EN v325** : demi-côté du tour + 0,5 des deux côtés (`TOURS`,
  paris.js), 6 pas → 0, partage inchangé. Le recentrage proposé ci-dessous a
  été mesuré et retiré (un partage à 25 autour de Montparnasse).
  Ce qui suit est la note d'origine.
  **CÔTÉ +u ET +v, LE TOUR DES MONUMENTS DE PARIS N'EST QU'À UN BLOC DU
  SOCLE — L'AILE MORD DE 0,13 BLOC DANS SA DERNIÈRE RANGÉE (trouvé en v318 par
  le témoin repointé de `carteMonde.js`, identique sur `origin/main`).** La
  boîte d'un socle se juge sur des COLONNES entières (`|u − p.u| ≤ bu`) : elle
  couvre donc le monde de `p.u − bu` à `p.u + bu + 1`, un bloc de plus côté +.
  `TOURS` (paris.js) pose l'axe du tour à `p.u ± (bu + AXE_TOUR)`, symétrique
  autour de la colonne centrale : côté −, la voiture est à deux blocs du socle
  et au milieu de la rue du tour (colonnes `−bu−4 … −bu−1`) ; côté +, à UN bloc,
  et son flanc (demi-largeur 1,13) entre de 0,13 bloc dans la dernière rangée du
  socle. Là où cette rangée porte un tronc d'arbre, la carrosserie le traverse :
  six pas sur 597 lus — quatre au coin nord-est de la Tour Eiffel (tronc en
  (−514, 390) et (−513, 388)), deux aux Invalides (−478, 395). Mesuré par
  `node tests/sonde-tour-monuments.cjs` (dépôt : 6 ; `contournerBlocs` désarmé :
  166, Opéra 29, Louvre 28, Invalides 38…). Remède probable, à mesurer avant
  d'écrire : centrer `TOURS` sur `p.u + 0,5` (même chose pour `v`), ou poser
  l'axe à `bu + AXE_TOUR + 1` côté + — et remesurer la tenue de rue des huit
  circuits, puisque le tour change de tracé. Zone de `paris.js`, pas de ce
  témoin. Le témoin reste ROUGE en attendant : il dit vrai.
  **Double mesure (v195)** : `carteMonde.js` rejouée SEULE sur la branche et
  sur `origin/main` (fa2f55c, avec le témoin repointé) — 124 verts et ce seul
  rouge des deux côtés, `dur 6 · lus 597 · Tour Eiffel 4 · Invalides 2`, au
  pas près. Le portail complet a rendu le même chiffre.
- [x] **UNE PLACE DE VOITURE À MOINS DE TROIS BLOCS, SANS VOITURE DESSINÉE —
  EXPLIQUÉ EN v322, PAS UN DÉFAUT.** `tests/sonde-place-vide.cjs` rejoue le
  geste du témoin (téléportation sur un circuit de Paris, `placeProche` lu par
  un minuteur toutes les 100 ms) sur les vingt circuits, trois fois chacun :
  2 400 relevés, 565 places dessinées, 47 vides — et les 47 sont le MÊME cas
  (`diagPlace`, vehicules.js) : `montrer` les met dans le champ depuis la
  position d'aujourd'hui, pas depuis celle qu'il a VUE à son dernier tour
  (51 à 409 blocs plus loin), et aucune image n'a été rendue depuis la
  téléportation (`imagesDepuisTp` 0). Le minuteur interroge entre deux images,
  et le banc en rend une ou deux par seconde à Paris. Zéro cas où la règle
  elle-même dirait « dehors ». En jeu, `fun.js` lit la place DANS la boucle :
  l'écart dure au plus une image après une téléportation, et `emprunter`
  fabrique la voiture si l'enfant clique dans cet instant (v306).
- [x] **LES QUAIS DE LA SEINE MONTRENT UN MUR DE TERRE — FAIT EN v316.**
  Mesuré : sur les colonnes qui touchent l'eau, deux blocs de terre au-dessus
  de la Seine sous la margelle de granit, des deux rives ET au bord des îles
  (639 faces de terre sur `origin/main`). `murDeQuaiParis` (paris.js) : pierre
  haussmannienne de `WATER_LEVEL − 2` au sommet, matière seule, relief
  intact. Reste : six faces d'HERBE au sommet de quelques colonnes du quai bas
  (un jardin qui touche l'eau), laissées telles quelles.
  **Et en v317 pour TOUTES les villes** (Londres, Lille, Amsterdam, Rome…) :
  passe générale dans `generateChunk`. Reste, déclaré : les berges du Potomac à
  Washington (hors du disque de la ville, naturelles, surtout de la pierre),
  et trente-sept colonnes au bord du disque de Paris, où le relief du fondu
  passe sous l'eau à côté d'un trottoir — elles sont désormais maçonnées
  aussi, mais leur forme reste un bord de disque, pas un quai.
- [x] **EN LIGNE, UNE VOITURE DE LA RUE ENTRE ENCORE UNE FOIS DANS CELLE D'UN
  AMI (v305) — faite en v383.** Ni le cap, ni le retard réseau : la patience
  de quatre secondes revenait dès qu'une voiture de la rue gênait aussi
  (`some` au lieu de `every`, vehicules.js). Sonde `sonde-intrus-ami.cjs` :
  ancien 5 entrées sur 11 poses, neuf 0 sur 10.
- [ ] **`carte.js` : l'appui long refusé au portail de la v326 (« pointeurs 0 »,
  quatre appuis, 8 rouges en cascade) — la dette de la v258, double mesure.**
  Rejouée SEULE : branche verte au premier appui ; `origin/main` (v321) verte
  au TROISIÈME, les deux premiers refusés pareil (`decline: "pointeurs 0"`).
  Même mécanisme des deux côtés ; la v326 ne touche ni la carte ni l'entrée.
- [ ] **`carteMonde.js` : « aucune voiture ne traverse un monument de Paris » —
  ROUGE EN PRODUCTION (v321, double mesure).** Rejoué SEUL sur la branche
  `claude/gps-complet` ET sur `origin/main` (v320, arbre séparé) : verdict
  identique au chiffre près, `{"dur":6,"lus":597,"par":{"Tour Eiffel":4,
  "Invalides":2}}`, premier exemple `["Tour Eiffel",-514,35,390,5]`. Le témoin
  est pur (circuits de `voies.js`/`paris.js`), la v321 n'y touche pas. Piste :
  le tour des monuments signalé par la v318 (une boîte jugée sur des colonnes
  couvre `c − b` à `c + b + 1`, un bloc plus près côté +). Zone voitures.
- [x] **LE GPS : LE PARTAGE AVEC UN AMI EN LIGNE (v321) — fait en v388.** Par
  la position (`g`), pas par un message neuf (leçon v374) ; proposition chez
  l'ami, jamais un ordre. Témoin à deux pages dans `reseau.js`. Reste : le
  témoin n'éprouve que le chemin direct (hôte → invité) ; le relayé (`rpos`)
  est lu par la même ligne, sans témoin à trois pages.
- [ ] **PARIS DOUBLÉ (v306) : CE QUI RESTE, DÉCLARÉ.** (1) Une tablette qui
  jouerait encore sur l'ancienne version APRÈS la publication poserait dans
  l'ancien Paris des blocs datés d'après `DATE_PARIS_DOUBLE` : la marche 5 → 6
  ne les suivra pas (même limite que la carte 3). (2) Un GARAGE posé dans
  l'ancien Paris : ses blocs partent avec leur quartier, sa fiche
  (`garages.js`, rangée par position) reste à l'ancienne adresse — la voiture
  garée ressortirait là. Remède : migrer la fiche avec le groupe qui contient
  son origine, et changer son identifiant. Rien ne dit qu'un garage y existe (la
  lecture des profils d'enfants est refusée à la session) ; à mesurer dans
  l'espace parent. (3) Une construction de campagne dans le nouveau disque (ou
  sur un ancien aérodrome) dont le sol a bougé de plus de vingt-quatre blocs
  reste où elle est. (4) Le monde d'avant (`CONF_AVANT`) porte tout ce que la
  v306 a déplacé SAUF les ouvrages globaux : l'ancienne A1 près de l'ancienne
  porte nord et l'ancienne ligne Paris–Lyon n'y sont plus, si bien qu'un bloc
  d'avant le ménage collé au talus de l'ancienne A1, DANS l'ancien disque (les
  vingt derniers blocs avant la porte), serait jugé sans son appui. Mesuré :
  les deux mondes diffèrent sur 4 991 blocs autour de l'ancienne porte, 0 dans
  les seize morceaux de l'ancien centre. (5) Au volant sur le premier pont de
  l'A1 retracée, un passage a relevé deux marches et 0,97 bloc d'écart au profil
  (`plafond.js`, avant que le témoin plat ne soit sorti du pont) ; le témoin du
  pont (v300) ne mesure ni les marches ni l'écart, donc l'ancien pont ne l'a
  jamais été non plus. À mesurer des deux côtés, sur le franchissement.
  (6) `?diag=1` et la carte ne disent pas encore à l'enfant « ta maison a suivi
  son quartier » ; le journal le dit, le jeu non.
- [ ] **LES RUES DE PARIS À LA RÈGLE (v303) : CE QUI RESTE, DÉCLARÉ.** (1) Les
  quartiers les plus petits (Saint-Germain, le Marais, le Faubourg, l'Étoile :
  1 500 à 3 000 colonnes, bordés par la Seine et les percées) n'ont presque
  plus de lots — ils en avaient déjà peu (168, 41, 91, 55 colonnes) et une trame
  de 15 à 29 blocs n'y loge plus un îlot entier ; leur rayon (`Q(…, r0)`) est
  en kilomètres du plan, pas à l'échelle d'un mètre. Mesuré au portail : 41 → 2
  au Marais, 168 → 2 à Saint-Germain, 91 → 10 au Faubourg ; leurs disques
  agrandis de trois quarts n'en rendent presque rien (ce sont Rivoli, les
  Grands Boulevards et le boulevard Saint-Germain qui les occupent). Le remède
  est Paris doublé, décidé par Max. (2) Les PLACES gardent
  leurs rayons (Concorde 4,5, l'Étoile 8) : un boulevard de 21 blocs y arrive
  plus large que la place — Paris doublé (v306) ne les agrandit pas, à dessein.
  (3) Les autres villes bâties à la main (Londres,
  Nice, Lille, San Francisco, Washington) n'ont pas encore la règle — même
  geste, ville par ville, avec la trame figée et la protection des
  constructions. Les villes ENGENDRÉES l'ont depuis la v307 (collectrice, et
  boulevard central dans 47 grandes villes), SAUF les médinas : la section
  `ruelle` du kit (3 m, sans trottoir) leur ôterait tous leurs réverbères —
  décision de Max. Prix déclaré de la v307 : 602 → 440 anneaux, 158 974 →
  127 734 blocs de rue portant un convoi — RENDU en v387 : candidats en pas de
  trame (côtés impairs), contresens et anneaux de quartier, 445 → 809
  anneaux, 129 373 → 200 322 blocs de voie portant un convoi. (4) Une colonne protégée de l'ancienne ville
  peut se trouver au milieu d'une rue neuve : les circuits de voitures,
  mesurés sur le plan, la traverseraient. Mesure à faire sur un vrai journal
  (le compte des colonnes protégées se lit dans `world.colonnesParisAvant`).
  (5) Un bloc de l'ancienne version reçu du nuage APRÈS que son morceau a été
  engendré ne protège sa colonne qu'au prochain chargement.
- [ ] **LE PORTAIL DE LA v303 : TROIS ROUGES DANS `monte.js` ET `manhattan.js`,
  AUCUN ATTEIGNABLE PAR LA LIVRAISON.** Tout ce que la v303 change dans le code
  du jeu est borné au disque de Paris (`dansParisAvant`, `PARIS_V302`, le choix
  de trame par colonne) ; les trois rouges se jouent ailleurs — preuve
  STRUCTURELLE (v291). (1) `manhattan.js:282`, le délai déjà démonté 3/3 des
  deux côtés (v269). (2) « l'écran ne se fige pas en arrivant sur une ville » :
  23,5 % et 28,2 % aux deux portails, contre 36 à 44 % aux mesures d'avant — la
  dette de l'arrivée en ville. (3) NEUF : « la voiture de l'enfant freine devant
  un piéton, qui s'écarte, et elle repart sans lui passer au travers », à ROME —
  vert au portail 2 (`candidats 27, traverses 0, avance 19,3`), rouge au
  portail 3 (`candidats 400, traverses 18, ecartes 256, avance 13,7`), code du
  jeu identique hors Paris entre les deux. C'est une INTERMITTENCE, et elle
  mérite d'être démontée pour elle-même : dix-huit relevés où un passant est
  DANS la voiture de l'enfant, c'est la panne que Max a signalée en v259. Le
  couloir a été trouvé après quatre cents candidats (contre vingt-sept) — un
  couloir inhabituel ; la sonde à écrire imprime le passant qui traverse, son
  état (`ecart`, `repos`), la vitesse de la voiture à ce moment, et rejoue le
  même couloir dix fois pour avoir la DISTRIBUTION (v269). Et le tirage des
  passants sur la chaussée (0,24 pour une barre à 0,2) est la dette de la v291.
- [ ] **LE RAIL CONTINU (v302) : CE QUI RESTE, DÉCLARÉ.** (1) La pente du
  profil reste un tiers : les candidats du kit à 2,5 %
  (`transport-v298/examples/rail-profile-candidates.json`) creusent jusqu'à
  vingt-deux blocs et ne sont pas approuvés ; une pente réaliste se décide
  avec la mesure des terrassements (le profil est un cône, `PENTE` dans
  `trains.js`). (2) Sur la mer, la voie est une chaussée au ras des flots (v179),
  pas un viaduc sur piles : le mécanisme d'ouvrage de l'A1 (tablier en ruban,
  `tablierEn`) existe et n'est pas branché au rail. (3) Au-delà de
  `DEBLAI_MAX` (13) le talus s'arrête et la paroi reste raide — mesuré, remblai
  19,2 sur Madrid–Barcelone (k 1 804), 15,3 sur Londres–Paris (k 533) ; un
  remblai de dix-neuf blocs est un viaduc dans la vraie vie. (4) La gare reste
  en voxel (quai un bloc au-dessus du ballast) ; « quai au niveau du plancher
  de la rame » n'est pas mesuré. (5) Les treize familles de textures du kit ne
  sont pas branchées : les prismes prennent l'obsidienne et la planche sombre
  de l'atlas. (6) Les rails n'arrêtent rien, ce qui est voulu (kit : « pas une
  barrière d'un mètre pour une voiture ») ; aucune route ne croise une voie,
  donc aucun passage à niveau n'est nécessaire aujourd'hui. (7) Avec
  `?solcontinu=0`, le ballast voxel a son sommet à `floor(cote)` et les rails
  à `cote` — jusqu'à un bloc au-dessus : une mesure, pas un réglage. (8) Le
  demi-tour du train aux terminus reste une diagonale entre les deux voies
  (`traceSegment`) ; le kit demande un tiroir ou un retournement.
- [x] **LE FONDU RAIDE AU BORD DES VILLES (v308) — FAIT EN v309** (« Fait
  tout »). Cône de pente 0,7 hors du disque, qui n'abaisse que : 651 rayons
  raides → 2 (les deux sont des villes AU-DESSUS de leur pays, que le cône ne
  relève pas, à dessein). Seuils à marche de la v308 : 14,5 % → 4,0 %.
- [ ] **LE PORTAIL DE LA v317 (règle de la v195), DOUBLE MESURE FAITE.** Verts :
  `carteMonde.js` (le témoin des quais de toutes les villes : 0 face de terre,
  1 137 sur `origin/main`), `plafond.js`, `maj.js`, `carte.js`, `washington.js`,
  `metro.js`. `manhattan.js` : le délai de la ligne 282 (dette de la v269).
  `monte.js` au portail : cinq rouges — la monoplace (9,1), les programmes à
  l'arrivée à Paris (8), l'écran figé, et DEUX qui s'enchaînent (« un avion se
  repousse au sol », `lance 0` ; puis « une voiture roule dans la nature »,
  `pas au volant`) derrière une marche arrière en voiture qui avait pris 90 s.
  REJOUÉE SEULE des deux côtés : branche ET `origin/main` n'ont que l'écran figé
  (3 467 ms · 28,4 % contre 2 833 ms · 24 %) ; les quatre autres sont verts des
  deux côtés. Ce sont des rouges de charge, la famille « un témoin hérite de
  l'état du précédent » (v279) — et la livraison ne change que la matière sous
  la surface des quais, ni hauteur ni solidité.
- [ ] **LE PORTAIL DE LA v316 (règle de la v195), DOUBLE MESURE FAITE.** Verts :
  `carteMonde.js` (le témoin des quais, rouge sur `origin/main` : 639 faces de
  terre ; ici 0 sur 935), `plafond.js` (empreintes intactes), `carte.js`,
  `parishd.js`, `metro.js`, `washington.js`. `maj.js` : un rouge DE MOI, le
  titre du journal à sept mots, corrigé et rejoué seul. `manhattan.js` : le trou
  de façade (9 203 → 51 734, dette de la v291) et `#ride-btn` qui expire
  (intermittence vue des deux côtés, v279/v291). `monte.js` : l'écran figé
  (3 050 ms · 25,4 %) et « se téléporter à Paris ne compile plus les
  programmes » à 5 pour une barre à 4 — rejoué SEUL par
  `sonde-programmes-paris.cjs`, trois fois de chaque côté en alternance :
  branche 3 · 3 · 2, `origin/main` 3 · 3 · 3. Même distribution ; le 5 est un
  tirage sous la charge du portail, et la dette de la v306 (deux ou trois
  programmes à l'arrivée) reste ouverte telle quelle.
- [ ] **LE PORTAIL DE LA v331 (règle de la v195), DOUBLE MESURE FAITE — premier passage,
  après rebase sur la v323.** Seize suites, 88 min ; dix vertes (`plafond.js`
  et ses trois témoins des monuments, `parishd.js`, `metro.js`, `washington.js`,
  `reglages.js`, `reseau.js`…). Six rouges, triés ainsi :
  - DÉJÀ DÉCLARÉS : `carteMonde.js` « aucune voiture ne traverse un monument »
    (`{"dur":6,"lus":597,"par":{"Tour Eiffel":4,"Invalides":2}}`, au chiffre près
    l'entrée de la v321) ; `maj.js` « corps, programmes et fond de carte sont
    vraiment là » (personnages 7/9, v267) ; `manhattan.js` le trou de façade
    (14 460 → 51 734), le taxi tactile, et une erreur PeerJS « Lost connection
    to server » au courtier local.
  - REJOUÉS SEULS DES DEUX CÔTÉS, VERTS : `carte.js` (au portail « la flèche du
    GPS », gauche lue à 1,92 rad — 103/103 seule sur la branche ET sur
    `origin/main` v323) ; `hote.js` (au portail « un nouvel arrivant rejoint le
    monde repris » `[]` — 9/9 des deux côtés). Intermittences de charge.
  - REJOUÉ SEUL DES DEUX CÔTÉS, ROUGE IDENTIQUE : `monte.js`, 145 verts / 2
    rouges sur la branche ET sur `origin/main` — « l'écran ne se fige pas »
    (3 300 ms · 28,7 % contre 2 917 ms · 24,9 %) et « ne compile plus de
    programmes sur place » (branche : 3 programmes `physical` à Paris ;
    `origin/main` : 2 `physical` à New York, chauffe de NY expirée à 162/320 ;
    au portail de la branche : 0 partout mais Paris à 7 images pour une garde à
    10). Preuve STRUCTURELLE en plus : la v324 ne crée aucun matériau (aucun
    `Material(` dans son diff de `src/`), et les clés `physical` sont celles des
    carrosseries de la flotte — un modèle tiré à portée pour la première fois.
  - SECOND PASSAGE (rebasée sur la v326, alors v327) : `carteMonde.js`,
    `maj.js`, `carte.js`, `hote.js` VERTS. Rouges : `manhattan.js` le délai de
    la ligne 282 (dette v269) ; `monte.js` les deux mêmes témoins (Paris 3
    programmes `physical`, écran 3 183 ms · 26,7 %) ; `reseau.js` « un hôte
    sans courtier est trouvé par un invité » `[[],[]]` — rejouée SEULE : 77/77
    sur la branche, et 70/7 sur `origin/main` v326 (« à trois, chacun voit les
    deux autres », « la voiture prise garde sa couleur »…). Intermittence de la
    suite réseau, des deux côtés.
  - TROISIÈME PASSAGE (rebasée sur la v328, alors v329) : quatorze suites
    vertes, `reseau.js` comprise. Rouges : `manhattan.js` (trou de façade
    17 102 → 51 734, taxi tactile « bouton jamais visible », PeerJS « Lost
    connection to server » — tous déclarés) ; `monte.js` « l'écran ne se fige
    pas » seul (3 283 ms · 25,3 %), dette mesurée des deux côtés ci-dessus.
  - QUATRIÈME PASSAGE (rebasée sur la v332 puis la v334, livrée en v335) : treize suites
    vertes, 77 min. Rouges : `manhattan.js` (trou de façade 11 684 → 54 969,
    taxi tactile `locator.tap` hors délai — déclarés) ; `monte.js` les deux
    mêmes (Paris 3 programmes `physical` ; écran 3 117 ms · 22,1 %) ;
    `carte.js` huit rouges issus d'UNE cause — la question « Téléporter / S'y
    rendre » ouverte mais `vis: false` à chacun des quatre appuis. Rejouée
    SEULE : 103/103 sur la branche ; sur `origin/main` (v332) 101 verts et un
    rouge de charge (« glisser bridé ×4 », 439 ms pour 400). Intermittence de
    charge, à surveiller si elle revient sur la question du GPS (v306).
    Rebasée ensuite sur la v330 (aéroports, routes : rien de commun) ; les
    balises de version des commentaires de `src/` ont été retirées pour qu'un
    rebasage ne touche plus que la documentation.
- [ ] **LE PORTAIL DE LA v330 (les terminaux), DOUBLE MESURE FAITE.** Seule
  suite rouge : `monte.js`, rejouée SEULE trois fois sur la branche et une fois
  sur `origin/main` (v326). « L'écran ne se fige pas en arrivant sur une ville »
  rouge à chaque passage des deux côtés (branche 3 400 · 26,2 %, 3 317 · 25,2 %,
  3 433 · 27,9 % ; `origin/main` 3 733 · 29 %), dette déjà déclarée. « Se
  téléporter ne compile plus de programmes » : rouge au portail (Paris à huit
  images, zéro programme neuf) et une fois sur trois seule sur la branche (trois
  programmes de voiture `physical` à Paris), vert deux fois seule sur la branche
  et seule sur `origin/main` — l'intermittence des v323 et v324 ; la livraison
  n'ajoute que des blocs, aucun matériau. « Un train s'arrête devant la voiture
  de l'enfant » rouge une fois sur `origin/main` seul (13 relevés dedans), vert
  partout ailleurs. Et « descendu de la voiture de Paris », rouge deux fois sur
  deux sur la branche, était un défaut du TÉMOIN, corrigé ici : à la seconde
  pose de `poserAParis`, la voiture était retirée sous l'enfant encore assis.
  SECOND PORTAIL, après rebase sur la v327 : `maj.js` rouge sur trois témoins
  (le loader de l'installation, la libération, le flou pendant la préparation)
  — REJOUÉE SEULE, les trois mêmes rouges sur la branche ET sur `origin/main`
  (v327), qui en rend un quatrième (le palier, `range: false`) : dette de charge
  déjà déclarée. `carte.js` rouge sur « la flèche du GPS pointe vers la
  destination » (gauche lue à 1,92 rad au lieu d'un angle négatif) — verte seule
  sur la branche, ROUGE seule sur `origin/main` (même valeur) : une intermittence
  en production depuis la v321, NEUVE dans ce fichier, à démonter (la flèche lue
  pendant sa transition ? le style écrit, v321).

- [ ] **LE PORTAIL DE LA v329.** `carteMonde.js` (ENTIÈRE, le témoin de l'A1
  Sud compris — rouge sur `origin/main` : « aucun convoi A1 Sud », douze
  segments), `plafond.js`, `maj.js`, `carte.js` verts ; `monte.js` : l'écran
  figé (3 500 ms · 28,8 %) et « se téléporter ne compile plus » (la chauffe de
  New York expirée à 56/320 sous la charge), tous deux rejoués SEULS rouges des
  deux côtés au portail de la v327 ci-dessous.
- [x] **LA PRODUCTION N'A PAS REÇU LA v328 (4 octobre, 05 h 46 UTC) — RÉSOLU : la fusion de la v329 a été servie en une minute, v328 comprise.** Fusion
  faite (83a48bb), `sw.js` servi en v327 une heure plus tard (`age: 3610`,
  `x-vercel-cache: HIT`) ; les aperçus de PR se déploient, pas la production.
  La session n'a pas le droit de lister les déploiements Vercel (403) : à
  regarder dans le tableau de bord du projet `minecraft-fam`.
- [ ] **LE PORTAIL DE LA v328.** `carteMonde.js` (ENTIÈRE, le témoin du Yamuna
  compris — rouge sur `origin/main` : « aucun convoi Yamuna », onze segments),
  `plafond.js`, `maj.js`, `carte.js` verts ; seul rouge, l'écran figé de
  `monte.js` (3 600 ms · 44,2 %), dette déclarée, rouge des deux côtés.

- [ ] **LE PORTAIL DE LA v327, SUR LA v326 (règle de la v195), DOUBLE MESURE
  FAITE.** `carteMonde.js` (ENTIÈRE, le témoin de l'A4 compris), `plafond.js`,
  `carte.js` verts. `maj.js` : la libération de la préparation (la carte encore
  en cours), l'intermittence déclarée (v267). `monte.js` REJOUÉE SEULE des deux
  côtés : « l'on est descendu de la voiture de Paris » (la famille du bouton-
  bascule, v252, qui revient) rouge au portail, VERT seul sur la branche, ROUGE
  seul sur `origin/main` (v326) — une intermittence des deux côtés ; « la
  circulation s'arrête devant la voiture de l'enfant » rouge au portail
  seulement (34 au travers), vert seul sur la branche ; « se téléporter ne
  compile plus de programmes » rouge SEUL des deux côtés (branche et v326) —
  rouge en production, à démonter ; l'écran figé, rouge des deux côtés
  (3 133 ms branche, 4 216 ms `origin/main`).
- [ ] **LE PORTAIL DE LA v327 (premier, sur la v324).** `plafond.js`, `maj.js`, `carte.js` verts ;
  le témoin de l'A4 vert (rouge sur `origin/main` : « aucun convoi A4 », dix
  segments) ; seuls rouges, les deux dettes déclarées — le tour des monuments
  de Paris au pas près (`dur 6 · lus 597`) et l'écran figé (3 700 ms · 28,1 %).
- [ ] **LE PORTAIL DE LA v325 (règle de la v195), DOUBLE MESURE FAITE.** Huit
  suites. Verts : `carteMonde.js` — ENTIÈRE, le tour des monuments compris
  (rouge sur `origin/main`, `dur 6`) —, `plafond.js`, `parishd.js`, `carte.js`,
  `metro.js`. Rouges : `maj.js` le badge (la version monte à la fusion) et les
  deux témoins du palier (29 images au portail) — rejouée SEULE : le badge
  seul sur la branche, rien sur `origin/main` ; `monte.js` le témoin New York
  de la v319 au portail (chauffe expirée à 56/320) et l'écran figé — rejouée
  SEULE : l'écran figé seul, des deux côtés (3 533 ms · 30 % branche, 3 633 ms
  · 26 % `origin/main`).
- [ ] **LE PORTAIL DE LA v324.** `plafond.js`, `maj.js`, `carte.js` verts ;
  `carteMonde.js` : le témoin de l'Autosole vert (rouge sur `origin/main` :
  « aucun convoi Autosole », neuf segments), seul rouge le tour des monuments
  de Paris au pas près (`dur 6 · lus 597`). `monte.js` : l'écran figé (3 233 ms
  · 27,3 %, dette déclarée) et « se téléporter ne compile plus de programmes »,
  rouge au portail seulement — rejoué seul des deux côtés en v323 (portail de la
  v322 ci-dessous), vert sur la branche ET sur `origin/main`.
- [ ] **LE PORTAIL DE LA v323 (règle de la v195), DOUBLE MESURE FAITE.**
  `plafond.js`, `maj.js`, `carte.js` verts ; `carteMonde.js` : le témoin de
  l'E1 vert (rouge sur `origin/main` : « aucun convoi E1 », huit segments), et
  le seul rouge est le tour des monuments de Paris déjà déclaré, au pas près
  (`dur 6 · lus 597 · Tour Eiffel 4 · Invalides 2`). `monte.js` REJOUÉE SEULE
  des deux côtés : « le bouton « Conduire cette voiture » s'offre tout seul »
  rouge au portail (`🚇 Monter à bord` — la bouche de métro de la rive gauche
  passe avant la voiture), VERT seul sur la branche ET sur `origin/main` : une
  intermittence. « L'écran ne se fige pas en arrivant sur une ville » rouge
  des deux côtés (branche 3 467 ms · 28,3 %, `origin/main` 2 817 · 22,2 %),
  dette déjà déclarée. NEUF ET DÉCLARÉ : « et elle ralentit assez pour qu'on
  puisse la rejoindre » rouge des deux côtés à l'identique (9,1 m/s sur la
  branche, 9,0 sur `origin/main` au plus lent) — en production, sans rapport
  avec une route au Japon ; à démonter (quel convoi, quelle cadence).
  SECOND PORTAIL, après rebase sur la v321 (le GPS) : `carte.js` rouge en
  cascade (l'appui long décliné « retard » puis « pointeurs 0 », tous les
  témoins du GPS à `null` derrière lui — la famille de charge de la v269) et
  `monte.js` « se téléporter ne compile plus de programmes » : REJOUÉES SEULES,
  `carte.js` VERTE sur la branche ET sur `origin/main` (v321), le témoin de
  compilation vert des deux côtés ; seul reste « l'écran se fige », rouge des
  deux côtés (branche 2 950 ms · 20,8 %, `origin/main` 3 217 · 25,4 %).
  TROISIÈME PORTAIL, après rebase sur la v322 (les voitures partout) :
  `plafond.js`, `maj.js`, `carte.js` verts ; seuls rouges, les deux dettes
  déclarées ci-dessus — le tour des monuments de Paris au pas près
  (`dur 6 · lus 597`) et l'écran figé (3 617 ms · 25,2 %).
- [ ] **LE PORTAIL DE LA v322, SECOND, APRÈS REBASE SUR LA v320.** Dix suites.
  Verts : `maj.js` (cette fois), `plafond.js`, `parishd.js`, `carte.js`,
  `washington.js`, `metro.js`. Rouges, rejoués SEULS des deux côtés sur la
  v320 : `carteMonde.js` « aucune voiture ne traverse un monument de Paris »
  (`dur 6 · lus 597`, au pas près des deux côtés — la dette de la v318, dans ma
  zone, prise par la livraison suivante) ; `monte.js` l'écran figé (branche
  3 200 ms · 25 %, `origin/main` 2 433 ms · 18,3 %) et, au portail seulement,
  le témoin de la v319 sur New York (14 programmes, la chauffe de New York
  expirée à 54/320 sous la charge) — vert rejoué seul sur la branche ;
  `manhattan.js` la géométrie de façade (14 460 → 51 734 et → 54 969) puis la
  page qui meurt (`locator.tap`, ou « le taxi roule », bouton jamais visible),
  des deux côtés. New York : 79 circuits, 78 de 109 blocs de plan (six
  voitures, au plancher, avant comme après) ; le déplafonnement n'y touche
  qu'un circuit.
- [ ] **LE PORTAIL DE LA v322 (règle de la v195), DOUBLE MESURE FAITE — premier
  portail, sur la base v317.** Dix suites. Verts : `carteMonde.js` (le témoin des 268 villes, rouge sur
  `origin/main`), `plafond.js`, `parishd.js`, `carte.js`, `washington.js`,
  `metro.js`. Rouges, rejoués SEULS des deux côtés :
  · `maj.js`, le badge — attendu, la version ne monte qu'à la fusion ;
  · `maj.js`, « corps, programmes et fond de carte » — la dette déclarée :
    branche 4 rouges sur 5 (libérée à 45–47 s, carte 8–9 pas ; le vert à
    41,9 s), `origin/main` 1 rouge sur 4 (48,2 s, carte 8 ; les verts à 40–43).
    Les deux issues des deux côtés, à la borne des 45 s ; la branche tombe plus
    souvent. Mesuré à part (`sonde-prep-carte.cjs`, page seule, alterné) : 2,0
    à 3,0 s des deux côtés, aucun écart ; et la page voisine en jeu au point
    d'apparition est IDENTIQUE (`sonde-cout-spawn.cjs` : 87 convois, 140
    voitures, aucune dessinée, des deux côtés). Le seul surcoût de démarrage
    de la branche — le tracé des douze tours, ~140 ms — est désormais calculé à
    la naissance du convoi (43 ms au démarrage) ;
  · `maj.js`, les deux témoins du palier (16 images au portail) — rouges au
    portail seulement, verts rejoués seuls des deux côtés, comme en v315 ;
  · `manhattan.js` — « le trou enlève la géométrie » (14 460 branche, 11 684
    `origin/main`) et le `locator.tap` à 30 s, identiques des deux côtés ;
  · `monte.js` — l'écran figé (3 300 · 3 333 ms branche, 3 416 `origin/main`) ;
    « les programmes à Paris » rouge au portail sur sa garde (10 images), vert
    seul des deux côtés (17 images neufs 4 ; 21 images neufs −2) ; « le bouton
    Conduire s'offre » vert au portail, rouge rejoué seul sur la branche (60 s
    sans voiture à neuf blocs), vert sur `origin/main` — rejoué sur page neuve
    (`sonde-bouton-rive.cjs`) : 3,9 · 1,9 · 2,9 s sur la branche, trois sur
    trois. Une intermittence de l'état que les témoins d'avant laissent (v279).
- [ ] **LE PORTAIL DE LA v319 (règle de la v195), DOUBLE MESURE FAITE.**
  `carteMonde.js` (le témoin de l'A3, rouge sur `origin/main` : « aucun convoi
  A3 », sept segments, aucune route sur un rail), `plafond.js`, `carte.js`
  verts. `monte.js` : deux rouges, tous deux déjà déclarés. « Les passants ne
  sont plus plantés au milieu de la chaussée » (29 % à Rome) — le tirage de la
  v291 ; rejouée SEULE, vert sur la branche. « L'écran ne se fige pas en
  arrivant sur une ville » — rouge seul des DEUX côtés : branche 4 366 ms ·
  59,1 %, `origin/main` 4 433 ms · 54,7 %.
  SECOND PORTAIL, après rebase sur la v318 : `carteMonde.js` rouge sur le tour
  des monuments de Paris (`dur 6 · lus 597 · Tour Eiffel 4 · Invalides 2`, au
  pas près le chiffre que la v318 a déclaré des deux côtés) ; `monte.js` l'écran
  figé et « la téléportation ne compile plus les programmes » (3 neufs pour une
  barre à 4 dépassée par tirage, dette de la v306, vert rejoué seul des deux
  côtés plus haut) ; `maj.js` la libération (`null`) et « ne floute rien » (le
  second dépend du premier) — REJOUÉE SEULE : branche ces deux-là, `origin/main`
  v318 la libération (programmes 17/25). Même intermittence de préparation des
  deux côtés, déjà déclarée (v267).
- [ ] **LE PORTAIL DE LA v347 (les steppes, préparée comme v346) : TOUS LES
  ROUGES DÉJÀ DÉCLARÉS.** Huit suites choisies par la table des gardiens,
  45 min. `metro.js`, `carteMonde.js`, `plafond.js` (le témoin des steppes
  compris), `maj.js`, `carte.js`, `washington.js` verts. `manhattan.js` : le
  trou de façade (11 684 → 51 734) et le taxi tactile (`locator.tap` hors
  délai), déclarés. `monte.js` : l'écran figé à l'arrivée (4 100 ms ·
  47,4 %), déclaré. La livraison ne change qu'une teinte et la densité
  d'arbres de la campagne des steppes réelles.
- [ ] **LE PORTAIL DE LA v345 (la toundra et la taïga, préparée comme v342 puis v344) :
  TOUS LES ROUGES DÉJÀ DÉCLARÉS.** Seize suites, 84 min. `plafond.js` (93 dont
  les cinq témoins neufs), `carteMonde.js`, `metro.js`, `washington.js`,
  `parishd.js`, `realisme.js`, `reglages.js`, `hote.js`, `visio.js`,
  `sauvegarde.js`, `parent.js` verts. `maj.js` : le loader « combien de
  fichiers » (intermittent, déclaré) et le badge (« version servie v341 » pour
  une tête de journal à 342 — `sw.js` pas encore monté, la procédure le règle).
  `carte.js` : la flèche du GPS (gauche 1,92 rad, déclarée). `manhattan.js` :
  le délai de la ligne 282 (dette v269). `monte.js` : Paris compile quatre
  programmes `physical` à l'arrivée et l'écran figé (3 583 ms · 28,3 %), tous
  deux déclarés. `reseau.js` : « sans courtier » `[[],[]]` (intermittence
  déclarée) — REJOUÉES SEULES : `plafond.js` verte ; `maj.js` badge vert,
  reste la préparation (programmes 19/27, intermittence déclarée) ;
  `manhattan.js` le délai de la ligne 282 ; `reseau.js` « un hôte sans
  courtier est trouvé » `[[],[]]` sur la branche, et sur `origin/main` v343
  rejoué seul la même famille (« deux enfants se retrouvent sans courtier du
  tout » `[[],[]]`, plus la voiture de la rue chez l'ami). La livraison n'ajoute aucun matériau ni aucune
  lampe, seulement une couleur de sommet et des blocs de campagne loin de
  tout point que ces témoins visitent.
- [ ] **LE PORTAIL DE LA v341 (les déserts) : TOUS LES ROUGES DÉJÀ
  DÉCLARÉS.** `plafond.js` (les trois témoins des déserts, celui de la page
  compris), `carteMonde.js`, `carte.js`, `metro.js`, `washington.js` verts.
  `maj.js` : le loader et le fond de carte (personnages 5/9), intermittence de
  la v340 ci-dessous. `manhattan.js` : le trou de façade (11 684). `monte.js` :
  la chauffe de New York expirée (55/321) et l'écran figé (3 683 ms · 32,5 %).
  La livraison ne change que la matière de la campagne des déserts réels,
  qu'aucun de ces témoins n'approche.
- [ ] **LES PORTAILS DE LA v340 (les arbres et les falaises, préparée comme v333, v337 puis v339), QUATRE FOIS.**
  `plafond.js` (les quatre témoins neufs), `carteMonde.js`, `metro.js`,
  `washington.js` verts à chaque passage. `maj.js` : le témoin « corps,
  programmes et fond de carte » rouge 2 fois sur 2 sur la branche rejouée
  SEULE (personnages 7/9, 8/9) et 1 sur 2 sur `origin/main` (v332) — la
  seconde passe du paysage lointain (2 ms par image) tournait aussi à
  l'accueil : elle ne passe plus qu'en jeu (`raffinerPermis`), et le témoin
  est resté rouge ensuite (6/9) : c'est l'intermittence déclarée, pas la
  livraison. Le palier, vert seul des deux côtés (charge du portail). Au
  troisième portail, un VRAI rouge, à moi : `nouveautes.js` recollé au rebase
  sans son accolade, et `node --check` muet (règle écrite dans `CLAUDE.md`) ;
  corrigé, `maj.js` VERTE au quatrième. `manhattan.js` : le délai de la
  ligne 282 (v269). `monte.js` : l'écran figé (3 833 à 4 250 ms, ~50 %, des
  deux côtés), « se téléporter ne compile plus de programmes » (zéro
  programme neuf dans les cinq villes, Paris à huit images — v326), et une
  fois « la monoplace ralentit assez » (9,0 pour une barre à 9 : un minimum
  échantillonné toutes les 300 ms sur une allure qui est une fonction de
  l'heure, v279 et v305), vert à tous les autres passages.
- [ ] **LE PORTAIL DE LA v338 (Madrid–Barcelone) : UN SEUL ROUGE, DÉJÀ
  MESURÉ DES DEUX CÔTÉS.** `carteMonde.js` (l'AP-2 comprise), `plafond.js`
  (joint : 0 trou sur 136 879 points), `maj.js`, `carte.js` verts.
  `monte.js` : l'arrivée figée (3 333 ms · 27,7 %), rouge à l'identique des
  deux côtés (v332).
- [ ] **LE PORTAIL DE LA v337 (Lyon–Marseille) : TROIS ROUGES, TOUS DÉJÀ
  MESURÉS DES DEUX CÔTÉS.** `carteMonde.js` (l'A7 comprise), `plafond.js`
  (joint : 0 trou sur 110 554 points) et `maj.js` verts. `carte.js` : la
  flèche du GPS, gauche à 1,92 rad — la valeur de `origin/main` rejoué seul
  (v327). `monte.js` : la téléportation (chauffe de New York expirée, 44/321)
  et l'arrivée figée (3 850 ms · 30 %), rouges à l'identique des deux côtés
  (v332).
- [ ] **LE PORTAIL DE LA v336 (Dallas–Houston), DEUX FOIS.** Le premier a
  trouvé un VRAI trou (le joint du premier pont de l'I-45, dans un coude :
  402 points), corrigé dans `rubansDans` ; le second : `parishd.js`,
  `carteMonde.js`, `plafond.js` (joint 0 trou sur 90 794 points, quatorze
  ponts), `carte.js`, `washington.js` verts. Rouges, déjà déclarés : `maj.js`
  les deux témoins du palier (26 images, aucun verdict — la charge, v315) ;
  `manhattan.js` « le trou enlève aussi la géométrie visible de la façade »
  (9 203 → 51 734, le témoin qui compte TOUS les immeubles, v291) ; `monte.js`
  l'arrivée figée (3 750 ms · 33,9 %) et la téléportation qui compile (chauffe
  de New York expirée, 54/321), rouges à l'identique des deux côtés (v332).
  Le comblement ne s'émet que dans un coude d'un pont ; il n'y en avait aucun
  avant l'I-45.
- [ ] **LE PORTAIL DE LA v334 (Berlin–Hambourg) : CINQ ROUGES, TOUS DÉJÀ
  MESURÉS DES DEUX CÔTÉS.** `carteMonde.js` (le témoin de l'A24 compris) et
  `plafond.js` verts. `maj.js` : la libération (personnages 6/9, programmes
  16/27) et le flou pendant la préparation — rejoués seuls rouges des deux
  côtés au portail de la v327. `carte.js` : la flèche du GPS, gauche lue à
  1,92 rad — la MÊME valeur que `origin/main` rejoué seul (v327). `monte.js` :
  l'arrivée figée (3 650 ms · 30,1 %) et la téléportation qui compile, rouges
  à l'identique des deux côtés (v332). La livraison n'ajoute qu'une entrée au
  registre des routes, en Allemagne du Nord, qu'aucun de ces témoins
  n'approche.
- [ ] **LE PORTAIL DE LA v333 (Milan–Bologne) : TROIS ROUGES, TOUS DÉJÀ
  MESURÉS DES DEUX CÔTÉS.** `carteMonde.js`, `plafond.js`, `carte.js` verts.
  `maj.js` : « le loader dit combien de fichiers sont rangés » (intermittent,
  même distribution des deux côtés, ci-dessous). `monte.js` : l'arrivée figée
  (3 550 ms · 30,5 % — rejouée seule une heure plus tôt, rouge à l'identique
  sur la branche et sur `origin/main`, ci-dessous) et « une voiture n'entre
  pas dans l'eau » (reculé 1,19 : le MÊME relevé déjà rendu par `origin/main`
  rejoué seul, tableau des rouges plus bas). La livraison n'ajoute qu'une
  entrée au registre des routes, en Italie, qu'aucun de ces témoins n'approche.
- [ ] **LE PORTAIL DE LA v332 (Vienne–Budapest), DOUBLE MESURE FAITE.** Six
  suites aiguillées ; `carteMonde.js`, `plafond.js`, `carte.js` verts. Rouges :
  `maj.js` (le fond de carte à la libération, personnages 6/9) et `monte.js`
  (l'arrivée figée, 3 183 ms · 28,7 % ; la téléportation, chauffe de New York
  à 59,9 s). REJOUÉES SEULES dans un arbre séparé : `monte.js` rouge à
  l'identique des deux côtés (branche 3 783 ms · 31,6 %, chauffe expirée 44/320 ;
  `origin/main` 3 467 ms · 28,8 %, chauffe expirée 68/320) ; `maj.js` : le fond
  de carte rouge sur `origin/main`, vert sur la branche — l'intermittence
  déclarée. Rejouées seules, la branche a rendu trois rouges de plus, verts au
  portail et déjà déclarés comme dépendant de la cadence : le loader qui compte
  ses fichiers (intermittent des deux côtés, ci-dessous), les deux témoins du
  palier (10 images seulement, aucun verdict — même cause qu'en v315), et « la
  voiture freine devant un piéton » (`voituresRue: 0`, la situation n'a pas eu
  lieu). Preuve structurelle en plus : la livraison n'ajoute qu'une entrée au
  registre des routes en Hongrie, qu'aucun de ces témoins n'approche.
- [ ] **LE PORTAIL DE LA v315 (règle de la v195), DOUBLE MESURE FAITE.** Le
  premier portail a trouvé un vrai défaut (l'avenue de Mombasa, 19 pas pour
  20), corrigé. Le second : `carteMonde.js`, `plafond.js` (onze ponts, 71 164
  points, zéro trou), `carte.js` verts. `maj.js` a rendu deux rouges NEUFS, les
  deux témoins du palier (« range son verdict », « se décide sur le TRAVAIL ») :
  23 images seulement au portail, aucun verdict. REJOUÉE SEULE : verts des DEUX
  côtés — branche 62 images, `origin/main` 61 — et le seul rouge restant est le
  fond de carte, identique des deux côtés (personnages 5/9). C'est la charge du
  portail : ces deux témoins exigent une fenêtre de jeu qu'un portail chargé ne
  leur donne pas toujours. `monte.js` : l'écran figé (3 833 ms · 32,6 %).
- [ ] **LE PORTAIL DE LA v314 (règle de la v195).** Verts : `carteMonde.js` (le
  témoin de l'A-4, rouge sur `origin/main`), `plafond.js` (joint des neuf ponts,
  58 099 points, zéro trou), `carte.js`. Rouges, déjà déclarés : `maj.js`
  (corps, programmes et fond de carte — personnages 6/9 cette fois), `monte.js`
  (l'écran figé : 3 400 ms · 28,9 %, dans l'étendue d'`origin/main`).
- [ ] **LE PORTAIL DE LA v313 (règle de la v195).** Verts : `carteMonde.js` (le
  témoin de la BR-116, rouge sur `origin/main`), `plafond.js` (le joint des
  ponts lit désormais les six ponts de toutes les routes : 38 339 points, zéro
  trou), `carte.js`. Rouges, déjà déclarés : `maj.js` (le fond de carte),
  `monte.js` (l'écran figé : 3 583 ms · 29,5 %, dans l'étendue d'`origin/main`).
- [ ] **LE PORTAIL DE LA v312 (règle de la v195).** Verts : `carteMonde.js` (le
  témoin de l'A20, rouge sur `origin/main`), `plafond.js`, `carte.js`,
  `washington.js`. Rouges, tous déjà déclarés : `maj.js`, « corps, programmes et
  fond de carte » (au portail 14/25 programmes ; rejouée SEULE, personnages 5/9 —
  ce qui manque varie, le témoin rougit) ; `manhattan.js:282` (délai, v269) ;
  `monte.js`, la monoplace à 9,1 pour < 9 et l'écran figé (2 967 ms · 23,8 %,
  sous l'étendue d'`origin/main`). La livraison ne touche ni l'accueil, ni
  Manhattan, ni les circuits.
- [ ] **LE PORTAIL DE LA v311 (règle de la v195).** Verts : `carteMonde.js`
  (le témoin de l'E19 et celui des entrées, élargi à toutes les villes
  engendrées — rouges sur `origin/main`, pas d'E19 ni d'entrée à Amsterdam),
  `plafond.js`, `maj.js`, `carte.js`. Un rouge, déjà déclaré : `monte.js`,
  l'écran figé à l'arrivée (3 833 ms · 31 %, dans l'étendue d'`origin/main`).
- [ ] **LE PORTAIL DE LA v310, RIEN DE NEUF (règle de la v195).** Verts :
  `carteMonde.js` (les deux témoins de l'E429, rouges sur `origin/main` par
  construction — un seul segment, aucune entrée à Bruxelles), `plafond.js`,
  `carte.js`, `washington.js`. Rouges, tous déjà déclarés avec leur double
  mesure : `maj.js` (le fond de carte), `manhattan.js` (la géométrie de façade
  9 203 → 51 734, le taxi au tactile 0,7 bloc, `PeerJS: Lost connection`),
  `monte.js` (l'écran figé à l'arrivée : pire image 3 783 ms, 33,8 %, dans
  l'étendue relevée sur `origin/main`, 3 517 ms · 41,4 % et 4 933 ms · 36,4 %).
  La livraison ne touche ni Manhattan, ni l'accueil, ni l'arrivée à Paris.
- [ ] **LE PORTAIL DE LA v309, DOUBLE MESURE (règle de la v195).** Rouges au
  portail, rejoués SEULS : `monte.js` sur la branche → 3 rouges (un train
  Eurostar qui traverse la voiture, 12 relevés « dedans » ; l'écran figé en
  arrivant sur une ville, 76 % d'images au-delà de 300 ms ; le vol d'une
  demi-minute, 422 blocs pour une borne à 500) ; sur `origin/main` → 3 rouges
  (compilation à l'arrivée à Paris, 3 programmes neufs ; écran figé, 81 % ;
  vol, 466 blocs). Les deux derniers sont identiques des deux côtés : ce sont
  des défauts de production, et le vol mesure la CADENCE (30 s d'horloge, `dt`
  borné) — à reformuler en blocs de jeu, comme la v224 l'a fait pour la
  montée. Le train et la compilation vont et viennent d'un côté à l'autre :
  intermittences (v269). Les trois autres rouges de `monte.js` au portail
  (monoplace à 9,0 pour < 9, reflets 8 tours pour > 8, réverbère « parcouru
  0 ») sont VERTS seuls. `washington.js` (la porte de l'îlot, mêmes
  coordonnées qu'en v250) : vert seul. `maj.js` : le fond de carte (dette
  ci-dessous, ligne « corps, programmes et fond de carte »). `manhattan.js:282` :
  dette déclarée (v269).
- [ ] **LA VOIE FERRÉE NE SUIT PAS LE FONDU DOUX (v309).** Près de Barcelone,
  d'Amsterdam et de Florence, le profil lissé de la voie (et le quai de leurs
  gares) descend d'un bloc avec le relief abaissé ; la marche 6 → 7 décale un
  bloc d'enfant du RELIEF sous sa colonne, pas du quai. Un bloc posé sur l'un de
  ces trois quais avant la v309 flotte d'un bloc. Remède s'il le faut : une
  marche qui lit `voieEn`/`gareEn` du monde v308 contre celui d'aujourd'hui.
- [ ] **LES 2 RAYONS DE VILLE « SUR SON PAYS » (v309).** Le cône ne relève
  jamais le pays (il inonderait des côtes) : deux rayons restent plus raides
  qu'un bloc par bloc, ville au-dessus. À mesurer si Max les voit.
- [ ] **LE KIT v4 VISE LE MONDE ENTIER, PAS PARIS (Max, 27 septembre).** Ce qui
  est intégré au jeu : le sol continu hors villes (v297), l'A1 Paris–Lille
  (v300), le rail continu sur les neuf segments (v302). Ce qui reste, dans
  l'ordre du kit (`transport-v298/README.md`) : (a) le raccord ville/campagne
  pour TOUTES les villes — FAIT en v308 et v309 (seuils à marche 33,7 % →
  14,5 % → 4,0 %, le fondu raide adouci) ; (b) les autres routes interurbaines
  — FAITES : A1 (v300), E429 Lille–Bruxelles (v310), E19 Bruxelles–Amsterdam
  (v311, par l'ouest d'Amsterdam et l'est de Bruxelles : le relief ne laisse
  pas d'autre entrée sous neuf blocs de déblai), A20 Montréal–Québec (v312), BR-116 São
  Paulo–Rio (v313), A-4 Madrid–Séville (v314). **Florence–Rome, NON FAITE à
  dessein** : Fiumicino (3655, 3967, r 72) est posé AU NORD de Rome, sur la seule
  entrée nord propre de sa trame (−100° à −103°) — 79 819 tracés, tous refusés
  par sa marge ; l'autre entrée propre (−175°, −192°) arrive par la mer, deux
  cents blocs de viaduc. Déplacer un aérodrome est une décision de Max
  (invariant 1) ; un viaduc en mer aussi. A109 Nairobi–Mombasa faite en v315. A3 Cologne–Francfort faite en v320 (au sud de l'ICE : au nord, l'aérodrome de Francfort ne laisse pas la place d'une emprise). E1 Kyoto–Nagoya faite en v323 (au sud du Shinkansen, où les deux trames ont une entrée propre ; un étang contourné par le nord, aucun pont). Autosole Bologne–Florence faite en v324 (aucun pont ; un point de passage sur le rayon de chaque entrée). A4 Milan–Turin faite en v327 (sept tracés sur 36 432, le déblai a fait le tri ; aucun pont). Yamuna Delhi–Agra faite en v328 (soixante-huit tracés sur 18 216, aucun pont). A1 Sud Rome–Naples faite en v329 (sortie est de Rome, puis un virage en plusieurs fois ; aucun pont). M1 Vienne–Budapest faite en v332 (1 573 admissibles sur 18 216, aucun pont). A1 Nord Milan–Bologne faite en v333 (au nord de la Frecciarossa, qui sort de Milan à 51° ; Milan par −16°, Bologne par −156° ; 31 admissibles sur 5 082, sept sans pont). **Séoul–Busan BLOQUÉE PAR LE RELIEF** (v333) : Busan (ville à 33) est cerclée côté terre d'une crête à 50–60 blocs entre r + 10 et r + 40, et la mer de l'autre ; 8 450 tracés, aucun admissible (1 236 déblai, le reste coude). Abaisser la crête est une décision de Max. A24 Berlin–Hambourg faite en v334 (Hambourg par l'est, porte à vingt-quatre blocs du bord ; un seul tracé sans pont sur 2 904). I-45 Dallas–Houston faite en v336 (Houston par le sud après l'avoir contournée par l'est ; trois ponts ; cinq admissibles sur 24 000 chemins lissés). A7 Lyon–Marseille faite en v337 (à l'ouest du TGV ; Lyon par 130°, Marseille par −136° ; trois ponts ; quatre admissibles sur 2 025). AP-2 Madrid–Barcelone faite en v338 (Barcelone par −170°, son côté bas ; quatre ponts ; neuf admissibles sur 16 000 chemins lissés, le joint mesuré sur chacun). Restent, hors des zones des autres sessions : Paris–Lyon (FAITE en v419), San Francisco–Los Angeles et Marseille–Nice (villes bâties à la main, réservées), New York–Boston et New York–Washington (Manhattan, entrée à instruire à la main), Londres–Birmingham (FAITE en v415), et les corridors bloqués ci-dessus. Hansalinie Cologne–Hambourg faite en v355 (Cologne par −108°, entre l'ICE et l'aérodrome ; Hambourg CONTOURNÉE par l'ouest, entrée par le nord-ouest −134° — l'Elbe ferme le sud du disque entre 38 et 70 blocs du centre, l'A24 l'est, un pont de l'Alster borde l'axe nord ; aucun pont ; 397 admissibles sur 1 500). Dette vue en passant en v355 : la porte de l'A3 à Francfort creusait un pont de la ville — FAITE en v362 (le talus s'arrête à un bloc au-delà du bout d'une route ; le témoin des ponts de villes lit les dix-huit villes à pont qu'une route touche). 401 Toronto–Montréal faite en v355 (Toronto par −18°, Montréal CONTOURNÉE par le sud et prise par son axe sud, 88° ; aucun pont ; seize admissibles sur 3 000). La sonde qui contourne une ville est le couloir le plus bas cherché sur une grille qui porte le CAP (huit directions, un huitième de tour au plus après deux pas droits), rails, autres routes et aérodromes interdits, puis Chaikin et simplification sous 22° de coude, `profilDe` appelé sur chaque candidat — scratchpad de la v355, décrite dans CLAUDE.md « Les routes qui contournent ». M40 Londres–Birmingham faite en v415 (sortie nord de Londres, entrée déclarée `ENTREES_LONDRES` jusqu'à Pentonville Road ; le col de la crête nord-sud à 41-46 ; Birmingham par 45°, l'axe de sa trame ; deux ponts, joints fermés ; 69 admissibles sur 480). **Dette vue en v415 : la trame générique de `world.js` (« one lot per grid cell ») tourne encore pour Londres** — elle n'est pas dans la liste des six villes exclues — et pose des maisons par-dessus la ville dans l'anneau de 77 à 102 blocs du centre ; v415 ne les retire que sur la route et son entrée. Les retirer partout est juste, mais touche des toits où un enfant a pu bâtir : il faut la marche de migration (ou la ville d'avant figée) qui va avec. A6 Paris–Lyon faite en v419 (à l'ouest du TGV d'un bout à l'autre — à l'est, un massif de 46 à plus de 60 ; Paris par 86°, la porte d'Italie, l'entrée déclarée de paris.js menant à la place d'Italie et non plus à la Gare du Nord ; Lyon par −144°, −147° ayant des bancs sur son avenue ; un pont ; 298 admissibles sur 720). Tōmei Tokyo–Nagoya fait en v381 (la bande côtière au sud du Shinkansen, entre la montagne et la mer : Haneda et Yokota ferment la plaine à l'ouest de Tokyo ; Tokyo par 132°, porte à vingt-quatre blocs du bord, Nagoya par 60° ; un pont ; 22 admissibles sur 300). Suivants dans l'ordre du relevé (courts, sans rail) : New York–Boston (eau 135), New York–Washington (eau 150 ; FAITE en v367, I-95 Sud : seconde porte de New York sur la rive de l'Hudson, Washington par le sud, `boutNet` et `avenues` ; vingt et un admissibles sur 2 500, aucun sans pont) — New York est Manhattan, une ville à part (pas dans VILLES_MONDE) : son entrée est à instruire à la main. Instruit en v355 sans le faire : Manhattan est un RECTANGLE de 480 × 2 300 blocs (`BORNES`, manhattan-plan.js, z de −1 300 à +1 000 autour de l'ancre) et non le disque de 152 du registre — `porte()` (r − 20 sur le rayon) poserait la porte SUR l'île, et le raccord de quarante blocs y écrirait son remblai dans les rues (« la route a le dernier mot sur sa colonne »). Il faut une porte déclarée hors de l'île, au bout d'un pont sur l'East River ou le Hudson, ce qui touche `porte()` ou `manhattan-*.js` : une livraison à elle. FAITE en v362 pour la porte : `portes: { ny: [x, z] }` dans la fiche de la route, sur la rive est hors du rectangle ; I-95 New York–Boston faite en v362 (porte NY à (276, −890) du centre, Boston par 145°, un pont, 86 admissibles sur 12 000) ; Londres–Birmingham FAITE en v415. **Los Angeles–San Diego BLOQUÉE** (v332) : une crête au-dessus de 46 blocs à l'est de Los Angeles (z 8 950 à 9 310), et le couloir côtier passe dans la marge de LAX — 265 120 tracés, aucun admissible (9 644 refus aérodrome, 25 076 pont près d'une porte : San Diego est entourée d'eau au nord-ouest). Déplacer LAX ou abaisser la crête est une décision de Max. **Manchester–Liverpool BLOQUÉE PAR LE RELIEF** (v324) : une crête au-dessus de 46 blocs barre tout l'espace entre les deux disques (villes à 33) ; 58 340 tracés, aucun admissible (8 970 déblai, 6 125 pont près d'une porte). Un tunnel ou un relief abaissé est une décision de Max. INSTRUITES en v323 sur l'axe direct, faute de la liste du kit (hors dépôt) — longueur · eau · rail à douze blocs · villes · aérodromes · repères : Manchester–Liverpool 222 · 11 · 0 · 0 · 0 · 0 ; Bologne–Florence 342 · 0 · 0 · 0 · 0 · 0 ; Milan–Turin 530 · 10 · 0 ; Delhi–Agra 656 · 41 · 0 (le Taj Mahal) ; Rome–Naples 683 · 81 · 0 ; Los Angeles–San Diego 718 · 25 · 0 ; Londres–Birmingham 767 · 29 · 0 ; Milan–Bologne 924 · 24 · 3 ; Vienne–Budapest 957 · 33 · 0 ; Tokyo–Nagoya 961 · 142 · 941 (Shinkansen) · Haneda sur l'axe ; New York–Boston 1 020 · 135 · 0 ; Berlin–Hambourg 1 293 · 42 · 0 ; New York–Washington 1 297 · 150 · 0 ; Lyon–Marseille 1 363 · 77 · 1 328 (TGV) ; Séoul–Busan 1 471 · 2 · 0 ; Paris–Lyon 1 625 · 54 · 1 588 (TGV) ; Dallas–Houston 1 781 · 44 · 0 ; Hambourg–Cologne 1 858 · 137 · 0 ; Madrid–Barcelone 2 068 · 199 · 2 033 (AVE) ; Toronto–Montréal 2 305 · 144 · 0 ; San Francisco–Los Angeles 2 403 · 131 · 0 · SFO et deux repères ; Marseille–Nice 596 · 401 · 0 · la Promenade des Anglais (l'axe direct est en mer). Ordre retenu : les courts sans rail ni eau d'abord. Restent à instruire les autres
  candidats du kit (liste hors dépôt), un par un. INSTRUITES en v310 sur
  l'axe direct (longueur · eau · rail parallèle · obstacles) : Bruxelles–
  Amsterdam 790 · 56 · 0 · aucun ; Montréal–Québec 873 · 18 · 0 ; São Paulo–
  Rio 611 · 28 · 0 ; Nagoya–Kyoto 314 · 0 · 107 (le Shinkansen le long) ;
  Cologne–Francfort 739 · 6 · 349 ; Madrid–Séville 1 835 · 42 · 0 ; Nairobi–
  Mombasa 1 906 · 20 · 0 ; Florence–Rome et Tokyo–Nagoya ont un aérodrome sur
  l'axe ; NY–Washington traverse DC ; SF–LA passe sur SFO et deux repères.
  Les trois corridors instruits en v310 sont faits ; les suivants sont à
  instruire parmi les candidats du kit. Le kit propose 23 corridors
  candidats (`examples/road-candidates.json`), à instruire un par un contre
  l'eau, les aérodromes, les repères et les sanctuaires comme l'A1 ; (c) les
  falaises et l'eau — FAIT en v326 pour la MATIÈRE (roche sous le gazon dès
  deux blocs, crête de roche dès quatre, grève de sable et de gravier au bord
  de l'eau ; `matiereDuBord`, world.js). Reste, déclaré : la FORME — une
  falaise reste un escalier de cubes de roche, et l'adoucir (une surface
  rocheuse inclinée au-delà de `MARCHE_MAX`) toucherait au contact et au
  franchissement, ou au relief (décision de Max) ; les berges de trois blocs
  gardent leur couronne d'herbe. `horizon.js` et les arbres lisent la règle
  depuis la v340 (`couleurDuBord`, `solDeLArbre`) ; (d) les
  textures par usage et climat — PREMIÈRE TRANCHE en v341 : les déserts chauds
  réels (`DESERTS`, terre.js) sont de sable, sans arbre, au sol, au loin et sur
  la carte ; SECONDE TRANCHE en v345 : la toundra et la taïga (`CLIMATS`,
  terre.js) — la teinte d'herbe par colonne est MESURÉE gratuite (une
  question par morceau, 0,37 µs par colonne près d'un bord, mailleur 9,34
  contre 9,32 ms hors zone) ; TROISIÈME en v347, les steppes ; QUATRIÈME en
  v349, les tropiques humides — les quatre climats du kit sont faits ; (e) la bibliothèque architecturale (96
  variantes, 278 profils de ville) — elle exige une retrame à un bloc pour un
  mètre (`docs/monde-fidele/programme.md`, section 6), décision de Max ; (f) la
  matrice de couverture ville par ville (convertie, exclue, bloquée) — FAITE
  en v347, ENGENDRÉE (`tests/sonde-couverture.cjs` →
  `docs/monde-fidele/couverture.md`, 276 villes : rues 264 converties, 8
  exclues, 4 bloquées — San Francisco, Nice, Lille, Washington ; 7 villes sans
  anneau de circulation, toutes exclues ; 33 reliées par une route) — et les
  mesures sur l'iPad de la maison.

- [x] **LES MONUMENTS DE PARIS SONT PLUS BAS QUE LES IMMEUBLES (v301)** — fait
  en v335 pour Paris, à l'ÉCHELLE DU CIEL : un bloc pour un mètre jusqu'à la
  corniche (20 m), puis une courbe qui mène la tour Eiffel (330 m) à 69.
  Montparnasse 60, Invalides et Notre-Dame 48, Panthéon et Sacré-Cœur 47, Opéra
  41, Bastille 36, Arc 35. Le premier jet à un bloc pour un mètre (Invalides
  107, Notre-Dame 96…) passait au-dessus de la tour Eiffel : vu en capture,
  retiré. Si Max veut la vraie hauteur malgré tout, c'est UNE constante
  (`EIFFEL_BLOCS` ou la courbe de `blocsDuCiel`, echelle-monuments.js).
- [ ] **LES MONUMENTS DES AUTRES VILLES PLUS BAS QUE LEURS IMMEUBLES** (v335,
  mesuré, élargi par Max : « lance sur toutes les villes »). Le témoin de
  `plafond.js` mesure 215 monuments dans leurs villes contre la médiane des
  immeubles autour. **Lot 3, les villes engendrées : FAIT en v342** — chaque
  ville a son ciel (`CIELS`, corniche mesurée), quarante-deux monuments remis à
  l'échelle, treize repères montés pour garder l'ordre du vrai ciel, cinq
  reclassés `vrai` (colonne de Marie, Topkapi, Templo Mayor, Pavillon d'or, Wat
  Pho). **Lot 2, les villes bâties à la main : FAIT en v350** — l'Opéra de
  Lille 6 → 11, Buckingham 7 → 12, les Archives 11 → 15 (ciels de Lille [7, 0,4],
  Londres [8, 0,75], Washington [13, 0,26]) ; l'Arche de Washington, le Trésor,
  le Théâtre Ford, l'Histoire américaine et l'Indien d'Amérique passent en
  `vrai` (Washington plafonnée par la loi de 1910, et les deux musées
  passeraient au-dessus des tours-fûts du château du Smithsonian, 44 m).
- [ ] **LE PORTAIL DE LA v350 (monuments du lot 2, cubes de Paris) : LES ROUGES
  SONT TOUS DES DETTES DÉJÀ MESURÉES.** Deux portails sur la branche avant le
  rebase (v342 + la livraison) : `plafond.js`, `parishd.js`, `carteMonde.js`,
  `carte.js`, `washington.js`, `metro.js` verts les deux fois. Rouges :
  `maj.js` le loader qui compte ses fichiers (2/2) et, au second, la
  libération et « ne floute rien » ; `manhattan.js` le délai de la ligne 282
  (1er) et le trou de façade (2e, 22 326 → 51 734, l'étendue déjà relevée) ;
  `monte.js` la compilation à la téléportation (NY 15 puis Paris 6, comme v342),
  le gel d'arrivée (25 % puis 32,3 %), et au second « un train s'arrête devant
  la voiture » (13 relevés dedans — le chiffre exact de la v336 sur
  `origin/main`). `maj.js` REJOUÉE SEULE : branche le loader + les deux témoins
  du palier (34 images, aucun verdict — la dépendance à la cadence des v315 et
  v316) ; `origin/main` le loader seul. Preuve structurelle : la livraison
  étire trois monuments à Lille, Londres et Washington et épaissit trois
  modèles HD de Paris, coupés en rendu logiciel (`RAYON_HD` 0) ; aucun de ces
  témoins ne les dessine.
  Troisième portail, après le rebase sur la v348 : sept suites vertes (fumée,
  métro, parishd, carteMonde, plafond, carte, washington) ; rouges, toutes
  déjà dans le tableau de la v342 ci-dessous : `maj.js` le loader seul ;
  `manhattan.js` le trou de façade (9 203 → 51 734, dans l'étendue) et le taxi
  tactile (1,06 bloc en 84 s, le chiffre exact des deux côtés en v342) ;
  `monte.js` la compilation à la téléportation (Paris 3 `physical`) et le gel
  d'arrivée (24,4 %, sous les 27,5 % d'`origin/main` en v342).
  Quatrième, après le rebase sur la v349 (forêts tropicales) : mêmes sept
  vertes, mêmes rouges — loader, trou de façade (14 460 → 51 734), compilation
  à la téléportation (chauffe de New York expirée à 163/321), gel d'arrivée
  (25,5 %) ; le taxi tactile est passé vert.
- [ ] **LE PORTAIL DE LA v342 (monuments du lot 3) : TROIS SUITES ROUGES, LA DOUBLE
  MESURE EN MAIN.** Sept suites vertes (fumée, métro, parishd, carteMonde,
  plafond, carte, washington). Rejouées SEULES des deux côtés :

  | témoin | branche | `origin/main` (v335) |
  | --- | --- | --- |
  | `manhattan.js` le trou enlève la géométrie de la façade | ❌ 17 102 → 51 734 | ❌ 25 316 → 51 734 |
  | `manhattan.js` le taxi roule aux contrôles tactiles | ❌ 1,06 bloc en 83 s | ❌ 1,06 bloc en 85 s |
  | `monte.js` l'écran ne se fige pas à l'arrivée | ❌ 21,6 % au-delà de 300 ms | ❌ 27,5 % |
  | `monte.js` se téléporter ne compile plus de programmes | ❌ au portail (6 `physical` à Paris) | dette v324–v327, rouge seul des deux côtés |
  | `maj.js` le loader dit combien de fichiers sont rangés | ❌ 2 fois (portail, 1er rejeu), ✅ 3 fois | ✅ 4 fois |
  | `maj.js` le loader ne s'efface qu'une fois les corps prêts | ❌ au 1er portail, ✅ 4 fois seule | ❌ 1 fois sur 4 |

  `maj.js` rejouée seule trois fois de suite est ENTIÈREMENT verte sur la
  branche. Tous sont des dettes déjà déclarées plus haut, sauf les deux lignes
  de `maj.js`, des INTERMITTENCES vues des deux côtés (règle v269 : la distribution, pas un passage) : le témoin lit le
  loader dix fois par seconde pendant une installation qui range 105 fichiers,
  et il ne voit parfois que la phrase fixe. Preuve STRUCTURELLE en plus : la
  v342 ne touche ni `sw.js` (hors version), ni `index.html`, ni le loader — une
  table de hauteurs, un témoin, une sonde. Le badge de version (« version
  servie v335 » au premier portail) était le bump manquant, réglé.
- [x] **DEUX INVERSIONS DU VRAI CIEL DANS LES VILLES BÂTIES À LA MAIN (v350),
  mesuré. Le château du Smithsonian : FAIT en v357 ; St Paul : FAIT en v365**
  (Big Ben rendu au ciel de Londres par un bâtisseur à trente-neuf blocs,
  St Paul sur son tambour à quarante et un, sous le London Eye ; Tower Bridge
  et le London Eye entrent dans les `FIXES`) (sa tour du nord, deux
  blocs de côté, monte à quatorze — `buildChateauSmithsonianHaut`, entre
  Jefferson et la Bibliothèque du Congrès ; il est dans les `FIXES`). Reste St
  Paul : Big Ben est à soixante-neuf blocs, aucune coupole de la City ne peut
  passer au-dessus sans devenir une tour — c'est Big Ben qu'il faudrait
  remettre dans le ciel de Londres, décision de ville bâtie à la main. Le témoin d'ordre étendu au lot 2 les a trouvées entre repères que
  la livraison ne touche pas : la cathédrale St Paul (111 m) à dix-sept blocs,
  sous Big Ben (96 m) à soixante-neuf ; le château du Smithsonian (44 m) à
  onze, sous le mémorial Jefferson (39 m) à treize. Retirés des `FIXES` du
  témoin. St Paul est une coupole (`corps` possible, et le dôme se voit de tout
  Londres) ; les tours du château sont des fûts d'un bloc, à remonter par leur
  bâtisseur, pas par une table.
- [x] **LA GRANDE ROUE DU PRATER SOUS LA HOFBURG (v342) — FAIT en v357** : une
  roue à son vrai rayon (`buildRoueDuPrater`, neuf blocs, ce que tient sa
  boîte), vingt-deux blocs au-dessus de la Hofburg (vingt et un) ; elle est
  dans les `FIXES`. Tivoli et la High Roller restent (la boîte ne tient pas
  la roue qu'il faudrait). Texte d'origine : La roue (65 m)
  reste à seize blocs et la Hofburg (30 m) monte à vingt et un : une roue ne
  s'étire pas, elle deviendrait une ellipse. Le témoin d'ordre ne la compte pas.
  Si on veut la garder au-dessus, c'est son bâtisseur (`buildGrandeRoue`) qui
  doit grandir d'un rayon, pas une table de paliers. Même cas pour Tivoli.
- [x] **UNE COUPOLE SANS SA NEF DEVIENT UNE TOUR (v342), vu en capture. FAIT pour
  Saint-Pierre en v357, pour TOUTES LES VILLES en v365** : le témoin neuf
  (« aucune coupole ni aucun palais partagé ne monte seul en tour »,
  `plafond.js`) a trouvé seize gabarits `dome` et `palaisLong` montés seuls sur
  `origin/main` ; chacun a son édifice (`tour`), plus Sainte-Sophie, la Mosquée
  bleue et la tour de Galata. Texte d'origine : un bâtisseur avec la croix latine, la façade, le
  tambour et la calotte rigide (`buildSaintPierre`). Les autres coupoles
  partagées (Florence, Berlin, Sainte-Sophie) gardaient `dome`. Les
  bâtisseurs partagés (`dome`, `minaret`, `palaisLong`) sont des gabarits : St-
  Pierre est une coupole de treize blocs de large SANS la basilique autour.
  Remise à sa hauteur (38 blocs), elle garde les proportions vraies du tambour
  et de la calotte, mais sans nef sa silhouette est élancée. Le premier jet
  étirait aussi les premières couches de la calotte (même rayon que le tambour,
  couleur de la calotte) : un obus d'ardoise, corrigé (le corps s'arrête au
  tambour). Le remède de fond est un bâtisseur par monument, avec sa nef — pas
  une table de paliers.
- [ ] **LE PORTAIL DE LA v365 (les coupoles) : TOUS LES ROUGES DÉJÀ DÉCLARÉS OU
  IDENTIQUES SUR `origin/main`, UN DÉLAI NEUF NON REPRODUIT.** Rejoués SEULS des
  deux côtés (branche · `origin/main` v363) : `maj.js` la libération `null` et
  « ne floute rien » (identiques) ; `carte.js` « la faire glisser » 428 · 419 ms
  pour 400 ; `manhattan.js` « le trou enlève aussi la géométrie » (14 460 ·
  17 102 → 51 734 · 46 592, déclaré) et « le taxi roule avec les contrôles
  tactiles » (`#ride-btn` caché, une bête à portée, identique) ; `monte.js` le
  gel d'arrivée et la compilation à l'arrivée (déclarés, rouges sur
  `origin/main` seul). NEUF au portail : `manhattan.js:674`, l'invité ne rejoint
  pas (`banc.rejoindre` → `TimeoutError`) — vert rejoué seul sur la branche ET
  sur `origin/main` ; intermittence de partie à deux sous la charge, à rejouer
  jusqu'à la distribution (v269) si elle revient. Le seul rouge de la livraison
  (`carteMonde.js`, le Berliner Dom sur deux ponts) est corrigé, vert seul.
- [ ] **À PISE, LE DUOMO ET LE BAPTISTÈRE SONT DANS L'EMPRISE DE LA TOUR (v365),
  mesuré, déclaré.** Les trois repères sont à trois et quatre blocs l'un de
  l'autre (36 blocs par kilomètre), et le modèle de la tour penchée (catalogue)
  fait onze blocs de large au pied pour quinze mètres : ses couches 0 à 3
  couvrent x −7..3, z −5..5 autour de son repère, c'est-à-dire les colonnes −4..6
  du Duomo. Aucun bâtisseur ne tient dans la boîte du Duomo (`box: 6`) sans
  recouvrir la tour, et c'était déjà le cas du gabarit (`dome(4)`). La v365
  leur donne leur édifice (nef, transept, coupole ; anneau, loggia, tambour) et
  le recouvrement reste. Le remède est de PLAN : une tour de catalogue à sa
  vraie emprise (un bloc et demi), ou les trois repères écartés — c'est la
  boîte, donc le relief : décision de carte.
- [x] **WALT DISNEY HALL ET LE ROGERS CENTRE SONT DES COUPOLES (v365) — FAIT en
  v369, avec les trois autres coupoles de gabarit.** Un témoin de `plafond.js`
  exige désormais qu'aucun repère ne garde `dome`, quelle que soit sa hauteur
  (rouge sur la v365 : cinq). Disney Hall a ses voiles d'acier (21 blocs) ; le
  Rogers Centre est un stade rond à toit plat, `vrai` — étiré au ciel de Toronto
  il montait deux fois plus haut que large ; l'ancien hôtel de ville a sa tour
  de l'horloge sur son corps (40 blocs à `k` 1, 28 à `k` 0,3 : Toronto garde
  0,3, sinon il frôle une CN Tower de 553 m à 45 blocs) ; le Panthéon de Rome
  a sa rotonde, son oculus et son portique (dix blocs, sous le Colisée fixe à
  19 : étiré à ses 43 m il le dépassait) ; le dôme du Rocher son octogone ; le
  Bean son haricot ; Navy Pier sa jetée et sa grande roue.
- [ ] **LE PORTAIL DE LA v369 : `monte.js` CHANGE DE ROUGES À CHAQUE PASSAGE,
  DES DEUX CÔTÉS.** Portail : « elle ralentit assez pour qu'on puisse la
  rejoindre » (9,1 m/s, neuf), le réverbère au volant, la compilation à
  l'arrivée, le gel d'arrivée. Rejouée SEULE sur la branche : la poule, le trou
  en vol, la recharge à l'arrivée, compilation et gel — PAS le train. Rejouée
  SEULE sur `origin/main` (v365) : la caméra en virage, les passants de Rome,
  compilation et gel. Seuls les deux derniers sont stables (déclarés) ; le reste
  est une distribution de cadence qu'un passage de chaque côté ne fixe pas
  (v269). PREUVE STRUCTURELLE pour la livraison : elle ne change que les blocs
  de sept boîtes de monuments (Los Angeles, Toronto, Rome, Jérusalem, Chicago)
  et les tables de ces repères ; aucun de ces témoins ne se pose dans l'une de
  ces boîtes. `washington.js` « chaque îlot a sa porte » (déclaré) : vert seul
  des deux côtés. `maj.js`, `carte.js`, `manhattan.js` : les rouges déclarés
  de la v365, identiques.
- [ ] **LE PORTAIL DE LA v375 (les huit palais) : TOUS LES ROUGES DÉJÀ
  DÉCLARÉS, DOUBLE MESURE FAITE.** `maj.js` : le loader qui compte ses
  fichiers, le loader qui attend corps et programmes, « fond de carte vraiment
  là » — rejouée SEULE : les trois rouges sur la branche, les trois ET un
  quatrième (le flou pendant la préparation) sur `origin/main`. `manhattan.js` :
  le trou de façade (22 326 → 42 919, déclaré) et PeerJS « ID taken » (le
  courtier, déclaré v358). `monte.js` : les passants de Rome (29 %, tirage
  déclaré v319), la compilation à la téléportation, le gel d'arrivée, la piste
  d'essai (arrêt à 303,3 pour 300). PREUVE STRUCTURELLE pour ces deux suites :
  la livraison ne change que les bâtisseurs de huit palais hors de Rome, de
  Paris et de Manhattan, et la piste est en (30 000, 30 300).
  Second portail, après rebase sur la v371 : `carte.js` la flèche du GPS
  (gauche à 1,92 rad, déclaré v321) et le glisser bridé (481 ms pour 400,
  déclaré) ; `monte.js` « en virage, la caméra laisse la voiture glisser » —
  rejouée SEULE : verte sur la branche (β médian 24,7°) ET sur `origin/main`
  (30,3°), un rouge de portail. Et rejouée seule, la branche a rendu « la
  monoplace ralentit assez pour qu'on la rejoigne » rouge (9,1 m/s au plus
  lent, relevé sur 250 blocs) quand le portail, sur le MÊME commit, la rendait
  verte (6,8 sur 37 blocs) : NEUF, intermittent, la grandeur dépend de la
  portion du circuit que la fenêtre a parcourue — à mesurer sur un tour entier.
- [x] **FAIT en v378** : les anneaux écartent les cases que bâtit un monument
  (`traverseUnMonument`, villesmonde.js) ; 48 → 0 au témoin (carrosserie à
  ±1,1), Agra et Le Cap reçoivent leurs anneaux de quartier (66,4 → 91,1 % et
  71,1 → 95,8 %), la dette des ponts d'Agra (9 pas) tombe. 445 → 430 anneaux,
  6 % de rue en moins. Et les anneaux se calculent à l'approche de la ville :
  157 → 0 ms au démarrage, 0,6 ms par ville en médiane, Rome 43 ms la première
  fois (le Colisée du catalogue). Repris en v387 par `contreUnMonument` (même lecture du bâtisseur, couches 1 à 3), qui remplace `traverseUnMonument` : le témoin rend toujours zéro. Texte d'origine :
  **QUARANTE-CINQ MONUMENTS SONT BÂTIS EN TRAVERS D'UN ANNEAU DE VOITURES
  (v375, témoin de `plafond.js`, `DETTE_ANNEAUX`).** Les anneaux des villes
  engendrées se choisissent sur la trame sans regarder les repères ; un
  monument posé APRÈS pose ses blocs (couches d'auteur 1 à 3) sur des cases que
  la voiture traverse. Le pire : le Taj Mahal (294 cases), le Colisée (53),
  Rashtrapati Bhavan (40), le Templo Mayor (36), Tō-ji (33), le palais royal
  de Madrid (31). Deux remèdes, à mesurer : écarter des candidats d'anneau
  toute boîte de repère (`anneauxDeVille`, villesmonde.js — mais cela change
  les circuits, donc la couverture et le partage de la v270, à remesurer ville
  par ville), ou bâtir dans la partie libre de la boîte (ce que la v375 a fait
  pour les huit palais). Une dette qui ne mesure plus rien rougit.
- [x] **HUIT PALAIS SONT ENCORE LE GABARIT `palaisLong` — FAIT en v375** (compté par le
  témoin).** Palais du Dam, Rijksmuseum, château de Prague (sans Saint-Guy),
  Palais royal de Stockholm, Amalienborg, Gyeongbokgung (des toits coréens),
  Casa Rosada, palais Bahia : trois blocs d'épaisseur et une baie sur deux, que
  la table étire (la leçon du palais de Madrid, v365). Un bâtisseur chacun.
- [ ] **LE PORTAIL DE LA v357 (les tours) : TOUS LES ROUGES DÉJÀ DÉCLARÉS, UN
  NEUF INTERMITTENT.** Second portail, sur le code rebasé : `maj.js` le loader
  (intermittence déclarée, 1 sur 4 sur `origin/main`), `manhattan.js` « le trou
  enlève aussi la géométrie visible » (25 316 → 54 969, déclaré), `monte.js` le
  gel d'arrivée (rejoué SEUL sur `origin/main` cette session : rouge aussi,
  pire image 1 150 ms). Au premier portail, « 🛬 descend train sorti… freine
  jusqu'à l'arrêt » est sorti du bout de la piste d'essai (arrêt à x 303,4 pour
  300) : vert au second portail sur la branche, vert rejoué seul sur
  `origin/main` — la marge de l'atterrissage assisté (291 blocs sur 300, v273)
  dépend de la cadence. PREUVE STRUCTURELLE : la piste est posée en
  (30 000, 30 300), loin de tout repère touché, et ni `player.js` ni la physique
  ne changent. Et l'empreinte des 490 morceaux était ROUGE sur `origin/main`
  depuis la v355 (routes : 20 186 → 26 361 colonnes de talus, constante non
  relevée) ; réparé, avec la preuve du désarmement.
- [x] **LES GRATTE-CIEL ET LES BEFFROIS D'UN BLOC DE LARGE (v353) — FAIT en v357.**
  Les treize ont un bâtisseur d'après leur vraie silhouette (champ `tour`,
  villesmonde.js ; le monde d'avant garde la colonne), et leur ville a son ciel.
  Le témoin neuf des perches (`plafond.js`, toutes les villes) en a trouvé dix
  autres, faits aussi (Fernsehturm, CN Tower, Torre Latino, Stephansdom,
  Saint-Guy, Palazzo Vecchio, Frauenkirche, nouvel hôtel de ville de Munich,
  demi-tour Eiffel, Freedom Tower) et les quatre pagodes, qui n'avaient qu'un
  poteau sous chaque toit. Restent fûts à bon droit (`PERCHES_VRAIES`) : la
  colonne de Juillet, la colonne Nelson, celle de Colomb, l'Obélisque.
  Texte d'origine :
  Toute ville engendrée mesurée a désormais son ciel ou dit pourquoi
  (`VILLES_SANS_CIEL`). Restent hors de leur vraie hauteur, déclarés `vrai`, les
  fûts qui dominent DÉJÀ leurs toits (hauteur d'auteur au-delà d'une fois et
  demie la corniche) : l'hôtel de ville de Bruxelles (23 blocs pour 96 m), la
  Koutoubia (19 pour 77), le campanile de Venise (21 pour 99), la Willis Tower
  (43 pour 442) et le John Hancock (37), la tour de Tokyo (25 pour 333) et la
  Skytree (39 pour 634), la tour de Séoul (21), la perle de l'Orient (37) et
  Jin Mao (41), la Banque de Chine (31) et l'IFC (35). Étirés (premier jet),
  ce sont des perches d'un bloc, vues en capture à Bruxelles et à Chicago. Le
  remède est un BÂTISSEUR de tour avec une emprise (`tourBoule`, `minaret` sont
  des colonnes d'un bloc) — l'emprise d'un repère est sa `box`, qui ne bouge
  pas : une tour de trois blocs de côté tient dans `box: 4`.
- [ ] **LE TROU DU CHASSEUR EN VOL FRÔLE SA BARRE (portail v353), déclaré.**
  « en vol, on ne rattrape pas le bout du monde qui se charge » (`monte.js`) :
  chasseur 58 pour une barre à 60 (relevés 51 · 58 · 58 · 58 · 58 · 66), le
  Concorde 66 et l'avion de ligne 82 au-dessus. PREUVE STRUCTURELLE que la v353
  n'y est pour rien : le vol se fait autour de (30 000 à 38 000, 30 000), et le
  plus proche des seize monuments étirés (Sensō-ji, 53 431 · 7 940) est à plus
  de quinze mille blocs ; `nouveautes.js` n'est lu qu'à l'ouverture du journal.
  Même portail : les autres rouges sont les dettes déjà déclarées (`maj.js`
  « corps, programmes et fond de carte », `manhattan.js:282`, `monte.js`
  compilation à la téléportation, gel d'arrivée, piéton `voituresRue: 0`).
- [ ] **LE CIEL DE LAS VEGAS GARDE SA ROUE ET SA PYRAMIDE (v353), déclaré.** La
  High Roller (167 m, 16 blocs) est sous la demi-tour Eiffel (165 m, 26) : une
  roue ne s'étire pas, comme le Prater. Le Luxor (107 m) reste à quinze blocs :
  étirée, une pyramide devient un obélisque. **Remesuré en v365 : la boîte ne
  tient pas la roue vraie.** Pour passer au-dessus de la demi-tour Eiffel
  (vingt-six blocs) une roue dont la jante passe à quatre blocs du sol (celle du
  Prater, v357) veut un rayon de douze — vingt-cinq blocs de diamètre — et la
  boîte de la High Roller (`box: 9`) en tient dix-neuf : rayon neuf, sommet à
  vingt-deux.
  C'est la boîte qu'il faudrait agrandir, donc les zones du relief : décision
  de carte, pas de bâtisseur. Tivoli n'a pas d'inversion (sa roue, seize blocs,
  est sous la Rundetaarn, dix-sept).
- [ ] **UNE CABANE SUR UN ANCIEN TOIT DE MONUMENT SE RETROUVE DEDANS (v335),
  déclaré.** Le relevé des toits (v301) emporte ce qu'on a bâti sur un
  immeuble ; rien n'emporte ce qu'on a bâti sur un monument étiré. Le bloc
  reste à sa hauteur, donc DANS la maçonnerie étirée : il n'est pas perdu (le
  journal des blocs le garde, et le ménage du ciel le juge sur le monde d'avant,
  `CONF_AVANT`, qui garde les monuments d'avant), mais il ne se voit plus. Si
  cela se voit un jour, la marche est connue : celle de `releverToitsParis`,
  avec la table de paliers pour dire de combien monte chaque couche. Le même
  prix vaut pour les monuments étirés par la v342 et la v350 (Buckingham,
  l'Opéra de Lille, les Archives nationales).
- [ ] **DES CUBES DÉPASSENT ENCORE DES MODÈLES ÉTIRÉS (v335), mesuré. Au-dessus
  d'un enfant : FAIT en v350** (Opéra 15 → 0, Panthéon 6 → 0, Notre-Dame 8 → 0,
  témoin dans `plafond.js`). Restent les vingt-quatre cubes du parvis de
  Notre-Dame, au sol, d'avant la v335. Sonde
  `sonde-monuments-hd.cjs`, cubes qui dépassent (avant → après) : Arc 0 → 28,
  Panthéon 4 → 10, Opéra 9 → 17, Sacré-Cœur 15 → 23, Notre-Dame 34 → 76 (dont
  24 à hauteur d'enfant, inchangés). Un bloc d'écart entre le modèle et son
  voxel tenait dans la tolérance de la sonde ; étiré trois à huit fois, il en
  sort. Les plus gros écarts ont été recalés (l'attique de l'Arc, l'entablement
  de l'Opéra, la nef et la flèche de Notre-Dame, le tambour du Panthéon, les
  coupoles d'angle du Sacré-Cœur, qui étaient du mauvais côté). Zéro mur
  invisible. L'autre lecture de la couverture (aux cotes d'auteur, puis étirée)
  rendait zéro cube et 119 à 293 murs invisibles : NON-RÉSULTAT, on garde la
  règle de la v292. **À l'échelle du ciel, les étirements sont plus doux et les
  comptes retombent** : Arc 0, Panthéon 6, Opéra 15, Sacré-Cœur 0, Notre-Dame
  32 (contre 34 avant). Les chiffres ci-dessus sont ceux du premier jet.
- [ ] **CE QUE LE RELEVÉ DES TOITS NE SUIT PAS (v301), déclaré.** (1) Une
  tablette restée sur l'ancienne version après `DATE_RELEVE_PARIS` pose sur
  les anciens toits des blocs que le relevé laissera où ils sont — la même
  limite que la carte 3 et le ménage. (2) Une construction à cheval sur un
  toit ET la rue (une passerelle) monte du côté du toit et reste du côté de la
  rue : le relevé juge par colonne. (3) Un bloc collé à une façade SOUS
  l'ancien toit reste à sa hauteur, donc change de registre (un balcon posé
  au niveau de l'ancien étage noble se retrouve devant l'entresol). Aucun des
  trois n'a de témoin ; s'ils se voient un jour, c'est le journal des blocs
  (`~avant-releve-paris`) qui permet de rendre.

- [ ] **UN BUS ET TROIS VOITURES SE BLOQUENT TRENTE SECONDES À L'OUEST DE PARIS**
  (v300, mesuré des deux côtés). Au point du témoin de la fumée (−277, 199 :
  circuit 0 de Paris, 40 % entre ses points 2 et 3), le bus du premier anneau
  reste à 4,5 blocs avec `attend` levé pendant trente-deux secondes, trois
  voitures du circuit font la queue derrière lui (`attend` 2 à 5), et la
  première ne passe qu'à 36-44 s — sur la branche COMME sur `origin/main`,
  relevé toutes les quatre secondes (`sonde-volant-fumee.cjs`, scratch de la
  session). C'est « pas si l'on est déjà dedans » entre un bus et des voitures :
  la paire mutuelle de `cederLePassage` (v244, « la plus engagée passe »)
  ne tranche pas quand l'un des deux est un bus à l'arrêt. À mesurer AVANT
  d'écrire : la durée d'un arrêt de bus, et qui attend qui, image par image.
  Le témoin de la fumée attend désormais deux minutes, la durée dans le message.

- [ ] **LE BUDGET DE FAÇADES (v299) EST POSÉ, PAS MESURÉ SUR L'APPAREIL.**
  128 Mo par palier : au-dessus des 98 Mo que le vieil iPad a tenus au centre
  de Paris (v296), sous les 500 et plus qui ont tué l'iPhone (journal id 7).
  La fiche du journal porte désormais le réglage : la première session de Max
  à Paris en v299 dira ce que `journal_appareil` voit (façades HD, tas, fin).
  Si ça meurt encore, `?facadesmo=64` puis `?palier=bas` sont les échelons ;
  si ça tient large, le budget peut monter, avec le chiffre en commentaire.
- [ ] **UNE BAIE DE FAÇADE COÛTE 56 À 69 SOMMETS PAR FACE — c'est le remède de
  fond.** Mesuré sur les morceaux de l'ouest de Paris : 146 000 à 156 000
  sommets de façades (`pierre-lisse` 68 000, `menuiserie` 61 000) pour 2 600 à
  3 200 sommets de faces plates. Le budget borne ce qu'on tient ; ce qui
  élargirait la portée à budget égal, c'est une baie moins bavarde (huisserie
  en deux quads au lieu de moulures par sommet, volets sans épaisseur au-delà
  de trois morceaux). À mesurer d'abord par tuile, avec
  `sonde-facades-lourdes.mjs` (scratch de la session, à recopier dans
  `tests/`).
- [ ] **LES TEXTURES MONTENT DE 16 À 266 EN VINGT SECONDES DE VOL** (sonde
  mémoire, tous les bras, hd 0 compris : 6 → 293). Ce sont les modèles de la
  flotte qui se chargent à l'approche d'une ville (`Body_PrimaryPaint` dans
  les gros maillages) — pas le sujet du jour, mais un poste de mémoire GPU à
  mesurer sur la tablette avec `?diag=1`, et à borner s'il compte.
- [ ] **LE COMPTEUR DE PLANTAGES RETOMBE À ZÉRO SUR UNE FERMETURE PROPRE — y
  compris celle du rechargement de mise à jour.** Un appareil qui meurt, se
  met à jour (fermeture propre), puis meurt encore repart à un. C'est voulu
  pour une session qui a tenu ; pour un rechargement de quelques secondes,
  c'est discutable. À trancher quand un journal le montrera.

- [ ] **PROGRAMME « MONDE FIDÈLE » (kit de Max, septembre 2026) — livraison 2
  sur 6 faite.** Le cahier : terrain continu partagé par le rendu, les
  collisions et la navigation ; réseau routier entre les villes ; fidélité des
  villes ; corrections proactives ; performances sur les vieux appareils.
  Décisions, hypothèses, état initial et ordre des livraisons dans
  `docs/monde-fidele/programme.md` ; captures avant/après aux mêmes points de
  vue par `tests/sonde-etat-initial.cjs` (tag `avant`, `v297`, …).
  - [x] 1. État initial mesuré (`etat-initial.md`).
  - [x] 2. Le sol continu (v297, `src/solcontinu.js`).
  - [ ] 3. **Le couloir Paris–Lille** : registre des routes (`routes.js`), profil
    vertical à pente bornée (module `fitProfile` du kit, à adapter), section
    (`roadSection`), ouvrages là où le profil quitte le terrain (remblai,
    déblai, pont, tunnel), circulation interurbaine, entrées de ville, carte.
    Le sol continu LIT ce registre : sous un corridor, la surface est celle du
    profil, raccordée au terrain par un talus.
  - [ ] 4. Le rail continu et la gare accessible : `traceSegment` rend une cote
    ARRONDIE au bloc (767 cotes entières sur 768 points, 272 sauts d'un bloc
    sur Londres–Paris) ; le profil lissé reste, la cote du convoi et des gares
    devient continue ; la gare de Paris n'a ni parvis ni rue qui y mène.
  - [ ] 5. Les autres couloirs et villes, par lots.
  - [ ] 6. La fidélité architecturale : registre unifié des quartiers — ET
    la bibliothèque du kit v3 (330 GLB originaux, 46 Mo, en mètres), évaluée
    dans `programme.md` § 6. **Décision à prendre par Max avant une ligne** :
    la bibliothèque n'entre dans une ville qu'à UN BLOC POUR UN MÈTRE (joueur
    1,8, voiture 4,4 × 2,26 — le kit refuse toute autre échelle), et aucune
    parcelle actuelle ne la reçoit sans étirer (un haussmannien fait 18 × 12 ×
    22,5 blocs ; un îlot de l'Étoile 12,6, un immeuble 6). Deux voies : un
    quartier témoin de Paris RETRAMÉ à 1 m/bloc dans une zone bornée (neuvième
    casse déclarée de l'invariant 1, double empreinte, copie et migration des
    blocs), puis Lille avec les familles bruxelloises ; ou Paris garde sa trame
    et la fidélité passe par la couche HD. Quoi qu'il arrive : une famille se
    charge à l'entrée du quartier, dans le cache immuable, jamais les 330 au
    démarrage ; variante par identifiant stable de parcelle ; provenance dans
    `vendor/` (les modèles sont des conceptions originales, sans géométrie
    tierce).
  - **Ce que la v297 laisse voxel, et qui se reprendra** : le liseré d'un bloc
    au bord de toute zone voxel (une voiture y monte d'un bloc, mesuré au bord
    d'un lac : bloquée 25 images, montée de 1,0, une chute) — la piste est un
    raccord par une cellule à pente forte MAIS non praticable, à séparer du
    rendu ; l'eau, qui garde ses cubes (la surface passe sous le lac) ; les
    passants de Manhattan (`piedPieton`) et les convois des villes
    (`coteRoulable`), qui ne lisent pas la surface parce qu'ils sont en ville
    ; les arbres. Et la surface n'a ni herbe haute ni variation de tuile : la
    tuile est celle du bloc de sommet, répétée par cellule.
  - **Ce qui n'est PAS mesuré** : le coût de la surface sur une tablette (le
    +1,2 ms par morceau est celui du banc) — `?diag=1` et le journal de bord
    le diront ; et le rendu de la surface sur un vrai GPU (au banc, SwiftShader).

- [ ] **LES NEUF ROUGES DU PORTAIL DE LA v296 — DEUX DE MOI, CORRIGÉS ; SEPT
  DETTES DÉJÀ MESURÉES.** Seize suites, 77 min, 742 verts.

  **Les deux miens :**
  - `maj.js`, « il couvre toutes les versions du journal, en quelques mots par
    puce » : le titre v296 faisait huit mots (barre six), deux puces dix (barre
    huit). Réécrits ; vérifié sous node avec la règle même du témoin : 6 mots,
    puces 7 · 7 · 7 · 8.
  - `realisme.js`, morte au clic sur « Jouer » (`locator.click: Timeout 30000ms`,
    bouton visible et stable) : c'est la page de MANHATTAN, et mon compte des
    blocs suspendus balayait tout le journal des blocs — des dizaines de
    milliers de blocs importés — DANS le geste du clic. Il se fait désormais
    quatre secondes après, par tranches de trente millisecondes, et se déclare
    partiel s'il n'a pas fini. Rejouée seule après correction (voir le journal
    de la livraison). C'est « on n'exécute rien de lourd dans le geste de
    l'enfant » — la leçon de la v258 (la minicarte dans le clic) par un autre
    bout.

  **Les sept dettes**, toutes avec leur double mesure plus bas : le fond de
  carte de `maj.js` (onzième portail d'affilée, `carte: false`, 51,8 s) ; le
  délai de `manhattan.js:282` ; les deux de `monte.js` (chevauchements 41,1 %,
  gel à l'arrivée 35,5 %) ; les deux de `reseau.js` (« un départ propre nettoie
  tout le monde », « un joueur endormi n'est pas éjecté », identiques des deux
  côtés) ; et les deux de `reglages.js` (« l'autre tablette ne le défait pas »,
  « elle s'aligne même dessus », serveur « fr » — la fragilité de charge que ce
  témoin documente lui-même, verte des deux côtés rejouée seule en v281 et
  v292). **Double mesure de cette livraison** : rejouée SEULE, la suite est
  VERTE sur la branche et ROUGE sur `origin/main` aux mêmes deux verdicts
  (serveur « fr ») — le défaut est en production et la branche ne l'aggrave
  pas. Et `realisme.js` rejouée seule après la correction du compte : verte.

- [ ] **LE VIEIL IPAD, APRÈS LA v296 — CE QUI RESTE À VOIR SUR L'APPAREIL.** La
  cause mesurée au banc (1 171 Mo de tampons à rr 12 · hd 3) et la boucle du
  palier jamais classé expliquent un plantage à vingt secondes dans Paris, mais
  **aucune des deux n'a été mesurée sur l'iPad lui-même**. Le journal de bord
  est là pour ça : au prochain plantage, l'espace parent montrera la fiche
  (`ua`, écran, cœurs), le dernier relevé (ville, cadence, morceaux, façades
  HD, tas) et la fin de session. Trois choses à lire dedans, dans l'ordre :
  la ligne `plantage` existe-t-elle (sinon Safari ne relance pas la page et
  le drapeau n'est relu qu'au lancement suivant — c'est prévu) ; `hd` du
  dernier relevé (combien de morceaux portaient des façades — au plus 49
  désormais) ; et si la sûreté a pris (`surete: true` dans l'événement
  `plantage-precedent`, puis `PALIER bas (sûreté)` dans `?diag=1`). Si l'iPad
  plante ENCORE en palier bas, la mémoire n'est pas dans la couche HD et la
  piste suivante est les neuf corps réalisables (8,2 Mo compressés, bien plus
  décodés) et les textures : à mesurer avec `sonde-memoire-paris.cjs` élargie
  aux textures.
- [ ] **`sol` ET `plat` RESTENT FABRIQUÉS POUR TOUT LE DISQUE** (v296). Le sol
  HD (marquages, bordures, trottoir relevé) et les faces plates pèsent 0,02 à
  0,06 Mo par morceau, soit 10 à 30 Mo pour la ville entière : gardés partout
  pour que le loin ne change pas d'un pixel. Si un appareil le paie encore, la
  piste est de ne fabriquer `sol` qu'à `RAYON_HD × 2` et de laisser le voxel
  de rue au-delà — au prix d'une couture visible sur la chaussée.
- [ ] **UN JOURNAL S'ENVOIE À CHAQUE FERMETURE — il faudra le tailler.** Une
  ligne par session, jusqu'à 24 Ko : à quatre sessions par jour et par
  tablette, c'est un mégaoctet par semaine dans `journal_appareil`. Rien ne
  l'efface aujourd'hui ; l'espace parent n'en lit que trente. À faire quand la
  table dépassera quelques milliers de lignes : une purge des lignes de plus de
  trente jours qui ne sont pas des plantages (SQL, ou au lancement par une
  tablette).

- [x] **LA STRUCTURE DE RONDINS DANS LE CIEL DE PARIS — TRANCHÉE EN v298 PAR LE
  JOURNAL DE BORD.** La session de l'iPhone de Max du 26 septembre (15:45 UTC,
  celle des captures) compte 505 blocs POSÉS suspendus dans Paris (318
  planches, 101 verre, 73 grès, 7 feuilles, 3 planches sombres, exemple en
  (−90, 46, 92)), dans un journal de 83 780 blocs sous le profil « Max ». Ce
  sont des blocs du journal, posés en vol — pas un artefact de maillage. Max a
  tranché (« clean les trucs bizarres ») : le ménage de la v298 retire ce qui
  flotte, sur la tablette et à chaque fusion, copie d'avant sur le nuage.
- [ ] **CE QUE LE MÉNAGE DU CIEL DE PARIS NE TOUCHE PAS (v298).** Un bloc posé
  APRÈS `DATE_MENAGE_PARIS` (26 septembre 2026, 19 h UTC) reste, même en
  l'air : une tablette qui jouerait encore sur la v297 après cette heure
  pose des blocs que le ménage laissera. Et un groupe suspendu qui touche un
  bloc posé au sol, ou le fer de la tour, ou un toit du jeu, reste aussi — par
  construction. Si Max voit encore quelque chose en l'air après la v298, on
  relit d'abord le journal de bord (`blocs-suspendus`), qui dira combien et où.
- [ ] **LE COULOIR PARIS–LILLE (v300) : CE QUI RESTE DÉCLARÉ.** (1) Une seule
  route, l'A1 ; les autres couloirs sont la livraison 5, avec la matrice de
  couverture. (2) Dans les vingt derniers blocs du disque de chaque ville, la
  route écrase la trame de la ville (asphalte sur la chaussée promise par
  `solParis` / `solLille`) : le raccord est propre au sol mais les façades
  des îlots traversés ne sont pas remaniées — à regarder en capture, et c'est
  la même famille que la caserne de Paris (v293). (3) Les voitures de l'A1
  s'arrêtent à la porte et repartent : pas de continuité avec les circuits de
  la ville (« de la rue de Rivoli à la Grand-Place ») — la couture des convois
  est la livraison 4 avec le rail. (4) Le tablier des ponts n'a pas de
  parapet solide : une voiture qui sort de la voie tombe (mesuré : elle reste
  sur le tablier à vitesse de croisière, témoin `plafond.js`). (5) Les
  passants et les bêtes ne traversent pas l'autoroute : rien ne les en
  empêche non plus. (6) Au franchissement du premier pont, le témoin
  de `plafond.js` compte 3 « marches » (dénivelée > avance) aux culées, pour
  un écart max d'un bloc au profil — il passe (0 image bloquée, 0 chute),
  mais une voiture y tressaute : à mesurer image par image et à lisser
  (la berge creusée d'un bloc sous le tablier, ou le raccord chaussée /
  ruban). (7) Deux coudes de 15° et 29° sur l'axe : `projeter` joint deux
  droites, l'extérieur du virage est un angle vif ; un arc de raccordement
  est la suite naturelle, à mesurer en capture d'abord.
- [ ] **L'IPHONE DE MAX (iOS 18.7) MEURT ENCORE À PARIS EN v296 — mesuré dans
  le journal de bord, pas supposé.** Deux sessions de suite finies en
  `plantage` le 26 septembre (15:44:17 UTC après un relevé, 15:45:13 après
  onze) : téléporté en (−179, 90), 630 morceaux chargés, 79 morceaux HD, pire
  image 686 ms à l'arrivée puis 19 à 55 ms — le jeu tournait bien quand Safari
  l'a tué. La v296 avait ramené Paris de 1 171 à 98 Mo de tampons au banc ;
  ce n'est donc pas (plus) le gigaoctet. La sûreté a fait son travail (palier
  bas au lancement suivant). À mesurer sur SON appareil, `?diag=1` : le tas et
  les tampons au moment où le disque de Paris est plein — le relevé du journal
  n'a pas de `tas` sur iOS (`performance.memory` absent).
- [ ] **LE BLOC VISÉ SE NOMME, ET DIT QUI L'A POSÉ.** Le nom sous le réticule
  est celui du bloc EN MAIN. En `?diag=1`, afficher le bloc sous le réticule
  et son origine — « posé par le jeu », ou « posé à la main » avec la date que
  `world.editTimes` connaît. C'est ce qui aurait répondu à « qui l'a posé ? »
  depuis la tablette de Max, sans lire aucun profil.
- [ ] **LA COULEUR DE LA TOUR EIFFEL EN VOXEL.** Brique sombre (rouge) pour un
  fer brun ; c'est ce qu'on voit de loin, en vol, et sur tout appareil sans
  couche HD. Changer le bloc ne touche à aucune empreinte (un bâtisseur de
  monument n'écrit pas le relief, v292). Décision de Max.
- [ ] **LES TROIS ROUGES DU PORTAIL DE LA v295 — LES TROIS DETTES DÉJÀ MESURÉES,
  AUCUN NEUF.** Dix suites (`world.js` touché), 44 min, un seul rouge par
  suite fautive et chacun à sa place : le fond de carte de `maj.js` à la
  libération (`carte: false`, 48,7 s — neuvième portail d'affilée, double
  mesure plus bas), le délai de `manhattan.js:282` (`waitForFunction` 60 s,
  démonté 3/3 des deux côtés en v269), et le gel de `monte.js` à l'arrivée
  sur une ville (34,6 % d'images au-delà de 300 ms, contre 34,4 % au portail
  de la v294 et pire sur `origin/main`). Le témoin neuf de la tour Eiffel est
  vert (zéro cellule hors du modèle), et les deux empreintes de `plafond.js`
  n'ont pas bougé. Aucune de ces trois suites ne lit une cellule de la tour.

- [ ] **LES SIX ROUGES DU PORTAIL DE LA v294 — TROIS ÉTAIENT DE MOI, UN SE
  REJOUE VERT SEUL DES DEUX CÔTÉS, DEUX SONT DES DETTES DÉJÀ MESURÉES.**

  **Les trois miens, corrigés dans la livraison, tous les trois des TÉMOINS qui
  portaient une dimension de ville :**
  - `carteMonde.js`, le tablier des ponts : le témoin comptait le REBORD du
    disque comme deux ponts mouillés (« 11 ponts, 51 au sec sur 60 ») — hors
    du disque `solParis` rend `null`, qui n'est pas de l'eau. Corrigé ; rejoué
    seul : 9 ponts, 51 colonnes, 51 au sec, 51 roulables à 34.
  - `parishd.js`, le registre du Marais : le premier morceau à plus de deux
    mille sommets de façade n'était qu'un coin d'îlot (« enduit 100 · volets
    0 »), et le morceau qui en porte le plus avait un coin dans Haussmann
    (« pierre 1200 »). Le témoin exige désormais un morceau dont le centre et
    les quatre coins sont du Marais, et garde celui qui porte le plus de
    façades : (−13, 12), 25 322 sommets, enduit 1 924 · volets 3 680 · pierre 0
    (mesuré sous node).
  - `carte.js`, « Paris est bâtie de pierre de taille et de zinc » : `bati >
    700` était un compte absolu relevé quand une rue faisait deux blocs ; les
    rues élargies en laissent 669 dans le même disque. Le témoin demande
    désormais au plan combien de lots il promet et exige que quatre sur cinq
    soient bâtis : 669 bâties pour 603 lots.

  **Celui qui se rejoue vert seul, des deux côtés :** « et l'on ne marche pas
  dans une rue vide » (`monte.js`), rouge au portail avec `[25, 22, 9, 6, 0, 1,
  1, 0]` — vingt-cinq passants dans le cadre au premier arrêt, ce qu'aucune rue
  ne rend sur une page neuve, puis plus personne : la troupe de quatre-vingt-
  huit (v241) avait été consommée par les témoins d'avant et laissée derrière.
  Rejoué SEUL sur une page neuve, avec la taille de la troupe dans le message
  (`tests/sonde-rue-vide.cjs`) : branche `[6, 4, 6, 7, 5, 6, 5, 4]`,
  `origin/main` `[6, 9, 8, 5, 4, 6, 5, 4]`, zéro arrêt vide des deux côtés, la
  troupe passant de 8 à 42 ; et `monte.js` entière rejouée seule sur la
  branche : `[4, 5, 13, 7, 4, 4, 5, 10]`, vert. C'est « la situation de départ
  d'un témoin est ce que le témoin d'avant a laissé » (v279), et le remède
  n'est pas un seuil : ce témoin doit vider la troupe avant de mesurer, comme
  les témoins de monte vident les bêtes.

  **Les deux dettes déjà déclarées**, avec leur double mesure plus bas : le fond
  de carte de `maj.js` (rouge sur HUIT portails d'affilée), le délai de
  `manhattan.js:282` (💥, ligne 282, 2/2 des deux côtés) ; et le gel de
  `monte.js` à l'arrivée dans une ville (**34,4 %** au portail, **31,9 %**
  seule — dans l'étendue 31,1–44,7 relevée jusqu'ici, « mesuré PIRE sur
  `origin/main` »).

- [ ] **LES CINQ ROUGES DU PORTAIL DE LA v293 — UN ÉTAIT DE MOI, UN SE REJOUE
  VERT SEUL, TROIS SONT DES DETTES DÉJÀ MESURÉES.**

  **Le mien, corrigé dans la livraison :** `metro.js` écrivait l'adresse de
  l'anneau du village EN BLOCS (`{ x: -240, z: 200 }`) et son rayon recopié. Le
  village ayant déménagé, le témoin a continué de sonder l'ancien endroit et a
  rendu « 14 points dégagés sur 180 » et « 0 point praticable sur 12 » sur un
  tunnel parfaitement creusé, ailleurs. Il demande désormais l'adresse à
  `world.js` et le rayon à `ville.js` ; rejoué : **180 points sur 180, 12 quais
  sur 12**, toute la suite verte.

  **Celui qui se rejoue vert seul :** `reseau.js` (« un départ propre nettoie
  tout le monde », « un joueur endormi n'est pas éjecté ») — la suite entière est
  verte rejouée seule sur la branche, ce qui est le fait le plus fort (v218,
  v219).

  **Les trois dettes déjà déclarées**, avec leur double mesure plus bas : le fond
  de carte de `maj.js` (rouge sur SEPT portails d'affilée maintenant), le délai
  de `manhattan.js:282` (💥, 2/2 des deux côtés) et les deux tirages de
  `monte.js` — les voitures qui se traversent (122 · **50,6 %**, le tirage de la
  v277 qui va de 0 à 53) et le gel à l'arrivée (**31,1 %**, en dessous de toute
  l'étendue 34,3–44,7 % relevée jusqu'ici, et rouge quand même : la barre de ce
  témoin est sous son propre plancher mesuré).

- [x] **LA LARGEUR DES RUES DE PARIS** — remboursée en v294 (voir `CHANGELOG.md`) :
  rue de quartier 2,0 → 3,6 blocs (ruelles 3,0, boulevards 5,2), aucune avenue
  sous 5,2, quais 2,1 → 4,1, ponts 5 → 7 avec une chaussée, et le tablier des
  neuf ponts au-dessus de la Seine. Ce qui reste, et se déclare : les points de
  circuit HORS chaussée (33 sur 772, sur le plan) sont des ARCS de raccord qui
  coupent le coin d'une place ou d'un trottoir d'avenue entre deux voies —
  `chainerVoies` joint deux avenues par une corde, et un trottoir de deux
  blocs en prend un peu plus qu'un de 1,4. Le circuit de la Porte Maillot n'a
  que vingt-quatre points, dont quatre hors chaussée (83 % pour une barre à
  80 %) : c'est un tracé à reprendre par un arc au carrefour, pas un seuil à
  baisser.

- [ ] **ET LE MOBILIER DE RUE EST AU BORD DE LA CHAUSSÉE.** Les 88 refus « hors
  circulation » ci-dessus ne sont pas séparés plus finement : il faudrait
  distinguer le mobilier, le piéton et l'eau (le crochet de `main.js` les juge
  chez elles, mais ne dit pas laquelle a parlé). La sonde sait déjà envelopper
  `player.obstacleVehicule` ; il reste à redemander les trois familles une par
  une, comme elle le fait déjà pour la circulation.

- [ ] **LES SIX ROUGES DU PORTAIL DE LA v292 — DEUX ÉTAIENT DE MOI, DEUX SE
  REJOUENT VERTS SEULS, DEUX SONT DES DETTES DÉJÀ MESURÉES.** Le `grep` dans ce
  fichier a de nouveau fait le tri en dix secondes.

  **Les deux miens, corrigés dans la livraison :**
  - **Le témoin du registre du Marais choisissait un morceau de NOTRE-DAME.**
    `parishd.js` cherche « un morceau du Marais qui porte des façades » ; le
    modèle en relief de Notre-Dame ajoute plus de deux mille sommets de PIERRE
    aux trois morceaux de l'île, et le témoin a retenu (−13, 13) au lieu de
    (−13, 12). Il a rendu « enduit 0 · volets 0 » sur un registre parfaitement
    en place — mesuré sur `origin/main`, le MÊME témoin rend 4 516 · 8 320. Il
    écarte désormais tout morceau qui porte un monument. **Un témoin qui CHERCHE
    son terrain doit écarter ce qui n'est pas son sujet.**
  - **Le badge de version contre la tête du journal.** L'entrée v292 était
    écrite et `CACHE_VERSION` valait encore v291 : le témoin de `maj.js` compare
    les deux, et il a raison. Corrigé par le bump, rejoué : vert.

  **Les deux qui se rejouent VERTS SEULS** — le fait le plus fort (v218, v219) :
  `sauvegarde.js` (« Execution context was destroyed », la relance de page de la
  v196) et `reglages.js` (la seconde tablette, ❌ à 20 s et 45 s). Les deux
  suites sont vertes de bout en bout rejouées seules sur la branche.

  **Les deux dettes déjà déclarées**, avec leur double mesure dans le tableau
  ci-dessous : `manhattan.js:282` (💥 Timeout, 2/2 des deux côtés) et les deux de
  `monte.js` — les voitures qui se traversent (86 · **46,5 %**, le TIRAGE de la
  v277 qui va de 0 à 53) et le gel à l'arrivée dans une ville (3 850 ms ·
  **42,5 %**, dans l'étendue 34,3–44,7 % relevée des deux côtés). Plus le fond de
  carte de `maj.js`, rouge sur SIX portails d'affilée désormais.

  **SECOND PORTAIL, `--depuis-zero`, après les deux corrections : QUATORZE
  SUITES VERTES SUR SEIZE.** `parishd.js`, `maj.js`, `sauvegarde.js` et
  `reglages.js` sont passées au vert — les quatre que la première exécution
  accusait. Il ne reste que les deux dettes : `manhattan.js` (💥 le même délai de
  60 s) et `monte.js` (le gel à l'arrivée, **39,1 %** et une pire image de
  **2 300 ms**, contre 4 933 ms relevés sur `origin/main`). Et « les voitures ne
  se traversent plus » est VERTE cette fois, sur le même code qu'au portail
  précédent où elle rendait 46,5 % : le tirage de la v277, une fois de plus.

  **Et ce qui n'est PAS couvert, dit au lieu d'être glissé sous le tapis** : la
  v292 ajoute **+12,6 ms par morceau de monument** (1,35×, mesuré en ordre
  alterné), et le gel de `monte.js` se mesure en ARRIVANT dans Paris. Huit
  morceaux sur plusieurs centaines ne devraient pas peser — et 42,5 % tombe dans
  l'étendue déjà relevée sans qu'une ligne du jeu ait bougé — mais **ce lien-là
  n'est pas mesuré**. Ce qu'il faudrait : le même témoin, avec les huit
  monuments désarmés (`world.monumentsTouches` rempli), sur la même page, en
  ordre alterné.

- [x] **`RAYON_HD` DÉCIDE DE CE QU'ON MONTRE, `world.hd` DE CE QU'ON FABRIQUE — et
  les monuments en héritent.** (Payée en v296 : le détail se demande par
  morceau à portée de `RAYON_HD` + 1, monuments compris, et se rend au-delà.) Un appareil au palier haut fabrique le relief de
  cinq cents morceaux et en montre cent soixante-neuf (dette de la v291). Les
  huit monuments suivent la même règle : leur modèle est maillé dès que le
  morceau est couvert par la couche, qu'on le voie ou non.

- [ ] **LES CUBES QUI DÉPASSENT, MONUMENT PAR MONUMENT** (v292, mesurés par
  `tests/sonde-monuments-hd.cjs`). Ce sont les cellules de voxel exposées que le
  modèle ne couvre pas : elles restent en cubes, ce qui est le prix DÉCLARÉ du
  choix « on ne masque que ce que le modèle dessine ». Zéro aux Invalides, au
  Louvre et à l'Arc ; 4 au Panthéon, 9 à l'Opéra, 15 au Sacré-Cœur, **16 à la
  tour Eiffel** (huit à hauteur d'enfant : des diagonales isolées du treillis) et
  **34 à Notre-Dame** (vingt-quatre à hauteur d'enfant, tous au BORD du parvis —
  la sonde les compte parce qu'elle ignore le terrain autour). Aucun n'est un mur
  invisible : ils arrêtent ce qu'ils ont l'air d'arrêter.

- [ ] **LES CINQ ROUGES DU PORTAIL DE LA v291 — DEUX ÉTAIENT DE MOI, TROIS SONT
  DES DETTES DÉJÀ MESURÉES.** Et c'est un `grep` de dix secondes dans ce fichier
  qui a fait le tri, exactement comme la règle de la v291 le demande (« avant
  d'expliquer un rouge, on lit ce que le dépôt a déjà mesuré »).

  **Les deux miens, corrigés dans la livraison :**
  - Le titre du journal du jeu faisait **sept mots pour une barre à six**
    (`titresLongs: ["v291"]`). J'ai relu la barre du témoin avant d'expliquer son
    rouge — `n.titre.trim().split(/\s+/).length > 6` — ce qui est la règle même
    que cette livraison écrit. « Le jeu ne s'arrête plus », cinq mots.
  - **J'AI REPOINTÉ UN TÉMOIN ET PAS SON JUMEAU.** « au lancement suivant, le jeu
    joue vraiment à l'étendue choisie » (`maj.js:1037`) portait `file === 16 &&
    jet === 160`, les chiffres que la livraison retire ; j'avais corrigé son
    voisin de la ligne 770 et pas lui. Le portail a donc rendu rouge une
    correction juste. C'est « quand une panne touche une grammaire partagée, on
    cherche TOUTES ses occurrences le jour même », appliqué à MES PROPRES barres
    de témoin, et le geste qui l'évite prend dix secondes :
    `grep -n "=== 16\|=== 160" tests/*.js`. Passé après correction : plus une
    seule occurrence.

  **Les trois autres, et pourquoi la livraison ne peut pas les avoir causés.** La
  preuve est STRUCTURELLE, et elle est plus forte qu'un rejeu : tout ce que cette
  livraison change (`PALIERS.haut`, `VITESSE_JET.haut`, `BARRE_MS_MORCEAU_HAUT`,
  `palierRetenu`) n'est lu QUE si `PALIER` n'est pas nul. Or `PALIER` vaut `null`
  sur toute page du banc sauf une — `?palier=` n'apparaît que dans
  `tests/maj.js:743` (`grep -n "palier=" tests/*.js`), et le banc ne range jamais
  de verdict puisqu'il force toujours `rr` (v284). `monte.js` et `manhattan.js`
  jouent donc le code d'`origin/main` au bit près sur ces chemins.

  | rouge | ce portail | ce que le dépôt avait déjà mesuré |
  | --- | --- | --- |
  | `maj.js` — fond de carte à la libération | `carte: false`, 50,8 s | dette de la v276, **rouge sur CINQ portails d'affilée**, même forme ; 45,3 s et 51,9 s relevés |
  | `manhattan.js:282` — délai de 60 s | 💥 Timeout | **rejoué SEUL sur `origin/main` (46ad2d6), DEUX passages : 14 témoins verts puis le MÊME délai ligne 282, 2/2** — et 2/2 sur la branche (portails 1 et 2). v269 : déjà démonté 3/3 des deux côtés |
  | `monte.js` — les voitures ne se traversent plus | 83 · taux **40,3 %** | le TIRAGE écrit dans `CLAUDE.md` (v277, il va de 0 à 53 sans qu'une ligne du jeu bouge) ; relevés 78 · **40,2 %** sur une branche, 89 ailleurs, 50 · 23,1 % sur `origin/main`, 95 · 42,4 % |
  | `monte.js` — l'écran ne se fige pas en arrivant sur une ville | 4 233 ms · **43,4 %** (portail 1) · 4 350 ms · 44,7 % (portail 2) | `origin/main` seul 3 517 ms · 41,4 % ; ailleurs 4 933 ms · 36,4 % sur `origin/main` contre 4 433 · 37,3 % ; branches 2 950 · 36,9 % et 2 100 · 35,9 % |

  **Et une chose qui n'est PAS couverte par ces mesures, dite au lieu d'être
  glissée sous le tapis** : mes 43,4 % de temps au-delà de trois cents
  millisecondes sont **deux points au-dessus du pire relevé enregistré** (41,4 %
  sur `origin/main`). La pire image, elle, est meilleure que le pire d'`origin/main`
  (4 233 contre 4 933). Comme la grandeur varie de 35,9 à 43,4 % sur un code de
  jeu inchangé, c'est un TIRAGE et non un gardien — même diagnostic que « les
  voitures ne se traversent plus » (v277) — mais **ce n'est pas mesuré ici**, et
  le dire est la seule façon de ne pas transformer une dette en fait (règle de la
  v291). Ce qui trancherait : la distribution sur cinq à dix passages d'un seul
  côté, avant de toucher à sa barre.

- [ ] **LA PANNE DE PRODUCTION DE LA v290 : LA CAUSE DU PLANTAGE N'EST PAS
  ÉTABLIE, et il faut le dire.** Max, capture d'iPhone : « A problem repeatedly
  occurred », « Game break after 3sec ». La v291 retire ce qu'il fallait retirer
  — le palier `haut`, `rr 16 · file 16 · hd 6`, une configuration que **personne
  n'avait jamais exécutée** et que la v290 a rendue atteignable pour la première
  fois — et cela se justifie tout seul. **Mais je n'ai pas mesuré le mécanisme du
  plantage**, et une explication qu'on n'a pas mesurée est une dette, pas un
  diagnostic (v220).

  Ce qui est établi : `haut` était inatteignable avant la v290 (vérifié dans le
  code de `f2ee0db` : `noterImage(now - lastTime)` contre une barre à 8 ms) ;
  l'iPhone était en `bas` (sa capture de la v284 disait « → bas »), donc il est
  passé de 289 morceaux chargés à 1 089 et de la couche HD éteinte à la portée 6
  en une version ; la file de seize est le chiffre que la v269 a mesuré comme
  impraticable et retiré. Ce qui n'est PAS établi : que l'onglet meure de cela,
  et par quel mécanisme (mémoire, pilote graphique, autre chose).

  **Ce qui trancherait, en un geste, et c'est chez Max** : `?palier=moyen`
  survit-il quand l'adresse nue meurt ? Si oui la cause est nommée ; si non elle
  est ailleurs, et la v291 reste juste pour d'autres raisons. `?diag=1` sur la
  même page donne les appels de dessin, les triangles et la résolution.

  Les étapes, dans l'ordre :
  1. Demander à Max le résultat des deux adresses, et `?diag=1` sur celle qui
     vit. Une seule question, un seul geste.
  2. Si c'est la mémoire : elle ne se mesure PAS au banc. Ma sonde
     (`tests/sonde-palier-haut.cjs`) a rendu **348 morceaux chargés sur 625
     attendus et 384 sur 1 089** — en rendu logiciel le banc rend une image par
     seconde et ne remplit jamais son disque, donc elle mesurait le banc. Le
     chiffre ARITHMÉTIQUE, lui, se retient : un morceau pèse `16×16×160×2` =
     80 Ko, et le worker en tient un jumeau (v251), donc rr 8 → 46 Mo, rr 12 →
     98 Mo, rr 16 → **170 Mo** de blocs seuls, hors géométrie.
  3. Si la cause est nommée et bornée, `haut` peut redevenir mesurable — le
     drapeau `surChoixSeulement` tombe, avec la mesure en commentaire.

- [ ] **LE RELIEF DE PARIS (v287, v288, v289) N'A PROBABLEMENT JAMAIS ÉTÉ VU PAR
  LA FAMILLE — à confirmer chez Max, en une capture.** La règle de la v284 lisait
  la PÉRIODE de l'écran : un appareil à 59 images par seconde rendait 17,0 ms
  contre une barre basse de 16,7, donc **`bas`**, donc `hd 0`, donc la couche HD
  ÉTEINTE. L'iPad l'affichait (« → bas au prochain lancement ») et l'iPhone
  tombait dans le même cas. Trois livraisons de relief, de quartiers et de toits
  livrées derrière un réglage qui les éteignait, et ce que Max validait était mes
  captures de banc.

  Ce qui le confirmerait, en un geste : sur `?palier=moyen&diag=1` au centre de
  Paris, la ligne dit `hd 3` et les triangles montent. Si c'est vrai, la v291 rend
  à la famille trois livraisons d'un coup, et il faut le lui DIRE — il a passé
  trois versions à juger des captures d'un jeu que son écran ne montrait pas.

  Et la leçon à instrumenter : **rien ne garde la CONFIGURATION dans laquelle une
  fonctionnalité tourne chez la famille.** Le portail éprouve le code, jamais le
  réglage servi. La piste : un témoin qui calcule, pour les cadences réelles des
  appareils de la maison (59 i/s), ce que la règle rend — et qui rougit si une
  fonctionnalité neuve atterrit dans un palier qui l'éteint.

- [x] **`RAYON_HD` DÉCIDE DE CE QU'ON MONTRE, `world.hd` DE CE QU'ON FABRIQUE —
  et un appareil fabrique le relief de cinq cents morceaux pour en montrer cent
  soixante-neuf.** (Payée en v296, et mesurée avant d'écrire, comme demandé
  ci-dessous : 2,93 Mo par morceau HD, 1 171 Mo pour la ville à rr 12.) Mesuré en ordre alterné au centre de Paris : le nombre de
  morceaux porteurs de tampons HD est le MÊME aux portées 3 et 6 (248 et 256
  contre 236 et 238), parce que `world.hd` vaut 1 dès que `RAYON_HD > 0` et que
  `couvreHD` couvre tout le disque de Paris ; `montrerLeDetail` ne fait que
  basculer `visible`. Ce qui change avec la portée, c'est ce qu'on DESSINE :
  4,93 et 4,95 millions de triangles contre 1,87 et 1,93, soit 2,6 fois, à
  nombre d'appels de dessin inchangé. Ce n'était pas la panne du jour ; c'est de
  la mémoire graphique payée pour rien sur la tablette. La piste : passer la
  portée au worker pour qu'il ne produise les tampons HD que dans le disque
  utile — mais la portée bouge avec l'enfant, donc cela veut dire remailler, ce
  que `montrerLeDetail` existe précisément pour éviter (v287). À mesurer avant
  d'écrire : ce que les tampons HD de cinq cents morceaux pèsent vraiment.

- [ ] **`?palier=` n'a qu'un témoin de TABLE, et c'est déclaré.** Le banc met
  TOUJOURS `rr=` dans son adresse (v284), donc aucune page d'ici ne peut isoler
  ce paramètre pour éprouver que `CONFIG_FORCEE` le voit. Le témoin lit la liste
  (`PARAMS_FORCANTS`, rangée à côté de la règle qu'elle sert) : il garde contre
  un retrait, pas contre un chemin. Un témoin de trajet demanderait une page que
  le banc ouvre SANS `rr`, ce qui changerait `adresse()` dans `banc.js` — donc le
  banc entier se rejouerait, et ce n'est pas le prix d'un paramètre.


- [ ] **GRAND TOUR — LE PROGRAMME « PARIS, PUIS LA CONDUITE » (décision de Max,
  septembre 2026).** Le but n'est plus un meilleur clone de Minecraft : c'est un
  monde ouvert beau et vivant, où Paris se reconnaît depuis un trottoir sans voir
  la Tour Eiffel, et où l'on conduit comme dans un vrai jeu de conduite —
  partout, hors des routes aussi. Le voxel devient le SQUELETTE du monde ; il
  n'est plus le dernier mot de ce qu'on voit. Audit fait avant d'écrire une
  ligne (quatre lectures croisées : Paris, rendu, véhicules, banc) ; captures
  « avant » prises au banc (`tests/sonde-captures-paris.cjs`).

  Ce que l'audit a établi, et qui décide de l'architecture :
  - Paris est ENTIÈREMENT voxel, une façade = une tuile de 16 px par bloc
    (`batirColonneParis`, `solParis`), une colonne = une décision, et la ligne
    de corniche est tirée PAR ÎLOT (invariant visuel à garder).
  - Manhattan a déjà la brique réutilisable : matériaux PBR procéduraux à
    projection triplanaire, environnement PMREM, instanciation par lot, LOD par
    secteur (`manhattan-materiaux.js`, `manhattan-render.js`). Son blocage est
    l'état global du rendu sauvé une seule fois (`earthLook`).
  - Le mailleur rend des TAMPONS depuis un worker sans three : toute couche de
    détail neuve doit rendre des tampons de la même façon, ou elle reprend le
    fil principal que la v251 a libéré.
  - La voiture EST le joueur : pas de corps rigide, un cap = le regard, aucune
    adhérence, une AABB qui ne tourne pas, aucun feu sur les GLB, un volant qui
    ne tourne jamais (`player.js:577-625`, `fun.js:1033`).
  - Le mobilier (`props.js`) est en `MeshBasicMaterial` : la seule chose du
    monde qui n'est pas éclairée depuis la v247, et 5 à 11 appels de dessin par
    réverbère ou feu.

  Le plan, en cinq livraisons — chacune passe le portail, chacune est jugée sur
  captures avant/après (règle de jugement du programme réalisme) :

  1. **PR1 — la fondation Paris HD.** Une seconde passe du mailleur, dans le
     worker, qui émet pour chaque face de façade exposée un DÉTAIL (baie en
     retrait, encadrement, appui, garde-corps, balcon filant, corniche, store)
     et pour chaque sol de ville une face HD ; un seul matériau Standard
     (atlas 1024², rugosité/métal et lueur PAR SOMMET, environnement PMREM) ;
     le voxel plat garde le LOIN (LOD sans remaillage) ; le palier décide de la
     portée (`hd`). Le mobilier devient éclairé. Preuve : une rue en capture,
     un témoin `parishd.js` (cohérence plat/HD, blocs intacts, palier bas
     identique à l'octet près).
  2. **PR2 — Paris hyperréaliste.** Identités de quartier (Marais, Latin,
     Montmartre, Étoile, Cité, 7e, Montparnasse), comble à la Mansart en
     géométrie, mobilier parisien instancié (réverbères, bornes, bancs, kiosques,
     colonnes Morris, terrasses, entrées de métro, plaques de rue), devantures et
     enseignes, voitures garées, arbres en maillage, densité de piétons ;
     monuments héros en géométrie (Tour Eiffel en treillis, Notre-Dame, Arc,
     Louvre, Sacré-Cœur…).
  3. **PR3 — lumière et atmosphère.** Soleil et ciel selon l'heure, ombres,
     nuit qui n'est pas un jour assombri : réverbères, fenêtres, devantures,
     monuments illuminés, phares et feux stop sur les GLB.
  4. **PR4 — conduite universelle.** Contrôleur véhicule à part (`conduite.js`) :
     accélération/freinage/recul, direction selon la vitesse, adhérence latérale
     et glisse, frein à main, suspension et sol échantillonné sous QUATRE roues
     (tangage, roulis), surfaces (asphalte, pavé, herbe, terre, sable), collisions
     avec normale, caméra de poursuite à cap indépendant ; partout dans le monde.
  5. **PR5 — performance.** Mesures sur l'appareil, appels de dessin, mémoire,
     paliers BAS/MOYEN/HAUT/ULTRA.
  6. **Ensuite, TOUTES LES VILLES EUROPÉENNES** (consigne de Max : « when done
     do all European cities ») : Londres, Nice, Lille bâties à la main, puis les
     villes engendrées d'Europe (`villesmonde.js`). La couche HD lit des blocs
     `ARCHI` que ces villes posent déjà : l'étendre est d'abord élargir
     `couvreHD` à leurs disques, puis donner à chaque tissu (`villesmonde.js`)
     ses registres — brique de Londres, tuile de Rome, pan de bois.
     **État (v390).** Palier A livré : Londres (`VILLES_HD`, `STYLES.londres`,
     le mur d'à côté lu par `murVoisin`, les murs Briques/Uni dans la couche).
     Palier B livré (v392) : Nice et Lille (`STYLES.nice`, `STYLES.lille`).
     Palier C livré (v394) : les 90 villes engendrées d'Europe (`registreEurope`,
     `STYLES.sud`, `STYLES.nord`). La consigne est remplie. Dettes déclarées
     du palier C, vues en capture :
     - [ ] une baie de ville engendrée est faite de DEUX blocs `ETAGE`
       empilés : la couche (comme la tuile plate) y dessine deux fenêtres
       l'une sur l'autre par étage — un registre « baie de deux blocs »
       (les bandes `ETAGE_BAS/MI/HAUT` de Paris) demanderait que
       `villesmonde.js` pose ces bandes : c'est un changement de blocs, donc
       de la zone des villes engendrées, pas de la couche ;
     - [ ] Édimbourg est en brique rouge parce que sa palette l'est ; la vraie
       ville est de grès gris — une fiche, pas un registre ;
     Et :
     le raccord ville/campagne (`raccordInterdit`) n'est interdit qu'à Paris —
     une colonne de raccord de Londres montre la surface plate, pas le sol HD.
     Portail de la v390 (lancé sous le numéro v386, avant deux rebases) : 12 suites vertes, `parishd.js` comprise ; cinq
     rouges, tous déjà déclarés ici avec leur double mesure — `maj.js` (le
     loader et ses fichiers ; corps, programmes et fond de carte), `carte.js`
     (glisser bridé ×4, 416 ms pour 400), `manhattan.js` (le trou de façade ;
     PeerJS « Lost connection »), `monte.js` (le bout du monde en vol),
     `reseau.js` (la même circulation sur deux tablettes). PREUVE STRUCTURELLE
     (v291) : aucune de ces suites ne force `?hd=`, le banc rend en logiciel,
     donc `RAYON_HD` vaut 0, `world.hd` est faux et `villeHD` n'est jamais
     appelé — le mailleur y prend exactement le chemin d'avant.
     Portail de la v392 (cinq suites) : `parishd.js` et `plafond.js` verts ;
     `maj.js` rend ses deux rouges déclarés ; `monte.js` un rouge NEUF —
     « un flâneur posé au milieu de la chaussée en sort et flâne au bord »
     (témoin de la v385) : à Rome, trois essais, sortie après 3,1 · 2,8 ·
     3,8 s, d 1,27 · 1,84 · 3,3, arrivée « t », « a », « a ». PREUVE
     STRUCTURELLE (v291) : `monte.js` ne force pas `?hd=`, `world.hd` y est
     faux et la couche n'est jamais lue. À reprendre par la session des
     passants, avec sa double mesure.
     Portail de la v394 (cinq suites) : `parishd.js` (avec les vingt-deux
     témoins du palier C) et `plafond.js` verts ; `maj.js` « corps, programmes
     et fond de carte » (déclaré) ; `monte.js` deux rouges de la recharge à
     l'arrivée (v379) — « garde la cadence » rapport 0,72 pour 0,75 (déjà
     nommé plus haut), « la file … puis se rend » rendue en 11 236 ms : non.
     Même preuve structurelle : `monte.js` ne force pas `?hd=`.

  7. **Le reste du monde** (session `claude/hd-villes-monde`). Palier A livré
     (v398) : Washington et San Francisco (`STYLES.washington`, `sfCentre`,
     `sfSoma`, `sfMaisons`, la tuile `bardage`). Palier B livré (v399) : les 61
     villes engendrées des Amériques (`nordAmericain`, `latino`). Palier C livré
     (v401) : Asie, Moyen-Orient, Afrique, Océanie (`asie`, `desert`,
     `tropical`, `victorien`, et `nord`/`sud`). La zone est faite.
     - [ ] les quatre médinas restent hors de la couche : un registre `medina`
       (baie carrée grillée, moucharabieh, auvent de souk) serait une
       livraison à lui, sur capture ;
     - [ ] le raccord ville/campagne (`raccordInterdit`) n'est interdit qu'à
       Paris : hors de Paris une colonne de raccord montre la surface plate —
       l'étendre change la forme du sol (la hauteur des pieds), hors de la
       couche ;
     - [ ] la palette d'Édimbourg (brique rouge pour du grès gris) et la « baie
       de deux blocs » des villes engendrées sont des changements de BLOCS dans
       `villesmonde.js`, zone des villes engendrées. Dettes déclarées :
     - [ ] **le Colisée du catalogue change à chaque lancement** :
       `monuments.js:501` tire ses gradins effondrés à `Math.random()` — 173
       blocs du morceau (cx, cz + 1) de Rome différents entre deux exécutions
       (sonde `empreinte.mjs`, sur `origin/main` comme sur la branche). Le worker
       et le fil principal engendrent donc DEUX Colisées : on se cogne à des
       gradins qu'on ne voit pas, ou l'on traverse ceux qu'on voit, et deux
       tablettes n'ont pas le même. Remède d'une ligne (le tirage de la colonne,
       `tirage(x, y, z)`), mais c'est un bloc écrit : il change le Colisée une
       fois pour toutes, et un enfant a peut-être bâti contre — à décider avec la
       zone des monuments, pas dans la couche HD ;
     Portail de la v401 (quatre suites) : `plafond.js` vert ; `parishd.js` deux
     rouges À MOI, corrigés et rejoués seuls (148 verts) — Nairobi ne rend que
     dix morceaux, sous la barre du témoin (remplacée par Lagos), et le témoin
     des Amériques exigeait qu'Honolulu n'ait aucun registre (repointé sur
     `registreAmeriques`) ; `maj.js` « corps, programmes et fond de carte » et
     `monte.js` « son flanc frôlé » : déclarés, double mesure faite en v399.
     Portail de la v399 (quatre suites) : `parishd.js` et `plafond.js` verts ;
     six rouges dans `maj.js` et `monte.js`, aucune ne force `?hd=` (preuve
     structurelle v291). Rejouées SEULES des deux côtés :
     - [ ] `monte.js` « une vraie voiture de la rue, par le vrai crochet : son
       flanc frôlé ne nous arrête pas » (témoin de la v397) : rouge sur la
       branche ET sur `origin/main` (v398), `{"c":null,"lu":false}` — aucune
       voiture trouvée ; à reprendre par la session de la conduite ;
     - `maj.js` « le jeu se mesure en jouant, et range son verdict » et « le
       palier se décide sur le TRAVAIL d'une image » : rouges au portail
       (période 467 ms, la page à deux images par seconde), VERTS seuls des deux
       côtés — charge du portail ;
     - [ ] `monte.js` « au volant, le personnage de l'enfant est assis dans la
       voiture » : `{"avatar":false,"monture":true}` une fois sur la branche
       rejouée seule, vert au portail sur la même branche et seule sur
       `origin/main` — intermittence de la zone de la conduite ;
     - les autres (« corps, programmes et fond de carte », « ne floute rien »,
       le flâneur, le bout du monde en vol) : déjà déclarés plus haut, et
       `origin/main` rend en plus « la rue roule à l'allure d'une ville » et
       « au feu, la voiture freine » rouges seule.
     Portail de la v398 (quatre suites) : `parishd.js` et `plafond.js` verts ;
     `maj.js` « corps, programmes et fond de carte » (déclaré) ; `monte.js`
     « un passant change de trottoir au feu » à 1 au vert sur 4 (déclaré plus
     haut, même chiffre sur `origin/main`). PREUVE STRUCTURELLE (v291) : aucune
     des deux ne force `?hd=`, le banc rend en logiciel, la couche n'est jamais
     lue.
     - [ ] la vue de rue au centre de San Francisco montre la pierre HD entre
       les fenêtres du mur-rideau (`CITY_BLOCK.CURTAIN`, hors couche) : le
       mur-rideau reste une tuile plate, ce qui est juste (v195), mais son
       raccord avec la pierre en relief est à juger sur la tablette.

  Ce qu'on ne touche PAS : le système de coordonnées, les clés de stockage, les
  blocs sauvegardés, `terrainHeight`, les contrats réseau. La couche HD LIT les
  blocs, elle n'en écrit aucun.

  **État (v289).** PR1 livrée (v287) ; PR2 livrée en trois temps — la v288 porte
  les registres par quartier, les arbres maillés, les potelets, terrasses,
  plaques, mitres et le réverbère parisien ; la v289 le comble à la Mansart en
  champ de hauteurs (brisis, chiens-assis, terrasson continu, croupes), les
  colonnes Morris, les bancs et les corbeilles. Ce qui reste de la PR2, pour la
  suivante : les kiosques, et les monuments héros (`herosparis.js` /
  `monumentshd.js` : Tour Eiffel en treillis, Notre-Dame, Arc, pyramide du
  Louvre, Sacré-Cœur, Panthéon, Opéra, Invalides, Montparnasse). Dettes
  déclarées de la v289 :
  - [ ] le champ de hauteurs lisse un immeuble avec lui-même (`infoFacadeParis`,
    îlot et travée) : deux LOTS voisins d'un même immeuble de hauteurs
    différentes se lissent l'un sur l'autre, ce qui fait un toit qui monte d'un
    lot à l'autre au lieu d'un mur pignon — à mesurer sur capture, rue par rue ;
  - [ ] un brisis qui monte à plus d'un bloc (coin de champ à 1,5 ou 2) est
    raide mais droit : le vrai brisis d'un immeuble de coin se brise à la ligne
    de bris ; la constante `RETRAIT` est la seule à régler, sur capture ;
  - [ ] sur les places sans trottoir large (esplanades), la colonne Morris se
    pose au tirage sans regarder si une devanture ou un banc est à côté ;
    mesuré : cinq colonnes sur vingt-cinq morceaux, aucune côte à côte.

  Dettes déclarées de la v288 :
  - [ ] une chaise de terrasse HD n'arrête ni un passant ni une voiture (ce
    n'est pas un `prop`, donc pas un obstacle de `mobilierDevant`) — à régler
    avec la PR4, où les obstacles de la conduite se refont ;
  - [ ] la ferronnerie d'un garde-corps sur une baie étroite (Marais, 0,28 de
    large) se lit comme un glyphe : la tuile `fer` est faite pour une travée
    entière — une tuile à part pour les petites baies ;
  - [ ] les Champs-Élysées à `dx = −4,3 km` rendent de l'herbe et non
    l'avenue : `solParis` fait passer un jardin avant l'axe — à mesurer avant
    les monuments héros (l'Arc et la Concorde sont aux deux bouts).

- [ ] **LE PORTAIL DE LA v288 (PR2 Paris) : SEPT SUITES ROUGES, LA DOUBLE
  MESURE EN MAIN — ET UN TÉMOIN DE LA PR QUI MESURAIT L'ORDRE DE LA FILE.**
  Seize suites, 83 minutes (le conteneur a redémarré deux fois dans la
  journée, et la machine rend 0,75 image par seconde à `rr=6` avec la couche
  HD). Chaque rouge rejoué SEUL, sur la branche puis sur `origin/main`
  (`/root/main-ref`, ca2e992) quand il restait rouge :

  | suite | au portail | seule, branche | seule, `origin/main` |
  | --- | --- | --- | --- |
  | `parishd.js` | près/loin `{attente:40000, loin:false}` ×2, atlas | ❌ identique → **témoin corrigé**, ✅ 23/23, lointain en 15 437 ms | — |
  | `carte.js` | fond de carte 413 ms (borne 400) | ✅ 283 ms | — |
  | `reseau.js` | départ propre · endormi | ✅ entièrement verte (1 034 s) | — |
  | `maj.js` | libération `null` · la page ne floute rien | ❌ identique (4/9 corps, 4/25 programmes) | ❌ identique (1/9, 9/25) |
  | `reglages.js` | l'autre tablette : serveur `"fr"` | ❌ identique | ❌ identique |
  | `monte.js` | piéton `avance 5,8` · chevauchements 62 · figé 5 516 ms / 40,4 % | ❌ figé seul : 4 733 ms / 36,2 % | ❌ figé 5 183 ms / 39,9 % **ET** « une voiture n'entre pas dans l'eau » (reculé 1,19) |
  | `manhattan.js` | délai (aucun témoin rouge imprimé) | non rejouée : dette v269/v285, code inchangé | — |

  Le piéton et les chevauchements de `monte.js`, le fond de carte de `carte.js`
  et les deux témoins de `reseau.js` sont des durées ou des tirages sous la
  charge du portail (v270, v277) : verts seuls. `maj.js` et `reglages.js` sont
  les dettes des v284/v285, au même relevé des deux côtés. `origin/main` rend
  un rouge de PLUS que la branche sur `monte.js` (le quai) : la livraison ne
  dégrade rien. Rien du diff — façades HD, matières, réverbère, journal — n'a
  de chemin vers le réseau, les réglages, le loader ou la carte.

  **Et le rouge de `parishd.js` était celui d'un témoin, pas du jeu.** Il
  guettait trois morceaux NOMMÉS « à cinq » et dormait quarante secondes ; la
  sonde `sonde-hd-lod.cjs` a montré le relais juste dès 3 s, le worker vivant,
  et ces trois morceaux arrivant à 41 et 43 s (celui de l'autre côté dès 22 s)
  parce que le fil principal installe les morceaux au rythme des images. Il
  prend désormais tout morceau au-delà du rayon HD, borné à 90 s, durée dans
  le message. Ce que ce rouge laisse ouvert : la cadence d'installation des
  morceaux SUIT la cadence d'affichage (un réapprovisionnement de la file par
  image, v265/v269) — à 0,75 image par seconde, trois morceaux par seconde
  pour une file de huit. C'est un fait du jeu sur un rendu logiciel, pas une
  régression ; sur l'iPad la cadence est vingt fois plus haute.

- [ ] **LE PORTAIL DE LA v287 (PR1 Paris HD) : TROIS SUITES ROUGES, LA DOUBLE
  MESURE EN MAIN.** `manhattan.js` et `monte.js` rendent exactement les rouges
  déclarés ci-dessous (v285 : le trou de façade, la nuit, les ombres `[1,-1]` ;
  le figé à l'arrivée, le tirage des voitures). `maj.js` a rendu au portail
  « le loader ne s'efface qu'une fois les corps et les programmes prêts »
  (effacé à 6 300 ms, programmes 22/25) — et REJOUÉE SEULE il est vert des deux
  côtés :

  | `maj.js` seule | `origin/main` (v286) | branche |
  | --- | --- | --- |
  | le loader ne s'efface qu'une fois… | ✅ | ✅ 1 877 ms, 25/25 |
  | le loader ne cache jamais un « Jouer » cliquable | ✅ | ❌ **garde** : 2 relevés, 0 fautif |
  | fond de carte à la libération | ❌ `carte: false`, 45,3 s | ❌ `carte: false`, 51,9 s |

  La garde `releves >= 3` comptait le temps entre l'ouverture de la boucle et la
  page prête, en pas de cinquante millisecondes : une grandeur du banc. Posée à
  un (la moitié de la plus petite mesure, v237). Le fond de carte est la dette
  de la v276, inchangée. Le rouge du portail, lui, est de la famille « une
  durée sous la charge du portail » : il ne se reproduit pas seul, sur aucun
  des deux arbres.

  **Second portail, après la rue de Paris** (quinze suites, 678 verts) : douze
  vertes ; `manhattan.js` et `monte.js` sur leurs dettes déclarées, à
  l'identique ; `maj.js` sur le fond de carte ET sur une puce du journal à neuf
  mots — le deux-points isolé compte pour un mot. La puce corrigée, `maj.js`
  rejouée seule est entièrement verte, fond de carte compris (il est
  intermittent, v276).

- [ ] **LE PORTAIL DE LA v285 : CINQ SUITES ROUGES, AUCUNE DE LA LIVRAISON.**
  Trois témoins que j'avais cassés ou mal repointés sont corrigés et verts ; le
  quatrième rouge, « la voiture au mur », a été démonté par une sonde qui
  innocente le jeu. Ce qui reste est déclaré ici, avec ce qui le mesure.

  | suite | témoin | mesuré ailleurs |
  | --- | --- | --- |
  | `maj.js` | corps/programmes/fond `null` ; la page ne floute rien | identique au portail v284 (arbre v284, mêmes témoins) |
  | `manhattan.js` | délai de 60 s ligne 282 | v269 : même délai sur `origin/main` au TROISIÈME passage |
  | `reglages.js` | l'autre tablette (`"fr"`) puis `TypeError … 'edu'` | identiques au portail v284, aux deux lignes près |
  | `monte.js` | l'écran ne se fige pas en arrivant sur une ville | 4 433 ms / 37,3 % ici contre 4 933 ms / 36,4 % sur `origin/main` |
  | `monte.js` | les voitures ne se traversent plus | le TIRAGE écrit dans `CLAUDE.md` (v277) : 89 ici, 53 au portail v284 |
  | `reseau.js` | départ propre · joueur endormi · réveil | DEUX passages de chaque côté, même distribution (table ci-dessous) |

  **ET `reseau.js` EST INTERMITTENTE DES DEUX CÔTÉS — quatre passages pour le
  savoir.** Un passage de chaque côté m'avait fait voir une asymétrie qui n'existe
  pas (règle de la v269) :

  | | passage 1 | passage 2 |
  | --- | --- | --- |
  | `origin/main` seule | départ propre · endormi | **entièrement verte** |
  | branche seule | départ propre · réveil | **entièrement verte** |
  | branche au portail | départ propre · endormi · réveil | — |

  Les trois témoins appartiennent à la même famille (le départ, le sommeil, le
  réveil) et le rouge se déplace d'un passage à l'autre. « Un départ propre » sort
  dans trois passages sur cinq, sur les DEUX arbres : c'est un défaut de
  production, intermittent — pas « rouge à chaque fois », ce que j'avais écrit
  avant de l'avoir mesuré.

  **Et l'argument qui vaut plus que l'échantillon : le diff n'a AUCUN chemin vers
  ce code.** `src/net.js` ne gagne qu'un commentaire — le code réseau est
  identique au bit près — et sur tout `src/` plus `index.html`, la seule ligne qui
  effleure cette surface est le RETRAIT de `creatureManager` de `window.__game`.
  Rien sur `dodo`, `coucou`, la visibilité, la liste des pairs ni la présence.

  **Et le compte de chevauchements n'est toujours PAS un gardien.** La v277
  l'avait écrit — un compte ABSOLU sur trente secondes de montre, dans une ville
  qui rend quatre images par seconde, mesure le nombre de RELEVÉS autant que le
  jeu. Ce portail le confirme par un troisième bout : 1 387 mesures ici contre
  779 au portail d'avant, sur un code de circulation inchangé, et le compte suit.
  Ce qu'il faut, c'est un TAUX par relevé et par paire à portée — pas un seuil de
  plus. Tant qu'il tire à pile ou face, on ne peut rien conclure de
  `cederLePassage`, et c'est écrit depuis la v277.

- [ ] **LES DEUX BORNES QUE L'ENFANT ATTEND APRÈS UNE MISE À JOUR SE SUIVENT, ET
  PERSONNE NE LES AVAIT ADDITIONNÉES.** Max, après la v285 : « après la mise à
  jour, sur la home le jeu lag 1 à 2 min, ça a été le cas depuis longtemps ».
  C'est le symptôme que la v257 et la v258 devaient corriger — donc on cesse de
  régler et l'on va voir ce qui s'exécute (règle de la v226).

  L'arithmétique, avant toute mesure : `index.html` borne la mise à jour à
  **45 s** (v220), puis `main.js` montre le loader `apresMaj` borné à **90 s**
  (il attend `humainsCharges() && chauffeFinie`) pendant que `veillerPrep` grise
  « Jouer », borné à 45 s. **45 + 90 = 135 s**, exactement la fourchette de Max.
  Il est donc possible que le jeu le RETIENNE au lieu de ramer — ce n'est pas la
  même panne et cela ne se corrige pas au même endroit.

  **NON-RÉSULTAT MESURÉ, qu'on ne réessaiera pas** : le suspect évident était les
  treize mégaoctets immuables (scanner, flotte, 8,2 Mo de corps, polices)
  re-téléchargés à chaque livraison. `sw.js` ligne 179 : `activate` supprime tous
  les caches SAUF `STATIC_CACHE`, et `isStaticAsset` couvre bien
  `/vendor/humains/`. Ils ne repartent pas sur le réseau.

  Ce qui manque ne peut venir que de l'appareil — le banc met six secondes là où
  Safari en met une (v257), et cela ne se transpose pas. Le jeu AFFICHE déjà la
  réponse, et trois lectures donnent trois causes : le loader « ✨ Installation…
  personnages x/y, programmes n/m » (borne de 90 s), l'accueil avec « ⏳
  Préparation du jeu… » (borne de 45 s), ou l'accueil nu et saccadé (alors rien
  ne retient, et c'est du vrai travail de fil principal). Demandé à Max.

- [ ] **LE PORTAIL DE LA v284 : SEPT ROUGES, TROIS TÉMOINS CORRIGÉS, ET LA
  DOUBLE MESURE FAITE.** Le conteneur a été recyclé au milieu de la campagne —
  neuvième fois — et cela a fait apparaître des rouges qu'aucun des quatre
  passages précédents n'avait rendus. Chacun est attribué, aucun n'est deviné.

  **Deux corrigés : des témoins qui mesuraient le banc.** Leur message porte
  désormais le temps pris, et c'est lui qui prouve la cause.

  | témoin | ce qu'il rendait | ce qu'il rend |
  | --- | --- | --- |
  | l'ombre d'un pilier | `168,4 · 168,4` (le CIEL) | `58,4 · 103,5`, dalle prête en **6 556 à 10 476 ms** — l'ancien dormait 2 500 |
  | le maillage hors du fil | `parcouru 19 · distants 16` | `parcouru 255 · distants 215` en **17,3 à 23,5 s** — l'ancienne fenêtre en donnait 8 |

  Ce qui tranche n'est pas l'arithmétique (168,4 tombe entre le zénith 155,8 et
  l'horizon 180,8 mesurés par les voisins verts) mais un relevé à part : **une
  dalle privée de son ombre lit 101,3.** Chaque correction est vérifiée ROUGE —
  `ombres=0` rend 0,98, `maillage=local` rend 216 ms/s pour une barre de 120.

  **Cinq corrigés : l'embarquement.** Les cinq témoins d'avion rendaient `pas
  aux commandes {}`, sur la branche ET sur `origin/main` rejoué seul, donc sur
  le code en production. **Marlon n'est pas touché** — page neuve, un clic, aux
  commandes. La garde de la boucle lisait `montureConduite()`, vrai pour une
  VOITURE ; et descendre ne suffit pas, une monture SUIT le joueur. Quatre bras
  mesurés : neuve 1 clic ✓ · sans remède 0 clic ✗ · descente seule 8 clics ✗ ·
  vide complet 1 clic ✓. Les DIX boucles de la suite sont corrigées, pas les
  quatre qui rougissaient.

  **Les six rouges restants, chacun attribué par une mesure** (suites rejouées
  SEULES des deux côtés, arbres séparés, toutes après le recyclage) :

  | rouge | branche seule | `origin/main` seul |
  | --- | --- | --- |
  | `maj.js` corps/programmes/fond | ❌ `personnages 8/9` | ❌ **`personnages 8/9`** — identique |
  | `maj.js` la page ne floute rien | ✅ | ✅ — rouge SEULEMENT sous la charge du portail |
  | `manhattan.js:282` délai | 💥 | v269 : identique sur `origin/main` au 3ᵉ passage |
  | `monte.js` l'écran se fige | ❌ 4 433 ms · 37,3 % · 4,1 im/s | ❌ 4 933 ms · 36,4 % · 4,0 im/s |
  | `monte.js` la voiture contre un mur | ❌ | ❌ identique |
  | `monte.js` le passant marche | ❌ débit 0,57 | ✅ 0,99 |

  **Le passant est UN POINT ABERRANT SUR NEUF, et c'est la mesure qui le dit** :
  0,57 · 0,99 · 1,26 · 1,27 · 1,29 · 1,32 · 1,37 · 1,40 · 1,48 pour une barre à
  0,80, sur neuf passages dont aucun ne touche `passants.js` ni `marlon.js`. Huit
  sur neuf sont à 0,99 ou au-dessus. Ce n'est pas une barre posée dans l'étendue
  (le piège de la v277) : c'est une queue de distribution, et elle se remesurera.

  **Et `reglages.js` est VERT au portail de la v284**, après avoir été rouge aux
  deux précédents — son rouge de « l'autre tablette » était donc lui aussi une
  intermittence, pas un défaut.

  **Ce qui reste à faire, et qui n'est PAS mesuré** : pourquoi le recyclage du
  conteneur change ce que la suite laisse derrière elle. Le fait est net —
  quatre passages verts avant, deux rouges après, sur du code identique — la
  cause ne l'est pas. Le remède posé ne dépend d'aucune hypothèse là-dessus :
  chaque témoin se place lui-même, donc l'état hérité ne peut plus le tromper.

- [ ] **`monte.js` : DEUX ROUGES NEUFS, ATTRIBUÉS ET UN CORRIGÉ (v282).** Les
  portails ayant tourné dans la même configuration sur la même machine, la
  double mesure de la v195 s'est prise sans rejeu, puis chaque suite a été
  rejouée SEULE des deux côtés.

  | témoin | main (v281) | branche v282 |
  | --- | --- | --- |
  | la téléportation ne compile plus de programmes | vert | **corrigé — vert** |
  | l'écran ne se fige pas en arrivant | ❌ 40,0 % · 35,0 % | ❌ 34,3 % · 42,9 % |
  | une voiture arrêtée par un mur | ❌ `immobile 0` et `1` | ❌ `immobile 0` · ✅ `immobile 4` |
  | une voiture n'entre pas dans l'eau | ✅ | ✅ |
  | les voitures ne se traversent plus | ❌ 42,4 % | ❌ 60 % |
  | **total, suite rejouée seule** | **137 verts · 7 défauts** | **141 verts · 3 défauts** |

  **La téléportation est corrigée** : sa borne de garde disait `images > 30`
  quand ce témoin rend 22 à 42 images — relevé sur sept passages, deux portails
  et deux rejeux seuls des deux côtés. Elle tombait donc six fois sur sept sur
  sa garde pendant que la mesure gardée était parfaite (`neufs: 0`). Dix est
  sous la moitié du pire relevé et très loin de zéro, et les quatre autres
  bornes de garde du fichier ont été relues dans la même passe (0,41 à 0,69 de
  leur mesure, donc à leur place).

  **Les trois qui restent sont pré-existants et intermittents des DEUX côtés.**
  Le mur et l'eau sortent de leur boucle sur `immobile >= 4`, quatre relevés de
  250 ms à moins de 0,02 bloc : à quatre images par seconde deux relevés
  tombent dans la même image. C'est « un minimum échantillonné est une propriété
  de la cadence, pas du monde » (v279), et la grandeur se trompe dans les deux
  sens — le mur n'atteint jamais quatre et court jusqu'à sa borne de 25 s,
  l'eau les atteignait en cinq secondes alors que la voiture accélérait encore.
  Ce qui ne dépend d'aucun relevé intermédiaire, c'est la position d'ARRIVÉE ;
  ces deux verdicts ne la mesurent pas encore. Reste à les reformuler dessus,
  bornés, la durée entrant dans le message (v270).

- [x] **LE SUPERÎLOT COÛTE UN CIRCUIT À QUARANTE-SIX VILLES (v282).** Fait en
  v387, mais pas par la piste déclarée : la contrainte en fraction du
  périmètre laisserait deux convois se SUIVRE. Ce qui a changé depuis la v211,
  c'est la chaussée (deux voies, v271) : le partage se compte désormais par
  VOIE, et deux anneaux de part et d'autre d'une rue s'y croisent. Un superîlot
  de rayon ≈ 2 pas n'a géométriquement qu'un cycle qui évite sa place : il
  reçoit son CONTRESENS. 48 superîlots à un circuit → 3 ; toutes villes, 147 →
  11.

- [ ] **J'AI MODIFIÉ `src/` PENDANT QU'UN PORTAIL TOURNAIT (v282).** La règle de
  survie du banc est écrite depuis toujours et je l'ai enfreinte en corrigeant
  le jeu pendant que le portail jouait `washington.js` : la fin de ce portail a
  mesuré un arbre à moitié changé, et il a fallu le tuer et le reprendre. Une
  SONDE se lance pendant un portail ; une CORRECTION attend qu'il rende la
  machine. (Et `node tout.js --suites <fichier>` n'existe pas : `tout.js` ne
  connaît que `--depuis-zero`, `--voie`, `--long` et `--malgre-fumee`, donc le
  drapeau est ignoré EN SILENCE et le portail entier se lance. Pour jouer une
  suite seule, c'est `node carteMonde.js` — ou `npm run carte`, `monte`,
  `reseau`… Un drapeau inventé ne rend pas d'erreur : on le vérifie dans
  `tout.js` avant de croire qu'on a lancé une suite.)

- [ ] **L'ARCADE EXISTE, MAIS ELLE NE SE PHOTOGRAPHIE PAS (v282).** Le témoin
  compte les colonnes de lot où le bâtisseur ne pose rien à hauteur d'homme —
  23,7 % à Bologne, 24,7 % à Turin, zéro à Zurich et à Copenhague — et c'est
  vrai. Mais un COMPTE de colonnes dégagées ne dit rien de la CONTINUITÉ, et
  c'est la continuité qui fait une galerie. Mesuré dans l'axe de la trame : la
  plus longue file fait **cinq colonnes à Bologne, sept à Turin**, sur 1 026 et
  1 402 colonnes dégagées. C'est la longueur d'un front de lot, ce qui est
  cohérent — les lots sont séparés par une rue tous les vingt-trois blocs — mais
  ce n'est pas les quarante kilomètres de portiques de la vraie Bologne, et sur
  une capture au niveau de la rue on ne reconnaît pas une arcade. Max juge au
  premier regard : tant que ce n'est pas une galerie, le journal doit dire « des
  arcades », jamais « on marche sous les arcades de Bologne ».

  Le remède est un choix de PLAN, pas un réglage : il faut que le portique
  coure sur tout le front du lot ET que les fronts se rejoignent d'un lot à
  l'autre. Piste non mesurée : poser le portique sur le rang entier du côté
  rue, et rapprocher les lots des carrefours.

  **Et la sonde s'est trompée d'axe avant de le voir** : mesurée le long des
  axes du MONDE, la plus longue file valait trois colonnes partout, exactement —
  le signe qu'on traverse en biais une bande de 1,15 bloc dans une trame TOURNÉE.
  Une mesure de continuité se fait dans l'axe de la chose, jamais dans celui de
  la grille de coordonnées.


- **Personnages et véhicules v241 :** compléter la variété des anatomies et vêtements, les expressions faciales et la validation Safari/iPad physique. Les costumes historiques et plusieurs voitures du catalogue restent plus simples ; ne pas les présenter comme photoréalistes.

- **Les avions ont repris une partie de leur rapport de vitesse (v229 →
  v265).** La v229 écrivait que le seul moyen de reprendre le rapport était
  de mailler plus vite ; c'est fait à moitié. La file du mailleur est passée
  de huit morceaux d'avance à seize (`EN_ATTENTE_MAX`, main.js — le genou
  mesuré : le débit de pointe double, la cadence ne bouge pas), le plateau
  remesuré est à 160 blocs/s au lieu de 110, et les vitesses sont désormais
  120 (avion de ligne) et 160 (Concorde, chasseur) : rapport 1,33 au lieu de
  1,16. **Le réel est à 2,4 et reste hors de portée**, et la piste n'a pas
  changé : 45 % du coût d'un morceau est la génération du relief (`fbm`,
  `terrainHeight`, `treeAt`, `cityAt`), le chemin le plus chaud du jeu et
  voisin de l'invariant 1 — donc un chantier à part, avec sa double
  empreinte. Au-delà du genou, le goulot n'est plus le mailleur mais le fil
  principal, qui INSTALLE les géométries : un pool de mailleurs a été écrit,
  mesuré et retiré (non-résultat, voir `CLAUDE.md`).

**Pourquoi ce fichier est dans le dépôt.** La liste de tâches de la session vit
dans le conteneur, et le conteneur a été recyclé sept fois en deux jours. Deux
entrées ont disparu avec lui — la refonte de la sauvegarde et la géographie —
sans que personne ne s'en aperçoive sur le moment. Ce qui compte assez pour être
suivi compte assez pour être versionné.

Tenu à jour à chaque livraison, comme `CHANGELOG.md`. Le journal dit ce qui est
**fait** ; ce fichier dit ce qui **reste**.

---


## v290 — Le palier mesurait la période de l'écran (corrigé, à confirmer sur l'appareil)

Capture `?diag=1` de Max, iPad : « → **bas** (morceau 37,0 ms ou image 17,0 ms
au-delà de 63 / 16,7) au prochain lancement ». La v284 classait l'appareil sur
`now - lastTime`, qui sous vsync vaut la période de rafraîchissement — 1000/59 =
16,95 ms. Corrigé en v290 : on mesure le TRAVAIL d'une image, et la clé de
rangement passe en `web-minecraft-palier-v2` pour que le verdict déjà écrit sur
son iPad n'y survive pas.

**Ce qui reste à mesurer, sur SON appareil, pas au banc.**

- `?diag=1` après une partie de trente secondes : le palier qu'il obtient
  désormais, et les deux nombres (travail et période) que la ligne affiche. Son
  morceau valait **37,0 ms**, ce qui le place entre les deux barres (25 et 63) :
  le palier dépend donc entièrement du travail, qui n'a jamais été mesuré chez
  lui.
- Et le fait le plus parlant de ses deux captures reste non expliqué : **treize
  appels de dessin en vol, quatre au sol**, 33k triangles, 28 à 56 morceaux
  chargés. Ce n'est pas un appareil qui peine, c'est un monde qu'on ne lui
  demande pas. Si le palier le classe `moyen`, il faudra chercher pourquoi si
  peu de morceaux arrivent devant lui — le maillage, pas le rendu.
**LA DETTE DES PIXELS ET DES OMBRES EST PAYÉE — la mesure existe.** Max a mis
« Graphismes avancés » et renvoyé `?diag=1` : `dpr 2.00 (2360×1376) · ombres ON`,
**59 i/s, pire image 84 ms, 14 appels**, contre 79 et 75 ms à `dpr 1,25` sans
ombres. 2,56 fois la surface plus une passe d'ombres entière coûtent cinq
millisecondes sur la pire image. Ce n'est PAS entré dans la table du palier, et
la raison est écrite dans `palier.js` : ces chiffres sont relevés à rr 12 / file
8, que le palier `haut` change aussi.

**ET LA MÊME CAPTURE DONNE LE VRAI PLAFOND : `morceau 37,0 ms`.** Un seul
mailleur rend donc 27 morceaux par seconde, quand voler à 95 blocs/s à rr 12 en
réclame 142 (`2 × rr × v / 16`, v229/v237). Cinq fois trop peu — c'est
exactement « le unveil est late » de la v284, chiffré sur l'appareil pour la
première fois, et ses 14 appels de dessin le disent par l'autre bout.

- **À mesurer sur SON appareil, dans cet ordre.** (1) Le `travail` qu'affiche
  désormais `?diag=1` après trente secondes de jeu, qui décide son palier. (2)
  Deux mailleurs : la v265 les a mesurés sans effet **au banc, en rendu
  logiciel**, où le fil principal saturait à installer les géométries ; chez Max
  le fil principal est vide (résolution doublée gratuite). Un non-résultat ne
  vaut que dans les conditions où il a été mesuré. (3) Ce que coûtent les 37 ms —
  génération du relief (45 % du coût, v229) contre maillage.

**ET L'ÉTENDUE EST DÉSORMAIS UN RÉGLAGE, ce qui change ce qu'on attend de la
mesure.** Max : « permets-moi de choisir l'étendue des graphismes as a user si tu
sais pas la calibrer toi. » Quatre choix dans ⚙️ Réglages (Auto · Court · Normal ·
Loin), `auto` par défaut. Deux conséquences pour la suite :

- Les mesures ci-dessus restent à faire, mais elles ne BLOQUENT plus rien : Max
  peut déjà mettre « Loin » et juger sur captures ce que son iPhone rend à `rr
  16`, file 16, HD 6 morceaux. **C'est la mesure la plus utile qu'il puisse
  faire**, parce qu'elle répond à sa question d'origine — « tu pourrais
  certainement utiliser des graphismes à haute fidélité » — par une capture au
  lieu d'un raisonnement.
- Sous une étendue choisie, le jeu mesure et NE RANGE PAS (règle de la v284).
  `?diag=1` le dit (« mesuré, non rangé »). Pour obtenir un classement il faut
  donc repasser en « Auto » — et c'est voulu.

## VOIR LE SOL DE PLUS PRÈS EN VOL — `PAS_HORIZON` N'A JAMAIS ÉTÉ MESURÉ SUR UN VRAI GPU

Max, iPhone 18 Pro, v286 : « les graphismes ne sont pas terribles, là où tu
pourrais certainement utiliser des graphismes à haute fidélité **pour voir le
sol** ». Le paysage lointain (`horizon.js`) échantillonne `terrainHeight` tous les
`PAS_HORIZON = 8` blocs : de haut, le sol est une nappe à mailles de huit blocs.
L'étendue « Loin » le pousse plus loin (848 blocs au lieu de 634) mais pas plus
FIN.

Ce qu'on sait, et ce qu'on ne sait pas :

- Passer le pas de 8 à 4 **quadruple** le nombre de colonnes (25 921 → ~103 000)
  et donc le coût de `terrainHeight`, qui vaut 120 ms pour la nappe entière —
  soit ~480 ms, sur le FIL PRINCIPAL. Ce chiffre-là se transpose : c'est du
  calcul, pas du remplissage.
- Ce qui NE se transpose pas, et qui est la raison pour laquelle la v237 n'a rien
  conclu : le coût de RENDU. Elle a mesuré « ce n'est pas des triangles, c'est de
  la surface » **en rendu logiciel** (SwiftShader paie le remplissage au
  processeur). Sur un vrai GPU une nappe de 100 000 triangles n'est rien.
- Donc la question ouverte est unique et précise : **peut-on calculer la nappe
  fine ailleurs que sur le fil principal ?** Le worker de maillage a déjà le
  monde jumeau et `terrainHeight` est pure — c'est la même recette que la v251.
  Sans cela, un pas de 4 rendrait un à-coup de un demi-seconde à chaque
  défilement de nappe, ce qui est précisément la panne que la v286 vient de
  corriger ailleurs.

Étapes : (1) chronométrer `terrainHeight` sur la nappe, pas par pas, à 8 · 6 · 4 ;
(2) capture au sol et en vol à chaque pas, pour savoir si Max voit la différence
— si le pas de 6 suffit, le coût est ×1,8 et non ×4 ; (3) si le coût mord,
déplacer la nappe dans le worker. Ne PAS mettre `PAS_HORIZON` dans la table du
palier avant (1) et (2) : un champ dont on ignore le prix est un réglage de
banc.

## LES CINQ ROUGES DU PORTAIL DE LA v291 — double mesure complète, aucun causé par la livraison

Le diff de la v291 ne touche que `CLAUDE.md`, `TASKS.md`, `tests/manhattan.js` et
une sonde isolée : **aucun octet de `src/`, du banc, de `sw.js` ni
d'`index.html`**. `monte.js` ne peut donc pas le lire — son empreinte ne contient
pas `tests/manhattan.js` — et c'est une preuve par CONSTRUCTION, plus forte qu'un
rejeu, qui n'échantillonne. La mesure a quand même été faite, parce que la v195
demande la mesure et non le raisonnement.

**`manhattan.js`, rejouée SEULE sur `origin/main` (2ac9d37) contre la branche :**

| rouge | `origin/main`, seul | branche |
| --- | --- | --- |
| le trou enlève la géométrie visible de la façade | ❌ **22 326** → 51 734 | ❌ **11 684** → 51 734 |
| le taxi roule avec les contrôles tactiles | ❌ (le témoin tourne) | ❌ bouton jamais visible, 15 010 ms |
| fenêtres et éclairage public la nuit | ❌ | ✅ **5 615 ms** (corrigé ici) |
| les ombres suivent le soleil et la lune | ❌ **`[1, −1]`** | ✅ `[1, 0,9999…]` (corrigé ici) |
| les deux clients sans erreur (`PeerJS`) | ❌ | ✅ |

Les deux premiers sont rouges des DEUX côtés. Les deux suivants sont ce que cette
livraison corrige, et `[1, −1]` est exactement ce que la sonde avait mesuré. Le
dernier est vert sur la branche — la suite l'atteint enfin, parce qu'elle ne meurt
plus au taxi (5 min 51 au lieu de 1 min 58).

**`monte.js`, rejouée SEULE sur `origin/main` (147 témoins, 2 défauts) contre deux
portails de branche :**

| rouge | `origin/main`, seul | branche, portail 1 | branche, portail 2 |
| --- | --- | --- | --- |
| les voitures ne se traversent plus | ❌ 50 · taux 23,1 | ❌ 46 | ❌ 78 · taux 40,2 |
| l'écran ne se fige pas en arrivant sur une ville | ❌ **3 517 ms** · 41,4 % | ❌ 2 950 · 36,9 % | ❌ 2 100 · 35,9 % |
| les passants ne sont plus plantés au milieu de la chaussée | ✅ | ✅ 6 % | ❌ **28 %** |

Sur les deux premiers, `origin/main` est PIRE que la branche : ce sont les dettes
déjà déclarées (le tirage de la v277 et la famille de l'arrivée en ville).

- [ ] **ET LE TÉMOIN DES PASSANTS SUR LA CHAUSSÉE EST UN TIRAGE, PAS UN GARDIEN —
  personne ne l'avait encore déclaré (v291).** Vert sur `origin/main`, vert au
  portail 1, ROUGE à 28 % au portail 2, sur un code de jeu identique aux trois
  passages. Il mesure la part de DIX-HUIT passants qui tombent sur la chaussée à
  Rome, et `posteAutour` les place par un TIRAGE (« une douzaine de points et
  l'on garde le premier dont le bloc de surface est de la chaussée », v279) :
  6 %, 28 %, et vert. C'est la même maladie que « les voitures ne se traversent
  plus » (v277) — une fraction sur un petit échantillon tiré au sort, avec une
  barre qui tombe DANS son étendue naturelle. Ce qui reste à faire : relever sa
  distribution sur cinq à dix passages d'un même côté AVANT de toucher à sa
  barre, et si l'étendue recouvre la barre, le libeller sur une grandeur que le
  tirage ne décide pas — la part sur la chaussée mesurée sur la VILLE entière
  (v274), pas sur dix-huit places.

## LES TROIS ROUGES DU PORTAIL DE LA v290 — mesurés, aucun causé par la livraison

Portail joué deux fois sur la branche, `maj.js` rejouée seule deux fois sur
`origin/main` dans un arbre détaché. Quatre suites vertes à chaque passage
(`fumee`+`parishd`, `carte`, `washington`, `reglages`) ; trois rouges, et voici
ce que chacun vaut.

**1. « pendant l'installation, le loader dit combien de fichiers sont rangés »
(`maj.js`) — INTERMITTENT, même distribution des deux côtés.** C'est la preuve
que la v269 exige, et elle est complète :

| passage | côté | verdict |
| --- | --- | --- |
| `maj.js` seule, 1 | `origin/main` | ❌ |
| `maj.js` seule, 2 | `origin/main` | ✅ |
| portail 1 | branche | ✅ |
| portail 2 | branche | ❌ |

Un rouge et un vert de CHAQUE côté : la livraison n'y est pour rien. Ce qu'il
lit est une suite de textes de loader pendant une installation qui prend moins
d'une seconde au banc — il attrape « Chargement du monde… » au lieu des
« 📦 Mise à jour du jeu… n / 97 fichiers ». **La piste est un échantillonnage
trop lent pour la fenêtre qu'il observe**, la famille de la v274 (« une fenêtre
de mesure se pose sur la grandeur mesurée ») ; à reprendre en attendant le
RÉSULTAT — un texte de progression vu — borné, au lieu d'échantillonner.

**2. « l'écran ne se fige pas en arrivant sur une ville » (`monte.js`) — dette
déjà déclarée, et la couche HD de la v287 l'a alourdie.** Relevés : v284
4 250 ms / 42,4 % · v286 4 917 / 38,6 · portail 1 ici 3 600 / 38,1 · portail 2
3 967 / 41,7. La même famille, sur un code d'arrivée en ville que cette
livraison ne touche pas. Ce qui a changé sous elle, c'est que Paris porte
désormais une seconde passe de mailleur (facadeshd.js, v287-v289) : la mesure à
refaire est celle de `?hd=0` contre `?hd=3` à l'arrivée, sur la branche de la
couche HD, pas ici.

**3. `manhattan.js` — trois à quatre rouges, la famille des 0,4 image par
seconde.** « le trou enlève aussi la géométrie visible de la façade »
(11 684 → 51 734), « fenêtres et éclairage public fonctionnent la nuit », « les
ombres suivent le soleil et la lune visibles », « le taxi roule avec les
contrôles tactiles ». La v259 a mesuré que **Manhattan tourne à 0,4 image par
seconde sur ce banc, sur l'ancien code comme sur le neuf**, et que les témoins
qui lisent un effet « 350 ms après » y sont un pile ou face.

> **CORRECTION (v291) — LA DETTE CI-DESSUS NOMMAIT UN DÉFAUT QUE LE CODE NE
> POUVAIT PAS AVOIR.** J'avais écrit que le rouge des ombres était
> « `1.0000000000000002 > 1`, un défaut d'épsilon, à corriger d'une ligne, qui
> ne dépend d'aucune cadence ». Le témoin compare à **0,9999** : cette valeur-là
> PASSE. Les trois affirmations étaient fausses, et la dernière — « il ne dépend
> d'aucune cadence » — est exactement l'inverse de la vérité. Mesuré à la sonde
> (`sonde-ombres-ny.cjs`), trois fois à l'identique : à `h = 0,73` l'alignement
> vaut **−1**, la lune est **sous l'horizon** (`visible: false`, opacité 0) et la
> direction de la lampe est **identique aux deux heures** — `__setDayTime` n'avait
> pas encore pris effet. En attendant le FAIT (le soleil du bon côté de
> l'horizon) au lieu de dormir 100 ms : le ciel met **755 à 1 947 ms** à tourner,
> et l'alignement vaut 1 aux deux heures, six fois sur six. Même cause pour le
> témoin voisin (« fenêtres et éclairage public la nuit », qui dormait 350 ms) :
> **un seul défaut, deux rouges.** Les deux témoins attendent désormais la
> situation, bornés, la durée dans le message. **Une explication qu'on n'a pas
> mesurée est une dette, pas un diagnostic (v220) — et une dette qu'on DÉCLARE
> sans l'avoir mesurée est pire, parce qu'elle sera lue comme un fait.**
>
> **ET LE ROUGE DU TROU SE DÉMONTE PAR SON PREMIER NOMBRE (v291).** Il est rouge
> des deux côtés, mais il rend **22 326 → 51 734 sur `origin/main`** et
> **11 684 → 51 734 sur la branche** : le second nombre est le même, le premier
> varie du DOUBLE. Il somme la géométrie de TOUS les immeubles de
> `villeRealiste.buildings`, donc il confond « le trou en a retiré » avec
> « d'autres immeubles sont arrivés pendant l'attente » — et ce que la file a eu
> le temps d'installer dépend de la cadence. **Ce qu'il faut mesurer est la
> géométrie de l'immeuble QUI A PERDU un bloc**, avant et après, et non un total.
> Reste à faire : trouver la clé de `buildings` qui porte la colonne visée
> (`hit`), puis comparer `userData.instances` de CELUI-LÀ. Tant que c'est un
> total, ce témoin n'est pas un gardien.
>
> **ET LE PLANTAGE DU TAXI N'EST PAS LE MIEN — j'ai écrit le contraire avant de
> lire ce fichier.** `manhattan.js` rejouée SEULE sur `origin/main` va jusqu'au
> bout (30 témoins, 5 rouges) ; sur la branche elle meurt à la ligne 450,
> `waitFor({ state: 'visible' })` sur `#ride-btn` qui annonce « 🐴 Monter » puis
> se cache. J'en ai conclu que mes deux attentes de ciel (sept secondes de jeu de
> plus, donc cinq bêtes de plus) l'avaient causé. **La déclaration de la v279,
> plus haut dans ce même fichier, dit que ce plantage s'est produit SUR
> `origin/main`** — « la suite meurt là (`#ride-btn` caché, ligne 416) ». C'est
> donc une intermittence vue des deux côtés, et un passage de chaque côté ne la
> juge pas (v269).
>
> **ET LA SONDE ÉCARTE LE JEU (`sonde-taxi-ny.cjs`, v291).** Sur une page NEUVE,
> même placement, mêmes gestes : le sol est plat à 32 sous l'enfant ET sous la
> voiture (pas un toit — mon hypothèse `sommetColonne`/v282 est fausse), le
> bouton est **visible dès le premier relevé** (`inline-block`, puis `block`), la
> bête est bien là (`betes: 1`), le maillage de la voiture reste à (0, 0, 0)
> pendant **quatre secondes** — le modèle de la flotte se charge de façon
> asynchrone — puis se pose à y = 33, et le libellé passe de « 🐴 Monter » à
> « 🚗 Monter » à la **neuvième** seconde. Le portail, lui, rend
> `{"bouton":"🐴 Monter","affiche":"none","betes":1}` pendant 15 010 ms.
>
> **Le jeu offre donc l'embarquement ; c'est la SUITE qui ne l'obtient pas.** Ce
> qui reste à faire, et dans cet ordre : (1) l'A/B se fait DANS la suite (v277 —
> une sonde sur page neuve ne reproduit pas les conditions et ne BLANCHIT rien) ;
> (2) relever, juste avant ce témoin, ce que les vingt témoins d'avant ont laissé
> — `player.gabarit`, `montureConduite()`, les classes du `body`
> (`en-vehicule` cache ce bouton depuis la v262), la cadence ; (3) seulement
> ensuite, rejouer trois fois de chaque côté pour la fréquence du plantage.
>
> **Le remède livré tient sans cette cause, et c'est pourquoi il reste** : le
> témoin fait le vide avant d'invoquer (idiome v284, jamais appliqué à ce
> bouton-ci) et REND un verdict au lieu de lever son délai. Deux portails, la
> v279 et la v291, ont perdu les neuf derniers témoins de cette suite sur cette
> seule ligne.

**Aucun de ces rouges ne touche `src/palier.js`, `src/main.js` (chemin du
palier), `index.html` ni les dix témoins de la livraison**, qui sont verts sur la
branche et rouges sur le code de production, mesurés.

## LE PALIER « BAS » DE LA v284 EST LE SEUL QUE RIEN N'A MESURÉ

Ses chiffres — `rr: 8`, `file: 6` — sont RAISONNÉS, pas relevés. La v269 a mesuré
la file à 4, 8, 12 et 16 sur l'iPad de quatre ans (8 est le confort : 66 blocs de
trou, 0 % d'images au-delà de 300 ms ; 4 en donne 36 et 1,3 %), jamais 6 — et
aucun appareil de la famille n'est plus lent que celui-là, donc il n'y avait rien
sur quoi mesurer.

**Le risque nommé** : à `file: 6` et `rr: 8`, le trou devant soi devrait tomber
vers cinquante blocs par interpolation, pour une barre de témoin à `max / 2` =
47,5 (jets à 95). Deux blocs et demi de marge — exactement le cas que la v269
refusait à 130 blocs par seconde (« il ne resterait que trois blocs de marge et
le témoin battrait »). Le banc ne le verra jamais : il ne range aucun palier
(`seRange` faux, sa configuration est forcée), donc `monte.js` tourne toujours à
`file: 8`.

**À faire quand une tablette y tombera** : `?palier=bas&diag=1` sur l'appareil,
relever le trou devant soi et la part d'images au-delà de 300 ms, et remonter la
file à 8 si le trou passe sous la barre. Le palier ne s'applique qu'à un appareil
que la mesure a trouvé en peine, où le réglage d'aujourd'hui est de toute façon
pire — c'est ce qui rend l'inconnue acceptable, pas le fait de l'ignorer.

---

## LE PORTAIL DES RAILS (v281) : SEPT SUITES ROUGES, ET CE QU'ELLES SONT

Huit suites vertes, sept rouges, `reseau.js` VERTE cette fois — elle en avait
six au portail des pistes. Elle change de rouges d'un passage à l'autre, et
c'est une raison de plus de rejouer seul des deux côtés plutôt que de comparer
deux portails.

| suite | rouge | ce que c'est |
| --- | --- | --- |
| `carteMonde.js` | 1 — les dix-huit gares | **À MOI**, corrigé : le témoin écrivait ses cotes. 18/18 après, vert seul |
| `carte.js` | 💥 en ouvrant sa 4e page | **cause mesurée et corrigée** : la page laissée ouverte. ×3 plus vite |
| `sauvegarde.js` | 2 — la copie d'avant le monde ×2, sur le NUAGE | vert seul des DEUX côtés → charge de portail |
| `maj.js` | 1 — fond de carte pas prêt à la libération | dette déclarée de la v276 |
| `washington.js` | 3 — le métro (une seule cause) | rouge de CHARGE déjà déclaré : vert DEUX FOIS rejoué seul, « 18 m en 6 s de jeu » |
| `manhattan.js` | 💥 délai ligne 282 | intermittence mesurée trois fois sur `origin/main` (v269) |
| `monte.js` | 3 (contre 10 sur main) | les sept fermés le sont par la v279. Voir plus bas |

**ET `washington.js` PASSE DE CINQ ROUGES À TROIS** : ma correction du témoin de
l'escalier (il constate l'avance, pas la descente) en a fermé deux. Les trois
qui restent sont UNE seule cause — aucune rame à portée d'embarquement — et le
champ `texte` du témoin ne peut PAS la distinguer de « rien à portée » :
`majBoutonBord` écrit `${v ? v.emoji : '🚇'} Monter à bord`, et l'emoji par
défaut d'un convoi de métro EST 🚇. Le texte est donc le même dans les deux cas.
Ce qui tranche est `display`, posé à `none` seulement quand rien n'est là.
J'ai d'abord lu ce message à l'envers — « le texte nomme le métro, donc la rame
est venue » — et c'est « compter un motif n'est pas compter la chose » (v224),
appliqué au champ de message d'un témoin.

**LES TROIS QUI RESTENT DE `monte.js`.**

- « les voitures ne se traversent plus » — 95 sur 224 paires (42,4 %). C'est le
  TIRAGE déclaré en v277 : il varie de 0 à 53 sans qu'une ligne du jeu ait
  bougé, et sa barre (45) tombe DANS son étendue. Mais **95 est presque le
  double du pire jamais relevé**, et cela vaut d'être noté : c'est exactement la
  panne que la correction du télescopage vise, avec un témoin qui mesure une
  BORNE garantie par la géométrie au lieu d'un compte d'instants.
- « l'écran ne se fige pas en arrivant sur une ville » — 40 % du temps au-delà
  de 300 ms ici contre 43,1 % en référence : la même grandeur stable. La pire
  image (6 083 contre 4 633) est par construction la statistique la moins
  fiable (v276).
- « une voiture arrêtée par un mur n'annonce plus de vitesse » — 12,16 contre le
  mur, **identique au bit près** à la référence.

## v282 — ce que la passe de tissu et de fleuves laisse ouvert

- **San Jose n'a aucun anneau de circulation, et ce n'est pas l'eau.** Mesuré :
  252 candidats sur 357 sortent de son disque, sa trame de 27×21 étant trop
  grossière pour un rayon de 47 ; le meilleur candidat restant est mouillé sur
  onze points de quarante. C'était déjà vrai avant cette livraison. C'est une
  dette de TISSU — lui donner une trame plus fine, ou un rayon à sa taille — et
  elle est NOMMÉE dans le témoin (`DETTE_SANS_ANNEAU`) pour qu'aucune autre ville
  ne la rejoigne en silence.
- **`tracesCirculation` passe de 199 à 283 ms au démarrage**, derrière le bouton
  grisé (v258, borné à 45 s). Le poste est le parcours au bloc des côtés mouillés.
  Non urgent, mesuré, déclaré.
- **Le mailleur paie une fois par ville le choix de ses anneaux** — 16,4 ms au
  pire (Seattle), contre 24 ms pour un morceau de ville. À remesurer si le nombre
  de candidats augmente.
- **Les six villes bâties à la main n'ont pas reçu les tissus.** Paris, Londres,
  Nice, Lille, Washington, San Francisco ont leur plan relevé sur de vrais plans :
  le tissu ne leur apporterait rien. Mais le cœur d'îlot, lui, leur manque —
  elles sont bâties d'un bord à l'autre de leurs lots. Passe à part.
- **Les ponts des villes engendrées n'ont ni garde-corps ajouré ni arche.** Le
  tablier est plein, les parapets sont deux bandes de pierre, les piles des
  colonnes tous les sept blocs. Ça se reconnaît comme un pont ; ça ne ressemble
  pas encore au Mittlere Brücke. À juger en capture avec Max.

---

## LE PORTAIL DE LA v283 : NEUF ROUGES, ET CE QUE LA DOUBLE MESURE EN DIT

Quinze suites, soixante-quinze minutes, **quatre suites qui étaient rouges aux
portails précédents sont vertes** — `washington.js` (la rame du métro emmène
enfin l'enfant), `carte.js`, `carteMonde.js` et `realisme.js`, qui prouve la
correction de la façade (rouge sur le code de production : neuf trajectoires sur
seize au-dessus de 2,5 blocs, la plus haute à **7,03 blocs**).

### Rejoués SEULS sur `origin/main` (v282), dans un arbre séparé

| témoin | branche (portail v283) | `main` (seule) |
| --- | --- | --- |
| `reglages.js` — la langue que l'autre tablette défait | ❌ 20 s, serveur `"fr"` | ❌ **20 s, serveur `"fr"`** |
| `reglages.js` — « elle s'aligne même dessus » | ✅ | ❌ **45 s, `fr`** |
| `monte.js` — l'écran ne se fige pas en arrivant sur une ville | ❌ pire image **4 917 ms**, 34,8 % > 300 ms, cadence 4,3 | ❌ pire image **4 616 ms**, 34,3 %, cadence 4,3 |

Le premier est identique au bit près. Le second est rouge sur `main` et VERT sur
la branche : `main` en a un de PLUS, et les deux sont de la même famille — la
langue que le parent règle et que la seconde tablette repousse. Le troisième est
le plus intéressant pour la famille : **une image de quatre secondes et demie, un
tiers du temps au-delà de trois cents millisecondes**, à l'arrivée dans une
ville. C'est mot pour mot ce que Max décrit depuis des versions, et ce n'est pas
une intermittence — quatre portails et une mesure solo, tous entre 4 333 et
6 083 ms.

### Un TIRAGE, et sa cause est maintenant MESURÉE

`monte.js` — « les voitures ne se traversent plus ». La v277 avait écrit que ce
témoin varie sans qu'une ligne du jeu bouge et que sa barre tombe dans son
étendue naturelle, en laissant la cause « plausible et NON mesurée ». Elle l'est :

| passage | code | taux |
| --- | --- | --- |
| portail v282b | v282 | **3,6 %** ✅ |
| **`main`, seule** | **v282** | **41,4 %** ❌ |
| portail villes | villes | 27,7 % ✅ |
| portail rails | rails | 42,4 % ❌ |
| portail v283 | v283 | 13,9 % ✅ |

**Le même code — v282 — rend 3,6 % dans un portail et 41,4 % tout seul.** Onze
fois, et dans le sens contraire à l'intuition. Le compte est absolu sur une
fenêtre de MONTRE : plus le jeu tourne vite, plus de temps de JEU passe, plus les
voitures roulent, plus elles ont d'occasions de se croiser — `maxVues` 21 → 26,
`paires` 151 → 227, et le taux triple par-dessus. **Le remède est de compter par
temps de JEU, ou de compter une PROPORTION à distance constante**, pas un total
sur trente secondes de montre.

Et il ne dit RIEN de la correction du télescopage de la v283 : ce qui la prouve,
c'est son propre témoin, `minTrace: 4.4` sur **2 778 paires** — un minimum que la
géométrie garantit, qui ne dépend d'aucune cadence, et dont le champ n'existe pas
sur l'ancien code.

### Un rouge de CHARGE, et le témoin à reprendre

`monte.js` — « une voiture arrêtée par un mur n'annonce plus de vitesse ». Vert
sur `main` seule (`vitesse 0`, `x 28.9`), rouge au portail de la v283
(`vitesse 12.16`, `x 27.1`, `immobile 0`, **`arret 25104`**) — et rouge aussi aux
portails des villes et des rails, qui ne portent PAS la correction de convoi de
la v283. Cinq configurations, trois rouges, deux verts, des deux côtés du
changement : une intermittence de charge, pas une régression (v269, v251).

**Et le témoin confond deux choses.** `arret 25104` dit qu'il a attendu ses
vingt-cinq secondes ; `immobile 0` ne distingue pas « la voiture ne s'arrête
jamais » de « elle n'a jamais ATTEINT le mur » — à trois images par seconde,
c'est le second. Il doit d'abord vérifier qu'elle est arrivée, PUIS mesurer
qu'elle s'arrête : `null` n'est pas un verdict, c'est une absence de mesure
(v272).

### Anciens, par inspection et par historique

- `sauvegarde.js` ×2 (la copie d'avant le monde) — rouges au portail des rails
  aussi ; la v283 ne touche ni `sync.js` ni `cloud.js`.
- `maj.js` (le fond de carte à la libération) — rouge sur **cinq** portails
  d'affilée, avec la même forme.
- `manhattan.js` (le délai de la ligne 282) — déjà démonté 3/3 des deux côtés.
- `reseau.js` ×2 — la double mesure est faite, voir juste en dessous. Et **deux
  des quatre rouges de production ont disparu** : « Alice retrouve son monde
  après une veille sans retour » est VERTE, ainsi que « la reprise tient dans la
  durée » et « seule après le départ de l'hôte ». Ce qui reste n'est plus
  « Alice perd son monde » mais **deux compteurs de joueurs qui divergent** au
  départ de quelqu'un et au réveil.

---

## DEUX ROUGES RÉSEAU DE PLUS, IDENTIQUES AU BIT PRÈS SUR `origin/main`

Trouvés au portail des pistes, et c'est la référence qui les a rendus visibles :
ils n'étaient PAS dans la liste des vingt, parce que le portail de `main` avait
rendu ces deux témoins-là verts et quatre AUTRES rouges. **`reseau.js` change de
rouges d'un passage à l'autre** — raison de plus de rejouer seul des deux côtés
plutôt que de comparer deux portails.

Rejoués SEULS, dans deux arbres séparés :

```
branche  ❌ [ 42 s] un départ propre nettoie tout le monde — hôte ["Alice","Nina"] · Alice ["Marlon","Nina"]
main     ❌ [ 42 s] un départ propre nettoie tout le monde — hôte ["Alice","Nina"] · Alice ["Marlon","Nina"]

branche  ❌ [ 26 s] un joueur endormi n'est pas éjecté — compteur 3, [Alice dodo, Nina éveillée]
main     ❌ [ 26 s] un joueur endormi n'est pas éjecté — compteur 3, [Alice dodo, Nina éveillée]
```

Mêmes durées, mêmes listes, même ordre. **Ce que ça coûte à la famille est
clair : Nina quitte la partie et reste dans la liste des deux autres.** Quand
trois enfants jouent et que l'un s'en va, les deux qui restent voient un fantôme.

C'est la famille de la v219 (« ce qui s'arrête s'annonce, cela ne s'attend pas
d'un événement de transport ») et de la v266 (« le silence ne prouve le départ
que d'un pair qu'on ne peut pas sonder »). Les deux ont corrigé un bout de ce
chemin ; celui-ci reste, et le SCÉNARIO À TROIS est ce qui les réunit — les deux
rouges impliquent un troisième joueur. À démonter par une sonde PAR QUESTION,
comme la v266 : le message de départ part-il ? arrive-t-il ? est-il lu ?

**ET DEUX AUTRES ROUGES HORS RÉFÉRENCE SE SONT DÉMONTÉS, dont une hypothèse de
moi qui était fausse.** `reglages.js` (« l'autre tablette ne le défait pas »,
« elle s'aligne même dessus ») est **VERTE des deux côtés rejouée seule**, aux
mêmes valeurs — la charge du banc, la fragilité que ce témoin documente
lui-même. Et l'explication que j'avais avancée pour elle — « les pistes
allongées alourdissent la génération du monde, donc ralentissent les pages » —
est **fausse, et mesurée** : un morceau de monde coûte **4,36 ms des deux côtés**
autour de Paris, au centième près. Une explication commode qu'on ne mesure pas
est une dette, pas un diagnostic (v220), et c'était la troisième fois de la
journée.

## UN CONVOI SE TÉLESCOPE : la panne que Max signale depuis la v244, mesurée

**Max l'a dite deux fois** — « évite que les voitures puissent se chevaucher »
(v244), puis « les voitures passent les unes sur les autres » (v245). Les deux
livraisons ont corrigé quelque chose de réel et laissé ceci, qui est la cause
principale, et qu'aucun témoin ne pouvait voir parce que le témoin comptait la
mauvaise grandeur.

**LA MESURE.** Sonde à part, une seule page, un seul code, quatre fenêtres de
trente secondes en ordre alterné (200 / 800 / 200 / 800 ms d'échantillonnage) au
centre de Paris :

| passage | pas | taux | enfoncement médian | pire | > 0,8 bloc | même sens |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 200 ms | 10,2 % | **0,11** | 0,96 | 2 / 32 | 15 |
| 2 | 800 ms | 43,9 % | **1,90** | 2,26 | 68 / 82 | 71 |
| 3 | 200 ms | 44,9 % | **1,15** | 2,26 | 295 / 408 | 326 |
| 4 | 800 ms | 34,9 % | **2,25** | 2,26 | 44 / 58 | 44 |

Deux choses s'y lisent, et la seconde est la panne.

**D'ABORD, LE TÉMOIN NE MESURE RIEN.** « Les voitures ne se traversent plus »
rend un COMPTE d'instants de chevauchement. Au pas identique (passages 1 et 3),
il va de 10,2 à 44,9 % ; en tout, sur un seul code, de 0,9 à 50,6 % — et les cinq
valeurs relevées sur les deux arbres (`main` 0,9 · 21,4 ; branche 32 · 39,5 ·
48,5) tombent dedans. **Ce n'était jamais l'arbre, c'était la DURÉE de la
session** : `main` était mesuré tôt, la branche après cent quarante autres
témoins. Sa barre ne peut rien séparer. Il se reformule (voir plus bas).

**ENSUITE, 2,26 BLOC EST LA LARGEUR EXACTE D'UNE VOITURE.** Un enfoncement de
2,26 veut dire que les deux rectangles se recouvrent ENTIÈREMENT dans leur petite
dimension : deux voitures au même point, empilées. Le médian passe de 0,11 (des
frôlements, le bruit de fond d'un pas discret) à 2,25 : à la fin de la session,
la moitié des chevauchements sont des superpositions complètes, et 326 sur 408
sont dans le MÊME SENS.

**LE MÉCANISME, lu dans `vehicules.js`.** `dElement(i) = distance − i × ecart −
retard[i]`, et `retard[i]` grandit tant que `attend[i]` est vrai. Or `attend[i]`
est posé par `cederLePassage` — un piéton, un feu, un autre convoi — et **rien ne
dit à une voiture d'attendre celle qui la précède dans son propre convoi**. Quand
la voiture de tête attend, sa suiveuse continue d'avancer, la rattrape et lui
passe au travers ; il suffit que `retard[i−1] − retard[i]` atteigne `ecart`. Et
cela s'ACCUMULE, parce que le retard ne se rembourse qu'à moitié vitesse
(`pas × 0,5`) : c'est un état absorbant, la forme exacte des poissons de la v233
et du flâneur de la v279 — entrée banale, pas de sortie.

**LE REMÈDE, à mesurer avant de l'écrire.** Borner le retard d'une suiveuse par
celui de celle qu'elle suit : garder `dElement(i−1) − dElement(i) ≥ mini`, donc
`retard[i] ≥ retard[i−1] − ecart + mini`, avec `mini` la longueur d'une voiture
plus une marge. Cela se pose là où le retard se met à jour, en une ligne — mais
`mini` se MESURE, et l'effet sur la fluidité du convoi aussi (une file qui
attend derrière sa tête ne doit pas s'arrêter tout entière pour toujours).

**ET LE TÉMOIN SE REFORMULE SUR LA PROFONDEUR, PAS SUR UN COMPTE.** Un compte
d'instants près d'un seuil qui vit à un dixième de bloc bascule au moindre
souffle ; une PROFONDEUR est bornée par la géométrie, et les deux régimes sont
séparés par deux ordres de grandeur — 0,1 bloc pour un frôlement, 2,26 pour une
superposition. Le verdict devient « aucune paire ne s'enfonce de plus de X bloc »,
et X se relève sur du code CORRIGÉ, pas sur celui-ci. La sonde est dans le
brouillon (`cadence-chevauchements.cjs`) et calcule déjà l'enfoncement par le
théorème des axes séparateurs.

**Et la v279 n'y est pour rien** : son diff ne touche pas une ligne de
`vehicules.js` (`src/montures.js`, `src/nouveautes.js`, `src/vie.js` seulement).
Le mécanisme date de la v244. C'est ce qui autorise sa fusion, et c'est une preuve
plus forte que « rouge identique sur `origin/main` » : l'instrument est démontré
incapable de séparer quoi que ce soit.

## VINGT ROUGES MESURÉS SUR `origin/main`, DONC EN PRODUCTION

Portail COMPLET rejoué sur `origin/main` (710ab76), quinze suites, 78 minutes.
**Aucun de ces vingt défauts ne vient d'une branche en cours** : ils sont dans le
jeu que la famille utilise. C'est la double mesure que la v195 exige, et c'est
aussi la référence contre laquelle diffèrent désormais tous les portails de
branche — un rouge qui est dans cette liste n'est pas le vôtre.

| suite | rouges | ce qu'ils touchent |
| --- | --- | --- |
| `monte.js` | 10 | la conduite, l'arrivée en ville, les flammes de réacteur |
| `washington.js` | 5 | le témoin de l'escalier, pas le métro — voir plus bas |
| `reseau.js` | 4 + 2 | **Alice ne retrouve pas son monde**, **un joueur qui part reste visible**, **un endormi n'est pas éjecté** |
| `maj.js` | 1 | le fond de carte n'est pas prêt quand « Jouer » se libère |
| les onze autres | — | vertes |

**ET DEUX DE CES QUATRE FAMILLES TOUCHENT CE QUE LES ENFANTS FONT VRAIMENT.**

- **~~LE MÉTRO DE WASHINGTON EST INACCESSIBLE~~ — NON, ET C'EST MOI QUI AVAIS
  TORT.** J'ai écrit et dit à Max que les cinq rouges de `washington.js`
  signifiaient qu'on ne peut plus prendre le métro. **C'est faux.** Une sonde
  pure — sans navigateur, en lisant les blocs le long du couloir — rend vingt et
  un pas praticables de y=34 à y=20, aucune marche de plus d'un bloc, deux blocs
  d'air d'un bout à l'autre, le quai à 19. L'escalier est sain, et les quatre
  rouges suivants sont la cascade d'un enfant qui n'est jamais descendu.

  **Le défaut est dans le TÉMOIN, et la sonde l'a nommé** : les six premiers
  blocs depuis la bouche sont PLATS, par construction (la bouche est à
  `longueur` du centre, `DEMI_VOUTE` vaut sept). Or le témoin abandonnait après
  « trois pas sans DESCENDRE », et un pas vaut le quart d'un bloc sur ce banc
  (v238) : il se déclenchait avant la première marche, quoi que fasse le jeu.
  Corrigé — on constate « ne plus AVANCER », comme le témoin des portes quinze
  lignes plus haut, ce qui était déjà la leçon citée et appliquée à la mauvaise
  grandeur. **Un mur arrête le déplacement ; un palier n'arrête que la
  descente.**

  Et la leçon de méthode, qui vaut plus que la correction : **j'ai annoncé une
  panne de production sur la foi d'un témoin, sans mesurer la chose elle-même.**
  Le dépôt écrit depuis longtemps « avant d'accuser un message, on vérifie qu'il
  est atteint » et « une explication qu'on n'a pas mesurée est une dette, pas un
  diagnostic » ; ici c'était un VERDICT qu'il fallait vérifier, et la sonde qui
  le fait coûtait dix minutes. Ce qui reste à mesurer, honnêtement : si un enfant
  réel, avec sa boîte de collision et la physique, descend bien ces vingt et un
  pas. La sonde juge un marcheur idéal.
- **ALICE NE RETROUVE PAS SON MONDE.** Quatre rouges de `reseau.js` :
  « Alice retrouve son monde après une veille sans retour — compteur 0 [] », « la
  reprise tient dans la durée — hôte 2 · Alice 0 », « seule après le départ de
  l'hôte, et le compteur le dit — compteur 0, avatars [] », « et le jeu continue
  d'essayer de la reconnecter — null ». C'est le chemin de reprise du jeu à
  plusieurs, celui qui compte quand deux enfants jouent ensemble et qu'un iPad
  s'endort. Le code réseau porte déjà la leçon de la v266 (« le silence ne prouve
  le départ que d'un pair qu'on ne peut pas sonder ») : c'est là qu'il faut
  regarder, avec une sonde par question comme cette version-là l'a fait.

**Les onze autres sont ci-dessous, par famille.**

## Les dix rouges de `monte.js`, en détail

Portail de référence rejoué seul sur `origin/main` (710ab76), `monte.js` en
20 min 40 s. **Ces dix-là ne viennent d'aucune branche en cours** : ils sont dans
le jeu que la famille utilise. Trois familles, et la troisième est une vraie
régression de fonctionnalité.

**1. La carrure de la voiture, et le piéton — ce que la v279 corrige.**

- « au volant, on s'arrête plus loin du mur qu'à pied » — à pied **8,95** blocs
  du mur contre 1,1 au volant : le témoin butait sur la CIRCULATION, pas sur le
  mur. C'est `contreLeMur` (v279), déjà corrigé sur la branche.
- « une fois descendu, on repasse partout où un piéton passe » — 0,3 contre 8,95,
  même cause.
- « la voiture de l'enfant freine devant un piéton » — `voituresRue: 0`,
  `ecartes: 164`, `traverses: 0`, avance 5,3 : la situation n'a pas eu lieu.

**2. Deux défauts de performance et de physique, à démonter.**

- « l'écran ne se fige pas en arrivant sur une ville » — **pire image 4 633 ms**,
  43,1 % du temps au-delà de 300 ms, cadence 3,8. La branche v279 rend 4 233 ms
  et 46,5 % : la même chose, aux deux bouts. C'est l'arrivée en ville sur un
  rendu logiciel, et ça ne se transpose pas à l'iPad — mais **personne ne l'a
  mesuré sur la tablette** (`?diag=1`), et c'est ce qu'il faut faire.
- « une voiture arrêtée par un mur n'annonce plus de vitesse » — **12,16 contre
  le mur**, reculé 0,55. C'est la correction de la v272 (« on ne borne que ce qui
  est bloqué ») qui ne mord pas dans ce cas-là : le nez contre le mur, la voiture
  garde sa consigne. À reprendre avec la sonde de la v272, pas à l'intuition.

**3. LES FLAMMES DE RÉACTEUR NE SORTENT PLUS — régression de la v264.**

C'était une demande de Max en propre : « voir les flammes sortir du réacteur
quand l'avion se déplace ». Mesuré en production, en VOL (`v: 68,4`) :
`flammes: [{visible: false, long: 0}, {visible: false, long: 0}]` — les deux
tuyères éteintes, pleins gaz comme réduits. Et `gaz: null`, ce qui est normal
depuis la v272 (la manette est un instrument d'avion, la flamme doit alors lire
la vitesse rapportée à la pointe — c'est écrit dans CLAUDE.md). La piste est donc
ce repli-là, et elle se MESURE avant de se corriger.

**4. Deux témoins d'avion qui ne montent pas dans l'avion.** « pas aux commandes
{} » pour 🛞 et pour l'atterrissage manuel, et « à pied, le cadran de cap est
caché » qui rend `affiche: true` à pied. Trois verdicts qui partagent un état :
c'est la famille de la v279 (« dans une suite, la situation de départ d'un témoin
est ce que le témoin d'avant a laissé »). À démonter par une sonde qui dit si
l'embarquement a eu lieu, pas par une hypothèse.

## En cours

### Embarquement (v366) — ce qui reste dans la zone
- [ ] **LE PORTAIL DE LA v407 (le passager suit la voiture de son ami).**
  `reseau.js` verte en entier (24 min), `degats`, `carte`, `reglages`
  verts. Sonde `sonde-passager-refait.cjs` seule : 3/3 sur la branche, 0/3
  sur `origin/main` (« annulée »). Rouges, tous de familles déjà déclarées et
  mesurées sur `origin/main` : `maj.js` « vraiment là » ; `monte.js` la
  chauffe de New York expirée (53/321), le réverbère au volant, le bout du
  monde qui se charge (trou 82 de l'avion de ligne passe, un autre appareil
  sous sa barre), le flanc frôlé (v397). PREUVE STRUCTURELLE (v291) : le code
  neuf n'est atteint que par `monterChez` / `descendreDeChez`, donc avec un
  passager ET `embarq: 1` ; aucune de ces pages ne le fait, et la seule page
  `embarq: 1` de `monte.js` est verte.
- [ ] **LE PORTAIL DE LA v400 (la descente d'avion), DOUBLE MESURE FAITE.**
  Les quatre témoins neufs verts (`monte.js`), et la sonde
  `sonde-descente-avion.cjs` seule : 4/4 sur la branche, 1/4 sur
  `origin/main` (et l'enfant DANS l'eau). Le premier portail a trouvé un vrai
  défaut (un avion retiré pendant la descente replaçait l'enfant au pied de
  l'ancien escalier : le témoin de la montée v389 rougissait), corrigé et
  rejoué seul, 7/7. Sept suites vertes, `reseau.js` comprise. Rouges, tous de
  familles déjà déclarées : `maj.js` (loader, « vraiment là »), `carte.js`
  (flèche du GPS, glisser bridé ×4), `manhattan.js` (trou de façade, taxi
  tactile), `monte.js` (le train devant la voiture, la recharge à l'arrivée,
  et le « flanc frôlé » de la v397, rouge à l'identique sur `origin/main`).
  PREUVE STRUCTURELLE en plus : le code neuf n'est atteint que sous
  `embarq: 1` en descendant d'un avion au sol ; aucune de ces pages ne le fait.
- [ ] **MONTER DANS UN TRAIN OU UN MÉTRO PAR SA PORTE — DÉCLARÉ, PAS LIVRÉ
  (session embarquement, v400 ; relu en v407, rien n'a bougé côté
  `construireRame` : POUR LA SESSION CIRCULATION-VIVANTE, l'étape (1)
  ci-dessous est le seul verrou).** `bord` (fun.js) colle encore l'enfant au
  siège d'une rame d'un coup. La même discipline que l'avion (v389) le
  ferait : l'accès se déclare avec le MODÈLE (`userData.porte` posé par
  `construireRame`, une porte coulissante en MEMBRE, aucune clé de programme
  neuve), la séquence ne joue que si le convoi est ARRÊTÉ au quai (`arrets`,
  `pause` : sinon la porte file sous l'enfant), et `embarq=0` rend l'ancien
  geste au bit près. Pourquoi ce n'est pas fait : `construireRame` et la
  pause aux quais vivent dans `vehicules.js`, zone de la session
  circulation-vivante ; la séquence, elle, est prête à suivre un modèle qui
  déclare sa porte (`monterAvion` lit `userData.porte` et un membre
  `porte.ouvrant`). Marche : (1) la session circulation ajoute le membre et
  `userData.porte` à la rame de tête et publie dans `place()` si le convoi
  est à l'arrêt ; (2) l'embarquement ajoute `monterRame` (marche sur le quai,
  la porte glisse, il entre, `bord` bascule ICI) et `descendreRame` ; (3)
  témoins dans `washington.js` (le métro) et `monte.js` (le train).
- [ ] **POUR MAX, SUR LA TABLETTE — valider la montée et la descente (v366,
  v377, v384, v389).** Le banc saute la séquence (`embarq=0`) et rend en
  logiciel : ce qui suit ne se juge QUE sur l'iPad. Ouvrir
  `https://minecraft-fam.vercel.app/?diag=1` ; la dernière ligne du
  diagnostic (v396) dit, après chaque geste, « embarquement : monter
  (voiture) en 2,1 s de jeu, jusqu'au bout » — c'est elle qu'on relève.
  1. **Monter dans une voiture.** Dans une rue de Paris, face à une voiture
     arrêtée, « Monter » (ou « 🚗 Conduire cette voiture » pour une voiture de
     la rue). On doit voir l'enfant MARCHER jusqu'à la portière gauche, la
     portière s'ouvrir vers l'extérieur, l'enfant s'asseoir, la portière se
     refermer. Diagnostic : `monter (voiture)`, environ 1,5 à 2,5 s,
     `jusqu'au bout`. La voiture ne bouge pas d'un bloc.
  2. **Le second appui.** Recommencer et rappuyer pendant la marche : on doit
     être assis tout de suite, portière fermée. Diagnostic : `second appui`.
  3. **Descendre.** « ⬇️ Descendre » : la portière gauche s'ouvre, l'enfant
     sort à côté, elle se referme. Diagnostic : `descendre (voiture) … côté
     conducteur`. Garé contre un mur côté gauche : il sort côté passager, et la
     ligne dit pourquoi (`conducteur refusé : mur`).
  4. **Avec un ami (deux tablettes, v377 et v384).** Alice près de la voiture
     de Marlon : « 🚗 Monter avec Marlon » — elle entre par la portière DROITE,
     et Marlon voit SA portière droite s'ouvrir chez lui. Puis « Descendre » :
     elle ressort par la droite. Diagnostic chez Alice : `monter (ami)` puis
     `descendre (ami)`.
     **Et si la tablette de Marlon se reconnecte pendant qu'Alice marche
     (v407)** — mettre l'application de Marlon en arrière-plan deux secondes
     puis la rouvrir juste après le « Monter avec Marlon » d'Alice : Alice
     doit s'asseoir quand même (avant : elle restait à pied à côté). Chez
     Alice : `monter (ami) … jusqu'au bout`, jamais `annulée`.
  5. **L'avion (v389).** À Roissy (carte → Paris–Charles-de-Gaulle), devant
     l'avion de ligne, « Monter » : un escalier à rampe jaune apparaît contre
     la porte avant gauche, l'enfant le gravit, la porte s'ouvre, il entre,
     elle se ferme, l'escalier disparaît. Diagnostic : `monter (avion)`,
     3 à 4,5 s. Le chasseur : une échelle et la verrière qui se lève. Le
     Concorde : on monte d'un coup, comme avant (pas de porte, c'est voulu) —
     la ligne ne change donc pas.
  6. **Descendre de l'avion (v400).** Avion arrêté au sol, « Descendre » :
     on n'est plus aux commandes tout de suite, l'escalier revient contre la
     porte, elle s'ouvre, l'enfant sort, descend les marches et se retrouve
     au pied, la porte se ferme, l'escalier disparaît. Diagnostic :
     `descendre (avion)`, 2 à 3 s, `jusqu'au bout · par l'escalier`. Le
     chasseur : l'échelle, descendue face aux barreaux. Avion arrêté au bord
     de l'eau (pied des marches sur l'eau) : il se pose d'un coup sur la
     terre ferme à côté, diagnostic `sans escalier (escalier refusé : eau)`.
     En vol, et pour le Concorde : comme avant.
  7. **Ce qui ne doit PAS arriver.** Une image figée au moment où l'escalier
     ou la portière apparaît : la première ligne du diagnostic (`pire image`)
     doit rester sous 300 ms pendant le geste. Si l'une des séquences gêne,
     `?embarq=0` rend l'ancien geste instantané, au bit près.
  Ce que Max relève (chiffre de durée, `pire image`, ce qu'il a vu) se recopie
  ici et décide des durées de `DUREES` (embarquement.js).
- [ ] **LE PORTAIL DE LA v377 (le passager), DOUBLE MESURE FAITE.** Six
  suites vertes (`degats`, `visio`, `hote`, `washington`, `reglages`). Rouges
  déclarés : `maj.js` (préparation), `carte.js` (glisser bridé ×4, 484 ms),
  `manhattan.js` (trou de façade, taxi tactile), `monte.js` (téléportation,
  écran figé). `reseau.js` rejouée SEULE des deux côtés : la circulation
  partagée verte des deux côtés (écart médian 3,1 branche · 9,1 `origin/main`,
  62 au portail) ; « hôte sans courtier » et « il le REJOINT » rouges à
  l'identique ; « un départ propre » rouge sur la branche seule cette fois,
  déjà mesuré rouge sur `origin/main` (plus bas) et joué AVANT que la Lou du
  témoin neuf n'existe.
  Puis v374 à v376 sont parties pendant ces mesures : rebasée sur la v376
  (conflit sur une ligne de `main.js`, les deux gardées), témoin du passager
  vert et fumée verte, publiée en v377.
- [ ] **LE PORTAIL DE LA v396 (le diagnostic de l'embarquement), DOUBLE
  MESURE FAITE.** Témoin neuf vert ; `degats`, `carte`, `washington`,
  `reglages` verts. Rouges de familles déclarées : `maj.js` (loader de
  l'installation), `manhattan.js` (trou de façade, taxi tactile), `monte.js`
  (téléportation qui compile). Deux rouges NEUFS, rejoués SEULS des deux
  côtés : « après une téléportation, la file se recharge… puis se rend »
  (`monte.js`) — VERT sur la branche, ROUGE sur `origin/main` (v389,
  « rendue en 11 s : false ») ; « chez l'ami, la voiture de la rue… l'attend »
  et « le même temps » (`reseau.js`) — `reseau.js` ENTIÈRE verte sur la
  branche, seule ; `origin/main` seule : « un départ propre » rouge (déclaré).
  Intermittences de portail ; la seule différence de code est une ligne lue
  sous `?diag=1` et un relevé dans `publier`.
- [ ] **LE PORTAIL DE LA v389 (l'avion), DOUBLE MESURE FAITE.** Les trois
  témoins de l'avion verts (`monte.js`), `carteMonde.js` vert. Rouges, tous de
  familles déjà déclarées : `maj.js` (« vraiment là », « ne floute rien »),
  `monte.js` (téléportation qui compile). `reseau.js` au portail : cinq rouges
  dont un NEUF, « l'invité voit le même temps et la même heure que l'hôte »
  (hôte pluie 0,85 · invité clair 0,37). Rejouée SEULE : branche 1 rouge, la
  circulation partagée (écart médian 20,2, famille déclarée, 43 sur
  `origin/main` en v372) — le temps vert ; `origin/main` (v384) zéro rouge.
  Intermittence de portail. PREUVE STRUCTURELLE : le code neuf n'est atteint
  que sous `embarq: 1` face à un avion (`monterAvion`), et `reseau.js` ne
  monte dans aucun avion ; le ciel partagé ne lit ni `avions.js` ni
  `embarquement.js`.
- [ ] **LE PORTAIL DE LA v384 (la descente du passager).** `reseau.js`
  ENTIÈRE verte, témoin neuf compris ; `degats.js`, `reglages.js` verts.
  Rouges, tous de familles déjà déclarées : `maj.js` (loader de
  l'installation, loader après rechargement), `carte.js` (flèche du GPS, rouge
  seule sur `origin/main` en v327 ; glisser bridé ×4, 428 ms), `monte.js`
  (téléportation qui compile, réverbère `parcouru 0`). PREUVE STRUCTURELLE :
  le code neuf (`descendreDeChez`) n'est atteint que par un passager d'ami,
  qui n'existe que dans `reseau.js` ; partout ailleurs `embarq=0`.
- [x] **Le passager d'un ami** — FAIT en v377 : il entre par la portière
  droite avec la séquence (`monterChez`), et le conducteur la voit s'ouvrir
  chez lui (message `portiere`, l'hôte relaie). La DESCENTE aussi depuis la
  v384 (`descendreDeChez`). Sans courtier : FAIT en v410 (`net.estMoi`,
  le conducteur se reconnaît à l'identité du bus) (dette v253, zone
  conduite-en-ligne).
- [ ] **LE PORTAIL DE LA v372 (bords des portières), DOUBLE MESURE FAITE.**
  `degats.js` vert. Au portail, 17 rouges dans `monte.js` et `maj.js` : il a
  tourné pendant que je faisais tourner une dizaine de sondes de navigateur
  sur la même machine — ma faute, et la leçon de la v220 (deux pages en même
  temps font tomber la cadence de moitié). Rejouée SEULE des deux côtés,
  `monte.js` rend quatre rouges de chaque côté : passants de Rome sur la
  chaussée, téléportation qui compile, écran figé à l'arrivée — identiques ;
  et en plus le réverbère (`parcouru 0`, sur la branche) contre le trou en
  vol (sur `origin/main`), deux intermittences déjà vues des deux côtés.
  `reseau.js` — « la même circulation » (écart médian 43 blocs) : famille
  déclarée plus bas ; preuve structurelle, le témoin ne passe ni par
  `portieres.js` (atteint seulement sous `embarq: 1`) ni par `nouveautes.js`.
  `maj.js` rejouée seule : « vraiment là » rouge des deux côtés (personnages
  en retard), « ne floute rien » rouge sur `origin/main` seul — la famille de
  la préparation, déclarée plus bas.
  Après rebase sur la v369, portail complet relancé seul : `degats.js`,
  `maj.js`, `reseau.js` verts ; `monte.js` rend les quatre rouges que
  `origin/main` rendait rejouée seule (passants de Rome, téléportation qui
  compile, trou en vol, écran figé à l'arrivée) — le témoin des bords vert.
  Puis v370 et v371 sont parties pendant le portail : rebasée sur la v371
  (aucun fichier de code en commun), fumée verte et témoin des bords vert,
  publiée en v372.
- [x] **Les bords de la découpe** — FAIT en v372 : coupés au plan (débord 0
  sur les 55 modèles). Les taxis gardent `fabrique` → pas de portière : bords
  nets, mais 0/24 rayons touchent un habitacle derrière l'ouverture.
- [ ] **LE PORTAIL DE LA v373 (revers des portières).** `degats.js` vert ;
  les témoins de la livraison verts (revers 10/10, bords, descente en un
  essai sur le nouveau terrain). Rouges, tous de familles déjà déclarées et
  mesurées des deux côtés au portail de la v372 : `maj.js` « vraiment là »,
  `monte.js` téléportation qui compile, trou en vol, écran figé ; et
  l'atterrissage avion (« descend train sorti ») — preuve structurelle, les
  avions ne passent ni par `portieres.js` ni par la séquence.
- [x] **Une portière ouverte vue de dos** — FAIT en v373 : un revers fabriqué
  en géométrie (copie des sommets, normales retournées), pas un `DoubleSide`.
  De derrière : 0/24 rayons avant, autant que de face après (10 et 10 sur
  l'AMG). Aucun programme neuf, aucun appel de dessin de plus.
- **La séquence ne se juge qu'au banc.** Durées (1,1 s de marche au plus, 2,4 s
  en tout) et caméra de trois quarts arrière : à confirmer sur l'iPad.
- [x] **Les avions** — FAIT en v389 : escalier contre la porte avant gauche
  (avion de ligne), échelle et verrière (chasseur) ; le Concorde déclare
  `porte: null` (fuselage 0,94 bloc). La DESCENTE d'un avion par son
  escalier est FAITE en v400 (`descendreAvion`, la place mesurée au sol de la
  colonne). Reste : les amis ne voient pas la porte de l'avion s'ouvrir (aucun
  message) ; l'enfant traverse l'aile s'il arrive par l'arrière (le chemin ne
  contourne que le fuselage).
- [ ] **LE PORTAIL DE LA v366 APRÈS LA v364, DOUBLE MESURE FAITE.** Cinq
  suites rouges, toutes des familles déjà déclarées : `maj.js` (préparation
  libérée avec personnages 4/9 ; « la page ne floute rien »), `manhattan.js`
  (trou de façade 22 326 → 51 734, taxi « 🐴 Monter » caché), `monte.js`
  (passants sur la chaussée à Rome 6/21, téléportation qui compile, gel
  d'arrivée 21,8 %), `reseau.js` (« un départ propre nettoie tout le
  monde », rouge à l'identique sur `origin/main`, ligne 2639) et
  `reglages.js` (« un choix fait sur une tablette part au serveur » et ses
  deux suivants). La seule dont le banc est touché par la livraison
  (`embarq=0` dans son adresse) est `reglages.js` : rejouée SEULE, 70 verts
  sur la branche ET 70 verts sur `origin/main` (v364) — rouge de charge,
  comme au portail de la v363. Preuve structurelle pour les autres : le banc
  met `embarq=0` partout, donc `monter`/`descendre` appellent `toggleRide`
  au bit près comme avant.
- [ ] **LE PORTAIL DE LA v366 APRÈS LA v356, DOUBLE MESURE FAITE.** Onze
  suites vertes. Rouges déjà déclarés : `maj.js` (le loader de
  l'installation), `carte.js` (la flèche GPS à gauche, 1,92 rad), `manhattan.js`
  (le trou de façade 14 460 → 51 734, le taxi tactile), `monte.js` (la
  téléportation qui compile, l'écran figé à l'arrivée). Deux neufs, rejoués SEULS
  des deux côtés :
  - `plafond.js` — « engendrer et mailler moins cher ne change ni un bloc ni un
    sommet » : `69381f2e…` pour `b31099b9…` attendue, À L'IDENTIQUE sur la
    branche et sur `origin/main` (v356). L'empreinte de la v351 n'a pas été
    relevée après les routes de la v355 (Toronto–Montréal, Cologne–Hambourg) ou
    le ciel de la v353 : à remesurer par la session qui l'a posée, pas à
    recopier.
  - `reseau.js` — « deux tablettes voient la même circulation » (barre 20) :
    écart médian sur la branche 21,0 (portail) · 16,9 · 37,1 · 18,9 · 0,1 · 13,0 ;
    sur `origin/main` 13,1 · 7,1 · 9,0 · 1,1 · 13,1, en ordre alterné. Les deux
    étendues se recouvrent (0,1 et 13,0 d'un côté, 13,1 de l'autre) ; la
    branche penche plus haut et rougit deux fois sur six. Le chemin est
    pourtant le même PAR CONSTRUCTION : le banc met `embarq=0`, où `monter` et
    `descendre` appellent `toggleRide` comme avant, `update` sort à la
    première ligne sans séquence, et ni `embarquement.js` ni `portieres.js`
    n'ont de minuterie. Ce témoin varie de 0 à 37 blocs sur un même code (sa
    barre suppose qu'une page rend une image par seconde) : c'est un tirage,
    pas un gardien. À refaire en lisant les deux pages à la MÊME image (ou en
    comparant l'horloge de rue publiée, `rue` du message `ciel`, au lieu des
    positions), et à rejouer dix fois de chaque côté avant d'accuser qui que ce
    soit.
- [ ] **LE PORTAIL DE LA v366 APRÈS REBASE SUR LA v348, DOUBLE MESURE FAITE.**
  Quinze suites vertes. Rouges, rejoués SEULS des deux côtés :
  `manhattan.js` — le trou de façade (9 203 branche · 11 684 `origin/main` →
  51 734, dette v291) ; le taxi tactile (1,06 bloc, seul sur la branche :
  dette v291 déjà vue des deux côtés). `monte.js` — la téléportation qui
  compile (chauffe NY expirée, 7 et 12 programmes neufs), le trou en vol
  (chasseur 58 · Concorde 58 pour une barre à 60, l'un ou l'autre selon le
  passage, des deux côtés), l'écran figé à l'arrivée (1 467 et 2 083 ms) :
  rouges à l'identique sur la branche et sur `origin/main`. **Et un rouge
  était à moi** : « descendre vite » rejouée seule sortait l'enfant par
  l'ARRIÈRE (côté conducteur refusé « mur », un obstacle de la prairie ;
  passager « circulation » une fois sur trois, sonde `sonde-presse`) — sortie
  juste, témoin trop étroit (il n'acceptait que les flancs) : il accepte
  désormais toute place hors de l'emprise et publie les refus. À creuser : ce
  qui rend « circulation » en pleine prairie à soixante blocs de toute route.
  **RÉSOLU (v373)** : la « prairie » était DANS Manchester (46 blocs du
  centre, rayon 65). La garde du témoin lisait `cityAt`, qui ne connaît que
  les villes bâties à la main ; un vrai circuit de la ville (`voiture|4|-1983,
  -2535`, 270 blocs) passait à 3,5 blocs de la voiture — refus juste. Le
  « mur » côté conducteur était un arbre de ville. Le témoin cherche
  désormais hors de TOUTE ville (`dansVilleMonde` aussi) : sur le nouveau
  site, dix descentes, zéro refus.
- [ ] **LE PORTAIL DE LA v366 (embarquement), DOUBLE MESURE FAITE.** Deux
  portails complets (le second après rebase sur la v339). Les huit témoins de
  l'embarquement verts aux deux. Rouges, tous rejoués SEULS des deux côtés :
  `monte.js` — la téléportation qui compile (chauffe de New York expirée) et
  l'écran figé à l'arrivée (3 600 à 3 733 ms) : rouges à l'identique seule sur
  la branche ET sur `origin/main` ; « une voiture roule dans la nature » (`pas
  au volant`) rouge au premier portail, verte au second et seule : la
  dépendance au témoin d'avant de la v317. `maj.js` — le loader de
  l'installation : rouge au portail 1 et seule sur la branche, vert au
  portail 2 et seul sur `origin/main` (qui rend en plus « la libération » et
  « le flou pendant la préparation », dette de charge de la v327) :
  l'intermittence déjà mesurée des deux côtés. `visio.js` — la radio pendant
  l'appel (0,0054 pour une barre à 0,0046) : verte seule des DEUX côtés, un
  tirage. `carte.js` — la flèche GPS (1,92 rad, la dette de la v327) au
  portail 2 ; seules, les deux rendent « la faire glisser, bridé ×4 » (439 et
  408 ms pour 400). `manhattan.js` — le délai de la ligne 282 au portail (dette
  v269) ; seules, les deux rendent le trou de façade et le taxi tactile
  (dettes v291). La livraison ne touche ni la carte, ni la visio, ni
  Manhattan, et le banc saute la séquence (`embarq=0`) partout ailleurs.
  **Et un rouge était à moi** : rejouée seule, la descente tombait sur
  « circulation » des deux côtés de la voiture et se faisait sans animation —
  le témoin remonte et redescend désormais quand la situation n'a pas eu lieu.


- [x] **(FAIT en v354 : `trottoirA` lit `ruePietonne` à Manhattan, témoin de débit dans `manhattan.js`.) LES PASSANTS DE MANHATTAN N'ONT PAS REÇU LA MARCHE AU LONG CAP (v278,
  déclaré en v279).** `passants.js` pose `h.surTrottoir = !site.urbain && …` :
  dans un site URBAIN — New York est le seul — le drapeau reste faux, donc
  `Habitant.promene()` rend faux et les passants y gardent l'ancien programme
  (pause longue, cap au hasard autour d'un poste). Ce n'est pas un oubli
  arbitraire : leur trottoir ne se lit pas dans des blocs mais dans le PLAN
  (`piedPieton`, `ruePietonne`), et l'ancienne branche de `think` sait déjà
  l'interroger. Ce qui manque, c'est de porter la marche au long cap sur cette
  lecture-là. Rien ne le garde aujourd'hui : les deux témoins de la v279
  mesurent la ville que le banc peuple, qui n'est pas Manhattan.

- [ ] **LE RECUL DE LA CAMÉRA N'A ÉTÉ JUGÉ QUE SUR LE BANC (v279).** 6,4 au lieu
  de 5,2, choisi sur trois captures du boulevard Voltaire depuis le même point.
  Max juge sur captures, et il n'a pas encore vu celles-ci ; s'il le trouve trop
  loin ou trop près, c'est une ligne de `montures.js`
  (`poursuite: { recul, hauteur }`, la hauteur suivant la distance à 0,404).
  Les vues de poursuite des AVIONS (18, 22, 13) n'ont pas été touchées : la
  demande portait sur la voiture.

- [ ] **LES CINQ ROUGES DE `manhattan.js` AU PORTAIL DE LA v279 — QUATRE
  MESURÉS SUR `origin/main`, ET LE CINQUIÈME RESTE OUVERT.** Rejoué SEUL des
  deux côtés (`/root/main-ref` détaché sur 710ab76, la branche dans l'arbre
  principal), la règle de la v195.

  | rouge | branche (portail) | `origin/main`, seul |
  | --- | --- | --- |
  | le trou enlève la géométrie visible de la façade | 9 203 → 51 734 | **17 102 → 54 969** |
  | fenêtres et éclairage public la nuit | rouge | **rouge** |
  | les ombres suivent le soleil et la lune | `[1,-1]` | **`[1,-1]`, à l'identique** |
  | le taxi roule avec les contrôles tactiles | rouge | **la suite meurt là** (`#ride-btn` caché, 18 relevés, ligne 416) |
  | les deux clients sans erreur de jeu (`PeerJS: Lost connection`) | rouge | **pas atteint** |

  Les trois premiers étaient DÉJÀ déclarés en v278 contre `d9852ac` ; ils se
  reproduisent ici contre `710ab76`, donc ils sont en production depuis au moins
  la v277 et rien de la v279 ne les cause. Le taxi est NEUF dans la déclaration,
  et c'est `origin/main` qui l'a rendu : le bouton reste caché, ce qui veut dire
  que la voiture invoquée n'est pas à portée d'embarquement — pas que le taxi ne
  roule pas.

  **ET LE PASSAGE SUR LA BRANCHE N'A RIEN PROUVÉ, CE QU'IL FAUT DIRE.** Il est
  mort au bout de QUATORZE verdicts sur `page.waitForFunction` à la ligne 282 —
  le délai que la v269 a déjà nommé, mot pour mot, dans ce même fichier. Ses
  « zéro rouge » ne sont donc pas un vert : la suite n'a jamais atteint les
  témoins de contenu. C'est exactement ce que la v269 décrivait (« la suite
  s'arrêtant plus tôt quand le délai tombe, elle ne les atteint pas toujours »),
  et la conséquence est que **la double mesure de cette suite se fait sur
  plusieurs passages par côté, jamais sur un**. Reste à faire : deux passages de
  plus sur la branche pour voir les trois rouges de contenu s'y reproduire, et
  un passage de `manhattan.js` qui atteigne le témoin PeerJS des deux côtés.

- [ ] **LES CINQ ROUGES DU PORTAIL DE LA v278, MESURÉS UN PAR UN — AUCUN N'EST
  DE LA LIVRAISON.** La PR ayant été fusionnée avant la fin du portail, la
  question n'était plus « faut-il fusionner » mais « ai-je cassé quelque chose
  qui tourne MAINTENANT chez les enfants ». Chaque suite a donc été rejouée
  SEULE, contre `d9852ac` (la v277, avant la fusion) et contre la branche.

  | rouge | seule sur la v277 | seule sur la branche | ce que c'est |
  | --- | --- | --- | --- |
  | `manhattan.js` — trou de façade, fenêtres de nuit, ombres | **les 3 mêmes** (`11684 → 51734`, `[1,-1]`) | — | déjà en production |
  | `maj.js` — fond de carte pas prêt à la libération | **présent** (`carte: false`, `cartePas: 9`, 45,8 s) | — | dette de la v276, toujours ouverte |
  | `maj.js` — badge et journal des nouveautés | vert | vert | **le seul qui était à moi** : `CACHE_VERSION` resté à v277, corrigé en #282 |
  | `washington.js` — le métro (3 témoins) | vert (18 m en 6 s de jeu) | **vert deux fois** | rouge de CHARGE de portail |
  | `carte.js` — un appui long dépose n'importe où | vert | **vert** | rouge de CHARGE, dette de la v258 |
  | `monte.js` — l'écran se fige en arrivant sur une ville | **40,8 % · cadence 4,9** | portail : 39,1 % · 4,4 | même distribution, pré-existant |

  **Et `monte.js` sur la v277 a rendu un rouge que le portail n'a PAS rendu** —
  « un passant lancé sur la voiture de l'enfant s'arrête et la contourne »
  (9 départs, 110 relevés, 0 traversée, 3 qui bougent). Un témoin qui va et
  vient sans qu'une ligne du jeu ait bougé : c'est la famille de la v269, et il
  se démonte en rejouant jusqu'à voir la même DISTRIBUTION des deux côtés, pas
  jusqu'à voir un vert.

  Ce qui reste à faire, par ordre de ce que l'enfant subit : (1) les trois de
  `manhattan.js`, qui sont en production depuis au moins la v277 et que personne
  n'a encore mesurés ; (2) le fond de carte de `maj.js`, dette de la v276 avec
  sa piste déjà écrite ; (3) reformuler les verdicts de `washington.js` (métro)
  et `carte.js` (appui long) pour qu'ils attendent leur RÉSULTAT borné au lieu
  d'une fenêtre fixe — la règle de la v270, qu'ils n'ont toujours pas reçue.


- [ ] **LA VRAIE RANGÉE DEVANT L'AÉROGARE 2 DE ROISSY DEMANDE DE DÉPLACER UN
  DOUBLET DE PISTES (v278).** Les trois appareils de Roissy sont désormais aux
  deux seules poches à ciel ouvert de son tarmac — le couloir entre le tambour
  de l'aérogare 1 et les halls (20 × 16 blocs), et la trouée entre les halls 2C
  et 2E. Partout ailleurs la bande libre fait SEPT blocs, pour une envergure de
  quinze : mesuré sur toute la plate-forme, il n'existe aucun autre carré de
  seize. Une rangée alignée devant l'aérogare 2, comme aux dix-huit autres
  aérodromes, réclame `TARMAC` à 35 au lieu de 25, donc `TAXI_A` et le doublet
  nord poussés d'une dizaine de blocs — et le disque ne fait que 68 de rayon,
  si bien que la piste extérieure tomberait de 83 à 55 blocs. C'est une
  décision de PLAN (agrandir la plate-forme, ou raccourcir une piste), pas un
  réglage, et elle touche un point de repère que Max a validé en capture.

- [ ] **LES QUATRE AVIONS EN BLOCS DU POSTE SUD DE ROISSY NE SONT PLUS À CÔTÉ
  DE RIEN (v278).** Ils avaient été gardés « pour que la plate-forme ne soit
  pas vide vue du ciel » quand les vrais appareils étaient au poste nord. Les
  vrais ont déménagé ; à vérifier en capture aérienne si le décor tient encore
  debout à côté, ou s'il vaut mieux le déplacer.


- [ ] **« LES VOITURES NE SE TRAVERSENT PLUS » TIRE À PILE OU FACE, ET CE QUE LE
  JEU FAIT RESTE INDÉTERMINÉ (v277).** Le témoin compte les chevauchements sur
  trente secondes de MONTRE, un relevé toutes les 200 ms, au centre de Paris.
  Sept mesures, deux arbres, deux résolutions :

  | bras | dpr | chevauchements |
  | --- | --- | --- |
  | portail v276 | 1 | 3 / 499 |
  | branche, rejeu | 1 | **0 / 345** |
  | portail v277 | 1 | sous la barre |
  | branche, monte seule | 1 | **53 / 474** |
  | branche | 0,5 | 48 / 665 |
  | `origin/main` (v276) | 0,5 | 41 / 695 |

  **L'ÉTENDUE À dpr 1 SEUL — 0 À 53 — RECOUVRE LES VALEURS À dpr 0,5**, et la
  barre (45) tombe dedans. J'avais d'abord conclu que la cadence révélait un
  défaut de production, sur UN passage par bras : c'est la règle de la v269
  invoquée sans être suivie. Corrigé dans `CLAUDE.md` et dans le journal.

  **DOUBLE MESURE FAITE CORRECTEMENT (v277) : SIX PASSAGES, TROIS PAR ARBRE, EN
  ORDRE ALTERNÉ, MÊME BANC ET MÊME TÉMOIN DES DEUX CÔTÉS. Tous VERTS.**

  | passage | arbre | chevauchements | paires | taux | relevés |
  | --- | --- | --- | --- | --- | --- |
  | 1 | branche | 37 | 145 | 25,5 % | 146 |
  | 1 | `main` | 0 | 109 | 0 % | 146 |
  | 2 | branche | 1 | 123 | 0,8 % | 146 |
  | 2 | `main` | 0 | 74 | 0 % | 146 |
  | 3 | branche | 3 | 117 | 2,6 % | 146 |
  | 3 | `main` | 2 | 55 | 3,6 % | 146 |

  Le nombre de relevés est STABLE (146 partout) : l'échantillonnage n'est pas en
  cause. Ce qui varie, c'est un compte de coïncidences rares sur une fenêtre
  courte — les deux arbres vont de zéro à des dizaines, et la barre (45) est
  dans la queue de cette loi. Les 48 et 53 vus plus tôt sont des tirages de la
  même distribution, pas un défaut de livraison. **Le témoin ne bloque donc
  pas, et il ne prouve rien non plus.**

  Ce qu'il faut faire, dans cet ordre, et l'ordre a changé :
  1. **Rendre le témoin lisible avant de juger le jeu.** Un compte absolu sur
     une fenêtre de montre, dans une ville à deux ou quatre images par seconde,
     ne peut pas être stable : le dénominateur (le nombre d'observations) doit
     être publié, le verdict devenir un TAUX, et la fenêtre se mesurer en
     CHEMIN parcouru par les convois plutôt qu'en secondes.
  2. **Alors seulement mesurer le jeu**, dix passages par bras, et regarder la
     DISTRIBUTION — pas un passage.
  3. La piste de cause reste plausible et NON mesurée : `cederLePassage` est une
     cadence de ménage à intervalle réel fixe (v226), donc sous-échantillonnée
     quand le monde va vite. La sonde qui distinguerait « sous-échantillonné »
     de « la priorité ne marche pas » lit `etat().places` — le drapeau d'attente
     de chaque voiture (v273) — pendant un chevauchement.
  4. Et `BANC_DPR=0.5` (vingt pour cent de banc) reste éteint tant qu'on ne peut
     pas lire ce qu'il casse : **on n'allume pas un réglage dont on ne peut pas
     mesurer l'effet.**

- [ ] **ROUGES DE CHARGE DU PORTAIL DE LA v277, rejoués SEULS et verts.**
  `sauvegarde.js` 19/19, `carte.js` 95/95, `washington.js` 29/29 — les trois
  étaient rouges au portail et sont verts seuls. `washington.js` : les trois
  témoins du métro (« une rame passe », la pastille de ligne, « 0 m en 40 s de
  jeu »), la famille documentée depuis la v161 — `dt` borné, le monde avance
  moins vite que l'horloge. `carte.js` : l'appui long, la dette de la v258.
  Ce qui est NEUF et qui vaut d'être noté : **le verdict du portail dépend du
  nombre de suites qui ont réellement tourné avant**, et le cache de reprise
  masque exactement cela — au portail de la v276, treize suites sur quinze
  étaient reprises.

- [ ] **LE BANC EST TROP LOURD, TROP LONG, TROP COÛTEUX, TROP PÉNIBLE — Max,
  v276.** Refonte à faire AVANT la suite du design. Mesuré sur le portail de la
  v276, suite par suite : **61 minutes, dont 34 dans DEUX fichiers.**

  | | durée | témoins | pages de jeu | boucles de relevé |
  | --- | --- | --- | --- | --- |
  | `monte.js` | 18 min | 141 | **7** | 46 |
  | `reseau.js` | 16 min | 73 | **16** | — |
  | les treize autres | 27 min | ~550 | ~14 | — |

  **Les deux causes ne sont pas les mêmes, ce qui interdit un remède unique.**
  `monte.js` n'ouvre que sept pages pour dix-huit minutes : le temps est dans
  l'attente qu'un jeu à quatre images par seconde parcoure une distance.
  `reseau.js` ouvre seize pages pour seize minutes, jusqu'à trois vivantes en
  même temps (la v220 a mesuré qu'une seconde page fait tomber la cadence de
  42,9 à 20,8) : le temps est dans l'ouverture.

  Trois leviers, chacun à mesurer AVANT d'y toucher (ce dépôt a déjà payé
  quatre fois pour avoir expliqué une lenteur sans l'instrumenter, v224) :

  1. **`?tempo=`** — la cadence de banc sur les ~20 minuteries du jeu, dette
     déjà déclarée plus bas avec la liste de ce qui ne doit JAMAIS passer sous
     tempo (l'horloge scolaire, `chronoReel`, la borne de `dt`, les débits que
     `monte.js` mesure). Deuxième poste mesuré : 8 à 12 minutes.
  2. **Mutualiser les pages de `reseau.js`** : un hôte ouvert une fois pour
     plusieurs scénarios au lieu d'un couple par témoin.
  3. **La passe sur les verdicts en fenêtre FIXE** (règle de la v270, jamais
     appliquée en entier). C'est elle qui supprime la BOUCLE rouge → rejeu seul
     → rejeu sur `origin/main` → portail complet, qui a coûté **cinq portails**
     en v276. **La douleur est dans la boucle, pas dans les minutes** — et
     l'exemple du jour est le témoin du gel à l'arrivée sur une ville, rouge à
     chaque portail depuis la v259 et franchi par les DEUX arbres : une barre
     que personne ne peut tenir ne protège rien, elle coûte.

  Ce qu'on ne touche pas : `plafond.js`, `sauvegarde.js` et les suites qui
  gardent les mondes des enfants — 2 min 40 s à elles toutes, elles ne sont pas
  le problème.

  Et une méthode qui a marché le jour même, à garder : **devant un verdict en
  durée, on extrait le témoin dans une sonde** (`scratchpad/sonde-ville.cjs`)
  plutôt que de rejouer la suite. Huit relevés des deux côtés en six minutes,
  contre quatre-vingts minutes de rejeux.

- [ ] **LA PRÉPARATION DE L'ACCUEIL TIENT SUR LE BORD DE SA PROPRE BORNE
  (v276).** Le bouton « Jouer » est grisé jusqu'à ce que tout soit prêt, borné à
  quarante-cinq secondes (v258). Sur ce banc, dans les conditions du témoin de
  `maj.js` — une page laissée ouverte sur l'accueil qui télécharge les 4,67 Mo du
  scanner de visages, et une seconde page qui prépare —, la préparation met
  **42,9 · 43,8 · 45,2 s** (trois passages, tout complet chaque fois : 25/25
  programmes, corps, fond de carte). `origin/main` (v275) mesurait 36,9 s. La
  marge est donc de zéro à deux secondes, et le témoin battra sur une machine
  plus lente.

  Ce qui a déjà été mesuré et corrigé dans la v276 : le flou du verre prenait la
  MOITIÉ des images de l'accueil (suspendu pendant la préparation, 8/25 → 25/25
  programmes), et la chauffe compilait une signature par IMAGE au lieu d'un
  budget de temps (16/25 → 25/25). Ce qui a été mesuré INNOCENT : la dérive de
  l'aurore et les deux calques plein écran (trois designs, aucun signal), et la
  parure en jeu (six relevés, 0 à 1,2 % d'images au-delà de 150 ms des deux
  côtés).

  Ce qui reste ouvert : les six secondes d'écart avec `origin/main` ne sont
  attribuées à rien. Une piste NON mesurée, et il faut le dire : `#prep-line`
  est réécrite toutes les 250 ms pendant la préparation, ce qui invalide la
  peinture de `#overlay` — donc les trois dégradés radiaux de `::before` et le
  SVG de méridiens de `::after`, à `background-size: 128vmax`. Mes mesures des
  calques ont toutes été faites sur une page SANS préparation, où rien ne
  réécrit : **elles ne pouvaient pas voir ce coût-là** (piège de la sonde
  aveugle, v273). Le test qui trancherait : reproduire les conditions du témoin
  (une page qui télécharge le scanner + une page qui prépare) et comparer
  `depuis` avec et sans `?verre=0`.

- [ ] **LES PASSANTS SE FIGENT ENCORE DEVANT L'ENFANT (Max, après v276).**
  « Les passants qui s'arrêtent et qui nous regardent de manière figée, ça ne
  fonctionne pas. Je vois quelque chose de très naturel, comme dans GTA. »

  La v243 a retiré l'arrêt social de `Habitant.think` (vie.js) et
  `Wanderer.think` (marlon.js) — et le symptôme revient. **Devant un symptôme
  qui revient après une correction juste, on cesse de régler et l'on va voir ce
  qui s'exécute** (v226). Une ligne trouvée, qui n'est PAS celle que la v243 a
  corrigée :

  ```
  marlon.js:324   if (this.player.gabarit > 1 && dist < 5) return { speed: 0, yaw: this.yaw };
  ```

  Écrite pour une bonne raison (« on ne vient pas se coller à une voiture »),
  elle rend `speed: 0` ET garde le yaw : le personnage s'arrête net et reste
  planté. C'est une piste, pas le diagnostic — **la première chose à faire est
  une sonde qui sépare les cas** (v218) : combien de passants sont à l'arrêt,
  lesquels ont `speed: 0` par cette ligne, lesquels par autre chose, et
  combien regardent l'enfant. Compter « des gens figés » d'un seul nombre ne
  se démontera pas.

  Ce que « naturel comme dans GTA » veut dire, à préciser en mesurant : un
  passant qui CONTOURNE au lieu de s'arrêter, qui garde sa vitesse, et qui ne
  tourne pas la tête vers l'enfant.

- [ ] **À PIED, ON TRAVERSE LES VOITURES (Max, après v276).** « Quand on joue
  avec le jeu, on ne devrait pas être capable de pouvoir marcher à travers une
  voiture. »

  La cause est nommée, et c'est une garde trop étroite :

  ```
  player.js:613   if (this.gabarit > 1 && !this.pilote && this.obstacleVehicule && …)
  ```

  `gabarit > 1` veut dire « je conduis ». À pied le gabarit vaut 1, donc le
  crochet qui empêche d'entrer dans une voiture n'est jamais consulté : la
  boîte du joueur ne connaît que les blocs solides, et une voiture n'en est
  pas un. C'est la v259 vue de l'autre bout — elle a appris aux PIÉTONS à ne
  pas traverser la voiture de l'enfant, jamais à l'enfant de ne pas traverser
  les leurs.

  Deux choses à ne pas casser en le corrigeant : **« pas si l'on est déjà
  dedans »** (v252, jugé par FAMILLE), sinon un enfant qu'une voiture vient de
  recouvrir reste cloué sur place ; et le rayon d'embarquement de neuf blocs
  (v201), qui suppose qu'on peut s'approcher d'une voiture pour y monter — une
  collision trop large rendrait certaines voitures impossibles à prendre. Le
  témoin mesure ce que l'enfant obtient : marcher droit sur une voiture garée,
  et s'arrêter devant au lieu de ressortir de l'autre côté.

- [ ] **LA VUE EN VOITURE EST TROP SERRÉE, ET ELLE NE MONTRE PAS LE VIRAGE
  (Max, après v276).** « La vue de la voiture, je la trouve pas très cool. Il
  faudrait la zoomer out un petit peu et faire comme dans GTA : quand la
  voiture tourne, on voit vraiment la voiture qui tourne, on voit le flanc de
  la voiture sur le côté. »

  La vue de poursuite EXISTE déjà (`poursuite` dans la fiche, montures.js,
  décidée par Max après deux essais de vue intérieure) — elle est seulement
  trop près et trop rigide :

  ```
  montures.js   voiture … poursuite: { recul: 5.2, hauteur: 2.1 }
  fun.js:1293   if (a.def.poursuite) { … cos(player.yaw), sin(player.yaw) … }
  ```

  Deux défauts distincts, et le second est le vrai sujet. **Le recul** se
  règle dans la fiche, comme pour les avions (13, 18, 22 selon l'appareil) :
  c'est un chiffre, il se mesure sur captures. **La rigidité** est
  structurelle : la caméra lit `player.yaw` à l'image même, donc elle tourne
  EXACTEMENT avec la voiture et l'on ne voit jamais le flanc. Il lui faut un
  cap PROPRE qui rattrape celui du véhicule avec du retard — c'est ce retard,
  et lui seul, qui fait qu'on voit la voiture s'inscrire dans son virage.

  Deux pièges connus du dépôt à reprendre ici : le retard se compte en TEMPS
  RÉEL et non en `dt` (v226), sinon la caméra traîne deux fois plus sur une
  tablette qui rame ; et **un signe se regarde, il ne se déduit pas** (v231,
  v249) — une caméra qui retarde du mauvais côté montre le flanc opposé au
  virage, et aucune mesure d'amplitude ne l'en distingue. Deux captures, un
  virage à gauche et un à droite, AVANT d'écrire le témoin.


- [ ] **LE TÉMOIN DES REDÉMARRAGES AU VERT COMPTE UN INSTANT, PAS UN
  ÉVÉNEMENT (v275).** « Et la circulation s'arrête au feu rouge, puis repart
  au vert » (`carteMonde.js`) exige `redemarrages >= 1`. Or il ne compte un
  redémarrage que si la MÊME voiture est relevée sur deux échantillons
  CONSÉCUTIFS de 500 ms — l'un pendant qu'elle attend, l'autre après le
  passage au vert — **et qu'elle est encore dans la fenêtre de 2 à 7 blocs
  devant le feu au second**. Or une voiture qui repart en sort : c'est
  exactement le cas qu'on veut voir qui échappe à la mesure. Le compte est
  donc un tirage, et il tombe à zéro dès que la cadence du banc baisse.

  Mesuré, la suite rejouée SEULE trois fois de chaque côté (la livraison v275
  ne touche ni `feux.js`, ni `vehicules.js`, ni `main.js` sur ce chemin) :

  | | branche | `origin/main` |
  | --- | --- | --- |
  | redémarrages | 2 · 5 · 3 | 4 · 4 · 2 |
  | voitures relevées | 1 448 · 1 451 · 1 461 | 1 466 · 1 445 · 1 439 |
  | arrêtées au rouge | 170 · 175 · 137 | 151 · 154 · 169 |

  Même distribution, même moyenne (3,3 des deux côtés). Au portail complet,
  sous charge, il a rendu **0** — et 193 arrêts au rouge, donc le mécanisme
  du jeu marche. C'est le banc que le témoin mesure.

  **Le remède n'est pas de baisser la borne à zéro** (elle ne prouverait plus
  rien) **ni de rejouer jusqu'au vert.** C'est de compter l'ÉVÉNEMENT au lieu
  de l'instant : retenir, par voiture, qu'elle a attendu devant un feu non
  vert, et compter le redémarrage la première fois qu'on la revoit sans son
  drapeau d'attente — qu'elle soit encore devant le feu ou non. `auRouge >= 10`
  reste la borne qui garde le fond. À faire en v276, et à éprouver en
  désarmant l'arrêt aux feux dans une copie de `src` (la vérification se FAIT,
  elle ne se raconte pas).


- [ ] **TROIS FEUX DE PARIS SONT SOUS L'EMPRISE D'UN MONUMENT (v274).** Les
  repères (`LANDMARKS`, world.js) se posent APRÈS les colonnes et écrivent
  leurs propres blocs : un feu planté là y survit, DEDANS, et la rue que
  `solParis` promettait à côté de lui est recouverte de pierre. Mesuré : sur le
  disque entier de Paris, **88 feux au coin d'un carrefour sur 91 (97 %)** ;
  les trois autres sont tous dans l'emprise de la Caserne & Commissariat
  (box 46), avec du `STONEBRICK` sur leurs quatre voisins. Londres est à 116
  sur 117. **Et le garde évident est un non-résultat MESURÉ** : écarter tout
  candidat dont la colonne tombe dans une `box` de repère fait tomber Paris ET
  Londres à ZÉRO feu — la `box` est une zone d'interdiction de BÂTIR, bien plus
  large que ce que le repère pave, et au centre de ces deux villes leur union
  couvre tout. Écrit, mesuré, retiré. La vraie question est ailleurs : un
  carrefour d'avenues que la Caserne recouvre est un conflit de PLAN, de la
  même famille que « les voitures traversent un monument » (v221) — c'est le
  monument ou l'avenue qu'il faut déplacer, pas le feu qu'il faut cacher.

- [ ] **Quatre témoins de `manhattan.js` sont rouges EN PRODUCTION (double mesure
  de la v272).** Rejoués SEULS des deux côtés, dans deux arbres séparés :

  | témoin | sur la branche | sur `origin/main` |
  | --- | --- | --- |
  | le trou enlève aussi la géométrie visible de la façade | 22 326 → 51 734 | 14 460 → 51 734 |
  | fenêtres et éclairage public fonctionnent la nuit | rouge | rouge |
  | les ombres suivent le soleil et la lune visibles | [1, −1] | [1, −1] |
  | le taxi roule avec les contrôles tactiles | rouge | rouge |

  `origin/main` en rend même DEUX de plus (New York partage blocs et code,
  et une perte de connexion PeerJS). Aucune ligne du domaine de Manhattan n'a
  bougé en v272 : ces quatre-là sont une dette déclarée, pas une régression. Et
  ce sont exactement ceux que la v259 a nommés : à **0,4 image par seconde** sur
  ce banc, un témoin qui lit un effet « 350 ms après » est un pile ou face. La
  piste est donc la même que pour le reste du banc — provoquer la situation au
  lieu de l'attendre — et elle vaut un chantier à part.

- [ ] **`washington.js` : « on entre chez les gens » ne rougit qu'en charge.**
  Rouge au portail de la v272 (« façade 0,1, plafond à −1, 1 mur(s) »), **vert
  rejoué SEUL sur la branche ET sur `origin/main`** (29 témoins verts des deux
  côtés). C'est la famille que le fichier documente déjà : le témoin marche par
  pas de 700 ms et `dt` est borné à un vingtième, donc sous quatre images par
  seconde huit pas ne font plus quatre blocs. Il abandonne après trois pas sans
  mouvement ; sous la charge d'un portail entier, trois pas consécutifs peuvent
  tomber dans des hoquets. À reprendre comme les autres : on attend le
  RÉSULTAT (être entré), borné, jamais un nombre de pas.

- [ ] **Le compteur de vitesse d'une voiture (v272) — retiré, pas remplacé.**
  Max : « la jauge de vitesse, je ne veux pas qu'elle soit existante pour une
  voiture ». La manette et le compteur sont devenus des instruments d'avion, et
  une voiture n'affiche donc plus rien. Si l'on veut un jour lui rendre un
  chiffre, il faut d'abord décider ce qu'il dit : **un bloc ne vaut un mètre
  nulle part dans ce jeu** — trente à quarante au sol dans une ville — et
  `v × 3,6` mentait déjà dans le sens qui rapetisse tout (v267). La piste est
  celle de l'avion : une croisière déclarée dans la fiche (`ALLURES`,
  vehicules.js) et l'affichage en prend la fraction de l'allure atteinte. Rien
  à faire tant que Max ne le redemande pas.

- [x] **La physique d'un choc de voiture reste un arrêt net (v272) — FAIT en v358 et v397** (glisse rasante, rebond de face, choc publié, dégâts de la v343 ; contre une voiture de la rue, normale de son rectangle et vitesse relative en v382). La
  vitesse se borne désormais au déplacement RÉEL, ce qui règle le compteur, le
  régime du moteur et les roues qui tournaient dans le vide. Ce n'est pas un
  choc : pas de rebond, pas de dégât, pas de secousse de caméra. C'est la
  tâche #38 de la session (« dégâts visibles sur les voitures et choc naturel
  entre voitures »), et le clamp est le socle sur lequel elle se posera.


- [ ] **« La reprise tient dans la durée » (`reseau.js`) — ROUGE SEULE DES
  DEUX CÔTÉS le soir de la v260, verte seule des deux côtés le matin de la
  v259.** FAIT le soir de la v261 : `reseau.js` rejouée SEULE sur un arbre
  v258 (`/root/v258`, `7c9163c`) le même soir, 71 témoins VERTS dont
  celle-ci (« hôte 2 · Alice 2 », `scratchpad/v260/reseau-seule-v258.log`),
  cinq minutes après le rouge sur `origin/main` en v259. Puis deux sondes
  qui rejouent CE scénario seul (`scratchpad/v261/sonde-reprise*.cjs`) :
  la courte (hôte, Alice, sommeil, Alice revenue) et la longue (trio, Nina
  part, Alice dort 26 s et se réveille, se rendort, revient) — VERTES sur
  la branche ET sur v258, avec le journal des retraits côté hôte : après
  la présentation d'Alice revenue, l'ancienne page se rebranche huit à dix
  fois en quatre secondes (`remplace` + fermeture à 400 ms, chemins
  `_evinces` et « présentation d'un fantôme »), puis se tait ; Alice
  revenue n'est jamais retirée. La panne a donc besoin du contexte de la
  suite (les scénarios de véhicules et de météo entre les deux, trois
  pages ouvertes plus longtemps) et n'est PAS prouvée introduite par la
  v259 — un rouge de suite contre un vert de sonde, sur le même code. Le
  témoin imprime désormais les retraits de l'hôte quand il rougit : le
  prochain rouge de portail dira qui a retiré Alice, quand, par quel
  chemin. ET IL L'A DIT, au portail de la v261 (`scratchpad/v261/portail-v261.log`,
  l. 618) : `{"dt":20114,"id":"d629c7","nom":"Alice","pret":true,"seen":20142,
  "quoi":"drop","pile":"net.js:1014"}` — c'est le DÉLAI DE SILENCE (`STALE_MS`,
  vingt secondes) : la présentation d'Alice revenue est arrivée (`pret`, son
  nom), puis PLUS AUCUN message d'elle n'a atteint l'hôte en vingt secondes
  (`seen` jamais rafraîchi après la présentation), alors qu'elle recevait
  ceux de l'hôte (elle voit Marlon, compteur 2). Ce n'est ni un `remplace`,
  ni un fantôme, ni un lien fermé. Et le MÊME symptôme ouvre cette suite au
  portail : « à trois, chacun voit les deux autres » rouge —
  `[["Alice"],["Marlon"],["Alice","Marlon"]]` — l'hôte ne reçoit rien de
  Nina, qui reçoit tout. Sous charge (trois pages, une image par seconde),
  un invité neuf est donc entendu une fois (sa présentation) puis plus
  jamais, tout en entendant l'hôte. Pistes, dans l'ordre : (1) l'invité
  envoie `pos` par `envoyer(c)` sur `c.conn`, la case de l'hôte — si la
  patience de cinq secondes a expiré et fait basculer sur le nuage, puis que
  le direct s'est ouvert (`promouvoirSiDirect`), la présentation et les
  positions ne partent pas forcément par le même chemin ; l'hôte, lui, peut
  tenir une case DIRECTE présentée et ne plus rien recevoir dessus si
  l'invité écrit sur un autre lien ; (2) `conn.open` vrai côté hôte et faux
  côté invité sur le même canal. La sonde à écrire journalise, chez
  l'invité, par QUEL lien partent la présentation et chaque `pos`
  (`conn.peer`, `parNuage`, `open`, `dataChannel.readyState`) et, chez
  l'hôte, chaque lien reçu par pair — et elle provoque la lenteur (bridage
  ×4 ou deux pages de plus) au lieu de l'attendre. Vert seule, rouge sous
  charge : c'est un rouge de production possible sur un Wi-Fi lent, pas
  seulement un rouge de banc. À la v260 : rouge aux deux portails (dont « à trois, chacun voit
  les deux autres » une fois), puis rejouée SEULE : rouge sur la branche
  (69 verts) ET rouge sur `origin/main` en v259 (69 verts), « hôte 1 ·
  Alice 2 » les deux fois. Le matin, seule sur `origin/main` en v258 et sur
  la branche v259 : verte. Deux lectures possibles — le banc, ou la v259
  fusionnée entre les deux (rien de réseau dans son diff, mais un rouge
  qui suit une fusion se vérifie) : rejouer `reseau.js` seule sur un arbre
  v258 (`7c9163c`, `git worktree`) le même jour tranche. À FAIRE EN
  PREMIER — c'est du réseau, et l'hôte qui ne voit plus qu'un joueur est
  ce qu'un enfant vit comme « il a disparu ».
- [ ] **(historique v259) « La reprise tient dans la durée » rouge au portail
  complet, verte seule des deux côtés (v259).** Deux portails de suite sur
  la branche : « hôte 1 · Alice 2 » (l'hôte ne voit plus qu'un joueur
  vingt-cinq secondes après le retour d'Alice sur la même tablette). Rejouée
  SEULE : verte sur `origin/main` (v258) ET sur la branche, « hôte 2 ·
  Alice 2 », 71 témoins des deux côtés (`scratchpad/v259/reseau-suite-*.log`).
  Le code réseau n'a pas bougé en v259. C'est la famille des rouges de
  portail de la v220 : une suite verte seule est un fait plus fort qu'un
  rouge derrière dix suites. Cause ouverte ; piste : ce témoin arrive
  derrière `monte.js` et `manhattan.js` et lit un compteur de pairs à
  vingt-cinq secondes fixes — mesurer ce qui distingue l'hôte au portail
  (charge stable à 3,7 cœurs pendant toute la suite) de l'hôte seul.
- [x] **UN TROISIÈME JOUEUR N'EST PAS VU DES DEUX AUTRES — mesuré des deux
  côtés (v264).** TROUVÉ ET CORRIGÉ en v266. La cause n'était ni le lien, ni
  la veille : **le fil principal du nouvel arrivant est bloqué vingt-neuf
  secondes dans une SEULE tâche** pendant que son monde se charge (pas médian
  de son minuteur de 100 ms : 100 ms ; pire tour : 29 128 ms). Il n'émet rien,
  ne reçoit rien, et l'hôte le retire à 22 s de silence — lien `open`, canal
  `open`. La règle des vingt secondes avait été écrite pour les pairs RELAYÉS
  et s'appliquait à tout le monde ; elle ne juge plus que ceux qu'on ne peut
  pas sonder, et l'hôte annonce `dodo_de` à la moitié du délai pour que
  l'autre invité ne conclue pas avant lui. Témoin neuf qui GÈLE la page du
  troisième joueur vingt-cinq secondes : rouge sur `origin/main`, vert deux
  fois de suite ici. Sondes : `scratchpad/v266/sonde-trio.cjs`,
  `sonde-veille.cjs`, `sonde-famine.cjs`, `sonde-gel.cjs`.
  Le texte d'origine : « À trois, chacun voit les deux autres » (`reseau.js`) rend
  exactement `[["Alice"],["Marlon"],["Alice","Marlon"]]` et le compteur
  `2/2/3` : **Nina voit l'hôte et Alice, mais ni l'hôte ni Alice ne la
  voient.** Elle arrive, elle reçoit, et ce qu'elle émet ne parvient à
  personne — ou l'hôte ne la relaie pas. Les invités ne sont pas reliés entre
  eux : leurs positions transitent par l'hôte, et c'est ce chemin-là qui
  lâche pour le SECOND invité.
  Mesuré, la suite rejouée SEULE dans les deux arbres : branche trois tours,
  rouge trois fois ; `origin/main` deux tours, un vert (93 s) puis un rouge
  aux MÊMES valeurs (104 s). REMESURÉ en v265, toujours SEULE des deux
  côtés : `origin/main` un vert puis un rouge (116 s, mêmes valeurs au
  caractère près), branche un vert puis un rouge (121 s). Il va et vient sur
  les DEUX arbres, à la même fréquence. Ce n'est donc pas la livraison en
  cours — c'est en production, et cela touche Marlon, Alice et un ami. À reprendre en
  propre : une sonde qui distingue les cas plutôt qu'une hypothèse — Nina
  est-elle inscrite chez l'hôte, ses messages arrivent-ils, l'hôte les
  relaie-t-il ? — et non le témoin qu'on rejoue.
- [ ] **Le programme de la flamme se compile au DÉCOLLAGE (v264).** Les deux
  cônes additifs de `flamme()` (avions.js) naissent invisibles : three ne
  compile leur programme qu'à la première image où ils sont RENDUS, c'est-à-
  dire quand l'enfant appuie sur ✈️. Un seul programme, mais c'est une
  compilation dans l'image d'un geste — la famille du gel de la v246. Le
  remède est celui de la maison : chauffer cette signature à l'accueil
  (`chaufferLesProgrammes`, vehicules.js) comme les quatorze de la flotte.
  À faire dans la livraison qui touchera déjà aux avions, avec la mesure de
  `renderer.info.programs` avant et après le premier décollage.
- [x] **LES BORNES DE GARDE DE `monte.js` SONT POSÉES SUR UNE MACHINE PLUS
  RAPIDE QUE CELLE-CI (v264).** FAIT en v265, en une passe sur le fichier :
  relevés de virage 250 → 100 (tombée à 92 puis 203, toujours ZÉRO saut),
  blocs parcourus en vol 100 → 40 (tombée à 66 en v264, 90 en v265, le
  verdict vert des deux côtés), images du gel de Paris 60 → 30 (tombée à 56
  pendant que le verdict tombait pour sa propre raison ; trente est la valeur
  que `programmes.images` emploie déjà pour dire « la boucle de rendu vit »).
  Reste « une poule ne propose pas de monter dessus », qui va et vient sur le
  même code — verte au portail de la v265 et sur `origin/main` seule, rouge
  au portail précédent et sur la branche seule : c'est une lecture de bouton
  600 ms après la pose, à remplacer par une attente bornée.
  Le texte d'origine : Après le redémarrage du conteneur, la cadence
  du banc est tombée de 5,4 à 4,4 images par seconde au même endroit, et deux
  témoins de `monte.js` ont rougi sur la BRANCHE en ne mesurant rien : « elles
  tournent progressivement » exige 250 relevés et n'en a eu que 73 — avec ZÉRO
  saut, donc le comportement est bon — et « une poule ne propose pas de monter
  dessus » lit le bouton 600 ms après la pose. Les deux sont verts au tour
  d'avant sur le même code, et verts sur `origin/main`. C'est le piège déjà
  écrit trois fois : une borne de garde se pose à la MOITIÉ de ce qu'une
  machine qui respire a rendu, jamais juste en dessous. À reprendre en une
  passe sur TOUTES les bornes du fichier, comme la v237 l'a fait.
- [ ] **UNE FILE DE MAILLEUR AU-DELÀ DU GENOU FAIT ROUGIR LE PORTAIL ENTIER
  (v265) — mesure faite, à rejouer le jour où l'installation d'une géométrie
  changera de prix.** Posée à quarante-huit sur le seul DÉBIT, elle a rendu
  SEPT suites rouges dont QUATRE vertes la veille, toutes de cadence.
  Ramenée au genou mesuré (seize), le portail retombe aux rouges de fond.
  Le chiffre à remesurer est le couple (débit de pointe, images par
  seconde) — sonde `scratchpad/v265/sonde-genou.cjs`, `?attente=` le règle.
  Le vrai remède, si l'on veut aller plus loin : BORNER l'installation des
  géométries sur le fil principal comme le maillage l'est déjà
  (`MESH_MS_PAR_SECONDE`), au lieu d'installer tout ce qui arrive dans
  l'image où il arrive. Non fait, non mesuré.
- [ ] **LA FILE DU MAILLEUR EST REVENUE À HUIT (v269) — ET LE VRAI REMÈDE
  RESTE À TROUVER.** Seize rendait le jeu impraticable sur l'iPad de Max
  (mesuré au-dessus de Paris à rr=12 : 9,1 images par seconde contre 18,3, et
  3,1 % du temps en images de plus de trois cents millisecondes). Le prix du
  retour est réel et se voit : le trou devant soi tombe de 132 à 66 blocs,
  donc les bâtiments se dessinent plus tard — la panne que la v251 avait
  corrigée. Ce qu'on VOUDRAIT, c'est le trou de seize avec la fluidité de
  huit, et DEUX pistes ont été écrites, mesurées et RETIRÉES ; on ne les
  réessaie pas :
  (a) borner la pose des géométries par image — 10,63 images/s contre 10,20,
  du bruit, parce que borner le travail par IMAGE ne réduit pas le travail
  par SECONDE ;
  (b) faire de la file un TEMPS — le coût d'un morceau ne sépare pas la ville
  de la campagne en vol (4,4-12,2 ms contre 3,4-8,3), la file part à son
  plafond partout et rend 6,0 images/s, pire que seize.
  **La prochaine étape est une MESURE SUR LA TABLETTE, pas sur ce banc** :
  `?attente=4|8|12|16` avec `?diag=1`, en vol au-dessus de Paris et en
  campagne, parce que le rapport entre maillage, installation et rendu n'est
  pas celui d'un rendu logiciel — c'est la règle de la v245, et c'est
  précisément ce qui a fait choisir seize à tort. Le vrai suspect restant est
  l'INSTALLATION d'une géométrie (upload au pilote), que SwiftShader ne
  modélise pas comme un vrai GPU.

- [x] **LE PLATEAU DE VITESSE DES AVIONS A ÉTÉ MESURÉ SUR UNE FILE QUI
  N'EXISTE PLUS — REMESURÉ ET CORRIGÉ DANS LA MÊME LIVRAISON (v269).** La
  v265 avait porté les avions de 110 à 160 blocs par seconde sur une file de
  seize ; la file revenue à huit, 160 ne tient plus. Ce n'est pas resté une
  dette : **le témoin du trou de `monte.js` l'a rendu rouge au portail**
  (51 et 58 pour une barre de 80), et une dette qu'un témoin rougit n'est
  pas une dette, c'est une régression. Remesuré au même critère, file de
  huit, seul : 95 → 115 · 110 → 112 · 120 → 93 · 130 → 80 · 145 → 80 ·
  160 → 64. Retenu 95 (avion de ligne) et 120 (Concorde, chasseur) ; le
  portail complet coûte quinze pour cent du trou, ce qui écarte 130 (trois
  blocs de marge). `kmh` est intact : le compteur affiche toujours Mach 1,8.
  Et la barre du témoin se CALCULE désormais (`max / 2` par appareil), au
  lieu des quatre-vingts écrits en dur depuis la v229.

- [ ] **LE MÉTRO DE WASHINGTON NE PASSE PLUS EN STATION — DÉFAUT DE
  PRODUCTION, MESURÉ DES DEUX CÔTÉS (v270).** « Une rame passe, et on propose
  de monter dedans » (`{"existe":true,"visible":false}`), « la pastille dit de
  quelle ligne il s'agit » (🚇 au lieu de 🔵) et « le métro nous emmène à la
  station suivante » (Smithsonian → Smithsonian, 0 m) tombent aux portails des
  v268, v269 et v270.

  **Rejoués SEULS des deux côtés, deux passages chacun — rouges 4 fois sur 4,
  avec les MÊMES valeurs :**

  | passage | `origin/main` (v269) | branche (v270) |
  | --- | --- | --- |
  | seule, 1 | 3 échecs, 0 m en 36 s | 3 échecs, 0 m en 34 s |
  | seule, 2 | 3 échecs, 0 m en 33 s | 3 échecs, 0 m en 34 s |

  Donc EN PRODUCTION, et pas de la livraison en cours. **Et la supposition
  « verts rejoués seuls » était FAUSSE** : elle venait d'un relevé de la v256
  (rame visible, pastille 🔵, Smithsonian → Federal Triangle, 17 m en 6 s),
  donc d'un autre code. Une mesure vieille de quatorze versions n'est pas une
  mesure de l'état d'aujourd'hui — c'est exactement le reproche qu'on fait à
  un témoin qui ne peut pas voir un changement.

  Ce n'est donc PAS de la charge de banc : la rame n'arrive vraiment plus au
  quai de Smithsonian. Ce qui a changé entre la v256 et la v268 est à
  chercher ; pistes, dans l'ordre : le nombre de rames par ligne et leur
  cadence (v222 : « le tour divisé par la demi-minute »), la portée
  souterraine (`VU_SOUTERRAIN`, quarante blocs) contre la position du quai, et
  le fait que la boucle du témoin attende trente-six secondes de JEU quand le
  banc tourne à trois images par seconde. La sonde à écrire est celle qui
  DISTINGUE les trois : où est la rame la plus proche, à quelle distance du
  quai, et avance-t-elle.

- [ ] **LE PORTAIL DE LONDRES (v339, d'abord numérotée v331, v333 puis v337).** Premier passage, neuf suites. Vertes : `metro.js`,
  `carteMonde.js` (les trois témoins du kit de Londres, rouges sur
  `origin/main`), `sauvegarde.js`, `plafond.js` (la ville d'avant sous les
  blocs d'enfant, rouge désarmée), `washington.js`. Rouges :
  · `carte.js` « chaque bus est sur la chaussée » 4/5 — LE MIEN : le bus de
    Whitehall tombait dans l'emprise du Parlement, que le repère pave après les
    colonnes. Corrigé (`horsDesMonuments`), `carte.js` rejouée seule : ce
    témoin vert, reste la flèche du GPS (gauche 1,92 rad), l'intermittence
    déclarée v327, rouge seule sur `origin/main` ;
  · `maj.js` le fond de carte à la libération — rejouée seule sur
    `origin/main` : même rouge (dette v276) ;
  · `manhattan.js` la géométrie de façade et le taxi au tactile — mêmes deux
    rouges sur `origin/main` rejouée seule (qui meurt ensuite d'un délai) ;
    `PeerJS: Lost connection` (dette réseau v240/v327) non atteint là-bas ;
  · `monte.js` l'écran qui se fige à l'arrivée (rouge seul sur `origin/main`,
    48,3 %), la compilation à la téléportation et la voiture au bord de l'eau
    — deux intermittences déjà mesurées des deux côtés (v326, v327).
  SECOND PASSAGE (après la fusion de la v332) : vertes `metro`, `parent`,
  `parishd`, `carteMonde`, `sauvegarde`, `plafond`, `visio`, `realisme`, `hote`,
  `reglages`. Rouges, tous rejoués seuls des deux côtés :
  · `washington.js` « on entre dans l'Air et l'Espace » — vert seul sur la
    branche ET sur `origin/main` : délai de banc ;
  · `reseau.js` « un hôte sans courtier est trouvé… » (et « il le REJOINT ») —
    rouge seul sur la branche, vert seul sur `origin/main` au premier rejeu,
    PUIS rouge seul sur `origin/main` au second (`[[],[]]`, `actif: false`) et,
    le même tour, la branche rend rouge le témoin voisin « deux enfants se
    retrouvent sans courtier du tout ». Même distribution des deux côtés
    (v269) : l'intermittence du chemin par le nuage seul, que Londres ne
    touche pas — aucun de ces témoins ne quitte le point d'apparition ;
  · `monte.js` le gel d'arrivée (rouge des deux côtés), la compilation à la
    téléportation (intermittence v326/v327), et « un train s'arrête devant la
    voiture de l'enfant » (13 relevés dedans, déjà vu une fois sur
    `origin/main` seul, ligne 308 de ce fichier) ;
  · `maj.js`, `carte.js` (GPS), `manhattan.js` : les dettes du premier passage.
  TROISIÈME PASSAGE (après la fusion de la v336, seize suites) : rouges `maj.js`
  (libération, programmes 22/27), `carte.js` (GPS), `manhattan.js` (façade),
  `monte.js` (gel d'arrivée), `reglages.js` (la langue de l'autre tablette,
  serveur `"fr"`, dette déjà doublement mesurée) et `realisme.js` (délai au
  clic « Plus tard », charge 4,69). Rejouées SEULES des deux côtés,
  `realisme.js` (17 témoins) et `reglages.js` (70 témoins) sont VERTES sur la
  branche ET sur `origin/main` v336. Puis fusion de la v338 (deux autoroutes,
  `routes.js` seul en code) : `carteMonde.js` et `plafond.js` rejouées.

- [ ] **LONDRES À LA RÈGLE DU KIT : CE QUI RESTE (v339).** Londres est passée à
  `voirie.js` (artères en collectrices, rues de quartier en locales, trame
  collectrice recomposée, trame qui ne double plus une avenue). Le prix,
  mesuré quartier par quartier en part de lots : Soho 18,6 → 10,1 %,
  Bloomsbury 22,7 → 14,2, Holborn 27,6 → 14,5, Southwark 27,4 → 16,2 ; St
  James 26,6 → 37,4, Marylebone 32,7 → 36,9, la City 8,6 → 24,0 ; le disque
  26,1 → 26,6. La cause est le PLAN : vingt-quatre blocs par kilomètre, la
  moitié de Paris, donc soixante-dix avenues deux fois plus serrées. Le seul
  remède qui rende ces quartiers est celui de Paris (v306) : doubler le plan,
  ce qui déplace la Tamise et donc `terrainHeight` — une DÉCISION DE MAX, avec
  migration des blocs. Restent aussi, déclarés : aucune artère n'est un
  boulevard (quatre voies = vingt et un blocs d'emprise, aucune n'a la place) ;
  la City garde des collectrices et non des ruelles ; les rues de la trame qui
  s'arrêtaient sur une avenue parallèle n'existent plus, mais celles qui
  arrivent EN BIAIS (35° à 90°) restent — à mesurer en capture si l'une
  finit en impasse contre un îlot.

- [ ] **SAN FRANCISCO À LA RÈGLE DU KIT : CE QUI RESTE (v361).** La part bâtie
  du disque passe de 49,0 à 32,6 % : à vingt-sept blocs par kilomètre, une
  collectrice de 11,4 blocs d'emprise vaut quatre cents mètres, et les avenues
  prennent 27 % du disque. Le Richmond 30,7 → 15,1, le Sunset 42,0 → 31,1,
  Bayview 38,3 → 27,5. Le seul remède qui rende ces quartiers est celui de
  Paris (v306) : doubler le plan — décision de Max. Restent aussi : aucune
  voie n'est un boulevard (Market en est un dans la vraie ville) ; les
  collines gardent leurs rues droites, sans la pente bornée du kit.
  Le centre, recomposé en parcelles (quatre par îlot) et en tapis de huit à
  quatorze étages, n'a plus que les tours au sud de Washington Street ;
  Fisherman's Wharf sort du centre. Pier 39 (5 blocs) n'est pas mesuré par
  le témoin des monuments : 36 colonnes bâties autour pour un seuil de 40.
  Le jour où le quartier se densifie, il sera dominé — et c'est une JETÉE,
  à déclarer `vrai` dans `BAS_DECLARES` (fichier d'une autre session).
  Portail de la v361 (base v359) : `maj.js` personnages 6/9, `manhattan.js`
  trou 14460 → 51734, `monte.js` chauffe de New York et gel d'arrivée, et
  `carte.js` la flèche du GPS (gauche 1,92) — tous déjà déclarés plus haut.
  Second portail (base v360, parcelles) : les mêmes, plus `carte.js` le
  glisser bridé ×4 (425 ms, déclaré au portail de la v359) et `monte.js` les
  passants de Rome (21 % pour 20, le tirage de la v291, déclaré à la v319).

- [ ] **PORTAIL DE LA v359 (Nice) : UNE CASCADE DE `monte.js` QUE LA SUITE
  SEULE NE REND PAS.** Au portail complet (base v349), `monte.js` a rendu
  trente-quatre rouges d'un seul tenant : tous les témoins d'avion et de
  voiture qui suivent le gel d'arrivée rendent « pas aux commandes », et le
  doigt du joystick tombe sur `cible: "quiz"` — une fenêtre de quiz recouvre
  l'écran alors que `jouerSeul` pose `libreJusqua = 86400`. Rejouée SEULE,
  l'une après l'autre : `origin/main` (d34cfa5) 147 verts, 3 rouges ; la
  branche 147 verts, 3 rouges — les MÊMES deux témoins des deux côtés, déjà
  déclarés (« le bout du monde qui se charge », trou 51-58 pour une barre de
  60 ; « l'écran ne se fige pas », 19 % et 36 % au-delà de 300 ms), et aucune
  fenêtre de quiz. Le changement ne touche que la génération de Nice, où
  aucune suite du portail ne va. Piste, non mesurée : le portail a duré 28 min
  pour `monte.js` (contre ~23 au portail de la v342) et `libreJusqua` est en
  secondes de jeu — si le quiz suit une autre horloge (le temps d'écran réel,
  `dtEcran`, v234), une suite plus longue peut l'ouvrir. À démonter par une
  sonde qui lit `edu.today()` et l'heure du prochain quiz au moment du
  premier « cible quiz ». `maj.js` (fond de carte, 7/9 personnages) et
  `manhattan.js:282` (💥 délai de 60 s) : dettes déjà déclarées plus haut.
  Deux rouges de plus, NON déclarés avant ce portail, avec leur double mesure :
  `carte.js` « et la faire glisser non plus (bridé ×4) » — pire tâche 415 ms
  au portail (barre 400), 957 ms rejouée SEULE sur `origin/main` (d34cfa5),
  468 ms rejouée SEULE sur la branche : rouge des deux côtés, la barre est sous
  le coût d'une tâche de ce banc (v225). `reseau.js` « deux tablettes d'une
  partie voient la même circulation » — écart médian 20,9 blocs au portail,
  60,3 rejouée seule sur `origin/main`, VERTE rejouée seule sur la branche :
  intermittence vue des deux côtés (la grille horaire de la v305 n'est pas
  touchée ici).
  Au portail suivant (base v356) : `visio.js` « caméra éteinte, le jeu
  reprend sa voix normale » — 0,0197 après pour 0,0255 avant au portail,
  VERTE rejouée seule sur la branche (0,0181 → 0,0194) ET sur `origin/main`
  v358 (0,0161 → 0,0154) : un niveau de sortie audio lu sous charge.
  `monte.js` « 🛬 descend train sorti… jusqu'à l'arrêt » — l'arrêt tombe à
  x = 300,1, AU BOUT de la piste d'essai de trois cents blocs : c'est le piège
  de la v273 (l'atterrissage assisté consomme presque toute la piste, la
  cadence décide où il s'arrête). Le témoin devrait lire l'arrêt sur une piste
  plus longue ou borner x < 300 avant de juger. Aucune ligne d'avion n'est
  touchée par les rues de Nice.

- [ ] **NICE À LA RÈGLE DU KIT : CE QUI RESTE (v359).** Masséna 13,2 → 8,6 % de
  lots, les Musiciens 20,4 → 14,5, le port 21,8 → 16,4 : les avenues du
  centre se serrent autour de la place. Le Vieux-Nice passe aux rues LOCALES
  (3,1 m, trottoirs de 2 m), comme les ruelles héritées de Paris ; ses vraies
  ruelles sont piétonnes et plus étroites — la section `ruelle` du kit (sans
  trottoir) ôterait ses réverbères, décision de Max comme pour les médinas.

- [ ] **PORTAIL DE LA v368 (Lille), après la fusion des v366 et v367.** Dix
  suites. Rouges, tous déjà déclarés ici : `maj.js` la libération et « ne
  floute rien », plus les deux témoins du palier (six images, aucun verdict —
  la charge, ma sonde de circuits tournait à côté ; rejouée SEULE, les deux
  sont verts et restent les intermittences du loader, lignes 79, 98, 977) ;
  `carte.js` la flèche du GPS et le glisser bridé (446 ms) ; `washington.js`
  l'Air et l'Espace (et, seule, « chaque îlot a sa porte » — intermittence de
  la ligne 438) sur un `washington.js` que Lille ne touche pas ; `manhattan.js`
  le trou de façade et le taxi ; `monte.js` la compilation à la téléportation.
  Après la fusion de la v367 (I-95), `carteMonde.js` et `plafond.js` rejouées
  seules : 156 et 115 verts, zéro rouge.
- [ ] **PORTAIL DE LA v368 (Lille), base v361.** Rouges tous déjà déclarés :
  `maj.js` la libération (`null`, personnages 3/9) et « ne floute rien » ;
  `carte.js` la flèche du GPS (gauche 1,92) et une fois le glisser bridé
  (441 ms) ; `manhattan.js` le trou de façade (9 203 → 46 592) et le bouton du
  taxi ; `monte.js` la chauffe de New York, le gel d'arrivée, une fois les
  passants de Rome (33 %) et une fois le bout du monde (trou 72 pour l'avion
  de ligne). `plafond.js` a rendu une fois « la surface coûte quelques
  millisecondes » (8,5 ms contre 2,6) au premier portail, vert au second
  (2,7 contre 1,5) : la charge du banc, un chiffre de durée. Aucun ne lit Lille.

- [ ] **LES CINQ AUTRES VILLES BÂTIES À LA MAIN N'ONT PAS ÉTÉ ÉLARGIES (v271).**
  Londres est faite en v339, Nice en v359, San Francisco en v361, Lille en
  v368. **Reste Washington, et ce n'est pas la même passe** (mesuré en v368) :
  ses diagonales ont déjà la chaussée d'une collectrice (5,2 à 6,8 blocs), ce
  qui reste hors règle c'est la GRILLE — deux colonnes de chaussée et une de
  trottoir, un pas de douze. Or le pas porte trois choses que les autres
  villes n'ont pas : la maison de 9 × 9 avec son escalier et ses deux portes
  (`batirColonneWashington`, coordonnées d'îlot `mu − 3`), vingt-trois rues
  de raccord posées au centre EXACT des rues de la grille (12k + 1,5 : C, F,
  H Street, la 3e, la 9e, la 14e, la 15e…), et dix-neuf circuits mesurés sous
  la contrainte de partage de la v211 qui roulent sur ces raccords. Une rue
  locale du kit fait sept blocs d'emprise : en gardant l'îlot de neuf, le pas
  passe à seize et la part de lots du disque tombe de 15,8 % à près de 9 ; en
  suivant le rapport des emprises (la règle des autres villes), le pas passe à
  vingt-huit et la maison doit être redessinée pour un lot de vingt et un.
  Dans les deux cas, TOUTES les rues nommées de la grille changent de place et
  les dix-neuf circuits se remesurent (passe de réparation comprise, v216). À
  faire en une livraison à elle : choisir le pas (décision de plan), réécrire
  la maison sur un îlot paramétré, reposer les raccords sur la nouvelle grille,
  remesurer les circuits, figer `washington-v368.js` sous ce qu'un enfant a
  bâti — et le portail de `washington.js` (portes, métro, musées) en entier. La méthode de
  Londres se reprend telle quelle : figer la ville d'avant (`<ville>-v339.js`),
  type par fonction, trame recomposée et en recul des avenues, mobilier sur la
  section, la ville d'avant sous ce qu'un enfant a bâti.
  *(Entrée d'origine :)* Paris,
  Londres, Nice, Lille, Washington et San Francisco gardent leurs largeurs de
  chaussée relevées sur de vrais plans, par quartier (`rue`, `face` dans chaque
  fiche) : la v271 n'a élargi que la trame des villes ENGENDRÉES. Leurs
  circuits sont des polylignes, pas des rectangles, donc la conduite à droite y
  demande un décalage de polyligne et une remesure des huit à dix-neuf circuits
  par ville (`circuitSurRue`, l'angle des virages, la contrainte de partage).
  C'est la livraison suivante, et le piège est nommé : **une largeur ne se
  projette pas, elle se relève** (v187).

- [ ] **PORTAIL DE LA v370 (Washington), double mesure faite.** Vertes :
  `carteMonde.js` (le témoin neuf de la grille, rouge sur `origin/main`),
  `plafond.js`, `washington.js` (les maisons, les portes, le métro), `metro.js`,
  `sauvegarde.js`. Deux rouges de la livraison, corrigés : l'empreinte des 490
  morceaux (le lieu « washington » change ; mesurée lieu par lieu, les huit
  autres identiques au bit près des deux côtés) et le Musée afro-américain sous
  la médiane de ses voisins (le Triangle fédéral descend à 12–14). Rouges déjà
  déclarés : `maj.js` le loader et le palier (charge du portail), `carte.js` la
  flèche du GPS et le glisser bridé (515 ms), `manhattan.js` le trou et le
  taxi, `monte.js` le gel d'arrivée et « descend train sorti » (ligne 281).
  Après la fusion de la v369, `plafond.js` rejouée seule : 116 verts, un rouge
  de durée déjà déclaré (« la surface coûte quelques millisecondes »).
- [x] **v370 — LA GRILLE DE WASHINGTON À LA RÈGLE DU KIT.** Pas de 28, rue
  locale (3 de chaussée, 2 + 2 de trottoir), quatre maisons et une ruelle par
  îlot, ville d'avant figée (`washington-v367.js`), quatorze circuits. Les
  cinq villes bâties à la main sont à la règle (Londres v339, Nice v359, San
  Francisco v361, Lille v368, Washington v370). Ce qui reste, DÉCLARÉ :
  · les diagonales gardent leur trottoir de 0,45 : le kit en veut 2,5 pour une
    collectrice, et l'élargir mange les lots qu'elles coupent en biais — une
    passe à elle, avec la remesure des circuits ;
  · Independence et Constitution (derrière les musées, v205) et la 3e Rue du
    Mall (entre la pelouse et le parc du Capitole) gardent leurs deux colonnes
    de chaussée : ce sont les monuments qui les bornent ;
  · sans voitures après la recherche : Maryland Avenue SO (11/44 points),
    Virginia Avenue NO (15/53), la 7e Rue SO (3/24) — leurs boucles se
    heurtent aux circuits du Mall et de Foggy Bottom sous les vingt blocs de
    partage ; la 9e, la 14e, la 15e, C et F Street ne sont plus des rues ;
  · la part de lots passe de 14,2 à 11,2 % : un îlot de vingt et un porte
    quatre maisons de neuf, pas un bâtiment de vingt et un.

- [ ] **IL RESTE DES ANNEAUX QUI SE PARTAGENT DIX-HUIT BLOCS (v270).** La
  contrainte de la v211 est désormais appliquée aux villes engendrées : 265
  villes en faute deviennent 0, le pire partage tombe de 576 blocs (Shanghai)
  à 18 (São Paulo). Dix-huit, c'est SOUS la barre d'un carrefour, donc ce
  n'est pas un défaut — mais c'est la limite, et deux voitures peuvent s'y
  croiser de près. Le remède, s'il en faut un, n'est pas de serrer la barre
  (mesuré : à 12, le nombre d'anneaux ne bouge pas, les candidats partagent
  beaucoup ou presque rien) mais de donner à ces villes des tracés qui ne
  soient pas des rectangles — ce qui est le même chantier que « de vraies
  rues partout, à deux voies ».

- [ ] **LE JEU DE CANDIDATS ÉLARGI POUR LES ANNEAUX : NON-RÉSULTAT MESURÉ
  (v270).** Sept fois plus de candidats (quatorze tailles au lieu de sept,
  vingt-cinq décalages au lieu de neuf, sept formes au lieu de trois) ne
  rendent que 17 anneaux sur les 298 que la contrainte de partage retire.
  « Le prix se paie avec des rues » (v216) ne marche pas sur une trame
  rectangulaire : il n'y a pas assez de places distinctes. Écrit, mesuré,
  retiré — qu'on ne le réécrive pas.

- [ ] **`manhattan.js` : QUATRE ROUGES, TOUS MESURÉS IDENTIQUES SUR
  `origin/main` (v269).** Le portail de la v269 a rendu quatre échecs :
  « le trou enlève aussi la géométrie visible de la façade » (9 203 →
  51 734), « fenêtres et éclairage public fonctionnent la nuit », « les
  ombres suivent le soleil et la lune visibles » (`[1, -1]`), et un délai sur
  `#ride-btn` (ligne 416). Rejouée SEULE des deux côtés, cinq passages :

  | passage | `origin/main` (v267) | branche (v269) |
  | --- | --- | --- |
  | au portail | — | 4 échecs : les 3 nommés + `:416` |
  | seule, 1 | 4 échecs : les 3 nommés + `:416` | délai `:282` |
  | seule, 2 | 5 échecs : les 3 nommés + taxi tactile + PeerJS | délai `:282` |
  | seule, 3 | délai `:282` | — |

  Les trois témoins nommés sont rouges à l'identique sur `origin/main` chaque
  fois qu'ils sont ATTEINTS (3 fois sur 3), avec les mêmes valeurs — donc en
  production. Et le délai de la ligne 282 (la file de construction de
  Manhattan qui ne se vide pas en soixante secondes) tombe DES DEUX CÔTÉS :
  deux fois sur deux sur la branche, une fois sur trois sur `origin/main`.
  **v276, quatre passages de plus, alternés** (branche, main, main, branche) :
  délai `:282` sur la branche 2/2 et sur `origin/main` 1/2 ; le passage de
  `origin/main` qui a FRANCHI la ligne 282 a rendu les mêmes quatre rouges de
  contenu, aux valeurs exactes de la v269 — `14 460 → 51 734`, les fenêtres de
  nuit, `[1, -1]`, le taxi tactile — plus le délai de `#ride-btn`. La v276 n'a
  pas touché une ligne de Manhattan. Sept passages sur deux versions disent
  donc la même chose : c'est en production.

  **C'est ce troisième passage qui a tranché** : sans lui j'aurais conclu que
  la branche l'avait introduit. Une intermittence ne se juge pas sur un
  passage de chaque côté.

  Ce qui reste à faire : Manhattan tourne à 0,4 image par seconde sur ce banc
  en rendu logiciel (mesuré v259), et ces témoins lisent des effets à
  quelques centaines de millisecondes — ils sont un pile ou face. Avant
  d'accuser le jeu, il faut soit leur donner une page qui tourne (`?ombres=0`
  est déjà le cas, `rr` plus bas ne suffit pas), soit les reformuler pour
  qu'ils PROVOQUENT la situation au lieu de l'attendre (règle des poissons,
  v233).

- [ ] **`carte.js` : « un appui long dépose n'importe où » — VERTE DES DEUX
  CÔTÉS REJOUÉE SEULE (v269).** Rouge au portail de la v269 (les quatre
  appuis déclinés par « pointeurs 0 », des images de 432 à 919 ms), verte
  rejouée SEULE sur la branche ET sur `origin/main` — la suite entière passe
  des deux côtés. C'est la famille de rouges de charge déjà connue de cette
  suite (v251, v258) : le minuteur de l'appui long tire en retard quand
  l'image dure presque une seconde. Le remède n'est pas de desserrer le
  témoin mais de lui donner une page qui respire, ou de provoquer l'appui
  sans dépendre d'un minuteur du navigateur.

- [ ] **LE RAPPORT DE VITESSE ENTRE LES AVIONS RESTE LOIN DU RÉEL (v269).**
  95 et 120 blocs par seconde font un rapport de 1,26, quand le réel (900 et
  2 180 km/h) est à 2,4. Le seul remède est de MAILLER PLUS VITE — 45 % du
  coût d'un morceau est la génération du relief — jamais de remonter la
  vitesse sans remonter le débit : c'est exactement l'erreur que la v265 a
  faite et que la v269 a payée. À reprendre après la mesure sur tablette
  ci-dessus, qui dira si la file peut remonter sans les gels.

- [ ] **`maj.js` : « corps, programmes et fond de carte sont vraiment là » —
  ROUGE DES DEUX CÔTÉS, REJOUÉE SEULE (v267).** Portail de la v308 : rouge
  (personnages 5/9 à 47 s, carte prête) ; rejouée SEULE, verte sur la branche
  (9/9, carte prête) et ROUGE sur `origin/main` v307 (8/9, carte absente) —
  une intermittence de la préparation, pas le raccord. Vert jusqu'au portail de la
  v263, rouge à ceux de la v265, v266 et v267 : c'est donc EN PRODUCTION
  depuis la v265 (le portail de la v264 ne l'a pas jouée). Rejouée SEULE le
  même jour, `maj.js` entière, dans les deux arbres :
  branche `{carte:false, depuis:45121, cartePas:40, carteErreur:null,
  carteTravail:true}` ; `origin/main` (v266) `{carte:false, depuis:45128,
  cartePas:25, carteErreur:null, carteTravail:true}`. Corps 9/9 et programmes
  25/25 sont prêts des deux côtés ; **seul le fond de la carte du monde n'a
  pas fini en quarante-cinq secondes**, et il TRAVAILLE ENCORE — ce n'est
  donc ni une panne ni une erreur, c'est un calcul trop lent pour sa borne.
  Le bouton « Jouer » se libère quand même (c'est la borne de la v258 qui
  fait son travail) : l'enfant joue, la carte du monde arrive après.
  Ce qui reste à faire, dans l'ordre :
  (1) **MESURER AVANT D'ACCUSER.** Le fond avance par tranches de 8 ms par
  image (v258) ; à trois images par seconde en rendu logiciel, cela fait
  24 ms de calcul par seconde. Il faut savoir combien de PAS le fond
  demande en tout — `cartePas` va de 25 à 40 sur quarante-cinq secondes,
  mais le total n'est pas publié. Sans ce dénominateur on ne sait pas si
  l'on est à 10 % ou à 90 %, et l'on réglerait une borne au hasard.
  (2) La v265 a doublé la file du mailleur (8 → 16) : le fil principal
  INSTALLE deux fois plus de géométries par seconde, et le fond de carte
  prend ses 8 ms dans ce qui reste. C'est la dette de la v265 vue par un
  autre bout, et c'est la piste la plus probable — à confirmer par
  `?attente=8` sur cette page AVANT de toucher au fond.
  (3) Sur l'iPad, qui a une carte graphique, le rapport n'est pas celui du
  banc : ce chiffre ne se transpose pas (règle de la v245). À remesurer
  avec `?diag=1`.
  Le témoin, lui, ne se relâche pas : quarante-cinq secondes de boutons
  grisés sont la promesse faite à Max en v258, et la tenir est la
  correction.

  **Portail de la v318 (témoins seuls, diff de `src/` = une entrée de
  `nouveautes.js` + le numéro de cache) :** rouge, et rejouée SEULE — branche
  `libération null` + « ne floute rien » rouge (le second DÉPEND du premier :
  « une fois prêt : ? ») ; `origin/main` v317 rouge avec une libération lue
  (personnages 6/9, programmes 18/25), « ne floute rien » vert. C'est la paire
  déjà mesurée identique sur `origin/main` (tableau ci-dessus, « libération
  `null` · la page ne floute rien ») : la même intermittence, et aucun chemin
  de la préparation ne lit `nouveautes.js` (importé au clic sur le badge).
- [ ] **`reglages.js` : « elle s'aligne même dessus » va et vient (v266).**
  Rouge au portail complet de la v265 ET de la v266, VERTE rejouée seule sur
  la branche ET sur `origin/main` le même jour. Rien de `reglages.js` ni de
  l'espace parent n'a bougé depuis. C'est un rouge de portail, pas un défaut :
  à reprendre comme la poule, par une attente bornée sur ce que l'enfant
  obtient au lieu d'une lecture après un délai.
- [ ] **`reseau.js` : le témoin du passager va et vient (v265).** « Et l'on
  monte en passager : la voiture de l'ami nous emmène » est rouge une fois
  sur deux quand la suite est rejouée SEULE sur la branche (`roule 1,14 ·
  suivi 0,67 · écart 0,77`), et vert au portail et sur `origin/main`. Rien
  de `net.js` ni de `fun.js` n'a bougé en v265. À reprendre comme la poule :
  une attente bornée sur ce que l'enfant obtient, pas une lecture après un
  délai fixe.
- [ ] **« L'écran ne se fige pas en arrivant sur une ville » rouge au premier
  passage, mesuré des deux côtés (v259).** Deux portails de suite sur la
  branche (2 983 ms / 35,8 %, puis 1 817 ms / 12 % ; v261 3 300 / 38,3 ; v262
  3 017 / 34,6 ; v263 3 283 / 37,3 ; v264 3 183 / 37,7 ; v273 3 167 / 32,5 au
  portail et 3 483 / 37,6 rejouée seule ; v274 3 517 / 38,9 au portail et
  3 117 / 34,7 seule — le même premier survol),
  et le témoin extrait
  dans une sonde (`scratchpad/v259/sonde-gel.cjs`), deux tours de suite sur
  chaque arbre : branche 1 267 ms / 7,1 % puis 400 / 2,2 ; `origin/main`
  (v258) 1 367 ms / 9,7 % puis 300 / 0. Le PREMIER survol de Paris paie la
  compilation des programmes que le banc, ouvert avec `?prep=0`, n'a pas
  chauffés (v246, v258) ; le second est sous les barres des deux côtés.
  Piste : ce témoin demande `{ pret: true }` (la chauffe avant « Jouer »,
  comme `carte.js`), sinon il mesure la chauffe et non l'arrivée.

  **v276 — LA BARRE NE SÉPARE PLUS RIEN, ET C'EST CELA QU'IL FAUT RÉGLER.**
  Portail : 4 050 ms / 45,5 %. Sonde extraite du témoin mot pour mot
  (`scratchpad/sonde-ville.cjs`), DEUX tours par bras, en ordre alterné
  (branche, main, main, branche) :

  | bras | pire image (ms) | part > 300 ms | cadence |
  | --- | --- | --- | --- |
  | branche (v276) | 1 383 · 1 233 · **517** · 1 233 | 11,9 · 12,6 · **4,7** · 15,3 | 13,2 – 15,1 |
  | `origin/main` (v275) | 1 250 · 1 150 · 1 300 · 1 117 | 7,0 · 8,3 · 9,5 · 12,0 | 14,0 – 14,3 |

  Les deux nuages se RECOUVRENT, et un tour de la branche est vert : la
  livraison n'y est pour rien, et la distribution est la même des deux côtés
  (règle de la v269). Mais le fait neuf est ailleurs : la barre a été réglée en
  v235 sur 800 ms / 10,3 % (ancien code) contre 233 / 0 (neuf), et aujourd'hui
  les DEUX arbres rendent 1 117 à 1 383 ms sur une machine calme. **Une barre
  que les deux côtés franchissent ne mesure plus le jeu, elle mesure le banc en
  rendu logiciel** — et elle a rougi à chaque portail depuis la v259 sans
  jamais être démontée, c'est-à-dire qu'elle ne protège plus rien. À reprendre
  dans la refonte du banc : soit le témoin demande `{ pret: true }` et l'on
  remesure la barre sur la dispersion réelle, soit il mesure une grandeur que
  SwiftShader ne gouverne pas.
- [ ] **Rouges de portail de `manhattan.js` à une image par seconde, mesurés
  des deux côtés (v259).** ET LA FIN DE LA SUITE PEND, AU LIEU D'EXPIRER
  (portail de la v262) : après « la reprise cloud place l'enfant… » et un
  `souffler` « libre », plus une ligne pendant douze minutes ; `node
  manhattan.js` endormi (0,8 % de processeur), ses deux pages de Manhattan
  (l'hôte et l'invité de la fin de suite) vivantes depuis douze minutes, et
  le PROCESSUS GPU à 351 % — SwiftShader qui rend deux Manhattan à la fois.
  Un `page.evaluate` n'a pas de délai : quand le fil principal d'une page
  attend le rendu logiciel, le banc attend avec lui, sans borne. Tuée à la
  main pour que le portail enchaîne (la suite était déjà rouge, dette
  ci-dessus). À faire : borner la fin de suite (un `Promise.race` avec un
  délai autour de `creerMonde`/`rejoindre`/`evaluate` de cette scène, ou
  `rr=1` et une seule page de Manhattan à la fois), et lire dans
  `renderer.info.render.frame` que la page rend avant d'y évaluer quoi que
  ce soit. Quatre témoins — « le trou enlève aussi la
  géométrie visible de la façade » (l'« avant » lu pendant que les façades
  se construisent encore : 22 326, 9 203, 14 460 pour un « après » toujours à
  51 734), « fenêtres et éclairage public fonctionnent la nuit » (lu 350 ms
  après `__setDayTime`, sans image entre les deux), « les ombres suivent le
  soleil et la lune visibles » ([1, −1], même cause) et « le taxi roule avec
  les contrôles tactiles » (huit blocs exigés en quinze secondes, à 0,55 bloc
  par image : mesuré à la sonde, le taxi ROULE à 10,9 blocs/s, personne
  devant) — plus le rechargement qui dépasse ses 90 s. Rejouée SEULE sur
  `origin/main` (v258) : les mêmes quatre rouges et le même délai. Sonde :
  Manhattan rend 2 images toutes les 5 s sur ce banc, sur les deux arbres,
  zéro erreur de page (`scratchpad/v259/manhattan-*.log`). Piste : ces
  quatre témoins doivent ATTENDRE UNE IMAGE (compteur `renderer.info.render.frame`)
  avant de lire, et le taxi se mesurer en blocs par image plutôt qu'en blocs
  par seconde — leçon « un témoin qui lit l'effet d'une image attend l'image »
  (v249), à appliquer à `manhattan.js`.

- [x] **Vitesse des voitures par modèle (Max, après la v259) — FAIT en v260**
  (classe par modèle dans `FLOTTE`, `ALLURES` par classe, `allureMonture`
  dans fun.js). Reste à MESURER sur la tablette (`?diag=1`) le front de
  chargement en ville à 25,6 blocs/s : le banc n'y voit qu'une cadence
  d'image (une par seconde à `rr=12` dans Paris).

- [x] **Rouge de portail de `washington.js`, « on pousse la porte et on est
  dans la Rotonde », mesuré des deux côtés (v255) — RÉGLÉ dans le témoin
  (v256) : il marche jusqu'à être entré, ressorti ou figé trois pas, plus en
  quatorze pas ; vert seul (plafond 22, x = −4,0) et au portail suivant.** Au portail complet du
  banc accéléré (onzième suite, après `hote.js`) : plafond 11, x = −5,7 du
  centre — l'enfant s'est arrêté sous le porche, à un bloc par seconde. Rejouée
  SEULE sur la branche, même code : plafond 21, x = −4,9, verte. C'est le rouge
  déjà démonté en v215 pour ce témoin (une durée qui dépend de la cadence du
  banc) ; l'ordre des suites l'a déplacé, pas créé. Piste : le témoin marche
  quatorze pas de 700 ms ; à quatre images par seconde, dix blocs ne suffisent
  pas — remplacer la borne en PAS par une borne en BLOCS parcourus, comme
  « ne plus avancer » l'a déjà fait.

- [ ] **Accélérer le portail, étape 2 : une cadence de banc sur les
  minuteries du jeu (`?tempo=N`).** L'étape 1 (v255) a rendu l'attente du
  banc — instrument de charge instantané, repos en condition, suites
  courtes d'abord. Le poste qui reste est dans le JEU : `reseau.js` (19 min)
  et `reglages.js` (7 min) attendent des minuteries de production — 167 s de
  `dormir` de seuil et 3 486 s de bornes `jusqua` adossées à `STALE_MS`
  20 000 (net.js:59), `HEARTBEAT_MS` 5 000 (:58), `SOMMEIL_MAX_MS` 300 000
  (:62), `GRACE_REVEIL_MS` 15 000 (:64), `RELANCE_MS` 3 000 (:68),
  `PRESENTATION_MS` 20 000 (:69), `OUVERTURE_MS` 9 000 (:75), le renoncement
  du relais nuage 12 000 (net.js:626), la sonde nuage 4 000 (:494), le phare
  15 000 (:456), `onCodePris` 1 500 (:1482), `_veilleVideo` 2 000 (:1843), la
  republication 15 000 (main.js:4106), **`pullPlayTime` 60 000** (:4108),
  `prefsPush` 20 000 (:2199), `refreshEduMenuBtn` 10 000 (:2622),
  `savePosition` 3 000 (:1032), le retour au sol 4 000 (:1021), le garagiste
  et l'aéroportiste `cadence(3000)` (:1508/:1541), `REPIT_MS` 8 000 et
  `REESSAI_MS` 5 000 (identity.js:201-202). Forme : `src/tempo.js`, qui lit
  `tempo` dans l'adresse, REFUSE toute valeur ≠ 1 hors `127.0.0.1`/
  `localhost`, et expose `t(ms) = ms / TEMPO` ; le banc passe `&tempo=4`.
  **Ne passent JAMAIS sous tempo** : l'horloge scolaire (`SESSION_MIN_USINE`,
  `DAILY_LIMIT_SECONDS`, `MIN_ANSWER_DELAY`, `FAST_WRONG_DELAY`,
  `FREEZE_SECONDS` — `reglages.js` affirme « dix minutes » mot pour mot),
  `chronoReel` et tout `cadence.js` (c'est un défaut de comptage du temps qui
  a motivé le module), la borne de `dt` (physique), `passants.js:143
  cadence(2000)` et `vehicules.js:1596 patience = 4` tant que `monte.js`
  affirme des débits en temps réel, et `CALMES_DAFFILEE` (un compte, pas un
  délai). Garde-fou obligatoire : un témoin sous node par constante,
  `STALE_MS === 20000`, `REPIT_MS === 8000`…, sinon un tempo mal câblé
  publie un jeu qui coupe les liens en cinq secondes. Gain estimé sur les
  comptes : huit à douze minutes ; à mesurer, jamais à annoncer avant.
  Et l'on garde un `npm run long -- --tempo=1` pour la nuit : une course
  révélée à tempo 4 peut ne pas exister dans le vrai jeu.

- [ ] **Accélérer le portail, étape 3 : deux machines.** Partition écrite en
  dur à côté de `SUITES` (part A ≈ reseau + carte + hote + visio + metro +
  parent, part B ≈ monte + manhattan + washington + plafond + sauvegarde +
  carteMonde + realisme ; reglages en A, maj en B), `--part=A|B`,
  `--fusionner a.json b.json` (union des acquis, chaque empreinte revalidée
  à la lecture), et un contrôle de couverture OBLIGATOIRE : le verdict
  fusionné n'est vert que si A ∪ B === SUITES, aucune suite deux fois avec
  des verdicts contraires, même commit et même état sale des deux côtés.
  Plancher : la plus longue suite seule (`reseau.js`, 19 min). Une seule
  machine dans cette session : à faire le jour où une seconde existe.

- [ ] **Trois rouges du portail complet de la v251, verts rejoués seuls,
  cause ouverte.** (1) `reseau.js`, « à trois, chacun voit les deux autres »
  (hôte ["Alice"], Alice ["Marlon"], Nina les deux, en 79 s) — trois pages
  de jeu en même temps, donc trois workers de maillage de plus sur quatre
  cœurs ; à remesurer avec le worker et sans (`&maillage=local`) si le rouge
  revient. (2) `carte.js`, `page.click('#map-tout')` jamais « stable » en
  trente secondes — mesuré ensuite sur la page bureau, carte ouverte :
  médiane 60 ms par image avec le worker, 55 sans, 53 sur `origin/main`,
  clic en 155 / 120 / 135 ms ; le symptôme de la v247 (banc lent), pas le
  worker. (3) `plafond.js`, « THREE.GLTFLoader: Couldn't load texture
  blob: » × 4 au rechargement — revenu à l'identique au portail de la v252,
  toujours vert seul : le témoin rechargeait la page tout de suite après
  l'ouverture, et sous la charge de trois suites les neuf corps réalistes
  étaient encore en cours d'analyse ; la navigation coupe leurs textures et
  le chargeur l'écrit en erreur de console. Réglé dans le BANC (v252) :
  `plafond.js` attend `humainsCharges()` avant chaque rechargement — et
  c'est PROUVÉ sous charge : rejouée en cinquième position au portail de la
  v252 (relance), 28 témoins verts, zéro erreur de console — et la même
  panne dans `reseau.js` (le revenant Milo, rechargé tout de suite après
  l'ouverture : cinq erreurs, seul, à la v257), même remède. (4) `monte.js`,
  au même portail : « descendu de la voiture de Paris » et les deux témoins
  de mur qui suivent, l'enfant à PIED avant le clic de descente — la boucle
  de montée recliquait sur un bouton-BASCULE quand le « ⬇️ » (écrit à l'image
  suivante, sondé par rAF) n'arrivait pas en trois secondes, à une image par
  seconde dans Paris : premier clic monté, second descendu. Réglé dans le
  banc (v252) : l'état se lit dans `montureConduite()`, on ne reclique
  jamais sur un enfant déjà monté. (5) `monte.js`, troisième passe : « la
  circulation s'arrête devant la voiture de l'enfant » — 97 relevés à moins
  de douze blocs, ZÉRO arrêtée, ZÉRO au travers : les voitures passaient à
  côté, le point « douze blocs devant » en droite ligne n'étant pas sur le
  tracé quand la rue tourne (vert aux deux passes d'avant, 76 arrêtées ;
  `vehicules.js` n'a pas bougé depuis la v246). Réglé dans le banc : de la
  chaussée sous toute la ligne, candidats classés, et l'on se repose ailleurs
  si personne ne vient — une mesure où aucune voiture n'arrive n'est pas une
  mesure. (6) Portail de la v253 : « la reprise tient dans la durée »
  (`reseau.js`, hôte 1 · Alice 2 après vingt-cinq secondes) — vert seul sur
  la branche une heure avant (74 témoins), tombé juste après un `souffler`
  à sa limite (charge 4,49) et un retour d'Alice à 58 s au lieu de 25 ; le
  code réseau de v253 n'ajoute que deux champs au message de position. Vert
  à la passe suivante du portail (hôte 2 · Alice 2, 25 s) : rouge de
  charge, déclaré ici. Et
  « sous le toit » (`monte.js`) : le témoin lisait `plafondSiege.y` comme un
  nombre, devenu une case par siège en v253 — corrigé dans le banc (il lit
  la case du siège conducteur), le jeu asseyait bien l'enfant (crâne 1,19).

- [ ] **À trancher par Max : le corps réaliste « femme-manteau » porte un
  foulard blanc sur la tête.** Revue proactive des trente-cinq personnages
  (neuf corps Rocketbox, vingt-quatre tenues sculptées) et des trois
  appareils, planche-contact de face et de côté avec mesures (pieds au sol,
  hauteur, symétrie) : rien de cassé. Mais Max a demandé en v243 « enlève la
  femme avec le voile, ou retire le voile » pour la dame du château ; ce
  modèle-ci, un des neuf corps de passants, couvre la tête d'un dupatta. Le
  retirer de la liste `noms` de `humains.js` (les femmes tirent alors parmi
  trois corps au lieu de quatre) ou le garder : décision de contenu, pas de
  géométrie. Sonde : `revue/planche-humains.cjs` dans le brouillon.

- [ ] **« On entre chez les gens : chaque îlot a sa porte » (washington.js)
  est tombé UNE fois au portail de la v250** — « façade 0,1, plafond à −1,
  1 mur, à (−21197, 6100) pour une maison en (−21197, 6095) » : sur les
  quatre façades, la marche s'est arrêtée à un bloc du point de départ, trois
  pas immobiles de suite — et pas sur la façade nord, celle qui a la porte et
  par laquelle il entre partout ailleurs. VERT rejoué seul sur la branche dans
  la foulée, même code ; vert dans dix-neuf portails auparavant (v248, v249d
  compris). La livraison v250 ne touche que les pivots de roue des deux
  modèles hors manifeste. Cause ouverte : ce que le témoin ne dit pas, c'est
  ce qui l'a arrêté (une voiture d'Independence à l'arrêt devant lui ? un
  hoquet de banc à trois pas ?). Piste : faire dire au message la cadence et
  ce qui occupe le bloc devant le joueur à chaque pas immobile.

- [ ] **« La circulation s'arrête devant la voiture de l'enfant » est un
  témoin qui dépend de l'état du banc.** Rouge à deux portails de la v247
  (« première voiture après 0 s, 206 relevés à moins de douze blocs, zéro
  arrêtée, zéro au travers »), VERT rejoué seul sur la branche ET sur
  `origin/main`, et rouge une fois sur l'ancien code rejoué seul pendant la
  v246. Il se pose douze blocs devant une voiture visible et attend qu'elle
  vienne s'arrêter ; rien ne garantit que cette voiture vienne à lui — celle
  qui est déjà à douze blocs peut tourner avant, ou faire la queue derrière
  une autre. Un rouge sans traversée n'est pas la panne que le témoin garde.
  Piste : choisir une voiture dont le tracé PASSE par le point posé (lire le
  parcours du convoi, pas seulement son cap), et dire dans le message si la
  voiture la plus proche s'est éloignée ou rapprochée.

- [ ] **L'ARRIVÉE D'UNE TÉLÉPORTATION, DÉCOUPÉE (v420) — deux dettes pour
  d'autres zones.** `sonde-arrivee-decoupe.cjs` (Paris, scène vide, trois
  passages, `PROFIL_MS=600 NIVEAUX=2,3,4`) : la pire image (283 à 383 ms) est
  UNE tâche `FireAnimationFrame` de JavaScript (trace du fil principal). Temps
  inclusif sous `frame`, première demi-seconde :
  (1) **`Convoi.montrer` (vehicules.js, circulation-vivante) : 162 · 276 ·
  276 ms.** Il fabrique (`this.element(i)`) toutes les voitures qui entrent
  dans les quarante-cinq blocs dans la MÊME image ; à l'arrivée, c'est toute
  la rue d'un coup. La piste est celle des passants (v246, `naitre` par
  tranches de cinq millisecondes) : un budget de fabrication par image, la
  place restant vide une image de plus.
  (2) **`ensureChunk` sur le fil principal : 66 à 94 ms**, appelé par le
  `sweep` des personnages (marlon.js) et `posteAutour` des passants
  (passants.js, `sommetColonne`) — des morceaux que le worker n'a pas encore
  rendus. Piste : un passant ne se pose (et un personnage ne marche) que sur
  un morceau déjà là, comme la minicarte (v258) qui n'engendre jamais.
  (3) `nbSansCroisement` (vehicules.js) 22 à 36 ms au dépliage d'un circuit.
  Fait dans ma zone (v420) : `renduLogiciel()` ne redemande plus le pilote
  (120 à 336 ms de `getParameter` par arrivée, zéro gain en durée d'image au
  banc, déclaré). À relire sur l'iPad avec `?diag=1` après les deux remèdes.
- [ ] **Ce qui reste du gel de téléportation après la v246 : le MAILLAGE
  des morceaux à l'arrivée.**
  *(Mesuré en v417, `sonde-arrivee-journal.cjs`, arrivée à Paris en scène
  vide, deux passages : avec un journal de 80 000 blocs l'ancien code (v400)
  met 14 s à mailler la moitié du disque, n'en atteint jamais 90 % en 20 s
  (505/625), passe 3,2 à 3,4 s du fil principal à engendrer et rend des images
  de 567 à 717 ms ; depuis la v403, 3,4 s · 4,7 à 5,0 s · 0,3 s · 283 ms —
  comme sans journal (3,2 · 4,6 · 0,3 · 250 à 300). Le gel de téléportation
  des enfants qui ont beaucoup bâti était là. Ce qui reste en scène vide :
  une pire image de 250 à 300 ms sans journal, non attribuée — le dessin, lui,
  est SwiftShader et se relit sur la tablette, `?diag=1`.)* Les programmes de la flotte et des humains ne
  se compilent plus sur place (zéro programme neuf à l'arrivée à Paris, vingt
  avant) et les passants naissent par tranches ; sur le banc en rendu
  logiciel la pire image de la téléportation passe de 550 à 450 ms et le
  temps figé de 3,9 à 2,6 s (`teleport.cjs`, une mesure chacun) — ce qui
  reste est le maillage de deux cent quatre-vingt-quatorze morceaux de ville
  à 23 ms pièce, que le budget de `MESH_MS_PAR_SECONDE` étale déjà. La
  mesure qui compte est sur l'iPad de Max ; si le lag y persiste, la piste
  est de mailler moins à l'arrivée (rayon réduit les deux premières
  secondes) ou plus vite (45 % du coût est la génération du relief).

- [ ] **Le témoin du mur a mesuré « à pied » au volant, deux fois, au
  portail de la v249** (à pied 1,1 bloc du mur, gabarit 2,2, monture
  présente) — et pas une troisième, `monte.js` rejouée seule avec le clic de
  descente vérifié (descendu : carrure 0,6, aucune monture). Le témoin de
  circulation qui précède dit désormais l'état avant le clic, après le clic
  et au retour : si cela revient, le message dira si l'enfant est remonté
  par ce clic (un clic sur « Descendre » quand on n'est plus au volant fait
  MONTER dans la voiture d'en face) ou s'il a été éjecté pendant la mesure.
  Cause ouverte, pas expliquée.

- [x] **v254 — Le badge de version ouvre le journal des nouveautés.** Max.
  `src/nouveautes.js` (102 entrées, 294 puces, rédigées depuis
  `CHANGELOG.md`), modale « Quoi de neuf ? », mise à jour forcée en bas.
  Deux témoins dans `maj.js`, rouges sur l'ancien code. Règle : chaque
  livraison ajoute son entrée au journal du jeu dans le même commit.

- [x] **v253 — À plusieurs, l'ami est vu dans sa voiture et l'on monte avec
  lui.** Max, après la v249. `v`/`p` dans le message de position, l'ami
  dessiné avec la fabrique de la monture et assis, passagers collés au siège
  (`sieges` de la fiche). Trois témoins dans `reseau.js`, rouges sur
  l'ancien code. Sans courtier, le conducteur voit ses passagers assis
  depuis la v410 (`net.estMoi`). Reste : les montures sans `siege` (cheval, avion) se voient encore à pied chez
  les autres — le champ `v` part, il manque leur `siege` et leur pose.

- [x] **v252 — La voiture de l'enfant ne traverse plus le mobilier.** Max,
  après la v249. Mesuré : les taxis de Manhattan restent à neuf blocs des
  tables ; c'était la voiture de l'enfant. `mobilierDevant` (props du monde
  + registre du renderer de Manhattan), exception « déjà dedans » par
  famille. Deux témoins dans `monte.js`, rouges sur l'ancien code.

- [x] **v251 — Le maillage hors du fil principal.** Fait : un worker
  engendre et maille, le fil principal installe (324 → 0 ms
  de maillage par seconde en vol au-dessus de Paris). Reste à mesurer sur
  l'iPad de Max ; si le lag persiste, les pistes suivantes sont le coût des
  ombres (v247, jamais mesuré sur tablette) et un second worker.

- [x] **v250 — Les roues de la Lucid Gravity tournent autour de leur essieu,
  et la flotte entière est passée en revue.** Max, capture d'iPhone :
  « Gravity design ko, wheels », puis « sois proactif sur ce genre de bug ».
  `rotation.x += angle` tourne autour du x du PARENT (Euler XYZ) ; les pivots
  fabriqués naissent désormais dans un groupe-essieu. Témoin de flotte dans
  `monte.js` (208 roues, 8 fausses sur `origin/main`, 0 ici), planche-contact
  des 52 modèles regardée. Reste à faire la même revue pour les humains et
  les appareils (planche par modèle, mesures de géométrie), promise à Max.

- [x] **v249 — Paris n'est plus dans le noir, on voit le personnage
  conduire.** Faits : planchers de nuit réglés ombres forcées, avatar
  assis sur le `siege` de la fiche.

- [ ] **v248 et suivantes — « regarde les améliorations qu'il y a encore eu
  dans la ville de New York et reproduis-les sur l'ensemble de la carte ».**
  La v247 a livré la première étape, le regard (soleil, ombres, ACES, voûte
  du ciel, nuit) sur tout le monde. Ce que New York a encore de plus
  (docs/manhattan.md) : façades en maillages à matériaux physiques
  (embrasures, corniches, escaliers de secours, réservoirs), lampadaires qui
  éclairent la rue la nuit, marquages au sol, reflets préfiltrés, pluie sur
  la chaussée (rugosité). Sa chaîne est une liste de bâtiments (rectangle,
  matériau, style, hauteur, graine) et une fonction de surface, avec le
  monde voxel qui garde les collisions (`TerreUrbaine`). **La v248 a livré
  la deuxième étape : les réverbères dans les six villes bâties à la main,
  et les quatre lampes de Manhattan prêtées au monde entier, posées sous les
  lanternes les plus proches de l'enfant la nuit.** Les marquages au sol
  existent déjà partout (`ROUTE_BLOCK`, `ROADLINE`, `CROSSWALK`). Étapes
  suivantes, chacune sur captures rue + ciel : Paris sur la chaîne de
  façades ; les autres villes bâties à la main ; les villes engendrées par
  leurs îlots.

- [ ] **Le coût des ombres sur l'iPad n'est pas mesuré.** La v247 ajoute une
  passe d'ombre par image : les morceaux à moins de six morceaux de l'enfant
  rendus une seconde fois depuis le soleil, carte de 1 024, filtre PCF
  simple. Au banc en rendu logiciel, à Paris : 217 ms sans ombres, 400 avec
  (350 en ombre basique 512, 467 en PCF doux 2 048) — des millisecondes de
  SwiftShader, non transposables — et suffisantes pour que le jeu coupe ses
  ombres de lui-même en rendu logiciel. Si Max signale un ralentissement, les
  leviers dans l'ordre : `RAYON_OMBRE` (6 → 4), la carte (1 024 → 512),
  `BasicShadowMap`, et en dernier `?ombres=0` / `renderer.shadowMap.enabled`.

- [ ] **Assis dans une voiture, le banc rend chaque image deux fois plus
  lentement qu'à pied (256 contre 145 ms), fil principal INACTIF.** Ce n'est
  ni la sonde des reflets (une face coûte 2 à 5 ms depuis la v245) ni du
  JavaScript : c'est la rastérisation logicielle de la carrosserie
  réfléchissante en gros plan. Non transposable à l'iPad ; à vérifier UNE
  fois en rendu matériel avant de chercher plus loin.

- [ ] **Deux circuits de Paris se raccordent à cent soixante degrés sur la rue
  de Rivoli, et les voitures s'y frôlent encore.** Après la v244, il reste
  dix-sept à vingt-cinq relevés de chevauchement sur trente secondes (contre
  soixante-dix-huit), tous au même endroit — autour de (−190, 188) et
  (−175, 215) : une voiture qui attend est frôlée par celle qui passe en biais,
  parce que les deux tracés s'y rejoignent presque parallèles. Céder le passage
  ne peut rien contre un tracé qui met deux files dans le même couloir : c'est
  dans `voies.js` / `paris.js` que cela se règle (un carrefour franc, ou une
  seule file sur le tronçon partagé), et cela se remesure avec la sonde des
  rectangles, jamais avec « à moins de 3,5 blocs ».

- [ ] **L'arrivée en ville fige l'écran depuis la v241 (#244), et le témoin le
  dit des deux côtés.** « L'écran ne se fige pas en arrivant sur une ville »
  (monte.js, barre 550 ms et 5 % du temps au-delà de 300 ms), rejoué SEUL sur
  `origin/main` (v241) : pire image **1 233 ms, 6,9 %** ; sur la branche v242 :
  2 117 ms, 20,8 % — une mesure chacun, sur un banc en rendu logiciel, et le
  trajet de la branche survole MOINS de villes (Paris seule ; Strasbourg et
  Stuttgart en sortent avec le monde ×2). La v246 a découpé l'arrivée image
  par image et retiré deux des causes — les programmes de la flotte et des
  humains compilés sur place, et les dix-huit passants nés dans la même
  image ; ce qui reste est le maillage (voir « ce qui reste du gel de
  téléportation » ci-dessus). Remesuré à la v246, `monte.js` rejoué SEUL des
  deux côtés, même fichier de témoins : `origin/main` (v245) **1 267 ms,
  9,3 %** ; branche **2 033 ms, 18,9 %** — même écart entre les deux arbres
  qu'à la v242 (1 233 contre 2 117) sur du code qui a depuis été fusionné,
  donc un écart de BANC, pas de code ; rouge des deux côtés, dette maintenue.
  La validation de #244 en rendu matériel était verte ; à remesurer sur
  l'iPad.

- [ ] **Quatre témoins de `manhattan.js` sont rouges sur ce banc, des deux
  côtés.** Rejoués SEULS sur la branche v242 et sur `origin/main` (v240),
  dans un arbre séparé, même conteneur en rendu logiciel : « le trou enlève
  aussi la géométrie visible » (9 203 → 54 969 sur main, 17 102 → 54 969 sur
  la branche — le compte MONTE parce que la ville se construit encore),
  « fenêtres et éclairage public la nuit », « les ombres suivent le soleil et
  la lune » (`[1, -1]`), « le taxi roule avec les contrôles tactiles », et un
  délai de quatre-vingt-dix secondes au rechargement qui fait lâcher la fin de
  la suite une fois sur deux — en v245, sur six portails, la fin réseau de
  la suite a lâché trois fois (« partagent blocs, avatars et code » rouge sans
  détail, le bloc de l'hôte jamais reçu par l'invité, « Lost connection to
  server » du courtier local), verte les autres fois sur le MÊME code ; au
  portail de la v246, `page.waitForFunction` a expiré après « la reprise
  cloud place l'enfant près du chantier déplacé », les quatre rouges
  ci-dessus identiques ; au portail de la v256, une SIXIÈME forme de la même
  fin instable : `#ride-btn` jamais visible en quinze secondes après
  l'invocation du taxi (la suite s'arrête là, vingt-quatre témoins de moins),
  et rejouée seule le bouton apparaît, le taxi rend son rouge déclaré et la
  fin réseau lâche (« Lost connection to server »). Le journal de la v240 annonce ce portail vert :
  il a été mesuré avec `CHROMIUM_ANGLE=metal`, pas en logiciel. À démonter
  sur une machine qui rend en matériel avant d'accuser le jeu — et à
  remesurer ici témoin par témoin (la géométrie qui monte dit que le témoin
  attend la fin d'une construction qui n'est pas finie).

- [ ] **Paris au niveau de New York, sur captures.** Décision de Max après la
  v242 : s'inspirer de ce qui a été fait sur Manhattan (façades en maillage
  PBR, volumes réels, éclairage, foule) pour remonter les autres villes, Paris
  d'abord. Règle de jugement inchangée : vue de rue et vue aérienne à côté
  d'une vraie photo, AVANT de fusionner. Le rectangle de Paris se borne comme
  celui de Manhattan (`BORNES`), et la double empreinte de `plafond.js`
  s'applique — Paris est DANS la fenêtre.

- [ ] **Le registre ment encore sur New York.** `r: 152` est le disque de
  l'ancienne ville voxel ; Manhattan est un rectangle de 480 × 2 300. Trois
  lecteurs s'en accommodent chacun à leur manière — `passants.js` écrit 1 200
  en dur, `dansUneZoneATerre` prend le disque plus vingt-quatre, et le témoin
  « aucune ville n'en chevauche une autre » juge sur le disque (c'est le
  témoin du rectangle, v242, qui garde la vraie marge). Une emprise dans le
  registre, lue par tous, remplacerait ces trois arrangements.

- [ ] **La fenêtre déclarée de la migration ×2.** Un bloc est jugé « posé sur
  l'ancienne carte » par sa DATE (`DATE_CARTE_3`, world.js). Une tablette qui
  jouerait encore sur la v241 après cette heure poserait des blocs que la
  migration laisse où ils sont — à l'ancienne adresse de leur ville. Si cela
  se voit (une construction de Marlon ou d'Alice à l'ancienne place de New
  York, autour de (−10 143, 2 615)), la copie `prénom~avant-carte-2` et la
  fonction pure `migrerCarte3` permettent de la ramener à la main.

- [ ] **JFK est au nord-est de Manhattan.** Son vrai cap est le sud-est ; là
  c'est la baie de Jamaica, de l'eau, et le rectangle de la ville. Le cap
  cède en dernier — c'est la règle — mais le jour où le plan de Manhattan
  gagne Brooklyn et Queens, JFK doit revenir à sa vraie place.

- [ ] **Manhattan sur la Terre : suite du réalisme.** Priorités : circulation
  commandée par les feux, berges et ponts raccordés au relief, intérieurs,
  Statue de la Liberté, diversité des façades et transitions LOD plus douces.
  Les publicités restent fixes et les voitures sont des interprétations
  géométriques, pas des modèles constructeur. Mesurer Safari sur iPad physique.
  Réconcilier les emplacements de secours si deux appareils importent hors
  ligne la même archive contre des journaux Terre différents. Les journaux
  d'origine sont conservés ; ne jamais les supprimer pour « nettoyer ».

- [ ] **Une pousse de mémoire graphique subsiste après la v238, et elle ne vient
  PAS des créatures.** Mesuré, dix allers-retours de cent cinquante blocs qui
  forcent le renouvellement : `origin/main` +459 géométries, la branche corrigée
  +348. Le remède de la v238 est pourtant COMPLET pour les bêtes — à l'unité,
  dix créatures prennent 157 géométries et en rendent 157, zéro perdue. Le
  reliquat est donc ailleurs, et le suspect principal est écrit : **les voitures
  de convoi** (`vehicules.js`) sont fabriquées à la demande, trente-deux
  maillages chacune, et ne sont JAMAIS détruites — seulement rendues invisibles
  (`m.visible = false`). Les passants, eux, sont gardés pour la session par
  ville visitée, ce qui est voulu mais s'accumule aussi. À mesurer avant de
  corriger : quelle part chacun représente, et ce qu'il est légitime de rendre.
  **Ne pas conclure sur la cadence du banc** : il rend en logiciel, son fil
  principal est inactif 81 % du temps, il ne peut pas subir cette panne. On
  mesure des géométries.

- [ ] **`animals.js` et `creatures.js` comptent leur cadence de naissance en
  `dt`.** `this.spawnTimer -= dt` avec un `dt` borné à un vingtième : à trois
  images par seconde, 1,2 s de minuteur en réclame 2,4 réelles. C'est la
  cinquième occurrence du piège de `dt`, et elle est NOMMÉE ici plutôt que
  laissée à un futur grep — `src/cadence.js` porte déjà le remède
  (`chronoReel`), il suffit de le brancher. Coût mesuré : au banc, un enfant à
  pied avance à **15 % du temps réel** (six blocs en trente secondes au lieu de
  quatre-vingt-dix), ce qui a fait échouer trois sondes avant qu'on le voie.

- [x] **Le témoin de chargement du monde vole au-dessus d'un désert.** *(fait
  en v417 : jumeau urbain dans `monte.js`, Paris et Londres traversés en temps
  réel avec le réglage de la tablette — `file=cone&recharge=arrivee`. Mesuré à
  la sonde, médiane de six relevés, barre `max / 2` (48 · 60) : Paris 137 · 122,
  Londres 152 · 128 à 95 · 120 b/s ; campagne 192. Les vitesses des avions
  TIENNENT au-dessus d'une ville avec le réglage de l'iPad. Avec l'ordre du banc
  (`file=regard&recharge=image`) Paris rend 66 · 45 et Londres 64 · 58 : c'est
  ce réglage-là, pas la vitesse, qui ferait rougir. Ce qui reste à mesurer sur
  la tablette : `?diag=1` en vol au-dessus de Paris, la ligne « roulage ».)* « En vol,
  on ne rattrape pas le bout du monde qui se charge » (`monte.js`) se place à
  (30 000, 30 000), un couloir vierge où un morceau coûte 6,8 ms. Au-dessus de
  Paris il en coûte 23,5. Le témoin est donc vert alors que l'enfant, lui, ne
  voit rien — c'est ce qui a laissé passer la v229 à la v236. Le paysage
  lointain de la v237 rend le symptôme invisible ; le déficit de maillage, lui,
  est intact. À reprendre : le faire voler au-dessus d'une ville, et remesurer
  les vitesses des avions sur le VRAI débit (42 morceaux/s, pas 154).

- [x] **Le paysage lointain montre le relief, pas les villes.** *(fait en v331 : teinte urbaine et bâti instancié, `horizon.js`)* `terrainHeight`
  ne sait rien des immeubles : au-delà des morceaux chargés, Paris apparaît en
  prairie. `cityAt` pourrait teinter les cases d'une ville en gris urbain pour
  quelques microsecondes par colonne — non mesuré, non fait.

- [ ] **Des cubes orange isolés flottent dans le ciel**, visibles sur les
  captures de Max comme sur celles du banc, avant comme après la v237. Ma sonde
  de scène ne les a pas trouvés (aucun petit maillage loin dans le champ) :
  c'est donc que je n'ai pas cherché au bon endroit. À reprendre par un lancer
  de rayon à travers leur position à l'écran, qui répondra en une exécution.

- [ ] **Trois non-résultats MESURÉS en v236 — ne pas les reprendre à
  l'aveugle.** En cherchant la cause du gel en vol : le **rendu** ne fait que
  4,6 % du temps (834 ms sur 18 s) ; la **caméra cubique des reflets** ne
  tourne JAMAIS en vol (zéro image sur cent huit — son rayon de 45 blocs ignore
  pourtant l'altitude, mais un convoi n'existe plus si loin) ; couper
  `renderer.debug.checkShaderErrors` ne rend rien (pire image 1 800 → 1 633,
  dans le bruit) parce qu'il n'y a que SIX programmes dans tout le jeu. Le
  rayon des reflets mériterait quand même de compter l'altitude — c'est une
  ligne, et cela évitera qu'un futur changement de portée le réveille en vol.

- [ ] **Portail de la v403 (le journal par morceau) : six suites rouges, toutes
  rejouées SEULES des deux côtés (branche / `origin/main` v395, arbre détaché).**
  `realisme.js` (clic « Plus tard » expiré) : 17/17 verts des deux côtés.
  `reseau.js` (« un hôte sans courtier est trouvé ») : 81 verts des deux côtés.
  `maj.js` (loader d'installation) : branche 41 verts ; `origin/main` 38 verts,
  2 rouges (« corps, programmes et fond de carte », « ne floute rien », la dette
  déclarée). `carte.js` : branche 2 rouges de durée (fond à froid 431 ms pour
  400, glisser bridé 467 pour 400), `origin/main` 1 rouge (la flèche du GPS,
  gauche 1,92 rad) — rouges différents d'un passage à l'autre, ni `carte.js` ni
  `gps.js` touchés. `monte.js` : branche 190 verts ; `origin/main` 188 verts,
  1 rouge (« la file se recharge à l'arrivée… puis se rend », rendue en 12 s :
  le même qu'au portail de la branche — rouge de charge, pas de la livraison).
  `manhattan.js` : trou de façade et `#ride-btn` caché, les dettes déclarées.

- [x] **`generateChunk` parcourt TOUS les blocs de l'enfant à chaque morceau
  engendré.** *(fait en v403 : `JournalBlocs`, index par morceau tenu par
  `set`/`delete`/`clear` ; mesuré 36,6 → 1,1 ms par morceau avec 80 000 blocs)* `for (const [k, id] of this.edits)` avec un `split(',').map(Number)`
  par entrée, pour chacun des quatre-vingt-sept morceaux engendrés par seconde
  en vol. Gratuit au banc (zéro bloc posé), mais Marlon en a des milliers :
  ~435 000 découpages de chaîne par seconde. Un index `edits` par morceau le
  supprime ; les points d'écriture sont `setBlock`, le chargement, la fusion et
  les deux effacements. Pas mesuré sur un vrai profil d'enfant — à chiffrer
  avant de le faire.

- [ ] **Figer les matrices des morceaux de monde n'apporte RIEN — mesuré en
  v235, à ne pas reprendre à l'aveugle.** Le profil d'un vol au-dessus de Paris
  accuse `updateMatrixWorld` (849 ms), `compose` (599), `multiplyMatrices`
  (295) et `updateMatrix` (293) : deux secondes sur vingt, dix pour cent, pour
  replacer des objets qui ne bougent jamais. Poser `matrixAutoUpdate = false`
  sur les maillages de chunk et leurs décors est juste et sans risque — et le
  gain mesuré est NUL (28,5 → 27,7 im/s, pire gel 683 → 667). Ce coût vient
  des personnages et des véhicules, qui bougent. La piste reste ouverte de ce
  côté-là : onze maillages par personnage, chacun avec sa matrice, recalculés
  à chaque image.

- [ ] **Quatre minuteurs de plus comptent en `dt`, et deux comptent vraiment
  (relevé fait en v234).** Le grep enfin passé — `grep -rn -- "-= dt\|+= dt"
  src/*.js` — rend **quarante-neuf** minuteurs hors `education.js`. La grande
  majorité sont des ANIMATIONS et doivent rester en temps de jeu (une bête qui
  fuit, une balle qui rebondit, une flamme qui s'éteint). Quatre ne le doivent
  pas :

  - `animals.js:466` et `creatures.js:542` — `spawnTimer`, la cadence
    d'apparition des bêtes autour de l'enfant. C'est EXACTEMENT la famille des
    quatre cadences de ménage de la v226, et elles ont été oubliées : à
    2,7 im/s, un minuteur de 1,5 s met onze secondes réelles. Le bestiaire se
    peuple donc lentement au moment précis où l'enfant arrive quelque part —
    le symptôme « villes vides » que Max a signalé deux fois, appliqué aux
    animaux.
  - `fun.js:1465` — `raceTime`, le CHRONOMÈTRE de la course, qui écrit
    `records.bestRace` dans le profil. Compté en temps de jeu, il récompense
    la tablette qui rame : plus ça saccade, meilleur le record. Et ces records
    se comparent entre Marlon et Alice dans le tableau.
  - `fun.js:1458` — `raceCooldown`, le délai avant de pouvoir relancer.

  Chacun se corrige par `chronoReel` (cadence.js) et demande son témoin. À
  faire en une livraison à part : trois fichiers de plus, et le record de la
  course mérite d'être regardé avec Max avant d'être remis à zéro ou pas.

- [x] **Les minuteurs de `education.js` comptaient en `dt` — FAIT en v234.**
  La question posée était « qu'est-ce qui est JUSTE ». Réponse : tout ce que
  cette classe compte est une durée de la vraie vie — un parent qui règle
  quarante-cinq minutes parle de minutes de pendule. Mesuré à la sonde sur
  douze secondes réelles : à 5 images par seconde le compteur n'en retenait
  que TROIS, soit près de trois heures accordées pour une limite de
  quarante-cinq minutes. `chronoReel` (cadence.js) sert le temps réel BORNÉ à
  deux secondes — sans cette borne, un onglet à l'arrière-plan ferait compter
  une absence comme du jeu, ce que le plafond de `dt` empêchait par accident.
  Témoin dans `parent.js`, 0,25 → 0,98.

  **Reste à trancher avec Max, et cela ne bloquait pas la correction :** faut-il
  que le temps d'écran continue de courir pendant un quiz et pendant un arrêt
  forcé ? Aujourd'hui oui, compté à part (`today().quiz`). C'est défendable —
  répondre au Professeur Cornichon est du temps devant l'écran — mais c'est une
  décision de parent, pas de programmeur.




- [x] **Les trains n'arrivaient pas en gare — FAIT en v222.** Les gares étaient
  au bon endroit (les dix-huit arrêts tombent à zéro bloc d'une gare) mais
  chaque ligne n'avait que deux trains pour un tour allant jusqu'à 127 s :
  l'attente sur un quai allait de 26 à 64 s. Le nombre de trains est désormais
  le tour divisé par la demi-minute — la règle déjà écrite pour le métro de
  Washington. Pire attente 64 → 30 s, 18 → 29 trains.

- [x] **Piloter un avion — FAIT en v223.** Le mode `pilote`, le troisième des
  trois façons d'être porté, prévu depuis la v155. L'avion reste COLLÉ au
  joueur comme toute monture et c'est la marche qu'on remplace par une
  physique de vol : le réseau, la caméra de poursuite et la boîte de collision
  marchent alors sans une ligne de plus. Trois appareils sur le tarmac de
  Roissy, aux rapports de vitesse réels (1 : 2,4 : 2,4). Mesuré : pointe 110 ·
  264 · 264 blocs/s, et 227 · 546 · 541 blocs parcourus en deux secondes de
  croisière.

- [ ] **Les aérodromes, la suite.** Dix-neuf existent (v223), mais leur cap
  réel a dû céder cinq fois faute de terre ferme : JFK (115° → 30°), Fiumicino
  (245° → 325°), Haneda (160° → 250°), Los Angeles (245° → 305°), Roissy
  (43° → 0°, le nord-est de Paris étant le quartier des enfants). Le jour où
  la carte gagnera des côtes plus fines, ces cinq-là se replaceront. Et il
  manque Changi : aucun disque de soixante-dix blocs au sec dans les trois
  cents blocs autour de Singapour — Delhi a pris sa place dans la quinzaine.

- [x] **Un terminal n'a ni sièges, ni comptoirs, ni tapis à bagages.** FAIT en
  v330 sur les dix-neuf (`amenagerHall`, aeroport.js), halls de Roissy ouverts
  au passage. Reste, déclaré : le carrousel d'un hall d'arrivées est coupé par
  le couloir de sa porte, si bien qu'il est petit (un cœur de deux à quatre
  blocs) ; le grandir demande de déplacer les portes, que le témoin de la
  marche lit. Le tambour de l'aérogare 1 reste plein.

- [ ] **Cinquante villes détaillées.** Demandé par Max. Le monde a 269 villes :
  47 avec une fiche (fleuve, trame, palette, monuments aux vraies coordonnées),
  222 engendrées depuis onze gabarits. Il s'agit d'en faire passer cinquante du
  gabarit à la fiche. Trois choses établies : seules Bruxelles et Cologne sont
  dans la fenêtre d'empreinte (laisser Cologne générique suffit à ne rien
  casser) ; une fiche qui garde le rayon du registre ne change pas la découpe
  « hors villes » ; et la géométrie se CALCULE depuis de vraies latitudes et
  longitudes — un générateur de brouillon le fait et vérifie que chaque
  monument tombe dans le disque de sa ville (il a déjà attrapé quatre erreurs).
  À livrer par lots d'une douzaine : Max juge sur captures, et une fiche fausse
  est pire qu'une fiche absente.

- [x] **POURQUOI `maj.js` rougissait-elle dans le portail et pas seule ? —
  RÉPONDU en v220, et ce n'était ni la charge ni un état qui traverse.** La
  mesure que j'avais moi-même écrite ici a tranché : le rouge se reproduit
  **trois fois sur trois** en rejouant `sauvegarde.js` juste avant, et la
  suite est verte jouée seule. Rien ne traverse d'une suite à l'autre —
  navigateurs séparés, contextes éphémères, ports différents, nuage de poche
  en mémoire. La cause est dans `index.html` : le filet de mise à jour n'était
  armé qu'APRÈS `await reg.update()`, et l'installation du service worker ne
  demande pas un seul fichier au serveur pendant cinquante-huit secondes.
  Corrigé ; le témoin est vert.

- [ ] **Un service worker vraiment coincé n'a aucun témoin.** Le blocage de
  `forcerMaj` est établi par la sonde — le filet l'appelle à vingt secondes,
  `wm-maj-forcee` passe à 1, et plus rien pendant vingt-huit secondes — mais
  rien ne le garde. Deux témoins ont été écrits et retirés : verts des deux
  côtés (27,8 contre 65,9 s de temps jusqu'à « l'enfant peut rejouer », puis
  28,3 contre 36,5 s avec un blocage rendu définitif). L'ancien code s'en sort
  quand même, non par un filet mais parce que l'installation finit par
  échouer, et borner sur ces durées mesurerait le banc. **Ce qu'il faudrait :
  un blocage que le navigateur ne peut pas épuiser** — le nôtre finissait
  toujours par rendre la main, soit par le délai d'en-têtes de node, soit
  autrement (mesuré : 142 requêtes, `reg.update()` rendue à ~32 s malgré
  en-têtes envoyés et délai de prise désactivé). Tant qu'on ne sait pas
  fabriquer ce blocage-là, le remède reste prouvé par la sonde seule.

- [ ] **Les rouges de `reseau.js` (v218) et `monte.js` (v219) restent sans
  explication.** Ce qui justifiait ces fusions tient — les suites étaient
  vertes rejouées seules — mais la cause n'est pas connue. `maj.js` avait la
  sienne, propre à elle ; rien ne dit que celles-là la partagent. La méthode
  qui a marché se réapplique : instrumenter la suite, compter ce qui atteint
  vraiment le serveur, et ne rien conclure d'une explication commode.

- [x] **Éteindre sa caméra ne retirait ni la vignette ni le son — FAIT en
  v219.** Le chemin direct attendait le `close` média de PeerJS, qui ne
  traverse pas ; le chemin du nuage, lui, ANNONÇAIT sa fin — d'où son témoin
  vert. L'extinction s'annonce désormais à tous les pairs par le tuyau des
  blocs. Les deux témoins rendent `[]`, `visio.js` est entièrement verte.
  Constat d'origine (v218) : `visio.js`, rejouée SEULE sur la
  branche et sur `origin/main` dans un arbre séparé, rend les deux mêmes
  témoins rouges avec les mêmes valeurs : « quand Alice éteint, sa vignette
  part » (la piste vidéo reste, `large: 0, haut: 0`, mais présente) et « et son
  filet de voix aussi » (`pistes: 1, muet: false`). Le cas du NUAGE, lui, est
  vert des deux côtés — « quand Tom éteint, son portrait disparaît ». C'est
  donc le chemin DIRECT qui ne retire pas ses pistes à l'extinction, pas le
  mécanisme d'extinction lui-même.

- [x] **On ne voyait toujours personne en marchant — FAIT en v218.** Le champ
  de vision fait 46° : dix-huit passants en couronne n'en donnent que 2,3 dans
  le cadre. Deux sur trois sont désormais posés devant l'enfant, et l'on
  replace aussi celui qui est passé derrière la ligne des épaules. Mesuré en
  marchant, cap devant : moyenne par arrêt 1,5 → 5,25, arrêts vides 1 → 0.
  Resserrer la couronne, seul, ne changeait rien — c'est mesuré et écrit.

- [x] **La ville se vidait dès qu'on marchait — FAIT en v217.** Un passant
  n'était ramené devant l'enfant qu'au-delà de 150 blocs, quand un personnage
  cesse d'être dessiné à 62 : entre les deux il est invisible ET pas rapatrié.
  Mesuré en traversant Paris : 10, 8, 7, 4, **0**, 2, 1 piétons dessinés. On
  rapatrie désormais à 64 blocs — juste au-delà de la portée de rendu, donc
  jamais sous les yeux de l'enfant — et chaque ville a 18 habitants au lieu de
  10. Pire de la traversée : 0 → 11.
- [ ] **La moitié de Paris n'a aucune voiture en vue.** Mesuré : 51 % de la
  ville est à moins de 45 blocs d'un circuit (la portée de rendu d'une
  voiture), et sur les 21 lieux où la carte dépose l'enfant, un seul n'en a
  aucune (le bois de Vincennes). C'est ce qui a fait dire à Max « il a fallu
  du temps pour voir des voitures ». Deux pistes, aucune gratuite : plus de
  circuits (la contrainte de partage de la v211 les limite), ou une portée de
  rendu plus grande (une voiture coûte 32 maillages — c'est ce que la v201 a
  mesuré pour descendre de 110 à 45).

- [x] **Washington n'a pas de circuit de voitures — FAIT en v205.** Onze
  circuits mesurés à 99–100 % couvrent trente-trois des trente-six avenues
  nommées ; les quatorze ronds-points ont gagné une chaussée et les circuits
  les contournent au lieu de les traverser.

- [x] **Trois avenues de Washington restaient sans circuit — FAIT en v223.** La
  23e Rue NO monte de Constitution à Washington Circle en croisant Virginia à
  Foggy Bottom, et la passe de réparation a fait le reste : Virginia Avenue NO,
  Constitution Avenue et la 23e Rue gagnent des voitures, aucune rue ne perd les
  siennes, cinquante voies sur soixante portent un convoi. New York Avenue NO
  était déjà dans trois circuits — la dette la nommait à tort.
- [ ] **`src/washington.js` n'a pas tous ses gardiens** — `tests/tout.js:78`
  déclare `['washington.js', 'plafond.js']`, quand toutes les autres villes
  bâties à la main déclarent aussi `carte.js` et `carteMonde.js`. Or les deux
  importent `washington.js`, et `carteMonde.js` mesure ses dix-neuf circuits,
  ses ronds-points et le partage des convois. Vu en v223 : le portail annonce
  « déjà vert sur ce code » pour les deux suites qui testent ce qui vient de
  changer. La ligne à écrire :
  `'src/washington.js': ['washington.js', 'plafond.js', 'carte.js', 'carteMonde.js'],`
- [ ] **La 17e Rue NO ne peut pas être tracée** — entre Constitution et F
  Street elle traverse le parc de la Maison-Blanche, qui passe avant les voies
  dans `solWashington` : mesuré, neuf blocs de pelouse sur quarante. L'Ellipse
  fait trente blocs de large, à peu près sa vraie taille. À reprendre le jour
  où l'on saura faire longer un parc à une rue.

- [x] **Londres n'a qu'un circuit de voitures — FAIT en v206.** Soixante
  avenues aux vraies coordonnées, choisies pour se croiser (les bouts posés
  SUR la chaussée d'une autre), quinze circuits mesurés de 92 à 100 % qui
  couvrent cinquante-neuf voies. L'échelle n'y était pour rien : c'étaient
  la Tamise, les parcs et neuf voies qui ne se croisaient pas.
- [x] **Euston Road, côté King's Cross, n'est sur aucune boucle de Londres —
  FAIT en v223, mais pas comme annoncé.** Pentonville Road et Gray's Inn Road
  ne suffisaient pas : mesuré, aucun échange ne donnait ses voitures à King's
  Cross sans en retirer à Tottenham Court Road, au Strand et à Charing Cross
  Road, parce que Bloomsbury n'avait que DEUX liens nord-sud et qu'un seul
  circuit les prenait tous les deux. Sept rues au total — les deux annoncées,
  plus Farringdon Road, Clerkenwell Road, Theobald's Road, Gower Street et Judd
  Street — et douze circuits mesurés à 100 % font rouler cinquante-sept avenues
  sur soixante-dix. King William Street en profite aussi.
- [x] **Pas de pont routier sur la Tamise — FAIT en v208.** Waterloo,
  Blackfriars et London Bridge sont des voies à part entière, tablier à la
  cote des quais et eau dessous ; trois circuits changent de rive, et
  dix-huit circuits couvrent soixante-deux voies sur soixante-trois.
- [ ] **Westminster Bridge, Hungerford et Southwark Bridge n'ont pas de
  chaussée.** Leurs tabliers traverseraient l'emprise de Big Ben et le pied
  du London Eye, la grande roue elle-même, et le Globe. À reprendre le jour
  où ces monuments se déplacent ou se rétrécissent — on ne pose pas un pont
  dans un monument.
- [x] **Réauditer les circuits des autres villes pour les demi-tours — FAIT
  en v207.** Vingt-quatre des quarante-et-un circuits hors Londres
  rebroussaient chemin (Paris cinq sur cinq). La cause était dans le chaînage
  partagé de `voies.js`, qui parcourait chaque avenue en entier ; il roule
  désormais de carrefour en carrefour, et un témoin mesure les virages des six
  villes.
- [x] **Huit avenues de Paris n'étaient plus sur aucune boucle — FAIT en
  v209.** Les places rondes se contournent (`contournerRonds`, partagé avec
  Washington dans `voies.js`), dix vraies rues de raccord ont été tracées
  (Champs-Élysées, Haussmann, Wagram, Batignolles, Ternes, Rochechouart,
  Ménilmontant, Port-Royal, Arago, Suffren), la Porte Maillot est devenue le
  rond-point qu'elle est, et Saint-Michel s'aborde par Port-Royal pour éviter
  le Luxembourg. Huit circuits mesurés couvrent les vingt-huit avenues, le
  plus faible à 97 %.
- [x] **Contourner les socles de monument par un CERCLE ne marche pas — et le
  remède est le PÉRIMÈTRE (v221).** La note ci-dessous reste juste et vaut
  d'être gardée : le tour d'un socle par un cercle coupe les coins dans le
  square planté. Ce qui manquait, c'est qu'un rectangle se contourne par son
  périmètre, et qu'il faut PAVER ce périmètre — c'est ce que fait la v221.
- [ ] **(la mesure d'origine, gardée)** Contourner les socles par un cercle : L'idée évidente est d'ajouter les emprises de monument aux cercles
  que `contournerRonds` fait éviter. Éprouvé sur les cinq circuits de Paris :
  cela supprime bien les traversées (183 pas dans un monument → 0) mais fait
  tomber la tenue de rue de 94 % à 82 %, parce que le tour d'un socle n'est pas
  roulant — mesuré, 56 % autour du Louvre, 47 % autour de la Tour Eiffel, 42 %
  autour du Sacré-Cœur. On échange une voiture dans un mur contre une voiture
  dans la pelouse.
  La vraie cause est ailleurs : **une voie a le CENTRE d'un monument pour point
  de passage**. `pt('Louvre')` rend le centre du Louvre, et la rue de Rivoli le
  traverse donc ; dans la vraie ville elle le LONGE. Idem Haussmann par
  l'Opéra, Suffren et la Motte-Picquet par la Tour Eiffel. Le remède est de
  déplacer ces points de passage au bord de l'emprise — c'est une passe de rues
  comme celle de Londres en v206, avec le sol qui bouge et les bâtiments avec.
- [x] **Paris a récupéré ses trois avenues orphelines — FAIT en v216.** Douze
  vraies rues de raccord (Beaumarchais, Turbigo, les quais de la rive droite,
  Diderot, Bourdon, Ledru-Rollin, la rue du Louvre, le Quatre-Septembre, la rue
  de la Paix, Castiglione, Tronchet, Malesherbes), huit circuits mesurés de 95
  à 100 %, quarante avenues sur quarante parcourues — et le seuil de partage de
  la v211 inchangé : la pire paire tombe de 17 à 13 blocs.
- [ ] **Des avenues ont perdu leurs voitures en v211**, faute d'une boucle qui
  ne se superpose à aucune autre. **Paris (v216), puis San Francisco, Lille,
  Londres et Washington (v223) sont réglés** — les quatre villes que la v211
  avait laissées derrière elle.
  À Londres il demeure treize avenues déclarées sans voitures et à Washington
  dix, mais ce sont des dettes MESURÉES, pas des oublis : la liste de Londres
  vit dans `carteMonde.js`, remesurée en v223 avec une règle qui mesure enfin
  ce qu'elle annonce, et la grille de Washington est saturée (zéro chaîne sur
  vingt-six mille compatible avec les circuits en place). La
  piste est la même qu'en v209 : des voies de RACCORD, tracées sur le vrai plan
  et mesurées, pour que ces quartiers aient leur propre boucle plutôt que de
  repasser sur celle du voisin. **Et la méthode est désormais éprouvée** : à
  Paris, douze rues ont suffi, et l'optimiseur a eu besoin d'une passe de
  RÉPARATION — retirer les circuits qui gênent une avenue laissée dehors,
  forcer sa boucle, recombler — que le tirage au hasard seul n'atteignait pas.
- [x] **Une voiture conduite traversait les murs — FAIT en v212.** Elle
  empruntait la boîte de collision du joueur, 0,6 bloc de large pour une
  carrosserie de 2,26. La largeur vit désormais dans la fiche de l'espèce.
- [x] **L'index périmé du conteneur — COMPRIS en v212.** Trois arbres de
  travail portaient la même branche ; quand l'un avançait, l'index des autres
  devenait le retrait de la livraison. Les arbres d'appoint sont détachés,
  et la règle est écrite dans `CLAUDE.md`.
- [x] **Le train : ni rails, ni escalier — FAIT en v213.** La voie se nivelle
  (filtre en cône, remblai et tranchée), elle porte de vrais rails, et plus
  rien ne barre la route du convoi. Mesuré : marche de 27 blocs → 1, zéro rail
  → 96-99 % des colonnes, 36 obstacles → 0.
- [x] **Les gares — FAIT en v214.** Quai de granit un bloc au-dessus des
  rails, auvent sur piliers, bâtiment de brique. Les dix-huit sont complètes ;
  sur l'ancien code, zéro.
- [x] **Les personnages faisaient peur — FAIT en v215.** L'iris occupait 55 %
  du blanc de l'œil et saillait devant lui : deux billes sombres. Blanc
  agrandi, iris réduit à 38 % et remis dans l'orbite, sourcils plus fins et
  plus hauts, bouche souriante, moustache réduite. Reste à valider en capture
  par Max, comme tout ce qui touche à l'apparence.
- [x] **Des voitures traversaient les monuments de Paris — FAIT en v221.** La
  cause n'était pas seulement « une voie a le centre d'un monument pour point
  de passage » : les DIX monuments ont un socle plus large que la place
  déclarée avec eux, si bien que l'anneau de contournement (`r − 0,5`) passe
  DANS le bâtiment quel que soit le tracé. Chaque monument a désormais sa rue —
  trois blocs de chaussée sur son pourtour — et `contournerBlocs` suit le
  PÉRIMÈTRE du socle. Mesuré des deux côtés, carrosserie dans un bloc solide :
  **49 → 0**. Tenue de rue 95 98 100 99 96 100 100 100 → 94 100 100 100 96 100
  100 100. Témoin dans `carteMonde.js`, rouge sur `origin/main`.

- [ ] **Onze pas de voiture restent dans la butte** — neuf sous le Sacré-Cœur,
  deux au Moulin Rouge. Ces deux-là sont déclarés `sansTour` : l'anneau y
  traverserait douze et dix-huit blocs de dénivelée, et l'essayer a été mesuré
  PIRE que le défaut (dix-neuf pas de carrosserie dans le coteau). Le vrai
  Montmartre n'a pas de boulevard autour de la basilique. Deux pistes, aucune
  gratuite : creuser la rue dans la pente comme la voie ferrée creuse ses
  tranchées (v213 — des blocs, pas `terrainHeight`), ou faire passer le circuit
  plus bas, sur les boulevards, et rétrécir le socle du Sacré-Cœur, qui fait
  seize blocs en v et descend donc jusqu'à Rochechouart.

- [ ] **Le Louvre et l'Opéra bâtissent au-delà de leur socle déclaré.** Mesuré
  sur l'anneau de chaque monument : vingt-neuf colonnes bâties sur les 192 du
  tour du Louvre (15 %), six sur les 228 de l'Opéra (3 %) ; les six autres
  anneaux sont libres à 100 %. Le socle sert à deux choses — rien d'ordinaire
  ne s'y bâtit, et `world.js` en fait la boîte de rendu — donc un socle qui
  sous-déclare son monument le fait aussi trancher de loin. C'est le même
  défaut que l'escalier du Sacré-Cœur, qui descendait à quinze blocs quand sa
  boîte en annonçait douze.

- [ ] **Des voitures traversent encore du BÂTI ORDINAIRE.** Mesuré en pas de
  carrosserie dans un bloc solide, à la cote où la voiture roule : Paris 82
  après la v221 (contre 117 avant), dont 71 dans la ville ordinaire et 11 dans
  la butte. Ailleurs, non remesuré depuis la v210 : Londres 94 (dont 41 sur les
  bus impériaux garés aux arrêts, et six pas dans les fontaines de Trafalgar
  Square), Washington 69 (les ormes du Mall compris), San Francisco 60, Lille
  10, Nice 0. La piste qui reste est la seconde de la v210 : ne pas poser
  d'arbre ni de mobilier sur un tracé de circuit.

- [ ] **La rue de Rivoli traverse le jardin des Tuileries.** `pt('Tuileries')`
  est le CENTRE du jardin, et les places passent avant les rues dans
  `solParis` : la chaussée y disparaît sur une trentaine de blocs, ce qui
  coûte trois points au plus long circuit de Paris (97 % au lieu de 100). La
  vraie rue de Rivoli longe la grille, elle n'entre pas — mais déplacer un
  point de `VOIES` déplace une rue, donc cela se mesure avant de se faire.
- [ ] **Les points de voie de Londres et de Washington sont écrits en BLOCS,
  pas en kilomètres.** (Les sept rues ajoutées à Londres en v223 le sont
  aussi : elles ont été calculées depuis de vraies latitudes et longitudes,
  mais posées en blocs comme leurs voisines, pour ne pas mêler deux unités
  dans la même table. La conversion se fera d'un bloc.) `VOIES` de Londres porte `[[-27, -43], [-12, -48]]`, les
  avenues de Washington de même. C'est le piège nommé dans `CLAUDE.md` en
  v216 : juste aujourd'hui, faux à la prochaine remise à l'échelle, et rien ne
  rougira. Paris, San Francisco et **Lille (fait en v223, conversion prouvée
  exacte : quarante-et-un points comparés, zéro écart)** passent par
  `de(dx, dz)`.

- [x] **La rue Royale de Lille n'est plus parcourue — FAIT en v223.** L'avenue
  Mathias-Delobel, le long du Champ de Mars comme la vraie, lui donne sa
  seconde porte. Quatre circuits mesurés (94 à 100 %) couvrent les dix-huit
  voies de Lille, et la rue de Paris, la rue Gustave-Delory et le boulevard
  Victor-Hugo sont repris par la même passe.
- [x] **Valencia Street ne roulait plus à San Francisco — FAIT en v223.** La
  transversale annoncée existe : la 16e Rue au nord et Cesar Chavez au sud,
  toutes deux réelles. Le tour de la Mission et de Mission Bay les emprunte.
- [ ] **Le socle du Shard est un treillis de verre** — un bloc de `GLASS` dans
  un mur creux est un trou (même règle qu'à San Francisco, v195). Vu en
  capture aérienne de la rive sud en v206, laissé tel quel : hors du sujet
  de la passe de rues.

- [x] **Cinq voies de San Francisco restaient sans circuit — FAIT en v223, et
  la cause n'était pas celle qu'on avait notée.** « Elles bordent le parc et la
  côte, où il n'y a rien à boucler » était une explication, pas une mesure :
  mesurées sur leur propre sol, la Great Highway tenait la rue à ZÉRO pour
  cent, Fulton à 50 %, Third Street et Lincoln Way à 70 %, la 19e Avenue à
  81 %. Ce n'étaient pas des rues. Le parc tient désormais entre Fulton et
  Lincoln, la 19e le traverse comme Crossover Drive, la Great Highway est
  passée côté ville et Third Street est revenue à terre ; cinq vraies rues de
  raccord (Stanyan, Sunset Boulevard, Sloat Boulevard, la 16e Rue, Cesar
  Chavez) et six circuits mesurés à 100 % couvrent les dix-neuf voies.

- [ ] **Une voiture coûte 32,6 maillages** — mesuré en v201, et c'est ce qui
  borne tout le reste : trois fois un personnage, pour un objet qui n'a ni
  bras ni jambes. Le modèle `.glb` arrive découpé en trente-deux morceaux, et
  seuls les quatre pivots `Wheel_*` ont besoin de tourner. Fusionner le reste
  par matériau, une fois au chargement, diviserait le coût par cinq et
  permettrait d'en dessiner beaucoup plus. À faire hors ligne ou à la volée,
  jamais avec un décodeur embarqué dans la PWA.

- [ ] **Il manque deux tuiles de façade au jeu** — la v202 a sorti le verre de
  toutes les villes, mais faute de mieux SoMa, les Victoriennes de San
  Francisco, la brique de Lille et les façades ocre de Nice portent toutes le
  même `ARCHI.ETAGE`, qui est une fenêtre haussmannienne à petits bois. C'est
  opaque et c'est déjà juste de loin ; de près, un entrepôt de SoMa n'a pas
  des fenêtres parisiennes. Deux tuiles à peindre dans `textures.js`, sur le
  modèle des blocs `ARCHI` : « fenêtre industrielle » (grande, à croisillons
  métalliques) et « fenêtre de Victorienne » (baie en encorbellement).

- [x] **Des arbres dans les rues de Londres — FAIT en v197.** Et le remède
  vaut pour Nice et Lille, qui avaient le même défaut : leurs parcs
  marquaient déjà des arbres, posés à plat comme n'importe quel sol.

- [ ] **(historique) Des arbres dans les rues de Londres** — Max, même capture : « pas
  d'arbres ». Paris en a depuis la v187 (le feuillage pousse dans `world.js` à
  partir des marques de `solParis`), Londres non : ses rues n'ont que des
  façades. Même recette à appliquer — et il faut ESPACER, sinon une colonne sur
  deux fait une haie pleine qui bouche la rue.

- [ ] **Programme réalisme v2** (prompt de Max, 28/08) — il juge uniquement
  sur captures ; chaque ville retravaillée est montrée AVANT fusion (rue +
  aérien + photo de référence), généralisation seulement après validation.
  Fait : 1) mobilier (v180), 2) routes (v181), 3) façades partout, matériaux
  par ville, médinas préservées (v181) — et LA voiture : le modèle 3D
  d'artiste fourni par Max, reflets par caméra cubique, vue cockpit (v181).
  4) vie dense : **les feux tricolores s'allument une couleur à la fois et la
  circulation s'y arrête (v273)** — la règle est pure (`src/feux.js`), lue par
  celui qui allume les lentilles comme par celle qui freine ; deux rues d'un
  carrefour ne sont jamais vertes ensemble. **À venir : les enseignes
  lumineuses la nuit.**

- [ ] **Moderniser les villes bâties à la main** — New York est faite (v186,
  validée par Max : « Manhattan est mieux, je valide fort ») et **Paris aussi
  (v187, 8 → 24 blocs/km)**. Restent Londres, Nice, Lille et San Francisco,
  qui vivent encore à leur échelle d'origine. **San Francisco est faite
  (v192, 9 → 27 blocs/km)** ; **Londres était DÉJÀ à 24 blocs/km** — il ne lui
  manque pas une remise à l'échelle mais la passe de rue. **Nice est faite
  (v203, 10 → 30 blocs/km, disque de 144)** et **Lille aussi (v204, 16 → 32
  blocs/km, disque de 92, double empreinte)**. Toutes les villes bâties à la
  main sont désormais à l'échelle GTA ; ce qui reste, c'est la passe de rue
  de Londres et les monuments à refaire là où ils n'ont pas suivi. Le piège
  est écrit dans `CLAUDE.md` (section Paris) : les largeurs ne se projettent
  pas, elles se relèvent — et il faut refaire les monuments, qui ne
  grandissent pas avec la carte.

- [ ] **Le métro de Paris, pour de vrai** — l'anneau souterrain de v163 est
  resté à trente-huit blocs de rayon pendant que la ville en prenait 185 :
  il fait donc désormais la boucle du centre historique, ce qui est juste mais
  petit. Paris mérite ses vraies lignes (1, 4, 6) avec leurs stations, par le
  creuseur de Washington. Et la caserne et le commissariat, eux, sont restés
  au cœur — plausible (la Préfecture est bien sur la Cité) mais à reprendre en
  façades de pierre plutôt qu'en halles de béton.

- [x] **Le rouge ancien des suites réseau du portail — CLOS en v195/v196.**
  Les treize suites sont vertes. Sept vieux rouges ont été démontés, et
  AUCUN n'était un défaut du jeu : une durée mesurée sans laisser souffler la
  machine (55 s annoncés, six mesurés seule), un appui long que la carte
  refuse à bon droit depuis la v173, une fausse encoche d'iPhone jamais
  retirée, un fond de carte qui dépendait d'où le test précédent avait laissé
  l'enfant, une horloge écrite « la valeur d'avant + 1 », un document de
  destination erroné, et une relance de page — voulue depuis la v189 — prise
  pour une panne à trois reprises. Le seul qui venait de nous était le témoin
  du musée de l'Air et de l'Espace, cassé en calmant la marche en v192.

- [x] **Une page légère pour les tests réseau — ABANDONNÉ, et mesuré.**
  L'idée était de sauter la scène Three.js pour les suites réseau, en
  estimant le démarrage d'une page à dix secondes dont l'essentiel en 3D.
  **La mesure dit le contraire** : le démarrage tient en 4,6 s, dont
  4 532 ms de CHARGEMENT (78 requêtes, 3,5 Mo de modules) et seulement
  84 ms pour la scène et le lancement de la partie. Le banc charge déjà
  chaque page avec `rr=2` — deux morceaux de monde de rayon — donc la
  génération du terrain est réduite depuis longtemps.

  Une page légère chargerait exactement les mêmes modules : le gain serait
  d'une fraction de seconde par page, pour un changement au chemin de
  DÉMARRAGE du jeu — celui que les enfants lancent. Refait, le calcul donne
  2,5 minutes sur `reseau.js`, pas les cinq à six annoncées. Le rapport
  n'y est pas.

  Ce qui reste vrai et gagnable sans toucher au jeu : les **124 s
  d'attentes fixes** de la suite, à remplacer par des conditions bornées.

- [ ] **(historique) Le rouge ancien des suites réseau** — `hote.js`, `visio.js`
  et `reglages.js` sont réparées. `reseau.js` **va au bout pour la première
  fois** : elle s'effondrait au 27ᵉ témoin, elle en passe désormais soixante.

  Ce qui l'a débloquée n'était pas le jeu. `endormir()` ne fait dormir que le
  RÉSEAU — la page continue de dessiner un monde en 3D à plein régime, et le
  navigateur du banc tourne avec `--disable-renderer-backgrounding`. Cette
  page-là n'était jamais refermée : elle brûlait un cœur sur quatre du milieu
  de la suite jusqu'à la fin, pile sous les scénarios qui chronomètrent.
  Mesuré à la sonde, page seule : renoncer sur un courtier muet met **13,0 s**
  (9 s d'attente du courtier, 4 s de course vers le nuage), contre 24 à 29 s
  avec le fantôme à côté. Aucun seuil n'a été relevé.

  **v190 corrige le plus gros** : chez l'invité, un lien direct jamais ouvert
  chassait le lien par le nuage qui portait la partie. Prouvé à la sonde, sur
  machine vide, pair-à-pair coupé à la racine — le bloc passait de « jamais en
  soixante secondes » à « moins de deux secondes ». `reseau.js` monte à
  cinquante-huit témoins verts.

  **Restent cinq rouges, et ils se ressemblent tous :**

  1. `un bloc posé par le nuage arrive chez l'autre`, `revenir dans
     l'application remet dans la partie` et `et les blocs repassent après le
     retour` — les trois scénarios de NUAGE, tous rouges dans la suite et tous
     VERTS à la sonde sur machine vide. La chronologie montre `liens: 1,
     prets: 0` des deux côtés pendant quatre-vingt-dix secondes : le lien
     existe, la présentation n'aboutit jamais. Le prochain pas est celui qui a
     marché pour le courtier muet — reproduire à la sonde AVEC la charge, pour
     savoir ce qui expire.
  2. `quand le relais répond, on accuse le VPN et pas le Wi-Fi` — le message
     bascule d'un tour à l'autre : `relaisJoignable` dépend de la première
     réponse du relais, qui arrive parfois après la limite de douze secondes.
  3. `un monde bien rempli ne retarde pas les retrouvailles` — mille six cents
     blocs, 41 s. Mesure de durée : à éprouver d'abord à la sonde, page seule.

  **Et un mensonge à corriger, vu à la sonde :** même réparé, le bandeau de
  l'invité repasse à « reconnexion » alors que le nuage porte la partie très
  bien. Pour un enfant, lire « reconnexion » pendant que tout marche est le
  même défaut que le « ça marche ! » affiché sur une session morte, dans
  l'autre sens.

- [ ] **Les métros des grandes villes générées** — le creuseur de Washington
  sait faire ; après les trains intervilles.

- [ ] **Le tour du monde, approfondissements** — DEUX CENT SOIXANTE-DIX-HUIT
  lieux au registre (v173) : Londres à la main, les autres par la machine.
  La suite est du raffinement : donner à Tokyo, Rome ou Rio la profondeur
  artisanale de Londres (voies nommées, mobilier, intérieurs), et les mers
  manquantes du planisphère (mer Noire, Caspienne, Baltique fine) quand un
  enfant les cherchera. Question produit ouverte : que se passe-t-il quand
  un enfant se dépose volontairement en plein océan ? (Aujourd'hui : il
  nage.)
  Neuf monuments du catalogue attendent encore leur adresse dans des villes
  déjà bâties : Notre-Dame, le Sacré-Cœur et l'Élysée à Paris ; l'Empire
  State, le Chrysler, la Statue de la Liberté et le Flatiron à New York ;
  le Golden Gate à San Francisco.

- [ ] **Recalibrer les monuments existants** dans le ciel à 160 blocs. Ceux de
  Washington sont à leur échelle depuis v162 — l'obélisque à soixante-douze
  blocs, la ville entière à 48 blocs/km.

- [ ] **Le reste de Washington** — la Cathédrale nationale et Georgetown
  University, sorties de l'emprise quand l'échelle a triplé (elles attendent
  que le monde grandisse) ; les lignes Orange et Argent, qui partagent le
  tunnel de la Bleue dans la vraie ville ; les guides qui racontent ce qu'on
  visite. Le mémorial Roosevelt, lui, est revenu en v162.

- [ ] **Ce que Washington a à apprendre** — la ville est pleine de choses qui
  se racontent : pourquoi les avenues coupent la grille en diagonale, pourquoi
  aucun immeuble ne dépasse le dôme, pourquoi les cerisiers du Tidal Basin
  viennent du Japon, pourquoi Georgetown n'a pas de métro. Rien de tout cela
  n'atteint l'enfant pour l'instant — c'est dans les commentaires du code, et
  un enfant de sept ans ne lit pas le code. Des questions dans `education.js`,
  ou des panneaux à lire sur place.

- [ ] **L'usine automobile et le mode conduite** — chaîne de production
  documentée sur de vraies recherches (emboutissage, carrosserie robotisée,
  peinture, mariage batterie-caisse, piste d'essai), la voiture qui se construit
  de poste en poste, et à la sortie **on monte dedans et on la conduit**. Le
  travail est dans le mode `pilote`, pas dans la chaîne — voir la section
  « Conduire » de `CLAUDE.md`. **v188 a posé la première brique** : une voiture
  ne vole plus (`vole: false` dans la fiche, `player.volInterdit` l'applique).
  Restent les deux difficultés réelles, écrites dans `CLAUDE.md` : le véhicule
  a besoin de SA boîte de collision — celle du joueur fait 0,6 bloc, une
  voiture qui l'emprunte traverse les murs — et un véhicule conduit doit se
  voir en ligne, sinon Alice ne verra qu'un enfant qui glisse à toute vitesse.

- [ ] **Les garages, la suite** — v188 en pose deux dans la bibliothèque et
  garde la voiture qu'on y laisse. Ce qui manque : un garage posé sur une
  PENTE s'enterre, parce que la pose cherche le point le plus bas sous
  l'emprise (juste pour un monument, fatal pour un bâtiment de plain-pied) ;
  un garage démoli laisse une place de parking invisible ; et rien ne garde
  encore les autres véhicules — la voiture seule est `garable`.

- [ ] **Apprendre** — guides dans les villes, questions audio.

- [ ] **Notifications push** — l'invitation atteint l'application fermée.

- [ ] **Intérieurs** — les monuments se visitent.

---

## Fait récemment

- [x] **v264** — Les flammes des réacteurs : une par tuyère déclarée par le
  bâtisseur (`tuyere()` dans `reacteur()` et à la tuyère du chasseur), deux
  cônes additifs non éclairés dont `fun.js` règle la longueur sur la manette
  à chaque image, éteintes à l'arrêt et à la descente. Trois témoins de
  `monte.js`.
- [x] **v263** — Le cadran de cap aux commandes (`src/cap.js`, pur) : cap en
  degrés, ville la plus proche dans le cône de ±45° devant l'appareil (tout
  le registre, villes engendrées comprises) et sa distance en km, repère qui
  glisse sur une règle, flèche et plus proche ville quand rien n'est devant.
  Trois témoins de `monte.js` lisent le texte du cadran.
- [x] **v262** — La manette des gaz (cadran à droite, pointeur à part) pour
  voitures et avions ; inertie et volant au joystick pour la voiture ;
  décrochage et atterrissage manuel, bouton 🛞 du train, atterrissage sur
  le ventre dit ; boutons de la marche effacés en véhicule (classes
  `en-vehicule`/`en-avion`). Six témoins tactiles à deux doigts dans
  `monte.js`. Reste de #36 : rien ; #37 (flammes du réacteur) à suivre.
- [x] **v261** — L'avion décolle de sa piste et s'y pose : cinq états du mode
  `pilote` (`sol`, `decollage`, `vol`, `atterrissage`, `freinage`), fiches
  `rotation`/`approche`/`roulage`/`frein`, assiette rendue avec pivot sur le
  train principal, jambes du train en membres qui rentrent et sortent,
  arrondi, marche d'un bloc franchie au roulage. Cinq témoins de `monte.js`
  sur une piste de pierre, captures de côté.
- [x] **v260** — Chaque voiture roule à l'allure de sa classe (citadine ×3,8,
  berline/SUV ×4,4, GT ×5,4, sportive ×6,4, hypercar ×8 ; plafond 28 blocs/s
  en ville par l'arithmétique de la v237). Témoin de `monte.js`.
- [x] **v259** — Les passants ne traversent plus la voiture de l'enfant
  (ni celles de la rue, ni les véhicules posés) : regard-devant d'un pas
  dans `BaseNPC.update`, `contourner()` chez `Habitant` et `Wanderer`,
  `world.obstaclePieton` branché par `main.js` sur `vehicules.voitureA` et
  les bêtes à `gabarit` ; `posteAutour` ne tire plus une place dans une
  voiture ; devant une voiture qui arrive (`world.vehiculeApproche`, sur
  `player.pousse` et `vehicules.enMarche`) le piéton s'écarte (`ecart`), et
  la voiture de l'enfant freine devant un piéton (`pietonDevant`, troisième
  famille d'`obstacleVehicule`). Deux témoins de `monte.js`, rouges sur
  l'ancien code (287 à 449 relevés dedans à l'arrêt ; traversée en roulant).
- [x] **v258** — Le jeu se prépare avant « Jouer » (ligne d'avancement,
  boutons grisés jusqu'à corps + programmes + fond de carte, borné à 45 s,
  position restaurée dès l'accueil) ; la carte du monde calcule son fond par
  tranches de 8 ms et ne le recalcule que quand la vue en sort ; la minicarte
  se repeint deux lignes par image, se remplit après un saut et n'engendre
  plus jamais un morceau. Banc : `?prep=0`, `{ prep: 1 }`, `{ pret: true }`.
- [x] **v257** — L'installation se voit : le loader compte les fichiers
  rangés pendant la mise à jour, puis reste après le rechargement jusqu'à ce
  que corps et programmes soient prêts ; une version ne se revalide plus ;
  « Graphismes avancés » dans les Réglages (normal par défaut sur tablette) ;
  `?diag=1` et les paramètres d'isolement pour mesurer sur l'appareil. Et
  deux témoins de `reseau.js` rendus robustes (bêtes d'Alice, corps de Milo).
- [x] **v256** — Le panneau 🛠️ s'en va (atelier, coffre, quête, panneaux,
  chantier, records, chapeaux, feux d'artifice), le bouton devient 🖼️
  Souvenirs ; aucune donnée effacée, les messages d'une ancienne tablette
  ignorés sans casse et relayés. Et la Rotonde de `washington.js` se rejoint
  jusqu'à être entré, plus en quatorze pas.

- [x] **v255** — Le portail d'essai attend ce qui compte, plus le temps :
  instrument de charge instantané (`tests/charge.js`, `/proc/stat` sur une
  demi-seconde) pour `souffler` et le repos entre suites, une charge stable
  se dit au lieu de s'attendre, `jouerSeul` en condition bornée, suites
  courtes d'abord, empreinte de reprise sur la forme du banc. Quinze suites
  depuis zéro : 74 → 51 minutes, 9 → 0 minutes d'attente entre suites,
  respiration 615 → 119 s, mêmes témoins. Étapes 2 (tempo) et 3 (deux
  machines) déclarées ci-dessus.

- [x] **v254** — Le badge de version ouvre « Quoi de neuf ? » : cent deux
  entrées écrites pour un enfant (`src/nouveautes.js`), la version installée
  marquée, la mise à jour forcée en bouton ; et fermée, la modale ne couvre
  rien (`hidden` perdait contre `display: flex` — attrapé par `carte.js`).

- [x] **v253** — À plusieurs, le véhicule voyage avec la position : on voit
  l'ami dans sa voiture, on monte avec lui comme passager, le premier
  conduit.

- [x] **v246** — La téléportation ne fige plus l'écran (les dix-neuf
  signatures de programme de la flotte et des humains, lues dans les fichiers,
  se compilent à l'accueil ; zéro programme neuf à l'arrivée à Paris, vingt
  avant ; les passants naissent par tranches), la Bugatti roule sans traînées
  et la Lucid retrouve sa forme (une pièce de roue est un mot entier et une
  géométrie : `/rim/` attrapait « trim »), et chaque ville a ses voitures
  (graine par ville, laque par voiture : Moscou, sept modèles et huit couleurs
  sur douze voitures visibles).

- [x] **v226** — Les villes ne sont plus vides quand on y arrive. Les cadences
  de ménage (passants, circulation, garagiste, aéroportiste) comptaient en
  `dt`, borné à 1/20 s : à 2,7 images par seconde, un minuteur de deux
  secondes demandait quatorze secondes réelles. Pire de la traversée 3 → 16,
  peuplement à l'arrivée 6-8 s → 1 s.

- [x] **v225** — Le portail passe de 59 à 48 minutes. Le seuil de `souffler()`
  était SOUS le coût d'une seule page (mesuré : une page ouverte = 3,8 sur
  quatre cœurs, deux pages = 4,7) ; porté à 4,2, il distingue enfin la
  concurrence réelle. Treize suites vertes.

- [x] **v224** — Le portail passe de 83 à 59 minutes. `souffler()` expirait à
  deux minutes cinq fois sur six ; ramené à trente secondes, treize suites
  vertes et rien de perdu. Plus le chronomètre par suite et par témoin, et
  l'élargissement de la table des gardiens reconnu comme anodin.

- [x] **v223** — On pilote un avion (avion de ligne 110 blocs/s, Concorde et
  chasseur 264), et dix-neuf aérodromes pour avoir où atterrir : Roissy
  déménagé hors de Paris, quatorze aéroports de plus, quatre bases aériennes,
  des terminaux qu'on traverse à pied. Double empreinte refaite — 172 379
  colonnes, `fa120ab1…` des deux côtés.

- [x] **v187** — Paris à l'échelle GTA : 24 blocs par kilomètre, un disque de
  185, des rues où l'on marche, une rue par quartier, l'Étoile à sa vraie
  taille, et quatre monuments refaits (Tour Eiffel en treillis, Arc de
  Triomphe à quatre faces, Notre-Dame, Panthéon). Plus la carte : elle ne
  s'étire plus sur un téléphone couché, et on y cherche un lieu par son nom.

- [x] **v186** — New York à l'échelle GTA (34 blocs/km, Times Square, les
  monuments à leur vraie emprise), des voitures dans TOUTES les villes (les
  villes de fleuve n'avaient aucun anneau, les villes bâties à la main
  aucun tout court), et les fenêtres qui restent allumées la nuit.

- [x] **v185** — les roues tournent avec le sol qui défile, rayon mesuré par
  modèle, et un téléport ne les fait plus tournoyer.

- [x] **v184** — la flotte : cinquante modèles fournis par Max tirés au sort
  (le Chiron d'artiste reste en rotation), téléchargés à la première
  rencontre par le canal statique — et le filet de l'écran compte en temps
  réel (la moitié noire d'iPad se répare même quand les images bégaient).

- [x] **v183** — la vue GTA au volant (fiche `poursuite`, caméra derrière,
  anti-mur), la voiture remise à l'endroit (l'avant vérifié par les phares —
  elle roulait à l'envers depuis v181), vitres transparentes, nez fermé.

- [x] **v182** — la voiture garée ne bouge plus (« tac tac tac »), la marche
  n'hérite plus de la rampe de vol, et la fumée éprouve la bibliothèque là où
  v176 l'a mise — le portail redevient `npm test`, jamais une liste de suites.

- [x] **v181** — réalisme v2, deuxième acte : vrai bitume et marquages dans la
  texture, la grammaire de façades généralisée aux 278 villes, et LA voiture —
  le modèle d'artiste fourni par Max, reflets par caméra cubique, vue cockpit.

- [x] **v180** — réalisme v2, premier acte : réverbères-meshes fins, feux
  tricolores aux carrefours, jardinières, marquage net ou rien.

- [x] **v179** — les trains intervilles : six vraies lignes en neuf navettes
  de gare en gare, ballast, viaduc sur la Manche, le trait sur la carte, et
  « Monter à bord » pour voyager.

- [x] **v178** — les villes respirent (Londres recalibrée, un lot sur dix en
  jardin de poche dans les 278 villes) et vivent (bus montables, six
  voitures, dix passants dont deux chiens par ville).

- [x] **v177** — les calottes polaires sont blanches : neige et glace au-delà
  de 78° nord et 63° sud, au sol comme sur la carte.

- [x] **v176** — l'onglet 🏛️ Bâtiments dans le + (601 modèles, vignettes en
  élévation, 15 familles nouvelles, 6 blocs d'architecture neufs) — et le vol
  reréglé sur verdict : croisière ×8 en dix-sept secondes.

- [x] **v175** — le vol prend sa vitesse de croisière : l'allure grandit sans
  à-coup avec le temps de vol, jusqu'à ×6 (66 blocs/s) — Paris-Rome en une
  demi-minute.

- [x] **v174** — les poissons : un banc de récif entretenu autour de
  l'enfant, partout où il y a de l'eau — six robes vives, nage vraie,
  naissance à portée de vue.
- [x] **v173** — les deux cents villes : 223 villes générées par archétypes
  régionaux avec côte automatique, 278 lieux au registre, plus d'arbres
  sauvages dans les rues — et le métro de Washington dégelé (le piège de
  flottants qui remettait la pause à l'infini, bug de production attrapé
  par la barrière).
- [x] **v164** — la carte prend ses vraies coordonnées : chaque ville déduite
  de sa latitude et de sa longitude, aucun chevauchement (marge la plus étroite
  58 blocs), et le tour du monde commence — neuf villes, dix monuments qui se
  dressent enfin quelque part. Plus : la reprise d'hôte automatique quand celui
  qui héberge s'en va, la voix de robot qui se répare seule, la baie de Nice
  qui existe enfin, et deux témoins pris en flagrant délit de mensonge (voir le
  journal).


- [x] **v163** — le métro de Paris passe sous terre : tunnel annulaire, quatre
  stations à quais, bouches de métro au bord du trottoir, plus un seul pilier.
- [x] **v162** — Washington repris à zéro sur le verdict de Max (« très low
  cost ») : échelle triplée (48 blocs/km), le cœur monumental seulement, les
  douze musées du Mall, trente-deux intérieurs réels (hémicycles du Capitole,
  Bureau ovale, avions suspendus), maisons à étages, vingt vraies stations, et
  le pont de la Jaune sur le Potomac. L'ancienne emprise rend son relief de
  v160 au bloc près.

- [x] **v161** — Washington : le plan de L'Enfant, le Mall, vingt-quatre
  monuments dans lesquels on entre, trois ponts, et quatre lignes de métro dont
  les rames s'arrêtent en station. Le sol a bougé sous la ville, et **nulle part
  ailleurs** — c'est vérifié par une seconde empreinte.

- [x] **v160** — les huit familles de bâtiments : 301 modèles en tout, variés
  pour de vrai (123 à 3 921 blocs), atteignables sans liste de 301 lignes.

- [x] **v159** — la bibliothèque de monuments branchée (onglet 🏛️, 21 bâtiments,
  pose devant soi, envoi par lots) et le portail à deux voies.
- [x] **v158** — la sauvegarde cesse de jeter les blocs de Marlon.
- [x] **v157** — la monoplace freine dans les virages.
- [x] **v156** — l'enfant n'est plus seul dans un monde peuplé.
- [x] **v155** — on monte sur les bêtes, et on monte à bord.
