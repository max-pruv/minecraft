// Le bestiaire des châteaux : les bêtes qu'on croisait vraiment dans une
// basse-cour et dans une écurie. Modelées en volume comme les gens, avec le
// même atelier — un cheval a des jarrets et des sabots, pas quatre bâtons.
//
// Chaque patte est un membre articulé ; la marche les fait osciller en
// diagonale, comme un vrai quadrupède.

import { Atelier } from './modeles.js';

const SABOT = 0x30281e, OEIL = 0x1a1410, BEC = 0xe0a038;

// Quadrupède générique.
//
// Les proportions sont données en clair — ligne de dos, ligne de ventre,
// position de la tête — plutôt que déduites d'angles : c'est ce qui distingue un
// cheval haut sur pattes d'un cochon bas et rond, et ça se règle à l'œil.
//
// Le tronc est fait de trois ellipsoïdes qui se recouvrent largement le long de
// l'échine. Deux seulement laissaient un étranglement au milieu du dos.
function quadrupede(a, o) {
  const {
    robe, ventre = robe, museau = robe,
    longueur, dos, ventreY, largeur,
    teteP,                        // [y, z] du centre de la tête
    teteE,                        // [largeur, hauteur, longueur] de la tête
    epaisseurPatte = 0.055, sabot = SABOT,
    ecartPatte = 0.42, avantPatte = 0.3, arrierePatte = 0.32,
  } = o;
  const cy = (dos + ventreY) / 2;         // hauteur du centre du tronc
  const ch = dos - ventreY;               // épaisseur du tronc
  const zAv = -longueur / 2, zAr = longueur / 2;

  a.membre('tronc');
  for (const [dz, kx, ky] of [[-0.27, 0.98, 0.96], [0, 1.0, 1.0], [0.27, 1.0, 0.94]]) {
    a.sphere(robe, {
      p: [0, cy + (dz === 0 ? 0 : -0.01), dz * longueur],
      e: [largeur * kx, ch * ky, longueur * 0.56], seg: 14,
    });
  }
  // le ventre, un peu plus clair : c'est ce qui donne du relief au flanc
  if (ventre !== robe) {
    a.sphere(ventre, { p: [0, ventreY + ch * 0.22, 0], e: [largeur * 0.9, ch * 0.5, longueur * 0.76], seg: 12 });
  }

  // encolure : du poitrail jusque sous la tête
  const poitrail = [0, cy + ch * 0.26, zAv + longueur * 0.12];
  const gorge = [0, teteP[0] - teteE[1] * 0.35, teteP[1] + teteE[2] * 0.42];
  a.membreGalbe(robe, { de: poitrail, a: gorge, r1: largeur * 0.4, r2: largeur * 0.26, seg: 10 });

  // tête, chanfrein et yeux
  const tY = teteP[0], tZ = teteP[1];
  a.sphere(robe, { p: [0, tY, tZ], e: teteE, seg: 12 });
  a.sphere(museau, {
    p: [0, tY - teteE[1] * 0.16, tZ - teteE[2] * 0.44],
    e: [teteE[0] * 0.74, teteE[1] * 0.66, teteE[2] * 0.5], seg: 10,
  });
  for (const s of [-1, 1]) {
    a.sphere(OEIL, {
      p: [s * teteE[0] * 0.42, tY + teteE[1] * 0.22, tZ - teteE[2] * 0.28],
      e: [0.035, 0.038, 0.03], seg: 6,
    });
  }

  // pattes : deux segments avec genou marqué, puis sabot ou coussinet
  const patX = largeur * ecartPatte;
  const haut = ventreY + ch * 0.3;
  for (const [nom, px, pz] of [
    ['patteAvG', -patX, zAv + longueur * avantPatte * 0.5],
    ['patteAvD', patX, zAv + longueur * avantPatte * 0.5],
    ['patteArG', -patX, zAr - longueur * arrierePatte * 0.5],
    ['patteArD', patX, zAr - longueur * arrierePatte * 0.5],
  ]) {
    const avant = nom.startsWith('patteAv');
    a.membre(nom, [px, haut, pz]);
    const genou = [px, haut * 0.48 + 0.03, pz + (avant ? 0.02 : -0.03)];
    const pied = [px, 0.05, pz];
    a.membreGalbe(robe, { de: [px, haut, pz], a: genou, r1: epaisseurPatte * 1.45, r2: epaisseurPatte, seg: 7 });
    a.membreGalbe(robe, { de: genou, a: pied, r1: epaisseurPatte, r2: epaisseurPatte * 0.85, seg: 7 });
    a.cylindre(sabot, { p: [px, 0.035, pz], e: [epaisseurPatte * 2.3, 0.07, epaisseurPatte * 2.5], haut: 0.5, bas: 0.55, seg: 8 });
  }
  return { dos, ventreY, cy, ch, longueur, largeur, zAv, zAr, tY, tZ, teteE };
}

// Une crête de gallinacé : des cônes qui se chevauchent, sinon on obtient une
// rangée de petits triangles détachés au lieu d'un peigne.
function crete(a, couleur, y, z, nb, ecart) {
  for (let i = 0; i < nb; i++) {
    const d = i - (nb - 1) / 2;
    const h = 0.11 - Math.abs(d) * 0.022;
    a.cone(couleur, { p: [0, y + h * 0.3, z + d * ecart], e: [0.045, h * 2.2, ecart * 1.9], seg: 6 });
  }
  a.sphere(couleur, { p: [0, y, z], e: [0.045, 0.06, ecart * nb * 0.95], seg: 8 });
}

// Un oiseau de basse-cour : corps ovoïde, deux pattes fines, bec et crête.
function volaille(a, o) {
  const { plumes, corps = 0.2, haut = 0.24, queue = plumes, patte = BEC } = o;
  a.membre('tronc');
  a.sphere(plumes, { p: [0, haut + corps * 0.5, 0.02], e: [corps * 1.5, corps * 1.7, corps * 2.1], seg: 12 });
  for (const [nom, s] of [['patteG', -1], ['patteD', 1]]) {
    a.membre(nom, [s * corps * 0.45, haut, 0]);
    a.cylindre(patte, { p: [s * corps * 0.45, haut * 0.55, 0], e: [0.032, haut, 0.032], haut: 0.5, bas: 0.6, seg: 6 });
    for (let d = -1; d <= 1; d++) {
      a.cylindre(patte, { p: [s * corps * 0.45 + d * 0.025, 0.012, -0.045], r: [0.35, d * 0.4, 0], e: [0.018, 0.1, 0.018], haut: 0.5, bas: 0.5, seg: 4 });
    }
  }
  return { haut, corps };
}

const MODELES = {
  // --- l'écurie ---
  cheval(a, robe = 0x7a4f2c, crins = 0x2e2018) {
    const q = quadrupede(a, {
      robe, museau: robe,
      longueur: 1.3, dos: 1.06, ventreY: 0.6, largeur: 0.42,
      teteP: [1.34, -0.86], teteE: [0.16, 0.2, 0.34],
      epaisseurPatte: 0.055, ecartPatte: 0.44,
    });
    a.membre('tronc');
    // chanfrein allongé et naseaux : le profil du cheval tient à ça
    a.sphere(robe, { p: [0, q.tY - 0.07, q.tZ - 0.2], e: [0.13, 0.14, 0.22], seg: 10 });
    for (const s of [-1, 1]) {
      a.sphere(0x2a1e16, { p: [s * 0.04, q.tY - 0.09, q.tZ - 0.29], e: [0.04, 0.04, 0.03], seg: 6 });
      a.cone(robe, { p: [s * 0.07, q.tY + 0.17, q.tZ + 0.05], r: [-0.2, 0, s * 0.25], e: [0.055, 0.16, 0.05], seg: 6 });
    }
    // crinière : une crête de mèches qui suit l'encolure jusqu'au garrot
    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      a.sphere(crins, {
        p: [0, q.tY + 0.06 - t * 0.3, q.tZ + 0.1 + t * 0.5],
        e: [0.06, 0.18, 0.14], seg: 6,
      });
    }
    // queue : une touffe épaisse qui tombe de la croupe
    a.cone(crins, { p: [0, q.dos - 0.2, q.zAr + 0.05], r: [Math.PI - 0.25, 0, 0], e: [0.15, 0.66, 0.15], seg: 8 });
    return q;
  },

  poney(a) { return MODELES.cheval(a, 0x9a7448, 0x3a2a1c); },
  cheval_blanc(a) { return MODELES.cheval(a, 0xe4ded0, 0xf0ece0); },
  cheval_noir(a) { return MODELES.cheval(a, 0x3a3230, 0x201a18); },

  ane(a) {
    const q = quadrupede(a, {
      robe: 0x9a958c, ventre: 0xd8d2c6, museau: 0xd8d2c6,
      longueur: 1.0, dos: 0.86, ventreY: 0.5, largeur: 0.35,
      teteP: [1.08, -0.66], teteE: [0.15, 0.18, 0.28],
      epaisseurPatte: 0.048,
    });
    a.membre('tronc');
    for (const s of [-1, 1]) {   // les grandes oreilles, la signature de l'âne
      a.sphere(0x9a958c, { p: [s * 0.08, q.tY + 0.26, q.tZ + 0.06], r: [0, 0, s * 0.3], e: [0.07, 0.34, 0.11], seg: 8 });
    }
    // la croix de Saint-André sur le garrot
    a.sphere(0x4a443c, { p: [0, q.dos - 0.02, -0.12], e: [0.06, 0.1, 0.5], seg: 8 });
    a.cone(0x4a443c, { p: [0, q.dos - 0.16, q.zAr + 0.03], r: [Math.PI - 0.2, 0, 0], e: [0.08, 0.46, 0.08], seg: 6 });
    return q;
  },

  // --- la basse-cour ---
  poule(a, plumes = 0xe8e2d4) {
    const v = volaille(a, { plumes });
    a.membre('tronc');
    const yT = v.haut + v.corps * 1.5;
    // le cou : sans lui, la tête est posée sur le corps comme un bouchon
    a.membreGalbe(plumes, {
      de: [0, v.haut + v.corps * 0.9, -0.06], a: [0, yT - 0.05, -0.15], r1: 0.075, r2: 0.06, seg: 8,
    });
    a.sphere(plumes, { p: [0, yT, -0.17], e: [0.15, 0.16, 0.16], seg: 10 });
    a.cone(BEC, { p: [0, yT - 0.01, -0.27], r: [-Math.PI / 2, 0, 0], e: [0.05, 0.09, 0.045], seg: 6 });
    for (const s of [-1, 1]) {
      a.sphere(OEIL, { p: [s * 0.05, yT + 0.03, -0.22], e: [0.026, 0.026, 0.02], seg: 6 });
    }
    crete(a, 0xc83a32, yT + 0.09, -0.17, 3, 0.055);
    a.sphere(0xc83a32, { p: [0, yT - 0.08, -0.23], e: [0.045, 0.07, 0.04], seg: 6 });
    // ailes plaquées le long du corps
    for (const s of [-1, 1]) {
      a.sphere(plumes, { p: [s * 0.15, v.haut + 0.16, 0.02], e: [0.05, 0.17, 0.3], seg: 8, t: 0.92 });
    }
    // queue : un petit éventail de plumes relevé, pas une palette plate
    for (let i = -1; i <= 1; i++) {
      a.cone(plumes, {
        p: [i * 0.04, v.haut + 0.26, 0.2], r: [0.95, 0, i * 0.34], e: [0.09, 0.28, 0.07], seg: 6, t: 0.86,
      });
    }
    return v;
  },

  poule_rousse(a) { return MODELES.poule(a, 0xb06a34); },
  poule_grise(a) { return MODELES.poule(a, 0x8a8880); },

  coq(a) {
    const v = volaille(a, { plumes: 0x2e2a3a, corps: 0.22, haut: 0.3 });
    a.membre('tronc');
    const yT = v.haut + v.corps * 1.4;
    // cou dressé, plumes de camail plus claires
    a.membreGalbe(0x8a4a2a, {
      de: [0, v.haut + v.corps * 0.9, -0.08], a: [0, yT - 0.06, -0.16], r1: 0.09, r2: 0.07, seg: 8,
    });
    a.sphere(0x9a3a28, { p: [0, yT, -0.18], e: [0.16, 0.17, 0.17], seg: 10 });
    a.cone(BEC, { p: [0, yT - 0.01, -0.29], r: [-Math.PI / 2, 0, 0], e: [0.05, 0.09, 0.045], seg: 6 });
    for (const s of [-1, 1]) a.sphere(OEIL, { p: [s * 0.055, yT + 0.04, -0.24], e: [0.028, 0.028, 0.02], seg: 6 });
    crete(a, 0xd83a2a, yT + 0.12, -0.2, 5, 0.05);
    for (const s of [-1, 1]) a.sphere(0xd83a2a, { p: [s * 0.03, yT - 0.11, -0.25], e: [0.04, 0.09, 0.035], seg: 6 });
    // la queue en faucille, ce qui distingue le coq de la poule au premier coup d'œil
    for (let i = 0; i < 5; i++) {
      const ang = 0.75 + i * 0.2;
      a.cone([0x2e6a4a, 0x3a7a58, 0x2e2a3a, 0x6a5a2a, 0x2e6a4a][i], {
        p: [(i - 2) * 0.035, v.haut + 0.3 + i * 0.035, 0.2],
        r: [ang, 0, (i - 2) * 0.12], e: [0.075, 0.5, 0.04], seg: 6,
      });
    }
    return v;
  },

  poussin(a) {
    const v = volaille(a, { plumes: 0xf0d048, corps: 0.11, haut: 0.1 });
    a.membre('tronc');
    const yT = v.haut + v.corps * 1.5;
    a.sphere(0xf0d048, { p: [0, yT, -0.09], e: [0.11, 0.11, 0.11], seg: 8 });
    a.cone(BEC, { p: [0, yT - 0.01, -0.15], r: [-Math.PI / 2, 0, 0], e: [0.03, 0.05, 0.03], seg: 6 });
    for (const s of [-1, 1]) a.sphere(OEIL, { p: [s * 0.035, yT + 0.02, -0.12], e: [0.02, 0.02, 0.015], seg: 6 });
    return v;
  },

  oie(a) {
    const v = volaille(a, { plumes: 0xf2efe6, corps: 0.21, haut: 0.28 });
    a.membre('tronc');
    // le long cou courbe : c'est toute la silhouette de l'oie. Il est fait de
    // segments galbés qui s'emboîtent, pas d'un chapelet de billes.
    let y = v.haut + 0.2, z = -0.1, r = 0.075;
    for (let i = 0; i < 5; i++) {
      const y2 = y + 0.1, z2 = z - 0.018 - i * 0.014, r2 = r - 0.004;
      a.membreGalbe(0xf2efe6, { de: [0, y, z], a: [0, y2, z2], r1: r, r2, seg: 8 });
      y = y2; z = z2; r = r2;
    }
    a.sphere(0xf2efe6, { p: [0, y + 0.03, z - 0.04], e: [0.13, 0.13, 0.17], seg: 10 });
    a.cone(0xe08828, { p: [0, y, z - 0.14], r: [-Math.PI / 2, 0, 0], e: [0.06, 0.12, 0.05], seg: 6 });
    for (const s of [-1, 1]) {
      a.sphere(OEIL, { p: [s * 0.045, y + 0.04, z - 0.08], e: [0.024, 0.024, 0.018], seg: 6 });
      a.sphere(0xe8e4da, { p: [s * 0.16, v.haut + 0.16, 0.04], e: [0.05, 0.16, 0.34], seg: 8, t: 0.94 });
    }
    return v;
  },

  colombe(a) {
    const v = volaille(a, { plumes: 0xf4f2ee, corps: 0.1, haut: 0.11, patte: 0xd08a8a });
    a.membre('tronc');
    const yT = v.haut + v.corps * 1.3;
    a.sphere(0xf4f2ee, { p: [0, yT, -0.09], e: [0.1, 0.1, 0.1], seg: 8 });
    a.cone(0x9a8a7a, { p: [0, yT - 0.01, -0.15], r: [-Math.PI / 2, 0, 0], e: [0.025, 0.05, 0.025], seg: 6 });
    for (const s of [-1, 1]) {
      a.sphere(OEIL, { p: [s * 0.035, yT + 0.02, -0.12], e: [0.018, 0.018, 0.014], seg: 6 });
      a.sphere(0xe8e6e0, { p: [s * 0.08, v.haut + 0.08, 0.02], e: [0.03, 0.09, 0.2], seg: 6 });
    }
    a.cone(0xf0eee8, { p: [0, v.haut + 0.1, 0.16], r: [-1.7, 0, 0], e: [0.12, 0.2, 0.03], seg: 6 });
    return v;
  },

  // Le paon des jardins : la roue déployée, c'est le morceau de bravoure.
  paon(a) {
    const v = volaille(a, { plumes: 0x1a5a8a, corps: 0.2, haut: 0.3, patte: 0x9a8a72 });
    a.membre('tronc');
    const yT = v.haut + 0.52;
    // long cou bleu, galbé d'un seul tenant
    a.membreGalbe(0x1050a0, {
      de: [0, v.haut + 0.2, -0.06], a: [0, yT - 0.04, -0.15], r1: 0.085, r2: 0.065, seg: 8,
    });
    a.sphere(0x1050a0, { p: [0, yT + 0.06, -0.16], e: [0.12, 0.13, 0.14], seg: 10 });
    a.cone(0x9a8a72, { p: [0, yT + 0.04, -0.25], r: [-Math.PI / 2, 0, 0], e: [0.04, 0.08, 0.035], seg: 6 });
    for (const s of [-1, 1]) {
      a.sphere(0xf0f0ea, { p: [s * 0.05, yT + 0.1, -0.2], e: [0.03, 0.025, 0.02], seg: 6 });
      a.sphere(OEIL, { p: [s * 0.05, yT + 0.1, -0.215], e: [0.018, 0.018, 0.015], seg: 6 });
    }
    // l'aigrette : trois petites plumes à pompon
    for (let i = -1; i <= 1; i++) {
      a.cylindre(0x1050a0, { p: [i * 0.04, yT + 0.22, -0.15], r: [0, 0, i * 0.2], e: [0.012, 0.14, 0.012], haut: 0.5, bas: 0.5, seg: 4 });
      a.sphere(0x2a7a6a, { p: [i * 0.05, yT + 0.3, -0.15], e: [0.035, 0.035, 0.02], seg: 6 });
    }
    // la roue : un éventail de plumes à ocelle
    for (let i = 0; i < 17; i++) {
      const ang = (i / 16 - 0.5) * 2.5;
      const L = 1.15 - Math.abs(i - 8) * 0.035;
      const bx = Math.sin(ang), by = Math.cos(ang);
      a.cylindre(0x2a7a5a, {
        p: [bx * L * 0.45, v.haut + 0.24 + by * L * 0.45, 0.3],
        r: [0, 0, -ang], e: [0.05, L, 0.02], haut: 0.5, bas: 0.2, seg: 4,
      });
      a.sphere(0x2a8a6a, { p: [bx * L * 0.94, v.haut + 0.24 + by * L * 0.94, 0.31], e: [0.13, 0.13, 0.03], seg: 8 });
      a.sphere(0x1a3a8a, { p: [bx * L * 0.94, v.haut + 0.24 + by * L * 0.94, 0.325], e: [0.085, 0.085, 0.025], seg: 8 });
      a.sphere(0x2a1a4a, { p: [bx * L * 0.94, v.haut + 0.24 + by * L * 0.94, 0.335], e: [0.045, 0.045, 0.02], seg: 6 });
    }
    return v;
  },

  // --- la ferme et la meute ---
  cochon(a, robe = 0xe8a8b0) {
    const q = quadrupede(a, {
      robe, ventre: 0xf2bec4, museau: 0xd88a96,
      longueur: 0.92, dos: 0.62, ventreY: 0.24, largeur: 0.42,
      teteP: [0.54, -0.58], teteE: [0.19, 0.19, 0.24],
      epaisseurPatte: 0.042, sabot: 0x5a4038, ecartPatte: 0.4,
    });
    a.membre('tronc');
    // groin : un disque plat avec deux narines, planté au bout du museau
    a.cylindre(0xd88a96, { p: [0, q.tY - 0.05, q.tZ - 0.19], r: [Math.PI / 2, 0, 0], e: [0.15, 0.06, 0.15], haut: 0.5, bas: 0.55, seg: 10 });
    for (const s of [-1, 1]) {
      a.sphere(0x8a5a62, { p: [s * 0.038, q.tY - 0.05, q.tZ - 0.23], e: [0.032, 0.045, 0.02], seg: 6 });
      a.cone(0xe0989e, { p: [s * 0.12, q.tY + 0.12, q.tZ - 0.02], r: [-2.3, 0, s * 0.4], e: [0.13, 0.2, 0.05], seg: 6 });
    }
    // la queue en tire-bouchon, enroulée sur la croupe
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      a.sphere(robe, {
        p: [Math.sin(t * 8) * 0.055, q.dos - 0.08 + t * 0.1, q.zAr + 0.02 + Math.cos(t * 8) * 0.05],
        e: [0.038, 0.038, 0.038], seg: 6,
      });
    }
    return q;
  },

  porcelet(a) { return MODELES.cochon(a, 0xf2c0c6); },

  mouton(a, laine = 0xf0ece0) {
    const q = quadrupede(a, {
      robe: laine, museau: 0x4a4038,
      longueur: 0.82, dos: 0.66, ventreY: 0.34, largeur: 0.36,
      teteP: [0.66, -0.54], teteE: [0.14, 0.16, 0.2],
      epaisseurPatte: 0.038, sabot: 0x2a2420,
    });
    a.membre('tronc');
    // la toison : une grappe de boules le long de l'échine et des flancs
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      a.sphere(laine, {
        p: [Math.sin(ang) * q.largeur * 0.4, q.cy + Math.cos(ang) * q.ch * 0.42,
          ((i % 3) - 1) * q.longueur * 0.3],
        e: [0.2, 0.19, 0.2], seg: 8, t: 0.93 + (i % 3) * 0.035,
      });
    }
    // la tête de face noire, dégagée de la laine
    a.sphere(0x4a4038, { p: [0, q.tY, q.tZ], e: [0.15, 0.17, 0.21], seg: 10 });
    for (const s of [-1, 1]) {
      a.sphere(0x4a4038, { p: [s * 0.12, q.tY + 0.05, q.tZ + 0.04], r: [0, 0, s * 0.7], e: [0.06, 0.15, 0.06], seg: 6 });
    }
    return q;
  },

  agneau(a) { return MODELES.mouton(a, 0xf6f4ee); },

  vache(a) {
    const q = quadrupede(a, {
      robe: 0xf0ece2, museau: 0xd8a8a0,
      longueur: 1.24, dos: 0.94, ventreY: 0.46, largeur: 0.46,
      teteP: [0.94, -0.8], teteE: [0.19, 0.21, 0.3],
      epaisseurPatte: 0.058,
    });
    a.membre('tronc');
    // les taches noires : posées sur le flanc, pas au sommet du dos
    for (const [px, py, pz, r] of [[0.2, 0.08, -0.26, 0.21], [-0.22, 0.0, 0.2, 0.24], [0.14, -0.08, 0.42, 0.16]]) {
      a.sphere(0x322c28, { p: [px, q.cy + py, pz], e: [r * 1.5, r * 1.5, r * 1.5], seg: 8 });
    }
    for (const s of [-1, 1]) {
      a.cone(0xe8e0cc, { p: [s * 0.13, q.tY + 0.2, q.tZ + 0.04], r: [0, 0, s * 0.5], e: [0.05, 0.17, 0.05], seg: 6 });
      a.sphere(0xf0ece2, { p: [s * 0.17, q.tY + 0.06, q.tZ + 0.04], r: [0, 0, s * 0.6], e: [0.07, 0.13, 0.07], seg: 6 });
    }
    a.cylindre(0xe8c8c0, { p: [0, q.ventreY + 0.02, 0.3], e: [0.2, 0.16, 0.22], haut: 0.5, bas: 0.35, seg: 8 });
    a.cone(0x322c28, { p: [0, q.dos - 0.16, q.zAr + 0.03], r: [Math.PI - 0.18, 0, 0], e: [0.07, 0.6, 0.07], seg: 6 });
    return q;
  },

  chien(a, robe = 0xb08a52) {
    const q = quadrupede(a, {
      robe, ventre: 0xd8bc90, museau: 0x3a2e24,
      longueur: 0.76, dos: 0.58, ventreY: 0.3, largeur: 0.26,
      teteP: [0.64, -0.5], teteE: [0.14, 0.14, 0.19],
      epaisseurPatte: 0.038, sabot: 0x3a3028,
    });
    a.membre('tronc');
    a.sphere(0x3a2e24, { p: [0, q.tY - 0.03, q.tZ - 0.16], e: [0.1, 0.09, 0.14], seg: 8 });
    a.sphere(0x1a1614, { p: [0, q.tY - 0.01, q.tZ - 0.23], e: [0.05, 0.045, 0.04], seg: 6 });
    for (const s of [-1, 1]) {   // oreilles tombantes de braque
      a.sphere(0x8a6a3a, { p: [s * 0.12, q.tY + 0.01, q.tZ + 0.03], e: [0.05, 0.22, 0.13], seg: 8 });
    }
    a.cone(robe, { p: [0, q.dos + 0.04, q.zAr + 0.05], r: [0.8, 0, 0], e: [0.07, 0.34, 0.07], seg: 6 });
    return q;
  },

  levrier(a) { return MODELES.chien(a, 0xd8d0c0); },

  chat(a, robe = 0x5a5048) {
    const q = quadrupede(a, {
      robe, ventre: 0xd8d0c4, museau: robe,
      longueur: 0.5, dos: 0.38, ventreY: 0.2, largeur: 0.17,
      teteP: [0.42, -0.32], teteE: [0.11, 0.11, 0.13],
      epaisseurPatte: 0.026, sabot: robe,
    });
    a.membre('tronc');
    for (const s of [-1, 1]) {   // oreilles triangulaires dressées
      a.cone(robe, { p: [s * 0.06, q.tY + 0.1, q.tZ + 0.01], r: [0, 0, s * 0.25], e: [0.07, 0.11, 0.04], seg: 6 });
      a.sphere(0x8ac04a, { p: [s * 0.045, q.tY + 0.03, q.tZ - 0.07], e: [0.03, 0.035, 0.025], seg: 6 });
    }
    a.sphere(0xd8a0a0, { p: [0, q.tY - 0.03, q.tZ - 0.1], e: [0.035, 0.028, 0.03], seg: 6 });
    // queue dressée, recourbée en point d'interrogation
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      a.sphere(robe, {
        p: [0, q.dos - 0.02 + t * 0.34, q.zAr + 0.02 + Math.sin(t * 2.4) * 0.11],
        e: [0.052, 0.07, 0.052], seg: 6,
      });
    }
    return q;
  },

  chat_roux(a) { return MODELES.chat(a, 0xc87a3a); },
};

// Hauteurs et largeurs de collision, et le pas de chacun.
export const BETES = {
  cheval: { h: 1.5, l: 0.8, v: 1.7, cri: 'Hiiii !', nom: 'Cheval', emoji: '🐴' },
  cheval_blanc: { h: 1.5, l: 0.8, v: 1.7, cri: 'Hiiii !', nom: 'Cheval blanc', emoji: '🐴' },
  cheval_noir: { h: 1.5, l: 0.8, v: 1.8, cri: 'Hiiii !', nom: 'Destrier', emoji: '🐴' },
  poney: { h: 1.2, l: 0.7, v: 1.5, cri: 'Hiii !', nom: 'Poney', emoji: '🐴' },
  ane: { h: 1.2, l: 0.65, v: 1.1, cri: 'Hi-han !', nom: 'Âne', emoji: '🫏' },
  poule: { h: 0.6, l: 0.35, v: 1.5, cri: 'Cot cot !', nom: 'Poule', emoji: '🐔' },
  poule_rousse: { h: 0.6, l: 0.35, v: 1.5, cri: 'Cot cot !', nom: 'Poule rousse', emoji: '🐔' },
  poule_grise: { h: 0.6, l: 0.35, v: 1.5, cri: 'Cot cot !', nom: 'Poule grise', emoji: '🐔' },
  coq: { h: 0.8, l: 0.4, v: 1.3, cri: 'Cocorico !', nom: 'Coq', emoji: '🐓' },
  poussin: { h: 0.3, l: 0.2, v: 1.7, cri: 'Piou piou !', nom: 'Poussin', emoji: '🐤' },
  oie: { h: 0.9, l: 0.4, v: 1.2, cri: 'Cacarde !', nom: 'Oie', emoji: '🦢' },
  colombe: { h: 0.35, l: 0.25, v: 1.1, cri: 'Roucoule…', nom: 'Colombe', emoji: '🕊️' },
  paon: { h: 1.1, l: 0.6, v: 0.8, cri: 'Léon !', nom: 'Paon', emoji: '🦚' },
  cochon: { h: 0.75, l: 0.55, v: 1.0, cri: 'Groin groin !', nom: 'Cochon', emoji: '🐷' },
  porcelet: { h: 0.5, l: 0.4, v: 1.6, cri: 'Groin !', nom: 'Porcelet', emoji: '🐖' },
  mouton: { h: 0.85, l: 0.55, v: 0.9, cri: 'Bêêê !', nom: 'Mouton', emoji: '🐑' },
  agneau: { h: 0.6, l: 0.4, v: 1.2, cri: 'Bêê !', nom: 'Agneau', emoji: '🐑' },
  vache: { h: 1.25, l: 0.7, v: 0.8, cri: 'Meuh !', nom: 'Vache', emoji: '🐄' },
  chien: { h: 0.75, l: 0.45, v: 2.0, cri: 'Ouaf !', nom: 'Chien', emoji: '🐕' },
  levrier: { h: 0.75, l: 0.45, v: 2.4, cri: 'Ouaf !', nom: 'Lévrier', emoji: '🐕' },
  chat: { h: 0.5, l: 0.3, v: 1.4, cri: 'Miaou !', nom: 'Chat', emoji: '🐈' },
  chat_roux: { h: 0.5, l: 0.3, v: 1.4, cri: 'Miaou !', nom: 'Chat roux', emoji: '🐈' },
};

export function construireBete(espece) {
  const a = new Atelier();
  const f = MODELES[espece];
  // Les deux tables doivent rester d'accord : un modèle sans gabarit passait la
  // construction sans broncher, puis faisait échouer la première animation — et
  // l'exception emportait avec elle toutes les bêtes suivantes du même enclos.
  if (!f) throw new Error(`bête sans modèle : ${espece}`);
  if (!BETES[espece]) throw new Error(`bête sans gabarit : ${espece}`);
  // les membres d'abord, pour que l'ordre des groupes soit stable
  f(a);
  const g = a.finir();
  const m = g.userData.membres;
  // marche en diagonale : avant-gauche avec arrière-droite
  const paires = m.patteAvG
    ? [m.patteAvG, m.patteArD, m.patteAvD, m.patteArG]
    : [m.patteG, m.patteD];
  g.userData.legs = paires.filter(Boolean);
  return g;
}

export const ESPECES = Object.keys(BETES);
