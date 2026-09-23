// LE PALIER DE L'APPAREIL — MESURÉ, JAMAIS DEVINÉ.
//
// Max, sur iPhone 18 Pro, `?diag=1` en vol :
//
//   59 i/s médiane · pire image 62 ms · 12 appels · 30k tri · 56 prog
//   graphismes normal · dpr 1,25 (502×892) · ombres off
//   morceaux 263 · corps 9/9 · programmes chauffés 25
//
// DOUZE APPELS DE DESSIN. C'est la mesure directe de ce qu'il décrit — « le
// unveil est late » : il n'y a presque aucun morceau maillé devant lui, et ce
// n'est pas parce que l'appareil ne suit pas, c'est parce que le jeu ne lui en
// demande pas. Il est au plafond de son écran, il rend à un septième de sa
// définition, et ses ombres sont coupées.
//
// LA CAUSE EST DATÉE. La file du mailleur (8, v269), la distance d'affichage
// (12 morceaux en tactile), la résolution (1,25, v257) et les ombres ont toutes
// été réglées sur l'iPad de QUATRE ANS de la famille, qui devenait injouable.
// Un téléphone de 2026 paie ce compromis sans en avoir besoin.
//
// ── CE QU'ON MESURE, ET POURQUOI PAS LA CADENCE ──────────────────────────────
//
// UNE CADENCE PLAFONNÉE PAR L'ÉCRAN NE DIT RIEN DE LA RÉSERVE. Cinquante-neuf
// images par seconde, c'est le plafond : un appareil qui pourrait en faire deux
// cents rend le même chiffre qu'un appareil qui atteint tout juste soixante. On
// ne mesure donc PAS une cadence, on mesure le TEMPS D'UN TRAVAIL CONNU — et
// c'est la même discipline que « on mesure la CAUSE et non l'effet » (v236).
//
// Deux travaux, parce qu'il y a deux goulots et qu'ils ne sont pas dans la même
// machine :
//
//   · `msMorceau` — ce que coûte le maillage d'un morceau, DANS LE WORKER.
//     C'est lui qui décide combien de monde peut exister devant l'enfant, donc
//     la profondeur de file et la distance d'affichage.
//   · `msTravail` — ce que l'appareil FAIT dans une image, sur le fil principal,
//     à la résolution où il joue DÉJÀ : du premier calcul jusqu'au `render()`
//     compris, l'attente du balayage EXCLUE. Il ne décide pas la résolution
//     — voir juste au-dessus de la table pourquoi — il sert de garde : un
//     appareil dont le fil principal est déjà plein ne doit pas recevoir plus de
//     monde à installer, puisque INSTALLER les géométries est le travail du fil
//     principal et que c'est exactement ce que la v269 a mesuré.
//
// ET LA PREMIÈRE VERSION DE CE FICHIER MESURAIT LA PÉRIODE, PAS LE TRAVAIL
// (v290). Elle notait l'écart entre deux images. Sur un appareil synchronisé à
// son écran, cet écart EST la période de rafraîchissement : l'iPad de Max rend
// 59 images par seconde et donne 17,0 ms, soit 1000/59 au dixième près. Les
// deux barres devenaient fausses PAR CONSTRUCTION — `> 16,7` vrai sur tout
// appareil en bonne santé à 60 Hz, donc `bas` ; `≤ 8` inatteignable sous vsync,
// donc `haut` hors de portée. **C'est la règle écrite trois paragraphes plus
// haut, enfreinte à la ligne suivante.** Les barres, elles, n'ont pas bougé :
// elles décrivaient déjà un TRAVAIL (« on demande la MOITIÉ des 16,7 ms »), et
// ce qui manquait était de le leur donner.
//
// ET CE N'EST PAS LE NON-RÉSULTAT DE LA v269. Celle-ci avait essayé de faire
// suivre à la file le coût de CHAQUE morceau, au fil du jeu, et l'a retiré après
// mesure : le coût ne sépare pas la ville de la campagne en vol, si bien que la
// file partait à son plafond partout. Ici on ne suit rien : on mesure UNE FOIS
// la vitesse de l'APPAREIL, on en déduit un palier, et on n'y touche plus de la
// partie. La grandeur est la même, la question est l'inverse.
//
// ── LES PALIERS ──────────────────────────────────────────────────────────────
//
// Trois, pas cinq : un palier qu'on ne sait pas distinguer d'un autre est un
// réglage de plus à démonter le jour où quelque chose rougit. Les valeurs de
// `moyen` sont EXACTEMENT celles d'aujourd'hui — c'est ce qui garantit qu'un
// appareil mal classé ne perd rien par rapport à la v283.
//
// ET LA PORTÉE DU PAYSAGE LOINTAIN N'EST PAS DANS LA TABLE, parce qu'elle suit
// DÉJÀ la distance d'affichage : `rayonHorizon(rr, chunk)` vaut `rr × 16 × 3,3`
// depuis la v237, et cette règle dit exactement ce qu'il faut — « un joueur qui
// demande un monde de deux morceaux ne demande pas un panorama de six cents
// blocs ». Un palier qui monte `rr` allonge le panorama PAR CONSTRUCTION. Un
// champ qu'on n'aurait pas branché serait du code mort qui ressemble à de
// l'avancement.

// ── ET LA TABLE NE PORTE QUE CE QUE LES CHIFFRES DE MAX PROUVENT ─────────────
//
// C'est la règle du remède qui ne va pas plus loin que la panne (v245), et elle
// m'a fait RETIRER deux champs de mon premier jet.
//
// Ce que ses douze appels de dessin établissent, c'est que le monde devant lui
// est SOUS-ALIMENTÉ : il ne reste que `rr` et la profondeur de file, deux
// leviers dont le dépôt a mesuré l'effet (v265, v269). Ils ne disent RIEN des
// pixels ni des ombres — et mon premier jet faisait passer sa résolution de
// 1,25 à 2,0, c'est-à-dire 2,56 fois la surface, sur la foi d'une mesure d'image
// prise à 1,25. **Une mesure ne vaut que dans les conditions où elle a été
// faite** (v277, v280) : classer un appareil sur le coût de son image PUIS
// changer la surface de cette image, c'est se servir de la mesure contre
// elle-même. Même chose pour les ombres, dont le prix est une passe entière et
// n'a jamais été mesuré sur ce téléphone.
//
// Les deux restent donc à la v283 — décidées par le TYPE d'appareil, comme la
// v257 l'a écrit. Un champ qu'on n'aurait pas branché serait du code mort qui
// ressemble à de l'avancement (v157).
//
// ── ET LA MESURE A ÉTÉ FAITE (v290) : LES PIXELS ET LES OMBRES SONT GRATUITS ───
//
// Max, `?diag=1` sur son iPad, après avoir mis « Graphismes avancés » — donc
// pleine résolution ET passe d'ombres, ce que la v284 avait refusé de deviner :
//
//   | dpr | pixels | ombres | i/s | pire image | appels |
//   | 1,25 | 1 475 × 860 | off | 59 | 79 · 75 ms | 13 · 4 |
//   | 2,00 | 2 360 × 1 376 | ON | 59 | 84 ms | 14 |
//
// 2,56 fois la surface, plus une passe d'ombres entière, pour CINQ millisecondes
// sur la pire image. La v284 avait raison de ne pas monter la résolution sur la
// foi d'une mesure prise à 1,25 ; la mesure prise à 2,00 dit maintenant que le
// prix n'existe pas sur cet appareil.
//
// **ET CELA NE SE MET PAS DANS LA TABLE POUR AUTANT, pour la raison exacte qui
// l'en avait écarté la première fois.** Ces chiffres sont relevés à rr 12 et
// file 8 ; le palier `haut` change AUSSI ces deux-là, donc il change les
// conditions de la mesure — s'en servir pour justifier les trois ensemble, c'est
// se servir d'une mesure contre elle-même (v277, v280). Et l'enfant n'en a pas
// besoin : « Graphismes avancés » (v257) les lui donne déjà, sur l'appareil, et
// c'est un réglage que Max a mis lui-même.
//
// CE QUE LA MÊME CAPTURE ÉTABLIT, ET QUI EST PLUS GROS : **morceau 37,0 ms**.
// C'est ce que son iPad met à engendrer et mailler UN morceau, mesuré dans son
// worker. Un seul mailleur en rend donc vingt-sept par seconde, quand voler à
// 95 blocs par seconde à rr 12 en réclame `2 × 12 × 95 / 16` = **142**
// (arithmétique de la v229, reprise en v237). Cinq fois trop peu — et ses 14
// appels de dessin, ses 33k triangles et ses 54 morceaux chargés le disent par
// l'autre bout : l'appareil n'est pas en peine, il ATTEND.
//
// La barre du palier haut (25 ms) l'écarte donc à juste titre : rr 16 réclamerait
// 190 morceaux par seconde au lieu de 142, soit MOINS de monde devant lui. Le
// palier ne peut rien pour cet appareil ; ce qui peut, c'est mailler plus vite.
// La piste, et pourquoi elle n'est pas close : la v265 a mesuré que deux
// mailleurs n'apportent rien, **au banc, en rendu logiciel**, où le fil principal
// saturait à installer les géométries. Chez Max le fil principal est vide. Un
// non-résultat ne vaut que dans les conditions où il a été mesuré, lui aussi.
// Déclaré dans `TASKS.md`.
export const PALIERS = {
  // L'iPad de quatre ans, et tout ce qui rame. Moins que ce que le jeu fait
  // aujourd'hui : c'est le seul palier qui n'a jamais été mesuré chez la
  // famille, et il est là pour ne pas laisser un vieil appareil sans issue.
  // `hd` (v287) : la portée de la couche HD de Paris, en morceaux — 0 l'éteint.
  // Elle coûte un appel de dessin et quelques milliers de triangles par
  // morceau proche ; sur l'iPad de quatre ans, rien.
  bas: { rr: 8, file: 6, hd: 0 },
  // CE QUE LE JEU FAIT AUJOURD'HUI, au réglage près. Un appareil que la mesure
  // ne sait pas classer atterrit ici et ne perd rien.
  moyen: { rr: 12, file: 8, hd: 3 },
  // L'iPhone de Max, et tout ordinateur. La file passe à seize — le chiffre que
  // la v265 avait mesuré comme le genou du DÉBIT et que la v269 a dû rendre
  // parce qu'il écroulait la cadence SUR L'IPAD. Sur un appareil qui a la
  // réserve, il n'y a pas de raison de le lui refuser.
  haut: { rr: 16, file: 16, hd: 6 },
};

export const PALIER_PAR_DEFAUT = 'moyen';

// ── LES BARRES, ET D'OÙ ELLES VIENNENT ───────────────────────────────────────
//
// Une barre se pose sur une grandeur MESURÉE, jamais sur une intuition (v269).
// Celles-ci sont posées sur ce que le jeu lui-même réclame, et le calcul est
// écrit pour qu'on puisse le refaire :
//
//   Voler à `v` blocs par seconde réclame `2 × rayonRendu × v / 16` morceaux
//   par seconde (la largeur du front de chargement multipliée par les morceaux
//   franchis) — c'est l'arithmétique de la v229, reprise en v237.
//
//   Au palier HAUT : rr 16, v 160 → 320 morceaux par seconde. Avec une file de
//   seize et un seul mailleur, cela demande `1000 / 320 × 16 = 50 ms` par
//   morceau au pire. On prend la moitié, 25 ms, parce qu'une barre de garde se
//   pose à la moitié (v237) et qu'un morceau de ville coûte plus cher qu'un
//   morceau de campagne — la mesure, elle, se fait là où l'enfant est.
//
//   Au palier BAS : rr 8, v 95 → 95 morceaux par seconde, soit 63 ms par
//   morceau avec une file de six. Au-delà, l'appareil ne suit plus et il vaut
//   mieux lui rendre des images que du monde.
export const BARRE_MS_MORCEAU_HAUT = 25;
export const BARRE_MS_MORCEAU_BAS = 63;

// Et pour le travail d'une image : soixante images par seconde laissent 16,7 ms
// de budget. On demande la MOITIÉ, pour que le jeu garde de quoi installer les
// morceaux qu'une file de seize va lui envoyer — et pas seulement de quoi
// dessiner. Au-delà de 16,7 ms de TRAVAIL, l'appareil ne peut plus tenir
// soixante images quoi qu'il arrive, et lui donner plus de monde le noierait :
// c'est la panne de la v269, mot pour mot.
//
// Ces deux phrases sont vraies d'un travail et fausses d'une période — c'est
// tout le défaut de la v290, et c'est pour cela que les chiffres ne changent
// pas en le corrigeant.
export const BARRE_MS_TRAVAIL_HAUT = 8;
export const BARRE_MS_TRAVAIL_BAS = 16.7;

// ── LA RÈGLE, PURE ET UNE SEULE ──────────────────────────────────────────────
//
// Elle prend deux mesures et rend un palier, avec la RAISON. Sans la raison, un
// palier surprenant ne se démonte pas — c'est « `null` n'est pas un verdict »
// (v272) appliqué à un choix d'appareil.
//
// `msMorceau`  : médiane du coût d'un morceau maillé, en millisecondes.
// `msTravail`  : médiane du TRAVAIL d'une image à la résolution d'épreuve —
//                jamais la période entre deux images, qui ne mesure que l'écran.
// Les deux peuvent manquer (`null`) : on ne devine pas, on reste au défaut.
export function choisirPalier({ msMorceau = null, msTravail = null } = {}) {
  if (msMorceau == null || msTravail == null) {
    return { palier: PALIER_PAR_DEFAUT, raison: 'mesure absente', msMorceau, msTravail };
  }
  if (msMorceau <= BARRE_MS_MORCEAU_HAUT && msTravail <= BARRE_MS_TRAVAIL_HAUT) {
    return { palier: 'haut', raison: `morceau ${msMorceau.toFixed(1)} ms ≤ ${BARRE_MS_MORCEAU_HAUT} et travail ${msTravail.toFixed(1)} ms ≤ ${BARRE_MS_TRAVAIL_HAUT}`, msMorceau, msTravail };
  }
  if (msMorceau > BARRE_MS_MORCEAU_BAS || msTravail > BARRE_MS_TRAVAIL_BAS) {
    return { palier: 'bas', raison: `morceau ${msMorceau.toFixed(1)} ms ou travail ${msTravail.toFixed(1)} ms au-delà de ${BARRE_MS_MORCEAU_BAS} / ${BARRE_MS_TRAVAIL_BAS}`, msMorceau, msTravail };
  }
  return { palier: 'moyen', raison: `morceau ${msMorceau.toFixed(1)} ms · travail ${msTravail.toFixed(1)} ms`, msMorceau, msTravail };
}

// LA VITESSE DES AVIONS SUIT LA FILE, ET C'EST ÉCRIT DEPUIS LA v269. Elle avait
// été descendue de 160 à 120 blocs par seconde PARCE QUE la file était retombée
// à huit — « une vitesse mesurée sur une file ne vaut que pour cette file ». Le
// palier haut lui rend sa file de seize, donc sa vitesse. Le témoin du trou de
// `monte.js` calcule sa barre en `max / 2`, lu dans la fiche : il suivra tout
// seul, sans qu'on touche à un chiffre de témoin.
export const VITESSE_JET = { bas: 95, moyen: 120, haut: 160 };

// UN PALIER NE PAPILLOTE PAS. On mesure, on décide une fois, on garde — et ce
// qui est gardé l'est sur l'APPAREIL, pas dans le profil de l'enfant, pour la
// raison que la v257 a déjà écrite : c'est une capacité de la machine, pas un
// goût. La mesure est gardée AVEC le palier, pour qu'un `?diag=1` dise non
// seulement ce qui a été choisi mais POURQUOI.
//
// ET UN VERDICT RANGÉ SURVIT À LA CORRECTION DE LA RÈGLE QUI L'A PRODUIT
// (v290). L'iPad de Max avait DÉJÀ `bas` dans son stockage quand la capture a
// été prise — `?diag=1` annonçait « → bas au prochain lancement », ce qui veut
// dire que `localStorage` était écrit. Livrer la règle neuve sans changer la
// CLÉ aurait laissé son appareil dégradé : la mesure ne se reprend pas, elle est
// rangée une fois pour toutes. Une règle de classement qui change change sa
// clé, sinon la correction n'atteint pas l'appareil qu'elle répare — c'est
// `CACHE_VERSION` à l'échelle d'un réglage.
export const PALIER_CLE = 'web-minecraft-palier-v2';

// ── L'ÉTENDUE EST UN CHOIX DE MAX, LA MESURE N'EN EST QUE LE DÉFAUT ──────────
//
// Max, après avoir vu son iPhone 18 Pro tourner sans un à-coup avec des
// graphismes qu'il trouve pauvres : « permets-moi de choisir l'étendue des
// graphismes as a user si tu sais pas le calibrer toi ». C'est sa décision, et
// elle renverse le rapport entre la mesure et le réglage : la mesure ne DÉCIDE
// plus, elle PROPOSE. Quatre valeurs, `auto` par défaut — donc rien ne change
// pour qui n'y touche pas, ce qui est la règle du remède qui ne va pas plus
// loin que la panne (v245).
//
// TROIS RAISONS DE LUI DONNER LA MAIN, ET AUCUNE N'EST UN RENONCEMENT.
//
//  1. UNE MESURE NE PEUT PAS CONNAÎTRE LE GOÛT. Le palier arbitre entre voir
//     loin et aller vite ; les deux sont légitimes, et rien dans une
//     milliseconde ne dit lequel Marlon préfère aujourd'hui. Un classement
//     automatique répond très bien à « qu'est-ce que cet appareil peut faire »
//     et pas du tout à « qu'est-ce que je veux voir ».
//  2. UNE MESURE ARRIVE UNE PARTIE TROP TARD. Le palier se range pour le
//     lancement SUIVANT (v284), parce qu'il ne doit pas papilloter sous les yeux
//     de l'enfant. Un choix, lui, est immédiat — il n'a rien à mesurer.
//  3. ET SURTOUT : UN CLASSEMENT PEUT SE TROMPER, ET IL L'A FAIT. La v290 vient
//     de corriger une règle qui dégradait l'iPad de Max au lieu de le servir. Un
//     réglage que l'utilisateur atteint est le seul recours qui ne dépend pas de
//     la justesse de ce qu'on a écrit — c'est la même logique que le bouton de
//     mise à jour forcée du badge de version (v220), qui existe parce qu'un
//     mécanisme automatique peut rester coincé.
//
// LE CHOIX VIT SUR L'APPAREIL, PAS DANS LE PROFIL. Même raison que la qualité
// des graphismes (v257) : l'iPad de la maison et l'iPhone de Max n'ont pas la
// même réserve, et le réglage doit rester chez celui qui le paie. Un enfant qui
// change de tablette ne doit pas emporter le réglage de l'autre.
export const ETENDUE_CLE = 'web-minecraft-etendue-v1';
export const ETENDUE_PAR_DEFAUT = 'auto';

// CE QUE L'ENFANT LIT, ET IL EST ÉCRIT POUR LUI. Le mot dit ce qu'il OBTIENT —
// « Loin », pas « rr 16 » —, et l'ordre va du plus court au plus long, comme
// une règle graduée. `auto` est en tête parce que c'est le défaut.
export const ETENDUES = [
  { cle: 'auto', mot: 'Auto', aide: 'Le jeu mesure ta tablette' },
  { cle: 'bas', mot: 'Court', aide: 'Moins loin, plus fluide' },
  { cle: 'moyen', mot: 'Normal', aide: 'Ce que le jeu faisait avant' },
  { cle: 'haut', mot: 'Loin', aide: 'Plus loin, pour un appareil rapide' },
];

// LA RÈGLE, PURE ET UNE SEULE — et c'est ce qui la rend lisible en dix lignes :
// `main.js` la lit au démarrage pour régler la distance d'affichage, la file, la
// couche HD et la vitesse des jets ; l'espace des réglages la lit pour dire ce
// qui est actif et pourquoi ; un témoin la lit sous node. Deux tables qui
// décrivent le même réglage finissent par diverger (discipline de
// `postesAvion`).
//
// `choix`  : ce que l'enfant a demandé ('auto' ou un nom de palier).
// `mesure` : le verdict rangé par la partie d'avant, ou null.
//
// Rend `null` quand il n'y a NI choix NI mesure : c'est la v283 au bit près, et
// c'est ce qui garantit qu'un appareil qu'on n'a ni mesuré ni réglé ne perd
// rien.
export function palierRetenu({ choix = null, mesure = null } = {}) {
  if (choix && choix !== 'auto' && PALIERS[choix]) {
    return { nom: choix, source: 'choix', ...PALIERS[choix] };
  }
  if (mesure && PALIERS[mesure.palier]) {
    return { nom: mesure.palier, source: 'mesure', mesure, ...PALIERS[mesure.palier] };
  }
  return null;
}

// ET ON NE CLASSE PAS UN APPAREIL SUR UNE CONFIGURATION QU'ON LUI A IMPOSÉE.
// La règle est de la v284, écrite pour `?rr=` et `?dpr=` du banc ; un palier
// choisi à la main est exactement le même cas. Une page qui tourne à `rr 16`
// parce que Max a demandé « Loin » ne dit rien de ce que l'appareil ferait à sa
// distance naturelle : ranger cette mesure écraserait le verdict juste par un
// verdict mesuré sous contrainte, et le jour où il repasse en « Auto » il
// hériterait de ce faux classement. On mesure donc, on l'affiche dans `?diag=1`
// — la mesure reste vraie POUR CETTE CONFIGURATION, et elle sert à démonter un
// résultat surprenant — mais on ne la range pas.
export const etendueRange = (choix) => !choix || choix === 'auto';

// ── ET CE QUE VAUT « PAS DE PALIER » SE PUBLIE, IL NE SE RECOPIE PAS ─────────
//
// Un appareil sans palier — ni mesure ni choix — joue la v283 : `rr` 12 sur un
// écran tactile, 16 ailleurs, file de huit, portée HD du palier moyen. Ces
// valeurs vivaient en TROIS endroits de `main.js`, une par repli, et il a fallu
// un QUATRIÈME lecteur pour que le piège se voie : l'aide du réglage doit dire
// si le prochain lancement changera quelque chose, donc comparer ce que vaut
// « pas de palier » à ce que vaut un palier. Sur un écran tactile « Normal » est
// EXACTEMENT « pas de palier » ; sur un ordinateur il fait perdre quatre
// morceaux de distance d'affichage. Une aide qui aurait comparé les NOMS aurait
// donc annoncé une attente qui n'arrive pas sur l'iPad, et tu la ratais sur le
// portable. Deux tables qui décrivent la même chose finissent par diverger —
// discipline de `postesAvion`.
export const reglageDe = (palier, tactile) => (palier
  ? { rr: palier.rr, file: palier.file, hd: palier.hd }
  : { rr: tactile ? 12 : 16, file: 8, hd: PALIERS[PALIER_PAR_DEFAUT].hd });
