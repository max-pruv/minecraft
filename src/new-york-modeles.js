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

// LES QUARTIERS (v583) : le paquet CCity préparé par scripts/new-york-quartiers.mjs,
// un seul fichier, un seul atlas. La matière naît avec la ville, comme les deux
// monuments, avec son émissive et ses deux faces : la chauffe la compile, l'arrivée
// du fichier ne change pas sa clé. `Lot` (manhattan-render.js) pose chaque forme en
// essaim, et une teinte par instance.
let matiereQuartiers = null;
export function materiauQuartiers() {
  if (matiereQuartiers) return matiereQuartiers;
  const attente = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255]), 1, 1);
  attente.colorSpace = THREE.SRGBColorSpace;
  attente.needsUpdate = true;
  const noir = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  noir.colorSpace = THREE.SRGBColorSpace;
  noir.needsUpdate = true;
  matiereQuartiers = new THREE.MeshStandardMaterial({
    map: attente, emissiveMap: noir, emissive: 0xffffff, emissiveIntensity: 0,
    roughness: 0.88, metalness: 0, side: THREE.DoubleSide,
  });
  // l'atlas est sombre sous ACES (vu en capture) : on l'éclaircit d'un quart
  matiereQuartiers.color.setRGB(1.28, 1.28, 1.28);
  matiereQuartiers.name = "quartiers-new-york";
  return matiereQuartiers;
}
let promesseQuartiers = null;
// Rend { nom: géométrie } (les corps et leurs `-loin`), ou null sans le fichier.
export function chargerQuartiers() {
  if (!PHOTO_NY) return null;
  if (!promesseQuartiers) {
    promesseQuartiers = new GLTFLoader().loadAsync("./vendor/newyork/quartiers.glb").then((gltf) => {
      const out = {}, m = materiauQuartiers();
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        // GLTFLoader remplace les « - » d'un nom de nœud : on relit le maillage
        out[o.name.replace(/_loin$/, "-loin")] = o.geometry;
        if (o.material.map) {
          o.material.map.colorSpace = THREE.SRGBColorSpace;
          o.material.map.anisotropy = 4;
          m.map = o.material.map;
        }
        if (o.material.emissiveMap) {
          o.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          m.emissiveMap = o.material.emissiveMap;
        }
      });
      return out;
    }).catch((e) => { console.warn("quartiers de New York", e); return null; });
  }
  return promesseQuartiers;
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
