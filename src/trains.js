// Les trains intervilles : les vraies lignes du monde.
//
// Max : « add train connecting cities from real life train lanes ». Chaque
// ligne est réelle — l'Eurostar, le TGV, le Shinkansen, l'AVE, le
// Frecciarossa, l'ICE — et relie des villes qui existent au registre, par
// segments de ville à ville. Un train se prend comme un métro : on attend en
// gare, il marque l'arrêt, « Monter à bord ».
//
// LES RAILS S'ARRÊTENT AUX PORTES DES VILLES. Un tracé qui entrerait dans la
// ville traverserait ses maisons ; chaque segment se borne donc au bord du
// disque (rayon + 6), et c'est là qu'est la gare — comme les vraies gares,
// aux marges du centre. Une ligne à trois villes devient deux navettes qui
// partagent leur ville-pivot.
//
// LE VIADUC PLUTÔT QUE LE TUNNEL. L'Eurostar traverse la Manche : sous la
// mer dans la réalité, sur un viaduc ici — un enfant qui prend le train veut
// VOIR la mer passer sous ses fenêtres, et un tunnel de sept cents blocs est
// un long couloir noir. C'est un choix, pas un oubli.

import { positionDe } from './mondes.js';

export const LIGNES_TRAIN = [
  { nom: 'Eurostar', emoji: '🚄', teinte: 0x2a3a8c, villes: ['londres', 'paris'] },
  { nom: 'TGV', emoji: '🚄', teinte: 0x8c8c94, villes: ['paris', 'lyon', 'marseille'] },
  { nom: 'Shinkansen', emoji: '🚅', teinte: 0xf0f0ea, villes: ['tokyo', 'kyoto'] },
  { nom: 'AVE', emoji: '🚄', teinte: 0x6a2a8c, villes: ['madrid', 'barcelone'] },
  { nom: 'Frecciarossa', emoji: '🚄', teinte: 0xc82a2a, villes: ['milan', 'florence', 'rome'] },
  { nom: 'ICE', emoji: '🚄', teinte: 0xe8e8e8, villes: ['amsterdam', 'cologne', 'francfort'] },
];

const MARGE_GARE = 6;       // la gare se pose à rayon + 6 du centre
const PAS = 4;              // un point de tracé tous les quatre blocs

// Les segments de navette : chaque paire de villes consécutives d'une ligne,
// bornée aux bords des deux disques. C'est la géométrie PLATE (x, z) — la
// hauteur vient du terrain, que seul main.js connaît.
export function segmentsDeTrain() {
  const segs = [];
  for (const ligne of LIGNES_TRAIN) {
    for (let i = 0; i < ligne.villes.length - 1; i++) {
      const A = positionDe(ligne.villes[i]);
      const B = positionDe(ligne.villes[i + 1]);
      const dx = B.x - A.x, dz = B.z - A.z;
      const l = Math.hypot(dx, dz) || 1;
      const ux = dx / l, uz = dz / l;
      const x0 = A.x + ux * (A.r + MARGE_GARE), z0 = A.z + uz * (A.r + MARGE_GARE);
      const x1 = B.x - ux * (B.r + MARGE_GARE), z1 = B.z - uz * (B.r + MARGE_GARE);
      segs.push({
        ligne, de: ligne.villes[i], vers: ligne.villes[i + 1],
        x0, z0, x1, z1, longueur: Math.hypot(x1 - x0, z1 - z0),
      });
    }
  }
  return segs;
}

// L'index spatial des rails : chaque segment est rangé dans les cases de 512
// blocs qu'il traverse — la question « suis-je près d'un rail ? » se pose à
// chaque colonne de terrain et à chaque pixel de carte, elle doit être
// gratuite loin des lignes.
//
// ET LE SEGMENT SE RANGE BLOC PAR BLOC, PAS TOUS LES 256 (v242). Le premier
// index échantillonnait un point tous les 256 blocs, avec quatre blocs de
// marge : une diagonale qui COUPE LE COIN d'une case y passe sur soixante
// blocs sans qu'aucun échantillon n'y tombe, et la case ignore le rail. Vu
// sur l'ICE Amsterdam–Cologne, le monde ×2 ayant déplacé la ligne sur un tel
// coin : soixante blocs de voie sans rails ni ballast, une marche de cinq, et
// un arbre planté dessus — `presDeLaVoie` ne voyait pas la voie non plus.
// Cent cinquante mille pas au démarrage coûtent quelques millisecondes.
const CASE = 512;
const INDEX_RAILS = new Map();
for (const s of segmentsDeTrain()) {
  const n = Math.ceil(s.longueur) + 1;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = s.x0 + (s.x1 - s.x0) * t, z = s.z0 + (s.z1 - s.z0) * t;
    for (let cx = Math.floor((x - 4) / CASE); cx <= Math.floor((x + 4) / CASE); cx++) {
      for (let cz = Math.floor((z - 4) / CASE); cz <= Math.floor((z + 4) / CASE); cz++) {
        const cle = cx * 100000 + cz;
        if (!INDEX_RAILS.has(cle)) INDEX_RAILS.set(cle, []);
        const liste = INDEX_RAILS.get(cle);
        if (!liste.includes(s)) liste.push(s);
      }
    }
  }
}
const RIEN = [];
const pres = (x, z) => INDEX_RAILS.get(Math.floor(x / CASE) * 100000 + Math.floor(z / CASE)) || RIEN;

function dSegment(s, x, z) {
  const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - s.x0) * dx + (z - s.z0) * dz) / l2));
  return Math.hypot(x - (s.x0 + dx * t), z - (s.z0 + dz * t));
}

// --- LE PROFIL D'UNE VOIE : ni marches, ni trous (v213) ----------------------
//
// Max, capture à l'appui : « train no rails, holes, no end stations ». Les
// trous, ce sont les MARCHES : le ballast était posé à la hauteur du terrain,
// colonne par colonne, et le train roulait dessus. Mesuré ligne par ligne, la
// dénivelée entre deux colonnes voisines montait à VINGT-SEPT blocs sur
// Cologne-Francfort, treize sur le Shinkansen et le TGV. Une voie ferrée ne
// fait pas d'escalier : elle remblaie et elle creuse.
//
// Le lissage est un FILTRE EN CÔNE, et il garantit sa pente par construction :
// `bas[k] = min sur j de h[j] + pente × |k − j|` ne descend jamais de plus de
// `pente` par bloc, et se calcule en deux passes. Le cône du dessous ne fait
// que des tranchées, celui du dessus que des remblais ; leur MOYENNE garde la
// pente bornée — la moyenne de deux fonctions à pente bornée l'est aussi — et
// partage l'écart en deux. Mesuré : marche max 1 bloc, écart au terrain 13 au
// pire, 247 colonnes de remblai et 723 de tranchée sur 4 744.
//
// ET L'ORDRE COMPTE : borner l'écart au terrain APRÈS le lissage détruit ce
// qu'on vient d'obtenir. Le premier essai finissait par ce rabotage et rendait
// des marches de vingt-et-un blocs.
// --- LA SECTION D'UNE VOIE DOUBLE (v281) -------------------------------------
//
// Max, deux captures d'iPad : « les rails ne sont pas des rails, les trains se
// rentrent dedans, il faut 2 rails pour aller et retour ». Trois défauts, et
// les trois se mesurent.
//
// LES TRAINS SE TRAVERSENT, ET CE N'EST PAS UNE INTERMITTENCE. `traceSegment`
// faisait l'aller puis le RETOUR SUR LES MÊMES POINTS : le tracé est une
// polyligne repliée sur elle-même, donc deux rames placées en `s` et en `L − s`
// sont au MÊME endroit du monde, et cela arrive deux fois par tour pour chaque
// paire. Simulé tour par tour sur les neuf segments : distance minimale entre
// deux rames ZÉRO partout, et 135 relevés de deux rames à moins de quatre
// blocs. Ce n'est pas un défaut de collision, c'est un défaut de PLAN.
//
// LES RAILS N'EN ÉTAIENT PAS PARCE QU'ILS ÉTAIENT PEINTS À PLAT. La section
// valait gravier | obsidienne | planche-gravier | obsidienne | gravier, tout à
// la même cote : vu de l'iPad, un damier au fond d'une tranchée. Un rail se
// reconnaît à son RELIEF — deux files continues qui dépassent du ballast — et
// pas à sa couleur. Et il ne peut pas se dessiner dans une TUILE : les lignes
// sont des segments obliques entre deux villes, une tuile n'a pas
// d'orientation, et des rails dessinés le long d'un axe seraient faux sur toute
// ligne en biais. C'est donc de la géométrie, à un bloc au-dessus des
// traverses.
//
// LES COTES SONT DES RÉSULTATS. Deux voies écartées de `2 × ENTRAXE`, chacune
// avec ses deux rails à `DEMI_RAIL` de son axe, plus une banquette de ballast :
// l'emprise fait `EMPRISE` de demi-largeur. La voie ferrée passe de trois blocs
// de large à neuf, ce qui est le rapport d'une vraie double voie.
export const ENTRAXE = 2;        // du milieu de la ligne à l'axe de chaque voie
export const DEMI_RAIL = 1;      // de l'axe d'une voie à chacun de ses rails
export const EMPRISE = 4.5;      // demi-largeur de la plate-forme ferroviaire

// LA PIÈCE DE VOIE SOUS UNE COLONNE — publiée ici, lue par `world.js` qui la
// pose et par les témoins qui la mesurent. Deux tables qui décrivent la même
// section finiraient par diverger, et le train roulerait à côté de ses rails.
//
// `d` est la distance à l'axe de la LIGNE ; `c` celle à l'axe de la voie la
// plus proche. Le rail se prend sur l'ARRONDI et non sur une bande : sur une
// ligne oblique, une bande de largeur fixe rend une file tantôt épaisse tantôt
// trouée, alors que l'arrondi donne une chaîne d'un bloc, continue en
// diagonale — ce qu'on lit comme un rail.
export function pieceDeVoie(s, x, z) {
  const lx = s.x1 - s.x0, lz = s.z1 - s.z0, ll = Math.hypot(lx, lz) || 1;
  const ux = lx / ll, uz = lz / ll, nx = -uz, nz = ux;
  const ax = x - s.x0, az = z - s.z0;
  const d = ax * nx + az * nz;                 // l'écart SIGNÉ à l'axe de la ligne
  if (Math.abs(d) > EMPRISE) return null;
  // UNE FILE DE RAIL SE RASTÉRISE, ELLE NE SE SEUILLE PAS. Mon premier jet
  // classait « rail » toute colonne dont l'écart tombait dans une bande d'un
  // bloc autour de l'offset. Sur une ligne oblique, une bande de largeur fixe
  // rend tantôt deux colonnes, tantôt zéro : mesuré, 229 pas sur 2 700 où une
  // voie n'avait pas ses deux files, et cinq colonnes de rail en moyenne là où
  // il en faut quatre. Une droite se trace sur une grille en parcourant son
  // AXE DOMINANT et en arrondissant l'autre coordonnée — une colonne par pas,
  // chaîne continue en diagonale. C'est la seule façon d'obtenir une file.
  const surLaFile = (o) => {
    if (Math.abs(ux) >= Math.abs(uz)) {
      const t = (x - s.x0 - o * nx) / ux;
      return Math.round(s.z0 + uz * t + o * nz) === z;
    }
    const t = (z - s.z0 - o * nz) / uz;
    return Math.round(s.x0 + ux * t + o * nx) === x;
  };
  for (const o of [-ENTRAXE - DEMI_RAIL, -ENTRAXE + DEMI_RAIL,
    ENTRAXE - DEMI_RAIL, ENTRAXE + DEMI_RAIL]) {
    if (surLaFile(o)) return 'rail';
  }
  // Entre les deux files d'une voie : les traverses, une case sur deux, tirées
  // en coordonnées du MONDE — en coordonnées locales le motif se répéterait
  // dans chaque morceau et sauterait au remaillage.
  if (Math.abs(Math.abs(d) - ENTRAXE) < DEMI_RAIL) {
    return (((x + z) % 2) + 2) % 2 === 0 ? 'traverse' : 'ballast';
  }
  return 'ballast';
}

const PENTE = 1 / 3;        // un tiers de bloc par bloc, comme le métro de DC

// Le monde donne sa hauteur de terrain : `trains.js` ne la connaît pas, et le
// profil ne peut se calculer sans elle.
let SOL = null;
export function brancherSol(fn) { SOL = fn; PROFILS.clear(); }

const PROFILS = new Map();

// Le profil d'un segment : une cote par bloc, du départ à l'arrivée. Calculé
// à la première demande et gardé — `world.js` le redemande à chaque colonne.
export function profilDe(s) {
  let p = PROFILS.get(s);
  if (p) return p;
  if (!SOL) return null;
  const n = Math.max(2, Math.round(s.longueur));
  const h = new Array(n + 1);
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = Math.round(s.x0 + (s.x1 - s.x0) * t), z = Math.round(s.z0 + (s.z1 - s.z0) * t);
    // jamais sous les flots : sur la mer, la voie devient un viaduc au ras
    // de l'eau, et c'est de là que part le lissage.
    h[k] = Math.max(SOL(x, z), NIVEAU_EAU) + 1;
  }
  const bas = h.slice(), haut = h.slice();
  for (let k = 1; k <= n; k++) bas[k] = Math.min(bas[k], bas[k - 1] + PENTE);
  for (let k = n - 1; k >= 0; k--) bas[k] = Math.min(bas[k], bas[k + 1] + PENTE);
  for (let k = 1; k <= n; k++) haut[k] = Math.max(haut[k], haut[k - 1] - PENTE);
  for (let k = n - 1; k >= 0; k--) haut[k] = Math.max(haut[k], haut[k + 1] - PENTE);
  p = h.map((_, k) => (bas[k] + haut[k]) / 2);
  PROFILS.set(s, p);
  return p;
}

// Le niveau de la mer. `world.js` l'a aussi, mais l'importer d'ici créerait un
// cycle : trains.js est importé PAR world.js.
const NIVEAU_EAU = 30;

// Où en est-on le long d'un segment, entre 0 et 1 ?
function tSegment(s, x, z) {
  const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
  const l2 = dx * dx + dz * dz || 1;
  return Math.max(0, Math.min(1, ((x - s.x0) * dx + (z - s.z0) * dz) / l2));
}

// La voie sous cette colonne : sa distance à l'axe et la COTE du rail, ou
// null si l'on est ailleurs. C'est ce que `world.js` pose et ce que le convoi
// suit — les deux lisent la même chose, sans quoi le train roulerait à côté
// de ses rails.
export function voieEn(x, z) {
  let best = null;
  for (const s of pres(x, z)) {
    const d = dSegment(s, x, z);
    if (d >= EMPRISE || (best && d >= best.d)) continue;
    const p = profilDe(s);
    if (!p) continue;
    const t = tSegment(s, x, z) * (p.length - 1);
    const k = Math.min(p.length - 2, Math.floor(t));
    best = { d, seg: s, cote: Math.round(p[k] + (p[k + 1] - p[k]) * (t - k)) };
  }
  return best;
}

// --- LES GARES : le train s'arrêtait devant rien (v214) ----------------------
//
// Troisième moitié du signalement de Max : « no end stations ». Le train
// marquait bien l'arrêt aux deux bouts de chaque ligne — `traceSegment` le
// déclare depuis la v179 — mais rien n'y était bâti. On attendait le train
// debout dans l'herbe.
//
// Une gare tient en trois pièces, et elle est à l'échelle du JOUEUR, pas du
// sol : c'est là qu'on marche. Le QUAI, un bloc au-dessus des rails comme un
// vrai quai, de part et d'autre de la voie. L'AUVENT, quatre blocs plus haut,
// porté par des piliers. Le BÂTIMENT, derrière le quai, avec sa porte.
const GARE_LONG = 7;        // demi-longueur du quai, le long de la voie
// LE QUAI RECULE AVEC LA VOIE (v281). Il commençait à 1,9 — « où la voie
// finit » — quand la voie s'arrêtait à 1,6. La voie double allant jusqu'à
// `EMPRISE`, un quai resté à 1,9 serait POSÉ SUR LES RAILS. Les trois cotes se
// déduisent donc de l'emprise, et le jour où l'écartement change elles suivent.
const QUAI_DEDANS = EMPRISE + 0.2;   // le quai commence où le ballast finit
const QUAI_DEHORS = EMPRISE + 3.2;
const BATI_DEHORS = EMPRISE + 6.5;

// Les points de gare : les deux bouts de chaque segment. Deux segments d'une
// même ligne qui partagent leur ville-pivot y posent la même gare, et c'est
// juste — Lyon n'a qu'une gare.
export function garesDeTrain() {
  const out = [];
  for (const s of segmentsDeTrain()) {
    const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
    const l = Math.hypot(dx, dz) || 1;
    const ux = dx / l, uz = dz / l;
    out.push({ s, ville: s.de, x: s.x0, z: s.z0, ux, uz });
    out.push({ s, ville: s.vers, x: s.x1, z: s.z1, ux, uz });
  }
  return out;
}

const GARES = garesDeTrain();

// Ce qu'il faut poser à cette colonne, ou null. `l` est la distance le long de
// la voie, `t` la distance de côté (signée : le bâtiment ne va que d'un côté).
export function gareEn(x, z) {
  for (const g of GARES) {
    const ax = x - g.x, az = z - g.z;
    const l = ax * g.ux + az * g.uz;
    if (l < -GARE_LONG || l > GARE_LONG) continue;
    const t = ax * g.uz - az * g.ux;
    const at = t < 0 ? -t : t;
    if (at > BATI_DEHORS) continue;
    const p = profilDe(g.s);
    if (!p) continue;
    // la cote de la gare : celle des rails à son droit, prise une fois pour
    // que le quai soit PLAT — un quai qui suivrait la pente serait un talus.
    const k = Math.min(p.length - 1, Math.max(0, Math.round(
      ((g.x === g.s.x0 && g.z === g.s.z0) ? 0 : p.length - 1))));
    const cote = Math.round(p[k]);
    if (at < QUAI_DEDANS) return null;                 // la voie garde sa colonne
    if (at <= QUAI_DEHORS) return { quoi: 'quai', cote, l, bord: at > QUAI_DEHORS - 0.6 };
    if (t > 0 && l >= -5 && l <= 5) return { quoi: 'bati', cote, l };
    return { quoi: 'parvis', cote, l };
  }
  return null;
}

// À moins d'un bloc et demi d'une voie ? C'est le ballast (et la carte le
// dessine) ; à moins de trois, plus un arbre ne pousse — une voie dégagée.
export function surLaVoie(x, z) {
  for (const s of pres(x, z)) if (dSegment(s, x, z) < EMPRISE) return true;
  return false;
}

// QUATRE BLOCS, PAS TROIS. Un arbre planté à trois blocs de l'axe a une
// couronne qui déborde d'un bloc de plus : le train traversait des feuillages
// sur six des neuf lignes. On dégage donc la largeur de la voie PLUS celle
// d'une couronne.
export function presDeLaVoie(x, z) {
  // L'emprise PLUS la couronne d'un arbre, qui déborde d'un bloc de son tronc.
  // Le chiffre se déduit de l'emprise, il ne se réécrit pas : c'est lui qui
  // était resté à quatre quand la voie faisait trois blocs de large.
  for (const s of pres(x, z)) if (dSegment(s, x, z) < EMPRISE + 2.5) return true;
  return false;
}

// Le tracé roulant d'un segment : aller puis retour, la hauteur posée sur le
// terrain (jamais sous le niveau de l'eau : sur la mer, la voie devient un
// viaduc au ras des flots). `solDe` vient de main.js.
export function traceSegment(s, solDe, niveauEau) {
  const n = Math.max(2, Math.round(s.longueur / PAS));
  const p = profilDe(s);
  // CHACUN SA VOIE (v281). L'aller se décale d'`ENTRAXE` à DROITE de son sens
  // de marche, le retour d'autant à droite du SIEN — qui est l'autre bord de la
  // ligne. Les deux jambes ne partagent donc plus un seul point, et deux rames
  // qui se croisent passent côte à côte au lieu de se traverser. C'est la règle
  // de la conduite à droite des voitures (v271), appliquée au rail : pour une
  // direction (fx, fz), la droite vaut (−fz, fx).
  const lx = s.x1 - s.x0, lz = s.z1 - s.z0;
  const ll = Math.hypot(lx, lz) || 1;
  const dx = (-lz / ll) * ENTRAXE, dz = (lx / ll) * ENTRAXE;
  const alle = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = s.x0 + (s.x1 - s.x0) * t + dx, z = s.z0 + (s.z1 - s.z0) * t + dz;
    // LE TRAIN ROULE SUR SES RAILS, pas sur le terrain. C'est le même profil
    // que `world.js` pose : lu ailleurs, le convoi flotterait au-dessus des
    // remblais et s'enfoncerait dans les tranchées.
    let y;
    if (p) {
      const q = t * (p.length - 1);
      const j = Math.min(p.length - 2, Math.floor(q));
      y = Math.round(p[j] + (p[j + 1] - p[j]) * (q - j)) + 2.05;
    } else {
      y = Math.max(solDe(x, z), niveauEau) + 2.05;
    }
    alle.push({ x, y, z });
  }
  // Le retour longe l'AUTRE bord : on reprend les points de l'aller et on les
  // décale de deux fois l'entraxe dans l'autre sens — même profil, même cote,
  // voie voisine.
  const retour = alle.slice(1, -1).reverse()
    .map((q) => ({ x: q.x - 2 * dx, y: q.y, z: q.z - 2 * dz }));
  const pts = [...alle, ...retour];
  // les deux gares : la tête marque l'arrêt à chaque bout, dans chaque sens
  return { pts, arretsIndex: [0, alle.length - 1] };
}
