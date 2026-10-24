// node --experimental-loader ./tests/porsche-911-loader.mjs --test tests/porsche-911.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { nodeTextures } from './porsche-911-textures.mjs';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { jsonDuGlb, signaturesDuGlb, SIGNATURES_GLB } from '../src/signatures.js';
import { planPortieres, equiperPortieres, ouvrir } from '../src/portieres.js';

const octets = readFileSync(new URL('../vendor/voitures/porsche-911-gt3-rs-hd-v2.glb', import.meta.url));
const json = jsonDuGlb(octets);
const gltf = await new GLTFLoader().register(nodeTextures).parseAsync(octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength), '');
const modele = gltf.scene;

test('GLB autonome chargé par le vrai GLTFLoader r160 du jeu', () => {
  assert.equal(octets.readUInt32LE(8), octets.length);
  assert.equal(json.asset.version, '2.0');
  assert(json.buffers.every(b => !b.uri));
  assert.equal(json.images.length, 4);
  assert(json.images.every(im => im.bufferView !== undefined && !im.uri));
  assert.equal(json.extensionsRequired?.length || 0, 0);
  assert(modele.getObjectByName('Interior_SteeringWheel'), 'volant nommé selon le contrat de flotte');
  assert(octets.length < 12 * 1024 * 1024);
});

test('géométries finies, index valides et budget borné', () => {
  let triangles = 0, meshes = 0;
  modele.traverse(o => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry, p = g.attributes.position, n = g.attributes.normal;
    assert(p.count > 0 && p.count === n.count);
    assert([...p.array, ...n.array].every(Number.isFinite));
    assert([...g.index.array].every(i => i >= 0 && i < p.count));
    assert.equal(g.index.count % 3, 0);
    triangles += g.index.count / 3;
  });
  assert(triangles < 400000, `budget de triangles : ${triangles}`);
  assert(meshes <= 40, `budget de maillages : ${meshes}`);
});

test('quatre roues au sol, empattement de 2,457 m, rotations indépendantes', () => {
  const wheels = ['FL', 'FR', 'RL', 'RR'].map(s => modele.getObjectByName('Wheel_' + s));
  assert(wheels.every(Boolean));
  assert(Math.abs(wheels[0].position.z - wheels[2].position.z - 2.457) < 1e-6);
  for (const wheel of wheels) {
    const b = new THREE.Box3().setFromObject(wheel);
    assert(Math.abs(b.min.y) < .005, `contact ${wheel.name} : ${b.min.y}`);
    assert(b.max.y - b.min.y > .69 && b.max.y - b.min.y < .75);
  }
  const copy = modele.clone(true), w = copy.getObjectByName('Wheel_FL');
  w.rotation.x = 1.3;
  assert.equal(wheels[0].rotation.x, 0);
  // Mesurer les sommets : tourner une AABB gonfle sa boîte, pas la roue.
  const b = new THREE.Box3().setFromObject(w, true);
  assert(b.max.y - b.min.y < .76, 'la roue tourne autour de son essieu');
});

test('les matériaux du GLB sont tous préchauffés', () => {
  for (const s of signaturesDuGlb(json, { env: true })) assert(SIGNATURES_GLB.includes(s), `signature manquante : ${s}`);
});

test('identifiant sauvegardé stable et URL distincte du placeholder mis en cache', () => {
  const source = readFileSync(new URL('../src/vehicules.js', import.meta.url), 'utf8');
  assert.match(source, /fichier: 'porsche-911-gt3-rs\.glb', asset: 'porsche-911-gt3-rs-hd-v2\.glb'/);
  assert.match(source, /entree\.asset \|\| entree\.fichier/);
});

test('les vraies portières du jeu se découpent, ouvrent et préservent le prototype', () => {
  const cadre = new THREE.Group(); cadre.rotation.y = Math.PI; cadre.add(modele.clone(true));
  const proto = new THREE.Group(); proto.add(cadre);
  const g = new THREE.Group(), instance = proto.clone(true); g.add(instance);
  g.userData = { flotte: 'porsche-911-gt3-rs.glb', proto, modele: instance };
  const before = [];
  proto.traverse(o => { if (o.isMesh) before.push([o.geometry, o.geometry.index.array.slice()]); });
  const plan = planPortieres(g);
  assert(plan, 'découpe possible');
  assert(plan.aire['-1'] > .25 && plan.aire['1'] > .25);
  const doors = equiperPortieres(g); assert(doors);
  for (const s of ['-1', '1']) {
    ouvrir(doors[s], 1);
    assert(Math.abs(doors[s].rotation.y - Number(s) * Math.PI / 3) < 1e-9);
    ouvrir(doors[s], 0); assert(Math.abs(doors[s].rotation.y) < 1e-12);
  }
  for (const [geo, indices] of before) assert.deepEqual(geo.index.array, indices);
});

test('textures embarquées décodées, vernis et vitrage conservés', () => {
  const textures=new Set(),materials=new Set();
  modele.traverse(o=>{if(o.isMesh)materials.add(o.material);});
  for(const m of materials)for(const key of ['map','normalMap'])if(m[key])textures.add(m[key]);
  assert.equal(textures.size,4);
  for(const t of textures){assert.equal(t.image.data.length,t.image.width*t.image.height*4);assert(t.image.width>=256);assert.equal(t.flipY,false);}
  const paint=[...materials].find(m=>m.name==='Paint_Primary');assert(paint.isMeshPhysicalMaterial);assert.equal(paint.clearcoat,1);
  const glass=[...materials].find(m=>m.name==='Glass_Windows');assert(glass.transparent&&glass.opacity>0&&glass.opacity<1);
  for(const side of ['FL','FR','RL','RR']){
    modele.getObjectByName('Wheel_'+side).traverse(o=>assert.notEqual(o.material?.name,'Caliper_PCCB','étrier fixe hors du pivot tournant'));
  }
});
