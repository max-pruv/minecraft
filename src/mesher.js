// Builds chunk geometry: one buffer for solid/cutout blocks, one for water.
// Only faces adjacent to air or transparent blocks are emitted.
//
// Les faces coplanaires identiques sont fusionnées en rectangles (« greedy
// meshing ») : un plateau d'herbe de 16×16 sort en un seul quad au lieu de 256.
// Deux faces ne fusionnent que si le bloc ET les quatre valeurs d'occlusion
// ambiante coïncident, sans quoi le dégradé des coins serait détruit. Mesuré
// sur du terrain, de la forêt et le château : 3,2 fois moins de triangles.

import * as THREE from 'three';
import { BLOCK, BLOCK_INFO, isTransparent, isSlab, isProp, CITY_BLOCK, ARCHI } from './blocks.js';
import { tileUV, tileRect } from './textures.js';

// Rectangle neutre des faces non fusionnées : leurs UV sont déjà absolues,
// le shader les reprend telles quelles.
const NEUTRE = [0, 0, 1, 1];
import { CHUNK, HEIGHT } from './world.js';

// Faces: corner positions (CCW from outside), normal, tile slot (0 top / 1 side / 2 bottom), shade.
//
// uAxis / vAxis désignent les deux axes du monde que parcourent les coordonnées
// de texture de cette face. Ce sont eux que la fusion étire : un rectangle de
// w × h blocs multiplie les décalages de coin et les UV par w et h.
const FACES = [
  { // +x
    dir: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 1, shade: 0.62,
    uAxis: 2, vAxis: 1,
  },
  { // -x
    dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 1, shade: 0.62,
    uAxis: 2, vAxis: 1,
  },
  { // +y (top)
    dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 0, shade: 1.0,
    uAxis: 0, vAxis: 2,
  },
  { // -y (bottom)
    dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 2, shade: 0.5,
    uAxis: 0, vAxis: 2,
  },
  { // +z
    dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 1, shade: 0.8,
    uAxis: 0, vAxis: 1,
  },
  { // -z
    dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 1, shade: 0.8,
    uAxis: 0, vAxis: 1,
  },
];

const WATER_SURFACE_Y = 0.875; // water sits slightly below the block top

// LES FENÊTRES ALLUMÉES.
//
// Verdict de Max, capture de Moscou de nuit à l'appui : une ville éteinte,
// où seuls les réverbères brillaient. Le monde entier partage UN matériau
// dont la couleur est le niveau de lumière du jour : à minuit, tout tombe à
// trente pour cent, fenêtres comprises. Une ville la nuit, c'est pourtant
// d'abord ça — des carrés de lumière dans le noir.
//
// On sort donc les vitres ALLUMÉES dans une troisième géométrie, à côté du
// solide et de l'eau, que main.js rend avec un matériau qu'on n'éteint pas.
// Une vitre sur deux environ : une ville dont toutes les fenêtres brillent
// n'est pas une ville, c'est une guirlande. Le tirage est STABLE — il ne
// dépend que des coordonnées du bloc — sinon les fenêtres clignoteraient à
// chaque remaillage du morceau de monde.
// Ce qui s'allume : le verre, le mur-rideau — et surtout les blocs de
// FAÇADE qui portent une fenêtre dans leur texture (étage, étage noble,
// entresol, devanture). Dans les villes générées, une fenêtre n'est pas un
// bloc de verre : c'est le dessin du bloc de façade, à raison d'une baie
// par bloc. N'allumer que le verre ne rallumait donc presque rien.
const VITRES = new Set([
  BLOCK.GLASS, CITY_BLOCK.CURTAIN,
  ARCHI.VITRINE, ARCHI.ENTRESOL, ARCHI.ETAGE, ARCHI.NOBLE, ARCHI.VITRAIL, ARCHI.SHOJI,
]);
function vitreAllumee(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) % 100) < 30;
}

// Per-vertex ambient occlusion: corners tucked against neighbouring solid
// blocks get darker, which grounds every edge and crevice visually.
const AO_LEVELS = [0.5, 0.66, 0.82, 1];

function faceAO(localGet, face, x, y, z) {
  const d = face.dir;
  // tangent axes spanning the face plane
  const axisU = d[0] !== 0 ? [0, 1, 0] : [1, 0, 0];
  const axisV = d[1] !== 0 ? [0, 0, 1] : (d[0] !== 0 ? [0, 0, 1] : [0, 1, 0]);
  const bx = x + d[0], by = y + d[1], bz = z + d[2];
  const occludes = (px, py, pz) => {
    const id = localGet(px, py, pz);
    return !isTransparent(id) && !isSlab(id);
  };
  const ao = [];
  for (let i = 0; i < 4; i++) {
    const c = face.corners[i];
    const su = (axisU[0] ? c[0] : axisU[1] ? c[1] : c[2]) === 1 ? 1 : -1;
    const sv = (axisV[0] ? c[0] : axisV[1] ? c[1] : c[2]) === 1 ? 1 : -1;
    const s1 = occludes(bx + su * axisU[0], by + su * axisU[1], bz + su * axisU[2]);
    const s2 = occludes(bx + sv * axisV[0], by + sv * axisV[1], bz + sv * axisV[2]);
    const corner = occludes(
      bx + su * axisU[0] + sv * axisV[0],
      by + su * axisU[1] + sv * axisV[1],
      bz + su * axisU[2] + sv * axisV[2]
    );
    ao.push(AO_LEVELS[s1 && s2 ? 0 : 3 - (s1 + s2 + corner)]);
  }
  return ao;
}

function shouldRenderFace(id, neighbor) {
  if (neighbor === id) return false;          // no faces between identical blocks
  if (neighbor === BLOCK.AIR) return true;
  if (isSlab(neighbor)) return true;          // slabs only cover their lower half
  return isTransparent(neighbor);             // draw against water/glass, not opaque
}

class GeomBuffer {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.uvs = [];
    this.colors = [];
    this.tiles = [];
    this.indices = [];
  }

  // w, h : taille du rectangle fusionné, en blocs, le long de uAxis et vAxis.
  //
  // Le shader ramène les UV dans leur tuile avec un fract(). Or fract() se
  // replie à zéro au bord extérieur d'un quad : sur du terrain lointain, où un
  // bloc ne couvre que deux ou trois pixels, ce bord représente l'essentiel de
  // la surface et le mauvais texel ressortait partout.
  //
  // On ne paie donc le repli que là où il sert vraiment. Une face non fusionnée
  // porte directement ses coordonnées d'atlas et un rectangle neutre : fract()
  // les laisse intactes puisqu'elles sont déjà comprises entre 0 et 1, et le
  // rendu est identique au pixel près à celui d'avant. Seules les faces
  // réellement étirées répètent leur tuile.
  addFace(face, x, y, z, tile, yTop, ao, w = 1, h = 1) {
    const base = this.positions.length / 3;
    const fusionnee = w > 1 || h > 1;
    const rect = fusionnee ? tileRect(tile) : NEUTRE;
    const atlas = fusionnee ? null : tileUV(tile);
    const echelle = [1, 1, 1];
    echelle[face.uAxis] = w;
    echelle[face.vAxis] = h;
    for (let i = 0; i < 4; i++) {
      const c = face.corners[i];
      // Un coin à 1 va jusqu'au bord opposé du rectangle. Sur l'axe vertical,
      // yTop remplace la hauteur unitaire (eau de surface, dalle) ; quand la
      // fusion est verticale, yTop vaut forcément 1 et le produit donne h.
      const cy = c[1] === 1 ? yTop * echelle[1] : 0;
      this.positions.push(x + c[0] * echelle[0], y + cy, z + c[2] * echelle[2]);
      this.normals.push(face.dir[0], face.dir[1], face.dir[2]);
      const [fu, fv] = face.uvs[i];
      if (atlas) {
        const [u0, v0, u1, v1] = atlas;
        this.uvs.push(u0 + (u1 - u0) * fu, v0 + (v1 - v0) * fv);
      } else {
        this.uvs.push(fu * w, fv * h);
      }
      this.tiles.push(rect[0], rect[1], rect[2], rect[3]);
      const shade = face.shade * (ao ? ao[i] : 1);
      this.colors.push(shade, shade, shade);
    }
    // flip the quad diagonal when AO is stronger on the other corners,
    // so the smooth gradient follows the occlusion
    if (ao && ao[0] + ao[2] < ao[1] + ao[3]) {
      this.indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    } else {
      this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  toGeometry() {
    if (this.indices.length === 0) return null;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geom.setAttribute('tuile', new THREE.Float32BufferAttribute(this.tiles, 4));
    geom.setIndex(this.indices);
    geom.computeBoundingSphere();
    return geom;
  }
}

// Returns { solid, water, props } — geometries plus the prop cells found in
// this chunk (props render as separate 3D meshes, not cube faces).
export function buildChunkGeometry(world, cx, cz) {
  const solid = new GeomBuffer();
  const water = new GeomBuffer();
  const lumineux = new GeomBuffer();
  // le tirage des vitres allumées se fait en coordonnées du MONDE : en
  // coordonnées locales, le même motif se répéterait dans chaque morceau
  const ox = cx * CHUNK, oz = cz * CHUNK;
  const props = [];
  const baseX = cx * CHUNK, baseZ = cz * CHUNK;
  const data = world.ensureChunk(cx, cz);

  // inutile de monter plus haut que le bloc le plus haut du chunk :
  // au-dessus, c'est de l'air, qui n'émet aucune face
  const topY = Math.min(world.chunkTop(cx, cz), HEIGHT - 1);

  const localGet = (x, y, z) => {
    if (y < 0 || y >= HEIGHT) return BLOCK.AIR;
    if (x >= 0 && x < CHUNK && z >= 0 && z < CHUNK) {
      return data[x + z * CHUNK + y * CHUNK * CHUNK];
    }
    return world.getBlock(baseX + x, y, baseZ + z);
  };

  // Les objets décoratifs sont de vrais maillages 3D, pas des cubes : on les
  // relève à part, en un balayage trivial.
  for (let y = 0; y <= topY; y++) {
    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        const id = data[x + z * CHUNK + y * CHUNK * CHUNK];
        if (id !== BLOCK.AIR && isProp(id)) props.push({ x, y, z, id });
      }
    }
  }

  // --- fusion, face par face ------------------------------------------------
  const dims = [CHUNK, topY + 1, CHUNK];
  const cellule = [0, 0, 0];

  for (const face of FACES) {
    const sAxis = face.dir[0] !== 0 ? 0 : face.dir[1] !== 0 ? 1 : 2;
    const { uAxis, vAxis } = face;
    const nU = dims[uAxis], nV = dims[vAxis], nS = dims[sAxis];
    // le masque décrit une tranche : chaque case porte la face à émettre, ou
    // null. Réutilisé d'une tranche à l'autre pour ne rien allouer en boucle.
    const masque = new Array(nU * nV);

    for (let s = 0; s < nS; s++) {
      masque.fill(null);
      let vide = true;

      for (let v = 0; v < nV; v++) {
        for (let u = 0; u < nU; u++) {
          cellule[sAxis] = s; cellule[uAxis] = u; cellule[vAxis] = v;
          const [x, y, z] = cellule;
          const id = data[x + z * CHUNK + y * CHUNK * CHUNK];
          if (id === BLOCK.AIR || isProp(id)) continue;

          const isWater = id === BLOCK.WATER;
          const slab = isSlab(id);
          const above = localGet(x, y + 1, z);
          const yTop = isWater && above !== BLOCK.WATER ? WATER_SURFACE_Y : slab ? 0.5 : 1;
          const neighbor = localGet(x + face.dir[0], y + face.dir[1], z + face.dir[2]);

          // a slab's top sits at half height, so it is always exposed
          const sommetDeDalle = slab && face.dir[1] === 1;
          if (!sommetDeDalle) {
            if (!shouldRenderFace(id, neighbor)) continue;
            if (isWater && neighbor !== BLOCK.AIR && neighbor !== BLOCK.GLASS) continue;
          }

          const ao = isWater ? null : faceAO(localGet, face, x, y, z);

          // Deux raisons de refuser la fusion, toutes deux traduites par une
          // clé que rien ne peut égaler :
          //
          // — un bloc plus court que sa case (eau de surface, dalle) ne peut
          //   pas s'étirer verticalement, deux quads empilés deviendraient un
          //   mur plein ;
          // — une face dont les quatre coins n'ont pas la même occlusion porte
          //   un dégradé. L'étirer sur plusieurs blocs changerait le rendu :
          //   le dégradé se répète par bloc, il ne se distend pas. On ne
          //   fusionne donc que les faces à ombrage uniforme, ce qui couvre
          //   les grandes étendues plates — exactement là où c'est rentable —
          //   et laisse les bords intacts, au pixel près.
          const uniforme = !ao || (ao[0] === ao[1] && ao[1] === ao[2] && ao[2] === ao[3]);
          const bloqueV = vAxis === 1 && yTop !== 1;
          const allume = VITRES.has(id) && vitreAllumee(ox + x, y, oz + z);
          const cle = (bloqueV || !uniforme)
            ? `@${u},${v}`
            : `${id}|${yTop}|${ao ? ao[0] : '-'}|${allume ? 'A' : ''}`;
          masque[u + v * nU] = { cle, id, yTop, ao, tile: BLOCK_INFO[id].tiles[face.slot], isWater, allume, x, y, z };
          vide = false;
        }
      }
      if (vide) continue;

      // remplissage rectangulaire glouton : on étend d'abord en largeur,
      // puis en hauteur tant que toute la rangée correspond
      for (let v = 0; v < nV; v++) {
        for (let u = 0; u < nU; u++) {
          const cel = masque[u + v * nU];
          if (!cel) continue;

          let w = 1;
          while (u + w < nU) {
            const c2 = masque[u + w + v * nU];
            if (!c2 || c2.cle !== cel.cle) break;
            w++;
          }

          let h = 1;
          extension: while (v + h < nV) {
            for (let k = 0; k < w; k++) {
              const c2 = masque[u + k + (v + h) * nU];
              if (!c2 || c2.cle !== cel.cle) break extension;
            }
            h++;
          }

          for (let dv = 0; dv < h; dv++) {
            for (let du = 0; du < w; du++) masque[u + du + (v + dv) * nU] = null;
          }

          const buffer = cel.isWater ? water : (cel.allume ? lumineux : solid);
          buffer.addFace(face, cel.x, cel.y, cel.z, cel.tile, cel.yTop, cel.ao, w, h);
        }
      }
    }
  }

  return {
    solid: solid.toGeometry(),
    water: water.toGeometry(),
    lumineux: lumineux.toGeometry(),
    props,
  };
}
