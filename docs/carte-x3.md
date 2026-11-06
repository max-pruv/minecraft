# Routes ×2, villes ×2, carte agrandie — mesures avant toute ligne (v585)

## Largeurs de chaussée aujourd'hui (règle `sectionGTA`, voirie.js)
| type | voie | chaussée | trottoir | emprise |
| --- | --- | --- | --- | --- |
| locale (1 voie) | 4,26 | 4,26 | 2,0 | 8,26 |
| collectrice (2 voies) | 4,26 | 8,52 | 2,5 | 13,52 |
| boulevard (4 voies) | 4,26 | 17,04 | 4,0 | 25,04 |
| autoroute (routes.js) | — | demi-emprise 8,5 | — | 17 |
Voiture : 2,26 de large. Doubler = voie de 8,5 (3,8 voitures de large).

## New York contre Boston
- NY (−20045, 5030), Boston (−19354, 4053) r 65 : Boston à (+691, −977) du centre de NY.
- Le plan de NY (rectangle + 10 banlieues + talus) couvre x −718..+1448, z −1818..+1928 :
  **Boston est DANS sa boîte** (Long Island va plus à l'est que Boston, le Bronx plus au nord).
  Hors boîte, la zone la plus proche (Queens + talus) reste à 64 blocs du disque de Boston.
- Le plan est à ~106 blocs/km (Manhattan 21,6 km = 2 300 blocs) ; la carte à 5,3 blocs/km.
  Un NY « réaliste » à côté d'un Boston à 306 km demanderait une carte ×20 : impossible.

## Marges (balayage, ancre de la projection fixe, villes doublées ou non)
| carte | villes | pire paire de villes | NY ↔ voisine la plus proche | Paris ↔ point d'apparition |
| --- | --- | --- | --- | --- |
| ×1 | ×1 | 162 | Boston −65 (dans la boîte) | 112 |
| ×1 | ×2 | 62 | Washington −374 | **−258** |
| ×2 | ×1 | 420 | Boston +71 | 281 |
| ×2 | ×2 | 325 | Boston −130 | **−89** |
| ×3 | ×2 | 582 | Boston −130 (NY doublé) | 81 |
| ×4 | ×2 | ~840 | Boston ≈ +200 | ≈ 250 |

Lecture :
1. Doubler toutes les villes recouvre le point d'apparition, le musée et le quartier des enfants
   tant que la carte n'est pas ×3 au moins — OU il faut redéplacer Paris (comme en v306).
2. Doubler le plan de New York AGGRAVE le cas de Boston : il ne s'en sort qu'à carte ×4.
   Garder le plan de NY (rues élargies, plan non doublé) le règle dès carte ×2 (+71) / ×3 (+1 211).
3. Les 29 tracés de routes (`via` en BLOCS), les 19 aérodromes, `PROLONGEMENTS`, `AIRES`,
   `RACCORDS_COURTS`, `ANNEAUX_EN_PLUS`, les lignes de train et l'empreinte des 490 morceaux
   sont mesurés sur la carte actuelle : tout se remesure par sonde à chaque changement d'échelle.

## Décisions de Max (5 nov. 2026)
- Carte **×3** (0,1875 → 0,0625 km par bloc, ancre sur Paris inchangée).
- New York **garde son plan** : seules ses rues s'élargissent (Boston ressort du plan dès ×2, +1 211 blocs à ×3).
- Routes et villes **×1,5** (pas ×2) : une voie de 4,26 → ~6,4 blocs, le pas de trame suit l'emprise.
- **Carte d'abord** (palier 1), puis routes et villes (palier 2).

## Mesuré pour le palier 1 (carte ×3)
- Sol sous le point d'apparition, l'ancien Paris et le Paris actuel : **17 265 colonnes, zéro déplacée**
  (`hauteurBase` sur une projection ×3 contre la carte courante). Le témoin des 4 040 colonnes tient.
- Ce qui est écrit en blocs de la carte actuelle et doit se REMESURER par sonde :
  29 tracés de routes (`via` de routes.js), 19 aérodromes (x, z absolus d'aeroport.js),
  `PROLONGEMENTS`, `AIRES`, `PISTES_COURTES`, `RACCORDS_COURTS`, les sites relogés (village gaulois,
  volcan, caserne), l'île de Changi, les constantes de position des témoins (`carteMonde.js`, `plafond.js`).
- Chaîne de migration : marche 8 → 9, carte figée `terreV4` (= la carte d'aujourd'hui), chaque bloc d'enfant
  suit sa ville (`positionDe(cle,'terreV4')` → `positionDe(cle)`), copie d'avant sur le nuage, `CONF_V585`
  pour juger les blocs d'avant sur le monde où ils ont été posés.
