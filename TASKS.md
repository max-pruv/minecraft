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

- [ ] **D'autres aéroports.** Il n'y en a qu'un, Roissy (−140, 80, rayon 92),
  et il APLATIT le terrain : tout aéroport posé dans la fenêtre [−700, 700]
  casse l'empreinte de `plafond.js`. Les poser près des villes bâties à la
  main (Londres, New York, San Francisco, Washington), toutes hors fenêtre.

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
  ne se superpose à aucune autre. **Paris est réglé (v216).** Restent : à Lille
  la rue de Paris,
  Gustave-Delory, Victor-Hugo et la rue Royale ; à San Francisco Valencia,
  Fulton, Lincoln Way, la Great Highway, la 19e Avenue et Third Street ; à
  Washington Virginia Avenue, Constitution ouest et cinq rues de la grille ; à
  Londres dix-sept voies, dont The Mall, Piccadilly et Marylebone Road. La
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
