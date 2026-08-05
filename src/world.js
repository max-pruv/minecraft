// Infinite procedurally generated voxel world, stored as 16xHx16 chunks.

import { BLOCK, CITY_BLOCK, DECOR_START, isSolid as blockIsSolid } from './blocks.js';

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
  const IRON = BLOCK.DARKBRICK;
  const ring = (r, y) => {
    for (let d = -r; d <= r; d++) {
      set(d, y, -r, IRON); set(d, y, r, IRON);
      set(-r, y, d, IRON); set(r, y, d, IRON);
    }
  };
  for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) set(dx, -1, dz, CITY_BLOCK.SIDEWALK); // parvis
  for (let y = 0; y < 10; y++) { // four splayed legs
    const off = y < 5 ? 4 : 3;
    for (const sx of [-off, off]) for (const sz of [-off, off]) set(sx, y, sz, IRON);
  }
  ring(4, 10); ring(3, 11); // first platform
  for (let y = 12; y < 20; y++) for (const sx of [-2, 2]) for (const sz of [-2, 2]) set(sx, y, sz, IRON);
  ring(2, 20); // second platform
  for (let y = 21; y < 30; y++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) set(sx, y, sz, IRON);
  ring(1, 30); // third platform
  for (let y = 31; y < 40; y++) set(0, y, 0, IRON); // mast
  set(0, 40, 0, BLOCK.GOLD);
  set(0, 41, 0, BLOCK.GLASS); // the beacon
}

function buildSkyscraper(set) { // Empire State: limestone tiers + steel spire
  const levels = [[5, 0, 16], [4, 16, 28], [3, 28, 38], [2, 38, 46]];
  for (const [r, from, to] of levels) {
    for (let y = from; y < to; y++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue; // walls only
          const glassRow = y % 3 !== 2;
          set(dx, y, dz, glassRow && (dx + dz) % 2 === 0 ? CITY_BLOCK.CURTAIN : CITY_BLOCK.GRANITE);
        }
      }
    }
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) set(dx, to, dz, CITY_BLOCK.GRANITE);
  }
  for (let y = 46; y < 53; y++) set(0, y, 0, CITY_BLOCK.GRANITE); // spire
  set(0, 53, 0, BLOCK.GOLD);
}

function buildStatue(set) { // Lady Liberty: granite pedestal, copper body, gold torch
  const C = CITY_BLOCK.COPPER;
  for (let y = 0; y < 5; y++) { // pedestal
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) set(dx, y, dz, CITY_BLOCK.GRANITE);
  }
  for (let y = 5; y < 12; y++) { // robe
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(dx, y, dz, C);
  }
  set(0, 12, 0, C); set(0, 13, 0, C); // head
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) set(dx, 14, dz, C); // crown spikes
  set(2, 11, 0, C); set(2, 12, 0, C); set(2, 13, 0, C); // raised arm
  set(2, 14, 0, BLOCK.GOLD); // the torch
  set(-2, 10, 0, C); // tablet arm
}

function buildSuspensionBridge(set) { // Golden Gate, international orange
  const R = BLOCK.WOOL_RED;
  for (const tx of [-18, 18]) { // the two towers
    for (let y = 0; y < 26; y++) {
      for (const dz of [-2, 3]) { set(tx, y, dz, R); set(tx + 1, y, dz, R); }
    }
    for (const yy of [13, 19, 25]) { // crossbeams
      for (let dz = -2; dz <= 3; dz++) { set(tx, yy, dz, R); set(tx + 1, yy, dz, R); }
    }
  }
  for (let dx = -30; dx <= 31; dx++) { // deck + side rails
    for (let dz = 0; dz <= 1; dz++) set(dx, 10, dz, CITY_BLOCK.ASPHALT);
    set(dx, 11, -1, R); set(dx, 11, 2, R);
  }
  for (let dx = -17; dx <= 18; dx++) { // main catenary between towers
    const t = Math.min(Math.abs(dx - 0.5) / 17.5, 1);
    const cy = 25 - Math.round((1 - t * t) * 13);
    set(dx, cy, -2, R); set(dx, cy, 3, R);
    if ((dx + 30) % 4 === 0) { // hangers
      for (let y = 12; y < cy; y++) { set(dx, y, -2, R); set(dx, y, 3, R); }
    }
  }
  for (const side of [-1, 1]) { // back spans to the shores
    for (let i = 0; i <= 11; i++) {
      const dx = side * (19 + i);
      const cy = 25 - i;
      if (cy > 11) { set(dx, cy, -2, R); set(dx, cy, 3, R); }
    }
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
  const S = CITY_BLOCK.HAUSSMANN;
  for (let dx = -5; dx <= 5; dx++) for (let dz = -2; dz <= 3; dz++) set(dx, -1, dz, CITY_BLOCK.SIDEWALK);
  for (let y = 0; y < 8; y++) {
    for (const sx of [-4, -3, 3, 4]) {
      for (let dz = 0; dz <= 2; dz++) set(sx, y, dz, S);
    }
  }
  for (let y = 8; y < 12; y++) { // attic over the arch
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = 0; dz <= 2; dz++) set(dx, y, dz, S);
    }
  }
  for (let dx = -2; dx <= 2; dx++) { // vault curve carved out
    set(dx, 8, 1, BLOCK.AIR);
    if (Math.abs(dx) <= 1) set(dx, 9, 1, BLOCK.AIR);
  }
  for (let dx = -4; dx <= 4; dx++) { set(dx, 12, 0, BLOCK.SLAB_STONE); set(dx, 12, 1, BLOCK.SLAB_STONE); set(dx, 12, 2, BLOCK.SLAB_STONE); }
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

// Each landmark lives inside its own themed city district.
// waterBase: the base rises to water level so piers/bridges sit above the sea.
const LANDMARKS = [
  // Paris
  { name: 'Tour Eiffel', x: -85, z: 44, box: 8, build: buildEiffelTower },
  { name: 'Arc de Triomphe', x: -108, z: 70, box: 7, build: buildArch },
  { name: 'Pyramide du Louvre', x: -62, z: 92, box: 7, build: buildGlassPyramid },
  // New York
  { name: 'Empire State', x: 105, z: -40, box: 7, build: buildSkyscraper },
  { name: 'Statue de la Liberté', x: 128, z: -84, box: 4, waterBase: true, build: buildStatue },
  // San Francisco
  { name: 'Golden Gate', x: 0, z: -168, box: 34, waterBase: true, build: buildSuspensionBridge },
  { name: 'Phare', x: -38, z: -148, box: 3, waterBase: true, build: buildLighthouse },
  // Countryside
  { name: 'Château fort', x: 40, z: 75, box: 6, build: buildCastle },
];

// --- world ----------------------------------------------------------------

// Three themed city districts, each with its own architecture, street
// pattern and landmarks: Haussmann Paris, skyscraper New York, and
// pastel-hilled San Francisco.
export const CITIES = [
  { key: 'paris', name: 'Paris', x: -85, z: 70, r: 55, cell: 12, base: 34, street: 3 },
  { key: 'ny', name: 'New York', x: 105, z: -40, r: 58, cell: 14, base: 33, street: 4 },
  { key: 'sf', name: 'San Francisco', x: 0, z: -115, r: 50, cell: 11, base: 33, street: 3 },
];

// SF painted-lady facades reuse the plain decor blocks (Uni pattern).
const SF_PASTELS = [15, 9, 29, 28, 16, 3, 4, 7].map((ci) => DECOR_START + ci * 10);

export class World {
  constructor() {
    this.chunks = new Map();      // "cx,cz" -> Uint8Array
    this.dirty = new Set();       // chunk keys needing a remesh
    this.edits = new Map();       // "x,y,z" -> block id (player modifications)
    this.editTimes = new Map();   // "x,y,z" -> ms timestamp, for multiplayer merge
    this.onOp = null;             // hook(k, id, ts) — net layer broadcasts local edits
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

    // city districts: Paris and New York are flat plateaus; San Francisco
    // keeps its rolling hills so its streets climb like the real thing
    for (const c of CITIES) {
      const cd = Math.hypot(x - c.x, z - c.z);
      if (cd < c.r) {
        const m = Math.min(1, (c.r - cd) / 16);
        const target = c.key === 'sf' ? c.base + hills * 10 : c.base;
        h = h * (1 - m) + target * m;
        break;
      }
    }

    return Math.max(2, Math.min(HEIGHT - 16, Math.floor(h)));
  }

  cityAt(x, z) {
    for (const c of CITIES) {
      if (Math.hypot(x - c.x, z - c.z) < c.r) return c;
    }
    return null;
  }

  treeAt(x, z) {
    if (this.cityAt(x, z)) return null; // no wild trees downtown
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

        // city streets: asphalt with sidewalks, dashed center lines and
        // crosswalks at intersections
        const city = this.cityAt(wx, wz);
        if (city && Math.hypot(wx - city.x, wz - city.z) < city.r - 4 && h > WATER_LEVEL) {
          const w = city.street;
          const mid = Math.floor(w / 2);
          const mx = ((wx % city.cell) + city.cell) % city.cell;
          const mz = ((wz % city.cell) + city.cell) % city.cell;
          const inX = mx < w, inZ = mz < w;
          if (inX || inZ) {
            let id = CITY_BLOCK.ASPHALT;
            if (inX && inZ) {
              id = (mx + mz) % 2 === 0 ? CITY_BLOCK.CROSSWALK : CITY_BLOCK.ASPHALT;
            } else if (inX && (mx === 0 || mx === w - 1)) {
              id = CITY_BLOCK.SIDEWALK;
            } else if (inZ && (mz === 0 || mz === w - 1)) {
              id = CITY_BLOCK.SIDEWALK;
            } else if (inX && mx === mid && ((wz & 7) < 4)) {
              id = CITY_BLOCK.ROADLINE;
            } else if (inZ && mz === mid && ((wx & 7) < 4)) {
              id = CITY_BLOCK.ROADLINE;
            }
            data[World.index(x, h, z)] = id;
          }
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
    // Landmarks get an open plaza — no buildings on top of them.
    const nearLandmark = (ccx, ccz) =>
      LANDMARKS.some((lm) => Math.abs(ccx - lm.x) < lm.box + 7 && Math.abs(ccz - lm.z) < lm.box + 7);

    // Fill from the build level down to the terrain so hillside houses
    // never float (essential on San Francisco's slopes).
    const foundation = (wx, wz, by, id) => {
      const th = this.terrainHeight(wx, wz);
      for (let y = by - 1; y > th; y--) stamp(wx, y, wz, id);
    };

    for (const city of CITIES) {
      const CELL = city.cell;
      const minGX = Math.floor((baseX - CELL) / CELL), maxGX = Math.floor((baseX + CHUNK + CELL) / CELL);
      const minGZ = Math.floor((baseZ - CELL) / CELL), maxGZ = Math.floor((baseZ + CHUNK + CELL) / CELL);
      for (let gz = minGZ; gz <= maxGZ; gz++) {
        for (let gx = minGX; gx <= maxGX; gx++) {
          const lotX = gx * CELL, lotZ = gz * CELL;
          const ccx = lotX + CELL / 2, ccz = lotZ + CELL / 2;
          if (Math.hypot(ccx - city.x, ccz - city.z) > city.r - 10) continue;
          if (nearLandmark(ccx, ccz)) continue;
          if (hash2i(gx, gz, SEED + 801) > 0.85) continue; // pocket park
          const by = this.terrainHeight(Math.floor(ccx), Math.floor(ccz)) + 1;
          const x0 = lotX + city.street, x1 = lotX + CELL - 2;
          const z0 = lotZ + city.street, z1 = lotZ + CELL - 2;
          const doorX = Math.floor((x0 + x1) / 2);

          if (city.key === 'paris') {
            // Haussmann: uniform cream stone, tall window bays, zinc mansard
            const bh = 6 + Math.floor(hash2i(gx, gz, SEED + 802) * 2);
            for (let y = 0; y < bh; y++) {
              for (let wx = x0; wx <= x1; wx++) {
                for (let wz = z0; wz <= z1; wz++) {
                  const wall = wx === x0 || wx === x1 || wz === z0 || wz === z1;
                  if (!wall) { if (y === 0) stamp(wx, by - 1, wz, BLOCK.PLANK); continue; }
                  if (y === 0) foundation(wx, wz, by, CITY_BLOCK.HAUSSMANN);
                  const u = (wx === x0 || wx === x1) ? wz : wx;
                  const win = y > 0 && y % 3 !== 0 && u % 2 === 1;
                  stamp(wx, by + y, wz, win ? BLOCK.GLASS : CITY_BLOCK.HAUSSMANN);
                }
              }
            }
            for (let wx = x0; wx <= x1; wx++) {
              for (let wz = z0; wz <= z1; wz++) stamp(wx, by + bh, wz, CITY_BLOCK.ZINC);
            }
            for (let wx = x0 + 1; wx <= x1 - 1; wx++) {
              for (let wz = z0 + 1; wz <= z1 - 1; wz++) stamp(wx, by + bh + 1, wz, CITY_BLOCK.ZINC);
            }
            for (let wx = x0 + 2; wx <= x1 - 2; wx++) {
              for (let wz = z0 + 2; wz <= z1 - 2; wz++) stamp(wx, by + bh + 2, wz, BLOCK.SLAB_STONE);
            }
            stamp(doorX, by, z0, BLOCK.AIR);
            stamp(doorX, by + 1, z0, BLOCK.AIR);

          } else if (city.key === 'ny') {
            const kind = hash2i(gx, gz, SEED + 810);
            if (kind < 0.4) {
              // brownstone row house with a stoop
              const bh = 5 + Math.floor(hash2i(gx, gz, SEED + 802) * 3);
              for (let y = 0; y < bh; y++) {
                for (let wx = x0; wx <= x1; wx++) {
                  for (let wz = z0; wz <= z1; wz++) {
                    const wall = wx === x0 || wx === x1 || wz === z0 || wz === z1;
                    if (!wall) { if (y === 0) stamp(wx, by - 1, wz, BLOCK.PLANK); continue; }
                    if (y === 0) foundation(wx, wz, by, CITY_BLOCK.BROWNSTONE);
                    const u = (wx === x0 || wx === x1) ? wz : wx;
                    const win = y > 0 && y % 3 !== 0 && u % 2 === 1;
                    stamp(wx, by + y, wz, win ? BLOCK.GLASS : CITY_BLOCK.BROWNSTONE);
                  }
                }
              }
              for (let wx = x0; wx <= x1; wx++) {
                for (let wz = z0; wz <= z1; wz++) stamp(wx, by + bh, wz, CITY_BLOCK.BROWNSTONE);
              }
              stamp(doorX, by, z0, BLOCK.AIR);
              stamp(doorX, by + 1, z0, BLOCK.AIR);
              stamp(doorX, by - 1, z0 - 1, BLOCK.SLAB_STONE); // the stoop
            } else {
              // skyscraper with Manhattan-style setbacks
              const mat = kind > 0.72 ? CITY_BLOCK.CURTAIN : CITY_BLOCK.GRANITE;
              const t1 = 10 + Math.floor(hash2i(gx, gz, SEED + 811) * 10);
              const t2 = t1 + 6 + Math.floor(hash2i(gx, gz, SEED + 812) * 6);
              const t3 = t2 + 5;
              const tiers = [[0, 0, t1], [1, t1, t2], [2, t2, t3]];
              for (const [inset, from, to] of tiers) {
                const ax0 = x0 + inset, ax1 = x1 - inset, az0 = z0 + inset, az1 = z1 - inset;
                for (let y = from; y < to; y++) {
                  for (let wx = ax0; wx <= ax1; wx++) {
                    for (let wz = az0; wz <= az1; wz++) {
                      const wall = wx === ax0 || wx === ax1 || wz === az0 || wz === az1;
                      if (!wall) continue;
                      if (y === 0) foundation(wx, wz, by, CITY_BLOCK.GRANITE);
                      const corner = (wx === ax0 || wx === ax1) && (wz === az0 || wz === az1);
                      let id = mat;
                      if (corner) id = CITY_BLOCK.GRANITE;
                      else if (mat === CITY_BLOCK.GRANITE) {
                        const u = (wx === ax0 || wx === ax1) ? wz : wx;
                        if (y % 3 !== 0 && u % 2 === 1) id = BLOCK.GLASS;
                      }
                      stamp(wx, by + y, wz, id);
                    }
                  }
                }
                for (let wx = ax0; wx <= ax1; wx++) {
                  for (let wz = az0; wz <= az1; wz++) stamp(wx, by + to, wz, CITY_BLOCK.GRANITE);
                }
              }
              if (hash2i(gx, gz, SEED + 813) > 0.8) { // a few spires on the skyline
                for (let y = t3 + 1; y < t3 + 5; y++) stamp(doorX, by + y, Math.floor((z0 + z1) / 2), CITY_BLOCK.GRANITE);
                stamp(doorX, by + t3 + 5, Math.floor((z0 + z1) / 2), BLOCK.GOLD);
              }
              stamp(doorX, by, z0, BLOCK.AIR);
              stamp(doorX, by + 1, z0, BLOCK.AIR);
            }

          } else {
            // San Francisco: pastel painted ladies with white trim and bay windows
            const mat = SF_PASTELS[Math.floor(hash2i(gx, gz, SEED + 820) * SF_PASTELS.length)];
            const bh = 4 + Math.floor(hash2i(gx, gz, SEED + 802) * 2);
            for (let y = 0; y < bh; y++) {
              for (let wx = x0; wx <= x1; wx++) {
                for (let wz = z0; wz <= z1; wz++) {
                  const wall = wx === x0 || wx === x1 || wz === z0 || wz === z1;
                  if (!wall) { if (y === 0) stamp(wx, by - 1, wz, BLOCK.PLANK); continue; }
                  if (y === 0) foundation(wx, wz, by, mat);
                  const corner = (wx === x0 || wx === x1) && (wz === z0 || wz === z1);
                  const u = (wx === x0 || wx === x1) ? wz : wx;
                  const win = y > 0 && y % 3 !== 0 && u % 2 === 1;
                  stamp(wx, by + y, wz, corner ? BLOCK.WHITEBRICK : win ? BLOCK.GLASS : mat);
                }
              }
            }
            for (let y = 1; y < bh; y++) { // street-side bay window
              stamp(doorX, by + y, z0 - 1, y % 2 === 1 ? BLOCK.GLASS : mat);
            }
            foundation(doorX, z0 - 1, by + 1, mat);
            for (let wx = x0; wx <= x1; wx++) { // white cornice roof
              for (let wz = z0; wz <= z1; wz++) stamp(wx, by + bh, wz, BLOCK.WHITEBRICK);
            }
            for (let wx = x0 + 1; wx <= x1 - 1; wx++) {
              for (let wz = z0 + 1; wz <= z1 - 1; wz++) stamp(wx, by + bh + 1, wz, BLOCK.SLAB_STONE);
            }
            stamp(x0 + 1, by, z0, BLOCK.AIR); // SF doors sit to the side
            stamp(x0 + 1, by + 1, z0, BLOCK.AIR);
          }
        }
      }
    }

    // Landmarks (fixed world positions, deterministic base height).
    for (const lm of LANDMARKS) {
      if (lm.x + lm.box < baseX || lm.x - lm.box >= baseX + CHUNK ||
          lm.z + lm.box < baseZ || lm.z - lm.box >= baseZ + CHUNK) continue;
      let baseY = this.terrainHeight(lm.x, lm.z);
      if (lm.waterBase) baseY = Math.max(baseY, WATER_LEVEL - 1);
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

  setBlock(x, y, z, id, ts, remote = false) {
    if (y < 0 || y >= HEIGHT) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const data = this.ensureChunk(cx, cz);
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    data[World.index(lx, y, lz)] = id;
    const k = `${x},${y},${z}`;
    const t = ts !== undefined ? ts : Date.now();
    this.edits.set(k, id);
    this.editTimes.set(k, t);
    if (!remote && this.onOp) this.onOp(k, id, t);

    this.dirty.add(World.key(cx, cz));
    if (lx === 0) this.dirty.add(World.key(cx - 1, cz));
    if (lx === CHUNK - 1) this.dirty.add(World.key(cx + 1, cz));
    if (lz === 0) this.dirty.add(World.key(cx, cz - 1));
    if (lz === CHUNK - 1) this.dirty.add(World.key(cx, cz + 1));
  }

  // --- multiplayer sync: last-writer-wins merge of timestamped edit logs ----

  exportEdits() {
    const out = {};
    for (const [k, id] of this.edits) out[k] = [id, this.editTimes.get(k) || 0];
    return out;
  }

  // Applies every entry that is newer than what we have (ties broken by
  // block id so both sides converge on identical worlds). Returns the
  // number of blocks that changed.
  mergeEdits(blocks) {
    let applied = 0;
    for (const [k, entry] of Object.entries(blocks || {})) {
      const [id, t] = entry;
      const localT = this.editTimes.has(k) ? this.editTimes.get(k) : -1;
      const localId = this.edits.get(k);
      if (t < localT || (t === localT && (localId === id || localId > id))) continue;
      const [x, y, z] = k.split(',').map(Number);
      this.setBlock(x, y, z, id, t, true);
      applied++;
    }
    return applied;
  }

  isSolid(x, y, z) {
    if (y < 0) return true; // never fall out of the world
    if (y >= HEIGHT) return false;
    return blockIsSolid(this.getBlock(x, y, z));
  }

  // --- persistence (player edits only; terrain is deterministic) ----------

  static STORAGE_KEY = 'web-minecraft-edits-v2';
  static STORAGE_KEY_V1 = 'web-minecraft-edits-v1';

  loadEdits() {
    try {
      const raw = localStorage.getItem(World.STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        for (const [k, [id, t]] of Object.entries(obj)) {
          this.edits.set(k, id);
          this.editTimes.set(k, t);
        }
        return;
      }
      // migrate the old un-timestamped format
      const rawV1 = localStorage.getItem(World.STORAGE_KEY_V1);
      if (rawV1) {
        const obj = JSON.parse(rawV1);
        for (const [k, id] of Object.entries(obj)) {
          this.edits.set(k, id);
          this.editTimes.set(k, 0);
        }
      }
    } catch { /* corrupted save — start fresh */ }
  }

  saveEdits() {
    try {
      const out = {};
      for (const [k, id] of this.edits) out[k] = [id, this.editTimes.get(k) || 0];
      localStorage.setItem(World.STORAGE_KEY, JSON.stringify(out));
    } catch { /* storage full or unavailable — play on without saving */ }
  }

  static clearSave() {
    try {
      localStorage.removeItem(World.STORAGE_KEY);
      localStorage.removeItem(World.STORAGE_KEY_V1);
    } catch { /* ignore */ }
  }
}
