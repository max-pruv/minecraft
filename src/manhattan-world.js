// La même physique, le même journal d'opérations et les mêmes sauvegardes que
// la Terre. Seul le générateur est différent ; son espace de clés est séparé.
import { World, CHUNK, HEIGHT, WATER_LEVEL } from './world.js';
import { BLOCK } from './blocks.js';
import {
  MANHATTAN_ID,
  SOL,
  BORNES,
  LIEUX,
  terre,
  surface,
  solBloc,
  batimentA,
  sommet,
  emprise,
  contexteManhattan,
  couleurPlan,
} from './manhattan-plan.js';
export class ManhattanWorld extends World {
  constructor() {
    super();
    this.mapId = MANHATTAN_ID;
    this.ctx = contexteManhattan('local');
    this.visualEpoch = 0;
    this.revision = 0;
    this.buildingRevision = new Map();
    this.mapBounds = BORNES;
    this.mapPlaces = LIEUX;
  }
  contextKey(ctx) {
    return contexteManhattan(ctx);
  }
  switchContext(ctx) {
    super.switchContext(this.contextKey(ctx));
    this.revision++;
    this.visualEpoch++;
    this.buildingRevision.clear();
  }
  terrainHeight(x, z) {
    return surface(x, z) === 'water' ? WATER_LEVEL - 4 : SOL;
  }
  cityAt(x, z) {
    return terre(x, z)
      ? {
          key: 'manhattan',
          name: 'Manhattan',
          x: 0,
          z: -500,
          r: 3300,
          base: SOL,
        }
      : null;
  }
  treeAt() {
    return null;
  }
  foret(x, z) {
    return surface(x, z) === 'grass' ? 0.4 : 0;
  }
  mapColor(x, z) {
    return couleurPlan(x, z);
  }
  originalBlock(x, y, z) {
    const h = this.terrainHeight(x, z);
    if (y <= h)
      return y === h
        ? surface(x, z) === 'water'
          ? BLOCK.SAND
          : solBloc(x, z)
        : BLOCK.STONE;
    if (y <= WATER_LEVEL && surface(x, z) === 'water') return BLOCK.WATER;
    const b = batimentA(x, z);
    if (!b) return BLOCK.AIR;
    const bh = sommet(b, x, z),
      yy = y - SOL - 1;
    if (yy < 0 || yy > bh) return BLOCK.AIR;
    const bord =
      !emprise(b, x - 1, z) ||
      !emprise(b, x + 1, z) ||
      !emprise(b, x, z - 1) ||
      !emprise(b, x, z + 1) ||
      sommet(b, x - 1, z) < yy ||
      sommet(b, x + 1, z) < yy ||
      sommet(b, x, z - 1) < yy ||
      sommet(b, x, z + 1) < yy;
    // Vraies portes sur les deux côtés d'un îlot, et vestibule praticable.
    const porte =
      Math.abs(x - Math.floor((b.x0 + b.x1) / 2)) <= 1 &&
      (z === b.z0 || z === b.z1 - 1) &&
      yy < 3;
    if (porte) return BLOCK.AIR;
    if (bord || yy === bh || (yy % 3 === 0 && yy > 0))
      return b.mat === 'brick' || b.mat === 'brownstone'
        ? BLOCK.BRICK
        : BLOCK.STONEBRICK;
    return BLOCK.AIR;
  }
  generateChunk(cx, cz) {
    const data = new Uint16Array(CHUNK * CHUNK * HEIGHT);
    for (let z = 0; z < CHUNK; z++)
      for (let x = 0; x < CHUNK; x++) {
        const wx = cx * CHUNK + x,
          wz = cz * CHUNK + z,
          b = batimentA(wx, wz);
        const top = Math.min(HEIGHT - 1, b ? SOL + 1 + sommet(b, wx, wz) : SOL);
        for (let y = 0; y <= top; y++)
          data[World.index(x, y, z)] = this.originalBlock(wx, y, wz);
      }
    for (const [k, id] of this.edits) {
      const [x, y, z] = k.split(',').map(Number);
      if (
        Math.floor(x / CHUNK) === cx &&
        Math.floor(z / CHUNK) === cz &&
        y >= 0 &&
        y < HEIGHT
      )
        data[World.index(x - cx * CHUNK, y, z - cz * CHUNK)] = id;
    }
    return data;
  }
  setBlock(x, y, z, id, ts, remote = false) {
    super.setBlock(x, y, z, id, ts, remote);
    this.revision++;
    const b = batimentA(x, z);
    if (b)
      this.buildingRevision.set(
        b.id,
        (this.buildingRevision.get(b.id) || 0) + 1
      );
    this.onVisualEdit?.(x, y, z);
  }
  // Les façades originales sont dessinées par le renderer urbain. Les blocs
  // posés par le joueur et les intérieurs restent dans le mailleur du jeu.
  hasVisualEdits(cx, cz) {
    // Le terrain intact a déjà son maillage urbain. Le redessiner en voxels
    // coûtait des centaines d'appels et scintillait sous le sol lointain.
    // Les voisins d'une édition gardent leurs faces : indispensables quand
    // une excavation coupe la frontière entre deux morceaux.
    if (this.editIndexRevision !== this.revision) {
      this.editIndexRevision = this.revision;
      this.visualEditChunks = new Set();
      for (const key of this.edits.keys()) {
        const [x, , z] = key.split(',').map(Number);
        const bx = Math.floor(x / CHUNK),
          bz = Math.floor(z / CHUNK);
        for (let dx = -1; dx <= 1; dx++)
          for (let dz = -1; dz <= 1; dz++) {
            this.visualEditChunks.add(World.key(bx + dx, bz + dz));
          }
      }
    }
    return this.visualEditChunks.has(World.key(cx, cz));
  }
  visualChunk(cx, cz, source) {
    const data = source.slice();
    data.fill(0, (SOL + 1) * CHUNK * CHUNK);
    for (const [k, id] of this.edits) {
      const [x, y, z] = k.split(',').map(Number);
      if (
        Math.floor(x / CHUNK) === cx &&
        Math.floor(z / CHUNK) === cz &&
        y > SOL &&
        y < HEIGHT
      )
        data[World.index(x - cx * CHUNK, y, z - cz * CHUNK)] = id;
    }
    return data;
  }
  visualTop(cx, cz) {
    let h = SOL;
    for (const [k, id] of this.edits) {
      if (!id) continue;
      const [x, y, z] = k.split(',').map(Number);
      if (Math.floor(x / CHUNK) === cx && Math.floor(z / CHUNK) === cz)
        h = Math.max(h, y);
    }
    return h;
  }
  visualBlock(x, y, z, id) {
    if (this.edits.has(`${x},${y},${z}`)) return id;
    if (y > SOL && batimentA(x, z)) return BLOCK.AIR;
    return id;
  }
  clearSave() {
    super.clearSave();
    this.revision++;
    this.visualEpoch++;
    this.buildingRevision.clear();
  }
}
