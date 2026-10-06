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

import { BLOCK, CITY_BLOCK, ARCHI, ARCHI_BANDES, DECOR_START, DECOR_ITEMS } from './blocks.js';
import { PARIS, infoFacadeParis, marquageParis } from './paris.js';
import { LONDRES } from './londres.js';
import { NICE } from './nice.js';
import { LILLE } from './lille.js';
import { VILLES_MONDE } from './villesmonde.js';
import { ZONE_WASHINGTON } from './washington.js';
import { SF, quartierSF } from './sanfrancisco.js';

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
  // v301 : un étage de trois blocs, et la baie qui coûte moins cher
  'croisee',       // le châssis d'une fenêtre (alpha) : montants, meneau, traverse, petits bois
  // v398 : les villes du reste du monde
  'bardage',       // les clins de bois des maisons victoriennes de San Francisco
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
  ...ARCHI_BANDES,
]);

// UNE BAIE DE DEUX BLOCS S'ALLUME D'UN SEUL TENANT (v301). Le tirage des vitres
// allumées se fait par bloc ; le haut d'une baie (ETAGE_HAUT, ENTRESOL_HAUT, le
// vitrage d'une devanture) tire donc sur le bloc de BASE de sa baie, sinon une
// fenêtre serait éclairée à moitié. Le mailleur (la tuile plate) et la couche
// (le relief) lisent la même règle.
export function yBaie(id, y) {
  return (id === ARCHI.ETAGE_HAUT || id === ARCHI.ENTRESOL_HAUT || id === ARCHI.VITRINE_MI) ? y - 1 : y;
}

// LE TOIT (v289) : les blocs de comble sont dessinés par la couche comme un
// CHAMP DE HAUTEURS lissé sur les colonnes (`toitDessusHD`), avec un brisis
// raide au premier rang — le comble à la Mansart — et toutes leurs faces (le
// dessus comme les côtés) partent dans `plat`, jamais dans `solid` : une face
// plate dessinée par-dessus la pente la coifferait d'une casquette.
export const TOIT_HD = new Set([ARCHI.ZINC_LISSE, ARCHI.MANSARDE]);

// LES VILLES QUE LA COUCHE COUVRE (v390). Un morceau est couvert s'il touche le
// disque d'une ville de cette liste ; la question se pose PAR MORCEAU, une
// fois, et non par bloc — une liste de disques, jamais les deux cent
// quatre-vingts villes du registre par colonne. `villeHD` rend la fiche de la
// ville (son nom, donc son registre), `couvreHD` seulement oui ou non.
//
// Une fiche porte son REGISTRE (`STYLES`, plus bas) : c'est lui, et non une
// condition sur un nom dans un registre, qui dit de quoi une façade est faite.
// Paris n'en porte pas — son registre vient de ses quartiers (`styleDuQuartier`).
// `mobilier: false` : pas de colonne Morris ni de banc Davioud hors de Paris.
export const VILLES_HD = [
  { ville: 'paris', x: PARIS.x, z: PARIS.z, r: PARIS.r },
  { ville: 'londres', x: LONDRES.x, z: LONDRES.z, r: LONDRES.r, registre: 'londres', mobilier: false },
  { ville: 'nice', x: NICE.x, z: NICE.z, r: NICE.r, registre: 'nice', mobilier: false },
  { ville: 'lille', x: LILLE.x, z: LILLE.z, r: LILLE.r, registre: 'lille', mobilier: false },
  // LES VILLES BÂTIES À LA MAIN HORS D'EUROPE (v398, palier A du reste du
  // monde). Washington n'est pas un disque : c'est une BOÎTE (le cercle du
  // registre, 187 blocs, ne couvre pas Georgetown), et la fiche le déclare.
  // San Francisco a trois villes dans une : le registre se choisit par
  // QUARTIER (`quartier`, lu dans la même règle que le bâtisseur), comme Paris.
  // `briqueDuJeu` : le mur de brique de ces deux villes est souvent le bloc de
  // brique du jeu (`BLOCK.BRICK`), pas un bloc de décor — la couche le lit.
  { ville: 'washington', boite: ZONE_WASHINGTON, registre: 'washington', mobilier: false, briqueDuJeu: true },
  { ville: 'sf', x: SF.x, z: SF.z, r: SF.r, registre: 'sfMaisons', mobilier: false, briqueDuJeu: true,
    quartier: (wx, wz) => QUARTIERS_SF[quartierSF(wx - SF.x, wz - SF.z)] },
];
const QUARTIERS_SF = { centre: 'sfCentre', soma: 'sfSoma', maisons: 'sfMaisons' };

// LES VILLES ENGENDRÉES D'EUROPE (v394, palier C). Une ville est d'Europe si sa
// latitude et sa longitude tombent dans la boîte du continent, moins les
// villes de la boîte qui n'en sont pas (`HORS_EUROPE`, avec leur raison) — une
// liste se conteste en la lisant, une frontière tracée à la règle non. Le
// registre se choisit par la géographie de la vraie ville, pas par son tissu :
//   îles britanniques → `londres` (la guillotine géorgienne d'Édimbourg à Dublin)
//   au sud de 45,5° N → `sud` (persiennes, garde-corps, stores)
//   au nord          → `nord` (encadrement de pierre, ni volet ni fer)
export const HORS_EUROPE = {
  tbilissi: 'Caucase', erevan: 'Caucase', ankara: 'Anatolie', izmir: 'Anatolie',
  tunis: 'Maghreb', alger: 'Maghreb', fes: 'Maghreb',
};
export function registreEurope(f) {
  const la = f.lat0, lo = f.lon0;
  if (la === undefined || la < 34 || la > 72 || lo < -25 || lo > 46 || HORS_EUROPE[f.cle]) return null;
  if (la > 49.8 && lo > -11 && lo < -1.6) return 'londres';
  return la < 45.5 ? 'sud' : 'nord';
}
// LES VILLES ENGENDRÉES DES AMÉRIQUES (v399, palier B du reste du monde). Même
// méthode que l'Europe : la longitude de la fiche, moins les îles du Pacifique
// (`PACIFIQUE`, l'Océanie a son palier), et deux registres par géographie —
//   États-Unis et Canada → `nordAmericain` (la maison de brique, la guillotine
//                         et son linteau de pierre, le calcaire crème)
//   au sud de 24° N       → `latino` (l'enduit coloré, le garde-corps de fer)
// et les villes du nord qui sont latines par leur histoire (`LATINO_AU_NORD`,
// avec leur raison).
export const PACIFIQUE = { honolulu: 'Océanie', papeete: 'Océanie' };
export const LATINO_AU_NORD = {
  monterrey: 'Mexique', nouvelleorleans: 'le Vieux Carré espagnol et ses balcons de fer',
};
export function registreAmeriques(f) {
  const la = f.lat0, lo = f.lon0;
  if (la === undefined || lo > -30 || lo < -170 || PACIFIQUE[f.cle]) return null;
  return (la < 24 || LATINO_AU_NORD[f.cle]) ? 'latino' : 'nordAmericain';
}
// LE RESTE DU MONDE (v400, palier C) : l'Asie, le Moyen-Orient, l'Afrique,
// l'Océanie. Des règles de géographie dans l'ordre, et les villes que la règle
// classerait mal, NOMMÉES avec leur raison :
//   une médina           → rien (`MEDINAS`) : ses baies sont de petites
//                          ouvertures grillées et ses souks des échoppes ; une
//                          vitre en retrait sous un encadrement de pierre n'y
//                          est pas — aucun registre ne l'honore, on le dit
//   îles du Pacifique    → `tropical` (`ILES`)
//   Lhassa                → `desert` (`TIBET`)
//   Australie, Nouvelle-Zélande, Afrique du Sud → `victorien` (la brique, la
//                          guillotine, la dentelle de fonte des vérandas)
//   au nord de 45° N, et Vladivostok → `nord` (la Russie, Oulan-Bator et Harbin
//                          ont l'enduit et l'encadrement de l'Europe de l'Est)
//   à l'est de 95° E      → `asie` (le béton enduit, la baie large, le store),
//                          sauf les compartiments coloniaux (`COLONIALES`)
//   Arabie, Golfe, Iran, Asie centrale, Pakistan → `desert`
//   Maghreb, Levant, Anatolie, Caucase (au nord de 38° N) → `sud` (la
//                          Méditerranée de l'Europe)
//   le reste — l'Inde, l'Afrique, les compartiments → `tropical` (l'enduit de
//                          couleur, les persiennes, le garde-corps de fer)
export const MEDINAS = { marrakech: 'médina', fes: 'médina', jerusalem: 'vieille ville', tombouctou: 'médina' };
export const ILES = { suva: 'Fidji', noumea: 'Nouvelle-Calédonie', papeete: 'Polynésie', honolulu: 'Hawaï' };
export const COLONIALES = {
  hanoi: 'le compartiment colonial', saigon: 'le compartiment colonial', phnompenh: 'le compartiment colonial',
  vientiane: 'le compartiment colonial', rangoun: 'la ville coloniale', manille: 'Intramuros, espagnole',
};
export const TIBET = { lhassa: 'l’enduit blanc et la baie trapue du Tibet' };
export function registreAilleurs(f) {
  const la = f.lat0, lo = f.lon0, c = f.cle;
  if (la === undefined || MEDINAS[c] || f.typo === 'medina') return null;
  if (ILES[c]) return 'tropical';
  if ((la < -10 && lo > 110) || (la < -25 && lo > 15 && lo < 32)) return 'victorien';
  if (TIBET[c]) return 'desert';
  if ((la > 45 && lo > 46) || c === 'vladivostok') return 'nord';
  if (lo > 95) return COLONIALES[c] ? 'tropical' : 'asie';
  if (la >= 20 && lo >= 34 && lo < 75 && !(la >= 38 && lo < 46) && c !== 'beyrouth') return 'desert';
  if (la >= 30 && lo > -20 && lo < 46) return 'sud';
  return 'tropical';
}
for (const f of VILLES_MONDE) {
  const registre = f.trame ? (registreEurope(f) || registreAmeriques(f) || registreAilleurs(f)) : null;
  if (registre) VILLES_HD.push({ ville: f.cle, x: f.ancre.x, z: f.ancre.z, r: f.rayon, registre, mobilier: false });
}
export function villeHD(cx, cz, chunk) {
  const x = cx * chunk + chunk / 2, z = cz * chunk + chunk / 2;
  for (const d of VILLES_HD) {
    if (d.boite) {
      const b = d.boite;
      if (x > b.x0 - chunk && x < b.x1 + chunk && z > b.z0 - chunk && z < b.z1 + chunk) return d;
      continue;
    }
    const marge = d.r + chunk;
    if ((x - d.x) * (x - d.x) + (z - d.z) * (z - d.z) < marge * marge) return d;
  }
  return null;
}
export function couvreHD(cx, cz, chunk) {
  return villeHD(cx, cz, chunk) !== null;
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
  croisee: [0.62, 0.0],
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
  // `orn` (v390) : hors de Paris, le mur et ses ornements n'ont pas la même
  // teinte — une brique rouge n'encadre pas sa fenêtre de pierre rouge. Seule
  // la tuile du mur (`tuileMur`) prend `teinte`, le reste prend `orn`. Sans
  // `orn` (Paris), tout prend `teinte`, comme avant, au bit près.
  constructor(buf, dir, x, y, z, ao, teinte, courant, orn = null, tuileMur = null) {
    this.buf = buf;
    this.orn = orn; this.tuileMur = tuileMur;
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

  couleur(s, t, ombre, tuile) {
    const k = this.aoA(Math.min(1, Math.max(0, s)), Math.min(1, Math.max(0, t))) * ombre;
    const c = this.orn && tuile !== this.tuileMur ? this.orn : this.teinte;
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
      ids.push(this.buf.sommet(this.p(s, t, d), nm, uv, rect, this.couleur(s, t, ombre, tuile), mat, lueur));
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
  // `bords` : un trou qui continue sur le bloc du dessus n'a pas de linteau
  // (`haut: false`), un trou qui vient du bloc du dessous n'a pas d'appui
  // (`bas: false`) — c'est ainsi qu'une baie de deux blocs se raccorde (v301).
  creux(s0, s1, t0, t1, dr, tuileBord, tuileFond, ombreFond = 1, lueur = 0, bords = null) {
    if (!bords || bords.haut !== false) this.quad([[s0, t1, dr], [s1, t1, dr], [s1, t1, 0], [s0, t1, 0]], [0, -1, 0], tuileBord, 0.6);   // linteau
    if (!bords || bords.bas !== false) this.quad([[s0, t0, 0], [s1, t0, 0], [s1, t0, dr], [s0, t0, dr]], [0, 1, 0], tuileBord, 0.9);    // appui
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

  // Le châssis d'une baie : UN quad ajouré (alpha), la tuile `croisee` — les
  // montants, le meneau, la traverse et les petits bois y sont dessinés. Il a
  // remplacé six boîtes de menuiserie (trente quads, cent vingt sommets par
  // fenêtre) : mesuré avant la v301, la menuiserie faisait 61 000 des 146 000
  // sommets d'un morceau dense de l'ouest, et un étage de trois blocs aurait
  // triplé ce poids. `v0`/`v1` : quelle tranche de la tuile — une baie de deux
  // blocs montre le bas du châssis sur son bloc du bas, le haut sur l'autre.
  croisee(s0, s1, t0, t1, v0 = 0, v1 = 1) {
    this.quad([[s0, t0, -0.06], [s1, t0, -0.06], [s1, t1, -0.06], [s0, t1, -0.06]], [0, 0, 1], 'croisee', 1, 0,
      [[0, v0], [1, v0], [1, v1], [0, v1]]);
  }

  // Une baie d'un bloc : le trou, le châssis, et la vitre.
  baie(s0, s1, t0, t1, allumee) {
    this.creux(s0, s1, t0, t1, -0.12, 'pierre-lisse', 'verre', 1, allumee ? 1 : 0);
    this.croisee(s0, s1, t0, t1);
  }

  // Une BANDE de baie (v301) : le bas d'une baie de deux blocs (ouvert en
  // haut) ou son haut (ouvert en bas), le châssis découpé à la même tranche.
  bandeDeBaie(s0, s1, t0, t1, allumee, bords, v0, v1, dr = -0.12, bord = 'pierre-lisse') {
    this.creux(s0, s1, t0, t1, dr, bord, 'verre', 1, allumee ? 1 : 0, bords);
    this.croisee(s0, s1, t0, t1, v0, v1);
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

// LES REGISTRES DES AUTRES VILLES (v390). Hors de Paris, le voxel ne pose des
// blocs ARCHI qu'aux FENÊTRES (`ARCHI.ETAGE`, une baie d'un bloc) : le mur
// autour est un bloc de décor de la palette — la brique rouge ou chocolat de
// Londres, le stuc blanc de Belgravia. Le relief de la baie doit donc se
// raccorder au mur D'À CÔTÉ, pas à une pierre de Paris : `voisin: true` lit le
// bloc de décor voisin (`murVoisin`) et en prend la MATIÈRE (des briques → la
// tuile `brique`, un enduit uni → `enduit`) et la COULEUR. Les ornements —
// l'encadrement, l'appui, le linteau — gardent leur teinte à eux (`orn`).
//
//   londres — la fenêtre à guillotine géorgienne : haute et étroite, son
//             châssis peint en blanc, le rail de rencontre au milieu, l'appui
//             de pierre de Portland et l'arc plat de briques frottées au-dessus.
//             Ni volet, ni balcon filant, ni garde-corps de fer, ni store.
STYLES.londres = {
  mur: 'brique', teintes: [[1, 1, 1]], baie: [0.32, 0.68, 0.1, 0.88], volets: false, filant: false,
  store: false, corniche: 1, voisin: true, orn: [0.98, 0.97, 0.93], gardeCorps: false, guillotine: true, linteau: 'brique',
  patine: { brique: [0.3, [146, 92, 72]] },
};
//   nice    — l'enduit ocre, rose et sable du Vieux-Nice et ses persiennes, la
//             baie à garde-corps de fer ; la palette (l'orange de
//             signalisation, le jaune de balise) est patinée vers un ocre
//             chaud, de près seulement.
STYLES.nice = {
  mur: 'enduit', teintes: [[1, 0.9, 0.75]], baie: [0.34, 0.66, 0.14, 0.86], volets: true, filant: false,
  store: false, corniche: 1, voisin: true, orn: [0.97, 0.94, 0.86], gardeCorps: true, patine: { enduit: [0.35, 'chaud'] },
};
//   sud     — les villes engendrées de la Méditerranée : l'enduit et ses
//             persiennes, le garde-corps de fer, le store de la boutique.
STYLES.sud = {
  mur: 'enduit', teintes: [[1, 0.92, 0.8]], baie: [0.34, 0.66, 0.14, 0.86], volets: true, filant: false,
  store: true, corniche: 2, voisin: true, orn: [0.97, 0.94, 0.86], gardeCorps: true,
  patine: { enduit: [0.3, 'chaud'], brique: [0.3, [150, 88, 66]] },
};
//   nord    — les villes engendrées du Nord et de l'Est : l'encadrement et le
//             linteau de pierre sur la brique, l'enduit sans volet.
STYLES.nord = {
  mur: 'enduit', teintes: [[0.95, 0.93, 0.88]], baie: [0.31, 0.69, 0.12, 0.86], volets: false, filant: false,
  store: false, corniche: 2, voisin: true, orn: [0.93, 0.91, 0.86], gardeCorps: false, linteau: 'pierre-lisse',
  patine: { enduit: [0.3, 'chaud'], brique: [0.3, [146, 84, 64]] },
};
//   lille   — la brique flamande et la pierre blonde : l'encadrement et le
//             linteau de pierre calcaire, le rang-sur-rang ; ni volet ni fer.
STYLES.lille = {
  mur: 'brique', teintes: [[1, 1, 1]], baie: [0.3, 0.7, 0.12, 0.86], volets: false, filant: false,
  store: false, corniche: 2, voisin: true, orn: [0.94, 0.89, 0.78], gardeCorps: false, linteau: 'pierre-lisse',
  patine: { brique: [0.3, [150, 84, 62]] },
};

//   washington — la maison de ville fédérale de Capitol Hill et de Logan
//             Circle : brique rouge, fenêtre à guillotine (six carreaux sur
//             six) au châssis blanc, appui et linteau de pierre ; et le
//             calcaire et le marbre blancs des ministères et des monuments,
//             en pierre de taille. Ni volet, ni balcon, ni store. Un uni
//             chocolat ou marron EST la brique de la ville (`MURS.brique` de
//             washington.js) ; un uni blanc, crème ou beige, son calcaire.
const UNIS_BRIQUE = { Rouge: 'brique', Saumon: 'brique', Marron: 'brique', Chocolat: 'brique' };
const UNIS_PIERRE = { Blanc: 'pierre', 'Crème': 'pierre', Beige: 'pierre', 'Gris clair': 'pierre', Sable: 'pierre' };
STYLES.washington = {
  mur: 'brique', teintes: [[1, 1, 1]], baie: [0.32, 0.68, 0.1, 0.88], volets: false, filant: false,
  store: false, corniche: 2, voisin: true, orn: [0.97, 0.96, 0.92], gardeCorps: false, guillotine: true, linteau: 'pierre-lisse',
  unis: { ...UNIS_BRIQUE, ...UNIS_PIERRE }, patine: { brique: [0.25, [150, 80, 64]] },
};
//   sfMaisons — les Victoriennes de San Francisco (les « Painted Ladies »
//             d'Alamo Square, de Haight, de Noe Valley) : un BARDAGE de clins
//             de bois peint, la fenêtre à guillotine haute et étroite, le
//             châssis et les moulures blancs. Tout uni clair y est du bois
//             peint.
STYLES.sfMaisons = {
  mur: 'bardage', teintes: [[1, 1, 1]], baie: [0.33, 0.67, 0.08, 0.9], volets: false, filant: false,
  store: false, corniche: 2, voisin: true, orn: [0.98, 0.98, 0.96], gardeCorps: false, guillotine: true,
  // l'anthracite et le noir sont l'ardoise du toit et le bandeau du
  // couronnement, vus de côté : un clin de bois n'y a rien à faire (capture)
  uni: 'bardage', unis: { Anthracite: 'enduit', Noir: 'enduit', Gris: 'enduit' },
};
//   sfCentre — le Financial District d'avant les tours : la pierre de taille
//             et le granit des immeubles de bureaux, l'encadrement de pierre.
//             Le mur-rideau des tours n'est pas dans la couche : il reste sa
//             tuile (`CITY_BLOCK.CURTAIN`), qui n'est jamais un trou (v195).
STYLES.sfCentre = {
  mur: 'pierre', teintes: [[1, 1, 1]], baie: [0.3, 0.7, 0.1, 0.88], volets: false, filant: false,
  store: false, corniche: 3, voisin: true, orn: [0.92, 0.9, 0.85], gardeCorps: false,
  uni: 'pierre', unis: { Anthracite: 'enduit', Gris: 'enduit' },
};
//   sfSoma   — les entrepôts de brique de SoMa, l'arc de brique au-dessus de
//             la baie ; un uni clair y est un enduit de ciment.
STYLES.sfSoma = {
  mur: 'brique', teintes: [[1, 1, 1]], baie: [0.3, 0.7, 0.12, 0.86], volets: false, filant: false,
  store: false, corniche: 2, voisin: true, orn: [0.9, 0.88, 0.84], gardeCorps: false, linteau: 'brique',
  unis: UNIS_BRIQUE, patine: { brique: [0.25, [150, 82, 64]] },
};

//   nordAmericain — la ville engendrée des États-Unis et du Canada : la maison
//             de brique rouge et sa fenêtre à guillotine, le linteau et l'appui
//             de pierre ; un uni crème, beige ou sable y est le calcaire (le
//             « brownstone » clair), un uni gris le béton enduit.
STYLES.nordAmericain = {
  mur: 'enduit', teintes: [[0.95, 0.93, 0.88]], baie: [0.32, 0.68, 0.1, 0.88], volets: false, filant: false,
  store: false, corniche: 2, voisin: true, orn: [0.96, 0.95, 0.92], gardeCorps: false, guillotine: true, linteau: 'pierre-lisse',
  unis: { 'Crème': 'pierre', Beige: 'pierre', Sable: 'pierre' },
  patine: { enduit: [0.25, 'chaud'], brique: [0.3, [150, 84, 64]] },
};
//   latino  — la ville coloniale d'Amérique latine et des Caraïbes : l'enduit
//             de couleur (sa palette, à peine patinée — ces villes SONT de
//             couleur), la baie haute et son garde-corps de fer forgé, la
//             corniche simple. Ni store ni guillotine.
STYLES.latino = {
  mur: 'enduit', teintes: [[1, 0.94, 0.84]], baie: [0.34, 0.66, 0.12, 0.88], volets: false, filant: false,
  store: false, corniche: 1, voisin: true, orn: [0.97, 0.95, 0.9], gardeCorps: true,
  patine: { enduit: [0.15, 'chaud'], brique: [0.3, [150, 84, 64]] },
};

//   victorien — Sydney, Melbourne, Auckland, Le Cap, Johannesburg : la
//             terrasse victorienne de brique, la guillotine au châssis blanc,
//             le linteau de pierre et le garde-corps de fonte des vérandas.
STYLES.victorien = {
  mur: 'enduit', teintes: [[0.95, 0.93, 0.88]], baie: [0.32, 0.68, 0.1, 0.88], volets: false, filant: false,
  store: false, corniche: 2, voisin: true, orn: [0.97, 0.96, 0.92], gardeCorps: true, guillotine: true, linteau: 'pierre-lisse',
  unis: { 'Crème': 'pierre', Beige: 'pierre', Sable: 'pierre' },
  patine: { enduit: [0.25, 'chaud'], brique: [0.3, [150, 84, 64]] },
};
//   asie    — Tokyo, Séoul, Shanghai, Singapour : le béton enduit, la baie
//             large au cadre d'aluminium, sans volet ni fer, le store de
//             l'échoppe. Le mur-rideau des tours reste sa tuile (v195).
STYLES.asie = {
  mur: 'enduit', teintes: [[0.93, 0.93, 0.92]], baie: [0.27, 0.73, 0.12, 0.86], volets: false, filant: false,
  store: true, corniche: 1, voisin: true, orn: [0.88, 0.89, 0.9], gardeCorps: false,
  patine: { enduit: [0.25, 'chaud'], brique: [0.3, [146, 84, 64]] },
};
//   desert  — Riyad, Dubaï, Téhéran, Samarcande : l'enduit couleur de sable,
//             la baie étroite et profonde contre le soleil, la corniche
//             simple ; ni volet ni fer.
STYLES.desert = {
  mur: 'enduit', teintes: [[0.98, 0.92, 0.8]], baie: [0.36, 0.64, 0.16, 0.84], volets: false, filant: false,
  store: false, corniche: 1, voisin: true, orn: [0.96, 0.92, 0.84], gardeCorps: false,
  patine: { enduit: [0.25, 'chaud'], brique: [0.3, [156, 96, 70]] },
};
//   tropical — Bombay, Dakar, Nairobi, Hanoï, Nouméa : l'enduit de couleur à
//             peine patiné, les persiennes ouvertes, le garde-corps de fer.
STYLES.tropical = {
  mur: 'enduit', teintes: [[1, 0.94, 0.84]], baie: [0.34, 0.66, 0.12, 0.88], volets: true, filant: false,
  store: false, corniche: 1, voisin: true, orn: [0.97, 0.95, 0.9], gardeCorps: true,
  patine: { enduit: [0.15, 'chaud'], brique: [0.3, [150, 84, 64]] },
};

// Le bloc de décor le plus proche dans le plan de la façade : à gauche, à
// droite, puis DESSUS et dessous — dessous, c'est souvent le rez-de-chaussée ou
// un massif de fleurs du jardin de poche (vu en capture : une fenêtre de stuc
// encadrée de rose). Rend l'entrée de `DECOR_ITEMS` ou null.
// La corniche, elle, regarde dessous d'abord : au-dessus d'elle, c'est le toit.
function murVoisin(get, x, y, z, S, dessousDabord = false, briques = false) {
  if (!get) return null;
  const v = dessousDabord ? [[0, -1, 0], [0, 1, 0]] : [[0, 1, 0], [0, -1, 0]];
  for (const [dx, dy, dz] of [[S[0], 0, S[2]], [-S[0], 0, -S[2]], ...v]) {
    const idv = get(x + dx, y + dy, z + dz);
    if (briques && idv === BLOCK.BRICK) return BRIQUE_DU_JEU;
    const item = DECOR_ITEMS[idv - DECOR_START];
    if (item) return item;
  }
  return null;
}
// La moyenne de chaque tuile de mur, mesurée sur l'atlas peint (sonde des
// peintres de `matierehd.js`, v390). La teinte d'un sommet est LINÉAIRE (v345) :
// le rapport en sRGB passe à la puissance 2,2, sinon une brique chocolat sort
// orange.
const MOYENNE_TUILE = {
  brique: [158.9, 95.5, 79.0], enduit: [215.2, 213.2, 207.2],
  // v398 : la pierre de taille (le marbre et le calcaire de Washington, le
  // centre de San Francisco) et le bardage des Victoriennes, mesurés de même
  pierre: [191.3, 183.3, 165.3], bardage: [214.4, 212.4, 208.4],
};
export function teinteDuMur(rgb, tuile) {
  const m = MOYENNE_TUILE[tuile];
  return rgb.map((c, i) => Math.min(2.5, Math.pow(c / m[i], 2.2)));
}
// LE MUR LUI-MÊME PASSE DANS LA COUCHE (v390). Vu en capture à Londres : la
// baie HD au milieu d'un mur resté en voxel faisait un carré clair autour de
// chaque fenêtre — la couche a son matériau (rugosité, métal), le voxel le
// sien, et la même couleur n'y rend pas la même lumière. Le mur de brique ou
// d'enduit voisin d'une baie est donc détaillé lui aussi, d'une face plate
// dans la tuile HD. SEULS les motifs « Briques » et « Uni » : un bloc de décor
// à damier, à pois ou à losanges qu'un enfant a posé garde son dessin — la
// couche ne change pas l'apparence d'une création, elle n'en a pas la tuile.
const MOTIFS_MUR_HD = new Set(['Briques', 'Uni']);
export function murHD(id, ville) {
  if (!ville || !ville.registre || !STYLES[ville.registre].voisin) return false;
  if (id === BLOCK.BRICK && ville.briqueDuJeu) return true;
  const item = DECOR_ITEMS[id - DECOR_START];
  return !!item && MOTIFS_MUR_HD.has(item.pattern);
}
// Le bloc de brique du jeu (`BLOCK.BRICK`) vu comme un mur de décor : sa
// couleur est celle de sa tuile hors joints (textures.js, [148, 68, 58]).
const BRIQUE_DU_JEU = { pattern: 'Briques', colorName: 'Brique', rgb: [148, 68, 58] };
// `patine` : par tuile, [part, couleur] — la brique de la palette est un rouge
// de jouet (Rouge 200, 62, 56), l'enduit de Nice l'orange de signalisation ;
// de près, la couche les rapproche d'une vraie brique cuite, d'un vrai ocre,
// sans les changer de famille (le loin garde la tuile du voxel). 'chaud' : la
// couleur vers son propre gris, réchauffé — elle se désature sans changer de
// clarté.
// `unis` (v398) : la tuile d'un mur de motif « Uni » selon sa couleur — à
// Washington, un uni chocolat est de la brique et un uni blanc du marbre ;
// `uni` la tuile d'un uni que la table ne nomme pas. Sans eux, l'enduit.
export function murDuDecor(item, patine = null, unis = null, uni = null) {
  const tuile = item.pattern === 'Briques' ? 'brique'
    : (unis && unis[item.colorName]) || uni || 'enduit';
  const p = patine && patine[tuile];
  let rgb = item.rgb;
  if (p) {
    const L = 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
    const cible = p[1] === 'chaud' ? [L * 1.08, L, L * 0.86] : p[1];
    rgb = rgb.map((c, i) => c + (cible[i] - c) * p[0]);
  }
  return { tuile, teinte: teinteDuMur(rgb, tuile) };
}

// Les volets à persiennes, ouverts de part et d'autre de la baie : deux
// boîtes minces au nu du mur, la persienne dessinée dans la tuile.
function volets(f, s0, s1, t0, t1) {
  const l = Math.min(0.14, s0 - 0.02);
  // deux plans à trois centièmes du mur : l'épaisseur d'une boîte ne se voyait
  // pas, et elle coûtait dix quads par bloc (v301)
  f.plan(s0 - l, s0 - 0.01, t0, t1, 0.03, 'volet', 0.95);
  f.plan(s1 + 0.01, s1 + l, t0, t1, 0.03, 'volet', 0.95);
}

// --- les bandes d'un étage de trois blocs (v301) -----------------------------------
//
// Un niveau se lit de bas en haut : l'ALLÈGE (le mur sous la fenêtre, l'appui
// qui saille — ou, à l'étage noble, la dalle du balcon filant et ses
// consoles), le BAS DE LA BAIE (le trou ouvert vers le haut, le garde-corps
// devant, ou la ferronnerie du balcon), le HAUT DE LA BAIE (le trou fermé par
// son linteau, le bandeau d'étage au-dessus). La baie fait donc 1,7 bloc, à
// peu près 1,8 m : une personne de 1,8 bloc passe la tête à la fenêtre, ce
// qu'elle ne faisait pas quand la baie tenait dans les sept dixièmes d'un bloc.
const HAUT_BAIE = 0.7;                    // où le linteau ferme la baie, sur le bloc du haut
const PART_BAS = 1 / (1 + HAUT_BAIE);     // la part du châssis qui revient au bloc du bas

function etageBas(f, st) {
  f.plan(0, 1, 0, 1, 0, st.mur);
  const [s0, s1] = st.baie;
  f.boite(s0 - 0.04, s1 + 0.04, 0.93, 1.0, 0, 0.05, 'pierre-lisse');   // l'appui, en saillie
}

function nobleBas(f, st) {
  if (!st.filant) { etageBas(f, st); return; }
  f.plan(0, 1, 0, 1, 0, st.mur);
  // LE BALCON FILANT : la dalle sur toute la largeur, et ses consoles.
  f.boite(0, 1, 0.86, 1.0, 0, 0.22, 'pierre-lisse');
  f.boite(0.12, 0.2, 0.7, 0.86, 0, 0.18, 'pierre-lisse');
  f.boite(0.8, 0.88, 0.7, 0.86, 0, 0.18, 'pierre-lisse');
}

function etageMi(f, allumee, st, bas) {
  const [s0, s1] = st.baie;
  f.murAutour(s0, s1, 0, 1, st.mur);
  f.bandeDeBaie(s0, s1, 0, 1, allumee, { haut: false }, 0, PART_BAS);
  if (bas === ARCHI.NOBLE_BAS && st.filant) f.ferronnerie(0, 1, 0, 0.3, 0.22);        // la ferronnerie du balcon
  else f.ferronnerie(s0 - 0.02, s1 + 0.02, 0, 0.24, 0.06);                            // le garde-corps de la baie
  if (st.volets) volets(f, s0, s1, 0, 1);
}

function etageHaut(f, allumee, st) {
  const [s0, s1] = st.baie;
  f.murAutour(s0, s1, 0, HAUT_BAIE, st.mur);
  f.bandeDeBaie(s0, s1, 0, HAUT_BAIE, allumee, { bas: false }, PART_BAS, 1);
  if (st.volets) volets(f, s0, s1, 0, HAUT_BAIE);
  if (st.filant) f.boite(0, 1, 0.94, 1.0, 0, 0.03, 'pierre-lisse');                   // le bandeau d'étage
}

function entresolBas(f, allumee, st) {
  const s0 = 0.33, s1 = 0.67, t0 = 0.3;
  f.murAutour(s0, s1, t0, 1, st.mur);
  f.bandeDeBaie(s0, s1, t0, 1, allumee, { haut: false }, 0, 0.5);
  f.boite(s0 - 0.03, s1 + 0.03, t0 - 0.03, t0, 0, 0.04, 'pierre-lisse');
  if (st.volets) volets(f, s0, s1, t0, 1);
  f.boite(0, 1, 0.0, 0.06, 0, 0.06, 'pierre-lisse');   // l'assise qui sépare le commerce de l'immeuble
}

function entresolHaut(f, allumee, st) {
  const s0 = 0.33, s1 = 0.67, t1 = 0.5;
  f.murAutour(s0, s1, 0, t1, st.mur);
  f.bandeDeBaie(s0, s1, 0, t1, allumee, { bas: false }, 0.5, 1);
  if (st.volets) volets(f, s0, s1, 0, t1);
}

// La devanture sur trois blocs : le soubassement de granit et le bas du
// vitrage, le vitrage, puis le bandeau d'enseigne et le store.
function vitrineBas(f, allumee, st) {
  const s0 = 0.08, s1 = 0.92, t0 = 0.25;
  f.murAutour(s0, s1, t0, 1, st.mur);
  f.creux(s0, s1, t0, 1, -0.14, 'menuiserie', 'verre', 1, allumee ? 1.2 : 0.35, { haut: false });
  for (const [a, b] of [[s0, s0 + 0.04], [s1 - 0.04, s1], [0.49, 0.51]]) f.plan(a, b, t0, 1, -0.06, 'menuiserie');
  f.boite(0, 1, 0, t0, 0, 0.03, 'granit');
}

function vitrineMi(f, allumee, st) {
  const s0 = 0.08, s1 = 0.92;
  f.murAutour(s0, s1, 0, 1, st.mur);
  f.creux(s0, s1, 0, 1, -0.14, 'menuiserie', 'verre', 1, allumee ? 1.2 : 0.35, { haut: false, bas: false });
  for (const [a, b] of [[s0, s0 + 0.04], [s1 - 0.04, s1], [0.49, 0.51]]) f.plan(a, b, 0, 1, -0.06, 'menuiserie');
}

function vitrineHaut(f, r, allumee, st, bas) {
  const s0 = 0.08, s1 = 0.92, t1 = 0.35;
  const porte = bas === ARCHI.PORTE_HAUT;
  if (porte) f.plan(0, 1, 0, 1, 0, st.mur);
  else {
    f.murAutour(s0, s1, 0, t1, st.mur);
    f.creux(s0, s1, 0, t1, -0.14, 'menuiserie', 'verre', 1, allumee ? 1.2 : 0.35, { bas: false });
    for (const [a, b] of [[s0, s0 + 0.04], [s1 - 0.04, s1], [0.49, 0.51]]) f.plan(a, b, 0, t1, -0.06, 'menuiserie');
  }
  // le bandeau d'enseigne, et le store au-dessus de la vitrine — pas au-dessus
  // d'une porte cochère
  f.boite(0.02, 0.98, t1 + 0.02, 0.7, 0, 0.05, 'enseigne');
  if (!porte && st.store && r > 0.35) {
    const dt = 0.13, t = 0.72;
    f.quad([[0.94, t, 0], [0.06, t, 0], [0.06, t - dt, 0.42], [0.94, t - dt, 0.42]], [0, 0.42, dt], 'store', 1);
    f.quad([[0.06, t, 0], [0.94, t, 0], [0.94, t - dt, 0.42], [0.06, t - dt, 0.42]], [0, -0.42, -dt], 'store', 0.7);
  }
}

function porteBas(f, st) {
  const s0 = 0.28, s1 = 0.72;
  f.murAutour(s0, s1, 0, 1, st.mur);
  f.creux(s0, s1, 0, 1, -0.16, 'pierre-lisse', 'bois', 0.9, 0, { haut: false });
  f.boite(s0 - 0.05, s0, 0, 1, 0, 0.05, 'pierre-lisse');
  f.boite(s1, s1 + 0.05, 0, 1, 0, 0.05, 'pierre-lisse');
}

function porteHaut(f, st) {
  const s0 = 0.28, s1 = 0.72, t1 = 0.84;
  f.murAutour(s0, s1, 0, t1, st.mur);
  f.creux(s0, s1, 0, t1, -0.16, 'pierre-lisse', 'bois', 0.9, 0, { bas: false });
  f.plan(s0, s1, t1 - 0.3, t1, -0.15, 'verre', 1, 0);                    // l'imposte vitrée
  f.boite(s0 - 0.05, s0, 0, t1 + 0.05, 0, 0.05, 'pierre-lisse');
  f.boite(s1, s1 + 0.05, 0, t1 + 0.05, 0, 0.05, 'pierre-lisse');
  f.boite(s0 - 0.05, s1 + 0.05, t1, t1 + 0.06, 0, 0.06, 'pierre-lisse');  // l'encadrement, et sa clé
}

function etage(f, r, allumee, noble, st) {
  const [s0, s1, t0, t1] = st.baie;
  f.murAutour(s0, s1, t0, t1, st.mur);
  f.baie(s0, s1, t0, t1, allumee);
  if (st.guillotine) {
    // LA GUILLOTINE : le rail de rencontre des deux châssis, à mi-hauteur, et
    // le chambranle peint qui borde la baie.
    // Des plans, pas des boîtes : trois boîtes coûtaient soixante sommets par
    // fenêtre (mesuré : 1,96 Mo pour le morceau le plus dense de Londres, 1,30 en plans).
    const tm = (t0 + t1) / 2;
    f.plan(s0, s1, tm - 0.025, tm + 0.025, -0.05, 'pierre-lisse');
    f.plan(s0 - 0.03, s0, t0, t1, 0.012, 'pierre-lisse');
    f.plan(s1, s1 + 0.03, t0, t1, 0.012, 'pierre-lisse');
  }
  // l'arc plat de briques frottées : des claveaux plus clairs que le mur
  if (st.linteau) f.boite(s0 - 0.05, s1 + 0.05, t1, Math.min(1, t1 + 0.09), 0, 0.02, st.linteau, 1.15);
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
    if (st.gardeCorps !== false) f.ferronnerie(s0 - 0.02, s1 + 0.02, t0, t0 + 0.24, 0.06);
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
    // deux assises par bloc : un carreau de chaînage fait un demi-mètre, et
    // quatre boîtes par bloc sur vingt blocs d'angle pesaient trop (v301)
    for (let i = 0; i < 2; i++) {
      const t0 = i / 2, t1 = (i + 1) / 2 - 0.02;
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
// `ville` (v390) : la fiche de `VILLES_HD` dont le morceau relève ; sans elle,
// ou pour Paris, le registre vient du quartier, comme avant.
export function facadeHD(buf, face, x, y, z, wx, wy, wz, id, ao, bas = BLOCK.AIR, haut = BLOCK.AIR, get = null, ville = null) {
  const reg = ville && ville.registre ? STYLES[(ville.quartier && ville.quartier(wx, wz)) || ville.registre] : null;
  const info = reg ? null : infoFacadeParis(wx, wz);
  const graine = info ? info.graine : reg ? tirage(wx, wz, 700) : 0.5;
  let st = reg || styleDuQuartier(info ? info.quartier : '');
  let teinte = st.teintes[Math.floor(graine * st.teintes.length) % st.teintes.length];
  if (reg && reg.voisin) {
    const briques = !!ville.briqueDuJeu;
    const propre = (briques && id === BLOCK.BRICK) ? BRIQUE_DU_JEU : DECOR_ITEMS[id - DECOR_START];
    const item = propre || murVoisin(get, x, y, z, REPERES[face.dir.join(',')].s, id === ARCHI.CORNICHE, briques);
    if (item) {
      const m = murDuDecor(item, reg.patine, reg.unis, reg.uni);
      st = { ...reg, mur: m.tuile, linteau: m.tuile === 'brique' ? reg.linteau : null };
      teinte = m.teinte;
    }
  }
  // Le courant : la coordonnée du monde le long de la face, pour que la
  // texture continue d'un bloc à l'autre.
  const courant = face.dir[0] !== 0 ? (face.dir[0] > 0 ? -wz : wz) : (face.dir[2] > 0 ? wx : -wx);
  const f = new Face(buf, face.dir, x, y, z, ao, teinte, courant, reg ? reg.orn : null, reg ? st.mur : null);
  const r = tirage(wx, wz, 811);
  const allumee = vitreAllumee(wx, yBaie(id, wy), wz);
  switch (id) {
    // les bandes d'un étage de trois blocs (v301)
    case ARCHI.ETAGE_BAS: etageBas(f, st); break;
    case ARCHI.NOBLE_BAS: nobleBas(f, st); break;
    case ARCHI.ETAGE_MI: etageMi(f, allumee, st, bas); break;
    case ARCHI.ETAGE_HAUT: etageHaut(f, allumee, st); break;
    case ARCHI.ENTRESOL_BAS: entresolBas(f, allumee, st); break;
    case ARCHI.ENTRESOL_HAUT: entresolHaut(f, allumee, st); break;
    case ARCHI.VITRINE_BAS: vitrineBas(f, allumee, st); break;
    case ARCHI.VITRINE_MI: vitrineMi(f, allumee, st); break;
    case ARCHI.VITRINE_HAUT: vitrineHaut(f, graine, allumee, st, bas); break;
    case ARCHI.PORTE_BAS: porteBas(f, st); break;
    case ARCHI.PORTE_HAUT: porteHaut(f, st); break;
    // les registres d'un bloc, pour les blocs que les enfants posent
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
