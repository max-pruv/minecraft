// Le château de Villandry et ses jardins, dans la vallée de la Loire.
//
// Ce que la visite réelle donne à voir, et qu'on essaie de rendre ici : un
// corps de logis Renaissance en U ouvert au nord, avec le donjon carré du
// château fort d'origine conservé à l'angle, en tuffeau blanc sous des toits
// d'ardoise ; et surtout six jardins étagés sur trois terrasses, dont le
// potager décoratif à neuf carrés qui a fait la célébrité du lieu.
//
// Les proportions sont ramenées à l'échelle du jeu : un enfant doit pouvoir
// traverser le domaine sans s'ennuyer. La géométrie des parterres, elle, est
// respectée — c'est elle qu'on reconnaît sur les photos vues d'en haut.

import { BLOCK, DECOR_START, VILLANDRY_BLOCK as V, MEUBLE_START } from './blocks.js';

// Un aplat de couleur de la palette décorative : `Uni` est le motif 0.
const uni = (couleur) => DECOR_START + couleur * 10;

// Les légumes du potager. Villandry alterne réellement des dominantes de bleu
// (poireaux, choux), de rouge (betteraves, choux rouges), de vert (salades) et
// d'orange (carottes, courges).
const POIREAU = uni(10), CHOU_BLEU = uni(9), BETTERAVE = uni(0), CHOU_ROUGE = uni(13),
      SALADE = uni(4), BLETTE = uni(5), CAROTTE = uni(1), COURGE = uni(2),
      AUBERGINE = uni(12), OSEILLE = uni(6), TOMATE = uni(0), CELERI = uni(3);

// Les meubles, dans l'ordre où ils sont déclarés.
const LIT = MEUBLE_START, CHEMINEE = MEUBLE_START + 1, LUSTRE = MEUBLE_START + 2,
      TAPISSERIE = MEUBLE_START + 3, BUFFET = MEUBLE_START + 4, TABLE = MEUBLE_START + 5,
      FAUTEUIL = MEUBLE_START + 6, VASQUE = MEUBLE_START + 7;

// Hauteurs des trois terrasses, relatives au sol du site.
const T_POTAGER = 0, T_ORNEMENT = 3, T_EAU = 6;

export function buildVillandry(set) {
  // --- outils ---------------------------------------------------------------
  const dalle = (x0, x1, z0, z1, y, id) => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
  };
  const vider = (x0, x1, z0, z1, y0, y1) => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      for (let y = y0; y <= y1; y++) set(x, y, z, BLOCK.AIR);
    }
  };
  // contour d'un rectangle, épaisseur 1
  const contour = (x0, x1, z0, z1, y, id) => {
    for (let x = x0; x <= x1; x++) { set(x, y, z0, id); set(x, y, z1, id); }
    for (let z = z0; z <= z1; z++) { set(x0, y, z, id); set(x1, y, z, id); }
  };
  const mur = (x0, x1, z0, z1, y0, y1, id) => {
    for (let y = y0; y <= y1; y++) contour(x0, x1, z0, z1, y, id);
  };

  // --- les trois terrasses --------------------------------------------------
  // Villandry est bâti à flanc : l'eau en haut, l'ornement au milieu, le
  // potager en bas. C'est cet étagement qui donne les points de vue plongeants.
  dalle(-34, 34, 28, 76, T_POTAGER, V.ALLEE);          // terrasse basse
  dalle(-30, 66, -50, 26, T_ORNEMENT, V.ALLEE);        // terrasse médiane
  dalle(-68, -30, -28, 12, T_EAU, V.ALLEE);            // terrasse haute

  // murs de soutènement entre les niveaux
  for (let x = -34; x <= 66; x++) for (let y = T_POTAGER + 1; y <= T_ORNEMENT; y++) {
    set(x, y, 27, V.TUFFEAU_TAILLE);
  }
  for (let z = -28; z <= 12; z++) for (let y = T_ORNEMENT + 1; y <= T_EAU; y++) {
    set(-29, y, z, V.TUFFEAU_TAILLE);
  }
  // escaliers d'un niveau à l'autre
  for (let k = 0; k < 3; k++) {
    for (let x = -3; x <= 3; x++) set(x, T_ORNEMENT - k, 27 + k, V.TUFFEAU_TAILLE);
    for (let z = -6; z <= 0; z++) set(-29 + k, T_EAU - k, z, V.TUFFEAU_TAILLE);
  }

  batirChateau(set, { dalle, vider, mur, contour });
  jardinOrnement(set, { dalle, contour });
  potager(set, { dalle, contour });
  jardinEau(set, { dalle, contour });
  labyrinthe(set, { dalle });
  jardinSimples(set, { dalle, contour });
  alleeTilleuls(set);
}

// --- le château ---------------------------------------------------------------
// Corps de logis en U ouvert au nord, deux ailes en retour, et le donjon carré
// du XIVe conservé à l'angle sud-ouest : c'est la silhouette de Villandry.
function batirChateau(set, o) {
  const SOL = T_ORNEMENT;
  const H = 12;                       // deux étages sous comble
  const TUF = V.TUFFEAU, TAILLE = V.TUFFEAU_TAILLE, ARD = V.ARDOISE;

  const corps = (x0, x1, z0, z1, hauteur) => {
    o.dalle(x0, x1, z0, z1, SOL, BLOCK.PLANK);                 // le plancher
    o.mur(x0, x1, z0, z1, SOL + 1, SOL + hauteur, TUF);
    // chaînages d'angle en pierre de taille
    for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
      for (let y = SOL + 1; y <= SOL + hauteur; y++) set(cx, y, cz, TAILLE);
    }
    // bandeau qui marque l'étage
    o.contour(x0, x1, z0, z1, SOL + 6, TAILLE);
    // La corniche ferme le volume : un simple contour un cran plus au large
    // laissait un jour d'un bloc tout autour, juste au-dessus des murs, par
    // lequel on voyait le ciel depuis l'intérieur. Elle est donc pleine, et
    // sert en même temps de plancher de comble.
    o.dalle(x0 - 1, x1 + 1, z0 - 1, z1 + 1, SOL + hauteur + 1, TAILLE);
    const demi = Math.floor(Math.min(x1 - x0, z1 - z0) / 2);
    for (let k = 0; k <= demi; k++) {
      const y = SOL + hauteur + 2 + k;
      const ax0 = x0 - 1 + k, ax1 = x1 + 1 - k, az0 = z0 - 1 + k, az1 = z1 + 1 - k;
      if (ax0 >= ax1 || az0 >= az1) { o.dalle(ax0, ax1, az0, az1, y, ARD); break; } // le faîtage
      for (let x = ax0; x <= ax1; x++) { set(x, y, az0, ARD); set(x, y, az1, ARD); }
      for (let z = az0; z <= az1; z++) { set(ax0, y, z, ARD); set(ax1, y, z, ARD); }
      if (k === demi) o.dalle(ax0, ax1, az0, az1, y + 1, ARD); // on referme le sommet
    }
  };

  // fenêtres à meneaux : hautes, étroites, régulières — la marque Renaissance
  const fenetres = (x0, x1, z, pas) => {
    for (let x = x0; x <= x1; x += pas) {
      for (const yb of [SOL + 2, SOL + 8]) {
        for (let y = yb; y <= yb + 3; y++) {
          set(x, y, z, BLOCK.GLASS); set(x + 1, y, z, BLOCK.GLASS);
        }
        set(x - 1, yb - 1, z, TAILLE); set(x + 2, yb - 1, z, TAILLE);
        for (let y = yb - 1; y <= yb + 4; y++) { set(x - 1, y, z, TAILLE); set(x + 2, y, z, TAILLE); }
      }
    }
  };

  // corps de logis principal, face au sud sur les jardins
  corps(-24, 24, -26, -16, H);
  fenetres(-20, 20, -16, 8);
  fenetres(-20, 20, -26, 8);
  // les deux ailes en retour vers le nord
  corps(-24, -16, -44, -26, H);
  corps(16, 24, -44, -26, H);
  fenetres(-22, -18, -44, 6);
  fenetres(18, 22, -44, 6);

  // le donjon carré, seul vestige de la forteresse médiévale
  corps(-24, -14, -16, -6, 17);
  for (let y = SOL + 3; y <= SOL + 15; y += 6) {
    set(-19, y, -6, BLOCK.GLASS); set(-24, y, -11, BLOCK.GLASS);
  }

  // hautes cheminées de tuffeau, très visibles sur les toits de la Loire
  for (const [cx, cz] of [[-14, -21], [14, -21], [-20, -34], [20, -34]]) {
    for (let y = SOL + H + 2; y <= SOL + H + 9; y++) {
      for (let dx = 0; dx <= 1; dx++) for (let dz = 0; dz <= 1; dz++) set(cx + dx, y, cz + dz, TAILLE);
    }
  }

  // la cour d'honneur, ouverte au nord, et son perron
  o.dalle(-15, 15, -43, -27, SOL, V.ALLEE);
  o.dalle(-4, 4, -27, -26, SOL, V.TUFFEAU_TAILLE);
  // la porte du corps de logis
  for (let y = SOL + 1; y <= SOL + 4; y++) for (let x = -2; x <= 2; x++) set(x, y, -26, BLOCK.AIR);
  for (let x = -3; x <= 3; x++) set(x, SOL + 5, -26, TAILLE);

  amenagerInterieur(set, o, SOL);
}

// --- l'intérieur ---------------------------------------------------------------
// Trois pièces, celles que la visite montre en premier : la salle à manger et
// sa vasque de marbre rose, le grand salon, et la chambre à baldaquin. Le
// couloir les dessert comme dans le château réel.
function amenagerInterieur(set, o, SOL) {
  // on creuse les volumes, murs de refend compris
  o.vider(-23, 23, -25, -17, SOL + 1, SOL + 11);
  for (let y = SOL + 1; y <= SOL + 11; y++) {
    for (let z = -25; z <= -17; z++) { set(-9, y, z, V.TUFFEAU); set(9, y, z, V.TUFFEAU); }
  }
  // portes de communication
  for (let y = SOL + 1; y <= SOL + 3; y++) { set(-9, y, -21, BLOCK.AIR); set(9, y, -21, BLOCK.AIR); }
  // plancher d'étage, pour que le donjon et les combles restent lisibles
  o.dalle(-23, 23, -25, -17, SOL + 6, BLOCK.PLANK);
  for (let z = -22; z <= -20; z++) set(-1, SOL + 6, z, BLOCK.AIR); // la trémie de l'escalier
  for (let k = 0; k <= 5; k++) set(-1, SOL + k, -20 + k > -17 ? -17 : -20 + k, BLOCK.SLAB_PLANK);

  // --- salle à manger, à l'ouest : la vasque de marbre rose y coule vraiment
  set(-19, SOL + 1, -21, VASQUE);
  set(-15, SOL + 1, -21, TABLE);
  for (const dz of [-23, -19]) { set(-16, SOL + 1, dz, FAUTEUIL); set(-14, SOL + 1, dz, FAUTEUIL); }
  set(-22, SOL + 1, -24, CHEMINEE);
  set(-15, SOL + 5, -21, LUSTRE);
  set(-12, SOL + 1, -24, BUFFET);
  o.dalle(-22, -11, -24, -18, SOL, BLOCK.TERRACOTTA); // tomettes de terre cuite

  // --- le grand salon, au centre : tapisseries et cheminée monumentale
  set(0, SOL + 1, -24, CHEMINEE);
  set(-6, SOL + 1, -24, TAPISSERIE);
  set(6, SOL + 1, -24, TAPISSERIE);
  set(-4, SOL + 1, -20, FAUTEUIL); set(4, SOL + 1, -20, FAUTEUIL);
  set(0, SOL + 1, -19, TABLE);
  set(0, SOL + 5, -21, LUSTRE);
  o.dalle(-8, 8, -24, -18, SOL, BLOCK.PLANK);

  // --- la chambre, à l'est : lit à baldaquin, coffre et tapisserie
  set(16, SOL + 1, -22, LIT);
  set(21, SOL + 1, -24, CHEMINEE);
  set(12, SOL + 1, -24, TAPISSERIE);
  set(20, SOL + 1, -19, BUFFET);
  set(16, SOL + 5, -20, LUSTRE);
  o.dalle(11, 22, -24, -18, SOL, BLOCK.PLANK);
}

// --- le jardin d'ornement ------------------------------------------------------
// Les « jardins d'amour » : quatre carrés de buis taillé, chacun racontant un
// amour — tendre, passionné, volage, tragique. Les cœurs, les masques de bal
// et les lames de poignard s'y lisent d'en haut.
function jardinOrnement(set, o) {
  const y = T_ORNEMENT;
  const B = V.BUIS;
  o.dalle(-26, 26, -4, 26, y, V.ALLEE);

  // Chaque carré : une bordure de buis, un remplissage de fleurs, et un motif
  // de buis au centre. Le motif est ce qui distingue les quatre amours.
  const carre = (cx, cz, fleur, motif) => {
    const R = 5;
    for (let dx = -R - 1; dx <= R + 1; dx++) for (let dz = -R - 1; dz <= R + 1; dz++) {
      const bord = Math.abs(dx) > R || Math.abs(dz) > R;
      set(cx + dx, y, cz + dz, bord ? B : fleur);
    }
    for (const [dx, dz] of motif) set(cx + dx, y, cz + dz, B);
  };

  // Les quatre amours, dessinés explicitement. Une équation de cœur donnait un
  // anneau illisible à cette taille : à onze cases de côté, chaque bloc compte,
  // et un motif se vérifie mieux à l'œil qu'il ne se calcule.
  const motif = (lignes) => {
    const pts = [];
    lignes.forEach((ligne, i) => {
      [...ligne].forEach((c, j) => { if (c === '#') pts.push([j - 5, i - 5]); });
    });
    return pts;
  };

  // AMOUR TENDRE : deux cœurs unis par le milieu, et les flammes de l'amour
  carre(-14, 5, uni(15), motif([
    '..##...##..',
    '.####.####.',
    '###########',
    '###########',
    '.#########.',
    '..#######..',
    '...#####...',
    '....###....',
    '.....#.....',
    '...........',
    '...........',
  ]));

  // AMOUR PASSIONNÉ : les cœurs brisés, séparés par la ligne de fracture
  carre(14, 5, uni(0), motif([
    '..###.###..',
    '.#####.###.',
    '#####...###',
    '####.....##',
    '.###...###.',
    '..##..###..',
    '...#.###...',
    '....###....',
    '...##......',
    '...........',
    '...........',
  ]));

  // AMOUR VOLAGE : les éventails de la légèreté et les cornes du papillon
  carre(-14, 19, uni(2), motif([
    '...........',
    '.#.......#.',
    '.##.....##.',
    '.###...###.',
    '.####.####.',
    '.#########.',
    '..#.....#..',
    '..#.....#..',
    '..#######..',
    '...........',
    '...........',
  ]));

  // AMOUR TRAGIQUE : les lames de poignard qui se croisent
  carre(14, 19, uni(24), motif([
    '#.........#',
    '.#.......#.',
    '..#.....#..',
    '...#...#...',
    '....#.#....',
    '.....#.....',
    '....#.#....',
    '...#...#...',
    '..#.....#..',
    '.#.......#.',
    '#.........#',
  ]));

  // les ifs taillés en cône qui ponctuent les angles
  for (const [cx, cz] of [[-24, -2], [24, -2], [-24, 24], [24, 24], [0, -2], [0, 24]]) {
    for (let h = 1; h <= 4; h++) {
      const r = h < 3 ? 1 : 0;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) set(cx + dx, y + h, cz + dz, B);
    }
  }
}

// --- le potager décoratif -------------------------------------------------------
// Neuf carrés de même taille, chacun avec son dessin de légumes : c'est la
// pièce maîtresse de Villandry, et le seul potager au monde traité comme un
// parterre de broderie. Chaque carré porte une rosace de rosiers aux angles.
function potager(set, o) {
  const y = T_POTAGER;
  o.dalle(-34, 34, 28, 76, y, V.ALLEE);

  const LEGUMES = [
    [POIREAU, CHOU_BLEU], [BETTERAVE, CHOU_ROUGE], [SALADE, BLETTE],
    [CAROTTE, COURGE], [AUBERGINE, CHOU_BLEU], [OSEILLE, SALADE],
    [TOMATE, BETTERAVE], [CELERI, POIREAU], [COURGE, CAROTTE],
  ];

  let n = 0;
  for (let li = 0; li < 3; li++) {
    for (let co = 0; co < 3; co++) {
      const cx = -20 + co * 20, cz = 38 + li * 14;
      const [a, b] = LEGUMES[n];
      const dessin = n % 3; // trois dessins alternés, comme sur place
      for (let dx = -8; dx <= 8; dx++) {
        for (let dz = -5; dz <= 5; dz++) {
          const bord = Math.abs(dx) === 8 || Math.abs(dz) === 5;
          if (bord) { set(cx + dx, y, cz + dz, V.BUIS); continue; }
          let choix;
          if (dessin === 0) choix = (Math.abs(dx) + Math.abs(dz)) % 4 < 2 ? a : b;      // damier en losange
          else if (dessin === 1) choix = Math.abs(dx) * 2 < Math.abs(dz) * 5 ? a : b;    // croix diagonale
          else choix = (Math.floor((dx + 8) / 3) + Math.floor((dz + 5) / 3)) % 2 ? a : b; // damier large
          set(cx + dx, y, cz + dz, choix);
        }
      }
      // les rosiers sur tige aux quatre angles, et leur tonnelle
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const rx = cx + sx * 7, rz = cz + sz * 4;
        set(rx, y + 1, rz, BLOCK.LOG);
        set(rx, y + 2, rz, BLOCK.LOG);
        set(rx, y + 3, rz, uni(15)); // la rose
      }
      n++;
    }
  }

  // la fontaine centrale et son bassin, au croisement des allées
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    const d = Math.hypot(dx, dz);
    if (d > 3.4) continue;
    set(dx, y, 52 + dz, d > 2.4 ? V.TUFFEAU_TAILLE : BLOCK.WATER);
  }
  set(0, y + 1, 52, VASQUE);
}

// --- le jardin d'eau ------------------------------------------------------------
// Un miroir d'eau classique, en forme de croix, ceinturé d'un cloître de
// tilleuls. Le plus calme des jardins, et le plus haut.
function jardinEau(set, o) {
  const y = T_EAU;
  o.dalle(-68, -30, -28, 12, y, V.ALLEE);

  const cx = -49, cz = -8;
  // bassin en croix aux bras arrondis, façon Louis XV
  for (let dx = -14; dx <= 14; dx++) {
    for (let dz = -14; dz <= 14; dz++) {
      const dansCroix = (Math.abs(dx) <= 5 && Math.abs(dz) <= 13) || (Math.abs(dz) <= 5 && Math.abs(dx) <= 13);
      const rond = Math.hypot(dx, dz) <= 7.5;
      if (!dansCroix && !rond) continue;
      const bord = !((Math.abs(dx) <= 4 && Math.abs(dz) <= 12) || (Math.abs(dz) <= 4 && Math.abs(dx) <= 12) || Math.hypot(dx, dz) <= 6.5);
      set(cx + dx, y, cz + dz, bord ? V.TUFFEAU_TAILLE : BLOCK.WATER);
      if (!bord) set(cx + dx, y - 1, cz + dz, BLOCK.WATER);
    }
  }
  // la pelouse encadrée et sa bordure de buis
  o.contour(cx - 18, cx + 18, cz - 18, cz + 18, y, V.BUIS);
  for (let dx = -17; dx <= 17; dx++) for (let dz = -17; dz <= 17; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) > 15) set(cx + dx, y, cz + dz, BLOCK.GRASS);
  }
  // le cloître de tilleuls
  for (let k = -16; k <= 16; k += 4) {
    for (const [tx, tz] of [[cx + k, cz - 17], [cx + k, cz + 17], [cx - 17, cz + k], [cx + 17, cz + k]]) {
      for (let h = 1; h <= 4; h++) set(tx, y + h, tz, BLOCK.LOG);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) + Math.abs(dz) <= 3) set(tx + dx, y + 5, tz + dz, BLOCK.LEAVES);
      }
    }
  }
}

// --- le labyrinthe --------------------------------------------------------------
// Un labyrinthe de charmilles, à parcourir en marchant : chez les enfants,
// c'est presque toujours ce qu'ils préfèrent.
function labyrinthe(set, o) {
  const y = T_ORNEMENT;
  const x0 = 34, z0 = -4, L = 28, P = 26;
  o.dalle(x0, x0 + L, z0, z0 + P, y, V.ALLEE);
  // haies alternées, laissant un chemin en serpentin
  for (let i = 0; i <= P; i += 4) {
    const vers = (i / 4) % 2 === 0;
    for (let k = 0; k <= L - 4; k++) {
      const x = vers ? x0 + k : x0 + 4 + k;
      for (let h = 1; h <= 3; h++) set(x, y + h, z0 + i, V.BUIS);
    }
  }
  // les deux murs latéraux, sinon on sort par le côté
  for (let z = z0; z <= z0 + P; z++) for (let h = 1; h <= 3; h++) {
    set(x0, y + h, z, V.BUIS); set(x0 + L, y + h, z, V.BUIS);
  }
  for (let h = 1; h <= 3; h++) set(x0 + 2, y + h, z0, BLOCK.AIR); // l'entrée
}

// --- le jardin des simples ------------------------------------------------------
// Les plantes médicinales et aromatiques, en petits carrés bordés de buis,
// comme dans les jardins de monastère dont Villandry s'inspire.
function jardinSimples(set, o) {
  const y = T_POTAGER;
  o.dalle(38, 62, 30, 52, y, V.ALLEE);
  const HERBES = [uni(21), uni(29), uni(5), uni(22), uni(4), uni(6)];
  let n = 0;
  for (let li = 0; li < 2; li++) {
    for (let co = 0; co < 3; co++) {
      const cx = 42 + co * 8, cz = 34 + li * 10;
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
        const bord = Math.abs(dx) === 3 || Math.abs(dz) === 3;
        set(cx + dx, y, cz + dz, bord ? V.BUIS : HERBES[n % HERBES.length]);
      }
      n++;
    }
  }
}

// --- l'allée d'honneur ----------------------------------------------------------
// L'arrivée se fait par une allée de tilleuls qui cadre la façade nord : c'est
// la première vue qu'on a du château en venant du village.
function alleeTilleuls(set) {
  const y = T_ORNEMENT;
  for (let z = -70; z <= -44; z++) {
    for (let x = -6; x <= 6; x++) set(x, y, z, V.ALLEE);
  }
  for (let z = -68; z <= -46; z += 4) {
    for (const tx of [-8, 8]) {
      for (let h = 1; h <= 5; h++) set(tx, y + h, z, BLOCK.LOG);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) + Math.abs(dz) <= 3) {
          set(tx + dx, y + 6, z + dz, BLOCK.LEAVES);
          set(tx + dx, y + 7, z + dz, BLOCK.LEAVES);
        }
      }
    }
  }
}
