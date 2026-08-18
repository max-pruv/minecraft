// Les monuments de Washington — et cette fois, ON HABITE DEDANS.
//
// La règle de ce fichier : chaque grand bâtiment a un intérieur qui vaut le
// détour. Pas « quatre murs et une lampe » — la chose qu'on vient VOIR :
// le Spirit of St. Louis suspendu au plafond de l'Air et de l'Espace,
// l'éléphant sous la rotonde de l'Histoire naturelle, l'hémicycle du Sénat,
// le Bureau ovale. Un enfant qui pousse une porte doit trouver quelque chose
// derrière, et un étage doit mener quelque part.
//
// Tout est creux, tout se visite, et chaque builder reçoit `poser` ancré sur
// le centre du monument, au niveau du sol : set(x, y, z) avec y = 0 posé SUR
// le sol. Les matières viennent de la palette de la ville — marbre pour les
// monuments, calcaire pour les ministères, brique pour le XIXe siècle.

import { BLOCK, CITY_BLOCK, DECOR_START, PROP_START } from './blocks.js';

const uni = (c) => DECOR_START + c * 10;

const MARBRE = uni(27);
const MARBRE_2 = uni(19);        // un marbre plus chaud, pour les soubassements
const CALCAIRE = uni(28);
const GRANIT = CITY_BLOCK.GRANITE;
const GRES_ROUGE = uni(17);      // le grès rouge du Château Smithsonian
const BRIQUE = BLOCK.BRICK;
const VERRE = BLOCK.GLASS;
const VERRE_BLEU = CITY_BLOCK.CURTAIN;
const ACIER = uni(24);
const BETON = BLOCK.STONEBRICK;
const BETON_CLAIR = uni(23);
const NOIR = uni(26);            // le granit noir du mur du Vietnam
const OR = CITY_BLOCK.GOLD ?? uni(2);
const DALLE = uni(23);
const PLANCHER = BLOCK.PLANK;
const ROUGE = uni(0);
const BLANC = uni(27);
const BLEU = uni(21);
const JAUNE = uni(2);
const ORANGE = uni(1);
const GRIS = uni(24);
const VERT_SOMBRE = uni(5);
const HERBE = BLOCK.GRASS;
const EAU = BLOCK.WATER;
const FEUILLES = BLOCK.LEAVES;

const LAMPE = PROP_START + 9;
const TABLE = PROP_START + 6;
const BANC = PROP_START + 4;

// --- la boîte à outils ---------------------------------------------------------

function outils(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) set(x, y, z, id);
      }
    }
  };
  // Une salle : murs, plancher, plafond, et du vide dedans — l'inverse d'un
  // bloc plein, et c'est ce qui fait qu'on peut y entrer.
  const salle = (x0, x1, y0, y1, z0, z1, mur, sol, plafond) => {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        set(x, y0 - 1, z, sol === undefined ? mur : sol);
        set(x, y1 + 1, z, plafond === undefined ? mur : plafond);
        for (let y = y0; y <= y1; y++) {
          const bord = x === x0 || x === x1 || z === z0 || z === z1;
          set(x, y, z, bord ? mur : BLOCK.AIR);
        }
      }
    }
  };
  // Une porte percée dans un mur : deux blocs de large, trois de haut.
  const porte = (x, z, versX) => {
    for (let k = 0; k < 2; k++) {
      for (let h = 1; h <= 3; h++) {
        set(versX ? x : x + k, h, versX ? z + k : z, BLOCK.AIR);
      }
    }
  };
  // Une colonnade : un fût tous les deux ou trois blocs, chapiteau compris.
  const colonnade = (x0, x1, z0, z1, y0, y1, id, pas = 2) => {
    const long = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const n = long ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    for (let i = 0; i <= n; i += pas) {
      const x = long ? Math.min(x0, x1) + i : x0;
      const z = long ? z0 : Math.min(z0, z1) + i;
      for (let y = y0; y <= y1; y++) set(x, y, z, id);
      set(x, y1 + 1, z, id);
    }
  };
  // Un fronton triangulaire, posé sur une colonnade.
  const fronton = (xc, y, zc, demi, id, axeX = true) => {
    for (let k = 0; k <= demi; k++) {
      const l = demi - k;
      for (let i = -l; i <= l; i++) {
        if (axeX) set(xc + i, y + k, zc, id);
        else set(xc, y + k, zc + i, id);
      }
    }
  };
  // Une coupole : calotte sphérique creuse, ÉTANCHE. On la dessine colonne
  // par colonne — chaque colonne reçoit le bloc à sa hauteur de calotte — et
  // non par anneaux : les anneaux laissaient des trous en couronne près du
  // sommet, et de l'intérieur de la Rotonde on voyait le ciel à travers le
  // dôme. Le bord est doublé d'un bloc pour que la retombée soit pleine.
  const dome = (xc, y0, zc, r, id) => {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > r + 0.4) continue;
        const ys = Math.round(Math.sqrt(Math.max(0, r * r - d * d)));
        set(xc + dx, y0 + ys, zc + dz, id);
        if (d > r - 1.4 && ys > 0) set(xc + dx, y0 + ys - 1, zc + dz, id);
      }
    }
  };
  // Un tambour cylindrique creux, avec ses fenêtres.
  const tambour = (xc, y0, y1, zc, r, id, verre) => {
    for (let y = y0; y <= y1; y++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(Math.hypot(dx, dz) - r) >= 0.75) continue;
          const fen = verre !== undefined && y > y0 && y < y1 && ((dx + dz * 2) & 3) === 0;
          set(xc + dx, y, zc + dz, fen ? verre : id);
        }
      }
    }
  };
  // Un anneau au sol (ou un disque, avec `plein`).
  const anneau = (xc, y, zc, r, id, plein = false) => {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const d = Math.hypot(dx, dz);
        if (plein ? d <= r + 0.4 : Math.abs(d - r) < 0.6) set(xc + dx, y, zc + dz, id);
      }
    }
  };
  // Un tableau au mur : cadre doré, toile colorée. C'est ce qui fait une
  // galerie de peinture — des murs nus ne racontent rien.
  const cadre = (x, y, z, versX, teinte, larg = 3, haut = 2) => {
    for (let a = -1; a <= larg; a++) {
      for (let b = -1; b <= haut; b++) {
        const bord = a === -1 || a === larg || b === -1 || b === haut;
        const id = bord ? JAUNE : teinte;
        if (versX) set(x, y + b, z + a, id);
        else set(x + a, y + b, z, id);
      }
    }
  };
  // Un escalier droit : des marches d'un bloc, de (x0,z0) vers +dx/+dz.
  const escalier = (x0, y0, z0, n, dx, dz, id = DALLE) => {
    for (let k = 0; k < n; k++) set(x0 + dx * k, y0 + k, z0 + dz * k, id);
  };
  return { set, bloc, salle, porte, colonnade, fronton, dome, tambour, anneau, cadre, escalier };
}

// --- LE CAPITOLE ---------------------------------------------------------------
//
// Le dôme entre deux ailes, et rien d'autre ne ressemble à ça. Les ailes ne
// sont pas décoratives : celle du nord est le Sénat, celle du sud la Chambre
// des représentants — et ICI ON Y ENTRE : chaque aile a son hémicycle, ses
// pupitres en arcs de cercle et sa tribune. Au centre, la Rotonde sous la
// coupole creuse, et la salle des Statues au sud.
//
// L'emprise : bu 11 (est-ouest), bv 19 (nord-sud). L'entrée d'honneur est à
// l'OUEST, face au Mall, comme le vrai — c'est la façade des investitures.
export function buildCapitole(poser) {
  const { set, bloc, salle, colonnade, fronton, dome, tambour, anneau, escalier } = outils(poser);

  // Le socle : une terrasse de marbre sur toute l'emprise.
  bloc(-11, 11, -1, -1, -19, 19, MARBRE_2);

  // LE CORPS CENTRAL (la Rotonde) — un carré de 17 sur 17.
  salle(-8, 8, 0, 11, -8, 8, MARBRE, MARBRE_2, MARBRE);
  // le mur intérieur circulaire de la Rotonde
  for (let y = 0; y <= 11; y++) anneau(0, y, 0, 7, MARBRE);
  bloc(-6, 6, 12, 12, -6, 6, BLOCK.AIR);           // ouvrir le plafond sous le tambour
  for (let y = 0; y <= 11; y++) {                   // vider la Rotonde
    for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) {
      if (Math.hypot(dx, dz) < 6.4) set(dx, y, dz, BLOCK.AIR);
    }
  }
  bloc(-6, 6, -1, -1, -6, 6, MARBRE_2);             // le sol de la Rotonde
  // les huit tableaux historiques de la Rotonde, entre les portes
  for (const a of [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]) {
    const x = Math.round(Math.cos(a) * 6), z = Math.round(Math.sin(a) * 6);
    set(x, 3, z, uni(21)); set(x, 4, z, uni(21));
  }
  // le tambour et la coupole, creux — de l'intérieur on voit tout là-haut
  tambour(0, 12, 19, 0, 6, MARBRE, VERRE);
  dome(0, 20, 0, 6, MARBRE);
  set(0, 27, 0, MARBRE); set(0, 28, 0, OR);         // la statue de la Liberté (1863)

  // les quatre portes de la Rotonde : ouest (le Mall), est, nord, sud —
  // percées à travers le mur circulaire ET le mur carré du corps central
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    for (let h = 0; h <= 3; h++) {
      for (let k = -1; k <= 1; k++) {
        for (let p = 6; p <= 8; p++) {
          set(dx * p + (dz !== 0 ? k : 0), h, dz * p + (dx !== 0 ? k : 0), BLOCK.AIR);
        }
      }
    }
  }

  // LES DEUX AILES : le Sénat au NORD (z négatif), la Chambre au SUD.
  for (const signe of [-1, 1]) {
    const z0 = signe * 9, z1 = signe * 19;
    salle(-9, 9, 0, 8, Math.min(z0, z1), Math.max(z0, z1), MARBRE, MARBRE_2, MARBRE);
    // le couloir qui relie l'aile à la Rotonde
    for (let h = 0; h <= 3; h++) for (let k = -1; k <= 1; k++) set(k, h, signe * 9, BLOCK.AIR);
    // L'HÉMICYCLE : trois arcs de pupitres tournés vers la tribune, côté
    // Rotonde — comme les vrais, où le perchoir regarde l'entrée.
    for (let r = 3; r <= 7; r += 2) {
      for (let a = -Math.PI / 2.6; a <= Math.PI / 2.6; a += 2.2 / r) {
        const x = Math.round(Math.sin(a) * r);
        const z = signe * (11 + Math.round(Math.cos(a) * r * 0.8));
        if (Math.abs(x) < 8 && Math.abs(z) < 19) set(x, 0, z, TABLE);
      }
    }
    set(0, 0, signe * 10, GRANIT);                  // la tribune du président de séance
    set(0, 1, signe * 10, TABLE);
    set(-3, 0, signe * 17, LAMPE); set(3, 0, signe * 17, LAMPE);
    // la porte extérieure de l'aile, à l'est
    for (let h = 0; h <= 2; h++) for (let k = 0; k <= 1; k++) set(9, h, signe * 14 + k, BLOCK.AIR);
  }

  // LA FAÇADE OUEST : l'escalier d'honneur qui descend vers le Mall, la
  // colonnade et le fronton — c'est par là qu'on arrive.
  colonnade(-10, -10, -5, 5, 0, 6, MARBRE, 2);
  fronton(-10, 7, 0, 5, MARBRE, false);
  escalier(-11, -1, -3, 0, 0, 0);                   // (l'esplanade fait le reste)
  for (let k = -3; k <= 3; k++) { set(-11, 0, k, MARBRE_2); set(-12, -1, k, MARBRE_2); }
  // la porte d'honneur, dans l'axe — l'intercolonnement central est ouvert
  for (let h = 0; h <= 3; h++) for (let k = -1; k <= 1; k++) set(-8, h, k, BLOCK.AIR);
  for (let h = 0; h <= 3; h++) set(-9, h, 0, BLOCK.AIR);
  for (let h = 0; h <= 4; h++) set(-10, h, 0, BLOCK.AIR);

  // la façade est : colonnade aussi, porte simple
  colonnade(9, 9, -5, 5, 0, 6, MARBRE, 2);
  fronton(9, 7, 0, 5, MARBRE, false);
}

// --- L'OBÉLISQUE ----------------------------------------------------------------
//
// Cent soixante-neuf mètres de marbre, le plus haut du monde en pierre. La
// ligne de teinte au tiers marque l'arrêt du chantier pendant la guerre de
// Sécession — le marbre d'après ne venait plus de la même carrière.
//
// Dedans, le colimaçon monte jusqu'aux huit fenêtres du sommet. Le vrai en
// compte huit cent quatre-vingt-dix-sept marches ; ici soixante, et la vue
// sur tout le Mall à l'arrivée.
export function buildObelisque(poser) {
  const { set, bloc } = outils(poser);
  const H = 70;
  const CHANGEMENT = 22;

  for (let y = 0; y < H; y++) {
    const demi = y < H - 10 ? (y < 34 ? 4 : 3) : 3;
    const teinte = y < CHANGEMENT ? MARBRE_2 : MARBRE;
    for (let dx = -demi; dx <= demi; dx++) {
      for (let dz = -demi; dz <= demi; dz++) {
        const bord = Math.abs(dx) === demi || Math.abs(dz) === demi;
        if (bord) set(dx, y, dz, teinte);
        else if (y === 0) set(dx, y, dz, DALLE);
      }
    }
  }
  // LE COLIMAÇON : une marche par bloc en tournant autour du fût.
  const cage = [[-3, -3], [-2, -3], [-1, -3], [0, -3], [1, -3], [2, -3], [3, -3],
    [3, -2], [3, -1], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3],
    [-1, 3], [-2, 3], [-3, 3], [-3, 2], [-3, 1], [-3, 0], [-3, -1], [-3, -2]];
  for (let y = 1; y < H - 11; y++) {
    const [dx, dz] = cage[y % cage.length];
    set(dx, y, dz, DALLE);
    if (y % 20 === 0) for (const [ax, az] of cage) set(ax, y, az, DALLE);   // le palier
  }
  // la porte, plein est, face au Capitole
  for (let y = 1; y <= 3; y++) { set(4, y, 0, BLOCK.AIR); set(4, y, 1, BLOCK.AIR); }
  // les huit fenêtres du sommet, deux par face
  for (const [dx, dz] of [[3, -1], [3, 1], [-3, -1], [-3, 1], [-1, 3], [1, 3], [-1, -3], [1, -3]]) {
    set(dx, H - 13, dz, VERRE);
    set(dx, H - 12, dz, VERRE);
  }
  bloc(-2, 2, H - 14, H - 12, -2, 2, BLOCK.AIR);    // la salle du sommet
  bloc(-2, 2, H - 15, H - 15, -2, 2, DALLE);
  // le pyramidion
  for (let k = 0; k < 10; k++) {
    const demi = Math.max(0, 3 - Math.floor(k / 2.8));
    for (let dx = -demi; dx <= demi; dx++) {
      for (let dz = -demi; dz <= demi; dz++) set(dx, H - 10 + k, dz, MARBRE);
    }
  }
  set(0, H + 1, 0, OR);           // la pointe d'aluminium, qui valait de l'or en 1884
}

// --- LE LINCOLN MEMORIAL --------------------------------------------------------
//
// Un temple grec fermé, trente-six colonnes — une par État de 1865 — et
// dedans, Lincoln assis qui regarde le miroir d'eau et le Capitole. L'entrée
// est à l'EST, et c'est le seul côté ouvert : le vrai n'a pas de porte, on
// entre entre les colonnes.
export function buildLincoln(poser) {
  const { set, bloc, salle, colonnade } = outils(poser);
  bloc(-6, 6, -1, 1, -7, 7, MARBRE_2);              // le socle à degrés
  bloc(-7, 7, -1, -1, -7, 7, MARBRE_2);
  // l'escalier monumental, à l'est
  for (let m = 0; m < 3; m++) {
    for (let z = -4; z <= 4; z++) set(9 - m, m - 1, z, MARBRE_2);
  }
  salle(-5, 5, 2, 9, -6, 6, MARBRE, MARBRE_2, MARBRE);
  // la colonnade périptère
  colonnade(-6, 6, -7, -7, 2, 8, MARBRE, 2);
  colonnade(-6, 6, 7, 7, 2, 8, MARBRE, 2);
  colonnade(-6, -6, -5, 5, 2, 8, MARBRE, 2);
  colonnade(6, 6, -5, 5, 2, 8, MARBRE, 2);
  bloc(-6, 6, 9, 10, -7, 7, MARBRE);                // l'attique
  // la façade est s'ouvre : trois entrecolonnements percés, cella comprise
  for (let h = 2; h <= 6; h++) for (let z = -2; z <= 2; z++) {
    set(5, h, z, BLOCK.AIR); set(6, h, z, BLOCK.AIR);
  }
  // LINCOLN ASSIS, au fond, sur son trône — il regarde l'est.
  bloc(-3, -2, 2, 3, -2, 2, MARBRE_2);              // le trône
  bloc(-3, -2, 4, 6, -1, 1, BLANC);                 // le buste
  set(-2, 7, 0, BLANC);                             // la tête
  bloc(-1, -1, 4, 4, -2, 2, BLANC);                 // les bras sur les accoudoirs
  set(0, 2, -1, BLANC); set(0, 2, 1, BLANC);        // les genoux
  set(-3, 3, 0, LAMPE);
}

// --- LE MÉMORIAL DE LA SECONDE GUERRE MONDIALE ----------------------------------
//
// L'ovale de piliers entre l'obélisque et le miroir d'eau : cinquante-six
// piliers — un par État et territoire — et les deux pavillons Atlantique et
// Pacifique. Le bassin au centre, avec ses jets.
export function buildMemorialGuerre(poser) {
  const { set, bloc } = outils(poser);
  const RU = 7, RV = 5;
  for (let a = 0; a < 28; a++) {
    const ang = (a / 28) * Math.PI * 2;
    const x = Math.round(Math.cos(ang) * RU), z = Math.round(Math.sin(ang) * RV);
    bloc(x, x, 0, 2, z, z, MARBRE);
    set(x, 3, z, MARBRE_2);
  }
  // les deux pavillons, aux deux bouts du grand axe
  for (const sx of [-1, 1]) {
    bloc(sx * RU - 1, sx * RU + 1, 0, 4, -1, 1, MARBRE);
    bloc(sx * RU, sx * RU, 1, 3, 0, 0, BLOCK.AIR);
    set(sx * RU, 5, 0, OR);                         // l'aigle de bronze
  }
  // le bassin ovale et ses jets
  for (let dx = -RU + 2; dx <= RU - 2; dx++) {
    for (let dz = -RV + 2; dz <= RV - 2; dz++) {
      if ((dx / (RU - 2)) ** 2 + (dz / (RV - 2)) ** 2 <= 1) {
        set(dx, -1, dz, EAU);
        if ((dx & 1) === 0 && dz === 0) set(dx, 0, dz, EAU);
      }
    }
  }
}

// --- LES MUSÉES DU MALL — RIVE NORD --------------------------------------------

// LA GALERIE NATIONALE D'ART — BÂTIMENT OUEST. Le dôme sur sa rotonde à
// fontaine, et des salles de peinture EN ENFILADE : les cadres dorés au mur,
// chacun sa toile. C'est une vraie visite de musée.
export function buildGalerieArt(poser) {
  const { set, salle, bloc, dome, tambour, colonnade, fronton, cadre, anneau } = outils(poser);
  salle(-7, 7, 0, 7, -4, 4, MARBRE_2, MARBRE, MARBRE);
  // le portique d'entrée au sud, vers le Mall
  colonnade(-2, 2, 5, 5, 0, 4, MARBRE, 2);
  fronton(0, 5, 5, 3, MARBRE);
  for (let h = 0; h <= 2; h++) for (let k = -1; k <= 1; k++) set(k, h, 4, BLOCK.AIR);
  // la rotonde centrale : colonnes noires, fontaine, oculus
  anneau(0, 0, 0, 3, GRANIT); anneau(0, 4, 0, 3, GRANIT);
  for (const a of [0, 1, 2, 3, 4, 5]) {
    const x = Math.round(Math.cos(a * Math.PI / 3) * 3), z = Math.round(Math.sin(a * Math.PI / 3) * 3);
    bloc(x, x, 0, 4, z, z, VERT_SOMBRE);
  }
  set(0, -1, 0, EAU); set(0, 0, 0, EAU);            // la fontaine de Mercure
  bloc(-2, 2, 8, 8, -2, 2, BLOCK.AIR);
  tambour(0, 8, 9, 0, 3, MARBRE, VERRE);
  dome(0, 10, 0, 3, MARBRE);
  // les salles de peinture, à l'est et à l'ouest de la rotonde
  for (const sx of [-1, 1]) {
    for (let h = 0; h <= 2; h++) set(sx * 4, h, 0, BLOCK.AIR);   // l'enfilade
    cadre(sx * 6, 2, -2, true, sx < 0 ? BLEU : ROUGE);
    cadre(sx * 6, 2, 1, true, sx < 0 ? VERT_SOMBRE : ORANGE);
    cadre(sx * 5 - (sx < 0 ? -1 : 1) * 0, 2, sx < 0 ? -3 : -3, false, uni(15), 2, 2);
    set(sx * 5, 0, 2, BANC);
  }
}

// LA GALERIE NATIONALE — BÂTIMENT EST. Les triangles de marbre de I. M. Pei,
// l'atrium de verre, et le mobile de Calder suspendu dedans.
export function buildNGAEst(poser) {
  const { set, bloc, salle } = outils(poser);
  salle(-4, 4, 0, 8, -4, 4, MARBRE, MARBRE_2, VERRE);
  // les deux tours triangulaires, en écharpe
  for (let k = 0; k < 4; k++) {
    bloc(-4 + k, -4 + k, 9, 10, -4, -4 + k, MARBRE);
    bloc(4 - k, 4, 9, 10, 4 - k, 4, MARBRE);
  }
  for (let h = 0; h <= 2; h++) for (let k = -1; k <= 0; k++) set(k, h, 4, BLOCK.AIR);
  // LE MOBILE DE CALDER, suspendu dans l'atrium : des pales rouges et noires.
  set(0, 7, 0, ACIER);
  set(-1, 6, -1, ROUGE); set(1, 6, 1, ROUGE); set(2, 6, -1, NOIR); set(-2, 6, 1, NOIR);
  set(0, 0, -2, BANC); set(0, 0, 2, BANC);
}

// LE MUSÉE D'HISTOIRE NATURELLE. La rotonde avec L'ÉLÉPHANT au milieu — le
// plus grand jamais naturalisé —, la salle des dinosaures à l'ouest avec son
// squelette, la salle des gemmes à l'est avec le diamant Hope.
export function buildHistoireNaturelle(poser) {
  const { set, salle, bloc, dome, tambour, colonnade, fronton } = outils(poser);
  salle(-8, 8, 0, 7, -4, 4, MARBRE_2, MARBRE, MARBRE);
  colonnade(-2, 2, 5, 5, 0, 4, MARBRE, 2);
  fronton(0, 5, 5, 3, MARBRE);
  for (let h = 0; h <= 2; h++) for (let k = -1; k <= 1; k++) set(k, h, 4, BLOCK.AIR);
  bloc(-2, 2, 8, 8, -2, 2, BLOCK.AIR);
  tambour(0, 8, 10, 0, 3, MARBRE, VERRE);
  dome(0, 11, 0, 3, MARBRE);
  // L'ÉLÉPHANT de la rotonde, sur son socle
  bloc(-1, 1, 0, 0, -1, 1, MARBRE_2);               // le socle
  bloc(-1, 1, 1, 3, 0, 1, GRIS);                    // le corps
  set(-1, 1, 0, GRIS); set(-1, 1, 1, GRIS);         // les pattes avant
  set(1, 1, 0, GRIS); set(1, 1, 1, GRIS);
  set(-1, 3, -1, GRIS);                             // la tête, trompe levée
  set(-1, 4, -1, GRIS); set(-1, 5, -2, GRIS);
  // LA SALLE DES DINOSAURES, à l'ouest : le squelette, épine dorsale en arc.
  for (let h = 0; h <= 2; h++) set(-5, h, 0, BLOCK.AIR);
  for (let k = 0; k < 5; k++) {
    const y = [1, 2, 3, 2, 1][k];
    set(-8 + k + 1, y, -1, BLANC);                  // la colonne vertébrale
    if (k % 2 === 0) { set(-8 + k + 1, y - 1, -1, BLANC); }   // les côtes
  }
  set(-6, 1, -2, BLANC); set(-6, 2, -2, BLANC);     // le cou et la tête
  set(-6, 3, -2, BLANC);
  set(-4, 0, 2, BANC);
  // LA SALLE DES GEMMES, à l'est : le diamant Hope sous sa vitrine.
  for (let h = 0; h <= 2; h++) set(5, h, 0, BLOCK.AIR);
  set(6, 0, 0, MARBRE_2); set(6, 1, 0, BLEU); set(6, 2, 0, VERRE);   // le Hope
  set(7, 0, -2, MARBRE_2); set(7, 1, -2, JAUNE); set(7, 2, -2, VERRE);
  set(7, 0, 2, MARBRE_2); set(7, 1, 2, VERT_SOMBRE); set(7, 2, 2, VERRE);
  set(5, 0, -2, LAMPE);
}

// LE MUSÉE D'HISTOIRE AMÉRICAINE. La Bannière étoilée — l'originale de 1814,
// celle de l'hymne — dans sa pénombre, et une locomotive à vapeur posée dans
// la grande halle.
export function buildHistoireAmericaine(poser) {
  const { set, salle, bloc } = outils(poser);
  salle(-7, 7, 0, 7, -4, 4, MARBRE_2, MARBRE, MARBRE);
  for (let h = 0; h <= 2; h++) for (let k = -1; k <= 1; k++) set(k, h, 4, BLOCK.AIR);
  // LA BANNIÈRE ÉTOILÉE, au mur nord : rayures rouges et blanches, canton bleu.
  for (let x = -5; x <= 0; x++) {
    for (let y = 2; y <= 5; y++) {
      const id = (x <= -3 && y >= 4) ? BLEU : ((y & 1) === 0 ? ROUGE : BLANC);
      set(x, y, -3, id);
    }
  }
  bloc(-5, 0, 1, 1, -3, -3, MARBRE_2);              // la rampe de présentation
  // LA LOCOMOTIVE 1401, dans la halle est : chaudière, cabine, roues.
  bloc(2, 5, 1, 2, 1, 2, VERT_SOMBRE);              // la chaudière
  bloc(6, 6, 1, 3, 1, 2, VERT_SOMBRE);              // la cabine
  set(2, 3, 1, NOIR);                               // la cheminée
  for (const x of [2, 4, 6]) { set(x, 0, 1, NOIR); set(x, 0, 2, NOIR); }   // les roues
  set(0, 0, 2, BANC);
}

// LE MUSÉE AFRO-AMÉRICAIN. La couronne de bronze — trois plateaux renversés,
// ajourés — au-dessus d'un hall de verre.
export function buildAfroAmericain(poser) {
  const { set, bloc, salle } = outils(poser);
  salle(-3, 3, 0, 2, -2, 2, VERRE, GRANIT, ACIER);
  for (let h = 0; h <= 1; h++) set(0, h, 2, BLOCK.AIR);
  for (let n = 0; n < 3; n++) {
    const y0 = 3 + n * 3, demiU = 2 + n, demiV = 1 + n;
    for (let dx = -demiU; dx <= demiU; dx++) {
      for (let dz = -demiV; dz <= demiV; dz++) {
        const bord = Math.abs(dx) === demiU || Math.abs(dz) === demiV;
        for (let y = y0; y < y0 + 3; y++) {
          if (bord && ((dx + dz + y) & 1) === 0) set(dx, y, dz, uni(1));   // le bronze ajouré
        }
      }
    }
  }
  bloc(-2, 2, 2, 2, -1, 1, ACIER);
  set(0, 0, 0, LAMPE);
}

// --- LES MUSÉES DU MALL — RIVE SUD ---------------------------------------------

// LE MUSÉE DE L'INDIEN D'AMÉRIQUE. Le calcaire doré en strates courbes,
// sculpté par le vent — aucune ligne droite dans la vraie façade.
export function buildIndienAmerique(poser) {
  const { set, bloc, salle } = outils(poser);
  const RAYONS = [5, 4.6, 5, 4.2, 4.8, 4, 3.2];
  for (let y = 0; y < RAYONS.length; y++) {
    const r = RAYONS[y];
    for (let dx = -5; dx <= 5; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        const d = Math.hypot(dx, dz * 1.2);
        if (Math.abs(d - r) < 0.8) set(dx, y, dz, uni(16));
        else if (d < r && y === 0) set(dx, y, dz, GRANIT);
      }
    }
  }
  bloc(-2, 2, 7, 7, -2, 2, uni(16));
  for (let h = 0; h <= 2; h++) set(-5, h, 0, BLOCK.AIR);   // l'entrée face au levant
  for (let h = 0; h <= 2; h++) set(-4, h, 0, BLOCK.AIR);
  set(0, 0, 0, LAMPE); set(2, 0, 0, BANC);
}

// LE MUSÉE DE L'AIR ET DE L'ESPACE — le hall des Jalons du vol. Le musée le
// plus visité d'Amérique, et on comprend en poussant la porte : le Spirit of
// St. Louis et le Bell X-1 SUSPENDUS au plafond, la capsule Apollo 11 et
// Friendship 7 posées au sol, le module lunaire sur ses pattes, et deux
// fusées debout dans la baie vitrée.
export function buildAirEspace(poser) {
  const { set, salle, bloc } = outils(poser);
  salle(-7, 7, 0, 10, -4, 4, MARBRE_2, GRANIT, ACIER);
  // la façade nord, vers le Mall, tout en verre
  for (let x = -6; x <= 6; x++) {
    for (let y = 0; y <= 9; y++) {
      if ((x & 3) !== 0) set(x, y, -4, VERRE);
    }
  }
  for (let h = 0; h <= 2; h++) for (let k = -1; k <= 1; k++) set(k, h, -4, BLOCK.AIR);
  // LE SPIRIT OF ST. LOUIS, argenté, suspendu — fuselage et grande aile.
  bloc(-4, -1, 8, 8, -1, -1, ACIER);                // le fuselage
  bloc(-3, -3, 8, 8, -3, 1, ACIER);                 // l'aile
  set(-1, 8, -1, GRIS);                             // le moteur
  // LE BELL X-1, orange, suspendu plus bas.
  bloc(2, 4, 6, 6, 0, 0, ORANGE);
  set(3, 6, -1, ORANGE); set(3, 6, 1, ORANGE);      // les ailes courtes
  // LA CAPSULE APOLLO 11 (Columbia), cône posé au sol.
  set(-4, 0, 2, ACIER); bloc(-5, -3, 1, 1, 1, 3, ACIER); set(-4, 2, 2, GRIS);
  // FRIENDSHIP 7, la capsule de John Glenn.
  set(1, 0, 2, GRIS); set(1, 1, 2, NOIR);
  // LE MODULE LUNAIRE, sur ses quatre pattes dorées.
  bloc(4, 5, 1, 2, 1, 2, OR);
  set(3, 0, 0, OR); set(6, 0, 0, OR); set(3, 0, 3, OR); set(6, 0, 3, OR);
  // LES DEUX FUSÉES, debout dans la baie est.
  for (let y = 0; y <= 8; y++) set(6, y, -2, y === 8 ? ROUGE : BLANC);
  for (let y = 0; y <= 7; y++) set(5, y, -3, y === 7 ? NOIR : GRIS);
  set(0, 0, 3, BANC); set(-2, 0, 3, BANC);
}

// LE HIRSHHORN. Le donut de béton sur pilotis — le musée d'art moderne le
// plus reconnaissable du monde, une cour ronde à ciel ouvert au milieu.
export function buildHirshhorn(poser) {
  const { set, bloc, anneau } = outils(poser);
  for (let y = 2; y <= 7; y++) {
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= 4.4 && d >= 2.2) set(dx, y, dz, BETON_CLAIR);
      }
    }
  }
  // vider la galerie intérieure de l'anneau
  for (let y = 3; y <= 6; y++) {
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= 3.8 && d >= 2.8) set(dx, y, dz, BLOCK.AIR);
      }
    }
  }
  // les quatre pilotis
  for (const [x, z] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) bloc(x, x, 0, 1, z, z, BETON);
  anneau(0, -1, 0, 3, GRANIT, true);                // la cour, sous l'anneau
  set(0, -1, 0, EAU); set(0, 0, 0, EAU);            // la fontaine centrale
  // une sculpture dans la cour, et l'escalier qui monte dans l'anneau
  set(2, 0, 0, ROUGE); set(2, 1, 0, ROUGE); set(2, 2, 0, NOIR);
  for (let k = 0; k < 3; k++) set(-2, k, -2 + k, DALLE);
}

// ARTS ET INDUSTRIES. Le premier musée du Smithsonian (1881), brique
// polychrome et rosaces — un pavillon victorien.
export function buildArtsIndustries(poser) {
  const { set, salle, bloc } = outils(poser);
  salle(-2, 2, 0, 5, -3, 3, BRIQUE, GRANIT, uni(5));
  for (let y = 1; y <= 4; y += 3) {
    for (const z of [-2, 0, 2]) { set(-2, y, z, uni(1)); set(2, y, z, uni(1)); }
  }
  bloc(-1, 1, 6, 7, -1, 1, BRIQUE);
  set(0, 8, 0, uni(5));
  for (let h = 0; h <= 2; h++) set(0, h, -3, BLOCK.AIR);
  set(0, 0, 0, LAMPE); set(0, 0, 2, BANC);
}

// LE CHÂTEAU DU SMITHSONIAN. Le grès rouge, les neuf tours — la maison mère,
// et la crypte de James Smithson dans l'entrée.
export function buildChateauSmithsonian(poser) {
  const { set, salle, bloc } = outils(poser);
  salle(-3, 3, 0, 5, -2, 2, GRES_ROUGE, GRANIT, GRES_ROUGE);
  // les tours : deux hautes au nord, deux basses au sud
  for (const [x, z, h] of [[-3, -2, 9], [3, -2, 8], [-3, 2, 7], [3, 2, 7]]) {
    bloc(x, x, 5, h, z, z, GRES_ROUGE);
    set(x, h + 1, z, uni(5));
  }
  bloc(-1, 1, 6, 6, -1, 1, GRES_ROUGE);
  for (let h = 0; h <= 2; h++) set(0, h, -2, BLOCK.AIR);
  set(-2, 0, 0, MARBRE_2); set(-2, 1, 0, MARBRE);   // la crypte de Smithson
  set(2, 0, 0, LAMPE);
}

// LA GALERIE FREER. Un palais florentin fermé sur sa cour intérieure.
export function buildFreer(poser) {
  const { set, salle } = outils(poser);
  salle(-2, 2, 0, 4, -2, 2, MARBRE_2, GRANIT, uni(5));
  set(0, -1, 0, HERBE); set(0, 0, 0, FEUILLES);     // la cour plantée
  for (let h = 0; h <= 2; h++) set(0, h, 2, BLOCK.AIR);
}

// --- AUTOUR DE LA MAISON-BLANCHE ------------------------------------------------

// LA MAISON-BLANCHE. Le corps central avec le portique nord à colonnes et le
// portique sud ARRONDI ; l'aile ouest, basse, avec LE BUREAU OVALE — ovale
// pour de vrai — et la roseraie le long de la colonnade. Dedans : le hall
// d'entrée, l'East Room et ses lustres, la salle à manger d'État.
//
// L'entrée d'un enfant : par le portique NORD (v négatif), comme les invités.
export function buildMaisonBlanche(poser) {
  const { set, salle, bloc, colonnade, fronton } = outils(poser);

  // le corps central : 13 de large, 9 de profond
  salle(-6, 6, 0, 7, -4, 4, BLANC, PLANCHER, BLANC);
  bloc(-6, 6, 8, 8, -4, 4, MARBRE_2);               // la balustrade du toit
  // le portique nord et son fronton
  colonnade(-2, 2, -5, -5, 0, 5, BLANC, 2);
  fronton(0, 6, -5, 3, BLANC);
  for (let h = 0; h <= 2; h++) for (let k = -1; k <= 1; k++) set(k, h, -4, BLOCK.AIR);
  // le portique sud, arrondi
  for (const [dx, dz] of [[-2, 5], [-1, 6], [0, 6], [1, 6], [2, 5]]) {
    bloc(dx, dx, 0, 5, dz, dz, BLANC);
  }
  // le hall d'entrée : deux torchères de part et d'autre de la porte
  set(-2, 0, -2, LAMPE); set(2, 0, -2, LAMPE);
  // L'EAST ROOM, à l'est : la grande salle de bal, trois lustres dorés.
  for (const z of [-2, 0, 2]) { set(4, 6, z, OR); set(4, 5, z, LAMPE); }
  // la salle à manger d'État, à l'ouest : la grande table dressée
  for (let z = -1; z <= 1; z++) set(-4, 0, z, TABLE);
  set(-4, 0, -3, LAMPE);
  // le mur intérieur qui sépare hall et salles
  for (let z = -3; z <= 3; z++) {
    if (z >= -1 && z <= 1) continue;                // le passage central
    bloc(1, 1, 0, 6, z, z, BLANC); bloc(-3, -3, 0, 6, z, z, BLANC);
  }

  // L'AILE OUEST, basse, reliée par la colonnade — et LE BUREAU OVALE.
  salle(-12, -7, 0, 3, 0, 6, BLANC, PLANCHER, MARBRE_2);
  for (let h = 0; h <= 2; h++) set(-7, h, 1, BLOCK.AIR);   // on passe de l'une à l'autre
  for (let h = 0; h <= 2; h++) set(-6, h, 1, BLOCK.AIR);
  // le Bureau ovale : des murs en ellipse dans l'angle sud de l'aile
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const d = (dx / 2) ** 2 + (dz / 2) ** 2;
      if (d <= 1.3 && d >= 0.6) bloc(-10 + dx, -10 + dx, 0, 3, 4 + dz, 4 + dz, BLANC);
    }
  }
  for (let h = 0; h <= 2; h++) set(-10, h, 2, BLOCK.AIR);  // la porte du Bureau
  set(-10, 0, 5, TABLE);                            // le bureau Resolute
  set(-11, 0, 4, LAMPE);
  // la roseraie, le long de la colonnade nord de l'aile
  for (let x = -12; x <= -7; x++) {
    for (let z = -3; z <= -2; z++) set(x, 0, z, (x & 1) === 0 ? uni(15) : FEUILLES);
  }
}

// LE TRÉSOR. La façade grecque à quinze colonnes, juste à l'est de la
// Maison-Blanche — c'est lui qui bouche la perspective de Pennsylvania
// Avenue, la plus célèbre erreur d'urbanisme du pays.
export function buildTresor(poser) {
  const { set, salle, colonnade } = outils(poser);
  salle(-2, 2, 0, 6, -4, 4, CALCAIRE, GRANIT, CALCAIRE);
  colonnade(-3, -3, -4, 4, 0, 5, CALCAIRE, 2);
  for (let h = 0; h <= 2; h++) set(-2, h, 0, BLOCK.AIR);
  set(0, 0, 0, TABLE); set(0, 1, 0, OR);            // le lingot sur la table
  set(0, 0, -3, LAMPE); set(0, 0, 3, LAMPE);
}

// LES ARCHIVES NATIONALES. Le temple aux Chartes : la Déclaration, la
// Constitution et le Bill of Rights sous leurs vitrines, dans la pénombre de
// la rotonde.
export function buildArchives(poser) {
  const { set, salle, colonnade, fronton, bloc } = outils(poser);
  salle(-4, 4, 0, 6, -2, 2, CALCAIRE, GRANIT, CALCAIRE);
  colonnade(-4, 4, -3, -3, 0, 5, CALCAIRE, 2);
  fronton(0, 6, -3, 4, CALCAIRE);
  for (let h = 0; h <= 2; h++) for (let k = -1; k <= 1; k++) set(k, h, -2, BLOCK.AIR);
  // les trois Chartes, sous verre, sur l'estrade du fond
  bloc(-2, 2, 0, 0, 1, 1, MARBRE_2);
  for (const x of [-2, 0, 2]) { set(x, 1, 1, uni(16)); set(x, 2, 1, VERRE); }
  set(-3, 0, 0, LAMPE); set(3, 0, 0, LAMPE);
}

// L'ARC DE L'AMITIÉ DE CHINATOWN. Le plus grand arc chinois hors de Chine :
// sept toits verts et or au-dessus de H Street.
export function buildArcChinatown(poser) {
  const { set, bloc } = outils(poser);
  bloc(-4, -3, 0, 5, -1, 1, ROUGE);
  bloc(3, 4, 0, 5, -1, 1, ROUGE);
  bloc(-4, 4, 6, 6, -1, 1, VERT_SOMBRE);
  bloc(-3, 3, 7, 7, -1, 1, OR);
  bloc(-1, 1, 8, 8, -1, 1, VERT_SOMBRE);
  set(0, 9, 0, OR);
}

// LE THÉÂTRE FORD. La scène, les fauteuils, et la loge drapée où Lincoln fut
// assassiné le 14 avril 1865 — on la voit depuis le parterre, à jamais vide.
export function buildFordTheatre(poser) {
  const { set, salle, bloc } = outils(poser);
  salle(-3, 3, 0, 6, -3, 3, BRIQUE, PLANCHER, BRIQUE);
  for (let h = 0; h <= 2; h++) set(0, h, 3, BLOCK.AIR);
  bloc(-2, 2, 0, 0, -3, -2, GRANIT);                // la scène surélevée
  set(0, 1, -2, LAMPE);
  for (let x = -2; x <= 2; x += 2) {                // les fauteuils du parterre
    for (let z = 0; z <= 2; z += 1) set(x, 0, z, BANC);
  }
  bloc(2, 2, 2, 3, -2, -2, ROUGE);                  // la loge présidentielle, drapée
  set(2, 4, -2, BLEU);
}

// --- CAPITOL HILL ----------------------------------------------------------------

// LA COUR SUPRÊME. « Equal Justice Under Law » : le temple blanc, et la salle
// d'audience aux neuf fauteuils.
export function buildCourSupreme(poser) {
  const { set, salle, colonnade, fronton, bloc } = outils(poser);
  salle(-3, 3, 0, 6, -3, 3, MARBRE, MARBRE_2, MARBRE);
  colonnade(-4, -4, -3, 3, 0, 5, MARBRE, 2);
  fronton(0, 6, -4, 4, MARBRE, true);
  for (let m = 0; m < 3; m++) for (let z = -2; z <= 2; z++) set(-5 - m, 1 - m - 1, z, MARBRE_2);
  for (let h = 0; h <= 2; h++) set(-3, h, 0, BLOCK.AIR);
  for (let h = 0; h <= 2; h++) set(-4, h, 0, BLOCK.AIR);
  // la salle d'audience : l'estrade et les neuf sièges
  bloc(1, 2, 0, 0, -2, 2, GRANIT);
  for (let z = -2; z <= 2; z++) set(2, 1, z, BANC);
  set(0, 0, 0, TABLE);
}

// LA BIBLIOTHÈQUE DU CONGRÈS. Le bâtiment Jefferson, et la plus belle salle
// du pays : LA SALLE DE LECTURE octogonale, ses pupitres en cercles sous la
// coupole.
export function buildBibliotheque(poser) {
  const { set, salle, bloc, dome, tambour, anneau } = outils(poser);
  salle(-5, 5, 0, 6, -4, 4, CALCAIRE, MARBRE_2, CALCAIRE);
  for (let h = 0; h <= 2; h++) set(-5, h, 0, BLOCK.AIR);
  bloc(-3, 3, 7, 7, -3, 3, BLOCK.AIR);
  tambour(0, 7, 9, 0, 4, CALCAIRE, VERRE);
  dome(0, 10, 0, 4, uni(1));                        // la coupole cuivrée
  set(0, 14, 0, OR);                                // la Torche du Savoir
  // la salle de lecture : les pupitres en deux cercles autour du bureau central
  anneau(0, 0, 0, 3, TABLE);
  set(0, 0, 0, GRANIT); set(0, 1, 0, LAMPE);        // le bureau du contrôle
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) set(x, 0, z, LAMPE);
  // les rayonnages, contre les murs
  for (const x of [-4, 4]) for (let z = -3; z <= 3; z++) { set(x, 0, z, uni(6)); set(x, 1, z, uni(6)); set(x, 2, z, uni(6)); }
}

// UNION STATION. Les trois grandes arches de calcaire, la halle aux caissons
// dorés, et derrière, LES QUAIS : c'est la porte d'entrée ferroviaire de la
// capitale depuis 1907.
export function buildUnionStation(poser) {
  const { set, salle, bloc } = outils(poser);
  // la grande halle — sa façade regarde le SUD, vers le Capitole
  salle(-8, 8, 0, 9, -2, 5, CALCAIRE, MARBRE_2, CALCAIRE);
  // les caissons dorés de la voûte
  for (let x = -7; x <= 7; x++) {
    for (let z = -1; z <= 4; z++) {
      if (((x + z) & 1) === 0) set(x, 9, z, OR);
    }
  }
  // les trois arches de la façade
  for (const cx of [-5, 0, 5]) {
    for (let h = 0; h <= 4; h++) {
      for (let k = -1; k <= 1; k++) {
        if (h <= 3 || k === 0) set(cx + k, h, 5, BLOCK.AIR);
      }
    }
  }
  set(-3, 0, 2, BANC); set(3, 0, 2, BANC);
  set(0, 0, 3, LAMPE);
  // le tableau des départs, au-dessus des portes des quais
  bloc(-2, 2, 4, 5, -2, -2, NOIR);
  // LES QUAIS, derrière la halle : deux voies, deux trains à l'arrêt.
  bloc(-8, 8, 0, 0, -6, -3, GRANIT);
  for (let h = 0; h <= 2; h++) for (const k of [-1, 0, 1]) set(k, h, -2, BLOCK.AIR);
  for (const z of [-4, -6]) {
    for (let x = -7; x <= -2; x++) { set(x, 1, z, ACIER); if (x === -7) set(x, 2, z, ACIER); }
  }
  // la marquise au-dessus des quais
  for (let x = -8; x <= 8; x++) for (const z of [-3, -5]) set(x, 5, z, VERRE);
}

// --- WEST POTOMAC PARK ------------------------------------------------------------

// LE MUR DU VIETNAM. Deux ailes de granit noir enfoncées dans la pelouse, en
// V ouvert — l'une vise le Lincoln, l'autre l'obélisque. Les noms sont
// gravés ; ici, le poli du noir suffit à dire le silence.
export function buildVietnam(poser) {
  const { set } = outils(poser);
  for (let k = 0; k < 7; k++) {
    const h = Math.max(1, 3 - Math.floor(k / 2.5));
    for (let y = 0; y < h; y++) {
      set(-k, y, -Math.round(k * 0.4), NOIR);       // l'aile vers le Lincoln
      set(k, y, -Math.round(k * 0.4), NOIR);        // l'aile vers l'obélisque
    }
    // le chemin qui descend le long du mur
    set(-k, -1, -Math.round(k * 0.4) + 1, GRANIT);
    set(k, -1, -Math.round(k * 0.4) + 1, GRANIT);
  }
  set(0, -1, 1, GRANIT);
}

// LE MÉMORIAL DE CORÉE. Les dix-neuf soldats d'acier qui marchent en
// triangle vers le drapeau, ponchos au vent, et le mur de granit poli.
export function buildCoree(poser) {
  const { set, bloc } = outils(poser);
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k <= r; k++) {
      const x = -4 + r * 2, z = -r + k * 2;
      if (Math.abs(z) > 2) continue;
      set(x, 0, z, GRIS); set(x, 1, z, GRIS);       // un soldat, poncho gris
      set(x, 2, z, uni(16));                        // le visage
    }
  }
  for (let x = -4; x <= 4; x++) set(x, -1, 3, NOIR);   // le mur poli
  set(4, 0, 0, BLANC); set(4, 1, 0, ROUGE); set(4, 2, 0, BLEU);   // le drapeau
}

// LE MÉMORIAL MARTIN LUTHER KING. La Pierre de l'Espoir, détachée de la
// Montagne du Désespoir — on passe ENTRE les deux, comme le veut le vrai.
export function buildMLK(poser) {
  const { set, bloc } = outils(poser);
  bloc(-4, -3, 0, 4, -2, 2, MARBRE_2);              // la Montagne, fendue
  bloc(3, 4, 0, 4, -2, 2, MARBRE_2);
  bloc(0, 1, 0, 4, -1, 1, MARBRE);                  // la Pierre de l'Espoir, avancée
  set(0, 2, -2, uni(16));                           // le visage tourné vers le bassin
  set(-2, -1, 0, GRANIT); set(2, -1, 0, GRANIT);    // le passage
}

// LE MÉMORIAL ROOSEVELT. Il manquait à la première version, faute de place —
// le voilà : QUATRE SALLES à ciel ouvert, une par mandat, granit rouge,
// cascades et citations. On les traverse dans l'ordre, comme les douze ans.
export function buildRoosevelt(poser) {
  const { set, bloc } = outils(poser);
  for (let n = 0; n < 4; n++) {
    const z0 = -8 + n * 4;
    // les murs de granit rouge de la salle
    bloc(-4, -4, 0, 2, z0, z0 + 3, GRES_ROUGE);
    bloc(-3, 3, 0, 2, z0, z0, GRES_ROUGE);
    for (let h = 0; h <= 1; h++) { set(0, h, z0, BLOCK.AIR); set(1, h, z0, BLOCK.AIR); }  // le passage
    // la cascade : l'eau qui tombe du mur dans sa vasque
    set(-4, 2, z0 + 2, EAU); set(-4, 1, z0 + 2, EAU);
    set(-3, -1, z0 + 2, EAU);
    set(3, 0, z0 + 2, GRANIT);                      // le banc de la salle
  }
  set(2, 0, -6, GRIS); set(2, 1, -6, GRIS);         // Roosevelt assis, et Fala
  set(3, 0, -5, NOIR);                              // le petit chien
}

// LE MÉMORIAL JEFFERSON. La rotonde ouverte sur le Tidal Basin : un anneau de
// colonnes, le dôme, et Jefferson debout qui regarde la Maison-Blanche.
export function buildJefferson(poser) {
  const { set, bloc, dome, anneau, colonnade, fronton } = outils(poser);
  anneau(0, -1, 0, 6, MARBRE_2, true);              // le socle circulaire
  for (let a = 0; a < 14; a++) {
    const ang = (a / 14) * Math.PI * 2;
    const x = Math.round(Math.cos(ang) * 5), z = Math.round(Math.sin(ang) * 5);
    bloc(x, x, 0, 5, z, z, MARBRE);
  }
  dome(0, 6, 0, 6, MARBRE);
  // le portique d'entrée au nord, face au bassin et à la Maison-Blanche
  colonnade(-2, 2, -6, -6, 0, 4, MARBRE, 2);
  fronton(0, 5, -6, 3, MARBRE);
  bloc(-1, 1, 0, 3, -1, 1, BLOCK.AIR);
  for (let m = 0; m < 3; m++) for (let x = -2; x <= 2; x++) set(x, -m - 1 + 1, -7 - m, MARBRE_2);
  set(0, 0, 0, uni(1)); set(0, 1, 0, uni(1)); set(0, 2, 0, uni(1)); set(0, 3, 0, uni(16));  // la statue de bronze
}

// LE KENNEDY CENTER. La boîte blanche au bord du fleuve, ses colonnes dorées
// en aiguille, et la grande terrasse d'où l'on voit tout le Potomac.
export function buildKennedyCenter(poser) {
  const { set, salle, bloc, colonnade } = outils(poser);
  salle(-4, 4, 0, 7, -8, 8, MARBRE, PLANCHER, MARBRE);
  colonnade(-5, -5, -8, 8, 0, 7, OR, 2);
  colonnade(5, 5, -8, 8, 0, 7, OR, 2);
  for (let h = 0; h <= 2; h++) for (let k = -1; k <= 1; k++) set(-4, h, k, BLOCK.AIR);
  // le Grand Foyer : les lustres, le buste de Kennedy
  for (const z of [-5, 0, 5]) set(0, 6, z, LAMPE);
  set(0, 0, 0, MARBRE_2); set(0, 1, 0, uni(16));    // le buste
  bloc(-2, 2, 0, 0, -6, -4, ROUGE);                 // la salle de concert, moquette rouge
  for (const z of [-6, -5, -4]) { set(-2, 0, z, BANC); set(2, 0, z, BANC); }
  set(0, 0, -6, GRANIT); set(0, 1, -6, TABLE);      // la scène et le piano
}

// --- LA VIRGINIE, DE L'AUTRE CÔTÉ DU FLEUVE --------------------------------------

// LE PENTAGONE. Cinq côtés, cinq anneaux concentriques, la cour de deux
// hectares au milieu — le plus grand bâtiment de bureaux du monde. On entre,
// on traverse les anneaux par les couloirs rayonnants, on débouche dans la
// cour.
export function buildPentagone(poser) {
  const { set, bloc } = outils(poser);
  const coin = (k, r) => {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const H = 5;
  // trois anneaux de murs (le vrai en a cinq ; trois suffisent à l'effet)
  for (const r of [12, 8.5, 5]) {
    for (let k = 0; k < 5; k++) {
      const [x0, z0] = coin(k, r), [x1, z1] = coin((k + 1) % 5, r);
      const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0));
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + ((x1 - x0) * i) / n), z = Math.round(z0 + ((z1 - z0) * i) / n);
        for (let y = 0; y < H; y++) {
          const fen = y === 1 || y === 3;
          set(x, y, z, fen && ((x + z) & 1) === 0 ? VERRE : BETON_CLAIR);
        }
        set(x, H, z, GRIS);
      }
    }
  }
  // le sol entre les anneaux, et LA COUR au centre
  for (let dx = -12; dx <= 12; dx++) {
    for (let dz = -12; dz <= 12; dz++) {
      const d = Math.hypot(dx, dz);
      if (d < 4.6) set(dx, -1 + 1 - 1, dz, HERBE);
      else if (d < 12) set(dx, -1, dz, GRANIT);
    }
  }
  set(0, 0, 0, FEUILLES);                           // l'arbre de la cour
  // les couloirs rayonnants, qui percent les trois anneaux
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + ((k + 0.5) * 2 * Math.PI) / 5;
    for (let r = 4; r <= 13; r++) {
      const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
      for (let y = 0; y <= 2; y++) { set(x, y, z, BLOCK.AIR); set(x + 1, y, z, BLOCK.AIR); }
    }
  }
}

// LA TOMBE DU SOLDAT INCONNU, au cimetière d'Arlington : l'amphithéâtre de
// marbre, le sarcophage face à la ville, et la sentinelle qui fait les cent
// pas — vingt et un pas, comme les vingt et un coups de canon.
export function buildSoldatInconnu(poser) {
  const { set, bloc, anneau, colonnade } = outils(poser);
  // l'amphithéâtre en demi-cercle, à l'ouest
  for (let r = 3; r <= 5; r++) {
    for (let a = 0; a <= 16; a++) {
      const ang = Math.PI / 2 + (a / 16) * Math.PI;
      const x = Math.round(Math.cos(ang) * r) - 1, z = Math.round(Math.sin(ang) * r);
      set(x, r - 3, z, MARBRE_2);
    }
  }
  colonnade(-4, -4, -3, 3, 2, 4, MARBRE, 2);
  bloc(2, 4, 0, 1, -1, 1, MARBRE);                  // le sarcophage
  set(3, 2, 0, MARBRE_2);
  bloc(1, 5, -1 + 1 - 1, -1 + 1 - 1, -2, 2, GRANIT);   // le tapis noir de la sentinelle
  set(5, 0, 0, VERT_SOMBRE); set(5, 1, 0, uni(16)); // la sentinelle
}

// LE MÉMORIAL IWO JIMA. Les six soldats de bronze qui dressent le drapeau —
// la photographie la plus célèbre de la guerre, coulée dans dix mètres de
// bronze au-dessus du Potomac, face aux monuments.
export function buildIwoJima(poser) {
  const { set, bloc } = outils(poser);
  bloc(-4, 4, -1, 0, -3, 3, GRANIT);                // le socle
  // les six soldats, en grappe montante
  const soldats = [[-3, 0], [-2, 1], [-1, -1], [0, 0], [1, 1], [2, 0]];
  soldats.forEach(([x, z], i) => {
    const h = 1 + Math.floor(i / 2);
    for (let y = 1; y <= h; y++) set(x, y, z, uni(1));
    set(x, h + 1, z, uni(16));
  });
  // le mât incliné et le drapeau
  for (let k = 0; k < 5; k++) set(2, 3 + k, 0, ACIER);
  for (let k = 0; k < 3; k++) { set(3, 6, k - 2, ROUGE); set(3, 7, k - 2, BLANC); }
  set(4, 6, -2, BLEU);
}

// --- LES PONTS -------------------------------------------------------------------

// LE PONT DU MÉMORIAL. Neuf arches basses entre le Lincoln et Arlington —
// l'axe qui relie le Nord et le Sud réconciliés, et c'est voulu.
export function buildPontMemorial(poser) {
  const { set, bloc } = outils(poser);
  for (let x = -16; x <= 16; x++) {
    for (let z = -2; z <= 2; z++) set(x, 2, z, MARBRE_2);          // le tablier
    set(x, 3, -3, MARBRE_2); set(x, 3, 3, MARBRE_2);               // les parapets
    if (((x + 16) % 6) === 0) {
      for (let y = -3; y <= 1; y++) { set(x, y, -2, GRANIT); set(x, y, 2, GRANIT); }  // les piles
    }
  }
  // les quatre statues équestres dorées, aux deux entrées
  for (const [x, z] of [[-16, -4], [-16, 4], [16, -4], [16, 4]]) {
    set(x, 3, z, GRANIT); set(x, 4, z, OR); set(x, 5, z, OR);
  }
}

// LE PONT DE LA 14e RUE, sur le grand Potomac — celui des voitures ; le pont
// du métro de la Jaune, lui, est bâti par le creusement de la ligne.
export function buildPont14e(poser) {
  const { set } = outils(poser);
  for (let z = -14; z <= 14; z++) {
    for (let x = -2; x <= 2; x++) set(x, 2, z, BETON_CLAIR);
    set(-3, 3, z, BETON); set(3, 3, z, BETON);
    if (((z + 14) % 6) === 0) {
      for (let y = -3; y <= 1; y++) { set(-2, y, z, BETON); set(2, y, z, BETON); }
    }
    if (((z + 14) % 4) === 2) set(0, 2, z, CITY_BLOCK.ROADLINE);
  }
}

// KEY BRIDGE. Les hautes arches de béton entre Georgetown et la Virginie —
// le plus vieux pont du Potomac encore debout.
export function buildKeyBridge(poser) {
  const { set, bloc } = outils(poser);
  for (let z = -9; z <= 9; z++) {
    for (let x = -2; x <= 2; x++) set(x, 4, z, BETON_CLAIR);
    set(-3, 5, z, BETON); set(3, 5, z, BETON);
    const arche = Math.abs(((z + 9) % 9) - 4.5);
    const yPile = Math.round(arche * 1.2);
    for (let y = -3; y <= Math.min(3, yPile); y++) { set(-2, y, z, BETON); set(2, y, z, BETON); }
  }
}
