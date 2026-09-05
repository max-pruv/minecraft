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
const KAKI = uni(22);           // le vert-de-gris des bases militaires

// Un chiffre en 3 × 5, pour peindre les numéros de piste au sol.
const CHIFFRES = {
  0: ['111', '101', '101', '101', '111'],
  2: ['111', '001', '111', '100', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

// --- LE RÉSEAU D'AÉROPORTS ---------------------------------------------------
//
// Max : « rajoute des aéroports fidèles aux aéroports originaux, des buildings
// dans lesquels on peut rentrer, se promener avec ses différents terminaux […]
// et rajoute des bases militaires pour les avions de chasse ».
//
// ET ROISSY ÉTAIT SUR PARIS. Signalé par Max : « il est maintenant sur la
// ville de Paris et pas à côté ». Mesuré : le centre de l'aéroport tombait
// DANS le disque de Paris, cent vingt et un blocs de chevauchement. La cause
// est celle qu'on connaît par cœur — Paris est passé de 55 à 185 blocs de
// rayon lors de sa remise à l'échelle (v187), et l'aéroport, posé bien avant,
// n'a jamais suivi. C'est mot pour mot le piège du Bay Bridge : quand on remet
// une ville à l'échelle, on cherche TOUT ce qui la vise.
//
// COMMENT CHAQUE AÉROPORT EST PLACÉ, et pourquoi ce n'est pas au jugé.
//
// On part du cap RÉEL depuis le centre de sa ville — Roissy au nord-est de
// Paris, Heathrow à l'ouest de Londres, El Prat au sud-ouest de Barcelone — et
// l'on cherche, en s'éloignant, le premier emplacement qui tienne quatre
// promesses : au sec (moins de six pour cent d'eau sous le disque), à douze
// blocs au moins de toute ville et de tout autre aérodrome, à quarante blocs
// au moins de ce que les enfants ont bâti, et le plus plat possible.
//
// LE CAP CÈDE EN DERNIER, ET L'ÉCART EST ÉCRIT LIGNE À LIGNE. Quand le vrai
// cap tombe à l'eau — JFK est sur la baie de Jamaica, Fiumicino sur la mer,
// Haneda dans la baie de Tokyo — on prend le cap terrestre le plus proche
// plutôt qu'un aéroport noyé. Le nord-est de Paris, lui, tombe pile sur le
// quartier des enfants et sur le musée : Roissy part donc plein nord. Le sol
// des enfants passe avant la fidélité du plan, toujours.
//
// `sol` est la cote à laquelle le terrain s'aplanit, MESURÉE (la médiane du
// relief naturel sous le disque) et non choisie : un aérodrome aplani à une
// cote arbitraire ferait une falaise sur son pourtour.
//
// `profil` dit ce qu'on bâtit : 'roissy' garde l'aérogare en tambour de 1974
// et ses satellites ; 'hub' est un grand aéroport à deux pistes ; 'ville' un
// aéroport à une piste ; 'base' une base militaire — hangars, tour, abris.
export const AEROPORTS = [
  { cle: 'cdg', nom: 'Paris–Charles-de-Gaulle', x: -250, z: -91, r: 92, sol: 34, profil: 'roissy' },  // Paris, vrai cap 43° NE → 0° N (le NE est le quartier des enfants), 291 blocs
  { cle: 'orly', nom: 'Paris–Orly', x: -322, z: 504, r: 62, sol: 41, profil: 'ville' },               // Paris, cap 195° S — exact, 315 blocs
  { cle: 'lhr', nom: 'Londres–Heathrow', x: -926, z: -558, r: 78, sol: 41, profil: 'hub' },           // Londres, cap 262° O — exact, 204 blocs
  { cle: 'jfk', nom: 'New York–JFK', x: -9934, z: 2253, r: 84, sol: 34, profil: 'hub' },              // New York, vrai cap 115° SE → 30° NE (la baie de Jamaica est de l'eau), 418 blocs
  { cle: 'mad', nom: 'Madrid–Barajas', x: -1269, z: 2522, r: 78, sol: 41, profil: 'hub' },            // Madrid, cap 40° NE — exact, 236 blocs
  { cle: 'bcn', nom: 'Barcelone–El Prat', x: -641, z: 2670, r: 66, sol: 34, profil: 'ville' },        // Barcelone, cap 215° SO → 235°, 445 blocs
  { cle: 'ams', nom: 'Amsterdam–Schiphol', x: 4, z: -478, r: 74, sol: 39, profil: 'hub' },            // Amsterdam, cap 215° SO — exact, 443 blocs
  { cle: 'fra', nom: 'Francfort', x: 885, z: -282, r: 74, sol: 50, profil: 'hub' },                   // Francfort, cap 315° NO — exact, 156 blocs
  { cle: 'fco', nom: 'Rome–Fiumicino', x: 1566, z: 2015, r: 72, sol: 36, profil: 'ville' },           // Rome, vrai cap 245° SO → 325° NO (la mer Tyrrhénienne), 302 blocs
  { cle: 'hnd', nom: 'Tokyo–Haneda', x: 26277, z: 4213, r: 76, sol: 38, profil: 'hub' },              // Tokyo, vrai cap 160° S → 250° O (la baie de Tokyo), 311 blocs
  { cle: 'dxb', nom: 'Dubaï', x: 9882, z: 7646, r: 80, sol: 33, profil: 'hub' },                      // Dubaï, cap 230° SO → 205°, 478 blocs
  { cle: 'del', nom: 'Delhi–Indira-Gandhi', x: 13988, z: 6339, r: 70, sol: 41, profil: 'ville' },     // Delhi, cap 250° O — exact, 400 blocs
  { cle: 'sfo', nom: 'San Francisco', x: -19426, z: 3834, r: 72, sol: 43, profil: 'ville' },          // San Francisco, cap 175° S → 155°, 384 blocs
  { cle: 'lax', nom: 'Los Angeles', x: -19035, z: 4406, r: 78, sol: 37, profil: 'hub' },              // Los Angeles, vrai cap 245° SO → 305° NO (le Pacifique), 320 blocs
  { cle: 'ist', nom: 'Istanbul', x: 4832, z: 2313, r: 78, sol: 33, profil: 'hub' },                   // Istanbul, cap 330° NNO — exact, 247 blocs
  // Les bases militaires : c'est de là que partent les chasseurs.
  { cle: 'bas-sd', nom: 'Base aérienne de Saint-Dizier', x: 33, z: 300, r: 56, sol: 33, profil: 'base' },      // à l'est de Paris, cap 110° — exact
  { cle: 'bas-adw', nom: "Base aérienne d'Andrews", x: -10632, z: 3431, r: 56, sol: 35, profil: 'base' },      // au sud de Washington, cap 160° — exact
  { cle: 'bas-llv', nom: 'Base aérienne de Nellis', x: -18484, z: 4423, r: 56, sol: 36, profil: 'base' },      // au nord-est de Los Angeles, cap 60° — exact
  { cle: 'bas-ykt', nom: 'Base aérienne de Yokota', x: 26335, z: 4022, r: 56, sol: 32, profil: 'base' },       // à l'ouest de Tokyo, cap 285° → 290°
];

// L'aéroport le plus proche d'un point, s'il est à portée.
export function aeroportPres(x, z, portee = 140) {
  let best = null;
  for (const a of AEROPORTS) {
    const d = Math.hypot(x - a.x, z - a.z);
    if (d < portee && (!best || d < best.d)) best = { ...a, d };
  }
  return best;
}

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

// --- LE BÂTISSEUR GÉNÉRIQUE --------------------------------------------------
//
// Ce que tout aérodrome a, et dans cet ordre de lecture depuis le ciel : une
// plate-forme plate, une ou deux pistes numérotées, une voie de circulation,
// un tarmac avec ses postes de stationnement, un terminal, une tour de
// contrôle, un hangar.
//
// LE TERMINAL SE VISITE, et c'est la demande de Max — « des buildings dans
// lesquels on peut rentrer, se promener ». Trois choses le rendent praticable,
// et il en manque une seule pour qu'il redevienne un décor :
//
//  - il est CREUX : on pose les murs, puis on vide l'intérieur ;
//  - son plancher est au niveau du tarmac, donc on y entre DE PLAIN-PIED —
//    une marche d'un bloc, et un enfant de sept ans reste dehors ;
//  - il a des portes SUR LES DEUX FACES, côté ville pour arriver et côté
//    pistes pour rejoindre son avion. Avec les portes d'un seul côté, on
//    entre dans un cul-de-sac.
//
// Les halls sont séparés par des cloisons PERCÉES : ce sont les « différents
// terminaux » qu'on parcourt à pied, de l'un à l'autre, sans ressortir.
//
// Le repère de travail est celui de `buildAeroport` : y = −1 est le
// revêtement au sol, y = 0 le premier bloc en l'air. Le bâtisseur du monde,
// lui, place son origine SUR le bloc de surface — d'où le décalage. Et tout
// ce qui sort du disque est ignoré : le terrain n'est parfaitement plat que
// jusqu'au rayon `r − 20`, une dalle poussée jusqu'aux coins retomberait dans
// la pente.
export function buildAerodrome(poser, profil, rayon = 68) {
  const RAYON = rayon - 20;
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
  const vider = (x0, x1, y0, y1, z0, z1) => bloc(x0, x1, y0, y1, z0, z1, BLOCK.AIR);

  const base = profil === 'base';
  const grand = profil === 'hub';
  // Les cotes du plan, du centre vers l'extérieur, en blocs.
  const HALL = base ? 10 : grand ? 16 : 13;   // demi-longueur du terminal
  const STAND = base ? 16 : grand ? 22 : 19;  // l'axe des avions au contact
  const PISTE = base ? 24 : grand ? 36 : 30;  // la piste principale
  const PISTE2 = grand ? -36 : 0;             // le doublet des grands, de l'autre bord

  // La plate-forme : béton au centre, herbe rase sur le pourtour.
  for (let dx = -RAYON; dx <= RAYON; dx++) {
    for (let dz = -RAYON; dz <= RAYON; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > RAYON) continue;
      set(dx, -1, dz, d > RAYON - 5 ? BLOCK.GRASS : BETON);
    }
  }

  // LES PISTES. Une bande d'asphalte, son axe discontinu en blanc, et les
  // seuils en « échelle » — ce sont eux qu'on reconnaît depuis un avion.
  const piste = (z0) => {
    const demi = base ? 3 : 4;
    const bout = Math.round(Math.sqrt(Math.max(0, RAYON * RAYON - (Math.abs(z0) + demi) ** 2)));
    for (let x = -bout; x <= bout; x++) {
      for (let dz = -demi; dz <= demi; dz++) set(x, -1, z0 + dz, ASPHALTE);
      if (((x % 6) + 6) % 6 < 3) set(x, -1, z0, BLANC);              // l'axe
      if (x < -bout + 8 || x > bout - 8) {                            // les seuils
        for (const dz of [-3, -1, 1, 3]) set(x, -1, z0 + dz, BLANC);
      }
    }
    // la voie de circulation qui longe la piste, côté terminal
    const cote = z0 > 0 ? -1 : 1;
    for (let x = -bout + 6; x <= bout - 6; x++) {
      set(x, -1, z0 + cote * (demi + 3), ASPHALTE);
      set(x, -1, z0 + cote * (demi + 2), JAUNE);
    }
  };
  piste(PISTE);
  if (PISTE2) piste(PISTE2);

  // LE TARMAC et ses postes de stationnement, marqués au jaune.
  dalle(-HALL - 12, HALL + 12, STAND - 7, STAND + 4, -1, ASPHALTE);
  for (let x = -HALL - 10; x <= HALL + 10; x += 10) {
    for (let dz = 0; dz < 6; dz++) set(x, -1, STAND - dz, JAUNE);
  }

  // LE TERMINAL — creux, de plain-pied, avec ses portes des deux côtés.
  const zt0 = -6, zt1 = 8, h = base ? 5 : 7;
  bloc(-HALL, HALL, 0, h, zt0, zt1, base ? KAKI : BETON);
  vider(-HALL + 1, HALL - 1, 0, h - 1, zt0 + 1, zt1 - 1);
  // LE PLANCHER EST AU NIVEAU DU TARMAC, pas un bloc au-dessus. C'est la
  // différence entre un terminal et un décor : une marche d'un bloc sur le
  // seuil, et l'enfant reste dehors sans comprendre pourquoi.
  dalle(-HALL + 1, HALL - 1, zt0 + 1, zt1 - 1, -1, BLANC);           // le sol du hall
  // les baies vitrées, sur les deux longs côtés
  for (let x = -HALL + 2; x <= HALL - 2; x++) {
    for (let y = 1; y <= h - 3; y++) {
      if (((x % 3) + 3) % 3 !== 0) { set(x, y, zt0, VERRE); set(x, y, zt1, VERRE); }
    }
  }
  // LES PORTES : deux par face, larges de trois blocs et hautes de trois.
  const PORTES = [-Math.round(HALL / 2), Math.round(HALL / 2)];
  for (const x0 of PORTES) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let y = 0; y <= 2; y++) { set(x0 + dx, y, zt0, BLOCK.AIR); set(x0 + dx, y, zt1, BLOCK.AIR); }
    }
  }
  // LES CLOISONS entre halls, PERCÉES en leur milieu : on passe d'un terminal
  // à l'autre sans ressortir. C'est cela, « se promener avec ses différents
  // terminaux ». Elles ne sont pas dans l'axe des portes, sinon on verrait
  // d'un bout à l'autre et il n'y aurait plus de halls du tout.
  for (const xc of [-Math.round(HALL / 2) - 5, 0, Math.round(HALL / 2) + 5]) {
    if (Math.abs(xc) >= HALL) continue;
    for (let z = zt0 + 1; z <= zt1 - 1; z++) {
      for (let y = 0; y <= h - 1; y++) {
        const passage = z >= zt0 + 5 && z <= zt0 + 8 && y <= 2;
        if (!passage) set(xc, y, z, base ? KAKI : BETON);
      }
    }
  }
  // l'enseigne, sur le toit, côté ville
  for (let x = -3; x <= 3; x++) set(x, h + 1, zt0, base ? ROUGE : BLEU);

  // LA TOUR DE CONTRÔLE : le fût, la vigie vitrée, la casquette.
  const tx = HALL + 8, tz = zt0 - 3, th = base ? 9 : 13;
  bloc(tx - 1, tx + 1, 0, th, tz - 1, tz + 1, BETON);
  bloc(tx - 2, tx + 2, th + 1, th + 2, tz - 2, tz + 2, VERRE);
  dalle(tx - 3, tx + 3, tz - 3, tz + 3, th + 3, GRIS);

  // LES HANGARS, eux aussi creux et ouverts côté tarmac : deux sur une base
  // militaire — c'est là que dorment les chasseurs — un ailleurs.
  const hangar = (hx) => {
    bloc(hx - 6, hx + 6, 0, 5, zt1 + 4, zt1 + 12, base ? KAKI : GRIS);
    vider(hx - 5, hx + 5, 0, 4, zt1 + 5, zt1 + 11);
    for (let dx = -3; dx <= 3; dx++) {
      for (let y = 0; y <= 3; y++) set(hx + dx, y, zt1 + 12, BLOCK.AIR);   // la porte
    }
  };
  if (base) { hangar(-HALL - 9); hangar(HALL + 9); } else hangar(HALL + 14);
}

// LES POSTES DE STATIONNEMENT, publiés ici et pas dans `main.js`.
//
// Le tarmac est dessiné là ; l'aéroportiste qui vient y garer les appareils
// doit viser les mêmes blocs. Deux tables qui décrivent le même plan finissent
// toujours par diverger — c'est la leçon du mobilier de Londres, qui a rendu
// « 0/5 bus » le jour où la ville a déplacé ses arrêts.
//
// Les trois postes sont écartés de vingt blocs : un avion de ligne fait seize
// blocs de long et quinze d'envergure, et deux appareils qui se chevauchent ne
// se lisent plus. Sur une base militaire, ce sont trois chasseurs.
export function postesAvion(profil) {
  const base = profil === 'base';
  const stand = base ? 16 : profil === 'hub' ? 22 : 19;
  const especes = base ? ['chasseur', 'chasseur', 'chasseur'] : ['avionligne', 'concorde', 'chasseur'];
  return especes.map((espece, i) => ({ espece, du: (i - 1) * 20, dv: stand - 2 }));
}
