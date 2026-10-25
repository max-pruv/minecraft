// LA TOUR EIFFEL DU MODÈLE DE JOHNSON MARTIN (CC-BY-4.0), PRÉPARÉE POUR LE JEU.
//
//   cd scripts && npm install && node tour-eiffel.mjs <dossier du modèle> ../src/tour-eiffel-donnees.js
//
// Le dossier est celui du paquet Sketchfab (scene.gltf + scene.bin, 453 397
// triangles, 17 Mo). Ce script en fait ce que le mailleur peut porter :
//
// 1. LE REPÈRE DU JEU. Le modèle est en z vers le haut (Sketchfab le couche par
//    sa matrice racine) : on rend y vers le haut, l'origine au pied, au sol.
// 2. LES DEUX ÉCHELLES. La hauteur suit l'étage, l'emprise le sol (CLAUDE.md,
//    « Deux échelles dans la même ville ») : la tour monte à 69 blocs comme
//    depuis la v292, et ses quatre socles tiennent dans le parvis (±8,4 blocs),
//    donc dans la boîte du repère (`socle: [9, 9]` de paris.js). Les rues autour
//    du socle ne bougent pas.
// 3. LA DÉCIMATION SE FAIT DANS LE REPÈRE DU JEU, avec une erreur en BLOCS
//    (`ERREUR`). Faite dans celui du modèle, elle aurait jugé la flèche comme
//    les jambes et cassé le sommet (vu en capture à 15 000 triangles).
// 4. LE CODAGE EST SYNCHRONE ET SANS DÉPENDANCE : le mailleur tourne dans le
//    worker et sur le fil principal, chacun doit lire la même géométrie à
//    l'import, sans promesse (`paris-monuments-hd.js`). Positions quantifiées
//    au 1/256e de bloc, deltas en varint, index en « distance au plus haut
//    sommet vu » — puis base64.
import { MeshoptSimplifier as S, MeshoptEncoder as E } from 'meshoptimizer';
import fs from 'fs';
import path from 'path';

export const HAUT = 69;          // le sommet de la flèche, en blocs (la tour Eiffel du ciel, v335)
export const DEMI_SOCLE = 8.4;   // le bord extérieur des socles de maçonnerie, en blocs
export const ERREUR = 0.025;     // l'écart toléré à la décimation, en blocs
export const QUANTUM = 256;      // sommets au 1/256e de bloc

const [,, dossier, sortie] = process.argv;
await S.ready; await E.ready;
const g = JSON.parse(fs.readFileSync(path.join(dossier, 'scene.gltf'), 'utf8'));
const bin = fs.readFileSync(path.join(dossier, 'scene.bin'));
const lire = (i) => {
  const a = g.accessors[i], v = g.bufferViews[a.bufferView];
  const n = { SCALAR: 1, VEC3: 3 }[a.type];
  const T = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType];
  const off = (v.byteOffset || 0) + (a.byteOffset || 0);
  return new T(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * n * T.BYTES_PER_ELEMENT));
};
// La translation du nœud « Eiffel-Tower » (le seul nœud qui en porte une).
const decal = g.nodes.find((n) => n.name === 'Eiffel-Tower').matrix.slice(12, 15);

// Sommets soudés par position : la décimation a besoin d'une topologie.
const cles = new Map(), pos = [], parMatiere = [[], [], []];
let haut = -Infinity, socle = 0;
for (const m of g.meshes) for (const p of m.primitives) {
  const P = lire(p.attributes.POSITION), I = lire(p.indices);
  const ids = new Uint32Array(P.length / 3);
  for (let k = 0; k < ids.length; k++) {
    const x = P[3 * k] + decal[0], y = P[3 * k + 1] + decal[1], z = P[3 * k + 2] + decal[2];
    const c = `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
    let id = cles.get(c);
    if (id === undefined) { id = pos.length / 3; cles.set(c, id); pos.push(x, z, -y); }
    ids[k] = id;
    haut = Math.max(haut, z);
    if (p.material === 1) socle = Math.max(socle, Math.abs(x), Math.abs(y));
  }
  for (let t = 0; t < I.length; t += 3) {
    const a = ids[I[t]], b = ids[I[t + 1]], c = ids[I[t + 2]];
    if (a !== b && b !== c && a !== c) parMatiere[p.material].push(a, b, c);
  }
}
const SV = HAUT / haut, SH = DEMI_SOCLE / socle;
const jeu = new Float32Array(pos.length);
for (let k = 0; k < pos.length; k += 3) { jeu[k] = pos[k] * SH; jeu[k + 1] = pos[k + 1] * SV; jeu[k + 2] = pos[k + 2] * SH; }

const varint = (out, v) => { while (v > 127) { out.push((v & 127) | 128); v >>>= 7; } out.push(v); };
const zz = (v) => (v << 1) ^ (v >> 31);
const parties = [];
let avant = 0, apres = 0;
for (const [m, brut] of parMatiere.entries()) {
  avant += brut.length / 3;
  const [ix] = S.simplify(new Uint32Array(brut), jeu, 3, 0, ERREUR, ['ErrorAbsolute', 'Permissive']);
  const [remap, n] = E.reorderMesh(ix, true, false);   // ix réécrit, sommets dans l'ordre d'usage
  const q = new Int32Array(n * 3);
  for (let k = 0; k < remap.length; k++) if (remap[k] !== 0xffffffff) for (let c = 0; c < 3; c++) q[remap[k] * 3 + c] = Math.round(jeu[k * 3 + c] * QUANTUM);
  const octets = [];
  varint(octets, n); varint(octets, ix.length / 3);
  const prec = [0, 0, 0];
  for (let k = 0; k < n; k++) for (let c = 0; c < 3; c++) { varint(octets, zz(q[k * 3 + c] - prec[c])); prec[c] = q[k * 3 + c]; }
  let suivant = 0;
  for (const i of ix) { varint(octets, suivant - i); if (i === suivant) suivant++; }
  apres += ix.length / 3;
  parties.push(Buffer.from(octets).toString('base64'));
}
const credit = '"Eiffel Tower" (https://sketchfab.com/3d-models/eiffel-tower-6830e60d2c1048f2a33e92679664f652) '
  + 'by Johnson Martin (https://sketchfab.com/Johnson-Martin), CC-BY-4.0';
const js = `// LA GÉOMÉTRIE DE LA TOUR EIFFEL — fichier ENGENDRÉ par scripts/tour-eiffel.mjs, ne pas modifier à la main.
//
// D'après ${credit}.
// Décimé de ${avant} à ${apres} triangles (erreur ${ERREUR} bloc), mis à l'échelle du jeu :
// ${HAUT} blocs de haut, socles à ±${DEMI_SOCLE} blocs. Trois parties : le fer, la
// maçonnerie des socles, le vitrage des étages. Lu par paris-monuments-hd.js.
export const CREDIT = ${JSON.stringify(credit)};
export const QUANTUM = ${QUANTUM};
export const PARTIES = ${JSON.stringify(parties, null, 0).replace(/","/g, '",\n  "').replace('["', '[\n  "').replace('"]', '",\n]')};
`;
fs.writeFileSync(sortie, js);
console.log(JSON.stringify({ avant, apres, SH: +SH.toFixed(4), SV: +SV.toFixed(4), octets: js.length }));
