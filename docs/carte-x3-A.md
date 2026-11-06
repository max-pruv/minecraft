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
- **`src/aeroports-v587.js`** : `AEROPORTS_V587`, la table des vingt aérodromes de
  la production recopiée littéralement, et les sites d'avant la v306
  (`AEROPORTS_AVANT_V306_FIGES`). Quand la session B exportera `AEROPORTS_V587`
  depuis `aeroport.js`, ce fichier peut céder sa place — en vérifiant l'égalité.
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

- `sw.js` : ajouter `src/aeroports-v587.js` et `src/monde-v587.js` à `ASSETS`,
  monter `CACHE_VERSION`.
- Relire `DATE_CARTE_X3` à l'heure de la fusion (v309) : une date en avance
  déplacerait deux fois ce qu'un enfant pose sur la carte neuve.

## Dettes déclarées

1. **⚠️ LA PLUS SÉRIEUSE — les gardes de ville d'avant perdent leur effet dans
   une ville qui part, et dix témoins de `plafond.js` le disent** (« à Londres /
   Nice / San Francisco / Lille / Washington, une maison posée sur une ancienne
   rue… », « …une cabane sur un ancien toit… » : `introuvable`). Les copies
   figées vivent désormais à l'adresse d'avant (`terreV4`) ; la ville neuve à
   l'adresse neuve ; le témoin cherche l'ancienne rue sous la ville neuve et ne
   la trouve plus. Dans le jeu, c'est la même chose : la garde lit la ville
   figée là où elle n'est plus. Et ce n'est pas réparable par une translation
   seule, parce que :
   **Les gardes de ville d'avant perdent leur effet dans une ville qui part.**
   `VILLES_FIGEES`, rues à la GTA, Paris v531, banlieues, Washington… jugent un
   bloc par sa date ; un bloc emmené par la marche prend `DATE_CARTE_X3`, donc il
   est vu « posé après » et la ville NEUVE est bâtie autour de lui. Paris ne bouge
   pas : ses gardes tiennent. Ailleurs, une maison d'enfant peut se retrouver
   devant une façade neuve. Le palier 2 (villes ×1,5) doit trancher : soit
   garder la date d'origine dans un champ, soit faire céder la ville neuve
   (règle de la v306). Pourquoi la carte 3 (v242) n'avait pas ce problème :
   `DATE_CARTE_3` précédait toutes les `DATE_RUES_*` ; `DATE_CARTE_X3` les suit
   toutes. Pistes mesurables : (a) garder la date d'origine dans un champ à part
   de l'entrée (à vérifier contre `resserrer` et la fusion) et faire lire aux
   gardes la ville figée TRANSLATÉE du déplacement de sa ville ; (b) la règle
   de v306 — la ville neuve cède autour de tout bloc emmené par la marche
   (date `DATE_CARTE_X3` exactement). (b) est dans la zone du palier 2.
2. **Une fiche de garage orpheline de DEUX marches** (fiche d'avant la carte 3,
   blocs déjà passés par la carte 3 ET la carte ×3) n'est pas retrouvée. Le
   témoin de la carte 3 rejoue l'orpheline d'une seule marche.
3. **Les mondes figés lisent encore les routes, les trains et `entreesDe` vivants**
   (routes.js, trains.js de la session C). Le relief est prouvé identique ; les
   ouvrages de voie, non : quand C retracera les routes, `CONF_V587` les verra à
   leur place neuve. Les marches n'en lisent que le relief.
4. **`CONF_V587` garantit le relief, pas les pistes prolongées ni les aires**
   (tronçons exclus des repères figés) : ce sont des blocs posés, pas du sol.
5. **Le relevé « toit → sol » de la v306 n'est pas appliqué** : à la carte ×3 une
   ville se TRANSLATE avec ses immeubles, un bloc perché garde son toit. Le
   palier 2 (immeubles qui changent de hauteur ou de place) devra le faire.
6. **Dans une ville qui part, un écart de sol de plus de 24 blocs** entre l'ancien
   et le nouveau site vaut zéro : la ville part à la même cote (un bloc
   au-dessus ou sous le sol neuf plutôt qu'abandonné en mer).
7. **La destination d'un aérodrome lit `AEROPORTS` vivant** (session B) : si B
   déplace un aérodrome après la mesure, la marche le suit — c'est voulu, mais la
   marche est alors à rejouer contre la table finale avant la fusion.
8. Le cache de relief de la marche (`reliefMemo`) suppose |z| < 131 072.
