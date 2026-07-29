// Infinite procedurally generated voxel world, stored as 16xHx16 chunks.

import { BLOCK, isSolid as blockIsSolid } from './blocks.js';

export const CHUNK = 16;
export const HEIGHT = 96;
export const WATER_LEVEL = 30;
export const SEED = 1337;

// --- deterministic noise -------------------------------------------------

function hash2i(x, z, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, z, seed) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2i(xi, zi, seed);
  const b = hash2i(xi + 1, zi, seed);
  const c = hash2i(xi, zi + 1, seed);
  const d = hash2i(xi + 1, zi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, z, seed, octaves = 4) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, z * freq, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm; // 0..1
}

// --- world ----------------------------------------------------------------

export class World {
  constructor() {
    this.chunks = new Map();      // "cx,cz" -> Uint8Array
    this.dirty = new Set();       // chunk keys needing a remesh
    this.edits = new Map();       // "x,y,z" -> block id (player modifications)
  }

  static key(cx, cz) { return cx + ',' + cz; }

  static index(x, y, z) { return x + z * CHUNK + y * CHUNK * CHUNK; }

  terrainHeight(x, z) {
    const mountains = fbm(x * 0.0035, z * 0.0035, SEED + 9001);
    const hills = fbm(x * 0.016, z * 0.016, SEED);
    const h = 24 + hills * 14 + Math.pow(mountains, 3) * 48;
    return Math.max(2, Math.min(HEIGHT - 16, Math.floor(h)));
  }

  treeAt(x, z) {
    if (hash2i(x, z, SEED + 777) >= 0.012) return null;
    const h = this.terrainHeight(x, z);
    if (h <= WATER_LEVEL + 1 || h >= 58) return null; // only on grass
    const trunk = 4 + Math.floor(hash2i(x, z, SEED + 778) * 3); // 4..6
    return { h, trunk };
  }

  generateChunk(cx, cz) {
    const data = new Uint8Array(CHUNK * CHUNK * HEIGHT);
    const baseX = cx * CHUNK, baseZ = cz * CHUNK;

    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        const wx = baseX + x, wz = baseZ + z;
        const h = this.terrainHeight(wx, wz);

        let top = BLOCK.GRASS;
        let filler = BLOCK.DIRT;
        if (h <= WATER_LEVEL + 1) { top = BLOCK.SAND; filler = BLOCK.SAND; }
        else if (h >= 58) { top = BLOCK.SNOW; filler = BLOCK.STONE; }

        for (let y = 0; y <= h; y++) {
          let id;
          if (y === h) id = top;
          else if (y >= h - 3) id = filler;
          else id = BLOCK.STONE;
          data[World.index(x, y, z)] = id;
        }
        for (let y = h + 1; y <= WATER_LEVEL; y++) {
          data[World.index(x, y, z)] = BLOCK.WATER;
        }
      }
    }

    // Trees — scan a border so canopies from neighbouring chunks reach in.
    for (let tz = baseZ - 3; tz < baseZ + CHUNK + 3; tz++) {
      for (let tx = baseX - 3; tx < baseX + CHUNK + 3; tx++) {
        const tree = this.treeAt(tx, tz);
        if (!tree) continue;
        const { h, trunk } = tree;
        const topY = h + trunk;

        const put = (wx, wy, wz, id, replaceOnlyAir) => {
          const lx = wx - baseX, lz = wz - baseZ;
          if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || wy < 0 || wy >= HEIGHT) return;
          const i = World.index(lx, wy, lz);
          if (replaceOnlyAir && data[i] !== BLOCK.AIR) return;
          data[i] = id;
        };

        // canopy
        for (let dy = -2; dy <= 1; dy++) {
          const y = topY + dy;
          const r = dy < 0 ? 2 : 1;
          for (let dx = -r; dx <= r; dx++) {
            for (let dz = -r; dz <= r; dz++) {
              if (Math.abs(dx) === r && Math.abs(dz) === r && dy >= 0) continue;
              if (dx === 0 && dz === 0 && dy < 0) continue; // trunk passes through
              put(tx + dx, y, tz + dz, BLOCK.LEAVES, true);
            }
          }
        }
        put(tx, topY + 2, tz, BLOCK.LEAVES, true);
        // trunk
        for (let y = h + 1; y <= topY; y++) put(tx, y, tz, BLOCK.LOG, false);
      }
    }

    // Re-apply player edits inside this chunk.
    for (const [k, id] of this.edits) {
      const [ex, ey, ez] = k.split(',').map(Number);
      if (Math.floor(ex / CHUNK) === cx && Math.floor(ez / CHUNK) === cz) {
        data[World.index(ex - baseX, ey, ez - baseZ)] = id;
      }
    }

    return data;
  }

  ensureChunk(cx, cz) {
    const key = World.key(cx, cz);
    let data = this.chunks.get(key);
    if (!data) {
      data = this.generateChunk(cx, cz);
      this.chunks.set(key, data);
    }
    return data;
  }

  getBlock(x, y, z) {
    if (y < 0 || y >= HEIGHT) return BLOCK.AIR;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const data = this.ensureChunk(cx, cz);
    return data[World.index(x - cx * CHUNK, y, z - cz * CHUNK)];
  }

  setBlock(x, y, z, id) {
    if (y < 0 || y >= HEIGHT) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const data = this.ensureChunk(cx, cz);
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    data[World.index(lx, y, lz)] = id;
    this.edits.set(`${x},${y},${z}`, id);

    this.dirty.add(World.key(cx, cz));
    if (lx === 0) this.dirty.add(World.key(cx - 1, cz));
    if (lx === CHUNK - 1) this.dirty.add(World.key(cx + 1, cz));
    if (lz === 0) this.dirty.add(World.key(cx, cz - 1));
    if (lz === CHUNK - 1) this.dirty.add(World.key(cx, cz + 1));
  }

  isSolid(x, y, z) {
    if (y < 0) return true; // never fall out of the world
    if (y >= HEIGHT) return false;
    return blockIsSolid(this.getBlock(x, y, z));
  }

  // --- persistence (player edits only; terrain is deterministic) ----------

  static STORAGE_KEY = 'web-minecraft-edits-v1';

  loadEdits() {
    try {
      const raw = localStorage.getItem(World.STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) this.edits.set(k, v);
    } catch { /* corrupted save — start fresh */ }
  }

  saveEdits() {
    try {
      localStorage.setItem(World.STORAGE_KEY, JSON.stringify(Object.fromEntries(this.edits)));
    } catch { /* storage full or unavailable — play on without saving */ }
  }

  static clearSave() {
    try { localStorage.removeItem(World.STORAGE_KEY); } catch { /* ignore */ }
  }
}
