# Ce qui est en cours

- [ ] **DEUX ROUGES DE `monte.js` SONT NEUFS SUR LA BRANCHE DE LA v282, ET
  L'ATTRIBUTION RESTE À FAIRE.** Les deux portails ont tourné dans la même
  configuration sur la même machine, ce qui donne la double mesure de la v195
  sans rejeu :

  | témoin | main (v281) | branche v282 |
  | --- | --- | --- |
  | l'écran ne se fige pas en arrivant | ❌ 40,0 % · cadence 3,4 | ❌ 34,4 % · 4,1 |
  | une voiture arrêtée par un mur | ❌ `immobile 1` · vitesse **12,16** | ❌ `immobile 2` · vitesse **0** |
  | les voitures ne se traversent plus | ❌ 42,4 % | **vert** |
  | la téléportation ne compile plus de programmes | vert | ❌ `images: 28` (borne 30) |
  | une voiture n'entre pas dans l'eau | vert | ❌ `d: 0,2` — elle n'a pas bougé |

  Les deux premiers sont rouges des DEUX côtés — et le témoin du mur annonce
  une vitesse CORRIGÉE chez nous (0 au lieu de 12,16) : il échoue sur
  `immobile >= 4`, une borne qui compte des ÉCHANTILLONS de 250 ms à quatre
  images par seconde. C'est « un minimum échantillonné est une propriété de la
  cadence, pas du monde » (v279), et la grandeur se trompe dans les DEUX sens :
  le témoin de l'eau atteint ses quatre relevés en cinq secondes alors que la
  voiture accélérait encore (`d: 0,2` après 5,7 s). Ce qui ne dépend d'aucun
  relevé intermédiaire, c'est la position d'ARRIVÉE, et ces deux témoins-là ne
  la mesurent pas.

  À faire, dans cet ordre : (1) rejouer `monte.js` SEULE sur la branche et sur
  `origin/main`, jusqu'à voir la même DISTRIBUTION et non un vert (v269) ;
  (2) reformuler les deux verdicts sur la position d'arrivée, bornés, la durée
  entrant dans le message ; (3) la borne de garde de la téléportation
  (`images > 30`) se pose à la MOITIÉ, pas à quatre-vingt-dix pour cent d'une
  valeur relevée sur une machine qui respirait (v237, quatrième fois).

- [ ] **LE SUPERÎLOT COÛTE UN CIRCUIT À QUARANTE-SIX VILLES (v282).** Croisé
  avec les anneaux, le pas de vingt-sept de `superilot` fait perdre un circuit
  à 43 de ses 65 villes, et 46 n'en gardent qu'UN : deux grands rectangles ne
  tiennent plus sous les vingt blocs de partage de la v211. Le pas est juste
  sur le fond — un superîlot EST plus grand — et la contrainte aussi : ce
  qu'elle mesure est la largeur d'un CARREFOUR (la chaussée, 5,6 blocs), pas la
  taille de l'îlot, donc elle n'a pas à suivre le pas. La longueur de rue qui
  porte un convoi ne bouge pourtant que d'un dixième de pour cent (159 133 →
  158 974) : ce qui se perd, c'est la VARIÉTÉ des trajets dans ces
  quarante-six villes. Piste non mesurée : une contrainte de partage exprimée
  en FRACTION du périmètre de l'anneau plutôt qu'en blocs absolus.

- [ ] **J'AI MODIFIÉ `src/` PENDANT QU'UN PORTAIL TOURNAIT (v282).** La règle de
  survie du banc est écrite depuis toujours et je l'ai enfreinte en corrigeant
  le jeu pendant que le portail jouait `washington.js` : la fin de ce portail a
  mesuré un arbre à moitié changé, et il a fallu le tuer et le reprendre. Une
  SONDE se lance pendant un portail ; une CORRECTION attend qu'il rende la
  machine. (Et `node tout.js --suites <fichier>` n'existe pas : `tout.js` ne
  connaît que `--depuis-zero`, `--voie`, `--long` et `--malgre-fumee`, donc le
  drapeau est ignoré EN SILENCE et le portail entier se lance. Pour jouer une
  suite seule, c'est `node carteMonde.js` — ou `npm run carte`, `monte`,
  `reseau`… Un drapeau inventé ne rend pas d'erreur : on le vérifie dans
  `tout.js` avant de croire qu'on a lancé une suite.)

- [ ] **L'ARCADE EXISTE, MAIS ELLE NE SE PHOTOGRAPHIE PAS (v282).** Le témoin
  compte les colonnes de lot où le bâtisseur ne pose rien à hauteur d'homme —
  23,7 % à Bologne, 24,7 % à Turin, zéro à Zurich et à Copenhague — et c'est
  vrai. Mais un COMPTE de colonnes dégagées ne dit rien de la CONTINUITÉ, et
  c'est la continuité qui fait une galerie. Mesuré dans l'axe de la trame : la
  plus longue file fait **cinq colonnes à Bologne, sept à Turin**, sur 1 026 et
  1 402 colonnes dégagées. C'est la longueur d'un front de lot, ce qui est
  cohérent — les lots sont séparés par une rue tous les vingt-trois blocs — mais
  ce n'est pas les quarante kilomètres de portiques de la vraie Bologne, et sur
  une capture au niveau de la rue on ne reconnaît pas une arcade. Max juge au
  premier regard : tant que ce n'est pas une galerie, le journal doit dire « des
  arcades », jamais « on marche sous les arcades de Bologne ».

  Le remède est un choix de PLAN, pas un réglage : il faut que le portique
  coure sur tout le front du lot ET que les fronts se rejoignent d'un lot à
  l'autre. Piste non mesurée : poser le portique sur le rang entier du côté
  rue, et rapprocher les lots des carrefours.

  **Et la sonde s'est trompée d'axe avant de le voir** : mesurée le long des
  axes du MONDE, la plus longue file valait trois colonnes partout, exactement —
  le signe qu'on traverse en biais une bande de 1,15 bloc dans une trame TOURNÉE.
  Une mesure de continuité se fait dans l'axe de la chose, jamais dans celui de
  la grille de coordonnées.


- **Personnages et véhicules v241 :** compléter la variété des anatomies et vêtements, les expressions faciales et la validation Safari/iPad physique. Les costumes historiques et plusieurs voitures du catalogue restent plus simples ; ne pas les présenter comme photoréalistes.

- **Les avions ont repris une partie de leur rapport de vitesse (v229 →
  v265).** La v229 écrivait que le seul moyen de reprendre le rapport était
  de mailler plus vite ; c'est fait à moitié. La file du mailleur est passée
  de huit morceaux d'avance à seize (`EN_ATTENTE_MAX`, main.js — le genou
  mesuré : le débit de pointe double, la cadence ne bouge pas), le plateau
  remesuré est à 160 blocs/s au lieu de 110, et les vitesses sont désormais
  120 (avion de ligne) et 160 (Concorde, chasseur) : rapport 1,33 au lieu de
  1,16. **Le réel est à 2,4 et reste hors de portée**, et la piste n'a pas
  changé : 45 % du coût d'un morceau est la génération du relief (`fbm`,
  `terrainHeight`, `treeAt`, `cityAt`), le chemin le plus chaud du jeu et
  voisin de l'invariant 1 — donc un chantier à part, avec sa double
  empreinte. Au-delà du genou, le goulot n'est plus le mailleur mais le fil
  principal, qui INSTALLE les géométries : un pool de mailleurs a été écrit,
  mesuré et retiré (non-résultat, voir `CLAUDE.md`).

**Pourquoi ce fichier est dans le dépôt.** La liste de tâches de la session vit
dans le conteneur, et le conteneur a été recyclé sept fois en deux jours. Deux
entrées ont disparu avec lui — la refonte de la sauvegarde et la géographie —
sans que personne ne s'en aperçoive sur le moment. Ce qui compte assez pour être
suivi compte assez pour être versionné.

Tenu à jour à chaque livraison, comme `CHANGELOG.md`. Le journal dit ce qui est
**fait** ; ce fichier dit ce qui **reste**.

---


## LE PORTAIL DES RAILS (v281) : SEPT SUITES ROUGES, ET CE QU'ELLES SONT

Huit suites vertes, sept rouges, `reseau.js` VERTE cette fois — elle en avait
six au portail des pistes. Elle change de rouges d'un passage à l'autre, et
c'est une raison de plus de rejouer seul des deux côtés plutôt que de comparer
deux portails.

| suite | rouge | ce que c'est |
| --- | --- | --- |
| `carteMonde.js` | 1 — les dix-huit gares | **À MOI**, corrigé : le témoin écrivait ses cotes. 18/18 après, vert seul |
| `carte.js` | 💥 en ouvrant sa 4e page | **cause mesurée et corrigée** : la page laissée ouverte. ×3 plus vite |
| `sauvegarde.js` | 2 — la copie d'avant le monde ×2, sur le NUAGE | vert seul des DEUX côtés → charge de portail |
| `maj.js` | 1 — fond de carte pas prêt à la libération | dette déclarée de la v276 |
| `washington.js` | 3 — le métro (une seule cause) | rouge de CHARGE déjà déclaré : vert DEUX FOIS rejoué seul, « 18 m en 6 s de jeu » |
| `manhattan.js` | 💥 délai ligne 282 | intermittence mesurée trois fois sur `origin/main` (v269) |
| `monte.js` | 3 (contre 10 sur main) | les sept fermés le sont par la v279. Voir plus bas |

**ET `washington.js` PASSE DE CINQ ROUGES À TROIS** : ma correction du témoin de
l'escalier (il constate l'avance, pas la descente) en a fermé deux. Les trois
qui restent sont UNE seule cause — aucune rame à portée d'embarquement — et le
champ `texte` du témoin ne peut PAS la distinguer de « rien à portée » :
`majBoutonBord` écrit `${v ? v.emoji : '🚇'} Monter à bord`, et l'emoji par
défaut d'un convoi de métro EST 🚇. Le texte est donc le même dans les deux cas.
Ce qui tranche est `display`, posé à `none` seulement quand rien n'est là.
J'ai d'abord lu ce message à l'envers — « le texte nomme le métro, donc la rame
est venue » — et c'est « compter un motif n'est pas compter la chose » (v224),
appliqué au champ de message d'un témoin.

**LES TROIS QUI RESTENT DE `monte.js`.**

- « les voitures ne se traversent plus » — 95 sur 224 paires (42,4 %). C'est le
  TIRAGE déclaré en v277 : il varie de 0 à 53 sans qu'une ligne du jeu ait
  bougé, et sa barre (45) tombe DANS son étendue. Mais **95 est presque le
  double du pire jamais relevé**, et cela vaut d'être noté : c'est exactement la
  panne que la correction du télescopage vise, avec un témoin qui mesure une
  BORNE garantie par la géométrie au lieu d'un compte d'instants.
- « l'écran ne se fige pas en arrivant sur une ville » — 40 % du temps au-delà
  de 300 ms ici contre 43,1 % en référence : la même grandeur stable. La pire
  image (6 083 contre 4 633) est par construction la statistique la moins
  fiable (v276).
- « une voiture arrêtée par un mur n'annonce plus de vitesse » — 12,16 contre le
  mur, **identique au bit près** à la référence.

## v282 — ce que la passe de tissu et de fleuves laisse ouvert

- **San Jose n'a aucun anneau de circulation, et ce n'est pas l'eau.** Mesuré :
  252 candidats sur 357 sortent de son disque, sa trame de 27×21 étant trop
  grossière pour un rayon de 47 ; le meilleur candidat restant est mouillé sur
  onze points de quarante. C'était déjà vrai avant cette livraison. C'est une
  dette de TISSU — lui donner une trame plus fine, ou un rayon à sa taille — et
  elle est NOMMÉE dans le témoin (`DETTE_SANS_ANNEAU`) pour qu'aucune autre ville
  ne la rejoigne en silence.
- **`tracesCirculation` passe de 199 à 283 ms au démarrage**, derrière le bouton
  grisé (v258, borné à 45 s). Le poste est le parcours au bloc des côtés mouillés.
  Non urgent, mesuré, déclaré.
- **Le mailleur paie une fois par ville le choix de ses anneaux** — 16,4 ms au
  pire (Seattle), contre 24 ms pour un morceau de ville. À remesurer si le nombre
  de candidats augmente.
- **Les six villes bâties à la main n'ont pas reçu les tissus.** Paris, Londres,
  Nice, Lille, Washington, San Francisco ont leur plan relevé sur de vrais plans :
  le tissu ne leur apporterait rien. Mais le cœur d'îlot, lui, leur manque —
  elles sont bâties d'un bord à l'autre de leurs lots. Passe à part.
- **Les ponts des villes engendrées n'ont ni garde-corps ajouré ni arche.** Le
  tablier est plein, les parapets sont deux bandes de pierre, les piles des
  colonnes tous les sept blocs. Ça se reconnaît comme un pont ; ça ne ressemble
  pas encore au Mittlere Brücke. À juger en capture avec Max.
## UN CONVOI SE TÉLESCOPE : la panne que Max signale depuis la v244, mesurée

**Max l'a dite deux fois** — « évite que les voitures puissent se chevaucher »
(v244), puis « les voitures passent les unes sur les autres » (v245). Les deux
livraisons ont corrigé quelque chose de réel et laissé ceci, qui est la cause
principale, et qu'aucun témoin ne pouvait voir parce que le témoin comptait la
mauvaise grandeur.

**LA MESURE.** Sonde à part, une seule page, un seul code, quatre fenêtres de
trente secondes en ordre alterné (200 / 800 / 200 / 800 ms d'échantillonnage) au
centre de Paris :

| passage | pas | taux | enfoncement médian | pire | > 0,8 bloc | même sens |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 200 ms | 10,2 % | **0,11** | 0,96 | 2 / 32 | 15 |
| 2 | 800 ms | 43,9 % | **1,90** | 2,26 | 68 / 82 | 71 |
| 3 | 200 ms | 44,9 % | **1,15** | 2,26 | 295 / 408 | 326 |
| 4 | 800 ms | 34,9 % | **2,25** | 2,26 | 44 / 58 | 44 |

Deux choses s'y lisent, et la seconde est la panne.

**D'ABORD, LE TÉMOIN NE MESURE RIEN.** « Les voitures ne se traversent plus »
rend un COMPTE d'instants de chevauchement. Au pas identique (passages 1 et 3),
il va de 10,2 à 44,9 % ; en tout, sur un seul code, de 0,9 à 50,6 % — et les cinq
valeurs relevées sur les deux arbres (`main` 0,9 · 21,4 ; branche 32 · 39,5 ·
48,5) tombent dedans. **Ce n'était jamais l'arbre, c'était la DURÉE de la
session** : `main` était mesuré tôt, la branche après cent quarante autres
témoins. Sa barre ne peut rien séparer. Il se reformule (voir plus bas).

**ENSUITE, 2,26 BLOC EST LA LARGEUR EXACTE D'UNE VOITURE.** Un enfoncement de
2,26 veut dire que les deux rectangles se recouvrent ENTIÈREMENT dans leur petite
dimension : deux voitures au même point, empilées. Le médian passe de 0,11 (des
frôlements, le bruit de fond d'un pas discret) à 2,25 : à la fin de la session,
la moitié des chevauchements sont des superpositions complètes, et 326 sur 408
sont dans le MÊME SENS.

**LE MÉCANISME, lu dans `vehicules.js`.** `dElement(i) = distance − i × ecart −
retard[i]`, et `retard[i]` grandit tant que `attend[i]` est vrai. Or `attend[i]`
est posé par `cederLePassage` — un piéton, un feu, un autre convoi — et **rien ne
dit à une voiture d'attendre celle qui la précède dans son propre convoi**. Quand
la voiture de tête attend, sa suiveuse continue d'avancer, la rattrape et lui
passe au travers ; il suffit que `retard[i−1] − retard[i]` atteigne `ecart`. Et
cela s'ACCUMULE, parce que le retard ne se rembourse qu'à moitié vitesse
(`pas × 0,5`) : c'est un état absorbant, la forme exacte des poissons de la v233
et du flâneur de la v279 — entrée banale, pas de sortie.

**LE REMÈDE, à mesurer avant de l'écrire.** Borner le retard d'une suiveuse par
celui de celle qu'elle suit : garder `dElement(i−1) − dElement(i) ≥ mini`, donc
`retard[i] ≥ retard[i−1] − ecart + mini`, avec `mini` la longueur d'une voiture
plus une marge. Cela se pose là où le retard se met à jour, en une ligne — mais
`mini` se MESURE, et l'effet sur la fluidité du convoi aussi (une file qui
attend derrière sa tête ne doit pas s'arrêter tout entière pour toujours).

**ET LE TÉMOIN SE REFORMULE SUR LA PROFONDEUR, PAS SUR UN COMPTE.** Un compte
d'instants près d'un seuil qui vit à un dixième de bloc bascule au moindre
souffle ; une PROFONDEUR est bornée par la géométrie, et les deux régimes sont
séparés par deux ordres de grandeur — 0,1 bloc pour un frôlement, 2,26 pour une
superposition. Le verdict devient « aucune paire ne s'enfonce de plus de X bloc »,
et X se relève sur du code CORRIGÉ, pas sur celui-ci. La sonde est dans le
brouillon (`cadence-chevauchements.cjs`) et calcule déjà l'enfoncement par le
théorème des axes séparateurs.

**Et la v279 n'y est pour rien** : son diff ne touche pas une ligne de
`vehicules.js` (`src/montures.js`, `src/nouveautes.js`, `src/vie.js` seulement).
Le mécanisme date de la v244. C'est ce qui autorise sa fusion, et c'est une preuve
plus forte que « rouge identique sur `origin/main` » : l'instrument est démontré
incapable de séparer quoi que ce soit.

## VINGT ROUGES MESURÉS SUR `origin/main`, DONC EN PRODUCTION

Portail COMPLET rejoué sur `origin/main` (710ab76), quinze suites, 78 minutes.
**Aucun de ces vingt défauts ne vient d'une branche en cours** : ils sont dans le
jeu que la famille utilise. C'est la double mesure que la v195 exige, et c'est
aussi la référence contre laquelle diffèrent désormais tous les portails de
branche — un rouge qui est dans cette liste n'est pas le vôtre.

| suite | rouges | ce qu'ils touchent |
| --- | --- | --- |
| `monte.js` | 10 | la conduite, l'arrivée en ville, les flammes de réacteur |
| `washington.js` | 5 | le témoin de l'escalier, pas le métro — voir plus bas |
| `reseau.js` | 4 | **Alice ne retrouve pas son monde** après une veille ou le départ de l'hôte |
| `maj.js` | 1 | le fond de carte n'est pas prêt quand « Jouer » se libère |
| les onze autres | — | vertes |

**ET DEUX DE CES QUATRE FAMILLES TOUCHENT CE QUE LES ENFANTS FONT VRAIMENT.**

- **~~LE MÉTRO DE WASHINGTON EST INACCESSIBLE~~ — NON, ET C'EST MOI QUI AVAIS
  TORT.** J'ai écrit et dit à Max que les cinq rouges de `washington.js`
  signifiaient qu'on ne peut plus prendre le métro. **C'est faux.** Une sonde
  pure — sans navigateur, en lisant les blocs le long du couloir — rend vingt et
  un pas praticables de y=34 à y=20, aucune marche de plus d'un bloc, deux blocs
  d'air d'un bout à l'autre, le quai à 19. L'escalier est sain, et les quatre
  rouges suivants sont la cascade d'un enfant qui n'est jamais descendu.

  **Le défaut est dans le TÉMOIN, et la sonde l'a nommé** : les six premiers
  blocs depuis la bouche sont PLATS, par construction (la bouche est à
  `longueur` du centre, `DEMI_VOUTE` vaut sept). Or le témoin abandonnait après
  « trois pas sans DESCENDRE », et un pas vaut le quart d'un bloc sur ce banc
  (v238) : il se déclenchait avant la première marche, quoi que fasse le jeu.
  Corrigé — on constate « ne plus AVANCER », comme le témoin des portes quinze
  lignes plus haut, ce qui était déjà la leçon citée et appliquée à la mauvaise
  grandeur. **Un mur arrête le déplacement ; un palier n'arrête que la
  descente.**

  Et la leçon de méthode, qui vaut plus que la correction : **j'ai annoncé une
  panne de production sur la foi d'un témoin, sans mesurer la chose elle-même.**
  Le dépôt écrit depuis longtemps « avant d'accuser un message, on vérifie qu'il
  est atteint » et « une explication qu'on n'a pas mesurée est une dette, pas un
  diagnostic » ; ici c'était un VERDICT qu'il fallait vérifier, et la sonde qui
  le fait coûtait dix minutes. Ce qui reste à mesurer, honnêtement : si un enfant
  réel, avec sa boîte de collision et la physique, descend bien ces vingt et un
  pas. La sonde juge un marcheur idéal.
- **ALICE NE RETROUVE PAS SON MONDE.** Quatre rouges de `reseau.js` :
  « Alice retrouve son monde après une veille sans retour — compteur 0 [] », « la
  reprise tient dans la durée — hôte 2 · Alice 0 », « seule après le départ de
  l'hôte, et le compteur le dit — compteur 0, avatars [] », « et le jeu continue
  d'essayer de la reconnecter — null ». C'est le chemin de reprise du jeu à
  plusieurs, celui qui compte quand deux enfants jouent ensemble et qu'un iPad
  s'endort. Le code réseau porte déjà la leçon de la v266 (« le silence ne prouve
  le départ que d'un pair qu'on ne peut pas sonder ») : c'est là qu'il faut
  regarder, avec une sonde par question comme cette version-là l'a fait.

**Les onze autres sont ci-dessous, par famille.**

## Les dix rouges de `monte.js`, en détail

Portail de référence rejoué seul sur `origin/main` (710ab76), `monte.js` en
20 min 40 s. **Ces dix-là ne viennent d'aucune branche en cours** : ils sont dans
le jeu que la famille utilise. Trois familles, et la troisième est une vraie
régression de fonctionnalité.

**1. La carrure de la voiture, et le piéton — ce que la v279 corrige.**

- « au volant, on s'arrête plus loin du mur qu'à pied » — à pied **8,95** blocs
  du mur contre 1,1 au volant : le témoin butait sur la CIRCULATION, pas sur le
  mur. C'est `contreLeMur` (v279), déjà corrigé sur la branche.
- « une fois descendu, on repasse partout où un piéton passe » — 0,3 contre 8,95,
  même cause.
- « la voiture de l'enfant freine devant un piéton » — `voituresRue: 0`,
  `ecartes: 164`, `traverses: 0`, avance 5,3 : la situation n'a pas eu lieu.

**2. Deux défauts de performance et de physique, à démonter.**

- « l'écran ne se fige pas en arrivant sur une ville » — **pire image 4 633 ms**,
  43,1 % du temps au-delà de 300 ms, cadence 3,8. La branche v279 rend 4 233 ms
  et 46,5 % : la même chose, aux deux bouts. C'est l'arrivée en ville sur un
  rendu logiciel, et ça ne se transpose pas à l'iPad — mais **personne ne l'a
  mesuré sur la tablette** (`?diag=1`), et c'est ce qu'il faut faire.
- « une voiture arrêtée par un mur n'annonce plus de vitesse » — **12,16 contre
  le mur**, reculé 0,55. C'est la correction de la v272 (« on ne borne que ce qui
  est bloqué ») qui ne mord pas dans ce cas-là : le nez contre le mur, la voiture
  garde sa consigne. À reprendre avec la sonde de la v272, pas à l'intuition.

**3. LES FLAMMES DE RÉACTEUR NE SORTENT PLUS — régression de la v264.**

C'était une demande de Max en propre : « voir les flammes sortir du réacteur
quand l'avion se déplace ». Mesuré en production, en VOL (`v: 68,4`) :
`flammes: [{visible: false, long: 0}, {visible: false, long: 0}]` — les deux
tuyères éteintes, pleins gaz comme réduits. Et `gaz: null`, ce qui est normal
depuis la v272 (la manette est un instrument d'avion, la flamme doit alors lire
la vitesse rapportée à la pointe — c'est écrit dans CLAUDE.md). La piste est donc
ce repli-là, et elle se MESURE avant de se corriger.

**4. Deux témoins d'avion qui ne montent pas dans l'avion.** « pas aux commandes
{} » pour 🛞 et pour l'atterrissage manuel, et « à pied, le cadran de cap est
caché » qui rend `affiche: true` à pied. Trois verdicts qui partagent un état :
c'est la famille de la v279 (« dans une suite, la situation de départ d'un témoin
est ce que le témoin d'avant a laissé »). À démonter par une sonde qui dit si
l'embarquement a eu lieu, pas par une hypothèse.

## En cours

- [ ] **LES PASSANTS DE MANHATTAN N'ONT PAS REÇU LA MARCHE AU LONG CAP (v278,
  déclaré en v279).** `passants.js` pose `h.surTrottoir = !site.urbain && …` :
  dans un site URBAIN — New York est le seul — le drapeau reste faux, donc
  `Habitant.promene()` rend faux et les passants y gardent l'ancien programme
  (pause longue, cap au hasard autour d'un poste). Ce n'est pas un oubli
  arbitraire : leur trottoir ne se lit pas dans des blocs mais dans le PLAN
  (`piedPieton`, `ruePietonne`), et l'ancienne branche de `think` sait déjà
  l'interroger. Ce qui manque, c'est de porter la marche au long cap sur cette
  lecture-là. Rien ne le garde aujourd'hui : les deux témoins de la v279
  mesurent la ville que le banc peuple, qui n'est pas Manhattan.

- [ ] **LE RECUL DE LA CAMÉRA N'A ÉTÉ JUGÉ QUE SUR LE BANC (v279).** 6,4 au lieu
  de 5,2, choisi sur trois captures du boulevard Voltaire depuis le même point.
  Max juge sur captures, et il n'a pas encore vu celles-ci ; s'il le trouve trop
  loin ou trop près, c'est une ligne de `montures.js`
  (`poursuite: { recul, hauteur }`, la hauteur suivant la distance à 0,404).
  Les vues de poursuite des AVIONS (18, 22, 13) n'ont pas été touchées : la
  demande portait sur la voiture.

- [ ] **LES CINQ ROUGES DE `manhattan.js` AU PORTAIL DE LA v279 — QUATRE
  MESURÉS SUR `origin/main`, ET LE CINQUIÈME RESTE OUVERT.** Rejoué SEUL des
  deux côtés (`/root/main-ref` détaché sur 710ab76, la branche dans l'arbre
  principal), la règle de la v195.

  | rouge | branche (portail) | `origin/main`, seul |
  | --- | --- | --- |
  | le trou enlève la géométrie visible de la façade | 9 203 → 51 734 | **17 102 → 54 969** |
  | fenêtres et éclairage public la nuit | rouge | **rouge** |
  | les ombres suivent le soleil et la lune | `[1,-1]` | **`[1,-1]`, à l'identique** |
  | le taxi roule avec les contrôles tactiles | rouge | **la suite meurt là** (`#ride-btn` caché, 18 relevés, ligne 416) |
  | les deux clients sans erreur de jeu (`PeerJS: Lost connection`) | rouge | **pas atteint** |

  Les trois premiers étaient DÉJÀ déclarés en v278 contre `d9852ac` ; ils se
  reproduisent ici contre `710ab76`, donc ils sont en production depuis au moins
  la v277 et rien de la v279 ne les cause. Le taxi est NEUF dans la déclaration,
  et c'est `origin/main` qui l'a rendu : le bouton reste caché, ce qui veut dire
  que la voiture invoquée n'est pas à portée d'embarquement — pas que le taxi ne
  roule pas.

  **ET LE PASSAGE SUR LA BRANCHE N'A RIEN PROUVÉ, CE QU'IL FAUT DIRE.** Il est
  mort au bout de QUATORZE verdicts sur `page.waitForFunction` à la ligne 282 —
  le délai que la v269 a déjà nommé, mot pour mot, dans ce même fichier. Ses
  « zéro rouge » ne sont donc pas un vert : la suite n'a jamais atteint les
  témoins de contenu. C'est exactement ce que la v269 décrivait (« la suite
  s'arrêtant plus tôt quand le délai tombe, elle ne les atteint pas toujours »),
  et la conséquence est que **la double mesure de cette suite se fait sur
  plusieurs passages par côté, jamais sur un**. Reste à faire : deux passages de
  plus sur la branche pour voir les trois rouges de contenu s'y reproduire, et
  un passage de `manhattan.js` qui atteigne le témoin PeerJS des deux côtés.

- [ ] **LES CINQ ROUGES DU PORTAIL DE LA v278, MESURÉS UN PAR UN — AUCUN N'EST
  DE LA LIVRAISON.** La PR ayant été fusionnée avant la fin du portail, la
  question n'était plus « faut-il fusionner » mais « ai-je cassé quelque chose
  qui tourne MAINTENANT chez les enfants ». Chaque suite a donc été rejouée
  SEULE, contre `d9852ac` (la v277, avant la fusion) et contre la branche.

  | rouge | seule sur la v277 | seule sur la branche | ce que c'est |
  | --- | --- | --- | --- |
  | `manhattan.js` — trou de façade, fenêtres de nuit, ombres | **les 3 mêmes** (`11684 → 51734`, `[1,-1]`) | — | déjà en production |
  | `maj.js` — fond de carte pas prêt à la libération | **présent** (`carte: false`, `cartePas: 9`, 45,8 s) | — | dette de la v276, toujours ouverte |
  | `maj.js` — badge et journal des nouveautés | vert | vert | **le seul qui était à moi** : `CACHE_VERSION` resté à v277, corrigé en #282 |
  | `washington.js` — le métro (3 témoins) | vert (18 m en 6 s de jeu) | **vert deux fois** | rouge de CHARGE de portail |
  | `carte.js` — un appui long dépose n'importe où | vert | **vert** | rouge de CHARGE, dette de la v258 |
  | `monte.js` — l'écran se fige en arrivant sur une ville | **40,8 % · cadence 4,9** | portail : 39,1 % · 4,4 | même distribution, pré-existant |

  **Et `monte.js` sur la v277 a rendu un rouge que le portail n'a PAS rendu** —
  « un passant lancé sur la voiture de l'enfant s'arrête et la contourne »
  (9 départs, 110 relevés, 0 traversée, 3 qui bougent). Un témoin qui va et
  vient sans qu'une ligne du jeu ait bougé : c'est la famille de la v269, et il
  se démonte en rejouant jusqu'à voir la même DISTRIBUTION des deux côtés, pas
  jusqu'à voir un vert.

  Ce qui reste à faire, par ordre de ce que l'enfant subit : (1) les trois de
  `manhattan.js`, qui sont en production depuis au moins la v277 et que personne
  n'a encore mesurés ; (2) le fond de carte de `maj.js`, dette de la v276 avec
  sa piste déjà écrite ; (3) reformuler les verdicts de `washington.js` (métro)
  et `carte.js` (appui long) pour qu'ils attendent leur RÉSULTAT borné au lieu
  d'une fenêtre fixe — la règle de la v270, qu'ils n'ont toujours pas reçue.


- [ ] **LA VRAIE RANGÉE DEVANT L'AÉROGARE 2 DE ROISSY DEMANDE DE DÉPLACER UN
  DOUBLET DE PISTES (v278).** Les trois appareils de Roissy sont désormais aux
  deux seules poches à ciel ouvert de son tarmac — le couloir entre le tambour
  de l'aérogare 1 et les halls (20 × 16 blocs), et la trouée entre les halls 2C
  et 2E. Partout ailleurs la bande libre fait SEPT blocs, pour une envergure de
  quinze : mesuré sur toute la plate-forme, il n'existe aucun autre carré de
  seize. Une rangée alignée devant l'aérogare 2, comme aux dix-huit autres
  aérodromes, réclame `TARMAC` à 35 au lieu de 25, donc `TAXI_A` et le doublet
  nord poussés d'une dizaine de blocs — et le disque ne fait que 68 de rayon,
  si bien que la piste extérieure tomberait de 83 à 55 blocs. C'est une
  décision de PLAN (agrandir la plate-forme, ou raccourcir une piste), pas un
  réglage, et elle touche un point de repère que Max a validé en capture.

- [ ] **LES QUATRE AVIONS EN BLOCS DU POSTE SUD DE ROISSY NE SONT PLUS À CÔTÉ
  DE RIEN (v278).** Ils avaient été gardés « pour que la plate-forme ne soit
  pas vide vue du ciel » quand les vrais appareils étaient au poste nord. Les
  vrais ont déménagé ; à vérifier en capture aérienne si le décor tient encore
  debout à côté, ou s'il vaut mieux le déplacer.


- [ ] **« LES VOITURES NE SE TRAVERSENT PLUS » TIRE À PILE OU FACE, ET CE QUE LE
  JEU FAIT RESTE INDÉTERMINÉ (v277).** Le témoin compte les chevauchements sur
  trente secondes de MONTRE, un relevé toutes les 200 ms, au centre de Paris.
  Sept mesures, deux arbres, deux résolutions :

  | bras | dpr | chevauchements |
  | --- | --- | --- |
  | portail v276 | 1 | 3 / 499 |
  | branche, rejeu | 1 | **0 / 345** |
  | portail v277 | 1 | sous la barre |
  | branche, monte seule | 1 | **53 / 474** |
  | branche | 0,5 | 48 / 665 |
  | `origin/main` (v276) | 0,5 | 41 / 695 |

  **L'ÉTENDUE À dpr 1 SEUL — 0 À 53 — RECOUVRE LES VALEURS À dpr 0,5**, et la
  barre (45) tombe dedans. J'avais d'abord conclu que la cadence révélait un
  défaut de production, sur UN passage par bras : c'est la règle de la v269
  invoquée sans être suivie. Corrigé dans `CLAUDE.md` et dans le journal.

  **DOUBLE MESURE FAITE CORRECTEMENT (v277) : SIX PASSAGES, TROIS PAR ARBRE, EN
  ORDRE ALTERNÉ, MÊME BANC ET MÊME TÉMOIN DES DEUX CÔTÉS. Tous VERTS.**

  | passage | arbre | chevauchements | paires | taux | relevés |
  | --- | --- | --- | --- | --- | --- |
  | 1 | branche | 37 | 145 | 25,5 % | 146 |
  | 1 | `main` | 0 | 109 | 0 % | 146 |
  | 2 | branche | 1 | 123 | 0,8 % | 146 |
  | 2 | `main` | 0 | 74 | 0 % | 146 |
  | 3 | branche | 3 | 117 | 2,6 % | 146 |
  | 3 | `main` | 2 | 55 | 3,6 % | 146 |

  Le nombre de relevés est STABLE (146 partout) : l'échantillonnage n'est pas en
  cause. Ce qui varie, c'est un compte de coïncidences rares sur une fenêtre
  courte — les deux arbres vont de zéro à des dizaines, et la barre (45) est
  dans la queue de cette loi. Les 48 et 53 vus plus tôt sont des tirages de la
  même distribution, pas un défaut de livraison. **Le témoin ne bloque donc
  pas, et il ne prouve rien non plus.**

  Ce qu'il faut faire, dans cet ordre, et l'ordre a changé :
  1. **Rendre le témoin lisible avant de juger le jeu.** Un compte absolu sur
     une fenêtre de montre, dans une ville à deux ou quatre images par seconde,
     ne peut pas être stable : le dénominateur (le nombre d'observations) doit
     être publié, le verdict devenir un TAUX, et la fenêtre se mesurer en
     CHEMIN parcouru par les convois plutôt qu'en secondes.
  2. **Alors seulement mesurer le jeu**, dix passages par bras, et regarder la
     DISTRIBUTION — pas un passage.
  3. La piste de cause reste plausible et NON mesurée : `cederLePassage` est une
     cadence de ménage à intervalle réel fixe (v226), donc sous-échantillonnée
     quand le monde va vite. La sonde qui distinguerait « sous-échantillonné »
     de « la priorité ne marche pas » lit `etat().places` — le drapeau d'attente
     de chaque voiture (v273) — pendant un chevauchement.
  4. Et `BANC_DPR=0.5` (vingt pour cent de banc) reste éteint tant qu'on ne peut
     pas lire ce qu'il casse : **on n'allume pas un réglage dont on ne peut pas
     mesurer l'effet.**

- [ ] **ROUGES DE CHARGE DU PORTAIL DE LA v277, rejoués SEULS et verts.**
  `sauvegarde.js` 19/19, `carte.js` 95/95, `washington.js` 29/29 — les trois
  étaient rouges au portail et sont verts seuls. `washington.js` : les trois
  témoins du métro (« une rame passe », la pastille de ligne, « 0 m en 40 s de
  jeu »), la famille documentée depuis la v161 — `dt` borné, le monde avance
  moins vite que l'horloge. `carte.js` : l'appui long, la dette de la v258.
  Ce qui est NEUF et qui vaut d'être noté : **le verdict du portail dépend du
  nombre de suites qui ont réellement tourné avant**, et le cache de reprise
  masque exactement cela — au portail de la v276, treize suites sur quinze
  étaient reprises.

- [ ] **LE BANC EST TROP LOURD, TROP LONG, TROP COÛTEUX, TROP PÉNIBLE — Max,
  v276.** Refonte à faire AVANT la suite du design. Mesuré sur le portail de la
  v276, suite par suite : **61 minutes, dont 34 dans DEUX fichiers.**

  | | durée | témoins | pages de jeu | boucles de relevé |
  | --- | --- | --- | --- | --- |
  | `monte.js` | 18 min | 141 | **7** | 46 |
  | `reseau.js` | 16 min | 73 | **16** | — |
  | les treize autres | 27 min | ~550 | ~14 | — |

  **Les deux causes ne sont pas les mêmes, ce qui interdit un remède unique.**
  `monte.js` n'ouvre que sept pages pour dix-huit minutes : le temps est dans
  l'attente qu'un jeu à quatre images par seconde parcoure une distance.
  `reseau.js` ouvre seize pages pour seize minutes, jusqu'à trois vivantes en
  même temps (la v220 a mesuré qu'une seconde page fait tomber la cadence de
  42,9 à 20,8) : le temps est dans l'ouverture.

  Trois leviers, chacun à mesurer AVANT d'y toucher (ce dépôt a déjà payé
  quatre fois pour avoir expliqué une lenteur sans l'instrumenter, v224) :

  1. **`?tempo=`** — la cadence de banc sur les ~20 minuteries du jeu, dette
     déjà déclarée plus bas avec la liste de ce qui ne doit JAMAIS passer sous
     tempo (l'horloge scolaire, `chronoReel`, la borne de `dt`, les débits que
     `monte.js` mesure). Deuxième poste mesuré : 8 à 12 minutes.
  2. **Mutualiser les pages de `reseau.js`** : un hôte ouvert une fois pour
     plusieurs scénarios au lieu d'un couple par témoin.
  3. **La passe sur les verdicts en fenêtre FIXE** (règle de la v270, jamais
     appliquée en entier). C'est elle qui supprime la BOUCLE rouge → rejeu seul
     → rejeu sur `origin/main` → portail complet, qui a coûté **cinq portails**
     en v276. **La douleur est dans la boucle, pas dans les minutes** — et
     l'exemple du jour est le témoin du gel à l'arrivée sur une ville, rouge à
     chaque portail depuis la v259 et franchi par les DEUX arbres : une barre
     que personne ne peut tenir ne protège rien, elle coûte.

  Ce qu'on ne touche pas : `plafond.js`, `sauvegarde.js` et les suites qui
  gardent les mondes des enfants — 2 min 40 s à elles toutes, elles ne sont pas
  le problème.

  Et une méthode qui a marché le jour même, à garder : **devant un verdict en
  durée, on extrait le témoin dans une sonde** (`scratchpad/sonde-ville.cjs`)
  plutôt que de rejouer la suite. Huit relevés des deux côtés en six minutes,
  contre quatre-vingts minutes de rejeux.

- [ ] **LA PRÉPARATION DE L'ACCUEIL TIENT SUR LE BORD DE SA PROPRE BORNE
  (v276).** Le bouton « Jouer » est grisé jusqu'à ce que tout soit prêt, borné à
  quarante-cinq secondes (v258). Sur ce banc, dans les conditions du témoin de
  `maj.js` — une page laissée ouverte sur l'accueil qui télécharge les 4,67 Mo du
  scanner de visages, et une seconde page qui prépare —, la préparation met
  **42,9 · 43,8 · 45,2 s** (trois passages, tout complet chaque fois : 25/25
  programmes, corps, fond de carte). `origin/main` (v275) mesurait 36,9 s. La
  marge est donc de zéro à deux secondes, et le témoin battra sur une machine
  plus lente.

  Ce qui a déjà été mesuré et corrigé dans la v276 : le flou du verre prenait la
  MOITIÉ des images de l'accueil (suspendu pendant la préparation, 8/25 → 25/25
  programmes), et la chauffe compilait une signature par IMAGE au lieu d'un
  budget de temps (16/25 → 25/25). Ce qui a été mesuré INNOCENT : la dérive de
  l'aurore et les deux calques plein écran (trois designs, aucun signal), et la
  parure en jeu (six relevés, 0 à 1,2 % d'images au-delà de 150 ms des deux
  côtés).

  Ce qui reste ouvert : les six secondes d'écart avec `origin/main` ne sont
  attribuées à rien. Une piste NON mesurée, et il faut le dire : `#prep-line`
  est réécrite toutes les 250 ms pendant la préparation, ce qui invalide la
  peinture de `#overlay` — donc les trois dégradés radiaux de `::before` et le
  SVG de méridiens de `::after`, à `background-size: 128vmax`. Mes mesures des
  calques ont toutes été faites sur une page SANS préparation, où rien ne
  réécrit : **elles ne pouvaient pas voir ce coût-là** (piège de la sonde
  aveugle, v273). Le test qui trancherait : reproduire les conditions du témoin
  (une page qui télécharge le scanner + une page qui prépare) et comparer
  `depuis` avec et sans `?verre=0`.

- [ ] **LES PASSANTS SE FIGENT ENCORE DEVANT L'ENFANT (Max, après v276).**
  « Les passants qui s'arrêtent et qui nous regardent de manière figée, ça ne
  fonctionne pas. Je vois quelque chose de très naturel, comme dans GTA. »

  La v243 a retiré l'arrêt social de `Habitant.think` (vie.js) et
  `Wanderer.think` (marlon.js) — et le symptôme revient. **Devant un symptôme
  qui revient après une correction juste, on cesse de régler et l'on va voir ce
  qui s'exécute** (v226). Une ligne trouvée, qui n'est PAS celle que la v243 a
  corrigée :

  ```
  marlon.js:324   if (this.player.gabarit > 1 && dist < 5) return { speed: 0, yaw: this.yaw };
  ```

  Écrite pour une bonne raison (« on ne vient pas se coller à une voiture »),
  elle rend `speed: 0` ET garde le yaw : le personnage s'arrête net et reste
  planté. C'est une piste, pas le diagnostic — **la première chose à faire est
  une sonde qui sépare les cas** (v218) : combien de passants sont à l'arrêt,
  lesquels ont `speed: 0` par cette ligne, lesquels par autre chose, et
  combien regardent l'enfant. Compter « des gens figés » d'un seul nombre ne
  se démontera pas.

  Ce que « naturel comme dans GTA » veut dire, à préciser en mesurant : un
  passant qui CONTOURNE au lieu de s'arrêter, qui garde sa vitesse, et qui ne
  tourne pas la tête vers l'enfant.

- [ ] **À PIED, ON TRAVERSE LES VOITURES (Max, après v276).** « Quand on joue
  avec le jeu, on ne devrait pas être capable de pouvoir marcher à travers une
  voiture. »

  La cause est nommée, et c'est une garde trop étroite :

  ```
  player.js:613   if (this.gabarit > 1 && !this.pilote && this.obstacleVehicule && …)
  ```

  `gabarit > 1` veut dire « je conduis ». À pied le gabarit vaut 1, donc le
  crochet qui empêche d'entrer dans une voiture n'est jamais consulté : la
  boîte du joueur ne connaît que les blocs solides, et une voiture n'en est
  pas un. C'est la v259 vue de l'autre bout — elle a appris aux PIÉTONS à ne
  pas traverser la voiture de l'enfant, jamais à l'enfant de ne pas traverser
  les leurs.

  Deux choses à ne pas casser en le corrigeant : **« pas si l'on est déjà
  dedans »** (v252, jugé par FAMILLE), sinon un enfant qu'une voiture vient de
  recouvrir reste cloué sur place ; et le rayon d'embarquement de neuf blocs
  (v201), qui suppose qu'on peut s'approcher d'une voiture pour y monter — une
  collision trop large rendrait certaines voitures impossibles à prendre. Le
  témoin mesure ce que l'enfant obtient : marcher droit sur une voiture garée,
  et s'arrêter devant au lieu de ressortir de l'autre côté.

- [ ] **LA VUE EN VOITURE EST TROP SERRÉE, ET ELLE NE MONTRE PAS LE VIRAGE
  (Max, après v276).** « La vue de la voiture, je la trouve pas très cool. Il
  faudrait la zoomer out un petit peu et faire comme dans GTA : quand la
  voiture tourne, on voit vraiment la voiture qui tourne, on voit le flanc de
  la voiture sur le côté. »

  La vue de poursuite EXISTE déjà (`poursuite` dans la fiche, montures.js,
  décidée par Max après deux essais de vue intérieure) — elle est seulement
  trop près et trop rigide :

  ```
  montures.js   voiture … poursuite: { recul: 5.2, hauteur: 2.1 }
  fun.js:1293   if (a.def.poursuite) { … cos(player.yaw), sin(player.yaw) … }
  ```

  Deux défauts distincts, et le second est le vrai sujet. **Le recul** se
  règle dans la fiche, comme pour les avions (13, 18, 22 selon l'appareil) :
  c'est un chiffre, il se mesure sur captures. **La rigidité** est
  structurelle : la caméra lit `player.yaw` à l'image même, donc elle tourne
  EXACTEMENT avec la voiture et l'on ne voit jamais le flanc. Il lui faut un
  cap PROPRE qui rattrape celui du véhicule avec du retard — c'est ce retard,
  et lui seul, qui fait qu'on voit la voiture s'inscrire dans son virage.

  Deux pièges connus du dépôt à reprendre ici : le retard se compte en TEMPS
  RÉEL et non en `dt` (v226), sinon la caméra traîne deux fois plus sur une
  tablette qui rame ; et **un signe se regarde, il ne se déduit pas** (v231,
  v249) — une caméra qui retarde du mauvais côté montre le flanc opposé au
  virage, et aucune mesure d'amplitude ne l'en distingue. Deux captures, un
  virage à gauche et un à droite, AVANT d'écrire le témoin.


- [ ] **LE TÉMOIN DES REDÉMARRAGES AU VERT COMPTE UN INSTANT, PAS UN
  ÉVÉNEMENT (v275).** « Et la circulation s'arrête au feu rouge, puis repart
  au vert » (`carteMonde.js`) exige `redemarrages >= 1`. Or il ne compte un
  redémarrage que si la MÊME voiture est relevée sur deux échantillons
  CONSÉCUTIFS de 500 ms — l'un pendant qu'elle attend, l'autre après le
  passage au vert — **et qu'elle est encore dans la fenêtre de 2 à 7 blocs
  devant le feu au second**. Or une voiture qui repart en sort : c'est
  exactement le cas qu'on veut voir qui échappe à la mesure. Le compte est
  donc un tirage, et il tombe à zéro dès que la cadence du banc baisse.

  Mesuré, la suite rejouée SEULE trois fois de chaque côté (la livraison v275
  ne touche ni `feux.js`, ni `vehicules.js`, ni `main.js` sur ce chemin) :

  | | branche | `origin/main` |
  | --- | --- | --- |
  | redémarrages | 2 · 5 · 3 | 4 · 4 · 2 |
  | voitures relevées | 1 448 · 1 451 · 1 461 | 1 466 · 1 445 · 1 439 |
  | arrêtées au rouge | 170 · 175 · 137 | 151 · 154 · 169 |

  Même distribution, même moyenne (3,3 des deux côtés). Au portail complet,
  sous charge, il a rendu **0** — et 193 arrêts au rouge, donc le mécanisme
  du jeu marche. C'est le banc que le témoin mesure.

  **Le remède n'est pas de baisser la borne à zéro** (elle ne prouverait plus
  rien) **ni de rejouer jusqu'au vert.** C'est de compter l'ÉVÉNEMENT au lieu
  de l'instant : retenir, par voiture, qu'elle a attendu devant un feu non
  vert, et compter le redémarrage la première fois qu'on la revoit sans son
  drapeau d'attente — qu'elle soit encore devant le feu ou non. `auRouge >= 10`
  reste la borne qui garde le fond. À faire en v276, et à éprouver en
  désarmant l'arrêt aux feux dans une copie de `src` (la vérification se FAIT,
  elle ne se raconte pas).


- [ ] **TROIS FEUX DE PARIS SONT SOUS L'EMPRISE D'UN MONUMENT (v274).** Les
  repères (`LANDMARKS`, world.js) se posent APRÈS les colonnes et écrivent
  leurs propres blocs : un feu planté là y survit, DEDANS, et la rue que
  `solParis` promettait à côté de lui est recouverte de pierre. Mesuré : sur le
  disque entier de Paris, **88 feux au coin d'un carrefour sur 91 (97 %)** ;
  les trois autres sont tous dans l'emprise de la Caserne & Commissariat
  (box 46), avec du `STONEBRICK` sur leurs quatre voisins. Londres est à 116
  sur 117. **Et le garde évident est un non-résultat MESURÉ** : écarter tout
  candidat dont la colonne tombe dans une `box` de repère fait tomber Paris ET
  Londres à ZÉRO feu — la `box` est une zone d'interdiction de BÂTIR, bien plus
  large que ce que le repère pave, et au centre de ces deux villes leur union
  couvre tout. Écrit, mesuré, retiré. La vraie question est ailleurs : un
  carrefour d'avenues que la Caserne recouvre est un conflit de PLAN, de la
  même famille que « les voitures traversent un monument » (v221) — c'est le
  monument ou l'avenue qu'il faut déplacer, pas le feu qu'il faut cacher.

- [ ] **Quatre témoins de `manhattan.js` sont rouges EN PRODUCTION (double mesure
  de la v272).** Rejoués SEULS des deux côtés, dans deux arbres séparés :

  | témoin | sur la branche | sur `origin/main` |
  | --- | --- | --- |
  | le trou enlève aussi la géométrie visible de la façade | 22 326 → 51 734 | 14 460 → 51 734 |
  | fenêtres et éclairage public fonctionnent la nuit | rouge | rouge |
  | les ombres suivent le soleil et la lune visibles | [1, −1] | [1, −1] |
  | le taxi roule avec les contrôles tactiles | rouge | rouge |

  `origin/main` en rend même DEUX de plus (New York partage blocs et code,
  et une perte de connexion PeerJS). Aucune ligne du domaine de Manhattan n'a
  bougé en v272 : ces quatre-là sont une dette déclarée, pas une régression. Et
  ce sont exactement ceux que la v259 a nommés : à **0,4 image par seconde** sur
  ce banc, un témoin qui lit un effet « 350 ms après » est un pile ou face. La
  piste est donc la même que pour le reste du banc — provoquer la situation au
  lieu de l'attendre — et elle vaut un chantier à part.

- [ ] **`washington.js` : « on entre chez les gens » ne rougit qu'en charge.**
  Rouge au portail de la v272 (« façade 0,1, plafond à −1, 1 mur(s) »), **vert
  rejoué SEUL sur la branche ET sur `origin/main`** (29 témoins verts des deux
  côtés). C'est la famille que le fichier documente déjà : le témoin marche par
  pas de 700 ms et `dt` est borné à un vingtième, donc sous quatre images par
  seconde huit pas ne font plus quatre blocs. Il abandonne après trois pas sans
  mouvement ; sous la charge d'un portail entier, trois pas consécutifs peuvent
  tomber dans des hoquets. À reprendre comme les autres : on attend le
  RÉSULTAT (être entré), borné, jamais un nombre de pas.

- [ ] **Le compteur de vitesse d'une voiture (v272) — retiré, pas remplacé.**
  Max : « la jauge de vitesse, je ne veux pas qu'elle soit existante pour une
  voiture ». La manette et le compteur sont devenus des instruments d'avion, et
  une voiture n'affiche donc plus rien. Si l'on veut un jour lui rendre un
  chiffre, il faut d'abord décider ce qu'il dit : **un bloc ne vaut un mètre
  nulle part dans ce jeu** — trente à quarante au sol dans une ville — et
  `v × 3,6` mentait déjà dans le sens qui rapetisse tout (v267). La piste est
  celle de l'avion : une croisière déclarée dans la fiche (`ALLURES`,
  vehicules.js) et l'affichage en prend la fraction de l'allure atteinte. Rien
  à faire tant que Max ne le redemande pas.

- [ ] **La physique d'un choc de voiture reste un arrêt net (v272).** La
  vitesse se borne désormais au déplacement RÉEL, ce qui règle le compteur, le
  régime du moteur et les roues qui tournaient dans le vide. Ce n'est pas un
  choc : pas de rebond, pas de dégât, pas de secousse de caméra. C'est la
  tâche #38 de la session (« dégâts visibles sur les voitures et choc naturel
  entre voitures »), et le clamp est le socle sur lequel elle se posera.


- [ ] **« La reprise tient dans la durée » (`reseau.js`) — ROUGE SEULE DES
  DEUX CÔTÉS le soir de la v260, verte seule des deux côtés le matin de la
  v259.** FAIT le soir de la v261 : `reseau.js` rejouée SEULE sur un arbre
  v258 (`/root/v258`, `7c9163c`) le même soir, 71 témoins VERTS dont
  celle-ci (« hôte 2 · Alice 2 », `scratchpad/v260/reseau-seule-v258.log`),
  cinq minutes après le rouge sur `origin/main` en v259. Puis deux sondes
  qui rejouent CE scénario seul (`scratchpad/v261/sonde-reprise*.cjs`) :
  la courte (hôte, Alice, sommeil, Alice revenue) et la longue (trio, Nina
  part, Alice dort 26 s et se réveille, se rendort, revient) — VERTES sur
  la branche ET sur v258, avec le journal des retraits côté hôte : après
  la présentation d'Alice revenue, l'ancienne page se rebranche huit à dix
  fois en quatre secondes (`remplace` + fermeture à 400 ms, chemins
  `_evinces` et « présentation d'un fantôme »), puis se tait ; Alice
  revenue n'est jamais retirée. La panne a donc besoin du contexte de la
  suite (les scénarios de véhicules et de météo entre les deux, trois
  pages ouvertes plus longtemps) et n'est PAS prouvée introduite par la
  v259 — un rouge de suite contre un vert de sonde, sur le même code. Le
  témoin imprime désormais les retraits de l'hôte quand il rougit : le
  prochain rouge de portail dira qui a retiré Alice, quand, par quel
  chemin. ET IL L'A DIT, au portail de la v261 (`scratchpad/v261/portail-v261.log`,
  l. 618) : `{"dt":20114,"id":"d629c7","nom":"Alice","pret":true,"seen":20142,
  "quoi":"drop","pile":"net.js:1014"}` — c'est le DÉLAI DE SILENCE (`STALE_MS`,
  vingt secondes) : la présentation d'Alice revenue est arrivée (`pret`, son
  nom), puis PLUS AUCUN message d'elle n'a atteint l'hôte en vingt secondes
  (`seen` jamais rafraîchi après la présentation), alors qu'elle recevait
  ceux de l'hôte (elle voit Marlon, compteur 2). Ce n'est ni un `remplace`,
  ni un fantôme, ni un lien fermé. Et le MÊME symptôme ouvre cette suite au
  portail : « à trois, chacun voit les deux autres » rouge —
  `[["Alice"],["Marlon"],["Alice","Marlon"]]` — l'hôte ne reçoit rien de
  Nina, qui reçoit tout. Sous charge (trois pages, une image par seconde),
  un invité neuf est donc entendu une fois (sa présentation) puis plus
  jamais, tout en entendant l'hôte. Pistes, dans l'ordre : (1) l'invité
  envoie `pos` par `envoyer(c)` sur `c.conn`, la case de l'hôte — si la
  patience de cinq secondes a expiré et fait basculer sur le nuage, puis que
  le direct s'est ouvert (`promouvoirSiDirect`), la présentation et les
  positions ne partent pas forcément par le même chemin ; l'hôte, lui, peut
  tenir une case DIRECTE présentée et ne plus rien recevoir dessus si
  l'invité écrit sur un autre lien ; (2) `conn.open` vrai côté hôte et faux
  côté invité sur le même canal. La sonde à écrire journalise, chez
  l'invité, par QUEL lien partent la présentation et chaque `pos`
  (`conn.peer`, `parNuage`, `open`, `dataChannel.readyState`) et, chez
  l'hôte, chaque lien reçu par pair — et elle provoque la lenteur (bridage
  ×4 ou deux pages de plus) au lieu de l'attendre. Vert seule, rouge sous
  charge : c'est un rouge de production possible sur un Wi-Fi lent, pas
  seulement un rouge de banc. À la v260 : rouge aux deux portails (dont « à trois, chacun voit
  les deux autres » une fois), puis rejouée SEULE : rouge sur la branche
  (69 verts) ET rouge sur `origin/main` en v259 (69 verts), « hôte 1 ·
  Alice 2 » les deux fois. Le matin, seule sur `origin/main` en v258 et sur
  la branche v259 : verte. Deux lectures possibles — le banc, ou la v259
  fusionnée entre les deux (rien de réseau dans son diff, mais un rouge
  qui suit une fusion se vérifie) : rejouer `reseau.js` seule sur un arbre
  v258 (`7c9163c`, `git worktree`) le même jour tranche. À FAIRE EN
  PREMIER — c'est du réseau, et l'hôte qui ne voit plus qu'un joueur est
  ce qu'un enfant vit comme « il a disparu ».
- [ ] **(historique v259) « La reprise tient dans la durée » rouge au portail
  complet, verte seule des deux côtés (v259).** Deux portails de suite sur
  la branche : « hôte 1 · Alice 2 » (l'hôte ne voit plus qu'un joueur
  vingt-cinq secondes après le retour d'Alice sur la même tablette). Rejouée
  SEULE : verte sur `origin/main` (v258) ET sur la branche, « hôte 2 ·
  Alice 2 », 71 témoins des deux côtés (`scratchpad/v259/reseau-suite-*.log`).
  Le code réseau n'a pas bougé en v259. C'est la famille des rouges de
  portail de la v220 : une suite verte seule est un fait plus fort qu'un
  rouge derrière dix suites. Cause ouverte ; piste : ce témoin arrive
  derrière `monte.js` et `manhattan.js` et lit un compteur de pairs à
  vingt-cinq secondes fixes — mesurer ce qui distingue l'hôte au portail
  (charge stable à 3,7 cœurs pendant toute la suite) de l'hôte seul.
- [x] **UN TROISIÈME JOUEUR N'EST PAS VU DES DEUX AUTRES — mesuré des deux
  côtés (v264).** TROUVÉ ET CORRIGÉ en v266. La cause n'était ni le lien, ni
  la veille : **le fil principal du nouvel arrivant est bloqué vingt-neuf
  secondes dans une SEULE tâche** pendant que son monde se charge (pas médian
  de son minuteur de 100 ms : 100 ms ; pire tour : 29 128 ms). Il n'émet rien,
  ne reçoit rien, et l'hôte le retire à 22 s de silence — lien `open`, canal
  `open`. La règle des vingt secondes avait été écrite pour les pairs RELAYÉS
  et s'appliquait à tout le monde ; elle ne juge plus que ceux qu'on ne peut
  pas sonder, et l'hôte annonce `dodo_de` à la moitié du délai pour que
  l'autre invité ne conclue pas avant lui. Témoin neuf qui GÈLE la page du
  troisième joueur vingt-cinq secondes : rouge sur `origin/main`, vert deux
  fois de suite ici. Sondes : `scratchpad/v266/sonde-trio.cjs`,
  `sonde-veille.cjs`, `sonde-famine.cjs`, `sonde-gel.cjs`.
  Le texte d'origine : « À trois, chacun voit les deux autres » (`reseau.js`) rend
  exactement `[["Alice"],["Marlon"],["Alice","Marlon"]]` et le compteur
  `2/2/3` : **Nina voit l'hôte et Alice, mais ni l'hôte ni Alice ne la
  voient.** Elle arrive, elle reçoit, et ce qu'elle émet ne parvient à
  personne — ou l'hôte ne la relaie pas. Les invités ne sont pas reliés entre
  eux : leurs positions transitent par l'hôte, et c'est ce chemin-là qui
  lâche pour le SECOND invité.
  Mesuré, la suite rejouée SEULE dans les deux arbres : branche trois tours,
  rouge trois fois ; `origin/main` deux tours, un vert (93 s) puis un rouge
  aux MÊMES valeurs (104 s). REMESURÉ en v265, toujours SEULE des deux
  côtés : `origin/main` un vert puis un rouge (116 s, mêmes valeurs au
  caractère près), branche un vert puis un rouge (121 s). Il va et vient sur
  les DEUX arbres, à la même fréquence. Ce n'est donc pas la livraison en
  cours — c'est en production, et cela touche Marlon, Alice et un ami. À reprendre en
  propre : une sonde qui distingue les cas plutôt qu'une hypothèse — Nina
  est-elle inscrite chez l'hôte, ses messages arrivent-ils, l'hôte les
  relaie-t-il ? — et non le témoin qu'on rejoue.
- [ ] **Le programme de la flamme se compile au DÉCOLLAGE (v264).** Les deux
  cônes additifs de `flamme()` (avions.js) naissent invisibles : three ne
  compile leur programme qu'à la première image où ils sont RENDUS, c'est-à-
  dire quand l'enfant appuie sur ✈️. Un seul programme, mais c'est une
  compilation dans l'image d'un geste — la famille du gel de la v246. Le
  remède est celui de la maison : chauffer cette signature à l'accueil
  (`chaufferLesProgrammes`, vehicules.js) comme les quatorze de la flotte.
  À faire dans la livraison qui touchera déjà aux avions, avec la mesure de
  `renderer.info.programs` avant et après le premier décollage.
- [x] **LES BORNES DE GARDE DE `monte.js` SONT POSÉES SUR UNE MACHINE PLUS
  RAPIDE QUE CELLE-CI (v264).** FAIT en v265, en une passe sur le fichier :
  relevés de virage 250 → 100 (tombée à 92 puis 203, toujours ZÉRO saut),
  blocs parcourus en vol 100 → 40 (tombée à 66 en v264, 90 en v265, le
  verdict vert des deux côtés), images du gel de Paris 60 → 30 (tombée à 56
  pendant que le verdict tombait pour sa propre raison ; trente est la valeur
  que `programmes.images` emploie déjà pour dire « la boucle de rendu vit »).
  Reste « une poule ne propose pas de monter dessus », qui va et vient sur le
  même code — verte au portail de la v265 et sur `origin/main` seule, rouge
  au portail précédent et sur la branche seule : c'est une lecture de bouton
  600 ms après la pose, à remplacer par une attente bornée.
  Le texte d'origine : Après le redémarrage du conteneur, la cadence
  du banc est tombée de 5,4 à 4,4 images par seconde au même endroit, et deux
  témoins de `monte.js` ont rougi sur la BRANCHE en ne mesurant rien : « elles
  tournent progressivement » exige 250 relevés et n'en a eu que 73 — avec ZÉRO
  saut, donc le comportement est bon — et « une poule ne propose pas de monter
  dessus » lit le bouton 600 ms après la pose. Les deux sont verts au tour
  d'avant sur le même code, et verts sur `origin/main`. C'est le piège déjà
  écrit trois fois : une borne de garde se pose à la MOITIÉ de ce qu'une
  machine qui respire a rendu, jamais juste en dessous. À reprendre en une
  passe sur TOUTES les bornes du fichier, comme la v237 l'a fait.
- [ ] **UNE FILE DE MAILLEUR AU-DELÀ DU GENOU FAIT ROUGIR LE PORTAIL ENTIER
  (v265) — mesure faite, à rejouer le jour où l'installation d'une géométrie
  changera de prix.** Posée à quarante-huit sur le seul DÉBIT, elle a rendu
  SEPT suites rouges dont QUATRE vertes la veille, toutes de cadence.
  Ramenée au genou mesuré (seize), le portail retombe aux rouges de fond.
  Le chiffre à remesurer est le couple (débit de pointe, images par
  seconde) — sonde `scratchpad/v265/sonde-genou.cjs`, `?attente=` le règle.
  Le vrai remède, si l'on veut aller plus loin : BORNER l'installation des
  géométries sur le fil principal comme le maillage l'est déjà
  (`MESH_MS_PAR_SECONDE`), au lieu d'installer tout ce qui arrive dans
  l'image où il arrive. Non fait, non mesuré.
- [ ] **LA FILE DU MAILLEUR EST REVENUE À HUIT (v269) — ET LE VRAI REMÈDE
  RESTE À TROUVER.** Seize rendait le jeu impraticable sur l'iPad de Max
  (mesuré au-dessus de Paris à rr=12 : 9,1 images par seconde contre 18,3, et
  3,1 % du temps en images de plus de trois cents millisecondes). Le prix du
  retour est réel et se voit : le trou devant soi tombe de 132 à 66 blocs,
  donc les bâtiments se dessinent plus tard — la panne que la v251 avait
  corrigée. Ce qu'on VOUDRAIT, c'est le trou de seize avec la fluidité de
  huit, et DEUX pistes ont été écrites, mesurées et RETIRÉES ; on ne les
  réessaie pas :
  (a) borner la pose des géométries par image — 10,63 images/s contre 10,20,
  du bruit, parce que borner le travail par IMAGE ne réduit pas le travail
  par SECONDE ;
  (b) faire de la file un TEMPS — le coût d'un morceau ne sépare pas la ville
  de la campagne en vol (4,4-12,2 ms contre 3,4-8,3), la file part à son
  plafond partout et rend 6,0 images/s, pire que seize.
  **La prochaine étape est une MESURE SUR LA TABLETTE, pas sur ce banc** :
  `?attente=4|8|12|16` avec `?diag=1`, en vol au-dessus de Paris et en
  campagne, parce que le rapport entre maillage, installation et rendu n'est
  pas celui d'un rendu logiciel — c'est la règle de la v245, et c'est
  précisément ce qui a fait choisir seize à tort. Le vrai suspect restant est
  l'INSTALLATION d'une géométrie (upload au pilote), que SwiftShader ne
  modélise pas comme un vrai GPU.

- [x] **LE PLATEAU DE VITESSE DES AVIONS A ÉTÉ MESURÉ SUR UNE FILE QUI
  N'EXISTE PLUS — REMESURÉ ET CORRIGÉ DANS LA MÊME LIVRAISON (v269).** La
  v265 avait porté les avions de 110 à 160 blocs par seconde sur une file de
  seize ; la file revenue à huit, 160 ne tient plus. Ce n'est pas resté une
  dette : **le témoin du trou de `monte.js` l'a rendu rouge au portail**
  (51 et 58 pour une barre de 80), et une dette qu'un témoin rougit n'est
  pas une dette, c'est une régression. Remesuré au même critère, file de
  huit, seul : 95 → 115 · 110 → 112 · 120 → 93 · 130 → 80 · 145 → 80 ·
  160 → 64. Retenu 95 (avion de ligne) et 120 (Concorde, chasseur) ; le
  portail complet coûte quinze pour cent du trou, ce qui écarte 130 (trois
  blocs de marge). `kmh` est intact : le compteur affiche toujours Mach 1,8.
  Et la barre du témoin se CALCULE désormais (`max / 2` par appareil), au
  lieu des quatre-vingts écrits en dur depuis la v229.

- [ ] **LE MÉTRO DE WASHINGTON NE PASSE PLUS EN STATION — DÉFAUT DE
  PRODUCTION, MESURÉ DES DEUX CÔTÉS (v270).** « Une rame passe, et on propose
  de monter dedans » (`{"existe":true,"visible":false}`), « la pastille dit de
  quelle ligne il s'agit » (🚇 au lieu de 🔵) et « le métro nous emmène à la
  station suivante » (Smithsonian → Smithsonian, 0 m) tombent aux portails des
  v268, v269 et v270.

  **Rejoués SEULS des deux côtés, deux passages chacun — rouges 4 fois sur 4,
  avec les MÊMES valeurs :**

  | passage | `origin/main` (v269) | branche (v270) |
  | --- | --- | --- |
  | seule, 1 | 3 échecs, 0 m en 36 s | 3 échecs, 0 m en 34 s |
  | seule, 2 | 3 échecs, 0 m en 33 s | 3 échecs, 0 m en 34 s |

  Donc EN PRODUCTION, et pas de la livraison en cours. **Et la supposition
  « verts rejoués seuls » était FAUSSE** : elle venait d'un relevé de la v256
  (rame visible, pastille 🔵, Smithsonian → Federal Triangle, 17 m en 6 s),
  donc d'un autre code. Une mesure vieille de quatorze versions n'est pas une
  mesure de l'état d'aujourd'hui — c'est exactement le reproche qu'on fait à
  un témoin qui ne peut pas voir un changement.

  Ce n'est donc PAS de la charge de banc : la rame n'arrive vraiment plus au
  quai de Smithsonian. Ce qui a changé entre la v256 et la v268 est à
  chercher ; pistes, dans l'ordre : le nombre de rames par ligne et leur
  cadence (v222 : « le tour divisé par la demi-minute »), la portée
  souterraine (`VU_SOUTERRAIN`, quarante blocs) contre la position du quai, et
  le fait que la boucle du témoin attende trente-six secondes de JEU quand le
  banc tourne à trois images par seconde. La sonde à écrire est celle qui
  DISTINGUE les trois : où est la rame la plus proche, à quelle distance du
  quai, et avance-t-elle.

- [ ] **LES SIX VILLES BÂTIES À LA MAIN N'ONT PAS ÉTÉ ÉLARGIES (v271).** Paris,
  Londres, Nice, Lille, Washington et San Francisco gardent leurs largeurs de
  chaussée relevées sur de vrais plans, par quartier (`rue`, `face` dans chaque
  fiche) : la v271 n'a élargi que la trame des villes ENGENDRÉES. Leurs
  circuits sont des polylignes, pas des rectangles, donc la conduite à droite y
  demande un décalage de polyligne et une remesure des huit à dix-neuf circuits
  par ville (`circuitSurRue`, l'angle des virages, la contrainte de partage).
  C'est la livraison suivante, et le piège est nommé : **une largeur ne se
  projette pas, elle se relève** (v187).

- [ ] **IL RESTE DES ANNEAUX QUI SE PARTAGENT DIX-HUIT BLOCS (v270).** La
  contrainte de la v211 est désormais appliquée aux villes engendrées : 265
  villes en faute deviennent 0, le pire partage tombe de 576 blocs (Shanghai)
  à 18 (São Paulo). Dix-huit, c'est SOUS la barre d'un carrefour, donc ce
  n'est pas un défaut — mais c'est la limite, et deux voitures peuvent s'y
  croiser de près. Le remède, s'il en faut un, n'est pas de serrer la barre
  (mesuré : à 12, le nombre d'anneaux ne bouge pas, les candidats partagent
  beaucoup ou presque rien) mais de donner à ces villes des tracés qui ne
  soient pas des rectangles — ce qui est le même chantier que « de vraies
  rues partout, à deux voies ».

- [ ] **LE JEU DE CANDIDATS ÉLARGI POUR LES ANNEAUX : NON-RÉSULTAT MESURÉ
  (v270).** Sept fois plus de candidats (quatorze tailles au lieu de sept,
  vingt-cinq décalages au lieu de neuf, sept formes au lieu de trois) ne
  rendent que 17 anneaux sur les 298 que la contrainte de partage retire.
  « Le prix se paie avec des rues » (v216) ne marche pas sur une trame
  rectangulaire : il n'y a pas assez de places distinctes. Écrit, mesuré,
  retiré — qu'on ne le réécrive pas.

- [ ] **`manhattan.js` : QUATRE ROUGES, TOUS MESURÉS IDENTIQUES SUR
  `origin/main` (v269).** Le portail de la v269 a rendu quatre échecs :
  « le trou enlève aussi la géométrie visible de la façade » (9 203 →
  51 734), « fenêtres et éclairage public fonctionnent la nuit », « les
  ombres suivent le soleil et la lune visibles » (`[1, -1]`), et un délai sur
  `#ride-btn` (ligne 416). Rejouée SEULE des deux côtés, cinq passages :

  | passage | `origin/main` (v267) | branche (v269) |
  | --- | --- | --- |
  | au portail | — | 4 échecs : les 3 nommés + `:416` |
  | seule, 1 | 4 échecs : les 3 nommés + `:416` | délai `:282` |
  | seule, 2 | 5 échecs : les 3 nommés + taxi tactile + PeerJS | délai `:282` |
  | seule, 3 | délai `:282` | — |

  Les trois témoins nommés sont rouges à l'identique sur `origin/main` chaque
  fois qu'ils sont ATTEINTS (3 fois sur 3), avec les mêmes valeurs — donc en
  production. Et le délai de la ligne 282 (la file de construction de
  Manhattan qui ne se vide pas en soixante secondes) tombe DES DEUX CÔTÉS :
  deux fois sur deux sur la branche, une fois sur trois sur `origin/main`.
  **v276, quatre passages de plus, alternés** (branche, main, main, branche) :
  délai `:282` sur la branche 2/2 et sur `origin/main` 1/2 ; le passage de
  `origin/main` qui a FRANCHI la ligne 282 a rendu les mêmes quatre rouges de
  contenu, aux valeurs exactes de la v269 — `14 460 → 51 734`, les fenêtres de
  nuit, `[1, -1]`, le taxi tactile — plus le délai de `#ride-btn`. La v276 n'a
  pas touché une ligne de Manhattan. Sept passages sur deux versions disent
  donc la même chose : c'est en production.

  **C'est ce troisième passage qui a tranché** : sans lui j'aurais conclu que
  la branche l'avait introduit. Une intermittence ne se juge pas sur un
  passage de chaque côté.

  Ce qui reste à faire : Manhattan tourne à 0,4 image par seconde sur ce banc
  en rendu logiciel (mesuré v259), et ces témoins lisent des effets à
  quelques centaines de millisecondes — ils sont un pile ou face. Avant
  d'accuser le jeu, il faut soit leur donner une page qui tourne (`?ombres=0`
  est déjà le cas, `rr` plus bas ne suffit pas), soit les reformuler pour
  qu'ils PROVOQUENT la situation au lieu de l'attendre (règle des poissons,
  v233).

- [ ] **`carte.js` : « un appui long dépose n'importe où » — VERTE DES DEUX
  CÔTÉS REJOUÉE SEULE (v269).** Rouge au portail de la v269 (les quatre
  appuis déclinés par « pointeurs 0 », des images de 432 à 919 ms), verte
  rejouée SEULE sur la branche ET sur `origin/main` — la suite entière passe
  des deux côtés. C'est la famille de rouges de charge déjà connue de cette
  suite (v251, v258) : le minuteur de l'appui long tire en retard quand
  l'image dure presque une seconde. Le remède n'est pas de desserrer le
  témoin mais de lui donner une page qui respire, ou de provoquer l'appui
  sans dépendre d'un minuteur du navigateur.

- [ ] **LE RAPPORT DE VITESSE ENTRE LES AVIONS RESTE LOIN DU RÉEL (v269).**
  95 et 120 blocs par seconde font un rapport de 1,26, quand le réel (900 et
  2 180 km/h) est à 2,4. Le seul remède est de MAILLER PLUS VITE — 45 % du
  coût d'un morceau est la génération du relief — jamais de remonter la
  vitesse sans remonter le débit : c'est exactement l'erreur que la v265 a
  faite et que la v269 a payée. À reprendre après la mesure sur tablette
  ci-dessus, qui dira si la file peut remonter sans les gels.

- [ ] **`maj.js` : « corps, programmes et fond de carte sont vraiment là » —
  ROUGE DES DEUX CÔTÉS, REJOUÉE SEULE (v267).** Vert jusqu'au portail de la
  v263, rouge à ceux de la v265, v266 et v267 : c'est donc EN PRODUCTION
  depuis la v265 (le portail de la v264 ne l'a pas jouée). Rejouée SEULE le
  même jour, `maj.js` entière, dans les deux arbres :
  branche `{carte:false, depuis:45121, cartePas:40, carteErreur:null,
  carteTravail:true}` ; `origin/main` (v266) `{carte:false, depuis:45128,
  cartePas:25, carteErreur:null, carteTravail:true}`. Corps 9/9 et programmes
  25/25 sont prêts des deux côtés ; **seul le fond de la carte du monde n'a
  pas fini en quarante-cinq secondes**, et il TRAVAILLE ENCORE — ce n'est
  donc ni une panne ni une erreur, c'est un calcul trop lent pour sa borne.
  Le bouton « Jouer » se libère quand même (c'est la borne de la v258 qui
  fait son travail) : l'enfant joue, la carte du monde arrive après.
  Ce qui reste à faire, dans l'ordre :
  (1) **MESURER AVANT D'ACCUSER.** Le fond avance par tranches de 8 ms par
  image (v258) ; à trois images par seconde en rendu logiciel, cela fait
  24 ms de calcul par seconde. Il faut savoir combien de PAS le fond
  demande en tout — `cartePas` va de 25 à 40 sur quarante-cinq secondes,
  mais le total n'est pas publié. Sans ce dénominateur on ne sait pas si
  l'on est à 10 % ou à 90 %, et l'on réglerait une borne au hasard.
  (2) La v265 a doublé la file du mailleur (8 → 16) : le fil principal
  INSTALLE deux fois plus de géométries par seconde, et le fond de carte
  prend ses 8 ms dans ce qui reste. C'est la dette de la v265 vue par un
  autre bout, et c'est la piste la plus probable — à confirmer par
  `?attente=8` sur cette page AVANT de toucher au fond.
  (3) Sur l'iPad, qui a une carte graphique, le rapport n'est pas celui du
  banc : ce chiffre ne se transpose pas (règle de la v245). À remesurer
  avec `?diag=1`.
  Le témoin, lui, ne se relâche pas : quarante-cinq secondes de boutons
  grisés sont la promesse faite à Max en v258, et la tenir est la
  correction.

- [ ] **`reglages.js` : « elle s'aligne même dessus » va et vient (v266).**
  Rouge au portail complet de la v265 ET de la v266, VERTE rejouée seule sur
  la branche ET sur `origin/main` le même jour. Rien de `reglages.js` ni de
  l'espace parent n'a bougé depuis. C'est un rouge de portail, pas un défaut :
  à reprendre comme la poule, par une attente bornée sur ce que l'enfant
  obtient au lieu d'une lecture après un délai.
- [ ] **`reseau.js` : le témoin du passager va et vient (v265).** « Et l'on
  monte en passager : la voiture de l'ami nous emmène » est rouge une fois
  sur deux quand la suite est rejouée SEULE sur la branche (`roule 1,14 ·
  suivi 0,67 · écart 0,77`), et vert au portail et sur `origin/main`. Rien
  de `net.js` ni de `fun.js` n'a bougé en v265. À reprendre comme la poule :
  une attente bornée sur ce que l'enfant obtient, pas une lecture après un
  délai fixe.
- [ ] **« L'écran ne se fige pas en arrivant sur une ville » rouge au premier
  passage, mesuré des deux côtés (v259).** Deux portails de suite sur la
  branche (2 983 ms / 35,8 %, puis 1 817 ms / 12 % ; v261 3 300 / 38,3 ; v262
  3 017 / 34,6 ; v263 3 283 / 37,3 ; v264 3 183 / 37,7 ; v273 3 167 / 32,5 au
  portail et 3 483 / 37,6 rejouée seule ; v274 3 517 / 38,9 au portail et
  3 117 / 34,7 seule — le même premier survol),
  et le témoin extrait
  dans une sonde (`scratchpad/v259/sonde-gel.cjs`), deux tours de suite sur
  chaque arbre : branche 1 267 ms / 7,1 % puis 400 / 2,2 ; `origin/main`
  (v258) 1 367 ms / 9,7 % puis 300 / 0. Le PREMIER survol de Paris paie la
  compilation des programmes que le banc, ouvert avec `?prep=0`, n'a pas
  chauffés (v246, v258) ; le second est sous les barres des deux côtés.
  Piste : ce témoin demande `{ pret: true }` (la chauffe avant « Jouer »,
  comme `carte.js`), sinon il mesure la chauffe et non l'arrivée.

  **v276 — LA BARRE NE SÉPARE PLUS RIEN, ET C'EST CELA QU'IL FAUT RÉGLER.**
  Portail : 4 050 ms / 45,5 %. Sonde extraite du témoin mot pour mot
  (`scratchpad/sonde-ville.cjs`), DEUX tours par bras, en ordre alterné
  (branche, main, main, branche) :

  | bras | pire image (ms) | part > 300 ms | cadence |
  | --- | --- | --- | --- |
  | branche (v276) | 1 383 · 1 233 · **517** · 1 233 | 11,9 · 12,6 · **4,7** · 15,3 | 13,2 – 15,1 |
  | `origin/main` (v275) | 1 250 · 1 150 · 1 300 · 1 117 | 7,0 · 8,3 · 9,5 · 12,0 | 14,0 – 14,3 |

  Les deux nuages se RECOUVRENT, et un tour de la branche est vert : la
  livraison n'y est pour rien, et la distribution est la même des deux côtés
  (règle de la v269). Mais le fait neuf est ailleurs : la barre a été réglée en
  v235 sur 800 ms / 10,3 % (ancien code) contre 233 / 0 (neuf), et aujourd'hui
  les DEUX arbres rendent 1 117 à 1 383 ms sur une machine calme. **Une barre
  que les deux côtés franchissent ne mesure plus le jeu, elle mesure le banc en
  rendu logiciel** — et elle a rougi à chaque portail depuis la v259 sans
  jamais être démontée, c'est-à-dire qu'elle ne protège plus rien. À reprendre
  dans la refonte du banc : soit le témoin demande `{ pret: true }` et l'on
  remesure la barre sur la dispersion réelle, soit il mesure une grandeur que
  SwiftShader ne gouverne pas.
- [ ] **Rouges de portail de `manhattan.js` à une image par seconde, mesurés
  des deux côtés (v259).** ET LA FIN DE LA SUITE PEND, AU LIEU D'EXPIRER
  (portail de la v262) : après « la reprise cloud place l'enfant… » et un
  `souffler` « libre », plus une ligne pendant douze minutes ; `node
  manhattan.js` endormi (0,8 % de processeur), ses deux pages de Manhattan
  (l'hôte et l'invité de la fin de suite) vivantes depuis douze minutes, et
  le PROCESSUS GPU à 351 % — SwiftShader qui rend deux Manhattan à la fois.
  Un `page.evaluate` n'a pas de délai : quand le fil principal d'une page
  attend le rendu logiciel, le banc attend avec lui, sans borne. Tuée à la
  main pour que le portail enchaîne (la suite était déjà rouge, dette
  ci-dessus). À faire : borner la fin de suite (un `Promise.race` avec un
  délai autour de `creerMonde`/`rejoindre`/`evaluate` de cette scène, ou
  `rr=1` et une seule page de Manhattan à la fois), et lire dans
  `renderer.info.render.frame` que la page rend avant d'y évaluer quoi que
  ce soit. Quatre témoins — « le trou enlève aussi la
  géométrie visible de la façade » (l'« avant » lu pendant que les façades
  se construisent encore : 22 326, 9 203, 14 460 pour un « après » toujours à
  51 734), « fenêtres et éclairage public fonctionnent la nuit » (lu 350 ms
  après `__setDayTime`, sans image entre les deux), « les ombres suivent le
  soleil et la lune visibles » ([1, −1], même cause) et « le taxi roule avec
  les contrôles tactiles » (huit blocs exigés en quinze secondes, à 0,55 bloc
  par image : mesuré à la sonde, le taxi ROULE à 10,9 blocs/s, personne
  devant) — plus le rechargement qui dépasse ses 90 s. Rejouée SEULE sur
  `origin/main` (v258) : les mêmes quatre rouges et le même délai. Sonde :
  Manhattan rend 2 images toutes les 5 s sur ce banc, sur les deux arbres,
  zéro erreur de page (`scratchpad/v259/manhattan-*.log`). Piste : ces
  quatre témoins doivent ATTENDRE UNE IMAGE (compteur `renderer.info.render.frame`)
  avant de lire, et le taxi se mesurer en blocs par image plutôt qu'en blocs
  par seconde — leçon « un témoin qui lit l'effet d'une image attend l'image »
  (v249), à appliquer à `manhattan.js`.

- [x] **Vitesse des voitures par modèle (Max, après la v259) — FAIT en v260**
  (classe par modèle dans `FLOTTE`, `ALLURES` par classe, `allureMonture`
  dans fun.js). Reste à MESURER sur la tablette (`?diag=1`) le front de
  chargement en ville à 25,6 blocs/s : le banc n'y voit qu'une cadence
  d'image (une par seconde à `rr=12` dans Paris).

- [x] **Rouge de portail de `washington.js`, « on pousse la porte et on est
  dans la Rotonde », mesuré des deux côtés (v255) — RÉGLÉ dans le témoin
  (v256) : il marche jusqu'à être entré, ressorti ou figé trois pas, plus en
  quatorze pas ; vert seul (plafond 22, x = −4,0) et au portail suivant.** Au portail complet du
  banc accéléré (onzième suite, après `hote.js`) : plafond 11, x = −5,7 du
  centre — l'enfant s'est arrêté sous le porche, à un bloc par seconde. Rejouée
  SEULE sur la branche, même code : plafond 21, x = −4,9, verte. C'est le rouge
  déjà démonté en v215 pour ce témoin (une durée qui dépend de la cadence du
  banc) ; l'ordre des suites l'a déplacé, pas créé. Piste : le témoin marche
  quatorze pas de 700 ms ; à quatre images par seconde, dix blocs ne suffisent
  pas — remplacer la borne en PAS par une borne en BLOCS parcourus, comme
  « ne plus avancer » l'a déjà fait.

- [ ] **Accélérer le portail, étape 2 : une cadence de banc sur les
  minuteries du jeu (`?tempo=N`).** L'étape 1 (v255) a rendu l'attente du
  banc — instrument de charge instantané, repos en condition, suites
  courtes d'abord. Le poste qui reste est dans le JEU : `reseau.js` (19 min)
  et `reglages.js` (7 min) attendent des minuteries de production — 167 s de
  `dormir` de seuil et 3 486 s de bornes `jusqua` adossées à `STALE_MS`
  20 000 (net.js:59), `HEARTBEAT_MS` 5 000 (:58), `SOMMEIL_MAX_MS` 300 000
  (:62), `GRACE_REVEIL_MS` 15 000 (:64), `RELANCE_MS` 3 000 (:68),
  `PRESENTATION_MS` 20 000 (:69), `OUVERTURE_MS` 9 000 (:75), le renoncement
  du relais nuage 12 000 (net.js:626), la sonde nuage 4 000 (:494), le phare
  15 000 (:456), `onCodePris` 1 500 (:1482), `_veilleVideo` 2 000 (:1843), la
  republication 15 000 (main.js:4106), **`pullPlayTime` 60 000** (:4108),
  `prefsPush` 20 000 (:2199), `refreshEduMenuBtn` 10 000 (:2622),
  `savePosition` 3 000 (:1032), le retour au sol 4 000 (:1021), le garagiste
  et l'aéroportiste `cadence(3000)` (:1508/:1541), `REPIT_MS` 8 000 et
  `REESSAI_MS` 5 000 (identity.js:201-202). Forme : `src/tempo.js`, qui lit
  `tempo` dans l'adresse, REFUSE toute valeur ≠ 1 hors `127.0.0.1`/
  `localhost`, et expose `t(ms) = ms / TEMPO` ; le banc passe `&tempo=4`.
  **Ne passent JAMAIS sous tempo** : l'horloge scolaire (`SESSION_MIN_USINE`,
  `DAILY_LIMIT_SECONDS`, `MIN_ANSWER_DELAY`, `FAST_WRONG_DELAY`,
  `FREEZE_SECONDS` — `reglages.js` affirme « dix minutes » mot pour mot),
  `chronoReel` et tout `cadence.js` (c'est un défaut de comptage du temps qui
  a motivé le module), la borne de `dt` (physique), `passants.js:143
  cadence(2000)` et `vehicules.js:1596 patience = 4` tant que `monte.js`
  affirme des débits en temps réel, et `CALMES_DAFFILEE` (un compte, pas un
  délai). Garde-fou obligatoire : un témoin sous node par constante,
  `STALE_MS === 20000`, `REPIT_MS === 8000`…, sinon un tempo mal câblé
  publie un jeu qui coupe les liens en cinq secondes. Gain estimé sur les
  comptes : huit à douze minutes ; à mesurer, jamais à annoncer avant.
  Et l'on garde un `npm run long -- --tempo=1` pour la nuit : une course
  révélée à tempo 4 peut ne pas exister dans le vrai jeu.

- [ ] **Accélérer le portail, étape 3 : deux machines.** Partition écrite en
  dur à côté de `SUITES` (part A ≈ reseau + carte + hote + visio + metro +
  parent, part B ≈ monte + manhattan + washington + plafond + sauvegarde +
  carteMonde + realisme ; reglages en A, maj en B), `--part=A|B`,
  `--fusionner a.json b.json` (union des acquis, chaque empreinte revalidée
  à la lecture), et un contrôle de couverture OBLIGATOIRE : le verdict
  fusionné n'est vert que si A ∪ B === SUITES, aucune suite deux fois avec
  des verdicts contraires, même commit et même état sale des deux côtés.
  Plancher : la plus longue suite seule (`reseau.js`, 19 min). Une seule
  machine dans cette session : à faire le jour où une seconde existe.

- [ ] **Trois rouges du portail complet de la v251, verts rejoués seuls,
  cause ouverte.** (1) `reseau.js`, « à trois, chacun voit les deux autres »
  (hôte ["Alice"], Alice ["Marlon"], Nina les deux, en 79 s) — trois pages
  de jeu en même temps, donc trois workers de maillage de plus sur quatre
  cœurs ; à remesurer avec le worker et sans (`&maillage=local`) si le rouge
  revient. (2) `carte.js`, `page.click('#map-tout')` jamais « stable » en
  trente secondes — mesuré ensuite sur la page bureau, carte ouverte :
  médiane 60 ms par image avec le worker, 55 sans, 53 sur `origin/main`,
  clic en 155 / 120 / 135 ms ; le symptôme de la v247 (banc lent), pas le
  worker. (3) `plafond.js`, « THREE.GLTFLoader: Couldn't load texture
  blob: » × 4 au rechargement — revenu à l'identique au portail de la v252,
  toujours vert seul : le témoin rechargeait la page tout de suite après
  l'ouverture, et sous la charge de trois suites les neuf corps réalistes
  étaient encore en cours d'analyse ; la navigation coupe leurs textures et
  le chargeur l'écrit en erreur de console. Réglé dans le BANC (v252) :
  `plafond.js` attend `humainsCharges()` avant chaque rechargement — et
  c'est PROUVÉ sous charge : rejouée en cinquième position au portail de la
  v252 (relance), 28 témoins verts, zéro erreur de console — et la même
  panne dans `reseau.js` (le revenant Milo, rechargé tout de suite après
  l'ouverture : cinq erreurs, seul, à la v257), même remède. (4) `monte.js`,
  au même portail : « descendu de la voiture de Paris » et les deux témoins
  de mur qui suivent, l'enfant à PIED avant le clic de descente — la boucle
  de montée recliquait sur un bouton-BASCULE quand le « ⬇️ » (écrit à l'image
  suivante, sondé par rAF) n'arrivait pas en trois secondes, à une image par
  seconde dans Paris : premier clic monté, second descendu. Réglé dans le
  banc (v252) : l'état se lit dans `montureConduite()`, on ne reclique
  jamais sur un enfant déjà monté. (5) `monte.js`, troisième passe : « la
  circulation s'arrête devant la voiture de l'enfant » — 97 relevés à moins
  de douze blocs, ZÉRO arrêtée, ZÉRO au travers : les voitures passaient à
  côté, le point « douze blocs devant » en droite ligne n'étant pas sur le
  tracé quand la rue tourne (vert aux deux passes d'avant, 76 arrêtées ;
  `vehicules.js` n'a pas bougé depuis la v246). Réglé dans le banc : de la
  chaussée sous toute la ligne, candidats classés, et l'on se repose ailleurs
  si personne ne vient — une mesure où aucune voiture n'arrive n'est pas une
  mesure. (6) Portail de la v253 : « la reprise tient dans la durée »
  (`reseau.js`, hôte 1 · Alice 2 après vingt-cinq secondes) — vert seul sur
  la branche une heure avant (74 témoins), tombé juste après un `souffler`
  à sa limite (charge 4,49) et un retour d'Alice à 58 s au lieu de 25 ; le
  code réseau de v253 n'ajoute que deux champs au message de position. Vert
  à la passe suivante du portail (hôte 2 · Alice 2, 25 s) : rouge de
  charge, déclaré ici. Et
  « sous le toit » (`monte.js`) : le témoin lisait `plafondSiege.y` comme un
  nombre, devenu une case par siège en v253 — corrigé dans le banc (il lit
  la case du siège conducteur), le jeu asseyait bien l'enfant (crâne 1,19).

- [ ] **À trancher par Max : le corps réaliste « femme-manteau » porte un
  foulard blanc sur la tête.** Revue proactive des trente-cinq personnages
  (neuf corps Rocketbox, vingt-quatre tenues sculptées) et des trois
  appareils, planche-contact de face et de côté avec mesures (pieds au sol,
  hauteur, symétrie) : rien de cassé. Mais Max a demandé en v243 « enlève la
  femme avec le voile, ou retire le voile » pour la dame du château ; ce
  modèle-ci, un des neuf corps de passants, couvre la tête d'un dupatta. Le
  retirer de la liste `noms` de `humains.js` (les femmes tirent alors parmi
  trois corps au lieu de quatre) ou le garder : décision de contenu, pas de
  géométrie. Sonde : `revue/planche-humains.cjs` dans le brouillon.

- [ ] **« On entre chez les gens : chaque îlot a sa porte » (washington.js)
  est tombé UNE fois au portail de la v250** — « façade 0,1, plafond à −1,
  1 mur, à (−21197, 6100) pour une maison en (−21197, 6095) » : sur les
  quatre façades, la marche s'est arrêtée à un bloc du point de départ, trois
  pas immobiles de suite — et pas sur la façade nord, celle qui a la porte et
  par laquelle il entre partout ailleurs. VERT rejoué seul sur la branche dans
  la foulée, même code ; vert dans dix-neuf portails auparavant (v248, v249d
  compris). La livraison v250 ne touche que les pivots de roue des deux
  modèles hors manifeste. Cause ouverte : ce que le témoin ne dit pas, c'est
  ce qui l'a arrêté (une voiture d'Independence à l'arrêt devant lui ? un
  hoquet de banc à trois pas ?). Piste : faire dire au message la cadence et
  ce qui occupe le bloc devant le joueur à chaque pas immobile.

- [ ] **« La circulation s'arrête devant la voiture de l'enfant » est un
  témoin qui dépend de l'état du banc.** Rouge à deux portails de la v247
  (« première voiture après 0 s, 206 relevés à moins de douze blocs, zéro
  arrêtée, zéro au travers »), VERT rejoué seul sur la branche ET sur
  `origin/main`, et rouge une fois sur l'ancien code rejoué seul pendant la
  v246. Il se pose douze blocs devant une voiture visible et attend qu'elle
  vienne s'arrêter ; rien ne garantit que cette voiture vienne à lui — celle
  qui est déjà à douze blocs peut tourner avant, ou faire la queue derrière
  une autre. Un rouge sans traversée n'est pas la panne que le témoin garde.
  Piste : choisir une voiture dont le tracé PASSE par le point posé (lire le
  parcours du convoi, pas seulement son cap), et dire dans le message si la
  voiture la plus proche s'est éloignée ou rapprochée.

- [ ] **Ce qui reste du gel de téléportation après la v246 : le MAILLAGE
  des morceaux à l'arrivée.** Les programmes de la flotte et des humains ne
  se compilent plus sur place (zéro programme neuf à l'arrivée à Paris, vingt
  avant) et les passants naissent par tranches ; sur le banc en rendu
  logiciel la pire image de la téléportation passe de 550 à 450 ms et le
  temps figé de 3,9 à 2,6 s (`teleport.cjs`, une mesure chacun) — ce qui
  reste est le maillage de deux cent quatre-vingt-quatorze morceaux de ville
  à 23 ms pièce, que le budget de `MESH_MS_PAR_SECONDE` étale déjà. La
  mesure qui compte est sur l'iPad de Max ; si le lag y persiste, la piste
  est de mailler moins à l'arrivée (rayon réduit les deux premières
  secondes) ou plus vite (45 % du coût est la génération du relief).

- [ ] **Le témoin du mur a mesuré « à pied » au volant, deux fois, au
  portail de la v249** (à pied 1,1 bloc du mur, gabarit 2,2, monture
  présente) — et pas une troisième, `monte.js` rejouée seule avec le clic de
  descente vérifié (descendu : carrure 0,6, aucune monture). Le témoin de
  circulation qui précède dit désormais l'état avant le clic, après le clic
  et au retour : si cela revient, le message dira si l'enfant est remonté
  par ce clic (un clic sur « Descendre » quand on n'est plus au volant fait
  MONTER dans la voiture d'en face) ou s'il a été éjecté pendant la mesure.
  Cause ouverte, pas expliquée.

- [x] **v254 — Le badge de version ouvre le journal des nouveautés.** Max.
  `src/nouveautes.js` (102 entrées, 294 puces, rédigées depuis
  `CHANGELOG.md`), modale « Quoi de neuf ? », mise à jour forcée en bas.
  Deux témoins dans `maj.js`, rouges sur l'ancien code. Règle : chaque
  livraison ajoute son entrée au journal du jeu dans le même commit.

- [x] **v253 — À plusieurs, l'ami est vu dans sa voiture et l'on monte avec
  lui.** Max, après la v249. `v`/`p` dans le message de position, l'ami
  dessiné avec la fabrique de la monture et assis, passagers collés au siège
  (`sieges` de la fiche). Trois témoins dans `reseau.js`, rouges sur
  l'ancien code. Reste : sans courtier (partie par le nuage seul) le
  conducteur n'a pas d'identifiant de pair et voit ses passagers debout ;
  et les montures sans `siege` (cheval, avion) se voient encore à pied chez
  les autres — le champ `v` part, il manque leur `siege` et leur pose.

- [x] **v252 — La voiture de l'enfant ne traverse plus le mobilier.** Max,
  après la v249. Mesuré : les taxis de Manhattan restent à neuf blocs des
  tables ; c'était la voiture de l'enfant. `mobilierDevant` (props du monde
  + registre du renderer de Manhattan), exception « déjà dedans » par
  famille. Deux témoins dans `monte.js`, rouges sur l'ancien code.

- [x] **v251 — Le maillage hors du fil principal.** Fait : un worker
  engendre et maille, le fil principal installe (324 → 0 ms
  de maillage par seconde en vol au-dessus de Paris). Reste à mesurer sur
  l'iPad de Max ; si le lag persiste, les pistes suivantes sont le coût des
  ombres (v247, jamais mesuré sur tablette) et un second worker.

- [x] **v250 — Les roues de la Lucid Gravity tournent autour de leur essieu,
  et la flotte entière est passée en revue.** Max, capture d'iPhone :
  « Gravity design ko, wheels », puis « sois proactif sur ce genre de bug ».
  `rotation.x += angle` tourne autour du x du PARENT (Euler XYZ) ; les pivots
  fabriqués naissent désormais dans un groupe-essieu. Témoin de flotte dans
  `monte.js` (208 roues, 8 fausses sur `origin/main`, 0 ici), planche-contact
  des 52 modèles regardée. Reste à faire la même revue pour les humains et
  les appareils (planche par modèle, mesures de géométrie), promise à Max.

- [x] **v249 — Paris n'est plus dans le noir, on voit le personnage
  conduire.** Faits : planchers de nuit réglés ombres forcées, avatar
  assis sur le `siege` de la fiche.

- [ ] **v248 et suivantes — « regarde les améliorations qu'il y a encore eu
  dans la ville de New York et reproduis-les sur l'ensemble de la carte ».**
  La v247 a livré la première étape, le regard (soleil, ombres, ACES, voûte
  du ciel, nuit) sur tout le monde. Ce que New York a encore de plus
  (docs/manhattan.md) : façades en maillages à matériaux physiques
  (embrasures, corniches, escaliers de secours, réservoirs), lampadaires qui
  éclairent la rue la nuit, marquages au sol, reflets préfiltrés, pluie sur
  la chaussée (rugosité). Sa chaîne est une liste de bâtiments (rectangle,
  matériau, style, hauteur, graine) et une fonction de surface, avec le
  monde voxel qui garde les collisions (`TerreUrbaine`). **La v248 a livré
  la deuxième étape : les réverbères dans les six villes bâties à la main,
  et les quatre lampes de Manhattan prêtées au monde entier, posées sous les
  lanternes les plus proches de l'enfant la nuit.** Les marquages au sol
  existent déjà partout (`ROUTE_BLOCK`, `ROADLINE`, `CROSSWALK`). Étapes
  suivantes, chacune sur captures rue + ciel : Paris sur la chaîne de
  façades ; les autres villes bâties à la main ; les villes engendrées par
  leurs îlots.

- [ ] **Le coût des ombres sur l'iPad n'est pas mesuré.** La v247 ajoute une
  passe d'ombre par image : les morceaux à moins de six morceaux de l'enfant
  rendus une seconde fois depuis le soleil, carte de 1 024, filtre PCF
  simple. Au banc en rendu logiciel, à Paris : 217 ms sans ombres, 400 avec
  (350 en ombre basique 512, 467 en PCF doux 2 048) — des millisecondes de
  SwiftShader, non transposables — et suffisantes pour que le jeu coupe ses
  ombres de lui-même en rendu logiciel. Si Max signale un ralentissement, les
  leviers dans l'ordre : `RAYON_OMBRE` (6 → 4), la carte (1 024 → 512),
  `BasicShadowMap`, et en dernier `?ombres=0` / `renderer.shadowMap.enabled`.

- [ ] **Assis dans une voiture, le banc rend chaque image deux fois plus
  lentement qu'à pied (256 contre 145 ms), fil principal INACTIF.** Ce n'est
  ni la sonde des reflets (une face coûte 2 à 5 ms depuis la v245) ni du
  JavaScript : c'est la rastérisation logicielle de la carrosserie
  réfléchissante en gros plan. Non transposable à l'iPad ; à vérifier UNE
  fois en rendu matériel avant de chercher plus loin.

- [ ] **Deux circuits de Paris se raccordent à cent soixante degrés sur la rue
  de Rivoli, et les voitures s'y frôlent encore.** Après la v244, il reste
  dix-sept à vingt-cinq relevés de chevauchement sur trente secondes (contre
  soixante-dix-huit), tous au même endroit — autour de (−190, 188) et
  (−175, 215) : une voiture qui attend est frôlée par celle qui passe en biais,
  parce que les deux tracés s'y rejoignent presque parallèles. Céder le passage
  ne peut rien contre un tracé qui met deux files dans le même couloir : c'est
  dans `voies.js` / `paris.js` que cela se règle (un carrefour franc, ou une
  seule file sur le tronçon partagé), et cela se remesure avec la sonde des
  rectangles, jamais avec « à moins de 3,5 blocs ».

- [ ] **L'arrivée en ville fige l'écran depuis la v241 (#244), et le témoin le
  dit des deux côtés.** « L'écran ne se fige pas en arrivant sur une ville »
  (monte.js, barre 550 ms et 5 % du temps au-delà de 300 ms), rejoué SEUL sur
  `origin/main` (v241) : pire image **1 233 ms, 6,9 %** ; sur la branche v242 :
  2 117 ms, 20,8 % — une mesure chacun, sur un banc en rendu logiciel, et le
  trajet de la branche survole MOINS de villes (Paris seule ; Strasbourg et
  Stuttgart en sortent avec le monde ×2). La v246 a découpé l'arrivée image
  par image et retiré deux des causes — les programmes de la flotte et des
  humains compilés sur place, et les dix-huit passants nés dans la même
  image ; ce qui reste est le maillage (voir « ce qui reste du gel de
  téléportation » ci-dessus). Remesuré à la v246, `monte.js` rejoué SEUL des
  deux côtés, même fichier de témoins : `origin/main` (v245) **1 267 ms,
  9,3 %** ; branche **2 033 ms, 18,9 %** — même écart entre les deux arbres
  qu'à la v242 (1 233 contre 2 117) sur du code qui a depuis été fusionné,
  donc un écart de BANC, pas de code ; rouge des deux côtés, dette maintenue.
  La validation de #244 en rendu matériel était verte ; à remesurer sur
  l'iPad.

- [ ] **Quatre témoins de `manhattan.js` sont rouges sur ce banc, des deux
  côtés.** Rejoués SEULS sur la branche v242 et sur `origin/main` (v240),
  dans un arbre séparé, même conteneur en rendu logiciel : « le trou enlève
  aussi la géométrie visible » (9 203 → 54 969 sur main, 17 102 → 54 969 sur
  la branche — le compte MONTE parce que la ville se construit encore),
  « fenêtres et éclairage public la nuit », « les ombres suivent le soleil et
  la lune » (`[1, -1]`), « le taxi roule avec les contrôles tactiles », et un
  délai de quatre-vingt-dix secondes au rechargement qui fait lâcher la fin de
  la suite une fois sur deux — en v245, sur six portails, la fin réseau de
  la suite a lâché trois fois (« partagent blocs, avatars et code » rouge sans
  détail, le bloc de l'hôte jamais reçu par l'invité, « Lost connection to
  server » du courtier local), verte les autres fois sur le MÊME code ; au
  portail de la v246, `page.waitForFunction` a expiré après « la reprise
  cloud place l'enfant près du chantier déplacé », les quatre rouges
  ci-dessus identiques ; au portail de la v256, une SIXIÈME forme de la même
  fin instable : `#ride-btn` jamais visible en quinze secondes après
  l'invocation du taxi (la suite s'arrête là, vingt-quatre témoins de moins),
  et rejouée seule le bouton apparaît, le taxi rend son rouge déclaré et la
  fin réseau lâche (« Lost connection to server »). Le journal de la v240 annonce ce portail vert :
  il a été mesuré avec `CHROMIUM_ANGLE=metal`, pas en logiciel. À démonter
  sur une machine qui rend en matériel avant d'accuser le jeu — et à
  remesurer ici témoin par témoin (la géométrie qui monte dit que le témoin
  attend la fin d'une construction qui n'est pas finie).

- [ ] **Paris au niveau de New York, sur captures.** Décision de Max après la
  v242 : s'inspirer de ce qui a été fait sur Manhattan (façades en maillage
  PBR, volumes réels, éclairage, foule) pour remonter les autres villes, Paris
  d'abord. Règle de jugement inchangée : vue de rue et vue aérienne à côté
  d'une vraie photo, AVANT de fusionner. Le rectangle de Paris se borne comme
  celui de Manhattan (`BORNES`), et la double empreinte de `plafond.js`
  s'applique — Paris est DANS la fenêtre.

- [ ] **Le registre ment encore sur New York.** `r: 152` est le disque de
  l'ancienne ville voxel ; Manhattan est un rectangle de 480 × 2 300. Trois
  lecteurs s'en accommodent chacun à leur manière — `passants.js` écrit 1 200
  en dur, `dansUneZoneATerre` prend le disque plus vingt-quatre, et le témoin
  « aucune ville n'en chevauche une autre » juge sur le disque (c'est le
  témoin du rectangle, v242, qui garde la vraie marge). Une emprise dans le
  registre, lue par tous, remplacerait ces trois arrangements.

- [ ] **La fenêtre déclarée de la migration ×2.** Un bloc est jugé « posé sur
  l'ancienne carte » par sa DATE (`DATE_CARTE_3`, world.js). Une tablette qui
  jouerait encore sur la v241 après cette heure poserait des blocs que la
  migration laisse où ils sont — à l'ancienne adresse de leur ville. Si cela
  se voit (une construction de Marlon ou d'Alice à l'ancienne place de New
  York, autour de (−10 143, 2 615)), la copie `prénom~avant-carte-2` et la
  fonction pure `migrerCarte3` permettent de la ramener à la main.

- [ ] **JFK est au nord-est de Manhattan.** Son vrai cap est le sud-est ; là
  c'est la baie de Jamaica, de l'eau, et le rectangle de la ville. Le cap
  cède en dernier — c'est la règle — mais le jour où le plan de Manhattan
  gagne Brooklyn et Queens, JFK doit revenir à sa vraie place.

- [ ] **Manhattan sur la Terre : suite du réalisme.** Priorités : circulation
  commandée par les feux, berges et ponts raccordés au relief, intérieurs,
  Statue de la Liberté, diversité des façades et transitions LOD plus douces.
  Les publicités restent fixes et les voitures sont des interprétations
  géométriques, pas des modèles constructeur. Mesurer Safari sur iPad physique.
  Réconcilier les emplacements de secours si deux appareils importent hors
  ligne la même archive contre des journaux Terre différents. Les journaux
  d'origine sont conservés ; ne jamais les supprimer pour « nettoyer ».

- [ ] **Une pousse de mémoire graphique subsiste après la v238, et elle ne vient
  PAS des créatures.** Mesuré, dix allers-retours de cent cinquante blocs qui
  forcent le renouvellement : `origin/main` +459 géométries, la branche corrigée
  +348. Le remède de la v238 est pourtant COMPLET pour les bêtes — à l'unité,
  dix créatures prennent 157 géométries et en rendent 157, zéro perdue. Le
  reliquat est donc ailleurs, et le suspect principal est écrit : **les voitures
  de convoi** (`vehicules.js`) sont fabriquées à la demande, trente-deux
  maillages chacune, et ne sont JAMAIS détruites — seulement rendues invisibles
  (`m.visible = false`). Les passants, eux, sont gardés pour la session par
  ville visitée, ce qui est voulu mais s'accumule aussi. À mesurer avant de
  corriger : quelle part chacun représente, et ce qu'il est légitime de rendre.
  **Ne pas conclure sur la cadence du banc** : il rend en logiciel, son fil
  principal est inactif 81 % du temps, il ne peut pas subir cette panne. On
  mesure des géométries.

- [ ] **`animals.js` et `creatures.js` comptent leur cadence de naissance en
  `dt`.** `this.spawnTimer -= dt` avec un `dt` borné à un vingtième : à trois
  images par seconde, 1,2 s de minuteur en réclame 2,4 réelles. C'est la
  cinquième occurrence du piège de `dt`, et elle est NOMMÉE ici plutôt que
  laissée à un futur grep — `src/cadence.js` porte déjà le remède
  (`chronoReel`), il suffit de le brancher. Coût mesuré : au banc, un enfant à
  pied avance à **15 % du temps réel** (six blocs en trente secondes au lieu de
  quatre-vingt-dix), ce qui a fait échouer trois sondes avant qu'on le voie.

- [ ] **Le témoin de chargement du monde vole au-dessus d'un désert.** « En vol,
  on ne rattrape pas le bout du monde qui se charge » (`monte.js`) se place à
  (30 000, 30 000), un couloir vierge où un morceau coûte 6,8 ms. Au-dessus de
  Paris il en coûte 23,5. Le témoin est donc vert alors que l'enfant, lui, ne
  voit rien — c'est ce qui a laissé passer la v229 à la v236. Le paysage
  lointain de la v237 rend le symptôme invisible ; le déficit de maillage, lui,
  est intact. À reprendre : le faire voler au-dessus d'une ville, et remesurer
  les vitesses des avions sur le VRAI débit (42 morceaux/s, pas 154).

- [ ] **Le paysage lointain montre le relief, pas les villes.** `terrainHeight`
  ne sait rien des immeubles : au-delà des morceaux chargés, Paris apparaît en
  prairie. `cityAt` pourrait teinter les cases d'une ville en gris urbain pour
  quelques microsecondes par colonne — non mesuré, non fait.

- [ ] **Des cubes orange isolés flottent dans le ciel**, visibles sur les
  captures de Max comme sur celles du banc, avant comme après la v237. Ma sonde
  de scène ne les a pas trouvés (aucun petit maillage loin dans le champ) :
  c'est donc que je n'ai pas cherché au bon endroit. À reprendre par un lancer
  de rayon à travers leur position à l'écran, qui répondra en une exécution.

- [ ] **Trois non-résultats MESURÉS en v236 — ne pas les reprendre à
  l'aveugle.** En cherchant la cause du gel en vol : le **rendu** ne fait que
  4,6 % du temps (834 ms sur 18 s) ; la **caméra cubique des reflets** ne
  tourne JAMAIS en vol (zéro image sur cent huit — son rayon de 45 blocs ignore
  pourtant l'altitude, mais un convoi n'existe plus si loin) ; couper
  `renderer.debug.checkShaderErrors` ne rend rien (pire image 1 800 → 1 633,
  dans le bruit) parce qu'il n'y a que SIX programmes dans tout le jeu. Le
  rayon des reflets mériterait quand même de compter l'altitude — c'est une
  ligne, et cela évitera qu'un futur changement de portée le réveille en vol.

- [ ] **`generateChunk` parcourt TOUS les blocs de l'enfant à chaque morceau
  engendré.** `for (const [k, id] of this.edits)` avec un `split(',').map(Number)`
  par entrée, pour chacun des quatre-vingt-sept morceaux engendrés par seconde
  en vol. Gratuit au banc (zéro bloc posé), mais Marlon en a des milliers :
  ~435 000 découpages de chaîne par seconde. Un index `edits` par morceau le
  supprime ; les points d'écriture sont `setBlock`, le chargement, la fusion et
  les deux effacements. Pas mesuré sur un vrai profil d'enfant — à chiffrer
  avant de le faire.

- [ ] **Figer les matrices des morceaux de monde n'apporte RIEN — mesuré en
  v235, à ne pas reprendre à l'aveugle.** Le profil d'un vol au-dessus de Paris
  accuse `updateMatrixWorld` (849 ms), `compose` (599), `multiplyMatrices`
  (295) et `updateMatrix` (293) : deux secondes sur vingt, dix pour cent, pour
  replacer des objets qui ne bougent jamais. Poser `matrixAutoUpdate = false`
  sur les maillages de chunk et leurs décors est juste et sans risque — et le
  gain mesuré est NUL (28,5 → 27,7 im/s, pire gel 683 → 667). Ce coût vient
  des personnages et des véhicules, qui bougent. La piste reste ouverte de ce
  côté-là : onze maillages par personnage, chacun avec sa matrice, recalculés
  à chaque image.

- [ ] **Quatre minuteurs de plus comptent en `dt`, et deux comptent vraiment
  (relevé fait en v234).** Le grep enfin passé — `grep -rn -- "-= dt\|+= dt"
  src/*.js` — rend **quarante-neuf** minuteurs hors `education.js`. La grande
  majorité sont des ANIMATIONS et doivent rester en temps de jeu (une bête qui
  fuit, une balle qui rebondit, une flamme qui s'éteint). Quatre ne le doivent
  pas :

  - `animals.js:466` et `creatures.js:542` — `spawnTimer`, la cadence
    d'apparition des bêtes autour de l'enfant. C'est EXACTEMENT la famille des
    quatre cadences de ménage de la v226, et elles ont été oubliées : à
    2,7 im/s, un minuteur de 1,5 s met onze secondes réelles. Le bestiaire se
    peuple donc lentement au moment précis où l'enfant arrive quelque part —
    le symptôme « villes vides » que Max a signalé deux fois, appliqué aux
    animaux.
  - `fun.js:1465` — `raceTime`, le CHRONOMÈTRE de la course, qui écrit
    `records.bestRace` dans le profil. Compté en temps de jeu, il récompense
    la tablette qui rame : plus ça saccade, meilleur le record. Et ces records
    se comparent entre Marlon et Alice dans le tableau.
  - `fun.js:1458` — `raceCooldown`, le délai avant de pouvoir relancer.

  Chacun se corrige par `chronoReel` (cadence.js) et demande son témoin. À
  faire en une livraison à part : trois fichiers de plus, et le record de la
  course mérite d'être regardé avec Max avant d'être remis à zéro ou pas.

- [x] **Les minuteurs de `education.js` comptaient en `dt` — FAIT en v234.**
  La question posée était « qu'est-ce qui est JUSTE ». Réponse : tout ce que
  cette classe compte est une durée de la vraie vie — un parent qui règle
  quarante-cinq minutes parle de minutes de pendule. Mesuré à la sonde sur
  douze secondes réelles : à 5 images par seconde le compteur n'en retenait
  que TROIS, soit près de trois heures accordées pour une limite de
  quarante-cinq minutes. `chronoReel` (cadence.js) sert le temps réel BORNÉ à
  deux secondes — sans cette borne, un onglet à l'arrière-plan ferait compter
  une absence comme du jeu, ce que le plafond de `dt` empêchait par accident.
  Témoin dans `parent.js`, 0,25 → 0,98.

  **Reste à trancher avec Max, et cela ne bloquait pas la correction :** faut-il
  que le temps d'écran continue de courir pendant un quiz et pendant un arrêt
  forcé ? Aujourd'hui oui, compté à part (`today().quiz`). C'est défendable —
  répondre au Professeur Cornichon est du temps devant l'écran — mais c'est une
  décision de parent, pas de programmeur.




- [x] **Les trains n'arrivaient pas en gare — FAIT en v222.** Les gares étaient
  au bon endroit (les dix-huit arrêts tombent à zéro bloc d'une gare) mais
  chaque ligne n'avait que deux trains pour un tour allant jusqu'à 127 s :
  l'attente sur un quai allait de 26 à 64 s. Le nombre de trains est désormais
  le tour divisé par la demi-minute — la règle déjà écrite pour le métro de
  Washington. Pire attente 64 → 30 s, 18 → 29 trains.

- [x] **Piloter un avion — FAIT en v223.** Le mode `pilote`, le troisième des
  trois façons d'être porté, prévu depuis la v155. L'avion reste COLLÉ au
  joueur comme toute monture et c'est la marche qu'on remplace par une
  physique de vol : le réseau, la caméra de poursuite et la boîte de collision
  marchent alors sans une ligne de plus. Trois appareils sur le tarmac de
  Roissy, aux rapports de vitesse réels (1 : 2,4 : 2,4). Mesuré : pointe 110 ·
  264 · 264 blocs/s, et 227 · 546 · 541 blocs parcourus en deux secondes de
  croisière.

- [ ] **Les aérodromes, la suite.** Dix-neuf existent (v223), mais leur cap
  réel a dû céder cinq fois faute de terre ferme : JFK (115° → 30°), Fiumicino
  (245° → 325°), Haneda (160° → 250°), Los Angeles (245° → 305°), Roissy
  (43° → 0°, le nord-est de Paris étant le quartier des enfants). Le jour où
  la carte gagnera des côtes plus fines, ces cinq-là se replaceront. Et il
  manque Changi : aucun disque de soixante-dix blocs au sec dans les trois
  cents blocs autour de Singapour — Delhi a pris sa place dans la quinzaine.

- [ ] **Un terminal n'a ni sièges, ni comptoirs, ni tapis à bagages.** Il se
  traverse (c'est ce que le témoin garde) mais il est vide. Même dette que les
  intérieurs de monuments.

- [ ] **Cinquante villes détaillées.** Demandé par Max. Le monde a 269 villes :
  47 avec une fiche (fleuve, trame, palette, monuments aux vraies coordonnées),
  222 engendrées depuis onze gabarits. Il s'agit d'en faire passer cinquante du
  gabarit à la fiche. Trois choses établies : seules Bruxelles et Cologne sont
  dans la fenêtre d'empreinte (laisser Cologne générique suffit à ne rien
  casser) ; une fiche qui garde le rayon du registre ne change pas la découpe
  « hors villes » ; et la géométrie se CALCULE depuis de vraies latitudes et
  longitudes — un générateur de brouillon le fait et vérifie que chaque
  monument tombe dans le disque de sa ville (il a déjà attrapé quatre erreurs).
  À livrer par lots d'une douzaine : Max juge sur captures, et une fiche fausse
  est pire qu'une fiche absente.

- [x] **POURQUOI `maj.js` rougissait-elle dans le portail et pas seule ? —
  RÉPONDU en v220, et ce n'était ni la charge ni un état qui traverse.** La
  mesure que j'avais moi-même écrite ici a tranché : le rouge se reproduit
  **trois fois sur trois** en rejouant `sauvegarde.js` juste avant, et la
  suite est verte jouée seule. Rien ne traverse d'une suite à l'autre —
  navigateurs séparés, contextes éphémères, ports différents, nuage de poche
  en mémoire. La cause est dans `index.html` : le filet de mise à jour n'était
  armé qu'APRÈS `await reg.update()`, et l'installation du service worker ne
  demande pas un seul fichier au serveur pendant cinquante-huit secondes.
  Corrigé ; le témoin est vert.

- [ ] **Un service worker vraiment coincé n'a aucun témoin.** Le blocage de
  `forcerMaj` est établi par la sonde — le filet l'appelle à vingt secondes,
  `wm-maj-forcee` passe à 1, et plus rien pendant vingt-huit secondes — mais
  rien ne le garde. Deux témoins ont été écrits et retirés : verts des deux
  côtés (27,8 contre 65,9 s de temps jusqu'à « l'enfant peut rejouer », puis
  28,3 contre 36,5 s avec un blocage rendu définitif). L'ancien code s'en sort
  quand même, non par un filet mais parce que l'installation finit par
  échouer, et borner sur ces durées mesurerait le banc. **Ce qu'il faudrait :
  un blocage que le navigateur ne peut pas épuiser** — le nôtre finissait
  toujours par rendre la main, soit par le délai d'en-têtes de node, soit
  autrement (mesuré : 142 requêtes, `reg.update()` rendue à ~32 s malgré
  en-têtes envoyés et délai de prise désactivé). Tant qu'on ne sait pas
  fabriquer ce blocage-là, le remède reste prouvé par la sonde seule.

- [ ] **Les rouges de `reseau.js` (v218) et `monte.js` (v219) restent sans
  explication.** Ce qui justifiait ces fusions tient — les suites étaient
  vertes rejouées seules — mais la cause n'est pas connue. `maj.js` avait la
  sienne, propre à elle ; rien ne dit que celles-là la partagent. La méthode
  qui a marché se réapplique : instrumenter la suite, compter ce qui atteint
  vraiment le serveur, et ne rien conclure d'une explication commode.

- [x] **Éteindre sa caméra ne retirait ni la vignette ni le son — FAIT en
  v219.** Le chemin direct attendait le `close` média de PeerJS, qui ne
  traverse pas ; le chemin du nuage, lui, ANNONÇAIT sa fin — d'où son témoin
  vert. L'extinction s'annonce désormais à tous les pairs par le tuyau des
  blocs. Les deux témoins rendent `[]`, `visio.js` est entièrement verte.
  Constat d'origine (v218) : `visio.js`, rejouée SEULE sur la
  branche et sur `origin/main` dans un arbre séparé, rend les deux mêmes
  témoins rouges avec les mêmes valeurs : « quand Alice éteint, sa vignette
  part » (la piste vidéo reste, `large: 0, haut: 0`, mais présente) et « et son
  filet de voix aussi » (`pistes: 1, muet: false`). Le cas du NUAGE, lui, est
  vert des deux côtés — « quand Tom éteint, son portrait disparaît ». C'est
  donc le chemin DIRECT qui ne retire pas ses pistes à l'extinction, pas le
  mécanisme d'extinction lui-même.

- [x] **On ne voyait toujours personne en marchant — FAIT en v218.** Le champ
  de vision fait 46° : dix-huit passants en couronne n'en donnent que 2,3 dans
  le cadre. Deux sur trois sont désormais posés devant l'enfant, et l'on
  replace aussi celui qui est passé derrière la ligne des épaules. Mesuré en
  marchant, cap devant : moyenne par arrêt 1,5 → 5,25, arrêts vides 1 → 0.
  Resserrer la couronne, seul, ne changeait rien — c'est mesuré et écrit.

- [x] **La ville se vidait dès qu'on marchait — FAIT en v217.** Un passant
  n'était ramené devant l'enfant qu'au-delà de 150 blocs, quand un personnage
  cesse d'être dessiné à 62 : entre les deux il est invisible ET pas rapatrié.
  Mesuré en traversant Paris : 10, 8, 7, 4, **0**, 2, 1 piétons dessinés. On
  rapatrie désormais à 64 blocs — juste au-delà de la portée de rendu, donc
  jamais sous les yeux de l'enfant — et chaque ville a 18 habitants au lieu de
  10. Pire de la traversée : 0 → 11.
- [ ] **La moitié de Paris n'a aucune voiture en vue.** Mesuré : 51 % de la
  ville est à moins de 45 blocs d'un circuit (la portée de rendu d'une
  voiture), et sur les 21 lieux où la carte dépose l'enfant, un seul n'en a
  aucune (le bois de Vincennes). C'est ce qui a fait dire à Max « il a fallu
  du temps pour voir des voitures ». Deux pistes, aucune gratuite : plus de
  circuits (la contrainte de partage de la v211 les limite), ou une portée de
  rendu plus grande (une voiture coûte 32 maillages — c'est ce que la v201 a
  mesuré pour descendre de 110 à 45).

- [x] **Washington n'a pas de circuit de voitures — FAIT en v205.** Onze
  circuits mesurés à 99–100 % couvrent trente-trois des trente-six avenues
  nommées ; les quatorze ronds-points ont gagné une chaussée et les circuits
  les contournent au lieu de les traverser.

- [x] **Trois avenues de Washington restaient sans circuit — FAIT en v223.** La
  23e Rue NO monte de Constitution à Washington Circle en croisant Virginia à
  Foggy Bottom, et la passe de réparation a fait le reste : Virginia Avenue NO,
  Constitution Avenue et la 23e Rue gagnent des voitures, aucune rue ne perd les
  siennes, cinquante voies sur soixante portent un convoi. New York Avenue NO
  était déjà dans trois circuits — la dette la nommait à tort.
- [ ] **`src/washington.js` n'a pas tous ses gardiens** — `tests/tout.js:78`
  déclare `['washington.js', 'plafond.js']`, quand toutes les autres villes
  bâties à la main déclarent aussi `carte.js` et `carteMonde.js`. Or les deux
  importent `washington.js`, et `carteMonde.js` mesure ses dix-neuf circuits,
  ses ronds-points et le partage des convois. Vu en v223 : le portail annonce
  « déjà vert sur ce code » pour les deux suites qui testent ce qui vient de
  changer. La ligne à écrire :
  `'src/washington.js': ['washington.js', 'plafond.js', 'carte.js', 'carteMonde.js'],`
- [ ] **La 17e Rue NO ne peut pas être tracée** — entre Constitution et F
  Street elle traverse le parc de la Maison-Blanche, qui passe avant les voies
  dans `solWashington` : mesuré, neuf blocs de pelouse sur quarante. L'Ellipse
  fait trente blocs de large, à peu près sa vraie taille. À reprendre le jour
  où l'on saura faire longer un parc à une rue.

- [x] **Londres n'a qu'un circuit de voitures — FAIT en v206.** Soixante
  avenues aux vraies coordonnées, choisies pour se croiser (les bouts posés
  SUR la chaussée d'une autre), quinze circuits mesurés de 92 à 100 % qui
  couvrent cinquante-neuf voies. L'échelle n'y était pour rien : c'étaient
  la Tamise, les parcs et neuf voies qui ne se croisaient pas.
- [x] **Euston Road, côté King's Cross, n'est sur aucune boucle de Londres —
  FAIT en v223, mais pas comme annoncé.** Pentonville Road et Gray's Inn Road
  ne suffisaient pas : mesuré, aucun échange ne donnait ses voitures à King's
  Cross sans en retirer à Tottenham Court Road, au Strand et à Charing Cross
  Road, parce que Bloomsbury n'avait que DEUX liens nord-sud et qu'un seul
  circuit les prenait tous les deux. Sept rues au total — les deux annoncées,
  plus Farringdon Road, Clerkenwell Road, Theobald's Road, Gower Street et Judd
  Street — et douze circuits mesurés à 100 % font rouler cinquante-sept avenues
  sur soixante-dix. King William Street en profite aussi.
- [x] **Pas de pont routier sur la Tamise — FAIT en v208.** Waterloo,
  Blackfriars et London Bridge sont des voies à part entière, tablier à la
  cote des quais et eau dessous ; trois circuits changent de rive, et
  dix-huit circuits couvrent soixante-deux voies sur soixante-trois.
- [ ] **Westminster Bridge, Hungerford et Southwark Bridge n'ont pas de
  chaussée.** Leurs tabliers traverseraient l'emprise de Big Ben et le pied
  du London Eye, la grande roue elle-même, et le Globe. À reprendre le jour
  où ces monuments se déplacent ou se rétrécissent — on ne pose pas un pont
  dans un monument.
- [x] **Réauditer les circuits des autres villes pour les demi-tours — FAIT
  en v207.** Vingt-quatre des quarante-et-un circuits hors Londres
  rebroussaient chemin (Paris cinq sur cinq). La cause était dans le chaînage
  partagé de `voies.js`, qui parcourait chaque avenue en entier ; il roule
  désormais de carrefour en carrefour, et un témoin mesure les virages des six
  villes.
- [x] **Huit avenues de Paris n'étaient plus sur aucune boucle — FAIT en
  v209.** Les places rondes se contournent (`contournerRonds`, partagé avec
  Washington dans `voies.js`), dix vraies rues de raccord ont été tracées
  (Champs-Élysées, Haussmann, Wagram, Batignolles, Ternes, Rochechouart,
  Ménilmontant, Port-Royal, Arago, Suffren), la Porte Maillot est devenue le
  rond-point qu'elle est, et Saint-Michel s'aborde par Port-Royal pour éviter
  le Luxembourg. Huit circuits mesurés couvrent les vingt-huit avenues, le
  plus faible à 97 %.
- [x] **Contourner les socles de monument par un CERCLE ne marche pas — et le
  remède est le PÉRIMÈTRE (v221).** La note ci-dessous reste juste et vaut
  d'être gardée : le tour d'un socle par un cercle coupe les coins dans le
  square planté. Ce qui manquait, c'est qu'un rectangle se contourne par son
  périmètre, et qu'il faut PAVER ce périmètre — c'est ce que fait la v221.
- [ ] **(la mesure d'origine, gardée)** Contourner les socles par un cercle : L'idée évidente est d'ajouter les emprises de monument aux cercles
  que `contournerRonds` fait éviter. Éprouvé sur les cinq circuits de Paris :
  cela supprime bien les traversées (183 pas dans un monument → 0) mais fait
  tomber la tenue de rue de 94 % à 82 %, parce que le tour d'un socle n'est pas
  roulant — mesuré, 56 % autour du Louvre, 47 % autour de la Tour Eiffel, 42 %
  autour du Sacré-Cœur. On échange une voiture dans un mur contre une voiture
  dans la pelouse.
  La vraie cause est ailleurs : **une voie a le CENTRE d'un monument pour point
  de passage**. `pt('Louvre')` rend le centre du Louvre, et la rue de Rivoli le
  traverse donc ; dans la vraie ville elle le LONGE. Idem Haussmann par
  l'Opéra, Suffren et la Motte-Picquet par la Tour Eiffel. Le remède est de
  déplacer ces points de passage au bord de l'emprise — c'est une passe de rues
  comme celle de Londres en v206, avec le sol qui bouge et les bâtiments avec.
- [x] **Paris a récupéré ses trois avenues orphelines — FAIT en v216.** Douze
  vraies rues de raccord (Beaumarchais, Turbigo, les quais de la rive droite,
  Diderot, Bourdon, Ledru-Rollin, la rue du Louvre, le Quatre-Septembre, la rue
  de la Paix, Castiglione, Tronchet, Malesherbes), huit circuits mesurés de 95
  à 100 %, quarante avenues sur quarante parcourues — et le seuil de partage de
  la v211 inchangé : la pire paire tombe de 17 à 13 blocs.
- [ ] **Des avenues ont perdu leurs voitures en v211**, faute d'une boucle qui
  ne se superpose à aucune autre. **Paris (v216), puis San Francisco, Lille,
  Londres et Washington (v223) sont réglés** — les quatre villes que la v211
  avait laissées derrière elle.
  À Londres il demeure treize avenues déclarées sans voitures et à Washington
  dix, mais ce sont des dettes MESURÉES, pas des oublis : la liste de Londres
  vit dans `carteMonde.js`, remesurée en v223 avec une règle qui mesure enfin
  ce qu'elle annonce, et la grille de Washington est saturée (zéro chaîne sur
  vingt-six mille compatible avec les circuits en place). La
  piste est la même qu'en v209 : des voies de RACCORD, tracées sur le vrai plan
  et mesurées, pour que ces quartiers aient leur propre boucle plutôt que de
  repasser sur celle du voisin. **Et la méthode est désormais éprouvée** : à
  Paris, douze rues ont suffi, et l'optimiseur a eu besoin d'une passe de
  RÉPARATION — retirer les circuits qui gênent une avenue laissée dehors,
  forcer sa boucle, recombler — que le tirage au hasard seul n'atteignait pas.
- [x] **Une voiture conduite traversait les murs — FAIT en v212.** Elle
  empruntait la boîte de collision du joueur, 0,6 bloc de large pour une
  carrosserie de 2,26. La largeur vit désormais dans la fiche de l'espèce.
- [x] **L'index périmé du conteneur — COMPRIS en v212.** Trois arbres de
  travail portaient la même branche ; quand l'un avançait, l'index des autres
  devenait le retrait de la livraison. Les arbres d'appoint sont détachés,
  et la règle est écrite dans `CLAUDE.md`.
- [x] **Le train : ni rails, ni escalier — FAIT en v213.** La voie se nivelle
  (filtre en cône, remblai et tranchée), elle porte de vrais rails, et plus
  rien ne barre la route du convoi. Mesuré : marche de 27 blocs → 1, zéro rail
  → 96-99 % des colonnes, 36 obstacles → 0.
- [x] **Les gares — FAIT en v214.** Quai de granit un bloc au-dessus des
  rails, auvent sur piliers, bâtiment de brique. Les dix-huit sont complètes ;
  sur l'ancien code, zéro.
- [x] **Les personnages faisaient peur — FAIT en v215.** L'iris occupait 55 %
  du blanc de l'œil et saillait devant lui : deux billes sombres. Blanc
  agrandi, iris réduit à 38 % et remis dans l'orbite, sourcils plus fins et
  plus hauts, bouche souriante, moustache réduite. Reste à valider en capture
  par Max, comme tout ce qui touche à l'apparence.
- [x] **Des voitures traversaient les monuments de Paris — FAIT en v221.** La
  cause n'était pas seulement « une voie a le centre d'un monument pour point
  de passage » : les DIX monuments ont un socle plus large que la place
  déclarée avec eux, si bien que l'anneau de contournement (`r − 0,5`) passe
  DANS le bâtiment quel que soit le tracé. Chaque monument a désormais sa rue —
  trois blocs de chaussée sur son pourtour — et `contournerBlocs` suit le
  PÉRIMÈTRE du socle. Mesuré des deux côtés, carrosserie dans un bloc solide :
  **49 → 0**. Tenue de rue 95 98 100 99 96 100 100 100 → 94 100 100 100 96 100
  100 100. Témoin dans `carteMonde.js`, rouge sur `origin/main`.

- [ ] **Onze pas de voiture restent dans la butte** — neuf sous le Sacré-Cœur,
  deux au Moulin Rouge. Ces deux-là sont déclarés `sansTour` : l'anneau y
  traverserait douze et dix-huit blocs de dénivelée, et l'essayer a été mesuré
  PIRE que le défaut (dix-neuf pas de carrosserie dans le coteau). Le vrai
  Montmartre n'a pas de boulevard autour de la basilique. Deux pistes, aucune
  gratuite : creuser la rue dans la pente comme la voie ferrée creuse ses
  tranchées (v213 — des blocs, pas `terrainHeight`), ou faire passer le circuit
  plus bas, sur les boulevards, et rétrécir le socle du Sacré-Cœur, qui fait
  seize blocs en v et descend donc jusqu'à Rochechouart.

- [ ] **Le Louvre et l'Opéra bâtissent au-delà de leur socle déclaré.** Mesuré
  sur l'anneau de chaque monument : vingt-neuf colonnes bâties sur les 192 du
  tour du Louvre (15 %), six sur les 228 de l'Opéra (3 %) ; les six autres
  anneaux sont libres à 100 %. Le socle sert à deux choses — rien d'ordinaire
  ne s'y bâtit, et `world.js` en fait la boîte de rendu — donc un socle qui
  sous-déclare son monument le fait aussi trancher de loin. C'est le même
  défaut que l'escalier du Sacré-Cœur, qui descendait à quinze blocs quand sa
  boîte en annonçait douze.

- [ ] **Des voitures traversent encore du BÂTI ORDINAIRE.** Mesuré en pas de
  carrosserie dans un bloc solide, à la cote où la voiture roule : Paris 82
  après la v221 (contre 117 avant), dont 71 dans la ville ordinaire et 11 dans
  la butte. Ailleurs, non remesuré depuis la v210 : Londres 94 (dont 41 sur les
  bus impériaux garés aux arrêts, et six pas dans les fontaines de Trafalgar
  Square), Washington 69 (les ormes du Mall compris), San Francisco 60, Lille
  10, Nice 0. La piste qui reste est la seconde de la v210 : ne pas poser
  d'arbre ni de mobilier sur un tracé de circuit.

- [ ] **La rue de Rivoli traverse le jardin des Tuileries.** `pt('Tuileries')`
  est le CENTRE du jardin, et les places passent avant les rues dans
  `solParis` : la chaussée y disparaît sur une trentaine de blocs, ce qui
  coûte trois points au plus long circuit de Paris (97 % au lieu de 100). La
  vraie rue de Rivoli longe la grille, elle n'entre pas — mais déplacer un
  point de `VOIES` déplace une rue, donc cela se mesure avant de se faire.
- [ ] **Les points de voie de Londres et de Washington sont écrits en BLOCS,
  pas en kilomètres.** (Les sept rues ajoutées à Londres en v223 le sont
  aussi : elles ont été calculées depuis de vraies latitudes et longitudes,
  mais posées en blocs comme leurs voisines, pour ne pas mêler deux unités
  dans la même table. La conversion se fera d'un bloc.) `VOIES` de Londres porte `[[-27, -43], [-12, -48]]`, les
  avenues de Washington de même. C'est le piège nommé dans `CLAUDE.md` en
  v216 : juste aujourd'hui, faux à la prochaine remise à l'échelle, et rien ne
  rougira. Paris, San Francisco et **Lille (fait en v223, conversion prouvée
  exacte : quarante-et-un points comparés, zéro écart)** passent par
  `de(dx, dz)`.

- [x] **La rue Royale de Lille n'est plus parcourue — FAIT en v223.** L'avenue
  Mathias-Delobel, le long du Champ de Mars comme la vraie, lui donne sa
  seconde porte. Quatre circuits mesurés (94 à 100 %) couvrent les dix-huit
  voies de Lille, et la rue de Paris, la rue Gustave-Delory et le boulevard
  Victor-Hugo sont repris par la même passe.
- [x] **Valencia Street ne roulait plus à San Francisco — FAIT en v223.** La
  transversale annoncée existe : la 16e Rue au nord et Cesar Chavez au sud,
  toutes deux réelles. Le tour de la Mission et de Mission Bay les emprunte.
- [ ] **Le socle du Shard est un treillis de verre** — un bloc de `GLASS` dans
  un mur creux est un trou (même règle qu'à San Francisco, v195). Vu en
  capture aérienne de la rive sud en v206, laissé tel quel : hors du sujet
  de la passe de rues.

- [x] **Cinq voies de San Francisco restaient sans circuit — FAIT en v223, et
  la cause n'était pas celle qu'on avait notée.** « Elles bordent le parc et la
  côte, où il n'y a rien à boucler » était une explication, pas une mesure :
  mesurées sur leur propre sol, la Great Highway tenait la rue à ZÉRO pour
  cent, Fulton à 50 %, Third Street et Lincoln Way à 70 %, la 19e Avenue à
  81 %. Ce n'étaient pas des rues. Le parc tient désormais entre Fulton et
  Lincoln, la 19e le traverse comme Crossover Drive, la Great Highway est
  passée côté ville et Third Street est revenue à terre ; cinq vraies rues de
  raccord (Stanyan, Sunset Boulevard, Sloat Boulevard, la 16e Rue, Cesar
  Chavez) et six circuits mesurés à 100 % couvrent les dix-neuf voies.

- [ ] **Une voiture coûte 32,6 maillages** — mesuré en v201, et c'est ce qui
  borne tout le reste : trois fois un personnage, pour un objet qui n'a ni
  bras ni jambes. Le modèle `.glb` arrive découpé en trente-deux morceaux, et
  seuls les quatre pivots `Wheel_*` ont besoin de tourner. Fusionner le reste
  par matériau, une fois au chargement, diviserait le coût par cinq et
  permettrait d'en dessiner beaucoup plus. À faire hors ligne ou à la volée,
  jamais avec un décodeur embarqué dans la PWA.

- [ ] **Il manque deux tuiles de façade au jeu** — la v202 a sorti le verre de
  toutes les villes, mais faute de mieux SoMa, les Victoriennes de San
  Francisco, la brique de Lille et les façades ocre de Nice portent toutes le
  même `ARCHI.ETAGE`, qui est une fenêtre haussmannienne à petits bois. C'est
  opaque et c'est déjà juste de loin ; de près, un entrepôt de SoMa n'a pas
  des fenêtres parisiennes. Deux tuiles à peindre dans `textures.js`, sur le
  modèle des blocs `ARCHI` : « fenêtre industrielle » (grande, à croisillons
  métalliques) et « fenêtre de Victorienne » (baie en encorbellement).

- [x] **Des arbres dans les rues de Londres — FAIT en v197.** Et le remède
  vaut pour Nice et Lille, qui avaient le même défaut : leurs parcs
  marquaient déjà des arbres, posés à plat comme n'importe quel sol.

- [ ] **(historique) Des arbres dans les rues de Londres** — Max, même capture : « pas
  d'arbres ». Paris en a depuis la v187 (le feuillage pousse dans `world.js` à
  partir des marques de `solParis`), Londres non : ses rues n'ont que des
  façades. Même recette à appliquer — et il faut ESPACER, sinon une colonne sur
  deux fait une haie pleine qui bouche la rue.

- [ ] **Programme réalisme v2** (prompt de Max, 28/08) — il juge uniquement
  sur captures ; chaque ville retravaillée est montrée AVANT fusion (rue +
  aérien + photo de référence), généralisation seulement après validation.
  Fait : 1) mobilier (v180), 2) routes (v181), 3) façades partout, matériaux
  par ville, médinas préservées (v181) — et LA voiture : le modèle 3D
  d'artiste fourni par Max, reflets par caméra cubique, vue cockpit (v181).
  4) vie dense : **les feux tricolores s'allument une couleur à la fois et la
  circulation s'y arrête (v273)** — la règle est pure (`src/feux.js`), lue par
  celui qui allume les lentilles comme par celle qui freine ; deux rues d'un
  carrefour ne sont jamais vertes ensemble. **À venir : les enseignes
  lumineuses la nuit.**

- [ ] **Moderniser les villes bâties à la main** — New York est faite (v186,
  validée par Max : « Manhattan est mieux, je valide fort ») et **Paris aussi
  (v187, 8 → 24 blocs/km)**. Restent Londres, Nice, Lille et San Francisco,
  qui vivent encore à leur échelle d'origine. **San Francisco est faite
  (v192, 9 → 27 blocs/km)** ; **Londres était DÉJÀ à 24 blocs/km** — il ne lui
  manque pas une remise à l'échelle mais la passe de rue. **Nice est faite
  (v203, 10 → 30 blocs/km, disque de 144)** et **Lille aussi (v204, 16 → 32
  blocs/km, disque de 92, double empreinte)**. Toutes les villes bâties à la
  main sont désormais à l'échelle GTA ; ce qui reste, c'est la passe de rue
  de Londres et les monuments à refaire là où ils n'ont pas suivi. Le piège
  est écrit dans `CLAUDE.md` (section Paris) : les largeurs ne se projettent
  pas, elles se relèvent — et il faut refaire les monuments, qui ne
  grandissent pas avec la carte.

- [ ] **Le métro de Paris, pour de vrai** — l'anneau souterrain de v163 est
  resté à trente-huit blocs de rayon pendant que la ville en prenait 185 :
  il fait donc désormais la boucle du centre historique, ce qui est juste mais
  petit. Paris mérite ses vraies lignes (1, 4, 6) avec leurs stations, par le
  creuseur de Washington. Et la caserne et le commissariat, eux, sont restés
  au cœur — plausible (la Préfecture est bien sur la Cité) mais à reprendre en
  façades de pierre plutôt qu'en halles de béton.

- [x] **Le rouge ancien des suites réseau du portail — CLOS en v195/v196.**
  Les treize suites sont vertes. Sept vieux rouges ont été démontés, et
  AUCUN n'était un défaut du jeu : une durée mesurée sans laisser souffler la
  machine (55 s annoncés, six mesurés seule), un appui long que la carte
  refuse à bon droit depuis la v173, une fausse encoche d'iPhone jamais
  retirée, un fond de carte qui dépendait d'où le test précédent avait laissé
  l'enfant, une horloge écrite « la valeur d'avant + 1 », un document de
  destination erroné, et une relance de page — voulue depuis la v189 — prise
  pour une panne à trois reprises. Le seul qui venait de nous était le témoin
  du musée de l'Air et de l'Espace, cassé en calmant la marche en v192.

- [x] **Une page légère pour les tests réseau — ABANDONNÉ, et mesuré.**
  L'idée était de sauter la scène Three.js pour les suites réseau, en
  estimant le démarrage d'une page à dix secondes dont l'essentiel en 3D.
  **La mesure dit le contraire** : le démarrage tient en 4,6 s, dont
  4 532 ms de CHARGEMENT (78 requêtes, 3,5 Mo de modules) et seulement
  84 ms pour la scène et le lancement de la partie. Le banc charge déjà
  chaque page avec `rr=2` — deux morceaux de monde de rayon — donc la
  génération du terrain est réduite depuis longtemps.

  Une page légère chargerait exactement les mêmes modules : le gain serait
  d'une fraction de seconde par page, pour un changement au chemin de
  DÉMARRAGE du jeu — celui que les enfants lancent. Refait, le calcul donne
  2,5 minutes sur `reseau.js`, pas les cinq à six annoncées. Le rapport
  n'y est pas.

  Ce qui reste vrai et gagnable sans toucher au jeu : les **124 s
  d'attentes fixes** de la suite, à remplacer par des conditions bornées.

- [ ] **(historique) Le rouge ancien des suites réseau** — `hote.js`, `visio.js`
  et `reglages.js` sont réparées. `reseau.js` **va au bout pour la première
  fois** : elle s'effondrait au 27ᵉ témoin, elle en passe désormais soixante.

  Ce qui l'a débloquée n'était pas le jeu. `endormir()` ne fait dormir que le
  RÉSEAU — la page continue de dessiner un monde en 3D à plein régime, et le
  navigateur du banc tourne avec `--disable-renderer-backgrounding`. Cette
  page-là n'était jamais refermée : elle brûlait un cœur sur quatre du milieu
  de la suite jusqu'à la fin, pile sous les scénarios qui chronomètrent.
  Mesuré à la sonde, page seule : renoncer sur un courtier muet met **13,0 s**
  (9 s d'attente du courtier, 4 s de course vers le nuage), contre 24 à 29 s
  avec le fantôme à côté. Aucun seuil n'a été relevé.

  **v190 corrige le plus gros** : chez l'invité, un lien direct jamais ouvert
  chassait le lien par le nuage qui portait la partie. Prouvé à la sonde, sur
  machine vide, pair-à-pair coupé à la racine — le bloc passait de « jamais en
  soixante secondes » à « moins de deux secondes ». `reseau.js` monte à
  cinquante-huit témoins verts.

  **Restent cinq rouges, et ils se ressemblent tous :**

  1. `un bloc posé par le nuage arrive chez l'autre`, `revenir dans
     l'application remet dans la partie` et `et les blocs repassent après le
     retour` — les trois scénarios de NUAGE, tous rouges dans la suite et tous
     VERTS à la sonde sur machine vide. La chronologie montre `liens: 1,
     prets: 0` des deux côtés pendant quatre-vingt-dix secondes : le lien
     existe, la présentation n'aboutit jamais. Le prochain pas est celui qui a
     marché pour le courtier muet — reproduire à la sonde AVEC la charge, pour
     savoir ce qui expire.
  2. `quand le relais répond, on accuse le VPN et pas le Wi-Fi` — le message
     bascule d'un tour à l'autre : `relaisJoignable` dépend de la première
     réponse du relais, qui arrive parfois après la limite de douze secondes.
  3. `un monde bien rempli ne retarde pas les retrouvailles` — mille six cents
     blocs, 41 s. Mesure de durée : à éprouver d'abord à la sonde, page seule.

  **Et un mensonge à corriger, vu à la sonde :** même réparé, le bandeau de
  l'invité repasse à « reconnexion » alors que le nuage porte la partie très
  bien. Pour un enfant, lire « reconnexion » pendant que tout marche est le
  même défaut que le « ça marche ! » affiché sur une session morte, dans
  l'autre sens.

- [ ] **Les métros des grandes villes générées** — le creuseur de Washington
  sait faire ; après les trains intervilles.

- [ ] **Le tour du monde, approfondissements** — DEUX CENT SOIXANTE-DIX-HUIT
  lieux au registre (v173) : Londres à la main, les autres par la machine.
  La suite est du raffinement : donner à Tokyo, Rome ou Rio la profondeur
  artisanale de Londres (voies nommées, mobilier, intérieurs), et les mers
  manquantes du planisphère (mer Noire, Caspienne, Baltique fine) quand un
  enfant les cherchera. Question produit ouverte : que se passe-t-il quand
  un enfant se dépose volontairement en plein océan ? (Aujourd'hui : il
  nage.)
  Neuf monuments du catalogue attendent encore leur adresse dans des villes
  déjà bâties : Notre-Dame, le Sacré-Cœur et l'Élysée à Paris ; l'Empire
  State, le Chrysler, la Statue de la Liberté et le Flatiron à New York ;
  le Golden Gate à San Francisco.

- [ ] **Recalibrer les monuments existants** dans le ciel à 160 blocs. Ceux de
  Washington sont à leur échelle depuis v162 — l'obélisque à soixante-douze
  blocs, la ville entière à 48 blocs/km.

- [ ] **Le reste de Washington** — la Cathédrale nationale et Georgetown
  University, sorties de l'emprise quand l'échelle a triplé (elles attendent
  que le monde grandisse) ; les lignes Orange et Argent, qui partagent le
  tunnel de la Bleue dans la vraie ville ; les guides qui racontent ce qu'on
  visite. Le mémorial Roosevelt, lui, est revenu en v162.

- [ ] **Ce que Washington a à apprendre** — la ville est pleine de choses qui
  se racontent : pourquoi les avenues coupent la grille en diagonale, pourquoi
  aucun immeuble ne dépasse le dôme, pourquoi les cerisiers du Tidal Basin
  viennent du Japon, pourquoi Georgetown n'a pas de métro. Rien de tout cela
  n'atteint l'enfant pour l'instant — c'est dans les commentaires du code, et
  un enfant de sept ans ne lit pas le code. Des questions dans `education.js`,
  ou des panneaux à lire sur place.

- [ ] **L'usine automobile et le mode conduite** — chaîne de production
  documentée sur de vraies recherches (emboutissage, carrosserie robotisée,
  peinture, mariage batterie-caisse, piste d'essai), la voiture qui se construit
  de poste en poste, et à la sortie **on monte dedans et on la conduit**. Le
  travail est dans le mode `pilote`, pas dans la chaîne — voir la section
  « Conduire » de `CLAUDE.md`. **v188 a posé la première brique** : une voiture
  ne vole plus (`vole: false` dans la fiche, `player.volInterdit` l'applique).
  Restent les deux difficultés réelles, écrites dans `CLAUDE.md` : le véhicule
  a besoin de SA boîte de collision — celle du joueur fait 0,6 bloc, une
  voiture qui l'emprunte traverse les murs — et un véhicule conduit doit se
  voir en ligne, sinon Alice ne verra qu'un enfant qui glisse à toute vitesse.

- [ ] **Les garages, la suite** — v188 en pose deux dans la bibliothèque et
  garde la voiture qu'on y laisse. Ce qui manque : un garage posé sur une
  PENTE s'enterre, parce que la pose cherche le point le plus bas sous
  l'emprise (juste pour un monument, fatal pour un bâtiment de plain-pied) ;
  un garage démoli laisse une place de parking invisible ; et rien ne garde
  encore les autres véhicules — la voiture seule est `garable`.

- [ ] **Apprendre** — guides dans les villes, questions audio.

- [ ] **Notifications push** — l'invitation atteint l'application fermée.

- [ ] **Intérieurs** — les monuments se visitent.

---

## Fait récemment

- [x] **v264** — Les flammes des réacteurs : une par tuyère déclarée par le
  bâtisseur (`tuyere()` dans `reacteur()` et à la tuyère du chasseur), deux
  cônes additifs non éclairés dont `fun.js` règle la longueur sur la manette
  à chaque image, éteintes à l'arrêt et à la descente. Trois témoins de
  `monte.js`.
- [x] **v263** — Le cadran de cap aux commandes (`src/cap.js`, pur) : cap en
  degrés, ville la plus proche dans le cône de ±45° devant l'appareil (tout
  le registre, villes engendrées comprises) et sa distance en km, repère qui
  glisse sur une règle, flèche et plus proche ville quand rien n'est devant.
  Trois témoins de `monte.js` lisent le texte du cadran.
- [x] **v262** — La manette des gaz (cadran à droite, pointeur à part) pour
  voitures et avions ; inertie et volant au joystick pour la voiture ;
  décrochage et atterrissage manuel, bouton 🛞 du train, atterrissage sur
  le ventre dit ; boutons de la marche effacés en véhicule (classes
  `en-vehicule`/`en-avion`). Six témoins tactiles à deux doigts dans
  `monte.js`. Reste de #36 : rien ; #37 (flammes du réacteur) à suivre.
- [x] **v261** — L'avion décolle de sa piste et s'y pose : cinq états du mode
  `pilote` (`sol`, `decollage`, `vol`, `atterrissage`, `freinage`), fiches
  `rotation`/`approche`/`roulage`/`frein`, assiette rendue avec pivot sur le
  train principal, jambes du train en membres qui rentrent et sortent,
  arrondi, marche d'un bloc franchie au roulage. Cinq témoins de `monte.js`
  sur une piste de pierre, captures de côté.
- [x] **v260** — Chaque voiture roule à l'allure de sa classe (citadine ×3,8,
  berline/SUV ×4,4, GT ×5,4, sportive ×6,4, hypercar ×8 ; plafond 28 blocs/s
  en ville par l'arithmétique de la v237). Témoin de `monte.js`.
- [x] **v259** — Les passants ne traversent plus la voiture de l'enfant
  (ni celles de la rue, ni les véhicules posés) : regard-devant d'un pas
  dans `BaseNPC.update`, `contourner()` chez `Habitant` et `Wanderer`,
  `world.obstaclePieton` branché par `main.js` sur `vehicules.voitureA` et
  les bêtes à `gabarit` ; `posteAutour` ne tire plus une place dans une
  voiture ; devant une voiture qui arrive (`world.vehiculeApproche`, sur
  `player.pousse` et `vehicules.enMarche`) le piéton s'écarte (`ecart`), et
  la voiture de l'enfant freine devant un piéton (`pietonDevant`, troisième
  famille d'`obstacleVehicule`). Deux témoins de `monte.js`, rouges sur
  l'ancien code (287 à 449 relevés dedans à l'arrêt ; traversée en roulant).
- [x] **v258** — Le jeu se prépare avant « Jouer » (ligne d'avancement,
  boutons grisés jusqu'à corps + programmes + fond de carte, borné à 45 s,
  position restaurée dès l'accueil) ; la carte du monde calcule son fond par
  tranches de 8 ms et ne le recalcule que quand la vue en sort ; la minicarte
  se repeint deux lignes par image, se remplit après un saut et n'engendre
  plus jamais un morceau. Banc : `?prep=0`, `{ prep: 1 }`, `{ pret: true }`.
- [x] **v257** — L'installation se voit : le loader compte les fichiers
  rangés pendant la mise à jour, puis reste après le rechargement jusqu'à ce
  que corps et programmes soient prêts ; une version ne se revalide plus ;
  « Graphismes avancés » dans les Réglages (normal par défaut sur tablette) ;
  `?diag=1` et les paramètres d'isolement pour mesurer sur l'appareil. Et
  deux témoins de `reseau.js` rendus robustes (bêtes d'Alice, corps de Milo).
- [x] **v256** — Le panneau 🛠️ s'en va (atelier, coffre, quête, panneaux,
  chantier, records, chapeaux, feux d'artifice), le bouton devient 🖼️
  Souvenirs ; aucune donnée effacée, les messages d'une ancienne tablette
  ignorés sans casse et relayés. Et la Rotonde de `washington.js` se rejoint
  jusqu'à être entré, plus en quatorze pas.

- [x] **v255** — Le portail d'essai attend ce qui compte, plus le temps :
  instrument de charge instantané (`tests/charge.js`, `/proc/stat` sur une
  demi-seconde) pour `souffler` et le repos entre suites, une charge stable
  se dit au lieu de s'attendre, `jouerSeul` en condition bornée, suites
  courtes d'abord, empreinte de reprise sur la forme du banc. Quinze suites
  depuis zéro : 74 → 51 minutes, 9 → 0 minutes d'attente entre suites,
  respiration 615 → 119 s, mêmes témoins. Étapes 2 (tempo) et 3 (deux
  machines) déclarées ci-dessus.

- [x] **v254** — Le badge de version ouvre « Quoi de neuf ? » : cent deux
  entrées écrites pour un enfant (`src/nouveautes.js`), la version installée
  marquée, la mise à jour forcée en bouton ; et fermée, la modale ne couvre
  rien (`hidden` perdait contre `display: flex` — attrapé par `carte.js`).

- [x] **v253** — À plusieurs, le véhicule voyage avec la position : on voit
  l'ami dans sa voiture, on monte avec lui comme passager, le premier
  conduit.

- [x] **v246** — La téléportation ne fige plus l'écran (les dix-neuf
  signatures de programme de la flotte et des humains, lues dans les fichiers,
  se compilent à l'accueil ; zéro programme neuf à l'arrivée à Paris, vingt
  avant ; les passants naissent par tranches), la Bugatti roule sans traînées
  et la Lucid retrouve sa forme (une pièce de roue est un mot entier et une
  géométrie : `/rim/` attrapait « trim »), et chaque ville a ses voitures
  (graine par ville, laque par voiture : Moscou, sept modèles et huit couleurs
  sur douze voitures visibles).

- [x] **v226** — Les villes ne sont plus vides quand on y arrive. Les cadences
  de ménage (passants, circulation, garagiste, aéroportiste) comptaient en
  `dt`, borné à 1/20 s : à 2,7 images par seconde, un minuteur de deux
  secondes demandait quatorze secondes réelles. Pire de la traversée 3 → 16,
  peuplement à l'arrivée 6-8 s → 1 s.

- [x] **v225** — Le portail passe de 59 à 48 minutes. Le seuil de `souffler()`
  était SOUS le coût d'une seule page (mesuré : une page ouverte = 3,8 sur
  quatre cœurs, deux pages = 4,7) ; porté à 4,2, il distingue enfin la
  concurrence réelle. Treize suites vertes.

- [x] **v224** — Le portail passe de 83 à 59 minutes. `souffler()` expirait à
  deux minutes cinq fois sur six ; ramené à trente secondes, treize suites
  vertes et rien de perdu. Plus le chronomètre par suite et par témoin, et
  l'élargissement de la table des gardiens reconnu comme anodin.

- [x] **v223** — On pilote un avion (avion de ligne 110 blocs/s, Concorde et
  chasseur 264), et dix-neuf aérodromes pour avoir où atterrir : Roissy
  déménagé hors de Paris, quatorze aéroports de plus, quatre bases aériennes,
  des terminaux qu'on traverse à pied. Double empreinte refaite — 172 379
  colonnes, `fa120ab1…` des deux côtés.

- [x] **v187** — Paris à l'échelle GTA : 24 blocs par kilomètre, un disque de
  185, des rues où l'on marche, une rue par quartier, l'Étoile à sa vraie
  taille, et quatre monuments refaits (Tour Eiffel en treillis, Arc de
  Triomphe à quatre faces, Notre-Dame, Panthéon). Plus la carte : elle ne
  s'étire plus sur un téléphone couché, et on y cherche un lieu par son nom.

- [x] **v186** — New York à l'échelle GTA (34 blocs/km, Times Square, les
  monuments à leur vraie emprise), des voitures dans TOUTES les villes (les
  villes de fleuve n'avaient aucun anneau, les villes bâties à la main
  aucun tout court), et les fenêtres qui restent allumées la nuit.

- [x] **v185** — les roues tournent avec le sol qui défile, rayon mesuré par
  modèle, et un téléport ne les fait plus tournoyer.

- [x] **v184** — la flotte : cinquante modèles fournis par Max tirés au sort
  (le Chiron d'artiste reste en rotation), téléchargés à la première
  rencontre par le canal statique — et le filet de l'écran compte en temps
  réel (la moitié noire d'iPad se répare même quand les images bégaient).

- [x] **v183** — la vue GTA au volant (fiche `poursuite`, caméra derrière,
  anti-mur), la voiture remise à l'endroit (l'avant vérifié par les phares —
  elle roulait à l'envers depuis v181), vitres transparentes, nez fermé.

- [x] **v182** — la voiture garée ne bouge plus (« tac tac tac »), la marche
  n'hérite plus de la rampe de vol, et la fumée éprouve la bibliothèque là où
  v176 l'a mise — le portail redevient `npm test`, jamais une liste de suites.

- [x] **v181** — réalisme v2, deuxième acte : vrai bitume et marquages dans la
  texture, la grammaire de façades généralisée aux 278 villes, et LA voiture —
  le modèle d'artiste fourni par Max, reflets par caméra cubique, vue cockpit.

- [x] **v180** — réalisme v2, premier acte : réverbères-meshes fins, feux
  tricolores aux carrefours, jardinières, marquage net ou rien.

- [x] **v179** — les trains intervilles : six vraies lignes en neuf navettes
  de gare en gare, ballast, viaduc sur la Manche, le trait sur la carte, et
  « Monter à bord » pour voyager.

- [x] **v178** — les villes respirent (Londres recalibrée, un lot sur dix en
  jardin de poche dans les 278 villes) et vivent (bus montables, six
  voitures, dix passants dont deux chiens par ville).

- [x] **v177** — les calottes polaires sont blanches : neige et glace au-delà
  de 78° nord et 63° sud, au sol comme sur la carte.

- [x] **v176** — l'onglet 🏛️ Bâtiments dans le + (601 modèles, vignettes en
  élévation, 15 familles nouvelles, 6 blocs d'architecture neufs) — et le vol
  reréglé sur verdict : croisière ×8 en dix-sept secondes.

- [x] **v175** — le vol prend sa vitesse de croisière : l'allure grandit sans
  à-coup avec le temps de vol, jusqu'à ×6 (66 blocs/s) — Paris-Rome en une
  demi-minute.

- [x] **v174** — les poissons : un banc de récif entretenu autour de
  l'enfant, partout où il y a de l'eau — six robes vives, nage vraie,
  naissance à portée de vue.
- [x] **v173** — les deux cents villes : 223 villes générées par archétypes
  régionaux avec côte automatique, 278 lieux au registre, plus d'arbres
  sauvages dans les rues — et le métro de Washington dégelé (le piège de
  flottants qui remettait la pause à l'infini, bug de production attrapé
  par la barrière).
- [x] **v164** — la carte prend ses vraies coordonnées : chaque ville déduite
  de sa latitude et de sa longitude, aucun chevauchement (marge la plus étroite
  58 blocs), et le tour du monde commence — neuf villes, dix monuments qui se
  dressent enfin quelque part. Plus : la reprise d'hôte automatique quand celui
  qui héberge s'en va, la voix de robot qui se répare seule, la baie de Nice
  qui existe enfin, et deux témoins pris en flagrant délit de mensonge (voir le
  journal).


- [x] **v163** — le métro de Paris passe sous terre : tunnel annulaire, quatre
  stations à quais, bouches de métro au bord du trottoir, plus un seul pilier.
- [x] **v162** — Washington repris à zéro sur le verdict de Max (« très low
  cost ») : échelle triplée (48 blocs/km), le cœur monumental seulement, les
  douze musées du Mall, trente-deux intérieurs réels (hémicycles du Capitole,
  Bureau ovale, avions suspendus), maisons à étages, vingt vraies stations, et
  le pont de la Jaune sur le Potomac. L'ancienne emprise rend son relief de
  v160 au bloc près.

- [x] **v161** — Washington : le plan de L'Enfant, le Mall, vingt-quatre
  monuments dans lesquels on entre, trois ponts, et quatre lignes de métro dont
  les rames s'arrêtent en station. Le sol a bougé sous la ville, et **nulle part
  ailleurs** — c'est vérifié par une seconde empreinte.

- [x] **v160** — les huit familles de bâtiments : 301 modèles en tout, variés
  pour de vrai (123 à 3 921 blocs), atteignables sans liste de 301 lignes.

- [x] **v159** — la bibliothèque de monuments branchée (onglet 🏛️, 21 bâtiments,
  pose devant soi, envoi par lots) et le portail à deux voies.
- [x] **v158** — la sauvegarde cesse de jeter les blocs de Marlon.
- [x] **v157** — la monoplace freine dans les virages.
- [x] **v156** — l'enfant n'est plus seul dans un monde peuplé.
- [x] **v155** — on monte sur les bêtes, et on monte à bord.
