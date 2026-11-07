# Carte ×3 — session C : routes, trains, raccords (mesures)

Chantier « carte ×3 » (`claude/carte-x3`, socle 0,0625 km/bloc, ancienne carte figée
en `terreV4`). Cette session porte routes.js, trains.js, raccords.js, les tables en
blocs absolus de villesmonde.js (sauf `rayonKm`) et les sites relogés en v306.
Tout ce qui suit est mesuré ; les chiffres viennent des sondes du brouillon
(tracer.mjs, fixebout.mjs, ent.mjs, rail.mjs, tok.mjs) et des témoins rejoués seuls.

## Les vingt-neuf tracés se refont, ils ne se multiplient pas par trois

Un `via` est en blocs de l'ancienne carte. Multiplier par trois les coordonnées
met une route au bon endroit du globe et nulle part ailleurs : le relief entre
deux villes est trois fois plus long, les aérodromes, les rails, les autres
routes et les repères ont bougé. Chaque tracé est donc recherché à nouveau :

- couloir le plus bas avec cap (v355), grille de douze blocs, obstacles dans la
  grille : disques des villes, aérodromes (r + 12, provisoires, voir plus bas),
  rails à douze blocs, axes des autres routes à deux emprises et talus, repères
  (boîte + 7), sanctuaires (40), banlieues de New York (zones + talus + 34) ;
- lissage par moyenne glissante (v381), simplification, puis `profilDe` appelé
  sur chaque candidat (v320) et recherche locale qui déplace les points voisins
  d'une faute (remblai, déblai, joint de pont, obstacle, coude) ;
- **les entrées des villes bâties à la main gardent leur angle d'avant** : leur
  avenue d'entrée est dessinée depuis la porte, et les copies figées
  (`*-v531.js`) l'importent. Les tableaux `portes` et `avenues` (New York,
  Washington) sont translatés du déplacement de leur ville, pas retracés.

Bornes tenues sur les vingt-neuf (témoins de `carteMonde.js`) : remblai ≤ 4,
déblai ≤ 9, joints de pont fermés, aucun obstacle. Le coude n'est pas une borne
de témoin ; les pires restent déclarés : A109 44° près de Nairobi, Hansalinie 38°,
A6 38°, M1 35°.

## Une porte de ville engendrée se choisit par sa rue ET par son relief

Au premier jet, j'ai choisi les angles de sortie qui tenaient le déblai (la
crête qui ferme une ville assise sous son pays, v311) en vérifiant l'entrée par
une émulation du témoin. L'émulation comptait AUSSI les colonnes que la route
couvre (`routeEn`), que le témoin saute : elle voyait une avenue de 25 à 30
demi-blocs là où le témoin en voit 15. Neuf entrées étaient trop courtes
(Bologne ×2, Montréal ×2, Nagoya ×2, Cologne, Hambourg, Mombasa) et celle de Rio
butait sur un bloc. **Une émulation de témoin recopie aussi ce que le témoin
saute** ; la barre de l'émulation est désormais 34 (Mombasa, petite ville, 30).

Le balayage `scan.mjs <ville>` rend, pour chaque angle, l'excès de relief sur
160 blocs au-delà de la porte et la propreté de l'avenue. Les angles retenus
sont dans ce balayage ; New York, Paris, Lille, Londres, Nice, San Francisco,
Washington gardent les leurs.

Et une porte déplacée retire des bancs : `surUneEntree` (villesmonde.js) écarte
le mobilier sur tout le segment porte → ancre. Tōmei sortie de Tokyo à 150° :
14 bancs dans la fenêtre du témoin pour une barre de 15. L'angle d'avant (132°)
creusait plus de 9 blocs ; à −162°, 17 bancs et le déblai tient.

## Trois défauts que seul le témoin du monde a vus

- **Un talus creuse un tablier de ville.** L'A1 Centre sortait de Florence à
  −3° ; son talus tombait sur les colonnes d'un pont de l'Arno (12 colonnes sans
  sol, toutes `routeEn`). Sortie tournée de 6° (−9°) : zéro.
- **Une rive se lit sur `TerreUrbaine`, pas sur `World`.** La porte de l'I-95 à
  New York, translatée, était à 63 blocs de l'eau (barre 60) ; ma sonde sur
  `new World()` rendait « pas d'eau du tout ». Rapprochée de 6 blocs vers l'île :
  57, et toujours 34 blocs hors du rectangle (barre 22,4).
- **Une sonde de routes qui ne construit pas de monde lit un autre profil.**
  `routes.js` n'a de relief qu'une fois `brancherSol` appelé par un `World` ;
  sans lui, `largeurA` rend l'emprise sans talus, et ma sonde des colonnes
  volées rendait zéro là où le témoin en compte 56 (Autosole et A1 Nord à
  Bologne). Toute sonde de routes commence par `new World()`.

## Ce que ces routes ne règlent pas, et à qui c'est

- **Aérodromes = session B.** Les tracés évitent les aérodromes à leur position
  provisoire de la carte ×3 (x, z du socle). Quand B les replace, les vingt-neuf
  tracés se rejouent contre les nouveaux disques (`tout.mjs`), et le témoin
  « aucun aérodrome à r + 12 » le dira.
- **Le gabarit de l'Eurostar** : 26 colonnes solides dans le gabarit
  (`carteMonde.js` « rien de solide ne barre la route du train »), toutes à
  (−593..−580, −85..−63) : le tronçon de piste de Roissy (aeroport.js, B).
- **Le volcan** : la ligne Paris–Lyon passe à 38 blocs de son centre (r 45),
  déblai 1,5. Le déplacer demande une marche de migration (zone A). Laissé en
  place, déclaré.
- Le village gaulois et la caserne tiennent leurs cinq promesses sur la carte ×3.
- **L'I-95 Sud à Washington (déclaré, rouge de `carteMonde.js`) — trois options
  pour Max, mesurées.** Le tracé livré tient ses bornes (remblai 3,98, déblai
  8,52, joints fermés) ; il est rouge parce que son emprise mord 152 colonnes
  de Washington (x +37..+67, z +91..+96 du centre). Cause : sur la carte ×3,
  une crête de 41 à 48 borde la boîte au sud et à l'est, et seule la bande
  basse du fondu (z +97..+105, neuf blocs) arrive à la cote de la rue (33) ;
  une autoroute de 17 blocs d'emprise plus ses talus n'y tient pas sans mordre
  la ville ou monter sur la crête.

  (a) **Porte au sud-ouest ou au sud-est : ne marche pas.** Balayage (approche
  droite sur 250 blocs, profil épinglé à 33, `wsw.mjs`) : bord est et sud-est
  (x +22..+70) 10,6 à 14,6 de déblai sous toute approche ; bord sud au droit de
  la porte actuelle (x +34) 13,6 ; bord ouest 6,6 à 12,6 mais côté Georgetown
  et Virginie, à 250 blocs de Pennsylvania Avenue SE. Le seul bord bas assez
  près est x −26..−14 (8,6 à 9,8, à la limite) : il débouche sur des lots
  (z +82..+96, aucune rue avant x +16), donc il tombe dans (b).
  (b) **Entrée nord ou sud-ouest avec une avenue de raccord déclarée.** Le nord
  de la boîte est bas (35 à 40). Il faut une avenue neuve dans le plan de
  Washington jusqu'au pont Sousa ou au pont de la 11e Rue : des colonnes de
  lots qui deviennent rue, donc une décision de plan dans `washington.js`
  (hors de ma zone) et une ville figée sous les blocs posés avant la date
  (règle v303). Je ne l'ai pas tracée.
  (c) **Tranchée hors norme déclarée.** L'approche par le sud comme avant
  demande 13,2 à 13,7 de déblai (36 approches balayées) au lieu de 9 : une
  exception de 4,7 blocs sur la crête, sans toucher à la ville ni à aucun bloc
  d'enfant (Washington est loin de tout sanctuaire). Le témoin du déblai
  porterait alors une exception nommée, comme `PISTES_COURTES`.
  Ma recommandation : (c), parce qu'elle ne change que la route.

## Les aires des aérodromes, et deux aérodromes relogés

`node tests/sonde-aires-aeroports.mjs` rejouée sur les routes retracées, et
`AIRES` mise à l'égalité, comme `plafond.js` l'exige. Roissy 26/70/44/0 →
70/70/157/0, Orly 22/51/22/68 → 22/130/22/130, Heathrow NO 94 → 99, Yokota
NO 27 → 58 : plus coupés.

**Barajas et Schiphol étaient posés sur le passage de leur route**, et aucun
tracé ne pouvait les éviter :

- Barajas occupait le seul couloir bas entre la crête au nord-est de Madrid et
  la LGV Madrid–Barcelone, qui longe son disque au sud. L'AP-2 traversait son
  disque r + 12 (45 points d'axe). Tourner la sortie de Madrid vers le nord
  (−22,5° à −40°) coûtait 10,9 à 12,4 de déblai ; vers le sud, la voie ferrée.
- Schiphol était dans l'axe d'entrée de l'E19 à Amsterdam (35 points d'axe dans
  r + 12). Le seul angle libre (−15°) laissait une avenue d'entrée de 18
  colonnes vues, pour une barre de 20.

On a donc relogé les deux aérodromes plutôt que les routes. La sonde de B
(`sonde-places-aeroports.mjs`, `juger` et ses cinq promesses, plus la cible de
piste) a été rejouée pour ces deux sites seulement, avec une sixième
contrainte : à r + 12 + 21,4 (emprise et talus) de tout axe de route, AP-2 et
E19 compris (brouillon `place2.mjs`). Le vrai cap cède en dernier :

| | avant | après | cap (vrai → retenu) | distance à la ville | axe de route le plus proche |
| --- | --- | --- | --- | --- | --- |
| Barajas | (−6960, 15024), sol 38 | (−6910, 14833), sol 36 | 48° → 48° | 415 → 567 | 12 → 176 |
| Schiphol | (2495, −5915), sol 37 | (2438, −5949), sol 36 | 238° → 253° | 284 → 324 | 48 → 109 |

Eau 5,2 % et 4,1 % (barre 6), pistes à 300/300. `PROLONGEMENTS` remesurée par
`sonde-prolongements-aeroports.mjs` (Barajas [81, 83] / [87, 87], Schiphol
[114, 58] / [106, 78]) et `AIRES` par la sonde des aires (Barajas 76/78/48/99,
Schiphol 34/54/120/36). Les tracés de l'AP-2 et de l'E19 n'ont pas eu à
changer : ils ne touchent plus aucun disque d'aérodrome (contrôle sur les
29 routes, zéro point d'axe à r + 12).

## Trains

Le profil, les viaducs et les gares sont des fonctions du tracé
(`voieEn`, `profilDe`), recalculées par construction ; le nombre de trains suit
la longueur du tour (v222), donc la carte. Les fenêtres des témoins de voie
(`plafond.js`) étaient écrites en pas de l'ancienne carte (300..700 sur
Paris–Lyon, 290..530 sur la Manche) : elles se CHERCHENT désormais — la fenêtre
de 400 pas la plus en tranchée/remblai, le plus long passage en mer.

## Raccords courts

`RACCORDS_COURTS` remesurée par `sonde-rue-dense.cjs raccords` (ligne TABLE) :
55 raccords, 11 qui gardent un demi-tour à la porte (57 blocs, barre 100). La
barre « au plus 10 raccords » passe à 12 ; celle des blocs ne bouge pas. Les
entrées de Montréal ne touchent plus d'anneau et sortent de la table.

## Empreinte des 490 morceaux

Déclarée, pas prouvée désarmée : le socle seul la mène de ed369fdb… à b9586e29…
(mesuré sur la branche du socle), les vingt-neuf tracés de b9586e29… à a388c6ed…, et après Barajas, Schiphol, l'A1 sans son point [243, −1221] et la fusion du socle, à b426b3b4….
Il n'existe plus d'« ancien code » où désarmer rendrait la constante : les
routes d'avant sont en blocs de l'ancienne carte.

## Le joint des ponts : le témoin lisait le centre, le générateur écrit au coin

`plafond.js` (« la chaussée ne s'ouvre pas au joint du pont ») a rendu 392
trous sur la branche, aucun sur le socle. Reproduit sous node, bout de pont par
bout de pont : 137 au premier pont de l'E19 (Bruxelles), 191 sur la M40, le
reste de un à dix-huit points sur quinze autres bouts. Deux causes, et une
seule est un défaut du monde.

- **La cote lue au centre de la colonne, le bloc écrit au coin.** world.js
  demande `routeEn(wx, wz)` au COIN de la colonne et y écrit l'asphalte à
  `floor(cote) − 1` ; le témoin cherchait ce cube à la cote du CENTRE. Là où
  le profil franchit un entier entre les deux (E19 : 32,98 au coin, 33,0 au
  centre), il lisait l'air au-dessus d'un cube plein. C'est la règle de la
  v539 (« quand une surface se lit ailleurs que le bloc, le bloc voyage avec
  elle ») appliquée au témoin : il lit désormais le coin, puis le centre, puis
  le point. Mesuré : 392 → 1 sur la branche, et le témoin lu au coin reste à
  zéro sur le code d'avant le correctif. Allonger les ouvrages d'un ou deux
  pas (essayé : 0, 1, 2) ne fait que déplacer les trous d'un pont à l'autre —
  non-résultat, retiré.
- **Un sommet de coude sur le joint (règle v428).** Le dernier trou était sur
  l'axe de l'I-95, au bout du premier pont : le sommet [−59323, 13799] tombait
  à s 59,3 pour un tablier qui commence à 60, et le ruban, orienté selon le
  tronçon d'après, laissait le coin ouvert. Le point est retiré (la route
  passe du point du rayon au suivant) : zéro trou, coude maximal de l'I-95
  inchangé (29,8°, un autre sommet, déclaré).
