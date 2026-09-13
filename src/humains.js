// Anatomies et vêtements Microsoft Rocketbox, MIT (vendor/humains/LICENSE.md).
// La conversion conserve les poids de peau et les articulations. Une seule
// copie des textures/géométries, un squelette indépendant pour chaque personne.
import * as THREE from "three";
import { GLTFLoader } from "../vendor/GLTFLoader.js";
import { clone } from "../vendor/SkeletonUtils.js";
import { partager, partagerTout } from "./liberer.js";

// LES MODÈLES ARRIVENT APRÈS L'ACCUEIL, JAMAIS AVANT (v245). Ce module se
// chargeait par un `await` de premier niveau sur les neuf fichiers — 8,2 Mo,
// quatre-vingts pour cent de tout ce que le jeu télécharge — et comme
// `main.js` l'importe, RIEN de l'accueil ne s'attachait avant qu'ils ne soient
// là : le bouton « Jouer » ne répondait pas. Max, sur l'iPad de quatre ans :
// « il faut attendre quasiment vingt secondes le temps de pouvoir cliquer ».
// Le chargement se lance désormais depuis `main.js` à la première image,
// les neuf fichiers se demandent au réseau ENSEMBLE mais s'analysent UN PAR
// UN, en rendant la main entre deux — l'analyse d'un corps articulé est une
// tâche longue, et l'accueil doit répondre pendant qu'elle avance. Ce qui
// est bâti avant leur arrivée reçoit son corps sur place, sans changer
// d'objet (voir `quandLesHumainsArrivent` et personnages.js).
//
// L'ordre est celui du besoin : les deux chemises portent la tête de tous les
// costumes du château et le corps par défaut des passants ; les enfants sont
// l'avatar du joueur.
const noms = [
  "homme-chemise",
  "femme-chemise",
  "garcon",
  "fille",
  "homme-denim",
  "homme-costume",
  "femme-tailleur",
  "homme-veste",
  "femme-manteau",
];
const prototypes = new Map();
let chargement = null;
let charges = false;
const abonnes = [];
const souffler = () => new Promise((r) => setTimeout(r, 0));

function preparer(scene) {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    // La boîte statique du FBX ne borne pas une jambe animée. La sélection
    // en distance est assurée par presence.js, sans coupure de membre.
    o.frustumCulled = false;
    o.castShadow = true;
    o.receiveShadow = true;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const k of ["map", "normalMap", "alphaMap"]) if (m[k]) partager(m[k]);
    }
  });
  return partagerTout(scene);
}

export function chargerHumains() {
  if (chargement) return chargement;
  if (typeof document === "undefined") {
    charges = true;
    return (chargement = Promise.resolve());
  }
  const loader = new GLTFLoader();
  const base = new URL("../vendor/humains/", import.meta.url).href;
  // le réseau travaille en parallèle, l'analyse se fait dans l'ordre
  const tampons = noms.map((nom) =>
    fetch(`${base}${nom}.glb`).then((r) =>
      r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`)),
    ),
  );
  chargement = (async () => {
    for (let i = 0; i < noms.length; i++) {
      try {
        const { scene } = await loader.parseAsync(await tampons[i], base);
        prototypes.set(noms[i], preparer(scene));
      } catch (err) {
        console.warn(
          `Personnage ${noms[i]} indisponible : modèle de secours.`,
          err.message,
        );
      }
      await souffler();
    }
    charges = true;
    for (const cb of abonnes.splice(0)) {
      try { cb(); } catch (err) { console.warn("mise à niveau des corps :", err.message); }
    }
  })();
  return chargement;
}
export const humainsCharges = () => charges;
// Ce qui doit se faire quand les modèles sont là — tout de suite s'ils le sont.
export function quandLesHumainsArrivent(cb) {
  if (charges) cb();
  else abonnes.push(cb);
}

const q = new THREE.Quaternion(),
  inv = new THREE.Quaternion();
const axe = new THREE.Vector3(1, 0, 0),
  a = new THREE.Vector3(),
  b = new THREE.Vector3();
function abaisser(bone, enfant, cote) {
  if (!bone || !enfant) return;
  bone.updateWorldMatrix(true, true);
  bone.getWorldPosition(a);
  enfant.getWorldPosition(b);
  b.sub(a).normalize();
  const delta = new THREE.Quaternion().setFromUnitVectors(
    b,
    new THREE.Vector3(cote * 0.07, -1, -0.035).normalize(),
  );
  bone.parent.getWorldQuaternion(q);
  inv.copy(q).invert();
  bone.quaternion.premultiply(inv.multiply(delta).multiply(q));
  bone.updateWorldMatrix(false, true);
}

function definirRig(root) {
  root.updateMatrixWorld(true);
  const os = {};
  root.traverse((o) => {
    if (o.isBone) os[o.name.replace(/^.*Bip\d*_?/, "")] = o;
  });
  for (const [cote, s] of [
    ["L", -1],
    ["R", 1],
  ]) {
    abaisser(os[cote + "_UpperArm"], os[cote + "_Forearm"], s);
    abaisser(os[cote + "_Forearm"], os[cote + "_Hand"], s);
  }
  root.updateMatrixWorld(true);
  const rig = {};
  for (const [nom, bone] of Object.entries(os)) {
    bone.parent.getWorldQuaternion(q);
    rig[nom] = {
      bone,
      repos: bone.quaternion.clone(),
      axe: axe.clone().applyQuaternion(q.clone().invert()).normalize(),
    };
  }
  return rig;
}
function rotation(rig, nom, angle) {
  const r = rig[nom];
  if (!r) return;
  r.bone.quaternion.copy(r.repos).premultiply(q.setFromAxisAngle(r.axe, angle));
}

export function construireCorpsRealiste(p) {
  const enfant = p.tenue === "enfant";
  const feminin =
    p.genre === "femme" || ["long", "chignon", "nattes"].includes(p.coupe);
  const choix = enfant
    ? feminin
      ? "fille"
      : "garcon"
    : p.modeleHumain ||
      (feminin ? "femme-chemise" : p.veste ? "homme-veste" : "homme-chemise");
  const proto = prototypes.get(choix);
  if (!proto) return null;
  const g = new THREE.Group();
  const corps = clone(proto);
  g.add(corps);
  const rig = definirRig(corps);
  // Les commandes historiques (métiers, réseau, accessoires) gardent leurs
  // pivots en mètres. Elles pilotent ensuite le squelette avec ses quaternions.
  const e = enfant ? 0.84 : 1;
  const legs = [-1, 1].map((s) => {
    const n = new THREE.Group();
    n.position.set(s * 0.105 * e, 0.92 * e, 0);
    g.add(n);
    return n;
  });
  const arms = [-1, 1].map((s) => {
    const n = new THREE.Group();
    n.position.set(s * 0.225 * e, 1.4 * e, 0);
    g.add(n);
    return n;
  });
  g.userData = {
    legs,
    arms,
    anatomie: "rocketbox-v241",
    rig,
    corps,
    enfant,
    hauteur: enfant ? 1.48 : 1.76,
  };
  // Teintes du vestiaire de l'avatar conservées. Les détails du tissu restent
  // dans la texture ; une multiplication légère ne repeint pas le visage.
  if (enfant && p.haut)
    corps.traverse((o) => {
      if (!o.isMesh) return;
      const ajuster = (m) => {
        if (!/body/.test(m.name)) return m;
        const c = m.clone();
        c.userData.partagee = false;
        c.color.set(p.haut).lerp(new THREE.Color(0xffffff), 0.72);
        return c;
      };
      o.material = Array.isArray(o.material)
        ? o.material.map(ajuster)
        : ajuster(o.material);
    });
  if (p.taille && p.taille !== 1) g.scale.setScalar(p.taille);
  animerHumain(g, 0, 0);
  g.updateMatrixWorld(true);
  corps.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    o.skeleton.update();
    o.computeBoundingSphere();
    // La marge couvre les gestes et la foulée ; elle se mesure en mètres
    // puis se convertit dans le repère du FBX. Elle évite une disparition
    // des jambes au bord du cadre tout en éliminant les corps derrière nous.
    const scale = o.getWorldScale(new THREE.Vector3());
    o.boundingSphere.radius +=
      0.4 / Math.min(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
    o.frustumCulled = true;
  });
  return g;
}

export function animerHumain(g, temps, vitesse = 0) {
  const { rig, arms, legs, corps } = g.userData;
  if (!rig) return;
  // Une marche à genoux et coudes fléchis, pas quatre barres qui cisaillent.
  const marche = Math.min(1, vitesse / 1.6),
    phase = temps * 6.2;
  for (const [cote, i] of [
    ["L", 0],
    ["R", 1],
  ]) {
    const ph = phase + i * Math.PI;
    const swing = Math.sin(ph) * 0.32 * marche;
    rotation(rig, cote + "_Thigh", swing);
    rotation(
      rig,
      cote + "_Calf",
      Math.max(0, -Math.sin(ph)) * 0.72 * marche + 0.035,
    );
    rotation(rig, cote + "_Foot", -Math.max(0, -Math.sin(ph)) * 0.22 * marche);
    const geste = vitesse > 0 ? -swing * 0.65 : arms[i].rotation.x;
    rotation(rig, cote + "_UpperArm", geste);
    rotation(rig, cote + "_Forearm", -0.12 - Math.max(0, swing) * 0.18);
    legs[i].rotation.x = swing;
  }
  rotation(rig, "Spine1", Math.sin(temps * 1.65) * 0.008);
  rotation(rig, "Head", Math.sin(temps * 0.55) * 0.018);
  corps.position.y = marche * 0.012 * (1 - Math.cos(phase * 2));
}

const tetes = new Map();
export function ajouterTeteRealiste(g, p) {
  const nom = ["long", "chignon", "nattes"].includes(p.coupe)
    ? "femme-chemise"
    : "homme-chemise";
  const proto = prototypes.get(nom);
  if (!proto) return false;
  if (!tetes.has(nom)) {
    const tete = new THREE.Group();
    proto.updateMatrixWorld(true);
    proto.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      o.skeleton.update();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const geo = o.geometry;
      for (const group of geo.groups.length
        ? geo.groups
        : [
            {
              start: 0,
              count: geo.index?.count || geo.attributes.position.count,
              materialIndex: 0,
            },
          ]) {
        const mat = mats[group.materialIndex];
        if (!/head|opacity/.test(mat.name)) continue;
        const pos = [],
          uv = [],
          normals = [];
        for (let j = group.start; j < group.start + group.count; j++) {
          const i = geo.index ? geo.index.getX(j) : j;
          a.fromBufferAttribute(geo.attributes.position, i);
          o.applyBoneTransform(i, a);
          a.applyMatrix4(o.matrixWorld);
          pos.push(a.x, a.y, a.z);
          b.fromBufferAttribute(geo.attributes.normal, i).transformDirection(
            o.matrixWorld,
          );
          normals.push(b.x, b.y, b.z);
          uv.push(geo.attributes.uv.getX(i), geo.attributes.uv.getY(i));
        }
        const shape = new THREE.BufferGeometry();
        shape.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(pos, 3),
        );
        shape.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        shape.setAttribute(
          "normal",
          new THREE.Float32BufferAttribute(normals, 3),
        );
        const m = new THREE.Mesh(partager(shape), mat);
        m.castShadow = true;
        tete.add(m);
      }
    });
    tetes.set(nom, tete);
  }
  g.add(tetes.get(nom).clone(true));
  return true;
}
export const tetesDisponibles = () =>
  prototypes.has("homme-chemise") && prototypes.has("femme-chemise");
