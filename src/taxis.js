// Berlines new-yorkaises originales : proportions de la Crown Victoria (5,38 m,
// empattement 2,91 m), carrosserie surfacique, arches, vitrage et habitacle.
// Interprétation géométrique, sans logo Ford ni modèle tiers. Licence MIT.
import * as THREE from "three";
import { mergeGeometries } from "../vendor/BufferGeometryUtils.js";
import { partager } from "./liberer.js";

export function construireTaxi({ taxi = true, couleur = 0x242b32 } = {}) {
  const g = new THREE.Group(),
    tas = new Map();
  const materials = {
    paint: new THREE.MeshPhysicalMaterial({
      color: taxi ? 0xf4ba16 : couleur,
      roughness: 0.28,
      metalness: 0.55,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      side: THREE.DoubleSide,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0xabb4b8,
      metalness: 0.88,
      roughness: 0.25,
    }),
    black: new THREE.MeshStandardMaterial({ color: 0x171b1e, roughness: 0.86 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x7cabbc,
      metalness: 0.25,
      roughness: 0.13,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
    light: new THREE.MeshStandardMaterial({
      color: 0xffedbd,
      emissive: 0xffd586,
      emissiveIntensity: 0.55,
      roughness: 0.3,
    }),
    red: new THREE.MeshStandardMaterial({
      color: 0x9c1918,
      emissive: 0xa81106,
      emissiveIntensity: 0.3,
      roughness: 0.3,
    }),
  };
  materials.paint.name = "Paint_NYC";
  materials.glass.name = "Glass_NYC";
  const pose = (
    mat,
    geo,
    p = [0, 0, 0],
    rot = [0, 0, 0],
    scale = [1, 1, 1],
    target = tas,
  ) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
    geo.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...p),
        q,
        new THREE.Vector3(...scale),
      ),
    );
    if (!target.has(mat)) target.set(mat, []);
    if (geo.index) {
      const non = geo.toNonIndexed();
      geo.dispose();
      geo = non;
    }
    target.get(mat).push(geo);
  };
  const box = (mat, x, y, z, w, h, d) =>
    pose(mat, new THREE.BoxGeometry(w, h, d), [x, y, z]);
  const panel = (mat, points) => {
    const geo = new THREE.BufferGeometry();
    const vs = [];
    for (let i = 1; i < points.length - 1; i++)
      vs.push(...points[0], ...points[i], ...points[i + 1]);
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3));
    geo.computeVertexNormals();
    geo.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        new Array((vs.length / 3) * 2).fill(0),
        2,
      ),
    );
    pose(mat, geo);
  };
  // Coque continue par sections. Capot long, coffre distinct et épaulement galbé.
  const sections = [
    [-2.61, 0.78, 0.63],
    [-2.5, 0.94, 0.77],
    [-1.65, 0.99, 0.91],
    [-0.95, 0.98, 0.96],
    [0.75, 0.98, 0.94],
    [1.7, 0.97, 0.83],
    [2.48, 0.92, 0.75],
    [2.66, 0.76, 0.6],
  ];
  for (let i = 0; i < sections.length - 1; i++) {
    const [z, w, y] = sections[i],
      [z2, w2, y2] = sections[i + 1];
    panel("paint", [
      [-w, y, z],
      [w, y, z],
      [w2, y2, z2],
      [-w2, y2, z2],
    ]);
    for (const side of [-1, 1])
      panel("paint", [
        [side * w, y, z],
        [side * w, 0.61, z],
        [side * w2, 0.61, z2],
        [side * w2, y2, z2],
      ]);
  }
  // Flancs avec deux passages de roue réellement évidés.
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(-2.5, 0.64);
    shape.lineTo(-2.5, 0.36);
    shape.lineTo(-1.88, 0.36);
    shape.absarc(-1.455, 0.38, 0.435, Math.PI, 0, true);
    shape.lineTo(1.02, 0.36);
    shape.absarc(1.455, 0.38, 0.435, Math.PI, 0, true);
    shape.lineTo(2.55, 0.36);
    shape.lineTo(2.55, 0.64);
    shape.closePath();
    pose(
      "paint",
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.025,
        bevelEnabled: false,
        curveSegments: 16,
      }),
      [side * 0.97, 0, 0],
      [0, (side * Math.PI) / 2, 0],
    );
    for (const z of [-1.455, 1.455])
      pose(
        "paint",
        new THREE.TorusGeometry(0.438, 0.027, 6, 32, Math.PI),
        [side * 0.982, 0.38, z],
        [0, Math.PI / 2, 0],
      );
    box("black", side * 0.988, 0.64, 0, 0.015, 0.065, 4.6);
    for (const z of [-0.72, 0.57])
      box("steel", side * 0.997, 0.91, z, 0.04, 0.042, 0.19);
    box("black", side * 0.991, 0.79, 0.02, 0.02, 0.32, 0.015);
  }
  // Pavillon abaissé aux extrémités, entourages fins et quatre portes vitrées.
  panel("paint", [
    [-0.78, 1.45, -0.65],
    [0.78, 1.45, -0.65],
    [0.76, 1.49, 0.45],
    [-0.76, 1.49, 0.45],
  ]);
  panel("glass", [
    [-0.86, 0.98, -1.12],
    [0.86, 0.98, -1.12],
    [0.78, 1.45, -0.65],
    [-0.78, 1.45, -0.65],
  ]);
  panel("glass", [
    [-0.76, 1.49, 0.45],
    [0.76, 1.49, 0.45],
    [0.9, 0.95, 1.29],
    [-0.9, 0.95, 1.29],
  ]);
  for (const side of [-1, 1]) {
    panel("glass", [
      [side * 0.91, 0.97, -1.05],
      [side * 0.79, 1.42, -0.62],
      [side * 0.79, 1.45, -0.04],
      [side * 0.94, 0.97, -0.04],
    ]);
    panel("glass", [
      [side * 0.94, 0.97, 0.045],
      [side * 0.79, 1.45, 0.045],
      [side * 0.78, 1.44, 0.44],
      [side * 0.91, 0.97, 1.2],
    ]);
    panel("black", [
      [side * 0.945, 0.95, -0.065],
      [side * 0.795, 1.465, -0.065],
      [side * 0.795, 1.465, 0.035],
      [side * 0.945, 0.95, 0.035],
    ]);
    for (const z of [-1.08, 1.25]) {
      const top = z < 0 ? -0.65 : 0.45;
      panel("paint", [
        [side * 0.93, 0.96, z - 0.035],
        [side * 0.78, 1.46, top - 0.035],
        [side * 0.78, 1.46, top + 0.04],
        [side * 0.93, 0.96, z + 0.04],
      ]);
    }
    box("steel", side * 0.956, 0.963, 0, 0.035, 0.028, 2.3);
    pose(
      "paint",
      new THREE.SphereGeometry(1, 16, 10),
      [side * 1.06, 1.02, -0.8],
      [0, 0, 0],
      [0.14, 0.09, 0.19],
    );
    box("black", side * 0.95, 0.98, -0.8, 0.2, 0.025, 0.07);
  }
  // Calandre à lamelles, phares rectangulaires arrondis, pare-chocs et feux arrière.
  box("black", 0, 0.65, -2.6, 1.42, 0.26, 0.075);
  for (let i = 0; i < 6; i++)
    box("steel", 0, 0.55 + i * 0.038, -2.645, 1.05, 0.014, 0.02);
  for (const side of [-1, 1]) {
    box("light", side * 0.685, 0.74, -2.53, 0.43, 0.19, 0.14);
    box("red", side * 0.73, 0.73, 2.5, 0.4, 0.2, 0.1);
  }
  box("paint", 0, 0.39, -2.5, 1.86, 0.16, 0.2);
  box("paint", 0, 0.4, 2.52, 1.85, 0.18, 0.16);
  box("steel", 0, 0.3, -2.57, 0.32, 0.13, 0.023);
  box("steel", 0, 0.39, 2.615, 0.33, 0.15, 0.018);
  // Banquettes, tableau de bord et volant visibles derrière le pare-brise.
  for (const x of [-0.43, 0.43])
    for (const z of [-0.22, 0.7]) {
      box("black", x, 0.56, z, 0.57, 0.12, 0.52);
      box("black", x, 0.83, z + 0.22, 0.57, 0.54, 0.13);
      box("black", x, 1.1, z + 0.22, 0.26, 0.18, 0.12);
    }
  box("black", 0, 0.86, -0.84, 1.62, 0.14, 0.32);
  const volant = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.021, 8, 24),
    materials.black,
  );
  volant.name = "Interior_SteeringWheel";
  volant.position.set(-0.43, 1, -0.61);
  volant.rotation.x = 0.6;
  g.add(volant);
  const wheelGroups = [];
  for (const [sx, front, name] of [
    [-1, -1, "FL"],
    [1, -1, "FR"],
    [-1, 1, "RL"],
    [1, 1, "RR"],
  ]) {
    const wheel = new THREE.Group();
    wheel.name = "Wheel_" + name;
    wheel.position.set(sx * 0.94, 0.355, front * 1.455);
    const tyre = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.085, 10, 32),
      materials.black,
    );
    tyre.rotation.y = Math.PI / 2;
    wheel.add(tyre);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.215, 0.215, 0.13, 24),
      materials.steel,
    );
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 10),
      materials.black,
    );
    cap.scale.set(0.22, 1, 1);
    cap.position.x = sx * 0.084;
    wheel.add(cap);
    g.add(wheel);
    wheelGroups.push(wheel);
  }
  if (taxi) {
    box("black", 0, 1.53, 0, 0.64, 0.08, 0.25);
    box("light", 0, 1.65, 0, 0.6, 0.18, 0.24);
    // Plaques et numéro de service originaux, aucune image externe.
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#f5bf20";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#15191a";
    ctx.font = "bold 98px Arial";
    ctx.fillText("NYC  T", 35, 113);
    ctx.font = "30px Arial";
    ctx.fillText("TAXI  •  METERED FARE", 40, 174);
    const tex = partager(new THREE.CanvasTexture(c));
    tex.colorSpace = THREE.SRGBColorSpace;
    const decal = partager(
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.45,
        side: THREE.DoubleSide,
      }),
    );
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.83, 0.4), decal);
      m.position.set(side * 1.006, 0.76, -0.25);
      m.rotation.y = (side * Math.PI) / 2;
      g.add(m);
    }
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(0.51, 0.16), decal);
    roof.position.set(0, 1.66, -0.125);
    roof.rotation.y = Math.PI;
    g.add(roof);
  }
  for (const [mat, geos] of tas) {
    const geo = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    const mesh = new THREE.Mesh(geo, materials[mat]);
    mesh.name = mat;
    g.add(mesh);
  }
  Object.values(materials).forEach(partager);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      partager(o.geometry);
    }
  });
  g.userData.rayonRoue = 0.355;
  g.userData.forme = "original";
  return g;
}
