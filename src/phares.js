// LES PHARES DE LA VOITURE DE L'ENFANT (v533, v569). Revue d'écran, ligne 8 :
// la nuit, la voiture roulait dans le noir. Deux choses par phare, et AUCUNE
// lampe ponctuelle — quatre lampes pour tout le jeu (v248) :
//
//   - une lueur qui ÉPOUSE l'optique du modèle (v569, `optiquesPhares` plus
//     bas) : la barre de la 911, la fente d'une Lamborghini, le rond d'une
//     Camaro — jamais plus un disque plaqué par-dessus le dessin ;
//   - un pinceau ADDITIF devant elle, une nappe posée sur la route, qui se
//     lit comme la lumière des phares sans rien éclairer.
//
// Les deux prennent `matiereAdditive` (avions.js), la matière de la flamme :
// mêmes réglages, donc la même clé de programme, chauffée à l'accueil (v491).
// Un phare qui s'allume en jeu ne compile rien, par construction.
//
// La place du pinceau se MESURE sur le modèle (v230) : la mesure des coins
// des feux de détresse (`posesDetresse`, v519), à défaut les blocs optiques
// nommés, sinon les deux tiers de la demi-largeur. Une fois par modèle.
import * as THREE from 'three';
import { matiereAdditive } from './avions.js';
import { posesDetresse, surLePrototype } from './vehicules.js';
import { optiquesDe, sourceIntacte, sourcesDe, lueurDe } from './optiques.js';

const RE_PHARE = /head.?l|headlamp|phare|front.?light|light.?front|lamp.?f/i;
const RE_PAS_PHARE = /tail|rear|brake|back|housing|fog/i;
export const LONG_PINCEAU = 9;      // blocs devant la voiture
export const LARGE_PINCEAU = 3.2;   // largeur de la nappe à son bout
export const OPACITE_PINCEAU = 0.26;
export const OPACITE_LUEUR = 0.9;        // l'optique qui émet ou qui se nomme
export const OPACITE_VERRE = 0.3;        // la glace du phare, à côté d'elle
export const OPACITE_VERRE_SEUL = 0.55;  // la glace quand elle est tout ce qu'on a

const posesParModele = new Map();
const _inv = new THREE.Matrix4(), _rel = new THREE.Matrix4(), _v = new THREE.Vector3();

// Les deux poses { x, y, z } dans le repère de la voiture (nez vers −z),
// gauche puis droite.
export function posesPhares(m) {
  const cle = m.userData && m.userData.flotte && m.userData.roues ? m.userData.flotte : null;
  if (cle && posesParModele.has(cle)) return posesParModele.get(cle);
  // la règle du modèle se mesure sur son prototype (v550), pas sur une voiture
  // froissée, amputée ou en pleine animation : c'est ce qui se garde ici
  const propre = cle ? surLePrototype(m, cle) : null;
  if (propre) { const poses = posesPhares(propre); posesParModele.set(cle, poses); return poses; }
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

// LA LUEUR ÉPOUSE L'OPTIQUE DU MODÈLE (v569). Max : « les phares des voitures,
// comme la 911, c'est absolument ridicule. La vraie 911 a une barre lumineuse,
// et le jeu vient créer des phares ronds par-dessus. » Deux disques de 0,17
// bloc à fleur de chaque modèle : cinquante des soixante-dix-sept portaient
// DÉJÀ leur optique allumée (`Light_Front_Emissive`, la barre DRL de la 911,
// celle du Cybertruck), et le jeu plaquait un rond dessus. La lueur est
// désormais une COPIE des triangles de l'optique du modèle, décalée d'un
// cheveu le long de leur normale : la barre de la 911 s'allume en barre, la
// fente d'une Lamborghini en fente, le rond d'une Camaro en rond. Toujours
// `matiereAdditive` (aucune lampe, aucun programme neuf : une géométrie de
// positions seules ne change pas la clé d'un MeshBasic), et rien n'est
// modifié sur la voiture elle-même — ni matériau cloné, ni émissif touché.
//
// L'optique se reconnaît par trois rangs, et l'on garde les deux premiers :
//   1. ce qui ÉMET déjà, à l'avant (le modèle a dessiné sa lumière) ;
//   2. ce qui est NOMMÉ comme un feu avant (`Headlight`, `Phare_avt`, `Light`) ;
//   3. à défaut, le verre nommé d'une optique (`Smoked headlamp lenses`).
// Rien de tout cela (une livrée peinte d'un seul tenant, des matériaux
// muets) : pas de lueur sur la tôle — on ne dessine pas une forme qu'on ne
// connaît pas —, seul le pinceau sur la route dit que les phares sont allumés.
// La reconnaissance vit dans `optiques.js` (v587), commune à tous les feux.
export function optiquesPhares(m) {
  const cle = m.userData && m.userData.flotte && m.userData.roues ? m.userData.flotte : null;
  const propre = cle ? surLePrototype(m, cle) : null;
  return optiquesDe(m, 'avant', propre);
}

function fabriquer(m) {
  const g = new THREE.Group();
  g.name = 'phares';
  g.userData.cle = m.userData.roues ? 'modele' : 'attente';
  g.userData.lueurs = []; g.userData.pinceaux = [];
  const poses = posesPhares(m);
  const sol = poses.sol != null ? poses.sol : 0;
  const opt = optiquesPhares(m);
  g.userData.rang = opt.rang;
  g.userData.verres = [];
  // la lueur de l'optique, franche ; le verre du phare, s'il y en a un à côté
  // (la glace ronde de la 911, sur ses quatre points), une lueur plus douce
  const couches = [[opt.cotes, g.userData.lueurs, opt.rang === 3 ? OPACITE_VERRE_SEUL : OPACITE_LUEUR], [opt.verres || [], g.userData.verres, OPACITE_VERRE]];
  for (const [liste, rangee, opacite] of couches) {
    for (const cote of liste) {
      const lueur = lueurDe(cote, matiereAdditive(0xfff6dc, opacite), 'phare-lueur');
      lueur.userData.sources = sourcesDe(m, cote);
      g.add(lueur); rangee.push(lueur);
    }
  }
  for (const p of poses) {
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
  for (const l of [...g.userData.lueurs, ...(g.userData.verres || [])]) l.visible = l.userData.sources.every((s) => sourceIntacte(s, m));
  return g;
}

export function eteindrePhares(m) {
  const g = m && m.userData && m.userData.phares;
  if (g) g.visible = false;
}
