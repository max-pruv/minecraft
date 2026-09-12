// Une seule Terre. Manhattan est un quartier du générateur, ancré sur New York.
// Le journal de blocs, les codes de partie et les coordonnées restent ceux du monde.
import { World, CHUNK, HEIGHT, WATER_LEVEL } from "./world.js";
import { BLOCK } from "./blocks.js";
import { positionDe } from "./mondes.js";
import {
  MANHATTAN_ID,
  SOL,
  BORNES,
  LIEUX,
  surface,
  solBloc,
  batimentA,
  sommet,
  emprise,
  couleurPlan,
} from "./manhattan-plan.js";

export const ORIGINE_MANHATTAN = positionDe("ny");
export const versTerre = (x, z) => ({
  x: x + ORIGINE_MANHATTAN.x,
  z: z + ORIGINE_MANHATTAN.z,
});
export const versManhattan = (x, z) => ({
  x: x - ORIGINE_MANHATTAN.x,
  z: z - ORIGINE_MANHATTAN.z,
});
export const lieuxManhattan = LIEUX.map((q) => ({
  ...q,
  ...versTerre(q.x, q.z),
}));
export function dansManhattan(x, z, marge = 0) {
  const p = versManhattan(x, z);
  return (
    p.x >= BORNES.x0 - marge &&
    p.x < BORNES.x1 + marge &&
    p.z >= BORNES.z0 - marge &&
    p.z < BORNES.z1 + marge
  );
}
const MARQUE = "@manhattan-v240:";
const valide = (k, e) =>
  /^-?\d+,-?\d+,-?\d+$/.test(k) &&
  Array.isArray(e) &&
  Number.isInteger(e[0]) &&
  Number.isFinite(e[1]);

// Provenance portée PAR le journal, donc copiée avec le profil et le réseau :
// [bloc, date, 0=natif / 1=ancienne Terre / 2=ancienne Manhattan]. Les marques
// d'import font partie de la même écriture atomique que les blocs importés.
export function reunirSauvegardes(entree) {
  const all = structuredClone(entree || {});
  let changes = 0;
  for (const [ctx, source] of Object.entries(all)) {
    if (
      !ctx.startsWith(MANHATTAN_ID + ":") ||
      !source ||
      typeof source !== "object"
    )
      continue;
    const cible = ctx.slice(MANHATTAN_ID.length + 1),
      dest = all[cible] || (all[cible] = {});
    const marque = Object.entries(dest).find(
      ([k, e]) => k.startsWith(MARQUE) && Array.isArray(e) && e.length === 4,
    );
    let dx = marque ? marque[1][2] : ORIGINE_MANHATTAN.x,
      dz = marque ? marque[1][3] : ORIGINE_MANHATTAN.z;
    if (!marque) {
      let libre = false;
      for (let n = 0; n < 256; n++, dx += 4096) {
        libre = !Object.entries(source).some(([k, e]) => {
          if (!valide(k, e)) return false;
          const [x, y, z] = k.split(",").map(Number);
          return dest[`${x + dx},${y},${z + dz}`] !== undefined;
        });
        if (libre) break;
      }
      // Aucun écrasement si les emplacements de secours sont tous occupés.
      if (!libre) continue;
    }
    for (const [k, e] of Object.entries(source)) {
      if (!valide(k, e)) continue;
      const fait = dest[MARQUE + k];
      if (fait && fait[1] >= e[1]) continue;
      const [x, y, z] = k.split(",").map(Number),
        key = `${x + dx},${y},${z + dz}`;
      const old = dest[key];
      if (!old || (old[2] === 2 && old[1] < e[1])) {
        dest[key] = [e[0], e[1], 2];
        changes++;
      }
      dest[MARQUE + k] = [e[0], e[1], dx, dz];
      changes++;
    }
  }
  return { all, changes };
}

export class TerreUrbaine extends World {
  constructor() {
    super();
    this.visualEpoch = 0;
    this.revision = 0;
    this.buildingRevision = new Map();
    this.protectedColumns = new Map();
    this.protectedBuildings = new Set();
    this.provenance = new Map();
    this.importMarks = {};
    this.mapPlacesExtra = lieuxManhattan;
    // L'adaptateur ne crée ni monde ni sauvegarde : il convertit les coordonnées
    // locales des maillages vers les coordonnées absolues du même World.
    const w = this;
    this.urbanView = {
      edits: {
        has(k) {
          const [x, y, z] = k.split(",").map(Number);
          return w.edits.has(
            `${x + ORIGINE_MANHATTAN.x},${y},${z + ORIGINE_MANHATTAN.z}`,
          );
        },
      },
      originalBlock(x, y, z) {
        return w.originalBlock(
          x + ORIGINE_MANHATTAN.x,
          y,
          z + ORIGINE_MANHATTAN.z,
        );
      },
      buildingAllowed(b) {
        return !w.protectedBuildings.has(b.id);
      },
      groundAllowed(x, z) {
        return !w.protectedColumns.has(
          `${Math.floor(x) + ORIGINE_MANHATTAN.x},${Math.floor(z) + ORIGINE_MANHATTAN.z}`,
        );
      },
      get ctx() {
        return w.ctx;
      },
      get visualEpoch() {
        return w.visualEpoch;
      },
      get buildingRevision() {
        return w.buildingRevision;
      },
      set onVisualEdit(fn) {
        w.onUrbanEdit = fn;
      },
    };
  }
  loadEdits() {
    const result = reunirSauvegardes(World.loadAll());
    if (result.changes) World.saveAll(result.all);
    this.provenance.clear();
    this.importMarks = {};
    for (const [k, e] of Object.entries(result.all[this.ctx] || {})) {
      if (k.startsWith(MARQUE)) {
        if (Array.isArray(e) && e.length === 4) this.importMarks[k] = e;
        continue;
      }
      if (!valide(k, e)) continue;
      this.edits.set(k, e[0]);
      this.editTimes.set(k, e[1]);
      this.provenance.set(k, e[2] === 0 ? 0 : e[2] === 2 ? 2 : 1);
    }
    this.refreshProtection();
  }
  exportEdits() {
    const out = { ...this.importMarks };
    for (const [k, id] of this.edits)
      out[k] = [id, this.editTimes.get(k) || 0, this.provenance.get(k) || 0];
    return out;
  }
  mergeEdits(blocks) {
    const normal = {};
    let metadata = 0,
      terrainModifie = false;
    for (const [k, e] of Object.entries(blocks || {})) {
      if (k.startsWith(MARQUE)) {
        if (
          Array.isArray(e) &&
          e.length === 4 &&
          e.every(Number.isFinite) &&
          (!this.importMarks[k] || e[1] > this.importMarks[k][1])
        ) {
          this.importMarks[k] = e;
          metadata++;
        }
        continue;
      }
      if (!valide(k, e)) continue;
      const t = this.editTimes.get(k) ?? -1,
        id = this.edits.get(k);
      if (e[1] < t || (e[1] === t && id > e[0])) continue;
      const provenance = e[2] === 0 ? 0 : e[2] === 2 ? 2 : 1;
      if (!this.provenance.has(k) || e[1] > t || (e[1] === t && e[0] > id)) {
        if (this.provenance.get(k) !== provenance) {
          metadata++;
          if (provenance || this.provenance.get(k)) terrainModifie = true;
        }
        this.provenance.set(k, provenance);
      }
      normal[k] = e;
    }
    const n = super.mergeEdits(normal);
    if (terrainModifie) {
      this.refreshProtection();
      this.chunks.clear();
      this.tops.clear();
      this.allDirty = true;
      this.revision++;
    }
    return n + metadata;
  }
  importerProfil(edits) {
    const n = this.mergeEdits(edits?.[this.ctx]);
    const all = { ...(edits || {}) };
    all[this.ctx] = { ...(all[this.ctx] || {}), ...this.exportEdits() };
    const result = reunirSauvegardes(all);
    return n + this.mergeEdits(result.all[this.ctx]);
  }
  importerAncienneManhattan(blocks) {
    return this.importerProfil({ [MANHATTAN_ID + ":" + this.ctx]: blocks });
  }
  refreshProtection() {
    this.protectedColumns = new Map();
    this.protectedBuildings = new Set();
    for (const [k, type] of this.provenance) {
      if (!type || !this.edits.has(k)) continue;
      const [x, , z] = k.split(",").map(Number);
      if (type === 1 && !dansManhattan(x, z)) continue;
      for (let dz = -2; dz <= 2; dz++)
        for (let dx = -2; dx <= 2; dx++) {
          const a = x + dx,
            c = z + dz,
            key = `${a},${c}`;
          // La Terre déjà bâtie a priorité en cas de voisinage entre les copies.
          if (this.protectedColumns.get(key) !== "terre")
            this.protectedColumns.set(key, type === 1 ? "terre" : "legacy");
          const p = versManhattan(a, c),
            b = batimentA(p.x, p.z);
          if (b) this.protectedBuildings.add(b.id);
        }
    }
    this.visualEpoch++;
  }
  switchContext(ctx) {
    super.switchContext(String(ctx).replace(/^manhattan-v1:/, ""));
    this.revision++;
    this.visualEpoch++;
    this.buildingRevision.clear();
  }
  terrainHeight(x, z) {
    const protection = this.protectedColumns?.get(
      `${Math.floor(x)},${Math.floor(z)}`,
    );
    if (protection === "legacy") return SOL;
    if (protection === "terre" || !dansManhattan(x, z))
      return super.terrainHeight(x, z);
    const p = versManhattan(x, z);
    return surface(p.x, p.z) === "water" ? WATER_LEVEL - 4 : SOL;
  }
  cityAt(x, z) {
    if (dansManhattan(x, z))
      return surface(x - ORIGINE_MANHATTAN.x, z - ORIGINE_MANHATTAN.z) ===
        "water"
        ? null
        : {
            key: "ny",
            name: "New York",
            ...ORIGINE_MANHATTAN,
            base: SOL,
            r: 1300,
          };
    return super.cityAt(x, z);
  }
  ruePietonne(x, z) {
    const p = versManhattan(x, z);
    return ["sidewalk", "path", "plaza"].includes(surface(p.x, p.z));
  }
  piedPieton(x, z) {
    if (!dansManhattan(x, z)) return undefined;
    const a = Math.floor(x),
      c = Math.floor(z);
    if (
      !this.isSolid(a, SOL + 1, c) &&
      !this.isSolid(a, SOL + 2, c) &&
      this.isSolid(a, SOL, c)
    )
      return SOL + 1;
    return null;
  }
  treeAt(x, z) {
    return dansManhattan(x, z) ? null : super.treeAt(x, z);
  }
  foret(x, z) {
    return dansManhattan(x, z) ? 0 : super.foret(x, z);
  }
  urbanColor(x, z) {
    if (!dansManhattan(x, z)) return null;
    const p = versManhattan(x, z);
    return couleurPlan(p.x, p.z);
  }
  originalBlock(x, y, z) {
    const p = versManhattan(x, z),
      s = surface(p.x, p.z),
      h = s === "water" ? WATER_LEVEL - 4 : SOL;
    if (y <= h)
      return y === h
        ? s === "water"
          ? BLOCK.SAND
          : solBloc(p.x, p.z)
        : BLOCK.STONE;
    if (s === "water" && y <= WATER_LEVEL) return BLOCK.WATER;
    const b = batimentA(p.x, p.z);
    if (!b || this.protectedBuildings.has(b.id)) return BLOCK.AIR;
    const yy = y - SOL - 1,
      bh = sommet(b, p.x, p.z);
    if (yy < 0 || yy > bh) return BLOCK.AIR;
    const bord = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(
      ([dx, dz]) =>
        !emprise(b, p.x + dx, p.z + dz) || sommet(b, p.x + dx, p.z + dz) < yy,
    );
    const porte =
      Math.abs(p.x - (b.x0 + b.x1) / 2) < 1.1 &&
      (Math.abs(p.z - b.z0) < 1 || Math.abs(p.z - (b.z1 - 1)) < 1) &&
      yy < 3;
    if (porte) return BLOCK.AIR;
    return bord || yy === Math.floor(bh) || (yy > 0 && yy % 3 === 0)
      ? b.mat === "brick" || b.mat === "brownstone"
        ? BLOCK.BRICK
        : BLOCK.STONEBRICK
      : BLOCK.AIR;
  }
  generateChunk(cx, cz) {
    const ox = cx * CHUNK,
      oz = cz * CHUNK;
    const entier =
      dansManhattan(ox, oz) && dansManhattan(ox + CHUNK - 1, oz + CHUNK - 1);
    let protege = false;
    for (let z = oz; z < oz + CHUNK && !protege; z++)
      for (let x = ox; x < ox + CHUNK; x++)
        if (this.protectedColumns.has(`${x},${z}`)) {
          protege = true;
          break;
        }
    if (!dansManhattan(ox, oz, CHUNK) && !protege)
      return super.generateChunk(cx, cz);
    const data =
      entier && !protege
        ? new Uint16Array(CHUNK * CHUNK * HEIGHT)
        : super.generateChunk(cx, cz);
    for (let z = 0; z < CHUNK; z++)
      for (let x = 0; x < CHUNK; x++) {
        const wx = ox + x,
          wz = oz + z,
          type = this.protectedColumns.get(`${wx},${wz}`);
        if (type === "terre" || (!dansManhattan(wx, wz) && type !== "legacy"))
          continue;
        for (let y = 0; y < HEIGHT; y++)
          data[World.index(x, y, z)] =
            type === "legacy"
              ? y <= SOL
                ? BLOCK.STONE
                : BLOCK.AIR
              : this.originalBlock(wx, y, wz);
      }
    for (const [k, id] of this.edits) {
      const [x, y, z] = k.split(",").map(Number);
      if (
        x >= ox &&
        x < ox + CHUNK &&
        z >= oz &&
        z < oz + CHUNK &&
        y >= 0 &&
        y < HEIGHT
      )
        data[World.index(x - ox, y, z - oz)] = id;
    }
    return data;
  }
  setBlock(x, y, z, id, ts, remote = false) {
    const key = `${x},${y},${z}`;
    if (!this.provenance.has(key)) this.provenance.set(key, 0);
    super.setBlock(x, y, z, id, ts, remote);
    this.revision++;
    if (dansManhattan(x, z)) {
      const p = versManhattan(x, z),
        b = batimentA(p.x, p.z);
      if (b)
        this.buildingRevision.set(
          b.id,
          (this.buildingRevision.get(b.id) || 0) + 1,
        );
      this.onUrbanEdit?.(p.x, y, p.z);
    }
  }
  hasVisualEdits(cx, cz) {
    const ox = cx * CHUNK,
      oz = cz * CHUNK;
    if (
      !dansManhattan(ox, oz) ||
      !dansManhattan(ox + CHUNK - 1, oz + CHUNK - 1)
    )
      return true;
    if (this.editIndexRevision !== this.revision) {
      this.editIndexRevision = this.revision;
      this.visualEditChunks = new Set();
      for (const k of [
        ...this.edits.keys(),
        ...this.protectedColumns.keys(),
      ].map((k) => k.split(","))) {
        const x = Number(k[0]),
          z = Number(k.at(-1)),
          bx = Math.floor(x / CHUNK),
          bz = Math.floor(z / CHUNK);
        for (let dx = -1; dx <= 1; dx++)
          for (let dz = -1; dz <= 1; dz++)
            this.visualEditChunks.add(World.key(bx + dx, bz + dz));
      }
    }
    return this.visualEditChunks.has(World.key(cx, cz));
  }
  visualBlock(x, y, z, id) {
    if (
      !dansManhattan(x, z) ||
      this.protectedColumns.has(`${x},${z}`) ||
      this.edits.has(`${x},${y},${z}`)
    )
      return id;
    return y > SOL ? BLOCK.AIR : id;
  }
  visualChunk(cx, cz, source) {
    const data = source.slice(),
      ox = cx * CHUNK,
      oz = cz * CHUNK;
    for (let z = 0; z < CHUNK; z++)
      for (let x = 0; x < CHUNK; x++) {
        const wx = ox + x,
          wz = oz + z;
        if (!dansManhattan(wx, wz) || this.protectedColumns.has(`${wx},${wz}`))
          continue;
        for (let y = SOL + 1; y < HEIGHT; y++)
          data[World.index(x, y, z)] = this.edits.get(`${wx},${y},${wz}`) || 0;
      }
    return data;
  }
  visualTop(cx, cz) {
    return this.chunkTop(cx, cz);
  }
  clearSave() {
    super.clearSave();
    this.provenance.clear();
    this.saveEdits();
    this.revision++;
    this.visualEpoch++;
    this.buildingRevision.clear();
    this.refreshProtection();
  }
}
