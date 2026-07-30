// Builds chunk geometry: one buffer for solid/cutout blocks, one for water.
// Only faces adjacent to air or transparent blocks are emitted.

import * as THREE from 'three';
import { BLOCK, BLOCK_INFO, isTransparent, isSlab, isProp } from './blocks.js';
import { tileUV } from './textures.js';
import { CHUNK, HEIGHT } from './world.js';

// Faces: corner positions (CCW from outside), normal, tile slot (0 top / 1 side / 2 bottom), shade.
const FACES = [
  { // +x
    dir: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 1, shade: 0.62,
  },
  { // -x
    dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 1, shade: 0.62,
  },
  { // +y (top)
    dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 0, shade: 1.0,
  },
  { // -y (bottom)
    dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 2, shade: 0.5,
  },
  { // +z
    dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 1, shade: 0.8,
  },
  { // -z
    dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 1, shade: 0.8,
  },
];

const WATER_SURFACE_Y = 0.875; // water sits slightly below the block top

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
    this.indices = [];
  }

  addFace(face, x, y, z, tile, yTop, ao) {
    const base = this.positions.length / 3;
    const [u0, v0, u1, v1] = tileUV(tile);
    for (let i = 0; i < 4; i++) {
      const c = face.corners[i];
      const cy = c[1] === 1 ? yTop : c[1];
      this.positions.push(x + c[0], y + cy, z + c[2]);
      this.normals.push(face.dir[0], face.dir[1], face.dir[2]);
      const [fu, fv] = face.uvs[i];
      this.uvs.push(u0 + (u1 - u0) * fu, v0 + (v1 - v0) * fv);
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
  const props = [];
  const baseX = cx * CHUNK, baseZ = cz * CHUNK;
  const data = world.ensureChunk(cx, cz);

  const localGet = (x, y, z) => {
    if (y < 0 || y >= HEIGHT) return BLOCK.AIR;
    if (x >= 0 && x < CHUNK && z >= 0 && z < CHUNK) {
      return data[x + z * CHUNK + y * CHUNK * CHUNK];
    }
    return world.getBlock(baseX + x, y, baseZ + z);
  };

  for (let y = 0; y < HEIGHT; y++) {
    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        const id = data[x + z * CHUNK + y * CHUNK * CHUNK];
        if (id === BLOCK.AIR) continue;
        if (isProp(id)) { props.push({ x, y, z, id }); continue; }

        const info = BLOCK_INFO[id];
        const isWater = id === BLOCK.WATER;
        const slab = isSlab(id);
        const buffer = isWater ? water : solid;
        const above = localGet(x, y + 1, z);
        const yTop = isWater && above !== BLOCK.WATER ? WATER_SURFACE_Y : slab ? 0.5 : 1;

        for (const face of FACES) {
          const neighbor = localGet(x + face.dir[0], y + face.dir[1], z + face.dir[2]);
          // a slab's top sits at half height, so it is always exposed
          if (slab && face.dir[1] === 1) {
            buffer.addFace(face, x, y, z, info.tiles[face.slot], yTop, faceAO(localGet, face, x, y, z));
            continue;
          }
          if (!shouldRenderFace(id, neighbor)) continue;
          if (isWater && neighbor !== BLOCK.AIR && neighbor !== BLOCK.GLASS) continue;
          const ao = isWater ? null : faceAO(localGet, face, x, y, z);
          buffer.addFace(face, x, y, z, info.tiles[face.slot], yTop, ao);
        }
      }
    }
  }

  return { solid: solid.toGeometry(), water: water.toGeometry(), props };
}
