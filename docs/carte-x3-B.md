# Carte ×3 — session B : les aérodromes (v588)

Zone : `src/aeroport.js` et ce qui en dépend directement (Changi compris).
Branche `claude/carte-x3-aeroports`, PR vers `claude/carte-x3`.

## Ce qui est livré

- **La table d'avant, intacte, pour les mondes figés.** `AEROPORTS_V587` est la
  table de la v587 telle quelle, chaque aérodrome portant SES tables
  (`prolongements: PROLONGEMENTS_V587[cle]`, `aires: AIRES_V587[cle]`).
  `pistesDe`, `tronconsDePiste`, `tronconsDAire`, `postesAerodrome` lisent
  d'abord la fiche (`a.prolongements`, `a.aires`), puis la table courante.
  `videParUnTroncon(x, z, aeroports)` et l'emprise des tronçons prennent la
  liste à juger (mémoïsée par liste). Pour `CONF_V587` (session A) :
  `aeroports: AEROPORTS_V587` et `reperes` bâtis avec `tronconsDePiste` /
  `tronconsDAire` sur ces fiches donnent le monde d'avant au bloc près.
  `PISTES_COURTES_V587` garde l'ancienne liste.
- **Vingt aérodromes replacés par sonde** (`tests/sonde-places-aeroports.mjs`,
  isolée, ~12 s). Les promesses de la v223, plus deux : au sec (eau sous le
  disque < 6 %), à douze blocs de toute ville, aérodrome, voie ferrée et gare,
  à quarante de ce que les enfants ont bâti, relief du disque dans les bornes
  de l'ouvrage (v280), et — sixième — chaque piste doit atteindre sa cible
  (`CIBLE_PISTE`) une fois prolongée. Le cap réel cède en dernier : un degré
  d'écart coûte huit blocs de distance.
- **`PROLONGEMENTS` remesurés** (`tests/sonde-prolongements-aeroports.mjs`) :
  dix-neuf sur vingt atteignent leur cible ; Andrews roule 219 blocs pour 220
  (à l'ouest Washington) et se déclare dans `PISTES_COURTES`.
- **`AIRES` remesurées** : égales à `mesurerAires()` (le témoin de `plafond.js`).
- Sondes rejouées : `sonde-decollage-postes.cjs` 421 / 421 décollés ;
  `sonde-approche.cjs` 222 essais, zéro en faute ; `plafond.js` sans un rouge.

## Ce que la mesure a appris

1. **Les villes comptent à une fois et demie leur rayon.** Le palier 2 (villes
   ×1,5, décision de Max) les élargira : un aérodrome posé contre une ville
   d'aujourd'hui serait mangé par celle de demain. La sonde et les
   prolongements jugent donc contre `r × 1,5 + 12`.
2. **New York compte avec tout son plan** (Manhattan, les dix banlieues et leur
   talus). Le Queens est dans le plan : JFK part au sud-ouest, à 919 blocs, cap
   243° au lieu de 128°. C'est un écart assumé, pas un oubli.
3. **Une piste courte sur la mer est une digue.** Sur terre le remblai garde sa
   borne (`REMBLAI`) ; sous l'eau il descend d'`APPUI_PROLONGE` de plus, la
   règle de Changi (v486) et des prolongements (v530). Sans elle, Barcelone,
   Changi et Andrews restaient sous la barre de 189 blocs du témoin.
4. **Un sens sans prolongement perd un bloc** au bord pavé du disque : la
   sonde compte désormais comme le témoin. Allonger Andrews d'un bloc à l'est
   faisait s'arrêter le chasseur du dernier poste en roulant (le guidage
   d'`approche.js` juge la place à un bloc près) : la piste reste à 219,
   déclarée. Dette pour la zone de l'approche.
5. **Un point fixe se cherche par itération.** Les prolongements lisent les
   zones du monde, qui dépendent des emplacements ; on a rejoué sonde et
   tables jusqu'à zéro changement.
6. **Changi a un sol fixé** (35, cinq au-dessus de l'eau) : la médiane de son
   île (38) faisait des digues trop hautes. Ses deux îles sont séparées d'un
   chenal de ~34 blocs que le palier 2 fermera.

## Dettes déclarées

- **Dubaï est à 2 572 blocs de sa ville** : le planisphère n'a pas la terre
  des Émirats ; la plus proche tenable est le Musandam. À reprendre quand la
  côte du Golfe sera relevée.
- **Saint-Dizier reste à son vrai site** (3 008 blocs de Paris) ; **Nellis**
  part à côté de Las Vegas, comme la vraie (elle était près de Los Angeles).
- **Les routes ne sont pas dans les sondes.** Leurs `via` sont en blocs de
  l'ancienne carte : les routes d'aujourd'hui coupent les aires de Roissy,
  d'Orly, de Heathrow et de Yokota (`mesurerAires` s'y arrête sur « route »).
  À la session C de contourner les pistes publiées (`pistesDe`) ; les AIRES se
  remesurent ensuite (`node tests/sonde-aires-aeroports.mjs`), puis le témoin
  de `plafond.js` rendra l'égalité.
- Les commentaires de ligne des tables disent le vrai cap, la vraie distance
  et ce que la sonde a retenu : on les réécrit avec la sonde, jamais à la main.
