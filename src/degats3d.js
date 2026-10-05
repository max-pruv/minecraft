// LES DÉGÂTS QUI SE VOIENT (v343) — carrosserie enfoncée, vitres étoilées,
// phares éteints, aileron arraché, fumée, flammes, carcasse calcinée.
//
// La règle vit dans `degats.js` (pure, lue sous node) ; ce fichier la DESSINE
// et la branche sur la voiture que l'enfant conduit. `fun.js` l'appelle par
// quatre crochets courts (monter, chaque image au volant, descendre, et chaque
// image tout court pour la fumée des carcasses) ; `main.js` le chauffe pendant
// l'accueil et lui passe la position réseau des amis.
//
// QUATRE RÈGLES, ET CHACUNE VIENT DU DÉPÔT.
//
// 1. LA GÉOMÉTRIE DE LA FLOTTE EST PARTAGÉE. Toutes les voitures d'un même
//    modèle sont des clones (`proto.clone(true)`, montures.js et la rue) : ils
//    portent la MÊME BufferGeometry. Enfoncer ses sommets froisserait toute la
//    rue d'un coup. On clone donc la géométrie de LA pièce touchée, au premier
//    choc qui l'atteint, et rien d'autre — les roues, l'intérieur loin de
//    l'impact, les pièces que le choc ne touche pas gardent la géométrie
//    commune. Les clones sont des enfants du maillage de la voiture et ne sont
//    pas marqués `partagee` : `liberer` (v238) les rend au pilote quand la
//    voiture s'en va, sans une ligne de plus.
// 2. AUCUNE LAMPE (v248, v264) : quatre lumières pour tout le jeu, sinon tous
//    les programmes se recompilent. Les flammes sont ÉMISSIVES (additives, hors
//    correspondance tonale), comme celles des réacteurs.
// 3. AUCUN PROGRAMME NE NAÎT AU CHOC (v246, v319). Un matériau cloné garde les
//    réglages de l'original, donc son programme ; on ne change que des
//    UNIFORMES (couleur, opacité, rugosité, émissif) — jamais `clearcoat`,
//    `transmission` ni une carte, qui sont des DEFINES. Les deux matériaux
//    neufs (fumée, flammes) se compilent pendant l'accueil (`chauffer`).
// 4. PERSONNE N'EST JAMAIS BLESSÉ. Rien ne projette personne ; le feu dépose
//    l'enfant À CÔTÉ de la voiture, debout, et le jeu le dit.

import * as THREE from 'three';
import { toast } from './bandeau.js';
import * as D from './degats.js';

const RE_ROUE = /^(wheel|essieu|tire|rim|brake)/i;
const RE_VITRE = /glass|window|windshield|vitr|verre/i;
const RE_PHARE_AV = /light_front|lights_front|headl|daytime|phare/i;
const RE_PHARE_AR = /light_rear|lights_rear|rear light|ruby rear|taill|feu_ar/i;
const RE_LAQUE = /paint|body|pearl|bodywork|laque/i;
const RE_DETACHABLE = /spoiler|aileron|bumper/i;

// La profondeur d'enfoncement d'un choc de force 1, en blocs (≈ mètres).
const PROFONDEUR = 0.55;

// ---- le petit nuage et la flamme : deux matériaux, une texture, un carré ----
let ressources = null;
function lesRessources() {
  if (ressources) return ressources;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.userData.partagee = true;
  // La couleur et l'opacité de CHAQUE carré viennent de l'instance (v348) :
  // `instanceColor` pour la teinte, un attribut `aAlpha` pour l'opacité, que
  // ce petit greffon multiplie dans le fragment. Une clé de programme FIXE :
  // la chauffe compile exactement ce que le feu dessinera.
  const alphaParInstance = (m) => {
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
        .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vAlpha;');
    };
    m.customProgramCacheKey = () => 'degats-alpha';
    m.userData.partagee = true;
    return m;
  };
  const fumee = alphaParInstance(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  const flamme = alphaParInstance(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false }));
  ressources = { tex, fumee, flamme };
  return ressources;
}

// UN ESSAIM, UN APPEL (v348). Chaque effet est UN `InstancedMesh` : trente
// nuages et vingt-quatre flammes coûtent deux appels de dessin, pas
// cinquante-quatre — sur l'iPad, ce sont les appels qui coûtent (v196). Le
// carré porte son propre attribut d'opacité, c'est pourquoi il n'est pas le
// carré commun : un par essaim, fabriqué ici.
function essaim(n, materiau, ordre) {
  const g = new THREE.PlaneGeometry(1, 1);
  g.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
  g.userData.partagee = true;
  const im = new THREE.InstancedMesh(g, materiau, n);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // `instanceColor` existe dès la naissance : il fait partie de la clé de
  // programme (`instancingColor`), et la chauffe doit compiler celle-ci
  for (let i = 0; i < n; i++) im.setColorAt(i, new THREE.Color(1, 1, 1));
  im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  im.count = 0;
  im.visible = false;
  im.frustumCulled = false;
  im.renderOrder = ordre;
  im.userData.effetDegats = true;
  return im;
}

// UN SEUL ESSAIM pour tout le jeu, borné : deux voitures en feu ne doublent
// pas le budget de l'iPad. Une particule est un carré face à la caméra.
const MAX_FUMEE = 30, MAX_FLAMMES = 24;

// ---- préparer une voiture : relever ses pièces dans son propre repère -------
// Ce qu'une pièce portait AVANT qu'on la touche, pour qu'une seconde relève
// (le modèle arrivé après la coque) reparte de l'original et ne froisse pas
// deux fois la même tôle.
const GEO_ORIG = new WeakMap(), MAT_ORIG = new WeakMap();
function preparer(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const pieces = [];
  const boite = new THREE.Box3();
  const b = new THREE.Box3();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || o.userData.effetDegats) return;
    for (let p = o; p && p !== root; p = p.parent) if (RE_ROUE.test(p.name || '')) return;
    if (GEO_ORIG.has(o)) { o.geometry.dispose(); o.geometry = GEO_ORIG.get(o); GEO_ORIG.delete(o); }
    if (MAT_ORIG.has(o)) { for (const m of [].concat(o.material)) m && m.dispose(); o.material = MAT_ORIG.get(o); MAT_ORIG.delete(o); }
    const M = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const g = o.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    b.copy(g.boundingBox).applyMatrix4(M);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const nom = `${o.name || ''} ${mats.map((m) => (m && m.name) || '').join(' ')}`;
    pieces.push({ mesh: o, M, Minv: M.clone().invert(), geoOrig: g, matOrig: o.material,
      boite: b.clone(), nom, propre: false, matPropre: false,
      parent: o.parent, local: o.matrix.clone(), detachee: false });
    // les pièces de l'habitacle sculpté et les accessoires ne comptent pas
    // dans l'emprise : on veut la CARROSSERIE
    boite.union(b);
  });
  if (boite.isEmpty()) boite.set(new THREE.Vector3(-D.DEMI_LARG, 0, -D.DEMI_LONG), new THREE.Vector3(D.DEMI_LARG, 1.3, D.DEMI_LONG));
  return { pieces, boite };
}

// Ce qui a déjà été rendu au pilote (par `liberer`, quand la voiture s'en va)
// ne se rend pas une seconde fois (v356).
function marquerRendu(ev) { ev.target.userData.rendu = true; }

// Un bruit déterministe par sommet : le froissé ne doit pas changer d'une
// tablette à l'autre (le réseau rejoue les mêmes chocs).
function bruit(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

// L'axe vers l'intérieur selon la zone, et la coordonnée extérieure maximale.
function axeDe(zone, boite) {
  switch (zone) {
    case 'avant': return { n: [0, 0, 1], face: -boite.min.z };
    case 'arriere': return { n: [0, 0, -1], face: boite.max.z };
    case 'gauche': return { n: [1, 0, 0], face: -boite.min.x };
    default: return { n: [-1, 0, 0], face: boite.max.x };
  }
}

// ENFONCER : un choc en repère de voiture. Rend le nombre de sommets déplacés
// et ce que ça a coûté. Clone la géométrie d'une pièce la première fois
// qu'elle est atteinte — jamais avant, jamais une autre.
const _p = new THREE.Vector3();
function enfoncer(prep, { f, x: lx, z: lz }) {
  const t0 = performance.now();
  const zone = D.zoneDe(lx, lz);
  const { n, face } = axeDe(zone, prep.boite);
  const h = prep.boite.max.y - prep.boite.min.y;
  const yImpact = prep.boite.min.y + h * 0.42;
  const P = [lx, yImpact, lz];
  // l'épaisseur froissée et le rayon de l'impact grandissent avec la force
  const T = 0.3 + 1.1 * f;
  const R = 0.75 + 1.0 * f;
  const prof = PROFONDEUR * f;
  const ySol = prep.boite.min.y + h * 0.3;
  // la sphère d'influence, pour ne pas toucher ce qui est loin
  const centre = new THREE.Vector3(
    n[0] ? -n[0] * (face - T / 2) : lx, yImpact, n[2] ? -n[2] * (face - T / 2) : lz);
  const portee = new THREE.Sphere(centre, Math.max(R, T) + 0.3);
  let deplaces = 0, clones = 0, msClone = 0, msNormales = 0;
  for (const pc of prep.pieces) {
    if (pc.detachee || !pc.boite.intersectsSphere(portee)) continue;
    if (!pc.propre) {
      // LA PREMIÈRE FOIS : la pièce prend sa géométrie à elle (règle 1)
      GEO_ORIG.set(pc.mesh, pc.geoOrig);
      const tc = performance.now();
      pc.mesh.geometry = pc.geoOrig.clone();
      msClone += performance.now() - tc;
      pc.mesh.geometry.userData = {};          // surtout pas `partagee`
      pc.mesh.geometry.addEventListener('dispose', marquerRendu);
      pc.propre = true; clones++;
    }
    const g = pc.mesh.geometry, pos = g.attributes.position;
    // LA BOUCLE CHAUDE : le tableau brut quand il est en flottants simples
    // (le cas de la flotte), les accesseurs sinon (modèles quantifiés, v230).
    const brut = !pos.isInterleavedBufferAttribute && !pos.normalized && pos.itemSize === 3 && pos.array instanceof Float32Array ? pos.array : null;
    const e = pc.M.elements;
    let bouge = 0;
    const deplace = new Uint8Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      let vx, vy, vz;
      if (brut) { vx = brut[i * 3]; vy = brut[i * 3 + 1]; vz = brut[i * 3 + 2]; }
      else { vx = pos.getX(i); vy = pos.getY(i); vz = pos.getZ(i); }
      // repère de la pièce → repère de la voiture, sans objet intermédiaire
      const px = e[0] * vx + e[4] * vy + e[8] * vz + e[12];
      const pz = e[2] * vx + e[6] * vy + e[10] * vz + e[14];
      const ext = -(px * n[0] + pz * n[2]);
      if (ext <= face - T) continue;
      _p.set(px, e[1] * vx + e[5] * vy + e[9] * vz + e[13], pz);
      const wd = (ext - (face - T)) / T;                     // vers l'extérieur
      const dx = _p.x - P[0], dy = (_p.y - P[1]) * 1.4, dz = _p.z - P[2];
      const le = dx * n[0] + dz * n[2];
      const lat2 = dx * dx + dy * dy + dz * dz - le * le;
      if (lat2 >= R * R) continue;
      const wl = 1 - lat2 / (R * R);
      const k = prof * Math.min(1, wd) ** 0.8 * wl * wl * (0.75 + 0.5 * bruit(_p.x, _p.y, _p.z));
      _p.x += n[0] * k; _p.z += n[2] * k;
      // le capot se plisse, le pare-chocs s'affaisse
      _p.y += k * 0.22 * Math.sin((_p.x + _p.z) * 9.0);
      if (_p.y < ySol) _p.y -= k * 0.35;
      _p.applyMatrix4(pc.Minv);
      if (brut) { brut[i * 3] = _p.x; brut[i * 3 + 1] = _p.y; brut[i * 3 + 2] = _p.z; }
      else pos.setXYZ(i, _p.x, _p.y, _p.z);
      deplace[i] = 1;
      bouge++;
    }
    if (bouge) {
      pos.needsUpdate = true;
      const tn = performance.now();
      if (g.attributes.normal) normalesDeplacees(g, deplace);
      // les bornes du clone restent celles de l'original : la tôle rentre,
      // elle ne sort pas, et les recalculer coûtait le tiers du choc
      msNormales += performance.now() - tn;
      deplaces += bouge;
    }
  }
  const r2 = (v) => Math.round(v * 10) / 10;
  return { zone, deplaces, clones, ms: performance.now() - t0, msClone: r2(msClone), msNormales: r2(msNormales) };
}

// LES NORMALES DES SEULS SOMMETS DÉPLACÉS. `computeVertexNormals` refaisait
// toute la pièce : vingt millisecondes sur trente au premier choc, mesuré. On
// ne refait que les triangles qui touchent un sommet enfoncé, et l'on n'écrit
// que les normales de ces sommets : une arête vive du modèle (sommets
// dédoublés) reste vive, puisque chaque copie n'additionne que SES triangles.
function normalesDeplacees(g, deplace) {
  const pos = g.attributes.position, nor = g.attributes.normal, idx = g.index;
  const n = pos.count;
  // les positions en flottants, une fois (les modèles quantifiés passent par
  // les accesseurs) ; l'accumulateur ne sert qu'aux sommets déplacés
  let P = pos.array;
  if (pos.isInterleavedBufferAttribute || pos.normalized || pos.itemSize !== 3 || !(P instanceof Float32Array)) {
    P = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { P[i * 3] = pos.getX(i); P[i * 3 + 1] = pos.getY(i); P[i * 3 + 2] = pos.getZ(i); }
  }
  const acc = new Float32Array(n * 3);
  const I = idx ? idx.array : null;
  const tri = I ? idx.count / 3 : n / 3;
  for (let t = 0; t < tri; t++) {
    const i0 = I ? I[t * 3] : t * 3, i1 = I ? I[t * 3 + 1] : t * 3 + 1, i2 = I ? I[t * 3 + 2] : t * 3 + 2;
    if (!(deplace[i0] | deplace[i1] | deplace[i2])) continue;
    const bx = P[i1 * 3], by = P[i1 * 3 + 1], bz = P[i1 * 3 + 2];
    const ax = P[i0 * 3] - bx, ay = P[i0 * 3 + 1] - by, az = P[i0 * 3 + 2] - bz;
    const cx = P[i2 * 3] - bx, cy = P[i2 * 3 + 1] - by, cz = P[i2 * 3 + 2] - bz;
    const nx = cy * az - cz * ay, ny = cz * ax - cx * az, nz = cx * ay - cy * ax;
    if (deplace[i0]) { acc[i0 * 3] += nx; acc[i0 * 3 + 1] += ny; acc[i0 * 3 + 2] += nz; }
    if (deplace[i1]) { acc[i1 * 3] += nx; acc[i1 * 3 + 1] += ny; acc[i1 * 3 + 2] += nz; }
    if (deplace[i2]) { acc[i2 * 3] += nx; acc[i2 * 3 + 1] += ny; acc[i2 * 3 + 2] += nz; }
  }
  for (let i = 0; i < n; i++) {
    if (!deplace[i]) continue;
    const x = acc[i * 3], y = acc[i * 3 + 1], z = acc[i * 3 + 2];
    const l = Math.hypot(x, y, z);
    if (l > 1e-12) nor.setXYZ(i, x / l, y / l, z / l);
  }
  nor.needsUpdate = true;
}

// UN MATÉRIAU SE CLONE AVANT DE CHANGER : il est partagé par toute la rue.
function matPropre(pc) {
  if (pc.matPropre) return Array.isArray(pc.mesh.material) ? pc.mesh.material : [pc.mesh.material];
  const cloner = (m) => { if (!m) return m; const c = m.clone(); c.userData = { ...c.userData, partagee: false }; c.addEventListener('dispose', marquerRendu); return c; };
  MAT_ORIG.set(pc.mesh, pc.matOrig);
  pc.mesh.material = Array.isArray(pc.matOrig) ? pc.matOrig.map(cloner) : cloner(pc.matOrig);
  pc.matPropre = true;
  return Array.isArray(pc.mesh.material) ? pc.mesh.material : [pc.mesh.material];
}

// Les vitres, les phares, la laque : seulement des UNIFORMES (règle 3).
function etoiler(pc) {
  for (const m of matPropre(pc)) {
    if (!m) continue;
    if (m.color) m.color.lerp(new THREE.Color(0xbfc7cd), 0.55);
    if (m.transparent) m.opacity = Math.min(1, (m.opacity ?? 1) + 0.2);
    if ('roughness' in m) m.roughness = 0.9;
  }
  pc.etoilee = true;
}
function eteindrePhare(pc) {
  for (const m of matPropre(pc)) {
    if (!m) continue;
    if (m.emissive) m.emissive.setRGB(0, 0, 0);
    if (m.color) m.color.multiplyScalar(0.35);
  }
  pc.cassee = true;
}
function calciner(pc, k) {
  for (const m of matPropre(pc)) {
    if (!m || !m.color) continue;
    if (!pc.couleur0) pc.couleur0 = m.color.clone();
    m.color.copy(pc.couleur0).lerp(new THREE.Color(0x141210), k);
    if ('roughness' in m) m.roughness = Math.max(m.roughness, k);
    if ('envMapIntensity' in m) m.envMapIntensity = Math.min(m.envMapIntensity ?? 1, 1 - 0.9 * k);
  }
}

// Ce que l'état demande, appliqué aux pièces : vitres, phares, aileron.
function appliquerPieces(rec, scene) {
  const z = rec.etat.zones;
  const vitresTouchees = z.avant < 0.5 || z.toit < 0.6 || Math.min(z.gauche, z.droite, z.arriere) < 0.35;
  for (const pc of rec.prep.pieces) {
    if (vitresTouchees && !pc.etoilee && RE_VITRE.test(pc.nom)) etoiler(pc);
    if (!pc.cassee && z.avant < 0.6 && RE_PHARE_AV.test(pc.nom)) eteindrePhare(pc);
    if (!pc.cassee && z.arriere < 0.6 && RE_PHARE_AR.test(pc.nom)) eteindrePhare(pc);
    if (!pc.detachee && RE_DETACHABLE.test(pc.nom)) {
      const cz = (pc.boite.min.z + pc.boite.max.z) / 2;
      const zone = cz > 0 ? z.arriere : z.avant;
      if (zone < 0.45) detacher(rec, pc, scene);
    }
  }
}

// UNE PIÈCE QUI SE DÉTACHE tombe au sol à côté de la voiture et y reste : elle
// garde sa géométrie (partagée ou clonée) et part avec la voiture.
function detacher(rec, pc, scene) {
  pc.detachee = true;
  scene.attach(pc.mesh);
  pc.chute = { vy: 1.5, vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, sol: rec.root.position.y + 0.05 };
  rec.debris.push(pc);
}

// ---- le gestionnaire --------------------------------------------------------
export function creerDegats({ scene, world, player, retirer = () => {}, lumiere = () => 1 } = {}) {
  const suivies = new Map();         // racine du maillage → fiche
  let fx = null, imFumee = null, imFlamme = null;
  const particules = [];             // { x, y, z, vie, age, vx, vy, vz, t0, t1, flamme, couleur }
  let voitureRue = null;             // (x, z, y) → maillage de la rue percutée, branché par main.js
  // LES CHOCS DE LA RUE À PLUSIEURS (v363). Chaque tablette a SA rue : une
  // voiture percutée chez Marlon n'était froissée que chez lui. Elle se nomme
  // par `clé#rang` (v305) — `nommer`, branché par main.js, va du maillage au
  // nom et du nom au maillage — et son HISTOIRE (les impacts, en repère de
  // voiture) voyage dans un message court (`rue_choc`) ; chaque tablette la
  // rejoue sur SA voiture du même nom, avec les mêmes fonctions et le même
  // bruit (v344). Jamais de géométrie sur le réseau.
  let nommer = null, diffuser = null;
  // CE QUE COÛTENT LES DÉGÂTS SUR L'APPAREIL (v364). Le banc rend en
  // logiciel et ses millisecondes ne se transposent pas (v247) : la tablette
  // les mesure elle-même, et le journal de bord (v296) les garde — le dernier
  // enfoncement, le pire, combien, et ce que le feu coûte en appels de dessin.
  // Max les lit sur l'iPad avec `?diag=1`, sans rien installer.
  const cout = { chocs: 0, dernierMs: 0, pireMs: 0, premierMs: 0 };
  // PAR QUEL CHEMIN PASSE UN CHOC (v365) : publié par la physique, ou deviné
  // par le repli ; et combien d'images les EFFETS ont été appliqués ici
  // plutôt que lus par la physique. Depuis la v358 le jeu ne passe plus que
  // par le premier : un témoin le garde, le repli reste pour l'ancien chemin.
  const chemins = { publies: 0, repli: 0, effetsIci: 0, enfoncements: 0 };
  function noterCout(m) {
    const ms = Math.round(m.ms * 10) / 10;
    if (!cout.chocs) cout.premierMs = ms;
    cout.chocs++; cout.dernierMs = ms; cout.pireMs = Math.max(cout.pireMs, ms);
  }
  const histoire = new Map();        // nom → [[f, x, z], …]
  let prochainRapprochement = 0;

  function fiche(root, creer = true) {
    let rec = suivies.get(root);
    if (!rec && creer) {
      rec = { root, etat: D.etatNeuf(), prep: null, appliques: 0, debris: [], vPrev: 0, calme: 0,
        dits: {}, emission: { fumee: 0, flamme: 0 }, tReel: performance.now(), animal: null, distant: false };
      suivies.set(root, rec);
    }
    return rec;
  }

  function lesFx() {
    if (fx) return fx;
    const r = lesRessources();
    fx = new THREE.Group();
    fx.name = 'degats-fx';
    imFumee = essaim(MAX_FUMEE, r.fumee, 2);
    imFlamme = essaim(MAX_FLAMMES, r.flamme, 3);
    fx.add(imFumee, imFlamme);
    for (let i = 0; i < MAX_FUMEE + MAX_FLAMMES; i++) {
      particules.push({ flamme: i >= MAX_FUMEE, vie: 0, age: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        t0: 0.5, t1: 1, couleur: new THREE.Color() });
    }
    scene.add(fx);
    return fx;
  }

  // Rejoue sur le maillage les chocs que l'état porte et qui n'y sont pas
  // encore. La géométrie n'existe qu'une fois le modèle chargé : tant qu'il ne
  // l'est pas, on attend (la coque d'attente, elle, n'a pas de pièces utiles).
  function rattraper(rec) {
    const chocs = rec.etat.chocs;
    if (!chocs.length) return null;
    // LE MODÈLE ARRIVE APRÈS LA COQUE D'ATTENTE (montures.js) : quand les
    // enfants du maillage changent, on relève les pièces neuves et l'on
    // rejoue tous les chocs dessus.
    const nb = rec.root.children.length;
    if (rec.prep && rec.appliques >= chocs.length && nb === rec.nbEnfants) return null;
    if (!rec.prep || nb !== rec.nbEnfants) {
      rec.prep = preparer(rec.root);
      rec.nbEnfants = nb;
      rec.appliques = 0;
    }
    let mesure = null;
    for (; rec.appliques < chocs.length; rec.appliques++) { mesure = enfoncer(rec.prep, chocs[rec.appliques]); chemins.enfoncements++; }
    appliquerPieces(rec, scene);
    rec.derniereMesure = mesure || rec.derniereMesure;
    if (mesure) noterCout(mesure);
    return mesure;
  }

  function dire(rec, cle, msg, couleur, duree) {
    if (rec.dits[cle] || rec.distant || rec.rue) return;
    rec.dits[cle] = true;
    toast(msg, couleur, duree);
  }

  // Un choc sur la voiture `root`, en repère de VOITURE. Public pour les
  // témoins et pour le repli ; la physique, elle, passe par `player.choc`.
  function choc(root, impact, rue = false) {
    const rec = fiche(root);
    if (rue) rec.rue = true;
    const avant = { ...rec.etat, zones: { ...rec.etat.zones } };
    const zone = D.subirChoc(rec.etat, impact);
    if (!zone) return null;
    // UNE VOITURE DE LA RUE NE PREND JAMAIS FEU (v356) : personne n'y est
    // blessé ni à déposer — elle se froisse, elle fume, et elle roule encore.
    if (rec.rue) { rec.etat.enFeu = false; rec.etat.enPanne = false; rec.etat.sante = Math.max(rec.etat.sante, D.SEUIL_FEU + 0.02); }
    const mesure = rattraper(rec);
    const e = rec.etat;
    if (e.enFeu && !avant.enFeu) dire(rec, 'feu', '🔥 Ta voiture prend feu — descends vite !', 0xff5a3a, 4000);
    else if (e.enPanne && !avant.enPanne) dire(rec, 'panne', '🛑 Ta voiture est en panne. Descends et prends-en une autre !', 0xffb347, 4000);
    else if (e.moteur < D.SEUIL_FUMEE && avant.moteur >= D.SEUIL_FUMEE) dire(rec, 'fumee', '💨 Aïe ! Le moteur fume — doucement.', 0xd8c9a4);
    return { zone, mesure };
  }

  // Où l'impact a eu lieu, pour le repli : on tâte trois points devant le
  // pare-chocs (ou derrière, en marche arrière) et l'on prend la moyenne des
  // pleins. Rien de plein (une voiture de la rue, un poteau de Manhattan) :
  // l'impact est au milieu.
  function sonderImpact(a, enAvant) {
    const cap = a.mesh.rotation.y, c = Math.cos(cap), s = Math.sin(cap);
    const lz = enAvant ? -(D.DEMI_LONG + 0.45) : D.DEMI_LONG + 0.45;
    let somme = 0, n = 0;
    for (const lx of [-0.9, 0, 0.9]) {
      // repère voiture → monde (l'inverse de `versRepere`)
      const wx = a.pos.x + lx * c + lz * s, wz = a.pos.z - lx * s + lz * c;
      for (const dy of [0.4, 1.0]) {
        if (world && world.isSolid && world.isSolid(Math.floor(wx), Math.floor(a.pos.y + dy), Math.floor(wz))) { somme += lx; n++; break; }
      }
    }
    return { lx: n ? somme / n : 0, lz: enAvant ? -D.DEMI_LONG : D.DEMI_LONG };
  }

  // ---- chaque image AU VOLANT (fun.js, juste après que l'allure est posée) ----
  function auVolant(a, dt) {
    if (!a || !a.def || !a.def.moteur || a.def.pilote) return null;
    const rec = fiche(a.mesh);
    rec.animal = a;
    const maintenant = performance.now();
    const v = player.vitesseVoiture || 0;
    // 1. LE CHOC : celui de la physique s'il existe, sinon le repli
    if (player.choc !== undefined) {
      const c = player.choc;
      if (c && c.t !== rec.dernierChocT) {
        rec.dernierChocT = c.t;
        const l = D.versRepere(a.pos.x, a.pos.z, a.mesh.rotation.y, c.x, c.z);
        if (choc(a.mesh, { force: c.force, lx: l.lx, lz: l.lz })) { chemins.publies++; percuterRue(c.x, c.z, a.pos.y, c.force); }
      }
    } else if (maintenant > rec.calme && maintenant - (player.arretDouxT || 0) > 400) {
      const force = D.detecterChoc(rec.vPrev, v, dt, player.vitesseVoitureMax || 0);
      if (force > 0) {
        const imp = sonderImpact(a, rec.vPrev >= 0);
        if (choc(a.mesh, { force, ...imp })) {
          chemins.repli++;
          // le point d'impact, du repère de la voiture à celui du monde
          const cap = a.mesh.rotation.y, co = Math.cos(cap), si = Math.sin(cap);
          percuterRue(a.pos.x + imp.lx * co + imp.lz * si, a.pos.z - imp.lx * si + imp.lz * co, a.pos.y, force);
        }
        rec.calme = maintenant + 350;
      }
    }
    rec.vPrev = v;
    // 2. CE QUE LA PHYSIQUE LIT
    player.etatVoiture = D.publier(rec.etat);
    // 3. LES EFFETS, appliqués ici tant que la physique ne les lit pas
    // elle-même (`player.physiqueLitEtat`) : jamais deux fois.
    if (!player.physiqueLitEtat) {
      chemins.effetsIci++;
      const eff = D.effetsConduite(rec.etat);
      // un plancher et non zéro : `player.js` lit `if (this.boost)`, et une
      // allure nulle y redonnerait… l'allure de la MARCHE (mesuré : 1,7 bloc
      // en 2,5 s d'une voiture « en panne »)
      if (player.boost != null) player.boost = Math.max(1e-4, player.boost * eff.allure);
      if (eff.biais && Math.abs(v) > 0.5) {
        const vmax = player.vitesseVoitureMax || 1;
        player.yaw += eff.biais * Math.min(1, Math.abs(v) / vmax) * Math.sign(v) * dt;
      }
    }
    // 4. LE FEU : passé le délai de lecture, on dépose l'enfant
    if (rec.etat.enFeu) {
      const dtr = Math.min(0.25, (maintenant - rec.tReel) / 1000);
      rec.tReel = maintenant;
      if (D.avancerFeu(rec.etat, dtr, true) === 'sortir') return 'sortir';
    } else rec.tReel = maintenant;
    return null;
  }

  // LA VOITURE DE LA RUE QU'ON VIENT DE PERCUTER s'abîme du même choc
  // (v356). Le point d'impact du MONDE tombe dans SON repère (son cap est la
  // rotation de son maillage, comme pour une monture) ; on clone la géométrie
  // de SES pièces touchées, jamais celle du prototype que toute la rue
  // partage (règle 1). Elle garde ses enfoncements tant qu'elle existe.
  function percuterRue(wx, wz, wy, force) {
    const m = voitureRue ? voitureRue(wx, wz, wy) : null;
    if (!m) return null;
    const l = D.versRepere(m.position.x, m.position.z, m.rotation.y, wx, wz);
    const r = choc(m, { force, lx: l.lx, lz: l.lz }, true);
    // l'histoire de ce choc, pour les amis (v363) : le dernier impact noté
    // est exactement celui que `subirChoc` vient d'arrondir
    const nom = r && nommer ? nommer(m) : null;
    if (nom) {
      const k = suivies.get(m).etat.chocs.at(-1);
      noter(nom, [k.f, k.x, k.z]);
      if (diffuser) diffuser({ t: 'rue_choc', o: nom, c: [k.f, k.x, k.z] });
    }
    return r;
  }

  // L'histoire d'une voiture de la rue, bornée comme `chocs` (douze) ; et
  // soixante-quatre voitures au plus — la plus ancienne s'oublie.
  function noter(nom, c) {
    let h = histoire.get(nom);
    if (!h) {
      if (histoire.size >= 64) histoire.delete(histoire.keys().next().value);
      histoire.set(nom, h = []);
    }
    h.push(c);
    if (h.length > 12) h.shift();
  }

  // UN CHOC DE LA RUE REÇU D'UN AMI (v363). On le note, et l'on rejoue tout
  // de suite si la voiture de ce nom roule chez nous ; sinon `rapprocher` le
  // fera quand elle naîtra (un convoi ne fabrique ses voitures qu'à portée).
  function recevoirRue(msg) {
    if (!msg || typeof msg.o !== 'string' || !Array.isArray(msg.c) || msg.c.length !== 3) return;
    const [f, x, z] = msg.c.map(Number);
    if (![f, x, z].every(Number.isFinite)) return;
    noter(msg.o.slice(0, 200), [f, x, z]);
    rapprocher(true);
  }

  // Ce que l'histoire porte et que la voiture ne porte pas encore, rejoué sur
  // elle. Deux fois par seconde en temps réel (une poignée de noms), et tout
  // de suite à la réception.
  function rapprocher(force = false) {
    const t = performance.now();
    if (!nommer || !histoire.size || (!force && t < prochainRapprochement)) return;
    prochainRapprochement = t + 500;
    for (const [nom, h] of histoire) {
      const m = nommer(nom);
      if (!m || !m.parent) continue;
      const rec = suivies.get(m);
      for (let n = rec ? rec.etat.chocs.length : 0; n < h.length; n++) {
        choc(m, { force: h[n][0], lx: h[n][1], lz: h[n][2] }, true);
      }
    }
  }

  // UNE VOITURE DE LA RUE ABÎMÉE QUE L'ENFANT PREND garde ses coups (v363).
  // `emprunter` la sort du convoi et fabrique une monture NEUVE du même
  // modèle (v194) — sa laque suit depuis la v305, ses dégâts ne suivaient
  // pas : l'enfant montait dans une voiture froissée et repartait dans une
  // neuve. On passe à la monture l'HISTOIRE des chocs, que `rattraper` rejoue
  // sur ses pièces dès que son modèle est là — les mêmes fonctions, le même
  // bruit, donc la même tôle. Jamais une copie de géométrie. Elle redevient
  // une voiture comme une autre (`rue` tombe) : le prochain gros choc peut la
  // mettre en panne ou en feu, et le jeu le dira.
  function rueEn(x, z, y) {
    let mieux = null, dm = 2.5 * 2.5;
    for (const rec of suivies.values()) {
      if (!rec.rue || !rec.root.parent) continue;
      const p = rec.root.position;
      if (y != null && Math.abs(p.y - y) > 2.5) continue;
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < dm) { dm = d; mieux = rec.root; }
    }
    return mieux;
  }
  function heriter(rootRue, root) {
    const avant = rootRue ? suivies.get(rootRue) : null;
    if (!avant || !root || !avant.etat.chocs.length) return false;
    const rec = fiche(root);
    const e = avant.etat;
    rec.etat = { ...e, zones: { ...e.zones }, chocs: e.chocs.map((k) => ({ ...k })), enFeu: false, eteint: false, feu: 0, carcasse: 0 };
    rec.prep = null; rec.appliques = 0;
    return true;
  }

  // L'enfant est descendu (ou a été déposé) : plus d'état publié.
  function descend() {
    player.etatVoiture = null;
  }

  // DÉPOSER L'ENFANT À CÔTÉ, debout, sur une case libre : côté conducteur
  // d'abord (la gauche), puis l'autre, puis derrière.
  function deposer(a) {
    const cap = a.mesh.rotation.y, c = Math.cos(cap), s = Math.sin(cap);
    const y = a.pos.y;
    const libre = (x, z) => !world || !world.isSolid
      || (!world.isSolid(Math.floor(x), Math.floor(y + 0.2), Math.floor(z))
        && !world.isSolid(Math.floor(x), Math.floor(y + 1.2), Math.floor(z)));
    for (const [lx, lz] of [[-2.4, 0], [2.4, 0], [-3.2, 1], [3.2, 1], [0, 4.2], [0, -4.2], [-4, 0], [4, 0]]) {
      const wx = a.pos.x + lx * c + lz * s, wz = a.pos.z - lx * s + lz * c;
      if (libre(wx, wz)) { player.pos.set(wx, y + 0.05, wz); player.vel.set(0, 0, 0); break; }
    }
    if (player.camera && player.eyePosition) player.camera.position.copy(player.eyePosition());
    toast('🧯 Ouf ! Tu es sorti·e à temps, sain et sauf. Prends une autre voiture !', 0x9fe0a8, 4000);
  }

  // ---- les particules -------------------------------------------------------
  const _v = new THREE.Vector3();
  function emettre(flamme, x, y, z, rec) {
    const debut = flamme ? MAX_FUMEE : 0, fin = flamme ? MAX_FUMEE + MAX_FLAMMES : MAX_FUMEE;
    let p = null;
    for (let i = debut; i < fin; i++) if (particules[i].vie <= 0) { p = particules[i]; break; }
    if (!p) return;
    p.age = 0;
    const noire = !flamme && rec.etat.enFeu;
    p.vie = flamme ? 0.45 + Math.random() * 0.3 : noire ? 2.6 + Math.random() * 1.2 : 1.8 + Math.random() * 1.2;
    p.noire = noire;
    p.vx = (Math.random() - 0.5) * (flamme ? 0.6 : 0.5);
    p.vz = (Math.random() - 0.5) * (flamme ? 0.6 : 0.5);
    p.vy = flamme ? 1.8 + Math.random() * 1.2 : 1.0 + Math.random() * 0.8;
    p.t0 = flamme ? 0.7 + Math.random() * 0.5 : 0.45;
    p.t1 = flamme ? 0.25 : noire ? 2.8 + Math.random() * 0.8 : 1.8 + Math.random() * 0.8;
    p.x = x + (Math.random() - 0.5) * 0.5; p.y = y; p.z = z + (Math.random() - 0.5) * 0.5;
    const e = rec.etat;
    if (flamme) {
      // ORANGE ET NON BLANC : des flammes additives qui se recouvrent
      // saturent au blanc (vu en capture) — la teinte reste dans le rouge et
      // l'orange, l'opacité sous 0,7
      p.couleur.setHSL(0.02 + Math.random() * 0.07, 1, 0.42 + Math.random() * 0.1);
    } else {
      // gris clair quand le moteur fume, NOIR quand il brûle ; la nuit, le
      // nuage ne luit pas — il prend la lumière du moment
      const sombre = e.enFeu ? 1 : e.eteint ? 0.6 : Math.min(1, (D.SEUIL_FUMEE - e.moteur) / D.SEUIL_FUMEE * 1.3);
      // EN LINÉAIRE (`setRGB` écrit dans l'espace de travail de three) : 0,12
      // y donne un gris MOYEN à l'écran — mesuré, #616162. Le noir d'une
      // fumée de feu est sous 0,02.
      const g = (0.38 - 0.367 * sombre) * lumiere();
      p.couleur.setRGB(g, g, g * 1.02);
    }
  }

  // Les carrés vivants sont TASSÉS en tête de chaque essaim (`count`) : ce qui
  // est mort ne se dessine pas, et un essaim vide est caché — zéro appel.
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _pos = new THREE.Vector3();
  function animerParticules(dt, camera) {
    let nf = 0, nl = 0;
    if (camera) _q.copy(camera.quaternion);
    const aF = imFumee.geometry.attributes.aAlpha, aL = imFlamme.geometry.attributes.aAlpha;
    for (const p of particules) {
      if (p.vie <= 0) continue;
      p.age += dt;
      if (p.age >= p.vie) { p.vie = 0; continue; }
      const k = p.age / p.vie;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const t = p.t0 + (p.t1 - p.t0) * k;
      // une flamme est plus haute que large
      _s.set(t, p.flamme ? t * 1.8 : t, t);
      _m.compose(_pos.set(p.x, p.y, p.z), _q, _s);
      const alpha = p.flamme ? (1 - k) * 0.65 : Math.min(1, k * 5) * (1 - k) * (p.noire ? 0.95 : 0.75);
      const im = p.flamme ? imFlamme : imFumee, i = p.flamme ? nl++ : nf++;
      im.setMatrixAt(i, _m);
      im.setColorAt(i, p.couleur);
      (p.flamme ? aL : aF).array[i] = alpha;
    }
    for (const [im, n, a] of [[imFumee, nf, aF], [imFlamme, nl, aL]]) {
      if (n || im.count) {
        im.instanceMatrix.needsUpdate = true;
        im.instanceColor.needsUpdate = true;
        a.needsUpdate = true;
      }
      im.count = n;
      im.visible = n > 0;
    }
  }

  // ---- chaque image, AU VOLANT OU NON ---------------------------------------
  function update(dt, camera, animaux) {
    const maintenant = performance.now();
    for (const [root, rec] of suivies) {
      // la voiture est partie (retirée à soixante-dix blocs, ou par nous) :
      // on rend ce qu'on avait détaché, le reste part avec elle (liberer)
      if (!rec.distant && rec.animal && animaux && !animaux.includes(rec.animal)) { oublier(rec); continue; }
      if (rec.distant && !root.parent) { oublier(rec); continue; }
      // une voiture de la rue sortie de la scène (prise par l'enfant, ou par
      // un ami) : ses clones rendus au pilote, la fiche oubliée
      if (rec.rue && !root.parent) { rendreClones(rec); oublier(rec); continue; }
      rattraper(rec);
      const e = rec.etat;
      // le feu et la carcasse avancent en temps RÉEL (v226), même sans enfant
      const conduite = rec.animal && rec.animal.montee;
      if (!conduite || !e.enFeu) {
        const dtr = Math.min(0.25, (maintenant - rec.tReel) / 1000);
        rec.tReel = maintenant;
        if (!rec.distant) {
          const ev = D.avancerFeu(e, dtr, false);
          if (ev === 'eteint') calcinerTout(rec, 1);
          if (ev === 'partie' && rec.animal) { retirer(rec.animal); oublier(rec); continue; }
          if (ev === 'partie' && rec.epave) { rec.epave(); oublier(rec); continue; }
        } else if (e.enFeu) e.feu += dtr;   // l'âge du feu de l'ami, pour son épave
      }
      if (e.enFeu) calcinerTout(rec, Math.min(1, e.feu / D.DUREE_FEU * 1.6));
      if (e.eteint && !rec.calcinee) calcinerTout(rec, 1);
      // la carcasse n'est plus une voiture qu'on prend
      if (rec.animal) rec.animal.horsService = !!(e.enFeu || e.eteint);
      // les débris tombent
      for (const pc of rec.debris) {
        if (!pc.chute) continue;
        pc.chute.vy -= 18 * dt;
        pc.mesh.position.x += pc.chute.vx * dt; pc.mesh.position.z += pc.chute.vz * dt;
        pc.mesh.position.y += pc.chute.vy * dt;
        if (pc.mesh.position.y <= pc.chute.sol) { pc.mesh.position.y = pc.chute.sol; pc.chute = null; }
      }
      // ÉMETTRE : la fumée suit le moteur, le feu ses flammes
      const fume = e.enFeu || (e.eteint && e.carcasse < 60) || e.moteur < D.SEUIL_FUMEE;
      // une voiture de la rue loin de l'enfant est cachée : pas de fumée sans voiture
      if (!fume || !root.visible) continue;
      lesFx();
      root.updateMatrixWorld();
      const boite = rec.prep ? rec.prep.boite : null;
      const hy = boite ? boite.max.y * 0.9 : 1.1, hz = boite ? boite.min.z * 0.55 : -1.2;
      _v.set(0, hy, hz).applyMatrix4(root.matrixWorld);
      const debitFumee = e.enFeu ? 12 : e.eteint ? 3 : 2 + 10 * (D.SEUIL_FUMEE - e.moteur) / D.SEUIL_FUMEE;
      rec.emission.fumee += debitFumee * dt;
      while (rec.emission.fumee >= 1) { rec.emission.fumee -= 1; emettre(false, _v.x, _v.y + 0.2, _v.z, rec); }
      if (e.enFeu) {
        rec.emission.flamme += 32 * dt;
        while (rec.emission.flamme >= 1) {
          rec.emission.flamme -= 1;
          // le capot, puis l'habitacle : le feu gagne la voiture
          const loin = Math.random() < Math.min(0.6, e.feu / 8);
          if (loin) { _v.set((Math.random() - 0.5) * 1.2, hy * 0.8, (Math.random() - 0.5) * 2).applyMatrix4(root.matrixWorld); }
          else _v.set((Math.random() - 0.5) * 0.9, hy * 0.85, hz).applyMatrix4(root.matrixWorld);
          emettre(true, _v.x, _v.y, _v.z, rec);
        }
      }
    }
    if (fx) animerParticules(dt, camera);
    rapprocher();
  }

  function calcinerTout(rec, k) {
    if (!rec.prep) return;
    if (k >= 1) rec.calcinee = true;
    for (const pc of rec.prep.pieces) if (RE_LAQUE.test(pc.nom) || RE_VITRE.test(pc.nom)) calciner(pc, k);
  }

  // Les géométries et matériaux CLONÉS d'une voiture (jamais les communs).
  function rendreClones(rec) {
    if (!rec.prep) return;
    for (const pc of rec.prep.pieces) {
      if (pc.propre && !pc.mesh.geometry.userData.rendu) pc.mesh.geometry.dispose();
      if (pc.matPropre) for (const m of [].concat(pc.mesh.material)) if (m && !m.userData.rendu) m.dispose();
    }
  }

  // OUBLIER une voiture : rendre au pilote ce qui ne lui est plus attaché (les
  // débris détachés). Le reste — géométries et matériaux clonés — est enfant
  // de son maillage et part avec lui par `liberer`.
  function oublier(rec) {
    for (const pc of rec.debris) {
      if (pc.mesh.parent) pc.mesh.parent.remove(pc.mesh);
      if (pc.propre) pc.mesh.geometry.dispose();
      if (pc.matPropre) for (const m of [].concat(pc.mesh.material)) m && m.dispose();
    }
    rec.debris.length = 0;
    suivies.delete(rec.root);
  }

  // RÉPARER (le garage) : chaque pièce retrouve sa géométrie et son matériau
  // communs, les clones sont rendus, l'aileron revient à sa place.
  function reparer(root) {
    const rec = suivies.get(root);
    if (!rec) return false;
    if (rec.prep) {
      for (const pc of rec.prep.pieces) {
        if (pc.detachee) {
          pc.parent.add(pc.mesh);
          pc.local.decompose(pc.mesh.position, pc.mesh.quaternion, pc.mesh.scale);
          pc.detachee = false;
        }
        if (pc.propre) { pc.mesh.geometry.dispose(); pc.mesh.geometry = pc.geoOrig; pc.propre = false; GEO_ORIG.delete(pc.mesh); }
        if (pc.matPropre) {
          for (const m of [].concat(pc.mesh.material)) m && m.dispose();
          pc.mesh.material = pc.matOrig; pc.matPropre = false; MAT_ORIG.delete(pc.mesh);
        }
      }
    }
    rec.debris.length = 0;
    if (rec.animal) rec.animal.horsService = false;
    suivies.delete(root);
    if (player.etatVoiture) player.etatVoiture = D.publier(D.etatNeuf());
    return true;
  }

  // LE RÉSEAU : l'ami voit la voiture abîmée et en feu. `d` vient du message
  // `pos` (`p.v.d`) ; on rejoue les impacts qu'on n'a pas encore vus.
  function distant(root, d) {
    if (!root) return;
    if (!d) { if (suivies.has(root)) reparer(root); return; }
    const rec = fiche(root);
    rec.distant = true;
    const cible = D.depuisReseau(d);
    // les impacts déjà appliqués restent ; on ne rejoue que les nouveaux
    if (cible.chocs.length < rec.etat.chocs.length) { reparer(root); return distant(root, d); }
    rec.etat.chocs = cible.chocs;
    rec.etat.zones = cible.zones; rec.etat.sante = cible.sante;
    rec.etat.moteur = cible.moteur; rec.etat.direction = cible.direction;
    rec.etat.enPanne = cible.enPanne; rec.etat.enFeu = cible.enFeu; rec.etat.eteint = cible.eteint;
    if (cible.enFeu && !rec.etat.feu) rec.etat.feu = 0.01;
  }

  // L'ÉPAVE D'UN AMI (v356). Quand le conducteur est déposé, sa position
  // n'emporte plus de voiture (`p.v` disparaît) ; sans rien de plus, sa
  // carcasse en feu s'évanouissait chez l'ami au moment même où elle brûle.
  // Le RECEVEUR la garde là où elle s'est arrêtée et la fait vivre lui-même :
  // le feu jusqu'au bout, la carcasse fumante, puis elle s'en va au bout de
  // `DUREE_CARCASSE` (`enlever`, fourni par main.js : scène et pilote). Rien de
  // neuf ne voyage sur le réseau — une tablette restée sur l'ancienne version
  // n'a rien à ignorer. Seule une voiture hors service se garde : une voiture
  // simplement quittée n'est pas dessinée chez l'ami, comme toute monture.
  function garderEpave(root, enlever) {
    const rec = suivies.get(root);
    if (!rec || !(rec.etat.enFeu || rec.etat.eteint)) return false;
    rec.distant = false; rec.animal = null; rec.epave = enlever;
    rec.tReel = performance.now();
    return true;
  }

  // ---- LA CHAUFFE (v246, v319) : les deux matériaux neufs, pendant l'accueil
  function chauffer(renderer, camera, decor) {
    const r = lesRessources();
    const ici = new THREE.Scene();
    // LA FORME MÊME DU FEU (v348) : un essaim instancié, sa couleur par
    // instance, sur le matériau qui dessinera — sinon le premier feu compile
    const essais = [essaim(1, r.fumee, 2), essaim(1, r.flamme, 3)];
    for (const q of essais) {
      q.count = 1; q.visible = true;
      q.position.copy(camera.position).add(new THREE.Vector3(0, -500, 0));
      ici.add(q);
    }
    renderer.compile(ici, camera, decor);
    for (const q of essais) { q.geometry.dispose(); q.dispose(); }
    // ET LA BOUCLE D'ENFONCEMENT SE RODE ICI : son premier passage coûte le
    // double des suivants (le moteur JavaScript la compile), et c'est le
    // premier choc de l'enfant qui l'aurait payé.
    const essai = new THREE.Group();
    essai.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 4.4, 8, 4, 16), new THREE.MeshBasicMaterial()));
    const prep = preparer(essai);
    enfoncer(prep, { f: 1, x: 0, z: -2.2 });
    for (const pc of prep.pieces) { pc.mesh.geometry.dispose(); pc.geoOrig.dispose(); pc.mesh.material.dispose(); }
  }

  return {
    auVolant, descend, deposer, update, choc, reparer, distant, chauffer, garderEpave,
    brancherRue: (f) => { voitureRue = f; },
    // à plusieurs (v363) : le nom d'une voiture de la rue, et l'envoi
    brancherNoms: (f) => { nommer = f; },
    brancherReseau: (f) => { diffuser = f; },
    recevoirRue, rueEn, heriter, percuterRue,
    // le coût réel, pour le journal de bord et `?diag=1` (v364) : null tant
    // que rien ne s'est abîmé — un relevé ne grossit pas pour rien
    bilan: () => {
      const feu = (imFumee && imFumee.visible ? 1 : 0) + (imFlamme && imFlamme.visible ? 1 : 0);
      if (!cout.chocs && !feu) return null;
      return { ...cout, feu, carres: (imFumee ? imFumee.count : 0) + (imFlamme ? imFlamme.count : 0) };
    },
    chemins: () => ({ ...chemins }),
    histoireRue: (nom) => (histoire.get(nom) || []).map((c) => c.slice()),
    // pour main.js : le champ réseau de la voiture qu'on conduit
    versReseau: (root) => { const rec = suivies.get(root); return rec ? D.versReseau(rec.etat) : null; },
    estCarcasse: (a) => !!(a && a.horsService),
    // pour les témoins
    etat: (root) => { const rec = suivies.get(root); return rec ? rec.etat : null; },
    mesure: (root) => { const rec = suivies.get(root); return rec ? rec.derniereMesure || null : null; },
    pieces: (root) => { const rec = suivies.get(root); return rec && rec.prep ? rec.prep.pieces : null; },
    particulesVisibles: () => particules.filter((p) => p.vie > 0).reduce((n, p) => { n[p.flamme ? 'flammes' : 'fumee']++; return n; }, { fumee: 0, flammes: 0 }),
    suivies: () => suivies.size,
    rue: () => [...suivies.values()].filter((r) => r.rue).map((r) => r.root),
    epaves: () => [...suivies.values()].filter((r) => r.epave).map((r) => ({ root: r.root,
      x: r.root.position.x, z: r.root.position.z, enFeu: r.etat.enFeu, eteint: r.etat.eteint })),
  };
}
