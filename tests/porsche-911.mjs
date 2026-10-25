// LES TÉMOINS DE LA 911 RECONSTRUITE (v545), LUS PAR `degats.js`.
//
// Le paquet livré par l'autre session apportait ses tests sous `node --test`,
// avec un chargeur à part : un test qu'aucun portail ne lance ne garde rien.
// Ils vivent donc ici, en fonction, et `degats.js` — gardien de
// `vehicules.js` et de `portieres.js` — les appelle après avoir donné « three »
// aux modules (le crochet de `plafond.js`). Chaque témoin rend [nom, ok, détail].
//
// Le GLB est chargé par le VRAI GLTFLoader du dépôt ; seules les images PNG
// passent par un décodeur de node (`porsche-911-textures.mjs`), parce que
// node n'a pas d'`Image`. Les géométries, elles, ne sont pas imitées.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { nodeTextures } from './porsche-911-textures.mjs';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { jsonDuGlb, signaturesDuGlb, SIGNATURES_GLB } from '../src/signatures.js';
import { planPortieres, equiperPortieres, ouvrir } from '../src/portieres.js';

export const FICHIER_911 = 'porsche-911-gt3-rs-hd-v2-compact.glb';

export async function temoinsPorsche911() {
  const t = [];
  const octets = readFileSync(new URL('../vendor/voitures/' + FICHIER_911, import.meta.url));
  const json = jsonDuGlb(octets);
  const gltf = await new GLTFLoader().register(nodeTextures)
    .parseAsync(octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength), '');
  const modele = gltf.scene;

  t.push(['911 : le GLB est autonome et se lit par le vrai GLTFLoader du jeu',
    octets.readUInt32LE(8) === octets.length && json.asset.version === '2.0'
      && json.buffers.every((b) => !b.uri) && json.images.length === 4
      && json.images.every((im) => im.bufferView !== undefined && !im.uri)
      && !(json.extensionsRequired || []).length && !!modele.getObjectByName('Interior_SteeringWheel'),
    `${(octets.length / 1048576).toFixed(1)} Mo, ${json.images.length} image(s)`]);

  // LE POIDS EST DÉCLARÉ, PAS DEVINÉ : Max a choisi d'essayer le modèle lourd
  // tel quel. Ces bornes gardent CE modèle-là ; un modèle plus lourd encore
  // rougit et se remesure au lieu de passer en silence.
  // LA COMPACTION EST SANS PERTE, ET CELA SE RECALCULE (paquet « allégé »).
  // Le fichier compact garde chaque triangle : pour chaque primitive, les
  // attributs dépliés par l'index doivent rendre l'empreinte relevée sur le
  // fichier APPROUVÉ (11 602 448 octets, SHA-256 c929874f…), que le rapport
  // porte. Une retouche « légère » qui changerait un sommet rougit ici.
  const rapport = JSON.parse(readFileSync(new URL('../docs/porsche-911-compaction.json', import.meta.url)));
  const debut = 28 + octets.readUInt32LE(12);
  const lire = (i) => { const a = json.accessors[i], v = json.bufferViews[a.bufferView];
    return { a, b: octets.subarray(debut + (v.byteOffset || 0) + (a.byteOffset || 0), debut + (v.byteOffset || 0) + v.byteLength) }; };
  let k = 0, egales = 0;
  for (const mesh of json.meshes) for (const prim of mesh.primitives) {
    const ix = lire(prim.indices), t = ix.a.componentType === 5123 ? 2 : 4;
    const idx = Array.from({ length: ix.a.count }, (_, i) => t === 2 ? ix.b.readUInt16LE(i * 2) : ix.b.readUInt32LE(i * 4));
    const h = createHash('sha256');
    for (const ai of Object.values(prim.attributes)) {
      const at = lire(ai), pas = { VEC2: 8, VEC3: 12, VEC4: 16 }[at.a.type];
      const deplie = Buffer.alloc(idx.length * pas);
      idx.forEach((v, i) => at.b.copy(deplie, i * pas, v * pas, (v + 1) * pas));
      h.update(deplie);
    }
    if (h.digest('hex') === rapport.primitiveDigests[k++]) egales++;
  }
  t.push(['911 : le fichier compact rend chaque triangle du modèle approuvé, bit pour bit',
    json.asset.extras && json.asset.extras.sourceSha256 === 'c929874f70ce67e56dddea1d94d76ed187dbdb9596549ee266c95507e07c360f'
      && k === rapport.primitiveDigests.length && egales === k && octets.length === rapport.compactBytes,
    `${egales}/${k} primitives identiques, ${(octets.length / 1e6).toFixed(2)} Mo contre ${(rapport.originalBytes / 1e6).toFixed(2)}`]);

  let triangles = 0, maillages = 0, fini = true;
  modele.traverse((o) => {
    if (!o.isMesh) return;
    maillages++;
    const g = o.geometry, p = g.attributes.position, n = g.attributes.normal;
    if (!(p.count > 0 && n && p.count === n.count)) fini = false;
    for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i]) || !Number.isFinite(n.array[i])) { fini = false; break; }
    for (let i = 0; i < g.index.count; i++) if (g.index.array[i] >= p.count) { fini = false; break; }
    if (g.index.count % 3) fini = false;
    triangles += g.index.count / 3;
  });
  t.push(['911 : géométries finies, index valides, poids borné (400 000 triangles, 40 maillages, 8 Mo)',
    fini && triangles < 400000 && maillages <= 40 && octets.length < 8 * 1048576,
    `${triangles} triangles, ${maillages} maillages`]);

  const roues = ['FL', 'FR', 'RL', 'RR'].map((s) => modele.getObjectByName('Wheel_' + s));
  let rouesOk = roues.every(Boolean) && Math.abs(roues[0].position.z - roues[2].position.z - 2.457) < 1e-6;
  const contacts = [];
  if (rouesOk) for (const w of roues) {
    const b = new THREE.Box3().setFromObject(w);
    contacts.push(b.min.y.toFixed(3));
    if (!(Math.abs(b.min.y) < 0.005 && b.max.y - b.min.y > 0.69 && b.max.y - b.min.y < 0.75)) rouesOk = false;
  }
  let tourne = false;
  if (rouesOk) {
    const copie = modele.clone(true), w = copie.getObjectByName('Wheel_FL');
    w.rotation.x = 1.3;
    // on mesure les sommets : tourner une boîte la gonfle, pas la roue
    const b = new THREE.Box3().setFromObject(w, true);
    tourne = roues[0].rotation.x === 0 && b.max.y - b.min.y < 0.76;
  }
  t.push(['911 : quatre roues au sol, empattement de 2,457 m, chacune tourne sur son essieu', rouesOk && tourne,
    `contacts ${contacts.join(' ')}`]);

  const manquantes = [...signaturesDuGlb(json, { env: true })].filter((s) => !SIGNATURES_GLB.includes(s));
  t.push(['911 : chacun de ses programmes est chauffé à l\'accueil', manquantes.length === 0, manquantes.join(', ')]);

  // L'IDENTIFIANT RESTE, LE FICHIER CHANGE. `fichier` est ce que les garages,
  // le réseau et la couleur de la rue retiennent ; `asset` ce qu'on charge.
  let ident = null;
  try {
    const V = await import('../src/vehicules.js');
    const e = V.FLOTTE.find((f) => f.fichier === 'porsche-911-gt3-rs.glb');
    ident = e && { asset: e.asset, charge: V.fichierCharge(e), ancien: V.fichierCharge(e, true),
      autre: V.fichierCharge(V.FLOTTE.find((f) => f.fichier === 'rimac-nevera.glb')) };
  } catch (err) { ident = { err: String(err.message || err).slice(0, 120) }; }
  t.push(['911 : l\'identifiant sauvegardé reste porsche-911-gt3-rs.glb, le fichier chargé est le neuf, `?asset=0` rend l\'ancien',
    !!ident && ident.charge === FICHIER_911 && ident.ancien === 'porsche-911-gt3-rs.glb' && ident.autre === 'rimac-nevera.glb',
    JSON.stringify(ident)]);

  // LES PORTIÈRES DU JEU (v366) se découpent sur le prototype, sans le toucher.
  const cadre = new THREE.Group(); cadre.rotation.y = Math.PI; cadre.add(modele.clone(true));
  const proto = new THREE.Group(); proto.add(cadre);
  const g = new THREE.Group(), instance = proto.clone(true); g.add(instance);
  g.userData = { flotte: 'porsche-911-gt3-rs.glb', proto, modele: instance };
  const avant = [];
  proto.traverse((o) => { if (o.isMesh) avant.push([o.geometry, o.geometry.index.array.slice()]); });
  const plan = planPortieres(g);
  let portes = !!plan && plan.aire['-1'] > 0.25 && plan.aire['1'] > 0.25;
  const doors = portes ? equiperPortieres(g) : null;
  if (!doors) portes = false;
  else for (const s of ['-1', '1']) {
    ouvrir(doors[s], 1);
    if (Math.abs(doors[s].rotation.y - Number(s) * Math.PI / 3) > 1e-9) portes = false;
    ouvrir(doors[s], 0);
    if (Math.abs(doors[s].rotation.y) > 1e-12) portes = false;
  }
  const intact = avant.every(([geo, idx]) => geo.index.array.length === idx.length && geo.index.array.every((v, i) => v === idx[i]));
  t.push(['911 : les portières du jeu se découpent, s\'ouvrent et laissent le prototype intact', portes && intact,
    plan ? `aire ${Number(plan.aire['-1']).toFixed(2)} / ${Number(plan.aire['1']).toFixed(2)}` : 'pas de plan']);

  const textures = new Set(), materiaux = new Set();
  modele.traverse((o) => { if (o.isMesh) materiaux.add(o.material); });
  for (const m of materiaux) for (const k of ['map', 'normalMap']) if (m[k]) textures.add(m[k]);
  const peinture = [...materiaux].find((m) => m.name === 'Paint_Primary');
  const vitre = [...materiaux].find((m) => m.name === 'Glass_Windows');
  let etrier = false;
  for (const s of ['FL', 'FR', 'RL', 'RR']) modele.getObjectByName('Wheel_' + s).traverse((o) => { if (o.material && o.material.name === 'Caliper_PCCB') etrier = true; });
  t.push(['911 : quatre textures embarquées, laque vernie, vitrage transparent, étriers hors des pivots qui tournent',
    textures.size === 4 && [...textures].every((x) => x.image.data.length === x.image.width * x.image.height * 4 && x.image.width >= 256)
      && !!peinture && peinture.isMeshPhysicalMaterial && peinture.clearcoat === 1
      && !!vitre && vitre.transparent && vitre.opacity > 0 && vitre.opacity < 1 && !etrier,
    `${textures.size} texture(s)`]);
  return t;
}
