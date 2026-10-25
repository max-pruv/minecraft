// Conversion reproductible des trois modèles « police » fournis par Max
// (octobre 2026, Sketchfab, CC-BY-4.0 — crédits dans vendor/voitures/LICENSE.md
// et vendor/humains/LICENSE.md). Les paquets bruts (scene.gltf, scene.bin,
// textures/) restent hors du dépôt ; seules les GLB converties sont livrées.
//
//   node scripts/convertir-police.mjs <police_car/> <harley-davidson_police/> <police_man_sg/>
//
// Ce que la conversion fait, et pourquoi :
//  · LE CONTRAT DE LA FLOTTE (docs/standard-creation-voitures.md) : mètres,
//    +Y en haut, +Z vers l'avant, roues au sol à y = 0, pivots `Wheel_FL/FR/
//    RL/RR` (la moto : `Wheel_F`, `Wheel_R`) posés au centre du pneu. Le reste
//    de la carrosserie est FUSIONNÉ par matériau : un appel de dessin par
//    matière, pas un par pièce (v196).
//  · LA VOITURE : échelle sur l'empattement réel de la Ford Crown Victoria
//    Police Interceptor (2,913 m). Le vitrage et la rampe passent de
//    `KHR_materials_transmission` (une passe de rendu de plus, chère sur
//    l'iPad) à une transparence simple, comme le reste de la flotte. Les
//    feux de la rampe sont séparés en deux lentilles, `Gyrophare_G` (rouge)
//    et `Gyrophare_D` (bleu), que le jeu allume par leur couleur émissive —
//    une uniforme, jamais un programme neuf.
//  · LA MOTO : la Harley est livrée penchée sur sa béquille (environ 7°) et
//    posée sur un sol de vitrine. On retire le sol, on redresse la machine
//    sur l'axe de ses roues (mesuré par l'analyse du pneu), et on l'allège
//    (658 000 triangles d'origine).
//  · LE POLICIER : matériaux « specular-glossiness » (que three ne lit plus)
//    rendus en matériaux standard, hauteur 1,80 m, pieds à y = 0, face +Z.
//  · Les maillages sont simplifiés par meshoptimizer (bords verrouillés pour
//    garder les coutures d'UV), les textures redimensionnées et recompressées
//    par sharp. Rien n'est inventé : forme et textures sont celles des auteurs.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeVertices, mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer';

globalThis.window = { URL };
globalThis.ProgressEvent = class { constructor(t, o) { Object.assign(this, o); this.type = t; } };
globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then((x) => { this.result = x; this.onloadend?.(); }); }
  readAsDataURL(b) { b.arrayBuffer().then((x) => { this.result = 'data:' + b.type + ';base64,' + Buffer.from(x).toString('base64'); this.onloadend?.(); }); }
};

const [dirVoiture, dirMoto, dirPolicier] = process.argv.slice(2).map((d) => path.resolve(d));
const racine = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
await MeshoptSimplifier.ready;

// --- chargement : les buffers en ligne, les images en souches ---------------
async function charger(dir) {
  const json = JSON.parse(fs.readFileSync(path.join(dir, 'scene.gltf'), 'utf8'));
  for (const b of json.buffers) {
    const data = fs.readFileSync(path.join(dir, b.uri));
    b.uri = 'data:application/octet-stream;base64,' + data.toString('base64');
  }
  const loader = new GLTFLoader();
  // Les textures ne se décodent pas sous node : une souche qui retient le nom
  // du fichier source, que l'exportation remplace par l'image recompressée.
  loader.register((parser) => ({
    name: 'souches',
    loadTexture(i) {
      const src = json.images[json.textures[i].source].uri;
      const t = new THREE.Texture();
      t.userData.source = path.join(dir, decodeURIComponent(src));
      t.flipY = false;
      return Promise.resolve(t);
    },
  }));
  const gltf = await loader.parseAsync(JSON.stringify(json), '');
  gltf.scene.updateMatrixWorld(true);
  return { gltf, json };
}

// Chaque maillage, sa géométrie CUITE dans le repère du monde.
function maillagesCuits(scene) {
  const out = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const noms = [];
    for (let p = o; p; p = p.parent) noms.push(p.name || '');
    out.push({ g, m: o.material, nom: noms.join('/'), mat: o.material.name || '' });
  });
  return out;
}

function boite(g) { g.computeBoundingBox(); return g.boundingBox.clone(); }

// Simplification à `ratio` des triangles, erreur bornée.
function simplifier(g, ratio, erreur = 0.01) {
  const keep = ['position', 'normal', 'uv'];
  for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  let m = mergeVertices(g, 1e-6);
  if (ratio >= 1) return m;
  const idx = new Uint32Array(m.index.array);
  const pos = new Float32Array(m.attributes.position.array);
  const cible = Math.max(3, Math.floor((idx.length / 3) * ratio) * 3);
  const [res] = MeshoptSimplifier.simplify(idx, pos, 3, cible, erreur, ['LockBorder']);
  m.setIndex(new THREE.BufferAttribute(res, 1));
  // les sommets que plus aucun triangle n'emploie partent
  return compacter(m);
}

function compacter(g) {
  const idx = g.index.array, n = g.attributes.position.count;
  const map = new Int32Array(n).fill(-1);
  let k = 0;
  for (const i of idx) if (map[i] < 0) map[i] = k++;
  const out = new THREE.BufferGeometry();
  for (const [nom, a] of Object.entries(g.attributes)) {
    const arr = new Float32Array(k * a.itemSize);
    for (let i = 0; i < n; i++) if (map[i] >= 0) for (let c = 0; c < a.itemSize; c++) arr[map[i] * a.itemSize + c] = a.array[i * a.itemSize + c];
    out.setAttribute(nom, new THREE.BufferAttribute(arr, a.itemSize));
  }
  const ni = k > 65535 ? new Uint32Array(idx.length) : new Uint16Array(idx.length);
  for (let i = 0; i < idx.length; i++) ni[i] = map[idx[i]];
  out.setIndex(new THREE.BufferAttribute(ni, 1));
  return out;
}

function fusionner(liste) {
  if (liste.length === 1) return liste[0];
  for (const g of liste) {
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  }
  return mergeGeometries(liste, false);
}

// Une matière standard à partir de ce que GLTFLoader a lu.
function matiere(m, options = {}) {
  const n = new THREE.MeshStandardMaterial({
    name: options.nom || m.name,
    color: options.color ?? (m.color ? m.color.clone() : new THREE.Color(1, 1, 1)),
    roughness: options.roughness ?? (m.roughness ?? 0.6),
    metalness: options.metalness ?? (m.metalness ?? 0),
    side: options.side ?? m.side,
    transparent: options.transparent ?? m.transparent,
    opacity: options.opacity ?? m.opacity,
  });
  if (m.emissive && !options.sansEmissif) n.emissive.copy(m.emissive);
  if (options.alphaTest) n.alphaTest = options.alphaTest;
  n.userData.sources = {
    color: options.sansCarte ? null : m.map?.userData.source,
    // AUCUNE CARTE DE RUGOSITÉ NI DE NORMALES : chaque combinaison de cartes
    // est un programme de shader de plus, compilé pendant l'accueil (v246,
    // `signatures.js`). Les trois modèles sont rendus avec les signatures que
    // la flotte a déjà ; la rugosité et le métal passent en facteurs.
    mr: null,
    normal: null,
    emissive: options.sansEmissif ? null : m.emissiveMap?.userData.source,
    dim: options.dim || 1024,
    alpha: !!(options.transparent ?? m.transparent) || !!options.alphaTest,
  };
  return n;
}

// --- exportation GLB, images recompressées par sharp ------------------------
async function exporter(racineScene, fichier) {
  const gltf = await new GLTFExporter().parseAsync(racineScene, { binary: false, onlyVisible: false });
  const chunks = [Buffer.from(gltf.buffers[0].uri.split(',')[1], 'base64')];
  let length = chunks[0].length;
  const push = (b) => {
    const pad = (4 - (length % 4)) % 4;
    if (pad) { chunks.push(Buffer.alloc(pad)); length += pad; }
    const off = length; chunks.push(b); length += b.length; return off;
  };
  gltf.images = []; gltf.textures = [];
  gltf.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
  const memo = new Map();
  const image = async (src, dim, alpha, type) => {
    const cle = src + '|' + dim + '|' + alpha + '|' + type;
    if (memo.has(cle)) return memo.get(cle);
    let t = sharp(fs.readFileSync(src)).resize(dim, dim, { fit: 'inside', withoutEnlargement: true });
    let b, mime;
    if (alpha && type === 'color') { b = await t.png({ compressionLevel: 9, palette: false }).toBuffer(); mime = 'image/png'; }
    else { b = await t.removeAlpha().jpeg({ quality: type === 'color' ? 86 : 90 }).toBuffer(); mime = 'image/jpeg'; }
    const view = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset: push(b), byteLength: b.length });
    const img = gltf.images.length;
    gltf.images.push({ bufferView: view, mimeType: mime });
    const tex = gltf.textures.length;
    gltf.textures.push({ sampler: 0, source: img });
    memo.set(cle, tex);
    return tex;
  };
  for (const mat of gltf.materials || []) {
    const src = mat.extras?.sources || {};
    delete mat.extras;
    mat.pbrMetallicRoughness = mat.pbrMetallicRoughness || {};
    if (src.color) mat.pbrMetallicRoughness.baseColorTexture = { index: await image(src.color, src.dim, src.alpha, 'color') };
    if (src.mr) mat.pbrMetallicRoughness.metallicRoughnessTexture = { index: await image(src.mr, Math.min(512, src.dim), false, 'mr') };
    if (src.normal) mat.normalTexture = { index: await image(src.normal, Math.min(512, src.dim), false, 'normal') };
    if (src.emissive) mat.emissiveTexture = { index: await image(src.emissive, Math.min(512, src.dim), false, 'emissive') };
  }
  gltf.buffers = [{ byteLength: length }];
  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
  let bin = Buffer.concat(chunks);
  bin = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length); bh.writeUInt32LE(0x004e4942, 4);
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  fs.writeFileSync(fichier, Buffer.concat([header, jh, json, bh, bin]));
  let tri = 0, maillages = 0;
  racineScene.traverse((o) => { if (o.isMesh) { maillages++; tri += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
  console.log(JSON.stringify({ fichier: path.relative(racine, fichier), octets: fs.statSync(fichier).size, triangles: tri, maillages, images: gltf.images.length }));
}

// Une transformation qui pose (axe, haut, avant) sur (X, Y, Z) puis met à
// l'échelle. `avant` et `haut` sont des vecteurs unitaires du repère source.
function repere(avant, haut, echelle) {
  const z = avant.clone().normalize();
  const y = haut.clone().sub(z.clone().multiplyScalar(haut.dot(z))).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z).transpose();   // monde → (x, y, z)
  return new THREE.Matrix4().makeScale(echelle, echelle, echelle).multiply(m);
}

function maillage(g, mat, nom) {
  const m = new THREE.Mesh(g, mat);
  m.name = nom;
  return m;
}

// ===========================================================================
// 1. LA VOITURE DE POLICE (Ford Crown Victoria Police Interceptor)
// ===========================================================================
{
  const { gltf } = await charger(dirVoiture);
  const pieces = maillagesCuits(gltf.scene);
  // (GLTFLoader retire les points des noms : « CrownVic.Wheel.Ft.L » se lit
  // « CrownVicWheelFtL »)
  const roue = (cle) => pieces.find((p) => p.mat === 'wheel' && p.nom.startsWith('CrownVic' + cle));
  const centre = (p) => boite(p.g).getCenter(new THREE.Vector3());
  const fl = centre(roue('WheelFtL')), fr = centre(roue('WheelFtR')), bl = centre(roue('WheelBkL'));
  const avant = fl.clone().sub(bl).normalize();
  const echelle = 2.913 / fl.distanceTo(bl);
  // le haut : perpendiculaire à l'avant et à la voie
  const voie = fl.clone().sub(fr).normalize();
  const haut = new THREE.Vector3().crossVectors(avant, voie).normalize();
  if (haut.y < 0) haut.negate();
  const M = repere(avant, haut, echelle);
  for (const p of pieces) { p.g.applyMatrix4(M); if (p.g.attributes.normal) p.g.computeVertexNormals(); }
  let ymin = Infinity;
  for (const p of pieces) ymin = Math.min(ymin, boite(p.g).min.y);
  // le modèle d'origine n'est pas centré sur sa voie : on pose le milieu des
  // quatre roues à l'origine
  const milieuX = (centre(roue('WheelFtL')).x + centre(roue('WheelFtR')).x) / 2;
  const recentre = new THREE.Matrix4().makeTranslation(-milieuX, -ymin, -(centre(roue('WheelFtL')).z + centre(roue('WheelBkL')).z) / 2);
  for (const p of pieces) p.g.applyMatrix4(recentre);

  const racineScene = new THREE.Group();
  racineScene.name = 'PoliceCar';
  // les roues : un pivot au centre du pneu, la géométrie relative à lui
  const matRoue = matiere(roue('WheelFtL').m, { nom: 'Tire_Wheel', dim: 512 });
  for (const [cle, nom] of [['WheelFtL', 'Wheel_FL'], ['WheelFtR', 'Wheel_FR'], ['WheelBkL', 'Wheel_RL'], ['WheelBkR', 'Wheel_RR']]) {
    const p = roue(cle);
    const c = centre(p);
    p.g.translate(-c.x, -c.y, -c.z);
    const pivot = new THREE.Group();
    pivot.name = nom;
    pivot.position.copy(c);
    pivot.add(maillage(simplifier(p.g, 0.22, 0.004), matRoue, nom + '_Tire'));
    racineScene.add(pivot);
    p.fait = true;
  }
  // la rampe : deux lentilles séparées, rouge à gauche (+X), bleue à droite
  const feux = pieces.find((p) => p.mat === 'roof_lights');
  feux.fait = true;
  const gf = simplifier(feux.g, 1);
  const cote = (signe) => {
    const idx = gf.index.array, pos = gf.attributes.position;
    const garde = [];
    for (let i = 0; i < idx.length; i += 3) {
      const x = (pos.getX(idx[i]) + pos.getX(idx[i + 1]) + pos.getX(idx[i + 2])) / 3;
      if (Math.sign(x) === signe) garde.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    const g = gf.clone(); g.setIndex(garde); return compacter(g);
  };
  const lentille = (couleur, nom) => new THREE.MeshStandardMaterial({ name: nom, color: couleur, roughness: 0.25, metalness: 0, emissive: 0x000000 });
  racineScene.add(maillage(cote(1), lentille(0xb01818, 'Gyrophare_Rouge'), 'Gyrophare_G'));
  racineScene.add(maillage(cote(-1), lentille(0x1c3cc0, 'Gyrophare_Bleu'), 'Gyrophare_D'));
  // le reste, fusionné par matériau
  const parMat = new Map();
  for (const p of pieces) {
    if (p.fait) continue;
    if (!parMat.has(p.mat)) parMat.set(p.mat, { m: p.m, liste: [] });
    parMat.get(p.mat).liste.push(p.g);
  }
  const reglages = {
    // `Livree_Police`, pas `body` : la livrée noir et blanc ne se repeint
    // jamais (`EST_LAQUE`) et ne reçoit pas la sonde des reflets — c'est ce
    // qui garde sa signature dans la table (`Standard+map`).
    body: { ratio: 0.55, erreur: 0.002, opts: { nom: 'Livree_Police', dim: 2048, roughness: 0.38, metalness: 0.1 } },
    glass: { ratio: 1, opts: { nom: 'glass', color: new THREE.Color(0.05, 0.07, 0.09), roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45, sansCarte: true } },
    interior: { ratio: 1, opts: { nom: 'interior', dim: 1024, transparent: false, opacity: 1, sansEmissif: true } },
    // « rampe », pas « light bar » : `RE_FEU` (vehicules.js) lit `light` dans un
    // nom comme un bloc optique, et poserait les feux de détresse sur le toit
    roof_light_bar: { ratio: 0.5, erreur: 0.003, nomMaillage: 'Body_rampe', opts: { nom: 'rampe', transparent: true, opacity: 0.55, sansCarte: true, color: new THREE.Color(0.85, 0.88, 0.92), roughness: 0.15, side: THREE.FrontSide } },
    brake: { ratio: 1, opts: { nom: 'brake', dim: 256 } },
  };
  for (const [mat, { m, liste }] of parMat) {
    const r = reglages[mat] || { ratio: 0.6, opts: {} };
    const g = simplifier(fusionner(liste), r.ratio, r.erreur);
    racineScene.add(maillage(g, matiere(m, r.opts), r.nomMaillage || 'Body_' + mat));
  }
  await exporter(racineScene, path.join(racine, 'vendor/voitures/police-car.glb'));
}

// ===========================================================================
// 2. LA MOTO DE POLICE (Harley-Davidson Electra Glide Police)
// ===========================================================================
{
  const { gltf } = await charger(dirMoto);
  // le sol de vitrine part, et le décalque du coffre (une image à canal
  // alpha : un programme de plus pour un logo de trois centimètres)
  let pieces = maillagesCuits(gltf.scene).filter((p) => p.mat !== 'floor' && p.mat !== 'trunk_logo');
  const pneus = pieces.filter((p) => p.mat === 'tyre');
  // les deux pneus : un tri par position le long du plus grand écart
  const cs = pneus.map((p) => boite(p.g).getCenter(new THREE.Vector3()));
  // l'axe d'une roue : la direction de plus petite étendue de ses sommets (PCA)
  const axe = (g) => {
    const a = g.attributes.position, c = new THREE.Vector3(), n = a.count;
    for (let i = 0; i < n; i++) c.add(new THREE.Vector3().fromBufferAttribute(a, i));
    c.multiplyScalar(1 / n);
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < n; i++) {
      const v = [a.getX(i) - c.x, a.getY(i) - c.y, a.getZ(i) - c.z];
      for (let r = 0; r < 3; r++) for (let s = 0; s < 3; s++) C[r][s] += v[r] * v[s];
    }
    // itération de puissance sur (trace·I − C) : son plus grand vecteur propre
    // est le plus petit de C
    const tr = C[0][0] + C[1][1] + C[2][2];
    let v = new THREE.Vector3(1, 0.3, 0.2).normalize();
    for (let k = 0; k < 200; k++) {
      const w = new THREE.Vector3(
        tr * v.x - (C[0][0] * v.x + C[0][1] * v.y + C[0][2] * v.z),
        tr * v.y - (C[1][0] * v.x + C[1][1] * v.y + C[1][2] * v.z),
        tr * v.z - (C[2][0] * v.x + C[2][1] * v.y + C[2][2] * v.z));
      v = w.normalize();
    }
    return v;
  };
  // regroupe les pneus en deux roues par proximité
  const roues = [];
  for (let i = 0; i < pneus.length; i++) {
    const r = roues.find((r) => r.c.distanceTo(cs[i]) < 20);
    if (r) r.liste.push(pneus[i]); else roues.push({ c: cs[i].clone(), liste: [pneus[i]] });
  }
  if (roues.length !== 2) throw new Error('moto : ' + roues.length + ' roues trouvées');
  for (const r of roues) {
    const g = fusionner(r.liste.map((p) => p.g.clone()));
    r.b = boite(g); r.c = r.b.getCenter(new THREE.Vector3()); r.axe = axe(g);
  }
  // l'arrière : là où est le feu rouge
  const rouge = pieces.find((p) => p.mat === 'red_glass');
  const cRouge = boite(rouge.g).getCenter(new THREE.Vector3());
  roues.sort((a, b) => b.c.distanceTo(cRouge) - a.c.distanceTo(cRouge));    // [avant, arrière]
  const [ra, rr] = roues;
  const avant = ra.c.clone().sub(rr.c);
  // le haut : perpendiculaire à l'avant ET à l'axe des roues — c'est ce qui
  // redresse la machine posée sur sa béquille
  const axeMoyen = ra.axe.clone().add(rr.axe.dot(ra.axe) < 0 ? rr.axe.clone().negate() : rr.axe).normalize();
  const haut = new THREE.Vector3().crossVectors(axeMoyen, avant).normalize();
  // le haut doit pointer vers la selle, pas sous le moteur
  const selle = pieces.filter((p) => p.mat === 'seat').map((p) => boite(p.g).getCenter(new THREE.Vector3()))[0];
  if (selle && selle.clone().sub(rr.c).dot(haut) < 0) haut.negate();
  // Electra Glide : empattement 1 625 mm
  const echelle = 1.625 / ra.c.distanceTo(rr.c);
  const M = repere(avant, haut, echelle);
  for (const p of pieces) { p.g.applyMatrix4(M); p.g.computeVertexNormals(); }
  const cA = ra.c.clone().applyMatrix4(M), cR = rr.c.clone().applyMatrix4(M);
  // au sol : le bas des pneus
  let ymin = Infinity;
  for (const p of pieces) if (p.mat === 'tyre') ymin = Math.min(ymin, boite(p.g).min.y);
  const T = new THREE.Matrix4().makeTranslation(-(cA.x + cR.x) / 2, -ymin, -(cA.z + cR.z) / 2);
  for (const p of pieces) p.g.applyMatrix4(T);
  cA.applyMatrix4(T); cR.applyMatrix4(T);
  const rayon = (cA.y + cR.y) / 2;

  const racineScene = new THREE.Group();
  racineScene.name = 'PoliceMoto';
  // une pièce appartient à une roue si sa boîte tient dans le disque du pneu
  // (jante, rayons, disque de frein, moyeu) ; l'étrier et la fourche, plus
  // hauts ou plus longs, restent au cadre
  const deLaRoue = (p, c) => {
    const b = boite(p.g), s = b.getSize(new THREE.Vector3()), m = b.getCenter(new THREE.Vector3());
    // le pneu de CETTE roue (son centre au moyeu), pas tous les pneus
    if (p.mat === 'tyre' || p.mat === 'side_wall') return Math.hypot(m.y - c.y, m.z - c.z) < rayon * 0.5;
    return (Math.hypot(m.y - c.y, m.z - c.z) < rayon * 0.25 && Math.abs(m.x - c.x) < 0.15
        && s.y <= rayon * 2.05 && s.z <= rayon * 2.05 && s.y >= rayon * 0.5);
  };
  for (const [c, nom] of [[cA, 'Wheel_F'], [cR, 'Wheel_R']]) {
    const parMat = new Map();
    for (const p of pieces) {
      if (p.fait || !deLaRoue(p, c)) continue;
      p.fait = true;
      if (!parMat.has(p.mat)) parMat.set(p.mat, { m: p.m, liste: [] });
      parMat.get(p.mat).liste.push(p.g);
    }
    const pivot = new THREE.Group();
    pivot.name = nom;
    pivot.position.copy(c);
    for (const [mat, { m, liste }] of parMat) {
      const g = fusionner(liste);
      g.translate(-c.x, -c.y, -c.z);
      pivot.add(maillage(simplifier(g, 0.1, 0.002), matiere(m, { dim: 512, side: THREE.DoubleSide }), nom + '_' + mat));
    }
    racineScene.add(pivot);
  }
  // les feux, séparés pour que le jeu les allume (le feu stop, les
  // clignotants de police)
  const parMat = new Map();
  for (const p of pieces) {
    if (p.fait) continue;
    if (!parMat.has(p.mat)) parMat.set(p.mat, { m: p.m, liste: [] });
    parMat.get(p.mat).liste.push(p.g);
  }
  for (const [mat, { m, liste }] of parMat) {
    const verre = /glass/.test(mat);
    const g = simplifier(fusionner(liste), verre ? 0.5 : 0.1, 0.002);
    const opts = { dim: 512, side: THREE.DoubleSide };
    // un verre est une couleur, pas une image
    if (m.transparent || verre) Object.assign(opts, { transparent: true, opacity: verre ? 0.85 : m.opacity, sansCarte: true });
    racineScene.add(maillage(g, matiere(m, opts), 'Moto_' + mat));
  }
  console.log(JSON.stringify({ moto: { empattement: +cA.distanceTo(cR).toFixed(3), rayonRoue: +rayon.toFixed(3) } }));
  await exporter(racineScene, path.join(racine, 'vendor/voitures/moto-police.glb'));
}

// ===========================================================================
// 3. LE POLICIER
// ===========================================================================
{
  const { gltf, json } = await charger(dirPolicier);
  const pieces = maillagesCuits(gltf.scene);
  let b = new THREE.Box3();
  for (const p of pieces) b.union(boite(p.g));
  const echelle = 1.8 / (b.max.y - b.min.y);
  const M = new THREE.Matrix4().makeScale(echelle, echelle, echelle)
    .premultiply(new THREE.Matrix4().makeTranslation(0, 0, 0));
  for (const p of pieces) p.g.applyMatrix4(M);
  b = new THREE.Box3(); for (const p of pieces) b.union(boite(p.g));
  const c = b.getCenter(new THREE.Vector3());
  for (const p of pieces) p.g.translate(-c.x, -b.min.y, -c.z);
  // LES BRAS DESCENDENT. Le modèle est livré en T-pose, sans squelette : un
  // policier debout les bras en croix ne se lit pas comme un policier. On
  // tourne chaque sommet au-delà de l'épaule autour du pivot de l'épaule, le
  // poids passant de 0 à 1 sur quelques centimètres pour que la manche plie
  // au lieu de se déchirer. L'épaule se MESURE : la hauteur moyenne des
  // manches, et la demi-largeur du torse juste sous l'aisselle.
  const sommets = (filtre) => {
    const out = [];
    for (const p of pieces) if (filtre(p)) { const a = p.g.attributes.position; for (let i = 0; i < a.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(a, i)); }
    return out;
  };
  const bras = sommets((p) => p.nom.includes('Policeman_Arms'));
  const xMinBras = Math.min(...bras.map((v) => Math.abs(v.x)));
  const manches = sommets((p) => p.nom.includes('Policeman_Uniform')).filter((v) => Math.abs(v.x) > xMinBras - 0.02 && Math.abs(v.x) < xMinBras + 0.06);
  const yEpaule = manches.reduce((s, v) => s + v.y, 0) / Math.max(1, manches.length);
  const torse = sommets((p) => p.nom.includes('Policeman_Uniform')).filter((v) => v.y > yEpaule - 0.32 && v.y < yEpaule - 0.2);
  const xEpaule = Math.max(...torse.map((v) => Math.abs(v.x))) - 0.03;
  const ANGLE = 1.38;            // ~79° : les bras le long du corps, un peu écartés
  const LARGE = 0.1;             // la manche plie sur dix centimètres
  for (const p of pieces) {
    const a = p.g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i), y = a.getY(i);
      const d = Math.abs(x) - xEpaule;
      if (d <= 0 || y < yEpaule - 0.35) continue;
      const t = Math.min(1, d / LARGE), w = t * t * (3 - 2 * t);
      const th = -Math.sign(x) * ANGLE * w;
      const px = Math.sign(x) * xEpaule, py = yEpaule;
      const rx = x - px, ry = y - py;
      a.setXY(i, px + rx * Math.cos(th) - ry * Math.sin(th), py + rx * Math.sin(th) + ry * Math.cos(th));
    }
    a.needsUpdate = true;
    p.g.computeVertexNormals();
  }
  console.log(JSON.stringify({ policier: { yEpaule: +yEpaule.toFixed(3), xEpaule: +xEpaule.toFixed(3) } }));
  // specular-glossiness → standard : la carte diffuse devient la couleur
  const sg = (nom) => {
    const m = json.materials.find((x) => x.name === nom);
    const e = m?.extensions?.KHR_materials_pbrSpecularGlossiness || {};
    const tex = e.diffuseTexture ? json.images[json.textures[e.diffuseTexture.index].source].uri : null;
    return { tex: tex ? path.join(dirPolicier, decodeURIComponent(tex)) : null, f: e.diffuseFactor || [1, 1, 1, 1], g: e.glossinessFactor ?? 0.3 };
  };
  const racineScene = new THREE.Group();
  racineScene.name = 'Policier';
  const parMat = new Map();
  for (const p of pieces) {
    if (!parMat.has(p.mat)) parMat.set(p.mat, []);
    parMat.get(p.mat).push(p.g);
  }
  for (const [nom, liste] of parMat) {
    const s = sg(nom);
    const transparent = /Transparent/.test(nom);
    const m = new THREE.MeshStandardMaterial({
      name: 'Policier_' + nom, color: new THREE.Color(s.f[0], s.f[1], s.f[2]),
      roughness: Math.min(0.95, 1 - s.g * 0.6), metalness: 0, side: THREE.DoubleSide,
      transparent, opacity: transparent ? Math.min(0.6, s.f[3]) : 1,
    });
    m.userData.sources = { color: transparent ? null : s.tex, dim: 1024, alpha: false };
    racineScene.add(maillage(simplifier(fusionner(liste), 1), m, 'Policier_' + nom));
  }
  await exporter(racineScene, path.join(racine, 'vendor/humains/policier.glb'));
}
