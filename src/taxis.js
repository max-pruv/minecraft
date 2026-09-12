// Berline new-yorkaise originale, inspirée de la Crown Victoria : longueur
// 5,38 m, empattement 2,91 m, largeur 1,99 m. Surfaces galbées, passages de
// roue ouverts, vitrage courbe et habitacle. Géométrie et décors originaux MIT.
import * as THREE from "three";
import { mergeGeometries } from "../vendor/BufferGeometryUtils.js";
import { partager } from "./liberer.js";

export function construireTaxi({ taxi = true, couleur = 0x26313b } = {}) {
  const g = new THREE.Group(),
    tas = new Map();
  const mat = {
    paint: new THREE.MeshPhysicalMaterial({
      color: taxi ? 0xf3b817 : couleur,
      roughness: 0.28,
      metalness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      side: THREE.DoubleSide,
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xc6ced0,
      metalness: 0.92,
      roughness: 0.21,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x151719,
      roughness: 0.91,
    }),
    interior: new THREE.MeshStandardMaterial({
      color: 0x313039,
      roughness: 0.88,
      side: THREE.DoubleSide,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xa5bec6,
      metalness: 0.08,
      roughness: 0.08,
      transparent: true,
      opacity: 0.47,
      depthWrite: false,
      side: THREE.DoubleSide,
      clearcoat: 1,
    }),
    lens: new THREE.MeshPhysicalMaterial({
      color: 0xe2e4d4,
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
    light: new THREE.MeshStandardMaterial({
      color: 0xfff2d2,
      emissive: 0xffd38a,
      emissiveIntensity: 0.3,
      roughness: 0.24,
    }),
    red: new THREE.MeshPhysicalMaterial({
      color: 0xac211e,
      emissive: 0x580701,
      emissiveIntensity: 0.2,
      roughness: 0.18,
      clearcoat: 1,
    }),
    amber: new THREE.MeshPhysicalMaterial({
      color: 0xdb8f10,
      roughness: 0.23,
      clearcoat: 1,
    }),
  };
  mat.paint.name = "Paint_NYC";
  mat.glass.name = "Glass_NYC";
  const add = (
    geo,
    key,
    p = [0, 0, 0],
    r = [0, 0, 0],
    scale = [1, 1, 1],
    target = tas,
  ) => {
    geo.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...p),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
        new THREE.Vector3(...scale),
      ),
    );
    if (geo.index) {
      const non = geo.toNonIndexed();
      geo.dispose();
      geo = non;
    }
    if (!geo.attributes.uv)
      geo.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          new Array(geo.attributes.position.count * 2).fill(0),
          2,
        ),
      );
    if (!target.has(key)) target.set(key, []);
    target.get(key).push(geo);
  };
  // Arrondi géométrique : on projette les arêtes vers un noyau plus petit.
  function rounded(w, h, d, r = 0.03) {
    const geo = new THREE.BoxGeometry(w, h, d, 3, 3, 3),
      p = geo.attributes.position;
    r = Math.min(r, w / 2, h / 2, d / 2);
    const v = new THREE.Vector3(),
      c = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.set(
        Math.max(-w / 2 + r, Math.min(w / 2 - r, v.x)),
        Math.max(-h / 2 + r, Math.min(h / 2 - r, v.y)),
        Math.max(-d / 2 + r, Math.min(d / 2 - r, v.z)),
      );
      v.sub(c).normalize().multiplyScalar(r).add(c);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }
  const box = (key, p, size, r = 0.025, rot = [0, 0, 0]) =>
    add(rounded(...size, r), key, p, rot);
  function patch(key, nu, nv, point) {
    const p = [],
      uv = [],
      ix = [];
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        p.push(...point(i / nu, j / nv));
        uv.push(i / nu, j / nv);
      }
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i,
          b = a + nu + 1;
        ix.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    add(geo, key);
  }
  const tube = (key, points, r = 0.008, closed = false) =>
    add(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          points.map((p) => new THREE.Vector3(...p)),
          closed,
        ),
        Math.max(12, points.length * 5),
        r,
        6,
        closed,
      ),
      key,
    );
  const lerp = THREE.MathUtils.lerp;
  // Les profils changent continûment : coins de pare-chocs, ailes, ceinture.
  const sections = [
    [-2.67, 0.82, 0.855],
    [-2.6, 0.91, 0.88],
    [-2.36, 0.959, 0.91],
    [-1.8, 0.981, 0.91],
    [-1.2, 0.987, 0.975],
    [-0.5, 0.988, 0.975],
    [0.65, 0.99, 0.965],
    [1.4, 0.988, 0.92],
    [2.15, 0.97, 0.89],
    [2.54, 0.87, 0.77],
    [2.67, 0.73, 0.69],
  ];
  function profile(z) {
    let i = 0;
    while (i < sections.length - 2 && z > sections[i + 1][0]) i++;
    const a = sections[i],
      b = sections[i + 1];
    const t = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0])));
    const f = t * t * (3 - 2 * t);
    return [lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
  }
  const wheelZ = [-1.455, 1.455],
    wheelY = 0.355,
    archR = 0.427;
  function lower(z) {
    let y = 0.31;
    for (const wz of wheelZ) {
      const d = z - wz;
      if (Math.abs(d) < archR)
        y = Math.max(y, wheelY + Math.sqrt(archR * archR - d * d));
    }
    return y;
  }
  // Les deux flancs contournent les pneus au lieu de les traverser. Deux
  // bandes séparent le pli de ceinture du bas de caisse, sans coque creuse.
  for (const s of [-1, 1]) {
    patch("paint", 180, 8, (u, v) => {
      const z = lerp(-2.67, 2.67, u),
        [w, top] = profile(z),
        bot = lower(z),
        y = lerp(top, bot, v);
      return [s * (w - 0.025 * v + 0.018 * Math.sin(v * Math.PI)), y, z];
    });
    tube(
      "rubber",
      [
        [-2.46, 0.53],
        [-1.9, 0.55],
        [-0.8, 0.56],
        [0.8, 0.56],
        [1.9, 0.56],
        [2.43, 0.53],
      ].map(([z, y]) => [s * (profile(z)[0] + 0.006), y, z]),
      0.024,
    );
    // Seuil interrompu sous les passages de roue.
    box("paint", [s * 0.96, 0.315, 0], [0.055, 0.09, 1.96], 0.035);
    for (const wz of wheelZ) {
      const pts = [];
      for (let i = 0; i <= 32; i++) {
        const t = (Math.PI * i) / 32;
        const z = wz + archR * Math.cos(t);
        pts.push([s * (profile(z)[0] + 0.01), wheelY + archR * Math.sin(t), z]);
      }
      tube("paint", pts, 0.016);
    }
    for (const z of [-1.08, 0.18, 1.12]) {
      const yb = lower(z) + 0.025;
      tube(
        "rubber",
        [
          [s * 0.993, 0.947, z],
          [s * 1.003, 0.77, z],
          [s * 0.986, Math.max(0.4, yb), z],
        ],
        0.004,
      );
    }
    for (const z of [-0.48, 0.81]) {
      box("rubber", [s * 1.003, 0.86, z], [0.012, 0.048, 0.21], 0.008);
      box("chrome", [s * 1.019, 0.869, z], [0.036, 0.026, 0.17], 0.012);
    }
    // Rétroviseur, bras et verre orienté vers le conducteur.
    box("rubber", [s * 1.014, 1.01, -0.96], [0.14, 0.037, 0.12], 0.018);
    add(
      new THREE.SphereGeometry(1, 24, 14),
      "paint",
      [s * 1.035, 1.04, -0.915],
      [0, 0, 0],
      [0.065, 0.071, 0.144],
    );
    box("chrome", [s * 1.04, 1.044, -0.786], [0.115, 0.092, 0.009], 0.03);
  }
  // Capot et malle : traversées cintrées, joints fins et nervures du capot.
  for (const [z0, z1] of [
    [-2.67, -1.17],
    [1.26, 2.67],
  ]) {
    patch("paint", 24, 32, (u, v) => {
      const z = lerp(z0, z1, v),
        [w, y] = profile(z);
      const x = 2 * u - 1;
      return [x * w, y + 0.05 * (1 - x * x), z];
    });
  }
  for (const s of [-1, 1])
    tube(
      "rubber",
      [
        [s * 0.68, 0.81, -2.55],
        [s * 0.73, 0.927, -1.85],
        [s * 0.76, 0.99, -1.22],
      ],
      0.0035,
    );
  // Fond, passages de roue sombres, les sièges reposent dans un habitacle.
  box("rubber", [0, 0.31, 0], [1.78, 0.1, 4.78], 0.055);
  box("interior", [0, 0.49, 0.03], [1.73, 0.12, 2.54], 0.06);
  for (const s of [-1, 1])
    for (const z of wheelZ) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const a = (Math.PI * i) / 24;
        pts.push([
          s * 0.875,
          wheelY + 0.405 * Math.sin(a),
          z + 0.405 * Math.cos(a),
        ]);
      }
      tube("rubber", pts, 0.041);
    }
  // Pavillon et vitrages courbes. Les montants ont leur épaisseur propre.
  patch("paint", 20, 18, (u, v) => {
    const x = u * 2 - 1,
      z = lerp(-0.65, 0.63, v);
    return [
      x * (0.744 + 0.013 * Math.sin(v * Math.PI)),
      1.431 + 0.054 * (1 - x * x) + 0.018 * Math.sin(v * Math.PI),
      z,
    ];
  });
  const wind = (front) => {
    const zb = front ? -1.23 : 1.37,
      zt = front ? -0.65 : 0.63,
      yb = front ? 0.974 : 0.937;
    patch("glass", 20, 12, (u, v) => {
      const x = u * 2 - 1;
      return [
        x * lerp(0.854, 0.742, v),
        lerp(yb, 1.432, v) + 0.046 * (1 - x * x),
        lerp(zb, zt, v) +
          (front ? -0.045 : 0.045) * Math.sin(v * Math.PI) * (1 - x * x),
      ];
    });
    for (const s of [-1, 1])
      tube(
        "paint",
        [
          [s * 0.86, yb, zb],
          [s * 0.812, lerp(yb, 1.432, 0.5), lerp(zb, zt, 0.5)],
          [s * 0.747, 1.44, zt],
        ],
        0.032,
      );
    tube(
      "rubber",
      [
        [-0.85, yb, zb],
        [0, yb + 0.046, zb],
        [0.85, yb, zb],
      ],
      0.012,
    );
    tube(
      "rubber",
      [
        [-0.745, 1.434, zt],
        [0, 1.485, zt],
        [0.745, 1.434, zt],
      ],
      0.01,
    );
  };
  wind(true);
  wind(false);
  for (const s of [-1, 1]) {
    for (const [z0, z1, t0, t1] of [
      [-1.18, 0.04, -0.625, 0.04],
      [0.095, 1.29, 0.095, 0.605],
    ]) {
      patch("glass", 10, 8, (u, v) => {
        const z = lerp(lerp(z0, z1, u), lerp(t0, t1, u), v);
        return [
          s * lerp(0.958, 0.753, v),
          lerp(0.983, 1.432, v) + 0.012 * Math.sin(u * Math.PI),
          z,
        ];
      });
    }
    tube(
      "chrome",
      [
        [s * 0.962, 0.982, -1.2],
        [s * 0.976, 0.982, 0],
        [s * 0.963, 0.979, 1.29],
      ],
      0.012,
    );
    tube(
      "chrome",
      [
        [s * 0.754, 1.445, -0.65],
        [s * 0.759, 1.449, 0],
        [s * 0.754, 1.445, 0.63],
      ],
      0.01,
    );
    box("rubber", [s * 0.852, 1.197, 0.068], [0.045, 0.45, 0.067], 0.012, [
      0,
      0,
      s * 0.448,
    ]);
    // Panneau de porte intérieur, accoudoir et poignée.
    box("interior", [s * 0.911, 0.78, 0.02], [0.066, 0.32, 2.28], 0.04);
    box("interior", [s * 0.862, 0.75, -0.27], [0.075, 0.055, 0.63], 0.025);
  }
  for (const x of [-0.43, 0.43])
    for (const z of [-0.3, 0.69]) {
      box("interior", [x, 0.605, z], [0.63, 0.17, 0.59], 0.08);
      box(
        "interior",
        [x, 0.835, z + 0.22],
        [0.615, 0.53, 0.13],
        0.065,
        [-0.11, 0, 0],
      );
      box("interior", [x, 1.145, z + 0.25], [0.255, 0.19, 0.115], 0.05);
      for (const sx of [-0.23, 0.23])
        box("interior", [x + sx, 0.64, z], [0.065, 0.2, 0.51], 0.035);
    }
  box("interior", [0, 0.88, -0.975], [1.72, 0.19, 0.29], 0.07);
  box("interior", [0, 0.68, -0.36], [0.23, 0.24, 0.57], 0.035);
  const steering = new THREE.Group();
  steering.name = "Interior_SteeringWheel";
  steering.position.set(-0.43, 1.01, -0.715);
  steering.rotation.x = -0.36;
  steering.add(
    new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.018, 8, 32), mat.rubber),
  );
  const hub = new THREE.Mesh(rounded(0.095, 0.088, 0.042, 0.02), mat.interior);
  steering.add(hub);
  for (const r of [0, 2.1, -2.1]) {
    const spoke = new THREE.Mesh(
      rounded(0.025, 0.148, 0.028, 0.008),
      mat.chrome,
    );
    spoke.position.set(Math.sin(r) * 0.07, Math.cos(r) * 0.07, 0);
    spoke.rotation.z = -r;
    steering.add(spoke);
  }
  g.add(steering);
  // Essuie-glaces en bas du pare-brise et grille d'aération.
  for (const x of [-0.44, 0.32])
    tube(
      "rubber",
      [
        [x - 0.26, 1.015, -1.175],
        [x + 0.14, 1.025, -1.16],
      ],
      0.009,
    );
  for (let i = 0; i < 18; i++)
    box("rubber", [-0.7 + i * 0.08, 0.985, -1.19], [0.027, 0.005, 0.07], 0.002);
  // Face avant : pare-chocs galbé, grille creuse, reflecteurs et indicateurs.
  box("paint", [0, 0.43, -2.59], [1.76, 0.255, 0.19], 0.08);
  box("paint", [0, 0.44, 2.59], [1.77, 0.26, 0.19], 0.08);
  box("rubber", [0, 0.375, -2.69], [1.21, 0.11, 0.012], 0.035);
  box("paint", [0, 0.705, -2.634], [1.79, 0.29, 0.067], 0.046);
  box("rubber", [0, 0.723, -2.675], [0.825, 0.25, 0.065], 0.055);
  for (const y of [0.632, 0.666, 0.7, 0.734, 0.768, 0.802])
    box("chrome", [0, y, -2.716], [0.773, 0.012, 0.026], 0.006);
  for (const s of [-1, 1]) {
    box("chrome", [s * 0.41, 0.717, -2.715], [0.014, 0.21, 0.02], 0.006);
    box("chrome", [s * 0.661, 0.75, -2.667], [0.404, 0.194, 0.025], 0.035);
    box("lens", [s * 0.661, 0.75, -2.696], [0.414, 0.205, 0.042], 0.035, [
      0,
      s * 0.045,
      0,
    ]);
    for (const x of [0.565, 0.721]) {
      add(
        new THREE.SphereGeometry(1, 16, 10),
        "chrome",
        [s * x, 0.75, -2.687],
        [0, 0, 0],
        [0.062, 0.065, 0.021],
      );
      add(new THREE.SphereGeometry(0.022, 12, 8), "light", [
        s * x,
        0.75,
        -2.706,
      ]);
    }
    box("amber", [s * 0.879, 0.737, -2.419], [0.055, 0.157, 0.14], 0.022, [
      0,
      s * 0.25,
      0,
    ]);
    box("red", [s * 0.698, 0.738, 2.529], [0.4, 0.216, 0.088], 0.035, [
      0,
      -s * 0.22,
      0,
    ]);
    box("lens", [s * 0.628, 0.732, 2.579], [0.112, 0.064, 0.009], 0.012);
    tube(
      "chrome",
      [
        [s * 0.92, 0.558, -2.31],
        [s * 0.8, 0.558, -2.653],
        [s * 0.25, 0.558, -2.681],
      ],
      0.008,
    );
  }
  box("chrome", [0, 0.693, 2.624], [0.64, 0.022, 0.025], 0.006);
  box("rubber", [0, 0.595, 2.666], [0.33, 0.18, 0.012], 0.01);
  // Pneus à bande plate et épaules arrondies, jantes creuses, cinq ouvertures.
  const wheelGroups = [];
  for (const [sx, front, name] of [
    [-1, -1, "FL"],
    [1, -1, "FR"],
    [-1, 1, "RL"],
    [1, 1, "RR"],
  ]) {
    const wheel = new THREE.Group();
    wheel.name = "Wheel_" + name;
    wheel.position.set(sx * 0.921, wheelY, front * 1.455);
    const wt = new Map();
    const points = [
      [0.21, -0.105],
      [0.29, -0.12],
      [0.333, -0.101],
      [0.355, -0.063],
      [0.355, 0.063],
      [0.333, 0.101],
      [0.29, 0.12],
      [0.21, 0.105],
      [0.21, -0.105],
    ].map((v) => new THREE.Vector2(...v));
    add(
      new THREE.LatheGeometry(points, 40),
      "rubber",
      [0, 0, 0],
      [0, 0, Math.PI / 2],
      [1, 1, 1],
      wt,
    );
    add(
      new THREE.CylinderGeometry(0.226, 0.226, 0.164, 32),
      "chrome",
      [0, 0, 0],
      [0, 0, Math.PI / 2],
      [1, 1, 1],
      wt,
    );
    add(
      new THREE.CylinderGeometry(0.19, 0.19, 0.012, 32),
      "rubber",
      [sx * 0.105, 0, 0],
      [0, 0, Math.PI / 2],
      [1, 1, 1],
      wt,
    );
    add(
      new THREE.TorusGeometry(0.222, 0.012, 8, 32),
      "chrome",
      [sx * 0.118, 0, 0],
      [0, Math.PI / 2, 0],
      [1, 1, 1],
      wt,
    );
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      add(
        rounded(0.038, 0.158, 0.035, 0.01),
        "chrome",
        [sx * 0.12, Math.sin(a) * 0.113, Math.cos(a) * 0.113],
        [a - Math.PI / 2, 0, 0],
        [1, 1, 1],
        wt,
      );
    }
    add(
      new THREE.CylinderGeometry(0.072, 0.072, 0.025, 24),
      "chrome",
      [sx * 0.127, 0, 0],
      [0, 0, Math.PI / 2],
      [1, 1, 1],
      wt,
    );
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5;
      add(
        new THREE.SphereGeometry(0.012, 8, 6),
        "rubber",
        [sx * 0.144, Math.sin(a) * 0.05, Math.cos(a) * 0.05],
        [0, 0, 0],
        [0.35, 1, 1],
        wt,
      );
    }
    for (const x of [-0.045, 0, 0.045])
      add(
        new THREE.TorusGeometry(0.353, 0.0035, 4, 40),
        "interior",
        [x, 0, 0],
        [0, Math.PI / 2, 0],
        [1, 1, 1],
        wt,
      );
    for (const [key, geos] of wt) {
      const geo = mergeGeometries(geos, false);
      geos.forEach((x) => x.dispose());
      wheel.add(new THREE.Mesh(geo, mat[key]));
    }
    g.add(wheel);
    wheelGroups.push(wheel);
  }
  // Sérigraphies originales : lettrage net, pavillon lumineux, vraies plaques.
  function label(draw, w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"));
    const t = partager(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return partager(
      new THREE.MeshStandardMaterial({
        map: t,
        roughness: 0.48,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
  }
  if (taxi) {
    box("rubber", [0, 1.502, 0.02], [0.62, 0.061, 0.24], 0.025);
    box("light", [0, 1.606, 0.02], [0.59, 0.176, 0.232], 0.035);
    const roofMat = label(
      (c) => {
        c.fillStyle = "#fff2c1";
        c.fillRect(0, 0, 512, 160);
        c.fillStyle = "#151918";
        c.font = "bold 100px Arial";
        c.textAlign = "center";
        c.fillText("TAXI", 256, 118);
      },
      512,
      160,
    );
    for (const s of [-1, 1]) {
      const roof = new THREE.Mesh(
        new THREE.PlaneGeometry(0.52, 0.142),
        roofMat,
      );
      roof.position.set(0, 1.609, 0.02 + s * 0.118);
      roof.rotation.y = s < 0 ? Math.PI : 0;
      g.add(roof);
    }
    const decal = label(
      (c) => {
        c.clearRect(0, 0, 1024, 320);
        c.fillStyle = "#111715";
        c.font = "bold 170px Arial";
        c.fillText("NYC", 28, 181);
        c.beginPath();
        c.arc(513, 131, 91, 0, 2 * Math.PI);
        c.fill();
        c.fillStyle = "#efb923";
        c.font = "bold 138px Arial";
        c.fillText("T", 470, 180);
        c.fillStyle = "#121714";
        c.font = "bold 40px Arial";
        c.fillText("METERED FARE", 24, 263);
        c.font = "35px Arial";
        c.fillText("4K28", 728, 152);
      },
      1024,
      320,
    );
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.278), decal);
      d.position.set(s * 1.006, 0.749, -0.45);
      d.rotation.y = (s * Math.PI) / 2;
      g.add(d);
    }
  }
  const plate = label(
    (c) => {
      c.fillStyle = "#e8ab30";
      c.fillRect(0, 0, 400, 170);
      c.fillStyle = "#172432";
      c.font = "bold 28px Arial";
      c.textAlign = "center";
      c.fillText("NEW YORK", 200, 38);
      c.font = "bold 65px Arial";
      c.fillText(taxi ? "4K28" : "NY 241", 200, 121);
    },
    400,
    170,
  );
  for (const z of [-2.699, 2.678]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.306, 0.131), plate);
    p.position.set(0, z < 0 ? 0.44 : 0.585, z);
    p.rotation.y = z < 0 ? Math.PI : 0;
    g.add(p);
  }
  for (const [key, geos] of tas) {
    const geo = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    const m = new THREE.Mesh(geo, mat[key]);
    m.name = key;
    g.add(m);
  }
  Object.values(mat).forEach(partager);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = !o.material.transparent;
      o.receiveShadow = true;
      partager(o.geometry);
    }
  });
  g.userData.rayonRoue = wheelY;
  g.userData.forme = "berline-galbee-v241";
  return g;
}
