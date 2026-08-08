// Les gens des châteaux : une anatomie galbée plutôt qu'un empilement de cubes,
// et un vestiaire fidèle à chaque époque — cotte de mailles et haubert pour la
// forteresse du XIIIᵉ, pourpoint et vertugadin pour la Renaissance de la Loire.
//
// Tout passe par l'atelier de modeles.js : chaque personnage sort d'ici en six
// maillages (le tronc, deux bras, deux jambes, et le verre s'il porte une
// visière), quelle que soit la finesse du costume.

import * as THREE from 'three';
import { Atelier } from './modeles.js';

// Hauteurs de référence d'un adulte, pieds à y = 0, visage tourné vers -z.
const H = {
  cheville: 0.12, genou: 0.47, hanche: 0.92, taille: 1.04,
  poitrine: 1.26, epaule: 1.40, cou: 1.48, menton: 1.55, tete: 1.64, crane: 1.76,
};

const ECART_JAMBE = 0.105;
const ECART_BRAS = 0.225;

const CUIR = 0x6b4a2c, CUIR_SOMBRE = 0x4a3220, ACIER = 0xa8adb8, ACIER_SOMBRE = 0x70757e;
const OR = 0xd4a83c, LIN = 0xe6dcc4, CORDE = 0xb8a274;

// --- pièces communes ---------------------------------------------------------

function tete(a, p) {
  const { teint, cheveux, coupe, barbe, moustache } = p;
  a.membre('tronc');
  // cou
  a.cylindre(teint, { p: [0, H.cou - 0.05, 0], e: [0.13, 0.16, 0.13], haut: 0.5, bas: 0.58, seg: 10 });
  // crâne : une sphère un peu allongée, plus un menton pour que le profil se lise
  a.sphere(teint, { p: [0, H.tete, 0], e: [0.25, 0.29, 0.27], seg: 14 });
  a.sphere(teint, { p: [0, H.tete - 0.11, -0.03], e: [0.19, 0.15, 0.2], seg: 10 });
  // nez : c'est lui qui donne un visage plutôt qu'un ballon
  a.cone(teint, { p: [0, H.tete - 0.02, -0.13], r: [-Math.PI / 2, 0, 0], e: [0.055, 0.07, 0.05], seg: 8 });
  // oreilles
  for (const s of [-1, 1]) {
    a.sphere(teint, { p: [s * 0.125, H.tete + 0.01, 0.01], e: [0.05, 0.08, 0.06], seg: 8 });
  }
  // Yeux, sourcils et bouche doivent saillir franchement de la sphère du crâne :
  // posés à fleur de surface ils disparaissent sous elle et le visage devient
  // un œuf lisse — c'est exactement ce qui s'était produit au premier essai.
  for (const s of [-1, 1]) {
    a.sphere(0xf6f2ea, { p: [s * 0.062, H.tete + 0.035, -0.124], e: [0.062, 0.052, 0.035], seg: 8 });
    a.sphere(p.yeux || 0x4a3b2a, { p: [s * 0.066, H.tete + 0.032, -0.137], e: [0.034, 0.036, 0.024], seg: 8 });
    a.boite(cheveux, { p: [s * 0.064, H.tete + 0.073, -0.131], r: [0, 0, s * 0.14], e: [0.068, 0.013, 0.026] });
  }
  a.boite(0xa8574c, { p: [0, H.tete - 0.078, -0.134], e: [0.07, 0.018, 0.026] });

  if (moustache) {
    a.boite(barbe || cheveux, { p: [0, H.tete - 0.046, -0.134], e: [0.115, 0.028, 0.036] });
  }
  if (barbe) {
    // une barbe pleine : une demi-sphère qui épouse la mâchoire
    a.demiSphere(barbe, { p: [0, H.tete - 0.055, 0], r: [Math.PI, 0, 0], e: [0.25, 0.28, 0.27], seg: 12 });
    a.sphere(barbe, { p: [0, H.tete - 0.155, -0.05], e: [0.14, 0.13, 0.16], seg: 10 });
  }
  chevelure(a, p);
}

function chevelure(a, p) {
  const { cheveux, coupe } = p;
  if (coupe === 'chauve') return;
  if (coupe === 'tonsure') {
    // la couronne de cheveux du moine : un tore posé sur le crâne
    a.tore(cheveux, { p: [0, H.tete + 0.06, 0], r: [Math.PI / 2, 0, 0], tube: 0.16, e: [0.5, 0.5, 0.3], seg: 14 });
    return;
  }
  // La calotte est décalée vers l'arrière : centrée sur le crâne, elle passait
  // devant les yeux et il fallait la percer avec une sphère de peau, qui
  // ressortait alors en museau. Décalée, elle ne déborde que là où il faut —
  // nuque, tempes, sommet — et le visage reste dégagé.
  a.sphere(cheveux, { p: [0, H.tete + 0.03, 0.035], e: [0.272, 0.3, 0.272], seg: 14 });
  if (coupe === 'long' || coupe === 'nattes') {
    a.sphere(cheveux, { p: [0, H.tete - 0.09, 0.075], e: [0.25, 0.3, 0.19], seg: 12 });
    if (coupe === 'nattes') {
      for (const s of [-1, 1]) {
        a.cylindre(cheveux, { p: [s * 0.15, H.tete - 0.16, 0.05], e: [0.06, 0.3, 0.06], haut: 0.5, bas: 0.3, seg: 8 });
      }
    }
  } else if (coupe === 'chignon') {
    a.sphere(cheveux, { p: [0, H.tete - 0.02, 0.1], e: [0.22, 0.22, 0.13], seg: 10 });
    a.sphere(cheveux, { p: [0, H.tete + 0.1, 0.15], e: [0.15, 0.14, 0.14], seg: 10 });
  }
}

// Le torse nu, sous les vêtements : cage thoracique en ellipsoïde, taille
// resserrée, bassin. Même sous une cotte, il donne l'épaisseur au personnage.
function torse(a, p, couleur) {
  a.membre('tronc');
  const c = couleur ?? p.teint;
  a.sphere(c, { p: [0, H.poitrine, 0], e: [0.42, 0.34, 0.27], seg: 14 });
  a.cylindre(c, { p: [0, H.taille, 0], e: [0.33, 0.3, 0.23], haut: 0.5, bas: 0.55, seg: 12 });
  a.sphere(c, { p: [0, H.hanche + 0.03, 0], e: [0.37, 0.26, 0.26], seg: 12 });
  // épaules
  for (const s of [-1, 1]) {
    a.sphere(c, { p: [s * 0.19, H.epaule - 0.02, 0], e: [0.19, 0.18, 0.22], seg: 10 });
  }
}

function bras(a, p, { manche, main, poignet = 0.05 }) {
  for (const [nom, s] of [['brasG', -1], ['brasD', 1]]) {
    a.membre(nom, [s * ECART_BRAS, H.epaule, 0]);
    const ep = [s * ECART_BRAS, H.epaule, 0];
    const coude = [s * (ECART_BRAS + 0.035), H.epaule - 0.32, 0.01];
    const poing = [s * (ECART_BRAS + 0.055), H.epaule - 0.62, 0.02];
    a.membreGalbe(manche, { de: ep, a: coude, r1: 0.085, r2: 0.062, seg: 8 });
    a.membreGalbe(manche, { de: coude, a: poing, r1: 0.062, r2: poignet, seg: 8 });
    a.sphere(main, { p: poing, e: [0.095, 0.11, 0.085], seg: 8 });
  }
}

function jambes(a, p, { bas, chaussure, hauteurBotte = 0 }) {
  for (const [nom, s] of [['jambeG', -1], ['jambeD', 1]]) {
    a.membre(nom, [s * ECART_JAMBE, H.hanche, 0]);
    const hanche = [s * ECART_JAMBE, H.hanche, 0];
    const genou = [s * ECART_JAMBE, H.genou, 0];
    const cheville = [s * ECART_JAMBE, H.cheville, 0.01];
    a.membreGalbe(bas, { de: hanche, a: genou, r1: 0.105, r2: 0.075, seg: 8 });
    a.membreGalbe(hauteurBotte > H.cheville ? chaussure : bas,
      { de: genou, a: cheville, r1: 0.075, r2: 0.055, seg: 8 });
    // pied : une boîte arrondie qui dépasse vers l'avant
    a.sphere(chaussure, { p: [s * ECART_JAMBE, 0.055, -0.045], e: [0.115, 0.11, 0.28], seg: 10 });
    a.sphere(chaussure, { p: [s * ECART_JAMBE, 0.04, -0.12], e: [0.1, 0.075, 0.12], seg: 8 });
  }
}

// --- vestiaire ---------------------------------------------------------------

// Une jupe, une robe, une bure : un tronc de cône qui tombe des hanches.
function jupe(a, couleur, { haut = H.hanche + 0.06, bas = 0.06, rHaut = 0.2, rBas = 0.42, seg = 16, t }) {
  a.membre('tronc');
  a.cylindre(couleur, {
    p: [0, (haut + bas) / 2, 0], e: [rBas * 2, haut - bas, rBas * 2],
    haut: (rHaut / rBas) * 0.5, bas: 0.5, seg, t,
  });
}

function ceinture(a, couleur, y = H.taille - 0.04, boucle = OR) {
  a.membre('tronc');
  a.cylindre(couleur, { p: [0, y, 0], e: [0.345, 0.06, 0.245], haut: 0.5, bas: 0.5, seg: 14 });
  a.boite(boucle, { p: [0, y, -0.12], e: [0.07, 0.06, 0.03] });
}

function fraise(a, couleur = LIN) {   // la collerette Renaissance
  a.membre('tronc');
  a.tore(couleur, { p: [0, H.cou + 0.02, 0], r: [Math.PI / 2, 0, 0], tube: 0.24, e: [0.42, 0.42, 0.42], seg: 16 });
}

const TENUES = {
  // Manant, servante, artisan : tunique de laine, chausses, bottes basses.
  tunique(a, p) {
    const { drap, drap2 = drap, chausses = 0x5a4a38, bottes = CUIR_SOMBRE } = p;
    torse(a, p, drap);
    jambes(a, p, { bas: chausses, chaussure: bottes });
    bras(a, p, { manche: drap, main: p.teint });
    jupe(a, drap, { haut: H.taille, bas: H.genou + 0.08, rHaut: 0.19, rBas: 0.27 });
    ceinture(a, CUIR, H.taille - 0.02, 0xc0a050);
    // bande d'encolure
    a.membre('tronc');
    a.tore(drap2, { p: [0, H.cou - 0.08, 0], r: [Math.PI / 2, 0, 0], tube: 0.1, e: [0.26, 0.26, 0.26], seg: 12 });
  },

  // Le haubert : mailles de la tête aux genoux, surcot aux couleurs du seigneur.
  maille(a, p) {
    const { surcot = 0xb03030 } = p;
    torse(a, p, ACIER_SOMBRE);
    jambes(a, p, { bas: ACIER_SOMBRE, chaussure: CUIR_SOMBRE });
    bras(a, p, { manche: ACIER_SOMBRE, main: CUIR });
    jupe(a, ACIER_SOMBRE, { haut: H.taille, bas: H.genou - 0.02, rHaut: 0.2, rBas: 0.3 });
    // surcot fendu, par-dessus les mailles
    a.membre('tronc');
    for (const s of [-1, 1]) {
      a.boite(surcot, { p: [s * 0.001, H.poitrine - 0.12, -0.2], e: [0.34, 0.6, 0.06] });
    }
    a.boite(surcot, { p: [0, H.poitrine - 0.12, 0.2], e: [0.34, 0.62, 0.06] });
    for (const s of [-1, 1]) a.boite(surcot, { p: [s * 0.2, H.poitrine - 0.06, 0], e: [0.06, 0.5, 0.36] });
    ceinture(a, CUIR, H.taille - 0.02);
    // coiffe de mailles : la tête reste visible, seul l'encadrement est en acier
    a.sphere(ACIER_SOMBRE, { p: [0, H.tete + 0.02, 0.028], e: [0.3, 0.32, 0.285], seg: 14 });
    a.cylindre(ACIER_SOMBRE, { p: [0, H.cou - 0.02, 0], e: [0.34, 0.2, 0.3], haut: 0.5, bas: 0.6, seg: 12 });
  },

  // L'armure de plates du chevalier : bassinet à visière, spallières, cuissots.
  plates(a, p) {
    const { plume = 0xd03838 } = p;
    torse(a, p, ACIER);
    jambes(a, p, { bas: ACIER_SOMBRE, chaussure: ACIER });
    bras(a, p, { manche: ACIER, main: ACIER });
    // cuirasse bombée
    a.membre('tronc');
    a.sphere(ACIER, { p: [0, H.poitrine, -0.02], e: [0.46, 0.42, 0.34], seg: 16 });
    a.sphere(ACIER, { p: [0, H.taille + 0.02, 0], e: [0.36, 0.24, 0.28], seg: 12 });
    // tassettes
    for (const s of [-1, 1]) {
      a.boite(ACIER, { p: [s * 0.13, H.hanche - 0.09, -0.06], r: [0.15, 0, s * 0.12], e: [0.19, 0.24, 0.16] });
    }
    // spallières : deux demi-sphères qui débordent des épaules
    for (const [nom, s] of [['brasG', -1], ['brasD', 1]]) {
      a.membre(nom, [s * ECART_BRAS, H.epaule, 0]);
      a.demiSphere(ACIER, { p: [s * (ECART_BRAS + 0.02), H.epaule - 0.01, 0], e: [0.28, 0.22, 0.3], seg: 12 });
      a.demiSphere(ACIER, { p: [s * (ECART_BRAS + 0.03), H.epaule - 0.11, 0], e: [0.25, 0.16, 0.27], seg: 10 });
      // gantelet
      a.sphere(ACIER_SOMBRE, { p: [s * (ECART_BRAS + 0.055), H.epaule - 0.62, 0.02], e: [0.115, 0.13, 0.1], seg: 8 });
    }
    // bassinet à visière relevée : le visage reste lisible, c'est important
    a.membre('tronc');
    a.sphere(ACIER, { p: [0, H.tete + 0.05, 0.032], e: [0.31, 0.34, 0.29], seg: 16 });
    a.cylindre(ACIER, { p: [0, H.tete + 0.235, 0.01], e: [0.14, 0.09, 0.14], haut: 0.35, bas: 0.5, seg: 10 });
    a.cone(plume, { p: [0, H.tete + 0.36, 0.02], e: [0.1, 0.24, 0.1], seg: 10 });
    // visière relevée au-dessus du front
    a.boite(ACIER_SOMBRE, { p: [0, H.tete + 0.185, -0.145], r: [-1.0, 0, 0], e: [0.27, 0.15, 0.025] });
    // gorgerin
    a.cylindre(ACIER, { p: [0, H.cou - 0.03, 0], e: [0.32, 0.16, 0.29], haut: 0.5, bas: 0.6, seg: 12 });
  },

  // Brigandine de cuir clouté : les archers, les routiers, les assaillants.
  cuir(a, p) {
    const { drap = CUIR } = p;
    torse(a, p, drap);
    jambes(a, p, { bas: 0x4a4032, chaussure: CUIR_SOMBRE });
    bras(a, p, { manche: 0x8a6a48, main: p.teint });
    a.membre('tronc');
    a.sphere(drap, { p: [0, H.poitrine, 0], e: [0.44, 0.36, 0.3], seg: 14 });
    // rangées de clous
    for (let i = 0; i < 5; i++) {
      const x = -0.14 + i * 0.07;
      a.sphere(ACIER, { p: [x, H.poitrine + 0.05, -0.145], e: [0.028, 0.028, 0.028], seg: 6 });
      a.sphere(ACIER, { p: [x, H.poitrine - 0.07, -0.14], e: [0.028, 0.028, 0.028], seg: 6 });
    }
    ceinture(a, CUIR_SOMBRE, H.taille - 0.02, 0x9a8a5a);
    // chaperon à capuchon rabattu
    a.sphere(0x4a5240, { p: [0, H.tete + 0.04, 0.048], e: [0.3, 0.31, 0.29], seg: 12 });
    a.sphere(0x4a5240, { p: [0, H.cou - 0.06, 0.13], e: [0.24, 0.24, 0.2], seg: 10 });
  },

  // La bure du moine copiste : robe entière, capuce, corde à trois nœuds.
  bure(a, p) {
    const { drap = 0x5a4a36 } = p;
    torse(a, p, drap);
    jambes(a, p, { bas: drap, chaussure: 0x3a2a1c });
    bras(a, p, { manche: drap, main: p.teint });
    jupe(a, drap, { haut: H.poitrine, bas: 0.05, rHaut: 0.26, rBas: 0.4, seg: 18 });
    // manches larges
    for (const [nom, s] of [['brasG', -1], ['brasD', 1]]) {
      a.membre(nom, [s * ECART_BRAS, H.epaule, 0]);
      a.cylindre(drap, {
        p: [s * (ECART_BRAS + 0.02), H.epaule - 0.24, 0], e: [0.24, 0.42, 0.24],
        haut: 0.42, bas: 0.5, seg: 10,
      });
    }
    a.membre('tronc');
    a.cylindre(CORDE, { p: [0, H.taille - 0.02, 0], e: [0.33, 0.035, 0.25], haut: 0.5, bas: 0.5, seg: 12 });
    a.cylindre(CORDE, { p: [0.06, H.taille - 0.16, -0.14], e: [0.03, 0.26, 0.03], haut: 0.5, bas: 0.5, seg: 6 });
    // capuce rabattu dans le dos
    a.sphere(drap, { p: [0, H.cou - 0.02, 0.16], e: [0.28, 0.26, 0.24], seg: 12 });
  },

  // La dame du château, XIIIᵉ : robe longue à manches pendantes, guimpe et
  // touret. Rien de la raideur Renaissance — tout tombe droit.
  dame(a, p) {
    const { drap = 0x7a2a4a, drap2 = 0xd8c48a, guimpe = LIN } = p;
    torse(a, p, drap);
    jambes(a, p, { bas: drap, chaussure: 0x3a2a2a });
    bras(a, p, { manche: drap, main: p.teint });
    jupe(a, drap, { haut: H.poitrine, bas: 0.02, rHaut: 0.24, rBas: 0.44, seg: 18 });
    a.membre('tronc');
    a.sphere(drap, { p: [0, H.poitrine, 0], e: [0.4, 0.36, 0.29], seg: 14 });
    // manches pendantes, larges du coude au bas de la robe
    for (const [nom, s] of [['brasG', -1], ['brasD', 1]]) {
      a.membre(nom, [s * ECART_BRAS, H.epaule, 0]);
      a.cylindre(drap2, {
        p: [s * (ECART_BRAS + 0.03), H.epaule - 0.44, 0.02], e: [0.22, 0.5, 0.2],
        haut: 0.28, bas: 0.5, seg: 10,
      });
    }
    ceinture(a, drap2, H.taille - 0.02, OR);
    // guimpe : le linge qui entoure le cou et le menton
    a.membre('tronc');
    a.cylindre(guimpe, { p: [0, H.cou - 0.04, 0], e: [0.28, 0.2, 0.26], haut: 0.55, bas: 0.5, seg: 12 });
    a.sphere(guimpe, { p: [0, H.tete - 0.06, 0.05], e: [0.29, 0.26, 0.29], seg: 12 });
    // touret : le bandeau rigide posé sur les cheveux
    a.tore(drap2, { p: [0, H.tete + 0.12, 0.02], r: [Math.PI / 2, 0, 0], tube: 0.13, e: [0.4, 0.4, 0.4], seg: 14 });
    a.sphere(guimpe, { p: [0, H.tete + 0.03, 0.14], e: [0.29, 0.32, 0.24], seg: 12 });
  },

  // Robe à vertugadin : la silhouette Renaissance, cône ample et corsage rigide.
  robeRen(a, p) {
    const { drap = 0x6a2f5a, drap2 = 0xd8c48a } = p;
    torse(a, p, drap);
    jambes(a, p, { bas: drap, chaussure: 0x3a2a2a });
    bras(a, p, { manche: drap, main: p.teint });
    jupe(a, drap, { haut: H.taille + 0.02, bas: 0.02, rHaut: 0.19, rBas: 0.52, seg: 20 });
    a.membre('tronc');
    // devant de robe brodé, en triangle
    a.cone(drap2, { p: [0, 0.5, -0.3], r: [Math.PI, 0, 0], e: [0.5, 1.0, 0.22], seg: 12 });
    // corsage rigide, taille en pointe
    a.sphere(drap2, { p: [0, H.poitrine - 0.02, -0.03], e: [0.4, 0.36, 0.3], seg: 14 });
    a.cone(drap2, { p: [0, H.taille - 0.06, -0.06], r: [Math.PI, 0, 0], e: [0.28, 0.3, 0.2], seg: 10 });
    // manches à crevés : deux bouffants par bras
    for (const [nom, s] of [['brasG', -1], ['brasD', 1]]) {
      a.membre(nom, [s * ECART_BRAS, H.epaule, 0]);
      a.sphere(drap2, { p: [s * (ECART_BRAS + 0.01), H.epaule - 0.1, 0], e: [0.26, 0.26, 0.26], seg: 12 });
      a.sphere(drap, { p: [s * (ECART_BRAS + 0.03), H.epaule - 0.3, 0], e: [0.2, 0.2, 0.2], seg: 10 });
    }
    fraise(a, LIN);
    // coiffe à l'attifet et voile
    a.membre('tronc');
    a.tore(drap2, { p: [0, H.tete + 0.15, 0.01], r: [Math.PI / 2, 0, 0], tube: 0.14, e: [0.4, 0.4, 0.4], seg: 14 });
    a.sphere(drap, { p: [0, H.tete + 0.02, 0.14], e: [0.28, 0.3, 0.24], seg: 12 });
  },

  // Pourpoint, haut-de-chausses en bouffant, bas de soie : le gentilhomme.
  pourpoint(a, p) {
    const { drap = 0x2a3f6a, drap2 = 0xc8b070, bas = 0xb03848 } = p;
    torse(a, p, drap);
    jambes(a, p, { bas, chaussure: 0x2a2018 });
    bras(a, p, { manche: drap, main: p.teint });
    a.membre('tronc');
    // pourpoint ajusté, à basques
    a.sphere(drap, { p: [0, H.poitrine, 0], e: [0.42, 0.38, 0.31], seg: 14 });
    a.cylindre(drap, { p: [0, H.taille - 0.02, 0], e: [0.36, 0.16, 0.28], haut: 0.5, bas: 0.62, seg: 12 });
    // haut-de-chausses : la grosse culotte bouffante de l'époque
    a.sphere(drap2, { p: [0, H.hanche - 0.06, 0], e: [0.46, 0.34, 0.4], seg: 14 });
    for (let i = 0; i < 8; i++) {   // les crevés verticaux
      const ang = (i / 8) * Math.PI * 2;
      a.cylindre(drap, {
        p: [Math.sin(ang) * 0.2, H.hanche - 0.06, Math.cos(ang) * 0.18],
        e: [0.045, 0.3, 0.045], haut: 0.5, bas: 0.5, seg: 6,
      });
    }
    // jarretières
    for (const s of [-1, 1]) {
      a.membre(s < 0 ? 'jambeG' : 'jambeD', [s * ECART_JAMBE, H.hanche, 0]);
      a.tore(drap2, { p: [s * ECART_JAMBE, H.genou + 0.04, 0], r: [Math.PI / 2, 0, 0], tube: 0.2, e: [0.19, 0.19, 0.19], seg: 10 });
    }
    fraise(a, LIN);
    // toque plate à plume
    a.membre('tronc');
    a.cylindre(drap, { p: [0, H.tete + 0.19, 0.01], e: [0.34, 0.09, 0.34], haut: 0.5, bas: 0.52, seg: 14 });
    a.tore(drap, { p: [0, H.tete + 0.15, 0.01], r: [Math.PI / 2, 0, 0], tube: 0.12, e: [0.38, 0.38, 0.38], seg: 14 });
    a.cone(p.plume || 0xe8e2d0, { p: [0.16, H.tete + 0.3, 0.06], r: [0, 0, -0.9], e: [0.06, 0.3, 0.06], seg: 8 });
  },

  // Tablier de cuir, manches roulées, bras nus : le forgeron, l'armurier, le
  // cuisinier. Le tablier est la pièce qui les fait reconnaître de loin.
  tablier(a, p) {
    const { drap = 0xb8ac94, tabColor = CUIR } = p;
    torse(a, p, drap);
    jambes(a, p, { bas: 0x50442f, chaussure: CUIR_SOMBRE });
    bras(a, p, { manche: p.teint, main: p.teint });
    // manches roulées jusqu'au coude
    for (const [nom, s] of [['brasG', -1], ['brasD', 1]]) {
      a.membre(nom, [s * ECART_BRAS, H.epaule, 0]);
      a.cylindre(drap, { p: [s * (ECART_BRAS + 0.01), H.epaule - 0.13, 0], e: [0.21, 0.3, 0.21], haut: 0.5, bas: 0.55, seg: 10 });
    }
    a.membre('tronc');
    a.boite(tabColor, { p: [0, H.poitrine - 0.02, -0.19], e: [0.32, 0.36, 0.05] });
    a.boite(tabColor, { p: [0, H.hanche - 0.06, -0.22], e: [0.42, 0.5, 0.05] });
    a.cylindre(tabColor, { p: [0, H.epaule - 0.04, -0.05], e: [0.4, 0.05, 0.34], haut: 0.5, bas: 0.5, seg: 12 });
    if (p.coiffe === 'toque') {
      a.cylindre(LIN, { p: [0, H.tete + 0.22, 0.01], e: [0.26, 0.2, 0.26], haut: 0.55, bas: 0.5, seg: 12 });
      a.sphere(LIN, { p: [0, H.tete + 0.33, 0.01], e: [0.32, 0.16, 0.32], seg: 12 });
    } else if (p.coiffe === 'bandeau') {
      a.tore(0x8a3a3a, { p: [0, H.tete + 0.11, 0.01], r: [Math.PI / 2, 0, 0], tube: 0.1, e: [0.36, 0.36, 0.36], seg: 12 });
    }
  },

  // Blouse de toile, chapeau de paille : les jardiniers de Villandry.
  jardinier(a, p) {
    const { drap = 0x6a7a52 } = p;
    torse(a, p, drap);
    jambes(a, p, { bas: 0x5a5040, chaussure: CUIR_SOMBRE });
    bras(a, p, { manche: drap, main: p.teint });
    jupe(a, drap, { haut: H.taille, bas: H.genou + 0.1, rHaut: 0.2, rBas: 0.27 });
    a.membre('tronc');
    a.boite(0xd8cfae, { p: [0, H.hanche + 0.02, -0.2], e: [0.36, 0.44, 0.05] });
    ceinture(a, CORDE, H.taille - 0.02, 0x8a7a4a);
    if (p.coiffe !== 'nu') {
      // chapeau de paille : calotte + large bord
      a.demiSphere(0xd8c078, { p: [0, H.tete + 0.14, 0.01], e: [0.32, 0.24, 0.32], seg: 14 });
      a.cylindre(0xc8ae66, { p: [0, H.tete + 0.14, 0.01], e: [0.62, 0.03, 0.62], haut: 0.5, bas: 0.5, seg: 16 });
    }
  },

  // Livrée de maison : le page, le maître d'hôtel, les gens de service.
  livree(a, p) {
    const { drap = 0x2a4a3a, drap2 = 0xd0b45a } = p;
    torse(a, p, drap);
    jambes(a, p, { bas: drap2, chaussure: 0x2a2018 });
    bras(a, p, { manche: drap, main: p.teint });
    a.membre('tronc');
    a.sphere(drap, { p: [0, H.poitrine, 0], e: [0.42, 0.38, 0.3], seg: 14 });
    a.cylindre(drap, { p: [0, H.taille - 0.03, 0], e: [0.35, 0.2, 0.27], haut: 0.5, bas: 0.6, seg: 12 });
    // bandes de livrée sur la poitrine
    for (const s of [-1, 1]) {
      a.boite(drap2, { p: [s * 0.09, H.poitrine, -0.15], r: [0, 0, s * 0.2], e: [0.05, 0.34, 0.03] });
    }
    a.sphere(drap2, { p: [0, H.hanche - 0.04, 0], e: [0.4, 0.26, 0.34], seg: 12 });
    if (p.coiffe !== 'nu') {
      a.cylindre(drap, { p: [0, H.tete + 0.18, 0.01], e: [0.3, 0.1, 0.3], haut: 0.5, bas: 0.55, seg: 12 });
    }
  },

  // Jupe retroussée, fichu sur la tête : la lavandière, la fille de cuisine.
  lavandiere(a, p) {
    const { drap = 0x7a5a7a, drap2 = 0xd8d0c0 } = p;
    torse(a, p, drap);
    jambes(a, p, { bas: 0xd8c8b0, chaussure: CUIR_SOMBRE });
    bras(a, p, { manche: drap2, main: p.teint });
    jupe(a, drap, { haut: H.taille, bas: H.genou - 0.04, rHaut: 0.2, rBas: 0.36, seg: 16 });
    a.membre('tronc');
    a.boite(drap2, { p: [0, H.hanche - 0.04, -0.24], e: [0.4, 0.4, 0.05] });
    a.sphere(drap2, { p: [0, H.poitrine, 0], e: [0.4, 0.32, 0.28], seg: 12 });
    ceinture(a, CUIR, H.taille - 0.02, 0xb09050);
    // fichu noué
    a.sphere(p.fichu || 0xc85a5a, { p: [0, H.tete + 0.06, 0.048], e: [0.3, 0.31, 0.29], seg: 12 });
    a.sphere(p.fichu || 0xc85a5a, { p: [0, H.tete - 0.02, 0.16], e: [0.16, 0.14, 0.14], seg: 8 });
  },
};

// --- ce qu'ils portent dans les mains ----------------------------------------

// Les objets s'accrochent au bras droit : ils suivent donc le balancement de la
// marche sans qu'on ait à les animer séparément.
const MAIN_D = [ECART_BRAS + 0.055, H.epaule - 0.62, 0.02];

const OBJETS = {
  epee(a) {
    a.membre('brasD', [ECART_BRAS, H.epaule, 0]);
    const [x, y, z] = MAIN_D;
    a.boite(0xdadfe6, { p: [x, y - 0.42, z - 0.04], e: [0.055, 0.72, 0.015] });
    a.cone(0xdadfe6, { p: [x, y - 0.82, z - 0.04], r: [Math.PI, 0, 0], e: [0.055, 0.1, 0.015] });
    a.boite(OR, { p: [x, y - 0.05, z - 0.04], e: [0.24, 0.045, 0.05] });
    a.cylindre(CUIR_SOMBRE, { p: [x, y + 0.05, z - 0.04], e: [0.05, 0.16, 0.05], haut: 0.5, bas: 0.5, seg: 8 });
    a.sphere(OR, { p: [x, y + 0.14, z - 0.04], e: [0.08, 0.08, 0.08], seg: 8 });
  },
  hallebarde(a) {
    a.membre('brasD', [ECART_BRAS, H.epaule, 0]);
    const [x, y, z] = MAIN_D;
    a.cylindre(0x6a4a2a, { p: [x, y + 0.35, z], e: [0.05, 2.0, 0.05], haut: 0.5, bas: 0.5, seg: 8 });
    a.cone(ACIER, { p: [x, y + 1.5, z], e: [0.07, 0.34, 0.07], seg: 8 });
    a.boite(ACIER, { p: [x - 0.13, y + 1.28, z], r: [0, 0, 0.2], e: [0.22, 0.26, 0.02] });
    a.cone(ACIER, { p: [x + 0.13, y + 1.28, z], r: [0, 0, -Math.PI / 2], e: [0.1, 0.18, 0.02], seg: 6 });
  },
  lance(a) {
    a.membre('brasD', [ECART_BRAS, H.epaule, 0]);
    const [x, y, z] = MAIN_D;
    a.cylindre(0x7a5a30, { p: [x, y + 0.4, z], e: [0.045, 2.1, 0.045], haut: 0.5, bas: 0.5, seg: 8 });
    a.cone(ACIER, { p: [x, y + 1.6, z], e: [0.08, 0.3, 0.08], seg: 8 });
    a.boite(0xb03030, { p: [x, y + 1.34, z + 0.09], e: [0.02, 0.16, 0.2] });
  },
  arc(a) {
    a.membre('brasG', [-ECART_BRAS, H.epaule, 0]);
    const x = -(ECART_BRAS + 0.055), y = H.epaule - 0.62, z = 0.02;
    // Le bois est tracé point par point sur un arc de cercle, chaque tronçon
    // reliant deux points voisins : les segments s'emboîtent au lieu de partir
    // chacun dans sa direction.
    const N = 8, courbe = 0.16;
    const pt = (k) => {
      const t = (k / N - 0.5) * 2;               // -1 .. 1 du bas vers le haut
      return [x, y + t * 0.56, z - 0.05 - courbe * (1 - t * t)];
    };
    for (let i = 0; i < N; i++) {
      a.membreGalbe(0x8a6030, {
        de: pt(i), a: pt(i + 1), r1: 0.02 + 0.008 * (1 - Math.abs(i / N - 0.5) * 2), r2: 0.02, seg: 5,
      });
    }
    a.cylindre(0xe8e0cc, { p: [x, y, z - 0.05], e: [0.01, 1.12, 0.01], haut: 0.5, bas: 0.5, seg: 4 });
  },
  marteau(a) {
    a.membre('brasD', [ECART_BRAS, H.epaule, 0]);
    const [x, y, z] = MAIN_D;
    a.cylindre(0x7a5630, { p: [x, y - 0.2, z], e: [0.045, 0.5, 0.045], haut: 0.5, bas: 0.6, seg: 8 });
    a.boite(0x4a4a52, { p: [x, y - 0.46, z], e: [0.11, 0.13, 0.28] });
  },
  tenailles(a) {
    a.membre('brasG', [-ECART_BRAS, H.epaule, 0]);
    const x = -(ECART_BRAS + 0.055), y = H.epaule - 0.62, z = 0.02;
    for (const s of [-1, 1]) {
      a.cylindre(0x50505a, { p: [x + s * 0.02, y - 0.24, z - 0.06], r: [0.2, 0, s * 0.05], e: [0.03, 0.52, 0.03], haut: 0.5, bas: 0.5, seg: 6 });
    }
    a.boite(0xd85a2a, { p: [x, y - 0.5, z - 0.16], e: [0.11, 0.11, 0.11] });
  },
  rateau(a) {
    a.membre('brasD', [ECART_BRAS, H.epaule, 0]);
    const [x, y, z] = MAIN_D;
    // Le manche est calé pour que les dents touchent le sol : plus long, l'outil
    // s'enfonçait sous la pelouse et l'on ne voyait qu'un bâton.
    a.cylindre(0x9a7a4a, { p: [x, 0.7, z - 0.16], r: [0.25, 0, 0], e: [0.04, 1.26, 0.04], haut: 0.5, bas: 0.5, seg: 8 });
    a.boite(0x7a5a34, { p: [x, 0.12, z - 0.32], e: [0.42, 0.05, 0.05] });
    for (let i = 0; i < 7; i++) {
      a.cylindre(0x7a5a34, { p: [x - 0.18 + i * 0.06, 0.06, z - 0.32], e: [0.02, 0.13, 0.02], haut: 0.5, bas: 0.3, seg: 4 });
    }
  },
  cisailles(a) {
    a.membre('brasD', [ECART_BRAS, H.epaule, 0]);
    const [x, y, z] = MAIN_D;
    for (const s of [-1, 1]) {
      a.boite(0xc8ccd4, { p: [x, y - 0.3, z - 0.16 + s * 0.02], r: [0.3, 0, 0], e: [0.035, 0.44, 0.012] });
      a.cylindre(0x5a3a22, { p: [x + s * 0.04, y - 0.02, z - 0.02], e: [0.03, 0.24, 0.03], haut: 0.5, bas: 0.5, seg: 6 });
    }
  },
  panier(a) {
    a.membre('brasG', [-ECART_BRAS, H.epaule, 0]);
    const x = -(ECART_BRAS + 0.1), y = H.epaule - 0.62, z = 0.02;
    a.cylindre(0xb08a4a, { p: [x, y - 0.18, z], e: [0.34, 0.24, 0.3], haut: 0.5, bas: 0.38, seg: 12 });
    a.tore(0x8a6a34, { p: [x, y - 0.06, z], r: [Math.PI / 2, 0, 0], tube: 0.1, e: [0.36, 0.36, 0.32], seg: 12 });
    a.tore(0x8a6a34, { p: [x, y + 0.02, z], r: [0, 0, 0], tube: 0.06, e: [0.28, 0.28, 0.28], seg: 10 });
  },
  luth(a) {
    a.membre('brasG', [-ECART_BRAS, H.epaule, 0]);
    const x = -(ECART_BRAS + 0.02), y = H.epaule - 0.36, z = -0.14;
    a.demiSphere(0x9a6a38, { p: [x, y, z + 0.06], r: [Math.PI / 2, 0, 0], e: [0.4, 0.3, 0.44], seg: 14 });
    a.cylindre(0x6a4a28, { p: [x + 0.02, y + 0.34, z - 0.02], r: [0, 0, -0.12], e: [0.09, 0.5, 0.05], haut: 0.5, bas: 0.5, seg: 8 });
    a.boite(0x3a2a18, { p: [x + 0.06, y + 0.58, z - 0.02], r: [0, 0, -0.5], e: [0.1, 0.14, 0.05] });
    a.sphere(0x2a1a10, { p: [x, y + 0.02, z - 0.16], e: [0.1, 0.1, 0.04], seg: 10 });
  },
  viole(a) {
    a.membre('brasG', [-ECART_BRAS, H.epaule, 0]);
    const x = -(ECART_BRAS + 0.02), y = H.epaule - 0.28, z = -0.16;
    a.sphere(0x8a5a2e, { p: [x, y + 0.1, z], e: [0.3, 0.34, 0.11], seg: 12 });
    a.sphere(0x8a5a2e, { p: [x, y - 0.16, z], e: [0.36, 0.4, 0.12], seg: 12 });
    a.cylindre(0x5a3a1c, { p: [x, y + 0.44, z], e: [0.07, 0.44, 0.05], haut: 0.5, bas: 0.5, seg: 8 });
    a.membre('brasD', [ECART_BRAS, H.epaule, 0]);
    a.cylindre(0x6a4a28, { p: [ECART_BRAS + 0.05, H.epaule - 0.6, -0.12], r: [0, 0, 0.5], e: [0.02, 0.66, 0.02], haut: 0.5, bas: 0.5, seg: 6 });
  },
  livre(a) {
    a.membre('brasG', [-ECART_BRAS, H.epaule, 0]);
    const x = -(ECART_BRAS + 0.06), y = H.epaule - 0.56, z = -0.12;
    a.boite(0x7a2a2a, { p: [x, y, z], r: [0.5, 0, 0], e: [0.3, 0.06, 0.38] });
    a.boite(0xf0e8d4, { p: [x, y + 0.035, z - 0.01], r: [0.5, 0, 0], e: [0.27, 0.03, 0.35] });
  },
  balai(a) {
    a.membre('brasD', [ECART_BRAS, H.epaule, 0]);
    const [x, y, z] = MAIN_D;
    a.cylindre(0x9a7a4a, { p: [x, 0.78, z - 0.13], r: [0.2, 0, 0], e: [0.04, 1.24, 0.04], haut: 0.5, bas: 0.5, seg: 8 });
    a.cone(0xc8a860, { p: [x, 0.14, z - 0.26], r: [Math.PI + 0.2, 0, 0], e: [0.26, 0.36, 0.26], seg: 10 });
  },
  seau(a) {
    a.membre('brasG', [-ECART_BRAS, H.epaule, 0]);
    const x = -(ECART_BRAS + 0.08), y = H.epaule - 0.62, z = 0.02;
    a.cylindre(0x8a6a44, { p: [x, y - 0.2, z], e: [0.3, 0.3, 0.3], haut: 0.5, bas: 0.4, seg: 12 });
    a.tore(0x5a5a62, { p: [x, y - 0.1, z], r: [Math.PI / 2, 0, 0], tube: 0.08, e: [0.31, 0.31, 0.31], seg: 12 });
    a.tore(0x5a5a62, { p: [x, y - 0.04, z], r: [0, 0, 0], tube: 0.05, e: [0.3, 0.3, 0.3], seg: 10 });
  },
  faucon(a) {
    // Le faucon perché sur le gant : le poing est levé, l'oiseau posé dessus.
    a.membre('brasG', [-ECART_BRAS, H.epaule, 0]);
    const x = -(ECART_BRAS + 0.02), y = H.epaule - 0.18, z = -0.18;
    a.cylindre(CUIR, { p: [x, y - 0.06, z], e: [0.16, 0.26, 0.16], haut: 0.5, bas: 0.5, seg: 10 });
    a.sphere(0x6a5a48, { p: [x, y + 0.19, z], e: [0.15, 0.24, 0.19], seg: 12 });
    a.sphere(0x8a7a64, { p: [x, y + 0.31, z - 0.02], e: [0.12, 0.12, 0.12], seg: 10 });
    a.cone(0xe8c040, { p: [x, y + 0.3, z - 0.09], r: [-Math.PI / 2, 0, 0], e: [0.04, 0.07, 0.04], seg: 6 });
    for (const s of [-1, 1]) {
      a.sphere(0x5a4a38, { p: [x + s * 0.11, y + 0.19, z + 0.01], e: [0.05, 0.22, 0.16], seg: 8 });
    }
    a.cone(0x4a3a2a, { p: [x, y + 0.06, z + 0.11], r: [0.4, 0, 0], e: [0.09, 0.22, 0.05], seg: 8 });
  },
  torche(a) {
    a.membre('brasD', [ECART_BRAS, H.epaule, 0]);
    const [x, y, z] = MAIN_D;
    a.cylindre(0x5a3a1c, { p: [x, y + 0.16, z], e: [0.05, 0.5, 0.05], haut: 0.5, bas: 0.6, seg: 8 });
    a.cone(0xe8a028, { p: [x, y + 0.5, z], e: [0.14, 0.3, 0.14], seg: 10 });
    a.cone(0xf8e070, { p: [x, y + 0.46, z], e: [0.08, 0.18, 0.08], seg: 8 });
  },
  bouclier(a, p) {
    a.membre('brasG', [-ECART_BRAS, H.epaule, 0]);
    const x = -(ECART_BRAS + 0.16), y = H.epaule - 0.38, z = -0.04;
    // écu galbé : une demi-sphère écrasée, plus une pointe en bas
    a.demiSphere(p.ecu || 0xb03030, { p: [x, y, z], r: [-Math.PI / 2, 0, 0], e: [0.46, 0.12, 0.6], seg: 14 });
    a.cone(p.ecu || 0xb03030, { p: [x, y - 0.3, z - 0.02], r: [Math.PI, 0, 0], e: [0.42, 0.26, 0.1], seg: 10 });
    a.sphere(ACIER, { p: [x, y, z - 0.05], e: [0.14, 0.14, 0.1], seg: 10 });
    a.boite(p.meuble || 0xe8e0d0, { p: [x, y + 0.02, z - 0.05], e: [0.07, 0.34, 0.02] });
    a.boite(p.meuble || 0xe8e0d0, { p: [x, y + 0.1, z - 0.05], e: [0.26, 0.08, 0.02] });
  },
};

// --- assemblage --------------------------------------------------------------

// profil : { tenue, teint, cheveux, coupe, barbe, moustache, objets:[…], taille }
export function construireHumain(profil) {
  const p = {
    teint: 0xe0b48c, cheveux: 0x4a3524, coupe: 'court',
    barbe: null, moustache: false, ...profil,
  };
  const a = new Atelier();
  // les membres articulés d'abord, pour fixer l'ordre des groupes
  a.membre('jambeG', [-ECART_JAMBE, H.hanche, 0]);
  a.membre('jambeD', [ECART_JAMBE, H.hanche, 0]);
  a.membre('brasG', [-ECART_BRAS, H.epaule, 0]);
  a.membre('brasD', [ECART_BRAS, H.epaule, 0]);

  (TENUES[p.tenue] || TENUES.tunique)(a, p);
  tete(a, p);
  for (const o of p.objets || []) if (OBJETS[o]) OBJETS[o](a, p);

  const g = a.finir();
  const m = g.userData.membres;
  // le contrat attendu par BaseNPC : deux jambes, deux bras, animés en rotation
  g.userData.legs = [m.jambeG, m.jambeD];
  g.userData.arms = [m.brasG, m.brasD];
  if (p.taille && p.taille !== 1) g.scale.setScalar(p.taille);
  return g;
}

export const TENUES_DISPONIBLES = Object.keys(TENUES);
export const OBJETS_DISPONIBLES = Object.keys(OBJETS);
