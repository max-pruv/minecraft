# Ce qui est en cours

**Pourquoi ce fichier est dans le dépôt.** La liste de tâches de la session vit
dans le conteneur, et le conteneur a été recyclé sept fois en deux jours. Deux
entrées ont disparu avec lui — la refonte de la sauvegarde et la géographie —
sans que personne ne s'en aperçoive sur le moment. Ce qui compte assez pour être
suivi compte assez pour être versionné.

Tenu à jour à chaque livraison, comme `CHANGELOG.md`. Le journal dit ce qui est
**fait** ; ce fichier dit ce qui **reste**.

---

## En cours

- [x] **Washington n'a pas de circuit de voitures — FAIT en v205.** Onze
  circuits mesurés à 99–100 % couvrent trente-trois des trente-six avenues
  nommées ; les quatorze ronds-points ont gagné une chaussée et les circuits
  les contournent au lieu de les traverser.

- [ ] **Trois avenues de Washington restent sans circuit** — Virginia Avenue
  NO, New York Avenue NO et Constitution ouest (de la 17e au Lincoln) ne
  referment aucune boucle au-dessus du seuil : Virginia meurt sur
  Constitution à la 21e, New York sur la 15e sans rue de retour, et
  Constitution ouest longe le bassin sans rien pour boucler. Il faudrait des
  raccords de plus (la 21e ou la 23e Rue vers K Street), à mesurer.

- [x] **Londres n'a qu'un circuit de voitures — FAIT en v206.** Soixante
  avenues aux vraies coordonnées, choisies pour se croiser (les bouts posés
  SUR la chaussée d'une autre), quinze circuits mesurés de 92 à 100 % qui
  couvrent cinquante-neuf voies. L'échelle n'y était pour rien : c'étaient
  la Tamise, les parcs et neuf voies qui ne se croisaient pas.
- [ ] **Euston Road, côté King's Cross, n'est sur aucune boucle de Londres.**
  C'est un cul-de-sac : rien ne part de King's Cross vers l'est ni vers le
  sud. Il lui manque Pentonville Road et Gray's Inn Road pour refermer sur
  Bloomsbury — deux voies à tracer et à mesurer.
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
- [ ] **Des avenues ont perdu leurs voitures en v211**, faute d'une boucle qui
  ne se superpose à aucune autre. Nommément : à Paris l'avenue de l'Opéra, le
  Faubourg Saint-Antoine et le boulevard Haussmann ; à Lille la rue de Paris,
  Gustave-Delory, Victor-Hugo et la rue Royale ; à San Francisco Valencia,
  Fulton, Lincoln Way, la Great Highway, la 19e Avenue et Third Street ; à
  Washington Virginia Avenue, Constitution ouest et cinq rues de la grille ; à
  Londres dix-sept voies, dont The Mall, Piccadilly et Marylebone Road. La
  piste est la même qu'en v209 : des voies de RACCORD, tracées sur le vrai plan
  et mesurées, pour que ces quartiers aient leur propre boucle plutôt que de
  repasser sur celle du voisin.
- [x] **Une voiture conduite traversait les murs — FAIT en v212.** Elle
  empruntait la boîte de collision du joueur, 0,6 bloc de large pour une
  carrosserie de 2,26. La largeur vit désormais dans la fiche de l'espèce.
- [x] **L'index périmé du conteneur — COMPRIS en v212.** Trois arbres de
  travail portaient la même branche ; quand l'un avançait, l'index des autres
  devenait le retrait de la livraison. Les arbres d'appoint sont détachés,
  et la règle est écrite dans `CLAUDE.md`.
- [ ] **Le train : ni rails, ni gares, et des tranchées dans le terrain.**
  Signalé par Max en capture : « train no rails, holes, no end stations ». La
  voie ferrée du tour du monde se rend comme une poutre continue, sans
  traverses ni ballast visible, elle traverse un plan d'eau creusé en gradins,
  et aucune gare ne marque ses extrémités.
- [ ] **Les personnages font peur** — « personnages are scary », capture d'un
  villageois à l'appui. Le visage est un dessin grossier sur un cube, et la
  tête paraît détachée du torse. À reprendre avec les enfants en tête.
- [ ] **Des voitures traversent encore du BÂTI** (le relief, lui, est réglé
  depuis la v210). Mesuré en pas de convoi dans un bloc solide, à la cote où
  la voiture roule : Paris 202 (monuments et façades haussmanniennes — le
  Louvre, l'Opéra, la Tour Eiffel, l'Arc de Triomphe, les Invalides, tous
  traversés parce qu'une voie a leur CENTRE pour point de passage), Londres 94
  (dont 41 sur les bus impériaux garés aux arrêts, et six pas dans les
  fontaines de Trafalgar Square), Washington 69 (les ormes du Mall compris),
  San Francisco 60, Lille 10, Nice 0. Deux pistes : contourner les emprises de
  monument comme on contourne les places rondes (`contournerRonds`), et ne pas
  poser d'arbre ni de mobilier sur un tracé de circuit.
- [ ] **La rue de Rivoli traverse le jardin des Tuileries.** `pt('Tuileries')`
  est le CENTRE du jardin, et les places passent avant les rues dans
  `solParis` : la chaussée y disparaît sur une trentaine de blocs, ce qui
  coûte trois points au plus long circuit de Paris (97 % au lieu de 100). La
  vraie rue de Rivoli longe la grille, elle n'entre pas — mais déplacer un
  point de `VOIES` déplace une rue, donc cela se mesure avant de se faire.
- [ ] **La rue Royale de Lille n'est plus parcourue** — c'est une impasse
  depuis que le chaînage refuse les allers-retours ; il lui manque une voie
  de retour vers la citadelle ou la Grand-Place.
- [ ] **Valencia Street ne roule plus à San Francisco** — impasse, comme la
  rue Royale ; elle rejoindrait Mission par une transversale (la 24e ou
  Cesar Chavez), à tracer.
- [ ] **Le socle du Shard est un treillis de verre** — un bloc de `GLASS` dans
  un mur creux est un trou (même règle qu'à San Francisco, v195). Vu en
  capture aérienne de la rive sud en v206, laissé tel quel : hors du sujet
  de la passe de rues.

- [ ] **Cinq voies de San Francisco restent sans circuit** — Fulton, Lincoln
  Way, la Great Highway, la 19e Avenue et Third Street ne referment aucune
  boucle au-dessus du seuil. Ces cinq-là bordent le Golden Gate Park et la
  côte, où il n'y a rien à boucler. Depuis v207, quatre circuits sans
  demi-tour couvrent huit voies sur quatorze.

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
