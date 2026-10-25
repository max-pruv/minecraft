# Revue d'écran — ce que l'enfant voit (v506)

Ce document existe parce que Max a signalé lui-même, en une matinée et depuis
son iPhone, sept défauts qu'une capture d'écran montrait au premier regard.
Son verdict : « C'est vraiment des choses que tu devrais anticiper. » Il donne
une grille de lecture, la façon de jouer la sonde, et le premier relevé.

## Comment la jouer

```
cd tests && node sonde-revue-ecran.cjs <dossier hors du dépôt> [--etats=a,b] [--vues=iphone,ipad] [--sans-nuit|--sans-jour] [--en-ligne]
```

La sonde prend des captures à 430 × 932 (l'iPhone de Max) et à 820 × 1180
(iPad), en tactile, de jour (0,42) et de nuit (0,75, c'est-à-dire minuit), avec
`rr=9`, la couche HD (`hd=3`) et les ombres forcées. Elle couvre ces états :
`accueil`, `menu`, `campagne`, `paris`, `minicarte`, `carte-monde`,
`volant-arret`, `volant-roule`, `voiture-rue-percutee`, `vol-libre`,
`avion-sol`, `avion-vol`, `avion-approche`, `construction`, `metro`, plus deux
tablettes avec `--en-ligne`. Chaque état part à pied et note dans `journal.txt`
ce qu'il a obtenu (au volant, aux commandes, à bord, phase d'approche). Un état
qui échoue le dit et la sonde passe au suivant. Le tour complet prend environ
25 minutes par heure du jour. Pour une livraison, on ne joue que les états
qu'elle touche.

## La grille — à lire comme un enfant de 7 ans qui ne lit pas de mode d'emploi

1. Chaque bouton se comprend sans texte, ou porte son mot.
2. Ce qui monte est au-dessus de ce qui descend.
3. On sort d'un mode là où on y est entré.
4. Rien ne flotte qui ne devrait pas : effets, lumières, objets, cubes.
5. Aucun reste « Minecraft en carrés » là où le jeu a une version HD.
6. Rien ne se recouvre, et rien n'empiète sur le quart du joystick.
7. Le texte est lisible et contrasté, de jour comme de nuit.
8. Il ne reste rien d'une fonctionnalité retirée.
9. Ce que le jeu fait en mode assisté (approche, GPS, embarquement) se voit à l'écran.
10. Tout reste cohérent avec la vraie vie : une voiture, un avion, une ville.

## Hors de ce relevé

D'autres sessions corrigent déjà, en parallèle, sept défauts : les boutons
monter et descendre inversés en vol (vus aussi ici, en vol libre et dans le
métro), la coche de sortie de construction, l'icône du train d'atterrissage,
les cubes orange des feuilles d'automne (visibles dans presque chaque capture),
les feux de détresse, la minicarte décalée sous le compteur de viande, et la
ville d'arrivée de l'atterrissage. Ils ne sont pas repris ci-dessous, sauf quand
ils touchent un défaut voisin qu'ils risquent de rater ; c'est alors signalé
dans la ligne.

## Le relevé du 18 octobre 2026 (v504), trié par gravité

Gravité pour un enfant : **haute**, il est bloqué, trompé ou touche la mauvaise
chose ; **moyenne**, il comprend mal ou le monde n'est plus crédible ;
**basse**, c'est un détail de finition. Les captures sont réduites de moitié,
dans `docs/revue-ecran/`.

| # | Gravité | État | Capture | Ce qui cloche | Remède proposé | Fichier probable |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | haute — **corrigé v522** | construction (iPhone et iPad, jour et nuit) | [01](revue-ecran/01-construction-grass-casser.png) | Le bloc en main se nomme **« Grass »**, au milieu de l'écran. Les dix-neuf blocs de base portent un nom anglais (Grass, Dirt, Stone, Oak Log, Bricks…), alors que les autres sont en français (« Cheminée de pierre »). | Nommer ces blocs en français dans `BLOCK_INFO` (Herbe, Terre, Pierre, Bûche de chêne, Briques…). Un témoin exige qu'aucun nom de la palette ne soit anglais. | `src/blocks.js:92` et suivantes, `src/main.js:6570` |
| 2 | haute — **corrigé v508** | carte du monde ouverte, près d'une bête | [02](revue-ecran/02-carte-pilule-ane.png) | La pilule **« Monter · Âne »** passe par-dessus la carte du monde. Elle cache le bouton « trésor » et la légende, et un doigt qui vise la carte fait monter sur l'âne. | Masquer `#fun-target` quand la carte est ouverte (une classe du `body`), ou passer la carte au-dessus du HUD. Un témoin `elementFromPoint` sur les boutons de la carte, avec une bête devant. | `index.html` (`#map-modal` z-index 14, `.fun-target`), `src/carte.js` |
| 3 | haute | métro, à bord (Washington, iPhone et iPad) | [03](revue-ecran/03-metro-toit-tronque.png) | À bord, la caméra est sur le **toit de la rame**, ou dans sa carrosserie : on voit une dalle orange ou verte et un plafond de pierre en damier, jamais le quai ni la fenêtre. | Asseoir la caméra dans la voiture, à hauteur d'yeux et dans l'axe de la marche, comme l'habitacle d'une voiture (`oeil`). | `src/fun.js` (bord), `src/vehicules.js` (`construireRame`) |
| 4 | moyenne-haute | construction | [01](revue-ecran/01-construction-grass-casser.png) | L'icône de **Casser** (la pioche) se lit comme une flèche « télécharger ». Le bouton actif est gris clair, il sort de la colonne (x 310 au lieu de 366) et se distingue mal de Poser. *Voisin de la coche de sortie, que corrige une autre branche : elle risque de ne pas voir ce bouton.* | Redessiner la pioche avec un fer bien distinct et un manche diagonal, garder l'état actif dans la palette des autres boutons (anneau coloré), et aligner les deux outils sur la colonne. | `src/commandes.js` (`ICONES.casser`), `index.html` (`#casser-btn`) |
| 5 | moyenne | métro, à bord (iPhone) | [03](revue-ecran/03-metro-toit-tronque.png) | La pilule se coupe : **« Descendre du métro Bl… »**, « … Or… ». La couleur de la ligne, qui était tout le sens du mot, est tronquée. | « Descendre » suivi d'une pastille de couleur (`pastille`), le nom complet seulement s'il tient. | `src/fun.js`, `index.html` (`.fun-target`) |
| 6 | moyenne | métro, à bord | [03](revue-ecran/03-metro-toit-tronque.png) | À bord, **Voler, Construire, Sauter et Descendre** restent affichés : quatre boutons qui n'ont pas de sens dans une rame. *Voisin de vol-boutons-inverses.* | Poser `en-vehicule` (ou une classe `a-bord`) aussi pour `bord`, et cacher ces boutons comme au volant. | `src/main.js` (`majBoutonsVehicule`) |
| 7 | moyenne | aux commandes, au sol et en vol | [04](revue-ecran/04-avion-gaz-sans-mot.png) | La **manette des gaz** est un rectangle blanc vide, avec un rond tout en bas, sans icône ni mot. Un enfant ne devine pas qu'il faut la pousser vers le haut pour accélérer. | Un mot (« Gaz » ou « Vitesse ») et des chevrons ▲ dans la course. Le remplissage orange ne suffit qu'une fois qu'on l'a déjà touchée. | `index.html` (`#gaz-base`), `src/commandes.js` |
| 8 | moyenne | voiture, de nuit | [05](revue-ecran/05-voiture-sans-phares.png) | **Aucun phare la nuit.** La voiture roule dans le noir, seuls les feux arrière sont allumés. En vol de nuit, l'avion n'a pas non plus de feux de navigation. | Une lueur émissive à l'avant, et un cône additif sans lampe (quatre lampes au plus, v248). Feux clignotants rouge et vert en bout d'aile. | `src/sensations.js` ou `src/vehicules.js`, `src/avions.js` |
| 9 | moyenne | partout où il y a des bêtes | [06](revue-ecran/06-ane-en-cubes.png) | **Les bêtes sont en cubes** (âne, lama, vache, renard, éléphant), à côté de passants en relief. C'est le reste « Minecraft » le plus visible du jeu. | Un modèle en relief par espèce, avec le même cycle de pivots que les personnages (programme à part, plusieurs livraisons). | `src/animals.js`, `src/montures.js` |
| 10 | moyenne | vol, approche, campagne | [07](revue-ecran/07-forets-en-cubes.png) | **Au-delà de la couche HD, les arbres redeviennent des cubes** : vues d'avion, les forêts sont des carrés vert sombre, et en campagne un chêne en cubes à quarante blocs se tient à côté d'un pin HD. *Voisin de feuilles-hd, qui ne traite que les feuilles d'automne.* | Une silhouette lointaine d'arbre (un imposteur par essence) au-delà de `RAYON_HD`, ou une portée HD des arbres plus grande que celle des façades. | `src/arbreshd.js`, `src/main.js` (`montrerLeDetail`) |
| 11 | moyenne | vol libre, approche | [08](revue-ecran/08-trous-noirs.png) | Vus du ciel, des **trous noirs carrés** marquent le relief (tranchée ou puits), en marches noires très visibles sur l'herbe. | À identifier d'abord : un lancer de rayon à travers l'amas de pixels noirs (méthode v484). Si c'est une tranchée de voie, lui donner ses talus ; si c'est un puits de grotte, un bord herbeux. | à identifier (`src/trains.js` ou `src/world.js`) |
| 12 | moyenne — **corrigé v522** | deux tablettes, l'hôte | [09](revue-ecran/09-bandeau-seul.png) | Le bandeau **« Seul·e dans le monde 60739 — donne ce code à ton ami·e »** : l'écriture inclusive n'est pas lisible à 7 ans, le texte blanc sur ocre manque de contraste, et il pousse deux lignes au centre de l'écran. | « Donne le code 60739 à ton ami », en encre sombre sur verre clair (règle v494), sur une seule ligne. | `src/main.js` ou `src/net.js` (texte du statut) |
| 13 | basse — **corrigé v522** | toute partie avec un déblocage parental | [10](revue-ecran/10-badge-quiz.png) | Le badge **« 🔑 1440 min sans quiz »** porte un emoji, compte en minutes énormes, et se ferme par une croix de 22 px (moins que les 44 px d'un doigt). *Sur le banc, il vient du déblocage de `jouerSeul` ; dans la vraie vie, il apparaît quand un parent débloque.* | « Libre jusqu'à 18 h », une icône dessinée, et une cible de fermeture de 44 px. | `index.html` (`#edu-timer`), `src/education.js` |
| 14 | basse — **corrigé v508** | carte du monde | [02](revue-ecran/02-carte-pilule-ane.png) | La carte est **bleu nuit** au milieu d'une interface en verre clair (v276), et garde des emojis (🔎 dans la recherche ; ✊ 🔺 🟦 dans l'astuce et la légende). | La passer à la matière claire, et remplacer les pictogrammes par les icônes dessinées. | `index.html` (`#map-modal`), `src/carte.js` |
| 15 | basse | minicarte | [06](revue-ecran/06-ane-en-cubes.png) | L'étiquette « Quartier des enfants » est **coupée au bord** de la minicarte. *Voisin de loin-viande-minicarte, qui déplace la minicarte.* | Placer les étiquettes à l'intérieur du cadre, ou les tronquer avec un repère. | `src/carte.js` (minicarte) |
| 16 | basse — **corrigé v508** | menu ☰ ouvert | [11](revue-ecran/11-menu-pause.png) | Le jeu est en pause, mais **le joystick et les boutons restent nets** derrière le menu : on croit pouvoir encore jouer. | Voiler le HUD (opacité ou flou) tant que le menu est ouvert. | `index.html` (`#menu-jeu`) |
| 17 | à vérifier | voiture de la rue percutée, Paris | [12](revue-ecran/12-louvre-chaussee.png) | La **pyramide du Louvre** a l'air posée sur une chaussée marquée, avec des lignes de voie qui y entrent. Cela peut aussi être la cour pavée vue de loin. | Une capture au sol de la cour Napoléon, puis la carte ASCII des colonnes autour du repère (v493). | `src/paris.js`, `src/monuments.js` |
| 18 | à vérifier | témoin de contraste (`maj.js`) | — | Le témoin « les commandes se lisent sur le ciel de midi comme sur la nuit » rend `ciel: 87ceeb` **à minuit comme à midi** : il lit la couleur du ciel avant que le ciel ait tourné (v291), et ne mesure donc pas la nuit. | Attendre le fait du monde (le soleil sous l'horizon) avant de lire la couleur du ciel, durée dans le message. | `tests/maj.js` |
| 19 | corrigé (v553) | avion en vol, campagne (v532, iPad et iPhone) | — | Au bord des morceaux maillés, sous l'aile, un **trou bleu pâle** (le fond du ciel) entre le monde chargé et le paysage lointain. Visible avec et sans couronne (liseré plus fin sans) : la couronne ne le crée pas, le brouillard reculé le rend plus visible. | Une sonde qui lit, colonne par colonne au bord du disque maillé, ce que la grille fine dessine (découpe de `horizon.js` contre `chunkMeshes`). | `src/horizon.js`, `src/main.js` — cause : l'index de la grille fine ne défilait pas avec ses sommets entre deux découpes (`decalerDecoupe`, horizon.js ; `sonde-trou-horizon.cjs` 346 → 0 pixel). |
| 20 | mineur | guide, tour Eiffel (v538, état `guide`) | [20](revue-ecran/20-guide-eiffel-iphone-jour.png) | Le fanion de Capucine, à l'ombre des platanes du Champ-de-Mars, tire sur le **rouille** plutôt que l'orange vif, même avivé : on le lit, mais il se cherche moins des yeux qu'en plein soleil. Et la nuit de la sonde (`0.75`) donne ici une rue encore claire. | Juger le fanion sur la tablette ; s'il se perd, un bord clair ou un orange plus saturé dans `fanion()`. | `src/vie.js` |
| 21 | basse | minicarte toujours là (v540), juste après un saut | [v540](revue-ecran/v540-minicarte/iphone-paris-nuit.jpg) | La moitié basse de la minicarte est encore **le fond de nuit** : un raster neuf se remplit quatre lignes par image, des dizaines de secondes au banc (une à deux images par seconde), moins d'une seconde à 60 images par seconde. | Mesurer le temps de remplissage sur la tablette (`?diag=1`) ; s'il se voit, remplir plus de lignes par image à l'arrivée d'un saut. | `src/main.js` (`repeindreBandeCarte`) |
| 25 | moyen | au volant dans le métro de Washington, et au volant contre un bus (v544, iPhone et iPad, aussi sur `origin/main` v534) | — | La caméra traverse ce qui n'est pas un bloc : à bord d'une rame, la tête d'un voyageur bouche la moitié de l'écran ; posée à trois blocs d'un bus (la sonde `voiture-rue-percutee` prend la voiture de la rue la plus proche, et depuis les rues à la GTA c'est un bus), elle se retrouve dans son toit gris. | Que `segmentLibre` (sensations.js) et la caméra de bord voient aussi les voitures de la rue et les personnes ; et que la sonde choisisse une voiture, pas un bus. | `src/sensations.js`, `tests/sonde-revue-ecran.cjs` |
| 26 | moyenne | au volant de la 911 (v545, poursuite, iPad et iPhone) | [v545](revue-ecran/v545-911/ipad-volant-arret.jpg) | L'**aileron de la 911 reconstruite** se lit comme une dalle noire pleine dans la vue de poursuite : il barre l'horizon derrière la voiture et cache le conducteur. Vu de trois quarts, la voiture se lit très bien (planche [trois quarts](revue-ecran/v545-911/iphone-voiture-trois-quarts.jpg)). | Donner au carbone de l'aileron un gris et un reflet (`envMap`) au lieu d'un noir mat, ou relever la caméra de poursuite d'un cran pour cette voiture. Décision de Max après la tablette. | `vendor/voitures/porsche-911-gt3-rs-hd-v2-compact.glb` (matériau), `src/sensations.js` |

## Ce que la sonde ne couvre pas encore

- **Le second client en ligne.** Sur le banc, `rejoindre` a rendu « Le serveur
  de jeu ne répond pas » à l'invité tactile. La vue de l'hôte est utilisable,
  pas celle de l'invité. C'est une limite de la sonde, pas un défaut constaté
  du jeu.
- **La voiture de la rue percutée.** La caméra de poursuite cadre notre voiture,
  pas celle qu'on a heurtée. Pour juger les feux de détresse et la tôle
  froissée, il faut une vue de côté (méthode de `sonde-captures-degats.cjs`).
- **Le rendu logiciel** coupe certaines parures (ombres hors forçage, bâti
  lointain, traces). Ce que la sonde montre est très proche de la tablette, mais
  pas identique.

## Le relevé de la v539 (le rail), 23 octobre 2026

Captures dans `docs/revue-ecran/v539/` : le TGV Paris–Lyon aux deux endroits
des captures de Max (viaduc du pas 716, tranchée du pas 786), iPhone et iPad,
jour et nuit, et le train vu de près.

- Corrigé : plus de dalle d'herbe ni de pilier dans le gabarit, les traverses
  sont visibles d'un bout à l'autre, les voitures du train ne se recouvrent plus.
- Vu, non corrigé : les rails ont l'air ondulés en vue oblique. C'est le profil
  en long (un tiers de bloc de pente, lissé en cône) projeté de biais, pas un
  défaut de tracé ; un profil plus doux est une décision de terrain (déblais
  plus profonds), à poser à Max.
- Vu, non corrigé : la nuit, les fenêtres du train sont noires (aucune vitre
  allumée), alors que celles des villes s'allument.

## Le relevé de la v541 (de vraies feuilles), 24 octobre 2026

Captures dans `docs/revue-ecran/v541/` : la forêt tempérée dense près de
(−1 560, −2 488), d'avant et d'après (au sol, de près, en vol, au loin), le
palier bas (`hd=0&arbres=1`), et la revue d'écran sur les deux états neufs
`foret` et `foret-vol` (iPhone et iPad, jour et nuit). `campagne` est le point
d'apparition, sans un arbre : la jouer seule ne montrait rien des arbres.

- Corrigé : les couronnes sont pleines et les feuilles se lisent, de près
  comme en vol ; au palier bas les arbres sont en cartes, plus un cube ; le
  carré couleur du ciel au pied de chaque bouleau (un trou dans le sol sous le
  tronc tu) a disparu.
- Vu, non corrigé : au pied d'un bouleau, un carré de 3 × 3 colonnes d'herbe
  reste en voxel au ras de la surface continue — même texture, à peine
  visible (`BIRCH` n'est pas un dessus naturel de `solcontinu.js`, dette dans
  `TASKS.md`).
- Vu, non corrigé : les oiseaux (kites noirs) volent bas au-dessus de la forêt
  et se lisent comme des triangles noirs en vol ; préexistant.
- Vu, non corrigé : les bêtes (mouton, éléphant) sont en cubes à côté d'arbres
  en relief ; c'est le bestiaire, pas cette livraison.

## Le relevé de la v543 (la voiture comme dans GTA), 24 octobre 2026

Captures dans `docs/revue-ecran/v543-volant/` : `volant-arret`, `volant-roule`
et `voiture-rue-percutee`, iPhone et iPad, jour et nuit. Rien ne se recouvre :
radio, klaxon, « Descendre » et frein à main tiennent dans la colonne de
droite, hors du quart du joystick, aux deux tailles.

| # | Gravité | État | Capture | Ce qui cloche | Remède proposé | Fichier probable |
| --- | --- | --- | --- | --- | --- | --- |
| 22 | moyenne | au volant (v543), iPhone et iPad | [v543](revue-ecran/v543-volant/iphone-volant-arret-jour.jpg) | L'icône du **klaxon** est un haut-parleur : un enfant peut la lire comme « le son », pas comme l'avertisseur. Le mot est dans `aria-label`, pas à l'écran. | Un cornet d'avertisseur dessiné (`ICONES.klaxon`), jugé sur une capture à 430 × 932. | `src/commandes.js` |
| 23 | moyenne | au volant de nuit (v533, revu en v543) | [v543](revue-ecran/v543-volant/iphone-volant-roule-nuit.jpg) | Vus de la caméra de poursuite, les **cônes des phares** dessinent deux triangles clairs qui flottent au-dessus du capot, et les deux lentilles se lisent comme des ronds blancs posés sur le toit. | Raccourcir ou estomper le cône près de la voiture, ou ne pas le dessiner quand la caméra est derrière. | `src/phares.js` |
| 24 | basse | voiture de la rue percutée, de nuit (v543) | [v543](revue-ecran/v543-volant/iphone-voiture-rue-percutee-nuit.jpg) | Sur la carrosserie blanche de la fourgonnette, les **feux de détresse** additifs virent au rose saumon : ils sont sur la tôle, mais on les lit mal comme des clignotants orange. | Une teinte plus saturée (moins de rouge additif sur fond clair), jugée sur la même capture. | `src/vehicules.js` (`feuxDeDetresse`) |

## Le relevé de la v546 (la Revuelto adaptée), 24 octobre 2026

Planches « ancienne | neuve » dans `docs/revue-ecran/v546-revuelto/` :
`volant`, `troisquarts` et `rue` (une Revuelto de la circulation, cadrée de
côté), iPhone et iPad, jour et nuit, rejouables par
`tests/sonde-captures-revuelto.cjs`. Rien ne bouge dans l'interface : la
livraison ne change que le modèle.

| # | Gravité | État | Capture | Ce qui cloche | Remède proposé | Fichier probable |
| --- | --- | --- | --- | --- | --- | --- |
| 27 | basse | Revuelto adaptée (v546), au volant et de trois quarts | [v546](revue-ecran/v546-revuelto/planche-iphone-troisquarts-jour.jpg) | Le modèle est un **travail en cours** de l'aveu du paquet : jointures de panneaux et habitacle à reprendre, 4,74 m de long contre 4,95 m réels, portières non séparées. À hauteur d'enfant et à cinq blocs, rien de cela ne se lit ; la voiture est nettement plus fidèle que l'ancienne. Ses phares sont éteints la nuit, comme toute la flotte garée (n° 8). | Juger sur la tablette ; la reprise des panneaux appartient au paquet de Max, pas au jeu. | `vendor/voitures/lamborghini-revuelto-wip.glb` |

### v553 — le paysage lointain : ses arbres, et le trou de ciel du relevé n° 19

En vol à cent dix blocs au-dessus d'une forêt tempérée (−1 176, −1 648), état
`foret-loin`, rr 12, iPhone et iPad, jour et nuit
(`--params=&arbresloin=1&batiloin=1` : le banc rend en logiciel, où les
arbres et le bâti lointains sont coupés). Les silhouettes lointaines se
lisent comme des arbres jusqu'au brouillard et s'éteignent la nuit avec le
reste du paysage ; au bord du disque maillé, plus de bande de ciel (relevé
n° 19, corrigé).

| # | Gravité | État | Capture | Ce qui cloche | Remède proposé | Fichier probable |
| --- | --- | --- | --- | --- | --- | --- |
| 28 | basse | en vol au-dessus d'une forêt (v553), iPad et iPhone | [jour](revue-ecran/lointain-arbres/ipad-foret-loin-jour.jpg), [nuit](revue-ecran/lointain-arbres/ipad-foret-loin-nuit.jpg) | Au bord du disque maillé, une **couture de teinte** : le paysage lointain est plus clair et voilé que le monde proche, parce que le brouillard commence exactement à ce bord (`fog.near` = rr × 16). Antérieur à la v553, visible sur les captures de la v532. | Faire commencer le brouillard un peu en deçà du bord, ou teinter la grille fine du sous-bois là où `foret` est haute (les témoins de couleur de `plafond.js` lisent l'herbe au sommet près : à décider avec eux). | `src/main.js`, `src/horizon.js` |

## Le relevé de la v560 (la voiture tombe dans l'eau), 25 octobre 2026

États `voiture-plonge` et `voiture-coulee` (ajoutés à la sonde pour cette
livraison : un quai fabriqué, pleins gaz vers le bassin), iPhone et iPad,
jour et nuit. Ce que la livraison promet se voit : la voiture plonge feux stop
allumés (l'eau la freine), aucun message, l'enfant remonte en surface, la
voiture reste au fond, le bouton de nage apparaît. La capture de nuit est
prise après celle de jour : l'enfant y est déjà sorti.

| # | Gravité | État | Capture | Ce qui cloche | Remède proposé | Fichier probable |
| --- | --- | --- | --- | --- | --- | --- |
| 29 | basse | voiture dans l'eau, de jour (v560) | [v560](revue-ecran/v560-eau/iphone-voiture-plonge-jour.jpg) | Des **feuilles d'automne** flottent haut dans le ciel au-dessus du bassin, loin de tout arbre (la v531 les voulait sur leur colonne). Hors de la livraison. | Vérifier ce qui « porte » une feuille au-dessus d'un plan d'eau fabriqué au-dessus du relief | `src/saisons.js` |
| 30 | basse | voiture dans l'eau, de jour (v560) | [v560](revue-ecran/v560-eau/iphone-voiture-plonge-jour.jpg) | Une pilule « Salle Ronde · Les marches du palais » s'affiche en haut au milieu, loin de toute ville visible — un panneau de lieu lu à distance ? Hors de la livraison. | Lire quelle règle pose cette pilule à (31 200, 31 500) | `src/main.js` (file centrale) |

## Le relevé de la v561 (la SF90 XX Stradale), 25 octobre 2026

Planches « ancienne | neuve » dans `docs/revue-ecran/v561-sf90/` :
`volant`, `troisquarts` et `rue` (une SF90 de la circulation, cadrée de
côté), iPhone et iPad, jour et nuit, rejouables par
`tests/sonde-captures-sf90.cjs` (le bras « ancienne » se choisit par
`?asset=0`). Rien ne bouge dans l'interface : la livraison ne change que le
modèle, et il se lit tout de suite comme une Ferrari — aileron, prises d'air,
jantes, vitrage, plaque « SF90XX ».

| # | Gravité | État | Capture | Ce qui cloche | Remède proposé | Fichier probable |
| --- | --- | --- | --- | --- | --- | --- |
| 31 | basse | SF90 XX (v561), garée de trois quarts, de nuit | [v561](revue-ecran/v561-sf90/planche-iphone-troisquarts-nuit.jpg) | Phares éteints la nuit, comme toute la flotte garée (n° 8). Repeinte dans la rue, la voiture garde sa **livrée rouge** (prises du capot, ouïes arrière) : sur une laque sarcelle, ces accents se lisent comme des pièces d'une autre voiture. | Garder ; ou repeindre la livrée (`Paint_Secondary`) d'un ton accordé à la laque tirée — décision de Max. | `src/vehicules.js` (`repeindre`) |
| 32 | basse | rue de Paris, de nuit, caméra de la sonde à hauteur de toit | [v561](revue-ecran/v561-sf90/planche-ipad-rue-nuit.jpg) | Une **feuille d'automne** passe à quelques centimètres de l'objectif et couvre un quart de l'écran. Ce n'est pas la voiture : c'est l'essaim de saison (v531), que la caméra de cadrage traverse. | Ne pas dessiner une particule à moins d'un bloc de la caméra. | `src/saisons.js` |
