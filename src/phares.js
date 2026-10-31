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
const RE_OPTIQUE = /light|lamp|phare|drl|daytime|optique|lens|lentille/i;
const RE_PAS_OPTIQUE = /rear|tail|brake|back|housing|fog|lightly|interior|inside|inner|^int_|_int_|guide|windshield|wheel|reflector|turn|amber|orange|indicat|clignot|gear|carbon|stop|reverse|racelogic|aux|grille|badge|cabin|dome|seat/i;
const RE_VERRE = /glass|lens|lentille|verre/i;
const DECALE = 0.012;                // à fleur, devant la face qu'elle couvre
const TRIANGLES_MAX = 12000;         // par côté : au-delà on prend un triangle sur n
const optiquesParModele = new Map();

function lumEmissive(mt) {
  if (!mt || !mt.emissive) return 0;
  const e = mt.emissive, k = mt.emissiveIntensity == null ? 1 : mt.emissiveIntensity;
  return (0.2126 * e.r + 0.7152 * e.g + 0.0722 * e.b) * k;
}
const cleSource = (o) => `${o.name || ''}|${(o.material && o.material.name) || ''}`;

// Les lueurs d'un modèle : { cotes: [{ geo, centre, sources }], rang }, dans
// le repère de la voiture (nez vers −z). Mesurées une fois par modèle, sur le
// prototype (v550), géométries partagées (`liberer` ne les rend pas).
export function optiquesPhares(m) {
  const cle = m.userData && m.userData.flotte && m.userData.roues ? m.userData.flotte : null;
  if (cle && optiquesParModele.has(cle)) return optiquesParModele.get(cle);
  const propre = cle ? surLePrototype(m, cle) : null;
  if (propre) { const r = optiquesPhares(propre); optiquesParModele.set(cle, r); return r; }
  m.updateMatrixWorld(true);
  _inv.copy(m.matrixWorld).invert();
  const boite = new THREE.Box3(), b = new THREE.Box3();
  const meshes = [];
  m.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || Array.isArray(o.material)) return;
    for (let p = o; p && p !== m; p = p.parent) if (p.name === 'phares' || p.name === 'detresse' || p.name === 'feux-arriere' || p.visible === false) return;
    if (/^(Wheel|Pneu|Roue|Essieu)/i.test(o.name || '')) return;
    const rel = new THREE.Matrix4().multiplyMatrices(_inv, o.matrixWorld);
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    b.copy(o.geometry.boundingBox).applyMatrix4(rel);
    boite.union(b);
    meshes.push({ o, rel, b: b.clone() });
  });
  const vide = { cotes: [], rang: 0, verres: [] };
  if (boite.isEmpty()) { if (cle) optiquesParModele.set(cle, vide); return vide; }
  const L = boite.max.z - boite.min.z, h = boite.max.y - boite.min.y;
  const zMax = boite.min.z + L * 0.25, yMax = boite.min.y + h * 0.7;
  // le rang de chaque maillage qui touche l'avant
  const rangs = [[], [], [], []];
  for (const e of meshes) {
    if (e.b.min.z > zMax) continue;
    const mt = e.o.material, nom = cleSource(e.o);
    const nomme = RE_OPTIQUE.test(nom) && !RE_PAS_OPTIQUE.test(nom);
    const emet = lumEmissive(mt) > 0.1 && !RE_PAS_OPTIQUE.test(nom) && !/paint|laque|livree|body_?paint/i.test(mt.name || '');
    if (emet) rangs[1].push(e);
    else if (nomme && !RE_VERRE.test(nom)) rangs[2].push(e);
    else if (nomme && /head|phare|optique|lamp/i.test(nom)) rangs[3].push(e);
  }
  let rang = 0, choisis = [], verres = [];
  if (rangs[1].length || rangs[2].length) { choisis = [...rangs[1], ...rangs[2]]; rang = rangs[1].length ? 1 : 2; verres = rangs[3]; }
  else if (rangs[3].length) { choisis = rangs[3]; rang = 3; }
  const r = { cotes: copier(choisis, zMax, yMax), rang, verres: copier(verres, zMax, yMax) };
  if (cle) optiquesParModele.set(cle, r);
  return r;
}

// Les triangles des maillages `choisis` à l'avant, copiés à fleur, par côté.
function copier(choisis, zMax, yMax) {
  // les triangles retenus : à l'avant, sous la ceinture, qui ne regardent ni
  // vers l'arrière ni vers le sol ; rangés par côté (le centre du triangle)
  const tris = [[], []], src = [new Map(), new Map()];
  const a = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3(), t = new THREE.Vector3();
  for (const { o, rel } of choisis) {
    const pos = o.geometry.attributes.position, idx = o.geometry.index;
    const nb = idx ? idx.count / 3 : pos.count / 3;
    for (let i = 0; i < nb; i++) {
      const i0 = idx ? idx.getX(3 * i) : 3 * i, i1 = idx ? idx.getX(3 * i + 1) : 3 * i + 1, i2 = idx ? idx.getX(3 * i + 2) : 3 * i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(rel);
      c.fromBufferAttribute(pos, i1).applyMatrix4(rel);
      d.fromBufferAttribute(pos, i2).applyMatrix4(rel);
      const cz = (a.z + c.z + d.z) / 3, cy = (a.y + c.y + d.y) / 3, cx = (a.x + c.x + d.x) / 3;
      if (cz > zMax || cy > yMax) continue;
      n.subVectors(c, a).cross(t.subVectors(d, a));
      const aire = n.length();
      if (aire < 1e-9) continue;
      n.divideScalar(aire);
      // un triangle peut être enroulé dans un sens ou dans l'autre : sa
      // normale sortante est celle qui ne rentre pas dans la voiture
      if (n.z > 0.05 || (Math.abs(n.z) <= 0.05 && n.x * cx < 0)) n.negate();
      if (n.z > 0.2 || n.y < -0.5) continue;
      const k = cx < 0 ? 0 : 1;
      tris[k].push(a.x + n.x * DECALE, a.y + n.y * DECALE, a.z + n.z * DECALE,
        c.x + n.x * DECALE, c.y + n.y * DECALE, c.z + n.z * DECALE,
        d.x + n.x * DECALE, d.y + n.y * DECALE, d.z + n.z * DECALE);
      if (!src[k].has(cleSource(o))) {
        const col = o.material.color;
        src[k].set(cleSource(o), { cle: cleSource(o), lum: col ? 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b : 0, em: lumEmissive(o.material) });
      }
    }
  }
  const cotes = [];
  for (const k of [0, 1]) {
    let arr = tris[k];
    if (!arr.length) continue;
    const nt = arr.length / 9;
    if (nt > TRIANGLES_MAX) {
      const pas = Math.ceil(nt / TRIANGLES_MAX), r = [];
      for (let i = 0; i < nt; i += pas) for (let j = 0; j < 9; j++) r.push(arr[9 * i + j]);
      arr = r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    geo.computeBoundingBox();
    const centre = geo.boundingBox.getCenter(new THREE.Vector3());
    geo.translate(-centre.x, -centre.y, -centre.z);
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    geo.userData.partagee = true;
    cotes.push({ geo, centre, sources: [...src[k].values()] });
  }
  return cotes;
}

// Une source de lueur est-elle encore là, et entière ? Une pièce détachée
// (`degats3d.detacher`) quitte la voiture ; un phare cassé ou calciné reçoit
// un matériau à lui, assombri (émissif éteint, couleur au tiers) — sa lueur
// s'éteint avec lui. On compare au matériau du PROTOTYPE, relevé à la mesure :
// la voiture peut avoir été cassée avant que ses phares ne s'allument.
function sourceIntacte(s, m) {
  let p = s.o;
  while (p && p !== m) p = p.parent;
  if (!p) return false;
  const mt = s.o.material;
  if (!mt) return false;
  if (s.em > 0.1 && lumEmissive(mt) <= 0.05) return false;
  const c = mt.color;
  return !c || !s.lum || (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) > 0.6 * s.lum;
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
  // les maillages de CETTE voiture d'où viennent les lueurs (par leur nom)
  const parCle = new Map();
  m.traverse((o) => { if (o.isMesh && !Array.isArray(o.material)) { const k = cleSource(o); if (!parCle.has(k)) parCle.set(k, []); parCle.get(k).push(o); } });
  g.userData.verres = [];
  // la lueur de l'optique, franche ; le verre du phare, s'il y en a un à côté
  // (la glace ronde de la 911, sur ses quatre points), une lueur plus douce
  const couches = [[opt.cotes, g.userData.lueurs, opt.rang === 3 ? OPACITE_VERRE_SEUL : OPACITE_LUEUR], [opt.verres || [], g.userData.verres, OPACITE_VERRE]];
  for (const [liste, rangee, opacite] of couches) {
    for (const cote of liste) {
      const lueur = new THREE.Mesh(cote.geo, matiereAdditive(0xfff6dc, opacite));
      lueur.name = 'phare-lueur';
      lueur.position.copy(cote.centre);
      lueur.frustumCulled = false;
      // avant les autres transparents : une optique sous un verre (la 911, ses
      // quatre points derrière la glace du phare) se dessine d'abord, puis le
      // verre se pose dessus — dessinée après, la glace l'aurait cachée
      lueur.renderOrder = -1;
      lueur.userData.sources = [];
      for (const sc of cote.sources) for (const o of parCle.get(sc.cle) || []) lueur.userData.sources.push({ o, lum: sc.lum, em: sc.em });
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
