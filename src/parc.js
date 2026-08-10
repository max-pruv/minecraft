// Le parc d'attractions.
//
// L'ancien tenait dans cinquante blocs : une grande roue, un carrousel et un
// anneau de montagnes russes posé autour. Ce n'était pas un parc, c'était une
// fête foraine — et son allée dallée était même enterrée un bloc trop bas, donc
// invisible.
//
// Celui-ci est bâti d'après un vrai parc, et d'après ce qui en fait un : un lac
// au milieu, une couronne de villages nationaux autour, quatre grands huit de
// familles différentes, et un monorail qui passe au-dessus de tout. Chaque
// village a son bâtiment-signature — le campanile italien, le temple grec,
// l'église en bois debout de Scandinavie, les bulbes russes, le moulin
// néerlandais, le chalet suisse, les arènes espagnoles, les colombages
// allemands de l'entrée.
//
// Ce qu'on ne reproduit pas : les mascottes et les noms déposés. Un parc se
// reconnaît à son plan et à son architecture, et c'est cela qu'on bâtit. Les
// attractions portent donc des noms qui les décrivent.

import { BLOCK, DECOR_START } from './blocks.js';

const uni = (c) => DECOR_START + c * 10;
const brique = (c) => DECOR_START + c * 10 + 1;
const raye = (c) => DECOR_START + c * 10 + 5;

const ROUGE = uni(0);
const JAUNE = uni(2);
const VERT = uni(5);
const TURQUOISE = uni(7);
const BLEU = uni(10);
const VIOLET = uni(12);
const ROSE = uni(15);
const CHOCOLAT = uni(18);
const BEIGE = uni(19);
const SABLE = uni(20);
const BRIQUE_ITALIE = brique(16);
const GRIS = uni(24);
const ANTHRACITE = uni(25);
const BLANC = uni(27);
const CREME = uni(28);
const OR = BLOCK.GOLD;
const VERRE = BLOCK.GLASS;
const BOIS = BLOCK.PLANK;
const POUTRE = BLOCK.LOG;
const PAVE = BLOCK.SLAB_STONE;
const DALLE = BLOCK.SANDSTONE;
const HERBE = BLOCK.GRASS;
const EAU = BLOCK.WATER;

export const PARC_ATTRACTIONS = { x: 150, z: -60, r: 50 };

// Le lac, au centre — c'est lui qui organise tout le reste : les villages font
// le tour, les allées y reviennent, et les deux attractions aquatiques s'y
// jettent.
const LAC = { u: 0, v: 2, ru: 15, rv: 11 };
const dansLeLac = (u, v) => ((u - LAC.u) / LAC.ru) ** 2 + ((v - LAC.v) / LAC.rv) ** 2 < 1;

// Les villages, dans l'ordre où on les rencontre en tournant autour du lac
// depuis l'entrée. Chacun est aussi une destination : un enfant qui lit
// « Islande » sur la carte a envie d'y aller.
export const ZONES = [
  { nom: 'Entrée du parc', u: 0, v: 42, r: 9 },
  { nom: 'Village allemand', u: -16, v: 32, r: 9 },
  { nom: 'Village italien', u: -30, v: 18, r: 9 },
  { nom: 'Village français', u: -36, v: -2, r: 10 },
  { nom: 'Village grec', u: -28, v: -22, r: 9 },
  { nom: 'Village islandais', u: -6, v: -34, r: 11 },
  { nom: 'Village scandinave', u: 16, v: -30, r: 9 },
  { nom: 'Village russe', u: 32, v: -12, r: 9 },
  { nom: 'Village néerlandais', u: 36, v: 8, r: 9 },
  { nom: 'Village espagnol', u: 24, v: 28, r: 9 },
];

export const lieuxDuParc = () => ZONES.map((z) => ({
  name: z.nom, x: PARC_ATTRACTIONS.x + z.u, z: PARC_ATTRACTIONS.z + z.v, r: 6,
}));

// --- les allées ------------------------------------------------------------------

// Une grande allée circulaire autour du lac, huit rayons qui vont vers les
// villages, et l'allée d'honneur qui monte de l'entrée. C'est le plan de
// n'importe quel parc : on ne s'y perd pas, et on revient toujours au lac.
const RAYON_ALLEE = 21;

function surUneAllee(u, v) {
  if (dansLeLac(u, v)) return false;
  const d = Math.hypot(u - LAC.u, v - LAC.v);
  if (Math.abs(d - RAYON_ALLEE) <= 1.6) return true;                 // l'anneau
  if (Math.abs(u) <= 2.5 && v > LAC.v && v < 46) return true;        // l'allée d'honneur
  if (d > RAYON_ALLEE) {
    for (const z of ZONES) {
      const dz = Math.hypot(u - z.u, v - z.v);
      if (dz > z.r + 6) continue;
      // le rayon qui relie l'anneau au cœur du village
      const lu = z.u - LAC.u, lv = z.v - LAC.v;
      const L = Math.hypot(lu, lv);
      const t = ((u - LAC.u) * lu + (v - LAC.v) * lv) / (L * L);
      if (t < 0 || t > 1) continue;
      const ecart = Math.hypot(u - (LAC.u + lu * t), v - (LAC.v + lv * t));
      if (ecart <= 1.4) return true;
    }
  }
  return false;
}

// Ce que le parc pose au sol en un point donné, ou null si le terrain naturel
// garde la main. La carte s'en sert aussi : le lac et les allées se calculent,
// elle peut donc les montrer avant qu'on y ait mis les pieds.
export function solParc(x, z) {
  const u = x - PARC_ATTRACTIONS.x, v = z - PARC_ATTRACTIONS.z;
  // Deux comparaisons avant tout le reste. La carte interroge ce sol pour
  // CHAQUE pixel du monde — trois cent mille par redessin — et sans ce
  // rectangle d'écart elle passait son temps à mesurer des distances au parc
  // depuis l'autre bout de la planète : le zoom à deux doigts ne répondait
  // plus, et le second doigt levé finissait en téléportation.
  const R = PARC_ATTRACTIONS.r;
  if (u < -R || u > R || v < -R || v > R) return null;
  if (u * u + v * v > R * R) return null;
  if (dansLeLac(u, v)) return EAU;
  if (surUneAllee(u, v)) return DALLE;
  // les pelouses des villages, plus claires que la campagne autour
  for (const zo of ZONES) if (Math.hypot(u - zo.u, v - zo.v) < zo.r) return HERBE;
  return null;
}

const VERT_PELOUSE = [126, 186, 96];
const BEIGE_ALLEE = [222, 210, 176];
const BLEU_LAC = [72, 140, 205];

export function couleurCarteParc(x, z) {
  const s = solParc(x, z);
  if (s === EAU) return BLEU_LAC;
  if (s === DALLE) return BEIGE_ALLEE;
  if (s === HERBE) return VERT_PELOUSE;
  return null;
}

// --- les outils du bâtisseur ------------------------------------------------------

function outils(poser) {
  // dy = 0 est le bloc de surface : tout ce qui se dresse commence à 1. Les
  // allées de l'ancien parc étaient posées à −1, donc enterrées et invisibles.
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const sol = (x, z, id) => poser(x, 0, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
    }
  };
  const creux = (x0, x1, y0, y1, z0, z1, mur, dedans = BLOCK.AIR) => {
    bloc(x0, x1, y0, y1, z0, z1, mur);
    if (x1 - x0 > 1 && z1 - z0 > 1) bloc(x0 + 1, x1 - 1, y0, y1 - 1, z0 + 1, z1 - 1, dedans);
  };
  const toitPente = (x0, x1, z0, z1, y0, id, versX = false) => {
    const n = versX ? Math.ceil((x1 - x0) / 2) : Math.ceil((z1 - z0) / 2);
    for (let k = 0; k <= n; k++) {
      if (versX) {
        for (let z = z0; z <= z1; z++) { set(x0 + k, y0 + k, z, id); set(x1 - k, y0 + k, z, id); }
      } else {
        for (let x = x0; x <= x1; x++) { set(x, y0 + k, z0 + k, id); set(x, y0 + k, z1 - k, id); }
      }
    }
  };
  const cone = (cx, cz, y0, r, id) => {
    for (let k = 0; k <= r; k++) {
      const rr = r - k;
      for (let dx = -rr; dx <= rr; dx++) {
        for (let dz = -rr; dz <= rr; dz++) {
          if (Math.hypot(dx, dz) > rr + 0.4) continue;
          if (Math.hypot(dx, dz) < rr - 0.8 && k < r) continue;
          set(cx + dx, y0 + k, cz + dz, id);
        }
      }
    }
  };
  const dome = (cx, cz, y0, r, id) => {
    for (let y = 0; y <= r; y++) {
      const rr = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
      for (let dx = -rr; dx <= rr; dx++) {
        for (let dz = -rr; dz <= rr; dz++) {
          const h = Math.hypot(dx, dz);
          if (h > rr || h < rr - 1.3) continue;
          set(cx + dx, y0 + y, cz + dz, id);
        }
      }
    }
  };
  return { set, sol, bloc, creux, toitPente, cone, dome };
}

// Une voie de montagnes russes. On échantillonne la courbe assez finement pour
// qu'il n'y ait jamais de trou, on pose le rail, et on plante un pylône tous
// les quelques mètres — c'est cette forêt de pylônes qui fait qu'un grand huit
// ressemble à un grand huit, bien plus que le rail lui-même.
function voie(set, f, n, rail, pylone, pas = 5) {
  let dernier = null;
  for (let i = 0; i <= n; i++) {
    const [x, y, z] = f(i / n);
    const px = Math.round(x), py = Math.round(y), pz = Math.round(z);
    if (dernier) {
      // combler les marches d'escalier des fortes pentes
      const [ax, ay, az] = dernier;
      const marches = Math.max(Math.abs(px - ax), Math.abs(py - ay), Math.abs(pz - az));
      for (let k = 1; k < marches; k++) {
        set(Math.round(ax + ((px - ax) * k) / marches),
          Math.round(ay + ((py - ay) * k) / marches),
          Math.round(az + ((pz - az) * k) / marches), rail);
      }
    }
    set(px, py, pz, rail);
    if (i % pas === 0 && py > 1) for (let y2 = 1; y2 < py; y2++) set(px, y2, pz, pylone);
    dernier = [px, py, pz];
  }
}

// --- l'entrée et le village allemand ----------------------------------------------

function entree(o) {
  const { set, sol, bloc, creux, toitPente } = o;
  const V = 44;
  // le portail : deux tours à colombages et une arche, comme partout
  for (const cx of [-6, 6]) {
    creux(cx - 2, cx + 2, 0, 8, V - 2, V + 2, CREME);
    for (let y = 1; y <= 7; y += 2) {
      for (let dx = -2; dx <= 2; dx++) set(cx + dx, y, V - 2, CHOCOLAT);
    }
    toitPente(cx - 3, cx + 3, V - 3, V + 3, 9, ROUGE, true);
    set(cx, 13, V, OR);
  }
  bloc(-4, 4, 6, 7, V - 1, V + 1, CREME);
  for (let dx = -4; dx <= 4; dx += 2) set(dx, 8, V, OR);
  for (let dx = -3; dx <= 3; dx++) set(dx, 5, V, CHOCOLAT);
  // les guichets, de part et d'autre de l'allée d'honneur
  for (const cx of [-10, 10]) {
    creux(cx - 2, cx + 2, 0, 3, V - 5, V - 2, BLANC);
    toitPente(cx - 3, cx + 3, V - 6, V - 1, 4, ROUGE);
    for (let dz = -4; dz <= -3; dz++) set(cx, 2, V + dz, VERRE);
  }
  // l'allée d'honneur, bordée de maisons à colombages
  for (let v = 26; v <= 40; v += 5) {
    for (const cote of [-1, 1]) {
      const x0 = cote * 4, x1 = cote * 10;
      const [a, b] = [Math.min(x0, x1), Math.max(x0, x1)];
      creux(a, b, 0, 5, v, v + 3, CREME);
      // les colombages : des croix de bois sur la façade qui donne sur l'allée
      const face = cote < 0 ? b : a;
      for (let y = 1; y <= 4; y++) {
        for (let z = v; z <= v + 3; z++) {
          if ((y + z) % 3 === 0) set(face, y, z, CHOCOLAT);
        }
      }
      set(face, 2, v + 1, VERRE); set(face, 2, v + 2, VERRE);
      toitPente(a, b, v - 1, v + 4, 6, ROUGE);
      for (let z = v; z <= v + 3; z++) sol(face + (cote < 0 ? 1 : -1), z, PAVE);
    }
  }
  // le kiosque à musique, au bout de l'allée
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      if (Math.hypot(dx, dz) <= 3.4) set(dx, 0, 24 + dz, BOIS);
    }
  }
  for (const [px, pz] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, 2], [2, -2], [-2, -2]]) {
    for (let y = 1; y <= 3; y++) set(px, y, 24 + pz, BLANC);
  }
  o.cone(0, 24, 4, 4, raye(0));
  set(0, 9, 24, OR);
}

// Le château de l'entrée : le repère qu'on voit depuis le portail, et le point
// de rendez-vous de tout le monde.
function chateau(o) {
  const { set, bloc, creux, cone } = o;
  const U = -18, V = 33;
  creux(U - 7, U + 7, 0, 10, V - 5, V + 5, CREME);
  for (let y = 2; y <= 8; y += 3) {
    for (let dx = -6; dx <= 6; dx += 3) { set(U + dx, y, V - 5, VERRE); set(U + dx, y, V + 5, VERRE); }
  }
  for (let y = 0; y <= 3; y++) set(U, y, V + 5, BLOCK.AIR);      // la grande porte
  bloc(U - 7, U + 7, 11, 11, V - 5, V + 5, ROUGE);
  o.toitPente(U - 7, U + 7, V - 5, V + 5, 12, ROUGE);
  // les quatre tours d'angle, coiffées en poivrière
  for (const [dx, dz] of [[-7, -5], [7, -5], [-7, 5], [7, 5]]) {
    for (let y = 0; y <= 15; y++) {
      for (const [ax, az] of [[0, 0], [1 * Math.sign(-dx), 0], [0, 1 * Math.sign(-dz)], [Math.sign(-dx), Math.sign(-dz)]]) {
        set(U + dx + ax, y, V + dz + az, CREME);
      }
    }
    for (let y = 12; y <= 14; y += 2) set(U + dx, y, V + dz, VERRE);
    cone(U + dx, V + dz, 16, 4, BLEU);
    set(U + dx, 21, V + dz, OR);
  }
  // le donjon central et sa flèche
  creux(U - 2, U + 2, 12, 20, V - 2, V + 2, CREME);
  cone(U, V, 21, 5, BLEU);
  for (let k = 0; k <= 3; k++) set(U, 26 + k, V, OR);
}

// --- les quatre grands huit --------------------------------------------------------

// Le rouge : le plus haut du parc. Une remontée en chaîne, une première chute
// de trente blocs, puis des bosses de plus en plus courtes — c'est la famille
// des « hyper », celle qui ne fait pas de looping mais décolle du siège.
function grandHuitRouge(o) {
  const { set } = o;
  // Le circuit tient dans le parc : dessiné plus large, sa moitié ouest tombait
  // hors de la boîte du repère et n'était tout simplement jamais posée — un
  // grand huit coupé en deux, sans que rien ne le signale.
  const CU = -30, CV = -2, R = 11;
  voie(set, (t) => {
    const a = t * Math.PI * 2;
    const u = CU + Math.cos(a) * R * 1.4;
    const v = CV + Math.sin(a) * R;
    let y;
    if (t < 0.22) y = 3 + (t / 0.22) * 30;                       // la remontée
    else if (t < 0.32) y = 33 - ((t - 0.22) / 0.1) * 28;          // la chute
    else y = 5 + Math.abs(Math.sin((t - 0.32) * Math.PI * 3.4)) * (20 - (t - 0.32) * 20);
    return [u, y, v];
  }, 900, ROUGE, BLANC, 4);
  // la gare, sous la remontée
  o.creux(CU + 12, CU + 18, 0, 4, CV - 3, CV + 3, BOIS);
  o.toitPente(CU + 11, CU + 19, CV - 4, CV + 4, 5, ROUGE);
  for (let k = 0; k <= 2; k++) set(CU + 15, 8 + k, CV, JAUNE);
}

// Le bleu : un lancement, puis un grand looping et une vrille. Court, violent,
// et c'est le looping qu'on voit de loin.
function grandHuitBleu(o) {
  const { set } = o;
  const CU = -8, CV = -36;
  // le lancement, plat
  voie(set, (t) => [CU - 16 + t * 18, 3, CV + 6], 60, BLEU, GRIS, 4);
  // le looping
  voie(set, (t) => {
    const a = t * Math.PI * 2 - Math.PI / 2;
    return [CU + 2 + Math.sin(a) * 2, 3 + 9 + Math.cos(a + Math.PI) * 9, CV + 6];
  }, 200, BLEU, GRIS, 200);
  // la vrille qui repart vers la gare
  voie(set, (t) => {
    const a = t * Math.PI * 2.4;
    return [CU + 2 + Math.sin(a) * 10, 4 + Math.abs(Math.cos(a * 1.5)) * 11, CV + 6 - t * 16];
  }, 500, BLEU, GRIS, 5);
  o.creux(CU - 20, CU - 14, 0, 4, CV + 4, CV + 9, GRIS);
  o.toitPente(CU - 21, CU - 13, CV + 3, CV + 10, 5, BLEU);
}

// Le grand huit en bois : sa charpente compte autant que sa voie. Une forêt de
// poutres croisées, une piste qui ondule dessus, et le bruit qu'on imagine.
function grandHuitBois(o) {
  const { set } = o;
  const CU = 4, CV = -32, RU = 15, RV = 9;
  const piste = (t) => {
    const a = t * Math.PI * 2;
    return [CU + Math.cos(a) * RU, 4 + 14 * (0.5 + 0.5 * Math.cos(a * 2)) + (t < 0.15 ? t * 40 : 0), CV + Math.sin(a) * RV];
  };
  // la charpente d'abord : des palées tous les deux mètres, entretoisées
  for (let i = 0; i < 90; i++) {
    const [x, y, z] = piste(i / 90);
    const px = Math.round(x), pz = Math.round(z), py = Math.round(y);
    for (let y2 = 1; y2 < py; y2++) {
      set(px, y2, pz, POUTRE);
      if (y2 % 4 === 0) { set(px, y2, pz + 1, BOIS); set(px, y2, pz - 1, BOIS); }
    }
  }
  voie(set, piste, 800, CHOCOLAT, POUTRE, 900);
  o.creux(CU + RU - 3, CU + RU + 3, 0, 4, CV - 3, CV + 3, BOIS);
  o.toitPente(CU + RU - 4, CU + RU + 4, CV - 4, CV + 4, 5, CHOCOLAT);
}

// Les bûches : une rivière sur pilotis qui fait le tour du village grec et
// plonge dans le lac. La grande chute est tournée vers l'allée, pour que ceux
// qui attendent reçoivent l'eau.
function bucheronsEtEau(o) {
  const { set } = o;
  const CU = -26, CV = -20;
  voie(set, (t) => {
    const a = t * Math.PI * 1.9 + Math.PI * 0.4;
    const r = 12 - t * 3;
    const y = t < 0.6 ? 4 + t * 12 : 11 - ((t - 0.6) / 0.4) ** 2 * 9;
    return [CU + Math.cos(a) * r * 1.2, y, CV + Math.sin(a) * r];
  }, 600, TURQUOISE, GRIS, 5);
  // le bassin de réception, relié au lac par un canal
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      if (Math.hypot(dx, dz) > 5) continue;
      o.sol(CU + 10 + dx, CV + 12 + dz, EAU);
    }
  }
  for (let k = 0; k <= 14; k++) o.sol(CU + 14 + k, CV + 14 + Math.round(k * 0.6), EAU);
}

// --- les villages -------------------------------------------------------------------

function villageItalien(o) {
  const { set, creux, toitPente } = o;
  const U = -30, V = 18;
  // le campanile : c'est lui qu'on voit du lac
  creux(U + 6, U + 9, 0, 22, V - 2, V + 1, BRIQUE_ITALIE);
  for (let y = 4; y <= 18; y += 4) { set(U + 6, y, V, VERRE); set(U + 9, y, V, VERRE); }
  for (let y = 19; y <= 21; y++) for (let dx = 6; dx <= 9; dx++) set(U + dx, y, V - 2, VERRE);
  toitPente(U + 5, U + 10, V - 3, V + 2, 23, ROUGE, true);
  set(U + 7, 28, V, OR);
  // la piazza et ses arcades
  for (let dx = -8; dx <= 3; dx++) {
    for (let dz = -6; dz <= 4; dz++) o.sol(U + dx, V + dz, PAVE);
  }
  creux(U - 8, U + 2, 0, 6, V - 6, V - 3, BEIGE);
  for (let dx = -7; dx <= 1; dx += 2) {
    for (let y = 1; y <= 3; y++) set(U + dx, y, V - 3, BLOCK.AIR);
  }
  toitPente(U - 9, U + 3, V - 7, V - 2, 7, ROUGE);
  // la fontaine
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.hypot(dx, dz) <= 2.4) o.sol(U - 3 + dx, V + 1 + dz, dx || dz ? EAU : PAVE);
    }
  }
  for (let y = 1; y <= 3; y++) set(U - 3, y, V + 1, BLANC);
  set(U - 3, 4, V + 1, OR);
}

function villageGrec(o) {
  const { set, bloc } = o;
  const U = -28, V = -22;
  // le temple : un stylobate, deux rangées de colonnes, un fronton
  bloc(U - 7, U + 7, 0, 1, V - 5, V + 5, BLANC);
  for (let dx = -6; dx <= 6; dx += 2) {
    for (const dz of [-4, 4]) for (let y = 2; y <= 8; y++) set(U + dx, y, V + dz, BLANC);
  }
  for (let dz = -3; dz <= 3; dz += 2) {
    for (const dx of [-6, 6]) for (let y = 2; y <= 8; y++) set(U + dx, y, V + dz, BLANC);
  }
  bloc(U - 7, U + 7, 9, 9, V - 5, V + 5, BLANC);
  for (let k = 0; k <= 3; k++) {
    for (let dx = -6 + k; dx <= 6 - k; dx++) { set(U + dx, 10 + k, V - 5, BLANC); set(U + dx, 10 + k, V + 5, BLANC); }
  }
  // le village blanc à volets bleus, en contrebas
  for (const [dx, dz] of [[-12, 6], [-7, 9], [-1, 10], [5, 8], [10, 4]]) {
    o.creux(U + dx - 2, U + dx + 2, 0, 3, V + dz - 2, V + dz + 2, BLANC);
    o.bloc(U + dx - 2, U + dx + 2, 4, 4, V + dz - 2, V + dz + 2, BLEU);
    set(U + dx, 2, V + dz - 2, BLEU);
  }
}

function villageScandinave(o) {
  const { set, creux, toitPente } = o;
  const U = 16, V = -30;
  // l'église en bois debout : des toits qui s'empilent, de plus en plus petits
  creux(U - 4, U + 4, 0, 6, V - 4, V + 4, CHOCOLAT);
  toitPente(U - 5, U + 5, V - 5, V + 5, 7, CHOCOLAT);
  creux(U - 2, U + 2, 12, 15, V - 2, V + 2, CHOCOLAT);
  toitPente(U - 3, U + 3, V - 3, V + 3, 16, CHOCOLAT);
  for (let k = 0; k <= 4; k++) set(U, 20 + k, V, k === 4 ? OR : POUTRE);
  for (let y = 2; y <= 4; y += 2) { set(U - 4, y, V, VERRE); set(U + 4, y, V, VERRE); }
  // la maison longue viking et son drakkar échoué
  creux(U + 8, U + 18, 0, 4, V + 4, V + 9, POUTRE);
  toitPente(U + 7, U + 19, V + 3, V + 10, 5, VERT);
  for (let k = 0; k <= 10; k++) {
    set(U - 12 + k, 1, V + 12 + Math.round(Math.sin(k * 0.4) * 0.5), BOIS);
    set(U - 12 + k, 2, V + 12, k % 2 ? ROUGE : BLANC);
  }
  for (let y = 1; y <= 6; y++) set(U - 12, y, V + 12, POUTRE);
  set(U - 12, 7, V + 12, OR);
}

function villageRusse(o) {
  const { set, creux, dome } = o;
  const U = 32, V = -12;
  // la cathédrale à bulbes : cinq coupoles de couleurs différentes
  creux(U - 5, U + 5, 0, 9, V - 5, V + 5, BLANC);
  for (let y = 3; y <= 7; y += 2) {
    for (const dx of [-5, 5]) set(U + dx, y, V, VERRE);
  }
  const bulbes = [[0, 0, 4, OR], [-4, -4, 2, ROUGE], [4, -4, 2, BLEU], [-4, 4, 2, VERT], [4, 4, 2, TURQUOISE]];
  for (const [dx, dz, r, c] of bulbes) {
    const base = dx || dz ? 10 : 12;
    for (let k = 0; k < 3; k++) set(U + dx, 10 + k, V + dz, BLANC);
    dome(U + dx, V + dz, base + 2, r, c);
    for (let y = base + r + 2; y <= base + r + 3; y++) set(U + dx, y, V + dz, OR);
  }
  // la tour tournante : quatre fûts miroirs autour d'un mât
  for (const [dx, dz] of [[-3, 10], [3, 10], [-3, 16], [3, 16]]) {
    for (let y = 0; y <= 24; y++) set(U + dx, y, V + dz, y % 3 === 0 ? BLANC : VERRE);
    set(U + dx, 25, V + dz, ROUGE);
  }
  for (let y = 0; y <= 30; y++) set(U, y, V + 13, GRIS);
  set(U, 31, V + 13, OR);
}

function villageNeerlandais(o) {
  const { set, creux, toitPente } = o;
  const U = 36, V = 8;
  // le moulin : le corps, la galerie, et les quatre ailes qui tournent
  for (let y = 0; y <= 11; y++) {
    const r = 4 - Math.floor(y / 4);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.hypot(dx, dz) > r + 0.3 || Math.hypot(dx, dz) < r - 0.8) continue;
        set(U + dx, y, V + dz, y === 5 ? BOIS : brique(0));
      }
    }
  }
  o.cone(U, V, 12, 3, CHOCOLAT);
  for (let k = 1; k <= 6; k++) {
    set(U + k, 12 + k, V - 3, BOIS); set(U - k, 12 - k, V - 3, BOIS);
    set(U + k, 12 - k, V - 3, BOIS); set(U - k, 12 + k, V - 3, BOIS);
  }
  // les maisons de canal, à pignons en escalier
  for (const dx of [-14, -10, -6]) {
    creux(U + dx, U + dx + 3, 0, 7, V + 8, V + 11, brique(18));
    for (let k = 0; k <= 3; k++) {
      for (let x = U + dx + k; x <= U + dx + 3 - k; x++) { set(x, 8 + k, V + 8, CREME); set(x, 8 + k, V + 11, CREME); }
    }
    for (let y = 2; y <= 6; y += 2) set(U + dx + 1, y, V + 8, VERRE);
  }
  // le canal, et les champs de tulipes
  for (let k = -16; k <= 4; k++) o.sol(U + k, V + 14, EAU);
  for (let dx = -16; dx <= 6; dx++) {
    for (let dz = 16; dz <= 20; dz++) {
      if ((dx + dz) % 3 === 0) o.sol(U + dx, V + dz, [ROUGE, JAUNE, ROSE, VIOLET][Math.abs(dx + dz * 3) % 4]);
    }
  }
}

function villageEspagnol(o) {
  const { set, creux, toitPente } = o;
  const U = 24, V = 28;
  // les arènes : un anneau de gradins ouvert sur le ciel
  for (let a = 0; a < 360; a += 3) {
    const r = Math.PI / 180 * a;
    for (let k = 0; k < 3; k++) {
      const rr = 9 + k;
      const x = U + Math.round(Math.cos(r) * rr), z = V + Math.round(Math.sin(r) * rr);
      for (let y = 0; y <= 3 + k; y++) set(x, y, z, k === 2 ? BEIGE : SABLE);
    }
  }
  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = -8; dz <= 8; dz++) if (Math.hypot(dx, dz) <= 8) o.sol(U + dx, V + dz, BLOCK.SAND);
  }
  for (let dz = -1; dz <= 1; dz++) for (let y = 0; y <= 3; y++) set(U - 9, y, V + dz, BLOCK.AIR);
  // les maisons blanches à toits de tuiles, serrées derrière
  for (const [dx, dz] of [[-14, -8], [-9, -12], [-3, -13], [3, -12]]) {
    creux(U + dx - 2, U + dx + 2, 0, 4, V + dz - 2, V + dz + 2, BLANC);
    toitPente(U + dx - 3, U + dx + 3, V + dz - 3, V + dz + 3, 5, ROUGE);
  }
}

function villageAnglaisEtAlpin(o) {
  const { set, creux, toitPente, cone } = o;
  // l'Angleterre, entre l'Espagne et l'entrée : des maisons Tudor et une tour
  const U = 14, V = 40;
  for (const dx of [-6, 0, 6]) {
    creux(U + dx - 3, U + dx + 2, 0, 5, V - 3, V + 2, CREME);
    for (let y = 1; y <= 4; y++) {
      for (let z = V - 3; z <= V + 2; z++) if ((y + z) % 3 === 0) set(U + dx - 3, y, z, ANTHRACITE);
    }
    toitPente(U + dx - 4, U + dx + 3, V - 4, V + 3, 6, ANTHRACITE);
  }
  creux(U + 12, U + 16, 0, 14, V - 3, V + 1, GRIS);
  for (let dx = 12; dx <= 16; dx += 2) set(U + dx, 15, V - 3, GRIS);
  set(U + 14, 12, V - 3, OR);      // l'horloge
  // la Suisse et l'Autriche, au nord-est : un chalet et son télésiège
  const A = 40, B = -28;
  creux(A - 5, A + 5, 0, 4, B - 4, B + 4, POUTRE);
  toitPente(A - 7, A + 7, B - 6, B + 6, 5, CHOCOLAT);
  for (let dx = -4; dx <= 4; dx += 2) set(A + dx, 3, B + 4, ROUGE);
  for (let k = 0; k <= 8; k++) {
    const x = A - 14 + k * 2, y = 6 + k, z = B + 10 - k;
    for (let y2 = 1; y2 < y; y2++) if (k % 2 === 0) set(x, y2, z, GRIS);
    set(x, y, z, GRIS);
    if (k % 2 === 1) { set(x, y - 1, z, ROUGE); set(x, y - 2, z, ROUGE); }
  }
}

// --- le lac, le monorail et la tour --------------------------------------------------

function lacEtBateaux(o) {
  const { set, sol } = o;
  for (let u = -LAC.ru - 1; u <= LAC.ru + 1; u++) {
    for (let v = -LAC.rv - 1; v <= LAC.rv + 1; v++) {
      const x = LAC.u + u, z = LAC.v + v;
      if (dansLeLac(x, z)) sol(x, z, EAU);
      else if (((u / (LAC.ru + 1.5)) ** 2 + (v / (LAC.rv + 1.5)) ** 2) < 1) sol(x, z, PAVE);
    }
  }
  // l'île du milieu, sa fontaine et son saule
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.hypot(dx, dz * 1.4) <= 3) sol(LAC.u + dx, LAC.v + dz, HERBE);
    }
  }
  for (let y = 1; y <= 5; y++) set(LAC.u, y, LAC.v, BLANC);
  set(LAC.u, 6, LAC.v, OR);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(LAC.u + dx, 5, LAC.v + dz, VERRE);
  // deux pédalos amarrés au ponton
  for (let k = 0; k <= 5; k++) sol(LAC.u - 8 + k, LAC.v + 9, BOIS);
  for (const [dx, c] of [[-9, ROUGE], [-6, JAUNE]]) {
    for (let k = 0; k <= 2; k++) { set(LAC.u + dx + k, 1, LAC.v + 11, c); set(LAC.u + dx + k, 1, LAC.v + 12, c); }
    set(LAC.u + dx + 1, 2, LAC.v + 11, BLANC);
  }
}

// Le monorail : une boucle sur pilotis qui fait le tour du parc au-dessus des
// villages. C'est ce qui relie tout, et ce qui dit d'un coup d'œil qu'on est
// dans un parc et pas dans une fête foraine.
function monorail(o) {
  const { set } = o;
  const R = 45;
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * Math.PI * 2;
    const x = Math.round(Math.cos(a) * R), z = Math.round(Math.sin(a) * R * 0.92);
    const y = 13 + Math.round(Math.sin(a * 2) * 2);
    set(x, y, z, GRIS);
    set(x, y + 1, z, BLANC);
    if (i % 20 === 0) for (let y2 = 1; y2 < y; y2++) set(x, y2, z, GRIS);
  }
  // la rame, à quai au-dessus de l'entrée
  for (let k = 0; k <= 9; k++) {
    const a = (Math.PI / 2) + k * 0.02;
    const x = Math.round(Math.cos(a) * R), z = Math.round(Math.sin(a) * R * 0.92);
    set(x, 15, z, k === 0 || k === 9 ? ROUGE : BLANC);
    set(x, 16, z, VERRE);
  }
}

// La tour panoramique, au nord : le point le plus haut, d'où l'on voit le parc
// entier et, par temps clair, la ville au loin.
function tourPanoramique(o) {
  const { set } = o;
  const U = -2, V = -46;
  for (let y = 0; y <= 42; y++) {
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) set(U + dx, y, V + dz, GRIS);
    if (y % 6 === 0) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(U + dx, y, V + dz, BLANC);
  }
  // la cabine, en anneau autour du fût
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > 4.3 || d < 2.2) continue;
      set(U + dx, 34, V + dz, BLANC);
      set(U + dx, 35, V + dz, VERRE);
      set(U + dx, 36, V + dz, BLANC);
    }
  }
  for (let k = 0; k <= 4; k++) set(U, 43 + k, V, k === 4 ? ROUGE : GRIS);
}

// --- l'assemblage ---------------------------------------------------------------------

export function buildParc(poser) {
  const o = outils(poser);
  // le sol d'abord : le lac, les allées, les pelouses des villages
  for (let u = -PARC_ATTRACTIONS.r; u <= PARC_ATTRACTIONS.r; u++) {
    for (let v = -PARC_ATTRACTIONS.r; v <= PARC_ATTRACTIONS.r; v++) {
      if (Math.hypot(u, v) > PARC_ATTRACTIONS.r) continue;
      const s = solParc(PARC_ATTRACTIONS.x + u, PARC_ATTRACTIONS.z + v);
      if (s !== null) o.sol(u, v, s);
    }
  }
  lacEtBateaux(o);
  entree(o);
  chateau(o);
  villageItalien(o);
  villageGrec(o);
  villageScandinave(o);
  villageRusse(o);
  villageNeerlandais(o);
  villageEspagnol(o);
  villageAnglaisEtAlpin(o);
  grandHuitRouge(o);
  grandHuitBleu(o);
  grandHuitBois(o);
  bucheronsEtEau(o);
  monorail(o);
  tourPanoramique(o);
}
