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

1. **Portail complet vert obligatoire** : `cd tests && npm test`. Quinze suites, précédées de la fumée.
   Aucune publication sur un portail rouge — c'est ce qui produit les
   régressions en cascade.
2. Bump de `CACHE_VERSION` dans `sw.js` à **chaque** livraison, sinon les
   clients installés (PWA sur l'iPad) ne voient jamais la mise à jour. C'est ce
   numéro qui fait foi partout ailleurs.
3. Tout fichier `src/*.js` **nouveau** doit être ajouté à la liste `ASSETS` de
   `sw.js`, sinon il manque hors ligne.
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

| Voie | Quand | Durée |
| --- | --- | --- |
| **Rapide** (`fumee.js`) | Contenu pur : monuments, villes, créatures, décor | ~3 min |
| **Complète** (15 suites) | Dès qu'un fichier **délicat** bouge, ou si git est muet | ~1 h → 59 min (v224) → **48 min** (v225) |

Les fichiers délicats sont listés dans `tests/tout.js` (`DÉLICAT`) : réseau,
nuage, sauvegarde, terrain, joueur, espace parent, éducation, `main.js`,
`sw.js`, `index.html`, et le banc lui-même. La liste est volontairement large.
**Au moindre doute, voie longue** — et `npm run long` la force toujours.

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
arrivé en production. Le portail vérifie désormais qu'aucun fichier de `src/`
n'est sans gardien ; un module neuf sans gardien déclaré annule tous les acquis
du cache de reprise, ce qui le rend visible tout de suite.

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
- **Un témoin doit échouer *proprement* sur l'ancien code, pas s'effondrer.**
  Une méthode neuve appelée sans garde fait planter le banc au premier témoin
  et masque les quatre suivants — on ne voit donc jamais l'étendue réelle du
  défaut. Appeler `s.machin ? s.machin() : repli` coûte une ligne et rend la
  vérification lisible.

### Reprise après coupure

Le conteneur de session peut être recyclé à tout moment. Le portail écrit
chaque verdict sur le disque dès qu'il tombe et saute au redémarrage ce qui est
déjà vert — **mais seulement si le code n'a pas bougé d'un octet** (empreinte de
`src/`, `tests/`, `sw.js`, `index.html`). Au moindre changement, tout se rejoue.
`npm test -- --depuis-zero` force le tour complet.

### Écrire un témoin

- On éprouve le **trajet de l'enfant**, pas le mécanisme. « Le bouton apparaît
  quand une monture est devant soi », pas « la fonction renvoie un objet ».
- **Tout témoin neuf doit être vérifié ROUGE sur l'ancien code.** Un témoin qui
  passe avant et après ne prouve rien.
- Mesurer ce que l'enfant obtient (des mètres parcourus), pas une variable
  interne.

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
  personne ; la patience devant lui seul est de douze secondes, pas quatre —
  une voiture qui finit par passer au travers de la sienne, c'est la panne.
- **Et la réciproque se règle chez le JOUEUR**, dont la boîte de collision ne
  connaît que les blocs : `player.obstacleVehicule` (branché par main.js sur
  `vehicules.obstacleDevant`) bloque un pas qui ferait entrer sa voiture dans
  une voiture de la rue — sauf si l'on est DÉJÀ dedans, sinon une voiture
  arrivée au travers de la nôtre nous clouerait sur place.
- **Une sonde de conduite se pose SUR le tracé d'un convoi**, douze blocs
  devant sa tête, cap du convoi. Posée « quelque part dans Paris », elle ne
  rencontre pas une voiture en trente secondes et rend un vert qui ne prouve
  rien.

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
  supposent quelque chose de la flotte entière.**
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
