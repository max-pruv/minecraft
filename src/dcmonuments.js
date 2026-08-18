// Les monuments de Washington.
//
// Une règle, et elle vaut pour les vingt-six : **on entre dedans**. Pas un
// bloc plein qu'on regarde de l'extérieur — un bâtiment avec une porte, un
// sol, un plafond et quelque chose à voir à l'intérieur. C'était la demande, et
// c'est aussi ce qui distingue une capitale d'un décor : à Washington, tout est
// ouvert au public et gratuit.
//
// Deuxième règle : **la silhouette d'abord**. Un enfant reconnaît un bâtiment à
// trois traits, pas à trente. Le Capitole, c'est un dôme entre deux ailes
// basses ; le Lincoln, une boîte à colonnes ; l'obélisque, une aiguille avec un
// changement de teinte au tiers. Chaque constructeur commence donc par ces
// trois traits-là, et n'ajoute le détail qu'après.
//
// Troisième règle, imposée par le ciel : le plafond du monde est à 160 et le
// sol de Washington autour de 33. Il reste donc environ cent vingt blocs, et
// **chaque monument a sa propre échelle** — l'obélisque prend soixante-deux
// blocs parce qu'il domine tout, le Château du Smithsonian en prend douze
// parce qu'il est petit dans la vraie ville aussi. Une échelle unique aurait
// écrasé l'un ou ridiculisé l'autre.

import { BLOCK, CITY_BLOCK, DECOR_START, PROP_START } from './blocks.js';

const uni = (c) => DECOR_START + c * 10;

const MARBRE = uni(27);          // le marbre blanc du Mall
const MARBRE_2 = uni(28);        // la seconde carrière de l'obélisque, plus crème
const CALCAIRE = uni(19);
const GRES_ROUGE = uni(18);      // le grès du Château du Smithsonian
const GRANIT = CITY_BLOCK.GRANITE;
const GRANIT_NOIR = uni(26);     // le mur du Vietnam, poli comme un miroir
const BRONZE = uni(22);          // la résille du musée afro-américain
const CUIVRE = CITY_BLOCK.COPPER;
const OR = BLOCK.GOLD;
const VERRE = BLOCK.GLASS;
const VERRE_BLEU = CITY_BLOCK.CURTAIN;
const ACIER = uni(24);
const ARDOISE = uni(25);
const BETON = BLOCK.STONEBRICK;
const HERBE = BLOCK.GRASS;
const EAU = BLOCK.WATER;
const ARBRE = BLOCK.LEAVES;
const DALLE = CITY_BLOCK.SIDEWALK;
const ROUGE = uni(0);
const VERT = uni(5);
const JAUNE = uni(2);
const BOIS = BLOCK.PLANK;
const TAPIS = BLOCK.WOOL_RED;
const LAMPE = PROP_START + 9;    // la lampe : de la lumière dans les intérieurs
const BANC = PROP_START + 5;     // le fauteuil, qui fait un banc de musée
const TABLE = PROP_START + 6;

// --- la boîte à outils ---------------------------------------------------------
//
// Les mêmes gestes reviennent dans les vingt-six : poser un mur creux, une
// colonnade, un fronton, un dôme. Les écrire une fois évite vingt-six versions
// qui divergent — et c'est ce qui rend chaque constructeur lisible en dix
// lignes au lieu de cent.

function outils(poser) {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) set(x, y, z, id);
      }
    }
  };
  // Une salle : quatre murs, un plancher, un plafond, et du vide dedans. C'est
  // l'inverse d'un bloc plein — et c'est ce qui fait qu'on peut y entrer.
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
  // Une colonnade : un fût tous les deux blocs, chapiteau compris.
  const colonnade = (x0, x1, z0, z1, y0, y1, id, pas = 2) => {
    const long = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const n = long ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    for (let i = 0; i <= n; i += pas) {
      const x = long ? Math.min(x0, x1) + i : x0;
      const z = long ? z0 : Math.min(z0, z1) + i;
      for (let y = y0; y <= y1; y++) set(x, y, z, id);
      set(x, y1 + 1, z, id);                    // le chapiteau
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
  // Une coupole : une calotte sphérique creuse. `plein` la remplit.
  const dome = (xc, y0, zc, r, id, plein = false) => {
    for (let dy = 0; dy <= r; dy++) {
      const rr = Math.sqrt(Math.max(0, r * r - dy * dy));
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          const d = Math.hypot(dx, dz);
          if (plein ? d <= rr : Math.abs(d - rr) < 0.75) set(xc + dx, y0 + dy, zc + dz, id);
        }
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
  return { set, bloc, salle, colonnade, fronton, dome, tambour };
}

// --- LE CAPITOLE ---------------------------------------------------------------
//
// Le dôme entre deux ailes basses, et rien d'autre ne ressemble à ça. Les deux
// ailes ne sont pas décoratives : celle du nord est le Sénat, celle du sud la
// Chambre des représentants, et le dôme est au milieu parce qu'il ne doit
// appartenir à aucune des deux.
//
// Dedans : **la Rotonde**, la salle ronde sous la coupole, quatre-vingts pieds
// de large et cent quatre-vingts de haut. On y entre par la façade ouest, celle
// qui regarde le Mall — et de l'intérieur, on voit toute la coupole au-dessus
// de soi, parce qu'elle est creuse pour de vrai.
export function buildCapitole(poser) {
  const { set, bloc, salle, colonnade, fronton, dome, tambour } = outils(poser);

  // la terrasse et son emmarchement, côté Mall
  bloc(-8, 8, 0, 1, -10, 10, MARBRE);
  for (let m = 0; m < 2; m++) {
    for (let z = -5; z <= 5; z++) set(-9 - m, 1 - m, z, MARBRE);
  }

  // les deux ailes : le Sénat au nord, la Chambre au sud
  for (const s of [-1, 1]) {
    salle(-7, 7, 2, 8, s * 10, s * 7, MARBRE, MARBRE, MARBRE);
    for (let x = -6; x <= 6; x++) {
      for (let y = 3; y <= 7; y += 2) { set(x, y, s * 10, ((x & 1) ? VERRE : MARBRE)); }
    }
    // le portique à colonnes et son fronton, au bout de chaque aile
    colonnade(-5, 5, s * 11, s * 11, 2, 8, MARBRE);
    fronton(0, 9, s * 11, 6, MARBRE);
    // une porte par aile
    set(0, 2, s * 10, BLOCK.AIR); set(0, 3, s * 10, BLOCK.AIR);
    set(1, 2, s * 10, BLOCK.AIR); set(1, 3, s * 10, BLOCK.AIR);
  }

  // LE CORPS CENTRAL, ET LA ROTONDE À L'INTÉRIEUR.
  // Les murs montent à douze ; le vide, lui, monte bien plus haut — jusque
  // sous la clef de la coupole. C'est ce vide-là qu'on vient voir.
  salle(-6, 6, 2, 12, -7, 7, MARBRE, MARBRE, BLOCK.AIR);
  bloc(-5, 5, 2, 12, -6, 6, BLOCK.AIR);
  bloc(-5, 5, 1, 1, -6, 6, DALLE);                 // le sol de la Rotonde
  // Huit colonnes en couronne dans la salle, et les tableaux entre elles. La
  // couronne est tournée d'un huitième de tour : sans cela une colonne tombait
  // pile dans l'axe de la porte, et l'enfant qui entrait butait dessus.
  for (let a = 0; a < 8; a++) {
    const ang = ((a + 0.5) / 8) * Math.PI * 2;
    const x = Math.round(Math.cos(ang) * 4), z = Math.round(Math.sin(ang) * 4.5);
    for (let y = 2; y <= 8; y++) set(x, y, z, MARBRE);
    set(x, 9, z, OR);
  }
  set(0, 2, 0, LAMPE);
  set(3, 2, 3, BANC); set(-3, 2, -3, BANC);

  // la porte d'honneur, façade ouest, face au Mall
  for (let z = -1; z <= 1; z++) for (let y = 2; y <= 4; y++) set(-6, y, z, BLOCK.AIR);
  // Le portique ouest : huit colonnes et le fronton. L'entrecolonnement du
  // MILIEU est laissé libre — c'est la règle de tout portique antique, et ici
  // c'est aussi ce qui permet d'entrer : avec une colonne pile devant la
  // porte, on butait dessus au lieu de la franchir.
  colonnade(-7, -7, -6, 6, 2, 9, MARBRE);
  for (let y = 2; y <= 10; y++) set(-7, y, 0, BLOCK.AIR);
  fronton(-7, 10, 0, 6, MARBRE, false);

  // LE DÔME. Un tambour à colonnes, une calotte, une lanterne, et la statue de
  // la Liberté au sommet — celle-là est une femme casquée, pas la New-Yorkaise.
  tambour(0, 13, 19, 0, 5, MARBRE);
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    const x = Math.round(Math.cos(ang) * 6), z = Math.round(Math.sin(ang) * 6);
    for (let y = 13; y <= 18; y++) set(x, y, z, MARBRE);
    set(x, 19, z, MARBRE);
  }
  bloc(-5, 5, 13, 19, -5, 5, BLOCK.AIR);           // le tambour reste creux
  dome(0, 20, 0, 5, MARBRE);                        // la calotte, creuse elle aussi
  tambour(0, 26, 28, 0, 2, MARBRE, VERRE);
  set(0, 29, 0, MARBRE);
  set(0, 30, 0, BRONZE); set(0, 31, 0, BRONZE);     // la statue de la Liberté
  set(1, 31, 0, BRONZE); set(-1, 31, 0, BRONZE);
  set(0, 32, 0, OR);
}

// --- LE MONUMENT DE WASHINGTON --------------------------------------------------
//
// La plus haute maçonnerie du monde, et le détail que personne ne remarque
// avant qu'on le lui montre : **la couleur change au quart de la hauteur**. Les
// travaux se sont arrêtés vingt-trois ans, faute d'argent et à cause de la
// guerre de Sécession ; quand ils ont repris, la carrière du début était
// épuisée. La ligne est restée.
//
// Dedans, un escalier en colimaçon monte jusqu'aux fenêtres du sommet. Le vrai
// en compte huit cent quatre-vingt-dix-sept marches ; ici cinquante-deux, et la
// vue sur tout le Mall à l'arrivée.
export function buildObelisque(poser) {
  const { set, bloc } = outils(poser);
  const H = 62;
  const CHANGEMENT = 16;      // la ligne de teinte, au quart de la hauteur

  for (let y = 0; y < H; y++) {
    // le fût s'affine très légèrement en montant, comme le vrai
    const demi = y < H - 8 ? (y < 30 ? 3 : 2) : 2;
    const teinte = y < CHANGEMENT ? MARBRE_2 : MARBRE;
    for (let dx = -demi; dx <= demi; dx++) {
      for (let dz = -demi; dz <= demi; dz++) {
        const bord = Math.abs(dx) === demi || Math.abs(dz) === demi;
        if (bord) set(dx, y, dz, teinte);
        else if (y === 0) set(dx, y, dz, DALLE);
      }
    }
  }
  // LE COLIMAÇON. Une marche tous les blocs, en tournant autour du fût : c'est
  // le seul moyen de monter cinquante blocs dans une cage de cinq de côté.
  const anneau = [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [2, -1], [2, 0], [2, 1],
    [2, 2], [1, 2], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-2, -1]];
  for (let y = 1; y < H - 9; y++) {
    const [dx, dz] = anneau[y % anneau.length];
    set(dx, y, dz, DALLE);
    // le palier : sans lui, on ne peut pas se retourner en montant
    if (y % 16 === 0) for (const [ax, az] of anneau) set(ax, y, az, DALLE);
  }
  // la porte, plein est, face au Capitole
  for (let y = 1; y <= 3; y++) { set(3, y, 0, BLOCK.AIR); set(3, y, 1, BLOCK.AIR); }
  // les huit fenêtres du sommet : deux par face, juste sous la pointe
  for (const [dx, dz] of [[3, -1], [3, 1], [-3, -1], [-3, 1], [-1, 3], [1, 3], [-1, -3], [1, -3]]) {
    const x = Math.abs(dx) === 3 ? Math.sign(dx) * 2 : dx;
    const z = Math.abs(dz) === 3 ? Math.sign(dz) * 2 : dz;
    set(x, H - 11, z, VERRE);
    set(x, H - 10, z, VERRE);
  }
  bloc(-1, 1, H - 12, H - 10, -1, 1, BLOCK.AIR);   // la salle du sommet
  bloc(-1, 1, H - 13, H - 13, -1, 1, DALLE);
  // le pyramidion : quatre pans qui se rejoignent en pointe
  for (let k = 0; k < 8; k++) {
    const demi = Math.max(0, 2 - Math.floor(k / 2.2));
    for (let dx = -demi; dx <= demi; dx++) {
      for (let dz = -demi; dz <= demi; dz++) set(dx, H - 8 + k, dz, MARBRE);
    }
  }
  set(0, H + 1, 0, OR);       // la pointe d'aluminium, qui valait l'argent en 1884
  // les cinquante drapeaux, en cercle autour du tertre
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    const x = Math.round(Math.cos(ang) * 4), z = Math.round(Math.sin(ang) * 4);
    for (let y = 0; y <= 3; y++) set(x, y, z, MARBRE);
    set(x, 4, z, a % 3 === 0 ? ROUGE : (a % 3 === 1 ? MARBRE : uni(10)));
  }
}

// --- LE LINCOLN MEMORIAL --------------------------------------------------------
//
// Un temple grec au bout du Mall, avec **trente-six colonnes** — le nombre
// d'États que comptait l'Union à la mort de Lincoln. Dedans, la statue assise,
// six mètres de haut, et le discours de Gettysburg gravé sur le mur.
//
// C'est aussi de ces marches-là que Martin Luther King a dit « I have a
// dream », en 1963, devant deux cent cinquante mille personnes.
export function buildLincoln(poser) {
  const { set, bloc, salle, colonnade } = outils(poser);

  // le podium ; l'emmarchement regarde l'EST — celui de « I have a dream »,
  // face au miroir d'eau et, tout au bout, au Capitole. L'est, ici, c'est +x.
  bloc(-5, 6, 0, 2, -5, 5, MARBRE);
  for (let m = 0; m < 1; m++) {
    for (let z = -4; z <= 4; z++) set(7 + m, 2 - m, z, MARBRE);
  }
  // la chambre, creuse — c'est elle qu'on vient voir
  salle(-4, 5, 3, 9, -3, 3, MARBRE, DALLE, MARBRE);
  // la colonnade qui fait le tour : trente-six fûts, un par État de l'Union
  // à la mort de Lincoln
  colonnade(-5, 6, -4, -4, 3, 10, MARBRE);
  colonnade(-5, 6, 4, 4, 3, 10, MARBRE);
  colonnade(-5, -5, -4, 4, 3, 10, MARBRE);
  colonnade(6, 6, -4, 4, 3, 10, MARBRE);
  // l'entablement et l'attique, qui portent les noms des États
  bloc(-5, 6, 11, 11, -5, 5, MARBRE);
  bloc(-5, 6, 12, 13, -4, 4, MARBRE_2);
  bloc(-4, 5, 14, 14, -3, 3, ARDOISE);

  // la porte, plein est
  for (let z = -1; z <= 1; z++) for (let y = 3; y <= 5; y++) set(5, y, z, BLOCK.AIR);
  // LINCOLN ASSIS, dans son fauteuil, tourné vers le Mall
  set(0, 3, 0, MARBRE); set(1, 3, 0, MARBRE); set(-1, 3, 0, MARBRE);   // le siège
  set(0, 4, 0, MARBRE); set(0, 5, 0, MARBRE);                          // le buste
  set(1, 4, 0, MARBRE); set(-1, 4, 0, MARBRE);                         // les bras
  set(0, 6, 0, uni(19));                                               // la tête
  set(2, 3, 1, MARBRE); set(2, 3, -1, MARBRE);                         // les accoudoirs
  set(3, 3, 2, LAMPE); set(3, 3, -2, LAMPE);
  set(-3, 3, 2, MARBRE); set(-3, 3, -2, MARBRE);   // les stèles des deux discours
}

// --- LA MAISON-BLANCHE ----------------------------------------------------------
//
// Plus petite qu'on ne l'imagine : deux étages, une aile de chaque côté, et
// deux portiques. Celui du nord, à colonnes carrées, donne sur Pennsylvania
// Avenue ; celui du sud est arrondi — c'est ce demi-cercle qu'on voit sur les
// photos officielles, et c'est lui qui a donné sa forme au Bureau ovale.
export function buildMaisonBlanche(poser) {
  const { set, bloc, salle, colonnade, fronton } = outils(poser);

  bloc(-7, 7, 0, 0, -5, 5, MARBRE);                       // la terrasse
  salle(-5, 5, 1, 6, -4, 4, MARBRE, DALLE, MARBRE);       // le corps de logis
  bloc(-5, 5, 7, 7, -4, 4, MARBRE_2);                     // la balustrade du toit
  // les fenêtres à petits carreaux, deux rangs
  for (let x = -4; x <= 4; x++) {
    for (const y of [2, 5]) { if (x % 2 === 0) { set(x, y, -4, VERRE); set(x, y, 4, VERRE); } }
  }
  // le portique nord, à quatre colonnes, et son fronton
  colonnade(-2, 2, -6, -6, 1, 6, MARBRE);
  bloc(-3, 3, 7, 7, -6, -5, MARBRE);
  fronton(0, 8, -6, 3, MARBRE);
  for (let z = -6; z <= -4; z++) for (let y = 1; y <= 3; y++) set(0, y, z, BLOCK.AIR);
  set(1, 1, -4, BLOCK.AIR); set(1, 2, -4, BLOCK.AIR);      // la porte, deux blocs
  // le portique sud, arrondi : le fameux demi-cercle
  for (let a = 0; a <= 8; a++) {
    const ang = Math.PI * (a / 8);
    const x = Math.round(Math.cos(ang) * 3), z = 4 + Math.round(Math.sin(ang) * 2.4);
    for (let y = 1; y <= 6; y++) set(x, y, z, MARBRE);
    set(x, 7, z, MARBRE_2);
  }
  // les deux ailes basses : l'ouest où travaille le président, l'est pour les
  // visites. Le Bureau ovale est au bout de l'aile ouest, au rez-de-chaussée.
  bloc(-8, -6, 1, 3, -3, 2, MARBRE);
  bloc(6, 8, 1, 3, -3, 2, MARBRE);
  bloc(-8, -6, 4, 4, -3, 2, MARBRE_2);
  bloc(6, 8, 4, 4, -3, 2, MARBRE_2);
  bloc(-7, -7, 1, 2, -2, 1, BLOCK.AIR);
  bloc(7, 7, 1, 2, -2, 1, BLOCK.AIR);
  set(-7, 1, -3, BLOCK.AIR); set(-7, 2, -3, BLOCK.AIR);

  // dedans : le grand hall, un tapis rouge, un lustre et le Bureau ovale
  bloc(-4, 4, 1, 5, -3, 3, BLOCK.AIR);
  for (let z = -3; z <= 3; z++) set(0, 1, z, TAPIS);
  set(0, 5, 0, LAMPE);
  set(-3, 1, -2, TABLE); set(3, 1, 2, BANC);
  // la pelouse sud et sa fontaine
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = 5; dz <= 6; dz++) {
      set(dx, 0, dz, Math.hypot(dx, dz - 6) < 2.2 ? EAU : HERBE);
    }
  }
}

// --- LE MÉMORIAL JEFFERSON ------------------------------------------------------
//
// Une rotonde ouverte au bord du Tidal Basin, copiée du Panthéon de Rome —
// Jefferson était architecte autant que président, et c'est le bâtiment qu'il
// aimait le plus. Sa statue de bronze regarde la Maison-Blanche, à travers
// l'eau : les deux se voient en ligne droite, et ce n'est pas un hasard.
export function buildJefferson(poser) {
  const { set, bloc, colonnade, fronton, dome, tambour } = outils(poser);

  bloc(-6, 6, 0, 1, -6, 6, MARBRE);
  for (let m = 0; m < 1; m++) for (let x = -3; x <= 3; x++) set(x, 1 - m, -7 - m, MARBRE);
  // la couronne de colonnes : vingt-six fûts autour de la rotonde
  for (let a = 0; a < 22; a++) {
    const ang = (a / 22) * Math.PI * 2;
    const x = Math.round(Math.cos(ang) * 5), z = Math.round(Math.sin(ang) * 5);
    for (let y = 2; y <= 9; y++) set(x, y, z, MARBRE);
    set(x, 10, z, MARBRE);
  }
  tambour(0, 2, 10, 0, 3, MARBRE);
  bloc(-2, 2, 2, 10, -2, 2, BLOCK.AIR);
  bloc(-2, 2, 1, 1, -2, 2, DALLE);
  dome(0, 11, 0, 4, MARBRE);
  // le portique nord, vers le bassin, et sa porte
  colonnade(-2, 2, -6, -6, 2, 9, MARBRE);
  fronton(0, 11, -6, 3, MARBRE);
  for (let y = 2; y <= 4; y++) { set(0, y, -3, BLOCK.AIR); set(1, y, -3, BLOCK.AIR); }
  // JEFFERSON DEBOUT, en bronze, au centre
  set(0, 2, 0, BRONZE); set(0, 3, 0, BRONZE); set(0, 4, 0, BRONZE);
  set(0, 5, 0, uni(19));
  set(1, 3, 0, BRONZE); set(-1, 3, 0, BRONZE);
  set(0, 1, 0, GRANIT);
  set(-2, 2, 2, LAMPE); set(2, 2, -2, LAMPE);
}

// --- UNION STATION ---------------------------------------------------------------
//
// La gare de la capitale, et la plus grande salle publique de la ville : trois
// arcs monumentaux en façade, et derrière eux un hall voûté à caissons dorés où
// l'on entre vraiment. Les trains sont derrière ; devant, la fontaine de
// Colomb et l'esplanade.
export function buildUnionStation(poser) {
  const { set, bloc, salle, colonnade } = outils(poser);

  bloc(-7, 7, 0, 0, -4, 4, DALLE);
  salle(-7, 7, 1, 8, -3, 3, MARBRE_2, DALLE, MARBRE_2);
  // les trois grands arcs de la façade sud, vers le Capitole
  for (const cx of [-4, 0, 4]) {
    for (let dx = -1; dx <= 1; dx++) {
      const haut = 4 - Math.abs(dx);
      for (let y = 1; y <= haut; y++) set(cx + dx, y, 3, BLOCK.AIR);
      set(cx + dx, haut + 1, 3, GRANIT);
    }
  }
  colonnade(-6, 6, 5, 5, 1, 7, MARBRE_2, 4);
  bloc(-8, 8, 9, 9, -4, 4, MARBRE_2);
  bloc(-7, 7, 10, 10, -3, 3, CUIVRE);            // la toiture de cuivre
  // le hall voûté, à caissons : c'est le plafond qu'on vient voir
  bloc(-6, 6, 1, 7, -2, 2, BLOCK.AIR);
  for (let x = -6; x <= 6; x++) {
    for (let z = -2; z <= 2; z++) {
      set(x, 8, z, ((Math.floor(x / 2) + Math.floor(z / 2)) & 1) === 0 ? OR : MARBRE_2);
    }
  }
  for (let x = -4; x <= 4; x += 4) set(x, 1, 0, BANC);
  set(0, 7, 0, LAMPE); set(-5, 7, 0, LAMPE); set(5, 7, 0, LAMPE);
  // les quais et les rails, derrière la gare
  for (let x = -6; x <= 6; x++) {
    for (const z of [-6, -8]) { set(x, 0, z, ACIER); set(x, 0, z + 1, GRANIT); }
  }
  // la fontaine de Colomb, sur le parvis
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = 5; dz <= 8; dz++) set(dx, 0, dz, Math.hypot(dx, dz - 7) < 2.2 ? EAU : DALLE);
  }
  set(0, 1, 7, MARBRE); set(0, 2, 7, MARBRE); set(0, 3, 7, MARBRE_2);
}

// --- LA CATHÉDRALE NATIONALE ------------------------------------------------------
//
// Gothique, et bâtie au vingtième siècle : commencée en 1907, finie en 1990.
// Deux tours à l'ouest, une tour centrale plus haute, des arcs-boutants — et
// sur les gargouilles, un Dark Vador sculpté en 1986 après un concours pour
// enfants. Elle couronne le point le plus haut de Washington.
export function buildCathedrale(poser) {
  const { set, bloc, salle, dome } = outils(poser);

  // la nef, longue et étroite, orientée est-ouest comme toute cathédrale
  salle(-4, 4, 1, 12, -9, 9, CALCAIRE, DALLE, CALCAIRE);
  bloc(-3, 3, 1, 12, -8, 8, BLOCK.AIR);
  bloc(-3, 3, 0, 0, -8, 8, DALLE);
  // le transept, qui fait la croix
  salle(-9, 9, 1, 10, -3, 3, CALCAIRE, DALLE, CALCAIRE);
  bloc(-8, 8, 1, 10, -2, 2, BLOCK.AIR);
  // les vitraux : trois rangs, et la grande rose à l'ouest
  for (let z = -7; z <= 7; z += 3) {
    for (const y of [5, 8]) { set(-4, y, z, VERRE_BLEU); set(4, y, z, VERRE_BLEU); }
  }
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      if (Math.hypot(dx, dy) < 2.4) set(dx, 9 + dy, -9, VERRE_BLEU);
    }
  }
  // les arcs-boutants, qui reprennent la poussée de la voûte
  for (let z = -6; z <= 6; z += 4) {
    for (const s of [-1, 1]) {
      for (let k = 0; k <= 2; k++) set(s * (5 + k), 9 - k * 2, z, CALCAIRE);
      set(s * 7, 1, z, CALCAIRE); set(s * 7, 2, z, CALCAIRE); set(s * 7, 3, z, CALCAIRE);
    }
  }
  // les deux tours de la façade ouest
  for (const s of [-1, 1]) {
    for (let y = 1; y <= 22; y++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) === 2 || Math.abs(dz) === 2) set(s * 5 + dx, y, -10 + dz, CALCAIRE);
        }
      }
    }
    for (let k = 0; k <= 3; k++) {
      const d = 2 - Math.floor(k / 1.4);
      for (let dx = -d; dx <= d; dx++) for (let dz = -d; dz <= d; dz++) set(s * 5 + dx, 23 + k, -10 + dz, ARDOISE);
    }
  }
  // la tour centrale, la plus haute : trente blocs
  for (let y = 11; y <= 28; y++) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        if (Math.abs(dx) === 3 || Math.abs(dz) === 3) set(dx, y, dz, CALCAIRE);
      }
    }
  }
  dome(0, 29, 0, 3, ARDOISE);
  set(0, 33, 0, OR);
  // le portail ouest
  for (let dx = -1; dx <= 1; dx++) for (let y = 1; y <= 4; y++) set(dx, y, -9, BLOCK.AIR);
  set(0, 1, 7, LAMPE); set(0, 1, -6, LAMPE);
  for (let z = -6; z <= 6; z += 4) { set(-2, 1, z, BANC); set(2, 1, z, BANC); }
}

// --- LE PENTAGONE -----------------------------------------------------------------
//
// Cinq côtés, cinq étages, cinq anneaux concentriques, et une cour au milieu.
// On peut aller de n'importe quel point à n'importe quel autre en sept minutes
// à pied, et c'est pour cela qu'il a cette forme-là : un carré aurait été plus
// long à traverser. Bâti en seize mois, pendant la guerre.
export function buildPentagone(poser) {
  const { set } = outils(poser);
  const R = 8;
  // Distance au bord d'un pentagone régulier : le maximum des cinq demi-plans.
  // C'est ce qui donne la forme, la cour et les couloirs d'un seul calcul.
  const dedans = (dx, dz, r) => {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      if (dx * Math.cos(a) + dz * Math.sin(a) > r) return false;
    }
    return true;
  };
  for (let dx = -R - 1; dx <= R + 1; dx++) {
    for (let dz = -R - 1; dz <= R + 1; dz++) {
      if (!dedans(dx, dz, R)) continue;
      set(dx, 0, dz, DALLE);
      // la cour centrale : cinq acres de pelouse, et le kiosque au milieu
      if (dedans(dx, dz, R - 6)) {
        set(dx, 0, dz, HERBE);
        if ((dx * 3 + dz * 5) % 7 === 0) set(dx, 1, dz, ARBRE);
        continue;
      }
      const mur = !dedans(dx, dz, R - 1) || dedans(dx, dz, R - 5);
      if (mur) {
        // la façade extérieure et la façade sur cour, percées de fenêtres
        for (let y = 1; y <= 5; y++) {
          const fen = y % 2 === 1 && ((dx + dz) & 1) === 0;
          set(dx, y, dz, fen ? VERRE : CALCAIRE);
        }
      } else {
        // l'intérieur : cinq anneaux de couloirs, et un refend tous les six
        // blocs pour que le bâtiment ne soit pas une seule halle vide
        const refend = ((dx * 7 + dz * 11) % 17 + 17) % 17 === 0;
        for (let y = 1; y <= 5; y++) set(dx, y, dz, refend ? CALCAIRE : BLOCK.AIR);
        if (!refend && ((dx + dz * 3) % 11 + 11) % 11 === 0) set(dx, 1, dz, LAMPE);
      }
      set(dx, 6, dz, GRANIT);        // la toiture
    }
  }
  // les cinq couloirs radiaux, qui traversent le bâtiment de part en part —
  // c'est eux qui font qu'on va d'un point à un autre en sept minutes
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2 + 0.35;
    for (let r = 1; r <= R; r++) {
      const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
      for (const d of [0, 1]) {
        for (let y = 1; y <= 3; y++) set(x + d, y, z, BLOCK.AIR);
        set(x + d, 0, z, DALLE);
      }
    }
  }
  // la grande entrée, plein nord
  for (let y = 1; y <= 3; y++) { set(0, y, -R, BLOCK.AIR); set(1, y, -R, BLOCK.AIR); }
  set(0, 1, 0, LAMPE);
}

// --- LES MUSÉES DU MALL ------------------------------------------------------------
//
// Onze musées du Smithsonian bordent la pelouse, et **tous sont gratuits** —
// c'est une particularité américaine qui vaut d'être dite à un enfant. Chacun a
// donc une porte et quelque chose dedans : un avion suspendu, un squelette de
// dinosaure, un tableau au mur.

// Le Château : le premier bâtiment du Smithsonian, et le seul en grès rouge du
// Mall. Neuf tours, aucune pareille — c'est un château pour de vrai.
export function buildChateauSmithsonian(poser) {
  const { set, bloc, salle } = outils(poser);
  salle(-4, 4, 1, 6, -3, 3, GRES_ROUGE, DALLE, GRES_ROUGE);
  bloc(-3, 3, 1, 6, -2, 2, BLOCK.AIR);
  bloc(-3, 3, 0, 0, -2, 2, DALLE);
  // les neuf tours, chacune à sa hauteur
  for (const [x, z, h] of [[0, 0, 15], [-3, -2, 10], [3, -2, 10], [-3, 2, 8], [3, 2, 8],
    [-1, -3, 9], [1, -3, 7], [-1, 3, 7], [1, 3, 9]]) {
    for (let y = 1; y <= h; y++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0 && y > 1) continue;
          set(x + dx, y, z + dz, GRES_ROUGE);
        }
      }
    }
    // les créneaux, puis la flèche
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if ((dx + dz) % 2 === 0) set(x + dx, h + 1, z + dz, GRES_ROUGE);
    }
    set(x, h + 2, z, ARDOISE);
  }
  for (let y = 1; y <= 3; y++) { set(0, y, -3, BLOCK.AIR); set(1, y, -3, BLOCK.AIR); }
  set(0, 1, 0, LAMPE); set(-2, 1, 1, BANC); set(2, 1, -1, BANC);

}

// Le musée de l'Air et de l'Espace : le plus visité du pays. Dedans, ce qui
// vole est ACCROCHÉ AU PLAFOND — le Spirit of St. Louis, le X-15, la capsule
// Apollo 11. Un enfant entre et lève la tête.
export function buildAirEspace(poser) {
  const { set, bloc, salle } = outils(poser);
  // quatre cubes de marbre séparés par trois nefs de verre : c'est la façade
  salle(-5, 5, 1, 9, -3, 3, MARBRE_2, DALLE, MARBRE_2);
  bloc(-4, 4, 1, 9, -2, 2, BLOCK.AIR);
  bloc(-4, 4, 0, 0, -2, 2, DALLE);
  // trois nefs de verre entre quatre massifs de marbre : c'est la façade
  for (const x of [-2, 0, 2]) {
    for (let y = 1; y <= 9; y++) { set(x, y, -3, VERRE); set(x, y, 3, VERRE); }
  }
  for (let x = -4; x <= 4; x++) for (let z = -2; z <= 2; z++) set(x, 10, z, VERRE);
  for (let y = 1; y <= 3; y++) { set(-1, y, 3, BLOCK.AIR); set(0, y, 3, BLOCK.AIR); }

  // CE QUI VOLE, SUSPENDU. Un avion à hélice, une fusée debout, une capsule.
  const avion = (cx, cz, y, teinte) => {
    for (let dx = -2; dx <= 2; dx++) set(cx + dx, y, cz, teinte);      // le fuselage
    for (let dz = -1; dz <= 1; dz++) set(cx, y, cz + dz, teinte);      // les ailes
    set(cx - 2, y + 1, cz, teinte); set(cx + 2, y, cz, ACIER);
  };
  avion(-2, 0, 8, MARBRE);                     // le Spirit of St. Louis
  avion(2, 1, 6, uni(26));                     // le X-15, noir
  for (let y = 1; y <= 6; y++) set(0, y, -1, y > 4 ? ROUGE : MARBRE);
  set(0, 7, -1, ROUGE);                        // la fusée
  set(3, 1, 1, ACIER); set(3, 2, 1, uni(22));  // la capsule Apollo
  set(-3, 1, 0, LAMPE); set(3, 1, 0, LAMPE); set(-2, 1, 2, BANC);
}

// Le musée d'Histoire naturelle : une coupole verte, et sous elle l'éléphant
// d'Afrique. Plus loin, le diplodocus — un squelette de vingt-cinq mètres.
export function buildHistoireNaturelle(poser) {
  const { set, bloc, salle, colonnade, fronton, dome, tambour } = outils(poser);
  salle(-4, 4, 1, 8, -3, 3, MARBRE_2, DALLE, MARBRE_2);
  bloc(-3, 3, 1, 8, -2, 2, BLOCK.AIR);
  bloc(-3, 3, 0, 0, -2, 2, DALLE);
  tambour(0, 9, 11, 0, 3, MARBRE_2, VERRE);
  bloc(-2, 2, 9, 11, -2, 2, BLOCK.AIR);
  dome(0, 12, 0, 3, CUIVRE);
  colonnade(-2, 2, 4, 4, 1, 8, MARBRE_2);
  fronton(0, 10, 4, 3, MARBRE_2);
  for (let y = 1; y <= 3; y++) { set(0, y, 3, BLOCK.AIR); set(1, y, 3, BLOCK.AIR); }
  // l'éléphant sous la coupole
  bloc(-1, 1, 1, 2, -1, 1, uni(24));
  set(0, 3, 0, uni(24)); set(0, 2, -2, uni(24));
  // le diplodocus : la queue, le dos, puis le cou qui se relève
  for (let x = -3; x <= 2; x++) set(x, 3, -2, MARBRE);
  for (let k = 1; k <= 3; k++) set(2 + Math.min(1, k), 3 + k, -2, MARBRE);
  for (let x = -2; x <= 1; x += 3) { set(x, 1, -2, MARBRE); set(x, 2, -2, MARBRE); }
  set(0, 8, 0, LAMPE); set(2, 1, 1, BANC);
}

// La Galerie nationale d'art : une coupole de plus, un péristyle, et des
// tableaux au mur. Le bâtiment de marbre rose du Tennessee le plus grand du
// monde à son ouverture.
export function buildGalerieArt(poser) {
  const { set, bloc, salle, colonnade, fronton, dome, tambour } = outils(poser);
  salle(-4, 4, 1, 7, -3, 3, MARBRE_2, DALLE, MARBRE_2);
  bloc(-3, 3, 1, 7, -2, 2, BLOCK.AIR);
  bloc(-3, 3, 0, 0, -2, 2, DALLE);
  tambour(0, 8, 10, 0, 3, MARBRE_2);
  bloc(-2, 2, 8, 10, -2, 2, BLOCK.AIR);
  dome(0, 11, 0, 3, MARBRE);
  colonnade(-2, 2, 4, 4, 1, 7, MARBRE_2);
  fronton(0, 9, 4, 3, MARBRE_2);
  for (let y = 1; y <= 3; y++) { set(0, y, 3, BLOCK.AIR); set(1, y, 3, BLOCK.AIR); }
  // les tableaux, accrochés aux murs : chacun sa couleur
  const teintes = [ROUGE, uni(10), VERT, JAUNE, uni(12), uni(16)];
  for (let k = 0; k < 6; k++) {
    const x = -3 + (k % 3) * 3, z = k < 3 ? -2 : 2;
    set(x, 4, z, teintes[k]); set(x + 1, 4, z, teintes[k]);
    set(x, 3, z, uni(18)); set(x + 1, 3, z, uni(18));
  }
  set(0, 1, 0, BANC); set(-2, 1, 1, BANC); set(2, 1, 1, BANC);
  set(0, 7, 0, LAMPE);
}

// Le musée afro-américain : le plus récent du Mall, et le seul qui ne soit pas
// blanc. Trois couronnes de bronze qui s'évasent en montant — la forme vient
// d'une couronne yoruba, et la résille des balcons de fer forgé de
// La Nouvelle-Orléans, ouvragés par des esclaves.
export function buildAfroAmericain(poser) {
  const { set, bloc, salle } = outils(poser);
  salle(-4, 4, 1, 3, -3, 3, GRANIT, DALLE, GRANIT);
  bloc(-3, 3, 1, 3, -2, 2, BLOCK.AIR);
  bloc(-3, 3, 0, 0, -2, 2, DALLE);
  for (let y = 1; y <= 3; y++) { set(0, y, -3, BLOCK.AIR); set(1, y, -3, BLOCK.AIR); }
  // les trois couronnes : chacune plus large que celle du dessous
  for (let k = 0; k < 3; k++) {
    const dx = 3 + k, dz = 2 + k, y0 = 4 + k * 3;
    for (let y = y0; y < y0 + 3; y++) {
      for (let x = -dx; x <= dx; x++) {
        for (let z = -dz; z <= dz; z++) {
          if (Math.abs(x) !== dx && Math.abs(z) !== dz) continue;
          // la résille : un plein, un vide, comme une dentelle de fonte
          set(x, y, z, ((x + z + y) & 1) === 0 ? BRONZE : VERRE);
        }
      }
    }
  }
  bloc(-5, 5, 13, 13, -4, 4, BRONZE);
  bloc(-4, 4, 4, 12, -3, 3, BLOCK.AIR);
  set(0, 4, 0, LAMPE); set(-2, 1, 1, BANC); set(2, 1, -1, BANC);
}

// Les Archives nationales : la Déclaration d'indépendance, la Constitution et
// la Charte des droits sont là, sous verre, dans la rotonde. Sur le fronton :
// « Ce qui est passé est prologue ».
export function buildArchives(poser) {
  const { set, bloc, salle, colonnade, fronton } = outils(poser);
  salle(-4, 4, 1, 8, -3, 3, MARBRE_2, DALLE, MARBRE_2);
  bloc(-3, 3, 1, 8, -2, 2, BLOCK.AIR);
  bloc(-3, 3, 0, 0, -2, 2, DALLE);
  colonnade(-3, 3, -4, -4, 1, 9, MARBRE_2);
  fronton(0, 11, -4, 4, MARBRE_2);
  bloc(-4, 4, 10, 10, -4, 4, MARBRE_2);
  for (let y = 1; y <= 3; y++) { set(0, y, -3, BLOCK.AIR); set(1, y, -3, BLOCK.AIR); }
  // les trois documents, sous vitrine, au fond de la rotonde
  for (const x of [-2, 0, 2]) {
    set(x, 1, 3, GRANIT); set(x, 2, 3, VERRE);
  }
  set(0, 8, 0, LAMPE);
}

// --- LES MÉMORIAUX -----------------------------------------------------------------

// Le mémorial de la Seconde Guerre mondiale : une ellipse, deux arcs — le
// Pacifique et l'Atlantique — et cinquante-six piliers, un par État et
// territoire. Au fond, quatre mille étoiles d'or : une pour quatre cents morts.
export function buildMemorialGuerre(poser) {
  const { set, bloc } = outils(poser);
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      const e = (dx / 3) ** 2 + (dz / 4) ** 2;
      if (e > 1.15) continue;
      set(dx, 0, dz, e < 0.5 ? EAU : DALLE);
    }
  }
  // les piliers, en couronne : un par État et territoire
  for (let a = 0; a < 14; a++) {
    const ang = (a / 14) * Math.PI * 2;
    const x = Math.round(Math.cos(ang) * 2), z = Math.round(Math.sin(ang) * 3);
    for (let y = 1; y <= 4; y++) set(x, y, z, MARBRE_2);
    set(x, 5, z, uni(22));
  }
  // les deux arcs, le Pacifique au nord et l'Atlantique au sud
  for (const s of [-1, 1]) {
    for (let dx = -2; dx <= 2; dx++) {
      const h = 7 - Math.abs(dx);
      for (let y = 1; y <= h; y++) if (Math.abs(dx) === 2 || y > h - 2) set(dx, y, s * 4, MARBRE_2);
    }
    set(0, 8, s * 4, uni(22));
  }
  set(0, 1, 0, EAU);
}

// Le mémorial du Vietnam : deux murs de granit noir poli enfoncés dans la
// pelouse, qui se rejoignent en V. Cinquante-huit mille noms, dans l'ordre des
// morts. On descend le long du mur, il grandit à mesure — et on s'y voit,
// parce que le granit est un miroir. C'est Maya Lin qui l'a dessiné : elle
// avait vingt et un ans, et c'était un devoir d'étudiante.
export function buildVietnam(poser) {
  const { set } = outils(poser);
  for (const s of [-1, 1]) {
    for (let k = 0; k <= 4; k++) {
      const x = s * k, z = Math.round(k * 0.7);
      // la pelouse se creuse, le mur monte : au sommet du V il fait trois blocs
      const h = 3 - Math.floor(k / 3.5);
      for (let y = 0; y > -h; y--) set(x, y + 2, z, GRANIT_NOIR);
      for (let y = 0; y <= 2; y++) set(x, y - 1, z + 1, DALLE);       // l'allée qui descend
      for (let dz = 2; dz <= 3; dz++) set(x, 2, z + dz, HERBE);
    }
  }
  for (let dx = -4; dx <= 4; dx++) { set(dx, 2, -1, HERBE); set(dx, 2, -2, HERBE); }
}

// Le mémorial de la guerre de Corée : dix-neuf soldats de bronze qui traversent
// un champ, en poncho, en ordre dispersé. Reflétés dans le mur, ils font
// trente-huit — le 38e parallèle.
export function buildCoree(poser) {
  const { set } = outils(poser);
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      if (Math.abs(dx) + Math.abs(dz * 1.3) > 5) continue;
      set(dx, 0, dz, ((dx + dz) & 3) === 0 ? DALLE : HERBE);
    }
  }
  const pas = [[-2, 1], [-2, -1], [-1, 2], [-1, 0], [0, -2], [0, 1], [1, -1], [2, 2], [2, 0]];
  for (const [x, z] of pas) {
    set(x, 1, z, uni(21)); set(x, 2, z, uni(21)); set(x, 3, z, uni(19));
  }
  for (let dz = -2; dz <= 2; dz++) { set(3, 1, dz, GRANIT_NOIR); set(3, 2, dz, GRANIT_NOIR); }
}

// Le mémorial Martin Luther King : un bloc de granit poussé HORS d'une
// montagne fendue, et King qui s'en dégage, les bras croisés. La phrase du
// discours : « De la montagne du désespoir, une pierre d'espérance. »
export function buildMLK(poser) {
  const { set, bloc } = outils(poser);
  // la montagne du désespoir, fendue en deux
  for (const s of [-1, 1]) {
    bloc(s * 2, s * 3, 1, 5, -2, 2, GRANIT);
  }
  // la pierre d'espérance, avancée de quatre blocs
  bloc(-1, 1, 1, 6, -3, 0, GRANIT);
  set(0, 7, -2, GRANIT);
  set(0, 4, -3, uni(19));            // le visage
  set(-1, 3, -3, GRANIT); set(1, 3, -3, GRANIT);   // les bras croisés
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    set(dx, 0, dz, ((dx + dz) & 1) === 0 ? DALLE : HERBE);
  }
}

// La tombe du Soldat inconnu, au cimetière d'Arlington : un sarcophage de
// marbre du Colorado, veillé nuit et jour depuis 1937, par tous les temps. La
// relève de la garde se fait au pas compté.
export function buildSoldatInconnu(poser) {
  const { set, bloc } = outils(poser);
  bloc(-6, 6, 0, 0, -5, 5, DALLE);
  for (let m = 0; m < 3; m++) for (let x = -5; x <= 5; x++) set(x, m, 5 - m, MARBRE);
  bloc(-2, 2, 1, 3, -1, 1, MARBRE);           // le sarcophage
  set(0, 4, 0, MARBRE_2);
  // l'amphithéâtre de marbre, derrière
  for (let a = 0; a < 20; a++) {
    const ang = Math.PI * (a / 19) - Math.PI / 2;
    const x = Math.round(Math.cos(ang) * 8), z = -4 + Math.round(Math.sin(ang) * 5);
    for (let y = 1; y <= 5; y++) set(x, y, z, MARBRE);
    set(x, 6, z, MARBRE_2);
  }
  set(3, 1, 2, uni(21)); set(3, 2, 2, uni(21)); set(3, 3, 2, uni(19));   // la sentinelle
}

// --- LES AUTRES ---------------------------------------------------------------------

// La Cour suprême : « Égale justice devant la loi » sur le fronton, seize
// colonnes, et un escalier de quarante-quatre marches. Le plus petit des trois
// pouvoirs, et le seul dont on ne connaît pas les visages.
export function buildCourSupreme(poser) {
  const { set, bloc, salle, colonnade, fronton } = outils(poser);
  bloc(-4, 4, 0, 1, -4, 4, MARBRE);
  for (let m = 0; m < 1; m++) for (let z = -3; z <= 3; z++) set(-5 - m, 1 - m, z, MARBRE);
  salle(-3, 3, 2, 7, -3, 3, MARBRE, DALLE, MARBRE);
  bloc(-2, 2, 2, 7, -2, 2, BLOCK.AIR);
  bloc(-2, 2, 1, 1, -2, 2, DALLE);
  colonnade(-4, -4, -3, 3, 2, 8, MARBRE);
  fronton(-4, 10, 0, 4, MARBRE, false);
  bloc(-4, 4, 8, 8, -4, 4, MARBRE);
  for (let z = -1; z <= 1; z++) for (let y = 2; y <= 4; y++) set(-3, y, z, BLOCK.AIR);
  set(0, 2, 1, TABLE); set(-1, 2, 0, BANC); set(1, 2, 0, BANC);
  set(0, 7, 0, LAMPE);
}

// La Bibliothèque du Congrès : la plus grande bibliothèque du monde, et sa
// coupole de cuivre couverte à l'or fin. Dedans, la salle de lecture ronde,
// des rayonnages sur tout le pourtour, et une table par lecteur.
export function buildBibliotheque(poser) {
  const { set, bloc, salle, dome, tambour } = outils(poser);
  salle(-5, 5, 1, 7, -4, 4, MARBRE_2, DALLE, MARBRE_2);
  bloc(-4, 4, 1, 7, -3, 3, BLOCK.AIR);
  bloc(-4, 4, 0, 0, -3, 3, DALLE);
  tambour(0, 8, 11, 0, 3, MARBRE_2, VERRE);
  bloc(-2, 2, 8, 11, -2, 2, BLOCK.AIR);
  dome(0, 12, 0, 3, CUIVRE);
  set(0, 16, 0, OR);
  for (let y = 1; y <= 3; y++) { set(-5, y, 0, BLOCK.AIR); set(-5, y, 1, BLOCK.AIR); }
  // la salle de lecture : les rayonnages tout autour, les tables en couronne
  for (let x = -4; x <= 4; x++) {
    for (const z of [-3, 3]) { set(x, 2, z, BLOCK.BOOKSHELF); set(x, 3, z, BLOCK.BOOKSHELF); }
  }
  for (const [x, z] of [[-2, -1], [2, -1], [-2, 1], [2, 1], [0, 0]]) {
    set(x, 1, z, TABLE);
  }
  set(0, 7, 0, LAMPE);
}

// Le Trésor : la plus longue colonnade de la ville, tout contre la
// Maison-Blanche. C'est ce bâtiment-là qui est au dos du billet de dix dollars.
export function buildTresor(poser) {
  const { set, bloc, salle, colonnade } = outils(poser);
  salle(-3, 3, 1, 7, -5, 5, MARBRE_2, DALLE, MARBRE_2);
  bloc(-2, 2, 1, 7, -4, 4, BLOCK.AIR);
  bloc(-2, 2, 0, 0, -4, 4, DALLE);
  colonnade(-4, -4, -5, 5, 1, 8, MARBRE_2);
  bloc(-4, 3, 9, 9, -6, 6, MARBRE_2);
  for (let y = 1; y <= 3; y++) { set(-3, y, 0, BLOCK.AIR); set(-3, y, 1, BLOCK.AIR); }
  set(0, 1, 0, LAMPE); set(0, 1, -3, TABLE); set(0, 1, 3, TABLE);
}

// Le Kennedy Center : une longue boîte de marbre blanc au bord du Potomac,
// portée par une colonnade de piliers de bronze. Trois salles côte à côte, et
// une terrasse d'où l'on voit le fleuve.
export function buildKennedyCenter(poser) {
  const { set, bloc, salle } = outils(poser);
  salle(-3, 3, 1, 9, -7, 7, MARBRE, DALLE, MARBRE);
  bloc(-2, 2, 1, 9, -6, 6, BLOCK.AIR);
  bloc(-2, 2, 0, 0, -6, 6, DALLE);
  for (const s of [-1, 1]) {
    for (let z = -7; z <= 7; z += 2) {
      for (let y = 1; y <= 9; y++) set(s * 4, y, z, BRONZE);
    }
  }
  bloc(-4, 4, 10, 10, -8, 8, MARBRE);
  for (let y = 1; y <= 3; y++) { set(-3, y, 0, BLOCK.AIR); set(-3, y, 1, BLOCK.AIR); }
  // les trois salles : un tapis rouge par salle, et le lustre
  for (const z of [-4, 0, 4]) {
    for (let x = -1; x <= 1; x++) set(x, 1, z, TAPIS);
    set(0, 8, z, LAMPE);
    set(-1, 1, z + 1, BANC); set(1, 1, z + 1, BANC);
  }
}

// L'université de Georgetown : Healy Hall, sa flèche d'horloge, et la plus
// vieille université catholique du pays — fondée en 1789, l'année de la
// Constitution.
export function buildGeorgetownU(poser) {
  const { set, bloc, salle } = outils(poser);
  salle(-8, 8, 1, 8, -4, 4, GRES_ROUGE, DALLE, GRES_ROUGE);
  bloc(-7, 7, 1, 8, -3, 3, BLOCK.AIR);
  bloc(-7, 7, 0, 0, -3, 3, DALLE);
  bloc(-8, 8, 9, 9, -4, 4, ARDOISE);
  for (let x = -7; x <= 7; x += 2) for (const y of [3, 6]) { set(x, y, -4, VERRE); set(x, y, 4, VERRE); }
  // la tour de l'horloge, au milieu de la façade
  for (let y = 1; y <= 18; y++) {
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) === 2 || Math.abs(dz) === 2) set(dx, y, dz - 5, GRES_ROUGE);
    }
  }
  set(0, 15, -7, OR); set(0, 15, -3, OR);        // les cadrans
  for (let k = 0; k <= 5; k++) {
    const d = Math.max(0, 2 - Math.floor(k / 1.6));
    for (let dx = -d; dx <= d; dx++) for (let dz = -d; dz <= d; dz++) set(dx, 19 + k, dz - 5, ARDOISE);
  }
  for (let y = 1; y <= 3; y++) { set(0, y, -7, BLOCK.AIR); set(1, y, -7, BLOCK.AIR); }
  set(0, 1, 0, LAMPE); set(-4, 1, 0, BANC); set(4, 1, 0, BANC);
}

// L'arche de l'Amitié, à Chinatown : sept toits de tuiles vernissées au-dessus
// de la rue H, deux cent soixante-douze dragons peints, et le plus grand
// portique chinois hors de Chine.
export function buildArcChinatown(poser) {
  const { set, bloc } = outils(poser);
  for (const s of [-1, 1]) {
    for (let y = 1; y <= 6; y++) { set(s * 3, y, 0, ROUGE); set(s * 3, y, 1, ROUGE); }
    set(s * 3, 0, 0, GRANIT); set(s * 3, 0, 1, GRANIT);
  }
  // les trois toits étagés, en tuiles vertes et jaunes
  for (let k = 0; k < 3; k++) {
    const demi = 4 - k, y = 7 + k * 2;
    for (let x = -demi; x <= demi; x++) {
      for (let z = -1; z <= 2; z++) set(x, y, z, k % 2 === 0 ? VERT : JAUNE);
      set(x, y + 1, 0, ROUGE); set(x, y + 1, 1, ROUGE);
    }
    set(-demi - 1, y + 1, 0, VERT); set(demi + 1, y + 1, 0, VERT);   // les retroussis
  }
  bloc(-2, 2, 7, 7, 0, 1, OR);
  for (const s of [-1, 1]) { set(s * 4, 12, 0, OR); set(s * 4, 12, 1, OR); }
}

// --- LES PONTS -----------------------------------------------------------------------
//
// Trois franchissements, et le même principe : des arcs de pierre et un tablier
// qui repose dessus. Le pont du Mémorial relie le Lincoln au cimetière
// d'Arlington — une ligne droite entre le président qui a sauvé l'Union et les
// tombes de ceux qui sont morts pour elle. Ce n'est pas de l'urbanisme, c'est
// une phrase.

function pontArcs(poser, portee, arcs, materiau, axeX) {
  const { set } = outils(poser);
  const demi = Math.floor((arcs * portee) / 2);
  for (let d = -demi; d <= demi; d++) {
    // la courbe de l'arc : creusée sous le tablier, entre deux piles
    const dansArc = ((d + demi) % portee) - portee / 2;
    const creux = Math.round(Math.sqrt(Math.max(0, (portee / 2) ** 2 - dansArc * dansArc)) * 0.7);
    for (let l = -2; l <= 2; l++) {
      const x = axeX ? d : l, z = axeX ? l : d;
      set(x, 0, z, materiau);                              // le tablier
      set(x, 1, z, Math.abs(l) === 2 ? materiau : BLOCK.AIR);   // les parapets
      for (let y = -1; y >= -6; y--) {
        if (y < -creux) set(x, y, z, materiau);            // la pile
      }
    }
  }
}

export function buildPontMemorial(poser) { pontArcs(poser, 6, 4, MARBRE_2, true); }
export function buildPontDouglass(poser) { pontArcs(poser, 5, 4, GRANIT, false); }
export function buildKeyBridge(poser) { pontArcs(poser, 5, 4, GRANIT, true); }
