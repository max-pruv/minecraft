// NEW YORK D'APRÈS LES MODÈLES DE MAX (v565) — l'Empire State Building et la
// statue de la Liberté de Brian Trepanier (Sketchfab, CC-BY-4.0), préparés
// pour le jeu.
//
//   cd scripts && npm install && node new-york.mjs <dossier des paquets> ../vendor/newyork
//
// Le dossier est celui que Max a déposé (empire_state_building_new_york_city_ny_usa/,
// statue_of_liberty_new_york_ny_usa/, scene.gltf + scene.bin + textures/). Les
// deux paquets sont des PHOTOGRAMMÉTRIES : la tour vient avec tout son pâté de
// maisons, la statue avec son île, ses arbres et la baie. Ce script :
//
// 1. DÉCOUPE ce qui est le monument (le lot de l'Empire, le fort et la statue),
//    et retire le petit personnage costumé perché sur l'antenne de l'Empire
//    (matériaux 1 à 5 : cape, casque, visage) — invariant 4, aucune propriété
//    intellectuelle de personnage.
// 2. MET À L'ÉCHELLE DU JEU, à ses deux échelles (CLAUDE.md, « Deux échelles
//    dans la même ville ») : la hauteur suit l'étage, l'emprise le sol. Les cotes
//    sont celles du plan de Manhattan (manhattan-plan.js), pas un goût.
// 3. DÉCIME DANS LE REPÈRE DU JEU, avec une erreur en BLOCS (la leçon de la tour
//    Eiffel, v564) : un modèle proche, et un modèle lointain pour les silhouettes.
// 4. REPLIE L'ATLAS : la photogrammétrie peint tout le quartier dans une image de
//    8 192 pixels. On ne garde que les tuiles qu'emploient les triangles retenus,
//    rangées dans une image de 2 048 — la statue y gagne trois fois sa définition
//    par rapport à une simple réduction.
// 5. MESURE ce que le jeu doit savoir et l'IMPRIME : les retraits de l'Empire
//    (les `niveaux` de manhattan-plan.js, inscrits DANS le modèle — on ne bute
//    jamais sur un mur qu'on ne voit pas) et les couches de la statue.
import { MeshoptSimplifier as S } from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import fs from 'fs';
import path from 'path';

sharp.cache(false);
const [,, source, sortie, fichierDonnees] = process.argv;
const donnees = {};
await S.ready;
fs.mkdirSync(sortie, { recursive: true });

// ---- lecture d'un paquet Sketchfab (positions dans le repère y-haut de la scène)
const mul = (a, b) => { const r = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) r[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return r; };
const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function trs(n) {
  if (n.matrix) return n.matrix;
  const [tx, ty, tz] = n.translation || [0, 0, 0], [qx, qy, qz, qw] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1];
  return [(1 - 2 * (qy * qy + qz * qz)) * sx, (2 * (qx * qy + qz * qw)) * sx, (2 * (qx * qz - qy * qw)) * sx, 0,
    (2 * (qx * qy - qz * qw)) * sy, (1 - 2 * (qx * qx + qz * qz)) * sy, (2 * (qy * qz + qx * qw)) * sy, 0,
    (2 * (qx * qz + qy * qw)) * sz, (2 * (qy * qz - qx * qw)) * sz, (1 - 2 * (qx * qx + qy * qy)) * sz, 0, tx, ty, tz, 1];
}
function lire(dossier) {
  const g = JSON.parse(fs.readFileSync(path.join(dossier, 'scene.gltf'), 'utf8'));
  const bin = fs.readFileSync(path.join(dossier, 'scene.bin'));
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
  const prims = [];
  const visite = (ni, M) => {
    const n = g.nodes[ni], W = mul(M, trs(n));
    if (n.mesh !== undefined) for (const p of g.meshes[n.mesh].primitives) {
      const P = acc(p.attributes.POSITION), UV = acc(p.attributes.TEXCOORD_0), IX = acc(p.indices);
      const pos = new Float64Array(P.length);
      for (let k = 0; k < P.length; k += 3) {
        const x = P[k], y = P[k + 1], z = P[k + 2];
        pos[k] = W[0] * x + W[4] * y + W[8] * z + W[12];
        pos[k + 1] = W[1] * x + W[5] * y + W[9] * z + W[13];
        pos[k + 2] = W[2] * x + W[6] * y + W[10] * z + W[14];
      }
      prims.push({ pos, uv: UV, idx: IX, mat: p.material });
    }
    for (const c of n.children || []) visite(c, W);
  };
  for (const r of g.scenes[g.scene || 0].nodes) visite(r, IDENT);
  const image = g.images[g.textures[g.materials[0].pbrMetallicRoughness.baseColorTexture.index].source].uri;
  return { prims, image: path.join(dossier, decodeURIComponent(image)) };
}

// ---- découpe, soudure, transformation ---------------------------------------
// `garder(a, b, c)` reçoit les trois sommets [x, y, z] d'un triangle (repère du
// modèle) ; `placer([x, y, z])` rend le sommet dans le repère du jeu (blocs).
function decouper({ prims }, garder, placer) {
  const cles = new Map(), pos = [], uv = [], idx = [];
  for (const p of prims) {
    if (p.mat !== 0) continue; // le personnage costumé de l'antenne de l'Empire
    const id = new Int32Array(p.pos.length / 3).fill(-1);
    const sommet = (k) => {
      if (id[k] >= 0) return id[k];
      const q = placer([p.pos[3 * k], p.pos[3 * k + 1], p.pos[3 * k + 2]]);
      const c = `${Math.round(q[0] * 1e4)},${Math.round(q[1] * 1e4)},${Math.round(q[2] * 1e4)},${Math.round(p.uv[2 * k] * 1e6)},${Math.round(p.uv[2 * k + 1] * 1e6)}`;
      let i = cles.get(c);
      if (i === undefined) { i = pos.length / 3; cles.set(c, i); pos.push(...q); uv.push(p.uv[2 * k], p.uv[2 * k + 1]); }
      return (id[k] = i);
    };
    const v = (k) => [p.pos[3 * k], p.pos[3 * k + 1], p.pos[3 * k + 2]];
    for (let t = 0; t < p.idx.length; t += 3) {
      const a = p.idx[t], b = p.idx[t + 1], c = p.idx[t + 2];
      if (!garder(v(a), v(b), v(c))) continue;
      const ia = sommet(a), ib = sommet(b), ic = sommet(c);
      if (ia !== ib && ib !== ic && ia !== ic) idx.push(ia, ib, ic);
    }
  }
  return { pos: new Float32Array(pos), uv: new Float32Array(uv), idx: new Uint32Array(idx) };
}

// ---- décimation dans le repère du jeu ---------------------------------------
// La photogrammétrie coud chaque triangle à part dans son atlas : décimer en
// gardant les UV ne retire presque rien (291 223 triangles sur 301 967, mesuré),
// et décimer en les ignorant les détruit. On décime donc la FORME seule, soudée
// par position, avec une erreur en blocs — puis on recuit sa couleur (`cuire`).
function decimer(m, erreur, cible = 0) {
  const cles = new Map(), pos = [], remap = new Uint32Array(m.pos.length / 3);
  for (let i = 0; i < remap.length; i++) {
    const c = `${Math.round(m.pos[3 * i] * 1e3)},${Math.round(m.pos[3 * i + 1] * 1e3)},${Math.round(m.pos[3 * i + 2] * 1e3)}`;
    let j = cles.get(c);
    if (j === undefined) { j = pos.length / 3; cles.set(c, j); pos.push(m.pos[3 * i], m.pos[3 * i + 1], m.pos[3 * i + 2]); }
    remap[i] = j;
  }
  const P = new Float32Array(pos), I = new Uint32Array(m.idx.length);
  for (let k = 0; k < I.length; k++) I[k] = remap[m.idx[k]];
  // le lointain vise un nombre de triangles : la photogrammétrie est faite de
  // milliers de pièces disjointes, et une décimation qui garde la topologie ne
  // descend pas sous trente-cinq mille (mesuré) — la « grossière » les fond
  const [ix] = cible ? S.simplifySloppy(I, P, 3, null, cible * 3, erreur) : S.simplify(I, P, 3, 0, erreur, ['ErrorAbsolute']);
  const out = [];
  for (let t = 0; t < ix.length; t += 3) if (ix[t] !== ix[t + 1] && ix[t + 1] !== ix[t + 2] && ix[t] !== ix[t + 2]) out.push(ix[t], ix[t + 1], ix[t + 2]);
  return { pos: P, idx: new Uint32Array(out) };
}

// ---- cuisson de la couleur --------------------------------------------------
// Chaque triangle décimé reçoit une demi-case d'un atlas neuf (deux triangles
// par case, séparés par un joint de deux texels) ; chaque texel cherche le point
// le plus proche de la photogrammétrie d'origine et en lit la couleur. Le
// bord de chaque demi-case déborde d'un texel et demi (barycentriques ramenés
// sur le triangle) : la case ne bave jamais sur sa voisine, mipmaps comprises.
const PAD = 1.25;
async function cuire(nom, origine, image, mailles, taille, etalon = null) {
  const src = sharp(image, { limitInputPixels: false });
  const { width: W, height: H } = await src.metadata();
  const brut = await src.removeAlpha().raw().toBuffer();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(origine.pos, 3));
  geo.setIndex(new THREE.BufferAttribute(origine.idx, 1));
  const bvh = new MeshBVH(geo);
  const lire3 = (k) => [origine.pos[3 * k], origine.pos[3 * k + 1], origine.pos[3 * k + 2]];
  const echantillon = (u, v, out, o) => {
    const x = Math.min(W - 1.001, Math.max(0, u * W - 0.5)), y = Math.min(H - 1.001, Math.max(0, v * H - 0.5));
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    for (let c = 0; c < 3; c++) {
      const a = brut[(y0 * W + x0) * 3 + c], b = brut[(y0 * W + x0 + 1) * 3 + c], d = brut[((y0 + 1) * W + x0) * 3 + c], e = brut[((y0 + 1) * W + x0 + 1) * 3 + c];
      out[o + c] = Math.round((a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy);
    }
  };
  // LES CASES SUIVENT L'AIRE. Une décimation laisse des triangles de toutes les
  // tailles : à case égale, la flèche de l'Empire (grands triangles) était floue
  // pendant que les corniches gaspillaient leurs texels (vu en rendu). Les
  // triangles sont rangés par aire, appariés deux à deux, et chaque paire reçoit
  // une case carrée proportionnelle à la racine de son aire ; les cases se rangent
  // par étagères, et l'échelle se cherche pour remplir l'atlas.
  const cases = [];
  mailles.forEach((m, mi) => {
    const aires = [];
    for (let t = 0; t < m.idx.length; t += 3) {
      const V = [0, 1, 2].map((k) => new THREE.Vector3().fromArray(m.pos, 3 * m.idx[t + k]));
      aires.push([t, new THREE.Triangle(...V).getArea()]);
    }
    aires.sort((p, q) => q[1] - p[1]);
    for (let i = 0; i < aires.length; i += 2) cases.push({ mi, t: [aires[i][0], aires[i + 1]?.[0]], aire: Math.max(aires[i][1], aires[i + 1]?.[1] || 0) });
  });
  cases.sort((p, q) => q.aire - p.aire);
  const ranger = (k) => {
    let x = 0, y = 0, h = 0;
    for (const c of cases) {
      const cote = Math.max(4, Math.round(k * Math.sqrt(c.aire)));
      if (x + cote > taille) { x = 0; y += h; h = 0; }
      c.x = x; c.y = y; c.cote = cote; x += cote; h = Math.max(h, cote);
    }
    return y + h <= taille;
  };
  let k0 = 0, k1 = 4096;
  for (let i = 0; i < 40; i++) { const k = (k0 + k1) / 2; if (ranger(k)) k0 = k; else k1 = k; }
  ranger(k0);
  const placeDe = new Map(); // "maillage,triangle" -> [case, haut]
  for (const c of cases) c.t.forEach((t, h) => t !== undefined && placeDe.set(`${c.mi},${t}`, [c, h]));
  const total = cases.length;
  const atlas = Buffer.alloc(taille * taille * 3, 110), masque = new Uint8Array(taille * taille), hauteurs = new Float32Array(taille * taille);
  const tri = new THREE.Triangle(), bary = new THREE.Vector3(), cible = {}, P = new THREE.Vector3();
  const A3 = new THREE.Vector3(), B3 = new THREE.Vector3(), C3 = new THREE.Vector3();
  const sorties = mailles.map((m, mi) => {
    const pos = new Float32Array(m.idx.length * 3), uv = new Float32Array(m.idx.length * 2), idx = new Uint32Array(m.idx.length);
    for (let t = 0; t < m.idx.length; t += 3) {
      const [cas, haut] = placeDe.get(`${mi},${t}`), ox = cas.x, oy = cas.y, cote = cas.cote, s = cote - 2 * PAD - 1.8;
      // les trois coins de la demi-case, en pixels
      const coins = haut
        ? [[ox + cote - PAD, oy + cote - PAD], [ox + cote - PAD - s, oy + cote - PAD], [ox + cote - PAD, oy + cote - PAD - s]]
        : [[ox + PAD, oy + PAD], [ox + PAD + s, oy + PAD], [ox + PAD, oy + PAD + s]];
      const V = [0, 1, 2].map((k) => [m.pos[3 * m.idx[t + k]], m.pos[3 * m.idx[t + k] + 1], m.pos[3 * m.idx[t + k] + 2]]);
      for (let k = 0; k < 3; k++) {
        pos.set(V[k], (t + k) * 3);
        uv[(t + k) * 2] = coins[k][0] / taille; uv[(t + k) * 2 + 1] = coins[k][1] / taille;
        idx[t + k] = t + k;
      }
      // les texels de la demi-case, joint compris
      const x0 = Math.floor(Math.min(...coins.map((c) => c[0])) - PAD), x1 = Math.ceil(Math.max(...coins.map((c) => c[0])) + PAD);
      const y0 = Math.floor(Math.min(...coins.map((c) => c[1])) - PAD), y1 = Math.ceil(Math.max(...coins.map((c) => c[1])) + PAD);
      const aire = (coins[1][0] - coins[0][0]) * (coins[2][1] - coins[0][1]) - (coins[2][0] - coins[0][0]) * (coins[1][1] - coins[0][1]);
      for (let y = Math.max(oy, y0); y < Math.min(oy + cote, y1); y++) for (let x = Math.max(ox, x0); x < Math.min(ox + cote, x1); x++) {
        const px = x + 0.5, py = y + 0.5;
        // de quel côté du joint : la diagonale de la case sépare les deux triangles
        if (((px - ox) + (py - oy) > cote) !== !!haut) continue;
        let w1 = ((px - coins[0][0]) * (coins[2][1] - coins[0][1]) - (coins[2][0] - coins[0][0]) * (py - coins[0][1])) / aire;
        let w2 = ((coins[1][0] - coins[0][0]) * (py - coins[0][1]) - (px - coins[0][0]) * (coins[1][1] - coins[0][1])) / aire;
        let w0 = 1 - w1 - w2;
        w0 = Math.max(0, w0); w1 = Math.max(0, w1); w2 = Math.max(0, w2);
        const n = w0 + w1 + w2; w0 /= n; w1 /= n; w2 /= n;
        P.set(V[0][0] * w0 + V[1][0] * w1 + V[2][0] * w2, V[0][1] * w0 + V[1][1] * w1 + V[2][1] * w2, V[0][2] * w0 + V[1][2] * w1 + V[2][2] * w2);
        if (!bvh.closestPointToPoint(P, cible, 0, 3)) continue;
        const f = cible.faceIndex * 3, ia = origine.idx[f], ib = origine.idx[f + 1], ic = origine.idx[f + 2];
        A3.fromArray(lire3(ia)); B3.fromArray(lire3(ib)); C3.fromArray(lire3(ic));
        tri.set(A3, B3, C3); tri.getBarycoord(cible.point, bary);
        const u = origine.uv[2 * ia] * bary.x + origine.uv[2 * ib] * bary.y + origine.uv[2 * ic] * bary.z;
        const v = origine.uv[2 * ia + 1] * bary.x + origine.uv[2 * ib + 1] * bary.y + origine.uv[2 * ic + 1] * bary.z;
        echantillon(u, v, atlas, (y * taille + x) * 3);
        masque[y * taille + x] = 1;
        hauteurs[y * taille + x] = P.y;
      }
    }
    return { pos, uv, idx };
  });
  if (etalon) etalonner(atlas, masque, hauteurs, etalon);
  combler(atlas, taille, masque);
  const jpeg = await sharp(atlas, { raw: { width: taille, height: taille, channels: 3 } }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  console.log(`${nom}: atlas ${taille}, ${total} cases, ${k0.toFixed(1)} texels par bloc (racine de l'aire), plus petite case ${cases.at(-1).cote} px`);
  return { sorties, jpeg };
}

// L'ÉTALONNAGE. La photogrammétrie cuit dans ses couleurs le ciel bleu et les
// ombres du jour de la prise de vue ; le jeu a son propre soleil. L'Empire
// sortait presque noir et bleu en jeu (vu en capture) pour un calcaire de
// l'Indiana gris clair : on ramène la luminance moyenne des texels couverts à
// `moyenne` (sRGB, 0–255), l'on retire l'essentiel de la saturation (le bleu du
// ciel reflété) et l'on rend au calcaire un peu de sa chaleur (`chaud`).
// ET LE GAIN SE PREND PAR TRANCHE DE HAUTEUR : prise d'avion, la photo garde
// au pied de la tour l'ombre des rues voisines — le bas de l'Empire sortait
// presque noir sous un haut clair (vu en capture). Chaque tranche de quatre blocs
// est ramenée à la moyenne, son gain borné à 2,6.
function etalonner(atlas, masque, hauteurs, { moyenne, saturation, chaud = [1, 1, 1] }) {
  const T = 4, somme = new Map(), nb = new Map();
  const luma = (i) => 0.2126 * atlas[3 * i] + 0.7152 * atlas[3 * i + 1] + 0.0722 * atlas[3 * i + 2];
  for (let i = 0; i < masque.length; i++) if (masque[i]) {
    const t = Math.floor(hauteurs[i] / T);
    somme.set(t, (somme.get(t) || 0) + luma(i)); nb.set(t, (nb.get(t) || 0) + 1);
  }
  const gainDe = (y) => {
    const t = Math.floor(y / T);
    return nb.get(t) > 50 ? Math.min(2.6, moyenne / (somme.get(t) / nb.get(t))) : 1;
  };
  for (let i = 0; i < masque.length; i++) {
    if (!masque[i]) continue;
    const l = luma(i), gain = gainDe(hauteurs[i]);
    for (let k = 0; k < 3; k++) atlas[3 * i + k] = Math.max(0, Math.min(255, Math.round((l + (atlas[3 * i + k] - l) * saturation) * gain * chaud[k])));
  }
  const gains = [...nb.keys()].sort((a, b) => a - b).map((t) => gainDe(t * T).toFixed(2));
  console.log(`  étalonnage : luminance → ${moyenne} par tranche de ${T} blocs, gains ${gains.join(' ')}, saturation ×${saturation}`);
}

// Ce qu'aucune case ne couvre prend la moyenne des texels couverts voisins,
// d'une échelle à l'autre (« pull-push ») : les mipmaps lointaines ne mélangent
// pas le gris du fond aux façades.
function combler(atlas, A, masque) {
  const niveaux = [{ n: A, s: new Float32Array(A * A * 3), c: new Float32Array(A * A) }];
  for (let i = 0; i < A * A; i++) if (masque[i]) { niveaux[0].c[i] = 1; for (let k = 0; k < 3; k++) niveaux[0].s[3 * i + k] = atlas[3 * i + k]; }
  while (niveaux.at(-1).n > 1) {
    const f = niveaux.at(-1), n = Math.ceil(f.n / 2), s = new Float32Array(n * n * 3), c = new Float32Array(n * n);
    for (let y = 0; y < f.n; y++) for (let x = 0; x < f.n; x++) {
      const i = y * f.n + x, j = (y >> 1) * n + (x >> 1);
      c[j] += f.c[i]; for (let k = 0; k < 3; k++) s[3 * j + k] += f.s[3 * i + k];
    }
    niveaux.push({ n, s, c });
  }
  for (const f of niveaux) for (let i = 0; i < f.n * f.n; i++) if (f.c[i] > 0) for (let k = 0; k < 3; k++) f.s[3 * i + k] /= f.c[i];
  for (let l = niveaux.length - 2; l >= 0; l--) {
    const f = niveaux[l], p = niveaux[l + 1];
    for (let y = 0; y < f.n; y++) for (let x = 0; x < f.n; x++) {
      const i = y * f.n + x;
      if (f.c[i] > 0) continue;
      const j = (y >> 1) * p.n + (x >> 1);
      for (let k = 0; k < 3; k++) f.s[3 * i + k] = p.s[3 * j + k];
      f.c[i] = 1;
    }
  }
  for (let i = 0; i < A * A; i++) if (!masque[i]) for (let k = 0; k < 3; k++) atlas[3 * i + k] = Math.round(niveaux[0].s[3 * i + k]);
}


// ---- écriture GLB : un matériau texturé, un nœud par maillage ---------------
function ecrireGlb(fichier, mailles, jpeg, credit) {
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
  for (const [nom, m] of mailles) {
    let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < m.pos.length; k += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], m.pos[k + c]); mx[c] = Math.max(mx[c], m.pos[k + c]); }
    const vp = pousser(Buffer.from(m.pos.buffer, m.pos.byteOffset, m.pos.byteLength), 34962);
    accs.push({ bufferView: vp, componentType: 5126, count: m.pos.length / 3, type: 'VEC3', min: mn, max: mx });
    const vu = pousser(Buffer.from(m.uv.buffer, m.uv.byteOffset, m.uv.byteLength), 34962);
    accs.push({ bufferView: vu, componentType: 5126, count: m.uv.length / 2, type: 'VEC2' });
    const ix = m.pos.length / 3 < 65536 ? Uint16Array.from(m.idx) : m.idx;
    const vi = pousser(Buffer.from(ix.buffer, ix.byteOffset, ix.byteLength), 34963);
    accs.push({ bufferView: vi, componentType: ix instanceof Uint16Array ? 5123 : 5125, count: m.idx.length, type: 'SCALAR' });
    meshes.push({ name: nom, primitives: [{ attributes: { POSITION: accs.length - 3, TEXCOORD_0: accs.length - 2 }, indices: accs.length - 1, material: 0 }] });
    nodes.push({ name: nom, mesh: meshes.length - 1 });
  }
  const vimg = pousser(jpeg);
  const json = {
    asset: { version: '2.0', generator: 'scripts/new-york.mjs', copyright: credit },
    scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, accessors: accs, bufferViews: vues,
    buffers: [{ byteLength: off }],
    images: [{ bufferView: vimg, mimeType: 'image/jpeg' }],
    textures: [{ source: 0, sampler: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    materials: [{ name: 'photogrammetrie', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.85 } }],
  };
  let js = Buffer.from(JSON.stringify(json));
  js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const bin = Buffer.concat(morceaux);
  const tete = Buffer.alloc(12);
  tete.writeUInt32LE(0x46546c67, 0); tete.writeUInt32LE(2, 4); tete.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const cj = Buffer.alloc(8); cj.writeUInt32LE(js.length, 0); cj.writeUInt32LE(0x4e4f534a, 4);
  const cb = Buffer.alloc(8); cb.writeUInt32LE(bin.length, 0); cb.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(fichier, Buffer.concat([tete, cj, js, cb, bin]));
  return 12 + 16 + js.length + bin.length;
}
const triangles = (m) => m.idx.length / 3;

// =============================================================================
// L'EMPIRE STATE BUILDING
// Le paquet est aligné sur la grille : +x vers la Cinquième Avenue (l'est du jeu),
// le lot va de x −1,50 à 1,50 et de z −0,90 à 0,65 (carte des hauteurs relevée
// au dixième). Le sol de la rue est à y ≈ 0 ; le sommet de l'antenne à 11,15
// (443 m réels : 39,7 m par unité).
//
// DANS LE JEU : la boîte de l'Empire fait 26 × 28 blocs (manhattan-plan.js,
// x −33 → −7, z 140 → 168). L'EMPRISE SUIT LE SOL : le lot prend la largeur de
// la boîte, sans être étiré — 26 × 13,4, la vraie proportion du lot (129 × 60 m) ;
// le reste de la boîte est le parvis. LA HAUTEUR SUIT L'ÉTAGE : la terrasse du
// 86e étage (320 m) reste où le jeu la mettait (89 blocs au-dessus de la rue),
// l'antenne monte à 123 comme le mât d'avant.
export const EMPIRE = { lot: { x0: -1.5, x1: 1.5, z0: -0.9, z1: 0.65 }, sol: 0.0, largeur: 26, terrasse86: 8.06, hauteur86: 89, socle: 5 };
{
  const L = EMPIRE.lot;
  const SH = EMPIRE.largeur / (L.x1 - L.x0), SV = EMPIRE.hauteur86 / EMPIRE.terrasse86;
  const cx = (L.x0 + L.x1) / 2, cz = (L.z0 + L.z1) / 2;
  const dans = ([x, , z]) => x >= L.x0 && x <= L.x1 && z >= L.z0 && z <= L.z1;
  // la rue et le trottoir retournent au jeu : un triangle tout entier au ras du sol part
  // le socle (cinq blocs) reste le socle procédural du jeu, net à hauteur de rue :
  // la photogrammétrie, faite d'avion, n'est lisible qu'au-dessus
  const garder = (a, b, c) => dans(a) && dans(b) && dans(c) && Math.max(a[1], b[1], c[1]) > EMPIRE.sol + EMPIRE.socle / SV;
  const placer = ([x, y, z]) => [(x - cx) * SH, Math.max(0, (y - EMPIRE.sol) * SV), (z - cz) * SH];
  const t0 = Date.now();
  const paquet = lire(path.join(source, 'empire_state_building_new_york_city_ny_usa'));
  const brut = decouper(paquet, garder, placer);
  const proche = decimer(brut, 0.12), loin = decimer(brut, 1.0, 6000);
  const { sorties: [p2, l2], jpeg } = await cuire('empire', brut, paquet.image, [proche, loin], 2048, { moyenne: 160, saturation: 0.25, chaud: [1.05, 1.0, 0.92] });
  const octets = ecrireGlb(path.join(sortie, 'empire-state.glb'), [['proche', p2], ['loin', l2]], jpeg,
    '"Empire State Building, New York City, NY, USA" (https://sketchfab.com/3d-models/empire-state-building-new-york-city-ny-usa-941cad02f4db4883b40bddf4c5d20c94) by Brian Trepanier (https://sketchfab.com/CMBC), CC-BY-4.0');
  // LES RETRAITS : par tranche d'un bloc, la demi-largeur et la demi-profondeur
  // que le modèle couvre de SON CÔTÉ LE PLUS ÉTROIT (les niveaux du jeu sont
  // centrés) — mesurées au 3e centile pour ne pas suivre une corniche isolée.
  // Les niveaux du jeu se posent DEDANS : on ne bute jamais sur un mur invisible.
  const tranches = [];
  for (let y = 0; y < 126; y++) {
    const xs = [], zs = [];
    for (let k = 0; k < brut.pos.length; k += 3) if (brut.pos[k + 1] >= y && brut.pos[k + 1] < y + 1) { xs.push(brut.pos[k]); zs.push(brut.pos[k + 2]); }
    if (xs.length < 30) { tranches.push(null); continue; }
    xs.sort((a, b) => a - b); zs.sort((a, b) => a - b);
    const q = (t, f) => t[Math.floor(f * (t.length - 1))];
    tranches.push([Math.min(-q(xs, 0.03), q(xs, 0.97)), Math.min(-q(zs, 0.03), q(zs, 0.97))]);
  }
  console.log(`empire: ${triangles(brut)} → ${triangles(proche)} proche, ${triangles(loin)} loin ; ${(octets / 1e6).toFixed(2)} Mo ; SH ${SH.toFixed(3)} SV ${SV.toFixed(3)} ; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  // des tranches aux niveaux : on regroupe les tranches voisines dont l'emprise ne
  // change pas de plus d'un demi-bloc, et le niveau prend la PLUS PETITE du groupe
  const W = 26, D = 28, niveaux = [[1, 1, EMPIRE.socle]];
  let groupe = null;
  const clore = () => { if (groupe) niveaux.push([+(2 * groupe.hx / W).toFixed(3), +(2 * groupe.hz / D).toFixed(3), groupe.haut]); groupe = null; };
  for (let y = EMPIRE.socle; y < tranches.length; y++) {
    const t = tranches[y];
    if (!t || t[0] < 0.6 || t[1] < 0.6) { clore(); break; }
    if (groupe && Math.abs(t[0] - groupe.x0) < 0.5 && Math.abs(t[1] - groupe.z0) < 0.5) {
      groupe.hx = Math.min(groupe.hx, t[0]); groupe.hz = Math.min(groupe.hz, t[1]); groupe.haut = y + 1;
    } else { clore(); groupe = { x0: t[0], z0: t[1], hx: t[0], hz: t[1], haut: y + 1 }; }
  }
  clore();
  // UN NIVEAU NE S'ÉLARGIT PAS EN MONTANT : \`sommet\` rend le haut du DERNIER
  // niveau qui contient la colonne, si bien qu'un niveau plus large au-dessus d'un
  // plus étroit ferait une colonne pleine sous lui — un mur invisible. On prend le
  // minimum courant (le modèle déborde alors d'un ou deux blocs sur une corniche,
  // jamais l'inverse), puis on fond les niveaux qui ne changent presque plus.
  const fondus = [];
  for (const [k, kd, h] of niveaux) {
    const p = fondus.at(-1), kk = p ? Math.min(k, p[0]) : k, kkd = p ? Math.min(kd, p[1]) : kd;
    if (p && p !== fondus[0] && p[0] - kk < 0.03 && p[1] - kkd < 0.03) { p[0] = kk; p[1] = kkd; p[2] = h; }
    else fondus.push([kk, kkd, h]);
  }
  niveaux.length = 0; niveaux.push(...fondus);
  donnees.EMPIRE_NIVEAUX = niveaux;
  donnees.EMPIRE_SOMMET = +brut.pos.reduce((m, v, i) => (i % 3 === 1 && v > m ? v : m), 0).toFixed(2);
  console.log('empire, niveaux :', JSON.stringify(niveaux));
}

// =============================================================================
// LA STATUE DE LA LIBERTÉ
// Le paquet porte l'île entière. La statue est en (−0,2 ; 0,4) du modèle ; relevé
// par anneaux autour d'elle : la pelouse de l'île à y ≈ 1,2, la terrasse du fort à
// 1,6, le haut du socle à 4,1, le flambeau à 9,37 (11,2 m par unité). On garde le
// fort en étoile, le socle et la statue : ce qui est à moins de 2,6 unités de la
// statue et dépasse la pelouse.
//
// DANS LE JEU : la statue est sur Liberty Island (manhattan-plan.js). Le premier
// bloc au-dessus du sol de l'île est dy = 0 ; LA TERRASSE DU FORT EST À dy = 3
// (HAUT_FORT), là où l'enfant marche — le modèle se cale sur elle, et au-dessus
// la hauteur suit une seule échelle jusqu'au flambeau à 42,5 (HAUT_STATUE 42, à
// son rang dans le ciel de New York). L'emprise suit le sol : 4,6 blocs par
// unité, le fort fait une vingtaine de blocs de large comme avant. Elle regarde
// le large : son bras droit (le flambeau) vers +z du plan, son visage vers +x.
export const LIBERTE = { centre: [-0.2, 0.4], sol: 1.2, terrasse: 1.6, terrasse4: 4.1, fort: 3, flambeau: 9.37, rayon: 2.6, haut: 42.5, sh: 4.6 };
{
  const L = LIBERTE, [cx, cz] = L.centre;
  const SV = (L.haut - L.fort) / (L.flambeau - L.terrasse);
  const hauteur = (y) => y < L.terrasse ? ((y - L.sol) / (L.terrasse - L.sol)) * L.fort : L.fort + (y - L.terrasse) * SV;
  const paquet = lire(path.join(source, 'statue_of_liberty_new_york_ny_usa'));
  // LE CAP SE MESURE : le flambeau est au-dessus du bras droit. Sa direction depuis
  // l'axe de la statue (à hauteur des épaules) donne la droite de la statue.
  let tx = 0, tz = 0, tn = 0, ax = 0, az = 0, an = 0;
  for (const p of paquet.prims) for (let k = 0; k < p.pos.length; k += 3) {
    const [x, y, z] = [p.pos[k], p.pos[k + 1], p.pos[k + 2]];
    if (Math.hypot(x - cx, z - cz) > 1.2) continue;
    if (y > L.flambeau - 0.35) { tx += x; tz += z; tn++; }
    else if (y > 6.6 && y < 7.4) { ax += x; az += z; an++; }
  }
  const droite = Math.atan2(tz / tn - az / an, tx / tn - ax / an);
  // la droite de la statue va vers +z du jeu : on tourne de (π/2 − droite)
  const rot = Math.PI / 2 - droite, co = Math.cos(rot), si = Math.sin(rot);
  const ox = ax / an, oz = az / an;
  const garder = (...v) => v.every(([x, , z]) => Math.hypot(x - cx, z - cz) < L.rayon) && Math.max(...v.map((p) => p[1])) > L.sol + 0.12;
  const placer = ([x, y, z]) => {
    const dx = x - ox, dz = z - oz;
    return [(dx * co - dz * si) * L.sh, Math.max(-0.3, hauteur(y)), (dx * si + dz * co) * L.sh];
  };
  const brut = decouper(paquet, garder, placer);
  const proche = decimer(brut, 0.03), loin = decimer(brut, 0.4, 2500);
  const { sorties: [p2, l2], jpeg } = await cuire('liberte', brut, paquet.image, [proche, loin], 2048);
  const octets = ecrireGlb(path.join(sortie, 'statue-liberte.glb'), [['proche', p2], ['loin', l2]], jpeg,
    '"Statue of Liberty, New York, NY, USA" (https://sketchfab.com/3d-models/statue-of-liberty-new-york-ny-usa-8401e1c10480476e8d7e3085d1aec923) by Brian Trepanier (https://sketchfab.com/CMBC), CC-BY-4.0');
  console.log(`liberte: ${triangles(brut)} → ${triangles(proche)} proche, ${triangles(loin)} loin ; ${(octets / 1e6).toFixed(2)} Mo ; cap droite ${(droite * 180 / Math.PI).toFixed(1)}° ; SV ${SV.toFixed(3)}`);
  // LE VOXEL SUIT LE MODÈLE (la règle de la tour Eiffel, v564). Couche par couche,
  // la coupe du modèle à mi-hauteur de la couche se trace sur une grille fine (un
  // quart de bloc), ses murs épaissis d'une maille pour refermer les petits trous
  // de la photogrammétrie ; on remplit le DEHORS depuis le bord, et une cellule du
  // jeu est pleine si les trois quarts de ses mailles sont dedans. Le voxel reste
  // donc sous la peau du modèle : on ne bute pas sur un mur qu'on ne voit pas. (Un
  // vote de rayons à parité a été écrit et mesuré : le socle, percé de loggias,
  // n'avait plus que deux cellules par couche.)
  const R = 14, NY = 43, F = 4, N = 2 * R * F, plein = new Uint8Array((2 * R) * NY * (2 * R));
  // LE FORT ET LE SOCLE SONT UNE CARTE DES HAUTEURS, LA STATUE UNE PILE DE COUPES.
  // Une coupe ne sait pas qu'une terrasse a un sol : sous le parapet du fort, elle
  // remplissait la terrasse d'un bloc de trop, et l'enfant y aurait marché en
  // l'air (mesuré : 214 cellules à dy 3). Jusqu'au haut du socle, chaque colonne
  // monte à la hauteur MÉDIANE de la peau du modèle au-dessus d'elle (un parapet
  // fin ne la relève pas) ; au-dessus, les coupes.
  const haut = (L.terrasse4 - L.terrasse) * SV + L.fort, socle = Math.round(haut);
  const toit = new Float32Array(N * N).fill(-1);
  for (let t = 0; t < brut.idx.length; t += 3) {
    const P = [0, 1, 2].map((k) => brut.idx[t + k] * 3).map((i) => [brut.pos[i], brut.pos[i + 1], brut.pos[i + 2]]);
    const x0 = Math.max(0, Math.floor((Math.min(P[0][0], P[1][0], P[2][0]) + R) * F)), x1 = Math.min(N - 1, Math.floor((Math.max(P[0][0], P[1][0], P[2][0]) + R) * F));
    const z0 = Math.max(0, Math.floor((Math.min(P[0][2], P[1][2], P[2][2]) + R) * F)), z1 = Math.min(N - 1, Math.floor((Math.max(P[0][2], P[1][2], P[2][2]) + R) * F));
    const aire = (P[1][0] - P[0][0]) * (P[2][2] - P[0][2]) - (P[2][0] - P[0][0]) * (P[1][2] - P[0][2]);
    if (Math.abs(aire) < 1e-9) continue;
    for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) {
      const px = (gx + 0.5) / F - R, pz = (gz + 0.5) / F - R;
      const w1 = ((px - P[0][0]) * (P[2][2] - P[0][2]) - (P[2][0] - P[0][0]) * (pz - P[0][2])) / aire;
      const w2 = ((P[1][0] - P[0][0]) * (pz - P[0][2]) - (px - P[0][0]) * (P[1][2] - P[0][2])) / aire;
      if (w1 < 0 || w2 < 0 || w1 + w2 > 1) continue;
      const y = P[0][1] * (1 - w1 - w2) + P[1][1] * w1 + P[2][1] * w2;
      if (y <= haut + 0.3) toit[gz * N + gx] = Math.max(toit[gz * N + gx], y);
    }
  }
  for (let z = 0; z < 2 * R; z++) for (let x = 0; x < 2 * R; x++) {
    const v = [];
    for (let fz = 0; fz < F; fz++) for (let fx = 0; fx < F; fx++) v.push(toit[(z * F + fz) * N + x * F + fx]);
    v.sort((a, b) => a - b);
    const h = Math.min(socle, Math.round(v[v.length >> 1]));
    for (let dy = 0; dy < h; dy++) plein[(dy * 2 * R + z) * 2 * R + x] = 1;
  }
  for (let dy = socle; dy < NY; dy++) {
    const yc = dy + 0.5, mur = new Uint8Array(N * N);
    for (let t = 0; t < brut.idx.length; t += 3) {
      const P = [0, 1, 2].map((k) => brut.idx[t + k] * 3).map((i) => [brut.pos[i], brut.pos[i + 1], brut.pos[i + 2]]);
      const pts = [];
      for (let k = 0; k < 3; k++) {
        const a = P[k], c = P[(k + 1) % 3];
        if ((a[1] - yc) * (c[1] - yc) < 0) { const f = (yc - a[1]) / (c[1] - a[1]); pts.push([a[0] + f * (c[0] - a[0]), a[2] + f * (c[2] - a[2])]); }
      }
      if (pts.length !== 2) continue;
      const n = Math.ceil(Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) * F * 2) + 1;
      for (let i = 0; i <= n; i++) {
        const gx = Math.floor((pts[0][0] + (i / n) * (pts[1][0] - pts[0][0]) + R) * F), gz = Math.floor((pts[0][1] + (i / n) * (pts[1][1] - pts[0][1]) + R) * F);
        for (let ez = -1; ez <= 1; ez++) for (let ex = -1; ex <= 1; ex++) {
          const X = gx + ex, Z = gz + ez;
          if (X >= 0 && X < N && Z >= 0 && Z < N) mur[Z * N + X] = 1;
        }
      }
    }
    const dehors = new Uint8Array(N * N), pile = [];
    for (let i = 0; i < N; i++) for (const [x, z] of [[i, 0], [i, N - 1], [0, i], [N - 1, i]]) if (!mur[z * N + x] && !dehors[z * N + x]) { dehors[z * N + x] = 1; pile.push(z * N + x); }
    while (pile.length) {
      const c = pile.pop(), x = c % N, z = (c / N) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Z = z + dz;
        if (X < 0 || X >= N || Z < 0 || Z >= N) continue;
        const k = Z * N + X;
        if (!mur[k] && !dehors[k]) { dehors[k] = 1; pile.push(k); }
      }
    }
    for (let z = 0; z < 2 * R; z++) for (let x = 0; x < 2 * R; x++) {
      let dedans = 0;
      for (let fz = 0; fz < F; fz++) for (let fx = 0; fx < F; fx++) dedans += dehors[(z * F + fz) * N + x * F + fx] ? 0 : 1;
      if (dedans >= 0.75 * F * F) plein[(dy * 2 * R + z) * 2 * R + x] = 1;
    }
  }
  // le fort est une terrasse pleine : sous sa peau, aucune cellule ne reste vide
  const cellules = plein.reduce((a, b) => a + b, 0);
  donnees.LIBERTE_VOXELS = { R, NY, bits: Buffer.from(plein.reduce((o, v, i) => { if (v) o[i >> 3] |= 1 << (i & 7); return o; }, new Uint8Array(Math.ceil(plein.length / 8)))).toString('base64') };
  donnees.LIBERTE_SOCLE = socle;
  console.log(`liberte: socle ${socle} ; ${cellules} cellules de voxel ; couches pleines par dy :`, Array.from({ length: NY }, (_, dy) => { let n = 0; for (let i = 0; i < 4 * R * R; i++) n += plein[dy * 4 * R * R + i]; return n; }).join(' '));
}

if (fichierDonnees) {
  const js = `// NEW YORK D'APRÈS LES MODÈLES DE MAX (v565) — fichier ENGENDRÉ par
// scripts/new-york.mjs, ne pas modifier à la main.
//
// EMPIRE_NIVEAUX : les retraits de l'Empire State (manhattan-plan.js, \`niveaux\`),
// mesurés DANS le modèle photogrammétrique ; [largeur, profondeur en fraction de
// la boîte de 26 × 28 blocs, sommet en blocs au-dessus de la rue].
// LIBERTE_VOXELS : la statue, son socle et son fort voxelisés d'après le modèle ;
// cellule (x, dy, z) pleine au bit ((dy · 2R + z + R) · 2R + x + R), x et z autour
// de l'axe de la statue, dy au-dessus du sol de l'île.
export const EMPIRE_NIVEAUX = ${JSON.stringify(donnees.EMPIRE_NIVEAUX)};
export const EMPIRE_SOMMET = ${donnees.EMPIRE_SOMMET};
export const LIBERTE_VOXELS = ${JSON.stringify(donnees.LIBERTE_VOXELS)};
export const LIBERTE_SOCLE = ${donnees.LIBERTE_SOCLE};
`;
  fs.writeFileSync(fichierDonnees, js);
}

// =============================================================================
// LES MATIÈRES DE LA VILLE. Les autres paquets de Max ne sont pas des monuments :
// ce sont des PHOTOS de matières new-yorkaises, et c'est ainsi qu'on s'en sert.
// Les matériaux de Manhattan (manhattan-materiaux.js) plaquent leur image en
// coordonnées du monde, une tuile tous les `taille` blocs ; on leur donne des
// images vraies à la place des motifs peints au chargement :
// - « Low road » de Yarelon : l'asphalte uni (Material.007) pour la chaussée, le
//   dallage de pierre (Material.004) pour les allées et les places ;
// - « FACHADA CRtr New York » de Roberto Domínguez : la pierre de taille d'une
//   façade Beaux-Arts, pour le calcaire et les bandeaux de près ;
// - « New York Buildings » de sumitmangela : quatre façades photographiées pour
//   les silhouettes lointaines — briques à escaliers de secours (Material.013),
//   brownstone (Material.015), calcaire de bureaux (Material.002), mur-rideau
//   (Material.005) — et, tirées de chacune, ses fenêtres allumées la nuit.
// Chaque image est carrée (512 px) : le plaquage la répète en miroir, sans joint.
// LES DÉCOUPES GARDENT LE RYTHME DU JEU : trois blocs par étage. La brique et le
// brownstone en portent quatre (une tuile de 12 blocs, comme les façades peintes
// d'avant), le calcaire et le verre dix à onze (une tuile de 32 blocs).
const MATIERES = [
  { nom: 'chaussee', src: 'low_road/textures/Material.007_baseColor.jpeg' },
  { nom: 'allee', src: 'low_road/textures/Material.004_baseColor.jpeg' },
  { nom: 'pierre', src: 'fachada_crtr_new_york/textures/a1ef7d74_9e4281c8_baseColor.jpeg', zone: { left: 77, top: 3027, width: 709, height: 1026 }, tourner: 90, gris: 0.35 },
  { nom: 'facade-brique', src: 'new_york_buildings/textures/Material.013_baseColor.png', zone: { left: 0, top: 4, width: 372, height: 313 }, nuit: true },
  { nom: 'facade-brownstone', src: 'new_york_buildings/textures/Material.015_baseColor.png', zone: { left: 0, top: 0, width: 1024, height: 680 }, nuit: true },
  { nom: 'facade-calcaire', src: 'new_york_buildings/textures/Material.002_baseColor.png', zone: { left: 48, top: 800, width: 420, height: 420 }, nuit: true },
  { nom: 'facade-verre', src: 'new_york_buildings/textures/Material.005_baseColor.png', zone: { left: 0, top: 1300, width: 512, height: 512 }, nuit: true, vitres: 'claires' },
  // LA DIVERSITÉ (Max : « Manhattan, c'est vraiment très boring, tout se
  // ressemble »). Chaque famille de façades lointaines a plusieurs variantes,
  // et chaque immeuble tire la sienne (manhattan-plan.js, `variante`).
  { nom: 'facade-brique-2', src: 'new_york_buildings/textures/Material.016_baseColor.png', zone: { left: 0, top: 300, width: 1024, height: 400 }, nuit: true },
  { nom: 'facade-brique-3', src: 'new_york_buildings/textures/Material.016_baseColor.png', zone: { left: 1180, top: 560, width: 868, height: 400 }, nuit: true },
  { nom: 'facade-brique-4', src: 'new_york_buildings/textures/Material.014_baseColor.png', zone: { left: 336, top: 600, width: 516, height: 720 }, nuit: true },
  { nom: 'facade-calcaire-2', src: 'new_york_buildings/textures/Material.012_baseColor.png', zone: { left: 0, top: 110, width: 512, height: 250 }, nuit: true },
  { nom: 'facade-calcaire-3', src: 'new_york_buildings/textures/Material.007_baseColor.png', zone: { left: 0, top: 246, width: 512, height: 471 }, nuit: true },
  { nom: 'facade-verre-2', src: 'new_york_buildings/textures/Material.008_baseColor.png', zone: { left: 410, top: 400, width: 337, height: 337 }, nuit: true, vitres: 'claires' },
];
for (const m of MATIERES) {
  let img = sharp(path.join(source, m.src), { limitInputPixels: false }).removeAlpha();
  if (m.zone) img = img.extract(m.zone);
  // sharp tourne AVANT de découper si on chaîne les deux : on découpe d'abord
  if (m.tourner) img = sharp(await img.png().toBuffer()).rotate(m.tourner);
  const brut = await img.resize(512, 512, { fit: 'fill' }).raw().toBuffer();
  if (m.gris !== undefined) for (let i = 0; i < brut.length; i += 3) {
    const l = 0.2126 * brut[i] + 0.7152 * brut[i + 1] + 0.0722 * brut[i + 2];
    for (let k = 0; k < 3; k++) brut[i + k] = Math.round(l + (brut[i + k] - l) * m.gris);
  }
  await sharp(brut, { raw: { width: 512, height: 512, channels: 3 } }).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(sortie, `${m.nom}.jpg`));
  if (!m.nuit) { console.log(`matière ${m.nom}`); continue; }
  // LES FENÊTRES ALLUMÉES SE LISENT DANS LA PHOTO : une fenêtre est plus sombre
  // que le mur qui l'entoure (luminance sous 62 % de la moyenne locale, sur
  // 33 px) ; une sur deux environ s'allume, tirée par case de 24 px. Sur un
  // mur-rideau c'est l'inverse — les meneaux sont sombres, les vitres claires.
  const L = new Float32Array(512 * 512);
  for (let i = 0; i < L.length; i++) L[i] = 0.2126 * brut[3 * i] + 0.7152 * brut[3 * i + 1] + 0.0722 * brut[3 * i + 2];
  const integrale = new Float64Array(513 * 513);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) integrale[(y + 1) * 513 + x + 1] = L[y * 512 + x] + integrale[y * 513 + x + 1] + integrale[(y + 1) * 513 + x] - integrale[y * 513 + x];
  const nuit = Buffer.alloc(512 * 512);
  let allumes = 0;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const x0 = Math.max(0, x - 16), x1 = Math.min(512, x + 17), y0 = Math.max(0, y - 16), y1 = Math.min(512, y + 17);
    const moy = (integrale[y1 * 513 + x1] - integrale[y0 * 513 + x1] - integrale[y1 * 513 + x0] + integrale[y0 * 513 + x0]) / ((x1 - x0) * (y1 - y0));
    const h = Math.imul((x / 24) | 0, 374761393) ^ Math.imul((y / 24) | 0, 668265263);
    const tirage = ((Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) % 1000) / 1000;
    const vitre = m.vitres === 'claires' ? L[y * 512 + x] > 1.08 * moy : L[y * 512 + x] < 0.62 * moy;
    if (vitre && tirage > 0.48) { nuit[y * 512 + x] = 255; allumes++; }
  }
  await sharp(nuit, { raw: { width: 512, height: 512, channels: 1 } }).blur(0.8).jpeg({ quality: 80 }).toFile(path.join(sortie, `${m.nom}-nuit.jpg`));
  console.log(`matière ${m.nom} (fenêtres allumées : ${((100 * allumes) / nuit.length).toFixed(1)} % des texels)`);
}
