import * as THREE from "three";
import { WATER_LEVEL } from "./world.js";
import { decor } from "./couches.js";
import { ORIGINE_MANHATTAN, dansManhattan } from "./manhattan-world.js";
import {
  SOL,
  BORNES,
  AVENUE,
  RUE,
  PARC,
  ALEA,
  BATIMENTS,
  QUARTIERS,
  surface,
  broadway,
  batimentA,
  emprise,
  sommet,
  niveaux,
} from "./manhattan-plan.js";
import {
  materiauxManhattan,
  enseignesManhattan,
} from "./manhattan-materiaux.js";

const NIVEAU = SOL + 1;

function feuillage() {
  const p = [],
    n = [],
    uv = [],
    indices = [];
  for (let i = 0; i < 140; i++) {
    const a = ALEA(i, 81) * Math.PI * 2,
      v = ALEA(i, 95) * 2 - 1,
      r = Math.cbrt(ALEA(i, 19)) * 0.52;
    const x = Math.cos(a) * Math.sqrt(1 - v * v) * r,
      y = v * r,
      z = Math.sin(a) * Math.sqrt(1 - v * v) * r;
    const s = 0.045 + ALEA(i, 47) * 0.055,
      tilt = ALEA(i, 18) * Math.PI,
      co = Math.cos(tilt),
      si = Math.sin(tilt),
      k = p.length / 3;
    for (const [u, w] of [
      [-1, 0],
      [0, -1],
      [1, 0],
      [0, 1],
    ]) {
      p.push(x + u * s, y + w * s * co, z + w * s * si);
      n.push(0, -si, co);
      uv.push((u + 1) / 2, (w + 1) / 2);
    }
    indices.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  return g;
}

// Une seule géométrie par primitive pour toute la carte. Les groupes retirés
// libèrent leurs tampons d'instances ; les primitives partagées restent vivantes.
class Lot {
  constructor(owner) {
    this.o = owner;
    this.lists = new Map();
    this.signs = [];
    this.group = new THREE.Group();
  }
  put(mat, x, y, z, w, h, d, shape = "box", angle = 0, tint = 1) {
    if (w <= 0 || h <= 0 || d <= 0) return;
    const key = mat + ":" + shape;
    if (!this.lists.has(key)) this.lists.set(key, []);
    this.lists.get(key).push([x, y, z, w, h, d, angle, tint]);
  }
  sign(index, x, y, z, w, h, angle = 0) {
    this.signs.push({ index, x, y, z, w, h, angle });
  }
  finish() {
    const obj = new THREE.Object3D(),
      color = new THREE.Color();
    for (const [key, items] of this.lists) {
      const [mat, shape] = key.split(":");
      const mesh = new THREE.InstancedMesh(
        this.o.geos[shape],
        this.o.mats[mat],
        items.length,
      );
      items.forEach((p, i) => {
        obj.position.set(p[0], p[1], p[2]);
        obj.scale.set(p[3], p[4], p[5]);
        obj.rotation.set(0, p[6], 0);
        obj.updateMatrix();
        mesh.setMatrixAt(i, obj.matrix);
        color.setRGB(p[7], p[7], p[7]);
        mesh.setColorAt(i, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = ![
        "glass",
        "glassDark",
        "glassLit",
        "glow",
        "grass",
        "water",
        "foliage",
      ].includes(mat);
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    }
    if (this.signs.length) {
      const pos = [],
        uv = [],
        idx = [];
      for (const s of this.signs) {
        const k = pos.length / 3,
          co = Math.cos(s.angle),
          si = Math.sin(s.angle);
        for (const [x, y] of [
          [-0.5, -0.5],
          [0.5, -0.5],
          [0.5, 0.5],
          [-0.5, 0.5],
        ])
          pos.push(s.x + x * s.w * co, s.y + y * s.h, s.z - x * s.w * si);
        const u = (s.index % 4) / 4,
          v = 1 - Math.floor(s.index / 4) / 6;
        uv.push(u, v - 1 / 6, u + 0.25, v - 1 / 6, u + 0.25, v, u, v);
        idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, this.o.signage.material);
      m.userData.ownedGeometry = true;
      this.group.add(m);
    }
    this.group.userData.instances = [...this.lists.values()].reduce(
      (n, a) => n + a.length,
      0,
    );
    this.lists.clear();
    this.signs = [];
    return this.group;
  }
}
function disposeGroup(group) {
  group.removeFromParent();
  group.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
    if (o.userData.ownedGeometry) o.geometry.dispose();
  });
}

export class ManhattanRenderer {
  constructor({
    scene,
    renderer,
    world,
    camera,
    player,
    sunLight,
    hemiLight,
    touch,
    renderRadius = 16,
  }) {
    this.realPlayer = player;
    this.earthWorld = world;
    this.earthLook = {
      far: camera.far,
      fogNear: scene.fog.near,
      fogFar: scene.fog.far,
      tone: renderer.toneMapping,
      exposure: renderer.toneMappingExposure,
      sun: sunLight.color.clone(),
      hemi: hemiLight.color.clone(),
      ground: hemiLight.groundColor.clone(),
      sunPos: sunLight.position.clone(),
    };
    world = world.urbanView;
    player = { pos: new THREE.Vector3(), yaw: 0 };
    Object.assign(this, {
      scene,
      renderer,
      world,
      camera,
      player,
      sunLight,
      hemiLight,
    });
    const query = new URLSearchParams(location.search);
    this.quality = query.get("qualite") || (touch ? "tablette" : "haute");
    this.budget =
      this.quality === "tablette"
        ? { near: 52, far: 780, sectors: 12, dpr: 1.25, shadow: 1024 }
        : { near: 78, far: 1400, sectors: 20, dpr: 1.75, shadow: 2048 };
    this.budget.near = Math.min(this.budget.near, renderRadius * 16);
    this.budget.far = Math.min(this.budget.far, renderRadius * 16 * 7);
    this.budget.sectors = Math.min(
      this.budget.sectors,
      Math.max(4, Math.ceil(renderRadius / 2) ** 2),
    );

    this.resources = materiauxManhattan(renderer);
    this.mats = this.resources.mats;
    this.signage = enseignesManhattan();
    this.geos = {
      leaves: feuillage(),
      box: new THREE.BoxGeometry(1, 1, 1),
      cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
      sphere: new THREE.IcosahedronGeometry(0.5, 1),
      cone: new THREE.ConeGeometry(0.5, 1, 12),
    };
    this.root = new THREE.Group();
    this.root.name = "Manhattan — architecture de la Terre";
    this.root.position.set(ORIGINE_MANHATTAN.x, 0, ORIGINE_MANHATTAN.z);
    this.root.visible = false;
    scene.add(this.root);
    this.buildings = new Map();
    this.ground = new Map();
    this.lastMaintenance = -Infinity;
    this.lastRevision = -1;
    this.lastAddress = -1;
    this.lodIndex = 0;
    this.far = new Map();
    this.nearSet = new Set();
    this.dirtyGround = new Set();
    world.onVisualEdit = (x, y, z) => {
      if (y > SOL) return;
      this.dirtyGround.add(`${Math.floor(x / 64)},${Math.floor(z / 64)}`);
    };
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(this.budget.shadow, this.budget.shadow);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 380;
    Object.assign(sunLight.shadow.camera, {
      left: -95,
      right: 95,
      top: 95,
      bottom: -95,
    });
    sunLight.shadow.bias = -0.00015;
    sunLight.shadow.normalBias = 0.045;
    scene.add(sunLight.target);
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(BORNES.x1 - BORNES.x0, BORNES.z1 - BORNES.z0),
      this.mats.water,
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(
      (BORNES.x0 + BORNES.x1) / 2,
      WATER_LEVEL + 0.86,
      (BORNES.z0 + BORNES.z1) / 2,
    );
    ocean.userData.ownedGeometry = true;
    this.root.add(decor(ocean));
    this.skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          zenith: { value: new THREE.Color() },
          horizon: { value: new THREE.Color() },
        },
        vertexShader:
          "varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec3 direction;uniform vec3 zenith;uniform vec3 horizon;void main(){float h=max(normalize(direction).y,0.);gl_FragColor=vec4(mix(horizon,zenith,pow(h,.65)),1.);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n}",
      }),
    );
    this.skyDome.scale.setScalar(this.budget.far + 40);
    this.skyDome.renderOrder = -10;
    this.root.add(decor(this.skyDome));
    this.mats.foliage.side = THREE.DoubleSide;
    this.lamps = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffc989, 0, 19, 2);
      scene.add(l);
      this.lamps.push(l);
    }
    this.frames = [];
    this.lastFrame = 0;
    this.stats = { buildings: BATIMENTS.length, quality: this.quality };
    this.makeFar();
  }
  makeFar() {
    // LOD de silhouette par secteur : peu d'appels et frustum culling natif.
    // Le secteur proche retire exactement ses bâtiments, évitant tout doublon.
    this.farGroups = new Map();
    for (const b of BATIMENTS) {
      if (!this.world.buildingAllowed(b)) continue;
      const key = `${Math.floor(b.x0 / 256)},${Math.floor(b.z0 / 256)}`;
      if (!this.farGroups.has(key)) this.farGroups.set(key, []);
      this.farGroups.get(key).push(b);
    }
    for (
      let x = Math.floor(BORNES.x0 / 256);
      x <= Math.floor(BORNES.x1 / 256);
      x++
    )
      for (
        let z = Math.floor(BORNES.z0 / 256);
        z <= Math.floor(BORNES.z1 / 256);
        z++
      ) {
        const key = `${x},${z}`;
        if (!this.farGroups.has(key)) this.farGroups.set(key, []);
      }
    this.farQueue = [...this.farGroups.keys()].sort((a, b) => {
      const d = (k) => {
        const [x, z] = k.split(",").map(Number);
        return Math.hypot(
          x * 256 - this.player.pos.x,
          z * 256 - this.player.pos.z,
        );
      };
      return d(a) - d(b);
    });
  }
  rebuildFar(key) {
    const prev = this.far.get(key);
    if (prev) disposeGroup(prev);
    const lot = new Lot(this);
    const [sx, sz] = key.split(",").map(Number);
    // Sol lointain continu, retiré sous chaque secteur proche. La découpe
    // empêche une dalle de secours de refermer les trous construits/creusés.
    for (let z = sz * 256; z < (sz + 1) * 256; z += 4) {
      let begin = sx * 256,
        last = null;
      for (let x = sx * 256; x <= (sx + 1) * 256; x += 4) {
        let s =
          x < (sx + 1) * 256 &&
          x >= BORNES.x0 &&
          x < BORNES.x1 &&
          z >= BORNES.z0 &&
          z < BORNES.z1
            ? surface(x + 2, z + 2)
            : null;
        if (
          s === "water" ||
          !this.world.groundAllowed(x, z) ||
          this.ground.has(`${Math.floor(x / 64)},${Math.floor(z / 64)}`)
        )
          s = null;
        if (s !== last) {
          if (last)
            lot.put(
              {
                road: "asphalt",
                sidewalk: "concrete",
                lot: "concrete",
                grass: "grass",
                path: "path",
                plaza: "path",
              }[last],
              (begin + x) / 2,
              NIVEAU + 0.006,
              z + 2,
              x - begin,
              0.015,
              4,
            );
          begin = x;
          last = s;
        }
      }
    }
    // Même implantation que le parc proche, avec une couronne de feuilles
    // simplifiée. Le changement de détail ne déplace pas les arbres.
    for (let x = sx * 256 + 6; x < (sx + 1) * 256; x += 16)
      for (let z = sz * 256 + 6; z < (sz + 1) * 256; z += 16) {
        if (
          surface(x, z) !== "grass" ||
          ALEA(x, z) <= 0.36 ||
          this.ground.has(`${Math.floor(x / 64)},${Math.floor(z / 64)}`)
        )
          continue;
        const h = 6 + ALEA(x + 1, z) * 4;
        lot.put(
          "wood",
          x,
          NIVEAU + h * 0.36,
          z,
          0.32,
          h * 0.72,
          0.32,
          "cylinder",
        );
        lot.put(
          "foliage",
          x,
          NIVEAU + h * 0.72,
          z,
          7,
          6,
          7,
          "leaves",
          ALEA(x, z) * 6,
          0.8 + ALEA(x, z) * 0.3,
        );
      }
    for (const b of this.farGroups.get(key) || []) {
      if (!this.world.buildingAllowed(b)) continue;
      if (this.nearSet.has(b.id)) continue;
      const x = (b.x0 + b.x1) / 2,
        z = (b.z0 + b.z1) / 2,
        w = b.x1 - b.x0,
        d = b.z1 - b.z0;
      const levels = niveaux(b);
      let y = 0;
      for (const [k, kd, h] of levels) {
        lot.put(
          {
            brick: "farBrick",
            brownstone: "farBrownstone",
            limestone: "farLimestone",
            glass: "farGlass",
            red: "red",
          }[b.mat],
          x,
          NIVEAU + (h + y) / 2,
          z,
          w * k,
          h - y,
          d * kd,
        );
        y = h;
      }
      lot.put(
        "roof",
        x,
        NIVEAU + b.h + 0.15,
        z,
        w * levels.at(-1)[0],
        0.3,
        d * levels.at(-1)[1],
      );
      this.couronnement(lot, b);
    }
    const g = lot.finish();
    g.userData.key = key;
    this.root.add(decor(g));
    this.far.set(key, g);
  }
  // Tester chaque bloc d'une baie permet de creuser un trou qui se VOIT, sans
  // rendre fantôme le bâtiment entier ni toucher au journal de sauvegarde.
  present(x, y, z) {
    const a = Math.floor(x),
      b = Math.floor(y),
      c = Math.floor(z);
    return (
      !this.world.edits.has(`${a},${b},${c}`) &&
      this.world.originalBlock(a, b, c) !== 0
    );
  }
  facade(lot, b, x, z, nx, nz, h, premier = 0) {
    const tangent = nx ? z : x,
      angle = nx ? Math.PI / 2 : 0;
    for (let yy = premier; yy <= h; yy++) {
      const y = NIVEAU + yy,
        wx = x + 0.5,
        wz = z + 0.5;
      if (!this.present(x, y, z)) continue;
      const ex = wx + nx * 0.49,
        ez = wz + nz * 0.49;
      // Les travées de l'Empire forment des rubans verticaux séparés par de
      // fins piliers de pierre ; des bandeaux pleins à chaque étage écrasent
      // sa silhouette Art déco, même lorsque ses volumes sont justes.
      const empire = b.style === "empire";
      const window =
        Math.round(tangent - (nx ? b.z0 : b.x0)) % (empire ? 2 : 3) === 1 &&
        yy > 0 &&
        yy < h - 1 &&
        (empire || yy % 3 !== 0);
      const store = yy < 3 && (tangent - (nx ? b.z0 : b.x0)) % 7 < 5;
      const curtain = b.mat === "glass" && yy > 2 && yy < h;
      if (window || store || curtain) {
        const lit =
          yy % 3 !== 0 &&
          ALEA(Math.floor(tangent / 3) + b.seed, Math.floor(yy / 3)) > 0.58;
        const mat = lit
          ? "glassLit"
          : b.mat === "glass"
            ? "glass"
            : "glassDark";
        lot.put(
          mat,
          ex - nx * 0.27,
          y + 0.5,
          ez - nz * 0.27,
          nx ? 0.08 : 0.96,
          0.94,
          nz ? 0.08 : 0.96,
        );
        // Les embrasures ont 27 cm de profondeur, les meneaux une vraie épaisseur.
        lot.put(
          b.mat === "glass" ? "metal" : "trim",
          ex,
          y + 0.045,
          ez,
          nx ? 0.55 : 1,
          0.09,
          nz ? 0.55 : 1,
        );
        if (yy % 3 === 2 || store)
          lot.put(
            "metal",
            ex - nx * 0.12,
            y + 0.5,
            ez - nz * 0.12,
            nx ? 0.14 : 0.035,
            1,
            nz ? 0.14 : 0.035,
          );
        lot.put(
          b.mat === "glass" ? "metal" : "trim",
          ex,
          y + 0.5,
          ez,
          nx ? 0.5 : 0.065,
          1,
          nz ? 0.5 : 0.065,
        );
      } else {
        lot.put(
          b.mat,
          wx,
          y + 0.5,
          wz,
          nx ? 0.92 : 1,
          1,
          nz ? 0.92 : 1,
          "box",
          0,
          empire ? 1 : 0.89 + ALEA(b.seed, Math.floor(yy / 3)) * 0.16,
        );
      }
      if (
        yy === 3 ||
        yy === h ||
        (b.mat !== "glass" && b.style !== "empire" && yy % 12 === 0)
      ) {
        lot.put(
          "trim",
          ex + nx * 0.1,
          y + 0.92,
          ez + nz * 0.1,
          nx ? 0.46 : 1.04,
          0.19,
          nz ? 0.46 : 1.04,
        );
      }
    }
  }
  *buildBuilding(b) {
    const lot = new Lot(this),
      x = (b.x0 + b.x1) / 2,
      z = (b.z0 + b.z1) / 2,
      w = b.x1 - b.x0,
      d = b.z1 - b.z0;
    if (b.style === "steps") {
      for (let i = 0; i < 18; i++) {
        const depth = d / 18;
        lot.put(
          "red",
          x,
          NIVEAU + (i + 1) / 12,
          b.z1 - (i + 0.5) * depth,
          w,
          (i + 1) / 6,
          depth,
        );
        lot.put(
          "metal",
          x,
          NIVEAU + (i + 1) / 6 + 0.02,
          b.z1 - i * depth,
          w,
          0.04,
          0.04,
        );
      }
      for (const side of [-1, 1]) {
        for (let i = 0; i < 8; i++)
          lot.put(
            "steel",
            x + side * (w / 2 + 0.15),
            NIVEAU + i * 0.42 + 0.5,
            b.z1 - (i * d) / 8,
            0.055,
            1,
            0.055,
          );
      }
      lot.sign(23, x, NIVEAU + 1.4, b.z0 - 0.2, w, 1.8, Math.PI);
      return lot.finish();
    }
    // Les volumes à retraits et le Flatiron se maillent depuis la même emprise
    // que les collisions : aucune façade ne coupe une avenue par approximation.
    for (let zz = b.z0; zz < b.z1; zz++) {
      for (let xx = b.x0; xx < b.x1; xx++) {
        const h = sommet(b, xx, zz);
        if (!h) continue;
        for (const [nx, nz] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const adjacent = sommet(b, xx + nx, zz + nz);
          if (adjacent === 0) this.facade(lot, b, xx, zz, nx, nz, h);
          else if (adjacent < h)
            this.facade(lot, b, xx, zz, nx, nz, h, adjacent + 1);
        }
        // Dalle de toit suivant chaque retrait ; on respecte les blocs retirés.
        if (this.present(xx, NIVEAU + h, zz))
          lot.put(
            b.style === "empire" ? "limestone" : "roof",
            xx + 0.5,
            NIVEAU + h + 0.94,
            zz + 0.5,
            1,
            0.12,
            1,
          );
      }
      yield;
    }
    // Planchers praticables visibles depuis les portes ; leur grille correspond
    // à la physique. Pas de grande dalle par-dessus un trou creusé.
    for (let yy = 3; yy < b.h; yy += 3) {
      for (let zz = b.z0 + 1; zz < b.z1 - 1; zz++) {
        let debut = null;
        for (let xx = b.x0 + 1; xx <= b.x1 - 1; xx++) {
          const ok =
            xx < b.x1 - 1 &&
            emprise(b, xx, zz) &&
            sommet(b, xx, zz) > yy &&
            this.present(xx, NIVEAU + yy, zz);
          if (ok && debut === null) debut = xx;
          if (!ok && debut !== null) {
            lot.put(
              "concrete",
              (debut + xx) / 2,
              NIVEAU + yy + 0.5,
              zz + 0.5,
              xx - debut,
              1,
              1,
            );
            debut = null;
          }
        }
      }
      yield;
    }
    yield;
    // Devantures, seuils et auvents ; les portes restent libres sur 3 mètres.
    if (b.style === "masonry" || b.style === "office") {
      for (let sx = b.x0 + 5; sx < b.x1 - 3; sx += 8) {
        lot.sign(
          4 + ((b.seed + Math.floor(sx)) % 4),
          sx,
          NIVEAU + 3.6,
          b.z1 + 0.07,
          7,
          0.72,
        );
        lot.put("metal", sx, NIVEAU + 3.12, b.z1 + 0.65, 7, 0.12, 1.5);
      }
      lot.sign(12, b.x0 + 0.05, NIVEAU + 3.6, b.z0 + 4, 1.8, 0.55, Math.PI / 2);
    }
    // Escaliers de secours des immeubles en maçonnerie : paliers ajourés et
    // marches visibles, ancrés sur une colonne encore présente.
    if (b.mat === "brick" || b.mat === "brownstone")
      for (let yy = 6; yy < b.h - 2; yy += 6) {
        const ex = b.x0 + 5,
          ez = b.z0 - 0.9;
        if (!this.present(ex, NIVEAU + yy, b.z0)) continue;
        lot.put("metal", ex, NIVEAU + yy, ez, 3, 0.09, 1.7);
        for (let k = 0; k < 7; k++) {
          lot.put(
            "metal",
            ex - 1.4 + k * 0.45,
            NIVEAU + yy + 0.45,
            ez - 0.8,
            0.04,
            0.9,
            0.04,
          );
        }
        lot.put("metal", ex, NIVEAU + yy + 0.9, ez - 0.8, 3, 0.05, 0.05);
        for (let k = 0; k < 12; k++)
          lot.put(
            "metal",
            ex - 1.3 + k * 0.23,
            NIVEAU + yy - k * 0.5,
            ez,
            0.6,
            0.065,
            0.8,
          );
      }
    const top = NIVEAU + b.h + 1;
    // Centrales de ventilation avec grilles et réservoirs sur leurs supports.
    for (
      let k = 0;
      k < (["office", "masonry"].includes(b.style) ? 1 : 0);
      k++
    ) {
      const px = x + (k - 0.5) * 5;
      lot.put("metal", px, top + 0.65, z, 2.4, 1.3, 3.3);
      for (let j = 0; j < 7; j++)
        lot.put("roof", px, top + 0.5 + j * 0.11, z + 1.66, 2.2, 0.035, 0.04);
      lot.put("roof", px, top + 1.34, z, 1.2, 0.08, 1.2, "cylinder");
    }
    if (b.mat !== "glass" && b.style === "masonry" && b.seed % 3 === 0) {
      const tx = x + Math.min(1, w / 5),
        tz = z - Math.min(1, d / 5);
      for (const dx of [-1, 1])
        for (const dz of [-1, 1])
          lot.put("metal", tx + dx, top + 0.9, tz + dz, 0.1, 1.8, 0.1);
      lot.put("wood", tx, top + 3, tz, 3, 3, 3, "cylinder");
      lot.put("metal", tx, top + 4.8, tz, 3.4, 0.7, 3.4, "cone");
      for (const yy of [1.8, 3, 4.2])
        lot.put("metal", tx, top + yy, tz, 3.05, 0.09, 3.05, "cylinder");
    }
    this.couronnement(lot, b);
    if (b.style === "terminal") {
      lot.sign(9, x, NIVEAU + 12, b.z1 + 0.3, w * 0.7, 2);
      for (let sx = b.x0 + 5; sx < b.x1; sx += 8)
        lot.put("trim", sx, NIVEAU + 7, b.z1 + 0.7, 1.1, 14, 1.1, "cylinder");
      lot.put("metal", x, top + 0.7, z, w * 0.86, 1.4, d * 0.85);
      lot.put("trim", x, NIVEAU + 17, b.z1 + 1, w * 0.9, 1.2, 3);
      lot.put(
        "yellow",
        x,
        NIVEAU + 18.8,
        b.z1 + 1,
        2.4,
        2.4,
        0.3,
        "cylinder",
        Math.PI / 2,
      );
    }
    if (
      z > -125 &&
      z < 28 &&
      b.style !== "times" &&
      ((b.x1 < -95 && b.x1 > -120) || (b.x0 > -64 && b.x0 < -45))
    ) {
      const face = b.x1 < -95 ? b.x1 + 0.15 : b.x0 - 0.15,
        angle = b.x1 < -95 ? Math.PI / 2 : -Math.PI / 2;
      for (let i = 0; i < 2; i++) {
        const yy = NIVEAU + 8 + i * 11;
        lot.put("metal", face, yy, z, 0.3, 10.4, d + 0.3);
        lot.sign(
          16 + ((b.seed + i) % 8),
          face + (b.x1 < -95 ? 0.18 : -0.18),
          yy,
          z,
          d,
          10,
          angle,
        );
      }
    }
    if (b.style === "church")
      lot.put("brownstone", x, top + 8, b.z0 + 5, 9, 16, 9, "cone");
    if (Math.abs(x - broadway(z)) < 18 && z > -120 && z < 32) {
      lot.sign(
        14 + (b.seed % 2),
        x,
        NIVEAU + 12,
        b.z1 + 0.3,
        Math.min(w - 2, 18),
        12,
      );
      lot.put("metal", x, NIVEAU + 12, b.z1 + 0.1, Math.min(w, 19), 12.7, 0.3);
    }
    const g = lot.finish();
    g.name = b.name || `Immeuble ${b.id}`;
    g.userData.buildingId = b.id;
    g.userData.revision = this.world.buildingRevision.get(b.id) || 0;
    return g;
  }
  couronnement(lot, b) {
    const x = (b.x0 + b.x1) / 2,
      z = (b.z0 + b.z1) / 2,
      w = b.x1 - b.x0,
      d = b.z1 - b.z0;
    if (b.style === "empire") {
      // Terrasse du 86e, cage d'observation puis mât d'amarrage et antenne.
      // Une seule large terrasse d'observation. Les étages supérieurs
      // s'affinent sans empiler des plateaux qui masqueraient la silhouette.
      for (const [k, kd, y] of [[0.54, 0.5, 89]]) {
        lot.put("trim", x, NIVEAU + y, z, w * k, 0.12, d * kd);
        for (const side of [-1, 1]) {
          lot.put(
            "metal",
            x + (side * w * k) / 2,
            NIVEAU + y + 1.05,
            z,
            0.045,
            0.05,
            d * kd,
          );
          for (let j = (-d * kd) / 2; j <= (d * kd) / 2; j += 1.3)
            lot.put(
              "metal",
              x + (side * w * k) / 2,
              NIVEAU + y + 0.55,
              z + j,
              0.04,
              1.1,
              0.04,
            );
          lot.put(
            "metal",
            x,
            NIVEAU + y + 1.05,
            z + (side * d * kd) / 2,
            w * k,
            0.05,
            0.045,
          );
          for (let j = (-w * k) / 2; j <= (w * k) / 2; j += 1.3)
            lot.put(
              "metal",
              x + j,
              NIVEAU + y + 0.55,
              z + (side * d * kd) / 2,
              0.04,
              1.1,
              0.04,
            );
        }
      }
      for (let a = 0; a < 8; a++) {
        const angle = (a * Math.PI) / 4;
        lot.put(
          "trim",
          x + Math.cos(angle) * 1.4,
          NIVEAU + 104,
          z + Math.sin(angle) * 1.4,
          0.18,
          8,
          0.18,
        );
      }
      lot.put("steel", x, NIVEAU + 110, z, 1.35, 7, 1.35, "cylinder");
      lot.put("steel", x, NIVEAU + 118, z, 0.48, 10, 0.48, "cylinder");
      lot.put("glow", x, NIVEAU + 123, z, 0.2, 0.25, 0.2, "sphere");
    } else if (b.style === "chrysler") {
      // Sept arcs métalliques concentriques, fenêtres triangulaires et flèche.
      for (let i = 0; i < 7; i++) {
        const r = 4.4 - i * 0.49,
          y = NIVEAU + 75 + i * 2.5;
        lot.put("steel", x, y, z, r * 2, 3.8, r * 2, "cone");
        for (let a = 0; a < 8; a++) {
          const angle = (a * Math.PI) / 4;
          lot.put(
            "glassDark",
            x + Math.sin(angle) * r * 0.7,
            y + 0.6,
            z + Math.cos(angle) * r * 0.7,
            0.8,
            1.5,
            0.15,
            "cone",
            angle,
          );
        }
      }
      lot.put("steel", x, NIVEAU + 98, z, 0.32, 14, 0.32, "cone");
      for (const side of [-1, 1])
        for (const front of [-1, 1]) {
          lot.put(
            "steel",
            x + side * w * 0.35,
            NIVEAU + 65,
            z + front * d * 0.39,
            1.1,
            0.7,
            2.2,
            "cone",
            (front * Math.PI) / 2,
          );
        }
    } else if (b.style === "oneworld")
      lot.put("steel", x, NIVEAU + b.h + 5, z, 0.4, 10, 0.4);
    if (b.style === "times") {
      for (let i = 0; i < 5; i++) {
        const h = i === 0 ? 12 : 8,
          y = NIVEAU + 9 + i * 10;
        lot.put("metal", x, y, b.z0 - 0.2, w + 0.3, h + 0.35, 0.5);
        lot.sign(16 + i, x, y, b.z0 - 0.5, w, h, Math.PI);
        lot.sign(16 + ((i + 2) % 8), b.x0 - 0.3, y, z, d, h, -Math.PI / 2);
      }
      lot.sign(23, x, NIVEAU + 59, b.z0 - 0.3, w, 4, Math.PI);
      lot.put("steel", x, NIVEAU + 65, z, 0.16, 7, 0.16);
      lot.put("glow", x, NIVEAU + 68, z, 1.4, 1.4, 1.4, "sphere");
    }
  }
  groundSector(cx, cz) {
    const lot = new Lot(this),
      x0 = cx * 64,
      z0 = cz * 64;
    // Fusion par rangée : un trottoir n'exige pas 4096 instances par secteur.
    for (let z = z0; z < z0 + 64; z++) {
      let start = x0,
        last = null;
      for (let x = x0; x <= x0 + 64; x++) {
        let s =
          x < x0 + 64 &&
          x >= BORNES.x0 &&
          x < BORNES.x1 &&
          z >= BORNES.z0 &&
          z < BORNES.z1 &&
          this.world.groundAllowed(x, z)
            ? surface(x, z)
            : null;
        if (s && this.world.edits.has(`${x},${SOL},${z}`)) s = null;
        if (s !== last) {
          if (last) {
            const mat = {
              road: "asphalt",
              sidewalk: "concrete",
              lot: "concrete",
              grass: "grass",
              path: "path",
              plaza: "path",
              water: "water",
            }[last];
            const y =
              last === "water"
                ? WATER_LEVEL + 0.86
                : NIVEAU + (last === "sidewalk" ? 0.08 : 0.016);
            lot.put(mat, (start + x) / 2, y, z + 0.5, x - start, 0.035, 1);
          }
          start = x;
          last = s;
        }
      }
    }
    for (let x = Math.ceil(x0 / AVENUE) * AVENUE; x < x0 + 64; x += AVENUE) {
      for (let z = z0; z < z0 + 64; z++) {
        if (surface(x, z) !== "road") continue;
        const intersection = Math.abs(z - Math.round(z / RUE) * RUE) < 3.4;
        if (!intersection) {
          lot.put("yellow", x - 0.16, NIVEAU + 0.043, z + 0.5, 0.1, 0.02, 1);
          lot.put("yellow", x + 0.16, NIVEAU + 0.043, z + 0.5, 0.1, 0.02, 1);
          if (z % 9 < 5)
            for (const side of [-1, 1])
              lot.put(
                "white",
                x + side * 2.6,
                NIVEAU + 0.045,
                z + 0.5,
                0.1,
                0.02,
                1,
              );
        }
      }
    }
    for (let z = Math.ceil(z0 / RUE) * RUE; z < z0 + 64; z += RUE)
      for (let x = Math.ceil(x0 / AVENUE) * AVENUE; x < x0 + 64; x += AVENUE) {
        if (surface(x, z) !== "road" || surface(x + 5, z + 4) === "grass")
          continue;
        for (const side of [-1, 1])
          for (let j = -3; j <= 3; j += 1)
            lot.put(
              "white",
              x + j,
              NIVEAU + 0.048,
              z + side * 3.4,
              0.5,
              0.024,
              1.8,
            );
        for (const side of [-1, 1])
          for (let j = -1.5; j <= 1.5; j += 1)
            lot.put(
              "white",
              x + side * 5,
              NIVEAU + 0.05,
              z + j,
              1.8,
              0.022,
              0.5,
            );
        this.lamp(lot, x + 5, z + 4.8, 1);
        lot.sign(0, x + 5, NIVEAU + 4.9, z + 4.8, 3, 0.55);
        lot.sign(1, x + 5, NIVEAU + 4.25, z + 4.8, 2, 0.5, Math.PI / 2);
        // Feu sur potence, trois optiques avec visières.
        lot.put(
          "metal",
          x + 5,
          NIVEAU + 3.9,
          z - 4,
          0.12,
          7.8,
          0.12,
          "cylinder",
        );
        lot.put("metal", x + 3, NIVEAU + 7.5, z - 4, 4, 0.12, 0.12);
        lot.put("yellow", x + 1.6, NIVEAU + 6.8, z - 4, 0.48, 1.4, 0.45);
        for (let i = 0; i < 3; i++)
          lot.put(
            i === 2 ? "signal" : "roof",
            x + 1.6,
            NIVEAU + 7.3 - i * 0.42,
            z - 3.74,
            0.25,
            0.25,
            0.07,
            "sphere",
          );
      }
    for (let x = x0 + 6; x < x0 + 64; x += 16)
      for (let z = z0 + 6; z < z0 + 64; z += 16) {
        const s = surface(x, z);
        if (s === "grass" && ALEA(x, z) > 0.36)
          this.tree(lot, x, z, 6 + ALEA(x + 1, z) * 4);
        if (
          s === "sidewalk" &&
          Math.abs(z % RUE) > 5 &&
          !batimentA(x, z) &&
          ALEA(x, z) > 0.6
        ) {
          this.tree(lot, x, z, 6.5);
          this.bench(lot, x + 1.6, z);
        }
      }
    // Mobilier régulier au bord des avenues : poteaux fins, pieds libres.
    for (
      let x = Math.ceil((x0 - 5) / AVENUE) * AVENUE + 5;
      x < x0 + 64;
      x += AVENUE
    )
      for (let z = z0 + 24; z < z0 + 64; z += 32) {
        if (surface(x, z) !== "sidewalk" || batimentA(x, z)) continue;
        this.tree(lot, x, z, 7);
        this.bench(lot, x + 2, z + 4);
        lot.put("metal", x, NIVEAU + 0.6, z + 5, 0.62, 1.2, 0.62, "cylinder");
        lot.put("metal", x, NIVEAU + 0.05, z, 3, 0.07, 3);
      }
    // Tables, chaises et bornes sur Broadway piéton, hors des trajets automobiles.
    for (let z = -114; z < 24; z += 9)
      for (const x of [-91, -67]) {
        if (
          x < x0 ||
          x >= x0 + 64 ||
          z < z0 ||
          z >= z0 + 64 ||
          surface(x, z) !== "plaza" ||
          batimentA(x, z)
        )
          continue;
        lot.put("metal", x, NIVEAU + 0.38, z, 0.09, 0.76, 0.09, "cylinder");
        lot.put("white", x, NIVEAU + 0.78, z, 0.9, 0.06, 0.9, "cylinder");
        for (const dz of [-0.8, 0.8]) {
          lot.put("red", x, NIVEAU + 0.44, z + dz, 0.46, 0.06, 0.44);
          lot.put("red", x, NIVEAU + 0.72, z + dz * 1.2, 0.46, 0.55, 0.04);
          for (const sx of [-0.18, 0.18])
            lot.put("metal", x + sx, NIVEAU + 0.22, z + dz, 0.035, 0.44, 0.35);
        }
        lot.put("steel", x + 2, NIVEAU + 0.42, z, 0.2, 0.84, 0.2, "cylinder");
      }
    return lot.finish();
  }
  lamp(lot, x, z, side) {
    lot.put("metal", x, NIVEAU + 3.5, z, 0.14, 7, 0.14, "cylinder");
    lot.put("metal", x - side * 1.2, NIVEAU + 6.9, z, 2.5, 0.14, 0.14);
    lot.put("metal", x - side * 2.3, NIVEAU + 6.8, z, 0.95, 0.18, 0.42);
    lot.put("glow", x - side * 2.3, NIVEAU + 6.69, z, 0.8, 0.04, 0.3);
    lot.put("metal", x, NIVEAU + 0.18, z, 0.35, 0.36, 0.35, "cylinder");
  }
  tree(lot, x, z, h) {
    lot.put("wood", x, NIVEAU + h * 0.36, z, 0.32, h * 0.72, 0.32, "cylinder");
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4,
        r = 1 + ALEA(x + k, z) * 1.6;
      lot.put(
        "foliage",
        x + Math.cos(a) * r,
        NIVEAU + h * 0.72 + Math.sin(k * 1.8) * 1.2,
        z + Math.sin(a) * r,
        3.2,
        2.6,
        3.2,
        "leaves",
        a,
        0.8 + ALEA(k + x, z) * 0.3,
      );
    }
  }
  bench(lot, x, z) {
    lot.put("wood", x, NIVEAU + 0.52, z, 2.1, 0.12, 0.6);
    lot.put("wood", x, NIVEAU + 0.94, z + 0.25, 2.1, 0.75, 0.1);
    for (const dx of [-0.8, 0.8])
      lot.put("metal", x + dx, NIVEAU + 0.25, z, 0.09, 0.5, 0.5);
  }
  update(hour, weather, now) {
    const actual = this.realPlayer.pos;
    this.player.pos.set(
      actual.x - ORIGINE_MANHATTAN.x,
      actual.y,
      actual.z - ORIGINE_MANHATTAN.z,
    );
    this.player.yaw = this.realPlayer.yaw;
    const active = dansManhattan(actual.x, actual.z, 180);
    this.root.visible = active;
    this.lamps.forEach((l) => {
      l.visible = active;
    });
    if (active !== this.active) {
      this.active = active;
      this.renderer.toneMapping = active
        ? THREE.ACESFilmicToneMapping
        : this.earthLook.tone;
      this.renderer.toneMappingExposure = active
        ? 1.05
        : this.earthLook.exposure;
      if (!active) {
        this.sunLight.color.copy(this.earthLook.sun);
        this.hemiLight.color.copy(this.earthLook.hemi);
        this.hemiLight.groundColor.copy(this.earthLook.ground);
        this.sunLight.position.copy(this.earthLook.sunPos);
        this.lastFrame = 0;
      }
      this.renderer.shadowMap.enabled = active;
      this.sunLight.castShadow = active;
      this.camera.far = active ? this.budget.far + 120 : this.earthLook.far;
      this.camera.updateProjectionMatrix();
      if (!active) {
        this.scene.fog.near = this.earthLook.fogNear;
        this.scene.fog.far = this.earthLook.fogFar;
        this.onAdresse?.("");
        this.sunLight.target.position.set(0, 0, 0);
        this.sunLight.target.updateMatrixWorld();
      }
    }
    if (!active) return;
    if (this.lastFrame) {
      this.frames.push(now - this.lastFrame);
      if (this.frames.length > 240) this.frames.shift();
    }
    this.lastFrame = now;
    const p = this.player.pos,
      budget = this.budget;
    const day = THREE.MathUtils.smoothstep(
        Math.sin(hour * Math.PI * 2),
        -0.15,
        0.45,
      ),
      night = 1 - day;
    const sky = new THREE.Color(0xabc3ca).lerp(
      new THREE.Color(0x101c32),
      night,
    );
    if (weather === "rain") sky.multiplyScalar(0.7);
    this.skyDome.position.copy(this.camera.position).sub(this.root.position);
    this.skyDome.material.uniforms.horizon.value.copy(sky);
    this.skyDome.material.uniforms.zenith.value.set(
      day > 0.5 ? 0x668fa9 : 0x070e22,
    );
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.scene.fog.near = budget.far * 0.45;
    this.scene.fog.far = budget.far;
    this.sunLight.intensity = 0.12 + day * 2.4;
    this.sunLight.color.set(day > 0.5 ? 0xffead1 : 0x86a5db);
    this.hemiLight.intensity = 0.46 + day * 1.25;
    this.hemiLight.color.set(day > 0.5 ? 0xcbdde4 : 0x7395b8);
    this.hemiLight.groundColor.set(0x57534b);
    this.sunLight.target.position.set(actual.x, NIVEAU + 10, actual.z);
    // Même orbite que sky.update : soleil le jour, direction opposée (lune)
    // la nuit. Seule l'origine de la lumière suit le joueur pour les ombres.
    const angleSoleil = hour * Math.PI * 2;
    const direction = new THREE.Vector3(
      Math.cos(angleSoleil),
      Math.sin(angleSoleil),
      -0.35,
    )
      .normalize()
      .multiplyScalar(Math.sin(angleSoleil) > 0 ? 1 : -1);
    this.sunLight.position
      .copy(this.sunLight.target.position)
      .addScaledVector(direction, 160);
    this.sunLight.target.updateMatrixWorld();
    this.mats.glassLit.emissiveIntensity = night * 0.9;
    for (const m of [
      this.mats.farBrick,
      this.mats.farBrownstone,
      this.mats.farLimestone,
      this.mats.farGlass,
    ])
      m.emissiveIntensity = night * 0.8;
    this.mats.glow.emissiveIntensity = 0.6 + night * 3;
    this.signage.material.emissiveIntensity = 0.12 + night * 0.95;
    for (const m of [this.mats.glass, this.mats.glassDark])
      m.envMapIntensity = 0.7 - day * 0.1 - night * 0.4;
    this.mats.asphalt.roughness = weather === "rain" ? 0.37 : 0.94;
    const dpr = Math.min(window.devicePixelRatio || 1, budget.dpr);
    if (this.renderer.getPixelRatio() !== dpr) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(
        this.camera.aspect *
          (this.renderer.domElement.clientHeight || innerHeight),
        this.renderer.domElement.clientHeight || innerHeight,
        false,
      );
    }
    const lx = Math.round((p.x - 5) / AVENUE) * AVENUE + 5,
      lz = Math.round((p.z - 4.8) / RUE) * RUE + 4.8;
    this.lamps.forEach((l, i) => {
      l.position.set(
        ORIGINE_MANHATTAN.x + lx + (i % 2) * AVENUE - 2.3,
        NIVEAU + 6.6,
        ORIGINE_MANHATTAN.z + lz + Math.floor(i / 2) * RUE,
      );
      const square = p.x > -128 && p.x < -40 && p.z > -155 && p.z < 45;
      if (square && i < 2) {
        l.position.set(
          ORIGINE_MANHATTAN.x + (i === 0 ? -96 : -62),
          NIVEAU + 8,
          ORIGINE_MANHATTAN.z + p.z + 8,
        );
        l.color.set(i === 0 ? 0x9acbff : 0xffca97);
        l.distance = 45;
        l.intensity = night * 260;
      } else {
        l.color.set(0xffc989);
        l.distance = 19;
        l.intensity = night * 38;
      }
    });
    if (now - this.lastMaintenance > 180) {
      this.lastMaintenance = now;
      this.maintain();
    }
    // Une unité coûteuse à la fois, et le plus près d'abord. Les façades
    // apparaissent seulement une fois prêtes ; la silhouette reste jusque-là.
    const start = performance.now();
    if (!this.job && this.groundQueue?.length) {
      const [cx, cz] = this.groundQueue.shift(),
        key = `${cx},${cz}`;
      if (this.ground.has(key)) disposeGroup(this.ground.get(key));
      const g = this.groundSector(cx, cz);
      this.root.add(decor(g));
      this.ground.set(key, g);
      this.dirtyGround.delete(key);
      this.rebuildFar(`${Math.floor(cx / 4)},${Math.floor(cz / 4)}`);
    } else {
      if (!this.job && this.queue?.length) {
        const b = this.queue.shift();
        this.job = {
          b,
          iterator: this.buildBuilding(b),
          ctx: this.world.ctx,
          epoch: this.world.visualEpoch,
          revision: this.world.buildingRevision.get(b.id) || 0,
        };
      }
      while (this.job && performance.now() - start < 4) {
        const step = this.job.iterator.next();
        if (step.done) {
          const { b, ctx, epoch, revision } = this.job;
          if (
            this.world.buildingAllowed(b) &&
            ctx === this.world.ctx &&
            epoch === this.world.visualEpoch &&
            revision === (this.world.buildingRevision.get(b.id) || 0)
          ) {
            const old = this.buildings.get(b.id);
            if (old) disposeGroup(old);
            const g = step.value;
            this.root.add(decor(g));
            this.buildings.set(b.id, g);
            this.nearSet.add(b.id);
            this.rebuildFar(
              `${Math.floor(b.x0 / 256)},${Math.floor(b.z0 / 256)}`,
            );
          } else disposeGroup(step.value);
          this.job = null;
          break;
        }
      }
      if (!this.job && !this.queue?.length && this.farQueue.length)
        this.rebuildFar(this.farQueue.shift());
    }
    this.stats.buildMs = performance.now() - start;
    if (now - this.lastAddress > 1000) {
      this.lastAddress = now;
      const q = QUARTIERS.reduce((a, b) =>
        Math.hypot(p.x - a.x, p.z - a.z) < Math.hypot(p.x - b.x, p.z - b.z)
          ? a
          : b,
      );
      this.onAdresse?.(`${q.name}  ·  ${night > 0.5 ? "Nuit" : "Jour"}`);
      const f = [...this.frames].sort((a, b) => a - b);
      this.stats = {
        ...this.stats,
        nearBuildings: this.buildings.size,
        groundSectors: this.ground.size,
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        fps: f.length ? 1000 / (f.reduce((a, b) => a + b, 0) / f.length) : 0,
        p95ms: f[Math.floor(f.length * 0.95)] || 0,
        queued:
          (this.queue?.length || 0) +
          (this.groundQueue?.length || 0) +
          this.farQueue.length +
          (this.job ? 1 : 0),
      };
    }
  }
  maintain() {
    const p = this.player.pos,
      r = this.budget.near;
    const distance = (b) =>
      Math.hypot(
        Math.max(b.x0 - p.x, 0, p.x - b.x1),
        Math.max(b.z0 - p.z, 0, p.z - b.z1),
      );
    const visible = BATIMENTS.filter(
      (b) => this.world.buildingAllowed(b) && distance(b) < r,
    ).sort((a, b) => distance(a) - distance(b));
    const desired = new Set(visible.map((b) => b.id));
    const farDirty = new Set();
    for (const [id, g] of this.buildings) {
      if (
        !this.world.buildingAllowed(BATIMENTS[id]) ||
        (!desired.has(id) && distance(BATIMENTS[id]) > r + 12)
      ) {
        disposeGroup(g);
        this.buildings.delete(id);
        this.nearSet.delete(id);
        const b = BATIMENTS[id];
        farDirty.add(`${Math.floor(b.x0 / 256)},${Math.floor(b.z0 / 256)}`);
      }
    }
    for (const k of farDirty) this.rebuildFar(k);
    this.queue = visible.filter(
      (b) =>
        b.id !== this.job?.b.id &&
        (!this.buildings.has(b.id) ||
          this.buildings.get(b.id).userData.revision !==
            (this.world.buildingRevision.get(b.id) || 0)),
    );
    const cx = Math.floor(p.x / 64),
      cz = Math.floor(p.z / 64),
      candidates = [];
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++)
        candidates.push([
          cx + dx,
          cz + dz,
          Math.hypot(dx * 64 + 32 - (p.x % 64), dz * 64 + 32 - (p.z % 64)),
        ]);
    candidates.sort((a, b) => a[2] - b[2]);
    const selected = candidates.slice(0, this.budget.sectors);
    const wanted = new Set(selected.map(([x, z]) => `${x},${z}`));
    for (const [key, g] of this.ground)
      if (!wanted.has(key)) {
        disposeGroup(g);
        this.ground.delete(key);
        this.dirtyGround.delete(key);
        const [x, z] = key.split(",").map(Number);
        farDirty.add(`${Math.floor(x / 4)},${Math.floor(z / 4)}`);
      }
    for (const key of farDirty) this.rebuildFar(key);
    this.groundQueue = selected.filter(
      ([x, z]) =>
        !this.ground.has(`${x},${z}`) || this.dirtyGround.has(`${x},${z}`),
    );
    // Ne pas dessiner l'intégralité de l'île derrière le brouillard.
    for (const [key, g] of this.far) {
      const [x, z] = key.split(",").map(Number);
      g.visible =
        Math.hypot(x * 256 + 128 - p.x, z * 256 + 128 - p.z) <
        this.budget.far + 200;
    }
    // Un changement de contexte invalide les façades, même sans opération neuve.
    if (
      this.lastContext !== this.world.ctx ||
      this.lastEpoch !== this.world.visualEpoch
    ) {
      this.lastContext = this.world.ctx;
      this.lastEpoch = this.world.visualEpoch;
      this.makeFar();
      for (const g of this.buildings.values()) g.userData.revision = -1;
      for (const key of this.ground.keys()) this.dirtyGround.add(key);
    }
  }
  dispose() {
    for (const g of [
      ...this.buildings.values(),
      ...this.ground.values(),
      ...this.far.values(),
    ])
      disposeGroup(g);
    Object.values(this.geos).forEach((g) => g.dispose());
    this.resources.dispose();
    this.signage.material.dispose();
    this.signage.texture.dispose();
    this.lamps.forEach((l) => l.removeFromParent());
    this.root.traverse((o) => {
      if (o.userData.ownedGeometry) o.geometry.dispose();
    });
    this.skyDome.geometry.dispose();
    this.skyDome.material.dispose();
    this.root.removeFromParent();
    this.world.onVisualEdit = null;
  }
}
