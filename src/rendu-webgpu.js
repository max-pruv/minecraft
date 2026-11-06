// LE RENDU WEBGPU, DERRIÈRE `?rendu=webgpu` (chantier réalisme 3/5, étude).
//
// Le jeu rend avec `WebGLRenderer` de three r160. Ce module est le SEUL endroit
// qui sache qu'un autre rendu existe : `index.html` fait pointer l'import map
// `three` vers `vendor/three-webgpu/` (three r187, build WebGPU) quand
// l'adresse porte `?rendu=webgpu`, et le reste du jeu continue d'importer
// `three` sans rien savoir. Par défaut RIEN ne change : l'import map d'avant,
// le même fichier three, le même rendu — les fonctions d'ici rendent la main
// tout de suite.
//
// Pourquoi un rendu entier et pas un réglage : le goulot de l'iPad est le
// nombre d'appels de dessin et le travail du processeur par image (v196, v269,
// v291). WebGPU soumet ses appels par paquets préenregistrés (render bundles)
// et compile ses pipelines hors du fil principal ; c'est ce qu'on mesure
// (`tests/sonde-rendu-webgpu.cjs`, et `?diag=1` sur l'appareil de Max).
//
// Ce que ce module porte, et pourquoi chaque pièce :
// - `creerRenderer` : `WebGPURenderer` doit être INITIALISÉ (`await init()`)
//   avant le premier `render`, sinon il jette. Le WebGL d'avant est synchrone.
// - des CALES sur l'objet rendu, pour que le jeu écrit pour WebGL continue de
//   l'appeler : `compile` (devenu `compileAsync`), `info.programs` (la chauffe
//   et dix témoins lisent les clés de programme — WebGPU les appelle pipelines),
//   `properties`, `getContext`.
// - les GREFFONS TSL : un `onBeforeCompile` est IGNORÉ en silence par le rendu
//   WebGPU, qui ne compile plus de GLSL. Le repli des UV de l'atlas, l'onde de
//   l'eau, la matière par sommet de la couche HD, le dôme du ciel et l'opacité
//   par instance sont réécrits en nœuds (Three Shading Language). Le rendu
//   WebGPU convertit un matériau classique en matériau de nœuds en recopiant
//   TOUTES ses propriétés (`NodeLibrary.fromMaterial`) : poser `colorNode`,
//   `positionNode`, `roughnessNode`… sur le `MeshLambertMaterial` du jeu
//   suffit, sans changer la référence que `main.js` tient.
//
// Rien d'ici n'est importé par le worker de maillage : il ne connaît pas three.

import * as THREE from 'three';

const PARAMS = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
export const RENDU_WEBGPU = PARAMS.get('rendu') === 'webgpu';
export function renduActif() { return RENDU_WEBGPU ? 'webgpu' : 'webgl'; }

// Le module `three/tsl`, chargé seulement sous WebGPU (l'import map par défaut
// ne le connaît pas, et un import statique casserait le jeu d'avant).
let tsl = null;
// Ce que l'appareil a dit de lui : nom de l'adaptateur, logiciel ou matériel,
// le dos réel (WebGPU, ou WebGL2 si le navigateur a refusé).
const etat = { nom: 'webgl', adaptateur: null, logiciel: undefined, dos: null, erreur: null, renderers: 0 };
export function etatRendu() { return etat; }

async function adaptateur() {
  if (typeof navigator === 'undefined' || !navigator.gpu) return null;
  try {
    const a = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!a) return null;
    const i = a.info || {};
    etat.adaptateur = [i.vendor, i.architecture, i.device, i.description].filter(Boolean).join(' ');
    // SwiftShader (Dawn sur le banc) est un rendu logiciel : les ombres et la
    // couche HD se coupent comme sous WebGL (v247, v287).
    etat.logiciel = /swiftshader|llvmpipe|lavapipe|software/i.test(etat.adaptateur) || a.isFallbackAdapter === true;
    return a;
  } catch (e) { etat.erreur = String(e && e.message || e); return null; }
}

// Crée le rendu demandé. Sous WebGL, EXACTEMENT ce que `main.js` faisait, de
// façon synchrone (l'appelant n'attend pas). Sous WebGPU : adaptateur, appareil,
// `WebGPURenderer`, `init()`, puis les cales.
export async function creerRenderer(canvas, options = {}) {
  if (!RENDU_WEBGPU || !THREE.WebGPURenderer) return new THREE.WebGLRenderer({ canvas, ...options });
  if (!tsl) tsl = await import('three/tsl');
  // `?dos=webgl` force le dos WebGL2 du MÊME rendu r187 (les mêmes matériaux
  // en nœuds, la même chauffe) : c'est ce que verra une tablette sans WebGPU,
  // et c'est le bras que le banc compare au WebGPU réel.
  const forceWebGL = /[?&]dos=webgl(&|$)/.test(location.search);
  const a = forceWebGL ? null : await adaptateur();
  let device = null;
  if (a) { try { device = await a.requestDevice(); } catch (e) { etat.erreur = String(e && e.message || e); } }
  // Sans adaptateur, three retombe de lui-même sur son dos WebGL2 : le jeu
  // tourne, et `etat.dos` le dit — on ne mesure jamais WebGL en croyant
  // mesurer WebGPU.
  const r = new THREE.WebGPURenderer({ canvas, ...options, forceWebGL, ...(device ? { device } : {}) });
  await r.init();
  etat.dos = r.backend && r.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
  etat.nom = 'webgpu';
  etat.renderers++;
  caler(r);
  return r;
}

// LES CALES. Le jeu a été écrit pour `WebGLRenderer` ; voici ce qu'il appelle
// et que le rendu WebGPU n'a pas sous ce nom.
function caler(r) {
  // `compile(scene, camera, targetScene)` est devenu `compileAsync`. La chauffe
  // de l'accueil (v246, v306, v491) l'appelle une quinzaine de fois puis
  // DISPOSE la géométrie d'essai dans la foulée : une compilation asynchrone
  // peut alors tomber sur une géométrie déjà rendue. On la lance sans
  // l'attendre et l'on avale son échec — la chauffe est un confort, pas un
  // verdict, et c'est un blocage déclaré du plan (docs/webgpu.md).
  // (`compile` est un accesseur en lecture seule sur le prototype du rendu :
  // on le redéfinit sur l'instance.)
  Object.defineProperty(r, 'compile', { configurable: true, value: (scene, camera, cible) => { r.compileAsync(scene, camera, cible).catch(() => {}); } });
  // `renderer.info.programs` : la liste des programmes compilés, lue par la
  // chauffe (`prog` du journal, `?diag=1`) et par les témoins qui comparent des
  // clés. Sous WebGPU ce sont les PIPELINES de rendu, dans le cache du rendu.
  Object.defineProperty(r.info, 'programs', {
    configurable: true,
    get() {
      const caches = r._pipelines && r._pipelines.caches;
      if (!caches) return [];
      let i = 0;
      return [...caches.keys()].map((k) => ({ id: i++, cacheKey: String(k) }));
    },
  });
  // `renderer.properties.get(materiau)` : deux témoins lisent le programme
  // courant d'un matériau. Il n'y a pas de programme par matériau ici.
  if (!r.properties) r.properties = { get: () => ({}) };
  // `renderer.getContext()` : le jeu y lisait le nom du pilote pour savoir s'il
  // rend en logiciel ; `etatRendu().logiciel` le dit désormais. On rend un
  // objet muet pour que l'ancien chemin ne jette pas.
  const ctx = r.getContext;
  Object.defineProperty(r, 'getContext', { configurable: true, value: () => { try { const c = ctx && ctx.call(r); if (c && c.getExtension) return c; } catch { /* dos WebGPU */ } return { getExtension: () => null, getParameter: () => '' }; } });
  // `forceContextLoss` (les portraits) n'existe pas.
  if (!r.forceContextLoss) r.forceContextLoss = () => {};
  // Les compteurs d'image. `WebGLRenderer` remet `info` à zéro au début de
  // chaque `render()` ; r187 ne le fait que dans SA boucle d'animation
  // (`setAnimationLoop`), que le jeu n'utilise pas : `triangles` et
  // `drawCalls` s'y accumuleraient pour toujours, et `calls` y compte les
  // appels à `render()`, pas les appels de dessin. On remet à zéro à chaque
  // rendu, et `calls` dit les appels de dessin, comme avant (le journal de
  // bord, `?diag=1` et les sondes le lisent sous ce nom).
  const rendre = r.render.bind(r);
  Object.defineProperty(r, 'render', { configurable: true, value: (scene, camera) => { r.info.reset(); return rendre(scene, camera); } });
  Object.defineProperty(r.info.render, 'calls', { configurable: true, get() { return this.drawCalls; }, set() { /* three l'incrémente : on compte les dessins, pas les rendus */ } });
}

// --- les greffons TSL -------------------------------------------------------------

// Les UV d'une face fusionnée vont de 0 à sa largeur ; le repli dans la tuile de
// l'atlas (`tuile` = [u0, v0, largeur, hauteur]) se fait au fragment. Les
// dérivées sont celles de l'UV NON replié, à l'échelle de la tuile, sinon le
// saut de `fract` au bord de chaque bloc choisit le mip le plus grossier (v287).
function uvTuile(t) {
  const tuile = t.attribute('tuile', 'vec4');
  const u = t.uv();
  return { uv: tuile.xy.add(t.fract(u).mul(tuile.zw)), dx: t.dFdx(u).mul(tuile.zw), dy: t.dFdy(u).mul(tuile.zw) };
}
function texelTuile(t, carte) {
  const { uv, dx, dy } = uvTuile(t);
  return t.texture(carte, uv).grad(dx, dy);
}

// Le repli de l'atlas des blocs (`activerTuilage` de textures.js). `onde` ajoute
// le clapot de la surface de l'eau sur la position des sommets dont la normale
// regarde en haut : la même formule qu'en GLSL (v247).
export function tuilage(material, { onde = false } = {}) {
  if (!tsl) return false;
  const t = tsl;
  material.colorNode = t.materialReference('color', 'color').mul(texelTuile(t, material.map));
  if (onde) {
    const temps = t.uniform(0);
    material.userData.temps = temps;           // `{ value }`, comme avant : main.js l'avance
    const p = t.positionLocal;
    const houle = t.sin(p.x.mul(0.9).add(temps.mul(1.7))).mul(0.5)
      .add(t.sin(p.z.mul(1.3).add(temps.mul(2.3))).mul(0.5)).mul(0.055);
    const dessus = t.normalLocal.y.greaterThan(0.5);
    material.positionNode = p.add(t.vec3(0, t.select(dessus, houle, 0), 0));
  }
  material.needsUpdate = true;
  return true;
}

// La couche HD de Paris (matierehd.js) : repli des UV avec dérivées, rugosité et
// métal lus dans l'attribut `matiere`, lueur des fenêtres dans `lueur`, allumée
// par l'uniforme `nuitHD` que main.js règle avec la nuit.
export function matiereHD(materiau, uniformes) {
  if (!tsl) return false;
  const t = tsl;
  const nuit = t.uniform(0);
  uniformes.nuitHD = nuit;                     // `{ value }`, le même contrat qu'avant
  const matiere = t.attribute('matiere', 'vec2');
  materiau.colorNode = texelTuile(t, materiau.map);
  materiau.roughnessNode = matiere.x;
  materiau.metalnessNode = matiere.y;
  materiau.emissiveNode = t.vec3(1.0, 0.84, 0.58).mul(t.attribute('lueur', 'float')).mul(nuit).mul(1.4);
  materiau.needsUpdate = true;
  return true;
}

// Un dôme en dégradé (le ciel de sky.js, l'environnement préfiltré de la couche
// HD) : la couleur ne dépend que de la hauteur de la direction. `uniforms`
// garde la forme `{ zenith: { value: Color }, horizon: { value: Color } }` que
// `sky.update` écrit à chaque image.
// `lisse: [a, b]` remplace la puissance par un smoothstep(a, b, h) — la
// chambre de réflexion de Manhattan (manhattan-materiaux.js).
export function domeDegrade({ zenith, horizon, sol = null, puissance = 0.65, lisse = null }) {
  if (!tsl || !THREE.NodeMaterial) return null;
  const t = tsl;
  const uZenith = t.uniform(new THREE.Color().copy(zenith)), uHorizon = t.uniform(new THREE.Color().copy(horizon));
  const h = t.normalize(t.positionLocal).y;
  let couleur = t.mix(uHorizon, uZenith, lisse ? t.smoothstep(lisse[0], lisse[1], h) : t.pow(t.max(h, 0.0), puissance));
  if (sol) {
    const uSol = t.uniform(new THREE.Color().copy(sol));
    couleur = t.select(h.lessThan(0.0), t.mix(uHorizon, uSol, t.smoothstep(0.0, -0.3, h)), couleur);
  }
  const m = new THREE.NodeMaterial();
  m.colorNode = t.vec4(couleur, 1.0);
  m.lights = false;
  m.side = THREE.BackSide; m.depthWrite = false; m.fog = false;
  m.uniforms = { zenith: uZenith, horizon: uHorizon };
  return m;
}

// L'opacité par instance des essaims (fumée, flammes, traces) : l'attribut
// `aAlpha` multiplie l'opacité du matériau.
export function alphaParInstance(m) {
  if (!tsl) return false;
  m.opacityNode = tsl.materialOpacity.mul(tsl.attribute('aAlpha', 'float'));
  m.needsUpdate = true;
  return true;
}

// La ligne de `?diag=1` : le rendu, l'adaptateur, le dos réel, les pipelines.
export function ligneDiag(renderer) {
  if (!RENDU_WEBGPU) return 'rendu webgl (three r160)';
  const n = renderer && renderer.info && renderer.info.programs ? renderer.info.programs.length : '?';
  return `rendu webgpu (three ${THREE.REVISION}) · dos ${etat.dos || '?'} · ${etat.adaptateur || 'adaptateur inconnu'}${etat.logiciel ? ' · LOGICIEL' : ''} · ${n} pipelines${etat.erreur ? ` · ${etat.erreur}` : ''}`;
}
