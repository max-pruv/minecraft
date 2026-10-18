// LES VRAIS ARBRES (v499) — le relief des arbres, en tampons.
//
// Max : « Change tous les arbres pour avoir de vrais arbres, pas des arbres
// façon Minecraft. » Un arbre du jeu est un fût d'un bloc et une couronne de
// cubes ; de près, c'est un cube vert sur un poteau. Ce fichier dessine, pour
// chaque arbre qu'il RECONNAÎT dans les blocs d'un morceau, un vrai arbre : un
// tronc qui s'effile et se courbe, des branches maîtresses, un feuillage en
// cartes de feuilles (alpha) posées en amas dans le volume de la couronne, la
// silhouette de son ESSENCE — chêne, pin, bouleau, palmier, pin parasol,
// olivier, acacia, arbre d'alignement — et sa couleur, par essence et par
// climat.
//
// LA MÊME ARCHITECTURE QUE LA COUCHE HD DE PARIS (v287) ET LES MONUMENTS EN
// RELIEF (v292) :
//
// - LE VOXEL RESTE LE SQUELETTE. Ce fichier ne pose ni ne retire aucun bloc :
//   `treeAt` et `arbreDeVille` (world.js) écrivent les mêmes troncs et les
//   mêmes feuilles qu'avant, les collisions, les sauvegardes et les
//   coordonnées ne bougent pas (invariant 1, par construction). Il LIT les
//   blocs et rend des tampons.
// - ON NE TAIT QUE CE QUE LE MODÈLE COUVRE (v292). Les faces des blocs d'un
//   arbre reconnu — son fût, et les feuilles CONNECTÉES à ce fût — se taisent
//   (le mailleur les compte, `facesArbresTues`) ; tout autre bloc de bois ou de feuilles — une cabane de
//   rondins, une haie posée par un enfant, le buis d'un jardin — reste dans
//   `solid` et se voit. Un arbre est reconnu à son fût : un bloc de bois sans
//   bois dessous, au moins deux de haut, avec au moins trois feuilles
//   connectées dans sa fenêtre (`reconnaitreArbres`).
// - LE LOIN A SES ARBRES AUSSI (v526). Jusqu'à la v510, au-delà de
//   `RAYON_HD`, un morceau maillé sans détail gardait ses arbres en cubes —
//   Max, en vol : « au loin, ils sont en forme Minecraft ». Tout morceau
//   reconnaît désormais ses arbres ; leurs cubes ne s'émettent nulle part, et
//   chacun a deux modèles : le PROCHE (`arbreVrai`, dans `facades`, à portée
//   et sous le budget de la couche) et le LOIN (`arbreLoin`, quelques cartes
//   de la même couronne, dans `arbresLoin`, toujours fabriqué). `main.js` les
//   relaie (`montrerLeDetail`) : jamais les deux. Même matériau, aucune clé de
//   programme neuve (v246), un appel de dessin par morceau.
// - JAMAIS `Math.random()` (v450) : tout tirage se fait à la POSITION de
//   l'arbre dans le monde (`tirageHD(wx, wz, sel)`), pour que le worker et le
//   fil principal dessinent le même arbre, et deux tablettes aussi.
// - LES UV SONT ABSOLUES DANS L'ATLAS (rectangle `NEUTRE`). La passe d'ombre
//   de three échantillonne `map` aux UV bruts : des UV en unités du monde,
//   repliées par le shader de la couche, y tombent hors de la tuile — sur le
//   bord vide de l'atlas, alpha nul, et l'ombre est jetée. Avec des UV
//   absolues, l'ombre d'une carte de feuilles est découpée par ses feuilles.
//
// CE QUI VIENT DU VOXEL : la base du fût, sa hauteur, la boîte des feuilles —
// c'est elle qui dimensionne la couronne, donc un arbre d'alignement taillé et
// un chêne de forêt n'ont pas la même. L'ESSENCE vient de `world.treeAt`, la
// règle même qui a planté l'arbre (`kind`), et du bloc du fût (le bouleau) ;
// un arbre que `treeAt` ne connaît pas est un arbre de ville (`arbreDeVille`,
// les marronniers de Paris, les ormes du Mall).

import { BLOCK } from './blocks.js';
import { rectHD, tirageHD } from './facadeshd.js';

const NEUTRE = [0, 0, 1, 1];
const TRONCS = new Set([BLOCK.LOG, BLOCK.BIRCH]);

// --- les essences ---------------------------------------------------------------------
//
// Une couleur de sommet est LINÉAIRE (v345) : les teintes sont écrites telles
// qu'on les voit (sRGB, 0..1) et converties une fois à la puissance 2,2. La
// tuile de feuilles est peinte claire et presque grise : c'est le sommet qui
// donne la couleur.
const lin = (r, g, b) => [(r / 255) ** 2.2, (g / 255) ** 2.2, (b / 255) ** 2.2];
export const ESSENCES = {
  // kind 0 : le chêne — un fût qui s'évase, quatre branches, une couronne ronde
  chene: { tronc: 'ecorce', feuille: 'feuilles', couleur: lin(78, 138, 48), r0: 0.34, r1: 0.14, courbe: 0.25, branches: 4, amas: 10, carte: 1.15 },
  // kind 1 : le pin — droit, des verticilles, un cône d'aiguilles
  pin: { tronc: 'ecorce', feuille: 'aiguilles', couleur: lin(58, 118, 66), r0: 0.28, r1: 0.06, courbe: 0.08, conique: true },
  // kind 2 : le bouleau — élancé, blanc, une couronne légère et claire
  bouleau: { tronc: 'bouleau', feuille: 'feuilles', couleur: lin(132, 178, 70), r0: 0.2, r1: 0.06, courbe: 0.3, branches: 3, amas: 6, carte: 0.8, elance: true },
  // kind 3 : le palmier — un stipe penché, des palmes qui retombent
  palmier: { tronc: 'ecorce', feuille: 'palme', couleur: lin(72, 142, 52), r0: 0.27, r1: 0.19, courbe: 0.9, palmes: 9 },
  // kind 4 : le pin parasol — un haut fût nu, une ombrelle plate et sombre
  parasol: { tronc: 'ecorce', feuille: 'aiguilles', couleur: lin(56, 108, 58), r0: 0.36, r1: 0.16, courbe: 0.4, branches: 3, amas: 9, carte: 1.3, plat: true },
  // kind 5 : l'olivier — trapu, tordu, gris-vert argenté
  olivier: { tronc: 'ecorce', feuille: 'feuilles', couleur: lin(128, 142, 100), r0: 0.4, r1: 0.2, courbe: 0.45, branches: 4, amas: 8, carte: 0.95, bas: true },
  // kind 6 : l'acacia — un fût qui se divise, une cime plate et large
  acacia: { tronc: 'ecorce', feuille: 'feuilles', couleur: lin(104, 128, 58), r0: 0.3, r1: 0.12, courbe: 0.35, branches: 3, amas: 9, carte: 0.9, plat: true, haut: true },
  // sous les tropiques (kind 0 en climat `tropiques`) : un grand feuillu
  feuillu: { tronc: 'ecorce', feuille: 'feuilles', couleur: lin(52, 128, 46), r0: 0.38, r1: 0.14, courbe: 0.2, branches: 5, amas: 12, carte: 1.3 },
  // les arbres d'alignement des villes : platanes et marronniers taillés
  ville: { tronc: 'ecorce', feuille: 'feuilles', couleur: lin(86, 150, 54), r0: 0.28, r1: 0.14, courbe: 0.1, branches: 3, amas: 8, carte: 1.0 },
};
const PAR_KIND = ['chene', 'pin', 'bouleau', 'palmier', 'parasol', 'olivier', 'acacia'];

// Les teintes de climat des vrais arbres, par sommet, LINÉAIRES : le pin de la
// taïga est plus bleu, l'olivier de la steppe plus pâle, le feuillu des
// tropiques plus profond. L'indice est celui de `CLIMATS_TEINTES` (terre.js) ;
// 0, rien. Les cubes du loin gardent leur teinte à eux (`TEINTE_FEUILLES`).
const TEINTE_CLIMAT = [null, lin(214, 214, 255), lin(200, 212, 255), lin(255, 240, 220), lin(220, 255, 220), lin(255, 250, 230)];

// L'essence d'un arbre reconnu : `kind` de `treeAt` (null : un arbre de
// ville), le bloc du fût, le climat de sa colonne.
export function essenceDe(kind, blocTronc, climat) {
  if (blocTronc === BLOCK.BIRCH) return 'bouleau';
  if (kind === null || kind === undefined) return 'ville';
  if (kind === 0 && climat === 4) return 'feuillu';
  return PAR_KIND[kind] || 'chene';
}

// --- la reconnaissance -----------------------------------------------------------------
//
// `get(x, y, z)` lit un bloc en coordonnées locales du morceau (les voisins
// compris, comme `localGet` du mailleur) ; `signature(x, z)` rend ce que
// `treeAt` a planté sur cette colonne (`{ h, trunk, kind }`, ou null). Rend :
//   { liste: [{ x, y, z, h, bloc, kind, boite, feuilles }],  les fûts dont la base
//                                                   est DANS le morceau
//     cellules: Set d'indices locaux (x + z·C + y·C²)  toutes les cases d'arbre
//                                                   du morceau, fûts du bord compris }
// Un fût du bord (base jusqu'à trois colonnes hors du morceau) a ses feuilles
// dans ce morceau : elles partent dans `plat` ici, et son modèle est émis par
// le morceau qui porte sa base.
//
// UN ARBRE SE RECONNAÎT À SA SIGNATURE, PAS À SON BOIS. Une colonne de rondins
// surmontée de feuilles est un arbre… ou le mur d'une cabane bâtie sous une
// couronne : mesuré au témoin, une cabane de trois sur trois posée au milieu
// d'une forêt donnait SEPT arbres de plus, et ses murs auraient été tus — le
// mur invisible que la v292 interdit. Deux signatures, et aucune autre :
//  • l'arbre de la campagne : `treeAt` plante un arbre sur cette colonne, et
//    la colonne porte EXACTEMENT ce fût (le bloc de son essence, à la hauteur
//    du relief, de la hauteur tirée) — c'est la règle même qui l'a planté ;
//  • l'arbre de ville (`arbreDeVille`, les marronniers de Paris) : un fût de
//    bois, deux feuilles au moins DANS SA COLONNE juste au-dessus, pas de
//    débord de deux, et aucun bois contre sa base — une rangée d'alignement
//    n'a pas de voisin de bois.
// Lire la silhouette de cubes autour du sommet (la couronne du chêne, les
// anneaux du pin, l'étoile du palmier) est un non-résultat mesuré : dans une
// forêt dense les couronnes se touchent, et quatorze arbres sur vingt-deux
// étaient lus de travers (des chênes pris pour des palmiers).
const FENETRE = 3;           // la couronne la plus large (pin parasol, palmier) déborde de trois
const FEUILLES_MIN = 3;
const PAR_KIND_BLOC = (kind) => (kind === 2 ? BLOCK.BIRCH : BLOCK.LOG);
export function reconnaitreArbres(get, signature, C, yLo, yHi, H) {
  const liste = [];
  const cellules = new Set();
  // la fenêtre de travail : le morceau, ses trois colonnes de marge, et trois
  // de plus pour les feuilles d'un fût de la marge ; en hauteur, de `yLo` au
  // haut des feuilles possibles. Une marque par fût (un timbre, jamais remis
  // à zéro) et une pile à plat : la première version refaisait des fermetures
  // par arbre et coûtait quinze millisecondes par morceau de forêt.
  const M = FENETRE * 2, W = C + 2 * M;
  const y0 = Math.max(0, yLo), y1 = Math.min(H - 1, yHi + 6), HY = y1 - y0 + 1;
  if (HY <= 0) return { liste, cellules };
  const marque = new Uint16Array(W * W * HY);
  const pile = new Int32Array(W * W * HY);
  let timbre = 0;
  const idx = (x, y, z) => ((x + M) * W + (z + M)) * HY + (y - y0);
  for (let z = -FENETRE; z < C + FENETRE; z++) {
    for (let x = -FENETRE; x < C + FENETRE; x++) {
      for (let y = Math.max(1, yLo); y <= yHi && y < H; y++) {
        const id = get(x, y, z);
        if (id !== BLOCK.LOG && id !== BLOCK.BIRCH) continue;
        if (TRONCS.has(get(x, y - 1, z))) continue;
        // le fût : une colonne du même bloc
        let h = 1;
        while (y + h < H && get(x, y + h, z) === id) h++;
        // la signature
        const t = signature(x, z);
        let kind = null;
        if (t && t.h + 1 === y && t.trunk === h && PAR_KIND_BLOC(t.kind) === id) kind = t.kind;
        else {
          const ville = h >= 2 && get(x, y + h, z) === BLOCK.LEAVES && get(x, y + h + 1, z) === BLOCK.LEAVES
            && get(x + 2, y + h, z) !== BLOCK.LEAVES && get(x - 2, y + h, z) !== BLOCK.LEAVES && get(x, y + h, z + 2) !== BLOCK.LEAVES && get(x, y + h, z - 2) !== BLOCK.LEAVES
            && !TRONCS.has(get(x + 1, y, z)) && !TRONCS.has(get(x - 1, y, z)) && !TRONCS.has(get(x, y, z + 1)) && !TRONCS.has(get(x, y, z - 1));
          if (!ville) { y += h - 1; continue; }
        }
        // les feuilles connectées au fût, à vingt-six voisins (les palmes du
        // palmier sont posées en diagonale, et leur pointe un bloc plus bas),
        // dans la fenêtre du fût
        timbre++;
        const boite = { x0: x, x1: x, y0: y + h, y1: y + h, z0: z, z1: z };
        let n = 0, nb = 0;
        const yMin = y + 1, yMax = Math.min(y1, y + h + 4);
        const xMin = x - FENETRE, xMax = x + FENETRE, zMin = z - FENETRE, zMax = z + FENETRE;
        const autour = (ax, ay, az) => {
          for (let dy = -1; dy <= 1; dy++) {
            const by = ay + dy;
            if (by < yMin || by > yMax) continue;
            for (let dz = -1; dz <= 1; dz++) {
              const bz = az + dz;
              if (bz < zMin || bz > zMax) continue;
              for (let dx = -1; dx <= 1; dx++) {
                const bx = ax + dx;
                if (bx < xMin || bx > xMax || (!dx && !dy && !dz)) continue;
                const k = idx(bx, by, bz);
                if (marque[k] === timbre) continue;
                marque[k] = timbre;
                if (get(bx, by, bz) !== BLOCK.LEAVES) continue;
                pile[n++] = k;
              }
            }
          }
        };
        for (let dy = 0; dy < h; dy++) autour(x, y + dy, z);
        // la fourche de l'acacia (kind 6) : deux rondins en diagonale au-dessus du fût
        const fourche = [];
        if (kind === 6) for (const [dx, dz] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          if (TRONCS.has(get(x + dx, y + h, z + dz))) { fourche.push([x + dx, y + h, z + dz]); autour(x + dx, y + h, z + dz); }
        }
        const feuilles = [];
        while (nb < n) {
          const k = pile[nb++];
          const ay = (k % HY) + y0, col = Math.floor(k / HY), az = (col % W) - M, ax = Math.floor(col / W) - M;
          feuilles.push(ax, ay, az);
          if (ax < boite.x0) boite.x0 = ax; if (ax > boite.x1) boite.x1 = ax;
          if (az < boite.z0) boite.z0 = az; if (az > boite.z1) boite.z1 = az;
          if (ay < boite.y0) boite.y0 = ay; if (ay > boite.y1) boite.y1 = ay;
          autour(ax, ay, az);
        }
        if (feuilles.length < FEUILLES_MIN * 3) { y += h - 1; continue; }
        const dedans = (ax, az) => ax >= 0 && ax < C && az >= 0 && az < C;
        for (let dy = 0; dy < h; dy++) if (dedans(x, z)) cellules.add(x + z * C + (y + dy) * C * C);
        for (let i = 0; i < feuilles.length; i += 3) if (dedans(feuilles[i], feuilles[i + 2])) cellules.add(feuilles[i] + feuilles[i + 2] * C + feuilles[i + 1] * C * C);
        for (const [ax, ay, az] of fourche) if (dedans(ax, az)) cellules.add(ax + az * C + ay * C * C);
        if (dedans(x, z)) liste.push({ x, y, z, h, bloc: id, kind, boite, feuilles: feuilles.length / 3 });
        y += h - 1;
      }
    }
  }
  return { liste, cellules };
}

// --- la géométrie ------------------------------------------------------------------------

const MAT = { ecorce: [0.96, 0], bouleau: [0.9, 0], feuilles: [0.88, 0], aiguilles: [0.9, 0], palme: [0.8, 0] };
const BLANC = [1, 1, 1];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function base(dir) {
  // deux vecteurs perpendiculaires à `dir`, le premier le plus horizontal possible
  const up = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = norm(cross(up, dir)), v = norm(cross(dir, u));
  return [u, v];
}
function sommet(buf, p, n, u, v, tuile, teinte) {
  return buf.sommet(p, n, [u, v], NEUTRE, teinte, MAT[tuile] || MAT.ecorce, 0);
}

// Un tronçon de tronc ou de branche : une courbe de Bézier quadratique de `p0`
// à `p1`, passant près de `pm`, en `nSeg` anneaux de `nCotes` côtés, le rayon de
// `r0` à `r1`. Chaque tronçon d'anneau à anneau porte sa propre tuile (UV
// absolues), en miroir d'un tronçon à l'autre pour que l'écorce se raccorde.
function fut(buf, p0, pm, p1, r0, r1, nSeg, nCotes, tuile, teinte) {
  const rect = rectHD(tuile);
  const pt = (t) => {
    const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    return [a * p0[0] + b * pm[0] + c * p1[0], a * p0[1] + b * pm[1] + c * p1[1], a * p0[2] + b * pm[2] + c * p1[2]];
  };
  const tg = (t) => norm([2 * (1 - t) * (pm[0] - p0[0]) + 2 * t * (p1[0] - pm[0]), 2 * (1 - t) * (pm[1] - p0[1]) + 2 * t * (p1[1] - pm[1]), 2 * (1 - t) * (pm[2] - p0[2]) + 2 * t * (p1[2] - pm[2])]);
  const anneau = (t) => {
    const c = pt(t), d = tg(t), [u, v] = base(d), r = r0 + (r1 - r0) * t;
    const ring = [];
    for (let i = 0; i <= nCotes; i++) {
      const a = (i / nCotes) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const n = [u[0] * ca + v[0] * sa, u[1] * ca + v[1] * sa, u[2] * ca + v[2] * sa];
      ring.push({ p: [c[0] + n[0] * r, c[1] + n[1] * r, c[2] + n[2] * r], n, u: rect[0] + (i / nCotes) * rect[2] });
    }
    return ring;
  };
  let bas = anneau(0);
  for (let s = 0; s < nSeg; s++) {
    const haut = anneau((s + 1) / nSeg);
    const v0 = s % 2 === 0 ? rect[1] : rect[1] + rect[3], v1 = s % 2 === 0 ? rect[1] + rect[3] : rect[1];
    for (let i = 0; i < nCotes; i++) {
      const a = sommet(buf, bas[i].p, bas[i].n, bas[i].u, v0, tuile, teinte);
      const b = sommet(buf, bas[i + 1].p, bas[i + 1].n, bas[i + 1].u, v0, tuile, teinte);
      const c = sommet(buf, haut[i + 1].p, haut[i + 1].n, haut[i + 1].u, v1, tuile, teinte);
      const d = sommet(buf, haut[i].p, haut[i].n, haut[i].u, v1, tuile, teinte);
      buf.quadIndices(a, b, c, d);
    }
    bas = haut;
  }
  return pt(1);
}

// Une carte de feuillage : un quad centré en `c`, de demi-axes `U` et `V`,
// dessiné des deux côtés (le matériau de la couche ne dessine qu'une face :
// un `DoubleSide` changerait la clé de programme, v246). La normale est celle
// du VOLUME (`n`, vers l'extérieur de la couronne), pas celle du plan : une
// couronne de cartes est éclairée comme une boule, non comme des tôles.
// Une carte rentre de trois texels dans sa tuile (`RETRAIT`) : au-delà du
// demi-texel de `rectHD`, les mipmaps mélangent le bord d'une tuile avec sa
// voisine de l'atlas, opaque et d'une autre couleur — une arête sombre sur
// le bord de chaque carte.
const RETRAIT = 3 / 1024;
function carte(buf, c, U, V, n, tuile, teinte, uv, nf = null) {
  const r = rectHD(tuile);
  const rect = [r[0] + RETRAIT, r[1] + RETRAIT, r[2] - 2 * RETRAIT, r[3] - 2 * RETRAIT];
  const u0 = rect[0] + (uv ? uv[0] : 0) * rect[2], u1 = rect[0] + (uv ? uv[2] : 1) * rect[2];
  const v0 = rect[1] + (uv ? uv[1] : 0) * rect[3], v1 = rect[1] + (uv ? uv[3] : 1) * rect[3];
  const P = [
    [c[0] - U[0] - V[0], c[1] - U[1] - V[1], c[2] - U[2] - V[2]],
    [c[0] + U[0] - V[0], c[1] + U[1] - V[1], c[2] + U[2] - V[2]],
    [c[0] + U[0] + V[0], c[1] + U[1] + V[1], c[2] + U[2] + V[2]],
    [c[0] - U[0] + V[0], c[1] - U[1] + V[1], c[2] - U[2] + V[2]],
  ];
  const N = nf ? P.map(nf) : [n, n, n, n];
  const a = sommet(buf, P[0], N[0], u0, v0, tuile, teinte), b = sommet(buf, P[1], N[1], u1, v0, tuile, teinte);
  const cc = sommet(buf, P[2], N[2], u1, v1, tuile, teinte), d = sommet(buf, P[3], N[3], u0, v1, tuile, teinte);
  buf.quadIndices(a, b, cc, d);
  buf.quadIndices(a, d, cc, b);
}

// Un amas de feuillage : trois cartes croisées (deux debout, une couchée et un
// peu inclinée) autour de `c`, de demi-taille `s`, tournées d'un angle `a`.
function amas(buf, c, s, a, n, tuile, teinte, inclinaison = 0.35) {
  const ca = Math.cos(a), sa = Math.sin(a);
  carte(buf, c, [ca * s, 0, sa * s], [0, s, 0], n, tuile, teinte);
  carte(buf, c, [-sa * s, 0, ca * s], [0, s, 0], n, tuile, teinte);
  carte(buf, c, [ca * s, inclinaison * s * 0.5, sa * s], [-sa * s * 0.9, inclinaison * s, ca * s * 0.9], n, tuile, teinte);
}

const mul = (t, k) => [t[0] * k[0], t[1] * k[1], t[2] * k[2]];
const ech = (t, k) => [t[0] * k, t[1] * k, t[2] * k];

// --- un arbre ------------------------------------------------------------------------------
//
// (x, y, z) : la base du fût, locale au morceau ; `wx, wz` : la même colonne
// dans le monde (le tirage) ; `h` : la hauteur du fût en blocs ; `boite` : les
// feuilles, bornes incluses, locales ; `climat` : l'indice de teinte (0 : aucune).
// La couronne d'un arbre, lue sur la boîte de ses feuilles : le PROCHE
// (`arbreVrai`) et le LOIN (`arbreLoin`) la lisent par la même fonction, pour
// que le relais d'un niveau à l'autre ne change ni la place, ni la taille, ni
// la couleur d'un arbre — seulement le nombre de ses cartes.
function couronne(x, z, wx, wz, boite, essence, climat) {
  const E = ESSENCES[essence] || ESSENCES.chene;
  const g = (sel) => tirageHD(wx, wz, 900 + sel);
  const cx = x + 0.5, cz = z + 0.5;
  const teinte = TEINTE_CLIMAT[climat] ? mul(E.couleur, TEINTE_CLIMAT[climat]) : E.couleur;
  // la couronne : son centre et ses demi-axes viennent de la boîte des feuilles
  const rx = Math.max(1.0, (boite.x1 - boite.x0 + 1) / 2), rz = Math.max(1.0, (boite.z1 - boite.z0 + 1) / 2);
  const ry = Math.max(0.9, (boite.y1 - boite.y0 + 1) / 2);
  const cy = (boite.y0 + boite.y1 + 1) / 2;
  // un sommet lissé : la normale du volume, mêlée d'un peu de ciel
  const nVol = (p) => norm([(p[0] - cx) / rx, (p[1] - cy) / ry + 0.5, (p[2] - cz) / rz]);
  // la teinte d'un amas : plus sombre en bas de la couronne, un peu de variation
  const nuance = (p, k) => ech(teinte, (0.78 + 0.22 * Math.max(0, Math.min(1, (p[1] - (cy - ry)) / (2 * ry)))) * (0.88 + 0.24 * g(40 + k)));
  return { E, g, cx, cz, rx, ry, rz, cy, nVol, nuance };
}

export function arbreVrai(buf, x, y, z, wx, wz, h, boite, essence, climat = 0) {
  const { E, g, cx, cz, rx, ry, rz, cy, nVol, nuance } = couronne(x, z, wx, wz, boite, essence, climat);
  const trunkMat = BLANC;

  if (E.palmes) {
    // LE PALMIER : le stipe penche d'un demi-bloc à un bloc, la couronne est au
    // bout, et chaque palme part vers le haut puis retombe (deux cartes)
    const lean = 0.35 + g(1) * 0.55, dir = g(2) * Math.PI * 2;
    const p0 = [cx, y, cz], p1 = [cx + Math.cos(dir) * lean, y + h + 0.3, cz + Math.sin(dir) * lean];
    const pm = [cx + Math.cos(dir) * lean * 0.3, y + h * 0.55, cz + Math.sin(dir) * lean * 0.3];
    const top = fut(buf, p0, pm, p1, E.r0, E.r1, Math.max(2, Math.ceil(h / 1.2)), 7, E.tronc, trunkMat);
    const n = E.palmes, L = 1.5 + Math.min(1.2, (rx + rz) / 2 - 1) * 0.6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + g(10 + i) * 0.5, ca = Math.cos(a), sa = Math.sin(a);
      const up = 0.55 + g(20 + i) * 0.25;
      const m1 = [top[0] + ca * L * Math.cos(up), top[1] + L * Math.sin(up), top[2] + sa * L * Math.cos(up)];
      const down = -0.45 - g(30 + i) * 0.35;
      const m2 = [m1[0] + ca * L * Math.cos(down), m1[1] + L * Math.sin(down), m1[2] + sa * L * Math.cos(down)];
      const w = 0.45;
      const U = [-sa * w, 0, ca * w];
      const n1 = norm([ca * 0.3, 1, sa * 0.3]);
      const c1 = [(top[0] + m1[0]) / 2, (top[1] + m1[1]) / 2, (top[2] + m1[2]) / 2];
      carte(buf, c1, U, [(m1[0] - top[0]) / 2, (m1[1] - top[1]) / 2, (m1[2] - top[2]) / 2], n1, E.feuille, nuance(c1, i), [0, 0, 1, 0.5]);
      const c2 = [(m1[0] + m2[0]) / 2, (m1[1] + m2[1]) / 2, (m1[2] + m2[2]) / 2];
      carte(buf, c2, U, [(m2[0] - m1[0]) / 2, (m2[1] - m1[1]) / 2, (m2[2] - m1[2]) / 2], n1, E.feuille, nuance(c2, i + 9), [0, 0.5, 1, 1]);
    }
    // le cœur de la couronne : un petit amas qui cache la jonction des palmes
    amas(buf, [top[0], top[1] + 0.3, top[2]], 0.5, g(3) * Math.PI, [0, 1, 0], 'feuilles', nuance(top, 19));
    return;
  }

  if (E.conique) {
    // LE PIN : un fût droit jusqu'à la pointe, des verticilles de branches
    // courtes, un cône d'aiguilles en étages (des cartes en étagère, inclinées
    // vers le bas et l'extérieur), une pointe debout
    const haut = boite.y1 + 1.3;
    const p0 = [cx, y, cz], p1 = [cx + (g(1) - 0.5) * E.courbe, haut, cz + (g(2) - 0.5) * E.courbe];
    fut(buf, p0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + 0.2, (p0[2] + p1[2]) / 2], p1, E.r0, E.r1, Math.max(3, Math.ceil(haut - y)), 7, E.tronc, trunkMat);
    const rmax = Math.max(rx, rz) + 0.25, yb = boite.y0 - 0.2, yt = haut - 0.4;
    const etages = Math.max(3, Math.min(5, Math.round((yt - yb) / 1.1)));
    for (let k = 0; k < etages; k++) {
      const t = k / (etages - 1), yk = yb + (yt - yb) * t;
      const rk = rmax * Math.pow(1 - t, 0.75) + 0.35;
      const nb = k === etages - 1 ? 3 : 4;
      // les branches du verticille, sous l'étage
      if (k < etages - 1) for (let b = 0; b < 3; b++) {
        const a = (b / 3) * Math.PI * 2 + g(50 + k) * 1.5;
        const e = [cx + Math.cos(a) * rk * 0.85, yk - rk * 0.25, cz + Math.sin(a) * rk * 0.85];
        fut(buf, [cx, yk + 0.1, cz], [cx + Math.cos(a) * rk * 0.4, yk + 0.05, cz + Math.sin(a) * rk * 0.4], e, 0.07, 0.025, 1, 3, E.tronc, trunkMat);
      }
      for (let i = 0; i < nb; i++) {
        const a = (i / nb) * Math.PI * 2 + k * 0.7 + g(60 + k) * 0.6, ca = Math.cos(a), sa = Math.sin(a);
        const d = rk * 0.5, s = Math.max(0.6, rk * 0.85);
        const c = [cx + ca * d, yk + 0.1, cz + sa * d];
        const n = norm([ca, 0.9, sa]);
        // une carte en étagère (face vers le ciel, un peu rabattue vers
        // l'extérieur) et une carte debout en travers
        carte(buf, c, [-sa * s, 0, ca * s], [ca * s * 0.95, -s * 0.35, sa * s * 0.95], n, E.feuille, nuance(c, 70 + k * 7 + i));
        carte(buf, c, [ca * s * 0.8, 0, sa * s * 0.8], [0, s * 0.6, 0], n, E.feuille, nuance(c, 71 + k * 7 + i));
      }
    }
    const pointe = [p1[0], yt + 0.2, p1[2]];
    amas(buf, pointe, 0.55, g(4) * Math.PI, [0, 1, 0], E.feuille, nuance(pointe, 99), 0.1);
    return;
  }

  // LES FEUILLUS : un fût courbe qui s'effile, des branches maîtresses qui
  // partent dans la couronne, des amas de cartes dans son volume
  const courbe = E.courbe;
  const dir = g(2) * Math.PI * 2;
  const yTronc = E.plat ? boite.y0 + 0.4 : E.bas ? boite.y0 + 0.6 : cy - ry * 0.25;
  const p1 = [cx + Math.cos(dir) * courbe, Math.max(y + h, yTronc), cz + Math.sin(dir) * courbe];
  const pm = [cx + Math.cos(dir + 1.2) * courbe * 0.5, y + (p1[1] - y) * 0.5, cz + Math.sin(dir + 1.2) * courbe * 0.5];
  const haut = fut(buf, [cx, y, cz], pm, p1, E.r0 * (0.9 + g(5) * 0.2), E.r1, Math.max(2, Math.ceil(p1[1] - y)), 7, E.tronc, trunkMat);
  const nb = E.branches || 0;
  const bouts = [];
  for (let b = 0; b < nb; b++) {
    const a = (b / nb) * Math.PI * 2 + g(10 + b) * 1.0;
    const depart = E.bas ? 0.55 + g(20 + b) * 0.2 : 0.8 + g(20 + b) * 0.15;
    const o = [cx + (haut[0] - cx) * depart, y + (haut[1] - y) * depart, cz + (haut[2] - cz) * depart];
    const elev = E.plat ? 0.35 + g(30 + b) * 0.25 : E.elance ? 0.95 + g(30 + b) * 0.3 : 0.6 + g(30 + b) * 0.35;
    const L = (E.plat ? 0.85 : 0.7) * Math.max(rx, rz) + g(40 + b) * 0.4;
    const e = [o[0] + Math.cos(a) * Math.cos(elev) * L, o[1] + Math.sin(elev) * L, o[2] + Math.sin(a) * Math.cos(elev) * L];
    const m = [o[0] + Math.cos(a) * Math.cos(elev + 0.3) * L * 0.5, o[1] + Math.sin(elev + 0.3) * L * 0.5, o[2] + Math.sin(a) * Math.cos(elev + 0.3) * L * 0.5];
    fut(buf, o, m, e, E.r1 * 0.9, 0.035, 2, 5, E.tronc, trunkMat);
    bouts.push(e);
  }
  // les amas : dans l'ellipsoïde de la couronne, du bas vers le haut
  const n = E.amas || 8, s = (E.carte || 1) * Math.min(1.5, 0.7 + Math.max(rx, rz) * 0.3);
  const ryc = E.plat ? Math.max(0.45, ry * 0.5) : ry;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + g(100 + i) * 0.9;
    const t = E.plat ? 0.5 + (g(110 + i) - 0.5) * 0.3 : 0.2 + g(110 + i) * 0.7;        // la hauteur dans la couronne
    const rr = E.plat ? Math.sqrt(g(120 + i)) * 0.95 : Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) * (0.3 + g(120 + i) * 0.55);  // le rayon à cette hauteur
    const c = [cx + Math.cos(a) * rr * rx, (cy - ryc) + t * 2 * ryc, cz + Math.sin(a) * rr * rz];
    if (E.plat) {
      // une ombrelle : une carte couchée, large, et une petite carte debout
      const ca = Math.cos(a), sa = Math.sin(a), sp = s * 1.1;
      carte(buf, c, [ca * sp, 0, sa * sp], [-sa * sp, 0.12 * sp, ca * sp], nVol(c), E.feuille, nuance(c, i));
      carte(buf, c, [ca * sp * 0.7, 0, sa * sp * 0.7], [0, sp * 0.45, 0], nVol(c), E.feuille, nuance(c, i + 30));
    } else amas(buf, c, s, g(130 + i) * Math.PI, nVol(c), E.feuille, nuance(c, i), 0.35);
  }
  // un amas au bout de chaque branche, plus petit
  for (let b = 0; b < bouts.length; b++) {
    amas(buf, bouts[b], s * 0.7, g(140 + b) * Math.PI, nVol(bouts[b]), E.feuille, nuance(bouts[b], 50 + b), E.plat ? 0.15 : 0.35);
  }
  // et un amas au sommet, pour une cime pleine
  if (!E.plat) {
    const sommetC = [cx + (g(6) - 0.5) * 0.4, cy + ryc * 0.55, cz + (g(7) - 0.5) * 0.4];
    amas(buf, sommetC, s * 0.85, g(8) * Math.PI, [0, 1, 0], E.feuille, nuance(sommetC, 60));
  }
}

// --- un arbre au loin (v526) ------------------------------------------------------------
//
// Max, en vol au-dessus d'une forêt : « Au loin, les arbres sont moches, ils
// sont en forme Minecraft. Au proche, ils sont beaux. » Au-delà du détail, un
// arbre gardait ses cubes. Il garde désormais SA couronne (`couronne`, la même
// place, la même taille, la même couleur que de près) en quelques grandes
// cartes croisées, dont la tuile de feuilles est déjà un DISQUE (matierehd.js :
// les feuilles sont semées dans un rond à 47 % de la tuile) : trois cartes
// debout et deux couchées font une boule de feuillage vue de côté comme du
// ciel, et un fût à trois pans. Mesuré sur le morceau de forêt le plus dense :
// 304 sommets par arbre de près, 32 au loin (un chêne), et le morceau porte 40 Ko
// de cartes contre 200 Ko de cubes avant — le loin coûte MOINS que les cubes
// qu'il remplace. Les normales des cartes sont celles du VOLUME, coin par coin :
// une carte entière est éclairée comme la boule qu'elle figure.
export function arbreLoin(buf, x, y, z, wx, wz, h, boite, essence, climat = 0) {
  const { E, g, cx, cz, rx, ry, rz, cy, nVol, nuance } = couronne(x, z, wx, wz, boite, essence, climat);
  // la demi-largeur de la couronne dans la direction (ca, sa)
  const r = (ca, sa) => Math.hypot(rx * ca, rz * sa);
  const debout = (c, a, k, rh, rv, tuile) => {
    const ca = Math.cos(a), sa = Math.sin(a), w = r(ca, sa) * rh;
    carte(buf, c, [ca * w, 0, sa * w], [0, rv, 0], null, tuile, nuance(c, k), null, nVol);
  };
  const couche = (c, a, k, rh, tuile) => {
    const ca = Math.cos(a), sa = Math.sin(a);
    carte(buf, c, [ca * rx * rh, 0, sa * rx * rh], [-sa * rz * rh, 0, ca * rz * rh], null, tuile, nuance(c, k), null, nVol);
  };

  if (E.palmes) {
    // le stipe penché, et cinq palmes de deux cartes (contre neuf de près), qui
    // montent puis retombent comme de près
    const lean = 0.35 + g(1) * 0.55, dir = g(2) * Math.PI * 2;
    const p0 = [cx, y, cz], p1 = [cx + Math.cos(dir) * lean, y + h + 0.3, cz + Math.sin(dir) * lean];
    const pm = [cx + Math.cos(dir) * lean * 0.3, y + h * 0.55, cz + Math.sin(dir) * lean * 0.3];
    const top = fut(buf, p0, pm, p1, E.r0, E.r1, 1, 3, E.tronc, BLANC);
    const n = 5, L = 1.5 + Math.min(1.2, (rx + rz) / 2 - 1) * 0.6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + g(10 + i) * 0.5, ca = Math.cos(a), sa = Math.sin(a);
      const up = 0.55 + g(20 + i) * 0.25, down = -0.45 - g(30 + i) * 0.35;
      const m1 = [top[0] + ca * L * Math.cos(up), top[1] + L * Math.sin(up), top[2] + sa * L * Math.cos(up)];
      const m2 = [m1[0] + ca * L * Math.cos(down), m1[1] + L * Math.sin(down), m1[2] + sa * L * Math.cos(down)];
      const U = [-sa * 0.55, 0, ca * 0.55], n1 = norm([ca * 0.3, 1, sa * 0.3]);
      const c1 = [(top[0] + m1[0]) / 2, (top[1] + m1[1]) / 2, (top[2] + m1[2]) / 2];
      carte(buf, c1, U, [(m1[0] - top[0]) / 2, (m1[1] - top[1]) / 2, (m1[2] - top[2]) / 2], n1, E.feuille, nuance(c1, i), [0, 0, 1, 0.5]);
      const c2 = [(m1[0] + m2[0]) / 2, (m1[1] + m2[1]) / 2, (m1[2] + m2[2]) / 2];
      carte(buf, c2, U, [(m2[0] - m1[0]) / 2, (m2[1] - m1[1]) / 2, (m2[2] - m1[2]) / 2], n1, E.feuille, nuance(c2, i + 9), [0, 0.5, 1, 1]);
    }
    return;
  }

  if (E.conique) {
    // le pin : le fût jusqu'à la pointe, et trois étages qui rétrécissent —
    // chacun une carte couchée et deux debout croisées, comme les verticilles
    const haut = boite.y1 + 1.3;
    const p0 = [cx, y, cz], p1 = [cx + (g(1) - 0.5) * E.courbe, haut, cz + (g(2) - 0.5) * E.courbe];
    fut(buf, p0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + 0.2, (p0[2] + p1[2]) / 2], p1, E.r0, E.r1, 1, 3, E.tronc, BLANC);
    const rmax = Math.max(rx, rz) + 0.25, yb = boite.y0 - 0.2, yt = haut - 0.4;
    const etages = 3;
    for (let k = 0; k < etages; k++) {
      const t = k / etages, yk = yb + (yt - yb) * (t + 0.1);
      const rk = (rmax * Math.pow(1 - t, 0.75) + 0.35) * 1.25, a = g(60 + k) * Math.PI;
      const c = [cx, yk, cz], ca = Math.cos(a), sa = Math.sin(a), hv = (yt - yb) / etages * 0.75;
      carte(buf, c, [ca * rk, -rk * 0.12, sa * rk], [-sa * rk, -rk * 0.12, ca * rk], null, E.feuille, nuance(c, 70 + k), null, nVol);
      carte(buf, c, [ca * rk, 0, sa * rk], [0, hv, 0], null, E.feuille, nuance(c, 80 + k), null, nVol);
      carte(buf, c, [-sa * rk, 0, ca * rk], [0, hv, 0], null, E.feuille, nuance(c, 90 + k), null, nVol);
    }
    return;
  }

  // les feuillus : le fût jusqu'à la couronne, trois cartes debout et deux couchées
  const dir = g(2) * Math.PI * 2;
  const yTronc = E.plat ? boite.y0 + 0.4 : E.bas ? boite.y0 + 0.6 : cy - ry * 0.25;
  const p1 = [cx + Math.cos(dir) * E.courbe, Math.max(y + h, yTronc), cz + Math.sin(dir) * E.courbe];
  const pm = [cx + Math.cos(dir + 1.2) * E.courbe * 0.5, y + (p1[1] - y) * 0.5, cz + Math.sin(dir + 1.2) * E.courbe * 0.5];
  fut(buf, [cx, y, cz], pm, p1, E.r0 * (0.9 + g(5) * 0.2), E.r1, 1, 3, E.tronc, BLANC);
  const a0 = g(130) * Math.PI;
  if (E.plat) {
    // une ombrelle : large et basse
    // (un peu plus haut que le centre de la boîte : de près, les amas du bout
    // des branches relèvent l'ombrelle)
    const ryc = Math.max(0.45, ry * 0.5), c = [cx, cy + 0.35, cz];
    debout(c, a0, 0, 1.15, ryc * 1.3, E.feuille);
    debout(c, a0 + Math.PI / 2, 1, 1.15, ryc * 1.3, E.feuille);
    couche([cx, cy + 0.35 + ryc * 0.2, cz], a0, 2, 1.2, E.feuille);
    couche([cx, cy + 0.35 + ryc * 0.6, cz], a0 + 0.8, 3, 0.8, E.feuille);
    return;
  }
  // (les petites cartes de près — le bouleau — font une couronne plus serrée)
  const c = [cx, cy, cz], rh = (E.carte || 1) < 0.9 ? 0.95 : 1.15;
  for (let i = 0; i < 3; i++) debout(c, a0 + (i * Math.PI) / 3, i, rh, ry * 1.25, E.feuille);
  couche([cx, cy + ry * 0.3, cz], a0, 3, rh * 0.92, E.feuille);
  couche([cx, cy - ry * 0.25, cz], a0 + 0.7, 4, rh * 0.83, E.feuille);
}

// --- l'émission d'un morceau -----------------------------------------------------------------
//
// Pour chaque arbre reconnu dont la base est dans le morceau : l'essence (le
// `kind` de sa signature, ou un arbre de ville), le climat, le modèle.
// `climats` est la table de `teintesDuMorceau` (ou null).
// `loin` : le modèle lointain (`arbreLoin`, v526) au lieu du proche.
export function emettreArbres(buf, arbres, ox, oz, C, climats, loin = false) {
  let n = 0;
  const modele = loin ? arbreLoin : arbreVrai;
  for (const a of arbres.liste) {
    const wx = ox + a.x, wz = oz + a.z;
    const climat = climats ? climats[a.x + a.z * C] : 0;
    const essence = essenceDe(a.kind, a.bloc, climat);
    modele(buf, a.x, a.y, a.z, wx, wz, a.h, a.boite, essence, climat);
    n++;
  }
  return n;
}
