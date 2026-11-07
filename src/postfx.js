// LE POST-TRAITEMENT (chantier « lumière », v591) — l'image se compose en HDR,
// puis se développe : exposition et balance selon l'heure, bloom des surfaces
// qui émettent, perspective aérienne lue dans la profondeur, correspondance
// tonale ACES en dernier.
//
// Pourquoi un module à part. La boucle de rendu de `main.js` dessinait droit
// sur l'écran : chaque matériau faisait sa propre correspondance tonale et
// rien ne pouvait regarder l'image entière. Ici le monde se dessine dans une
// cible à virgule flottante (seize bits par canal, linéaire, SANS
// correspondance tonale : three ne l'applique qu'à l'écran), et quelques passes
// plein écran la développent. Le chantier WebGPU doit pouvoir reprendre ce
// module tel quel : il ne connaît que `renderer`, `scene`, `camera` et un petit
// état de lumière par image — rien du reste du jeu.
//
// Trois règles, et toutes tiennent au prix.
//
// 1. LE PALIER BAS NE PAIE RIEN. Sans post-traitement (`niveau` 0, le rendu
//    logiciel du banc, `?postfx=0`), `rendre` appelle `renderer.render` tel
//    quel : même cible, mêmes programmes que la v585 ; seul le dôme du ciel
//    (sky.js) diffuse à tout palier, un dessin, rien à payer.
//    Rien ici n'est jamais créé tant que `actif` est faux.
// 2. AUCUN PROGRAMME NE NAÎT EN JEU. Rendre vers une cible change la CLÉ de
//    tout programme de la scène (plus de correspondance tonale ni de conversion
//    sRGB dedans) : la chauffe de l'accueil doit donc compiler avec la cible
//    posée (`avecCible`, main.js), et les quatre programmes d'ici se compilent
//    à la chauffe (`chauffer`). Un témoin lit les clés après la nuit tombée.
// 3. LE COÛT SE MESURE SUR L'APPAREIL, PAS AU BANC. Le banc rend en logiciel,
//    où le post-traitement est coupé ; ce qu'il mesure ne se transpose pas.
//    `cout()` publie ce qui se transpose — la taille de la cible, le nombre de
//    passes, les millisecondes de SOUMISSION — et `?diag=1` l'affiche pour que
//    Max relève sur son iPhone ce que le banc ne peut pas voir.
import * as THREE from 'three';

// ── LES NIVEAUX ──────────────────────────────────────────────────────────────
// 0 rien ; 1 étalonnage + bloom à trois étages + lueur du soleil dans la brume ;
// 2 bloom à cinq étages + brume de hauteur. Les deux niveaux ne diffèrent que
// par ce qui coûte du REMPLISSAGE : un étage de bloom de plus est un quart de
// l'étage d'avant, la brume de hauteur une exponentielle par pixel.
export const NIVEAUX = {
  0: null,
  1: { bloom: 3, brume: false },
  2: { bloom: 5, brume: true },
};
export const MSAA_PAR_DEFAUT = 4;

const SOMMET = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Le préfiltre du bloom : ce qui dépasse le seuil, avec un genou doux, en
// quatre échantillons bilinéaires (la cible fait la MOITIÉ de l'écran).
const PREFILTRE = `
uniform sampler2D tex; uniform vec2 texel; uniform float seuil; uniform float genou;
varying vec2 vUv;
void main() {
  vec3 c = 0.25 * (texture2D(tex, vUv + texel * vec2(-0.5, -0.5)).rgb + texture2D(tex, vUv + texel * vec2(0.5, -0.5)).rgb
                 + texture2D(tex, vUv + texel * vec2(-0.5, 0.5)).rgb + texture2D(tex, vUv + texel * vec2(0.5, 0.5)).rgb);
  float l = max(c.r, max(c.g, c.b));
  float s = clamp(l - seuil + genou, 0.0, 2.0 * genou);
  s = s * s / (4.0 * genou + 1e-4);
  float f = max(s, l - seuil) / max(l, 1e-4);
  vec3 b = c * f;
  // UNE SOURCE TRÈS AU-DESSUS DU BLANC NE DOIT PAS NOYER L'IMAGE : les phares
  // et le pinceau des voitures sont additifs et valent plusieurs fois 1 ; sans
  // borne, leur lueur fait une tache blanche de la taille d'une voiture (vu en
  // capture à Paris et à Manhattan). L'excédent se compresse (Reinhard) : une
  // source quatre fois plus forte brille à peine plus fort, elle ne grandit pas.
  float m = max(b.r, max(b.g, b.b));
  b *= 1.0 / (1.0 + 0.6 * m);
  gl_FragColor = vec4(b, 1.0);
}`;

// Un étage vers le bas : quatre échantillons bilinéaires au coin des texels,
// c'est un filtre à treize points pour le prix de quatre.
const DESCENTE = `
uniform sampler2D tex; uniform vec2 texel;
varying vec2 vUv;
void main() {
  vec3 c = 0.25 * (texture2D(tex, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, -1.0)).rgb
                 + texture2D(tex, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, 1.0)).rgb);
  gl_FragColor = vec4(c, 1.0);
}`;

// Un étage vers le haut : une tente 3 × 3 de l'étage inférieur, ajoutée à
// l'étage courant (progressif : chaque étage porte déjà la somme des plus flous).
const MONTEE = `
uniform sampler2D tex; uniform sampler2D courant; uniform vec2 texel;
varying vec2 vUv;
void main() {
  vec3 a = texture2D(tex, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, -1.0)).rgb
         + texture2D(tex, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, 1.0)).rgb;
  vec3 b = texture2D(tex, vUv + texel * vec2(0.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(0.0, 1.0)).rgb
         + texture2D(tex, vUv + texel * vec2(-1.0, 0.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, 0.0)).rgb;
  vec3 c = texture2D(tex, vUv).rgb;
  gl_FragColor = vec4((a + 2.0 * b + 4.0 * c) / 16.0 + texture2D(courant, vUv).rgb, 1.0);
}`;

// Le développement : perspective aérienne par la profondeur, bloom,
// exposition, balance des blancs, saturation, ACES, vignette, sRGB.
const COMPOSITION = `
uniform sampler2D scene; uniform sampler2D bloom; uniform sampler2D profondeur;
uniform float exposition; uniform float bloomForce; uniform float saturation; uniform float vignette;
uniform vec3 balance;
uniform mat4 invProjection; uniform mat3 rotationCamera;
uniform float pres; uniform float loin; uniform float brouillardPres; uniform float brouillardLoin;
uniform vec3 soleil; uniform vec3 couleurLueur; uniform float lueur;
uniform vec3 couleurBrume; uniform float brumeDensite; uniform float brumeHauteur; uniform float brumeSol; uniform float cameraY;
uniform float avecBrume;
varying vec2 vUv;

vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
// la correspondance tonale de three (ACES filmique), telle quelle : c'est elle
// que le jeu portait déjà dans chaque matériau, elle passe en fin de chaîne
vec3 aces(vec3 c) {
  const mat3 entree = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 sortie = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  c = entree * (c / 0.6);
  c = RRTAndODTFit(c);
  return clamp(sortie * c, 0.0, 1.0);
}

void main() {
  vec3 c = texture2D(scene, vUv).rgb;
  float d = texture2D(profondeur, vUv).x;
  // la profondeur du tampon en distance de vue : le ciel (rien d'écrit) reste à l'infini
  float zn = d * 2.0 - 1.0;
  vec4 p = invProjection * vec4(vUv * 2.0 - 1.0, zn, 1.0);
  vec3 vue = p.xyz / p.w;
  float dist = length(vue);
  vec3 dir = normalize(rotationCamera * vue);
  bool ciel = d >= 0.99999;
  if (!ciel) {
    // la part de brouillard de three (linéaire, mêmes bornes que scene.fog) :
    // là où le monde fond déjà dans le ciel, la lueur du soleil le réchauffe
    float f = clamp((dist - brouillardPres) / max(brouillardLoin - brouillardPres, 1.0), 0.0, 1.0);
    float g = pow(max(dot(dir, soleil), 0.0), 12.0);
    c += couleurLueur * (g * f * lueur);
    if (avecBrume > 0.5) {
      // la brume au ras du sol : densité qui décroît avec la hauteur, intégrée
      // le long du rayon (forme fermée, le cas plat à part)
      float y0 = cameraY - brumeSol, y1 = cameraY + dir.y * dist - brumeSol;
      float dy = y1 - y0;
      float colonne = abs(dy) > 0.01
        ? (exp(-y0 / brumeHauteur) - exp(-y1 / brumeHauteur)) * brumeHauteur / dy
        : exp(-y0 / brumeHauteur);
      float brume = 1.0 - exp(-brumeDensite * dist * max(colonne, 0.0));
      c = mix(c, couleurBrume, clamp(brume, 0.0, 1.0) * (1.0 - f));
    }
  }
  c += texture2D(bloom, vUv).rgb * bloomForce;
  c *= exposition * balance;
  c = aces(c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, saturation);
  vec2 q = vUv - 0.5;
  c *= 1.0 - vignette * smoothstep(0.35, 0.95, length(q) * 1.4142);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

// ── LA FABRIQUE ──────────────────────────────────────────────────────────────
//
// `niveau`  : 0, 1 ou 2 (voir NIVEAUX) ; `msaa` : échantillons de la cible.
// Le module rend `actif` faux — et ne crée RIEN — si le niveau est nul ou si la
// carte ne sait pas rendre en virgule flottante (il le dit dans `raison`).
export function creerPostFx({ renderer, niveau = 0, msaa = MSAA_PAR_DEFAUT } = {}) {
  const reglage = NIVEAUX[niveau] || null;
  const inerte = (raison) => ({
    actif: false, niveau: 0, raison,
    rendre: (scene, camera) => renderer.render(scene, camera),
    cibleDuRendu: () => null, avecCible: (fn) => fn(), chauffer: () => 0,
    regler: () => {}, cout: () => ({ actif: false, raison }), liberer: () => {},
  });
  if (!reglage) return inerte('niveau 0');
  const gl = renderer.getContext();
  const webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  if (!webgl2) return inerte('WebGL 1 : pas de cible flottante');
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return inerte('aucune cible flottante');
  const echantillons = Math.max(0, Math.min(msaa, gl.getParameter(gl.MAX_SAMPLES) || 0));

  // la cible HDR, à la taille du tampon de dessin (relue à chaque image : Manhattan
  // change la résolution, la fenêtre tourne)
  const taille = new THREE.Vector2();
  const faireCible = (l, h) => {
    const profondeur = new THREE.DepthTexture(l, h, THREE.UnsignedIntType);
    profondeur.format = THREE.DepthFormat;
    const t = new THREE.WebGLRenderTarget(l, h, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false,
      depthBuffer: true, stencilBuffer: false, samples: echantillons, depthTexture: profondeur,
    });
    return t;
  };
  let cible = null;
  // les étages du bloom : la moitié de l'écran, puis chaque fois la moitié
  const etages = [];
  const faireEtages = (l, h) => {
    for (const e of etages) e.dispose();
    etages.length = 0;
    let w = Math.max(1, l >> 1), hh = Math.max(1, h >> 1);
    for (let i = 0; i < reglage.bloom; i++) {
      etages.push(new THREE.WebGLRenderTarget(w, hh, {
        type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace,
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false, stencilBuffer: false,
      }));
      w = Math.max(1, w >> 1); hh = Math.max(1, hh >> 1);
    }
  };
  const dimensionner = () => {
    renderer.getDrawingBufferSize(taille);
    const l = Math.max(1, Math.round(taille.x)), h = Math.max(1, Math.round(taille.y));
    if (cible && cible.width === l && cible.height === h) return false;
    if (cible) { cible.depthTexture.dispose(); cible.dispose(); }
    cible = faireCible(l, h);
    faireEtages(l, h);
    return true;
  };

  // une passe plein écran : un quad, une caméra qui ne regarde rien
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  quad.frustumCulled = false;
  const sceneFx = new THREE.Scene();
  sceneFx.add(quad);
  const cameraFx = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const passe = (mat, cibleDe) => {
    quad.material = mat;
    renderer.setRenderTarget(cibleDe);
    renderer.render(sceneFx, cameraFx);
  };
  const materiau = (fragment, uniforms) => new THREE.ShaderMaterial({
    vertexShader: SOMMET, fragmentShader: fragment, uniforms, depthTest: false, depthWrite: false, toneMapped: false,
  });
  const u = {
    prefiltre: { tex: { value: null }, texel: { value: new THREE.Vector2() }, seuil: { value: 1.5 }, genou: { value: 0.4 } },
    descente: { tex: { value: null }, texel: { value: new THREE.Vector2() } },
    montee: { tex: { value: null }, courant: { value: null }, texel: { value: new THREE.Vector2() } },
    composition: {
      scene: { value: null }, bloom: { value: null }, profondeur: { value: null },
      exposition: { value: 1 }, bloomForce: { value: 0.4 }, saturation: { value: 1.05 }, vignette: { value: 0.12 },
      balance: { value: new THREE.Vector3(1, 1, 1) },
      invProjection: { value: new THREE.Matrix4() }, rotationCamera: { value: new THREE.Matrix3() },
      pres: { value: 0.1 }, loin: { value: 900 }, brouillardPres: { value: 100 }, brouillardLoin: { value: 400 },
      soleil: { value: new THREE.Vector3(0, 1, 0) }, couleurLueur: { value: new THREE.Color(1, 0.6, 0.3) }, lueur: { value: 0 },
      couleurBrume: { value: new THREE.Color(0.8, 0.85, 0.9) }, brumeDensite: { value: 0 }, brumeHauteur: { value: 12 },
      brumeSol: { value: 0 }, cameraY: { value: 0 }, avecBrume: { value: reglage.brume ? 1 : 0 },
    },
  };
  const mats = {
    prefiltre: materiau(PREFILTRE, u.prefiltre),
    descente: materiau(DESCENTE, u.descente),
    montee: materiau(MONTEE, u.montee),
    composition: materiau(COMPOSITION, u.composition),
  };

  // ── L'ÉTALONNAGE SELON L'HEURE ─────────────────────────────────────────────
  // `etat` : { jour (0-1, daylight), nuit (0-1, nuitDehors), rasant (0-1, le
  // soleil au ras de l'horizon), soleil (direction, le jour), pluie (0-1),
  // brouillardPres, brouillardLoin, solY (le sol sous l'enfant), manhattan }.
  // Les chiffres sont des réglages de capture : voir CLAUDE.md, « La lumière ».
  const forces = { exposition: 1, bloom: 1, lueur: 1, brume: 1, vignette: 1, saturation: 1 };
  const balance = new THREE.Color();
  const CHAUD = new THREE.Color(1.06, 0.98, 0.9);     // l'heure dorée
  const FROID = new THREE.Color(0.9, 0.96, 1.1);      // la nuit
  const NEUTRE = new THREE.Color(1, 1, 1);
  const couleurLueur = new THREE.Color();
  const couleurBrume = new THREE.Color();
  function etalonner(etat, camera) {
    const jour = etat.jour ?? 1, nuit = etat.nuit ?? 0, rasant = etat.rasant ?? 0, pluie = etat.pluie ?? 0;
    const c = u.composition;
    // l'exposition : un peu plus à la nuit tombée, pour que la ville éclairée
    // se lise sans délaver le jour ; la pluie assombrit
    // ... multipliée par l'exposition du jeu (`renderer.toneMappingExposure`,
    // 1,05) : les matériaux ne l'appliquent plus puisqu'ils rendent vers la
    // cible, c'est le développement qui la porte — la v585 au même niveau.
    c.exposition.value = (etat.exposition ?? 1) * (1 + 0.35 * nuit + 0.08 * rasant) * (1 - 0.1 * pluie) * forces.exposition;
    balance.copy(NEUTRE).lerp(CHAUD, rasant * 0.8).lerp(FROID, nuit * 0.7);
    c.balance.value.set(balance.r, balance.g, balance.b);
    c.saturation.value = (1.06 - 0.12 * nuit - 0.08 * pluie) * forces.saturation;
    c.vignette.value = (0.1 + 0.08 * nuit) * forces.vignette;
    // le bloom : le jour, seul ce qui éblouit vraiment (le soleil, la neige au
    // soleil) ; la nuit, les vitres, les lanternes, les feux et les phares
    // LE SEUIL NE DESCEND JAMAIS SOUS LE BLANC : la nuit, un mouton éclairé par
    // la lune vaut 0,6 et brillait (vu en capture) ; ce qui émet — vitres
    // ×2,1, lanternes ×2,2, phares additifs — est au-dessus de 1, et c'est
    // cela seul qui déborde. Le jour, seuls le soleil et ses reflets passent.
    u.prefiltre.seuil.value = 1.6 - 0.6 * nuit;
    u.prefiltre.genou.value = 0.4 - 0.1 * nuit;
    c.bloomForce.value = (0.3 + 0.25 * nuit) * forces.bloom;
    // la lueur du soleil dans la brume de distance : forte au ras de l'horizon
    couleurLueur.setRGB(1, 0.55 + 0.25 * (1 - rasant), 0.25 + 0.4 * (1 - rasant));
    c.couleurLueur.value.copy(couleurLueur);
    c.lueur.value = (etat.soleilHaut ? (0.25 * jour + 0.9 * rasant) : 0) * (1 - pluie * 0.6) * forces.lueur;
    if (etat.soleil) c.soleil.value.copy(etat.soleil);
    // la brume de hauteur : du matin et du soir, presque rien à midi, davantage sous la pluie
    couleurBrume.copy(etat.couleurCiel || NEUTRE).lerp(NEUTRE, 0.25);
    c.couleurBrume.value.copy(couleurBrume);
    c.brumeDensite.value = (0.0009 + 0.004 * rasant + 0.002 * pluie + 0.0015 * nuit) * forces.brume;
    c.brumeHauteur.value = 14;
    c.brumeSol.value = etat.solY ?? (camera.position.y - 2);
    c.cameraY.value = camera.position.y;
    c.brouillardPres.value = etat.brouillardPres ?? 100;
    c.brouillardLoin.value = etat.brouillardLoin ?? 400;
    c.pres.value = camera.near;
    c.loin.value = camera.far;
  }

  const cout = { ms: 0, passes: 0 };
  // `opts.sansScene` (les témoins) : on ne redessine pas le monde, on
  // redéveloppe ce que la cible tient déjà — deux développements de la MÊME
  // image, pour comparer un réglage sans qu'une voiture ait bougé entre les deux.
  function rendre(scene, camera, etat = {}, opts = {}) {
    const t0 = performance.now();
    dimensionner();
    etalonner(etat, camera);
    const c = u.composition;
    c.invProjection.value.copy(camera.projectionMatrixInverse);
    c.rotationCamera.value.setFromMatrix4(camera.matrixWorld);
    // 1. le monde, en HDR linéaire
    renderer.setRenderTarget(cible);
    if (!opts.sansScene) renderer.render(scene, camera);
    // 2. le bloom : préfiltre vers l'étage 0, descente, puis montée progressive
    const sortie = renderer.autoClear;
    renderer.autoClear = true;
    u.prefiltre.tex.value = cible.texture;
    u.prefiltre.texel.value.set(1 / cible.width, 1 / cible.height);
    passe(mats.prefiltre, etages[0]);
    for (let i = 1; i < etages.length; i++) {
      u.descente.tex.value = etages[i - 1].texture;
      u.descente.texel.value.set(1 / etages[i - 1].width, 1 / etages[i - 1].height);
      passe(mats.descente, etages[i]);
    }
    for (let i = etages.length - 2; i >= 0; i--) {
      // l'étage i reçoit la tente de i + 1 ajoutée à lui-même : on écrit dans
      // l'étage « miroir » pour ne pas lire et écrire la même texture
      u.montee.tex.value = etages[i + 1].texture;
      u.montee.courant.value = etages[i].texture;
      u.montee.texel.value.set(1 / etages[i + 1].width, 1 / etages[i + 1].height);
      passe(mats.montee, miroir(i));
      echanger(i);
    }
    // 3. le développement, vers l'écran
    c.scene.value = cible.texture;
    c.bloom.value = etages.length ? etages[0].texture : null;
    c.profondeur.value = cible.depthTexture;
    passe(mats.composition, null);
    renderer.autoClear = sortie;
    // 4. la cible reste posée : ce qui compile entre deux images (un modèle de
    // la flotte qui arrive) compile pour elle, puisque c'est dans elle que la
    // prochaine image se dessine
    renderer.setRenderTarget(cible);
    cout.ms = performance.now() - t0;
    cout.passes = 2 + 2 * etages.length;
  }
  // les étages miroirs de la montée (mêmes tailles), créés avec les étages
  const miroirs = new Map();
  const miroir = (i) => {
    const e = etages[i];
    let m = miroirs.get(i);
    if (!m || m.width !== e.width || m.height !== e.height) {
      if (m) m.dispose();
      m = new THREE.WebGLRenderTarget(e.width, e.height, {
        type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace,
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false, stencilBuffer: false,
      });
      miroirs.set(i, m);
    }
    return m;
  };
  const echanger = (i) => { const m = miroirs.get(i); miroirs.set(i, etages[i]); etages[i] = m; };

  // Compile les quatre programmes d'ici, et rend la cible existante : à appeler
  // pendant l'accueil, avant qu'une image ne les demande. Rend le nombre de
  // programmes compilés.
  function chauffer() {
    dimensionner();
    const avant = renderer.getRenderTarget();
    try {
      // les étages du bloom se dessinent dans une cible (sortie linéaire, pas
      // de correspondance tonale dans la clé), la composition sur l'écran
      // (sortie sRGB) : chacun se compile là où il se dessinera
      for (const [nom, m] of Object.entries(mats)) {
        renderer.setRenderTarget(nom === 'composition' ? null : cible);
        quad.material = m; renderer.compile(sceneFx, cameraFx);
      }
    } finally { renderer.setRenderTarget(avant); }
    return Object.keys(mats).length;
  }
  // Exécute `fn` avec la cible HDR posée : tout `renderer.compile` fait dedans
  // compile les programmes TELS QUE le jeu les dessinera (vers la cible, sans
  // correspondance tonale), ce que la chauffe de l'accueil demande.
  function avecCible(fn) {
    dimensionner();
    const avant = renderer.getRenderTarget();
    renderer.setRenderTarget(cible);
    try { return fn(); } finally { renderer.setRenderTarget(avant); }
  }
  // `?bloom=0`, `?expo=1.2`… et les témoins : un facteur par poste (1 = la règle)
  function regler(f = {}) { Object.assign(forces, f); }

  return {
    actif: true, niveau, raison: null, msaa: echantillons, reglage,
    rendre, chauffer, avecCible, regler,
    cibleDuRendu: () => { dimensionner(); return cible; },
    cout: () => ({ actif: true, niveau, msaa: echantillons, cible: cible ? `${cible.width}×${cible.height}` : null,
      etages: etages.length, passes: cout.passes, ms: Math.round(cout.ms * 10) / 10, forces: { ...forces } }),
    liberer: () => { if (cible) { cible.depthTexture.dispose(); cible.dispose(); } for (const e of etages) e.dispose(); for (const m of miroirs.values()) m.dispose(); for (const m of Object.values(mats)) m.dispose(); quad.geometry.dispose(); },
  };
}

// ── CE QUI SE LIT DANS L'ADRESSE ─────────────────────────────────────────────
// `?postfx=0|1|2` force le niveau (`0` coupe), `?msaa=0|4` les échantillons,
// `?bloom=`, `?expo=`, `?lueur=`, `?brume=` des facteurs. Sans rien : le niveau
// du palier, et zéro en rendu logiciel — la règle des ombres (v247).
export function niveauDemande(params, { palier = 0, logiciel = false } = {}) {
  const v = params.get('postfx');
  if (v != null) return Math.max(0, Math.min(2, Number(v) || 0));
  if (logiciel) return 0;
  return Math.max(0, Math.min(2, Number(palier) || 0));
}
export function forcesDemandees(params) {
  const f = {};
  for (const [cle, poste] of [['bloom', 'bloom'], ['expo', 'exposition'], ['lueur', 'lueur'], ['brume', 'brume'], ['vignette', 'vignette']]) {
    const v = params.get(cle);
    if (v != null && !Number.isNaN(Number(v))) f[poste] = Number(v);
  }
  return f;
}
