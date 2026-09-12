// Les avions : trois appareils, trois caractères.
//
// Max : « add planes, airbus, concord and military jets and allow us to fly
// with them at relevant speed for each », puis, deux versions plus tard et
// capture à l'appui : « fix plane design, they are not realistic ».
//
// TROIS DÉFAUTS MESURÉS, ET AUCUN N'ÉTAIT AFFAIRE DE GOÛT (v232).
//
//  1. `r` ÉTAIT UN RAYON DANS LES TÊTES ET UN DIAMÈTRE DANS LE CODE. L'atelier
//     met à l'échelle une primitive UNITAIRE : `e: [r, L, r]` sur un cylindre
//     donne un fuselage de r blocs de DIAMÈTRE. Tout ce qui se plaçait « sur
//     la peau » à `0,94 r` ou `1,2 r` tombait donc DEHORS. Mesuré sur l'avion
//     de ligne : fuselage de 1,05 bloc d'épaisseur, hublots posés à ±0,99 —
//     presque le double du rayon, flottant en l'air — et une bande de livrée
//     de 2,12 de large, deux fois le fuselage : c'est elle qu'on voyait, une
//     planche bleue plus grosse que l'avion. `r` est désormais un RAYON
//     partout, et les pièces de peau retombent sur la peau.
//  2. LE MODÈLE NE TENAIT PAS DANS LE GABARIT QU'IL LIT. `aeroport.js` déclare
//     seize blocs pour l'avion de ligne et dimensionne les postes dessus ; le
//     modèle en mesurait 21,5. Le Concorde : vingt déclarés, TRENTE ET UN
//     rendus — plus que son poste et son passage réunis, donc à cheval sur le
//     voisin. Les cônes de nez et de queue s'ajoutaient à `long` au lieu d'être
//     dedans. `long` est maintenant la longueur TOTALE, nez et queue compris.
//  3. IL S'ENFONÇAIT DANS LE SOL. Le train descendait à −0,62 sous l'origine :
//     un avion garé avait les roues enterrées jusqu'à l'essieu. Rien ne passe
//     plus sous y = 0, et les roues touchent le sol exactement.
//
// ET LA QUATRIÈME CHOSE NE SE MESURE PAS, ELLE SE REGARDE : UNE AILE EST
// EFFILÉE. Une plaque à corde constante est LE signal « jouet » — c'est ce
// que Max voyait. Les rapports d'effilement sont ceux des vrais appareils
// (0,25 pour l'avion de ligne, une pointe pour le delta du Concorde), et ils
// se paient d'une géométrie à part : une boîte ne s'effile pas.
//
// CE QU'ON CHERCHE À RENDRE RECONNAISSABLE, dans l'ordre — la règle de
// jugement de ce projet est qu'un enfant doit identifier l'objet au premier
// regard :
//
//  - l'AVION DE LIGNE : un tube long, deux ailes en flèche portées bas, deux
//    réacteurs suspendus DEVANT et SOUS l'aile par un mât (c'est cela qu'on
//    reconnaît, pas la couleur), une dérive haute et en flèche, une rangée de
//    hublots ;
//  - le CONCORDE : le nez fin et pointu, l'aile DELTA gothique qui court sur
//    presque toute la longueur, quatre réacteurs groupés sous le ventre, et
//    pas un seul empennage horizontal — c'est la silhouette la plus
//    identifiable de l'aviation civile ;
//  - le CHASSEUR : court et trapu, entrées d'air latérales, verrière en bulle,
//    delta-canard et DEUX dérives inclinées, deux missiles sous les ailes.
//
// LES NOMS SONT DES TYPES, PAS DES MARQUES — invariant 4 du projet : rien
// d'une propriété intellectuelle. « Avion de ligne », « Concorde » (un type
// d'appareil, retiré du service depuis 2003) et « Avion de chasse ».
//
// L'ÉCHELLE. Une voiture du jeu fait 4,4 blocs de long ; un avion de ligne en
// fait seize, soit près de quatre fois. C'est assez pour qu'il domine le
// tarmac sans devenir un bâtiment : à sa vraie échelle (37 mètres, donc
// trente-sept blocs) il serait plus long qu'un pâté de maisons de Manhattan.
// C'est la même convention à deux échelles que les monuments. TOUT LE RESTE
// se déduit de cette longueur par le rapport RÉEL de l'appareil — un fuselage
// d'avion de ligne fait 4 m pour 37,6 de long, donc 0,106 fois sa longueur, et
// c'est ce chiffre qui est écrit ici, jamais une valeur choisie à l'œil.

import * as THREE from 'three';
import { Atelier } from './modeles.js';
// LES DIMENSIONS VIENNENT DU PLAN DE L'AÉROPORT, PAS D'ICI. C'est la même
// table qui dimensionne l'aire de stationnement et qui taille les modèles :
// deux tables qui décrivent le même appareil finissent toujours par diverger,
// et l'on se retrouve avec un Concorde plus long que son poste. `aeroport.js`
// ne tire aucune bibliothèque 3D, l'import est donc gratuit dans les deux sens.
import { GABARITS_AVION } from './aeroport.js';

const BLANC = 0xf0f0ea;
const BLEU = 0x1a3a8c;
const ROUGE = 0xc02828;
const GRIS = 0x9aa0a8;
const SOMBRE = 0x2a2e34;
const VERRE = 0x2a3a4a;
const ACIER = 0x6a7078;
const KAKI = 0x6a7060;

// --- une surface portante ----------------------------------------------------
//
// UNE AILE EST UN TRAPÈZE, PAS UN RECTANGLE, et c'est la seule pièce qui ne se
// fabrique pas avec les primitives de l'atelier. On donne les quatre coins du
// plan (bord d'attaque et bord de fuite, à l'emplanture et au saumon) et une
// épaisseur qui DIMINUE vers le bout — une aile réelle s'amincit autant
// qu'elle se rétrécit.
//
// La géométrie est rendue NON INDEXÉE à dessein : `computeVertexNormals`
// donne alors des facettes franches. Indexée, elle lisserait les arêtes et
// l'aile aurait l'air d'un coussin.
// `axe` dit dans QUELLE direction l'épaisseur se déploie : en y pour une aile
// couchée, en x pour une dérive debout. Une dérive épaissie en y serait un
// panneau d'épaisseur nulle vu de côté — invisible, puis clignotante.
function prisme(coins, axe = 'y') {
  const haut = [], bas = [];
  for (const c of coins) {
    if (axe === 'x') {
      haut.push([c.x + c.t, c.y, c.z]);
      bas.push([c.x - c.t, c.y, c.z]);
    } else {
      haut.push([c.x, c.y + c.t, c.z]);
      bas.push([c.x, c.y - c.t, c.z]);
    }
  }
  const quads = [
    [haut[0], haut[1], haut[2], haut[3]],           // l'extrados
    [bas[3], bas[2], bas[1], bas[0]],               // l'intrados
    [haut[3], haut[2], bas[2], bas[3]],             // les quatre chants
    [haut[1], haut[0], bas[0], bas[1]],
    [haut[2], haut[1], bas[1], bas[2]],
    [haut[0], haut[3], bas[3], bas[0]],
  ];
  const pos = [];
  for (const [a, b, c, d] of quads) {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

// Une voilure complète : les deux demi-ailes dans une seule géométrie. On ne
// pose PAS une demi-aile deux fois avec une échelle négative en x — une
// symétrie retourne l'orientation des faces, et la moitié gauche de l'avion
// serait éclairée à l'envers.
//
//   demi         demi-envergure, du plan de symétrie au saumon
//   corde        corde à l'emplanture, puis au saumon
//   fleche       recul du bord d'attaque entre l'emplanture et le saumon
//   z            position du bord d'attaque à l'emplanture
//   dievre       montée du saumon (le dièdre, en blocs)
//   ep           épaisseur à l'emplanture ; le saumon en garde 40 %
function voilure({ demi, cordeEmplanture, cordeSaumon, fleche, z, y = 0, dievre = 0, ep }) {
  const geos = [];
  for (const s of [-1, 1]) {
    geos.push(prisme([
      { x: 0, y, z, t: ep / 2 },
      { x: s * demi, y: y + dievre, z: z + fleche, t: ep * 0.2 },
      { x: s * demi, y: y + dievre, z: z + fleche + cordeSaumon, t: ep * 0.2 },
      { x: 0, y, z: z + cordeEmplanture, t: ep / 2 },
    ]));
  }
  return fusionner(geos);
}

// Une dérive : le même trapèze, mais debout. `haut` est sa hauteur au-dessus
// de son pied, `inclinaison` l'angle vers l'extérieur (les chasseurs en ont
// deux, penchées).
function derive({ hauteur, cordeBas, cordeHaut, fleche, z, y, x = 0, ep, inclinaison = 0 }) {
  const dx = Math.sin(inclinaison) * hauteur, dy = Math.cos(inclinaison) * hauteur;
  return prisme([
    { x, y, z, t: ep / 2 },
    { x: x + dx, y: y + dy, z: z + fleche, t: ep * 0.3 },
    { x: x + dx, y: y + dy, z: z + fleche + cordeHaut, t: ep * 0.3 },
    { x, y, z: z + cordeBas, t: ep / 2 },
  ], 'x');
}

function fusionner(geos) {
  const pos = [];
  for (const g of geos) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

// --- un fuselage -------------------------------------------------------------
//
// `rayon` est un RAYON (voir l'en-tête), `longueur` la longueur TOTALE, nez et
// queue compris : c'est elle que l'aéroport réserve au poste de stationnement.
// Le nez est arrondi par une calotte — un cône nu fait un crayon taillé, et
// aucun avion de ligne n'a le nez pointu. La queue, elle, s'affine ET se
// relève : c'est l'arrière-corps qui donne son profil à un avion.
function fuselage(a, { longueur, rayon, couleur, nez, queue, y = 0, nezPointu = false }) {
  const barillet = longueur - nez - queue;
  const z0 = -longueur / 2;
  const d = rayon * 2;
  a.cylindre(couleur, {
    p: [0, y, z0 + nez + barillet / 2], r: [Math.PI / 2, 0, 0],
    e: [d, barillet, d], haut: 0.5, bas: 0.5, seg: 14,
  });
  // le nez : un tronc de cône court, puis la calotte qui l'arrondit
  a.cylindre(couleur, {
    p: [0, y, z0 + nez * 0.6], r: [Math.PI / 2, 0, 0],
    e: [d, nez * 0.8, d], haut: 0.5, bas: 0.30, seg: 14,
  });
  // UN NEZ D'AVION DE LIGNE EST ARRONDI, CELUI D'UN CHASSEUR EST POINTU : le
  // cône de radar est sa signature, et une calotte lui donnait un air de
  // requin. Vu en capture, pas déduit.
  if (nezPointu) {
    a.cone(couleur, { p: [0, y, z0 + nez * 0.21], r: [-Math.PI / 2, 0, 0], e: [d * 0.62, nez * 0.42, d * 0.62], seg: 12 });
  } else {
    a.sphere(couleur, { p: [0, y, z0 + nez * 0.28], e: [d * 0.6, d * 0.6, nez * 0.55], seg: 12 });
  }
  // la queue : elle s'affine et remonte, sinon l'avion est un tuyau coupé net
  a.cylindre(couleur, {
    p: [0, y + rayon * 0.30, longueur / 2 - queue / 2], r: [Math.PI / 2 - 0.10, 0, 0],
    e: [d, queue * 0.96, d], haut: 0.16, bas: 0.5, seg: 14,
  });
}

// Un réacteur suspendu : la nacelle, l'anneau sombre de l'entrée d'air, et LE
// MÂT qui la rattache à l'aile. Sans le mât, le réacteur flotte sous l'aile —
// c'est ce qu'on voyait, et c'est ce qui fait « maquette ».
function reacteur(a, { x, y, z, longueur, rayon, yAile, couleur = GRIS }) {
  const d = rayon * 2;
  a.cylindre(couleur, { p: [x, y, z], r: [Math.PI / 2, 0, 0], e: [d, longueur, d], haut: 0.46, bas: 0.5, seg: 12 });
  a.cylindre(SOMBRE, { p: [x, y, z - longueur / 2 - 0.03], r: [Math.PI / 2, 0, 0], e: [d * 0.84, 0.14, d * 0.84], haut: 0.5, bas: 0.5, seg: 12 });
  a.cylindre(SOMBRE, { p: [x, y, z + longueur / 2 - 0.06], r: [Math.PI / 2, 0, 0], e: [d * 0.62, 0.2, d * 0.62], haut: 0.5, bas: 0.5, seg: 10 });
  if (yAile !== undefined) {
    a.boite(couleur, { p: [x, (y + rayon + yAile) / 2, z + longueur * 0.28], e: [0.16, Math.max(0.1, yAile - y - rayon * 0.6), longueur * 0.5] });
  }
}

// Une rangée de hublots : c'est ce qui dit « on monte dedans ». Ils sont posés
// SUR la peau — à `0,97 rayon`, donc juste dedans, jamais au-delà.
function hublots(a, { de, a: jusqua, y, rayon, pas = 0.62 }) {
  for (let z = de; z <= jusqua; z += pas) {
    for (const s of [-1, 1]) {
      a.boite(VERRE, { p: [s * rayon * 0.97, y, z], e: [0.05, 0.16, 0.22] });
    }
  }
}

// Le train : une jambe et une roue, POSÉE SUR LE SOL. `sol` est la cote du
// terrain sous l'appareil (zéro), et c'est elle qui décide du reste : rien du
// modèle ne descend en dessous.
function train(a, { x, z, ventre, rayonRoue = 0.26 }) {
  a.cylindre(SOMBRE, {
    p: [x, (ventre + rayonRoue) / 2, z],
    e: [0.13, Math.max(0.05, ventre - rayonRoue), 0.13], haut: 0.5, bas: 0.5, seg: 6,
  });
  a.cylindre(SOMBRE, {
    p: [x, rayonRoue, z], r: [0, 0, Math.PI / 2],
    e: [rayonRoue * 2, 0.22, rayonRoue * 2], haut: 0.5, bas: 0.5, seg: 10,
  });
}

function fini(a) {
  const g = a.finir();
  // `legs` doit exister même vide : la boucle de monte la parcourt pour faire
  // balancer les pattes, et un avion n'en a pas. Même contrat que la voiture.
  g.userData.legs = [];
  return g;
}

// --- l'avion de ligne --------------------------------------------------------
//
// Les rapports sont ceux d'un biréacteur court-courrier : 37,6 m de long,
// 35,8 d'envergure, 4,0 de fuselage, 11,8 au sommet de la dérive. À seize
// blocs de long, l'échelle est de 0,426 bloc par mètre, et tout ce qui suit en
// découle.
export function avionDeLigne() {
  const a = new Atelier();
  const L = GABARITS_AVION.avionligne.long;      // 16
  const k = L / 37.6;                            // 0,426 bloc par mètre
  const rayon = 4.0 / 2 * k;                     // 0,85
  const y = 3.8 * k;                             // l'axe du fuselage, 3,8 m au-dessus du sol
  fuselage(a, { longueur: L, rayon, couleur: BLANC, nez: 4.6 * k, queue: 9.5 * k, y });
  // LA BANDE DE LIVRÉE SUIT LA PEAU. Large de 1,9 rayon elle reste dans le
  // fuselage : c'est un trait sur le flanc, pas une planche sous l'avion.
  a.boite(BLEU, { p: [0, y - rayon * 0.52, 0.4], e: [rayon * 1.86, 0.26, L * 0.66] });
  hublots(a, { de: -L / 2 + 2.4, a: L / 2 - 4.4, y: y + rayon * 0.34, rayon });
  // le cockpit, sur le nez arrondi
  a.boite(VERRE, { p: [0, y + rayon * 0.42, -L / 2 + 1.0], e: [rayon * 1.5, 0.3, 0.7] });
  // L'AILE BASSE ET EFFILÉE. Envergure 35,8 m ; corde 6,0 à l'emplanture et
  // 1,5 au saumon (effilement 0,25) ; flèche du bord d'attaque 27°, donc
  // 7,6 blocs de demi-envergure reculent de 3,9 ; dièdre 5°.
  const demi = 35.8 / 2 * k;                     // 7,62
  const yAile = y - rayon * 0.72;
  a.geometrie(voilure({
    demi, cordeEmplanture: 6.0 * k, cordeSaumon: 1.5 * k,
    fleche: demi * Math.tan(0.47), z: -1.1, y: yAile, dievre: demi * Math.tan(0.087), ep: 0.30,
  }), BLANC);
  // LES DEUX RÉACTEURS, DEVANT ET SOUS L'AILE, PENDUS À LEUR MÂT — c'est cela
  // qu'on reconnaît. Ø 2,4 m, longueur 4,4, à 34 % de la demi-envergure.
  const xm = demi * 0.34;
  const yAileLa = yAile + xm * Math.tan(0.087);
  for (const s of [-1, 1]) {
    reacteur(a, {
      x: s * xm, y: yAileLa - 0.62, z: -1.1 + xm * Math.tan(0.47) - 0.35,
      longueur: 4.4 * k, rayon: 2.4 / 2 * k, yAile: yAileLa,
    });
  }
  // L'EMPENNAGE. La dérive monte à 11,8 m du sol, donc à `11,8 k` — et elle
  // est EN FLÈCHE, comme toutes les dérives : un rectangle bleu planté sur la
  // queue, c'est le défaut que Max a vu.
  a.geometrie(derive({
    hauteur: 11.8 * k - (y + rayon * 0.3), cordeBas: 3.4, cordeHaut: 1.5,
    fleche: 1.9, z: L / 2 - 4.0, y: y + rayon * 0.3, ep: 0.24,
  }), BLEU);
  // le plan horizontal, effilé lui aussi
  a.geometrie(voilure({
    demi: 12.4 / 2 * k, cordeEmplanture: 2.2, cordeSaumon: 0.8,
    fleche: 1.0, z: L / 2 - 2.6, y: y + rayon * 0.34, ep: 0.20,
  }), BLANC);
  // le train, sorti : un avion garé est posé sur ses roues, pas enterré
  const ventre = y - rayon;
  train(a, { x: 0, z: -L / 2 + 1.8, ventre, rayonRoue: 0.22 });
  for (const s of [-1, 1]) train(a, { x: s * 1.1, z: 0.9, ventre, rayonRoue: 0.28 });
  return fini(a);
}

// --- le Concorde -------------------------------------------------------------
//
// 61,7 m de long, 25,6 d'envergure, 2,9 de fuselage, 12,2 au sommet. À vingt
// blocs, l'échelle est de 0,324 bloc par mètre. Sa FINESSE est sa signature :
// un fuselage de 0,94 bloc pour vingt de long, là où l'avion de ligne en a
// 1,7 pour seize. On ne l'épaissit pas pour qu'il « se voie mieux ».
export function concorde() {
  const a = new Atelier();
  const L = GABARITS_AVION.concorde.long;        // 20
  const k = L / 61.7;                            // 0,324
  const rayon = 2.9 / 2 * k;                     // 0,47
  const y = 3.6 * k + 0.55;                      // il est haut sur pattes
  fuselage(a, { longueur: L, rayon, couleur: BLANC, nez: 11.0 * k, queue: 12.0 * k, y });
  hublots(a, { de: -L / 2 + 4.2, a: L / 2 - 5.0, y: y + rayon * 0.2, rayon, pas: 0.8 });
  a.boite(VERRE, { p: [0, y + rayon * 0.5, -L / 2 + 3.4], e: [rayon * 1.5, 0.2, 0.6] });
  // L'AILE DELTA OGIVALE, en trois panneaux de flèche décroissante — et
  // CHACUN S'EFFILE, jusqu'à la pointe du saumon. C'est elle, et non le nez,
  // qui rend le Concorde reconnaissable de loin.
  const demi = 25.6 / 2 * k;                     // 4,15
  const yAile = y - rayon * 0.75;
  const panneaux = [
    { d0: 0, d1: demi * 0.42, z: -3.6, fleche: 3.2, c0: 7.4, c1: 6.0 },
    { d0: demi * 0.42, d1: demi * 0.78, z: 0.6, fleche: 2.1, c0: 6.0, c1: 3.4 },
    { d0: demi * 0.78, d1: demi, z: 3.5, fleche: 0.9, c0: 3.4, c1: 0.5 },
  ];
  for (const p of panneaux) {
    for (const s of [-1, 1]) {
      a.geometrie(prisme([
        { x: s * p.d0, y: yAile, z: p.z, t: 0.13 },
        { x: s * p.d1, y: yAile + 0.06, z: p.z + p.fleche, t: 0.09 },
        { x: s * p.d1, y: yAile + 0.06, z: p.z + p.fleche + p.c1, t: 0.09 },
        { x: s * p.d0, y: yAile, z: p.z + p.c0, t: 0.13 },
      ]), BLANC);
    }
  }
  // les quatre réacteurs, groupés par deux sous le ventre de l'aile
  for (const s of [-1, 1]) {
    for (const d of [-0.44, 0.44]) {
      reacteur(a, {
        x: s * 1.5 + d, y: yAile - 0.34, z: 4.4,
        longueur: 11.6 * k, rayon: 1.2 / 2 * k * 1.6, couleur: ACIER,
      });
    }
  }
  // la dérive, haute et effilée — et PAS d'empennage horizontal
  a.geometrie(derive({
    hauteur: 12.2 * k - (y + rayon * 0.3), cordeBas: 4.0, cordeHaut: 1.4,
    fleche: 2.4, z: L / 2 - 5.0, y: y + rayon * 0.3, ep: 0.20,
  }), BLANC);
  const ventre = y - rayon;
  train(a, { x: 0, z: -L / 2 + 4.4, ventre, rayonRoue: 0.20 });
  for (const s of [-1, 1]) train(a, { x: s * 1.05, z: 3.6, ventre, rayonRoue: 0.24 });
  return fini(a);
}

// --- l'avion de chasse -------------------------------------------------------
//
// 15,3 m de long, 10,9 d'envergure, 5,3 au sommet. À dix blocs, l'échelle est
// de 0,654 bloc par mètre — c'est le plus trapu des trois, et le seul dont le
// fuselage soit large par rapport à sa longueur (2,0 m pour 15,3).
export function avionDeChasse() {
  const a = new Atelier();
  const L = GABARITS_AVION.chasseur.long;        // 10
  const k = L / 15.3;                            // 0,654
  const rayon = 2.0 / 2 * k;                     // 0,65
  const y = 1.55;
  fuselage(a, { longueur: L, rayon, couleur: GRIS, nez: 4.2 * k, queue: 3.4 * k, y, nezPointu: true });
  // le camouflage : deux taches sombres sur le dos, rien de plus
  a.boite(KAKI, { p: [0, y + rayon * 0.82, -0.9], e: [rayon * 1.3, 0.1, 2.4] });
  a.boite(KAKI, { p: [0, y + rayon * 0.82, 2.0], e: [rayon * 1.1, 0.1, 1.6] });
  // la verrière en bulle, posée haut et en avant
  a.demiSphere(VERRE, { p: [0, y + rayon * 0.72, -1.9], e: [rayon * 1.25, 0.62, 1.9], seg: 14 });
  // les entrées d'air latérales, PLAQUÉES sur le flanc — elles flottaient
  for (const s of [-1, 1]) {
    a.boite(SOMBRE, { p: [s * (rayon * 0.92), y - 0.16, -0.5], e: [0.3, 0.52, 2.0] });
  }
  // L'AILE DELTA, effilée jusqu'au saumon. Envergure 10,9 m, flèche 48°.
  const demi = 10.9 / 2 * k;                     // 3,56
  a.geometrie(voilure({
    demi, cordeEmplanture: 3.6, cordeSaumon: 0.7,
    fleche: demi * Math.tan(0.84), z: -0.9, y: y - rayon * 0.42, ep: 0.22,
  }), GRIS);
  // les canards, à l'avant — la signature d'un delta-canard moderne
  a.geometrie(voilure({
    demi: demi * 0.46, cordeEmplanture: 1.1, cordeSaumon: 0.4,
    fleche: 0.75, z: -2.6, y: y + rayon * 0.18, ep: 0.14,
  }), GRIS);
  // DEUX DÉRIVES INCLINÉES vers l'extérieur, en flèche
  for (const s of [-1, 1]) {
    a.geometrie(derive({
      hauteur: 5.3 * k - (y + rayon * 0.4), cordeBas: 1.9, cordeHaut: 0.8,
      fleche: 1.0, z: L / 2 - 2.6, y: y + rayon * 0.4, x: s * 0.62, ep: 0.16,
      inclinaison: s * 0.34,
    }), GRIS);
  }
  // la tuyère
  a.cylindre(SOMBRE, {
    p: [0, y, L / 2 - 0.26], r: [Math.PI / 2, 0, 0],
    e: [rayon * 1.5, 0.5, rayon * 1.5], haut: 0.5, bas: 0.42, seg: 12,
  });
  // deux missiles sous l'aile, pas en bout d'aile : ils y dépassaient
  // Le missile est porté SOUS l'aile et DANS sa corde : posé devant elle il
  // pendait dans le vide, ce que la capture a montré tout de suite.
  const xMissile = demi * 0.58;
  const zAile = -0.9 + xMissile * Math.tan(0.84);
  for (const s of [-1, 1]) {
    a.cylindre(BLANC, {
      p: [s * xMissile, y - rayon * 0.42 - 0.26, zAile + 0.75], r: [Math.PI / 2, 0, 0],
      e: [0.2, 1.6, 0.2], haut: 0.5, bas: 0.5, seg: 8,
    });
    a.cone(ROUGE, {
      p: [s * xMissile, y - rayon * 0.42 - 0.26, zAile - 0.22], r: [-Math.PI / 2, 0, 0],
      e: [0.2, 0.42, 0.2], seg: 8,
    });
  }
  const ventre = y - rayon;
  train(a, { x: 0, z: -L / 2 + 2.2, ventre, rayonRoue: 0.18 });
  for (const s of [-1, 1]) train(a, { x: s * 0.8, z: 1.1, ventre, rayonRoue: 0.2 });
  return fini(a);
}

export const MODELES_AVION = {
  avionligne: avionDeLigne,
  concorde,
  chasseur: avionDeChasse,
};
