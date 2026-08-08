// La base spatiale : un avant-poste de space opera posé sur une planète de
// sable, avec sa flotte au sol.
//
// Tout est original, mais l'ambiance est celle qu'on attend : des dômes
// blanchis par le soleil, un port d'astronefs, une cantina bruyante, et surtout
// des vaisseaux dont la silhouette se reconnaît de loin —
//
//  - le chasseur à ailes en croix, quatre ailerons ouverts en X et un canon au
//    bout de chacun ;
//  - le cargo à disque, sa cabine décalée sur le côté et sa fourche à l'avant ;
//  - l'intercepteur à panneaux hexagonaux, une bille entre deux plaques ;
//  - le croiseur triangulaire, immense coin gris posé au bout de la piste ;
//  - et le marcheur à quatre pattes, qui domine tout le camp.
//
// C'est la variété des silhouettes qui fait la scène : un enfant doit pouvoir
// courir de l'une à l'autre et les reconnaître sans qu'on les lui nomme.

import { BLOCK, DECOR_START } from './blocks.js';

const uni = (couleur) => DECOR_START + couleur * 10;

const SABLE = BLOCK.SAND;
const ROCHE = uni(19);         // beige : la roche cuite par les soleils
const DALLE = uni(23);         // gris clair : les aires bétonnées
const METAL = uni(24);
const METAL_SOMBRE = uni(25);
const BLANC = uni(27);
const ORANGE = uni(1);
const ROUGE = uni(0);
const BLEU = uni(10);
const VERT = uni(6);
const NOIR = uni(26);
const VERRE = BLOCK.GLASS;

export function buildEspace(poser) {
  // y = -1 : le sol lui-même ; y = 0 : le premier bloc en l'air.
  const RAYON = 74;
  const set = (x, y, z, id) => {
    if (x * x + z * z > RAYON * RAYON) return;
    poser(x, y + 1, z, id);
  };

  const dalle = (x0, x1, z0, z1, y, id) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, id);
    }
  };
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) dalle(x0, x1, z0, z1, y, id);
  };
  const anneau = (cx, cz, rInt, rExt, y, id) => {
    const R = Math.ceil(rExt);
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= rExt && d >= rInt) set(cx + dx, y, cz + dz, id);
      }
    }
  };
  const disque = (cx, cz, r, y, id) => anneau(cx, cz, 0, r, y, id);
  // une coupole : des disques qui se resserrent en montant
  const dome = (cx, cz, r, h, id) => {
    for (let k = 0; k <= h; k++) {
      const rr = r * Math.sqrt(Math.max(0, 1 - (k / (h + 0.6)) ** 2));
      if (rr < 0.5) { set(cx, k, cz, id); break; }
      anneau(cx, cz, 0, rr, k, id);
    }
  };

  // --- le sol -------------------------------------------------------------
  // Le sable court jusqu'au bord de la zone aplanie : arrêté plus tôt, il
  // laissait une couronne d'herbe plate autour du désert, ce qui ne ressemblait
  // à rien.
  disque(0, 0, 72, -1, SABLE);
  // quelques plaques de roche affleurante, pour casser l'uniformité
  for (const [rx, rz, rr] of [[-40, 30, 9], [34, -36, 11], [-16, -44, 7], [46, 22, 8]]) {
    disque(rx, rz, rr, -1, ROCHE);
    dome(rx, rz, rr - 3, 4, ROCHE);
  }

  // --- l'astroport --------------------------------------------------------
  // Une grande aire bétonnée, ses cercles d'appontage et sa piste.
  disque(0, 0, 34, -1, DALLE);
  for (const [px, pz] of [[-18, -12], [-18, 12], [16, -16], [16, 16], [0, 24]]) {
    anneau(px, pz, 6, 7, -1, ORANGE);
    anneau(px, pz, 0, 1, -1, ORANGE);
  }
  // la piste d'envol, plein est
  dalle(30, 58, -5, 5, -1, METAL_SOMBRE);
  for (let x = 32; x <= 56; x += 5) dalle(x, x + 1, 0, 0, -1, ORANGE);

  // --- la tour de contrôle du port ---------------------------------------
  const TX = -6, TZ = -30;
  for (let y = 0; y <= 18; y++) anneau(TX, TZ, 0, y % 6 === 5 ? 4 : 3, y, y % 6 === 5 ? METAL_SOMBRE : METAL);
  for (let y = 19; y <= 22; y++) anneau(TX, TZ, 0, 6, y, y === 22 ? METAL : VERRE);
  anneau(TX, TZ, 0, 7, 23, METAL_SOMBRE);
  set(TX, 24, TZ, ROUGE);

  // --- les fermes à humidité ---------------------------------------------
  // Des dômes blancs à demi enterrés, avec leur condenseur planté à côté :
  // c'est ce qui fait « planète désertique habitée ».
  for (const [fx, fz, r] of [[-34, -6, 7], [-30, 12, 6], [-40, 20, 5], [-24, 26, 6]]) {
    dome(fx, fz, r, r - 1, BLANC);
    disque(fx, fz, r + 2, -1, ROCHE);
    for (let y = 0; y < 2; y++) set(fx, y, fz - r, BLOCK.AIR);   // la porte
    // le condenseur : un mât surmonté d'ailettes
    for (let y = 0; y <= 6; y++) set(fx + r + 2, y, fz, METAL);
    for (const s of [-1, 1]) { set(fx + r + 2 + s, 6, fz, METAL_SOMBRE); set(fx + r + 2, 6, fz + s, METAL_SOMBRE); }
    set(fx + r + 2, 7, fz, VERT);
  }

  // --- la cantina ---------------------------------------------------------
  // Bâtiment bas et rond, comptoir circulaire au milieu, lumières colorées.
  const CX = 30, CZ = 30;
  disque(CX, CZ, 13, -1, DALLE);
  for (let y = 0; y <= 4; y++) anneau(CX, CZ, 10, 11, y, ROCHE);
  disque(CX, CZ, 11, 5, ROCHE);
  dome(CX, CZ, 9, 5, ROCHE);
  for (let y = 0; y < 3; y++) { set(CX, y, CZ - 11, BLOCK.AIR); set(CX, y, CZ - 10, BLOCK.AIR); }
  for (let a = 0; a < 8; a++) {                        // les lucarnes
    const rad = (a / 8) * Math.PI * 2;
    set(Math.round(CX + Math.sin(rad) * 10), 3, Math.round(CZ + Math.cos(rad) * 10), VERRE);
  }
  anneau(CX, CZ, 3, 4, 0, METAL);                      // le comptoir
  anneau(CX, CZ, 3, 4, 1, METAL_SOMBRE);
  for (let a = 0; a < 10; a++) {                       // les tabourets
    const rad = (a / 10) * Math.PI * 2;
    set(Math.round(CX + Math.sin(rad) * 6), 0, Math.round(CZ + Math.cos(rad) * 6), METAL);
  }
  for (const [lx, lz, c] of [[-6, 0, ROUGE], [6, 0, BLEU], [0, -6, VERT], [0, 6, ORANGE]]) {
    set(CX + lx, 4, CZ + lz, c);
  }
  // l'enseigne, à l'entrée
  for (let y = 0; y <= 5; y++) { set(CX - 4, y, CZ - 13, METAL); set(CX + 4, y, CZ - 13, METAL); }
  for (let x = CX - 4; x <= CX + 4; x++) set(x, 6, CZ - 13, ORANGE);

  // --- les vaisseaux ------------------------------------------------------

  // Le chasseur à ailes en croix : fuselage effilé, quatre ailerons ouverts en
  // X, un canon au bout de chacun, et le petit droïde logé derrière la verrière.
  function chasseurX(cx, cz, sens) {
    const y0 = 2, L = 18, demi = L >> 1;
    for (let i = -demi; i <= demi; i++) {
      const t = (i * sens) / demi;
      const larg = t > 0.75 ? 0 : 1;
      for (let dz = -larg; dz <= larg; dz++) {
        set(cx + i, y0, cz + dz, BLANC);
        if (t < 0.55) set(cx + i, y0 + 1, cz + dz, BLANC);
      }
    }
    set(cx + (demi - 1) * sens, y0 + 1, cz, VERRE);       // la verrière
    set(cx + (demi - 3) * sens, y0 + 2, cz, BLEU);        // le droïde derrière
    for (let k = 1; k <= 4; k++) set(cx + (demi + k) * sens, y0, cz, METAL);  // le nez long
    // les quatre ailerons, ouverts en X
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let k = 1; k <= 8; k++) {
          const y = y0 + (sy > 0 ? 1 : 0) + Math.round(sy * k * 0.42);
          set(cx - Math.round(k * 0.25) * sens, y, cz + sz * k, k > 6 ? ROUGE : BLANC);
        }
        // le canon au bout de l'aileron
        const yb = y0 + (sy > 0 ? 1 : 0) + Math.round(sy * 8 * 0.42);
        for (let k = 0; k <= 3; k++) set(cx + (3 - k) * sens, yb, cz + sz * 8, METAL_SOMBRE);
      }
    }
    // les tuyères
    for (const sz of [-2, 2]) for (let k = 0; k <= 2; k++) set(cx - (demi + k) * sens, y0, cz + sz, ORANGE);
    // le train
    for (const sz of [-1, 1]) set(cx - 2 * sens, y0 - 1, cz + sz * 2, METAL_SOMBRE);
    set(cx + (demi - 4) * sens, y0 - 1, cz, METAL_SOMBRE);
  }

  // Le cargo à disque : une soucoupe aplatie, sa cabine décalée sur le côté et
  // la fourche caractéristique à l'avant.
  function cargoDisque(cx, cz) {
    const y0 = 2;
    for (let k = 0; k <= 2; k++) anneau(cx, cz, 0, 13 - k * 2.5, y0 + k, k === 2 ? METAL : METAL_SOMBRE);
    anneau(cx, cz, 0, 13, y0 - 1, METAL_SOMBRE);
    disque(cx, cz, 4, y0 + 3, METAL);                     // la bosse centrale
    // la cabine, décalée à tribord
    bloc(cx + 6, cx + 10, y0 + 3, y0 + 4, cz + 6, cz + 9, METAL);
    set(cx + 8, y0 + 4, cz + 6, VERRE); set(cx + 9, y0 + 4, cz + 7, VERRE);
    // la fourche avant
    for (const sz of [-1, 1]) {
      for (let k = 0; k <= 7; k++) set(cx - 13 - k, y0 + 1, cz + sz * 4, METAL);
      set(cx - 20, y0 + 1, cz + sz * 3, METAL_SOMBRE);
    }
    // les tuyères arrière, bien larges
    for (let dz = -7; dz <= 7; dz++) set(cx + 13, y0 + 1, cz + dz, ORANGE);
    // le train
    for (const [dx, dz] of [[-6, -6], [-6, 6], [7, 0]]) {
      for (let y = y0 - 2; y < y0 - 1; y++) set(cx + dx, y, cz + dz, METAL_SOMBRE);
    }
  }

  // L'intercepteur : une bille de cockpit prise entre deux grands panneaux
  // hexagonaux. Silhouette minimale, immédiatement lisible.
  function intercepteur(cx, cz) {
    const y0 = 3;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 2) continue;
          set(cx + dx, y0 + dy, cz + dz, METAL_SOMBRE);
        }
      }
    }
    set(cx, y0, cz - 2, VERRE);
    for (const sz of [-1, 1]) {
      set(cx, y0, cz + sz * 2, METAL);
      // le panneau hexagonal : plein, avec les coins coupés
      for (let dy = -5; dy <= 5; dy++) {
        const larg = Math.abs(dy) >= 4 ? 1 : 2;
        for (let dx = -larg; dx <= larg; dx++) {
          set(cx + dx, y0 + dy, cz + sz * 4, Math.abs(dy) === 5 ? METAL : NOIR);
        }
      }
      for (let dy = -5; dy <= 5; dy++) set(cx, y0 + dy, cz + sz * 3, METAL);
    }
  }

  // Le croiseur triangulaire : un coin gris de quarante blocs, posé au bout de
  // la piste. C'est la masse qui impressionne, pas le détail.
  function croiseur(cx, cz) {
    const L = 40, y0 = 1;
    for (let i = 0; i < L; i++) {
      const t = i / L;                       // 0 à la pointe, 1 à l'arrière
      const larg = Math.round(1 + t * 13);
      const haut = Math.round(1 + t * 7);
      for (let dz = -larg; dz <= larg; dz++) {
        for (let dy = 0; dy <= haut; dy++) {
          const bord = dy === haut || Math.abs(dz) === larg;
          set(cx + i, y0 + dy, cz + dz, bord ? METAL : METAL_SOMBRE);
        }
      }
    }
    // la superstructure arrière et ses deux tours
    bloc(cx + L - 12, cx + L - 4, y0 + 8, y0 + 11, cz - 4, cz + 4, METAL);
    for (const sz of [-1, 1]) {
      for (let y = y0 + 12; y <= y0 + 15; y++) set(cx + L - 8, y, cz + sz * 2, METAL);
      set(cx + L - 8, y0 + 16, cz + sz * 2, VERRE);
    }
    // les trois grandes tuyères
    for (const dz of [-6, 0, 6]) {
      for (let dy = 1; dy <= 3; dy++) {
        for (let d2 = -1; d2 <= 1; d2++) set(cx + L, y0 + dy, cz + dz + d2, BLEU);
      }
    }
    // les hublots le long du flanc
    for (let i = 10; i < L - 6; i += 3) {
      for (const sz of [-1, 1]) {
        const larg = Math.round(1 + (i / L) * 13);
        set(cx + i, y0 + 2, cz + sz * larg, VERRE);
      }
    }
  }

  // Le marcheur à quatre pattes : caisse blindée haut perchée, cou articulé,
  // tête à hublots. Il domine le camp de toute sa hauteur.
  function marcheur(cx, cz) {
    const yC = 14;                       // hauteur du ventre
    bloc(cx - 4, cx + 6, yC, yC + 5, cz - 4, cz + 4, METAL);
    bloc(cx - 3, cx + 5, yC + 1, yC + 4, cz - 3, cz + 3, METAL_SOMBRE);
    // le cou, en pente vers l'avant
    for (let k = 0; k <= 4; k++) {
      bloc(cx - 6 - k, cx - 5 - k, yC + 3 - k, yC + 4 - k, cz - 2, cz + 2, METAL);
    }
    // la tête
    bloc(cx - 13, cx - 9, yC - 2, yC + 1, cz - 3, cz + 3, METAL);
    for (const sz of [-1, 1]) set(cx - 13, yC, cz + sz, VERRE);
    for (const sz of [-2, 2]) for (let k = 0; k <= 2; k++) set(cx - 14 - k, yC - 1, cz + sz, METAL_SOMBRE);
    // les quatre pattes, à deux segments
    for (const dx of [-2, 4]) {
      for (const dz of [-4, 4]) {
        for (let y = 6; y < yC; y++) bloc(cx + dx - 1, cx + dx + 1, y, y, cz + dz - 1, cz + dz + 1, METAL);
        for (let y = 0; y < 6; y++) {
          const glis = Math.round((6 - y) * 0.3);
          bloc(cx + dx - 1 + glis, cx + dx + glis, y, y, cz + dz - 1, cz + dz + 1, METAL_SOMBRE);
        }
        dalle(cx + dx, cx + dx + 3, cz + dz - 2, cz + dz + 2, -1, METAL_SOMBRE);
      }
    }
  }

  chasseurX(-18, -12, 1);
  chasseurX(-18, 12, 1);
  chasseurX(0, 24, 1);
  cargoDisque(16, -16);
  intercepteur(20, 12);
  intercepteur(26, 4);
  croiseur(-24, -40);
  marcheur(-40, -28);

  // --- les abords ---------------------------------------------------------
  // les conteneurs du fret, empilés au bord de l'aire
  for (let i = 0; i < 7; i++) {
    const bx = -30 + i * 4, bz = 34;
    const h = 1 + (i % 3);
    for (let k = 0; k < h; k++) {
      bloc(bx, bx + 2, k * 3, k * 3 + 2, bz, bz + 3, [ORANGE, BLEU, VERT, ROUGE][(i + k) % 4]);
    }
  }
  // les mâts d'éclairage de l'aire
  for (const [lx, lz] of [[-26, -26], [26, -26], [-26, 26], [26, 26]]) {
    for (let y = 0; y <= 9; y++) set(lx, y, lz, METAL);
    for (const s of [-1, 1]) { set(lx + s, 10, lz, BLANC); set(lx, 10, lz + s, BLANC); }
  }
  // le portique d'entrée, au sud
  for (let y = 0; y <= 7; y++) { set(-5, y, 40, METAL); set(5, y, 40, METAL); }
  for (let x = -5; x <= 5; x++) set(x, 8, 40, METAL_SOMBRE);
  for (let x = -3; x <= 3; x += 2) set(x, 7, 40, ORANGE);
}
