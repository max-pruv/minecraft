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
//   · `msImage` — ce que coûte une image sur le fil principal, à la résolution
//     où l'appareil joue DÉJÀ. Il ne décide pas la résolution — voir juste
//     au-dessus de la table pourquoi — il sert de garde : un appareil qui
//     n'arrive pas à tenir son écran aujourd'hui ne doit pas recevoir plus de
//     monde à installer, puisque INSTALLER les géométries est le travail du fil
//     principal et que c'est exactement ce que la v269 a mesuré.
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
// v257 l'a écrit — et la prochaine étape est une MESURE, pas une intuition :
// `?dpr=2&ombres=1&diag=1` sur son iPhone rend la pire image et la cadence à la
// résolution visée, et c'est ce chiffre-là qui décidera. La dette est déclarée
// dans `TASKS.md`. Un champ qu'on n'aurait pas branché serait du code mort qui
// ressemble à de l'avancement (v157).
export const PALIERS = {
  // L'iPad de quatre ans, et tout ce qui rame. Moins que ce que le jeu fait
  // aujourd'hui : c'est le seul palier qui n'a jamais été mesuré chez la
  // famille, et il est là pour ne pas laisser un vieil appareil sans issue.
  bas: { rr: 8, file: 6 },
  // CE QUE LE JEU FAIT AUJOURD'HUI, au réglage près. Un appareil que la mesure
  // ne sait pas classer atterrit ici et ne perd rien.
  moyen: { rr: 12, file: 8 },
  // L'iPhone de Max, et tout ordinateur. La file passe à seize — le chiffre que
  // la v265 avait mesuré comme le genou du DÉBIT et que la v269 a dû rendre
  // parce qu'il écroulait la cadence SUR L'IPAD. Sur un appareil qui a la
  // réserve, il n'y a pas de raison de le lui refuser.
  haut: { rr: 16, file: 16 },
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

// Et pour l'image : soixante images par seconde font 16,7 ms. On demande la
// MOITIÉ, pour que le jeu garde de quoi installer les morceaux qu'une file de
// seize va lui envoyer — et pas seulement de quoi dessiner. Au-delà de 16,7
// l'appareil ne tient déjà plus son écran, et lui donner plus de monde le
// noierait : c'est la panne de la v269, mot pour mot.
export const BARRE_MS_IMAGE_HAUT = 8;
export const BARRE_MS_IMAGE_BAS = 16.7;

// ── LA RÈGLE, PURE ET UNE SEULE ──────────────────────────────────────────────
//
// Elle prend deux mesures et rend un palier, avec la RAISON. Sans la raison, un
// palier surprenant ne se démonte pas — c'est « `null` n'est pas un verdict »
// (v272) appliqué à un choix d'appareil.
//
// `msMorceau` : médiane du coût d'un morceau maillé, en millisecondes.
// `msImage`   : médiane du coût d'une image à la résolution d'épreuve.
// Les deux peuvent manquer (`null`) : on ne devine pas, on reste au défaut.
export function choisirPalier({ msMorceau = null, msImage = null } = {}) {
  if (msMorceau == null || msImage == null) {
    return { palier: PALIER_PAR_DEFAUT, raison: 'mesure absente', msMorceau, msImage };
  }
  if (msMorceau <= BARRE_MS_MORCEAU_HAUT && msImage <= BARRE_MS_IMAGE_HAUT) {
    return { palier: 'haut', raison: `morceau ${msMorceau.toFixed(1)} ms ≤ ${BARRE_MS_MORCEAU_HAUT} et image ${msImage.toFixed(1)} ms ≤ ${BARRE_MS_IMAGE_HAUT}`, msMorceau, msImage };
  }
  if (msMorceau > BARRE_MS_MORCEAU_BAS || msImage > BARRE_MS_IMAGE_BAS) {
    return { palier: 'bas', raison: `morceau ${msMorceau.toFixed(1)} ms ou image ${msImage.toFixed(1)} ms au-delà de ${BARRE_MS_MORCEAU_BAS} / ${BARRE_MS_IMAGE_BAS}`, msMorceau, msImage };
  }
  return { palier: 'moyen', raison: `morceau ${msMorceau.toFixed(1)} ms · image ${msImage.toFixed(1)} ms`, msMorceau, msImage };
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
export const PALIER_CLE = 'web-minecraft-palier-v1';
