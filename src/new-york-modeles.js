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
import { chargeurModeles, urlModele } from './ktx2.js';

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
  m.userData.attente = { map: attente, emissiveMap: attente };
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
  matiereQuartiers.userData.attente = { map: attente, emissiveMap: noir };
  return matiereQuartiers;
}
let promesseQuartiers = null;
// Rend { nom: géométrie } (les corps et leurs `-loin`), ou null sans le fichier.
export function chargerQuartiers() {
  if (!PHOTO_NY) return null;
  if (!promesseQuartiers) {
    promesseQuartiers = chargeurModeles().loadAsync(urlModele("./vendor/newyork/quartiers.glb")).then((gltf) => {
      const out = {}, m = materiauQuartiers();
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        // GLTFLoader remplace les « - » d'un nom de nœud : on relit le maillage
        out[o.name.replace(/_loin$/, "-loin")] = o.geometry;
      });
      poserCartes("quartiers", m, cartesDe(gltf));
      return out;
    }).catch((e) => { console.warn("quartiers de New York", e); return null; });
  }
  return promesseQuartiers;
}

// LES TEXTURES DE NEW YORK NE SE GARDENT QU'AUTOUR DE NEW YORK (chantier
// mémoire). Les trois photos recuites (Empire, Liberté, atlas des quartiers)
// se chargeaient au démarrage et restaient tenues partout : 69 Mo en RGBA,
// 17 en KTX2, mesurés à Paris (sonde-textures-paris.cjs). Loin du plan, le
// matériau reprend sa carte d'attente — la MÊME texture que celle de sa
// naissance, donc la même clé de programme : rien ne se recompile au retour
// (v246) — et l'image est rendue au pilote et au ramasse-miettes. Près du plan,
// on relit le fichier (cache du service worker) et l'on repose ses cartes.
// La géométrie reste : c'est le budget de `mondeMo`, pas celui-ci.
let gardeNY = true;
const charges = {}, prets = {};
const cartesTenues = {};       // nom -> [textures posées]
const relectures = {};         // nom -> promesse d'une relecture en cours
const FICHIER_CARTES = { ...FICHIERS_NY, quartiers: './vendor/newyork/quartiers.glb' };
function cartesDe(gltf) {
  let map = null, emissiveMap = null;
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    if (!map && o.material.map) map = o.material.map;
    if (!emissiveMap && o.material.emissiveMap) emissiveMap = o.material.emissiveMap;
  });
  return { map, emissiveMap };
}
function poserCartes(nom, m, { map, emissiveMap }) {
  const tex = [...new Set([map, emissiveMap].filter(Boolean))];
  if (!gardeNY) { for (const t of tex) t.dispose(); return; }
  if (map) { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; m.map = map; }
  // les monuments s'éclairent par leur propre photo ; les quartiers ont la leur
  if (nom === 'quartiers') { if (emissiveMap) { emissiveMap.colorSpace = THREE.SRGBColorSpace; m.emissiveMap = emissiveMap; } }
  else if (map) m.emissiveMap = map;
  cartesTenues[nom] = tex;
}
function materiauDe(nom) { return nom === 'quartiers' ? materiauQuartiers() : materiauNY(nom); }
function rendreCartes(nom) {
  const tex = cartesTenues[nom];
  if (!tex) return;
  const m = materiauDe(nom), a = m.userData.attente;
  m.map = a.map; m.emissiveMap = a.emissiveMap;
  for (const t of tex) t.dispose();
  delete cartesTenues[nom];
}
function relireCartes(nom) {
  if (cartesTenues[nom] || relectures[nom]) return;
  relectures[nom] = chargeurModeles().loadAsync(urlModele(FICHIER_CARTES[nom])).then((gltf) => {
    gltf.scene.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    poserCartes(nom, materiauDe(nom), cartesDe(gltf));
  }).catch((e) => console.warn('cartes de New York', nom, e)).finally(() => { delete relectures[nom]; });
}
// Appelé par le rendu de Manhattan, avec hystérésis : vrai près du plan, faux
// loin, rien entre les deux. Ne relit que ce qui avait déjà été chargé une fois.
export function garderTexturesNY(garder) {
  if (!PHOTO_NY || garder === gardeNY) return;
  gardeNY = garder;
  const promesses = { empire: charges.empire, liberte: charges.liberte, quartiers: promesseQuartiers };
  for (const nom of Object.keys(FICHIER_CARTES)) {
    if (!promesses[nom]) continue;
    if (garder) promesses[nom].then((r) => { if (r && gardeNY) relireCartes(nom); });
    else rendreCartes(nom);
  }
}
// Pour les témoins : ce qui est tenu, nom par nom.
export function etatTexturesNY() {
  return { garde: gardeNY, tenues: Object.fromEntries(Object.entries(cartesTenues).map(([k, v]) => [k, v.length])) };
}

export function chargerModeleNY(nom) {
  if (!PHOTO_NY) return null;
  if (!charges[nom]) {
    charges[nom] = chargeurModeles().loadAsync(urlModele(FICHIERS_NY[nom])).then((gltf) => {
      const out = {};
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        out[o.name] = o.geometry;
      });
      poserCartes(nom, materiauNY(nom), cartesDe(gltf));
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
