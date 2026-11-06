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
- **L'I-95 Sud à Washington (déclaré, rouge de `carteMonde.js`).** La porte et
  l'avenue (translatées) restent au sud, parce que l'avenue doit passer le pont
  Sousa jusqu'à Pennsylvania Avenue SE. Sur la carte ×3, une crête de 44 à 48
  (terrain, socle) borde la ville au sud et à l'est à moins de dix blocs du
  bord ; seule la bande basse du fondu (z +97..+105 du centre) arrive à la porte
  sous 9 de déblai. L'axe y longe le bord de la ville et son emprise mord 152
  colonnes de Washington (x +37..+67, z +91..+96). Arriver par le sud comme
  avant demande 13 blocs de déblai (balayé : 36 approches, toutes 13,2 à 13,7).
  Le côté NORD de la boîte est bas (35 à 40) : une entrée nord demande une
  avenue neuve qui rejoigne le pont Sousa — décision de plan, pas de tracé.

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
(mesuré sur la branche du socle), les vingt-neuf tracés de b9586e29… à a388c6ed….
Il n'existe plus d'« ancien code » où désarmer rendrait la constante : les
routes d'avant sont en blocs de l'ancienne carte.
