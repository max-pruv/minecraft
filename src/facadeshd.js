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
  // la PR2 (v288) : les quartiers, les arbres, le mobilier
  'enduit',        // l'enduit des vieux quartiers, grain fin, un peu lépreux
  'volet',         // le volet de bois à persiennes, peint
  'ecorce',        // le fût d'un arbre
  'feuillage',     // la couronne (alpha) : des feuilles, du ciel entre elles
  'fonte',         // la fonte peinte des potelets et des pieds de table
  'plaque',        // la plaque de rue, bleue à liseré vert et lettres blanches
  'rotin',         // le cannage des chaises de terrasse
  // la PR2, suite (v289) : le comble et le mobilier
  'affiche',       // les affiches d'une colonne Morris, deux par hauteur
  'lattes',        // les lattes de bois d'un banc Davioud
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

// LE TOIT (v289) : les blocs de comble sont dessinés par la couche comme un
// CHAMP DE HAUTEURS lissé sur les colonnes (`toitDessusHD`), avec un brisis
// raide au premier rang — le comble à la Mansart — et toutes leurs faces (le
// dessus comme les côtés) partent dans `plat`, jamais dans `solid` : une face
// plate dessinée par-dessus la pente la coifferait d'une casquette.
export const TOIT_HD = new Set([ARCHI.ZINC_LISSE, ARCHI.MANSARDE]);

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
export const tirageHD = tirage;

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
  enduit: [0.9, 0.0],
  volet: [0.72, 0.0],
  ecorce: [0.96, 0.0],
  feuillage: [0.85, 0.0],
  fonte: [0.5, 0.6],
  plaque: [0.45, 0.15],
  rotin: [0.8, 0.0],
  affiche: [0.75, 0.0],
  lattes: [0.7, 0.0],
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

// LES QUARTIERS ONT CHACUN LEUR REGISTRE (v288). Une façade du Marais n'est pas
// une façade de Monceau : la première est un mur d'enduit percé de petites
// baies à volets de bois, sans balcon filant ni store ; la seconde est de la
// pierre de taille avec ses balcons continus. Le quartier vient de la MÊME
// trame que le voxel (`infoFacadeParis`), et c'est le style qui décide du mur,
// des baies, des volets et des ornements. Quatre styles :
//
//   haussmann  — pierre de taille, balcons filants, stores : l'ouest et le
//                Paris ordinaire (Haussmann, Étoile, Monceau, Passy,
//                Saint-Germain) ;
//   ancien     — enduit ocre, crème ou gris, baies étroites, volets à
//                persiennes, corniche simple : le Marais, le Quartier latin ;
//   village    — l'enduit pastel et les volets de Montmartre, sur trois
//                étages ;
//   faubourg   — enduit crème, garde-corps simples, devantures sans store :
//                Belleville, le faubourg Saint-Antoine.
//
// Les TEINTES se tirent par îlot (la graine d'`infoFacadeParis`), jamais par
// colonne : un immeuble a une couleur.
const PIERRES = [[1.0, 0.97, 0.9], [0.98, 0.93, 0.82], [0.93, 0.93, 0.9], [1.0, 0.95, 0.85]];
const ENDUITS_ANCIEN = [[0.96, 0.86, 0.66], [0.98, 0.94, 0.84], [0.86, 0.85, 0.82], [0.95, 0.82, 0.7], [0.9, 0.88, 0.78]];
const ENDUITS_VILLAGE = [[0.98, 0.9, 0.78], [0.94, 0.86, 0.88], [0.88, 0.92, 0.86], [0.98, 0.95, 0.86]];
const ENDUITS_FAUBOURG = [[0.96, 0.93, 0.84], [0.9, 0.88, 0.82], [0.98, 0.9, 0.78]];

export const STYLES = {
  haussmann: { mur: 'pierre', teintes: PIERRES, baie: [0.31, 0.69, 0.14, 0.86], volets: false, filant: true, store: true, corniche: 3 },
  ancien: { mur: 'enduit', teintes: ENDUITS_ANCIEN, baie: [0.36, 0.64, 0.18, 0.82], volets: true, filant: false, store: false, corniche: 1 },
  village: { mur: 'enduit', teintes: ENDUITS_VILLAGE, baie: [0.36, 0.64, 0.2, 0.82], volets: true, filant: false, store: false, corniche: 1 },
  faubourg: { mur: 'enduit', teintes: ENDUITS_FAUBOURG, baie: [0.32, 0.68, 0.16, 0.86], volets: false, filant: false, store: false, corniche: 2 },
};
const STYLE_DU_QUARTIER = {
  'Marais': 'ancien', 'Quartier latin': 'ancien', 'Montmartre': 'village',
  'Belleville': 'faubourg', 'Faubourg Saint-Antoine': 'faubourg',
};
export function styleDuQuartier(nom) {
  return STYLES[STYLE_DU_QUARTIER[nom] || 'haussmann'];
}

// Les volets à persiennes, ouverts de part et d'autre de la baie : deux
// boîtes minces au nu du mur, la persienne dessinée dans la tuile.
function volets(f, s0, s1, t0, t1) {
  const l = Math.min(0.14, s0 - 0.02);
  f.boite(s0 - l, s0 - 0.01, t0, t1, 0, 0.03, 'volet', 0.95);
  f.boite(s1 + 0.01, s1 + l, t0, t1, 0, 0.03, 'volet', 0.95);
}

function etage(f, r, allumee, noble, st) {
  const [s0, s1, t0, t1] = st.baie;
  f.murAutour(s0, s1, t0, t1, st.mur);
  f.baie(s0, s1, t0, t1, allumee);
  // l'appui de fenêtre, en saillie
  f.boite(s0 - 0.04, s1 + 0.04, t0 - 0.04, t0, 0, 0.05, 'pierre-lisse');
  if (st.volets) volets(f, s0, s1, t0, t1);
  if (noble && st.filant) {
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
    if (r > 0.5 && st.filant) f.boite(0, 1, 0.0, 0.03, 0, 0.03, 'pierre-lisse');
  }
}

function entresol(f, r, allumee, st) {
  const s0 = 0.33, s1 = 0.67, t0 = 0.28, t1 = 0.76;
  f.murAutour(s0, s1, t0, t1, st.mur);
  f.baie(s0, s1, t0, t1, allumee);
  f.boite(s0 - 0.03, s1 + 0.03, t0 - 0.03, t0, 0, 0.04, 'pierre-lisse');
  if (st.volets) volets(f, s0, s1, t0, t1);
  // l'assise qui sépare le commerce de l'immeuble
  f.boite(0, 1, 0.0, 0.05, 0, 0.06, 'pierre-lisse');
}

function vitrine(f, r, allumee, st) {
  const s0 = 0.08, s1 = 0.92, t0 = 0.08, t1 = 0.78;
  f.murAutour(s0, s1, t0, t1, st.mur);
  // la devanture : un grand vitrage en retrait, son châssis de bois peint
  f.creux(s0, s1, t0, t1, -0.14, 'menuiserie', 'verre', 1, allumee ? 1.2 : 0.35);
  f.boite(s0, s0 + 0.04, t0, t1, -0.12, -0.06, 'menuiserie');
  f.boite(s1 - 0.04, s1, t0, t1, -0.12, -0.06, 'menuiserie');
  f.boite(0.49, 0.51, t0, t1, -0.12, -0.06, 'menuiserie');
  // le bandeau d'enseigne, et le store au-dessus de la vitrine
  f.boite(0.02, 0.98, t1 + 0.02, 0.96, 0, 0.05, 'enseigne');
  if (st.store && r > 0.35) {
    const dt = 0.13;
    f.quad([[0.94, t1 + 0.02, 0], [0.06, t1 + 0.02, 0], [0.06, t1 - dt, 0.42], [0.94, t1 - dt, 0.42]], [0, 0.42, dt], 'store', 1);
    f.quad([[0.06, t1 + 0.02, 0], [0.94, t1 + 0.02, 0], [0.94, t1 - dt, 0.42], [0.06, t1 - dt, 0.42]], [0, -0.42, -dt], 'store', 0.7);
  }
  // le soubassement de pierre sombre
  f.boite(0, 1, 0, t0, 0, 0.03, 'granit');
}

function porte(f, r, st) {
  const s0 = 0.28, s1 = 0.72, t0 = 0.0, t1 = 0.84;
  f.murAutour(s0, s1, t0, t1, st.mur);
  f.creux(s0, s1, t0, t1, -0.16, 'pierre-lisse', 'bois', 0.9);
  // l'imposte vitrée au-dessus des vantaux
  f.plan(s0, s1, t1 - 0.16, t1, -0.15, 'verre', 1, 0);
  // l'encadrement en saillie, et sa clé
  f.boite(s0 - 0.05, s0, t0, t1 + 0.05, 0, 0.05, 'pierre-lisse');
  f.boite(s1, s1 + 0.05, t0, t1 + 0.05, 0, 0.05, 'pierre-lisse');
  f.boite(s0 - 0.05, s1 + 0.05, t1, t1 + 0.06, 0, 0.06, 'pierre-lisse');
}

// La plaque de rue : bleue, à liseré vert, sur le chaînage d'angle du premier
// étage — au coin de chaque immeuble, comme dans la vraie ville.
function plaqueDeRue(f) {
  f.boite(0.2, 0.8, 0.5, 0.86, 0.035, 0.05, 'plaque', 1);
}

function chainage(f, st, plaque) {
  // les carreaux et boutisses alternés du chaînage d'angle
  f.plan(0, 1, 0, 1, 0, st.mur === 'pierre' ? 'pierre-lisse' : st.mur);
  if (st.mur === 'pierre') {
    for (let i = 0; i < 4; i++) {
      const t0 = i / 4, t1 = (i + 1) / 4 - 0.02;
      if (i % 2 === 0) f.boite(0, 0.62, t0, t1, 0, 0.035, 'pierre-lisse');
      else f.boite(0.38, 1, t0, t1, 0, 0.035, 'pierre-lisse');
    }
  }
  if (plaque) plaqueDeRue(f);
}

function corniche(f, st) {
  f.plan(0, 1, 0, 1, 0, 'pierre-lisse');
  if (st.corniche >= 3) {
    // TROIS RESSAUTS ET UN RANG DE MODILLONS : c'est la ligne d'ombre qui
    // couronne la façade, celle qu'on lit de l'autre bout du boulevard.
    f.boite(0, 1, 0.0, 0.3, 0, 0.08, 'pierre-lisse');
    f.boite(0, 1, 0.3, 0.6, 0, 0.18, 'pierre-lisse');
    f.boite(0, 1, 0.6, 0.78, 0, 0.3, 'pierre-lisse');
    f.boite(0, 1, 0.78, 1.0, 0, 0.36, 'pierre-lisse');
    for (let i = 0; i < 4; i++) {
      const s = 0.08 + i * 0.25;
      f.boite(s, s + 0.09, 0.32, 0.58, 0.18, 0.3, 'pierre-lisse', 0.9);
    }
  } else if (st.corniche === 2) {
    f.boite(0, 1, 0.0, 0.5, 0, 0.1, 'pierre-lisse');
    f.boite(0, 1, 0.5, 1.0, 0, 0.22, 'pierre-lisse');
  } else {
    // la corniche des vieux quartiers : une simple avancée de toit
    f.plan(0, 1, 0, 0.7, 0, st.mur);
    f.boite(0, 1, 0.7, 1.0, 0, 0.2, 'pierre-lisse');
  }
}

// LE COMBLE À LA MANSART (v289). Le voxel pose le toit en marches : la colonne
// de façade porte un rang de zinc, celle d'un pas en arrière deux, et ainsi de
// suite (`batirColonneParis`). La couche lit ces marches et les dessine en
// PENTES, sans poser un bloc :
//
//   - le premier rang (le bloc sous lui n'est pas du toit) est le BRISIS, la
//     pente raide du comble : de l'arête de la corniche jusqu'à `RETRAIT` en
//     arrière, et il monte jusqu'au BORD du champ de hauteurs — un bloc, un
//     bloc et demi, deux, selon ce que les colonnes voisines portent ; c'est là
//     que s'ouvre le chien-assis ;
//   - au-dessus, le TERRASSON n'est plus une pente par face : c'est le champ de
//     hauteurs de `toitDessusHD`, un quad par colonne, dont les coins sont la
//     moyenne des sommets des colonnes voisines du même immeuble. Une face de
//     terrasson n'émet donc RIEN de près — la surface passe au-dessus d'elle.
//
// Le repère du brisis : `t` en hauteur, `d` en saillie, négatif en retrait —
// la pente monte vers les `d` négatifs.
//
// ET UN COIN SE COUPE EN CROUPE. Au coin d'un îlot, le bloc de brisis a DEUX
// côtés exposés ; deux pentes pleines s'y croiseraient en X et feraient un
// creux — vu en capture : des toits en cristaux, une dent à chaque coin. Le
// sommet de la pente recule de `RETRAIT` en `s` du côté exposé, sur la
// diagonale qui va du coin bas extérieur au coin haut intérieur : c'est ce
// qu'on appelle une croupe, et c'est le même coin que le champ de hauteurs
// rentre. `coins` dit quel côté (s = 0, s = 1) est exposé.
//
// TROIS REMÈDES PAR FACE ONT ÉTÉ ÉCRITS AVANT CELUI-CI, ET DEUX NE CHANGEAIENT
// RIEN À L'IMAGE : le faîte au milieu du bloc quand la face opposée est à
// l'air, puis une file verticale de faces qui partage une pente. La sonde
// `sonde-ailerons` a montré que les ailerons vus en capture étaient le voxel
// lui-même lu par face : sur une trame tournée, les rangs sont des bandes
// diagonales en escalier, et aucune règle par face ne les lisse. Voir le
// champ de hauteurs, plus bas.
const RETRAIT = 0.35;
function toit(f, r, allumee, lucarne, brisis, coins, h0, h1) {
  // au-dessus du brisis, c'est le champ de hauteurs (`toitDessusHD`) qui
  // dessine : une face de terrasson n'émet rien de près
  if (!brisis) return;
  const R = RETRAIT;
  const H1 = [coins.s1 ? 1 - R : 1, h1, -R], H0 = [coins.s0 ? R : 0, h0, -R];
  const uv = [[0, 0], [1, 0], [H1[0], h1], [H0[0], h0]];
  f.quad([[0, 0, 0], [1, 0, 0], H1, H0], [0, RETRAIT, 1], 'zinc', 1, 0, uv);
  if (lucarne && h0 > 0.9 && h1 > 0.9) chienAssis(f, allumee);
}

// --- le champ de hauteurs du toit ---------------------------------------------------
//
// LE TOIT EST UN CHAMP DE HAUTEURS LISSÉ SUR LES COLONNES, PAS UNE PENTE PAR
// FACE. La trame du Marais est tournée de 24° par rapport au monde : les rangs
// de zinc du voxel n'y sont pas des anneaux emboîtés mais des BANDES
// DIAGONALES en escalier, et une pente par face de bloc rendait ce champ de
// marches en tentes pointues — vu en capture, un hérisson, et c'est une sonde
// (`sonde-ailerons`) qui a nommé le cas après deux remèdes par face qui ne
// changeaient rien à l'image. Le squelette est bon, la lecture par face ne
// l'est pas. La hauteur d'un COIN de colonne est la moyenne des sommets des
// colonnes de toit du même immeuble qui le partagent : sur un escalier
// diagonal, cette moyenne est un plan oblique — le toit suit la trame quelle
// que soit sa rotation, et il lit les blocs, il n'en écrit aucun.
//
// Chaque colonne de toit dessine UN quad (ses quatre coins), en retrait de
// 0,35 sur les côtés où l'immeuble s'arrête : c'est là que le brisis monte
// depuis la corniche jusqu'à ces mêmes coins (`toit` ci-dessus lit les mêmes
// hauteurs), et une face de terrasson n'émet rien — la surface passe au-dessus.

// le dessus (y local + 1) du plus haut bloc de toit d'une colonne, cherché
// autour de y0, ou null si la colonne n'a pas de toit
function sommetToit(get, x, z, y0) {
  for (let y = y0 + 2; y >= y0 - 2; y--) if (TOIT_HD.has(get(x, y, z))) return y + 1;
  return null;
}

// l'immeuble d'une colonne (l'îlot et la travée que `formeParis` publie), mémoïsé :
// un coin partagé entre deux immeubles de hauteurs différentes ne lisse pas l'un
// sur l'autre
const cacheImmeuble = new Map();
function immeuble(wx, wz) {
  const k = wx * 65536 + wz;
  let v = cacheImmeuble.get(k);
  if (v === undefined) {
    if (cacheImmeuble.size > 8192) cacheImmeuble.clear();
    const info = infoFacadeParis(wx, wz);
    v = info ? `${info.ai},${info.bi}` : '';
    cacheImmeuble.set(k, v);
  }
  return v;
}

// une colonne voisine porte-t-elle le MÊME toit (du toit, et du même immeuble) ?
function memeToit(get, x, z, y0, wx, wz, moi) {
  return sommetToit(get, x, z, y0) !== null && immeuble(wx, wz) === moi;
}

// la hauteur d'un coin (cx, cz) : la moyenne des sommets des colonnes du même
// toit qui le partagent — au moins la colonne courante
function hauteurCoin(get, cx, cz, y0, wcx, wcz, moi) {
  let s = 0, n = 0;
  for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
    if (!memeToit(get, cx + dx, cz + dz, y0, wcx + dx, wcz + dz, moi)) continue;
    s += sommetToit(get, cx + dx, cz + dz, y0); n++;
  }
  return n ? s / n : y0 + 1;
}

// le quad d'une colonne de toit dont le dessus est à l'air ; (x, y, z) le bloc
// de toit, local ; (wx, wz) en coordonnées du monde
export function toitDessusHD(buf, x, y, z, wx, wz, get) {
  const moi = immeuble(wx, wz);
  const libre = (dx, dz) => !memeToit(get, x + dx, z + dz, y, wx + dx, wz + dz, moi);
  const ix0 = libre(-1, 0) ? RETRAIT : 0, ix1 = libre(1, 0) ? 1 - RETRAIT : 1;
  const iz0 = libre(0, -1) ? RETRAIT : 0, iz1 = libre(0, 1) ? 1 - RETRAIT : 1;
  const h = (dx, dz) => hauteurCoin(get, x + dx, z + dz, y, wx + dx, wz + dz, moi);
  const p00 = [x + ix0, h(0, 0), z + iz0], p10 = [x + ix1, h(1, 0), z + iz0];
  const p11 = [x + ix1, h(1, 1), z + iz1], p01 = [x + ix0, h(0, 1), z + iz1];
  // la normale : le produit vectoriel des diagonales, vers le haut
  const d1 = [p11[0] - p00[0], p11[1] - p00[1], p11[2] - p00[2]];
  const d2 = [p01[0] - p10[0], p01[1] - p10[1], p01[2] - p10[2]];
  const n = [d2[1] * d1[2] - d2[2] * d1[1], d2[2] * d1[0] - d2[0] * d1[2], d2[0] * d1[1] - d2[1] * d1[0]];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  n[0] /= l; n[1] /= l; n[2] /= l;
  const info = infoFacadeParis(wx, wz);
  const st = styleDuQuartier(info ? info.quartier : '');
  const teinte = st.teintes[Math.floor((info ? info.graine : 0.5) * st.teintes.length) % st.teintes.length];
  // une pente unie, un peu plus claire vers le soleil (comme le terrasson d'avant)
  const ombre = 0.96;
  const ids = [p01, p11, p10, p00].map((p) => sommetLibre(buf, p, n, [p[0], p[2]], 'zinc', teinte, ombre));
  buf.quadIndices(ids[0], ids[1], ids[2], ids[3]);
}

// LE CHIEN-ASSIS : la lucarne qui sort du brisis, un fronton de zinc à face
// verticale, deux joues qui rejoignent la pente, un petit toit, et sa fenêtre
// à croisillons qui s'allume la nuit comme les autres.
function chienAssis(f, allumee) {
  const dS = (t) => -RETRAIT * t;         // la profondeur du brisis à la hauteur t
  const s0 = 0.3, s1 = 0.7, t0 = 0.06, t1 = 0.66, dF = -0.08;
  f.plan(s0, s1, t0, t1, dF, 'zinc', 0.95);                                                          // le fronton
  f.quad([[s0, t0, dS(t0)], [s0, t0, dF], [s0, t1, dF], [s0, t1, dS(t1)]], [-1, 0, 0], 'zinc', 0.8);   // joue gauche
  f.quad([[s1, t0, dF], [s1, t0, dS(t0)], [s1, t1, dS(t1)], [s1, t1, dF]], [1, 0, 0], 'zinc', 0.8);    // joue droite
  const tT = 0.8;
  f.quad([[s0 - 0.03, tT, dS(tT)], [s0 - 0.03, t1, dF], [s1 + 0.03, t1, dF], [s1 + 0.03, tT, dS(tT)]], [0, 1, 0.6], 'zinc', 1); // le petit toit
  f.plan(0.36, 0.64, 0.14, 0.58, dF + 0.004, 'verre', 1, allumee ? 1 : 0);
  f.boite(0.36, 0.38, 0.14, 0.58, dF, dF + 0.02, 'menuiserie');
  f.boite(0.62, 0.64, 0.14, 0.58, dF, dF + 0.02, 'menuiserie');
  f.boite(0.49, 0.51, 0.14, 0.58, dF, dF + 0.02, 'menuiserie');
  f.boite(0.36, 0.64, 0.35, 0.37, dF, dF + 0.02, 'menuiserie');
}

function murNu(f, st) {
  f.plan(0, 1, 0, 1, 0, st.mur);
}

// --- l'entrée : une face de façade exposée --------------------------------------------

// `face` est une entrée de `FACES` (mesher.js) horizontale ; (x, y, z) le bloc en
// coordonnées locales du morceau ; (wx, wy, wz) en coordonnées du monde ;
// `ao` ses quatre coins d'occlusion, dans l'ordre du mailleur ; `bas` le bloc
// juste en dessous (la plaque de rue va sur le PREMIER chaînage au-dessus du
// rez-de-chaussée ; un rang de zinc sur autre chose que du zinc est le brisis),
// `haut` le bloc juste au-dessus (la terrasse d'une marche de toit ne se
// dessine que si rien ne la couvre) ; `get(x, y, z)` lit un bloc voisin en
// local (un coin de toit se coupe en croupe quand le côté est à l'air).
export function facadeHD(buf, face, x, y, z, wx, wy, wz, id, ao, bas = BLOCK.AIR, haut = BLOCK.AIR, get = null) {
  const info = infoFacadeParis(wx, wz);
  const graine = info ? info.graine : 0.5;
  const st = styleDuQuartier(info ? info.quartier : '');
  const teinte = st.teintes[Math.floor(graine * st.teintes.length) % st.teintes.length];
  // Le courant : la coordonnée du monde le long de la face, pour que la
  // texture continue d'un bloc à l'autre.
  const courant = face.dir[0] !== 0 ? (face.dir[0] > 0 ? -wz : wz) : (face.dir[2] > 0 ? wx : -wx);
  const f = new Face(buf, face.dir, x, y, z, ao, teinte, courant);
  const r = tirage(wx, wz, 811);
  const allumee = vitreAllumee(wx, wy, wz);
  switch (id) {
    case ARCHI.ETAGE: etage(f, r, allumee, false, st); break;
    case ARCHI.NOBLE: etage(f, r, allumee, true, st); break;
    case ARCHI.ENTRESOL: entresol(f, r, allumee, st); break;
    case ARCHI.VITRINE: vitrine(f, graine, allumee, st); break;
    case ARCHI.PORTE: porte(f, r, st); break;
    case ARCHI.CHAINAGE: chainage(f, st, bas !== ARCHI.CHAINAGE); break;
    case ARCHI.CORNICHE: corniche(f, st); break;
    case ARCHI.MANSARDE:
    case ARCHI.ZINC_LISSE: {
      // les côtés le long de la face : au-delà de s = 1 c'est +S, au-delà de s = 0 c'est −S
      const brisis = !TOIT_HD.has(bas);
      // un bloc de toit qui porte autre chose que du toit ou de l'air (une
      // cheminée) garde un mur de zinc : le champ de hauteurs passe à côté
      if (!brisis && haut !== BLOCK.AIR) { f.plan(0, 1, 0, 1, 0, 'zinc', 0.9); break; }
      if (!brisis || !get) break;
      const S = f.S;
      const coins = {
        s1: get(x + S[0], y, z + S[2]) === BLOCK.AIR,
        s0: get(x - S[0], y, z - S[2]) === BLOCK.AIR,
      };
      // le brisis monte jusqu'aux coins du champ de hauteurs : la hauteur de
      // chacun de ses deux coins hauts est celle que `toitDessusHD` leur donne
      const moi = immeuble(wx, wz);
      const c0 = f.p(0, 0, 0), c1 = f.p(1, 0, 0);
      const hc = (c) => hauteurCoin(get, Math.round(c[0]), Math.round(c[2]), y, wx + Math.round(c[0]) - x, wz + Math.round(c[2]) - z, moi) - y;
      toit(f, r, allumee, id === ARCHI.MANSARDE, brisis, coins, hc(c0), hc(c1));
      break;
    }
    default: murNu(f, st);
  }
}

// --- les arbres et le mobilier : des maillages dans `facades` ------------------------

// Un sommet libre dans le tampon HD, en coordonnées locales du morceau ; les UV
// sont donnés en unités du monde et repliés dans la tuile par le shader.
function sommetLibre(buf, p, n, uv, tuile, teinte, ombre, lueur = 0) {
  return buf.sommet(p, n, uv, rectHD(tuile), [teinte[0] * ombre, teinte[1] * ombre, teinte[2] * ombre], M[tuile] || M.pierre, lueur);
}

// Un cylindre debout à `n` pans, de rayon `r0` en bas et `r1` en haut, entre
// y0 et y1, centré en (cx, cz). Sans fond ni couvercle sauf demande.
function cylindre(buf, cx, cz, y0, y1, r0, r1, n, tuile, teinte, ombre, couvercle = false) {
  const anneau = (y, r) => {
    const ids = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const nx = Math.cos(a), nz = Math.sin(a);
      ids.push(sommetLibre(buf, [cx + nx * r, y, cz + nz * r], [nx, 0, nz], [(i / n) * 2, y], tuile, teinte, ombre * (0.75 + 0.25 * (nx * 0.6 + 0.8))));
    }
    return ids;
  };
  const bas = anneau(y0, r0), haut = anneau(y1, r1);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    buf.quadIndices(bas[i], bas[j], haut[j], haut[i]);
  }
  if (couvercle) {
    const c = sommetLibre(buf, [cx, y1, cz], [0, 1, 0], [cx, cz], tuile, teinte, ombre);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = sommetLibre(buf, [cx + Math.cos((i / n) * Math.PI * 2) * r1, y1, cz + Math.sin((i / n) * Math.PI * 2) * r1], [0, 1, 0], [0, 0], tuile, teinte, ombre);
      const b = sommetLibre(buf, [cx + Math.cos((j / n) * Math.PI * 2) * r1, y1, cz + Math.sin((j / n) * Math.PI * 2) * r1], [0, 1, 0], [0, 0], tuile, teinte, ombre);
      buf.indices.push(c, b, a);
    }
  }
}

// Une boîte alignée sur les axes, en coordonnées locales, six faces.
function pave(buf, x0, x1, y0, y1, z0, z1, tuile, teinte, ombre) {
  const F = [
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]],
    [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]],
    [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]],
    [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]],
    [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]],
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]],
  ];
  for (const [a, b, c, d, n] of F) {
    const o = n[1] > 0 ? ombre : n[1] < 0 ? ombre * 0.5 : ombre * 0.85;
    const uv = (p) => (n[1] !== 0 ? [p[0], p[2]] : n[0] !== 0 ? [p[2], p[1]] : [p[0], p[1]]);
    const ids = [a, b, c, d].map((p) => sommetLibre(buf, p, n, uv(p), tuile, teinte, o));
    buf.quadIndices(ids[0], ids[1], ids[2], ids[3]);
  }
}

// L'ARBRE. Le voxel plante un fût de blocs de bois et une couronne de blocs de
// feuilles ; de loin ils restent ce qu'ils sont (dans `plat`). De près, on
// dessine un arbre : un fût à huit pans qui s'effile, et une couronne
// ellipsoïdale de feuillage ajouré (alpha) qui ÉPOUSE la boîte des feuilles —
// c'est la boîte qui décide, donc un marronnier d'avenue et un arbre de square
// n'ont pas la même couronne. Les rayons ondulent d'un sommet à l'autre, sans
// quoi la couronne est un œuf.
//
// (x, y, z) : la base du tronc, locale ; `h` la hauteur de bois ; `boite` les
// feuilles : { x0, x1, y0, y1, z0, z1 } en local, bornes incluses.
const VERTS = [[0.55, 0.72, 0.3], [0.5, 0.66, 0.28], [0.62, 0.74, 0.34], [0.48, 0.62, 0.3]];
export function arbreHD(buf, x, y, z, wx, wz, h, boite) {
  const g = tirage(wx, wz, 909);
  const cx = x + 0.5, cz = z + 0.5;
  // LA COURONNE EST CENTRÉE SUR SON TRONC, et ses rayons sont bornés : sur les
  // Champs-Élysées les marronniers sont plantés tous les trois blocs, et une
  // boîte qui avale les feuilles du voisin faisait de la rangée une HAIE plate
  // de sept blocs de large (première capture). Un peu plus haute que large,
  // comme un arbre d'alignement taillé.
  const rx = Math.min(2.2, Math.max(1.3, (boite.x1 - boite.x0 + 1) / 2)) + 0.2 + g * 0.2;
  const rz = Math.min(2.2, Math.max(1.3, (boite.z1 - boite.z0 + 1) / 2)) + 0.2 + (1 - g) * 0.2;
  const cy = (boite.y0 + boite.y1 + 1) / 2 + 0.2, ry = Math.max(1.6, (boite.y1 - boite.y0 + 1) / 2 + 0.3) * 1.15;
  const ccx = cx, ccz = cz;
  // le fût, jusque dans la couronne
  cylindre(buf, cx, cz, y, cy, 0.2 + g * 0.06, 0.1, 8, 'ecorce', [1, 1, 1], 1);
  // deux branches maîtresses qui partent dans la couronne
  cylindre(buf, cx + 0.1, cz - 0.1, cy - ry * 0.5, cy + ry * 0.4, 0.08, 0.03, 5, 'ecorce', [1, 1, 1], 0.9);
  cylindre(buf, cx - 0.12, cz + 0.08, cy - ry * 0.4, cy + ry * 0.5, 0.08, 0.03, 5, 'ecorce', [1, 1, 1], 0.9);
  // la couronne : un ellipsoïde à 8 méridiens et 5 parallèles, rayons ondulés
  const vert = VERTS[Math.floor(g * VERTS.length) % VERTS.length];
  const NM = 8, NP = 5;
  const anneaux = [];
  for (let p = 0; p <= NP; p++) {
    const phi = -Math.PI / 2 + (p / NP) * Math.PI;
    const ids = [];
    for (let m = 0; m < NM; m++) {
      const th = (m / NM) * Math.PI * 2 + (p % 2) * (Math.PI / NM);
      const ond = 1 + (tirage(wx * 7 + m, wz * 5 + p, 913) - 0.5) * 0.28;
      const px = ccx + Math.cos(phi) * Math.cos(th) * rx * ond;
      const pz = ccz + Math.cos(phi) * Math.sin(th) * rz * ond;
      const py = cy + Math.sin(phi) * ry * (p === 0 ? 0.85 : ond);
      const n = [Math.cos(phi) * Math.cos(th), Math.sin(phi), Math.cos(phi) * Math.sin(th)];
      // le dessous plus sombre, le dessus au soleil
      const ombre = 0.62 + 0.38 * (Math.sin(phi) * 0.5 + 0.5);
      ids.push(sommetLibre(buf, [px, py, pz], n, [wx + (m / NM) * 3, (p / NP) * 3], 'feuillage', vert, ombre));
    }
    anneaux.push(ids);
  }
  for (let p = 0; p < NP; p++) {
    for (let m = 0; m < NM; m++) {
      const j = (m + 1) % NM;
      buf.quadIndices(anneaux[p][m], anneaux[p][j], anneaux[p + 1][j], anneaux[p + 1][m]);
    }
  }
}

// LE POTELET : la borne de fonte à tête ronde qui borde tout trottoir de
// Paris, au bord du caniveau, une tous les deux blocs. `cote` dit de quel côté
// est la rue ('px', 'mx', 'pz', 'mz').
const FONTE = [0.16, 0.2, 0.18];
export function poteletHD(buf, x, y, z, cote) {
  const d = 0.3;
  const cx = x + (cote === 'px' ? 1 - d : cote === 'mx' ? d : 0.5);
  const cz = z + (cote === 'pz' ? 1 - d : cote === 'mz' ? d : 0.5);
  const yt = y + 1 + RELEVE;
  cylindre(buf, cx, cz, yt, yt + 0.82, 0.05, 0.045, 6, 'fonte', FONTE, 1);
  cylindre(buf, cx, cz, yt + 0.82, yt + 0.9, 0.07, 0.04, 6, 'fonte', FONTE, 1, true);
}

// LA TERRASSE DE CAFÉ : une table ronde à pied de fonte et deux chaises de
// cannage, sur le trottoir devant une devanture. `vers` est la direction de la
// façade ([dx, dz]) : les chaises lui tournent le dos.
const ROTIN = [1, 1, 1];
export function terrasseHD(buf, x, y, z, wx, wz, vers) {
  const yt = y + 1 + RELEVE;
  const cx = x + 0.5 - vers[0] * 0.05, cz = z + 0.5 - vers[1] * 0.05;
  // la table : un pied, un plateau rond
  cylindre(buf, cx, cz, yt, yt + 0.68, 0.03, 0.03, 5, 'fonte', FONTE, 1);
  cylindre(buf, cx, cz, yt, yt + 0.03, 0.16, 0.16, 8, 'fonte', FONTE, 1, true);
  cylindre(buf, cx, cz, yt + 0.68, yt + 0.72, 0.28, 0.28, 10, 'fonte', [0.9, 0.9, 0.9], 1, true);
  // deux chaises, de part et d'autre de la table le long de la façade
  const lx = -vers[1], lz = vers[0];
  for (const k of [-1, 1]) {
    const sx = cx + lx * 0.34 * k, sz = cz + lz * 0.34 * k;
    pave(buf, sx - 0.16, sx + 0.16, yt + 0.4, yt + 0.44, sz - 0.16, sz + 0.16, 'rotin', ROTIN, 1);
    for (const [ax, az] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) {
      pave(buf, sx + ax - 0.015, sx + ax + 0.015, yt, yt + 0.4, sz + az - 0.015, sz + az + 0.015, 'fonte', FONTE, 1);
    }
    // le dossier, du côté opposé à la table
    const bx = sx + lx * 0.15 * k, bz = sz + lz * 0.15 * k;
    pave(buf, bx - (lx ? 0.02 : 0.16), bx + (lx ? 0.02 : 0.16), yt + 0.44, yt + 0.86, bz - (lz ? 0.02 : 0.16), bz + (lz ? 0.02 : 0.16), 'rotin', ROTIN, 1);
  }
}

// LA COLONNE MORRIS (v289) : le fût vert sombre couvert d'affiches, sur un
// socle de fonte, sous une corniche et un dôme à écailles coiffé d'un fleuron.
// Elle se plante au milieu d'un trottoir, loin du caniveau, là où aucune
// devanture ne réclame de terrasse.
const VERT_MORRIS = [0.18, 0.26, 0.2];
export function morrisHD(buf, x, y, z) {
  const yt = y + 1 + RELEVE, cx = x + 0.5, cz = z + 0.5;
  cylindre(buf, cx, cz, yt, yt + 0.14, 0.5, 0.5, 12, 'fonte', VERT_MORRIS, 1, true);        // le socle
  cylindre(buf, cx, cz, yt + 0.14, yt + 1.85, 0.4, 0.4, 12, 'affiche', [1, 1, 1], 1);       // le fût d'affiches
  cylindre(buf, cx, cz, yt + 1.85, yt + 2.0, 0.5, 0.5, 12, 'fonte', VERT_MORRIS, 1, true);  // la corniche
  cylindre(buf, cx, cz, yt + 2.0, yt + 2.42, 0.48, 0.14, 12, 'zinc', VERT_MORRIS, 1, true); // le dôme
  cylindre(buf, cx, cz, yt + 2.42, yt + 2.7, 0.05, 0.03, 6, 'fonte', VERT_MORRIS, 1, true); // le fleuron
}

// LE BANC DAVIOUD (v289) : deux pieds de fonte, une assise et un dossier de
// lattes de bois, sur le trottoir, tourné vers la rue. `vers` ([dx, dz]) est la
// direction de la rue.
const LATTES = [1, 1, 1];
export function bancHD(buf, x, y, z, vers) {
  const yt = y + 1 + RELEVE, cx = x + 0.5, cz = z + 0.5;
  const lx = -vers[1], lz = vers[0];                       // l'axe du banc, le long de la rue
  const L = 0.42, P = 0.2;                                  // demi-longueur, demi-profondeur
  const bx = (a, b) => cx + lx * a + vers[0] * b, bz = (a, b) => cz + lz * a + vers[1] * b;
  const boiteDe = (a0, a1, b0, b1, y0, y1, tuile, teinte) => {
    const xs = [bx(a0, b0), bx(a1, b0), bx(a0, b1), bx(a1, b1)], zs = [bz(a0, b0), bz(a1, b0), bz(a0, b1), bz(a1, b1)];
    pave(buf, Math.min(...xs), Math.max(...xs), y0, y1, Math.min(...zs), Math.max(...zs), tuile, teinte, 1);
  };
  // l'assise : quatre lattes, du dossier vers la rue
  for (let k = 0; k < 4; k++) boiteDe(-L, L, -P + k * 0.1, -P + k * 0.1 + 0.08, yt + 0.4, yt + 0.44, 'lattes', LATTES);
  // le dossier : trois lattes, incliné vers l'arrière
  for (let k = 0; k < 3; k++) boiteDe(-L, L, -P - 0.04 - k * 0.02, -P - k * 0.02, yt + 0.5 + k * 0.12, yt + 0.6 + k * 0.12, 'lattes', LATTES);
  // les pieds de fonte, aux deux bouts
  for (const a of [-L + 0.04, L - 0.04]) {
    boiteDe(a - 0.02, a + 0.02, -P, P, yt, yt + 0.4, 'fonte', FONTE);
    boiteDe(a - 0.02, a + 0.02, -P - 0.08, -P, yt + 0.4, yt + 0.9, 'fonte', FONTE);
  }
}

// LA CORBEILLE (v289) : le panier de fil vert de Paris, sur son poteau, au
// bord du caniveau entre deux potelets. `cote` dit de quel côté est la rue.
const VERT_CORBEILLE = [0.3, 0.46, 0.34];
export function corbeilleHD(buf, x, y, z, cote) {
  const d = 0.3;
  const cx = x + (cote === 'px' ? 1 - d : cote === 'mx' ? d : 0.5);
  const cz = z + (cote === 'pz' ? 1 - d : cote === 'mz' ? d : 0.5);
  const yt = y + 1 + RELEVE;
  cylindre(buf, cx, cz, yt, yt + 0.95, 0.04, 0.04, 6, 'fonte', VERT_CORBEILLE, 1);
  cylindre(buf, cx, cz, yt + 0.4, yt + 0.9, 0.16, 0.19, 8, 'fer', VERT_CORBEILLE, 1);
  cylindre(buf, cx, cz, yt + 0.88, yt + 0.92, 0.2, 0.2, 8, 'fonte', VERT_CORBEILLE, 1, true);
}

// LES MITRES DE CHEMINÉE : sur chaque souche de terre cuite, trois pots.
export function mitresHD(buf, x, y, z) {
  const yt = y + 1;
  for (const [dx, dz] of [[0.25, 0.5], [0.5, 0.5], [0.75, 0.5]]) {
    cylindre(buf, x + dx, z + dz, yt, yt + 0.28, 0.08, 0.1, 6, 'brique', [0.98, 0.9, 0.84], 1, true);
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
