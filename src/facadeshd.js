// LA COUCHE HD DE PARIS — le détail des façades et des sols, en tampons (v287).
//
// Max : « ce n'est plus Minecraft avec des immeubles de Paris, c'est Paris ».
// Jusqu'ici une façade était UNE TUILE DE SEIZE PIXELS par bloc : la fenêtre,
// l'encadrement, le balcon et la corniche étaient DESSINÉS sur une face plate,
// et depuis le trottoir tout était plat. Une rue haussmannienne se reconnaît
// pourtant d'abord à son RELIEF — la baie en retrait, l'appui qui saille, le
// garde-corps devant, le balcon filant qui court, la corniche qui porte son
// ombre. Ce fichier émet ce relief.
//
// CE QU'IL EST, ET CE QU'IL N'EST PAS.
//
// - C'est une SECONDE PASSE du mailleur, sur les MÊMES blocs, dans le MÊME
//   worker (`mesher.js` l'appelle). Il ne connaît pas three : il rend des
//   tampons, comme `GeomBuffer`, avec deux attributs de plus — la matière
//   (rugosité, métal) et la lueur (une fenêtre qui s'allume la nuit).
// - Il ne pose AUCUN bloc. Le voxel reste le squelette : collisions,
//   sauvegardes, coordonnées, tout est intact — la couche HD LIT et ne change
//   rien (invariant 1, par construction).
// - Le voxel PLAT reste le LOIN. Pour chaque face de façade qu'on détaille, le
//   mailleur garde aussi la face plate d'avant, dans un tampon à part
//   (`plat`) : de près on montre le détail, de loin la tuile — un niveau de
//   détail sans remaillage, et la ligne de corniche vue de loin ne change pas
//   d'un pixel.
// - Un seul matériau, un seul atlas (`matierehd.js`), donc UN appel de dessin
//   par morceau pour tout le détail d'un morceau — cent quads de balcon ou
//   mille, c'est le même prix pour le pilote.
//
// LE REPÈRE D'UNE FACE. Tout se dessine dans un repère local à la face : `s`
// court le long de la façade (de 0 à 1, la droite quand on la regarde depuis
// la rue), `t` monte (0 le plancher, 1 le plafond de l'étage), `d` sort vers
// la rue (positif en saillie, négatif en retrait dans l'épaisseur du bloc).
// Un balcon est une boîte de `d` 0 à 0,22 ; une baie un trou de `d` 0 à −0,12
// avec ses ébrasements. C'est ce qui rend un registre lisible en dix lignes.
//
// L'OCCLUSION DU MAILLEUR EST GARDÉE : la face reçoit ses quatre coins
// d'occlusion et les interpole sur tout son détail, si bien qu'un immeuble
// HD s'assombrit au ras du sol et sous ses voisins exactement comme le voxel
// d'à côté.

import { BLOCK, CITY_BLOCK, ARCHI } from './blocks.js';
import { PARIS, infoFacadeParis, marquageParis } from './paris.js';

// --- l'atlas HD : huit tuiles par huit, cent vingt-huit pixels ------------------

// La liste fait foi des deux côtés : `matierehd.js` PEINT ces tuiles dans cet
// ordre, ce fichier les DEMANDE par leur nom. Un nom absent est une erreur, pas
// une case vide.
export const TUILES_HD = [
  'pierre',        // la pierre de taille, assises et joints
  'pierre-lisse',  // la même sans joints marqués : encadrements, corniches
  'zinc',          // joints debout, bleu-gris
  'verre',         // la vitre sombre, un rideau derrière
  'fer',           // la ferronnerie (alpha) : volutes et barreaux
  'menuiserie',    // le bois peint des châssis
  'bois',          // la porte cochère
  'store',         // la toile rayée
  'enseigne',      // le bandeau de boutique
  'bitume',        // l'asphalte usé de la chaussée
  'pave',          // les pavés en éventail
  'trottoir',      // l'asphalte des trottoirs de Paris, plus clair, sans joint
  'bordure',       // le caniveau : des pavés de granit en rangs serrés
  'granit',        // la bordure de trottoir et les quais
  'cour',          // les pavés d'une cour
  'brique',        // le rouge d'une souche, d'un mur mitoyen
  'marquage',      // la peinture blanche au sol, usée
];
export const COLS_HD = 8;
export const PX_HD = 128;
const INDEX_HD = new Map(TUILES_HD.map((n, i) => [n, i]));

// Le rectangle d'une tuile dans l'atlas, origine + taille, avec la marge d'un
// demi-texel qui empêche l'échantillonnage de mordre sur la voisine.
export function rectHD(nom) {
  const i = INDEX_HD.get(nom);
  if (i === undefined) throw new Error(`tuile HD inconnue : ${nom}`);
  const col = i % COLS_HD, row = Math.floor(i / COLS_HD);
  const marge = 0.5 / (COLS_HD * PX_HD);
  const u0 = col / COLS_HD + marge, u1 = (col + 1) / COLS_HD - marge;
  const v1 = 1 - row / COLS_HD - marge, v0 = 1 - (row + 1) / COLS_HD + marge;
  return [u0, v0, u1 - u0, v1 - v0];
}

// --- ce qui reçoit une face HD -----------------------------------------------------

// Le SOL : la face du dessus de ces blocs part dans le tampon `sol`, avec la
// tuile HD. Ils restent fusionnés (greedy) : une chaussée de seize blocs est
// toujours un seul quad.
// La chaussée de Paris est en ASPHALTE dans la couche HD — c'est ce que sont les
// rues de Paris, et c'est ce qui les fait lire comme des rues (Max, sur les
// premières captures : « ils n'ont pas clairement de route »). Le pavé reste
// aux cours et aux quais bas.
//
// ET LE TROTTOIR EST SURÉLEVÉ. Une rue de Paris, c'est une chaussée d'asphalte
// noir, un caniveau de pavés de granit, une bordure de granit clair qui monte
// d'une quinzaine de centimètres, et un trottoir d'asphalte gris — pas de dalles
// de béton, c'est Berlin ou New York. La marche ne se pose pas en blocs (le sol
// ne bouge pas, invariant 1) : c'est le tampon `sol` qui dessine la face du
// trottoir à `RELEVE` au-dessus du bloc, avec une jupe de granit là où il donne
// sur plus bas. Le voxel reste le squelette : un enfant marche à la cote du
// bloc, ses pieds entrent d'un dixième dans l'asphalte, ce qui ne se voit pas.
export const RELEVE = 0.1;
export const SOL_HD = new Map([
  [ARCHI.PAVE, { tuile: 'bitume', rugueux: 0.92, metal: 0 }],
  [CITY_BLOCK.SIDEWALK, { tuile: 'trottoir', rugueux: 0.95, metal: 0, releve: RELEVE }],
  [ARCHI.BORDURE, { tuile: 'bordure', rugueux: 0.8, metal: 0 }],
  [CITY_BLOCK.GRANITE, { tuile: 'granit', rugueux: 0.75, metal: 0 }],
  [CITY_BLOCK.ASPHALT, { tuile: 'bitume', rugueux: 0.92, metal: 0 }],
  [BLOCK.COBBLE, { tuile: 'cour', rugueux: 0.9, metal: 0 }],
]);

// La FAÇADE : les faces latérales de ces blocs sont détaillées ici, et la face
// plate part dans `plat` (le loin) au lieu de `solid`.
export const FACADE_HD = new Set([
  ARCHI.VITRINE, ARCHI.ENTRESOL, ARCHI.ETAGE, ARCHI.NOBLE, ARCHI.CORNICHE,
  ARCHI.MANSARDE, ARCHI.ZINC_LISSE, ARCHI.CHAINAGE, ARCHI.PORTE, ARCHI.MUR_NU,
]);

// Un morceau est couvert par la couche HD s'il touche le disque de Paris. La
// question se pose PAR MORCEAU, une fois, et non par bloc.
export function couvreHD(cx, cz, chunk) {
  const x = cx * chunk + chunk / 2, z = cz * chunk + chunk / 2;
  const marge = PARIS.r + chunk;
  return (x - PARIS.x) * (x - PARIS.x) + (z - PARIS.z) * (z - PARIS.z) < marge * marge;
}

// LE TIRAGE DES VITRES ALLUMÉES, en coordonnées du MONDE — sinon le motif se
// répéterait à chaque morceau. C'est le même que celui de `mesher.js` (qui
// l'importe d'ici) : la fenêtre qui brille de loin, en tuile, est celle qui
// brille de près, en géométrie.
export function vitreAllumee(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) % 100) < 30;
}

function tirage(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// --- les matières, par sommet ----------------------------------------------------

const M = {
  pierre: [0.86, 0.0],
  zinc: [0.42, 0.78],
  verre: [0.10, 0.62],   // un verre sombre qui reflète le ciel : c'est le métal qui fait le miroir
  fer: [0.55, 0.85],
  menuiserie: [0.62, 0.0],
  bois: [0.68, 0.0],
  store: [0.92, 0.0],
  enseigne: [0.55, 0.15],
  marquage: [0.7, 0.0],
  granit: [0.75, 0.0],
};

// --- le tampon HD ------------------------------------------------------------------

const NEUTRE = [0, 0, 1, 1];

export class GeomBufferHD {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.uvs = [];
    this.colors = [];
    this.tiles = [];
    this.matiere = [];
    this.lueur = [];
    this.indices = [];
  }

  // Un sommet : position, normale, UV (déjà dans la tuile ou à replier par
  // `rect`), teinte, matière, lueur.
  sommet(p, n, uv, rect, teinte, mat, lueur) {
    this.positions.push(p[0], p[1], p[2]);
    this.normals.push(n[0], n[1], n[2]);
    this.uvs.push(uv[0], uv[1]);
    this.tiles.push(rect[0], rect[1], rect[2], rect[3]);
    this.colors.push(teinte[0], teinte[1], teinte[2]);
    this.matiere.push(mat[0], mat[1]);
    this.lueur.push(lueur);
    return this.positions.length / 3 - 1;
  }

  // Un quad de quatre sommets déjà émis, dans l'ordre antihoraire vu de face.
  quadIndices(a, b, c, d) {
    this.indices.push(a, b, c, a, c, d);
  }

  // La face plate d'un bloc, comme `GeomBuffer.addFace`, mais vers l'atlas HD :
  // UV en unités du monde (la texture continue d'un bloc à l'autre), repliées
  // dans la tuile par le shader.
  addFace(face, x, y, z, rect, yTop, ao, w, h, mat) {
    const base = this.positions.length / 3;
    const echelle = [1, 1, 1];
    echelle[face.uAxis] = w;
    echelle[face.vAxis] = h;
    for (let i = 0; i < 4; i++) {
      const c = face.corners[i];
      const cy = c[1] === 1 ? yTop * echelle[1] : 0;
      const px = x + c[0] * echelle[0], py = y + cy, pz = z + c[2] * echelle[2];
      this.positions.push(px, py, pz);
      this.normals.push(face.dir[0], face.dir[1], face.dir[2]);
      // Le sol se lit en (x, z) du monde ; une face debout en (le long, y).
      const u = face.dir[1] !== 0 ? px : (face.dir[0] !== 0 ? pz : px);
      const v = face.dir[1] !== 0 ? pz : py;
      this.uvs.push(u, v);
      this.tiles.push(rect[0], rect[1], rect[2], rect[3]);
      const shade = face.shade * (ao ? ao[i] : 1);
      this.colors.push(shade, shade, shade);
      this.matiere.push(mat[0], mat[1]);
      this.lueur.push(0);
    }
    if (ao && ao[0] + ao[2] < ao[1] + ao[3]) {
      this.indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    } else {
      this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  toTampons() {
    if (this.indices.length === 0) return null;
    const sommets = this.positions.length / 3;
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      uvs: new Float32Array(this.uvs),
      colors: new Float32Array(this.colors),
      tiles: new Float32Array(this.tiles),
      matiere: new Float32Array(this.matiere),
      lueur: new Float32Array(this.lueur),
      indices: sommets > 65535 ? new Uint32Array(this.indices) : new Uint16Array(this.indices),
    };
  }
}

// --- le repère d'une face ----------------------------------------------------------

// Pour chaque direction horizontale : l'origine (le coin bas-gauche vu de la
// rue), l'axe `s` et la normale `d`. `t` est toujours +y. Les coins de
// `FACES` (mesher.js) sont donnés dans cet ordre : bas-gauche, bas-droite,
// haut-droite, haut-gauche — l'occlusion `ao[i]` suit le même ordre.
const REPERES = {
  '1,0,0': { o: [1, 0, 1], s: [0, 0, -1], d: [1, 0, 0] },
  '-1,0,0': { o: [0, 0, 0], s: [0, 0, 1], d: [-1, 0, 0] },
  '0,0,1': { o: [0, 0, 1], s: [1, 0, 0], d: [0, 0, 1] },
  '0,0,-1': { o: [1, 0, 0], s: [-1, 0, 0], d: [0, 0, -1] },
};

class Face {
  constructor(buf, dir, x, y, z, ao, teinte, courant) {
    this.buf = buf;
    const r = REPERES[dir.join(',')];
    this.o = [x + r.o[0], y + r.o[1], z + r.o[2]];
    this.S = r.s; this.D = r.d;
    this.ao = ao || [1, 1, 1, 1];
    this.teinte = teinte;
    // La coordonnée du monde le long de `s`, pour que la pierre continue d'un
    // bloc à l'autre : le shader replie `u` dans sa tuile.
    this.courant = courant;
    this.y = y;
  }

  p(s, t, d) {
    const { o, S, D } = this;
    return [o[0] + S[0] * s + D[0] * d, o[1] + t, o[2] + S[2] * s + D[2] * d];
  }

  aoA(s, t) {
    const a = this.ao;
    const bas = a[0] + (a[1] - a[0]) * s, haut = a[3] + (a[2] - a[3]) * s;
    return bas + (haut - bas) * t;
  }

  couleur(s, t, ombre) {
    const k = this.aoA(Math.min(1, Math.max(0, s)), Math.min(1, Math.max(0, t))) * ombre;
    const c = this.teinte;
    return [c[0] * k, c[1] * k, c[2] * k];
  }

  // Un quad dans le repère de la face. `n` est la normale en repère local
  // (composantes sur S, T, D) ; les quatre coins sont donnés en (s, t, d) dans
  // l'ordre antihoraire vu du côté de la normale. Les UV suivent le monde : `u`
  // le long de `s` (plus le courant), `v` en hauteur — ou, pour une face
  // horizontale, `u` le long de `s` et `v` le long de `d`.
  quad(coins, n, tuile, ombre = 1, lueur = 0, uvAbsolus = null) {
    const { S, D } = this;
    const ln = Math.hypot(n[0], n[1], n[2]) || 1;
    const nm = [(S[0] * n[0] + D[0] * n[2]) / ln, n[1] / ln, (S[2] * n[0] + D[2] * n[2]) / ln];
    const rect = uvAbsolus ? NEUTRE : rectHD(tuile);
    const mat = M[tuile] || M.pierre;
    const ids = [];
    for (let i = 0; i < 4; i++) {
      const [s, t, d] = coins[i];
      let uv;
      if (uvAbsolus) {
        const r = rectHD(tuile);
        uv = [r[0] + r[2] * uvAbsolus[i][0], r[1] + r[3] * uvAbsolus[i][1]];
      } else if (n[1] !== 0) {
        uv = [this.courant + s, this.y + d];
      } else if (n[0] !== 0) {
        uv = [this.courant + d, this.y + t];
      } else {
        uv = [this.courant + s, this.y + t];
      }
      ids.push(this.buf.sommet(this.p(s, t, d), nm, uv, rect, this.couleur(s, t, ombre), mat, lueur));
    }
    this.buf.quadIndices(ids[0], ids[1], ids[2], ids[3]);
  }

  // Un plan de mur, face à la rue, à la profondeur `d`.
  plan(s0, s1, t0, t1, d, tuile, ombre = 1, lueur = 0) {
    this.quad([[s0, t0, d], [s1, t0, d], [s1, t1, d], [s0, t1, d]], [0, 0, 1], tuile, ombre, lueur);
  }

  // Une boîte en saillie, de d0 à d1 (d1 > d0), sans face arrière.
  boite(s0, s1, t0, t1, d0, d1, tuile, ombre = 1) {
    this.quad([[s0, t0, d1], [s1, t0, d1], [s1, t1, d1], [s0, t1, d1]], [0, 0, 1], tuile, ombre);          // devant
    this.quad([[s0, t1, d0], [s0, t1, d1], [s1, t1, d1], [s1, t1, d0]], [0, 1, 0], tuile, ombre);          // dessus
    this.quad([[s0, t0, d1], [s0, t0, d0], [s1, t0, d0], [s1, t0, d1]], [0, -1, 0], tuile, ombre * 0.55);  // dessous
    this.quad([[s0, t0, d0], [s0, t0, d1], [s0, t1, d1], [s0, t1, d0]], [-1, 0, 0], tuile, ombre * 0.8);   // gauche
    this.quad([[s1, t0, d1], [s1, t0, d0], [s1, t1, d0], [s1, t1, d1]], [1, 0, 0], tuile, ombre * 0.8);    // droite
  }

  // Un trou dans le mur : les quatre ébrasements, de la profondeur `dr` (< 0)
  // au nu du mur, puis le fond à `dr`.
  creux(s0, s1, t0, t1, dr, tuileBord, tuileFond, ombreFond = 1, lueur = 0) {
    this.quad([[s0, t1, dr], [s1, t1, dr], [s1, t1, 0], [s0, t1, 0]], [0, -1, 0], tuileBord, 0.6);   // linteau
    this.quad([[s0, t0, 0], [s1, t0, 0], [s1, t0, dr], [s0, t0, dr]], [0, 1, 0], tuileBord, 0.9);    // appui
    this.quad([[s0, t0, 0], [s0, t0, dr], [s0, t1, dr], [s0, t1, 0]], [1, 0, 0], tuileBord, 0.8);   // ébrasement gauche
    this.quad([[s1, t0, dr], [s1, t0, 0], [s1, t1, 0], [s1, t1, dr]], [-1, 0, 0], tuileBord, 0.8);  // ébrasement droit
    this.plan(s0, s1, t0, t1, dr, tuileFond, ombreFond, lueur);
  }

  // Le mur autour d'un trou : quatre plans, au nu du mur.
  murAutour(s0, s1, t0, t1, tuile) {
    if (t0 > 0) this.plan(0, 1, 0, t0, 0, tuile);
    if (t1 < 1) this.plan(0, 1, t1, 1, 0, tuile);
    if (s0 > 0) this.plan(0, s0, t0, t1, 0, tuile);
    if (s1 < 1) this.plan(s1, 1, t0, t1, 0, tuile);
  }

  // Le garde-corps en fer forgé : un plan ajouré (alpha), vu des deux côtés.
  ferronnerie(s0, s1, t0, t1, d) {
    this.quad([[s0, t0, d], [s1, t0, d], [s1, t1, d], [s0, t1, d]], [0, 0, 1], 'fer', 1, 0,
      [[s0, 0], [s1, 0], [s1, 1], [s0, 1]]);
    this.quad([[s1, t0, d], [s0, t0, d], [s0, t1, d], [s1, t1, d]], [0, 0, -1], 'fer', 0.85, 0,
      [[s1, 0], [s0, 0], [s0, 1], [s1, 1]]);
  }

  // Une baie : le trou, le châssis (meneau et traverse), et la vitre.
  baie(s0, s1, t0, t1, allumee) {
    this.creux(s0, s1, t0, t1, -0.12, 'pierre-lisse', 'verre', 1, allumee ? 1 : 0);
    const dm = -0.06;
    const sm = (s0 + s1) / 2, tm = t0 + (t1 - t0) * 0.58;
    this.boite(sm - 0.018, sm + 0.018, t0, t1, -0.1, dm, 'menuiserie');
    this.boite(s0, s1, tm - 0.015, tm + 0.015, -0.1, dm, 'menuiserie');
    // le cadre, tout autour
    this.boite(s0, s0 + 0.022, t0, t1, -0.1, dm, 'menuiserie');
    this.boite(s1 - 0.022, s1, t0, t1, -0.1, dm, 'menuiserie');
    this.boite(s0, s1, t1 - 0.022, t1, -0.1, dm, 'menuiserie');
    this.boite(s0, s1, t0, t0 + 0.022, -0.1, dm, 'menuiserie');
  }
}

// --- les registres -------------------------------------------------------------------

// Les teintes de pierre d'un immeuble : crème, beige chaud, gris clair, blond.
const PIERRES = [[1.0, 0.97, 0.9], [0.98, 0.93, 0.82], [0.93, 0.93, 0.9], [1.0, 0.95, 0.85]];

function etage(f, r, allumee, noble) {
  const s0 = 0.31, s1 = 0.69, t0 = 0.14, t1 = 0.86;
  f.murAutour(s0, s1, t0, t1, 'pierre');
  f.baie(s0, s1, t0, t1, allumee);
  // l'appui de fenêtre, en saillie
  f.boite(s0 - 0.04, s1 + 0.04, t0 - 0.04, t0, 0, 0.05, 'pierre-lisse');
  if (noble) {
    // LE BALCON FILANT : la dalle sur toute la largeur, et sa ferronnerie.
    f.boite(0, 1, 0.08, 0.14, 0, 0.22, 'pierre-lisse');
    f.ferronnerie(0, 1, 0.14, 0.42, 0.22);
    // les consoles sous la dalle
    f.boite(0.12, 0.2, 0.0, 0.08, 0, 0.18, 'pierre-lisse');
    f.boite(0.8, 0.88, 0.0, 0.08, 0, 0.18, 'pierre-lisse');
  } else {
    // le garde-corps individuel : une lisse de fer devant la baie
    f.ferronnerie(s0 - 0.02, s1 + 0.02, t0, t0 + 0.24, 0.06);
    // le bandeau d'étage, une fine assise en saillie
    if (r > 0.5) f.boite(0, 1, 0.0, 0.03, 0, 0.03, 'pierre-lisse');
  }
}

function entresol(f, r, allumee) {
  const s0 = 0.33, s1 = 0.67, t0 = 0.28, t1 = 0.76;
  f.murAutour(s0, s1, t0, t1, 'pierre');
  f.baie(s0, s1, t0, t1, allumee);
  f.boite(s0 - 0.03, s1 + 0.03, t0 - 0.03, t0, 0, 0.04, 'pierre-lisse');
  // l'assise qui sépare le commerce de l'immeuble
  f.boite(0, 1, 0.0, 0.05, 0, 0.06, 'pierre-lisse');
}

function vitrine(f, r, allumee) {
  const s0 = 0.08, s1 = 0.92, t0 = 0.08, t1 = 0.78;
  f.murAutour(s0, s1, t0, t1, 'pierre');
  // la devanture : un grand vitrage en retrait, son châssis de bois peint
  f.creux(s0, s1, t0, t1, -0.14, 'menuiserie', 'verre', 1, allumee ? 1.2 : 0.35);
  f.boite(s0, s0 + 0.04, t0, t1, -0.12, -0.06, 'menuiserie');
  f.boite(s1 - 0.04, s1, t0, t1, -0.12, -0.06, 'menuiserie');
  f.boite(0.49, 0.51, t0, t1, -0.12, -0.06, 'menuiserie');
  // le bandeau d'enseigne, et le store au-dessus de la vitrine
  f.boite(0.02, 0.98, t1 + 0.02, 0.96, 0, 0.05, 'enseigne');
  if (r > 0.35) {
    const dt = 0.13;
    f.quad([[0.94, t1 + 0.02, 0], [0.06, t1 + 0.02, 0], [0.06, t1 - dt, 0.42], [0.94, t1 - dt, 0.42]], [0, 0.42, dt], 'store', 1);
    f.quad([[0.06, t1 + 0.02, 0], [0.94, t1 + 0.02, 0], [0.94, t1 - dt, 0.42], [0.06, t1 - dt, 0.42]], [0, -0.42, -dt], 'store', 0.7);
  }
  // le soubassement de pierre sombre
  f.boite(0, 1, 0, t0, 0, 0.03, 'granit');
}

function porte(f, r) {
  const s0 = 0.28, s1 = 0.72, t0 = 0.0, t1 = 0.84;
  f.murAutour(s0, s1, t0, t1, 'pierre');
  f.creux(s0, s1, t0, t1, -0.16, 'pierre-lisse', 'bois', 0.9);
  // l'imposte vitrée au-dessus des vantaux
  f.plan(s0, s1, t1 - 0.16, t1, -0.15, 'verre', 1, 0);
  // l'encadrement en saillie, et sa clé
  f.boite(s0 - 0.05, s0, t0, t1 + 0.05, 0, 0.05, 'pierre-lisse');
  f.boite(s1, s1 + 0.05, t0, t1 + 0.05, 0, 0.05, 'pierre-lisse');
  f.boite(s0 - 0.05, s1 + 0.05, t1, t1 + 0.06, 0, 0.06, 'pierre-lisse');
}

function chainage(f) {
  // les carreaux et boutisses alternés du chaînage d'angle
  f.plan(0, 1, 0, 1, 0, 'pierre-lisse');
  for (let i = 0; i < 4; i++) {
    const t0 = i / 4, t1 = (i + 1) / 4 - 0.02;
    if (i % 2 === 0) f.boite(0, 0.62, t0, t1, 0, 0.035, 'pierre-lisse');
    else f.boite(0.38, 1, t0, t1, 0, 0.035, 'pierre-lisse');
  }
}

function corniche(f) {
  // TROIS RESSAUTS ET UN RANG DE MODILLONS : c'est la ligne d'ombre qui
  // couronne la façade, celle qu'on lit de l'autre bout du boulevard.
  f.plan(0, 1, 0, 1, 0, 'pierre-lisse');
  f.boite(0, 1, 0.0, 0.3, 0, 0.08, 'pierre-lisse');
  f.boite(0, 1, 0.3, 0.6, 0, 0.18, 'pierre-lisse');
  f.boite(0, 1, 0.6, 0.78, 0, 0.3, 'pierre-lisse');
  f.boite(0, 1, 0.78, 1.0, 0, 0.36, 'pierre-lisse');
  for (let i = 0; i < 4; i++) {
    const s = 0.08 + i * 0.25;
    f.boite(s, s + 0.09, 0.32, 0.58, 0.18, 0.3, 'pierre-lisse', 0.9);
  }
}

function mansarde(f, r, allumee, lucarne) {
  // le brisis en zinc, et le chien-assis qui s'en détache
  f.plan(0, 1, 0, 1, 0, 'zinc');
  if (lucarne) {
    f.boite(0.3, 0.7, 0.06, 0.74, 0, 0.26, 'zinc', 0.95);
    f.boite(0.26, 0.74, 0.74, 0.82, 0, 0.3, 'zinc');
    f.plan(0.34, 0.66, 0.14, 0.66, 0.261, 'verre', 1, allumee ? 1 : 0);
    f.boite(0.34, 0.36, 0.14, 0.66, 0.26, 0.28, 'menuiserie');
    f.boite(0.64, 0.66, 0.14, 0.66, 0.26, 0.28, 'menuiserie');
    f.boite(0.49, 0.51, 0.14, 0.66, 0.26, 0.28, 'menuiserie');
  }
}

function murNu(f) {
  f.plan(0, 1, 0, 1, 0, 'pierre');
}

// --- l'entrée : une face de façade exposée --------------------------------------------

// `face` est une entrée de `FACES` (mesher.js) horizontale ; (x, y, z) le bloc en
// coordonnées locales du morceau ; (wx, wy, wz) en coordonnées du monde ;
// `ao` ses quatre coins d'occlusion, dans l'ordre du mailleur.
export function facadeHD(buf, face, x, y, z, wx, wy, wz, id, ao) {
  const info = infoFacadeParis(wx, wz);
  const graine = info ? info.graine : 0.5;
  const teinte = PIERRES[Math.floor(graine * PIERRES.length) % PIERRES.length];
  // Le courant : la coordonnée du monde le long de la face, pour que la
  // texture continue d'un bloc à l'autre.
  const courant = face.dir[0] !== 0 ? (face.dir[0] > 0 ? -wz : wz) : (face.dir[2] > 0 ? wx : -wx);
  const f = new Face(buf, face.dir, x, y, z, ao, teinte, courant);
  const r = tirage(wx, wz, 811);
  const allumee = vitreAllumee(wx, wy, wz);
  switch (id) {
    case ARCHI.ETAGE: etage(f, r, allumee, false); break;
    case ARCHI.NOBLE: etage(f, r, allumee, true); break;
    case ARCHI.ENTRESOL: entresol(f, r, allumee); break;
    case ARCHI.VITRINE: vitrine(f, graine, allumee); break;
    case ARCHI.PORTE: porte(f, r); break;
    case ARCHI.CHAINAGE: chainage(f); break;
    case ARCHI.CORNICHE: corniche(f); break;
    case ARCHI.MANSARDE: mansarde(f, r, allumee, true); break;
    case ARCHI.ZINC_LISSE: mansarde(f, r, allumee, false); break;
    default: murNu(f);
  }
}

// --- la rue : marquage et bordure ------------------------------------------------------

// Un quad horizontal, posé un cheveu au-dessus du sol, en coordonnées locales du
// morceau. `x0..x1`, `z0..z1` sont les bords, `y` la cote du dessus du bloc.
function dalle(buf, x0, x1, y, z0, z1, wx, wz, tuile, ombre, mat) {
  const rect = rectHD(tuile);
  const c = [ombre, ombre, ombre];
  const ids = [
    buf.sommet([x0, y, z1], [0, 1, 0], [wx + x0 - Math.floor(x0), wz + z1 - Math.floor(z1)], rect, c, mat, 0),
    buf.sommet([x1, y, z1], [0, 1, 0], [wx + x1 - Math.floor(x0), wz + z1 - Math.floor(z1)], rect, c, mat, 0),
    buf.sommet([x1, y, z0], [0, 1, 0], [wx + x1 - Math.floor(x0), wz + z0 - Math.floor(z1)], rect, c, mat, 0),
    buf.sommet([x0, y, z0], [0, 1, 0], [wx + x0 - Math.floor(x0), wz + z0 - Math.floor(z1)], rect, c, mat, 0),
  ];
  buf.quadIndices(ids[0], ids[1], ids[2], ids[3]);
}

// Le marquage d'une colonne de chaussée, tel qu'il est à Paris (`marquageParis`
// décide ; ici on ne fait que dessiner) :
//
// - le PASSAGE PIÉTON : une bande blanche de cinquante centimètres par bloc,
//   dans l'axe de la rue, un bloc sur deux en travers — les larges bandes que
//   tout enfant reconnaît depuis le trottoir ;
// - la LIGNE D'EFFET des feux : un pointillé EN TRAVERS de la chaussée, au bord
//   du bloc qui regarde le passage ;
// - la LIGNE AXIALE, en pointillés, sur les seuls boulevards à double sens.
export function marquageHD(buf, x, y, z, wx, wz) {
  const m = marquageParis(wx, wz);
  if (!m) return false;
  const yt = y + 1.006, ombre = 0.95;
  const mat = M.marquage;
  if (m.type === 'axe') {
    if (m.long === 'v') dalle(buf, x + 0.44, x + 0.56, yt, z + 0.25, z + 0.75, wx, wz, 'marquage', ombre, mat);
    else dalle(buf, x + 0.25, x + 0.75, yt, z + 0.44, z + 0.56, wx, wz, 'marquage', ombre, mat);
    return true;
  }
  if (m.type === 'ligne') {
    // 0,15 de large, posée au bord du bloc côté carrefour ; un tiret par bloc
    const e = 0.15;
    if (m.long === 'v') {
      const z0 = m.sens > 0 ? z + 1 - e : z;
      dalle(buf, x + 0.2, x + 0.8, yt, z0, z0 + e, wx, wz, 'marquage', ombre, mat);
    } else {
      const x0 = m.sens > 0 ? x + 1 - e : x;
      dalle(buf, x0, x0 + e, yt, z + 0.2, z + 0.8, wx, wz, 'marquage', ombre, mat);
    }
    return true;
  }
  // le passage : une bande de 0,5 au milieu du bloc, d'un bord à l'autre du bloc
  // dans l'axe de la rue — les blocs voisins en travers font l'espacement
  if (m.long === 'v') dalle(buf, x + 0.25, x + 0.75, yt, z, z + 1, wx, wz, 'marquage', ombre, mat);
  else dalle(buf, x, x + 1, yt, z + 0.25, z + 0.75, wx, wz, 'marquage', ombre, mat);
  return true;
}

// Une marche de granit : un pavé posé sur le bloc, de `h` de haut, entre
// (x0, z0) et (x1, z1) en coordonnées locales. `flancs` dit lesquels de ses
// quatre côtés se dessinent (un flanc collé au trottoir relevé serait invisible).
function marcheGranit(buf, x, y, z, wx, wz, x0, x1, z0, z1, h, flancs, dessus) {
  const rect = rectHD('granit');
  const mat = M.granit;
  const yt = y + 1;
  const c = [0.96, 0.96, 0.96], cf = [0.78, 0.78, 0.78];
  const uv = (px, pz) => [wx + px - x, wz + pz - z];
  if (dessus) {
    const i = [buf.sommet([x0, yt + h, z1], [0, 1, 0], uv(x0, z1), rect, c, mat, 0), buf.sommet([x1, yt + h, z1], [0, 1, 0], uv(x1, z1), rect, c, mat, 0),
      buf.sommet([x1, yt + h, z0], [0, 1, 0], uv(x1, z0), rect, c, mat, 0), buf.sommet([x0, yt + h, z0], [0, 1, 0], uv(x0, z0), rect, c, mat, 0)];
    buf.quadIndices(i[0], i[1], i[2], i[3]);
  }
  const flanc = (a, b, n) => {
    const j = [buf.sommet([a[0], yt, a[1]], n, [wx + a[0] - x + wz + a[1] - z, yt], rect, cf, mat, 0), buf.sommet([b[0], yt, b[1]], n, [wx + b[0] - x + wz + b[1] - z, yt], rect, cf, mat, 0),
      buf.sommet([b[0], yt + h, b[1]], n, [wx + b[0] - x + wz + b[1] - z, yt + h], rect, cf, mat, 0), buf.sommet([a[0], yt + h, a[1]], n, [wx + a[0] - x + wz + a[1] - z, yt + h], rect, cf, mat, 0)];
    buf.quadIndices(j[0], j[1], j[2], j[3]);
  };
  if (flancs.pz) flanc([x0, z1], [x1, z1], [0, 0, 1]);
  if (flancs.mz) flanc([x1, z0], [x0, z0], [0, 0, -1]);
  if (flancs.px) flanc([x1, z1], [x1, z0], [1, 0, 0]);
  if (flancs.mx) flanc([x0, z0], [x0, z1], [-1, 0, 0]);
}

// LA BORDURE DE PARIS. Le bloc de bordure porte, côté trottoir, la bordure de
// granit clair elle-même — une marche de `RELEVE` de haut et `LARGEUR_BORDURE`
// de large, à la cote du trottoir relevé — et, côté chaussée, le caniveau de
// pavés (la tuile plate du bloc, sous le marquage). `voisins` dit ce qu'il y a
// de chaque côté : `rue` (la chaussée : rien à poser, c'est le caniveau qui y
// donne), `bordure` (la bordure continue : rien non plus), ou autre chose (le
// trottoir, une place, un jardin) : la marche va de ce côté-là.
export const LARGEUR_BORDURE = 0.3;
export function bordureHD(buf, x, y, z, wx, wz, voisins) {
  const l = LARGEUR_BORDURE, h = RELEVE;
  // La marche court le long de chaque côté qui n'est ni rue ni bordure ; ses
  // flancs vers la rue se dessinent, ceux collés au trottoir non.
  const cote = (v) => v !== 'rue' && v !== 'bordure';
  const tous = { px: true, mx: true, pz: true, mz: true };
  if (cote(voisins.mx)) marcheGranit(buf, x, y, z, wx, wz, x, x + l, z, z + 1, h, { ...tous, mx: false }, true);
  if (cote(voisins.px)) marcheGranit(buf, x, y, z, wx, wz, x + 1 - l, x + 1, z, z + 1, h, { ...tous, px: false }, true);
  if (cote(voisins.mz)) marcheGranit(buf, x, y, z, wx, wz, x, x + 1, z, z + l, h, { ...tous, mz: false }, true);
  if (cote(voisins.pz)) marcheGranit(buf, x, y, z, wx, wz, x, x + 1, z + 1 - l, z + 1, h, { ...tous, pz: false }, true);
}

// LA JUPE DU TROTTOIR RELEVÉ : la face du trottoir est dessinée `RELEVE` au-dessus
// du bloc (`SOL_HD`) ; partout où le bloc voisin n'est pas relevé lui aussi — la
// chaussée sans bordure, l'herbe d'un square, une cour — la marche se ferme par
// une jupe de granit, sinon le trottoir flotterait d'un dixième. `ouverts` dit
// de quels côtés.
export function trottoirHD(buf, x, y, z, wx, wz, ouverts) {
  marcheGranit(buf, x, y, z, wx, wz, x, x + 1, z, z + 1, RELEVE, ouverts, false);
}
