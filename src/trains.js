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
const CASE = 512;
const INDEX_RAILS = new Map();
for (const s of segmentsDeTrain()) {
  const n = Math.ceil(s.longueur / (CASE / 2)) + 1;
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
    if (d >= 1.6 || (best && d >= best.d)) continue;
    const p = profilDe(s);
    if (!p) continue;
    const t = tSegment(s, x, z) * (p.length - 1);
    const k = Math.min(p.length - 2, Math.floor(t));
    best = { d, cote: Math.round(p[k] + (p[k + 1] - p[k]) * (t - k)) };
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
const QUAI_DEDANS = 1.9;    // le quai commence où la voie finit
const QUAI_DEHORS = 3.4;
const BATI_DEHORS = 7;

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
  for (const s of pres(x, z)) if (dSegment(s, x, z) < 1.6) return true;
  return false;
}

// QUATRE BLOCS, PAS TROIS. Un arbre planté à trois blocs de l'axe a une
// couronne qui déborde d'un bloc de plus : le train traversait des feuillages
// sur six des neuf lignes. On dégage donc la largeur de la voie PLUS celle
// d'une couronne.
export function presDeLaVoie(x, z) {
  for (const s of pres(x, z)) if (dSegment(s, x, z) < 4) return true;
  return false;
}

// Le tracé roulant d'un segment : aller puis retour, la hauteur posée sur le
// terrain (jamais sous le niveau de l'eau : sur la mer, la voie devient un
// viaduc au ras des flots). `solDe` vient de main.js.
export function traceSegment(s, solDe, niveauEau) {
  const n = Math.max(2, Math.round(s.longueur / PAS));
  const p = profilDe(s);
  const alle = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = s.x0 + (s.x1 - s.x0) * t, z = s.z0 + (s.z1 - s.z0) * t;
    // LE TRAIN ROULE SUR SES RAILS, pas sur le terrain. C'est le même profil
    // que `world.js` pose : lu ailleurs, le convoi flotterait au-dessus des
    // remblais et s'enfoncerait dans les tranchées.
    let y;
    if (p) {
      const q = t * (p.length - 1);
      const j = Math.min(p.length - 2, Math.floor(q));
      y = Math.round(p[j] + (p[j + 1] - p[j]) * (q - j)) + 1.05;
    } else {
      y = Math.max(solDe(x, z), niveauEau) + 1.05;
    }
    alle.push({ x, y, z });
  }
  const retour = alle.slice(1, -1).reverse();
  const pts = [...alle, ...retour];
  // les deux gares : la tête marque l'arrêt à chaque bout, dans chaque sens
  return { pts, arretsIndex: [0, alle.length - 1] };
}
