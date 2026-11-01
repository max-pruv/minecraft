// LES QUARTIERS DE NEW YORK D'APRÈS LE PAQUET DE MAX (v583) — « CCity Building
// Set 1 » de Neberkenezer (Sketchfab, CC-BY-4.0), préparé pour le jeu.
//
//   cd scripts && npm install && node new-york-quartiers.mjs <dossier du paquet> ../vendor/newyork ../src/new-york-quartiers-donnees.js
//
// Le paquet est une ville de jeu policier (armurerie, prêteur sur gages, magasin
// d'alcool, une voiture de marque). Ce script :
//
// 1. TRIE. On ne garde que ce qu'on peut montrer à Marlon et Alice et qui fait
//    une ville : deux immeubles, le cinéma, la clinique, le lavomatique, la
//    conserverie, la barre d'habitation, le terrain de basket. L'armurerie
//    (« City Arms »), le magasin d'alcool, le prêteur sur gages et la Lotus ne
//    sortent pas du paquet (invariant 4 pour la marque, notre public pour le
//    reste).
// 2. REPEINT L'ENSEIGNE du cinéma : « PARAMOUNT » est une marque, l'enseigne dit
//    désormais CINEMA (crédit et modification : vendor/newyork/LICENSE.md).
// 3. FOND LES TEXTURES EN UN SEUL ATLAS de 2 048 pixels : une matière, donc une
//    clé de programme et un seul essaim par forme. Quelques UV du paquet
//    dépassent [0, 1] (les murs de la clinique et de la conserverie se répètent) :
//    ces triangles se coupent aux lignes entières, chaque morceau revient dans sa
//    tuile, sans répétition.
// 4. RANGE CE QUI S'ALLUME la nuit (les matériaux « GLOW » du paquet : vitrines,
//    enseignes, fenêtres) dans un second atlas, l'émissive.
// 5. CUIT UN LOINTAIN : cinq faces (dix triangles) dont chaque texel lit le modèle
//    par un rayon. Une tour de cinq cents triangles coûte dix triangles de loin et
//    garde son dessin. Le lointain est dans le même atlas : aucune clé de plus.
// 6. MET À L'UNITÉ ET IMPRIME. Chaque forme tient dans un cube de 1 (x et z dans
//    [−0,5 ; 0,5], y dans [0 ; 1]), comme les boîtes de `Lot` (manhattan-render.js)
//    qui la poseront à la taille de son voxel. Ce que le voxel doit savoir (la
//    taille du corps, sa face sur rue) part dans un fichier engendré.
import sharp from 'sharp';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import fs from 'fs';
import path from 'path';

sharp.cache(false);
const [,, source, sortie, fichierDonnees] = process.argv;
if (!source || !sortie) throw new Error('usage : new-york-quartiers.mjs <paquet> <sortie> [donnees.js]');

// nœud du paquet, et où est sa FACE SUR RUE dans le repère du modèle, relevé sur
// la planche de contrôle (`tests/sonde-planche-quartiers.cjs`).
// `face` : le cap (radians autour de y) qui amène la devanture du modèle vers +z.
const FORMES = {
  immeuble: { noeud: 'Filler_Housing', face: 0 },
  appartements: { noeud: 'group84', face: 0 },
  cinema: { noeud: 'LM_Paramount1', face: 0 },
  clinique: { noeud: 'LM_Clinic2', face: 0 },
  lavomatique: { noeud: 'LM_Laundrette', face: 0 },
  conserverie: { noeud: 'FFactory', face: 0 },
  barre: { noeud: 'Projects', face: 0 },
  basket: { noeud: 'LM_Basketball9', face: 0 },
};
// tuile de l'atlas de chaque texture gardée (cases de 682 pixels, 3 × 3 ; le
// lavomatique et le basket se partagent une case, la dernière colonne est au
// lointain)
const CASE = 682, ATLAS = 2048, JOINT = 3;
const TUILES = {
  Paramount: { x: 0, y: 0, w: CASE, h: CASE },
  FillerBuildings1: { x: CASE, y: 0, w: CASE, h: CASE },
  Clinic: { x: 0, y: CASE, w: CASE, h: CASE },
  FishFactory: { x: CASE, y: CASE, w: CASE, h: CASE },
  LMProjects: { x: 0, y: 2 * CASE, w: CASE, h: CASE },
  Laundrymat: { x: CASE, y: 2 * CASE, w: CASE, h: CASE / 2 },
  Basketball: { x: CASE, y: 2 * CASE + CASE / 2, w: CASE, h: CASE / 2 },
};
const IMAGES = {
  Paramount: 'Paramount_baseColor.png', FillerBuildings1: 'FillerBuildings1_baseColor.png', Clinic: 'Clinic_baseColor.png',
  FishFactory: 'FishFactory_baseColor.png', LMProjects: 'LMProjects1GLOW_baseColor.png', Laundrymat: 'Laundrymat_baseColor.png',
  Basketball: 'Basketball_baseColor.png',
};
// La matière d'un matériau du paquet, et ce qu'il émet (facteur du paquet, ou 1).
const MATIERES = {
  Paramount: ['Paramount', 0], Paramount1GLOW: ['Paramount', 1],
  FillerBuildings1: ['FillerBuildings1', 0], FillerBuildings1GLOW: ['FillerBuildings1', 1],
  Clinic: ['Clinic', 0], LMProjects: ['LMProjects', 0], LMProjects1GLOW: ['LMProjects', 1],
  Laundrymat: ['Laundrymat', 0], FishFactory: ['FishFactory', 0], FishFactory1GLOW: ['FishFactory', 1],
  Basketball: ['Basketball', 0],
};

// ---- lecture du paquet --------------------------------------------------------
const g = JSON.parse(fs.readFileSync(path.join(source, 'scene.gltf'), 'utf8'));
const bin = fs.readFileSync(path.join(source, 'scene.bin'));
const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
const acc = (i) => {
  const a = g.accessors[i], v = g.bufferViews[a.bufferView];
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const taille = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType];
  const lit = { 5126: (o) => dv.getFloat32(o, true), 5125: (o) => dv.getUint32(o, true), 5123: (o) => dv.getUint16(o, true), 5121: (o) => dv.getUint8(o) }[a.componentType];
  const off = (v.byteOffset || 0) + (a.byteOffset || 0), pas = v.byteStride || n * taille;
  const out = new Float64Array(a.count * n);
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = lit(off + k * pas + c * taille);
  return out;
};
const matrice = (n) => {
  const m = new THREE.Matrix4();
  if (n.matrix) return m.fromArray(n.matrix);
  return m.compose(
    new THREE.Vector3(...(n.translation || [0, 0, 0])),
    new THREE.Quaternion(...(n.rotation || [0, 0, 0, 1])),
    new THREE.Vector3(...(n.scale || [1, 1, 1])),
  );
};
function trouver(nom) {
  let trouve = null;
  const visite = (i, M) => {
    const n = g.nodes[i], W = M.clone().multiply(matrice(n));
    if (n.name === nom && !trouve) trouve = { i, W: M.clone() };
    for (const c of n.children || []) visite(c, W);
  };
  for (const r of g.scenes[g.scene || 0].nodes) visite(r, new THREE.Matrix4());
  if (!trouve) throw new Error(`nœud introuvable : ${nom}`);
  return trouve;
}
// Tous les triangles d'une forme, dans le repère de la scène : un sommet =
// [x, y, z, nx, ny, nz, u, v]. Ce qui n'a pas de matière (les ampoules sans image
// de la rue, une voiture garée dans le nœud) ne sort pas.
function trianglesDe(nom) {
  const { i, W } = trouver(nom), tris = [], ignores = {};
  const v3 = new THREE.Vector3(), n3 = new THREE.Vector3();
  const visite = (ni, M) => {
    const n = g.nodes[ni], W2 = M.clone().multiply(matrice(n));
    const N = new THREE.Matrix3().getNormalMatrix(W2);
    if (n.mesh !== undefined) for (const p of g.meshes[n.mesh].primitives) {
      const nm = g.materials[p.material].name, matiere = MATIERES[nm];
      const X = acc(p.indices);
      if (!matiere) { ignores[nm] = (ignores[nm] || 0) + X.length / 3; continue; }
      const P = acc(p.attributes.POSITION), NO = acc(p.attributes.NORMAL), UV = acc(p.attributes.TEXCOORD_0);
      const sommet = (k) => {
        v3.set(P[3 * k], P[3 * k + 1], P[3 * k + 2]).applyMatrix4(W2);
        n3.set(NO[3 * k], NO[3 * k + 1], NO[3 * k + 2]).applyMatrix3(N).normalize();
        return [v3.x, v3.y, v3.z, n3.x, n3.y, n3.z, UV[2 * k], UV[2 * k + 1]];
      };
      for (let t = 0; t < X.length; t += 3) tris.push({ s: [sommet(X[t]), sommet(X[t + 1]), sommet(X[t + 2])], matiere: matiere[0], lueur: matiere[1] });
    }
    for (const c of n.children || []) visite(c, W2);
  };
  visite(i, W);
  return { tris, ignores };
}

// ---- les UV qui sortent de [0, 1] -----------------------------------------------
// Une répétition n'existe pas dans un atlas : on coupe le triangle aux lignes
// entières (Sutherland-Hodgman sur u, puis v), et chaque morceau revient dans sa
// tuile.
const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
function couperSur(poly, axe, ligne, garderBas) {
  const dedans = (s) => (garderBas ? s[axe] <= ligne : s[axe] >= ligne);
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (dedans(a)) out.push(a);
    if (dedans(a) !== dedans(b)) out.push(mix(a, b, (ligne - a[axe]) / (b[axe] - a[axe])));
  }
  return out;
}
function ramener(sommets) {
  let morceaux = [sommets];
  for (const axe of [6, 7]) {
    const suite = [];
    for (let poly of morceaux) {
      const m = Math.min(...poly.map((s) => s[axe])), M = Math.max(...poly.map((s) => s[axe]));
      for (let k = Math.floor(m); k < Math.ceil(M) || k === Math.floor(m); k++) {
        const bas = couperSur(poly, axe, k, false), part = couperSur(bas, axe, k + 1, true);
        if (part.length >= 3) suite.push(part.map((s) => { const c = s.slice(); c[axe] = Math.min(1, Math.max(0, s[axe] - k)); return c; }));
        if (k + 1 >= M) break;
      }
    }
    morceaux = suite;
  }
  const tris = [];
  for (const p of morceaux) for (let i = 1; i + 1 < p.length; i++) tris.push([p[0], p[i], p[i + 1]]);
  return tris;
}
const versAtlas = (matiere, u, v) => {
  const t = TUILES[matiere];
  return [
    (t.x + JOINT + u * (t.w - 2 * JOINT)) / ATLAS,
    (t.y + JOINT + v * (t.h - 2 * JOINT)) / ATLAS,
  ];
};

// ---- l'atlas ------------------------------------------------------------------------
// L'enseigne du cinéma. Dans l'image les lettres se lisent tête en bas : le
// paquet retourne v. On dessine donc à l'endroit, et on retourne. Les deux
// panneaux (relevés sur l'image de 1 024 pixels) gardent leur fond et leur cadre.
async function imageCinema() {
  const base = sharp(path.join(source, 'textures', IMAGES.Paramount));
  const panneau = (x) => `<g transform="translate(${x},0)">
    <rect x="0" y="0" width="60" height="500" rx="10" fill="#b84f42"/>
    ${[...'CINEMA'].map((c, i) => `<text x="30" y="${66 + i * 80}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="64" fill="#ffe9d6" stroke="#ff8a6a" stroke-width="2">${c}</text>`).join('')}
  </g>`;
  // le groupe retourne v : le haut du panneau (y = 0) est en bas de l'image
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <g transform="translate(0,978) scale(1,-1)">${panneau(842)}${panneau(936)}</g></svg>`;
  return base.composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toBuffer();
}
async function brutTuile(matiere) {
  const t = TUILES[matiere];
  const src = matiere === 'Paramount' ? await imageCinema() : path.join(source, 'textures', IMAGES[matiere]);
  const w = t.w - 2 * JOINT, h = t.h - 2 * JOINT;
  const coeur = await sharp(src).removeAlpha().resize(w, h, { fit: 'fill' }).raw().toBuffer();
  return { t, w, h, coeur };
}
const atlas = Buffer.alloc(ATLAS * ATLAS * 3, 96);
for (const matiere of Object.keys(TUILES)) {
  const { t, w, h, coeur } = await brutTuile(matiere);
  // le joint recopie le bord : les mipmaps ne mélangent pas deux tuiles voisines
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
    const sx = Math.min(w - 1, Math.max(0, x - JOINT)), sy = Math.min(h - 1, Math.max(0, y - JOINT));
    for (let c = 0; c < 3; c++) atlas[((t.y + y) * ATLAS + t.x + x) * 3 + c] = coeur[(sy * w + sx) * 3 + c];
  }
}

// ---- chaque forme : à l'unité, soudée, avec ses mesures ------------------------------
const nuit = new Uint8Array(1024 * 1024);
function tracerLueur(a, b, c) {
  // rastérise le triangle dans le masque (UV de l'atlas), un bord d'un texel de plus
  const N = 1024;
  const P = [a, b, c].map(([u, v]) => [u * N, v * N]);
  const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0])) - 1), x1 = Math.min(N - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])) + 1);
  const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1])) - 1), y1 = Math.min(N - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])) + 1);
  const aire = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
  if (Math.abs(aire) < 1e-6) return;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5;
    const w1 = ((px - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (py - P[0][1])) / aire;
    const w2 = ((P[1][0] - P[0][0]) * (py - P[0][1]) - (px - P[0][0]) * (P[1][1] - P[0][1])) / aire;
    if (w1 > -0.02 && w2 > -0.02 && w1 + w2 < 1.02) nuit[y * N + x] = 255;
  }
}
// Le corps : ce qui porte le voxel. Une enseigne en saillie ne compte pas, on prend
// donc l'emprise au 3e et au 97e centile de la surface — pas l'emprise totale. Les
// murs portent presque toute l'aire.
function corpsDe(tris) {
  const xs = [], zs = [];
  let haut = 0;
  for (const { s } of tris) {
    const [a, b, c] = s;
    const aire = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2])).length() / 2;
    const n = Math.max(1, Math.round(aire / 4000));
    for (const v of s) { haut = Math.max(haut, v[1]); }
    for (let k = 0; k < Math.min(n, 200); k++) {
      const r1 = (k * 0.618) % 1, r2 = (k * 0.382) % 1, u = r1 + r2 > 1 ? 1 - r1 : r1, w = r1 + r2 > 1 ? 1 - r2 : r2;
      xs.push(a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * w);
      zs.push(a[2] + (b[2] - a[2]) * u + (c[2] - a[2]) * w);
    }
  }
  xs.sort((p, q) => p - q); zs.sort((p, q) => p - q);
  const q = (t, f) => t[Math.floor(f * (t.length - 1))];
  return { x0: q(xs, 0.03), x1: q(xs, 0.97), z0: q(zs, 0.03), z1: q(zs, 0.97), haut };
}
const mesures = {}, geos = {};
for (const [nom, fiche] of Object.entries(FORMES)) {
  const { tris, ignores } = trianglesDe(fiche.noeud);
  const c = corpsDe(tris);
  // le sol du paquet est à 20 (une dalle de rue) : le pied du modèle revient à 0
  let bas = Infinity;
  for (const { s } of tris) for (const v of s) bas = Math.min(bas, v[1]);
  const L = c.x1 - c.x0, P = c.z1 - c.z0, H = c.haut - bas, cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
  const co = Math.cos(fiche.face), si = Math.sin(fiche.face);
  const quart = Math.abs(si) > 0.5;
  const cles = new Map(), pos = [], nrm = [], uv = [], idx = [];
  const sommet = (s, matiere) => {
    // à l'unité dans le repère du modèle, puis tourné : la devanture va vers +z
    const dx = (s[0] - cx) / L, dz = (s[2] - cz) / P;
    const x = quart ? dz * si : dx * co + dz * si, z = quart ? -dx * si : -dx * si + dz * co;
    const nx = s[3] * co + s[5] * si, nz = -s[3] * si + s[5] * co;
    const [au, av] = versAtlas(matiere, s[6], s[7]);
    const y = (s[1] - bas) / H;
    const k = [x, y, z, nx, s[4], nz, au, av].map((v) => Math.round(v * 1e4)).join(',');
    let i = cles.get(k);
    if (i === undefined) { i = pos.length / 3; cles.set(k, i); pos.push(x, y, z); nrm.push(nx, s[4], nz); uv.push(au, av); }
    return i;
  };
  for (const t of tris) for (const morceau of ramener(t.s)) {
    const ia = sommet(morceau[0], t.matiere), ib = sommet(morceau[1], t.matiere), ic = sommet(morceau[2], t.matiere);
    if (ia !== ib && ib !== ic && ia !== ic) idx.push(ia, ib, ic);
    if (t.lueur) tracerLueur(...morceau.map((s) => versAtlas(t.matiere, s[6], s[7])));
  }
  geos[nom] = { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx: new Uint32Array(idx) };
  // en blocs : un bloc vaut un mètre, le paquet est en centimètres
  mesures[nom] = {
    l: +((quart ? P : L) / 100).toFixed(1), p: +((quart ? L : P) / 100).toFixed(1), h: +(H / 100).toFixed(1),
  };
  console.log(`${nom.padEnd(13)} ${String(idx.length / 3).padStart(5)} triangles (${tris.length} au paquet) ; corps ${mesures[nom].l} × ${mesures[nom].p} × ${mesures[nom].h} blocs${Object.keys(ignores).length ? ` ; écartés : ${JSON.stringify(ignores)}` : ''}`);
}

// ---- le lointain ------------------------------------------------------------------
// Cinq faces par forme, rangées par étagères dans la dernière colonne de l'atlas.
// Chaque texel lance un rayon vers le modèle et lit la couleur (et la lueur) qu'il
// touche. Un rayon qui ne touche rien prend la moyenne des voisins (`combler`) : le
// lointain n'a pas de transparence, sa clé de programme serait une autre.
const PX_PAR_BLOC = 3.5;
const X0 = 2 * CASE, LARGE = ATLAS - X0;
let ex = X0 + 2, ey = 2, eh = 0;
const place = (w, h) => {
  if (ex + w + 2 > X0 + LARGE) { ex = X0 + 2; ey += eh + 3; eh = 0; }
  const out = { x: ex, y: ey, w, h };
  ex += w + 3; eh = Math.max(eh, h);
  if (ey + h > ATLAS) throw new Error('le lointain déborde de sa colonne');
  return out;
};
const nuitLire = (u, v) => nuit[Math.min(1023, Math.floor(v * 1024)) * 1024 + Math.min(1023, Math.floor(u * 1024))];
const lueursLoin = [];
function cuireFace(geo, bvh, tuile, rayon) {
  const { x, y, w, h } = tuile, couvert = new Uint8Array(w * h), brut = new Float32Array(w * h * 3);
  const r = new THREE.Ray(), pt = new THREE.Vector3(), bar = new THREE.Vector3(), tri = new THREE.Triangle();
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  let touches = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    rayon((i + 0.5) / w, (j + 0.5) / h, r);
    const hit = bvh.raycastFirst(r, THREE.DoubleSide);
    if (!hit) continue;
    const { a, b, c } = hit.face;
    A.fromArray(geo.pos, 3 * a); B.fromArray(geo.pos, 3 * b); C.fromArray(geo.pos, 3 * c);
    tri.set(A, B, C); tri.getBarycoord(hit.point, bar);
    const u = geo.uv[2 * a] * bar.x + geo.uv[2 * b] * bar.y + geo.uv[2 * c] * bar.z;
    const v = geo.uv[2 * a + 1] * bar.x + geo.uv[2 * b + 1] * bar.y + geo.uv[2 * c + 1] * bar.z;
    const px = Math.min(ATLAS - 1, Math.floor(u * ATLAS)), py = Math.min(ATLAS - 1, Math.floor(v * ATLAS));
    for (let k = 0; k < 3; k++) brut[(j * w + i) * 3 + k] = atlas[(py * ATLAS + px) * 3 + k];
    couvert[j * w + i] = 1;
    if (nuitLire(u, v)) lueursLoin.push([x + i, y + j]);
    touches++;
  }
  // bouche-trous : la moyenne de ce qui est couvert, puis de proche en proche
  let moy = [0, 0, 0];
  for (let k = 0; k < w * h; k++) if (couvert[k]) for (let c = 0; c < 3; c++) moy[c] += brut[3 * k + c];
  moy = moy.map((v) => v / Math.max(1, touches));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i;
    for (let c = 0; c < 3; c++) atlas[((y + j) * ATLAS + x + i) * 3 + c] = couvert[k] ? brut[3 * k + c] : moy[c];
  }
  for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
    // un texel de bord recopié autour de la tuile
    if (i >= 0 && i < w && j >= 0 && j < h) continue;
    const X = x + i, Y = y + j;
    if (X < 0 || Y < 0 || X >= ATLAS || Y >= ATLAS) continue;
    const sx = x + Math.max(0, Math.min(w - 1, i)), sy = y + Math.max(0, Math.min(h - 1, j));
    for (let c = 0; c < 3; c++) atlas[(Y * ATLAS + X) * 3 + c] = atlas[(sy * ATLAS + sx) * 3 + c];
  }
}
const loins = {};
for (const [nom, geo] of Object.entries(geos)) {
  const m = mesures[nom];
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(geo.pos, 3));
  bg.setIndex(new THREE.BufferAttribute(geo.idx, 1));
  const bvh = new MeshBVH(bg);
  const pxl = Math.max(8, Math.round(m.l * PX_PAR_BLOC)), pxp = Math.max(8, Math.round(m.p * PX_PAR_BLOC)), pxh = Math.max(8, Math.round(m.h * PX_PAR_BLOC));
  const pos = [], nrm = [], uv = [], idx = [];
  // quatre coins (u, v du quad → x, y, z à l'unité), v = 0 en HAUT de la tuile
  const quad = (tuile, p00, p10, p01, p11, n) => {
    const k = pos.length / 3, U = (i) => (tuile.x + i * tuile.w) / ATLAS, V = (j) => (tuile.y + j * tuile.h) / ATLAS;
    for (const [q, i, j] of [[p00, 0, 0], [p10, 1, 0], [p01, 0, 1], [p11, 1, 1]]) { pos.push(...q); nrm.push(...n); uv.push(U(i), V(j)); }
    idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
  };
  const faces = [
    { n: [0, 0, 1], w: pxl, h: pxh, p: (u, v) => [u - 0.5, 1 - v, 0.5] },
    { n: [0, 0, -1], w: pxl, h: pxh, p: (u, v) => [0.5 - u, 1 - v, -0.5] },
    { n: [1, 0, 0], w: pxp, h: pxh, p: (u, v) => [0.5, 1 - v, 0.5 - u] },
    { n: [-1, 0, 0], w: pxp, h: pxh, p: (u, v) => [-0.5, 1 - v, u - 0.5] },
    { n: [0, 1, 0], w: pxl, h: pxp, p: (u, v) => [u - 0.5, 1, v - 0.5] },
  ];
  for (const f of faces) {
    const tuile = place(f.w, f.h);
    cuireFace(geo, bvh, tuile, (u, v, r) => {
      const q = f.p(u, v);
      // le rayon part de 1,5 unité à l'extérieur de la face et rentre
      r.origin.set(q[0] + f.n[0] * 1.5, q[1] + f.n[1] * 1.5, q[2] + f.n[2] * 1.5);
      r.direction.set(-f.n[0], -f.n[1], -f.n[2]);
    });
    quad(tuile, f.p(0, 0), f.p(1, 0), f.p(0, 1), f.p(1, 1), f.n);
  }
  loins[nom] = { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx: new Uint32Array(idx) };
}
for (const [x, y] of lueursLoin) nuit[Math.floor(y / 2) * 1024 + Math.floor(x / 2)] = 200;
console.log(`lointain : ${Object.keys(loins).length} formes, colonne remplie jusqu'à ${ey + eh} px sur ${ATLAS}`);

// ---- écriture ------------------------------------------------------------------------
const jpegAtlas = await sharp(atlas, { raw: { width: ATLAS, height: ATLAS, channels: 3 } }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
// La lueur porte la couleur de l'atlas là où elle est allumée : une vitrine reste
// jaune, une enseigne verte. Le reste est noir.
const lueur = Buffer.alloc(1024 * 1024 * 3);
for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
  const f = nuit[y * 1024 + x] / 255;
  if (!f) continue;
  const i = (y * 2 * ATLAS + x * 2) * 3;
  for (let c = 0; c < 3; c++) lueur[(y * 1024 + x) * 3 + c] = Math.round(atlas[i + c] * f);
}
const jpegNuit = await sharp(lueur, { raw: { width: 1024, height: 1024, channels: 3 } }).blur(0.6).jpeg({ quality: 80, mozjpeg: true }).toBuffer();

const CREDIT = '"CCity Building Set 1" (https://sketchfab.com/3d-models/ccity-building-set-1-a2d5c7bfcc2148fb8994864c43dfcc97) by Neberkenezer (https://sketchfab.com/neberkenezer), CC-BY-4.0';
const vues = [], accs = [], morceaux = [];
let off = 0;
const pousser = (buf, cible) => {
  const pad = (4 - (buf.length % 4)) % 4;
  morceaux.push(buf, Buffer.alloc(pad));
  vues.push({ buffer: 0, byteOffset: off, byteLength: buf.length, ...(cible ? { target: cible } : {}) });
  off += buf.length + pad;
  return vues.length - 1;
};
const meshes = [], nodes = [];
const ajouter = (nom, m) => {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < m.pos.length; k += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], m.pos[k + c]); mx[c] = Math.max(mx[c], m.pos[k + c]); }
  const b = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
  accs.push({ bufferView: pousser(b(m.pos), 34962), componentType: 5126, count: m.pos.length / 3, type: 'VEC3', min: mn, max: mx });
  accs.push({ bufferView: pousser(b(m.nrm), 34962), componentType: 5126, count: m.nrm.length / 3, type: 'VEC3' });
  accs.push({ bufferView: pousser(b(m.uv), 34962), componentType: 5126, count: m.uv.length / 2, type: 'VEC2' });
  const ix = m.pos.length / 3 < 65536 ? Uint16Array.from(m.idx) : m.idx;
  accs.push({ bufferView: pousser(b(ix), 34963), componentType: ix instanceof Uint16Array ? 5123 : 5125, count: m.idx.length, type: 'SCALAR' });
  const k = accs.length;
  meshes.push({ name: nom, primitives: [{ attributes: { POSITION: k - 4, NORMAL: k - 3, TEXCOORD_0: k - 2 }, indices: k - 1, material: 0 }] });
  nodes.push({ name: nom, mesh: meshes.length - 1 });
};
for (const [nom, m] of Object.entries(geos)) ajouter(nom, m);
for (const [nom, m] of Object.entries(loins)) ajouter(`${nom}-loin`, m);
const vAtlas = pousser(jpegAtlas), vNuit = pousser(jpegNuit);
let js = Buffer.from(JSON.stringify({
  asset: { version: '2.0', generator: 'scripts/new-york-quartiers.mjs', copyright: CREDIT },
  scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, accessors: accs, bufferViews: vues, buffers: [{ byteLength: off }],
  images: [{ bufferView: vAtlas, mimeType: 'image/jpeg' }, { bufferView: vNuit, mimeType: 'image/jpeg' }],
  textures: [{ source: 0, sampler: 0 }, { source: 1, sampler: 0 }],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
  materials: [{ name: 'quartiers', doubleSided: true, emissiveTexture: { index: 1 }, emissiveFactor: [1, 1, 1], pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.88 } }],
}));
js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const corps = Buffer.concat(morceaux), tete = Buffer.alloc(12);
tete.writeUInt32LE(0x46546c67, 0); tete.writeUInt32LE(2, 4); tete.writeUInt32LE(12 + 8 + js.length + 8 + corps.length, 8);
const cj = Buffer.alloc(8); cj.writeUInt32LE(js.length, 0); cj.writeUInt32LE(0x4e4f534a, 4);
const cb = Buffer.alloc(8); cb.writeUInt32LE(corps.length, 0); cb.writeUInt32LE(0x004e4942, 4);
fs.mkdirSync(sortie, { recursive: true });
fs.writeFileSync(path.join(sortie, 'quartiers.glb'), Buffer.concat([tete, cj, js, cb, corps]));
console.log(`quartiers.glb : ${((12 + 16 + js.length + corps.length) / 1e6).toFixed(2)} Mo (atlas ${(jpegAtlas.length / 1e6).toFixed(2)} Mo, lueur ${(jpegNuit.length / 1e6).toFixed(2)} Mo)`);
if (fichierDonnees) fs.writeFileSync(fichierDonnees, `// LES QUARTIERS DE NEW YORK (v583) — fichier ENGENDRÉ par
// scripts/new-york-quartiers.mjs, ne pas modifier à la main.
//
// FORMES_QUARTIERS : le corps de chaque modèle du paquet CCity (crédit :
// vendor/newyork/LICENSE.md), en blocs à l'échelle du paquet (un bloc = un mètre) :
// l le long de la rue, p en profondeur, h jusqu'au toit. Les quartiers de banlieue
// les posent à cette échelle ; Manhattan les serre dans ses lots (deux échelles).
export const FORMES_QUARTIERS = ${JSON.stringify(mesures)};
`);
