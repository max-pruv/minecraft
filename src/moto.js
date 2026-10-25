// LA MOTO (v553). Max : « J'ajoute aussi le concept de moto pour cette moto
// en question » — la Harley-Davidson de police qu'il a fournie (Comrade1280,
// CC-BY-4.0, crédit dans vendor/voitures/LICENSE.md).
//
// La moto n'est PAS dans `FLOTTE` : la flotte est faite de voitures à quatre
// roues, et une dizaine de témoins le supposent (les quatre essieux, les feux
// de détresse aux quatre coins, l'habitacle). Elle a son chargeur à elle, au
// même contrat : nez vers −z une fois posée, roues au sol, pivots `Wheel_F` et
// `Wheel_R` posés au centre du pneu par la conversion
// (`scripts/convertir-police.mjs`), que le bestiaire fait tourner à la distance
// parcourue (animals.js) et que `sensations.js` braque (`/^Wheel_F/`).
//
// Comme une voiture neuve (montures.js), une coque d'attente sculptée tient
// la place tant que le fichier n'est pas là, et reste le secours s'il manque.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { partagerTout, liberer } from './liberer.js';
import { matiereAdditive } from './avions.js';

export const FICHIER_MOTO = 'moto-police.glb';
let chargement = null, proto = null;

export function chargerMoto() {
  if (typeof document === 'undefined') return null;
  if (chargement) return chargement;
  chargement = new GLTFLoader().loadAsync('./vendor/voitures/' + FICHIER_MOTO).then((gltf) => {
    const cadre = new THREE.Group();
    cadre.add(gltf.scene);
    cadre.rotation.y = Math.PI;                      // +Z nez (contrat) → −z jeu
    const porteur = new THREE.Group();
    porteur.add(cadre);
    porteur.updateMatrixWorld(true);
    let roue = null;
    porteur.traverse((o) => { if (!roue && /^Wheel_(F|R)$/.test(o.name || '')) roue = o; });
    const b = roue ? new THREE.Box3().setFromObject(roue) : null;
    porteur.userData.rayonRoue = b ? (b.max.y - b.min.y) / 2 : 0.33;
    porteur.userData.protoDe = FICHIER_MOTO;
    partagerTout(porteur);   // le prototype ne se rend jamais (v495)
    proto = porteur;
    return porteur;
  }).catch((e) => { console.warn('moto', e); return null; });
  return chargement;
}
export const motoPrete = () => proto;

// LES FEUX DE POLICE DE LA MOTO : un éclat rouge en haut du mât arrière, un
// éclat bleu au pied du pare-brise, en `matiereAdditive` (la flamme, v264 :
// la même clé de programme, chauffée à l'accueil) — nés cachés, allumés par
// `gyrophares` (patrouille.js). Repère du jeu : nez vers −z.
const GEO_ECLAT = new THREE.SphereGeometry(0.09, 10, 8);
GEO_ECLAT.userData.partagee = true;
function eclats(g) {
  const rouge = new THREE.Mesh(GEO_ECLAT, matiereAdditive(0xff2a1a, 0.9));
  rouge.position.set(0, 1.18, 0.93);
  const bleu = new THREE.Mesh(GEO_ECLAT, matiereAdditive(0x2a5cff, 0.9));
  bleu.position.set(0, 1.02, -0.72);
  rouge.name = 'Eclat_G'; bleu.name = 'Eclat_D';
  rouge.visible = bleu.visible = false;
  g.add(rouge, bleu);
}

// La coque d'attente : un cadre, deux roues, une selle, un pare-brise.
function coque() {
  const g = new THREE.Group();
  const noir = new THREE.MeshLambertMaterial({ color: 0x15171c });
  const chrome = new THREE.MeshLambertMaterial({ color: 0xb8bcc4 });
  const blanc = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
  const roues = [];
  for (const [nom, z] of [['Wheel_F', -0.81], ['Wheel_R', 0.81]]) {
    const pivot = new THREE.Group();
    pivot.name = nom;
    pivot.position.set(0, 0.33, z);
    const p = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 20), noir);
    p.rotation.y = Math.PI / 2;
    pivot.add(p);
    g.add(pivot);
    roues.push(pivot);
  }
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 1.3), blanc);
  corps.position.set(0, 0.62, 0);
  const selle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.6), noir);
  selle.position.set(0, 0.86, 0.3);
  const guidon = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.05), chrome);
  guidon.position.set(0, 1.08, -0.5);
  g.add(corps, selle, guidon);
  g.userData.coqueMoto = [corps, selle, guidon, ...roues];
  g.userData.roues = roues;
  return g;
}

// Une moto à monter : la coque d'abord, le vrai modèle dès qu'il est là.
export function construireMoto() {
  const g = coque();
  g.userData.flotte = FICHIER_MOTO;
  g.userData.nomVoiture = 'Moto de police';
  g.userData.rayonRoue = 0.33;
  g.userData.legs = [];
  eclats(g);
  const p = chargerMoto();
  if (p) p.then((modele) => {
    if (!modele || !g.userData.coqueMoto) return;
    // ce qu'on remplace dans un groupe se rend (v495)
    for (const o of g.userData.coqueMoto) { g.remove(o); liberer(o); }
    g.userData.coqueMoto = null;
    const m = modele.clone(true);
    g.add(m);
    g.userData.modele = m;
    const roues = [];
    m.traverse((o) => { if (/^Wheel_(F|R)$/.test(o.name || '')) roues.push(o); });   // les pivots seulement
    g.userData.roues = roues;
    g.userData.rayonRoue = modele.userData.rayonRoue || 0.33;
  });
  return g;
}
