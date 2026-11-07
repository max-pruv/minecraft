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
const etat = { nom: 'webgl', adaptateur: null, logiciel: undefined, dos: null, erreur: null, renderers: 0, images: 0, etape: null };
export function etatRendu() { return etat; }

// LA PORTE DE SORTIE (retour de Max : « Chargement du monde… » sans fin sur
// son iPhone sous `?rendu=webgpu`). Un drapeau d'essai ne laisse jamais
// l'enfant bloqué : ce qui pend ou jette ici se borne, et la page se recharge
// sans le drapeau par `window.__repliWebGL` (index.html, hors du graphe de
// modules — lui seul voit un module qui ne se lie pas). La raison voyage dans
// sessionStorage ; la page WebGL la dit dans `?diag=1` et dans le journal de
// bord. `?webgpu=echec` force l'échec du module, `?webgpu=gel` fait pendre
// `creerRenderer` pour toujours (le chien de garde d'index.html) : les deux
// chemins, pour les témoins.
export const DELAI_INIT_MS = 20000;   // import de three/tsl, adaptateur, appareil, init()
export const DELAI_IMAGE_MS = 30000;  // la première image rendue après l'initialisation
export const CLE_REPLI = 'wm-webgpu-repli';
const ESSAI = PARAMS.get('webgpu');
function replier(raison) {
  etat.erreur = String(raison && raison.message || raison).slice(0, 240);
  if (typeof window !== 'undefined' && typeof window.__repliWebGL === 'function') { window.__repliWebGL(etat.erreur); return new Promise(() => {}); }
  return Promise.reject(raison instanceof Error ? raison : new Error(etat.erreur));
}
// Ce que la page WebGL sait d'un repli qui vient d'avoir lieu (lu par `ligneDiag`
// et par main.js pour le journal de bord) ; `null` s'il n'y en a pas eu.
export function repliWebGPU() {
  try { const v = sessionStorage.getItem(CLE_REPLI); return v ? JSON.parse(v) : null; } catch { return null; }
}
const borne = (promesse, ms, raison) => Promise.race([promesse, new Promise((_, rejet) => setTimeout(() => rejet(new Error(`${raison} (${Math.round(ms / 1000)} s)`)), ms))]);
// Sous `?diag=1`, l'étape en cours s'écrit dans le loader de l'accueil : c'est
// ce que Max lit sur son iPhone quand « Chargement du monde… » ne part pas.
const DIAG = PARAMS.get('diag') === '1';
function etape(nom) {
  etat.etape = nom;
  if (!DIAG || typeof document === 'undefined') return;
  const t = document.getElementById('boot-text');
  if (t) t.textContent = `Chargement du monde… (WebGPU : ${nom})`;
}

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
  if (ESSAI === 'gel') return new Promise(() => {});            // le chien de garde d'index.html doit le voir
  if (ESSAI === 'echec') return replier('échec forcé (?webgpu=echec)');
  try {
    const r = await borne(initialiser(canvas, options), DELAI_INIT_MS, `WebGPU ne s'est pas initialisé`);
    // Et la première image : un rendu créé qui ne dessine jamais est un canvas
    // noir pour toujours (v251 : « un canvas qui dessine n'est pas un canvas qui
    // présente », ici l'inverse). Un onglet caché ne rend pas : on ne juge que
    // visible.
    if (etat.renderers === 1 && typeof setTimeout === 'function') {
      const garde = () => {
        if (etat.images > 0) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') { setTimeout(garde, DELAI_IMAGE_MS); return; }
        replier(`aucune image rendue ${Math.round(DELAI_IMAGE_MS / 1000)} s après l'initialisation (étape ${etat.etape})`);
      };
      setTimeout(garde, DELAI_IMAGE_MS);
    }
    return r;
  } catch (e) {
    return replier(e);
  }
}

async function initialiser(canvas, options) {
  etape('module three/tsl');
  if (!tsl) tsl = await import('three/tsl');
  // `?dos=webgl` force le dos WebGL2 du MÊME rendu r187 (les mêmes matériaux
  // en nœuds, la même chauffe) : c'est ce que verra une tablette sans WebGPU,
  // et c'est le bras que le banc compare au WebGPU réel.
  const forceWebGL = /[?&]dos=webgl(&|$)/.test(location.search);
  etape('adaptateur');
  const a = forceWebGL ? null : await adaptateur();
  let device = null;
  if (a) { etape('appareil'); try { device = await a.requestDevice(); } catch (e) { etat.erreur = String(e && e.message || e); } }
  // Sans adaptateur, three retombe de lui-même sur son dos WebGL2 : le jeu
  // tourne, et `etat.dos` le dit — on ne mesure jamais WebGL en croyant
  // mesurer WebGPU.
  etape(a && device ? 'init (dos WebGPU)' : 'init (dos WebGL2)');
  const r = new THREE.WebGPURenderer({ canvas, ...options, forceWebGL, ...(device ? { device } : {}) });
  await r.init();
  etat.dos = r.backend && r.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
  etat.nom = 'webgpu';
  etat.renderers++;
  etape('prêt');
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
  // ET UNE COMPILATION ASYNCHRONE QUI ÉCHOUE LAISSE LE RENDU DANS SA CIBLE
  // D'ÉCRAN HORS CANVAS. `compileAsync` pose sur le rendu, le temps de son
  // travail, l'état de précompilation (`_beginPreCompile` : la cible devient le
  // tampon d'image interne, `_callDepth` monte) et le retire à la fin
  // (`_finishPreCompile`). Si elle jette entre les deux — une géométrie d'essai
  // déjà disposée, un matériau refusé —, rien ne le retire : toute image
  // suivante se rend dans le tampon interne et le canvas garde sa dernière image.
  // Mesuré au banc : canvas figé dès « Jouer », 700 dessins par image, zéro
  // erreur (la cible `Mr 640x360` posée par `_finishPreCompile`, sonde
  // `cible-webgpu.cjs`). Les compilations se font donc une à la fois, et l'état
  // se retire après chacune, qu'elle ait abouti ou non.
  let fileCompile = Promise.resolve();
  const retirerEtat = () => { try { if (r._precompilationState) r._finishPreCompile(); } catch { /* rien à retirer */ } };
  Object.defineProperty(r, 'compile', { configurable: true, value: (scene, camera, cible) => {
    fileCompile = fileCompile.then(() => r.compileAsync(scene, camera, cible)).catch((e) => { etat.compileEchecs = (etat.compileEchecs || 0) + 1; etat.compileErreur = String(e && e.message || e).slice(0, 160); }).then(retirerEtat);
  } });
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
  // Et la remise à zéro se fait UNE fois par image, au premier rendu : le jeu
  // rend plusieurs fois par image (la scène, une face des reflets, la minicarte
  // en coin), et remettre à zéro à chaque rendu laissait le dernier — souvent
  // vide — dans `?diag=1` (« 0 appels »). Les compteurs sont ceux de l'image
  // entière, comme ceux que le journal de bord relève.
  // ET LA BOUCLE INTERNE DE THREE LES REMET À ZÉRO À CHAQUE TICK : le premier
  // `render()` démarre `_animation`, dont le rAF fait `info.reset()` quand
  // `info.autoReset` est vrai — entre notre rendu et la lecture du diagnostic
  // de l'image suivante (« 0 appels · 0k tri » sur la tablette, mesuré). On
  // garde la main sur la remise à zéro.
  r.info.autoReset = false;
  const rendre = r.render.bind(r);
  let imageNeuve = true;
  const tic = () => { imageNeuve = true; requestAnimationFrame(tic); };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tic);
  // `writable` : une sonde enveloppe `renderer.render` pour le chronométrer.
  // Et pendant une compilation en vol (elle attend entre deux objets), l'image
  // du jeu se rend hors de l'état de précompilation, comme three le fait
  // lui-même à chaque pause de sa boucle : sinon cette image part dans le
  // tampon interne et le canvas saute une image.
  Object.defineProperty(r, 'render', { configurable: true, writable: true, value: (scene, camera) => {
    if (imageNeuve) { r.info.reset(); imageNeuve = false; etat.images = (etat.images || 0) + 1; }
    const enVol = r._precompilationState;
    if (enVol) r._finishPreCompile();
    try { return rendre(scene, camera); } finally { if (enVol) r._beginPreCompile(enVol); }
  } });
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
  if (!RENDU_WEBGPU) {
    const repli = repliWebGPU();
    return `rendu webgl (three ${THREE.REVISION})${repli ? ` · repli : WebGPU n'a pas démarré — ${repli.raison}` : ''}`;
  }
  const n = renderer && renderer.info && renderer.info.programs ? renderer.info.programs.length : '?';
  return `rendu webgpu (three ${THREE.REVISION}) · dos ${etat.dos || '?'} · ${etat.adaptateur || 'adaptateur inconnu'}${etat.logiciel ? ' · LOGICIEL' : ''} · ${n} pipelines${etat.erreur ? ` · ${etat.erreur}` : ''}`;
}
