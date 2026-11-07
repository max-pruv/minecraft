// LES TEXTURES DES MODÈLES DÉPOSÉS, COMPRIMÉES POUR LA CARTE GRAPHIQUE.
//
// Pourquoi. iOS ferme la page vers 500 Mo de géométrie et de textures (v580,
// journal de bord), et une image JPEG ou PNG se DÉCODE en RGBA : quatre octets
// par pixel, un tiers de plus pour les mipmaps, quelle que soit sa taille sur
// le disque. Une texture KTX2 (Basis Universal) arrive déjà dans un format que
// la carte lit sans la décompresser : ETC2 ou ASTC sur l'iPhone et l'iPad, un
// demi-octet à un octet par pixel. Même image, quatre à huit fois moins de
// mémoire.
//
// Ce que fait le script, et ce qu'il ne fait PAS.
//   - Il lit chaque modèle chargé par le jeu (`asset` s'il existe, sinon
//     `fichier`, règle v545) et écrit `<nom>-ktx2.glb` à côté : un fichier neuf,
//     donc une URL neuve. L'original reste — une tablette restée sur l'ancienne
//     version le demande encore.
//   - Il ne touche à AUCUN sommet : chaque accesseur du fichier produit est
//     comparé octet pour octet à celui de l'original, et le script s'arrête au
//     premier écart. Roues, feux (sonde-feux-flotte), portières, sièges : tout
//     ce que le jeu mesure sur la géométrie reste vrai par construction.
//   - Il ne change aucun matériau : mêmes cartes aux mêmes places, donc mêmes
//     signatures de programme (v246, `signaturesDuGlb`).
//
// Le choix du codec, PAR TEXTURE, par son rôle :
//   - une NORMALE (normalTexture, clearcoatNormalTexture) en UASTC, linéaire,
//     préréglage « normal map », supercompression zstd : ETC1S y fait des
//     facettes visibles sur une carrosserie ;
//   - une COULEUR (baseColor, émissive) en ETC1S sRGB ;
//   - une DONNÉE (métal/rugosité, occlusion, vernis) en ETC1S linéaire ;
//   - et si l'ETC1S rend moins de `PSNR_MIN` dB contre l'image d'origine
//     (mesurée en décodant le fichier produit avec le transcodeur que le JEU
//     sert, celui de three r160), la texture passe en UASTC. La mesure est
//     imprimée ligne par ligne.
//
// Usage (depuis scripts/, après `npm i`) :
//   node compresser-textures-ktx2.mjs               tous les modèles de la table
//   node compresser-textures-ktx2.mjs police-car    ceux dont le nom contient…
//
// Rejouable : même entrée, même sortie (l'encodeur Basis est déterministe).

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { NodeIO, VertexLayout } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRTextureBasisu } from '@gltf-transform/extensions';
import { encodeToKTX2 } from 'ktx2-encoder';

const racine = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// La liste vit dans le jeu (`src/ktx2-liste.js`) : le script, le chargeur et
// les témoins lisent la même.
import { MODELES_KTX2, nomKTX2 } from '../src/ktx2-liste.js';

const PSNR_MIN = 33;
const RDO = Number(process.env.RDO || 0);          // dB, couleur et données ; en dessous, UASTC
const NORMALES = /normal/i;
const COULEURS = /baseColor|emissive|diffuse|specularColor|sheenColor/i;

// ---- le transcodeur du JEU, sous node, pour juger ce que la carte recevra --
const dossierBasis = path.join(racine, 'vendor', 'basis');
let BASIS = null;
async function transcodeur() {
  if (BASIS) return BASIS;
  const src = fs.readFileSync(path.join(dossierBasis, 'basis_transcoder.js'), 'utf8');
  // sans `process` ni `require` : le module se croit hors de node et lit le
  // wasm qu'on lui donne au lieu de chercher un fichier à côté de lui
  const fabrique = new Function('process', 'require', src + '\nreturn BASIS;')(undefined, undefined);
  BASIS = await fabrique({ wasmBinary: fs.readFileSync(path.join(dossierBasis, 'basis_transcoder.wasm')) });
  BASIS.initializeBasis();
  return BASIS;
}
// Le niveau 0 du fichier KTX2, décodé en RGBA 8 bits.
async function decoderKTX2(octets) {
  const B = await transcodeur();
  const k = new B.KTX2File(new Uint8Array(octets));
  try {
    if (!k.isValid()) throw new Error('KTX2 invalide');
    const w = k.getWidth(), h = k.getHeight();
    if (!k.startTranscoding()) throw new Error('startTranscoding');
    const RGBA32 = 13;
    const taille = k.getImageTranscodedSizeInBytes(0, 0, 0, RGBA32);
    const dst = new Uint8Array(taille);
    if (!k.transcodeImage(dst, 0, 0, 0, RGBA32, 0, -1, -1)) throw new Error('transcodeImage');
    return { w, h, data: dst, uastc: k.isUASTC(), niveaux: k.getLevels() };
  } finally { k.close(); k.delete(); }
}

const decodeur = async (octets) => {
  const { data, info } = await sharp(Buffer.from(octets)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};

function psnr(a, b, alpha) {
  let s = 0, n = 0;
  for (let i = 0; i < a.length; i += 4) {
    for (let c = 0; c < (alpha ? 4 : 3); c++) { const d = a[i + c] - b[i + c]; s += d * d; n++; }
  }
  const mse = s / n;
  return mse === 0 ? 99 : 10 * Math.log10(255 * 255 / mse);
}

async function encoder(image, role, uastc) {
  const lin = role !== 'couleur';
  const options = {
    imageDecoder: decodeur,
    enableDebug: false,
    generateMipmap: true,
    isUASTC: uastc,
    isSetKTX2SRGBTransferFunc: !lin,
    isPerceptual: !lin,
  };
  if (uastc) {
    options.needSupercompression = true;     // zstd
    if (role === 'normale') options.isNormalMap = true;
    // L'optimisation débit-distorsion (RDO) ne rend presque rien ici : mesurée
    // sur l'Empire, 5,38 → 5,25 Mo à RDO 1 (40,5 dB) et 5,14 Mo à RDO 2
    // (38,8 dB). On ne l'arme pas ; `RDO=1` la rejoue.
    else if (RDO) { options.enableRDO = true; options.rdoQualityLevel = RDO; }
  } else {
    options.qualityLevel = 230;
    options.compressionLevel = 2;
    if (role === 'normale') options.isNormalMap = true;
  }
  // l'encodeur Basis écrit son journal sur la sortie standard : on le tait
  const log = console.log;
  console.log = () => {};
  try { return await encodeToKTX2(new Uint8Array(image), options); } finally { console.log = log; }
}

function empreinteAccesseurs(doc) {
  // L'empreinte de chaque accesseur de chaque primitive, dans l'ordre : c'est
  // ce qui prouve que la géométrie n'a pas bougé d'un octet.
  const h = [];
  for (const m of doc.getRoot().listMeshes()) {
    for (const p of m.listPrimitives()) {
      for (const s of p.listSemantics()) {
        const a = p.getAttribute(s);
        h.push(m.getName() + '/' + s + ':' + createHash('sha1').update(Buffer.from(a.getArray().buffer, a.getArray().byteOffset, a.getArray().byteLength)).digest('hex'));
      }
      const i = p.getIndices();
      if (i) h.push(m.getName() + '/idx:' + createHash('sha1').update(Buffer.from(i.getArray().buffer, i.getArray().byteOffset, i.getArray().byteLength)).digest('hex'));
    }
  }
  return h;
}

function roleDe(texture, doc) {
  const roles = new Set();
  for (const e of texture.getGraph().listParentEdges(texture)) {
    if (e.getParent() === doc.getRoot()) continue;
    const slot = e.getName();
    roles.add(NORMALES.test(slot) ? 'normale' : COULEURS.test(slot) ? 'couleur' : 'donnee');
  }
  // une image qui servirait à deux rôles prend le plus exigeant
  if (roles.has('normale')) return 'normale';
  if (roles.has('couleur') && roles.has('donnee')) return 'donnee';
  return [...roles][0] || 'couleur';
}

function originalEntrelace(fichier) {
  const o = fs.readFileSync(fichier), j = JSON.parse(o.subarray(20, 20 + o.readUInt32LE(12)).toString('utf8'));
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }, b = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  return (j.accessors || []).some((a) => {
    const v = a.bufferView !== undefined ? j.bufferViews[a.bufferView] : null;
    return v && v.byteStride && v.byteStride !== n[a.type] * b[a.componentType];
  });
}

async function convertir(dossier, fichier) {
  const entree = path.join(racine, 'vendor', dossier, fichier);
  // LA DISPOSITION DE L'ORIGINAL (v590) : gltf-transform entrelace les
  // attributs par défaut, et three en ferait des InterleavedBufferAttribute
  // que les dégâts et la découpe des portières ne clonent pas comme un
  // attribut simple. On écrit comme l'original : entrelacé seulement s'il
  // l'était (le F-35, le jet, la Chiron Stealth, la Lucid Gravity).
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .setVertexLayout(originalEntrelace(entree) ? VertexLayout.INTERLEAVED : VertexLayout.SEPARATE);
  const sortie = path.join(racine, 'vendor', dossier, nomKTX2(fichier));
  const doc = await io.read(entree);
  const avant = empreinteAccesseurs(doc);
  const lignes = [];
  let px = 0, gpuAvant = 0, gpuApres = 0;
  for (const t of doc.getRoot().listTextures()) {
    const mime = t.getMimeType();
    if (mime === 'image/ktx2') continue;
    const image = t.getImage();
    const role = roleDe(t, doc);
    const orig = await decodeur(image);
    const alpha = orig.data.some((v, i) => (i & 3) === 3 && v < 250);
    let uastc = role === 'normale';
    let ktx = await encoder(image, role, uastc);
    let dec = await decoderKTX2(ktx);
    let q = psnr(orig.data, dec.data, alpha);
    let etc1s = null;
    if (!uastc && q < PSNR_MIN) {
      etc1s = q;
      uastc = true;
      ktx = await encoder(image, role, true);
      dec = await decoderKTX2(ktx);
      q = psnr(orig.data, dec.data, alpha);
    }
    const n = orig.width * orig.height;
    px += n;
    // ce que la carte d'un iPhone reçoit : RGBA avant ; après, ETC2 RGB
    // (½ octet par pixel), ETC2 RGBA ou ASTC 4×4 (1 octet)
    gpuAvant += n * 4 * 4 / 3;
    gpuApres += n * (uastc || alpha ? 1 : 0.5) * 4 / 3;
    lignes.push(`  ${String(t.getName() || '#' + lignes.length).slice(0, 28).padEnd(28)} ${orig.width}×${orig.height} ${role.padEnd(7)} ${(uastc ? 'UASTC' : 'ETC1S').padEnd(5)}${alpha ? '+α' : '  '} ${(image.byteLength / 1024).toFixed(0).padStart(5)} → ${(ktx.byteLength / 1024).toFixed(0).padStart(5)} Ko  ${q.toFixed(1)} dB${etc1s !== null ? ` (ETC1S ${etc1s.toFixed(1)} dB)` : ''}`);
    t.setImage(ktx);
    t.setMimeType('image/ktx2');
  }
  if (lignes.length) doc.createExtension(KHRTextureBasisu).setRequired(true);
  const apres = empreinteAccesseurs(doc);
  if (avant.join() !== apres.join()) throw new Error(fichier + ' : la géométrie a changé');
  await io.write(sortie, doc);
  // relu depuis le disque : la géométrie écrite est celle de l'original
  const relu = empreinteAccesseurs(await io.read(sortie));
  if (relu.join() !== avant.join()) throw new Error(fichier + ' : la géométrie relue diffère');
  const o = fs.statSync(entree).size, s = fs.statSync(sortie).size;
  console.log(`${fichier} → ${nomKTX2(fichier)}  ${(o / 1e6).toFixed(2)} → ${(s / 1e6).toFixed(2)} Mo disque, `
    + `GPU ${(gpuAvant / 1048576).toFixed(1)} → ${(gpuApres / 1048576).toFixed(1)} Mo, géométrie identique (${avant.length} accesseurs)`);
  for (const l of lignes) console.log(l);
  return { gpuAvant, gpuApres, o, s };
}

const filtre = process.argv[2];
let tot = { gpuAvant: 0, gpuApres: 0, o: 0, s: 0 };
for (const [d, f] of MODELES_KTX2) {
  if (filtre && !f.includes(filtre)) continue;
  const r = await convertir(d, f);
  for (const k in tot) tot[k] += r[k];
}
console.log(`TOTAL disque ${(tot.o / 1e6).toFixed(1)} → ${(tot.s / 1e6).toFixed(1)} Mo ; GPU (sans partage) ${(tot.gpuAvant / 1048576).toFixed(0)} → ${(tot.gpuApres / 1048576).toFixed(0)} Mo`);
