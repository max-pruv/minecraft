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
| 1 | haute | construction (iPhone et iPad, jour et nuit) | [01](revue-ecran/01-construction-grass-casser.png) | Le bloc en main se nomme **« Grass »**, au milieu de l'écran. Les dix-neuf blocs de base portent un nom anglais (Grass, Dirt, Stone, Oak Log, Bricks…), alors que les autres sont en français (« Cheminée de pierre »). | Nommer ces blocs en français dans `BLOCK_INFO` (Herbe, Terre, Pierre, Bûche de chêne, Briques…). Un témoin exige qu'aucun nom de la palette ne soit anglais. | `src/blocks.js:92` et suivantes, `src/main.js:6570` |
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
| 12 | moyenne | deux tablettes, l'hôte | [09](revue-ecran/09-bandeau-seul.png) | Le bandeau **« Seul·e dans le monde 60739 — donne ce code à ton ami·e »** : l'écriture inclusive n'est pas lisible à 7 ans, le texte blanc sur ocre manque de contraste, et il pousse deux lignes au centre de l'écran. | « Donne le code 60739 à ton ami », en encre sombre sur verre clair (règle v494), sur une seule ligne. | `src/main.js` ou `src/net.js` (texte du statut) |
| 13 | basse | toute partie avec un déblocage parental | [10](revue-ecran/10-badge-quiz.png) | Le badge **« 🔑 1440 min sans quiz »** porte un emoji, compte en minutes énormes, et se ferme par une croix de 22 px (moins que les 44 px d'un doigt). *Sur le banc, il vient du déblocage de `jouerSeul` ; dans la vraie vie, il apparaît quand un parent débloque.* | « Libre jusqu'à 18 h », une icône dessinée, et une cible de fermeture de 44 px. | `index.html` (`#edu-timer`), `src/education.js` |
| 14 | basse — **corrigé v508** | carte du monde | [02](revue-ecran/02-carte-pilule-ane.png) | La carte est **bleu nuit** au milieu d'une interface en verre clair (v276), et garde des emojis (🔎 dans la recherche ; ✊ 🔺 🟦 dans l'astuce et la légende). | La passer à la matière claire, et remplacer les pictogrammes par les icônes dessinées. | `index.html` (`#map-modal`), `src/carte.js` |
| 15 | basse | minicarte | [06](revue-ecran/06-ane-en-cubes.png) | L'étiquette « Quartier des enfants » est **coupée au bord** de la minicarte. *Voisin de loin-viande-minicarte, qui déplace la minicarte.* | Placer les étiquettes à l'intérieur du cadre, ou les tronquer avec un repère. | `src/carte.js` (minicarte) |
| 16 | basse — **corrigé v508** | menu ☰ ouvert | [11](revue-ecran/11-menu-pause.png) | Le jeu est en pause, mais **le joystick et les boutons restent nets** derrière le menu : on croit pouvoir encore jouer. | Voiler le HUD (opacité ou flou) tant que le menu est ouvert. | `index.html` (`#menu-jeu`) |
| 17 | à vérifier | voiture de la rue percutée, Paris | [12](revue-ecran/12-louvre-chaussee.png) | La **pyramide du Louvre** a l'air posée sur une chaussée marquée, avec des lignes de voie qui y entrent. Cela peut aussi être la cour pavée vue de loin. | Une capture au sol de la cour Napoléon, puis la carte ASCII des colonnes autour du repère (v493). | `src/paris.js`, `src/monuments.js` |
| 18 | à vérifier | témoin de contraste (`maj.js`) | — | Le témoin « les commandes se lisent sur le ciel de midi comme sur la nuit » rend `ciel: 87ceeb` **à minuit comme à midi** : il lit la couleur du ciel avant que le ciel ait tourné (v291), et ne mesure donc pas la nuit. | Attendre le fait du monde (le soleil sous l'horizon) avant de lire la couleur du ciel, durée dans le message. | `tests/maj.js` |

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
