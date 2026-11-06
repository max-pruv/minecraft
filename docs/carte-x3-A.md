# Carte ×3 — session A : les mondes figés et la migration des blocs

Branche `claude/carte-x3-migration`, PR vers `claude/carte-x3`. Zone : les mondes
d'avant et la marche 8 → 9. Rien ici ne touche aux routes, aux trains, aux
aérodromes vivants ni aux villes engendrées (sessions B et C).

## Ce qui est livré

- **Les douze copies figées** (`*-v332…v531.js`) lisent `positionDe(…, 'terreV4')`
  et `MONDES.terreV4.projection.kmParBloc` (`rayonKm` de `villesmonde-v531.js`).
  Mesuré contre `origin/main` (938b396) : les hauteurs de chaque copie sont
  identiques à celles de la production (218 089 points par ville bâtie à la main,
  7 176 062 pour les villes engendrées).
- **Les aérodromes d'avant** viennent de la session B (`AEROPORTS_V587`,
  `AEROPORTS_AVANT_V306`, aeroport.js, avec leurs prolongements et leurs aires
  de la v587) ; ma copie provisoire `aeroports-v587.js` est retirée après avoir
  vérifié l'égalité des deux tables. `CONF_V587` porte les tronçons de piste et
  d'aire d'avant, et `videParUnTroncon` y juge sur sa propre table.
- **`src/monde-v587.js`** : les villes bâties à la main (7), les lieux de la carte
  (615) et les repères (287) de la production, positions absolues relevées sur
  `origin/main`. C'est ce qui fige la géographie d'avant sans dépendre des
  projections vivantes.
- **`CONF_V587`** (world.js) : le monde de la production v587, figé — carte
  `terreV4`, villes, aérodromes, places, repères et relief des villes bâties à la
  main lus dans les copies figées. Les reliefs invariants par translation (la
  Chine, l'usine, Manhattan, Liberty Island) sont lus au décalage de leur site
  (`decalage`).
- **`CONF_V308` et `CONF_AVANT` restent au bloc près** : empreinte du relief sur
  2 167 653 colonnes (toutes les villes, les aérodromes, les 269 villes
  engendrées, la Chine, l'usine, le départ à 700 blocs) relevée sur `origin/main`
  et sur la branche — `World({v587})` = `World()` de main (30614a12…),
  `v308` = `v308` (fe2f6cf7…), `avant` = `avant` (0c804c35…). Zéro zone
  différente. La chaîne des marches 2 → 8 sur un document fabriqué de 7 500
  blocs rend le même résultat des deux côtés (40a02d10…).
- **La marche 8 → 9** (`migrerCarteX3`, `CARTE_VERSION` 9, `DATE_CARTE_X3` à
  relire à la fusion) : pure, idempotente par la date. Un groupe de blocs (six
  voisins) d'avant la date suit le site de son centre : New York (rectangle
  `BORNES` + marge, ou une zone de banlieue + `TALUS`), un aérodrome (r + 8), une
  ville du registre (son disque, ou le rayon de la fiche engendrée s'il est plus
  grand, + marge), un lieu à rayon. Hors site, il suit le relief, borné à
  `ECART_MAX`. Les marques d'import de Manhattan, la position sauvegardée et les
  fiches de garage suivent (`suivreGaragesCarteX3`). Branchée en dernier dans
  `migrerChaineCarte` et `migrerLesBlocs`, et sur chaque document reçu du nuage.
- **La copie d'avant** `prénom~avant-carte-x3` (sync.js) : sur le document du
  nuage tel qu'il est, une fois, avant toute écriture, seulement si la marche a
  quelque chose à emmener (blocs ou position).

## Témoins

- `plafond.js` : « carte ×3 : le sol n'a pas bougé… » (4 040 colonnes, relief
  `terreV4` contre `terre` ET monde `CONF_V587` contre monde courant — 0 et 0) ;
  deux témoins purs de la marche 8 → 9 (New York, Tokyo d'un seul tenant, Paris,
  départ, trois sanctuaires et la maison sauvegardée fixes, bloc d'après la date,
  marque, position, garage, idempotence). Rouges sur l'ancien code par
  « la carte d'avant la carte ×3 n'est pas gardée » / « la marche 8 → 9 n'existe
  pas ».
- `sauvegarde.js` : une maison de Tokyo d'avant reçue du nuage arrive à la
  nouvelle adresse, d'un seul tenant, la position suit ; la copie
  `Marlon~avant-carte-x3` existe.
- Repointés : le témoin de la marche 2 → 3 lit `terreV3` (sa destination), et
  celui du stockage attend `CARTE_VERSION` au lieu de « 8 ».

## Ce que la fusion finale doit faire (pas fait ici, à dessein)

- `sw.js` : ajouter `src/monde-v587.js` à `ASSETS`,
  monter `CACHE_VERSION`.
- Relire `DATE_CARTE_X3` à l'heure de la fusion (v309) : une date en avance
  déplacerait deux fois ce qu'un enfant pose sur la carte neuve.

## Les gardes de ville d'avant suivent le bloc emmené (piste (a), faite ici)

Une maison d'enfant entourée d'une façade neuve casse l'invariant 1 : ce n'était
pas une dette qu'on pouvait laisser au palier 2.

- **La marche garde la date d'origine en 4ᵉ élément** de l'entrée
  (`[bloc, DATE_CARTE_X3, provenance, origine]`). La date courante reste
  `DATE_CARTE_X3`, qui rend la marche idempotente. Le champ voyage par
  `exportEdits` (World et TerreUrbaine), `loadEdits`, `mergeEdits` (World →
  `setBlock(…, origine)`), `installerEdits(…, origines)` (le worker la reçoit
  dans le message `edits`), la fusion de `sync.js` (qui garde l'entrée
  entière) et `resserrer` (JSON). Un bloc réécrit perd son origine.
- **Toute garde par date lit `origine ?? t`** : villes figées (v339–v370),
  Paris cède, rues à la GTA, trame de Londres, jardins, métro de la boîte DC,
  stations, tour Eiffel, climats, clairières, pistes (`setBlock`,
  `indexerMonumentsTouches`) ; et à New York `DATE_OSM`, `DATE_BANLIEUES`,
  `DATE_NY_MODELES` (`dateGarde`, manhattan-world.js).
- **La ville figée se lit translatée du déplacement de sa ville**
  (`ecartFige`, `ecartVilleX3` = `positionDe(cle) − positionDe(cle, 'terreV4')`,
  le vecteur même de la marche) : Londres, Nice, Lille, San Francisco (v332–
  v344 et v531), Washington (v367), et chaque ville engendrée de la v531 par
  SON vecteur (`villeMondeEn`). Les mondes d'avant (`monde: 'terreV4'`) lisent
  en place. Les feux d'une ville figée prennent l'ancre de la copie figée.
- **TerreUrbaine indexe ses gardes au chargement** (`loadEdits` n'appelait pas
  `indexerMonumentsTouches`) : sans cela le fil principal bâtissait la ville
  neuve sous une maison que le worker dessinait dans l'ancienne.
- Témoins (`plafond.js`) : les dix « une maison posée sur une ancienne rue… /
  une cabane sur un ancien toit » repassent au vert (le témoin lit la copie
  figée translatée, comme le jeu) — les cinq cabanes sont rouges sur l'ancien
  code ; et « carte ×3 : une maison posée sur une ancienne rue de Londres
  avant la v587, emmenée par la marche, est dans l'ancienne rue à sa nouvelle
  adresse » (document de la v587 → marche → `mergeEdits` → journal rechargé),
  qui exige aussi que la même maison SANS 4ᵉ élément soit enfermée — rouge sur
  l'ancien code (15 blocs autour d'elle).

## Dettes déclarées

1. **Ce que la ville figée translatée ne couvre pas encore** : les bouches du
   métro de Rome de la v531 (`metromonde.js`, `surVilleV531`) se choisissent
   contre la copie figée lue à l'adresse d'aujourd'hui ; les feux allumés par
   `main.js` (lampes) se lisent dans la table de la copie figée, à l'adresse
   d'avant ; à New York, une colonne protégée « d'avant les banlieues » garde
   le relief de la Terre d'AUJOURD'HUI à sa nouvelle adresse, pas celui d'où
   elle vient ; le diagnostic « posé à la main le … » (`?diag=1`) affiche la
   date de la carte ×3.

2. **Une fiche de garage orpheline de DEUX marches** (fiche d'avant la carte 3,
   blocs déjà passés par la carte 3 ET la carte ×3) n'est pas retrouvée. Le
   témoin de la carte 3 rejoue l'orpheline d'une seule marche.
3. **Les mondes figés lisent encore les routes, les trains et `entreesDe` vivants**
   (routes.js, trains.js de la session C). Le relief est prouvé identique ; les
   ouvrages de voie, non : quand C retracera les routes, `CONF_V587` les verra à
   leur place neuve. Les marches n'en lisent que le relief.
4. **Le relevé « toit → sol » de la v306 n'est pas appliqué** : à la carte ×3 une
   ville se TRANSLATE avec ses immeubles, un bloc perché garde son toit. Le
   palier 2 (immeubles qui changent de hauteur ou de place) devra le faire.
5. **Dans une ville qui part, un écart de sol de plus de 24 blocs** entre l'ancien
   et le nouveau site vaut zéro : la ville part à la même cote (un bloc
   au-dessus ou sous le sol neuf plutôt qu'abandonné en mer).
6. **La destination d'un aérodrome lit `AEROPORTS` vivant** (session B) : si B
   déplace un aérodrome après la mesure, la marche le suit — c'est voulu, mais la
   marche est alors à rejouer contre la table finale avant la fusion.
7. Le cache de relief de la marche (`reliefMemo`) suppose |z| < 131 072.
