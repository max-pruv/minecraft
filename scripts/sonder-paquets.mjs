// Sonde des paquets glTF Sketchfab : boîte, triangles, matériaux et nœuds qui
// ressemblent à des roues — de quoi régler `convertir-flotte.mjs` sur chaque
// modèle.  node scripts/sonder-paquets.mjs <dossier>...
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

globalThis.window = { URL };
globalThis.ProgressEvent = class { constructor(t, o) { Object.assign(this, o); this.type = t; } };

async function charger(dir) {
  const json = JSON.parse(fs.readFileSync(path.join(dir, 'scene.gltf'), 'utf8'));
  for (const b of json.buffers) b.uri = 'data:application/octet-stream;base64,' + fs.readFileSync(path.join(dir, b.uri)).toString('base64');
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'souches', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
  const gltf = await loader.parseAsync(JSON.stringify(json), '');
  gltf.scene.updateMatrixWorld(true);
  return { gltf, json };
}

for (const d of process.argv.slice(2)) {
  const { gltf, json } = await charger(path.resolve(d));
  const tout = new THREE.Box3().setFromObject(gltf.scene);
  let tri = 0, mesh = 0;
  const mats = new Map();
  const roues = [];
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    mesh++;
    const t = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    tri += t;
    const mn = o.material.name || '?';
    mats.set(mn, (mats.get(mn) || 0) + t);
    const noms = [];
    for (let p = o; p; p = p.parent) if (p.name) noms.push(p.name);
    const lig = noms.join('/');
    if (/wheel|tire|tyre|rim|roue|pneu|brake|caliper|disc|steer/i.test(lig + ' ' + mn)) {
      const b = new THREE.Box3().setFromObject(o);
      const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
      roues.push(`${lig.slice(0, 70)} [${mn}] c=${c.toArray().map((v) => v.toFixed(2))} s=${s.toArray().map((v) => v.toFixed(2))}`);
    }
  });
  const s = tout.getSize(new THREE.Vector3());
  console.log(`\n=== ${path.basename(d)} : ${mesh} maillages, ${Math.round(tri)} tri, ${json.images?.length || 0} images`);
  console.log(`boîte min=${tout.min.toArray().map((v) => v.toFixed(2))} taille=${s.toArray().map((v) => v.toFixed(2))}`);
  console.log('matériaux:', [...mats].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${Math.round(v)}`).join(' | '));
  console.log(`roues? (${roues.length})`);
  for (const r of roues.slice(0, 40)) console.log('  ' + r);
}
