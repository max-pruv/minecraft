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

   **Et une casse de cette taille révèle les témoins qui ne prouvaient rien.**
   Quatre témoins de `carteMonde.js` portaient l'échelle écrite en dur —
   `/ 0.75`, l'ancre `200`, des rayons de recherche en blocs qui valaient des
   kilomètres. Ils cherchaient le sommet de l'Everest à mi-chemin de l'Everest.
   Ils étaient verts depuis toujours PARCE QUE RIEN N'AVAIT BOUGÉ, pas parce
   qu'ils étaient justes. Un témoin qui ne peut pas voir un changement n'en
   prouve pas l'absence : il en donne l'illusion. Toute distance du monde réel
   se redemande à la projection, jamais ne se recopie.

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

1. **Portail complet vert obligatoire** : `cd tests && npm test`. Sept suites.
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
| **Complète** (10 suites) | Dès qu'un fichier **délicat** bouge, ou si git est muet | ~1 h |

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

**Et le portail, c'est `npm test` — jamais une liste de suites choisie à la
main.** De v176 à v181, les barrières rejouaient six suites nommées une à une
et jamais la fumée : son témoin de la bibliothèque de monuments est resté
HUIT versions sur l'onglet supprimé en v176, rouge sans que personne ne le
voie. Six suites vertes ne valent pas un portail vert — c'est la même leçon
que « ne jamais relancer jusqu'au vert », par l'autre bout.

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

### Le jeu à plusieurs (`net.js`, `relaisnuage.js`, `cloud.js`)

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

3. **`pilote`** — **à faire.** Le véhicule a sa propre position et sa propre
   physique ; les commandes du joueur la pilotent ; le joueur est collé au
   siège. C'est le seul des trois où l'enfant décide où l'on va.

Le caractère de chaque véhicule vient du **branchement**, pas d'un moteur
séparé :

| Véhicule | `forward` | `strafe` | Le regard |
| --- | --- | --- | --- |
| Voiture | accélérateur / frein, avec inertie | volant — l'angle de braquage n'agit qu'en roulant, on ne pivote pas à l'arrêt | libre, découplé du cap |
| Avion | poussée | roulis | assiette (tangage) ; la portance dépend de la vitesse |
| Bateau | poussée | gouvernail, mou et lent à répondre | libre |

Les deux difficultés réelles, à ne pas découvrir en route :

- **Le véhicule a besoin de sa propre boîte de collision.** Celle du joueur fait
  0,6 bloc de large ; une voiture qui l'emprunte traverse les murs. Il faut une
  collision contre le monde à l'échelle du véhicule, sans quoi rien ne tient.
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
- **Le modèle voyage avec la voiture.** La flotte compte cinquante-et-un
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

### Le monde (`world.js`)

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

### La refonte de la carte — ce que Max a tranché

- **L'échelle.** Équirectangulaire centrée sur Paris, **1 bloc = 4 km**. Une
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
  San Francisco 97 % et 99 %. **Nice et Lille n'ont RIEN au-dessus du seuil**
  — leurs rues sont trop courtes pour refermer une boucle — et gardent
  l'anneau de secours jusqu'à leur remise à l'échelle. On ne déclare pas un
  circuit qui ne valide jamais : ce serait du code mort qui ressemble à de
  l'avancement.

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

### La monte et les véhicules (`montures.js`, `animals.js`, `fun.js`, `vehicules.js`)

- **Ce qui se monte est une propriété de l'espèce** (`montable`), jamais une
  liste écrite dans le fichier des boutons — c'est cet oubli qui avait laissé
  trois espèces montables pendant que le bestiaire s'étoffait. Même règle
  pour **ce qui se nourrit** (`nourrissable: false` sur la voiture) : la
  règle vit dans la fiche, jamais dans `fun.js`.
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
- **Les reflets de carrosserie sont une caméra cubique** (`refletsVoiture`/
  `majRefletsVoiture`, cadencés par main.js : 128 px, deux fois par seconde,
  seulement à moins de 45 blocs d'une voiture). Ne JAMAIS fabriquer de
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
