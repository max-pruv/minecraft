// LES FICHIERS AUX TEXTURES KTX2 (v586), JUGÉS SOUS NODE CONTRE LEURS ORIGINAUX.
//
// `scripts/compresser-textures-ktx2.mjs` produit `<nom>-ktx2.glb` à côté de
// chaque modèle déposé. Ce que le jeu mesure sur un modèle (roues, feux,
// portières, sièges, signatures de programme) a été réglé sur l'original : le
// fichier comprimé doit donc être l'original, sommet pour sommet, matériau
// pour matériau — seules ses images changent. Ce module le vérifie octet par
// octet, sans aucune dépendance, en lisant les deux .glb.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsonDuGlb, signaturesDuGlb } from '../src/signatures.js';
import { MODELES_KTX2, nomKTX2 } from '../src/ktx2-liste.js';

const ici = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.resolve(ici, '..', 'vendor');

function lire(fichier) {
  const o = fs.readFileSync(fichier);
  const j = jsonDuGlb(o);
  const lj = o.readUInt32LE(12);
  const bin = o.subarray(20 + lj + 8, 20 + lj + 8 + o.readUInt32LE(20 + lj));
  return { j, bin, taille: o.length };
}

const COMPOSANTES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const OCTETS = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
// Les octets utiles d'un accesseur, entrelacement retiré.
function octetsAccesseur({ j, bin }, i) {
  const a = j.accessors[i];
  if (a.sparse) return Buffer.from(JSON.stringify(a.sparse));
  const bv = j.bufferViews[a.bufferView];
  const el = COMPOSANTES[a.type] * OCTETS[a.componentType];
  const pas = bv.byteStride || el;
  const debut = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const out = Buffer.alloc(el * a.count);
  for (let k = 0; k < a.count; k++) bin.copy(out, k * el, debut + k * pas, debut + k * pas + el);
  return out;
}

function geometrie(g) {
  const h = [];
  for (const m of g.j.meshes || []) {
    for (const p of m.primitives || []) {
      for (const [sem, i] of Object.entries(p.attributes).sort()) h.push(m.name + '/' + sem + ':' + hash(octetsAccesseur(g, i)));
      if (p.indices !== undefined) h.push(m.name + '/idx:' + hash(octetsAccesseur(g, p.indices)));
      h.push(m.name + '/mat:' + (p.material !== undefined ? (g.j.materials[p.material].name || p.material) : '-'));
    }
  }
  return h;
}
function hash(b) {
  let x = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) x = Math.imul(x ^ b[i], 0x01000193);
  return b.length + '.' + (x >>> 0).toString(36);
}
// Les cartes de chaque matériau, par rôle (sans les index, qui peuvent changer).
function cartes(j) {
  return (j.materials || []).map((m) => {
    const r = [];
    const voir = (o, pre) => { for (const [k, v] of Object.entries(o || {})) if (v && typeof v === 'object' && 'index' in v) r.push(pre + k + (v.texCoord ? '@' + v.texCoord : '')); };
    voir(m, ''); voir(m.pbrMetallicRoughness, 'pbr.');
    for (const [e, v] of Object.entries(m.extensions || {})) voir(v, e + '.');
    return (m.name || '') + '[' + r.sort().join(',') + ']';
  });
}

export function temoinsKTX2() {
  const t = [];
  const manquants = [], pasRequis = [], imagesBrutes = [], geoDiff = [], cartesDiff = [], sigDiff = [], noeudsDiff = [];
  let octetsAvant = 0, octetsApres = 0, accesseurs = 0;
  for (const [d, f] of MODELES_KTX2) {
    const src = path.join(vendor, d, f), dst = path.join(vendor, d, nomKTX2(f));
    if (!fs.existsSync(src) || !fs.existsSync(dst)) { manquants.push(d + '/' + f); continue; }
    const a = lire(src), b = lire(dst);
    // New York se déclare à part : ses photos recuites passent en UASTC
    // (l'ETC1S de l'Empire rend 23 dB), plus lourd sur le disque
    if (d !== 'newyork') { octetsAvant += a.taille; octetsApres += b.taille; }
    if (!(b.j.extensionsRequired || []).includes('KHR_texture_basisu')) pasRequis.push(f);
    // chaque texture passe par l'extension, et aucune image JPEG ni PNG ne reste
    const brutes = (b.j.images || []).filter((im) => im.mimeType !== 'image/ktx2').length
      + (b.j.textures || []).filter((tx) => !(tx.extensions && tx.extensions.KHR_texture_basisu)).length;
    if (brutes || (b.j.images || []).length !== (a.j.images || []).length) imagesBrutes.push(f + ':' + brutes + ' brutes, ' + (b.j.images || []).length + '/' + (a.j.images || []).length + ' images');
    const ga = geometrie(a), gb = geometrie(b);
    accesseurs += ga.length;
    if (ga.join('|') !== gb.join('|')) geoDiff.push(f);
    if (cartes(a.j).join('|') !== cartes(b.j).join('|')) cartesDiff.push(f);
    const noms = (g) => (g.j.nodes || []).map((n) => n.name || '').join('|');
    if (noms(a) !== noms(b)) noeudsDiff.push(f);
    const env = d === 'voitures';
    const sa = [...signaturesDuGlb(a.j, { env })].sort().join(','), sb = [...signaturesDuGlb(b.j, { env })].sort().join(',');
    if (sa !== sb) sigDiff.push(f + ' : ' + sa + ' ≠ ' + sb);
  }
  t.push(['chaque modèle déposé à textures a sa version KTX2, qui exige l\'extension et ne garde aucune image JPEG ni PNG',
    !manquants.length && !pasRequis.length && !imagesBrutes.length,
    JSON.stringify({ modeles: MODELES_KTX2.length, manquants, pasRequis, imagesBrutes })]);
  t.push(['la version KTX2 est l\'original sommet pour sommet : chaque accesseur de chaque primitive, octet pour octet, et les mêmes nœuds',
    !manquants.length && !geoDiff.length && !noeudsDiff.length && accesseurs > 1000,
    JSON.stringify({ accesseurs, geoDiff, noeudsDiff })]);
  t.push(['et matériau pour matériau : les mêmes cartes aux mêmes rôles, donc les mêmes signatures de programme (v246) — aucune clé neuve à chauffer',
    !manquants.length && !cartesDiff.length && !sigDiff.length,
    JSON.stringify({ cartesDiff, sigDiff })]);
  t.push(['le disque ne grossit pas : les voitures et les avions KTX2 pèsent au plus ce que pèsent leurs originaux, à 10 % près',
    octetsApres <= octetsAvant * 1.1,
    JSON.stringify({ avantMo: +(octetsAvant / 1e6).toFixed(1), apresMo: +(octetsApres / 1e6).toFixed(1) })]);
  return t;
}

// La flotte, la moto, les avions et New York : tout fichier que le jeu charge
// et qui porte une image doit être dans la liste, sinon il reste en RGBA.
export function couvertureKTX2(chargees) {
  const liste = new Set(MODELES_KTX2.map(([d, f]) => d + '/' + f));
  const oublies = [];
  for (const cle of chargees) {
    const [d, f] = cle.split('/');
    const g = lire(path.join(vendor, d, f));
    if ((g.j.images || []).length && !liste.has(cle)) oublies.push(cle);
  }
  return oublies;
}
