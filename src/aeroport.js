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
// au moins de ce que les enfants ont bâti, à douze blocs au moins de toute
// VOIE FERRÉE, et le plus plat possible.
//
// LA CINQUIÈME PROMESSE EST NÉE D'UN ROUGE, et c'est la bonne façon d'y venir.
// La première sonde en avait quatre, et trois aérodromes se sont posés sur une
// ligne de train — Haneda sur le Shinkansen (quarante-cinq blocs dedans),
// Fiumicino sur la Frecciarossa, Francfort sur l'ICE. Les rails sont écrits
// dans le morceau de monde AVANT les monuments : un terminal bâti par-dessus
// les mure. C'est le témoin « rien de solide ne barre la route du train » de
// `carteMonde.js` qui l'a dit — il existait déjà, il n'a pas fallu l'écrire.
//
// Et la contrainte s'applique aux TROIS en faute, pas aux dix-neuf : rejouer
// tous les emplacements sous une promesse de plus les dégradait sans raison
// (Roissy partait au sud-est, JFK sous trente-deux pour cent d'eau). Une
// contrainte neuve se paie là où elle mord.
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
  // v242, LE MONDE ×2 : chaque aérodrome a d'abord GARDÉ son écart à sa ville
  // (la ville a bougé, il l'a suivie), puis la sonde a revérifié les cinq
  // promesses sur la carte neuve. Onze tiennent tels quels ; huit sont
  // recherchés depuis leur cap réel, parce qu'à l'échelle neuve le même écart
  // tombait dans l'eau (Dubaï à 89 % dans le golfe, Francfort 14 %, Yokota
  // 12 %) ou sur une voisine. Le chiffre `sol` est REMESURÉ partout : c'est
  // la médiane du relief, et le relief a changé.
  { cle: 'cdg', nom: 'Aéroport Charles-de-Gaulle', x: -250, z: -91, r: 92, sol: 34, profil: 'roissy' },  // Paris (l'ancre, ne bouge pas), vrai cap 43° NE → 0° N (le NE est le quartier des enfants), 291 blocs
  { cle: 'orly', nom: 'Paris–Orly', x: -322, z: 504, r: 62, sol: 41, profil: 'ville' },               // Paris, cap 195° S — exact, 315 blocs
  { cle: 'lhr', nom: 'Londres–Heathrow', x: -1410, z: -1344, r: 78, sol: 40, profil: 'hub' },         // Londres, cap 262° O — même écart qu'en v223, 204 blocs
  { cle: 'jfk', nom: 'New York–JFK', x: -19708, z: 4747, r: 84, sol: 38, profil: 'hub' },             // New York, vrai cap 115° SE → 50° NE (la baie de Jamaica est de l'eau, et le SE est le rectangle de Manhattan), 440 blocs · 13 blocs du rectangle
  { cle: 'mad', nom: 'Madrid–Barajas', x: -2409, z: 4974, r: 78, sol: 36, profil: 'hub' },            // Madrid, cap 40° NE — exact, 302 blocs · eau 5 %
  { cle: 'bcn', nom: 'Barcelone–El Prat', x: -677, z: 4885, r: 66, sol: 51, profil: 'ville' },        // Barcelone, cap 235° — même écart qu'en v223, 445 blocs
  { cle: 'ams', nom: 'Amsterdam–Schiphol', x: 502, z: -1519, r: 74, sol: 36, profil: 'hub' },         // Amsterdam, cap 215° SO — même écart qu'en v223, 443 blocs
  { cle: 'fra', nom: 'Francfort', x: 1734, z: -1040, r: 74, sol: 41, profil: 'hub' },                 // Francfort, cap 315° NO — exact, 702 blocs (le même écart qu'avant tombait à 14 % dans le Rhin)
  { cle: 'fco', nom: 'Rome–Fiumicino', x: 3655, z: 3967, r: 72, sol: 33, profil: 'ville' },           // Rome, cap 350° N — même écart qu'en v223, 362 blocs
  { cle: 'hnd', nom: 'Tokyo–Haneda', x: 53019, z: 8014, r: 76, sol: 39, profil: 'hub' },              // Tokyo, cap 270° O — même écart qu'en v223, 359 blocs · 12 blocs du Shinkansen
  { cle: 'dxb', nom: 'Dubaï', x: 19742, z: 15020, r: 80, sol: 33, profil: 'hub' },                    // Dubaï, vrai cap 230° SO → 220°, 1 036 blocs (le même écart qu'avant tombait à 89 % dans le golfe)
  { cle: 'del', nom: 'Delhi–Indira-Gandhi', x: 28564, z: 12352, r: 70, sol: 47, profil: 'ville' },    // Delhi, cap 250° O — exact, 430 blocs · eau 4 %
  { cle: 'sfo', nom: 'San Francisco', x: -38774, z: 7120, r: 72, sol: 44, profil: 'ville' },          // San Francisco, cap 155° — même écart qu'en v223, 384 blocs
  { cle: 'lax', nom: 'Los Angeles', x: -37536, z: 9087, r: 78, sol: 38, profil: 'hub' },              // Los Angeles, cap 245° SO — exact, 254 blocs · 14 blocs du disque de la ville
  { cle: 'ist', nom: 'Istanbul', x: 9945, z: 4500, r: 78, sol: 33, profil: 'hub' },                   // Istanbul, cap 330° NNO — exact, 409 blocs · eau 5 %
  // Les bases militaires : c'est de là que partent les chasseurs.
  { cle: 'bas-sd', nom: 'Base aérienne de Saint-Dizier', x: 33, z: 300, r: 56, sol: 33, profil: 'base' },      // à l'est de Paris, cap 110° — exact
  { cle: 'bas-adw', nom: "Base aérienne d'Andrews", x: -21126, z: 6381, r: 56, sol: 36, profil: 'base' },      // au sud de Washington, cap 160° — même écart qu'en v223
  { cle: 'bas-llv', nom: 'Base aérienne de Nellis', x: -37017, z: 8813, r: 56, sol: 42, profil: 'base' },      // au nord-est de Los Angeles, cap 60° — même écart qu'en v223
  { cle: 'bas-ykt', nom: 'Base aérienne de Yokota', x: 52871, z: 7878, r: 56, sol: 51, profil: 'base' },       // à l'ouest de Tokyo, cap 285° — exact, 525 blocs (le même écart qu'avant tombait à 12 % dans la baie)
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

// LES AXES DES QUATRE PISTES DE ROISSY, publiés pour que les témoins mesurent
// la géométrie de l'arbre qu'ils éprouvent et non celle qu'ils espèrent : mon
// premier témoin « rien ne dépasse sur une piste » portait les cotes NEUVES en
// dur et rendait cent cinquante-deux blocs en faute sur `origin/main`, où les
// pistes ne sont pas là. Un faux rouge ne se démonte pas.
export const PISTES_ROISSY = [-64, -47, 47, 64];
export const DEMI_PISTE_ROISSY = 4;
// ET LA COTE DE SON AIRE AUSSI. Mon premier jet en avait DEUX : `STAND = 30`
// dans le bâtisseur, et `dv: 33` dans les postes — la faute que ce fichier
// reproche partout ailleurs, commise dans la même passe. Les deux ne se
// contredisaient pas par chance (les mâts sont hors de la rangée en x) ; rien ne
// l'obligeait. Une seule cote, lue par le bâtisseur ET par les postes.
export const STAND_ROISSY = 33;

export function buildAeroport(poser) {
  // Repère de travail : ici, y = -1 désigne le revêtement au sol, y = 0 le
  // premier bloc en l'air. Le bâtisseur du monde, lui, place son origine SUR
  // le bloc de surface — écrit tel quel, tout le tarmac se retrouvait enterré
  // sous l'herbe. Ce décalage d'un bloc recale les deux repères une bonne fois.
  //
  // Second garde-fou : tout ce qui sort du disque est ignoré.
  //
  // IL VALAIT 68 JUSQU'EN v280, PARCE QUE LE RELIEF NE VAUT `sol` QUE JUSQU'À
  // 72 (r − 20, le raccord de `terrainHeight`). La plate-forme est devenue un
  // OUVRAGE — remblai et tranchée écrits en blocs, comme la voie ferrée — donc
  // elle va jusqu'à `r − 10`, soit 82. Le relief ne bouge pas d'un bloc et les
  // deux empreintes de `plafond.js` non plus : c'est ce qui rend cet
  // allongement gratuit du point de vue de l'invariant 1.
  const RAYON = 82, PLAT = 72;
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
  //
  // LES COTES ONT RECULÉ EN v280, ET C'EST L'AIRE QUI LES A POUSSÉES. Max :
  // « places les avions normaux près des pistes ». Mesuré à la sonde, les huit
  // avions en blocs retirés : un gros porteur n'avait QUE QUATRE places à ciel
  // ouvert sur tout le tarmac, toutes dans la trouée entre les halls 2C et 2E,
  // à vingt-quatre blocs de l'axe de piste et derrière un bâtiment. La raison
  // est géométrique et ne se voit sur aucune capture : entre le bord d'un hall
  // (z = 18) et la bande de sécurité de la première piste, il n'y avait que
  // SEPT à NEUF blocs d'asphalte libre, pour une envergure de QUINZE.
  //
  // Le disque pavé étant passé de 68 à 82, les deux doublets reculent et l'aire
  // s'ouvre à vingt blocs. Les cotes sont des résultats : `STAND` vaut le bord
  // du satellite (22) plus la demi-envergure du plus large (8), la voie de
  // service suit, puis la piste et sa bande.
  const HALL_INT = 8, HALL_EXT = 18;   // les halls de l'aérogare 2
  const STAND = STAND_ROISSY;          // axe des avions au contact, ailes 25..40
  const TARMAC = 40;                   // limite du tarmac
  const TAXI_A = 41;                   // voie de service
  const PISTE_A = 47;                  // première piste du doublet
  const TAXI_B = 57;                   // voie entre les deux pistes
  const PISTE_B = 64;                  // seconde piste

  // --- la plate-forme -------------------------------------------------------
  // Tout l'aéroport repose sur une dalle de béton : c'est elle qui donne la
  // planéité absolue qu'on attend d'un aérodrome, herbe rase autour.
  disque(0, 0, 71, -1, BLOCK.GRASS);
  disque(0, 0, 68, -1, BETON);
  // L'OUVRAGE : au-delà de `PLAT`, seules les BANDES DE PISTE sont nivelées —
  // on remblaie sous la dalle et l'on décaisse au-dessus. Les deux bornes sont
  // mesurées sur les dix-neuf aérodromes (remblai 11 au pire, décaissé 8) ; à
  // Roissy même, 4 et 5. Tout bétonner coûtait sept millisecondes par morceau.
  const niveler = (z0) => {
    for (let dz = z0 - 6; dz <= z0 + 6; dz++) {
      const bord = Math.floor(Math.sqrt(Math.max(0, RAYON * RAYON - dz * dz)));
      const dedans = Math.floor(Math.sqrt(Math.max(0, PLAT * PLAT - dz * dz)));
      for (const sens of [-1, 1]) {
        for (let dx = dedans; dx <= bord; dx++) {
          const x = sens * dx;
          set(x, -1, dz, BETON);
          for (let k = 2; k <= REMBLAI; k++) set(x, -k, dz, BETON);
          for (let k = 0; k < DECAISSE; k++) set(x, k, dz, BLOCK.AIR);
        }
      }
    }
  };
  for (const z0 of [-PISTE_B, -PISTE_A, PISTE_A, PISTE_B]) niveler(z0);

  // --- les deux doublets de pistes -----------------------------------------
  // Deux pistes parallèles au nord, deux au sud, orientées est-ouest comme à
  // Roissy. Chacune porte son axe discontinu et son seuil en « échelle ».
  //
  // LE BOUT SE CALCULE, IL NE S'ÉCRIT PLUS (v280). Les marques étaient posées à
  // des abscisses en dur — seuils à −70 et 63, numéros à ±62 et ±56, feux de
  // −60 à 60 — justes tant que les quatre pistes étaient à ±32 et ±50 dans un
  // disque de 68. Les pistes ayant reculé et le disque grandi, elles tombaient
  // à côté : un seuil hors du disque, avalé par `set`, et des numéros au milieu
  // de la piste. Chaque marque se place par rapport au bout MESURÉ de SA piste.
  function piste(zc, numGauche, numDroite) {
    const bout = Math.floor(Math.sqrt(Math.max(0, RAYON * RAYON - (Math.abs(zc) + 4) ** 2)));
    dalle(-bout, bout, zc - 4, zc + 4, -1, ASPHALTE);
    // axe central discontinu
    for (let x = -bout + 4; x <= bout - 6; x += 6) dalle(x, x + 2, zc, zc, -1, BLANC);
    // seuils : les bandes parallèles de chaque extrémité
    for (const b of [-bout, bout - 7]) {
      for (let dz = -3; dz <= 3; dz += 2) dalle(b, b + 7, zc + dz, zc + dz, -1, BLANC);
    }
    // bords de piste
    for (const dz of [-4, 4]) dalle(-bout, bout, zc + dz, zc + dz, -1, BLANC);
    // numéros, lus depuis chaque extrémité
    chiffre(-bout + 8, zc - 2, numGauche[0], BLANC); chiffre(-bout + 12, zc - 2, numGauche[1], BLANC);
    chiffre(bout - 12, zc - 2, numDroite[0], BLANC); chiffre(bout - 8, zc - 2, numDroite[1], BLANC);
    // feux de bord, un sur six
    for (let x = -bout + 6; x <= bout - 6; x += 14) {
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
  // Les longueurs suivent le disque, comme les pistes : écrites en dur, elles
  // s'arrêtaient bien avant les seuils qu'elles sont censées desservir.
  const boutA = Math.floor(Math.sqrt(Math.max(0, RAYON * RAYON - (TAXI_A + 2) ** 2)));
  const boutB = Math.floor(Math.sqrt(Math.max(0, RAYON * RAYON - (TAXI_B + 2) ** 2)));
  taxiway(-boutA, boutA, -TAXI_A - 1, -TAXI_A);
  taxiway(-boutA, boutA, TAXI_A, TAXI_A + 1);
  taxiway(-boutB, boutB, -TAXI_B - 1, -TAXI_B + 1);   // entre les deux pistes, au nord
  taxiway(-boutB, boutB, TAXI_B - 1, TAXI_B + 1);     // idem au sud
  for (const x of [-46, -16, 16, 46]) {
    taxiway(x - 1, x + 1, -PISTE_B + 2, -TAXI_A);   // vers le doublet nord
    taxiway(x - 1, x + 1, TAXI_A, PISTE_B - 2);     // vers le doublet sud
  }

  // --- le tarmac ------------------------------------------------------------
  dalle(-64, 64, -TARMAC, TARMAC, -1, ASPHALTE);
  // traces d'usure devant les postes de stationnement
  for (let x = -62; x <= 62; x += 3) {
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

  // LES PASSERELLES restent, les AVIONS EN BLOCS s'en vont (v280).
  //
  // Max : « supprime les avions qui ne volent pas, en format Minecraft ». La
  // plate-forme en portait HUIT — six avions de ligne et un Concorde sculptés
  // dans le décor, plus un gros porteur sur la voie de circulation — et un
  // enfant ne peut monter dans aucun. C'est la seconde moitié du
  // « inutilisables » de la v228, que cette version-là n'avait pas osé
  // trancher : elle avait gardé le poste SUD au motif qu'« une monture ne se
  // dessine qu'à soixante-deux blocs, et sans eux la plate-forme serait vide
  // vue du ciel ». **Max tranche l'inverse, et il a raison** : un décor qu'on
  // ne peut pas prendre est un mensonge de plus, pas un remplissage.
  //
  // ET LEUR RETRAIT EST CE QUI LIBÈRE L'AIRE. La v278 avait mesuré que Roissy
  // n'a que DEUX poches assez grandes pour un gros porteur — mesure faite
  // AVEC ces huit silhouettes sur le tarmac. Les trois appareils qu'on pilote
  // étaient donc coincés dans des interstices du complexe terminal, à trente
  // à cinquante blocs de la piste la plus proche et derrière des bâtiments.
  // La mesure se refait, et les postes déménagent au bord de la piste
  // (`POSTES_ROISSY`) : l'avion qu'on voit est celui dans lequel on monte, et
  // il est là où l'on décolle.
  //
  // Les passerelles, elles, sont de l'architecture d'aérogare et pas du faux
  // avion : une porte d'embarquement libre en porte une, dans tous les
  // aéroports du monde.
  //
  // ET LEUR PORTÉE NE SUIT PLUS L'AIRE. Cotées à `STAND − 2`, elles suivaient
  // les appareils quand ceux-ci ont reculé — et la sonde a montré qu'elles
  // venaient alors se poser DANS l'emprise du chasseur. Une passerelle sert la
  // PORTE d'un hall : sa longueur est celle d'une passerelle, six blocs.
  const ATTEINTE = HALL_EXT + 6;
  passerelle(18, -HALL_EXT, 20, -ATTEINTE);
  passerelle(40, -HALL_EXT, 42, -ATTEINTE);
  passerelle(18, HALL_EXT, 20, ATTEINTE);
  passerelle(40, HALL_EXT, 42, ATTEINTE);

  // --- abords ---------------------------------------------------------------
  // parking étagé, à l'ouest de l'aérogare 1
  for (let y = 0; y <= 5; y++) {
    contour(-64, -52, -12, 12, y, y % 2 ? BETON : GRIS);
    if (y % 2 === 0) dalle(-64, -52, -12, 12, y, GRIS);
  }
  for (let z = -10; z <= 10; z += 3) for (let x = -62; x <= -54; x += 4) set(x, 6, z, uni(0));
  // LA MANCHE À AIR ET LES MÂTS ONT DÛ DÉMÉNAGER AVEC LES PISTES (v280), et la
  // sonde l'a dit, pas la relecture. Ils étaient posés par rapport à `TARMAC`,
  // qui est passé de 25 à 40 : les mâts se sont donc retrouvés à z = ±39, c'est
  // à dire EXACTEMENT dans l'envergure d'un gros porteur garé à dv = 32 (ailes
  // 22..40), et la manche à air au bord même de la première piste. Les trois
  // postes de la rangée étaient bloqués par les trois mâts de x = −22, 2 et 26.
  //
  // Un mât éclaire l'aire depuis son BORD, pas depuis son milieu : ils passent
  // au-delà de la rangée en x, qui va de −27 à 27. La manche à air revient
  // côté ville, sur le gazon entre les halls et l'aire.
  for (let y = 0; y <= 5; y++) set(-30, y, -HALL_EXT - 3, GRIS);
  for (let dz = 1; dz <= 4; dz++) set(-30, 5, -HALL_EXT - 3 - dz, dz % 2 ? ROUGE : BLANC);
  for (const x of [-62, -46, 46, 62]) {
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
// LES DEUX BORNES DE L'OUVRAGE — mesurées, pas choisies (v280).
//
// Écart entre `terrainHeight` et le `sol` déclaré, sur le disque de `r − 10`,
// sur les DIX-NEUF aérodromes : remblai au pire ONZE blocs (Delhi), décaissé au
// pire HUIT (Orly) ; trois à cinq en général. Douze et neuf couvrent donc tout
// le monde avec un bloc de marge.
//
// ET LA BORNE SE PREND SUR LE DISQUE, PAS SUR LES BANDES. Sur les bandes de
// piste réellement nivelées, le pire des dix-neuf n'est que de CINQ blocs des
// deux côtés — on pourrait donc descendre à huit et sept, et gagner un tiers des
// poses. On ne le fait pas : le jour où une piste bouge ou qu'on élargit la zone
// nivelée, c'est le chiffre du DISQUE qui s'appliquera, et une borne réglée au
// ras de la mesure du moment est une borne qui casse à la livraison suivante
// (leçon des bornes de garde de `monte.js`, v237). Le témoin publie la marge
// réelle, ce qui rend le choix vérifiable au lieu de l'obliger à être cru.
// Un aérodrome neuf qui sortirait de ces bornes livrerait une dalle en
// porte-à-faux ou une colline en travers de la piste : c'est un témoin qui le
// dit, pas une relecture.
export const REMBLAI = 12, DECAISSE = 9;

// QUELS APPAREILS UN AÉRODROME GARE — déclaré ici, lu par le plan ET par les
// postes. Sur une base militaire, trois chasseurs : c'est de là qu'ils partent.
const ESPECES_PAR_PROFIL = {
  hub: ['avionligne', 'concorde', 'chasseur'],
  ville: ['avionligne', 'concorde', 'chasseur'],
  base: ['chasseur', 'chasseur', 'chasseur'],
};
export function especesDe(profil) {
  return ESPECES_PAR_PROFIL[profil] || ESPECES_PAR_PROFIL.ville;
}

// LE PLAN D'UN AÉRODROME — publié ici, lu par le bâtisseur ET par les postes.
//
// LA PISTE PREND LE DIAMÈTRE, ET C'EST UNE MESURE QUI L'A DÉCIDÉ (v280).
//
// Max : « fais les pistes plus longues ». Mesuré avant d'écrire une ligne, en
// appelant le bâtisseur et en comptant les blocs roulables sur l'axe de chaque
// piste : `ville` rendait SOIXANTE-NEUF blocs, `base` cinquante-trois, Orly
// QUARANTE-NEUF. Et ce qu'un appareil réclame se lit dans sa fiche (`pilote`,
// montures.js), il ne s'estime pas : le roulage avant rotation vaut
// `rotation² / (2 × poussée)` et le freinage `approche² / (2 × frein)`, soit
// ensemble 83 blocs pour l'avion de ligne, 99 pour le Concorde, 34 pour le
// chasseur — la « longueur de piste équilibrée » de l'aviation réelle. AUCUNE
// piste du jeu ne tenait les 99 du Concorde, sauf les deux pistes internes de
// Roissy : l'enfant arrivait au bout sans avoir levé le nez.
//
// ET LA CAUSE N'ÉTAIT PAS LA TAILLE DU DISQUE, C'ÉTAIT L'ENDROIT DE LA PISTE
// DEDANS. Une corde à |z| = 34 est bien plus courte qu'un diamètre : à Orly, 49
// blocs contre 103. La piste prend donc le diamètre, et tout le reste — voie de
// circulation, aire de stationnement, terminal, tour, hangar — passe d'un seul
// côté. C'est exactement le plan d'un vrai aéroport à une piste, et c'est aussi
// la réponse à la seconde demande de Max : l'aire est alors CONTRE la piste.
//
// LES COTES SONT DES RÉSULTATS, PAS DES CHIFFRES RONDS. La bande de
// stationnement fait l'envergure du plus large de CE QUI SE GARE LÀ — quinze
// blocs pour un avion de ligne, sept pour un chasseur — plus un dégagement de
// part et d'autre ; le terminal se pose derrière elle. Et ce qui ne tiendrait
// pas dans le disque se RAPPROCHE jusqu'à y tenir, au lieu d'être avalé par
// `set` : c'est la leçon des demi-hangars de la v278, prise par l'autre bout.
export function planAerodrome(profil, rayon = 68) {
  const base = profil === 'base', grand = profil === 'hub';
  // Le disque pavé va jusqu'à `r − 10` grâce à l'ouvrage ; le relief, lui, ne
  // vaut exactement `sol` que jusqu'à `r − 20`, et c'est entre les deux qu'on
  // remblaie et qu'on décaisse.
  const RAYON = rayon - 10, PLAT = rayon - 20;
  const demiLargeurA = (z) => Math.floor(Math.sqrt(Math.max(0, RAYON * RAYON - z * z)));
  const HALL = base ? 10 : grand ? 16 : 13;   // demi-longueur du terminal
  const DEMI_PISTE = base ? 3 : 4;            // demi-largeur d'une piste
  const PISTE = 0;                            // le diamètre
  // Le doublet des grands : la seconde piste de l'AUTRE côté, là où il n'y a
  // rien — sept blocs entre les deux bandes, de quoi rouler entre elles.
  const PISTE2 = grand ? DEMI_PISTE * 2 + 7 : 0;
  const TAXI = -(DEMI_PISTE + 2);             // la voie de circulation, côté ville
  // L'aire de stationnement : l'envergure de ce qui se gare ICI.
  const AILE = Math.ceil(Math.max(...especesDe(profil).map((e) => GABARITS_AVION[e].envergure)) / 2);
  const STAND = TAXI - 2 - AILE;
  const PROF_HALL = base ? 10 : 14;
  const zt1 = STAND - AILE - 2, zt0 = zt1 - PROF_HALL;
  // La tour de contrôle et le hangar se posent aussi loin que le disque le
  // permet, jamais plus : `set` ignore ce qui dépasse, et l'on aurait livré des
  // demi-bâtiments (v278). Le hangar longe l'aire, hors de la rangée.
  const tx = Math.min(HALL + 8, demiLargeurA(zt0 - 3) - 4);
  const tz = zt0 - 3;
  const hz1 = STAND + AILE, hz0 = hz1 - 8;
  const hx = Math.min(HALL + 26, demiLargeurA(hz0) - 8);
  return { base, grand, RAYON, PLAT, HALL, DEMI_PISTE, PISTE, PISTE2, TAXI, AILE,
    STAND, PROF_HALL, zt0, zt1, tx, tz, hx, hz0, hz1, demiLargeurA };
}

export function buildAerodrome(poser, profil, rayon = 68) {
  // Le disque pavé vient du PLAN, il ne se recalcule pas ici : il valait
  // `rayon − 20` — la limite du relief plat — et vaut `rayon − 10` depuis que
  // la plate-forme est un ouvrage. Laissé en double, il annulait tout
  // l'allongement sans qu'une ligne ne paraisse fausse.
  const { RAYON } = planAerodrome(profil, rayon);
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

  // Le plan est publié par `planAerodrome`, pas recalculé ici : le bâtisseur et
  // l'aéroportiste doivent viser les mêmes blocs (leçon du mobilier de Londres).
  const { base, HALL, DEMI_PISTE, PISTE, PISTE2, TAXI, STAND, zt0, zt1,
    tx, tz, hx, hz0, hz1, demiLargeurA, PLAT } = planAerodrome(profil, rayon);

  // LA PLATE-FORME EST UN OUVRAGE, ELLE NE SUIT PAS LE TERRAIN (v280).
  //
  // `terrainHeight` aplanit le disque de rayon `r` avec un raccord de vingt
  // blocs : le sol vaut EXACTEMENT `sol` jusqu'à `r − 20`, et se mélange au
  // relief naturel au-delà. Le bâtisseur s'arrêtait donc à `r − 20`, et c'est
  // ce disque-là qui bornait la longueur des pistes.
  //
  // Une piste est un OUVRAGE — c'est la leçon de la voie ferrée (v213) et du
  // métro de Washington : le remblai et la tranchée sont des BLOCS écrits dans
  // le morceau de monde, pas un relief déplacé. Les deux empreintes de
  // `plafond.js` ne bougent donc pas d'un octet et l'invariant 1 tient sans
  // qu'on ait rien à déclarer. Et l'emprise ne sort JAMAIS de `a.r` : les cinq
  // promesses de la v223 — au sec, à douze blocs d'une ville et d'un autre
  // aérodrome, à quarante de ce que les enfants ont bâti, à douze d'une voie
  // ferrée — valent telles quelles, sans une mesure de plus.
  //
  // LES DEUX BORNES SONT MESURÉES, PAS CHOISIES. Écart entre `terrainHeight`
  // et `sol` sur le disque de `r − 10`, sur les DIX-NEUF aérodromes : remblai
  // au pire ONZE blocs (Delhi), décaissé au pire HUIT (Orly) — trois à cinq en
  // général. Douze et neuf couvrent donc tout le monde avec un bloc de marge,
  // et le jour où un aérodrome neuf sort de ces bornes, un témoin le dira.
  // L'eau ne concerne que 0,5 % des colonnes au pire (Istanbul, 71 sur 14 505),
  // ce qui fait une chaussée sur quelques mètres — comme au vrai Atatürk.
  //
  // ET C'EST LA PISTE QUI EST UN OUVRAGE, PAS LE DISQUE — le prix l'a dit. Mon
  // premier jet bétonnait et décaissait TOUT l'anneau entre `PLAT` et `RAYON` :
  // quatre mille huit cents colonnes à vingt et une poses chacune, et le
  // bâtisseur passait de 5,6 à 12,5 ms par rejeu à Roissy — payés pour CHAQUE
  // morceau de la boîte, c'est-à-dire précisément là où l'enfant arrive en vol.
  // Seules les BANDES de piste vont au-delà de `PLAT` ; le reste du pourtour
  // reste le relief naturel, ce qui est aussi ce qu'on voit d'un vrai aéroport
  // bâti sur une croupe — la piste sur son remblai, la campagne autour.
  //
  // ET L'ON NE BALAIE QUE CE QU'ON ÉCRIT. Le disque va jusqu'à `PLAT`, les
  // bandes de piste se parcourent à part : balayer le carré de `RAYON` pour
  // n'écrire que quatre bandes coûtait vingt-sept mille racines carrées par
  // rejeu, et un bâtisseur est rejoué pour CHAQUE morceau de sa boîte.
  for (let dx = -PLAT; dx <= PLAT; dx++) {
    for (let dz = -PLAT; dz <= PLAT; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > PLAT) continue;
      set(dx, -1, dz, d > PLAT - 5 ? BLOCK.GRASS : BETON);
    }
  }
  const niveler = (za, zb) => {
    for (let dz = za; dz <= zb; dz++) {
      const bord = demiLargeurA(dz), dedans = Math.floor(Math.sqrt(Math.max(0, PLAT * PLAT - dz * dz)));
      for (const sens of [-1, 1]) {
        for (let dx = dedans; dx <= bord; dx++) {
          const x = sens * dx;
          set(x, -1, dz, BETON);
          for (let k = 2; k <= REMBLAI; k++) set(x, -k, dz, BETON);      // le remblai
          for (let k = 0; k < DECAISSE; k++) set(x, k, dz, BLOCK.AIR);   // la tranchée
        }
      }
    }
  };
  niveler(PISTE - DEMI_PISTE - 2, PISTE + DEMI_PISTE + 2);
  if (PISTE2) niveler(PISTE2 - DEMI_PISTE - 2, PISTE2 + DEMI_PISTE + 2);
  // ET LA BANDE DU TERMINAL AUSSI, parce que sur le plus petit disque elle en
  // sort. À Orly (rayon 62, donc béton jusqu'à 42), le terminal va jusqu'à
  // z = −40 et la tour de contrôle jusqu'à −43 : sans cela elles se posaient
  // sur le relief de l'anneau de raccord, à un ou deux blocs de la dalle. Ce
  // qui porte un bâtiment se nivelle, et cela se mesure — pas se relit.
  niveler(zt0 - 8, zt1);

  // LES PISTES. Une bande d'asphalte, son axe discontinu en blanc, et les
  // seuils en « échelle » — ce sont eux qu'on reconnaît depuis un avion.
  const piste = (z0) => {
    const demi = DEMI_PISTE;
    const bout = demiLargeurA(Math.abs(z0) + demi);
    for (let x = -bout; x <= bout; x++) {
      for (let dz = -demi; dz <= demi; dz++) set(x, -1, z0 + dz, ASPHALTE);
      if (((x % 6) + 6) % 6 < 3) set(x, -1, z0, BLANC);              // l'axe
      if (x < -bout + 8 || x > bout - 8) {                            // les seuils
        for (const dz of [-3, -1, 1, 3]) set(x, -1, z0 + dz, BLANC);
      }
    }
    return bout;
  };
  const boutPiste = piste(PISTE);
  if (PISTE2) piste(PISTE2);
  // LA VOIE DE CIRCULATION est TOUJOURS côté ville — elle relie l'aire à la
  // piste, et l'aire est d'un seul côté depuis que la piste prend le diamètre.
  // Elle ne se déduit plus du signe de `z0` : ce signe valait quand il y avait
  // une piste de chaque bord, et il aurait mis la voie du mauvais côté.
  for (let x = -boutPiste + 6; x <= boutPiste - 6; x++) {
    set(x, -1, TAXI, ASPHALTE);
    set(x, -1, TAXI + 1, JAUNE);
  }
  // Et deux bretelles, aux DEUX bouts de la piste : un appareil garé au milieu
  // de l'aire doit pouvoir rejoindre l'un ou l'autre seuil. Sans elles, la
  // piste est longue et l'on n'y accède que par le travers.
  for (const sx of [-1, 1]) {
    const bx = sx * (boutPiste - 10);
    for (let z = TAXI; z <= -DEMI_PISTE; z++) { set(bx, -1, z, ASPHALTE); set(bx + sx, -1, z, ASPHALTE); }
  }

  // LE TARMAC et ses postes de stationnement, marqués au jaune.
  //
  // L'AIRE SE RÈGLE SUR CE QUI S'Y GARE. Elle valait `HALL ± 12` — un chiffre
  // rond — et il manquait quatre blocs de chaque côté à `ville`, un à `hub` :
  // le Concorde débordait sur le hangar. On demande donc son emprise à
  // `aireAvions`, qui la tient de la longueur des appareils : le jour où l'un
  // d'eux grandit, la dalle suit sans qu'on y pense.
  const aire = aireAvions(profil, rayon);
  dalle(Math.min(-HALL - 12, aire.x0), Math.max(HALL + 12, aire.x1),
    Math.min(aire.dv0, zt1), Math.max(aire.dv1, TAXI), -1, ASPHALTE);
  // Le marquage tombe SOUS chaque appareil, pas tous les dix blocs : c'est ce
  // qui fait qu'un poste se lit comme un poste.
  for (const p of postesAvion(profil, rayon)) {
    const g = GABARITS_AVION[p.espece];
    for (let dx = -Math.round(g.long / 2); dx <= Math.round(g.long / 2); dx += 2) {
      set(p.du + dx, -1, p.dv - 3, JAUNE);
    }
    for (let dz = -3; dz <= 3; dz++) set(p.du, -1, p.dv + dz, JAUNE);
  }

  // LE TERMINAL — creux, de plain-pied, avec ses portes des deux côtés.
  const h = base ? 5 : 7;
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
  const th = base ? 9 : 13;
  bloc(tx - 1, tx + 1, 0, th, tz - 1, tz + 1, BETON);
  bloc(tx - 2, tx + 2, th + 1, th + 2, tz - 2, tz + 2, VERRE);
  dalle(tx - 3, tx + 3, tz - 3, tz + 3, th + 3, GRIS);

  // LES HANGARS, eux aussi creux, et ouverts sur leur face extérieure : deux
  // sur une base militaire — c'est là que dorment les chasseurs — un ailleurs.
  //
  // ILS SONT PASSÉS DE L'AUTRE CÔTÉ DU TERMINAL EN v278. Ils tenaient le
  // tarmac à `z = zt1+4 … zt1+12`, c'est-à-dire EN PLEIN DANS la rangée dès
  // qu'on compte les ailes : le chasseur de quinze aérodromes sur dix-neuf
  // avait une aile dans la tôle, et les trois d'une base aussi.
  //
  // ET LES DÉPLACER EN X NE MARCHE PAS — mesuré avant de le croire. La
  // plate-forme d'un aérodrome ne va que jusqu'à `rayon - 20`, soit QUARANTE
  // ET UN blocs à Orly et trente-six sur une base : un hangar poussé au-delà
  // de la rangée (x 31…43) tombe hors du disque, et `set` l'ignore — on aurait
  // livré des demi-bâtiments. Côté ville, il reste à trente-deux blocs du
  // centre, bien au chaud, et le tarmac est libre d'un bout à l'autre.
  //
  // ET ILS ONT CHANGÉ DE CÔTÉ UNE SECONDE FOIS EN v280, pour la raison INVERSE
  // de la v278 : la piste ayant pris le diamètre, ce qui était « côté ville »
  // est maintenant derrière le terminal, à une cote que le disque n'atteint
  // plus (z = −54 à Orly, pour un rayon pavé de 52). Ils longent donc l'AIRE,
  // au-delà de la rangée en x — là où un vrai aéroport met sa maintenance — et
  // leur abscisse est BORNÉE par le disque, jamais écrite en dur.
  const hangar = (cx) => {
    bloc(cx - 6, cx + 6, 0, 5, hz0, hz1, base ? KAKI : GRIS);
    vider(cx - 5, cx + 5, 0, 4, hz0 + 1, hz1 - 1);
    for (let dx = -3; dx <= 3; dx++) {
      for (let y = 0; y <= 3; y++) set(cx + dx, y, hz1, BLOCK.AIR);   // la porte, côté aire
    }
  };
  if (base) { hangar(-hx); hangar(hx); } else hangar(hx);
}

// L'ENCOMBREMENT DES APPAREILS — et pourquoi il vit ICI.
//
// C'est lui qui dimensionne l'aire de stationnement : une aire se règle sur ce
// qui s'y gare, jamais sur un chiffre rond. Il pourrait vivre dans `avions.js`,
// à côté des modèles — mais `avions.js` tire une bibliothèque 3D, et
// `aeroport.js` doit rester lisible SANS elle : c'est ce qui permet au témoin
// d'interroger le bâtisseur en quelques millisecondes au lieu d'ouvrir un
// navigateur. Les modèles lisent donc cette table, pas l'inverse.
//
// ET UNE TABLE QUI MENT EST UN PIÈGE QUI ATTEND (v232). `long` était respecté
// par personne : les modèles mesuraient 21,5, 31 et 16,5 blocs pour 16, 20 et
// 10 réservés — chacun à cheval sur son voisin, passage compris. `larg` et
// `haut`, eux, n'étaient lus nulle part et annonçaient n'importe quoi (2,4 de
// large pour un fuselage de 1,05). Les trois valeurs sont désormais MESURÉES
// sur le modèle rendu, et un témoin de `carteMonde.js` garde `long`. `larg`
// est la largeur du FUSELAGE, pas l'envergure — les ailes débordent, c'est la
// règle du gabarit d'une voiture appliquée à un avion.
//
// ET `larg` N'EST PAS L'EMPRISE AU SOL — c'est la TROISIÈME fois que cette
// table piège quelqu'un, et la pire (v278). Max, capture d'iPad : « les avions
// ne devraient pas être par défaut dans les buildings ». Deux instruments
// disaient pourtant 0/57 en faute — le témoin de la v228 ET la sonde qui lit
// le monde — parce que tous DEUX mesuraient `larg`, c'est-à-dire un fuselage
// de 1,8 bloc, pour un appareil dont les AILES en font 15,2. Mesuré avec la
// vraie emprise : VINGT-NEUF postes sur cinquante-sept dans un bâtiment.
//
// LA BOÎTE DE COLLISION ET L'EMPRISE DE STATIONNEMENT NE SONT PAS LA MÊME
// MESURE. `larg` reste le fuselage, et c'est juste : une AABB ne tourne pas,
// un avion large de quinze blocs ne roulerait dans aucune voie de circulation
// (règle du gabarit d'une voiture, v229). Mais une PLACE doit contenir les
// ailes. Les deux vivent donc côte à côte, chacune nommée pour ce qu'elle est.
export const GABARITS_AVION = {
  avionligne: { long: 16, larg: 1.8, envergure: 15.3, haut: 5.1 },
  concorde: { long: 20, larg: 1.1, envergure: 8.4, haut: 4.0 },
  chasseur: { long: 10, larg: 1.4, envergure: 7.2, haut: 3.4 },
};
const PASSAGE = 4;            // de quoi passer entre deux appareils garés

// LES POSTES DE STATIONNEMENT, publiés ici et pas dans `main.js`.
//
// Le tarmac est dessiné là ; l'aéroportiste qui vient y garer les appareils
// doit viser les mêmes blocs. Deux tables qui décrivent le même plan finissent
// toujours par diverger — c'est la leçon du mobilier de Londres, qui a rendu
// « 0/5 bus » le jour où la ville a déplacé ses arrêts.
//
// TROIS PANNES MESURÉES, TROIS CORRECTIONS (v228). Max, capture à l'appui :
// « les avions sont moches, posés n'importe où et inutilisables ». La sonde a
// trouvé VINGT ET UN postes sur cinquante-sept DANS un bâtiment.
//
//  - LE CAP ÉTAIT UN TIRAGE AU SORT. `animals.js` donne à toute bête un yaw
//    aléatoire, et l'espèce est `immobile` : un avion au poste pointait donc
//    dans une direction quelconque, pour toujours. Le poste publie son cap.
//  - ILS ÉTAIENT EN TRAVERS. Nez vers -z, un Concorde réclame vingt blocs de
//    PROFONDEUR ; l'aire en fait douze, et sept à Roissy. Ce qui est de
//    l'autre côté, c'est le terminal. Ils se garent désormais LE LONG DE X,
//    parallèles à l'aérogare — ce que le bâtisseur de Roissy fait déjà pour
//    ses avions en blocs, et ce qu'on voit sur tout poste au large.
//  - ROISSY N'AVAIT PAS DE BRANCHE. Il tombait dans le cas `ville`, donc à
//    dv = 17, entre HALL_INT (8) et HALL_EXT (18) : dans le hall. Une table
//    publiée par le mauvais bâtisseur ment aussi bien qu'une table recopiée.
//
// Les positions sont un RÉSULTAT : chaque appareil prend sa propre longueur
// plus un passage, et la rangée est centrée sur un point cherché — pas choisi.
// Les valeurs ci-dessous sont celles de cette recherche, la rangée la plus
// proche de l'axe que chaque plan déclare.
// LE CAP EST VÉRIFIÉ EN CAPTURE, PAS DÉDUIT. Le modèle a le nez vers -z et
// `animals.js` rend `mesh.rotation.y = yaw + π` : yaw = π/2 met donc le nez
// vers +x, le long de l'aérogare.
const CAP_LE_LONG_DE_X = Math.PI / 2;

// LES AÉRODROMES ENGENDRÉS SE GARENT EN RANGÉE, CONTRE LA PISTE (v280).
//
// `RANGEES` a disparu, et c'est le fond de l'affaire : elle recopiait la cote de
// l'aire (`dv` 18, 17, 14) à côté du bâtisseur qui la dessinait, et les deux
// devaient s'accorder à la main. Elles s'accordaient — la v278 avait dû refaire
// les deux ensemble — mais rien ne l'obligeait. La cote se DEMANDE désormais à
// `planAerodrome`, qui la tient de l'envergure de ce qui se gare là : deux
// tables qui décrivent le même plan finissent toujours par diverger, et c'est
// la leçon du mobilier de Londres.
//
// ET C'EST LÀ QUE MAX VOULAIT LES AVIONS. « Places les avions normaux près des
// pistes » : la piste prenant le diamètre, l'aire est contre elle — le bord
// d'aile est à deux blocs de la voie de circulation et à six de l'asphalte de
// la piste. On sort du terminal, on traverse l'aire, on est au seuil.

// ROISSY EST BÂTI À LA MAIN, ET SES POSTES AUSSI — MESURÉS, PAS ÉCRITS.
//
// Max : « places les avions normaux près des pistes ». Ses trois appareils
// étaient coincés dans des interstices du complexe terminal : le couloir entre
// le tambour de l'aérogare 1 et les halls, et la trouée entre les halls 2C et
// 2E — à dix-sept, vingt-six et TRENTE-HUIT blocs du bord de piste, derrière
// des bâtiments. La v278 avait mesuré qu'il n'y avait que DEUX poches assez
// grandes pour un gros porteur, et c'était vrai : cette mesure-là avait été
// faite AVEC les huit avions en blocs sur le tarmac, et avec un disque pavé de
// soixante-huit blocs qui laissait sept à neuf blocs d'asphalte libre entre un
// hall et la première piste, pour une envergure de quinze.
//
// Les avions en blocs partis et le disque passé à quatre-vingt-deux, la sonde
// refaite rend QUATRE CENT SOIXANTE-TROIS places à ciel ouvert pour un gros
// porteur là où il y en avait quatre, et CENT CINQUANTE-TROIS rangées complètes
// possibles. On prend la plus proche de la piste puis la plus centrée : dv = 33,
// et les abscisses sont EXACTEMENT la rangée générique (longueur de chaque
// appareil plus un passage de quatre, centrée) — ce qui est le signe que le plan
// tient tout seul, et non qu'on l'a forcé.
//
// TROIS OBSTACLES, TROIS MESURES, ET AUCUN NE SE VOYAIT EN RELISANT. La sonde
// qui distingue les cas les a nommés en une exécution : à dv ≥ 34 l'aile d'un
// gros porteur monte SUR la voie de service ; les mâts d'éclairage, posés par
// rapport à `TARMAC` qui venait de passer de 25 à 40, se retrouvaient à z = ±39,
// pile dans l'envergure, et bloquaient les TROIS postes à la fois ; et la
// manche à air, posée de la même façon, se retrouvait au bord de la piste.
const POSTES_ROISSY = [
  { espece: 'avionligne', du: -19, dv: STAND_ROISSY },   // aile à 1 bloc de la voie, 4 du bord
  { espece: 'concorde', du: 3, dv: STAND_ROISSY },
  { espece: 'chasseur', du: 22, dv: STAND_ROISSY },
];

export function postesAvion(profil, rayon = 68) {
  if (profil === 'roissy') {
    return POSTES_ROISSY.map((p) => ({ ...p, cap: CAP_LE_LONG_DE_X }));
  }
  const especes = especesDe(profil);
  const { STAND } = planAerodrome(profil, rayon);
  const total = especes.reduce((s, e) => s + GABARITS_AVION[e].long, 0)
    + PASSAGE * (especes.length - 1);
  let x = -total / 2;
  return especes.map((espece) => {
    const g = GABARITS_AVION[espece];
    const du = Math.round(x + g.long / 2);
    x += g.long + PASSAGE;
    return { espece, du, dv: STAND, cap: CAP_LE_LONG_DE_X };
  });
}

// L'EMPRISE AU SOL D'UN APPAREIL GARÉ — publiée ici, lue partout.
//
// Une case de bloc va de x à x+1 ; l'appareil centré en (du, dv) occupe
// [du - long/2, du + long/2] le long de x et [dv - envergure/2, dv +
// envergure/2] le long de z, puisqu'il se gare le long de x. Arrondir vers le
// HAUT des deux côtés — ce que faisait mon premier balayage — ajoute une case
// à chaque bord et fait rater la seule place de Roissy qui convienne.
export function empriseAuSol(espece, du = 0, dv = 0) {
  const g = GABARITS_AVION[espece];
  return {
    x0: Math.floor(du - g.long / 2), x1: Math.ceil(du + g.long / 2) - 1,
    z0: Math.floor(dv - g.envergure / 2), z1: Math.ceil(dv + g.envergure / 2) - 1,
  };
}

// L'EMPRISE que la rangée réclame sur le tarmac. `buildAerodrome` l'utilise
// pour dimensionner sa dalle : l'aire se règle sur ce qui s'y gare, et elle
// suivra toute seule le jour où un appareil changera de taille.
//
// ELLE LIT L'ENVERGURE DEPUIS LA v278. Elle prenait `dv ± 3` — un chiffre
// rond — alors qu'un avion de ligne étend ses ailes à huit blocs de son axe :
// la dalle s'arrêtait donc cinq blocs avant le bout des ailes, et l'appareil
// débordait sur l'herbe. Une aire se règle sur ce qui s'y gare, ailes
// comprises.
export function aireAvions(profil, rayon = 68) {
  const boites = postesAvion(profil, rayon).map((p) => empriseAuSol(p.espece, p.du, p.dv));
  return {
    x0: Math.min(...boites.map((b) => b.x0)) - 2, x1: Math.max(...boites.map((b) => b.x1)) + 2,
    dv0: Math.min(...boites.map((b) => b.z0)) - 2, dv1: Math.max(...boites.map((b) => b.z1)) + 2,
  };
}
