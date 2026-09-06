// Les avions : trois appareils, trois caractères.
//
// Max : « add planes, airbus, concord and military jets and allow us to fly
// with them at relevant speed for each ».
//
// CE QU'ON CHERCHE À RENDRE RECONNAISSABLE, dans l'ordre — la règle de
// jugement de ce projet est qu'un enfant doit identifier l'objet au premier
// regard :
//
//  - l'AVION DE LIGNE : un tube long, deux ailes en flèche portées bas, deux
//    réacteurs suspendus DEVANT et SOUS l'aile (c'est cela qu'on reconnaît, pas
//    la couleur), une dérive haute, et une rangée de hublots ;
//  - le CONCORDE : le nez fin et pointu, l'aile DELTA gothique qui court sur
//    presque toute la longueur, quatre réacteurs groupés sous le ventre, et
//    pas un seul empennage horizontal — c'est la silhouette la plus
//    identifiable de l'aviation civile ;
//  - le CHASSEUR : court et trapu, entrées d'air latérales, verrière en bulle,
//    aile trapézoïdale et DEUX dérives inclinées, deux missiles sous les
//    ailes.
//
// LES NOMS SONT DES TYPES, PAS DES MARQUES — invariant 4 du projet : rien
// d'une propriété intellectuelle. « Avion de ligne », « Concorde » (un type
// d'appareil, retiré du service depuis 2003) et « Avion de chasse ».
//
// L'ÉCHELLE. Une voiture du jeu fait 4,4 blocs de long ; un avion de ligne en
// fait seize, soit près de quatre fois. C'est assez pour qu'il domine le
// tarmac sans devenir un bâtiment : à sa vraie échelle (37 mètres, donc
// trente-sept blocs) il serait plus long qu'un pâté de maisons de Manhattan.
// C'est la même convention à deux échelles que les monuments.

import { Atelier } from './modeles.js';

const BLANC = 0xf0f0ea;
const BLEU = 0x1a3a8c;
const ROUGE = 0xc02828;
const GRIS = 0x9aa0a8;
const SOMBRE = 0x2a2e34;
const VERRE = 0x2a3a4a;
const ACIER = 0x6a7078;
const KAKI = 0x6a7060;

// Un fuselage : un cylindre couché, plus un cône pour le nez et une queue qui
// remonte. `long` est la demi-longueur, `r` le rayon.
function fuselage(a, { longueur, r, couleur, nez = 1.4, y = 0 }) {
  a.cylindre(couleur, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], e: [r, longueur, r], haut: 0.5, bas: 0.5, seg: 12 });
  a.cone(couleur, { p: [0, y, -longueur / 2 - nez / 2], r: [-Math.PI / 2, 0, 0], e: [r, nez, r], seg: 12 });
  // la queue, qui se relève et s'affine — c'est ce qui fait qu'un avion n'est
  // pas un tuyau coupé net
  a.cone(couleur, { p: [0, y + r * 0.45, longueur / 2 + nez * 0.7], r: [Math.PI / 2, 0, 0], e: [r * 0.8, nez * 1.6, r * 0.8], seg: 12 });
}

// Une aile en flèche : une plaque effilée, inclinée vers l'arrière.
function aile(a, { envergure, corde, epaisseur, fleche, couleur, y, z, dievre = 0.06 }) {
  for (const s of [-1, 1]) {
    a.boite(couleur, {
      p: [s * envergure / 4, y + Math.abs(s) * dievre * envergure / 4, z + fleche / 2],
      r: [0, s * -Math.atan2(fleche, envergure / 2), s * dievre],
      e: [envergure / 2, epaisseur, corde],
    });
  }
}

// Un réacteur suspendu : la nacelle, et l'anneau sombre de l'entrée d'air.
function reacteur(a, { x, y, z, longueur, r, couleur = GRIS }) {
  a.cylindre(couleur, { p: [x, y, z], r: [Math.PI / 2, 0, 0], e: [r, longueur, r], haut: 0.5, bas: 0.5, seg: 10 });
  a.cylindre(SOMBRE, { p: [x, y, z - longueur / 2 - 0.02], r: [Math.PI / 2, 0, 0], e: [r * 0.86, 0.12, r * 0.86], haut: 0.5, bas: 0.5, seg: 10 });
}

// Une rangée de hublots : c'est ce qui dit « on monte dedans ».
function hublots(a, { de, a: jusqua, y, r, pas = 0.62 }) {
  for (let z = de; z <= jusqua; z += pas) {
    for (const s of [-1, 1]) {
      a.boite(VERRE, { p: [s * r * 0.94, y, z], e: [0.05, 0.16, 0.22] });
    }
  }
}

function fini(a) {
  const g = a.finir();
  // `legs` doit exister même vide : la boucle de monte la parcourt pour faire
  // balancer les pattes, et un avion n'en a pas. Même contrat que la voiture.
  g.userData.legs = [];
  return g;
}

// --- l'avion de ligne --------------------------------------------------------
export function avionDeLigne() {
  const a = new Atelier();
  const L = 16, r = 1.05, y = 1.9;
  fuselage(a, { longueur: L, r, couleur: BLANC, nez: 2.2, y });
  // la bande de livrée, qui court sur toute la longueur
  a.boite(BLEU, { p: [0, y - 0.28, 0], e: [r * 2.02, 0.3, L * 0.92] });
  hublots(a, { de: -L / 2 + 1.6, a: L / 2 - 2.2, y: y + 0.34, r });
  // le cockpit
  a.boite(VERRE, { p: [0, y + 0.42, -L / 2 - 1.1], e: [r * 1.2, 0.34, 0.5] });
  // l'aile basse, en flèche
  aile(a, { envergure: 15, corde: 3.2, epaisseur: 0.24, fleche: 2.4, couleur: BLANC, y: y - 0.5, z: 0.6 });
  // les deux réacteurs, DEVANT et SOUS l'aile — c'est cela qu'on reconnaît
  for (const s of [-1, 1]) reacteur(a, { x: s * 3.4, y: y - 1.15, z: -0.6, longueur: 2.6, r: 0.62 });
  // l'empennage : la dérive haute et le plan horizontal
  a.boite(BLEU, { p: [0, y + 1.9, L / 2 + 1.2], r: [0, 0, 0], e: [0.18, 2.6, 2.2] });
  aile(a, { envergure: 5.4, corde: 1.4, epaisseur: 0.18, fleche: 1.0, couleur: BLANC, y: y + 0.5, z: L / 2 + 1.6, dievre: 0 });
  // le train : trois jambes, sorties — un avion garé est posé sur ses roues
  for (const [x, z] of [[0, -L / 2 + 1.2], [-1.5, 1.2], [1.5, 1.2]]) {
    a.cylindre(SOMBRE, { p: [x, y - 1.7, z], e: [0.12, 1.4, 0.12], haut: 0.5, bas: 0.5, seg: 6 });
    a.cylindre(SOMBRE, { p: [x, y - 2.4, z], r: [0, 0, Math.PI / 2], e: [0.42, 0.24, 0.42], haut: 0.5, bas: 0.5, seg: 8 });
  }
  return fini(a);
}

// --- le Concorde -------------------------------------------------------------
export function concorde() {
  const a = new Atelier();
  const L = 20, r = 0.7, y = 2.0;
  fuselage(a, { longueur: L, r, couleur: BLANC, nez: 4.4, y });
  hublots(a, { de: -L / 2 + 2, a: L / 2 - 3, y: y + 0.2, r, pas: 0.8 });
  a.boite(VERRE, { p: [0, y + 0.3, -L / 2 - 2.0], e: [r * 1.1, 0.24, 0.5] });
  // L'AILE DELTA GOTHIQUE, en trois panneaux de flèche décroissante : c'est
  // elle, et non le nez, qui rend le Concorde reconnaissable de loin.
  const panneaux = [
    { env: 4.2, corde: 5.0, z: -3.2, fleche: 3.6 },
    { env: 7.4, corde: 6.4, z: 0.6, fleche: 3.0 },
    { env: 9.6, corde: 5.0, z: 4.2, fleche: 1.4 },
  ];
  for (const p of panneaux) {
    aile(a, { envergure: p.env, corde: p.corde, epaisseur: 0.2, fleche: p.fleche, couleur: BLANC, y: y - 0.5, z: p.z, dievre: 0.02 });
  }
  // les quatre réacteurs, groupés par deux sous le ventre de l'aile
  for (const s of [-1, 1]) {
    for (const d of [-0.72, 0.72]) {
      reacteur(a, { x: s * 2.4 + d, y: y - 1.0, z: 5.4, longueur: 4.4, r: 0.4, couleur: ACIER });
    }
  }
  // la dérive, haute et effilée — et PAS d'empennage horizontal
  a.boite(BLANC, { p: [0, y + 2.0, L / 2 + 1.0], e: [0.16, 3.0, 2.6] });
  for (const [x, z] of [[0, -L / 2 + 2.0], [-1.3, 4.0], [1.3, 4.0]]) {
    a.cylindre(SOMBRE, { p: [x, y - 1.7, z], e: [0.1, 1.5, 0.1], haut: 0.5, bas: 0.5, seg: 6 });
    a.cylindre(SOMBRE, { p: [x, y - 2.45, z], r: [0, 0, Math.PI / 2], e: [0.34, 0.2, 0.34], haut: 0.5, bas: 0.5, seg: 8 });
  }
  return fini(a);
}

// --- l'avion de chasse -------------------------------------------------------
export function avionDeChasse() {
  const a = new Atelier();
  const L = 10, r = 0.62, y = 1.6;
  fuselage(a, { longueur: L, r, couleur: GRIS, nez: 2.6, y });
  // le camouflage : deux taches sombres sur le dos, rien de plus
  a.boite(KAKI, { p: [0, y + r * 0.7, -1.2], e: [r * 1.4, 0.1, 3.0] });
  a.boite(KAKI, { p: [0, y + r * 0.7, 2.6], e: [r * 1.2, 0.1, 2.0] });
  // la verrière en bulle, posée haut et en avant
  a.demiSphere(VERRE, { p: [0, y + r * 0.8, -1.8], e: [0.52, 0.52, 1.5], seg: 12 });
  // les entrées d'air latérales, sous la verrière
  for (const s of [-1, 1]) {
    a.boite(SOMBRE, { p: [s * (r + 0.24), y - 0.1, -0.4], e: [0.26, 0.5, 2.2] });
  }
  // l'aile trapézoïdale, moyenne et en flèche marquée
  aile(a, { envergure: 8.0, corde: 2.6, epaisseur: 0.16, fleche: 2.2, couleur: GRIS, y: y - 0.1, z: 1.4, dievre: 0 });
  // les canards, à l'avant — la signature d'un chasseur moderne
  aile(a, { envergure: 3.4, corde: 0.9, epaisseur: 0.12, fleche: 0.7, couleur: GRIS, y: y + 0.1, z: -2.2, dievre: 0 });
  // DEUX dérives inclinées vers l'extérieur
  for (const s of [-1, 1]) {
    a.boite(GRIS, { p: [s * 0.9, y + 1.1, L / 2 + 0.4], r: [0, 0, s * 0.32], e: [0.14, 1.9, 1.6] });
  }
  // la tuyère
  a.cylindre(SOMBRE, { p: [0, y, L / 2 + 1.4], r: [Math.PI / 2, 0, 0], e: [r * 0.9, 0.5, r * 0.9], haut: 0.5, bas: 0.5, seg: 10 });
  // deux missiles en bout d'aile
  for (const s of [-1, 1]) {
    a.cylindre(BLANC, { p: [s * 3.9, y - 0.2, 1.2], r: [Math.PI / 2, 0, 0], e: [0.13, 2.2, 0.13], haut: 0.5, bas: 0.5, seg: 8 });
    a.cone(ROUGE, { p: [s * 3.9, y - 0.2, 0.0], r: [-Math.PI / 2, 0, 0], e: [0.13, 0.5, 0.13], seg: 8 });
  }
  for (const [x, z] of [[0, -L / 2 + 1.4], [-1.0, 1.6], [1.0, 1.6]]) {
    a.cylindre(SOMBRE, { p: [x, y - 1.35, z], e: [0.09, 1.1, 0.09], haut: 0.5, bas: 0.5, seg: 6 });
    a.cylindre(SOMBRE, { p: [x, y - 1.95, z], r: [0, 0, Math.PI / 2], e: [0.3, 0.18, 0.3], haut: 0.5, bas: 0.5, seg: 8 });
  }
  return fini(a);
}

export const MODELES_AVION = {
  avionligne: avionDeLigne,
  concorde,
  chasseur: avionDeChasse,
};
