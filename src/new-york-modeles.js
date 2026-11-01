// NEW YORK D'APRÈS LES MODÈLES DE MAX (v565) — l'Empire State Building et la
// statue de la Liberté de Brian Trepanier (Sketchfab, CC-BY-4.0), préparés par
// scripts/new-york.mjs (crédits : vendor/newyork/LICENSE.md).
//
// Chaque fichier porte deux maillages et une texture cuite : `proche` (le
// modèle qu'on voit de près) et `loin` (la silhouette des secteurs lointains).
// Ils arrivent APRÈS le démarrage, comme la flotte : tant qu'un fichier manque,
// le jeu dessine ce qu'il dessinait avant (les volumes de l'Empire, la statue
// en blocs) — un modèle absent n'empêche jamais New York d'exister.
//
// LE MATÉRIAU EST À NOUS, PAS AU FICHIER. Sa clé de programme (un Standard avec
// une carte) doit être compilée pendant l'accueil avec les autres matériaux de
// New York (`chauffeNY`, main.js) : il naît donc avec la ville, sur une carte
// d'attente d'un texel, et reçoit la texture du fichier quand elle arrive —
// remplacer une carte par une autre ne change pas la clé.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

export const FICHIERS_NY = {
  empire: './vendor/newyork/empire-state.glb',
  liberte: './vendor/newyork/statue-liberte.glb',
};

// `?photo=0` rejoue le New York d'avant (les volumes et la statue en blocs) :
// pour mesurer et pour les captures d'avant/après, jamais un réglage du jeu.
export const PHOTO_NY = typeof location === 'undefined'
  || new URLSearchParams(location.search).get('photo') !== '0';

const materiaux = {};
export function materiauNY(nom) {
  if (materiaux[nom]) return materiaux[nom];
  const attente = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255]), 1, 1);
  attente.colorSpace = THREE.SRGBColorSpace;
  attente.needsUpdate = true;
  // La carte sert aussi d'émissive : la nuit, le monument est éclairé par
  // projecteurs (intensité réglée par le rendu de Manhattan). Posée dès la
  // naissance, sinon la clé de programme changerait à l'arrivée du fichier.
  const m = new THREE.MeshStandardMaterial({
    map: attente, emissiveMap: attente, emissive: 0xffe2b8, emissiveIntensity: 0,
    roughness: 0.86, metalness: 0,
  });
  m.name = `photogrammetrie-${nom}`;
  return (materiaux[nom] = m);
}

const charges = {}, prets = {};
export function chargerModeleNY(nom) {
  if (!PHOTO_NY) return null;
  if (!charges[nom]) {
    charges[nom] = new GLTFLoader().loadAsync(FICHIERS_NY[nom]).then((gltf) => {
      const out = {};
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        out[o.name] = o.geometry;
        const carte = o.material.map;
        if (carte && !out.carte) out.carte = carte;
      });
      const m = materiauNY(nom);
      if (out.carte) {
        out.carte.colorSpace = THREE.SRGBColorSpace;
        out.carte.anisotropy = 4;
        m.map = out.carte;
        m.emissiveMap = out.carte;
      }
      for (const cle of ['proche', 'loin']) if (out[cle]) {
        out[cle].computeVertexNormals();
        out[cle].computeBoundingSphere();
      }
      return (prets[nom] = out);
    }).catch((e) => { console.warn('modèle de New York', nom, e); return null; });
  }
  return charges[nom];
}
// Le modèle s'il est arrivé, sinon null (sans promesse : le rendu le lit à
// l'image où il construit).
export function modeleNY(nom) {
  if (!PHOTO_NY) return null;
  if (!charges[nom]) chargerModeleNY(nom);
  return prets[nom] || null;
}
// Un maillage du modèle : géométrie partagée (jamais rendue au pilote par
// `disposeGroup`, qui ne rend que ce que le groupe possède), ombres portées.
export function maillageNY(nom, cle) {
  const m = modeleNY(nom);
  if (!m || !m[cle]) return null;
  const mesh = new THREE.Mesh(m[cle], materiauNY(nom));
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.name = `${nom}-${cle}`;
  mesh.userData.photoNY = nom;
  return mesh;
}
