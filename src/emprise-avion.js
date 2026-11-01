// L'EMPRISE AU SOL D'UN AVION, MESURÉE SUR SON MODÈLE (v577).
//
// Deux dettes, une seule chose vue de deux côtés : un appareil qui roule
// traversait les appareils garés (le bout d'aile dans le voisin, vu en capture
// `aeroport-roulage`, v565), et la voiture de l'enfant traversait un avion au
// poste (v534 : `gareeContre` écarte les fiches `pilote`, parce qu'une boîte
// de voiture autour du fuselage serait fausse).
//
// UNE BOÎTE NE DÉCRIT PAS UN AVION. Un rectangle « longueur × envergure »
// arrêterait une voiture à sept blocs du fuselage, sous le vide entre l'aile
// et l'empennage ; un rectangle « longueur × fuselage » laisserait passer
// l'aile, qui est justement ce qui heurte. On mesure donc la SILHOUETTE vue du
// dessus — chaque triangle visible projeté au sol, sur une grille d'un
// demi-bloc — une fois par modèle (`memo`), comme les feux (v550) : un modèle
// se mesure sur le prototype, jamais sur une copie abîmée.
//
// ET L'ENFONCEMENT SE COMPTE EN CASES (la règle de `sEnfonce`, v560, pour une
// forme qui n'est pas un rectangle) : ce qui bouge porte des points (une grille
// sur la boîte d'une voiture, les cases de sa propre silhouette pour un avion),
// et un pas est refusé s'il met PLUS de ces points dans l'avion garé que la
// pose d'avant. Reculer, longer, se dégager restent permis — on n'est jamais
// coincé, même posé de travers dans une aile.
import * as THREE from 'three';
import { MODELES_AVION, avionDeLigneSculpte, avionDeChasseSculpte, concorde } from './avions.js';
import { liberer } from './liberer.js';

export const PAS_EMPRISE = 0.5;

// La silhouette d'un modèle dans SON repère (nez vers −z, x vers la droite
// de l'appareil), en cases de `PAS_EMPRISE`. Seul ce qui est visible compte :
// les flammes et les feux de bord naissent cachés, la porte d'un déposé aussi.
export function mesurerEmprise(racine, pas = PAS_EMPRISE) {
  racine.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(racine.matrixWorld).invert();
  const tris = [];
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  const m = new THREE.Matrix4(), v = new THREE.Vector3();
  const visible = (o) => { for (let p = o; p && p !== racine.parent; p = p.parent) if (!p.visible) return false; return true; };
  racine.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || !visible(o)) return;
    m.multiplyMatrices(inv, o.matrixWorld);
    const pos = o.geometry.attributes.position, idx = o.geometry.index;
    const xs = new Float32Array(pos.count), zs = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      xs[i] = v.x; zs[i] = v.z;
      if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x;
      if (v.z < z0) z0 = v.z; if (v.z > z1) z1 = v.z;
    }
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i + 2 < n; i += 3) {
      const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
      tris.push(xs[a], zs[a], xs[b], zs[b], xs[c], zs[c]);
    }
  });
  if (!(x1 > x0)) return null;
  const ox = Math.floor(x0 / pas) * pas, oz = Math.floor(z0 / pas) * pas;
  const nx = Math.ceil((x1 - ox) / pas) + 1, nz = Math.ceil((z1 - oz) / pas) + 1;
  const cases = new Uint8Array(nx * nz);
  // une case est prise si un triangle la recouvre : son centre dans le
  // triangle, ou un sommet du triangle dans la case (les pièces fines — un
  // train, une antenne — ne passent pas entre les centres)
  for (let t = 0; t < tris.length; t += 6) {
    const ax = tris[t], az = tris[t + 1], bx = tris[t + 2], bz = tris[t + 3], cx = tris[t + 4], cz = tris[t + 5];
    for (const [px, pz] of [[ax, az], [bx, bz], [cx, cz]]) {
      const i = Math.floor((px - ox) / pas), k = Math.floor((pz - oz) / pas);
      if (i >= 0 && i < nx && k >= 0 && k < nz) cases[k * nx + i] = 1;
    }
    const d = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    if (Math.abs(d) < 1e-9) continue;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - ox) / pas)), i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - ox) / pas));
    const k0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - oz) / pas)), k1 = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) - oz) / pas));
    for (let k = k0; k <= k1; k++) {
      const pz = oz + (k + 0.5) * pas;
      for (let i = i0; i <= i1; i++) {
        if (cases[k * nx + i]) continue;
        const px = ox + (i + 0.5) * pas;
        const u = ((bx - px) * (cz - pz) - (bz - pz) * (cx - px)) / d;
        const w = ((cx - px) * (az - pz) - (cz - pz) * (ax - px)) / d;
        if (u >= -1e-6 && w >= -1e-6 && u + w <= 1 + 1e-6) cases[k * nx + i] = 1;
      }
    }
  }
  const points = [];
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    if (cases[k * nx + i]) points.push(ox + (i + 0.5) * pas, oz + (k + 0.5) * pas);
  }
  return { pas, ox, oz, nx, nz, cases, points: new Float32Array(points), rayon: Math.hypot(Math.max(-x0, x1), Math.max(-z0, z1)), x0, x1, z0, z1 };
}

// UN MODÈLE SE MESURE SUR UN MODÈLE NEUF, UNE FOIS (la règle des feux, v550).
// Jamais sur l'appareil de la scène : celui où l'enfant monte porte un temps
// son escalier et sa porte ouverte, et la mesure gardée pour tout le modèle
// en serait plus large. Un déposé se mesure s'il est arrivé (sa variante),
// sinon c'est le sculpté de l'espèce — la clé dit lequel.
const SCULPTES = { avionligne: avionDeLigneSculpte, concorde, chasseur: avionDeChasseSculpte };
const memo = new Map();
export function cleDEmprise(maillage, espece) {
  const v = maillage && maillage.userData && maillage.userData.variante;
  return v || espece;
}
export function empriseDe(espece, cle) {
  if (memo.has(cle)) return memo.get(cle);
  let g = null;
  if (cle !== espece && MODELES_AVION[espece]) {
    g = MODELES_AVION[espece]({ variante: cle });
    if (g.userData.variante !== cle) { liberer(g); g = null; }
  } else if (SCULPTES[espece]) g = SCULPTES[espece]();
  const e = g ? mesurerEmprise(g) : null;
  if (g) liberer(g);
  memo.set(cle, e);
  return e;
}

// Un point du monde est-il dans l'avion posé en (ax, az), mesh.rotation.y = θ
// (`animals.js` : θ = yaw + π) ? Rotation de three autour de y : le monde vaut
// (lx cos θ + lz sin θ, −lx sin θ + lz cos θ) ; on fait l'inverse.
function dedans(e, c, s, ax, az, wx, wz) {
  const dx = wx - ax, dz = wz - az;
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  const i = Math.floor((lx - e.ox) / e.pas), k = Math.floor((lz - e.oz) / e.pas);
  return i >= 0 && i < e.nx && k >= 0 && k < e.nz && e.cases[k * e.nx + i] === 1;
}
export function pointsDans(e, ax, az, theta, pts) {
  const c = Math.cos(theta), s = Math.sin(theta);
  let n = 0;
  for (let i = 0; i < pts.length; i += 2) if (dedans(e, c, s, ax, az, pts[i], pts[i + 1])) n++;
  return n;
}

// Les points d'une boîte orientée de voiture (`boiteVoiture` : centre, axe
// long (ux, uz), demi-longueur a, demi-largeur b), au demi-bloc, bords compris.
export function pointsDeBoite(B, pas = PAS_EMPRISE) {
  const out = [];
  const na = Math.max(1, Math.ceil((2 * B.a) / pas)), nb = Math.max(1, Math.ceil((2 * B.b) / pas));
  for (let i = 0; i <= na; i++) {
    const s = -B.a + (2 * B.a * i) / na;
    for (let j = 0; j <= nb; j++) {
      const t = -B.b + (2 * B.b * j) / nb;
      out.push(B.x + B.ux * s + B.uz * t, B.z + B.uz * s - B.ux * t);
    }
  }
  return out;
}

// Les points de la silhouette d'un AVION posé en (x, z), rotation θ, dans le monde.
export function pointsDAvion(e, x, z, theta) {
  const c = Math.cos(theta), s = Math.sin(theta), p = e.points, out = new Array(p.length);
  for (let i = 0; i < p.length; i += 2) {
    out[i] = x + p[i] * c + p[i + 1] * s;
    out[i + 1] = z - p[i] * s + p[i + 1] * c;
  }
  return out;
}

// LE PAS S'ENFONCE-T-IL ? Plus de points dans l'avion garé après qu'avant.
//
// SAUF DANS UN JUMEAU. Un appareil invoqué sur un poste déjà garni naît
// mêlé à l'avion garé ; chaque virage l'y enfonce d'un point, et il restait
// cloué au poste pour toujours (vu par le témoin du roulage de Roissy-Orly,
// 196 refus en une minute). En roulant on ne dépasse jamais le premier
// contact, qui arrête : un quart des points dedans ne s'atteint qu'en naissant
// dedans. On ignore alors cet avion jusqu'à en être sorti.
export const JUMEAU = 0.25;
export function sEnfonceDansAvion(e, ax, az, theta, avant, apres) {
  const n1 = pointsDans(e, ax, az, theta, apres);
  if (n1 === 0) return false;
  const n0 = pointsDans(e, ax, az, theta, avant);
  if (n0 > JUMEAU * (avant.length / 2)) return false;
  return n1 > n0;
}
