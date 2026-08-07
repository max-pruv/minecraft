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

// Le treillage blanc des tonnelles et des clôtures du potager : le motif
// « Losange » de la palette décorative, en blanc, rend exactement le
// croisillon des panneaux de bois qu'on voit sur place.
const TREILLAGE = DECOR_START + 27 * 10 + 9;

// Les légumes du potager. Villandry alterne réellement des dominantes de bleu
// (poireaux, choux), de rouge (betteraves, choux rouges), de vert (salades) et
// d'orange (carottes, courges).
// Sur les photos prises du donjon, le potager n'est pas un arc-en-ciel : les
// verts et les bleu-vert dominent largement — poireaux, choux, salades — et la
// couleur chaude ne vient que par touches, betteraves et fleurs de bordure.
const POIREAU = uni(6), CHOU_BLEU = uni(7), BETTERAVE = uni(13), CHOU_ROUGE = uni(14),
      SALADE = uni(4), BLETTE = uni(5), CAROTTE = uni(1), COURGE = uni(2),
      AUBERGINE = uni(12), OSEILLE = uni(3), TOMATE = uni(0), CELERI = uni(29);

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
  jardinSoleil(set, { dalle, contour });
  jardinCroix(set, { dalle, contour });
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

  // Les lucarnes. C'est LE trait qui fait lire « château de la Loire » : une
  // rangée de fenêtres à fronton qui percent le comble d'ardoise, encadrées de
  // pierre de taille et coiffées de leur propre petit toit.
  const lucarne = (cx, z, sens) => {
    const base = SOL + H + 2;                    // au ras de l'égout du toit
    for (let y = base; y <= base + 4; y++) {
      for (let dx = -1; dx <= 1; dx++) set(cx + dx, y, z, TAILLE);
      set(cx, y, z, y <= base + 3 ? BLOCK.GLASS : TAILLE);
      // les joues, qui referment la lucarne sur le rampant
      for (let dz = 1; dz <= 2; dz++) {
        set(cx - 1, y, z + sens * dz, TAILLE); set(cx + 1, y, z + sens * dz, TAILLE);
      }
    }
    // Le fronton sculpté, et les pinacles qui l'encadrent. Vues de près, les
    // lucarnes de Villandry sont de véritables morceaux d'architecture :
    // encadrement à pilastres, fronton à médaillon, et deux flèches de pierre
    // effilées de part et d'autre. C'est ce qui les distingue d'une simple
    // fenêtre de toit.
    for (let k = 0; k <= 1; k++) {
      for (let dx = -1 + k; dx <= 1 - k; dx++) set(cx + dx, base + 5 + k, z, TAILLE);
      for (let dz = 1; dz <= 2; dz++) {
        set(cx - 1 + k, base + 5 + k, z + sens * dz, ARD);
        set(cx + 1 - k, base + 5 + k, z + sens * dz, ARD);
      }
    }
    set(cx, base + 7, z, TAILLE);                // le médaillon du fronton
    for (const sx of [-2, 2]) {                  // les deux pinacles
      for (let y = base + 3; y <= base + 6; y++) set(cx + sx, y, z, TAILLE);
      set(cx + sx, base + 7, z, TAILLE);
    }
  };

  // corps de logis principal, face au sud sur les jardins
  corps(-24, 24, -26, -16, H);
  fenetres(-20, 20, -16, 8);
  fenetres(-20, 20, -26, 8);
  for (let x = -18; x <= 18; x += 9) { lucarne(x, -17, 1); lucarne(x, -25, -1); }

  // les deux ailes en retour vers le nord
  corps(-24, -16, -44, -26, H);
  corps(16, 24, -44, -26, H);
  fenetres(-22, -18, -44, 6);
  fenetres(18, 22, -44, 6);
  for (const z of [-40, -32]) { lucarne(-20, z, 1); lucarne(20, z, 1); }

  // Le donjon, seul vestige de la forteresse médiévale : couronné de
  // créneaux sur mâchicoulis, et coiffé d'une flèche d'ardoise très aiguë.
  corps(-24, -14, -16, -6, 17);
  for (let y = SOL + 3; y <= SOL + 15; y += 6) {
    set(-19, y, -6, BLOCK.GLASS); set(-24, y, -11, BLOCK.GLASS);
  }
  const sommet = SOL + 19;
  for (let dx = -25; dx <= -13; dx++) for (let dz = -17; dz <= -5; dz++) {
    const bord = dx === -25 || dx === -13 || dz === -17 || dz === -5;
    if (bord) set(dx, sommet, dz, TAILLE);       // la saillie des mâchicoulis
  }
  for (let dx = -25; dx <= -13; dx++) {          // les créneaux
    if ((dx + 25) % 2) continue;
    set(dx, sommet + 1, -17, TAILLE); set(dx, sommet + 1, -5, TAILLE);
  }
  for (let dz = -17; dz <= -5; dz++) {
    if ((dz + 17) % 2) continue;
    set(-25, sommet + 1, dz, TAILLE); set(-13, sommet + 1, dz, TAILLE);
  }
  for (let k = 0; k <= 5; k++) {                 // la flèche
    const r = 4 - Math.floor(k * 0.8);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) === r || k === 5) set(-19 + dx, sommet + 2 + k, -11 + dz, ARD);
    }
  }
  set(-19, sommet + 8, -11, TAILLE);

  // Le pavillon d'angle et son toit en poivrière, à l'autre extrémité.
  corps(20, 28, -16, -8, 14);
  for (let k = 0; k <= 4; k++) {
    const r = 4 - k;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) === r || k === 4) set(24 + dx, SOL + 18 + k, -12 + dz, ARD);
    }
  }

  // Les cheminées montent entre les lucarnes, comme sur place.
  for (const [cx, cz] of [[-9, -21], [9, -21], [-20, -36], [20, -36]]) {
    for (let y = SOL + H + 2; y <= SOL + H + 10; y++) {
      for (let dx = 0; dx <= 1; dx++) for (let dz = 0; dz <= 1; dz++) set(cx + dx, y, cz + dz, TAILLE);
    }
    for (let dx = -1; dx <= 2; dx++) for (let dz = -1; dz <= 2; dz++) set(cx + dx, SOL + H + 11, cz + dz, TAILLE);
  }

  // La cour d'honneur est PAVÉE, pas gravillonnée : de gros pavés irréguliers
  // qui montent jusqu'au perron. C'est la première chose qu'on foule en
  // arrivant, et ça change complètement l'impression d'ensemble.
  o.dalle(-15, 15, -43, -27, SOL, BLOCK.COBBLE);
  o.dalle(-4, 4, -27, -26, SOL, V.TUFFEAU_TAILLE);

  // --- le corps d'entrée et son porche en plein cintre ---------------------
  // En arrivant du village, on ne découvre pas une cour ouverte : on fait face
  // à un long bâtiment bas, percé en son milieu d'un porche voûté par lequel
  // on passe. La cour ne se révèle qu'ensuite.
  const HE = 9;
  corps(-26, 26, -52, -44, HE);
  fenetres(-22, 22, -52, 7);
  fenetres(-22, 22, -44, 7);
  // les lucarnes du corps d'entrée, en rang serré comme sur la photo d'arrivée
  for (let x = -21; x <= 21; x += 7) { lucarne(x, -53, -1); }

  // le porche : une voûte en plein cintre, traversante
  for (let z = -52; z <= -44; z++) {
    for (let y = SOL + 1; y <= SOL + 5; y++) for (let x = -2; x <= 2; x++) set(x, y, z, BLOCK.AIR);
    set(-3, SOL + 6, z, TAILLE); set(3, SOL + 6, z, TAILLE);
    for (let x = -2; x <= 2; x++) set(x, SOL + 6, z, Math.abs(x) === 2 ? TAILLE : BLOCK.AIR);
    for (let x = -1; x <= 1; x++) set(x, SOL + 7, z, TAILLE); // la clef de voûte
    o.dalle(-2, 2, z, z, SOL, BLOCK.COBBLE);
  }
  for (let y = SOL + 1; y <= SOL + 7; y++) { set(-3, y, -44, TAILLE); set(3, y, -44, TAILLE); }

  // L'allée pavée qui mène au porche, bordée de clôtures à croisillons.
  for (let z = -80; z <= -53; z++) {
    for (let x = -7; x <= 7; x++) set(x, SOL, z, BLOCK.COBBLE);
    if ((z + 80) % 5 < 4) {
      set(-9, SOL + 1, z, TREILLAGE); set(9, SOL + 1, z, TREILLAGE);
    }
  }

  // Les deux orangers en caisse de Versailles qui encadrent l'entrée.
  for (const sx of [-6, 6]) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      set(sx + dx, SOL + 1, -55 + dz, BLOCK.WHITEBRICK);
    }
    set(sx, SOL + 2, -55, BLOCK.LOG);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      set(sx + dx, SOL + 3, -55 + dz, BLOCK.LEAVES);
    }
    set(sx, SOL + 4, -55, BLOCK.LEAVES);
  }

  // Le panneau bleu « Sites et Monuments Historiques » planté à l'entrée.
  for (let y = SOL + 1; y <= SOL + 2; y++) set(-11, y, -66, V.TUFFEAU_TAILLE);
  for (let dx = 0; dx <= 2; dx++) {
    set(-12 + dx, SOL + 3, -66, BLOCK.BLUEBRICK);
    set(-12 + dx, SOL + 4, -66, BLOCK.WHITEBRICK);
    set(-12 + dx, SOL + 5, -66, BLOCK.BLUEBRICK);
  }
  // la porte du corps de logis
  for (let y = SOL + 1; y <= SOL + 4; y++) for (let x = -2; x <= 2; x++) set(x, y, -26, BLOCK.AIR);
  for (let x = -3; x <= 3; x++) set(x, SOL + 5, -26, TAILLE);

  // --- les galeries à arcades de la cour d'honneur -------------------------
  // Ce sont les galeries de la COUR, pas de la façade sur les jardins : des
  // arcades « en anse de panier » qui courent au pied des ailes, sous les
  // grandes croisées encadrées de pilastres.
  for (const cote of [-1, 1]) {
    const xm = cote * 15;                       // devant chaque aile
    for (let z = -42; z <= -28; z += 3) {
      for (let y = SOL + 1; y <= SOL + 3; y++) { set(xm, y, z, TAILLE); }
      set(xm, SOL + 4, z, TAILLE);
    }
    for (let z = -42; z <= -28; z++) {
      set(xm, SOL + 5, z, TAILLE);              // le bandeau au-dessus des arcs
      o.dalle(xm, xm + cote, z, z, SOL, V.TUFFEAU_TAILLE);
    }
  }

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

  // --- La salle à manger du marquis de Castellane, à l'ouest.
  // Trois traits la caractérisent, et je les avais tous manqués : ses boiseries
  // SAUMON éclatantes, qui rappellent ses origines provençales ; sa fontaine
  // intérieure, curiosité méditerranéenne au milieu d'une salle à manger ; et
  // son sol de MARBRE — le parquet, lui, était réservé aux pièces privées.
  const SAUMON = uni(16);
  o.dalle(-22, -11, -24, -18, SOL, BLOCK.WHITEBRICK);       // le marbre
  for (let y = SOL + 1; y <= SOL + 2; y++) {                 // les boiseries saumon
    for (let x = -22; x <= -11; x++) { set(x, y, -24, SAUMON); set(x, y, -18, SAUMON); }
    for (let z = -24; z <= -18; z++) set(-22, y, z, SAUMON);
  }
  set(-19, SOL + 1, -21, VASQUE);                            // la fontaine
  set(-15, SOL + 1, -21, TABLE);                             // la table fixe
  for (const dz of [-23, -19]) { set(-16, SOL + 1, dz, FAUTEUIL); set(-14, SOL + 1, dz, FAUTEUIL); }
  set(-21, SOL + 1, -23, CHEMINEE);
  set(-15, SOL + 5, -21, LUSTRE);
  set(-12, SOL + 1, -23, BUFFET);

  // --- le grand salon, au centre : tapisseries et cheminée monumentale
  set(0, SOL + 1, -24, CHEMINEE);
  set(-6, SOL + 1, -24, TAPISSERIE);
  set(6, SOL + 1, -24, TAPISSERIE);
  set(-4, SOL + 1, -20, FAUTEUIL); set(4, SOL + 1, -20, FAUTEUIL);
  set(0, SOL + 1, -19, TABLE);
  set(0, SOL + 5, -21, LUSTRE);
  o.dalle(-8, 8, -24, -18, SOL, BLOCK.PLANK);

  // --- Le salon oriental, à l'étage. C'est la curiosité du château : un
  // plafond mudéjar du XVe siècle rapporté du palais des ducs de Maqueda à
  // Tolède, démonté en 1905, et remonté ici — trois mille six cents pièces de
  // bois polychrome et doré, mêlant entrelacs, coquilles Saint-Jacques et
  // inscriptions arabes. Quatre tableaux d'une « porte ottomane » l'entourent,
  // souvenirs de l'ambassade du marquis auprès du sultan.
  const ETAGE = SOL + 6;
  o.vider(-8, 8, -24, -18, ETAGE + 1, ETAGE + 4);
  o.dalle(-8, 8, -24, -18, ETAGE, BLOCK.PLANK);
  for (let x = -8; x <= 8; x++) for (let z = -24; z <= -18; z++) {
    // le plafond : de l'or et du bois sombre en entrelacs
    const entrelacs = (x + z + 40) % 3 === 0 || (x - z + 40) % 4 === 0;
    set(x, ETAGE + 5, z, entrelacs ? BLOCK.GOLD : BLOCK.DARKPLANK);
  }
  for (const x of [-6, -2, 2, 6]) set(x, ETAGE + 1, -24, TAPISSERIE); // les quatre tableaux
  set(0, ETAGE + 1, -20, TABLE);
  set(-4, ETAGE + 1, -20, FAUTEUIL); set(4, ETAGE + 1, -20, FAUTEUIL);
  set(0, ETAGE + 4, -21, LUSTRE);
  for (let x = -7; x <= 7; x += 7) set(x, ETAGE + 2, -18, BLOCK.GLASS);

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
// amour — tendre, passionné, volage, tragique.
//
// Le dessin est du BUIS SUR GRAVIER, pas un aplat de couleur : sur place, le
// sol clair domine, le buis trace des lignes fines, et la couleur ne vient que
// des massifs de fleurs enfermés dans les compartiments. Des ifs en cône et en
// boule ponctuent régulièrement les bordures.
function jardinOrnement(set, o) {
  const y = T_ORNEMENT;
  const B = V.BUIS;
  o.dalle(-26, 26, -4, 26, y, V.ALLEE);

  // Un motif se lit en onze cases de côté : '#' le buis, une lettre le massif
  // fleuri, le point le gravier. À cette échelle, un dessin se vérifie mieux à
  // l'œil qu'il ne se calcule — une équation de cœur ne donnait qu'un anneau.
  const carre = (cx, cz, fleur, lignes) => {
    lignes.forEach((ligne, i) => {
      [...ligne].forEach((c, j) => {
        const dx = j - 5, dz = i - 5;
        set(cx + dx, y, cz + dz, c === '#' ? B : c === 'o' ? fleur : V.ALLEE);
      });
    });
    // la bordure de buis qui enferme le compartiment
    o.contour(cx - 6, cx + 6, cz - 6, cz + 6, y, B);
    // les ifs en boule aux quatre angles, comme sur les photos
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      for (let h = 1; h <= 2; h++) set(cx + sx * 6, y + h, cz + sz * 6, B);
    }
  };

  // AMOUR TENDRE : les cœurs, séparés par les flammes de l'amour
  carre(-14, 5, uni(15), [
    '..##...##..',
    '.#oo#.#oo#.',
    '#oooo#oooo#',
    '#oooooooo o',
    '.#oooooo#..',
    '..#oooo#...',
    '...#oo#....',
    '....##.....',
    '...........',
    '..#.#.#.#..',
    '...........',
  ]);

  // AMOUR PASSIONNÉ : les cœurs brisés, et la ligne de fracture
  carre(14, 5, uni(0), [
    '..##.:##...',
    '.#oo#:#oo#.',
    '#ooo#::#oo#',
    '#ooo#::#oo#',
    '.#oo#:#oo#.',
    '..#o#:#o#..',
    '...##:##...',
    '....#:#....',
    '.....:.....',
    '..#..:..#..',
    '...........',
  ].map((l) => l.replace(/:/g, '.')));

  // AMOUR VOLAGE : les éventails de la légèreté et les cornes du papillon
  carre(-14, 19, uni(2), [
    '...........',
    '.#.......#.',
    '.#o#...#o#.',
    '.#oo#.#oo#.',
    '.#ooo#ooo#.',
    '.#########.',
    '..#ooooo#..',
    '..#o###o#..',
    '..#######..',
    '...........',
    '...........',
  ]);

  // AMOUR TRAGIQUE : les lames de poignard qui se croisent
  carre(14, 19, uni(24), [
    '#.o.....o.#',
    '.#o.....o#.',
    '..#o...o#..',
    'o..#o.o#..o',
    '....#o#....',
    '.....#.....',
    '....#o#....',
    'o..#o.o#..o',
    '..#o...o#..',
    '.#o.....o#.',
    '#.o.....o.#',
  ]);

  // Les ifs taillés en cône qui rythment les allées, très visibles de la
  // terrasse : ce sont eux qui donnent l'échelle au jardin.
  for (const [cx, cz] of [[-24, -2], [24, -2], [-24, 24], [24, 24], [0, -2], [0, 24], [0, 12], [-24, 12], [24, 12]]) {
    for (let h = 1; h <= 5; h++) {
      const r = h <= 2 ? 1 : 0;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) set(cx + dx, y + h, cz + dz, B);
    }
  }

  // La balustrade de pierre ajourée qui borde la terrasse au-dessus du
  // potager : on s'y accoude pour regarder les neuf carrés d'en haut.
  for (let x = -34; x <= 34; x++) {
    set(x, y + 1, 26, V.TUFFEAU_TAILLE);
    if ((x + 34) % 3 !== 0) set(x, y + 2, 26, V.TUFFEAU_TAILLE); // les ajours
    set(x, y + 3, 26, V.TUFFEAU_TAILLE);                          // la main courante
  }
  for (let x = -4; x <= 4; x++) for (let h = 1; h <= 3; h++) set(x, y + h, 26, BLOCK.AIR); // le passage
}

// --- le potager décoratif -------------------------------------------------------
// Neuf carrés de même taille, seul potager au monde traité comme un parterre de
// broderie.
//
// Vu d'en haut depuis le donjon, chaque carré n'est pas d'un seul tenant : il
// est lui-même divisé en petits carreaux séparés d'allées étroites, chacun
// planté d'un légume différent et cerné de buis. Ce sont ces subdivisions qui
// donnent au potager sa texture de tapisserie — un aplat de deux couleurs ne
// rendait pas du tout la même chose.
function potager(set, o) {
  const y = T_POTAGER;
  o.dalle(-34, 34, 28, 76, y, V.ALLEE);

  // Neuf carrés, chacun avec sa palette de quatre légumes et son découpage.
  const CARRES = [
    { legumes: [POIREAU, CHOU_BLEU, SALADE, BETTERAVE], decoupe: 'croix' },
    { legumes: [BETTERAVE, CHOU_ROUGE, OSEILLE, CAROTTE], decoupe: 'bandes' },
    { legumes: [SALADE, BLETTE, CELERI, COURGE], decoupe: 'damier' },
    { legumes: [CAROTTE, COURGE, POIREAU, AUBERGINE], decoupe: 'damier' },
    { legumes: [AUBERGINE, CHOU_BLEU, TOMATE, SALADE], decoupe: 'croix' },
    { legumes: [OSEILLE, SALADE, BLETTE, POIREAU], decoupe: 'bandes' },
    { legumes: [TOMATE, BETTERAVE, CAROTTE, CHOU_ROUGE], decoupe: 'bandes' },
    { legumes: [CELERI, POIREAU, CHOU_BLEU, OSEILLE], decoupe: 'damier' },
    { legumes: [COURGE, CAROTTE, BLETTE, TOMATE], decoupe: 'croix' },
  ];

  // Un carreau : le légume au centre, une bordure de buis tout autour.
  const carreau = (x0, x1, z0, z1, legume) => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const bord = x === x0 || x === x1 || z === z0 || z === z1;
      set(x, y, z, bord ? V.BUIS : legume);
    }
  };

  CARRES.forEach((carre, n) => {
    const li = Math.floor(n / 3), co = n % 3;
    const cx = -20 + co * 20, cz = 38 + li * 14;
    const x0 = cx - 8, x1 = cx + 8, z0 = cz - 5, z1 = cz + 5;

    if (carre.decoupe === 'croix') {
      // quatre carreaux autour d'une allée en croix
      carreau(x0, cx - 1, z0, cz - 1, carre.legumes[0]);
      carreau(cx + 1, x1, z0, cz - 1, carre.legumes[1]);
      carreau(x0, cx - 1, cz + 1, z1, carre.legumes[2]);
      carreau(cx + 1, x1, cz + 1, z1, carre.legumes[3]);
    } else if (carre.decoupe === 'bandes') {
      // quatre bandes parallèles, comme les rangs de poireaux
      for (let k = 0; k < 4; k++) {
        carreau(x0 + k * 4, x0 + k * 4 + 3, z0, z1, carre.legumes[k]);
      }
    } else {
      // six carreaux en damier
      for (let k = 0; k < 3; k++) {
        carreau(x0 + k * 6, x0 + k * 6 + 5, z0, cz - 1, carre.legumes[k % 4]);
        carreau(x0 + k * 6, x0 + k * 6 + 5, cz + 1, z1, carre.legumes[(k + 2) % 4]);
      }
    }

    // Les rosiers sur tige aux quatre angles, sous leur tonnelle de treillage
    // blanc : ils marquent chaque carré et se voient de loin.
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const rx = cx + sx * 9, rz = cz + sz * 6;
      for (let h = 1; h <= 3; h++) set(rx, y + h, rz, TREILLAGE);
      set(rx, y + 4, rz, uni(15));  // la rose
    }
  });

  // Les panneaux de treillage blanc qui ferment le potager sur ses côtés.
  for (let x = -34; x <= 34; x += 1) {
    if ((x + 34) % 8 < 6) { set(x, y + 1, 76, TREILLAGE); set(x, y + 2, 76, TREILLAGE); }
  }

  // la fontaine centrale et son bassin, au croisement des allées
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    const d = Math.hypot(dx, dz);
    if (d > 3.4) continue;
    set(dx, y, 52 + dz, d > 2.4 ? V.TUFFEAU_TAILLE : BLOCK.WATER);
  }
  set(0, y + 1, 52, VASQUE);

  // Les poiriers en cordon le long de l'allée centrale, taillés en fuseau.
  for (const z of [31, 73]) {
    for (let x = -28; x <= 28; x += 7) {
      for (let h = 1; h <= 3; h++) set(x, y + h, z, BLOCK.LOG);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        set(x + dx, y + 4, z + dz, BLOCK.LEAVES);
      }
      set(x, y + 5, z, BLOCK.LEAVES);
    }
  }
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

// --- le jardin du soleil --------------------------------------------------------
// Le plus récent des jardins : dessiné en 2008 par Louis Benech d'après une
// esquisse de Joachim Carvallo de 1924. Trois « chambres » successives, en
// triangle, fleuries de mai à octobre — et rien à voir avec la géométrie stricte
// du reste : ici les allées serpentent dans l'herbe.
function jardinSoleil(set, o) {
  const y = T_ORNEMENT;
  const B = V.BUIS;
  // sa terrasse à lui, à l'ouest, sous le jardin d'eau
  o.dalle(-66, -32, 16, 54, y, BLOCK.GRASS);

  // --- la chambre des nuages : bleus et mauves, allées d'herbe sinueuses
  o.contour(-64, -50, 18, 34, y, B);
  for (let x = -63; x <= -51; x++) {
    for (let z = 19; z <= 33; z++) {
      // le serpentement : deux vagues d'arbustes séparées par l'herbe
      const onde = Math.sin((x + 63) * 0.55) * 2.6;
      const d = Math.abs(z - 26 - onde);
      if (d < 1.2) continue;                            // l'allée d'herbe
      set(x, y, z, d < 3.4 ? uni(11) : uni(27));        // indigo, puis blanc
    }
  }

  // --- la chambre du soleil : oranges et jaunes autour d'un bassin en étoile
  o.contour(-48, -34, 18, 34, y, B);
  const cx = -41, cz = 26;
  for (let x = -47; x <= -35; x++) {
    for (let z = 19; z <= 33; z++) {
      const dx = x - cx, dz = z - cz;
      const r = Math.hypot(dx, dz);
      // une étoile à huit branches : le rayon admissible ondule avec l'angle
      const branche = 3.2 + 2.6 * Math.abs(Math.cos(4 * Math.atan2(dz, dx)));
      if (r <= branche) { set(x, y, z, BLOCK.WATER); continue; }
      if (r <= branche + 1) { set(x, y, z, V.TUFFEAU_TAILLE); continue; }
      set(x, y, z, r < 7.5 ? uni(2) : uni(1));          // jaune près du bassin, orange autour
    }
  }

  // --- la chambre des enfants : une pelouse ouverte, des pommiers, des jeux
  o.contour(-64, -34, 38, 52, y, B);
  for (let x = -62; x <= -36; x += 6) {
    for (let z = 41; z <= 49; z += 8) {
      for (let h = 1; h <= 3; h++) set(x, y + h, z, BLOCK.LOG);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) + Math.abs(dz) <= 3) set(x + dx, y + 4, z + dz, BLOCK.LEAVES);
      }
      set(x, y + 5, z, uni(0)); // les pommes
    }
  }
  // le muret bas où l'on s'assoit, au centre de la chambre
  for (let x = -54; x <= -44; x++) set(x, y + 1, 45, V.TUFFEAU_TAILLE);
}

// --- le jardin des croix et le salon de musique ---------------------------------
// Le jardin d'ornement compte en réalité deux salons, et je n'en avais fait
// qu'un. Le second réunit les trois croix — de Malte, du Languedoc et basque —
// et le salon de musique, dont les buis dessinent lyres et chandeliers.
function jardinCroix(set, o) {
  const y = T_ORNEMENT;
  const B = V.BUIS;
  o.dalle(30, 64, -30, -6, y, V.ALLEE);

  const motif = (cx, cz, fleur, lignes) => {
    lignes.forEach((ligne, i) => {
      [...ligne].forEach((c, j) => {
        set(cx + j - 5, y, cz + i - 5, c === '#' ? B : c === 'o' ? fleur : V.ALLEE);
      });
    });
    o.contour(cx - 6, cx + 6, cz - 6, cz + 6, y, B);
  };

  // la croix de Malte : quatre pointes en pointe de flèche
  motif(37, -22, uni(0), [
    '..#.....#..',
    '..##...##..',
    '...##.##...',
    '....###....',
    '#####o#####',
    '...ooooo...',
    '#####o#####',
    '....###....',
    '...##.##...',
    '..##...##..',
    '..#.....#..',
  ]);

  // la croix du Languedoc : les douze boules au bout des branches
  motif(51, -22, uni(2), [
    '....#.#....',
    '...#o.o#...',
    '....#.#....',
    '#..#####..#',
    '.##ooooo##.',
    '..#ooooo#..',
    '.##ooooo##.',
    '#..#####..#',
    '....#.#....',
    '...#o.o#...',
    '....#.#....',
  ]);

  // le salon de musique : les cordes de la lyre et les branches du chandelier
  motif(44, -10, uni(15), [
    '..#.....#..',
    '.#.#...#.#.',
    '#..#.#.#..#',
    '#..#.#.#..#',
    '#..#.#.#..#',
    '#o#######o#',
    '.#.#####.#.',
    '..#######..',
    '....###....',
    '...#####...',
    '..#######..',
  ]);

  // les ifs en cône, comme dans l'autre salon
  for (const [ix, iz] of [[32, -28], [62, -28], [32, -8], [62, -8], [47, -28]]) {
    for (let h = 1; h <= 4; h++) {
      const r = h <= 2 ? 1 : 0;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) set(ix + dx, y + h, iz + dz, B);
    }
  }
}

// --- l'allée d'honneur ----------------------------------------------------------
// L'arrivée se fait par une allée de tilleuls qui cadre la façade nord : c'est
// la première vue qu'on a du château en venant du village.
function alleeTilleuls(set) {
  const y = T_ORNEMENT;
  // L'allée d'honneur est pavée jusqu'au porche, et s'arrête avant le corps
  // d'entrée : elle repassait par-dessus les pavés posés plus tôt, et l'arrivée
  // se retrouvait en gravier alors que la photo montre de gros pavés.
  for (let z = -80; z <= -53; z++) {
    for (let x = -7; x <= 7; x++) set(x, y, z, BLOCK.COBBLE);
  }
  for (let z = -78; z <= -56; z += 4) {
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
