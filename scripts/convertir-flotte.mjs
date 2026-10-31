// Conversion reproductible des voitures Sketchfab déposées par Max (octobre
// 2026, dix-huit paquets glTF). Les paquets bruts (scene.gltf, scene.bin,
// textures/) restent hors du dépôt ; seules les GLB converties sont livrées,
// et les crédits exigés par leurs licences sont dans vendor/voitures/LICENSE.md.
//
//   node scripts/convertir-flotte.mjs <dossier-des-paquets> [cle…]
//
// Un seul script pour dix-huit facturs différentes, parce que ce qui change
// d'un paquet à l'autre tient dans une fiche (`VOITURES`) et que tout le reste
// se MESURE :
//  · LE REPÈRE. +Y en haut (le haut de la fiche, sinon y), la longueur sur
//    l'axe horizontal le plus long, le nez du côté que dit `avant` (relevé sur
//    les vues de contrôle, jamais deviné).
//  · LES ROUES, PAR LEUR GÉOMÉTRIE. Les noms des paquets ne disent rien
//    (« Material_2125767099 », « wire_087224198 ») : on découpe chaque
//    maillage en pièces connexes, et une pièce de roue est un DISQUE vertical
//    posé bas, sur un côté de la voiture — aussi haute que longue, plus mince
//    que haute. Le pneu de référence de chaque quadrant est la plus grande ;
//    le pivot se pose en son centre, et l'on accroche à lui ce qui tient dans
//    son disque (jante, disque, écrous). Les étriers restent fixes.
//  · L'ÉCHELLE SUR L'EMPATTEMENT RÉEL de chaque modèle (mètres, contrat de la
//    flotte), les roues posées à y = 0, l'origine au milieu des essieux.
//  · LE CONTRAT DES PROGRAMMES (signatures.js) : matériaux standard, une
//    carte de couleur au plus, ni carte de normales ni de rugosité, ni
//    couleurs de sommets ni second jeu d'UV. La transmission devient une
//    transparence simple ; une transparence texturée passe en double face
//    (`Standard+map+alpha+DS`, déjà chauffée), un masque en `alphaTest` sur
//    une face, et la laque devient vernie (`Physical+cc`).
//  · LA LAQUE se renomme `Paint_Primary` (`EST_LAQUE` la repeint dans la
//    rue) ; une livrée (police, taxi) se nomme `Livree_*` et ne se repeint
//    jamais.
//  · UN BUDGET DE TRIANGLES par voiture : les gros matériaux sont simplifiés
//    par meshoptimizer (bords verrouillés), les petits gardés tels quels, et
//    ce qui ne se voit jamais (moteur, échappement, châssis) retiré quand la
//    fiche le dit.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeVertices, mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer';

globalThis.window = { URL };
globalThis.ProgressEvent = class { constructor(t, o) { Object.assign(this, o); this.type = t; } };
globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then((x) => { this.result = x; this.onloadend?.(); }); }
  readAsDataURL(b) { b.arrayBuffer().then((x) => { this.result = 'data:' + b.type + ';base64,' + Buffer.from(x).toString('base64'); this.onloadend?.(); }); }
};

const racine = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// La fiche de chaque voiture. `empattement` : la vraie valeur constructeur, en
// mètres. `avant` : le signe, sur l'axe de la longueur du paquet, du côté du
// nez (relevé sur les vues). `laque` : les matériaux de carrosserie peinte.
// `livree` : une carrosserie qui ne se repeint pas. `retirer` : ce qui ne se
// voit jamais. `budget` : triangles visés.
export const VOITURES = {
  'tesla-model-y': { paquet: '2025_tesla_model_y', empattement: 2.890, avant: 1, laque: /^Material_2125767099$/, budget: 90000 },
  'aston-martin-victor': { paquet: '2020_aston_martin_victor', empattement: 2.791, avant: 1, laque: /Paint_Material/, retirer: /EngineA/, budget: 90000 },
  'alpine-a110-gt4': { paquet: 'a110_gt4__www', empattement: 2.419, avant: 1, livree: /Ext_Paint/, budget: 90000 },
  'bentley-mulliner-batur': { paquet: '2023_bentley_mulliner_batur', empattement: 2.851, avant: 1, laque: /Paint_Material/, budget: 90000 },
  'aston-martin-db11': { paquet: 'aston_martin_db11_-_description', empattement: 2.805, avant: -1, laque: /^Body_Color$/, retirer: /Hoses|Hose_Clamps|Engine_Bay/, budget: 90000 },
  'rolls-royce-ghost': { paquet: 'rolls-royce_ghost', empattement: 3.295, avant: 1, laque: /^rrghost_paint/, retirer: /etk_engine|gavril_v8/, budget: 100000 },
  'police-suv': { paquet: 'police_car_suv', empattement: 3.025, avant: 1, livree: /^body$/, gyrophares: /^misc_material/, budget: 90000 },
  'gmc-hummer-ev': { paquet: '2024_gmc_hummer_ev_suv', empattement: 3.218, avant: 1, laque: /^CarPaint$/, sansFeuxNommes: true, budget: 100000 },
  'tesla-cybertruck': { paquet: 'tesla_cybertruck', empattement: 3.807, avant: 1, laque: /^Material\.006$/, budget: 30000 },
  'chevrolet-camaro-ss-1967': { paquet: '1967_chevrolet_camaro_ss_350_coupe', empattement: 2.743, avant: 1, laque: /^CarPaint$/, retirer: /^Engine$/, budget: 80000 },
  'cadillac-escalade-esv': { paquet: '2015_cadillac_escalade_esv', empattement: 3.302, avant: 1, laque: /^carpaint$/, budget: 60000 },
  'renault-fuego': { paquet: 'renault_fuego', empattement: 2.443, avant: -1, laque: /^bLANC$/, budget: 90000 },
  'porsche-cayenne-turbo-gt': { paquet: '2022_porsche_cayenne_turbo_gt', empattement: 2.895, avant: 1, laque: /Paint_Material/, sansFeuxNommes: true, retirer: /EngineA/, budget: 90000 },
  'abt-audi-rs6-r': { paquet: '2020_abt_sportline_audi_rs6-r', empattement: 2.926, avant: 1, laque: /Paint_Geo/, retirer: /BEngine/, budget: 90000 },
  'porsche-992-gt3-r': { paquet: '2024_porsche_992_gt3_r', empattement: 2.507, avant: 1, livree: /^EXT_Carpaint/, retirer: /INT_ELECTRONICS|INT_CABLES/, budget: 100000 },
  'bugatti-divo': { paquet: 'bugati_divo', empattement: 2.711, avant: 1, laque: null, budget: 90000 },
  'ford-f150-raptor-r': { paquet: '2024_ford_f-150_raptor_r', empattement: 3.696, avant: 1, laque: /^RaptorPaaint$/, budget: 100000 },
  'ford-mondeo-taxi': { paquet: 'ford_mondeo_taxi', empattement: 2.850, avant: 1, livree: /./, budget: 20000 },
  // LE PAQUET DE VOITURES DE POLICE (v577, « Police Car Pack », jsa201077,
  // CC-BY-4.0) : dix-huit voitures posées côte à côte dans UNE scène. Chaque
  // fiche découpe la sienne par une BOÎTE au sol (x0, x1, z0, z1, repère cuit
  // du paquet, y en haut) — un triangle appartient à la voiture dont la boîte
  // contient son centre : deux maillages du paquet (les roues de la Met et de
  // la Battenburg, une rampe) couvrent deux voitures à la fois. Le paquet
  // déclare ses carrosseries en mélange (`BLEND`) : rendues ainsi, l'habitacle
  // se voit à travers la tôle (vu en capture) — `opaque` les rend pleines, le
  // vitrage seul reste transparent. La rampe garde la texture du paquet
  // (`gyroTexture`) : ses lentilles rouges et bleues y sont déjà peintes.
  // Écartées : la GCPD (Gotham, une propriété DC — invariant 4), une épave
  // sans vitres, deux voitures sans livrée, un doublon de la NYPD, une
  // inscription en miroir.
  ...Object.fromEntries([
    ['police-nypd-crown-vic', 2.913, [180, 192.3, -97, -69]],
    ['police-nypd-charger', 3.052, [215.5, 228, -97, -70.5]],
    ['police-polizei-bmw', 2.725, [228, 238.5, -97, -71]],
    ['police-sheriff-noir', 2.913, [180, 192.3, -69, -45.2]],
    ['police-sheriff-etoile', 2.913, [192.3, 204.2, -69, -45.5]],
    ['police-noir-blanc', 2.913, [215.5, 228, -70.5, -47.5]],
    ['police-met-londres', 2.888, [180, 192.3, -45.2, -26]],
    ['police-battenburg-bmw', 2.760, [192.3, 204.2, -45.5, -26]],
    ['police-sheriff-blanc', 2.913, [204.2, 215, -46.5, -26]],
    ['police-battenburg-break', 2.830, [215.5, 228, -47.5, -26]],
    ['police-lapd', 2.913, [238.5, 250, -49, -26]],
  ].map(([cle, empattement, boite]) => [cle, {
    paquet: 'police_car_pack', boite, empattement, avant: 1, opaque: true,
    livree: /^(?!.*(?:glass|window|tire)).*$/i, gyrophares: /^(?!.*(?:glass|window|tire)).*$/i, gyroTexture: true, budget: 20000,
  }])),
};
// deux rampes sont dans le matériau du vitrage (la tôle n y a que les antennes)
Object.assign(VOITURES['police-sheriff-blanc'], { gyrophares: /Glass2/, gyroDe: 0.86 });
Object.assign(VOITURES['police-battenburg-break'], { gyrophares: /Chassis/, sansAntennes: true });

// --- chargement : buffers en ligne, images en souches ---------------------
async function charger(dir) {
  const json = JSON.parse(fs.readFileSync(path.join(dir, 'scene.gltf'), 'utf8'));
  for (const b of json.buffers) b.uri = 'data:application/octet-stream;base64,' + fs.readFileSync(path.join(dir, b.uri)).toString('base64');
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: 'souches',
    loadTexture(i) {
      const t = new THREE.Texture();
      const img = json.images?.[json.textures[i].source];
      t.userData.source = img?.uri ? path.join(dir, decodeURIComponent(img.uri)) : null;
      t.flipY = false;
      return Promise.resolve(t);
    },
  }));
  const gltf = await loader.parseAsync(JSON.stringify(json), '');
  gltf.scene.updateMatrixWorld(true);
  return gltf;
}

function maillagesCuits(scene) {
  const out = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    // un miroir (déterminant négatif) retourne les faces : on remet l'ordre
    if (o.matrixWorld.determinant() < 0 && g.index) {
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    }
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    const noms = [];
    for (let p = o; p; p = p.parent) if (p.name) noms.push(p.name);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (g.groups.length > 1 && mats.length > 1) {
      for (const gr of g.groups) {
        const sub = g.clone();
        sub.setIndex(Array.from(g.index.array.slice(gr.start, gr.start + gr.count)));
        sub.clearGroups();
        const m = mats[gr.materialIndex];
        out.push({ g: sub, m, mat: m.name || '?', nom: noms.join('/') });
      }
    } else {
      g.clearGroups();
      out.push({ g, m: mats[0], mat: mats[0].name || '?', nom: noms.join('/') });
    }
  });
  return out;
}

const triangles = (g) => g.index.count / 3;

// Les pièces connexes d'une géométrie indexée : un numéro par triangle.
function composantes(g) {
  const pos = g.attributes.position;
  const m = mergeVertices(new THREE.BufferGeometry().setAttribute('position', pos.clone()).setIndex(g.index.clone()), 1e-4);
  const ix = m.index.array, n = m.attributes.position.count;
  const par = new Int32Array(n); for (let i = 0; i < n; i++) par[i] = i;
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let i = 0; i < ix.length; i += 3) {
    const a = find(ix[i]), b = find(ix[i + 1]), c = find(ix[i + 2]);
    if (a !== b) par[b] = a;
    const a2 = find(a); const c2 = find(c); if (a2 !== c2) par[c2] = a2;
  }
  const num = new Map(), tri = new Int32Array(ix.length / 3);
  for (let t = 0; t < tri.length; t++) {
    const r = find(ix[t * 3]);
    if (!num.has(r)) num.set(r, num.size);
    tri[t] = num.get(r);
  }
  // la boîte de chaque pièce, dans le repère de la géométrie d'origine
  const boites = Array.from({ length: num.size }, () => new THREE.Box3());
  const oi = g.index.array, v = new THREE.Vector3();
  for (let t = 0; t < tri.length; t++) for (let k = 0; k < 3; k++) boites[tri[t]].expandByPoint(v.fromBufferAttribute(pos, oi[t * 3 + k]));
  return { tri, boites };
}

function sousGeometrie(g, garde) {
  const ix = g.index.array, out = [];
  for (let t = 0; t < ix.length / 3; t++) if (garde(t)) out.push(ix[t * 3], ix[t * 3 + 1], ix[t * 3 + 2]);
  const s = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) if (g.attributes[k]) s.setAttribute(k, g.attributes[k]);
  s.setIndex(out);
  return compacter(s);
}

function compacter(g) {
  const idx = g.index.array, n = g.attributes.position.count;
  const map = new Int32Array(n).fill(-1);
  let k = 0;
  for (const i of idx) if (map[i] < 0) map[i] = k++;
  const out = new THREE.BufferGeometry();
  for (const [nom, a] of Object.entries(g.attributes)) {
    const arr = new Float32Array(k * a.itemSize);
    for (let i = 0; i < n; i++) if (map[i] >= 0) for (let c = 0; c < a.itemSize; c++) arr[map[i] * a.itemSize + c] = a.getComponent ? a.getComponent(i, c) : a.array[i * a.itemSize + c];
    out.setAttribute(nom, new THREE.BufferAttribute(arr, a.itemSize));
  }
  const ni = k > 65535 ? new Uint32Array(idx.length) : new Uint16Array(idx.length);
  for (let i = 0; i < idx.length; i++) ni[i] = map[idx[i]];
  out.setIndex(new THREE.BufferAttribute(ni, 1));
  return out;
}

function propre(g) {
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

function fusionner(liste) {
  for (const g of liste) {
    propre(g);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  // toutes les pièces doivent porter les mêmes attributs, dans le même type
  const unif = liste.map((g) => {
    const s = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) {
      const a = g.attributes[k];
      const arr = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) arr[i * a.itemSize + c] = a.getComponent(i, c);
      s.setAttribute(k, new THREE.BufferAttribute(arr, a.itemSize));
    }
    s.setIndex(Array.from(g.index.array));
    return s;
  });
  return unif.length === 1 ? unif[0] : mergeGeometries(unif, false);
}

function simplifier(g, ratio, erreur = ratio < 0.15 ? 0.04 : ratio < 0.3 ? 0.012 : 0.004) {
  propre(g);
  // beaucoup de paquets arrivent « à plat » : chaque triangle a ses propres
  // sommets (une normale par face), et une maille sans sommet partagé ne se
  // simplifie pas — meshoptimizer n'y voit que des bords. On soude donc sur
  // la position et les UV seulement, et l'on refait des normales à arêtes
  // vives (30°) après.
  if (ratio < 0.999) g.deleteAttribute('normal');
  let m = mergeVertices(g, 1e-5);
  if (ratio >= 0.999) return compacter(m);
  const idx = new Uint32Array(m.index.array);
  const pos = new Float32Array(m.attributes.position.array);
  const cible = Math.max(3, Math.floor((idx.length / 3) * ratio) * 3);
  // les bords verrouillés gardent les coutures d'UV, mais un paquet fait de
  // milliers de petites pièces n'est alors presque que des bords : sous la
  // moitié, on les libère, sinon le budget n'est jamais atteint
  const [res] = MeshoptSimplifier.simplify(idx, pos, 3, cible, erreur, ratio < 0.5 ? [] : ['LockBorder']);
  m.setIndex(new THREE.BufferAttribute(res, 1));
  const v = toCreasedNormals(compacter(m), Math.PI / 6);
  return compacter(mergeVertices(v, 1e-6));
}

// Une matière standard depuis ce que GLTFLoader a lu — dans les signatures
// déjà chauffées (signatures.js).
function matiere(m, nom, { dim = 1024, laque = false } = {}) {
  const transmet = (m.transmission || 0) > 0.05;
  const melange = transmet || (m.transparent && m.opacity < 0.98) || (m.transparent && !m.alphaTest);
  const carte = m.map?.userData.source && fs.existsSync(m.map.userData.source) ? m.map.userData.source : null;
  const masque = !melange && (m.alphaTest > 0) && carte;
  // LA LAQUE EST VERNIE : `Physical+cc(+DS)+env` est déjà chauffée pour la
  // flotte (la laque reçoit la sonde des reflets), `Standard+…+env` ne l'est
  // pas. Une laque texturée reste en double face (`Physical+map+cc+DS+env`).
  const n = new (laque ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({
    name: nom,
    color: m.color ? m.color.clone() : new THREE.Color(1, 1, 1),
    roughness: Math.min(1, Math.max(0.04, m.roughness ?? 0.6)),
    metalness: Math.min(1, Math.max(0, m.metalness ?? 0)),
    transparent: !!melange,
    opacity: melange ? (transmet ? 0.38 : Math.min(0.9, m.opacity ?? 0.5)) : 1,
    // une transparence texturée passe en double face : `Standard+map+alpha+DS`
    // est chauffée, `Standard+map+alpha` ne l'est pas
    side: (melange && carte) || (laque && carte) || (m.side === THREE.DoubleSide && !masque) ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (laque) { n.clearcoat = 1; n.clearcoatRoughness = 0.08; }
  if (transmet) n.color.multiplyScalar(0.25);
  if (masque) n.alphaTest = Math.max(0.3, m.alphaTest);
  // un émissif texturé dont on retire la carte s'allumerait en blanc : noir
  if (m.emissive && !m.emissiveMap) n.emissive.copy(m.emissive);
  n.userData.sources = { color: carte, dim, alpha: !!(melange || masque) };
  return n;
}

// --- exportation GLB, images recompressées par sharp (convertir-police.mjs) --
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
  const image = async (src, dim, alpha) => {
    const cle = src + '|' + dim + '|' + alpha;
    if (memo.has(cle)) return memo.get(cle);
    const t = sharp(fs.readFileSync(src)).resize(dim, dim, { fit: 'inside', withoutEnlargement: true });
    let b, mime;
    if (alpha) { b = await t.png({ compressionLevel: 9 }).toBuffer(); mime = 'image/png'; }
    else { b = await t.removeAlpha().jpeg({ quality: 86 }).toBuffer(); mime = 'image/jpeg'; }
    const view = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset: push(b), byteLength: b.length });
    gltf.images.push({ bufferView: view, mimeType: mime });
    gltf.textures.push({ sampler: 0, source: gltf.images.length - 1 });
    memo.set(cle, gltf.textures.length - 1);
    return gltf.textures.length - 1;
  };
  for (const mat of gltf.materials || []) {
    const src = mat.extras?.sources || {};
    delete mat.extras;
    mat.pbrMetallicRoughness = mat.pbrMetallicRoughness || {};
    if (src.color) mat.pbrMetallicRoughness.baseColorTexture = { index: await image(src.color, src.dim, src.alpha) };
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
  racineScene.traverse((o) => { if (o.isMesh) { maillages++; tri += triangles(o.geometry); } });
  return { octets: fs.statSync(fichier).size, triangles: tri, maillages, images: gltf.images.length };
}

// --- une voiture ------------------------------------------------------------
async function convertir(cle, fiche, dossier) {
  const gltf = await charger(path.join(dossier, fiche.paquet));
  let pieces = maillagesCuits(gltf.scene).filter((p) => p.g.index.count > 0);
  if (fiche.retirer) pieces = pieces.filter((p) => !fiche.retirer.test(p.mat) && !fiche.retirer.test(p.nom));
  if (fiche.boite) {
    const [x0, x1, z0, z1] = fiche.boite;
    pieces = pieces.map((p) => {
      const pos = p.g.attributes.position, ix = p.g.index.array;
      const g = sousGeometrie(p.g, (t) => {
        let x = 0, z = 0;
        for (let k = 0; k < 3; k++) { x += pos.getX(ix[t * 3 + k]); z += pos.getZ(ix[t * 3 + k]); }
        x /= 3; z /= 3;
        return x >= x0 && x < x1 && z >= z0 && z < z1;
      });
      return { ...p, g };
    }).filter((p) => p.g.index.count > 0);
  }
  // LES ANTENNES : une pièce fine et haute (le break britannique en porte
  // quatre) gonfle la hauteur que lisent les feux et la rampe — on la retire
  if (fiche.sansAntennes) {
    const tout = new THREE.Box3(); for (const p of pieces) { p.g.computeBoundingBox(); tout.union(p.g.boundingBox); }
    const ht = tout.max.y - tout.min.y;
    pieces = pieces.map((p) => {
      const { tri, boites } = composantes(p.g);
      // fine (moins d'un dixième de la hauteur de large) et au-dessus du toit
      const fine = boites.map((bx) => { const t = bx.getSize(new THREE.Vector3()); return Math.max(t.x, t.z) < 0.1 * ht && bx.max.y > tout.min.y + 0.8 * ht; });
      return { ...p, g: sousGeometrie(p.g, (t) => !fine[tri[t]]) };
    }).filter((p) => p.g.index.count > 0);
  }
  if (fiche.opaque) for (const p of pieces) {
    if (/glass|window/i.test(p.mat)) continue;
    const m = p.m.clone(); m.transparent = false; m.opacity = 1; m.alphaTest = 0; m.name = p.m.name;
    p.m = m;
  }

  // 1. LE REPÈRE : y en haut, la longueur sur l'horizontale la plus longue
  let b = new THREE.Box3(); for (const p of pieces) { p.g.computeBoundingBox(); b.union(p.g.boundingBox); }
  const t = b.getSize(new THREE.Vector3());
  const long = t.x > t.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const zAx = long.multiplyScalar(fiche.avant), yAx = new THREE.Vector3(0, 1, 0);
  const xAx = new THREE.Vector3().crossVectors(yAx, zAx);
  const c0 = b.getCenter(new THREE.Vector3());
  const R = new THREE.Matrix4().makeBasis(xAx, yAx, zAx).transpose().multiply(new THREE.Matrix4().makeTranslation(-c0.x, -c0.y, -c0.z));
  // un repère tourné (rotation pure) ne retourne aucune face
  for (const p of pieces) { p.g.applyMatrix4(R); p.g.computeBoundingBox(); }
  b = new THREE.Box3(); for (const p of pieces) b.union(p.g.boundingBox);
  const L = b.max.z - b.min.z, W = b.max.x - b.min.x, H = b.max.y - b.min.y;

  // 2. LES ROUES : des disques verticaux, bas, sur un côté
  const cand = [];
  for (const p of pieces) {
    p.comp = composantes(p.g);
    p.comp.boites.forEach((bx, i) => {
      const s = bx.getSize(new THREE.Vector3()), c = bx.getCenter(new THREE.Vector3());
      const disque = s.y > 0.06 * L && s.y < 0.32 * L && s.z / s.y > 0.7 && s.z / s.y < 1.4 && s.x < 0.9 * s.y;
      const bas = c.y < b.min.y + 0.42 * H;
      const cote = Math.abs(c.x - (b.min.x + b.max.x) / 2) > 0.15 * W;
      // une roue est vers un bout : une pièce ronde au milieu de la longueur
      // est de la carrosserie (la portière arrondie de la LAPD, v577)
      const bout = Math.abs(c.z - (b.min.z + b.max.z) / 2) > 0.2 * L;
      if (disque && bas && cote && bout) cand.push({ p, i, c, s });
    });
  }
  const midZ = (b.min.z + b.max.z) / 2;
  const roues = {};
  for (const q of ['FL', 'FR', 'RL', 'RR']) {
    const av = q[0] === 'F', g = q[1] === 'L';
    const dans = cand.filter((k) => (k.c.z > midZ) === av && (k.c.x > 0) === g);
    if (process.env.DEBUG_ROUES) console.error(q, dans.map((k) => [k.p.mat, k.c.toArray().map((v) => +v.toFixed(2)), k.s.toArray().map((v) => +v.toFixed(2))]));
    if (!dans.length) throw new Error(`${cle}: aucune roue ${q}`);
    // le pneu : la plus grande pièce, et parmi les plus grandes la plus basse
    const ref = dans.reduce((a, k) => (k.s.y > a.s.y * 1.02 || (k.s.y > a.s.y * 0.98 && k.c.y < a.c.y) ? k : a));
    roues[q] = { c: ref.c.clone(), r: ref.s.y / 2, ref };
  }
  // les pièces accrochées au pivot : ce qui tient dans le disque du pneu
  const membre = new Map();   // p -> Int8Array par pièce : -1 corps, 0..3 roue
  const QS = ['FL', 'FR', 'RL', 'RR'];
  for (const p of pieces) {
    const a = new Int8Array(p.comp.boites.length).fill(-1);
    p.comp.boites.forEach((bx, i) => {
      if (/calip|callip|étrier|etrier|brake_?cal/i.test(p.mat + ' ' + p.nom)) return;
      const s = bx.getSize(new THREE.Vector3()), c = bx.getCenter(new THREE.Vector3());
      QS.forEach((q, k) => {
        const w = roues[q];
        const dzy = Math.hypot(c.z - w.c.z, c.y - w.c.y);
        if (Math.max(s.y, s.z) <= 2 * w.r * 1.06 && dzy < 0.62 * w.r && Math.abs(c.x - w.c.x) < 0.9 * w.r && s.x < 1.2 * w.r) a[i] = k;
      });
    });
    membre.set(p, a);
  }

  // 3. L'ÉCHELLE ET LA POSE : l'empattement réel, roues au sol, origine au
  //    milieu des essieux
  const zAvant = (roues.FL.c.z + roues.FR.c.z) / 2, zArriere = (roues.RL.c.z + roues.RR.c.z) / 2;
  const ech = fiche.empattement / Math.abs(zAvant - zArriere);
  const sol = Math.min(...QS.map((q) => roues[q].c.y - roues[q].r));
  const xMil = (roues.FL.c.x + roues.FR.c.x + roues.RL.c.x + roues.RR.c.x) / 4;
  const P = new THREE.Matrix4().makeScale(ech, ech, ech).multiply(new THREE.Matrix4().makeTranslation(-xMil, -sol, -(zAvant + zArriere) / 2));
  const centres = {};
  for (const q of QS) centres[q] = roues[q].c.clone().applyMatrix4(P);

  // 4. LE BUDGET : les gros matériaux se simplifient, les petits restent
  const parMat = new Map();
  const ajouter = (cleM, m, g) => { if (!parMat.has(cleM)) parMat.set(cleM, { m, liste: [] }); parMat.get(cleM).liste.push(g); };
  for (const p of pieces) {
    const a = membre.get(p);
    for (let k = -1; k < 4; k++) {
      const g = sousGeometrie(p.g, (tIx) => a[p.comp.tri[tIx]] === k);
      if (!g.index.count) continue;
      g.applyMatrix4(P);
      ajouter((k < 0 ? 'corps' : QS[k]) + '|' + p.mat, p.m, g);
    }
  }
  let total = 0, petits = 0;
  for (const v of parMat.values()) { v.tri = v.liste.reduce((s, g) => s + triangles(g), 0); total += v.tri; if (v.tri < 3000) petits += v.tri; }
  const ratio = Math.min(1, Math.max(0.03, (fiche.budget - petits) / Math.max(1, total - petits)));

  // 5. LA SCÈNE AU CONTRAT
  const racineScene = new THREE.Group();
  racineScene.name = cle;
  const pivots = {};
  for (const q of QS) {
    const g = new THREE.Group();
    g.name = 'Wheel_' + q;            // seul le pivot porte ce préfixe (v562)
    g.position.copy(centres[q]);
    racineScene.add(g); pivots[q] = g;
  }
  const memoMat = new Map();
  const nomDe = (m) => {
    const brut = m.name || 'matiere';
    if (fiche.livree && fiche.livree.test(brut)) return 'Livree_' + cle;
    if (fiche.laque && fiche.laque.test(brut)) return 'Paint_Primary';
    // un nom qui contient « paint » ou « body » serait repeint (EST_LAQUE) ;
    // `sansFeuxNommes` : les blocs optiques de ce paquet tombent hors des
    // coins que la flotte attend (la rampe du Hummer est sur le capot) — on
    // les débaptise, et le jeu pose ses feux par la boîte et le rayon (v519)
    const nomme = brut.replace(/paint|pearl|bodywork|(?<![a-z])body(?![a-z])/ig, 'Tole');
    return fiche.sansFeuxNommes ? nomme.replace(/light|lamp|amber|indicat|clignot/ig, 'Optique') : nomme;
  };
  // la carrosserie garde ses 1 024 pixels, le reste en a 512
  const matDe = (m) => {
    if (!memoMat.has(m)) { const nom = nomDe(m); memoMat.set(m, matiere(m, nom, { dim: /^(Paint_Primary|Livree_)/.test(nom) ? 1024 : 512, laque: nom === 'Paint_Primary' })); }
    return memoMat.get(m);
  };
  // une première passe mesure ce que la simplification obtient vraiment ;
  // si elle reste au-dessus du budget, on resserre une fois d'autant
  const geos = new Map();
  for (const [cleM, v] of parMat) v.fusion = fusionner(v.liste);
  let r = ratio;
  for (let passe = 0; passe < 3; passe++) {
    let obtenu = 0;
    for (const [cleM, v] of parMat) { const g = simplifier(v.fusion.clone(), v.tri < 3000 ? 1 : r); geos.set(cleM, g); obtenu += triangles(g); }
    if (obtenu <= fiche.budget * 1.08 || r <= 0.02) break;
    r *= Math.max(0.3, (fiche.budget - petits) / Math.max(1, obtenu - petits));
  }
  const bf0 = new THREE.Box3(); for (const g of geos.values()) { g.computeBoundingBox(); bf0.union(g.boundingBox); }
  let nb = 0;
  for (const [cleM, { m }] of parMat) {
    const [ou] = cleM.split('|');
    const g = geos.get(cleM);
    if (!g.index.count) continue;
    const mesh = new THREE.Mesh(g, matDe(m));
    if (ou === 'corps' && fiche.gyrophares && fiche.gyrophares.test(m.name || '')) {
      // LA RAMPE DE LA VOITURE DE POLICE : ce que ce matériau porte sur le
      // toit (au-dessus de 94 % de la hauteur) se sépare en deux lentilles,
      // `Gyrophare_G` (rouge, gauche, +X) et `Gyrophare_D` (bleue) — les
      // pièces que patrouille.js mesure et allume, comme sur la Crown Victoria
      // (convertir-police.mjs). Le reste du matériau reste à la carrosserie.
      g.computeBoundingBox();
      const haut = bf0.max.y * (fiche.gyroDe ?? 0.94), plafond = bf0.max.y * (fiche.gyroA ?? 2), pos = g.attributes.position, ix = g.index.array;
      const cote = (t) => { let y = 0, x = 0, yM = -1e9; for (let k = 0; k < 3; k++) { const yk = pos.getY(ix[t * 3 + k]); y += yk; yM = Math.max(yM, yk); x += pos.getX(ix[t * 3 + k]); } return y / 3 < haut || yM > plafond ? 0 : (x > 0 ? 1 : -1); };
      const lentille = (couleur, nomM) => new THREE.MeshStandardMaterial({ name: nomM, color: couleur, roughness: 0.25, metalness: 0 });
      racineScene.add(Object.assign(new THREE.Mesh(sousGeometrie(g, (t) => cote(t) === 0), matDe(m)), { name: 'Body_' + (nb++) }));
      const gG = sousGeometrie(g, (t) => cote(t) === 1), gD = sousGeometrie(g, (t) => cote(t) === -1);
      if (gG.index.count) racineScene.add(Object.assign(new THREE.Mesh(gG, fiche.gyroTexture ? matDe(m) : lentille(0xb01818, 'Gyrophare_Rouge')), { name: 'Gyrophare_G' }));
      if (gD.index.count) racineScene.add(Object.assign(new THREE.Mesh(gD, fiche.gyroTexture ? matDe(m) : lentille(0x1c3cc0, 'Gyrophare_Bleu')), { name: 'Gyrophare_D' }));
      continue;
    }
    if (ou === 'corps') { mesh.name = 'Body_' + (nb++); racineScene.add(mesh); }
    else { g.translate(-centres[ou].x, -centres[ou].y, -centres[ou].z); mesh.name = 'Pneu_' + ou + '_' + (nb++); pivots[ou].add(mesh); }
  }
  const fichier = path.join(racine, 'vendor/voitures', cle + '.glb');
  const mesure = await exporter(racineScene, fichier);
  const bf = new THREE.Box3().setFromObject(racineScene);
  return {
    cle, ...mesure, ratio: +r.toFixed(3), avant: total,
    longueur: +(bf.max.z - bf.min.z).toFixed(2), largeur: +(bf.max.x - bf.min.x).toFixed(2), hauteur: +(bf.max.y - bf.min.y).toFixed(2),
    rayonRoue: +(roues.FL.r * ech).toFixed(3), voie: +(centres.FL.x - centres.FR.x).toFixed(2),
    piecesRoue: QS.map((q) => pivots[q].children.length),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await MeshoptSimplifier.ready;
  const [dossier, ...cles] = process.argv.slice(2);
  for (const cle of cles.length ? cles : Object.keys(VOITURES)) {
    try { console.log(JSON.stringify(await convertir(cle, VOITURES[cle], path.resolve(dossier)))); }
    catch (e) { console.log(JSON.stringify({ cle, erreur: String(e.stack || e).slice(0, 400) })); }
  }
}
