// LES TRACES DE PNEUS (v434).
//
// Max veut une conduite « comme GTA ». Depuis la v409 la voiture dérape — la
// physique publie `player.derive` et `player.freinMainTire` — et rien au sol
// ne le disait : la voiture glissait sur une route propre. Ce fichier pose une
// trace sombre sous chaque roue arrière tant que la voiture glisse, et la
// laisse s'effacer d'elle-même.
//
// QUATRE RÈGLES TIENNENT CE FICHIER :
//
//   1. UN APPEL DE DESSIN POUR TOUTES LES TRACES (v196, v348). Un seul
//      `InstancedMesh`, un carré par bout de trace, l'opacité par instance
//      (`aAlpha`, le greffon des flammes de `degats3d.js`, clé de programme
//      FIXE). Le nombre est BORNÉ (`MAX_TRACES`) : la plus vieille cède sa
//      place à la neuve, et un essaim vide est caché — zéro appel.
//   2. AUCUN PROGRAMME NE NAÎT EN JEU (v246, v319). `chaufferTraces` compile
//      la forme exacte pendant l'accueil ; un témoin lit les CLÉS de programme
//      avant et après une glissade (v363).
//   3. LA TRACE SE POSE SUR CE QUI PORTE LA ROUE, un centième au-dessus : le
//      tablier d'un pont s'il porte la voiture, la surface continue hors des
//      villes (`solContinu`), sinon le dessus du bloc. Une trace qu'on
//      poserait à la cote de la voiture flotterait sur une pente.
//   4. C'EST UNE ANIMATION : elle s'efface en temps de JEU (v226), comme la
//      fumée. Et elle ne lit la physique qu'en lecture.

import * as THREE from 'three';

const PARAMS = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
// `?traces=0` les coupe, pour mesurer (jamais un réglage de la famille).
// ET ELLES NE SE DESSINENT PAS EN RENDU LOGICIEL, comme les ombres (v247), la
// couche HD (v287) et le bâti lointain (v331) : mesuré au banc, 480 traces
// devant la caméra coûtent 9,5 · 12,5 · 13,0 images par seconde contre 14,4 ·
// 14,0 · 14,6 sans (ABBA, `sonde-traces-cout.cjs`) — du remplissage
// transparent que SwiftShader paie au processeur ; une carte graphique ne le
// voit pas. Elles se POSENT quand même (le témoin les lit) ; `?traces=1` ou
// `reglageTraces.dessin = true` (une sonde, un témoin) forcent le dessin.
export const reglageTraces = { actif: PARAMS.get('traces') !== '0', dessin: PARAMS.get('traces') === '1' ? true : null };
const dessinVoulu = () => (reglageTraces.dessin != null ? reglageTraces.dessin
  : !(typeof document !== 'undefined' && document.documentElement.classList.contains('rendu-logiciel')));

export const MAX_TRACES = 480;     // bouts de trace vivants au plus
export const VIE_TRACE = 24;       // secondes de jeu avant de disparaître
export const FONDU_TRACE = 6;      // les dernières secondes s'effacent
export const SEUIL_DERIVE = 0.12;  // rad : en dessous, les pneus tiennent (le seuil du crissement)
export const PAS_TRACE = 0.4;      // blocs entre deux bouts
export const LARGEUR_TRACE = 0.3;  // la bande d'un pneu
export const AU_DESSUS = 0.01;     // un centième au-dessus de la surface

let scene = null, world = null, im = null, alphas = null, ressources = null;
const nes = new Float32Array(MAX_TRACES);     // l'heure de naissance (jeu)
const forces = new Float32Array(MAX_TRACES);  // l'opacité de départ
let prochain = 0, vivantes = 0, horloge = 0, poses = 0;

function lesRessources() {
  if (ressources) return ressources;
  const mat = new THREE.MeshBasicMaterial({ color: 0x141416, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
      .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vAlpha;');
  };
  mat.customProgramCacheKey = () => 'traces-alpha';
  mat.userData.partagee = true;
  ressources = { mat };
  return ressources;
}

// L'essaim : un carré couché, l'attribut d'opacité, la matrice dynamique.
function essaim(n) {
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  g.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
  g.userData.partagee = true;
  const m = new THREE.InstancedMesh(g, lesRessources().mat, n);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // les instances sont partout le long de la route : la sphère englobante
  // d'un essaim qui bouge serait toujours fausse
  m.frustumCulled = false;
  m.name = 'traces-pneus';
  m.renderOrder = 1;
  return m;
}

export function brancherTraces(s, w) {
  if (scene === s && world === w) return;
  scene = s; world = w;
}

function installer() {
  if (im || !scene) return im;
  im = essaim(MAX_TRACES);
  alphas = im.geometry.attributes.aAlpha;
  im.count = 0;
  im.visible = false;
  scene.add(im);
  return im;
}

// LA COTE DE CE QUI PORTE LA ROUE en (x, z), pour une voiture à la cote `y`.
// `null` si rien de raisonnable n'est sous la roue (un bord de falaise, l'air).
export function coteSousRoue(w, x, z, y) {
  const tab = w.tablierSousLePoint ? w.tablierSousLePoint(x, z) : null;
  if (tab != null && Math.abs(tab - y) < 1.2) return tab;
  const s = w.solContinu ? w.solContinu(x, z) : null;
  if (s != null && Math.abs(s - y) < 1.2) return s;
  const bx = Math.floor(x), bz = Math.floor(z);
  for (let by = Math.floor(y + 0.5); by >= Math.floor(y) - 2; by--) {
    if (w.isSolid(bx, by, bz)) return Math.abs(by + 1 - y) < 1.2 ? by + 1 : null;
  }
  return null;
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(),
  _s = new THREE.Vector3(), _haut = new THREE.Vector3(0, 1, 0);

// UN BOUT DE TRACE, de (ax, az) à (bx, bz), à la cote `y` (déjà au-dessus).
function poserBout(ax, az, bx, bz, y, force) {
  if (!installer()) return;
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
  if (L < 1e-3) return;
  const i = prochain;
  prochain = (prochain + 1) % MAX_TRACES;
  if (vivantes < MAX_TRACES) vivantes++;
  _p.set((ax + bx) / 2, y, (az + bz) / 2);
  _q.setFromAxisAngle(_haut, Math.atan2(dx, dz));
  // un soupçon de recouvrement : deux bouts voisins ne laissent pas de fente
  _s.set(LARGEUR_TRACE, 1, L + 0.02);
  im.setMatrixAt(i, _m.compose(_p, _q, _s));
  im.instanceMatrix.needsUpdate = true;
  nes[i] = horloge; forces[i] = force;
  alphas.setX(i, force);
  alphas.needsUpdate = true;
  im.count = Math.max(im.count, i + 1);
  im.visible = dessinVoulu();
  poses++;
}

// LES ROUES QUI GLISSENT D'UN VÉHICULE. `mesh` est la voiture dessinée (la
// sienne ou celle d'un ami), `suivi` l'état qu'on lui garde (dernier point de
// chaque roue), `glisse` 0..1 l'intensité (0 : les pneus tiennent), `y` la
// cote de la voiture. Les roues arrière se lisent dans le modèle
// (`Wheel_R*`) ; sans elles (la coque d'attente), à la place qu'elles ont
// sur une voiture.
const _w = new THREE.Vector3();
export function marquerRoues(mesh, suivi, glisse, y) {
  if (!reglageTraces.actif || !world || !mesh) return;
  if (!(glisse > 0)) { suivi.points = null; return; }
  const pts = [];
  const roues = (mesh.userData.roues || []).filter((r) => /^Wheel_R/i.test(r.name || ''));
  if (roues.length) {
    mesh.updateMatrixWorld(true);
    for (const r of roues) { r.getWorldPosition(_w); pts.push([_w.x, _w.z]); }
  } else {
    const c = Math.cos(mesh.rotation.y), s = Math.sin(mesh.rotation.y);
    for (const cote of [-0.85, 0.85]) {
      // le nez est en −z : l'essieu arrière est à +1,3 dans le repère du modèle
      pts.push([mesh.position.x + c * cote + s * 1.3, mesh.position.z - s * cote + c * 1.3]);
    }
  }
  const prec = suivi.points;
  suivi.points = pts;
  if (!prec || prec.length !== pts.length) return;
  for (let k = 0; k < pts.length; k++) {
    const [ax, az] = prec[k], [bx, bz] = pts[k];
    const d = Math.hypot(bx - ax, bz - az);
    if (d > 4) continue;                       // un téléport, pas une glissade
    if (d < PAS_TRACE) { pts[k] = prec[k]; continue; } // on attend d'avoir avancé
    const h = coteSousRoue(world, bx, bz, y);
    if (h == null) continue;
    poserBout(ax, az, bx, bz, h + AU_DESSUS, 0.25 + 0.35 * Math.min(1, glisse));
  }
}

// L'INTENSITÉ D'UNE GLISSADE, d'après ce que la physique publie (lu si
// présent) : la dérive au-delà du seuil, ou le frein à main tiré en roulant.
export function glissade(derive, freinMain, vitesse) {
  const v = Math.abs(vitesse || 0);
  if (v < 2) return 0;
  const d = Math.abs(derive || 0);
  const parDerive = d > SEUIL_DERIVE ? Math.min(1, (d - SEUIL_DERIVE) * 4) : 0;
  return Math.max(parDerive, freinMain ? 0.7 : 0);
}

// CHAQUE IMAGE : les traces vieillissent et s'effacent, les plus vieilles
// d'abord. Rien à faire quand il n'y en a pas.
export function avancerTraces(dt) {
  horloge += Math.min(dt, 0.25);
  if (!im || !vivantes) return;
  let encore = 0, change = false;
  for (let i = 0; i < im.count; i++) {
    const f = forces[i];
    if (f <= 0) continue;
    const age = horloge - nes[i];
    let a = f;
    if (age > VIE_TRACE) { a = 0; forces[i] = 0; }
    else if (age > VIE_TRACE - FONDU_TRACE) a = f * (VIE_TRACE - age) / FONDU_TRACE;
    else { encore++; continue; }
    alphas.setX(i, a); change = true;
    if (a > 0) encore++;
  }
  if (change) alphas.needsUpdate = true;
  vivantes = encore;
  if (!vivantes) { im.visible = false; im.count = 0; prochain = 0; }
  else im.visible = dessinVoulu();
}

// LA CHAUFFE, pendant l'accueil : l'essaim exact, une instance, sur le
// matériau qui dessinera (la règle de `degats3d.js`, v348).
export function chaufferTraces(renderer, camera, decor) {
  const ici = new THREE.Scene();
  const q = essaim(1);
  q.count = 1; q.visible = true;
  q.position.copy(camera.position).add(new THREE.Vector3(0, -500, 0));
  ici.add(q);
  renderer.compile(ici, camera, decor);
  q.geometry.dispose(); q.dispose();
}

// Pour les témoins et `?diag=1`.
export function etatTraces() {
  const ys = [];
  if (im) for (let i = 0; i < im.count; i++) if (forces[i] > 0) { im.getMatrixAt(i, _m); _p.setFromMatrixPosition(_m); ys.push(_p.y); }
  return { vivantes, poses, max: MAX_TRACES, visible: !!(im && im.visible), dessin: dessinVoulu(), dans: !!(im && im.parent),
    ys: ys.slice(-8), alphaMin: ys.length ? Math.min(...Array.from({ length: im.count }, (_, i) => forces[i] > 0 ? alphas.getX(i) : 1)) : null };
}

// Pour un témoin : effacer tout (une scène qu'on remet à zéro).
export function effacerTraces() {
  if (!im) return;
  forces.fill(0); vivantes = 0; prochain = 0; im.count = 0; im.visible = false;
}
