// La Lucid Air Sapphire (2024) déposée par Max : un paquet glTF Sketchfab de
// geyges, 301 926 triangles, 474 maillages, 97 matériaux — et de vraies pièces
// (os de portières, volant, roues nommées), là où les paquets de la v566 sont
// muets. Une fiche de `convertir-flotte.mjs` n'y suffit donc pas ; ce script en
// reprend le chargement et l'exportation, et ne fait que ce que ce paquet
// demande :
//
//   node scripts/convertir-lucid-air.mjs <dossier-du-paquet>
//
//  · LES COULEURS SONT SUR LES SOMMETS. Le bleu Sapphire, le cuir, les plastiques
//    vivent dans COLOR_0 (linéaire), que multiplient des cartes presque unies :
//    sans elles, tout sort blanc. On CUIT donc la couleur finale par sommet
//    (carte échantillonnée × COLOR_0), et ce qui reste à dessiner tient en un
//    seul programme neuf (`Standard+DS+vc`, déclaré dans signatures.js) : c'est
//    ce qui fait passer 97 matériaux à une vingtaine d'appels de dessin.
//  · CE QUI NE SE VOIT JAMAIS PART, ET CELA SE MESURE. Une pièce connexe dont
//    aucun point ne voit aucun poste d'observation (autour de la voiture, depuis
//    les sièges, portières avant retirées) est retirée, par rayons.
//  · LES VRAIES PIÈCES RESTENT. Roues sous `Wheel_*` (jante, pneu, disque ; les
//    étriers restent fixes), volant `Interior_SteeringWheel`, et les deux portes
//    avant sous `Portiere_G` / `Portiere_D`, posés sur leur vraie charnière :
//    portieres.js les prend au lieu de découper la tôle.
//  · LES INSCRIPTIONS (LUCID, l'ours, Air, Sapphire) gardent leur dessin : un
//    seul atlas détouré, tuiles teintées par leur couleur de sommets.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH } from 'three-mesh-bvh';
import { MeshoptSimplifier } from 'meshoptimizer';
import { charger, maillagesCuits, composantes, compacter, exporter } from './convertir-flotte.mjs';

const racine = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const EMPATTEMENT = 2.96;        // Lucid Air : 2 960 mm (constructeur)
const BUDGET = 135000;           // triangles visés, voir la mesure imprimée à la fin

// --- ce qu'on retire d'emblée : ce qui n'existe que capot ou pédales en main --
const RETIRER = /boneHoodLiner|boneBrake|boneClutch|boneGas|controlArm|bonedoorJamb/;

// --- les couleurs ----------------------------------------------------------
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const memoImg = new Map();
async function imageBasse(src) {
  if (!memoImg.has(src)) {
    const { data, info } = await sharp(src).resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    memoImg.set(src, { data, w: info.width, h: info.height, ch: info.channels });
  }
  return memoImg.get(src);
}
// La couleur linéaire de chaque sommet : carte × couleur du matériau × COLOR_0.
async function couleurCuite(p) {
  const g = p.g, n = g.attributes.position.count;
  const col = new Float32Array(n * 3), a = g.attributes.color, uv = g.attributes.uv;
  const src = p.m.map?.userData.source && fs.existsSync(p.m.map.userData.source) ? p.m.map.userData.source : null;
  const img = src ? await imageBasse(src) : null;
  const c = p.m.color || new THREE.Color(1, 1, 1);
  // une ceinture est noire, et sa carte claire réduite à une moyenne la blanchit
  const ceinture = /nylon/.test(p.mat);
  // sans sonde de reflets, une glace claire de rétroviseur se lit comme un aplat blanc
  const glace = /mirror_(left|right|center)/.test(p.nom);
  for (let i = 0; i < n; i++) {
    let r = c.r, v = c.g, b = c.b;
    if (a) { r *= a.getX(i); v *= a.getY(i); b *= a.getZ(i); }
    if (ceinture) { r *= 0.12; v *= 0.12; b *= 0.12; }
    if (glace) { r *= 0.3; v *= 0.3; b *= 0.3; }
    if (img && uv) {
      const x = Math.floor((((uv.getX(i) % 1) + 1) % 1) * img.w) % img.w, y = Math.floor((((uv.getY(i) % 1) + 1) % 1) * img.h) % img.h;
      const o = (y * img.w + x) * img.ch;
      r *= s2l(img.data[o] / 255); v *= s2l(img.data[o + 1] / 255); b *= s2l(img.data[o + 2] / 255);
    }
    // LE JEU N'A PAS L'ENVIRONNEMENT DU VISUALISEUR : ces noirs à 0,004, éclairés
    // par une simple lampe, sortaient d'un bloc (vu en capture, habitacle compris).
    // On relève les sombres, sans toucher au rapport des teintes.
    const m = Math.max(r, v, b, 1e-4), g2 = Math.max(0.02, m ** 0.72) / m;
    col[i * 3] = r * g2; col[i * 3 + 1] = v * g2; col[i * 3 + 2] = b * g2;
  }
  return col;
}
// La teinte d'une inscription : COLOR_0 seul, l'image garde son dessin dans l'atlas.
const teinteDesSommets = (g) => { const a = g.attributes.color; if (!a) return [1, 1, 1]; let r = 0, v = 0, b = 0; for (let i = 0; i < a.count; i++) { r += a.getX(i); v += a.getY(i); b += a.getZ(i); } return [r / a.count, v / a.count, b / a.count]; };
const moyenne = (col) => { let r = 0, v = 0, b = 0; const n = col.length / 3; for (let i = 0; i < col.length; i += 3) { r += col[i]; v += col[i + 1]; b += col[i + 2]; } return [r / n, v / n, b / n]; };

// --- la famille d'une pièce -------------------------------------------------
const DECALS = /^(NativeSmallAtlas_0[34]|SF_mfr_badge_ch1|SF_label_ch1)/;
function classe(p, moy) {
  const m = p.mat;
  // le miroir des rétroviseurs : une glace, pas un vitrage ni un aplat blanc
  if (/mirror_(left|right|center)/.test(p.nom)) return 'metal';
  // les bandes dégradées (sérigraphie du pare-brise) : sans leur alpha, ce sont
  // des aplats noirs aux formes de leurs triangles, vus par la lunette arrière
  if (/SF_detail_ch1|SF_grille/.test(m)) return 'retire';
  if (/carpaint/.test(m)) return moy[2] > moy[0] * 1.4 ? 'laque' : 'noir';
  if (/digitalscreen/.test(m)) return 'ecran';
  // une inscription n'existe qu'en vue d'ensemble : sur une porte, une roue ou
  // le volant, elle coûterait un appel de dessin pour vingt triangles
  // (l'atlas des pictogrammes de l'habitacle, sombre, n'en vaut pas davantage)
  if (DECALS.test(m)) return partie(p.nom) === 'Corps' && (!/NativeSmallAtlas_04/.test(m) || p.teinte[0] > 0.3) ? 'decal' : 'noir';
  if (/stitch|defrostlines/.test(m)) return 'retire';
  if (/glass/.test(m)) {
    if (moy[0] > 0.12 && moy[0] > moy[1] * 2.5) return 'feu';     // le verre rouge des feux arrière
    return (moy[0] + moy[1] + moy[2]) / 3 > 0.75 ? 'clair' : 'vitre';
  }
  if (/emitter|reflector/.test(m)) return 'lampe';
  if (/chrome|steel|aluminum|anodized|rotor|screw|wheelpaint/.test(m)) return 'metal';
  return 'noir';
}

// --- où va une pièce --------------------------------------------------------
const QUADS = { LF: 'FL', RF: 'FR', LR: 'RL', RR: 'RR' };
function partie(nom) {
  let m = nom.match(/(?:rim_|tyre_|LUC_rotor)(LF|RF|LR|RR)/);
  if (m) return 'Wheel_' + QUADS[m[1]];
  if (/boneDoorLF/.test(nom)) return 'Portiere_G';
  if (/boneDoorRF/.test(nom)) return 'Portiere_D';
  if (/boneSteeringWheelSpindle/.test(nom)) return 'Volant';
  return 'Corps';
}

// --- la visibilité, par rayons ----------------------------------------------
function postes() {
  const out = [];
  for (const h of [0.2, 0.75, 1.7, 3.5]) for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2;
    out.push(new THREE.Vector3(Math.cos(a) * 5.5, h, Math.sin(a) * 5.5));
  }
  out.push(new THREE.Vector3(0, 6, 0));
  // assis : aux quatre places, et penché vers les vitres
  for (const x of [-0.37, 0.37, -0.1, 0.1]) for (const z of [0.15, -0.8]) for (const y of [0.9, 1.05]) out.push(new THREE.Vector3(x, y, z));
  // le regard dans les passages de roue, depuis le trottoir, à hauteur d'enfant
  for (const sx of [-1, 1]) for (const z of [-1.48, 1.48, 0]) out.push(new THREE.Vector3(sx * 1.9, 0.5, z));
  return out;
}
function bvhDe(geos) {
  const uni = geos.map((g) => { const s = new THREE.BufferGeometry(); s.setAttribute('position', g.attributes.position); s.setIndex(g.index); return s; });
  return new MeshBVH(mergeGeometries(uni, false), { maxLeafTris: 8 });
}

// --- simplifier en gardant couleur et arêtes --------------------------------
// LES NORMALES SONT CELLES DE L'AUTEUR, ET ELLES COMPTENT DANS LA SIMPLIFICATION.
// Refaites après coup (toCreasedNormals), elles marbraient l'aile et le capot ;
// gardées mais ignorées par `simplify`, la tôle se tachait aux triangles effondrés
// (les deux vus en capture). `simplifyWithAttributes` pèse l'écart de normale et
// de couleur : une courbe continue ne se déchire plus.
function simplifier(g, ratio, erreur, poidsNormale = 1) {
  const m = mergeVertices(g.clone(), 1e-5);
  if (ratio < 0.999) {
    const idx = new Uint32Array(m.index.array), pos = new Float32Array(m.attributes.position.array);
    const n = m.attributes.position.count, nor = m.attributes.normal, co = m.attributes.color;
    const k = co ? 6 : 3, at = new Float32Array(n * k);
    for (let i = 0; i < n; i++) {
      at[i * k] = nor.getX(i); at[i * k + 1] = nor.getY(i); at[i * k + 2] = nor.getZ(i);
      if (co) { at[i * k + 3] = co.getX(i); at[i * k + 4] = co.getY(i); at[i * k + 5] = co.getZ(i); }
    }
    const poids = co ? [poidsNormale, poidsNormale, poidsNormale, 0.5, 0.5, 0.5] : [poidsNormale, poidsNormale, poidsNormale];
    const [res] = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, at, k, poids, null, Math.max(3, Math.floor((idx.length / 3) * ratio) * 3), erreur, []);
    m.setIndex(new THREE.BufferAttribute(res, 1));
  }
  return compacter(m);
}

// --- l'atlas des inscriptions ------------------------------------------------
async function atlasDesInscriptions(pieces) {
  const tuiles = new Map();
  for (const p of pieces) {
    const src = p.m.map.userData.source;
    const co = p.teinte.map((c) => Math.round(Math.min(1, c) * 4) / 4);
    const cle = src + '|' + co.join(',');
    if (!tuiles.has(cle)) tuiles.set(cle, { src, co, grand: /NativeSmallAtlas_04/.test(src), pieces: [] });
    tuiles.get(cle).pieces.push(p);
  }
  const liste = [...tuiles.values()].sort((a, b) => b.grand - a.grand);
  const T = 1024, comp = [];
  let x = 0, y = 0, haut = 0;
  for (const t of liste) {
    const c = t.grand ? 512 : 256;
    if (x + c > T) { x = 0; y += haut; haut = 0; }
    if (y + c > T) throw new Error(`l'atlas des inscriptions déborde : ${liste.length} tuiles`);
    haut = Math.max(haut, c);
    const { data } = await sharp(t.src).resize(c, c, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // la teinte linéaire multiplie l'image décodée, puis on réencode
    const l2s = (v) => Math.round(255 * Math.min(1, v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055));
    for (let i = 0; i < data.length; i += 4) for (let k = 0; k < 3; k++) data[i + k] = l2s(s2l(data[i + k] / 255) * t.co[k]);
    comp.push({ input: await sharp(data, { raw: { width: c, height: c, channels: 4 } }).png().toBuffer(), left: x, top: y });
    for (const p of t.pieces) {
      const uv = p.g.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        const u = Math.min(0.999, Math.max(0.001, uv.getX(i))), v = Math.min(0.999, Math.max(0.001, uv.getY(i)));
        uv.setXY(i, (x + u * c) / T, (y + v * c) / T);
      }
    }
    x += c;
  }
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lucid-')), 'inscriptions.png');
  await sharp({ create: { width: T, height: T, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp).png().toFile(f);
  return { f, tuiles: liste.length };
}

// --- le paquet ---------------------------------------------------------------
await MeshoptSimplifier.ready;
const dossier = path.resolve(process.argv[2]);
const gltf = await charger(dossier);
let pieces = maillagesCuits(gltf.scene).filter((p) => p.g.index.count > 0 && !RETIRER.test(p.nom));
const charniere = {};
gltf.scene.traverse((o) => {
  if (/boneDoorLF_/.test(o.name) && !/root_/.test(o.name)) charniere.Portiere_G = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
  if (/boneDoorRF_/.test(o.name) && !/root_/.test(o.name)) charniere.Portiere_D = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
});
for (const p of pieces) {
  p.col = await couleurCuite(p);
  p.moy = moyenne(p.col);
  p.teinte = teinteDesSommets(p.g);
  p.classe = classe(p, p.moy);
  p.partie = partie(p.nom);
}
pieces = pieces.filter((p) => p.classe !== 'retire');

// LA POSE : l'origine au milieu des essieux, les pneus au sol, l'échelle sur
// l'empattement constructeur.
const pneus = {};
for (const p of pieces) if (/tyre_/.test(p.nom)) { p.g.computeBoundingBox(); (pneus[p.partie] ||= new THREE.Box3()).union(p.g.boundingBox); }
const cz = (k) => pneus[k].getCenter(new THREE.Vector3());
const zA = (cz('Wheel_FL').z + cz('Wheel_FR').z) / 2, zR = (cz('Wheel_RL').z + cz('Wheel_RR').z) / 2;
const sol = Math.min(...Object.values(pneus).map((b) => b.min.y));
const xMil = (cz('Wheel_FL').x + cz('Wheel_FR').x + cz('Wheel_RL').x + cz('Wheel_RR').x) / 4;
const ech = EMPATTEMENT / Math.abs(zA - zR);
const P = new THREE.Matrix4().makeScale(ech, ech, ech).multiply(new THREE.Matrix4().makeTranslation(-xMil, -sol, -(zA + zR) / 2));
for (const p of pieces) {
  p.g.applyMatrix4(P);
  const n = p.g.attributes.position.count;
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.BufferAttribute(Float32Array.from({ length: n * 3 }, (_, i) => p.g.attributes.position.getComponent(Math.floor(i / 3), i % 3)), 3));
  g2.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from({ length: n * 3 }, (_, i) => p.g.attributes.normal.getComponent(Math.floor(i / 3), i % 3)), 3));
  g2.setAttribute('color', new THREE.BufferAttribute(p.col, 3));
  if (p.classe === 'decal' || p.classe === 'ecran') g2.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from({ length: n * 2 }, (_, i) => p.g.attributes.uv.getComponent(Math.floor(i / 2), i % 2)), 2));
  g2.setIndex(Array.from(p.g.index.array));
  p.g = g2;
}
const centres = {};
for (const k of Object.keys(pneus)) centres[k] = cz(k).applyMatrix4(P);
for (const k of Object.keys(charniere)) charniere[k].applyMatrix4(P);
const avant = pieces.reduce((s, p) => s + p.g.index.count / 3, 0);
console.log(JSON.stringify({ ech: +ech.toFixed(4), centres, charniere, avant }));

// CE QUI NE SE VOIT JAMAIS PART. Les occulteurs : tout l'opaque ; le verre et les
// inscriptions ne cachent rien. Deuxième passe sans les portes avant.
const opaques = pieces.filter((p) => !['vitre', 'clair', 'decal', 'ecran'].includes(p.classe));
const bvhA = bvhDe(opaques.map((p) => p.g));
const bvhB = bvhDe(opaques.filter((p) => !/Portiere/.test(p.partie)).map((p) => p.g));
const POSTES = postes(), ray = new THREE.Ray(), _d = new THREE.Vector3(), _o = new THREE.Vector3();
function vu(pt, bvh) {
  for (const q of POSTES) {
    _d.copy(q).sub(pt); const L = _d.length(); _d.divideScalar(L);
    ray.origin.copy(_o.copy(pt).addScaledVector(_d, 0.012)); ray.direction.copy(_d);
    const h = bvh.raycastFirst(ray, THREE.DoubleSide, 0, L);
    if (!h) return true;
  }
  return false;
}
let otees = 0, gardees = 0, triOtes = 0;
const t0 = Date.now();
for (const p of pieces) {
  if (['vitre', 'clair', 'decal', 'ecran', 'laque', 'feu'].includes(p.classe)) continue;
  const comp = composantes(p.g), pos = p.g.attributes.position, ix = p.g.index.array;
  const nb = comp.boites.length, parComp = Array.from({ length: nb }, () => []);
  for (let t = 0; t < comp.tri.length; t++) parComp[comp.tri[t]].push(t);
  const garde = new Uint8Array(nb);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3();
  for (let k = 0; k < nb; k++) {
    const tris = parComp[k], pas = Math.max(1, Math.floor(tris.length / 14));
    for (let j = 0; j < tris.length && !garde[k]; j += pas) {
      const t = tris[j] * 3;
      a.fromBufferAttribute(pos, ix[t]); b.fromBufferAttribute(pos, ix[t + 1]); c.fromBufferAttribute(pos, ix[t + 2]);
      m.copy(a).add(b).add(c).multiplyScalar(1 / 3);
      if (vu(m, bvhA) || vu(m, bvhB)) garde[k] = 1;
    }
    if (garde[k]) gardees++; else { otees++; triOtes += tris.length; }
  }
  const out = [];
  for (let t = 0; t < comp.tri.length; t++) if (garde[comp.tri[t]]) out.push(ix[t * 3], ix[t * 3 + 1], ix[t * 3 + 2]);
  p.g.setIndex(out);
}
pieces = pieces.filter((p) => p.g.index.count > 0);
console.log(JSON.stringify({ visibilite: { otees, gardees, triOtes, secondes: (Date.now() - t0) / 1000 } }));

// LES FEUX : ce qui éclaire aux deux bouts ; le reste (rappels, plafonnier) noir.
for (const p of pieces) {
  if (p.classe !== 'lampe' && p.classe !== 'feu') continue;
  p.g.computeBoundingBox();
  const cz2 = p.g.boundingBox.getCenter(new THREE.Vector3()).z;
  if (cz2 > 1.6) p.classe = 'phare';
  else if (cz2 < -1.7) p.classe = 'feu';
  else p.classe = 'noir';
}

// LES MATIÈRES. Une seule matière par famille : les portes, les roues et la
// caisse se partagent les mêmes.
const SANS_VC = new Set(['laque', 'vitre', 'clair', 'phare', 'feu', 'decal', 'ecran']);
const inscriptions = pieces.filter((p) => p.classe === 'decal');
const atlas = await atlasDesInscriptions(inscriptions);
const ecran = pieces.find((p) => p.classe === 'ecran');
const sourceEcran = ecran?.m.emissiveMap?.userData.source;
const std = (o) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...o });
// LE BLEU SAPPHIRE se règle en capture dans le jeu : la teinte du paquet (0,004 ;
// 0,008 ; 0,027) ne se lit qu'à travers des reflets que la rue n'a pas.
const couleurLaque = [0.016, 0.05, 0.2];
const laque = new THREE.MeshPhysicalMaterial({ name: 'Paint_Primary', side: THREE.DoubleSide, color: new THREE.Color(...couleurLaque), roughness: 0.38, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
const MAT = {
  laque,
  noir: std({ name: 'Interieur_Sombre', roughness: 0.66, metalness: 0, vertexColors: true }),
  metal: std({ name: 'Metal_Clair', roughness: 0.34, metalness: 0.4, vertexColors: true }),
  vitre: std({ name: 'Glass_Teinte', color: new THREE.Color(0.12, 0.15, 0.16), roughness: 0.04, metalness: 0, transparent: true, opacity: 0.3 }),
  clair: std({ name: 'Glass_Clair', color: new THREE.Color(0.55, 0.62, 0.66), roughness: 0.04, metalness: 0, transparent: true, opacity: 0.14 }),
  phare: std({ name: 'Headlight_Strip', color: new THREE.Color(0.9, 0.92, 0.95), roughness: 0.25, metalness: 0, emissive: new THREE.Color(0.35, 0.36, 0.38) }),
  feu: std({ name: 'Taillight_Strip', color: new THREE.Color(0.32, 0.015, 0.02), roughness: 0.22, metalness: 0, emissive: new THREE.Color(0.12, 0.004, 0.004) }),
  decal: std({ name: 'Inscriptions', roughness: 0.4, metalness: 0, transparent: true, opacity: 0.999 }),
  ecran: std({ name: 'Ecran_Bord', color: new THREE.Color(0.02, 0.02, 0.025), roughness: 0.3, metalness: 0, emissive: new THREE.Color(1, 1, 1) }),
};
MAT.decal.userData.sources = { color: atlas.f, dim: 1024, alpha: true };
MAT.ecran.userData.sources = { emissive: sourceEcran, dim: 1024, alpha: false };

// LE BUDGET : la laque et ce qui se voit gardent plus que le sombre.
const POIDS = { laque: 1, metal: 0.55, noir: 0.4, vitre: 1, clair: 1, phare: 1, feu: 1, decal: 1, ecran: 1 };
const groupes = new Map();
for (const p of pieces) {
  const cle = p.partie + '|' + p.classe;
  if (!groupes.has(cle)) groupes.set(cle, { partie: p.partie, classe: p.classe, liste: [] });
  groupes.get(cle).liste.push(p.g);
}
for (const v of groupes.values()) {
  v.fusion = compacter(v.liste.length === 1 ? v.liste[0] : mergeGeometries(v.liste.map((g) => g.clone()), false));
  if (SANS_VC.has(v.classe)) v.fusion.deleteAttribute('color');
  v.tri = v.fusion.index.count / 3;
}
let echelle = 1, geos = null, total = 0;
for (let passe = 0; passe < 4; passe++) {
  geos = new Map(); total = 0;
  for (const [cle, v] of groupes) {
    const r = v.classe === 'decal' || v.classe === 'ecran' || v.tri < 200 ? 1 : v.classe === 'laque' ? 0.85 : Math.min(1, POIDS[v.classe] * (v.partie.startsWith('Wheel_') ? 1.9 : 1) * echelle);
    const err = v.classe === 'laque' ? 0.01 : v.classe === 'metal' ? 0.02 : 0.04;
    let g;
    if (v.classe === 'decal' || v.classe === 'ecran') {
      g = compacter(v.fusion);
    } else g = simplifier(v.fusion, r, err, v.classe === 'laque' ? 3 : 1);
    geos.set(cle, g); total += g.index.count / 3;
  }
  console.log(JSON.stringify({ passe, echelle: +echelle.toFixed(3), total }));
  if (total <= BUDGET * 1.05) break;
  echelle *= Math.max(0.45, BUDGET / total);
}

// LA SCÈNE AU CONTRAT
const scene = new THREE.Group();
scene.name = 'lucid-air-sapphire';
const pivots = {};
for (const q of ['FL', 'FR', 'RL', 'RR']) {
  const g = new THREE.Group(); g.name = 'Wheel_' + q; g.position.copy(centres['Wheel_' + q]);
  scene.add(g); pivots['Wheel_' + q] = g;
}
for (const d of ['Portiere_G', 'Portiere_D']) {
  const g = new THREE.Group(); g.name = d; g.position.copy(charniere[d]);
  scene.add(g); pivots[d] = g;
}
let nb = 0;
for (const [cle, v] of groupes) {
  const g = geos.get(cle);
  if (!g.index.count) continue;
  const mesh = new THREE.Mesh(g, MAT[v.classe]);
  if (v.partie.startsWith('Wheel_') || v.partie.startsWith('Portiere_')) {
    const o = pivots[v.partie].position;
    g.translate(-o.x, -o.y, -o.z);
    mesh.name = (v.partie.startsWith('Wheel_') ? 'Roue_' : 'Porte_') + v.partie.split('_')[1] + '_' + (nb++);
    pivots[v.partie].add(mesh);
  } else if (v.partie === 'Volant') {
    mesh.name = 'Interior_SteeringWheel_' + (nb++);
    scene.add(mesh);
  } else { mesh.name = 'Body_' + (nb++); scene.add(mesh); }
}
const fichier = path.join(racine, 'vendor/voitures/lucid-air-sapphire.glb');
const mesure = await exporter(scene, fichier);
const bf = new THREE.Box3().setFromObject(scene);
console.log(JSON.stringify({ ...mesure, couleurLaque, tuiles: atlas.tuiles,
  longueur: +(bf.max.z - bf.min.z).toFixed(2), largeur: +(bf.max.x - bf.min.x).toFixed(2), hauteur: +(bf.max.y - bf.min.y).toFixed(2),
  parClasse: Object.fromEntries([...groupes].map(([k, v]) => [k, geos.get(k).index.count / 3])) }));
