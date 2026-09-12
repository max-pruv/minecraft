import * as THREE from 'three';
import { WATER_LEVEL } from './world.js';
import {
  SOL,
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
} from './manhattan-plan.js';
import {
  materiauxManhattan,
  enseignesManhattan,
} from './manhattan-materiaux.js';

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
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
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
  put(mat, x, y, z, w, h, d, shape = 'box', angle = 0, tint = 1) {
    if (w <= 0 || h <= 0 || d <= 0) return;
    const key = mat + ':' + shape;
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
      const [mat, shape] = key.split(':');
      const mesh = new THREE.InstancedMesh(
        this.o.geos[shape],
        this.o.mats[mat],
        items.length
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
        'glass',
        'glassDark',
        'glassLit',
        'glow',
        'grass',
        'water',
        'foliage',
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
          v = 1 - Math.floor(s.index / 4) / 4;
        uv.push(u, v - 0.25, u + 0.25, v - 0.25, u + 0.25, v, u, v);
        idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, this.o.signage.material);
      m.userData.ownedGeometry = true;
      this.group.add(m);
    }
    this.group.userData.instances = [...this.lists.values()].reduce(
      (n, a) => n + a.length,
      0
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
    this.quality = query.get('qualite') || (touch ? 'tablette' : 'haute');
    this.budget =
      this.quality === 'tablette'
        ? { near: 95, far: 900, sectors: 16, dpr: 1.25, shadow: 1024 }
        : { near: 145, far: 1600, sectors: 28, dpr: 1.75, shadow: 2048 };
    this.budget.near = Math.min(this.budget.near, renderRadius * 16);
    this.budget.far = Math.min(this.budget.far, renderRadius * 16 * 7);
    this.budget.sectors = Math.min(
      this.budget.sectors,
      Math.max(4, Math.ceil(renderRadius / 2) ** 2)
    );
    camera.far = this.budget.far + 120;
    camera.updateProjectionMatrix();
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
    this.root.name = 'Manhattan — architecture';
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
      new THREE.PlaneGeometry(16000, 16000),
      this.mats.water
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, WATER_LEVEL + 0.86, -500);
    ocean.userData.ownedGeometry = true;
    this.root.add(ocean);
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
          'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:
          'varying vec3 direction;uniform vec3 zenith;uniform vec3 horizon;void main(){float h=max(normalize(direction).y,0.);gl_FragColor=vec4(mix(horizon,zenith,pow(h,.65)),1.);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n}',
      })
    );
    this.skyDome.scale.setScalar(this.budget.far + 40);
    this.skyDome.renderOrder = -10;
    this.root.add(this.skyDome);
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
      const key = `${Math.floor(b.x0 / 256)},${Math.floor(b.z0 / 256)}`;
      if (!this.farGroups.has(key)) this.farGroups.set(key, []);
      this.farGroups.get(key).push(b);
    }
    for (let x = -3; x <= 2; x++)
      for (let z = -14; z <= 9; z++) {
        const key = `${x},${z}`;
        if (!this.farGroups.has(key)) this.farGroups.set(key, []);
      }
    this.farQueue = [...this.farGroups.keys()].sort((a, b) => {
      const d = (k) => {
        const [x, z] = k.split(',').map(Number);
        return Math.hypot(
          x * 256 - this.player.pos.x,
          z * 256 - this.player.pos.z
        );
      };
      return d(a) - d(b);
    });
  }
  rebuildFar(key) {
    const prev = this.far.get(key);
    if (prev) disposeGroup(prev);
    const lot = new Lot(this);
    const [sx, sz] = key.split(',').map(Number);
    // Sol lointain continu, retiré sous chaque secteur proche. La découpe
    // empêche une dalle de secours de refermer les trous construits/creusés.
    for (let z = sz * 256; z < (sz + 1) * 256; z += 4) {
      let begin = sx * 256,
        last = null;
      for (let x = sx * 256; x <= (sx + 1) * 256; x += 4) {
        let s = x < (sx + 1) * 256 ? surface(x + 2, z + 2) : null;
        if (
          s === 'water' ||
          this.ground.has(`${Math.floor(x / 64)},${Math.floor(z / 64)}`)
        )
          s = null;
        if (s !== last) {
          if (last)
            lot.put(
              {
                road: 'asphalt',
                sidewalk: 'concrete',
                lot: 'concrete',
                grass: 'grass',
                path: 'path',
              }[last],
              (begin + x) / 2,
              NIVEAU + 0.006,
              z + 2,
              x - begin,
              0.015,
              4
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
          surface(x, z) !== 'grass' ||
          ALEA(x, z) <= 0.36 ||
          this.ground.has(`${Math.floor(x / 64)},${Math.floor(z / 64)}`)
        )
          continue;
        const h = 6 + ALEA(x + 1, z) * 4;
        lot.put(
          'wood',
          x,
          NIVEAU + h * 0.36,
          z,
          0.32,
          h * 0.72,
          0.32,
          'cylinder'
        );
        lot.put(
          'foliage',
          x,
          NIVEAU + h * 0.72,
          z,
          7,
          6,
          7,
          'leaves',
          ALEA(x, z) * 6,
          0.8 + ALEA(x, z) * 0.3
        );
      }
    for (const b of this.farGroups.get(key) || []) {
      if (this.nearSet.has(b.id)) continue;
      const x = (b.x0 + b.x1) / 2,
        z = (b.z0 + b.z1) / 2,
        w = b.x1 - b.x0,
        d = b.z1 - b.z0;
      const levels =
        b.style === 'empire'
          ? [
              [1, 28],
              [0.72, 66],
              [0.48, 90],
              [0.24, 108],
            ]
          : b.style === 'chrysler'
            ? [
                [1, 52],
                [0.8, 67],
                [0.58, 77],
                [0.36, 91],
              ]
            : b.style === 'rockefeller'
              ? [
                  [1, 21],
                  [0.58, 84],
                ]
              : [[1, b.h]];
      let y = 0;
      for (const [k, h] of levels) {
        lot.put(
          {
            brick: 'farBrick',
            brownstone: 'farBrownstone',
            limestone: 'farLimestone',
            glass: 'farGlass',
          }[b.mat],
          x,
          NIVEAU + (h + y) / 2,
          z,
          w * k,
          h - y,
          d * k
        );
        y = h;
      }
      lot.put(
        'roof',
        x,
        NIVEAU + b.h + 0.15,
        z,
        w * levels.at(-1)[0],
        0.3,
        d * levels.at(-1)[0]
      );
      if (['empire', 'chrysler', 'oneworld'].includes(b.style))
        lot.put('metal', x, NIVEAU + b.h + 5, z, 0.45, 10, 0.45);
    }
    const g = lot.finish();
    g.userData.key = key;
    this.root.add(g);
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
  facade(lot, b, x, z, nx, nz, h) {
    const tangent = nx ? z : x,
      angle = nx ? Math.PI / 2 : 0;
    for (let yy = 0; yy <= h; yy++) {
      const y = NIVEAU + yy,
        wx = x + 0.5,
        wz = z + 0.5;
      if (!this.present(x, y, z)) continue;
      const ex = wx + nx * 0.49,
        ez = wz + nz * 0.49;
      const window =
        (tangent - (nx ? b.z0 : b.x0)) % 3 === 1 &&
        yy > 0 &&
        yy < h - 1 &&
        yy % 3 !== 0;
      const store = yy < 3 && (tangent - (nx ? b.z0 : b.x0)) % 7 < 5;
      const curtain = b.mat === 'glass' && yy > 2 && yy < h;
      if (window || store || curtain) {
        const lit =
          ALEA(Math.floor(tangent / 3) + b.seed, Math.floor(yy / 3)) > 0.58;
        const mat = lit
          ? 'glassLit'
          : b.mat === 'glass'
            ? 'glass'
            : 'glassDark';
        lot.put(
          mat,
          ex - nx * 0.27,
          y + 0.5,
          ez - nz * 0.27,
          nx ? 0.08 : 0.96,
          0.94,
          nz ? 0.08 : 0.96
        );
        // Les embrasures ont 27 cm de profondeur, les meneaux une vraie épaisseur.
        lot.put(
          b.mat === 'glass' ? 'metal' : 'trim',
          ex,
          y + 0.045,
          ez,
          nx ? 0.55 : 1,
          0.09,
          nz ? 0.55 : 1
        );
        if (yy % 3 === 2 || store)
          lot.put(
            'metal',
            ex - nx * 0.12,
            y + 0.5,
            ez - nz * 0.12,
            nx ? 0.14 : 0.035,
            1,
            nz ? 0.14 : 0.035
          );
        lot.put(
          b.mat === 'glass' ? 'metal' : 'trim',
          ex,
          y + 0.5,
          ez,
          nx ? 0.5 : 0.065,
          1,
          nz ? 0.5 : 0.065
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
          'box',
          0,
          0.89 + ALEA(b.seed, Math.floor(yy / 3)) * 0.16
        );
      }
      if (yy === 3 || yy === h || (b.mat !== 'glass' && yy % 12 === 0)) {
        lot.put(
          'trim',
          ex + nx * 0.1,
          y + 0.92,
          ez + nz * 0.1,
          nx ? 0.46 : 1.04,
          0.19,
          nz ? 0.46 : 1.04
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
          else if (adjacent < h) {
            // Partie haute d'un retrait, sans ajouter les étages enterrés.
            for (let yy = adjacent + 1; yy <= h; yy++)
              if (this.present(xx, NIVEAU + yy, zz))
                lot.put(
                  yy % 3 === 2 ? 'glassDark' : b.mat,
                  xx + 0.5 + nx * 0.4,
                  NIVEAU + yy + 0.5,
                  zz + 0.5 + nz * 0.4,
                  nx ? 0.18 : 1,
                  1,
                  nz ? 0.18 : 1
                );
          }
        }
        // Dalle de toit suivant chaque retrait ; on respecte les blocs retirés.
        if (this.present(xx, NIVEAU + h, zz))
          lot.put('roof', xx + 0.5, NIVEAU + h + 0.94, zz + 0.5, 1, 0.12, 1);
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
              'concrete',
              (debut + xx) / 2,
              NIVEAU + yy + 0.5,
              zz + 0.5,
              xx - debut,
              1,
              1
            );
            debut = null;
          }
        }
      }
      yield;
    }
    yield;
    // Devantures, seuils et auvents ; les portes restent libres sur 3 mètres.
    if (b.style === 'masonry' || b.style === 'office') {
      for (let sx = b.x0 + 5; sx < b.x1 - 3; sx += 8) {
        lot.sign(
          4 + ((b.seed + Math.floor(sx)) % 4),
          sx,
          NIVEAU + 3.6,
          b.z1 + 0.07,
          7,
          0.72
        );
        lot.put('metal', sx, NIVEAU + 3.12, b.z1 + 0.65, 7, 0.12, 1.5);
      }
      lot.sign(12, b.x0 + 0.05, NIVEAU + 3.6, b.z0 + 4, 1.8, 0.55, Math.PI / 2);
    }
    // Escaliers de secours des immeubles en maçonnerie : paliers ajourés et
    // marches visibles, ancrés sur une colonne encore présente.
    if (b.mat === 'brick' || b.mat === 'brownstone')
      for (let yy = 6; yy < b.h - 2; yy += 6) {
        const ex = b.x0 + 5,
          ez = b.z0 - 0.9;
        if (!this.present(ex, NIVEAU + yy, b.z0)) continue;
        lot.put('metal', ex, NIVEAU + yy, ez, 3, 0.09, 1.7);
        for (let k = 0; k < 7; k++) {
          lot.put(
            'metal',
            ex - 1.4 + k * 0.45,
            NIVEAU + yy + 0.45,
            ez - 0.8,
            0.04,
            0.9,
            0.04
          );
        }
        lot.put('metal', ex, NIVEAU + yy + 0.9, ez - 0.8, 3, 0.05, 0.05);
        for (let k = 0; k < 12; k++)
          lot.put(
            'metal',
            ex - 1.3 + k * 0.23,
            NIVEAU + yy - k * 0.5,
            ez,
            0.6,
            0.065,
            0.8
          );
      }
    const top = NIVEAU + b.h + 1;
    // Centrales de ventilation avec grilles et réservoirs sur leurs supports.
    for (let k = 0; k < 2; k++) {
      const px = x + (k - 0.5) * 5;
      lot.put('metal', px, top + 0.65, z, 2.4, 1.3, 3.3);
      for (let j = 0; j < 7; j++)
        lot.put('roof', px, top + 0.5 + j * 0.11, z + 1.66, 2.2, 0.035, 0.04);
      lot.put('roof', px, top + 1.34, z, 1.2, 0.08, 1.2, 'cylinder');
    }
    if (b.mat !== 'glass' && b.style === 'masonry' && b.seed % 3 === 0) {
      const tx = x + 5,
        tz = z - 5;
      for (const dx of [-1, 1])
        for (const dz of [-1, 1])
          lot.put('metal', tx + dx, top + 0.9, tz + dz, 0.1, 1.8, 0.1);
      lot.put('wood', tx, top + 3, tz, 3, 3, 3, 'cylinder');
      lot.put('metal', tx, top + 4.8, tz, 3.4, 0.7, 3.4, 'cone');
      for (const yy of [1.8, 3, 4.2])
        lot.put('metal', tx, top + yy, tz, 3.05, 0.09, 3.05, 'cylinder');
    }
    if (['empire', 'chrysler', 'oneworld'].includes(b.style)) {
      lot.put('metal', x, top + 4, z, 0.55, 8, 0.55);
      lot.put('glow', x, top + 8, z, 0.23, 0.23, 0.23, 'sphere');
      if (b.style === 'chrysler')
        for (let k = 0; k < 6; k++)
          lot.put(
            'metal',
            x,
            top - 8 + k * 1.25,
            z,
            11 - k * 1.5,
            1.5,
            11 - k * 1.5,
            'cone'
          );
    }
    if (b.style === 'terminal') {
      lot.sign(9, x, NIVEAU + 12, b.z1 + 0.3, w * 0.7, 2);
      for (let sx = b.x0 + 5; sx < b.x1; sx += 8)
        lot.put('trim', sx, NIVEAU + 7, b.z1 + 0.7, 1.1, 14, 1.1, 'cylinder');
      lot.put('metal', x, top + 0.7, z, w * 0.86, 1.4, d * 0.85);
      lot.put('trim', x, NIVEAU + 17, b.z1 + 1, w * 0.9, 1.2, 3);
      lot.put(
        'yellow',
        x,
        NIVEAU + 18.8,
        b.z1 + 1,
        2.4,
        2.4,
        0.3,
        'cylinder',
        Math.PI / 2
      );
    }
    if (b.style === 'church')
      lot.put('brownstone', x, top + 8, b.z0 + 5, 9, 16, 9, 'cone');
    if (Math.abs(x - broadway(z)) < 65 && z > -400 && z < 200) {
      lot.sign(
        14 + (b.seed % 2),
        x,
        NIVEAU + 12,
        b.z1 + 0.3,
        Math.min(w - 2, 18),
        12
      );
      lot.put('metal', x, NIVEAU + 12, b.z1 + 0.1, Math.min(w, 19), 12.7, 0.3);
    }
    const g = lot.finish();
    g.name = b.name || `Immeuble ${b.id}`;
    g.userData.buildingId = b.id;
    g.userData.revision = this.world.buildingRevision.get(b.id) || 0;
    return g;
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
        let s = x < x0 + 64 ? surface(x, z) : null;
        if (s && this.world.edits.has(`${x},${SOL},${z}`)) s = null;
        if (s !== last) {
          if (last) {
            const mat = {
              road: 'asphalt',
              sidewalk: 'concrete',
              lot: 'concrete',
              grass: 'grass',
              path: 'path',
              water: 'water',
            }[last];
            const y =
              last === 'water'
                ? WATER_LEVEL + 0.86
                : NIVEAU + (last === 'sidewalk' ? 0.08 : 0.016);
            lot.put(mat, (start + x) / 2, y, z + 0.5, x - start, 0.035, 1);
          }
          start = x;
          last = s;
        }
      }
    }
    for (let x = Math.ceil(x0 / AVENUE) * AVENUE; x < x0 + 64; x += AVENUE) {
      for (let z = z0; z < z0 + 64; z++) {
        if (surface(x, z) !== 'road') continue;
        const intersection = Math.abs(z - Math.round(z / RUE) * RUE) < 8;
        if (!intersection) {
          lot.put('yellow', x - 0.16, NIVEAU + 0.043, z + 0.5, 0.1, 0.02, 1);
          lot.put('yellow', x + 0.16, NIVEAU + 0.043, z + 0.5, 0.1, 0.02, 1);
          if (z % 9 < 5)
            for (const side of [-1, 1])
              lot.put(
                'white',
                x + side * 5,
                NIVEAU + 0.045,
                z + 0.5,
                0.1,
                0.02,
                1
              );
        }
      }
    }
    for (let z = Math.ceil(z0 / RUE) * RUE; z < z0 + 64; z += RUE)
      for (let x = Math.ceil(x0 / AVENUE) * AVENUE; x < x0 + 64; x += AVENUE) {
        if (surface(x, z) !== 'road' || surface(x + 12, z + 10) === 'grass')
          continue;
        for (const side of [-1, 1])
          for (let j = -8; j <= 8; j += 2)
            lot.put(
              'white',
              x + j,
              NIVEAU + 0.048,
              z + side * 9,
              1,
              0.024,
              3.4
            );
        for (const side of [-1, 1])
          for (let j = -4; j <= 4; j += 2)
            lot.put('white', x + side * 13, NIVEAU + 0.05, z + j, 3, 0.022, 1);
        this.lamp(lot, x + 12.5, z + 12, 1);
        lot.sign(0, x + 12.5, NIVEAU + 4.9, z + 12, 3, 0.55);
        lot.sign(1, x + 12.5, NIVEAU + 4.25, z + 12, 2, 0.5, Math.PI / 2);
        // Feu sur potence, trois optiques avec visières.
        lot.put(
          'metal',
          x + 12.5,
          NIVEAU + 3.9,
          z - 10,
          0.12,
          7.8,
          0.12,
          'cylinder'
        );
        lot.put('metal', x + 8, NIVEAU + 7.5, z - 10, 9, 0.12, 0.12);
        lot.put('yellow', x + 4, NIVEAU + 6.8, z - 10, 0.48, 1.4, 0.45);
        for (let i = 0; i < 3; i++)
          lot.put(
            i === 2 ? 'signal' : 'roof',
            x + 4,
            NIVEAU + 7.3 - i * 0.42,
            z - 9.74,
            0.25,
            0.25,
            0.07,
            'sphere'
          );
      }
    for (let x = x0 + 6; x < x0 + 64; x += 16)
      for (let z = z0 + 6; z < z0 + 64; z += 16) {
        const s = surface(x, z);
        if (s === 'grass' && ALEA(x, z) > 0.36)
          this.tree(lot, x, z, 6 + ALEA(x + 1, z) * 4);
        if (
          s === 'sidewalk' &&
          Math.abs(z % 48) > 14 &&
          !batimentA(x, z) &&
          ALEA(x, z) > 0.6
        ) {
          this.tree(lot, x, z, 6.5);
          this.bench(lot, x + 4, z);
        }
      }
    // Mobilier régulier au bord des avenues : poteaux fins, pieds libres.
    for (let x = Math.ceil((x0 - 12) / 100) * 100 + 12; x < x0 + 64; x += 100)
      for (let z = z0 + 24; z < z0 + 64; z += 32) {
        if (surface(x, z) !== 'sidewalk' || batimentA(x, z)) continue;
        this.tree(lot, x, z, 7);
        this.bench(lot, x + 2, z + 4);
        lot.put('metal', x, NIVEAU + 0.6, z + 5, 0.62, 1.2, 0.62, 'cylinder');
        lot.put('metal', x, NIVEAU + 0.05, z, 3, 0.07, 3);
      }
    return lot.finish();
  }
  lamp(lot, x, z, side) {
    lot.put('metal', x, NIVEAU + 3.5, z, 0.14, 7, 0.14, 'cylinder');
    lot.put('metal', x - side * 1.2, NIVEAU + 6.9, z, 2.5, 0.14, 0.14);
    lot.put('metal', x - side * 2.3, NIVEAU + 6.8, z, 0.95, 0.18, 0.42);
    lot.put('glow', x - side * 2.3, NIVEAU + 6.69, z, 0.8, 0.04, 0.3);
    lot.put('metal', x, NIVEAU + 0.18, z, 0.35, 0.36, 0.35, 'cylinder');
  }
  tree(lot, x, z, h) {
    lot.put('wood', x, NIVEAU + h * 0.36, z, 0.32, h * 0.72, 0.32, 'cylinder');
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4,
        r = 1 + ALEA(x + k, z) * 1.6;
      lot.put(
        'foliage',
        x + Math.cos(a) * r,
        NIVEAU + h * 0.72 + Math.sin(k * 1.8) * 1.2,
        z + Math.sin(a) * r,
        3.2,
        2.6,
        3.2,
        'leaves',
        a,
        0.8 + ALEA(k + x, z) * 0.3
      );
    }
  }
  bench(lot, x, z) {
    lot.put('wood', x, NIVEAU + 0.52, z, 2.1, 0.12, 0.6);
    lot.put('wood', x, NIVEAU + 0.94, z + 0.25, 2.1, 0.75, 0.1);
    for (const dx of [-0.8, 0.8])
      lot.put('metal', x + dx, NIVEAU + 0.25, z, 0.09, 0.5, 0.5);
  }
  update(hour, weather, now) {
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
        0.45
      ),
      night = 1 - day;
    const sky = new THREE.Color(0xabc3ca).lerp(
      new THREE.Color(0x101c32),
      night
    );
    if (weather === 'rain') sky.multiplyScalar(0.7);
    this.skyDome.position.copy(this.camera.position);
    this.skyDome.material.uniforms.horizon.value.copy(sky);
    this.skyDome.material.uniforms.zenith.value.set(
      day > 0.5 ? 0x668fa9 : 0x070e22
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
    this.sunLight.target.position.set(p.x, NIVEAU + 10, p.z);
    const direction = this.sunLight.position.clone().normalize();
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
    this.mats.asphalt.roughness = weather === 'rain' ? 0.37 : 0.94;
    const dpr = Math.min(window.devicePixelRatio || 1, budget.dpr);
    if (this.renderer.getPixelRatio() !== dpr) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(
        this.camera.aspect *
          (this.renderer.domElement.clientHeight || innerHeight),
        this.renderer.domElement.clientHeight || innerHeight,
        false
      );
    }
    const lx = Math.round((p.x - 12.5) / 100) * 100 + 12.5,
      lz = Math.round((p.z - 12) / 48) * 48 + 12;
    this.lamps.forEach((l, i) => {
      l.position.set(
        lx + (i % 2) * 100 - 2.3,
        NIVEAU + 6.6,
        lz + Math.floor(i / 2) * 48
      );
      l.intensity = night * 38;
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
      this.root.add(g);
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
            ctx === this.world.ctx &&
            epoch === this.world.visualEpoch &&
            revision === (this.world.buildingRevision.get(b.id) || 0)
          ) {
            const old = this.buildings.get(b.id);
            if (old) disposeGroup(old);
            const g = step.value;
            this.root.add(g);
            this.buildings.set(b.id, g);
            this.nearSet.add(b.id);
            this.rebuildFar(
              `${Math.floor(b.x0 / 256)},${Math.floor(b.z0 / 256)}`
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
          : b
      );
      this.onAdresse?.(`${q.name}  ·  ${night > 0.5 ? 'Nuit' : 'Jour'}`);
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
        Math.max(b.z0 - p.z, 0, p.z - b.z1)
      );
    const visible = BATIMENTS.filter((b) => distance(b) < r).sort(
      (a, b) => distance(a) - distance(b)
    );
    const desired = new Set(visible.map((b) => b.id));
    const farDirty = new Set();
    for (const [id, g] of this.buildings) {
      if (!desired.has(id) && distance(BATIMENTS[id]) > r + 32) {
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
            (this.world.buildingRevision.get(b.id) || 0))
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
        const [x, z] = key.split(',').map(Number);
        farDirty.add(`${Math.floor(x / 4)},${Math.floor(z / 4)}`);
      }
    for (const key of farDirty) this.rebuildFar(key);
    this.groundQueue = selected.filter(
      ([x, z]) =>
        !this.ground.has(`${x},${z}`) || this.dirtyGround.has(`${x},${z}`)
    );
    // Ne pas dessiner l'intégralité de l'île derrière le brouillard.
    for (const [key, g] of this.far) {
      const [x, z] = key.split(',').map(Number);
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
