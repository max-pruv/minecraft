// LE SOL CONTINU (v297) — le premier chantier du programme « monde fidèle ».
//
// Max, kit de septembre 2026 : « remplace le terrain visible en blocs par des
// surfaces continues ; fais partager la même géométrie au rendu, aux
// collisions et à la navigation ; supprime marches et sauts ; un shader qui
// masque les blocs sans corriger la physique ne répond pas à la demande. »
//
// Trois décisions, et elles valent pour toute couche continue à venir.
//
// 1. LE BLOC RESTE LE SQUELETTE DES DONNÉES, IL CESSE D'ÊTRE LA FORME DU SOL
//    NATUREL. Une colonne est NATURELLE quand elle n'est dans aucune ville,
//    que son sommet est un bloc de terrain (herbe, terre, sable, neige, roche,
//    gravier, sol martien, glace) et que rien d'autre qu'un arbre, de l'eau ou
//    une fleur ne le surmonte. Sur ces colonnes-là, et sur elles seules, le
//    sommet des blocs n'est plus dessiné ni touché : une surface triangulée
//    les remplace. Tout le reste — villes, ouvrages, blocs des enfants — reste
//    en voxel, exactement. Un bloc posé sur l'herbe rend sa colonne au voxel
//    (le dessus n'est plus naturel) ; retiré, elle redevient continue : la
//    cicatrice guérit, parce que la règle lit ce que la colonne EST, jamais
//    son histoire.
// 2. LA SURFACE PASSE PAR LE CENTRE DE CHAQUE COLONNE, À `terrainHeight + 1`.
//    C'est le point sur lequel un enfant marchait déjà : un bloc posé sur ce
//    sol repose donc où il reposait, et l'invariant 1 tient SANS migration.
//    Le prix déclaré : entre deux centres, la surface s'écarte d'au plus un
//    demi-bloc du sommet des colonnes voisines, sur une pente.
// 3. UNE SEULE TRIANGULATION POUR TROIS LECTEURS. `sommetsDeCellule` donne les
//    quatre coins d'une cellule — le carré entre quatre centres de colonnes —
//    et sa diagonale ; le mailleur émet ces triangles-là, `solContinu` les
//    échantillonne pour le contact de l'enfant, des passants et des bêtes, et
//    un témoin vérifie qu'ils sont les mêmes. Deux morceaux voisins lisent
//    les MÊMES colonnes pour leurs coins : la couture est identique par
//    construction, pas par raccord.
//
// Trois notions, dans cet ordre, et il faut les garder distinctes :
//   · une COLONNE NATURELLE (ci-dessus) ;
//   · une CELLULE DESSINÉE : ses quatre colonnes sont naturelles et leurs
//     sommets tiennent dans UN bloc — une falaise reste une falaise, la
//     triangulation en ferait une rampe qu'un enfant gravirait à pied
//     (« deux blocs, c'est un mur », v261) ;
//   · une COLONNE COUVERTE : les quatre cellules autour de son centre sont
//     dessinées. Son sommet voxel peut alors disparaître (rendu) et devenir
//     traversable (physique) sans laisser de trou. Une colonne naturelle mais
//     non couverte — au bord d'une ville, d'une falaise, d'un bloc posé —
//     garde son cube : un liseré d'un bloc, honnête, qui arrête ce qu'il a
//     l'air d'arrêter. Mon premier jet retirait le sommet dès que la colonne
//     était « convertie » sans vérifier que ses quatre cellules l'étaient : un
//     trou dans le sol au bord de chaque bloc posé.
//
// Aucun import de three, aucun DOM : ce module tourne dans le worker et sous
// node. Il ne lit le monde que par `terrainHeight`, `getBlock` et `cityAt`.
import { BLOCK, BLOCK_INFO, isProp } from './blocks.js';
import { tileRect } from './tuiles.js';

// Les blocs qui font un sol naturel. `STONE` y est pour le volcan et les
// montagnes ; `SANDSTONE` non, c'est un bloc de bâtisseur.
export const SOL_NATUREL = new Set([BLOCK.GRASS, BLOCK.DIRT, BLOCK.SAND, BLOCK.SNOW, BLOCK.STONE, BLOCK.GRAVEL, BLOCK.MARS_SOL, BLOCK.ICE]);

// Ce qui peut vivre AU-DESSUS d'un sol naturel sans le rendre artificiel : de
// l'air, de l'eau, un arbre (le tronc et les feuilles restent en voxel, posés
// sur la surface), et une fleur, une touffe, un champignon (`isProp`) — du
// décor posé SUR le sol, pas un bloc qui en fait partie. Sans cela chaque
// fleur des prés laissait une colonne voxel au milieu du champ lissé.
const DESSUS_NATUREL = new Set([BLOCK.AIR, BLOCK.WATER, BLOCK.LOG, BLOCK.LEAVES]);
const dessusNaturel = (id) => DESSUS_NATUREL.has(id) || isProp(id);

// Une falaise reste une falaise : au-delà d'un bloc d'écart dans une cellule,
// on rend la main au voxel. Mesuré sur le couloir Paris–Lille : 98 marches
// d'un bloc (lissées) pour 8 de deux blocs ou plus (gardées).
export const MARCHE_MAX = 1;

// Le sommet praticable d'une colonne naturelle : là où l'enfant marche.
export function coteNaturelle(world, x, z) {
  return world.terrainHeight(x, z) + 1;
}

// Une colonne est-elle naturelle ? `h` peut être donné (la grille du mailleur
// l'a déjà) ; `villes` est la liste des villes à portée quand on la connaît
// (`world.villesProches`), sinon on demande à `cityAt`.
export function colonneNaturelle(world, x, z, h = world.terrainHeight(x, z), villes = null) {
  if (villes ? (villes.length && world.cityAtParmi(x, z, villes)) : (world.cityAt && world.cityAt(x, z))) return false;
  if (!SOL_NATUREL.has(world.getBlock(x, h, z))) return false;
  return dessusNaturel(world.getBlock(x, h + 1, z));
}

// La fiche d'une colonne telle que la physique la mémoïse : naturelle ou non,
// et sa cote (le sommet praticable).
export function ficheColonne(world, x, z) {
  const h = world.terrainHeight(x, z);
  return { nat: colonneNaturelle(world, x, z, h), cote: h + 1 };
}

// LA CELLULE (x, z) est le carré entre les centres des colonnes (x, z),
// (x+1, z), (x, z+1), (x+1, z+1) ; ses coins sont à (x+0.5, z+0.5)… `fiche`
// rend la fiche d'une colonne (mémoïsée chez le lecteur).
export function celluleDessinee(world, x, z, fiche = (a, b) => ficheColonne(world, a, b)) {
  const f0 = fiche(x, z); if (!f0.nat) return false;
  const f1 = fiche(x + 1, z); if (!f1.nat) return false;
  const f2 = fiche(x, z + 1); if (!f2.nat) return false;
  const f3 = fiche(x + 1, z + 1); if (!f3.nat) return false;
  const bas = Math.min(f0.cote, f1.cote, f2.cote, f3.cote), haut = Math.max(f0.cote, f1.cote, f2.cote, f3.cote);
  return haut - bas <= MARCHE_MAX;
}

export function colonneCouverte(world, x, z, fiche = (a, b) => ficheColonne(world, a, b)) {
  return celluleDessinee(world, x - 1, z - 1, fiche) && celluleDessinee(world, x, z - 1, fiche)
    && celluleDessinee(world, x - 1, z, fiche) && celluleDessinee(world, x, z, fiche);
}

// Les quatre coins d'une cellule, dans l'ordre a (x,z), b (x+1,z), c (x,z+1),
// d (x+1,z+1), avec leurs cotes — et la diagonale : toujours a–d, pour que le
// mailleur et le contact tranchent la cellule de la même façon.
export function sommetsDeCellule(world, x, z, fiche = (a, b) => ficheColonne(world, a, b)) {
  return {
    a: [x + 0.5, fiche(x, z).cote, z + 0.5],
    b: [x + 1.5, fiche(x + 1, z).cote, z + 0.5],
    c: [x + 0.5, fiche(x, z + 1).cote, z + 1.5],
    d: [x + 1.5, fiche(x + 1, z + 1).cote, z + 1.5],
  };
}

// LE CONTACT : la hauteur de la surface en (x, z), sur la MÊME triangulation
// que le maillage — triangles (a, c, d) et (a, d, b) de la cellule qui contient
// le point. `null` si la cellule n'est pas dessinée : le voxel décide alors.
export function solContinu(world, x, z, fiche = (a, b) => ficheColonne(world, a, b)) {
  const cx = Math.floor(x - 0.5), cz = Math.floor(z - 0.5);
  if (!celluleDessinee(world, cx, cz, fiche)) return null;
  const { a, b, c, d } = sommetsDeCellule(world, cx, cz, fiche);
  const fx = x - a[0], fz = z - a[2];   // dans [0, 1[
  // diagonale a–d : fz > fx → triangle (a, c, d), sinon (a, d, b)
  if (fz > fx) return a[1] + (c[1] - a[1]) * fz + (d[1] - c[1]) * fx;
  return a[1] + (b[1] - a[1]) * fx + (d[1] - b[1]) * fz;
}

// LA GRILLE D'UN MORCEAU : le morceau plus une marge d'une colonne, chaque
// colonne lue UNE fois — naturelle ou non, et sa cote — puis « dessinée » par
// cellule et « couverte » par colonne déduites de la grille. Mon premier jet
// demandait la règle colonne par colonne, neuf lectures chacune : 166 ms par
// morceau.
//
// La marge lit les morceaux voisins par `getBlock` — c'est le prix de la
// couture, et ce qui la rend identique des deux côtés par construction (les
// deux morceaux lisent les MÊMES colonnes pour leurs coins communs).
export function grilleSol(world, cx, cz, chunk) {
  const baseX = cx * chunk, baseZ = cz * chunk;
  const N = chunk + 2;
  const nat = new Uint8Array(N * N);
  const cote = new Float32Array(N * N);
  const idx = (lx, lz) => (lx + 1) + (lz + 1) * N;
  // ne demander « est-ce une ville ? » qu'aux villes à portée du morceau : sur
  // les 280 du registre, la question par colonne coûtait autant que le reste
  const villes = world.villesProches ? world.villesProches(baseX + chunk / 2, baseZ + chunk / 2, chunk) : null;
  for (let lz = -1; lz < chunk + 1; lz++) for (let lx = -1; lx < chunk + 1; lx++) {
    const x = baseX + lx, z = baseZ + lz;
    const h = world.terrainHeight(x, z);
    cote[idx(lx, lz)] = h + 1;
    nat[idx(lx, lz)] = colonneNaturelle(world, x, z, h, villes) ? 1 : 0;
  }
  // dessinée : par cellule (lx, lz) de -1 à chunk-1 → tableau (chunk+1)²
  const M = chunk + 1;
  const dessinee = new Uint8Array(M * M);
  const cid = (lx, lz) => (lx + 1) + (lz + 1) * M;
  for (let lz = -1; lz < chunk; lz++) for (let lx = -1; lx < chunk; lx++) {
    const i0 = idx(lx, lz), i1 = idx(lx + 1, lz), i2 = idx(lx, lz + 1), i3 = idx(lx + 1, lz + 1);
    if (!(nat[i0] && nat[i1] && nat[i2] && nat[i3])) continue;
    const c0 = cote[i0], c1 = cote[i1], c2 = cote[i2], c3 = cote[i3];
    if (Math.max(c0, c1, c2, c3) - Math.min(c0, c1, c2, c3) > MARCHE_MAX) continue;
    dessinee[cid(lx, lz)] = 1;
  }
  // couvertes : par colonne DU MORCEAU, et la cote du sommet voxel (le bloc à
  // `haut` est celui que le mailleur tait)
  const couvertes = new Uint8Array(chunk * chunk);
  const hauts = new Int16Array(chunk * chunk);
  for (let lz = 0; lz < chunk; lz++) for (let lx = 0; lx < chunk; lx++) {
    hauts[lx + lz * chunk] = cote[idx(lx, lz)] - 1;
    couvertes[lx + lz * chunk] = dessinee[cid(lx - 1, lz - 1)] && dessinee[cid(lx, lz - 1)]
      && dessinee[cid(lx - 1, lz)] && dessinee[cid(lx, lz)] ? 1 : 0;
  }
  return { N, idx, nat, cote, dessinee, cid, couvertes, hauts, baseX, baseZ, chunk };
}

// La normale d'un triangle (pour l'éclairage Lambert), non normalisée.
export function normale(p, q, r) {
  const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2];
  const vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

// LE MAILLAGE D'UN MORCEAU : une cellule par colonne du morceau (celle dont le
// coin a est la colonne), donc les cellules de la dernière rangée lisent le
// morceau voisin. Les normales sont celles des colonnes (différences centrées
// sur les cotes), pour un ombrage lisse ; la tuile est celle du sommet de la
// colonne a. `buf` reçoit positions, normales, uv, couleurs, tuiles et indices
// dans le format de `GeomBuffer` (mesher.js). Les sommets sont à `lx + 0,5` :
// c'est ce qui distingue, dans un tampon, une face voxel (coins entiers) d'une
// cellule de surface — et un témoin s'en sert.
export function emettreSolContinu(buf, world, cx, cz, chunk, grille = grilleSol(world, cx, cz, chunk)) {
  const { idx, cote, dessinee, cid, baseX, baseZ } = grille;
  // au bord de la grille, la différence centrée n'a qu'un côté : on prend l'autre
  const coteEn = (lx, lz) => cote[idx(Math.max(-1, Math.min(chunk, lx)), Math.max(-1, Math.min(chunk, lz)))];
  const normaleEn = (lx, lz) => {
    const dx = (coteEn(lx + 1, lz) - coteEn(lx - 1, lz)) * 0.5;
    const dz = (coteEn(lx, lz + 1) - coteEn(lx, lz - 1)) * 0.5;
    const l = Math.hypot(dx, 1, dz);
    return [-dx / l, 1 / l, -dz / l];
  };
  let cellules = 0;
  for (let lz = 0; lz < chunk; lz++) for (let lx = 0; lx < chunk; lx++) {
    if (!dessinee[cid(lx, lz)]) continue;
    const h = cote[idx(lx, lz)] - 1;
    const tile = BLOCK_INFO[world.getBlock(baseX + lx, h, baseZ + lz)].tiles[0];
    const rect = tileRect(tile);
    const coins = [[lx, lz], [lx + 1, lz], [lx, lz + 1], [lx + 1, lz + 1]];   // a, b, c, d
    const uv = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const base = buf.positions.length / 3;
    for (let i = 0; i < 4; i++) {
      const [ax, az] = coins[i];
      buf.positions.push(ax + 0.5, cote[idx(ax, az)], az + 0.5);
      const n = normaleEn(ax, az);
      buf.normals.push(n[0], n[1], n[2]);
      buf.uvs.push(uv[i][0], uv[i][1]);
      buf.tiles.push(rect[0], rect[1], rect[2], rect[3]);
      buf.colors.push(1, 1, 1);
    }
    // diagonale a–d : (a, c, d) et (a, d, b), la même que `solContinu`
    buf.indices.push(base, base + 2, base + 3, base, base + 3, base + 1);
    cellules++;
  }
  return { cellules, couvertes: grille.couvertes, hauts: grille.hauts };
}
