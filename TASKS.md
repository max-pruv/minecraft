# Ce qui est en cours

- **Personnages et véhicules v241 :** compléter la variété des anatomies et vêtements, les expressions faciales et la validation Safari/iPad physique. Les costumes historiques et plusieurs voitures du catalogue restent plus simples ; ne pas les présenter comme photoréalistes.

- **Les avions ont perdu leur rapport de vitesse réel (v229).** Le plafond du
  chargement du monde est 110 blocs/s ; les vitesses sont donc 95 (avion de
  ligne) et 110 (Concorde, chasseur), soit un rapport de 1,16 au lieu du 1 à
  2,4 du réel. Décision de Max, « tout le monde autour de cent ». Pour le
  reprendre il faut mailler plus vite : 45 % du coût est la génération du
  relief (`fbm`, `terrainHeight`, `treeAt`, `cityAt`), qui est le chemin le
  plus chaud du jeu et voisin de l'invariant 1 — donc un chantier à part, avec
  sa double empreinte.

**Pourquoi ce fichier est dans le dépôt.** La liste de tâches de la session vit
dans le conteneur, et le conteneur a été recyclé sept fois en deux jours. Deux
entrées ont disparu avec lui — la refonte de la sauvegarde et la géographie —
sans que personne ne s'en aperçoive sur le moment. Ce qui compte assez pour être
suivi compte assez pour être versionné.

Tenu à jour à chaque livraison, comme `CHANGELOG.md`. Le journal dit ce qui est
**fait** ; ce fichier dit ce qui **reste**.

---

## En cours

- [ ] **« La reprise tient dans la durée » (`reseau.js`) — ROUGE SEULE DES
  DEUX CÔTÉS le soir de la v260, verte seule des deux côtés le matin de la
  v259.** À la v260 : rouge aux deux portails (dont « à trois, chacun voit
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
- [ ] **« L'écran ne se fige pas en arrivant sur une ville » rouge au premier
  passage, mesuré des deux côtés (v259).** Deux portails de suite sur la
  branche (2 983 ms / 35,8 %, puis 1 817 ms / 12 %), et le témoin extrait
  dans une sonde (`scratchpad/v259/sonde-gel.cjs`), deux tours de suite sur
  chaque arbre : branche 1 267 ms / 7,1 % puis 400 / 2,2 ; `origin/main`
  (v258) 1 367 ms / 9,7 % puis 300 / 0. Le PREMIER survol de Paris paie la
  compilation des programmes que le banc, ouvert avec `?prep=0`, n'a pas
  chauffés (v246, v258) ; le second est sous les barres des deux côtés.
  Piste : ce témoin demande `{ pret: true }` (la chauffe avant « Jouer »,
  comme `carte.js`), sinon il mesure la chauffe et non l'arrivée.
- [ ] **Rouges de portail de `manhattan.js` à une image par seconde, mesurés
  des deux côtés (v259).** Quatre témoins — « le trou enlève aussi la
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
- [ ] **Avions : vrai décollage, vrai atterrissage, roulage (Max, après la
  v259).** « Accélération sur la piste puis décollage en levant le nez ;
  à l'atterrissage, baisser l'altitude et ouvrir le train ; et le roulage
  sur la piste. » Aujourd'hui ✈️ fait une montée automatique de vingt blocs
  (v228) et un second appui pose. À faire dans `player.js` (mode `pilote`),
  `fun.js`, `avions.js` : phase ROULAGE (au sol, le joystick dirige, allure
  de roulage), DÉCOLLAGE (accélération jusqu'à la vitesse de rotation de la
  fiche, nez qui se lève progressivement, train qui rentre), ATTERRISSAGE
  (assiette de descente, train qui sort sous une altitude, toucher, freinage).
  Le train doit exister sur les modèles et s'animer. Garder les commandes
  d'enfant de la v228. Témoins : distance de roulage avant décollage, tangage
  au décollage, train rentré en vol et sorti sous l'altitude, vitesse nulle
  après l'atterrissage. Fiches par appareil, comme `max` et `virage`.

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

- [ ] **Ce qui reste du gel de téléportation après la v246 : le MAILLAGE
  des morceaux à l'arrivée.** Les programmes de la flotte et des humains ne
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
  l'ancien code. Reste : sans courtier (partie par le nuage seul) le
  conducteur n'a pas d'identifiant de pair et voit ses passagers debout ;
  et les montures sans `siege` (cheval, avion) se voient encore à pied chez
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

- [ ] **Le témoin de chargement du monde vole au-dessus d'un désert.** « En vol,
  on ne rattrape pas le bout du monde qui se charge » (`monte.js`) se place à
  (30 000, 30 000), un couloir vierge où un morceau coûte 6,8 ms. Au-dessus de
  Paris il en coûte 23,5. Le témoin est donc vert alors que l'enfant, lui, ne
  voit rien — c'est ce qui a laissé passer la v229 à la v236. Le paysage
  lointain de la v237 rend le symptôme invisible ; le déficit de maillage, lui,
  est intact. À reprendre : le faire voler au-dessus d'une ville, et remesurer
  les vitesses des avions sur le VRAI débit (42 morceaux/s, pas 154).

- [ ] **Le paysage lointain montre le relief, pas les villes.** `terrainHeight`
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

- [ ] **`generateChunk` parcourt TOUS les blocs de l'enfant à chaque morceau
  engendré.** `for (const [k, id] of this.edits)` avec un `split(',').map(Number)`
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

- [ ] **Un terminal n'a ni sièges, ni comptoirs, ni tapis à bagages.** Il se
  traverse (c'est ce que le témoin garde) mais il est vide. Même dette que les
  intérieurs de monuments.

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
  À venir : 4) vie dense — voitures arrêtées aux feux, enseignes lumineuses
  la nuit.

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
