// Manhattan v1 : carte autonome, coordonnées figées dès sa publication.
// Plan interprété et comprimé ; 1 unité de rue correspond à environ un mètre
// jouable. Les tours emblématiques restent sous le plafond de construction.
// Géométrie et matériaux originaux, aucun asset de GTA.
import { BLOCK, CITY_BLOCK } from './blocks.js';

export const MANHATTAN_ID = 'manhattan-v1';
export const SOL = 32;
export const AVENUE = 100;
export const RUE = 48;
export const BORNES = { x0: -650, x1: 650, z0: -3600, z1: 2600 };
export const DEPART = { x: 11.5, y: SOL + 1.01, z: 18.5, yaw: 0.22 };
export const PARC = { x0: -300, x1: 0, z0: -2040, z1: -816 };
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
export const dansParc = (x, z) => dedans(x, z, PARC);
export function largeurIle(z) {
  if (z < -3450 || z > 2440) return 0;
  if (z > 1500) return Math.max(15, (470 * (2440 - z)) / 940);
  if (z < -2200) return 420 - (-2200 - z) * 0.17;
  return 450 + Math.sin(z * 0.0016) * 32;
}
export const terre = (x, z) =>
  Math.abs(x - (z < -2200 ? 65 : 0)) < largeurIle(z);
export function broadway(z) {
  if (z > 1050) return -55 - (z - 1050) * 0.16;
  if (z > -500) return -190 + (z + 80) * 0.095;
  return -230 - Math.min(80, (-500 - z) * 0.04);
}
export const distanceAvenue = (x) =>
  Math.abs(x - Math.round(x / AVENUE) * AVENUE);
export const distanceRue = (z) => Math.abs(z - Math.round(z / RUE) * RUE);
export function surface(x, z) {
  if (!terre(x, z)) return 'water';
  if (dansParc(x, z)) {
    const lac = ((x + 115) / 72) ** 2 + ((z + 1460) / 185) ** 2 < 1;
    if (lac) return 'water';
    if (
      Math.abs(x + 160 + Math.sin(z * 0.006) * 40) < 3 ||
      Math.abs(z + 990) < 4 ||
      Math.abs(x + 20) < 3 ||
      Math.abs(x + 280) < 3
    )
      return 'path';
    return 'grass';
  }
  if (z > 2310 || Math.abs(x) > largeurIle(z) - 16) return 'path';
  const a = distanceAvenue(x),
    r = distanceRue(z),
    b = Math.abs(x - broadway(z));
  if (a < 10 || r < 6 || b < 9) return 'road';
  if (a < 15 || r < 10 || b < 14) return 'sidewalk';
  return 'lot';
}
export const solBloc = (x, z) =>
  ({
    water: BLOCK.WATER,
    road: CITY_BLOCK.ASPHALT,
    sidewalk: CITY_BLOCK.SIDEWALK,
    path: CITY_BLOCK.GRANITE,
    grass: BLOCK.GRASS,
    lot: CITY_BLOCK.SIDEWALK,
  })[surface(x, z)];
export const QUARTIERS = [
  { name: 'Midtown · Fifth Avenue', x: 15, z: 18, r: 80 },
  { name: 'Times Square · Broadway', x: -179, z: -72, r: 75 },
  { name: 'Central Park · The Mall', x: -160, z: -986, r: 200 },
  { name: 'Upper West Side', x: -315, z: -1370, r: 110 },
  { name: 'Upper East Side', x: 115, z: -1370, r: 110 },
  { name: 'Harlem', x: 15, z: -2250, r: 160 },
  { name: 'Washington Heights', x: 15, z: -3030, r: 180 },
  { name: 'Chelsea', x: -315, z: 600, r: 130 },
  { name: 'Greenwich Village', x: -115, z: 1200, r: 130 },
  { name: 'SoHo', x: -115, z: 1536, r: 130 },
  { name: 'Chinatown', x: 115, z: 1730, r: 100 },
  { name: 'Financial District', x: 15, z: 2110, r: 120 },
  { name: 'Battery Park', x: 0, z: 2360, r: 80 },
];
// Les adresses visées par la carte sont dans l'espace public, devant l'entrée.
export const MONUMENTS = [
  {
    name: 'Empire State Building',
    x0: -82,
    x1: -18,
    z0: 350,
    z1: 421,
    h: 108,
    style: 'empire',
    mat: 'limestone',
    x: -11,
    z: 382,
  },
  {
    name: 'Chrysler Building',
    x0: 216,
    x1: 263,
    z0: -40,
    z1: -10,
    h: 91,
    style: 'chrysler',
    mat: 'limestone',
    x: 207,
    z: -20,
  },
  {
    name: 'Grand Central Terminal',
    x0: 116,
    x1: 184,
    z0: -38,
    z1: 38,
    h: 23,
    style: 'terminal',
    mat: 'limestone',
    x: 108,
    z: 18,
  },
  {
    name: 'Rockefeller Center',
    x0: -83,
    x1: -17,
    z0: -376,
    z1: -298,
    h: 84,
    style: 'rockefeller',
    mat: 'limestone',
    x: -10,
    z: -320,
  },
  {
    name: 'Flatiron Building',
    x0: -86,
    x1: -19,
    z0: 875,
    z1: 952,
    h: 41,
    style: 'flatiron',
    mat: 'limestone',
    x: -12,
    z: 924,
  },
  {
    name: 'One World Trade Center',
    x0: -142,
    x1: -98,
    z0: 2010,
    z1: 2054,
    h: 112,
    style: 'oneworld',
    mat: 'glass',
    x: -88,
    z: 2040,
  },
  {
    name: 'Trinity Church',
    x0: -35,
    x1: -15,
    z0: 2155,
    z1: 2190,
    h: 23,
    style: 'church',
    mat: 'brownstone',
    x: -6,
    z: 2170,
  },
];
const cadres = new Map();
const tous = [];
function enregistrer(b) {
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
    b.style !== 'flatiron' ||
    x >= b.x1 - (b.x1 - b.x0) * ((z - b.z0) / (b.z1 - b.z0))
  );
}
export function sommet(b, x, z) {
  if (!emprise(b, x, z)) return 0;
  const nx = Math.abs((x - (b.x0 + b.x1) / 2) / (b.x1 - b.x0)),
    nz = Math.abs((z - (b.z0 + b.z1) / 2) / (b.z1 - b.z0));
  const d = Math.max(nx, nz);
  if (b.style === 'empire')
    return d < 0.12 ? b.h : d < 0.24 ? 90 : d < 0.36 ? 66 : 28;
  if (b.style === 'rockefeller') return d < 0.29 ? b.h : 21;
  if (b.style === 'chrysler')
    return d < 0.18 ? b.h : d < 0.29 ? 77 : d < 0.4 ? 67 : 52;
  if (b.style === 'oneworld') return b.h;
  return b.h;
}
for (const m of MONUMENTS) enregistrer(m);
for (let sz = -71; sz < 48; sz++)
  for (let ax = -5; ax < 5; ax++) {
    const z0 = sz * RUE + 11,
      z1 = (sz + 1) * RUE - 10;
    for (let part = 0; part < 3; part++) {
      const x0 = ax * AVENUE + 16 + part * 23,
        x1 = x0 + 22;
      const coins = [
        [x0, z0],
        [x1, z0],
        [x0, z1],
        [x1, z1],
      ];
      if (
        coins.some(
          ([x, z]) =>
            !terre(x, z) || dansParc(x, z) || Math.abs(x - broadway(z)) < 16
        )
      )
        continue;
      if (
        MONUMENTS.some(
          (m) =>
            x1 >= m.x0 - 3 && x0 <= m.x1 + 3 && z1 >= m.z0 - 3 && z0 <= m.z1 + 3
        )
      )
        continue;
      const n = ALEA(x0, z0),
        midtown = z0 > -816 && z0 < 650,
        financial = z0 > 1920;
      const mat =
        midtown || financial
          ? n < 0.34
            ? 'glass'
            : n < 0.67
              ? 'limestone'
              : 'brick'
          : n < 0.65
            ? 'brick'
            : 'brownstone';
      const hauteur = ALEA(x0 + 237, z0 - 91);
      const h =
        mat === 'glass'
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
        style: mat === 'glass' ? 'office' : 'masonry',
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
  String(ctx).startsWith(MANHATTAN_ID + ':') ? ctx : MANHATTAN_ID + ':' + ctx;
export function couleurPlan(x, z) {
  const b = batimentA(x, z);
  if (b)
    return b.mat === 'glass'
      ? [93, 119, 131]
      : b.mat === 'limestone'
        ? [172, 166, 150]
        : [129, 99, 83];
  return {
    water: [39, 74, 86],
    grass: [73, 108, 62],
    path: [162, 157, 136],
    road: [55, 59, 64],
    sidewalk: [153, 151, 141],
    lot: [142, 139, 129],
  }[surface(x, z)];
}
// Circuits dans des files distinctes, avec retour par la rue voisine.
export function circuitsManhattan() {
  const traces = [];
  for (let z = -3264; z < 2200; z += RUE * 4)
    for (let x = -300; x < 400; x += AVENUE * 2) {
      const pts = [
        [x + 4, z + 2],
        [x + 4, z + RUE - 2],
        [x + AVENUE - 4, z + RUE - 2],
        [x + AVENUE - 4, z + 2],
      ];
      let libre = true;
      for (let i = 0; i < 4; i++) {
        const a = pts[i],
          b = pts[(i + 1) % 4];
        const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
        for (let k = 0; k <= n; k++)
          if (
            surface(
              a[0] + ((b[0] - a[0]) * k) / n,
              a[1] + ((b[1] - a[1]) * k) / n
            ) !== 'road' ||
            batimentA(
              a[0] + ((b[0] - a[0]) * k) / n,
              a[1] + ((b[1] - a[1]) * k) / n
            )
          ) {
            libre = false;
            break;
          }
      }
      if (libre)
        traces.push({
          x: x + 50,
          z: z + 24,
          pts: pts.map(([x, z]) => ({ x, y: SOL + 1, z })),
          rang: 1,
        });
    }
  return traces;
}
