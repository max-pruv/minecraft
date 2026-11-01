// Une seule Terre. Manhattan est un quartier du générateur, ancré sur New York.
// Le journal de blocs, les codes de partie et les coordonnées restent ceux du monde.
import { World, CHUNK, HEIGHT, WATER_LEVEL } from "./world.js";
import { BLOCK, CITY_BLOCK } from "./blocks.js";
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
  BOITE_LIBERTE,
  ILE_LIBERTE,
  SOL_ILE,
  dansIleLiberte,
  statueLiberte,
  statueLiberteModele,
  escalierFortModele,
  BATIMENTS,
  MODELES_NY_ETAT,
  DATE_NY_MODELES,
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
// LIBERTY ISLAND EST UN OUVRAGE, PAS UN RELIEF (v496). Hors du rectangle,
// `terrainHeight` reste celui de la Terre (la baie, à 23) ; l'île et sa statue
// sont des blocs écrits par `generateChunk` — la règle des pistes (v280) et de
// la voie ferrée (v213) : l'invariant 1 tient par construction.
export function dansBoiteLiberte(x, z, marge = 0) {
  const p = versManhattan(x, z);
  return (
    p.x >= BOITE_LIBERTE.x0 - marge &&
    p.x < BOITE_LIBERTE.x1 + marge &&
    p.z >= BOITE_LIBERTE.z0 - marge &&
    p.z < BOITE_LIBERTE.z1 + marge
  );
}
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
      // NEW YORK D'APRÈS LES MODÈLES (v565) : un modèle ne se dessine que sur
      // un monument que l'enfant n'a pas touché (la règle des monuments de
      // Paris, v292) ; le rendu le demande ici.
      get empireTouche() {
        return w.empireTouche;
      },
      get liberteTouchee() {
        return w.liberteTouchee;
      },
      modeleLibertePret() {
        w.modeleLibertePret();
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
    this.cacheSol.clear();
    this.refreshProtection();
    this.deciderModelesNY();
  }
  // LA VILLE CÈDE À CE QUE L'ENFANT A BÂTI (v303, v565). Un bloc posé ou creusé
  // AVANT `DATE_NY_MODELES` dans la boîte de l'Empire (marge de trois blocs : un
  // bloc posé contre sa façade) ou sur Liberty Island garde l'ancien volume et
  // l'ancien dessin. Un bloc posé APRÈS ne change pas le volume — on ne
  // retire pas un mur sous les pieds d'un enfant — mais rend le dessin aux
  // cubes : un trou creusé dans un modèle doit se voir (`empireTouche`).
  deciderModelesNY() {
    const empire = BATIMENTS.find((b) => b.photo === "empire"),
      L = BOITE_LIBERTE;
    let ancienE = false,
      ancienL = false;
    this.empireTouche = false;
    this.liberteTouchee = false;
    for (const k of this.edits.keys()) {
      const [x, , z] = k.split(",").map(Number),
        p = versManhattan(x, z),
        avant = (this.editTimes.get(k) || 0) < DATE_NY_MODELES;
      if (empire && p.x >= empire.x0 - 3 && p.x < empire.x1 + 3 && p.z >= empire.z0 - 3 && p.z < empire.z1 + 3) {
        if (avant) ancienE = true;
        if (p.x >= empire.x0 && p.x < empire.x1 && p.z >= empire.z0 && p.z < empire.z1) this.empireTouche = true;
      }
      if (p.x >= L.x0 && p.x < L.x1 && p.z >= L.z0 && p.z < L.z1) {
        this.liberteTouchee = true;
        if (avant) ancienL = true;
      }
    }
    MODELES_NY_ETAT.empireAncien = ancienE;
    MODELES_NY_ETAT.liberteAncienne = ancienL;
  }
  // Le modèle de la statue est arrivé : les blocs de la statue se taisent (ils
  // restent ce qui arrête l'enfant), donc les morceaux de l'île se remaillent.
  modeleLibertePret() {
    if (this.modeleLiberte) return;
    this.modeleLiberte = true;
    this.remaillerLiberte();
  }
  remaillerLiberte() {
    const O = ORIGINE_MANHATTAN,
      L = BOITE_LIBERTE;
    for (let cz = Math.floor((O.z + L.z0) / CHUNK); cz <= Math.floor((O.z + L.z1) / CHUNK); cz++)
      for (let cx = Math.floor((O.x + L.x0) / CHUNK); cx <= Math.floor((O.x + L.x1) / CHUNK); cx++)
        if (this.chunks.has(World.key(cx, cz))) this.dirty.add(World.key(cx, cz));
  }
  // LES CUBES QUE LE MODÈLE COUVRE SE TAISENT (mesher.js) — seulement ceux que
  // `statueLiberteModele` écrit, jamais l'escalier du fort ni l'île, et
  // seulement tant que le modèle est là et que l'enfant n'a pas touché l'île.
  // Rend les index locaux du morceau, ou null (le cas de presque tout le monde).
  cubesTus(cx, cz) {
    if (!this.modeleLiberte || this.liberteTouchee || MODELES_NY_ETAT.liberteAncienne) return null;
    const ox = cx * CHUNK,
      oz = cz * CHUNK;
    if (!dansBoiteLiberte(ox, oz, CHUNK)) return null;
    this.cacheTus ||= new Map();
    const cle = World.key(cx, cz);
    if (this.cacheTus.has(cle)) return this.cacheTus.get(cle);
    const O = ORIGINE_MANHATTAN,
      tus = new Set();
    statueLiberteModele((dx, dy, dz) => {
      const x = Math.floor(O.x + ILE_LIBERTE.x + dx) - ox,
        z = Math.floor(O.z + ILE_LIBERTE.z + dz) - oz,
        y = SOL_ILE + 1 + dy;
      if (x >= 0 && z >= 0 && x < CHUNK && z < CHUNK && y < HEIGHT) tus.add(World.index(x, y, z));
    });
    const out = tus.size ? tus : null;
    this.cacheTus.set(cle, out);
    return out;
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
  // Ce que `generateChunk` fait de spécial ici — le plan de Manhattan, les
  // colonnes protégées des journaux importés — le worker ne le sait pas :
  // ces morceaux-là se maillent sur le fil principal, comme avant (v251).
  maillageLocal(cx, cz) {
    const ox = cx * CHUNK, oz = cz * CHUNK;
    if (dansManhattan(ox, oz, CHUNK)) return true;
    // le worker ne connaît pas l'île (un `World` nu) : elle se maille ici
    if (dansBoiteLiberte(ox, oz, CHUNK)) return true;
    for (let z = oz; z < oz + CHUNK; z++)
      for (let x = ox; x < ox + CHUNK; x++)
        if (this.protectedColumns.has(`${x},${z}`)) return true;
    return false;
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
    if (!dansManhattan(ox, oz, CHUNK) && !protege) {
      const data = super.generateChunk(cx, cz);
      if (dansBoiteLiberte(ox, oz, CHUNK)) this.batirLiberte(data, ox, oz);
      return data;
    }
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
    if (dansBoiteLiberte(ox, oz, CHUNK)) {
      this.batirLiberte(data, ox, oz);
      return data;
    }
    // les blocs de l'enfant de CE morceau, par l'index du journal (v403)
    const blocsEnfant = this.edits.duMorceau(Math.floor(ox / CHUNK), Math.floor(oz / CHUNK));
    if (blocsEnfant) for (const [k, i] of blocsEnfant) {
      const y = Number(k.split(",")[1]);
      if (y >= 0 && y < HEIGHT) data[i] = this.edits.get(k);
    }
    return data;
  }
  // L'île, puis la statue, puis — par-dessus tout — les blocs de l'enfant.
  // Sous la surface de l'eau on comble jusqu'au sol de l'île ; ce qui était
  // de la baie au-dessus de son terrain devient de la pierre, rien d'autre.
  batirLiberte(data, ox, oz) {
    const O = ORIGINE_MANHATTAN;
    for (let z = 0; z < CHUNK; z++)
      for (let x = 0; x < CHUNK; x++) {
        const lx = ox + x - O.x,
          lz = oz + z - O.z;
        if (!dansIleLiberte(lx + 0.5, lz + 0.5)) continue;
        const h = super.terrainHeight(ox + x, oz + z),
          bord = !dansIleLiberte(lx + 0.5, lz + 0.5, -1.5);
        for (let y = Math.max(1, h + 1); y < SOL_ILE; y++)
          data[World.index(x, y, z)] = BLOCK.STONE;
        // le quai de granit au bord, l'esplanade autour du fort, la pelouse
        data[World.index(x, SOL_ILE, z)] =
          bord ||
          Math.hypot(lx + 0.5 - ILE_LIBERTE.x, lz + 0.5 - ILE_LIBERTE.z) < 12.5
            ? CITY_BLOCK.GRANITE
            : BLOCK.GRASS;
      }
    const poser = (dx, dy, dz, id) => {
      const x = Math.floor(O.x + ILE_LIBERTE.x + dx) - ox,
        z = Math.floor(O.z + ILE_LIBERTE.z + dz) - oz,
        y = SOL_ILE + 1 + dy;
      if (x < 0 || z < 0 || x >= CHUNK || z >= CHUNK || y >= HEIGHT) return;
      data[World.index(x, y, z)] = id;
    };
    if (MODELES_NY_ETAT.liberteAncienne) statueLiberte(poser);
    else {
      statueLiberteModele(poser);
      escalierFortModele(poser);
    }
    const blocs = this.edits.duMorceau(Math.floor(ox / CHUNK), Math.floor(oz / CHUNK));
    if (blocs) for (const [k, i] of blocs) {
      const y = Number(k.split(",")[1]);
      if (y >= 0 && y < HEIGHT) data[i] = this.edits.get(k);
    }
  }
  setBlock(x, y, z, id, ts, remote = false) {
    const key = `${x},${y},${z}`;
    if (!this.provenance.has(key)) this.provenance.set(key, 0);
    super.setBlock(x, y, z, id, ts, remote);
    this.revision++;
    // un bloc sur Liberty Island rend la statue à ses cubes, aussitôt
    if (!this.liberteTouchee && dansBoiteLiberte(x, z)) {
      this.liberteTouchee = true;
      this.remaillerLiberte();
    }
    if (dansManhattan(x, z)) {
      const p = versManhattan(x, z),
        b = batimentA(p.x, p.z);
      if (b && b.photo === "empire") this.empireTouche = true;
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
