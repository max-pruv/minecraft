// LES PHARES DE LA VOITURE DE L'ENFANT (v529). Revue d'écran, ligne 8 : la
// nuit, la voiture roulait dans le noir, seuls les feux arrière allumés. Deux
// choses par phare, et AUCUNE lampe ponctuelle — quatre lampes pour tout le
// jeu (v248), une de plus recompilerait tous les programmes :
//
//   - une lueur à fleur de la tôle, là où est le bloc optique ;
//   - un pinceau ADDITIF devant elle, une nappe posée sur la route, qui se
//     lit comme la lumière des phares sans rien éclairer.
//
// Les deux prennent `matiereAdditive` (avions.js), la matière de la flamme :
// mêmes réglages, donc la même clé de programme, chauffée à l'accueil (v491).
// Un phare qui s'allume en jeu ne compile rien, par construction.
//
// La place se MESURE sur le modèle, jamais ne s'écrit (v230) : cinquante-sept
// modèles de tailles différentes. On reprend d'abord la mesure des coins des
// feux de détresse (`posesDetresse`, v519) ; à défaut, les blocs optiques nommés (`headlight`,
// `phare`…) s'ils existent, sinon les deux tiers de la demi-largeur à 40 %
// de la hauteur ; puis le sommet le plus en avant de cette bande donne le nez.
// Une fois par modèle (`flotte`), comme les feux de détresse.
import * as THREE from 'three';
import { matiereAdditive } from './avions.js';
import { posesDetresse } from './vehicules.js';

const RE_PHARE = /head.?l|headlamp|phare|front.?light|light.?front|lamp.?f/i;
const RE_PAS_PHARE = /tail|rear|brake|back|housing|fog/i;
export const LONG_PINCEAU = 9;      // blocs devant la voiture
export const LARGE_PINCEAU = 3.2;   // largeur de la nappe à son bout
export const OPACITE_PINCEAU = 0.26;

const posesParModele = new Map();
const _inv = new THREE.Matrix4(), _rel = new THREE.Matrix4(), _v = new THREE.Vector3();

// Les deux poses { x, y, z } dans le repère de la voiture (nez vers −z),
// gauche puis droite.
export function posesPhares(m) {
  const cle = m.userData && m.userData.flotte && m.userData.roues ? m.userData.flotte : null;
  if (cle && posesParModele.has(cle)) return posesParModele.get(cle);
  m.updateMatrixWorld(true);
  _inv.copy(m.matrixWorld).invert();
  const meshes = [];
  const boite = new THREE.Box3(), optique = new THREE.Box3(), b = new THREE.Box3();
  m.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    for (let p = o; p && p !== m; p = p.parent) if (p.name === 'phares' || p.name === 'detresse' || p.visible === false) return;
    _rel.multiplyMatrices(_inv, o.matrixWorld);
    meshes.push({ o, rel: _rel.clone() });
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    b.copy(o.geometry.boundingBox).applyMatrix4(_rel);
    boite.union(b);
    const nom = `${o.name || ''}|${(o.material && o.material.name) || ''}`;
    if (RE_PHARE.test(nom) && !RE_PAS_PHARE.test(nom) && b.getCenter(_v).z < 0) optique.union(b);
  });
  if (boite.isEmpty()) return [];
  const h = boite.max.y - boite.min.y;
  const demiL = Math.max(0.3, Math.min(-boite.min.x, boite.max.x));
  const nomme = !optique.isEmpty();
  const yF = nomme ? (optique.min.y + optique.max.y) / 2 : boite.min.y + Math.max(0.4, h * 0.4);
  // un phare est vers le coin, jamais au milieu du capot : un bloc optique
  // nommé peut couvrir toute la face avant (une barre de lumière), et sa
  // demi-largeur rognée retombait à ±0,25 sur une voiture de deux blocs
  const xF = Math.max(demiL * 0.55, nomme ? Math.min(demiL - 0.12, Math.max(-optique.min.x, optique.max.x) - 0.15) : demiL * 0.66);
  // le nez à la hauteur du phare : le sommet le plus en avant de la bande
  let zF = Infinity;
  for (const { o, rel } of meshes) {
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(rel);
      if (Math.abs(_v.y - yF) < 0.18 && Math.abs(Math.abs(_v.x) - xF) < 0.3 && _v.z < zF) zF = _v.z;
    }
  }
  if (!Number.isFinite(zF)) zF = boite.min.z;
  let poses = [-1, 1].map((sx) => ({ x: sx * xF, y: yF, z: zF - 0.03 }));
  // LA MESURE DES COINS EST CELLE DES FEUX DE DÉTRESSE (v519) quand elle
  // trouve la tôle : leurs lentilles avant sont posées sur le bloc optique, à
  // fleur de la carrosserie. Le phare se met juste à l'intérieur de la sienne,
  // vers l'axe, pour que les deux ne se recouvrent pas. Deux mesures du même
  // coin finiraient par diverger.
  const det = posesDetresse(m);
  // … mais seulement si elle a trouvé le COIN : quand son rayon ne touche la
  // tôle qu'en rentrant vers l'axe (la Valkyrie, ±0,24 pour une demi-largeur
  // de 1), un phare au milieu du capot ne se lit plus comme un phare
  const auCoin = (p) => Math.abs(p.x) >= demiL * 0.5;
  if (det && det.length >= 2 && det[0].nz < -0.3 && det[1].nz < -0.3 && auCoin(det[0]) && auCoin(det[1])) {
    poses = det.slice(0, 2).map((p) => ({
      x: p.x - Math.sign(p.x || 1) * Math.min(0.24, Math.abs(p.x) * 0.3),
      y: p.y, z: p.z + p.nz * 0.02,
    }));
  }
  poses.sol = boite.min.y;   // le bas des roues : la route
  if (cle) posesParModele.set(cle, poses);
  return poses;
}

function fabriquer(m) {
  const g = new THREE.Group();
  g.name = 'phares';
  g.userData.cle = m.userData.roues ? 'modele' : 'attente';
  g.userData.lueurs = []; g.userData.pinceaux = [];
  const poses = posesPhares(m);
  const sol = poses.sol != null ? poses.sol : 0;
  for (const p of poses) {
    const lueur = new THREE.Mesh(new THREE.CircleGeometry(0.17, 16), matiereAdditive(0xfff6dc, 0.95));
    lueur.position.set(p.x, p.y, p.z);
    lueur.frustumCulled = false;
    g.add(lueur); g.userData.lueurs.push(lueur);
    // le pinceau est une NAPPE posée sur la route, pas un cône : vu de
    // derrière, un cône ouvert se lisait comme une bulle lumineuse devant le
    // capot (capture de la revue). Un trapèze qui s'élargit vers l'avant, à un
    // centième au-dessus du sol sous la voiture.
    const geo = new THREE.BufferGeometry();
    const l0 = 0.25, l1 = LARGE_PINCEAU / 2, L = LONG_PINCEAU;
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-l0, 0, 0, l0, 0, 0, l1, 0, -L, -l1, 0, -L], 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geo.setIndex([0, 2, 1, 0, 3, 2]);
    const pinceau = new THREE.Mesh(geo, matiereAdditive(0xfff0c8, OPACITE_PINCEAU));
    pinceau.position.set(p.x, sol + 0.06, p.z);
    pinceau.frustumCulled = false;
    g.add(pinceau); g.userData.pinceaux.push(pinceau);
  }
  g.visible = false;
  m.add(g);
  m.userData.phares = g;
  return g;
}

// `nuit` : 0 le jour, 1 en pleine nuit (la part de nuit de main.js, celle qui
// allume les lampes de rue, v248). Allumés dès que la nuit tombe, le pinceau
// se renforce avec elle.
export function allumerPhares(m, nuit) {
  if (!m) return null;
  let g = m.userData.phares;
  const cle = m.userData.roues ? 'modele' : 'attente';
  if (g && g.userData.cle !== cle) { m.remove(g); g = null; m.userData.phares = null; }
  if (nuit <= 0.04) { if (g) g.visible = false; return g; }
  if (!g) g = fabriquer(m);
  g.visible = true;
  for (const p of g.userData.pinceaux) p.material.opacity = OPACITE_PINCEAU * Math.min(1, nuit);
  return g;
}

export function eteindrePhares(m) {
  const g = m && m.userData && m.userData.phares;
  if (g) g.visible = false;
}
