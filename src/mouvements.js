// LES MOUVEMENTS DE CAPTURE RÉELLE (chantier « personnages vivants »).
//
// Les prises viennent de la base de capture de mouvement de Carnegie Mellon
// (mocap.cs.cmu.edu, licence dans vendor/humains/LICENSE.md), converties hors
// ligne par scripts/convertir-mouvements.mjs en un seul fichier immuable :
// pour chaque prise et chaque os, la rotation dans le MONDE exprimée comme un
// écart à la pose de repos de la capture, dans un repère où la personne
// regarde +Z.
//
// LE RECIBLAGE SE FAIT ICI, UNE FOIS PAR CORPS. Les neuf squelettes Rocketbox
// n'ont pas la même pose de repos (jusqu'à onze degrés d'écart mesurés entre
// les mains de deux modèles) : copier des quaternions locaux d'un squelette à
// l'autre tordrait les poignets. On garde la règle « monde » :
//   W_os(t) = D(t) · A · T_os
// où T_os est la rotation de repos de l'os dans le monde, A la rotation qui
// amène la direction du segment au repos du corps sur celle de la capture, et
// D(t) l'écart capturé. La rotation locale se déduit du parent animé. Le
// résultat est un AnimationClip par corps et par prise, partagé par toutes les
// personnes qui portent ce corps : aucune rotation ne se recalcule en jeu.
import * as THREE from "three";

let donnees = null;
let chargement = null;

// La lecture du fichier binaire (pure, testable sous node avec un tampon).
export function lireMouvements(tampon) {
  const vue = new DataView(tampon);
  const long = vue.getUint32(0, true);
  const entete = JSON.parse(new TextDecoder().decode(new Uint8Array(tampon, 4, long)));
  let o = 4 + long;
  const nOs = entete.os.length;
  for (const p of entete.prises) {
    const nq = p.n * nOs * 4;
    p.q = new Int16Array(tampon.slice(o, o + nq * 2));
    o += nq * 2;
    p.bob = new Int16Array(tampon.slice(o, o + p.n * 2));
    o += p.n * 2;
  }
  return entete;
}

export function chargerMouvements() {
  if (chargement) return chargement;
  if (typeof fetch === "undefined" || typeof document === "undefined") return (chargement = Promise.resolve(null));
  const url = new URL("../vendor/humains/mouvements-v1.bin", import.meta.url).href;
  chargement = fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((b) => (donnees = lireMouvements(b)))
    .catch((err) => {
      // sans le fichier, les personnages gardent la marche dessinée
      console.warn("Mouvements de capture indisponibles :", err.message);
      return null;
    });
  return chargement;
}
export const mouvementsPrets = () => !!donnees;
export const mouvementsDonnees = () => donnees;

// Le segment de chaque os, pour la direction de repos du corps.
const ENFANT = {
  Pelvis: "Spine", Spine: "Spine1", Spine1: "Spine2", Spine2: "Neck", Neck: "Head",
  L_Thigh: "L_Calf", L_Calf: "L_Foot", L_Foot: "L_Toe0",
  R_Thigh: "R_Calf", R_Calf: "R_Foot", R_Foot: "R_Toe0",
  L_Clavicle: "L_UpperArm", L_UpperArm: "L_Forearm", L_Forearm: "L_Hand", L_Hand: "L_Finger2",
  R_Clavicle: "R_UpperArm", R_UpperArm: "R_Forearm", R_Forearm: "R_Hand", R_Hand: "R_Finger2",
};
const nomCourt = (n) => n.replace(/^.*Bip\d*_?/, "");

const parCorps = new Map();
const HAUT = new THREE.Vector3(0, 1, 0);

// Les clips d'un corps (le prototype tel que chargé, jamais un clone dont les
// bras auraient été abaissés). Map nom de prise → AnimationClip.
export function clipsDuCorps(cle, proto) {
  if (!donnees || !proto) return null;
  if (parCorps.has(cle)) return parCorps.get(cle);
  proto.updateMatrixWorld(true);
  const os = {};
  let racine = null;
  proto.traverse((o) => {
    if (!o.isBone) return;
    const c = nomCourt(o.name);
    if (c) os[c] = o;
    else racine = o;
  });
  const monde = (o) => o.getWorldQuaternion(new THREE.Quaternion());
  const pos = (o) => o.getWorldPosition(new THREE.Vector3());
  if (!os.L_Thigh || !os.R_Thigh || !os.Pelvis) {
    parCorps.set(cle, null);
    return null;
  }
  // Où regarde ce corps : la gauche − la droite des hanches, croisée avec le
  // haut (la même règle que le script, des deux côtés : un miroir n'y survit pas).
  const f = pos(os.L_Thigh).sub(pos(os.R_Thigh)).cross(HAUT);
  const Ht = new THREE.Quaternion().setFromAxisAngle(HAUT, Math.atan2(f.x, f.z));
  const Hti = Ht.clone().invert();
  const liste = donnees.os;
  const T = liste.map((n) => (os[n] ? monde(os[n]) : null));
  // L'ALIGNEMENT DES DIRECTIONS NE VAUT QUE POUR LES MEMBRES. Le tronc, le cou
  // et la tête gardent la courbure de repos du corps : aligner le cou Rocketbox
  // (penché de dix-neuf degrés vers l'avant, comme un vrai cou) sur celui de
  // la capture (droit) rejetait toutes les têtes en arrière — vu en capture.
  const MEMBRE = /Thigh|Calf|Foot|Clavicle|UpperArm|Forearm|Hand/;
  const A = liste.map((n, j) => {
    const o = os[n], e = os[ENFANT[n]];
    if (!o || !e || !MEMBRE.test(n)) return null;
    const t = pos(e).sub(pos(o)).normalize();
    return { t, j };
  });
  // le rebond se pose sur la racine (« Bip01 », le parent du bassin — un nœud,
  // pas un os du squelette), dans le repère de son parent
  racine = os.Pelvis.parent;
  let bobAxe = null, racineBase = null;
  if (racine && racine.parent) {
    const pq = monde(racine.parent), ps = racine.parent.getWorldScale(new THREE.Vector3());
    bobAxe = HAUT.clone().applyQuaternion(pq.invert()).multiplyScalar(1 / Math.max(1e-6, ps.y));
    racineBase = racine.position.clone();
  }
  // Le pied au sol : la capture fixe la racine à sa propre hauteur, et un
  // corps dont les genoux plient plus ou moins que ceux de l'acteur flotterait
  // ou s'enfoncerait. On refait la cinématique des jambes (bassin → tronc →
  // cuisse → mollet → pied) et l'on règle la hauteur du bassin pour que la
  // cheville la plus basse soit à sa hauteur de repos.
  const chaine = ["Pelvis", "Spine", "L_Thigh", "L_Calf", "L_Foot", "R_Thigh", "R_Calf", "R_Foot"].filter((n) => os[n]);
  const decal = new Map(); // os → décalage au parent, dans le repère de repos du parent
  for (const n of chaine) {
    const o = os[n];
    if (n === "Pelvis") continue;
    decal.set(o, pos(o).sub(pos(o.parent)).applyQuaternion(monde(o.parent).invert()));
  }
  const cheville0 = Math.min(pos(os.L_Foot).y, pos(os.R_Foot).y);
  const bassin0 = pos(os.Pelvis);
  const clips = new Map();
  const D = new THREE.Quaternion(), W = new THREE.Quaternion(), q = new THREE.Quaternion();
  for (const p of donnees.prises) {
    const nOs = liste.length;
    // A par prise : la direction de repos du segment dans la capture
    const Ap = A.map((a, j) => {
      if (!a) return null;
      const s = new THREE.Vector3(p.dirs[j * 3], p.dirs[j * 3 + 1], p.dirs[j * 3 + 2]).applyQuaternion(Ht).normalize();
      return new THREE.Quaternion().setFromUnitVectors(a.t, s);
    });
    const valeurs = liste.map(() => new Float32Array((p.n + 1) * 4));
    const sol = new Float32Array(p.n);
    const temps = new Float32Array(p.n + 1);
    const mondeAnime = new Map();
    for (let i = 0; i <= p.n; i++) {
      const k = i % p.n;
      temps[i] = i / p.fps;
      mondeAnime.clear();
      for (let j = 0; j < nOs; j++) {
        const o = os[liste[j]];
        if (!o || !T[j]) continue;
        const b = (k * nOs + j) * 4;
        D.set(p.q[b] / 32767, p.q[b + 1] / 32767, p.q[b + 2] / 32767, p.q[b + 3] / 32767).normalize();
        D.premultiply(Ht).multiply(Hti);
        W.copy(D);
        if (Ap[j]) W.multiply(Ap[j]);
        W.multiply(T[j]);
        mondeAnime.set(o, W.clone());
        const parent = mondeAnime.get(o.parent) || monde(o.parent);
        q.copy(parent).invert().multiply(W);
        valeurs[j].set([q.x, q.y, q.z, q.w], i * 4);
      }
      if (i < p.n) {
        const P = new Map([[os.Pelvis, bassin0]]);
        for (const n of chaine) {
          const o = os[n];
          if (n === "Pelvis") continue;
          const Wp = mondeAnime.get(o.parent) || monde(o.parent);
          P.set(o, decal.get(o).clone().applyQuaternion(Wp).add(P.get(o.parent)));
        }
        sol[i] = cheville0 - Math.min(P.get(os.L_Foot).y, P.get(os.R_Foot).y);
      }
    }
    const pistes = [];
    liste.forEach((n, j) => {
      if (!os[n] || !T[j]) return;
      pistes.push(new THREE.QuaternionKeyframeTrack(`${os[n].name}.quaternion`, temps, valeurs[j]));
    });
    if (bobAxe) {
      const v = new Float32Array((p.n + 1) * 3);
      for (let i = 0; i <= p.n; i++) {
        const h = sol[i % p.n];
        v.set([racineBase.x + bobAxe.x * h, racineBase.y + bobAxe.y * h, racineBase.z + bobAxe.z * h], i * 3);
      }
      pistes.push(new THREE.VectorKeyframeTrack(`${racine.name}.position`, temps, v));
    }
    const clip = new THREE.AnimationClip(p.nom, p.n / p.fps, pistes);
    clip.userData = { vitesse: p.vitesse, source: p.source };
    clips.set(p.nom, clip);
  }
  parCorps.set(cle, clips);
  return clips;
}

// LE RÉPERTOIRE AU REPOS. Chaque personne reçoit une attitude tirée de son
// identifiant — jamais au hasard d'une image à l'autre : la même personne
// attend les mains aux hanches, une autre les bras le long du corps. Deux attentes
// seulement : celles qui ont passé la capture (téléphoner, parler, regarder
// autour sont des dettes déclarées dans TASKS.md).
export const REPERTOIRE = [["attente", 0.62], ["attente2", 0.38]];
export function attitudeDe(graine) {
  let x = Math.sin(graine * 12.9898 + 78.233) * 43758.5453;
  x -= Math.floor(x);
  for (const [nom, poids] of REPERTOIRE) {
    if (x < poids) return nom;
    x -= poids;
  }
  return "attente";
}

// Quelle prise pour quelle allure (m/s ≈ blocs/s), et à quelle cadence. Pure,
// lue par le témoin. La cadence se rapproche de l'allure sans la suivre tout à
// fait : une marche jouée une fois et demie trop vite se voit plus qu'un pied
// qui glisse d'un dixième.
export function priseDAllure(v, attitude = "attente") {
  if (!(v > 0.05)) return { nom: attitude, echelle: 1 };
  const ref = v < 0.75 ? ["marcheLente", 0.41] : v < 2.3 ? ["marche", 1.11] : ["course", 2.82];
  const e = Math.pow(v / ref[1], 0.75);
  return { nom: ref[0], echelle: Math.max(0.7, Math.min(1.6, e)) };
}
