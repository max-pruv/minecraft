# Contexte du projet — à lire avant toute modification

Ce fichier est chargé automatiquement au début de chaque session. Il ne
raconte pas ce que fait le jeu (c'est le `README`), il dit **ce qu'il ne faut
jamais casser, et pourquoi** — la mémoire des pannes qui ont coûté cher.

**Règle de tenue : toute modification qui change une règle, un invariant ou une
décision d'architecture met ce fichier à jour dans le même commit.** L'histoire
détaillée, elle, vit dans `git log` — les messages de commit sont écrits pour
être lus — et ce que chaque version apporte vit dans `CHANGELOG.md`, qui n'a
pas le droit d'avoir un train de retard sur la production.

---

## Pour qui

Un jeu éducatif pour **Marlon** (~7 ans) et **Alice** (CM1), famille
franco-américaine. Ce ne sont pas des utilisateurs abstraits : ils ont des
mondes sauvegardés avec des milliers de blocs posés à la main, et perdre leur
travail est irrattrapable.

- **Toutes les réponses à Max sont en français.**
- Les commentaires de code sont en français dans les fichiers récents.
- Un message d'erreur doit dire à un enfant **quoi faire**, jamais accuser à
  tort. Un message faux est pire que pas de message.

---

## Invariants non négociables

1. **Le sol ne bouge jamais.** Les blocs des enfants sont repérés par
   coordonnées absolues. Si `terrainHeight()` change d'un seul bloc, une maison
   se retrouve enterrée ou en l'air, sans recours. `SOMMET_TERRAIN` (80) est
   figé et **découplé de `HEIGHT`** exactement pour cela — relever le plafond ne
   doit plus jamais toucher au relief. Le témoin `plafond.js` vérifie une
   empreinte du paysage sur 218 089 colonnes ; si elle change, c'est une
   décision, pas une mise à jour de valeur.

   **Une exception, une seule, accordée par Max** (août 2026) : la remise à
   plat de la carte sur la vraie géographie. « On reste sur une phase très
   early du développement, donc on peut se permettre de casser certaines
   choses pour refaire bien le fond. » Elle vaut **pour cette refonte-là et
   pas au-delà** : une fois les villes à leur place, le sol se refige et
   l'invariant reprend tel quel, empreinte comprise. Même autorisé, on ne
   casse pas plus que nécessaire — voir « La refonte de la carte » plus bas.

   **Elle a servi une QUATRIÈME fois, en v199, pour agrandir la carte
   entière** — décision de Max, « agrandir la carte entière » — et c'est la
   seule fois où la casse n'a PAS pu être bornée : l'échelle passant de 0,75 à
   0,375 km par bloc, le relief se réécrit partout où la projection décide de
   la géographie. Les deux empreintes changent, et aucune découpe ne peut les
   sauver.

   **Ce qui la rend acceptable est ailleurs, et c'est la leçon à garder :
   quand on ne peut pas BORNER une casse, on prouve autre chose — et la preuve
   doit être plus forte qu'un hash.** La carte d'avant est figée pour toujours
   dans `MONDES.terreAvant`, et un témoin compare les deux : le sol sous le
   point d'apparition et sous Paris doit être IDENTIQUE, colonne par colonne.
   Mesuré à la livraison : 4 040 colonnes, zéro déplacée. Ce témoin ne peut pas
   être satisfait en mettant une valeur à jour — c'est ce qui le distingue
   d'une empreinte, et c'est lui qui porte l'invariant désormais.

   Trois filets, posés AVANT que rien ne bouge : une copie des blocs de chaque
   enfant sur son propre document (écrite une seule fois — repasser dessus
   remplacerait la copie d'avant par une copie d'après) ; une migration qui
   décale chaque bloc de la différence de sol sous sa colonne, bornée à
   vingt-quatre blocs ; et le témoin ci-dessus.

   **Elle a servi une NEUVIÈME fois, en v306, pour doubler Paris et le
   déplacer** — décision de Max, « Doubler Paris, déplacé », parce que les rues
   à la règle du kit (v303) vidaient ses quartiers. Et elle se BORNE, ce qui
   la range avec v187, v200 et v204 et non avec v199 et v242 : l'empreinte du
   relief change, et avec une découpe qui retire l'ancien ET le nouveau Paris,
   les sites d'avant ET d'après de Roissy, d'Orly, de Saint-Dizier, du village
   gaulois et du volcan, le reste vaut `2aeceaa1…` sur `origin/main`, sur la
   v305 et sur la branche — 154 158 colonnes. Ce qui est NEUF et fait règle :
   **les marches qui jugent un bloc d'avant le jugent sur le monde où il a été
   posé** (`new World({ avant: true })`, `CONF_AVANT`), et ce monde se prouve
   au bloc près contre la production. Voir « Paris doublé et déplacé (v306) ».

   **Elle a servi une DIXIÈME fois, en v309, pour adoucir le fondu des villes
   engendrées** — Max : « Fait tout, arrête d'attendre ». Et c'est la forme
   la plus bornée de toutes : le cône abaisse 393 000 colonnes autour de 149
   villes, mais AUCUNE dans la fenêtre d'empreinte — les deux empreintes de
   `plafond.js` sont intactes sans rien déclarer — et le monde d'où l'on part
   se garde et se prouve (`CONF_V308`, empreinte relevée sur `origin/main`).
   Voir « Le fondu doux (v309) ».

   **Elle a servi une ONZIÈME fois, en v486, pour Changi** — et c'est la
   forme bornée, hors de la fenêtre d'empreinte : l'île de l'aérodrome est la
   zone à terre de son repère (`box + 30`), rien d'autre. Un témoin de
   `plafond.js` engendre le pays avec et sans Changi DANS LE MÊME CODE (zéro
   colonne changée hors de la zone), et la même découpe a été mesurée sur
   `origin/main` et la branche. Voir « Changi (v486) ».

   **Elle a servi une HUITIÈME fois, en v242, pour doubler le monde encore**
   — Max : « la ville de New York touche quasiment Montréal ». Manhattan,
   refaite en v240, est un rectangle de 480 × 2 300 blocs qui laissait 41
   blocs à Boston, 52 à Montréal, et JFK tombait dedans ; le registre disait
   pourtant `r: 152`, et le témoin des chevauchements jugeait sur lui. Comme
   en v199 la casse ne se BORNE pas — 0,375 → 0,1875 km par bloc, les deux
   empreintes changent — et c'est le témoin des 4 040 colonnes qui la garde
   (zéro déplacée, mesuré). Ce qui est NEUF, et qui fait règle : **la
   migration des blocs est une chaîne, un bloc suit sa ville, et la migration
   est pure** — appliquée au stockage de l'appareil une fois, et à chaque
   document reçu du nuage avant la fusion. Voir « La migration de la carte »
   plus bas. Et une seconde copie d'avant se prend SUR LE NUAGE, avant d'y
   toucher : celle de v199 se prenait sur l'appareil, douze secondes après le
   lancement, donc APRÈS la migration — une copie d'après, que rien n'avait
   trahie parce que rien ne bougeait là où les enfants ont bâti.

   **Et une casse de cette taille révèle les témoins qui ne prouvaient rien.**
   Quatre témoins de `carteMonde.js` portaient l'échelle écrite en dur —
   `/ 0.75`, l'ancre `200`, des rayons de recherche en blocs qui valaient des
   kilomètres. Ils cherchaient le sommet de l'Everest à mi-chemin de l'Everest.
   Ils étaient verts depuis toujours PARCE QUE RIEN N'AVAIT BOUGÉ, pas parce
   qu'ils étaient justes. Un témoin qui ne peut pas voir un changement n'en
   prouve pas l'absence : il en donne l'illusion. Toute distance du monde réel
   se redemande à la projection, jamais ne se recopie.

   **Elle a servi une SEPTIÈME fois, en v223, pour les aérodromes** — et
   celle-ci est née d'un signalement de Max : « il faut que tu refasses
   l'aéroport de Charles-de-Gaulle parce qu'il est maintenant SUR la ville de
   Paris et pas à côté ». Mesuré : cent vingt et un blocs de chevauchement avec
   le disque de la capitale, parce que Paris est passé de 55 à 185 blocs de
   rayon en v187 et que l'aéroport, posé bien avant, n'a jamais suivi — le
   piège du Bay Bridge, mot pour mot. Roissy déménage, dix-huit aérodromes
   s'ajoutent, et la borne prend la forme canonique : l'empreinte du relief
   change, celle d'hors des villes ET DES AÉRODROMES ne bouge pas — 170 278
   colonnes, `b2566e0e…` des deux côtés, MÊME découpe sur `origin/main` et sur
   la branche. **L'ancienne place de Roissy est DANS la découpe** : le
   déménagement lui a rendu son relief naturel (35 → 34), ce qui est un
   changement voulu ; l'y laisser ferait accuser la livraison d'avoir cassé ce
   qu'elle a réparé.

   **Et la leçon vraie de cette livraison n'est pas dans l'empreinte : c'est
   qu'UN EMPLACEMENT SE MESURE, IL NE S'ÉCRIT PAS.** Mon premier brouillon
   posait Roissy à (−102, −100) — à DEUX BLOCS de la maison sauvegardée du
   témoin de `plafond.js`, celle qui prouve depuis des dizaines de versions
   qu'un plancher d'enfant ne bouge pas. La ligne se lisait très bien. C'est
   une sonde qui balaie les sanctuaires, les villes et les autres aérodromes
   qui l'a dit. Tout ce qui aplanit du sol se place par une sonde, et l'on
   écrit le résultat, pas l'intuition.

   **Elle a servi une SIXIÈME fois, en v204, pour Lille** — dans la fenêtre
   d'empreinte, comme Paris, et bornée de la même manière : Lille passe de
   seize à trente-deux blocs par kilomètre et son disque de 46 à 92. La
   découpe hors villes s'élargit avec le disque (86 → 132 blocs de portée),
   donc le NOMBRE de colonnes change — 188 166 → 184 656 — et le hash avec ;
   ce qui prouve la borne, c'est que la MÊME découpe mesurée sur `origin/main`
   et sur la branche rend le même hash, colonne pour colonne. Un troisième
   témoin vérifie qu'aucun sanctuaire n'est à portée du disque ; le plus
   proche, le quartier des enfants, en reste à 229 blocs.

   **Elle a servi une CINQUIÈME fois, en v200**, pour remettre à l'échelle les
   deux cent soixante-neuf villes engendrées — et cette fois elle se BORNE à
   nouveau, ce qui en fait le modèle à suivre. Deux villes seulement tombent
   dans la fenêtre d'empreinte, Bruxelles et Cologne. L'empreinte du relief
   change, celle d'HORS des disques ne bouge pas : 188 166 colonnes et le même
   hash sur `origin/main` et sur la branche, avec la MÊME découpe des deux
   côtés. Un troisième témoin vérifie qu'aucune des deux cent soixante-neuf
   villes ne s'approche de ce que les enfants ont bâti — la plus proche,
   Bruxelles, en reste à 228 blocs. **Et le facteur d'échelle est un résultat,
   pas un goût** : la pire marge entre deux disques donne k=1,8 → 31 blocs,
   k=1,9 → 24, k=2,0 → 17, k=2,2 → 1. On prend 1,8, et le chiffre se
   remesurera le jour où une ville bougera.

   **Elle a servi une TROISIÈME fois, en v187, pour Paris** — et cette
   fois-là, elle sert dans la fenêtre d'empreinte, ce qui rend la borne
   vérifiable au bit près. Paris passe de huit à vingt-quatre blocs par
   kilomètre et son disque de 55 à 185 blocs : l'empreinte du relief change.
   L'empreinte HORS villes, elle, est identique à celle de la v186 — 153 382
   colonnes des deux côtés, mesurées avec la MÊME découpe sur `origin/main` et
   sur la branche. C'est la manière canonique de prouver qu'une casse est
   confinée, et elle se refait à chaque fois : on ne met pas à jour un hash,
   on mesure les deux côtés. Un troisième témoin vérifie que le disque de
   Paris ne s'approche d'aucun des trois sanctuaires (il en reste à
   soixante-six blocs).

   **Elle a servi une SECONDE fois, en v186, pour Manhattan** — et cette
   fois sans double empreinte, pour une raison qu'il faut connaître :
   `plafond.js` échantillonne x, z dans [−700, 700], et New York est à
   (−5191, 1407). L'empreinte ne l'atteint pas. Ce qui garde la refonte,
   ce sont donc les témoins de `carteMonde.js` — l'île plate de Battery à
   la 68e Rue, ses deux fleuves autour, aucune ville qui en touche une
   autre — et rien d'autre. Une refonte hors de la fenêtre d'empreinte
   doit apporter ses propres témoins : personne ne le fera à sa place.

   **Elle a servi une première fois, en v161, pour bâtir Washington** — et la manière
   dont elle a servi fait règle pour la suite. Poser une ville de cent
   soixante-quinze blocs déplace le sol sous elle, c'est inévitable. Ce qui ne
   l'est pas, c'est de le déplacer ailleurs : la première version fondait le
   relief de la capitale sur vingt blocs autour d'elle, et ces vingt blocs
   atteignaient le point d'apparition — un demi-bloc de plus sous les pieds,
   arrondi à un bloc entier, et le plancher d'une maison est enterré.

   D'où la forme que prend désormais toute casse autorisée : **elle se déclare,
   elle se borne, et la borne se vérifie.** `washington.js` exporte
   `ZONE_WASHINGTON`, l'emprise exacte de son influence sur le relief ;
   `plafond.js` porte DEUX empreintes — celle du monde entier, qui a changé, et
   **celle du monde hors de cette zone, qui n'a pas le droit de bouger**. Un
   troisième témoin vérifie que la zone ne touche ni le point d'apparition, ni
   le musée, ni le quartier des enfants. Une casse qu'on ne sait pas borner
   n'est pas une casse autorisée.
2. **Mode éducatif toujours actif et non contournable.**
3. **Visages : signatures uniquement, jamais de photo stockée.** Le code
   parental est stocké haché.
4. **Créatures et bâtiments originaux** — aucune propriété intellectuelle
   Nintendo, Marvel, Disney, LEGO.
5. **Jamais l'identifiant du modèle** dans un commit, une PR, un commentaire ou
   quoi que ce soit de poussé dans le dépôt.

---

## Procédure de publication

**Rien ne part en production sans être expliqué, documenté et versionné. Ce
n'est pas une étape de fin, c'est une partie de la livraison** — au même titre
que le code. Une version qu'on ne sait plus expliquer six mois plus tard est
une version qu'on ne saura pas déboguer.

1. **Portail complet vert obligatoire** : `cd tests && npm test`. Dix-sept suites, précédées de la fumée.
   Sur deux machines : `npm test -- --tranche=1/2` ici, `--tranche=2/2` dans
   une session sœur, et le portail est vert quand les deux le sont.
   Aucune publication sur un portail rouge — c'est ce qui produit les
   régressions en cascade.
2. Bump de `CACHE_VERSION` dans `sw.js` à **chaque** livraison, sinon les
   clients installés (PWA sur l'iPad) ne voient jamais la mise à jour. C'est ce
   numéro qui fait foi partout ailleurs.
3. Tout fichier `src/*.js` **nouveau** doit être ajouté à la liste `ASSETS` de
   `sw.js`, sinon il manque hors ligne.

   **ET UNE FUSION SANS SON BUMP LIVRE UN JEU QUE PERSONNE NE REÇOIT (v278).**
   La PR de la v278 a été fusionnée avant l'étape 2 : `main` ET la production
   portaient le code neuf sous la clé de cache `web-minecraft-v277`. Un iPad
   déjà installé sert alors ses anciens fichiers — la correction est en ligne
   et invisible — et le jeu se contredit lui-même, le journal des nouveautés
   annonçant une version que le service worker ne connaît pas. **Le bump n'est
   pas une formalité de fin, c'est ce qui fait qu'une livraison EXISTE pour la
   famille.** Le témoin du badge de `maj.js` l'a dit tout seul (« version
   servie v277 » pour une tête de journal à 278) : devant une PR fusionnée
   plus tôt que prévu, le premier geste est de lire `CACHE_VERSION` sur
   `main` ET en production, et de livrer le bump comme une correction à part
   entière.

   **ET UNE LIVRAISON À DEUX SUJETS EN DOCUMENTE DEUX (v279).** La même v278 a
   livré les avions garés **et** les trois demandes de Max sur les passants : le
   passant de rue qui va quelque part, l'enfant à pied qui ne traverse plus une
   voiture, la caméra qui montre le flanc en virage. Le journal — dans le dépôt
   comme dans le jeu — n'a parlé que des avions, et les trois autres sont partis
   en production **sans un seul témoin**. Deux instruments ont pourtant dit que
   tout allait bien, et il faut savoir pourquoi : le témoin du journal de
   `maj.js` compare la tête de `nouveautes.js` à `sw.js` et compte les
   ENTRÉES, jamais les SUJETS ; et un portail est vert par construction sur du
   code que rien ne garde. **Ce qu'un témoin ne garde pas, personne ne le
   garde** — écrit pour une dette, et vrai ici d'une correction du jour même.
   Le geste qui l'évite ne coûte rien : avant de fusionner, on compte les sujets
   dans le DIFF et non dans l'intention (`git diff --stat origin/main` nomme les
   fichiers), et chaque groupe de fichiers qui répond à une demande différente
   veut sa ligne au journal et son témoin.
4. **Écrire l'entrée `CHANGELOG.md` dans la MÊME fusion**, jamais après. Trois
   parties, dans cet ordre : **pourquoi** (la panne vécue ou le manque
   constaté, pas la solution), **ce que ça change** (ce que la famille voit ou
   peut faire), **ce qui le prouve** (le nombre de témoins, et ceux qui
   comptent).
5. **Mettre à jour ce fichier** si la livraison change une règle, un invariant
   ou une décision d'architecture. Même commit.
6. **Corriger le `README`** s'il vient de devenir faux — une dimension, une
   durée, un fichier. Un README périmé induit en erreur plus longtemps qu'il
   n'informe.

   **6 bis. UN PORTAIL VERT NE PROUVE PAS QU'UN ÉCRAN EST CLAIR (v506).** En
   une matinée, Max a signalé depuis son iPhone sept défauts qu'une capture
   montrait au premier regard : monter et descendre inversés en vol, une coche
   illisible, une roue méconnaissable, des cubes orange dans le ciel, des feux
   de détresse qui flottent, une minicarte décalée, une approche sans le nom de
   la ville. « C'est vraiment des choses que tu devrais anticiper. » Toute
   livraison qui touche ce que l'enfant voit — interface, HUD, effets,
   véhicules, rendu — joue donc `tests/sonde-revue-ecran.cjs` sur les états
   concernés (`--etats=`), à la taille de l'iPhone ET de l'iPad, de jour ET de
   nuit (minuit vaut 0,75 ; 0,0 est le lever du soleil). On regarde les
   captures selon la grille de `docs/revue-ecran.md`, comme un enfant de sept
   ans qui ne lit pas de mode d'emploi, et on les met dans la PR AVANT de
   fusionner. Ce qu'on y voit de travers et qu'on ne corrige pas entre dans le
   relevé du même fichier. La sonde est isolée (aucune suite ne l'importe) :
   elle ne coûte rien au portail, elle coûte le temps de regarder.
7. PR **prête, jamais en brouillon**, fusionnée immédiatement (squash). Consigne
   permanente de Max : « une manière continue constante ». Le corps de la PR
   reprend la structure de l'entrée du journal.
8. Vérifier que la production sert bien la nouvelle version :
   `curl -s https://minecraft-fam.vercel.app/sw.js | grep CACHE_VERSION`
9. Rebaser la branche sur `main` après fusion.

### Où va quoi

| Document | Ce qu'il porte | Quand il change |
| --- | --- | --- |
| `CHANGELOG.md` | Une entrée par version : pourquoi, quoi, preuve | À chaque livraison, sans exception |
| `CLAUDE.md` | Invariants, procédure, pièges, décisions | Quand une règle change |
| `README.md` | Ce que le jeu fait, comment le lancer | Quand un fait devient faux |
| `git log` | Le détail technique, le raisonnement | À chaque commit |

Ces quatre-là ne se recopient pas l'un l'autre. Le journal dit **à quoi sert**
une version ; `git log` dit **comment** elle est faite ; `CLAUDE.md` dit **ce
qu'il ne faut pas casser**.

---

## Deux voies d'essai — et c'est le code qui choisit

`npm test` demande au dépôt quelle voie mérite le changement.

**ET CE FICHIER A DÉCRIT CE MÉCANISME DE TRAVERS PENDANT DES DIZAINES DE
VERSIONS (v291).** Il annonçait une liste de fichiers « délicats » nommée
`DÉLICAT` dans `tests/tout.js` : **elle n'y est pas, et elle n'y a jamais été.**
Il n'y a pas de liste de fichiers dangereux — il y a une TABLE DES GARDIENS, lue
dans les deux sens, et l'aiguillage n'est que sa lecture. Le coût de cette
description fausse n'est pas théorique : devant le portail de la v279 qui n'avait
rejoué que DEUX suites, j'ai d'abord cru à un portail invalide, c'est-à-dire
exactement le travers que `tout.js` existe pour empêcher. **Une description de
mécanisme se relit dans le code avant de se croire** — c'est « avant de conclure
d'après un instrument, on vérifie ce que cet instrument mesure » (v285), appliqué
à la documentation de l'instrument.

`npm test` demande à git ce qui a changé (`fichiersModifies`), puis décide
fichier par fichier. Voici la table, et elle est le mécanisme entier :

| ce qui a changé | ce qui se rejoue |
| --- | --- |
| un fichier de `src/` présent dans `GARDIENS` | ses gardiens, et eux seuls |
| un fichier de `src/` **absent** de la table | la fumée seule — mais il entre dans l'empreinte de CHAQUE suite, donc tous les acquis de reprise tombent |
| `index.html` | ses quatre gardiens : `carte`, `reglages`, `maj`, `manhattan` |
| `sw.js`, version et liste de cache seulement (`swAnodin`) | rien |
| `sw.js`, logique | tout |
| le banc — `banc`, `nuage`, `tout`, `charge` — nombres seuls (`bancAnodin`) | rien |
| le banc, gardiens seulement ÉLARGIS (`gardiensElargis`) | rien |
| le banc, autre chose | tout |
| une suite d'essai | elle-même, et rien d'autre |
| une `sonde-*.cjs` qu'aucun lecteur du portail n'importe (`sondeIsolee`) | rien |
| git muet, ou quoi que ce soit d'autre | tout — on ne parie pas |

| Voie | Quand | Durée |
| --- | --- | --- |
| **Rapide** (`fumee.js`) | Contenu pur : monuments, villes, créatures, décor | ~3 min |
| **Complète** (17 suites) | Dès qu'un gardien est atteint, ou si git est muet | ~1 h → 59 min (v224) → 48 min (v225) → 74 min à quinze suites (v251) → **51 min** (v255, quinze suites) → **108 min** à dix-sept (remesuré sur la v540, `monte.js` 37 min) ; deux tranches : 54 et **87 min** (la seconde porte `reseau.js` et `maj.js`, mesurée par une session fille) ; et sur un conteneur plus lent, ≈ 170 min (v547 : `plafond.js`, sans navigateur, 4 min 36 → 7 min 30 — le conteneur, pas le code) |

`SUITES` range les suites par durée MESURÉE, le chiffre en commentaire : c'est
ce qui fait qu'un rouge de `metro.js` se voit à la quatorzième seconde et non à
la cinquante-neuvième minute (v255). `npm run long` force le tour complet,
`npm test -- --depuis-zero` ignore la reprise.

**Au moindre doute, voie longue** — et le doute a un nom : l'aiguillage ne peut
juger que ce que la table sait. Un fichier qui alourdit la page sans garder une
suite dont le VERDICT est une durée passe au travers, quoi qu'on écrive dans la
table — c'est la leçon de `passants.js` attrapé par `maj.js` (v217), et elle est
écrite plus bas.

**Pourquoi cette séparation existe.** Le portail est passé de cinq suites à
huit, de 2 588 à 5 297 lignes, et chaque livraison le payait en entier. La
cadence est tombée de neuf versions par jour à deux ou trois, et la bibliothèque
de monuments est restée un jour entier dans le dépôt **sans être branchée**,
faute de place dans la file. Une heure de portail sur un fichier de décor ne
protège rien ; une minute gagnée sur `net.js` coûte les données d'un enfant.

**Ce qui ne change pas** : un rouge se démonte, il ne se rejoue pas. La voie
rapide n'est pas une permission d'aller vite sur ce qui compte.

**UN ROUGE MESURÉ IDENTIQUE SUR `origin/main` NE BLOQUE PLUS — MAIS IL SE
PROUVE.** Décision de Max, v195. Un défaut déjà en production n'est pas causé
par la livraison en cours, et l'immobiliser derrière elle coûte des heures sans
rien protéger. La preuve exigée est stricte, et c'est elle qui empêche
l'échappatoire facile : la suite doit avoir été **rejouée SEULE des deux
côtés** — sur la branche et sur `origin/main`, dans un arbre séparé
(`git worktree add`) — et les deux mesures jointes. Le défaut part alors dans
`TASKS.md` comme dette déclarée, et la fusion passe. Sans cette double mesure,
il bloque comme avant.

**Et la table des gardiens doit être COMPLÈTE, pas indicative.** En v195 il y
manquait trente fichiers de `src/`, dont deux vrais trous : `src/visio.js` ne
lançait pas `visio.js`, et `src/garages.js` — qui écrit dans le profil de
l'enfant, à côté de ses blocs — ne lançait pas `sauvegarde.js`. Pire, aucune
ville bâtie à la main n'y figurait : `src/sanfrancisco.js` partait en voie
rapide, et c'est par ce trou que le Bay Bridge planté au milieu de la ville est
arrivé en production. Un module de `src/` sans gardien déclaré entre dans
l'empreinte de CHAQUE suite (`gardiensDe`) : il annule tous les acquis du cache
de reprise, ce qui le rend visible tout de suite. Le portail ne REFUSE pas un
gardien manquant, il le fait PAYER — ce n'est pas la même chose, et ce fichier
écrivait l'un pour l'autre.

**La voie longue trouve ce que la voie rapide ne peut pas voir.** En v187 elle
a rendu QUATRE suites rouges — `reseau.js`, `visio.js`, `reglages.js`,
`hote.js` — qui l'étaient DÉJÀ sur `origin/main`, donc en production : mêmes
témoins, mêmes valeurs. Le code réseau n'avait pas bougé depuis v164. Elles
n'étaient simplement plus sélectionnées par l'aiguillage, et elles ont rougi
en silence pendant vingt-trois versions. La leçon n'est pas « l'aiguillage est
mauvais » — il fait gagner une heure par livraison — c'est que **la voie longue
doit tourner de temps en temps même quand rien ne l'exige**, et que le premier
réflexe devant un rouge inattendu est de le rejouer SUR `origin/main` : c'est
la seule mesure qui distingue « je viens de casser ça » de « c'était déjà
cassé ».

**ÉLARGIR LA TABLE DES GARDIENS EST ANODIN — et cela coûtait une heure par
livraison.** Déclarer `src/avions.js` et ajouter `monte.js` aux gardiens de
`src/aeroport.js` : deux lignes dans `tests/tout.js`, et le portail entier se
rejouait, parce que `tout.js` est le banc. Or **un gardien AJOUTÉ ne peut faire
tourner que PLUS de suites, jamais moins** : il ne peut rien cacher. Un gardien
RETIRÉ, si. `gardiensElargis` lit donc les deux TABLES — celle d'`origin/main`
et celle d'ici — et exige que la nouvelle soit un SUR-ENSEMBLE de l'ancienne,
clé par clé, et que rien d'autre du banc n'ait bougé. La preuve n'est pas dans
le diff, elle est dans les deux tables.

**ET LE PORTAIL SE CHRONOMÈTRE, PARCE QU'ON N'ACCÉLÈRE PAS CE QU'ON NE MESURE
PAS.** Il durait une heure et n'avait jamais dit où elle passait. Max :
« pourquoi ça prend autant de temps… que ça aille dix fois plus vite. » J'ai
proposé trois pistes chiffrées, **et deux des trois chiffres étaient faux** :
« 290 s d'attentes fixes » (vrai, mais 8 % du total, pas le gros morceau) et
surtout « 43 ouvertures de jeu, dont 16 pour `carte.js` » — mon motif de
recherche confondait `ouvrirLaCarte`, qui ouvre un panneau sur une page déjà
là, avec `jouerSeul`, qui démarre le jeu. Le vrai compte est **seize
démarrages pour treize suites**, soit un par suite : il n'y avait rien à
couper. **Compter un motif n'est pas compter la chose** — c'est le reproche
qu'on fait aux témoins, et il vaut pour les mesures de performance. Chaque
suite affiche donc sa durée, et le portail finit par un classement « où passe
le temps » : minutes de suites, minutes d'attente entre elles, total.

**`souffler()` N'ÉTAIT PAS UNE CONDITION, C'ÉTAIT UN DÉLAI FIXE DÉGUISÉ
(v224).** Son défaut était de deux minutes, et il l'atteignait **cinq fois sur
six** : six cents secondes sur les mille quatre-vingts de `reglages.js`. Une
attente qui tape sa limite n'attend pas que quelque chose arrive, elle expire.
Ramenée à trente secondes — le chiffre que `tout.js` utilise déjà — le portail
passe de **83 à 59 minutes**, treize suites vertes, rien de perdu.

Trois choses en sortent, et la troisième est la plus importante.

- **Le remède était déjà écrit dans le fichier d'à côté.** La v220 avait
  mesuré que la charge d'une minute est une moyenne QUI DÉCROÎT, sans relation
  avec la cadence, et `attendreLeCalme` était passé de 180 à 30 s pour ce
  motif. `souffler`, la même idée dans `banc.js`, a gardé ses deux minutes
  deux versions de plus. C'est mot pour mot le piège du verre dans les murs :
  **quand une panne touche une grammaire partagée, on cherche TOUTES ses
  occurrences le jour même.**
- **Une attente qui expire doit LE DIRE.** Chaque appel affiche sa durée et
  signale s'il a atteint sa limite. Sans cela on y remet deux minutes sans que
  personne ne le remarque — c'est ce qui s'est passé pendant deux versions.
- **ET LE SEUIL ÉTAIT SOUS LE COÛT D'UNE SEULE PAGE (v225).** La question à
  poser n'était pas « quel seuil ? » mais « que coûte une page ? » :

  ```
  machine au repos      0,14
  UNE page ouverte      1,16 → 2,02 → 3,08 → 3,77 → 4,04   (régime établi)
  DEUX pages ouvertes   4,13 → 4,66 → 4,83
  ```

  Sur quatre cœurs, une seule page porte déjà la charge à près de 4. À
  `chargeMax = 2.0` la condition était donc INATTEIGNABLE dès qu'un navigateur
  était ouvert. Porté à **4,2**, il sépare ce que les mesures séparent — une
  page passe, deux pages attendent — et le portail tombe de **59 à 48
  minutes**, treize suites vertes. Une constante de seuil se règle sur le coût
  MESURÉ de ce qu'elle est censée laisser passer, jamais sur une intuition de
  ce qui « paraît chargé ».

**LA CHARGE D'UNE MINUTE NE VOIT PAS MOURIR UNE PAGE — ET `souffler` LA
LISAIT ENCORE (v255).** Max : « accélérer la partie testing, même qualité,
beaucoup plus vite. » Un inventaire de TOUTES les attentes du banc, poste
par poste, avant de toucher une ligne. Le premier poste n'était pas une
suite, c'était l'instrument : `souffler`, appelé avant chaque page, lisait
`/proc/loadavg`, dont le dépôt avait déjà mesuré deux fois qu'il retarde de
cent secondes. Sur le portail de la v253 : trente-huit appels, six cent
quatre-vingt-dix secondes, vingt-deux au bout de leur budget — dix minutes
sur cinquante-neuf à attendre un nombre qui ne pouvait pas descendre. Quatre
règles, dans `tests/charge.js`.

- **ON LIT L'OCCUPATION RÉELLE, SUR UNE DEMI-SECONDE** (`/proc/stat`, deux
  relevés). Mesuré sur ces quatre cœurs : repos 0,1 ; une page de jeu
  ouverte 3,7 à 3,8, stable ; une page fermée retombe à 0,2 en moins d'une
  seconde. C'est la grandeur que la v220 avait mesurée comme coûteuse — des
  pages VIVANTES en même temps — et non la trace de ce qui est mort.
- **UNE CHARGE QUI NE REDESCEND PAS NE S'ATTEND PAS, ELLE SE DIT.** Une
  page qu'une suite garde ouverte exprès (l'hôte qu'un invité va rejoindre)
  donne une occupation STABLE que rien ne fera baisser ; l'ancien `souffler`
  y brûlait tout son budget. Quatre relevés à moins de 0,3 cœur d'écart, et
  l'on avance en imprimant ce qu'on a vu (« charge stable — quelque chose
  tourne encore »). Une attente qui ne peut pas aboutir n'est pas une
  condition, et l'on ne remet pas un délai fixe sous un autre nom.
- **LE REPOS ENTRE DEUX SUITES EST UNE CONDITION BORNÉE.** `REPOS_MS`
  dormait vingt secondes quinze fois par portail — cinq minutes — pour
  laisser mourir des processus qui meurent en une seconde. `reposer()`
  attend un cœur occupé au plus, borné aux vingt secondes d'avant.
- **LES SUITES COURTES PASSENT D'ABORD.** L'ordre ne change rien au total,
  et tout au temps jusqu'au premier rouge : `reseau.js` en tête, un rouge de
  `metro.js` se découvrait à la cinquante-neuvième minute. `SUITES` est
  rangée par durée mesurée (v251), la durée en commentaire ; on remesure
  l'ordre quand une suite change de poids.

Et deux choses de plus. **`jouerSeul` attendait 3,5 s « le temps que les
morceaux arrivent »** : c'est un fait du jeu — les neuf morceaux autour de
l'enfant sont maillés — et on l'attend, borné aux 3,5 s d'avant, jamais
plus long. **L'empreinte de reprise prend la FORME des fichiers du banc**,
chiffres effacés, la règle que `bancAnodin` appliquait déjà à l'aiguillage
depuis la v195 : régler une borne n'annule plus quinze acquis, trois quarts
d'heure pour un chiffre. Le code du jeu, lui, entre brut — un nombre y est
une règle.

**Ce que l'inventaire a écarté, et pourquoi.** Sortir les témoins purs du
navigateur (`carteMonde.js`, `plafond.js`) : ces deux suites font 34 et
51 s au portail — le gain se compterait en secondes, et deux témoins qui se
ressemblent dans deux fichiers finissent par n'être corrigés qu'une fois.
Une cadence de banc (`?tempo=`) sur les minuteries du jeu (STALE 20 s,
REPIT 8 s, `pullPlayTime` 60 s) : c'est le second poste, huit à douze
minutes, mais il touche `src/` et il exige qu'un témoin par constante reste
à l'échelle réelle — dette déclarée dans `TASKS.md`, avec la liste des vingt
minuteries et celle de ce qui ne doit JAMAIS passer sous tempo (l'horloge
scolaire, `chronoReel`, la borne de `dt`, les débits que `monte.js` mesure).

**ON N'ACCÉLÈRE PAS CE QU'ON N'A PAS MESURÉ — QUATRE FOIS DE SUITE (v224).**
Devant « pourquoi ça prend autant de temps », j'ai avancé quatre explications
chiffrées avant d'instrumenter quoi que ce soit, et les quatre étaient
fausses : les attentes fixes (7 % en réalité), « 43 ouvertures de jeu » (mon
motif attrapait le PANNEAU de la carte, pas une page), « 16 démarrages, rien à
couper » (mauvais motif encore : il y en a 37), puis « ~100 s par page » (une
division, jamais une mesure — c'est 6 s). **Compter un motif n'est pas compter
la chose** : c'est le reproche qu'on fait aux témoins, et il vaut d'abord pour
les mesures de performance. Le portail se chronomètre désormais suite par
suite, et `reseau.js` et `reglages.js` témoin par témoin ; ce relevé a trouvé
la cause en UNE exécution.

**UNE INTERMITTENCE NE SE JUGE PAS SUR UN PASSAGE DE CHAQUE CÔTÉ (v269).**
La double mesure de la v195 dit « rejouée SEULE des deux côtés » ; appliquée
à la lettre, UN passage de chaque côté, elle m'a fait conclure l'inverse de
la vérité. `manhattan.js` rendait un délai sur la ligne 282 deux fois sur
deux sur la branche et zéro fois sur le premier passage d'`origin/main` :
tout désignait la livraison. Au TROISIÈME passage sur `origin/main`, le même
délai. Et les trois témoins de contenu, eux, sont rouges à l'identique sur
`origin/main` chaque fois qu'ils sont atteints — la suite s'arrêtant plus
tôt quand le délai tombe, elle ne les atteint pas toujours. **Quand un rouge
est un DÉLAI, ou qu'il ne se reproduit pas à l'identique, on rejoue jusqu'à
voir la MÊME distribution des deux côtés, pas jusqu'à voir un vert** — c'est
exactement l'inverse de « relancer jusqu'au vert », et cela se distingue par
ce qu'on cherche : la fréquence, pas le succès.

**UN ROUGE DE FUMÉE CACHE L'ÉTAT DES DOUZE AUTRES SUITES.** La barrière est
bonne par défaut — elle évite d'attendre cinquante minutes quand un module ne
charge pas. Mais un témoin de CONTENU rouge, le jeu démarrant très bien, arrête
tout : on ne sait plus rien du reste du portail. En v223 la vie de rue de Paris
était rouge sur `origin/main` DEUX FOIS SUR TROIS, et la livraison en cours n'y
était pour rien. `npm test -- --malgre-fumee` continue quand même, **et le
verdict global reste ROUGE** : on ne se donne pas le vert, on se donne la vue.
À n'employer qu'avec la double mesure en main — la règle de la v195 s'applique
telle quelle.

**UN TÉMOIN QUI REND UN SEUL NOMBRE POUR TROIS PANNES NE SE DÉMONTE PAS.**
« La ville reste habitée quand on la traverse » compte les passants VISIBLES à
moins de soixante-deux blocs. Ce nombre confond trois choses : personne n'a été
posé, on en a posé mais trop loin, on en a posé près mais ils sont cachés.
Devant son rouge j'ai fait TROIS hypothèses successives — la portée de
l'aéroportiste, puis la vitesse de `terrainHeight`, puis le banc — et les trois
étaient fausses ; chacune a coûté un passage de banc. Une sonde qui sépare les
trois a tranché en une seule exécution : dix-huit existent, aucun n'est caché,
ils sont à quarante-deux blocs. **Devant un rouge qu'on n'explique pas du
premier coup, on n'essaie pas une deuxième hypothèse : on écrit la sonde qui
distingue les cas.**

*(Une des trois hypothèses a quand même laissé un vrai gain : dix-neuf
`Math.hypot` par colonne dans `terrainHeight` — le chemin le plus chaud du jeu —
coûtaient +29 % (2 311 → 2 982 ns). Rejetés par une comparaison de boîte avant
tout calcul, on revient à 2 431. Une mesure fausse sur la cause peut rester
juste sur le fait.)*

**Et le portail, c'est `npm test` — jamais une liste de suites choisie à la
main.** De v176 à v181, les barrières rejouaient six suites nommées une à une
et jamais la fumée : son témoin de la bibliothèque de monuments est resté
HUIT versions sur l'onglet supprimé en v176, rouge sans que personne ne le
voie. Six suites vertes ne valent pas un portail vert — c'est la même leçon
que « ne jamais relancer jusqu'au vert », par l'autre bout.

---

## Un témoin lit ce que le jeu POSE, pas ce qu'une image laisse voir (claude/temoins-monte)

Trois règles, toutes nées de rouges de `monte.js` qui n'étaient pas des pannes.

- **UN ÉTAT QUI CLIGNOTE SE LIT À SA POSE.** Les feux de détresse alternent
  toutes les 0,7 s et leur visibilité ne s'écrit qu'à l'image : à une image
  par seconde, toutes les images d'un arrêt peuvent tomber éteintes. Ce que
  le jeu fait de façon déterministe — poser le groupe `detresse` sur le
  maillage heurté — est ce que le témoin lit.
- **UN COMPTE LU JUSTE APRÈS UN SAUT EST CELUI DE L'ENDROIT QU'ON QUITTE.**
  `visibles` se relit à l'image ; on attend quelques images rendues avant de
  compter la ville d'arrivée.
- **UNE BARRE SE VÉRIFIE SUR LE CODE DÉSARMÉ, PAS SEULEMENT SUR L'ANCIEN.**
  « par tranches » valait cinq ; désarmé, le budget rend cinq. Un témoin qui
  passe sur le défaut qu'il garde ne garde rien.

Et un témoin de conduite qui a besoin de place se pose sa dalle (le virage à
pleins gaz décrit un cercle d'une trentaine de blocs) : la campagne du point
d'apparition a des murs et des arbres.

## Cinq intermittents démontés (claude/temoins-intermittents) — la sonde d'abord, et un défaut du jeu dedans

Chacun démonté par une sonde qui sépare les cas (v223), jamais par un rejeu.
Quatre règles.

- **CE QUE `heurter` LIT ET CE QUE LE MAILLAGE MONTRE NE SONT PAS DE LA MÊME
  IMAGE.** `cederLePassage` collecte AVANT `update`, `montrer` pose le
  maillage APRÈS : à 800 ms par image, 7 blocs d'écart pour la même voiture
  (`sonde-heurter-image.cjs`). Un témoin qui vise une fonction de la collecte
  (`heurter`, `voitureContre`) prend sa cible dans la collecte
  (`diagCeder()`), dans la même tâche.
- **UN ÉVÉNEMENT QUI VOYAGE PAR DEUX CHEMINS ARRIVE DANS LES DEUX ORDRES.**
  L'histoire des chocs de la rue part par `rue_choc` ET par la position (`rc`,
  v374) : le froissage peut précéder le message qui allume les feux de
  détresse. Un verdict sur le second ne se lit pas dans la foulée du premier ;
  on attend son fait, borné.
- **UNE FENÊTRE EN TEMPS RÉEL S'OBSERVE PAR IMAGE DANS LA PAGE QUI LA VOIT.**
  Le feu de la voiture d'un ami dure 3,5 s réelles avant le dépôt ; lu une fois
  au bout d'une attente, il était déjà fini. Un relevé `requestAnimationFrame`
  dans la page garde ce qu'elle a vu ; ce qui doit se lire avant la fin
  (le lieu de l'arrêt) se lit avant.
- **UNE ÉCHÉANCE NE PREND PAS POUR BUT L'ENDROIT OÙ L'ON A ÉCHOUÉ.** La sortie
  de chaussée d'un flâneur (v385) expirait au bout de six secondes et prenait
  le poste LÀ OÙ il s'était arrêté, sur l'asphalte : il y flânait, ressortant
  sans fin. Le poste est le bord visé (`vie.js`) ; un témoin le provoque par un
  mur de crochet et lit le poste après l'échéance. Et une traversée AU FEU
  n'est pas une traversée sans feu : le témoin des passages peints juge les
  seules traversées décidées sans feu (`tr: null`), comme celui de Rome.

## Le portail ne va pas plus vite sur une machine : il se répartit (banc, après la v540)

Max : « que la CI soit beaucoup plus rapide, beaucoup plus sélective ». Tout a
été MESURÉ avant d'écrire une ligne, et deux des trois pistes évidentes sont
des non-résultats. Cinq règles.

- **LE PORTAIL COMPLET FAIT 108 MINUTES, ET LES CHIFFRES DE `SUITES` DATAIENT
  DE LA v251.** Mesuré sur `origin/main` (v540), horodaté ligne par ligne :
  `monte.js` 36 min 42 (noté 15), `reseau.js` 21 min, `maj.js` 10 min (noté
  1 min 34), `manhattan.js` 7, `parishd.js` 5 (noté 45 s). Un tableau de durées
  qu'on ne remesure pas ment sur l'ordre et sur les tranches ; les chiffres en
  commentaire de `SUITES` sont relus par `tout.js` (`DUREE_MESUREE`), donc on
  les remet à jour quand une suite change de poids.
- **LA MACHINE EST SATURÉE : DEUX SUITES EN MÊME TEMPS N'Y GAGNENT RIEN.**
  Occupation relevée toutes les cinq secondes pendant le portail : 3,1 à 3,6
  cœurs sur quatre dans CHAQUE suite de navigateur, moins de deux cœurs moins de
  5 % du temps. Seule `plafond.js` (node) laisse de la place (2,4), et ses
  4 min 36 ne valent pas le risque d'une suite de navigateur qui mesure des
  durées à côté (v220). Le parallélisme ne se cherche donc PAS sur la machine.
- **LA SÉLECTION À LA LIGNE EST UN NON-RÉSULTAT MESURÉ — on ne la reconstruit
  pas.** Une carte de couverture V8 (binaire par fonction, navigateur et node,
  relevée par un portail complet instrumenté : 110 min contre 108, l'instrument
  ne coûte rien) disait quelles lignes de `src/` chaque suite exécute ; la règle
  ne gardait d'un fichier que les gardiens qui exécutent une ligne touchée.
  Rejouée sur les 24 dernières livraisons : **1 853 → 1 848 minutes, 0 %.** La
  boucle de jeu passe partout : `monte.js`, `reseau.js` et `maj.js` exécutent
  presque toutes les fonctions de `main.js`, `animals.js`, `pietons.js`… La
  table des gardiens n'est pas trop large, elle est exacte. Écrit, mesuré,
  retiré (le code vit sur la branche `claude/portail-rapide`, commit 96a9383,
  si l'on veut un jour descendre au TÉMOIN — ce qui suppose de défaire
  l'héritage d'état entre témoins de `monte.js`, v279).
- **LE GAIN EST DANS LES MACHINES : `--tranche=k/n`.** `trancher` répartit les
  suites choisies par durée mesurée (la plus longue d'abord, dans la tranche la
  moins chargée) ; chaque tranche joue ses suites ENTIÈRES, rien n'est sauté, et
  le portail est vert quand toutes le sont. Mesuré en deux tranches : 54 min ici
  (`monte.js` et six autres) et **87 min** pour la seconde, dans une session
  fille (`reseau.js` seule y prend 33 min) — contre 108 en une. La répartition
  théorique (deux moitiés de 54) ne tient pas : les durées de `SUITES` sont
  relevées sur UN conteneur, et la tranche qui porte les suites réseau tourne
  plus lentement que leurs chiffres. Le prix : un second conteneur pendant une
  heure et demie, et le premier tour de la session sœur, qui lit ce fichier
  (≈ 5 $ mesuré). `monte.js` (37 min) est le plancher de toute
  répartition : trois tranches ne descendent pas sous lui. Le levier suivant est
  de couper `monte.js` en chapitres indépendants — ses pages (`tab`, `ciel`,
  `pageGta`, `emb`…) sont mêlées dans un seul fichier que plusieurs sessions
  modifient : c'est une décision, pas un réglage.
- **LES ROUGES D'HIER PASSENT D'ABORD.** La mémoire du portail retient les
  suites rouges (`rouges`) ; au portail suivant elles jouent en tête : un rouge
  qui revient se voit en minutes au lieu d'attendre derrière `monte.js`. L'ordre
  ne change aucun verdict — chaque suite monte son propre banc.
- **LES VOISINES SE METTENT DE CÔTÉ PENDANT QU'UNE PAGE SE CHARGE — et
  c'est le CANVAS qu'on réduit, jamais la fenêtre.** `reseau.js` seule,
  relevée ligne par ligne (35 min 30) : `souffler` n'y coûtait que 17 s, le
  temps était DANS les scénarios, et les plus lourds étaient ceux où l'hôte (et
  un ami) restaient en jeu pendant qu'une nouvelle tablette se chargeait puis
  rejoignait — la règle de la v440 (une page en jeu, quatre cœurs) vue d'un
  autre côté. `banc.aLEcart` (appelé par `joueur`, `creerMonde`, `rejoindre`)
  réduit le canvas de toute page déjà ouverte à 16 × 16 pendant le chargement
  et la rend AVANT que le témoin reprenne la main ; le jeu remesure son canvas
  toutes les 500 ms. Mesuré, même code, même conteneur : `reseau.js` seule
  2 130 → 2 027 s (le passager 208 → 145 s, la même circulation 119 → 78 s,
  « à trois » 132 → 101 s), mêmes verdicts hors intermittences déclarées ;
  `monte.js` inchangée (3 250 s ancien banc, 3 277 au portail), parce qu'elle
  met déjà sa page de côté elle-même. `BANC_DE_COTE=0` rejoue l'ancien banc.
  **Mon premier jet réduisait la FENÊTRE (`mettreDeCote`) et rendait neuf
  rouges** : une fenêtre redimensionnée perd le verrou du pointeur, et une page
  de bureau passe en pause (`pointerlockchange` → `running` faux) sans en
  ressortir — la voiture de l'hôte immobile, zéro bloc en vingt secondes
  (`sonde-de-cote-pause.cjs` le montre en une exécution). `mettreDeCote` reste
  juste pour une page TACTILE (celle de `monte.js`), qui n'a pas de verrou ;
  sur une page de bureau, il met le jeu en pause.
- **CE QUI RESTE DANS `reseau.js` EST DU TEMPS RÉSEAU VOULU.** Le silence
  toléré, le phare, les présentations perdues, l'hôte sans courtier (181 s, un
  rouge intermittent qui va au bout de ses bornes) : chaque scénario attend ce
  qu'il éprouve, et le tempo du réseau est mesuré impossible (v501). Le gain
  suivant n'est pas une attente à raboter, c'est une machine de plus
  (`--tranche`).

## Le tempo du banc (v501) — une cadence se divise, une fenêtre calée sur le monde non

`?tempo=N` (`src/tempo.js`, pur) divise les minuteries de synchronisation du
jeu sur le banc, et seulement là. Trois règles.

- **EN PRODUCTION, `t(ms)` REND `ms` AU BIT PRÈS.** Le tempo ne se lit que sur
  127.0.0.1/localhost, et seulement pour accélérer (entier de 2 à 8). Un
  témoin sous node (`reglages.js`) relit chaque cadence à sa valeur réelle :
  un tempo mal câblé publierait un jeu qui republie toutes les cinq secondes.
- **LA SUITE DÉCLARE SON TEMPO, ET SES ATTENTES LE SUIVENT.**
  `banc.fixerTempo(4)` en tête, `banc.enTempo(ms)` pour toute attente adossée
  à une minuterie du jeu, `window.__tempo` vérifié dans la page (sinon une
  suite « accélérée » mesurerait l'échelle réelle en annonçant le contraire).
  `BANC_TEMPO=1` / `npm run long -- --tempo=1` l'emporte : une course révélée
  à tempo 4 peut ne pas exister dans le vrai jeu.
- **CE QUI BORNE UNE OPÉRATION RÉSEAU OU TOLÈRE UN TRAVAIL RÉEL NE PASSE PAS
  SOUS TEMPO.** Le réseau et le processeur du banc ne vont pas plus vite.
  Mesuré (`sonde-tempo-nuage.cjs`) : le silence toléré de `net.js` divisé par
  quatre, deux tablettes sans courtier ne se retrouvaient plus (0/4 contre
  4/4) et le passager ne s'asseyait plus (0/3 contre 3/3) — un pair du nuage
  n'a pas de canal à sonder, et une page qui charge son monde se tait des
  secondes réelles. `net.js` ne lit pas ce module, et le témoin le garde.
  L'horloge scolaire, `cadence.js`, la borne de `dt` et les débits de
  `monte.js` n'y passent jamais. Et **un gain de durée se compare sur des
  passages au même verdict** : `reseau.js` « gagnait » 253 s à tempo 4 parce
  que quatre rouges intermittents de la référence étaient verts — un rouge
  coûte ses bornes d'attente.

## UN CLASSEMENT AUTOMATIQUE NE PROPOSE QUE CE QU'ON A DÉJÀ FAIT TOURNER (v291)

Max, capture d'iPhone sur la production : « A problem repeatedly occurred », et
trois mots — « Game break after 3sec ». **Le jeu mort pour Marlon et Alice, sur
l'adresse de tous les jours.** La cause est ma v290, et elle n'est pas dans ce
qu'elle a écrit : elle est dans ce qu'elle a DÉVERROUILLÉ. Six règles.

- **UN RÉGLAGE QU'UNE BARRIÈRE REND INATTEIGNABLE N'EST PAS UN RÉGLAGE PRUDENT,
  C'EST UN RÉGLAGE NON ÉPROUVÉ — ET LA BARRIÈRE LE CACHE.** `haut` valait
  `rr 16 · file 16 · hd 6` depuis la v284. Sa barre de travail était comparée à
  la PÉRIODE de l'écran (17,0 ms à 60 Hz pour une barre à 8), donc **personne ne
  l'avait jamais reçu** : ni un appareil de la maison, ni une suite du banc, qui
  force toujours `rr` et ne range donc aucun palier. La v290 a rendu la grandeur
  juste — c'était la bonne correction — et a livré cette ligne pour la première
  fois. L'iPhone de Max est passé de `bas` à `haut` en une version : 289 morceaux
  chargés → 1 089, et la couche HD allumée d'un coup. **Avant de corriger une
  mesure qui débloque un chemin, on se demande si ce chemin a déjà servi**, et
  `git log -S` sur la valeur le dit en dix secondes.
- **ET LA GARANTIE DE LA v284 NE COUVRAIT QU'UN PALIER SUR TROIS.** Elle
  écrivait : « tant qu'il n'y a pas de mesure, rien ne change — le palier `moyen`
  porte EXACTEMENT les valeurs de la v283, si bien qu'un appareil mal classé ou
  non mesuré ne perd rien ». C'est vrai, et cela ne dit RIEN de `haut`. Une
  phrase de sûreté se lit en cherchant ce qu'elle ne couvre pas.
- **UN CHIFFRE QUE LE DÉPÔT A MESURÉ COMME NUISIBLE NE REVIENT PAS SUR UN
  RAISONNEMENT.** La file de seize est le chiffre que la v269 a mesuré comme
  impraticable sur l'iPad — cadence 9,1 contre 18,3, pire image 383 ms contre
  150, 3,1 % d'images au-delà de trois cents millisecondes, « les gels de Max » —
  et RETIRÉ. La v284 l'a remise en écrivant « sur un appareil qui a la réserve,
  il n'y a pas de raison de le lui refuser ». C'est une phrase, rien ne l'a
  mesurée, et le commentaire DÉCLARAIT qu'il réintroduisait une valeur retirée.
  `VITESSE_JET.haut = 160` était le même cas. Les deux sont revenues à huit et
  120, et `palier.js` porte la mesure de la v269 en commentaire pour que personne
  ne les remonte sur une intuition.
- **LA RÈGLE QUI EN SORT, ET ELLE VAUT AU-DELÀ DU PALIER : un classement
  automatique ne propose que ce qu'on a déjà fait tourner.** `surChoixSeulement`
  vit DANS la fiche du palier, à côté de `rr`, `file` et `hd` — même discipline
  que `montable`, `nourrissable` et `vole`. `palierRetenu` refuse alors de
  l'appliquer sur une MESURE et rend `null`, c'est-à-dire la v283 au bit près :
  **la correction atteint l'appareil de Max sans qu'il touche à rien**, et sans
  changer de clé de rangement, parce que ce n'est pas la règle qui a changé de
  sens mais son APPLICATION qui est refusée. Le jour où `haut` sera mesuré sur un
  vrai appareil, le drapeau tombe, avec la mesure en commentaire.
- **ET UNE MESURE QU'ON N'APPLIQUE PAS SE DIT.** Taire le verdict dirait à Max
  « le jeu mesure ta tablette » alors qu'il l'a mesurée et n'en fait rien.
  `palierPropose` le nomme, `?diag=1` l'affiche (« sans palier — haut mesuré,
  jamais donné d'office ») et l'aide des Réglages l'offre (« ta tablette pourrait
  aller jusqu'à Loin, que le jeu ne donne pas tout seul »). C'est la v290 par
  l'autre bout : **la mesure ne décide plus, elle propose** — décision de Max — et
  un réglage automatique doit garder sa porte de sortie.
- **ET LA PORTE DE SECOURS REPOISONNAIT LE LANCEMENT SUIVANT.** `?palier=` ne
  figurait pas dans `CONFIG_FORCEE` : la seule adresse qui rendait le jeu à
  Marlon pendant la panne RANGEAIT son verdict, sous une configuration imposée —
  la règle de la v284, écrite trois paragraphes au-dessus dans le même fichier,
  enfreinte par le fichier qui la lit. La liste est passée dans `palier.js`, à
  côté de la règle qu'elle sert (`PARAMS_FORCANTS`), pour qu'un témoin la lise ;
  et c'est un témoin de TABLE, plus faible qu'un témoin de trajet, parce que le
  banc met TOUJOURS `rr=` dans son adresse et qu'aucune de ses pages ne peut
  isoler ce paramètre. On le déclare au lieu de le cacher.
- **ET J'AI REPOINTÉ UN TÉMOIN ET PAS SON JUMEAU — le portail a rendu rouge une
  correction juste.** Deux témoins de `maj.js` portaient les chiffres du palier
  `haut` : celui de la ligne 770 (`?palier=haut` forcé par l'adresse) et celui de
  la ligne 1037 (« Loin » choisi dans les Réglages, page relancée). J'ai corrigé
  le premier et oublié le second, qui exigeait encore `file === 16 && jet === 160`.
  C'est « quand une panne touche une grammaire partagée, on cherche TOUTES ses
  occurrences le jour même » — la leçon du verre dans les murs — **appliquée à mes
  propres barres de témoin**, et c'est la première fois que ce dépôt la paie de
  ce côté-là. Le geste prend dix secondes et il est mécanique : quand on change un
  chiffre d'une table que des témoins lisent, on cherche le CHIFFRE dans
  `tests/` avant de lancer le portail (`grep -n "=== 16\|=== 160" tests/*.js`),
  jamais le nom du témoin qu'on a en tête.
- **ET LE `grep` DANS `TASKS.md` A TRIÉ CINQ ROUGES EN DIX SECONDES.** Le portail
  en a rendu cinq ; deux étaient de moi (ci-dessus, et un titre de journal à sept
  mots pour une barre à six), et les TROIS autres étaient des dettes déjà
  déclarées avec leur double mesure — le fond de carte de `maj.js` (rouge sur cinq
  portails d'affilée), le délai de `manhattan.js:282` (démonté 3/3 des deux côtés
  en v269), le gel de `monte.js` à l'arrivée dans une ville (mesuré PIRE sur
  `origin/main`). La règle écrite en tête de cette section a donc servi le jour de
  sa livraison. **Et ce qui a tranché n'est même pas le rejeu : c'est une preuve
  STRUCTURELLE** — tout ce que la v291 change n'est lu que si `PALIER` n'est pas
  nul, et `PALIER` vaut `null` sur toute page du banc sauf une, parce que
  `?palier=` n'apparaît que dans `tests/maj.js` et que le banc ne range jamais de
  verdict. Quand on peut montrer qu'un chemin n'est pas atteint, on n'a pas besoin
  de mesurer qu'il n'a rien changé.
- **ET UNE BARRE DÉRIVÉE D'UNE CONFIGURATION QU'ON RETIRE SE REDÉRIVE.**
  `BARRE_MS_MORCEAU_HAUT` valait 25, calculé sur `rr 16 × v 160 ÷ file 16`. La
  file revenue à huit et la vitesse à 120, le même calcul rend 17. La recopier
  aurait laissé la règle décrire un palier qui n'existe plus. **C'est l'inverse du
  signe de la v290** — là aucun chiffre n'avait bougé parce que seule la GRANDEUR
  mentait ; ici c'est la configuration qui a bougé, donc les chiffres doivent
  suivre.
- **ET MA SONDE A MESURÉ LE BANC, PAS LA CONFIGURATION — elle l'a dit
  elle-même.** Je voulais le coût en OCTETS de `rr 16` (règle de la v236 : quand
  le banc ne peut pas subir la panne, on mesure la CAUSE et non l'effet). Elle a
  rendu **348 morceaux chargés sur 625 attendus, et 384 sur 1 089** : en rendu
  logiciel le banc rend une image par seconde et **ne remplit jamais son disque
  d'affichage**, quelle que soit la borne d'attente. Le signe était dans les
  nombres — 384 ≈ 348 quand les cibles valent 625 et 1 089 — et c'est la
  quatrième fois de la session qu'un instrument me trompe. Ce qu'elle a mesuré de
  vrai, parce que reproductible en ordre alterné : la portée HD 6 rend **2,6 fois
  les triangles** de la portée 3 (4,93 et 4,95 millions contre 1,87 et 1,93), à
  nombre d'appels de dessin inchangé. **Une sonde dont la grandeur dépend du
  remplissage d'un disque de morceaux ne mesure rien au banc** ; cette
  mesure-là se prend sur la tablette, `?diag=1`, et c'est une dette déclarée.
- **ET LA MÊME BARRE FAUSSE A PROBABLEMENT PRIVÉ LA FAMILLE DE TROIS
  LIVRAISONS.** En cherchant à quoi la v291 rend l'iPhone, j'ai calculé ce que la
  règle de la v284 rendait sur un appareil à 59 images par seconde : période
  17,0 ms, barre basse 16,7 → **`bas`**, c'est-à-dire `rr 8 · file 6 · hd 0`.
  L'iPad de Max l'affichait noir sur blanc (« → bas au prochain lancement »), et
  son iPhone tombait dans le même cas. Or **`hd 0` éteint la couche HD**. Les
  v287, v288 et v289 — le relief de Paris, les quartiers, les toits à la
  Mansart — ont donc toutes trois été livrées à des appareils où elles ne
  pouvaient pas s'afficher, et ce que Max validait était mes captures de banc,
  jamais son écran. **Une régression de RÉGLAGE ne se voit nulle part** : le
  portail est vert, le code est juste, la fonctionnalité est là, et elle
  n'atteint personne. C'est « ce qu'un témoin ne garde pas, personne ne le
  garde » (v278) appliqué non pas à du code mais à la CONFIGURATION dans
  laquelle il tourne — et le geste qui l'attrape est celui de la v285 : avant de
  livrer une fonctionnalité derrière un réglage, on calcule ce que le réglage
  vaut sur l'appareil de la famille.
- **ET CE QUE LA v291 REND À SON APPAREIL N'EST PAS CE QU'IL FAISAIT.** `null`
  vaut `rr 12 · file 8 · hd 3` sur un écran tactile : c'est la v283 et l'intention
  de la v287, mais son iPhone tournait à `rr 8 · hd 0` depuis la v284. La
  correction est donc un pas MOYEN (289 → 625 morceaux, HD allumée à la portée 3)
  là où la v290 en faisait un violent (289 → 1 089, portée 6). Ce pas-là n'a pas
  été éprouvé sur son appareil non plus, et **on le dit au lieu de le taire** :
  `?palier=bas` est l'échelon dont on SAIT qu'il tournait chez lui, et c'est celui
  qu'on propose en second si le premier ne tient pas. Un remède qui ne va pas plus
  loin que la panne (v245) ne veut pas dire un remède qu'on sait sûr : ici on
  connaît le point de départ, le point d'arrivée, et on nomme ce qui reste
  inconnu entre les deux.
- **ET `RAYON_HD` DÉCIDE DE CE QU'ON MONTRE, `world.hd` DE CE QU'ON FABRIQUE.**
  Trouvé en lisant le code pour préparer la sonde, et confirmé par elle : le
  nombre de morceaux porteurs de tampons HD est le MÊME aux portées 3 et 6
  (248/256 contre 236/238), parce que `world.hd` vaut 1 dès que la portée est non
  nulle et que `couvreHD` couvre tout le disque de Paris — `montrerLeDetail` ne
  fait que basculer `visible`. Un appareil au palier haut FABRIQUE le relief de
  cinq cents morceaux et en MONTRE cent soixante-neuf. Ce n'est pas la panne du
  jour, c'est une dette déclarée dans `TASKS.md`.

## Une dette déclarée sans mesure est LUE COMME UN FAIT (v291)

La v290 a déclaré trois rouges de portail dans `TASKS.md` avec leur double
mesure, comme la v195 l'exige. **L'un des trois était décrit de travers, et
l'erreur était plus grave qu'un rouge de plus** : j'avais écrit que le témoin des
ombres de Manhattan rendait « `1.0000000000000002 > 1`, un défaut d'épsilon, à
corriger d'une ligne, qui ne dépend d'aucune cadence et rougira toujours ». Le
témoin compare à **0,9999** — cette valeur-là PASSE. Les trois affirmations
étaient fausses, et la dernière était l'inverse de la vérité. Quatre règles.

- **UNE DETTE EST UNE MESURE OU ELLE N'EST RIEN.** « Une explication commode
  qu'on ne mesure pas est une dette, pas un diagnostic » (v220) dit ce qu'il ne
  faut pas faire d'une explication ; ceci dit ce qu'il ne faut pas faire d'une
  DETTE. Une dette est écrite pour être reprise plus tard, par quelqu'un qui ne
  reverra pas le rouge : elle sera lue comme un fait établi, et un « à corriger
  d'une ligne » envoie droit sur la mauvaise ligne. Ce qui distingue les deux se
  vérifie en dix secondes — on relit la BARRE du témoin avant d'expliquer son
  rouge.
- **UN TÉMOIN DE CIEL ATTEND QUE LE CIEL AIT TOURNÉ.** Les deux témoins fautifs
  posaient l'heure puis dormaient 100 et 350 ms. Manhattan rend 0,4 image par
  seconde sur ce banc (v259) et une heure posée ne prend effet qu'à l'image
  suivante : mesuré à la sonde, le ciel met **755 à 1 947 ms** à tourner. Ils
  lisaient donc l'heure d'AVANT — la lune sous l'horizon, opacité 0, alignement
  −1 pour une barre de +0,9999, et la direction de la lampe IDENTIQUE aux deux
  heures. On attend le FAIT DU MONDE (le soleil du bon côté de l'horizon),
  jamais le verdict (v290), borné, la durée dans le message (v270).
- **UN SEUL DÉFAUT, DEUX ROUGES — et je les avais comptés comme deux causes.**
  Le témoin voisin (« fenêtres et éclairage public fonctionnent la nuit ») posait
  `0.75` et dormait 350 ms : même geste, même page, même cause. Deux rouges qui
  suivent le même `__setDayTime` ne sont pas deux indépendants, et c'est la
  leçon de la v285 par l'autre bout (« le second verdict DÉPEND du premier »).
- **ET J'AI ACCUSÉ MA PROPRE CORRECTION SANS L'AVOIR MESURÉ — dans la livraison
  qui corrige exactement cette faute.** `manhattan.js` est morte à la ligne 450 :
  `waitFor({ state: 'visible' })` sur `#ride-btn`, qui annonçait « 🐴 Monter »
  puis se cachait — **NEUF témoins jamais atteints**, dont les deux du hors
  ligne. Rejouée SEULE sur `origin/main`, la suite allait jusqu'au bout (trente
  témoins, cinq rouges), et j'ai conclu : c'est moi, mes deux attentes ajoutent
  sept secondes de jeu, donc cinq bêtes (cadence en TEMPS RÉEL, v226), et une
  bête à moins de huit blocs passe avant la voiture (v257). **L'histoire se
  lisait très bien, et `TASKS.md` portait déjà sa réfutation** : au portail de la
  v279, ce plantage-là s'est produit SUR `origin/main`, décrit mot pour mot
  (« la suite meurt là, `#ride-btn` caché »). C'est une INTERMITTENCE vue des
  deux côtés, et la v269 dit quoi faire — rejouer jusqu'à voir la même
  DISTRIBUTION — ce qu'UN passage de chaque côté ne donne pas. Trois règles.
  - **AVANT D'EXPLIQUER UN ROUGE, ON LIT CE QUE LE DÉPÔT A DÉJÀ MESURÉ.**
    `grep -n "<le nom du témoin>" TASKS.md` prend dix secondes et m'aurait évité
    d'écrire une cause dans un commit. La double mesure de la v195 est une
    condition NÉCESSAIRE, pas suffisante : elle ne distingue pas une régression
    d'une intermittence, et c'est le fichier des dettes qui garde cette
    mémoire-là.
  - **MAIS LE REMÈDE TIENT SANS LA CAUSE, et c'est pour cela qu'il reste.** Le
    témoin invoquait sa voiture sans faire le vide — l'idiome que la v284 avait
    établi pour exactement ce bouton (« on descend, on RETIRE les bêtes, PUIS on
    invoque ») n'avait jamais été appliqué ici. Un témoin qui ne se place pas
    lui-même dépend de ce qui traîne autour (v279), que la cause du jour soit la
    durée du voisin ou le hasard des naissances.
  - **ET UNE ATTENTE QUI JETTE EST PIRE QU'UN ROUGE.** « Un témoin doit échouer
    PROPREMENT sur l'ancien code, pas s'effondrer » était écrit pour l'ANCIEN
    code ; il vaut pour le neuf, et le prix est ici de neuf verdicts qu'on ne
    voit plus — deux portails de suite, v279 et v291, ont perdu la fin de cette
    suite pour cette seule ligne. Toute attente dont l'échec est un verdict se
    catche et REND un verdict, la durée et ce qu'on a vu dans le message.
- **ET LE CHIFFRE D'AVANT D'UN TÉMOIN QUI VARIE LE DÉMONTE TOUT SEUL.** « Le
  trou enlève aussi la géométrie visible de la façade » est rouge des deux côtés,
  et son premier nombre vaut **22 326 sur `origin/main` contre 11 684 sur la
  branche** pour un même second nombre (51 734). Il compte la géométrie de TOUS
  les immeubles : il confond donc « le trou en a retiré » avec « d'autres
  immeubles sont arrivés », et ce qu'il mesure dépend de ce que la file a eu le
  temps d'installer. La grandeur juste est la géométrie de l'immeuble QUI A PERDU
  un bloc — dette déclarée dans `TASKS.md`, avec ces deux chiffres, parce qu'un
  témoin qui rend un seul nombre pour deux choses ne se démonte pas (v223).
- **ET LA SONDE A TRANCHÉ EN UNE EXÉCUTION, LÀ OÙ TROIS RELECTURES N'AVAIENT
  RIEN VU.** Un même rouge cachait trois causes possibles — groupe du ciel
  introuvable, astre introuvable dans le groupe (donc 0), direction vraiment de
  travers — parce que le témoin ne publiait qu'un tableau de deux nombres.
  `sonde-ombres-ny.cjs` imprime les trois, trois fois de suite : certitude, pas
  tirage. C'est « devant un rouge qu'on n'explique pas du premier coup, on écrit
  la sonde qui distingue les cas » (v223), et cette fois le rouge était sur un
  code de PRODUCTION qu'aucune livraison n'avait touché.


## Les dix-huit voitures déposées (v566) — un paquet se mesure, il ne se lit pas

Max a déposé dix-huit paquets Sketchfab de facture différente.
`scripts/convertir-flotte.mjs` les met tous au contrat avec une fiche par
voiture (`VOITURES`). Cinq règles.

- **LES ROUES SE TROUVENT PAR LEUR GÉOMÉTRIE, JAMAIS PAR LEUR NOM.** Les
  noms des paquets sont muets (« Material_2125767099 », « wire_087224198 ») :
  chaque maillage est découpé en pièces connexes, et une pièce de roue est un
  disque vertical, bas, sur un côté. Le pneu de référence est la plus grande
  du quadrant ; on accroche ce qui tient dans son disque, les étriers restent
  fixes. Seuls les pivots s'appellent `Wheel_*` (v562).
- **LE NEZ SE RELÈVE SUR UNE VUE, ET LA VUE SE RECHARGE SANS CACHE.** Le
  signe `avant` de chaque fiche a été relevé sur les vues de contrôle
  (quatre angles, puis la roue avant gauche de près, roues tournées de 60°) ;
  deux paquets sur dix-huit étaient à l'envers. Et une vue rechargée depuis
  un serveur local sans `?t=` montrait l'ANCIEN fichier : trois fiches ont
  semblé fausses, corrigées, et rien n'avait changé à l'écran.
- **UN PAQUET « À PLAT » SE SOUDE AVANT DE SE SIMPLIFIER.** Beaucoup de
  paquets donnent à chaque triangle ses propres sommets : meshoptimizer n'y
  voit que des bords et ne simplifie rien (le Hummer restait à 210 000
  triangles pour un budget de 100 000). On soude sur la position et les UV
  (normales retirées), on simplifie, puis on refait des normales à arêtes
  vives (30°). Le budget se mesure après coup, et l'on resserre s'il n'est
  pas tenu.
- **UN MATÉRIAU DÉPOSÉ TOMBE DANS LES SIGNATURES DÉJÀ CHAUFFÉES (v246).** Les
  paquets sont presque tous en double face : la laque devient vernie
  (`Physical+cc`, les deux variantes de face existent), une transparence
  texturée passe en double face, un masque en simple face. On compte les
  signatures des fichiers produits (`signaturesDuGlb`) : aucune neuve.
- **UN BLOC OPTIQUE NOMMÉ PEUT TOMBER HORS DE SON COIN.** La rampe lumineuse
  du Hummer est sur le capot, à 69 % de la hauteur : la sonde de la flotte
  (`sonde-feux-flotte.mjs`, lue par `degats.js`) l'a refusée. La fiche porte
  `sansFeuxNommes` : les matériaux sont débaptisés et le jeu pose les feux
  par la boîte et le rayon (v519). Un paquet neuf se passe à cette sonde
  avant d'entrer.

La Model Y porte `usine: true` dans FLOTTE : la chaîne (`voitureDeLUsine`,
vehicules.js) et le garagiste de main.js la lisent, jamais un nom recopié.
Les voitures de police sont toute fiche `police` de FLOTTE ; la patrouille
les alterne, la Crown Victoria d'abord, et n'attend qu'elle pour apparaître.

## Les avions déposés (v563) — un modèle d'artiste se met au contrat, le contrat ne bouge pas

Max a déposé un A320, un A321 et un F-35 (Sketchfab), puis un jet d'affaires
(v568). Ils deviennent l'avion de ligne et le chasseur ; le Concorde reste
sculpté. Six règles.

- **LE MODÈLE SE CONVERTIT HORS LIGNE, PAR UN SCRIPT QUI SE REJOUE.**
  `scripts/convertir-avions.py` cuit les transformations, retourne le nez vers
  −z, met à la LONGUEUR de `GABARITS_AVION` (postes, pistes et prolongements
  sont dimensionnés dessus : rien ne bouge au sol), pose les roues à y = 0,
  fusionne par matériau, sépare en nœuds ce qui bouge (`train_nez`,
  `train_gauche`, `train_droit`, `verriere`), simplifie les matériaux (aucune
  extension) et IMPRIME ses mesures (tuyères, essieu). Une règle de pièce lit
  la LIGNÉE des nœuds (les maillages sont des enfants anonymes) ; un
  enroulement contredit par les normales se retourne. Ce qu'on retire de
  l'archive (yeux, pièces de travers, halos) est nommé dans le script ET dans
  `vendor/avions/LICENSE.md`, avec le crédit exact.
- **CE QUI EST FONCTION RESTE À L'ATELIER, ET LA FICHE LE DIT.**
  `AVIONS_GLB` (avions.js) : `trainAtelier` (l'A320 n'a pas de train),
  `panneau` et `porte` (la porte d'un avion déposé est DESSINÉE sur la livrée :
  le panneau qui pivote n'apparaît qu'ouvert, `cachee`, avec sa baie), les
  `tuyeres` mesurées par le script, `trainPrincipal`. `depuisModele` rend le
  même contrat que l'atelier (`membres`, `train`, `porte`, `tuyeres`,
  `feuxNav`) : fun.js et embarquement.js ne savent pas d'où vient l'avion.
- **LA VARIANTE EST UNE RÈGLE, JAMAIS UN TIRAGE, ET ELLE VOYAGE.**
  le rang du poste dans la rangée (`RANGEE_CIVILE`, aeroport.js, v565 ; le
  jet y entre en v568) ; `p.v.f` porte la
  variante comme le modèle d'une voiture (v253). Un avion né avant l'arrivée
  de son fichier reste sculpté pour sa vie (v547) ; `?avions=0` rejoue les
  sculptés.
- **UN TÉMOIN DE DIMENSION NOMME LE MODÈLE QU'IL MESURE.** `MODELES_AVION`
  rend le déposé si son fichier est arrivé, le sculpté sinon : appelé tel
  quel, le témoin des dessins de `carteMonde.js` aurait mesuré l'un ou
  l'autre selon l'heure — un tirage. Il mesure le sculpté et chaque variante,
  fichiers attendus ; le sculpté garde l'égalité d'envergure (v278), un
  déposé doit tenir DANS le gabarit de son espèce.
- **UN DÉPOSÉ PEUT ÊTRE PLUS COURT QUE SON GABARIT, ET IL LE DÉCLARE (v568).**
  Le jet d'affaires est une variante de l'avion de ligne à 13 blocs, pas 16 :
  la proportion d'un G650 à côté d'un A320. Sa fiche porte `long` (le témoin
  des dimensions le mesure contre elle) et ses `sieges`, qui remplacent ceux
  de l'espèce pour CET appareil : la bête prend une fiche à elle
  (animals.js), et la copie d'un ami aussi (main.js). Une archive dont le
  nœud porte une rotation de présentation se convertit depuis ce nœud
  (`depart` du convertisseur), jamais en devinant des axes sur la scène.
- **UN SIÈGE SE MESURE SUR LE MODÈLE QUI L'ENTOURE.** Le siège du chasseur
  (z −0,9) tombait derrière la verrière du F-35 : il est à −2,7, sous elle.
  Les sièges de l'avion de ligne valent pour l'A320, l'A321 et le sculpté
  (mesurés au rayon sur les trois). Toute variante neuve se rejoue par
  `sonde-embarquement-deposes.cjs` (on monte, on descend, zéro clé neuve).

## La police et la moto (v562) — une poursuite suit la piste de l'enfant, et un contrôle se range là où la caméra regarde

Max : « dès lors que tu fais une bêtise, un accident, que tu fonces dans
quelqu'un… la police ; et la moto ». `src/police.js` (pur : points, étoiles,
oubli, piste, poursuite, phrases), `src/patrouille.js` (ce qui se voit et
s'entend), `src/moto.js` (le modèle, ses éclats). Les modèles sont ceux de Max
(CC-BY-4.0, crédits dans `vendor/*/LICENSE.md`), convertis par
`scripts/convertir-police.mjs`. Sept règles.

- **UNE BÊTISE SE LIT SUR CE QUE LA PHYSIQUE PUBLIE, JAMAIS SUR UN GESTE.**
  `player.choc` neuf (contre une voiture, un mur assez fort, la police elle-même),
  `player.freinePieton` qui s'allume à vive allure (forcer un passant à
  s'écarter), `statsCasse.n` (le mobilier, v536). Rien n'est jamais violent :
  personne n'est touché, la police ne pousse pas, elle suit et elle parle.
- **LA POLICE SUIT LA PISTE DE L'ENFANT, ELLE NE CHERCHE PAS UN CHEMIN.** La
  `Piste` enregistre où la voiture de l'enfant est passée (un point tous les
  1,5 bloc) ; une unité est MENÉE le long d'elle (`menee`, posée à la main,
  `animals.js` ne la fait pas vivre) à `vitessePoursuite`, qui freine à la
  distance d'arrêt et ne passe jamais sous `ECART × PLANCHER`. Là où l'enfant
  est passé, une voiture passe : aucune recherche de chemin, aucun mur
  traversé. Un saut (téléportation, carte) remet tout à zéro.
- **LE CONTRÔLE SE RANGE DEVANT : DERRIÈRE, LA CAMÉRA NE VOIT RIEN.** À l'arrêt
  la police était à sept blocs derrière une caméra de poursuite à 6,4 : elle
  n'existait pas pour l'enfant (vu en capture). Elle double par la gauche sur
  une courbe à deux poignées — au plus près ~3,3 blocs du centre, deux
  demi-largeurs et un bloc (une seule poignée passait à 1,6 et frôlait la
  portière) — et se gare huit blocs devant, si aucun bloc plein ne barre
  l'emprise ; sinon elle reste derrière. Le refus se dit (`etat().controle.refus`).
- **UN VÉHICULE DE SERVICE N'EST PAS DANS LA RUE.** `horsRue: true` dans la
  fiche de FLOTTE : `choixFlotte` et le tirage des voitures neuves l'écartent.
  Une unité en service (`enService`) ne se monte pas et ne se retire pas à
  distance ; garée après le contrôle, elle est une voiture comme une autre.
- **CE QUI EST UNE MOTO SE DIT DANS LA FICHE** (`selle`, `penche`, `pose`,
  `moteur: 'moto'`, la classe `moto` de `conduite.js`), jamais dans une liste de
  `fun.js` : on l'enfourche sans séquence de portière, on en descend d'un pas
  de côté, l'avatar est à califourchon, et elle se couche VERS L'INTÉRIEUR
  (`atan(lat/g)`, le signe inverse du roulis d'une voiture). Un signe se lit
  dans la matrice, image par image : mesuré au minuteur, deux relevés
  tombaient dans la même image et le verdict valait 11 contre 13 ; image par
  image, 23 contre 0, et 0 contre 22 le signe inversé.
- **SEULS LES PIVOTS S'APPELLENT `Wheel_*`.** Le jeu fait tourner tout nœud
  dont le nom commence par `Wheel_` : un pneu nommé `Wheel_FL_Tire` sous le
  pivot `Wheel_FL` tournait deux fois. Les enfants s'appellent `Pneu_`, `Roue_`.
- **UNE VOIX DE TÉMOIN SE REMPLACE PAR `defineProperty`.** `window.speechSynthesis`
  est un accesseur : l'affecter ne fait rien, et le témoin ne lisait aucune
  phrase. Le témoin lit ce que le jeu a demandé de dire (l'appel, puis la cause
  et « Bonne route »), la sirène dans SA bande (1 100–1 450 Hz) sur la sortie.

Ce qui reste, déclaré dans `TASKS.md` : la police est locale à la tablette (un
ami ne la voit pas) ; la moto a la boîte de collision d'une voiture en longueur.

## La voiture tombe dans l'eau, et un véhicule ne s'enfonce plus dans un autre (v560)

Max : « il faut arrêter de mettre des messages d'erreur pour dire attention,
une voiture ne roule pas dans l'eau… s'il tombe dans l'eau, il tombe dans
l'eau… et il ne faut pas que les véhicules puissent passer les uns dans les
autres ». **Cette décision annule la v272** (l'eau, quatrième famille
d'obstacle, et son bandeau « fais demi-tour »). Sept règles.

- **L'EAU N'EST PLUS UN OBSTACLE, C'EST UN MILIEU.** Retirer l'arrêt seul
  remettait la panne d'avant la v272 : mesuré (`sonde-voiture-eau.cjs`, le vrai
  joueur sous node, un port fabriqué), la voiture traversait le bassin à seize
  blocs/s en roulant sur le fond. Dans l'eau la caisse freine (`TRAINEE_EAU`,
  player.js) ; la tête noyée, le moteur cale (`voitureDansLEau.noyee`, entre
  dans `inerte`) ; Espace, frein à main, ne la fait plus nager. Lancée à quinze
  blocs/s depuis un quai : elle vole par-dessus le bord, plonge, file quatre
  blocs, coule au fond. Un gué d'un bloc freine sans noyer : on en ressort.
- **L'ENFANT EN SORT ET REMONTE, SANS UN MOT.** `fun.js` (`updateRide`) :
  1,2 s RÉELLE après que le moteur a calé, l'enfant quitte la voiture au-dessus
  du toit, et `player.remonter` (une échéance en temps réel) le fait nager vers
  la surface et s'y tenir le temps de rejoindre la rive. La voiture reste au
  fond, `noyee` et `horsService` (degats3d.js le garde : sa ligne qui recalcule
  `horsService` connaît `noyee`). Le texte « ne roule pas dans l'eau » est
  interdit par la fumée, comme une fonctionnalité retirée (v505).
- **`eauSousLaVoiture` RESTE DANS LE MONDE** : la sonde des ponts (v430) la lit
  pour prouver qu'un tablier porte la voiture ; le jeu ne s'en sert plus.
- **« PAS SI L'ON EST DÉJÀ DEDANS » SE JUGE PAR VÉHICULE ET PAR ENFONCEMENT.**
  `obstacleVehicule` testait la FAMILLE (`obstacleDevant(nouveau) &&
  !obstacleDevant(ancien)`) : collée à une voiture, la nôtre ne voyait plus
  AUCUNE voiture. `sEnfonce` (conduite.js, pur) refuse un pas qui fait entrer
  dans un véhicule OU qui s'y enfonce plus (profondeur de séparation d'axes) ;
  reculer ou longer reste permis — on n'est jamais coincé. `obstacleDevant` et
  `voitureContre` (vehicules.js) prennent la pose d'avant et rendent la voiture
  qui bloque, pas la première touchée ; `gareeContre` (main.js) de même. Toute
  famille d'obstacle à venir se juge ainsi.
- **UNE VOITURE DE LA RUE OU UNE RAME DÉJÀ DANS UNE VOITURE S'ARRÊTE.** La
  v245 la laissait continuer « pour en sortir » : vrai d'un enfant à pied,
  faux d'une voiture, qu'elle traversait de part en part. Contre l'enfant ou un
  ami AU VOLANT (`estUnVehicule`), la voiture de la rue ne saute plus le
  contact (elle s'arrête, légitime, comme heurtée, v372) et la rame se pose en
  `bloque` (arrêt local, v304). À pied, la règle d'avant. L'horloge partagée
  ne bouge pas (v305) : rien n'est poussé.
- **ON MESURE LA SITUATION, PAS UN TIRAGE.** `sonde-traverse-vehicules.cjs`
  (isolée) roule dans Paris en cherchant le contact et mesure les
  recouvrements par paire ; la rue y est un tirage (un à trois chocs en
  quarante secondes). Les témoins provoquent : `monte.js` gare une voiture
  flanc contre flanc et une autre devant, `plafond.js` juge `sEnfonce` pur.
- **UN TÉMOIN DE CONDUITE SE POSE AU SEC, ET RESTE SUR SA DALLE.** Tant que
  l'eau ne faisait rien à une voiture, trois témoins roulaient sans le savoir
  dans la mer ou à son bord : une dalle posée trois blocs au-dessus d'un relief
  SOUS l'eau (l'allure citadine/hypercar, 6,9 pour 15,7), une voiture qui
  filait au-delà du bout de la dalle GTA, une autre qui sortait en roue libre
  de l'aire des sensations. Elles coulaient, l'enfant sortait, et les témoins
  suivants se jouaient À PIED — quatre rouges pour une cause. C'est la v380
  (« un couloir vide se vérifie au sec ») et la v279 (une correction du jeu
  rend visible une hypothèse de banc) : une dalle de témoin se pose à
  `WATER_LEVEL` au moins, et va au-delà de ce qu'on y roule ; une voiture qu'on
  ne mesure plus s'arrête tout de suite.

## Passager dans l'avion d'un ami (v552) — un siège se déclare dans la fiche, et le reste suit

Max : « rentrer dans une voiture, avion… en passager si un autre joueur est
déjà conducteur ». Quatre règles.

- **CE QUI ACCUEILLE UN PASSAGER PORTE `sieges` DANS SA FICHE, ET C'EST
  TOUT.** Le bouton (`vehiculeAmiProche`), l'assise du passager chez les deux
  tablettes (`asseoir`, `vehiculeDuConducteur`, main.js) et la position réseau
  (`p.p`, sur `pos` et `rpos`) lisaient déjà `def.sieges` : ajouter les sièges
  des trois avions a suffi pour que l'ami soit assis dans la cabine, vu en
  direct et par l'hôte. Un siège se MESURE sur le modèle (axe et rayon du
  fuselage, avions.js) : en cabine, jamais au poste de pilotage.
- **LA SÉQUENCE DU PILOTE SE REJOUE SUR L'APPAREIL DISTANT.** `monterAvionChez`
  et `descendreAvionChez` (embarquement.js) prêtent l'appareil de l'ami comme
  une monture (`commeMonture`) à `monterAvion` / la descente par l'escalier
  (v389, v400), et `fin` fait de l'enfant un passager une fois entré. Ils
  suivent l'IDENTITÉ du pilote (v407) : un appareil refait reprend l'escalier,
  un autre modèle termine. Sans porte (le Concorde), on monte d'un coup ; la
  descente cherche alors une place autour (`sortieAvion` sans porte).
- **EN VOL, LE PASSAGER REGARDE, IL NE DESCEND PAS.** « En l'air » se lit sur
  le maillage que la tablette dessine (plus de 2,5 blocs au-dessus du sol de
  sa colonne, `enLair`), jamais sur un drapeau. Un avion en l'air ne se
  rejoint pas ; un appui pour descendre est refusé par un message qui dit quoi
  faire (`PERMIS` de fumee.js). La caméra du passager tourne autour de
  l'appareil selon son propre regard (`passagerEnAvion`, fun.js) ; le pilote
  garde les commandes.
- **UN TÉMOIN À TROIS TABLETTES LIT LES DEUX CHEMINS EN UN SCÉNARIO.** Deux
  invitées (Nina pilote, Alice passagère) se voient par l'hôte : chez Nina,
  l'assise d'Alice passe par `rpos` ; chez l'hôte, par `pos` (v406). Le pilote
  est posé à la main (`update` suspendu), sinon sa physique le ramène au sol
  pendant la mesure.

## La SF90 XX Stradale (v561) — un paquet Sketchfab passe par un script, et ses matériaux par la table des programmes

Max a fourni le paquet glTF de Ddiaz Design (CC-BY-4.0). Trois règles.

- **UN PAQUET QUI NE TIENT PAS LE MANIFESTE SE CUIT HORS LIGNE, PAR UN SCRIPT
  REPRODUCTIBLE.** 1 097 maillages (autant d'appels de dessin) et les 648
  pièces des QUATRE roues sous un seul nœud nommé « Front_L » :
  `normaliserVoiture` ne peut pas en faire quatre roues, elle lit les noms.
  `scripts/ferrari-sf90-xx.py` cuit les transformations, pose au manifeste
  (échelle sur l'empattement réel, nez vers +Z déduit du moteur central
  arrière), répartit les pièces de roue par QUADRANT, découpe le volant de
  l'habitacle par composantes connexes dans une boîte mesurée, fusionne par
  matériau et compacte sans perte. Il refait le fichier au bit près ; les
  empreintes du paquet sont dans `docs/sf90-xx/`. Le prochain paquet du même
  genre se cuit ainsi, jamais à la main dans un éditeur.
- **UN MATÉRIAU DÉPOSÉ RETOMBE SUR UN PROGRAMME DÉJÀ CHAUFFÉ, OU IL SE
  DÉCLARE.** Ce qui crée une signature (v246) sans rien montrer part au
  script : couleurs de sommets (le visualiseur de Sketchfab ne les montre pas
  par défaut, leur alpha valait zéro), tangentes, second jeu d'UV, spéculaire
  constant. La transmission (une passe de rendu de plus par image) devient une
  transparence simple ; une carte métal/rugosité, sa moyenne. Il ne reste
  qu'UNE signature neuve (`Standard+map+nrm+DS`), déclarée dans
  `signatures.js`. On compte les signatures du fichier de sortie
  (`signaturesDuGlb`) avant de le livrer.
- **UN BRAS « AVANT » SE CHOISIT DANS L'ADRESSE.** Retirer `asset` de FLOTTE
  dans une page ouverte ne change rien si le prototype est déjà chargé : la
  première planche de la sonde montrait deux XX. `?asset=0` choisit le fichier
  d'avant dès le démarrage (`sonde-captures-sf90.cjs`, et désormais celle de
  la Revuelto). Le prix se déclare : 262 651 triangles, 8,7 Mo, ≈ 6,3 Mo
  transférés, portières non séparées (`portiere: false`).

## Les amis rejoués entre deux relevés (v556) — une position reçue porte son heure d'envoi

Max : « tu le vois bouger de manière saccadée ». Trois règles.

- **UNE POSITION D'AMI SE DESSINE À UNE HEURE, PAS À LA DERNIÈRE ARRIVÉE.**
  `pos` porte `ts` (l'horloge de l'envoyeur) et, au volant ou en vol, `vx`/`vz`
  ; `fluidite.js` (pur) rejoue l'ami avec un retard réglé sur ce que le chemin
  impose — le 9e décile du délai d'un relevé PLUS l'écart au précédent, parce
  que par le nuage c'est l'écart qui compte — et interpole. Les horloges ne
  s'accordent pas : l'écart entre elles est le plus petit délai jamais vu, qui
  ne remonte jamais (un écart qui remonte ferait reculer l'ami). Le retard
  monte à mi-vitesse et redescend à 12 % : jamais de saut. Au-delà de
  `EXTRAPOLE_MAX` (500 ms : une page qui cale perd autant de relevés) sans relevé, l'ami attend. Tout en temps réel.
- **UN RELEVÉ EN RETARD SE RANGE À SA PLACE.** Par le nuage, deux écritures
  parties ensemble se publient dans le désordre (75 envoyés, une quarantaine
  reçus dans l'ordre en neuf secondes, mesuré) : on l'insère, on ne le jette
  pas. Une téléportation (plus de 60 blocs à plus de 300 b/s) remet le suivi
  à zéro et se pose d'un coup.
- **UNE FLUIDITÉ SE MESURE EN VITESSE APPARENTE, IMAGE PAR IMAGE.** Le
  conducteur roule en temps réel (position fonction de la montre, physique
  suspendue), l'autre page relève où l'ami est DESSINÉ à chaque image, et l'on
  compte la part des images à la vraie vitesse (`sonde-amis-fluides.cjs`, lue
  par `reseau.js`). Un pire saut seul mesure les hoquets du banc ; une page
  qui vient d'entrer ne rend parfois pas une image en dix secondes, et l'on
  attend qu'elle rende avant de mesurer. Un témoin de fluidité rend la place
  telle qu'il l'a trouvée (position et cap du conducteur).

## La MC12 GT1 Red Bull (v559) — un export Sketchfab se découpe au convertisseur, et un nom de matériau est une donnée

Max a déposé un paquet glTF Sketchfab (Dave Love, CC-BY-4.0). `scripts/convertir-mc12.py`
le met au contrat (le paquet n'est pas versionné, le script se rejoue dessus).
Trois règles.

- **DES ROUES FUSIONNÉES PAR MATÉRIAU SE DÉCOUPENT AU CONVERTISSEUR, PAR LA
  POSITION DE LEURS TRIANGLES.** `normaliserVoiture` regroupe des MAILLAGES par
  leur nom ; elle ne peut rien pour un pneu qui porte les quatre roues dans une
  seule primitive. Le script coupe par quadrant (signe de x, axe des roues),
  pose le pivot au centre de SON pneu et livre un fichier au manifeste — que
  `normaliserVoiture` laisse alors intact (`forme: 'manifeste'`). Le volant se
  prend par PIÈCES ENTIÈRES (composantes connexes dont la boîte tient dans la
  sienne) : une boîte par triangles a d'abord attrapé le combiné Motec de la
  planche, vu en rendu marqué, pas au témoin.
- **FUSIONNER DES MATÉRIAUX IDENTIQUES PERD LEUR NOM, ET LES FEUX LISENT LE
  NOM.** Feu arrière, catadioptre et verre ambré avaient le même JSON ;
  fusionnés, ils prenaient le nom du premier et la boîte des deux bouts de la
  voiture — `posesDetresse`, `posesPhares` et les dégâts (`RE_FEU`,
  `RE_PHARE`, `RE_PHARE_AR`) les rangent par nom et par boîte. Feux, vitrages,
  rétroviseurs et laque gardent leur matériau.
- **UNE IMAGE UNIE EST UN FACTEUR, ET UNE LIVRÉE EST UNE LAQUE QU'ON NE
  REPEINT PAS.** Une texture dont tous les pixels sont égaux devient
  `baseColorFactor` (sRGB → linéaire) : sans perte, une texture de moins, et la
  signature du vitrage redevient une signature que la flotte compile déjà.
  Une voiture dont les couleurs sont l'identité porte `laque: 'jamais'`, et sa
  laque ne s'appelle pas `body` (que `EST_LAQUE` repeindrait) : `Paint_RedBull`.

## La Revuelto adaptée (v546) — un identifiant de flotte ne change pas, son fichier oui

Max a fourni une adaptation CC-BY-4.0 (BRO) de la Revuelto. Trois règles.

- **`fichier` EST UN IDENTIFIANT, `asset` EST UNE URL.** Les garages, le
  réseau (`p.v`) et `chargementsFlotte` rangent une voiture par `fichier` ;
  remplacer le modèle sous le même nom laisserait l'ancien dans
  `STATIC_CACHE` pour toujours (il ne se revalide pas). Le champ `asset` de
  FLOTTE choisit le fichier chargé (`asset || fichier`), l'URL neuve se
  télécharge à la première rencontre, et l'ancien fichier reste sur le disque
  (retour arrière d'une ligne). Même mécanisme, même nom et même endroit que
  la 911 reconstruite (v545), lu par `fichierCharge`.
- **UN MODÈLE SOUS LICENCE PORTE SON CRÉDIT DANS `vendor/voitures/LICENSE.md`**,
  le texte exact de son `ATTRIBUTION.txt` et la liste des modifications. Le jeu
  n'a pas d'écran de crédits : si un jour il en a un, ces modèles y entrent.
- **UN MODÈLE D'UNE AUTRE FACTURE SE MESURE CONTRE CELUI QU'IL REMPLACE**,
  même page, ordre alterné (`sonde-revuelto.cjs`), et se juge en jeu côte à
  côte (`sonde-captures-revuelto.cjs`), jamais sur les rendus de studio du
  paquet. Ce qui se transpose à la tablette : octets, mémoire de textures,
  maillages (appels de dessin), programmes nés (zéro) ; la cadence du banc est
  celle de SwiftShader. Portières non séparées → `portiere: false` (v366).

## La 911 reconstruite (v545) — un fichier neuf a une URL neuve, et « léger » se dit en quoi

Max a fait reconstruire la 911 GT3 RS et en a approuvé le rendu ; il a choisi
d'essayer le modèle lourd tel quel, puis une version « allégée ». **Avant toute
nouvelle voiture ou refonte, on lit `docs/standard-creation-voitures.md`** (le
standard qu'il a demandé, la 911 v2 en référence visuelle). Quatre règles.

- **`fichier` EST L'IDENTIFIANT, `asset` LE FICHIER CHARGÉ.** Garages, réseau
  et couleur de la rue retiennent `fichier` ; on ne le renomme jamais. Une
  géométrie neuve prend une URL neuve (`asset`, lu par `fichierCharge`,
  vehicules.js) : STATIC_CACHE ne retélécharge jamais une URL qu'il connaît
  (`isStaticAsset`, sw.js). L'ancien fichier reste dans le dépôt : une tablette
  encore sur l'ancienne version le demande.
- **« ALLÉGÉ » SE DIT EN QUOI : OCTETS, TRANSFERT OU TRIANGLES.** La version
  compacte (`scripts/optimiser-glb.py`) est sans perte — 40/40 primitives
  identiques au modèle approuvé, recalculé par un témoin — et passe de 11,6 à
  7,7 Mo sur le disque. Elle garde ses 362 868 triangles (8,4 fois l'ancienne
  911), donc le coût de DESSIN ne bouge pas. Et sans ses doublons elle se
  compresse MOINS bien au niveau Brotli que Vercel sert (≈ q4, déduit de
  l'ancienne 911 servie à 1,03 Mo) : ≈ 3,2 Mo transférés contre 2,7. Les
  `.br`/`.gz` précompressés du paquet ne sont pas livrés : le serveur ne les
  servirait pas sans en-têtes. Un chiffre de poids se donne avec son unité.
- **UN MODÈLE LOURD SE JUGE SUR LA TABLETTE, ET LE JEU DONNE LE MOYEN.**
  `?voiture=911` force ce modèle pour toute voiture neuve ET toute la rue (le
  pire cas), `?asset=0` rend le fichier d'avant, et `?diag=1` nomme au volant
  le modèle, le fichier chargé et ses triangles. Jamais un réglage du jeu. La
  sonde `sonde-911.cjs` compare les deux en ordre alterné ; ses millisecondes
  sont celles de SwiftShader (v247), ses triangles et ses octets, non.
- **LES TESTS D'UN PAQUET LIVRÉ DEVIENNENT DES TÉMOINS D'UNE SUITE.** Ceux de la
  911 tournaient sous `node --test` avec un chargeur à part : aucun portail ne
  les lançait. Ils vivent dans `tests/porsche-911.mjs`, appelé par `degats.js`
  (gardien de `vehicules.js` et `portieres.js`), et la table des gardiens les
  déclare avec le GLB. Un test qu'aucun portail ne lance ne garde rien.

## Les phares suivent le dessin du modèle (v569) — une lueur copie l'optique, elle ne plaque pas une forme

Max : « la vraie 911 a une barre lumineuse, et le jeu vient créer des phares
ronds par-dessus ». Mesuré avant une ligne : 50 modèles sur 77 portaient déjà
leur optique allumée, 19 autres une optique nommée. Quatre règles.

- **CE QUI S'ALLUME EST L'OPTIQUE DU MODÈLE, COPIÉE.** `optiquesPhares`
  (phares.js) choisit à l'avant ce qui émet déjà (rang 1), puis ce qui est
  nommé comme un feu avant (rang 2), puis le verre nommé d'une optique (rang
  3, seul ou en lueur douce à côté) ; elle copie leurs triangles à fleur
  (`DECALE`, le long de leur normale), par côté, une fois par modèle sur le
  prototype (v550), géométrie partagée. `matiereAdditive` et des positions
  seules : aucun programme neuf, aucun matériau de la voiture cloné ni
  touché. Un modèle dont l'optique ne se reconnaît pas (livrée peinte d'un
  seul tenant) n'a pas de lueur : on ne dessine pas une forme qu'on ne
  connaît pas, le pinceau sur la route suffit.
- **UNE LUEUR SOUS UN VERRE SE DESSINE AVANT LE VERRE** (`renderOrder` −1) :
  dessinée après, la glace (transparente, profondeur écrite ou non) la cache.
- **UNE LUEUR S'ÉTEINT AVEC SON OPTIQUE.** Pièce détachée, phare cassé ou
  calciné (`degats3d` lui donne un matériau assombri) : on compare au
  matériau du PROTOTYPE relevé à la mesure, jamais à celui de la voiture au
  moment de l'allumage — elle a pu être cassée avant.
- **ON JUGE UNE LUEUR PAR LA TÔLE ET PAR LA FORME, SOUS NODE.**
  `sonde-feux-flotte.mjs` (lue par `degats.js`) : aucun disque, chaque
  triangle de lueur retrouvé sur la carrosserie par un rayon le long de sa
  normale, rien hors du nez. Un modèle neuf passe par elle ; une capture de
  nuit (`sonde-captures-phares.cjs`) montre si le dessin se lit.

Ce qui reste, déclaré dans `TASKS.md` : les feux stop, de recul et de
détresse sont encore des lentilles génériques posées par `posesDetresse`.

## Les feux se mesurent sur le prototype (v550) — une règle par modèle ne se mesure jamais sur une voiture

Deux règles.

- **CE QUI SE GARDE PAR MODÈLE SE MESURE SUR LE PROTOTYPE.** `posesDetresse`
  (feux de détresse et feux stop) et `posesPhares` mesurent, quand la voiture
  est un clone du prototype à l'identité (`userData.protoDe`), un clone propre
  de ce prototype (`surLePrototype`, vehicules.js). La règle de la v543 (« une
  tôle intacte ») ne voyait qu'une façon d'être abîmée ; une voiture en
  animation d'échelle ou privée d'une pièce détachée empoisonnait aussi le
  modèle. C'est la règle de la portière (v366) : le plan se prend sur le
  prototype. Ailleurs (un modèle dont le clone n'est pas à l'identité), la
  mesure sur la voiture et la règle de la v543 restent.
- **UN MAILLAGE FUSIONNÉ PAR MATÉRIAU EST UN BLOC OPTIQUE S'IL EN PORTE LE
  NOM.** Le taxi rangeait son lanternon avec ses ampoules (clé « light ») :
  un seul bloc du nez au toit, et ses feux au pied du pare-brise. Une pièce
  d'un modèle fabriqué qui n'est pas un feu ne prend pas une clé que `RE_FEU`
  ou `RE_PHARE` lisent ; elle a sa clé à elle et le même matériau (aucun
  programme neuf). Toute la flotte se mesure sous node (`sonde-feux-flotte.mjs`,
  lue par `degats.js`) : un modèle neuf dont un feu tombe hors de la tôle ou
  de son coin la fait rougir.

## Les guides des villes (v538) — un guide est un rôle à part, et il se pose à ciel ouvert

Trois règles.

- **LE GUIDE EST LA SEULE EXCEPTION À LA v243, ET ELLE VIT DANS SA CLASSE.**
  `Guide` (vie.js) tient son poste, ne marche pas, et se tourne vers l'enfant
  à moins de seize blocs — c'est son métier. `Habitant` ne change pas : un
  passant ne s'arrête toujours pas. Ce que dit le guide passe par la règle des
  panneaux (`creerGuides`, guides.js : une fois par visite, jamais en rafale,
  en temps réel), dans la langue du profil (`texteDuGuide` : `fr`, `en`, et
  `both` alterne d'une visite à l'autre). Ses positions se demandent au
  registre des repères (`REPERES`, `villeDuRepere`) ; ses faits sont vérifiés.
- **PLUS DE MESSAGE À L'ÉCRAN, DONC LE GUIDE PARLE.** Depuis la v504 rien ne
  s'affiche en jeu (décision de Max) : un panneau passe par la voix du
  navigateur (`parlerAVoixHaute`, guides.js), langue du panneau, pictogrammes
  retirés (`phraseAParler`), seulement si `sonActif()`. Un témoin remplace
  `speechSynthesis` par un enregistreur et lit ce que le jeu a demandé de dire
  — jamais un drapeau. Un appareil sans synthèse ne dit rien ; la visite se
  compte quand même.
- **UN CENTRE DE MONUMENT EST SOUVENT CREUX.** La rotonde du Capitole, la nef
  de Notre-Dame, le dessous de la tour Eiffel sont au niveau de la rue et
  praticables : le premier jet y posait douze guides sur dix-neuf, invisibles
  du dehors. `essaiParBlocs` (guidesvilles.js, pure) exige le sol au niveau du
  relief ET `CIEL` blocs d'air au-dessus ; à Manhattan, dont le plan n'est pas
  fait de blocs, on demande le trottoir au monde (`trottoirA`).
- **UN GUIDE EST UN PIÉTON POUR LA RUE, DONC JAMAIS SUR LA CHAUSSÉE.** Il est
  dans `npcs`, que la circulation lit (`brancherPietons`), et une voiture
  attend sans limite devant un piéton (v395). Le premier jet en posait quatre
  sur dix-neuf sur l'asphalte (Capucine à la tour Eiffel, St Paul, le
  Panthéon, Saint-Pierre), trouvés par une sonde sous node — j'avais d'abord
  accusé le bouchon de « la rue roule » (médiane zéro), qui est déclaré et
  revient sans eux. `essaiParBlocs` refuse `CHAUSSEE`.
  **Tout personnage qui se tient immobile se pose hors de la chaussée**, sinon
  il arrête une file pour toujours.
  Et il reste un piéton : une voiture qui passe le fait s'écarter (v259), dos
  à l'enfant. Un témoin de regard lit hors d'un écart (`guide.ecart` faux),
  borné, jamais à un instant fixe.
- **UN ACCESSOIRE DE PERSONNAGE SE FABRIQUE À L'ATELIER.** Le fanion du guide
  est fait avec `Atelier` (`matiereVivante`) : le programme des corps sculptés,
  chauffé à l'accueil (v246). Un matériau neuf aurait compilé à l'arrivée au
  monument — et la présence (v241) en fait une variante transparente de plus.

## Le mobilier se casse (v536) — un obstacle de rue est un geste, pas un mur

Max : « tout le mobilier urbain, poteau, feu rouge, est hyper dur. Comme dans
GTA, il devrait tomber pour ne pas bloquer la voiture. » `src/mobiliercasse.js`
(pur) porte la règle et le registre ; `main.js` (`mobilierDevant`) l'applique.
Cinq règles.

- **ON MESURE SUR QUOI L'ON BUTE AVANT DE CHOISIR CE QUI CASSE.**
  `sonde-mobilier-route.cjs` roule la voiture de l'enfant sur les vrais
  circuits, décalée vers le trottoir : ce sont des blocs `RUE` (réverbère, feu,
  jardinière), 60 à 100 par kilomètre à un bloc de la voie dans les villes
  engendrées. Ce sont eux qui cassent (`faconDeCasser`) ; un meuble, un arbre,
  ce qu'un ENFANT a posé (`world.edits`) restent des obstacles — décision à
  confirmer par Max.
- **ON NE CASSE QUE SUR LE PAS QU'ON FAIT, ET ASSEZ VITE.** `obstacleVehicule`
  est aussi appelé loin devant (le regard du freinage piéton, v358) : la casse
  n'arme que pour un pas de moins d'un bloc et demi, à `VITESSE_CASSE` (5 b/s)
  ou plus. Au pas, un poteau reste un obstacle. La voiture perd `PERTE_CASSE`
  de sa vitesse, sans `player.choc` : le contrat des dégâts (v343) ne voit que
  les chocs que la physique publie — pas de double choc.
- **RIEN N'EST ÉCRIT DANS LE MONDE, ET L'OBJET TOMBÉ EST LE MÊME MAILLAGE.** Le
  bloc reste dans le morceau ; son maillage (`piecesParCle`) se couche autour de
  son pied, dans le sens de la marche (`poseDeChute`), en temps réel — aucune
  géométrie, aucun matériau, aucune clé de programme neuve (le témoin lit les
  CLÉS après le vrai geste). Un morceau remaillé recouche ses pièces tombées.
  Le cap d'origine et le feu vivent dans une `WeakMap`, jamais dans `userData`
  (que `clone` recopie par JSON).
- **UN FEU TOMBÉ S'ÉTEINT, LE CARREFOUR GARDE SA RÈGLE.** La casse est LOCALE à
  la tablette ; la circulation est une fonction de l'horloge partagée (v305).
  Si un feu tombé libérait le carrefour, deux amis n'auraient plus la même rue.
  Une lanterne tombée n'a plus de lampe (`eclairerLaRue`).
- **LE MOBILIER DE LA COUCHE HD S'ÉCRASE PAR UN REMAILLAGE.** Terrasse, banc,
  colonne Morris n'ont pas de maillage à eux : la colonne écrasée entre dans
  `world.mobilierCasse`, part au worker (`type: 'casse'`, et avec `edits` à la
  resynchronisation), et le morceau se remaille sans elle. Ce qui est tombé se
  relève après `DUREE_AU_SOL_MS`, hors de la vue de l'enfant (`LOIN_RELEVE`).
  Manhattan (mobilier instancié par lots) et le réseau (la casse n'est pas
  partagée) restent des dettes déclarées.

## La voiture, comme dans GTA (v543) — un son se lit dans sa bande, et une règle de route vit dans la dynamique

Max : « améliore la conduite pour qu'elle ressemble à GTA — l'environnement,
les autres voitures, la musique, le son, jusqu'au design des voitures ». Quatre
sujets dans une livraison, quatre lignes au journal, neuf témoins (v279). Six
règles.

- **LA RADIO A UN PROGRAMME PUR, ET IL SUIT L'HEURE RÉELLE.** `radio.js`
  (sans import, lu par les témoins sous node) porte cinq stations de trois
  morceaux, écrits en degrés relatifs à l'accord ; `programme(station, t)`
  rend le morceau et le pas de croche à l'heure `t`, si bien qu'une station
  continue de jouer quand on ne l'écoute pas et que deux tablettes sur la même
  station entendent la même chose. `sons.js` ne fait que JOUER ce que le
  programme dit, contre l'horloge du contexte audio (v268). Un jingle, sans
  batterie, ouvre chaque morceau. Le choix de station — ou le silence — se
  garde sur l'appareil (`web-minecraft-radio-v1`), pas dans le profil.
- **UN ANALYSEUR LISSE SON SPECTRE : UN TÉMOIN DE SON LIT L'INSTANT.** Six
  dixièmes après le lâcher, le klaxon se lisait encore à −43 dB dans sa bande,
  gain à zéro depuis trois dixièmes : `smoothingTimeConstant` vaut 0,8 par
  défaut, et `getFloatFrequencyData` rend une MÉMOIRE. À zéro, le lâcher
  rend −62. Et un témoin de son lit UNE BANDE (le klaxon 350–560 Hz, le
  grondement 60–300, la radio 250–1 600), jamais l'énergie totale, que le
  moteur au ralenti remplit.
- **LA RUE DIT CE QU'ELLE FAIT, ELLE NE CHANGE PAS CE QU'ELLE FAIT.** Une
  voiture de la rue arrêtée derrière l'enfant cède sans limite (v245) ; elle
  klaxonne désormais au bout de `KLAXON_PATIENCE` secondes réelles, puis
  relance — mais n'avance pas d'un bloc. `vehicules.js` ne sait pas faire de
  son : `brancherKlaxon` reçoit de main.js ce qui sait où est l'enfant et où
  il regarde (le panoramique). Le ton d'une voiture vient de sa clé et de son
  rang (`tonDeKlaxon`) : deux klaxons ne se ressemblent pas, et deux tablettes
  entendent le même. Le passant lit le klaxon comme un choc (`regardChoc`,
  `player.klaxon = { t, x, z }`, un événement daté posé au premier appui).
- **UNE RÈGLE DE ROUTE ENTRE DANS LA DYNAMIQUE PAR UN FACTEUR, ET LE FACTEUR
  1 EST L'IDENTITÉ AU BIT PRÈS.** `adherenceDeSurface(surface, pluie)`
  (conduite.js) rend 1 sur la route ; `pasVoiture` lit `entree.adherence` et
  en fait la traction, le freinage, la tenue latérale et la résistance au
  roulement. Sans le champ, la v534 au bit près : 960 000 valeurs comparées à
  la sonde, 128 000 pas au témoin de `plafond.js`. La surface se LIT (le bloc
  sous le milieu et sous le nez de la caisse, `surfaceSousLaCaisse`, un
  tablier est une route) ; un bloc inconnu se roule comme une route — on ne
  punit pas une rue dont le bloc est neuf. L'oreille (`roulement`) et l'œil
  (la vibration de la caméra) lisent la même rugosité (`rugositeDeSurface`).
- **UN FEU DE MODÈLE SE POSE SUR LES POSES MESURÉES, ET LE MÊME GESTE SERT
  L'ENFANT ET LA RUE.** `feuxArriere` (vehicules.js) pose le feu stop et le
  feu de recul sur les deux poses ARRIÈRE de `posesDetresse` (v519), en
  `matiereAdditive` (v533 : aucune clé neuve). `fun.js` l'allume sur ce que
  la voiture FAIT (une décélération au-delà de la roue libre, le frein à main,
  la glissade ; la marche arrière), jamais sur ce qu'on demande ; `montrer`
  l'allume sur une voiture de la rue qui attend ou qui perd de la vitesse
  d'une image à l'autre. Créés à la première demande, cachés sinon : une rue
  qui roule ne coûte pas un appel de dessin de plus.
- **UN TÉMOIN QUI CHERCHE UNE SITUATION DE RUE LA PROVOQUE SUR LA DALLE.**
  Un convoi d'une voiture sur un anneau de la dalle témoin, l'enfant arrêté
  sur sa voie : elle freine, s'arrête, klaxonne — vingt secondes, bornées à
  quarante-cinq, la durée dans le message. Aller la chercher dans Paris aurait
  été un tirage (v383).
- **UN CACHE PAR MODÈLE NE SE REMPLIT QU'AVEC UNE MESURE SAINE.** Les poses
  des feux (`posesDetresse`) se gardent par fichier de la flotte ; la première
  mesure se faisait parfois sur une voiture de la rue déjà froissée, et toutes
  les voitures neuves du modèle portaient ensuite leurs feux dans la bosse (la
  Bolide en production depuis la v519, la F40 dès que les feux stop ont lu le
  cache plus tôt). On ne garde que ce qui est mesuré sur une tôle intacte (les
  géométries portent la marque `partagee` du prototype). C'est le rayon du
  témoin, qui nommait le maillage touché (`Body_PrimaryPaint`), qui l'a dit :
  la mesure fraîche rendait les mêmes poses dans les deux arbres.

## Le klaxon et les feux d'un ami (v549) — un événement voyage par un message, un état par la position

Deux règles. **UN ÉVÉNEMENT TENU VOYAGE PAR DEUX MESSAGES, ET SE TAIT SEUL.**
Le klaxon part en `klaxon` (`o` 1 à l'appui, 0 au lâcher, l'hôte relaie avec
`from` comme une émote, nom neuf : le receveur cède) ; `klaxonAmi` (sons.js)
le tient comme le nôtre, placé comme celui de la rue, au ton de SA voiture
(`tonDeKlaxon`), et se tait seul au bout de quatre secondes si le lâcher se
perd. Nos passants le lisent (`player.klaxon`). **CE QUI EST UN ÉTAT VOYAGE
AVEC LA POSITION** (v388) : les feux stop et de recul sont `p.v.s` (1 frein,
2 recul), recopié avec `p.v` sur `pos` et `rpos`, allumés chez l'ami par
`feuxArriere`. Les témoins lisent la SORTIE audio de l'ami dans la bande du
klaxon et les lentilles sur SA copie de la voiture, jamais un drapeau.

## Un choc a de l'élan (v534) — la vitesse d'après un choc est un vecteur que le joystick ne touche pas

Max : « quand on fonce dans une voiture avec une autre voiture, la voiture
s'arrête immédiatement alors qu'elle aurait été propulsée sur quelques
mètres ». Cinq règles, toutes mesurées par `sonde-elan-chocs.cjs`.

- **CE QUI FILE DE CÔTÉ SE PERD PAR FROTTEMENT, PAS PAR UN COEFFICIENT
  D'ANGLE.** `reponseChoc` gardait un quart de (1 − c) de la vitesse tangente
  dès 30° : un mur à 30° ou 45° était un choc de face. Le choc retire au plus
  `FROTTEMENT_IMPACT` × l'impulsion normale (Coulomb) et rend `e` de la vitesse
  normale ; la FORCE reste `−vn / vPleine` — le contrat des dégâts ne bouge
  pas, et un témoin le garde.
- **APRÈS UN VRAI CHOC, LE JOYSTICK ATTEND (`glissade`).** Tenu en avant, le
  frein mangeait le rebond en un quart de seconde. Au-dessus de
  `CONTACT_DOUX`, la vitesse d'après devient un vecteur libre
  (`player.glissade`) qui s'use à `FROTTEMENT_GLISSADE`, tourne la caisse si
  l'impulsion ne passe pas par son centre (`vrilleDuChoc`, le bras de levier
  est le COIN qui touche, `pointDeContact`, pas le milieu de la face que
  lisent les dégâts), et rend la main au bout de `dureeGlissade` ou presque à
  l'arrêt. Un piéton ou l'eau l'arrêtent net (v259, v272). Pas de
  `franchirEnRoulant` en glissade : renvoyée de biais contre un mur en
  escalier, la voiture « franchissait » le coin d'une marche et montait dans
  la façade.
- **UN FILET QUI RAMÈNE LA VITESSE AU DÉPLACEMENT NE JUGE PAS L'IMAGE D'UN
  CHOC.** Dans cette image la voiture avance puis rebondit : son déplacement
  net est presque nul, et le filet de la v272 tuait le rebond (zéro bloc à
  21 blocs/s, mesuré). `_chocImage` le désarme pour l'image du choc.
- **CE QUI SE POUSSE EST CE QUI N'EST PAS DE L'HORLOGE PARTAGÉE.** Une voiture
  garée ou invoquée (une monture à `gabarit`, pas un avion) est un obstacle de
  la famille « voiture » (`gareeContre`, main.js — elle ne l'était que pour
  les piétons, la voiture de l'enfant la traversait) et se POUSSE
  (`chocPoussable` : deux masses égales, `REBOND_VOITURE` ; `Animal.pousser`,
  freinée à `FROTTEMENT_POUSSEE`). Une voiture de la rue ne se pousse jamais
  (v305) : la nôtre rebondit. La vitesse de l'autre peut être un vecteur
  (`vx`, `vz` dans la boîte) : sans elle, la voiture qu'on vient de pousser,
  pas encore déplacée dans l'image, était repoussée à chaque pas.
- **UN REBOND NE PUBLIE PAS UN SECOND CHOC.** Dans `ANTI_REBOND` (0,35 s de
  JEU, `horlogeJeu` — une sonde sous node tourne plus vite que la montre), un
  choc plus faible que le précédent est le même accident. Revenir dans le mur
  après la glissade, joystick tenu, en est un autre : il se publie.

- **CE QU'UNE VOITURE DE LA RUE AVANÇAIT VERS NOUS NE NOUS EMPORTE PAS.** Elle
  s'arrête au choc (`heurter`, v372) : sa composante vers nous se retire de la
  vitesse de sortie, la force reste celle de la vitesse RELATIVE. Sans cela un
  taxi de Manhattan pris de face rejetait l'enfant de sept blocs (et
  `origin/main`, joystick lâché, de trente-neuf à cinquante et un).
## Une voiture de la rue percutée est projetée (v567) — l'horloge partagée cède au choc franc

Max : « quand on fonce dans un véhicule, il est projeté et il ne s'arrête pas
comme si on était face à un mur en briques ». **Cette décision lève la règle de
la v534 « une voiture de la rue ne se pousse jamais » pour le choc FRANC.**
Quatre règles.

- **AU-DELÀ D'`ARRACHE`, LA VOITURE QUITTE SA RUE, PAS SA PLACE.** Le choc se
  juge dans `chocContreVoiture` (conduite.js, pur) : une voiture de la rue
  `detachable` (ni rame, ni ami, ni bus) prise à plus de six blocs/s d'impact
  normal se pousse comme une voiture garée (`chocPoussable`, deux masses
  égales) et la physique appelle son `pousser`. fun.js (`projeterDeLaRue`)
  fait alors ce que fait `conduireLaVoiture` — `emprunter`, modèle, laque,
  coups — sans monter dedans : une voiture libre (`projetee`) qui part avec
  l'élan et la vrille du choc (le point de sa caisse le plus proche de notre
  centre : par le coin elle tourne, centrée elle file droit). La place reste
  prise (v305) ; sous le seuil, la règle d'avant (une caresse ne vide pas la
  rue).
- **UNE PLACE ARRACHÉE SE REND QUAND LA VOITURE S'EN VA, HORS DE LA VUE.**
  `rendrePlaces` (fun.js) rend la place (`vehicules.rendre`) quand le bestiaire
  a retiré la voiture libre et que la place est à plus de `VU_VOITURE + 15`
  blocs : sinon chaque choc creusait la rue pour la session, ou le convoi
  refabriquait une voiture sous les yeux de l'enfant (v547).
- **CE QUI A ÉTÉ ARRACHÉ DANS L'IMAGE N'EST PLUS DANS LA COLLECTE.** Les pas
  suivants du même `deplacerVoiture` relisent `dernieres` : `bloquantDevant`
  saute une place prise, et `heurter` (v372) ne stoppe pas la voisine pour
  rien. Les dégâts froissent la voiture que la physique NOMME (`choc.cible`),
  jamais « la plus proche » — la voisine se serait froissée. Le nom de rue
  (`origine`) part aux amis : chez eux elle s'arrête, feux de détresse, et se
  froisse ; elle n'y est pas projetée (local, déclaré).
- **UNE VOITURE LIBRE EST UN OBSTACLE POUR LA RUE, PAS POUR LA NÔTRE.** Elle
  entre dans la liste des amis de la rue (`libre: true`) : la file s'arrête
  derrière elle et klaxonne. `bloquantDevant` la saute : c'est `gareeContre`
  (main.js) qui la juge et la pousse, sinon elle redevenait un mur.

## Des rues à la GTA (v544) — une voie, c'est la voiture et un bloc de chaque côté

Max veut rouler dans les villes comme dans GTA. Mesuré avant une ligne : la
marge du kit (0,4 m de chaque côté de la voiture), dans un monde où une rue se
lit au bloc, laissait des chaussées où la voiture frôlait le trottoir —
Washington 4 colonnes de médiane, une rue sur deux à une seule voiture. Huit
règles.

- **LA LARGEUR SE DEMANDE À LA RÈGLE, LE PAS AU KIT.** `sectionGTA` (voirie.js)
  est `sectionDeRue` avec un bloc de dégagement (`MARGE_GTA`) : 4,26 · 8,52 ·
  17,04 de chaussée. Toute ville la lit (sections de Paris, Londres, Nice,
  Lille, San Francisco, `RUE_VILLE`/`BOULEVARD_VILLE`, voiesdoubles.js). Le PAS
  de trame se calcule toujours sur la section du KIT (`*_KIT`) : recomposer le
  pas déplaçait les axes, donc les circuits — 32 villes engendrées sans voiture
  au premier jet. Ce sont les lots qui reculent, et un plancher d'îlot
  (`2·t.s + ILOT_MIN + 0,5`) garde un îlot bâtissable.
- **UNE VILLE À PAS FIGÉ PREND LA LARGEUR SUR SON TROTTOIR.** Washington (maison
  de 9, pas de 28, v370) : chaussée de grille 3 → 5 colonnes, trottoir 2 → 1 ;
  les avenues qui longent les musées (`SERREES_DC`) ne s'élargissent pas, elles
  passeraient sous les galeries (v205). Les liaisons gardent leur bord extérieur.
- **LA VILLE D'AVANT SE FIGE SOUS CE QU'UN ENFANT A BÂTI, BOUCHES DE MÉTRO
  COMPRISES.** Copies à l'octet `paris-v531.js`, `londres-v531.js`,
  `nice-v531.js`, `lille-v531.js`, `sanfrancisco-v531.js`,
  `villesmonde-v531.js` ; Washington garde sa variante DANS le module
  (`VAR_V531`), parce qu'une copie coûtait 335 ms d'import. Une colonne où un
  bloc a été posé avant `DATE_RUES_GTA` (et ses huit voisines,
  `colonnesRuesGTA`) garde la ville de la v531. Les bouches de métro suivent
  les trottoirs : `ville.js` et `metromonde.js` ont des bouches choisies contre
  la ville de la v531 (`surParisV531`, `surVilleV531`), avec des mémos par
  variante — partagés, ils faisaient choisir à Rome figée les bouches de Rome
  neuve. Le témoin compare la ville figée à `origin/main` colonne par colonne,
  métro compris. La date se relit à la fusion (v309).
- **UN CONTOUR JUGE SON PARTAGE SUR SA VOIE, PAS SUR L'AXE.** Le partage se
  lit sur l'axe des rues ; à un coin RENTRANT d'un contour, la voie de la
  voiture déborde de l'axe d'une demi-chaussée de chaque côté. Vingt blocs sur
  l'axe en faisaient 24,3 dans la voie à Tunis et à Kyoto (chaussée 6,4 → 8,5).
  La phase 4 retire la chaussée de la barre (`barreContour`) ; un rectangle n'a
  pas de coin rentrant, sa barre ne change pas. Quand une largeur change, toute
  barre écrite « sur l'axe » se relit sur la voie.
- **LA TÊTE D'UNE FILE BOUCLÉE SUIT SA QUEUE.** Le plancher de file (v283) ne
  regardait que la voiture d'avant ; sur un tracé fermé, devant la voiture 0
  il y a la dernière, un tour plus loin. Quand toute la boucle s'arrête aux
  feux, la tête entrait dans la queue (voitures 0 et 14 du huit de Paris :
  0,4 à 3 % des paires sur la v531, 13 à 14 % avec les rues élargies, 0 après).
  La queue se lit à l'image d'avant, et seulement si la boucle tient toute sa
  file pare-chocs contre pare-chocs. Le défaut était en production : c'est un
  témoin de taux, et la sonde page neuve APRÈS 75 s sur place (l'état que la
  suite laisse), qui l'ont séparé d'un tirage.
- **CE QUI SUIT LE TROTTOIR SE RELIT QUAND LE TROTTOIR BOUGE.** Le mobilier
  (bancs, jardinières) s'est posé sur l'axe des avenues d'entrée : il en est
  écarté (`surUneEntree`). Une bouche rechoisie (Reuilly–Diderot) perce le
  piédroit à la case du nom : un piédroit percé par le couloir d'une bouche ne
  porte pas de plaque (`plaquesParis`). La recherche des bouches va plus loin
  pour la ville neuve seulement.
- **MANHATTAN ET LES MÉDINAS NE CHANGENT PAS, ET C'EST DIT.** Manhattan a son
  plan ; les médinas n'ont pas de voitures (v270).
- **LE PRIX SE DÉCLARE, ET UN TÉMOIN QUI PORTAIT UNE DIMENSION D'AVANT SE
  REMESURE DES DEUX CÔTÉS.** Parts de lots : Paris 23,2 → 17,2 %, Londres 34,9
  → 30,6, Lille 33,7 → 28,8, Nice 63,7 → 60,0, San Francisco 59,4 → 55,8,
  Washington 53,5 → 53,2, villes engendrées 22,3 → 18,0. Terrasses et combles
  de `parishd.js` se comptent par lot ; le Financial District garde sa borne de
  garde à la moitié de la mesure. Le relief ne bouge pas (les deux empreintes
  de `plafond.js`) ; l'empreinte des 490 morceaux change, et désarmée
  (`MARGE_GTA` à 0,4, les bouches d'avant, la barre de contour et le mobilier
  des entrées) elle rend la constante de la v531 au bit près.

## Les voies droites le long des quais (v558) — une trace d'arrêt en arrêt se redresse dans l'axe du quai, et la surface se prouve par une empreinte

Trois règles.

- **UNE VOIE DÉCALÉE SUIT LE CAP DE SA TRACE, DONC LA TRACE SUIT LE QUAI.**
  La trace allait d'arrêt en arrêt en ligne droite ; dans une station en
  virage, la voie décalée de ±4 (`ECART_VOIE`) selon son cap traversait le
  quai central aux bouts (2 590 points, cinq stations sans pylône). Autour de
  chaque arrêt, la trace suit l'axe du quai (`AXES_AVANT`, le cap pris AVANT
  de bouger un point : la station ne tourne pas, ses bouches ne bougent pas),
  puis rejoint l'arrêt suivant par une courbe d'Hermite (`raccorderTroncon`),
  le plus long possible jusqu'à `DEMI_STATION + 1`. Les mêmes points, le même
  nombre : rangs d'arrêt, grilles horaires et tours égaux de l'Orange et de
  l'Argent (v468) tiennent par construction ; la branche part du quai commun
  dans l'axe du tronc.
- **UNE COURBE PLUS SERRÉE QUE L'ÉCART D'UNE VOIE REPLIE LA VOIE DU DEDANS.**
  Le premier jet raccordait au tracé d'avant sur deux blocs : la voie revenait
  en arrière à L'Enfant Plaza. Le rayon du raccord ne descend pas sous
  `RAYON_MIN_VOIE` (4,5, plus que l'écart de 4), mesuré pas à pas ; la
  longueur droite cède avant le rayon. Zéro rebroussement (34 avant, déjà aux
  coins). Metro Center et McPherson Square, à seize blocs, se chevauchent : la
  voie n'y est droite que sur quelques blocs, et c'est déclaré.
- **CE QUI BOUGE EN PROFONDEUR SE PROUVE PAR CE QUI NE BOUGE PAS EN
  SURFACE.** Un témoin hache tout ce que `creuserMetroWashington` pose à moins
  de trois blocs du sol sur les 79 560 colonnes de l'emprise, gardées ou non,
  et le compare à la v547. Le choix du bout de l'escalier (`fin`, `k0`) se fait
  contre les voies : à Foggy Bottom et Arlington Cemetery, au bord du lit du
  Potomac, il changeait la mezzanine près du sol — elles gardent leur choix
  (`ESCALIER_GARDE`), et aucune date neuve n'est nécessaire. Une trace qui
  bougerait près du sol en demanderait une (v485, v309). Le gabarit dégage les
  deux cotes d'une marche de la voie, jamais à moins de quatre blocs du sol.

Et **un portillon n'est pas un sol** : la sonde des stations montait dessus,
sous trois blocs d'air, quand le passage voisin en a quatre. Les cases « sous
4 » qui restent sont en haut de l'escalier de la rue, sous le bloc de la rue —
on ne creuse pas la rue.
## Le mobilier recule du caniveau (v557) — on déplace un prop, jamais un solide ni un feu

Dettes des v536 et v544, dans les villes engendrées. Trois règles.

- **CE QUI RECULE EST CE QU'ON TRAVERSE À PIED.** Le réverbère et la jardinière
  (des props, `isProp`) reculent d'un bloc contre les façades
  (`reglageMobilier.recul`, villesmonde.js) ; le BANC est un bloc solide et
  reste (le déplacer changerait la forme sous ce qu'un enfant a bâti, v457), et
  le FEU reste au coin : son axe se lit dans la parité de sa position (v273),
  et les bouches de métro se choisissent contre lui. Le prop reculé prend sa
  colonne à l'auvent, sinon la moitié des rues perdaient leurs lampes. Un
  réverbère loin du caniveau cherche sa chaussée à deux blocs (`versLaRue`).
  `recul: 0` rend la règle d'avant, pour l'empreinte des 490 morceaux.
- **LA GRANDEUR EST LA DISTANCE AU MILIEU DE LA VOIE, PAS LE VOISINAGE D'UNE
  COLONNE.** Sur une trame tournée, la case du mobilier se juge en son centre
  (v270) : « une colonne de chaussée à côté » restait vraie pour un tiers des
  réverbères reculés. Le témoin lit le tracé de `tracesCirculation` : aucun à
  moins de trois blocs (1 158 sur `origin/main`).
- **UN MONUMENT QUI GAGNE DE L'EMPRISE SE MESURE CONTRE LES ANNEAUX DE SA
  VILLE.** L'hôtel de ville de Los Angeles est sur la place centrale : des
  ailes de cinq blocs y écartaient l'anneau d'arrivée (2 044 → 1 532 blocs de
  circuits), à trois blocs les anneaux restent au bit près. On compare
  `tracesCirculation` des deux arbres avant de livrer un bâtisseur, même hors
  des couches 1 à 3 qu'on croit seules lues.

## Les stations de métro (v529) — on juge une station avec le vrai joueur, à l'aller et au retour

Max : « on ne peut même pas marcher dedans ». Sept règles.

- **UNE SONDE DE MARCHE FAIT MARCHER `player.js`, DANS LES DEUX SENS.** La
  sonde de la v473 marchait sur une grille et disait « 16 sur 16 » ; elle ne
  voyait pas Washington (2 quais sur 20). `sonde-stations.cjs` cherche le
  chemin case par case, puis le vrai joueur le suit, aller ET retour (monter
  une marche, c'est sauter : 1,42 bloc, et la tête cogne sous trois blocs
  d'air — il passe encore, de 0,2 bloc ; sous deux, plus du tout). La marge
  voulue est quatre blocs ; la sonde compte les cases où on ne l'a pas. Et elle
  ne descend que dans SA bouche et SA station : une bouche murée qu'on
  contourne par l'escalier d'à côté n'est pas une bouche (c'est ce qui cachait
  Hôtel de Ville).
- **UNE TRÉMIE SE MESURE CONTRE LES REPÈRES, PUIS LES BOUCHES SE RECHOISISSENT
  EN GARDANT CE QUI TENAIT.** Celle d'Hôtel de Ville (v473) débouchait dans le
  parvis de Notre-Dame : les monuments se posent après le creusement. Le choix
  (`choisirBouches`) garde le choix de la v473 tant qu'il est valide et ne
  libère que le voisin qui gêne : deux bouches bougent sur quinze.
- **UN ESCALIER DE QUAI CENTRAL SE POSE AU BOUT DU QUAI, LOIN DES VOIES.**
  Washington a un quai central : une bouche de côté arrivait au-dessus de la
  fosse, de l'autre côté des rails. On monte au bout du quai, par une
  passerelle à la mezzanine ; le bout et la marche de départ se choisissent
  contre les points de voie (`genes`) — dans une station en virage, la voie
  croise les bouts du quai, et le gabarit, creusé en dernier, emportait les
  marches. Les pylônes du nom se choisissent de même (`q.pylones`).
- **CE QU'UNE RÈGLE DIT CREUSER « DANS L'EMPRISE » SE CREUSE DANS L'EMPRISE.**
  La v485 écrivait `EMPRISE_METRO_DC` et `world.js` s'arrêtait à la zone : la
  bouche de Pentagon y passait et finissait dans la terre. Dans la marge,
  jamais creusée, sous ce qu'un enfant a bâti avant `DATE_STATIONS` on ne
  creuse qu'à trois blocs et plus sous le sol.
- **UN DÉCOR D'UN SEGMENT SE POSE DANS L'ESPACE D'UN AUTRE.** `apres` passe
  après les vides de TOUS les segments d'une colonne : la lampe jaune du
  tunnel voisin flottait au-dessus des voies de la Bastille. Un mobilier de
  tunnel cède à une station (`dansStation1`). Toute pièce `apres` neuve se
  demande dans quels segments voisins elle peut tomber.
- **UN NOM EST UN PLAN DEVANT UNE CASE, PLACÉ PAR UNE RÈGLE PURE ET RELU CONTRE
  LE MONDE.** `plaquesParis` (ville.js) et `plaquesDC` (washington.js) donnent
  la place, `stations.js` dessine (un maillage, un canevas par station, à
  70 blocs ; la chauffe du programme pendant l'accueil). Sur une trame en biais
  le mur est un escalier de cases : le plan se pose devant la plus avancée sous
  lui, jamais dans une autre ; et un mur que le tunnel voisin ou la station
  voisine perce (Metro Center et McPherson Square sont à dix blocs) ne porte
  pas de plaque. La sonde relit chaque plaque : aucune dans un bloc, aucune
  sans appui.

- **UN CHOIX CALCULÉ AU CHARGEMENT D'UN MODULE SE MESURE EN TEMPS DE
  CHARGEMENT.** Le choix des escaliers de Washington (`genes`, `parRame`)
  parcourait tous les points de voie pour chaque échantillon, à l'import de
  `washington.js` : 17,3 s au lieu de 0,7, sur le fil principal ET dans le
  worker. Aucun témoin de station ne le voyait ; ce sont `reglages.js` et
  `manhattan.js` qui ont rougi, leur seconde tablette relancée n'ayant pas
  encore de `__game`. Grille de cases (`voieProche`), même résultat au bit
  près. Quand un module gagne un calcul à son chargement, on chronomètre
  `import('./src/world.js')` des deux côtés.

## Les bouches rendues (v555) — un dernier recours s'ajoute après les places ordinaires

Hôtel de Ville sans bouche depuis les rues à la GTA, Reuilly–Diderot sans une
de ses plaques. Quatre règles.

- **TROIS STATIONS QUI SE DISPUTENT UN TROTTOIR SE MESURENT PAIRE PAR PAIRE.**
  Chaque place d'Hôtel de Ville recouvrait la seule place de Saint-Paul qui
  laisse la Bastille, et chaque place de la Bastille recouvrait les autres
  places de Saint-Paul : aucune libération de voisin n'y peut rien. Une
  empreinte plus juste et une libération en chaîne ont été écrites, mesurées
  et retirées (aucune combinaison de plus) : non-résultats.
- **LE COULOIR PEUT PASSER SOUS UN BASSIN, L'ESCALIER JAMAIS.** Le couloir est
  au niveau du quai (plafond à 24, lit à 27) : la règle même de la voûte des
  stations (v473). C'est un DERNIER RECOURS (`placesDe(…, recours)`), servi
  seulement à la station qui n'a rien, et ses places s'AJOUTENT après les
  ordinaires : une bouche gardée reste trouvée à son rang, et ni les autres
  stations, ni le Paris de la v531, ni les bouches de la v473 ne bougent.
  L'escalier monte : sous l'eau il ouvrirait le fleuve (Lepanto, Rome : 666
  trémies sur trottoir, toutes avec l'escalier sous le Tibre — déclaré).
- **UNE BOUCHE RECHOISIE N'ENTRE PAS PAR LA CASE DU NOM** (`perceLaPlaque`) :
  libérée, elle évite les cases 8 et 9 de chaque douzaine, à trois blocs (à un
  et demi, la plaque rendue flottait au bord du couloir) ; gardée, elle reste.
  Un témoin compte quatre plaques par station.
- **DEUX STATIONS VOISINES SE CHEVAUCHENT, ET `SOUS_TERRE` N'EN GARDE
  QU'UNE PAR COLONNE.** Hôtel de Ville et Châtelet sont à dix-neuf blocs pour
  des quais de vingt-cinq : le premier jet du recours perçait le piédroit de
  Châtelet (une plaque sans appui, vue par le portail). Le recours se juge
  contre le rectangle de chaque autre station (`horsDesAutresStations`).

## Montmartre et les jardins (v512) — une cote se lit sous la voiture, et une voie traverse un jardin déclaré

Trois règles.

- **LA COTE D'UN CONVOI SE LIT SOUS SA CARROSSERIE, DANS SA VOIE.** Depuis la
  v372 la voiture roule `VOIE_CIRCUIT` (1,3) blocs à droite du tracé, mais sa
  cote restait celle de l'axe et de ses quatre voisins (v210) : en dévers, la
  carrosserie mordait le pavé d'une colonne plus haute (32 pas sur la butte,
  233 à San Francisco). `coteSousLaVoie` (voies.js) prend aussi le plus haut
  sol sous l'emprise (cinq points en travers, cinq le long), UNE MARCHE au plus
  au-dessus de l'axe — au-delà c'est un mur, et San Francisco flottait à sept
  blocs (le témoin « le convoi suit le sol » l'a dit). C'est la règle de
  la v475 (« un circuit se juge sur la voie ») appliquée à la hauteur ; le
  relief ne bouge pas. Le prix : un flanc qui flotte au-dessus d'une marche.
- **UNE VOIE NOMMÉE TRAVERSE UN JARDIN DÉCLARÉ, SUR SA CHAUSSÉE.** Les
  jardins passent avant les rues dans `solParis` ; un jardin marqué
  `traverse` dans sa fiche laisse la voie (chaussée et trottoir) passer, sans
  qu'un lot change — le témoin le lit sur le disque entier. Sous une colonne
  où un enfant a bâti avant `DATE_JARDINS_PARIS`, le jardin d'avant reste
  (`colonnesJardinsParis`, `solParis(x, z, jardinsAvant)`), et `CONF_V308` ne
  porte pas la règle. Un jardin dont le remède changerait des lots (les
  Tuileries : 171 colonnes) se déclare, il ne se force pas. Et un témoin qui
  pose un bloc d'avant la date installe le journal AVANT d'engendrer le
  morceau : `setBlock` engendre d'abord, puis marque.
- **UN MONUMENT EN TRAVERS D'UNE RUE SE CORRIGE PAR SON BÂTISSEUR, PAS PAR SA
  BOÎTE.** Le Moulin Rouge était posé au centre de sa boîte, sur l'axe du
  boulevard de Clichy ; sa boîte entre dans les zones du relief. Le bâtisseur
  neuf (`tour`) tient dans la moitié nord ; `LANDMARKS_V317` garde l'ancien.
  Et avant de croire « dix-sept pas DANS le Moulin Rouge », on lit l'IDENTIFIANT
  du bloc touché : une boîte de zone autour d'un repère compte aussi le pavé
  de la pente voisine.

## Les bosquets (v513) — une densité d'arbres se mesure au volant, et elle se répartit

Max : « moins de densité d'arbres pour rouler dans la nature comme dans GTA ».
Trois règles.

- **CE QUI DÉCIDE SI L'ON ROULE N'EST PAS LA DENSITÉ MOYENNE, C'EST SA
  RÉPARTITION.** `bosquet(x, z)` (world.js, pur, à la position) découpe la
  forêt tempérée, la taïga, les tropiques et le maquis en massifs (1 : la
  densité du climat, inchangée) et clairières (0 : `ISOLE`, quelques arbres
  isolés), lisière en rampe, un bruit large qui ouvre des prairies. Abaisser
  la densité partout ferait un bois clairsemé où l'on bute encore ; les
  massifs gardent la forêt lisible du ciel. Les seuils (`BOSQUET_SEUIL`,
  `ISOLE`) sont le résultat de `sonde-rouler-foret.cjs` (le vrai joueur, en
  ligne droite, arrêts par cause) : seuls les arrêts DANS les massifs restent,
  et c'est voulu — on les contourne. Steppe, savane et toundra n'y passent
  pas. `foret()` (la carte) lit la même fonction.
- **UNE RÈGLE QUI RETIRE DES ARBRES SE PROUVE PAR CE QU'ELLE NE FAIT PAS** :
  aucun arbre ajouté, les massifs identiques arbre pour arbre, le sol bloc
  pour bloc, contre `clairieres: false` (drapeau de `CONF_NEUF` seule ;
  `CONF_V308` le porte à faux, `CONF_AVANT` ne le connaît pas).
- **UNE NOUVELLE RÈGLE D'ARBRES A SA DATE À ELLE, PAS CELLE D'AVANT.**
  Relever `DATE_CLIMATS` aurait rendu aux morceaux bâtis entre la v345 et
  aujourd'hui les arbres d'AVANT les climats — donc AJOUTÉ des arbres en
  steppe, savane et maquis près de ce qu'un enfant a bâti. `DATE_CLAIRIERES`
  et `morceauxAvantClairieres` gardent les arbres du jour même ; la date se
  relit à la fusion (v309). L'empreinte des 490 morceaux se prouve bosquets
  désarmés.
## Les feux de bord (v533) — ce qui brille sans éclairer partage la matière de la flamme

Revue d'écran, lignes 4, 7 et 8. Trois règles.

- **UN FEU QUI S'ALLUME EN JEU PREND `matiereAdditive` (avions.js).** La
  flamme (v264), les feux de navigation et les phares (`src/phares.js`) ont
  les MÊMES réglages de matériau, donc la même clé de programme, chauffée à
  l'accueil avec la flamme (v491) : aucun programme ne naît à l'allumage, par
  construction, et le témoin lit les clés (v363). Aucune lampe ponctuelle
  (v248). Un feu neuf avec un autre réglage (opaque, une carte, un autre
  côté) est une clé neuve : il se chauffe, ou il prend cette fonction.
- **UN FEU SE MESURE SUR LE MODÈLE, IL NE S'ÉCRIT PAS (v230).** Les feux de
  navigation sont posés par `fini` sur les sommets extrêmes du modèle (gauche,
  droite, queue), AVANT les flammes ; les phares sur les blocs optiques nommés
  de la flotte, sinon les deux tiers de la demi-largeur, au sommet le plus en
  avant de la bande — une fois par modèle. Nés cachés ; `fun.js` les allume
  aux commandes (phares : selon `nuitDehors`, passé par `initFun`) et la
  descente les éteint, comme la flamme.
- **CE QUI HABILLE LA MANETTE NE PREND PAS LE DOIGT.** Le mot et les chevrons
  sont des enfants de `#gaz-base` en `pointer-events: none`, le curseur aussi :
  `elementFromPoint` rend la manette en tout point de sa course, et sa capture
  de pointeur (v262) n'a rien devant elle. En construction, Poser, Casser et
  Sauter ont le même x, et l'outil actif est un ANNEAU sur le voile, jamais un
  fond blanc.

## Les commandes simplifiées (v494) — une main pour bouger, une main pour agir

Max : simplifier les commandes en jeu, puis sur la maquette « plus de
transparence, moins de texte ». Cinq règles.

- **UN MENU REMPLACE LES PETITS BOUTONS, IL NE LES RÉÉCRIT PAS.** Pause, sac,
  réglages, maison, caméra, messages, joueurs, souvenirs, photo restent dans la
  page avec leurs gestionnaires ; la classe `hud-simple` les ôte de l'écran, et
  chaque ligne du menu (`LIGNES`, commandes.js) APPUIE le bouton d'avant après
  avoir rendu la partie. Un témoin qui touche `#home-btn` ou `#cam-btn` par son
  `id` les trouve toujours ; `REMPLACES` liste ce que le menu remplace, et un
  témoin de maj.js exige une ligne par bouton. Une ligne que le jeu n'offrait
  qu'en ligne (caméra, messages) ne s'offre que si son bouton était affiché :
  un bouton qui ne fait rien est pire qu'un bouton qui refuse (v228).
- **LE MENU MET EN PAUSE SANS QUITTER LA PARTIE.** Il pose `running` à faux,
  sans l'accueil ; « Reprendre » le rend (au toucher et en glisser, `running` ;
  sinon `startGame`, qui reprend la souris). Il ne s'ouvre ni pendant un quiz
  ni pendant l'arrêt du jour (invariant 2).
- **CONSTRUIRE EST UN MODE QU'ON CHOISIT.** Hors construction, sur tablette, la
  barre de blocs, le réticule et la pioche s'effacent, et toucher l'écran ne
  pose ni ne casse rien (`touchAction`) : on regarde autour de soi sans abîmer
  le monde. Poser et Casser sont deux boutons ; `#mode-btn` reste caché, et sa
  bascule les tient d'accord. Monter dans un véhicule termine la construction.
  Le bureau (souris) ne change pas.
- **QUATRE BOUTONS D'ACTION AU PLUS, UNE SEULE PILULE.** Explorer : la pilule,
  Voler, Sauter, Construire ; en vol (`en-vol`) Descendre s'ajoute, et c'est
  Construire qui se tait tant qu'une pilule est là — pas la pilule : un témoin
  qui plane au-dessus d'une voie doit voir « Monter à bord » (mon premier jet
  faisait taire la pilule en vol, et le portail l'a dit). En construction :
  Poser, Casser, Sauter (et Descendre en vol). Monter passe devant « à bord », qui passe devant nourrir (`:has()`) :
  deux pilules côte à côte se coupaient. Tout est à droite de 55 % de la vue
  (v272). *(La barre de blocs vivait dans la file du haut (v445) ; la v503,
  décision de Max, la remet EN BAS — voir « La barre de blocs en bas ».)*
  **En vol, Monter est au-dessus de Descendre (v510, Max)** : à pied comme
  en construction, Sauter (qui fait monter) prend la place haute de sa
  colonne et Descendre la basse ; un témoin de `maj.js` compare leurs hauts.
  Tout bouton qui gagne un contraire (monter/descendre) se range dans le sens
  du geste.
- **LE VERRE SE RÈGLE SUR LE CONTRASTE, PAS SUR L'ŒIL.** Un voile sombre à 0,30
  (`--hud-voile`) est ce qu'il faut pour qu'une icône blanche tienne 3:1 sur le
  ciel de midi ; les pilules qui portent du texte sont claires (encre sur verre
  clair), lisibles le jour comme la nuit. Le témoin compose les fonds
  translucides sur la couleur du ciel que le jeu dessine, à midi et à minuit
  (v276). Le mot des boutons ronds vit dans `aria-label` et dans `.lb`,
  VISUELLEMENT caché — jamais `display: none`, que des témoins lisent. Cette
  décision annule « chaque bouton porte son mot » (v265) : c'est Max qui l'a
  prise, sur la maquette.

## Les feux de détresse sur la tôle (v519) — une lumière de modèle se pose par un rayon, jamais par une cote

Max, capture de Lille de nuit : des boules orange autour d'une voiture de la
rue heurtée. Trois règles.

- **CE QUI S'ACCROCHE À UNE VOITURE DE LA FLOTTE SE MESURE SUR LE MODÈLE
  (v230).** Quatre sphères à cotes fixes pour cinquante-sept modèles : 172 feux
  sur 228 dans le vide. `posesDetresse` (vehicules.js) lit les blocs optiques
  nommés (`RE_FEU`), sinon la boîte, puis un rayon venu de l'extérieur trouve
  la tôle ; la lentille est plate, à fleur, redressée vers l'axe, et rien ne
  doit la masquer de face (sous un aileron, on cherche ailleurs). Mémorisé par
  modèle. Le prochain objet posé sur une carrosserie se pose ainsi.
- **UNE BOÎTE ENGLOBANTE NE DIT PAS SI UNE LUMIÈRE FLOTTE.** Ma première sonde
  rendait 12 modèles sur 57 « hors de la boîte » : une sphère au-dessus du capot
  d'une voiture basse est DANS la boîte. La grandeur juste est le rayon le long
  de la normale du feu jusqu'à la tôle (`sonde-detresse.cjs`, et le témoin de
  `degats.js` le refait).
- **CE QUE LA RUE FAIT D'UNE VOITURE HEURTÉE, L'AMI LE FAIT AUSSI.** Un
  `rue_choc` reçu marque la voiture de ce nom (`userData.heurteRecu`), que le
  convoi lit comme son propre choc : elle s'arrête et clignote chez lui. La
  lentille se chauffe à l'accueil (`chaufferLesFabriquees`).

## Des icônes, pas d'emojis, et un jeu qui se tait (v504) — un message en jeu est une exception déclarée

Max : « les icônes ne sont pas suffisamment claires… enlève les emojis sur les
boutons… enlève les messages qui s'affichent dans le jeu ». Cinq règles.

- **UN MESSAGE PENDANT LA PARTIE EST UNE EXCEPTION, ET ELLE SE DÉCLARE.** Trois
  familles seulement : ce que l'invariant 2 impose (le quiz, le parent), ce qui
  dit QUOI FAIRE quand une action est refusée ou que l'enfant est bloqué, et
  l'indispensable à plusieurs. Tout le reste — météo, saison, cris, compagnons,
  panneaux, montées et descentes, GPS, records, arrivées — est retiré.
  **Un ÉTAT affiché n'est pas un message (v516)** : la pilule `#etat-pose`
  (« Atterrissage vers <ville> », « Atterrissage sur place », « Remise des
  gaz »), décision de Max, dit ce que fait l'avion tant qu'il le fait, sous le
  cadran dans `#file-centre`. Sa règle est pure (`etatDePose`, approche.js) ;
  la ville se lit dans la fiche de l'aérodrome (`ville`, ou le nom avant le
  tiret, `villeDeLAerodrome`). Un état neuf de ce genre se range là, jamais en
  `toast(`. La table
  `PERMIS` de `tests/fumee.js` compte les `toast(` fichier par fichier : un
  message neuf s'y déclare avec sa raison, ou il rougit. Le bandeau de lien
  (`alerte`, état de la connexion) n'est pas un message : il reste.
- **ON RETIRE L'APPEL, JAMAIS LE MÉCANISME.** `bandeau.js` reste (v285) ; la
  pluie tombe, les records s'écrivent, la visite d'un monument se compte
  (`guides.journal`), le poste de l'usine se suit (`__posteUsine`). Un crochet
  qui portait un message (`say`, `annonce`, `dire`) devient une fonction vide :
  aucun module ne plante parce qu'il parle à personne.
- **UNE ICÔNE SE DESSINE ICI, AU TRAIT ÉPAIS.** `ICONES` (commandes.js, sans
  import) : SVG en ligne, trait de 2,2 au moins sur 24, aplats pour les
  silhouettes (l'aile de Voler, l'avion qui décolle ou se pose). Ni police
  d'icônes ni réseau (hors ligne), aucun dessin emprunté (invariant 4). Cette
  règle annule le « trait fin » de la v494 ; le contraste de la v494 tient.
- **PLUS UN EMOJI SUR UN BOUTON, ET CE QU'IL IDENTIFIAIT PASSE AU MOT.** Une
  pilule s'écrit `avecIcone(clé, mot)` : l'icône ne porte aucun caractère, le
  mot reste du texte. Ce que l'emoji disait (quelle bête, quelle ligne) passe
  au mot (« Monter · Cheval »), à `data-quoi` (pour les témoins) et à la
  pastille dessinée de la ligne (`pastille`). Les émotes, qui SONT des emojis,
  sont l'exception ; ✕ et les flèches typographiques ne sont pas des emojis.
- **UNE ICÔNE DE BASCULE DIT SON ÉTAT, ET SE JUGE À LA TAILLE DU POUCE
  (v514).** La roue du train se lisait comme une cible à 20 pixels, et ne
  changeait pas quand le train rentrait. Une commande à deux états a deux
  dessins (`train` / `trainRentre`), échangés là où le mot change (main.js),
  et l'état passe aussi dans `aria-label`. Une icône qui doit se reconnaître
  à la silhouette peut prendre plus de place dans son bouton : `.ic` est figé
  à 20 pixels (index.html), on le libère pour ce bouton-là. On juge sur une
  capture à 430 × 932, jamais sur le SVG seul.
- **UN TÉMOIN NE LIT PAS UN PICTOGRAMME.** `startsWith('⬇️')`, `includes('🐘')`,
  `/🟠/` sont devenus `includes('Descendre')`, `quoi === 'elephant'`,
  `/Orange/.test(quoi)` : on cherche l'emoji retiré dans `tests/` avant de
  lancer le portail, et l'on repointe vers le mot.

## La carte du monde se ferme au jeu (v508) — un panneau plein écran cache le HUD, il ne compte pas sur son z-index

Deux règles.

- **UN PANNEAU QUI PREND L'ÉCRAN CACHE LE HUD DE JEU, PAR UNE CLASSE DU
  `body`.** La carte (z-index 14) passait sous la pilule « Monter » (30) : un
  doigt qui visait un bouton de la carte montait sur l'âne. Remonter la carte
  au-dessus de tout l'aurait mise au-dessus du quiz (invariant 2) ; on cache
  donc le HUD (`body.carte-ouverte`, `visibility` et jamais `display`, que des
  témoins lisent). Le menu ☰ voile le même HUD (`:has(#menu-jeu.ouvert)`,
  opacité, pas de flou). Le témoin demande `elementFromPoint` au centre de
  chaque bouton du panneau, une bête devant soi : un élément neuf du HUD posé
  au-dessus de 14 doit entrer dans la liste, ou il rougit. **Et une liste de ce
  qu'on cache se relit contre ce qui vit DANS le panneau** : le bouton trésor de
  `fun.js` est inséré dans `#map-outils`, et mon premier jet le cachait avec le
  HUD. Le témoin l'a laissé passer, parce qu'un bouton caché rend le doigt à la
  fiche : il exige désormais que le doigt tombe sur LE bouton visé, visible.
- **LA PEAU DE LA CARTE EST CLAIRE, SON DESSIN NE CHANGE PAS.** La matière
  claire (v276) ne touche que la fiche, la recherche, les boutons, la légende ;
  le canvas garde ses couleurs, que les témoins de `carte.js` lisent en pixels.
  Les icônes de la fiche viennent d'`ICONES` (`chercher`, `appui`), posées par
  `main.js` ; la légende dessine ses repères en CSS, aux couleurs du canvas.
## Les textes de la revue d'écran (v522) — un nom affiché est en français, un état n'est pas une alerte

Trois règles.

- **UN NOM DE BLOC SE TRADUIT, SON IDENTIFIANT JAMAIS.** `BLOCK_INFO[id].name`
  n'est lu que pour l'affichage (titre de case, nom sous le réticule, ligne
  « visé » du diagnostic) ; aucune sauvegarde, aucun message réseau ne le porte.
  Un témoin de la fumée refuse tout nom anglais de la palette.
- **UN ÉTAT CALME PREND LE VERRE CLAIR.** Le bandeau de lien a trois tons :
  `grave`, ocre par défaut, et `calme` (encre sombre sur verre clair, une ligne)
  pour ce qui n'est pas une panne — seul dans un monde en ligne. Il garde sa
  croix et reste un bandeau d'état, hors de `PERMIS` (v504).
- **UN TEMPS LIBRE SE DIT EN HEURE DE FIN, JAMAIS EN MINUTES.** `texteLibre`
  (education.js, pur) arrondit au quart d'heure INFÉRIEUR — on ne promet pas
  plus que ce qui reste —, borné par la limite du jour. Le décompte reste en
  temps joué (invariant 2). Une croix de badge fait 44 px.

## Le ménage des restes (v517) — on inventorie avant de retirer, et un mot retiré se garde

Max : « supprimer toutes les musiques inutiles… les trucs qu'on a supprimés ».
L'inventaire (main.js et sons.js sont les seuls à faire du son) n'a trouvé
aucun son orphelin : on ne retire pas un son dont le déclencheur vit, et le cor
du siège, qui sonne encore sans bandeau depuis la v504, est une question posée
à Max, pas un retrait. Les restes étaient des PHRASES de personnages. Un témoin
de `fumee.js` lit les chaînes du jeu (une chaîne sans espace est une clé, pas
un texte) contre une liste de mots de fonctionnalités retirées : un mot neuf
s'y ajoute le jour où l'on retire la fonctionnalité qu'il nomme.

## La barre de blocs en bas (v503) — une décision de Max annule une règle, et la règle se redit en relatif

Max : « le mode construction, ça va pas du tout. On affiche les briques dans une
toute petite zone. Ça devrait être en bas. Et le bouton terminer prend beaucoup
trop de place. » (La place de « Terminer » a changé en v520, voir la troisième
règle.) Mesuré avant : cases de 30 px dans la file du haut, une pilule
« Construction · Terminer » de 188 px. **Cette décision annule celle de la
v445/v494 pour la barre de blocs** (« en haut, elle mordait le quart du
joystick »). Trois règles.

- **EN CONSTRUCTION, LA BARRE EST UNE BANDE EN BAS, PLEINE LARGEUR.** Cases de
  50 px (au moins 44, un doigt d'enfant), défilement au doigt (`overflow-x`,
  `touch-action: pan-x`) ; le DOM ne bouge plus (main.js ne la déplace plus
  dans `#file-centre`), seule la feuille de style la pose, et seulement sur
  tablette (`tactile.construction`). Le bureau ne change pas.
- **LE JOYSTICK GARDE LE QUART AU-DESSUS DE LA BARRE.** La règle de la v272 se
  dit désormais : en construction, rien du DOM qui prend le doigt entre 40 % de
  la hauteur et le haut de la barre, à gauche de 45 % — c'est le canvas qui
  reçoit le doigt (sonde `elementFromPoint` en grille), et ce doigt fait
  marcher l'enfant. Tout ce qui vivait au ras du bas (Poser, Casser, Sauter,
  Descendre, l'anneau du joystick au repos) monte de `--bande-blocs`. Un
  élément neuf posé en bas en construction se cote sur cette variable.
- **ON SORT PAR LÀ OÙ L'ON EST ENTRÉ (v520, décision de Max, qui annule le
  bouton rond à coche en haut au milieu de la v503 : « pas très clair, et mal
  placé »).** En construction, `#construction-fin` (id gardé, des témoins le
  touchent) est une tuile claire de 56 px À LA PLACE de Construire, au bout de
  la barre de blocs : le cube barré d'une croix (`ICONES.terminer`, jamais une
  coche) et le mot ÉCRIT dessous (`.lb` visible ici, 4,5:1), le mot aussi dans
  `aria-label`. La barre lui laisse sa place (`--fin-l`) et garde six cases
  entières à 420 px. Le témoin exige le recouvrement des boîtes avec celle de
  Construire, sans dimension.

## On entre dans Sainte-Sophie (v493) — un monument visitable se choisit sur la carte du MONDE

Deux règles.

- **ON CARTOGRAPHIE LE MONDE BÂTI, PAS LE BÂTISSEUR, AVANT DE CHOISIR.** Le
  Colisée se lisait très bien dans `monuments.js` (arcades, arène, gradins) ;
  la carte ASCII des colonnes praticables autour du repère, dans le monde, a
  montré l'inverse : ses trous sont des blocs NON POSÉS (`c.blocs.delete`), donc
  la ville passe à travers — des immeubles dans l'arène —, et l'emprise du
  catalogue, onze fois trop grande, contient le Forum. Déclaré dans `TASKS.md`.
- **UN MONUMENT VISITABLE GARDE SON DEHORS AU BLOC PRÈS.** On vide l'intérieur
  (`AIR` posé, jamais un bloc retiré) dans le `tour`, jamais dans le `build`
  que lisent les mondes figés ; la table d'étirement fait la hauteur de la nef
  (couches 1 à 5 → 1 à 11 à Sainte-Sophie). Retirer des cellules pleines aux
  couches 1 à 3 peut ouvrir un anneau de voitures (`contreUnMonument`) : on
  compare `anneauxDeVille` avant et après (identiques ici).

## La flamme se chauffe (v491) — ce qui naît caché compile à son premier geste

Une règle. three ne compile un programme qu'à la première image où il le
DESSINE : un objet né invisible (la flamme des réacteurs, v264) compilait dans
l'image du geste qui l'allume — le premier ✈️. Tout matériau neuf porté par un
objet né caché se rend une fois pendant l'accueil (`flammeDeChauffe`, appelée
par `chaufferLesFabriquees`, vehicules.js), et son témoin lit les CLÉS après le
VRAI geste (la manette des gaz aux commandes), vérifié rouge chauffe désarmée.
Un objet fait de `matiereVivante` (l'escalier, v389) ou des essaims des dégâts
(l'épave) n'en a pas besoin : mesuré, zéro clé.

## Cinq villes passent à la fiche (v492) — une ville du gabarit se détaille par-dessus son gabarit

Lot 1 de « cinquante villes détaillées ». Quatre règles.

- **LA FICHE DÉTAILLÉE SE POSE SUR LE GABARIT, ELLE NE LE REMPLACE PAS.**
  `FICHES_DETAILLEES` (villesmonde.js) ajoute à `ficheGeneree` ce qui fait la
  ville — fleuves, pierre, jardins, monuments, lieux, en latitude et longitude
  réelles (`versFiche`, `local`) — et garde le reste : rayon du registre (la
  découpe hors villes ne bouge pas), trame, anneaux, côte automatique. Tout
  ce qui n'est pas écrit reste au bit près ; un `ang` ne s'écrit que s'il
  diffère vraiment (Melbourne : la grille de Hoddle à 0,34, le gabarit tirait
  déjà 0,35 — on ne change pas le sol pour un centième).
- **UN MONUMENT DE VILLE ENGENDRÉE TIENT SA ZONE DANS CELLE DE LA VILLE.** La
  zone à terre d'un repère (`box + 30`) entre dans `dansUneZoneATerre` : hors de
  `r + 24`, elle change `terrainHeight` au-dehors du disque (invariant 1). Donc
  `d + box + 30 ≤ r + 24`, et le témoin de `carteMonde.js` le lit. Un fleuve,
  lui, ne touche le relief que sous `r + 14` par construction
  (`hauteurVillesMonde`) : mesuré, 2 708 colonnes, toutes dans les disques.
- **UNE ENCEINTE NE VIDE PAS SA COUR : UN JARDIN LE FAIT.** Un repère ne pose
  que ses propres blocs ; les immeubles de la trame restaient debout dans le
  château de Nantes (vu en capture, lu au bloc). Le sol se libère par un parc
  de la fiche (`pelouse` pour des douves, sans un arbre sur quatre).
- **UN RAYON DE VILLE SE LIT APRÈS `fabrique`.** J'ai d'abord compté les
  disques en kilomètres sur le rayon de `villes200.js` divisé par l'échelle
  (0,6 à 1,2 km) ; `f.rayon` vaut 1,8 fois ce rayon, et les disques font 1,1 à
  2,2 km. Une contrainte de placement se mesure sur la fiche fabriquée, jamais
  sur le registre brut — c'est la leçon de `r: 66` à San Francisco (v192).

Et un bâtisseur générique ne dit vrai que pour sa forme (une arche, une
enceinte, une aiguille) : le Capitole de Toulouse et Saint-Sernin restent des
LIEUX tant qu'ils n'ont pas leur bâtisseur — jamais une coupole de gabarit
(v369).

## La couronne lointaine du palier « Loin » (v497) — on voit plus loin par une grille plus lâche, pas par plus de monde

Deux règles.

- **VOIR PLUS LOIN NE SE PAIE PAS EN MORCEAUX.** `rr`, la file, `hdMo` et
  `VITESSE_JET` du palier `haut` sont des chiffres mesurés nuisibles (v269,
  v291, v299) : on ne les touche pas pour la portée. Le paysage lointain lit
  `terrainHeight`, pure ; une SECONDE grille (`PAS_LOIN` 32, horizon.js) le
  prolonge jusqu'à `loin` (2 560 blocs, dans la fiche de `haut`, palier.js), et
  le brouillard et le plan lointain de la caméra reculent avec elle. Tripler la
  grille fine aurait coûté neuf fois ses sommets ; la couronne coûte ce que
  coûte une grille fine d'iPad (3,4 Mo). Un palier qui ne porte pas `loin` ne
  construit rien, et un témoin de `maj.js` lit la SCÈNE (brouillard, plan
  lointain, objets nommés) pour le garder.
- **DEUX GRILLES QUI SE RECOUVRENT : LA FINE GAGNE, PAR CONSTRUCTION.** La
  couronne ne dessine aucune case entièrement dans le carré de la fine, et là
  où elles se recouvrent (le pas de trente-deux ne tombe pas sur le bord) elle
  est posée `ABAISSE_LOIN` blocs plus bas et dessinée après : jamais de trou
  de ciel entre les deux, jamais la grossière par-dessus la fine. Au-delà de
  sa portée le brouillard est plein, elle n'y dessine rien.
## Le lointain très lointain (v518) — une grille de dedans qui a sa portée ne cède que son disque

Max : « le mode Loin n'est pas assez loin ». Trois règles.

- **ON AJOUTE UN ÉTAGE, ON N'ÉLARGIT PAS LE PRÉCÉDENT.** La couronne de
  trente-deux garde 2 560 blocs ; une troisième grille de cent vingt-huit
  (`PAS_TRES_LOIN`, horizon.js) porte jusqu'à `loin` (10 240, fiche `haut`).
  Prolonger la couronne aurait coûté seize fois ses sommets ; l'étage coûte
  une couronne (25 921 sommets, 3,2 Mo, mesuré). `rr`, file, `hdMo`,
  `VITESSE_JET` ne bougent jamais pour la portée (v497).
- **UNE GRILLE DONT LA GRILLE DE DEDANS A UNE PORTÉE NE LUI CÈDE QUE CE QUE
  SON DISQUE COUVRE À COUP SÛR.** La fine dessine tout son carré ; la couronne
  s'arrête à son disque. Céder le carré entier laisserait les coins (au-delà
  du disque) en ciel vide : on ne cède une case que si ses quatre coins sont à
  moins de `rayon − pas` du joueur. Le témoin de `plafond.js` compte les trous
  devant soi entre 2 200 et 3 800 blocs (zéro).
- **L'ABAISSEMENT SUIT LA PRÉCISION DU TAMPON DE PROFONDEUR.** À 2 560 blocs,
  avec un plan proche à 0,1, un pas de profondeur vaut ≈ 3,9 blocs : la
  troisième grille est seize blocs sous la couronne (`ABAISSE_TRES_LOIN`),
  comme la couronne deux sous la fine. `?loin=2560` rend la v504 au sommet
  près.

## Le lointain défile et a ses arbres (v553) — un index de grille désigne des sommets, pas des cases du monde

Deux règles.

- **CE QUI DÉFILE DÉFILE EN ENTIER.** `maj` (horizon.js) décale hauteurs,
  sommets et couleurs d'une case tous les huit blocs ; l'index de triangles,
  lui, n'était refait qu'à la découpe (quatre par seconde), et entre deux il
  désignait les sommets d'à côté : la zone omise glissait hors du disque
  maillé — la bande de ciel du relevé n° 19, large de ce qu'on vole en un
  quart de seconde. `decalerDecoupe` décale l'index avec les sommets. Trouvé
  par une image à fond magenta et un rayon par pixel
  (`sonde-trou-horizon.cjs`) : chaque pixel de ciel tombait sur une case non
  maillée que l'index omettait, `glisse` ≠ 0. Tout tampon tenu en coordonnées
  de grille (index, mais aussi tout tableau par sommet qu'on ajoute) passe par
  le défilement, ou il ment entre deux découpes.
- **LES ARBRES LOINTAINS SONT DU BÂTI LOINTAIN.** Une silhouette par case
  boisée de la grille fine (`opts.arbres`), posée à la découpe par la question
  de la carte (`world.foret`, le bruit de `treeAt` et `bosquet`) — jamais sur
  un morceau maillé, jamais en ville ni sur l'eau. Même matériau que le bâti
  (`materiauBati`) donc même programme, chauffé à l'accueil
  (`chaufferLeLointain`, vers l'écran et la cible des reflets). Coupés en
  rendu logiciel (`ARBRES_LOIN`, main.js), et alors ni lus ni posés ;
  `?arbresloin=1` les force. Les grilles lointaines (couronne, très lointain)
  n'en portent pas : à mille blocs un arbre fait un pixel. La fidélité se
  mesure colonne par colonne contre `treeAt`, jamais à l'œil.

## La sûreté garde le lointain (v532) — un disjoncteur ne retire que ce qui coûte ce qu'il protège

Max : « on ne voit pas du tout quatre fois plus loin ». Deux règles.

- **AVANT DE CHERCHER POURQUOI UNE FONCTIONNALITÉ NE SE VOIT PAS, ON LIT CE
  QUE L'APPAREIL JOUAIT.** `journal_appareil` : « Loin » choisi, `moyen` par
  sûreté depuis la v509 — la couronne (v497, v518) n'avait JAMAIS tourné sur
  l'iPhone de Max. C'est la régression de réglage de la v291 une fois de plus,
  et deux livraisons l'ont portée sans que rien ne le dise. La fiche porte
  désormais `loin` (la portée de la vue).
- **LA SÛRETÉ DESCEND LES MORCEAUX, PAS LE PAYSAGE.** Sous une étendue
  choisie, `palierRetenu` garde le `loin` de cette étendue : la couronne lit
  `terrainHeight` et ne fabrique aucun morceau, et aucun plantage de l'appareil
  n'a tourné avec elle. Le prix est mesuré (+47 000 triangles, +5,2 Mo à
  rr 12). Le jour où une étendue gagne un réglage, on se demande s'il coûte ce
  que la sûreté protège (des morceaux, de la mémoire de façades) ; sinon il
  survit à la sûreté.

## Le garde-manger retiré, la minicarte à gauche (v518)

Deux règles.

- **UN RETRAIT SE PROUVE PAR LE TRAJET DE L'ENFANT.** Le témoin de la pastille
  🍖 devient un témoin de retrait : on frappe une bête jusqu'à la fumée, rien
  n'apparaît, rien ne se compte, et la clé `web-minecraft-meat-v1` reste
  intacte (v256). Le champ `meat` des fiches d'espèces, que seule la récolte
  lisait, est parti avec elle.
- **CE QUI S'OUVRE SOUS UN BOUTON DE LA COLONNE DE GAUCHE PREND SON X.** La
  minicarte s'ouvre sous le bouton carte (`--sous-carte`, `--rail-x`) ; ce qui
  vivait sous la carte (les émotes) descend de `--minimap-w`, et la file
  centrale (v445) la contourne par la même variable. Le témoin est formulé
  sans dimension et joué à 430 × 932 et 420 × 760. *(Depuis la v540 la
  minicarte n'a plus de bouton : elle prend sa place — voir ci-dessous.)*

## La minicarte toujours là (v540) — ce qui s'affiche toujours se paie en vol, et un raccourci de peinture garde ses états

Max : « mettre la mini-carte toujours visible ». Trois règles.

- **L'AFFICHAGE SUIT L'ÉTAT DU JEU, PAS UN BOUTON.** `minicarteVoulue()`
  (main.js) : l'accueil fermé, ni carte du monde ni quiz ouverts (invariant 2) —
  et pas `en-jeu`, qui exige le bouton pause, jamais affiché au bureau souris
  verrouillée (le portail l'a dit par deux témoins de pages de bureau) ;
  `majMinicarte()`, appelée à chaque image, ne touche au DOM que si l'état
  change. Le bouton carte quitte l'écran (`hud-simple`), la minicarte prend sa
  place (`--haut-rail`) et la toucher ouvre la carte du monde ; le bouton,
  appuyé quand même, l'ouvre aussi (v228). Un témoin qui ouvrait la minicarte
  par `#map-btn` la trouve déjà là : `banc.ouvrirLaCarte` touche la minicarte.
- **UN ÉTAT QUI CHANGE PAR UN GESTE S'ÉCRIT DANS LE GESTE, PAS À L'IMAGE
  SUIVANTE (v551).** Lue seulement dans la boucle, la minicarte attendait la
  fin de la première image de la partie — la plus lente, 1,7 s sur l'iPad du
  banc — et tout ce qui se range contre elle (le badge du temps libre,
  `minicarte-ouverte`) restait à sa place d'avant : le badge la recouvrait.
  `startGame`, le repli au glisser et le verrou de la souris appellent
  `majMinicarte()`. Le témoin neutralise `requestAnimationFrame`, touche
  « Jouer » et lit la minicarte dans la même tâche : une intermittence se
  provoque (v233).
- **CE QUI S'AFFICHE TOUJOURS SE MESURE LÀ OÙ IL COÛTE LE PLUS : EN VOL.**
  Pleins gaz, le bord neuf (v233) coûtait ~100 ms de fil principal par
  seconde. Une bande neuve de trois blocs ou plus se peint en esquisse un point
  sur quatre (`carteReel` 2), les bandes de la v258 la remettent au propre ; un
  point peint d'après le relief dont le morceau est encore absent n'est pas
  repeint ; l'`ImageData` du fond est réutilisée. ~35 ms par seconde, cadence
  identique avec et sans (`sonde-minicarte-cout.cjs`, `?minicarte=0`).
- **UN RACCOURCI QUI SAUTE UN ÉTAT DOIT DISTINGUER « PAS ENCORE PEINT ».** Mon
  premier jet sautait tout point marqué 0 (« peint d'après le relief ») ; un
  raster neuf, rempli de zéros, n'était donc jamais peint — fond de nuit après
  chaque saut, vu en capture et pas au témoin. Un raster neuf se marque 3 (pas
  peint), et le témoin de `carte.js` saute de 4 000 blocs et lit les pixels.
- **CE QUI SE CENTRE SUR L'ÉCRAN SE CENTRE À DROITE DE LA MINICARTE.** Le
  badge du temps libre (v522, 169 px) touchait le bord de la minicarte à
  430 px de large : il se centre sur l'espace à sa droite
  (`(100vw + --rail-x + --minimap-w) / 2`). Un élément neuf posé en haut au
  milieu entre dans la liste du témoin de `carte.js`, ou il rougit.
  Et sur téléphone, une règle de `padding` en raccourci écrasait la place de
  sa croix (« 21 h 1✕ ») : un élément qui réserve une place à un bouton se
  relit dans les `@media` qui réécrivent son `padding`.

## ✈️ se pose devant (v502) — une approche assistée va là où le nez pointe

Max : « quand on clique sur se poser, il devrait se poser sur la direction
qu'on vise dans le radar et pas sur là où on vient ». Une règle.

- **LA PISTE CHOISIE EST CELLE QU'ON VISE, PAS LA PLUS PROCHE.** La plus
  proche, juste après un décollage, c'est l'aéroport de départ, derrière
  l'avion (87 trajets sur 126 entre aérodromes voisins faisaient demi-tour,
  mesuré). `pisteVisee` (approche.js, pure) prend l'aérodrome le plus proche
  dont le centre tombe dans le cône du cadran (`CONE` et `capVers` de cap.js,
  jamais une seconde convention), jusqu'à `PORTEE_DEVANT` ; un aérodrome
  qu'on survole n'est pas « devant ». Sans rien devant, la règle d'avant
  (`pisteLaPlusProche`), puis la pose sur place (v261). Le jeu, la sonde
  (`sonde-approche.cjs`, départs rejoués cap sur la piste quand le nez en vise
  une autre, `/vise`) et le témoin lisent la même fonction. Le choix se fait
  une fois, à l'appui : il ne peut pas papillonner, et le cadran montre la
  piste de l'approche (v452).

## La fiche d'un garage suit ses murs (v487) — ce qui est rangé par position migre avec ses blocs

Deux règles.

- **TOUT CE QUI EST RANGÉ PAR POSITION À CÔTÉ DES BLOCS SUIT LA CHAÎNE DES
  MARCHES.** Un garage (`garages.js`) est une fiche rangée par son origine ;
  les marches de la carte emmenaient ses murs et laissaient la fiche. Chaque
  marche des blocs a sa marche des garages (`suivreGarages*`, world.js), jugée
  sur les blocs AVANT la marche correspondante : `migrerChaineCarte` les
  enchaîne pour le nuage, `migrerLesBlocs` pour le stockage (carte 8). Une
  marche de GROUPES (Paris doublé, fondu doux) se suit par le groupe, jamais
  par la colonne de l'origine : l'écart entre l'origine et l'ancrage, doublé
  par le plan, sortirait la voiture du garage. Le prochain objet rangé par
  position se branche là le jour où il naît.
- **UNE DATE DE BLOCS REND IDEMPOTENT CE QUI N'A PAS DE DATE.** La fiche n'a
  pas de date de pose : elle bouge si sa boîte porte des blocs d'avant la date
  (en avant), ou si elle est vide et que l'arrivée porte la date de la marche
  (l'orpheline, dont on retrouve le groupe arrivé et son ancrage par le centre
  arrondi). Dans le doute, elle reste — l'état d'avant, jamais pire.

## Changi (v486) — une ville qui n'existe que par sa zone n'a pas de terre autour, et un aérodrome neuf ne touche pas aux mondes figés

Deux règles.

- **LÀ OÙ LE PLANISPHÈRE N'A PAS LA TERRE, L'AÉRODROME LA GAGNE SUR LA MER PAR
  SA ZONE, ET C'EST TOUTE SA CASSE.** Singapour est un disque de terre au
  milieu de la mer : la zone à terre de la ville. Un repère a la sienne
  (`box + 30`) : celle de Changi fait son île, comme le vrai est bâti sur des
  remblais. Les cinq promesses de la v223 se lisent SUR le monde qui porte la
  zone (la sonde construit un `World` dont `conf` ajoute le repère) ; mesurées
  sans elle, elles ne trouvent rien, et c'était la dette. Le prolongement de
  piste vers le large est une digue dans les bornes du remblai (le fond de la
  mer est à 21–27, la piste à 35).
- **UN AÉRODROME NÉ APRÈS UNE CASSE N'ENTRE PAS DANS LE MONDE QUI LA JUGE.**
  `NES_APRES_V306` (aeroport.js) le retire de `CONF_AVANT` (aérodromes ET
  repères) : `hauteurBase` et les marches 1 → 2, 2 → 3 et 5 → 6 y lisent les
  zones d'avant. `CONF_V308`, lui, le PORTE (il lit `AEROPORTS` et
  `LANDMARKS_V317`, même clé de zones que `CONF_NEUF`) : la marche 6 → 7
  compare ce monde à celui d'aujourd'hui, à portée du fondu de Singapour, et
  ne doit y lire que le fondu, jamais l'île. Aucune marche ne déplace donc un
  bloc à cause de Changi ; ce qu'un enfant aurait posé en mer à cet endroit
  garde ses coordonnées — dette déclarée dans `TASKS.md`.

## Les cubes orange du ciel (v484) — ce qui suit la caméra est UN objet, et il se trouve par le pixel

Une règle. Les « cubes orange qui flottent dans le ciel » étaient les feuilles
d'automne : un seul `Points` de cent soixante carrés, collé à `player.pos` de
−3 à +23 blocs, donc monté avec l'enfant en vol. La sonde de la v237 cherchait
« un petit maillage loin dans le champ » et ne pouvait pas le voir. Devant une
chose qu'on voit à l'écran et qu'on ne nomme pas : capture, amas de pixels de
sa couleur, lancer de rayon (`layers.enableAll()`) à travers chacun —
`sonde` dans le brouillon de la v484, une exécution. Un effet d'ambiance se
pose sur le MONDE (le sol, l'eau), jamais sur l'enfant : `BANDE_SAISON`
(main.js), basse pour feuilles, pétales et lucioles, haute pour la neige.

## De vraies feuilles d'automne (v531) — une ambiance vit sur SA colonne, et elle a une forme

Max, capture d'iPhone au volant : des carrés orange-jaune dans le ciel. C'était
encore le nuage de la v484 : un `Points` de carrés sans texture, de −1 à +9
blocs au-dessus du sol SOUS L'ENFANT. Mesuré au banc sur `origin/main` : 16
particules du champ sur 19 au-dessus de l'œil, et vu d'une caméra de voiture
(trois blocs du sol, cap à l'horizon) 126 à 1 228 pixels de l'effet sur fond de
ciel. Trois règles.

- **« À HAUTEUR D'ARBRE » N'EST PAS « SOUS L'HORIZON ».** Une bande au-dessus du
  sol de l'enfant se projette au-dessus de l'horizon dès qu'elle dépasse la
  caméra, et une caméra de poursuite est à trois blocs. Chaque particule vit
  sur SA colonne (`saisons.js`) : elle naît à moins de 3,4 blocs de ce qui la
  porte, tombe en planant, relit ce qui la porte quand elle change de colonne
  (sinon, quittant la cime d'un arbre, elle se pose en l'air), traverse le
  feuillage, se pose (sol, toit, eau), s'efface. Le sol se lit sur un morceau
  déjà engendré (`morceauxPrets`), jamais par un `getBlock` qui fabrique (v472).
  La neige seule tombe du ciel.
- **UNE AMBIANCE A UNE SILHOUETTE DESSINÉE ICI.** Feuille à nervures, pétale
  échancré, flocon à six branches, luciole à halo : un canvas au chargement,
  sans réseau (invariant 4). Un `InstancedMesh` de quads, la teinte par
  instance (`setColorAt` dès la naissance), Lambert (les feuilles s'éteignent la
  nuit ; la luciole est additive et hors correspondance tonale), aucune lampe.
  `chauffer` compile l'essaim pendant l'accueil (chaîne `pas` de main.js) — et
  un `scene.add` dans une scène de chauffe RETIRE l'objet de son parent : on
  l'y remet, sinon l'effet disparaît du jeu (vu au premier jet).
- **LE TÉMOIN LIT LES PIXELS SUR FOND DE CIEL, ET LA FORME PAR SA CARTE.**
  `sonde-saison-ciel.cjs` (lue par `monte.js`) trouve l'effet par sa forme
  (l'ancien `Points` de taille 0,24 ou l'essaim `saison-*`) : silhouette (plus
  de 30 % de texels transparents), écart de chaque particule à ce qui la porte
  (≤ 6 : une feuille qui tombe d'un talus garde sa hauteur), pixels ajoutés là où sans lui on voit le ciel (≤ 20). Trois rouges sur
  `origin/main`, verts ici. `?saison=` force la saison.

## Les voitures de la rue se rendent (v495) — un prototype se marque partagé là où il naît

Trois règles.

- **CE QUI NAÎT À LA DEMANDE SE REND QUAND IL QUITTE DURABLEMENT LE CHAMP.**
  Une voiture de convoi (v235) restait en scène toute la session, cachée :
  132 voitures et 3 595 maillages après quatre villes (`sonde-memoire-convois.cjs`).
  `Convoi.rendre(i)` la retire et la `liberer` à `MARGE_RENDRE` (cent blocs)
  au-delà de sa portée — la marge évite de rendre et refaire une voiture qui
  longe la limite. La PLACE reste (la grille horaire, v305 ; `pris` n'est pas
  touché) et se refait par tranches (v431) au retour. Un modèle qui arrive après
  le rendu ne s'accroche pas (`userData.rendue`).
- **UN PROTOTYPE CLONÉ SE MARQUE PARTAGÉ OÙ IL NAÎT, TEXTURES COMPRISES.**
  `clone(true)` partage géométries et matériaux : sans la marque, `liberer` sur
  une voiture (`retirer`, une monture qui s'en va) rendait la géométrie et les
  matériaux de TOUT le modèle, recompilés à l'image suivante. `chargerVoitureFlotte`
  appelle `partagerTout`, qui marque aussi les textures des matériaux ; tout
  clone qui veut une ressource à lui pose `partagee: false` (`repeindre`,
  `degats3d`). Le témoin exige les deux sens : tout ce qu'une voiture possède
  est rendu, RIEN du prototype ne l'est.
- **CE QU'ON REMPLACE DANS UN GROUPE SE REND.** La coque d'attente retirée à
  l'arrivée du modèle n'était jamais rendue — `g.remove` n'est pas `liberer`.
  `grep -n "g.remove(membre)" src/*.js` : la monture (`montures.js`) porte le
  même défaut, déclaré. Et l'estimation du journal (v426) ne compte que ce que
  la scène tient : une rue vide n'y montre plus les prototypes que le pilote
  garde (bornés à la flotte).

## Une voiture ne change pas de modèle sous les yeux (v547) — une place est habillée ou cachée, jamais en coque

Max : « on tourne la tête une seconde, on revient, et c'est un autre modèle ».
Trois règles.

- **CE QUI DOIT ÊTRE STABLE SE MESURE IMAGE PAR IMAGE, PAS SEULEMENT PAR NOM.**
  Le modèle et la laque d'une place étaient déjà des fonctions de son nom
  (`clé#rang`, v305) : la sonde du regard (`sonde-voitures-persistantes.cjs`)
  ne trouvait rien en comparant les noms. C'est le relevé image par image qui a
  nommé la coque d'attente — montrée à la naissance, remplacée une image à une
  seconde plus tard (21 sur 50 à Paris, 34 sur 53 à Rome, fichier déjà chargé
  compris : une promesse résolue rend la main après le rendu).
- **UN PROTOTYPE PRÊT SE LIT SANS PROMESSE.** `protosPrets` (vehicules.js) :
  la voiture s'habille dans l'image où elle naît. Sinon elle reste cachée
  (`userData.attente`, que `montrer` lit) ; la coque ne se montre que si le
  fichier manque, et elle est alors la voiture pour toute sa vie. Tout objet
  qui naît avec un remplaçant temporaire suit cette règle.
- **ON DEMANDE LE MODÈLE AVANT D'EN AVOIR BESOIN.** Un convoi demande les
  fichiers de ses `modeles` à `portée + traînée + MARGE_RENDRE` : une voiture
  qui entre dans le champ le trouve prêt (zéro cachée à moins de 18 blocs,
  mesuré). La laque se pose à la naissance, pas à l'habillage : une voiture
  empruntée avant son modèle garde la couleur de sa place.

## Le parapet sous la voie (v477) — une matière de tablier se lit sous la ligne qui roule

Une règle. Aux coins des anneaux, la voie d'une voiture traversait la bande de
pierre d'un tablier voisin (66 pas, vingt-sept villes) ; `pasHorsChaussee` les
compte « sur un tablier », donc aucune recherche de contour ne les voyait. Le
parapet est à la cote du tablier : là où la LIGNE d'une voie le traverse
(`colonnesDeVoie`, la règle du témoin, au demi-bloc), sa colonne est du bitume
— c'est la règle de la v457 (un changement de DESSIN qui garde la forme se
prouve par la forme), et elle précise la v414 : un tablier ne se retire pas, et
sa matière ne change que sous une voie. La sélection n'en dépend pas
(`EN_CALCUL`, les tabliers sont nuls pendant le calcul) ; le témoin de
`plafond.js` le prouve colonne par colonne, `reglageParapets.voie` à faux.

## Les tours de monument sur la voie de droite (v475) — un témoin de circuit lit la voie, pas l'axe

Deux règles.

- **UNE VOITURE D'AVENUE ROULE À 1,3 BLOC À DROITE DE SON TRACÉ, ET TOUT CE
  QUI JUGE UN CIRCUIT SE JUGE LÀ.** Depuis la v395 (`decalerADroite`,
  `DECALAGE_AVENUE` de main.js, `VOIE_DE_DROITE` de paris.js), le tracé d'un
  circuit n'est plus le chemin d'aucune voiture. Le témoin des monuments de
  Paris lisait l'axe et rendait zéro pendant que vingt-sept pas de carrosserie
  entraient dans les vitrines du tour de l'Opéra et des Invalides. Un témoin de
  circuit décale le tracé avec les fonctions de `vehicules.js`, jamais une
  copie ; trois autres lisent encore l'axe, déclarés dans `TASKS.md`.
- **UNE RUE TROP ÉTROITE POUR DEUX VOIES PREND UN SENS.** Le tour d'un monument
  fait quatre blocs ; deux voies de 2,26 en demandent près de cinq. Quand tous
  les circuits qui le prennent le font dans le même sens (`SENS_TOURS_PARIS`,
  calculé au chargement sur `CIRCUITS`), l'axe se déplace de ce qu'il faut
  pour que la voiture reste dans la rue — et pas plus : rentrer les quatre
  côtés de l'Opéra resserrait le virage et coûtait sa seconde voie au circuit
  de Rivoli (446 → 260 blocs de deux voies). Une retouche de tracé se remesure
  aussi en voies doubles (`sonde-rue-dense.cjs boulevards`), en raccords et en
  bus, pas seulement en pas de carrosserie. Un tour pris dans les deux sens
  garde son axe au milieu. Un circuit ajouté qui prend un tour à contresens le
  remet à deux voies tout seul — et le témoin le dira s'il touche une façade.
  Élargir la rue aurait changé le sol sous ce que les enfants ont bâti.
## Liberty Island et les feux de Manhattan (v496) — un ouvrage hors du rectangle se déclare à trois lecteurs

Quatre règles.

- **UNE PLACE SUR UN PLAN COMPRIMÉ SE MESURE PAR UNE SIMILITUDE, PAS UNE
  AFFINE.** Le plan de Manhattan n'a pas une échelle : le Midtown est comprimé
  autrement que le bas de l'île. Une affine à six paramètres, ajustée sur les
  repères du sud, plaçait la statue à 86 blocs d'écart selon qu'on prenait ou
  non la 14e Rue : elle extrapolait. Une similitude (rotation, échelle unique)
  sur les quatre repères du sud rend un résidu de 12 blocs ET l'angle de la
  vraie grille (−29,8°) — c'est ce second chiffre, qu'on ne lui a pas donné,
  qui la rend crédible. Le témoin refait la mesure (`ILE_LIBERTE`).
- **UN OUVRAGE HORS DU RECTANGLE DE MANHATTAN SE DÉCLARE À TROIS LECTEURS.**
  `generateChunk` le bâtit (`batirLiberte`, en blocs, `terrainHeight` intact) ;
  `maillageLocal` le garde sur le fil principal, sinon le worker (un `World`
  nu) maille la baie vide et ses blocs remplacent les nôtres (v251) ; la zone
  `active` du rendu le couvre (`dansBoiteLiberte`), sinon l'éclairage de la
  ville bascule à chaque pas sur l'île. Et ce que la portée des morceaux ne
  montre pas de la Battery a une silhouette lointaine PLUS PETITE que les
  blocs : ils la recouvrent en arrivant, sans rien à cacher.
- **À MANHATTAN, LES FEUX SONT DU PLAN, ET LA RÈGLE EST CELLE DU MONDE.**
  `feuxManhattan` (manhattan-plan.js) pose quatre feux par carrefour, sur les
  coins piétons, chacun glissé le long de SA file jusqu'à ce que sa position
  porte son axe (`axeDuFeu`) ; `ManhattanRenderer.feuxAutour` rend la liste
  que `main.js` donne à la circulation et aux passants (`feuxProches`) et
  allume les optiques avec `etatFeu`. Une nouvelle optique est un essaim AVEC
  couleur par instance : sans `setColorAt`, la clé de programme diffère
  (`instancingColor`) et l'entrée dans la ville compile (v246).
- **UNE BOUCLE SYNCHRONE D'`update` NE VOIT PAS UNE ATTENTE EN TEMPS RÉEL.**
  Le témoin de la marche au long cap (v354) fait avancer les passants de dix
  secondes de jeu d'un seul tenant ; un passant qui attend au feu y compte son
  attente en temps réel, qui n'avance pas — il restait au bord pour toujours et
  le débit tombait (0,53). Il sort du débit, et le message dit combien. Et un
  témoin de feu pose sa voiture HORS du carrefour d'avant : avec des rues à
  19 blocs, à 15 blocs d'un feu elle était encore à moins de 5 du précédent,
  où l'on dégage au lieu de s'arrêter.

## Le bloc visé dit qui l'a posé (v490) — le diagnostic répond à « qui a posé ça ? »

Une règle. `?diag=1` porte une ligne « visé » : le nom du bloc sous le
réticule, ses coordonnées, et « posé par le jeu » ou « posé à la main » avec
la date de `world.editTimes` (le journal de l'enfant est la seule origine
d'un bloc qui n'est pas du générateur). La visée est celle de la surbrillance,
retenue SEULEMENT sous `DIAG` ; l'identifiant se relit à l'image où l'on écrit
la ligne, sinon un bloc posé entre deux images se nomme de l'ancien nom (vu à
la sonde). Le témoin de `monte.js` lit le TEXTE affiché, jamais une variable.

## Les passages des avenues (v467) — un passage se mesure le long de SA rue

Une règle. Dans une ville bâtie à la main, un carrefour est le croisement de
deux avenues nommées (`carrefoursDeVoies`) ; le passage se pose sur chacune, à
`demi-chaussée croisée / sin(angle) + 0,4` du croisement, mesuré le long de
l'avenue — sur un croisement oblique, la chaussée croisée est plus longue à
franchir, et la bande tomberait dedans. Trois avenues concourantes donnent un
seul « bras » par avenue (le plus large dégagement), un croisement sous 30°
n'a pas de passage, et seul le bitume du `sol*` de la ville en porte.
`passagesVilles: false` le retire pour l'empreinte des 490 morceaux.
## Une baie se soude (v469) — une optimisation de maillage se prouve par les triangles

Une règle. Deux quads du même plan qui se touchent émettent des coins
IDENTIQUES (position, normale, UV, tuile, teinte, matière, lueur) : sur les
morceaux denses de Paris, un sommet de façade sur six. `souderTampons`
(facadeshd.js) les fusionne sur les BITS des flottants envoyés au pilote,
jamais sur une tolérance. La preuve n'est pas une capture : c'est que chaque
coin de chaque triangle porte les mêmes dix-huit mots qu'avant
(`memesTriangles`, `sonde-baies.mjs`) — mêmes triangles, mêmes valeurs, la
même image par construction. `baiesSoudees: false` rejoue l'ancien tampon pour
l'empreinte des 490 morceaux. Avant d'alléger une géométrie en changeant sa
forme, on cherche ce qui se fusionne sans la changer.

## Le sol se soude (v482) — ce qui reste fabriqué partout se mesure contre ce qu'il remplace

Une règle. Le sol HD et les faces plates de Paris restent fabriqués pour tout
le disque (v296) ; le coût se compte contre le VOXEL qu'ils remplacent (plat +
solid 432 Mo contre 454 sans couche), pas en valeur brute (372 Mo). Le seul
surcoût réel était le sol (47,7 Mo pour la ville), et un sommet sur quatre y
était doublé : `sol` passe par `souderTampons` comme les façades (v469),
`solSoude: false` pour l'empreinte des 490 morceaux. Le voxel et `plat` n'ont
aucun sommet doublé (UV d'atlas par face) : ne pas y chercher.
## Le viaduc de la Manche (v465) — un ouvrage de voie se déclare au contact, et un profil relevé se borne aux gares

Deux règles.

- **UN OUVRAGE FERROVIAIRE EST LE PONT DE L'A1, PIÈCE POUR PIÈCE.** Une suite
  d'au moins `VIADUC_MIN` pas d'eau sous l'axe porte `viaduc` dans le profil
  (`profilDe`) ; `voieEn` rend `ouvrage`, `corridorEn` le transmet, `tablierEn`
  lit la voie après la route, et `rubansVoieDans` émet le ruban `tablier`
  (peau de gravier) qui déborde de `CULEE` pas sur le ballast. Le générateur
  n'écrit sur l'eau que des piles. Contact, dessin et train lisent
  `coteContinue` : un seul profil, trois lecteurs (v302).
- **RELEVER UN PROFIL SE BORNE AUX GARES, ET LA BORNE SE MESURE CONTRE LE
  PROFIL D'AVANT.** Le tablier monte à `DEGAGE` blocs, et le lissage en cône
  propage le relèvement d'un tiers de bloc par bloc : rien ne se relève à moins
  de `GARDE_GARE` pas d'un bout, et un témoin compare les dix-huit gares à
  `viaducs(false)` (zéro déplacée). La rampe à terre, elle, bouge (deux blocs au
  plus) : déclarée dans `TASKS.md`.
## Rien ne traverse une voie (v539) — un ouvrage décidé sur l'axe se rejuge colonne par colonne

Max, captures d'iPhone sur le TGV Paris–Lyon : « Those things should never
happen ». Cinq règles.

- **UNE RIVE N'EST PAS UN PONT.** Le viaduc se décide sur l'AXE (de l'eau
  sous lui), mais toute la largeur du pas était « pont » : le générateur n'y
  creusait rien, et la berge plus haute que le tablier restait en travers des
  voies (507 blocs de gabarit, tous sur un pas de viaduc). Dans `voieEn`, une
  colonne dont le terrain monte jusque sous le ballast est de la plate-forme
  (une culée, creusée comme un déblai) ; seule une colonne basse garde l'eau,
  la pile et le tablier. C'est la culée de l'A1 (v300) du côté du rail : toute
  décision d'ouvrage prise sur un axe se rejuge sur chaque colonne qu'elle
  couvre. `rivesCreusees(false)` rejoue l'ancienne règle, pour les témoins.
- **UN TÉMOIN DE GABARIT LIT LES DEUX VOIES, PAS L'AXE.** Celui de
  `carteMonde.js` lisait le milieu de la ligne, entre les voies : il ne
  pouvait pas voir ce que Max a vu. `plafond.js` balaie le réseau entier aux
  positions des deux voies (113 050 points), blocs pleins non tus ET surface
  du sol continu au-dessus du dessus des rails, ponts compris, et se vérifie
  capable de rougir. Deux lignes ne se partagent jamais une colonne (la plus
  proche paire est à 141 blocs) : une ligne neuve qui s'approche à moins de
  deux plates-formes talus compris rougit ce témoin, et c'est alors un tracé
  à mesurer, pas un aiguillage à inventer.
- **UNE SURFACE SE LIT LÀ OÙ ELLE SE POSE.** Le sol continu pose le sommet
  d'une colonne en son centre ; `corridorEn` lisait la cote de la voie au
  coin, et le ballast enterrait une traverse sur huit. Le ballast lit
  désormais sa cote au centre, son BLOC au coin (`blocVoxel`, que
  `colonneRoute` lit) : le générateur garde son indice entier. Les routes
  portent le même décalage, déclaré dans `TASKS.md`.
- **QUAND UNE SURFACE SE LIT AILLEURS QUE LE BLOC, LE BLOC VOYAGE AVEC
  ELLE.** `corridorEn` rend `cote` (centre) ET `blocVoxel` (coin) ; tout
  lecteur qui cherche le bloc écrit (`grilleSol`, `hauts`, `coteHorizon`,
  `colonneRoute`) lit `blocVoxel`, jamais `floor(cote) − 1`. Le premier jet
  le recalculait et tombait dans l'air sur 322 morceaux sur 758 : un mailleur
  qui jette sur le fil principal arrête la boucle de jeu, et c'est une cascade
  de soixante rouges dans `monte.js` qui l'a dit. Le témoin maille les
  morceaux le long de toutes les voies.
- **UN CONVOI A SON MODÈLE ET SON ÉCART SE DÉDUIT DES LONGUEURS.** Le train
  intervilles était la rame du métro (8,0 à 8,7 blocs) posée tous les 7,6 :
  les bouts se traversaient. `convoitrain.js` : motrice au nez effilé à
  chaque bout, voitures à fenêtres, soufflets, bogies, deux membres (tronc et
  porte, v489), `matiereVivante` donc aucun programme neuf ; `ECART_TRAIN`
  vaut la caisse plus deux demi-soufflets. `metro(…, { modele, ecart })`.
  Le témoin mesure les MODÈLES RENDUS (boîte le long de la voie, demi-largeur
  du bout) et l'écart des trains de la page.

## Un mauvais atterrissage casse l'avion (v462) — un seuil de crash vit dans la fiche, et l'enfant n'a jamais rien

Max : « un avion devrait se crasher s'il atterrit mal ». Trois règles.

- **LA RÈGLE EST PURE, LES SEUILS SONT DANS LA FICHE.** `jugerToucher`
  (degats.js) lit la mesure du toucher (vitesse, chute, train, sol : piste,
  champ plat, relief, eau, arbres) et `toucherMax`, `chuteMax` de la fiche
  `pilote` ; le témoin de `degats.js` lit les mêmes seuils. Un appareil neuf
  déclare les siens, ou ne s'écrase jamais.
- **L'ENFANT N'A RIEN, ET LE MESSAGE DIT QUOI FAIRE.** L'avion devient une
  épave (`etat: 'epave'`, la fumée et les flammes des dégâts de la v343,
  `horsService`) et l'enfant est déposé debout à côté (`deposer`), plus aux
  commandes ; le bandeau dit la raison et le geste (sortir le train,
  ralentir, laisser ✈️ se poser).
- **UN POSÉ ASSISTÉ SUR UNE PISTE NE CASSE JAMAIS.** La garde est dans
  `player.js` : sous l'approche, sur la piste, sol correct, pas de jugement.
  La sonde de l'approche rend quelques touchers à six blocs par seconde (4 sur
  148) : la garde est ce qui rend l'aide sûre, pas la sonde.
- **CE QUI SE VOIT VOYAGE AVEC LA POSITION, ET L'AVION AUSSI.** `p.v` ne
  portait qu'un véhicule à siège : un ami aux commandes d'un avion était vu à
  pied. Il porte désormais tout ce qui a une fiche `pilote`, avec ses dégâts
  (`d`, v344) — l'ami voit l'appareil et son épave. Aucun témoin à deux
  tablettes ne le garde encore : déclaré dans `TASKS.md`.

## Une fenêtre par étage (v457) — un changement de DESSIN se prouve par la forme

Les villes engendrées posaient deux blocs `ETAGE` par baie : deux fenêtres
dessinées l'une sur l'autre (38 719 piles, 259 villes sur 269). Elles posent
les bandes de Paris (`BANDES`, villesmonde.js). Trois règles.

- **UN CHANGEMENT DE BLOCS QUI GARDE LA FORME N'A PAS À FIGER LA VILLE.**
  `VILLES_FIGEES` garde la ville d'avant sous ce qu'un enfant a bâti quand une
  RUE ou un LOT bouge (v303, v339) : une maison pourrait se retrouver
  enfermée. Ici chaque bande remplace un bloc plein par un bloc plein, au même
  endroit — un bloc posé contre une façade reste devant la même surface, et un
  bloc d'enfant posé SUR la façade l'emporte toujours (`edits`). Ce qui le
  prouve est un témoin de forme, pas un raisonnement : `plafond.js` bâtit
  chaque lot (un sur trois, 98 187) avec et sans bandes et compare la
  solidité couche par couche (zéro différence), et rien ne change hors des
  bandes. Une passe qui change la FORME d'un bâtisseur se fige ; une passe
  qui ne change que son DESSIN se prouve par ce témoin.
- **UNE BANDE HORS DE PARIS GARDE CE QUE LE REGISTRE DONNAIT AU BLOC
  D'ÉTAGE.** `etageMi` posait un garde-corps sans condition : juste à Paris,
  faux à Berlin (`nord`, `gardeCorps: false`), que le témoin du palier C garde
  sans fer. Les bandes lisent désormais `gardeCorps`, `guillotine` (le rail au
  milieu de la baie de deux blocs, `RAIL_GUILLOTINE`) et `linteau` ; les
  styles de Paris n'ont aucune de ces clés, et l'empreinte des 490 morceaux
  (Paris HD compris) rend la constante d'avant, bandes désarmées.
- **LE DÉSARMEMENT VIT DANS LE MODULE, PAS DANS UN MONDE FIGÉ.**
  `reglageBaies.bandes` (villesmonde.js) rejoue les deux `ETAGE` au bit près
  pour l'empreinte et le témoin de forme ; jamais un réglage du jeu. Pas de
  drapeau de `CONF_*` : les migrations jugent l'appui d'un bloc sur la forme,
  que les bandes ne changent pas.

## Un cube au ras du sol touche le sol (v455) — l'exposition d'une cellule de monument se lit dans le monde

Une règle. Les « vingt-quatre cubes du parvis de Notre-Dame » (dette v335)
étaient la couche 0 du bâtisseur, celle du bloc de surface : ses flancs
touchent le sol de la ville, pas l'air. Une sonde ou un témoin qui juge
l'exposition d'une cellule contre les seules cellules du BÂTISSEUR compte ce
sol comme de l'air ; sous la hauteur d'un enfant, une voisine hors du
bâtisseur se lit dans le monde engendré (`sonde-monuments-hd.cjs`, témoin de
`plafond.js`, qui descend désormais jusqu'au sol). Avant de recaler un modèle
sur une dette chiffrée, on vérifie que le chiffre compte ce que l'enfant voit.

## L'A1 Centre (v461) — une porte de ville se juge aussi contre les anneaux et les ponts de la ville

Une règle. La sonde de couloir mesure le relief, les rails, les aérodromes, les
repères et les autres routes ; elle ne voit ni les VOIES des anneaux de la
ville ni ses TABLIERS. À Florence, la porte que la sonde préférait (32°) avait
une avenue d'entrée qui roulait dans la voie d'un anneau dès la porte
(`finAvantAnneaux` rend 0 : il aurait fallu une ligne de `RACCORDS_COURTS`),
et plein est le talus du bout de la route descendait sur la culée d'un pont de
l'Arno (dix-huit pas de tablier sans sol, vus par le portail). Avant de
chercher le tracé, on balaie les angles d'entrée contre les trois lectures :
l'avenue (`entrees.mjs`), le raccord (`sonde-rue-dense.cjs raccords`, cinq
secondes par angle), les tabliers de la ville sous `routeEn` (tab.mjs, la
boucle du témoin des ponts de villes) — puis le tracé tourne en plusieurs fois
depuis la porte retenue.

## L'Orange et l'Argent (v468) — deux lignes sur les mêmes rails ont des tours de même durée

Deux règles.

- **UNE LIGNE QUI EMPRUNTE LE TUNNEL D'UNE AUTRE EN RECOPIE LES POINTS.**
  `calculerBranche` (washington.js) reprend le tracé de la Bleue point pour
  point, cote comprise, jusqu'au dernier quai commun ; seule la branche se
  calcule. Recalculée à part, l'enveloppe basse descendrait autrement et
  deux rames « sur la même voie » rouleraient à deux cotes.
- **SUR DES RAILS PARTAGÉS, L'ÉCART ENTRE RAMES EST UNE PHASE, ET IL NE TIENT
  QUE SI LES TOURS DURENT EXACTEMENT AUTANT.** Les tours commencent au même
  point ; à périodes égales, une rame qui en suit une autre d'un sixième de
  tour la suit partout sur le tronc. La branche la plus courte attend la
  différence au bout de son tunnel, là où rien d'autre ne roule
  (`optionsMetro` : `pauses`, `phases`). Sans l'égalisation, 1 191 contacts
  sur un tour (sonde). Une rame de branche occupe son tunnel autant que la
  Bleue sa branche : deux rames de branche à moins d'un tiers de tour se
  rattraperaient au bout — d'où trois rames de branche, pas six.

## Le métro de Washington jusqu'au bout de la boîte (v485) — un ouvrage se creuse dans son emprise, pas dans le disque de la ville

Deux règles.

- **UN OUVRAGE SOUTERRAIN SE CREUSE DANS L'EMPRISE QU'IL OCCUPE.** Le
  bâtisseur de Washington ne passait que dans le cercle du registre (187
  blocs) ; la boîte et les tiroirs des terminus vont au-delà, et les rames y
  roulaient dans la roche (309 points de la Bleue). Hors du cercle, `world.js`
  appelle `creuserMetroWashington` — le métro seul, jamais une maison — dans
  `EMPRISE_METRO_DC` (la zone, plus de quoi poser un pylône). Creuser n'écrit
  que des blocs : les empreintes du relief et des 490 morceaux ne bougent pas.
  Les mondes d'avant (`villesAvant`) ne creusent pas.
- **CE QUI OUVRE LA SURFACE CÈDE À UN BLOC D'ENFANT, ET SE CHOISIT CONTRE CE
  QUI SE POSE APRÈS.** Une colonne marquée par un bloc d'avant
  `DATE_METRO_BOITE_DC` (et ses huit voisines, `colonnesMetroDC`) ne reçoit
  que ce qui est à trois blocs et plus sous le sol ; un arbre à trois blocs
  d'un tel bloc reste. Une bouche hors du cercle (jamais creusée avant) se
  choisit avec la règle entière : les monuments sont posés APRÈS le
  creusement, et celle de Pentagon débouchait dans le Pentagone. La date se
  relit à la fusion (v309).

## La ligne 1 sous Paris (v473) — un escalier en biais monte de 0,7, et un creusement se borne sous le lit

Trois règles.

- **SUR UNE AVENUE EN BIAIS, UN ESCALIER MONTE DE 0,7 BLOC PAR BLOC.** Deux
  colonnes voisines peuvent être à 1,4 bloc l'une de l'autre le long d'un axe
  tourné ; à une marche par bloc, l'arrondi y fait une marche de deux — un mur
  pour l'enfant. La sonde (`sonde-metro-paris.mjs`) marche case par case de la
  rue au quai : c'est elle qui l'a trouvé, pas la relecture.
- **UN CREUSEMENT SOUS UNE VILLE AU BORD D'UN FLEUVE SE BORNE SOUS LE LIT.**
  Rivoli et le Faubourg longent la Seine du plan à moins de huit blocs : la
  voûte d'une station s'arrête à 27, le lit (l'eau de 28 à 30), sinon une voûte
  de carreaux dépasse dans le fleuve et l'eau a une poche d'air. Le profil est
  plat (seize blocs sous la rue) : il ne dépend d'aucun monde, donc le worker,
  le fil principal et deux tablettes creusent le même tunnel.
- **DES BOUCHES VOISINES SE CHOISISSENT ENSEMBLE.** Prises dans l'ordre de la
  ligne, l'escalier de Saint-Paul prenait la place de celui de la Bastille, et
  un escalier en passait un autre à la rue. `placesDe` rend les places de
  chaque station (trottoir ou herbe à la trémie, jamais un lot ni l'eau, et un
  escalier ne descend jamais dans le tunnel ou une autre station — il passe
  au-dessus avec un bloc de terre) ; une recherche bornée les sert ensemble.
  Ce qui touche la rue ne se pose que sur du trottoir : un témoin le lit sur
  le monde, contre les vingt circuits de Paris.

## La ligne A sous Rome (v500) — un métro de ville engendrée lit sa fiche, et sa bouche suit la trame

`src/metromonde.js` : la méthode de la v473, pour une ville qui n'a qu'une
fiche. Une ligne de plus est une entrée de `LIGNES_DEF` (ville, stations en
lat/lon réelles, teinte). Quatre règles.

- **LA VILLE SE CHOISIT PAR LA MESURE, PAS PAR LA RENOMMÉE.** Stations dans le
  disque, espacement en blocs, relief et eau sous l'emprise, monuments à moins
  de `box + 14` d'une station : Tokyo (20 blocs/km) mettait ses stations à
  huit blocs l'une de l'autre, Berlin avait la Spree et quatre monuments sur
  la U5. La sonde se refait avant la prochaine ville.
- **UN TROTTOIR ENGENDRÉ FAIT DEUX BLOCS ET DEMI : L'ESCALIER EN FAIT DEUX, ET
  IL SUIT LA TRAME.** Une trémie de trois ne tenait sur aucun trottoir (six
  stations sur douze sans bouche, toutes pour cette raison : `L.refus`). Les
  directions candidates sont la ligne, sa perpendiculaire et les deux axes de
  la trame ; ce qui touche la rue se compte COLONNE PAR COLONNE avec la règle
  même du creuseur (`colonnesHautes`) — un échantillonnage par points laisse
  passer la colonne de lot du bord.
- **UN COIN DE CARREFOUR N'EST PAS UN TROTTOIR COMME UN AUTRE.** Un anneau de
  voitures y coupe le virage, carrosserie sur le trottoir (une rambarde à 1,2
  bloc de la voie d'un circuit, mesuré) : une colonne qui voit de la chaussée
  selon les deux axes de la trame ne reçoit ni trémie, ni rambarde, ni mât. Et
  jamais rien sur un feu (`RUE.FEUX`, que la circulation lit).
- **UN CALCUL PUR ET CHER SE FAIT AU PREMIER MORCEAU QUI LE DEMANDE.** Le choix
  des bouches coûte deux cents millisecondes ; au chargement du module, le jeu
  les payait derrière « Jouer » et le worker aussi. `L.bouches` est un
  accesseur : la zone d'une ligne (`ZONES`) le déclenche avant de creuser.
  Pur, donc le worker et le fil principal trouvent les mêmes bouches.

Et **« DANS LE TUNNEL » EST AUSSI UNE HAUTEUR.** `VU_SOUTERRAIN` (v162) ne
regardait que le plan : debout dans la rue au-dessus d'une ligne, ses rames se
dessinaient dans la roche (deux sur cinq `visible` à Rome). `montrer` les cache
au-delà de `HAUT_TUNNEL` (huit blocs) au-dessus de la rame. Un témoin de
passants l'a trouvé, pas un témoin de métro : on a séparé les causes par
quatre variantes jouées chacune plusieurs fois (rames seules, creusement seul,
rames déplacées loin, correction), jamais par une deuxième hypothèse.

La preuve compare le monde DÉSARMÉ (`METRO_MONDE.actif = false`) bloc à bloc
au-dessus de la rue (`sonde-metro-monde.mjs`) ; les deux mondes se lisent
chacun sous SON réglage, parce qu'un morceau s'engendre à la première lecture
et que l'interrupteur est celui du module — ma première sonde comparait deux
mondes armés et rendait « zéro bloc posé ».

## La course et les bêtes en temps réel (v483) — un chrono qui écrit un record est une pendule

Deux règles.

- **CE QUI ÉCRIT UN RECORD, OU DÉCIDE SI LE MONDE EST PEUPLÉ, COMPTE EN
  `chronoReel`.** La naissance des bêtes (`animals.js`) et le chronomètre de la
  course du parc (`fun.js`, `records.bestRace`) comptaient en `dt` borné : à
  cinq images par seconde, la tablette qui rame peuplait quatre fois moins vite
  et « courait » quatre fois plus vite. Mesuré 2,3 s de record pour 8,6 s
  réelles. Le relevé des `-= dt` restants est dans `TASKS.md`, classé ;
  une animation reste en temps de jeu.
- **LE CHRONO SE LIT À CHAQUE IMAGE, PAUSE COMPRISE, ET SE DÉPENSE EN JEU
  SEULEMENT.** `chronoFun()` est appelé en tête de `fun.update`, que `main.js`
  appelle même en pause : l'écart d'une pause est absorbé là et n'entre jamais
  dans `raceTime`. Un chrono lu seulement en jeu rendrait, au retour d'un quiz,
  deux secondes de plus au coureur. Le témoin lit une fonction partagée
  (`minuteurs-mesure.js`) que la sonde lit aussi (v400).

## La rue sans à-coups (v453) — le bus a une place, un circuit se prépare, une suiveuse freine

Quatre sujets, une livraison. Cinq règles.

- **UNE RÈGLE DE RACCORD SE MESURE AUSSI DANS LES VILLES BÂTIES À LA MAIN.**
  La sonde des raccords (v442) ne lisait que les anneaux des villes
  engendrées ; l'entrée de l'A1 à Lille roulait 47 blocs dans la voie d'un
  circuit de la rue de Paris. Les cinq villes bâties à la main sont dans la
  sonde et dans `RACCORDS_COURTS` (633 → 26 blocs, tous des demi-tours).
- **UN VÉHICULE DE PLUS DANS UNE GRILLE PREND UNE PLACE ENTIÈRE.** Le bus à
  mi-temps entre deux voitures (v372) les touchait par la grille seule (36 004
  relevés sur 263 anneaux) et forçait l'anneau à renoncer au jeu par voiture
  (v438). Il prend la place de la voiture 0 (`pris`, posé par `bus()`) : zéro
  contact, jeu partout, une voiture de moins par anneau. `busAMiTemps(true)`
  rejoue l'ancienne règle pour les sondes, jamais un réglage.
- **CE QUI SE CALCULE AVANT UNE NAISSANCE SE CALCULE PAR TRANCHES, ET LA
  PREUVE EST L'IDENTITÉ.** `fabriqueCirculation` est un générateur qui rend la
  main entre ses étapes lourdes (plancher, croisement, voies le long du tracé,
  chaque essai de la jumelle) ; `circulationParTranches` l'avance À CHAQUE
  IMAGE sur un budget en DÉBIT (120 ms par seconde, entre 5 et 22 ms par
  image, v237) et enchaîne les circuits tant qu'il en reste ; main.js ne fait
  naître le convoi (et son bus) qu'une fois fini. Mon premier jet n'avançait
  qu'aux tics de 125 ms de la cadence de ménage : Rome et Moscou arrivaient
  sans une voiture en vue — le portail l'a dit (« la circulation naît à
  l'approche »).
  Le témoin compare 56 circuits fabriqués des deux façons — voitures, jumelle,
  grille, voies — sans un écart : c'est ce qui garde la v305.
- **UNE BORNE DURE SE PRÉCÈDE D'UN FREINAGE.** Le plancher de file (v283) est
  une contrainte de position : une suiveuse encore lancée à 3,7 b/s y était
  arrêtée en une image (37 b/s²). Sa distance d'arrêt ne dépasse pas l'écart
  plus celle de la voiture de devant (v² ≤ vDevant² + 2·a·reste, a le
  freinage d'urgence) — devant dans sa file ET devant sur la ligne (v423, la
  voiture de l'autre convoi a son propre plancher) — et seulement quand un feu
  ou sa file la retient (`cause === 1`). La somme vDevant + √(2·a·reste),
  plus large, laissait encore 3 secs sur 8. Mesuré au navigateur (`sonde-feu-image.cjs`) :
  5 arrêts secs sur 9 sur `origin/main`, 1 sur 17 ici (huit passes ; le
  reste est entre 14 et 33 b/s², déclaré). **UNE BORNE ABSOLUE
  RALENTIT DES FILES ENTIÈRES** : mon premier jet bornait à zéro devant et
  partout ; Moscou montrait 8 voitures en vue au lieu de 26. Une borne de
  confort se pose RELATIVE à ce qui précède, et seulement là où sa cause
  agit.
- **UNE DETTE DE TÉMOIN SE VÉRIFIE AVANT D'ÊTRE REPOINTÉE.** `TASKS.md`
  déclarait l'arrêt sec au feu « jugé sur deux arrêts », et j'ai cru à un
  relevé mal horodaté sous la charge. La sonde, sans charge, sur
  `origin/main`, a rendu les mêmes arrêts secs à l'heure de lecture et à
  l'heure de l'image : l'hypothèse était fausse et le défaut était dans le
  JEU. Repointer le témoin sur l'hypothèse aurait caché une vraie panne. Le
  témoin juge désormais un arrêt « au feu » sur toute sa descente (une voiture
  arrêtée par l'urgence puis rangée dans la file n'a pas freiné pour un feu),
  et le choc de `degats.js` prend vingt-six blocs d'élan au lieu de les
  trouver (3 à 16).

## ✈️ va chercher la piste (v452) — une séquence assistée garde sa porte de sortie et se mesure piste par piste

Max : « améliore la séquence d'atterrissage, l'avion est compliqué à gérer ».
`src/approche.js` (pur, sans three) : piste la plus proche, ralliement,
finale sur un plan, arrondi. Quatre règles.

- **LA RÈGLE EST PURE ET SE REJOUE SOUS NODE SUR TOUTES LES PISTES.**
  `guiderApproche` rend un cap, une vitesse verticale, une vitesse et le
  train ; `player.js` l'applique comme un joystick. La sonde
  (`tests/sonde-approche.cjs`) la rejoue sur les 31 pistes, trois appareils, quatre
  départs : c'est elle qui a trouvé un avion qui virait au ras de la piste
  dans l'aérogare de Roissy (on monte tout droit avant de virer), Fiumicino
  qui tournait sans fin (deux tours manqués : une autre piste), et un toucher
  avant le seuil de Los Angeles (`TOUCHER` 8).
- **UNE SONDE DE CONTACT JUGE LA BOÎTE, PAS LE SOMMET DE LA COLONNE (v480).**
  Trois des quatre « posés à reprendre » de la v452 étaient la sonde : elle
  touchait le sommet d'une couronne d'arbre qui flotte à dix blocs au-dessus
  d'une piste, sous laquelle l'avion vole. Un bloc dans la boîte (la hauteur
  du joueur) est un heurt, le sol est le premier bloc plein SOUS les roues.
  Et la dette disait « l'état du monde » : rejoué seul dans un monde neuf, le
  défaut se reproduisait — on démonte avant de croire une cause écrite. Le
  vrai défaut était un balayage d'obstacles par pas de trois, qui enjambait
  le mur d'une colonne du seuil de Los Angeles : un obstacle d'une colonne se
  lit une colonne à la fois. Au-dessus de la piste, seul ce qui croise la
  boîte sur le plan compte (`plein`) — le sommet de chaque colonne y ferait
  reculer le toucher jusqu'au bout (mesuré : 238 sur 300).
- **UNE APPROCHE ASSISTÉE NE FINIT JAMAIS AU BOUT DE LA PISTE.** Trop long
  pour s'arrêter (`freinage` de la fiche plus dix blocs) ou trop de travers :
  elle remet les gaz d'elle-même. Près du seuil la descente se borne à la
  hauteur qui reste (un relief qui tenait l'avion haut le faisait plonger).
- **LE GESTE PRIME, ET LE SECOND APPUI SORT.** Le joystick corrige (↔ décale,
  ↕ monte ou descend sur le plan) ; un second ✈️ remet les gaz — la porte de
  sortie de toute séquence imposée (v290, v366). Sans piste à portée, ✈️ se
  pose sur place dès le premier appui (le témoin de la v261 l'exige) et le
  cadran montre l'aéroport le plus proche. Hors de l'approche, le cadran nomme
  les villes (v263) : mon premier jet y mettait la piste la plus proche dès
  qu'on volait bas, et le témoin « cap sur Lyon » l'a refusé.
- **ELLE SE MESURE SUR LES VRAIES PISTES.** Livrée après le prolongement des
  pistes : sur les pistes d'avant, le Concorde ne trouvait aucune piste assez
  longue et refaisait des tours (17 approches sur 17, mesuré).
## Le regard d'un convoi est un temps (v451) — ce qui est sur le chemin se voit avant d'y être

Un train traversait la voiture de l'enfant quand une image était lente
(déclaré par la v440). Trois règles.

- **UN CONVOI QUI ROULE EN TEMPS RÉEL REGARDE CE QU'IL VA PARCOURIR DANS
  L'IMAGE.** La rame ne regardait que `PAS_TRAIN` (3,5 blocs) : à quinze
  blocs par seconde, une image d'un quart de seconde la faisait passer
  d'« assez loin » à « déjà dedans », et « pas si l'on est déjà dedans »
  (v245) la laissait continuer. `cederLePassage` est appelé APRÈS que
  `horloge` a avancé et AVANT `c.update` : la grille dit donc EXACTEMENT où la
  motrice sera à la fin de l'image (`distanceA(horloge − decalage)`), et le
  regard couvre cette avance plus 3,5 blocs, au pas d'un bloc (`pasDeRame`).
  Même à quai : une rame qui repart dans l'image roule aussi. Le métro partage
  ce code. C'est le couloir des piétons (v351) et le balayage des voitures
  (v395) du côté de la rame : une portée en blocs fixes est une portée en
  temps qui rétrécit quand la cadence tombe.
- **LES VOITURES DE LA RUE AJOUTENT L'IMAGE EN COURS, ET RIEN SOUS UN TIERS
  DE SECONDE.** Leur regard (`porteeDe`) et leur marge d'urgence devant une
  personne (v372, « une image à trois par seconde ») gagnent `v × (dt − 0,35)`
  — `dt` est la durée que `update` leur donnera. Sous 0,35 s, la règle d'avant
  au bit près : on ne change pas le comportement que les témoins de la rue
  mesurent à cadence normale.
- **UNE PANNE DE CADENCE SE PROVOQUE.** Au repos, l'ancien code passait 7 poses
  sur 7 ; sous charge, c'était un tirage. La sonde et le témoin brûlent 700 ms
  de fil principal par image pendant le croisement (`origin/main` 5/5
  traversées, regard fixe désarmé `regardRameFixe` 2/3, remède 0/5) — la leçon
  des poissons (v233) appliquée à une durée d'image. Le frein s'arrête à la
  fin du témoin : une page de la suite continue après lui.

Ce qui reste, déclaré : l'arrêt devant l'enfant reste LOCAL (la grille partagée
ne change pas, v305) ; un saut d'horloge (l'invité qui adopte l'heure de
l'hôte) peut encore poser une rame sur l'enfant — elle continue alors (v245).
## Un bâtisseur ne tire pas au hasard (v450) — ce qu'il pose est un monde, et deux fils le bâtissent

Trois règles.

- **JAMAIS `Math.random()` DANS UN BÂTISSEUR.** Le worker de maillage (v251) et
  le fil principal ont chacun leur graphe de modules, donc leur cache de
  monuments : un tirage au hasard y bâtit DEUX mondes, celui qu'on voit et celui
  qui arrête l'enfant — et deux tablettes en ont deux autres. Le Colisée du
  catalogue l'a fait de la v346 à la v449 (173 blocs). Un tirage se fait à la
  POSITION (`effondre(x, y, z)`, monuments.js ; `tirage` des villes) ; dans un
  monument, la position DANS le monument, pour que le catalogue posé par un
  enfant soit le même que celui de la ville.
- **LA PREUVE EST UN FIL NEUF, PAS UN RAISONNEMENT.** `plafond.js` engendre les
  763 repères du monde d'aujourd'hui et d'avant la v306 dans deux
  `worker_threads` sous deux graines de `Math.random`, et compare au fil du
  témoin (46 s, parallèle). Un repère neuf qui tire au hasard le fait rougir et
  le nomme. Le grep (`grep -c Math.random src/*.js`) ne dit que les candidats :
  hors des bâtisseurs, tout est animation, ciel ou son.
- **UN CHAMP DE FICHE PEUT PORTER DEUX SENS, ET SEUL UN NOMBRE EST UN BLOC.**
  `f.baie` était le bloc des fenêtres d'une ville engendrée — et la GÉOGRAPHIE
  du port de Sydney. Lu comme bloc, l'objet s'écrivait 0 : 250 fenêtres étaient
  des trous. `typeof … === 'number'` avant de poser ; le jour où un champ de
  fiche gagne un second usage, on cherche ses lecteurs (`grep -n "f\.baie"`).

Et **une ville engendrée dont l'archétype peint mal la pierre a sa palette à
elle** (`PALETTES_VILLES`, villesmonde.js) : Édimbourg en gris, gris clair et
kaki, des UNIS — en motif « Briques », la couche HD (registre `londres`) y
verrait de la brique et la patinerait en rouge.

## Les pistes à leur vraie longueur (v448) — un ouvrage qui sort du disque est un repère, pas un relief

Max : « les pistes de tous les aéroports sont beaucoup trop courtes pour
vraiment atterrir ». Mesuré : 90 à 146 blocs. Quatre règles.

- **UN PROLONGEMENT EST UN REPÈRE DE PLUS, BÂTI EN TRONÇONS.**
  `tronconsDePiste` (aeroport.js) rend des repères de 32 blocs (`piste: true`)
  posés dans l'axe, au-delà du disque : remblai et tranchée écrits en blocs
  (les bornes de la v280, `REMBLAI` 12, `DECAISSE` 9), jamais `terrainHeight`.
  Les deux empreintes de `plafond.js` sont intactes, et une sonde compare le
  relief des deux arbres sur 688 320 colonnes autour des dix-neuf aérodromes :
  zéro différente. Un tronçon prend sa cote à l'aérodrome (`lm.ancre`), pas à
  son centre.
- **UN REPÈRE QUI N'EST PAS UN BÂTIMENT SE DÉCLARE À TOUS LES LECTEURS DE
  REPÈRES.** `dansUneZoneATerre` aplanit le sol sous les repères du monde
  (`conf.reperes`) : un tronçon y aurait changé le relief. Il est filtré là,
  dans `REPERES` et dans `nearLandmark` (qui refuse un lot de ville). Les
  mondes figés (`LANDMARKS_V317`) ne le portent pas.
- **LA LONGUEUR SE MESURE CONTRE TOUT CE QUI BORNE.** `PROLONGEMENTS` est le
  résultat d'une sonde (villes, routes, voies ferrées, autres aérodromes,
  monuments, eau, et la profondeur que le remblai et la tranchée tiennent),
  pas un goût ; `CIBLE_PISTE` dit ce qu'on vise par profil (300 · 260 · 220),
  et `PISTES_COURTES` nomme, avec l'obstacle, les sept aérodromes qui n'y
  arrivent pas. Un témoin de `carteMonde.js` roule chaque piste et rougit
  pour une piste courte non déclarée — ou une déclarée qui ne l'est plus.
- **LE PLAN EST PUBLIÉ UNE FOIS** : `pistesDe(a)` (axe, demi-largeur, bouts
  ouest et est) est lu par le bâtisseur, le témoin et l'approche assistée (v452).

## Les commandes de l'avion se rangent (v445) — une file en flux ne peut rien recouvrir

Max, deux captures d'iPhone en vol : six paires d'éléments qui se recouvrent
(cadran de cap × minicarte × GPS × bandeau, défi de Cornichon × manette). Trois
règles.

- **CE QUI S'AFFICHE EN HAUT AU MILIEU VIT DANS UNE SEULE FILE EN FLUX.**
  `#file-centre` (index.html) : cadran, GPS, proposition d'ami, défi de
  Cornichon (`fun.js` l'y range), bandeau — `position: static` à l'intérieur,
  donc un élément de plus se range à la suite et rien ne se recouvre par
  construction. Elle commence sous la ligne du chronomètre
  (`--rail-panel-top`), entre la colonne de gauche — et la minicarte quand
  elle est ouverte (`body.minicarte-ouverte`, `--minimap-w`) — et la colonne
  de droite. Plus aucune cote écrite à la main pour un bandeau.
- **LA COLONNE DE BORD EST AUSSI HAUTE QUE LA MANETTE, ET « DESCENDRE » EN
  FAIT PARTIE.** Aux commandes, ⬇️ DESCENDRE, ✈️ et 🛞 sont trois boutons
  ronds de 56 px au même x, la vitesse en dessous, la manette (56 × 220) à
  droite : le haut de la colonne est le haut de la manette (v265), rien dans le
  quart du joystick (v272). Le bouton garde le texte « Descendre » (les témoins
  lisent `includes`), en icône et mot.
- **UN TÉMOIN DE MISE EN PAGE SE JOUE À LA TAILLE DE L'APPAREIL DE MAX.** Le
  banc ouvre en 420 × 760 ; la capture était en 430 × 932. Les trois témoins
  de `monte.js` se jouent aux deux, formulés sans dimension. Et le quiz de
  l'invariant 2 met le vol en pause (`onPause` → `running = false`) : mesuré,
  zéro bloc parcouru sous la question — on le RANGE, on ne le diffère pas.

## Les raccords d'autoroute s'arrêtent avant l'anneau (v442) — deux grilles ne partagent pas une voie

Trois règles.

- **UNE VOIE N'A QU'UNE GRILLE.** Dix-neuf des quarante-six raccords
  route/ville engendrée roulaient dans la voie d'un anneau (569 blocs) : deux
  grilles horaires indépendantes (v305) qu'aucun réglage ne cadence l'une
  contre l'autre (Madrid 6,7 à 6,9 % de paires au contact). Le raccord s'arrête
  quatre blocs (`MARGE`) avant la première voie d'anneau, même sens ou en face
  à moins de 1,6 bloc (`finAvantAnneaux`, raccords.js) ; plus court que
  `RACCORD_MIN`, le demi-tour se fait à la porte. Les pistes ont été mesurées
  toutes deux (`sonde-rue-dense.cjs raccords`) : l'arrêt à la porte partage
  encore 44 blocs et ne fait entrer personne ; le raccord court 20 blocs, tous
  des demi-tours. « Le raccord devient une file de l'anneau » n'existe pas
  sans téléporter une voiture d'une grille à l'autre.
- **CE QUE LE DÉMARRAGE NE PEUT PAS PAYER ET QUE L'APPROCHE NE PEUT PAS
  CHANGER SE MESURE HORS LIGNE.** Les autoroutes naissent au démarrage ; les
  anneaux de leurs trente-six villes coûtent 877 ms sous node (derrière
  « Jouer », v258) ; et raccourcir le raccord à l'approche changerait la grille
  de toute la file d'une tablette à l'autre. La troncature est donc une TABLE
  (`RACCORDS_COURTS`), comme `ANNEAUX_EN_PLUS`, et un témoin de `plafond.js` la
  recalcule : un anneau qui bouge la fait rougir et nomme le raccord.
- **UNE SONDE QU'UNE SUITE LIT SE REQUIERT, ELLE NE SE LANCE PAS.** Le premier
  témoin lançait `sonde-rue-dense.cjs` par `spawnSync` : l'aiguillage du
  portail (`sondeIsolee`) ne voit que `require` et `import`, et une sonde
  modifiée aurait laissé `plafond.js` « déjà vert ». La sonde exporte
  `mesurer(mode)` ; `?raccords=long` rejoue l'avenue entière au navigateur.

## La rue dense, palier C (v438) — une variance par voiture est une fonction de son heure

Quatre règles.

- **UNE VOITURE NE PEUT AVOIR SON ALLURE QUE SI SON ÉCART À LA GRILLE EST UNE
  FONCTION DE L'HORLOGE.** `Convoi.jeu(i, τ)` (vehicules.js) rend quelques
  dixièmes de seconde d'avance ou de retard (`JEU_MAX`, 0,35 s ; ±10 %
  d'allure), une ondulation dont la période et la phase viennent de la CLÉ du
  convoi et du rang — jamais du hasard local : deux tablettes posent la même
  voiture au même endroit (v305). Un témoin refait la table et la rejoue à
  l'identique.
- **LE JEU S'ÉTEINT LÀ OÙ LA FILE EST CALCULÉE AU PLUS JUSTE.** Le poids `W`
  vaut zéro sous six blocs par seconde (le virage le plus lent fixe le nombre
  de voitures, `nbSansChevauchement`), à trois secondes d'un croisement du
  tracé avec lui-même (`instantsDeCroisement`), là où la jumelle partage la
  voie de sa file, et dans un anneau que le bus suit. Il se décide sur ce
  qui est connu à la CRÉATION — sur l'autoroute, la section de deux voies,
  pas la jumelle qui naît plus tard : le jeu ne change pas quand elle arrive.
  Preuve STRUCTURELLE (`sonde-rue-dense.cjs jeu`) : 179 convois sous node,
  un tour d'horloge chacun, 392 contacts de grille sans le jeu, 392 avec.
- **UNE FLOTTE QUI S'AGRANDIT GARDE SES POINTES UNIQUES.** La fourgonnette
  et le pickup (`utilitaires.js`, fabriqués, originaux) ont leur classe dans
  `FLOTTE` et leur fiche dans `conduite.js` (31 et 32 blocs/s) :
  `ficheDeVitesse` retrouve la classe à sa pointe. Une silhouette entière vient
  d'un profil extrudé : quinze maillages contre trente-deux pour un modèle
  de la flotte — une rue qui gagne des utilitaires dessine moins.
- **LA LIMITATION SE DEMANDE À LA SECTION, AU POINT DU TRACÉ.**
  `allureDuTroncon` (voiesdoubles.js) lit les voies nommées de chaque ville
  bâtie à la main et leur type du kit (boulevard 50, collectrice 40, locale
  30) ; `allureVilleMonde` le boulevard de la croix. Manhattan garde la
  sienne.

Et **la seconde voie de Paris se perdait aux places, et dans une recherche qui
supposait le croisement monotone.** 306 blocs de deux voies occupés sur 1 231 :
la rampe de huit blocs mangeait seize blocs autour de chaque place
(`RAMPE_VILLE` 5 en ville, l'autoroute garde 8), le seuil de quarante écartait
les circuits qui ne suivent qu'un tronçon (`SECTION_MIN` 20). 446 après. La
recherche du nombre de la jumelle ne testait que `nb` et 0,4 `nb` avant sa
dichotomie : elle liste désormais les nombres que le croisement accepte et
cherche parmi eux. Les deux circuits en huit restent sans jumelle — seul n = 4
passe leur croisement (0,18 `nb`) : déclaré.
## Les anneaux se cherchent ensemble (v435) — ce qu'aucun ordre ne règle se cherche sur l'état de tous

Toronto, Dublin, Lima : l'anneau d'arrivée sur la place, chaque contour trouvé
seul suivait un voisin immobile. Trois règles.

- **QUAND AUCUN ORDRE NE CHANGE LE RÉSULTAT, LA RECHERCHE EST SUR LE MAUVAIS
  ESPACE.** Les vingt-quatre ordres de Tokyo rendaient les mêmes 56 pas :
  essayer des ordres ne déplace que le moment où un voisin se fige.
  `contournerEnsemble` (villesmonde.js) cherche sur l'état de TOUS les anneaux
  à la fois (un îlot d'un anneau par pas, ou son sens s'il n'a pas de jumeau),
  note = segments fautifs, puis partage au-delà de la barre, puis îlots changés.
  Elle part de la configuration de la phase 4 et ne tourne que s'il reste des
  pas : 259 villes identiques au bit près, tabliers compris (comparé).
- **LA COUVERTURE SE GARDE POINT PAR POINT SUR LA CONFIGURATION ENTIÈRE.**
  Plusieurs anneaux bougent : « les points que seul cet anneau voyait » ne
  veut plus rien dire. `vusDeVille` rend un octet par point, et un essai qui
  laisse sans voiture un seul point vu avant est refusé.
- **UNE ABSENCE DE SOLUTION SE MONTRE AVANT DE SE DÉCLARER.** Tokyo et Dubaï
  restent : une carte des segments bloqués (place, monuments, ET eau sans
  tablier — ma première carte oubliait l'eau et laissait croire à un détour)
  montre que le seul détour de l'anneau d'arrivée suit la voie d'un voisin
  dans le même sens, et 6 000 essais (contre 80) ne trouvent rien.

## La place se contourne (v432) — une garde se mesure sur ce qu'elle protège, à la règle du témoin

Vingt-deux villes avaient la voie de leur anneau d'arrivée sur la place. Quatre
règles.

- **UNE GARDE DE VUE SE LIT SUR LA VOIE, PAS SUR L'AXE.** La phase 4 refusait
  un contour dont l'AXE de rue passait à plus de `VU_ANNEAU` (30) du centre ;
  la voiture roule une demi-chaussée plus loin ou plus près. Ce que l'enfant
  voit : une voiture à `VU_VOITURE`, sur un tracé où elles sont espacées de
  cinquante-quatre blocs au pis — une voie à √(45² − 27²) = 36 blocs en montre
  une (`VU_CONTOUR`). La SÉLECTION garde `VU_ANNEAU` : les anneaux qu'une ville
  reçoit ne changent pas.
- **UNE GARDE DE COUVERTURE A LA RÈGLE DU TÉMOIN, SANS MARGE.** Celle de la
  v404 se donnait un bloc et demi de chaque côté : un point vu à 44 blocs
  avant et après était « perdu ». On échantillonne comme le témoin v322 (pas
  de deux blocs depuis chaque sommet, 45 blocs), sur une grille qui ne lit pas
  moins que la sienne (`pointsDeVille(f, true)`).
- **UNE GARDE COMPARE AU RECTANGLE ; LA CONFIGURATION D'AVANT, ELLE, A PU
  GAGNER PAR CHANCE.** À Sydney, l'ancien contour à contresens voyait 3,2 blocs
  plus loin que le rectangle ; la garde neuve l'aurait remplacé et perdu 0,7 %
  de la ville. La configuration d'avant (garde de la v404) est donc jouée
  d'abord et reste la référence : un autre essai ne la remplace que s'il
  laisse moins de pas hors de la chaussée SANS voir moins de points. Les 248
  villes où elle ne laisse aucune faute sont identiques au bit près, et ne
  paient rien de plus.
- **DEUX ANNEAUX QUI TOUCHENT LA PLACE SE DISPUTENT SES RUES : L'ORDRE SE
  CHOISIT.** Celui qui contourne d'abord prend la voie de l'autre (Bangkok :
  57 → 1 en mettant le dernier en tête). On essaie l'ordre naturel puis chaque
  anneau fautif en tête, contours mémorisés par l'état des autres. Et quand
  toute une suite de segments du même côté est fautive, la recherche recule la
  RANGÉE d'un coup (Lisbonne, 33 → 0) ; un grand anneau peut changer un tiers
  de ses îlots.

Ce qui reste, déclaré dans `TASKS.md` : Rio (la forêt de Tijuca, où la trame a
un îlot fusionné en travers de la seule rue qui en sortirait), Tokyo, Dubaï,
Toronto (leurs contours suivent un voisin au-delà de la barre de partage ou
perdent des points), Agra, et une poignée d'anneaux à moins de 25 pas.

## La rue serrée, et fabriquée par tranches (v431) — un budget par image, et un balayage fin là où l'on s'arrête

Trois règles.

- **CE QUI SE FABRIQUE À L'ENTRÉE DANS LE CHAMP SE FABRIQUE PAR TRANCHES.**
  À l'arrivée d'une téléportation, `Convoi.montrer` fabriquait toutes les
  voitures de la rue dans la même image (v420 : 162 à 276 ms sous `frame`).
  Un budget module (`FAB_MS`, 5 ms, ouvert par `update`) : une place hors
  budget reste vide une image de plus — SAUF à moins de `FAB_PROCHE` (18
  blocs) de l'enfant, qui ne doit pas traverser une voiture qu'il ne voit pas.
  Le budget vaut l'infini tant qu'aucune image n'a commencé : un appel direct
  de `montrer` fabrique tout. Mesuré (Paris, trois passages) : mise à jour des
  voitures 234/261/195 → 111/125/99 ms ; neuf voitures dans une même image →
  une. Ce qui reste, `voiesDe` (la jumelle, 57 à 111 ms au dépliage), ne se
  diffère pas : il fixe le nombre de voitures de la file, donc la grille que
  deux tablettes partagent (v305).
- **UNE RECHERCHE DE PAIRES SE FAIT DANS UNE GRILLE DE SA PORTÉE.**
  `croisementsDe` comparait 720 instants toutes-contre-toutes (259 000 paires)
  pour un test de six blocs : une grille de six blocs rend le même ensemble
  (295 comparaisons de `nbSansCroisement` contre l'ancien module chargé dans
  la même page, zéro écart) en deux fois moins de temps.
- **L'ÉCART À L'ARRÊT EST LE PAS DU BALAYAGE.** Au pas d'un bloc et demi, une
  suiveuse s'arrête n'importe où entre 1,1 et 2,6 blocs (médiane 1,9 à 2,0) ;
  les deux premiers blocs se balaient au quart (1,1 à 1,35). Et le plancher de
  la file (v283) vaut un bloc en ligne droite, mais 1,6 là où le tracé tourne
  sous la suiveuse ou devant elle : dans un virage la corde est plus courte que
  l'arc, et les coins se touchent (mesuré à Tokyo). Avant de serrer un
  plancher le long d'un tracé, on regarde ce qu'il vaut en ligne droite.

## Un pont se lit sur la colonne que le monde écrit (v430) — et une règle de contact vit dans le monde

Max, capture d'iPhone : le bandeau de l'eau sur une autoroute, la voiture
arrêtée. Quatre règles. *(Depuis la v560 l'eau n'arrête plus la voiture et le
bandeau n'existe plus ; `eauSousLaVoiture` reste la règle que lit la sonde des
ponts, et le contact sur les tabliers est inchangé.)*

- **CE QUE LE GÉNÉRATEUR A DÉCIDÉ AU COIN D'UNE COLONNE SE LIT AU COIN.**
  `world.js` demande `routeEn(wx, wz)` — le coin — pour savoir si une colonne
  est un pont, et n'y écrit alors aucun bloc ; le contrôle de l'eau lisait
  `tablierEn(bx + 0.5, bz + 0.5)`. Aux deux bouts de chaque pont, une colonne
  n'avait ni bloc ni tablier pour le contrôle : 12 traversées sur 52 arrêtées
  par une eau qu'on ne voit pas. `tablierDeColonne` lit le coin, puis le
  centre. C'est la v414 (« une tolérance se juge sur la colonne ») du côté du
  contact : toute question « y a-t-il un plancher sur CETTE colonne ? » se
  pose là où le générateur l'a tranchée.
- **ET LE CONTACT AUSSI — L'ARRÊT FAUTIF CACHAIT UNE CHUTE.** Retirer le faux
  arrêt laissait la voiture entrer dans ces colonnes sans bloc ; quand le
  point exact n'était pas encore sur le tablier, rien ne la portait et elle
  finissait sous le pont (une traversée sur six au premier pont de l'A1, sur
  la v419 comme sur la branche, `sonde-pont-tablier.cjs`). `accrocherAuSol`
  et `verticaleVoiture` lisent `tablierSousLePoint` (le point, puis la colonne
  qui le contient). Une intermittence de navigateur ne tranchait pas (un
  tirage à la première traversée d'un banc) : la preuve est STRUCTURELLE,
  la chaussée de tous les ponts balayée au quart de bloc sous node — 6 713
  points sans appui avant, zéro après (`trousAuxCulees`). **Quand on retire
  un garde-fou faux, on demande ce qu'il empêchait par accident.**
- **UNE RÈGLE DE CONTACT QU'UNE SONDE DOIT REJOUER VIT DANS LE MONDE.**
  `eauSousLaVoiture` (world.js) est la règle de `main.js`, sortie pour que
  `sonde-ponts-eau.cjs` (le vrai joueur sous node, chaque pont, deux sens,
  trois secondes) la lise telle quelle ; `plafond.js` l'appelle. Une copie de
  sonde finit par diverger du jeu (v400). Et l'avance d'une voiture le long
  d'une route se lit à l'ABSCISSE (`projeter`), jamais en projetant sur le
  cap de départ : une route qui tourne fait plafonner la projection, et la
  sonde déclarait « bloquées » quatre voitures qui roulaient.
- **LE JOURNAL DE BORD A DIT OÙ, PAS QUAND.** La session de l'iPhone montrait
  l'enfant à pied dans Paris ; la panne était ailleurs. Quand le journal ne
  porte pas la capture, on balaie TOUTES les routes sous node à la recherche
  de la situation (dix-huit secondes), au lieu de deviner un endroit.

## Toutes les voies occupées (v423) — la seconde voie est la même ligne, décalée

Max, une capture de GTA VI à côté d'une de GTA V : « Good inspiration » — des
voies serrées et TOUTES occupées. Mesuré avant : une seule file par sens
partout ; sur l'autoroute (deux voies par sens) la file roulait À CHEVAL sur
la ligne entre les deux, à 4,0 blocs de l'axe, et vingt voitures imposées
faisaient une voiture tous les cent vingt blocs. Six règles.

- **LA SECONDE VOIE N'EST PAS UN AUTRE CIRCUIT, C'EST LE MÊME, DÉCALÉ.**
  `ParcoursDecale` (vehicules.js) garde la DISTANCE de son tracé de base et
  pose ses points à `lat(d)` blocs à droite : la jumelle passe partout à la
  même distance du départ que sa file, `rangJumeau` intervalles plus tard. Une
  seule grille horaire pour deux voies, donc la même circulation sur deux
  tablettes (v305) ; un témoin exige l'égalité exacte des deux distances à
  trois heures. Elle a sa propre clé (`|voie2`). La contrainte de partage
  (v211, v387) n'a pas à la voir : deux convois côte à côte sur les deux voies
  d'un même sens se SUIVENT, et c'est ici une seule ligne.
- **LA SECTION SE DEMANDE À CE QUI LA DESSINE** (`voiesdoubles.js`, pur) : les
  percées de premier rang de Paris (`sectionDeVoie`), la croix-boulevard des
  villes engendrées (`t.axe`, même repère que `solVillesMonde`), la pleine
  section d'autoroute (`dc` porté par chaque point de `traceRoute`). Une
  portion plus courte que seize blocs ne compte pas (on TRAVERSE un boulevard
  au carrefour, on ne le suit pas), on change de voie sur seize blocs, et l'on
  se rabat avant un virage : décalée vers l'intérieur d'un coin, la jumelle
  replie son tracé et touche sa file.
- **LÀ OÙ LA SECTION N'A QU'UNE VOIE, LES DEUX FILES N'EN FONT QU'UNE — ET LA
  LIGNE NE DOIT PAS SE TOUCHER.** Mesuré : au même nombre de voitures, presque
  toutes les jumelles touchaient leur file dans le virage lent qui suit le
  boulevard (une demi-voiture d'écart dans le temps). La file laisse donc la
  place à sa jumelle : le plus grand `n` (au moins 0,4 `nb`) où
  `jumelleSansContact` fait rouler toute la ligne sur un tour sans contact ;
  mesuré, le meilleur vaut 0,4 à 0,5 `nb` — la même ligne, ses voitures
  réparties sur deux voies. Le bus prend la première place de la ligne.
- **LA DENSITÉ D'UNE FILE EST BORNÉE PAR SON VIRAGE LE PLUS LENT, ET CELA SE
  MESURE.** Une grille horaire espace les voitures en TEMPS : à 2,5 blocs par
  seconde dans un coin, deux secondes font cinq blocs, une longueur de voiture.
  Le plus grand nombre sans contact vaut une voiture toutes les deux secondes,
  à 0,5 % près, sur les 205 anneaux mesurés — le plafond actuel. On ne
  densifie pas une rue en serrant sa grille ; on la densifie par les voies.
- **UN CALCUL QU'ON NE LIT QU'À L'APPROCHE NE SE FAIT PAS AU DÉMARRAGE**
  (v378, v387) : les autoroutes naissent au démarrage, leur seconde voie quand
  l'enfant approche du corridor (`voiesAuBesoin`, une par image) — trois
  cents millisecondes de moins derrière « Jouer ». Et la file d'autoroute vaut
  0,44 fois une voiture toutes les deux secondes (le partage mesuré sur les
  vingt-quatre corridors), sa jumelle autant : 480 → 1 354 voitures.
- **ET UNE LIGNE NE SE TÉLESCOPE PAS.** La grille garde la file et sa
  jumelle à distance ; un freinage local (un feu) non : mesuré à Paris, 10 %
  de paires au contact, toutes entre la jumelle et sa file, contre 0 sur
  `origin/main`. Là où elles partagent la voie, la voiture qui précède sur la
  ligne est dans l'AUTRE convoi (`devantSurLaLigne`), et le plancher de la
  v283 s'étend à elle : 0 %. Et la légitimité d'une attente se propage dans
  la LIGNE (`memeLigne`), pas seulement dans la file.

## Les sensations au volant (v422) — la caméra regarde la voiture, et un mur se cherche cellule par cellule

Chantier « conduite » (six sessions, octobre 2026) ; celle-ci tient ce que
l'enfant VOIT et ENTEND. Tout vit dans `src/sensations.js`, branché par un
appel dans `updateRide` (fun.js) ; la physique ne s'y lit qu'en lecture. Cinq
règles.

- **LE CONTRAT SE LIT SI PRÉSENT, ET CE QUI MANQUE SE DÉDUIT.** `braquage`,
  `derive`, `choc`, `etatVoiture`, `embarquement` viennent d'autres sessions :
  sans eux, le braquage se déduit de la vitesse de cap, le choc d'une vitesse
  qui s'effondre plus vite qu'aucun frein (`FREIN_VOITURE`). Pendant
  `embarquement.phase`, la caméra n'est pas à nous ; à la fin, on la reprend
  en trois quarts de seconde depuis où elle était.
- **UN SEGMENT SE PARCOURT CELLULE PAR CELLULE, IL NE S'ÉCHANTILLONNE PAS.**
  L'ancienne recherche partait à 3,2 blocs par pas de 0,6 : un mur entre le
  pare-chocs (2,2) et 3,2 n'était jamais vu, et la caméra se posait derrière
  lui. `segmentLibre` (DDA) du toit vers chaque poste, du plus loin au plus
  près ; sous le pare-chocs la caméra s'élève au-dessus du coffre. On se
  rapproche tout de suite, on recule en douceur.
- **LA CAMÉRA REGARDE LA VOITURE, PAS L'AXE DE LA VOITURE.** Depuis une place
  en retard (v278), regarder dans l'axe faisait SORTIR la voiture du cadre en
  virage — vu en capture, aucun témoin ne le voyait. La visée est à mi-chemin
  entre la caméra et l'axe, et le retard est borné (`RETARD_MAX`, 0,55 rad).
- **LES SIGNES SE LISENT DANS LA MATRICE.** Roulis : le haut de la caisse
  contre sa gauche, négatif dans un virage à gauche. Roue avant : l'axe de
  l'essieu contre la droite de la voiture, positif (vers la gauche) dans un
  virage à gauche. Les roues avant braquent dans un groupe inséré entre le
  pivot et son parent, autour du haut de la VOITURE exprimé dans le repère du
  parent — un nœud de modèle porte n'importe quelle rotation.
- **UNE BORNE DE TÉLÉPORT SUIT LA VITESSE.** Les roues se figeaient au-delà de
  deux blocs par image (animals.js), c'est-à-dire précisément quand on va vite
  sur une tablette lente. La borne vaut deux fois ce que la voiture peut faire
  dans l'image, et `sensations.js` reprend le suivi du bestiaire pour ne pas
  compter deux fois. Les avions gardent la poursuite d'avant à l'identique ;
  `?sensations=0` rejoue l'ancienne conduite, pour mesurer.

**Dos à un mur, la caméra plonge (v498).** Rapprochée par un mur derrière le
coffre, elle gardait l'assiette du regard libre et la voiture sortait par le
bas du cadre (milieu projeté à −1,17) — ni le témoin du recul ni celui du
flanc ne le voyaient, une capture l'a montré. `plongee` ajoute au tangage
l'écart d'angle sous lequel on voit la caisse (zéro au recul de la fiche), et
sous le plancher la caméra monte de `MONTEE_PRES` par bloc gagné. **Une
caméra qu'on déplace pour éviter un obstacle se juge par ce qu'elle montre :
on lit la projection de ce qu'elle doit filmer, pas sa position.**

**La pente se dessine (v429).** La physique publie `player.tangage` (v408,
nez en haut positif — le signe de `rotation.x` sur un modèle au nez en −z) et
le RÉÉCRIT à chaque image ; `sensations.js` l'ajoute au tangage de la caisse,
borné à `PENTE_MAX`. `player.atterrissage` est un ÉVÉNEMENT daté, comme
`choc` : on retient son `t` et l'on ne réagit qu'à un `t` neuf, jamais à celui
qu'on trouve en montant. Le témoin fige le champ par une propriété qui ignore
ce qu'on lui écrit (v358), et lit la pente dans la matrice monde.

**Les traces de pneus (v434).** `src/traces.js`, appelé par `sensations.js`
(pose) et `fun.js` (effacement, chaque image). Quatre règles.
**UN APPEL POUR TOUTES** : un `InstancedMesh` borné (`MAX_TRACES`), l'opacité
par instance (le greffon `aAlpha` des flammes, clé `traces-alpha`), la plus
vieille cède sa place, un essaim vide est caché. **AUCUN PROGRAMME EN JEU** :
`chaufferTraces` compile l'essaim exact à l'accueil ; le témoin lit les clés
(une neuve si la chauffe est désarmée, vérifié). **LA TRACE SE POSE SUR CE
QUI PORTE LA ROUE** (`coteSousRoue`) : tablier, puis surface continue, puis
dessus du bloc, un centième au-dessus, et rien si l'écart à la voiture
dépasse un bloc. **COUPÉ DU DESSIN EN RENDU LOGICIEL** (mesuré : un
cinquième de la cadence du banc, `sonde-traces-cout.cjs`) mais POSÉ quand
même : un témoin qui juge ce que la tablette voit force
`reglageTraces.dessin = true` (ou `?traces=1`). Et une piste de témoin qui
dérape se pose LARGE : la dérive pousse la voiture de côté, et sur treize
blocs elle tombait de la plate-forme (`enLair`, zéro trace au frein à main).

**Le frein à main crisse (v437).** Le crissement suivait la dérive, le
freinage fort et le virage trop vite ; le frein à main tiré tout droit n'en
donne aucun (dérive nulle) et ne s'entendait pas (bande des pneus ×1,9).
`freinMainTire` (lu si présent) au-dessus de deux blocs/s vise 0,75. Le
témoin écoute la sortie pendant le freinage, contre la ligne droite d'avant.

**La voiture de l'ami braque et glisse (v441).** Trois règles.
**UN SIGNE ÉCRIT POUR UNE PHYSIQUE SE RELIT QUAND LA PHYSIQUE ARRIVE.** La
caisse visait `derive − deja`, écrit quand le contrat ne disait pas encore
dans quel sens la vitesse glisse ; `player.js` la fait aller vers
`yaw + derive`, la caisse vraie est donc à −`derive` de sa vitesse, et l'on
dessinait la glissade en miroir (rapport −0,18 lu dans la matrice,
`derive-mesure.js`). Elle vise désormais `−derive − deja` : zéro quand le cap
dit déjà tout. **UN NOMBRE QUI VOYAGE N'EST PAS UN NOMBRE DESSINÉ** :
`userData.braquage` et `.derive` étaient posés sur la copie d'un ami depuis la
v397 et lus par personne ; `vieDistante` (sensations.js, appelée par
`updateRemotePlayers`) braque ses roues avant et pose ses traces, sa vitesse
lue à la position que le réseau lui donne. **UN NOM DE CHAMP NE SERT PAS DE
MARQUEUR** : `installerBraquage` marquait la voiture dans
`userData.braquage`, que le réseau écrase avec un nombre — il réinstallait
les groupes à chaque message ; le marqueur est `braquageInstalle`. Le frein à
main voyage dans `p.v.m` (les deux chemins de la position le portent : `v`
est recopié entier, v388).

## Un contour dans l'autre sens, et les rues du Strip (v418) — ce qui empêchait le contour n'était pas l'absence de rue

Deux règles.

- **AVANT DE CROIRE QU'UN CONTOUR N'EXISTE PAS, ON LIT SA MEILLEURE NOTE.** La
  phase 4 échouait pour une vingtaine d'anneaux qui traversent la place
  centrale (Tokyo, Dubaï, São Paulo…). Instrumentée, la recherche trouvait des
  contours SANS faute, refusés parce qu'ils suivaient la voie d'un autre anneau
  (44 à 108 blocs de partage). Le remède est géométrique : le même contour dans
  l'AUTRE sens roule sur l'autre voie des mêmes rues, et deux convois qui se
  croisent ne se suivent pas (v211, v387). Seulement pour un anneau qui n'a pas
  déjà son contresens. Relâcher les bornes de la recherche (24 îlots, 120
  essais) est un non-résultat mesuré : Rio ne change pas, le coût monte.
- **UNE RUE DANS LE DÉSERT EST UNE MATIÈRE, PAS UN LOT.** La bande du Strip ne
  tenait qu'une rue de la trame. `desert.rues` pave la CHAUSSÉE des rues de la
  trame à moins de `rues` unités de la bande : asphalte nu, ni lot ni
  trottoir, donc aucun immeuble qui pourrait pousser autour d'une construction
  d'enfant, et le relief ne lit pas `desert`. Un témoin exige zéro colonne
  autre que sable et asphalte hors de la bande.

## Le contresens ne renonce plus devant une voie mouillée (v416) — un refus se juge sur la règle finale, pas sur une mesure d'avant

Une règle. Le contresens (phase 2 ter) était écarté dès que `traverseesDe`
refusait sa voie extérieure (plus de `PONT_MAX` d'eau), AVANT qu'on regarde si
les tabliers déjà publiés la couvraient, ou s'il pouvait contourner. Or la
règle qui décide est `exigerChaussee` (l'eau n'est permise que sous un tablier
publié) : un refus pris plus tôt par une mesure plus stricte écartait San Diego
sans raison. Mesuré sur les 262 villes : seule San Diego change (1 → 2
circuits), aucun tablier ni sol ne bouge. San José et Guayaquil restent à un
circuit, et c'est la GÉOMÉTRIE : leur place occupe le nœud central, le grand
anneau est leur seul cycle, et sa voie extérieure passe sur la mer (une
quarantaine de blocs le long de la côte) ou sur la plage — un remède de SOL
(`TASKS.md`). Une sonde de contour lit le bord dans SON sens de marche
(intérieur à gauche) : interrogé à l'envers, `etatDeSegment` décale la voie du
mauvais côté et ment.

## Les tabliers s'allongent sous la voie (v414) — un ouvrage qu'on ne peut pas retirer s'agrandit, et la preuve lit les deux versions

La dette de la v404 : 159 pas de voie sur l'eau hors de tout tablier. Quatre
règles.

- **LE REJET ET LA PUBLICATION SONT DEUX MESURES.** `traverseesDe` décide
  QUELS anneaux une ville reçoit sur l'AXE, au bloc, exactement comme avant :
  c'est ce qui garde la sélection identique (circuits, couverture, voiture en
  vue au bit près, sonde sur les 262 villes). Le tablier PUBLIÉ, lui, est
  l'union des suites mouillées de l'axe et de la VOIE que l'anneau roule (côté
  centre ; l'autre voie est au contresens, qui mesure la sienne), au
  demi-bloc. Les bordures et la voie d'en face ajoutaient des milliers de
  colonnes le long des rivages où rien ne roule : mesuré, retiré.
- **UNE TOLÉRANCE SE JUGE SUR LA COLONNE, ENCORE (v404).** La publication lit
  l'eau sur la colonne que le monde écrit (son coin, `Math.floor`), pas sur le
  point de la ligne : sur une trame tournée le coin est jusqu'à un bloc et demi
  du point, et le chenal de Stockholm passait entre les deux.
- **UN TABLIER NE SE RETIRE PAS, ET SA MATIÈRE NON PLUS.** Les allongements
  portent `ext` et viennent APRÈS les tabliers d'avant dans la liste
  (`pontDeVille` rend le premier qui couvre) : rangés autrement, 733 colonnes
  de parapet passaient en chaussée — un ordre de liste est une règle.
  L'allongement ne porte que sur l'eau, sur toute sa longueur : `coteRoulable`
  lit le tablier sans regarder l'eau. Un anneau que les quarante points voient
  au sec publie aussi le tablier du ruisseau qu'il coupe (la Kamo de Kyoto).
- **LA PREUVE LIT LES DEUX VERSIONS DANS LE MÊME CODE.**
  `pontVillesMonde(x, z, false)` rend les tabliers d'avant seuls : le témoin
  compte les colonnes d'eau perdues ou changées (zéro) et gagnées (1 485, toutes
  sur l'eau). Les témoins qui marchent l'AXE d'un pont ne lisent que les ponts :
  un allongement longe la rive, et sa preuve est la voie. L'empreinte des 490
  morceaux se relève (Rome) et se prouve désarmée (`ext` retirés → la
  constante d'`origin/main`).
## La flotte partage ses images (v413) — un plantage sans erreur se lit dans ce qui MONTE

Max : « le jeu plante de temps en temps ». Onze plantages de l'iPhone en
quarante minutes, en palier bas, HD éteinte, zéro erreur, cadence normale.
Trois règles.

- **UN PLANTAGE SANS ERREUR NI GEL SE CHERCHE DANS LA GRANDEUR QUI MONTE
  PENDANT LA PARTIE.** Safari ne donne pas le tas (`tasMo` nul), mais le journal
  de bord compte les géométries et les textures : la seconde grimpait d'un bout
  à l'autre de chaque partie (409 → 702). La requête qui l'a montré :
  `jsonb_array_elements(doc->'releves')` par session, un relevé sur quatre.
- **UN CHARGEUR NE CONNAÎT QU'UN FICHIER : CE QUI SE RÉPÈTE ENTRE FICHIERS SE
  RECONNAÎT À SES OCTETS.** Cinquante modèles, 225 images, CINQ distinctes ;
  chaque modèle décodait sa copie (734 Mo pour la flotte entière). Le greffon
  `partageDesTextures` (vehicules.js) hache le `bufferView` de l'image et rend
  la texture déjà décodée. Avant de partager, on vérifie dans les fichiers
  qu'une image n'y joue qu'un rôle : `assignTexture` lui pose son espace de
  couleur, et une image teinte ici et normale là se contredirait.
- **UNE RESSOURCE PARTAGÉE SE MARQUE AU MOMENT OÙ ELLE DEVIENT PARTAGÉE.**
  `repeindre` clone la laque et la marque non partagée ; `liberer` jetait donc
  la `map` du clone, c'est-à-dire la texture du prototype, à chaque voiture
  repeinte qui quittait la rue. Les textures du cache portent `partagee`.

Ce qui reste, déclaré dans `TASKS.md` : une relance de mise à jour semble
compter comme un plantage dans le journal (une session v408 à zéro relevé cinq
secondes après la fermeture de la v406), et nourrirait le disjoncteur de sûreté.

## Les anneaux contournent (v404) — un anneau est le bord d'un ensemble d'îlots

La dette de la v387 : 147 anneaux de villes engendrées sur 809 sortaient de la
chaussée (place, fontaine, parc, plage), onze villes n'avaient qu'un circuit.
Sept règles.

- **UN ANNEAU EST LE BORD D'UN ENSEMBLE D'ÎLOTS DE LA TRAME.** Retirer un îlot
  au bord le fait passer en dedans, en ajouter un en dehors : le tracé reste
  par CONSTRUCTION sur les rues (`contourner`, `bordDIlots`, villesmonde.js).
  Une recherche au mieux d'abord (moins de segments fautifs, puis moins de
  voie partagée, puis moins d'îlots changés) trouve le contour le plus proche
  du rectangle. Deux îlots qui ne se touchent que par un coin, ou un trou,
  n'ont pas UN bord : refusé.
- **LE CONTOUR NE CHANGE JAMAIS QUELS ANNEAUX UNE VILLE REÇOIT.** La sélection
  des rectangles reste celle d'avant, au bit près ; la phase 4 fait contourner
  chaque anneau APRÈS, s'il garde trois promesses : le partage par voie avec
  la forme finale de tous les autres, la vue du centre pour l'anneau de la
  phase 1, et AUCUN point de la ville qui perde sa voiture (`pointsSeuls`,
  marge d'un bloc et demi parce que le témoin échantillonne tous les deux
  blocs). Mon premier jet contournait PENDANT la sélection : un anneau
  contourné gênait les suivants, Rome, Istanbul, Turin perdaient des circuits.
  Un second tour de la phase 2 bis qui admettait les candidats en les
  contournant n'ajoutait aucun anneau : non-résultat mesuré, retiré.
- **LE PARTAGE SE LIT SUR DES CÔTÉS.** `partageDAretes` remplace
  `partageDeRue` : rue, étendue, côté de voie (`s`, le signe du côté fois le
  sens pour un rectangle). Pour un rectangle il rend la même valeur au bit
  près — c'est ce qui garde la sélection identique.
- **LE QUAI EST UN SOL POSÉ EN TRAVERS DE LA RUE, COMME LE TROTTOIR DU
  BOULEVARD.** Les onze villes à un circuit étaient toutes des ports : leur
  anneau traverse le quai pavé pour gagner son pont, et son contresens était
  refusé pour cela. `surLeQuai` le tolère pour le contresens seul. Et une
  tolérance se juge sur la COLONNE lue, jamais sur le point exact : au bord de
  la bande du boulevard, l'arrondi les séparait et Rome bloquait sur un faux
  trottoir.
- **L'AUTRE VOIE MESURE SA TRAVERSÉE SUR ELLE-MÊME.** Le contresens roule à
  une demi-voie de l'axe, côté extérieur : là où la rive est en biais, il
  touchait l'eau deux blocs avant le bout du tablier mesuré sur l'axe
  (Newcastle ; San José, 52 pas dans l'eau). `traverseesDe` se rejoue sur sa
  voie et publie le tablier qui manque, centré sur la rue. Et l'eau n'est
  permise sous une voie neuve que sur un tablier déjà publié (`surUnTablier`).
- **UN TABLIER NE SE RETIRE PAS.** Le contrôle d'eau strict, appliqué à la
  phase 2 bis, écartait des anneaux d'avant ET leurs ponts : Vienne perdait 212
  colonnes de tablier, Shanghai 502 — un enfant a pu bâtir dessus. La phase 2
  bis garde sa règle d'avant (le défaut, des anneaux d'avant sur l'eau hors
  tablier, est déclaré). Une sonde compare les tabliers des deux arbres colonne
  par colonne : zéro perdue, 642 gagnées, toutes sur l'eau (`world.js` n'écrit
  un tablier que sous `WATER_LEVEL`).
- **UNE RECHERCHE SE MESURE AVANT DE SE BORNER.** Les contours trouvés le sont
  en deux essais (médiane), 36 au pire : `CONTOUR_ESSAIS` vaut 40 et une
  recherche s'arrête après dix essais sans progrès. Le coût n'était pas là où
  le profil du premier jet le disait : tri de la file à chaque tour (un tas
  maintenant), signatures triées (un hachage tenu îlot par îlot), puis la
  garde de couverture qui relisait toute la ville à chaque proposition (une
  liste par anneau, une grille par ville). Le prix déclaré : le premier
  dépliage de Rome passe d'environ 57 à 85-100 ms, une fois, à l'approche.

## Le monde entier en relief (v401) — ce qu'aucun registre n'honore se déclare

Palier C, le dernier. Trois règles.

- **DES RÈGLES DANS L'ORDRE, ET LES EXCEPTIONS NOMMÉES.** `registreAilleurs`
  (facadeshd.js) : médinas, îles, `victorien` (Océanie, Afrique du Sud),
  `nord` (au nord de 45° N : la Russie, Oulan-Bator, Harbin), `asie` (à l'est
  de 95° E), `desert`, `sud` (Maghreb, Levant, Anatolie, Caucase au nord de
  38° N), `tropical` pour le reste. Ce que la règle classerait mal a son nom et
  sa raison : `ILES`, `COLONIALES` (les compartiments d'Indochine, Manille),
  `TIBET`. Le premier jet mettait Tbilissi et Erevan au désert et Maputo dans
  l'Afrique du Sud victorienne : c'est l'impression de la table entière, ville
  par ville, qui l'a dit — on la relit avant de livrer.
- **UNE RÈGLE QUI CHANGE LE SENS D'UN TÉMOIN LE FAIT REPOINTER.** Le témoin de
  la v394 exigeait que Tunis, Ankara et Tbilissi n'aient AUCUN registre ; ils
  en ont un désormais, le méditerranéen. Ce qu'il garde vraiment — la règle
  d'EUROPE ne les classe pas — se lit sur `registreEurope`.
- **CE QU'AUCUN REGISTRE N'HONORE SE DÉCLARE.** Les quatre médinas (`MEDINAS`,
  et toute fiche `typo: 'medina'`) posent de petites baies carrées
  (`ENTRESOL`) et les vitrines des souks, pas un étage à fenêtres ; une vitre
  en retrait sous un encadrement n'y est pas. Le mur-rideau des tours d'Asie
  et du Golfe reste sa tuile (v195). Mesuré : 681 morceaux, 0,46 Mo en
  moyenne, 1,59 au pire.

## Les Amériques en relief (v399) — un registre se donne aussi aux villes qu'une règle classerait mal

Palier B. Deux règles.

- **LA GÉOGRAPHIE DÉCIDE, L'HISTOIRE CORRIGE, ET LA CORRECTION SE NOMME.**
  `registreAmeriques` (facadeshd.js) : longitude de la fiche, `nordAmericain`
  au nord de 24° N, `latino` au sud ; `LATINO_AU_NORD` nomme Monterrey et La
  Nouvelle-Orléans avec leur raison, `PACIFIQUE` les îles qui attendent le
  palier C. Même forme que `registreEurope` et `HORS_EUROPE` : une liste se
  conteste en la lisant.
- **CE QUI SE MESURE.** 505 morceaux sur les 61 villes : 0,44 Mo de façades en
  moyenne, 1,62 au pire (Buenos Aires) ; Paris, l'Europe, Washington et San
  Francisco identiques à l'octet (sonde d'empreinte, `Math.random` figé).

## Washington et San Francisco en relief (v398) — une fiche dit sa forme, un uni se lit à sa couleur

Palier A du reste du monde. Quatre règles.

- **UNE VILLE QUI N'EST PAS UN DISQUE LE DÉCLARE DANS SA FICHE.** Washington est
  une boîte (`boite: ZONE_WASHINGTON`) : le cercle du registre (187 blocs) ne
  couvre pas Georgetown. `villeHD` lit la boîte, élargie d'un morceau comme le
  disque. La règle de la v362 (la porte de Manhattan), du côté de la couche.
- **UN REGISTRE PAR QUARTIER SE DEMANDE À LA RÈGLE DU BÂTISSEUR.** San Francisco
  a trois villes dans une : `quartier(wx, wz)` dans la fiche lit `quartierSF`,
  la même fonction que `batirColonneSF` — pierre au centre, brique à SoMa,
  bardage des Victoriennes (`sfCentre`, `sfSoma`, `sfMaisons`). Mesuré : centre
  pierre 3 060 et bardage 0, Alamo Square bardage 10 700 et pierre 0.
- **UN UNI SE LIT À SA COULEUR, ET LE BLOC DE BRIQUE DU JEU EST UN MUR.** Le mur
  de ces villes est un uni (le marbre blanc, le calcaire crème, la brique
  chocolat de `MURS.brique`) ou `BLOCK.BRICK`, que `murVoisin` ne lisait pas :
  `unis` (couleur → tuile) et `uni` (le défaut) dans le registre ;
  `briqueDuJeu` dans la fiche, lu par `murHD` et `murVoisin`. L'anthracite et le
  noir restent de l'enduit chez les Victoriennes : c'est le toit vu de côté — vu
  en capture, un bardage de clins sur l'ardoise.
- **UNE TUILE NEUVE S'AJOUTE EN FIN D'ATLAS, ET SA MOYENNE SE MESURE.**
  `bardage` est la vingt-huitième ; les index d'avant ne bougent pas, et
  l'empreinte de Paris le prouve. `MOYENNE_TUILE` est relevée sur les peintres
  (sonde `moyennes.mjs` : brique et enduit retrouvés au dixième, pierre et
  bardage ajoutés).

Et la sonde d'empreinte a trouvé que **le Colisée du catalogue n'est pas le même
d'un lancement à l'autre** (`monuments.js`, `Math.random` dans ses gradins
effondrés, en production depuis la v346) : deux exécutions rendent 173 blocs
différents au centre de Rome, et le worker et le fil principal deux Colisées.
Hors de la zone de la couche (un bloc écrit) : dette déclarée dans `TASKS.md`.
Une empreinte de monde fige `Math.random` avant d'importer `src/`.

## Toute l'Europe en relief (v394) — un registre par géographie, et un compte qui voit ce qu'il compte

Palier C : les quatre-vingt-dix villes engendrées d'Europe. Trois règles.

- **L'EUROPE EST UNE BOÎTE MOINS UNE LISTE QUI SE LIT.** `registreEurope`
  (facadeshd.js) prend la latitude et la longitude de la fiche ; `HORS_EUROPE`
  nomme, avec leur raison, les villes de la boîte qui n'en sont pas (Caucase,
  Anatolie, Maghreb). Le registre suit la vraie ville, pas son tissu : îles
  britanniques → `londres`, au sud de 45,5° N → `sud` (persiennes, fer,
  stores), au nord → `nord` (encadrement de pierre). `VILLES_HD` passe à
  94 disques, toujours une liste par morceau.
- **UN COMPTE DE TUILE NE VOIT PAS CE QUI S'ÉMET EN UV ABSOLUS.** La
  ferronnerie et la croisée portent le rectangle `NEUTRE` : comptées à la
  tuile elles rendaient zéro partout, et « pas de fer » à Londres et à Lille
  était vrai à vide pendant deux livraisons. Le fer se compte à sa MATIÈRE
  (`compteFer`, parishd.js). Un témoin d'absence se vérifie capable de voir
  la présence : il fallait Rome pour le voir rendre autre chose que zéro.
- **CE QUI SE MESURE.** 1 676 morceaux des villes engendrées : 0,55 Mo de
  façades en moyenne, 1,71 au pire (Barcelone) ; un morceau détaillé coûte au
  worker à peu près le double d'un morceau plat (20 → 45 ms sous node, comme
  Paris 28 → 108), seulement à portée de `RAYON_HD`. Paris, Londres, Nice et
  Lille identiques à l'octet.

## Nice et Lille en relief (v392) — un registre par ville, une patine par tuile

Palier B. Deux règles.

- **LA PATINE EST PAR TUILE, ET « CHAUD » DÉSATURE SANS CHANGER LA CLARTÉ.**
  `patine: { brique: [part, rgb], enduit: [part, 'chaud'] }` : l'orange de
  signalisation et le jaune de balise de la palette de Nice vont vers leur
  propre gris réchauffé ; la brique de Lille vers une brique cuite. De près
  seulement, le loin garde la tuile du voxel.
- **LA CORNICHE LIT SON MUR DESSOUS.** `murVoisin` regarde à gauche, à droite,
  puis dessus — sauf pour une corniche, dont le dessus est le toit : sans cela
  elle prendrait la couleur des tuiles. Londres (sans corniche) et Paris (sans
  registre) restent identiques à l'octet, mesuré.

Mesuré : Nice 0,30 Mo par morceau en moyenne, 0,74 au pire ; Lille 0,48 et 1,06.

## Londres en relief (v390) — la couche HD devient une question par ville, et le mur suit la baie

La consigne de Max (« when done do all European cities »), palier A. Cinq règles.

- **`couvreHD` DEMANDE UNE LISTE DE DISQUES, PAR MORCEAU.** `VILLES_HD`
  (facadeshd.js) porte une fiche par ville couverte ; `villeHD(cx, cz)` rend la
  fiche, le mailleur la passe à `facadeHD`. Jamais les 280 villes du registre
  par colonne. Une fiche porte son REGISTRE (`STYLES.londres`) et
  `mobilier: false` : la colonne Morris et le banc Davioud restent à Paris.
  Le mot est dans la fiche, jamais une condition sur un nom dans un registre.
- **HORS DE PARIS, LE MUR AUTOUR D'UNE BAIE EST LE MUR D'À CÔTÉ.** Les villes
  bâties à la main ne posent de blocs ARCHI qu'aux fenêtres ; le mur est un
  bloc de décor. `voisin: true` lit le bloc de décor voisin (gauche, droite,
  DESSUS puis dessous — dessous, c'est souvent un massif de fleurs, vu en
  capture) et en prend la tuile (Briques → `brique`, Uni → `enduit`) et la
  couleur. Les ornements (encadrement, appui, châssis) ont leur teinte à eux
  (`orn`) : sans `orn`, Paris rend tout à l'identique, au bit près.
- **UNE BAIE HD DANS UN MUR VOXEL FAIT UN CARRÉ CLAIR — le mur passe donc dans
  la couche.** Vu en capture : le matériau HD (rugosité, métal) ne rend pas la
  même lumière que le voxel pour la même couleur. Les murs de décor des motifs
  « Briques » et « Uni » sont détaillés d'une face plate (`murHD`), les mêmes
  qui partent dans `plat`. SEULEMENT ces deux motifs : un bloc à damier, à
  pois, à losanges qu'un enfant a posé garde son dessin — la couche n'a pas sa
  tuile, elle ne change pas l'apparence d'une création.
- **UNE TEINTE DE MUR SE CALCULE SUR LA MOYENNE DE LA TUILE, EN LINÉAIRE.**
  `MOYENNE_TUILE` est mesurée sur les peintres de `matierehd.js` ; le rapport
  sRGB passe à la puissance 2,2 (v345). La brique de la palette (Rouge 200, 62,
  56) est patinée de près (`patine`), le loin garde la tuile du voxel.
- **CE QUI SE PROUVE, ET COMMENT.** L'empreinte des tampons HD de 256 morceaux
  de Paris est identique sur `origin/main` et sur la branche (8f3652af…) ;
  Londres à `hd 0` aussi (b15d4f39…) : le palier bas ne reçoit rien de neuf. Un
  morceau de Londres pèse 0,5 Mo en moyenne, 1,2 à 1,45 au pire — Paris en pèse
  dix — et le vol au palier moyen tient 22,5 Mo pour 128. Un chambranle en
  boîtes coûtait 60 sommets par fenêtre (1,96 Mo au pire) : des plans.

Ce qui reste, déclaré : le raccord ville/campagne (v308) n'est interdit qu'à
Paris — à Londres, une colonne de raccord montre la surface plate, pas le sol
HD (l'étendre changerait la forme du sol, donc la hauteur des pieds).

## Les circuits des villes engendrées (v387) — ce qui se partage est une voie, pas une rue

« Lance sur toutes les villes. » Mesuré sur `origin/main` (v373) : 147 des 262
villes engendrées n'avaient qu'UN circuit (48 superîlots, v282), 43 anneaux de
28 villes passaient DANS un monument, et le plus petit anneau roulait sur
l'axe de la rue. Huit règles.

- **UNE BARRE DE PARTAGE SE RELIT QUAND LA RUE CHANGE DE SECTION.** La v211 a
  posé vingt blocs quand une rue n'avait qu'UNE file. Depuis la v271 elle en a
  deux et l'on roule à droite : deux anneaux de part et d'autre d'une rue la
  parcourent en sens contraires, chacun sur sa voie — ils se CROISENT. Seuls
  ceux du même côté se SUIVENT. `partageDeRue` compte par voie (le côté de
  l'anneau multiplié par son `sens`) ; le témoin le mesure sur les TRACÉS sans
  la formule (écart, sens, recouvrement). La piste « barre en fraction du
  périmètre » déclarée en v282 laissait deux convois se suivre : écartée.
- **UN DÉCALAGE BORNÉ PAR LE PAS NE DÉCALE PAS LE PLUS PETIT.**
  `Math.max(t.pu, Ru − voie)` laissait l'anneau d'un pas de demi-côté sur
  l'axe. Le témoin « à droite » de la v271 le lisait comme à droite (« vers le
  centre du rectangle ») ; relu comme « à droite de l'axe de la rue », il rend
  325 relevés à gauche sur `origin/main`, zéro ici.
- **QUAND LA GÉOMÉTRIE N'A QU'UN CYCLE, LE SECOND CIRCUIT EST LE CONTRESENS.**
  Une ville de rayon < 2,3 pas n'a que trois rues de chaque côté du centre, et
  la place (et sa fontaine) est sur le nœud central : un seul cycle l'évite.
  Le contresens (`sens: -1`) roule côté extérieur, sur les mêmes tabliers.
  Les anneaux en pas de trame (côtés impairs, phase 2 bis) et le contresens
  doivent rouler sur la chaussée (`horsChaussee`) ; les anneaux d'avant ne le
  font pas toujours — c'est mesuré et déclaré (`TASKS.md`), parce que le
  filtre appliqué à eux viderait treize villes.
- **UN ANNEAU NE TRAVERSE PAS UN MONUMENT, ET L'ON LIT LE BÂTISSEUR.** La dette
  d'Agra (v362) était le cas visible de 43 anneaux. `contreUnMonument` lit les
  couches 1 à 3 du bâtisseur sous la largeur de la carrosserie (la règle de
  `avenueDEntree`, v365), ne bâtit que les monuments dont la boîte approche la
  voie, et la couverture perdue (Agra 84,5 %) est regagnée par des anneaux de
  quartier cherchés sous node (`ANNEAUX_EN_PLUS`). On déplace l'ANNEAU, jamais
  la boîte, qui entre dans les zones du relief.
- **UN CALCUL QU'ON ENRICHIT SE DÉPLACE LÀ OÙ IL SERT.** Les anneaux des 262
  villes passaient de ~230 à ~700 ms, derrière le bouton « Jouer » (v258). Un
  convoi ne naît qu'à 220 blocs de sa ville : `circulationsAPlier` rend un
  repère par ville (même ancre, donc même instant) et `deplier()` calcule ses
  anneaux à l'approche. `tracesCirculation` rend le même tout, pour les témoins.
- **UN TÉMOIN QUI LIT UNE LISTE DE VILLES NE VOIT PAS LES AUTRES.** Le témoin
  des ponts ne lisait que cinq villes et celles des routes ; lu sur les 56
  villes à pont, `origin/main` en avait sept fautives, dont cinq jamais vues.
  Et sa barre « 60 % de l'axe sur l'eau » valait pour les grands fleuves : une
  culée se compte par tablier (quatre pas à sec au plus).
- **UN TABLIER COUVRE LA COLONNE OÙ LA VOITURE ARRONDIT, PAS SEULEMENT L'EAU
  DE L'AXE.** La voiture roule sur des colonnes entières (`Math.floor`) ; un
  tablier borné exactement aux abscisses mouillées laissait au bout une colonne
  d'eau non couverte — Berlin en v362, Munich ici, sur le témoin des ponts au
  portail. `pontDeVille` porte un bloc de plus à chaque bout (`a0 − 1`,
  `a1 + 1`) ; mesuré, cela n'ajoute qu'un bloc de tablier à Rome et à Tokyo.
- **DEUX SESSIONS ONT LIVRÉ LA MÊME RÈGLE, ET L'ON EN GARDE UNE.** La v378
  (une autre session) a écarté les monuments et déplié les anneaux à
  l'approche pendant que cette livraison faisait de même. À la fusion, une
  seule implémentation reste (`contreUnMonument`, `circulationsAPlier`), et
  les TÉMOINS des deux restent : le nom que lit le témoin de la v378
  (`tracesCirculationParesseuses`) est un alias, ses anneaux de quartier
  d'Agra et du Cap partent avec son filtre. Ce qui le permet est une mesure,
  pas une préférence : ville par ville contre `origin/main` v379, aucune ne
  perd de couverture ni sa voiture en vue (sonde `couv.mjs`), et son témoin
  rend toujours zéro monument en travers. Deux filtres pour la même règle
  finiraient par diverger, et l'anneau écarté par l'un passerait par l'autre.

## La rue à l'allure d'une ville (v395) — chaque voiture suit la grille à SON heure

Max : « des vitesses de circulation cohérentes ». Une rue roulait à quinze
km/h. `circulation.js` (pur) porte les limitations (40 · 50 · 120 km/h), le
profil d'un tracé (limite, virage √(a/κ), freinage AVANT, accélération d'une
voiture) et sa grille horaire ; `vehicules.js` l'applique. Huit règles, et
toutes sont nées d'une sonde qui contredisait le premier jet.

- **UNE VOITURE SUIT LA GRILLE À SON HEURE, PAS À LA DISTANCE DE LA TÊTE.**
  Un convoi avançait d'un bloc d'un seul tenant : toutes ses voitures
  prenaient la vitesse que la grille donnait à la TÊTE — un virage pris à
  l'allure de la ligne droite. La voiture i passe partout `i × P / nb`
  secondes après la tête (`updateProfil`, `base[i]`) : la file se resserre
  dans le coin et se détend dans la ligne droite, et c'est toujours une
  fonction de l'horloge (v305). Le nombre de voitures se calcule en TEMPS
  (une toutes les deux secondes au plus) et se borne par un tour simulé où
  deux voisines ne se touchent jamais (`nbSansChevauchement`).
- **CE QUI RESTE LOCAL FREINE, IL NE PILE PLUS.** Feu, voiture devant,
  enfant, piéton : `cederLePassage` pose une `cible` (√(2·a·s), la vitesse
  qu'on peut avoir à s blocs de l'arrêt) et la voiture y va à l'accélération
  d'une voiture (`rapprocher`) ; ce qu'elle n'a pas fait devient son `retard`,
  comme avant. Le balayage grandit avec la vitesse (distance de freinage plus
  une demi-seconde). **SAUF DEVANT UNE PERSONNE : là où le freinage d'urgence
  ne suffit plus, on PILE.** Vue tard, une voiture à cinquante touchait la
  voiture de l'enfant, et « pas si l'on est déjà dedans » (v245) la laissait
  alors le traverser — trois et quatre relevés au travers, `monte.js` rejouée
  seule deux fois, zéro sur la v363. Le confort cède devant l'enfant, un ami
  ou un piéton, jamais l'inverse. Et un arrêt d'urgence vaut dans les DEUX
  chemins de mise à jour d'un convoi : le second ne le lisait pas.
- **SEUL LE PROCHAIN FEU DE SON AXE COMPTE.** Vu à quarante blocs, il y avait
  presque toujours un feu « de son axe » au rouge : dans les villes bâties à
  la main la parité (`axeDuFeu`) ne s'aligne pas d'un carrefour à l'autre.
  Mesuré : 70 % des voitures de Paris à l'arrêt, des files qui ne repartaient
  jamais. Et au milieu d'un carrefour au rouge, on le dégage. **La portée
  de recherche se calcule sur le freinage** : à treize blocs par seconde il
  en faut vingt-cinq pour s'arrêter en confort, et un feu cherché à soixante
  blocs du joueur n'était pas encore connu quand la voiture devait freiner —
  elle pilait. Cent dix blocs, les morceaux balayés à ±7.
- **EN TRAVERS, ON PRÉVOIT, ET LA PREMIÈRE ARRIVÉE PASSE.** Deux voitures qui
  arrivent ensemble à un carrefour ne sont sur le chemin de l'autre qu'une
  fois dedans. On pose le chemin de l'autre sur deux secondes et demie, et un
  contact compte s'il tombe à peu près quand on y sera ; dans une paire
  mutuelle, passe celle qui arrive la première — sauf si l'autre est DÉJÀ
  sur son chemin. Une voiture qui coupe la route loin devant aura passé : en
  travers, on ne regarde que la distance de freinage plus quatre blocs.
- **LA PATIENCE NE VAUT QUE POUR UN NŒUD, PAS POUR UNE FILE.** Quatre
  secondes (v244) dénouent deux files qui se bouchent un carrefour ; une
  file arrêtée derrière un feu, l'enfant, un piéton ou un train est
  « légitime » et attend sans limite — sinon la deuxième voiture passait au
  travers de la première au bout de quatre secondes. La légitimité ne se
  propage que dans SA file. Et la patience se compte en temps RÉEL : en
  `dt` borné, quatre secondes en duraient vingt-cinq au banc.
- **UNE SUIVEUSE DE LA MÊME FILE N'EST PAS UN OBSTACLE — SAUF DANS UN HUIT.**
  Regarder celle qui suit bloquait les deux dans un virage serré (elle attend
  que je parte, j'attends qu'elle parte). On ignore les DEUX qui suivent
  (moins de quarante blocs derrière le long du tracé) : un circuit en huit
  repasse par son propre carrefour, et une voiture de la même file à douze
  rangs de là y arrive en travers — celle-là est un obstacle comme une autre.
- **UN TRACÉ D'AVENUE SE NETTOIE AVANT DE SE DÉCALER.** On roule à droite
  sur les avenues des villes bâties à la main (`decalerADroite`, 1,3 bloc) ;
  `chainerVoies` y laissait des épis d'un ou deux blocs (aller-retour au point
  de croisement), que le décalage changeait en boucles. `sansEpis` retire tout
  sommet où le tracé rebrousse, avant ET après le décalage.
- **L'ARRÊT D'URGENCE AU CONTACT NE VAUT QU'ENTRE DEUX FILES.** Dans une
  file, c'est le suivi qui règle la distance ; un arrêt d'urgence contre sa
  propre devancière transformait chaque arrivée au feu en arrêt sec (le
  témoin « on freine avant le feu » l'a vu).
- **DEUX TABLETTES SE COMPARENT PAR LA FONCTION, PAS PAR LA VITESSE.** Mon
  premier témoin à deux tablettes ramenait les deux relevés à la même heure
  par une vitesse linéaire : faux dès qu'une grille freine et accélère. On
  demande à Alice `distanceA(clé, heure de Marlon)` : la v305 promet
  l'égalité exacte, on l'exige à moins d'un bloc.
- **UN COMPTE DE CHEVAUCHEMENTS EST UN TAUX.** Le témoin de la v277 était un
  tirage (0 à 53) ; celui-ci rapporte les paires qui se touchent aux paires
  EXAMINÉES. Et la sonde (`sonde-circulation.cjs`) range chaque contact par
  famille (même file / autre file, à l'arrêt / en marche, même sens / face /
  travers) : c'est ce qui a nommé, l'un après l'autre, le blocage mutuel, les
  épis, le huit et le flanc trop près.
- **UN CIRCUIT QUI SE RECOUPE SE CADENCE COMME UN CARREFOUR.** Le huit de
  Paris (−333, 271) repasse par son propre croisement : deux voitures de la
  MÊME file s'y présentent ensemble, en travers, chacune attend l'autre, la
  patience les relâche, et la seconde traverse la première. Le portail l'a
  rendu (taux 7,5 %, deux arrêts secs). Remède dans la GRILLE, donc partagé
  par les deux tablettes : `nbSansCroisement` choisit le nombre de voitures
  pour que les écarts de passage au croisement ne tombent jamais à moins
  d'une seconde et demie d'un multiple de l'intervalle P/nb — un feu sans
  feu. Et une file bloquée par une voiture de SA file elle-même légitime est
  légitime à son tour, quel que soit le rang (propagation sur six passes).
  Sonde : 2 % → 0,6 à 1,6 % de paires au contact, zéro arrêt sec — le reste vient
  d'une voiture qui rattrape son retard (une fois et demie l'allure) et
  arrive au croisement hors de sa grille.

- **UNE ANNONCE QUI PORTE UNE HORLOGE RÉELLE SE CADENCE EN TEMPS RÉEL.**
  L'hôte annonçait l'heure de la rue (v305) sur un compte à rebours en `dt` :
  à deux images par seconde, une fois par demi-minute, et l'invité qui avait
  calé gardait sa rue en retard d'autant — l'intermittence de `reseau.js`
  déclarée sous la v351, rouge des deux côtés une fois sur deux. C'est le
  piège de `dt` de la v226 une cinquième fois : avant de chercher pourquoi
  deux tablettes divergent, on demande à quelle cadence elles se recalent.

**Ce qui reste, déclaré** (`TASKS.md`) : le bus ne marque plus d'arrêt (il
roule dans la file de son anneau — un convoi ne double pas) ; l'arrêt d'une
voiture heurtée et le freinage devant l'enfant sont LOCAUX (comme l'instant où
une voiture cède, v305) ; la variance est par convoi, pas par voiture ; les
types de voie suivent le circuit (rue engendrée, avenue nommée, autoroute),
pas chaque tronçon ; au croisement saturé d'un circuit en huit, la file
peut encore se nouer : 0,4 à 1,6 % de paires au contact.

## Les voitures contournent les monuments (v378) — un test qui écarte un candidat se mesure en temps de démarrage

Deux règles.

- **UN ANNEAU QUI PASSE DANS UN MONUMENT EST ÉCARTÉ À LA SOURCE.** Les repères
  se posent après les colonnes ; l'anneau se choisit donc contre les cases
  que le BÂTISSEUR pose à hauteur de carrosserie (couches 1 à 3), tournées une
  fois dans le repère de la trame (`traverseUnMonument`), jamais contre la
  boîte : à la boîte, Stockholm n'avait plus une voiture (mesuré). Le test
  passe après le partage et AVANT l'eau — mis en dernier, l'eau tournait sur
  ce qu'il aurait écarté (310 → 410 ms).
- **UN CALCUL QUE LE JEU NE LIT QU'À L'APPROCHE NE SE FAIT PAS AU DÉMARRAGE.**
  Échantillonné au demi-bloc, ce test coûtait 157 → 1 075 ms dans
  `preloadSpawn` ; en analytique, encore +150 ms, que l'on payait pour 262
  villes dont l'enfant n'en verra qu'une. `tracesCirculationParesseuses`
  donne une marque par ville, `animerLesVilles` la déplie à 220 blocs ; un
  témoin exige les mêmes traces que le calcul entier. Un premier dépliage
  coûte au plus 43 ms (Rome, le Colisée du catalogue), une fois.
  *(Depuis la v387 le filtre est `contreUnMonument` et le dépliage
  `circulationsAPlier`, dont `tracesCirculationParesseuses` est l'alias : voir
  « Les circuits des villes engendrées (v387) ».)*

## Les huit derniers palais (v375) — une boîte se relève en carte avant qu'on la remplisse

Deux règles.

- **UNE BOÎTE DE REPÈRE N'EST PAS UNE PARCELLE LIBRE.** Les anneaux de
  voitures des villes engendrées se choisissent sur la trame sans regarder les
  repères : la carte des huit boîtes (anneaux, eau) a montré que quatre
  gabarits coupaient déjà un anneau à hauteur de carrosserie, et celui de
  Stockholm était sur l'eau. Avant d'écrire un bâtisseur, on dessine la boîte
  (`R` anneau, `~` eau) et l'on bâtit dans ce qui reste ; un témoin de
  `plafond.js` le garde pour tous les monuments (`DETTE_ANNEAUX` : quarante-cinq
  conflits d'avant, chiffre par chiffre, que rien ne doit aggraver).
- **UN PALAIS S'ÉCRIT UN POUR UN, ET « UN POUR UN » SE VÉRIFIE.** Les paliers
  `[[0, 0], [1, 1], [S + 1, vraie + 1]]` ne rendent l'identité que si la
  hauteur du ciel de `vraie + 1` tombe dans [S + 1, S + 2) : on prend S = la
  `cible` que la table donnait, et l'on vérifie sous node que
  `floor(hauteurEtiree(y)) === y` pour toutes les couches. Sinon une couche se
  répète et une fenêtre est redessinée (v365).

## Plus une coupole de gabarit (v369) — une forme fausse ne dépend pas de la hauteur

Trois règles.

- **UN TÉMOIN QUI NE COMPTE QUE CE QUI MONTE LAISSE LES FORMES FAUSSES QUI
  RESTENT BASSES.** Celui de la v365 ne regardait que les gabarits au-dessus
  d'une fois et demie leurs toits ; cinq coupoles restaient dessous, toutes
  fausses (des voiles d'acier, un stade, un octogone, un haricot). Le témoin
  neuf demande la forme, pas la hauteur : aucun repère ne garde `dome`.
- **UN STADE, COMME UNE PYRAMIDE, NE S'ÉTIRE PAS.** Étiré au ciel de Toronto,
  le Rogers Centre montait deux fois plus haut que large : un silo, que le
  témoin des gabarits a d'ailleurs pris pour une tour. Il est `vrai`, à sa
  hauteur d'auteur. Une forme large et plate se déclare au lieu de s'étirer.
- **LE `k` MAXIMAL N'EST PAS LE BON `k` QUAND UN REPÈRE FIXE EST TROP BAS.**
  L'hôtel de ville de Toronto, devenu une tour sur son corps, décomprime la
  courbe jusqu'à `k` 1 sans rompre l'ordre — mais il y monte à 40 blocs sous
  une CN Tower de 553 m à 45. L'ordre strict est tenu, les proportions non :
  Toronto garde 0,3 (28 blocs), et c'est mesuré. De même le Panthéon de Rome,
  étiré à ses 43 m, passait le Colisée fixe à 19 : il reste à sa hauteur
  d'auteur, dix blocs, celle de ses voisins.

## Monter en voiture comme dans un vrai jeu (v366) — une animation qu'on impose garde sa porte de sortie

Max : « on voit le personnage qui avance et qui rentre dans la voiture avec la
porte qui s'ouvre ». `src/embarquement.js` (la séquence) et `src/portieres.js`
(la portière fabriquée). Six règles.

- **L'ÉTAT NE MENT JAMAIS PENDANT L'ANIMATION.** `montureConduite()` ne devient
  vrai qu'une fois ASSIS (la séquence appelle `toggleRide` à ce moment-là), et
  redevient faux au PREMIER appui de « Descendre » ; ce qui se joue entre deux
  se publie à part, `player.embarquement = { phase, t, sens }`. Un témoin qui
  lit l'état (v252) ne le voit jamais ambigu. Et la voiture ne bouge plus :
  l'ancien geste la téléportait sous l'enfant (quatre blocs, mesuré) — c'est
  l'enfant qui prend le cap de la voiture, pas l'inverse.
- **UNE ANIMATION QU'ON IMPOSE GARDE SA PORTE DE SORTIE.** Un second appui
  termine tout de suite (assis, portière fermée) — la règle des réglages
  automatiques (v290) vue du côté d'un geste. La marche est bornée à 1,1 s de
  jeu (on presse le pas si la voiture est loin), la séquence entière à
  ≈ 2,4 s. Elle compte en temps de JEU (v226).
- **UNE PORTIÈRE SE FABRIQUE, ET LA GÉOMÉTRIE DE LA FLOTTE NE SE TOUCHE
  JAMAIS.** Aucun modèle n'a de nœud de portière (mesuré sur les 52). Les
  triangles dont le centre tombe dans le volume de la portière (derrière la
  roue avant, devant le montant, à plus de 0,6 bloc de l'axe) partent dans un
  maillage à part, pivot sur l'arête avant, 60° vers l'EXTÉRIEUR (signe lu
  dans la matrice par un témoin). Les géométries neuves PARTAGENT les
  attributs du prototype et n'ont qu'un index à elles, mémoïsées par modèle et
  marquées partagées (`liberer.js` ne les rend pas). Seule la voiture où l'on
  monte change ; un autre exemplaire garde le prototype, et un témoin le lit.
  Plan : 4 ms médian, 28 au pire, une fois par modèle.
- **LE PLAN SE PREND SUR LE PROTOTYPE, PAS SUR LA VOITURE — parce que deux
  sessions touchent la même tôle.** Les dégâts (`degats3d.js`, v343) clonent
  et déforment la géométrie de la pièce touchée ; un plan pris sur une voiture
  froissée serait mémoïsé pour tout le modèle. `voitureNeuve` retient donc le
  prototype et son clone (`userData.proto`, `userData.modele`), le plan se
  calcule sur le premier, et une voiture dont une pièce ne porte plus la
  géométrie du prototype ne s'équipe pas (`refus` : « abimee »). Dans l'autre
  sens c'est compatible par construction : quand la voiture gagne ses deux
  pivots, `degats3d` voit ses enfants changer, re-prépare ses pièces (la
  caisse découpée ET les portières) et rejoue les chocs. Mesuré : équipée puis
  froissée des deux côtés, 130 164 indices comme le prototype, 11 496 sommets
  enfoncés, la portière toujours sur son pivot.
- **AUCUN PROGRAMME NE NAÎT, ET CE QUE ÇA COÛTE SE DÉCLARE.** Même matériau,
  mêmes attributs : la portière se dessine avec le programme de la
  carrosserie. Un `DoubleSide` montrerait le revers de la portière et
  changerait la clé de programme (v246) : on ne le fait pas, le revers d'une
  portière que le modèle n'a pas meublée est invisible. Et une voiture équipée
  coûte quelques appels de dessin de plus (une portière par matériau
  découpé) — seulement celle où l'enfant est monté.
- **UN MODÈLE QUI CASSE S'EN PASSE, ET C'EST SA FICHE QUI LE DIT.**
  `portiere: false` (vehicules.js, FLOTTE) comme `habitacle` (v230) ; les
  taxis fabriqués (`fabrique`, triangles trop grands) aussi. 51 modèles sur 55
  ont leur portière. Un refus se dit (`refus` de `portieres.js`,
  `refusSortie` de la séquence) : « il est sorti côté passager » se démonte
  par la raison du refus du côté conducteur (« mur », « eau », « circulation »,
  « voiture »).
- **LE BANC SAUTE LA SÉQUENCE (`embarq=0`), ET CELA SE PROUVE PAR
  CONSTRUCTION.** `banc.js` le met dans toute adresse, comme `prep=0` ; les
  deux adresses écrites à la main (`reglages.js`, `realisme.js`) aussi
  (v258). Les témoins de conduite d'avant retrouvent donc l'ancien geste au
  bit près ; ceux qui éprouvent la séquence la demandent (`{ embarq: 1 }`).
  Et un témoin qui cherche son terrain (v285) : le couloir vide de la v237 est
  SOUS L'EAU, sans importance pour un mur, rédhibitoire pour une descente qui
  refuse l'eau — la page d'embarquement cherche une prairie sèche et plate.

**Les bords se coupent au plan (v372).** Un triangle à cheval sur un bord du
volume est COUPÉ au plan du bord (z0, z1, y0, y1), jamais emporté par son
centre — c'était 21 % de la surface sur la Lucid, et la portière débordait de
0,24 bloc. Trois règles. **Les sommets neufs sont des mélanges barycentriques
de TOUS les attributs** (position, normale, UV, couleur), recopiés BRUTS dans
leur type d'origine (un modèle quantifié reste quantifié) : rien ne change de
programme. **Les attributs d'un maillage coupé se recopient, agrandis** —
jamais ceux du prototype ; un maillage sans coupe garde les attributs partagés.
**Un plan de découpe se mesure en coût** : chaque sommet passe UNE fois dans
le repère de la voiture (un tableau à plat), un triangle tout entier d'un côté
d'un plan est rejeté par six comparaisons — sans cela le plan passait de 4 à
135 ms. Un bord net ne suffit pas à rendre une portière : les taxis l'ont, et
restent refusés parce que derrière il n'y a rien (0/24 rayons).

**Le passager monte par la portière, et l'ami la voit (v377).**
`monterChez` rejoue la séquence sur la voiture DISTANTE de l'ami (telle que
cette tablette la dessine), portière droite, et n'appelle `fin` (qui fait de
l'enfant un passager, fun.js) qu'une fois assis — `passagerDe()` ne ment pas
avant. L'ouverture et la fermeture partent dans un message court
(`portiere`, `{ de, c, o }`) : chaque tablette anime la portière de la
voiture de ce conducteur (`vehiculeDuConducteur`, la sienne si c'est elle qui
conduit), en temps de jeu. Nom neuf : l'ancienne tablette l'ignore, le
receveur cède, l'hôte relaie. Le témoin à deux tablettes lit les deux pages
au même instant ; il attend le RÉSULTAT (borné à 45 s) : à deux pages, une
séquence de 2,4 s de jeu prend vingt-sept secondes de montre.

**On monte dans un avion par un escalier (v389).** `monterAvion`
(embarquement.js) : marche au pied de l'accès, `gravir`, `ouverture`,
`entree` (l'enfant se baisse : la porte fait la moitié de sa taille),
aux commandes (`toggleRide`, l'état bascule ICI), `fermeture`. Trois règles.
**L'accès se déclare avec le modèle** : `userData.porte` (avions.js, posé par
`fini`) donne le seuil, le type (`escalier`, `echelle`), le membre qui
s'ouvre et de combien ; `null` (le Concorde, fuselage de 0,94 bloc, mesuré)
monte d'un coup — la discipline de `portiere: false`. **Ce qui s'ouvre est un
MEMBRE de l'atelier** (`porte_avant`, `verriere`), pas une géométrie
découpée : la voiture n'a pas de nœud de portière, l'avion est notre propre
modèle et on lui en donne un — un appel de dessin de plus par appareil.
**L'escalier est fabriqué par l'atelier** (`accesAvion`), donc avec
`matiereVivante` : aucune clé de programme neuve par construction, et un
témoin les compare. Il est gardé et `partagerTout` : un avion retiré pendant
la séquence ne le rend pas au pilote. Et un emplacement d'échelle se MESURE
(v223) : au droit de la verrière, elle traversait les canards du chasseur.
**Et un témoin qui pose l'enfant d'après la matrice d'un modèle qu'on vient
d'invoquer la lit à l'origine du monde** : le modèle n'est placé qu'à l'image
suivante — mon premier jet posait l'enfant à trente blocs de l'avion, et le
bouton ne trouvait rien. On copie `a.pos` dans le maillage avant de lire.

**On descend d'un avion par son escalier (v400).** `descendreAvion`
(embarquement.js) : `toggleRide(null)` au PREMIER appui, puis `ouverture`
(dedans, caché), `sortie` (il se redresse, la porte fait la moitié de sa
taille), `descente` (un escalier de face, une échelle face aux barreaux),
`fermeture` (l'escalier s'en va). Seulement un avion AU SOL qui a une porte ;
en vol, le Concorde et `embarq=0` : l'ancien geste. Deux règles.
**Autour d'un avion, la place se lit sur le SOL DE LA COLONNE, pas à la cote
des roues** (`placeAuSol`) : un appareil est long, et sur la pente du couloir
de la v297 le pied des marches est à quatre blocs des roues — la recherche
« cote des roues ± deux » de la voiture rendait « mur » partout. Une colonne
d'eau, une pente de plus de quatre blocs ou une boîte pleine sont refusées,
et l'on se pose alors d'un coup à une place libre autour ; le refus se dit
(`refus.escalier`, `?diag=1`). **Et l'ancien geste posait l'enfant DANS
l'eau** quand l'avion s'arrête au bord d'un lac (mesuré sur `origin/main`) :
un geste instantané ne regarde pas où il pose, une séquence doit le faire.
Le passage vit dans `sonde-descente-avion.cjs` et `monte.js` l'appelle tel
quel (`passage`, `juger`) : une copie de sonde finit par diverger du témoin.

**Le passager suit la voiture de son ami, pas un maillage gardé (v407).**
Une tablette REFAIT le maillage de la voiture d'un ami quand sa clé change
ou quand l'ami est recréé (`synchroniserVehiculeDistant`) ; la séquence qui
gardait l'ancien maillage s'annulait (« la voiture n'existe plus ») — le
rouge de `reseau.js` qui allait et venait depuis la v377. `chez.veh()`
redemande la voiture de CE conducteur à chaque image (`suivreLaVoiture`) :
maillage changé → on s'y rebranche ; voiture absente → on attend
`ABSENCE_MAX` (1,5 s de jeu) avant d'annuler. **Une séquence suit une
IDENTITÉ (le conducteur), jamais un objet de rendu qu'un autre module peut
remplacer.** Le témoin provoque l'état (v393) en changeant la clé chez Lou
pendant la marche, et les témoins du passager publient un `suivi` image par
image de la voiture de l'ami.

**Une séquence qu'on ne juge qu'au banc se fait lire sur la tablette (v396).**
Le banc saute la séquence (`embarq=0`) et rend en logiciel : durées, caméra et
image figée ne se valident que sur l'iPad. `?diag=1` porte donc une ligne de
la dernière séquence (`embarquementDernier`, relevée à la transition dans
`publier`, sans rien changer à la séquence) : sens, voiture / ami / avion,
secondes de JEU, et comment elle a fini (jusqu'au bout, second appui,
annulée), plus le côté de sortie et le refus du côté conducteur. La liste des
gestes que Max fait pour valider est dans `TASKS.md` (« POUR MAX, SUR LA
TABLETTE »). **Une fonctionnalité que le banc ne peut pas juger livre avec
l'instrument qui la juge ailleurs**, comme le palier (v284) et le journal de
bord (v296).

**Le passager descend par la portière, à l'envers (v384).** `descendreDeChez`
rejoue la descente du conducteur sur la voiture DISTANTE, côté passager
d'abord (`choisirSortie(a, d, [1, -1])`). `passagerDe()` est effacé AVANT
d'appeler la séquence — on n'est plus passager au premier appui, comme
`toggleRide(null)` pour le conducteur. Le même message `portiere` ouvre (au
départ) et ferme (au début de la fermeture) la portière chez les autres ;
`terminer` et `annuler` envoient la fermeture s'ils coupent la séquence avant.
Sans séquence (`embarq=0`), rien ne change : l'enfant reste où il était, au
bit près. **Un témoin à deux tablettes se mesure vite par une sonde qui en
recopie le passage** (`sonde-descente-passager.cjs`, deux minutes contre
vingt pour `reseau.js` entière) — c'est elle qui a rendu le rouge sur
`origin/main`.

**Le revers d'une portière se fabrique (v373).** Aucun modèle n'a meublé
l'intérieur de sa portière : de derrière, la face simple était culée (0 rayon
sur 24, sur les cinquante modèles). La portière reçoit une copie compacte de
ses sommets puis une seconde, normales retournées, triangles à l'envers, DANS
la même géométrie : même matériau, même programme, même appel de dessin.
`userData.endroit` dit où finit l'endroit dans l'index (un témoin qui mesure
une surface ne compte pas le revers). Un `DoubleSide` aurait changé la clé de
programme (v246). **Et une sonde de rayons voit les couches** : la
carrosserie vit sur la couche 2 (v245), un `Raycaster` neuf ne voit que la
couche 0 — ma première sonde rendait « on traverse » de face comme de dos, et
c'est son CONTRÔLE (la même cible vue de face, 0 sur 24) qui l'a dit.

**Un terrain de témoin « loin des villes » se juge sur TOUTES les villes
(v373).** `cityAt` ne connaît que les villes bâties à la main ; la « prairie »
du témoin de la descente était dans Manchester, et le refus « circulation »
qu'on cherchait depuis la v366 était un vrai circuit de la ville. On lit aussi
`dansVilleMonde`. **Et une sonde de navigateur ne tourne pas pendant un
portail** : le portail de la v372 en a rendu dix-sept rouges de cadence, que
la suite rejouée seule ne reproduisait pas.

**Et une résolution de conflit a avalé deux modules d'une autre session.**
Rebasée sur la v344, ma résolution de `sw.js` remplaçait le bloc en conflit
par la seule ligne `CACHE_VERSION` — or le bloc contenait aussi les lignes
`ASSETS` que la session des dégâts venait d'ajouter : `degats.js` et
`degats3d.js` seraient partis hors du cache hors ligne. C'est la fumée
(« tout module du jeu arrive sur la tablette ») qui l'a dit. **Une résolution
de conflit se relit dans `git diff origin/main`, jamais seulement dans le
fichier** : le diff montre ce qu'on retire à l'autre côté.

Ce qui reste, déclaré dans `TASKS.md` : la vue de la séquence ne se juge que
sur le banc, pas sur l'iPad ; les amis ne voient pas la porte d'un avion
s'ouvrir, ni celle d'une rame (v489).

## Les coupoles ont leur édifice (v365) — un gabarit partagé se cherche dans toutes les villes, et le ciel se lit sur les modèles

La suite de la v357 : « une coupole sans sa nef devient une tour », pour toutes
les villes. Sept règles.

- **UN GABARIT SE MARQUE, ET LE TÉMOIN LE RECONNAÎT DES DEUX CÔTÉS.** `dome` et
  `palaisLong` portent `gabarit` (villesmonde.js) ; sur l'ancien code, qui ne
  la porte pas, le témoin reconnaît la dernière ligne du bâtisseur
  (`String(f)`). C'est ce qui lui fait mesurer le MÊME défaut des deux côtés
  (règle v302) : seize sur `origin/main`, du Berliner Dom au palais d'Hiver,
  zéro ici. Saint-Pierre (v357) passait déjà.
- **« PAS UNE TOUR » A DEUX GRANDEURS, ET L'UNE DES DEUX SUFFIT.** L'ASSISE
  (l'emprise des trois premières couches sur la plus large couche de la moitié
  haute : une coupole sur sa nef en a au moins deux, sur son seul tambour un) ou
  la CARRURE (la hauteur sous deux fois le petit côté du pied : un palais à cour
  est un bloc). Une hauteur sur une emprise ne départage PAS : le Panthéon de
  Paris, validé en capture, a l'élancement d'une tour, parce que le ciel double
  les hauteurs.
- **LA RECETTE D'UNE COUPOLE REMISE AU CIEL, née de deux captures.** Sur une
  petite emprise, étirer le TAMBOUR fait une tour (Florence, Berlin, premier
  jet). Le corps, large, prend l'étirement ; la coupole s'écrit avec assez de
  couches pour en être une (surhaussée : plus de couches que de rayon) et reste
  rigide ; la lanterne s'écrit sur quatre ou cinq couches pour ne pas devenir
  une aiguille. Les paliers sont en mètres ÉCRITS EN PROPORTION (le corps de
  Florence à 18 m, celui de Berlin à 13) : la courbe du ciel, logarithmique,
  étire le bas plus que le haut, et la leçon de la façade de Saint-Pierre (une
  hauteur vraie sur un plan à l'échelle du sol fait un immeuble) vaut pour
  toutes.
- **UNE BAIE NE SE POSE QUE SUR UN CORPS QUI NE S'ÉTIRE PAS.** Un étage fait
  trois couches (v301) et une baie se dessine sur trois bandes (allège, bas,
  haut). Posée sur une couche que la table répète, chaque couche répétée
  redessine une fenêtre : le palais royal de Madrid, en capture, était une tour
  de bureaux à dix-huit rangs de baies. Les palais s'écrivent donc à leur
  hauteur du monde, un pour un (`[[0, 0], [1, 1], [sommet + 1, vraie + 1]]`),
  et leurs façades par `facadeEtages`.
- **UN FÛT QUI BORNE LA COURBE D'UNE VILLE PEUT RECEVOIR SON CORPS, ET LA
  COURBE SE DÉCOMPRIME.** Istanbul était à `k` 0,48 parce que la tour de Galata,
  colonne d'un bloc, ne montait pas. Avec son cylindre de pierre, elle prend la
  table, et la ville revient à `k` 1 : Sainte-Sophie et ses minarets, la
  Mosquée bleue et les siens montent sous elle. `k` est un résultat : il se
  refait quand le repère qui le fixait change.
- **DANS UNE VILLE BÂTIE À LA MAIN, LE CIEL SE LIT SUR SES MODÈLES D'AUTEUR.**
  À Londres, le London Eye (135 m) est à quarante-trois blocs et Tower Bridge
  (65 m) à trente-huit ; Big Ben, sorti du catalogue à soixante-neuf, dominait
  tout, et St Paul (111 m) restait à dix-sept. La courbe de la ville (`k` 0,75,
  sous la Tour Blanche) ne peut pas les départager : une table de paliers ne
  sait que monter. Big Ben a donc un bâtisseur de Londres à trente-neuf, St Paul
  sa coupole sur tambour à quarante et un, tous deux à leur hauteur d'auteur
  (champ `tour`, pas de table), DANS l'emprise d'avant (aucune rue touchée) ; et
  Tower Bridge et le London Eye entrent dans les `FIXES` du témoin d'ordre.
- **UN QUARTIER TROP SERRÉ SE DÉCLARE, IL NE SE FORCE PAS.** À Pise, le Duomo
  est à trois blocs du centre de la tour penchée, dont le modèle fait onze blocs
  de large pour quinze mètres : aucun bâtisseur ne tient dans la boîte du Duomo
  sans recouvrir la tour. Il a son édifice, le recouvrement d'avant reste, et
  c'est une dette de PLAN (`TASKS.md`).

Et UNE ENTRÉE DE VILLE S'ARRÊTE DEVANT UN MONUMENT, PAS SEULEMENT DEVANT UN
ÎLOT. L'avenue de Florence finissait dans la boîte du Duomo et ne passait que
par une brèche de l'ancien anneau de la coupole : donner son édifice à un
monument peut fermer une rue qu'il ne fermait que par chance. `avenueDEntree`
lit les blocs que le BÂTISSEUR pose à hauteur de carrosserie (couches 1 à 3),
jamais la boîte (v274) ; mesuré, seule Florence change sur trente-neuf entrées.

Et UN ÉDIFICE NEUF SE MESURE CONTRE LES PONTS DE SA VILLE, PAS SEULEMENT CONTRE
SES RUES. Les tabliers des anneaux (`anneauxDeVille(f).ponts`) traversent la
boîte des repères ; le gabarit, petit, les laissait libres, et le Berliner Dom
bâti sur toute sa boîte en murait deux (dix pas, vus au portail par
`carteMonde.js`). Avant de remplir une boîte, on dessine les tabliers qui la
traversent (une carte ASCII de la boîte suffit) et l'on bâtit à côté.

Et l'empreinte des 490 morceaux (v352) se relève : Londres est un des neuf
lieux. Bâtisseurs neufs désarmés (`tour` retiré), la branche rend 58a67b42…, la
constante d'`origin/main`, au bit près.

## Les tours ont une emprise (v357) — une perche se cherche au bâtisseur, dans toutes les villes

La dette de la v353 : treize tours d'un bloc de large, laissées sous leur vraie
hauteur parce qu'étirées c'étaient des perches. Cinq règles.

- **LE REMÈDE D'UNE FORME EST UN BÂTISSEUR, PAS UNE TABLE.** Une colonne d'un
  bloc reste une colonne quel que soit son étirement ; la table de paliers ne
  sait que monter. Chaque tour a son bâtisseur (`buildWillis`, `buildPerle`…,
  villesmonde.js) d'après sa vraie silhouette — on la cherche avant de bâtir :
  les tubes coupés aux 50e, 66e et 90e étages, les sphères à 68, 250 et 335 m —
  dans la BOÎTE de son repère, qui ne bouge pas : elle entre dans les zones du
  relief (`r = box + 30`), la changer toucherait `terrainHeight`.
- **LE MONDE D'AVANT GARDE SON BÂTISSEUR D'AVANT.** Le neuf est le champ
  `tour` du monument ; `LANDMARKS_V317` (donc `CONF_AVANT`, `CONF_V308`) garde
  `build`, et seul le monde d'aujourd'hui lit `lm.tour || lm.build` (world.js),
  étiré par la table s'il en a une, tel quel sinon (la CN Tower, au-dessus de
  son ciel). Remplacer `build` aurait changé les monuments du monde figé.
- **UNE SPHÈRE, UN BELVÉDÈRE SONT RIGIDES : DEUX PALIERS AU MÊME MÈTRE.**
  `paliersDuMonde` garde une pente d'au moins un ; deux paliers au même mètre
  font donc passer les couches entre eux à un bloc par couche, et la boule
  reste une boule. Une calotte aussi (Saint-Pierre).
- **UNE PERCHE SE CHERCHE PARTOUT, ET LE TÉMOIN EN A TROUVÉ DIX DE PLUS.**
  « Plus de la moitié des couches sur une ou deux colonnes, au-dessus d'une
  fois et demie la corniche » (`plafond.js`) a rendu vingt-trois perches sur
  `origin/main`, pas treize : la Fernsehturm, la CN Tower, trois clochers sans
  leur cathédrale, la demi-tour Eiffel sans ses pieds — et les pagodes, qui
  n'avaient qu'un poteau sous chaque toit, invisibles à toute mesure de
  hauteur. Le verre dans les murs encore : la portée du remède se mesure au
  témoin, pas à la liste de la dette. Les fûts vrais se déclarent
  (`PERCHES_VRAIES`, une colonne, un obélisque).
- **UNE HAUTEUR VRAIE SUR UN PLAN À L'ÉCHELLE DU SOL FAIT UN IMMEUBLE.** La
  façade de Saint-Pierre à ses 45 m, sur une basilique de seize blocs de long,
  faisait un bloc de bureaux coiffé d'une coupole (vu en capture). Elle est
  écrite à 16 m, et le commentaire le dit : la règle des deux échelles
  (hauteurs à l'étage, emprises au sol) vaut pour un monument comme pour une
  tour de Manhattan.

Et une roue ne s'étire pas (elle deviendrait une ellipse) : la roue du Prater
a reçu un bâtisseur à son vrai rayon, le plus grand que tient sa boîte ;
celle de la High Roller ne tiendrait pas, et c'est déclaré.

Et une empreinte d'identité qui change se PROUVE : celle des 490 morceaux
(v352) couvre Marrakech et Tokyo ; la branche, bâtisseurs neufs désarmés, rend
l'ancienne au bit près — c'est ce qui a permis de la remplacer.

## On monte dans une rame par sa porte (v489) — la discipline de l'avion, une porte qui coulisse

Trois règles.

- **L'ACCÈS SE DÉCLARE AVEC LE MODÈLE, ET UNE PORTE QUI COULISSE EST UNE
  TRANSLATION.** `construireRame` (vehicules.js) pose `userData.porte`
  (`type: 'coulissante'`, membre `porte`, `axe`, `course`, seuil, les deux
  flancs) ; la porte arrière des deux flancs est UN membre (un appel de dessin
  de plus par voiture, même matériau, aucune clé neuve), une baie sombre
  derrière. `coulisser` (embarquement.js) décale le membre, `ouvrant` (l'avion)
  le fait tourner : deux gestes, une fiche qui dit lequel.
- **LA SÉQUENCE NE JOUE QUE SI LA RAME EST À QUAI, ET ELLE SE TERMINE SI LA
  RAME REPART.** fun.js lit la pause qui reste au convoi (`etat()[ci].attente`
  ≥ `ATTENTE_RAME_MIN`, 2,5 s) et le maillage par le nom stable de la place
  (`voitureNommee`, `clé#rang`), une fois par appui, sans rien ajouter à
  `vehicules.js` hors du modèle. Pendant la séquence, une rame qui bouge de
  plus de `BOUGE_RAME` la termine (à bord, ou posé sur le quai) : la porte ne
  file jamais sous l'enfant. `bord` ne bascule qu'une fois entré (`fin`), et
  il est nul dès le premier appui en descendant.
- **LE QUAI EST PLUS HAUT QUE LE BALLAST.** Une gare pose son quai à 2,7 blocs
  de la rame (`QUAI_DEDANS`) : on essaie les deux flancs à trois écarts et
  l'on garde la place la plus HAUTE, la plus proche à hauteur égale, avec un
  sol plein sous les pieds (`placeQuai` : « vide » est un refus, comme « mur »
  et « eau »).

Et **un témoin qui attend qu'un métro marque l'arrêt devant l'enfant est un
tirage** : `sonde-porte-rame.cjs` pose sa propre ligne sur le couloir plat,
un arrêt tous les vingt blocs et douze secondes de pause (v233). Elle est lue
par `monte.js`, donc elle n'est pas isolée (`sondeIsolee`) : la retoucher
rejoue le portail entier.

**À bord, l'œil est dans la voiture (v507).** La caméra suivait
`eyePosition()` — un enfant debout, 1,62 au-dessus de l'assise — donc 2,72 au-
dessus de la voie pour une rame dont le toit est à 2,35 : la revue d'écran
voyait le toit, jamais le quai. Trois règles. **CE QUI PORTE UN VOYAGEUR DIT OÙ
SONT SES YEUX** : `oeil` dans les options du convoi (`OEIL_RAME`, le milieu du
bandeau vitré de `construireRame`), rendu par `place()`, appliqué dans
`updateBord` — l'habitacle d'une voiture (v230), du côté d'une rame ; sans
`oeil` (la monoplace, à ciel ouvert), rien ne change. **ET LE REGARD TOURNE
AVEC LA CAISSE** : un cap posé une fois à la montée dérive dans la première
courbe (0,86 → 0,22 d'alignement en six secondes à Washington, nez dans la
vitre) ; `updateBord` ajoute au regard ce que `capCaisse` a tourné, et ce que
l'enfant a tourné lui-même lui reste. Le premier témoin, sur une ligne droite,
ne pouvait pas le voir — c'est la capture qui l'a montré. Le métro et les trains
intervilles passent par `vehicules.metro` : un remède, les deux. **À BORD EST UN
ÉTAT DU CORPS** : `a-bord` (posé par `majBoutonsVehicule`, lu sur
`fun.bordDe()`) cache la marche comme `en-vehicule`, sans le frein à main.
**UN TÉMOIN DE BOUTON NE LIT PAS `offsetParent`** : il vaut `null` pour tout
élément `position: fixed`, et le premier témoin déclarait cachés des boutons
affichés. Il lit la boîte, montre l'interface tactile que le banc de bureau
masque, et vérifie d'abord qu'il voit Voler à pied.

## L'arrivée n'engendre plus le monde (v472) — sur le fil principal, on lit ce qui est là, on ne le fabrique pas

Trois règles.

- **`getBlock` FABRIQUE CE QU'IL NE TROUVE PAS, ET SUR LE FIL PRINCIPAL C'EST UNE
  IMAGE PERDUE.** Depuis le worker (v251), le fil principal reçoit les blocs des
  morceaux qu'il rend ; tout ce qui lit le sol AVANT — passants posés, `sweep`,
  sondes de programme, joueur, visée, HUD, poissons, réverbères — engendrait le
  morceau lui-même. `world.morceauxPrets(x0, z0, x1, z1)` répond sans fabriquer ;
  un personnage dont le monde (± 4 blocs) n'est pas là ATTEND dans `update`,
  avant `think` (ni chute, ni pas, ni sonde) ; `placeAt` diffère la pose
  (`aPoser`) ; `posteAutour` saute un point sur un morceau absent et rend `null`
  s'il n'y a rien, la naissance reste dans la file ; l'enfant attend son morceau
  (`joueurAttendLeMonde`, son seul morceau ±1, borné à 1,5 s, jamais sans
  worker ni dans un morceau maillé ici). La règle de la minicarte (v258), pour tout ce qui sonde.
- **ON N'ATTEND LE WORKER QU'À L'ARRIVÉE, ET LÀ OÙ L'ON ARRIVE.** Mon premier
  jet attendait partout : en vol et au volant, l'enfant franchit sans cesse le
  bord du monde rendu (au banc, `rr=2`) et se figeait par à-coups d'une seconde
  et demie — vingt-neuf rouges de `monte.js` rejouée seule. L'attente ne vaut
  que dans la fenêtre d'un saut (`estUnSaut`, 1,5 s, `world.arriveeEnCours`)
  et, pour un point, à portée du lieu d'arrivée (`arriveeLieu`) : des passants
  d'essai posés ailleurs fabriquent comme avant. Un témoin qui emmène l'enfant
  au couloir et ne mesure PAS une arrivée coupe l'attente
  (`world.attendreArrivee = false`, rendu à la fin). Mon premier remède l'y
  faisait ATTENDRE le monde, jusqu'à dix secondes : cela déplaçait l'heure de
  la rue des témoins suivants de la même page, et « la rue roule à l'allure
  d'une ville » — un tirage qui rougit aussi sur `origin/main`, 1 fois sur 3 —
  rougissait 2 fois sur 3. **UN TÉMOIN QUI ATTEND CHANGE L'HEURE DE CEUX QUI LE
  SUIVENT** : quand la circulation est une fonction de l'horloge (v305), une
  attente ajoutée est un changement de situation pour la suite entière. Il a
  fallu six variantes (chacune une retouche désarmée) et le code d'`origin/main`
  sous mon `monte.js` pour le voir.
- **UN PIÉTON QUI ATTEND SON MONDE N'EST PAS ENCORE DANS LA RUE.** Les voitures
  attendent SANS LIMITE devant un piéton (v395) ; des passants immobilisés sur
  la chaussée pendant la fenêtre d'une arrivée nouaient leurs files aux feux
  pour longtemps. Mesuré sur la page du témoin « la rue roule » : fenêtre
  désarmée 1 rouge sur 3 (comme `origin/main`), armée 2 sur 3, et la liste de la
  circulation filtrée (`brancherPietons`, main.js, sans `attendLeMonde`) 3 verts
  sur 3. Quand on immobilise un acteur, on se demande qui l'attend.
- **CE QUI S'EFFACE À L'AUTRE BOUT DU MONDE NE MARCHE PLUS.** La présence fond
  en 0,8 s les personnages laissés derrière un saut, et la boucle les animait
  encore : leur `sweep` refabriquait les morceaux qu'on venait d'oublier
  (douze à vingt et un). Au-delà de cent quarante blocs, on s'efface sur place.
- **UNE FILE QUI ATTEND NE SE BLOQUE PAS SUR SA TÊTE.** Mon premier jet faisait
  `break` sur une naissance impossible : celle de la ville QUITTÉE, dont les
  points sont ramenés dans son disque, attendait pour toujours un monde qui ne
  viendrait pas, et Berlin n'a eu aucun passant (le témoin l'a dit : 0). On
  passe aux suivantes, et une ville hors de portée ne fait plus naître personne.
- **UNE TABLE CALCULÉE AU PREMIER MORCEAU D'UNE VILLE SE MÉMORISE SUR UNE
  GRILLE, PAS UN DICTIONNAIRE.** `feuxDeVille` relisait `solParis` jusqu'à cinq
  fois par colonne (86 ms au premier morceau de Paris) ; un `Map` à clés
  flottantes coûtait autant qu'il évitait, une `Int32Array` sur la boîte des
  carrefours rend la même table (empreinte des feux identique, `Math.random`
  figé) pour un cinquième de moins.

Ce que le banc ne montre pas, et c'est dit : la pire image de l'arrivée ne bouge
pas (267-417 ms contre 300-350) — elle est `Convoi.montrer` (vehicules.js).

## L'arrivée d'une téléportation découpée (v420) — un appel GL synchrone se lit une fois, et une trace nomme ce qu'un profil appelle « (program) »

Trois règles.

- **UN APPEL GL QUI REND UNE CONSTANTE SE MÉMORISE, POUR TOUS SES LECTEURS.**
  `gl.getParameter` est un aller-retour synchrone avec le processus du GPU.
  `renduLogiciel()` le refaisait à chaque reconstruction de la file de
  maillage (`fileAuRegardVoulue`) : 120 à 336 ms dans la première seconde
  d'une arrivée à Paris. La v360 l'avait déjà vu et mémorisé pour UN lecteur
  (`logicielMemo`) — le verre dans les murs, une fois de plus. La réponse se
  garde DANS la fonction, et un témoin compte les demandes du nom du pilote
  (0x9246) en vol : zéro, huit sur l'ancien code.
- **UN GAIN QUI NE SE VOIT PAS EN DURÉE D'IMAGE SE DIT TEL QUEL.** Au banc la
  pire image de l'arrivée ne bouge pas (283 à 367 ms contre 283 à 383) :
  l'attente se cachait dans des images déjà lentes. Ce qui se transpose à la
  tablette, c'est un appel synchrone de moins par morceau franchi, pas des
  millisecondes du banc.
- **« (program) » DANS UN PROFIL N'EST PAS UNE CAUSE ; UNE TRACE LA NOMME.** Le
  profil de la première seconde donnait 350 à 440 ms de « (program) » ; la
  trace du fil principal (`Tracing`, `devtools.timeline`) a montré que l'image
  lente est une seule tâche `FireAnimationFrame` de 245 ms de JavaScript. Le
  temps INCLUSIF sous `frame` (`sonde-arrivee-decoupe.cjs`, `NIVEAUX=2,3,4`)
  a nommé les lignes : `Convoi.montrer` (vehicules.js) fabrique toutes les
  voitures en vue dans la même image (160 à 290 ms), `ensureChunk` sur le fil
  principal pour le `sweep` des personnages et `posteAutour` des passants
  (66 à 94 ms), `nbSansCroisement` (22 à 36 ms). Ces fichiers sont d'autres
  sessions : dettes nommées dans `TASKS.md`, avec les chiffres.

## Le témoin de chargement vole au-dessus d'une ville (v417) — un réglage que le banc coupe se force dans le témoin qui le juge

Une règle.

- **UN TÉMOIN QUI JUGE CE QUE L'IPAD VIT DEMANDE LE RÉGLAGE DE L'IPAD.**
  L'ordre en cône et la recharge à l'arrivée sont coupés en rendu logiciel
  (v346, v360) : un témoin de chargement qui ne les force pas mesure l'ancien
  ordre, que la tablette ne joue plus. Le jumeau urbain de « on ne rattrape
  pas le bout du monde » (`monte.js`) ouvre sa page avec
  `file=cone&recharge=arrivee` et lit `rechargeRegle.active` dans son message.
  Mesuré : avec ce réglage, Paris et Londres tiennent deux fois la barre
  (`max / 2`) à 95 et 120 b/s ; avec celui du banc, Paris tombe à 45 pour 60.
  Le témoin du désert reste : il garde la campagne, où un morceau coûte trois
  fois moins.

Et **le gel de téléportation se mesurait sur un banc qui n'avait rien bâti.**
`sonde-arrivee-journal.cjs` rejoue l'arrivée à Paris avec un journal fabriqué
de 80 000 blocs : sur l'ancien code, 90 % du disque jamais atteints en vingt
secondes et 3,3 s de fil principal à engendrer ; depuis la v403, comme sans
journal. Une sonde de performance qui joue sans les données de l'enfant ne
mesure pas l'enfant le plus touché.

## Le journal de l'enfant se range par morceau (v403) — un index vit DANS la structure qu'il indexe

`generateChunk` relisait tout le journal des blocs de l'enfant pour chaque
morceau : 36,6 ms par morceau avec 80 000 blocs, contre 1,25 sans (journal
fabriqué sous node, `journalFabrique`). Deux règles.

- **UN INDEX SE TIENT LÀ OÙ L'ON ÉCRIT, PAS À CÔTÉ.** Le journal s'écrit par
  au moins six chemins — `setBlock`, `loadEdits`, `installerEdits`, le worker
  qui fait `monde.edits.set` lui-même, Manhattan qui importe ses journaux, les
  effacements — et un index tenu à côté finirait par en manquer un : un bloc
  d'enfant disparaîtrait d'un morceau (invariant 1). `JournalBlocs`
  (world.js) est une `Map` dont `set`, `delete` et `clear` tiennent
  `parMorceau` : tout chemin qui passe par l'API de `Map` le tient sans le
  savoir. Le seul geste à surveiller est l'AFFECTATION (`this.edits = …`) :
  `installerEdits` enveloppe ce qu'on lui donne, et `grep -n "\.edits = "`
  doit ne rendre que lui et le constructeur. Une `Map` clonée vers le worker
  arrive nue (le clonage ne garde pas la classe) : c'est `installerEdits` qui
  la rhabille.
- **UNE OPTIMISATION DU JOURNAL SE PROUVE AVEC UN JOURNAL.** L'empreinte des
  490 morceaux (v352) est relevée sur un monde sans blocs d'enfant : elle ne
  pouvait pas voir ce changement. `empreinteJournal` (morceaux-temoin.mjs)
  engendre les 362 morceaux d'un journal de quarante mille par trois chemins
  (installé, posé un à un, retiré), relevée sur la v391 ; `lecturesDuJournal`
  compte les entrées parcourues par morceau — la cause, pas des
  millisecondes : 80 000 sur la v391, 0 ici.

## Le plafond au sol se relève sur la tablette (v391) — une mesure qu'on demande à Max se donne en ligne et en marche

`VITESSE_SOL_MAX` ne se relève pas au banc. Deux règles.

- **UNE MESURE QUI NE SE FAIT QUE SUR L'APPAREIL SE MONTRE DANS `?diag=1`, AVEC
  LA MÊME RÈGLE QUE LA SONDE.** `trouDevant` et `debitRecent` (plafond-sol.js,
  purs) sont le critère de la v346 — le monde maillé dans le champ, ±40° autour
  du DÉPLACEMENT — et `main.js` les affiche en roulant (`texteRoulage`). Deux
  copies du critère finiraient par mesurer deux choses.
- **ET ELLE SE RANGE DANS LE JOURNAL DE BORD** (`roulage` dans chaque relevé en
  roulant) : ce que Max mesure se relit dans `journal_appareil` sans qu'il
  recopie un chiffre. La marche (adresse, lieu, geste, ce qui décide) est
  écrite dans `TASKS.md`, pas dans une conversation.

## La chauffe de New York se mesure seule (v386) — un bridage n'est pas une charge de portail

Rouge chronique de `monte.js`, des deux côtés. Deux règles.

- **AVANT DE CORRIGER LE JEU, ON DEMANDE SI L'ENFANT EST TOUCHÉ.** Le trajet
  exact du témoin, rejoué seul : chauffe finie en 9 s, zéro programme neuf à
  Paris, New York, Lille, de jour comme de nuit, et bridé ×6 depuis l'accueil
  la chauffe finit en 16 s. Le jeu tient ; le témoin attendait soixante
  secondes un ÉTAT que la charge retarde — il attend 150 s et dit sa durée.
- **UN BRIDAGE DU PROCESSEUR NE REPRODUIT PAS UNE CHARGE DE PORTAIL.** Les
  trois programmes `physical` vus à Paris au portail ne reviennent ni bridé ×4
  ni ×6 : un banc chargé n'est pas une page lente (ordre des arrivées, fichiers
  servis plus tard). Quand on ne peut pas reproduire, le témoin NOMME ce qu'il
  voit (la case de la clé qui diffère, v319), pour que le prochain rouge se
  démonte au lieu de se rejouer.

## Le cône se mesure à chaud (v382) — l'ABBA n'écarte pas un premier passage à froid

Le témoin de l'ordre en cône était rouge des deux côtés (0,02 à 0,07 pour une
barre à 0,13). Deux règles.

- **UN ORDRE ALTERNÉ ÉQUILIBRE LA DÉRIVE, PAS LE PREMIER PASSAGE.** L'ABBA
  (v346) compense une page qui chauffe régulièrement ; il ne compense pas un
  premier passage qui paie seul la première arrivée dans une ville (convois,
  passants, programmes) — et il le met toujours sur le même bras. Sondé sur une
  page, trois paires : ordre neuf 0,42 · 0,87 · 0,87, ordre d'avant 0,65 · 0,63
  · 0,67. Un passage d'échauffement non compté, et l'on publie les quatre
  passages dans le message. Avant de croire un gain perdu, on regarde la
  DISTRIBUTION des passages, pas leur moyenne (v269).
- **UN ORDRE DE FILE NE DÉCIDE QUE QUAND LE DÉBIT MANQUE.** Scène vide : 0,84
  des deux côtés (93 morceaux par seconde, file vide). Recharge à l'arrivée
  armée : 0,72 contre 0,70 (90 par seconde). Le cône garde son gain là où la
  file attend l'image — la tablette qui arrive dans une ville — et ne coûte rien
  ailleurs ; on le garde, et le témoin le mesure dans le régime où il compte
  (recharge par image, celle du banc).

## L'arrivée après la carte (v379) — un gel de banc se démonte en scène vide

Les dettes de la v360. Cinq règles.

- **UN PLAFOND DE VILLE SE LIT À L'ENDROIT QUE LA SONDE TRAVERSE.** Londres
  « plafonnait à 70 » : la sonde (`sonde-londres.cjs`) a montré que le trou ne
  tombait qu'au milieu du trajet, c'est-à-dire au CENTRE de la ville — 64 % de
  faces de plus qu'au centre de Paris, une génération 70 % plus chère — et que
  le reste du couloir coûte autant qu'à Paris (5,3 contre 5,4 ms sous node).
  On compare donc des DISTRIBUTIONS (quatre tours alternés, v269), jamais un
  passage par ville : 143–161 contre 158–173.
- **UNE FONCTION DE COLONNE APPELÉE QUATRE FOIS SE GARDE, ET LA TABLE NE
  GROSSIT PAS.** `solLondres` servait quatre fois par colonne (la colonne, ses
  quatre voisines par `lotLondresLibre`, les arbres et réverbères) : une table
  à correspondance directe de 8 192 cases (génération 2,8 → 2,1 ms), prouvée
  par l'empreinte des 490 morceaux. Elle n'est juste que parce que la fonction
  ne lit que (x, z) — la ville d'avant se choisit dans `world.js`, qui appelle
  alors un autre module. Et ce qui sert à l'initialisation du module (les
  arrêts de la v339 appellent `solLondres`) ne peut pas lire une `const`
  déclarée plus bas : tables en `var`, tailles écrites en dur.
- **UN DÉBIT SE JUGE EN SCÈNE VIDE, ET UNE FENÊTRE SE FERME D'ELLE-MÊME.**
  Après un saut (`estUnSaut`, plus que la portée d'un coup), la file se
  recharge à l'arrivée jusqu'à ce qu'elle soit vide, dix secondes au plus
  (`FENETRE_ARRIVEE_MS`), hors rendu logiciel. Mesuré : en scène vide, les deux
  recharges chargent Paris en 4,1–4,4 s à 57 images par seconde ; en scène
  dessinée au banc, 90 % en 5,5–6,4 s contre 291–304 morceaux sur 625 en vingt
  secondes. Ce que la scène dessinée perd est le dessin, pas le chargement.
  Sur la tablette : `?recharge=arrivee&diag=1` contre `?recharge=image&diag=1`.
- **UN TÉMOIN DE GEL EN RENDU LOGICIEL MESURE SWIFTSHADER — on le repointe en
  scène vide, et l'on prouve qu'il rougit encore.** « L'écran ne se fige pas »
  (v235) était rouge des deux côtés : dans ses images lentes, 1 à 5 ms
  d'installation, zéro programme, 18 à 49 ms de JavaScript pour 1,3 à 1,5 s.
  Il rend désormais une scène vide pendant le vol (0 %, 100 ms au pire) ; le
  remède de la v235 désarmé dans une copie, il rend 9 à 11 % (barre 5). Le
  verdict garde ce qui vit sur le fil principal et se transpose ; le dessin de
  la ville se lit sur la tablette.
- **UN LOT DÉPASSÉ N'EST PAS NUISIBLE, ET C'EST MESURÉ.** À 80 b/s, 0 à 6
  morceaux sur 400 à 700 reçus arrivent derrière l'enfant, zéro refusé : moins
  de 1 % de travail perdu. On ne l'annule pas.

## La file se recharge à l'arrivée (v360) — un plafond de débit peut être la cadence du banc

Les deux pistes que la v352 avait déclarées sans mesure. Cinq règles.

- **ON SONDE OÙ PASSE LE TEMPS DES DEUX CÔTÉS DU MESSAGE.** Le fil principal
  ne voit que des tampons qui arrivent ; le worker publie désormais son temps
  à sec (`inactif`, entre la fin d'un lot et l'arrivée du suivant) et sa date
  d'envoi (`envoye`, en `timeOrigin + now` : deux fils n'ont pas la même
  origine). Mesuré à 80 b/s, rr 12 : installation 0,1 à 0,9 ms par morceau,
  transit 2 à 8 ms, worker À SEC 55 à 72 % du temps. La piste (a) était
  innocente, la (b) était la panne.
- **UNE BOUCLE QUI COMPTE DEUX FOIS FAUSSE TOUTES LES MESURES FAITES DESSUS.**
  `enAttente.set` PUIS `lot.push`, sous la garde `enAttente.size +
  lot.length` : chaque demande comptait double depuis la v251, et une file
  « de huit » en tenait de quatre (le worker en retard : relevé 0 à 5 dans
  Paris à 80 b/s) à huit (images rapides). La file de seize écartée par la
  v269 en tenait huit et plus. On ne « corrige » donc pas le compte en gardant huit — ce
  serait remettre en douce la profondeur mesurée nuisible sur l'iPad (v291) :
  la profondeur RÉELLE s'écrit (`EN_VOL_MAX`, la moitié de la file nominale)
  et c'est elle qui borne — quatre, jamais plus que l'ancienne au plus bas
  (le témoin relève 4 contre 6 à 8). Quand on trouve un défaut sous une mesure, on se
  demande ce que la mesure mesurait vraiment avant de toucher au chiffre.
- **UN TAUX PAR IMAGE, ENCORE.** La file ne se rechargeait qu'à l'image : à
  onze images par seconde, quatre morceaux en trente millisecondes, puis le
  worker attend soixante. C'est le piège de la v237 (un budget par image est
  un taux) une quatrième fois. Le morceau qui arrive libère sa place, et elle
  repart tout de suite (`rechargerLaFile`). Le débit double (Paris 53 → 116,
  Rome 58 → 120), et le « plafond à 55 morceaux par seconde » des v346 et
  v352 était la cadence du BANC, pas le monde : en scène vide, l'ancienne
  file donnait déjà 125.
- **UNE BAISSE DE CADENCE SE SÉPARE PAR UNE SCÈNE VIDE.** Avec la recharge,
  la ville tombe au banc de 14 à 5 images par seconde. Les appels de dessin
  (15 → 190–290) le disaient ; la preuve est la même page rendant une scène
  VIDE (`vide=1` de la sonde) : 51–57 images contre 53–57, même débit. Ni le
  worker ni l'installation ne prennent d'images : c'est SwiftShader qui
  dessine enfin la ville. La recharge ne vaut donc qu'EN ROULANT VITE
  (`fileRapide`) et se coupe en rendu logiciel, comme l'ordre en cône
  (`?recharge=arrivee|image`, `__game.rechargeMaillage`). Un témoin le garde
  en scène vide — vert des deux côtés à dessein (v220).
- **LE PLAFOND SE REPUBLIE SUR LA MESURE, ET LA PIRE VILLE LE BORNE.** 80 b/s
  tient à Paris, Rome, sur l'A1 et en campagne ; Londres rend 148–152 pour
  160 et 182–192 à 70. Pourquoi Londres n'est PAS mesuré : son worker coûte
  autant que celui de Paris (6,4 ms contre 6,3 à 7) et reste à sec 23 à 28 %
  — j'avais d'abord écrit « ses morceaux coûtent plus », sans l'avoir lu. `VITESSE_SOL_MAX` : ville 70, campagne 80. Ce qui se transpose à
  l'iPad : le nombre en vol, l'ordre, le débit quand les images sont lentes
  (c'est en arrivant dans une ville qu'elles le sont). Ce qui ne se transpose
  pas : la cadence de rendu — à relire avec `?diag=1` à 70–80 b/s dans Paris
  avant que la conduite ne monte les voitures.

## Le coût d'un morceau (v352) — on profile avant de croire la répartition, et la preuve est une empreinte

Le point (3) de la dette de la v346 : au-delà de 70 b/s la ville ne suit plus,
et le levier restant était le coût d'un morceau dans le worker. Cinq règles.

- **LA RÉPARTITION « GÉNÉRATION 45 % » DATAIT, ET LE PROFIL L'A DÉMENTIE.** Sous
  node, en roulant le long d'une bande (`morceaux-temoin.mjs`), le maillage
  pesait le double de la génération à Paris. Et un cinquième du coût d'un
  morceau de Paris était un `terrainHeight` dont la réponse était jetée :
  `routeEn` le lisait pour toute colonne de la case de 512 blocs d'une route
  avant de rendre null. On profile, on nomme la ligne (`--cpu-prof`, puis les
  appelants des appelants), et l'on corrige le poste le plus lourd, une ligne
  à la fois.
- **UNE OPTIMISATION DU GÉNÉRATEUR OU DU MAILLEUR SE PROUVE PAR UNE EMPREINTE
  RELEVÉE SUR L'ANCIEN CODE.** Le SHA-256 des blocs et de tous les tampons de
  490 morceaux (neuf lieux, Paris avec et sans HD), plus `routeEn` sur toutes
  les routes. Il est relevé sur la v351 (`empreinteMorceaux('<worktree>/src')`)
  et gardé par `plafond.js`. **Et l'empreinte se vérifie capable de rougir** :
  sur ses seuls 490 morceaux, une borne de `routeEn` cassée à dix blocs passait,
  parce qu'aucun talus de plus de dix blocs n'y tombait. Il en existe ailleurs,
  jusqu'à 12,86 blocs au-delà de l'emprise. Le balayage de toutes les routes l'a
  rendu visible. Un témoin d'identité qui ne contient pas le cas limite ne
  garde pas le cas limite.
- **UNE MÉMOÏSATION NE VAUT QUE SUR UNE FONCTION PURE DE CE QUI NE CHANGE PAS.**
  Le relief ne dépend que de `this.conf`, figée à la naissance du monde : la
  grille brute de `generateChunk` se garde avec le morceau (`terrainMemo`) et
  part avec lui (`oublierLoinDe`). Elle n'est tenue que pour `World` lui-même :
  une classe qui redéfinit `terrainHeight` (Manhattan) relit à chaque fois.
  `solParis`, `solLondres` et `cityAt`, eux, lisent l'état de l'enfant
  (colonnes cédées, ville d'avant) : on ne les mémoïse pas.
- **UN RACCOURCI DE CALCUL FLOTTANT GARDE LE CALCUL D'ORIGINE POUR LE
  GAGNANT.** `hypot` et la racine du carré peuvent différer d'un ulp. Le carré
  ne sert qu'à ÉCARTER les segments qui ne peuvent pas gagner, avec une marge
  d'un milliardième ; le segment retenu est mesuré par `hypot`, comme avant
  (zéro écart sur 4 millions de points). Et les tables par identifiant du
  mailleur sont remplies par les MÊMES fonctions (`isProp`, `isSlab`…).
- **CE QUE LE BANC DIT DU GAIN, ET CE QU'IL NE PEUT PAS DIRE.** Deux fois moins
  de calcul par morceau ne donnent au banc que 5 à 25 blocs de plus devant soi
  à 80 b/s : en ville, le débit y plafonne vers 55 morceaux par seconde DES
  DEUX CÔTÉS. La file se recharge une fois par image en rendu logiciel, et le
  worker y partage quatre cœurs avec SwiftShader. Le plafond au sol ne bouge
  donc pas (80 b/s : A1 158 pour 160, Paris 125). Ce qui se transpose à
  l'iPad, ce sont les APPELS (2 209 → 463 lectures de relief par morceau de
  Paris) et l'ordre de grandeur des millisecondes sous node. Ce qui ne se
  transpose pas, c'est le trou mesuré au banc : sur la tablette, il se relit
  avec `?diag=1`.
## Les villes bâties à la main dans leur ciel (v350) — un repère-fût borne la courbe d'en dessous aussi

Le lot 2 de la dette de la v335 : huit monuments. Trois règles.

- **UNE SALLE QU'ON VISITE NE S'ÉTIRE PAS SOUS LA TROISIÈME COUCHE.** Les
  monuments de Washington sont des musées à exposition, Buckingham a ses gardes
  et ses grilles aux couches 1 et 2 : la forme `corps` (qui étire dès la couche
  1) en ferait des gardes de quatre blocs. Leurs paliers s'écrivent en mètres,
  comme à Paris, avec un premier palier à 2, 3 ou 4 (`ECHELLES_MAIN`).
- **UN FÛT PLUS HAUT DANS LA VRAIE VILLE INTERDIT AUSSI DE MONTER CE QUI EST
  PLUS BAS.** Le château du Smithsonian (44 m) a ses tours d'un bloc à onze :
  les monter en ferait des aiguilles (v342), et les musées d'Histoire
  américaine (≈30 m) et de l'Indien d'Amérique (≈30 m, dôme 37) ne peuvent donc
  pas dépasser onze — or la corniche de Washington est à treize, et tout ce qui
  passe la corniche y monte au moins. Aucune courbe ne tient les deux : ils sont
  `vrai`, et c'est juste (la loi de 1910 plafonne la ville à une quarantaine de
  mètres, ces bâtiments n'y montent pas). Avant de chercher le `k` d'une ville,
  on écrit ses repères fixes de hauteur connue dans le témoin (`FIXES`) : c'est
  eux qui disent ce qui peut monter.
- **UNE COUCHE DE VOXEL SE COUVRE EN ENTIER, PAS À QUATRE DIXIÈMES PRÈS.** La
  corniche de `palais` fait 0,4 bloc ; la couche du voxel qu'elle habille en
  fait un. Aux cotes d'auteur, la dilatation d'un bloc la couvrait ; étirée
  trois fois, la fin de la couche sortait du modèle en cubes (l'attique de
  l'Opéra, l'entablement du Panthéon, le pied de la flèche de Notre-Dame). Le
  modèle prend l'épaisseur de la couche, et un témoin de `plafond.js` compte
  les cellules de flanc non couvertes au-dessus d'un enfant : zéro.
- **UNE HAUTEUR VRAIE SE CHERCHE, ELLE NE SE DEVINE PAS** : 160 pieds pour les
  Archives, 24 m pour Buckingham, une quarantaine de mètres pour l'Opéra de
  Lille, 23 m pour l'Arche. Ce qu'on n'a pas trouvé (le musée d'Histoire
  américaine, « cinq étages ») se dit approché dans le commentaire.

## La grille de Washington à la règle du kit (v370) — un îlot qui grandit se recompose autour d'une ruelle

La dernière des cinq villes bâties à la main. Trois règles.

- **QUAND LE PAS SUIT LE RAPPORT DES EMPRISES, LE LOT SE RECOMPOSE PAR LA
  PIÈCE QUI EXISTE DÉJÀ.** 12 × 7 / 3 = 28 : l'îlot passe de neuf à vingt et
  un blocs. Redessiner la maison pour un lot de vingt et un aurait cassé son
  escalier, ses portes et le témoin qui y entre ; quatre maisons de neuf
  autour d'une ruelle de trois (la `ruelle` du kit) gardent la maison au bloc
  près et donnent à Washington ce qu'ont ses vrais îlots. La trame vit dans
  une seule fonction (`trameDC`) que lisent le sol, le bâtisseur et l'axe des
  portes ; un témoin demande le coin d'une maison (`coinDeMaisonDC`), jamais
  un pas recopié.
- **UNE VILLE DONT LE BÂTISSEUR PREND LA COTE DU SOL SE BRANCHE À PART.**
  Washington n'est pas dans la boucle des villes de `world.js` : sa branche
  choisit `washington-v367.js` ou la ville neuve (`DC_NEUF`) au même critère
  (`conf.villesAvant`, `colonnesVilleAvant`), et sa ville est une BOÎTE — le
  cercle de `VILLES_FIGEES` va jusqu'au coin de Georgetown (268), pas au
  rayon du registre (187). Le témoin des villes figées de `plafond.js` passe
  la cote du sol au bâtisseur quand il la demande (`bat`).
- **LES CIRCUITS D'UNE GRILLE QUI BOUGE SE CHERCHENT, ILS NE SE RECOPIENT
  PAS.** Les dix-neuf circuits roulaient sur des rues de liaison posées au
  centre des rues de la grille d'avant ; aucune ne survit au pas de 28. Toutes
  les boucles de trois à six voies du graphe des croisements (dix mille), la
  tenue de rue, le virage, la contrainte de partage (v211) et la passe de
  réparation (v216) : quatorze circuits, et la couverture MONTE (50,8 →
  56,2 %). Une boucle de seize blocs est une impasse déguisée : on écarte ce
  qui fait moins de quarante blocs.

## Les rues de Lille à la règle du kit (v368) — un témoin de ville figée cherche une rue que rien ne recouvre

Deux règles.

- **QUAND LA TRAME EST SERRÉE, LA RÈGLE DU KIT REND DES IMMEUBLES.** Lille
  passe de 30,1 à 33,3 % de lots : le pas recomposé et le recul des avenues
  rendent plus que les collectrices ne prennent. C'est l'inverse de San
  Francisco (v361), et c'est la même règle : le résultat dépend de
  l'écartement des avenues, on le mesure avant de conclure.
- **UN TÉMOIN QUI POSE UNE MAISON SUR « UNE ANCIENNE RUE » VÉRIFIE QUE RIEN
  NE L'Y RECOUVRE DANS LA VILLE D'AVANT.** Les monuments se posent APRÈS les
  colonnes (v205) : la première rue trouvée à Lille longeait la Vieille
  Bourse, et le témoin comptait ses murs comme une ville neuve qui enferme la
  maison (9 blocs). La recherche lit désormais le monde d'avant
  (`new World({ v308: true })`) et exige six blocs d'air au-dessus de la
  rue — pour toutes les villes figées.

## Les rues de San Francisco à la règle du kit (v361) — un plan à vingt-sept blocs par kilomètre paie ses avenues

Trois règles.

- **LE PRIX D'UNE SECTION SE MESURE EN PART DU DISQUE, AVANT DE CHOISIR LES
  TYPES.** Toutes les voies nommées en collectrices, les avenues passaient de
  9 à 27 % du disque et la part bâtie de 49,0 à 31,9 % ; les quatre rues qui
  n'ont qu'une voie par sens dans la vraie ville (Columbus, Valencia, Stanyan,
  la 16e) en locales : 32,6. Le type se lit toujours à la fonction ; ce que la
  mesure décide, c'est qu'on le dise. Les quartiers se mesurent sur un rayon
  de vingt blocs, pas douze : une collectrice de 11,4 blocs d'emprise prend
  près de la moitié d'un disque de vingt-cinq, et le Richmond tombait à 7,9
  pour une avenue qui le traverse.
- **LA VILLE D'AVANT SE FIGE, ET SA BRANCHE DU GÉNÉRATEUR LA LIT AUSSI.** San
  Francisco n'est pas dans la boucle générique de `world.js` : sa branche à
  elle choisit `sanfrancisco-v343.js` sous `villeAvant`, sol, lot, bâtisseur
  ET feux (`sf-v359`). `VILLES_FIGEES` porte la date ; elle se relit à la
  fusion.
- **UNE LOI DE HAUTEUR TIRÉE PAR ÎLOT DEVIENT UN TIRAGE QUAND LES ÎLOTS
  GRANDISSENT.** Recomposés, les îlots du centre n'étaient plus qu'une
  vingtaine : la médiane passait de 13 à 23 blocs, et le Ferry Building et le
  Bay Bridge se retrouvaient sous leurs voisins (le témoin des monuments l'a
  dit, pas la capture). Le tirage se fait par PARCELLE (quatre par îlot,
  `ilotSF`), le tapis est garanti par construction (quatre parcelles sur cinq
  entre huit et quatorze étages) et les tours ne vont que là où est le vrai
  Financial District. Une loi de ville se remesure quand le plan change de
  grain.

## Les rues de Nice à la règle du kit (v359) — une règle partagée se corrige pour toutes les villes qui la lisent

Deux règles.

- **LA MÉTHODE DE LONDRES SE REPREND TELLE QUELLE, ET ELLE VIT DANS `voies.js`.**
  `reculDesAvenues(voies, artère, trame)` est la règle « une trame ne double pas
  ses avenues », partagée par Londres, Nice et les suivantes. La ville d'avant
  se fige (`nice-v340.js`) et `colonnesVilleAvant` (world.js) sert toutes les
  villes passées au kit, chacune avec sa date (`VILLES_FIGEES`). Le témoin de
  `plafond.js` est une fonction jouée ville par ville.
- **UN RECUL SE COMPTE D'EMPRISE À EMPRISE.** La v339 posait le recul à la
  demi-emprise de l'artère, plus `ILOT_MIN`, plus la demi-CHAUSSÉE de la rue de
  la trame (13,9) : le lot entre les deux trottoirs n'avait alors que trois
  blocs et demi. Le relevé ASCII du Sunset de San Francisco l'a montré (une
  rue de la trame à seize blocs d'une avenue). Un îlot se mesure de trottoir à
  trottoir : demi-emprise + `ILOT_MIN` + demi-emprise, 16,4. Corrigé dans la
  règle partagée, Londres remesurée avec (26,6 → 28,7 %).

## Le monde à la vitesse (v346) — on maille où l'on va, et le plafond se mesure en roulant

Max veut une conduite « comme GTA » ; les voitures étaient plafonnées à 28 b/s
sur un débit d'avant le worker (v237 → v251). Quatre règles.

- **UN PLAFOND QUI DÉRIVE D'UN DÉBIT SE REMESURE QUAND LE DÉBIT CHANGE DE
  FIL.** « Paris se maille à 42 morceaux par seconde » a survécu quatre-vingts
  versions au worker qui le rendait faux : en roulant, régime établi, 43 à 58
  en ville et 54 à 78 en campagne. Le plafond est désormais publié là où il
  se calcule (`src/plafond-sol.js`, `VITESSE_SOL_MAX`, `plafondSol`), avec sa
  mesure ; la conduite le lit, elle ne le recopie pas.
- **LE CRITÈRE EST CE QUE LA CAMÉRA VOIT, ET IL SE MESURE EN ROULANT.** Le
  monde maillé dans le champ (±40°) jusqu'à deux secondes de route, médiane
  de six relevés après quatre secondes de régime, le disque chargé d'abord à
  l'arrêt (`sonde-monde-a-la-vitesse.cjs`) — jamais par saturation (v269). La
  position y est une fonction du TEMPS RÉEL : on mesure le chargement, pas la
  voiture, et la vitesse ne dépend pas de la cadence du banc.
- **LA FILE SUIT LE DÉPLACEMENT, PAS LE REGARD, ET OUBLIE CE QUI EST
  DERRIÈRE.** L'ancienne file (distance pondérée 1/2,5 par le regard) passait
  un morceau de côté à sept avant celui de l'axe à douze, et redemandait ce
  qu'on venait de dépasser : à 60 b/s dans Paris, HUIT appels de dessin devant
  soi. `fileDeMaillage` pondère continûment par l'écart au déplacement réel
  (lissé, en temps réel) et, au-dessus de `VITESSE_CONE`, ne demande rien
  derrière hors du cercle proche ; la file se refait quand le régime change,
  sinon ce qu'elle a laissé ne revient qu'au morceau suivant. `?file=regard`
  rejoue l'ancien ordre, pour l'A/B.
- **LA CADENCE PERDUE EN ROULANT EST CELLE DU MONDE QU'ON VOIT ENFIN.** La
  nouvelle file coûte 15 à 25 % de cadence au banc ; les appels de dessin
  disent pourquoi (8 → 31 à Paris, 39 → 84 en campagne) : c'est le rendu de
  ce qui est devant, payé en logiciel, et l'arrêt au même endroit en coûte
  bien plus (394 appels, 7,6 images par seconde). Une baisse de cadence se
  démonte par ce qu'on dessine avant de s'imputer au chargement.
- **ET L'ORDRE NEUF SE COUPE EN RENDU LOGICIEL, comme les ombres, la couche
  HD et le bâti lointain.** Le portail l'a dit par « l'écran ne se fige pas en
  arrivant sur une ville » : en vol vers Paris la vue passe de ~20 à ~100
  appels, cadence 12 → 7, pire image 1,2 à 1,35 s — et la sonde qui sépare
  les cas (tâches longues par `PerformanceObserver`, rendu chronométré côté
  JavaScript) a montré que le JavaScript ne bouge presque pas (2,3 s contre
  1,9 à 2,0 de tâches longues sur 18 s, 10 ms de rendu JS des deux côtés) :
  c'est SwiftShader qui dessine enfin la ville. `?file=cone` force l'ordre
  neuf, `?file=regard` l'ancien, `__game.fileMaillage` les bascule sur une
  page ouverte. Le témoin de `monte.js` joue les DEUX ordres dans la MÊME page
  (`ciel`), en ABBA, et juge l'écart des parts moyennes (0,29 ici, −0,04 sur
  `origin/main`, barre 0,13). Trois leçons de banc, payées en trois portails :
  une part absolue ne tient pas sous la charge (0,73 pour 0,77) ; une page
  ouverte de plus à côté de `tab` et `ciel` n'a jamais chargé son disque en
  quarante secondes ; et deux passages IDENTIQUES rendent 0,43 puis 0,57 —
  le premier passage n'est pas le second, d'où l'ABBA.
## Le ciel des autres villes engendrées (v353) — toute ville mesurée a son ciel, ou dit pourquoi

Max : « lance sur toutes les villes, pas juste celle-là ». Le lot 3 de la v342
ne couvrait que les vingt-cinq villes qui portaient une dette ; mesuré sous
node, vingt et une autres avaient des repères au-dessus de leurs toits mais
pas à leur hauteur (l'hôtel de ville de Bruxelles à vingt-trois blocs pour
quatre-vingt-seize mètres). Trois règles.

- **UNE RÈGLE DE VILLE S'ÉCRIT POUR TOUTES LES VILLES, ET UN TÉMOIN LE GARDE.**
  `VILLES_SANS_CIEL` (echelle-monuments.js) est la `BAS_DECLARES` des villes :
  toute ville engendrée dont un repère est mesuré parmi ses immeubles est dans
  `CIELS`, ou déclarée sans ciel avec sa raison — `vrai` (rien à y remettre à
  l'échelle) ou `lot` (une dette, qui doit disparaître). Une déclaration qui
  ne sert plus rougit. C'est le verre dans les murs vu du côté d'une table :
  sans ce témoin, la v342 « couvrait les villes » et en laissait la moitié.
- **CE QUI EST DÉJÀ AU-DESSUS DE SON CIEL NE BOUGE PAS, ET GARDE L'ORDRE.** Les
  modèles du catalogue (Sagrada Família, Space Needle, Christ Rédempteur,
  Opéra de Sydney) et le Burj Khalifa sont à leur hauteur d'auteur, au-dessus
  de la courbe : on ne les redescend pas (la règle de la tour de Pise), et ceux
  qui dominent un monument remis à l'échelle entrent dans les `FIXES` du
  témoin d'ordre. Une pyramide (le Luxor) et une roue (la High Roller) ne
  s'étirent pas : étirée, une pyramide devient un obélisque.
- **UN FÛT QUI DOMINE DÉJÀ SES TOITS NE S'ÉTIRE PLUS — vu en capture, pas au
  témoin.** `minaret` et `tourBoule` sont des colonnes d'un bloc. Le premier
  jet les étirait jusqu'au plafond des fûts (une fois et demie, v342) : la tour
  de l'hôtel de ville de Bruxelles à trente-quatre blocs, la Willis Tower à
  cinquante-cinq, des perches noires au-dessus de la ville. Les fûts de la v342
  (Santa Justa, Storkyrkan, la Rundetaarn) étaient tous SOUS leurs toits ; ceux
  d'ici les dominaient déjà de près du double. Un fût ne s'étire donc que si sa
  hauteur d'auteur reste sous une fois et demie la corniche de sa ville (le
  témoin le garde) ; sinon il reste où il est (un `FIXE` du témoin d'ordre),
  et c'est le bâtisseur qu'il faut refaire, pas la hauteur (`TASKS.md`). Les
  pagodes (Sensō-ji, Tō-ji, Kiyomizu-dera) s'écrivent en paliers de mètres,
  comme Wat Arun : chaque étage s'étire, chaque toit reste un rang. Deux fûts qui se dépassent
  dans le mauvais ordre compriment leur courbe (Munich, `k` 0,55 : la
  Frauenkirche reste au-dessus du beffroi). Gizeh et le Machu Picchu n'ont pas
  d'immeubles : pas de corniche, pas de ciel à mesurer.

## Le ciel de chaque ville (v342) — la courbe de Paris posée sur SA corniche

Le lot 3 de la dette de la v335 : quarante-sept monuments des villes
engendrées. Quatre règles.

- **UNE COURBE SE TRANSPORTE EN UNITÉS DE CORNICHE, PAS EN BLOCS.** Garder le
  `K` de Paris (17,5) sur une corniche de treize blocs donne au-dessus des toits
  une pente de plus d'un bloc par mètre : le palais d'Hiver (22 m) à vingt-quatre
  blocs, le contraire d'une échelle. `blocsDuCiel(m, c)` met `K` à
  `K_CIEL × c / 20` : un monument N fois plus haut que les toits l'est dans le
  ciel de sa ville comme dans celui de Paris. La corniche (`CIELS`) est une
  MESURE — la plus haute médiane des immeubles autour des repères de la ville.
- **UN BÂTISSEUR PARTAGÉ SE LIT EN CORPS ET COURONNE.** `corps: [a1, sommet]`
  (`paliersDuCorps`) : le corps de section constante (tambour, fût, murs) prend
  l'étirement, la couronne (calotte, flèche, toit) seulement sa racine. Une forme
  qui ne se lit pas ainsi (une enceinte à tours, une pagode) écrit ses paliers
  en mètres, comme Paris.
- **LE CIEL GARDE SON ORDRE, ET LA COURBE PASSE SOUS LE PLUS HAUT REPÈRE.** Un
  repère plus haut dans la vraie ville qu'un monument remis à l'échelle reste
  au-dessus de lui, monuments étirés ET repères fixes (le témoin les compare
  paire par paire, hauteurs vraies écrites dans le témoin). Mon premier jet
  MONTAIT les repères gênants : la tour de Galata, la Westerkerk sont des fûts
  d'un bloc de large, et étirés ce sont des aiguilles — le piège même de la
  v335, vu en capture. On comprime donc la courbe de la ville (`[c, k]`, `k` un
  RÉSULTAT au centième) ; seul un repère qui a du corps (coupole, prang) monte
  avec elle (`ordre`). Et un fût du lot (`fut`) ne dépasse pas une fois et demie
  sa hauteur d'auteur.
- **LE BAS D'UNE CALOTTE N'EST PAS UN TAMBOUR.** Les premières couches d'une
  coupole partagée ont le rayon du tambour mais la couleur de la calotte : les
  étirer avec le corps faisait un obus d'ardoise (Rome, Florence, Berlin en
  capture). Le corps d'une coupole s'arrête au tambour : on lit les couleurs
  d'un bâtisseur avant d'écrire ses paliers, pas seulement ses rayons.
- **CE QUI EST BAS DANS LA VRAIE VILLE SORT DE LA DETTE EN `vrai`, PAS EN
  AIGUILLE.** La colonne de Marie (11 m), le Pavillon d'or, Topkapi, le Templo
  Mayor, Wat Pho : étirés, ils seraient devenus des poteaux. Une dette se rembourse
  aussi en disant vrai.
- **UNE RÉSOLUTION DE CONFLIT SE CHARGE AVANT DE SE POUSSER.** Au rebase sur
  la v340, les deux côtés ajoutaient une entrée en tête de `nouveautes.js` ;
  git a coupé le conflit AU MILIEU d'un objet, ma résolution par expression a
  recollé les deux moitiés sans `],\n  },`, et le module ne se chargeait plus —
  journal vide dans le jeu, trois rouges de `maj.js`. Après tout conflit dans un
  fichier de données JS, `node -e "import('./src/…')"` ; après un conflit de
  journal, `git diff origin/main` doit ne montrer que des lignes ajoutées.

## Les garde-corps des baies étroites (v454) — un motif qui a un pas se pose en nombre entier de pas

Une règle. Une tuile à motif périodique (la ferronnerie : un barreau tous les
seize pixels) tirée en coordonnées de bloc se coupe n'importe où sur une face
plus étroite que le bloc : 1 212 garde-corps de baie sur 1 212, mesuré.
`uvFerronnerie` (facadeshd.js) donne à une face étroite un nombre entier de
travées, du barreau au barreau, et laisse le bloc entier en coordonnées de
bloc — c'est lui qui se raccorde d'une fenêtre à l'autre. Toute tuile
périodique posée sur une face de largeur variable se demande la même chose.
`ferronnerieEntiere: false` rejoue l'ancienne règle, le temps d'un morceau,
pour l'empreinte des 490 morceaux.

## La trame générique quitte Londres (v447) — une boucle qui liste ses exclusions se relit à chaque ville bâtie à la main

La dette vue en v415 : la boucle « one lot per grid cell » posait cinquante-deux
maisons pastel sur l'anneau extérieur de Londres (2 600 colonnes, 77 à 106
blocs du centre). Trois règles.

- **UNE VILLE BÂTIE À LA MAIN SE DÉCLARE À TOUTES LES BOUCLES QUI BÂTISSENT.**
  Londres se bâtit colonne par colonne depuis la v178 ; la liste d'exclusion de
  la trame générique ne l'a jamais connue, et la place que réserve « le mobilier
  de Londres » (boîte de 70) cachait le défaut au centre. Le jour où l'on ajoute
  une ville bâtie à la main, on cherche `includes(city.key)` dans `world.js`.
- **CE QU'ON RETIRE D'UN DÉCOR SE RETIRE PAR LOT, PAS PAR COLONNE.** Un lot que
  touche un bloc d'enfant posé avant `DATE_TRAME_LONDRES` (le marquage couvre
  les huit voisines, `colonnesTrameLondres`, tenu comme `colonnesVilleAvant`)
  reste ENTIER, baie comprise (`lotTrameLondresGarde`) : une demi-maison serait
  un décor éventré. Drapeau `sansTrameLondres` de `CONF_NEUF` seule ; `CONF_V308`
  le porte à faux, `CONF_AVANT` ne le porte pas. La date se relit à la fusion.
- **UN DÉCOR QUI RECOUVRE UNE RUE SE MESURE AUSSI EN VOITURES.** Les circuits de
  Londres ne lisent que le sol de la ville (`solLondres`, `coteRoulable`) : ils
  n'ont pas bougé, et 36 pas de carrosserie dans un mur de maison pastel ont
  disparu. Un circuit validé par le sol ne dit rien de ce qu'une autre boucle
  bâtit par-dessus.

Et **le Shard (v449)** : la règle du verre dans les murs (v195, v202) ne
regardait que les `batirColonne*` des villes ; un MONUMENT bâti en verre a le
même défaut. Le témoin de `carteMonde.js` appelle son bâtisseur et compte le
verre — tout monument de tour vitrée se vérifie de la même façon.

## Un toit ne déborde plus d'un quartier sur l'autre (v446) — un indice de trame n'est unique que dans sa trame

Une règle. `infoFacadeParis` publie l'îlot et la travée (`ai`, `bi`) dans la
trame de CHAQUE quartier : deux quartiers voisins se prêtent les mêmes indices.
Une clé qui identifie un immeuble porte donc le quartier
(`immeubleDeToit`, facadeshd.js) ; mesuré, c'étaient les seules paires où une
même clé portait deux façades différentes (7 sur 176 616). Toute table future
indexée par `(ai, bi)` — tirage, teinte, hauteur — se demande si elle traverse
une limite de quartier. `buildChunkTampons(…, { toitsQuartier: false })` rejoue
la clé d'avant, le temps d'un seul morceau, pour l'empreinte des 490 morceaux.

## Les colonnes Morris se plantent dans le vide (v443) — un meuble se pose en regardant ses voisins, par la même règle

Une règle. Un meuble qui se pose au tirage ne connaît pas ses voisins : la
colonne Morris (v289) tombait contre une porte cochère ou à un bloc d'un banc
(43 sur 76, mesuré). `morrisDegagee` (facadeshd.js) exige l'air libre sur
quatre côtés et rejoue `mobilierTrottoir` sur les colonnes à deux blocs (avec
`morrisAvant`, pour ne pas boucler) ; dans un voisinage, la plus petite valeur
de tirage garde sa colonne. Un dégagement qui écarte plus de la moitié des
candidats se compense par le tirage (0,012 → 0,024), sinon la ville perd la
moitié de ses colonnes en silence. `morrisDegagees: false` rejoue l'ancienne
règle pour l'empreinte des 490 morceaux.

## La voiture s'arrête devant une terrasse (v436) — une famille d'obstacle lit la même règle pour tous ceux qui butent

Une règle. `mobilierDevant` (main.js) ne lisait que les blocs de mobilier
(`isProp`) ; la table, les chaises, le banc et la colonne de la couche HD ne
sont pas des blocs. Il demande désormais `world.mobilierVu` — la règle de la
v425, celle que les passants lisent, seulement le mobilier MONTRÉ (une
tablette sans couche HD n'a pas de table invisible) —, une fois par colonne
couverte. Pas de seconde copie de la règle : deux lecteurs, une fonction.
« Pas si l'on est déjà dedans » reste jugé dans la famille « mobilier »
(v252). Le témoin roule sur un trottoir jusqu'à l'arrêt, durée en
progrès (cinq secondes sans avancer), jamais une immobilité d'une seconde :
une page HD du banc rend une image par seconde.

## Les terrasses de café reviennent (v433) — une règle qui lit un bloc se relit quand le bloc se découpe

Une règle.

- **QUAND UN BLOC SE DÉCOUPE EN BANDES, ON CHERCHE CE QUI LISAIT LE BLOC
  ENTIER.** La v301 a fait d'un rez-de-chaussée trois blocs (soubassement,
  vitrage, enseigne) ; la règle des terrasses (v288) cherchait encore
  `ARCHI.VITRINE` à un bloc au-dessus du trottoir — c'est-à-dire le VITRAGE
  (`VITRINE_MI`) désormais. Zéro terrasse dans six quartiers pendant cent
  quarante versions, et aucun témoin ne le voyait : celui des potelets
  comptait la fonte, pas le cannage. Mesuré par la sonde qui compte ce qui
  borde le trottoir à y+1 quartier par quartier. `grep -n "ARCHI.<ancien>"`
  le jour où l'on découpe un bloc, comme le verre dans les murs. L'ancien bloc
  reste lu (un enfant a pu le poser). La règle d'avant se rejoue
  (`buildChunkTampons(…, { devantures: false })`) : c'est elle que lit
  l'empreinte des 490 morceaux, au bit près.

## Le mobilier de trottoir arrête les passants (v425) — on bute sur ce qu'on voit

Deux règles.

- **LA RÈGLE QUI POSE UN OBJET EST LA RÈGLE QUI LE REND SOLIDE.** Le mailleur
  décidait seul où poser une terrasse, un banc, une colonne Morris (v288,
  v289). `mobilierTrottoir` (facadeshd.js, pure) rend le genre et l'orientation
  pour une colonne de trottoir ; le mailleur dessine, `world.obstaclePieton`
  (main.js) bute sur ce qui a un corps (`MOBILIER_OBSTACLE` : terrasse, banc,
  colonne). Prouvé par l'empreinte des 490 morceaux, identique : sortir la
  règle n'a pas changé un sommet.
- **ON NE BUTE QUE SUR CE QUI EST MONTRÉ.** Le mobilier n'existe que dans les
  façades détaillées d'un morceau à portée de `RAYON_HD`, et pas au palier bas.
  `mobilierVu` exige le détail VISIBLE du morceau (`montrerLeDetail`) ; sinon une
  tablette sans couche HD aurait des tables invisibles qui arrêtent — un mur
  invisible, la panne même que la v292 a interdite. Et l'enfant à pied lit le
  même crochet (v278) : il contourne la terrasse comme les passants.

## Les passages en biais (v421) — une bande qui suit une direction arbitraire est de la géométrie

Trois règles.

- **UNE TUILE NE SE TOURNE PAS, ET LA RÈGLE DU RAIL (v281) VAUT POUR LA
  PEINTURE.** Les villes à trame alignée (`t.net`) peignent leurs passages dans
  un bloc ; les 197 autres n'en avaient aucun. `passages.js` (pur) reprend la
  règle de `solVillesMonde` (la bande de `wX + 0,4` à `wX + 2,1` du croisement,
  dans toute la chaussée) dans le repère de la trame ; `bandesDeColonne`
  découpe chaque bande par le carré de la colonne (Sutherland–Hodgman), et
  `emettreBandesPassages` (solcontinu.js) les pose dans le tampon `solid`, un
  centième au-dessus de l'asphalte, avec la tuile blanche du marquage : aucun
  matériau, aucun programme, aucun appel de dessin, et le palier bas les voit.
- **UNE SEULE RÈGLE, DEUX LECTEURS, ET LE PASSANT TRAVERSE DANS L'AXE DE SA
  RUE.** `passagePieton` (main.js) demande `passageEn` comme il lit un bloc
  peint ; un chemin nord-sud sur une rue à 30° sortait de la bande de 1,7 bloc,
  le passage en biais ajoute donc la direction en travers de SA rue.
- **UN CONTENU NEUF SE RETIRE DE L'EMPREINTE PAR UNE OPTION, PAS EN LA
  RE-RELEVANT.** L'empreinte des 490 morceaux (v352) couvre Rome et Tokyo :
  `buildChunkTampons(…, { passagesBiais: false })` la garde au bit près
  (l'ancien code ignore l'option), et un témoin de `plafond.js` compare les
  deux maillages. Ce qui reste, déclaré : Londres et les autres villes bâties
  à la main, dont les avenues ne sont pas une trame.

## Un pas de côté ne traverse pas la rue (v411) — une projection droite n'est pas une trajectoire

Trois règles.

- **LE CÔTÉ D'UN ÉCART SE JUGE SUR LE SOL, PAS SEULEMENT SUR L'AXE.** Le pas de
  côté de la v259 partait du côté où l'on est par rapport à l'AXE de la voiture.
  Une voiture qui tourne a un axe en biais : pour un passant au coin, ce côté
  menait à la rue perpendiculaire, et deux secondes d'écart (6,4 blocs)
  suffisaient à la traverser. `coteDEcart` (pietons.js, pur) : depuis le
  trottoir, devant une voiture SUR la chaussée, le côté naturel s'il reste en
  haut, sinon tourné de 45°, sinon l'autre côté s'il a le temps d'y sortir du
  couloir, sinon on RESTE au bord. Le demi-tour contre un mur ne se fait plus
  vers la chaussée (`retournementPermis`), et chaque pas se juge
  (`pasDEcartPermis`) : la voiture tourne, son couloir suit le passant.
- **CE QUI REND LA RÈGLE SÛRE, C'EST OÙ ROULE LA VOITURE.** Une voiture sur la
  chaussée n'est sur la route d'un passant du trottoir que par la projection
  droite de son couloir, ou parce qu'elle frôle la bordure — et elle freine
  devant un piéton (v395). Une voiture sur le trottoir (l'enfant au volant) l'y
  rejoint vraiment : là, rien ne change. Le couloir publie donc la position de
  la voiture (`rx`, `rz`) et sa demi-largeur (`demi`).
- **UNE SONDE DE GÉOMÉTRIE SE FAIT SOUS NODE, ET LE TÉMOIN SE LIT DANS LE
  TÉMOIN.** `sonde-ecart-trottoir.cjs` rejoue l'écart sur les vrais trottoirs
  de quatre villes, voitures synthétiques droites et en virage : 92 descentes
  sur 125 avant, 0 après, en quatre secondes. Ma première règle (« l'autre
  côté seulement ») ne changeait RIEN : le vrai cas est un coin, où l'autre
  côté croise l'axe de la voiture. Et la sonde de page lit la fonction du
  témoin dans `monte.js` au lieu de la recopier (v400).

## On traverse aux passages peints (v402) — la peinture se lit sur la ligne, et l'approche est en temps réel

Trois règles.

- **UNE RÈGLE DE PARIS SE CHERCHE DANS LES AUTRES VILLES, ET LA PEINTURE SE
  MESURE AVANT.** `passagePieton` (main.js) ne lisait le passage sans feu qu'à
  Paris. Sous node : 65 villes engendrées sur 267 (trame alignée, `t.net`)
  peignent un passage à chaque carrefour ; Rome, Zurich, Londres n'en peignent
  aucun (une bande peinte dans une tuile ne se tourne pas). Hors feu et hors
  Paris, un bloc peint à quatre blocs devant ouvre la recherche, et le chemin
  doit être peint EN ENTIER : la bande fait 1,7 bloc et les départs se
  cherchent par pas d'un bloc, une ligne pleine existe toujours.
- **CE QUI PRÉCÈDE UNE TRAVERSÉE EN TEMPS RÉEL EST EN TEMPS RÉEL.** L'approche
  du départ était bornée à quatre secondes de montre et marchait au pas du jeu :
  à cinq images par seconde le passant traversait d'où il était, au bord de la
  bande. C'est le piège de `dt` (v226, v351) à l'étape d'avant.
- **UN TÉMOIN DE TRAVERSÉE SÉPARE LES DÉCISIONS DES POUSSÉES, ET LIT LA LIGNE.**
  Le témoin du feu (v371) publie ses traversées hors rouge : la seule « au vert »
  était un passant poussé de l'autre côté par un écart (`traversee` nul,
  `ecart` vrai) — compté à part, dette déclarée. Et la peinture d'une traversée
  se lit sur la droite sortie → arrivée tous les demi-blocs : sous le passant à
  chaque relevé, à cinq images par seconde, c'était un tirage (5 sur 7).

## Les passants quittent la chaussée (v385) — un remède qui ne dépend pas de la porte

Deux règles.

- **QUAND UN ÉTAT NE SE REPRODUIT PAS SUR UNE PAGE NEUVE, ON SOIGNE L'ÉTAT, PAS
  LA PORTE.** Le témoin de la v380 nommait des flâneurs en pause, à leur poste,
  sur l'asphalte de Rome. Mesuré : `posteAutour` ne rend la chaussée sur aucune
  des 1 600 poses sous node, et une page neuve n'en montre aucune en soixante
  secondes. Plutôt qu'une quatrième hypothèse sur l'entrée (v223), la règle vit
  dans le programme du flâneur (`sortirDeLaChaussee`, vie.js) : un piéton qui
  se trouve sur la chaussée sans la traverser marche au bord le plus proche
  (trottoir d'abord, jamais un toit), en TEMPS RÉEL (la rue est le domaine des
  voitures, v351), et y prend son poste. La sonde a sa cadence (une demi-seconde
  réelle). Et la chaussée n'est plus le second choix de `posteAutour` : la
  bordure, l'esplanade et l'herbe au niveau de la rue passent avant.
- **UN TÉMOIN QUI COMPTE CE QUE LE HASARD A LAISSÉ SE DOUBLE D'UN TÉMOIN QUI
  PROVOQUE.** « Un flâneur posé au milieu de la chaussée en sort » pose trois
  flâneurs ET leur poste sur l'asphalte et lit leur arrivée : 3/3 au bord en 3 à
  4,5 s, contre 3/3 encore sur la chaussée après 17 s sur `origin/main`
  (`sonde-sortie-chaussee.cjs`). Le témoin-tirage d'avant reste, pour le message.

## Deux témoins de la rue qui disent ce qu'ils voient (v380) — un couloir « vide » se vérifie au sec

Deux règles.

- **UN SITE DE TÉMOIN NOMMÉ « VIDE » SE VÉRIFIE AVANT D'ÊTRE REPRIS.** Le
  couloir de la v237, (30 000, 30 000), est vide parce qu'il est en MER
  (terrain à 24, sous l'eau) : très bien pour un vol ou un piéton qu'on pose
  sans physique (le sursaut, v376), impossible pour une voiture qui roule —
  mesuré sous node, aucun de ses quatre cents rectangles n'est au sec. Le
  témoin du freinage cherche son rectangle à partir de (−1 500, −2 500), hors
  ville, plat, un sol plein sous chaque colonne, rien posé dessus, et exige que
  la situation ait eu lieu (`ecartes > 0`).
- **UN TÉMOIN DE COMPTE PUBLIE QUI IL COMPTE.** « Plantés au milieu de la
  chaussée » rend désormais, pour chaque passant sur la chaussée, son état, sa
  traversée, son écart, s'il est animé (sinon figé là où il était, v241) et
  s'il est à son poste de naissance — son prochain rouge se démonte en une
  lecture (v223).

## Les passants réagissent à la route (v376) — un geste court, et une pause qui se compte en temps réel

Point 3 du chantier « conduite » côté piétons. Trois règles.

- **UNE PAUSE QUI SUIT UN GESTE EN TEMPS RÉEL SE COMPTE EN TEMPS RÉEL.**
  L'écart (v351) se faisait en temps réel, mais la pause d'après (`repos`)
  restait en `dt` : 0,8 seconde de jeu, trois secondes de montre à cinq images
  par seconde — exactement le « planté au bord de la rue » que la v243
  interdit. `REPOS_ECART_S` (0,35) se décompte sur `dtReel`. Quand un état
  change d'horloge, celui qui le suit change avec lui.
- **UN SURSAUT EST UN GESTE, PAS UNE PROTECTION.** Il se déclenche quand
  l'échéance de la voiture (`couloirVoiture`, champ `t`) passe sous
  `SURSAUT_S` et ne touche qu'à l'animation : la pose d'`animerHumain` et un
  petit saut du maillage. C'est l'écart qui protège, et rien ne le remplace.
  Et il se juge sur TOUT le passage de la voiture (`VEILLE_SURSAUT_S`, couloir
  élargi `MARGE_SURSAUT`), pas à l'instant où l'écart commence : le couloir
  porte à 1,6 s de route, et à cet instant la voiture est presque toujours
  plus loin qu'une demi-seconde. Le premier jet ne testait que l'entrée :
  vert quand le banc ramait, rouge (`sursauts: 0`) au portail suivant.
- **CE QU'UNE AUTRE SESSION PUBLIE SE LIT SI PRÉSENT, ET À FRAIS.**
  `player.choc` (session physique) : `regardChoc` (pur) ne regarde qu'un choc
  de moins de `CHOC_FRAIS_MS` — un passant né après le bruit ne se retourne
  pas — et jamais pendant un écart ni une traversée. Le témoin POSE le choc
  comme la physique le ferait, puis rend `player.choc` à son état d'avant :
  `degats3d.js` lit sa PRÉSENCE pour choisir entre le choc publié et son
  repli.

## Les passants traversent au feu (v371) — un piéton lit le MÊME feu que la voiture

Point 2 du chantier « conduite » côté piétons. Quatre règles.

- **ON MESURE CE QUE LES PASSANTS FONT AVANT DE LEUR APPRENDRE À TRAVERSER.**
  `sonde-traversees.cjs` découpe la trace de chaque passant animé en sorties
  du trottoir, traversées (retour au trottoir à plus de trois blocs) et
  retours. Avant : Rome une traversée en soixante secondes, hors feu ; Paris
  et Londres zéro. Il n'y avait donc pas de traversées « sauvages » à
  interdire, il y avait des traversées à créer — l'inverse de ce que la
  consigne laissait supposer.
- **DEUX LECTURES DU MÊME FEU, JAMAIS DEUX RÈGLES.** `pietons.js` importe
  `etatFeu` et `axeDuCap` de `feux.js` (son seul import, pur). Traverser dans
  la direction (ux, uz) coupe l'AUTRE axe (`axeCoupe`) ; on part quand il est
  au rouge avec `durée + MARGE_FEU_S` de rouge devant soi (`feuPieton`). Le
  feu qui compte est dans `feuxProches`, la liste que la circulation lit : là,
  et seulement là, les voitures s'y arrêtent. Le cycle ne dépend que de l'axe
  et de l'heure de la rue (v305) — `world.heureRue` —, la règle n'a pas
  besoin de savoir quel feu.
- **LA TRAVERSÉE EST EN TEMPS RÉEL, COMME L'ÉCART (v351).** La fenêtre du feu
  est une durée de l'horloge de la rue ; en `dt` borné, huit blocs de
  chaussée dureraient quinze secondes réelles à cinq images par seconde.
  `think` rend `reel: true` et `BaseNPC.update` convertit, même pas borné que
  l'écart. Le témoin compte donc en secondes de MONTRE.
- **UN PASSAGE SE CHERCHE LE LONG DE LA BORDURE, ET À PARIS IL EST PEINT.**
  La trame de Paris est en biais : mesuré sur 1 231 bords de trottoir, 588
  chemins vers le trottoir d'en face et 26 seulement sur un passage depuis le
  point même. On cherche le départ trois blocs de chaque côté, en restant SUR
  le trottoir (un départ rejoint par la chaussée, au coin, rendait des
  « retours » d'un bloc). Aux carrefours parisiens sans feu, `marquageParis`
  dit où est le passage (`axe: null`) : on part quand `vehiculeApproche`, avec
  un horizon égal à la durée de la traversée, ne voit rien venir. Hors
  carrefour, on ne traverse pas : on tourne, comme avant. Et l'attente se
  borne (`ATTENTE_MAX_S`, douze secondes, un peu plus qu'un demi-cycle) —
  mesuré à six, six coins à feu sur dix renonçaient.
- **UN TÉMOIN QUI ATTEND QU'UN PASSANT ARRIVE À UN COIN MESURE LA CADENCE.**
  Rejoué seul, le premier témoin voyait 3 à 11 traversées en soixante
  secondes ; au portail, à trois images par seconde, une seule — puis une en
  trente secondes de JEU. Atteindre un coin se fait au pas (temps de jeu), la
  traversée et l'attente au feu en temps réel : aucune fenêtre ne sert les
  deux. Le témoin POSE donc huit passants au bord, face à la rue, aux coins des
  feux (relevés par le témoin lui-même : l'ancien code n'a pas de
  `passagePieton`), et compte ce qu'ils font — 0 et 0 sur `origin/main`, 9, 6
  et 3 ici. C'est la leçon des poissons (v233), une fois de plus.
- **UN PASSANT QUI TRAVERSE CHANGE LA SITUATION DES TÉMOINS DE CONDUITE.**
  Avant la v371, aucun passant de Paris ne descendait sur la chaussée ; le
  témoin du réverbère prenait le volant sans regarder la rue, et un passant
  sur le passage devant le capot l'a figé à zéro bloc (`pietonDevant`, voulu).
  Un témoin qui roule fait le vide des passants autour de lui, comme des bêtes
  (v284) : « se placer » veut dire l'endroit, le cap ET ce qui traîne autour.

## Les passants de Manhattan au long cap (v354) — un trottoir qui vit dans un plan se demande au plan

Une règle.

- **À MANHATTAN, UN SOL PRATICABLE N'EST PAS UN TROTTOIR.** `piedPieton` rend
  33 pour toute case où l'on peut poser le pied, chaussée comprise : c'était la
  raison pour laquelle la v278 avait écarté le site urbain de la marche au long
  cap. `world.trottoirA` (main.js) exige désormais aussi `ruePietonne` (le
  plan) — la même question, posée à la source qui sait y répondre. Et un
  témoin qui pose la voiture dans une rue de Manhattan fait aussi le vide des
  passants : ils y marchent désormais, et la voiture freine devant eux.

## Les piétons et les voitures rapides (v351) — ce qui fuit une horloge réelle se compte sur elle

Le chantier « conduite » (sept sessions) triple les vitesses. Trois règles.

- **UN REGARD QUI PORTE EN BLOCS EST UN TEMPS QUI RÉTRÉCIT.** Le couloir de la
  v259 valait `min(30, 2 v + 4)` blocs : une demi-seconde à 60 b/s. Il se
  mesure désormais en SECONDES de route (`HORIZON_S`, 1,6 — le double de ce
  qu'il faut à trois images par seconde, mesuré), avec une marge large sous
  0,8 s et étroite au-delà (seul ce qui est dans la trajectoire réagit loin
  devant). `src/pietons.js` est pur et c'est lui que `main.js` lit.
- **UNE VOITURE QUI ROULE EN TEMPS RÉEL SE FUIT EN TEMPS RÉEL.** La position
  d'un convoi est une fonction de l'horloge de la rue (v305) ; le piéton
  marchait en `dt` borné. À cinq images par seconde il allait quatre fois
  moins vite que ce qu'il fuyait : touché dès 7 b/s. C'est le piège de `dt`
  (v226) dans le sens où il BLESSE, et la règle « une animation suit le temps
  du jeu » ne s'y applique pas : ce qui doit tenir face à une horloge réelle
  se compte sur elle. L'écart (`BaseNPC.update`) avance en temps réel, par
  pas de 0,9 bloc au plus pour que la boîte glisse bloc à bloc. **Avant
  d'accélérer un objet, on demande sur quelle horloge il roule, et sur
  laquelle roule ce qui doit l'éviter.**
- **UN TÉMOIN DE CHOC JUGE LE VOLUME BALAYÉ, ET IL PROVOQUE LA CADENCE.** À
  60 b/s et cinq images par seconde, une voiture saute douze blocs d'une image
  à l'autre : un instantané ne la voit jamais sur le piéton. Le témoin de
  `monte.js` juge l'intervalle parcouru par la carrosserie entre deux images,
  et la position d'ARRIVÉE (v279) ; il suspend `player.update` pour conduire
  la voiture à la main en temps réel — le freinage de la voiture
  (`pietonDevant`) ne joue donc pas : on éprouve le seul filet du piéton, les
  deux se cumulent et l'on ne compte pas sur l'autre. Une passe brûle
  180 ms par image (v234).

## Les rues de Londres à la règle du kit (v339) — un plan deux fois plus serré ne porte pas les mêmes rues

La première des cinq villes bâties à la main restées hors règle (dette v271).
Quatre règles.

- **LA RÈGLE DU KIT SE MESURE QUARTIER PAR QUARTIER AVANT DE CHOISIR LES TYPES,
  ET LE PLAN DÉCIDE CE QUE LA RÈGLE PEUT PORTER.** Londres est à vingt-quatre
  blocs par kilomètre, la moitié de Paris : ses soixante-dix avenues nommées
  sont deux fois plus serrées. Toutes en collectrices (mesuré), Soho tombait
  de 18,6 % de lots à 2,1 et Bloomsbury de 22,7 à 1,3 — Tottenham Court Road
  et Gower Street, à quatre blocs, ne font plus qu'une chaussée. Le type se
  lit à la fonction (v303) : deux voies pour les artères de la vraie ville
  (`ARTERES`, les « A-roads »), une (`locale`, 3,1 m) pour les rues de
  quartier — déjà plus large que la plus large d'avant (2,4). Aucun
  boulevard. Le seul remède qui rende Soho est celui de Paris (doubler le
  plan) : il déplace la Tamise, donc `terrainHeight` — décision de Max,
  déclarée dans `TASKS.md`.
- **UNE TRAME POSÉE SOUS DES AVENUES NE LES DOUBLE PAS.** La trame de la v178
  était tracée sans regarder les avenues ; une de ses rues venait s'intercaler
  à quelques blocs d'une avenue parallèle. « Si l'élargissement mange les
  bâtiments, on recompose les lots » : là où les avenues quadrillent le
  quartier, ce sont elles les rues, et l'îlot va de l'une à l'autre. Une rue
  de la trame n'est pas tracée là où elle longe une avenue à moins de 35° et
  à moins de `RECUL_TRAME` (demi-emprise d'artère + `ILOT_MIN` + demi-chaussée
  de trame, 13,9) ; celle qui COUPE l'avenue reste. Disque : 26,1 % avant,
  19,5 avec la règle seule, 26,6 avec le recul.
- **LE MOBILIER SE POSE SUR LA SECTION, PAS SUR L'AXE.** Les bus et les taxis
  étaient au milieu de la chaussée, à 0,1 à 2,1 blocs des circuits : la
  circulation les traversait (dette v210). Une adresse de mobilier se donne
  par l'avenue, la fraction et le côté ; le véhicule se gare à la
  demi-chaussée moins sept dixièmes, la cabine au milieu du trottoir, et la
  pose se MESURE au chargement — tout le véhicule sur sa matière, à plus
  d'une demi-voiture et d'un demi-bloc de tout axe d'avenue — sinon on
  glisse le long de l'avenue, puis on change de côté. Une rue d'une voie n'a
  pas la place d'un bus garé : arrêts et taxis sont sur des artères.
- **LA VILLE D'AVANT SE FIGE, ET ELLE RESTE SOUS CE QU'UN ENFANT A BÂTI.**
  Londres ne bouge pas : c'est la règle de la v303, pas celle de la v306.
  `londres-v332.js` est la ville recopiée à l'octet, jamais modifiée ; une
  colonne où un bloc a été posé avant `DATE_RUES_LONDRES` (et ses huit
  voisines, `colonnesLondresAvant`) la garde — rien n'enferme une maison
  posée sur une ancienne rue, rien ne retire le toit sous une cabine. Les
  mondes d'avant (`CONF_AVANT`, `CONF_V308`) ont la Londres d'avant
  (`londresAvant`) : c'est celle qu'on y voyait. Le témoin de `plafond.js`
  est rouge désarmé (21 blocs de ville autour de la maison, toit absent).
  **La date se relit à la fusion** (v309) : une date en avance retiendrait
  la ville d'avant sous ce qu'un enfant pose sur la ville neuve.
## Les dégâts de la voiture (v343) — on froisse SA géométrie, jamais celle de la rue

Max : « Comme dans GTA, quand tu crashes ton véhicule, il s'abîme… elle prend
feu, on se retrouve à sortir de la voiture. » Chantier « conduite », session
des dégâts. La règle est PURE (`degats.js`, lue sous node), ce qui se voit vit
à côté (`degats3d.js`), et `fun.js` ne porte que quatre crochets. Six règles.

- **LA GÉOMÉTRIE DE LA FLOTTE EST PARTAGÉE PAR TOUTE LA RUE.** Toutes les
  voitures d'un modèle sont des clones du même prototype : enfoncer ses
  sommets froisserait chaque voiture du même modèle. On clone la géométrie de
  LA pièce touchée, au premier choc qui l'atteint (une sphère d'influence
  écarte les autres), jamais avant. Un témoin lit l'autre voiture du même
  modèle et exige la géométrie commune intacte. Les clones sont enfants du
  maillage, non marqués `partagee` : `liberer` (v238) les rend quand la
  voiture s'en va, et le garage (`reparer`) les rend en remettant l'original.
- **UN CHOC NE COMPILE RIEN.** Un matériau cloné garde son programme ; on ne
  change que des UNIFORMES (couleur, opacité, rugosité, émissif), jamais un
  define (`clearcoat`, `transmission`, une carte). Les deux matériaux neufs —
  la fumée, les flammes — se chauffent pendant l'accueil (`chauffer`, appelé
  dans la chaîne `pas` de main.js). Mesuré : 94 → 96 programmes au feu si l'on
  désarme la chauffe, 96 → 96 armée. Aucune lampe : les flammes sont
  additives et hors correspondance tonale, comme celles des réacteurs (v264).
- **UNE COULEUR DE `setRGB` EST LINÉAIRE.** La fumée « noire » à 0,12 sortait
  gris moyen à l'écran (#616162 mesuré) : le noir d'une fumée est sous 0,02.
  Et des flammes additives qui se recouvrent saturent au BLANC — la teinte
  reste dans l'orange, l'opacité sous 0,7. Les deux vus en capture, aucun par
  un témoin.
- **LA BOUCLE D'ENFONCEMENT SE MESURE ET SE RODE.** `computeVertexNormals` sur
  toute la pièce faisait vingt des trente millisecondes du premier choc : on ne
  refait que les normales des sommets déplacés (une arête vive reste vive). Le
  premier passage coûte le double des suivants (le moteur JavaScript la
  compile) : la chauffe la rode sur une boîte. 12 ms au premier choc, 6
  ensuite, rien par image ; le témoin garde 30.
- **LE REPLI NE COMPTE JAMAIS UN PIÉTON.** Tant que la physique ne publie pas
  `player.choc`, un choc est une chute de vitesse qu'aucun frein n'explique
  (`detecterChoc`). Mais s'arrêter devant un piéton (v259) ou au bord de l'eau
  (v272) fait la même chute : `main.js` note `player.arretDouxT` dans ces deux
  familles d'obstacle, et le repli l'ignore. Dès que `player.choc` existe, il
  fait seul foi.
- **LE CONTRAT AVEC LA PHYSIQUE.** `player.etatVoiture = { sante, moteur,
  direction, enPanne, enFeu }` (direction en rad/s à pleine vitesse, positive
  vers la gauche). Tant que la physique ne pose pas `player.physiqueLitEtat`,
  `degats3d.js` applique lui-même l'allure réduite (par `player.boost`) et le
  biais de cap — jamais deux fois. Et `boost` ne vaut jamais ZÉRO : `player.js`
  lit `if (this.boost)`, et une voiture « en panne » roulait à l'allure de la
  marche (mesuré, 1,7 bloc en 2,5 s).

**Et l'ami le voit (v344).** La position emporte les dégâts (`p.v.d`, les
impacts et le feu, via `versReseau`) ; le receveur les REJOUE sur la voiture
qu'il dessine (`distant`), avec les mêmes fonctions et le même bruit
déterministe — on n'envoie pas de géométrie, on envoie l'histoire du choc.
Une tablette restée sur l'ancienne version ignore le champ (le receveur cède).

**Le feu coûte deux appels (v348).** Fumée et flammes sont chacune UN
`InstancedMesh` (`essaim`, degats3d.js) : la couleur par `instanceColor`,
l'opacité par un attribut `aAlpha` qu'un petit greffon (`onBeforeCompile`,
clé de programme FIXE `degats-alpha`) multiplie dans le fragment. Les carrés
vivants sont tassés en tête (`count`), un essaim vide est caché. La chauffe
compile un essaim d'UNE instance sur les mêmes matériaux — `instanceColor`
existe dès la naissance, parce que `instancingColor` est dans la clé. Mesuré :
30 appels pour 30 carrés avant, 2 pour 28 après ; le témoin rend la même image
deux fois (essaim caché, montré) et exige plus de quatre carrés, sinon
l'égalité ne prouverait rien.

**L'épave reste chez l'ami, et la rue s'abîme (v356).** Quand le conducteur
est déposé, `p.v` disparaît : le RECEVEUR garde l'épave en feu là où elle
s'est arrêtée (`garderEpave`, appelé par `synchroniserVehiculeDistant`) et la
fait vivre lui-même jusqu'à `DUREE_CARCASSE` — rien de neuf sur le réseau.
Seule une voiture hors service se garde. Une voiture de la rue percutée
(`percuterRue` : le point d'impact du MONDE, et `vehicules.voitureRueProche`,
crochet court branché par main.js APRÈS `initFun` — branché avant, `fun` est
dans sa zone morte et le jeu ne démarre plus, vu au banc) se froisse par la
même règle 1, ne prend jamais feu (`rec.rue`) et ne parle pas. Ce qui s'en
va se rend une fois : un clone marqué `rendu` à son `dispose` (par `liberer`)
ne se rend pas une seconde fois — le premier témoin comptait 28 rendues pour
14 clones.

**Les coups suivent la voiture, et la rue est la même chez l'ami (v363).**
Une voiture de la rue froissée que l'enfant prend (`emprunter`, v194) passe
son HISTOIRE de chocs à la monture neuve (`heriter`, degats3d.js) ; `fun.js`
la retrouve AVANT l'emprunt par sa place (`rueEn`), sans toucher la
circulation. À plusieurs, une voiture de la rue se nomme par `clé#rang`
(`vehicules.voitureNommee`, crochet court) ; le choc part dans un message
court (`rue_choc`, nom neuf : l'ancienne tablette l'ignore, l'hôte relaie) et
chaque tablette garde l'histoire par nom (`histoire`, soixante-quatre noms,
douze chocs) et la rejoue sur SA voiture de ce nom quand elle existe
(`rapprocher`, deux fois par seconde). Toujours l'histoire, jamais la
géométrie. Et **un témoin de compilation lit les CLÉS de programme, pas leur
compte** : un programme rendu fait baisser le compte (97 → 96, rouge des deux
côtés), une compilation ajoute une clé — vérifié rouge, chauffe désarmée.

**Le coût se lit sur la tablette (v364).** `degats.bilan()` rend le nombre
d'enfoncements, le premier, le dernier et le pire en millisecondes, et les
appels du feu ; `main.js` le range dans le relevé du journal de bord (v296) et
l'affiche sous `?diag=1`, seulement si quelque chose s'est abîmé. Les
millisecondes du banc ne se transposent pas (v247) : celles-là si.

**Le feu dépose l'enfant, il ne le projette pas** : passé `DELAI_SORTIE` (3,5 s
en temps réel), `fun.js` le fait descendre et `deposer` le pose debout sur une
case libre à côté (côté conducteur d'abord). La carcasse porte `horsService`
(lu par `animals.js`, comme `montee`) : elle ne se reprend pas, et elle s'en
va au bout de `DUREE_CARCASSE`.
**Le contrat éprouvé bout à bout, et un coût qui se compte (v374).** Un
témoin de contrat qui publie ses chocs à la main ne prouve pas que la vraie
physique les publie : celui de la v374 n'écrit RIEN dans `player`, prend un
mur de face, et lit les deux côtés (`player.chocs`, `degats.chemins()` :
publiés, repli, effets appliqués ici). Le repli ne sert plus en jeu ; il est
gardé pour une physique qui ne publierait pas. Et le coût d'un choc se borne
en GRANDEURS qui ne suivent pas le processeur partagé — sommets déplacés,
normales réécrites hors d'eux (zéro), travail par image après le choc
(zéro) — les millisecondes restant dans le message (v270).

**Un ancien hôte, et l'histoire par la position (v374).** Un message neuf
(`rue_choc`) n'est pas relayé par un hôte qui ne le connaît pas ; la
position, si (`{ ...msg }`). Ce qui doit traverser un ancien hôte s'accroche
à elle, et devient idempotent en envoyant l'HISTOIRE (adoptée seulement si
la nôtre en est le début), jamais le seul dernier événement.

**La tolérance à la GTA (v405).** Max : « on fonce dans deux trucs et elles
tombent en panne. » Mesuré sur la v404 : panne au 2e mur de face, feu au 3e, et
dix bordures (force 0,3) mettaient la voiture en feu. Quatre règles.

- **LA PANNE NE VIENT QUE DE LA SANTÉ.** Le moteur (`0,4 × zone avant + 0,6 ×
  santé`) règle l'allure et la fumée ; une zone enfoncée ne cale plus la voiture
  à elle seule. C'est ce qui calait en deux murs : `min(zone avant, …)` passait
  sous le seuil quand la santé valait encore 0,4.
- **LA PERTE SUIT LE CARRÉ DE LA FORCE** (`COURBE_FORCE`, l'énergie du choc).
  La force publiée par la physique sature à 1 dès 20 b/s normaux
  (`CHOC_PLEIN`, conduite.js) : c'est une décision de la physique, qu'on ne
  touche pas d'ici ; la courbe se règle côté dégâts. Un frôlement rasant à
  60 b/s publie encore 0,78 — il coûte 0,6 mur, déclaré.
- **LE NOMBRE DE MURS EST ÉCRIT DANS LE CODE** (`CHOCS_AVANT_PANNE` 9,
  `CHOCS_AVANT_FEU` 12) et le témoin le LIT : changer une constante sans changer
  la promesse rougit. Fumée au 2e mur de face (6e de flanc ou par l'arrière) :
  l'enfant voit qu'elle s'abîme bien avant la panne ; la tôle, elle, se froisse
  dès le premier choc (la déformation suit la force, pas la santé).
- **UNE HISTOIRE QUI SE REJOUE DOIT ALLER AUSSI LOIN QUE LA RÈGLE.** Douze chocs
  d'historique suffisaient quand le feu venait au 3e ; l'ami aurait vu une
  voiture bien plus saine que le conducteur. `MAX_CHOCS` vaut 24 (la santé
  rejouée est exacte jusqu'au feu pour des chocs ≥ 0,7), dans `degats.js` et
  `degats3d.js` (`noter`, `adopterHistoires`) ; le format ne change pas. Une
  tablette restée sur la v404 rejoue cette histoire avec l'ancienne règle et
  voit la voiture de l'ami en panne plus tôt : le receveur cède, et c'est
  accepté. Et une ancienne tablette ignore une histoire `rc` de plus de douze
  chocs : `rue_choc` reste son chemin.
- **UNE HISTOIRE BORNÉE SE COMPTE PAR SON TOTAL, JAMAIS PAR SA LONGUEUR
  (v474).** Une liste qui garde les N derniers ne grandit plus une fois pleine :
  `rattraper`, `distant` et `rapprocher` comparaient sa longueur à ce qui était
  appliqué, et le 25e choc n'enfonçait plus rien (30 chocs, 24 enfoncements,
  mesuré). `etat.total` (et `h.n` pour la rue) compte tout ; le n-ième choc
  rejoué est `chocs[longueur − (total − n)]`. Ce que les derniers ne suffisent
  plus à refaire voyage à part, seulement quand l'histoire a débordé : la santé
  (`s`) et le total (`n`) dans `p.v.d`, absents sinon (le message garde sa
  forme d'avant).

## Celui qui part dit au revoir (v393) — un commentaire de départ se relit dans `stop()`

Les deux rouges réseau récurrents du palier C. Trois règles.

- **CE QUI S'ARRÊTE S'ANNONCE, ET LA LIGNE QUI LE DIT SE RELIT DANS LE CODE
  QU'ELLE APPELLE.** `pagehide` appelait `net.stop()` sous « on prévient les
  autres joueurs avant de disparaître » ; `stop()` ne faisait que démonter.
  Le départ reposait sur la fermeture du transport — la règle de la v219,
  écrite pour la caméra, jamais appliquée au départ. Tant que le silence
  retirait tout pair à 20 s, le défaut se voyait à peine ; depuis que la v266
  garde un pair au canal ouvert 90 s, un transport qui ne dit rien (sonde du
  portail : canal `open`, ICE `connected`, silence 74 s) le gardait une minute
  et demie. `stop()` envoie `bye` avec `adieu: 1` à chacun AVANT de démonter,
  et le receveur traite l'adieu du pair lui-même comme un lien qui tombe
  (`dropPeer` : l'hôte relaie, l'invité qui perd l'hôte repart). Une ancienne
  tablette lit `from` et retire le pair. Quand une règle durcit un délai
  (v266), on cherche le jour même qui comptait sur l'ancien délai.
- **ON PROVOQUE L'ÉTAT DU PORTAIL, ON NE L'ATTEND PAS.** Le rouge venait une
  fois sur dix ; la sonde `sonde-depart-transport-muet.cjs` le fabrique à
  chaque fois (transport laissé debout, `stop()`, page figée) : 0/2 nettoyé en
  60 s sur l'ancien code, 3/3 en ≈ 1 s. Le témoin de `reseau.js` fait de même.
- **UNE FENÊTRE DE MÉLODIE N'EST PAS UN VOLUME.** « Caméra éteinte, le jeu
  reprend sa voix normale » comparait 1,5 s de radio établie au DÉBUT de la
  mélodie que le contexte neuf relance. Sans aucun appel, deux fenêtres
  varient de 0,68 à 1 (`sonde-voix-apres-appel.cjs`), et la radio relancée
  sans appel rend la même distribution qu'après l'appel. La grandeur est le
  gain de sortie rendu, plus un niveau au-dessus de la MOITIÉ — milieu entre
  une voix restée au quart (`GAIN_APPEL`) et le régime qui varie ; vérifié
  rouge sur une copie où la voix reste au quart.

## Un document à deux auteurs s'écrit sous condition (v571)

La v374 faisait relire chaque tablette avant d'écrire ses réglages ; ce
n'était qu'une demi-garde. Deux règles.

- **RELIRE AVANT D'ÉCRIRE NE FERME PAS LA FENÊTRE, ÇA LA DÉPLACE.** Une
  tablette chargée met des secondes entre sa lecture et son écriture (six,
  mesurées par `sonde-reglages-deux.cjs`) : tout choix posé ailleurs entre
  les deux était effacé. C'est le serveur qui tranche (`prefsPushSi`,
  cloud.js) : un PATCH filtré par `prefs->>majProfil` égal à ce qu'on a lu ;
  zéro ligne écrite → on relit, on adopte, on réessaie. Tout document que
  deux tablettes écrivent en entier se protège ainsi, par la date de ce qui
  compte, jamais par un délai.
- **UN TÉMOIN DE COURSE RETIENT LA REQUÊTE PÉRIMÉE.** Attendre qu'un banc
  chargé retarde une écriture au bon moment est un tirage (1 rouge sur 2) :
  `reglages.js` tient la première écriture de l'autre tablette dans
  `page.route`, fait cliquer, relâche quand le choix est au serveur. Le
  Supabase de poche (`nuage.js`) écrit sous condition comme le vrai.

## Un service worker vraiment coincé (v488) — un blocage qu'on provoque se fabrique dans le code, pas dans le réseau

Une règle. Les deux témoins de la v220 bloquaient le RÉSEAU (une requête qui
ne répond pas) : le navigateur finissait toujours par l'épuiser, et l'ancien
code s'en sortait sans filet — verts des deux côtés. Un `install` dont la
promesse ne se tient jamais, glissé dans le `sw.js` publié
(`sonde-sw-coince.cjs`, par `publierVersion`), ne s'épuise pas dans la fenêtre
du filet. Le témoin juge l'ÉTAT (rechargée, version neuve ou fichiers du
serveur), et il est rouge sur une copie au filet désarmé comme sur une copie
où `forcerMaj` attend `unregister()` sans borne. Avant de croire qu'une panne
« ne se fabrique pas », on cherche la couche où le navigateur n'a pas de délai.

## Un freinage de la rue se date à l'heure de la rue (v481)

Deux règles.

- **CE QUI AVANCE EN TEMPS RÉEL PAR IMAGE SE MESURE À SA PROPRE HORLOGE.** La
  rue avance par image de `dtReel` (v305) ; au banc une image dure jusqu'à une
  seconde, et des relevés posés tous les dixièmes de seconde tombent ENTRE les
  images. Une perte de vitesse divisée par l'écart entre deux relevés divise
  ce qu'une image de 0,7 s a fait par 0,112 s : « 38 b/s² » pour une voiture
  qui freinait à 7,5. Un témoin qui juge une DÉRIVÉE (décélération, débit) de
  la rue date ses relevés à `vehicules.horloge()`, jamais à
  `performance.now()`. Contrôle fait : freinage désarmé à 100 b/s², la mesure
  à l'horloge de la rue le voit (pire 32,8).
- **UNE CAUSE ÉCRITE DANS `TASKS.md` SE MESURE AVANT D'ÊTRE CORRIGÉE.** La
  dette accusait l'arrêt d'urgence au contact ; le code l'excluait déjà dans
  une même file (`memeLigne`), et un journal des huit dernières images de
  chaque voiture, vidé par la sonde au moment de la chute, a nommé ce qui
  restait — la borne de la v450 qui ne s'arme qu'en cause 1, le plancher, un
  arrêt sans témoin — sans un seul arrêt d'urgence. Corriger le jeu sur la foi
  de la dette aurait touché la conduite pour le mauvais mécanisme (v291).
  **Et un mécanisme rare ne se démonte pas par un compteur : il se démonte par
  ce journal circulaire**, lu à l'instant exact où le témoin voit la chute.
## Le phare se lit sur dix secondes (v476) — une borne de requête mesure le fil, pas le réseau

Une règle. Une requête au nuage bornée par `Promise.race` contre un minuteur
ne mesure pas le réseau : le minuteur et la lecture de la réponse attendent
TOUS DEUX le fil principal, et une tablette qui entre dans un monde le gèle
jusqu'à quinze secondes (`sonde-phare.cjs`). Le sondage du phare, contre un
nuage local au repos, rendait 2,9 à 4,2 s — verdict « tenu » chaque fois —
et la borne de trois secondes le perdait trois fois sur quatre : l'invité
concluait « introuvable » et OUVRAIT le monde par-dessus l'hôte. Une borne
dont l'échec mène à une action irréversible (un monde jumeau) se pose bien
au-dessus de ce qu'on mesure (`PHARE_MS`, dix secondes) ; celle de
`tenterDevenirHote` reste à trois, parce que son échec ne bouscule rien.
Et l'avion de l'ami a son témoin à deux tablettes (`reseau.js`), rouge quand
`p.v` ne porte plus que ce qui a un siège.

## Le lot 3 des témoins (v471) — un compteur se lit sur ce qu'il compte vraiment

Cinq rouges récurrents du portail, chacun démonté par une sonde. Six règles.

- **PAR LE NUAGE, ON POSE SON CURSEUR AVANT DE FRAPPER.** `BusNuage`
  (relaisnuage.js) lit le dernier numéro du relais (`_amorcer`) pour ne pas
  relire le passé ; l'invité écrivait son `nuage-coucou` PENDANT cette
  lecture, et la réponse d'un hôte rapide tombait derrière le curseur posé
  ensuite — jamais lue, « Personne n'a répondu dans ce monde ». Tout envoi
  attend l'amorce (`_amorce`), l'ordre des envois est gardé. Sous node
  (`sonde-relais-amorce.mjs`) : 6 perdues sur 100 avant, 0 après ; un témoin
  déterministe en tête de `reseau.js` provoque la situation (v233). Une
  intermittence « des deux côtés » peut être une course du JEU : la double
  mesure (v195) dit « pas la livraison », jamais « pas le jeu » (v374).
- **`renderer.info.render.frame` COMPTE DES RENDUS, PAS DES IMAGES.** La sonde
  des reflets rend une face par image près d'une voiture (v245) : quarante
  « images » valaient vingt tours de boucle à Manhattan (0,2 image par
  seconde). Un témoin qui attend du jeu compte le TEMPS DE JEU dans la page —
  chaque `requestAnimationFrame` ajoute son écart borné à un vingtième, la
  règle de `main.js` — et met sa fenêtre de côté pendant la mesure (v440).
- **UNE TÂCHE LONGUE N'EST PAS LA FONCTION QU'ON ÉPROUVE.** Le glisser de la
  carte jugeait la plus longue tâche du fil : les tâches de plus d'une seconde
  tombent aussi carte immobile, le plus long appel de la carte vaut 21 à
  45 ms. On enveloppe ce qui dessine (méthodes du prototype, réassignées sur
  l'instance ; la profondeur d'appel compte pour ne mesurer que l'appel
  extérieur) et l'on juge l'appel. Désarmé (fond d'un seul tenant) : 1 988 ms.
- **UNE CAUSE PUBLIÉE PEUT EN CONFONDRE DEUX ; ON REMONTE LA FILE.**
  `etat().causes` vaut 1 pour un feu OU SA FILE, et la file est légitime
  derrière un piéton aussi (v395) : les arrêts « au feu » du témoin étaient
  des voitures de file, parfois derrière un piéton. `diagVoiture` donne la
  cause fine et le bloquant ; le témoin remonte jusqu'à la racine.
- **UN VERDICT QUI ATTEND UN ÉVÉNEMENT RARE SE JUGE PAS À PAS.** Un arrêt
  complet au feu depuis une allure arrivait 0 à 2 fois en 90 s : un tirage.
  Chaque paire de relevés d'une voiture retenue par un feu est un échantillon
  (des centaines par fenêtre) ; piler, c'est perdre plus de dix blocs par
  seconde entre deux relevés. Et une fenêtre qui fait le vide (passants
  écartés) se tient À PART : le vide changeait le taux de voitures l'une dans
  l'autre de la fenêtre voisine (0–2 % → 2–18 %).
- **CE QUE LE TÉMOIN DU FEU A TROUVÉ RESTE ROUGE.** Une voiture de file passe
  de 4,3 b/s à 0 en 112 ms derrière celle qui s'arrête au feu — l'arrêt
  d'urgence au contact, que la v395 réservait aux contacts entre files. Zone
  conduite, déclaré en tête de `TASKS.md` avec sa sonde (`sonde-rue-feu.cjs`).

Et le vol au-dessus de Paris (« le monde se maille hors du fil principal ») :
vert rejoué seul depuis que la v440 met `tab` de côté (252 blocs en 12,8 s) ;
seule, la page vole 597 à 789 blocs en 30 s, avec une voisine en jeu 408
(`sonde-vol-paris.cjs`). Son message porte la cadence.

## Une page en jeu coûte quatre cœurs (v440) — on la met de côté, et l'on compte en images

Le second lot des rouges récurrents. Cinq règles.

- **UNE PAGE EN JEU À CÔTÉ COÛTE PRESQUE TOUT LE BANC.** La page principale
  de `monte.js` restait en jeu pendant chacune des six pages secondaires, et
  `ciel` (rr 12) n'était jamais fermée. Mesuré (`sonde-voisine-de-cote.cjs`) :
  une voisine en jeu 3,5 à 3,8 cœurs, réduite à 16 × 16 pixels 0,15 ; la
  chauffe de New York d'une page neuve passe de 22–24 s à 7 s.
  `banc.mettreDeCote(p)` / `banc.ramener(p)` encadrent toute page secondaire,
  et une page se ferme après son dernier usage. Le gel CDP ne sert à rien
  (v427) ; c'est la SURFACE qui coûte.
- **UNE IMMOBILITÉ SE COMPTE EN IMAGES, PAS EN SECONDES.** Le témoin du
  réverbère jugeait « arrêté » sur dix relevés de montre sans mouvement : à
  une image par seconde, la voiture n'était pas encore partie. On attend un
  départ (un demi-bloc), puis l'on compte les images RENDUES
  (`renderer.info.render.frame`) sans avancer.
- **UNE GÉOMÉTRIE SE LIT SUR L'OBJET TOUCHÉ, PAS SUR LA VILLE.** Le trou de
  façade de Manhattan comptait la géométrie de TOUS les immeubles (dette de la
  v291) : il mesurait la file de chargement. Il lit l'immeuble que
  `batimentA` nomme, attend qu'il soit REBÂTI, et compare ses instances.
- **UNE PISTE D'ESSAI EST PLUS LONGUE QUE CE QU'ON Y FAIT.** L'atterrissage
  manuel touchait à 300,9 sur une piste de 300 : la cadence décide où l'on
  touche (v273), donc la piste en a 400 et la barre suit.
- **UN TÉMOIN QUI TROUVE UNE VRAIE PANNE RESTE ROUGE.** Le train qui traverse
  la voiture de l'enfant n'était pas une intermittence de banc : la rame ne
  regarde que 3,5 blocs devant elle (`PAS_TRAIN`) et roule en temps réel, donc
  une image lente la fait passer d'« assez loin » à « déjà dedans »
  (`sonde-train-voiture.cjs`, 5 traversées sur 10 sous charge). Zone conduite :
  déclarée en tête de `TASKS.md`, le témoin n'a pas été adouci.

- **UNE SESSION ACTIVE N'EST PAS UNE PARTIE REJOINTE.** `net.active` vaut vrai
  dès que la tentative commence (« Ouverture du monde… »). Un témoin qui
  attend « l'invité est entré » attend le STATUT qui retombe (vide, ou
  « ❌ »), pas le drapeau — mon premier remède cliquait 0,8 s plus tôt que
  les deux secondes fixes qu'il remplaçait, et rendait le témoin plus rouge.

## Quatre témoins qui se placent (v427) — une page sur l'accueil n'est pas gratuite

Quatre rouges récurrents des portails, tous démontés par une sonde. Cinq règles.

- **UNE PAGE RESTÉE SUR L'ACCUEIL COÛTE UN CŒUR ET PLUS.** L'accueil rend le
  monde derrière lui : deux pages ouvertes et oubliées occupent 2,4 à 3,7 cœurs
  sur quatre (`sonde-voisines.cjs`, /proc/stat), et le gel CDP
  (`Page.setWebLifecycleState`) n'y change RIEN — seule la fermeture. Un
  témoin qui mesure une préparation, un débit ou une durée se joue quand il
  est seul (`maj.js` « vraiment là » : 4 s seul, 39–44 s à côté de deux
  voisines), et une page dont le verdict est rendu se ferme.
- **`locator.click` ATTEND DEUX IMAGES IDENTIQUES.** À 0,07 image par seconde
  (l'accueil de Manhattan en rendu logiciel), cela fait 24 s au repos et plus
  de 30 sous charge : le témoin mesurait la cadence, pas le bouton. Sur une
  page qui rend mal, on appuie par le document, après avoir vérifié ce que
  l'enfant voit (actif, visible, à découvert par `elementFromPoint`) — et ce
  qui s'ouvre entre deux (un second écran d'identité) se ferme avant de juger.
- **UNE PAGE QUE LA SUITE GARDE OUVERTE JOUE SA JOURNÉE.** La cascade
  « pas aux commandes » de `monte.js` tombait à 45,8 minutes de la suite :
  l'arrêt quotidien de 45 minutes (invariant 2) sur `tab`. Le jeu se met en
  pause, et tout témoin suivant mesure une partie arrêtée. `jouerSeul` pose
  des déblocages du jour (`unlocks`), comme le code parental — la donnée qui
  gouverne, jamais la règle (`sonde-limite-du-jour.cjs`). Devant une cascade
  qui va et vient avec la DURÉE d'une suite, on additionne les durées des
  témoins jusqu'au premier rouge avant toute autre hypothèse.
- **UNE JOURNÉE SE RANGE SOUS LA DATE LOCALE.** Le répit de quiz du banc ne
  valait que pour la journée du lancement : un portail qui passe minuit (20 h
  à New York) retrouvait un quiz quinze minutes plus tard, en pleine suite.
  `jouerSeul` rouvre le répit de la journée COURANTE (`sonde-quiz-minuit.cjs`).
- **UNE VOITURE DE CONVOI À L'ARRÊT SE GARE OÙ ELLE VEUT.** Au coin de son
  anneau, en biais : une pose écrite « un bloc derrière, trois de côté » pour
  une voiture droite la manque. Le témoin attend que le crochet la rende, puis
  se pose dans le repère de SA boîte.

## L'invité de New York (v412) — deux pages du banc se partagent un processeur, deux tablettes jamais

Une règle. Un témoin à deux tablettes dont l'une rend une scène lourde
(Manhattan, 0,4 image par seconde en logiciel) ouvre la page de l'AUTRE
d'abord : ouverte pendant ce rendu, elle met 44 s à plus de 90 s à démarrer,
sans erreur (13–18 s sinon). Le « TimeoutError de la ligne 674 », déclaré
intermittence pendant trente versions, rendait 2 sur 2 rejoué seul : une
« intermittence sous la charge » se REJOUE SEULE avant d'être crue, et si
elle tombe à chaque fois, c'est une cause, pas un tirage.

## Le passager sans courtier (v410) — on se reconnaît à TOUTES ses identités

Une règle. Une tablette a deux identités possibles : `peer.id` (le courtier)
et `bus.monId` (le nuage), et elles DIFFÈRENT pour un invité. Les autres la
nomment par la clé de leur lien — celle du bus quand la partie passe par le
nuage. Tout test « est-ce moi ? » passe par `net.estMoi(id)`, jamais par
`peer.id` seul : le conducteur sans courtier ne reconnaissait pas son propre
nom dans la position du passager (`p.de`) et le voyait debout, 2/2 mesuré
(`sonde-passager-nuage.cjs`) ; corrigé, 3/3 assis en moins de 50 ms. La même
lecture sert la portière (`portiere.de`) et `rpos`.

## Le GPS d'un invité traverse l'hôte (v406) — un champ de position a un témoin par chemin

Une règle. La v388 a écrit « un champ de position se lit sur les deux chemins
de la position » et n'en éprouvait qu'un (le direct). Le relayé (`rpos`) a
désormais son témoin à trois tablettes dans `reseau.js` (Nina → hôte → Alice),
vérifié rouge sur une copie où `rpos` ne lit pas `g`. **Un champ ajouté à
`pos` reçoit deux témoins, ou il n'en a qu'un demi.** Et une proposition
expire à vingt secondes : une sonde qui lit l'hôte après trente secondes
d'attente sur l'autre page le trouve vide — ce n'est pas un défaut, c'est
l'horloge de la proposition.

## Le GPS se partage (v388) — un état voyage avec la position, pas dans un message neuf

La dette de la v321. Trois règles.

- **CE QUI EST UN ÉTAT VOYAGE AVEC LA POSITION.** La consigne proposait un
  message `gps_de` relayé comme `ciel`. La leçon de la v374 décide autrement :
  un ancien hôte ne relaie pas un message qu'il ne connaît pas, mais il relaie
  la position telle quelle (`{ ...msg }`). La destination n'est pas un
  événement, c'est un ÉTAT (« je vais à Rome ») : elle part dans la position
  (`g` = [x, z, nom, clé], net.js), qu'un ami arrivé en cours de route reçoit
  aussi, et qu'une tablette restée en arrière ignore (le receveur cède). La
  CLÉ nomme le trajet : la proposition n'apparaît qu'une fois par trajet, même
  si la position repasse huit fois par seconde.
- **UN CHAMP DE POSITION SE LIT SUR LES DEUX CHEMINS DE LA POSITION.** Le
  direct (`pos`) et le relayé (`rpos`). La v374 avait accroché l'histoire des
  chocs (`rc`) à la position pour traverser un ancien hôte — et ne la lisait
  que sur `pos` : entre deux invités, précisément le chemin d'un ancien hôte,
  elle tombait. Corrigé avec `g`. Quand on ajoute un champ à `pos`, on cherche
  `case 'rpos'` le jour même.
- **UNE PROPOSITION, JAMAIS UN ORDRE.** Règle de la v306 : un geste qui change
  le trajet pose la question. Le bandeau « Marlon va à Rome — y aller aussi ? »
  ne touche pas un GPS en cours ; il s'efface seul (vingt secondes en temps
  réel), quand l'ami arrête son GPS ou s'en va, et ne s'affiche pas si l'on va
  déjà là ou qu'on y est. Il vit au centre, sous le GPS — rien dans le quart
  bas-gauche (v272) — et la première capture l'a montré coincé entre les
  colonnes de boutons : sa largeur se borne aux colonnes, pas à l'écran.

## « Seul » ne veut pas dire « seulement lui » (v383) — la rue n'entre plus chez un ami

La dette de la v305 : une voiture de la rue entrait encore une fois dans
celle d'un ami. Trois règles.

- **TROIS PISTES DÉCLARÉES, ET LA CAUSE ÉTAIT UNE QUATRIÈME.** Le cap de
  l'ami lu sur son regard, sa position réseau en retard, une voiture de
  travers au carrefour : `sonde-intrus-ami.cjs` relève chez Alice, image par
  image, chaque voiture qui touche le rectangle de Marlon et ce que
  `cederLePassage` en pensait (`window.__vehicules.diagCeder()`). Écart
  réseau 0 à 0,17 bloc, cap posé identique : les deux premières tombent. Les
  cinq intruses avaient l'ami ET une voiture de la rue dans leur `veut`.
  Une liste de pistes écrite dans une dette n'est pas la liste des causes :
  la sonde publie l'état de la DÉCISION, pas seulement la géométrie.
- **UNE EXCEPTION ÉCRITE « QUAND IL EST SEUL » SE RELIT AU CAS OÙ IL NE
  L'EST PAS.** La règle de la v245 (« devant l'enfant, on attend sans
  limite ») était codée `every(k < 0)` : vraie seulement si TOUTES les gênes
  sont des joueurs. Un carrefour en plus, et la patience de quatre secondes
  revenait, puis `repart` lançait la voiture deux secondes à l'aveugle — au
  travers de l'ami, et de l'enfant de la tablette aussi. Désormais `some` : un
  joueur ou un train sur le chemin, on attend, et un `repart` déjà lancé
  s'arrête net. La patience ne dénoue plus que deux voitures de la rue.
- **UNE SITUATION RARE NE SE PROVOQUE PAS TOUJOURS — ALORS ON COMPTE.** J'ai
  essayé de poser Marlon AU carrefour de deux convois pour forcer le cas
  (v233) : zéro à trois voitures à moins de douze blocs en quarante secondes,
  la rue de Paris est trop clairsemée sur ce banc — non-résultat, la sonde
  n'est pas gardée. La preuve est donc un compte, même protocole des deux
  côtés : ancien code 5 entrées sur 11 poses, neuf 0 sur 10. Le témoin de
  `reseau.js` fait entrer `dedans` dans son verdict ; sur l'ancien code il ne
  rougit qu'une pose sur une dizaine, et c'est dit.
- **UN TÉMOIN VERT GRÂCE À LA PANNE ROUGIT LE JOUR OÙ ON LA CORRIGE.**
  « Quand la monoplace arrive, on a le temps de voir le bouton » posait
  l'enfant SUR la piste : la monoplace s'arrêtait à 9,3 blocs (le bouton est
  à 9), puis repartait au bout de quatre secondes AU TRAVERS de lui — et le
  bouton s'allumait (ancien code : 5,4 s, `sonde-monoplace-bord.cjs`). Son
  commentaire disait « planté au bord du circuit » : il est posé au bord,
  trois blocs et demi de côté (0,3 s). Ce qu'il faut retenir : devant un rouge
  qui suit une correction, on se demande d'abord si le témoin ne MESURAIT pas
  le défaut corrigé — les secondes du message (5,4 ≈ 4 de patience plus la
  route) le disaient.

## Un battement qui écrit sans relire défait le choix d'à côté (v374)

« Un choix fait sur une tablette part au serveur » (`reglages.js`) était
déclaré rouge de charge. La sonde qui relève chaque écriture des deux
tablettes (`sonde-reglages-deux.cjs`) l'a démenti SANS charge : le choix
part (« en », 39,3 s), puis l'autre tablette écrit « fr » sous une date plus
ancienne (43,1 s). Deux règles.

- **UN DOCUMENT À DEUX AUTEURS N'A QU'UN CHEMIN D'ÉCRITURE : CELUI QUI
  RELIT.** Le jeu l'avait écrit (« on relit avant d'écrire ») pour la
  boucle de quinze secondes ; le battement de présence de vingt secondes,
  trois lignes plus bas, écrivait encore le document entier sans relire. Il
  passe par `envoyerPrefs`. Le verre dans les murs, une fois de plus, à
  l'échelle de deux minuteurs voisins.
- **UN ROUGE DÉCLARÉ « DE CHARGE » SE DÉMONTE AVANT D'ÊTRE CRU.** La double
  mesure de la v195 (69 verts seule des deux côtés) disait « pas la
  livraison » ; elle ne disait pas « pas le jeu ». La course existait en
  production depuis toujours, et la charge ne faisait que la rendre
  fréquente. Le témoin la PROVOQUE désormais : il repère le battement de
  l'autre tablette (une écriture sans lecture depuis la précédente) et
  clique juste avant le suivant, puis observe le serveur toute la fenêtre.

## La conduite à la GTA (v358) — un modèle pur, une boîte orientée, des chocs qui se publient

Max : « une grosse refonte de la façon de conduire… comme GTA ». Premier palier
de la session `conduite-physique` (six sessions en parallèle sur la conduite).
Six règles.

- **LA DYNAMIQUE VIT DANS UN MODULE PUR, ET LE JOUEUR NE FAIT QUE L'APPLIQUER.**
  `conduite.js` (sans three ni document) : le pas de dynamique
  (`pasVoiture`), le choc (`reponseChoc`), les cases sous une boîte orientée
  (`casesSousBoite`), le point d'impact. `player.js` l'appelle, `plafond.js`
  le vérifie sous node — la simulation au pas du jeu y doit rejoindre la
  formule fermée du 0 → 100 (`tempsJusqua`), sinon les deux copies d'une même
  dynamique ont divergé.
- **`player.yaw` EST LE CORPS, `derive` EST L'ÉCART DE LA VITESSE.** La
  vitesse va dans la direction `yaw + derive` ; la dérive (bornée à
  `DERIVE_MAX`) naît d'un virage pris plus vite que l'adhérence et se
  rattrape seule (`DERIVE_TAU`). Une session qui la dessine ne la rajoute
  pas au cap : la caisse tourne déjà avec `yaw`.
- **LE CONTRAT AVEC LES DÉGÂTS SE TIENT PAR DEUX DRAPEAUX, POSÉS PAR LA
  PHYSIQUE.** Les dégâts (v343) devinent un choc aux chutes de vitesse tant
  que `player.choc` est `undefined`, et appliquent eux-mêmes leurs effets
  (allure, biais de cap) tant que `player.physiqueLitEtat` est faux. Le
  joueur naît donc avec `choc = null` (pas encore de choc, mais une physique
  qui les publie : un frein franc n'est pas un choc) et `physiqueLitEtat =
  true` ; `direction` se lit comme les dégâts la publient — un biais de CAP en
  rad/s à pleine vitesse, pas un angle de roues —, et le moteur abîmé garde
  leur facteur 0,35 + 0,65 × moteur. Un témoin qui pose `etatVoiture` à la
  main doit le FIGER : les dégâts le réécrivent à chaque image.
- **UNE VOITURE BONDIT AU DÉPART.** La courbe a0 · (1 − (v/vmax)²) seule
  démarrait mou : au banc, même nombre d'images des deux côtés, l'ancienne
  voiture (toute son allure en une demi-seconde) faisait 6 blocs et la
  nouvelle 1,75. `accelVoiture` ajoute un coup de départ (`LANCER`, éteint à
  dix blocs/s) — 7,5 à 9,8 blocs dans la première seconde selon la classe —
  et `tempsJusqua` intègre la MÊME fonction : une seule formule, deux
  lecteurs.
- **LA CLASSE SE RETROUVE À SA POINTE.** `fun.js` ne passe que `boost`
  (l'allure, multiple de la marche) ; `ALLURES` se déduit des fiches de
  `conduite.js`, et `ficheDeVitesse` retrouve la classe par sa pointe, unique
  par classe. Une propriété de classe s'ajoute dans la fiche, jamais dans
  `fun.js`.
- **LE PLAFOND SE MESURE EN TEMPS RÉEL, PAS AU PAS DU JOUEUR.** La première
  sonde laissait le joueur avancer : le banc rendant dix images par seconde et
  `dt` étant borné à un vingtième, la position avançait au ralenti (77 blocs
  en dix secondes « à 36 ») et la mesure disait la cadence du banc. La sonde
  (`sonde-plafond-voiture.cjs`) avance la position EN TEMPS RÉEL à chaque
  image. Trou devant soi à rr=12 : 182 · 161 · 151 · 125 blocs en campagne,
  160 · 151 · 136 · 125 à Paris, pour 30 · 40 · 50 · 60 blocs/s.
  `PLAFOND_SOL` se lit dans `plafond-sol.js` (v346, la session du monde à la
  vitesse : 60 en ville, 70 en campagne — la même valeur, mesurée à part) ;
  l'hypercar à 55. Le plafond de la v260 (28, calculé
  avant le worker de la v251) est mort. La tablette reste à mesurer.
- **UNE MARCHE N'EST PAS UN MUR AU BOUT DU CAPOT.** La boîte fait désormais
  4,4 × 2,26 et tourne avec la voiture ; mais sur la surface continue une
  pente d'un bloc par bloc met le relief à deux blocs au-dessus du centre sous
  le nez. Ce qui ne dépasse pas d'UN bloc la cote de la voiture ne compte
  donc que sous le carré central (la largeur, comme la v297 l'avait réglé) ;
  au-delà, seul ce qui dépasse une marche est un mur. Et l'on franchit aussi
  juste après une crête : plus rapide, la voiture décolle des bosses.
- **UN CHOC SE PUBLIE, ET « PAS SI L'ON EST DÉJÀ DEDANS » VAUT POUR LES
  BLOCS.** `player.choc = { force, t, x, z }` (force 0 à 1, un mur de face à
  72 km/h vaut 1 ; x, z le milieu de la face qui touche), sous cinq pour cent
  rien ne se publie. **Un choc est un événement, pas un état** : il
  s'efface quand on monte et quand on descend, sinon les dégâts le rejouent
  sur la voiture suivante (mesuré : une voiture neuve à santé 0,7, le cap
  qui tourne seul). Devant un piéton on FREINE à la distance d'arrêt
  (douze blocs au plus), on ne l'attend pas au contact. Une pose n'est refusée que si elle touche une case pleine
  que la pose d'avant ne touchait pas : une voiture invoquée contre un mur
  s'en dégage. Le crochet de main.js rend la FAMILLE : voiture et mobilier
  rebondissent, piéton et eau arrêtent net — personne n'est jamais touché.
  Une voiture de la rue ne se pousse pas (horloge partagée, v305) : c'est
  elle qui attend (`cederLePassage`, v245).

## La normale de ce qu'on touche (v397) — conduite, palier 2

Le palier 1 prenait la normale du MOUVEMENT contre une voiture de la rue et
celle d'un AXE DU MONDE contre un mur. Cinq règles.

- **UN MUR DE CUBES EN BIAIS SE LIT PAR LA DROITE DE SES FACES.** Sur une
  façade oblique, l'axe libre change à chaque marche de l'escalier : la
  voiture s'y arrêtait (seize façades de Paris, 1,4 bloc après contact).
  `normaleDeMur` (conduite.js) ajuste une droite sur les MILIEUX des faces
  exposées tournées vers la voiture, à `RAYON_MUR` (4,5) du contact — mesuré :
  1,4° d'erreur moyenne, 7,8 au pire, contre 3,6 et 15 avec les centres des
  cases sur 2,6 blocs. Les centres pondérés par la distance sont un
  non-résultat mesuré (pire). L'essai axe par axe ne reste qu'en repli
  (moins de trois faces).
- **LONGER UNE NORMALE LUE À DEUX DEGRÉS PRÈS, C'EST BUTER SUR UN COIN DE
  MARCHE.** Une vitesse qui ne rentre pas dans la normale lue mais bute quand
  même glisse aussi ; `glisserLeLong` prend le pas tangent, puis se décolle
  d'un cheveu (0,12 à 0,5 bloc) le long de la normale, et remet la caisse
  dans l'axe — seule une pose LIBRE est prise. Sans cela, `reponseChoc` rendait
  « pas de choc » (vitesse tangente), le pas bloqué se rejouait trente-deux
  fois et le filet de la v272 ramenait la vitesse à zéro.
- **CONTRE UNE VOITURE, LA NORMALE DE SON RECTANGLE ET LA VITESSE RELATIVE.**
  `voitureContre` (vehicules.js, lecture seule de la collecte de
  `cederLePassage`, branchée par main.js) rend sa boîte et son allure ;
  `chocContreVoiture` prend l'axe de moindre enfoncement des deux rectangles
  et juge `reponseChoc` dans le repère de l'autre. Sous `CONTACT_DOUX` (trois
  blocs/s relatifs) c'est un contact, pas un choc — collé derrière une voiture
  plus lente, on la touche à chaque image. Et la rue juge avec SES cotes (2,26
  de large) quand le joueur porte celles de sa fiche (2,2) : au bord, la rue
  dit « touché » avant que nos boîtes ne se recouvrent — on relit avec une
  boîte grossie de `MARGE_CONTACT`, sinon le choc retombait sur le mouvement.
- **UN TÉMOIN NE RATTRAPE PAS UNE VOITURE DE LA RUE AU BANC.** La rue avance
  en temps RÉEL (v305), la nôtre en temps de jeu : à deux images par seconde,
  dix fois moins vite (`sonde-vraie-rue.cjs`). La vitesse relative se garde
  sous node ; le témoin de `monte.js` pose une voiture GARÉE (`vitesse: 0`)
  et éprouve le crochet. **Et un témoin qui se téléporte à côté d'une voiture
  de la rue attend une image avant de rouler** : la collecte ne la connaît
  qu'à l'image suivante, et la nôtre entrait sans la voir — « déjà dedans »
  ensuite, donc traversée.
- **LE VOLANT VOYAGE DANS `p.v`** (`b` braquage, `r` dérive, absents quand
  nuls) ; le receveur les pose sur `userData.braquage` et `.derive` de sa
  copie. Personne ne les DESSINE encore (session des sensations), et c'est
  déclaré. Le joueur, lui, publie `player.roueLibre` ({ depuis, s }) et
  `player.contact` ({ famille, nx, nz }) ; `?diag=1` au volant les affiche
  avec le monde maillé devant la voiture (`mondeDevant`, `ligneDiagConduite`).

## Le frein à main (v409) — conduite, palier C

Le dérapage contrôlé à la GTA. Quatre règles.

- **UN GESTE DE PLUS SE CHERCHE DANS CE QUE LE JOYSTICK LAISSE LIBRE.** Le
  quart bas-gauche est TOUT entier au joystick (v272) ; en voiture, la place du
  saut (colonne de droite, au-dessus de « Descendre ») est vide. Le bouton 🛑
  s'y pose et TIENT la barre d'espace (`bindHoldButton`, comme ⤒ à pied) : une
  seule commande, deux gestes, et `player.js` n'a qu'une source à lire.
- **UNE TOUCHE QU'ON REPREND SE CHERCHE DANS CE QU'ELLE FAISAIT DÉJÀ.** Au
  volant, Espace faisait sauter la voiture d'un tiers de bloc (le saut de la
  marche, resté branché ; mesuré sur la v408, 0,29). Le saut est coupé au
  volant, et le témoin du joueur le garde.
- **UNE BORNE QU'ON ÉLARGIT SE REND PEU À PEU.** Au frein à main la dérive va
  jusqu'à `DERIVE_MAX_MAIN` (≈ 55°) ; au lâcher, la borne n'est pas
  `DERIVE_MAX` d'un coup — l'excès passerait au cap en UNE image, la caisse
  sauterait de 35° — mais `max(DERIVE_MAX, |dérive| − REPRISE·dt)`. Sans frein
  à main, cette borne vaut exactement l'ancienne.
- **UN AJOUT À LA DYNAMIQUE SE PROUVE AUSSI PAR CE QU'IL NE CHANGE PAS.**
  240 000 pas de `pasVoiture` tirés au hasard (classes, gaz, volant, pente,
  moteur, panne, plafond de suivi), sans frein à main, rendent la v408 à
  l'identique (sonde dans le brouillon, deux arbres). Le moteur ne pousse pas
  pendant le frein à main : un drift « gaz + frein » demanderait un second
  doigt sur l'accélérateur, que le joystick n'a pas — décidé, déclaré.

## La force d'un choc suit la vitesse (v424) — conduite, la dette des dégâts

La force publiée (`player.choc.force`) saturait à 1 dès 20 blocs/s normaux
(`CHOC_PLEIN`) : un mur à 55 coûtait autant qu'à 20, un frôlement à 15° pleins
gaz publiait 0,68. Trois règles.

- **LE CHOC PLEIN SE LIT À LA POINTE DE SA CLASSE.** `reponseChoc` et
  `chocContreVoiture` prennent `vPleine` ; le joueur passe
  `vitessePleine(fiche)` = `POINTE_PLEINE` (0,85) × la pointe — la vitesse
  qu'on a après quatre ou cinq secondes de gaz. Un mur pleins gaz vaut donc 1
  comme avant, et les murs promis par degats.js (`CHOCS_AVANT_PANNE`,
  `CHOCS_AVANT_FEU`) ne bougent pas : rien n'a été recalibré là-bas. Sans
  `vPleine`, l'ancienne échelle (un appelant qui ne connaît pas la classe).
  Pourquoi pas un seuil plus bas : sin 15° × 0,95 / `POINTE_PLEINE` au carré
  doit rester sous un dixième de mur, ce qui exige au moins 0,78.
- **UN SEUIL QUI DISAIT « DOUX » EN FORCE SE DIT EN VITESSE.** `CONTACT_DOUX`
  valait 0,15 de force (trois blocs/s à l'ancienne échelle) ; la force
  dépendant de la classe, il est en blocs/s d'impact (`impact`, rendu par
  `reponseChoc`). Quand on change l'unité d'une grandeur, on cherche tout seuil
  écrit dans l'ancienne unité.
- **« PLEINE VITESSE » DANS UN TÉMOIN SE MESURE.** Le témoin des deux murs
  (`degats.js`) prenait trente-sept blocs d'élan : 0,58 de la pointe, ce qui
  saturait à 20 b/s et ne sature plus. La dalle s'étend, cent quarante blocs
  d'élan (0,89). Le vrai joueur sous node (`sonde-force-chocs.cjs`, appelée
  par `plafond.js`) garde la règle dans les six classes.

## La pente, la bosse et la file (v408) — conduite, palier 3

Mesuré sur `origin/main` par `tests/sonde-pente.cjs` (sous node, le vrai
joueur sur de vraies lignes de campagne trouvées par la sonde) : une sportive à
plein gaz faisait 26,4 blocs/s au bout de quarante blocs en côte, en descente
et sur le plat, et une crête la plaquait au sol. Après : 24,1 en côte, 28,6 en
descente, et une crête vive prise à 40 blocs/s fait voler environ une seconde.
Six règles.

- **UNE SEULE PESANTEUR LE LONG DE LA ROUTE, LA VRAIE (9,81).** Celle du jeu
  (26, le saut) rendrait une pente d'un bloc par bloc — la plus raide que la
  surface continue dessine — plus forte que le moteur d'une citadine : un
  enfant resterait au pied d'une colline. `gravitePente` entre dans
  `pasVoiture` (`entree.pente`) ; `vitesseEnCote` et `vitesseEnRoueLibre` sont
  ses formules fermées, et le témoin exige que la simulation les rejoigne. Une
  voiture arrêtée qu'on ne commande pas TIENT (`MAINTIEN`). En l'air, en
  revanche, la pesanteur reste celle du jeu, comme avant.
- **LA SURFACE CONTINUE EST UNE DENT DE SCIE, ET LA CAISSE LA LIT EN CINQ
  POINTS.** Elle passe par le centre de colonnes de relief entier : une pente
  de 0,37 est faite de facettes à 0 et à 1. Un point-masse qui la suivait
  décollait de chaque dent (premier jet : 1,1 à 3,2 s « en l'air » sur six
  côtes droites). `sousLaCaisse` lit la surface de −2 à +2 blocs le long de la
  caisse : la moyenne est le sol de la voiture, la droite des moindres carrés
  sa pente. La caisse ne s'enfonce pas de plus d'`ENFONCE` sous la surface au
  centre.
- **LA SURFACE POUSSE LA CAISSE D'UN COUP, MAIS NE LA TIRE QU'À LA
  PESANTEUR.** Au sol, la vitesse verticale vaut `max(ce que la surface exige,
  ce que la pesanteur laisse)`. Au sommet d'une crête, l'écart s'accumule
  d'image en image ; passé le `DEBATTEMENT` on vole. C'est une HAUTEUR, pas un
  seuil d'image : mon deuxième jet recollait la vitesse à la surface à chaque
  image, et sur une crête vive l'écart repartait de zéro — la voiture ne
  décollait JAMAIS, à aucune cadence. Une règle qui doit s'accumuler ne se
  remet pas à zéro à chaque image.
- **LE VOXEL DÉCIDE OÙ IL DÉCIDAIT, ET UNE GARDE SE FORMULE SUR L'ÉVÉNEMENT,
  PAS SUR UNE MESURE VOISINE.** Ma première garde lisait `niveauVoxel`, qui
  compte aussi la cote des colonnes COUVERTES : au sommet d'une crête la
  colonne voisine dépasse le centre, la garde rendait la main au chemin
  d'avant avec l'élan de la pente, et la caisse montait de sept blocs sans
  être « en l'air ». La garde est l'événement lui-même : une marche franchie
  dans l'image (`_franchi`), un cube sous les roues (`onGround`), pas de
  surface (ville). Là, l'élan vertical ne survit pas.
- **CE QUE LA PHYSIQUE PUBLIE, LES AUTRES LE LISENT SI PRÉSENT.**
  `player.tangage` (rad, nez en haut), `player.enLair`, `player.pente`, et à
  chaque retour au sol `player.atterrissage = { force, t, air, hauteur }` —
  un ÉVÉNEMENT comme `choc`, effacé à la montée et à la descente, publié
  seulement s'il s'est vu (plus haut que le débattement) ou senti. Personne
  ne le dessine encore (`conduite-sensations`). Le contrat des dégâts ne
  change pas : un atterrissage n'est pas un choc.
- **DERRIÈRE UNE VOITURE PLUS LENTE, ON LA SUIT.** Elle ne se pousse pas
  (v305) ; on la touchait à chaque image. `suiviDevant` pose notre rectangle
  devant le pare-chocs par le crochet en lecture seule `voitureContre`, sur la
  distance où l'on peut avoir à freiner, et la vitesse permise
  (`vitesseDeSuivi`) est celle qu'on peut encore perdre au freinage de confort
  avant `ECART_SUIVI` — jusqu'au frein franc si on l'a vue tard
  (`freinDeSuivi`). Mesuré sous node, collé derrière à un bloc/s de plus
  qu'elle : 139, 7 et 133 contacts (voiture arrêtée, à 6 et à 12 blocs/s) →
  zéro. Braquer pour la doubler lève le suivi : on ne regarde que dans son
  axe. **ET L'ON NE SUIT QUE CE QU'ON RATTRAPE DOUCEMENT** (`SUIVI_DELTA`,
  4 blocs/s) : mon premier jet freinait aussi devant une voiture qu'on
  voulait percuter, et le portail a rendu rouges trois témoins des dégâts et
  de la rue (percuter une voiture de la rue l'abîme, elle s'arrête en
  feux de détresse, son flanc frôlé nous laisse passer). Foncer dessus reste
  un choc ; le témoin l'exige aussi.

Et un **non-résultat** : lire la façade sur six blocs au lieu de 4,5 bat la
droite des faces sur un mur synthétique (pire 9,8 → 7,1°) et ne la bat pas sur
les seize vraies façades de Paris (`sonde-mur-oblique.cjs` : trajet médian
après contact 10,4 → 7,5 à 10°, 14,3 → 16,8 à 25°). La coque convexe des faces
est pire partout (pire 12° puis 168°). `RAYON_MUR` reste à 4,5.

## Les monuments à la hauteur de leur ville (v335) — une table de paliers, deux lecteurs

Un étage fait trois blocs depuis la v301 ; les monuments n'avaient pas suivi.
Six règles.

- **DEUX CONSIGNES QUI SE CONTREDISENT SE TRANCHENT PAR CE QUE L'ENFANT
  RECONNAÎT, ET CELA SE VOIT EN CAPTURE.** La consigne disait « la vraie
  hauteur, à un bloc pour un mètre » ET « la tour Eiffel reste à soixante-dix ».
  Le premier jet a suivi la première : les Invalides à 107, Notre-Dame à 96, le
  Sacré-Cœur à 83 passaient tous AU-DESSUS de la tour Eiffel, en aiguilles —
  un bloc vaut vingt et un mètres au sol de Paris et un mètre en hauteur. Le
  témoin était vert ; c'est la capture aérienne qui l'a démenti. La règle
  (`blocsDuCiel`) garde les deux points fixes — un bloc pour un mètre jusqu'à la
  corniche des immeubles, la tour Eiffel à soixante-neuf — et l'ORDRE du vrai
  ciel entre les deux. Une consigne de nombre se juge à ce qu'elle produit, pas
  à sa lettre.

- **ON N'ÉCRIT PAS DEUX FOIS UN MONUMENT : ON L'ÉTIRE PAR UNE TABLE.** Le
  bâtisseur du voxel et le modèle en relief gardent leurs cotes d'auteur ;
  `echelle-monuments.js` publie, par monument (`Ville|Nom`), des PALIERS — des
  couples (couche d'auteur, couche du monde) — et une seule fonction,
  `hauteurEtiree`, que le voxel (`etirerBatisseur`, couches répétées) et le
  modèle (`etirerFaces`, sommets étirés) lisent tous deux. L'emprise ne bouge
  jamais : aucune rue, aucun circuit n'est touché. Sous le premier palier rien
  ne s'étire — la porte garde la taille d'un enfant — et une coupole s'étire
  par son PIED, qui devient un tambour ; étirée d'un bloc, elle devient un obus.
- **LE MONDE D'AVANT GARDE SES MONUMENTS D'AVANT.** `CONF_AVANT` et `CONF_V308`
  lisent `LANDMARKS_V317`, la liste non étirée : ils sont figés (v306, v309),
  et un bloc posé avant se juge sur le monde où il a été posé. Le prix se
  déclare : une cabane sur un ancien toit de monument se retrouve DANS la
  maçonnerie étirée (dette dans `TASKS.md`, avec sa marche toute trouvée).
- **UN BLOC D'ÉCART TOLÉRÉ DEVIENT VISIBLE QUAND ON ÉTIRE.** Le modèle et le
  voxel s'accordaient à un bloc près — la tolérance de la sonde. Étiré quatre
  fois, l'écart en vaut quatre et la couche d'auteur sort du modèle en cubes :
  Notre-Dame 34 → 295 cubes qui dépassent, l'Opéra 9 → 237. On RECALE le modèle
  sur les couches du voxel (la sonde par couche dit lesquelles), on ne relâche
  pas la tolérance. Et la couverture se mesure sur le modèle ÉTIRÉ : la lire
  aux cotes d'auteur puis l'étirer rend zéro cube et 119 à 293 murs invisibles
  — non-résultat mesuré, on garde la règle de la v292 (le cube plutôt que le mur).
- **UNE CLÉ DE MONUMENT PORTE SA VILLE.** « Panthéon » est à Paris et à Rome,
  « L'hôtel de ville » trois fois : la ville d'un repère est le disque qui le
  contient (`villeDuRepere`, world.js), la même lecture que le témoin.
- **LE TÉMOIN BOUCLE SUR TOUTES LES VILLES ET N'ADMET QUE CE QUI EST DÉCLARÉ.**
  `plafond.js` mesure chaque monument contre la médiane des immeubles autour ;
  `BAS_DECLARES` nomme les exceptions, chacune avec sa raison — `vrai` (un pont,
  une place, une statue : bas dans la vraie ville aussi) ou `lot` (une dette à
  rayer). Un monument qu'on remet à l'échelle sort de la liste dans la même
  livraison, et une exception qui ne nomme plus aucun monument mesuré rougit.

## Les falaises et les berges (v326) — sous le gazon, c'est encore le monde qu'on voit

Le point (c) du kit « monde fidèle », sur toute la carte. Trois règles.

- **LÀ OÙ LE SOL CONTINU S'ARRÊTE, LE REMPLISSAGE DU MONDE EST UNE PAROI.**
  C'est la leçon des quais (v316, v317) sortie des villes : le sol continu
  laisse le voxel à toute cellule de deux blocs ou plus (`MARCHE_MAX`), et ce
  voxel montrait trois blocs de terre sous l'herbe — 2 863 faces de terre et
  1 164 d'herbe sur les falaises de 500 morceaux, 1 130 de terre sur les
  berges (`sonde-falaises.cjs`). `matiereDuBord` (world.js, pure) lit la
  cote des quatre voisines et la DÉNIVELÉE VUE (l'eau compte à sa surface) :
  roche sous le gazon dès deux blocs (`FALAISE_ROCHE`), crête de roche dès
  quatre (`FALAISE_CRETE`), et au bord de l'eau ouverte sable au ras, gravier
  dessous, sommet de sable pour une rive basse. Seulement une colonne de
  campagne herbe-sur-terre : ni ville, ni désert, ni banquise, ni Mars, ni
  volcan. Drapeau `falaises` de `CONF_NEUF` seule, comme `mursDeQuai`.
- **ON CHANGE LA MATIÈRE, JAMAIS LA FORME — ET UN TÉMOIN LE PROUVE PAR LE
  MONDE SANS LA RÈGLE.** Les deux empreintes de `plafond.js` disent que
  `terrainHeight` n'a pas bougé ; elles ne disent rien d'un bloc creusé ou
  comblé. Le troisième témoin engendre les mêmes morceaux avec
  `falaises: false` et compare la SOLIDITÉ bloc pour bloc (0 de différence,
  691 blocs de matière). Les grottes se creusent dans la pierre
  (`id === STONE`) : un flanc devenu roche pourrait les ouvrir dans la
  falaise. Mesuré sur 1 600 morceaux, cela n'arrive pas (elles passent à huit
  à vingt-six blocs, sous le flanc), mais on creuse quand même sur ce que le
  monde avait AVANT la règle (`roc`) : une garantie par construction vaut
  mieux qu'un hasard de géographie, et le témoin la garde.
- **CE QUI RESTE, DÉCLARÉ** : la marche elle-même (une falaise reste un
  escalier de cubes de roche — l'adoucir, c'est bouger le relief, décision de
  Max) ; une berge de trois blocs garde sa couronne d'herbe. *(Le paysage
  lointain et les arbres ont reçu la règle en v340.)*

## La toundra et la taïga (v345) — une couleur de sommet est LINÉAIRE

La deuxième tranche du point (d). Quatre règles.

- **UNE ZONE DE CLIMAT EST UNE TABLE DE FAITS, ET L'ORDRE EST UNE PRIORITÉ.**
  `CLIMATS` (terre.js) porte la toundra (limite réelle des arbres, Islande,
  Tibet) et la taïga, après `DESERTS` ; `climatReel(lat, lon)` rend la
  première zone qui contient le point. `World.climat` lit `cielDe` et le même
  bord qui tremble que `aride` (qui n'en est plus qu'un cas). Les sites du
  témoin tempéré de la v341 (Kansas, Iowa, Pampa, Ukraine à 49° N) restent
  hors de toute zone — c'est vérifié par ce témoin, qui compte zéro bloc
  différent.
- **UNE QUESTION PAR MORCEAU, PAS PAR COLONNE.** `climatDuMorceau` rend le
  climat d'un morceau entier quand tout bord est à plus de 0,8° (le
  tremblement fait 0,6°, un morceau 0,13° au pire), et `undefined` sinon ;
  92 % des morceaux sont certains. Le générateur et le mailleur
  (`teintesDuMorceau`) n'interrogent colonne par colonne que les autres. Un
  témoin vérifie qu'un morceau certain l'est pour chacune de ses colonnes —
  un raccourci de ce genre se trompe en silence au bord des zones.
- **LA TEINTE CHANGE LA COULEUR, PAS LA MATIÈRE.** L'herbe de la toundra et
  de la taïga reste le bloc d'herbe — que les falaises, `treeAt`, le sol
  continu et les bêtes savent lire — et le mailleur multiplie la couleur de
  sommet de son dessus (et des feuilles) par la teinte du climat, une clé de
  fusion par teinte. Ce qui change de MATIÈRE se dit comme en v341 : la roche
  nue et la neige de la toundra (`solDeToundra`, neige dès `NEIGE_TOUNDRA`
  au lieu de 58), et les arbres (taïga dense de pins, toundra presque nue).
  Un témoin compare la forme bloc pour bloc au monde sans la règle.
- **UNE COULEUR DE SOMMET EST LINÉAIRE.** three décode la tuile sRGB et
  multiplie par la couleur de sommet en espace linéaire : mon premier jet
  posait les facteurs réglés à l'œil (0,62 sur le rouge), la taïga restait
  vert vif en capture alors qu'une sonde dans la page comptait 201 516
  sommets teints sur 300 816. Le mailleur prend le facteur à la puissance
  2,2 (`TEINTE_HERBE_LIN`) ; la carte et le paysage lointain, qui mêlent des
  couleurs de palette, gardent le facteur perçu. **Un témoin de couleur de
  tampon prouve que la teinte est posée, pas qu'elle se voit** : c'est la
  capture qui l'a dit.
- **UN ARBRE AJOUTÉ PEUT POUSSER DANS UNE MAISON.** La v340 ne faisait que
  retirer des arbres ; la taïga en ajoute. Un bloc posé avant
  `DATE_CLIMATS` (relue à la fusion, v309) marque son morceau et ses huit
  voisins (`morceauxAvantClimat`, tenu par `setBlock` et refait avec
  l'index des monuments) : leurs arbres restent ceux d'avant. Le désert,
  lui, garde sa règle partout.

**Les steppes (v347)** suivent la même table : herbe couleur de paille (une
teinte de plus, aucun bloc neuf) et un vingtième des arbres. Mesurer en
capture avant de régler : à un huitième, la steppe du Kazakhstan restait un
bocage — 42 arbres contre 326 au témoin, mais des bosquets partout à l'écran.
Les sites du témoin tempéré de la v341 restent hors des steppes (Hautes
Plaines à l'ouest du 100e méridien, steppe pontique au sud de 47° N).
Et `DATE_CLIMATS` SE RELIT à chaque tranche qui change des arbres : la
steppe en retire, donc ce qu'un enfant a bâti jusqu'à la fusion de la v347
garde les arbres d'avant.
**Les forêts tropicales (v351)** ferment les quatre climats : dix forêts
humides réelles, la forêt dense de grands feuillus et un palmier sur quatre
(`DENSITE_MAX` passe à 0,08, la seule densité au-dessus de la forêt
tempérée). Une teinte se juge en capture et pas seulement au témoin : le vert
réglé à (60, 160, 50) virait au fluo à l'écran, et le témoin le trouvait
très bien teint.
**Le climat méditerranéen (v469)** suit la même table, en dernier (les
déserts, la steppe d'Anatolie et le Karoo passent avant). Deux arbres neufs :
`kind` 4, pin parasol, et 5, olivier. **Une couronne neuve tient dans trois
blocs autour du tronc** : `generateChunk` ne balaie les arbres que trois
colonnes au-delà du morceau, et une couronne plus large serait coupée net au
bord. Et le feuillage gris-vert s'est jugé en capture : à (82, 110, 62) il
sortait presque noir, le témoin le trouvait très bien teint.
**La savane (v485)** ferme la table, après TOUT le reste : le Kalahari, le
Sahel, la Corne, les forêts humides du Congo et du Queensland et l'anneau
semi-aride de l'Australie passent avant, ce qui laisse aux sept contours
(soudanienne, Afrique de l'Est et australe, ouest de Madagascar, Cerrado,
Llanos, nord de l'Australie) des bords grossiers sans risque. Un arbre neuf,
`kind` 6, l'acacia : un fût fourchu et une ombrelle UNIQUE de trois blocs de
rayon — plus plate que le pin parasol, qui a deux étages — et un buisson
épineux sur cinq (l'olivier sur un tronc d'un bloc). Les sites du témoin
tempéré (Kansas, Iowa, Pampa, Ukraine) restent hors zone, vérifié sous node.

## Les déserts chauds (v341) — le climat est une donnée de géographie, comme la côte

Le point (d) du kit « monde fidèle », dans sa plus petite tranche utile. Trois
règles.

- **LE CLIMAT SE RELÈVE COMME LES CÔTES, EN POLYGONES DE FAITS.** `DESERTS`
  (terre.js) porte les contours des grands déserts chauds au degré, à côté de
  `CONTOURS` et `CHAINES`, avec la même boîte de rejet ; `desertReel(lat,
  lon)` est pure. Le monde demande `aride(x, z)` (world.js) : `cielDe`, et un
  bord qui tremble d'un demi-degré (fbm) — un désert au cordeau ferait
  maquette, comme une côte. Les steppes, la toundra et les tropiques humides
  sont d'autres tranches, et c'est déclaré.
- **UNE SEULE QUESTION, TROIS LECTEURS — et la matière seule change.** Le
  générateur pose sable sur sable (avant les falaises, qui ne regardent que
  l'herbe), `treeAt` refuse le désert, le paysage lointain
  (`blocDeSurface`) et la carte du monde (`couleur`) lisent `world.aride`.
  Drapeau `climat` de `CONF_NEUF` seule : `CONF_V308` et `CONF_AVANT` ne le
  portent pas, les marches de migration jugent sur le monde où un bloc a été
  posé (v306). Un témoin compare au monde SANS la règle : zéro bloc de forme
  différente, et zéro bloc différent hors des déserts.
- **UN SITE DE TÉMOIN SE CHOISIT LOIN DE TOUT CE QUI A SA PROPRE RÈGLE.** Mon
  premier site « tempéré » était la Beauce à 48,3° N : DANS le disque de Paris
  doublé (370 blocs), où le paysage lointain est gris de ville — 640 sommets
  verts sur 2 141. Le Kansas, loin de toute ville, rend 2 452. Un point écrit
  en latitude se vérifie contre les disques avant de servir de témoin.

## Les arbres au bord, et les falaises vues de loin (v340) — une règle de matière se dit à TOUT ce qui pose quelque chose dessus

La dette déclarée par la v326, remboursée. Trois règles.

- **UNE RÈGLE QUI CHANGE LA MATIÈRE D'UN SOL SE DIT À CE QUI POUSSE DESSUS.**
  La v326 avait fait de la crête d'une falaise une paroi de roche et du bord
  d'une berge basse une grève, et `treeAt` continuait de juger « de l'herbe »
  à la cote seule : 135 à 168 chênes sur la roche pour 12 800 arbres
  (`sonde-arbres-bord.cjs`, 4 000 morceaux). `solDeLArbre` (world.js) lit
  `matiereDuBord` sur la même colonne, APRÈS le tirage de densité (quatre
  cotes pour un arbre, rien pour la plaine), et un palmier refuse la roche
  mais garde sa grève. C'est la leçon du sol continu (« ce qui remplace un
  bloc le dit à TOUS ceux qui lisaient le bloc ») appliquée à une matière. Et
  un arbre ne flotte plus au-dessus d'un puits de grotte (trois sur douze
  mille) : `treeAt` refait le test d'entrée du générateur.
- **UN ARBRE N'EST PAS LE RELIEF.** Le témoin « même forme, bloc pour bloc »
  de la v326 compare le monde à celui SANS la règle ; un arbre retiré y
  comptait comme un bloc de forme différente. Il compare désormais le sol,
  troncs (chêne ET bouleau, `BIRCH` — mon premier témoin l'oubliait et
  comptait 247 bouleaux « ailleurs que sur l'herbe ») et feuilles à part. Et
  un second témoin garde ce qu'on ne veut pas perdre : tout arbre d'herbe du
  monde sans la règle est encore là, tronc pour tronc.
- **UNE RÈGLE QUI COÛTE QUATRE COTES PASSE APRÈS LE RELIEF, PAS DEDANS.** Le
  paysage lointain lit la même `matiereDuBord` sur la colonne de chaque
  sommet d'herbe de campagne (`couleurDuBord`, horizon.js, pure). Mesuré :
  +6 µs sur 3 par sommet — dans la boucle de remplissage, le paysage
  arrivait trois fois plus tard après une téléportation. Elle vit donc dans
  une seconde passe (`raffiner`), sur le budget qui reste et deux
  millisecondes au plus par image, et ne coûte plus rien une fois tout lu
  (`aRaffiner`). Le relief se remplit dans le même nombre d'images qu'avant
  (16-17 contre 16-17, quatre sites) ; la roche et le sable suivent en une
  soixantaine d'images. Un filtre lu sur la grille du paysage (huit blocs)
  aurait coûté moins, et il est mesuré : il interroge 17 % des sommets et
  n'attrape que 82 % de ceux que la règle touche — on ne le réessaie pas.
- **ET UNE PASSE DE FOND NE PREND RIEN À L'ACCUEIL.** `horizon.maj` tourne
  aussi pendant la préparation, et le témoin de `maj.js` « corps, programmes
  et fond de carte sont vraiment là » est rouge 2 fois sur 2 sur la branche
  (personnages 7/9, 8/9) contre 1 sur 2 sur `origin/main`, rejouée seule.
  Plutôt que de plaider l'intermittence, la règle des bords ne passe qu'EN
  JEU (`raffinerPermis = running`, main.js) : la préparation redevient celle
  de la v332 au calcul près. Quand on ne peut pas trancher sur deux
  passages, on retire la cause possible par construction.

- **`node --check` NE VOIT RIEN SUR UN `.js` DE CE DÉPÔT.** Mon rebase a
  recollé `nouveautes.js` en perdant une accolade : le journal ne se lisait
  plus (« Unexpected token ':' », `maj.js`), et `node --check
  src/nouveautes.js` rendait ZÉRO. Vérifié sur un fichier à l'erreur
  évidente : un `.js` hors d'un package `"type": "module"` passe, le même en
  `.mjs` est refusé. Tout « `node --check` OK » écrit sur un `src/*.js` était
  aveugle. Ce qui prouve qu'un module se charge, c'est de l'IMPORTER
  (`node -e "import('./src/x.js')"`), ou de le vérifier sous un nom `.mjs` —
  et après un rebase qui a recollé un fichier de données, on l'importe.

## Des voitures dans toutes les rues (v322) — un plafond par circuit rend la densité inverse de la longueur

Max : « lance sur toutes les villes, pas juste celle-là ». Quatre règles.

- **« RUE VIDE » SE MESURE EN COUVERTURE ET EN DENSITÉ, VILLE PAR VILLE.** La
  part de la ville à moins de `VU_VOITURE` (45 blocs) d'un tracé qui porte un
  convoi, et les voitures pour mille blocs de rue. Paris doublé : 38,8 %. Un
  compte de circuits ou de voitures par ville ne l'aurait pas dit — Paris en
  avait cent quarante-quatre. Le témoin de `carteMonde.js` boucle sur les 268
  villes qui ont des voitures.
- **ON N'AJOUTE PAS DE RUES POUR AJOUTER DES VOITURES.** La trame ordinaire de
  Paris est pleine de chaussée ; ce qui manquait, ce sont des boucles qui la
  suivent. `tourDeTrameParis` roule sur l'AXE des rues de la trame en
  inversant exactement le gauchissement (`trameVersPlan` : `p` reçoit une onde
  de `q` d'origine, `q` une onde du `p` gauchi — l'inverse est explicite). Le
  sol ne change pas d'un bloc. Les tours se cherchent sous node (18 225
  rectangles, partage ≤ 16 blocs, chaussée ≥ 97 %), puis se lisent DANS LE
  MONDE : un tour qui a un bloc plein à hauteur de carrosserie est écarté.
- **UN PLAFOND PAR CIRCUIT REND LA DENSITÉ INVERSE DE LA LONGUEUR.** `nb`
  plafonnait à vingt : les grands anneaux de Rome avaient une voiture tous les
  quarante blocs, Londres (circuits courts) une tous les quatorze. Une voiture
  tous les dix-huit blocs partout (`voituresDuCircuit`), et le prix se mesure
  en voitures EN VUE d'un point, pas en voitures par ville : le maximum du
  monde ne bouge pas (72,7, Washington). Et un convoi naît quand l'enfant
  passe à 220 blocs de son `x, z` (main.js) : un circuit loin du centre porte
  SON centre, pas celui de la ville.
- **UNE RÈGLE DE CHOIX QUI NE REGARDE PAS OÙ LA VILLE EST VIDE SE COMPLÈTE PAR
  UNE PHASE QUI LE REGARDE (v325).** Les anneaux d'une ville engendrée se
  prennent du plus grand au plus petit, quatre au plus : Sydney laissait tout
  le North Shore vide. `ANNEAUX_EN_PLUS` (villesmonde.js) porte, ville par
  ville, des anneaux de quartier cherchés sous node par couverture gloutonne,
  AU SEC (un anneau qui franchit l'eau pose un tablier, donc change le sol) et
  validés par la même règle que les autres. Un témoin qui exige « aucune ville
  engendrée sous les trois quarts » garde la table.
- **UNE CORRECTION GÉOMÉTRIQUE PEUT DÉPLACER UNE ÉGALITÉ (v325).**
  `contournerBlocs` prend le côté le plus court d'un socle ; recentrer le tour
  des monuments d'un demi-bloc a fait basculer un circuit du sud au nord de
  Montparnasse, et deux circuits se suivaient sur 25 blocs. Élargir le tour
  SYMÉTRIQUEMENT réglait le même défaut sans toucher aux égalités. Après une
  retouche de tracé, on remesure le partage, pas seulement le défaut visé.
- **UNE PLACE LUE ENTRE DEUX IMAGES N'A PAS ENCORE ÉTÉ MONTRÉE.** `placeProche`
  lit la position d'aujourd'hui, `montrer` a vu celle de la dernière image :
  après une téléportation, un témoin qui interroge par minuteur trouve des
  places vides — 47 sur 2 400 relevés, toutes ce cas-là (`diagPlace`). Un
  témoin de place attend une image après s'être posé.
## Le GPS complet (v321) — plus aucun voyage d'office, et un angle affiché reste continu

La dette de la v306, remboursée. Quatre règles.

- **UNE QUESTION POSÉE PAR UN GESTE SE POSE PAR TOUS LES GESTES QUI MÈNENT AU
  MÊME ENDROIT.** La v306 avait fait poser « Téléporter » ou « S'y rendre » à
  l'appui long, et laissé l'étiquette touchée et le résultat de recherche
  emmener d'office : trois gestes vers le même voyage, un seul qui demandait.
  Les trois passent désormais par `_proposer` (carte.js) ; un lieu nommé garde
  son nom et son voyage (`surVoyage`, la trame des rues), un point reste un
  point. Le résultat de recherche CENTRE la carte sur le lieu avant de poser
  la question (`proposerLieu`) : l'enfant voit où c'est avant de choisir.
  Tout témoin qui éprouvait l'ancien geste clique « Téléporter ».
- **UN ANGLE AFFICHÉ QUI SUIT UN ANGLE REPLIÉ SE GARDE CONTINU.** `guidage`
  rend un écart dans ]−π, π] ; écrit tel quel dans un style animé, il fait
  faire un tour presque complet à la flèche quand la cible passe derrière.
  `rotationContinue` (gps.js, pur) n'ajoute à l'angle AFFICHÉ que l'écart le
  plus court. **Et le témoin lit le style ÉCRIT, pas la matrice calculée** :
  `getComputedStyle` replie tout dans ]−π, π] et rend le même angle pour le
  bon et pour le mauvais chemin — il ne pouvait pas voir ce défaut.
- **CE QUI CHANGE SANS QUE L'ENFANT BOUGE SE REDESSINE TOUT DE SUITE.** La
  minicarte ne se refait qu'au déplacement (v233) ; une destination posée ou
  effacée la redessine sur-le-champ (`majMinicarteGPS`). Le repère et la
  flèche de bord sont la règle des amis hors cadre, rendue pure
  (`repereMinicarte`) ; le témoin lit la COULEUR à l'endroit annoncé.
- **UN MESSAGE RÉSEAU NEUF N'EST « SIMPLE » QUE S'IL NE TOUCHE NI AU RELAIS NI
  AU NUAGE.** Partager la destination demande `net.js` (envoi, relais de
  l'hôte), `relaisnuage.js` et un témoin à deux tablettes dans `reseau.js` :
  déclaré dans `TASKS.md` au lieu d'être livré à moitié.

## Les programmes à l'arrivée, dans toutes les villes (v319) — une sonde de gel se fait sur l'échantillon, pas sur la ville signalée

Max : « lance sur toutes les villes, pas juste celle-là ». Cinq règles.

- **UNE DETTE MESURÉE DANS UNE VILLE SE MESURE DANS TOUTES LE JOUR OÙ ON LA
  REPREND.** Celle de la v306 disait « deux ou trois programmes à Paris » ;
  `sonde-programmes-villes.cjs` (seize lieux, une page neuve chacun) a rendu
  0 à 4 partout et **34 à New York**, que personne n'avait mesuré. Le verre
  dans les murs une neuvième fois, du côté d'une sonde.
- **UN PROGRAMME SE NOMME PAR LA CASE DE SA CLÉ QUI DIFFÈRE, PAS PAR LE
  MATÉRIAU COURANT.** La sonde de Paris ne lisait que `currentProgram` et ne
  trouvait personne. On lit TOUS les programmes d'un matériau
  (`renderer.properties.get(m).programs`) et l'on compare chaque clé neuve à
  la clé ancienne la plus proche : `basic→phong, envMap 301` a nommé la coque
  d'attente des voitures en une exécution, `shadowMapEnabled` les 22 de
  Manhattan. Un programme qu'aucun objet ne porte vingt secondes après est
  celui d'un objet REMPLACÉ (la coque, par le modèle de la flotte).
- **`shadowMapEnabled` FAIT PARTIE DE LA CLÉ DE TOUT PROGRAMME.** Une ville
  qui allume les ombres sur un appareil qui ne les a pas (Manhattan sur la
  tablette, v257) recompile tout ce qu'on voit à l'entrée. Se chauffe en
  basculant les ombres le temps d'un appel, dans la même tâche.
- **`compile` NE CHAUFFE PAS LA PASSE D'OMBRE, ET CELLE-CI LIT LES LAMPES DE
  L'IMAGE PRÉCÉDENTE.** Les variantes de profondeur ne naissent qu'au RENDU :
  un pixel de l'écran (la cible compte dans la clé), le décor caché, les
  lampes gardées. Et le matériau de profondeur est partagé et ne se recompile
  que quand la forme change : deux rendus encadrant une AUTRE forme, sinon la
  seconde variante (« une ombre portée » contre « zéro ») ne naît jamais —
  trois sondes pour le voir, chacune réfutant la précédente.
- **UNE CHAUFFE QUI NE SERT QU'À UNE VILLE NE GRISE PAS « JOUER ».** Sur
  l'iPad une compilation coûte des centaines de millisecondes (v257) : celle de
  New York tourne après la préparation, à l'accueil et au menu, et s'arrête en
  jeu. Le témoin attend qu'elle finisse, comme l'enfant qui lit l'accueil ; le
  cas de l'enfant pressé est déclaré dans `TASKS.md`, avec l'alternative qui
  est une décision de Max (Manhattan qui respecte les ombres de l'appareil).

## Deux témoins repointés (v318) — un témoin qui ne lit rien, et un enfant posé sur la voie

Deux règles.

- **UN TÉMOIN DE GÉOMÉTRIE COMPTE CE QU'IL A LU, ET ZÉRO EST ROUGE.** « Aucune
  voiture ne traverse un monument » jugeait les points de circuit DANS un
  socle ; le tour (v221) les en a sortis, et le témoin rendait `pas: 0` des
  deux côtés pendant des dizaines de versions. Il lit désormais la BANDE du
  tour, le tracé parcouru tous les demi-blocs (les coins de `tourDuBloc` sont
  des points isolés), le bloc en `Math.floor` — la colonne que la carrosserie
  occupe, `Math.round` en rate la moitié — et il exige `lus > 0`. Et une boîte
  jugée sur des colonnes (`|u − c| ≤ b`) couvre le monde de `c − b` à
  `c + b + 1` : tout ce qui se pose « à `b + n` du centre » est d'un bloc plus
  près côté +. C'est ce que ce témoin a trouvé dans le tour des monuments
  (dette dans `TASKS.md`).
- **UN TÉMOIN QUI POSE L'ENFANT SUR UNE VOIE MESURE LA PATIENCE DE LA RUE.**
  Devant l'enfant, une voiture attend sans limite (v245) : elle s'arrête à huit
  ou dix blocs, la file derrière elle, et un témoin qui attend une voiture à
  cinq blocs n'en voit jamais. Ce qui doit voir passer la circulation se pose À
  CÔTÉ de la voie, à plus de 2,8 blocs de tout circuit, sur un sol à la cote de
  la chaussée — à deux blocs on tombe dans un arbre, et `placeProche` refuse
  une voiture à plus de 2,5 blocs de hauteur. Et la position d'un convoi étant
  une fonction de l'heure (v305), l'attente se mesure sur un TOUR D'HORLOGE,
  sous node, avec la vraie circulation (`sonde-attente-volant.cjs`) : une
  attente lue à une seule heure est un tirage.

## Les quais de la Seine en pierre (v316) — sous la surface, c'est encore le monde qu'on voit

Une règle.

- **AU BORD DE L'EAU, LE REMPLISSAGE DU MONDE EST UNE FAÇADE.** Une ville
  n'écrit que son SOL ; tout ce qui est dessous reste la terre et la pierre du
  générateur. Partout ailleurs c'est invisible — et contre un fleuve c'est un
  mur qu'on regarde d'un pont : deux blocs de terre sous la margelle des quais
  de Paris, 639 faces, vus en capture en v306 et restés dix versions dans
  `TASKS.md`. `murDeQuaiParis` change la MATIÈRE de la colonne entre l'eau et
  la margelle, jamais sa hauteur : les empreintes de `plafond.js` ne bougent
  pas, et le monde d'avant (`CONF_AVANT`) n'a pas besoin de la règle — la terre
  et la pierre arrêtent un bloc de la même façon. Toute ville au bord de l'eau
  (Londres et la Tamise, Lille et la Deûle) porte probablement le même défaut :
  la sonde est une boucle de dix lignes sur les colonnes qui touchent l'eau.
- **ET LA v317 A FAIT LA SONDE AU LIEU DE L'ÉCRIRE : TOUTES LES RIVES PORTAIENT
  LE DÉFAUT.** Londres 399 faces de terre, Lille 392, Amsterdam 364, Rome 190,
  Lyon 134 — c'est le verre dans les murs une huitième fois, la PORTÉE du
  remède. La règle vit donc UNE fois, dans `generateChunk` (passe après les
  colonnes, drapeau `mursDeQuai` de `CONF_NEUF` seule) : colonne de ville ou de
  ville engendrée, sommet à deux blocs au moins au-dessus de l'eau, voisin d'eau
  ouverte lu dans le morceau (au bord, dans le relief) — et l'on ne remplace que
  la terre, l'herbe, le sable et la pierre naturelle. Manhattan a son propre sol
  et n'est pas touchée. Washington garde ses berges du Potomac, qui ne sont pas
  dans le disque de la ville.

## Les ponts de l'Anacostia (v444) — un pont de ville est du sol, et la cote du tablier se dit à tous ses lecteurs

Deux règles.

- **UN PONT DE RUE DANS UNE VILLE BÂTIE À LA MAIN EST UNE VOIE DU SOL, À LA
  COTE DE LA VILLE.** `pontWashington` (washington.js) rend la matière de la
  bande des deux ponts ; `world.js` l'écrit à `COTE_PONT_DC` (33) sur toute
  colonne plus basse, et `coteRoulable` rend cette cote. C'est la règle de la
  Tamise (v208) : `terrainHeight` ne bouge pas (109 881 colonnes identiques),
  l'eau reste dessous. Le pont ne remplace que ce qui n'est PAS déjà une rue :
  la bande d'un pont qui chevauche un carrefour de la grille y mettait du
  trottoir (vu au relevé de la rue de v = 84).
- **UNE EMPREINTE DE MORCEAUX QUI BOUGE SE PROUVE PAR LE DÉSARMEMENT ET PAR
  CE QUI DIFFÈRE** (v419) : `pontWashington` rendant null, la branche rend la
  constante de la v439 au bit près ; les 112 colonnes qui diffèrent sont
  toutes dans les bandes des ponts. Et l'ajout d'une voie dans une ville à
  circuits se remesure : les quatorze circuits de Washington sont identiques.

## L'US-101 (v439) — un relevé en couronne commence à la porte, et une optimisation de tracé reconstruit la porte

San Francisco–Los Angeles, le couloir instruit en v419. Quatre règles.

- **UN RELEVÉ EN COURONNE COMMENCE À LA PORTE, PAS AU BORD.** Celui de la v419
  disait « sortir par l'est (0° à 30°) » : il lisait le relief à partir de
  r + 20. Mais la porte est à r − 20, et entre les deux, à l'est de San
  Francisco, c'est la BAIE — soixante-dix blocs d'eau dans le disque. Le
  relevé (`ring.mjs`) commence à r − 40 ; la porte est au sud-est (68°), sur
  la terre ferme au bout de la baie, et la route passe au nord de SFO.
- **UNE OPTIMISATION QUI DÉPLACE LE PREMIER POINT DE PASSAGE DÉPLACE LA
  PORTE.** `porte()` vise le premier (et le dernier) point de passage : mon
  affineur gardait la porte fixe et laissait bouger ses voisins, et la porte
  réelle de Los Angeles tombait à −171°, sur un îlot (avenue de zéro bloc).
  L'évaluation reconstruit les portes comme le registre (`complet(via)`), et
  l'angle d'entrée est une contrainte : on choisit d'abord les angles propres
  (`entrees.mjs`, ici une fenêtre d'un degré et demi à 180°) puis l'on fige le
  dernier point sur ce rayon.
- **UN AÉRODROME EST AUSSI UN REPÈRE.** SFO porte une boîte de 63 dans
  `REPERES` : la sonde qui écarte les repères l'écarte d'un carré, plus large
  que la marge du disque — c'est ce qui ferme l'ouest de l'aérodrome autant
  que ses collines.
- **LES CONTRAINTES DES TÉMOINS SONT DURES, LA LONGUEUR EST MOLLE.** Un
  affineur qui additionne coudes, déblai et nombre de ponts échange un coude
  de 33° contre un pont de moins. La note est lexicographique : d'abord les
  violations (axe dans une marge, remblai > 4, déblai > 9, ponts à moins de
  neuf blocs, coude > 22°, pont près d'une porte, angle de porte hors de la
  fenêtre), puis seulement les ponts et la longueur.

## L'A8 (v428) — une sonde de couloir monte avec la route, et vérifie le rail sur la vraie emprise

Marseille–Nice, par l'intérieur. Trois règles.

- **UNE VILLE ASSISE SOUS SON PAYS FAIT ÉCHOUER LE COULOIR LE PLUS BAS, ET LE
  REMÈDE EST DANS LE COÛT.** Marseille est à 33 et son pays monte à 46-50 dès
  vingt blocs : le couloir le plus bas (v355) y rendait cent pour cent de refus
  « déblai » — un défaut de la recherche (v329), pas du pays. Le coût d'une
  case porte désormais une RAMPE : au-dessus de ce que 0,06 par bloc permet
  depuis la porte (plus six), il croît au carré. La sonde cherche alors un
  chemin que le profil peut suivre, et le trouve au nord, entre le TGV et le
  massif.
- **UNE ESTIMATION DE TALUS NE GARDE PAS UN RAIL.** Ma sonde estimait la
  largeur du talus sur l'axe (l'écart au terrain sous l'axe, divisé par la
  pente) ; le registre réel rendait vingt-cinq colonnes de talus sur la gare
  TGV de Marseille, parce qu'un talus se règle sur le terrain de SA colonne,
  pas sur celui de l'axe. Tout candidat retenu passe désormais par une
  instance neuve de `routes.js` où sa fiche est inscrite, et `routeEn` lu
  colonne par colonne (`exact`, scratchpad lib.mjs) : c'est la grandeur du
  témoin, donc celle qu'on filtre (v313).
- **UN SOMMET DE COUDE NE TOMBE PAS SUR LE JOINT D'UN PONT.** Le portail a
  rendu deux points sans cube ni tablier à l'entrée du deuxième pont : le
  sommet (1111, 3208) était à s 308,5, un bloc et demi avant le tablier, et
  les colonnes du coin de son coude étaient déjà « tablier » (pas de cube)
  sans qu'aucun ruban — orienté selon le tronçon d'après — ne les couvre. Le
  comblement de coin de la v336 vaut DANS un pont, pas au joint. Ma sonde de
  tracé mesurait les joints, mais sur le profil, pas sur les rubans ; le
  témoin se rejoue sous node en vingt lignes (`joint.mjs`, scratchpad), et
  c'est lui qu'on passe sur tout tracé retenu. Le sommet déplacé à s 304 :
  zéro trou sur 19 500 points.

## L'A6 (v419) — une ville qui reçoit deux routes a deux arrivées

Paris–Lyon, l'autoroute du Soleil, à l'ouest du TGV. Quatre règles.

- **UNE DESTINATION ÉCRITE POUR LA PREMIÈRE ROUTE NE VAUT PAS POUR LA
  SECONDE.** L'entrée de Paris (v300) menait chaque route à la Gare du Nord :
  juste pour l'A1, qui arrive du nord ; l'A6, qui arrive du sud, aurait
  traversé toute la ville en diagonale par-dessus les îlots. `ARRIVEE`
  (paris.js) donne à chaque route son bout — le bout d'une voie nommée (la
  place d'Italie, où finissent les Gobelins et Arago) —, la Gare du Nord
  restant le défaut. C'est le `[0]` de la v310 vu du côté de la ville : quand
  on ajoute la seconde route d'une ville, on cherche ce qui avait été écrit
  pour la première.
- **LE BORD D'UNE VILLE DOUBLÉE PEUT ÊTRE UNE CRÊTE.** Le fondu de Paris
  monte à 41-43 blocs exactement au bord du disque entre 65° et 80° ; une
  porte à vingt blocs dessous y déblaie neuf blocs (9,2 mesuré, barre 9), à
  86° le bord est à 38 (4,1). Le relevé en couronne se lit dès la colonne du
  bord (`d = 0`), pas seulement au-delà.
- **UNE EMPREINTE D'IDENTITÉ QUI BOUGE SE PROUVE AUSSI PAR CE QUI DIFFÈRE.**
  Paris est un des neuf lieux de l'empreinte des 490 morceaux : l'entrée de
  l'A6 la change. L'A6 retirée du registre, la branche rend la constante
  d'avant au bit près ; et les colonnes qui diffèrent (quatre-vingt-cinq)
  sont toutes à moins de 11,2 blocs de l'axe de l'entrée — sa demi-chaussée
  et son trottoir. La première preuve dit « rien d'autre n'a bougé dans le
  code », la seconde « rien d'autre n'a bougé dans le monde ».
- **UNE AVENUE D'ENTRÉE SE LIT AUSSI À HAUTEUR DE CARROSSERIE AVANT DE CHOISIR
  L'ANGLE.** À Lyon, l'angle qui donnait la plus longue avenue (−147°) avait
  des bancs (planches) sur la chaussée à cinq et vingt blocs de la porte ; le
  témoin des entrées l'aurait vu, le relevé des angles non. `dansav.mjs` lit,
  angle par angle, les blocs pleins au-dessus de la cote roulable : la porte
  de l'A6 est à −144°.

## La M40 (v415) — une ville bâtie à la main s'entre par une rue déclarée, et une vieille boucle se cherche

Londres–Birmingham, le corridor « en attente » depuis la v323. Trois règles.

- **UNE PORTE DE VILLE BÂTIE À LA MAIN RESTE À `BORD_VILLE`, ET L'ENTRÉE SE
  DÉCLARE.** Les rues nommées de Londres s'arrêtent à quatre-vingts blocs du
  centre, la porte est à quatre-vingt-douze : aucune rue existante n'y mène
  (mesuré angle par angle). Pousser la porte plus loin (`bord` plus grand)
  aurait mis l'axe DANS la ville (le témoin « elle ne traverse ni ville » lit
  `cityAt` à `r − BORD_VILLE − 2`, et Londres est bâtie à la main — une ville
  engendrée comme Tokyo n'y entre pas). `ENTREES_LONDRES` (londres.js), comme
  Paris et Lille : une collectrice de la porte à un SOMMET d'une artère
  (Pentonville Road), dans le sol de la ville mais hors des circuits.
- **UNE BOUCLE DE CONSTRUCTION QUI LISTE SES EXCLUSIONS OUBLIE LA DERNIÈRE
  VILLE.** La trame générique de `world.js` (« City buildings: one lot per grid
  cell ») exclut six villes bâties à la main, pas Londres : hors de la place que
  « le mobilier de Londres » réserve (77 blocs autour du centre), elle pose
  encore ses maisons PAR-DESSUS la ville. L'une barrait l'entrée de la M40 (un
  bloc à hauteur de carrosserie à dix blocs de la porte, `dans` du témoin), deux
  colonnes de la route aussi. Ses lots cèdent désormais à la route et à
  l'entrée ; le reste de l'anneau est une dette déclarée (`TASKS.md`), parce que
  le retirer touche des toits où un enfant a pu bâtir.
- **UN COL SE TROUVE PAR LE RELEVÉ, PAS PAR L'AXE.** La carte ASCII du relief
  (`carte.mjs` du scratchpad) a montré une crête nord-sud de 46 à 55 blocs
  barrant tout l'espace, Heathrow fermant le sud, et un seul col à 41-46 vers
  la latitude de Birmingham. Le couloir le plus bas avec cap (v355) le trouve de
  lui-même dès qu'on lui donne la sortie nord de Londres ; donné par l'ouest, il
  rend « déblai ». La même sonde sert les routes suivantes : obstacles dans la
  grille (aérodromes à r + 12 + portée de talus, villes, repères, rails,
  autres routes), lissage par moyenne, `profilDe` sur chaque candidat, puis
  `verif.mjs` qui relit le registre réel avec les grandeurs des témoins.

## Le Tōmei (v381) — une sonde de couloir lisse par moyenne, et la porte se juge avec son raccord

Tokyo–Nagoya, la route que le relevé de la v310 laissait de côté (« un
aérodrome sur l'axe »). Deux règles.

- **UNE ENTRÉE DE VILLE SE MESURE AVEC LES QUARANTE BLOCS QUI LA PRÉCÈDENT.**
  L'avenue de Tokyo par 149° était la plus propre (dix-neuf blocs de rue,
  aucun bloc) ; mais le rayon qui y mène passe sur un étang à cinquante blocs
  de la porte, et tous les tracés y posaient un pont contre elle. Une entrée
  se choisit sur l'avenue ET sur le rayon de dehors — ici 132°, porte à
  vingt-quatre blocs du bord (`bord`), même avenue mesurée.
- **QUAND LE COULOIR SERPENTE, CHAIKIN LAISSE SES COINS ; UNE MOYENNE GLISSANTE
  LES RÉPARTIT.** Le chemin de grille (huit caps, trois pas droits après chaque
  virage) contournait la montagne côtière en S : lissé par Chaikin et
  rééchantillonné, il rendait des coudes de 33 à 38° — cent pour cent de refus
  « coude », c'est-à-dire un défaut de la recherche (v329). Rééchantillonné à
  cinq blocs puis moyenné sur ±50 blocs (bouts fixés), le même chemin passe
  sous 25° : 22 admissibles sur 300, dont un à un seul pont.

## La route de Washington (v367) — une ville fermée par son relief s'entre par son côté bas, et un bout peut s'arrêter net

L'I-95 Sud New York–Washington. Quatre règles.

- **AVANT DE CHERCHER UN TRACÉ, ON RELÈVE CE QUI ENTOURE LA VILLE, CÔTÉ PAR
  CÔTÉ, AVEC LA RÈGLE DU PROFIL EN TÊTE.** Washington est fermée au nord par
  la montagne, à l'est par une crête de 43 à 49 blocs qui commence à six
  blocs de la boîte, à l'ouest par le Potomac DANS la boîte. Une route
  épinglée au niveau de la rue (33) ne monte que de 0,06 par bloc et ne
  déblaie que neuf blocs : à vingt blocs de la porte elle est à 34, la crête
  à 45. Aucune recherche ne trouve ce qui ne peut pas exister ; un tableau
  « porte × cap → déblai sur les deux cents premiers blocs » le dit en une
  seconde. Le côté bas est le sud (Anacostia), et c'est par là qu'on entre.
- **UNE VILLE QUI N'EST PAS UN DISQUE DÉCLARE AUSSI SON BOUT ET SON AVENUE.**
  La porte (v362) ne suffit pas : au bout, la chaussée continue en
  demi-cercle de 3,8 blocs (la distance au point borné) — l'entrée d'une
  ville-disque, mais dans une boîte bâtie jusqu'à son bord, de l'asphalte dans
  ses trottoirs. `boutNet: ['washington']` arrête la route net au quart de
  bloc ; `avenues: { washington: [...] }` donne aux voitures la rue où elles
  entrent (main.js la lit avant `avenueDEntree`). Et la porte se pose là où
  le sol est AU NIVEAU de la rue (un bloc hors de la boîte), sinon le fondu
  de la ville fait une marche entre la route et la rue.
- **UNE SONDE QUI SIMPLIFIE UN TRACÉ ARRONDIT APRÈS ET DÉDOUBLONNE.** Mon
  premier jet arrondissait les points au bloc puis mesurait les coudes : deux
  points confondus rendent un angle nul (`atan2(0, 0)`) et cachaient des
  coudes de 58° et de 90°. Et un point d'arrivée posé DERRIÈRE le chemin
  trouvé fait un crochet : la grille vise le point le plus éloigné de la
  ligne droite d'entrée (la porte, puis le rayon), arrivée par le bon cap, et
  le virage serré se fait sur un arc écrit (soixante blocs de rayon), jamais
  par le lissage d'un angle droit.
- **UN TÉMOIN ÉCRIT POUR DES DISQUES SE RÉÉCRIT POUR LA PREMIÈRE VILLE QUI
  N'EN EST PAS UNE.** « La route ne frôle pas ses villes » lisait r + 10 :
  la route longe la campagne au sud de Washington à moins de 197 blocs du
  centre, et il l'aurait accusée. Il juge désormais Washington à sa zone
  (`ZONE_WASHINGTON`) et Manhattan à son rectangle — la règle de la v313
  (« un témoin écrit pour un cas se réécrit le jour où un cas neuf sort de
  son hypothèse »).

**Et un tronçon mesuré sur l'axe ne couvre pas les colonnes d'à côté (v381).**
Le tablier d'un pont de ville engendrée s'arrêtait là où l'AXE cessait d'être
mouillé ; une colonne voisine pouvait être de l'eau un demi-bloc plus loin, et
restait sans pont — une seule vue par le témoin des ponts (Berlin, sur l'axe),
437 mesurées sur la bande entière dans quarante-neuf villes. Une dette vue
dans une ville se mesure dans toutes (v319) : le témoin des encoches lit la
bande de chaque tablier de chaque ville, par les fonctions pures.

## La porte de Manhattan (v362) — une ville qui n'est pas un disque déclare sa porte

L'I-95 New York–Boston. Quatre règles.

- **UNE VILLE QUI N'EST PAS UN DISQUE N'A PAS SA PORTE SUR LE RAYON.**
  Manhattan est un rectangle de 480 × 2 300 (`BORNES`), le registre dit un
  disque de 152 : `porte()` aurait posé la porte sur l'île. La fiche de la
  route DÉCLARE la porte (`portes: { ny: [x, z] }`, blocs du monde, mesurée),
  sur la rive est, hors du rectangle d'au moins une portée de talus.
- **UNE ROUTE NE LIT JAMAIS UN RELIEF QUE LE WORKER NE CONNAÎT PAS.** Le
  profil se calcule dans chaque monde avec SON `terrainHeight` ; le worker
  (un `World`) ne connaît pas le plan de Manhattan que le fil principal
  (`TerreUrbaine`) lit dans le rectangle. Un seul point du profil dedans, et
  les deux fils bâtissent deux routes différentes — la rampe d'épinglage
  propage l'écart sur toute la longueur. Et les morceaux du rectangle sans
  bloc posé ne passent pas par le mailleur ordinaire (`hasVisualEdits`) : un
  tablier y serait invisible. Le pont qui entrerait dans l'île est donc une
  dette d'architecture, pas un tracé à chercher.
- **UNE ROUTE N'A PAS DE TALUS AU-DELÀ DE SON BOUT.** La distance au point
  borné dessine un chapeau autour de la porte ; là où le sol au-delà n'est pas
  celui de la porte (un fleuve de ville), il creusait — l'A3 traversait le
  tablier d'un pont de Francfort à treize blocs au-delà de sa porte. Le talus
  s'arrête net à un bloc au-delà du bout ; la chaussée continue.
- **UN TÉMOIN QUI HACHE UN REGISTRE ROUGIT À CHAQUE AJOUT, ET NE PROUVE PLUS
  RIEN.** L'empreinte de la v352 hachait toutes les routes : rouge en
  production en v355 et v356, sans un mot dans `TASKS.md`. Une empreinte
  d'identité porte la LISTE de ce qu'elle a relevé (`ROUTES_RELEVEES`) ; ce qu'on
  ajoute a ses propres témoins. Et un témoin écrit pour cinq villes
  (`ponts de villes`) se réécrit pour toutes celles qu'une route touche — il a
  trouvé Francfort, et deux défauts de ville qu'on déclare.

## Les routes qui contournent une ville (v355) — le couloir se cherche avec son cap

La 401 Toronto–Montréal et la Hansalinie Cologne–Hambourg, les deux corridors
« sans tracé » de la v337. Quatre règles.

- **QUAND LE CÔTÉ BAS D'UNE VILLE NE REGARDE PAS L'AUTRE, LA ROUTE FAIT LE
  TOUR.** Deux coudes ou un chemin lissé tout droit ne tournent pas autour
  d'un disque. La sonde cherche le COULOIR LE PLUS BAS (Dijkstra sur une
  grille de trente blocs, coût au carré de la hauteur au-dessus de 40, l'eau
  très chère), en tire des points avec du jeu, lisse par Chaikin en gardant
  les deux tronçons radiaux, simplifie tant que les coudes restent sous 22°,
  et APPELLE `profilDe` sur chaque candidat. Puis elle retire un à un les
  points dont le tracé se passe sans rien perdre (56 → 26, 72 → 25).
- **UN COULOIR SANS CAP REPART EN ARRIÈRE, ET LE LISSAGE N'Y PEUT RIEN.** Le
  premier jet (Dijkstra sur les cases seules) rendait 88 à 97 % de refus de
  coude — il a trouvé la 401 (seize sur 3 000) et ZÉRO Hansalinie sur 2 500 : le chemin le plus bas repartait souvent DERRIÈRE le tronçon radial,
  et aucun lissage ne fait d'un demi-tour un coude de vingt degrés. L'état de
  la grille porte le cap (huit directions, un huitième de tour au plus, deux
  pas droits après chaque virage), on part dans le cap de la porte et l'on
  arrive dans celui de l'autre ; les points du couloir à moins de 70 blocs des
  bouts sont laissés au lissage — 397 Hansalinie sur 1 500. C'est la règle de la v329 (« un refus qui
  touche cent pour cent des candidats sur une contrainte se lit d'abord comme
  un défaut de la recherche »), une forme de sonde plus loin.
- **CE QUE LA GRILLE N'INTERDIT PAS, LE LISSAGE LE TOUCHE.** Les rails et les
  autres routes n'étaient jugés qu'après coup : 878 refus « rail » sur 3 000
  autour de Cologne, l'ICE d'Amsterdam sortant à −130°. Interdits DANS la
  grille (rail à douze blocs, axe d'une autre route à deux emprises et talus),
  ils ne sont plus qu'un résidu. Et une porte se ferme aussi par ce qui est
  DANS le disque : l'Elbe longe le sud de Hambourg entre 38 et 70 blocs du
  centre, toute entrée par le sud mettait un pont dans le raccord ; et l'axe
  nord tombait au bout d'un pont de l'Alster, dont le TALUS de la route
  creusait le tablier (six points sans sol, vus par le témoin des ponts de
  villes, pas par la sonde) — on entre par le nord-ouest. Avant de chercher,
  on relève le long des rayons l'eau de la ville ET ses ponts, pas seulement
  le relief : une porte se juge contre tout ce que la ville a bâti autour.
- **DEUX ROUTES DANS UNE VILLE NE SE PRENNENT PAS LEUR EMPRISE.** Montréal,
  Hambourg et Cologne ont désormais deux autoroutes. `routeEn` donne une
  colonne au segment le plus proche : deux corridors qui se recouvrent
  feraient une chaussée qui change de route au milieu, sans échangeur. Un
  témoin de `carteMonde.js` lit chaque colonne d'emprise de chaque route et
  exige qu'elle appartienne au segment qu'on lit, et qu'aucun axe ne frôle
  ses villes hors du tronçon radial (r + 10, au-delà des quatre-vingts
  premiers et derniers blocs) — zéro sur les vingt et une.

**Et un générateur congruentiel en flottants tourne en rond.**
`(g * 1103515245 + 12345) % 2^31` dépasse 2^53 et perd sa précision : la sonde
rendait huit fois le même tracé et l'on croyait en avoir huit. Un tirage de
sonde se fait en entiers 32 bits (`Math.imul`).

## L'I-45 Dallas–Houston (v336) — un pays ondulé se traverse par un chemin, pas par deux coudes

Une règle.

- **QUAND LE MEILLEUR CANDIDAT FRÔLE UNE BARRE, ON ÉLARGIT LA FORME DES
  CANDIDATS, PAS LA BARRE.** Deux points intermédiaires rendaient au mieux
  9,14 de déblai pour neuf permis — la règle de l'Atomium (v311) : on ne
  monte pas la barre. Entre Dallas et Houston les croupes se suivent tous les
  quelques centaines de blocs, et deux coudes ne peuvent pas les éviter
  toutes. La sonde tire désormais des chemins lissés (`MARCHE` : un point
  tous les deux cents blocs, écart et virage bornés, tirage à graine fixe) :
  cinq admissibles sur vingt-quatre mille, déblai 7,7. Et elle dit OÙ le
  déblai bute (près d'une porte ou au milieu) : c'est ce qui a montré que le
  défaut n'était pas l'entrée de Houston.
- **UN RUBAN QUI SUIT UN TRONÇON NE COUVRE PAS LE COIN D'UN SOMMET.** Le
  tablier est fait de rubans d'un bloc orientés selon le tronçon où le pas
  commence ; dans un coude, le côté extérieur du virage restait ouvert (402
  points au joint du premier pont de l'I-45). C'est le piège de la culée
  (v302) une géométrie plus loin : là où une surface continue change de
  direction, on vérifie le coin. Le comblement couvre le secteur exact
  (moitié extérieure, longueur w·tan θ) et ne porte de garde-corps que dehors.

## L'A1 Nord Milan–Bologne (v333) — une sonde juge les points tels que le registre les écrit

Une règle.

- **UN TRACÉ SE MESURE EN BLOCS ENTIERS, PARCE QUE LE REGISTRE L'ÉCRIT AINSI.**
  Ma sonde jugeait ses points de passage en flottants et les imprimait
  arrondis : le premier tracé retenu rendait un remblai de 1,4, et le même
  tracé écrit dans `ROUTES` passait sur une mare d'UNE colonne, comblée en
  buse à 5,3 blocs — au-dessus de la barre de quatre que le témoin de l'A1
  applique à toutes les routes. Un déplacement d'un demi-bloc suffit à
  changer la colonne d'eau que l'axe touche. La sonde arrondit avant de
  juger, et l'on relit toujours le registre réel (`verif`) avant de livrer.

## L'A1 Sud Rome–Naples (v329) — une sortie de biais tourne en plusieurs fois

Une règle.

- **QUAND L'AVENUE PROPRE N'EST PAS DANS L'AXE, LA ROUTE TOURNE EN PLUSIEURS
  FOIS, ET LA SONDE AUSSI.** L'avenue propre de Rome la plus proche de Naples
  est à 46° de l'axe ; un point sur le rayon puis une ligne droite fait un
  coude de plus de trente degrés, et les 40 536 tracés de `cherche2.mjs` ont
  tous été refusés pour leur coude — un « zéro admissible » qui disait la
  forme de la sonde, pas celle du pays. `cherche3.mjs` pose après le point du
  rayon une suite de points qui virent de 24° tous les quarante blocs vers la
  cible : 8 115 admissibles. Un refus qui touche cent pour cent des candidats
  sur UNE contrainte se lit d'abord comme un défaut de la recherche.

## L'Autosole Bologne–Florence (v324) — la porte vise le premier point de passage

Neuvième route. Une règle.

- **UNE SONDE QUI CHOISIT UN ANGLE D'ENTRÉE DOIT LE FIXER DANS LE TRACÉ.**
  `porte()` (routes.js) pose la porte dans la direction du PREMIER point de
  passage, pas sur l'angle qu'on a mesuré. Ma sonde posait la porte à l'angle
  et des points de passage libres : les meilleurs tracés mettaient en réalité
  la porte de Bologne à 83°, où il n'y a pas d'avenue. Un point sur le RAYON de
  chaque entrée (dix blocs hors du disque, `cherche2.mjs`) la fixe ; la sonde
  et le registre lisent alors la même porte. Et l'on revérifie toujours les
  entrées sur le registre réel (`verif.mjs`), jamais sur la sonde.

## L'E1 Kyoto–Nagoya (v323) — le côté du rail se choisit aux entrées de ville

Huitième route. Une règle.

- **QUAND UN RAIL TRAVERSE UNE DES DEUX VILLES, LE CÔTÉ SE DÉCIDE AUX
  ENTRÉES.** Le Shinkansen passe à douze blocs du centre de Nagoya : la porte
  de la route doit être du même côté du rail que toute la route, sinon elle le
  croise dans le raccord. On balaie donc l'angle d'entrée des DEUX villes
  d'abord (`entrees.mjs` : avenue, rue, bloc, eau), et le côté est celui où
  les deux ont une avenue propre — ici le sud (Kyoto 0°, quatre-vingt-neuf
  blocs ; Nagoya 150°, vingt-huit), quand le nord n'offrait à Nagoya que dix
  blocs. La sonde de rail est conservatrice (emprise + talus + deux blocs, lus
  sur `profilDe`) et le témoin relit le vrai `routeEn` : 0 colonne sur 2 749.

## L'A3 Cologne–Francfort (v320) — un rail le long de l'axe choisit le côté

Septième route. Deux règles.

- **QUAND UN RAIL SUIT L'AXE, ON CHOISIT UN CÔTÉ ET L'ON N'EN CHANGE PLUS.**
  L'ICE va droit de gare à gare : toute route qui passe d'un côté à l'autre le
  croise, et le remblai s'écrirait sur le ballast. Le côté se décide sur ce qui
  borde le rail — ici l'aérodrome de Francfort, au nord, à 108 blocs de l'axe
  du rail : sa marge et l'emprise ne tiennent pas ensemble. Au sud, l'axe de la
  route ne s'approche jamais à moins de 37 blocs de celui du rail. Un témoin de
  `carteMonde.js` lit désormais TOUTES les routes : aucune colonne d'emprise sur
  `voieEn` ou `gareEn`.
- **UNE SONDE DE TRACÉ APPELLE LE PROFIL, ELLE NE LE RECOPIE PAS.** La v315
  avait corrigé sa sonde en y recopiant deux règles de `profilDe` ; il en
  manquera toujours une. `profilDe` est pur et prend un segment fabriqué : la
  sonde (scratchpad `tourne.mjs`) l'appelle sur chaque candidat — 4 852 tracés
  en 23 secondes — et le tracé retenu est exactement celui que le jeu bâtit.
  Elle publie ses refus par contrainte (v311).

## L'A109 Nairobi–Mombasa (v315) — une sonde de tracé recopie les règles du profil

Sixième route. Une règle.

- **CE QUE LE PROFIL FAIT D'UN TRACÉ, LA SONDE DOIT LE FAIRE AUSSI.** Mes
  premiers tracés sortaient « admissibles » et échouaient au premier relevé
  exact : une mare isolée comblée sur sept blocs (la buse de `profilDe`), puis
  deux ponts à deux blocs l'un de l'autre, joint ouvert. La sonde
  (`trace-vite.mjs`) recopie maintenant le retour au remblai des ouvrages de
  moins de trois colonnes et exige huit blocs de sol entre deux ponts — et le
  tracé retenu passe le relevé exact du premier coup. Une sonde qui ne connaît
  pas une règle du générateur trouve des tracés que le générateur refuse ; on
  la corrige, on ne trie pas ses résultats à la main.

## L'A-4 Madrid–Séville (v314) — un ravin trop étroit pour un pont se comble

Cinquième route, la plus longue. Deux règles.

- **UN OUVRAGE PLUS COURT QUE TROIS COLONNES N'EST PAS UN PONT.** `profilDe`
  rend au remblai toute suite d'ouvrage de moins de trois colonnes (« une buse,
  pas un pont ») — juste pour une colonne d'eau isolée, faux pour un ravin
  étroit et profond : une variante y mettait dix blocs de remblai pour une
  barre à quatre. Le témoin de la v300 l'aurait vu ; la sonde de tracé, qui
  recopie la règle des ponts sans ce retour au remblai, ne le voyait pas. Le
  profil EXACT (`profilDe`) se relit sur chaque variante retenue, avant le
  joint.
- **UNE RECHERCHE QUI NE FINIT PAS SE FAIT GROSSIÈRE D'ABORD.** La grille fine
  de la v311 sur deux mille blocs n'a pas fini en trente minutes ; une grille
  quatre fois plus lâche et deux virages au lieu de huit ont trouvé en neuf
  minutes, puis l'on affine à la main le point de passage qui compte, en
  mesurant chaque variante (joint, profil, entrées).

## La BR-116 São Paulo–Rio (v313) — une sonde de largeur fixe mesure hors de la route

Quatrième route du registre. Deux règles.

- **UNE FICHE DE VILLE PEUT MENTIR SUR SA TRAME, ET L'ENTRÉE SE CHERCHE PAR
  L'ANGLE.** Sur les axes de `trame.ang` de São Paulo, l'avenue d'entrée
  tombait sur des îlots (zéro colonne), puis sur un banc de trottoir (une
  planche à hauteur de carrosserie). On balaie l'angle d'entrée, et l'on garde
  celui dont l'avenue (`avenueDEntree`) est la plus longue, sur la chaussée,
  sans un bloc à hauteur de carrosserie : c'est la grandeur que le témoin
  mesure, donc celle qu'on optimise.
- **UNE SECTION QUI SE RESSERRE SE MESURE DANS SA LARGEUR.** Le pont de Rio
  tombe dans le raccord, où la chaussée devient une avenue. Ma sonde de joint
  et le témoin de la v302 échantillonnaient ±8 blocs quelle que soit la
  section : 397 « trous » hors de la route, sur un joint fermé. Le témoin lit
  désormais `largeurA` et toutes les routes — il ne lisait que
  `segmentsDeRoute()[0]`, à dessein en v310 ; un témoin écrit pour un cas se
  réécrit le jour où un cas neuf sort de son hypothèse.

## L'A20 Montréal–Québec (v312) — une avenue d'entrée s'arrête au premier îlot

Première route du Nouveau Monde. Deux règles.

- **UN AXE DE TRAME ORGANIQUE PORTE DES ÎLOTS.** Québec pose ses îlots SUR
  l'axe à neuf blocs du centre ; l'avenue d'entrée « jusqu'à douze blocs de
  l'ancre » (v310) y faisait entrer les voitures dans les immeubles.
  `avenueDEntree` (villesmonde.js) s'arrête au premier îlot, et c'est la même
  fonction que lisent la circulation et le témoin : un témoin qui recalculerait
  l'avenue à sa façon mesurerait une autre avenue que celle où l'on roule.
- **LA PORTE SE POSE SUR LA RUE, ET CELA SE MESURE COLONNE PAR COLONNE.** À
  vingt blocs du bord, la porte de Québec tombait sur un îlot (34 blocs du
  centre, le bloc arrondi vers le bas) : l'avenue s'arrêtait avant d'avoir
  commencé, zéro colonne. `bord: { quebec: 22 }` la pose sur la rue — la
  même règle que Bruxelles en v310, et le chiffre sort du relevé de l'axe,
  pas d'un essai.

## L'E19 Bruxelles–Amsterdam (v311) — le relief autour d'une ville décide par où l'on entre

Troisième route du registre, la première entre deux villes engendrées. Quatre
règles.

- **UNE VILLE ASSISE SOUS SON PAYS NE S'ENTRE QUE PAR SON CÔTÉ BAS.** Le
  fondu doux (v309) descend à 0,7 bloc par bloc ; une route monte à 0,06. Là où
  le pays est à 50 pour une ville à 33, aucun point de passage ne tient le
  plafond de déblai : l'axe direct creusait dix-huit blocs au sud d'Amsterdam,
  et TOUS les candidats de l'axe sud rendaient 17 au mieux. On relève d'abord
  le relief en couronne autour de la ville (`ring.mjs` : une ligne par angle,
  la hauteur de r − 20 à r + 260), puis l'on cherche le tracé depuis le côté
  bas — ici l'ouest, 42 à r + 25.
- **UN AXE DE TRAME N'EST PAS UNE RUE CONTINUE, ET L'AVENUE D'ENTRÉE SE LIT
  JUSQU'AU BOUT.** L'axe sud d'Amsterdam coupe quatre canaux sans pont ; l'axe
  ouest les franchit. Le témoin de la v310 ne lisait que trente blocs depuis
  la porte : il aurait été vert sur des voitures qui roulent sur l'eau. Il lit
  maintenant chaque entrée de ville engendrée jusqu'à douze blocs du centre,
  le bloc à hauteur de carrosserie ET la cote roulable (`h < 30`).
- **UNE RECHERCHE QUI REND ZÉRO CANDIDAT DIT POURQUOI.** Mes deux premières
  recherches par l'ouest rendaient « 0 » ; il a fallu compter les refus par
  obstacle pour voir que Schiphol en prenait 53 000 sur 58 000 — l'aérodrome
  est exactement entre les deux villes. Une sonde de tracé publie le compte de
  refus de chaque contrainte, comme le témoin des passants sépare ses trois
  pannes (v223).
- **UNE BARRE FRÔLÉE SUR TOUS LES CANDIDATS EST UNE CONTRAINTE DE GÉOGRAPHIE,
  PAS UN RÉGLAGE.** Par la sortie nord de Bruxelles, la colline de l'Atomium
  rendait 9,04 de déblai pour un plafond à 9, et le minimum sur trente-deux
  mille tracés valait 8,93. On n'a pas monté la barre : on a changé de sortie
  (l'est, basse), et le déblai tombe à 8,4.

## L'E429 Lille–Bruxelles (v310) — une route vers une ville engendrée arrive dans l'axe de sa trame

Deuxième route du registre, première vers une ville sans avenue d'entrée
dessinée. Quatre règles.

- **ON INSTRUIT TOUS LES CANDIDATS AVANT D'EN CHOISIR UN.** Les 23 corridors
  du kit ont été mesurés d'un coup sur l'axe direct (longueur, eau, rail,
  villes, aérodromes, repères). Le moins cher et le plus utile sortait de la
  mesure : 409 blocs, rien sur l'axe, et il prolonge l'A1. Le tableau est dans
  `TASKS.md`, pour les suivants.
- **UNE VILLE ENGENDRÉE SE REJOINT PAR L'AXE DE SA TRAME.** Elle n'a pas
  d'avenue d'entrée, mais la rue qui passe par l'ancre va jusqu'au bord. Le
  point de passage se pose sur cet axe, et la porte tombe alors sur la rue.
  Et la profondeur de la porte (`bord`, par ville, dans la fiche de la route)
  se MESURE : à vingt blocs du bord, l'axe de Bruxelles est un anneau de
  verdure et de lots, où les voitures auraient fini dans un parc.
- **UNE ENTRÉE SE TERMINE SUR UNE VOIE NOMMÉE, JAMAIS SUR UN LIEU.** Mon
  premier jet visait Euralille, et l'avenue finissait dans la tour de Lille.
  Un lieu porte souvent un monument ; un carrefour de deux voies nommées,
  jamais. **Et le témoin qui le garde lit les BLOCS à hauteur de
  carrosserie, pas la boîte du repère** : ma première version accusait
  l'entrée de l'A1, qui finit sur la rue du pourtour de la Porte de Paris (le
  socle plein fait ±3, la boîte ±7) — la leçon de la v223, que j'avais écrite
  moi-même, oubliée le jour où j'ai écrit un témoin neuf.
- **UNE LISTE QUI N'AVAIT QU'UN ÉLÉMENT CACHE UN `[0]`.** `main.js` prenait la
  première entrée de chaque ville : juste tant que chaque ville avait une
  route, faux dès la deuxième. Quand on ajoute le second élément d'une liste,
  on cherche le jour même qui lisait le premier (`grep -n "\[0\]"` autour de
  la liste). Les témoins de route qui lisent `segmentsDeRoute()[0]` éprouvent
  l'A1, à dessein ; ceux qui bouclent éprouvent toutes les routes.

## Le fondu doux (v309) — on mesure dans quel SENS un défaut va avant de choisir le remède

La dette de la v308, remboursée sur « Fait tout ». Quatre règles.

- **UN DÉFAUT QUI VA DANS UN SEUL SENS APPELLE UN REMÈDE À SENS UNIQUE.** Sur
  les 653 rayons raides, 651 étaient une ville SOUS son pays, deux au-dessus.
  Un fondu symétrique aurait remonté la mer au bord des villes côtières (une
  rampe dans l'eau, une côte déplacée) pour régler deux rayons. Le cône
  n'abaisse donc que (`coneDesVilles`, villesmonde.js), et là où le fondu
  d'avant tenait déjà la pente il ne change rien au bloc près. Les deux
  rayons restants sont déclarés, pas « à régler plus tard ».
- **LA PENTE D'UN FONDU EST UN RÉSULTAT, ET ON LE MESURE EN MARCHES, PAS EN
  COLONNES.** Marches de deux blocs dans la couronne : 46 856 avant ; 22 152 à
  0,7 ; 23 611 à 0,85 ; 25 311 à 1,0 — le reste est la montagne elle-même, qui
  en a autant avant qu'après. Compter les colonnes touchées (393 000 contre
  118 000) aurait choisi 1,0 pour la mauvaise raison : la casse est bornée
  par la GÉOGRAPHIE (rien dans la fenêtre, rien près des sanctuaires), pas par
  un nombre.
- **UNE CONFIGURATION DE MONDE SE FIGE À CHAQUE CASSE, ET LA MARCHE D'AVANT
  ATTERRIT SUR ELLE.** `CONF_V308` est `CONF_NEUF` sans le fondu doux, figé ;
  la marche 5 → 6 (Paris doublé) lit désormais le relief de ce monde-là, sinon
  un bloc emmené par Paris doublé dans une couronne serait décalé une seconde
  fois par la 6 → 7. **Quand une marche s'ajoute, la précédente cesse de viser
  « aujourd'hui »** : elle vise le monde où elle a été jouée.
- **LA DATE D'UNE MARCHE QUI SE REJOUE AU NUAGE NE SE MET PAS EN AVANCE.** Un
  bloc daté d'avant `DATE_FONDU_DOUX` est déplacé à CHAQUE fusion ; une date
  postérieure à la publication déplacerait deux fois ce qu'un enfant pose sur
  le monde neuf entre les deux. Elle s'écrit à l'heure de la fusion, jamais
  avant d'écrire la PR.

**Et le toit du vol se tient sur le PAS.** On ne bornait la montée qu'une fois
le toit atteint : une image lente emportait l'enfant d'un bloc au-dessus (159
pour 158). `sousLeToit` borne la vitesse à ce qui reste jusqu'au toit —
« un minimum échantillonné est une propriété de la cadence » (v279), côté jeu,
une fois de plus.

## Le raccord ville/campagne (v308) — le sol d'une ville rejoint la surface là où le relief change

Max : « Improve all cities ». Premier point du kit v4 après le rail. Quatre
règles.

- **ON MESURE CE QUE L'ENFANT RENCONTRE EN MARCHANT, PAS UNE CLASSE DE
  COLONNE.** Ma première sonde comptait les transitions « naturelle ↔ voxel »
  avec une dénivelée ; elle confondait le seuil de la ville, les murets et les
  falaises du fondu. La grandeur juste est la hauteur où l'on POSE LE PIED —
  la surface continue, ou le dessus du cube que rien ne tait — tous les
  dixièmes de bloc le long d'un rayon, et un seuil traversé par un bâtiment ou
  par l'eau ne compte pas. C'est elle qui a dit « un seuil sur trois » et qui
  garde le témoin.
- **LE RACCORD NE VAUT QUE LÀ OÙ LE RELIEF CHANGE, SUR DEUX RANGS.** Une rue
  à plat passée à la surface perdrait son occlusion au pied des murs et
  décalerait ses marquages d'un demi-bloc (une cellule prend la tuile de UNE
  colonne). À un seul rang de part et d'autre du ressaut, la colonne du haut
  n'est pas COUVERTE : son cube garde son flanc et la rampe passe dessous, un
  demi-bloc de mur au milieu de la pente. Deux rangs (`RAYON_RACCORD`), et une
  différence de cote d'un ou deux blocs dans la fenêtre — le reste est une
  falaise, que `MARCHE_MAX` garde.
- **LE SOL DE VILLE DOIT ÊTRE À `terrainHeight`.** C'est ce qui garde
  l'invariant 1 par construction : la surface passe au centre de la colonne, à
  la cote où l'enfant marchait déjà. Un sol surélevé (un plancher, un quai)
  reste voxel. Rien n'est écrit, `terrainHeight` n'est pas touché : les deux
  empreintes de `plafond.js` ne bougent pas, sans rien déclarer.
- **CE QUI A SA COUCHE HD NE PASSE PAS À LA SURFACE.** Le mailleur tait le
  cube d'une colonne couverte ET son sol HD : dans Paris, 12 288 colonnes de
  pourtour auraient perdu leur asphalte HD pour la tuile plate. Paris est
  exclu en entier (`world.raccordInterdit`) — et son seuil n'avait pas de
  marche, son fondu est DANS le disque. La règle lit la GÉOGRAPHIE, jamais le
  palier : un sol qui changerait de forme avec la qualité changerait la
  hauteur des pieds d'une tablette à l'autre (v297).

**Ce qui reste, déclaré** (`TASKS.md`) : les fondus plus raides qu'un bloc par
bloc — une ville posée dix-huit à vingt-huit blocs sous son pays (Salvador,
Bari, Jakarta, Busan…), 4 % des seuils. La surface ne peut pas y dessiner
(deux blocs dans une cellule, c'est un mur), et les adoucir élargit le fondu
hors du disque : c'est le relief qui bouge, donc une décision de Max.

## Les rues du monde à la règle du kit (v307) — une règle écrite pour une ville se cherche dans toutes

Max : « Pourquoi tu n'as pas fait le reste du monde ? » Son kit visait la carte
entière ; la v303 n'avait passé que Paris à `roadSection`. Cinq règles.

- **UNE RÈGLE DU KIT APPLIQUÉE À UNE VILLE EST UNE DETTE POUR LES AUTRES, ET
  ELLE SE DIT LE JOUR MÊME.** C'est le verre dans les murs une septième fois —
  la PORTÉE du remède, jamais la règle — et cette fois c'est Max qui l'a vue.
  Les 262 villes à trame lisent désormais `voirie.js` (`RUE_VILLE` collectrice,
  `BOULEVARD_VILLE` pour la croix) ; restent hors règle, DÉCLARÉES : les médinas
  (la section `ruelle` leur ôterait leurs réverbères — décision de Max) et les
  cinq villes bâties à la main (une passe par ville, trame figée, comme Paris).
- **ON RECOMPOSE LES LOTS, ET LA COURONNE SUIT LE PAS.** Mesuré sur les 262
  villes : pas seul agrandi 18,2 → 14,5 % de part bâtie (la cour grandit), pas
  gardé et îlot à sa largeur (méthode v294) 14,7 %, pas ET couronne dans le
  rapport des emprises 18,4 %. Les valeurs de `TYPOS` sont en unités de la
  v271 et ne donnent plus que le rapport, comme les `pas` de `paris.js`.
- **LE TYPE D'UNE RUE SE LIT À SA FONCTION, ET LA CROIX CENTRALE AUSSI.** Un
  boulevard à quatre voies dans une ville de moins de soixante-dix blocs de
  rayon coûtait un tiers des immeubles du faubourg (15,3 → 10,6 %) : la croix
  n'est un boulevard (`t.axe`) que dans une grande ville ET là où le lot qui la
  borde garde cinq blocs. Tout ce qui lit un lot le lit depuis son FRONT BÂTI
  (`auFront`) ; le mobilier lit la section de CHAQUE direction.
- **UN CHIFFRE ÉCRIT « DEPUIS L'AXE » MEURT QUAND LE TROTTOIR BOUGE.** Le
  chanfrein de l'Eixample valait 5,0 depuis l'axe de la rue : trois blocs de
  coin coupé quand le trottoir finissait à 2,55 (v172), deux dixièmes quand la
  v271 l'a porté à 4,8. Barcelone a vécu trente-six versions sans ses coins
  coupés, et aucun témoin ne regardait. Une cote se donne depuis ce qu'elle
  touche — ici le bord du trottoir.
- **UN ÉLARGISSEMENT DE PAS SE PAIE EN ANNEAUX, ET LE PRIX SE MESURE VILLE PAR
  VILLE.** Les candidats d'anneau sont des fractions du rayon arrondies au pas :
  un pas plus grand les fait tomber sur les mêmes rectangles. 602 → 440
  anneaux, et QUATRE villes n'en avaient plus aucun — trois superîlots de 47
  blocs de rayon (le coin d'un anneau d'un pas à 45,3 blocs pour 45 permis) et
  Mumbai, presqu'île. Le remède est double : les quatre sont nommées dans
  `TISSU` avec leur vrai tissu (la raison de la v280, pas un réglage), et un
  DERNIER RECOURS essaie les petits anneaux posés sur les nœuds de la trame
  pour une ville sans anneau. **Étendre ce recours à toutes les villes est un
  non-résultat mesuré** (440 → 451) : on ne le réessaie pas. Et ma première
  idée — « pas de superîlot dans une ville moyenne » — changeait 49 villes
  (Doha, Houston, Dallas…) pour en sauver trois : une règle se mesure à ce
  qu'elle touche AVANT de s'écrire.

## Paris doublé et déplacé (v306) — un bloc se juge sur le monde où il a été posé

Décision de Max, entre trois propositions chiffrées : « Doubler Paris,
déplacé ». Les rues à la règle du kit (v303) faisaient vingt et un blocs pour un
boulevard dans un disque de cent quatre-vingt-cinq : Saint-Germain passait de
168 colonnes d'immeubles à 2. Livré dans la MÊME fusion que les v303, v304 et
v305 (« attends et fais un méga merge ») : la rive gauche vide ne devait jamais
atteindre la famille. Neuf règles.

- **ON N'AGRANDIT PAS SUR PLACE CE QUI RECOUVRIRAIT LES ENFANTS : ON DÉPLACE, ET
  LA PLACE SE MESURE.** Doublé sur place, le disque couvrait le point
  d'apparition, le musée et le quartier des enfants. Le centre part de cent
  soixante-dix blocs vers le sud-ouest, là où le disque de 370 en reste à 50
  (musée), 108 (point d'apparition), 121 (maison témoin) et 124 (quartier).
  C'est la seule ville dont la place n'est pas sa latitude : la surcharge vit
  dans SA fiche du registre (`terre: { r, dx, dz }`) et ne vaut que pour la
  carte courante — `terreV3` garde la carte telle qu'elle était, pour la
  marche 2 → 3, qui aurait sinon pris Paris pour une ville qui bouge en v242.
- **CE QU'ON DÉPLACE SE CHERCHE DANS TOUTES LES LISTES, PAS SEULEMENT CELLES QU'ON
  A EN TÊTE.** Mon plan, annoncé à Max, comptait trois aérodromes à reloger et
  les sanctuaires ; l'inventaire du dépôt (un agent de recherche, avant d'écrire)
  a trouvé DANS le nouveau disque le village gaulois et le volcan, qui ne sont
  ni des villes ni des aérodromes mais des `PLACES`, et la caserne, dont
  l'adresse en kilomètres l'emmenait à deux fois sa distance. Chacun a été
  relogé par la sonde des aérodromes (v223) ; le village est parti à Erquy, en
  Armorique, où son commentaire l'avait toujours voulu.
- **UNE ADRESSE QUI SUIT LA VILLE GARDE LE LIEN, PAS LA QUALITÉ DU SITE.** La
  caserne (v293) est en kilomètres pour suivre Paris : doublée, son adresse
  tombait sur 5,9 % d'eau et dix-huit blocs d'écart. Un site qui suit une ville
  qui change d'échelle se remesure.
- **LE PLAN DOUBLE, LES LARGEURS NON — ET UN JARDIN EST DU PLAN, UNE PLACE NON.**
  `BLOCS_PAR_KM` passe à 48 : tout ce qui est en kilomètres suit. Les rues
  gardent la section du kit (v303) ; la Seine, les îles, la butte (en emprise,
  pas en hauteur) et les jardins doublent, parce que ce sont des étendues de
  géographie ; les places gardent leur rayon, parce qu'elles sont dimensionnées
  sur ce qui y roule. Mesuré quartier par quartier : tous au-dessus de la v302.
- **UN BLOC SE JUGE SUR LE MONDE OÙ IL A ÉTÉ POSÉ — et c'était déjà faux en
  v303.** Le ménage du ciel (v298) et le relevé des toits (v301) se rejouent sur
  chaque document du nuage ; ils lisaient `new World()`, c'est-à-dire le relief
  et les monuments d'AUJOURD'HUI. Paris déplacé, une maison posée au sol de
  l'ancienne butte se trouvait « en l'air » au-dessus du relief neuf, et le
  ménage la retirait — vérifié : zéro bloc arrivé avec un ménage sur le monde
  neuf, trois avec le monde d'avant. `CONF_AVANT` (world.js) porte TOUT ce que la
  v306 a déplacé — disque, relief et trame de Paris, monuments, aérodromes,
  sites — et `new World({ avant: true })` l'engendre ; deux empreintes relevées
  sur `origin/main` prouvent qu'il rend la production au bloc près. Il ne se met
  JAMAIS à jour, comme `MONDES.terreAvant`. Et `dansUneZoneATerre` a un index
  par monde : `hauteurBase`, que lisent les marches 1 → 2 et 2 → 3, juge avec
  les zones d'avant, sinon un bloc d'avant la carte 3 resté à sa place serait
  redéplacé le jour où sa colonne sort d'une zone.
- **UN BLOC SUIT SA VILLE, MÊME QUAND ELLE SE DILATE.** La marche 5 → 6
  (`migrerParisDouble`) groupe les blocs d'avant la date (six voisins) ; un
  groupe de l'ancien Paris va là où le plan doublé met le même endroit de la
  vraie ville (`C' + 2 × (ancre − C)`), à la même hauteur au-dessus du sol, et
  ce qui était perché sur un ancien toit se pose au sol ; un groupe d'un site
  déménagé le suit d'un seul tenant ; ailleurs, il suit le relief (≤ 24 blocs).
  Un trou creusé dans un ancien immeuble part avec l'immeuble. Pure, idempotente
  par la date, appliquée au stockage une fois et à chaque document du nuage,
  EN DERNIER dans la chaîne ; sa copie d'avant se prend sur le nuage
  (`~avant-paris-double`).
- **LA VILLE CÈDE — ET CELA REMPLACE LA VILLE D'AVANT DE LA v303.** La v303
  gardait l'ancienne trame sous les colonnes bâties ; Paris déplacé, l'ancienne
  ville n'a plus de place où se garder. Là où un groupe arrive (colonne et huit
  voisines, `colonnesCedees`), le nouveau Paris garde sa rue, son trottoir, son
  jardin, et fait d'un lot une cour pavée. Un bloc posé APRÈS la date ne fait
  pas céder la ville : poser un bloc contre une façade ne démolit pas
  l'immeuble.
- **UN BOUT DE ROUTE NE SE POSE PAS SUR L'EAU.** L'A1 retracée — mon premier
  choix, la plus grande plus petite marge — finissait par un pont à quinze
  blocs de la porte de Lille, que le témoin du joint (v302) a trouvé ouvert sur
  1 180 points. La sonde de tracé écarte désormais l'eau à moins de
  quatre-vingts blocs des deux portes, et l'on garde, parmi les meilleurs, un
  tracé dont les trois ponts ont leurs joints fermés.
- **UNE VOITURE FABRIQUÉE EST AUSSI UNE SIGNATURE DE PROGRAMME.** La table de
  chauffe (`signatures.js`) se lit dans les FICHIERS de la flotte ; la berline
  citadine se fabrique et n'y figurait pas, donc ses programmes se compilaient
  à l'arrivée dans chaque ville où le tirage en mettait une à portée — une
  voiture sur six, en production depuis toujours. Déplacer Paris a changé le
  tirage (`graineDeVille` lit la position) et l'a rendu visible. La chauffe
  compile désormais le PROTOTYPE fabriqué lui-même (`chaufferLesFabriquees`) :
  tout modèle qui entre dans la flotte par `fabrique` y passe sans une ligne de
  plus, et le compte affiché ne bouge pas. Même trou pour les FEUX : aucun
  n'est à portée du point d'apparition, leurs lentilles se compilaient à la
  première ville. **Et `renderer.compile(t, camera, n)` compile les matériaux
  de `t` avec les lumières de `n`** dans cette version de three : j'ai
  d'abord passé la scène en premier et le feu en troisième — rien compilé,
  et vingt-sept programmes de plus vers la cible des reflets. C'est une sonde
  qui comparait les deux clés d'un même matériau qui l'a dit : on lit la
  ligne de la bibliothèque avant de croire une signature de mémoire.
- **QUAND UN SITE DÉMÉNAGE, LES TÉMOINS POSÉS SUR SON ANCIEN SOL MESURENT AUTRE
  CHOSE.** La pente « relevée sur l'axe Paris–Lille » du sol continu (v297)
  était le bord aplani de l'ancien Roissy ; la fenêtre de la ligne Paris–Lyon
  longe désormais un lac ; la première pente couverte trouvée tombait sur l'A1
  retracée. Chacun CHERCHE maintenant ce qu'il éprouve — une pente qui MONTE de
  huit marches, une colonne couverte, les colonnes au bord d'une falaise
  comptées à part — et le dit (v285, une fois de plus).
- **UNE CONSTANTE DE RECHERCHE ÉCRITE POUR LES RUES D'AVANT NE TROUVE PLUS RIEN
  DANS LES RUES D'APRÈS.** `world.js` cherchait les coins d'un carrefour à
  sept blocs du croisement (v274) ; les boulevards de la v303 ont treize à
  dix-sept blocs de chaussée, et DOUZE carrefours de Paris sur quarante-quatre
  n'avaient plus un feu. Aucun témoin ne l'a vu en v303 : celui des feux
  comptait une fenêtre de quarante blocs autour du centre, qui tombait sur des
  rues étroites. La portée se DÉDUIT de la plus large section de la ville
  (`PORTEE_FEUX_PARIS`), et un témoin compte les carrefours sans feu. Quand
  une largeur change, on cherche TOUT ce qui cherche quelque chose « à n blocs
  de la rue » — c'est le verre dans les murs, une fois de plus, du côté d'un
  rayon de recherche.
- **UN RACCORD QUI TIENT PAR UN ARRONDI TOMBE AU PREMIER CHANGEMENT
  D'ÉCHELLE.** Un circuit passait de Diderot au Faubourg Saint-Antoine parce
  que le point (84, 21) de l'un était pile sur la droite de l'autre ; doublé,
  Nation tombe en (192, 49) au lieu de (192, 50), le raccord devient une
  impasse et `chainerVoies` jette le circuit sans un mot. Le témoin de
  couverture l'a vu (« huit déclarés, sept gardés ») — ce que garde un compte
  déclaré contre un compte rendu. Un circuit se raccorde là où deux voies se
  croisent ou finissent, jamais sur une coïncidence de coordonnées.

## Le GPS (v306) — l'appui long propose, il ne décide plus

Max : « soit on se téléporte, soit on fait GPS ; au clic long, deux boutons ».
Quatre règles.

- **UN GESTE QUI AVAIT UN SEUL EFFET ET EN GAGNE DEUX POSE LA QUESTION.**
  L'appui long téléportait d'office ; il ouvre désormais `#map-choix` sous le
  doigt, et c'est l'enfant qui choisit. Tout témoin qui éprouvait l'ancien
  geste passe par le bouton (« un appui long dépose n'importe où » clique
  « Téléporter ») — un témoin qui appellerait `surTeleport` en direct ne
  garderait plus le trajet de l'enfant. Et un doigt reposé ailleurs retire la
  question : une question qui reste affichée est un piège au geste suivant.
- **LA FLÈCHE LIT LA CONVENTION DE CAP DU CADRAN, ELLE NE LA RÉÉCRIT PAS.**
  `gps.js` est pur et importe `capVers` et `ecartDeCap` de `cap.js` (v263) :
  deux conventions de cap finiraient par diverger, et une flèche à l'envers
  passe toute mesure d'amplitude. Le témoin regarde les TROIS cas — face à la
  cible, cible à droite, cible à gauche — et lit l'angle APRÈS la transition
  CSS de la flèche : lu pendant, il rend l'image d'avant (mon premier jet).
- **L'ARRIVÉE SE JUGE SUR LE SEGMENT PARCOURU, PAS SUR UN INSTANTANÉ.** Un avion
  à cent vingt blocs par seconde sur une tablette à cinq images avance de
  vingt-quatre blocs d'une image à l'autre : il enjambe un disque de douze sans
  qu'aucune image ne l'y trouve, et la flèche se retournerait pour le renvoyer
  en arrière. `arriveEntre` mesure la distance de la cible au segment. C'est
  « un minimum échantillonné est une propriété de la cadence » (v279), côté jeu.
- **UN TRAJET VIT DANS LA SESSION, PAS DANS LE PROFIL.** La destination n'est
  ni sauvegardée ni envoyée au réseau : c'est un trajet en cours, pas une
  donnée de l'enfant, et elle s'efface en revenant au menu. Le jour où l'on
  voudra la partager avec un ami, ce sera un message de plus, avec son nom à
  lui — le receveur cède (v256).

## En ligne, une seule rue (v305) — la position d'un convoi est une fonction de l'heure

Max, à plusieurs : « les utilisateurs ne voient pas les mêmes voitures en même
temps ; quand on monte dans une voiture, elle change de couleur ». Cinq règles.

- **CE QUI DOIT ÊTRE PAREIL SUR DEUX TABLETTES NE S'ACCUMULE PAS, IL SE
  CALCULE.** Un convoi faisait `distance += vitesse × dt` depuis que SA page
  l'avait créé — c'est-à-dire depuis que l'enfant avait approché la ville :
  deux enfants au même carrefour avaient deux rues. La position est désormais
  `distanceA(horloge)`, une grille horaire calculée une fois (droite, paliers
  aux quais, et pour `freine` la marche d'avant simulée sur un tour au pas d'un
  vingtième — la monoplace freine exactement comme avant). L'hôte donne l'heure
  de la rue avec celle du ciel (`rue` dans le message `ciel`) ; l'invité glisse
  ou saute, la règle d'`adopterCiel`. Un saut d'horloge n'est pas une avance :
  on se pose, et les retards de ceux qui cédaient repartent de zéro.
- **L'HEURE DE LA RUE EST RÉELLE, et les feux la lisent.** Les feux étaient déjà
  en temps réel (v273), chacun sur SA `performance.now()` : deux amis voyaient
  deux feux. Une grandeur que deux tablettes doivent partager ne se lit jamais
  sur une horloge locale.
- **UN RANG DANS UNE LISTE PARESSEUSE N'EST PAS UN NOM.** Les convois naissent
  quand l'enfant approche une ville : `convois[ci]` n'est pas le même d'une
  tablette à l'autre. Ce qui voyage sur le réseau se nomme par ce qui ne dépend
  que du tracé (`c.cle`), et une voiture prise par `clé#rang`.
- **ON NE RETIRE PAS UNE PLACE D'UN CONVOI.** `emprunter` faisait un `splice` :
  toutes les voitures de derrière avançaient d'un écart sous les yeux de
  l'enfant, et les rangs cessaient d'être les mêmes. La place reste, marquée
  prise (`c.pris`) — ni refabriquée, ni dessinée, ni prise en compte pour céder.
- **UNE PROPRIÉTÉ QUI SE VOIT VOYAGE AVEC CE QUI LA PORTE, ET SE PEINT PAR UNE
  SEULE RÈGLE.** La rue repeignait sa voiture ; la monture neuve reprenait la
  teinte du fichier. `repeindre(modele, fichier, teinte)` est lue par la rue et
  par la monture, `peinture` passe de l'une à l'autre et part dans `p.v.c` ;
  c'est la leçon de la v194 (« le modèle part avec elle ») appliquée à la
  couleur, trente versions plus tard.
- **ET TOUT JOUEUR EST UN OBSTACLE POUR LA RUE, PAS SEULEMENT L'ENFANT
  D'ICI.** `cederLePassage` ne connaissait que le joueur local (v245) : sur la
  tablette d'Alice, la voiture de Marlon était traversée. Les amis entrent dans
  la liste (`brancherAmis`), avec la même patience infinie que l'enfant — et
  c'est aussi ce qui rend la circulation la même partout, puisque chacun cède
  aux mêmes joueurs. Ce qui reste local, et se déclare : l'instant exact où
  une voiture cède, et un train arrêté devant un enfant.
- **UN MAILLAGE ENFANT N'A PLUS DE POSITION DU MONDE.** Depuis la v253 l'avatar
  d'un ami au volant vit dans le maillage de la voiture ; tout ce qui lisait
  `rp.mesh.position` (la minicarte, la carte du monde) lisait le siège, à un
  bloc de zéro — Max : « la position sur la carte n'est pas toujours à jour ».
  La position vraie est `rp.pos`, et c'est la seule qu'on lit hors du rendu.
  Quand on reparente un objet, on cherche le jour même qui lisait sa position.
- **UN TÉMOIN À DEUX TABLETTES LIT LES DEUX AU MÊME INSTANT, ET IL PROVOQUE
  LA RENCONTRE.** Trois des quatre témoins étaient VERTS sur l'ancien code au
  premier jet. L'écart de rue lisait Marlon puis Alice, deux `evaluate` à la
  suite, sur un banc qui rend deux images par seconde : il mesurait la cadence
  (on horodate désormais chaque relevé et l'on ramène à la même heure). Celui
  de la traversée a eu SIX versions : posé en ligne droite, Marlon ne croisait
  personne ; posé devant une voiture, elle était déjà dedans. La sixième pose
  Marlon SUR la voie d'une voiture qui roule, attend qu'Alice le voie arrivé,
  et suit la voiture d'après — 0 s de retard sur l'ancien code, 19 s sur le
  neuf. **Et un compte qui vaut 1 des deux côtés sort du verdict et reste
  dans le message** : une autre voiture entre encore une fois dans celle de
  l'ami, sur les deux codes. Un témoin annonce ce qu'il mesure ; ce qu'il ne
  prouve pas va dans `TASKS.md`, avec ses pistes.
- **UN RACCOURCI DE PAGE N'A PAS LA SIGNATURE DE LA FONCTION QU'IL ENVELOPPE.**
  `window.__vehicules.placeProche(rayon)` fournit lui-même la position de
  l'enfant ; la fumée l'appelait `(g.player.pos, 5)`, comme le vrai
  `vehicules.placeProche(pos, rayon)`. Le vecteur devenait le rayon, `d > rayon`
  rendait toujours faux, et le témoin « on prend le volant » cliquait pour la
  voiture la plus proche DU MONDE — vert pendant des dizaines de versions parce
  qu'une voiture passait par chance à portée du premier circuit de Paris, rouge
  le jour où Paris doublé a déplacé ce circuit. Une sonde (`place.d` = 139 pour
  un rayon de 5) l'a dit en une exécution. Devant un appel à `window.__…`, on
  lit la ligne qui l'expose, jamais la fonction qu'on croit derrière.

## Le son robotique de la visio (v304) — le contexte audio suit le mode de la tablette

Max : « Alice… entend un son hyper robotique de son côté sur son iPad. Ça
n'arrive pas avec tous les appareils. » Trois règles.

- **UN CONTEXTE AUDIO NE SURVIT PAS À UN CHANGEMENT DE MODE D'iOS.** Un appel
  qui porte du son (le micro ouvert, ou la voix d'un ami) fait passer la
  session audio en mode appel, et sur certains iPad à une autre fréquence
  d'échantillonnage. Le contexte Web Audio du jeu, ouvert avant, reste à
  l'ancienne et se rééchantillonne mal : c'est le robot. `appelEnCours`
  (sons.js) ferme le contexte et en ouvre un neuf à chaque bascule, dans les
  deux sens, et relance le moteur et la radio qui jouaient. `sons.js` reste le
  SEUL propriétaire du contexte (v268) : c'est ce qui rend ce geste possible
  en un endroit. `visio.js` dit quand un appel porte du son (`micOuvert`, et les
  voix d'amis qu'il joue).
- **PENDANT UN APPEL, LE JEU PARLE PLUS BAS.** L'annulation d'écho ne connaît
  que la voix que la tablette joue ; une radio pleine puissance dans le
  haut-parleur est un écho qu'elle découpe. `GAIN_APPEL` (un quart) ne coupe
  rien : l'enfant entend encore son jeu.
- **CE QUE LE BANC PROUVE, ET CE QU'IL NE PEUT PAS.** Chromium n'a pas de mode
  appel : le banc éprouve le GESTE (un contexte neuf, l'ancien fermé, un niveau
  de sortie qui baisse puis revient, lu sur la sortie comme en v268), jamais
  l'oreille. La correction se juge sur l'iPad d'Alice, et on le dit.

## Les rues de Paris à la règle du kit (v303) — une largeur se calcule, et la ville d'avant se fige

Max : « Les rues de Paris sont encore beaucoup trop étroites. Je comprends pas.
T'as pas appliqué le code à la règle. » Le kit livrait `roadSection` ; j'avais
lu le kit, mesuré l'état initial, et laissé Paris sur les largeurs choisies à
la main en v294. Six règles.

- **QUAND LE KIT LIVRE UNE RÈGLE EXÉCUTABLE, ON L'EXÉCUTE — ON NE LA
  RÉINTERPRÈTE PAS À LA MAIN.** `voirie.js` est `roadSection` recopié sans une
  valeur changée, pur, sans import ; `paris.js` lui DEMANDE ses sections. Une
  largeur écrite à côté de la règle finit par la contredire, et c'est
  exactement ce que Max a vu.
- **LE TYPE D'UNE RUE SE LIT À SA FONCTION, PAS À SON NOM.** Mon premier jet
  donnait quatre voies à tout ce qui s'appelle boulevard ou avenue : vingt-sept
  boulevards de 21 blocs dans un disque de 370, et Paris perdait 40 % de ses
  immeubles (Saint-Germain de 9,5 % de lots à 0,4, l'Étoile à zéro). Le kit
  classe par NOMBRE DE VOIES : quatre pour les neuf percées de premier rang
  (`PREMIER_RANG`), deux pour les autres rues, une pour les ruelles héritées.
- **SI L'ÉLARGISSEMENT MANGE LES BÂTIMENTS, ON RECOMPOSE LES LOTS — la trame
  entière suit.** Garder l'îlot tel quel (la méthode de la v294) coûtait un
  tiers des immeubles : onze blocs d'îlot pour onze de rue. Le pas grandit dans
  le rapport des emprises (`aLaRegle`), la part bâtie reste à 21,6 % contre
  22,6, et un témoin la garde (barre 17). Moins de rues, plus larges, des îlots
  plus grands — c'est l'échelle 1 bloc = 1 m qui s'installe.
- **UNE MIGRATION QUI SE REJOUE LIT LA VILLE OÙ LE BLOC A ÉTÉ POSÉ.** Le relevé
  des toits (v301) se rejoue à chaque fusion du nuage et demandait
  `lotParisLibre` et `gabaritParis` à la trame COURANTE : retramer Paris lui
  aurait fait déplacer des blocs qui n'ont jamais été sur un toit. La trame
  d'avant est figée dans `paris-v302.js`, recopiée à l'octet et jamais
  modifiée — la discipline de `MONDES.terreAvant` (v199). **Toute règle de
  migration qui lit le générateur doit dire QUELLE version du générateur
  elle lit** ; la prochaine refonte de Paris fige `paris.js` à son tour.
- *(Remplacée dans la même fusion par la v306 : Paris déplacé, c'est la ville
  NEUVE qui cède. Le raisonnement reste.)* **LA VILLE CÈDE À CE QUE L'ENFANT A BÂTI, COLONNE PAR COLONNE.** Une colonne
  où un bloc a été posé ou creusé avant `DATE_RUES_PARIS` garde la ville
  d'avant (`colonnesParisAvant`, refait avec l'index des monuments touchés,
  tenu par `setBlock`) : une maison sur une ancienne rue n'est pas enfermée
  dans un immeuble neuf, une cabane sur un ancien toit garde son toit. Aucun
  bloc d'enfant ne bouge. Le prix se déclare : un morceau de l'ancienne ville
  au milieu de la neuve autour de chaque construction.
- **UNE BARRE SUR UNE LARGEUR EN COLONNES SE CALCULE AVEC SA QUANTIFICATION.**
  Une chaussée de 6,4 blocs se traverse en six ou sept colonnes : la barre du
  témoin est `floor(6,4)`, et la mesure vaut 6 ici contre 4 sur `origin/main`.
- *(Depuis la v306 le ménage juge sur le monde d'avant tout entier, `CONF_AVANT`.)*
  **UNE VILLE FIGÉE SOUS UNE COLONNE SE DÉCLARE À TOUT CE QUI ENGENDRE LA
  VILLE, PAS SEULEMENT AU JEU.** Le ménage du ciel (v298) juge l'appui d'un
  bloc sur un monde SANS blocs d'enfant qu'il engendre lui-même ; ce monde-là
  ignorait `colonnesParisAvant` et montrait la ville NEUVE sous une colonne où
  le jeu montre l'ancienne. Mesuré sur le témoin du relevé : le bloc collé à
  la façade d'une cabane, et celui posé contre le mur voisin, jugés « en
  l'air » et retirés. Le générateur du ménage reçoit désormais les colonnes
  d'avant du document (même règle, `dansParisAvant`), et se refait quand elles
  changent. C'est la leçon du sol continu (« ce qui remplace un bloc le dit à
  TOUS ceux qui lisaient le bloc ») appliquée à une trame.
- **ET CE QUI PORTAIT UN BLOC N'EST PAS DANS SA COLONNE.** Un escalier contre
  un mur, un balcon : le bloc est dans la colonne de la RUE, l'immeuble dans
  celle d'à côté. Garder la seule colonne du bloc laissait l'immeuble passer à
  la ville neuve, où il pouvait devenir une rue — le bloc flottait, et le
  ménage le retirait. La ville d'avant se garde donc sur les huit colonnes
  voisines (`marquerParisAvant`), au jeu comme au ménage ; un témoin de
  `plafond.js` colle un bloc contre une façade d'avant qui devient une rue, et
  lit le mur (rouge sans la règle : de l'air).
- **UN QUARTIER PLUS PETIT QUE SES PERCÉES N'A PLUS D'IMMEUBLES, ET CELA SE
  COMPTE QUARTIER PAR QUARTIER.** La part bâtie de la ville (22,6 → 21,6 %)
  cachait que le Marais passe de 41 colonnes de lot à 2, Saint-Germain de 168
  à 2 : un disque d'un kilomètre traversé par deux percées de vingt et un
  blocs. Agrandir leurs disques de trois quarts n'y change rien (mesuré). Le
  prix est déclaré et Paris doublé le rend ; un total de ville ne dit jamais ce
  qu'un quartier a perdu.
- **ET QUATRE TÉMOINS MESURAIENT À CÔTÉ, POUR UNE MÊME RAISON : ILS ÉCRIVAIENT
  LEUR TERRAIN** (v285). Le morceau le plus bâti n'a plus de carrefour, donc
  plus de passage piéton ; le Marais n'a plus d'immeubles ; un immeuble creux
  de la v301 a son toit à vingt-quatre blocs pour un témoin qui lisait vingt ;
  la fenêtre de la rue était centrée sur la Seine. Chacun cherche désormais ce
  qu'il éprouve, et dit où il l'a trouvé.

## Le rail continu (v302) — quatre lecteurs, une cote flottante

Quatrième livraison du programme « monde fidèle », la première du kit
transport de Max (`transport-v298`, priorité 1). Cinq règles, et la première
est celle que la v297 avait ratée sans le savoir.

- **UN CORRIDOR QUE LE SOL CONTINU NE CONNAÎT PAS EST UN COUVERCLE.** La
  surface de la v297 lisait `terrainHeight` partout hors des villes ; la voie
  ferrée est un OUVRAGE (v213) dont la cote est un profil lissé, tantôt sous
  le relief (tranchée), tantôt dessus (remblai). Sur toute tranchée, la
  surface passait donc au relief, un couvercle d'herbe AU-DESSUS des rails, et
  le train roulait dessous — mesuré sur le TGV Paris–Lyon : 0 colonne juste
  sur 439 en déblai ou remblai. La v300 avait branché la route dans
  `ficheColonne` et `grilleSol` ; la voie ferrée, bien plus vieille (v213),
  n'y était pas. C'est le piège du verre dans les murs — la PORTÉE du remède,
  jamais la règle — et il vaut pour tout ouvrage à venir : **`world.corridorEn`
  est le seul point où le sol continu demande « y a-t-il un corridor ici ? »**,
  route ou rail, et un ouvrage neuf s'y déclare ou n'existe pas pour la
  surface.
- **UNE COTE, QUATRE LECTEURS — ET LE GÉNÉRATEUR GARDE SON ENTIER.** Le kit
  le dit (« ne pas retirer `Math.round` de `voieEn` tant que `world.js` s'en
  sert comme indice de tableau voxel ») : `voieEn` publie `cote`, flottante,
  la surface où l'on marche, ET `bloc`, entière, le bloc de ballast que le
  générateur écrit (`floor(cote) − 1`). Le mailleur (`rubansVoieDans`), la
  gare (`gareEn`) et le convoi (`traceSegment`) lisent `coteContinue` ; un
  témoin de `plafond.js` exige que le train soit à `cote + RAIL_HAUT + ROUES`
  sur chaque pas, à 10⁻⁶ près. Le `+ 2.05` de la v179 est parti avec la
  marche d'un bloc qu'il portait.
- **CE QU'ON RETIRE DU VOXEL EST CE QUE LE MAILLEUR REMPLACE, ET RIEN DE
  PLUS.** Les blocs d'obsidienne (les files) et de planche sombre (les
  traverses) partent parce que les prismes les remplacent, dans le même
  passage du mailleur, sur toute colonne de ballast ; le gravier, la pierre
  du remblai et le gabarit d'air restent des blocs. Et les rubans s'émettent
  même sans sol continu (`?solcontinu=0`) : ce sont de la géométrie, pas de
  la surface — sinon la mesure A/B montrerait une voie sans rails.
- **UN TALUS DE VOIE EST CELUI D'UNE ROUTE, UNE PIÈCE PLUS LOIN.** Le remblai
  était un mur de pierre vertical, la tranchée un puits ; `voieEn` rend
  désormais `piece: 'talus'` de la cote du ballast à celle du terrain, un
  bloc par bloc, herbe au sommet — la formule de `routeEn` (v300), recopiée
  parce que `trains.js` et `routes.js` ne s'importent pas. Mesuré sur les
  neuf lignes : 17 188 colonnes, treize blocs de large au plus, AUCUNE dans un
  disque d'aérodrome, 191 blocs de ce que les enfants ont bâti. **Et la gare
  passe avant le talus** : le quai commence où le ballast finit, exactement
  là où le talus commencerait ; sans cet ordre dans `world.js`, dix-huit
  gares perdaient leur quai sous un talus d'herbe.
- **UN TÉMOIN NEUF MESURE LE MÊME DÉFAUT DES DEUX CÔTÉS, PAS L'ABSENCE D'UN
  EXPORT.** Mon premier jet rendait « pas de coteContinue » sur
  `origin/main`, ce qui ne dit rien du fond. Les trois témoins purs lisent
  l'ancien `voieEn` (un bloc) comme le neuf (une cote et un bloc) et rendent
  sur l'ancien code : marche 2,0 · 1 441 obsidienne · 53 colonnes de surface
  justes sur 3 603. C'est la règle de la v214 (« un témoin doit échouer
  PROPREMENT, avec un message vrai »), appliquée avant de livrer.

**Ce que la livraison ne fait PAS, et qui se déclare** (`TASKS.md`) : la
pente du profil reste un tiers (les candidats du kit à 2,5 % creusent jusqu'à
vingt-deux blocs et ne sont pas approuvés) ; sur la mer la voie reste une
chaussée au ras des flots, pas un viaduc sur piles ; au-delà de treize blocs
d'écart le talus s'arrête et la paroi reste raide ; la gare reste en voxel ;
les textures du kit ne sont pas branchées ; les rails n'arrêtent rien.

**ET LE PONT DE L'A1 AVAIT UN TROU À CHAQUE BOUT (v302), vu par Max et par
aucun témoin.** Un ruban (tablier) commence à un pas d'abscisse DROIT ; une
route oblique finit ses cubes en ESCALIER ; entre les deux, des triangles
ouverts sur la rivière — 464 points de chaussée sur 6 500 aux deux joints. Le
contact lisait `tablierEn` et n'avait pas de trou : seul le dessin en avait,
et les témoins de la v300 ne regardaient que le contact (« le pont se
franchit sur son tablier »). **Là où une géométrie continue rencontre des
cubes sur un axe oblique, elle DÉBORDE sur les cubes** (`CULEE`, deux pas, un
centième au-dessus pour ne pas se disputer le plan) — et le témoin
échantillonne ce que l'on VOIT, point par point, pas ce qui porte la voiture.
La même règle vaudra pour le rail le jour où il aura ses viaducs.

**Et le dernier kit de Max vise le monde, pas Paris** (« le dernier zip
adresse le monde pas Paris seulement ») : la v301 n'avait traité que Paris.
Le kit v4 place les rails, les raccords ville/campagne et les routes
interurbaines AVANT le décor, pour toute la carte. Le rail est fait ; le reste
est écrit dans `TASKS.md` dans l'ordre du kit, et une livraison du programme
se juge désormais à la COUVERTURE qu'elle ajoute (combien de villes, combien
de segments), pas à la beauté d'un seul quartier.


## Un étage fait trois blocs (v301) — une ville se met à l'échelle des personnes, et ses toits emportent ce qu'on a bâti dessus

Max, capture d'une rue : « Paris est beaucoup trop compressé. » Mesuré avant
d'écrire une ligne : une personne 1,8 bloc, un étage UN bloc, un immeuble de
six niveaux dix blocs de haut (médiane sur 6 043 colonnes de lot). Deux
remèdes chiffrés, et Max a pris la verticale seule (« je suis tes
recommandations, augmente ») : l'horizontale multiplierait par neuf les
morceaux de Paris. Six règles.

- **UNE FENÊTRE RESTE UN DESSIN, ET UN NIVEAU SE DÉPENSE EN BANDES.** Un
  étage de trois blocs ne se fait pas en répétant trois fois la tuile d'un
  étage — ce serait trois rangées de fenêtres par niveau, et le LOIN (la tuile
  plate, tout l'écran d'un appareil sans couche HD) le montrerait. Un niveau
  est donc trois BLOCS DISTINCTS — l'allège, le bas de la baie, le haut de la
  baie — chacun sa tuile de seize pixels qui se raccorde bord à bord, chacun
  son registre HD qui dessine SA part du trou (`creux` sans linteau, sans
  appui). Les anciens blocs (`ETAGE`, `NOBLE`…) restent ce qu'ils sont : des
  enfants les ont posés, ils ont un nom ; les bandes portent `cache` et
  n'entrent pas dans la palette. Et le haut d'une baie s'allume AVEC son bas
  (`yBaie`) : le tirage des vitres est par bloc, et sans cette règle une
  fenêtre sur deux serait éclairée à moitié — le mailleur et la couche lisent
  la même fonction.
- **CE QUI PÈSE, C'EST LE CHÂSSIS, PAS LA HAUTEUR.** Un morceau dense de
  l'ouest portait 61 000 sommets de menuiserie sur 146 000 : six boîtes par
  fenêtre, trente quads, cent vingt sommets. Tripler la façade aurait triplé
  ce poids et fait rendre le budget de la v299 à quatre morceaux. Le châssis
  est UN quad ajouré (tuile `croisee`, alpha) : les mêmes morceaux passent de
  10,9 · 11,3 · 11,6 à 9,2 · 9,5 · 10,3 Mo avec des façades trois fois plus
  hautes, et un témoin garde la barre à dix. **Avant d'ajouter de la
  géométrie, on demande à la sonde par tuile qui tient les sommets** — la
  réponse était déjà dans la mesure de la v299.
- **UN IMMEUBLE QUI MONTE EMPORTE CE QU'ON A BÂTI DESSUS.** Le relief ne bouge
  pas (deux empreintes intactes, sans rien déclarer), mais une cabane posée
  sur un toit de dix blocs se retrouverait ENFERMÉE dans l'immeuble de vingt
  et un — c'est l'invariant 1 par un autre bout : ce qu'un enfant a posé se
  repère par rapport à ce qui le portait. `releverToitsParis` est une marche
  de la chaîne (4 → 5), pure, datée, appliquée à l'appareil et à chaque
  document du nuage, avec sa copie d'avant ; `gabaritParis` publie le sommet
  d'avant et d'après — la différence est CONSTANTE sur un îlot, donc une
  maison monte d'un seul tenant. Sa position aussi : endormi sur un toit, on
  se réveille sur le toit neuf.
- **ET L'ORDRE DES MARCHES EST UNE RÈGLE, PAS UN DÉTAIL.** Le ménage du ciel
  (v298) garde ce qui touche « un bloc que le jeu écrit » ; avec le toit monté
  de onze blocs, la cabane ne touche plus rien, et jouée d'abord la passe de
  ménage l'aurait RETIRÉE. On relève, PUIS on ménage — au stockage comme au
  nuage — et le témoin fait passer une cabane par la chaîne entière, dans
  l'ordre de `sync.js`. Quand deux passes lisent le générateur, celle qui le
  suit passe avant celle qui le juge.
- **REMETTRE UNE VILLE À L'ÉCHELLE, C'EST AUSSI REFAIRE SES MONUMENTS — et on
  le mesure avant de le remettre à plus tard.** Opéra 19 blocs, Invalides 22,
  Sacré-Cœur 23, Notre-Dame 31 (ses murs de nef à 13), Panthéon 32,
  Montparnasse 38, contre des immeubles à 21-24 : l'Opéra est plus bas que ses
  voisins, ce qui n'est pas la vraie ville. Ils ont leurs modèles HD (v292)
  qui suivent les cotes du voxel ; les remettre à l'échelle est une livraison
  à elle, déclarée avec ces chiffres — pas un « à voir ».
- **UNE LIVRAISON S'ÉCRIT DANS UN ARBRE DÉTACHÉ PENDANT QUE LE PORTAIL JOUE.**
  « Ne jamais modifier `src/` pendant qu'une suite tourne » interdisait
  d'avancer ; `git worktree add --detach` dans le scratchpad donne un arbre où
  écrire, mesurer sous node et vérifier, sans toucher aux fichiers que le
  serveur du banc lit. Les sondes y tournent (node) ; les navigateurs, non.

## Un rayon ne borne pas des octets (v299) — le détail se dépense comme un budget

Max : « le jeu continue à planter sur la version 298, il crache au bout de
quelques secondes dès qu'on se déplace. » Le journal de bord de la v296 a
répondu en une requête : iPhone, en vol à l'ouest de Paris, 1 089 morceaux
(« Loin »), 55 morceaux HD, zéro erreur — iOS a tué la page. Cinq règles.

- **UNE FABRICATION « À PORTÉE SEULEMENT » NE VAUT QUE POUR LE POIDS SUR
  LEQUEL ELLE A ÉTÉ RÉGLÉE.** La v296 avait mesuré 2,93 Mo par morceau HD au
  CENTRE de Paris et ramené la ville de 1 171 à 98 Mo en ne fabriquant le
  détail qu'à `RAYON_HD` + 1. Mesuré sur le site du plantage : un morceau des
  quartiers denses de l'ouest porte 146 000 à 156 000 sommets de façades,
  **onze mégaoctets**, contre 1,6 au centre. À « Loin » (rayon 6, 169
  morceaux) c'est plus d'un gigaoctet ; à « Normal » (rayon 3, 49 morceaux),
  quatre cents. Un rayon ne borne pas des octets. Le détail se dépense donc
  comme un BUDGET (`hdMo` dans la fiche du palier, `planDetail` dans
  palier.js, pure) : du plus proche au plus loin, ce qui dépasse montre sa
  tuile plate, et un tenu plus loin qu'un candidat lui cède sa place. La
  dépense d'un morceau qu'on n'a pas encore maillé s'ESTIME (la moyenne de ce
  qu'on tient, deux mégaoctets au plancher) ; arrivé, il se mesure et le
  budget se corrige tout de suite. Mesuré en vol sur le site, rr 16 · hd 6 :
  façades 231 → 727 → 763 Mo avant, 124 → 97 → 127 après.
- **LE POIDS SE MESURE PAR COUCHE, MORCEAU PAR MORCEAU — trois sondes, dans
  cet ordre.** La première (tampons de la scène, quatre bras) a dit que ça
  triple en vol avec la couche HD et pas sans ; la deuxième (vivants contre
  orphelins) que rien n'est orphelin ; la troisième (par couche, les huit
  plus lourds, la capacité des ArrayBuffers contre leurs vues) a nommé la
  couche et l'endroit en une exécution. Devant une mémoire qui monte, on ne
  cherche pas la fuite d'abord : on demande à la scène QUI tient les octets.
- **LE RÉGLAGE ENTRE DANS LA FICHE DU JOURNAL.** Le journal disait 1 089
  morceaux et 55 morceaux HD ; « rr 16 », donc « Loin », il a fallu le
  DÉDUIRE. `journal.regler` note désormais rr, file, portée HD, budget,
  palier, source, étendue et rendu logiciel. Une panne de réglage se lit dans
  le réglage, pas dans ses effets.
- **LA SÛRETÉ PASSE DEVANT L'ÉTENDUE SOUS LAQUELLE ÇA A PLANTÉ, ET DEVANT
  ELLE SEULE.** La v296 avait fait du choix la porte de sortie de tout
  réglage automatique — juste, et c'est resté vrai. Mais l'iPhone est mort
  deux fois de suite SOUS « Loin », et un enfant de sept ans n'ouvre pas les
  Réglages : la porte de sortie était devenue la boucle sans issue. Le
  verdict porte `sousChoix` (l'étendue lue dans la fiche de la session
  morte) ; `palierRetenu` ne l'oppose qu'à ce choix-là, « Normal » passe, et
  choisir une autre étendue lève le verdict — c'est la décision explicite qui
  rouvre la porte. Et le jeu le dit, avec le nom de l'étendue.
  **Depuis la v509, la sûreté descend d'UN cran depuis le palier qui tournait
  (Loin → Normal → bas), pas au fond** — voir « La sûreté d'un cran (v509) ».
- **UN BUDGET SE POSE SUR CE QU'ON A VU SURVIVRE, ET IL SE DIT.** 128 Mo :
  au-dessus des 98 que le vieil iPad de la v296 a tenus au centre, très
  au-dessous des cinq cents et plus sous lesquels l'iPhone est mort. Ce
  n'est pas une mesure sur l'appareil — la fiche du journal la rendra
  possible — et c'est déclaré dans `TASKS.md`, comme le vrai remède de fond :
  une baie de façade coûte cinquante-six à soixante-neuf sommets par face,
  et c'est le nombre de sommets, pas le rayon ni le budget, qui décidera un
  jour de ce qu'un appareil peut montrer.

## Le journal de bord se taille côté serveur (v479) — une purge efface par liste d'autorisation

Deux règles.

- **CE QU'UNE TABLETTE N'A PAS LE DROIT D'EFFACER SE PURGE DANS LA BASE.**
  `journal_appareil` n'a pas de politique `delete` pour `anon`, et il ne lui en
  faut pas : un déclencheur `security definer` (`journal_appareil_purge`, SQL
  recopié dans `cloud.js`) retire à chaque insertion les sessions de plus de
  `JOURNAL_GARDE_JOURS` jours. Une purge au lancement d'une tablette dépendrait
  d'une tablette à jour et ouvrirait l'effacement à tout le monde.
- **UNE PURGE NOMME CE QU'ELLE EFFACE, JAMAIS CE QU'ELLE GARDE.** `fin in
  (JOURNAL_FINS_PURGEABLES)` et non `fin <> 'plantage'` : une fin nulle, une fin
  qu'une version future inventera, un plantage ne partent jamais. Le témoin de
  `parent.js` compare le SQL recopié aux constantes. Et l'outil de migration
  attend une confirmation humaine pour un `drop` ou un `revoke` (il expire sans
  rien appliquer) : on écrit la migration sans eux.

## Une page qui a dit au revoir ne se rouvre pas (v464)

Une règle. Une vraie mise à jour, rejouée au banc (`sonde-journal-maj.cjs`), a
montré `rouvrir()` APRÈS `fermer('mise-a-jour')` et `pagehide` : un
`visibilitychange` pendant le déchargement rouvrait la session de la page qui
partait, et la page neuve la confirmait plantée (compteur 1 par mise à jour,
palier bas à la deuxième). **L'état de visibilité pendant un déchargement ne se
lit pas** : une fin voulue (`fermeture`, `mise-a-jour`) pose `parti`, et seul un
`pageshow` persisté (le cache de navigation) relève la page. Un témoin de mise à
jour lit le journal de la page NEUVE après sa vérification des douteuses (7 s).

## Le journal de bord ne crie plus au plantage pour rien (v426) — une session par page, et la mémoire en octets

« Le jeu plante de temps en temps. » Onze « plantages » en quarante minutes
sur l'iPhone, et deux de suite rangent le palier bas pour de bon (v296). Quatre
règles.

- **UN DRAPEAU UNIQUE SUPPOSE UNE SEULE PAGE, ET L'APPAREIL EN A EU DEUX.**
  La ligne 82 de `journal_appareil` est une session « plantée » qui envoie sa
  fermeture propre trois minutes plus tard (ligne 83) : deux pages sur le même
  stockage, la seconde lit le drapeau de la première, vivante, comme un
  plantage — et une page qui se ferme efface le drapeau de l'autre, ce qui
  CACHE un vrai plantage (mesuré sur l'ancien code). Chaque session a son
  identifiant, son journal (`JOURNAL_CLE#id`) et sa ligne dans la table des
  sessions ouvertes avec son dernier BATTEMENT (2 s) ; une session au
  battement récent est douteuse, et c'est le battement qui n'avance pas qui la
  dit morte (`verifierDouteuses`, 3 puis 7 s). L'ancien format (une chaîne)
  est jugé comme avant : mort d'office. **Avant d'accuser le jeu, on relit
  les lignes VOISINES du journal : deux lignes du même `debut` disent deux
  pages.**
- **L'HYPOTHÈSE DONNÉE SE MESURE AVANT D'ÊTRE CORRIGÉE.** La consigne
  supposait que la relance du service worker tuait la page avant le journal.
  La sonde (`sonde-journal-relance.cjs`) recharge à 200 ms, 600 ms, 1,2 s,
  2,5 s, 5 s et pendant le chargement : zéro faux plantage sous Chromium. Le
  geste reste (`reloadOnce` et `forcerMaj` ferment le journal avant de
  recharger, `__journalAuRevoir`) parce qu'il ne coûte rien et ne parie pas
  sur un seul événement de WebKit ; la cause, elle, était ailleurs.
- **UNE PAGE NÉE CACHÉE N'EST PAS UNE SESSION QUE L'ENFANT A VUE.** Les
  sessions VIDES (aucun relevé, aucun événement, pas même `premier-plan`) sont
  ce que laisse une page qu'iOS ouvre sans la montrer puis tue. Elle se ferme
  à l'ouverture, SANS remettre le compteur à zéro (`garderCompteur`) : elle
  n'a rien prouvé.
- **UN COMPTE N'EST PAS UN POIDS.** Safari ne donne pas le tas ; c'est le
  compte de textures qui a trahi la flotte (734 Mo, v413 de la session des
  textures). `estimerMemoire` (journal.js, pur, lu par forme) : largeur ×
  hauteur × 4 × 4/3 par SOURCE distincte (sans le tiers quand la texture ne
  fait pas de mipmaps — une `DataTexture`, et mon premier témoin l'oubliait),
  octets des attributs et index par TABLEAU distinct. Un parcours par relevé
  (5 s), et son coût voyage avec lui (`gpu.ms`) : 4,7 ms médian à Paris au
  banc. C'est ce que la scène TIENT, pas ce que le pilote a chargé : à Paris,
  126 sources contre 85 textures du pilote — les deux nombres ensemble disent
  plus que chacun.

## Le journal de bord, et Paris qui pesait un gigaoctet (v296)

Max : « un iPad d'ancienne génération, six ans peut-être, se connecte, ça ne
lague pas trop, et au bout de vingt secondes de jeu il plante. Il faudrait
collecter des logs pour comprendre les bugs. » C'était à Paris. Six règles, et
la première est celle qui a trouvé la cause.

- **QUAND LE BANC NE PEUT PAS SUBIR LA PANNE, ON MESURE LA CAUSE EN OCTETS — et
  la cause était ÉNORME.** Safari tue une page sans un mot, le banc a de la
  mémoire à revendre (v236). `sonde-memoire-paris.cjs` compte ce que la scène
  TIENT une fois le disque rempli, au réglage d'un appareil jamais classé
  (rr 12 · hd 3) et au palier bas : **1 171 Mo de tampons contre 98**, 1 272 Mo
  de tas contre 203. Un morceau HD pèse 2,93 Mo dont 1,6 de façades détaillées,
  contre 0,16 sans HD ; `world.hd` les faisait fabriquer pour tout le disque de
  Paris quand `RAYON_HD` en montre quarante-neuf. C'était la dette déclarée en
  v291 (« `RAYON_HD` décide de ce qu'on montre, `world.hd` de ce qu'on
  fabrique »), avec sa consigne « à mesurer avant d'écrire : ce que pèsent les
  tampons HD ». Mesuré, c'est un gigaoctet. **Une dette qui dit « à mesurer »
  se mesure le jour où un appareil meurt, pas plus tard.**
- **ON FABRIQUE CE QU'ON MONTRE.** Le détail se demande PAR MORCEAU
  (`buildChunkTampons(…, { detail })`, le drapeau voyage dans le message
  `mailler`) à portée de `RAYON_HD` plus une marge d'un morceau — prêt avant que
  l'enfant n'y entre — et il se REND deux morceaux plus loin (hystérésis).
  `montrerLeDetail` tient l'invariant visuel : sans façades fabriquées, les
  faces plates restent visibles quelle que soit la distance, sinon un morceau
  proche en attente de son détail serait un trou. Le sol HD et `plat` restent
  fabriqués partout : le loin ne change pas d'un pixel (0,02 à 0,06 Mo par
  morceau). Et mon premier `if (detail)` a avalé la boucle du SOL avec celle des
  façades — le sol était tombé de 60 à 20 Ko sur un morceau — parce que les
  deux vivaient sous le même `if (hd)`. Une mesure de chaque tampon, mode par
  mode, l'a dit ; la relecture ne l'aurait pas vu.
- **UN RÉGLAGE AUTOMATIQUE QUI NE PEUT PAS SE RANGER EST UNE BOUCLE SANS
  ISSUE.** Le palier ne se range qu'après trente secondes de jeu (v284) : un
  appareil qui meurt à vingt secondes n'est JAMAIS classé, et chaque relance
  repart au réglage « moyen » qui vient de le tuer. La v291 exigeait qu'un
  réglage automatique garde sa porte de sortie ; celle-ci était les Réglages,
  qu'un enfant de sept ans n'ouvre pas. Le disjoncteur (`suretePalier`,
  journal.js) écrit après DEUX plantages de suite un verdict `bas` marqué
  `surete`, que `palierRetenu` place devant la mesure et derrière le choix, et
  que `rangerLePalier` n'écrase pas. Un seul plantage ne suffit pas : un onglet
  tué pour une raison sans rapport dégraderait l'appareil pour rien. Et le jeu
  le DIT (bandeau, aide des Réglages, `?diag=1`).
- **CE QU'ON VEUT SAVOIR D'UN PLANTAGE S'ÉCRIT AVANT, ET SE RELIT APRÈS.** Le
  journal (`src/journal.js`, pur, lu sous node) pose un drapeau « session
  ouverte » et écrit toutes les deux secondes : fiche, relevés toutes les cinq
  secondes (position, ville, cadence, pire image, morceaux, façades HD,
  géométries, tas), événements, erreurs (`error`, `unhandledrejection`, le
  worker). Au lancement suivant, drapeau encore là = plantage présumé, journal
  au nuage (`journal_appareil`). Deux subtilités : **iOS tue aussi les onglets
  cachés**, et ce n'est pas un plantage que l'enfant a vu — `visibilitychange`
  ferme donc la session proprement et la rouvre au retour ; et la fermeture
  part en `keepalive`, borné à 24 Ko, parce que la page n'attend plus personne.
  Le stockage est BRUT (`__rawStorage`) : un plantage est une affaire de
  tablette, pas d'enfant.
- **LA TABLE DU NUAGE S'EST CRÉÉE DEPUIS LA SESSION, ET C'EST DÉCLARÉ.** Le
  connecteur Supabase atteint le projet de la famille (`minecraft-marlon`) ; la
  migration `journal_appareil` y est appliquée (lecture et écriture anonymes,
  comme les six autres tables), et le SQL est recopié dans `cloud.js` pour
  qu'une réinstallation la retrouve. Les LECTURES de données d'enfants restent
  refusées à cette session (v295) ; l'espace parent, lui, les montre à Max.
- **ET UNE CHAÎNE `&&` A AVALÉ UNE ÉDITION SANS UN MOT.** `grep … && python3 …`
  : le grep n'a rien trouvé, le python n'a pas tourné, et le `node --check &&
  echo OK` d'après a imprimé OK sur le fichier INCHANGÉ. La suite est passée
  verte sans mes témoins, et c'est le compte `grep -c` du titre du bloc qui l'a
  dit — zéro. C'est « un code de sortie lu à travers une enveloppe n'est pas le
  sien » (v285), du côté de l'ÉDITION : ce qui prouve qu'une édition a eu lieu,
  c'est le fichier, jamais le message d'après. **Et un `&` en fin de ligne
  met TOUTE la liste `a && b && c` en arrière-plan**, pas seulement `c` : les
  contrôles d'avant se sont exécutés sans que je voie leur sortie, deux fois
  dans la même livraison. Ce qui doit être VU s'exécute dans un appel à lui ;
  ce qui doit tourner en fond part seul, avec `run_in_background`.

## « Des trucs bizarres dans Paris » — on mesure d'abord d'où ils viennent (v295)

Max, capture d'iPad au centre de Paris : de grandes structures de rondins et
de laine bleue dans le ciel, et un cube noir ou deux près de la tour Eiffel.
Trois règles.

- **DEVANT UN BLOC QUI FLOTTE, LA PREMIÈRE QUESTION EST « QUI L'A POSÉ ? », ET
  ELLE SE MESURE SOUS NODE.** Un bloc du jeu a deux origines possibles : le
  générateur (déterministe, balayable en une seconde et demie sur tout le
  disque de Paris) ou le journal des enfants. Le balayage a rendu la réponse en
  une exécution : le générateur ne pose ni rondin, ni planche sombre, ni laine
  bleue en l'air, et aucun bâtisseur de Paris n'écrit ces blocs. Ce qui reste
  est donc une construction d'enfant — Marlon vole, et il bâtit en volant — et
  **on ne retire pas un bloc d'enfant sur une présomption** : c'est l'invariant
  1 par un autre bout. On le dit à Max, et c'est lui qui tranche. Le nom sous
  le réticule, au passage, est celui du bloc EN MAIN (`#block-name`), jamais
  celui qu'on vise : « Cheminée de pierre » disait ce que l'enfant tenait, pas
  ce qu'il regardait.
- **CE QUE LE MODÈLE NE COUVRE PAS RESTE EN CUBES — ET QUAND CES CUBES
  FLOTTENT, C'EST LE VOXEL QUI A TORT.** La v292 avait déclaré le prix de son
  masquage : des cubes qui dépassent d'un modèle lisse, « honnêtes, et qui
  arrêtent ce qu'ils ont l'air d'arrêter ». Seize sur la tour Eiffel, et douze
  d'entre eux étaient l'ARCHE entre les jambes, écrite à l'envers — un ventre
  qui descend au milieu et finit aux quatre coins à deux blocs de tout montant.
  Ils étaient en production depuis la v292, visibles sur MES captures de la
  v294 (je les avais notés « artefacts HD existants ? » sans aller voir). Un
  voxel et son modèle suivent la MÊME courbe, écrite une fois ; sinon le
  masquage laisse exactement les cellules où les deux divergent, et elles
  flottent. La sonde `sonde-monuments-hd.cjs` compte ces cubes monument par
  monument — Notre-Dame 34, Sacré-Cœur 15, Opéra 9, Panthéon 4 —, et c'est là
  qu'on regarde avant d'accuser autre chose.
- **UNE CAPTURE QU'ON PREND POUR AUTRE CHOSE SE RELIT.** Les cubes noirs
  étaient sur `avant-pont.png` ET `apres-pont.png` de la v294, prises pour
  juger les ponts : je les ai vus et ne les ai pas mesurés. Une planche de
  captures se regarde en entier, pas seulement là où pointe la livraison.

## Le couloir Paris–Lille (v300) — une route est un ouvrage, et elle se mesure sur le monde

Troisième livraison du programme « monde fidèle » : l'autoroute A1, de la
porte nord de Paris à l'entrée sud de Lille. Sept règles, et la première a
été payée le jour de la livraison.

- **UNE PROJECTION SUR UN AXE SE BORNE AU TRONÇON, ET C'EST LA DISTANCE QUI
  DÉCIDE, PAS L'ÉCART PERPENDICULAIRE.** `routeEn` jugeait « sur la
  chaussée » à `|d|`, l'écart à la DROITE de l'axe : un point sur le
  prolongement de l'axe, au-delà d'un bout, avait d ≈ 0 et passait pour de la
  route. Le centre de Paris est exactement sur ce prolongement (la porte est
  posée sur la ligne du centre vers le premier point de passage) : 112
  colonnes « A1 » à 150 blocs de la porte, 62 cellules de surface dans le
  morceau du témoin « dans une ville, rien ne change ». Trois harnais l'avaient
  mesuré vert parce qu'ils ne regardaient que le long de la route. La grandeur
  juste est la distance au point PROJETÉ PUIS BORNÉ (`dist`) : dans le tronçon
  elle vaut |d|, au-delà elle compte le dépassement. **Un témoin de v297 sur
  un tout autre sujet l'a attrapé** — c'est ce qu'un portail garde, et ce
  qu'un harnais qui suit son propre tracé ne peut pas voir.
- **UNE ROUTE EST UN OUVRAGE ÉCRIT EN BLOCS, JAMAIS UN RELIEF.** Comme la
  voie ferrée (v213) et les pistes (v280) : remblai et déblai au profil de
  `routes.js`, asphalte au sommet, piles sous les ponts ; `terrainHeight` ne
  bouge pas, les deux empreintes de `plafond.js` sont intactes, l'invariant 1
  tient sans rien déclarer. Le profil est un filtre en cône (`PENTE` 0,06),
  les deux bouts épinglés au sol des portes par une rampe linéaire, et là où
  le remblai dépasserait `VIADUC` (4) c'est un pont — un sur l'A1, 530–542 —
  dont le tablier est un RUBAN du mailleur, pas un bloc.
- **UN EMPLACEMENT SE MESURE (v223), UN TRACÉ AUSSI — ET MON PREMIER CHIFFRE
  ÉTAIT FAUX.** J'avais écrit « la maison témoin à 54 blocs » ; le témoin de
  `carteMonde.js` a rendu 32. L'axe direct Paris–Lille passe DANS la marge de
  Roissy (5 blocs à l'intérieur de r + 12) et la maison témoin de `plafond.js`
  (−100, −100) est de l'autre côté : entre les deux, huit blocs de couloir.
  Cherché sous node (`cherche-via3.mjs`, un et deux points de passage, coude
  ≤ 30°) : aucun tracé ne tient à la fois quarante blocs de la maison et la
  marge de Roissy. Le point retenu tenait 37 et 2,7, avec un coude de 5° —
  et il traversait le Pôle Nord, voir plus bas ; le tracé livré tient 35 et
  9, à deux coudes ; **et la barre du témoin se calcule au lieu de se
  recopier de la règle des aérodromes** : l'emprise fait 8,5 de demi-largeur
  et le talus 12,9 au plus (déblai 9 sur une pente de 0,7), soit 21,4 depuis
  l'axe, plus huit blocs — trente. Une route n'aplanit rien, elle écrit des
  blocs : sa distance de sûreté est celle de son emprise, pas celle d'un
  disque qu'on aplanit.
- **UN TÉMOIN DE CHAUSSÉE ÉCHANTILLONNE UNE VOIE, PAS L'AXE.** L'axe d'une
  autoroute est le terre-plein, qui est de l'herbe : mon premier témoin y
  comptait 18 colonnes d'asphalte sur 208 et accusait un ouvrage juste. La
  géographie se juge sur l'axe, la chaussée à `terrePlein + demiChaussee / 2`
  de côté — c'est « un témoin qui écrit son terrain se trompe de terrain »
  (v285), pour une section de route.
- **LE COULOIR S'ARRÊTE À `BORD_VILLE` DANS LE DISQUE, LÀ OÙ LE RELIEF EST
  PLAT, ET L'ENTRÉE DE VILLE PREND LE RELAIS.** Vingt blocs après le bord du
  disque le fondu du relief est fini ; le profil s'y épingle, et une avenue de
  raccord (`ENTREES_PARIS`, `ENTREES_LILLE`, hors de `VOIES` pour ne pas
  entrer dans la couverture des circuits) mène de la porte à la gare du Nord
  et à la rue de Paris. **Dans ce raccord, la route a le dernier mot sur sa
  colonne**, comme la voie ferrée dans une ville engendrée.
- **UNE SEULE SECTION, TROIS LECTEURS** (discipline de `postesAvion`) :
  `routeEn(x, z)` rend le tronçon, l'abscisse, l'écart, la cote et la PIÈCE
  (terre-plein, chaussée, accotement, talus, tablier) ; le générateur pose les
  blocs, le sol continu prend la cote et la pièce (`colonneRoute`), la carte
  colorie. Le talus se raccorde au terrain de SA colonne (`terr + ecart × (1 −
  u/w)`) : c'est ce qui garde la cellule dessinable et la couture avec la
  colonne d'à côté.
- **LA CIRCULATION LIT LE MÊME TRACÉ QUE L'OUVRAGE.** `traceRoute` construit
  l'aller et le retour sur les voies intérieures, décalés à droite (v271),
  cousus aux avenues de raccord, points dédoublonnés (un segment de longueur
  nulle rendait NaN au parcours) ; `vehicules.circulation(pts, 41, { nb: 20,
  vitesse: 12, route: 'A1' })` publie `route` dans `etat()` pour qu'un témoin
  le trouve par son nom et non par sa longueur.
- **LE COÛT D'UNE QUESTION POSÉE PAR COLONNE SE MESURE LOIN DE LA ROUTE.**
  `routeEn` est appelée pour chaque colonne de chaque morceau : un index
  spatial par cases de 512 rend 0,03 µs loin de la route et 5,8 µs près —
  vingt mille appels en 0,6 ms là où le monde n'a pas de route.

- **UNE COTE QUI TRAVERSE UNE `Float32Array` N'EST PLUS LA MÊME COTE.** Le
  portail a rendu une erreur du mailleur (« reading 'tiles' ») et un écart
  contact/maillage (183 centres exacts sur 196) sur le morceau témoin de la
  campagne, que la route traverse désormais. Mesuré à la colonne : un talus à
  34,999999 en double précision, rangé dans la grille du mailleur en simple
  précision, y vaut 35 tout rond ; le générateur posait l'herbe à 33 et le
  mailleur cherchait une tuile à 34, dans l'air. Toute cote de route est un
  soixante-quatrième de bloc (`q64`, routes.js), exact dans les deux
  précisions : 138 morceaux du couloir maillés sans erreur, 256 centres sur
  256 exacts. **Une grandeur qui vit dans deux représentations se quantifie
  là où elle naît**, pas là où elle se compare.
- **UN PLANCHER QUI N'EST PAS UN BLOC SE DÉCLARE À CHAQUE MÉCANISME QUI
  CHERCHE UN PLANCHER.** `eauDevant` (v272) demande « y a-t-il un bloc sous
  les roues ? » avant de chercher l'eau ; le tablier est un ruban, il voyait
  l'eau du fleuve et refusait le pont — 60 images bloquées sur 78 à l'entrée
  du premier pont. Le contact avait été prévenu (`accrocherAuSol` lit
  `tablierEn`), pas l'obstacle. C'est la leçon des trois règles du sol continu,
  un ouvrage plus loin : ce qui remplace un bloc le dit à TOUS ceux qui lisaient
  le bloc.

**Et le tablier est une seconde surface.** `accrocherAuSol` prend le
tablier quand le contact PRÉCÉDENT en est à portée (`pos.y ≥ tab − 0,6`),
sinon le sol : sur le pont on y reste, dessous on y reste — jamais la plus
haute d'office, qui téléporterait sous un pont (cahier de Max, « contrat
physique »). Deux témoins de `plafond.js` roulent le premier pont dessus, et
passent dessous.

**ET LES CAPTURES ONT TROUVÉ TROIS CHOSES QUI FLOTTAIENT AU-DESSUS DE LA
ROUTE, QU'AUCUN TÉMOIN NE GARDAIT.** Une dalle de terre au-dessus de la
chaussée, sur la vue du pont et sur celle de la porte de Paris. Cinq règles.

- **UNE SONDE QUI REND ZÉRO SE VÉRIFIE AVANT D'ÊTRE CRUE.** Ma première sonde
  comptait les blocs pleins au-dessus des colonnes de route et rendait ZÉRO
  sur 5 177 colonnes — elle lisait `HEIGHT` de `blocs.js`, qui ne l'exporte
  pas, et sa boucle `y < undefined` ne tournait jamais. J'ai alors accusé le
  paysage lointain, corrigé, repris les captures : la dalle était toujours là,
  au pixel près. C'est « une sonde qui interroge la mauvaise liste ne peut rien
  voir » (v273) par la variable d'arrêt, et le signe était sous les yeux : un
  zéro tout rond sur une grandeur qu'une capture montre. Avant de conclure
  d'après un zéro, on fait rendre à la sonde une colonne qu'elle a lue.
- **LE DÉBLAI DÉGAGE JUSQU'AU RELIEF, PAS SIX BLOCS.** Le générateur ne
  dégageait que six blocs au-dessus de la chaussée — le gabarit — et le déblai
  va jusqu'à sept : la couche d'herbe du relief restait en l'air, une dalle
  d'un bloc d'épaisseur au-dessus de la route (122 colonnes). Un gabarit est un
  MINIMUM ; ce qu'on creuse, c'est jusqu'au relief. Deux cousines dans la même
  passe : la nappe d'un lac restait à sa cote au-dessus d'un talus creusé sous
  elle (131 colonnes — un talus sous un lac est SOUS l'eau), et la rampe
  d'épinglage des bouts pouvait abaisser une chaussée en déblai à la cote de
  l'eau (huit colonnes à l'approche du pont) — le profil ne passe jamais sous
  `NIVEAU_EAU + 1`, même après l'épinglage.
- **UN TRACÉ SE CHERCHE CONTRE TOUS LES OBSTACLES, LES REPÈRES COMPRIS.** Le
  chalet sur la chaussée à s ≈ 750 n'était ni la voie ferrée ni la gare de
  Lille (`voieEn` et `gareEn` y rendent null, mesuré) : c'était le PÔLE NORD
  (40, −690), un repère de `LANDMARKS` posé APRÈS les colonnes, dont la
  banquise de soixante blocs touche presque le disque de Lille. Ma sonde de
  via ne connaissait que les sanctuaires, les villes et les aérodromes. Elle
  connaît désormais les 283 repères (boîte + 7, la banquise en disque), la voie
  ferrée (aucun croisement) et la largeur du couloir ; aucun via UNIQUE ne
  tient — la porte de Lille doit passer à l'ouest de la banquise, ce qu'un seul
  coude ≤ 30° ne fait pas — et 94 tracés à deux vias tiennent. Celui livré
  maximise la plus petite marge (5 blocs) avec un seul pont.
- **LA CULÉE SE CREUSE.** Le pont est décidé sur l'AXE (l'eau sous lui) ;
  trois blocs de côté, la berge montait à 33 pour un tablier à 31, et la
  voiture butait dessus (60 images bloquée, `plafond.js`). Une berge qui
  dépasse se dégage d'un bloc sous le tablier jusqu'au relief ; l'eau et le lit
  restent. Une décision prise sur l'axe se vérifie sur toute la largeur.
- **ET LE PAYSAGE LOINTAIN LIT LA ROUTE.** `horizon.js` lisait `terrainHeight`
  au-dessus du déblai et refermait la tranchée tant que le morceau n'était pas
  maillé — ce n'était PAS la dalle des captures, mais c'est vrai quand même,
  mesuré : 42 colonnes sur 1 298 à la cote de la route sans `coteHorizon`,
  1 572 sur 1 572 avec. Un remède écrit pour la mauvaise cause reste s'il a été
  mesuré juste sur la sienne.

**Et le témoin « un bloc posé sur l'herbe » s'est retrouvé SUR la route** :
(−108, −328) est une chaussée du nouveau tracé, et poser un bloc sur une
chaussée ne rend rien au voxel. Il cherche désormais une colonne d'herbe hors
de tout `routeEn` — un témoin qui écrit son terrain se trompe de terrain
(v285), y compris quand c'est une livraison plus tard qui déplace le terrain.

## Le ménage du ciel de Paris (v298) — ce qui flotte se définit par l'APPUI, pas par la hauteur

Max, trois captures d'iPhone : « Bizarre », puis « clean les trucs bizarres ».
Une spirale de planches et de verre dans le ciel à côté de la tour Eiffel, la
tour rouge sombre à longue flèche, une masse noire au-dessus d'une rue. Six
règles, et la première dit pourquoi le journal de bord existe.

- **UN INSTRUMENT POSÉ À LA PLACE D'UNE HYPOTHÈSE SERT LE JOUR OÙ LA QUESTION
  REVIENT.** La v295 avait balayé le générateur (rien en l'air), la lecture des
  profils était refusée, et Max disait que ce n'était pas les enfants ; la v296
  a posé un compteur dans le journal de bord au lieu d'une hypothèse de plus.
  Deux semaines plus tard, la table `journal_appareil` — des données
  d'APPAREIL, pas d'enfant, faites pour être lues — a rendu la réponse en une
  requête : à la session des captures (iPhone, iOS 18.7, 15:45 UTC), **505
  blocs POSÉS suspendus dans Paris**, 318 planches, 101 verre, 73 grès, 7
  feuilles, 3 planches sombres, dans un journal de 83 780 blocs. Des blocs du
  journal, posés en vol — et j'avais écrit à Max l'inverse de ce qu'il disait
  sans pouvoir le prouver ; le journal l'a prouvé.
- **CE QUI EST BIZARRE, C'EST CE QUI FLOTTE — ET CELA SE DÉFINIT SANS
  HAUTEUR.** Mon premier jet retirait tout ce qui dépassait le plus haut toit
  ordinaire de Paris (treize blocs, mesuré sur les 94 000 colonnes : 12 371 à
  neuf, 57 à treize, au-dessus rien qui ne soit un monument). L'exemple du
  journal est à DOUZE blocs du sol : la règle en aurait laissé la moitié en
  l'air. La grandeur juste est l'appui : les blocs posés du disque qui ne sont
  pas SUR le sol (`y > relief + 1`), groupés par contact à six voisins, et un
  groupe part s'il ne touche ni un bloc posé au sol, ni un bloc que le jeu
  écrit. Une maison, un drapeau sur un toit, un radeau sur la Seine, un bloc
  collé au fer de la tour, un balcon restent ; une spirale suspendue part d'un
  seul tenant. **Et une règle de retrait se prouve d'abord par ce qu'elle NE
  retire PAS** : c'est le second témoin de `plafond.js`, neuf cas gardés pour
  deux retirés.
- **UN RETRAIT DE BLOCS D'ENFANT EST UNE MARCHE DE LA CHAÎNE DE MIGRATION, ET
  RIEN D'AUTRE.** Même forme que `migrerCarte3`, pour la même raison : la
  fusion est une union, une tablette restée sur l'ancienne version
  republierait la spirale. La règle est pure (`menagerCielParis`), appliquée
  au stockage une fois (marche 3 → 4, `CARTE_VERSION` 4) et à chaque document
  reçu du nuage ; la DATE la borne (`DATE_MENAGE_PARIS`) : un bloc posé après
  reste, quelle que soit sa hauteur — un ménage est un geste d'un jour, pas
  une interdiction de bâtir en vol. Et la copie d'avant se prend sur le NUAGE,
  une fois, sur son propre document (`~avant-menage-paris`), **seulement si le
  ménage a quelque chose à retirer** : un enfant sans rien dans le ciel ne
  coûte ni une lecture ni un document.
- **UNE PASSE QUI SE REJOUE À CHAQUE FUSION SE MESURE CONTRE CE QUE LA FUSION
  PAIE DÉJÀ.** Le nuage se pousse toutes les quarante-cinq secondes et chaque
  poussée fusionne. Premier jet en clés de chaînes : 200 ms sur quarante-quatre
  mille blocs de maisons dans Paris, le double de la migration de carte. En
  clés numériques (x, y, z dans 18 · 8 · 18 bits), la boîte avant le disque,
  le relief mémoïsé par colonne d'une fusion à l'autre, la carte rendue sans
  copie quand rien ne part : **50 ms sur quatre-vingt mille blocs hors de
  Paris (la carte 3 en coûte 65), 100 ms sur les maisons**. Le générateur n'est
  interrogé que pour un groupe sans appui posé, les plus bas d'abord, sur un
  monde sans blocs d'enfant qui se jette au-delà de quarante-huit morceaux, et
  la décision se retient par la signature du groupe.
- **LA TOUR N'EST PAS UN DÉFAUT, ET ON LE DIT AVANT DE LA CHANGER.** La tour
  rouge sombre à longue flèche est `buildEiffelTower` : 639 briques sombres, du
  parvis au phare, 70 blocs. C'est le squelette voxel de la v292, seul à
  l'écran quand le morceau n'est pas fabriqué en détail — de loin, en vol, ou
  sur un appareil dont la couche HD est éteinte. Le journal dit que l'iPhone de
  Max avait la couche (79 morceaux HD) et qu'il a été TUÉ deux fois de suite à
  Paris ce jour-là (15:44:17 et 15:45:13 UTC, 630 morceaux, pire image
  686 ms) : la sûreté de la v296 l'a donc passé au palier bas, où la couche
  s'éteint. Deux dettes déclarées dans `TASKS.md`, pas un remède de plus dans
  cette livraison : l'iPhone qui meurt encore à Paris en v296, et la couleur du
  fer, qui est une décision de Max.
- **ET LE NOM SOUS LE RÉTICULE DIT LE BLOC EN MAIN.** Max tenait de
  l'obsidienne ; rien dans le jeu ne lui dit ce qu'il VISE, ni qui l'a posé.
  Le monde le sait (`world.edits`). C'est la dette la plus utile de cette
  livraison : un `?diag=1` qui nomme le bloc visé et son origine aurait répondu
  à « qui l'a posé ? » depuis sa tablette.

## Le sol continu (v297) — le bloc reste le squelette des données, plus la forme du sol

Première livraison de code du programme « monde fidèle » (kit de Max,
septembre 2026 ; les décisions et l'état initial mesuré sont dans
`docs/monde-fidele/`). Hors des villes, hors des blocs posés, hors des
falaises, le sommet des colonnes n'est plus un cube : une surface triangulée
passe par le centre de chaque colonne à `terrainHeight + 1`, et c'est elle
qui se voit, qui porte l'enfant, les passants et les bêtes. Huit règles.

- **LE SOL N'A PAS BOUGÉ, PAR CONSTRUCTION — et l'empreinte le dit quand
  même.** `solcontinu.js` n'écrit aucun bloc et ne lit `terrainHeight` que
  pour placer ses sommets : les deux empreintes de `plafond.js` sont
  identiques à la v296, sans rien déclarer. La surface passe EXACTEMENT là où
  l'enfant marchait (le centre du sommet de chaque colonne), donc un bloc posé
  sur l'herbe repose où il reposait et aucune migration n'a lieu. Le prix
  déclaré : entre deux centres, la surface s'écarte d'au plus un demi-bloc du
  sommet voxel voisin, sur une pente.
- **TROIS NOTIONS, DANS CET ORDRE, ET MON PREMIER JET EN CONFONDAIT DEUX.** Une
  colonne NATURELLE (pas de ville, un bloc de terrain au sommet, rien d'autre
  qu'un arbre, de l'eau ou une fleur dessus) ; une cellule DESSINÉE (ses quatre
  colonnes naturelles et leurs sommets dans UN bloc — une falaise reste une
  falaise, « deux blocs, c'est un mur », v261) ; une colonne COUVERTE (ses
  quatre cellules dessinées), dont le cube de sommet disparaît du rendu et de
  la physique. J'avais retiré le cube dès que la colonne était « convertie »
  sans exiger ses quatre cellules : un TROU dans le sol au bord de chaque bloc
  posé. Ce qu'on tait doit être ce que la surface recouvre, ni plus ni moins —
  c'est la règle des monuments HD (v292), une couche plus bas.
- **LA RÈGLE LIT CE QUE LA COLONNE EST, JAMAIS SON HISTOIRE.** Mon premier jet
  tenait un index des colonnes ÉDITÉES (posées ou retirées) qui restaient voxel
  pour toujours : un bloc posé puis retiré laissait une cicatrice de 3 × 3
  cubes dans le champ. Retiré, l'index : une colonne dont le sommet est de
  l'herbe et le dessus de l'air est naturelle, quoi qu'il s'y soit passé, et
  la cicatrice guérit — c'est un témoin qui le mesure. Ce qui reste, c'est un
  cache par colonne (`ficheMemo`), invalidé autour de chaque bloc écrit
  (`solTouche`, appelé par `setBlock` ET par le worker pour un bloc reçu).
- **UNE SEULE TRIANGULATION, TROIS LECTEURS — et le contact est un geste du
  MONDE.** `sommetsDeCellule` et la diagonale a–d sont les mêmes pour
  `emettreSolContinu` (le mailleur) et `solContinu` (le contact) ; un témoin
  exige l'égalité au centre des colonnes et à mi-arête. L'accrochage au sol
  (`world.accrocherAuSol`) et la boîte libre (`world.boiteLibre`) vivent dans
  `World`, et `player.js`, `marlon.js` (les passants) et `animals.js` (les
  bêtes) les appellent après leurs balayages voxel : le sommet d'une colonne
  couverte n'arrête plus rien (`blocSousLaSurface`), et l'on se pose sur la
  surface. Deux copies de ce geste finiraient par diverger, et un enfant et sa
  vache marcheraient sur deux sols.
- **ON S'ACCROCHE EN DESCENDANT DE CE QU'ON A AVANCÉ, PAS D'UN CHIFFRE ROND.**
  Une pente d'un bloc par bloc descendue à trois images par seconde fait 0,7
  bloc de dénivelée en une image ; une accroche fixe d'un demi-bloc laissait
  la voiture décoller à chaque image et retomber. L'accroche vaut un demi-bloc
  PLUS le pas horizontal de l'image — et seulement si la boîte est libre à
  l'arrivée, parce qu'au bord d'une zone voxel la surface passe SOUS le
  sommet des cubes voisins.
- **UNE MARCHE SE COMPTE EN PENTE, PAS EN DÉNIVELÉE.** Ma première sonde
  comptait « saut » toute variation de hauteur de plus de 0,3 entre deux
  images : elle en trouvait quatre au volant sur la surface, qui étaient la
  voiture descendant une pente à la cadence du banc. Une marche, c'est une
  dénivelée PLUS GRANDE que l'avance horizontale ; un blocage, c'est moins
  d'un centième de bloc d'avance joystick en avant ; une chute, un
  atterrissage un demi-bloc sous le décollage. Avec ces trois grandeurs :
  voxel 10,2 blocs et 452 images bloquées, surface 73,7 et zéro.
- **LE COÛT SE MESURE EN MÉDIANE DE PASSAGES ALTERNÉS, ET LA QUESTION « EST-CE
  UNE VILLE ? » SE POSE PAR MORCEAU.** Premier chiffre : +3,4 à +5,7 ms par
  morceau, un seul passage, dont `cityAt` sur les 280 villes du registre pour
  chacune des 400 colonnes de la grille. `villesProches` (une liste par
  morceau, souvent vide) et une seule lecture de `terrainHeight` par colonne :
  **+1,2 ms** (4,9 contre 3,7 en campagne, médiane de neuf). Le témoin garde
  une borne à trois fois la mesure, parce qu'un portail charge.
- **CE QUI RESTE VOXEL SE DÉCLARE.** Les falaises ; un liseré d'un bloc au
  bord de toute zone voxel (ville, bloc posé, falaise) — une voiture y monte
  d'un bloc comme avant (`franchirEnRoulant`), et c'est ce que la sonde a vu
  au bord d'un lac : c'est le bord, pas la surface ; l'eau, qui garde ses
  cubes (la surface passe sous le lac) ; les arbres ; et Manhattan, qui a son
  propre sol. Le voxel d'avant se rejoue par `?solcontinu=0`, jusque dans le
  worker (le drapeau voyage avec le journal des blocs), pour mesurer — jamais
  un réglage, et aucun palier ne le pose : un sol qui changerait de forme avec
  la qualité changerait la hauteur des pieds d'une tablette à l'autre.

**Et j'ai redemandé `invoquer('vache')` — la clé est `cow`.** C'est mot pour
mot « une clé d'espèce n'est pas son nom français » (v285), payée une seconde
fois par le même témoin de bête ; le refus se dit désormais dans le message.
Et le premier verdict de marche exigeait « voxel < 10 blocs » quand la
première marche est à 10,2 : ce qui distingue les deux bras, c'est le
BLOCAGE (60 images le pied contre un bloc), pas une distance ronde.

**ET LE PORTAIL COMPLET A RENDU CE QUE LA SONDE NE POUVAIT PAS VOIR : UN
PIÉTON ET UNE VOITURE N'ONT PAS LE MÊME NEZ.** « Une voiture roule dans la
nature au lieu de buter sur une marche » (`monte.js`) est tombé rouge sur la
branche : bloquée à 13,4 blocs, quarante secondes, sur le couloir de
(−600, −520) à une marche par bloc. Le premier jet de `blocSousLaSurface` ne
taisait que le SOMMET d'une colonne couverte. Un piéton, large de 0,6, n'a
jamais dans sa boîte que la colonne d'à côté — dont le sommet est tu — et la
sonde de la v297 marchait et roulait sur une pente de huit marches étalées.
Une voiture fait 2,26 blocs : son nez est DEUX colonnes devant son centre,
et sur une pente d'un bloc par bloc le cube SOUS le sommet de cette
colonne-là a son dessus à la hauteur de la surface au centre de la colonne
d'avant — sous la surface partout, et pourtant solide. La boîte butait
dessus, et `franchirEnRoulant` (v286) ne pouvait plus rien : le sommet qu'il
aurait escaladé n'arrête rien, donc la voiture n'était jamais « bloquée par
un bloc » au sens du franchissement. La règle est géométrique, pas un
réglage : entre deux colonnes couvertes le relief change d'au plus un bloc,
la surface passe donc à un demi-bloc au plus sous le sommet, et le cube
sous le sommet est sous la surface en tout point de sa colonne. Un témoin
pur de `plafond.js` le garde sur une pente à deux marches consécutives.
**Ce qu'une sonde éprouve sur un piéton ne vaut pas pour une voiture ; ce
qui se mesure « au volant » se mesure avec le gabarit d'une voiture** — et
c'est la voie longue, une fois de plus, qui l'a dit.

**ET MON PREMIER REMÈDE TAISAIT TOUTE LA COLONNE — le second rouge du même
portail a dit pourquoi c'est faux.** « Quand la rame arrive, on propose de
monter à bord » (`monte.js`) pose l'enfant sur le tracé d'un train, en
(−403, 472) : y 28,1, sous une colline dont la surface est à 37,8 — un
TUNNEL. Mesuré à la sonde : `pos.y` = 37,8 dès la première image, le contact
l'avait remonté sur l'herbe, et la rame ne l'a jamais trouvé. Une colonne
NATURELLE a une surface au-dessus et peut avoir un vide en dessous — un
tunnel de train, une grotte, une station de métro — dont le plancher et les
parois sont des cubes de la même colonne : les taire, c'est faire tomber
l'enfant à travers ; le remonter dès qu'il est « sous la surface », c'est le
téléporter hors du tunnel. Ce que la surface tait et où elle accroche est
donc une BANDE (`SOUS_SURFACE`, deux cubes) : le sommet et le cube dessous —
ce qu'il faut à une voiture sur une pente d'un bloc par bloc, et rien de
plus. Sous la bande, le voxel décide, comme avant. **Une règle de contact se
formule par ce qu'elle REMPLACE, jamais par « au-dessus » ou « en dessous »
d'une cote** : la surface remplace deux cubes, pas la colonne. Deux témoins
purs de `plafond.js` — une pente à deux marches, un vide sous une colonne
naturelle — et les deux rouges du portail se rejouent SEULS avant de
fusionner.

**ET LA BANDE NE SUFFISAIT PAS : « UN BLOC » SE COMPTE DEPUIS LE NIVEAU
VOXEL SOUS LA BOÎTE, PAS DEPUIS LA SURFACE QUI LA PORTE.** Rejouée à la
sonde (`tests/sonde-marche.cjs`), la voiture restait à 13,4 blocs, bande ou
pas, franchissement armé ou désarmé — quatre bras identiques, ce qui dit
déjà que le franchissement n'y était pour rien. Mesuré sous node au point
d'arrêt : la colonne devant (T40) n'est PAS couverte, parce qu'en diagonale
sa voisine fait deux blocs de plus — une falaise en travers du couloir, que
le témoin ne voit pas puisqu'il ne lit le profil que le long de son axe.
Ses cubes sont solides, à bon droit. Mais la surface porte la voiture à
39,4 là où le voxel la poserait à 41 (le plus haut cube sous son emprise,
au coin), et le saut d'un bloc depuis 39,4 restait sous le cube à franchir.
`World.niveauVoxel` rend le sol voxel sous une boîte — la cote d'une colonne
couverte, ou le dessus du plus haut cube solide non tu sous les pieds — et
`franchirEnRoulant` vise UN bloc au-dessus de ce niveau ; c'est depuis ce
niveau que « deux blocs, c'est un mur » se juge (sur du plat, niveau 26 pour
des pieds à 26,05, cible 27, un mur à 28 reste un mur). Mesuré à la sonde
après : **90,1 et 101,4 blocs armé, 13,4 et 13,4 désarmé.** Trois règles
pour une seule livraison de sol, et la leçon commune : **une surface qui
remplace des cubes doit dire, à chaque mécanisme qui lisait ces cubes, ce
qu'il lit à la place** — la boîte (la bande), le contact (la bande), le
franchissement (le niveau voxel). Le premier jet n'en avait servi qu'un.

**Et deux leçons de sonde, payées dans la même livraison.** Une capture
« après » de la campagne montrait QUATRE morceaux et le paysage lointain à la
place du proche : la sonde d'état initial tenait le monde pour chargé dès que
deux relevés du nombre de morceaux se ressemblaient, à une demi-seconde
d'écart — c'est le worker qui n'avait pas rendu son premier lot. Elle attend
désormais huit secondes puis quatre relevés stables ; **et la planche
« avant » avait le même défaut**, ce qui l'aurait fait comparer deux images
également fausses. Ensuite, deux vues sur dix de l'état initial étaient
inutilisables — la caméra DANS un tronc à Lille, SOUS le remblai à la gare —
parce qu'elle se posait à `terrainHeight`, qui est le relief, pas le sol. Une
caméra de capture cherche une colonne dégagée (v292), et c'est un TOIT qu'elle
a trouvé dans les deux cas : au sol, ni la gare ni cette entrée de Lille n'ont
un endroit d'où l'on voit — un fait de l'état initial, écrit comme tel.

## Les rues de Paris s'élargissent, et le pas suit (v294)

Max : « les rues de Paris sont trop étroites, élargis-les ». C'est la passe que
la v271 avait laissée de côté (« les six villes bâties à la main gardent leurs
largeurs relevées sur de vrais plans : leur élargissement est une passe à
part ») et que la v293 avait mesurée sans la faire. Six règles.

- **ON MESURE TOUT LE DISQUE, PAS SEULEMENT LE TRAJET.** La v293 avait relevé
  cent cinquante largeurs SOUS les circuits — c'est-à-dire sous les avenues,
  les rues les plus larges de la ville — et conclu « un dixième du trajet ».
  Mesuré sur les 94 000 colonnes du disque (la plus courte traversée de
  chaussée sur douze directions), la chaussée d'une rue de QUARTIER faisait
  **2,0 blocs pour une voiture de 2,26** — médiane 2,5 sur toute la ville, et
  Montmartre à 2,0 partout — et le trottoir 0,55 bloc, où ni un passant ni un
  réverbère ne tiennent. Le trajet mesuré était le meilleur de la ville.
- **UNE LARGEUR EST UN RÉSULTAT, ET IL Y EN A TROIS.** Une rue à sens unique
  3,6 (la voiture au milieu, 0,67 de chaque côté), une ruelle héritée 3,0, un
  boulevard à double sens 5,2 — deux voitures côte à côte, `4 × 1,13 + 0,6`,
  la barre de la v271 — et aucune avenue en dessous : `a(l)` a un PLANCHER
  (`PLANCHER_AVENUE`), parce qu'un raccord à `a(0.6)` faisait 3,1 blocs et
  qu'un convoi y croise l'enfant de face. La table candidate (3,2 · 3,6 · 4,0)
  a rendu 24,0 · 23,2 · 22,0 % de colonnes de lot pour 35,9 avant ; on prend
  la plus petite qui laisse plus d'un demi-bloc de chaque côté.
- **LE PAS SUIT L'EMPRISE, ET L'ÎLOT NE PERD RIEN.** `pas` monte exactement de
  deux fois ce que `face` gagne : l'îlot, qui est ce qui reste (`pas − 2·face`),
  garde sa largeur au dixième. C'est la méthode de la v271 — moins de rues,
  plus larges — appliquée à une trame qui n'est pas la sienne. Le prix se
  déclare : la part de lot passe de 35,9 à 23,2 % du disque, celle du trottoir
  de 17,5 à 24,8.
- **CE QUI SE ROULE SE DEMANDE À LA MÊME RÈGLE QUI LE PAVE.** L'anneau d'une
  place ronde faisait UN bloc (`dp > r − 1`) pendant que `RONDS` y faisait
  rouler la voiture à `r − 0,5` : la moitié de la carrosserie sur le pavé de la
  place. `anneauDe(p)` décide désormais des deux — trois blocs, ou la moitié du
  rayon sur les petites places. Même discipline pour le tour des monuments
  (`LARGE_TOUR` 3 → 4, `AXE_TOUR` en dérive) et pour la ligne axiale de
  `marquageParis`, qui lit `DOUBLE_SENS` au lieu du chiffre 1,2 qu'elle
  recopiait de la table des quartiers.
- **ET LES PONTS DE PARIS ÉTAIENT AU FOND DE LA SEINE.** Trouvé en relisant
  `solParis` pour élargir les ponts : il rendait bien du pavé sur le tablier,
  mais `world.js` l'écrivait à la cote du TERRAIN, c'est-à-dire le lit —
  mesuré sous node, terrain 28, eau à 30, le pavé du pont à 28, et l'on
  traversait à la nage. C'est le piège de la Tamise (v208), que Paris n'avait
  jamais reçu — sixième occurrence du verre dans les murs. `pontParis` dit à
  `world.js` et à `coteRoulable` quelles colonnes portent un tablier (l'eau et
  la berge basse, pour rejoindre la voie sur berge de plain-pied), à la cote
  de la ville. Deux sujets dans la livraison, deux lignes au journal, deux
  témoins (v279).
- **C'EST DU SOL, ET ÇA SE VÉRIFIE.** `hauteurParis` ne lit que `QUAI_BAS` et
  la butte ; aucun des nombres qui changent n'y entre, et les deux empreintes
  de `plafond.js` ne bougent pas. La preuve n'est pas ce raisonnement, c'est
  la suite `plafond.js` verte au portail.
- **UN TÉMOIN DE LARGEUR LIT LE MONDE, EN COLONNES, ET SES BARRES SONT DES
  MILIEUX.** Trois témoins dans `carteMonde.js` : la rue de quartier (fenêtre
  de soixante blocs au nord du centre : médiane 2 → 4, part sous trois blocs
  56 → 19 %), les avenues sous les circuits (dixième centile 3 → 5, part des
  points où deux voitures tiennent 65 → 92 %), et le tablier des ponts (sommet
  de colonne au-dessus de l'eau, `coteRoulable` à la cote de la ville). Les
  barres sont posées au milieu des deux régimes mesurés des deux côtés, et le
  premier jet de la mesure a compté le REBORD du disque comme des rues d'un
  bloc — une rue coupée par le cercle n'est pas une rue étroite, et la mesure
  s'arrête à douze blocs du bord.

## Un circuit se mesure sur le MONDE, pas sur le plan (v293)

Max veut rouler dans Paris sans couture. Mesuré pour la première fois d'un bout
à l'autre : **deux des huit circuits de voitures ne roulaient sur la chaussée
que sur 47 % et 65 % de leur longueur** — le reste du temps ils traversaient les
murs de la caserne posée au cœur de la ville. Cinq règles.

- **`circuitSurRue` MESURE LE PLAN, ET LE PLAN N'EST PAS LE MONDE.** Il lit
  `solParis`, c'est-à-dire ce que la ville PROMET ; les repères, eux, se posent
  APRÈS les colonnes et pavent la rue promise. C'est le piège des ormes du Mall
  (v205) et des feux de Paris (v274), à l'échelle d'un village de
  quatre-vingt-treize blocs — et il a tenu des dizaines de versions parce
  qu'**aucun témoin ne lisait le monde**. Celui de `carteMonde.js` (« aucune
  voiture ne traverse un monument de Paris ») ne regarde que les monuments
  DÉCLARÉS par `paris.js` : la caserne n'en est pas un. Le témoin neuf lit
  `world.getBlock` sur chaque point de chaque circuit, et il est rouge sur
  `origin/main` (47 %) comme il est vert ici (88 %).
- **UN REPÈRE GÉNÉRIQUE N'A RIEN À FAIRE AU MILIEU D'UNE VILLE BÂTIE À LA MAIN.**
  `buildVille` écrit 3 241 colonnes ; 1 547 tombent sur la chaussée du plan et
  834 sur son trottoir. Trois quarts de son emprise sont sur la trame des
  avenues — ce n'est pas un bâtiment qui croise une rue, c'est un village posé
  sur une capitale. Laisser la rue gagner (le `continue` de la v213) aurait
  retiré 73 % de ses colonnes : on déplace le village, on ne le déchire pas.
- **ET LE DÉMÉNAGEMENT SE MESURE, IL NE S'ÉCRIT PAS** (v223). Les cinq
  promesses des aérodromes, telles quelles : au sec, à douze blocs de toute
  ville, de tout aérodrome et de toute voie ferrée, loin de ce que les enfants
  ont bâti, le plus plat possible. Le site retenu a **sept blocs d'écart de
  relief contre onze sur son ancien site** : la caserne est mieux posée en
  banlieue qu'elle ne l'était au cœur de Paris.
- **UNE ADRESSE DE VILLE S'ÉCRIT EN KILOMÈTRES.** `adresseParis(-8,64 ; 9,25)`,
  jamais un décalage en blocs : c'est ce qui la fait SUIVRE Paris à la prochaine
  remise à l'échelle, et c'était toute la raison d'être de la ligne d'avant
  (« ils suivent la ville, ils ne vivent pas à une adresse à eux »). Le témoin
  qui exigeait « au centre de Paris » exige maintenant « à son écart de Paris » :
  **on repointe un témoin, on ne le supprime pas** (v285).
- **ET MA SONDE A CHOISI LE PIRE TRAJET DE LA VILLE ET L'A APPELÉ « LA
  TRAVERSÉE ».** Elle prenait le circuit le plus LONG ; mesuré, celui-là est à
  47 % de chaussée quand deux de ses voisins sont à 100 %. Elle a aussi marché
  TOUT DROIT sur une avenue qui tourne — vingt et un relevés « ailleurs » sur
  vingt-quatre, dans les jardins. Et elle a d'abord cherché un alignement de
  chaussée le long des axes du MONDE, alors que les avenues de Paris sont
  obliques : zéro couloir trouvé. Trois fois de suite, c'est « un témoin qui
  écrit son terrain se trompe de terrain » (v285), du côté d'une sonde. On
  publie donc la TABLE des huit et l'on roule sur celui qu'on a mesuré.

## La tour Eiffel du modèle de Max (v564) — un modèle fourni se prépare dans le repère du jeu

Max a fourni « Eiffel Tower » de Johnson Martin (Sketchfab, CC-BY-4.0, 453 397
triangles). `scripts/tour-eiffel.mjs` en fait `src/tour-eiffel-donnees.js`,
que `paris-monuments-hd.js` lit à la place des poutres de l'atelier. Cinq règles.

- **ON DÉCIME DANS LE REPÈRE DU JEU, AVEC UNE ERREUR EN BLOCS.** Décimé dans
  celui du modèle (erreur relative), le sommet se cassait dès 15 000 triangles
  pendant que les jambes gardaient un détail invisible (vu en capture). Mis
  d'abord à l'échelle, une erreur de 0,025 bloc rend 39 799 triangles qu'on ne
  distingue pas de l'original.
- **UN MODÈLE FOURNI SE MET À NOS DEUX ÉCHELLES, ET LA BOÎTE DU REPÈRE BORNE
  L'EMPRISE.** La hauteur reste celle du ciel (69, v335), l'emprise remplit le
  parvis (socles à ±8,4 dans la boîte de 9) : les rues autour du socle ne
  bougent pas. Plus étroit (l'emprise du voxel d'avant), le modèle était une
  aiguille de télévision.
- **QUAND LE MODÈLE EST LA RÉFÉRENCE, C'EST LE VOXEL QUI LE SUIT** — l'inverse
  de la v292, où le modèle d'auteur suivait le voxel. Le bâtisseur neuf
  (`buildEiffelModele`) est un champ `tour` : le monde d'avant garde l'ancien
  (v357), et un bâtisseur de monument ne touche pas `terrainHeight`. Ses cotes
  sont RELEVÉES sur le modèle couche par couche, et sa couverture se mesure :
  zéro cube hors du modèle, zéro mur invisible (`sonde-monuments-hd.cjs`).
- **UN VOXEL REMPLI DEPUIS UN MODÈLE EST UNE CHEMINÉE.** Toute cellule où le
  modèle a de la surface donnait un fût plein (vu en capture) ; or c'est le
  voxel qu'on voit au-delà de la couche HD. Le bâtisseur garde la grammaire du
  treillis (montants, ceintures toutes les trois couches, diagonales, étages en
  anneaux), et un témoin borne le fût à neuf blocs par couche.
- **UNE GÉOMÉTRIE QUE LE WORKER ET LE FIL PRINCIPAL LISENT S'IMPORTE, SANS
  PROMESSE.** Varints et base64 décodés à l'import, aucun décodeur asynchrone
  (celui de meshoptimizer attend son wasm). Et un modèle indexé s'émet par
  COINS (`face.c`, un sommet et sa normale lissée jusqu'à 40°) : une fois par
  morceau au lieu d'une fois par triangle — +158 → +45 ms sur le morceau
  central, 14,8 → 11,4 Mo pour les quatre morceaux. Le crédit vit dans
  `vendor/TOUR_EIFFEL_LICENSE` et dans `CREDIT`, qu'un témoin lit.

## Les monuments de Paris sont des modèles, le voxel reste le squelette (v292)

Quatrième livraison du programme. Sept règles, et cinq viennent d'une mesure qui
m'a contredit.

- **CE QU'ON MASQUE EST CE QUE LE MODÈLE COUVRE, PAS CE QUE LE BÂTISSEUR A
  ÉCRIT.** Mon premier jet — celui du prototype reçu — masquait toutes les
  cellules du bâtisseur dès qu'un monument avait un modèle. Mesuré à la sonde
  (`tests/sonde-monuments-hd.cjs`) : **325 cellules exposées sans rien devant
  elles aux Invalides, 128 à Notre-Dame**, dont les soixante-dix-neuf du PARVIS.
  L'enfant se cogne à rien et une dalle pavée disparaît sous ses pieds — c'est
  « un bouton qui ne fait rien est pire qu'un bouton qui refuse » (v228), à
  l'échelle d'un mur. La couverture du modèle se RASTÉRISE une fois par monument
  (`cellulesCouvertes`, dilatée d'un bloc) et c'est elle qui décide : zéro mur
  invisible sur les huit, par construction ET mesuré. Le prix est l'inverse, et
  il se déclare : des cubes qui dépassent d'un modèle lisse — honnêtes, et qui
  arrêtent ce qu'ils ont l'air d'arrêter.
- **UN MODÈLE D'AUTEUR SUIT LES COTES DU VOXEL, parce que c'est le voxel qui
  arrête l'enfant.** Le modèle des Invalides posait la coque générique au MILIEU
  du repère : 25 % de sa surface tombait dans le vide, dont 7 097 points à
  hauteur d'enfant. Le voxel n'est pas centré — une longue façade au nord
  (x ±10, z −5..−2), l'église du Dôme au sud (x ±5, z 0..8). Réécrit sur ses
  cotes : 0,0 %. **Un modèle ne se dessine pas d'après le monument réel, il se
  dessine d'après le bloc qu'il remplace** ; le monument réel décide de la
  FORME, le voxel des COTES.
- **ET PARFOIS C'EST LE VOXEL QUI A TORT — et alors on le corrige.** La tour
  Eiffel portait une ceinture de fer PLEINE au niveau de la rue : un anneau de
  treize blocs de côté qui fermait le dessous de la tour. On ne pouvait pas
  passer entre les piliers, ce qui est pourtant tout ce qu'on fait au
  Champ-de-Mars. Un bâtisseur de monument n'écrit pas `terrainHeight` : le
  changer ne touche NI l'une NI l'autre des empreintes de `plafond.js`, et les
  blocs des enfants sont réappliqués par-dessus. C'est la seule famille de
  blocs du jeu qu'on peut corriger sans rien déclarer.
- **UN NOM DE MONUMENT N'EST PAS UNIQUE SUR UNE CARTE DU MONDE.** Filtrer les
  quatre cents repères par leur NOM rendait NEUF monuments pour huit modèles :
  « Panthéon » est aussi un repère de ROME, qui recevait la coupole du Quartier
  latin à deux mille blocs de là. Une PLACE est unique, un nom ne l'est pas :
  `REPERES_HD` filtre sur le nom **et** le disque de Paris, et un témoin compte
  huit noms distincts.
- **LE MAILLEUR EST LE CHEMIN LE PLUS CHAUD DU JEU : RIEN NE S'Y BALAIE.** Le
  prototype relançait le bâtisseur du monument et parcourait TOUT le journal des
  blocs (`[...world.edits.keys()]`) à chaque morceau. Les cellules du bâtisseur
  sont mémoïsées PAR MORCEAU — il est déterministe — et « ce monument a-t-il été
  touché ? » est un INDEX tenu par `World` (`monumentsTouches`), refait quand un
  journal est installé d'un bloc. **Le worker remplace `edits` en entier à chaque
  resynchronisation** : il passe donc par `installerEdits`, jamais par une
  écriture directe des deux cartes, et un témoin garde ce chemin-là.
- **LE COÛT SE MESURE EN ORDRE ALTERNÉ, ET CE QUI COMPTE EST CE QUE LE PALIER
  LIT.** +12,7 ms par morceau de monument au banc (1,36×), zéro sur un morceau
  de Paris qui n'en porte pas. La question n'est pas « est-ce cher » mais « cela
  déclasse-t-il l'appareil » : `rangerLePalier` prend une **médiane** sur des
  centaines de morceaux, et huit d'entre eux ne la déplacent pas. Une
  fonctionnalité qui alourdit un morceau sur cinquante doit se poser cette
  question-là, parce qu'un appareil déclassé perd la couche HD ENTIÈRE (v291).
- **UN TÉMOIN QUI CHERCHE SON TERRAIN DOIT ÉCARTER CE QUI N'EST PAS SON SUJET.**
  Le portail a rendu rouge « chaque quartier a son registre » : Marais enduit 0,
  volets 0, pierre 64 — sur un registre parfaitement en place. Ce témoin CHERCHE
  (v285) « un morceau du Marais qui porte des façades » ; le modèle de
  Notre-Dame ajoute plus de deux mille sommets de PIERRE aux trois morceaux de
  l'île, et le témoin a donc retenu (−13, 13) au lieu de (−13, 12). Mesuré sur
  `origin/main`, le MÊME témoin rend 4 516 · 8 320 sur l'autre morceau : c'était
  bien ma livraison, et la correction est dans le témoin. **La règle « un témoin
  qui écrit son terrain se trompe de terrain » a un revers : un témoin qui
  CHERCHE son terrain peut le trouver ailleurs le jour où l'on ajoute du contenu**
  — et le critère de recherche doit exclure ce contenu-là par son nom
  (`monumentsDetailles`), pas par un seuil de sommets.
- **UNE CAMÉRA DE CAPTURE SE PLACE, ET « SE PLACER » VEUT DIRE VOIR.** Mes deux
  premières planches ont photographié un plafond haussmannien, puis un mur
  haussmannien à trois mètres : la caméra était posée à `terrainHeight + h`, puis
  sur une colonne dégagée — mais avec un immeuble entre elle et le monument. Une
  sonde de captures cherche un poste D'OÙ L'ON VOIT : elle balaie les caps, elle
  MARCHE jusqu'au monument en vérifiant que rien ne dépasse du sol, et le cap
  retenu entre dans le message. C'est « un témoin qui écrit son terrain se trompe
  de terrain » (v285), appliqué à un objectif.

## Les toits de Paris sont un champ de hauteurs (v289)

Troisième livraison du programme. Quatre règles, et la première a coûté trois
remèdes écrits pour rien.

- **UN TOIT SE LIT PAR COLONNE, PAS PAR FACE — parce qu'une trame tournée
  transforme des anneaux en escaliers.** Le voxel pose le comble en marches
  (un rang de zinc en façade, deux un pas en arrière, trois au cœur), et la
  première lecture HD dessinait une pente par face de bloc exposée. Sur la trame
  du Marais, tournée de 24° par rapport au monde, ces rangs ne sont pas des
  anneaux emboîtés mais des BANDES DIAGONALES en escalier : une pente par face y
  rend un champ de tentes pointues, et Max aurait vu un hérisson. J'ai écrit
  TROIS remèdes par face — les croupes aux coins, le faîte au milieu du bloc
  quand la face opposée est à l'air, une file verticale de faces qui partage sa
  pente — et les deux derniers ne changeaient RIEN à la capture. C'est la sonde
  `sonde-ailerons`, qui imprime la configuration de blocs derrière chaque quad
  dégénéré, qui a dit que les ailerons étaient le voxel lui-même lu par face.
  **Devant un rouge qu'on n'explique pas du premier coup, on écrit la sonde qui
  distingue les cas** (v223) — et ici la relecture ne pouvait pas le voir, parce
  que chaque face était juste. Le remède : la hauteur d'un COIN de colonne est
  la moyenne des sommets des colonnes de toit voisines (`toitDessusHD`), et sur
  un escalier diagonal cette moyenne est un plan oblique. Une colonne, un quad ;
  le brisis reste par face et monte jusqu'au bord du champ.
- **ET LE CHAMP NE LISSE QU'UN IMMEUBLE AVEC LUI-MÊME.** Deux immeubles voisins
  de hauteurs différentes ont deux toits ; une moyenne qui les mélangerait ferait
  monter le toit du bas vers celui du haut. `infoFacadeParis` publie l'îlot et la
  travée (`ai`, `bi`) : c'est la même trame que le voxel (v287), et c'est elle
  qui dit « même immeuble » — mémoïsée, parce qu'un coin la demande quatre fois.
- **LE COÛT SE MESURE DES DEUX CÔTÉS AVANT DE CONCLURE.** La première mesure du
  mailleur rendait 148 ms par morceau, contre 99 sur `origin/main` — à froid.
  Chauffé, 97 contre 99. Un chiffre de coût pris sur le premier passage n'est pas
  une mesure (v268, l'ordre alterné) ; ici il aurait fait retirer un cache qui
  ne coûte rien.
- **ET LES TÉMOINS D'UNE FORME QUI CHANGE SE RÉÉCRIVENT AVEC ELLE.** La bande
  « terrasson à 45° » (ny entre 0,6 et 0,8) était juste pour une pente par face ;
  un champ de hauteurs va de 45° à plat, et un brisis qui monte à un bloc et demi
  sort de son bloc. Les bandes et l'étendue admise ont suivi la forme, et leurs
  chiffres ont été remesurés (2 512 · 2 292 · 1 552), pas recopiés — et la
  barre du terrasson, posée d'abord sur le compte d'une sonde à bande plus
  étroite (984), a été remontée à la moitié de ce que le TÉMOIN mesure.

## Les quartiers, les arbres et le mobilier de Paris (v288)

Deuxième livraison du programme. Cinq règles, et trois sont nées d'une capture
qui m'a contredit.

- **UN QUARTIER EST UN REGISTRE, PAS UNE TEINTE.** `STYLES` (facadeshd.js)
  décide du mur (pierre ou enduit), de la largeur des baies, des volets, du
  balcon filant, du store et de la corniche ; `styleDuQuartier` lit le nom que
  `infoFacadeParis` publie depuis la trame du voxel. Un quartier neuf se déclare
  là, jamais dans un registre par une condition sur son nom. Et le témoin
  compare des DISTRIBUTIONS de tuiles (enduit contre pierre, volets contre
  aucun), pas une couleur.
- **LE MORCEAU TÉMOIN D'UN QUARTIER SE CHERCHE.** Le centre du Marais est une
  place : le morceau qui s'y trouve n'a pas une façade, et mon premier témoin
  rendait « enduit 0, volets 0, pierre 0 » — rouge sans rien mesurer. C'est
  « un témoin qui écrit son terrain se trompe de terrain » (v285), pour un
  quartier : on balaie autour jusqu'à un morceau qui porte des façades, et le
  morceau retenu entre dans le message.
- **UNE COURONNE SE CENTRE SUR SON TRONC ET SE BORNE.** La boîte des feuilles
  mesurée à ±3 blocs avalait celles du voisin : sur les Champs-Élysées, plantés
  tous les trois blocs, la rangée devenait une HAIE plate de sept blocs de large.
  Vu en capture, pas en témoin — le témoin compte des fûts. La boîte se lit à
  ±2, la couronne se centre sur le fût, ses rayons sont bornés, et elle est un
  peu plus haute que large.
- **LE MOBILIER SE COMPTE EN APPELS DE DESSIN AVANT DE SE JUGER EN CAPTURE.**
  Mon premier réverbère parisien faisait douze maillages, contre cinq avant :
  une rue du Marais passait de 1 100 à 2 500 appels — le goulot de l'iPad
  (« ce sont les appels de dessin », v196), multiplié par les centaines de
  réverbères d'une ville. Toute la fonte est FUSIONNÉE en une géométrie
  (`fusionner`, props.js), la lanterne à part : deux appels, et un témoin les
  compte dans la page. Un prop de rue se dessine en une ou deux pièces, pas en
  douze.
- **LE MOBILIER HD VIT DANS `facades` ET NE BLOQUE RIEN.** Potelets, terrasses,
  mitres et arbres sont des tampons du morceau : ils coûtent zéro appel de
  dessin de plus et disparaissent avec le loin. Le prix déclaré : une chaise de
  terrasse n'arrête ni un passant ni une voiture (ce n'est pas un `prop`, donc
  pas un obstacle de `mobilierDevant`). C'est une dette de la PR4, la conduite,
  déclarée dans `TASKS.md` — pas un oubli.
- **UN TÉMOIN QUI GUETTE UN MORCEAU NOMMÉ MESURE L'ORDRE DE LA FILE, PAS LE
  RELAIS.** Celui du près/loin attendait trois morceaux « à cinq » et dormait
  quarante secondes : rouge au portail ET seul, sur une machine qui rend 0,75
  image par seconde à `rr=6` avec la couche HD. La sonde (`sonde-hd-lod.cjs`)
  a dit en une exécution que le relais était juste dès 3 s et que ces trois
  morceaux arrivaient à 41 et 43 s — celui de l'autre côté dès 22 s — parce
  que le fil principal installe les morceaux au rythme des IMAGES (une
  recharge de la file par image, v269). Une borne posée sous le coût mesuré
  (v225), sur une durée fixe (v270), sur un ordre d'arrivée que rien ne
  garantit. Le lointain, c'est TOUT morceau au-delà du rayon HD ; on attend le
  résultat, borné, et la durée entre dans le message.
- **ET UNE SONDE DE CAPTURES QUI AVALE SES ERREURS PREND TROIS VUES SUR CINQ.**
  `sonde-captures-paris.cjs` sortait par un `finally … process.exit(0)` qui
  masquait l'exception de la quatrième vue ; les deux dernières n'existaient
  pas et le code de sortie disait zéro. Chaque vue attrape et NOMME son échec
  (« page.screenshot: Timeout »), et la capture attend deux minutes — une page
  de Paris à `rr=9` avec la couche HD rend une image toutes les dix secondes en
  rendu logiciel.

## Paris en relief — le voxel est le squelette, plus le dernier mot (v287)

Décision de Max, septembre 2026, et c'est le cap du jeu désormais : Grand Tour
est un MONDE OUVERT beau et vivant, Paris en premier, puis la conduite, puis
toutes les villes d'Europe. Le bloc reste le squelette — collisions, sauvegardes,
coordonnées, édition — mais il n'est plus forcément ce qu'on voit. Six règles
sont nées de la première livraison, et elles valent pour toute couche de rendu
à venir.

- **UNE COUCHE DE DÉTAIL LIT LES BLOCS, ELLE N'EN ÉCRIT AUCUN.** `facadeshd.js`
  est une seconde passe du mailleur sur les MÊMES données de morceau, dans le
  même worker : elle rend des tampons (positions, normales, UV, tuile, matière,
  lueur), jamais un bloc. C'est ce qui rend l'invariant 1 vrai PAR CONSTRUCTION
  — et un témoin le mesure quand même, à l'octet près.
- **LE VOXEL PLAT RESTE LE LOIN.** Pour chaque face de façade détaillée, le
  mailleur garde la face plate d'avant dans un tampon à part (`plat`, et
  `platLumineux` pour les vitres allumées) ; `montrerLeDetail` (main.js) relaie
  près/loin à chaque changement de morceau, SANS remaillage. Jamais les deux à
  la fois : la face plate au nu du mur cacherait la baie en retrait. Le loin ne
  change pas d'un pixel, la ligne de corniche non plus.
- **UN SEUL MATÉRIAU, LA MATIÈRE PAR SOMMET.** Un atlas de 1 024 pixels, un
  `MeshStandardMaterial` dont la rugosité, le métal et la lueur sont des
  ATTRIBUTS (`matiere`, `lueur`) : la pierre, le zinc, la vitre et le fer
  vivent dans le même maillage, donc UN appel de dessin par morceau quel que
  soit le nombre de fenêtres. Les quatre lampes du jeu et la clé de programme ne
  bougent pas (v248, v264). Une vitre est un métal sombre peu rugueux : c'est le
  métal qui fait le miroir, et l'environnement PMREM (recette de Manhattan,
  préfiltré une fois) ce qu'il reflète.
- **LA MÊME RÈGLE D'EXPOSITION QUE LE PLAT, ET LE COMPTE SE VÉRIFIE.** Le
  détail est émis pour une face si et seulement si `shouldRenderFace` l'aurait
  émise contre son voisin — c'est ce qui rend le détail cohérent avec un bloc
  posé ou retiré par un enfant contre une façade. Le témoin compte les faces
  exposées INDÉPENDAMMENT sur les blocs et exige l'égalité avec ce que le
  mailleur déclare (`facadesDetaillees`).
- **LE PALIER DÉCIDE DE LA PORTÉE, ET LE PALIER BAS NE PERD RIEN.** `hd` dans
  la table de `palier.js` (0 · 3 · 6 morceaux) ; `?hd=` force et compte comme
  configuration forcée (le palier ne se range pas). Un monde dont `hd` vaut
  zéro rend EXACTEMENT les tampons de la v285 : ni sol, ni façades, ni plat.
- **ET LA COUCHE SE COUPE EN RENDU LOGICIEL, COMME LES OMBRES.** La fumée a
  rougi sur la branche et pas sur `origin/main` (« on prend le volant d'une
  voiture vue dans la rue ») ; la sonde à deux bras (`sonde-volant-hd.cjs`) a
  dit en une exécution que les voitures étaient là et roulaient, et que la
  page rendait 1,2 image par seconde avec la couche contre 3 sans — du
  REMPLISSAGE que SwiftShader paie au processeur. `RAYON_HD` vaut zéro quand
  `renduLogiciel()` est vrai ; `parishd.js` force `?hd=2`, comme les témoins du
  regard forcent `ombres=1`. Un témoin qui mesure la rue de Paris sans le
  demander joue donc sans HD — et c'est ce qui garde les bornes de `monte.js`
  telles quelles.
- **UNE RÈGLE DE FAÇADE VIT DANS `paris.js`, LA COUCHE LA DEMANDE.**
  `infoFacadeParis` publie l'îlot, la travée et le quartier depuis la MÊME
  trame que le voxel (`formeParis`) : la teinte de pierre et l'enseigne se
  tirent par immeuble, jamais par colonne. Deux trames qui décrivent le même
  immeuble finiraient par diverger.

- **UNE RUE SE LIT À SON MARQUAGE, PAS À SA MATIÈRE — ET UNE RUE DE PARIS A
  SON MARQUAGE À ELLE.** Les premières captures HD avaient une chaussée de
  pavés uniformes entre deux trottoirs à la même cote ; Max : « ils n'ont pas
  clairement de route ». Mon premier remède y a mis une ligne axiale en
  pointillés dans chaque rue : Max, sur la planche suivante, « des vraies routes
  qui ressemblent à des vraies routes parisiennes ». Une rue de Paris est à sens
  unique et N'A PAS de ligne axiale — c'était une route de campagne. Ce qu'elle
  a : une chaussée d'asphalte noir, un caniveau de pavés de granit, une bordure
  de granit clair qui MONTE, un trottoir d'asphalte gris (pas de dalles, c'est
  Berlin), le passage piéton à larges bandes dans le sens de la marche des
  voitures, et juste avant lui la ligne d'effet des feux en travers. La ligne
  axiale ne reste qu'aux boulevards à double sens (chaussée de 2,4 blocs). Tout
  se DÉDUIT de la trame (`marquageParis`, dans `paris.js`, à côté de `solParis`
  qui décide du sol) et se dessine dans le tampon `sol` : aucun bloc posé, donc
  rien pour les collisions ni les sauvegardes. Les quartiers hérités
  (désordre ≥ 2) n'en ont pas — Paris non plus rue des Rosiers.
- **LE TROTTOIR EST RELEVÉ PAR LA COUCHE, PAS PAR LE SOL.** La face du trottoir
  se dessine `RELEVE` (un dixième) au-dessus du bloc, avec une jupe de granit
  partout où il donne sur plus bas ; l'enfant marche à la cote du BLOC et ses
  pieds entrent d'un dixième dans l'asphalte, ce qui ne se voit pas. Baisser la
  chaussée à la place ferait FLOTTER les voitures, qui roulent à la cote du
  bloc : entre des pieds enfoncés d'un dixième et des roues en l'air, on choisit
  les pieds. C'est la même règle que le voxel-squelette, à l'échelle d'une
  marche.
- **UN REPLI D'UV DANS UNE TUILE CASSE LES DÉRIVÉES, ET LE MIP DESSINE UN
  QUADRILLAGE.** Vu sur les captures aériennes : un trait clair au pas d'un bloc
  sur tout le sol. Au bord de chaque bloc `fract()` saute d'une tuile entière, la
  carte graphique lit une dérivée énorme et prend le mip le plus grossier — la
  couleur moyenne de l'atlas. `textureGrad` avec les dérivées de l'UV NON replié
  (`matierehd.js`) règle la chose ; `textures.js` porte le même repli depuis
  toujours et le même quadrillage, moins visible sur des tuiles de seize pixels.

**Et le mobilier est éclairé.** `props.js` était en `MeshBasicMaterial`, la
seule chose du monde qui ne recevait ni le soleil ni la nuit depuis la v247. Il
passe en Lambert ; ce qui ÉMET (la lanterne d'un réverbère, la lentille vive
d'un feu) est émissif, sinon un feu rouge serait noir à minuit.

**Le repère d'une face** (`s` le long, `t` en hauteur, `d` en saillie, négatif
en retrait) est ce qui rend un registre lisible en dix lignes ; les enroulements
des quads y sont vérifiés une fois pour toutes (le repère est direct : S × T =
D pour les quatre directions). Et un garde-corps se lit à ses VERTICALES, pas à
ses volutes : mon premier jet de ferronnerie rendait un gribouillis à l'écran.

Ce que la livraison ne fait PAS encore, et qui est le programme des suivantes
(`TASKS.md`) : les quartiers n'ont pas encore chacun leur registre (Marais,
Montmartre, Cité…), le comble reste en voxel, le mobilier parisien et les
monuments héros viennent avec la PR2, la nuit avec la PR3, la conduite avec la
PR4. La couche est faite pour s'étendre : `couvreHD` décide par morceau, et les
villes engendrées posent déjà les mêmes blocs `ARCHI`.

## Les villes engendrées ont un tissu, et un fleuve qu'on franchit (v282)

Max : « que ce soit beaucoup plus réaliste… que je me prenne à Barcelone, je le
sentais l'ambiance de Barcelone et pas toutes les villes qui sont copiées-collées
les unes aux autres. » Neuf règles, et six sont nées d'une mesure qui m'a
contredit.

- **QUATRE SUJETS SONT ENTRÉS SANS UN SEUL TÉMOIN, ET C'EST LA v278 QUI
  RECOMMENCE.** Les tissus, le cœur d'îlot, la place, les arcades : 613 lignes de
  `villesmonde.js`, zéro verdict, dans une branche dont je croyais le travail
  fait. Ce qui l'a vu n'est pas une relecture, c'est le geste que la v279 avait
  écrit : **compter les sujets dans le DIFF et non dans l'intention**
  (`git diff --stat`, puis `git diff | grep "verifier('"`). Les quatre témoins
  existent désormais, vérifiés rouges sur l'ancien code — et les écrire a trouvé
  trois défauts que le code n'avait pas déclarés.

- **DEUX GRANDEURS QUI PORTENT LE MÊME MOT « PAREIL » NE DISENT PAS LA MÊME
  CHOSE.** J'avais écrit dans le code que « Zurich et Bologne ont le MÊME sol,
  bloc pour bloc ». Mesuré : 52,6 % de colonnes identiques. Ce qui valait 1,000
  c'était la similarité des DISTRIBUTIONS — les mêmes matières dans les mêmes
  proportions — et pour une AUTRE paire, Accra et Kiev ; l'identité colonne par
  colonne culminait à 95,9 %, Varsovie et Budapest. Le témoin mesure les deux,
  et c'est lui qui a démonté ma phrase (1,000 → 0,988 et 95,9 % → 77,5 %).
  **Avant d'écrire « identique », on dit identique EN QUOI.**

- **L'ÉCART EST LA GRANDEUR, PAS LA MOYENNE.** « Les îlots ont un cœur » ne se
  mesure pas par une part bâtie basse — une ville creuse en donnerait autant.
  Ce qu'on garde, c'est qu'un tissu dense et un tissu aéré ne se ressemblent
  pas : huit tissus de 7,9 % (organique) à 25,3 % (medina), 17,4 points d'écart,
  contre ZÉRO quand un seul plan servait les 267.

- **UN TÉMOIN DE PRÉSENCE GARDE AUSSI L'ABSENCE.** « On marche sous les arcades »
  vérifié à Bologne et à Turin seulement laisserait poser des portiques dans
  toute l'Europe : Zurich et Copenhague sont dans le même verdict, à zéro.

- **UN PONT SE POSE AU-DESSUS DE L'EAU, ET LA RÈGLE N'AVAIT JAMAIS QUITTÉ
  LONDRES.** Rendre leur fleuve à onze villes a fait perdre TOUS leurs anneaux de
  circulation à quatre d'entre elles — Hambourg, Lyon, Belgrade, Bâle. J'ai
  d'abord affiné les décalages d'anneau, deux fois : mesuré, 539 → 788 anneaux et
  les MÊMES QUATRE À ZÉRO. **La sonde qui SÉPARE les cas** a répondu en une
  exécution : 277 à 312 candidats sur 357 rejetés POUR L'EAU, et le moins mauvais
  mouillé sur deux à six points de quarante — l'anneau ne ratait pas la rive, il
  ratait un PONT. Les décalages fins sont retirés : non-résultat mesuré, qu'on ne
  le réécrive pas. Le remède, lui, était écrit depuis la v208 (le tablier de la
  Tamise à la cote des quais) et la v210 (`coteRoulable` : « le terrain n'est pas
  la surface roulable ») — et il n'avait jamais servi ailleurs qu'à Londres.
  Cinquième occurrence du verre dans les murs : **la PORTÉE du remède, jamais la
  règle.**

- **UNE SEULE RÈGLE, TROIS LECTEURS.** `anneauxDeVille(f)` est pure et mémoïsée :
  elle choisit les anneaux ET publie les tabliers qu'ils exigent. La CIRCULATION
  les lit pour rouler, le SOL pour poser le béton, `coteRoulable` pour savoir à
  quelle hauteur on roule. Deux tables qui décrivent le même pont finiraient par
  diverger — discipline de `postesAvion` et de `feux.js`.

- **UNE BORNE DE TRAVERSÉE SE MESURE SUR CE QU'ELLE DOIT LAISSER PASSER.** Au
  bloc — pas au quarantième de périmètre, dont le pas vaut jusqu'à quinze blocs —
  le tronçon mouillé vaut 8 blocs à Bâle, 14 à Lyon, 19 à Belgrade, 23 à
  Hambourg, soit 222, 389, 528 et 640 mètres à trente-six blocs par kilomètre :
  l'ordre de grandeur du Mittlere Brücke, du pont Wilson, du Brankov most et des
  Elbbrücken. `PONT_MAX` vaut vingt-quatre. Et la borne grossière qui économise
  le calcul exact (`mouille > 10`) est gardée parce qu'on a MESURÉ ce qu'elle
  coûte : levée, elle rend 73 ms et n'ouvre AUCUNE ville de plus.

- **LA LARGEUR D'UN OUVRAGE SE DIMENSIONNE SUR CE QUI ROULE DESSUS, ET ELLE SE
  DEMANDE À LA TRAME.** Mon premier jet écrivait `t.w / 2` en croyant `t.w` la
  chaussée : c'est la DEMI-chaussée (2,8 blocs mesurés, donc 5,6 depuis la v271).
  Le tablier faisait la moitié de sa propre rue, et la voiture — décalée dans sa
  voie de droite — roulait le flanc sur le parapet.

- **UN LAC N'EST PAS UN DÉTROIT, ET L'ANCRE EST OÙ L'ENFANT ATTERRIT.**
  `prolonge` étire chaque fleuve jusqu'au bord du disque dans l'axe de son dernier
  segment ; l'Alster FINIT au centre de Hambourg, et prolongée vers le sud elle
  passait à trois dixièmes de bloc de l'ancre — trois cents mètres d'eau sur le
  Rathaus, c'est-à-dire **sur le point exact où la téléportation dépose
  l'enfant**. Un plan d'eau qui a une vraie fin dans la ville se déclare `borne`.
  Deux autres ancres étaient noyées pour d'autres raisons : mon Rhin passait sur
  la Marktplatz de Bâle, ma confluence de Belgrade à un bloc de la place de la
  République. **Un tracé de fleuve se mesure À L'ANCRE**, et la correction se
  mesure aussi : la translation de Belgrade est la plus PETITE qui laisse trois
  cents mètres de quai, pas un redessin à l'intuition. Mesuré après : onze ancres
  au sec, l'eau la plus proche de 175 m (Cologne) à 900 (Séville).

## Retirer un mode entier (v285) — et ce qu'il prêtait au reste du jeu

Max : « Remove the Pokémon play entirely ». Les trois règles de la v256 — on
retire l'écran et les commandes jamais les données, un message réseau retiré se
reçoit encore, ce qu'un enfant a écrit reste visible — se sont appliquées
telles quelles. Cinq règles NEUVES en sortent, et la première est la plus
importante.

- **UNE FONCTIONNALITÉ QU'ON RETIRE PEUT POSSÉDER UNE PIÈCE DU JEU ENTIER.**
  `toast` — le petit bandeau qui dit « fais demi-tour », « Sauvegarde allégée »,
  « un parent vient de changer tes réglages » — était une MÉTHODE de
  `CreatureManager`, appelée de **quarante-neuf endroits** qui n'ont jamais eu
  affaire à une créature. Supprimer le fichier aurait rendu le jeu muet. Avant de
  retirer un module, on ne regarde pas seulement ce qu'il fait : on regarde ce que
  le RESTE du jeu lui demande (`grep -n "monModule\." src/*.js`). La voix du jeu a
  désormais son fichier, `src/bandeau.js`, sans un seul import — et c'est un
  assainissement, pas un dommage collatéral.
- **ET RETIRER UNE PROPRIÉTÉ D'UN OBJET DE CONTEXTE NE SE VOIT NULLE PART — je
  l'ai cassé moi-même.** `main.js` passait `toast:` à `initFun`, j'ai retiré la
  ligne, et `fun.js` continuait de le DÉSTRUCTURER : `toast` valait `undefined`, et
  chacun de ses bandeaux — un bébé qui naît, un parkour réussi, un cache-cache
  lancé — aurait jeté au premier appel. Rien dans `node --check`, rien dans une
  relecture : un objet de contexte n'a pas de contrat. Le remède est meilleur que
  la correction : **le module extrait s'IMPORTE, il ne se fait pas passer de main
  en main.** `fun.js` importe `bandeau.js`, et c'est tout l'intérêt de l'avoir
  sorti — n'importe quel module parle à l'enfant sans dépendre de son voisin.
  Le contrôle qui l'a dit compare les deux listes (ce que `fun.js` déstructure,
  ce que `main.js` fournit) — **et il commence par prouver qu'il voit
  `scene`/`world`/`player`**, parce que ma première version annonçait les
  dix-neuf propriétés manquantes, y compris celles qui étaient là : une sonde qui
  interroge la mauvaise tranche ne peut rien voir, quel que soit le code (v273).
- **ET UN RETRAIT NE PREND PAS UN NOM PARTAGÉ.** `#catch-banner` est né avec la
  fête de l'attrape ; `grandBandeau` s'en sert pour les captures, les arrivées de
  joueurs et les moments du siège — et il le lisait AVANT sa ligne de
  déclaration, ce qui aurait cassé au premier coup de ciseaux. Le nom reste : on
  renomme ce que l'enfant VOIT, jamais ce qui porte le mécanisme (v275, par
  l'autre bout).
- **UN TÉMOIN PEUT MESURER UNE RÈGLE SUR UN SUJET QUI S'EN VA — ON LE REPOINTE,
  ON NE LE SUPPRIME PAS.** Le témoin de la v238 (« ce qu'on retire de la scène se
  rend à la carte graphique ») éprouvait `liberer.js` sur les créatures ; la règle
  n'a jamais tenu à elles, et les BÊTES suivent le même cycle — une naissance
  toutes les secondes et demie, un retrait à soixante-dix blocs. **Et sa borne de
  garde se REMESURE** : une créature coûtait dix-neuf géométries et demie, une
  vache en coûte moins, et une barre recopiée de l'ancienne mesure aurait rendu ce
  témoin rouge sur du code sain. Un témoin qu'on déplace se remesure comme un
  témoin qu'on écrit.
- **UN BOUTON RETIRÉ LAISSE UN TROU DANS SA RANGÉE.** La rangée du haut à droite
  était cotée 8 · 56 · 104 · 152 en pixels ABSOLUS ; retirer celui de 56 y
  laissait un vide et les deux suivants ne suivaient pas tout seuls. C'est « tout
  ce qui est coté par rapport à une constante qu'on déplace se déplace avec
  elle » (v280), vu depuis le retrait : `grep -n "right: " index.html` prend dix
  secondes.
- **UN PERSONNAGE PEUT PERDRE SON SUJET SANS QUE PERSONNE NE LE VOIE.** Les
  phrases qui promettaient un Dex et des « dresseurs » se cherchent facilement ;
  Lise, « biologiste qui étudie les martiens », ne se cherchait pas — les
  martiens étaient une ESPÈCE de créature (`TYPES.MARTIEN`), pas un habitant de la
  base spatiale. Mars reste, elle devient géologue. Un personnage qui annonce une
  commande disparue est pire que muet, et c'est la règle des messages de la maison
  appliquée à un dialogue.
- **ET LE FICHIER NEUF MANQUAIT DANS `sw.js` — c'est un CONTRÔLE qui l'a dit, pas
  une relecture.** `bandeau.js` aurait été absent hors ligne, c'est-à-dire sur
  l'iPad dans l'avion. Trois lignes de node suffisent et se rejouent à chaque
  livraison qui ajoute un fichier : tout `src/*.js` est dans la liste `ASSETS`,
  tout `src/*.js` a un gardien dans `tests/tout.js`, et tout `import './…'`
  résout. La règle « ne jamais livrer un fichier que personne n'importe » se
  double donc de son inverse : ne jamais livrer un fichier que personne ne met en
  cache.
- **ET RETIRER UNE CLÉ DE LA TABLE DES GARDIENS ANNULE TOUS LES ACQUIS DE
  REPRISE.** `gardiensElargis` refuse une clé disparue, et il a raison — il ne
  peut pas distinguer « un gardien retiré » (qui peut cacher quelque chose) de
  « le fichier n'existe plus ». Le portail entier se rejoue, ce qui est de toute
  façon ce que mérite un retrait de mille cent lignes. On ne touche pas au banc
  pour éviter ce coût.

## UN CODE DE SORTIE LU À TRAVERS UNE ENVELOPPE OU UN TUBE N'EST PAS LE SIEN (v285)

Le banc n'a pas démarré pendant deux lancements de portail, et ce n'est pas le
banc qui m'a trompé : c'est ma façon de le lire. **Trois fois dans la même
session j'ai lu le mauvais nombre sur mon propre instrument.**

- `grep -m1 CACHE_VERSION sw.js` attrape le COMMENTAIRE
  (« Bump CACHE_VERSION on every release ») avant la constante : cinq essais à
  annoncer « pas encore déployé » sur une production qui l'était. Le motif doit
  porter ce qui distingue — `CACHE_VERSION = `.
- **Le code de sortie d'une commande de fond est celui de l'ENVELOPPE.**
  `npm test > log 2>&1; echo fini` rend 0 parce que l'`echo` a réussi : le
  portail, lui, sortait sur **216**. J'ai écrit deux fois qu'« un portail qui ne
  peut pas tourner s'annonçait comme un succès » — faux, il signalait bien son
  échec. Ce qui était muet, c'est le JOURNAL.
- **Et `$?` derrière un tube est celui du dernier maillon.**
  `npm test 2>&1 | head -6; echo $?` rend le code de `head`. Je l'ai refait dans
  la commande même qui mesurait les deux premiers.

C'est « compter un motif n'est pas compter la chose » (v224), appliqué à
l'outillage au lieu des témoins — et la règle de la v273 par l'autre bout :
**avant de conclure d'après un instrument, on vérifie ce que cet instrument
mesure vraiment.** Devant un résultat surprenant, on redemande le nombre par un
chemin qui ne passe ni par une enveloppe ni par un tube.

**ET LA VRAIE PANNE ÉTAIT UN LIEN COMMITÉ.** `tests/node_modules` est parti dans
le dépôt en v281 comme lien symbolique vers son PROPRE chemin absolu : tout arbre
de travail neuf recevait une boucle, et les six arbres d'appoint pointaient
dessus. Deux ignorances existaient pourtant — `**/node_modules/` et
`node_modules/` — mais **un motif qui finit par une barre ne matche qu'un
DOSSIER**, et un lien est un fichier : `git add -A` l'a avalé sans un mot. Les
deux formes y sont désormais. Et le crochet de session, qui installait quand le
dossier MANQUE, juge maintenant sur la dépendance que `banc.js` demande vraiment
(`playwright-core`), défait un lien inutilisable — jamais un vrai dossier — et
**dit** quand l'installation échoue au lieu de la cacher derrière un `tail -2`.

Mesuré pour le savoir, boucle recréée puis défaite dans un arbre libre : `node`
démarre très bien sous la boucle (`charge.js` se charge), c'est **`npm`** qui
meurt avant de lancer le script — `tout.js` n'est jamais atteint, sa première
ligne ne s'imprime pas.

## Deux bornes sur des conditions EMBOÎTÉES (v286)

Max : « après la mise à jour, sur la home le jeu lag 1 à 2 min, ça a été le cas
depuis longtemps ». Le symptôme que la v257 et la v258 devaient corriger, et qui
revenait après les deux. Quatre règles.

- **QUAND DEUX ATTENTES GARDENT DES CONDITIONS EMBOÎTÉES, LA PLUS LONGUE NE DOIT
  PAS GARDER LA PLUS FAIBLE.** `veillerPrep` dégrise « Jouer » sur corps ET
  chauffe ET carte, borné à 45 s ; le loader d'après-mise-à-jour s'efface sur
  corps ET chauffe, borné à 90 s. La seconde condition est un SOUS-ENSEMBLE de la
  première, et elle porte la borne la plus longue : dès que la chauffe traîne —
  l'iPad, où Safari compile un programme en centaines de millisecondes (v257) — le
  jeu autorise l'enfant à jouer à quarante-cinq secondes et le loader le lui cache
  jusqu'à quatre-vingt-dix. **La cause ne se mesurait pas, elle s'ADDITIONNAIT** :
  45 + 90 = 135 s, la fourchette exacte de Max. Devant une plainte de durée, on
  additionne les bornes du chemin AVANT de sortir une sonde.
- **IL N'Y A QU'UNE DÉCISION : PRÊT, OU J'AI RENONCÉ.** `prepPrete` est vraie dans
  les deux cas, et c'est ce que l'enfant vit — c'est le critère de la v220 (« le
  seul critère qui ne se trompe pas est celui de l'enfant »). Deux bornes
  indépendantes sur des conditions emboîtées finissent par se contredire, comme
  deux tables qui décrivent la même chose.
- **UN TÉMOIN QUI INTERDIT LE RENONCEMENT EST LE MÉCANISME DE LA PANNE.** Celui de
  la v257 exigeait que TOUT soit là à l'instant où le loader s'efface. Il a tenu
  des versions parce qu'au banc tout est prêt en trois secondes ; sur la tablette
  il interdisait la seule sortie qui rende la main à l'enfant. Quand une
  correction est en tension avec un témoin existant, on regarde si le témoin est
  trop absolu avant de tordre la correction.
- **ON PROVOQUE UNE INVERSION DE BORNES, ON NE L'ATTEND PAS** (poissons, v233). Au
  banc la séquence entière prend trois secondes : le témoin serait vert des deux
  côtés sans rien mesurer. Les dates se relèvent dans l'horloge de la PAGE
  (`__preparation().depuis` : corps 2,8-3,2 s, tout prêt 3,3 s), et `?prepms=`
  pose la borne de préparation entre les deux. A/B, correction désarmée : **zéro
  relevé fautif armée, onze sur 848 ms désarmée.** `?apresmaj=1` rejoue le chemin
  d'après-mise-à-jour sans en faire une — au banc, et sur la tablette.
- **ET MA SONDE REGARDAIT APRÈS LA FIN.** Elle démarrait après `banc.joueur`,
  c'est-à-dire après que tout soit prêt, et rendait « zéro fautif » sur le code
  fautif comme sur le code sain. C'est la troisième fois de la session : une sonde
  dit dans quelles conditions elle a mesuré, et une sonde qui doit voir une
  fenêtre vérifie d'abord qu'elle regarde pendant.
- **NON-RÉSULTAT MESURÉ, qu'on ne réessaiera pas** : le suspect évident était les
  treize mégaoctets immuables re-téléchargés à chaque livraison. `sw.js`
  `activate` supprime tous les caches SAUF `STATIC_CACHE`, et `isStaticAsset`
  couvre `/vendor/humains/`. Ils ne repartent pas sur le réseau.

## Un témoin ÉCRIT son terrain, et il se trompe de terrain (v285)

Trois témoins de cette livraison mesuraient à côté, et aucun ne se voyait en
relisant : les trois ont été démontés par une sonde qui imprime ce qu'elle
trouve. Le premier vaut bien au-delà de lui-même.

- **UN EMPLACEMENT SE MESURE, IL NE S'ÉCRIT PAS — et cette fois c'était le
  terrain d'un TÉMOIN.** « Une voiture roule dans la nature » se posait à
  (40, −400) avec « plaine au nord de Paris » en commentaire. Mesuré à la sonde,
  le relief y monte **39 · 39 · 39 · 42 · 42 · 45 · 45 · 47** : une falaise de
  trois blocs, qui est un mur PAR CONSTRUCTION depuis la v261 (« deux blocs,
  c'est un mur »). Le témoin n'avait donc jamais eu de marche devant lui — il
  rendait `d: 0,4` au premier relevé et cent cinquante-sept relevés identiques,
  au volant, pendant quarante secondes, et il ne mesurait RIEN de ce qu'il
  annonce. La règle de la v223 était écrite pour un aérodrome ; elle vaut mot
  pour mot pour un témoin. **Tout témoin qui éprouve une propriété du terrain
  CHERCHE le terrain qui la porte** — ici un couloir de soixante-dix blocs dont
  aucune marche ne dépasse un bloc et qui en porte au moins trois — et le profil
  retenu entre dans le message, sinon son rouge ne se démonte pas.
- **ET UNE CONSIGNE ÉCRITE APRÈS LA MESURE ÉCRASE LA MESURE.** Le même témoin
  posait `g.player.yaw = 0` APRÈS la monte, par habitude : la voiture repartait
  vers −z quel que soit le couloir trouvé, donc sur le terrain d'à côté. Un cap
  mesuré se garde jusqu'au bout.
- **UNE BARRE SE CALCULE, ET ELLE SE POSE À LA MOITIÉ (v269, v237).** Celle-ci
  valait soixante blocs avec « cinq fois la médiane de l'ancien code » en
  justification — un chiffre que rien n'avait mesuré. A/B sur la MÊME page, en
  ordre alterné (v268), `franchirEnRoulant` désarmé sur l'instance :

  | bras | blocs | hauteur gagnée |
  | --- | --- | --- |
  | franchissement armé | 59,0 · 116,4 | +10 · +9 |
  | franchissement désarmé | 0,4 · 17,9 | 0 · 0 |

  Les deux étendues ne se recouvrent pas. Trente blocs est la moitié du pire
  bras armé et 1,7 fois le pire bras désarmé ; soixante — le chiffre d'avant —
  tombait PILE sur le pire bras armé, donc rouge sur du code sain. La cible de
  sortie reste un cran au-delà (v277). **C'est la première mesure du
  franchissement : le témoin d'avant n'en disait rien, dans un sens comme dans
  l'autre.**
- **UNE CLÉ D'ESPÈCE N'EST PAS SON NOM FRANÇAIS.** En repointant « ce qu'on
  retire de la scène se rend à la carte graphique » des créatures (parties) vers
  les bêtes, j'ai demandé `invoquer('vache')` : la fonction cherche
  `SPECIES.find(s => s.key === key)` et rend `null` pour toute clé inconnue. Le
  témoin rendait « 471, 471, 471 » — sur l'ancien code comme sur le neuf. C'est
  « une sonde qui interroge la mauvaise liste ne peut rien voir » (v273), du côté
  du témoin, et un refus se DIT désormais au lieu de rendre zéro.
- **ET QU'UN TÉMOIN REPOINTÉ PUISSE ENCORE ROUGIR SE VÉRIFIE (v276).** `liberer`
  désarmé dans `src/liberer.js` : 130 géométries prises, **0 rendues, 130
  perdues** — rouge ; armé, 130 / 130 / 0. Un repointage est une réécriture de
  témoin, et il se prouve comme un témoin neuf.
- **UNE ATTENTE QUI EXPIRE SOUS LA CHARGE SE RALLONGE — MAIS LA QUESTION SE POSE
  D'ABORD.** Les deux copies d'avant une refonte de carte (`sauvegarde.js`)
  attendaient trente secondes ; le portail a rendu `[]`, la suite rejouée seule
  est verte des deux côtés. Allonger ne peut rien blanchir ICI parce que la
  grandeur n'est pas un taux qui s'accumule (v279) : c'est un document qui existe
  ou pas, et un code sans `mettreALAbriAvantCarte3` ne l'écrira jamais. La durée
  entre dans le message, parce que la doubler est un raisonnement et non une
  mesure — et c'est elle qui dira si soixante secondes suffisent. Le second
  verdict dit qu'il DÉPEND du premier : deux rouges pour une cause laissaient
  croire à deux causes.

## Le palier de l'appareil (v284) — on mesure un TRAVAIL, pas un taux

Max, capture du chasseur : « est-ce possible de pousser le niveau de réalisme ?
Le unveil est late », puis, depuis un iPhone 18 Pro : « tu serais capable
d'ajuster en fonction de l'appareil et sa capacité ? ». Cinq règles, et trois
sont nées d'une mesure ou d'un raisonnement qui m'a contredit.

- **UNE CADENCE PLAFONNÉE PAR L'ÉCRAN NE DIT RIEN DE LA RÉSERVE.** Son
  `?diag=1` rend cinquante-neuf images par seconde : c'est le plafond de
  l'écran, et un appareil qui pourrait en faire deux cents rend le même
  chiffre. Ce qui dit la panne, c'est **douze appels de dessin** pour trente
  mille triangles — un monde presque vide devant lui, non parce que l'appareil
  ne suit pas mais parce que le jeu ne lui en demande pas. On mesure donc le
  TEMPS D'UN TRAVAIL CONNU — un morceau maillé dans le worker, une image sur le
  fil principal — jamais un taux. C'est « on mesure la CAUSE et non l'effet »
  (v236), appliqué au classement d'un appareil.
- **ON NE CLASSE PAS UN APPAREIL SUR UNE CONFIGURATION QU'ON LUI A IMPOSÉE — et
  c'est ce qui met le banc entier hors de portée sans une ligne écrite pour
  lui.** Une page ouverte à `rr=2` ne dit rien de ce que l'appareil fait à sa
  vraie distance d'affichage. Comme `banc.js` met TOUJOURS `rr=` et `dpr=` dans
  son adresse, aucune suite ne range de palier ; sans cette règle, une suite qui
  joue longtemps en rangerait un et la page SUIVANTE en hériterait — un témoin
  mesurerait ce que son voisin a laissé (la famille de la v279). `?palierms=`
  est la déclaration explicite qui permet quand même à un témoin de suivre la
  chaîne, et les planchers d'échantillons suivent cette fenêtre sous un seul
  bouton : écrits en dur, ils tiendraient la porte fermée et le témoin ne
  verrait qu'un des deux verrous.
- **UNE MESURE NE VAUT QUE DANS LES CONDITIONS OÙ ELLE A ÉTÉ FAITE, ET CELA M'A
  FAIT RETIRER DEUX CHAMPS DE MON PREMIER JET.** Il faisait passer la résolution
  du téléphone de 1,25 à 2,0 pixel par point — 2,56 fois la surface — sur la foi
  d'une mesure d'image prise à 1,25 : c'est se servir d'une mesure contre
  elle-même. Le prix d'une passe d'ombres n'avait pas été mesuré sur cet appareil
  non plus. Ce que ses douze appels établissent, c'est que le MONDE est
  sous-alimenté ; il ne reste donc que `rr` et la profondeur de file, deux
  leviers dont le dépôt a mesuré l'effet (v265, v269). Les pixels et les ombres
  sont une MESURE à faire (`?dpr=2&ombres=1&diag=1`), déclarée dans `TASKS.md`,
  pas une intuition — et un champ qu'on n'aurait pas branché serait du code mort
  qui ressemble à de l'avancement (v157).
- **UN PALIER SE RANGE POUR LA PARTIE SUIVANTE, IL NE S'APPLIQUE PAS À CHAUD.**
  `RENDER_RADIUS` et la profondeur de file sont lues au démarrage ; les faire
  bouger en cours de route ferait respirer la distance d'affichage sous les yeux
  de l'enfant. Et **tant qu'il n'y a pas de mesure, rien ne change** : le palier
  `moyen` porte EXACTEMENT les valeurs de la v283, si bien qu'un appareil mal
  classé ou non mesuré ne perd rien (règle du remède qui ne va pas plus loin que
  la panne, v245). La mesure ne se prend qu'EN JEU — pendant la préparation la
  page compile ses vingt-cinq programmes, et tout appareil serait classé lent.
- **ET LA VITESSE DES JETS EST DANS LE PALIER, PARCE QUE LA v269 L'A LIÉE À LA
  FILE.** Elle avait été descendue de 160 à 120 blocs par seconde exactement
  pour cette raison — « une vitesse mesurée sur une file ne vaut que pour cette
  file ». Le palier haut rend la file de seize, donc la vitesse. La barre du
  témoin du trou, elle, vaut `max / 2` depuis la v269 : elle suit toute seule,
  sans qu'on touche à un chiffre de témoin. C'est le bénéfice direct d'une barre
  qui se calcule au lieu de s'écrire.

## Le palier lisait l'écran, pas l'appareil (v290) — et la règle était écrite au-dessus

Max, deux captures d'iPad avec `?diag=1` : « → **bas** (morceau 37,0 ms ou image
17,0 ms au-delà de 63 / 16,7) au prochain lancement ». Le palier qu'il avait
réclamé s'apprêtait à DÉGRADER son appareil. Quatre règles.

- **UNE PÉRIODE N'EST PAS UN TRAVAIL, ET C'EST LA RÈGLE DE LA v284 ENFREINTE À
  LA LIGNE SUIVANTE.** `palier.js` ouvre sur « une cadence plafonnée par l'écran
  ne dit rien de la réserve — on mesure le TEMPS D'UN TRAVAIL CONNU » ; la mesure
  qui l'alimentait, dans `main.js`, notait `now - lastTime`. Sur un appareil
  synchronisé à son écran, cet écart EST la période de rafraîchissement : 59 i/s
  → 17,0 ms, soit 1000/59. Les deux barres devenaient fausses PAR CONSTRUCTION
  — `> 16,7` vrai sur tout appareil sain à 60 Hz, `≤ 8` inatteignable sous vsync,
  donc `haut` hors de portée de quiconque. **Écrire la règle dans le fichier ne
  garantit pas que la mesure du fichier d'à côté la respecte** : quand une règle
  nomme une grandeur, on va lire la LIGNE qui la produit.
- **ET AUCUN CHIFFRE N'A CHANGÉ EN LA CORRIGEANT — c'est le signe.** Les barres
  décrivaient déjà un travail (« on demande la MOITIÉ des 16,7 ms ») ; il
  manquait de le leur donner. Quand un remède ne déplace pas une borne, la borne
  était juste et c'est la GRANDEUR qui mentait — l'inverse du réflexe de réglage.
- **UN TÉMOIN QUI FABRIQUE SES DEUX NOMBRES NE PEUT PAS VOIR QUE L'UN D'EUX EST
  IMPOSSIBLE À OBTENIR.** Celui de la v284 appelait `choisirPalier({ msMorceau: 6,
  msImage: 5 })` et exigeait `haut` : il était VERT pendant que `haut` était hors
  d'atteinte dans le jeu. Il vérifiait qu'une règle sait trier des chiffres,
  jamais qu'un appareil puisse les produire. Un témoin de règle pure se double
  d'un témoin qui lui donne ce que le JEU a mesuré. C'est « une sonde qui
  interroge la mauvaise liste ne peut rien voir » (v273), du côté des ENTRÉES.
- **ET UN VERDICT RANGÉ SURVIT À LA CORRECTION DE LA RÈGLE QUI L'A PRODUIT.** La
  capture dit « au prochain lancement », donc `localStorage` était DÉJÀ écrit :
  livrer la règle neuve sous la même clé aurait laissé l'iPad en `bas` pour
  toujours, puisqu'une mesure ne se reprend pas. Une règle de classement qui
  change change sa CLÉ (`web-minecraft-palier-v2`) — c'est `CACHE_VERSION` à
  l'échelle d'un réglage, et le témoin qui le garde rejoue la situation exacte de
  l'appareil : on écrit l'ancien verdict, on recharge, on lit la FILE obtenue.
- **CE QUE LE BANC PEUT PROUVER ICI, ET POURQUOI.** Il n'est pas synchronisé à un
  écran, mais il sépare quand même les deux grandeurs — 166,6 ms de période
  contre 22,8 de travail à rr 12, 66,6 contre 9,7 à rr 2 — parce qu'en rendu
  logiciel l'image attend le pilote. Le témoin exige donc un facteur TROIS entre
  les deux, moitié du plus petit rapport mesuré (v237) : sans cette garde il
  serait vide le jour où les deux se confondraient.

## L'étendue des graphismes est un choix de Max (v290)

« Permets-moi de choisir l'étendue des graphismes as a user si tu sais pas la
calibrer toi. » Décision de Max, prise le jour où le classement automatique s'est
révélé faux sur son propre appareil. **La mesure ne décide plus, elle propose** —
`auto` reste le défaut, donc rien ne change pour qui n'y touche pas. Cinq règles,
et la première vaut pour tout réglage automatique à venir.

- **UN CLASSEMENT AUTOMATIQUE SE DOUBLE D'UN RECOURS QUE L'UTILISATEUR
  ATTEINT.** Ce n'est pas un aveu d'échec, c'est de l'architecture : le palier
  arbitre entre voir loin et aller vite, et rien dans une milliseconde ne dit
  lequel Marlon préfère aujourd'hui. Une mesure répond très bien à « que peut
  faire cet appareil » et pas du tout à « qu'est-ce que je veux voir ». Elle
  arrive en plus une partie trop tard, puisqu'un palier se range pour le
  lancement suivant (v284). Et surtout elle peut se tromper : c'est la même
  logique que le bouton de mise à jour forcée du badge de version (v220), qui
  existe parce qu'un mécanisme automatique peut rester coincé. **Tout réglage
  que le jeu décide seul doit avoir sa porte de sortie**, sans quoi un défaut de
  la règle est sans recours pour la famille.
- **UNE SEULE RÈGLE, TROIS LECTEURS.** `palierRetenu({ choix, mesure })`
  (`palier.js`, pure) décide : le choix passe devant la mesure, `auto` retombe
  sur la mesure, et sans l'un ni l'autre elle rend `null` — c'est-à-dire la v283
  au bit près. Le DÉMARRAGE la lit pour régler `rr`, la file, la portée HD et la
  vitesse des jets ; l'ESPACE DES RÉGLAGES la lit pour dire ce qui est actif et
  pourquoi ; un TÉMOIN la lit sous node. Deux tables qui décrivent le même
  réglage finissent par diverger (discipline de `postesAvion`).
- **UNE ÉTENDUE CHOISIE À LA MAIN EST UNE CONFIGURATION FORCÉE — et la règle de
  la v284 n'avait jamais servi qu'au banc.** « On ne classe pas un appareil sur
  une configuration qu'on lui a imposée » était écrite pour les `?rr=` et `?dpr=`
  de `banc.js` ; une étendue choisie est exactement le même cas. Une page qui
  tourne à `rr 16` parce que Max a demandé « Loin » ne dit rien de ce que
  l'appareil ferait à sa distance naturelle, et ranger ce verdict lui laisserait
  un faux classement le jour où il repasse en « Auto ». `etendueRange(choix)` le
  dit, à côté de la règle qu'elle garde. Sixième fois que ce dépôt paie la PORTÉE
  d'un remède et non la règle.
- **MAIS ON MESURE QUAND MÊME, ET ON LE DIT.** `rangerLePalier` calcule désormais
  son verdict et ne le RANGE que si le classement est légitime. Taire la mesure
  parce qu'on ne la garde pas reviendrait à ne rien pouvoir dire de l'appareil
  dès qu'on lui a demandé quelque chose — c'est-à-dire exactement le trou qui a
  laissé la v284 se tromper. `?diag=1` affiche donc le verdict suivi de
  « mesuré, non rangé (étendue choisie) » : un nombre qu'on n'utilise pas reste
  celui qui démonte un résultat surprenant.
- **UN BOUTON QUI NE FAIT RIEN TOUT DE SUITE DOIT DIRE QUOI FAIRE.** C'est « un
  bouton qui ne fait rien est pire qu'un bouton qui refuse » (v228) vu du côté
  d'un réglage DIFFÉRÉ : ce que l'étendue change est lu au démarrage, donc
  l'enfant qui touche « Loin » ne voit rien bouger et conclut que le jeu est
  cassé. L'aide de la rangée annonce l'effet en attente — et seulement s'il y en
  a un, rechoisir ce qui tourne déjà ne doit pas faire croire à une attente — et
  le bandeau dit le geste, revenir au menu 🏠 et rejouer, comme tout message de
  la maison.
- **ET LE CHOIX VIT SUR L'APPAREIL, PAS DANS LE PROFIL**
  (`web-minecraft-etendue-v1`). Même raison que la qualité des graphismes
  (v257) : c'est une capacité de la machine, pas un goût qui suit l'enfant.
  L'iPad de la maison et l'iPhone de Max n'ont pas la même réserve, et un enfant
  qui change de tablette ne doit pas emporter le réglage de l'autre.

**ET DEUX TÉMOINS DE `monte.js` MESURAIENT LE BANC — la CINQUIÈME fois pour
cette famille (v284).** Le portail a rendu deux rouges neufs sur un diff qui ne
touche ni le chemin des ombres ni le worker. Quatre leçons, et la première est
contre moi.

- **LA DURÉE DE LA SUITE A TUÉ MON EXPLICATION EN UNE LIGNE.** J'ai avancé « le
  banc tournait plus lentement » avant de mesurer : `monte.js` fait 22 min 59 s
  au portail de la v283, où le témoin des ombres est VERT, contre 23 min 02 s
  ici, où il est ROUGE. Trois secondes. Une explication qu'on n'a pas mesurée
  est une dette, pas un diagnostic (v220) — et le chiffre qui la démonte était
  déjà imprimé par le portail.
- **UN TÉMOIN QUI LIT UN PIXEL LIT D'ABORD QU'IL Y A QUELQUE CHOSE À LIRE.**
  Celui des ombres dormait 2 500 ms et lisait, **sans aucune borne de garde** :
  il ne distinguait pas « la dalle n'a pas d'ombre » de « la dalle n'est pas
  encore dessinée ». C'est « `null` n'est pas un verdict, c'est une absence de
  mesure » (v272) transposé au PIXEL. Et ce qui l'a prouvé n'est pas la
  cohérence — 168,4 tombe entre le zénith (155,8) et l'horizon (180,8) mesurés
  par ses voisins verts au même passage — c'est un relevé à part : **une dalle
  privée de son ombre lit 101,3, pas 168,4.** Une arithmétique qui concorde
  oriente ; seule une mesure tranche.
- **ON ATTEND LA SITUATION, JAMAIS LE VERDICT.** L'attente porte sur un FAIT DU
  MONDE — neuf morceaux maillés autour de la dalle, trois lectures qui ont cessé
  de changer. Attendre que le rapport passe sous la barre serait relancer jusqu'au
  vert, et cela blanchirait pour toujours le code que le témoin doit accuser. La
  différence se VÉRIFIE : ombres désarmées, l'attente rend la main en 3 193 ms et
  le rapport vaut 0,98.
- **ET UNE FENÊTRE ALLONGÉE NE BLANCHIT PAS UN TAUX — mais cela se mesure.** La
  v279 avertit qu'une borne sur un résultat donne à l'ancien code tout le temps
  dont il a besoin. `msParSeconde` étant un TAUX, la fenêtre du vol passe de huit
  secondes de montre à deux cent cinquante blocs parcourus ; sur `?maillage=local`
  elle rend 216 ms par seconde pour une barre de 120. Le principe ne suffisait
  pas, la mesure oui.
- **ET MA SONDE DU VOL A ÉTÉ AVEUGLE AU PREMIER JET, la troisième de la
  journée.** Elle passait `{ maillage: 'local' }`, une clé que `banc.joueur`
  ignore — le chemin est `params` — rendait `worker true` et annonçait que le
  témoin ne prouvait plus rien. Avant de croire une sonde qui force un réglage,
  on vérifie que le réglage est ARRIVÉ.

**ET UN TÉMOIN SE PLACE LUI-MÊME — « SE PLACER » COMMENCE PAR FAIRE LE VIDE
(v284).** Cinq témoins d'avion de `monte.js` ont rendu `pas aux commandes {}`,
sur la branche ET sur `origin/main` rejoué seul — donc sur le code EN
PRODUCTION — et seulement depuis que le conteneur a été recyclé : quatre
passages verts avant, deux rouges après. La double mesure de la v195 disait donc
« ce n'est pas la livraison ». **Elle ne disait pas si Marlon est touché, et
c'est la seule question qui compte** : une dette qu'on déclare sans avoir
demandé ce que l'enfant perd n'est pas une dette, c'est un renoncement.

- **UNE SONDE, UNE QUESTION, ET LA PREMIÈRE EST CELLE DE L'ENFANT.** Sur une
  page NEUVE, sans rien avant, prend-on un avion ? OUI — bouton « Monter », UN
  clic, aux commandes. Le jeu va bien. Après être monté dans une voiture, ce que
  le témoin d'avant laisse : ZÉRO clic, pas aux commandes. Deux bras, une
  exécution, et la cause est nommée.
- **LA GARDE LISAIT LE BON MÉCANISME ET LE MAUVAIS ÉTAT.** La boucle
  d'embarquement est gardée par `auVolant()`, c'est-à-dire `montureConduite()` :
  vrai pour une VOITURE autant que pour un avion. L'enfant laissé au volant la
  rend vraie AVANT le premier tour ; la boucle ne clique pas une seule fois et
  `pilote` reste nul. C'est « un bouton-bascule ne se reclique pas » (v252) par
  l'autre bout — le témoin lit bien l'état DANS LE JEU, ce que la v252 exige,
  mais pas l'état qu'il veut. Une garde se formule sur ce que le verdict
  demande : `!g.player.pilote`, jamais « quelque chose est monté ».
- **ET DESCENDRE NE SUFFIT PAS — c'est une sonde qui l'a dit, pas le
  raisonnement.** Mon premier remède ajoutait une descente et corrigeait la
  condition : mesuré, HUIT clics, `auVolant` qui bascule vrai/faux, bouton resté
  « Monter », toujours pas aux commandes. **Une monture SUIT le joueur** : elle
  est encore là après la descente, et le clic suivant la remonte. On descend, on
  RETIRE les bêtes (l'idiome du dépôt depuis la v257), PUIS on invoque. Les
  quatre bras, dans le même passage : page neuve 1 clic ✓ · sans remède 0 clic ✗
  · descente seule 8 clics ✗ · remède complet 1 clic ✓.
- **ET LES DIX SITES SONT CORRIGÉS, PAS LES QUATRE QUI ROUGISSAIENT.** Six
  autres boucles montent une voiture ou une bête avec la même garde : elles
  portent le même piège, latent, et il ne se voit que le jour où le témoin
  d'avant laisse quelque chose. Quand une panne touche une grammaire partagée,
  on cherche TOUTES ses occurrences le jour même — sixième fois.

## Le banc se mesure, et ses réglages se rejouent (v277)

Max : « revamp the testing process way too heavy and long and costly and
painful ». Six règles, et quatre sont nées d'une mesure qui m'a contredit.

- **LA MONNAIE DU BANC EST LE TEMPS DE JEU, ET ELLE VAUT 1 À VINGT IMAGES PAR
  SECONDE.** `tenirSecondes` (monte.js) et tout minuteur en `dt` accumulent
  `min(dt, 0,05)` : le rapport montre/jeu vaut donc exactement 1 dès vingt
  images par seconde, et se dégrade au-dessous. La cible n'est pas « plus
  vite », c'est de franchir vingt — et cela se calcule avant toute sonde.
  Mesuré, cinq secondes de JEU en secondes de montre, à `rr=2` :

  | dpr | pixels | point d'apparition | Paris |
  | --- | --- | --- | --- |
  | 1 | 319 200 | 6,5 · 5,8 s (×1,3) | 39,9 · 39,7 s (**×8,0**) |
  | 0,5 | 79 800 | 5,1 · 5,3 s (×1,02) | 35,7 · 36,1 s (×7,2) |
  | 0,35 | 39 102 | 5,1 · 5,1 s (×1,02) | 36,2 · 37,9 s (×7,2) |

  Le plancher est atteint dès 0,5 : 0,35 ne rend plus rien. **Et Paris coûte ×8
  quoi qu'on fasse** — 2,6 images par seconde, ce sont les appels de dessin. Un
  témoin libellé en temps de jeu et posé dans une ville paie ce facteur-là ;
  aucun réglage de pixels ne le rattrape.
- **ET MA PREMIÈRE SONDE MESURAIT UNE CONFIGURATION QUE PERSONNE N'UTILISE.**
  Lancée à `rr=12`, que DEUX des sept pages de `monte.js` demandent, elle
  annonçait ×2,75 et ×12 là où le chemin chaud donne ×1,3 et ×8, et quarante
  pour cent de gain là où il y en a vingt. **Une sonde dit dans quelles
  conditions elle a mesuré, ou elle ne dit rien** (v273, deuxième fois).
- **ON S'ARRÊTE QUAND LE RÉSULTAT EST ACQUIS, PAS QUAND LA FENÊTRE EST FINIE.**
  Chronométré témoin par témoin, `monte.js` fait dix-neuf minutes et demie et
  ses VINGT-CINQ premiers témoins en portent 85 % ; les cent quinze autres
  coûtent moins de deux secondes chacun. **Ce qui rend l'arrêt anticipé sûr est
  une asymétrie** : on ne sort que si TOUS les verdicts qui lisent ces relevés
  sont satisfaits. Un vert le devient plus vite, un rouge court jusqu'à sa borne
  et garde toutes ses preuves. Un verdict ajouté demain doit entrer dans la
  condition de sortie — c'est le seul moyen de casser le témoin, et cela s'écrit
  à côté. Et une cible de sortie se pose UN CRAN AU-DELÀ de la barre du verdict :
  sortir sur la barre rendrait un vert sans marge.
- **SUPPRIMER UN SOMMEIL RÉVÈLE TOUT CE QUI VIVAIT DESSUS.** Le témoin de la rue
  de Paris dormait sept secondes par arrêt ; rendu au résultat (neuf secondes au
  lieu de cinquante-six), son VOISIN est devenu rouge — « les personnages
  lointains ne sont plus dessinés », quatre sur cent trente-trois. Il lisait
  `mesh.visible` dans la foulée et vivait du sommeil d'à côté sans le dire.
  **Une dépendance implicite entre deux témoins voisins est invisible tant que
  le premier dort.** Ce qu'un témoin exige de l'état du monde, il l'attend
  lui-même, borné, et le temps pris entre dans le message.
- **UN RÉGLAGE DE BANC SE REJOUE, SINON IL NE SE DÉMONTE PAS.** `BANC_DPR` et
  `BANC_VERRE` s'ajoutent à `?attente=`, `?fondms=` et `?chauffems=`, appliqués
  au banc lui-même. Sans la bascule `BANC_DPR=1` j'aurais imputé à la cadence un
  rouge qui était le mien : l'explication commode est une dette, pas un
  diagnostic (v220).
- **ET LA SEULE CHOSE QUI REPRODUISE UN ROUGE DE SUITE, C'EST LA SUITE.** Devant
  la préparation rouge, j'ai écrit la sonde à part que la v276 avait annoncée —
  une voisine sur l'accueil, une page qui prépare, quatre bras alternés. Elle
  rend QUATRE secondes et 25/25 programmes dans les deux bras, là où la suite en
  rend quarante-six et 11/25 : elle ne reproduit pas les conditions, donc elle
  ne mesure rien, **et surtout elle ne BLANCHIT rien** (troisième occurrence du
  piège de la sonde aveugle). D'où l'interrupteur : l'A/B se fait DANS la suite.

**ET LA RÉSOLUTION BASSE RESTE ÉTEINTE — MAIS PAS POUR LA RAISON QUE J'AI
D'ABORD ÉCRITE, ET LA CORRECTION EST LA LEÇON.** « Les voitures ne se traversent
plus » (v244) compte les chevauchements sur trente secondes de MONTRE, un relevé
toutes les 200 ms, au centre de Paris. Sept mesures, deux arbres, deux
résolutions :

| bras | dpr | chevauchements |
| --- | --- | --- |
| portail v276 | 1 | 3 / 499 |
| branche, rejeu | 1 | **0 / 345** |
| portail v277 | 1 | sous la barre |
| branche, monte seule | 1 | **53 / 474** |
| branche | 0,5 | 48 / 665 |
| `origin/main` (v276) | 0,5 | 41 / 695 |

**L'ÉTENDUE À dpr 1 SEUL — DE 0 À 53 — RECOUVRE ENTIÈREMENT LES VALEURS À
dpr 0,5.** La cadence n'est donc PAS établie comme la variable, et j'avais
conclu le contraire sur UN passage par bras : c'est mot pour mot la règle de la
v269 que j'invoquais sans la suivre. Une intermittence ne se juge pas sur un
passage de chaque côté ; on rejoue jusqu'à voir la même DISTRIBUTION, et ici la
distribution d'un seul côté suffit à tout expliquer.

Ce qui reste vrai, et qui est le fait utile : **ce témoin varie de 0 à 53 sans
qu'une ligne du jeu ait bougé, et sa barre (45) tombe DANS son étendue
naturelle.** Ce n'est donc pas un gardien : c'est un tirage. Un compte absolu,
sur une fenêtre de trente secondes de montre, dans une ville qui rend deux à
quatre images par seconde, ne peut pas être stable. **Ce que le jeu fait
vraiment — les voitures se chevauchent-elles ? — reste INDÉTERMINÉ par ce
témoin**, et c'est pour cela qu'on le refait avant de conclure quoi que ce soit
sur `cederLePassage`. La piste de cause (une cadence de ménage à intervalle réel
fixe, v226, donc sous-échantillonnée quand le monde va vite) reste plausible et
NON mesurée. Les étapes sont dans `TASKS.md`.

Et la résolution basse reste éteinte pour une raison qui tient toujours : tant
que ce témoin tire à pile ou face, on ne peut pas dire ce que la baisser casse
ou ne casse pas. On n'allume pas un réglage dont on ne peut pas lire l'effet.

**ET UNE PARURE DE FOND SE SUSPEND QUAND LE RENDU EST LOGICIEL — la règle des
ombres, une pièce plus loin.** La préparation de l'accueil dépassait sa propre
borne (« Jouer » libéré à quarante-cinq secondes avec six à dix-huit programmes
sur vingt-cinq, aucun fond de carte) : c'est le REMPLISSAGE des deux calques
plein écran, que le processeur paie à la place de la carte graphique, et il le
prend aux images dont la chauffe et le fond de carte ont besoin. `main.js` pose
`rendu-logiciel` sur `<html>`, le CSS suspend les deux calques tant que
`body.prepare` est là. Sur l'iPad rien ne change (v237 : ce coût-là ne se
transpose pas). Deux choses de plus :

- **MON PREMIER REMÈDE ÉTAIT UN NON-RÉSULTAT, et il est retiré.** Je donnais aux
  deux calques leur propre couche de composition (`translateZ(0)`), en croyant
  que `#prep-line` — réécrite toutes les 250 ms — les invalidait. Mesuré sur
  quatre passages : 12, 11, 6 puis 25 sur 25, c'est-à-dire PIRE au pire passage.
  Forcer une couche, c'est deux surfaces à COMPOSER à chaque image au lieu d'une
  à repeindre parfois. **Ce n'était pas la repeinture, c'était la surface.**
- **ET J'AVAIS ÉCRIT L'INVERSE EN v276** : « les deux calques plein écran ne
  coûtent RIEN (vérifié trois fois) ». C'était vrai, et mesuré sur une page SANS
  préparation, où rien ne les invalide. J'avais déclaré la réserve à l'époque ;
  elle s'est vérifiée contre moi. **Un « innocent » ne vaut que dans les
  conditions où il a été mesuré, et c'est pour cela qu'on les écrit.**

## Ce qu'une sonde de contenu doit faire comme le jeu (v282)

Quatre défauts de ma propre passe de tissu, et **trois mesures fausses de ma part
avant la bonne**. Les trois se reprennent.

- **UNE SONDE QUI APPELLE UN BÂTISSEUR DOIT L'APPELER COMME LE JEU L'APPELLE.**
  `world.js` n'appelle `batirColonneVillesMonde` que si `solVillesMonde` rend la
  chaîne `'lot'` ; ma sonde l'appelait pour TOUTE la fenêtre, trottoirs et
  chaussée comprises, et comptait donc des façades que le jeu n'écrit nulle part
  — 1 460 vitrines pour mille colonnes de trottoir là où il y en a 142. C'est
  « une sonde qui interroge la mauvaise liste ne peut rien voir » (v273), par
  l'autre bout : **elle voit ce qui n'existe pas.** Avant de croire une sonde qui
  appelle une fonction pure du monde, on relit la ligne de `world.js` qui
  l'appelle, et on recopie sa GARDE autant que son appel.
- **ET ELLE M'A FAIT ÉCRIRE UN REMÈDE QUI EST UN NON-RÉSULTAT.** Sur la foi de
  cette sonde j'ai « rendu » son demi-espace à `bord`, en croyant que le
  resserrement de la v282 avait pris 85 % des devantures du jeu. Mesuré sur les
  seules colonnes de lot, les deux versions rendent le MÊME chiffre au dixième,
  et c'est arithmétique : `dRue >= t.s` est vrai PAR CONSTRUCTION sur un lot,
  donc la bande et le demi-espace sont le même ensemble. Écrit, mesuré, retiré —
  et le non-résultat est écrit dans `villesmonde.js` pour que personne ne le
  réécrive.
- **UNE TOLÉRANCE EN BLOCS CONTRE UNE GRANDEUR QUI GRANDIT NE TIENT PAS — ET
  CETTE FOIS C'ÉTAIT DANS LE CODE DU JEU, PAS DANS UN TÉMOIN.** La porte d'une
  boutique se posait à moins de `0,28` bloc du milieu du front du lot, chiffre
  relevé quand le pas de trame valait quinze ; les typologies le portent à 21, 23
  et 27, le front de Rome passe de [2 ; 7,5] à [4,8 ; 11,5], et la même fenêtre
  n'attrape plus rien : **zéro porte à Rome, à Tokyo et à Bologne.** Ce qui ne
  dépend pas du pas, c'est l'ÉCARTEMENT DES COLONNES — elles sont à un bloc l'une
  de l'autre, donc « la colonne la plus proche du milieu du front » est celle qui
  en est à moins d'une DEMI-colonne. La règle des barres de témoin (v269 : « une
  barre qui suit une grandeur se calcule, elle ne s'écrit pas ») vaut mot pour mot
  pour les constantes du jeu.
- **ET LE RANG NE SE REDIT PAS DANS LA RÈGLE QUI LE LIT.** `dRue < t.s + 1.0`
  décrivait le premier rang de façade une seconde fois, à côté de `bord` qui le
  décrit déjà. Les deux ont divergé le jour où le portique a fait reculer la
  façade d'un cran : à Bologne et à Turin elles devenaient DISJOINTES et pas une
  porte n'était possible. La pose étant déjà gardée par `commerce && bord`, la
  règle ne garde que « au milieu du front ». Deux tables qui décrivent la même
  chose finissent par diverger — la discipline de `postesAvion`, appliquée à un
  rang de façade.
- **UN ÉVÉNEMENT PAR FAÇADE NE SE COMPTE PAS DANS UNE FENÊTRE DE ±40 BLOCS.** Une
  porte est UNE colonne par front de lot : à Tokyo il n'y en a aucune dans cette
  fenêtre alors que la ville en porte 23,8 pour mille colonnes de trottoir. C'est
  « une fraction se pose sur la VILLE, pas sur la fenêtre » (v274), troisième fois
  pour ce témoin-ci après les comptes absolus de la v172 et de la v271 ; et comme
  engendrer un disque entier sur le fil principal coûte des secondes, les quatre
  postes se comptent par les FONCTIONS PURES (v202), sept dixièmes de seconde pour
  les trois villes. **La fenêtre lue dans le monde chargé reste dans le
  MESSAGE** : un écart entre ce que le bâtisseur écrit et ce que le monde contient
  s'y voit alors tout seul (mesuré : 17 % au centre de Rome, ce que les monuments
  réécrivent).
- **ET LA BARRE DES ANNEAUX NE COMPTE PLUS DES ANNEAUX.** `anneaux > 600` était un
  compte absolu relevé quand le pas valait dix-neuf partout : les typologies
  changent le pas, donc le nombre de rues, donc le nombre d'anneaux — 628 → 602 —
  pendant que la LONGUEUR DE RUE QUI PORTE UN CONVOI passe de 159 133 à 158 974
  blocs, un dixième de pour cent. C'est cette longueur-là que l'enfant voit, et
  comme la borne est une borne de GARDE elle se pose à la MOITIÉ (v237).
- **UN DAMIER EST CARRÉ, ET UN CHIFFRE DE PLAN SE CROISE AVEC CE QU'IL COÛTE.**
  `27×21` n'était pas un damier, et croisé avec les anneaux ce pas de 27 coûtait à
  29 des 37 villes en damier un circuit — deux grands rectangles ne tiennent plus
  sous les vingt blocs de partage de la v211. Le prix qui RESTE se déclare :
  `superilot` garde son pas de 27, parce qu'un superîlot EST plus grand, et
  quarante-six de ses soixante-cinq villes gardent un seul circuit au lieu de deux.
- **ET J'AI MODIFIÉ `src/` PENDANT QU'UNE SUITE TOURNAIT.** La règle de survie du
  banc est écrite depuis toujours ; je l'ai enfreinte en corrigeant le jeu pendant
  que le portail jouait `washington.js`, ce qui a rendu la fin de ce portail sans
  valeur — il a fallu le tuer et le reprendre. Une sonde se lance pendant un
  portail ; une CORRECTION attend qu'il rende la machine.

- **ET UNE SONDE QUI PLACE UNE CAMÉRA SE TROMPE DE PLACE AUTANT QU'UNE AUTRE.**
  La planche de captures de cette livraison a été refaite CINQ fois, et chaque
  fois pour la même raison : je cherchais une chose là où elle n'est pas.
  `banc.js` chargé depuis le dépôt principal aurait photographié la carte de
  `main` — il sert `RACINE`, le dossier au-dessus de lui. Le centre exact d'une
  ville n'est pas une rue. « Tout ce qui n'est ni un lot ni un trottoir » n'est
  pas la chaussée : `CHAUSSEE` est EXPORTÉE de `world.js` depuis la v248,
  précisément pour ne pas être devinée. Le sol d'un portique n'est pas
  `sommetColonne`, qui rend le premier bloc SOLIDE en descendant, donc
  l'immeuble AU-DESSUS du passage — la caméra s'est retrouvée sur le toit, et
  c'est le piège de la v267 une famille plus loin. Et une file de colonnes se
  compte dans l'axe de la TRAME, pas dans celui du monde. **Quand une sonde doit
  trouver un endroit, on lui donne la règle du TÉMOIN qui le définit déjà, et
  l'on vérifie qu'elle a trouvé autre chose que le point de départ.**

## La matière claire (v276)

Max, devant la proposition de design : « beaucoup plus moderne, beaucoup plus
light, avec beaucoup plus de glass design ». Première des quatre livraisons de
la refonte. Dix règles, et quatre d'entre elles sont nées d'une mesure qui m'a
contredit.

- **UN `backdrop-filter` EST UN CALQUE, ET L'ACCUEIL N'A PAS D'IMAGES À LUI
  DONNER.** Le premier jet a fait tomber le portail sur TROIS bornes de durée —
  `maj.js` libérait « Jouer » à la borne des quarante-cinq secondes avec huit
  programmes de shaders sur vingt-cinq, `sauvegarde.js` n'attendait pas sa copie
  de nuage, `carte.js` refusait un appui long — et toutes les suites de
  navigateur avaient ralenti : **carte.js 4 min 39 s → 11 min 33 s**,
  sauvegarde.js 39 s → 1 min 11, hote.js 1 min 41 → 2 min 37. Mesuré sur
  l'accueil, deux séries en ordre alterné : **5,7 · 8,3 · 8,3 images par seconde
  avec le flou contre 15,3 · 15,7 · 15,2 sans.** La moitié. Et l'accueil a
  précisément besoin de ses images : la chauffe compile UN programme par image
  (v246) et le fond de carte avance par tranches, aussi par image. Le flou
  prenait les images de la préparation. Il est donc suspendu tant que l'accueil
  travaille (`body.prepare`, posée dans la balise `<body>` pour qu'aucune image
  ne soit floutée, pas même la première ; retirée par `verreQuandPret` dans
  main.js, bornée à soixante secondes parce qu'un remède ne doit rien attendre
  de ce qu'il répare, v220). Le verre se dépolit alors en une demi-seconde :
  l'enfant VOIT le jeu devenir prêt.
  - **Et le A/B est sur la même machine, dans le même passage** : suspension en
    place, 25/25 programmes, fond de carte ✓, libéré à 41,3 s ; suspension
    désarmée, 7/25, fond ✗, 53,6 s.
  - **LES DEUX AUTRES PIÈCES DE LA PARURE NE COÛTENT RIEN, ET C'EST MESURÉ
    TROIS FOIS.** Couper la dérive de l'aurore rend 12,2 · 12,2 · 16,3 · 16,4 et
    cacher les deux calques plein écran 14,2 · 13,0, contre 15,2 · 11,2 · 16,8 ·
    17,3 pour la parure entière. Seul le flou se sépare. On ne touche qu'à lui —
    et le partage plus fin (le flou des BOUTONS contre celui des PANNEAUX) ne
    sort PAS du bruit à deux relevés par bras : je ne l'ai donc pas changé. On ne
    retouche pas ce que Max a validé sur la foi d'une mesure qui ne tranche pas.
  - **ET EN JEU, LA PARURE NE COÛTE RIEN** — `#overlay` est en `display: none`.
    Mes deux premiers relevés donnaient « pire image 260 et 267 ms avec, 123 et
    132 sans » : à six relevés, 282 · 242 · 145 contre 161 · 280 · 220, et
    0 à 1,2 % d'images au-delà de 150 ms des deux côtés. **J'ai failli déclarer
    une régression de jeu qui n'existe pas** — une mesure isolée n'est pas un
    fait (v218), et la pire image est par construction la statistique la moins
    stable.

- **UN BUDGET PAR IMAGE EST UN TAUX — LE PIÈGE DE LA v237, UN ÉTAGE PLUS
  HAUT.** Le fond de carte demande une quarantaine de tranches et
  `preparer()` lui accordait six millisecondes par image, soit une tranche par
  image : sur un accueil qui rend une à deux images par seconde, quarante images
  valent vingt à quarante secondes de vraie vie. Or **pendant ce temps-là il n'y
  a aucune partie à protéger** — le bouton est grisé, personne ne joue : ce
  n'est pas le même arbitrage que l'`avancerFond(8)` de la boucle de jeu, qui
  dispute ses millisecondes au monde qui tourne. `BUDGET_PREP` vaut trente
  millisecondes, et le chiffre se mesure (`?fondms=`) : tranches nécessaires
  37 → 16 → 9 → 5 pour 6 → 15 → 30 → 60 ms. **Le temps de libération, lui, ne
  bouge pas** (24,6 · 20,5 à 6 ms contre 23,3 · 21,2 à 30) parce que sous cette
  charge-là c'est la charge des corps qui commande — ce qu'on achète, c'est la
  MARGE en images, et c'est elle qui manquait au portail.

- **ET LA CHAUFFE DES PROGRAMMES PORTAIT LE MÊME PIÈGE, AU MÊME ENDROIT.**
  `chaufferLesProgrammes` compilait UNE signature par `requestAnimationFrame` —
  un compte par image, donc un taux qui suit la cadence. Le flou suspendu, la
  borne tirait encore avec SEIZE programmes sur vingt-cinq. Mesuré, dix
  compilations enveloppées : **17 à 25 ms chacune, médiane 18,5** — moins d'une
  demi-seconde de calcul pour les vingt-cinq, quand la chauffe en mettait
  quarante et une. Tout le reste était de la famine d'images. Le budget vaut
  cent millisecondes, et **ce qui le décide, c'est qu'il a DEUX régimes à
  servir** : ici une compilation vaut 18 ms, donc cinq passent et la chauffe
  tient en cinq images ; sur l'iPad Safari compile en CENTAINES de
  millisecondes (v257), donc la première le remplit à elle seule et l'accueil
  garde son étalement — qui est toute la raison d'être de la v246. Un budget
  qui servirait un seul des deux régimes serait un réglage de banc.
  `?chauffems=` le force.
- **ET UN VERDICT NE COMPARE PAS L'HORLOGE DU BANC À LA BORNE DE LA PAGE.**
  Celui de la libération exigeait `apres < 45000` : `apres` part avant
  `banc.joueur()`, donc il compte l'ouverture de la page, tandis que les
  quarante-cinq secondes sont la borne que la page s'applique depuis
  `departPrep`. Mesuré 43 761 contre 47 710 — rouge en comparant deux horloges.
  Et la durée n'a rien à faire dans ce verdict : ce qu'il annonce, c'est qu'AU
  MOMENT de la libération tout est là. Si la page se libère à sa borne en ayant
  fini, l'enfant n'y perd rien ; sinon c'est l'ÉTAT qui le dit — et c'est l'état
  qui a vu les deux vrais défauts (8 puis 16 programmes sur 25). La durée reste
  dans le MESSAGE, où elle sert à démonter un rouge, jamais à en faire un.
- **CE QUI RESTE, ET IL FAUT LE DIRE : SIX SECONDES NON ATTRIBUÉES.** La
  préparation met 42,9 à 45,2 s dans les conditions du témoin, contre 36,9 s sur
  `origin/main`. Dette déclarée dans `TASKS.md` avec la seule piste non mesurée —
  `#prep-line` réécrite toutes les 250 ms invalide la peinture de `#overlay`,
  donc les deux calques plein écran. **Mes mesures des calques ont toutes été
  faites sur une page SANS préparation, où rien ne réécrit : elles ne pouvaient
  pas voir ce coût-là.** C'est la sonde aveugle de la v273, sur mes propres
  mesures — et c'est pour cela qu'un « innocent » se dit avec les conditions
  dans lesquelles il a été mesuré.

- **UNE POLICE DE JEU HORS LIGNE VIT DANS LE DÉPÔT, JAMAIS CHEZ GOOGLE.** Un
  `<link>` vers `fonts.googleapis.com` casserait l'accueil dans l'avion, à
  l'école ou sur le Wi-Fi d'un hôtel — c'est-à-dire la moitié des endroits où
  ces deux enfants jouent. Bricolage Grotesque (76 Ko) et Plus Jakarta Sans
  (27 Ko), variables, sous-ensemble **latin**, dans le cache IMMUABLE
  (`isStaticAsset`, sw.js) avec le scanner, la flotte et les corps : elles ne
  changent jamais, donc elles ne doivent pas se re-télécharger à chaque
  livraison (leçon des 8,2 Mo de la v245). **Et le sous-ensemble se vérifie
  avant de se choisir** : la plage `latin` contient `U+0152-0153`, donc le
  « œ » de « cœur » et « nœud », que le jeu emploie dans une vingtaine de
  fichiers. Sans cette vérification, une lettre sur mille serait tombée dans
  une police de secours.
- **UNE REFONTE D'APPARENCE EST UNE COUCHE DE SURCHARGE, PAS UNE RÉÉCRITURE.**
  Elle se pose en FIN de feuille et ne touche qu'à la peau — couleurs, fonds,
  bords, rayons, ombres, lettres. Les mille lignes de mise en page au-dessus ne
  bougent pas d'un pixel. C'est ce qui rend le changement relisible et
  réversible, et ce qui évite de casser une marge en voulant changer une
  couleur. Les `!important` d'origine obligent à répondre en `!important` —
  c'est la seule raison d'en écrire.
- **UN TÉMOIN D'APPARENCE LIT UNE GRANDEUR, PAS UN NOM DE CLASSE.** « Clair »
  se mesure en LUMINANCE calculée du fond ; « la classe `.clair` est posée »
  ne mesure rien. De même, les polices se comptent dans ce que la page a
  RÉELLEMENT demandé (`performance.getEntriesByType('resource')`) : zéro chez
  Google, deux depuis le dépôt. C'est la règle de la v247 (« un témoin de
  rendu lit des pixels, jamais un type de matériau »), appliquée au DOM.
- **UNE COULEUR QUI REMPLIT ET UNE COULEUR QUI ÉCRIT NE SONT PAS LA MÊME
  COULEUR.** Les deux accents vifs — corail `#E8562A`, vert `#0E9268` —
  tiennent très bien en aplat avec du blanc dessus ; posés en TEXTE sur le
  verre clair ils rendent 3,44 et 3,74 pour une barre de 4,5. D'où
  `--corail-texte` (#B83B16, 5,42) et `--vert-texte` (#0A6B4C, 6,18). **Je les
  avais crus bons** : c'est le témoin de contraste qui l'a dit, et à l'œil la
  pastille de version paraissait parfaitement lisible.
- **ET UN TÉMOIN DE CONTRASTE COMPOSE LES FONDS TRANSLUCIDES.** Lire le seul
  `background-color` d'un élément de verre rend « transparent » : le témoin
  passerait au vert sans rien mesurer. On empile les fonds des ancêtres
  jusqu'à l'opacité pleine, en partant de l'élément. Il est VERT DES DEUX
  CÔTÉS et se garde quand même (règle de la v220) : il garde une CAPACITÉ —
  renverser une palette est exactement ce qui casse un contraste, et il reste
  trois renversements à faire. Qu'il PUISSE rougir se vérifie et ne se raconte
  pas : désarmé dans une copie d'`index.html`, il rend 2,41 et nomme le bouton.

**ET J'AI ANNONCÉ UN DÉFAUT DE CONTRASTE QUI N'EXISTAIT PAS.** J'ai écrit, dans
un commit et à Max, que le bouton « Me connecter à mon compte » portait du
`#cdd` sur du `#2c3a58`, « 2,9 pour une barre de 4,5 ». Mesuré : **8,07**. Le
bouton était parfaitement lisible ; ce qui clochait était sa COULEUR — un bleu
nuit hors palette au milieu du verre clair. **Un défaut de palette et un défaut
de lisibilité ne sont pas la même chose, et seul le second se mesure en
ratio.** C'est le témoin que je venais d'écrire qui a démonté ma propre phrase,
en étant vert là où je l'annonçais rouge — et c'est la meilleure raison de
l'écrire AVANT de décrire ce qu'on a corrigé.

**Et le thème de l'application suit le loader.** La v275 avait posé la règle
(« le thème suit le LOADER, pas le ciel ») avec un loader sombre ; le loader
devenu clair, `theme-color` et le manifeste passent à `#EFF3FA`. Sans cela le
lancement clignoterait en noir avant de devenir blanc — exactement le défaut
que la v275 avait corrigé, dans l'autre sens.

## Le jeu s'appelle Grand Tour (v275)

Max a validé le nom et le logo. Quatre règles, et la première vaut bien plus
que ce rebranding-ci.

- **ON RENOMME CE QUE L'ENFANT VOIT, JAMAIS CE QUI PORTE SES DONNÉES.** Sur les
  soixante-dix-neuf mentions de l'ancien nom dans le dépôt, la grande majorité
  ne sont pas du nom affiché : ce sont les CLÉS de stockage —
  `web-minecraft-worlds-v1`, `web-minecraft-edits-v3` (leurs blocs), `-pos-`,
  `-photos-`, `-records-`, `-profile-`. Les renommer effacerait les mondes de
  Marlon et d'Alice, qui sont irrattrapables (invariant 1, par un autre bout).
  Et `web-minecraft-static-v1` est le cache IMMUABLE : le renommer ferait
  re-télécharger treize mégaoctets à chaque iPad pour un nom que personne ne
  voit. Les unes et l'autre gardent leur nom, et un témoin de `maj.js` les
  compte — vert des deux côtés à dessein, comme le second témoin de la v220 :
  il ne garde pas une correction, il garde une capacité que la prochaine passe
  de rebranding frôlera encore.
- **LE NOM AFFICHÉ SE LIT DANS LA PAGE, IL NE SE RECOPIE PAS.** `main.js`
  écrivait « WEB MINECRAFT » en dur à deux endroits, pour restaurer le titre en
  quittant une partie : deux tables qui décrivent la même marque finissent par
  diverger, et c'est exactement ce qui se serait passé ici. `NOM_DU_JEU` est lu
  une fois dans `#overlay-title`, qu'`index.html` possède.
- **UN SEUL DESSIN FAIT FOI.** `icone.svg` porte l'emblème ; les trois PNG que
  réclament la PWA et iOS en sont RENDUS (Chromium, hors ligne), jamais
  redessinés. Deux choses s'y mesurent au lieu de s'estimer : **l'échelle** —
  mon premier jet raisonnait sur le viewBox de l'emblème (200) et non sur celui
  de l'icône (512), l'emblème occupait 37 % du carré au lieu des 80 % de la
  zone sûre d'un masque ; et **la finesse du trait** — la variante simplifiée
  du logo, pensée pour 78 pixels, rendue à 512 donne de grosses capsules au
  lieu d'une route en pointillé. On reprend les proportions du logo validé.
- **ET UN TÉMOIN DE RENOMMAGE DOIT TRAVERSER LE CHEMIN QUI RÉÉCRIT.** Lire le
  titre à l'ouverture ne prouve rien : le mauvais nom vit dans le RETOUR au
  menu. Le témoin entre en jeu, revient par 🏠, puis relit — et il a trouvé
  deux défauts qui n'ont rien à voir avec le nom, vieux de bien avant :
  `leaveToMainMenu` appelait `montrerReprise(false)` AVANT `pauseGame()`, qui
  la remet — le menu principal offrait « Reprendre » pour un monde qu'on venait
  de quitter ; et `pointerlockchange`, qui arrive de façon ASYNCHRONE après la
  fin du script en cours, réécrivait « Pause » par-dessus le titre restauré. Un
  témoin qui suit le trajet de l'enfant trouve ce qu'aucune relecture ne voit.

## Le démarrage et la conduite sur un vieil iPad (v245)

Max, sur l'iPad de quatre ans : « il faut attendre quasiment vingt secondes le
temps de pouvoir cliquer sur le bouton », et « la voiture avance de manière
hyper saccadée. La marche, c'est ok. » Deux pannes, deux causes, aucune n'était
là où l'intuition la mettait, et les deux se reprennent telles quelles.

### L'accueil attendait huit mégaoctets — et rien ne le disait

`humains.js` chargeait ses neuf corps Rocketbox par un **`await` de premier
niveau**. Comme `main.js` l'importe, l'évaluation de `main.js` — donc
l'attachement de TOUS les boutons — attendait que 8,2 Mo soient arrivés ET
analysés. Quatre-vingts pour cent de tout ce que le jeu télécharge, avant la
première ligne de l'accueil ; et comme ces neuf fichiers étaient dans la
liste des ASSETS de `sw.js`, **chaque livraison les faisait re-télécharger**,
c'est-à-dire tous les jours, en concurrence avec la page qui les demandait
aussi. Sur un Wi-Fi ordinaire, c'est vingt secondes. Quatre règles :

- **UN `await` DE PREMIER NIVEAU DANS UN MODULE IMPORTÉ PAR `main.js` EST UN
  ÉCRAN D'ATTENTE.** Il retient tout le graphe. Ce qui est lourd se charge
  APRÈS la première image (`chargerHumains()` dans le `requestAnimationFrame`
  qui cache le loader), jamais à l'import. Le banc ne pouvait PAS le voir :
  les fichiers y arrivent en trente millisecondes depuis le disque, et le
  bridage du processeur (`Emulation.setCPUThrottlingRate`) ne touche ni le
  réseau ni le rendu logiciel. Le témoin RALENTIT donc les neuf fichiers de
  cinq secondes chacun (`page.route`) et compte combien sont arrivés quand
  `window.__game` apparaît : zéro ici, neuf sur l'ancien code.
- **CE QUI NAÎT AVANT LES MODÈLES SE MET À NIVEAU SUR PLACE.** Un passant, un
  garde du château ou l'avatar bâti pendant le chargement reçoit le corps
  sculpté de l'atelier, puis — le MÊME objet, dans la même scène, avec les
  mêmes pivots — se voit remplacer ses pièces quand les modèles sont là
  (`mettreANiveau`, personnages.js), par tranches de six millisecondes par
  image. Les accessoires accrochés aux pivots (l'épée, la torche, le
  bouclier) passent sur les pivots neufs ; ce qui décrivait l'ancien corps
  (`membres`, `rig`) est effacé de `userData`, sinon il survit à côté du
  nouveau. Et **`presence.js` doit le savoir** : ses copies privées de
  matériaux pilotaient l'ancien corps ; il recopie quand `miseANiveau`
  change, en gardant la présence acquise, sinon les partagés seraient fondus
  et tout le monde pâlirait. Mesuré au banc avec des modèles retardés :
  123 personnes nées avant, 123 mises à niveau, même objet, zéro erreur, et
  53 géométries RENDUES au pilote (les corps sculptés partent).
- **LES FICHIERS IMMUABLES VIVENT DANS LE CACHE IMMUABLE.** `sw.js` les range
  avec le scanner et la flotte (`isStaticAsset`), et l'installation les y
  ajoute EN ARRIÈRE-PLAN s'ils manquent, sans retenir la version. Un fichier
  qui ne change jamais n'a rien à faire dans la liste versionnée.
- **`waitForFunction` NE SUIT PAS UNE PROMESSE.** Une fonction `async` rend
  une promesse, qui est vraie : le témoin passait tout de suite et disait que
  les modèles étaient là cinq secondes avant qu'ils n'arrivent. On interroge
  en boucle par `evaluate`. Une heure pour le voir.

Ce que le banc a mesuré et qui NE se transpose PAS : la première image y
arrive à 8-11 secondes quel que soit le bridage, parce que 2,9 des 5,5
secondes de processeur sont dans three.js — création du contexte WebGL et
compilation des programmes en logiciel — et 0,4 dans `makeCharPortraits`
(un second contexte). Sur l'iPad, c'est de l'ordre de la dizaine de
millisecondes. Ce qui se transpose, c'est ce que le témoin mesure : le
NOMBRE de fichiers attendus avant l'accueil.

### La conduite saccadée : six rendus dans la même image

Mesuré au banc, assis dans une voiture à l'arrêt : une image sur quatre durait
TROIS fois la médiane, **par paires à une demi-seconde d'écart** — la cadence
de la sonde des reflets, qui rendait ses six faces dans la même image, et
chaque face soumettait au pilote autant d'appels de dessin que la vue de
l'enfant (200, 455, 15, 149, 240, 282 pour les six, contre 239). À pied, rien :
la sonde ne tourne qu'à moins de quarante-cinq blocs d'une voiture montable —
c'est exactement « la marche, c'est ok ». Trois choses en sortent.

- **UNE FACE PAR IMAGE.** `lancerReflets` note où regarder, `avancerReflets`
  rend une face par tour d'affichage, les mipmaps se calculent à la sixième.
  Un reflet complet six images plus tard, ce qu'aucun œil ne voit sur un
  pare-brise. Le témoin lit `renderer.info.render.frame`, qui avance d'un cran
  par `render()` : sept par tour sur l'ancien code, deux au plus ici.
- **LA SONDE NE DESSINE QUE LE DÉCOR** (`couches.js`). À 128 px un passant
  fait trois pixels sur un capot ; ce qui se voit dans une carrosserie, c'est
  le ciel, les façades et la rue. Le décor — morceaux, eau, ciel, paysage
  lointain, Manhattan — porte la couche 4 **là où il entre dans la scène**,
  les six caméras ne voient qu'elle, la caméra de l'enfant voit tout. Et la
  carrosserie porte la couche 2 pour la même raison qu'avant (une surface ne
  peut pas lire la texture qu'on écrit) : c'est ce qui remplace le PARCOURS
  de la scène entière que faisait l'ancien masquage, cinq mille objets deux
  fois par seconde.
- **LES PROGRAMMES SE COMPILENT PENDANT L'ACCUEIL.** Un matériau rendu vers
  une cible cubique a son PROPRE programme (espace de couleur et
  correspondance tonale changent) : vingt-six programmes de plus à l'arrivée
  de la première voiture, mesuré par `renderer.info.programs`, et la seconde
  d'image figée qui va avec. Une capture est lancée au point d'apparition à
  la première image, pendant que l'enfant lit l'accueil.

## La téléportation, et ce qui se compile à l'arrivée (v246)

Max, capture d'iPad : « le lag est bien présent quand on fait une
téléportation, à peu près dix secondes ». Découpé image par image à
l'arrivée à Paris, comme la fluidité en vol : le maillage tient son budget ;
ce qui prend les images, c'est **vingt programmes de shaders compilés dans
les images où les premières voitures apparaissent** (seize avant, trente-six
après, 1,5 s dans `getProgramInfoLog` au banc) et **dix-huit passants nés
dans la même image**, chacun avec son clone de squelette. Quatre règles.

- **UNE SIGNATURE DE PROGRAMME N'EST PAS UN MATÉRIAU.** C'est le matériau
  (cartes, vernis, verre, double face) CROISÉ avec la géométrie (couleurs de
  sommets, absence de normales → ombrage plat, tangentes, second jeu d'UV) et
  avec le maillage (squelette). Mon premier relevé, fait sur les matériaux,
  trouvait onze signatures pour la flotte et en manquait la moitié : la
  plupart des carrosseries arrivent SANS normales et le chargeur GLTF les
  passe en ombrage plat. La chauffe compilait donc treize programmes que
  personne n'utilisait et laissait sept vrais programmes à l'arrivée — un
  témoin qui aurait compté « la chauffe a tourné » aurait été vert. **La
  table se LIT dans les fichiers** (`src/signatures.js`, sans import, chargé
  par le banc sous node) et le témoin exige l'égalité des deux ensembles :
  ni signature manquante, ni signature morte. Un modèle déposé demain d'une
  autre facture rougit ce témoin et nomme sa signature.
- **ET LES HUMAINS ONT DEUX PROGRAMMES PAR SIGNATURE.** `presence.js` les
  fait apparaître en fondu, donc bascule `transparent` — et `opaque` fait
  partie de la clé de programme. On chauffe les deux variantes.
- **UNE SONDE DE FLUIDITÉ VÉRIFIE D'ABORD QUE LE JEU TOURNE.** Ma première
  mesure du remède rendait 60 images par seconde, zéro image figée, zéro
  programme neuf — sur une boucle de rendu MORTE : `faireNaitre` lisait une
  variable qui n'existait plus, l'erreur tuait l'`animate` à la
  cinquante-huitième image, et la sonde comptait ses propres `rAF` sur une
  page vide. Le compteur qui fait foi est `renderer.info.render.frame`, qui
  n'avance que si `render()` est appelé ; le témoin de téléportation l'exige
  (`images > 30`), et c'est la sœur de « une sonde de déplacement vérifie
  d'abord qu'elle s'est déplacée ». Un chiffre trop beau se démonte avant de
  se célébrer.
- **LES NAISSANCES SE FONT PAR TRANCHES.** `peupler` (passants.js) ne fait
  plus que prévoir ; `naitre`, appelé à chaque image, en fait naître pour
  cinq millisecondes au plus. C'est la file du maillage des morceaux, encore
  une fois : une file qui se vide d'un coup n'est pas une file.

### Une pièce de roue est un mot entier et une géométrie

Max : « la Bugatti quand elle avance, il y a des trucs noirs qui bougent
autour ». `normaliserVoiture` regroupait les pièces de roue par leur NOM, et
`/rim/` attrapait « trim » — la garniture : les bandes de carrosserie de la
Chiron Stealth tournaient avec la roue arrière droite, jusqu'au toit, et la
Lucid Gravity était déformée par le même défaut. Deux choses :

- **Le nom se lit en mots entiers** (`(?<![a-z])rim(?![a-z])`), **et la
  géométrie tranche** : une pièce qui ne tient pas dans une fois et demie
  l'emprise du pneu, ou dont le centre est à plus de six dixièmes de bloc du
  sien, n'est pas une pièce de roue, quel que soit son nom. Le pivot se pose
  au centre du PNEU, pas au centre du groupe. Témoin : sur les deux modèles
  déposés, rien de la carrosserie ne tourne avec une roue.
- **« Améliore le design de la Lucid Gravity » était la même panne**, vue
  d'un autre siège : des panneaux entiers qui tournent sur eux-mêmes, ce
  n'est pas un modèle laid, c'est un modèle cassé. Avant de resculpter ce
  qu'un enfant trouve moche, on mesure si c'est ce que l'auteur a livré.

**ET UNE ROUE TOURNE AUTOUR DU x DE SON PARENT, PAS DU SIEN (v250).** Max,
capture d'iPhone : « Gravity design ko, wheels » — les roues de la Lucid
sortaient de leurs arches, de biais. `rotation.x += angle` est un Euler
XYZ : la rotation en x s'applique en dernier, donc autour du x du PARENT,
quelle que soit l'orientation propre du nœud (les pivots du manifeste
portent une rotation de −90° et tournent très bien). Les pivots fabriqués
par `normaliserVoiture` naissaient sous le modèle AVANT son quart de tour :
sur un modèle dont la longueur est x, le x du parent était l'axe
avant-arrière. Le pivot naît donc dans un groupe-essieu (`Essieu_*`) dont
le x est la voie. Trois choses de plus :

- **Mon premier remède tournait le PIVOT lui-même** (`pivot.rotation.y`) :
  juste sur le papier, sans effet, parce que l'orientation propre du nœud
  ne change pas l'axe de son Euler x. Un signe se regarde, et un AXE aussi.
- **Le témoin mesure ce que fait l'animation**, pas ce que le nœud déclare :
  le x du parent dans le repère de la voiture, et le déplacement RÉEL d'un
  point posé au sommet du pneu après un tiers de tour — vers le nez, pas de
  côté. Mon premier témoin lisait le x local du nœud : il accusait les
  cinquante modèles du manifeste et blanchissait la Lucid.
- **UNE SONDE DE RENDU VOIT TOUTES LES COUCHES.** La carrosserie laquée vit
  sur la couche 2 depuis la v245 (`couches.js`) ; une caméra neuve ne voit
  que la couche 0, et mes premières vignettes montraient des voitures
  éclatées — sièges à travers le toit, lame avant « détachée » —, sur les
  deux arbres, Rimac comprise. J'ai failli accuser le modèle. Toute caméra
  de sonde fait `layers.enableAll()`.

### Chaque ville a ses voitures, et chaque voiture sa laque

La graine d'un convoi valait « nombre de points du tracé + rang » : les
villes engendrées, aux anneaux semblables, tiraient les MÊMES vingt modèles
dans le même ordre. `graineDeVille(tr)` la prend dans la position de la
ville ; `choixFlotte(n, ville)` est pure et publiée, et `etat()` expose
`graine`, `modeles` et `livrees` (modèle + laque de chaque voiture visible)
pour qu'un témoin lise ce que l'enfant voit sans rien fabriquer. Deux
voitures sur trois reçoivent la teinte tirée pour elles, la troisième garde
sa livrée d'origine : une voiture dont la couleur fait l'identité ne doit pas
disparaître de la rue. La laque seule se repeint (`EST_LAQUE`) : vitres,
chromes et carbone gardent leur rendu.

## Le regard de New York, partout (v247)

Max : « regarde les améliorations qu'il y a encore eu dans la ville de New
York et reproduis-les sur l'ensemble de la carte. Sois autonome, améliore la
carte, le réalisme partout. » Mesuré sur captures, rue et ciel, jour et nuit,
à Paris et à New York : Manhattan était éclairée par le soleil, portait des
ombres et passait par une correspondance tonale ACES ; le reste du monde
était un `MeshBasicMaterial` dont la COULEUR servait de lumière — une façade
au soleil et une façade à l'ombre avaient la même teinte, rien ne portait
d'ombre, le ciel était une couleur unie, et la nuit n'était qu'un jour
assombri. Première étape du programme : le regard, sur tout le monde.

- **LE JOUR ET LA NUIT SONT DES LAMPES, PAS UNE TEINTE.** Les blocs, l'eau
  et le paysage lointain sont Lambert ; le ciel (hémisphère) porte la
  lumière diffuse, le soleil la lumière directe et ses ombres, la lune prend
  sa place la nuit, bleutée et faible. `lightColor` ne sert plus qu'aux
  vitres allumées. Manhattan règle ses lampes quand l'enfant y est
  (`renduDansManhattan`) ; le monde ne les touche pas pendant ce temps.
- **ET LA SONDE `__lumiere()` PUBLIE LE NIVEAU DES LAMPES**, non plus la
  couleur du matériau des murs (toujours blanche désormais) : le témoin « à
  minuit, les fenêtres restent allumées » de `carteMonde.js` est tombé au
  portail avec « murs à 1 » avant cette correction. Une sonde qui lit un
  mécanisme meurt avec lui ; celle-ci lit ce qui éclaire.
- **LES INTENSITÉS SE MESURENT SUR CAPTURES, ELLES NE SE RECOPIENT PAS DE
  MANHATTAN.** Mon premier jet calquait les siennes (soleil 0,16 + 1,5,
  ciel 0,32 + 0,95) : les textures des blocs sont plus claires que ses
  matériaux physiques, et la correspondance tonale rendait un ciel blanc et
  des toits blancs. Ramenées à 0,14 + 1,0 et 0,26 + 0,62 sur captures.
- **LE ZÉNITH SE MESURE AUSSI.** À 0,75 fois l'horizon, le dôme rendait
  187 pour 194 de luminance après ACES : une voûte invisible, et le témoin
  l'a dit (rapport 0,96 pour une barre de 0,9). Il lui faut la moitié.
- **L'OMBRAGE PAR FACE DU MAILLEUR N'EST PLUS QU'UN RÉSIDU** (0,62 → 0,88 sur
  les côtés) : cuit dans les couleurs de sommets, il s'ajoutait à
  l'éclairage réel et noircissait deux fois. L'occlusion ambiante, elle,
  reste cuite — une lampe ne la remplace pas.
- **EN QUITTANT MANHATTAN, ON REND AU MONDE SES OMBRES.** `earthLook`
  retient `shadowMap.enabled`, `castShadow` et la taille de la carte
  d'ombre ; la sortie les RESTAURE au lieu d'écrire `false`. Sans cela, la
  première visite à New York éteignait les ombres de toute la carte.
- **LE SOLEIL VISE L'ENFANT** (`suivreLeSoleil`) : sa caméra d'ombre fait
  cent quatre-vingt-dix blocs de côté et se déplace avec lui, comme à
  Manhattan. La direction vient de `sky.js`, déjà retournée la nuit.
- **UN TÉMOIN DE RENDU LIT DES PIXELS, JAMAIS UN TYPE DE MATÉRIAU.** Un
  pilier de pierre sur une dalle de pierre, loin de tout : le sol dans son
  ombre contre le sol au soleil (78 contre 130), sa face est contre sa face
  ouest le matin (95 contre 44) et le soir (l'inverse), le zénith contre
  l'horizon. Sur l'ancien code les trois rapports valent un. La lecture se
  fait par `gl.readPixels` juste après un `render()` dans la même tâche, et
  la caméra se pose à la main (`lookAt`) pour ne pas dépendre de la
  convention de cap du joueur.

**Ce que ça coûte, et où — MESURÉ, PAS DEVINÉ.** Une passe d'ombre par
image : le monde proche rendu une seconde fois depuis le soleil. Au banc, à
Paris, à la distance de l'iPad (médiane par image, rendu logiciel) :

| | ms |
| --- | --- |
| sans ombres | 217 |
| ombre basique, carte 512 | 350 |
| PCF, carte 1 024 | 400 |
| PCF doux, carte 2 048 (premier jet) | 467 |

La PASSE est le gros du coût, la taille et le filtre le reste. D'où trois
choix : carte de 1 024 partout (cinq texels par bloc sur 190 blocs
d'emprise), filtre PCF simple, et **seuls les morceaux à portée de la caméra
d'ombre PORTENT une ombre** (`RAYON_OMBRE`, six morceaux ; les autres en
reçoivent) — la passe ne rend pas les neuf cents morceaux chargés. Ces
millisecondes sont celles de SwiftShader et ne se transposent pas à la
tablette ; ce qui se transpose, c'est que la passe existe et ce qu'elle
dessine. Le coût sur l'iPad est une dette déclarée, avec ses leviers.

**ET LES OMBRES DEMANDENT UNE CARTE GRAPHIQUE — le premier portail l'a
dit.** Même à 383 ms l'image, le banc en rendu logiciel volait deux fois
moins vite et relevait deux fois moins : quatre bornes de garde sont tombées
sur du code sain (667 blocs parcourus pour une borne de 1 000, 59 relevés de
virage pour 500, un clic de carte jamais « stable » en trente secondes, une
partie à trois qui ne se voit plus). Régler ces bornes aurait mesuré le
banc. Le jeu coupe donc lui-même ses ombres quand le rendu est LOGICIEL
(`renduLogiciel`, par le nom du pilote : SwiftShader, llvmpipe) — un
navigateur sans carte graphique préfère un monde sans ombres à un monde qui
n'arrive pas — et `?ombres=1` les force : c'est ce que fait la page à part
des trois témoins du regard (`banc.jouerSeul(…, { ombres: 1 })`). Toute
suite qui ne mesure pas le regard tourne donc sans ombres, comme avant ; les
trois témoins tournent avec. Sur l'iPad, la carte graphique est là.

## Les réverbères, partout, et quatre lampes pour tout le monde (v248)

Deuxième étape de « New York partout ». Manhattan a quatre lampes de rue ;
les villes engendrées plantaient des réverbères dont la lanterne était un
bloc peint, et les six villes bâties à la main n'en avaient AUCUN — mesuré
sur captures de nuit à Paris, Londres et Rome : des vitres allumées, des rues
noires. Quatre règles.

- **LE MONDE RÉPOND TOUT SEUL, ON NE CONNAÎT PAS LA TRAME.** `lampadaireDeVille`
  (world.js, à côté d'`arbreDeVille`) regarde le SOL : une colonne de trottoir
  dont un voisin est de la chaussée est au bord du caniveau, la rue court le
  long de l'axe sans chaussée, et l'on compte les crans le long de cet axe.
  Un coin de carrefour — chaussée sur les deux axes — ne reçoit rien. Le même
  crochet sert Paris, Washington, San Francisco et la boucle Nice/Lille/
  Londres ; les villes engendrées gardent `mobilierVillesMonde`. **Et « la
  chaussée » se DEMANDE, elle ne se recopie pas** : `CHAUSSEE` est exportée
  de `world.js` ; `main.js` la lit pour tourner la crosse vers la rue. Paris
  y a fait entrer `ARCHI.PAVE` — sa rue est en pavés, et mon premier jet ne
  posait pas un réverbère à Paris.
- **QUATRE LAMPES, ET PAS UNE DE PLUS, POUR TOUT LE JEU.** Le nombre de
  lumières ponctuelles fait partie de la clé de chaque programme de shader :
  en créer d'autres recompilerait TOUS les matériaux à l'entrée et à la
  sortie de Manhattan — le gel de la v246, ramené par la petite porte.
  `main.js` possède les quatre (`lampesRue`) et les PRÊTE à `ManhattanRenderer`
  (option `lamps`) ; hors de Manhattan, `eclairerLaRue` les pose sous les
  quatre lanternes les plus proches de l'enfant, à moins de quarante blocs,
  sur une cadence de ménage en temps réel (une demi-seconde), et les éteint
  le jour. Les lanternes sont notées par `meshChunk` (`entry.lanternes`) en
  dessinant les réverbères — un réverbère posé par l'enfant éclaire donc
  aussi.
- **LA PART DE NUIT N'EST PAS `daylight`.** `daylight` ne descend jamais sous
  0,08 : `nuitDehors` en fait un lissage de 0 à 1, et c'est lui qui allume.
- **UN TÉMOIN DE LUMIÈRE LIT DES PIXELS, UN TÉMOIN DE MOBILIER LIT DES
  BLOCS.** Le premier pose un réverbère sur la dalle des témoins du regard
  et compare le sol à son pied au sol huit blocs plus loin (132 contre 19 ;
  rapport un sur l'ancien code). Le second lit `getBlock` autour du centre
  de quatre villes — et lit la chaussée voisine au SOMMET de sa colonne,
  parce que San Francisco est en pente ; et il tolère quinze pour cent de
  réverbères sans chaussée à côté, parce qu'à Paris trois sur vingt-neuf
  ont pour voisin une rue que la culée d'un pont recouvre APRÈS le sol.

## Les feux des villes bâties à la main (v274) — un carrefour n'est pas un coin

La v273 avait laissé les six villes bâties à la main sans un seul feu. Quatre
règles, et les quatre sont des mesures qui ont contredit une intuition.

- **UN CARREFOUR NE SE DEVINE PAS À LA FORME DU CANIVEAU.** Le test qui vient
  sous les doigts — « une colonne de trottoir avec de la chaussée sur les DEUX
  axes » — teste en réalité un caniveau NON ALIGNÉ sur les axes du monde. Une
  rue en diagonale a un caniveau en escalier, et chaque marche le passe :
  mesuré à Lille, une grappe de **vingt-huit** colonnes voisines, et 622 feux
  là où Rome, ville engendrée, en a 49. Ce qui SAIT où sont les carrefours,
  c'est le réseau d'avenues NOMMÉES — celui que `chainerVoies` enchaîne déjà
  pour faire rouler les convois, donc des croisements où une voiture passe par
  construction (`carrefoursDeVoies`, voies.js, pur). Paris 44, Londres 52,
  Washington 89, Lille 12.
- **ET C'EST LE CARREFOUR QUI CHOISIT SES QUATRE COINS.** Dans chacun de ses
  quatre quadrants, la colonne de trottoir au bord du caniveau la plus proche
  de lui : quatre feux au plus, jamais une grappe. Une sélection faite PAR
  CARREFOUR ne peut pas produire d'escalier ; une sélection faite colonne par
  colonne le peut toujours.
- **UN CARREFOUR N'EST PAS UN POINT, C'EST UN ENDROIT — et le seuil se lit dans
  la distribution.** Trois avenues concourantes donnent trois croisements. Les
  distances entre croisements distincts montrent un trou net : Washington
  1,0 · 1,0 · 1,0 · 1,4 · 1,4 · 2,0 puis rien avant 3 ; Paris 1,4 · 1,4 · 2,0
  puis 3,0 ; Nice, Lille et San Francisco rien sous 4. Trois blocs tombent dans
  ce trou. **Et regrouper les carrefours ne suffit pas** : il restait des
  paires de feux à 1,0 bloc, les coins CHOISIS par deux croisements voisins.
  On filtre aussi les feux — la paire la plus proche passe de 1,0 à 3,0 dans
  les six villes.
- **ÉCARTER L'EMPRISE DES MONUMENTS EST UN NON-RÉSULTAT MESURÉ.** Trois feux de
  Paris ont leurs quatre voisins en `STONEBRICK` : les repères se posent APRÈS
  les colonnes et pavent la rue que `sol()` promettait (piège des ormes du
  Mall, v205). Le garde évident — écarter tout candidat dans une `box` de
  repère — fait tomber Paris ET Londres à **zéro feu** : la `box` est une zone
  d'interdiction de BÂTIR, bien plus large que ce que le repère pave. Écrit,
  mesuré, retiré ; la dette est déclarée avec la vraie question, qui est un
  conflit de PLAN (une avenue qu'un monument recouvre), pas un feu à cacher.

**ET UNE FENÊTRE DE MESURE SE POSE SUR LA GRANDEUR MESURÉE, PAS SUR UN CHIFFRE
ROND.** Le portail de la v274 a rendu rouge « un passant qu'on approche continue
son chemin », vert aux deux versions précédentes DU PREMIER ESSAI (1,25 bloc en
3,5 s) et ici douze essais pour 0,99 au mieux. La sonde a séparé les cas en une
exécution : le passant n'était pas bloqué du tout — état `marche` et crochet
d'obstacle FAUX d'un bout à l'autre, 0,32 bloc par seconde, 3,93 blocs en vingt
secondes. Il franchit la barre de 1,2 vers 3,5 s, c'est-à-dire AU BORD d'une
fenêtre de quatre secondes ; et le même relevé montre un gel de SEPT secondes au
milieu (la distance figée à 2,77 de la neuvième à la quinzième), le banc rendant
quatre images par seconde. **Le témoin mesurait la cadence du banc.** Et son
propre commentaire annonçait « jusqu'à douze secondes » quand le code en
accordait quatre — *ce qui est écrit dans un commentaire n'est pas ce que le
code fait* (v220), une fois de plus. La fenêtre vaut désormais les douze
secondes promises, et le temps pris entre dans le message, réussite comme échec.

**ET UNE FRACTION SE POSE SUR LA VILLE, PAS SUR LA FENÊTRE.** Le témoin était
rouge sur Paris seul — onze feux « au coin » sur quatorze — et la sonde qui
distingue les cas a répondu en une exécution : `solParis` disait « carrefour »
pour les trois accusés. Mesuré sur le DISQUE entier, le vrai dénominateur :
Paris 88 sur 91 (97 %), Londres 116 sur 117 (99 %). La fenêtre de ±40 blocs du
centre contenait justement le monument fautif. C'est « un témoin qui porte une
dimension de ville ne l'écrit pas, il la demande » (v203, v271), vu par la
FRACTION au lieu du rayon.

**Et le sol d'une ville n'est pas toujours à `terrainHeight`** : sur les quais
et au pied des ponts, Paris écrit sa chaussée un bloc plus haut. Un témoin qui
lit le sol lit par `sommetColonne`, qui rend le premier bloc SOLIDE — donc la
chaussée, et le trottoir SOUS un feu, qui est un prop non solide.

## Les feux tricolores, et ce qu'une sonde aveugle ne peut pas voir (v273)

Le point 4 du programme de réalisme — « la vie dense : voitures qui s'arrêtent
aux feux » — attendait depuis des mois. Mesuré en capture à Zurich AVANT d'y
toucher : les feux étaient là, un par coin de carrefour, et leur boîtier
montrait ses **trois lentilles allumées ensemble**. Quatre règles.

- **LA RÈGLE D'UN FEU EST PURE, ET UNE SEULE** (`src/feux.js`, sans import, lu
  sous node par un témoin) : le cycle (vert 9 s, orange 2, puis l'autre axe),
  et l'AXE qu'un feu commande. Celui qui allume les lentilles (`main.js`) et
  celle qui s'arrête devant (`vehicules.js`, par un crochet branché depuis
  `main.js`) lisent la MÊME fonction. Deux tables qui décrivent le même feu
  finissent par diverger — c'est la discipline de `postesAvion` et de la
  tuyère, appliquée au carrefour.
- **L'HORLOGE EST EN TEMPS RÉEL, ET LE CYCLE VAUT DEUX DEMI-CYCLES EXACTEMENT.**
  En `dt` (borné à un vingtième), un feu passerait au vert deux fois plus tard
  sur une tablette qui rame : un feu est une cadence de MÉNAGE (v226), il
  décide de ce que le monde fait. Et si le tour ne vaut pas exactement deux
  fois `vert + orange`, l'orange d'un axe déborde sur le vert de l'autre et
  deux files démarrent ensemble — mesuré sur tout le cycle, par pas de cent
  millisecondes.
- **L'AXE SE LIT DANS LA POSITION, PAS DANS UN IDENTIFIANT DE BLOC.** La parité
  de (x + z) met les quatre coins d'un carrefour en diagonale deux à deux —
  exactement la paire qui, dans une vraie ville, regarde la même file. Aucun
  bloc neuf, aucune migration, et la règle est la même des deux côtés. Le feu
  TOURNE ensuite vers la rue de son axe (`versLaRueAxe`) : il est à un coin,
  donc DEUX rues le touchent, et celle qui compte est celle qu'il arrête.
- **L'ÉTAT VIT DANS LE NOM DU MAILLAGE, PAS DANS `userData`.** Chaque feu de la
  ville est un CLONE du gabarit de `props.js`, et `Object3D.copy` recopie
  `userData` par JSON — un maillage n'y survit pas. Les trois lentilles vives
  sont donc NOMMÉES (`feu-rouge`…), cachées, et `main.js` n'en montre qu'une.
  Émissif seulement, aucune lampe : quatre lumières ponctuelles pour tout le
  jeu (v248, v264).
- **ET LE FEU N'EXISTE QUE DANS LES VILLES ENGENDRÉES — c'est déclaré, pas
  oublié.** `RUE.FEUX` n'est posé que par `villesmonde.js` : les six villes
  bâties à la main et Manhattan n'ont pas un seul feu, donc rien ne les y
  arrête. La règle, elle, est prête et ne connaît rien des villes — elle lit
  une position. Le remède est de POSER des feux aux carrefours de ces
  villes-là, comme `lampadaireDeVille` (v248) a partagé les réverbères : le
  monde répond tout seul, on ne connaît pas la trame. Dette nommée dans
  `TASKS.md` ; l'écrire ici est ce qui empêche la cinquième occurrence du verre
  dans les murs.

**ET UN VERDICT LU À L'INSTANT D'UNE TRANSITION EST UN COUP DE DÉ (v273).**
Le portail a rendu rouge « gaz réduits et manche en avant, on se pose soi-même
sur la piste », VERT au portail de la v272, sur une physique qui n'a pas bougé
d'une ligne : `arrêt {v: 0}` la veille, `{v: −1,5}` ici, au même bloc de piste
(x 56 contre 57). La cause n'est pas un défaut, c'est une FONCTIONNALITÉ : le
témoin garde le doigt sur le joystick, tiré vers l'arrière, et depuis la v269
« le geste prime sur la consigne » — une fois l'appareil arrêté, ce même doigt
le fait RECULER. Le témoin s'arrêtait au premier relevé où l'état passe à
`sol`, à deux cents millisecondes près : il lisait tantôt l'arrêt, tantôt le
début de la marche arrière. Il RELÂCHE désormais le joystick, attend que la
vitesse se pose (borné à huit secondes, la durée entrant dans le message), et
mesure alors ce qu'il annonce. **Quand un témoin lit une grandeur AU MOMENT
d'un changement d'état, il ne mesure pas l'état : il mesure la date de son
échantillon** — c'est la famille des verdicts en durée (v270), du côté de
l'instant au lieu de la durée. Et un rouge qui apparaît sur un code de jeu
INCHANGÉ accuse le témoin : on cherche ce que la livraison d'avant avait rendu,
et pourquoi.

**ET UNE MESURE DE DÉPLACEMENT S'ASSURE QU'ELLE A LA PLACE DE SE DÉPLACER.**
Le rejeu SEUL de `monte.js` a rendu un second rouge, vert au portail :
« à l'arrêt, le joystick fait rouler l'appareil sur la piste ». La piste des
témoins fait trois cents blocs de pierre ; l'atterrissage assisté en consomme
presque tout — 291 blocs rejoué seul, moins au portail — et les deux secondes
de roulage à six blocs par seconde faisaient alors SORTIR l'appareil par le
bout (x 303, y −1,5 : il tombe, `sol` faux). Le témoin ne mesurait donc pas le
roulage, il mesurait **où l'atterrissage s'était arrêté**, ce qui dépend de la
cadence du banc. Le roulage est une mesure À PART : on ramène l'appareil au
début de la piste, immobile, puis on mesure. C'est la sœur de « un témoin de
conduite part d'une rue sans voiture à portée » (v252, v259) — avant de
mesurer un déplacement, on lui donne de quoi se déplacer.

**ET UNE SONDE QUI INTERROGE LA MAUVAISE LISTE NE PEUT RIEN VOIR.** Ma première
mesure de « les voitures s'arrêtent-elles ? » lisait `vehicules.enMarche()` et
rendait **zéro arrêtée sur 128 relevés** — sur un code qui s'arrêtait très
bien. `enMarche()` EXCLUT par construction les voitures qui attendent (c'est sa
raison d'être : un piéton ne s'écarte pas devant une voiture à l'arrêt). La
sonde ne pouvait donc PAS voir un arrêt, quel que soit le code. Relue sur
`etat().places`, qui publie la pose ET le drapeau d'attente de chaque voiture :
140 arrêts au rouge sur 1 455 relevés, et quatre redémarrages au vert. C'est
« compter un motif n'est pas compter la chose » (v224), du côté de la SONDE :
avant de conclure qu'un mécanisme ne marche pas, on vérifie que l'instrument
peut le voir.

## Une voiture n'est pas un avion : ni jauge, ni eau sous les roues (v272)

Max, capture d'iPhone à Hambourg, quatre défauts sur une seule image : la
voiture au milieu du port, « il est marqué 86 km/h » sur une voiture immobile,
le bouton « Descendre » en plein milieu de l'écran, et « la jauge de vitesse,
je ne veux pas qu'elle soit existante pour une voiture ». **Aucun des quatre
n'était là où l'image le mettait**, et les quatre remèdes sont ailleurs que
dans la pièce qu'on voit.

**CETTE DÉCISION ANNULE CELLE DE LA v262 POUR LA VOITURE.** La manette des gaz
et le compteur restent des instruments d'AVION — une poussée qui se garde quand
on lâche est ce qui distingue un avion d'une voiture (v228), et le compteur en
Mach a été bâti pour lui (v267). Une voiture se conduit au joystick, d'un seul
doigt, comme avant la v262 : l'avant accélère, l'arrière freine puis recule
(v269), le côté tourne le volant. `player.gaz` reste à `null` en voiture, et
c'est ce chemin-là — celui du repli, écrit en v262 « rien de ce qu'un enfant
sait ne cesse de marcher » — qui redevient le seul.

- **LA ZONE DU JOYSTICK N'EST PAS LE CERCLE QU'ON VOIT : C'EST LE QUART
  BAS-GAUCHE DE L'ÉCRAN.** Le cercle se dessine là où le doigt tombe ; ce qui
  décide, c'est `clientX < 45 %` et `clientY > 40 %` de la vue, dans le
  `touchstart` du canvas (main.js). **Un élément du DOM posé là intercepte le
  doigt avant le canvas** : on ne peut plus prendre le volant à cet endroit, et
  l'on DESCEND en croyant tourner. La v265 avait poussé « Descendre » vers la
  GAUCHE (`left:40 %`) pour l'écarter des commandes de bord — elle l'a mis
  dedans. Toute commande de véhicule vit désormais dans la colonne de droite,
  et la règle se dit en FRACTIONS de la vue, jamais en pixels : c'est la même
  discipline que « un témoin de mise en page se formule sans la taille de
  l'écran » (v265), appliquée cette fois au code et non au témoin.
- **`vitesseVoiture` ÉTAIT LA VITESSE DEMANDÉE, ET RIEN NE LA RAMENAIT.** Ni la
  boîte de collision ni le crochet d'obstacle ne la touchaient : une voiture
  plaquée contre un mur gardait vingt-quatre blocs par seconde pour toujours —
  le compteur l'affichait, le régime du moteur (v268) le chantait, les roues
  tournaient. Elle se borne au déplacement RÉELLEMENT obtenu, mesuré après les
  sous-pas de collision. **Et `pousse` ne change pas** : relevé AVANT le
  déplacement, il reste la vitesse demandée, parce que c'est lui qu'un piéton
  lit pour s'écarter (v259) — une voiture arrêtée devant quelqu'un veut encore
  passer, et c'est ce qui l'empêche de rester bloquée pour toujours.
- **MAIS ON NE BORNE QUE CE QUI EST BLOQUÉ, PAS CE QUI FROTTE — UNE BORNE QUI
  SE MORD LA QUEUE N'EST PAS UNE BORNE.** Mon premier jet ramenait la vitesse
  au déplacement réel À CHAQUE image, quel qu'il soit. Or la voiture repart de
  CETTE valeur : une qui rase un mur, ou dont le pas est rogné par une bordure,
  tombait à presque rien et y restait. Mesuré à la sonde, accélérateur tenu
  trois secondes au point d'apparition : vitesse demandée montée à 17,9 puis
  **zéro pendant 1,2 seconde** alors que l'enfant appuyait toujours. On ne
  borne donc que le cas de Max — le nez CONTRE quelque chose, où l'on obtient
  un quart au plus de ce qu'on demandait ; entre les deux, la voiture garde sa
  consigne et ralentit d'elle-même. Et c'est une SONDE qui l'a montré, pas le
  raisonnement : le même protocole, avec et sans la borne, rend 4,4 blocs des
  deux côtés — la distance était plafonnée par un obstacle, et sans la mesure
  j'aurais « corrigé » la mauvaise chose.
- *(ANNULÉ en v560 par décision de Max : la voiture tombe dans l'eau, sans
  message — voir « La voiture tombe dans l'eau (v560) ». Le raisonnement
  ci-dessous reste vrai pour la sonde des ponts : un plancher sous les roues
  passe avant l'eau dessous.)*
  **UNE VOITURE N'ENTRE PAS DANS L'EAU, ET C'EST LA QUATRIÈME FAMILLE
  D'OBSTACLE** (`eauDevant`, main.js), jugée chez elle comme les trois autres,
  avec « pas si l'on est déjà dedans » — une voiture tombée au port doit
  pouvoir en sortir. C'est le piège de `sommetColonne` du v267 une famille plus
  bas : elle rend le premier bloc SOLIDE, donc le FOND sous la mer, et rien
  n'arrêtait la voiture. **Mais « de l'eau dans cette colonne » n'est pas « la
  voiture est dans l'eau »** : un pont passe AU-DESSUS du fleuve, et les trois
  tabliers de la Tamise (v208) seraient devenus infranchissables. Ce qu'une
  voiture demande, c'est un PLANCHER sous ses roues — s'il y en a un, on roule,
  quoi qu'il y ait plus bas. Et cette question-là est la PREMIÈRE, ce qui rend
  la famille gratuite : sur une rue, la chaussée est sous les roues, on sort
  sans descendre aucune colonne. Une borne d'altitude aurait été une constante
  de plus à régler pour un coût qui n'existe pas.
- *(Retiré en v560 avec la famille d'eau.)* **ET LE MESSAGE DIT QUOI FAIRE** (« fais demi-tour »), au plus une fois
  toutes les quatre secondes, comptées en temps RÉEL : un bandeau ne doit pas se
  répéter plus souvent parce que la tablette rame (piège de `dt`, v226).

**ET LE PORTAIL A RENDU TROIS ROUGES DE LA MÊME FAMILLE — LA QUATRIÈME FOIS
(v272).** Aucun ne venait du jeu, les trois mesuraient le banc, et les trois se
corrigent de la même manière : **on attend le RÉSULTAT, borné, et le temps qu'il
a pris entre dans le message** (v270).

| témoin | ce qu'il a rendu | ce qu'il attend désormais |
| --- | --- | --- |
| le piéton (`monte.js`) | 5,4 blocs d'avance, zéro traversée, DOUZE relevés d'une voiture de la rue | il recommence, au plus trois fois, quand la circulation est venue |
| la marche arrière (`monte.js`) | « recule −2,2 » sur une physique juste | le recul depuis le point de REBROUSSEMENT — freiner, c'est encore avancer |
| « Descendre » (`monte.js`) | `bouton null` — display à `none` | il attend la boîte, huit secondes au plus |
| le passager (`reseau.js`) | 0,58 bloc en trois secondes, à DEUX pages | il conduit jusqu'à 2,5 blocs, vingt secondes au plus |

Et la leçon neuve, celle du panneau « Descendre » : **`null` n'est pas un
verdict, c'est une absence de mesure.** Il ne distingue pas « le bouton est mal
placé » de « le bouton n'était pas encore affiché » — et c'est le second qui
s'est produit, sur la MÊME page où le joystick prenait le doigt à l'instant
d'avant. Un témoin qui lit une position lit d'abord qu'il y a quelque chose à
lire.

**UN ACCENT GRAVE DANS UN COMMENTAIRE DE CSS A TUÉ LE JEU ENTIER — et le banc
n'a pas su le dire.** Le style de `fun.js` vit dans un littéral de gabarit
(`style.textContent = \`…\``) : le premier accent grave écrit dans un
commentaire À L'INTÉRIEUR le referme, et le module ne se charge plus. `node
--check` passe — le fichier reste syntaxiquement valide, il ne dit simplement
plus la même chose — et le banc ne rend que
« page.waitForFunction: Timeout 90000ms exceeded » : ni la ligne, ni le
fichier, ni même le mot « SyntaxError ». Deux règles.

- **ON N'ÉCRIT PAS D'ACCENT GRAVE DANS UN COMMENTAIRE DE STYLE.** Ces
  commentaires-là parlent du code comme les autres ; ils le citent sans le
  citer (« le canvas ne prend le doigt que si clientX est sous 45 % »).
- **DEVANT UN JEU QUI NE DÉMARRE PLUS, LA SONDE EST UNE PAGE NUE.** `banc.joueur`
  lève son délai AVANT qu'on ait pu accrocher quoi que ce soit : les écouteurs
  `pageerror` et `console` doivent être posés sur une page ouverte à la main,
  avant la navigation. Dix lignes, et le message exact tombe en douze
  secondes — « SyntaxError: Unexpected identifier 'canvas' » nommait la ligne
  fautive à un mot près.

## La manette des gaz, et le volant au joystick (v262)

> **⚠️ En VOITURE, la manette et le compteur ont été retirés en v272**
> — décision de Max sur capture de Hambourg. Lire « Une voiture n'est pas un
> avion » juste au-dessus. Ce qui reste vrai ici vaut pour l'AVION, et le
> repli au joystick décrit plus bas est redevenu le seul chemin de la voiture.

Max : « le joystick à gauche pour la direction et, en multitouch, à droite
un cadran qu'on monte/baisse pour la vitesse ; accélérer et ralentir les
voitures, idem pour les avions » ; « au volant, nettoyer les boutons
inutiles ». **Cette décision remplace celle de la v228 (vitesse automatique
en avion)** : en croisière, c'est le cadran qui fixe la vitesse ; ✈️ garde
ses deux trajets assistés (v261) et y tient lui-même la manette. Quatre
règles.

- **LE CADRAN EST UN POINTEUR À PART, LE JOYSTICK RESTE SUR LE CANVAS.**
  `#gaz-base` (index.html) vit au-dessus du canvas et écoute les événements
  de POINTEUR avec capture ; le joystick écoute les événements TACTILES du
  canvas. Deux doigts, deux cibles, aucun arbitrage à écrire — et le banc
  les simule par `Input.dispatchTouchEvent` à deux points, comme `pincer`.
- **`gaz` NUL, C'EST « PAS ENCORE TOUCHÉ », ET L'ANCIEN GESTE MARCHE.** Tant
  que le cadran n'a pas servi, l'avant du joystick reste l'accélérateur de
  la voiture et l'avion vole à sa pointe : rien de ce qu'un enfant sait ne
  cesse de marcher. Dès le premier toucher la consigne est la sienne, et
  elle RESTE où on l'a laissée — c'est une manette, pas une pédale. Elle
  repart de nul à chaque montée (`fun.js`).
- **UNE VOITURE A DE L'INERTIE ET UN VOLANT.** `vitesseVoiture` prend
  l'allure de la classe en une demi-seconde (`ACCEL_VOITURE`) et la perd plus
  vite encore (`FREIN_VOITURE`) ; le joystick ↔ tourne le cap
  (`BRAQUAGE`, proportionnel à la vitesse jusqu'à trois blocs par seconde — à
  l'arrêt un volant ne fait rien), plus jamais un pas de côté. `pousse`, ce
  que lisent les piétons (v259), reste la vitesse demandée avant obstacle.
- **SOUS LE DÉCROCHAGE, L'AVION DESCEND — c'est l'atterrissage manuel.** En
  `vol`, gaz réduits, la vitesse tombe sous `decrochage` et l'appareil perd
  de la hauteur d'autant plus vite qu'il est lent ; toucher en `vol` mène au
  `freinage` comme en `atterrissage`. Le train, en vol, obéit au bouton 🛞
  (`trainVoulu`, rentré par défaut) ; sur le ventre (`trainSorti < 0,5`) le
  freinage double et le jeu le dit. Les deux trajets assistés forcent le
  train comme en v261.

**Et les boutons de la marche s'effacent en véhicule par une classe du
`body`** (`en-vehicule`, `en-avion` — `majBoutonsVehicule`, main.js, à
chaque image, ne touche au DOM que si l'état change) : saut, pioche,
capture, coffre, barre de blocs, et ✈️ en voiture. Un témoin lit
`getComputedStyle(...).display`, en véhicule et à pied.

## La file du mailleur, le plateau de vitesse, et les commandes de bord (v265)

> **⚠️ La file est revenue à HUIT en v269** : seize rendait le jeu
> impraticable sur l'iPad, et le « genou » ci-dessous avait été mesuré par
> SATURATION, pas en régime établi. Lire « La file du mailleur : SEIZE A
> RENDU LE JEU IMPRATICABLE » plus bas avant de croire les chiffres de cette
> section. Ce qui reste vrai ici : la méthode (on choisit sur DEUX chiffres),
> et le non-résultat des deux mailleurs.

Max, capture d'iPhone du chasseur de nuit : « Jet should fly faster, button
pour les roues mal placé, pas élégant ». Trois règles, et la première
rembourse une dette que la v229 avait écrite elle-même.

- **UNE FILE D'AVANCE EST UN TEMPS, PAS UN COMPTE — et c'est le piège de
  `dt` à un troisième étage.** Le mailleur du worker (v251) recevait HUIT
  morceaux d'avance, réapprovisionnés une fois par IMAGE. À Paris un morceau
  coûte 24 ms : huit occupent le worker 192 ms, la file tient jusqu'à l'image
  suivante. En campagne un morceau coûte 6,6 ms : huit ne font que 53 ms, et
  sur une tablette à cinq images par seconde le worker passe les quatre
  cinquièmes de son temps À SEC — au moment précis où l'enfant arrive quelque
  part. C'est le budget par image de la v237, déplacé d'un cran. Mesuré par
  saturation (une téléportation met tout le disque à mailler d'un coup), débit
  de POINTE en morceaux par seconde à rr=12 : file de 8 → 57 campagne / 41
  Paris ; 24 → 147 / 76 ; **48 → 200 / 99** ; 64 → 209 / 105 ; 200 → 188 /
  123. Quarante-huit prend quatre-vingt-quinze pour cent du gain et garde la
  file fraîche ; au-delà on maille des morceaux que l'enfant a déjà dépassés.
  `?attente=` la force, pour remesurer.
- **ET DEUX MAILLEURS N'AJOUTENT RIEN : un non-résultat MESURÉ, on ne le
  réessaie pas.** Avec la file à quarante-huit : un mailleur 200/99 à 11,6/4,9
  images par seconde ; deux 206/125 mais 10,5/3,8 images ; trois 198/100 à
  8,6/3,4. Passé la file, le goulot n'est plus le mailleur — c'est le fil
  principal, qui doit INSTALLER les géométries. Un mailleur de plus ne fait
  que lui en envoyer plus, en payant un monde jumeau de mémoire et la
  génération des morceaux de bord deux fois. Le pool a été écrit, mesuré,
  puis RETIRÉ ; ce paragraphe est là pour qu'on ne le réécrive pas.
- **ET UNE FILE SE CHOISIT SUR DEUX CHIFFRES : LE DÉBIT ET LA CADENCE.** Mon
  premier jet la posait à quarante-huit sur le seul débit. Le portail complet
  a rendu SEPT suites rouges dont QUATRE étaient vertes la veille, et tous
  les symptômes étaient de cadence : « programmes 8/25 après 48 s » dans
  `maj.js` (la chauffe compile un programme par image), « 0 m en 31 s de
  jeu » au métro, « 0 relevé sur 92 » aux virages, « cadence 1,7 » à
  l'arrivée sur Paris. Le mailleur rendait deux fois plus de morceaux et le
  fil principal devait les INSTALLER. Mesuré, débit de pointe · images par
  seconde, à rr=12 : file 8 → 60·11,4 campagne, 53·6,2 Paris ; 16 →
  117·12,1 et 75·5,3 ; 24 → 132·10,1 et 104·4,0 ; 48 → 215·10,5 et
  103·3,9. **Seize est le genou** — le débit double, la cadence ne bouge pas
  — et c'est mot pour mot le genou que la v229 avait mesuré sur
  `MESH_BUDGET_MS`. **Un portail rouge en cascade n'est pas un accident de
  banc : c'est une mesure qu'on n'a pas faite.**
- **LA DETTE DE LA v229 SE REMBOURSE COMME ELLE L'AVAIT ANNONCÉ.** Elle
  écrivait : « le seul moyen de reprendre le rapport est de MAILLER PLUS
  VITE, pas de réécrire ce commentaire. » On remesure donc au MÊME critère —
  le trou devant soi, médiane sur six relevés, rr=12, campagne ET couloir de
  villes : file de huit, 110
  → 91 · 82 et 160 → 51 · 58 ; file de seize, 110 → 165 · 165, **160 → 125 ·
  122**, 190 → 107 · 107, 240 → 72 · 72. Le plateau est à CENT SOIXANTE, et
  c'est la barre de la v229 elle-même qui le dit : elle acceptait 125-138 de
  trou et rejetait 51-86. Avion de ligne 95 → 120, Concorde et chasseur
  110 → 160 ; le rapport remonte de 1,16 à 1,33, le réel (2,4) reste une
  dette. Décollage, approche et freinage ne changent pas — la fiche ne
  touche que `max`.
- **UNE VITESSE D'ESSAI SE MET DANS LA FICHE, JAMAIS DANS LA VARIABLE DU
  MOMENT.** Ma première sonde posait `player.vitesseAvion = v` ; en état
  `vol`, `player.js` vise `p.max` et l'avion y retombait en une seconde.
  Parcouru 495 blocs à 110 et 506 à 300 — le même vol quatre fois, et j'ai
  failli conclure que la vitesse ne changeait rien. C'est la sœur de « une
  sonde de déplacement vérifie d'abord qu'elle s'est déplacée » : on vérifie
  que la CONSIGNE a été prise avant de lire l'effet.
- **UN ÉCRAN DE COMMANDES SE MESURE, ET IL SE JUGE EN CAPTURE.** Relevé sur
  un iPhone de 430 × 932, aux commandes : ✈️ et 🛞 flottaient à 340 px du bas,
  en plein ciel, VINGT pixels au-dessus de la manette et dans DEUX colonnes
  (x 346 et x 270) ; le compteur « 684 km/h » vivait DANS la manette, replié
  sur deux lignes de onze pixels sous le curseur blanc. Deux colonnes
  jumelles dans le coin bas-droit règlent les deux : la manette à l'extrême
  droite, à sa gauche ✈️, 🛞 et la vitesse. **Le fond de la colonne
  (`#cmd-vol`) n'est JAMAIS le parent des boutons ni de la manette** : la
  manette lit `getBoundingClientRect` et capture son pointeur, on ne met rien
  entre elle et le doigt.
- **CHAQUE BOUTON PORTE SON MOT, ET LE MOT DIT L'ÉTAT.** Un pictogramme de
  roue ne se devine pas à sept ans, et ✈️ ne dit pas s'il décolle ou s'il
  pose : DÉCOLLER / SE POSER, train SORTI / RENTRÉ, écrits seulement quand le
  mot change — une réécriture par image coûte un reflow (leçon du cadran de
  cap, v263).
- **UN TÉMOIN DE MISE EN PAGE SE FORMULE SANS LA TAILLE DE L'ÉCRAN.** Mon
  première formulation exigeait les boutons « dans le tiers du bas » : juste
  sur l'iPhone de Max (932 de haut), FAUSSE sur le 420 × 760 du banc, où la
  colonne occupe une plus grande part de la hauteur — le code NEUF y serait
  rouge, 460 contre une barre à 507. Le calcul l'a écartée avant le banc,
  parce que le relevé des deux tailles était sous les yeux. Ce qui se dit
  sans dimension, c'est « aucune commande ne dépasse le HAUT de la
  manette » et « les deux boutons ont le même x ». C'est la formulation
  exacte de « rien ne flotte ».

## La file du mailleur : SEIZE A RENDU LE JEU IMPRATICABLE (v269)

Max, iPad, sur la version publiée : « le lag est absolument énorme, alors
qu'avant il était pas mal réduit. C'est quasiment impraticable. En avion,
l'image bouge une seconde, elle s'arrête cinq. À pied, ouvrir la carte fige
dix secondes. » Quatre règles, et les trois premières sont des mesures.

- **UN GENOU DE DÉBIT N'EST PAS UN GENOU DE CONFORT.** La v265 avait mesuré
  la file par SATURATION (une téléportation met tout le disque à mailler) et
  lu « seize : le débit de pointe double, la cadence ne bouge pas » (6,2 →
  5,3 à Paris). Remesuré EN VOL au-dessus de Paris, à la distance
  d'affichage de l'iPad, vingt secondes, sur les DEUX critères :

  | file | cadence | médiane | pire image | > 300 ms | trou devant |
  | --- | --- | --- | --- | --- | --- |
  | 4 | 20,1 | 50 ms | 317 | 1,3 % | 36 |
  | **8** | **18,3** | **50 ms** | **150** | **0 %** | 66 |
  | 12 | 15,0 | 67 ms | 183 | 0 % | 93 |
  | 16 | 9,1 | 100 ms | 383 | 3,1 % | 132 |

  Le coût est d'un facteur DEUX, pas de quinze pour cent. La file de seize
  est la seule à produire des images de plus de trois cents millisecondes —
  les gels de Max — et comme `dt` est borné à un vingtième, elle fait tourner
  le jeu AU RALENTI : à vitesse demandée identique, l'avion parcourt 1 757
  blocs au lieu de 3 303. **Une mesure de saturation ne dit rien du régime
  établi**, et c'est le régime établi que l'enfant vit.
- **BORNER LA POSE PAR IMAGE EST UN NON-RÉSULTAT MESURÉ.** C'était la dette
  que la v265 avait elle-même déclarée (« le vrai remède : BORNER
  l'installation des géométries sur le fil principal comme le maillage l'est
  déjà »). Écrit, mesuré, RETIRÉ : 10,63 images par seconde contre 10,20
  sans, 17,45 contre 17,07 à file de huit. Du bruit. La raison est
  arithmétique et se retient : **borner le travail PAR IMAGE ne réduit pas
  le travail PAR SECONDE**, puisque le worker continue de produire. Ce qui
  fixe le débit, c'est la profondeur de la file, et rien d'autre.
- **ET « UNE FILE EST UN TEMPS, PAS UN COMPTE » NE MARCHE PAS NON PLUS —
  MESURÉ.** C'était le titre de la v265, codé à l'envers ; on l'a codé à
  l'endroit (le worker rapporte ce que chaque morceau lui coûte, la
  profondeur suit). Le coût NE SÉPARE PAS la ville de la campagne en vol :
  4,4 à 12,2 ms à Paris, 3,4 à 8,3 en campagne. Le rapport 24 contre 6,6 de
  la v237 avait été mesuré par SATURATION, pas en vol — même piège que
  ci-dessus, un étage plus bas. La file partait donc à son plafond partout :
  6,0 images par seconde à Paris, 9,9 % du temps au-delà de trois cents
  millisecondes, PIRE que seize. Écrit, mesuré, retiré.
- **ET UNE VITESSE MESURÉE SUR UNE FILE NE VAUT QUE POUR CETTE FILE.** La
  v265 avait monté les jets de 110 à 160 blocs par seconde PARCE QUE la file
  de seize le permettait ; la file revenue à huit, 160 ne tient plus, et
  l'enfant vole dans le vide. C'est le témoin du trou de `monte.js` qui l'a
  dit, et sans lui la livraison serait partie ainsi. Remesuré au même
  critère, file de huit : 95 → 115 · 110 → 112 · 120 → 93 · 130 → 80 ·
  145 → 80 · 160 → 64, pour une barre d'une demi-seconde de vol (v/2). **Le
  genou est entre 120 et 130, et c'est la CHARGE qui tranche** : ces chiffres
  sont mesurés seuls, et le portail complet coûte quinze pour cent du trou
  (il a rendu 80 à 120 et 51-58 à 160). À 130 il ne resterait que trois blocs
  de marge et le témoin battrait ; à 120 il en reste vingt. On retient 95 et
  120 — toujours au-dessus des 110 de la v229 — et **`kmh` ne bouge pas** :
  le compteur affiche toujours Mach 1,8, ce que la v267 a construit
  exactement pour ce cas.
- **ET UNE BARRE DE TÉMOIN QUI SUIT UNE GRANDEUR SE CALCULE, ELLE NE S'ÉCRIT
  PAS.** Celle du trou valait QUATRE-VINGTS depuis la v229, pendant que la
  vitesse du plus rapide passait de 110 à 160 : elle n'était juste par
  accident qu'en v265 (160 ÷ 2 = 80), et elle aurait cessé de l'être à la
  vitesse suivante sans que personne ne le voie. Elle vaut désormais
  `max / 2` par appareil, lu dans la fiche — la règle, pas le chiffre.
- **LE PRIX SE DÉCLARE, IL NE SE CACHE PAS.** À vitesse INCHANGÉE le trou
  devant soi tombait de 132 à 66 blocs — les bâtiments se dessinent plus
  tard, la panne même que la v251 avait corrigée. Entre « les détails
  arrivent en retard » et « le jeu s'arrête cinq secondes », c'est Max qui
  tranche, et il a tranché. La vitesse ayant suivi (120 au lieu de 160), le
  trou revient à 93 seul et 80 sous charge de portail : ce que la livraison
  coûte vraiment, c'est vingt-cinq pour cent de vitesse de pointe, pas un
  monde en retard. Ce qui reste à faire est déclaré dans `TASKS.md` : mesurer
  sur la TABLETTE (`?attente=`, `?diag=1`), là où le rapport entre maillage,
  installation et rendu n'est pas celui d'un rendu logiciel.

**ET LA MARCHE ARRIÈRE N'EXISTAIT PAS (v269).** Max : « aussi impossible de
faire marche arrière avec un avion ou une voiture. » Deux causes distinctes.
L'avion ignorait purement le geste — `Math.max(0, forward)` écrase tout
négatif, donc tirer le joystick en arrière au sol ne faisait rien, et un
appareil nez contre un hangar y restait pour toujours. La voiture exigeait
TROIS conditions simultanées, dont ramener le cadran des gaz sous cinq pour
cent : or il RESTE où on l'a laissé (v262, et c'est la bonne décision pour
une manette), donc il fallait un second doigt. **Le geste prime désormais
sur la consigne**, comme une pédale de frein annule un régulateur : on
freine d'abord, puis on recule, **et le cadran suit le geste** (`gaz = 0`) —
sinon il afficherait pleins gaz pendant qu'on recule et le véhicule
bondirait en avant au relâchement. Le virage de la roue avant de l'avion
prend enfin `Math.abs(v)` pour l'amplitude et le signe pour le sens, comme
la voiture le fait depuis la v212 : sans cela il s'inversait ET s'amplifiait
en reculant.

**Et le témoin a d'abord accusé une physique juste.** Quatre secondes après
avoir tiré le joystick depuis pleins gaz : 1,28 bloc reculé, sous la barre.
Ces quatre secondes étaient presque entièrement du FREINAGE. On sépare donc
les deux phases — on attend que la vitesse passe à zéro, PUIS on mesure — et
l'attente qui expire est elle-même le rouge de l'ancien code (huit secondes,
la voiture ne s'arrête jamais). « La mesure était trop courte, pas la
physique » (v229), une fois de plus.

## Le son du jeu (`sons.js`, v268) — un seul contexte, et rien de téléchargé

Max : « les véhicules, on devrait avoir un bruit ambiant ; quand on rentre
dans une voiture, un bruit de radio, un peu comme dans GTA. » Cinq règles.

- **UN SEUL CONTEXTE AUDIO POUR TOUT LE JEU, ET C'EST `sons.js` QUI LE
  POSSÈDE.** `main.js` avait le sien pour le carillon du chat et les bruits
  de blocs ; en créer un second aurait eu deux prix, et le premier n'est pas
  la performance : **un réglage « couper le son » n'aurait éteint que la
  moitié du jeu** — le moteur se tait, le marteau continue. Le second est
  qu'iOS compte les contextes audio. C'est la leçon des deux contextes WebGL
  de la v245, à un fichier près. `carillon` et `bruitBloc` sont devenus des
  clients de `contexteAudio()` / `sortieAudio()`.
- **TOUT EST SYNTHÉTISÉ, RIEN N'EST TÉLÉCHARGÉ.** Le jeu entier pèse 1,12 Mo
  compressé (v245) ; une seule boucle de moteur en MP3 pèse davantage. Un
  moteur est un souffle filtré plus deux dents de scie dont la fréquence suit
  le régime ; un réacteur, l'inverse — presque tout est souffle, plus un
  sifflement de compresseur. Les trois stations de radio sont écrites ici, en
  degrés de gamme : invariant 4, aucune propriété intellectuelle.
- **RIEN NE SE CRÉE PAR IMAGE.** Le graphe du moteur se monte à la montée et
  se démonte à la descente ; le régime se règle par `setTargetAtTime`, dont
  l'interpolation vit dans le fil audio. L'ordonnanceur de la radio programme
  un quart de seconde d'avance toutes les cent millisecondes, **contre
  l'horloge du CONTEXTE** et jamais contre `dt` : le son n'a pas à ralentir
  quand la tablette rame (piège de la v226, et ici il s'entendrait).
- **COUPER LE SON SUSPEND LE CONTEXTE, IL NE FERME PAS QUE LE ROBINET.** Mon
  premier jet ne baissait que le gain général : mesuré, avec `?son=0`,
  `etat()` annonçait encore « moteur voiture, radio Nuit Cubique » — tous les
  oscillateurs vivants pour un silence. Un enfant qui coupe le son parce que
  sa tablette rame doit y gagner quelque chose. On ne DÉTRUIT pas le graphe
  pour autant : rallumer en roulant doit s'entendre tout de suite.
- **LE SILENCE SE REND EN DESCENDANT**, comme la marche, le vol et le
  gabarit — quatre chemins de sortie (`toggleRide`, monture disparue,
  `debarquer`, remise à zéro), et la monture quittée n'est plus mise à jour :
  elle garderait son dernier régime pour toujours. C'est le piège des flammes
  de la v264, mot pour mot. Et **la poussée se calcule UNE fois** dans
  `updateRide` : les flammes et le bruit la lisent, parce que deux formules
  qui décrivent la même manette finissent par diverger.
- **CE QUI A UN MOTEUR SE DIT DANS LA FICHE** (`moteur: 'voiture' | 'avion'`,
  `radio: true`), jamais dans une liste de `fun.js` — même discipline que
  `montable`, `vole`, `gabarit` et `habitacle`. Un cheval n'a pas de moteur,
  et cela s'écrit en ne l'écrivant pas. Le plafond de vitesse d'une voiture,
  lui, se demande à `player.js` (`vitesseVoitureMax`, publié là où il se
  calcule) : la classe du modèle le fixe (v260), et le recopier le rendrait
  faux à la première classe qu'on ajoute, sans que rien ne rougisse.

**UN TÉMOIN DE SON LIT DES ÉCHANTILLONS, JAMAIS UN DRAPEAU.** `etatSon()`
dirait « radio : Nuit Cubique » même si plus un seul oscillateur n'était
branché — c'est exactement la mort de `__lumiere()`, deux fois (v247, v251),
pour avoir publié un mécanisme au lieu de ce qui se voit. `window.__sons`
publie donc la SORTIE, et le témoin y accroche son propre `AnalyserNode` :
zéro à pied, 0,024 au ralenti au volant, 0,051 à pleins gaz, zéro à la
descente. On prend **le pire d'une fenêtre**, pas un instantané — la radio a
des silences entre deux notes (leçon des poissons).

**ET L'HORLOGE AUDIO DU BANC SE MESURE AVANT D'ÉCRIRE LE TÉMOIN.** Chromium
y tourne sans périphérique de son : si `currentTime` restait figé,
l'ordonnanceur ne programmerait rien et le témoin mesurerait le banc. Sonde
d'abord : contexte `running`, 1,25 s d'avance en 1,2 s de vraie vie, et un
analyseur qui rend 0,212 pour une sinusoïde d'amplitude 0,3 — soit 0,3/√2 au
millième près.

**ET UNE MESURE DE COÛT REFERME SES PAGES.** Ma première sonde du prix du son
gardait ses quatre pages ouvertes en même temps et rendait 7,3 · 3,5 · 2,6 ·
2,1 images par seconde : une décroissance monotone qui suivait le NOMBRE de
pages, pas le traitement. Refermées, et l'ordre alterné (off, on, on, off) :
7,78 · 7,71 · 8,00 · 7,24, médiane à 200 ms des quatre côtés — le son ne
coûte rien de mesurable. La leçon de la v220 (« deux pages ouvertes EN MÊME
TEMPS font tomber la cadence de 42,9 à 20,8 ») vaut pour les sondes autant
que pour les suites, et **l'ordre alterné est ce qui sépare le traitement de
la place dans la série**.

## Les flammes des réacteurs (v264)

Max, capture du chasseur : « voir les flammes sortir du réacteur quand
l'avion se déplace ». Trois règles.

- **LA TUYÈRE SE DÉCLARE LÀ OÙ LE RÉACTEUR SE DESSINE.** `reacteur()` et la
  tuyère du chasseur appellent `tuyere(a, …)` (avions.js) avec le point
  d'échappement et le rayon de sortie ; `fini` y accroche une flamme par
  tuyère et publie `userData.tuyeres`. Jamais une liste à part : c'est la
  discipline de `postesAvion` et du plan du tarmac — deux tables qui
  décrivent la même chose finissent par diverger.
- **ÉMISSIF SEULEMENT, AUCUNE LAMPE.** Deux cônes `MeshBasicMaterial`
  additifs, `toneMapped: false`, `depthWrite: false`. Une lumière ponctuelle
  de plus changerait la clé de TOUS les programmes de shaders (quatre lampes
  pour tout le jeu, v248) : le gel de la v246 par la petite porte.
- **LA FLAMME SUIT LA MANETTE, PAS LA VITESSE.** `player.gaz` quand il est
  touché, la vitesse rapportée à la pointe sinon ; éteinte sous deux pour
  cent de gaz à l'arrêt, et éteinte à la descente par `fun.js` — la monture
  quittée n'est plus mise à jour, elle garderait sa dernière flamme.

## Le cadran de cap : la ville visée au loin (v263)

Max : « un cadran de pilote en avion : la ville visée au loin ». Aux
commandes seulement, un badge en haut : cap en degrés, la ville la plus
proche dans le cône de ±45° devant l'appareil et sa distance, un repère qui
glisse. Trois règles.

- **LE CALCUL EST PUR ET LIT LE REGISTRE** (`src/cap.js`, sans three ni
  document) : `lieuxDuMonde()` porte les villes bâties ET les deux cents
  engendrées, et l'échelle se demande à la projection (`kmParBloc`), jamais
  ne se recopie. Depuis Paris cap sur Lyon, 389 km pour 392 réels — c'est
  la mesure sous node qui le dit, avant le banc.
- **LA CONVENTION DE CAP EST CELLE DU JOUEUR, ET LE SIGNE SE REGARDE.**
  `player.js` avance en (−sin yaw, −cos yaw), le nord de la carte est −z :
  le cap vaut (−yaw) en degrés. Une règle qui glisserait à l'envers passerait
  toute mesure d'amplitude ; le témoin exige que yaw = −π/2 affiche
  « 090° E » et qu'un quart de tour à droite fasse passer 152° à 062°.
- **LA PLUS PROCHE, PAS LA MIEUX ALIGNÉE.** Dans le cône, on nomme la ville
  la plus proche : à un enfant, une ville à dix kilomètres à vingt degrés
  vaut plus qu'une capitale à mille kilomètres pile devant. Sans ville
  devant, la plus proche tout court, avec la flèche du côté où tourner.

- **ET IL NE PAPILLONNE PAS.** Lyon et Genève à cent kilomètres l'une
  comme l'autre, mesuré en sonde : sans mémoire, le cadran les relaierait à
  chaque image. La ville déjà nommée est gardée tant qu'elle reste dans le
  cône et à moins de quinze pour cent de plus que la plus proche
  (`TOLERANCE`). L'état est PASSÉ à la fonction, qui reste pure.

Et le DOM ne s'écrit que quand le texte change : deux cent soixante
distances par image ne coûtent rien, une réécriture par image coûte un
reflow.

## Un avion décolle de sa piste, et il s'y pose (v261)

Max : « une vraie motion de décollage-atterrissage, accélération sur la
piste puis décollage en levant le nez ; idem à l'atterrissage, baisser
l'altitude et ouvrir le train ; et le roulage sur la piste. » Le mode
`pilote` (player.js) a désormais CINQ ÉTATS — `sol`, `decollage`, `vol`,
`atterrissage`, `freinage` — et le seul bouton ✈️ fait tout le trajet, le
joystick gardant les commandes de la v228. Cinq règles.

- **LE CARACTÈRE D'UN APPAREIL EST DANS SA FICHE, LA MÉCANIQUE EST COMMUNE.**
  `rotation` (la vitesse où le nez se lève), `approche`, `roulage`, `frein`
  rejoignent `max`, `poussee`, `decrochage`, `virage` dans `pilote`
  (montures.js). Le roulement avant la rotation VAUT `rotation² / (2 ×
  poussée)` — 49, 57 et 13 blocs — et le freinage `approche² / (2 × frein)` :
  ces chiffres se recalculent, ils ne se recopient pas. Ce qui est commun
  vit en constantes de `player.js` (l'appui au sol, la roue avant,
  l'assiette de rotation, l'arrondi, le train en une seconde et demie).
- **L'APPAREIL PIVOTE SUR SON TRAIN PRINCIPAL, PAS SUR SON ORIGINE.** Le
  modèle a son origine au sol sous le milieu du fuselage ; un nez qui se
  lève autour d'elle enfonce la queue dans la piste. `fun.js` déplace le
  maillage de `zg·sin θ` en hauteur (et `zg·(1 − cos θ)` vers l'avant, dans
  le repère du cap) pour que les roues arrière restent où elles sont ; `zg`
  vient du modèle (`userData.trainPrincipal`, avions.js). L'assiette se
  compose en x, après le roulis (z) et avant le cap (y) : l'ordre `YXZ` de
  la v231 était déjà celui d'un avion.
- **UN SIGNE SE MESURE SUR CE QUI EST RENDU.** Un angle positif en x lève un
  nez qui regarde en −z — c'est vrai sur le papier, et le témoin le lit
  quand même dans la MATRICE MONDE du maillage : la hauteur du nez contre
  celle de la queue, 2,7 blocs à la rotation. Un nez levé à l'envers
  passerait toute mesure d'amplitude (leçons du roulis, v231, et du
  conducteur assis de dos, v249).
- **CHAQUE JAMBE DU TRAIN EST UN MEMBRE DE L'ATELIER**, pivot au sommet de
  la jambe sur le ventre (`train(a, …, nom)`, avions.js) : fusionnée dans le
  tronc elle ne pourrait pas bouger. Elle se replie vers la queue autour de
  son pivot et disparaît une fois rentrée ; trois maillages de plus par
  appareil, qu'on ne paie qu'à moins de soixante-deux blocs. Le témoin de
  `carteMonde.js` qui lit les sommets bruts n'y voit rien : les jambes sont
  près de l'axe et l'aile reste la pièce la plus large.
- **UN AVION QUI NE PEUT PLUS ROULER NE PEUT PLUS DÉCOLLER.** Bloqué par une
  marche d'UN bloc en roulant — un bord de dalle, une bordure —, il la
  franchit (`franchirUneMarche`) ; deux blocs, c'est un mur. Sans cela un
  enfant posé dans un champ restait planté là, la seule issue étant de
  descendre à pied.

**Et les témoins qui posent `player.pilote` à la main déclarent leur
état.** `avionEtat` est déduit d'`avionEnVol` quand il manque, mais un état
laissé par un témoin précédent (`vol`) faisait prendre le ✈️ suivant pour
un atterrissage : tout témoin qui met ou retire le mode pilote sans passer
par `fun.js` remet `avionEtat` (`undefined`, ou `'vol'` avec `avionEnVol`).
Le trajet lui-même s'éprouve sur une piste de pierre de trois cents blocs
posée au-dessus du relief (le relief naturel n'est jamais plat sur cette
longueur), PAR LE BOUTON, un relevé tous les dixièmes de seconde — et une
sonde de captures (`sonde-captures-avion.cjs`) rend une vue de côté par une
caméra à part, `layers.enableAll()` comme le veut la v250.

## Chaque voiture roule à l'allure de sa classe (v260)

> **⚠️ Le plafond calculé ci-dessous (28 blocs/s) est remplacé par un plafond
> MESURÉ (60) en v358, et l'allure se déduit des fiches de `conduite.js`.** Lire
> « La conduite à la GTA (v358) ».

Max : « une vitesse en fonction du modèle ». Deux règles.

- **LA CLASSE VIT DANS LE MANIFESTE DE LA FLOTTE** (`classe` sur chaque entrée
  de `FLOTTE`, vehicules.js), l'allure dans `ALLURES` par classe, et
  `allureDe(fichier)` les lit ; `fun.js` (`allureMonture`) l'applique à la
  monte et à chaque image, la fiche `voiture` de montures.js ne servant que
  de secours. Même discipline que `montable`, `gabarit`, `habitacle` : une
  propriété d'un modèle vit à côté du modèle, jamais dans une liste ailleurs.
- **LE PLAFOND EST CELUI DU MONDE QUI SE CHARGE, ET IL SE CALCULE, PAS
  ENCORE NE SE MESURE.** 42 morceaux par seconde à Paris (v237), 1,5 × v
  réclamés (v229) : 28 blocs/s en ville, l'hypercar à 25,6. Le banc ne peut
  pas le mesurer en voiture : à `rr=12` dans Paris il rend UNE image par
  seconde, et une sonde qui fait avancer la position à 11 comme à 40 blocs/s
  parcourt 72 à 85 blocs dans les deux cas — le chargement y est cadencé par
  l'image. Une première sonde n'avait pas bougé du tout (posée dans un
  immeuble) : `parcouru` est le premier champ à lire, encore. La mesure
  vraie se fait sur la tablette avec `?diag=1`, dette déclarée.

## Un piéton regarde devant lui, et une voiture n'est pas un bloc (v259)

Max, capture à la Bastille : « les passants traversent la voiture de
l'enfant ». Un piéton (`BaseNPC.sweep`, marlon.js) ne connaît que les blocs
solides ; une voiture n'en est pas un — ni celle de la rue, ni celle de
l'enfant au volant, ni une voiture garée. Trois règles.

- **UN OBSTACLE QUI N'EST PAS UN BLOC SE REGARDE UN PAS DEVANT.** `update`
  demande `world.obstaclePieton(x, z, y)` (branché par `main.js`) au point
  qu'il s'apprête à atteindre ; si c'est une voiture, il ne fait pas ce pas
  et `contourner()` le fait repartir de biais — le geste du bord de rue de
  Manhattan, un peu plus haut dans `Habitant.think`. Le crochet lit ce que
  `cederLePassage` a collecté à la dernière image (`vehicules.voitureA`, la
  voiture de l'enfant comprise quand `player.gabarit > 1`) et les bêtes dont
  la fiche porte un `gabarit`. L'enfant à pied n'est pas une voiture.
- **DEVANT UNE VOITURE QUI ARRIVE, ON S'ÉCARTE ; ET LA VOITURE DE L'ENFANT
  FREINE.** Max, capture à New York : « pas un mode violent comme GTA où ils
  sont écrasés ». Le regard-devant ne règle que la voiture à l'arrêt ; en
  roulant, c'est elle qui va sur les gens. `world.vehiculeApproche(x, z, y)`
  (main.js) dit si le point est dans le COULOIR d'une voiture en marche —
  celles de la rue (`vehicules.enMarche`, vitesse du moment) et celle de
  l'enfant, lue sur ce qu'il DEMANDE (`player.pousse`, avant tout obstacle)
  et non sur ce qu'il obtient : arrêtée devant un piéton, elle veut encore
  passer, et c'est ce qui fait que le piéton s'écarte au lieu de la bloquer
  pour toujours. Le piéton (`BaseNPC.update`, état `ecart`) presse le pas de
  côté, du côté où il est déjà, jusqu'à sortir du couloir avec de la marge
  (1,0 bloc pour entrer dans l'état, 1,8 pour en sortir — sinon il s'arrête
  au bord même), deux secondes au plus (contre un mur, on ne piétine pas, et
  on ne saute pas), puis `repos` 0,8 s. Et `pietonDevant` est la TROISIÈME
  famille de `player.obstacleVehicule`, jugée chez elle comme les deux
  autres. Mesuré à la sonde : la voiture s'arrête deux secondes, le piéton
  sort à 1,5 bloc de côté, elle repart — seize blocs en douze secondes.
- **CE QU'UN PIÉTON DEMANDE À CHAQUE IMAGE NE SE FABRIQUE PAS À CHAQUE
  APPEL.** Mon premier `vehiculeApproche` refaisait la liste des voitures en
  marche à chaque appel — cent quarante piétons à Manhattan, deux appels
  chacun, des centaines de voitures à portée. `vehicules.enMarche()` fige sa
  liste jusqu'à la collecte suivante de `cederLePassage`, en lecture seule
  (jamais copiée ni complétée : la voiture de l'enfant se regarde à part),
  avec une borne de distance avant tout calcul. Et **Manhattan tourne à 0,4
  image par seconde sur ce banc, sur l'ancien code comme sur le neuf** —
  mesuré à la sonde, mêmes compteurs des deux côtés, zéro erreur de page :
  quatre témoins de `manhattan.js` qui lisent un effet « 350 ms après » ou
  « huit blocs en quinze secondes » y sont un pile ou face, et le taxi qui
  « ne roule pas » roulait à 10,9 blocs par seconde, personne devant, 0,55
  bloc par image. Devant trois suites rouges d'un coup, la première sonde
  est « la boucle vit-elle ? » (compteur d'images, erreurs de page), la
  seconde « l'ancien code fait-il pareil ? ».
- **MARLON NE SE REPLACE PAS DANS LE NEZ DE LA VOITURE.** Il se rappelle à
  2,5 blocs sous un angle au hasard dès que l'enfant s'éloigne de 26 blocs —
  toutes les deux secondes et demie en voiture, une fois sur huit devant le
  capot, et la voiture freine désormais devant lui. Au volant, il se replace
  derrière ou à côté, à quatre blocs, et n'approche pas à moins de cinq.
- **UN TÉMOIN DE CONDUITE PART D'UNE RUE SANS VOITURE DE LA RUE À PORTÉE,
  ENCORE.** Mes trois premiers tours rendaient 0,4 bloc d'avance avec zéro
  traversée : une voiture de la circulation arrivait en face, cédait devant
  l'enfant sans limite (v245), et les deux se regardaient. C'est la leçon de
  la v252 mot pour mot ; `placeProche` à quatorze blocs, au départ et
  quatorze blocs plus loin.
- **« PAS SI L'ON EST DÉJÀ DEDANS », UNE FOIS DE PLUS.** Une voiture qui a
  roulé sur un passant le laisse sortir : on ne bloque que l'ENTRÉE. Et une
  place tirée pour un passant n'est retenue que si elle est libre
  (`posteAutour`) — un passant né dans la voiture y serait, quoi que fasse
  ensuite son regard.
- **UN TÉMOIN QUI LANCE DES GENS LES LANCE DEPUIS LA RUE, ET « DEDANS » A
  UNE HAUTEUR.** Mon premier témoin tirait ses départs sur un cercle sans
  regarder le sol : un point tombé dans un immeuble posait le passant SUR LE
  TOIT (`surfaceY` prend le plus haut solide), d'où il retombait dans la
  voiture — et un rectangle sans y comptait « dedans » un passant à seize
  blocs au-dessus de la rue. Soixante-dix relevés sur cent sur du code SAIN,
  zéro au tour suivant : un rouge qui va et vient sur le même code accuse le
  témoin, et c'est une sonde qui distingue les cas (hauteurs relevées, crochet
  vrai ou faux au moment du « dedans ») qui l'a dit en une exécution.

## Le jeu se prépare avant « Jouer », et une carte se calcule par tranches (v258)

Max : « quand on ouvre la carte, beaucoup de lag au début » ; « le temps de
télécharger tous les fichiers nécessaires avant de permettre de démarrer le
jeu ». Mesuré AVANT une ligne (bridé ×4) : minicarte 690 ms au premier fond
puis 90 à 240 ms toutes les deux secondes, carte du monde 1 637 ms. Et
un profil qui a failli accuser le mauvais coupable. Cinq règles.

- **CE QUI LAGUE AU DÉBUT N'EST PAS UN FICHIER, C'EST UN PREMIER USAGE.** Le
  service worker a tous les fichiers ; ce qui coûte, c'est ce qui se calcule
  la première fois — corps, programmes, monde autour de l'enfant, fonds de
  carte. « Télécharger avant de jouer » se traduit donc par PRÉPARER avant
  de jouer : la position locale se restaure à l'accueil (le monde se charge
  là où il jouera, pas au point d'apparition), les deux cartes préparent leur
  fond, et « Jouer » reste grisé jusqu'à ce que tout soit là — borné à
  quarante-cinq secondes. La fenêtre de quarante secondes pendant laquelle le
  nuage peut remettre l'enfant à sa place se compte depuis le clic
  (`posEntree`), pas depuis la restauration.
- **UN FOND SE CALCULE PAR TRANCHES, ET VAUT TANT QU'IL COUVRE LA FENÊTRE.**
  `commencerFond` / `avancerFond(budget)` (carte.js) : le même calcul, ligne
  par ligne, huit millisecondes par image, l'ancien fond étiré en attendant.
  Un fond calculé sur 1,3 fois la vue n'a rien à recalculer pour un glisser
  d'un dixième de l'écran — `couvre()` remplace « la vue a changé ». Le
  niveau 2 (un échantillon pour huit pixels) est l'esquisse d'un seul tenant
  quand il n'y a RIEN à étirer. `rendreFond` reste, pour le banc.
- **LA MINICARTE SE REPEINT PAR BANDES — DEUX LIGNES PAR IMAGE, PAS « PENDANT
  QUATRE MILLISECONDES ».** Le « fond entier toutes les deux secondes » de la
  v233 était l'à-coup régulier ; deux lignes par image font le même tour en
  deux secondes sans jamais payer une image. Un raster neuf ou un grand saut
  se REMPLIT (fond de nuit, puis quatre lignes par image) au lieu d'être
  calculé d'un bloc — la téléportation ne paie plus 37 000 colonnes. Mon
  premier jet repeignait « pendant 4 ms » à chaque image : deux millions de
  lectures de blocs par seconde, dix fois la cadence d'avant — **un budget en
  temps par image est un TAUX, et un taux se compare à celui qu'il remplace.**
- **LA MINICARTE N'ENGENDRE JAMAIS UN MORCEAU.** `getBlock` engendre ce
  qu'on lui demande, sur le fil principal ; après une téléportation, la
  minicarte faisait naître un à un les cent soixante-neuf morceaux de son
  raster (vingt-quatre millisecondes chacun dans une ville) pendant que le
  worker les engendrait de son côté — et « un appui long dépose n'importe
  où » (carte.js) est tombé deux fois sur quatre, le minuteur de l'appui
  tirant plus de cent vingt millisecondes en retard. Un morceau absent se
  peint d'après le relief (`terrainHeight`, pure) et se MARQUE (`carteReel`) ;
  la bande suivante le repeint avec ses blocs. La sonde `__carteControle`
  ne compare que les points dont la nature n'a pas changé entre le raster et
  le recalcul — sinon un morceau livré entre les deux accuserait la recopie.
- **UNE BOUCLE SANS FIN À L'ACCUEIL A RETENU LE SERVICE WORKER CINQUANTE
  SECONDES.** Le portail l'a dit par `maj.js` : la mise à jour partait par
  le chemin forcé (« On va chercher la dernière version… ») parce que
  `reg.update()` ne trouvait rien en vingt secondes. Mesuré : résolu en 50 s
  avec la préparation, 1 s sans ; bissection par `?prepmini=0` /
  `?prepcarte=0` (gardés, comme `?reflets=0`) : c'est la minicarte, qui
  repeignait ses bandes à chaque image de l'accueil, indéfiniment — le fil
  principal respirait pourtant (latence des minuteurs 4 ms), et la requête
  de `sw.js` n'atteignait le serveur qu'à la cinquantième seconde. Le
  mécanisme exact est dans le navigateur ; la règle, elle, est claire : **à
  l'accueil, une préparation fait UN tour et s'arrête** (`carteTours`), et
  le scénario de mise à jour de `maj.js` se joue désormais PENDANT la
  préparation (`prep: 1`), sinon il ne mesure pas le trajet de l'enfant.
- **LE PROFIL ACCUSAIT LA CARTE DU MONDE ; LA TRACE A NOMMÉ LA MINICARTE.**
  Le premier fond de la carte du monde corrigé, l'ouverture bloquait ENCORE
  800 ms — `(program)` dans le profil, donc « le navigateur ». La trace par
  événements (`Tracing.start`) a mis les 830 ms dans le clic sur le BOUTON de
  la minicarte, pas sur la carte : c'était son premier fond à elle, et les
  morceaux qu'il fait engendrer. Deux clics dans une sonde, deux coûts ; on
  les mesure séparément avant de conclure.
- **ET LE BANC A MESURÉ CE QUE LA CHAUFFE COÛTE EN JEU.** `carte.js` est
  tombée trois fois sur six sur deux symptômes — « #map-tout jamais stable »
  (la dette de la v251) et l'appui long refusé — et le profil de la page
  bureau, carte ouverte, deux pages ouvertes, l'a nommé : 17 s de
  `getProgramParameter` / `getShaderParameter`, des images de 1,5 à 2,4 s.
  C'est la chauffe des programmes (v246), une compilation par image, que le
  banc fait EN JEU parce qu'il appuie sur « Jouer » tout de suite — l'enfant,
  lui, attend derrière les boutons grisés. `jouerSeul(…, { pret: true })`
  attend la chauffe avant d'appuyer ; les trois pages de `carte.js` le
  demandent. Ce n'était pas le jeu qui était lent, c'était le banc qui
  jouait pendant la préparation.
- **ET TOUTE PAGE QUE LE BANC OUVRE LUI-MÊME LE DEMANDE AUSSI.** `reglages.js`
  et `realisme.js` construisent leur adresse sans passer par `banc.joueur` ;
  la première a tué le portail (clic sur un « Jouer » grisé, trente secondes
  d'attente de `running`). Un paramètre que le banc ajoute se cherche dans
  TOUTES les adresses du banc le jour même : `grep -n "stay=1" tests/*.js`.
- **LE BANC DEMANDE `?prep=0`**, comme il demande `rr=2` : trente-sept
  démarrages en rendu logiciel auraient payé dix secondes de corps chacun
  sans rien mesurer. Le témoin qui ÉPROUVE la préparation (`maj.js`) la
  demande par `{ prep: 1 }` — même discipline que `ombres: 1`.

## L'installation se voit, et la tablette mesure elle-même (v257)

Max, après la v255 : « après chaque mise à jour, le jeu reste quasiment
bloqué une ou deux minutes sur la home » ; « s'il y a une installation
nécessaire qui prend une minute, mets un loader » ; « le jeu lag énormément
sur iPad ». Trois sondes AVANT une ligne de code, et cinq règles.

- **CE QUE LE BANC A MESURÉ, ET CE QU'IL NE PEUT PAS MESURER.** La mise à
  jour (le geste de Max : version publiée pendant que la page tourne,
  application cachée puis rouverte) prend 6 s au banc, installation 0,4 s —
  les « 58 s sans requête » de la v220 ne se reproduisent pas. L'accueil
  bloque le fil principal 4,8 s (10,5 s bridé ×4) : une tâche de 3,5 s au
  démarrage (modules et contextes WebGL, non transposable), puis les corps
  et les 25 programmes, un par image de 60 à 100 ms. Ce qui ne se mesure
  pas ici : Safari compile un programme en centaines de millisecondes ;
  cinquante programmes pendant l'accueil, c'est la minute de Max. La
  tablette doit donc mesurer elle-même : `?diag=1` (cadence médiane RÉELLE,
  lue sur `performance.now()` et non sur `dt`, qui est borné ; pire image ;
  appels ; résolution ; réglages), `?ombres=0`, `?reflets=0`, `?lampes=0`,
  `?qualite=`, `?dpr=`. Un réglage par défaut se décide sur SES chiffres.
- **UNE INSTALLATION QUI DURE SE MONTRE, AVEC SON AVANCEMENT.** Le service
  worker range ses fichiers six à la fois et annonce chaque fichier aux
  pages (`installation`, fait / total) ; `index.html` l'écrit dans le
  loader. Une réponse qui n'est pas `ok` fait échouer l'installation comme
  `addAll` le faisait.
- **APRÈS LE RECHARGEMENT, LE LOADER RESTE JUSQU'À CE QUE LE JEU RÉPONDE.**
  `wm-maj-installe` (posé par `reloadOnce`) fait attendre la première image :
  corps chargés ET programmes chauffés, avancement écrit, borné à
  quatre-vingt-dix secondes ; la fête de mise à jour attend `maj-installee`.
  Un démarrage ordinaire ne change pas. Un accueil qu'on voit et qui ne
  répond pas est pire qu'un loader qui dit pourquoi.
- **UNE VERSION NE SE REVALIDE PAS.** Le cache versionné se sert tel quel :
  `CACHE_VERSION` monte à chaque livraison, donc son contenu est exact pour
  toujours. Le « stale-while-revalidate » redemandait 78 fichiers à chaque
  démarrage (36 requêtes mesurées après un rechargement, 225 au premier
  chargement) et se disputait le réseau avec l'installation. `index.html`
  (réseau d'abord) et `sw.js` (réseau) restent ce qui découvre une version.
- **LA QUALITÉ EST UN RÉGLAGE DE L'APPAREIL, PAS DU PROFIL.** « Graphismes
  avancés » dans les Réglages : normal = 1,25 pixel par point, pas d'ombres
  (tablette et téléphone par défaut) ; avancé = pleine résolution, ombres
  (ordinateur). Clé `web-minecraft-graphismes-v1` sur l'appareil, appliqué
  sur place (les matériaux se recompilent une fois). Les paramètres d'adresse
  gardent la main, pour mesurer.

Et **la carte du monde est mesurée, pas encore réglée** : 2,1 s pour
s'ouvrir bridée ×4, une tâche de 1,6 s (le fond, un échantillon pour deux
pixels quel que soit le dpr), puis 90 à 240 ms toutes les deux secondes dès
que la vue bouge — dette déclarée dans `TASKS.md` avec ses pistes (fond par
tranches ou dans le worker, re-rendu sur déplacement réel, premier fond
avant « Jouer »).

**ET LES BÊTES NE VOYAGENT PAS PAR LE RÉSEAU : UN TÉMOIN DE MONTE VIDE
CELLES DE CHAQUE PAGE.** Le témoin passager de `reseau.js` vidait les bêtes
de l'hôte, posait Alice à trois blocs de sa voiture et attendait « Monter
avec Marlon » ; au portail de la v257 il a rendu « 🦌 Monter » — un cerf
né près du point d'apparition SUR LA PAGE D'ALICE, à moins de huit blocs
devant elle, passe avant la voiture de l'ami (`fun.js`, et c'est juste :
la bête qu'on touche avant la voiture qu'on regarde). Chaque page pond
ses propres bêtes ; ce qu'on nettoie chez l'un se nettoie chez l'autre.
Vert au portail de la v255 et de la v256, rouge à celui de la v257, vert
rejoué seul : un rouge qui va et vient sans qu'une ligne du jeu ait bougé
est un hasard qu'on identifie et qu'on retire du témoin, jamais un rejeu
jusqu'au vert.

## Ce qu'on retire garde ses données, et le receveur cède (v256)

Max : « supprime les feux d'artifice, et tout ça — Atelier, Coffre, Quête,
Panneau, Chantier, Records, Chapeaux — à part les souvenirs photos. » Trois
règles pour tout retrait de fonctionnalité.

- **ON RETIRE L'ÉCRAN ET LES COMMANDES, JAMAIS LES DONNÉES.** Records, sac,
  quête, coffre, chantier, panneaux, photos : toutes les clés restent dans le
  stockage et dans `sync.js`, telles quelles. Un enfant qui reviendrait sur
  une ancienne version retrouverait tout ; et l'on ne sait jamais ce qu'un
  retrait rendra un jour.
- **UN MESSAGE RÉSEAU RETIRÉ SE REÇOIT ENCORE.** `chest` et `chantier`
  n'ont plus de lecteur, mais une tablette restée sur l'ancienne version les
  envoie toujours : le receveur les ignore sans casse, et l'hôte RELAIE, pour
  que deux anciennes tablettes sous un hôte à jour continuent de se voir le
  coffre. C'est la règle du receveur qui cède, appliquée au retrait.
- **CE QU'UN ENFANT A ÉCRIT RESTE VISIBLE.** On ne plante plus de panneau ;
  ceux qui existent se relisent et se dessinent. Effacer ce qu'un enfant a
  écrit n'est pas un retrait de fonctionnalité, c'est une perte, et c'est à
  Max de la décider.

Et **un témoin de retrait lit ce que l'enfant voit ET ce qui s'écrit** : la
touche G ne doit ni ajouter un nuage de points à la scène, ni compter un
feu dans les records — l'un sans l'autre laisserait passer une fusée
invisible ou un compteur fantôme.

## Le journal des nouveautés vit dans le jeu (v254)

Max : « une modale au clic sur le logo de mise à jour, tout ce qui est
nouveau sur chaque version, extrêmement court, bullet points ». Trois
règles.

- **LE JOURNAL EST UNE DONNÉE, PAS UNE PROSE.** `src/nouveautes.js` :
  `{ v, titre, puces }` par version, sans import, lu par la modale
  (import dynamique au premier clic — rien de chargé avant) ET par un témoin
  sous node. Une entrée se rédige pour un enfant : le titre en deux à six
  mots, chaque puce en huit mots au plus, ce que la famille VOIT, jamais la
  technique. **Toute livraison ajoute son entrée dans le même commit que
  `CHANGELOG.md`** : le témoin de `maj.js` rougit sur une version du journal
  sans entrée dans le jeu.
- **LA MISE À JOUR FORCÉE NE DISPARAÎT PAS, ELLE DÉMÉNAGE.** Le badge
  ouvrait `forcerMaj` ; il ouvre la modale, et `forcerMaj` est le bouton en
  bas. Le dernier recours d'un parent (v220) reste à un toucher du badge —
  deux, désormais.
- **LA VERSION MARQUÉE EST CELLE DU BADGE**, lue dans son texte, parce que le
  badge demande la sienne au service worker et qu'une page sans service
  worker n'en a pas : sans numéro, rien n'est marqué et la plus récente est
  en tête. Le témoin compare la tête à `sw.js`, la marque au badge.

## À plusieurs, le véhicule voyage avec la position (v253)

Max : « on ne voit pas si un user est dans une voiture… permets que
plusieurs joueurs rentrent dans un moyen de transport : le premier conduit,
les autres restent passagers ». Quatre règles.

- **LA POSITION EMPORTE LE VÉHICULE, PAS UNE SECONDE POSITION.** Le message
  `pos` gagne `v` (espèce, modèle de flotte) au volant et `p` (chez qui, quel
  siège) en passager. C'est la leçon du mode `pilote` (v223) : une position
  de véhicule à part aurait tout fait payer deux fois. Une tablette sur
  l'ancienne version ignore les deux champs — le receveur cède.
- **L'AMI EST DESSINÉ AVEC LA FABRIQUE DE LA MONTURE** (`MODELES_MONTURE`,
  montures.js) et assis par le MÊME geste que l'enfant au volant
  (`asseoir`, main.js — siège de la fiche, plafond mesuré). La position
  vraie d'un joueur distant vit dans `rp.pos` ; son maillage, lui, peut être
  enfant d'un véhicule, en coordonnées du siège. Quand il descend, quand
  son véhicule disparaît, quand il part : `poserDebout`.
- **PASSAGER, C'EST `bord` CHEZ UN AMI.** `passager` (fun.js) colle
  l'enfant au siège de la voiture de l'ami (`sieges` de la fiche, le premier
  libre d'après les positions réseau des autres passagers), rend ses
  commandes inertes, et un appui descend — exactement le métro. Le
  conducteur reconnaît ses passagers à `net.estMoi(p.de)` — l'identité de
  pair OU celle du bus du nuage (v410 : sans courtier il n'y a pas de pair, et
  le passager était vu debout chez le conducteur).
- **UNE TÊTE N'EST PAS UN TOIT, ET LE CACHE DU PLAFOND EST PAR SIÈGE.**
  `plafondAuSiege` mesure le pavillon parmi les maillages du véhicule ; il
  n'excluait que `avatarLocal`. Assis dans la voiture d'un ami, c'est SA
  tête qui aurait servi de toit — tout corps aux bras articulés
  (`userData.arms`, `buildKidMesh`) est exclu. Et le conducteur et ses
  passagers n'ont pas le même toit au-dessus d'eux : une case par siège,
  invalidée quand une pièce (un avatar) s'ajoute au véhicule ; à une seule
  case, deux sièges se seraient remesurés à chaque image, cent mille
  sommets. Le véhicule qu'on rend pour asseoir un passager est la monture
  ELLE-MÊME, jamais une copie : une copie par image perd ce cache.
- **LE TÉMOIN LIT LA PARENTÉ DU MAILLAGE**, pas une variable : l'avatar de
  l'ami est enfant du maillage de sa voiture, ou il ne l'est pas. Et il
  mesure ce que l'enfant obtient : Alice, sans toucher à rien, a SUIVI la
  voiture de Marlon.

## Le mobilier des rues, et une exception qui se juge par famille (v252)

Max : « les voitures peuvent aussi passer à travers des fois le mobilier
urbain comme les tables de Times Square ». Mesuré AVANT d'accuser la
circulation : les soixante-dix-neuf tracés de taxis restent à neuf blocs des
tables. C'est la voiture de l'enfant — sa boîte ne connaît que les blocs
solides, et le mobilier est non solide (props) ou sans bloc (Manhattan).
Trois règles.

- **LE MOBILIER EST UN OBSTACLE POUR CE QUI ROULE, PAS POUR CE QUI MARCHE.**
  `mobilierDevant` (main.js) échantillonne les cases au sol du rectangle de
  la voiture : un bloc `isProp` dans le monde, ou une case notée par le
  renderer de Manhattan (`noterObstacle` dans `bench`, `lamp`, `tree`, les
  tables et les bornes de Broadway ; `obstacleA(wx, wz)` pour un point du
  monde). La marche ne change pas : un enfant passe entre les chaises.
- **« PAS SI L'ON EST DÉJÀ DEDANS » SE JUGE PAR FAMILLE.** Mon premier jet
  ajoutait le mobilier au crochet existant (`circulation || mobilier`) et
  laissait `player.js` appliquer l'exception sur le tout. Sonde : au point
  de départ du témoin, une voiture du convoi 89 était à 0,67 bloc — donc
  « déjà dedans » — et la nôtre traversait un réverbère six blocs plus loin.
  Le crochet reçoit désormais la position actuelle et rend
  `(circulation devant ET pas ici) OU (mobilier devant ET pas ici)`. Toute
  famille d'obstacle qu'on ajoutera se juge de la même façon, chez elle.
- **UN TÉMOIN DE CONDUITE PART D'UN POINT SANS VOITURE DE RUE À PORTÉE**
  (`placeProche` à douze blocs), sinon il mesure la circulation ; et il roule
  JUSQU'À L'ARRÊT, pas trois secondes : à dt borné, trois secondes de banc
  ne mènent pas à un poteau à neuf blocs, et le témoin était vert des deux
  côtés en ne mesurant rien.

**UN BOUTON-BASCULE NE SE RECLIQUE PAS.** La boucle de montée de `monte.js`
cliquait « Monter », attendait le « ⬇️ » du bouton trois secondes, et
recliquait ; le texte s'écrit à l'image SUIVANTE et `waitForFunction` sonde
par rAF — à une image par seconde dans Paris, le premier clic avait monté,
le second a fait DESCENDRE, et trois témoins ont mesuré « au volant » à
pied. L'état se lit dans le jeu (`montureConduite()`), jamais dans le texte
d'un bouton, et l'on ne renvoie pas une commande dont l'effet est une
bascule sans avoir lu l'état d'abord.

**ET UNE MESURE OÙ PERSONNE NE VIENT N'EST PAS UNE MESURE.** « La circulation
s'arrête devant la voiture de l'enfant » posait l'enfant douze blocs
« devant » une voiture, en droite ligne ; sur une rue qui tourne, ce point
n'est pas sur le tracé, les voitures passent à côté, et le témoin rend
« zéro arrêtée, zéro au travers » — rouge, sans qu'aucune voiture n'ait eu
l'occasion de céder ou de traverser. Un verdict de comportement exige que
la SITUATION ait eu lieu : de la chaussée sous toute la ligne, et si
personne ne vient en douze secondes, on se repose sur le candidat suivant
au lieu de conclure.

**Et Manhattan ne se conduit pas sur ce banc.** Une image par seconde en
rendu logiciel : à pied, 0,3 bloc en deux secondes ; le secteur de sol qui
porte la table n'arrive jamais en tête de file. Le témoin bâtit alors ce
secteur comme le renderer le ferait (`groundSector`) et vérifie le registre
et le crochet — la conduite elle-même est prouvée à Paris. Une preuve qui
attend une cadence que le banc n'a pas n'est pas une preuve, c'est une
attente.

## Le maillage hors du fil principal (v251)

Max, iPad : « en avion le lag est fort ; en voiture, lag, et la définition
des bâtiments s'affiche trop tard ». Un morceau de Paris coûte 24 ms à
engendrer et mailler, DANS l'image ; le budget de 720 ms par seconde (v237)
était donc le lag lui-même, et il ne suivait pas une voiture (27 morceaux
par seconde pour 30 réclamés). Le remède n'est pas un budget de plus : c'est
un autre FIL. Six règles.

- **UN MONDE JUMEAU DANS UN WORKER** (`maillage-worker.js`) : le même
  `World`, les mêmes `edits`, et il rend des TAMPONS (`buildChunkTampons`,
  mesher.js — plus de three dans le mailleur) que `main.js` transforme en
  BufferGeometry en une milliseconde, plus les blocs (transférés) pour les
  collisions. Mesuré en vol au-dessus de Paris : 324 → 0 ms de
  maillage par seconde sur le fil principal.
- **UN WORKER DE MODULE N'A PAS L'IMPORT MAP DE LA PAGE.** Le premier
  `import 'three'` de son graphe le tue sans un mot. D'où `tuiles.js` : la
  partie PURE de textures.js (colonnes, rangées, UV), que le mailleur importe
  à la place. Avant de faire entrer un module dans le worker, on vérifie son
  graphe d'imports (`node -e` sur les `from './…'`) : world.js en a
  trente-deux, aucun ne touche three ni au document.
- **QUI MAILLE SE DEMANDE À LA CLASSE DU MONDE** (`maillageLocal(cx, cz)`) :
  `World` dit non ; `TerreUrbaine` dit oui dans Manhattan et sur ses colonnes
  protégées, parce que le worker ne connaît ni le plan ni les journaux
  importés. Les remaillages d'un bloc posé restent sur le fil principal —
  poser un bloc doit se voir dans l'image.
- **TOUT BLOC ÉCRIT PART AU WORKER** (`world.onBloc`, appelé par `setBlock`
  pour un bloc local OU reçu), et un changement de monde resynchronise tout
  (`generation` : une réponse d'une génération passée est refusée). Un bloc
  posé pendant que le worker maillait rend le morceau `sale` : il se remaille
  ici à l'arrivée.
- **LE FIL PRINCIPAL GARDE SES PROPRES BLOCS S'IL LES A DÉJÀ.** `getBlock`
  engendre des morceaux pour les collisions et les passants avant que le
  worker n'arrive ; on n'écrase jamais ce que le jeu tient. Les deux sont
  identiques, et c'est un TÉMOIN qui le dit (bloc pour bloc, sur les morceaux
  adoptés du worker), pas un raisonnement — c'est ce qui garde l'invariant 1
  quand deux mondes se partagent le travail. **Et la liste des morceaux
  adoptés est une FENÊTRE GLISSANTE** (`statsMaillage.recus`, les
  soixante-quatre derniers) : mon premier compteur gardait les soixante-quatre
  PREMIERS, oubliés depuis longtemps quand le témoin les compare en vol — il
  comparait zéro morceau et aurait été vert sans rien prouver.
- **ET LE FIL PRINCIPAL N'ENGENDRE PRESQUE PLUS.** Enveloppé `generateChunk`
  en vol : 29 appels en huit secondes (41 ms) — `versLaRue` qui lit la
  chaussée voisine d'une lanterne, un passant qui sonde le sol — contre 469
  sur l'ancien chemin. La génération (45 % du coût d'un morceau) part avec le
  maillage ; un compteur qui ne mesure que `meshChunk` ne l'aurait pas dit.
- **UN WORKER QUI MEURT REND LA MAIN** : `onerror` remet les morceaux en
  attente dans la file et l'ancien chemin reprend. `?maillage=local` force
  ce chemin, pour mesurer et pour les témoins.

**Et ce portail complet a rendu trois rouges qui n'étaient pas à lui, plus
une dette de la v249 — chacun démonté par une mesure, pas par un rejeu.**

- **`__lumiere()` A TUÉ SON TÉMOIN UNE SECONDE FOIS.** La v247 avait écrit
  « une sonde qui lit un mécanisme meurt avec lui » en la faisant publier
  le niveau des lampes ; la v249 a monté les planchers de nuit à 1,7 et
  0,45, et « à minuit, les fenêtres restent allumées » comparait ce niveau
  (1,07) à la couleur d'un matériau (0,92) — rouge pour toujours, invisible
  parce que `carteMonde.js` ne garde pas `main.js`. Le témoin lit désormais
  des pixels (mur de pierre percé de fenêtres d'étage, à minuit : 178 contre
  33). **Un témoin qui compare deux grandeurs d'unités différentes n'a
  jamais mesuré** ; et une suite qui ne garde pas le fichier dont elle
  dépend rougit en silence — c'est la leçon de la v187, une fois de plus.
- **UNE BORNE DE GARDE À 60 % EST UNE BORNE À 90 %.** `parcouru > 300`
  pour 497 mesurés seul : 249 au portail, sur du code sain. La moitié —
  et encore, la moitié d'une mesure faite sur une machine qui respire ne
  vaut pas la moitié au portail : 100.
- **Le trio de `reseau.js`, le clic de `carte.js`, les textures de
  `plafond.js`** : rejoués SEULS sur la branche, verts tous les trois ; la
  page bureau est aussi calme avec le worker, sans, et sur `origin/main`
  (médiane 53 à 60 ms par image, clic en 120 à 155 ms) ; et les « Couldn't
  load texture blob: » ne reviennent pas, même en rechargeant pendant que
  les corps se chargent. Ce sont des rouges de portail, déclarés dans
  `TASKS.md` avec leurs mesures — et ce qui les distingue d'une régression,
  c'est qu'on a MESURÉ les trois configurations, pas qu'on a rejoué jusqu'au
  vert.

## La nuit se règle avec les ombres, et le conducteur se voit (v249)

**LE BANC NE VOIT PAS LA NUIT DE L'IPAD.** Max, capture : « Paris est dans le
noir ». Les intensités de nuit de la v247 avaient été réglées sur des captures
du banc — où les ombres sont COUPÉES (rendu logiciel). La lune y éclairait
donc toute rue ; sur l'iPad, la rue est dans l'ombre des immeubles et il ne
reste que la lueur du ciel : mesuré 5,7/255 au sol, 2,6 sur un mur. Deux
règles.

- **TOUT RÉGLAGE DE NUIT SE FAIT SUR UNE PAGE À OMBRES FORCÉES** (`ombres=1`),
  et se mesure dans l'ombre d'un mur, pas au clair de lune. `HEMI_NUIT` et
  `LUNE_NUIT` (main.js) sont les planchers ; le jour (`daylight = 1`) garde
  ses valeurs à l'identique. Le témoin bâtit un mur de huit blocs sur la
  dalle du regard et lit le sol dans son ombre de lune (41,5 ; 28,2 sur le
  mur).
- **UNE CAPTURE DE BANC QUI CONTREDIT L'IPAD DIT QUE LE BANC NE MESURE PAS LA
  MÊME CHOSE.** Avant de retoucher une valeur, on cherche ce que la tablette
  a et que le banc n'a pas — ici la passe d'ombre.

**ET LE PERSONNAGE SE VOIT AU VOLANT.** Max : « fais en sorte qu'on voit le
personnage conduire ». L'avatar local est bâti comme celui que les autres
joueurs voient (`buildKidMesh` + `withOwnLook`), assis par `main.js`
(`asseoirLeConducteur`) sur le `siege` que la FICHE de la monture déclare,
dans le repère du véhicule — le nez est en −z, le volant du cockpit à
x = −0,33, l'assise plus basse que le baquet sculpté pour que la tête reste
sous le toit. La posture est une `pose` d'`animerHumain` (cuisses, genoux,
bras, coudes : même signe que `swing`) ; le corps sculpté de secours n'a que
ses pivots. Sans `siege` dans la fiche, pas d'avatar : même discipline que
`montable` et `gabarit`. Le témoin monte par le bouton et vérifie l'avatar
enfant du maillage de la voiture, dans l'habitacle et dans le cadre, puis
parti à la descente.

**ET J'AI LIVRÉ LE PREMIER JET ASSIS DE DOS.** J'avais DÉDUIT que le modèle
regardait en +z (« les autres joueurs tournent de yaw + π ») ; il regarde en
−z, c'est écrit en tête de `personnages.js`, et la capture de trois quarts le
montrait — l'arrière de la tête à travers le pare-brise. Max l'a vu, pas moi :
« une erreur que tu devrais catch ». Un signe se REGARDE, il ne se déduit pas
(c'est déjà la règle du roulis et du paysage lointain), et **un témoin de
posture lit une DIRECTION** : le visage (−z de l'avatar, dans le monde) contre
le cap de la voiture, produit scalaire > 0,9. Rouge sur le premier jet (−1).

**ET LE SIÈGE DE LA FICHE VAUT POUR UNE BERLINE.** Max, sur la capture de
dos : « le personnage passe à travers la carrosserie » — le crâne sortait par
le pavillon d'une voiture basse. `plafondAuSiege` (main.js) mesure le toit
DANS la carrosserie de chaque modèle : parmi les maillages de la voiture, le
plus bas de ceux qui passent au-dessus du siège ; les hanches descendent
sous lui, et l'avatar rapetisse un peu si cela ne suffit pas. Le témoin
compare le sommet du crâne au pavillon mesuré. Ce qui ne se mesure pas se
lit sur la capture, et ce qui se lit sur la capture se met dans le témoin.

## Le premier chargement — ce qui part, et QUAND

**Un préchargement qui rend service à l'un se paie sur tous les autres.** Le
scanner de visages pèse **4,67 Mo compressés** ; le jeu entier, ses 78
fichiers, en pèse **1,12**. Quatre-vingts pour cent du premier chargement
partaient donc dans une bibliothèque dont on n'a pas besoin pour jouer, et
personne ne l'avait jamais mesuré — la ligne se lisait très bien : « pendant
que l'enfant lit l'accueil ». Trois choses en sortent, et les trois se
reprennent telles quelles la prochaine fois.

- **`requestIdleCallback` NE VEUT PAS DIRE « quand la page n'a rien à
  faire ».** Il rend la main dès que la boucle respire — donc pendant que le
  monde s'engendre, juste après « Jouer ». C'est exactement le piège de
  `souffler()` et du minuteur en `dt`, par un troisième bout : **une attente
  qui n'observe pas la bonne chose n'attend rien.** Ce qui décide qu'une page
  est calme, c'est un fait du jeu (`running`), jamais une primitive du
  navigateur.
- **UN PRÉCHARGEMENT EST UNE CADENCE DE MÉNAGE.** Il compte en temps réel, il
  regarde si la page a autre chose à faire, et il RÉESSAIE au lieu
  d'abandonner. Même famille que `cadence.js` : ce qui décide si le monde
  existe autour de l'enfant ne doit rien devoir à ce que l'enfant est en train
  de faire, et réciproquement.
- **UN INSTANT DE CALME N'EST PAS UN ÉTAT CALME.** Première version : un seul
  coup d'œil à `running`. Il retombe à faux le temps d'un changement de
  verrouillage du pointeur, et le préchargement partait alors EN PLEINE
  PARTIE — vu une fois sur six au banc, 221 s pour retrouver vingt images par
  seconde là où il en faut huit. On exige désormais le calme **deux fois de
  suite**. Un chiffre aberrant dans une série se démonte : c'était un défaut
  de ma propre livraison, pas du bruit de banc.
- **ET LE REMÈDE NE DOIT PAS ALLER PLUS LOIN QUE LA PANNE.** Supprimer le
  préchargement était plus simple, et cela aurait rendu à l'enfant qui touche
  « Reconnais-moi » les quatre mégaoctets et demi d'attente. Le second témoin
  de `maj.js` est vert des deux côtés à dessein : il garde ce qu'on ne veut pas
  casser. Un témoin vert des deux côtés se retire quand il ne mesure rien —
  celui-ci mesure une CAPACITÉ qu'on vient de frôler.

**Et une mesure de premier chargement se fait sur ce que la PRODUCTION sert,
pas sur le disque.** Le banc sert sans compression : 15,6 Mo. Vercel sert en
brotli : 5,79. `curl -s -o /dev/null -w '%{size_download}' -H 'Accept-Encoding:
br, gzip'` sur la liste `ASSETS` de `sw.js` donne le vrai chiffre en une
minute. Sans lui, on optimise un poids qui n'existe nulle part.

**Ce que le banc ne peut PAS mesurer du premier chargement, et qu'il faut
savoir avant de conclure.** Le conteneur rend en logiciel (SwiftShader). Le
profil du premier chargement y donne **2,65 s dans `three.module.min.js`**,
dont 1,84 imputées à `makeCharPortraits` — et la mesure séparée montre que ce
n'est pas le rendu (29 ms pour huit portraits) ni la conversion en image
(71 ms), **c'est la création du premier contexte WebGL de la page** (379 ms
pour le SECOND, une fois le pilote chaud). Sur un iPad ce coût est de l'ordre
de la dizaine de millisecondes. **Un chiffre de processeur mesuré sur ce banc
ne se transpose pas à la tablette** ; seuls les octets et l'ordre des
téléchargements se transposent. C'est la même leçon que « devant un rouge de
durée, on mesure d'abord le banc », appliquée à une mesure de performance.

---

## Ne jamais livrer un fichier que personne n'importe

`src/monuments.js` est parti en production dans v157 : 803 lignes, 21 monuments,
**aucun `import`**. Il n'était pas non plus dans la liste des fichiers mis en
cache, donc il ne serait jamais arrivé sur un iPad. Du code mort qui ressemble à
de l'avancement dans le journal et ne délivre rien.

Avant de livrer un fichier neuf, deux vérifications qui coûtent dix secondes :

```
grep -rn "from './monfichier" src/     # quelqu'un l'importe-t-il ?
grep -c "monfichier.js" sw.js          # arrivera-t-il sur la tablette ?
```

Et la règle en amont : **on ne commite pas une brique tant que rien ne s'en
sert.** Soit elle est branchée dans la même livraison, soit elle attend.

---

## Travailler à plusieurs sessions en parallèle

Plusieurs sessions peuvent avancer en même temps — chacune a sa propre machine,
donc aucune ne ralentit l'autre. Trois collisions sont possibles, et une seule
est vraiment coûteuse.

**1. La branche.** Tout le monde poussait jusqu'ici sur
`claude/web-minecraft-replica-f0wk4b`. Deux sessions dessus se marchent dessus.
Une session parallèle prend **sa propre branche**, nommée par son sujet :
`claude/paris-metro-souterrain`, `claude/usine-auto`. La branche historique
reste celle de la session principale.

**2. `CACHE_VERSION`.** Chaque livraison le monte d'un cran. Deux sessions qui
partent de v159 écrivent toutes les deux v160 : conflit à la fusion, et si l'une
passe quand même, la seconde livre une version qui **écrase l'entrée de cache de
la première**. Donc : on ne choisit pas son numéro à l'avance. On monte
`CACHE_VERSION` **juste avant de fusionner**, après avoir rebasé sur `main` — le
numéro se lit alors sur `main`, il ne se devine pas.

**3. Les mêmes fichiers.** C'est la collision qui coûte cher, et elle
s'évite en découpant par **zone** plutôt que par tâche. Les zones qui ne se
touchent presque pas :

| Zone | Fichiers | Se marche dessus avec |
| --- | --- | --- |
| Contenu et bâtiments | `monuments.js`, villes, `creatures.js` | rien |
| Washington | `washington.js`, `dcmonuments.js` | `vehicules.js` (le métro) |
| Apprendre / quiz | `education.js` | l'espace parent |
| Paris et transports | `ville.js`, `paris.js`, `vehicules.js`, `main.js` | l'usine auto |
| Usine et conduite | `vehicules.js`, `fun.js`, `main.js` | Paris |
| Réseau et sauvegarde | `net.js`, `sync.js`, `cloud.js` | rien |

`main.js` est le point de friction : presque tout y passe. Deux sessions qui y
touchent en même temps auront un conflit — surmontable, mais à savoir.

**Trois sessions tournent depuis la v223**, et le découpage est celui-ci :

| session | branche | zone |
| --- | --- | --- |
| principale | `claude/web-minecraft-replica-f0wk4b` | `main.js`, `world.js`, `aeroport.js`, le banc |
| cinquante villes | `claude/cinquante-villes` | `villesmonde.js`, fiches de ville |
| avenues orphelines | `claude/avenues-orphelines` | `voies.js`, villes bâties à la main |

Chacune reçoit sa zone **et la liste de ce qu'elle ne touche pas** : une zone
sans interdits explicites finit toujours par déborder sur `main.js`.

**Ce qui ne collisionne PAS**, contrairement à l'intuition : le banc d'essai.
Chaque session a sa propre machine à quatre cœurs, donc deux portails
simultanés ne se volent pas de temps. Ce qui se partage, ce sont les **limites
d'usage du compte** : deux sessions actives les consomment deux fois plus vite.

**Et `TASKS.md`** se met à jour à la fusion, pas pendant — sinon chaque session
le réécrit et il conflit à chaque fois.

---

## Le banc d'essai — et ses pièges

Playwright + express servant le dépôt **depuis le disque**, courtier PeerJS
local, Supabase de poche (`tests/nuage.js`).

### Règles de survie

- **Ne jamais modifier `src/` pendant qu'une suite tourne.** Le serveur lit les
  fichiers sur le disque : une édition en cours de route produit des échecs
  fantômes impossibles à interpréter.
- **Le prénom est une clé, pas une étiquette.** Le nuage range le profil d'un
  enfant **sous son prénom** (mondes, position, blocs). Deux scénarios qui
  réutilisent le même prénom se passent leur état, et le second **recharge sa
  page en plein milieu** pour appliquer l'état « retrouvé de ses autres
  appareils ». Sa session meurt, l'hôte disparaît, et neuf témoins tombent en
  accusant le réseau. Une heure de fouille la première fois. Le banc signale
  désormais tout prénom resservi ; une réutilisation **voulue** (le même enfant
  sur deux appareils) se déclare par `{ memePrenom: true }`.
- **Quatre cœurs seulement.** Deux navigateurs qui se disputent la machine
  produisent des échecs qui n'existent pas dans le jeu. `souffler()` attend que
  la charge retombe ; les suites ne tournent jamais en parallèle.
- **Un témoin qui mesure une durée doit observer pendant toute la fenêtre**,
  pas seulement à la fin. Le témoin du lien muet échantillonnait après 35 s ce
  qui ne vit que 20 s : vert sur machine au repos, rouge sous charge, sans que
  le jeu y soit pour rien.
- **Un geste ne produit pas son effet au moment où le doigt se lève.** Le zoom
  s'applique au tour d'affichage suivant, et sur une machine chargée ce tour se
  fait attendre. Lire la valeur dans la foulée du geste donne « 0.70 → 0.70 » :
  le témoin annonce que rien n'a bougé alors qu'on a simplement regardé trop
  tôt. On attend le résultat, borné dans le temps (`attendreLeZoom`).
- **`souffler()` avant tout passage lourd, dans TOUTES les suites.** `carte.js`
  ne l'appelait pas une seule fois alors que c'est la seule à viser au pixel
  près, et elle passe en cinquième position sur un conteneur que quatre suites
  viennent de chauffer. Un portail dont les rouges se déplacent d'une exécution
  à l'autre n'accuse pas le jeu : il dit que le banc manque d'air.
  **En v187, `reglages.js` était encore dans ce cas** — pas un appel sur onze
  passages, six navigateurs ouverts et quatre refermés. Corrigée, elle passe de
  46 à 63 témoins.
- **Une attente de chargement se donne le même budget que l'attente qui la
  suit.** Trois `goto`/`reload` en `waitUntil: 'load'` de `reglages.js` avaient
  les trente secondes par défaut de Playwright, quand la ligne d'après en
  accordait quatre-vingt-dix pour que `window.__game` reparaisse SUR LA MÊME
  PAGE. Ce n'est pas une norme, c'est une même attente coupée en deux — et sur
  un banc qui rend en logiciel, c'est la première moitié qui casse.
- **UN FILET ARMÉ APRÈS CE QU'IL DOIT SAUVER NE SAUVE RIEN (v220).** Les deux
  chemins de mise à jour d'`index.html` armaient leur minuterie de secours
  APRÈS `await reg.update()` — promesse tenue seulement une fois les
  soixante-treize fichiers du jeu remis en cache. Tant que l'installation
  traîne, rien n'est armé ; si elle ne finit jamais, rien n'arrive jamais. Le
  commentaire disait pourtant « si l'installation traîne, on laisse jouer » :
  c'était exactement le cas qu'il ne couvrait pas. Trois choses en sortent.
  - **Ce qui est écrit dans un commentaire n'est pas ce que le code fait.**
    Celui-ci était juste sur l'intention et faux sur le fait, et il a survécu
    des versions parce qu'il RASSURAIT. Devant un filet, on regarde d'abord ce
    qui l'arme, pas ce qu'il fait.
  - **UN REMÈDE NE DOIT RIEN ATTENDRE DE CE QU'IL RÉPARE.** `forcerMaj` — le
    dernier recours, celui du bouton du badge de version — commence par
    `unregister()`, tâche de la MÊME file d'attente que l'installation
    bloquée. Écrit pour un service worker coincé, il attendait le service
    worker coincé. Mesuré : appelé à vingt secondes, plus rien pendant
    vingt-huit. Chaque étape a désormais son délai et l'on recharge dans tous
    les cas.
  - **« Ça s'installe » ne veut pas dire « ça va finir ».** Juger sur
    `reg.installing` laisse l'enfant sur l'ancienne version dès qu'une
    installation démarre puis reste en suspens. Le seul critère qui ne se
    trompe pas est celui de l'enfant : au bout de quarante-cinq secondes il a
    la version neuve, ou l'on repart de zéro.
- **DEUX TÉMOINS ÉCRITS, DEUX TÉMOINS RETIRÉS — et c'est la bonne fin (v220).**
  Le premier mesurait « la page se recharge » : l'ancien code le satisfaisait
  en rechargeant sur la MÊME ancienne version. Le second mesurait « l'enfant
  peut rejouer », et il était vert des deux côtés (27,8 contre 65,9 s, puis
  28,3 contre 36,5 s) parce que l'ancien code s'en sort quand même — non par un
  filet, mais parce que l'installation finit par échouer. Borner sur ces
  durées aurait mesuré le banc. **Un témoin vert des deux côtés se retire, il
  ne se garde pas au motif qu'il est écrit** ; et la capacité du banc qui ne
  servait qu'à lui part avec, sinon c'est une brique dont personne ne se sert.
  Ce qui n'a plus de témoin se déclare dans `TASKS.md`.
- **LA CHARGE MOYENNE NE MESURE PAS LE BANC — ET J'AI DEUX FOIS EXPLIQUÉ UN
  ROUGE PAR ELLE À TORT (v220).** La charge d'une minute est une moyenne QUI
  DÉCROÎT : quand une suite se termine, ses processus sont morts et la machine
  est libre, mais le chiffre met cent secondes à le reconnaître. Mesuré, même
  navigateur, pendant que la charge laissée par `monte.js` montait de 3,40 à
  5,16 : 58,5 · 43,0 · 43,0 · 45,9 · 43,2 · 47,4 · 38,3 · 55,9 images par
  seconde. **Aucune relation**, et 14,7 Go de mémoire libre d'un bout à
  l'autre. Trois choses en sortent :
  - **Une charge RÉELLE, elle, se voit tout de suite** : deux pages de jeu
    ouvertes EN MÊME TEMPS font tomber la cadence de 42,9 à 20,8 puis 14,8
    images/s. C'est la concurrence DANS une suite qui coûte, pas la trace de
    la suite d'avant.
  - **`attendreLeCalme` attendait jusqu'à trois minutes par suite sur ce
    nombre-là.** Ramené à trente secondes : neuf minutes rendues par portail,
    et rien de perdu — il n'y avait rien à attendre.
  - **Et les rouges que j'ai attribués à « la charge du banc » en v218 et v219
    n'ont donc PAS cette cause.** Ce qui justifiait la fusion tenait quand
    même — les suites étaient VERTES rejouées seules, ce qui est un fait plus
    fort que « rouge identique sur `origin/main` » — mais l'explication était
    inventée. La vraie cause est ouverte, déclarée dans `TASKS.md`. **Une
    explication commode qu'on ne mesure pas est une dette, pas un
    diagnostic.**
- **Un témoin dont le verdict est une DURÉE mesure le banc si on ne le fait
  pas souffler.** « Un monde bien rempli ne retarde pas les retrouvailles »
  annonçait 55 à 57 s pour une borne de 25 — au-delà même de sa propre limite
  d'attente, ce qui ne peut pas venir du jeu. Rejoué seul à la sonde sur une
  machine qui respire : **six secondes**. Il était rouge à l'identique sur
  `origin/main`, donc en production, et personne ne l'avait rejoué seul. C'est
  la même leçon que `reglages.js` en v187, par un autre bout : le premier
  réflexe devant un rouge de durée est de le REJOUER SEUL, pas de croire le
  chiffre.
- **Ne jamais relancer le portail jusqu'à obtenir du vert.** Trois suites
  vertes chacune de son côté ne valent pas un portail vert : c'est ainsi qu'on
  publie une régression en croyant l'avoir écartée. Un rouge se démonte, il ne
  se rejoue pas.
- **Le navigateur du conteneur n'a aucun accès Internet sortant.** `curl` passe
  par le mandataire, Playwright non. Tout scénario en ligne passe par le nuage
  de poche.
- **UNE PAGE QUI SE RELANCE N'EST PAS UNE PANNE — c'est le jeu qui fait son
  travail.** Depuis la v189, la synchronisation relance la page quand la
  fusion rapporte vraiment quelque chose. Pendant cette relance, Playwright
  rend « Execution context was destroyed », et un `page.fill` qui expire au
  bout de trente secondes sur un élément qui EXISTE ne dit qu'une chose : la
  fiche n'était plus à l'écran. Trois témoins sont tombés là-dessus dans la
  même journée (v196) — la seconde tablette d'un enfant dans `reglages.js`,
  la barre de recherche de la carte deux fois. Toute attente qui traverse une
  relance possible se garde : on rouvre ce qui s'est fermé, on retape, et
  **on dit ce qu'on a vu à chaque échec**. `page.fill` qui expire recouvre
  cinq pannes très différentes — élément absent, invisible, dans une fiche
  fermée, hors écran, désactivé — sous un seul message ; un rouge qui ne les
  distingue pas ne se démonte pas.
- **UN TÉMOIN QUI LIT L'EFFET D'UNE IMAGE ATTEND L'IMAGE (v249).** « Les gens
  nés avant les modèles reçoivent leur corps réaliste sur place » lisait la
  présence de chaque personnage quatre secondes après l'arrivée des modèles ;
  la mise à niveau se fait par tranches dans un `requestAnimationFrame` à
  part, la présence se recopie dans la boucle du jeu à l'image d'APRÈS. Lue
  entre les deux : deux présences « fausses » sur cent quarante et une au
  portail, zéro sur la même page rejouée seule. Une lecture qui dépend d'une
  image attend que la file soit vide, puis deux images — jamais un délai fixe.
- **Un témoin doit échouer *proprement* sur l'ancien code, pas s'effondrer.**
  Une méthode neuve appelée sans garde fait planter le banc au premier témoin
  et masque les quatre suivants — on ne voit donc jamais l'étendue réelle du
  défaut. Appeler `s.machin ? s.machin() : repli` coûte une ligne et rend la
  vérification lisible.

### Reprise après coupure

Le conteneur de session peut être recyclé à tout moment. Le portail écrit
chaque verdict sur le disque dès qu'il tombe et saute au redémarrage ce qui est
déjà vert. `npm test -- --depuis-zero` force le tour complet.

**ET L'EMPREINTE EST PAR SUITE, PAS GLOBALE — ce fichier disait l'inverse, et
c'est faux depuis la v195.** Il écrivait « seulement si le code n'a pas bougé
d'un octet (empreinte de `src/`, `tests/`, `sw.js`, `index.html`) ; au moindre
changement, tout se rejoue ». Le code, lui, garde le verdict d'une suite tant
qu'aucun fichier qui LA GARDE n'a bougé : ses gardiens, plus son propre fichier,
le banc, `sw.js`, `index.html`, et tout fichier de `src/` que la table ne connaît
pas encore. C'était le plus gros levier sur l'itération (v195 : trois passages de
`carte.js` là où un suffisait), et le laisser mal décrit a un coût réel — devant
un portail de la v279 qui n'a rejoué que DEUX suites, j'ai d'abord cru à un
portail invalide, c'est-à-dire exactement le travers que `tout.js` existe pour
empêcher. **Un portail qui ne rejoue qu'une partie des suites est une porte
valide si, et seulement si, chaque suite sautée est verte sur l'empreinte de ses
propres gardiens** — ce qui se lit dans la ligne « ↩️ reprise : N suite(s) déjà
verte(s) sur ce code exact », et non dans le nombre de suites jouées.

### Écrire un témoin

- On éprouve le **trajet de l'enfant**, pas le mécanisme. « Le bouton apparaît
  quand une monture est devant soi », pas « la fonction renvoie un objet ».
- **Tout témoin neuf doit être vérifié ROUGE sur l'ancien code.** Un témoin qui
  passe avant et après ne prouve rien.
- Mesurer ce que l'enfant obtient (des mètres parcourus), pas une variable
  interne.
- **UN PASSANT QUE PERSONNE NE VOIT N'EST PAS UN PASSANT FIGÉ (v279).** Mon
  premier relevé du déplacement des passants de Paris rendait **seize immobiles
  sur vingt et un**, sur du code sain : au-delà de quatre-vingts blocs,
  `actualiserPresence` rend faux et `npc.update` n'est JAMAIS appelé (v241). Le
  signe qui le disait était sous les yeux — le chemin parcouru valait
  **exactement zéro**, pas « peu » —, et c'est ce qui distingue à coup sûr « pas
  animé » de « en pause ». Un témoin de vie de rue n'observe que la troupe
  ANIMÉE, et il publie sur combien : `6 sur 21`.
- **UN MINIMUM ÉCHANTILLONNÉ EST UNE PROPRIÉTÉ DE LA CADENCE, PAS DU MONDE
  (v279).** Le témoin du piéton devant une voiture a été écrit trois fois, et les
  deux premières étaient VERTES sur du code qui laisse l'enfant traverser. La
  première comptait « il n'avance plus » sur des relevés espacés de trois cents
  millisecondes, quand le banc rend trois images par seconde : deux relevés
  tombaient dans la MÊME image, la position n'avait pas bougé parce que RIEN
  n'avait bougé, et le témoin concluait en 1,8 s après huit dixièmes de bloc. La
  seconde lisait la distance MINIMALE au centre de la voiture : l'enfant la
  traversait de part en part et les relevés enjambaient le point le plus
  proche — 0,93 bloc, vert ; au passage suivant, sur le MÊME code, ce même relevé
  rendait 0,17. **Ce qui ne dépend d'aucun relevé intermédiaire, c'est la
  position d'ARRIVÉE** : −1,16 ici, +0,2 · +1,53 · +1,6 sur l'ancien code, où il
  ressort de l'autre côté. Devant une grandeur qu'on
  échantillonne, on se demande d'abord ce que la cadence en décide.
- **UNE BORNE SUR LE RÉSULTAT DONNE À L'ANCIEN CODE TOUT LE TEMPS DONT IL A
  BESOIN (v279).** La règle de la v270 — « on attend le RÉSULTAT, borné, jamais
  une durée » — se retourne contre un témoin dont la grandeur S'ACCUMULE. Celui
  de la marche des passants exigeait quatre blocs de déplacement NET : le vieux
  programme tirait un cap neuf toutes les une à trois secondes dans un rayon de
  huit blocs, et sur vingt-deux secondes de jeu **cette marche au hasard finit
  par dériver de quatre blocs**. Vert sur le code qu'il devait accuser. Ce que
  Max décrivait — « figé » — n'est pas une distance, c'est un DÉBIT : du chemin
  par seconde de JEU (0,18 à 0,77 avant, 1,13 à 1,43 après, pour un `walkSpeed`
  de 1,6). Avant de borner sur un résultat, on se demande si l'ancien code peut
  l'atteindre en attendant assez longtemps ; si oui, la grandeur est un taux.
- **UNE CORRECTION DU JEU REND VISIBLE UNE HYPOTHÈSE DE BANC QUE PERSONNE
  N'AVAIT ÉCRITE (v279).** `contreLeMur` (monte.js) mesure la carrure de
  l'enfant : il creuse un couloir de blocs À LA POSITION COURANTE et le fait
  marcher vers un mur. Son hypothèse muette était « le couloir est vide dès
  qu'on a dégagé les BLOCS » — vraie tant qu'un piéton traversait les voitures,
  fausse depuis que la v278 l'en empêche. Or le témoin d'avant laisse l'enfant
  SUR un circuit de circulation de Paris, où il vient de compter cent soixante
  relevés de voiture à moins de douze blocs : l'enfant butait sur la
  circulation au lieu du mur — **7,78 blocs du mur au lieu de 0,3**, et le
  garde-fou d'après avec. Les trois mesures se font désormais dans le couloir
  vide de la v237 (30 000, 30 000), sans ville ni convoi ni bête, ce qui les
  rend comparables par construction — la troisième se compare à la première.
  C'est la sœur de « un témoin de conduite part d'une rue sans voiture à
  portée » (v252, v259), du côté de la MARCHE.
- **ET MA PREMIÈRE EXPLICATION ÉTAIT COMMODE ET FAUSSE.** J'avais accusé MON
  témoin voisin, qui gare une voiture devant l'enfant et ne la rangeait pas :
  l'histoire se lisait très bien, je l'ai écrite dans un commit, et le rouge a
  persisté après le nettoyage. Ranger sa voiture reste juste — un témoin qui
  pose un obstacle le retire — mais ce n'était pas la cause. **Une explication
  qu'on n'a pas mesurée est une dette, pas un diagnostic** (v220), y compris
  quand elle accuse son propre code.
- **ET C'EST UNE FAMILLE, PAS UN ACCIDENT : TROIS TÉMOINS DE LA MÊME SUITE
  MESURAIENT L'ENDROIT OÙ LE PRÉCÉDENT S'ÉTAIT ARRÊTÉ (v279).** Un second
  passage de `monte.js` SEULE, sur un code de jeu inchangé, a retourné deux
  verdicts de plus — et les deux avaient la forme de `contreLeMur`.
  - **Le piéton contre la voiture** marchait depuis la position ET LE CAP où le
    témoin du flanc avait fini ses quatorze secondes de conduite : arrivée
    −1,18 au premier passage, −4,19 au second, `fige` atteint après NEUF
    DIXIÈMES de seconde de jeu à 4,19 blocs de la voiture. Il ne mesurait pas
    une carrosserie, il mesurait où la conduite d'avant avait buté. C'est la
    troisième occurrence de « une mesure de déplacement s'assure qu'elle a la
    place de se déplacer » (v273), et le remède est le même : le couloir vide de
    la v237, un cap DEMANDÉ (`capDegage`) au lieu de celui qu'on a reçu, et la
    voiture INVOQUÉE là plutôt que déplacée — déplacée, elle garderait la cote
    qu'elle avait à Paris.
  - **La circulation qui cède** est « pas si l'on est déjà dedans » vu du côté
    du témoin. Vert QUATRE passages de suite avec zéro relevé au travers, il en
    a rendu 51 sur 214 au cinquième, une voiture étant à portée dès la première
    seconde. Or le jeu laisse EXPRÈS continuer une voiture déjà dans la nôtre —
    attendre là, c'est y rester pour toujours — et la v245 avait déjà vu ce
    témoin se poser sur une file et compter quatre-vingts relevés « au travers »
    dès la première image. On note donc qui chevauche AU PREMIER RELEVÉ et l'on
    n'en compte aucun : une voiture déjà dedans ne peut rendre aucun verdict, ni
    dans un sens ni dans l'autre. Quand la pose est propre l'ensemble est vide et
    le témoin est mot pour mot celui d'avant ; les deux nombres entrent dans le
    message, sinon le rouge suivant ne se démonte pas.

  **Et ce que ces trois-là apprennent ensemble vaut plus que chacun : DANS UNE
  SUITE, LA SITUATION DE DÉPART D'UN TÉMOIN EST CE QUE LE TÉMOIN D'AVANT A
  LAISSÉ, ET CELA NE SE VOIT PAS EN LE LISANT.** Le fichier se lit comme une
  liste de mesures indépendantes ; il ne l'est pas. Tant qu'aucune n'est rouge,
  l'héritage passe pour une économie de gestes. Un témoin qui mesure une
  DISTANCE, une DURÉE ou une POSITION se place donc lui-même — et « se placer »
  veut dire les trois choses à la fois : l'endroit, le cap, et ce qui traîne
  autour (bêtes, voitures, convois). C'est le pendant, à l'échelle d'une suite,
  de « une dépendance implicite entre deux témoins voisins est invisible tant
  que le premier dort » (v277).
- **ET UNE BARRE RELEVÉE DANS UNE VILLE NE VAUT PAS DANS UNE AUTRE (v279).**
  Le témoin du sol des passants exigeait quatre cinquièmes SUR LE TROTTOIR,
  chiffre mesuré à Paris (21 sur 21) : à Rome, la ville que le banc peuple, il
  rend 14 sur 21 — ROUGE sur la correction qu'il devait garder. Les sept autres
  n'étaient pas au milieu de la rue : cinq sur une esplanade ou de l'herbe, que
  `posteAutour` accepte en dernier recours et pour qui le programme de flâneur
  est le bon. **Ce qui se compte est ce que Max a signalé** — « plantés au
  milieu de la chaussée » —, donc la part SUR LA CHAUSSÉE : Rome 57 % et 48 %
  avant, 9,5 % après ; Paris 50 % avant, 0 % après. C'est le cousin de « un
  témoin qui porte une dimension de ville ne l'écrit pas, il la demande »
  (v203, v271, v274) : ici ce n'était pas une dimension mais une BARRE, et elle
  se pose sur la grandeur que la plainte nomme, pas sur son complément.
- **ET « LA CHAUSSÉE » N'EST PAS LE MÊME BLOC PARTOUT.** Rome roule sur
  `ASPHALT`, Paris sur `ARCHI.PAVE` — que la v248 avait justement fait entrer
  dans `CHAUSSEE` pour poser ses réverbères. Un classement qui ne connaîtrait
  que l'asphalte déclarerait Paris parfait sans rien mesurer.
- **ET UN TÉMOIN QUI MESURE UN DÉPLACEMENT SE MET LÀ OÙ LE MONDE VIT.** Celui de
  la marche des passants suit un témoin qui laisse l'enfant dans une scène
  d'essai, loin de toute ville : aucun passant n'y est animé, et le verdict
  aurait été rouge des DEUX côtés en ne mesurant rien. Il se pose au barycentre
  de la troupe, puis rend l'enfant à sa place — le geste du témoin de la v243,
  à l'échelle d'une ville.

---

## Le conteneur a été recréé sur un vieux commit — sept fois

**C'est désormais automatique.** `.claude/hooks/session-start.sh` tourne au
démarrage de chaque session et fait trois choses :

1. **Récupère la bonne révision.** Si la branche est en retard sur `origin/main`
   et ne porte aucun commit non fusionné, elle est remise à jour. Les
   modifications non enregistrées — le conteneur périmé revient toujours avec
   `src/nice.js` modifié — sont **mises en remise** (`git stash`), jamais
   effacées : sans cela le garde-fou ne se déclencherait jamais dans le seul cas
   qui compte.
2. **Installe les dépendances du banc** si `tests/node_modules` manque.
3. **Rappelle ce qui était en cours**, depuis `TASKS.md`.

Il refuse d'agir dès que la branche porte des commits non fusionnés : du travail
en cours ne se jette pas, même vieux.

**La cause racine, elle, est côté environnement** : la session est reclonée sur
une révision figée (04b3e72, v138) au lieu de la branche par défaut. Cela se
règle dans les réglages de l'environnement sur claude.ai — le crochet est un
filet, pas un remède.

**Et ce qui se perd sans bruit** : la liste de tâches de la session vit dans le
conteneur et part avec lui. C'est arrivé deux fois. Ce qui compte assez pour
être suivi va donc dans `TASKS.md`, versionné.

### Deux arbres de travail sur la MÊME branche, et l'index qui ressuscite

Symptôme, vu trois livraisons de suite (v210 à v212) : la livraison est
fusionnée, la production sert la bonne version, et le crochet de fin annonce
pourtant « uncommitted changes ». Le `git diff --cached` montre alors le
RETRAIT de ce qu'on vient de livrer — `CACHE_VERSION` qui redescend d'un cran,
des centaines de lignes supprimées. **Le pousser aurait annulé la livraison.**

La cause n'est ni le crochet ni un travail oublié : **la même branche était
extraite dans trois arbres de travail** (`/home/user/minecraft`,
`/root/v205`, `/root/main-ref`). Quand l'un d'eux avance la branche —
`git checkout -B <branche> origin/main` après la fusion — les autres gardent
leur index et leur arbre sur l'ancien contenu. Par rapport au nouveau HEAD,
cet index périmé EST exactement le retrait de la livraison.

Trois règles :

- **Une branche ne vit que dans UN arbre.** Le répertoire principal la garde,
  parce que c'est lui que le crochet de fin inspecte. Les arbres d'appoint
  travaillent en HEAD DÉTACHÉ et poussent explicitement
  (`git push origin HEAD:refs/heads/<branche>`).
- **`main-ref` est détaché sur `origin/main`, jamais sur la branche.** C'est sa
  seule raison d'être : mesurer un témoin sur l'ancien code. S'il porte la
  branche, il ne mesure plus rien — et il salit l'index des autres.
- **Devant un « uncommitted changes » de fin de tâche, on LIT le diff avant de
  commiter.** S'il retire ce qu'on vient de livrer, c'est un index périmé :
  `git reset -q && git checkout -- .`. On ne pousse jamais un diff qu'on n'a
  pas regardé.
- **Et le nettoyage se fait avec `git -C <chemin>`, jamais avec un `cd` de la
  ligne d'avant.** Les lignes d'un même appel au terminal HÉRITENT du
  répertoire courant : un « nettoyage du répertoire principal » écrit sous un
  `cd` vers l'arbre d'appoint nettoie l'arbre d'appoint, et l'on croit avoir
  réglé ce qu'on n'a pas touché. C'est ce qui a fait revenir ce symptôme trois
  fois de suite.

### L'ancien réflexe, si le crochet n'a pas tourné

Symptôme : le travail des heures précédentes a « disparu ». Ce n'est pas une
perte, c'est un arbre périmé.

**Avant toute édition, en début de session :**

```bash
git log --oneline -1 && grep -m1 CACHE_VERSION sw.js
```

Si la version ne correspond pas à la dernière publiée :
`git fetch origin main && git checkout -B <branche> origin/main`.

---

## Architecture — décisions et raisons

### Manhattan dans la Terre (`manhattan-*.js`, v240)

Max demande explicitement une seule carte — et pas de raccourci qui en ait
l'air : le bouton « Explorer New York » de l'accueil a été retiré en v242 (« il
n'y a qu'une seule carte et ça doit rester le cas »). On rejoint New York par
la carte du monde, comme toute ville. `TerreUrbaine` remplace
`ManhattanWorld` dans main et étend le générateur historique `World` sans
modifier ses empreintes. Le plan local est ancré par `positionDe('ny')` et
comprimé horizontalement à 40 %. Son influence est bornée par `BORNES` ;
Boston, Montréal et Washington restent hors de son emprise. Rendu local,
physique, réseau et sauvegardes en coordonnées absolues de la Terre.

Les contextes et canaux de jeu sont désormais `local` / code court, sans
préfixe de carte. Les anciens journaux restent en archive et sont importés
par translation rigide. Ne jamais les réduire à l'échelle du plan : une
construction est un assemblage de blocs entiers. Les conflits déplacent le
journal entier ; aucune case de Terre n'est écrasée. Les supports historiques
et les marques d'import voyagent DANS le journal, pas dans une clé locale
qui serait perdue sur un autre appareil. Le troisième élément des entrées
porte la provenance ; les messages réseau d'opération et de lot la gardent.
Un bloc neuf ne doit jamais être pris pour un bloc historique et faire
disparaître les bâtiments autour. `tests/manhattan.js` garde ces invariants,
l'idempotence, les archives cloud et l'absence de résurrection après effacement.

Un changement de contexte invalide façades et sol. Les bâtiments superposés
aux supports anciens sont retirés des deux niveaux de détail. Les blocs
posés passent par le mailleur ordinaire, les originaux intacts par le renderer
urbain ; retirer un bloc doit retirer aussi sa géométrie visible. Les niveaux
de retraits sont partagés entre collisions et rendu. L’éclairage reprend exactement l’orbite de `sky.update`, puis place la
lumière par rapport au joueur ; la direction du disque solaire et celle des
ombres doivent rester identiques. Importer le journal cloud avant de restaurer
une position ancienne : les marques choisissent le décalage du chantier.

Les humains modernes et les avatars partagent les formes de `personnages.js`.
Conserver les pivots `arms` / `legs`, les personnalisations et accessoires.
Les modèles de taxi sont originaux (`taxis.js`) et leur fabrique est déclarée
dans FLOTTE : un identifiant local n'est pas un fichier GLB à télécharger.
Le chargeur conserve l'identité du modèle en circulation, conduite et garage.

Le budget tablette réduit détails, secteurs, ombres et pixels. Les silhouettes
sont instanciées ; les façades sont construites par tranches. Les ressources
partagées restent marquées comme telles. Mesurer Chromium natif séparément du
rendu logiciel ; ne jamais présenter l'émulation comme une mesure Safari iPad.
Le catalogue de la carte recale ses anciens repères nommés depuis `LIEUX`.
Les témoins géographiques se calculent depuis le plan courant : aucun pas de
rue, cadrage ou point de fleuve recopié de la carte précédente. La grille de
1811 s’arrête à la 14e Rue ; les trames du sud et les circuits tournent ensemble.
Les gardiens du plan incluent `carte.js` et `carteMonde.js`.
Voir `docs/manhattan.md` pour les limites, les archives et les licences.

Le paramètre de banc `cloud=` doit désactiver le cloud même avec une valeur
vide : tester sa présence (`has`), pas la vérité de sa valeur (`get`). Sans
cela un essai local utilise à tort le backend public.

### Le jeu à plusieurs (`net.js`, `relaisnuage.js`, `cloud.js`)

Le diagnostic de relais reste acquis pendant une `NetSession`. Il ne se
réinitialise pas dans `connectToHost` : à vingt secondes, le battement peut
ouvrir une reconnexion avant l’expiration de la tentative initiale et effacer
la preuve qu’un relais avait répondu. Le scénario VPN de `reseau.js` couvre
cette course. Une nouvelle ouverture construit une nouvelle session.


Trois chemins, du plus rapide au plus obstiné :

1. **Lien direct WebRTC** via le courtier PeerJS.
2. **Relais par le nuage** — les tablettes déposent leurs messages dans une
   table Supabase et relisent ce qui leur est adressé. Plus lent, mais passe
   partout où la page se charge (Wi-Fi d'hôtel, école, gare).
3. **Sans courtier du tout** — le nuage porte la présentation *et* la partie.

Décisions qui ont chacune coûté une panne réelle :

- **Configuré n'est pas joignable.** Le nuage est « configuré » sur tous les
  appareils : c'est une adresse écrite dans la page, pas une garantie. Toute
  bascule vérifie d'abord que le relais répond (course de 3-4 s), sinon un
  enfant hors ligne se retrouve dans un monde silencieux — pire que le refus.
- **Le phare de l'hôte.** Un hôte qui vit par le nuage est invisible du
  courtier. Il écrit donc une ligne toutes les 15 s. Sans elle, un invité dont
  le courtier répond « introuvable » **ouvrait le monde à son tour** : deux
  mondes jumeaux sous le même code, qui divergent en silence. L'hôte éteint son
  phare en partant, sinon il ne peut plus rouvrir son propre monde.
- **Une session arrêtée ne frappe à aucune porte.** Les tentatives abandonnées
  laissaient des minuteries qui ouvraient le relais et raccrochaient 2 ms plus
  tard. Vu en production. Tous les chemins de bascule sont gardés par
  `if (!this.active) return`.
- **L'appareil signe son identité en ligne** (`dev-<appareil>-<hasard>`), ce qui
  permet à un enfant d'effacer **ses propres** fantômes en entrant dans un monde
  — jamais ceux des autres. La purge se fait à l'entrée, pas à l'ouverture du
  relais : sinon elle ne s'exécutait que pour les parties passant par le nuage.
- **Un lien qui n'est pas encore OUVERT ne chasse pas un lien qui marche.**
  Chez l'invité, le lien direct et le lien de secours portent la MÊME clé —
  l'identifiant de l'hôte —, donc la même case. `connectToHost` inscrit sa
  tentative avant qu'elle ne s'ouvre, à dessein (sinon on rate les premiers
  messages) ; mais si le pair-à-pair est mort à la racine, elle ne s'ouvre
  jamais et prenait quand même la place du nuage. Chaque reconnexion rechassait
  le secours qui venait de marcher. La promotion inverse existait déjà
  (`promouvoirSiDirect`) : elle était court-circuitée, la case ayant changé de
  main avant l'ouverture. C'est `open` qui donne la main au direct, jamais
  l'inscription.
- **C'est le receveur qui cède**, pas l'émetteur : le fantôme tourne du vieux
  code et ne peut obéir à une règle qu'il ne connaît pas.
- **CE QUI S'ARRÊTE S'ANNONCE, CELA NE S'ATTEND PAS D'UN ÉVÉNEMENT DE
  TRANSPORT (v219).** Éteindre sa caméra fermait les appels sortants et
  comptait sur le `close` de la connexion média de PeerJS pour prévenir
  l'autre. Il ne traverse pas : la vignette d'Alice restait chez Marlon, piste
  vidéo à 0 × 0 mais présente, et sa piste audio ni arrêtée ni muette. Deux
  choses à retenir. D'abord, **le remède était déjà dans le fichier** : le
  chemin du NUAGE annonçait sa fin par le tuyau des blocs, et c'est pour cela
  que son témoin était vert quand celui du direct était rouge — quand deux
  chemins font la même chose et qu'un seul marche, le bon est écrit à côté.
  Ensuite, **un message de fin garde son ancien NOM** (`photo-fin`) : une
  tablette restée sur l'ancienne version le comprend et nettoie au moins ce
  qu'elle sait, là où un nom neuf tombe dans le vide — c'est la règle du
  receveur qui cède, appliquée au vocabulaire.

### Un avion ne se pose pas dans l'eau, et ce qu'on affiche n'est pas ce qu'on parcourt (v267)

Max : « un avion ne peut pas atterrir dans l'eau. Et peut-être fake la vraie
vitesse, mais quand ton avion de chasse vole, il devrait voler à une vitesse
supersonique ; idem, un Concorde, ça ne vole pas à 500 km/h. » Quatre règles.

- **`sommetColonne` REND LE PREMIER BLOC SOLIDE, ET L'EAU N'EN EST PAS UN.**
  Au-dessus de la mer, elle rend donc le FOND, et l'atterrissage y descendait
  tranquillement. Mesuré au large de Nice : posé à y = 25 sous CINQ blocs
  d'eau, état `sol`, à rouler au fond de la Méditerranée. Toute logique qui
  cherche « le sol » pour y poser quelque chose doit demander en plus ce qu'il
  y a JUSTE AU-DESSUS — `getBlock(x, sommet + 1, z)`. C'est la sœur du piège
  des arbres à plat : une fonction qui répond juste à une autre question.
- **DEVANT UNE PISTE IMPRATICABLE, ON REMET LES GAZ.** C'est le geste réel, il
  n'a rien de violent, et il donne à l'enfant quelque chose à faire — la règle
  des messages de la maison. L'appareil repasse en `vol`, remonte, et le jeu
  dit d'aller vers la terre. L'atterrissage MANUEL a son propre plancher
  (`PLANCHER_EAU`, trois blocs au-dessus de la surface) : manche en avant
  au-dessus de la mer, on ne coule pas. Et la recherche du fond est bornée en
  altitude (`GARDE_EAU`) — `sommetColonne` descend colonne par colonne, c'est
  inutile à cent blocs.
- **CE QU'ON AFFICHE N'EST PAS CE QU'ON PARCOURT, ET C'EST HONNÊTE.** Le
  compteur faisait `blocs par seconde × 3,6`, c'est-à-dire un bloc pour un
  mètre. **Un bloc ne vaut un mètre nulle part dans ce jeu** : trente à
  quarante au sol dans une ville, cent quatre-vingt-sept sur la carte du
  monde. Le compteur mentait donc DÉJÀ, dans le sens qui rapetisse tout. La
  vraie croisière vit dans la fiche (`pilote.kmh`) et l'affichage en prend la
  fraction de `max` atteinte. Ce qui se DÉPLACE reste borné par ce que le
  monde sait mailler — `max`, mesuré en v265 — et cette borne-là ne se
  contourne pas.
- **LES CHIFFRES SONT CEUX DES VRAIS APPAREILS.** Long courrier Mach 0,85
  (900 km/h), Concorde Mach 2,04 (2 180), chasseur moderne Mach 1,8 (2 200) :
  les deux rapides se retrouvent à égalité DANS LE RÉEL AUSSI, ce que la v229
  avait décidé pour de tout autres raisons. Passé Mach 1 (1 235 km/h), la
  petite ligne du compteur troque son unité contre le nombre de Mach.
- **ET UNE SONDE QUI JUGE UN TERRAIN DIT OÙ ELLE ÉTAIT.** Mon premier jet
  volait vers -z, c'est-à-dire vers Nice : l'appareil rejoignait la côte en
  descendant et s'y posait très bien, et la sonde concluait « tout va bien »
  sans avoir jamais mesuré d'eau — elle ne relevait même pas sa position.
  C'est « une sonde de déplacement vérifie d'abord qu'elle s'est déplacée »,
  vue de l'autre bout : le point de DÉPART ne dit rien du point d'ARRIVÉE.

### Le silence ne prouve le départ que d'un pair qu'on ne peut pas sonder (v266)

Le défaut allait et venait sur les DEUX arbres depuis la v259 : « à trois,
chacun voit les deux autres » rendait `[["Alice"],["Marlon"],["Alice","Marlon"]]`
une fois sur deux. Six livraisons l'ont déclaré sans le trouver. Quatre règles
en sortent, et la première est une méthode.

- **UNE SONDE PAR QUESTION, ET L'ON NE PASSE À LA SUIVANTE QU'APRÈS AVOIR
  RÉPONDU.** Trois sondes, trois questions : (1) le lien de l'arrivant est-il
  vivant et l'hôte reçoit-il ce qu'il envoie ? — oui, direct, `open`, canal
  `open` ; (2) une page dort-elle ? — non, les trois sont `visible` d'un bout
  à l'autre, zéro `dodo` ; (3) alors pourquoi n'émet-il rien ? — **son fil
  principal est bloqué VINGT-NEUF SECONDES dans une SEULE tâche** pendant que
  son monde se charge. Pas médian de son minuteur de 100 ms : 100 ms. Pire
  tour : 29 128 ms. Chacune des deux premières réponses a écarté une
  explication qui « se lisait très bien » ; aucune ne se déduisait de l'autre.
- **UNE SÉRIE DE RELEVÉS MENT SUR SON PROPRE PAS.** Ma deuxième sonde
  échantillonnait « une fois par seconde » et rendait une courbe qui
  contredisait ses propres compteurs. L'échantillonneur était affamé lui
  aussi : ses relevés étaient espacés de cinq à quinze secondes. **Un
  échantillonneur posé dans la page qu'on soupçonne de ramer horodate chaque
  relevé** — sinon « il n'envoie rien » et « son minuteur ne tourne pas » ne
  se distinguent pas.
- **UN CANAL DIRECT OUVERT EST UNE SONDE ; LE SILENCE N'EN EST PAS UNE.** La
  règle des vingt secondes (`STALE_MS`) avait été écrite POUR les pairs
  relayés — son commentaire le dit — puis appliquée à tout le monde, y compris
  à un pair dont le canal est grand ouvert sous les yeux de celui qui le juge.
  Le silence ne retire donc plus qu'un pair qu'on ne peut pas sonder : un
  relayé, ou un lien de nuage. Pour les autres, le ping reste le filet — son
  échec retire le pair tout de suite — doublé d'une borne courte
  (`MUET_MAX_MS`, 90 s : le double des 45 s que le jeu s'accorde pour préparer
  une partie, trois fois le blocage mesuré). Cinq minutes, le délai d'un
  enfant endormi, serait trop long dans l'autre sens : un invité dont l'hôte
  est mort doit repartir en chercher un autre, pas attendre.
- **L'HÔTE ANNONCE AVANT QUE LES AUTRES NE CONCLUENT.** Mon premier jet
  marquait le pair « muet » au même seuil que celui du retrait : les deux
  horloges se déclenchaient ensemble et l'autre invité perdait la course une
  fois sur deux — mesuré, l'hôte gardait Nina et Alice la retirait quand même.
  L'annonce se fait à la MOITIÉ du délai. Et elle se fait avec le mot que les
  tablettes connaissent DÉJÀ (`dodo_de` / `coucou_de`, « il est là, ne comptez
  plus son silence ») : une tablette restée sur l'ancienne version le comprend,
  c'est la règle du receveur qui cède appliquée au vocabulaire.
- **ET LE TÉMOIN GÈLE LA PAGE AU LIEU D'ATTENDRE QU'ELLE RAME.** Vingt-cinq
  secondes de boucle synchrone lancées par un minuteur — `evaluate` ne peut
  pas attendre une page qu'il vient de geler — rendent la MÊME situation à
  tous les coups. C'est la leçon des poissons de la v233 : quand un témoin
  change de verdict d'une exécution à l'autre, on cesse d'attendre la
  situation et l'on se met à la provoquer. Rouge sur `origin/main` (le joueur
  disparaît pour les deux autres, ET lui-même perd tout le monde), vert deux
  fois de suite sur la correction.

### Conduire — trois façons d'être porté, un seul jeu de commandes

Idée de Max, et elle est juste : **ne pas inventer de commandes**. Tout ce qui
fait bouger l'enfant se réduit à trois nombres, lus dans `player.update()` :
`forward` (avant/arrière), `strafe` (gauche/droite) et `yaw` (le regard). Le
clavier et le joystick tactile alimentent les mêmes. Conduire, c'est brancher
ces trois nombres sur autre chose que des jambes — donc rien de neuf à
apprendre pour un enfant, et l'iPad marche sans une ligne de plus.

Trois modes, dont deux existent déjà :

1. **`monture`** — la bête suit le joueur, qui marche normalement. La caméra
   s'élève à la hauteur du dos. *(fait, v155)*
2. **`bord`** — le convoi suit son tracé précalculé, le joueur est collé au
   siège et ses commandes sont ignorées. Métro, monoplaces. *(fait, v155)*
**Et depuis v194, TOUTE voiture de la ville se conduit.** Le bouton
« Monter à bord » est devenu « Conduire cette voiture » : elle sort du convoi
et devient une monture, avec son modèle — les voitures de ville tiraient déjà
dans la flotte, elles retiennent désormais lequel. La circulation perd une
voiture, et c'est honnête : l'enfant vient de la prendre. Le métro et les
monoplaces gardent l'embarquement : on ne conduit pas un métro.

3. **`pilote`** — **fait en v223.** C'est le seul des trois où l'enfant décide
   où l'on va. Et il ne s'est PAS fait comme cette ligne l'annonçait : le
   véhicule n'a pas sa propre position. Il reste COLLÉ au joueur, comme toute
   monture, et c'est la MARCHE du joueur qu'on remplace par une physique de
   vol. Le gain est considérable et c'est la leçon : le réseau (qui diffuse
   déjà la position des joueurs), la caméra de poursuite, la boîte de
   collision et le bouton d'embarquement marchent alors sans une ligne de
   plus. **Une seconde position aurait tout fait payer deux fois.**

   **ET LES COMMANDES ONT CHANGÉ EN v228, SUR VERDICT DE MAX.** « Le bouton
   avion le fait décoller, et le joystick manage la hauteur, direction,
   altitude, gauche droite. » La physique ci-dessous — manette des gaz sur
   `forward`, roulis sur `strafe`, assiette sur le regard — était juste comme
   physique et **impraticable pour un enfant de sept ans** : trois commandes à
   deviner, et il fallait comprendre qu'on décolle en prenant son élan puis en
   levant les yeux. Max, dans le Concorde : « il ne décolle pas ».

   Ce qui vaut désormais : **✈️ décolle** (montée automatique de vingt blocs,
   au-dessus des terminaux et des tours de contrôle — sinon le bouton ne fait
   que lancer les moteurs et l'appareil roule au ras du sol), **le joystick
   tient l'altitude et le cap**, la vitesse est automatique, le regard est
   libre. Un second appui se pose. Deux leçons :

   - **UN BOUTON QUI NE FAIT RIEN EST PIRE QU'UN BOUTON QUI REFUSE.** Aux
     commandes, ✈️ appelait `toggleFly()`, qui RÉUSSISSAIT et basculait
     `player.flying` — un drapeau que la branche de pilotage ignore
     complètement. Aucun effet, aucun message. J'ai d'abord annoncé à Max que
     le bouton répondait « une voiture ne vole pas » : c'était faux,
     `interdireVol` n'est jamais posé pour un appareil (`vole: true`). **Avant
     d'accuser un message, on vérifie qu'il est atteint.**
   - **CE QUI REND LE CARACTÈRE, C'EST LA FICHE, PAS LA COMMANDE.** La vitesse
     devenue automatique, ce sont `max` et `virage` qui distinguent encore les
     trois appareils : 110 blocs/s contre 264, et un chasseur qui vire trois
     fois plus court que le Concorde. On peut simplifier les commandes sans
     effacer les différences.

   Quatre décisions de physique, chacune pour une raison :

   - **La poussée SE GARDE quand on lâche.** `forward` est une manette des
     gaz, pas une pédale : c'est ce qui distingue un avion d'une voiture, et
     ce qui permet à un enfant de lâcher les commandes pour regarder le
     paysage sans tomber.
   - **Le roulis ne fait virer qu'EN VOLANT** — un avion à l'arrêt sur le
     tarmac ne pivote pas sur place, exactement comme le volant d'une voiture.
   - **La portance dépend de la vitesse.** Sous le décrochage, l'avion
     descend, d'autant plus vite qu'il est lent : c'est ce qui oblige à
     prendre son élan sur la piste avant de tirer sur le manche.
   - **Le nez suit le regard**, l'assiette est le tangage.

   **ET UN VIRAGE SE VOIT, SINON IL N'EXISTE PAS (v231).** Max : « quand on
   va à gauche, il tilte un peu ». L'appareil tournait à plat — le cap
   changeait, rien ne le montrait, et un virage ressemblait à une maquette
   qu'on pousse sur une table. L'inclinaison est PUREMENT visuelle : elle ne
   touche ni au cap ni à la trajectoire, et elle s'installe et se rend
   progressivement, à la VIVACITÉ de la fiche — un chasseur s'incline sec, un
   Concorde prend son temps. Trois choses à savoir avant d'y toucher :

   - **L'inclinaison se compose AVANT le cap** (`rotation.order = 'YXZ'`),
     sinon l'appareil bascule autour de l'axe du MONDE et non du sien : en
     virage serré on le verrait pencher de travers.
   - **Elle vit sur le maillage de la MONTURE, dans `fun.js`**, pas sur le
     joueur. C'est pour cela qu'un témoin qui pose `player.pilote` à la main —
     ce que font les témoins de vitesse — ne peut RIEN en voir : il fait voler
     le joueur sans qu'aucun avion ne soit dessiné. On monte par le bouton.
   - **UN SIGNE SE REGARDE, IL NE SE DÉDUIT PAS.** Une inclinaison à l'envers
     — l'appareil penché vers l'EXTÉRIEUR du virage — est pire que pas
     d'inclinaison, et aucune mesure d'amplitude ne la distingue de la bonne.
     Deux captures, un virage à gauche et un à droite, AVANT d'écrire le
     témoin. Même discipline que la voiture, qui a roulé phares vers
     l'arrière toute une version.

   **LES VITESSES ÉTAIENT DES RAPPORTS RÉELS — LE STREAMING A EU RAISON D'EUX
   (v229).** 900 km/h pour un avion de ligne, 2 180 pour le Concorde : le
   rapport est de 1 à 2,4, et il a gouverné les vitesses jusqu'à ce que Max
   signale « les jets volent trop vite, la carte n'arrive pas à suivre et ça
   rame ».

   **CE QUI PLAFONNE UN MONDE QUI SE CHARGE, C'EST SON DÉBIT DE MAILLAGE, ET
   IL SE MESURE.** Le monde maille 154 morceaux par seconde ; voler à la
   vitesse v en réclame `1,5 × v` — la largeur du front de chargement
   (`2 × RENDER_RADIUS`) multipliée par les morceaux franchis par seconde. À
   264 blocs/s il manquait un facteur cinq, et l'enfant volait littéralement
   dans le vide : deux appels de dessin par image.

   Le critère ne se lit pas en pourcentage mais en BLOCS, devant soi — à
   quelle distance commence le paysage pas encore maillé. Médiane sur six
   relevés, à la distance d'affichage de l'iPad : **95 b/s → 132-137 blocs ·
   110 → 125-138 · 170 → 51-86 · 264 → 32-51**. Le plafond est cent dix.

   **Décision de Max, devant le choix : tout le monde autour de cent.** 95
   pour l'avion de ligne — l'ancre absolue reste le vol libre de l'enfant,
   88 blocs/s, sinon prendre l'avion ne sert à rien — et 110 pour le Concorde
   et le chasseur, qui se distinguent désormais par leur AGILITÉ seule (trois
   fois la poussée, trois fois le taux de virage). Le rapport tombe à 1,16 :
   c'est une perte réelle, déclarée dans `TASKS.md`, et **le seul moyen de la
   reprendre est de mailler plus vite** — 45 % du coût est la génération du
   relief — jamais de réécrire ce paragraphe.

   Trois choses apprises en le mesurant, et les trois se reprennent :

   - **UN BUDGET SOUS LE COÛT D'UNE SEULE UNITÉ NE BORNE RIEN.**
     `MESH_BUDGET_MS` valait 6 quand un morceau en coûte 5,4 : la boucle en
     maillait un, regardait l'heure, en maillait un second et s'arrêtait. Le
     débit était donc figé à deux par image, quoi qu'on écrive. Porté à 12 —
     mesuré, même page, même point : 76 → 154 morceaux/s **sans coûter une
     image** ; 20 en rend 178 et coûte un tiers de la cadence. C'est mot pour
     mot le seuil de charge du banc en v225, et c'est la troisième fois : une
     constante de seuil se règle sur le coût MESURÉ de ce qu'elle laisse
     passer.
   - **LE BANC OUVRE LE JEU À `rr=2`, ET UN TÉMOIN DE CHARGEMENT Y EST VERT
     QUOI QU'IL ARRIVE.** Le brouillard y commence à dix-huit blocs et le
     disque à charger fait douze cases : mon premier jet du témoin était vert
     sur `origin/main` à 264 blocs/s. `banc.joueur({ rr: 12 })` demande la
     valeur de l'iPad ; tout témoin qui éprouve le CHARGEMENT du monde doit
     la demander.
   - **UN FRONT DE CHARGEMENT EST IRRÉGULIER : UN INSTANTANÉ NE LE MESURE
     PAS.** Le même code m'a rendu 68, 91 puis 101 blocs sur trois lectures,
     et j'ai failli descendre les avions pour poursuivre un chiffre qui
     bougeait tout seul — à 140 il rendait MOINS qu'à 170. Six relevés à une
     seconde d'intervalle et la médiane : la distribution se sépare alors
     nettement (51-86 à 170 contre 125-138 à 110). C'est la règle « un témoin
     qui mesure une durée observe toute la fenêtre », appliquée à une
     distance.

   **`gabarit` n'est pas l'envergure.** Une boîte de collision ne tourne pas :
   à quinze blocs de large, un avion resterait coincé entre deux hangars et ne
   pourrait pas même rouler sur sa piste. On prend la largeur du FUSELAGE, les
   ailes débordent — c'est la leçon de la voiture (v212), et un avion passe
   l'essentiel de sa vie là où rien ne le frotte.

   **Et le temps d'accélération d'un témoin vient de la FICHE.** Mon premier
   jet donnait quatre secondes à tout le monde et concluait que l'avion de
   ligne n'atteignait pas sa vitesse : à 18 blocs/s², quatre secondes font 73,
   ce que la fiche annonce exactement. La mesure était trop courte, pas la
   physique. `max / poussee`, jamais un chiffre rond.

Le caractère de chaque véhicule vient du **branchement**, pas d'un moteur
séparé :

| Véhicule | `forward` | `strafe` | Le regard |
| --- | --- | --- | --- |
| Voiture | accélérateur / frein, avec inertie | volant — l'angle de braquage n'agit qu'en roulant, on ne pivote pas à l'arrêt | libre, découplé du cap |
| Avion | poussée | roulis | assiette (tangage) ; la portance dépend de la vitesse |
| Bateau | poussée | gouvernail, mou et lent à répondre | libre |

Les deux difficultés réelles, à ne pas découvrir en route :

- **Le véhicule a sa propre boîte de collision — FAIT en v212.** Celle du
  joueur fait 0,6 bloc de large ; une voiture en fait 2,26, et elle traversait
  donc les murs tant que son point central restait dans la rue. Max l'a
  signalé en capture — « cars crashing into walls », une voiture encastrée
  dans une façade haussmannienne — quatre versions après que cette ligne eut
  été écrite ici. Trois choses en sortent :
  **la largeur vit dans la fiche de l'espèce** (`gabarit`), à côté de
  `montable`, `nourrissable` et `vole`, jamais dans une liste de `fun.js` ;
  **la boîte prend la LARGEUR, pas la longueur**, parce qu'une AABB ne tourne
  pas et que 4,4 blocs ne passeraient dans aucune rue même en roulant droit
  (une voiture en travers mord donc encore un peu, et c'est bien moins cher
  qu'une voiture fantôme) ; et **on la rend en descendant**, sinon l'enfant
  garde à pied la carrure d'une voiture et se retrouve coincé entre deux murs
  — c'est le second témoin de `monte.js`, vert des deux côtés à dessein.
- **Une dette écrite n'est pas une dette vue.** Celle-ci attendait depuis la
  v155 dans ce fichier, sous les yeux de chaque session, et c'est une capture
  d'iPad qui l'a fait remonter. Ce qu'un témoin ne garde pas, personne ne le
  garde.
- **Un véhicule conduit doit se voir en ligne.** Le réseau diffuse aujourd'hui
  la position des *joueurs*. Si Marlon conduit et qu'Alice ne voit qu'un enfant
  qui glisse à toute vitesse, la moitié du plaisir est perdue. La position du
  véhicule et son pilote font partie de ce qui voyage.

### Les garages, et ce qui dure d'une session à l'autre

Le bestiaire ne survit à rien : aucune bête n'a jamais été enregistrée, elles
repeuplent le monde à chaque lancement. **Une voiture garée est donc une ligne
de sauvegarde, pas une créature qui dort** — `src/garages.js` l'écrit dans le
profil de l'enfant, à côté de ses blocs, rangée par monde et horodatée pour
que deux tablettes se fusionnent sans se contredire.

Trois choses à savoir avant d'y toucher :

- **Le garage est repéré par sa POSE, pas par ses blocs.** Chercher dans le
  monde ce qui ressemble à un garage serait fragile et lent. Quand la
  bibliothèque pose un bâtiment marqué `garage`, on note son emprise une fois
  pour toutes. Un enfant qui démolit son garage garde donc une place de
  parking invisible — c'est le prix, et il est bien plus petit que celui d'une
  voiture qu'on ne retrouve pas.
- **Ce qu'on inscrit, c'est l'ORIGINE DE L'AUTEUR, pas le centre de
  l'emprise.** Les deux diffèrent dès qu'un bâtiment déborde d'un côté — ici
  le seuil goudronné, qui tire l'emprise vers l'avant. Les places, elles, sont
  données par rapport à l'origine.
- **Le modèle voyage avec la voiture.** La flotte compte cinquante-trois
  modèles tirés au sort. Ranger « une voiture » rendrait une Twingo à la place
  d'une Bugatti : on retient le fichier du modèle, et `voitureNeuve(voeu)` le
  réclame à la sortie — avec repli sur le tirage si le fichier a disparu.

**Et un bâtiment qui déclare une façade PIVOTE.** `poserBati` posait tout dans
la même direction ; une porte de garage tournée vers le sud, c'est un enfant
qui fait le tour de son propre garage sans trouver l'entrée. La rotation se
fait par quarts de tour — à ce pas-là les coordonnées restent entières et
aucun bloc ne se perd — et seuls les bâtiments à façade y passent.

**Un véhicule ne vole pas**, et la règle vit dans la fiche de l'espèce
(`vole: false`), jamais dans une liste écrite dans `fun.js` — même discipline
que `montable` et `nourrissable`, dont l'oubli a déjà coûté des mois. C'est
`player.volInterdit` qui l'applique, parce que c'est là que le vol se décide.
Monter coupe le vol en cours ; descendre le rend.

### La voie ferrée : deux voies, et des rails en relief (v281)

Max, deux captures d'iPad : « les rails ne sont pas des rails, les trains se
rentrent dedans, il faut 2 rails pour aller et retour ». Trois défauts, trois
causes distinctes, et deux des trois leçons valent bien au-delà du rail.

- **UN DÉFAUT DE PLAN NE SE RATTRAPE PAS PAR UNE RÈGLE DE COLLISION.**
  `traceSegment` faisait l'aller puis le RETOUR SUR LES MÊMES POINTS : le tracé
  est une polyligne repliée sur elle-même, donc deux rames en `s` et en `L − s`
  sont au MÊME endroit, deux fois par tour, pour chaque paire. Ce n'est pas une
  intermittence qu'on attend, c'est une certitude qu'on SIMULE : distance
  minimale ZÉRO sur les neuf segments, 135 relevés à moins de quatre blocs. Le
  remède n'est pas de faire freiner un train devant l'autre — c'est de leur
  donner chacun sa voie. L'aller se décale d'`ENTRAXE` à droite de son sens de
  marche, le retour d'autant à droite du SIEN : la règle de la conduite à droite
  (v271) appliquée au rail. Mesuré après : 4,00 à 4,33 blocs, zéro relevé serré.
- **UN RAIL SE RECONNAÎT À SON RELIEF, ET IL NE PEUT PAS SE DESSINER DANS UNE
  TUILE.** La section était peinte à plat — gravier, obsidienne, planches, tout
  à la même cote — et se lisait comme un damier au fond d'une tranchée. La
  tentation est de régler cela par une TEXTURE, comme « une fenêtre est un
  DESSIN, pas un trou » (v202) : **c'est impossible ici, et la raison se
  généralise.** Une tuile n'a pas d'orientation ; les lignes sont des segments
  OBLIQUES entre deux villes ; des rails dessinés le long d'un axe seraient faux
  sur toute ligne en biais. Un motif qui doit suivre une direction ARBITRAIRE
  est de la géométrie, jamais une tuile.
- **UNE FILE SE RASTÉRISE, ELLE NE SE SEUILLE PAS.** Mon premier jet classait
  « rail » toute colonne dont l'écart à l'axe tombait dans une bande d'un bloc.
  Sur une ligne oblique, une bande de largeur fixe rend tantôt deux colonnes,
  tantôt zéro : cinq colonnes de rail en moyenne là où il en faut quatre. Une
  droite se trace sur une grille en parcourant son AXE DOMINANT et en
  arrondissant l'autre coordonnée — une colonne par pas, chaîne continue en
  diagonale. C'est la règle de tout trait posé sur des blocs.
- **ET MON RELEVÉ DE CONTINUITÉ ÉTAIT L'INSTRUMENT FAUTIF — il annonçait PIRE
  là où le code s'améliorait.** Il coupait la voie perpendiculairement à pas
  fixe : 229 trous sur 2 700 avant la rastérisation, 343 après. Un balayage
  perpendiculaire RATE des colonnes qu'une diagonale a bien posées. Une file se
  mesure EN LA PARCOURANT, le long de l'axe dont elle dépend : zéro bloc
  manquant sur 12 240. **Quand une mesure se dégrade alors que le code
  s'améliore, on soupçonne la mesure avant le code** — c'est « compter un motif
  n'est pas compter la chose » (v224), du côté de la sonde.
- **LA SECTION EST PUBLIÉE UNE FOIS.** `pieceDeVoie` est lue par `world.js`,
  qui pose les blocs, et par les témoins, qui les mesurent. Et `presDeLaVoie`
  DÉDUIT son dégagement d'`EMPRISE` au lieu de porter le chiffre qui datait
  d'une voie de trois blocs.
- **CE QUI EST COTÉ SUR UNE CONSTANTE QU'ON DÉPLACE SE DÉPLACE AVEC ELLE.** Le
  quai commençait « où la voie finit », à 1,9 bloc — juste tant que la voie
  s'arrêtait à 1,6, et faux dès qu'elle va à 4,5 : il aurait été bâti PAR-DESSUS
  une des deux voies. Les trois cotes de gare se déduisent donc de l'emprise.
  C'est le même piège que les mâts d'éclairage de Roissy, dans la même journée.
- **Et le relief ne bouge pas** : la voie est un ouvrage écrit en blocs depuis
  la v213, donc les deux empreintes de `plafond.js` sont intactes. Mesuré aussi
  qu'élargir ne touche rien : aucun aérodrome, le quartier des enfants à 365
  blocs, et la seule ville traversée reste Nagoya — que le Shinkansen traverse
  pour de bon, et qui l'était déjà.

### La voie ferrée (`trains.js`) — un ouvrage, pas une bande de gravier

Max, capture à l'appui : « train no rails, holes, no end stations ». Trois
leçons, et la première vaut pour tout ce qui se déplace sur un tracé.

- **UNE VOIE SE NIVELLE, ELLE NE SUIT PAS LE TERRAIN.** Le ballast était posé
  à la hauteur du terrain, colonne par colonne : mesuré ligne par ligne, la
  dénivelée entre deux colonnes voisines montait à VINGT-SEPT blocs. Ce sont
  les « trous » que Max a vus. C'est le même défaut que les convois de la
  v210, un cran plus loin : là on corrigeait la cote du véhicule, ici c'est
  l'OUVRAGE qui doit être plat.
- **Le lissage est un FILTRE EN CÔNE, et il garantit sa pente par
  construction.** `bas[k] = min sur j de h[j] + pente × |k − j|` se calcule en
  deux passes et ne descend jamais de plus de `pente` par bloc. Le cône du
  dessous ne fait que des tranchées, celui du dessus que des remblais ; leur
  MOYENNE garde la pente bornée et partage l'écart en deux. Mesuré : marche
  max 1 bloc, écart au terrain 13 au pire, 247 colonnes de remblai et 723 de
  tranchée sur 4 744. **Et l'ordre compte** : borner l'écart au terrain APRÈS
  le lissage détruit ce qu'on vient d'obtenir — le premier essai finissait par
  ce rabotage et rendait des marches de vingt-et-un blocs.
- **On ne touche PAS `terrainHeight`.** Le remblai et la tranchée sont des
  blocs écrits dans le morceau de monde, comme le métro de Washington : les
  deux empreintes de `plafond.js` ne bougent donc pas d'un octet, et
  l'invariant 1 tient sans qu'on ait rien à déclarer.
- **LA VOIE A LE DERNIER MOT SUR SA COLONNE.** Sans ce `continue`, une ville
  engendrée traversée par la ligne rebâtissait par-dessus les rails —
  vingt-sept colonnes d'immeuble en travers du Shinkansen. C'est mot pour mot
  le piège des arbres de ville, qui laissaient la trame générique repasser
  derrière. Et le dégagement des arbres est passé de trois à quatre blocs : une
  couronne plantée à trois blocs de l'axe déborde encore sur le train.
- **UN TÉMOIN QUI ÉCRIT UNE COTE DE GARE ACCUSE LE BÂTISSEUR À LA PREMIÈRE
  VOIE QU'ON ÉLARGIT (v281).** « Les dix-huit gares ont leur quai, leur auvent
  et leur bâtiment » écrivait ses cotes transversales — quai à 2,5 et 3,
  bâtiment à 4,5 et 6 — relevées quand la voie faisait trois blocs. La voie
  doublée porte `EMPRISE` à 4,5 et le quai à 4,7–7,7 : les cotes du témoin
  étaient toutes DANS le ballast, et il a rendu **zéro gare complète sur
  dix-huit** sur un bâtisseur juste, que son voisin déclarait bon au même
  instant. `GARE_LONG`, `QUAI_DEDANS`, `QUAI_DEHORS` et `BATI_DEHORS` se
  publient donc là où elles se calculent, et le témoin les demande. C'est « un
  témoin qui porte une dimension de ville ne l'écrit pas, il la demande »
  (v203, v271, v274, v279), appliqué à une GARE — et le signe qui l'a démonté
  en une lecture est qu'un témoin VOISIN, qui interroge `gareEn`, était vert.
- **Le convoi et l'ouvrage lisent le MÊME profil.** `traceSegment` ne calcule
  plus sa cote depuis le terrain : il demande le profil, comme `world.js`.
  Lus séparément, le train flotterait au-dessus des remblais et s'enfoncerait
  dans les tranchées.

**COMBIEN DE TRAINS ? AUTANT QU'IL EN FAUT POUR QU'ON N'ATTENDE PAS (v222).**
Max : « make sure trains arrive and depart from train stations ». Les gares
étaient au bon endroit — mesuré, les dix-huit arrêts tombent à ZÉRO bloc d'une
gare — mais chaque ligne n'avait que DEUX trains pour un tour allant jusqu'à
cent vingt-sept secondes. L'attente sur un quai : vingt-six à soixante-quatre
secondes, pour un arrêt de quatre. Trois choses en sortent.

- **La règle existait déjà, à un fichier près.** Le métro de Washington l'avait
  payée en v161 et écrite : « trois rames ramènent l'attente sous la
  demi-minute ». Elle n'avait jamais été appliquée aux trains intervilles, qui
  sont pourtant dix fois plus longs. **Quand une règle de confort est écrite
  pour un véhicule, on cherche le jour même tous ceux qui la partagent** —
  c'est la leçon du verre dans les murs, appliquée au temps d'attente.
- **Le nombre de trains est un RÉSULTAT** : le tour divisé par la demi-minute,
  au minimum deux. Écrit en dur, il redeviendrait faux à la première ligne
  qu'on allonge.
- **Le NOM d'un convoi porte son segment**, pas seulement sa ligne. Pour
  l'enfant, « train TGV Paris–Lyon » dit où l'on va. Et pour la mesure : deux
  segments d'une même ligne n'ont ni la même longueur ni le même nombre de
  trains.

**ET UN TÉMOIN NE SE FIE PAS À UN NOM QUI CHANGE DANS LA MÊME LIVRAISON.**
Celui-ci a été faux deux fois avant d'être juste. D'abord il comptait par nom
de LIGNE et divisait par le nombre de segments : « 3,5 trains », un chiffre qui
n'existe pas. Puis il comptait par nom de SEGMENT — mais ce nom venait de
changer, donc il trouvait ZÉRO train sur l'ancien code et rendait le bon
verdict pour la mauvaise raison. Un témoin doit échouer *proprement*, avec un
message vrai, sinon il n'est pas démontable. Il compte désormais par la
LONGUEUR du tour, qui ne dépend d'aucun nom — et `etat()` l'expose pour cela.

**Et une gare, c'est trois pièces et une échelle (v214).** Le train marquait
l'arrêt aux deux bouts de chaque ligne depuis la v179 — `traceSegment` le
déclare — mais rien n'y était bâti : on l'attendait debout dans l'herbe. Un
arrêt déclaré n'est pas une gare construite, et rien ne le disait.

- **Le quai, l'auvent, le bâtiment.** Le quai est un bloc AU-DESSUS des rails,
  comme un vrai quai ; l'auvent quatre blocs plus haut, sur des piliers tous
  les trois blocs ; le bâtiment derrière, avec porte et fenêtres.
- **La gare est plate même quand le terrain ne l'est pas** : elle comble en
  dessous et dégage au-dessus, exactement comme la voie. Et elle prend sa cote
  au BOUT du profil, une seule fois — un quai qui suivrait la pente serait un
  talus.
- **Elle est à l'échelle du JOUEUR**, pas du sol. C'est là qu'on marche, qu'on
  attend et qu'on monte à bord ; quatorze blocs de long, c'est une petite gare,
  pas un aérodrome.
- **Le témoin ne demande pas au jeu où chercher.** Il recalcule les
  emplacements depuis la géométrie des segments, puis lit les blocs — c'est ce
  qui lui permet de mesurer LA MÊME CHOSE sur l'ancien code, où il trouve zéro.
  Un témoin qui appellerait `gareEn` échouerait par « fonction absente », ce
  qui ne prouve rien du fond.

### Les terminaux se meublent (v330) — le trajet de l'enfant se garde par construction

Les dix-neuf terminaux étaient praticables et vides. Trois règles.

- **ON NE MEUBLE NI LES COULOIRS DES PORTES NI L'ALLÉE DES CLOISONS.**
  `amenagerHall` (aeroport.js) travaille dans le repère du hall (`u` le long
  de la façade, `w` depuis le côté ville) et ne pose rien sur les trois
  colonnes au droit de chaque porte ni dans la bande des passages percés :
  le témoin de la marche ne peut pas rougir par le mobilier, quelle que soit
  la pièce qu'on ajoute. Ce qui se met au-dessus de la tête (tableau,
  enseigne, linteau d'un portique) se pose à `y ≥ 2`.
- **DU MOBILIER EN BLOCS, PAS EN MEUBLES 3D.** Un meuble est un maillage,
  donc un appel de dessin (v196) ; cent sièges en coûteraient cent. En blocs,
  le mailleur les fusionne : mesuré, le bâtisseur coûte le même temps à la
  milliseconde près.
- **CHAQUE PIÈCE A SON BLOC À ELLE** (`MOBILIER`, des motifs que rien d'autre
  du fichier n'emploie) : c'est ce qui permet au témoin de compter le
  mobilier aérodrome par aérodrome sans le confondre avec un marquage.

### Les pistes à l'envergure, et ✈️ roule jusqu'à elles (v530)

Max : « les pistes sont extrêmement étroites… quand on veut décoller on a des
problèmes… une espèce de bloc de béton… il faut le circuler ». Mesuré AVANT une
ligne par `tests/sonde-decollage-postes.cjs` (le vrai joueur sous node, ✈️
depuis chacun des soixante postes) : 7 en vol, 53 écrasés ou bloqués, presque
tous sur le hangar posé dans l'axe de la rangée. Quatre règles.

- **UNE LARGEUR DE PISTE SE CALCULE SUR L'ENVERGURE DE TOUTE LA FLOTTE.**
  `DEMI_PISTE = ceil(ENVERGURE_MAX / 2 + MARGE_AILE)` (aeroport.js), lu par
  le plan, Roissy, `pistesDe`, les tronçons et les témoins : tout appareil
  peut se poser sur toute piste assez longue (v502), donc c'est le plus large
  qui compte. Neuf blocs de bande devenaient dix-neuf.
- **UN APPAREIL QUI PART DE SON POSTE BALAIE LA RANGÉE : RIEN NE S'Y POSE.**
  Le hangar longeait l'aire à `STAND + AILE` ; il est à côté du terminal, la
  tour du côté sans hangar (derrière, elle sortait du disque d'Orly). La
  sonde est la mesure : un bâtiment neuf sur un aérodrome se rejoue par elle.
- **✈️ AU SOL SUR UN AÉRODROME ROULE D'ABORD JUSQU'À L'AXE.** Un poste est
  parallèle à la piste, à vingt blocs d'elle : pleins gaz tout droit, on ne
  la rencontre jamais. `pisteDeDecollage` / `guiderRoulage` (approche.js,
  purs) suivent l'axe par une carotte, devant soi s'il y a la place
  (`longueurDecollage` : roulement plus de quoi monter de `H_DEGAGE` à
  `MONTEE_DECOLLAGE`, que player.js lit là), sinon demi-tour, sinon on remonte
  jusqu'au bout. Aligné, c'est le décollage d'avant. Second appui ou joystick
  en arrière : arrêt (v452). L'état « Roulage vers la piste » passe par
  `etatDePose` (v516). Hors d'un aérodrome, rien ne change.
- **ÉLARGIR UN OUVRAGE DÉBORDE SUR CE QU'IL LONGEAIT.** Les prolongements
  (v448) étaient mesurés pour neuf blocs ; dix-neuf débordent sur des flancs
  de vallon et de mer jusqu'à quinze blocs sous le remblai. Hors du disque,
  remblai `+ APPUI_PROLONGE` et tranchée `+ DEGAGE_CIME` (les couronnes
  d'arbres suspendues au-dessus de la tranchée cassaient les avions qui
  levaient le nez). Roissy perd ses deux pistes intérieures : élargis, deux
  doublets ne tenaient plus dans son disque ; les axes extérieurs restent,
  rapprochés de sept blocs (64 → 57) pour que chaque aile garée reste à douze
  blocs du bord (le témoin de la v280), prolongements re-mesurés. La seconde piste des hubs passe de z 15 à 25.

### De grands aéroports (v565) — une aire se mesure comme une piste, et un avion garé se voit du ciel

Max : « agrandir les aéroports pour qu'il y ait beaucoup plus d'avions garés…
et tous les modèles ». Cinq règles.

- **UNE AIRE PROLONGÉE EST UN OUVRAGE MESURÉ, COMME UNE PISTE PROLONGÉE.**
  `bandesAire` (aeroport.js) publie la bande de chaque rangée — du dos des
  appareils au bas-côté de la piste, des deux côtés de la piste la plus au
  large — et `AIRES` sa longueur de chaque côté au-delà du disque : un
  RÉSULTAT de `sonde-aires-aeroports.mjs` (relief dans les bornes de
  l'ouvrage, douze blocs de toute ville, route, rail, gare, repère et autre
  aérodrome, quarante de ce que les enfants ont bâti, le bout de la piste).
  `plafond.js` exige l'égalité : on n'allonge pas une aire à la main. Les
  tronçons (`tronconsDAire`) sont marqués `piste` : tous les lecteurs de
  repères les écartent déjà, et `videParUnTroncon` n'y plante rien.
- **LA RANGÉE REMPLIT LA BANDE, ET LE MODÈLE EST CELUI DU POSTE.**
  `postesAvion` (le disque) et `postesAerodrome` (avec les aires) rendent
  une rangée par bande, chaque appareil à sa longueur plus un passage, dans
  l'ordre de `modelesDeRangee` — A320, A321, Concorde, F-35 sur un aéroport
  civil, F-35 sur une base. Une règle sur le rang, jamais un tirage : deux
  tablettes voient le même appareil au même poste. Les aires commencent là
  où toute la bande est sortie du disque (`bordInterieur`) : dedans, le
  bâtisseur ; dehors, l'aire.
- **LES MONDES FIGÉS GARDENT L'AIRE D'AVANT.** `buildAerodrome(…, aires)` :
  `LANDMARKS_V317` passe `false` (trois appareils, la dalle et les
  nivellements d'avant), le monde d'aujourd'hui la grande aire. Un bloc posé
  avant se juge sur le monde où il a été posé (v306). `reglageAires.actif`
  rend tout le reste désarmé, pour l'empreinte des 490 morceaux.
- **UN AVION GARÉ SE GARNIT AUTOUR DE L'ENFANT, EN TROIS DIMENSIONS, ET NE
  S'EFFACE QU'À `RETRAIT_GARE`.** L'aéroportiste (main.js) pose les postes à
  moins de `PRES_POSTE` (128) blocs, distance comptée comme le retrait des
  bêtes, en 3D — sinon, vu d'avion, un poste à soixante blocs de côté naît et
  s'efface à chaque tour. Un appareil garé porte `gare` ; `animals.js` ne le
  retire qu'au-delà de 140 blocs, et le prendre (`fun.js`) lève le drapeau.
  Mesuré au-dessus d'Orly : treize appareils, neuf appels de dessin chacun en
  moyenne (`sonde-appels-aeroport.cjs`).
- **UN FEU DE BORD EST UNE LENTILLE, ET SON HALO SUIT LA NUIT.** Lentille de
  `FEU_LENTILLE` (0,07) et deux halos (`FEU_HALOS`) dans un groupe posé au
  bout de l'aile ; `nav.regler(nuitDehors())` (fun.js) règle les opacités —
  des uniformes, la même matière additive (v533), aucun programme neuf. La
  moitié du halo qui passe dans l'aile est cachée par la profondeur. Le
  témoin lit le RAYON de ce qui brille à pleine force et l'opacité du halo
  de jour contre de nuit.

Ce qui reste, déclaré dans `TASKS.md` : un appareil qui roule traverse les
appareils garés (un avion n'est pas un obstacle, v534) ; Roissy, bâti à la
main, garde ses trois postes dans le disque.

### Ce qu'un ouvrage vide, on n'y plante rien (v548)

Une règle. Une tranchée qui écrit de l'AIR au-dessus d'un sol efface le tronc
d'un arbre planté là et laisse la couronne qui déborde au-dehors : 543
feuilles suspendues le long des pistes prolongées, nées de la correction même
qui avait dégagé les pistes (v530). Le remède n'est pas de vider plus large
(on vide toujours une couronne de trop), c'est de demander à `treeAt` : un
arbre ne pousse pas dans une emprise qu'un ouvrage vide (`videParUnTroncon`,
même géométrie que `batirTroncon`). Et une correction qui n'a pas de témoin
n'est pas finie : celle de la v530 n'en avait pas, et ce sont ses deux
témoins (`plafond.js`) qui ont trouvé ce qu'elle cassait.

### Les aérodromes (`aeroport.js`) — la piste prend le diamètre (v280)

Max, trois demandes en une phrase : « supprime les avions qui ne volent pas, en
format Minecraft ; places les avions normaux près des pistes ; et fais les
pistes plus longues ». **C'était la même panne vue par trois bouts**, et seule
la mesure l'a montré. Six règles.

- **CE QU'UNE PISTE RÉCLAME SE LIT DANS LA FICHE, IL NE S'ESTIME PAS.** Le
  roulage avant rotation vaut `rotation² / (2 × poussée)` et le freinage
  `approche² / (2 × frein)` (v261) : ensemble 83 blocs pour l'avion de ligne, 99
  pour le Concorde, 34 pour le chasseur — la longueur de piste ÉQUILIBRÉE de
  l'aviation réelle. Mesuré en appelant les bâtisseurs et en comptant les
  colonnes roulables sur l'axe : `ville` rendait soixante-neuf blocs, `base`
  cinquante-trois, **Orly quarante-neuf**. Aucune piste ne tenait les 99 du
  Concorde sauf les deux internes de Roissy. La barre d'un témoin se CALCULE
  donc depuis la fiche (règle de la v269), et elle suivra le jour où `poussee`
  changera.
- **ET LA CAUSE N'ÉTAIT PAS LA TAILLE DU DISQUE, C'ÉTAIT L'ENDROIT DE LA PISTE
  DEDANS.** Une corde à |z| = 34 est bien plus courte qu'un diamètre : à Orly,
  49 blocs contre 103. La piste prend donc le DIAMÈTRE (`PISTE = 0`) et tout le
  reste passe d'un seul côté — voie de service, aire, terminal, tour, hangar.
  C'est le plan d'un vrai aéroport à une piste, **et c'est aussi la réponse à la
  deuxième demande** : l'aire est alors contre la piste, l'aile du plus large à
  deux blocs de la voie. Les cinquante-sept postes sont à 3 à 9 blocs du bord
  d'asphalte, contre 17 à 38 pour les trois de Roissy.
- **UNE PISTE EST UN OUVRAGE, ELLE NE SUIT PAS LE TERRAIN.** `terrainHeight`
  aplanit le disque de `r` avec un raccord de vingt blocs : le sol ne vaut
  exactement `sol` que jusqu'à `r − 20`, et c'est ce disque-là qui bornait les
  pistes. Remblai et tranchée sont des BLOCS écrits dans le morceau de monde —
  la leçon de la voie ferrée (v213) et du métro de Washington — donc les deux
  empreintes de `plafond.js` ne bougent pas d'un octet et l'invariant 1 tient
  **sans rien avoir à déclarer**. Et l'emprise ne sort JAMAIS de `a.r` : les cinq
  promesses de la v223 valent telles quelles, sans une mesure de plus. C'est ce
  qui rend cet allongement gratuit, et c'est la première chose à chercher quand
  on veut plus de place : un ouvrage, pas un relief.
- **LES BORNES DE L'OUVRAGE SE MESURENT.** Écart entre `terrainHeight` et `sol`
  sur le disque de `r − 10`, sur les dix-neuf : remblai ONZE blocs au pire
  (Delhi), décaissé HUIT (Orly), trois à cinq en général ; l'eau ne concerne que
  0,5 % des colonnes au pire (Istanbul, 71 sur 14 505). `REMBLAI = 12` et
  `DECAISSE = 9` couvrent tout le monde avec un bloc de marge.
- **ET C'EST LA PISTE QUI EST UN OUVRAGE, PAS LE DISQUE — le prix l'a dit.** Mon
  premier jet bétonnait et décaissait TOUT l'anneau : le bâtisseur passait de
  5,6 à 12,5 ms par rejeu à Roissy, payés pour CHAQUE morceau de la boîte,
  c'est-à-dire là où l'enfant arrive en vol. Seules les BANDES vont au-delà de
  `PLAT`, et l'on ne balaie que ce qu'on écrit — 6,6 ms après, pour des pistes
  30 à 110 % plus longues. Le reste du pourtour garde son relief naturel, ce
  qu'on voit d'un vrai aéroport bâti sur une croupe.
- **LE PLAN EST PUBLIÉ UNE FOIS ET LU PAR LES DEUX.** `planAerodrome(profil,
  rayon)` remplace `RANGEES`, qui recopiait la cote de l'aire à côté du
  bâtisseur qui la dessinait : elles s'accordaient, mais rien ne l'obligeait.
  Toute cote du plan — y compris la profondeur du terminal et l'abscisse du
  hangar, bornées par le disque — se demande là.

**LE RETRAIT DES AVIONS EN BLOCS EST CE QUI LIBÈRE L'AIRE — et cela annule la
décision de la v228.** Celle-ci avait gardé le poste sud au motif qu'« une
monture ne se dessine qu'à soixante-deux blocs, et sans eux la plate-forme
serait vide vue du ciel » ; **Max tranche l'inverse, et il a raison** : un décor
qu'on ne peut pas prendre est un mensonge de plus, pas un remplissage. Et la
v278 avait mesuré qu'il n'y a que DEUX poches assez grandes pour un gros
porteur — mesure faite AVEC les huit silhouettes sur le tarmac et un disque pavé
de 68. Refaite : **quatre places à ciel ouvert deviennent huit cent cinq**, et
les trois appareils prennent la rangée canonique (dv = 33). Une mesure ne vaut
que dans les conditions où elle a été faite, et un obstacle retiré les change.

**TROIS DÉFAUTS DE MA PROPRE PASSE, ET AUCUN NE SE VOYAIT EN RELISANT.** Le
bâtisseur gardait son `RAYON = rayon − 20` local, et tout l'allongement était
annulé sans qu'une ligne parût fausse — mesuré 85 blocs là où le calcul disait
103. Les mâts d'éclairage, posés par rapport à `TARMAC` qui venait de passer de
25 à 40, se sont retrouvés à z = ±39, **pile dans l'envergure**, et bloquaient
les TROIS postes de Roissy d'un coup ; la manche à air, posée de même, s'est
retrouvée au bord de la piste. **Tout ce qui est coté par rapport à une
constante qu'on déplace se déplace avec elle** : quand on bouge une cote de
plan, on cherche le jour même tout ce qui s'y réfère — `grep -n "TARMAC\|STAND"`
prend dix secondes. Et c'est une sonde qui a nommé les trois, pas la relecture.

**ET UN TÉMOIN MESURE LA GÉOMÉTRIE DE L'ARBRE QU'IL ÉPROUVE, PAS CELLE QU'IL
ESPÈRE.** Mon témoin « rien ne dépasse sur une piste » portait les cotes NEUVES
en dur : il rendait cent cinquante-deux blocs en faute sur `origin/main`, où ces
pistes ne sont pas. Un faux rouge ne se démonte pas. Les axes se DEMANDENT au
module (`PISTES_ROISSY`, `planAerodrome`), avec un repli sur les cotes d'avant.
De même, le témoin du terminal visitable portait `nv ∈ [−12, 14]` — juste tant
que le terminal était à z = −6..8 : c'est le piège de `r: 66` à San Francisco,
une quatrième fois.

### Les aérodromes (`aeroport.js`) — dix-neuf, et un seul écrit à la main

Roissy garde son bâtisseur à lui — le tambour de béton de 1974 et ses sept
satellites ne ressemblent à aucun autre aéroport au monde. Les dix-huit autres
passent par `buildAerodrome`, qui lit un `profil` (`hub`, `ville`, `base`).
Quatre choses à savoir avant d'en ajouter un.

- **UN EMPLACEMENT SE MESURE.** On part du cap RÉEL depuis le centre de la
  ville, et l'on cherche en s'éloignant le premier point qui tienne CINQ
  promesses : au sec, à douze blocs au moins de toute ville et de tout autre
  aérodrome, à quarante blocs au moins de ce que les enfants ont bâti, **à
  douze blocs au moins de toute voie ferrée**, et le plus plat possible. **Le cap cède en dernier**, et l'écart est écrit ligne à
  ligne — JFK est sur la baie de Jamaica, Fiumicino sur la mer, Haneda dans la
  baie de Tokyo ; le nord-est de Paris, cap réel de Roissy, tombe pile sur le
  quartier des enfants. Le sol des enfants passe avant la fidélité du plan.
- **`sol` est une MESURE, pas un goût.** C'est la médiane du relief naturel
  sous le disque. L'ancien code aplanissait à 35 en dur : appliqué aux
  dix-neuf, cela ferait une falaise partout où le pays n'est pas à trente-cinq
  blocs — Francfort est à cinquante, Dubaï à trente-trois.
- **UN TERMINAL QU'ON NE TRAVERSE PAS EST UN DÉCOR.** Trois choses le rendent
  praticable, et il en manque une seule pour qu'il redevienne un bloc plein :
  il est CREUX (murs posés, puis intérieur vidé) ; son plancher est **au
  niveau du tarmac**, parce qu'une marche d'un bloc sur le seuil laisse un
  enfant de sept ans dehors sans qu'il comprenne pourquoi ; et il a des portes
  **sur les deux faces**, côté ville pour arriver et côté pistes pour
  rejoindre son avion — avec les portes d'un seul côté, on entre dans un
  cul-de-sac. Les cloisons entre halls sont percées : c'est cela, « se
  promener avec ses différents terminaux ».
- **Le témoin ÉPROUVE LA MARCHE, pas le bâtisseur.** Il se pose dehors, côté
  ville, et cherche de proche en proche par où l'on peut passer — une case est
  franchissable si le sol y est plein et si deux blocs d'air la surmontent.
  Compter des blocs de béton ne distinguerait pas un terminal d'un cube.
- **Le plan du tarmac ne se recopie pas.** `postesAvion(profil)` le publie
  depuis `aeroport.js`, là où le tarmac est dessiné ; `main.js` le lit. Deux
  tables qui décrivent le même plan finissent toujours par diverger — c'est la
  leçon du mobilier de Londres, qui a rendu « 0/5 bus » le jour où la ville a
  déplacé ses arrêts.
- **LA CINQUIÈME PROMESSE EST NÉE D'UN ROUGE, et c'est la bonne façon d'y
  venir.** La sonde en avait quatre, et trois aérodromes se sont posés sur une
  ligne de train — Haneda sur le Shinkansen (quarante-cinq blocs dedans),
  Fiumicino sur la Frecciarossa, Francfort sur l'ICE. Les rails sont écrits
  dans le morceau de monde AVANT les monuments : un terminal bâti par-dessus
  les mure. Le témoin « rien de solide ne barre la route du train » de
  `carteMonde.js` l'a dit — il existait déjà. **Et la contrainte s'applique aux
  TROIS en faute, pas aux dix-neuf** : rejouer tous les emplacements sous une
  promesse de plus les dégradait sans raison (Roissy partait au sud-est, JFK
  sous trente-deux pour cent d'eau). Une contrainte neuve se paie là où elle
  mord.
- **UN POSTE DE STATIONNEMENT A UN CAP, ET IL SE PUBLIE (v228).** Max, capture
  à l'appui : « les avions sont moches, posés n'importe où et inutilisables ».
  Mesuré à la sonde : **vingt et un postes sur cinquante-sept dans un
  bâtiment**. Trois causes, trois leçons, et aucune ne se devinait sur l'image.
  - **UNE TABLE PUBLIÉE PAR LE MAUVAIS BÂTISSEUR MENT AUSSI BIEN QU'UNE TABLE
    RECOPIÉE.** La règle « le plan du tarmac ne se recopie pas » était écrite
    et appliquée — aux dix-huit aérodromes GÉNÉRIQUES. Roissy, qui a son
    bâtisseur à lui, n'avait aucune branche dans `postesAvion` : il tombait
    dans le cas `ville`, donc à dv = 17, entre `HALL_INT` (8) et `HALL_EXT`
    (18) — dans le hall. Quand une fonction publie un plan, on vérifie qu'elle
    le publie pour TOUS ceux qui la lisent.
  - **UNE AIRE SE DIMENSIONNE SUR CE QUI S'Y GARE.** Elle valait `HALL ± 12`,
    un chiffre rond ; il manquait quatre blocs de chaque côté. Et surtout, les
    appareils étaient posés nez vers -z : un Concorde réclame alors vingt
    blocs de PROFONDEUR pour une aire qui en fait douze — sept à Roissy. Ils
    se garent désormais **le long de x**, parallèles à l'aérogare, ce que le
    bâtisseur de Roissy faisait déjà pour ses avions en blocs. Le remède était
    dessiné à côté, une fois de plus.
  - **UN CAP NE SE TIRE PAS AU SORT.** `animals.js` donne à toute bête un
    `yaw` aléatoire ; l'espèce étant `immobile`, un avion garé gardait le sien
    pour toujours. Tout ce qui se gare — avion, voiture rangée, bus à l'arrêt
    — reçoit son cap de l'emplacement, jamais du hasard.
  - **ET LE TÉMOIN INTERROGE LE BÂTISSEUR.** `buildAeroport` et
    `buildAerodrome` sont des fonctions pures : on leur donne un `poser` qui
    note tout dans une table, et l'on lit la colonne sous chaque poste. Les
    dix-neuf aérodromes se mesurent en quelques millisecondes sans ouvrir un
    navigateur — et sans le piège de `getBlock`, qui ne répond que sur les
    morceaux déjà engendrés et rendrait un témoin vert qui ne prouve rien.
  - **MAIS L'EMPRISE DU TÉMOIN SUIT LE CAP QUE LE POSTE PUBLIE.** Mon premier
    jet mesurait l'appareil nez vers -z alors qu'il se gare désormais le long
    de x : il accusait dix postes parfaitement corrects. **Compter un motif
    n'est pas compter la chose**, et un témoin de géométrie doit lire
    l'orientation, pas la supposer.
- **UN AVION QU'ON VOIT AU POSTE DOIT ÊTRE CELUI DANS LEQUEL ON MONTE (v228).**
  Roissy dessinait six avions **en blocs** sur ses postes — du décor qu'un
  enfant ne peut pas prendre. C'est la moitié de « inutilisables » : on marche
  vers un avion et l'on trouve de la pierre. Les deux du poste nord ont cédé
  la place aux montures. Ceux du poste sud restent, et c'est une DÉCISION :
  une monture ne se dessine qu'à soixante-deux blocs, et sans eux la
  plate-forme serait vide vue du ciel.
- **UNE BOÎTE DE COLLISION ET UNE PLACE DE STATIONNEMENT NE SONT PAS LA MÊME
  MESURE (v278).** Max, capture d'iPad : « les avions ne devraient pas être par
  défaut dans les buildings ». Le témoin de la v228 annonçait 0/57 en faute, et
  une sonde qui relisait le MONDE aux coordonnées des postes disait 0/57 aussi.
  Tous deux mesuraient `larg` — **la largeur du FUSELAGE**, 1,8 bloc — pour un
  appareil dont les ailes en font 15,2. Repris avec l'emprise vraie : **vingt-
  neuf postes sur cinquante-sept dans un bâtiment.** `larg` reste juste pour ce
  qu'il est (une AABB ne tourne pas, un avion de quinze blocs de large ne
  roulerait dans aucune voie de circulation) ; ce qui manquait, c'est
  `envergure`, mesurée sur le modèle rendu et gardée par un témoin — parce
  qu'une table que personne ne relit est un piège qui attend, et c'est la
  TROISIÈME fois que celle-ci en tend un.
- **ET UNE PLACE SE JUGE À CIEL OUVERT, PAS « SANS BÂTI DANS L'EMPRISE ».** Mon
  balayage de remplacement garait très bien un Concorde DANS le hall et le
  déclarait bon : un bâtiment est CREUX — c'est ce qui le rend visitable — donc
  son intérieur est de l'air. C'est le piège du verre dans les murs par l'autre
  bout. Aucune colonne de l'emprise ne doit rien porter au-dessus d'elle.
- **ET UN REMÈDE SE MESURE CONTRE LE DISQUE, PAS SEULEMENT CONTRE LA RANGÉE.**
  Mon premier jet poussait le hangar au-delà de l'aire (`aire.x1 + 9`) : juste
  sur le papier, et il sortait du DISQUE de la plate-forme, qui ne va que
  jusqu'à `rayon - 20` — quarante et un blocs à Orly, trente-six sur une base.
  `set` ignore ce qui déborde : on aurait livré des demi-hangars. Ils sont
  passés **côté ville** (`z = zt0-14 … zt0-6`), ce qui libère tout le tarmac
  sans rien pousser dehors.
- **ET DEUX POCHES, C'EST TOUT CE QU'A ROISSY.** Mesuré : sur tout son tarmac,
  le plus grand espace libre à ciel ouvert fait **20 × 16 blocs** — le couloir
  entre le tambour de l'aérogare 1 et les halls — plus la trouée entre les
  halls 2C et 2E. Partout ailleurs la bande d'asphalte libre fait SEPT blocs,
  pour une envergure de quinze. Les trois postes sont là, et c'est un résultat.
  Le jour où l'on voudra une vraie rangée devant l'aérogare 2, il faudra
  déplacer le premier doublet de pistes — c'est une décision de plan, déclarée
  dans `TASKS.md`, pas un réglage.
- **UN LIEU NE SE RENOMME PAS SOUS LES PIEDS D'UN ENFANT.** Roissy s'appelait
  « Aéroport Charles-de-Gaulle » sur la carte ; renommé « Paris–Charles-de-
  Gaulle » par cohérence avec les dix-huit autres, il a disparu du témoin des
  grandes destinations — et il aurait disparu de la recherche d'un enfant. La
  cohérence d'une table ne vaut pas un repère qu'on perd.
- **Et quand une ville change d'échelle, on cherche TOUT ce qui la vise.**
  `grep -n "AEROPORT\|VILLE\.x" src/*.js` prend dix secondes ; c'est ce qui
  aurait évité que Roissy passe six versions au milieu de Paris.

### La fluidité en vol — et ce que le profil a démenti

Max, en vol : « il y a vraiment un lag, l'écran s'arrête pendant trois
secondes, il redémarre pendant une seconde. » Six choses en sortent, et la
première est une méthode.

- **UN GEL NE SE DEVINE PAS, IL SE DÉCOUPE.** J'ai chronométré l'image phase
  par phase, puis profilé le moteur JavaScript, avant de toucher une ligne. Le
  découpage a écarté d'emblée les deux coupables évidents : le maillage tenait
  son budget (16 ms par image) et le rendu coûtait 4. Le temps était dans
  « autre » — 619 ms sur une image de 639. Un second découpage a nommé
  `animerLesVilles`, un troisième a nommé la ligne exacte.
- **HUIT CIRCUITS NÉS DANS LA MÊME IMAGE, C'EST 557 ms D'ÉCRAN FIGÉ.** Les
  circuits de voitures d'une ville s'instanciaient tous ensemble au
  franchissement de leur rayon de 220 blocs. Une vingtaine de voitures par
  circuit, trente-deux maillages par voiture (v201) : cinq mille maillages
  d'un coup. **Une file qui se vide d'un coup n'est pas une file, c'est une
  bombe** — le maillage des morceaux de monde avait résolu exactement cela un
  fichier plus loin, avec un budget de temps ; la circulation ne l'avait
  jamais fait.
- **ET LE VRAI REMÈDE EST DE NE PAS FABRIQUER.** Étaler ramène le pic de 557 à
  200 ms ; ce n'est qu'un tiers du chemin. Un convoi ne se MONTRE qu'à
  quarante-cinq blocs — il n'a donc aucune raison de fabriquer ses voitures à
  deux cent vingt. Chaque place reste vide jusqu'à entrer dans le champ, et
  une ville survolée de loin ne coûte plus rien. **Avant d'étaler un coût, on
  regarde s'il faut le payer.**
- **UNE PLACE VIDE SE PROPAGE PARTOUT OÙ L'ON LISAIT UN MAILLAGE.**
  `elements` porte désormais des trous : `etat()` a planté le banc au premier
  passage (`m.visible` sur `null`), et `emprunter` devait décrémenter le
  compte, sans quoi le convoi se refabriquait une voiture pour remplacer celle
  que l'enfant venait de prendre. **Un tableau qui gagne des trous se
  cherche : `grep -n "\.elements"` prend dix secondes.**
- **ET LE PROFIL M'A MENTI SUR UN POINT, CE QUI VAUT D'ÊTRE ÉCRIT.** Il
  accusait aussi les matrices de three.js — `updateMatrixWorld`, `compose`,
  `multiplyMatrices` : deux secondes, **dix pour cent du vol**, à replacer des
  morceaux de monde qui ne bougent jamais. Les figer
  (`matrixAutoUpdate = false`) était juste, sûr, et n'a **rien changé de
  mesurable** : 28,5 → 27,7 images par seconde, gel 683 → 667. Ce coût vient
  des personnages, qui bougent, pas des chunks. La correction a été retirée.
  **Un poste lourd dans un profil n'est pas une économie possible** : ce qui
  compte est la part qu'on peut réellement supprimer, et elle se mesure APRÈS.
- **Et la cadence moyenne ne dit rien d'un gel.** 28,5 avant, 29,6 après :
  presque identique, alors que la pire image passait de 567 à 217. Ce que
  l'enfant subit, c'est la PIRE image et la part du temps passée dans les
  images très longues — jamais la moyenne. Le témoin mesure ces deux-là.

### Le temps d'écran — et la QUATRIÈME occurrence du piège de `dt`

**L'invariant 2 tombait tout seul, sans que personne ne contourne rien
(v234).** `education.js` comptait la journée de l'enfant avec le `dt` de
`main.js`, borné à un vingtième de seconde. Mesuré sur douze secondes réelles :
à 24 images par seconde le compteur en retient 11, **à 5 il n'en retient que
3**. Une limite de quarante-cinq minutes en laissait donc passer près de trois
heures sur une tablette qui rame — c'est-à-dire précisément quand l'enfant
arrive dans une ville.

- **CE QUI SE RÈGLE SUR UNE PENDULE SE COMPTE SUR UNE PENDULE.** Un parent qui
  écrit « quarante-cinq minutes » ne parle pas de minutes pondérées par la
  cadence d'affichage. Le temps joué, le temps de quiz, le prochain quiz et la
  prochaine sauvegarde sont tous des durées de la vraie vie.
- **ET L'HORLOGE VIT CHEZ L'APPELANT, PAS DANS LA CLASSE.** Mon premier jet
  mettait `chronoReel` DANS `education.js` et faisait ignorer à `update` son
  paramètre. Le portail l'a refusé sur-le-champ : `reglages.js` simule le temps
  en appelant `update(1, true)` deux cents fois — la seule façon d'éprouver que
  le quiz se cumule du local à l'en ligne — et ce témoin est tombé. **Une
  classe qui va lire l'horloge du monde ne se met plus à l'heure qu'on veut.**
  `main.js` sert le temps (`dtEcran`, à côté de `dt`, là où l'on sait ce que
  `dt` vaut), `education.js` le compte. Le contrat tient en une ligne : `dt`
  est en secondes RÉELLES, et c'est à l'appelant de le tenir.
- **Et j'avais affirmé le contraire avant de vérifier.** « Aucun témoin ne
  pilote `edu.update` avec un `dt` fabriqué » : mon grep cherchait `edu.update`
  alors que le témoin écrit `e.update`. Quarante-trois minutes de portail pour
  l'apprendre. Un grep sur un NOM D'APPELANT ne trouve pas les alias ; on
  cherche le nom de la MÉTHODE.
- **ET LE PLAFOND N'EST PAS UNE PRÉCAUTION, C'EST LE CŒUR DE LA CHOSE.** Un
  onglet à l'arrière-plan ou un appareil endormi arrête la boucle
  d'affichage : au réveil, l'écart réel vaut des minutes, voire des heures. La
  borne de `dt` protégeait de cela PAR ACCIDENT ; en la retirant on ouvrirait
  un trou pire que celui qu'on ferme. Deux secondes : de quoi laisser passer
  en entier l'image la plus lente jamais mesurée (2 im/s à l'arrivée dans
  Paris) et couper net toute absence.
- **QUATRE FOIS LA MÊME PANNE, ET LA LISTE N'AVAIT TOUJOURS PAS ÉTÉ FAITE.**
  v226 : les quatre cadences de ménage. v233 : la minicarte. v234 : les quatre
  minuteurs de l'espace éducatif. À chaque fois la règle était écrite et le
  remède connu ; ce qui manquait, c'était la LISTE. Elle se fait en dix
  secondes — `grep -rn -- "-= dt\|+= dt" src/*.js` — et je l'ai enfin faite :
  **quarante-neuf minuteurs restent**. La grande majorité sont des ANIMATIONS,
  et elles doivent suivre le temps du jeu. Mais au moins quatre ne le doivent
  pas, et ils sont NOMMÉS dans `TASKS.md` avec ce qu'ils coûtent — dont le
  chronomètre de la course, qui écrit un RECORD sauvegardé : compté en temps de
  jeu, il récompense la tablette qui rame. **Écrire « on cherche toutes les
  occurrences » ne vaut rien tant qu'on ne les a pas comptées** ; trois
  livraisons ont répété la règle sans jamais passer le grep.
- **UNE TABLE DE GARDIENS SUIT LES IMPORTS.** `src/cadence.js` n'avait que
  `monte.js`, `maj.js`, `carte.js`. `education.js` en est devenu client : ses
  deux gardiens (`parent.js`, `reglages.js`) rejoignent la liste, sinon un
  changement d'horloge ne réveille pas l'espace parent. **Quand un module
  gagne un client, la table des gardiens du module gagne les gardiens du
  client.**
- **Et le témoin PROVOQUE la cadence basse.** Attendre qu'une tablette rame ne
  se fait pas au banc : on alourdit chaque image d'un travail synchrone
  jusqu'à retomber à cinq images par seconde, puis l'on regarde ce que le
  compteur retient d'une fenêtre de temps réel connue. 0,25 contre 0,98 —
  c'est la leçon des poissons de la v233, appliquée à une durée.

### La minicarte — ce qui se rafraîchit, et à quel prix

Max, capture en vol : « pas dingue la carte en retard ». Trois choses en
sortent, et la troisième vaut pour tout ce qui se redessine.

- **LA MINICARTE ÉTAIT LA DERNIÈRE CADENCE DE MÉNAGE EN `dt` (v233).** La v226
  avait fait passer les quatre autres (passants, circulation, garagiste,
  aéroportiste) en temps réel ; celle-ci a été oubliée. Le jeu borne `dt` à un
  vingtième, donc une seconde de minuteur en réclame 2,4 réelles dès que la
  cadence tombe — c'est-à-dire en vol, quand le monde se charge. **Quand une
  panne touche une grammaire partagée, on cherche TOUTES ses occurrences le
  jour même** : `cadence.js` existe depuis la v226 et la liste de ses clients
  n'avait jamais été vérifiée.
- **ON SE RAFRAÎCHIT SUR UN DÉPLACEMENT, PAS SUR UNE HORLOGE.** Debout sans
  bouger, l'ancien code redessinait la carte chaque seconde pour rien ; en vol,
  une seconde valait soixante-quatorze blocs de retard. Le déclencheur est la
  DISTANCE (huit blocs), bornée par une cadence en temps réel.
- **UNE CARTE QUI SE DÉPLACE SE FAIT DÉFILER.** Redessiner dix fois plus
  souvent était impossible à 30,8 ms le redessin. Le fond est tenu à UN POINT
  PAR BLOC — à l'échelle d'affichage (0,83 point par bloc) le décalage devrait
  s'arrondir, et l'image dériverait d'un demi-point à chaque tour — puis
  recopié d'un tour à l'autre, seule la bande neuve étant calculée. Le coût ne
  dépend plus de la TAILLE de la carte mais de la DISTANCE parcourue : 5,6 ms.
  Et le fond entier se refait lentement (deux secondes), sinon un bloc que
  l'enfant vient de poser tombe dans la partie recopiée et n'y apparaît jamais.

**Et deux leçons de témoin, l'une déjà écrite et l'autre neuve.**

- **UN VERDICT EN DURÉE MESURE LE BANC ; UNE DISTANCE, NON.** Mon premier
  témoin comptait le plus long moment sans changement : 1,01 s sur l'ancien
  code contre une barre d'une seconde, soit un pour cent de marge — et le
  chiffre bouge avec la cadence de la machine. Reformulé en BLOCS de retard, il
  rend 97,3 contre 12 : la même panne, une marge de deux fois et demie, et une
  mesure que la cadence du banc ne touche pas.
- **UNE OPTIMISATION QUI RECOPIE DOIT PROUVER QU'ELLE NE MENT PAS.** Un
  défilement qui dériverait d'un point afficherait un paysage faux, et personne
  ne le verrait — c'est plus grave que le retard qu'on vient de corriger. Le
  second témoin compare le fond défilé à un fond entièrement recalculé au même
  endroit : 37 249 points, zéro écart. Sans lui, la performance serait gagnée
  contre la justesse, en silence.

### Les poissons — et un témoin qu'il a fallu écrire cinq fois

Un poisson pouvait finir **enterré dans la roche**, à la cote de l'eau avec le
terrain quatorze blocs au-dessus. Mesuré sur `origin/main`, donc en production :
vingt-quatre relevés hors de l'eau sur cent vingt à un rivage donné.

- **UN DEMI-TOUR PROGRESSIF NE PROTÈGE PAS D'UN MUR.** Le poisson regarde
  1,1 bloc devant son museau et vire — mais il CONTINUE D'AVANCER pendant qu'il
  vire, et dans une crique le virage n'aboutit pas. Le clampage de profondeur
  `min(surface, max(fond + 1.1, y))` ne le rattrape pas : dès que le fond
  dépasse la surface, il rend la SURFACE, c'est-à-dire qu'il maintient le
  poisson à la cote de l'eau à l'intérieur de la colline. **Le remède n'est pas
  un meilleur clampage, c'est de ne pas y aller** : on calcule le pas, on
  regarde si l'arrivée est de l'eau, et sinon on reste où l'on est.
- **ET L'ÉTAT EST ABSORBANT, ce qui explique tout le reste.** L'entrée est rare
  — un poisson sur soixante-deux lancé sur un mur — mais une fois dedans il n'en
  sort plus, et il compte dans TOUS les relevés suivants. Un défaut rare à
  l'entrée et permanent à l'arrivée se voit beaucoup en production et très mal
  au banc.

**Et le témoin a été écrit CINQ fois avant d'être franc. C'est la vraie leçon.**

| version du témoin | sur `origin/main` |
| --- | --- |
| un seul instantané | pile ou face — vert seul, rouge au portail |
| douze relevés au large | vert (0/12) |
| au large + première eau venue | 1 faute sur 24 |
| au large + rivage à falaise | vert (0/40) |
| **quatre poissons lancés sur un mur** | 1 sur 4 |
| **le banc entier, trois fois, au plus près** | **23 sur 42** |

- **UN INSTANTANÉ SUR CE QUI BOUGE EST UN PILE OU FACE.** C'est la règle déjà
  écrite pour les durées, et elle vaut pour les positions : ce témoin passait
  seul et cassait le portail complet.
- **ON N'ATTEND PAS UN ÉVÉNEMENT RARE, ON ÉPROUVE LE MÉCANISME.** Trois
  tentatives ont couru après un poisson qui va se jeter sur la côte de
  lui-même, et les trois ont donné des chiffres qui bougent avec l'endroit et
  le hasard. Envoyer le banc DROIT sur un mur rend le même défaut avec une
  marge de vingt-trois contre zéro. Quand un témoin qu'on règle change de
  verdict d'une exécution à l'autre, ce n'est pas le seuil qu'il faut bouger :
  c'est la situation qu'il faut cesser d'attendre et commencer à provoquer.

### Le dessin des appareils (`avions.js`) — ce qui se mesure, et ce qui se regarde

Max, capture à l'appui : « fix plane design, they are not realistic ». Trois
défauts se mesuraient, un quatrième se regardait. Les quatre valent pour tout
modèle sculpté à venir.

- **UN RAYON N'EST PAS UN DIAMÈTRE, ET L'ATELIER TRANCHE.** `Atelier` met à
  l'échelle une primitive UNITAIRE : `e: [r, L, r]` sur un cylindre donne un
  corps de `r` blocs de DIAMÈTRE. Le code écrivait `r` en pensant rayon, si
  bien que tout ce qui se posait « sur la peau » à `0,94 r` tombait DEHORS —
  hublots flottant à ±0,99 sur un fuselage de 0,52 de rayon, et une bande de
  livrée de 2,12 de large, deux fois le fuselage. **C'est elle qu'on voyait** :
  une planche bleue plus grosse que l'avion. Avant d'accuser une forme, on
  vérifie l'unité de ce qui la dimensionne.
- **UNE TABLE QUE PERSONNE NE RESPECTE EST UN PIÈGE QUI ATTEND.**
  `GABARITS_AVION` déclare seize blocs pour l'avion de ligne et dimensionne les
  postes dessus ; le modèle en mesurait 21,5, et le Concorde trente et un pour
  vingt — à cheval sur son voisin, passage compris. Le commentaire disait
  pourtant « les modèles lisent cette table ». Ils la lisaient et l'ajoutaient
  à leurs cônes de nez et de queue. `long` est désormais la longueur TOTALE, un
  témoin la garde, et `larg`/`haut` — que personne ne lisait et qui annonçaient
  n'importe quoi — sont mesurés sur le modèle rendu.
- **CE QUI SE POSE AU SOL TOUCHE LE SOL.** Le train descendait à −0,68 sous
  l'origine : les roues étaient enterrées jusqu'à l'essieu. Rien d'un modèle
  posé ne passe sous y = 0, et c'est une mesure, pas une intention.
- **UNE AILE S'EFFILE — et c'est LE signal « jouet » quand elle ne le fait
  pas.** Les rapports viennent des vrais appareils (corde de saumon de 1,5 m
  pour 37,6 de long, soit un vingt-cinquième). Une boîte ne s'effile pas : la
  voilure est une géométrie à part, un prisme à quatre coins, rendue NON
  INDEXÉE pour que `computeVertexNormals` donne des facettes franches — indexée
  elle lisserait les arêtes et l'aile aurait l'air d'un coussin. Et l'on ne
  pose pas une demi-aile deux fois avec une échelle négative en x : une
  symétrie retourne les faces, et la moitié gauche de l'avion serait éclairée
  à l'envers.

**Et deux pièges de TÉMOIN, payés dans la même livraison.**

- **UN CYLINDRE N'A DE SOMMETS QU'À SES DEUX BOUTS.** Mon premier témoin
  mesurait la section du fuselage dans une tranche du milieu pour dire « rond
  ou plat » : il n'y trouvait aucun sommet de fuselage et ne lisait que la
  bande de livrée. Il aurait été rouge des deux côtés, pour rien. Une mesure
  géométrique sur un maillage se vérifie sur les SOMMETS qui existent
  vraiment.
- **UN SEUL NOMBRE POUR TROIS APPAREILS NE SE DÉMONTE PAS.** L'effilement rend
  0,142 → 0,040 sur l'avion de ligne et 0,156 → 0,070 sur le chasseur, mais
  0,077 → 0,025 sur le Concorde : l'ancien delta était DÉJÀ bâti en panneaux
  de corde décroissante, et aucun seuil ne le sépare sans le déclarer bon
  AVANT la correction. Le témoin dit donc lesquels il garde, et le delta du
  Concorde se juge en capture. Un témoin qui couvre un cas qu'il ne peut pas
  voir donne l'illusion, pas la preuve.

### Le paysage lointain (`horizon.js`) — ce que les morceaux n'auront jamais le temps de bâtir

**UN TÉMOIN QUI VOLE AU-DESSUS D'UN DÉSERT NE PEUT PAS VOIR CE QUI CASSE
AU-DESSUS D'UNE VILLE (v237).** Max, capture à l'appui : du ciel vide entouré
au feutre rouge, et « 0 improvement ». Mesuré dans le champ de la caméra en vol
au-dessus de Paris : **trente et un maillages, le plus lointain à cinquante-neuf
blocs**, pour un brouillard qui portait à 188.

La cause est arithmétique, et **aucune micro-optimisation ne la règle** :

| | coût d'un morceau | morceaux/s |
| --- | --- | --- |
| campagne vide | 6,6 ms | 153 |
| **couloir du témoin** (30 000, 30 000) | 6,8 ms | **147** |
| **Paris** | 23,5 ms | **42** |
| **Londres** | 22,6 ms | **44** |

Voler à 110 blocs/s en réclame **165**. Le « 154 morceaux/s » de la v229 — le
chiffre sur lequel les VITESSES DES AVIONS ont été réglées — avait été mesuré
dans un couloir vide, et c'est là que vole encore le témoin qui le garde. **Un
témoin de chargement doit voler là où l'enfant vole** : au-dessus des villes.

**LE REMÈDE EST DE NE PAS PAYER CE PRIX-LÀ.** `terrainHeight` est PURE : elle
rend la cote d'une colonne sans engendrer le morceau ni mailler une face.
Vingt-cinq mille colonnes coûtent 120 ms ; la même surface en vrais morceaux en
coûterait **cent cinquante secondes**. Cinq choses à savoir avant d'y toucher,
et chacune a coûté un passage de banc.

- **ON NE DESSINE QUE CE QUI N'EST PAS DESSINÉ.** La découpe demande si le
  morceau est **MAILLÉ**, jamais s'il est engendré. Mon premier jet interrogeait
  `world.chunks` : or `getBlock` engendre des morceaux bien au-delà du front de
  maillage (collisions, passants, convois), si bien que le paysage se retirait
  devant un monde qui n'était pas encore dessiné — un trou de ciel vide de
  soixante à cent quatre-vingt-dix blocs, exactement là où Max l'avait entouré.
  Et cette règle évite d'un seul coup les trois artefacts d'un « sol de
  secours » posé partout : la fausse dalle au fond d'un trou creusé, le plafond
  coloré d'une grotte, la bataille de profondeur au ras du vrai terrain.
- **UN SENS DE PARCOURS SE CALCULE, IL NE SE DEVINE PAS.** Écrits (a, c, b) —
  l'ordre qui vient sous les doigts — les triangles ont leur normale vers le
  BAS : un avion les regarde par leur face arrière, éliminée au rendu, et l'on
  ne voit **rien du tout**. Une heure de captures avant de faire le produit
  vectoriel à la main. C'est le piège du roulis de la v231 par un autre bout.
- **IL SE FAIT DÉFILER, IL NE SE REFAIT PAS** — et cela vaut pour les SOMMETS
  autant que pour les hauteurs. Mon premier jet réécrivait les 25 921 sommets à
  chaque image où quelque chose bougeait : huit millisecondes et trois cents
  kilo-octets envoyés à la carte graphique par image, le maillage du monde
  proche privé de budget, et le paysage lointain qui AVALAIT le monde — sept
  appels de dessin au lieu de quarante. Les coordonnées étant ABSOLUES, les
  décaler les laisse justes : c'est `decalerCarte` de la minicarte, mot pour
  mot.
- **LA PORTÉE SUIT LA DISTANCE D'AFFICHAGE, et ce n'est pas un réglage de
  confort.** Un joueur qui demande deux morceaux ne demande pas un panorama de
  six cents blocs. Écrite en dur à 640, elle coûtait **vingt-neuf pour cent** de
  la cadence du banc — qui ouvre TOUTES ses suites à `rr=2` — pour un paysage
  que personne n'avait demandé. Mise à l'échelle : 32,0 images/s contre 31,6.
- **ET CE QUI RESTE COÛTEUX AU BANC EST DE LA SURFACE, PAS DES TRIANGLES.** À
  `rr=12` le paysage coûte encore la moitié de la cadence du conteneur ; passer
  de 39 000 à 17 000 triangles n'a rien changé, mais diviser les pixels par
  quatre a ramené la perte de 45 % à 27 %. C'est du remplissage, payé en
  LOGICIEL par SwiftShader ; un vrai GPU le paie en matériel — une passe opaque
  de 3,9 Mpx (l'iPad, plafonné à deux pixels par point) est de l'ordre du
  dixième de milliseconde. **C'est le seul chiffre de cette livraison qui ne se
  transpose pas**, et le remède, s'il le fallait, tient dans une constante : le
  facteur 3,3 de `rayonHorizon`.

**Et il ne touche à rien.** Il LIT `terrainHeight` et n'écrit pas un bloc : les
deux empreintes de `plafond.js` ne bougent pas, et l'invariant 1 tient sans
qu'on ait rien à déclarer.

**ET LES VILLES Y SONT DES VILLES (v331).** Le paysage ne lisait que le
relief : au-delà des morceaux maillés, toute ville était de la prairie. Trois
règles.

- **LA QUESTION « EST-CE UNE VILLE ? » SE POSE PAR CASE D'INDEX, PAS À 280
  VILLES.** `villeMondeEn` (villesmonde.js) lit l'index de cases de 512 blocs
  des villes engendrées ; les sept villes bâties à la main passent d'abord par
  une BOÎTE (Manhattan élargie à 1 300 blocs), et `world.cityAt` — qui connaît
  la vraie forme de Manhattan par `TerreUrbaine` — n'est appelé que si elle
  touche. Mesuré : +0,05 à +0,07 µs par colonne, médiane de passages alternés.
- **LA SILHOUETTE EST UN `InstancedMesh` ENFANT DU PAYSAGE**, un appel de
  dessin, reconstruit dans `majDecoupe` (4 Hz, temps réel) avec la MÊME règle
  que le sol : une case dont le morceau est maillé n'a pas de pavé. Les données
  par sommet (hauteur de bâti, couleur des murs) DÉFILENT avec les hauteurs —
  jamais refaites. Dans Manhattan rendue (`sansNY`), on ne pose pas de pavés :
  elle a ses propres silhouettes.
- **LA HAUTEUR VIENT DE LA FICHE, PAS D'UN GOÛT.** `hMaison` et `trame.tours`
  pour les villes engendrées, passés par la même formule que la grammaire à
  travées (trois blocs par étage) ; une table (`VILLES_MAIN`) pour les sept
  villes bâties à la main. Les murs prennent la palette de la ville lue comme
  la carte 2D (`decorMapColor`) : deux couleurs pour le même endroit
  finissent par se contredire.

- **ET LE BÂTI SE COUPE EN RENDU LOGICIEL, comme les ombres (v247) et la
  couche HD (v287).** Le portail a rendu le gel d'arrivée de `monte.js` plus
  marqué sur la branche ; l'A/B sur la même page, en vol vers Paris, ordre
  alterné, l'a nommé : 4,8 · 5,8 · 5,7 images par seconde bâti visible contre
  15,0 · 17,6 · 11,6 caché. Du remplissage que SwiftShader paie au processeur ;
  `?batiloin=1` le force (captures, sonde). La teinte urbaine reste partout.

**ET LE PORTAIL ROUGE A FAIT TROUVER PLUS GROS QUE LE PAYSAGE : LE BUDGET DE
MAILLAGE ÉTAIT COMPTÉ PAR IMAGE.** Le témoin « on ne rattrape pas le bout du
monde qui se charge » est tombé (trou 66 pour une barre de 80), et la sonde —
même page, même vol, seul `visible` change — a montré pourquoi : 36 im/s et
143 blocs sans le paysage, 25 im/s et 86 avec. Le coût PROCESSEUR du paysage
est de 0,1 ms par image ; c'est donc le RENDU qui prend les images, et le
maillage, dont le budget était par IMAGE, en perdait d'autant.

**La bonne question n'était pas « comment rendre le paysage moins cher » mais
« pourquoi le chargement du monde dépend-il de la cadence d'affichage ».**
Douze millisecondes par image font 1 200 ms par seconde à cent images et
**TRENTE-SIX** à trois images par seconde — c'est-à-dire l'état exact d'une
tablette qui ARRIVE dans une ville. Le monde se chargeait vingt fois plus
lentement au moment précis où l'enfant en a besoin. C'est le piège de `dt` de
la v226, un étage plus haut, sur le chemin le plus chaud du jeu, et il y était
depuis toujours.

Le budget vise donc un DÉBIT (`MESH_MS_PAR_SECONDE = 720`, exactement les douze
millisecondes d'avant à soixante images) réparti sur les images telles qu'elles
viennent, plafonné à vingt-deux — la valeur que la v229 avait déjà mesurée
comme la limite au-delà de laquelle on paie un tiers de la cadence. **À cadence
haute rien ne change : la correction ne fait qu'AJOUTER du budget quand les
images s'allongent**, ce qui interdit l'emballement. Mesuré : trou 86 → 129
avec le paysage, 143 → 167 sans. **Un budget par image est une cadence de
ménage déguisée en horloge d'affichage** ; on cherche les autres le jour même.

**ET UNE BORNE DE GARDE SE POSE À LA MOITIÉ, JAMAIS À QUATRE-VINGT-DIX POUR
CENT — TROIS FOIS DANS LE MÊME FICHIER.** Une borne de garde n'est pas un
seuil : elle vérifie que la MESURE A EU LIEU, et elle sépare « ça s'est passé »
de « rien ne s'est passé », pas deux régimes voisins. Les trois de `monte.js`
étaient posées juste sous une valeur relevée sur une machine qui respirait, et
le paysage lointain — qui coûte des images au banc en logiciel — a suffi à les
faire passer dessous, sur du code sain :

| | exigeait | a rendu | vaut désormais |
| --- | --- | --- | --- |
| images enregistrées | > 200 | **186** | > 60 |
| blocs parcourus (mémoire) | > 2 000 | **1 963** | > 1 000 |
| blocs parcourus (paysage) | > 800 | **796** | > 400 |

**Et j'ai écrit la leçon pour la troisième en laissant les deux autres
intactes**, à quinze lignes de là : elles sont tombées au portail SUIVANT.
C'est le piège du verre dans les murs à l'échelle d'un seul fichier, et il a
coûté deux portails. Quand une borne se révèle mal posée, on relit toutes
celles du fichier dans la même passe.

### Ce qu'on retire de la scène se rend (`liberer.js`)

**`scene.remove()` NE REND PAS UN OCTET AU PILOTE GRAPHIQUE (v238).** Max : « le
jeu lague de plus en plus depuis un moment. » Une créature coûte **dix-neuf
géométries et demie**, le jeu en fait naître une toutes les 1,2 s, et
`removeCreature` faisait `scene.remove()` et rien d'autre. Mesuré à l'unité, dix
créatures nées puis retirées : **166 géométries prises, ZÉRO rendue** sur
`origin/main` ; 157 prises, 157 rendues ici. Sur un iPad, dont la mémoire
graphique est partagée avec le système, cela s'accumule toute la partie.

C'est la fuite de la v236 **par l'autre bout** — là c'étaient les blocs en
mémoire vive — et **le bon remède était déjà écrit dans le fichier d'à côté** :
`poissons.js` libère les siens depuis toujours. Quatrième fois que ce dépôt paie
la PORTÉE d'un remède et non la règle (le verre dans les murs, les arbres à
plat, les cadences de ménage). D'où un module COMMUN et non cinq copies.

- **UNE RESSOURCE PARTAGÉE NE SE LIBÈRE PAS, et c'est tout le piège.** Les
  personnages humains partagent DEUX matériaux pour tout le jeu
  (`matiereVivante`, `matiereVerre`) ; le mobilier de rue de `props.js` clone un
  modèle unique, donc partage sa géométrie. Un `dispose()` aveugle n'aurait pas
  fait fuir le jeu : il aurait fait **DISPARAÎTRE** tous les personnages du monde
  et le décor avec. La règle vit dans la ressource elle-même
  (`userData.partagee`, posé par `partager`), à côté de `montable`,
  `nourrissable` et `vole` — jamais dans une liste écrite ailleurs.
- **LE COMPTEUR DU MOTEUR N'ENREGISTRE QUE CE QUI EST DESSINÉ.**
  `renderer.info.memory.geometries` ne compte une géométrie qu'une fois
  RASTERISÉE. Ma première mesure unitaire rendait « 96 avant, 96 pendant, 96
  après » : les bêtes naissaient derrière la caméra. Elle ne mesurait RIEN et
  serait passée au vert des deux côtés. On pose `frustumCulled = false` avant de
  compter.
- **ON N'ATTEND PAS LE RENOUVELLEMENT, ON LE PROVOQUE — et trois sondes l'ont
  appris.** Joueur immobile, ZÉRO créature retirée : elles remplissent seulement
  leur plafond de seize, ce qui s'arrête tout seul, et j'ai pris ce remplissage
  pour la fuite. À pied, **un enfant avance à 15 % du temps réel sur ce banc**
  (`dt` borné, trois images par seconde) : six blocs en trente secondes, jamais
  les soixante-dix qui déclenchent un retrait. Dix allers-retours provoquent bien
  le renouvellement, mais le disque de morceaux ne revient pas au même endroit
  des deux côtés (92 contre 99, soit vingt géométries) : le verdict mesurerait le
  banc. **La mesure qui tranche est unitaire** — dix bêtes, prises et rendues.
- **Et le banc NE PEUT PAS subir cette panne** : il a de la mémoire à revendre,
  son fil principal est inactif 81 % du temps, sa cadence mesure SwiftShader. On
  mesure la CAUSE (des géométries) et jamais l'effet (des images par seconde) —
  leçon de la v236, deuxième application.

### Le monde (`world.js`)

**CE QUI S'ENGENDRE S'OUBLIE — et cela avait échappé à tout le monde (v236).**
`main.js` défait les MAILLAGES des morceaux dépassés depuis toujours ;
`world.chunks`, lui, n'a jamais rendu un seul octet. Un morceau pèse
`16 × 16 × 160 × 2` = **quatre-vingts kilo-octets**, et un avion à cent dix
blocs par seconde en engendre **quatre-vingt-sept par seconde**. Mesuré sur le
même vol, à la même distance : 245 Mo après trente secondes, 693 après
quatre-vingt-dix, **2 328 Mo après cinq minutes**. L'iPad ferme l'onglet bien
avant — et longtemps avant de le fermer, il se fige pour faire de la place.
C'est le « trois secondes d'arrêt, une seconde de jeu » de Max.

`oublierLoinDe(pcx, pcz, rayon)` jette blocs, plafond de maillage et drapeau
sale au-delà du rayon ; `main.js` l'appelle là où il défait déjà les maillages,
à `UNLOAD_RADIUS + 4` — **plus loin qu'on ne démaille**, pour qu'un demi-tour
ne réengendre pas ce qu'on vient de quitter. Trois choses à savoir avant d'y
toucher.

- **RIEN NE SE PERD, ET C'EST CE QUI REND L'OUBLI COMPATIBLE AVEC L'INVARIANT
  1.** Le terrain est DÉTERMINISTE et les blocs des enfants vivent dans
  `edits`, que `generateChunk` réapplique. Un morceau oublié se réengendre à
  l'identique. Cela se PROUVE — le second témoin pose une brique, force
  l'oubli, et vérifie qu'elle revient avec le terrain d'à côté inchangé — cela
  ne se raisonne pas.
- **UN VERDICT EN QUANTITÉ, PAS EN DURÉE.** Ce conteneur a de la mémoire à
  revendre : la cadence est IDENTIQUE des deux côtés (35,6 contre 34,5 images
  par seconde sur cinq minutes) et le temps de ramasse-miettes aussi (4,3 s
  contre 4,2 sur quatre-vingt-dix). **Le banc ne peut pas souffrir de ce
  défaut.** Un témoin en millisecondes aurait été vert des deux côtés et
  n'aurait rien prouvé ; le mégaoctet, lui, sépare 245 de 27. C'est la leçon de
  la minicarte (une distance plutôt qu'une durée) par un troisième bout, et
  elle se généralise : **quand le banc ne peut pas subir la panne, on mesure la
  CAUSE et non l'effet.**
- **LES TROIS COUPABLES ÉVIDENTS ÉTAIENT INNOCENTS, ET C'EST MESURÉ.** Le
  rendu fait **4,6 %** du temps d'un vol (834 ms sur 18 s). La caméra cubique
  des reflets ne tourne **JAMAIS** en vol — zéro image sur cent huit — malgré
  son rayon de 45 blocs qui ignore l'altitude, parce qu'un convoi n'existe plus
  si loin. Couper `renderer.debug.checkShaderErrors` ne rend rien (pire image
  1 800 → 1 633, dans le bruit) : il n'y a que SIX programmes dans tout le jeu.
  Ces trois-là sont des non-résultats mesurés ; on ne les réessaie pas.

**ET UNE SONDE DE DÉPLACEMENT VÉRIFIE D'ABORD QU'ELLE S'EST DÉPLACÉE.** Mes
trois premières sondes ont mesuré un jeu **à l'arrêt** : `banc.joueur` ouvre la
page, mais c'est `banc.jouerSeul` qui clique sur « Jouer » — sans quoi
`running` reste faux, `player.update` n'est jamais appelé, et l'avion ne bouge
pas d'un bloc. Trois profils, trois conclusions, et le joueur n'avait pas
avancé. **Le premier champ que doit rendre une sonde de déplacement, c'est la
distance parcourue** ; les témoins de vol la vérifient désormais
(`parcouru > 2000`).

- Plafond `HEIGHT = 160`, sol figé à `SOMMET_TERRAIN = 80` (voir invariant 1).
- `sommetColonne(x, z)` part du sommet réel du morceau de monde, jamais du
  plafond : relever le ciel ne doit rien coûter aux recherches de sol.
- Le vol a un toit (`PLAFOND_VOL`) : sans lui, l'enfant sortait du monde par le
  haut, dans une zone où poser un bloc ne fait rien.

### La sauvegarde (`sync.js`)

Le profil d'un enfant est **un seul document JSON**, rangé dans le nuage sous
son prénom. Trois règles s'y sont payées cher.

- **On pèse ce qui part, pas ce qu'on a sous la main.** L'ancienne version
  mesurait le document *en clair* et le comparait au plafond ; elle se croyait
  pleine cinq fois trop tôt et jetait les blocs d'un enfant qui avait encore
  toute la place. La mesure se fait **après compression** (`ajuster()`), sur le
  paquet réel.
- **Ce qui est déjà compressé ne partage pas le document.** Les photos sont des
  JPEG : elles ne se réduisent pas d'un octet, et elles pesaient un tiers de la
  place de Marlon. Elles ont leur document, `prénom~photos`. Toute nouvelle
  donnée lourde et incompressible doit suivre le même chemin — pas le document
  du profil.
- **Un champ qui change de forme change de nom.** Les blocs compressés
  s'appellent `editsz`, ils ne remplacent pas `edits`. Une tablette restée sur
  l'ancienne version ne comprend pas le champ neuf, garde donc ses propres
  blocs et les republie en clair : elle n'abîme rien. Un `edits` devenu
  illisible, lui, lui aurait fait croire à un monde vide.

- **Un champ vide des deux côtés doit rester ABSENT.** La fusion compare le
  document fusionné au document local, champ par champ, pour répondre à une
  seule question : a-t-elle vraiment rapporté quelque chose ? C'est cette
  réponse qui décide si **la page se relance**. Fabriquer un objet vide là où
  il n'y avait rien — `undefined` contre `{}` — répond « oui » à la première
  fusion de toute tablette neuve, et l'enfant voit son jeu redémarrer en pleine
  partie. Livré en v188 avec le champ des garages, corrigé en v189. La règle
  vaut pour **tout** champ ajouté à `FIELDS`, et le témoin qui la garde est
  dans `sauvegarde.js` : fusionner le profil avec lui-même ne change rien —
  éprouvé dans l'état d'une tablette NEUVE, sans quoi il est vert des deux
  côtés et ne prouve rien.

Tailler reste le dernier recours, et **jamais en silence** : `onTrim` le dit.
Ce qu'on sacrifie, ce sont les blocs les plus anciens, tous mondes confondus —
tailler monde par monde en effacerait un entier.

### La migration de la carte (`world.js`, `sync.js`) — une chaîne, pure, qui suit les villes

Trois cartes ont existé : 0,75 km par bloc (`terreAvant`), 0,375 (`terreV2`,
v199 à v240) et 0,1875 (`terre`, v242). Chacune reste figée dans `mondes.js`
et se demande à `positionDe(cle, mondeId)` : c'est ce qui permet de savoir
**où était New York avant**, et donc de combien un bloc doit suivre.

- **UN BLOC SUIT SA VILLE.** La migration de v199 ne déplaçait les blocs qu'en
  hauteur ; celle de v242 est une chaîne (`CARTE_VERSION` 1 → 2 → 3) dont la
  seconde marche translate un bloc posé dans une ville — le rectangle de
  Manhattan (`BORNES` + marge) ou le disque d'une ville du registre — du
  déplacement de cette ville, SANS changer sa hauteur : sous une ville, c'est
  la ville qui décide du sol. Un bloc de campagne ne bouge qu'en hauteur,
  borné à `ECART_MAX`. La position sauvegardée de l'enfant suit de même, et
  les marques d'import de Manhattan suivent comme un bloc posé à leur origine.
- **LA MIGRATION EST PURE, PARCE QUE LA FUSION EST UNE UNION.** Migrer le
  stockage de l'appareil ne suffit pas : une tablette restée sur l'ancienne
  version republie ses clés d'avant, et la fusion les rapportait pour
  toujours — la maison dans New York ET son fantôme en mer. `migrerCarte3`
  est donc appliquée à chaque document reçu du nuage avant la fusion
  (`sync.js`, `merge`). C'est la règle du receveur qui cède, appliquée à la
  carte.
- **CE QUI LA REND IDEMPOTENTE, C'EST LA DATE.** Un bloc daté d'avant
  `DATE_CARTE_3` a été posé sur l'ancienne carte ; un bloc déplacé PREND la
  date de la refonte, pour qu'aucune passe ne le redéplace et pour qu'il
  l'emporte sur sa copie d'avant. Le prix est déclaré dans `TASKS.md` : une
  tablette qui joue encore sur l'ancienne version après cette heure pose des
  blocs que la migration laissera où ils sont.
- **Un témoin de migration interroge la fonction PURE sur un document
  fabriqué** (`plafond.js`), et un second passe par `profileSync.merge` avec
  un document tel que l'ancienne version l'écrirait (`sauvegarde.js`). Les
  deux sont rouges sur l'ancien code parce que la fonction n'existe pas — et
  ils le disent, au lieu de s'effondrer.
- **Quand une ville change d'échelle ou de place, on cherche TOUT ce qui la
  vise** — et un registre qui ment se voit à ses lecteurs : `passants.js`
  écrit 1 200 pour New York là où le registre dit 152. Le témoin du
  rectangle (`carteMonde.js`) demande le rectangle au plan et l'origine au
  registre, jamais un chiffre recopié.

### La refonte de la carte — ce que Max a tranché

- **L'échelle.** Équirectangulaire centrée sur Paris, **1 bloc = 4 km** —
  remesurée depuis, parce que les villes ne sont pas à l'échelle de la carte :
  0,75 km par bloc, puis 0,375 (v199), puis 0,1875 (v242). Une
  seule entorse : la traversée de l'Atlantique (−74° à −10°) ramenée à **60 %**.
  L'Europe, l'Afrique et l'Asie gardent leur échelle exacte au bloc près, et
  Paris-Tokyo aussi — c'est de la terre ferme d'un bout à l'autre, pas un
  océan. New York 1 415 → 956 blocs, San Francisco 2 303 → 1 840.
- **On voyage par la carte.** La téléportation existe déjà, et c'est elle qui
  rend ces distances jouables. Pas de traversée à pied à prévoir.
- **Casser est autorisé, gâcher ne l'est pas.** Max accepte de perdre des
  constructions pour refaire le fond correctement. Cela ne dispense pas de
  garder ce qui se garde sans effort : le sol qui bouge d'un ou deux blocs sous
  une maison se rattrape en migrant la colonne, et une copie de sauvegarde des
  blocs d'avant la refonte coûte trois lignes maintenant que le document a de
  la place. On casse ce qu'on ne sait pas suivre, pas ce qu'on n'a pas envie de
  suivre.
- **Le réalisme prime sur ce qui existe.** Consigne explicite de Max : **le
  métro de Paris est souterrain**, il n'y a pas de train aérien dans Paris.
  L'anneau aérien actuel (`ville.js:metroAerien`, `vehicules.js:metro`,
  `main.js`) est à refaire sous terre. Le même critère s'applique partout
  ailleurs : on regarde comment la vraie ville est faite avant de bâtir.

### Le programme réalisme v2 — la règle de jugement

Consigne permanente de Max : **il juge uniquement sur captures** — une vue
au niveau de la rue et une vue aérienne, à côté d'une vraie photo de
référence du même endroit, AVANT de fusionner. « Si un élément ne se
reconnaît pas au premier regard (un lampadaire doit ressembler à un
lampadaire), refais-le. » On itère sur captures, on montre, on ne fusionne
que validé. C'est cette discipline qui a attrapé, dans l'ordre : les
lampadaires-monolithes, le damier des marquages, les auvents criards, et
quatre voitures « trop cubiques » avant le modèle d'artiste.

État : mobilier urbain (v180), routes, façades et voiture (v181) livrés.
La grammaire à travées est le DÉFAUT de toute ville à trame (mur de la
palette de la ville, hauteur de sa fiche, corniche en couronnement) ; les
médinas (`ruelles`) gardent leur grammaire propre — Marrakech sans baies
vitrées, c'est vérifié par témoin. Reste le point 4 : la vie dense —
voitures qui s'arrêtent aux feux, enseignes lumineuses la nuit.

### Deux échelles dans la même ville, et c'est voulu

Au SOL, un bloc vaut trente mètres à Manhattan (vingt à Washington). En
HAUTEUR, il vaut un étage — trois mètres et demi. Le rapport est donc de
huit ou neuf, et c'est la convention de tout le jeu depuis l'obélisque de
Washington : sans elle, une skyline n'est pas lisible.

**Ce qui se trompe de scala, c'est le PLAN.** L'Empire State bâti « à
l'échelle de sa hauteur » faisait vingt-six blocs de large — sept cent
cinquante mètres, un plateau. Sa vraie emprise, cent trente mètres, en
fait quatre. Règle : les HAUTEURS suivent l'étage, les EMPRISES suivent le
sol. Et la borne d'emprise (`bh = min(bh, 10 + 14 × emprise)`) se règle
sur ce rapport-là, pas sur l'intuition : à 4 × 14 elle laissait Midtown à
vingt-six blocs, une ville de garages.

**Le corollaire, vérifié en capture :** des hauteurs tirées à plat donnent
une brosse vue du ciel. Une vraie ville est un TAPIS de dix à vingt étages
d'où sortent quelques tours — c'est ce que fait `t³`, qui n'envoie au
sommet que le dernier dixième des tirages.

**ET CES DEUX RÈGLES VALENT POUR TOUTE VILLE À TOURS, pas seulement pour
Manhattan.** San Francisco a vécu neuf versions avec la loi à plat ET avec
le défaut que Manhattan avait pourtant payé et écrit noir sur blanc : hors
fenêtre, une colonne de tour posait du VERRE. Comme l'intérieur d'un
bâtiment est CREUX — il l'est partout, c'est ce qui rend une ville
possible — on voyait au travers, et le Financial District n'était qu'un
nuage de cubes gris suspendus. Signalé par Max en capture, v195.

Trois règles en sortent, et elles s'appliquent à la prochaine ville :

- **Le verre est la MINORITÉ d'une façade.** Sa trame, rien de plus. Une
  tour dont le mur par défaut est transparent n'est pas une tour.
- **Un bloc de `GLASS` fait ici trente-sept mètres de large.** Au pied
  d'une tour, la façade devient un aquarium d'un seul tenant. Le verre
  d'un immeuble moderne est `CITY_BLOCK.CURTAIN`, qui porte les meneaux
  DANS sa texture — il est opaque, et il s'allume déjà la nuit. Même
  principe que les blocs `ARCHI` pour les villes haussmanniennes : une
  fenêtre est un DESSIN, pas un trou.
- **Le toit d'une maison n'est pas blanc.** La corniche est une ligne de
  FAÇADE ; posée sur la dalle de toiture, elle couvre tout le toit d'une
  maison de trois blocs de large, et la ville est enneigée vue du ciel.
  738 toits blancs pour 94 sombres à Alamo Square avant la correction.

### Le verre dans un mur — la panne qui s'est payée QUATRE fois

**Un bâtiment est CREUX ; un bloc de `GLASS` dans son mur est donc un TROU.**
Cette panne a été corrigée quatre fois, et à chaque fois le remède est resté
dans le fichier qu'on regardait :

| | découverte | où le remède s'est arrêté |
| --- | --- | --- |
| v195 | San Francisco, signalée par Max en capture | son seul centre |
| v200 | Rome et Tokyo, en capture de contrôle | `villesmonde.js` |
| v202 | les sept villes bâties à la main | — |

Mesuré dans le volume bâti avant la v202 : **New York 30,4 %**, Londres
23,1 %, Nice 18,7 %, Lille 16,4 %, San Francisco 14,2 % hors centre,
Washington 1,2 %. Seul Paris était propre, parce qu'il utilise les blocs
`ARCHI` depuis sa remise à l'échelle.

**La leçon n'est pas la règle — elle était déjà écrite — c'est la PORTÉE du
remède.** Chaque ville a sa propre boucle de façade, dans son propre fichier,
et corriger celle qu'on a sous les yeux laisse les autres intactes. Quand une
panne touche une grammaire partagée, on cherche TOUTES ses occurrences le jour
même : `grep -n "fenetre ? VERRE\|GLASS" src/*.js` prend dix secondes.

**Et le témoin interroge le BÂTISSEUR, pas le monde chargé.** `getBlock` ne
répond que sur les morceaux déjà engendrés : lire sept villes sans y aller
rend zéro bloc partout, et le témoin passe au vert en ne prouvant rien. Les
`batirColonne*` sont des fonctions pures, on les appelle directement — et un
compte nul se traite comme un défaut.

### Les villes engendrées — deux unités dans une fiche, et un mur qui était un trou

**Un bâtiment est CREUX. Un bloc de verre dans son mur est donc un TROU par
lequel on voit au travers.** C'est la panne de San Francisco (v195), et le
remède avait été écrit pour `sanfrancisco.js` SEUL : les deux cent
soixante-neuf villes de `villesmonde.js` la portaient encore, treize versions
plus tard. Mesuré dans le volume bâti : Rome 24,7 % de verre, **Tokyo 47,4 %**,
Marrakech 33,3 %. Presque la moitié de Tokyo était un trou, et la vue de rue le
montrait sans ambiguïté — des étagères, pas des immeubles.

Trois règles, les mêmes qu'à San Francisco, et qui valent pour la prochaine
ville :

- **La baie ne vit que sur le BORD du lot.** L'ancienne grammaire posait sa
  fenêtre sur TOUTES les colonnes du lot, intérieur compris : le bâtiment
  n'avait aucune masse. Le cœur du lot est du mur plein.
- **Une fenêtre est un DESSIN, pas un trou.** `ARCHI.ETAGE`, `ARCHI.ENTRESOL`,
  `ARCHI.VITRINE`, `CITY_BLOCK.CURTAIN` portent leurs meneaux dans leur
  texture, sont opaques, et s'allument déjà la nuit. Un bloc de `GLASS` fait
  ici vingt-huit mètres de large.
- **La devanture aussi.** Deux rangs de verre au rez-de-chaussée ouvraient le
  bâtiment sur son vide tout le long des rues commerçantes.

**Et une fiche de ville a DEUX unités, depuis v200.** `f.echelle` est en blocs
du monde — c'est elle qui place monuments et lieux, et elle vaut l'échelle
d'auteur multipliée par `K_VILLES` (1,8). La géométrie écrite à la main dans la
fiche — courbe de fleuve, centre de colline, distance au rivage — est restée
dans ses unités D'ORIGINE, à dessein : on ne réécrit pas trois cents
coordonnées relevées sur de vraies cartes. Ce sont les LECTEURS qui se
convertissent, en divisant leur (u, v) par `f.K` au seuil de chaque fonction de
géographie. Trois choses à savoir :

- **Ce qui reste en BLOCS, c'est la trame de rues** — largeur de chaussée, de
  trottoir, pas d'îlot — parce qu'une rue doit rester praticable quelle que
  soit l'échelle. C'est de là que vient tout le gain : l'îlot passe de 750 à
  417 mètres sans qu'une seule ligne de trame ne change.
- **Ce qui reste en BLOCS aussi, ce sont les MOTIFS** : un `((u + v) & 3)` n'a
  de sens que sur des entiers de bloc. Diviser avant de tirer un motif le
  détruit.
- **Une sonde qui vise un (u, v) en dur meurt à la remise à l'échelle
  suivante.** Les seize points d'eau de `carteMonde.js` sont en unités de
  fiche et se multiplient par `f.K` à la lecture. Même leçon qu'`adresseParis`
  et `adresseSF`, par un troisième bout.

**Et une échelle ne se recopie JAMAIS.** `chercheMer` convertissait ses blocs
en kilomètres avec un `0.75` figé depuis la carte d'avant ; la v199 l'a
divisée par deux et la sonde a continué de chercher la mer deux fois trop loin,
sans que rien ne rougisse. Elle se demande à `MONDES.terre.projection`. Et sa
marge, elle, est en KILOMÈTRES — corrigée au bloc près elle devenait trop
courte, et Beyrouth, Koweït et Reykjavik perdaient leur rivage, parce que le
planisphère du jeu a des mailles d'une cinquantaine de kilomètres.

### La nuit, et pourquoi elle était noire

Le monde entier partage UN matériau (`solidMaterial`) dont la couleur EST
le niveau de lumière du jour. À minuit tout tombe à trente pour cent, et
les villes s'éteignaient — fenêtres comprises. Le mailleur sort donc les
vitres allumées dans une TROISIÈME géométrie (`lumineux`, à côté de
`solid` et `water`), rendue avec un matériau qu'on n'éteint pas.

Trois choses à savoir avant d'y toucher :

- **Ce qui s'allume n'est pas le verre.** Dans les villes générées, une
  fenêtre est le DESSIN d'un bloc de façade (`ARCHI.ETAGE`, `NOBLE`,
  `ENTRESOL`, `VITRINE`), pas un bloc de verre. N'allumer que `GLASS`
  n'allume presque rien.
- **Tout matériau qui rend de la géométrie fusionnée doit passer par
  `activerTuilage()`.** Les UV vont au-delà de 1 et c'est un shader qui
  les replie dans leur tuile. Sans lui, une baie étirée sur trois blocs
  échantillonne l'atlas ENTIER : un immeuble arc-en-ciel en pleine rue,
  vu à la première capture de nuit.
- **Le tirage se fait en coordonnées du MONDE.** En coordonnées locales,
  le même motif se répète dans chaque morceau — et les fenêtres changent
  au remaillage.

### Ce qui se dessine, et ce qui coûte

**Ce ne sont ni les triangles ni les pixels : ce sont les APPELS DE DESSIN.**
Signalé par Max sur son iPad — « ça lag, ce n'est pas très fluide ». Mesuré à
la sonde au centre de Paris : 1 522 appels par image, dont **1 353 pour des
personnages**, quatre-vingt-neuf pour cent. Les triangles, eux, plafonnaient à
un demi-million — un iPad en avale des millions. Chaque appel est un
aller-retour avec le pilote, payé par le PROCESSEUR : c'est le goulot du
mobile, et il ne se voit pas dans un compte de triangles.

Trois choses à savoir avant de chercher ailleurs :

- **Un personnage coûte onze maillages.** Un par membre articulé — deux bras,
  deux jambes, le torse — plus le verre de chacun. C'est le prix d'une marche
  qui se voit, et il est juste. Ce qui ne l'est pas, c'est de le payer pour
  quelqu'un qui fait quatorze pixels de haut.
- **Cesser d'ANIMER ne suffit pas, il faut cesser de DESSINER.** Le jeu
  n'animait plus les personnages au-delà de cent quarante blocs — le
  commentaire disait déjà « personne ne les voit » — mais leurs maillages
  partaient au rendu à chaque image. Cent treize des cent cinquante-trois
  personnages du monde étaient à plus de quatre-vingt-dix blocs.
- **La distance vient de `vie.js` (`VU = 62`), qui appliquait DÉJÀ la règle
  aux siens.** La garnison du château s'efface à soixante-deux blocs depuis
  des versions et personne ne l'a jamais signalé : c'est la preuve que la
  distance est bonne. Ce qui manquait, c'est qu'elle vaille pour TOUS les
  personnages. Et l'on n'allume jamais ce qu'on n'a pas éteint — `vie.js`
  cache les siens pour ses propres raisons, les rallumer sous ses pieds les
  ferait clignoter. D'où le drapeau `__cachePourLoin`.

Résultat : 1 522 → 451 appels. Aucun détail retiré, aucune distance de vue
réduite, aucune texture dégradée.

### Les arbres d'une ville — et le piège qui se répète

**Un `sol*` rend un identifiant de SOL : un feuillage rendu comme tel se pose
À PLAT.** C'est de la pelouse sur le bitume. Paris l'a payé en v187, et
Londres, Nice et Lille marquaient leurs arbres exactement de la même façon
sans jamais recevoir le remède — trois villes, dix versions. Il est
désormais partagé : `arbreDeVille` (world.js) fait pousser un fût et une
couronne pour toute ville de la boucle générique.

Quatre choses à savoir avant d'en planter ailleurs :

- **Il faut ESPACER beaucoup plus qu'on ne croit.** Un trottoir est une
  SURFACE, pas une ligne, et chaque couronne déborde d'un bloc de chaque
  côté. Une colonne sur onze faisait un mur vert d'un bout à l'autre de la
  rue, l'enfant marchant dans le feuillage. Une sur trente et un.
- **Un fût de deux blocs met la couronne à hauteur de visage.** Trois blocs,
  et l'on marche DESSOUS — c'est ce qui fait une rue plantée plutôt qu'un
  fourré.
- **Au pied d'un arbre, le sol est celui d'à côté** : de l'herbe dans un
  parc, du trottoir dans la rue. Poser du trottoir partout pavait Hyde Park
  sous chacun de ses marronniers.
- **ET LE DRAPEAU `fait` SE LÈVE AVANT DE PASSER.** Le `continue` de cette
  boucle-là sort de la recherche de LA VILLE, pas de la boucle des colonnes :
  sans lui, la grille de rues générique repasse derrière et écrase le sol
  qu'on vient de poser. Le tronc et la couronne survivent, eux — le défaut
  est donc INVISIBLE en capture, et seul un témoin qui lit le bloc au sol
  peut le voir.

### Les couleurs des villes engendrées — et un nom qui mentait

**Une constante nommée `OCRE` valait `uni(1)`, c'est-à-dire l'ORANGE de
signalisation (232, 137, 44).** Elle peignait les murs de dix-neuf villes.
`ROSE` était un saumon vif, `TUILE` le rouge de la palette. D'où l'aspect
« briques de plastique » que Max a signalé sur Rome, et qu'on avait déjà
corrigé pour les Painted Ladies de San Francisco en v195 sans voir que le
même mal courait sur toute la carte.

Trois choses à retenir avant d'y toucher :

- **On ne change pas la palette de décor, on choisit dedans.** Ces trente
  couleurs sont celles avec lesquelles les enfants construisent. Les tons
  chauds et rompus qui existent : Beige (215, 195, 160), Sable
  (225, 210, 170), Kaki (150, 140, 100), Marron, Crème.
- **Une constante n'attrape pas ce qui est écrit en dur.** `uni(2)`, le
  jaune de balise, figurait tel quel dans DOUZE fiches de ville : renommer
  ou réaffecter `OCRE` ne pouvait rien pour lui. Chercher les littéraux
  autant que les constantes.
- **La carte 2D et le bloc doivent dire la même chose.** `couleurToits`
  annonçait `[178, 108, 82]` — un brun orangé — depuis toujours, pendant
  que `TUILE` posait du rouge vif. Quand les deux divergent, c'est en
  général la carte qui a raison : elle a été réglée à l'œil sur une vue
  d'ensemble.

**Et la hauteur des villes engendrées n'est PAS un défaut.** La chaîne va de
« 3 à 5 étages » dans la fiche à onze ou seize blocs rendus : la grammaire à
travées dépense trois blocs par étage, plus le rez-de-chaussée, la corniche
et le toit. C'est tentant de la raboter — et ce serait faux. Au sol, un bloc
de Rome vaut CINQUANTE mètres (échelle 20 blocs/km) : un immeuble de cinq
blocs de haut y serait une galette. C'est la même convention à deux échelles
que Manhattan et Washington. Ce qui cloche à Rome n'est pas la hauteur, c'est
l'emprise — et cela se corrige en remettant la ville à l'échelle, pas en la
rabotant. Or les marges entre villes voisines vont de 8 à 41 blocs : doubler
Rome la ferait toucher Naples. Décision de carte, pas de rendu.

**Fait en v199 et v200** : la carte a doublé, puis les villes engendrées ont
pris 1,8 fois leur emprise. Rome est à 36 blocs par kilomètre, ses îlots font
417 mètres. La hauteur, elle, n'a jamais bougé — elle n'était pas le défaut.

### La vie des rues — et le plafond qui la tuait

**Un rayon écrit quand les villes étaient petites est une bombe à retardement.**
`passants.js` posait ses dix habitants dans `Math.min(c.r, 40)` autour du
centre, sur un anneau de 0,25 à 0,75 de ce rayon — soit dix à trente blocs.
Écrit quand une ville en faisait cinquante, c'était juste. Londres fait
aujourd'hui 112 blocs de rayon, Paris 185, San Francisco 220 : toute la vie
tenait dans un disque de trente blocs au milieu, et Max, à soixante blocs de
là, a signalé des « villes vides ». C'est le MÊME défaut que les anneaux de
voitures, à un fichier près.

Trois règles en sortent :

- **On peuple autour de L'ENFANT, pas autour du centre.** Dix passants ne
  peuvent pas remplir un disque de deux cents blocs ; ils remplissent très bien
  ce que l'enfant voit. Ceux qu'il distance sont rapatriés devant lui — la
  ville reste habitée partout sans un seul habitant de plus.
- **On les pose SUR LA RUE.** Un passant tombé derrière un immeuble n'existe
  pas : vingt-deux personnages à moins de soixante-dix blocs, et pas un dans le
  cadre, c'est ce qu'une capture a montré. On essaie une douzaine de points et
  l'on garde le premier dont le bloc de surface est de la chaussée. Le monde
  répond tout seul — nul besoin de connaître la ville.
- **`sommetColonne` rend le y DU bloc de surface**, pas celui de l'espace
  au-dessus. Lu un cran trop bas, on interroge la terre sous la chaussée et
  AUCUN point ne passe jamais le test — la sélection tombe alors en silence sur
  son repli, et l'on croit que la règle ne marche pas.

**ON RAPATRIE CELUI QU'ON NE VOIT PLUS, PAS CELUI QUI EST LOIN (v217).** Max,
après la v216 : « clairement pas de piétons, pas de vie dans les villes. » Deux
nombres ne se parlaient pas : on ramenait un passant devant l'enfant au-delà de
CENT CINQUANTE blocs, quand un personnage cesse d'être dessiné à SOIXANTE-DEUX
(`VU` de `vie.js`, appliqué à tous depuis la v196). Entre les deux, il est
invisible ET pas rapatrié. Mesuré en traversant Paris : 10, 8, 7, 4, **0**, 2,
1 piétons dessinés. Trois choses en sortent :

- **Le seuil de rapatriement se règle sur la PORTÉE DE RENDU, jamais sur une
  intuition de distance.** Soixante-quatre, c'est-à-dire juste au-delà de
  soixante-deux : quiconque sort du champ revient devant, et le déplacement
  est par construction invisible. Toute autre valeur choisit entre une ville
  vide (trop grande) et des gens qui sautent sous les yeux de l'enfant (trop
  petite).
- **UN TÉMOIN QUI ATTEND NE PEUT PAS VOIR CE QUI SE CASSE EN MARCHANT.**
  « Loin du centre, la ville est habitée quand même » se posait à
  quatre-cinquièmes du rayon et attendait — il est VERT sur l'ancien code, et
  il l'était depuis la v178. Le défaut ne vit que dans le déplacement. Un
  témoin de vie de rue traverse la ville et mesure le PIRE de la traversée,
  pas la moyenne : c'est le creux qui fait dire à un enfant que la ville est
  morte.
- **Dix habitants par ville, c'était le chiffre d'avant les grandes villes.**
  Dix-huit, et le prix se mesure : 88 à 265 appels de dessin sur la traversée
  de Paris, pour un budget de l'ordre de 450 — un passant ne se dessine que
  sous soixante-deux blocs, les dix-huit ne sont donc jamais tous à l'écran.
- **UN DÉPLACEMENT QUI NE RAMÈNE PERSONNE DANS LE CHAMP NE SE FAIT PAS — et
  c'est le prix caché d'un seuil serré.** `dansLaVille` ramène tout candidat
  DANS la ville : quand l'enfant est DEHORS, le point reposé reste au-delà du
  seuil, et le passant est repris au tour suivant. Mesuré au point
  d'apparition : **17 à 18 passants sur 18 replacés toutes les deux secondes,
  indéfiniment, et zéro jamais en vue** — douze sondages de colonne chacun,
  pour rien. La page en devenait assez occupée pour ne plus finir son
  rechargement, et c'est `maj.js` qui l'a dit : rouge sur la branche, VERT sur
  `origin/main`, donc à moi. La borne est exacte et non prudente : un point
  clampé se retrouve à `0,9 × r` du centre, donc à au moins `d − 0,9 r` de
  l'enfant ; si cela dépasse déjà le seuil, aucun tirage ne peut ramener qui
  que ce soit. Plus le seuil de rapatriement se resserre, plus il faut
  vérifier que le déplacement SERT.
- **Et c'est `maj.js` — pas un témoin de vie de rue — qui a attrapé ce
  défaut-là.** Une régression de PERFORMANCE ne se voit pas là où on l'a
  écrite : elle se voit là où une durée est un verdict. C'est la raison d'être
  de la voie longue, et elle vient de la payer une fois de plus.

  **Et cela découvre un angle mort de la table des gardiens, qu'aucune entrée
  ne peut combler.** `src/passants.js` a `monte.js` pour gardien ; l'empreinte
  de reprise étant PAR SUITE, une modification de `passants.js` n'invalide donc
  pas l'acquis de `maj.js`. Si `maj.js` avait été verte au tour d'avant, la
  régression serait passée en silence — elle n'a rejoué ici que parce qu'elle
  était déjà rouge. Déclarer `passants.js` gardien de `maj.js` ne réglerait
  rien : n'importe quel fichier qui alourdit la page a le même effet, et tout
  déclarer revient à supprimer l'aiguillage. Le remède reste celui qui a
  marché : **la voie longue tourne de temps en temps même quand rien ne
  l'exige** — c'est écrit plus haut, et c'est la deuxième fois que cela sauve
  une livraison.

**ON PEUPLE CE QUE L'ENFANT VOIT, ET IL VOIT QUARANTE-SIX DEGRÉS (v218).** La
v217 avait gardé la ville habitée ; Max ne voyait toujours personne. Le champ
de vision fait 46°, un huitième du tour d'horizon : dix-huit passants en
couronne en donnent 18 × 46/360 = **2,3** dans le cadre. Trois choses, dont
une erreur à ne pas refaire.

- **RESSERRER LA COURONNE NE MULTIPLIE RIEN — et c'était mon conseil.** Une
  couronne est uniforme en angle : son RAYON ne décide pas combien de gens
  tombent dans un secteur de 46°. Mesuré 2,3 à 14-55 blocs et 2,33 à 14-34.
  Ce que le rayon décide, c'est la LISIBILITÉ — à trente-quatre blocs un
  personnage se voit encore et passe rarement derrière un immeuble. Devant un
  « il n'y en a pas assez », la première question est : combien en voit-on, et
  qu'est-ce qui gouverne ce nombre ?
- **CE QUI GOUVERNE LE NOMBRE, C'EST LA RÉPARTITION, ET ELLE EST GRATUITE.**
  En acheter plus se paie en appels de dessin (onze maillages par passant) ;
  les poser là où l'enfant REGARDE ne coûte rien. Deux sur trois dans un cône
  de ±60° devant lui, le tiers restant partout — sinon un demi-tour donne un
  désert.
- **ON REPLACE AUSSI CELUI QUI EST PASSÉ DERRIÈRE, PAS SEULEMENT LE LOINTAIN.**
  Un seuil de distance seul ne suffit pas : un pas de vingt blocs laisse ceux
  qu'on vient de dépasser SOUS le seuil, donc immobiles derrière soi, et la rue
  se vide à mesure qu'on avance — mesuré 6, 0, 0, 0 dans le cadre. Au-delà de
  la ligne des épaules (90° de l'axe du regard) on est très largement hors d'un
  champ de 46° : le déplacement reste invisible, c'est la même garantie que
  `TROP_LOIN`, par l'angle au lieu de la distance.
- **Et un témoin de vie de rue doit MARCHER, CAP DEVANT, et compter ce qui est
  DANS LE CADRE.** Compter « à moins de soixante-deux blocs » ne peut pas voir
  ce défaut : les dix-huit y sont des deux côtés. C'est le troisième témoin de
  cette famille, et à chaque fois le même piège — celui de la v217 attendait
  au lieu de marcher, celui-ci comptait la portée au lieu du cadre.
- **Une mesure isolée n'est pas un fait.** J'ai annoncé « la rue de Rivoli n'a
  pas un piéton dans le cadre sur tout son parcours », vu une fois : la mesure
  suivante sur le même code rendait 3, 2, 1, 1. Ce qui tient d'une exécution à
  l'autre, c'est la MOYENNE (1,5 contre 5,25), pas le creux le plus frappant.
  Un verdict se pose sur ce qui se reproduit.

**UNE CADENCE DE MÉNAGE COMPTE EN TEMPS RÉEL, PAS EN `dt` (v226).** C'est la
cause, enfin trouvée, des « villes vides » que Max a signalées deux fois —
« clairement pas de piétons, pas de vie dans les villes » et « it took a while
to see cars in paris ». Elle n'était ni dans un rayon, ni dans un seuil, ni
dans une répartition : elle était dans le minuteur.

`main.js` borne `dt` à un vingtième de seconde, et c'est JUSTE — sans cette
borne, une chute de cadence fait traverser les murs (leçon de Washington).
Mais un minuteur écrit `minuteur -= dt` hérite de la borne. Relevé en
traversant Paris, arrêt par arrêt :

| arrêt | cadence | tours de rapatriement | passants sous 62 blocs |
| --- | --- | --- | --- |
| 1 | 6,9 im/s | 18 | 18 |
| 3 | **2,7** | **0** | 7 |
| 4 | **2,8** | **0** | 3 |
| 5 | 3,0 | 18 | 18 |

À 2,75 images par seconde, deux secondes de minuteur réclament quarante
images, soit **quatorze secondes réelles**. Et la cadence s'effondre
précisément quand l'enfant ARRIVE quelque part et que les morceaux se
chargent : **la ville était vide au moment exact où il la regardait**, et
pleine dès qu'il n'y faisait plus attention.

Trois choses en sortent.

- **Ce qui suit `dt` et ce qui ne doit pas.** Une ANIMATION suit le temps du
  jeu — une bête qui fuit, une balle qui rebondit, une flamme qui s'éteint
  ralentissent avec le reste, et c'est cohérent. Une cadence de MÉNAGE —
  repeupler, faire naître une voiture, regarnir un poste de stationnement —
  décide si le monde EXISTE autour de l'enfant : elle ne doit rien devoir à la
  vitesse d'affichage. `src/cadence.js` porte la distinction, et les quatre
  cadences de ménage y passent (passants, circulation, garagiste,
  aéroportiste).
- **La leçon était déjà écrite, pour autre chose.** « Comme `main.js` borne
  `dt` à un vingtième, sous cette barre le monde avance moins vite que le
  temps réel » : noté pour le métro de Washington, à propos du DÉPLACEMENT du
  joueur. Personne ne l'avait appliquée aux minuteurs. C'est, une fois de
  plus, la portée du remède et non la règle qui manquait.
- **Et deux versions de remèdes ont visé à côté avant celui-ci.** La v217 a
  réglé le seuil de rapatriement sur la portée de rendu, la v218 la
  répartition sur le champ de vision : les deux étaient justes, et aucune ne
  pouvait suffire, parce que la boucle qui les applique ne tournait pas.
  **Devant un symptôme qui revient après deux corrections justes, on cesse de
  régler et l'on va voir si le code s'exécute.** Un compteur posé dans la
  boucle l'a dit en une exécution : zéro tour en six secondes.

Mesuré après : le pire de la traversée passe de **3 à 16** passants (seuil 3),
et la ville se peuple en **une seconde** à l'arrivée au lieu de six à huit.

**UN PASSANT NE S'ARRÊTE PAS POUR L'ENFANT (v243).** Max : « elles regardent
le joueur principal au lieu de continuer à se promener ». `Habitant.think`
(vie.js) et `Wanderer.think` (marlon.js) se figeaient à moins de cinq blocs et
se tournaient vers l'enfant — écrit pour trois gardes de château, hérité par
dix-huit passants par ville : une rue entière qui s'immobilise et fixe
l'enfant. Chacun garde son propre programme ; les phrases partent en passant.
Le témoin pose l'enfant à trois blocs d'un passant en marche et exige qu'il
avance quand même — sur l'ancien code, zéro bloc en douze secondes. Toute
attitude « sociale » d'un PNJ (se tourner, s'arrêter, suivre) se déclare dans
sa classe et se mesure par ce que l'enfant voit, jamais ne se généralise à la
foule. **Et les corps réalistes (Rocketbox, v241) se chargent pour tout le jeu
et s'appliquent à toute tenue « passant », donc à toutes les villes** — un
témoin le garde sur Paris, parce que Max l'a demandé et qu'une phrase ne garde
rien.

**Et la marche.** 4,3 m/s était la valeur de Minecraft, où un bloc fait un
mètre. Ici un pâté d'immeubles en fait quarante : à cette vitesse les villes
défilent au lieu de se parcourir. 3,2 m/s à pied, 5,4 en courant — les
distances se font en volant ou par la carte.

### La circulation des villes

Chaque ville reçoit des anneaux de rues où roulent des voitures de la
flotte. Deux pièges, tous deux payés :

- **Un anneau qui trempe ne se jette pas, il se déplace.** On essayait
  deux anneaux centrés sur l'ancre ; s'ils touchaient l'eau, la ville
  n'avait AUCUNE voiture. Moscou, Rome, Tokyo — toutes les villes de
  fleuve — étaient vides. On cherche désormais vingt candidats (quatre
  tailles, cinq décalages) jusqu'à en trouver deux au sec.
- **Les villes bâties à la main ne sont pas dans `VILLES_MONDE`.** Paris,
  Londres, Nice, Lille, Washington, San Francisco n'avaient donc jamais eu
  une seule voiture. Leurs anneaux s'éprouvent sur le VRAI terrain
  (`tracesCirculationMain`), ce qui écarte la Seine et la Tamise sans rien
  savoir de leur géographie.
- **UN CARRÉ POSÉ AU HASARD NE TROUVE JAMAIS UNE RUE**, et c'est ce qui
  faisait dire à Max, deux versions plus tard, « ya toujours pas de voitures
  dans les villes ». `tracesCirculationMain` cherche un carré autour de
  l'ancre et le valide sur le TERRAIN BRUT — la hauteur du sol, pas la nature
  de la rue. Mesuré sur Paris : **quarante-quatre pour cent de la ville est de
  la chaussée**, et pourtant le meilleur carré aligné sur les axes du monde ne
  dépassait pas seize blocs de rayon à 93 % ; tourné dans le repère du
  quartier, on ne trouvait qu'un rectangle de 19 × 16. Une rue fait deux à
  quatre blocs de large : il faudrait la suivre au demi-bloc près sur toute sa
  longueur.
- **Un circuit se fait donc d'AVENUES MISES BOUT À BOUT** — la même méthode
  que Manhattan, qui fait rouler ses voitures sur la 5e et la 8e. Les villes
  bâties à la main publient déjà leurs voies nommées avec leurs points de
  passage : `fabriqueCircuits` (voies.js) les chaîne et **la ville valide son
  propre trajet contre son propre sol**. Un circuit qui traverserait la Seine
  ou un pâté d'immeubles ne part pas.
- **Les enchaînements ne se devinent pas, ils se mesurent.** Toutes les
  combinaisons d'avenues de chaque ville ont été éprouvées, et l'on n'a gardé
  que ce qui passe : Paris 99 % et 100 % (345 et 233 blocs), Londres 96 %,
  San Francisco 97 % et 99 %. **Nice et Lille n'avaient RIEN au-dessus du
  seuil** — leurs rues étaient trop courtes pour refermer une boucle — et ont
  gardé l'anneau de secours jusqu'à leur remise à l'échelle (v203 et v204),
  où chacune a gagné ses circuits mesurés. On ne déclare pas un circuit qui
  ne valide jamais : ce serait du code mort qui ressemble à de l'avancement.

**UN CONVOI SUIT LE SOL, ET UN TRACÉ QUI NE PORTE QUE SES CARREFOURS NE PEUT
PAS LE SUIVRE (v210).** Max, après la v209 : « Les voitures rentrent dans les
murs. » Elles y rentraient, et le tracé des rues n'y était pour rien :
`fabriqueCircuits` donnait à tout le circuit une cote UNIQUE, celle du sol au
centre de la ville, avec un commentaire qui l'assumait — « la ville est
plate ». San Francisco a treize collines, Nice le mont Boron. Quatre choses
en sortent, et elles valent pour tout ce qui se déplace sur un tracé.

- **Une hypothèse de terrain s'écrit et se MESURE.** « La ville est plate »
  était vrai à Lille (écart de sol nul) et faux partout ailleurs : trente-deux
  blocs à San Francisco, seize à Paris, quatorze à Nice, sept à Londres. Une
  hypothèse commentée mais jamais chiffrée survit à toutes les villes qu'on
  ajoute ensuite.
- **La cote se prend PAR POINT, et le tracé se densifie pour cela.** Un convoi
  interpole sa cote entre deux points ; entre deux carrefours distants de
  trente blocs, la corde traverse tout ce que le terrain fait entre les deux.
  Le pas est un résultat, pas un goût : à six blocs, 17 % du trajet de San
  Francisco reste dans la roche ; à quatre, 11,5 % ; à deux, 3,3 %. On prend
  deux — mille points par ville, que la recherche dichotomique du parcours
  avale sans y penser.
- **En pente, la cote d'un point est celle de son plus haut VOISIN.** Sinon la
  corde entre deux points s'enfonce d'un bloc dans la chaussée qu'elle
  descend : trente-sept pas à San Francisco, dix-huit à Nice, neuf à
  Washington. Quatre lectures de terrain, et il n'en reste aucun.
- **LE TERRAIN N'EST PAS LA SURFACE ROULABLE.** Sur un pont, `terrainHeight`
  rend le LIT du fleuve — le tablier, lui, est posé par-dessus l'eau et ne
  déplace pas le relief (c'est tout l'intérêt, v208). Suivre le terrain a donc
  fait passer soixante-treize pas de convoi sous la Tamise. `World.coteRoulable`
  répond « à quelle cote roule-t-on ici », et c'est elle que `main.js` passe
  aux circuits. Le jour où une autre ville pose un ouvrage au-dessus de l'eau,
  c'est là qu'il se déclare.

**UN MONUMENT EST PLUS GRAND QUE SA PLACE, ET SA PLACE EST DANS LUI (v221).**
Des voitures traversaient l'Opéra, les Invalides, la colonne de la Bastille et
la tour Montparnasse — quarante-neuf pas de convoi, carrosserie dans la pierre.
On avait noté la cause comme « une voie a le CENTRE d'un monument pour point de
passage » : c'est vrai et partiel. Mesuré, les DIX monuments de Paris ont un
socle plus large que la place déclarée avec eux — l'Opéra 8 × 7 de demi-emprise
pour une place de rayon 2,2, le Louvre 6 × 6 pour une place de 5. Or
`contournerRonds` fait rouler la voiture sur l'anneau de la PLACE, à `r − 0,5` :
cet anneau est DANS le bâtiment, quel que soit le tracé des rues. Quatre choses
en sortent.

- **UN MONUMENT A UNE RUE AUTOUR DE LUI, et c'est le remède.** Trois blocs de
  chaussée sur le pourtour du socle (`autourDUnSocle`), et `contournerBlocs`
  (voies.js) y fait passer les circuits en suivant le PÉRIMÈTRE du rectangle.
  C'est ce qu'a la vraie ville — la rue de Rivoli le long du Louvre, l'avenue de
  Suffren le long du Champ-de-Mars. Et c'est du SOL : les deux empreintes de
  `plafond.js` ne bougent pas, même raison que la passe de rues de Londres.
- **PAS UN CERCLE — la fausse piste était déjà écrite, et elle est juste.**
  Ajouter les socles aux cercles évités supprime bien les traversées mais fait
  tomber la tenue de rue de 94 à 82 % : le tour d'un socle par un cercle coupe
  les coins dans le square planté. Un rectangle se contourne par son périmètre.
- **CE QU'ON COMPTE, C'EST LE BLOC, PAS L'EMPRISE.** Mon premier chiffre — 135
  pas « dans un monument » — comptait l'emprise au sol. Un arc de triomphe est
  CREUX : passer sous sa voûte n'est pas le traverser. La bonne mesure lit le
  bloc à la cote du convoi et sur toute la LARGEUR de la voiture (2,26 blocs) :
  une aile dans un mur se voit autant qu'un capot. Elle rend 49, et zéro après.
- **UNE RUE NE FAIT PAS LE TOUR D'UNE COLLINE.** Mon premier remède posait
  l'anneau autour des dix monuments, butte comprise, et c'était PIRE :
  dix-neuf pas de carrosserie dans le coteau sous le Sacré-Cœur, cinq sous le
  Moulin Rouge. L'anneau y traverse douze et dix-huit blocs de dénivelée. Le
  vrai Montmartre n'a pas de boulevard autour de la basilique — il a des
  ruelles et un escalier. La butte est déclarée `sansTour` DANS LA FICHE DU
  LIEU, avec sa mesure en commentaire, jamais dans une liste : même discipline
  que `montable`, `nourrissable` et `vole`.

**Et un témoin de circuit doit lire le BLOC à la cote du convoi, pas le sol
sous lui.** `circuitSurRue` mesure la nature du SOL — de la chaussée, pas de
l'eau — et ne dit rien de ce qui occupe l'espace où la voiture passe. C'est
pour cela que huit circuits mesurés à 97-100 % « sur la rue » traversaient
quand même des collines et des immeubles. Ce qui reste après la v210 est du
BÂTI, mesuré et déclaré dans `TASKS.md` : à Paris les monuments dont une voie
a le CENTRE pour point de passage (le Louvre, l'Opéra, la Tour Eiffel), à
Londres les bus garés aux arrêts et les fontaines de Trafalgar Square, à
Washington les ormes du Mall.

**DEUX CONVOIS QUI SE SUIVENT SE TRAVERSENT, ET LE CHOIX GLOUTON LES Y
CONDAMNAIT (v211).** Max : « Et passent à travers les unes des autres. » La
couverture gloutonne — à chaque tour la boucle qui apporte le plus d'avenues
neuves — réutilise les grands axes dans presque tous les circuits : à Paris,
la rue de Rivoli en portait trois, superposés, et 1 524 blocs de tracé sur
2 317 portaient au moins deux convois. Trois choses à retenir.

- **ON MESURE LA VOITURE AVANT DE PROPOSER DEUX FILES.** Le premier remède
  envisagé était le décalage latéral, avec la conduite à droite : très
  réaliste, et impossible ici. Une voiture fait **2,26 blocs de large** pour
  une chaussée qui en fait 2,86 — il n'y a la place que pour UNE file. La
  mesure a écarté le remède avant qu'on n'écrive une ligne. (Elle dit aussi
  autre chose : les véhicules sont à l'échelle du JOUEUR, les rues à l'échelle
  du SOL, et les deux ne se rencontrent pas — même tension que « deux échelles
  dans la même ville ».)
- **Une couverture se choisit sous CONTRAINTE DE PARTAGE.** Deux circuits ne
  peuvent avoir plus d'une vingtaine de blocs de chaussée en commun : c'est la
  taille d'un carrefour, et cela distingue « se croiser » de « se suivre ». La
  recherche est un empaquetage : on tire des ordres au hasard, on garde le
  meilleur, et l'on pondère les rues qu'un enfant nomme — les Champs-Élysées
  et Pennsylvania Avenue ne se perdent pas au tirage.
- **Le prix se déclare, il ne se cache pas.** Quelques avenues n'ont plus de
  boucle à elles : elles sont NOMMÉES dans `TASKS.md`, et la piste est celle
  de la v209 — des voies de raccord, tracées sur le vrai plan et mesurées.
  Couvrir une avenue en repassant sur le circuit du voisin n'est pas la
  couvrir.

**ET LE PRIX SE PAIE AVEC DES RUES, PAS AVEC UN SEUIL (v216).** Les trois
avenues de Paris laissées dehors par la v211 ont retrouvé leurs voitures sans
qu'on touche aux vingt blocs de partage : douze vraies rues de plus, et huit
circuits qui couvrent les quarante avenues. Quatre choses en sortent, qui
valent pour Lille, San Francisco, Washington et Londres quand leur tour
viendra.

- **UN POINT DE VOIE S'ÉCRIT EN KILOMÈTRES, JAMAIS EN BLOCS.** Les douze rues
  passent par `de(dx, dz)`, comme la table des lieux. Un `[54, -4]` écrit en
  blocs serait juste aujourd'hui et faux à la prochaine remise à l'échelle,
  sans que rien ne rougisse — c'est exactement le piège d'`adresseParis` et de
  `chercheMer`, par un troisième bout.
- **TROIS POINTS PRESQUE ALIGNÉS N'ONT PAS DE TRIANGLE.** Bastille, Nation et
  tout ce qui revient vers le centre le sont : chaque boucle essayée pour le
  Faubourg Saint-Antoine faisait un demi-tour de 175° à Nation ou à la
  Bastille. Le tour se fait donc comme dans la vraie ville, en revenant par le
  SUD — les quais de la rive droite et le boulevard Bourdon. Devant un virage
  qu'on n'arrive pas à ouvrir, on ne cherche pas un tracé plus malin : on
  regarde le plan, la vraie ville a déjà répondu.
- **UNE COUVERTURE GLOUTONNE SOUS CONTRAINTE S'ARRÊTE À n − 1, ET IL FAUT UNE
  PASSE DE RÉPARATION.** Le tirage au hasard, même à quarante mille tirages,
  laissait toujours une avenue dehors — pas faute de boucle, mais parce que
  celles qui la prennent se heurtaient à un circuit déjà choisi. La réparation
  est simple et elle a suffi : retirer les gêneurs, forcer la boucle manquante,
  recombler le paquet, garder si la couverture y gagne. 39/40 → 40/40, et la
  pire paire est tombée de 17 à 13 blocs par la même occasion.
- **Une rue qu'aucun circuit ne prend ne se livre pas.** La rue Royale
  (Concorde–Madeleine) a été tracée puis RETIRÉE : elle est réelle, mais aucun
  des huit circuits n'en avait besoin, et la livrer aurait créé une avenue sans
  voitures le jour même — la dette qu'on vient de rembourser.

### Les villes engendrées : une règle écrite ne vaut que là où elle est APPLIQUÉE (v270)

Max, deux captures : une voiture posée DANS le mobilier à Stuttgart, « deux
voitures de la rue l'une dans l'autre, et des caisses du marché sur la
chaussée » à Zurich. La « caisse », c'est la jardinière — et le banc. Quatre
règles, et la première est la leçon de fond.

- **UNE RÈGLE ÉCRITE POUR SIX VILLES NE COUVRE PAS LES DEUX CENT
  SOIXANTE-SEPT AUTRES.** La v211 avait posé la contrainte de partage —
  « deux circuits ne peuvent avoir plus d'une vingtaine de blocs de chaussée
  en commun : c'est la taille d'un carrefour, et cela distingue se CROISER de
  se SUIVRE » — et l'avait appliquée aux villes bâties à la main. Les villes
  ENGENDRÉES, qui ont leur propre fabrique d'anneaux dans `villesmonde.js`,
  ne l'ont jamais vue passer : **265 villes sur 267** au-dessus de la barre,
  Shanghai à 576 blocs partagés. C'est le piège du verre dans les murs, une
  cinquième fois — la PORTÉE du remède, jamais la règle. Quand une règle de
  circulation, de confort ou de sol est écrite pour une famille de villes, on
  cherche le jour même l'autre fabrique.
- **LE PARTAGE SE CALCULE, IL NE S'ÉCHANTILLONNE PAS.** Deux anneaux d'une
  même ville sont des RECTANGLES du repère de la trame : ils ne peuvent se
  suivre que par des côtés COLINÉAIRES, et la somme de leurs recouvrements
  est exacte et immédiate. Un balayage par points coûtait des secondes au
  démarrage et comptait en plus les croisements de coins — vingt blocs de
  voisinage sans une rue partagée — que la formule ignore à juste titre.
  Vérifié contre le balayage sur cent cinquante paires.
- **ET UNE CONDITION BON MARCHÉ PASSE DEVANT UNE CONDITION CHÈRE.** Mise
  APRÈS le test d'eau, la contrainte faisait tourner quarante points de
  géographie sur chaque candidat qu'elle allait rejeter : `tracesCirculation`
  passait de 82 à 380 ms au démarrage — et le jeu attend ce calcul derrière
  son bouton « Jouer » (v258). Placée AVANT : 86 ms, résultat identique. La
  réorganisation paie la contrainte entière.
- **LE PRIX SE DÉCLARE, ET LE JEU DE CANDIDATS ÉLARGI EST UN NON-RÉSULTAT
  MESURÉ.** 1 062 anneaux deviennent 764, un quart de rue en moins. « Le prix
  se paie avec des rues » (v216) ne marche PAS ici : sept fois plus de
  candidats (quatorze tailles, vingt-cinq décalages, sept formes) ne rendent
  que dix-sept anneaux sur les deux cent soixante-sept perdus — un rectangle
  posé sur une trame n'a pas assez de places distinctes. Écrit, mesuré,
  retiré. Ce qu'on retire, ce sont des convois SUPERPOSÉS qui se
  traversaient, pas de la variété, et un témoin garde qu'aucune ville ne
  perd tous les siens.

**ET LE CANIVEAU N'EST PAS UN TROTTOIR.** Le second signalement a une cause
géométrique qui ne se devine sur aucune capture. La chaussée fait 3,4 blocs
et la voiture 2,26 — 0,57 de marge par côté — mais le mobilier était posé sur
la PREMIÈRE colonne de trottoir, et la trame d'une ville est TOURNÉE par
rapport au monde (24° à Zurich) : une case entière mord alors jusqu'à 1,13
bloc dans la chaussée, c'est-à-dire jusqu'à l'axe de la rue. Mesuré au
recouvrement exact du rectangle contre la case : **32 410 cases, 267 villes
sur 267**. Quatre règles.

- **ON MESURE AU CENTRE DE LA CASE, PAS À SON COIN.** `mobilierVillesMonde`
  reçoit un coin entier ; la case s'étend d'un bloc vers +x et +z, et la
  juger par son coin revient à ignorer la moitié de ce qu'elle occupe.
- **LE DÉGAGEMENT SE CALCULE, IL NE SE MESURE PAS SUR UNE VILLE.** Mon
  premier chiffre — 0,3 bloc de marge — était réglé sur Zurich : juste là,
  faux ailleurs, parce que ce qui déborde dépend de l'ANGLE de la trame. Une
  case unitaire tournée de θ s'étend de (|cos θ| + |sin θ|) / 2 de son centre
  le long d'un axe de la trame. Écrite ainsi, la règle a réglé d'un coup les
  trois médinas que le chiffre rond laissait en faute.
- **LA BANDE SE DÉCALE, ELLE NE SE ROGNE PAS.** Un simple plancher dégageait
  tout mais coûtait 47 % du mobilier — donc l'éclairage de nuit (v248). La
  bande décalée en garde CENT POUR CENT : mesuré, Zurich 490 → 541 meubles,
  Rome 917 → 934, Marrakech 669 → 783. On dégage la chaussée ET on gagne des
  réverbères.
- **ON NE FAIT PAS ROULER UNE BERLINE DANS UNE RUELLE DE MÉDINA.** Venise,
  Jérusalem et Marrakech ont des ruelles de 1,8 bloc pour une voiture de
  2,26 : elle roulait sur les deux trottoirs à la fois. Ce fichier écrivait
  déjà « Venise n'aura jamais de voitures, et c'est très bien comme ça » à
  propos de l'eau — c'est vrai de ses ruelles aussi. Une ville sans voitures
  est une DÉCISION quand la vraie ville n'en a pas, et elle rend à ces
  trois-là tout leur mobilier, qu'aucun dégagement n'a plus à repousser.

**ET DEUX RÉGRESSIONS DE MA PROPRE CORRECTION, TROUVÉES PAR LE COMPTAGE.**
Mon premier jet élargissait la fenêtre du feu tricolore à toute la bande —
Zurich passait de 110 feux à 277, Rome de 235 à 563, un carrefour hérissé —
et décalait l'échantillon d'un demi-bloc À CHAQUE TOUR de la boucle sur les
villes voisines (`x += 0.5` sur la variable de boucle), donc d'un bloc entier
pour la seconde ville. Aucune capture ne les aurait montrées. **Une
correction de placement se mesure AVANT/APRÈS, poste par poste et ville par
ville** — le total ne suffit pas : ici il montait pendant que les feux
triplaient.

**UN ANNEAU QUI EXISTE N'EST PAS UNE VOITURE QU'ON VOIT.** Mes quatre témoins
de la v270 comptaient des ANNEAUX, et ils étaient tous verts ; le portail, lui,
a rendu rouge « la circulation naît à l'approche » (`monte.js`), qui se
téléporte à Rome et exige une voiture EN VUE. La contrainte de partage trie les
candidats par taille et sacrifiait les anneaux DÉCALÉS — ceux dont un côté
passe près du centre : Rome gardait ses quatre anneaux, mais le plus proche
passait de douze blocs du centre à quarante-cinq, **pile la portée
d'affichage** (`vu: 45`), et un enfant posé sur la place ne voyait plus une
seule voiture. C'est la panne que la v201 avait corrigée sur signalement de
Max, ramenée par un témoin qui mesurait la mauvaise grandeur. Trois choses.

- **CE QUI DOIT ÊTRE VRAI SE GARANTIT PAR CONSTRUCTION, PAS PAR L'ORDRE DE
  TRI.** Le premier anneau retenu est désormais celui que l'enfant voit
  (`VU_ANNEAU`), et le reste de la sélection ne change pas. Un tri qui « se
  trouve » donner le bon résultat le perd à la première contrainte qu'on
  ajoute.
- **ET LA BARRE DE L'ANNEAU N'EST PAS LA PORTÉE.** Les voitures sont espacées
  le long du tracé (jusqu'à vingt-cinq blocs) : un anneau qui frôle le centre à
  quarante-quatre blocs peut n'avoir aucune voiture à portée. Trente blocs, de
  sorte qu'une voiture décalée de douze le long du tracé reste dans les
  quarante-cinq. Une portée d'affichage n'est pas une portée d'OBJET.
- **La portée se demande là où elle se calcule** (`VU_VOITURE`, publié par
  `vehicules.js`), recopiée dans `villesmonde.js` comme la demi-largeur, et un
  témoin garde les deux d'accord.

**UN VERDICT QUI COMPTE DES PAS, OU QUI DORT UN TEMPS FIXE, MESURE LA CADENCE
DU BANC — TROIS FICHIERS DANS LE MÊME PORTAIL (v270).** `main.js` borne `dt` à
un vingtième de seconde : sous cette barre, le monde avance moins vite que le
temps réel, et tout témoin dont le verdict est une distance parcourue pendant
une durée FIXE change de réponse avec la charge. Les trois étaient verts au
portail de la veille, sur le même code de jeu.

| témoin | mesuré | barre | seul |
| --- | --- | --- | --- |
| l'escalier du métro (`washington.js`) | 7,0 blocs | 8 | 13,0 |
| la marche arrière de l'avion (`monte.js`) | 0,26 bloc en 3 s | 0,5 | le double la veille |
| la seconde tablette (`reglages.js`) | lue UNE fois à 20 s | — | verte deux portails de suite |

Le remède est le même pour les trois, et **il était déjà écrit à quinze lignes
de l'un d'eux** : le témoin des portes de `washington.js` marche « jusqu'à être
entré OU jusqu'à ne plus avancer » depuis qu'il est tombé pour cette raison, et
personne ne l'avait appliqué à l'escalier du même fichier. **On attend le
RÉSULTAT, borné, jamais une durée** — et le temps qu'il a pris entre dans le
message, sinon le rouge suivant ne se démonte pas. C'est le piège des bornes de
`monte.js` (v237) à l'échelle de trois fichiers : quand une borne se révèle mal
posée, on relit toutes celles de sa FAMILLE dans la même passe, pas seulement
celles de son fichier.

**Et le chiffre partagé se garde par un TÉMOIN, jamais par un commentaire.**
`villesmonde.js` a besoin de la demi-largeur d'une voiture et ne peut pas
l'importer de `vehicules.js` : il est lu par le mailleur du worker, qui meurt
au premier `import 'three'` de son graphe (v251). Le chiffre y est donc
recopié, `vehicules.js` le PUBLIE (`DEMI_LARG_VOITURE`, `DEMI_LONG_VOITURE`)
là où il sert, et un témoin exige que les deux disent la même chose. Deux
tables qui décrivent la même chose finissent par diverger.

### Les rues s'élargissent, et l'on roule à droite (v271)

Max, après la v270 : « increase les routes ». La chaussée des villes engendrées
faisait 3,4 blocs pour une voiture de 2,26 — UNE file, et c'est exactement ce
que la v211 avait mesuré pour écarter la conduite à droite. Cinq règles.

- **ÉLARGIR TOUCHE TROIS CHOSES, ON LES REGARDE ENSEMBLE.** L'îlot est ce qui
  RESTE (`pas de trame − 2 × emprise`), donc on ne peut pas choisir la chaussée
  sans choisir le pas :

  | facteur | chaussée | trottoir | îlot min · médian | îlots < 5 blocs |
  | --- | --- | --- | --- | --- |
  | 3,00 (v270) | 3,4 | 2,30 | 4,0 · 7,0 | **196 sur 528** |
  | 3,00 | 5,2 | 1,40 | 4,0 · 7,0 | 196 |
  | 3,00 | 5,2 | 2,00 | **2,8** · 5,8 | 196 (dont 196 < 3) |
  | **3,75** | **5,6** | **2,00** | **5,4 · 9,4** | **0** |

  À emprise constante la chaussée mange le TROTTOIR, donc le mobilier, donc
  l'éclairage de nuit (v248) ; à pas constant elle mange l'ÎLOT, et 2,8 blocs
  n'est plus un immeuble, c'est une cloison. Le pas est le troisième levier, et
  il rend la ville meilleure qu'avant — plus un seul îlot sous cinq blocs.
- **ET LE COMPTE BRUT DE MOBILIER N'EST PAS LA BONNE GRANDEUR.** Il tombe d'un
  tiers, et c'est sans intérêt : la ville a moins de rues, plus larges. Ce que
  l'enfant voit, c'est l'espacement des réverbères LE LONG de la rue — 123 →
  138 pour mille blocs de rue à Zurich, 130 → 116 à Rome, 172 → 130 à Tokyo,
  voisin le plus proche à 3 à 5 blocs. **Compter un motif n'est pas compter la
  chose**, et cela vaut pour une mesure de CONTENU autant que pour un témoin :
  j'avais d'abord conclu « un tiers de mobilier perdu, donc des rues noires »,
  ce qui était vrai et faux.
- **LA DROITE SE MESURE.** Dans three.js la caméra regarde vers −Z et sa droite
  est +X : pour une direction (fx, fz) la droite vaut (−fz, fx). Relevée sur
  les QUATRE côtés d'un anneau réel, elle pointe vers le CENTRE du rectangle —
  rouler à droite, c'est donc RÉTRÉCIR l'anneau d'une demi-chaussée, pas
  l'élargir. L'anneau retenu reste l'AXE de la rue : c'est lui que juge la
  contrainte de partage (v270), parce que deux convois qui se suivent se
  suivent sur une RUE, pas sur une trajectoire.
- **ET LA VOIE DÉCALÉE DÉPLACE LE DÉGAGEMENT DU MOBILIER.** Une voiture n'est
  plus centrée sur l'axe : son flanc extérieur est à `w/2 + demi-largeur`, soit
  2,53 blocs pour une chaussée de 5,6. Le mobilier doit être au-delà, débord de
  la case compris (3,24) ; la bande garde 1,56 bloc, plus large qu'avant. Toute
  décision qui déplace une trajectoire se cherche dans ce qui borde la rue.
- **DEUX PIÈGES DE MESURE, PAYÉS TOUT DE SUITE.** Mon témoin échantillonnait le
  MILIEU de chaque côté d'anneau : c'est exactement un carrefour — le point
  tombe sur l'axe de la rue PERPENDICULAIRE, `min(|ra|, |rb|)` rend zéro, et
  tout autour est de la chaussée. Il lisait donc « écart 0,00 » et « 100 % de
  place » sur le code NEUF comme sur l'ancien. On échantillonne LE LONG du
  côté, et l'on lit la perpendiculaire à la MARCHE, jamais le plus petit des
  deux résidus.
- **UNE DEVANTURE SE COMPTE EN DENSITÉ, PAS EN NOMBRE — et c'est le portail
  qui l'a dit.** « Les rues ont des devantures » comparait des comptes ABSOLUS
  dans une fenêtre de ±40 blocs (vitrines ≥ 80, portes ≥ 5, enseignes ≥ 120,
  auvents ≥ 60), seuils qui avaient DÉJÀ dû être « recalés au grand
  recalibrage » de la v172. Le pas de trame passant de 15 à 19, la même fenêtre
  contient moins de rues : Rome tombe de 124 vitrines à 71 sans qu'une ligne de
  la grammaire des devantures ait bougé. C'est le piège de `r: 66` à San
  Francisco et du rayon 44 de `releveVilles` à Nice, pour la troisième fois :
  **un témoin qui porte une dimension de ville ne l'écrit pas, il la demande.**
  La grandeur qui survit est la densité par colonne de TROTTOIR, et les barres
  se posent sous le plus faible des deux côtés. Désarmé `commerce` dans une
  copie de `src`, Rome et Marrakech tombent à zéro vitrine et zéro porte — la
  vérification se FAIT, elle ne se raconte pas (règle v223).
- **ET UN TÉMOIN QUI LIT UNE CONSTANTE DE LA PAGE CÔTÉ NODE S'EFFONDRE.** Mes
  quatre verdicts lisaient `DEMI_LARG_VOITURE`, qui n'existe que dans le
  navigateur : `ReferenceError` à la ligne 2373, la suite morte, et les TROIS
  verdicts suivants jamais atteints — on ne voyait donc pas l'étendue de ce qui
  allait. Tout ce que la page mesure revient dans son objet de retour. C'est la
  règle « un témoin doit échouer PROPREMENT sur l'ancien code, pas
  s'effondrer », par l'autre bout : il doit aussi échouer proprement sur le
  NEUF.
- **Le prix se déclare** : 16 % de rue portant un convoi en moins (195 060 →
  163 036 blocs), 788 → 628 anneaux. Et c'est du SOL : `hauteurVillesMonde` ne
  lit ni `pu`, ni `pv`, ni `w`, ni `s`, donc les deux empreintes de
  `plafond.js` ne bougent pas — même raison que la passe de rues de Londres
  (v206). Les six villes bâties à la main gardent leurs largeurs relevées sur
  de vrais plans : leur élargissement est une passe à part — faite pour Paris
  en v294, à faire pour les cinq autres.

### Une voiture cède le passage pour elle-même, et tourne sur son empattement (v244)

Max : « évite que les voitures puissent se chevaucher, et quand la voiture
tourne, une vraie inclinaison ». Mesuré à Paris : 78 relevés de voitures l'une
dans l'autre en trente secondes, 59 sauts de cap de plus de 34° — un carrefour
pris en une image. Cinq choses à savoir avant d'y toucher.

- **UN CHEVAUCHEMENT SE MESURE EN RECTANGLES, PAS EN DISTANCE.** « À moins de
  3,5 blocs » comptait deux files en sens inverse sur la même avenue, qui se
  frôlent sans se toucher. L'intersection vraie de deux rectangles orientés
  (4,4 × 2,26), par séparation d'axes, distingue ce qui se traverse de ce qui
  se croise — et la même sonde a classé les paires : face à face, même sens,
  en travers. Devant un rouge qu'on n'explique pas, la sonde qui distingue les
  cas, encore.
- **PAR VOITURE, PAS PAR CONVOI.** Un convoi n'a qu'une distance ; arrêter le
  convoi entier laissait celle qui était déjà dans le carrefour en travers de
  l'autre voie (78 → 65). Le convoi est ÉLASTIQUE : `retard[i]` est ce que la
  voiture i a laissé filer en attendant, elle rattrape à une fois et demie
  l'allure, et celle qui suit fait la queue derrière elle. Toute position se
  demande à `dElement(i)`, jamais à `distance − i × ecart`.
- **ON REGARDE OÙ L'AUTRE EST, PAS OÙ ELLE SERA.** Un couloir « devant moi »
  ratait la voiture qui arrive de trois quarts (→ 61) ; comparer les deux
  chemins à venir mettait presque toutes les paires en conflit mutuel et la
  patience de quatre secondes les relâchait ensemble (17 → 77). Le balayage
  de MON tracé sur huit blocs contre SON rectangle actuel est ce qui a tenu
  (78 → 17-25). Dans une paire mutuelle, la plus engagée passe.
- **LE CAP EST CELUI DE L'EMPATTEMENT.** `Parcours.capLisse(d)` prend la corde
  entre les points sous les deux essieux : la voiture pivote en franchissant
  le coin, sur la longueur de son châssis (59 sauts → 1). `courbure(d)` en
  dérive le roulis — vitesse au carré fois courbure, borné à 0,08 —
  purement visuel, composé avant le cap (`YXZ`) comme pour l'avion.
- **LE SIGNE DU ROULIS SE LIT DANS LA MATRICE.** La capture de dos ne montre
  pas quatre degrés ; ce qui fait foi, c'est le haut du corps rendu
  (`(0,1,0)` par le quaternion) contre la gauche de la voiture : il penche
  vers l'extérieur du virage sur 239 relevés, zéro à contresens. Ce test est
  dans le témoin, et il rougit si quelqu'un inverse le signe.

Le reliquat — deux circuits qui se raccordent à 160° sur Rivoli — est une
affaire de TRACÉ, déclarée dans `TASKS.md` : céder le passage ne peut rien
contre deux files dans le même couloir.

**ET L'ENFANT N'ÉTAIT PAS DANS LA LISTE (v245).** Max, le lendemain : « les
voitures passent les unes sur les autres ». Ce n'était pas Rivoli (six
relevés en trente secondes) : c'était la circulation qui traversait LA
VOITURE DE L'ENFANT — à l'arrêt sur la chaussée, un convoi entier lui passait
au travers, 79 relevés sur 100. Les convois cédaient entre eux ; l'enfant, qui
n'est pas un convoi, n'existait pas pour eux. Trois choses :

- **Tout ce qui occupe la rue est dans la liste de `cederLePassage`**, pas
  seulement ce qui y roule tout seul : l'enfant y entre avec le rectangle de
  sa voiture (cap du regard) ou un carré à sa carrure à pied. Il ne cède à
  personne, et devant lui seul la rue attend SANS LIMITE — douze secondes de
  patience faisaient revenir la traversée au bout de douze secondes, mesuré.
  Une voiture qui finit par passer au travers de la sienne, c'est la panne.
  Une seule exception : une voiture DÉJÀ dans la sienne (il s'est posé
  dessus, ou l'a rattrapée) continue pour en sortir — attendre là, c'est y
  rester pour toujours ; le portail l'a rendu : quatre-vingts relevés « au
  travers » dès la première image, le témoin s'étant posé sur une file.
- **Et la réciproque se règle chez le JOUEUR**, dont la boîte de collision ne
  connaît que les blocs : `player.obstacleVehicule` (branché par main.js sur
  `vehicules.obstacleDevant`) bloque un pas qui ferait entrer sa voiture dans
  une voiture de la rue — sauf si l'on est DÉJÀ dedans, sinon une voiture
  arrivée au travers de la nôtre nous clouerait sur place.
- **Une sonde de conduite se pose SUR le tracé d'un convoi**, douze blocs
  devant sa tête, cap du convoi, et elle MESURE À L'ARRÊT après l'arrivée de
  la première voiture. Posée « quelque part dans Paris », elle ne rencontre
  pas une voiture en trente secondes ; et roulant droit sur une rue courbe
  avec une carrure de 2,2 blocs, elle finit dans le trottoir (0,7 bloc roulé,
  vitesse x à zéro) et juge la géométrie de Rivoli au lieu de la circulation.

### Ce que coûte une voiture, et pourquoi les villes semblaient vides

**Une voiture coûte TRENTE-DEUX MAILLAGES — trois fois un personnage**, et
personne ne l'avait mesuré avant la v201. C'est le chiffre qui gouverne tout
le reste : il interdit d'en mettre beaucoup tant qu'on ne les découpe pas
correctement, et il les rend abordables dès qu'on le fait.

- **La portée se teste VOITURE PAR VOITURE, jamais sur la tête du convoi.**
  C'était le défaut de fond : si la tête était à portée, les vingt voitures
  d'une boucle de 431 blocs se dessinaient — y compris celles de l'autre rive.
  Quatre-vingt-neuf voitures dessinées à Paris pour une trentaine visibles.
  Même leçon que la v196 sur les personnages, un cran plus haut : cesser
  d'animer ne suffit pas, il faut cesser de DESSINER. Le test par convoi reste
  comme PRÉ-FILTRE, élargi de la traînée (`ecart × (n − 1)`), sinon mille
  circuits se recalculent à chaque image.
- **Quarante-cinq blocs, pas cent dix.** Un bloc de ville vaut ici trente à
  quarante mètres : à 110 blocs une voiture est à quatre kilomètres, et les
  immeubles la cachent depuis longtemps. Les personnages s'effacent à 62 sans
  que personne ne l'ait jamais signalé.
- **Résultat : cinq fois plus de voitures et MOINS d'appels qu'avant** — Paris
  537 → 498, San Francisco 407 → 376.

**Et les circuits ne se devinent toujours pas, ils se mesurent — mais on ne
s'arrête plus au premier.** Paris avait deux enchaînements déclarés sur 270 qui
passent le seuil, tous deux sur la rive droite : la moitié de la ville n'avait
jamais vu une voiture. On balaie toutes les combinaisons, puis on choisit par
COUVERTURE GLOUTONNE — à chaque tour, celle qui apporte le plus d'avenues
neuves. Cinq circuits couvrent les dix-huit avenues de Paris.

**Un anneau qui trempe ne se jette pas, il se déplace ET s'aplatit.** Pour les
villes engendrées, quatre villes (Agra, Berlin, Mumbai, Chicago) n'avaient
AUCUNE voiture : un fleuve, un lac ou une côte mouillait toujours un coin, et
un anneau carré centré ne sait pas longer une rive. Avec les rectangles et les
décalages en diagonale, plus une seule des 267 villes à trame n'est vide.

**Le rayon d'embarquement est de neuf blocs, et c'est un chiffre d'enfant.**
Cinq blocs autour d'une voiture à 4,2 m/s laissent une seconde pour appuyer ;
un enfant de sept ans la rate à tous les coups et en conclut que le jeu refuse.
Le bouton et l'embarquement partagent le même chiffre, sinon le bouton
s'affiche pour une voiture qu'appuyer ne peut pas attraper. Le garde de hauteur
(`|Δy| > 2,5`) est ce qui empêche un quai de métro souterrain d'attraper une
voiture de la rue.

**Et un pas de tirage se choisit PREMIER avec la taille de la flotte.** Le pas
de 13 sur cinquante modèles revient sur ses pas au bout de cinquante
(13 × 50 ≡ 0). 17 l'est : cinquante voitures d'affilée, cinquante modèles.

### Un circuit roule de CARREFOUR en carrefour — et un demi-tour est invisible à la mesure de rue

**Vingt-quatre des quarante-et-un circuits hors Londres faisaient demi-tour,
et tous mesuraient 99 ou 100 % sur la chaussée.** Découvert en v207, à la
suite du témoin de virage de Londres. Une voiture qui repart d'où elle vient
roule sur la rue à chaque bloc : le pourcentage au sol ne peut pas le voir.
Ce qui le voit, c'est l'ANGLE entre deux segments consécutifs — au-delà de
150°, c'est un demi-tour — et ce témoin vaut désormais pour les six villes,
pas pour Londres seule.

La cause n'était dans aucune ville, mais dans le chaînage partagé
(`voies.js`) : `chainerVoies` accrochait chaque avenue par son bout le plus
proche et la PARCOURAIT EN ENTIER. Une avenue dont le carrefour de sortie est
au milieu se faisait donc en aller-retour. Quatre règles en sortent :

- **Un circuit se construit entre carrefours.** On calcule où chaque avenue
  croise la suivante (le point le plus proche entre les deux polylignes, en
  cycle), et l'on ne parcourt que le tronçon entre l'entrée et la sortie.
  Les listes de points des avenues (`VOIES`) ne changent pas : elles
  dessinent la chaussée, et les toucher déplacerait des rues.
- **Une chaîne qui entre et sort d'une avenue par le même carrefour est une
  impasse, et elle se REFUSE.** Rien ne la rafistole. C'est ce qui a fait
  sortir des circuits la rue Royale de Lille, Valencia à San Francisco et
  trois avenues de Paris : elles n'étaient couvertes qu'en aller-retour, ce
  qui n'est pas une couverture.
- **Un carrefour partagé par trois avenues fait un angle de 174°.** Le
  triangle Grands Boulevards / Faubourg Saint-Antoine / Voltaire tient à
  République, où les trois se rejoignent au même point : géométriquement
  c'est un demi-tour. Une avenue qui ne rejoint la boucle que par un seul
  carrefour ne peut pas y être — même leçon que la City de Londres en v206.
- **Les enchaînements se remesurent avec le chaînage neuf**, sur une copie de
  `src/`, toutes combinaisons de deux à sept avenues, puis couverture
  gloutonne. Washington n'a pas eu à changer ses listes : ses onze circuits
  passent tels quels, parce qu'ils étaient déjà écrits carrefour par
  carrefour. Paris, Nice, Lille et San Francisco ont été réécrits.

**`voies.js` a `carteMonde.js` pour gardien**, en plus de `carte.js` et
`monte.js` : un demi-tour né du chaînage se voit là et nulle part ailleurs.

### Paris (`paris.js`) — et ce qu'on apprend d'une remise à l'échelle

La sixième ville remise à l'échelle GTA, en v187 : **vingt-quatre blocs par
kilomètre** (contre 48 à Washington, 34 à Manhattan), disque de 185 blocs,
ancrée sur Notre-Dame. Trois choses à savoir avant d'y toucher.

- **Le plan d'auteur est en KILOMÈTRES RÉELS, et il ne se réécrit pas.**
  `de(dx, dz)` traduit un écart réel à Notre-Dame en coordonnées locales ;
  c'est la seule chose que la table des lieux connaisse. Ce qui restait écrit
  en blocs de l'ancienne échelle — la courbe de la Seine, les îles, la butte,
  les points de passage des percées, les ponts — se projette par `k()`.
  `adresseParis(dx, dz)` rend une adresse du monde à partir de kilomètres :
  c'est ce que les sondes et les témoins doivent viser, jamais un `u`/`v` en
  dur, sinon ils meurent à la prochaine remise à l'échelle.

- **Les LARGEURS ne se projettent pas, elles se relèvent.** Multiplier une
  largeur par trois lui garde sa taille réelle d'avant — et cette taille était
  fausse : la place de l'Étoile faisait cinq cent soixante mètres de rayon et
  ses avenues cent soixante-dix mètres de large. À huit blocs par kilomètre
  cela ne se voyait pas ; à vingt-quatre, l'Étoile mangeait tout l'ouest de
  Paris. Chaussée, trottoir, pas d'îlot, rayon de place, largeur d'avenue,
  largeur de quai : tout cela se redonne en blocs neufs, mesuré sur le vrai
  plan. **C'est LE piège d'une remise à l'échelle**, et il vaut pour Londres,
  Nice, Lille et San Francisco quand leur tour viendra.

- **L'entorse assumée, c'est l'îlot.** Un îlot parisien fait cent mètres, soit
  deux blocs et demi : de quoi poser une façade et rien derrière. Le plus grand
  ici en fait dix-sept, soit sept cents mètres. On choisit la rue praticable et
  l'îlot suit — même arbitrage que Washington, qui a élargi les siens de 1,7
  pour qu'une maison ait un escalier. Ce qui reste juste, en échange : la rue
  appartient au QUARTIER (`rue`, `face` dans sa fiche), et une venelle du
  Marais ne fait pas la largeur d'une avenue de Monceau.

Deux pièges de rendu payés en captures :

- **`solParis` rend un identifiant de SOL, donc un arbre posé à plat est un
  carré vert.** Vus du ciel les marronniers des Champs-Élysées faisaient de
  belles rangées ; vus de la rue, c'était de la pelouse sur le bitume. Le
  feuillage se fait donc pousser dans `world.js` (fût + couronne) — et il faut
  l'ESPACER, sinon une colonne sur deux fait une haie pleine qui bouche
  l'avenue.
- **Un monument ne grandit pas parce que la carte grandit.** Les `socle` de la
  table des lieux sont l'emprise du bâtisseur, pas une longueur du plan : ils
  ne passent pas par `k()`. En revanche, un monument qui était acceptable à
  côté d'immeubles de quatre blocs ne l'est plus à côté d'immeubles de neuf —
  la Tour Eiffel et l'Arc de Triomphe ont dû être refaits, et c'est la règle
  générale : **remettre une ville à l'échelle, c'est aussi refaire ses
  monuments.**

**Et les vingt-huit avenues de Paris ont toutes leur boucle (v209) — ce que
coûte une règle juste appliquée à un plan incomplet.** La v207 a eu raison de
supprimer les demi-tours ; elle a laissé cinq circuits sur DIX des dix-huit
avenues, et la moitié de la ville sans une voiture. Trois leçons, et aucune
n'est « on baisse le seuil ».

- **UNE PLACE RONDE SE CONTOURNE, ELLE NE SE TRAVERSE PAS.** `chainerVoies`
  joint deux avenues en droite ligne d'un carrefour à l'autre ; deux avenues
  qui se rejoignent sur une place s'y rejoignent en son CENTRE, et l'angle
  vaut ce que la géométrie décide — 174° à République, 161° à Nation. Ce
  n'était pas le tracé des rues qui était faux, c'était le raccourci par le
  milieu de la place. `contournerPlaces` (le crochet `ajuster`) remplace le
  raccourci par l'arc de la couronne de bitume, à `r − 0,5`. Comme les places
  de Paris sont PAVÉES et que `PAVE` est roulant, **le sol n'a pas eu à
  changer d'un bloc** : le contournement est purement géométrique, et les deux
  empreintes de `plafond.js` sont intactes.
- **Une avenue qui ne rencontre personne ne se rattrape pas, elle se
  raccorde.** Clichy et la Grande Armée ne croisaient AUCUNE autre voie ; les
  Gobelins, la Motte-Picquet et Belleville n'en croisaient qu'une — une
  impasse ne va jamais dans un cycle (leçon de la City de Londres). Dix vraies
  rues de plus, prises sur le plan : Champs-Élysées, Haussmann, Wagram,
  Batignolles, Ternes, Rochechouart, Ménilmontant, Port-Royal, Arago, Suffren.
  On ne rafistole pas une impasse, on lui donne sa seconde porte.
- **UN JARDIN SE CONTOURNE PAR LE CHOIX DU CARREFOUR.** Le boulevard
  Saint-Michel traverse le Luxembourg, dont l'herbe l'emporte sur la chaussée
  (les places passent avant les rues dans `solParis`) : toutes ses boucles
  tombaient à 88-89 %. On n'a pas déplacé le jardin — on entre désormais dans
  Saint-Michel à Port-Royal, donc AU SUD du Luxembourg, et le tronçon parcouru
  ne le touche plus. 100 %.

**Et la couverture d'un circuit se lit sur ses NOMS, pas sur sa géométrie.**
Le témoin de Londres vérifie que chaque point de passage d'une avenue est un
sommet d'un circuit ; à Paris ce test est FAUX, parce que le contournement
supprime justement les sommets posés au centre d'une place — le boulevard
Voltaire, dont les deux bouts sont République et Nation, serait déclaré
introuvable. `CIRCUITS_PARIS` (les chaînes par leurs noms) et `VOIES_PARIS`
(le registre) portent donc la preuve, et `circuitsParis` la complète : une
chaîne sous le seuil est JETÉE par `fabriqueCircuits`, si bien que
« huit déclarées, huit rendues » prouve que les huit ont passé la mesure.

### San Francisco (`sanfrancisco.js`) — la septième remise à l'échelle

**Vingt-sept blocs par kilomètre** (v192), contre neuf : un bloc valait CENT
ONZE MÈTRES, et Market Street en faisait trois cents de large. Le disque passe
de 66 à 220 blocs, et couvre toute la presqu'île. Trois choses à savoir.

- **Le rayon vient du REGISTRE.** `export const SF = positionDe('sf')` — le
  littéral `r: 66` qui traînait là était le même piège qu'à Paris : il masquait
  la valeur de `mondes.js`, et rien ne se bâtissait au-delà.
- **`adresseSF(dx, dz)` rend une adresse du monde à partir de kilomètres réels
  depuis le Ferry Building.** C'est ce que les sondes, les témoins ET LES
  AUTRES FICHIERS doivent viser. Le Golden Gate était posé dans `world.js` à
  `SF.x - 21, SF.z - 42` — des blocs de l'ancienne échelle : après la remise à
  l'échelle il s'est retrouvé trois fois trop près du centre, au milieu des
  maisons, et le détroit était vide. Une capture l'a montré, pas un témoin.
- **Un pont, lui, SUIT LE SOL.** C'est la seule pièce dont la longueur soit une
  longueur de plan : le tablier passe de 25 à 73 blocs, sans quoi il s'arrêtait
  au milieu de l'eau. Les hauteurs, elles, ne bougent pas — 227 m de pylône
  font toujours vingt-quatre blocs.

**ET LE PIÈGE SE REFERME TROIS FOIS, PARCE QU'ON CORRIGE UNE LIGNE À LA FOIS.**
Le Golden Gate a été rattrapé en v192, Karl the Fog — deux lignes plus bas dans
`world.js` — au début de la session suivante, le Bay Bridge et le phare en v195,
sur signalement de Max en capture (« there is no bridge in the middle of the
city »). Mesuré : sur les soixante-trois colonnes du tablier du Bay Bridge,
**zéro n'était de l'eau**. Un pont suspendu gris planté en travers de la ville.
La règle qui en sort : **quand on remet une ville à l'échelle, on cherche TOUS
les `VILLE.x + n` du dépôt, pas seulement celui qu'on a sous les yeux** —
`grep -n "SF\.x\|SF\.z" src/*.js` prend dix secondes et aurait évité trois
versions. Et un témoin qui cherche « de la pierre grise dans huit blocs » n'en
garde aucun : il en trouve toujours, celle des immeubles. Ce qui prouve un pont,
c'est l'eau sous son tablier.

**UNE AVENUE SANS VOITURES : ON MESURE D'ABORD SI C'EST UNE RUE (v223).** Six
des quatorze voies de San Francisco n'avaient aucun circuit depuis la v207, et
la dette était écrite ainsi : « elles bordent le parc et la côte, où il n'y a
rien à boucler ». Mesuré — chaque avenue sur son propre sol, colonne par
colonne, AVANT de chercher la moindre boucle — c'était faux : **la Great
Highway tenait la rue à ZÉRO pour cent**, onze blocs de sable et
quatre-vingt-dix-neuf dans le Pacifique ; Fulton 50 %, Third Street 70 %,
Lincoln Way 70 %, la 19e Avenue 81 %. Ce n'étaient pas des avenues sans boucle,
c'étaient des traits d'herbe, d'eau et de sable. Quatre choses en sortent.

- **UN PARC TIENT ENTRE SES RUES DE BORD.** L'ellipse du Golden Gate Park
  faisait un kilomètre de haut et débordait sur Fulton et Lincoln Way, qui
  sont pourtant ses deux rues de bord dans la vraie ville ; les parcs passant
  avant les rues dans `solSF`, ces deux avenues n'étaient pas des rues. Le
  remède est de rendre au parc sa taille (`rv` 4,5 → 3,0), pas de déplacer les
  rues.
- **MAIS UNE AVENUE NOMMÉE TRAVERSE UN PARC EN RESTANT UNE AVENUE.** La 19e
  Avenue coupe le Golden Gate Park dans la vraie ville — c'est Crossover Drive
  — et elle y rendait huit blocs d'EAU : une route qui disparaît dans un lac.
  Les parcs gardent leur priorité sur la trame générique et sur les lots ; ce
  qui passe avant eux, c'est la voie NOMMÉE, et elle seule. (À Paris, la rue de
  Rivoli et les Tuileries restent une dette : là c'est le POINT DE PASSAGE qui
  est au centre du jardin, pas la rue qui le traverse.)
- **UNE VOIE SE TRACE CONTRE LA RIVE, PAS À CÔTÉ.** La Great Highway était
  posée sur la plage et au large, Third Street plongeait dans la baie à hauteur
  d'Islais Creek : le sable et l'eau passent avant les voies dans `solSF`, à
  dessein. C'est la famille du Bay Bridge et de Karl the Fog, à un fichier
  près — une géométrie écrite sans qu'on demande au sol s'il est là.
- **Le prix se paie toujours avec des rues.** Cinq vraies rues de raccord —
  Stanyan, Sunset Boulevard, Sloat Boulevard, la 16e Rue, Cesar Chavez —, six
  circuits mesurés à 100 %, dix-neuf avenues sur dix-neuf, et le seuil de
  partage de la v211 inchangé (pire paire vingt blocs). La méthode est celle
  de Paris en v216, passe de réparation comprise.

**Et le piège de forme, qui n'existait qu'à petite échelle.** Les Marin
Headlands montaient par `min(1, marin * 2) * 8` : la saturation aplatissait
toute la moitié intérieure de l'ellipse. Invisible tant qu'elle faisait vingt
blocs, c'est une mesa à table quand elle en fait soixante. `marin` seul est
déjà un paraboloïde — sommet arrondi, bords doux ; la racine carrée, elle,
fait l'inverse (sommet plat, falaise au bord), et c'est l'erreur que j'ai
faite d'abord.

**Hors de la fenêtre d'empreinte.** San Francisco est à dix mille blocs du
point d'apparition ; `plafond.js` échantillonne [−700, 700] et ne l'atteint
pas. Comme Manhattan en v186, la refonte apporte donc SES PROPRES témoins,
dans `carteMonde.js` : la presqu'île va du Ferry Building à Ocean Beach, et le
Golden Gate traverse vraiment le détroit.

### Nice (`nice.js`) — la huitième remise à l'échelle, et un circuit qui se referme

**Trente blocs par kilomètre** (v203), contre dix : un bloc valait CENT
MÈTRES, et la meilleure boucle de voitures tenait à 89 % — la ville était trop
petite pour en refermer une seule. Le disque passe de 48 à 144 blocs et couvre
la vraie ville, de la Californie à Cimiez et au mont Boron. Même méthode qu'à
Paris et San Francisco : rayon du registre, `K = 3`, `k()` sur la géométrie
d'auteur, largeurs remesurées en blocs neufs, `adresseNice(dx, dz)` en
kilomètres pour les sondes. Quatre choses apprises ici, qui valent pour Lille.

- **UN CIRCUIT SE REFERME SUR DES CARREFOURS.** `chainerVoies` accroche chaque
  avenue par son EXTRÉMITÉ la plus proche, et joint les bouts en droite ligne.
  Une avenue dont le bout s'arrête à trois blocs de la suivante laisse trois
  blocs de façade sur le trajet, et la boucle rate le seuil. Chaque bout de
  `VOIES` est donc posé SUR la chaussée d'une autre avenue — c'est ce qui a
  fait passer la meilleure boucle de 89 % à 100 %. Cinq circuits mesurés
  couvrent les seize avenues (couverture gloutonne, comme à Paris).
- **Les enchaînements se mesurent sur une COPIE.** `VOIES` n'est pas exporté
  ; on copie `src/` dans le brouillon, on y ajoute `export const VOIES`, et
  l'on éprouve toutes les chaînes avec `chainerVoies` + `circuitSurRue` contre
  `hauteurNice`. Le chiffre écrit en commentaire au-dessus de chaque circuit est
  celui de cette mesure, pas un souvenir.
- **UN PARC PEUT MANGER LE RETOUR D'UN CIRCUIT.** Le front de mer se refermait
  en deux quais à 93 % tant que la colline du Château portait des rues : sa
  ligne de retour la traversait en droite ligne. Boisée (`parc: true` — herbe
  et pins, un sur seize colonnes), la colline n'a plus de chaussée, et la même
  paire tombe à 72 %. Le tour se fait donc comme dans la vraie ville : par le
  cap, derrière la colline par Carabacel, retour à la mer par Verdun — 99 %.
  Changer le sol d'un quartier, c'est remesurer les circuits qui le longent.
- **Le rayon en dur de `releveVilles` (carte.js) était 44.** Le témoin
  balayait quarante-quatre blocs autour de Nice quelle que soit la taille du
  registre : à 144, il ne voyait ni la mer ni les collines et jugeait une
  ville qui n'existait plus. Même piège que `r: 66` à San Francisco, du côté
  du BANC. Un témoin qui porte une dimension de ville la demande au registre.

**Et une ville qui triple demande qu'on relève le seuil de ses quartiers sur
la carte 2D** — la même leçon que Paris (1,3) et San Francisco (1,3), et le
portail de la v203 l'a rendue rouge : à 0,55 bloc par pixel, le zoom qui
montre Nice entière effaçait le Vieux-Nice, la Promenade et le port. Le seuil
suit la taille de la ville, il n'est pas une constante de la carte.

**Le banc rend ses captures dans le brouillard.** `banc.js` ouvre le jeu avec
`rr=2` — deux morceaux de distance d'affichage, pour que les suites tiennent
sur quatre cœurs. Une capture prise sur cette page montre un mur gris à
trente blocs et fait croire à une ville vide. Pour juger sur captures, on
rouvre la page avec `rr=9`. Et un script de banc (`sonde.js`, `captures.js`)
NE SE TERMINE PAS après avoir imprimé son résultat — express et le courtier
restent ouverts ; on lit le journal, puis on tue le processus par son pid.

**Hors de la fenêtre d'empreinte.** Nice est à (718, 1726) ; `plafond.js`
échantillonne [−700, 700]. Comme Manhattan et San Francisco, la refonte
apporte donc SES PROPRES témoins dans `carteMonde.js` : la ville tient de la
Californie à Cimiez, la mer commence au sud de Masséna et le port Lympia est
en eau, et des voitures font le tour de Nice. Lille, elle, est DANS la
fenêtre : sa remise à l'échelle a exigé la double empreinte — voir ci-dessous.

### Lille (`lille.js`) — la neuvième remise à l'échelle, DANS la fenêtre d'empreinte

**Trente-deux blocs par kilomètre** (v204), contre seize : un bloc valait
soixante-deux mètres, la rue Faidherbe — la perspective de Lille — faisait dix
blocs, et la citadelle de Vauban, restée à ses onze blocs de rayon, faisait un
kilomètre de pointe à pointe, près du double de la vraie. Le disque passe de
46 à 92 blocs et couvre Lille intra-muros, d'Euralille à la citadelle et de
Wazemmes au Vieux-Lille. Même méthode qu'à Paris et à Nice : rayon du
registre, `K = 2`, `k()` sur la géométrie d'auteur (la Deûle, le quai du
Wault, les origines de trame), largeurs remesurées en blocs neufs,
`adresseLille(dx, dz)` en kilomètres pour les sondes et les autres fichiers
— le beffroi de `world.js` se pose par elle, plus jamais par `LILLE.x + n`.
Six circuits mesurés couvrent les quinze avenues, tous à 99 ou 100 %. Quatre
choses à savoir.

- **C'est la seule ville remise à l'échelle DANS la fenêtre d'empreinte
  depuis Paris**, et la preuve prend donc la forme canonique : deux
  empreintes dans `plafond.js`, celle du relief qui change, celle d'hors des
  villes qui ne bouge pas — mesurée avec la MÊME découpe des deux côtés. Et
  un piège de plus qu'à Paris : **quand le disque grandit, la découpe
  grandit avec lui**, donc le NOMBRE de colonnes hors villes change
  (188 166 → 184 656) et le hash de référence aussi. Un hash qui change n'est
  pas une preuve de casse ni d'innocence ; seule la double mesure, même
  découpe sur `origin/main` et sur la branche, tranche. Le brouillon
  `empreinte.mjs` doit reproduire `dansUneVille` EXACTEMENT — villes
  engendrées comprises, sinon il compte 194 757 colonnes et ne prouve rien.
- **Une forme d'auteur ne suit pas l'échelle quand elle était déjà trop
  grande.** Les onze blocs de rayon de la citadelle sont restés onze : à
  trente-deux blocs par kilomètre ils font enfin trois cent cinquante mètres.
  La Deûle, elle, s'est déplacée à l'OUEST de l'étoile : projetée telle
  quelle, elle la coupait en deux et noyait deux bastions — et la forme est
  toute la raison d'être de cette citadelle.
- **La brique du Nord n'est pas orange.** `brique(1)` est l'orange de
  signalisation et `brique(16)` un rose vif — les « briques de plastique »
  déjà signalées sur Rome, qui ont survécu ici à la remise à l'échelle
  jusqu'à la capture de rue. Rouge, brun, chocolat, jaune-ocre (Kaki) :
  c'est la palette.
- **Le témoin de la fumée compte les villes à circuit** : six depuis la v205
  (Paris, Londres, San Francisco, Nice, Lille, Washington). Une ville qui
  gagne ses circuits met ce chiffre à jour dans la même livraison, sinon la
  voie rapide rougit pour la bonne raison au mauvais moment.

**QUATRE AVENUES SANS BOUCLE, QUATRE CAUSES DIFFÉRENTES (v223).** Lille a
récupéré ses quatre avenues orphelines, et aucune ne tombait pour la même
raison — c'est la leçon : on mesure chacune avant de chercher un remède commun.
La rue Royale n'avait qu'UNE porte (l'îlot en sucette de la City, v206) ; la rue
de Paris ne rencontrait personne à moins de dix blocs ; le boulevard
Victor-Hugo courait à QUATRE blocs ou moins de la rue Léon-Gambetta, si bien que
toute boucle qui le prenait se superposait de soixante-deux blocs au convoi de
Gambetta — trois fois le seuil, et c'était le TRACÉ qu'il fallait corriger, pas
le seuil ; la rue Gustave-Delory a suivi. Trois choses de plus.

- **UN MONUMENT A UNE RUE AUTOUR DE LUI, ET ON L'APPLIQUE LE JOUR MÊME.** Paris
  a payé cette panne en v221, quatre versions après que la règle eut été
  écrite. Ici la Porte de Paris est PLEINE à hauteur de carrosserie — onze
  blocs sur cinq, on ne passe pas dessous — et `chainerVoies` joignait la rue de
  Paris à la rue Gustave-Delory en droite ligne au travers. `contournerBlocs`
  et un pourtour pavé règlent les deux, comme à Paris ; c'est du SOL, les
  empreintes de `plafond.js` ne bougent pas.
- **CE QU'ON MESURE, C'EST LE BLOC QUE POSE LE BÂTISSEUR, pas la boîte
  d'affichage.** `MONUMENTS_LILLE` annonce `box: 7` pour la Porte de Paris ;
  ce qui compte, c'est ce que `buildPorteDeParis` écrit à un et deux blocs
  au-dessus du sol. Les bâtisseurs sont des fonctions pures : on les appelle,
  on collecte, on regarde ce que la carrosserie traverse.
- **UN TÉMOIN VERT DES DEUX CÔTÉS SE GARDE S'IL A RÉELLEMENT ROUGI.** Celui de
  Lille est vert sur `origin/main` — les trois circuits d'alors ne passaient
  pas là. Ce qui le distingue d'un témoin inutile (règle de la v220) : désarmé
  `contournerSoclesLille` sur la branche, il rend cinq pas de carrosserie dans
  la Colonne de la Déesse. Un témoin qui a rougi n'est pas un témoin qui ne
  peut pas rougir — et cette vérification-là se FAIT, elle ne se raconte pas.

### Londres (`londres.js`) — soixante avenues qui se croisent, et les demi-tours

Londres est à vingt-quatre blocs par kilomètre depuis longtemps — l'échelle
n'était pas son défaut. Son défaut, c'est qu'elle n'avait que NEUF voies
nommées, tracées sans jamais se croiser, et que la Tamise et les parcs
coupaient tout ce qu'on essayait d'enchaîner : un seul circuit, le triangle
de Mayfair, à 96 %. La v206 lui donne soixante avenues aux vraies
coordonnées, choisies pour se croiser, et quinze circuits mesurés (92 à
100 %) qui en couvrent cinquante-neuf. Six choses apprises ici, qui valent
pour toute ville à qui l'on donne des rues.

- **UN ENCHAÎNEMENT SE VÉRIFIE POINT PAR POINT, PAS SEULEMENT AU SOL.**
  `chainerVoies` accroche chaque voie par son extrémité la plus proche, et
  c'est juste — mais deux avenues qui partent du MÊME carrefour dans des
  directions opposées se chaînent en un aller-retour parfait : cent pour
  cent sur la chaussée, et un demi-tour de 180° au milieu du carrefour.
  Dix des quarante-deux chaînes au seuil tombaient là. Un circuit se juge
  donc aussi à ses VIRAGES : au-delà de 150° on le rejette, et un témoin de
  `carteMonde.js` le garde. Attention au point de fermeture : le dernier
  point d'un circuit est souvent le premier, et l'angle entre deux points
  confondus est NaN — on dédoublonne et l'on retire la fermeture avant de
  mesurer.
- **Un îlot en sucette fait un demi-tour garanti.** Tant que la City n'était
  reliée au reste que par un seul carrefour (Ludgate), tout circuit qui y
  entrait devait en ressortir par la même porte. Trois carrefours de plus —
  Old Bailey, Cannon Street, Queen Victoria Street — et la City se boucle
  d'elle-même. Une impasse, elle, ne va jamais dans un cycle : on ne
  l'enchaîne pas, on la laisse au décor.
- **Chaque bout de voie est posé SUR la chaussée d'une autre** — la leçon de
  Nice, appliquée soixante fois. Et dans `solLondres`, la voie a PRIORITÉ sur
  le lot : sans cela une avenue qui longe un jardin y perdait un bord et le
  circuit son seuil.
- **Les parcs ont été redessinés sur leurs vrais contours, et le sol n'a pas
  bougé.** `hauteurLondres` ne lit que `distanceTamise`, les ellipses `lac` de
  chaque parc et `PRIMROSE` ; aucune des trois n'a changé, donc l'empreinte
  du relief de `plafond.js` est identique — c'est ce qui permet une passe de
  rues SANS double empreinte, contrairement à Lille. Le jour où un `lac`
  bouge, c'est la forme canonique qui s'applique.
- **Les enchaînements se mesurent sur le vrai `solLondres`, pas sur une
  copie de tête.** Quarante-trois chaînes essayées, quarante-deux au seuil,
  dix rejetées pour demi-tour, quinze gardées par couverture gloutonne ; le
  chiffre en commentaire au-dessus de chaque circuit est celui de cette
  mesure. Euston Road côté King's Cross reste sans boucle — dette déclarée,
  pas circuit deviné.
- **Ce qui reste à voir en capture** : le socle du Shard est un treillis de
  verre — un bloc de `GLASS` dans un mur creux est un trou, même règle qu'à
  San Francisco. Dette dans `TASKS.md`.
- **Le mobilier suit les rues, et le témoin le demande à la ville.** Les
  arrêts des bus impériaux, les cabines et les taxis sont EXPORTÉS
  (`MOBILIER_LONDRES`) ; `carte.js` les lit là, plus jamais en dur. Le
  premier portail de la v206 a rendu « 0/5 bus » parce que le témoin
  portait les cinq arrêts d'avant la passe de rues — le piège de `r: 66` à
  San Francisco, du côté du banc, une fois de plus. Et un témoin qui ne
  regarde que la couleur ne voit pas un bus planté dans un lot : celui qui
  exige le bitume sous chaque bus est rouge à 4/5 sur `origin/main`.

**UN TÉMOIN DE COUVERTURE DOIT MESURER CE QU'IL ANNONCE (v223).** Celui qui
garde les avenues sans voitures de Londres déclarait une avenue « sans
voitures » dès qu'un de ses points de passage n'était pas un SOMMET d'un
circuit. Cela mesure « parcourue d'un bout à l'autre », pas « des voitures y
roulent », et cela se trompait des deux côtés : il nommait le Strand et Charing
Cross Road, qui en ont, et il comptait couvertes des avenues dont deux circuits
touchaient les deux bouts sans jamais les emprunter — un circuit peut « couvrir »
une avenue en la manquant entièrement. Il mesure désormais la part de la
LONGUEUR de l'avenue qui porte un convoi à moins de deux blocs, ce qu'un enfant
voit depuis le trottoir. Rejoué sur `origin/main`, il est rouge et nomme les
deux rues que la v223 fait rouler.

**ET LA PISTE ÉCRITE DANS `TASKS.md` NE SUFFISAIT PAS — ce qui se mesure, pas
se suppose.** La dette annonçait « il lui manque Pentonville Road et Gray's Inn
Road ». Tracées et mesurées, elles ne suffisent pas : toute boucle de King's
Cross prenait Woburn Place ou High Holborn sur toute leur longueur, et
**aucun échange ne donnait ses voitures à King's Cross sans en retirer à
Tottenham Court Road, au Strand et à Charing Cross Road** — éprouvé en
retirant jusqu'à TROIS des dix circuits en place et en recomblant. Bloomsbury
n'avait que deux liens nord-sud ; Gower Street est le troisième, et Judd Street
donne à King's Cross son triangle. La contrainte à poser dans une passe de ce
genre est explicite : **aucune rue ne perd ses voitures pour en donner à une
autre.**

**Les ponts sur la Tamise (v208) — et ce qui prouve un pont.** Tant que le
fleuve n'avait aucun pont routier, la City et Southwark se tournaient le dos
et aucune boucle ne pouvait changer de rive. Waterloo, Blackfriars et London
Bridge existent désormais, aux vraies adresses. Cinq choses à savoir avant
d'en poser un quatrième, ici ou à Paris.

- **Un pont est une VOIE posée par-dessus le fleuve, pas un relief.** `PONTS`
  est une liste de voies comme les autres (`rangerVoies`, `solDesVoies`),
  ajoutée à `VOIES` pour que `chainerVoies` puisse l'enchaîner. Ce qui le
  distingue, c'est la COTE : `world.js` écrit le tablier à `city.base + 1`
  — la hauteur des quais — au lieu de la hauteur du sol, et SEULEMENT là où
  ce sol est sous `WATER_LEVEL`. `hauteurLondres` ne bouge pas d'un bloc,
  l'eau reste sous le tablier, et c'est pour cela qu'une passe de ponts se
  fait sans double empreinte — même raison que la passe de rues de v206.
- **Ce qui prouve un pont, c'est l'eau sous son tablier** (leçon du Bay
  Bridge). Le témoin lit `getBlock` à `WATER_LEVEL` sous chaque colonne
  roulante : les morceaux s'engendrent à la demande, donc il n'a pas besoin
  d'y aller. Et il lit la cote du tablier dans `CITIES`, jamais en dur.
- **Chaque bout du pont est posé SUR la chaussée d'une avenue de la rive**
  (Victoria Embankment, Waterloo Road, Queen Victoria Street…) — la leçon de
  Nice, sans quoi le circuit rate son seuil au pied du pont.
- **Trois ponts seulement, et les absents sont des décisions.** Westminster
  Bridge traverserait l'emprise de Big Ben et le pied du London Eye,
  Hungerford couperait la grande roue, Southwark tomberait sur le Globe. On
  ne pose pas un tablier dans un monument : ce sont des dettes déclarées
  dans `TASKS.md`, à reprendre le jour où ces emprises bougent.
- **Un circuit rive à rive se reconnaît à ses points, pas à son nom.** Le
  témoin (et le mesureur) comptent un circuit comme rive à rive s'il a des
  points HORS du lit des deux côtés de l'axe (`auNordDeLaTamise`, exporté
  pour cela). Trois circuits changent de rive, chacun des trois ponts est
  emprunté, et dix-huit circuits couvrent soixante-deux voies sur
  soixante-trois — Euston Road côté King's Cross reste la seule sans boucle.

### Washington (`washington.js`, `dcmonuments.js`)

La sixième ville, la première où **on entre dans les bâtiments** — et la
première à avoir été **refaite sur verdict de l'utilisateur** : v161, à seize
blocs par kilomètre, était « une version très low cost » (Max, quelques heures
après la mise en ligne), une maquette qu'on survole. v162 triple l'échelle et
réduit la couverture au cœur monumental. La leçon vaut pour toute ville à
venir : **le critère n'est pas « la carte est juste », c'est « on s'y promène
comme dans GTA »** — la fidélité de plan ne sauve pas une ville où les
bâtiments font dix blocs.

- **Une échelle, un ancrage.** Quarante-huit blocs par kilomètre, ancré sur le
  Capitole — le point zéro du vrai plan de L'Enfant. Chaque lieu est donné par
  sa vraie latitude et sa vraie longitude, `de()` fait le reste. À cette
  échelle les grands bâtiments sont quasi à leur taille ; en échange, la carte
  s'arrête au cœur monumental (la Cathédrale nationale et Georgetown University
  sont hors emprise, ils attendent que le monde grandisse).
- **Trois entorses, déclarées dans l'en-tête** : les petits mémoriaux deux à
  trois fois trop grands (l'obélisque six fois trop large, pour son colimaçon) ;
  les îlots agrandis d'un facteur 1,7 (`PAS_RUE` 12) pour que chaque maison ait
  un étage et un escalier ; et des écarts de position commentés ligne à ligne
  — dont les deux rangées de musées, reculées d'un à deux blocs pour que leurs
  façades s'alignent sur les allées du Mall **sans manger la pelouse**.
- **L'eau appartient à la ville.** `cityAt` s'arrête à la rive — c'est son rôle
  — mais le générateur bâtit aussi les colonnes d'eau de l'emprise
  (`dansEauWashington`). Sans cette clause, la Bleue traversait le Potomac dans
  un tunnel fantôme jamais creusé, et le pont de la Jaune n'existait pas. Le
  défaut a vécu toute la v161 sans être vu : aucun témoin ne regardait sous le
  fleuve.
- **Une coupole se dessine colonne par colonne** (une hauteur par colonne,
  `√(r²−d²)`), jamais par anneaux : les anneaux laissent des trous en couronne
  près du sommet, et de la Rotonde on voyait le ciel à travers le dôme.
- **Le déménagement d'une ville se prouve.** L'ancienne emprise doit rendre le
  relief d'AVANT la ville, au bloc près : l'empreinte hors-nouvelle-zone de
  v162 est identique à celle de v160 — c'est la forme que prend l'invariant 1
  quand une ville bouge, et `plafond.js` la vérifie.
- **Les monuments ne se recouvrent pas, et ne se posent pas sur l'eau.** À cette
  échelle ils se marchent dessus naturellement — les cinq mémoriaux de West
  Potomac Park tiennent dans trois cents mètres réels. Leurs positions ont été
  résolues une fois pour toutes et sont **figées dans `MONUMENTS_DC`**, avec
  l'adresse vraie et l'écart en commentaire. Déplacer l'un d'eux se vérifie :
  aucune empreinte en commun, aucune colonne sur le fleuve.

**Le métro, et le seul piège qui compte.** Quatre lignes, creusées colonne par
colonne comme le reste de la ville. Un tunnel en pente se rebouche tout seul :
deux tronçons voisins couvrent la même colonne à deux cotes différentes, et le
ballast du plus haut retombe au milieu du vide du plus bas. On collecte donc
tout ce que les tronçons ont à dire, **on creuse le vide d'abord**, on abandonne
les pleins qui tomberaient dedans — et surtout on creuse **le gabarit des rames
en dernier**, après les quais et les voûtes. Rien ne peut alors se mettre en
travers d'un train. C'est ce qui a fait passer la ligne Bleue de soixante et un
points murés à zéro.

Trois autres choses apprises en creusant :

- **La pente se limite, la profondeur ne se force pas.** Prendre le point le
  plus bas à huit blocs à la ronde enterrait Foggy Bottom à quatorze blocs sous
  la rue parce que le Potomac passe à vingt blocs de là. On borne la pente à un
  tiers de bloc par bloc : le tunnel plonge sous le fleuve et remonte tout seul.
- **Le terminus a besoin d'un tiroir.** La rame fait demi-tour en décrivant un
  demi-cercle ; sans prolongement au-delà de la dernière station, ce demi-cercle
  se referme **sur le quai**. L'emprise de la ville doit couvrir ces tiroirs,
  sinon la rame roule dans la roche.
- **Un métro qui ne s'arrête pas n'est pas un métro.** À huit mètres par
  seconde, la fenêtre pour monter dure une seconde et un enfant de sept ans la
  rate à tous les coups. Les rames marquent les stations trois secondes ; il en
  faut trois par ligne pour que l'attente reste sous la demi-minute.
- **Ce qui est sous terre ne se dessine pas de loin** (`souterrain: true`). Un
  convoi reste rendu tant qu'il est à moins de cent cinquante blocs — la portée
  du regard à ciel ouvert. La v161 de Washington étant à cent trente-sept blocs
  du point d'apparition, dix de ses douze rames se dessinaient dans la roche :
  le jeu est tombé de vingt-cinq à seize images par seconde. Et comme `main.js`
  borne `dt` à un vingtième de seconde, sous cette barre **le monde avance
  moins vite que le temps réel** — l'enfant court moins loin en appuyant aussi
  longtemps. C'est un témoin de la monte, qui ne cherchait rien de tel, qui l'a
  signalé. Depuis v162, `decouvert` complète la règle : une rame souterraine
  qui SORT de terre — le pont de la Jaune — redevient visible de loin.

**Les circuits de voitures — et pourquoi un rond-point se CONTOURNE (v205).**
Washington est restée quatre versions sans une seule voiture, alors que toutes
les autres villes bâties à la main roulaient depuis la v201. Le carré de
secours n'y trouve jamais une rue — c'est le plan de L'Enfant : la moitié des
avenues sont des diagonales, et elles se croisent sur des ronds-points. Cinq
choses à savoir avant d'y toucher.

- **Un rond-point avait un anneau de TROTTOIR.** Rien ne pouvait le traverser,
  ni le contourner : Dupont, Logan, Lafayette coupaient toute boucle qui les
  touchait. Il porte désormais trois couronnes : le jardin jusqu'à `r − 3`, la
  chaussée sur `[r − 3, r − 1)`, le trottoir au-delà, percé là où débouche une
  avenue ou une rue de la grille. C'est du SOL, pas du relief : le témoin
  d'empreinte de `plafond.js` n'a pas bougé d'un octet.
- **`chainerVoies` joint les avenues en droite ligne, et une droite qui passe
  par Dupont Circle traverse son jardin.** Mesuré : 80 % sur pelouse. D'où le
  crochet `ajuster` de `fabriqueCircuits` : `contournerCercles` remplace tout
  tronçon qui entre dans un cercle par l'arc de l'anneau (rayon `r − 2`), dans
  le sens le plus court — et la retouche se fait AVANT la mesure, jamais
  après. Un chiffre en commentaire au-dessus d'un circuit est celui du tracé
  contourné. **Le contournement lui-même vit dans `voies.js`
  (`contournerRonds`) depuis la v209** : Paris avait exactement le même
  besoin, et le remède d'une ville ne doit pas rester dans le fichier d'une
  ville — c'est la leçon du verre dans les murs, payée quatre fois.
- **« Dedans » inclut le BORD.** Le bout de Connecticut est posé exactement
  sur l'anneau de Farragut ; avec un `<` strict il n'était ni dehors ni
  dedans, et la corde qui y menait coupait la place sans qu'aucune
  intersection ne la trahisse. Le témoin qui ne lisait que les SOMMETS ne
  voyait rien ; celui qui échantillonne chaque tronçon bloc par bloc l'a vu
  du premier coup. Un témoin de géométrie lit le trajet, pas ses nœuds.
- **Un circuit se referme sur des CARREFOURS** (leçon de Nice, valable ici
  au carré) : les rues de la grille traversent le centre d'un bord à l'autre,
  et `chainerVoies` n'accroche une voie que par ses BOUTS. Les raccords de
  `VOIES_CIRCUITS_DC` sont des tronçons de ces mêmes rues, coupés au
  carrefour, posés SUR la chaussée existante sans un bloc de sol en plus. Et
  le Mall a dû reculer de cinq blocs (u1 −22 → −27) pour que la 3e Rue passe
  entre lui et le parc du Capitole : sans cette rue, un tour du Mall n'avait
  pas de retour.
- **L'ordre de lecture du sol est une décision.** Washington Circle, à sa
  vraie adresse (23e & Pennsylvania), a son bord ouest dans la bande boisée
  de Rock Creek Park ; lu après le parc, l'anneau perdait deux colonnes et
  six points sur huit roulaient. Les cercles se lisent AVANT le parc — et
  avant de trancher, on a mesuré que le sol y est plat (33) : le ravin ne
  commence qu'à cinq blocs de l'eau. On ne déplace pas un ruisseau pour une
  chaussée.

**UNE GRILLE PEUT ÊTRE SATURÉE, ET CELA SE MESURE (v223).** Virginia Avenue NO
n'avait aucune boucle depuis la v205. Mesuré : sur **vingt-six mille** chaînes
candidates, ZÉRO n'était compatible avec les dix-neuf circuits en place sous le
seuil de partage de vingt blocs. Devant une avenue qu'on n'arrive pas à
couvrir, la question n'est donc pas seulement « quelle rue manque » mais
« reste-t-il de la place ». Trois choses en sortent.

- **La passe de réparation se fait par le MINIMUM de gêneurs.** La meilleure
  boucle de Virginia (223 blocs, 100 %, virage 92°) n'en gêne que DEUX, de
  vingt-cinq et vingt-sept blocs. On les retire, on la force, on recomble — et
  le recomblement rend à la 15e Rue ses voitures par un autre chemin, si bien
  qu'aucune rue ne perd les siennes. Chercher le gêneur le moins nombreux vaut
  mieux que tirer au hasard.
- **UNE RUE QU'ON NE PEUT PAS TRACER NE SE FORCE PAS.** La 17e Rue NO a été
  essayée puis retirée : entre Constitution et F Street elle traverse le parc de
  la Maison-Blanche, qui passe avant les voies dans `solWashington` — neuf blocs
  de pelouse sur quarante, mesurés. L'Ellipse fait ici trente blocs de large,
  à peu près sa vraie taille : c'est le modèle qui a raison, pas la rue.
- **ET LA TABLE DES GARDIENS AVAIT UN TROU, sur la ville qui en a le plus
  besoin.** `src/washington.js` déclare `washington.js` et `plafond.js`
  seulement, quand toutes les autres villes bâties à la main déclarent aussi
  `carte.js` et `carteMonde.js` — qui l'importent toutes deux et mesurent ses
  dix-neuf circuits. Le portail annonce donc « déjà vert sur ce code » pour les
  deux suites qui testent ce qui vient de changer. La v195 avait déjà payé ce
  genre de trou (le Bay Bridge planté au milieu de San Francisco) ; la
  vérification « aucun fichier de `src/` sans gardien » ne voit pas un gardien
  INCOMPLET. Devant un « déjà vert » sur un fichier qu'on vient de changer, on
  regarde la table avant de croire le portail.

**Et un témoin qui lit `p[0]` sur des objets `{x, y, z}` compte toujours
zéro.** `fabriqueCircuits` rend des points-objets ; le premier brouillon du
compte de jardin les lisait comme des tableaux, et rendait NaN, donc jamais
« dedans ». Vert, et il ne prouvait rien. La forme des données qu'un témoin
lit se vérifie avant son verdict.

**UNE CHAUSSÉE SOUS UN MUSÉE EST INVISIBLE TANT QUE RIEN N'Y ROULE.**
Independence et Constitution Avenue passaient à v = ±13, sept blocs de
large : chacune traversait la rangée de musées (v ±6 à ±15) — du bitume sous
les galeries, que les bâtisseurs recouvraient de leur propre plancher. Cinq
versions sans que personne ne le voie. Le jour où le tour du Mall a roulé,
les voitures ont traversé l'Air et l'Espace. Les vraies avenues font trente
mètres, un bloc et demi ici : trois colonnes de chaussée à v = ±17, le
trottoir à ±15 le long des façades. Une voie qu'on déclare se regarde SUR la
carte de sol (`mall.mjs` dans le brouillon) avant qu'une voiture ne la
révèle.

**Et une durée n'est pas un verdict quand des voitures neuves coûtent au
banc ses images.** « On entre dans l'Air et l'Espace » marchait huit pas de
700 ms et lisait le plafond : rouge sur la branche, vert sur `origin/main`,
même code de musée. Mesuré : 4,5 images par seconde au même endroit contre
14 à 17 — les voitures d'Independence ajoutent cent trente appels de dessin
au rendu logiciel du banc — et comme `main.js` borne `dt` à un vingtième,
huit pas ne faisaient plus que quatre blocs : l'enfant restait sur le
perron. Le témoin marche désormais jusqu'à être entré OU jusqu'à ne plus
avancer. C'est la leçon du lien muet et des retrouvailles, par un troisième
bout : quand un rouge dépend du temps, on mesure d'abord le banc.

**Et « ne plus avancer » se constate sur PLUSIEURS pas.** Le premier remède
abandonnait dès qu'UN pas de 700 ms ne faisait pas bouger le joueur, et le
portail complet l'a rendu rouge une seconde fois : « plafond à -1, 0 mur(s),
à (u -45, v 3) », arrêté sur la pelouse à trois blocs de la porte, rien
autour. Un pas entier tombé dans un hoquet du banc — remaillage,
ramasse-miettes — à quatre images par seconde. Vert seul, vert sur
`origin/main`. Un mur arrête le joueur à CHAQUE pas ; un hoquet, à un seul :
on n'abandonne qu'après trois pas consécutifs sans mouvement, et le message
dit où l'on s'est arrêté, sinon un rouge de ce genre ne se démonte pas.

**ET LES ORMES DU MALL ÉTAIENT DE LA PELOUSE SUR LE GRAVIER — la CINQUIÈME
ville à porter le piège des arbres à plat.** Paris (v187), puis Londres, Nice
et Lille (v198) l'ont payé et écrit : un `sol*` qui rend `LEAVES` pose une
feuille À PLAT, et c'est `arbreDeVille` (world.js) qui en fait pousser le fût
et la couronne. Washington a sa propre branche dans la boucle des colonnes
— elle ne passe pas par la boucle générique — et cette branche n'appelait
pas `arbreDeVille`. Six mille colonnes d'arbre, aucune avec un tronc, quatre
versions durant ; vu en capture de rue sur Independence Avenue, PAS par un
témoin. Deux choses de plus qu'ailleurs :

- **Un arbre ne pousse pas dans un musée.** Les monuments (`LANDMARKS`) se
  posent APRÈS les colonnes et n'écrivent que leurs propres blocs : un arbre
  planté sous l'emprise d'un musée y survit, DEDANS — tronc et feuillage dans
  la rotonde. Mesuré avant le remède : 892 colonnes d'arbre sous une emprise
  de monument, 172 rien que sous le Pentagone, et des bouches de métro
  bouchées. Le garde est au niveau du SOL (`arbreOu(u, v, HERBE)` sur les huit
  sites qui plantent), pas au niveau de l'arbre : là où un arbre ne peut pas
  pousser, on rend le sol d'à côté. 6 307 → 5 277 colonnes d'arbre.
- **Le bâtisseur passe QUAND MÊME derrière l'arbre.** C'est lui qui creuse le
  métro sous les parcs ; `lotWashingtonLibre` est faux sur une colonne
  d'arbre, donc rien ne s'y bâtit, mais le tunnel, lui, se creuse.

Le témoin lit ce que l'enfant voit sur la rangée de v = ±4 : un tronc de
trois blocs une colonne sur deux, de l'air sous la couronne sur l'autre, et
zéro feuille au sol sur tout le Mall. Rouge sur `origin/main`.

### Les visages (`personnages.js`) — un œil se lit à son BLANC

**Ni guimpe ni voile (v243).** Max : « enlève la femme avec le voile, ou retire
le voile ». La dame du château (`dame`) portait une guimpe — cou, menton et
sommet de la tête couverts de lin — et la dame Renaissance (`robeRen`) un voile
derrière son attifet ; les deux sont retirés, le touret et l'attifet restent, la
lavandière garde son fichu noué. Un couvre-chef se mesure comme un œil : par les
sommets colorés au-dessus du cou (129 et 30 sur l'ancien code, zéro ici).

Max, capture à l'appui : « personnages are scary ». Le visage était construit
avec soin — crâne, nez, oreilles, menton — et pourtant il faisait peur. Trois
choses à savoir avant d'y toucher.

- **SAILLIR N'EST PAS SORTIR DE L'ORBITE.** Le commentaire d'origine avait
  raison sur un point : posés à fleur de la sphère du crâne, les yeux
  disparaissent et le visage devient un œuf lisse. Mais l'iris était posé PLUS
  EN AVANT que le blanc, et il occupait 55 % de sa largeur : de face, deux
  billes sombres globuleuses, sans blanc autour. Un œil se lit à son blanc ;
  l'iris n'en occupe qu'une petite part et reste EN RETRAIT.
- **Un sourcil bas et épais fronce, et une barre droite fait la moue.** Ce
  sont deux détails de trois millièmes de bloc, et ils décident si un enfant
  de sept ans voit un villageois ou un masque. Le sourcil monte et s'affine ;
  la bouche gagne deux coins relevés.
- **L'esthétique se juge en capture, la GÉOMÉTRIE se mesure.** Les couleurs
  vivent dans les attributs de SOMMETS, pas dans les matériaux : on relève la
  boîte du blanc et celle de l'iris et l'on compare. Deux pièges y attendent —
  filtrer sur la seule couleur attrape la ceinture de CUIR, dont le brun est à
  un cheveu de celui de l'iris (elle rendait un « iris » de 178 % de large, posé
  devant le nez), et mesurer les DEUX yeux ensemble écrase le rapport, la
  largeur incluant l'écart entre eux : 89 % contre 82 %, quand l'œil seul dit
  55 contre 38. On borne donc la lecture à la tête, et à un seul œil.

### La monte et les véhicules (`montures.js`, `animals.js`, `fun.js`, `vehicules.js`)

- **Ce qui se monte est une propriété de l'espèce** (`montable`), jamais une
  liste écrite dans le fichier des boutons — c'est cet oubli qui avait laissé
  trois espèces montables pendant que le bestiaire s'étoffait. Même règle
  pour **ce qui se nourrit** (`nourrissable: false` sur la voiture) : la
  règle vit dans la fiche, jamais dans `fun.js`.
- **Et une pièce de roue est un mot entier ET une géométrie (v246)** — voir
  « Une pièce de roue est un mot entier et une géométrie » plus haut.
- **UN MODÈLE SE MESURE, IL NE SE DÉCLARE PAS (v230).** La flotte avait un
  manifeste — mètres, +Z vers le nez, roues à y = 0, pivots `Wheel_FL/FR/RL/RR`,
  laque `Paint_*` — et trois endroits du jeu s'y fiaient. Les modèles que Max
  dépose ensuite viennent d'ailleurs : roues éclatées en huit nœuds (un par
  matériau), aucun matériau `Paint`, nez sur un autre axe, maillages quantifiés.
  Livrés tels quels : voiture en travers, flottante, roues figées.
  `normaliserVoiture` (vehicules.js) mesure donc ce qu'on lui donne — les roues
  par leur lignée de noms, l'axe de la longueur par l'écartement (un empattement
  est plus long qu'une voie), l'avant par les NOMS et non la géométrie — puis
  regroupe, tourne par quarts de tour et pose au sol. **Et elle ne touche à rien
  quand le manifeste est respecté** : c'est ce qui garantit que les cinquante
  d'origine ne bougent pas d'un pixel, et c'est ce que vérifie le témoin de
  contrôle, vert des deux côtés à dessein.
- **UNE PROPRIÉTÉ D'UN MODÈLE VIT DANS SA FICHE, PAS DANS UN TÉMOIN.** Les deux
  modèles de la v230 sont des carrosseries seules : pas de volant. Un témoin
  existant vérifie que « le volant reste dans l'habitacle » sur la voiture que
  l'enfant conduit, TIRÉE AU HASARD — il aurait basculé deux fois sur
  cinquante-trois, quatre pour cent des exécutions, le genre de rouge
  intermittent qu'on met des jours à démonter. `habitacle: false` dans la
  fiche, et le témoin le lit : même discipline que `montable`, `nourrissable`
  et `vole`. **Devant un modèle neuf, on cherche le jour même quels témoins
  supposent quelque chose de la flotte entière** — et cette recherche n'avait
  pas été complète : « la voiture a de vraies vitres » supposait un matériau
  nommé « glass » ou une opacité sous 0,8, et il est tombé au portail de la
  v247 sur un tirage (le pare-brise de la Lucid s'appelle « windshield », la
  Chiron Stealth n'en a pas). Il lit désormais `habitacle` et plusieurs
  langues de vitrage.
- **La voiture est un modèle 3D d'artiste, plus jamais une sculpture de
  primitives.** Quatre itérations de coordonnées écrites à l'aveugle
  (verdicts de Max : « très carrée », « low fidelity », « ça ne ressemble
  pas à ça du tout ») ont prouvé que la méthode plafonne. Le modèle vit dans
  `vendor/voiture.glb` (licence : `vendor/VOITURE_LICENSE`), chargé une fois
  par `chargerVraieVoiture()` (vehicules.js) et cloné ; la coque sculptée
  reste l'ATTENTE et le SECOURS si le fichier manque — un modèle absent ne
  doit jamais empêcher le jeu de démarrer. Trois pièges payés en captures :
  un glb **quantifié** ment sur ses boîtes englobantes (la voiture flottait
  — on livre non quantifié) ; le modèle embarquait un **socle** nommé
  « None » posé 1,4 sous les pneus (retiré au chargement) ; et la **cabine
  avancée** met le siège hors de l'origine — recalée de 0,55 pour que la
  caméra s'asseye dans le vrai cockpit, sinon on voyait le dos des sièges.
  L'allègement se fait HORS LIGNE (881 794 → 98 959 triangles, 12,4 →
  1,3 Mo) : jamais de décodeur Draco embarqué dans la PWA.
- **Les reflets de carrosserie sont une caméra cubique** (`refletsVoiture`,
  `lancerReflets`/`avancerReflets`, cadencés par main.js : 128 px, une
  capture toutes les demi-secondes, seulement à moins de 45 blocs d'une
  voiture — et depuis la v245 **UNE face par image**, sur la couche du DÉCOR
  seulement ; voir « La conduite saccadée » plus bas). Ne JAMAIS fabriquer de
  CubeTexture depuis des canvases : l'échantillonnage casse et blanchit
  toute la voiture, teinte et couleurs de sommets comprises — une heure de
  bissection de matériaux pour le voir.
- **En voiture, l'œil s'assied DANS l'habitacle** (`oeil`, hauteur absolue
  dans la fiche) — l'ancienne formule yeux + assise posait la caméra
  au-dessus du toit. Un rétroviseur central est interdit de séjour : dans un
  habitacle aussi bas il flotte au milieu du pare-brise, trois captures
  l'ont montré.
- **LA MONTURE NE SE RETIRE JAMAIS, ET SI ELLE DISPARAÎT ON DESCEND POUR DE
  BON (v245).** `animals.js` retire toute bête à plus de soixante-dix blocs de
  l'enfant, et cette boucle passe AVANT que `fun.js` ne colle la monture au
  joueur : téléporté au volant par la carte, l'enfant perdait sa voiture et
  gardait à pied sa carrure (1,1 bloc du mur au lieu de 0,3). La bête montée
  porte `montee` (posé par fun.js, comme `montable` dans sa fiche) et la
  boucle la saute ; et le chemin « la monture a disparu » de `updateRide`
  rend tout ce que descendre rend — marche, vol, gabarit — au lieu de seulement
  oublier `riding`. C'est un témoin de `monte.js` (un saut de trois cents
  blocs au volant) qui l'a trouvé, pas une capture.
- Le bouton « Monter » prend la monture **la plus proche devant soi**, pas celle
  visée au degré près. Viser reste la règle pour *nourrir*, où l'on choisit
  vraiment un animal parmi d'autres.
- C'est la **caméra qui s'élève** à la hauteur du dos (`assise`), pas la bête
  qu'on enfonce dans le sol — passable sur un cheval, absurde sur un éléphant.

---

## Ce qui reste à faire

Suivi dans la liste de tâches de la session. Les gros morceaux en cours :

- **Le monde reprend sa vraie géographie** — les villes sont trop serrées, et
  Paris ne ressemble pas à Paris faute de place. Projection équirectangulaire
  centrée sur Paris, **1 bloc = 4 km**, avec **une seule entorse, décidée par
  Max** : la traversée de l'Atlantique (-74° à -10°) est ramenée à **60 %** de
  sa longueur vraie. C'est le seul grand vide d'eau de cette carte — vers l'est,
  Paris-Tokyo traverse l'Eurasie, donc de la terre ferme d'un bout à l'autre, et
  garde son échelle exacte. Résultat : New York 1 415 → **956 blocs**, San
  Francisco 2 303 → **1 840**, l'Europe et l'Asie inchangées au bloc près.
  **On voyage par la carte**, pas à pied : la téléportation existe déjà et
  c'est elle qui rend ces distances jouables.

  **Le piège : déplacer une ville déplace le sol sous les blocs des enfants**
  (invariant 1). Il faut donc versionner le générateur de terrain et migrer
  chaque bloc de la différence de hauteur de sa colonne — pas régénérer et
  espérer.
- **La bibliothèque de monuments** — onglet 🏛️ dans l'inventaire, vignette par
  bâtiment, pose devant soi comme une brique. Contrainte : le plafond libère
  ~115 blocs au-dessus du sol, donc **une échelle par monument** (chacun aussi
  grand que possible sous le plafond) plutôt qu'une échelle unique.
- **Recalibrer les monuments existants** dans le ciel neuf.
- **L'usine automobile et le mode conduite** — une chaîne de production complète
  documentée sur de vraies recherches (emboutissage, carrosserie robotisée,
  peinture, mariage batterie-caisse, piste d'essai), la voiture qui se construit
  visiblement de poste en poste, et à la sortie **on monte dedans et on la
  conduit**. Voir la section « Conduire » ci-dessous : c'est là qu'est le
  travail, pas dans la chaîne de production.
- Intérieurs visitables, guides dans les villes, notifications push.


### Présence et anatomies v241

Max a signalé des voitures et personnages trop rudimentaires et des personnes
qui disparaissaient en avançant. La portée de 62 m et le rapatriement dès le
passage derrière la caméra produisaient ces ruptures. Désormais `presence.js`
est l’unique propriétaire de la visibilité humaine : 80–112 m en fondu,
transition complète sur 0,8 s, aucun recyclage proche ou lié au regard. La
relocalisation exige une présence nulle et une distance de 136 m. Pour garder
les rues habitées, la population s’ouvre progressivement, plafonnée à 88 par ville. Ne pas réintroduire un `visible=false` dans `vie.js`.

Les modèles Rocketbox MIT partagent leur géométrie et leurs textures ; chaque
personne possède son squelette. Ne jamais réduire la géométrie en place pour
faire un enfant : l’adulte voisin utilise la même. Les matériaux de présence
sont privés ; leurs textures restent partagées. Libérer aussi les textures du
squelette quand une instance disparaît, notamment dans les portraits.

Les yeux des nouveaux modèles sont texturés. Le témoin qui cherchait les
anciennes billes blanches en couleurs de sommets est remplacé par les contrôles
du visage rendu, des cartes chargées et des proportions ; `realisme.js`
éprouve les régressions de présence et d’anatomie. Les neuf GLB vivent dans le
cache IMMUABLE de la PWA depuis la v245 (avec le scanner et la flotte), leurs
modules dans le cache versionné ; ils se chargent APRÈS l'accueil et les corps
nés avant se mettent à niveau sur place (voir « Le démarrage et la conduite sur
un vieil iPad »). Provenance, limites et commande de conversion :
`docs/personnages-v241.md`.

Les matériaux automobiles qui lisent la sonde cubique ne peuvent pas être dans
sa capture : lire sa propre cible de rendu produit `GL_INVALID_OPERATION`.
Depuis la v245 ce n'est plus un masquage à chaque capture mais une COUCHE
(`couches.js`) : la carrosserie vit sur la couche 2, que les six caméras de la
sonde ne voient pas. `realisme.js` renouvelle les reflets quatre fois dans la
vraie scène et vérifie le code WebGL ainsi que l'absence de maillage laissé
caché.

## La sûreté d'un cran (v509) — un disjoncteur ne coupe pas plus que la panne

Max : « les arbres ont pas changé ». Son iPhone jouait au palier `bas` par
sûreté depuis deux plantages sous « Loin » : `hd 0`, donc ni les vrais arbres,
ni les façades de Paris, ni la couronne lointaine — trois livraisons qui ne
l'atteignaient pas, la régression de RÉGLAGE de la v291 une fois de plus.
Trois règles.

- **SOUS UNE ÉTENDUE CHOISIE, ON DESCEND D'UN CRAN DEPUIS LE PALIER QUI
  TOURNAIT.** `suretePalier(plantages, sousChoix, palierEnCours)` (journal.js)
  lit le palier de la fiche de la session morte (`reglage.palier`) : sous une
  sûreté l'étendue reste « Loin » pendant que le jeu joue Normal, et c'est
  Normal qu'on descend. Sans étendue choisie (« Auto »), le fond, comme avant.
  Et le compteur repart de zéro quand un verdict est RANGÉ : deux plantages de
  suite se comptent au palier neuf.
- **UN VERDICT RANGÉ SOUS L'ANCIENNE RÈGLE SE RELIT, IL NE SE REMPLACE PAS.**
  Le verdict neuf porte `cran` ; sans lui, un « bas sous Loin » se lit Normal
  (`palierDeSurete`, palier.js). La correction atteint l'appareil de Max sans
  qu'il touche à rien, et sans changer de clé de rangement (v290 : la clé
  change quand le SENS de la règle change ; ici seule sa lecture change).
- **CE QU'ON NE DIT PLUS EN JEU SE DIT DANS LES RÉGLAGES, AVEC LE GESTE.** Les
  messages en jeu partent (les commandes à icônes, décision de Max) : la rangée
  de l'étendue dit la sûreté en premier (« Touche « Loin » pour réessayer, ou
  garde ça »), et retoucher l'étendue même lève la sûreté. Le témoin de
  `parent.js` rejoue l'appareil : verdict rangé, rechargement, configuration
  lue (`reglageApplique`) et phrase lue.

Et les records de course d'avant la v483 (même livraison) : on n'efface rien.
`bestRace` n'est plus écrit ; `migrerRecordsCourse` (sync.js, pure,
idempotente) le range en `courseVieuxChrono`, gardé à part (plus annoncé en jeu, v504),
et le record à battre est `courseJuste`. Appliquée au chargement (fun.js) et à
chaque document reçu du nuage ; les temps se fusionnent par le plus petit
positif, et la comparaison « la fusion a-t-elle rapporté quelque chose ? » se
fait sur les records MIGRÉS (sinon un ancien champ relancerait la page, v189).

## Les vrais arbres (v499) — un arbre se reconnaît à la règle qui l'a planté

Max : « Change tous les arbres pour avoir de vrais arbres, pas des arbres façon
Minecraft. » `src/arbreshd.js` (pur, lu par le worker) : la couche HD dessine
chaque arbre reconnu dans les blocs d'un morceau — fût qui s'effile, branches,
cartes de feuilles, silhouette et couleur par essence et par climat — dans
`facades`, et ses cubes partent dans `plat`. Le voxel reste le squelette : aucun
bloc ne change, les deux empreintes de `plafond.js` et celle des 490 morceaux
sont intactes (`world.arbres` n'est posé que par `main.js`, jamais sur
`new World()`). Six règles.

- **UN ARBRE SE RECONNAÎT À LA SIGNATURE EXACTE DE `treeAt`, JAMAIS À LA
  SILHOUETTE DE SES CUBES.** Mon premier jet lisait l'essence dans la forme de
  la couronne : en forêt dense, les couronnes se touchent et le flood en prend
  plusieurs — 14 écarts sur 22, des chênes lus palmiers. On demande à la règle
  qui a planté l'arbre (`treeAt(x, z)` : même base, même hauteur de fût, même
  bloc) ; un fût que `treeAt` ne connaît pas n'est un arbre de ville que s'il
  en a le motif strict (deux feuilles dans sa colonne, aucun bois adjacent à la
  base, pas de débord à ±2). Une cabane de rondins posée par un enfant reste
  en cubes (témoin) : c'est « on ne tait que ce que le modèle couvre » (v292)
  du côté de la reconnaissance.
- **LE CLIMAT SE DEMANDE UNE FOIS PAR MORCEAU, ET `treeAt` LE REÇOIT.** Appelé
  colonne par colonne avec `this.climat(x, z)`, `treeAt` coûtait +18 ms par
  morceau de taïga (`climatReel`, des polygones) : `treeAt(x, z, cm)` prend le
  climat du morceau (`climatDuMorceau`, v345), et le générateur ne change pas
  d'un bloc — c'est le témoin « blocs identiques » qui le garde.
- **AU LOIN, ON NE RECONNAÎT PAS : LE MORCEAU SE DIT ARBORÉ (`arbres: -1`).**
  La reconnaissance (flood à 26 voisins dans une bande en y, marque timbrée et
  pile à plat) coûte 10 à 14 ms sur le morceau de forêt le plus dense ; faite
  partout elle aurait coûté cela à chaque morceau du disque, détail ou pas. Un
  morceau sans détail garde ses cubes dans `solid` et rend −1 : `main.js` sait
  qu'il faudra le remailler à portée (`entry.hd`), et le prix au loin tombe à
  0,3–1,4 ms. Ce qu'on ne montre pas, on ne le calcule pas (v296).
- **LES UV D'UNE CARTE ALPHA SONT ABSOLUES DANS L'ATLAS, POUR L'OMBRE.** La
  passe d'ombre de three copie `map` et `alphaTest` et échantillonne aux UV
  BRUTS, pas repliés par le shader de la couche : des UV en unités du monde
  tombent sur le bord vide de l'atlas et l'ombre est jetée entière. Rectangle
  `NEUTRE`, UV absolues : l'ombre d'une carte de feuilles est découpée par ses
  feuilles. (Les façades HD de Paris, en UV monde, portent ce défaut d'ombre
  depuis la v287 : dette déclarée, hors sujet ici.)
- **UNE TEINTE SE JUGE EN CAPTURE, LE TÉMOIN NE VOIT QU'UNE COULEUR POSÉE
  (v345, v351).** Pin et parasol à (40, 90, 50) sortaient noirs en capture ;
  éclaircis à (58, 118, 66) et (56, 108, 58). Et un pin de 650 sommets en sept
  étages était trop lourd ET trop sombre : trois à cinq étages de quatre
  cartes, et trois branches à trois côtés par verticille.
- **UN TÉMOIN DE RAYON LIT L'ÉTENDUE DES SOMMETS D'UNE BANDE, PAS L'AXE.** Le
  fût est courbe et porte des branches : mesurer « le rayon » le long de l'axe
  d'auteur rendait n'importe quoi. On lit la demi-étendue en x des sommets
  d'écorce d'une bande basse contre une bande haute, trois blocs sous les
  branches (0,32 contre 0,15).

Ce qui reste, déclaré dans `TASKS.md` : une demi-couronne possible à la
frontière de `RAYON_HD` (un arbre à cheval sur deux morceaux dont un seul est
détaillé), et l'ombre des façades HD de Paris.

## Les arbres beaux partout (v528) — un niveau de détail lointain se mesure contre ce qu'il remplace

Max, en vol : « Au loin, les arbres sont moches, ils sont en forme Minecraft. »
Au-delà du détail (v499), un morceau ne reconnaissait pas ses arbres et gardait
leurs cubes. Quatre règles.

- **LE LOIN SE MESURE CONTRE LES CUBES QU'IL REMPLACE, PAS EN VALEUR BRUTE.**
  Les cubes d'arbre d'un morceau de forêt dense pesaient 200 Ko ; les cartes
  lointaines (`arbreLoin`, trois cartes debout, deux couchées, un fût à trois
  pans : 32 sommets par chêne, contre 304 de près) en pèsent 40. Sur le disque
  du palier moyen (rr 12, détail à 4), mesuré sous node, bosquets de la v513
  compris : forêt tempérée 74,4 → 69,2 Mo de tampons, tropiques 111,2 → 78,8,
  taïga 89,2 → 74,7. Le loin coûte MOINS que les cubes : il ne passe donc pas
  sous `hdMo`, qui borne le proche. La reconnaissance (≈ 2 ms par morceau de
  forêt dense) se fait désormais partout ; le temps de maillage par morceau
  reste dans le bruit (1,6 à 6,9 ms des deux côtés, passages alternés). Copier
  la fenêtre de blocs à plat avant la reconnaissance est un non-résultat mesuré.
- **LE PROCHE ET LE LOIN LISENT LA MÊME COURONNE.** `couronne` (arbreshd.js)
  rend centre, demi-axes, normales du volume et nuance ; un témoin de
  `plafond.js` exige, essence par essence, la même boîte de feuillage (centre
  à 0,7 bloc, étendues de 0,7 à 1,35 fois), la même couleur moyenne (15 %) et
  moins d'un quart des sommets. La tuile de feuilles est un DISQUE : une carte
  à la taille de la couronne en est la silhouette ronde, sans tuile neuve.
- **LES CUBES D'UN ARBRE RECONNU NE S'ÉMETTENT NULLE PART.** Plus dans
  `plat` : ce tampon se montre quand le détail est rendu (budget, marge de
  `RAYON_HD`), et les cubes y reviendraient à côté des cartes. Le mailleur
  compte ce qu'il tait (`facesArbresTues`) : c'est sur ce compte que se lit
  « on ne tait que ce que le modèle couvre » (v292), cabane de rondins
  comprise. `montrerLeDetail` relaie `facades` et `arbresLoin`, jamais les deux.
- **CE QUI RESTE, DÉCLARÉ** : au bord du disque chargé, la part de couronne
  d'un arbre dont la base est dans un morceau pas encore maillé manque (dans
  le brouillard) ; le palier bas et le rendu logiciel gardent les cubes (pas de
  couche HD) ; le paysage lointain (horizon.js) n'a pas d'arbres du tout.

## De vraies feuilles, et des arbres pour tous (v541) — une couche se chauffe là où elle peut naître, et un feuillage se juge en capture

Max : « Les arbres sont décevants, je veux qu'on arrête d'avoir des formats
Minecraft en carré, je veux des vrais feuillages, des choses extrêmement
réalistes comme GTA. » Quatre règles.

- **AVANT DE REDESSINER, ON LIT CE QUE CHAQUE APPAREIL JOUE (v532).** Le
  journal de bord (`journal_appareil`, des données d'appareil) a dit deux
  choses : le téléphone de Max joue au palier haut (hd 6) et voit les modèles
  de la v499 ; l'iPad de la famille joue au palier BAS par sûreté (hd 0) et
  n'a jamais vu que des cubes. Un seul signalement, deux pannes : la qualité du
  feuillage, et une couche que tout un palier ne recevait pas.
- **LES ARBRES NE DÉPENDENT PLUS DE LA PORTÉE HD.** `world.arbres` (main.js)
  vaut 1 sur toute vraie carte graphique, quel que soit le palier : à portée du
  détail le modèle proche, ailleurs — et au palier bas partout — le modèle
  lointain, qui coûte MOINS que les cubes qu'il remplace (neuf morceaux de forêt
  dense sous node : 1 293 Ko → 1 074 + 46 Ko, 10 506 → 9 254 triangles). Le
  rendu logiciel garde la règle de la couche (v287) ; `?arbres=1` force,
  `?arbres=0` coupe. Un réglage qui éteint une couche se demande ce qu'il
  éteint d'autre : `hd 0` était écrit pour les façades de Paris, et il
  emportait les arbres de toute la carte.
- **UNE COUCHE SE CHAUFFE À L'ACCUEIL DÈS QU'UN PALIER PEUT LA DEMANDER.** Le
  matériau HD naissait au premier morceau qui le demandait ; au palier bas,
  c'eût été le premier arbre après « Jouer » — un programme et une PMREM
  compilés en jeu (v246). `chaufferLaCoucheHD` le fabrique pendant la
  préparation et le compile vers l'écran ET vers la cible des reflets (le
  décor y est dessiné, v245), comme les feux (v306). Le témoin lit les CLÉS :
  celle de la couche est là avant d'entrer, aucune neuve dans la forêt.
- **UN FEUILLAGE SE JUGE EN CAPTURE, ET LA CAUSE SE LIT DANS LA TUILE.** La
  tuile `feuilles` de la v499 semait deux cent trente points de six texels :
  de près, une carte était un nuage de confettis, et une couronne dix boules
  éparses avec le ciel entre elles — vu en capture au sol, pas au témoin, qui
  compte des sommets et des tuiles. Une feuille est un LIMBE (quinze à
  vingt-deux texels, pointu, nervure claire, bord sombre), les feuilles du fond
  plus sombres que celles de devant, le bord de l'amas en feuilles isolées
  pour la silhouette. La couronne proche gagne des amas et des cartes jusqu'au
  bord du volume ; sa nuance s'assombrit vers le bas ET vers le cœur. Le
  témoin du relais proche → loin (v528) borne ce qu'on peut faire : la couleur
  moyenne des deux modèles à 15 % près — une nuance radiale trop forte le
  rougit (mesuré à 0,87 pour une barre de 0,85, adoucie à 0,90). Les captures
  d'avant et d'après vont dans la PR, au sol, de près, en vol, au loin, et au
  palier bas — et la revue d'écran a désormais ses états `foret` et
  `foret-vol` : `campagne` est le point d'apparition, sans un arbre, et la
  jouer seule ne prouvait rien des arbres.
- **UN CUBE TU LAISSE VOIR CE QU'IL CACHAIT, ET C'EST LA CAPTURE QUI L'A DIT.**
  Au pied de chaque bouleau, un carré uniforme couleur du ciel (173, 210,
  221) : pas une tuile, un TROU. Le cube du tronc se tait depuis la v528, mais
  la face du dessus du bloc de sol sous lui n'avait jamais été émise — contre
  un bloc plein, `shouldRenderFace` dit non — et par le trou on voyait le ciel
  à travers la terre. Sous un chêne, la surface continue recouvre le trou par
  chance (`LOG` est un dessus naturel de `DESSUS_NATUREL`, `BIRCH` non) ; au
  palier bas, où tout arbre est en cartes depuis cette livraison, le trou se
  voyait sous tous les bouleaux. J'ai d'abord accusé `DESSUS_NATUREL` et un
  patch d'herbe en voxel : une sonde sous node qui imprime les faces du
  dessus autour du pied, avec leur rectangle de tuile, a montré des faces
  d'herbe vertes — et une couleur uniforme qui n'est celle d'aucune tuile est
  celle du fond. Le mailleur émet désormais une face contre un cube d'arbre tu
  comme contre de l'air (sans fusion, comptée dans `facesSousArbre`), et la
  conservation des faces de `plafond.js` les compte ; un témoin lit le sol
  sous un bouleau, armé contre désarmé. **Ce chemin n'existe que si les arbres
  sont armés** (`arbresTus`) : désarmés, le mailleur rend les tampons d'avant
  au bit près, ce qui garde l'empreinte des 490 morceaux sans rien déclarer,
  et c'est la preuve structurelle (v291) qui dispense de rejouer les dix-sept
  gardiens de `mesher.js` — seules `plafond.js` et `parishd.js` arment les
  arbres, et toutes deux sont rejouées seules.

## Les arbres du bord (v554) — ce qu'un morceau tait, il le dessine tant que personne d'autre ne le fait

Deux dettes des arbres, une mesure. Deux règles.

- **UNE DETTE SE REMESURE CONTRE CE QUI A CHANGÉ DEPUIS QU'ELLE EST ÉCRITE.**
  La demi-couronne à la frontière de `RAYON_HD` (v499) supposait des cubes de
  feuilles émis côté loin. Depuis la v528, les cubes d'un arbre reconnu ne
  s'émettent NULLE PART, et chaque arbre n'a qu'un dessinateur, le morceau de
  sa base, proche ou lointain d'un seul tenant : le mélange est impossible par
  construction, et le témoin de `plafond.js` le garde (le `solid` d'un morceau
  ne dépend pas de son détail). Ce qui restait vrai était l'autre dette (v528) :
  tant que le morceau de la base n'est pas maillé, la part de couronne tue chez
  le voisin MANQUE — sous node (`sonde-arbres-frontiere.cjs`), sept arbres et
  147 cases au bord d'un disque de rayon douze, et chaque arrivée.
- **LE MORCEAU PORTE AUSSI LE MODÈLE LOINTAIN DE SES ARBRES DU BORD, ET
  `main.js` NE LE MONTRE QUE POUR UN VOISIN ABSENT.** `reconnaitreArbres` rend
  `bord` (les fûts hors du morceau qui y ont des feuilles) ; le mailleur émet
  leur modèle lointain APRÈS ceux du morceau, dans `arbresLoin`, rangé par
  direction du voisin (`DIRECTIONS_VOISINS`, en cercle), avec le climat de SON
  morceau ; `arbresBord` donne les plages d'indices. `montrerArbresBord`
  dessine par groupes (un tableau d'un seul matériau : aucune clé neuve) la
  plage du morceau quand le détail ne l'est pas, et chaque direction dont le
  voisin n'est pas dans `chunkMeshes` ; un morceau qui arrive ou s'en va relaie
  ses huit voisins (`relayerArbresVoisins`). Le modèle est celui que le voisin
  dessine, sommet pour sommet (témoin) : un arbre ne change pas quand son
  voisin arrive, et il n'est jamais dessiné deux fois. Le prix, déclaré :
  `arbresLoin` gagne 70 % (0,96 Mo pour 169 morceaux de forêt, 4,8 % du
  `solid`, mesuré ; le maillage reste dans le bruit, 5,0 contre 4,9 ms), et un morceau du bord du disque coûte un ou deux appels de dessin
  au lieu d'un ; l'intérieur, rien.

## Le bouleau sur la surface (v569) — un bloc d'arbre neuf se déclare au sol continu

Une règle. `DESSUS_NATUREL` (solcontinu.js) dit ce qui peut vivre AU-DESSUS
d'une colonne naturelle sans la rendre artificielle ; il nommait `LOG` et
`LEAVES`, pas `BIRCH`, et chaque bouleau gardait autour de son tronc un carré
de 3 × 3 colonnes en voxel (612 sur 612 autour des 68 bouleaux de la forêt
témoin, mesuré). Le remède passe par `dessusNaturel`, que lisent la fiche,
donc la bande, le contact et le franchissement (v297) : un bloc admis là l'est
pour tous, et le tronc, au-dessus de la bande, reste un obstacle. **Toute
essence neuve dont le tronc n'est pas `LOG` s'y déclare** (`TRONCS` d'arbreshd.js
et `trunkBlock` de world.js en sont les deux autres listes). Ce qui reste en
voxel autour d'un tronc se juge contre le taux des chênes (des falaises, 2,3 %),
jamais contre zéro. `reglageSolContinu.bouleau` à faux rejoue l'ancienne règle
pour l'empreinte des 490 morceaux et pour le témoin de la v541, dont le trou
est désormais recouvert par la surface.
