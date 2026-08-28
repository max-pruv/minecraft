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

// À moins d'un bloc et demi d'une voie ? C'est le ballast (et la carte le
// dessine) ; à moins de trois, plus un arbre ne pousse — une voie dégagée.
export function surLaVoie(x, z) {
  for (const s of pres(x, z)) if (dSegment(s, x, z) < 1.6) return true;
  return false;
}

export function presDeLaVoie(x, z) {
  for (const s of pres(x, z)) if (dSegment(s, x, z) < 3) return true;
  return false;
}

// Le tracé roulant d'un segment : aller puis retour, la hauteur posée sur le
// terrain (jamais sous le niveau de l'eau : sur la mer, la voie devient un
// viaduc au ras des flots). `solDe` vient de main.js.
export function traceSegment(s, solDe, niveauEau) {
  const n = Math.max(2, Math.round(s.longueur / PAS));
  const alle = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = s.x0 + (s.x1 - s.x0) * t, z = s.z0 + (s.z1 - s.z0) * t;
    alle.push({ x, y: Math.max(solDe(x, z), niveauEau) + 1.05, z });
  }
  const retour = alle.slice(1, -1).reverse();
  const pts = [...alle, ...retour];
  // les deux gares : la tête marque l'arrêt à chaque bout, dans chaque sens
  return { pts, arretsIndex: [0, alle.length - 1] };
}
