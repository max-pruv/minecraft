// L'aéroport Paris–Charles-de-Gaulle, planté au nord-est de Paris comme le vrai
// Roissy l'est de la capitale.
//
// Ce qu'on cherche à rendre reconnaissable, dans l'ordre :
//
//  - l'aérogare 1, le grand tambour de béton de Paul Andreu (1974) et ses sept
//    satellites en couronne, qui ne ressemble à aucun autre aéroport au monde ;
//  - les halls allongés de l'aérogare 2, disposés par paires de part et d'autre
//    d'un axe central, avec la gare TGV glissée dessous ;
//  - la tour de contrôle, et deux doublets de pistes parallèles est-ouest,
//    numérotées 08/26 et 09/27 comme à Roissy ;
//  - des avions au contact, passerelles branchées, aux couleurs bleu-blanc-rouge.
//
// Les distances sont ramenées à l'échelle du jeu : le vrai Roissy fait trente
// kilomètres carrés, ici l'enfant traverse le tarmac en une minute.

import { BLOCK, DECOR_START } from './blocks.js';

const uni = (couleur) => DECOR_START + couleur * 10;

const ASPHALTE = uni(25);      // anthracite : le revêtement des pistes
const GOUDRON = uni(26);       // noir : les joints et les traces de pneus
const BLANC = uni(27);         // marquages, fuselages
const JAUNE = uni(2);          // axes de circulation au sol
const BETON = uni(23);         // gris clair : les structures
const GRIS = uni(24);
const BLEU = uni(10);
const ROUGE = uni(0);
const VERRE = BLOCK.GLASS;

// Un chiffre en 3 × 5, pour peindre les numéros de piste au sol.
const CHIFFRES = {
  0: ['111', '101', '101', '101', '111'],
  2: ['111', '001', '111', '100', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

export function buildAeroport(poser) {
  // Repère de travail : ici, y = -1 désigne le revêtement au sol, y = 0 le
  // premier bloc en l'air. Le bâtisseur du monde, lui, place son origine SUR
  // le bloc de surface — écrit tel quel, tout le tarmac se retrouvait enterré
  // sous l'herbe. Ce décalage d'un bloc recale les deux repères une bonne fois.
  //
  // Second garde-fou : tout ce qui sort du disque est ignoré. Le terrain n'est
  // parfaitement plat que jusqu'au rayon 72 ; une dalle rectangulaire poussée
  // jusqu'aux coins retombait dans la pente et laissait le tarmac en porte-à-
  // faux au-dessus du vide. Les pistes se trouvent donc raccourcies aux
  // extrémités, exactement comme sur un vrai aérodrome.
  const RAYON = 68;
  const set = (x, y, z, id) => {
    if (x * x + z * z > RAYON * RAYON) return;
    poser(x, y + 1, z, id);
  };

  // --- outils ---------------------------------------------------------------
  const dalle = (x0, x1, z0, z1, y, id) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, id);
    }
  };
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) dalle(x0, x1, z0, z1, y, id);
  };
  const vider = (x0, x1, y0, y1, z0, z1) => bloc(x0, x1, y0, y1, z0, z1, BLOCK.AIR);
  const contour = (x0, x1, z0, z1, y, id) => {
    for (let x = x0; x <= x1; x++) { set(x, y, z0, id); set(x, y, z1, id); }
    for (let z = z0; z <= z1; z++) { set(x0, y, z, id); set(x1, y, z, id); }
  };
  // anneau plein entre deux rayons, à une hauteur donnée
  const anneau = (cx, cz, rInt, rExt, y, id) => {
    for (let dx = -rExt; dx <= rExt; dx++) {
      for (let dz = -rExt; dz <= rExt; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= rExt && d >= rInt) set(cx + dx, y, cz + dz, id);
      }
    }
  };
  const disque = (cx, cz, r, y, id) => anneau(cx, cz, 0, r, y, id);
  const chiffre = (x, z, c, id) => {
    const g = CHIFFRES[c];
    if (!g) return;
    for (let l = 0; l < 5; l++) {
      for (let k = 0; k < 3; k++) if (g[l][k] === '1') set(x + k, -1, z + l, id);
    }
  };

  // Le plan en coupe, du centre vers l'extérieur. Les avoir tous ici évite ce
  // qui s'était produit au premier jet : un satellite de l'aérogare 1 planté au
  // milieu d'une piste, et des avions stationnés en travers d'une autre.
  const HALL_INT = 8, HALL_EXT = 18;   // les halls de l'aérogare 2
  const STAND = 22;                    // axe des avions au contact
  const TARMAC = 25;                   // limite du tarmac
  const TAXI_A = 26;                   // voie de service
  const PISTE_A = 32;                  // première piste du doublet
  const TAXI_B = 41;                   // voie entre les deux pistes
  const PISTE_B = 50;                  // seconde piste

  // --- la plate-forme -------------------------------------------------------
  // Tout l'aéroport repose sur une dalle de béton : c'est elle qui donne la
  // planéité absolue qu'on attend d'un aérodrome, herbe rase autour.
  disque(0, 0, 67, -1, BLOCK.GRASS);
  disque(0, 0, 64, -1, BETON);

  // --- les deux doublets de pistes -----------------------------------------
  // Deux pistes parallèles au nord, deux au sud, orientées est-ouest comme à
  // Roissy. Chacune porte son axe discontinu et son seuil en « échelle ».
  function piste(zc, numGauche, numDroite) {
    dalle(-70, 70, zc - 4, zc + 4, -1, ASPHALTE);
    // axe central discontinu
    for (let x = -66; x <= 66; x += 6) dalle(x, x + 2, zc, zc, -1, BLANC);
    // seuils : les bandes parallèles de chaque extrémité
    for (const bout of [-70, 63]) {
      for (let dz = -3; dz <= 3; dz += 2) dalle(bout, bout + 7, zc + dz, zc + dz, -1, BLANC);
    }
    // bords de piste
    for (const dz of [-4, 4]) dalle(-70, 70, zc + dz, zc + dz, -1, BLANC);
    // numéros, lus depuis chaque extrémité
    chiffre(-62, zc - 2, numGauche[0], BLANC); chiffre(-58, zc - 2, numGauche[1], BLANC);
    chiffre(56, zc - 2, numDroite[0], BLANC); chiffre(60, zc - 2, numDroite[1], BLANC);
    // feux de bord, un sur six
    for (let x = -60; x <= 60; x += 14) {
      set(x, 0, zc - 5, uni(2)); set(x, 0, zc + 5, uni(0));
    }
  }
  piste(-PISTE_B, '08', '26');
  piste(-PISTE_A, '09', '27');
  piste(PISTE_A, '08', '26');
  piste(PISTE_B, '09', '27');

  // --- voies de circulation -------------------------------------------------
  // Elles relient les pistes au tarmac, avec l'axe jaune que suivent les
  // avions au sol.
  function taxiway(x0, x1, z0, z1) {
    dalle(x0, x1, z0, z1, -1, ASPHALTE);
    const horizontal = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const zc = Math.round((z0 + z1) / 2), xc = Math.round((x0 + x1) / 2);
    if (horizontal) dalle(x0, x1, zc, zc, -1, JAUNE);
    else dalle(xc, xc, z0, z1, -1, JAUNE);
  }
  taxiway(-54, 54, -TAXI_A - 1, -TAXI_A);
  taxiway(-54, 54, TAXI_A, TAXI_A + 1);
  taxiway(-40, 40, -TAXI_B - 1, -TAXI_B + 1);   // entre les deux pistes, au nord
  taxiway(-40, 40, TAXI_B - 1, TAXI_B + 1);     // idem au sud
  for (const x of [-38, -12, 12, 38]) {
    taxiway(x - 1, x + 1, -PISTE_B + 2, -TAXI_A);   // vers le doublet nord
    taxiway(x - 1, x + 1, TAXI_A, PISTE_B - 2);     // vers le doublet sud
  }

  // --- le tarmac ------------------------------------------------------------
  dalle(-56, 56, -TARMAC, TARMAC, -1, ASPHALTE);
  // traces d'usure devant les postes de stationnement
  for (let x = -54; x <= 54; x += 3) {
    for (let z = -TARMAC + 2; z <= TARMAC - 2; z += 7) if ((x + z) % 4 === 0) set(x, -1, z, GOUDRON);
  }

  // --- aérogare 1 : le tambour et ses satellites ---------------------------
  // Le bâtiment circulaire de 1974, creux en son milieu — c'est dans ce puits
  // central que passent les fameux tubes d'escalators en diagonale.
  const T1X = -40, T1Z = 0, T1_INT = 11, T1_EXT = 19;
  for (let y = 0; y <= 11; y++) {
    // le fût de béton, percé d'un bandeau vitré tous les trois niveaux
    anneau(T1X, T1Z, T1_INT, T1_EXT, y, (y % 3 === 2) ? VERRE : BETON);
  }
  // toiture-terrasse et margelle du puits central
  anneau(T1X, T1Z, T1_INT, T1_EXT, 12, GRIS);
  anneau(T1X, T1Z, T1_INT - 1, T1_INT, 12, BLANC);
  // le puits : dégagé jusqu'au sol, avec sa vasque
  for (let y = 0; y <= 12; y++) disque(T1X, T1Z, T1_INT - 1, y, BLOCK.AIR);
  disque(T1X, T1Z, 5, -1, BLOCK.WATER);
  anneau(T1X, T1Z, 5, 6, -1, BLANC);
  // les tubes d'escalators qui traversent le puits en diagonale
  for (const angle of [0.6, 2.7, 4.0]) {
    for (let t = 0; t <= 20; t++) {
      const r = (t / 20) * (T1_INT - 1);
      const x = Math.round(T1X + Math.sin(angle) * r);
      const z = Math.round(T1Z + Math.cos(angle) * r);
      const y = Math.round(10 - (t / 20) * 9);
      set(x, y, z, VERRE); set(x, y + 1, z, VERRE);
      set(x + 1, y, z, VERRE); set(x, y, z + 1, VERRE);
    }
  }
  // sept satellites en couronne, reliés au tambour par des galeries
  // La couronne est volontairement aplatie : un cercle parfait envoyait deux
  // satellites au milieu des pistes nord et sud. Ils restent maintenant sur le
  // tarmac, comme les vrais.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.45;
    const sx = Math.round(T1X + Math.sin(a) * 33);
    const sz = Math.round(T1Z + Math.cos(a) * 15);
    for (let y = 0; y <= 4; y++) anneau(sx, sz, 0, 6, y, y === 3 ? VERRE : BETON);
    anneau(sx, sz, 0, 7, 5, GRIS);
    // la galerie qui rejoint l'aérogare
    for (let t = 0; t <= 14; t++) {
      const k = 0.6 + (t / 14) * 0.4;
      const x = Math.round(T1X + Math.sin(a) * 33 * k);
      const z = Math.round(T1Z + Math.cos(a) * 15 * k);
      for (let y = 0; y <= 2; y++) set(x, y, z, y === 1 ? VERRE : BETON);
      set(x, 3, z, GRIS);
    }
  }

  // --- aérogare 2 : les halls par paires ------------------------------------
  // À Roissy, l'aérogare 2 aligne des halls jumelés de part et d'autre d'un axe
  // routier central, avec la gare TGV enterrée au milieu.
  function hall(x0, x1, z0, z1, nom) {
    for (let y = 0; y <= 6; y++) bloc(x0, x1, y, y, z0, z1, y === 2 || y === 4 ? VERRE : BETON);
    vider(x0 + 1, x1 - 1, 0, 5, z0 + 1, z1 - 1);
    // La toiture des halls de Roissy est une voûte de bois clair : on la rend
    // par un arc, qui donne au bâtiment sa section en demi-tonneau.
    const zc = (z0 + z1) / 2, demi = (z1 - z0) / 2;
    for (let z = z0; z <= z1; z++) {
      const t = (z - zc) / demi;
      const h = 7 + Math.round(Math.sqrt(Math.max(0, 1 - t * t)) * 4);
      for (let x = x0; x <= x1; x++) set(x, h, z, uni(19));   // beige : le bois clair
      for (let x = x0; x <= x1; x += 5) set(x, h - 1, z, VERRE);  // lanterneaux
    }
    // enseigne du hall, côté tarmac
    for (let k = 0; k < nom.length; k++) set(x0 + 3 + k, 7, z0, JAUNE);
  }
  hall(8, 46, -HALL_EXT, -HALL_INT, '2A');
  hall(8, 46, HALL_INT, HALL_EXT, '2F');
  hall(50, 62, -HALL_EXT + 2, -HALL_INT - 1, '2C');
  hall(50, 62, HALL_INT + 1, HALL_EXT - 2, '2E');

  // axe routier central et gare TGV en dessous
  dalle(6, 64, -5, 5, -1, GRIS);
  dalle(6, 64, 0, 0, -1, JAUNE);
  for (let x = 14; x <= 44; x += 2) { set(x, 0, -6, BETON); set(x, 0, 6, BETON); }
  // la verrière de la gare, au ras du sol
  for (let x = 18; x <= 40; x++) for (let z = -4; z <= 4; z++) set(x, 0, z, (x + z) % 2 ? VERRE : GRIS);
  for (let x = 18; x <= 40; x += 6) for (let z = -5; z <= 5; z += 10) set(x, 1, z, BETON);

  // --- la tour de contrôle --------------------------------------------------
  // Fût étroit, vigie évasée vitrée au sommet : la silhouette se lit de loin.
  const TX = -6, TZ = -18;
  for (let y = 0; y <= 25; y++) anneau(TX, TZ, 0, 2, y, y % 4 === 3 ? GRIS : BETON);
  for (let y = 26; y <= 29; y++) anneau(TX, TZ, 0, 4 + (y === 26 ? 0 : 1), y, y === 29 ? GRIS : VERRE);
  anneau(TX, TZ, 0, 6, 30, GRIS);
  set(TX, 31, TZ, BLOCK.LOG);
  set(TX, 32, TZ, ROUGE);
  // radar tournant, sur son mât, un peu à l'écart
  for (let y = 0; y <= 9; y++) set(-14, y, -22, GRIS);
  for (let dx = -3; dx <= 3; dx++) for (let dz = -1; dz <= 1; dz++) set(-14 + dx, 10, -22 + dz, BLANC);

  // --- les avions -----------------------------------------------------------
  // Fuselage, ailes en flèche, dérive et réacteurs. Aux couleurs de la
  // compagnie nationale : fuselage blanc, dérive bleue barrée de rouge.
  function avion(cx, cz, sens, taille) {
    const L = taille, demi = Math.round(L / 2);
    const y0 = 1;              // le fuselage repose sur son train
    // fuselage : trois hauteurs de blocs, arrondi aux extrémités
    for (let i = -demi; i <= demi; i++) {
      const t = Math.abs(i) / demi;
      const larg = t > 0.86 ? 0 : t > 0.7 ? 1 : 2;
      for (let dz = -larg; dz <= larg; dz++) {
        for (let dy = 0; dy <= (t > 0.7 ? 1 : 2); dy++) {
          set(cx + i * sens, y0 + dy, cz + dz, BLANC);
        }
      }
    }
    // cockpit et hublots
    set(cx + (demi - 1) * sens, y0 + 2, cz, VERRE);
    set(cx + demi * sens, y0 + 1, cz, VERRE);
    for (let i = -demi + 3; i <= demi - 4; i += 2) {
      set(cx + i * sens, y0 + 2, cz - 2, VERRE);
      set(cx + i * sens, y0 + 2, cz + 2, VERRE);
    }
    // ailes en flèche, plus une bande bleue le long du fuselage
    for (let dz = 3; dz <= Math.round(L * 0.46); dz++) {
      const recul = Math.round(dz * 0.55);
      for (const s of [-1, 1]) {
        set(cx - recul * sens, y0, cz + s * dz, BLANC);
        set(cx - (recul + 1) * sens, y0, cz + s * dz, BLANC);
      }
    }
    for (let i = -demi + 2; i <= demi - 3; i++) set(cx + i * sens, y0, cz, BLEU);
    // réacteurs sous les ailes
    for (const s of [-1, 1]) {
      const dz = Math.round(L * 0.26), recul = Math.round(dz * 0.55);
      for (let k = 0; k <= 2; k++) set(cx + (-recul + 1 - k) * sens, y0 - 1, cz + s * dz, GRIS);
      set(cx + (-recul + 1) * sens, y0 - 1, cz + s * dz, GOUDRON);
    }
    // dérive et empennage
    for (let y = y0 + 3; y <= y0 + 7; y++) {
      const av = Math.round((y - y0 - 3) * 0.6);
      set(cx + (-demi + 2 + av) * sens, y, cz, y >= y0 + 5 ? BLEU : BLANC);
    }
    set(cx + (-demi + 4) * sens, y0 + 6, cz, ROUGE);
    for (const s of [-1, 1]) {
      for (let dz = 1; dz <= 4; dz++) set(cx + (-demi + 2) * sens, y0 + 3, cz + s * dz, BLANC);
    }
    // train d'atterrissage
    set(cx + (demi - 3) * sens, y0 - 1, cz, GOUDRON);
    for (const s of [-1, 1]) set(cx - 2 * sens, y0 - 1, cz + s * 2, GOUDRON);
  }

  // Le Concorde : nez pointu et fin, aile delta gothique qui court presque tout
  // le long du fuselage, dérive haute, quatre réacteurs accolés deux à deux
  // sous l'aile. Sa silhouette n'a rien de commun avec celle d'un avion de
  // ligne ordinaire, et c'est précisément ce qui le rend reconnaissable.
  function concorde(cx, cz, sens) {
    const L = 34, demi = Math.round(L / 2), y0 = 1;
    // fuselage : long, mince, et qui s'affine en pointe vers l'avant
    for (let i = -demi; i <= demi; i++) {
      const t = (i * sens) / demi;             // -1 arrière, +1 avant
      const larg = t > 0.82 ? 0 : t > 0.62 ? 1 : 1;
      const haut = t > 0.72 ? 0 : 1;
      for (let dz = -larg; dz <= larg; dz++) {
        for (let dy = 0; dy <= haut; dy++) set(cx + i, y0 + dy, cz + dz, BLANC);
      }
    }
    // le nez basculé, qui plonge vers la piste
    for (let k = 1; k <= 3; k++) set(cx + (demi + k) * sens, y0 - Math.floor(k / 2), cz, BLANC);
    set(cx + (demi - 2) * sens, y0 + 1, cz, VERRE);
    // aile delta : elle s'élargit régulièrement de l'avant vers l'arrière
    for (let i = -demi + 1; i <= demi - 8; i++) {
      const t = (i * sens + demi) / L;         // 0 à l'arrière, 1 à l'avant
      const envergure = Math.round((1 - t) * 11);
      for (let dz = 1; dz <= envergure; dz++) {
        set(cx + i, y0, cz + dz, BLANC); set(cx + i, y0, cz - dz, BLANC);
      }
    }
    // quatre réacteurs, accolés deux par deux
    for (const s of [-1, 1]) {
      for (const dz of [4, 6]) {
        for (let k = 0; k <= 4; k++) set(cx + (-demi + 4 + k) * sens, y0 - 1, cz + s * dz, GRIS);
        set(cx + (-demi + 4) * sens, y0 - 1, cz + s * dz, GOUDRON);
      }
    }
    // dérive haute et effilée
    for (let y = y0 + 2; y <= y0 + 8; y++) {
      const av = Math.round((y - y0 - 2) * 0.7);
      set(cx + (-demi + 1 + av) * sens, y, cz, y >= y0 + 6 ? BLEU : BLANC);
    }
    set(cx + (-demi + 5) * sens, y0 + 7, cz, ROUGE);
    // train : le Concorde se cambre haut sur ses jambes
    set(cx + (demi - 6) * sens, y0 - 1, cz, GOUDRON);
    for (const s of [-1, 1]) set(cx - 3 * sens, y0 - 1, cz + s * 3, GOUDRON);
  }

  // Une passerelle télescopique : le couloir qui relie la porte à l'avion.
  function passerelle(x0, z0, x1, z1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
    for (let t = 0; t <= n; t++) {
      const x = Math.round(x0 + ((x1 - x0) * t) / n);
      const z = Math.round(z0 + ((z1 - z0) * t) / n);
      set(x, 2, z, GRIS); set(x, 3, z, t % 2 ? VERRE : GRIS); set(x, 4, z, GRIS);
    }
    for (let y = 0; y <= 1; y++) { set(x1, y, z1, GRIS); }
  }

  // au contact de l'aérogare 2, alignés sur la ligne des postes
  avion(22, -STAND, 1, 26); passerelle(18, -HALL_EXT, 20, -STAND + 2);
  avion(44, -STAND, 1, 22); passerelle(40, -HALL_EXT, 42, -STAND + 2);
  avion(22, STAND, -1, 26); passerelle(18, HALL_EXT, 20, STAND - 2);
  avion(44, STAND, -1, 22); passerelle(40, HALL_EXT, 42, STAND - 2);
  // autour des satellites de l'aérogare 1
  avion(-40, -STAND, 1, 24);
  avion(-40, STAND, -1, 24);
  avion(-14, -STAND, 1, 20);
  // et un gros porteur qui roule vers la piste nord
  avion(0, -TAXI_B, 1, 30);
  // Un très gros porteur à deux ponts, au large : c'est le plus grand de la
  // flotte, et il se voit de toute la plate-forme.
  avion(-14, STAND, -1, 34);
  // Le Concorde, seul sur la voie de circulation sud, bien dégagé : c'est la
  // silhouette la plus reconnaissable de la plate-forme, autant la laisser
  // respirer plutôt que de la coincer contre le parking.
  concorde(-6, TAXI_B, -1);

  // --- abords ---------------------------------------------------------------
  // parking étagé, à l'ouest de l'aérogare 1
  for (let y = 0; y <= 5; y++) {
    contour(-64, -52, -12, 12, y, y % 2 ? BETON : GRIS);
    if (y % 2 === 0) dalle(-64, -52, -12, 12, y, GRIS);
  }
  for (let z = -10; z <= 10; z += 3) for (let x = -62; x <= -54; x += 4) set(x, 6, z, uni(0));
  // manche à air, sur le gazon entre tarmac et première piste
  for (let y = 0; y <= 5; y++) set(-30, y, -TARMAC - 3, GRIS);
  for (let dz = 1; dz <= 4; dz++) set(-30, 5, -TARMAC - 3 + dz, dz % 2 ? ROUGE : BLANC);
  // mâts d'éclairage, en bordure de tarmac et hors des pistes
  for (let x = -46; x <= 50; x += 24) {
    for (const z of [-TARMAC + 1, TARMAC - 1]) {
      for (let y = 0; y <= 7; y++) set(x, y, z, GRIS);
      set(x, 8, z, uni(2));
    }
  }
  // le panneau d'accueil, à l'entrée de la route centrale
  for (let y = 0; y <= 4; y++) { set(64, y, -7, GRIS); set(64, y, 7, GRIS); }
  for (let z = -7; z <= 7; z++) { set(64, 5, z, BLEU); set(64, 6, z, BLEU); }
  for (let z = -5; z <= 5; z += 2) set(64, 6, z, BLANC);
}
