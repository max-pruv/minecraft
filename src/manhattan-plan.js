// Manhattan dans la Terre : coordonnées locales autour de New York.
// Le plan d’auteur est ramené à 40 % au sol ; les hauteurs restent jouables.
// Plan interprété et comprimé ; 1 unité de rue correspond à environ un mètre
// jouable. Les tours emblématiques restent sous le plafond de construction.
// Géométrie et matériaux originaux, aucun asset de GTA.
import { BLOCK, CITY_BLOCK } from "./blocks.js";

export const MANHATTAN_ID = "manhattan-v1"; // lecture des sauvegardes v239 uniquement
export const ECHELLE_PLAN = 0.4;
const K = ECHELLE_PLAN;
export const SOL = 32;
const AVENUE_AUTEUR = 100;
export const AVENUE = AVENUE_AUTEUR * K;
const RUE_AUTEUR = 48;
export const RUE = RUE_AUTEUR * K;
export const RUE_14 = 1056 * K;
// Le plan de 1811 s'arrête à la 14e Rue. Plus au sud, les quartiers
// gardent leurs trames tournées et leurs raccords transversaux.
const TRAMES_AUTEUR = [
  {
    name: "Greenwich Village",
    z0: 1056,
    z1: 1416,
    x0: -600,
    x1: 600,
    cz: 1248,
    angle: -0.55,
  },
  {
    name: "SoHo",
    z0: 1416,
    z1: 1680,
    x0: -600,
    x1: 600,
    cz: 1536,
    angle: 0.16,
  },
  {
    name: "TriBeCa",
    z0: 1680,
    z1: 1980,
    x0: -600,
    x1: -80,
    cz: 1824,
    angle: 0.16,
  },
  {
    name: "Chinatown",
    z0: 1680,
    z1: 1980,
    x0: -80,
    x1: 600,
    cz: 1824,
    angle: -0.4,
  },
  {
    name: "Financial District",
    z0: 1980,
    z1: 2310,
    x0: -600,
    x1: 600,
    cz: 2112,
    angle: 0.34,
  },
];
const trameAuteur = (x, z) =>
  TRAMES_AUTEUR.find((t) => z >= t.z0 && z < t.z1 && x >= t.x0 && x < t.x1);
function tournerAuteur(x, z, t, inverse = false) {
  const c = Math.cos(t.angle),
    s = Math.sin(t.angle) * (inverse ? -1 : 1);
  return [x * c + (z - t.cz) * s, -x * s + (z - t.cz) * c + t.cz];
}
export const BORNES = { x0: -240, x1: 240, z0: -1300, z1: 1000 };
export const DEPART = { x: 11.5 * K, y: SOL + 1.01, z: 18.5 * K, yaw: 0.22 };
const PARC_AUTEUR = { x0: -300, x1: 0, z0: -2040, z1: -816 };
export const ALEA = (a, b = 0) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ 90210;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const dedans = (x, z, b, marge = 0) =>
  x >= b.x0 - marge &&
  x < b.x1 + marge &&
  z >= b.z0 - marge &&
  z < b.z1 + marge;
export const PARC = Object.fromEntries(
  Object.entries(PARC_AUTEUR).map(([k, v]) => [k, v * K]),
);
const dansParcAuteur = (x, z) => dedans(x, z, PARC_AUTEUR);
export const dansParc = (x, z) => dansParcAuteur(x / K, z / K);
function largeurIleAuteur(z) {
  if (z < -3200 || z > 2440) return 0;
  if (z > 1500) return Math.max(15, (470 * (2440 - z)) / 940);
  if (z < -2200) return (420 * (z + 3200)) / 1000;
  return 450 + Math.sin(z * 0.0016) * 32;
}
const terreAuteur = (x, z) =>
  Math.abs(x - (z < -2200 ? 65 : 0)) < largeurIleAuteur(z);
function broadwayAuteur(z) {
  if (z > 1050) return -55 - (z - 1050) * 0.16;
  if (z > -500) return -190 + (z + 80) * 0.095;
  return -230 - Math.min(80, (-500 - z) * 0.04);
}
export const distanceAvenue = (x) =>
  Math.abs(x - Math.round(x / AVENUE) * AVENUE);
export const distanceRue = (z) => Math.abs(z - Math.round(z / RUE) * RUE);
function surfaceAuteur(x, z) {
  if (!terreAuteur(x, z)) return "water";
  if (dansParcAuteur(x, z)) {
    const lac = ((x + 115) / 72) ** 2 + ((z + 1460) / 185) ** 2 < 1;
    if (lac) return "water";
    if (
      Math.abs(x + 160 + Math.sin(z * 0.006) * 40) < 3 ||
      Math.abs(z + 990) < 4 ||
      Math.abs(x + 20) < 3 ||
      Math.abs(x + 280) < 3
    )
      return "path";
    return "grass";
  }
  if (z > 2310 || Math.abs(x) > largeurIleAuteur(z) - 16) return "path";
  if (x > -260 && x < -238 && z > -400 && z < 160) return "road";
  // Broadway piéton de la 42e à la 47e : le cœur de Times Square.
  if (x > -238 && x < -158 && z > -290 && z < 78) return "plaza";
  const t = trameAuteur(x, z);
  const [u, v] = t ? tournerAuteur(x, z, t) : [x, z];
  const raccord =
    z >= 1050 && [1056, 1416, 1680, 1980].some((l) => Math.abs(z - l) < 6);
  const a = Math.abs(u - Math.round(u / AVENUE_AUTEUR) * AVENUE_AUTEUR),
    r = Math.abs(v - Math.round(v / RUE_AUTEUR) * RUE_AUTEUR),
    b = Math.abs(x - broadwayAuteur(z));
  if (raccord || a < 10 || r < 6 || b < 9) return "road";
  if (a < 15 || r < 10 || b < 14) return "sidewalk";
  return "lot";
}
export const largeurIle = (z) => largeurIleAuteur(z / K) * K;
export const terre = (x, z) => terreAuteur(x / K, z / K);
export const broadway = (z) => broadwayAuteur(z / K) * K;
export const surface = (x, z) => surfaceAuteur(x / K, z / K);
export const solBloc = (x, z) =>
  ({
    water: BLOCK.WATER,
    road: CITY_BLOCK.ASPHALT,
    sidewalk: CITY_BLOCK.SIDEWALK,
    path: CITY_BLOCK.GRANITE,
    plaza: CITY_BLOCK.GRANITE,
    grass: BLOCK.GRASS,
    lot: CITY_BLOCK.SIDEWALK,
  })[surface(x, z)];
export const QUARTIERS = [
  { name: "Midtown · Fifth Avenue", x: 15, z: 18, r: 80 },
  { name: "Times Square", x: -179, z: -72, r: 75 },
  { name: "Central Park", x: -160, z: -986, r: 200 },
  { name: "Upper West Side", x: -315, z: -1370, r: 110 },
  { name: "Upper East Side", x: 115, z: -1370, r: 110 },
  { name: "Harlem", x: 15, z: -2250, r: 160 },
  { name: "Washington Heights", x: 15, z: -3030, r: 180 },
  { name: "Chelsea", x: -315, z: 600, r: 130 },
  { name: "Greenwich Village", x: -115, z: 1200, r: 130 },
  { name: "Washington Square", x: -115, z: 1350, r: 55 },
  { name: "SoHo", x: -115, z: 1536, r: 130 },
  { name: "TriBeCa", x: -205, z: 1800, r: 100 },
  { name: "Chinatown", x: 115, z: 1730, r: 100 },
  { name: "Wall Street", x: 15, z: 2200, r: 70 },
  { name: "Financial District", x: 15, z: 2110, r: 120 },
  { name: "Battery Park", x: 0, z: 2360, r: 80 },
].map((q) => ({ ...q, x: q.x * K, z: q.z * K, r: q.r * K }));
// Les adresses visées par la carte sont dans l'espace public, devant l'entrée.
export const MONUMENTS = [
  {
    name: "Duffy Square · marches rouges",
    x0: -229,
    x1: -179,
    z0: -267,
    z1: -211,
    h: 3,
    style: "steps",
    mat: "red",
    x: -210,
    z: -199,
  },
  {
    name: "One Times Square",
    x0: -182,
    x1: -144,
    z0: -33,
    z1: 35,
    h: 62,
    style: "times",
    mat: "limestone",
    x: -207,
    z: -32,
  },
  {
    name: "Empire State Building",
    x0: -82,
    x1: -18,
    z0: 350,
    z1: 421,
    h: 108,
    style: "empire",
    mat: "limestone",
    x: -11,
    z: 382,
  },
  {
    name: "Chrysler Building",
    x0: 216,
    x1: 263,
    z0: -40,
    z1: -10,
    h: 91,
    style: "chrysler",
    mat: "limestone",
    x: 207,
    z: -20,
  },
  {
    name: "Grand Central Terminal",
    x0: 116,
    x1: 184,
    z0: -38,
    z1: 38,
    h: 23,
    style: "terminal",
    mat: "limestone",
    x: 108,
    z: 18,
  },
  {
    name: "Rockefeller Center",
    x0: -83,
    x1: -17,
    z0: -376,
    z1: -298,
    h: 84,
    style: "rockefeller",
    mat: "limestone",
    x: -10,
    z: -320,
  },
  {
    name: "Flatiron Building",
    x0: -86,
    x1: -19,
    z0: 875,
    z1: 952,
    h: 41,
    style: "flatiron",
    mat: "limestone",
    x: -12,
    z: 924,
  },
  {
    name: "One World Trade Center",
    x0: -142,
    x1: -98,
    z0: 2010,
    z1: 2054,
    h: 112,
    style: "oneworld",
    mat: "glass",
    x: -88,
    z: 2040,
  },
  {
    name: "Trinity Church",
    x0: -35,
    x1: -15,
    z0: 2155,
    z1: 2190,
    h: 23,
    style: "church",
    mat: "brownstone",
    x: -6,
    z: 2170,
  },
];
const cadres = new Map();
const tous = [];
function enregistrer(b) {
  for (const key of ["x0", "x1", "z0", "z1", "x", "z"])
    if (b[key] !== undefined)
      b[key] = ["x0", "x1", "z0", "z1"].includes(key)
        ? Math.round(b[key] * K)
        : b[key] * K;
  b.id = tous.length;
  b.seed = Math.floor(ALEA(b.x0, b.z0) * 100000);
  tous.push(b);
  for (let cz = Math.floor(b.z0 / 64); cz <= Math.floor(b.z1 / 64); cz++)
    for (let cx = Math.floor(b.x0 / 64); cx <= Math.floor(b.x1 / 64); cx++) {
      const key = `${cx},${cz}`;
      if (!cadres.has(key)) cadres.set(key, []);
      cadres.get(key).push(b);
    }
}
export function emprise(b, x, z) {
  if (!dedans(x, z, b)) return false;
  // La pointe du Flatiron est réellement triangulaire, aussi pour les collisions.
  return (
    b.style !== "flatiron" ||
    x >= b.x1 - (b.x1 - b.x0) * ((z - b.z0) / (b.z1 - b.z0))
  );
}
// Retraits partagés entre collision et les deux niveaux de rendu. Chaque
// étage garde une largeur et une profondeur : l'Empire n'est pas une pyramide.
export function niveaux(b) {
  if (b.style === "empire")
    return [
      [1, 1, 5],
      [0.9, 0.88, 9],
      [0.8, 0.75, 14],
      [0.67, 0.62, 18],
      [0.52, 0.48, 88],
      [0.48, 0.44, 91],
      [0.34, 0.32, 99],
      [0.3, 0.28, 101],
      [0.11, 0.11, 106],
      [0.08, 0.08, 108],
    ];
  if (b.style === "chrysler")
    return [
      [1, 1, 13],
      [0.86, 0.86, 30],
      [0.7, 0.7, 64],
      [0.56, 0.56, 72],
      [0.43, 0.43, 80],
      [0.29, 0.29, 87],
      [0.14, 0.14, 91],
    ];
  if (b.style === "rockefeller")
    return [
      [1, 1, 12],
      [0.82, 0.85, 21],
      [0.42, 0.78, 79],
      [0.38, 0.68, 84],
    ];
  return [[1, 1, b.h]];
}
export function sommet(b, x, z) {
  if (!emprise(b, x, z)) return 0;
  if (b.style === "steps")
    return Math.max(1, Math.ceil(((b.z1 - z) / (b.z1 - b.z0)) * 3));
  const nx = Math.abs((x + 0.5 - (b.x0 + b.x1) / 2) / (b.x1 - b.x0)),
    nz = Math.abs((z + 0.5 - (b.z0 + b.z1) / 2) / (b.z1 - b.z0));
  let h = 0;
  for (const [w, d, top] of niveaux(b)) if (nx <= w / 2 && nz <= d / 2) h = top;
  return h;
}
for (const m of MONUMENTS) enregistrer(m);
for (let sz = -71; sz < 48; sz++)
  for (let ax = -5; ax < 5; ax++) {
    const rz0 = sz * RUE_AUTEUR + 11,
      rz1 = (sz + 1) * RUE_AUTEUR - 10;
    for (let part = 0; part < 3; part++) {
      let x0 = ax * AVENUE_AUTEUR + 16 + part * 23,
        x1 = x0 + 22,
        z0 = rz0,
        z1 = rz1;
      const t = trameAuteur((x0 + x1) / 2, (z0 + z1) / 2);
      if (t) {
        const [cx, cz] = tournerAuteur((x0 + x1) / 2, (z0 + z1) / 2, t, true);
        // Volumes orthogonaux inscrits dans les parcelles tournées. Chaque
        // colonne est ensuite sondée : aucun mur posé au travers d'une rue.
        x0 = cx - 9;
        x1 = cx + 9;
        z0 = cz - 10;
        z1 = cz + 10;
        let coupeRue = false;
        for (let z = Math.floor(z0 * K); z <= Math.ceil(z1 * K); z++)
          for (let x = Math.floor(x0 * K); x <= Math.ceil(x1 * K); x++)
            if (["road", "water", "plaza"].includes(surface(x + 0.5, z + 0.5)))
              coupeRue = true;
        if (coupeRue) continue;
      }
      const coins = [
        [x0, z0],
        [x1, z0],
        [x0, z1],
        [x1, z1],
      ];
      if (
        coins.some(
          ([x, z]) =>
            !terreAuteur(x, z) ||
            dansParcAuteur(x, z) ||
            ["plaza", "road"].includes(surfaceAuteur(x, z)) ||
            Math.abs(x - broadwayAuteur(z)) < 16,
        )
      )
        continue;
      if (
        MONUMENTS.some(
          (m) =>
            x1 * K >= m.x0 - 1 &&
            x0 * K <= m.x1 + 1 &&
            z1 * K >= m.z0 - 1 &&
            z0 * K <= m.z1 + 1,
        )
      )
        continue;
      const n = ALEA(x0, z0),
        midtown = z0 > -816 && z0 < 650,
        financial = z0 > 1920;
      const mat =
        midtown || financial
          ? n < 0.34
            ? "glass"
            : n < 0.67
              ? "limestone"
              : "brick"
          : n < 0.65
            ? "brick"
            : "brownstone";
      const hauteur = ALEA(x0 + 237, z0 - 91);
      const h =
        mat === "glass"
          ? 27 + Math.floor((hauteur ** 1.8 * 60) / 3) * 3
          : (midtown || financial ? 18 : 12) +
            Math.floor(hauteur * (midtown ? 9 : 5)) * 3;
      enregistrer({
        x0,
        x1,
        z0,
        z1,
        h,
        mat,
        style: mat === "glass" ? "office" : "masonry",
      });
    }
  }
export const BATIMENTS = tous;
export const batimentsSecteur = (x, z) =>
  cadres.get(`${Math.floor(x / 64)},${Math.floor(z / 64)}`) || [];
export const batimentA = (x, z) =>
  batimentsSecteur(x, z).find((b) => emprise(b, x, z));
export const LIEUX = [
  ...QUARTIERS,
  ...MONUMENTS.map((m) => ({ name: m.name, x: m.x, z: m.z, r: 30 })),
];
export const contexteManhattan = (ctx) =>
  String(ctx).startsWith(MANHATTAN_ID + ":") ? ctx : MANHATTAN_ID + ":" + ctx;
export function couleurPlan(x, z) {
  const b = batimentA(x, z);
  if (b)
    return b.mat === "glass"
      ? [93, 119, 131]
      : b.mat === "limestone"
        ? [172, 166, 150]
        : [129, 99, 83];
  return {
    water: [39, 74, 86],
    grass: [73, 108, 62],
    path: [162, 157, 136],
    plaza: [148, 146, 138],
    road: [55, 59, 64],
    sidewalk: [153, 151, 141],
    lot: [142, 139, 129],
  }[surface(x, z)];
}
// Circuits dans des files distinctes, avec retour par la rue voisine.
export function circuitsManhattan() {
  const traces = [
    {
      x: -110,
      z: -48,
      r: 125,
      pts: [
        { x: -100, y: 33, z: -153.6 },
        { x: -100, y: 33, z: 57.6 },
        { x: -120, y: 33, z: 57.6 },
        { x: -120, y: 33, z: -153.6 },
      ],
    },
  ];
  const ajouter = (pts) => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]),
        n = Math.ceil(l);
      for (let k = 0; k <= n; k++)
        for (const cote of [-1.1, 0, 1.1]) {
          const x = a[0] + ((b[0] - a[0]) * k) / n - ((b[1] - a[1]) * cote) / l;
          const z = a[1] + ((b[1] - a[1]) * k) / n + ((b[0] - a[0]) * cote) / l;
          if (surface(x, z) !== "road" || batimentA(x, z)) return;
        }
    }
    traces.push({
      x: pts.reduce((n, p) => n + p[0], 0) / pts.length,
      z: pts.reduce((n, p) => n + p[1], 0) / pts.length,
      pts: pts.map(([x, z]) => ({ x, y: SOL + 1, z })),
      rang: 1,
    });
  };
  const rectangle = (x, z) => [
    [x + 1.4, z + 0.95],
    [x + 1.4, z + RUE - 0.95],
    [x + AVENUE - 1.4, z + RUE - 0.95],
    [x + AVENUE - 1.4, z + 0.95],
  ];
  for (let z = -3072 * K; z < RUE_14 - RUE; z += RUE * 4)
    for (let x = -300 * K; x < 400 * K; x += AVENUE * 2)
      ajouter(rectangle(x, z));
  for (const t of TRAMES_AUTEUR) {
    for (
      let z = Math.ceil(t.z0 / RUE_AUTEUR) * RUE;
      z < t.z1 * K - RUE;
      z += RUE * 2
    )
      for (let x = -300 * K; x < 400 * K; x += AVENUE * 2) {
        const pts = rectangle(x, z).map(([a, b]) =>
          tournerAuteur(a / K, b / K, t, true).map((v) => v * K),
        );
        if (pts.every(([a, b]) => trameAuteur(a / K, b / K) === t))
          ajouter(pts);
      }
  }
  return traces;
}
