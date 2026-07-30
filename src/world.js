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

// --- landmarks --------------------------------------------------------------
// Famous-city-inspired monuments stamped into the terrain at fixed coords
// near spawn: an Eiffel-style tower, a stepped Manhattan skyscraper, and a
// red suspension bridge. set(dx, dy, dz, id) is relative to the anchor base.

function buildEiffelTower(set) {
  const ring = (r, y) => {
    for (let d = -r; d <= r; d++) {
      set(d, y, -r, BLOCK.COBBLE); set(d, y, r, BLOCK.COBBLE);
      set(-r, y, d, BLOCK.COBBLE); set(r, y, d, BLOCK.COBBLE);
    }
  };
  for (let y = 0; y < 8; y++) for (const sx of [-3, 3]) for (const sz of [-3, 3]) set(sx, y, sz, BLOCK.COBBLE);
  ring(3, 8);
  for (let y = 9; y < 16; y++) for (const sx of [-2, 2]) for (const sz of [-2, 2]) set(sx, y, sz, BLOCK.COBBLE);
  ring(2, 16);
  for (let y = 17; y < 24; y++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) set(sx, y, sz, BLOCK.COBBLE);
  ring(1, 24);
  for (let y = 25; y < 31; y++) set(0, y, 0, BLOCK.COBBLE);
  set(0, 31, 0, BLOCK.GLASS); // the beacon
}

function buildSkyscraper(set) {
  const levels = [[5, 0, 12], [4, 12, 22], [3, 22, 30], [2, 30, 36]];
  for (const [r, from, to] of levels) {
    for (let y = from; y < to; y++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue; // walls only
          const glassRow = y % 3 === 1;
          set(dx, y, dz, glassRow ? BLOCK.GLASS : BLOCK.BRICK);
        }
      }
    }
  }
  for (let y = 36; y < 42; y++) set(0, y, 0, BLOCK.BRICK); // spire
  set(0, 42, 0, BLOCK.GLASS);
}

function buildSuspensionBridge(set) {
  for (const tx of [-15, 15]) { // the two towers
    for (let y = 0; y < 18; y++) {
      for (const dx of [0, 1]) for (const dz of [-1, 2]) set(tx + dx, y, dz, BLOCK.BRICK);
    }
    for (const yy of [10, 17]) for (const dz of [0, 1]) set(tx, yy, dz, BLOCK.BRICK);
  }
  for (let dx = -20; dx <= 21; dx++) { // deck
    for (let dz = 0; dz <= 1; dz++) set(dx, 8, dz, BLOCK.PLANK);
  }
  for (let dx = -14; dx <= 15; dx++) { // catenary-ish cables
    const t = Math.min(Math.abs(dx - 0.5) / 15, 1);
    const cy = 17 - Math.round((1 - t * t) * 8);
    set(dx, cy, -1, BLOCK.BRICK);
    set(dx, cy, 2, BLOCK.BRICK);
  }
}

function buildGlassPyramid(set) { // le Louvre
  for (let level = 0; level <= 5; level++) {
    const r = 5 - level;
    for (let d = -r; d <= r; d++) {
      set(d, level, -r, BLOCK.GLASS); set(d, level, r, BLOCK.GLASS);
      set(-r, level, d, BLOCK.GLASS); set(r, level, d, BLOCK.GLASS);
    }
  }
  for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) set(dx, -1, dz, BLOCK.SANDSTONE);
}

function buildLighthouse(set) { // rayé rouge et blanc
  for (let y = 0; y < 16; y++) {
    const id = Math.floor(y / 2) % 2 === 0 ? BLOCK.WOOL_RED : BLOCK.SNOW;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        set(dx, y, dz, id);
      }
    }
  }
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(dx, 16, dz, BLOCK.GLASS);
  set(0, 16, 0, BLOCK.GOLD); // the light
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(dx, 17, dz, BLOCK.SLAB_STONE);
}

function buildArch(set) { // l'Arc de Triomphe
  for (let y = 0; y < 6; y++) {
    for (const sx of [-3, -2, 2, 3]) {
      set(sx, y, 0, BLOCK.SANDSTONE); set(sx, y, 1, BLOCK.SANDSTONE);
    }
  }
  for (let y = 6; y < 9; y++) {
    for (let dx = -3; dx <= 3; dx++) {
      set(dx, y, 0, BLOCK.SANDSTONE); set(dx, y, 1, BLOCK.SANDSTONE);
    }
  }
  for (let dx = -3; dx <= 3; dx++) { set(dx, 9, 0, BLOCK.SLAB_STONE); set(dx, 9, 1, BLOCK.SLAB_STONE); }
}

function buildCastle(set) { // petit château fort
  const R = 5;
  for (let y = 0; y < 5; y++) {
    for (let d = -R; d <= R; d++) {
      if (y < 3 && d >= -1 && d <= 1) { set(d, y, -R, BLOCK.AIR); } // gate
      else set(d, y, -R, BLOCK.COBBLE);
      set(d, y, R, BLOCK.COBBLE);
      set(-R, y, d, BLOCK.COBBLE); set(R, y, d, BLOCK.COBBLE);
    }
  }
  for (let d = -R; d <= R; d += 2) { // crenellations
    set(d, 5, -R, BLOCK.COBBLE); set(d, 5, R, BLOCK.COBBLE);
    set(-R, 5, d, BLOCK.COBBLE); set(R, 5, d, BLOCK.COBBLE);
  }
  for (const sx of [-R, R]) { // corner towers
    for (const sz of [-R, R]) {
      for (let y = 0; y < 8; y++) {
        for (let dx = 0; dx <= 1; dx++) {
          for (let dz = 0; dz <= 1; dz++) {
            set(sx + (sx > 0 ? -dx : dx), y, sz + (sz > 0 ? -dz : dz), BLOCK.STONEBRICK);
          }
        }
      }
      set(sx, 8, sz, BLOCK.WOOL_RED); // little flags
    }
  }
}

const LANDMARKS = [
  { name: 'Tour Eiffel', x: 45, z: 45, box: 4, build: buildEiffelTower },
  { name: 'Empire State', x: -55, z: -15, box: 6, build: buildSkyscraper },
  { name: 'Golden Gate', x: 25, z: -60, box: 22, build: buildSuspensionBridge },
  { name: 'Pyramide du Louvre', x: -15, z: 65, box: 6, build: buildGlassPyramid },
  { name: 'Phare', x: 65, z: -15, box: 3, build: buildLighthouse },
  { name: 'Arc de Triomphe', x: -65, z: 25, box: 5, build: buildArch },
  { name: 'Château fort', x: 40, z: 75, box: 6, build: buildCastle },
];

// --- world ----------------------------------------------------------------

// The city district: flattened terrain, a street grid, procedural buildings.
export const CITY = { x: -70, z: 60, r: 45, cell: 12, base: 34 };

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
    let h = 24 + hills * 14 + Math.pow(mountains, 3) * 48;

    // seas: low continentalness sinks the land, but never near spawn
    const distO = Math.hypot(x, z);
    const oceanFactor = Math.min(1, Math.max(0, (distO - 90) / 60));
    const continent = fbm(x * 0.005, z * 0.005, SEED + 501);
    if (continent < 0.45) h -= (0.45 - continent) * 130 * oceanFactor;

    // lakes: small pockets carved below water level
    const lake = fbm(x * 0.03, z * 0.03, SEED + 601);
    if (lake > 0.72) h = Math.min(h, WATER_LEVEL - 2 - (lake - 0.72) * 30);

    // the city sits on a flat plateau
    const cd = Math.hypot(x - CITY.x, z - CITY.z);
    if (cd < CITY.r) {
      const m = Math.min(1, (CITY.r - cd) / 18);
      h = h * (1 - m) + CITY.base * m;
    }

    return Math.max(2, Math.min(HEIGHT - 16, Math.floor(h)));
  }

  treeAt(x, z) {
    if (Math.hypot(x - CITY.x, z - CITY.z) < CITY.r - 2) return null; // no trees downtown
    // forests are dense, plains nearly bare
    const forest = fbm(x * 0.008, z * 0.008, SEED + 701);
    const density = forest > 0.62 ? 0.06 : forest > 0.48 ? 0.015 : 0.0025;
    if (hash2i(x, z, SEED + 777) >= density) return null;
    const h = this.terrainHeight(x, z);
    if (h <= WATER_LEVEL + 1 || h >= 58) return null; // only on grass
    const trunk = 4 + Math.floor(hash2i(x, z, SEED + 778) * 3); // 4..6
    return { h, trunk };
  }

  generateChunk(cx, cz) {
    // 16-bit: block ids go beyond 255 with the decorative set
    const data = new Uint16Array(CHUNK * CHUNK * HEIGHT);
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

        // city streets: a stone grid through the district
        const cd = Math.hypot(wx - CITY.x, wz - CITY.z);
        if (cd < CITY.r - 4 && h > WATER_LEVEL) {
          const mx = ((wx % CITY.cell) + CITY.cell) % CITY.cell;
          const mz = ((wz % CITY.cell) + CITY.cell) % CITY.cell;
          if (mx < 2 || mz < 2) data[World.index(x, h, z)] = BLOCK.STONE;
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

    // City buildings: one lot per grid cell, deterministic per cell.
    const stamp = (wx, wy, wz, id) => {
      const lx = wx - baseX, lz = wz - baseZ;
      if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || wy < 0 || wy >= HEIGHT) return;
      data[World.index(lx, wy, lz)] = id;
    };
    const CELL = CITY.cell;
    const BUILDING_MATS = [BLOCK.BRICK, BLOCK.STONEBRICK, BLOCK.WHITEBRICK, BLOCK.TERRACOTTA, BLOCK.BLUEBRICK, BLOCK.SANDSTONE];
    const minGX = Math.floor((baseX - CELL) / CELL), maxGX = Math.floor((baseX + CHUNK + CELL) / CELL);
    const minGZ = Math.floor((baseZ - CELL) / CELL), maxGZ = Math.floor((baseZ + CHUNK + CELL) / CELL);
    for (let gz = minGZ; gz <= maxGZ; gz++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        const lotX = gx * CELL, lotZ = gz * CELL;
        const ccx = lotX + CELL / 2, ccz = lotZ + CELL / 2;
        if (Math.hypot(ccx - CITY.x, ccz - CITY.z) > CITY.r - 10) continue;
        if (hash2i(gx, gz, SEED + 801) > 0.8) continue; // a little park
        const bh = 5 + Math.floor(hash2i(gx, gz, SEED + 802) * 11);
        const mat = BUILDING_MATS[Math.floor(hash2i(gx, gz, SEED + 803) * BUILDING_MATS.length)];
        const by = this.terrainHeight(Math.floor(ccx), Math.floor(ccz)) + 1;
        const x0 = lotX + 3, x1 = lotX + CELL - 2, z0 = lotZ + 3, z1 = lotZ + CELL - 2;
        for (let y = 0; y < bh; y++) {
          for (let wx = x0; wx <= x1; wx++) {
            for (let wz = z0; wz <= z1; wz++) {
              const wall = wx === x0 || wx === x1 || wz === z0 || wz === z1;
              if (!wall) { if (y === 0) stamp(wx, by - 1, wz, mat); continue; }
              const window = y % 3 !== 0 && ((wx + wz) % 2 === 0);
              stamp(wx, by + y, wz, window ? BLOCK.GLASS : mat);
            }
          }
        }
        for (let wx = x0; wx <= x1; wx++) { // flat roof
          for (let wz = z0; wz <= z1; wz++) stamp(wx, by + bh, wz, mat);
        }
        const doorX = Math.floor((x0 + x1) / 2); // doorway on the south face
        stamp(doorX, by, z0, BLOCK.AIR);
        stamp(doorX, by + 1, z0, BLOCK.AIR);
      }
    }

    // Landmarks (fixed world positions, deterministic base height).
    for (const lm of LANDMARKS) {
      if (lm.x + lm.box < baseX || lm.x - lm.box >= baseX + CHUNK ||
          lm.z + lm.box < baseZ || lm.z - lm.box >= baseZ + CHUNK) continue;
      const baseY = this.terrainHeight(lm.x, lm.z);
      lm.build((dx, dy, dz, id) => {
        const lx = lm.x + dx - baseX, lz = lm.z + dz - baseZ;
        const wy = baseY + dy;
        if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || wy < 0 || wy >= HEIGHT) return;
        data[World.index(lx, wy, lz)] = id;
      });
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
