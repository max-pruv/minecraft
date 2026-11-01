import { BATIMENTS_HISTORIQUES } from './manhattan-historique.js';
import * as THREE from "three";
import { WATER_LEVEL } from "./world.js";
import { decor } from "./couches.js";
import {
  ORIGINE_MANHATTAN,
  dansManhattan,
  dansBoiteLiberte,
  dansBanlieue,
} from "./manhattan-world.js";
import {
  ZONES,
  PONTS,
  DECORS,
  zoneA,
  solDeBanlieue,
  zRue,
} from "./new-york-banlieues.js";
import { etatFeu } from "./feux.js";
import {
  SOL,
  BORNES,
  AVENUE,
  RUE,
  PARC,
  ALEA,
  BATIMENTS as BATIMENTS_NOUVEAUX,
  QUARTIERS,
  surface,
  broadway,
  batimentA,
  emprise,
  sommet,
  niveaux,
  ILE_LIBERTE,
  feuxSecteur,
  feuxAutour,
} from "./manhattan-plan.js";
const BATIMENTS = [...BATIMENTS_NOUVEAUX, ...BATIMENTS_HISTORIQUES];
import {
  materiauxManhattan,
  enseignesManhattan,
} from "./manhattan-materiaux.js";
import { SOCLE_EMPIRE, MODELES_NY_ETAT, variante } from "./manhattan-plan.js";
import {
  PHOTO_NY,
  materiauNY,
  chargerModeleNY,
  modeleNY,
  maillageNY,
  materiauQuartiers,
  chargerQuartiers,
} from "./new-york-modeles.js";

const NIVEAU = SOL + 1;
// Les matériaux du sol du plan, proche et lointain.
const MAT_SOL = {
  road: "asphalt",
  sidewalk: "concrete",
  lot: "concrete",
  grass: "grass",
  path: "path",
  plaza: "path",
  water: "water",
  gazon: "herbeClaire",
  foret: "grass",
  beach: "sable",
  boardwalk: "wood",
  quai: "concrete",
};
const dansIle = (x, z) => x >= BORNES.x0 && x < BORNES.x1 && z >= BORNES.z0 && z < BORNES.z1;
const dansPlan = (x, z) => dansIle(x, z) || !!zoneA(x, z);
// La façade lointaine d'un immeuble : une variante de sa famille (v565), ou la
// famille seule pour le New York d'avant (`?photo=0`).
const FAMILLES_LOIN = {
  brick: ["farBrick", "farBrick2", "farBrick3", "farBrick4"],
  brownstone: ["farBrownstone", "farBrownstone"],
  limestone: ["farLimestone", "farLimestone2", "farLimestone3"],
  glass: ["farGlass", "farGlass2"],
  red: ["red"],
};
const SANS_VARIANTE = { teinte: [1, 1, 1], rythme: 3, loin: 0 };
const varianteDe = (b) => (PHOTO_NY ? variante(b) : SANS_VARIANTE);
const loinDe = (b) => {
  const f = FAMILLES_LOIN[b.mat];
  return f[PHOTO_NY ? Math.floor(varianteDe(b).loin * f.length) : 0];
};
// le premier bloc au-dessus du sol de l'île (dy = 0 de la statue)
const SOL_ILE_RENDU = SOL + 1;

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

function toitDeuxPentes() {
  const g = new THREE.BufferGeometry();
  const p = [
    // les deux pans (faîte à y = 1, le long de z), puis les deux pignons
    -0.5, 0, -0.5, -0.5, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5,
    0.5, 0, 0.5, 0.5, 0, -0.5, 0, 1, -0.5, 0, 1, 0.5,
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5,
    0.5, 0, -0.5, -0.5, 0, -0.5, 0, 1, -0.5,
  ];
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Array((p.length / 3) * 2).fill(0), 2));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 11, 12, 13]);
  g.computeVertexNormals();
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
  // `penche` : une rotation autour de z avant le cap, pour un câble ou un rayon
  put(mat, x, y, z, w, h, d, shape = "box", angle = 0, tint = 1, penche = 0) {
    if (w <= 0 || h <= 0 || d <= 0) return;
    const key = mat + ":" + shape;
    if (!this.lists.has(key)) this.lists.set(key, []);
    this.lists.get(key).push([x, y, z, w, h, d, angle, tint, penche]);
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
        obj.rotation.set(0, p[6], p[8]);
        obj.updateMatrix();
        mesh.setMatrixAt(i, obj.matrix);
        if (Array.isArray(p[7])) color.setRGB(p[7][0], p[7][1], p[7][2]);
        else color.setRGB(p[7], p[7], p[7]);
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
    lamps = null,
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
      // Depuis la v247 le monde entier porte des ombres et la correspondance
      // tonale ACES : en quittant Manhattan on lui rend SES réglages, pas
      // « éteint ».
      shadows: renderer.shadowMap.enabled,
      castShadow: sunLight.castShadow,
      shadowSize: sunLight.shadow.mapSize.x,
    };
    // LE MOBILIER QUE LA VOITURE DE L'ENFANT NE TRAVERSE PAS (v252). Les
    // tables de Times Square, les bancs, les réverbères et les arbres sont
    // des maillages sans bloc : la boîte de collision du joueur ne les voit
    // pas, et Max a vu sa voiture passer à travers les tables. Chaque pièce
    // de mobilier posée note les cases au sol qu'elle occupe (coordonnées du
    // plan) ; `obstacleA(wx, wz)` répond pour un point du monde.
    this.obstacles = new Set();
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
      // les toits à deux pentes des pavillons : un prisme, faîte le long de z
      prisme: toitDeuxPentes(),
      // l'arbre vu de loin : quatre-vingts triangles, pas deux cent quatre-vingts
      boule: new THREE.IcosahedronGeometry(0.5, 1),
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
    // l'eau des quartiers : mêmes réglages, un plan par zone qui a un rivage
    for (const q of ZONES) {
      if (!Object.keys(q.cotes).length && !q.parcs) continue;
      const plan = new THREE.Mesh(new THREE.PlaneGeometry(q.x1 - q.x0, q.z1 - q.z0), this.mats.water);
      plan.rotation.x = -Math.PI / 2;
      plan.position.set((q.x0 + q.x1) / 2, WATER_LEVEL + 0.86, (q.z0 + q.z1) / 2);
      plan.userData.ownedGeometry = true;
      this.root.add(decor(plan));
    }
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
    // LES QUATRE LAMPES DE RUE SONT PARTAGÉES AVEC LE MONDE (v248). Hors de
    // Manhattan, `main.js` les pose sous les réverbères les plus proches de
    // l'enfant ; ici, sur la grille des avenues. Un seul jeu, parce que le
    // NOMBRE de lampes ponctuelles fait partie de la clé de chaque programme
    // de shader : en créer d'autres recompilerait tous les matériaux à
    // l'entrée et à la sortie de la ville.
    this.ownsLamps = !lamps;
    this.lamps = lamps || [];
    if (this.ownsLamps) {
      for (let i = 0; i < 4; i++) {
        const l = new THREE.PointLight(0xffc989, 0, 19, 2);
        scene.add(l);
        this.lamps.push(l);
      }
    }
    this.frames = [];
    this.lastFrame = 0;
    this.stats = { buildings: BATIMENTS.length, quality: this.quality };
    // LES OPTIQUES ALLUMÉES DES FEUX (v496) : trois essaims, un par couleur,
    // réécrits deux fois par seconde par `feuxAutour` — la même horloge et la
    // même règle (`feux.js`) que les voitures et les passants qui s'y arrêtent.
    this.feuxVifs = ["signalRouge", "signalOrange", "signal"].map((m) => {
      const im = new THREE.InstancedMesh(this.geos.sphere, this.mats[m], 512);
      // une couleur par instance, comme les essaims de `Lot` : sans elle la
      // clé de programme diffère (`instancingColor`) et l'entrée dans la
      // ville compilerait un programme de plus (v246)
      const blanc = new THREE.Color(1, 1, 1);
      for (let i = 0; i < 512; i++) im.setColorAt(i, blanc);
      im.count = 0;
      im.frustumCulled = false;
      im.userData.feux = m;
      this.root.add(decor(im));
      return im;
    });
    this.makeFar();
    // LES QUARTIERS (v583). La matière naît ici, avec les autres, pour être chauffée.
    // Les ponts et les grands décors se voient de partout : un seul lot, une fois.
    this.mats.photoQuartiers = materiauQuartiers();
    this.quartiersPrets = false;
    this.root.add(decor(this.ouvrages()));
    chargerQuartiers()?.then((formes) => {
      if (!formes) return;
      Object.assign(this.geos, formes);
      this.quartiersPrets = true;
      // ce qui était déjà dessiné se refait avec les modèles
      for (const [id, g] of this.buildings) if (BATIMENTS[id].modele) { disposeGroup(g); this.buildings.delete(id); this.nearSet.delete(id); }
      this.farQueue = [...this.farGroups.keys()];
    });
    // NEW YORK D'APRÈS LES MODÈLES DE MAX (v565). Les deux matériaux naissent
    // avec la ville (dans `mats`, que la chauffe de New York compile pendant
    // l'accueil) ; les fichiers arrivent ensuite, et ce qui était déjà dessiné
    // se refait avec eux.
    this.mats.photoEmpire = materiauNY("empire");
    this.mats.photoLiberte = materiauNY("liberte");
    const empire = BATIMENTS.find((b) => b.photo === "empire");
    chargerModeleNY("empire")?.then((m) => {
      if (!m || !empire) return;
      const g = this.buildings.get(empire.id);
      if (g) {
        disposeGroup(g);
        this.buildings.delete(empire.id);
        this.nearSet.delete(empire.id);
      }
      this.rebuildFar(`${Math.floor(empire.x0 / 256)},${Math.floor(empire.z0 / 256)}`);
    });
    // La statue : un niveau de détail à elle, hors des secteurs lointains (elle
    // est hors du rectangle, comme son île).
    chargerModeleNY("liberte")?.then((m) => {
      if (!m) return;
      const lod = new THREE.LOD();
      lod.name = "Statue de la Liberté — modèle";
      lod.addLevel(maillageNY("liberte", "proche"), 0);
      lod.addLevel(maillageNY("liberte", "loin"), 170);
      // Dans la SCÈNE, pas sous `root` : `root` s'éteint dès qu'on quitte la
      // ville et ses abords, et la statue se voit de bien plus loin — de la
      // baie, du ciel, de Brooklyn (vu en capture : disparue à 160 blocs).
      lod.position.set(
        ORIGINE_MANHATTAN.x + ILE_LIBERTE.x,
        SOL_ILE_RENDU,
        ORIGINE_MANHATTAN.z + ILE_LIBERTE.z,
      );
      lod.visible = false;
      this.statueNY = lod;
      this.scene.add(decor(lod));
      this.world.modeleLibertePret();
      this.majStatueNY(true);
    });
  }
  // Le modèle d'un bâtiment, s'il se dessine : arrivé, et sur un monument que
  // l'enfant n'a ni touché (un trou doit se voir) ni bâti avant la date.
  photoDe(b) {
    if (!b.photo || MODELES_NY_ETAT.empireAncien || this.world.empireTouche) return null;
    return modeleNY(b.photo);
  }
  // La forme du paquet CCity d'un immeuble (v583) : arrivée, et sur un immeuble que
  // l'enfant n'a pas touché — un modèle ne se troue pas, la façade procédurale si.
  modeleDe(b) {
    // Un modèle plein ne peut remplacer une emprise OSM à cour ou retraits.
    if (b.osm) return null;
    if (!b.modele || !this.quartiersPrets || this.world.batimentTouche?.(b.id)) return null;
    return this.geos[b.modele] ? b.modele : null;
  }
  poserModele(lot, b, forme) {
    const quart = Math.abs(Math.sin(b.cap || 0)) > 0.5,
      w = b.x1 - b.x0,
      d = b.z1 - b.z0;
    lot.put(
      "photoQuartiers",
      (b.x0 + b.x1) / 2,
      NIVEAU,
      (b.z0 + b.z1) / 2,
      quart ? d : w,
      b.hModele || b.h + 1,
      quart ? w : d,
      forme,
      b.cap || 0,
      b.teinte || 1,
    );
  }
  statueVisible() {
    return !!this.statueNY && !MODELES_NY_ETAT.liberteAncienne && !this.world.liberteTouchee;
  }
  majStatueNY(force = false) {
    const v = this.statueVisible();
    if (!force && v === this.statueAffichee) return;
    this.statueAffichee = v;
    if (this.statueNY) this.statueNY.visible = v;
    this.rebuildFar(`${Math.floor(ILE_LIBERTE.x / 256)},${Math.floor(ILE_LIBERTE.z / 256)}`);
  }
  // Les feux à `r` blocs de (wx, wz) — coordonnées du MONDE — avec leur état
  // à l'heure de la rue `t` (ms). Rend la liste que `main.js` donne à la
  // circulation et aux passants (`feuxProches`), et allume leurs optiques.
  feuxAutour(wx, wz, t, r) {
    const O = ORIGINE_MANHATTAN,
      obj = new THREE.Object3D(),
      n = [0, 0, 0],
      out = [];
    for (const f of feuxAutour(wx - O.x, wz - O.z, r)) {
      const etat = etatFeu(f.axe, t),
        i = etat === "rouge" ? 0 : etat === "orange" ? 1 : 2;
      if (n[i] < 512) {
        obj.position.set(
          f.x + f.fx * 0.27,
          NIVEAU + 3.75 - i * 0.42,
          f.z + f.fz * 0.27,
        );
        obj.scale.setScalar(0.27);
        obj.updateMatrix();
        this.feuxVifs[i].setMatrixAt(n[i]++, obj.matrix);
      }
      out.push({
        x: f.x + O.x,
        z: f.z + O.z,
        axe: f.axe,
        etat,
        lampes: [0, 1, 2].map((k) => ({ visible: k === i })),
      });
    }
    this.feuxVifs.forEach((im, i) => {
      im.count = n[i];
      im.instanceMatrix.needsUpdate = true;
    });
    return out;
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
    // les secteurs lointains des quartiers
    for (const q of ZONES)
      for (let x = Math.floor(q.x0 / 256); x <= Math.floor((q.x1 - 1) / 256); x++)
        for (let z = Math.floor(q.z0 / 256); z <= Math.floor((q.z1 - 1) / 256); z++) {
          const key = `${x},${z}`;
          if (!this.farGroups.has(key)) this.farGroups.set(key, []);
        }
    // le secteur lointain de Liberty Island, hors du rectangle
    const cleIle = `${Math.floor(ILE_LIBERTE.x / 256)},${Math.floor(ILE_LIBERTE.z / 256)}`;
    if (!this.farGroups.has(cleIle)) this.farGroups.set(cleIle, []);
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
          x < (sx + 1) * 256 && dansPlan(x, z) ? surface(x + 2, z + 2) : null;
        if (
          s === "water" ||
          !this.world.groundAllowed(x, z) ||
          this.ground.has(`${Math.floor(x / 64)},${Math.floor(z / 64)}`)
        )
          s = null;
        if (s !== last) {
          if (last)
            lot.put(
              MAT_SOL[last],
              (begin + x) / 2,
              (last === "beach" ? solDeBanlieue(begin + 2, z + 2, SOL) + 1 : NIVEAU) + 0.006,
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
    // Les arbres lointains des quartiers (v583) : quatre-vingts triangles, moins
    // serrés qu'à Central Park — une banlieue en a des milliers.
    for (let x = sx * 256 + 9; x < (sx + 1) * 256; x += 22)
      for (let z = sz * 256 + 9; z < (sz + 1) * 256; z += 22) {
        if (!zoneA(x, z)) continue;
        const s = surface(x, z);
        if (s !== "grass" && s !== "gazon" && s !== "foret") continue;
        if (ALEA(x, z) > (s === "foret" ? 0.9 : s === "grass" ? 0.6 : 0.42) || batimentA(x, z)) continue;
        if (this.ground.has(`${Math.floor(x / 64)},${Math.floor(z / 64)}`)) continue;
        const h = 6 + ALEA(x + 1, z) * 5;
        lot.put("foliage", x, NIVEAU + h * 0.72, z, 7, h * 0.95, 7, "boule", ALEA(x, z) * 6, 0.72 + ALEA(z, x) * 0.32);
        lot.put("wood", x, NIVEAU + h * 0.2, z, 0.5, h * 0.4, 0.5);
      }
    for (let x = sx * 256 + 6; x < (sx + 1) * 256; x += 16)
      for (let z = sz * 256 + 6; z < (sz + 1) * 256; z += 16) {
        if (
          !dansIle(x, z) ||
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
    const modeles = [];
    for (const b of this.farGroups.get(key) || []) {
      if (!this.world.buildingAllowed(b)) continue;
      if (this.nearSet.has(b.id)) continue;
      const x = (b.x0 + b.x1) / 2,
        z = (b.z0 + b.z1) / 2,
        w = b.x1 - b.x0,
        d = b.z1 - b.z0;
      if (b.volumes) {
        const mat = loinDe(b);
        for (const v of b.volumes) {
          lot.put(mat, v.x + v.w / 2, NIVEAU + (v.h + 1) / 2, v.z + v.d / 2,
            v.w, v.h + 1, v.d, "box", 0, b.teinte);
          lot.put("roof", v.x + v.w / 2, NIVEAU + v.h + .94, v.z + v.d / 2,
            v.w, .12, v.d);
        }
        continue;
      }
      // un immeuble d'après le paquet CCity : son lointain cuit (dix triangles)
      const forme = this.modeleDe(b);
      if (forme) {
        this.poserModele(lot, b, `${forme}-loin`);
        continue;
      }
      if (b.style === "terrain") continue;
      if (b.style === "maison") {
        this.maison(lot, b, true);
        continue;
      }
      if (b.style === "conteneurs") {
        this.conteneurs(lot, b);
        continue;
      }
      // un monument dessiné d'après son modèle : le socle procédural, puis la
      // silhouette lointaine du modèle — ni volumes, ni couronnement
      const photo = this.photoDe(b) && maillageNY(b.photo, "loin");
      if (photo) {
        photo.position.set(x, NIVEAU, z);
        modeles.push(photo);
      }
      const levels = photo ? [[1, 1, SOCLE_EMPIRE]] : niveaux(b);
      let y = 0;
      const teinte = varianteDe(b).teinte;
      for (const [k, kd, h] of levels) {
        lot.put(
          loinDe(b),
          x,
          NIVEAU + (h + y) / 2,
          z,
          w * k,
          h - y,
          d * kd,
          "box",
          0,
          teinte,
        );
        y = h;
      }
      lot.put(
        "roof",
        x,
        NIVEAU + (photo ? SOCLE_EMPIRE : b.h) + 0.15,
        z,
        w * levels.at(-1)[0],
        0.3,
        d * levels.at(-1)[1],
      );
      if (!photo) this.couronnement(lot, b);
    }
    if (
      key ===
      `${Math.floor(ILE_LIBERTE.x / 256)},${Math.floor(ILE_LIBERTE.z / 256)}`
    )
      this.liberteLointaine(lot, !this.statueVisible());
    const g = lot.finish();
    for (const m of modeles) g.add(m);
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
    if (b.osm) return this.facadeOsm(lot, b, x, z, nx, nz, h, premier);
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
      const empire = b.style === "empire",
        v = varianteDe(b);
      const window =
        Math.round(tangent - (nx ? b.z0 : b.x0)) % (empire ? 2 : v.rythme) === 1 &&
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
          ((t) => v.teinte.map((c) => c * t))(
            empire ? 1 : 0.89 + ALEA(b.seed, Math.floor(yy / 3)) * 0.16,
          ),
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
  facadeOsm(lot, b, x, z, nx, nz, h, premier) {
    const t = nx ? z - b.z0 : x - b.x0;
    const baie = ((t % b.travee) + b.travee) % b.travee;
    const verre = b.mat === "glass", loft = b.architecture === "loft";
    const teinte = b.teinte;
    const ex = x + .5 + nx * .49, ez = z + .5 + nz * .49;
    const piece = (mat, y, largeur, haut, profondeur, recul = 0, couleur = 1) =>
      lot.put(mat, ex + nx * recul, NIVEAU + y, ez + nz * recul,
        nx ? profondeur : largeur, haut, nz ? profondeur : largeur, "box", 0, couleur);
    for (let yy = premier; yy <= h; yy++) {
      if (!this.present(x, NIVEAU + yy, z)) continue;
      const etage = yy % 3;
      const boutique = b.enseigne && yy < 3 && baie !== 0;
      const fenetre = yy >= 4 && yy < h - 1 && etage !== 0 &&
        (verre || (baie >= 1 && baie < b.travee - (loft ? 0 : 1)) || (b.travee === 2 && baie === 1));
      if (PHOTO_NY && yy >= 4 && yy < h) {
        piece(loinDe(b), yy + .5, 1, 1, .94, -.45, teinte);
      } else if (fenetre || boutique) {
        const allume = !boutique && ALEA(b.seed + Math.floor(t / b.travee), Math.floor(yy / 3)) > .64;
        piece(allume ? "glassLit" : verre ? "glass" : "glassDark", yy + .5, .98, .98, .12, -.17);
        // Meneaux aux bords de la travée, pas une grille de carrés d'un mètre.
        if (verre || baie === 1)
          lot.put(loft ? "trim" : "metal", ex - (nz ? .46 : 0), NIVEAU + yy + .5,
            ez - (nx ? .46 : 0), nx ? .35 : .065, 1, nz ? .35 : .065);
        if (etage === 1 || boutique && yy === 0)
          piece(loft ? "trim" : "metal", yy + .04, 1.04, .1, .38, .02);
        if (etage === 2) piece(loft ? "trim" : "metal", yy + .96, 1.04, .1, .38, .02);
      } else {
        piece(b.mat, yy + .5, 1, 1, .94, -.45, teinte);
        // Les tours Art déco ont des nervures ; les lofts, des pilastres.
        if ((b.architecture === "artdeco" || loft) && baie === 0 && yy > 2)
          piece("trim", yy + .5, loft ? .18 : .12, 1, .18, .09, teinte);
      }
      if (yy === h || yy === 3 || (b.architecture === "loft" && yy % 3 === 0))
        piece("trim", yy + .92, 1.06, yy === h ? .24 : .12, .28, .07, teinte);
    }
  }
  detailsOsm(lot, b) {
    // Trouver les vrais pans de mur donnant au sud, y compris dans un retrait.
    // Pas d'auvent au-dessus du vide ni de panneau qui bouche une entrée.
    const face = [];
    for (let x = b.x0; x < b.x1; x++) {
      let z = b.z1 - 1;
      while (z >= b.z0 && sommet(b, x, z) < 6) z--;
      face.push(z);
    }
    for (let i = 0; i < face.length;) {
      let fin = i + 1;
      while (fin < face.length && face[fin] === face[i]) fin++;
      const largeur = fin - i, z = face[i], x = b.x0 + i + largeur / 2;
      if (largeur >= 4 && z >= b.z0 && b.enseigne && this.present(Math.floor(x), NIVEAU + 3, z)) {
        lot.sign(4 + b.seed % 4, x, NIVEAU + 3.55, z + 1.06, Math.min(largeur - .5, 7), .58);
        lot.put(b.seed % 2 ? "metal" : "brownstone", x, NIVEAU + 3.1, z + 1.3,
          largeur - .3, .12, .6);
      }
      // Un escalier de secours étroit à l'échelle des humains, accroché au mur.
      if (largeur >= 5 && ["tenement", "cour", "loft"].includes(b.architecture)) {
        const fx = b.x0 + i + 1.5;
        for (let y = 6; y < sommet(b, Math.floor(fx), z) - 2; y += 3) {
          if (!this.present(Math.floor(fx), NIVEAU + y, z)) continue;
          lot.put("metal", fx, NIVEAU + y, z + 1.45, 1.6, .08, .9);
          lot.put("metal", fx, NIVEAU + y + .9, z + 1.85, 1.6, .05, .05);
          for (const dx of [-.72, -.36, 0, .36, .72])
            lot.put("metal", fx + dx, NIVEAU + y + .45, z + 1.85, .035, .9, .035);
          for (let k = 0; k < 10; k++)
            lot.put("metal", fx - .6 + k * .12, NIVEAU + y - k * .3, z + 1.45, .4, .05, .55);
        }
      }
      i = fin;
    }
    // Équipements uniquement sur une terrasse suffisamment large et intacte.
    const toit = b.volumes.filter(v => v.w >= 3 && v.d >= 3)
      .sort((a, c) => c.h - a.h || c.w * c.d - a.w * a.d)[0];
    if (!toit) return;
    const x = toit.x + toit.w / 2, z = toit.z + toit.d / 2, y = NIVEAU + toit.h + 1;
    for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1])
      if (!this.present(x + dx, y - 1, z + dz)) return;
    lot.put("metal", x, y + .45, z, 1.8, .9, 1.5);
    for (let i = 0; i < 5; i++) lot.put("roof", x, y + .15 + i * .15, z + .76, 1.6, .03, .04);
    if (["loft", "tenement", "cour"].includes(b.architecture) && b.seed % 3 === 0 && toit.w >= 5 && toit.d >= 5) {
      for (const dx of [-.75, .75]) for (const dz of [-.75, .75])
        lot.put("metal", x + dx, y + .65, z + dz, .08, 1.3, .08);
      lot.put("wood", x, y + 2.1, z, 2.1, 2.1, 2.1, "cylinder");
      lot.put("metal", x, y + 3.35, z, 2.35, .45, 2.35, "cone");
    }
  }
  *buildBuilding(b) {
    const lot = new Lot(this),
      x = (b.x0 + b.x1) / 2,
      z = (b.z0 + b.z1) / 2,
      w = b.x1 - b.x0,
      d = b.z1 - b.z0;
    // LES QUARTIERS (v583) : le modèle du paquet, un pavillon, une pile de conteneurs
    const forme = this.modeleDe(b);
    if (forme || b.style === "terrain" || b.style === "maison" || b.style === "conteneurs") {
      if (forme) this.poserModele(lot, b, forme);
      else if (b.style === "maison") this.maison(lot, b, false);
      else if (b.style === "conteneurs") this.conteneurs(lot, b);
      yield;
      const g = lot.finish();
      g.name = b.name || `Immeuble ${b.id}`;
      g.userData.buildingId = b.id;
      g.userData.revision = this.world.buildingRevision.get(b.id) || 0;
      return g;
    }
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
    // Un monument dessiné d'après son modèle (v565) ne garde en procédural que
    // son socle, net à hauteur de rue ; le modèle se pose dessus.
    const photo = this.photoDe(b),
      plafond = photo ? SOCLE_EMPIRE : Infinity,
      sommetVu = (xx, zz) => Math.min(sommet(b, xx, zz), plafond);
    for (let zz = b.z0; zz < b.z1; zz++) {
      for (let xx = b.x0; xx < b.x1; xx++) {
        const h = sommetVu(xx, zz);
        if (!h) continue;
        for (const [nx, nz] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const adjacent = sommetVu(xx + nx, zz + nz);
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
    for (let yy = 3; yy < Math.min(b.h, plafond); yy += 3) {
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
    if (!b.osm && (b.style === "masonry" || b.style === "office")) {
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
    if (!b.osm && (b.mat === "brick" || b.mat === "brownstone"))
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
      k < (!b.osm && ["office", "masonry"].includes(b.style) ? 1 : 0);
      k++
    ) {
      const px = x + (k - 0.5) * 5;
      lot.put("metal", px, top + 0.65, z, 2.4, 1.3, 3.3);
      for (let j = 0; j < 7; j++)
        lot.put("roof", px, top + 0.5 + j * 0.11, z + 1.66, 2.2, 0.035, 0.04);
      lot.put("roof", px, top + 1.34, z, 1.2, 0.08, 1.2, "cylinder");
    }
    if (!b.osm && b.mat !== "glass" && b.style === "masonry" && b.seed % 3 === 0) {
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
    if (b.osm) this.detailsOsm(lot, b);
    if (!photo) this.couronnement(lot, b);
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
      !b.osm &&
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
    if (!b.osm && Math.abs(x - broadway(z)) < 18 && z > -120 && z < 32) {
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
    const modele = photo && maillageNY(b.photo, "proche");
    if (modele) {
      modele.position.set(x, NIVEAU, z);
      g.add(modele);
    }
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
    // La surface de chaque case, bord compris : on la relit pour les jupes.
    const N = 66,
      grille = new Array(N * N);
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const x = x0 - 1 + i,
          z = z0 - 1 + j;
        grille[j * N + i] =
          dansPlan(x, z) && this.world.groundAllowed(x, z) ? surface(x, z) : null;
      }
    const sol = (x, z) => grille[(z - z0 + 1) * N + x - x0 + 1];
    for (let z = z0; z < z0 + 64; z++) {
      let start = x0,
        last = null;
      for (let x = x0; x <= x0 + 64; x++) {
        let s = x < x0 + 64 ? sol(x, z) : null;
        if (s && this.world.edits.has(`${x},${SOL},${z}`)) s = null;
        if (s !== last) {
          if (last) {
            const y =
              last === "water"
                ? WATER_LEVEL + 0.86
                : (last === "beach" ? solDeBanlieue(start, z, SOL) + 1 : NIVEAU) +
                  (last === "sidewalk" ? 0.08 : 0.016);
            lot.put(MAT_SOL[last], (start + x) / 2, y, z + 0.5, x - start, 0.035, 1);
          }
          start = x;
          last = s;
        }
        // LES BERGES ONT UN MUR (v583). Le sol du plan est une dalle : au bord de
        // l'eau, on voyait dessous. Une jupe de pierre jusqu'à l'eau, pas à la plage.
        if (s && s !== "water" && s !== "beach" && x < x0 + 64) {
          const v = [sol(x - 1, z), sol(x + 1, z), sol(x, z - 1), sol(x, z + 1)];
          if (v.includes("water"))
            lot.put("trim", x + 0.5, NIVEAU - 1.2, z + 0.5, 1, 2.4, 1, "box", 0, 0.72);
        }
      }
    }
    for (let x = Math.ceil(x0 / AVENUE) * AVENUE; x < x0 + 64; x += AVENUE) {
      for (let z = z0; z < z0 + 64; z++) {
        if (!dansIle(x, z) || surface(x, z) !== "road") continue;
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
        if (!dansIle(x, z) || surface(x, z) !== "road" || surface(x + 5, z + 4) === "grass")
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
      }
    // les feux, aux quatre coins de chaque carrefour du plan (v496)
    for (const f of feuxSecteur(cx, cz))
      if (this.world.groundAllowed(f.x, f.z)) this.feu(lot, f);
    for (let x = x0 + 6; x < x0 + 64; x += 16)
      for (let z = z0 + 6; z < z0 + 64; z += 16) {
        if (!dansIle(x, z)) continue;
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
        if (!dansIle(x, z) || surface(x, z) !== "sidewalk" || batimentA(x, z)) continue;
        this.tree(lot, x, z, 7);
        this.bench(lot, x + 2, z + 4);
        this.noterObstacle(x, z + 5, 0.31);
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
        this.noterObstacle(x, z, 0.45, 1.0);          // la table et ses deux chaises
        this.noterObstacle(x + 2, z, 0.15);            // la borne
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
    this.solBanlieue(lot, x0, z0);
    return lot.finish();
  }
  // LE MOBILIER DES QUARTIERS (v583) : ce qui fait qu'une rue n'est pas une autre.
  solBanlieue(lot, x0, z0) {
    for (const q of ZONES) {
      if (x0 + 64 <= q.x0 || x0 >= q.x1 || z0 + 64 <= q.z0 || z0 >= q.z1) continue;
      const dedans = (x, z) => x >= q.x0 && x < q.x1 && z >= q.z0 && z < q.z1;
      if (q.genre !== "pavillons") {
        // la ligne jaune des avenues, la ligne blanche tiretée des rues
        for (let x = Math.ceil(x0 / q.ax) * q.ax; x < x0 + 64; x += q.ax)
          for (let z = z0; z < z0 + 64; z++) {
            if (!dedans(x, z) || surface(x, z) !== "road") continue;
            if (Math.abs(z - Math.round(z / q.az) * q.az) < q.rr + 2.5) continue;
            lot.put("yellow", x - 0.16, NIVEAU + 0.043, z + 0.5, 0.1, 0.02, 1);
            lot.put("yellow", x + 0.16, NIVEAU + 0.043, z + 0.5, 0.1, 0.02, 1);
          }
        for (let z = Math.ceil(z0 / q.az) * q.az; z < z0 + 64; z += q.az)
          for (let x = x0; x < x0 + 64; x++) {
            if (!dedans(x, z) || surface(x, z) !== "road" || x % 7 > 3) continue;
            if (Math.abs(x - Math.round(x / q.ax) * q.ax) < q.ra + 2.5) continue;
            lot.put("white", x + 0.5, NIVEAU + 0.043, z, 1, 0.02, 0.12);
          }
        // à chaque carrefour : les passages piétons et un réverbère
        for (let z = Math.ceil(z0 / q.az) * q.az; z < z0 + 64; z += q.az)
          for (let x = Math.ceil(x0 / q.ax) * q.ax; x < x0 + 64; x += q.ax) {
            if (!dedans(x, z) || surface(x, z) !== "road") continue;
            for (const side of [-1, 1])
              for (let j = -q.ra + 0.6; j < q.ra; j += 1)
                lot.put("white", x + j, NIVEAU + 0.048, z + side * (q.rr + 1), 0.5, 0.024, 1.6);
            for (const side of [-1, 1])
              for (let j = -q.rr + 0.6; j < q.rr; j += 1)
                lot.put("white", x + side * (q.ra + 1), NIVEAU + 0.05, z + j, 1.6, 0.022, 0.5);
            const lx = x + q.ra + 1,
              lz = z + q.rr + 1;
            if (surface(lx, lz) === "sidewalk" && !batimentA(lx, lz)) this.lamp(lot, lx, lz, 1);
          }
        // des arbres d'alignement, et jamais devant une porte de garage du port
        if (q.genre !== "port")
          for (let x = Math.ceil(x0 / q.ax) * q.ax; x < x0 + 64; x += q.ax)
            for (let z = Math.ceil(z0 / 17) * 17; z < z0 + 64; z += 17) {
              const tx = x + (ALEA(z, q.ax) < 0.5 ? q.ra + 1 : -q.ra - 1);
              if (!dedans(tx, z) || surface(tx, z) !== "sidewalk" || batimentA(tx, z) || ALEA(tx, z) < 0.42) continue;
              this.arbreLeger(lot, tx, z, 5.5 + ALEA(z, tx) * 3);
            }
      }
      // les arbres des jardins, des pelouses et des parcs
      for (let x = x0 + 5; x < x0 + 64; x += 13)
        for (let z = z0 + 5; z < z0 + 64; z += 13) {
          if (!dedans(x, z)) continue;
          const s = surface(x, z);
          if (s === "foret" || s === "grass") {
            if (ALEA(x, z) < (s === "foret" ? 0.82 : 0.5)) this.arbreLeger(lot, x, z, 6 + ALEA(x + 1, z) * 5);
          } else if (s === "gazon") {
            if (ALEA(x, z) < 0.3 && !batimentA(x, z) && !batimentA(x + 2, z) && !batimentA(x - 2, z) && !batimentA(x, z + 2) && !batimentA(x, z - 2))
              this.arbreLeger(lot, x, z, 5 + ALEA(x + 1, z) * 4);
          } else if (s === "beach" && ALEA(x, z) < 0.42) this.parasol(lot, x, z);
        }
      // les réverbères des rues courbes
      if (q.genre === "pavillons")
        for (let k = Math.floor(z0 / q.az) - 1; k * q.az < z0 + 80; k++)
          for (let x = Math.ceil(x0 / 37) * 37; x < x0 + 64; x += 37) {
            const z = zRue(q, k, x) + 3.6;
            if (z < z0 || z >= z0 + 64 || !dedans(x, z) || surface(x, z) !== "gazon" || batimentA(x, z)) continue;
            this.lamp(lot, x, z, 1);
          }
      // les barrières de la promenade de planches
      if (q.genre === "plage")
        for (let x = x0; x < x0 + 64; x += 3)
          for (let z = z0; z < z0 + 64; z++) {
            if (!dedans(x, z) || surface(x, z) !== "boardwalk" || surface(x, z + 1) !== "beach") continue;
            lot.put("wood", x, NIVEAU + 0.5, z + 0.5, 0.14, 1, 0.14);
            lot.put("wood", x + 1.5, NIVEAU + 0.98, z + 0.5, 3, 0.08, 0.08);
          }
    }
  }
  arbreLeger(lot, x, z, h) {
    this.noterObstacle(x, z, 0.25);
    lot.put("wood", x, NIVEAU + h * 0.36, z, 0.3, h * 0.72, 0.3, "cylinder");
    for (let k = 0; k < 3; k++) {
      const a = k * 2.4 + x,
        r = 0.4 + ALEA(x + k, z) * 0.8;
      lot.put(
        "foliage",
        x + Math.cos(a) * r,
        NIVEAU + h * 0.78 + k * 0.5,
        z + Math.sin(a) * r,
        4.4,
        3.6,
        4.4,
        "leaves",
        a,
        0.78 + ALEA(k + x, z) * 0.34,
      );
    }
  }
  parasol(lot, x, z) {
    const y = solDeBanlieue(x, z, SOL) + 1,
      c = [[1, 0.32, 0.26], [0.2, 0.55, 0.95], [1, 0.82, 0.2], [0.25, 0.75, 0.55], [1, 1, 1]][Math.floor(ALEA(z, x) * 5)];
    lot.put("metal", x, y + 1, z, 0.07, 2, 0.07, "cylinder");
    lot.put("white", x, y + 2.15, z, 2.6, 0.7, 2.6, "cone", 0, c);
    lot.put("white", x + 1.3, y + 0.03, z + 0.4, 0.9, 0.04, 1.9, "box", ALEA(x, z), c);
  }
  // UN PAVILLON (v583) : pas de modèle au paquet, c'est du dessin. Une teinte par
  // maison, un toit à deux pentes, et de près ses fenêtres, sa porte, son garage.
  maison(lot, b, loin) {
    const x = (b.x0 + b.x1) / 2,
      z = (b.z0 + b.z1) / 2,
      w = b.x1 - b.x0,
      d = b.z1 - b.z0,
      devant = b.cap === 0 ? 1 : -1,
      H = b.h + 1,
      faite = Math.min(w, d) * 0.42 + 0.6,
      teinte = b.teinte || 1;
    lot.put("white", x, NIVEAU + H / 2, z, w, H, d, "box", 0, teinte);
    // le faîte court le long de la plus grande dimension
    const long = w >= d,
      toit = b.toit === "wood" ? "tuile" : "ardoise";
    lot.put(toit, x, NIVEAU + H, z, long ? d + 1 : w + 1, faite, long ? w + 1 : d + 1, "prisme", long ? Math.PI / 2 : 0);
    if (loin) return;
    const face = z + (devant * d) / 2,
      ombre = Array.isArray(teinte) ? teinte.map((c) => c * 0.86) : 0.86;
    // le bardage : des lignes horizontales, une teinte plus sombre
    for (let y = 0.6; y < H; y += 0.8) {
      for (const fz of [b.z0 - 0.015, b.z1 + 0.015]) lot.put("white", x, NIVEAU + y, fz, w + 0.02, 0.05, 0.03, "box", 0, ombre);
      for (const fx of [b.x0 - 0.015, b.x1 + 0.015]) lot.put("white", fx, NIVEAU + y, z, 0.03, 0.05, d + 0.02, "box", 0, ombre);
    }
    // le soubassement de pierre
    lot.put("trim", x, NIVEAU + 0.28, z, w + 0.08, 0.56, d + 0.08, "box", 0, 0.86);
    // la porte sous son auvent, le perron
    const px = x - w * 0.18;
    lot.put("red", px, NIVEAU + 1.25, face + devant * 0.05, 1.2, 2.3, 0.1, "box", 0, b.seed % 2 ? 1 : [0.25, 0.45, 0.4]);
    lot.put("trim", px, NIVEAU + 2.55, face + devant * 0.05, 1.6, 0.24, 0.14);
    lot.put("wood", px, NIVEAU + 2.95, face + devant * 0.8, 2.6, 0.14, 1.7, "box", 0, 0.8);
    for (const e of [-1, 1]) lot.put("white", px + e * 1.1, NIVEAU + 1.5, face + devant * 1.45, 0.14, 2.9, 0.14);
    lot.put("trim", px, NIVEAU + 0.2, face + devant * 0.95, 2.8, 0.4, 1.9);
    this.noterObstacle(px, face + devant * 0.95, 1.4, 0.95);
    // les fenêtres et leurs volets (à l'étage partout, au rez sauf à la porte)
    const fenetre = (fx, fy, fz, nx, nz) => {
      const large = nz ? 1.3 : 0.08,
        prof = nz ? 0.08 : 1.3;
      lot.put("glassDark", fx, fy, fz, large, 1.45, prof);
      lot.put("white", fx, fy, fz + nz * 0.01 - nz * 0.03, nz ? 1.6 : 0.05, 1.75, nz ? 0.05 : 1.6, "box", 0, 1.05);
      for (const e of [-1, 1])
        lot.put(b.toit === "wood" ? "tuile" : "ardoise", fx + (nz ? e * 1.05 : nx * 0.04), fy, fz + (nx ? e * 1.05 : nz * 0.04), nz ? 0.42 : 0.05, 1.6, nz ? 0.05 : 0.42);
    };
    for (const nz of [-1, 1]) {
      const fz = (nz > 0 ? b.z1 : b.z0) + nz * 0.05;
      for (const yy of [1.6, 3.9])
        for (const fx of [-0.33, 0.02, 0.33]) {
          if (nz === devant && yy < 3 && fx < 0) continue;
          fenetre(x + fx * w, NIVEAU + yy, fz, 0, nz);
        }
    }
    for (const nx of [-1, 1]) {
      const fx = (nx > 0 ? b.x1 : b.x0) + nx * 0.05;
      for (const k of [-0.22, 0.22]) fenetre(fx, NIVEAU + 3.9, z + k * d, nx, 0);
    }
    // la cheminée, l'allée et le garage de jardin
    lot.put("brick", x + w * 0.28, NIVEAU + H + faite * 0.55, z + d * 0.18, 1, faite * 1.1, 1);
    lot.put("path", x + w * 0.22, NIVEAU + 0.03, face + devant * 3.5, 2.8, 0.03, 7);
    if (b.seed % 3 === 0) {
      lot.put("white", b.x1 + 2, NIVEAU + 1.3, z + (devant * d) / 5, 3.6, 2.6, 4.4, "box", 0, teinte);
      lot.put(toit, b.x1 + 2, NIVEAU + 2.6, z + (devant * d) / 5, 4.2, 1.1, 5, "prisme");
      lot.put("white", b.x1 + 2, NIVEAU + 1.1, z + (devant * d) / 5 + devant * 2.22, 2.8, 2, 0.05, "box", 0, 1.05);
      this.noterObstacle(b.x1 + 2, z + (devant * d) / 5, 1.8, 2.2);
    }
    // une haie basse, tout le long du jardin
    if (b.seed % 2)
      lot.put("foliage", b.x0 - 1.5, NIVEAU + 0.5, z, 0.8, 1, d + 4, "box", 0, 0.62);
  }
  // Une pile de conteneurs : trois couches de boîtes, chacune sa couleur.
  conteneurs(lot, b) {
    const x = (b.x0 + b.x1) / 2,
      z = (b.z0 + b.z1) / 2,
      w = b.x1 - b.x0,
      d = b.z1 - b.z0,
      C = [[0.72, 0.2, 0.16], [0.16, 0.36, 0.62], [0.2, 0.5, 0.36], [0.84, 0.58, 0.16], [0.78, 0.78, 0.78], [0.42, 0.2, 0.46]];
    for (let y = 0; y <= b.h; y += 3) {
      const c = C[(b.graine + y) % C.length];
      lot.put("white", x, NIVEAU + y + 1.45, z, w - 0.2, 2.9, d - 0.2, "box", 0, c);
      for (let k = -2; k <= 2; k++)
        lot.put("white", x + (k * (w - 0.2)) / 5, NIVEAU + y + 1.45, z + (d - 0.2) / 2 + 0.02, 0.2, 2.8, 0.04, "box", 0, c.map((v) => v * 0.7));
    }
  }
  // LES PONTS ET LES GRANDS DÉCORS (v583) : une fois pour toutes, jamais refaits.
  ouvrages() {
    const lot = new Lot(this);
    for (const p of PONTS) this.pont(lot, p);
    for (const d of DECORS) {
      if (d.type === "roue") this.roue(lot, d);
      else if (d.type === "montagnes") this.montagnes(lot, d);
      else if (d.type === "phare") this.phare(lot, d);
      else if (d.type === "globe") this.globe(lot, d);
      else if (d.type === "grue") this.grue(lot, d);
    }
    const g = lot.finish();
    g.name = "Ponts et décors de New York";
    return g;
  }
  // Un pont : la dalle sur l'eau (une jupe de béton, la chaussée est dans le plan),
  // deux tours et ses câbles. `l` court le long du pont, `t` en travers.
  pont(lot, p) {
    const long = p.b - p.a,
      m = (p.a + p.b) / 2,
      c = p.axe === "x" ? p.z : p.x,
      pose = (mat, l, y, t, sl, h, st, shape = "box", tint = 1, penche = 0) =>
        p.axe === "x"
          ? lot.put(mat, l, y, c + t, sl, h, st, shape, 0, tint, penche)
          : penche
            ? lot.put(mat, c + t, y, l, sl, h, st, shape, -Math.PI / 2, tint, penche)
            : lot.put(mat, c + t, y, l, st, h, sl, shape, 0, tint);
    pose("concrete", m, NIVEAU - 1.15, 0, long, 2.3, p.demi * 2, "box", 0.8);
    const granit = p.style === "granit",
      matiere = granit ? "limestone" : "steel",
      teinte = granit ? [0.55, 0.5, 0.42] : [0.9, 0.98, 1.05],
      HT = granit ? 24 : 34;
    // les garde-corps
    for (const s of [-1, 1]) pose("metal", m, NIVEAU + 1, s * (p.demi - 0.15), long, 0.1, 0.1);
    const tours = [p.a + long * 0.3, p.a + long * 0.7];
    for (const lt of tours) {
      // les deux piles, de l'eau au sommet, et leurs traverses
      for (const s of [-1, 1]) {
        pose(matiere, lt, WATER_LEVEL + 0.5 + (HT + NIVEAU - WATER_LEVEL) / 2, s * (p.demi + 0.9), 3, HT + NIVEAU - WATER_LEVEL, 1.8, "box", teinte);
        this.noterObstacle(p.axe === "x" ? lt : c + s * (p.demi + 0.9), p.axe === "x" ? c + s * (p.demi + 0.9) : lt, 1.5);
      }
      for (const y of granit ? [HT - 1, 11] : [HT - 1, HT * 0.66, HT * 0.33])
        pose(matiere, lt, NIVEAU + y, 0, granit ? 3 : 1.6, granit ? 3 : 1.2, p.demi * 2 + 3.6, "box", teinte);
    }
    // les câbles : la courbe porteuse, en segments, et ses suspentes
    const [t0, t1] = tours,
      portee = t1 - t0,
      fleche = HT - 9;
    const hauteur = (l) => {
      const u = (l - t0) / portee;
      if (u >= 0 && u <= 1) return HT - fleche * 4 * u * (1 - u);
      const e = u < 0 ? -u : u - 1;
      return Math.max(1.4, HT - e * portee * (HT / (long * 0.3)));
    };
    for (const s of [-1, 1])
      for (let l = p.a; l < p.b; l += 2.6) {
        const y = hauteur(l + 1.3),
          dy = hauteur(l + 2.6) - hauteur(l);
        pose("metal", l + 1.3, NIVEAU + y, s * (p.demi + 0.9), Math.hypot(2.6, dy) + 0.1, 0.16, 0.16, "box", 1, Math.atan2(dy, 2.6));
        pose("metal", l + 1.3, NIVEAU + y / 2, s * (p.demi + 0.9), 0.06, y, 0.06);
      }
  }
  // Une grande roue, fictive. Elle ne tourne pas : un seul lot, jamais refait.
  roue(lot, d) {
    const y0 = NIVEAU + d.r + 3,
      N = 16;
    for (const s of [-1, 1]) {
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * Math.PI * 2;
        lot.put("white", d.x + Math.cos(a) * d.r, y0 + Math.sin(a) * d.r, d.z + s * 1.2, 3, 0.34, 0.34, "box", 0, [0.95, 0.38, 0.3], a + Math.PI / 2);
      }
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2;
        lot.put("metal", d.x + (Math.cos(a) * d.r) / 2, y0 + (Math.sin(a) * d.r) / 2, d.z + s * 1.2, d.r, 0.14, 0.14, "box", 0, 1, a);
      }
      // les deux pieds en A
      for (const e of [-1, 1]) {
        const dx = e * 9,
          l = Math.hypot(dx, d.r + 3);
        lot.put("steel", d.x + dx / 2, NIVEAU + (d.r + 3) / 2, d.z + s * 2.2, l, 0.6, 0.6, "box", 0, 1, Math.atan2(d.r + 3, -dx));
        this.noterObstacle(d.x + dx, d.z + s * 2.2, 0.6);
      }
    }
    const C = [[1, 0.8, 0.2], [0.25, 0.6, 0.95], [0.95, 0.35, 0.3], [0.3, 0.8, 0.5]];
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      lot.put("white", d.x + Math.cos(a) * d.r, y0 + Math.sin(a) * d.r - 1.1, d.z, 1.9, 1.7, 1.9, "box", 0, C[k % 4]);
    }
    lot.put("steel", d.x, y0, d.z, 0.8, 0.8, 4.6);
  }
  montagnes(lot, d) {
    // une piste qui monte et descend sur ses poteaux de bois
    for (let k = 0; k < 90; k++) {
      const u = k / 90,
        x = d.x + u * 150 - 75,
        z = d.z + Math.sin(u * 9) * 8,
        h = 5 + 10 * Math.abs(Math.sin(u * 7.4)) + 5 * Math.sin(u * 3);
      lot.put("white", x, NIVEAU + h, z, 2, 0.26, 1.7, "box", 0, [0.9, 0.9, 0.86]);
      if (k % 2 === 0) lot.put("wood", x, NIVEAU + h / 2, z, 0.34, h, 0.34);
      if (k % 6 === 0) this.noterObstacle(x, z, 0.3);
    }
  }
  phare(lot, d) {
    this.noterObstacle(d.x, d.z, 2.6);
    for (let k = 0; k < 6; k++)
      lot.put("white", d.x, NIVEAU + 2.5 + k * 5, d.z, 5.4 - k * 0.42, 5, 5.4 - k * 0.42, "cylinder", 0, k % 2 ? [0.84, 0.2, 0.18] : [0.96, 0.95, 0.9]);
    lot.put("metal", d.x, NIVEAU + 30.3, d.z, 4.2, 0.4, 4.2, "cylinder");
    lot.put("glow", d.x, NIVEAU + 31.8, d.z, 2.2, 2.6, 2.2, "cylinder");
    lot.put("metal", d.x, NIVEAU + 34, d.z, 2.8, 1.8, 2.8, "cone");
  }
  // Un globe d'acier sur son pied : un dessin original, des méridiens et des
  // parallèles, comme une armillaire.
  globe(lot, d) {
    const y0 = NIVEAU + d.r + 5;
    this.noterObstacle(d.x, d.z, 2.4);
    lot.put("steel", d.x, NIVEAU + (d.r + 5) / 2 - d.r / 2, d.z, 2.2, 5 + d.r, 2.2, "cylinder");
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      for (let k = 0; k < 28; k++) {
        const t = (k / 28) * Math.PI * 2;
        lot.put("steel", d.x + Math.cos(a) * Math.cos(t) * d.r, y0 + Math.sin(t) * d.r, d.z + Math.sin(a) * Math.cos(t) * d.r, 3.3, 0.3, 0.3, "box", -a, 1, t + Math.PI / 2);
      }
    }
    for (let j = -2; j <= 2; j++) {
      const r = Math.cos((j / 3) * (Math.PI / 2)) * d.r,
        y = y0 + Math.sin((j / 3) * (Math.PI / 2)) * d.r;
      for (let k = 0; k < 24; k++) {
        const t = (k / 24) * Math.PI * 2;
        lot.put("steel", d.x + Math.cos(t) * r, y, d.z + Math.sin(t) * r, (r * 2 * Math.PI) / 24 + 0.2, 0.3, 0.3, "box", -t + Math.PI / 2);
      }
    }
  }
  // Une grue de quai : quatre pieds, une flèche au-dessus de l'eau.
  grue(lot, d) {
    const H = 34,
      C = [0.88, 0.32, 0.2];
    for (const dx of [-5, 5])
      for (const dz of [-6, 6]) {
        lot.put("white", d.x + dx, NIVEAU + H / 2, d.z + dz, 0.9, H, 0.9, "box", 0, C);
        this.noterObstacle(d.x + dx, d.z + dz, 0.7);
      }
    for (const y of [H * 0.4, H * 0.75, H]) lot.put("white", d.x, NIVEAU + y, d.z, 11, 0.9, 13, "box", 0, C);
    lot.put("white", d.x, NIVEAU + H + 1.2, d.z + 20, 2, 1.8, 62, "box", 0, C);
    lot.put("white", d.x, NIVEAU + H + 5, d.z, 1.2, 8, 1.2, "box", 0, C);
    lot.put("metal", d.x, NIVEAU + H - 5, d.z + 34, 0.12, 12, 0.12);
    lot.put("white", d.x, NIVEAU + H - 11, d.z + 34, 6, 0.6, 14, "box", 0, [0.2, 0.2, 0.22]);
  }
  // LA STATUE VUE DE LA BATTERY (v496). L'île est à deux cent cinquante blocs
  // du bout de Manhattan, au-delà de la portée des morceaux de monde : sans sa
  // silhouette, on ne la verrait que de tout près. Chaque pièce est un peu
  // PLUS PETITE que les blocs de `statueLiberte` (plan) : quand les morceaux
  // de l'île arrivent, la silhouette est dedans et ne se voit plus.
  liberteLointaine(lot, statue = true) {
    const I = ILE_LIBERTE,
      x = I.x + 0.5,
      z = I.z + 0.5,
      y = (dy) => NIVEAU + dy; // la rangée dy de la statue commence là
    lot.put(
      "grass",
      x,
      NIVEAU - 0.55,
      z,
      2 * I.b - 1.2,
      1,
      2 * I.a - 1.2,
      "cylinder",
      Math.atan2(I.ux, I.uz),
    );
    // le modèle de la statue a son propre niveau de détail (v565) : l'île
    // lointaine ne porte plus alors que sa pelouse
    if (!statue) return;
    lot.put("trim", x, y(1.45), z, 13.6, 2.8, 13.6, "cylinder");
    lot.put("limestone", x, y(5), z, 8.6, 3.8, 8.6);
    lot.put("limestone", x, y(13), z, 6.6, 11.8, 6.6);
    lot.put("limestone", x, y(19.5), z, 4.6, 0.8, 4.6);
    lot.put("copper", x, y(22.5), z, 5.4, 4.8, 5.4, "cylinder");
    lot.put("copper", x, y(29.5), z, 3.6, 8.8, 3.6, "cylinder");
    lot.put("copper", x, y(35.5), z, 2.6, 2.8, 2.6);
    lot.put("copper", x, y(35.5), z + 3, 0.6, 8.8, 0.6);
    lot.put("glow", x, y(41), z + 3, 0.7, 1.8, 0.7);
  }
  // Un feu de coin : un mât, le boîtier, trois optiques éteintes tournées
  // vers les voitures qui arrivent ; celle qui est allumée est un essaim à
  // part (`feuxAutour`).
  feu(lot, f) {
    this.noterObstacle(f.x, f.z, 0.2);
    const a = Math.atan2(f.fx, f.fz);
    lot.put("metal", f.x, NIVEAU + 1.9, f.z, 0.13, 3.8, 0.13, "cylinder");
    lot.put("yellow", f.x, NIVEAU + 3.33, f.z, 0.46, 1.36, 0.42, "box", a);
    for (let i = 0; i < 3; i++)
      lot.put(
        "roof",
        f.x + f.fx * 0.22,
        NIVEAU + 3.75 - i * 0.42,
        f.z + f.fz * 0.22,
        0.25,
        0.25,
        0.25,
        "sphere",
      );
  }
  lamp(lot, x, z, side) {
    this.noterObstacle(x, z, 0.2);
    lot.put("metal", x, NIVEAU + 3.5, z, 0.14, 7, 0.14, "cylinder");
    lot.put("metal", x - side * 1.2, NIVEAU + 6.9, z, 2.5, 0.14, 0.14);
    lot.put("metal", x - side * 2.3, NIVEAU + 6.8, z, 0.95, 0.18, 0.42);
    lot.put("glow", x - side * 2.3, NIVEAU + 6.69, z, 0.8, 0.04, 0.3);
    lot.put("metal", x, NIVEAU + 0.18, z, 0.35, 0.36, 0.35, "cylinder");
  }
  tree(lot, x, z, h) {
    this.noterObstacle(x, z, 0.25);
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
  noterObstacle(x, z, rx, rz = rx) {
    for (let a = Math.floor(x - rx); a <= Math.floor(x + rx); a++)
      for (let c = Math.floor(z - rz); c <= Math.floor(z + rz); c++)
        this.obstacles.add(`${a},${c}`);
  }
  obstacleA(wx, wz) {
    if (!this.obstacles.size) return false;
    return this.obstacles.has(
      `${Math.floor(wx - ORIGINE_MANHATTAN.x)},${Math.floor(wz - ORIGINE_MANHATTAN.z)}`,
    );
  }
  bench(lot, x, z) {
    this.noterObstacle(x, z, 1.05, 0.35);
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
    // l'île est hors du rectangle : sans elle, marcher sur sa pointe sud
    // ferait basculer l'éclairage de la ville à chaque pas (v496)
    const active =
      dansManhattan(actual.x, actual.z, 180) ||
      dansBanlieue(actual.x, actual.z, 500) ||
      dansBoiteLiberte(actual.x, actual.z, 60);
    this.root.visible = active;
    if (this.ownsLamps) this.lamps.forEach((l) => { l.visible = active; });
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
      this.renderer.shadowMap.enabled = active || this.earthLook.shadows;
      this.sunLight.castShadow = active || this.earthLook.castShadow;
      if (!active) this.sunLight.shadow.mapSize.set(this.earthLook.shadowSize, this.earthLook.shadowSize);
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
    this.majStatueNY();
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
    // Hors du plan, sur la campagne autour : le paysage lointain s'arrête bien avant
    // nos silhouettes, qui flotteraient sur le vide (vu du ciel, au nord). Le
    // brouillard les fond avec lui ; dans le plan, ce qui les entoure est à nous.
    const dansLaVille = dansManhattan(actual.x, actual.z, 60) || dansBanlieue(actual.x, actual.z, 60) || dansBoiteLiberte(actual.x, actual.z, 200);
    const horsVille = dansLaVille ? 1 : Math.min(1, 620 / budget.far);
    this.scene.fog.near = budget.far * 0.45 * horsVille;
    this.scene.fog.far = budget.far * horsVille;
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
    // Les deux monuments photographiés sont éclairés par projecteurs la nuit.
    for (const m of [this.mats.photoEmpire, this.mats.photoLiberte]) if (m) m.emissiveIntensity = night * 0.42;
    // les vitrines et les enseignes des quartiers, un peu aussi par temps clair
    if (this.mats.photoQuartiers) this.mats.photoQuartiers.emissiveIntensity = 0.1 + night * 1.5;
    for (const m of [
      this.mats.farBrick,
      this.mats.farBrownstone,
      this.mats.farLimestone,
      this.mats.farGlass,
      this.mats.farBrick2,
      this.mats.farBrick3,
      this.mats.farBrick4,
      this.mats.farLimestone2,
      this.mats.farLimestone3,
      this.mats.farGlass2,
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
        Math.min(this.budget.far, this.scene.fog.far) + 200;
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
    this.statueNY?.removeFromParent();
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
    if (this.ownsLamps) this.lamps.forEach((l) => l.removeFromParent());
    this.root.traverse((o) => {
      if (o.userData.ownedGeometry) o.geometry.dispose();
    });
    this.skyDome.geometry.dispose();
    this.skyDome.material.dispose();
    this.root.removeFromParent();
    this.world.onVisualEdit = null;
  }
}
