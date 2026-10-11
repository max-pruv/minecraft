// Ce qui roule tout seul : les rames du métro aérien et les voitures du
// circuit.
//
// Le principe est le même pour les deux — un tracé fermé, une position le long
// de ce tracé qui avance à chaque image, et un maillage qu'on repose dessus en
// l'orientant dans le sens de la marche. C'est ce qui permet d'avoir un train
// qui tourne réellement, wagons compris, sans rien simuler de compliqué.
//
// Comme partout ailleurs, rien ne tourne quand l'enfant est loin : un convoi
// hors de vue ne coûte ni animation, ni appel de rendu.

import * as THREE from 'three';
import { COUCHE_CARROSSERIE, voirLeDecor } from './couches.js';
import { SIGNATURES_GLB, SIGNATURES_JEU, EST_PEINTURE } from './signatures.js';
import { construireTaxi } from './taxis.js';
import { Atelier } from './modeles.js';
import { liberer } from './liberer.js';
import { profilVitesse, grilleDuProfil, rapprocher, allureDevant, passeAOrange, FREIN, FREIN_URGENCE, ALLURE_VOIE, allureDuConducteur } from './circulation.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { CLASSES, MARCHE } from './conduite.js';

// --- les reflets --------------------------------------------------------------
//
// La carrosserie REFLÈTE le monde : une caméra cubique rend la scène autour
// de la voiture la plus proche (128 px, quelques fois par seconde, voir
// main.js) et sa texture sert d'horizon aux matériaux. C'est ce qui sépare
// la laque de l'argile. L'essai précédent — un « ciel en boîte » peint à la
// main dans des canvases — cassait l'échantillonnage et blanchissait toute
// la voiture ; une cible de rendu GPU, elle, est valide par construction.
let refletsRT = null;
let refletsCamera = null;
// LA CARROSSERIE VIT SUR SA PROPRE COUCHE (v245). Un matériau ne peut pas lire
// la texture cubique pendant qu'on l'écrit — WebGL signale une boucle de
// rétroaction — et l'ancien code parcourait TOUTE la scène à chaque capture
// pour cacher les maillages qui la lisent, puis les rendre. Cinq mille objets
// deux fois par seconde. Une couche règle cela sans un parcours : la caméra
// de l'enfant (main.js) voit la couche 2, les six caméras de la sonde ne
// voient que la couche 0, et une carrosserie n'est jamais dans sa propre
// réflexion. `Object3D.clone()` recopie la couche : une voiture de la flotte
// clonée cinquante fois la garde.
export { COUCHE_CARROSSERIE };
function refleter(o, m, intensite) {
  m.envMap = refletsRT.texture;
  m.envMapIntensity = intensite;
  o.layers.set(COUCHE_CARROSSERIE);
}
export function refletsVoiture() {
  if (!refletsRT && typeof document !== 'undefined') {
    refletsRT = new THREE.WebGLCubeRenderTarget(128, {
      generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter,
    });
    refletsCamera = new THREE.CubeCamera(0.5, 120, refletsRT);
    // ses six caméras partagent cet objet de couches : le décor, rien d'autre
    voirLeDecor(refletsCamera);
  }
  return refletsRT;
}
// UNE FACE PAR IMAGE, JAMAIS SIX (v245). Max, sur l'iPad de quatre ans : « la
// voiture avance de manière hyper saccadée ». Mesuré au banc, assis dans une
// voiture à l'arrêt : une image sur quatre durait TROIS fois la médiane, par
// paires à une demi-seconde d'écart — la cadence exacte de cette sonde, qui
// rendait ses six faces dans la même image. Chaque face soumet au pilote
// tous les appels de dessin de la scène ; six faces d'un coup, c'est six
// images de travail processeur dans une seule, et sur une tablette limitée
// par ses appels de dessin, c'est un à-coup toutes les demi-secondes. La
// capture s'étale désormais : `lancerReflets` note où regarder, et
// `avancerReflets`, appelée à chaque image, rend UNE face. La réflexion est
// complète six images plus tard, ce qu'aucun œil ne voit sur un pare-brise.
let faceEnCours = -1;
const positionSonde = new THREE.Vector3();
export function lancerReflets(pos) {
  if (!refletsRT || faceEnCours >= 0) return false;
  positionSonde.set(pos.x, pos.y + 1.1, pos.z);
  faceEnCours = 0;
  return true;
}
export function refletsEnCours() { return faceEnCours >= 0; }
export function avancerReflets(renderer, scene) {
  if (faceEnCours < 0) return false;
  const cam = refletsCamera;
  cam.position.copy(positionSonde);
  cam.updateMatrixWorld();
  if (cam.coordinateSystem !== renderer.coordinateSystem) {
    cam.coordinateSystem = renderer.coordinateSystem;
    cam.updateCoordinateSystem();
  }
  const face = cam.children[faceEnCours];
  const cible = renderer.getRenderTarget();
  const xr = renderer.xr.enabled;
  renderer.xr.enabled = false;
  // les mipmaps se calculent une fois la sixième face écrite, pas six fois
  const mipmaps = refletsRT.texture.generateMipmaps;
  refletsRT.texture.generateMipmaps = faceEnCours === 5 && mipmaps;
  try {
    renderer.setRenderTarget(refletsRT, faceEnCours);
    renderer.render(scene, face);
  } finally {
    refletsRT.texture.generateMipmaps = mipmaps;
    renderer.setRenderTarget(cible);
    renderer.xr.enabled = xr;
  }
  faceEnCours = faceEnCours === 5 ? -1 : faceEnCours + 1;
  return true;
}
// L'ancienne entrée, gardée pour ce qui la lit encore : une capture complète
// dans la même image. Le jeu ne l'appelle plus.
export function majRefletsVoiture(renderer, scene, pos) {
  if (!refletsRT) return;
  lancerReflets(pos);
  while (faceEnCours >= 0) avancerReflets(renderer, scene);
}

// LES PROGRAMMES DE LA FLOTTE ET DES HUMAINS SE COMPILENT À L'ACCUEIL (v246).
// Max : « le lag est bien présent quand on fait une téléportation, à peu près
// dix secondes ». Profil de l'arrivée à Paris : 1,5 s dans getProgramInfoLog
// et getShaderInfoLog, seize programmes avant, trente-six après — chaque
// modèle de voiture rencontré pour la première fois apporte ses matériaux,
// chaque signature son programme, compilé DANS l'image où la voiture
// apparaît ; les corps humains font pareil dès que le premier passant les
// reçoit. Sur une tablette, un programme se compile en dizaines de
// millisecondes ; vingt d'un coup, c'est l'écran qui se fige.
//
// Les signatures viennent de `signatures.js`, LUES dans les fichiers — pas
// devinées : mon premier jet en écrivait treize à la main, d'après les
// matériaux, et il en manquait la moitié, parce qu'une signature est aussi
// faite de la géométrie (ombrage plat, couleurs de sommets, squelette). Le
// banc vérifie que la table et les fichiers disent la même chose. On compile
// UNE signature par image pendant que l'enfant lit l'accueil, avec des
// matériaux témoins qui restent EN VIE — three.js détruit un programme dont
// plus aucun matériau ne se sert.
//
// ET LES HUMAINS ONT DEUX PROGRAMMES PAR SIGNATURE : `presence.js` les fait
// apparaître en fondu, donc passe leurs matériaux en `transparent` — un
// programme à part (`opaque` fait partie de la clé). On chauffe les deux.
const temoinsProgrammes = [];
export function signaturesAChauffer() {
  const out = [];
  for (const sig of SIGNATURES_GLB) {
    out.push(sig);
    if (sig.includes('+skin') && !sig.includes('+alpha')) out.push(sig + '+alpha');
  }
  return out.concat(SIGNATURES_JEU);
}
export function materielDeSignature(sig, rt, uni, normale) {
  const f = new Set(sig.split('+'));
  const params = {};
  if (f.has('map')) params.map = uni;
  if (f.has('nrm')) params.normalMap = normale;
  if (f.has('mr')) { params.metalnessMap = uni; params.roughnessMap = uni; }
  if (f.has('ao')) params.aoMap = uni;
  if (f.has('emap')) params.emissiveMap = uni;
  if (f.has('cc')) params.clearcoat = 1;
  if (f.has('ccmap')) params.clearcoatMap = uni;
  if (f.has('ccrough')) params.clearcoatRoughnessMap = uni;
  if (f.has('ccnrm')) params.clearcoatNormalMap = normale;
  if (f.has('trans')) params.transmission = 0.5;
  if (f.has('sheen')) params.sheen = 1;
  if (f.has('specmap')) params.specularColorMap = uni;
  if (f.has('atest')) params.alphaTest = 0.5;
  if (f.has('alpha')) { params.transparent = true; params.opacity = 0.5; }
  if (f.has('DS')) params.side = THREE.DoubleSide;
  if (f.has('vc') || f.has('vc4')) params.vertexColors = true;
  if (f.has('flat')) params.flatShading = true;
  if (f.has('env') && rt) params.envMap = rt.texture;
  const mat = f.has('Basic') ? new THREE.MeshBasicMaterial(params)
    : f.has('Lambert') ? new THREE.MeshLambertMaterial(params)
      : f.has('Physical') ? new THREE.MeshPhysicalMaterial(params)
        : new THREE.MeshStandardMaterial(params);
  const geo = new THREE.BoxGeometry(0.01, 0.01, 0.01);
  const n = geo.attributes.position.count;
  if (f.has('vc') || f.has('vc4')) {
    const k = f.has('vc4') ? 4 : 3;
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * k).fill(1), k));
  }
  if (f.has('tan')) geo.setAttribute('tangent', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  if (f.has('uv1')) geo.setAttribute('uv1', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!f.has('skin')) return new THREE.Mesh(geo, mat);
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(n * 4), 4));
  const poids = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) poids[i * 4] = 1;
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(poids, 4));
  const m = new THREE.SkinnedMesh(geo, mat);
  const os = new THREE.Bone();
  m.add(os);
  m.bind(new THREE.Skeleton([os]));
  return m;
}
export function chaufferLesProgrammes(renderer, scene, camera) {
  if (temoinsProgrammes.length) return () => false;
  const rt = refletsVoiture();
  const uni = new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1);
  uni.needsUpdate = true;
  const normale = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
  normale.needsUpdate = true;
  const liste = signaturesAChauffer();
  let k = 0;
  // UN BUDGET DE TEMPS PAR APPEL, PAS UNE SIGNATURE — le piège de la v237,
  // pour la troisième fois, et sur le dernier poste qui le portait encore.
  //
  // Une signature par IMAGE est un COMPTE, donc un taux qui suit la cadence
  // d'affichage. Mesuré sur ce banc : une compilation coûte 17 à 25 ms (médiane
  // 18,5), soit moins d'une demi-seconde pour les vingt-cinq — et la chauffe
  // mettait quarante et une secondes, parce que l'accueil sous charge ne rend
  // qu'une image et demie par seconde. Vingt-cinq images valent alors quarante
  // secondes, et la borne des quarante-cinq secondes de la préparation tirait
  // avec seize programmes sur vingt-cinq (mesuré au portail de la v276).
  //
  // Le budget se pose sur le coût MESURÉ de ce qu'il doit laisser passer
  // (v225, v229) — et il a deux régimes à servir, ce qui le décide :
  //   ici    une compilation vaut 18 ms, donc cent millisecondes en passent
  //          cinq, et la chauffe tient en cinq images au lieu de vingt-cinq ;
  //   iPad   Safari compile en CENTAINES de millisecondes (v257), donc la
  //          première remplit le budget à elle seule et rien ne change —
  //          l'accueil garde son étalement, qui est toute la raison de la v246.
  // Et pendant ce temps-là il n'y a aucune partie à protéger : le bouton est
  // grisé. `?chauffems=` le force, pour remesurer.
  const budget = Number(new URLSearchParams(location.search).get('chauffems')) || 100;
  // rend vrai tant qu'il en reste
  return () => {
    if (k >= liste.length) return false;
    const t0 = performance.now();
    do {
      const m = materielDeSignature(liste[k++], rt, uni, normale);
      temoinsProgrammes.push(m.material);
      m.position.set(camera.position.x, -500, camera.position.z);
      scene.add(m);
      try { renderer.compile(scene, camera); } finally { scene.remove(m); }
    } while (k < liste.length && performance.now() - t0 < budget);
    if (k >= liste.length) chaufferLesFabriquees(renderer, scene, camera);
    return k < liste.length;
  };
}
// UNE VOITURE FABRIQUÉE EST AUSSI UNE SIGNATURE (v306). La table des
// signatures se lit dans les FICHIERS de la flotte ; la berline citadine n'en a
// pas — elle se fabrique (`construireTaxi`), et elle roule une voiture sur six
// dans toute ville hors New York. Ses programmes se compilaient donc à
// l'arrivée : cinq à neuf mesurés à Paris par `sonde-programmes-paris.cjs`,
// quatre sur `origin/main` où le tirage de la flotte n'en mettait aucune à
// portée. C'est le gel de la v246 par la porte qu'elle n'avait pas fermée. On
// compile le prototype LUI-MÊME, celui que la rue clonera — repeindre clone un
// matériau aux mêmes réglages, donc au même programme —, et il n'entre pas
// dans le compte affiché : c'est une voiture, pas une ligne de la table.
let fabriqueesChauffees = false;
function chaufferLesFabriquees(renderer, scene, camera) {
  if (fabriqueesChauffees) return;
  fabriqueesChauffees = true;
  for (const entree of FLOTTE) {
    if (!entree.fabrique) continue;
    const chargement = chargerVoitureFlotte(entree);
    if (!chargement) continue;
    chargement.then((proto) => {
      if (!proto) return;
      const porte = new THREE.Group();
      porte.add(proto.clone(true));
      porte.position.set(camera.position.x, -500, camera.position.z);
      scene.add(porte);
      try { renderer.compile(scene, camera); } finally { scene.remove(porte); }
    });
  }
}
export const programmesChauffes = () => temoinsProgrammes.length;
export const programmesAChauffer = () => signaturesAChauffer().length;

// --- la vraie voiture ---------------------------------------------------------
//
// Le modèle d'artiste (vendor/voiture.glb, voir vendor/VOITURE_LICENSE) :
// une vraie carrosserie de 99 000 triangles fournie par Max — la sculpture
// de primitives à l'aveugle plafonnait au low-poly, et il a eu raison de le
// dire. Chargé UNE fois, cloné pour chaque voiture garée. En cas d'échec
// (fichier absent d'un vieux cache), la coque sculptée reste en place : le
// modèle améliore, il ne conditionne jamais le démarrage.
let chargementVraieVoiture = null;
export function chargerVraieVoiture() {
  if (chargementVraieVoiture || typeof document === 'undefined') return chargementVraieVoiture;
  chargementVraieVoiture = new GLTFLoader().loadAsync('./vendor/voiture.glb').then((gltf) => {
    const brut = gltf.scene;
    const chercherMesh = (bout) => {
      let trouve = null;
      brut.traverse((o) => {
        if (!trouve && o.isMesh && (o.name || '').toLowerCase().includes(bout)) trouve = o;
      });
      return trouve;
    };
    // Le modèle embarque un socle de présentation nommé « None », posé 1,4
    // sous les pneus : mesuré avec lui, la voiture flottait à sa hauteur.
    // Le RÉSERVOIR, lui, est la baignoire noire qui remplit l'habitacle du
    // modèle : elle enterrait notre poste de conduite (montures.js) et
    // murait la vue. Le moteur reste — on le voit derrière les sièges,
    // comme sur la vraie.
    const retraits = [];
    brut.traverse((o) => {
      if (!o.isMesh) return;
      const nom = (o.name || '').toLowerCase();
      if (o.name === 'None' || nom.includes('fuel_tank')) retraits.push(o);
    });
    for (const s of retraits) s.removeFromParent();
    const boite = new THREE.Box3().setFromObject(brut);
    const taille = boite.getSize(new THREE.Vector3());
    const centre = boite.getCenter(new THREE.Vector3());
    // recentré, posé au sol, à l'échelle du jeu
    const cadre = new THREE.Group();
    cadre.add(brut);
    brut.position.set(-centre.x, -boite.min.y, -centre.z);
    cadre.scale.setScalar(4.4 / Math.max(taille.x, taille.z));
    if (taille.x > taille.z) cadre.rotation.y = Math.PI / 2;
    // L'AVANT VERS -Z, VÉRIFIÉ, PAS DEVINÉ. Aligner le grand axe sur z ne
    // dit pas quel bout est l'avant : pile ou face — et c'était tombé face.
    // Pendant toute la v181 la voiture a roulé phares vers l'arrière, et de
    // l'habitacle on regardait l'aileron (capture à l'appui). Les phares
    // tranchent : s'ils finissent à z positif, demi-tour.
    cadre.updateMatrixWorld(true);
    const phare = chercherMesh('headlight');
    if (phare) {
      const ou = new THREE.Box3().setFromObject(phare).getCenter(new THREE.Vector3());
      if (ou.z > 0) { cadre.rotation.y += Math.PI; cadre.updateMatrixWorld(true); }
    }
    // LA CABINE SUR L'ORIGINE, MESURÉE, PAS RÉGLÉE À L'ŒIL. La caméra
    // s'assied sur l'origine (fiche `siege`) : le pare-brise du modèle doit
    // tomber juste devant elle, son centre au-dessus de la planche de bord
    // de montures.js. L'ancien recalage (+0,55, réglé à l'œil sur le modèle
    // à l'envers) posait le moteur sur les genoux du conducteur.
    const vitre = chercherMesh('front_window');
    if (vitre) {
      const ou = new THREE.Box3().setFromObject(vitre).getCenter(new THREE.Vector3());
      cadre.position.z = -0.45 - ou.z;
    } else cadre.position.z = 0.55;
    const porteur = new THREE.Group();
    porteur.add(cadre);
    const rt = refletsVoiture();
    porteur.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      // La transparence se juge sur le nom du matériau ET celui du maillage :
      // le pare-brise s'appelle front_window mais porte le matériau à tout
      // faire « breaks_ » — jugé sur le matériau seul, il restait OPAQUE, et
      // la vue cockpit regardait un mur sombre. Ce matériau étant PARTAGÉ
      // (freins, moteur, jantes…), on le CLONE avant de le rendre
      // transparent, sinon la moitié de la voiture devient fantôme.
      const matNom = (o.material.name || '').toLowerCase();
      const meshNom = (o.name || '').toLowerCase();
      const matVitre = matNom.includes('glass') || matNom.includes('window');
      if (matVitre || meshNom.includes('glass') || meshNom.includes('window')) {
        if (!matVitre) o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.35;
      }
      if (rt) refleter(o, o.material, 1.0);
      o.material.needsUpdate = true;
    });
    return porteur;
  }).catch(() => null);
  return chargementVraieVoiture;
}

// --- la flotte ----------------------------------------------------------------
//
// Cinquante modèles fournis par Max (vendor/voitures, voir LICENSE.md) pour
// la diversité des voitures à conduire. Paramétriques, HOMOGÈNES, et déjà
// normalisés par leur manifeste — c'est ce qui rend ce chargeur trivial là
// où celui du modèle d'artiste mesure et devine :
//   - mètres réels, et 1 m = 1 bloc : AUCUNE mise à l'échelle ;
//   - roues posées à y = 0, origine au centre : AUCUN recalage ;
//   - +Z vers le nez pour tous : UNE rotation π, la même pour tous —
//     l'avant ne se devine pas, il est écrit dans le contrat du fichier ;
//   - vitrage déjà transparent (alpha BLEND), intérieur complet.
// Chaque fichier pèse ~1,6 Mo et N'EST PAS dans les ASSETS : il passe par
// le STATIC_CACHE du service worker — téléchargé à la première rencontre,
// gardé à travers les mises à jour. Hors ligne avant cette rencontre, la
// coque sculptée d'attente reste en place : un modèle absent ne casse rien.
// `habitacle: false` — LE MODÈLE N'A PAS DE POSTE DE CONDUITE.
//
// Les cinquante d'origine ont tous un intérieur avec un volant nommé
// (`Interior_SteeringWheel`), et un témoin s'en sert : « le volant reste dans
// l'habitacle, visible par les vitres ». Les deux modèles déposés en v230 sont
// des carrosseries seules — la Chiron Stealth n'a aucun intérieur, la Lucid a
// une planche de bord mais pas de volant. Sans cette ligne, ce témoin
// rougirait DEUX FOIS SUR CINQUANTE-TROIS, au hasard du tirage : une bascule
// de quatre pour cent, du genre qu'on met des jours à démonter.
//
// La règle vit donc dans la FICHE, jamais dans une liste écrite dans le
// témoin — même discipline que `montable`, `nourrissable` et `vole`.
// LA LAQUE D'UN MODÈLE, par le nom de son matériau : `Paint_*` chez les
// cinquante d'origine, « Pearl white body », « clear-coated bodywork » chez
// ceux déposés ensuite. Pas `Paint_Secondary` ni les accents : on repeint la
// carrosserie, pas la livrée.
const EST_LAQUE = /paint_primary|pearl|bodywork|(?<![a-z])body(?![a-z])/i;

// LE MODÈLE DE LA VOITURE n D'UNE VILLE — fonction PURE, sans rien bâtir.
// New York ne tire que ses taxis et berlines ; ailleurs, une voiture sur six
// est la berline citadine, les autres viennent de la flotte au pas de 17.
export function choixFlotte(n, ville) {
  const choix = FLOTTE.filter((e) => (ville === 'ny' ? e.ville === 'ny' : e.ville !== 'ny'));
  if (ville !== 'ny' && n % 6 === 0) return FLOTTE.find((e) => e.fichier === 'berline-citadine');
  return choix[((n % choix.length) + choix.length) % choix.length];
}

// LA GRAINE D'UN CONVOI VIENT DE SA VILLE (v246). Elle valait « nombre de
// points du tracé + rang dans la file » : les villes engendrées, dont les
// anneaux se ressemblent, tiraient les MÊMES vingt modèles dans le même
// ordre — Max : « assure-toi que toutes les villes ont de la diversité ».
// La position de l'ancre est propre à chaque ville ; le rang distingue ses
// anneaux. Exportée pour qu'un témoin la calcule sur deux villes.
export function graineDeVille(tr) {
  const h = Math.round(Math.abs(tr.x) * 31 + Math.abs(tr.z) * 17 + (tr.rang || 0) * 101 + (tr.x < 0 ? 7 : 0) + (tr.z < 0 ? 13 : 0));
  return h % 100003;
}

export const FLOTTE = [
  {fichier:'berline-citadine', classe: 'citadine',nom:'Berline citadine',fabrique:()=>construireTaxi({taxi:false})},
  {fichier:'ny-crown-victoria', classe: 'berline',ville:'ny',nom:'Ford Crown Victoria · taxi jaune',fabrique:()=>construireTaxi()},
  {fichier:'ny-town-sedan', classe: 'berline',ville:'ny',nom:'Berline new-yorkaise',fabrique:()=>construireTaxi({taxi:false})},
  { fichier: 'acura-nsx-type-s.glb', classe: 'gt', nom: 'Acura NSX Type S' },
  { fichier: 'amg-gt-black-series.glb', classe: 'sportive', nom: 'Mercedes-AMG GT Black Series' },
  { fichier: 'aston-martin-dbs-superleggera.glb', classe: 'gt', nom: 'Aston Martin DBS Superleggera' },
  { fichier: 'aston-martin-one-77.glb', classe: 'sportive', nom: 'Aston Martin One-77' },
  { fichier: 'aston-martin-valkyrie.glb', classe: 'hypercar', nom: 'Aston Martin Valkyrie' },
  { fichier: 'audi-r8-v10-performance.glb', classe: 'gt', nom: 'Audi R8 V10 Performance' },
  { fichier: 'bentley-continental-gt-speed.glb', classe: 'gt', nom: 'Bentley Continental GT Speed' },
  { fichier: 'bmw-i8.glb', classe: 'gt', nom: 'BMW i8' },
  { fichier: 'bmw-m8-competition.glb', classe: 'gt', nom: 'BMW M8 Competition' },
  { fichier: 'bugatti-bolide.glb', classe: 'hypercar', nom: 'Bugatti Bolide' },
  { fichier: 'bugatti-chiron.glb', classe: 'hypercar', nom: 'Bugatti Chiron' },
  // `portiere: false` (v366) : sans habitacle, la portière ouverte ne montre que
  // du noir ; un modèle qui casse vaut moins qu'un modèle qui s'en passe.
  { fichier: 'bugatti-chiron-stealth.glb', classe: 'hypercar', nom: 'Bugatti Chiron Stealth', habitacle: false, portiere: false },
  { fichier: 'bugatti-veyron.glb', classe: 'hypercar', nom: 'Bugatti Veyron 16.4' },
  { fichier: 'bugatti-w16-mistral.glb', classe: 'hypercar', nom: 'Bugatti W16 Mistral' },
  { fichier: 'ferrari-812-competizione.glb', classe: 'sportive', nom: 'Ferrari 812 Competizione' },
  { fichier: 'ferrari-daytona-sp3.glb', classe: 'sportive', nom: 'Ferrari Daytona SP3' },
  { fichier: 'ferrari-f40.glb', classe: 'sportive', nom: 'Ferrari F40' },
  { fichier: 'ferrari-laferrari.glb', classe: 'hypercar', nom: 'Ferrari LaFerrari' },
  { fichier: 'ferrari-sf90.glb', classe: 'sportive', nom: 'Ferrari SF90 Stradale' },
  { fichier: 'ford-gt.glb', classe: 'sportive', nom: 'Ford GT' },
  { fichier: 'koenigsegg-cc850.glb', classe: 'hypercar', nom: 'Koenigsegg CC850' },
  { fichier: 'koenigsegg-gemera.glb', classe: 'hypercar', nom: 'Koenigsegg Gemera' },
  { fichier: 'koenigsegg-jesko.glb', classe: 'hypercar', nom: 'Koenigsegg Jesko' },
  { fichier: 'koenigsegg-regera.glb', classe: 'hypercar', nom: 'Koenigsegg Regera' },
  { fichier: 'lamborghini-aventador-svj.glb', classe: 'sportive', nom: 'Lamborghini Aventador SVJ' },
  { fichier: 'lamborghini-countach-lpi-800-4.glb', classe: 'sportive', nom: 'Lamborghini Countach LPI 800-4' },
  { fichier: 'lamborghini-huracan-sto.glb', classe: 'sportive', nom: 'Lamborghini Huracan STO' },
  { fichier: 'lamborghini-revuelto.glb', classe: 'sportive', nom: 'Lamborghini Revuelto' },
  { fichier: 'lamborghini-sian-fkp-37.glb', classe: 'hypercar', nom: 'Lamborghini Sian FKP 37' },
  { fichier: 'lexus-lfa.glb', classe: 'gt', nom: 'Lexus LFA' },
  { fichier: 'lotus-evija.glb', classe: 'hypercar', nom: 'Lotus Evija' },
  { fichier: 'lucid-gravity.glb', classe: 'suv', nom: 'Lucid Gravity', habitacle: false },
  { fichier: 'maserati-mc20.glb', classe: 'sportive', nom: 'Maserati MC20' },
  { fichier: 'mclaren-765lt.glb', classe: 'sportive', nom: 'McLaren 765LT' },
  { fichier: 'mclaren-artura.glb', classe: 'sportive', nom: 'McLaren Artura' },
  { fichier: 'mclaren-p1.glb', classe: 'hypercar', nom: 'McLaren P1' },
  { fichier: 'mclaren-senna.glb', classe: 'sportive', nom: 'McLaren Senna' },
  { fichier: 'mclaren-speedtail.glb', classe: 'hypercar', nom: 'McLaren Speedtail' },
  { fichier: 'mercedes-amg-one.glb', classe: 'hypercar', nom: 'Mercedes-AMG One' },
  { fichier: 'nissan-gtr-nismo.glb', classe: 'gt', nom: 'Nissan GT-R Nismo' },
  { fichier: 'pagani-huayra-bc.glb', classe: 'sportive', nom: 'Pagani Huayra BC' },
  { fichier: 'pagani-utopia.glb', classe: 'sportive', nom: 'Pagani Utopia' },
  { fichier: 'pagani-zonda-cinque.glb', classe: 'sportive', nom: 'Pagani Zonda Cinque' },
  { fichier: 'pininfarina-battista.glb', classe: 'hypercar', nom: 'Automobili Pininfarina Battista' },
  { fichier: 'porsche-718-cayman-gt4-rs.glb', classe: 'gt', nom: 'Porsche 718 Cayman GT4 RS' },
  { fichier: 'porsche-911-gt3-rs.glb', classe: 'sportive', nom: 'Porsche 911 GT3 RS (992)' },
  { fichier: 'porsche-918-spyder.glb', classe: 'hypercar', nom: 'Porsche 918 Spyder' },
  { fichier: 'porsche-carrera-gt.glb', classe: 'sportive', nom: 'Porsche Carrera GT' },
  { fichier: 'porsche-taycan-turbo-s.glb', classe: 'gt', nom: 'Porsche Taycan Turbo S' },
  { fichier: 'rimac-nevera.glb', classe: 'hypercar', nom: 'Rimac Nevera' },
  { fichier: 'rolls-royce-spectre.glb', classe: 'berline', nom: 'Rolls-Royce Spectre' },
  { fichier: 'sls-amg-black-series.glb', classe: 'gt', nom: 'Mercedes-Benz SLS AMG Black Series' },
];

// UNE ALLURE PAR CLASSE, ET LA CLASSE VIT DANS LE MANIFESTE (v260). Max :
// « les voitures devraient aller plus vite et surtout une vitesse en fonction
// du modèle (sportive faster than sedan basic) ». Multiplicateur de la marche
// (3,2 blocs/s) : `fun.js` le passe au joueur en `boost`.
// DEPUIS LA v358, LA TABLE SE DÉDUIT DES FICHES DE `conduite.js` : la pointe,
// l'accélération et l'adhérence d'une classe vivent au même endroit, et le
// plafond n'est plus calculé (28 blocs/s, v260) mais MESURÉ — 60 blocs/s,
// Paris compris (`PLAFOND_SOL`). Citadine 108 km/h, hypercar 198.
export const ALLURES = Object.fromEntries(Object.entries(CLASSES).map(([k, f]) => [k, f.vmax / MARCHE]));

// L'EMPRISE AU SOL D'UNE VOITURE, PUBLIÉE LÀ OÙ ELLE SERT (v270). 4,4 × 2,26 :
// c'est le rectangle que `cederLePassage` fait se regarder (v244), celui que
// `player.obstacleVehicule` refuse de faire entrer dans un autre (v245), et
// c'est aussi la largeur du COULOIR qu'un convoi balaie dans la rue.
//
// Max, deux captures : une voiture posée DANS une caisse du marché à
// Stuttgart, des caisses sur la chaussée à Zurich. Mesuré : le mobilier des
// villes engendrées est posé sur la PREMIÈRE colonne de trottoir, et comme
// la trame est tournée par rapport au monde, une case entière mord jusqu'à
// 1,13 bloc dans la chaussée — 32 410 cases traversées, 267 villes sur 267.
// `villesmonde.js` a donc besoin de ce chiffre pour dégager le caniveau, et
// il ne peut PAS l'importer d'ici : il est lu par le mailleur du worker, qui
// meurt au premier `import 'three'` de son graphe (v251). Le chiffre y est
// donc recopié, et c'est un TÉMOIN qui garde les deux d'accord — jamais un
// commentaire : deux tables qui décrivent la même chose finissent par
// diverger.
// LA PORTÉE D'AFFICHAGE D'UNE VOITURE, PUBLIÉE LÀ OÙ ELLE SE CALCULE (v270).
// `villesmonde.js` doit savoir à quelle distance une voiture se DESSINE pour
// garantir qu'une ville engendrée en montre une depuis son centre — et il ne
// peut pas importer ce fichier, qui amènerait `three` dans le graphe du
// mailleur du worker (v251). Le chiffre y est donc recopié, celui-ci fait
// foi, et un témoin exige que les deux disent la même chose.
export const VU_VOITURE = 45;

export const DEMI_LONG_VOITURE = 2.2;
export const DEMI_LARG_VOITURE = 1.13;
export function classeDe(fichier) {
  const e = FLOTTE.find((f) => f.fichier === fichier);
  return e ? e.classe || null : null;
}
export function allureDe(fichier, secours = 3.4) {
  // LE CHIRON D'ARTISTE HISTORIQUE (`voiture.glb`) n'est pas dans le
  // manifeste : il roulait à l'allure de secours de la fiche, plus lent qu'une
  // citadine. C'est une hypercar.
  if (fichier === 'voiture.glb') return ALLURES.hypercar;
  const c = classeDe(fichier);
  return (c && ALLURES[c]) || secours;
}

const chargementsFlotte = new Map();

// CINQ IMAGES POUR TOUTE LA FLOTTE, ET CHAQUE MODÈLE DÉCODAIT LES SIENNES (v409).
//
// Max : « le jeu plante de temps en temps ». Le journal de bord de l'iPhone
// (`journal_appareil`, 10 octobre) : onze plantages en quarante minutes, en
// palier bas, couche HD éteinte, AUCUNE erreur, une cadence de 25 à 60 images —
// et un compte de textures qui grimpe d'un bout à l'autre de la partie
// (409 → 702 en cinq minutes, 103 → 606 ailleurs). Mesuré dans les fichiers :
// les cinquante modèles déposés portent 225 images, et il n'y en a que CINQ
// distinctes (deux teintes de 1 024 et trois normales, octet pour octet). Le
// chargeur glTF ne connaît qu'un fichier à la fois : chaque modèle décodait sa
// copie et l'envoyait à la carte graphique — 14 à 15 Mo par modèle, 734 Mo pour
// la flotte entière, que la rue découvre à mesure que l'enfant roule. iOS ne
// prévient pas : il ferme la page.
//
// On reconnaît donc une image à son EMPREINTE (ses octets, pas son nom, que les
// fichiers ne portent pas) et l'on rend la texture déjà décodée. Vérifié dans
// les cinquante fichiers : chaque image n'y joue qu'UN rôle (teinte ou normale)
// et aucune ne déclare de sampler — `assignTexture` lui donne donc le même
// espace de couleur d'un modèle à l'autre. La texture partagée est marquée
// (`partager`) : `liberer` ne la rend jamais au pilote quand une voiture
// repeinte s'en va — sans cela elle repartait à la carte graphique à chaque
// voiture qui revient, ce qu'elle faisait déjà avec la texture du prototype.
const TEXTURES_FLOTTE = new Map();          // empreinte → Promise<Texture|null>
export const texturesFlotte = () => TEXTURES_FLOTTE.size;
function empreinteOctets(tampon) {
  const o = new Uint8Array(tampon);
  let h = 0x811c9dc5;
  for (let i = 0; i < o.length; i++) h = Math.imul(h ^ o[i], 0x01000193);
  return o.length + ':' + (h >>> 0).toString(36);
}
function partageDesTextures(parser) {
  return {
    name: 'grandtour_textures_partagees',
    loadTexture(index) {
      const def = parser.json.textures[index];
      const image = def && parser.json.images[def.source];
      // une texture étendue (basisu, webp) ou une image hors du fichier suit le
      // chemin du chargeur, tel quel
      if (!image || def.extensions || image.bufferView === undefined) return null;
      const sampler = JSON.stringify((parser.json.samplers || [])[def.sampler] || {});
      return parser.getDependency('bufferView', image.bufferView).then((tampon) => {
        const cle = empreinteOctets(tampon) + '|' + (image.mimeType || '') + '|' + sampler;
        let p = TEXTURES_FLOTTE.get(cle);
        if (!p) {
          p = parser.loadTextureImage(index, def.source, parser.textureLoader)
            .then((t) => { if (t) { t.userData.partagee = true; } return t; });
          TEXTURES_FLOTTE.set(cle, p);
        }
        return p;
      });
    },
  };
}

// UN MODÈLE SE MESURE, IL NE SE DÉCLARE PAS.
//
// Les cinquante-et-un modèles d'origine suivent un manifeste
// (`vendor/voitures/LICENSE.md`) : mètres, +Y en haut, +Z vers le nez, roues
// posées à y = 0, pivots `Wheel_FL/FR/RL/RR`, laque `Paint_*`. Trois endroits
// du jeu s'y fient pour faire tourner les roues et poser les reflets.
//
// Les modèles que Max dépose ensuite viennent d'ailleurs. Mesuré sur les deux
// premiers : la Bugatti Chiron Stealth a chaque roue éclatée en HUIT nœuds —
// un par matériau — aucun matériau nommé `Paint`, et le nez vers -X ; la Lucid
// Gravity groupe les siennes sous `FW|` et `RW|`. Sans rien faire : roues
// figées, rayon de repli, pas de reflets, voiture en travers.
//
// Convertir chaque fichier à la main marcherait UNE fois. On mesure donc le
// modèle qu'on reçoit — et l'on ne touche à RIEN quand le manifeste est
// respecté, pour que les cinquante-et-un ne bougent pas d'un pixel.
// UN MOT ENTIER, PAS UNE SOUS-CHAÎNE (v246). `/rim/` attrapait « t-rim » :
// les bandes « Gloss black | stealth trim » de la Chiron Stealth — toute la
// voiture, 5,13 × 4,04 blocs — étaient accrochées au pivot de la roue arrière
// droite et tournaient avec elle. Max : « des trucs noirs qui bougent autour ».
// Sur la Lucid, le trim aérodynamique et le trim de cabine faisaient pareil.
// Un souligné ou un espace ne sont pas des lettres : « Wheel_FL » passe,
// « trim » ne passe plus. Et la GÉOMÉTRIE tranche ensuite (voir plus bas).
const EST_ROUE = /(?<![a-z])(wheel|tire|tyre|rim|roue|pneu)(?![a-z])/i;
const EST_PNEU = /(?<![a-z])(tire|tyre|pneu|rubber)(?![a-z])/i;
const EST_AVANT = /front|\bFW\b|^FW\||avant/i;
const EST_ARRIERE = /rear|back|\bRW\b|^RW\||arri/i;

// Le nom d'un nœud et de tous ses parents : chez ces modèles, « Front wheel 1 »
// est le PARENT des huit maillages de matériau.
function lignee(o) {
  const bouts = [];
  for (let n = o; n; n = n.parent) if (n.name) bouts.push(n.name);
  return bouts.join(' / ');
}

function normaliserVoiture(scene) {
  scene.updateMatrixWorld(true);
  const dejaConforme = [];
  scene.traverse((o) => { if (/^Wheel_(FL|FR|RL|RR)$/i.test(o.name || '')) dejaConforme.push(o); });
  if (dejaConforme.length >= 4) return 'manifeste';

  // 1. LES ROUES, PAR LEUR LIGNÉE. On garde les maillages dont le nom — ou
  //    celui d'un parent — parle de roue, et l'on note leur centre du MONDE.
  const morceaux = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const nom = lignee(o);
    if (!EST_ROUE.test(nom)) return;
    const boite = new THREE.Box3().setFromObject(o);
    const t = boite.getSize(new THREE.Vector3());
    morceaux.push({ o, nom, c: boite.getCenter(new THREE.Vector3()), etendue: Math.max(t.x, t.z), pneu: EST_PNEU.test(nom) });
  });
  if (morceaux.length < 4) return 'sans roues';

  // 2. QUEL AXE EST LA LONGUEUR ? Celui sur lequel les roues s'écartent le
  //    plus : un empattement est toujours plus long qu'une voie.
  const etendue = (k) => Math.max(...morceaux.map((m) => m.c[k])) - Math.min(...morceaux.map((m) => m.c[k]));
  const axeLong = etendue('x') >= etendue('z') ? 'x' : 'z';
  const axeLarge = axeLong === 'x' ? 'z' : 'x';

  // 3. OÙ EST L'AVANT ? Le NOM le dit — c'est plus sûr que la géométrie, qui
  //    ne distingue pas un train avant d'un train arrière.
  const avants = morceaux.filter((m) => EST_AVANT.test(m.nom) && !EST_ARRIERE.test(m.nom));
  const arrieres = morceaux.filter((m) => EST_ARRIERE.test(m.nom) && !EST_AVANT.test(m.nom));
  if (!avants.length || !arrieres.length) return 'avant introuvable';
  const moy = (t, k) => t.reduce((s, m) => s + m.c[k], 0) / t.length;
  const versAvant = Math.sign(moy(avants, axeLong) - moy(arrieres, axeLong)) || 1;

  // 4. QUATRE PIVOTS, POSÉS AU CENTRE DE CHAQUE ROUE. `attach` conserve la
  //    position du monde : on ne déplace rien, on regroupe.
  const milieuLarge = (Math.max(...morceaux.map((m) => m.c[axeLarge]))
    + Math.min(...morceaux.map((m) => m.c[axeLarge]))) / 2;
  const familles = { FL: [], FR: [], RL: [], RR: [] };
  for (const m of morceaux) {
    const av = EST_AVANT.test(m.nom) && !EST_ARRIERE.test(m.nom);
    const gauche = m.c[axeLarge] > milieuLarge;
    familles[(av ? 'F' : 'R') + (gauche ? 'L' : 'R')].push(m);
  }
  for (const [cle, liste] of Object.entries(familles)) {
    if (!liste.length) continue;
    // LA GÉOMÉTRIE TRANCHE, PAS LE NOM SEUL. Le pneu donne la mesure de la
    // roue ; ce qui ne tient pas dans une fois et demie le pneu, ou dont le
    // centre en est à plus de six dixièmes, n'est pas une pièce de roue —
    // les jantes réunies des quatre roues de la Lucid (1,56 bloc) restent au
    // corps plutôt que d'orbiter autour d'une seule. Et le pivot se pose au
    // centre du PNEU, jamais de la boîte de tout ce qui porte le mot.
    const pneus = liste.filter((m) => m.pneu);
    const ref = pneus.length ? pneus.reduce((a, b) => (b.etendue > a.etendue ? b : a))
      : liste.filter((m) => m.etendue < 1.3).reduce((a, b) => (!a || b.etendue > a.etendue ? b : a), null);
    if (!ref) continue;
    const pieces = liste.filter((m) => m.etendue <= ref.etendue * 1.5 && m.c.distanceTo(ref.c) <= ref.etendue * 0.6);
    // L'ESSIEU EST LE x DU PARENT DU PIVOT. `rotation.x += angle` (animals.js,
    // vehicules.js) est un Euler XYZ : la rotation en x s'applique EN DERNIER,
    // donc autour du x du parent, quelle que soit l'orientation propre du
    // nœud — les pivots du manifeste portent d'ailleurs une rotation de −90°
    // et tournent très bien. Or ce pivot-ci naissait directement sous le
    // modèle, AVANT le quart de tour du pas 5 : sur un modèle dont la longueur
    // est x, le x du parent était l'axe avant-arrière, et la roue basculait
    // comme une pièce qu'on fait tourner sur la tranche — hors de son passage
    // de roue (Max, capture de la Lucid Gravity : « wheels »). Le pivot naît
    // donc dans un groupe-essieu dont le x est la voie, orienté pour qu'un
    // angle positif avance le haut du pneu vers le nez, comme le manifeste.
    const essieu = new THREE.Group();
    essieu.name = 'Essieu_' + cle;
    essieu.position.copy(ref.c);
    essieu.rotation.y = axeLong === 'z' ? (versAvant > 0 ? 0 : Math.PI)
      : (versAvant > 0 ? Math.PI / 2 : -Math.PI / 2);
    const pivot = new THREE.Group();
    pivot.name = 'Wheel_' + cle;
    essieu.add(pivot);
    scene.add(essieu);
    scene.updateMatrixWorld(true);
    for (const m of pieces) pivot.attach(m.o);
  }

  // 5. LE NEZ VERS +Z, comme le manifeste. On tourne par quarts de tour :
  //    à ce pas-là rien ne se déforme.
  const quarts = axeLong === 'z' ? (versAvant > 0 ? 0 : 2) : (versAvant > 0 ? 3 : 1);
  scene.rotation.y += quarts * Math.PI / 2;
  scene.updateMatrixWorld(true);

  // 6. LES ROUES AU SOL. Le manifeste les pose à y = 0 ; un modèle qui ne le
  //    fait pas laisse la voiture flotter ou l'enterre jusqu'aux moyeux.
  const tout = new THREE.Box3().setFromObject(scene);
  scene.position.y -= tout.min.y;
  return 'mesuré';
}

export function chargerVoitureFlotte(entree) {
  if (typeof document === 'undefined') return null;
  if (chargementsFlotte.has(entree.fichier)) return chargementsFlotte.get(entree.fichier);
  if(entree.fabrique){
    const modele=entree.fabrique(),rt=refletsVoiture();
    if(rt)modele.traverse(o=>{if(o.isMesh&&(o.material.isMeshStandardMaterial||o.material.isMeshPhysicalMaterial))refleter(o,o.material,.75);});
    const p=Promise.resolve(modele);chargementsFlotte.set(entree.fichier,p);return p;
  }
  const chargement = new GLTFLoader().register(partageDesTextures).loadAsync('./vendor/voitures/' + entree.fichier)
    .then((gltf) => {
      const cadre = new THREE.Group();
      // On remet le modèle au manifeste AVANT de l'accrocher : la rotation et
      // la pose au sol se calculent dans son propre repère.
      const forme = normaliserVoiture(gltf.scene);
      cadre.add(gltf.scene);
      cadre.rotation.y = Math.PI;                      // +Z nez (contrat) → -z jeu
      const porteur = new THREE.Group();
      porteur.add(cadre);
      const rt = refletsVoiture();
      if (rt) {
        porteur.traverse((o) => {
          if (!o.isMesh || !o.material) return;
          // la laque seulement : le vitrage et le carbone gardent leur rendu
          // `Paint_*` est le nom du manifeste ; les modèles déposés ensuite
          // appellent leur laque « Pearl white body » ou « clear-coated
          // bodywork ». On reconnaît les deux, sinon la carrosserie neuve
          // reste mate au milieu d'une flotte qui brille.
          if (EST_PEINTURE.test(o.material.name || '')) {
            refleter(o, o.material, 1.0);
            o.material.needsUpdate = true;
          }
        });
      }
      // LE RAYON DES ROUES, MESURÉ. Le manifeste garantit les pivots
      // Wheel_FL/FR/RL/RR ; c'est animals.js qui les fait tourner, et il lui
      // faut un rayon — un angle, c'est une distance divisée par un rayon.
      // On le mesure sur le pneu plutôt que de le supposer : d'une Countach
      // à une Rolls il varie assez pour que l'œil voie la roue patiner.
      porteur.updateMatrixWorld(true);
      let roue = null;
      porteur.traverse((o) => { if (!roue && /^Wheel_/i.test(o.name || '')) roue = o; });
      const boite = roue ? new THREE.Box3().setFromObject(roue) : null;
      const rayon = boite ? (boite.max.y - boite.min.y) / 2 : 0;
      porteur.userData.rayonRoue = rayon > 0.1 ? rayon : 0.34;
      porteur.userData.forme = forme;      // « manifeste » ou « mesuré » : le témoin le lit
      return porteur;
    }).catch(() => null);
  chargementsFlotte.set(entree.fichier, chargement);
  return chargement;
}

const VU = 150;                 // au-delà, le convoi s'efface et se fige

// LA RUE SE FABRIQUE PAR TRANCHES (v429). À l'arrivée d'une téléportation,
// `montrer` fabriquait dans la MÊME image toutes les voitures qui entraient
// dans les quarante-cinq blocs : toute une rue d'un coup, 162 à 276 ms
// mesurés (`sonde-arrivee-decoupe.cjs`, v420). C'est la file des passants
// (v246) : un budget de fabrication par image, et une place hors budget reste
// vide une image de plus. Sauf tout près de l'enfant (`FAB_PROCHE`) : une
// voiture qu'il touche presque se fabrique toujours, sinon il la traverserait
// sans la voir. `fin` vaut l'infini tant que personne n'a ouvert d'image —
// un témoin sous node qui appelle `montrer` sans `update` fabrique tout.
export const FAB_MS = 5;
export const FAB_PROCHE = 18;
const fabrication = { fin: Infinity, faites: 0, differees: 0 };

// MAIS CENT CINQUANTE BLOCS, C'EST LA PORTÉE DU REGARD À CIEL OUVERT.
//
// Sous terre, on ne voit rien du tout : un train enterré à douze blocs est
// caché par douze blocs de roche, qu'on soit à dix mètres ou à cent. Washington
// est à cent trente-sept blocs du point d'apparition, et ses douze rames
// tombaient donc dans la portée : DIX convois, quarante wagons dessinés dans la
// pierre, au-dessus de l'endroit précis où chaque partie commence. Le rendu est
// tombé de vingt-cinq à seize images par seconde — et comme `main.js` borne
// `dt` à un vingtième de seconde, sous cette barre le monde avance moins vite
// que le temps réel : l'enfant court moins loin en appuyant aussi longtemps.
//
// Un convoi souterrain ne se montre donc que quand on est dans le tunnel avec
// lui — assez loin pour le voir arriver le long du quai, pas assez pour le
// dessiner à travers la ville.
const VU_SOUTERRAIN = 40;

// --- le tracé ----------------------------------------------------------------

// Un parcours fermé, échantillonné : on précalcule les longueurs cumulées pour
// pouvoir demander « où suis-je après 42 mètres ? » sans chercher à chaque fois.
export class Parcours {
  constructor(points) {
    this.pts = points;
    this.cumul = [0];
    let total = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      total += Math.hypot(b.x - a.x, b.z - a.z);
      this.cumul.push(total);
    }
    this.longueur = total;
  }

  // Le point du tracé qui commence le segment sous une distance (v423).
  pointA(distance) {
    const d = ((distance % this.longueur) + this.longueur) % this.longueur;
    let lo = 0, hi = this.cumul.length - 1;
    while (lo < hi - 1) { const mi = (lo + hi) >> 1; if (this.cumul[mi] <= d) lo = mi; else hi = mi; }
    return this.pts[lo % this.pts.length];
  }

  // Position et cap à une distance donnée depuis le départ.
  a(distance) {
    const d = ((distance % this.longueur) + this.longueur) % this.longueur;
    // recherche dichotomique dans les longueurs cumulées
    let lo = 0, hi = this.cumul.length - 1;
    while (lo < hi - 1) {
      const mi = (lo + hi) >> 1;
      if (this.cumul[mi] <= d) lo = mi; else hi = mi;
    }
    const a = this.pts[lo % this.pts.length];
    const b = this.pts[(lo + 1) % this.pts.length];
    const seg = this.cumul[lo + 1] - this.cumul[lo] || 1;
    const t = (d - this.cumul[lo]) / seg;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      cap: Math.atan2(b.x - a.x, b.z - a.z),
    };
  }

  // LE CAP D'UNE VOITURE EST CELUI DE SON EMPATTEMENT, PAS DU SEGMENT (v244).
  //
  // `a(d).cap` est la direction du segment sous la voiture : à un carrefour,
  // elle pivotait de quatre-vingt-dix degrés en une image — mesuré, cinquante-
  // neuf sauts de plus de trente-quatre degrés en trente secondes à Paris. Max :
  // « quand la voiture tourne, ce soit beaucoup plus naturel ». Une vraie
  // voiture tourne sur la longueur de son empattement : on prend la corde
  // entre le point sous l'essieu arrière et celui sous l'essieu avant, et le
  // corps pivote progressivement pendant qu'il franchit le coin.
  capLisse(distance, demi = 1.6) {
    const ar = this.a(distance - demi), av = this.a(distance + demi);
    return Math.atan2(av.x - ar.x, av.z - ar.z);
  }

  // La courbure ici, en radians par bloc : ce que le cap change sur un bloc de
  // trajet. Positive à gauche (le cap augmente), négative à droite.
  courbure(distance) {
    let e = this.capLisse(distance + 0.5) - this.capLisse(distance - 0.5);
    while (e > Math.PI) e -= Math.PI * 2;
    while (e < -Math.PI) e += Math.PI * 2;
    return e;
  }

  // De combien le tracé tourne dans les prochains mètres, en radians.
  //
  // C'est ce qui manquait pour que la monoplace ressemble à une monoplace :
  // elle roulait à dix-sept mètres par seconde partout, épingles comprises.
  // Une vraie voiture freine AVANT le virage — d'où ce regard en avant, et
  // non la courbure sous les roues.
  virageDevant(distance, avance = 16) {
    const ici = this.a(distance).cap;
    let max = 0;
    for (let d = 3; d <= avance; d += 3) {
      let e = this.a(distance + d).cap - ici;
      while (e > Math.PI) e -= Math.PI * 2;
      while (e < -Math.PI) e += Math.PI * 2;
      const abs = Math.abs(e);
      if (abs > max) max = abs;
    }
    return max;
  }
}

// UN TRACÉ DÉCALÉ D'UNE VOIE (v423). La seconde voie d'un boulevard ou d'une
// autoroute n'est pas un autre circuit : c'est le MÊME, décalé latéralement là
// où la section a deux voies dans ce sens. Il garde la distance de son tracé
// de base — c'est ce qui permet à deux convois côte à côte de partager une
// seule grille horaire (v305) : la voiture de la seconde voie passe partout à
// la même distance du départ, une demi-voiture plus tard. `lat` est échantillonné
// au bloc (`n` pas sur la longueur), positif vers la droite du sens de marche.
export class ParcoursDecale extends Parcours {
  constructor(base, lat) {
    super([]);
    this.base = base;
    this.lat = lat;
    this.longueur = base.longueur;
    // TABULÉ AU BLOC, UNE FOIS : chaque voiture se pose à chaque image, et la
    // pose d'un point décalé en demandait trois au tracé de base
    const L = base.longueur, n = Math.max(8, Math.ceil(L)), m = lat.length;
    const X = new Float64Array(n + 1), Y = new Float64Array(n + 1), Z = new Float64Array(n + 1);
    for (let k = 0; k <= n; k++) {
      const d = k * L / n, q = base.a(d);
      const f = d / L * m, i = Math.floor(f) % m, u = f - Math.floor(f);
      const l = lat[i] + (lat[(i + 1) % m] - lat[i]) * u;
      if (l === 0) { X[k] = q.x; Z[k] = q.z; } else {
        // la droite d'une direction (ux, uz) est (−uz, ux) (v271), lue sur le
        // cap de l'empattement : au coin d'un carrefour, le cap du segment saute
        const c = base.capLisse(d, 2);
        X[k] = q.x - Math.cos(c) * l; Z[k] = q.z + Math.sin(c) * l;
      }
      Y[k] = q.y;
    }
    this.n = n; this.X = X; this.Y = Y; this.Z = Z;
  }
  // le décalage latéral ici, interpolé : une jumelle qui en a moins d'une
  // largeur de voiture partage la voie de sa file
  decalageA(distance) {
    const L = this.longueur, m = this.lat.length;
    const f = (((distance % L) + L) % L) / L * m, i = Math.floor(f) % m, u = f - Math.floor(f);
    return this.lat[i] + (this.lat[(i + 1) % m] - this.lat[i]) * u;
  }
  a(distance) {
    const L = this.longueur, n = this.n;
    const f = (((distance % L) + L) % L) / L * n, k = Math.min(n - 1, Math.floor(f)), u = f - k;
    const X = this.X, Z = this.Z, Y = this.Y;
    return { x: X[k] + (X[k + 1] - X[k]) * u, y: Y[k] + (Y[k + 1] - Y[k]) * u, z: Z[k] + (Z[k + 1] - Z[k]) * u,
      cap: Math.atan2(X[k + 1] - X[k], Z[k + 1] - Z[k]) };
  }
}

// OÙ LA SECTION A DEUX VOIES, le long d'un tracé (v423). `voies(x, z)` rend le
// décalage de la jumelle (un nombre), ou [file, jumelle] quand la file elle-même
// doit changer de voie (l'autoroute), ou 0 / null. Une portion de deux voies
// plus courte que `2 R` blocs ne compte pas — un boulevard qu'on ne fait que
// TRAVERSER au carrefour n'est pas un boulevard qu'on suit — et l'on change
// de voie sur `2 R` blocs, pas d'un coup : une érosion puis une moyenne
// glissante, circulaires. Rend { A, B, part } (Float32Array au bloc) ou null.
export const RAMPE_VOIE = 8;
export function voiesLeLong(parcours, voies, rampe = RAMPE_VOIE) {
  // un échantillon par bloc, un tous les deux sur un long tracé (une
  // autoroute fait deux mille blocs : la section ne change pas si vite)
  const L = parcours.longueur, pas = L > 1000 ? 2 : 1, n = Math.max(8, Math.ceil(L / pas)), R = Math.ceil(rampe / pas);
  const I = new Uint8Array(n), TA = new Float32Array(n), TB = new Float32Array(n);
  let un = 0;
  for (let k = 0; k < n; k++) {
    const d = k * L / n, q = parcours.a(d), r = voies(q.x, q.z, parcours.pointA(d));
    if (!r) continue;
    // UN VIRAGE SE PREND SUR UNE SEULE VOIE (v423). Décalée d'une voie vers
    // l'intérieur d'un coin de carrefour, la jumelle replie son tracé sur
    // lui-même et touche la file (mesuré : Tokyo, contact dès seize voitures
    // quand la même ligne sans décalage n'en a aucun). On se rabat avant le
    // coin, on se redéploie après.
    let e = parcours.a(d + 4).cap - parcours.a(d - 4).cap;
    while (e > Math.PI) e -= 2 * Math.PI;
    while (e < -Math.PI) e += 2 * Math.PI;
    if (Math.abs(e) > 1.0) continue;
    const [a, b] = Array.isArray(r) ? r : [0, r];
    if (!b) continue;
    I[k] = 1; TA[k] = a; TB[k] = b; un++;
  }
  if (!un) return null;
  const E = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    let ok = 1;
    for (let j = -R; j <= R && ok; j++) if (!I[(k + j + n) % n]) ok = 0;
    E[k] = ok;
  }
  const A = new Float32Array(n), B = new Float32Array(n);
  let part = 0;
  for (let k = 0; k < n; k++) {
    if (E[k]) part++;
    let m = 0;
    for (let j = -R; j <= R; j++) m += E[(k + j + n) % n];
    m /= 2 * R + 1;
    if (m > 0) { A[k] = TA[k] * m; B[k] = TB[k] * m; }
  }
  return part ? { A, B, part: part / n, longueur: part * L / n } : null;
}

// LA JUMELLE NE TOUCHE PERSONNE, ET CELA SE CALCULE (v423). Là où la section
// n'a qu'une voie, la file et sa jumelle roulent sur la même ligne, une
// demi-voiture d'écart dans la grille : la file s'y resserre de moitié. On
// fait rouler tout le monde sur un tour — la file, la jumelle, le bus — et
// deux voisines de la ligne (rangées par leur heure de passage) ne doivent
// jamais se toucher. Sinon pas de jumelle : une file qui se traverse est pire
// qu'une voie vide (v244).
export function jumelleSansContact(pA, pB, grille, nb, rangB, nbB, avecBus) {
  const { ts, ds } = grille, P = ts[ts.length - 1], L = pA.longueur;
  if (!(P > 0)) return false;
  const e = P / nb;
  const dA = (t) => {
    const k = Math.floor(t / P), r = t - k * P;
    let lo = 0, hi = ts.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ts[m] <= r) lo = m; else hi = m; }
    const u = ts[hi] > ts[lo] ? (r - ts[lo]) / (ts[hi] - ts[lo]) : 0;
    return k * L + ds[lo] + (ds[hi] - ds[lo]) * u;
  };
  const rangs = [];
  for (let k = 0; k < nb; k++) rangs.push({ s: k, p: pA, dl: DEMI_LONG_VOITURE + 0.3 });
  for (let j = 0; j < nbB; j++) rangs.push({ s: j + rangB, p: pB, dl: DEMI_LONG_VOITURE + 0.3 });
  if (avecBus) rangs.push({ s: 0.5, p: pA, dl: 3.6 });
  rangs.sort((a, b) => a.s - b.s);
  const rect = (q, cap, dl) => {
    const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux, w = DEMI_LARG_VOITURE;
    return [[q.x + ux * dl + vx * w, q.z + uz * dl + vz * w], [q.x + ux * dl - vx * w, q.z + uz * dl - vz * w],
      [q.x - ux * dl - vx * w, q.z - uz * dl - vz * w], [q.x - ux * dl + vx * w, q.z - uz * dl + vz * w]];
  };
  // les deux tracés tabulés au bloc, une fois : un tour en coûte cinq cents
  // poses de toute la ligne
  const tab = new Map();
  const table = (pc) => {
    let t = tab.get(pc);
    if (!t) {
      const n = Math.max(8, Math.ceil(L)), X = new Float64Array(n + 1), Z = new Float64Array(n + 1), C = new Float64Array(n + 1);
      for (let k = 0; k <= n; k++) { const d = k * L / n, q = pc.a(d); X[k] = q.x; Z[k] = q.z; C[k] = pc.capLisse(d); }
      t = { n, X, Z, C }; tab.set(pc, t);
    }
    return t;
  };
  // (sans rien allouer par pose : un tour d'autoroute en fait vingt mille)
  const m = rangs.length, PX = new Float64Array(m), PZ = new Float64Array(m), PC = new Float64Array(m);
  const tables = rangs.map((r) => table(r.p));
  for (let t = 0; t < P; t += Math.max(0.2, P / 500)) {
    for (let i = 0; i < m; i++) {
      const tb = tables[i], d = dA(t + P * 4 - rangs[i].s * e);
      const f = (((d % L) + L) % L) / L * tb.n, k = Math.min(tb.n - 1, Math.floor(f)), u = f - k;
      let dc = tb.C[k + 1] - tb.C[k];
      if (dc > Math.PI) dc -= 2 * Math.PI; else if (dc < -Math.PI) dc += 2 * Math.PI;
      PX[i] = tb.X[k] + (tb.X[k + 1] - tb.X[k]) * u; PZ[i] = tb.Z[k] + (tb.Z[k + 1] - tb.Z[k]) * u; PC[i] = tb.C[k] + dc * u;
    }
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      if ((PX[i] - PX[j]) ** 2 + (PZ[i] - PZ[j]) ** 2 > 64) continue;
      if (rectsSeTouchent(rect({ x: PX[i], z: PZ[i] }, PC[i], rangs[i].dl), rect({ x: PX[j], z: PZ[j] }, PC[j], rangs[j].dl))) return false;
    }
  }
  return true;
}

// --- les modèles -------------------------------------------------------------

// Une voiture de métro : caisse arrondie, bandeau vitré continu, portes, bogies.
// Le nez est plus arrondi sur la motrice que sur les remorques.
function construireRame(motrice, couleur = 0x2a6ad8) {
  const a = new Atelier();
  const L = 7.2, larg = 1.5, h = 1.6;
  const y0 = 0.75;
  // la caisse
  a.cylindre(couleur, {
    p: [0, y0 + h / 2, 0], r: [Math.PI / 2, 0, 0], e: [larg, L, h],
    haut: 0.5, bas: 0.5, seg: 12,
  });
  // les deux bouts, arrondis
  for (const s of [-1, 1]) {
    a.sphere(couleur, { p: [0, y0 + h / 2, s * L / 2], e: [larg, h, motrice ? 1.5 : 0.8], seg: 12 });
  }
  // le bandeau vitré, continu sur toute la longueur
  for (const s of [-1, 1]) {
    a.boite(0x9fd8ee, { p: [s * larg * 0.5, y0 + h * 0.62, 0], e: [0.06, 0.42, L * 0.86] });
  }
  // les portes, deux par flanc
  for (const s of [-1, 1]) {
    for (const dz of [-1.9, 1.9]) {
      a.boite(0x1a2a44, { p: [s * larg * 0.51, y0 + h * 0.42, dz], e: [0.06, 1.0, 0.9] });
    }
  }
  // la bande de livrée
  a.cylindre(0xf0f0ea, { p: [0, y0 + 0.28, 0], r: [Math.PI / 2, 0, 0], e: [larg * 1.01, L * 0.98, 0.22], haut: 0.5, bas: 0.5, seg: 12 });
  // le pare-brise et les feux de la motrice
  if (motrice) {
    a.boite(0x9fd8ee, { p: [0, y0 + h * 0.66, -L / 2 - 0.5], e: [1.0, 0.6, 0.1] });
    for (const s of [-1, 1]) {
      a.sphere(0xfff0b0, { p: [s * 0.45, y0 + 0.42, -L / 2 - 0.62], e: [0.2, 0.2, 0.12], seg: 8 });
    }
  }
  // les bogies
  for (const dz of [-2.4, 2.4]) {
    a.boite(0x2a2a30, { p: [0, y0 - 0.42, dz], e: [1.3, 0.4, 1.5] });
    for (const s of [-1, 1]) {
      for (const d2 of [-0.5, 0.5]) {
        a.cylindre(0x4a4a54, {
          p: [s * 0.66, y0 - 0.58, dz + d2], r: [0, 0, Math.PI / 2],
          e: [0.4, 0.12, 0.4], haut: 0.5, bas: 0.5, seg: 8,
        });
      }
    }
  }
  return a.finir();
}

// Une monoplace : museau pointu, ailerons avant et arrière, roues à l'air libre,
// pontons latéraux et arceau. La silhouette ne ressemble à aucune autre voiture.
function construireF1(couleur = 0xd82a2a, second = 0xf0f0ea) {
  const a = new Atelier();
  const y0 = 0.34;
  // le fond plat et le corps effilé
  a.boite(couleur, { p: [0, y0, 0], e: [0.9, 0.18, 4.6] });
  a.cylindre(couleur, { p: [0, y0 + 0.24, 0.3], r: [Math.PI / 2, 0, 0], e: [0.78, 3.4, 0.6], haut: 0.5, bas: 0.5, seg: 10 });
  // le museau, qui s'affine vers l'avant
  a.cylindre(couleur, { p: [0, y0 + 0.2, -2.1], r: [Math.PI / 2, 0, 0], e: [0.42, 1.7, 0.34], haut: 0.16, bas: 0.5, seg: 8 });
  // l'aileron avant, large et bas
  a.boite(second, { p: [0, y0 - 0.02, -2.95], e: [2.0, 0.08, 0.62] });
  for (const s of [-1, 1]) a.boite(couleur, { p: [s * 0.95, y0 + 0.12, -2.95], e: [0.08, 0.34, 0.6] });
  // les pontons
  for (const s of [-1, 1]) {
    a.cylindre(couleur, { p: [s * 0.62, y0 + 0.22, 0.5], r: [Math.PI / 2, 0, 0], e: [0.5, 1.9, 0.5], haut: 0.34, bas: 0.5, seg: 8 });
    a.boite(0x2a2a30, { p: [s * 0.85, y0 + 0.3, -0.3], e: [0.06, 0.34, 0.5] });   // l'écope
  }
  // le cockpit, l'arceau et le casque du pilote
  a.sphere(0x1a1a20, { p: [0, y0 + 0.46, -0.5], e: [0.52, 0.3, 1.0], seg: 10 });
  a.sphere(0xe8e2d0, { p: [0, y0 + 0.6, -0.5], e: [0.36, 0.34, 0.4], seg: 10 });
  a.boite(0x1a1a20, { p: [0, y0 + 0.62, -0.72], e: [0.3, 0.12, 0.06] });
  a.cylindre(second, { p: [0, y0 + 0.72, 0.05], r: [0, 0, 0], e: [0.5, 0.5, 0.16], haut: 0.5, bas: 0.5, seg: 8 });
  // la prise d'air au-dessus de la tête
  a.cylindre(couleur, { p: [0, y0 + 0.78, 0.45], r: [Math.PI / 2, 0, 0], e: [0.34, 0.9, 0.42], haut: 0.5, bas: 0.5, seg: 8 });
  // l'aileron arrière, haut et à deux plans
  for (const s of [-1, 1]) a.boite(couleur, { p: [s * 0.5, y0 + 0.62, 2.35], e: [0.08, 0.7, 0.4] });
  a.boite(second, { p: [0, y0 + 0.95, 2.35], e: [1.15, 0.09, 0.52] });
  a.boite(second, { p: [0, y0 + 0.78, 2.45], e: [1.05, 0.07, 0.32] });
  // les quatre roues, à l'air libre
  for (const sz of [-1.75, 1.9]) {
    for (const sx of [-1, 1]) {
      const r = sz > 0 ? 0.42 : 0.36;
      a.cylindre(0x1c1c22, {
        p: [sx * (0.72 + r * 0.3), y0 + r * 0.5, sz], r: [0, 0, Math.PI / 2],
        e: [r * 2, 0.42, r * 2], haut: 0.5, bas: 0.5, seg: 12,
      });
      a.cylindre(0x9aa0aa, {
        p: [sx * (0.72 + r * 0.3), y0 + r * 0.5, sz], r: [0, 0, Math.PI / 2],
        e: [r, 0.44, r], haut: 0.5, bas: 0.5, seg: 8,
      });
    }
  }
  return a.finir();
}

// Une voiture de la vraie vie, pas un empilement de cubes — Max, capture à
// l'appui : « je les veux pas en format minecraft mais en format de la vraie
// vie ». Sculptée à l'Atelier comme les rames : galbe des flancs, capot
// plongeant, pare-brise couché, montants fins, et de VRAIES vitres — on voit
// l'habitacle à travers. Deux membres : `caisse` porte tout ce qui se peint,
// son maillage fusionné reçoit un matériau à lui (userData.carrosserie, celui
// que la chaîne de la Giga-usine repeint) ; `tronc` porte le reste — roues,
// verre, optiques. Trois maillages par voiture, contre neuf à l'ancienne.
// Le profil de la caisse, vu de côté, en UNE courbe continue : nez rond,
// capot qui plonge, pare-brise couché, arche de toit, arrière fuyant. `sx`
// est l'AVANT vers le positif (l'extrusion retourne l'axe), `sy` la hauteur.
// Extrudé sur la largeur avec un chanfrein arrondi (bevel), il donne des
// flancs bombés — c'est le bevel qui fait les épaules de la voiture.
function profilCaisse() {
  // Le profil d'une hypersportive — l'expérience « réplique une Chiron »
  // demandée par Max : TRÈS basse (le toit culmine à ~1,29 pour 1,9 de
  // large), le nez émoussé et plongeant, le pare-brise profond qui part
  // loin en avant, l'arche courte au-dessus des sièges, la longue plage
  // moteur et le petit becquet de queue. Pas de logo, pas de nom : la
  // forme, rien que la forme.
  const s = new THREE.Shape();
  s.moveTo(1.7, 0.42);                                    // la lame avant, au ras du sol
  s.quadraticCurveTo(1.86, 0.56, 1.6, 0.7);               // le nez émoussé
  s.quadraticCurveTo(1.2, 0.84, 0.75, 0.88);              // le capot bas, l'aile qui monte
  s.quadraticCurveTo(0.35, 1.06, 0.02, 1.12);             // le pare-brise, profond
  s.quadraticCurveTo(-0.32, 1.18, -0.68, 1.06);           // l'arche courte du toit
  s.quadraticCurveTo(-1.1, 0.88, -1.42, 0.8);             // la plage moteur
  s.lineTo(-1.58, 0.78);                                  // le becquet de queue
  s.quadraticCurveTo(-1.72, 0.7, -1.62, 0.48);            // la poupe, pleine
  s.lineTo(1.7, 0.42);                                    // le dessous
  return s;
}

// La verrière : l'arc du profil entre le bas du pare-brise et la plage
// arrière, refermé par la ligne de ceinture. Extrudée un peu PLUS LARGE que
// la caisse, elle l'enveloppe d'une coque de verre fumé — c'est elle qui
// fait l'habitacle sombre et galbé de la vraie vie.
function profilVerriere() {
  const s = new THREE.Shape();
  s.moveTo(0.78, 0.86);                                   // le bas du pare-brise
  s.quadraticCurveTo(0.35, 1.08, 0.02, 1.14);
  s.quadraticCurveTo(-0.32, 1.21, -0.7, 1.08);
  s.quadraticCurveTo(-0.88, 0.98, -0.98, 0.9);            // la plage arrière
  s.lineTo(0.78, 0.86);                                   // la ligne de ceinture
  return s;
}

// Souder puis lisser : l'extrusion sort des normales À FACETTES — la coque
// était courbe mais éclairée comme un origami, et Max la voyait « cubique ».
// On indexe les sommets confondus et on remoyenne les normales : la lumière
// glisse alors d'une facette à l'autre, et le galbe devient continu.
function lisser(geo) {
  const p = geo.attributes.position;
  const vus = new Map();
  const index = [];
  for (let i = 0; i < p.count; i++) {
    const k = `${Math.round(p.getX(i) * 500)}|${Math.round(p.getY(i) * 500)}|${Math.round(p.getZ(i) * 500)}`;
    let j = vus.get(k);
    if (j === undefined) { j = i; vus.set(k, i); }
    index.push(j);
  }
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

function extruderProfil(shape, largeur, arrondi) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: largeur, curveSegments: 12,
    bevelEnabled: true, bevelThickness: arrondi, bevelSize: arrondi * 0.8,
    bevelSegments: 5,
  });
  geo.rotateY(Math.PI / 2);                               // la largeur suit x, l'avant part vers -z
  geo.translate(-largeur / 2, 0, 0);                      // centré sur l'axe
  return lisser(geo);
}

export function construireVoitureRoute(couleur = 0x9a9a9a) {
  const a = new Atelier();
  const BLANC = 0xffffff, NOIR = 0x14161a, SOMBRE = 0x26262c, ARGENT = 0xcfd4da;
  // tout ce qui se repeint est posé blanc : la teinte vient du matériau
  a.membre('caisse');
  a.geometrie(extruderProfil(profilCaisse(), 1.34, 0.3), BLANC, {});               // la coque, basse et large
  for (const sx of [-1, 1]) {
    a.boite(BLANC, { p: [sx * 0.95, 0.88, -0.45], e: [0.11, 0.05, 0.14] });        // rétroviseur
    // Les AILES BOMBÉES au-dessus des roues : les hanches de l'hypersportive.
    a.sphere(BLANC, { p: [sx * 0.78, 0.66, -1.25], e: [0.55, 0.34, 1.0], seg: 12 });
    a.sphere(BLANC, { p: [sx * 0.8, 0.68, 1.25], e: [0.58, 0.36, 1.05], seg: 12 });
  }
  // La verrière a son membre À ELLE : verre fumé quasi opaque, reflets du ciel.
  a.membre('verriere');
  a.geometrie(extruderProfil(profilVerriere(), 1.36, 0.3), 0xffffff, { p: [0, 0.02, 0] });
  a.membre('tronc');
  // La LIGNE EN C sur le flanc, qui sépare les deux tons comme sur la vraie.
  for (const sx of [-1, 1]) {
    const arc = new THREE.TorusGeometry(0.4, 0.05, 6, 18, Math.PI * 1.15);
    arc.rotateZ(Math.PI * 0.42);                          // l'ouverture regarde l'avant-haut
    arc.rotateY(Math.PI / 2);                             // dans le plan du flanc
    a.geometrie(arc, SOMBRE, { p: [sx * 0.92, 0.72, 0.1] });
  }
  // LA FACE AVANT — c'est elle qu'on regarde en premier sur la photo :
  // le fer à cheval VERTICAL, les quadruples phares dans leur bandeau
  // sombre, la grande bouche basse et la lame.
  a.sphere(NOIR, { p: [0, 0.58, -1.96], e: [0.4, 0.5, 0.26], seg: 12 });           // le fer à cheval
  a.boite(0x1a1e24, { p: [0, 0.4, -1.9], e: [1.34, 0.16, 0.16] });                 // la bouche basse
  a.boite(SOMBRE, { p: [0, 0.32, -1.92], e: [1.62, 0.08, 0.3] });                  // la lame avant
  a.boite(SOMBRE, { p: [0, 0.4, 1.82], e: [1.6, 0.2, 0.3] });                      // le diffuseur
  a.boite(0xd83a2a, { p: [0, 0.84, 1.88], e: [1.46, 0.06, 0.08] });                // la barre de feux
  // L'AILERON déployé : deux jambes, une lame.
  for (const sx of [-1, 1]) a.boite(SOMBRE, { p: [sx * 0.42, 0.92, 1.5], e: [0.07, 0.22, 0.16] });
  a.boite(SOMBRE, { p: [0, 1.05, 1.52], r: [0.14, 0, 0], e: [1.44, 0.05, 0.34] }); // la lame de l'aileron
  for (const sx of [-1, 1]) {
    a.boite(0x22262c, { p: [sx * 0.56, 0.74, -1.88], e: [0.38, 0.12, 0.1] });      // le bandeau de phare
    for (let k = 0; k < 4; k++) {
      a.boite(0xfff7d8, { p: [sx * (0.42 + k * 0.1), 0.74, -1.93], e: [0.055, 0.07, 0.05] }); // les 4 LED
    }
    a.cylindre(0x1c1c22, { p: [sx * 0.3, 0.46, 1.94], r: [Math.PI / 2, 0, 0],
      e: [0.14, 0.12, 0.14], seg: 8 });                                            // l'échappement
    // LA ROUE : pneu, fond de jante sombre, six rayons d'argent, moyeu —
    // un disque plein ne ressemble à rien de la vraie vie.
    for (const sz of [-1.25, 1.25]) {
      a.cylindre(0x141418, { p: [sx * 0.94, 0.4, sz], r: [0, 0, Math.PI / 2],
        e: [0.84, 0.28, 0.84], seg: 14 });                                         // le pneu
      a.cylindre(0x2e3236, { p: [sx * 0.95, 0.4, sz], r: [0, 0, Math.PI / 2],
        e: [0.6, 0.29, 0.6], seg: 12 });                                           // le fond de jante
      for (const th of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
        a.boite(ARGENT, { p: [sx * 0.97, 0.4, sz], r: [th, 0, 0], e: [0.05, 0.56, 0.09] }); // les rayons
      }
      a.cylindre(ARGENT, { p: [sx * 0.98, 0.4, sz], r: [0, 0, Math.PI / 2],
        e: [0.14, 0.3, 0.14], seg: 8 });                                           // le moyeu
    }
  }
  const g = a.finir();
  // LE BI-TON de la vraie : clair à l'avant, sombre à l'arrière, la coupure
  // suit la ligne en C. Peint dans les SOMMETS de la coque — le matériau
  // multiplie, donc la chaîne repeint toujours d'une seule teinte, déclinée.
  const mc = g.userData.membres.caisse.children[0];
  const pos = mc.geometry.attributes.position, col = mc.geometry.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getZ(i) + 0.2) / 0.55));
    // 0,65 devant, 0,065 derrière. Le 0,65 compense l'éclairage de la scène
    // (ambiant + soleil doublent presque la teinte : un rouge profond
    // ressortait rose layette) ; il vit ICI, dans les sommets, pour que la
    // peinture de la chaîne — qui refixe material.color — le garde. Et
    // l'arrière à un dixième : tout facteur plus doux se délavait en gris.
    const v = 0.65 * (1 - 0.9 * t * t * (3 - 2 * t));
    col.setXYZ(i, v, v, v);
  }
  col.needsUpdate = true;
  // Une peinture LAQUÉE : le spéculaire Phong fait glisser un reflet sur le
  // galbe — le passage de l'argile à la laque. PAS de carte d'environnement :
  // une CubeTexture de canvases cassait l'échantillonnage et blanchissait
  // toute la voiture, bi-ton compris — vérifié en bissection de matériaux.
  const rt = refletsVoiture();
  const peint = new THREE.MeshPhongMaterial({
    color: couleur, shininess: 80, specular: 0x8a9098, vertexColors: true,
    envMap: rt ? rt.texture : null, combine: THREE.MixOperation, reflectivity: 0.22,
  });
  mc.material = peint;
  g.userData.carrosserie = peint;
  const verriere = g.userData.membres.verriere.children[0];
  verriere.material = new THREE.MeshPhongMaterial({
    color: 0x0e161f, shininess: 130, specular: 0xbbccdd,
    envMap: rt ? rt.texture : null, combine: THREE.MixOperation, reflectivity: 0.4,
    transparent: true, opacity: 0.78,
  });
  if (rt) { mc.layers.set(COUCHE_CARROSSERIE); verriere.layers.set(COUCHE_CARROSSERIE); }
  return g;
}

// Le bus de ville : long, haut, une bande de fenêtres continue — la
// silhouette qu'un enfant reconnaît avant même de lire « bus ». La teinte
// vient de la ville (rouge à Londres, jaune ailleurs…), stable par graine.
function construireBus(couleur = 0xd84a3a) {
  const g = new THREE.Group();
  const caisse = new THREE.MeshBasicMaterial({ color: couleur });
  const boite = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      mat instanceof THREE.Material ? mat : new THREE.MeshBasicMaterial({ color: mat }));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  boite(2.1, 1.5, 6.4, caisse, 0, 1.15, 0);                       // la caisse haute
  boite(2.12, 0.6, 5.9, 0x9fc8e8, 0, 1.55, 0);                    // la bande de fenêtres
  boite(2.0, 0.12, 6.4, 0xf0f0ea, 0, 1.96, 0);                    // le toit clair
  boite(1.9, 0.5, 0.15, 0x9fc8e8, 0, 1.1, -3.2);                  // le pare-brise
  boite(0.5, 1.1, 0.12, 0x2a2a30, 0.7, 0.9, 3.2);                 // la porte arrière
  for (const sz of [-2.2, 2.2]) {
    for (const sx of [-1, 1]) {
      const roue = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10),
        new THREE.MeshBasicMaterial({ color: 0x1c1c22 }));
      roue.rotation.z = Math.PI / 2;
      roue.position.set(sx * 1.0, 0.42, sz);
      g.add(roue);
    }
  }
  g.userData.carrosserie = caisse;
  return g;
}

// --- les convois -------------------------------------------------------------

class Convoi {
  constructor(scene, parcours, opts) {
    this.parcours = parcours;
    this.vitesse = opts.vitesse;
    this.distance = opts.depart || 0;
    this.ecart = opts.ecart ?? 8;
    this.nom = opts.nom || 'véhicule';
    this.route = opts.route || null;      // le corridor interurbain qu'il suit (v300), ou null
    this.emoji = opts.emoji || '🚗';
    // À quelle hauteur, au-dessus du tracé, on est assis dedans.
    this.assise = opts.assise ?? 1.2;
    // `freine` : la vitesse suit le tracé. Une rame de métro garde la sienne —
    // elle roule sur des rails — mais une monoplace ralentit en épingle et
    // relance en ligne droite. `allureMin` est la part de vitesse qu'il lui
    // reste dans le virage le plus serré.
    // À partir de quelle distance on cesse de le dessiner. Voir VU_SOUTERRAIN.
    this.vu = opts.vu ?? (opts.souterrain ? VU_SOUTERRAIN : VU);
    // La Jaune de Washington sort de terre pour franchir le Potomac sur son
    // pont : là, et là seulement, elle se voit de loin comme un convoi de
    // surface. `decouvert(p)` répond « ce point est-il à l'air libre ? » —
    // c'est main.js qui le branche, car lui seul connaît le monde.
    this.decouvert = opts.decouvert || null;
    this.freine = !!opts.freine;
    this.allureMin = opts.allureMin ?? 0.35;
    // UN VÉHICULE ROUTIER CÈDE LE PASSAGE ET S'INCLINE DANS LE VIRAGE (v244).
    // Un métro et un train roulent sur des rails : ils ne font ni l'un ni
    // l'autre. `routier` déclare la voiture, le bus, la monoplace.
    this.routier = !!opts.routier;
    // UN TRAIN S'ARRÊTE DEVANT L'ENFANT (v304). Il ne cède à personne d'autre
    // — un train ne fait pas la queue au carrefour — mais il ne passe pas au
    // travers de ce qui est sur sa voie : `cederLePassage` pose `bloque`.
    this.rail = !!opts.rail;
    this.bloque = false;
    // CHAQUE VOITURE CÈDE POUR ELLE-MÊME, ET LE CONVOI EST ÉLASTIQUE. Un convoi
    // n'a qu'une distance pour toutes ses voitures ; arrêter le convoi entier
    // laissait celle qui était déjà dans le carrefour en travers de la voie de
    // l'autre. `retard[i]` est ce que la voiture i a laissé filer en attendant :
    // elle reste sur place pendant que le convoi avance, puis rattrape à une
    // fois et demie l'allure. Celle qui suit fait la queue derrière elle.
    this.retard = new Float64Array(opts.nb);
    this.attend = new Uint8Array(opts.nb);       // ce tour-ci, quelqu'un est devant
    // CE QU'ELLE A RÉELLEMENT AVANCÉ, rapporté à ce que le convoi a avancé
    // (v283). C'est la leçon de `vitesseVoiture` (v272) un étage plus bas :
    // l'allure se DÉDUISAIT de `attend` et de `retard`, et le plancher de
    // non-télescopage arrête une voiture SANS poser `attend` — elle aurait
    // gardé ses roues qui tournent, son moteur à plein régime et, pire, les
    // piétons se seraient écartés devant une voiture immobile (v259). On publie
    // donc ce qu'on a OBTENU, jamais ce qu'on demandait ; les trois cas d'avant
    // en ressortent d'eux-mêmes — 0 si elle attend, 1,5 si elle rattrape, 1
    // sinon.
    this.rapport = new Float32Array(opts.nb).fill(1);
    this.retardAvant = new Float64Array(opts.nb);   // le tampon du tour, jamais alloué par image
    this.attenteDepuis = new Float32Array(opts.nb);
    // LA VITESSE PROPRE DE CHAQUE VOITURE (v372). La grille horaire (v305) dit
    // où va le convoi ; ce qui reste LOCAL — un feu rouge, la voiture d'avant
    // qui freine, l'enfant sur la chaussée — se joue ici, et ne se joue plus
    // d'un coup : `cible[i]` est l'allure que la voiture peut viser devant ce
    // qui l'arrête (√(2·a·s), `circulation.js`), `vLoc[i]` celle qu'elle a,
    // qui n'y descend qu'au freinage d'une vraie voiture. Ce qu'elle laisse
    // filer devient son `retard`, exactement comme avant.
    this.vLoc = new Float32Array(opts.nb).fill(-1);       // −1 : pas encore lancée
    this.cible = new Float32Array(opts.nb).fill(Infinity);
    // une voiture heurtée par l'enfant s'arrête, feux de détresse (v372)
    this.heurte = new Float32Array(opts.nb);
    this.urgence = new Uint8Array(opts.nb);
    this.cause = new Uint8Array(opts.nb);          // 0 libre · 1 un feu (ou la file d'un feu) · 2 autre chose
    // LE PROFIL DE VITESSE (v372) : `limite(x, z)` rend l'allure permise en
    // un point du tracé (la rue, l'autoroute, l'entrée de ville), `facteur` le
    // conducteur de ce convoi. Sans profil, l'ancienne marche (`freine`).
    this.profil = opts.profil || null;
    this.suit = opts.suit || null;
    this.demiLong = opts.demiLong ?? DEMI_LONG_VOITURE;
    this.repart = new Float32Array(opts.nb);     // secondes pendant lesquelles on n'attend plus
    // `relooke(mesh, distanceAbsolue, rang)` : appelé à chaque image sur
    // chaque élément visible. C'est lui qui peint les voitures de la chaîne
    // de la Giga-usine — grises avant le tunnel de peinture, colorées après.
    this.relooke = opts.relooke || null;
    this.vitesseActuelle = opts.vitesse;
    this.dernierDt = 0;
    // LES ARRÊTS. Un métro qui ne s'arrête jamais n'est pas un métro : il
    // traverse la station à huit mètres par seconde, la fenêtre pour monter
    // dure une seconde, et un enfant de sept ans la rate à tous les coups.
    // `arrets` donne les distances, le long du tracé, où la tête doit
    // s'immobiliser — et `pause` combien de temps les portes restent ouvertes.
    this.arrets = (opts.arrets || []).slice().sort((a, b) => a - b);
    this.pause = opts.pause ?? 5;
    this.attente = 0;
    // UN CONVOI NE FABRIQUE PAS CE QUE PERSONNE NE VOIT (v235).
    //
    // Il naissait avec ses vingt voitures d'un coup — et une voiture coûte
    // TRENTE-DEUX MAILLAGES (v201). Or un convoi ne se montre qu'à
    // quarante-cinq blocs : les huit circuits de Paris, instanciés quand
    // l'avion franchit leur rayon de deux cent vingt blocs, fabriquaient donc
    // cinq mille maillages que personne ne pouvait voir avant deux secondes
    // de vol. Mesuré au profil : **557 ms dans une seule image**, l'écran
    // figé — « il y a vraiment un lag », signalé par Max.
    //
    // Chaque place reste donc VIDE jusqu'à ce qu'elle entre dans le champ.
    // Rien ne change à l'écran : on fabrique au moment exact où l'on aurait
    // rendu le modèle visible. Et `place(i)` continue de répondre pour une
    // place vide, parce qu'elle se calcule sur le TRACÉ et jamais sur le
    // maillage — c'est ce qui permet de monter dans un convoi qu'on rejoint.
    this.scene = scene;
    this.nb = opts.nb;
    this.faireModele = opts.modele;
    this.elements = new Array(opts.nb).fill(null);
  }

  // La voiture numéro i, fabriquée si c'est la première fois qu'on la voit.
  element(i) {
    let m = this.elements[i];
    if (!m) {
      m = this.faireModele(i);
      m.visible = false;
      this.scene.add(m);
      this.elements[i] = m;
    }
    return m;
  }

  // Où se trouve la place assise de l'élément i, en ce moment même.
  //
  // C'est recalculé depuis le tracé, jamais lu sur le maillage : loin du
  // joueur les modèles sont cachés et leur position est périmée, alors que le
  // convoi, lui, continue de rouler. On peut donc demander « où est la rame ? »
  // même quand elle est à l'autre bout de la ville.
  // Où en est la voiture i le long du tracé : sa place dans le convoi, moins
  // ce qu'elle a laissé filer en cédant le passage.
  dElement(i) {
    if (this.base && this.baseFaite) return this.base[i] - this.retard[i];
    return this.distance - i * this.ecart - (this.retard ? this.retard[i] : 0);
  }

  // La queue peut traîner plus loin que `ecart × (n − 1)` : de tout ce que ses
  // voitures ont laissé filer en cédant le passage.
  retardMax() {
    let m = 0;
    if (this.retard) for (let i = 0; i < this.retard.length; i++) if (this.retard[i] > m) m = this.retard[i];
    return m;
  }

  place(i, avance = 0) {
    const p = this.parcours.a(this.dElement(i) + avance);
    return { x: p.x, y: p.y + this.assise, z: p.z, cap: p.cap };
  }

  // LA GRILLE HORAIRE DU CONVOI (v305). Max, en ligne : « les utilisateurs ne
  // voient pas les mêmes voitures en même temps ». Chaque tablette faisait
  // avancer ses convois de son propre `dt`, depuis sa propre naissance du
  // convoi — l'hôte et l'invité avaient donc deux circulations sans rapport,
  // et la voiture de Marlon, garée sur la rue chez lui, était au milieu d'un
  // convoi chez Alice.
  //
  // La position d'un convoi n'est plus une SOMME de pas, c'est une FONCTION
  // d'une horloge : `distanceA(h)`. Deux tablettes qui ont la même horloge
  // ont la même circulation, et l'hôte la donne avec l'heure du ciel
  // (`adopterHorloge`). La grille se calcule une fois : à vitesse constante,
  // une droite ; avec des arrêts, des paliers de `pause` secondes à chaque
  // quai ; avec `freine`, la marche d'avant — la consigne du virage et son
  // inertie — SIMULÉE sur un tour au pas d'un vingtième de seconde, pour que
  // la monoplace et la voiture de ville freinent exactement comme avant.
  horaire() {
    if (this._horaire !== undefined) return this._horaire;
    const L = this.parcours.longueur;
    if (!(L > 0) || !(this.vitesse > 0)) { this._horaire = null; return null; }
    const ts = [0], ds = [0];
    if (this.profil) {
      // LA VITESSE DE LA RUE (v372) : la limite de la voie, l'allure des
      // virages, le freinage AVANT et l'accélération d'une vraie voiture,
      // calculés une fois sur le tour (`circulation.js`, pur).
      const pr = this.profil, par = this.parcours;
      const lim = typeof pr.limite === 'function'
        ? (d) => { const q = par.a(d); return pr.limite(q.x, q.z) * (pr.facteur || 1); }
        : () => this.vitesse * (pr.facteur || 1);
      const prof = pr.calcule || profilVitesse({ longueur: L, capA: (d) => par.capLisse(d), limiteA: lim });
      const g = grilleDuProfil(prof);
      this.profilCalcule = prof;
      this._horaire = { ts: g.ts, ds: g.ds, P: g.ts[g.ts.length - 1], L };
      // les voitures se suivent à intervalle de TEMPS égal : un tour divisé
      // par leur nombre, et une queue qui retombe sur la tête au tour suivant
      this.dtVoiture = this._horaire.P / Math.max(1, this.nb);
      this.phase = this.tempsA(this.distance);
      // le bus prend la grille de son anneau, à mi-temps entre deux voitures
      if (this.suit && this.suit.horaire()) this.phase = this.suit.phase - (this.suit.dtVoiture || 0) / 2;
      // LA JUMELLE D'UNE SECONDE VOIE (v423) : l'intervalle de sa file, et une
      // demi-voiture (ou une et demie, quand le bus prend la première place)
      // derrière elle — la même fonction de l'horloge sur toutes les tablettes
      if (this.jumeauDe && this.jumeauDe.horaire()) {
        this.dtVoiture = this.jumeauDe.dtVoiture;
        this.phase = this.jumeauDe.phase - this.dtVoiture * this.rangJumeau;
      }
      return this._horaire;
    }
    if (this.freine) {
      const h = 0.05;
      const vise = (d) => this.vitesse * Math.max(this.allureMin,
        1 - (this.parcours.virageDevant(d) / (Math.PI / 3)) * (1 - this.allureMin));
      // un premier tour pour que l'inertie oublie son point de départ, le
      // second enregistré — c'est le régime établi, périodique
      let v = this.vitesse, d = 0, t = 0;
      while (d < L) { v += (vise(d) - v) * Math.min(1, h * 2.2); d += v * h; t += h; }
      const t0 = t - (d - L) / v;
      while (d < 2 * L) {
        v += (vise(d) - v) * Math.min(1, h * 2.2); d += v * h; t += h;
        if (d < 2 * L) { ts.push(t - t0); ds.push(d - L); }
      }
      ts.push(t - (d - 2 * L) / v - t0); ds.push(L);
    } else {
      const v = this.vitesse, pause = this.pause;
      let t = 0, prec = 0;
      // un quai à zéro se prend en fin de tour : c'est là que la rame arrive
      const quais = this.arrets.map((q) => (((q % L) + L) % L) || L).sort((x, y) => x - y);
      for (const q of quais) {
        if (q < prec) continue;
        t += (q - prec) / v; ts.push(t); ds.push(q);
        t += pause; ts.push(t); ds.push(q);
        prec = q;
      }
      if (prec < L) { t += (L - prec) / v; ts.push(t); ds.push(L); }
    }
    const P = ts[ts.length - 1];
    this._horaire = { ts: Float64Array.from(ts), ds: Float64Array.from(ds), P, L };
    // la phase : à l'horloge zéro, le convoi est là où il naissait avant
    this.phase = this.tempsA(this.distance);
    return this._horaire;
  }

  // Le temps de grille où la tête ARRIVE à la distance d (avant sa pause).
  tempsA(d) {
    const { ts, ds, P, L } = this._horaire;
    const n = Math.floor(d / L), r = d - n * L;
    let lo = 0, hi = ds.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (ds[m] < r) lo = m + 1; else hi = m; }
    if (lo === 0 || ds[lo] === r) return n * P + ts[lo];
    const k = lo - 1;
    return n * P + ts[k] + (ts[lo] - ts[k]) * (r - ds[k]) / (ds[lo] - ds[k]);
  }

  // Où est la tête à l'horloge h, sa vitesse, et ce qu'il reste de pause.
  distanceA(h) {
    const { ts, ds, P, L } = this._horaire;
    const tau = h + this.phase;
    const n = Math.floor(tau / P), r = tau - n * P;
    let lo = 0, hi = ts.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ts[m] <= r) lo = m; else hi = m; }
    const dt = ts[hi] - ts[lo], dd = ds[hi] - ds[lo];
    const u = dt > 0 ? (r - ts[lo]) / dt : 0;
    return { d: n * L + ds[lo] + dd * u, v: dt > 0 ? dd / dt : 0, pause: dd === 0 ? ts[hi] - r : 0 };
  }

  // CHAQUE VOITURE SUIT LA GRILLE À SON HEURE, PAS À LA DISTANCE DE LA TÊTE
  // (v372). Un convoi avançait d'un bloc : toutes ses voitures avançaient d'un
  // bloc, à la vitesse que la grille donnait à la TÊTE — une voiture dans un
  // virage le prenait à l'allure de la ligne droite où roulait la tête. Avec
  // des vitesses qui vont de onze à cinquante km/h dans la même rue, c'est
  // visible. La voiture i passe donc partout `i × dtVoiture` secondes après la
  // tête : elle freine là où le virage est, la file se resserre dans le coin
  // et se détend dans la ligne droite — d'elle-même, et la même sur toutes
  // les tablettes (une fonction de l'horloge, v305).
  updateProfil(dt, joueur, horloge) {
    this.dernierDt = dt;
    this.horaire();
    if (!this._horaire) { this.montrer(joueur); return; }
    if (this.bloque) this.decalage = (this.decalage || 0) + dt;
    const h0 = horloge - (this.decalage || 0);
    const n = this.nb;
    if (!this.base) { this.base = new Float64Array(n); this.vGrille = new Float32Array(n); }
    const avantTete = this.distance;
    const pos0 = this.distanceA(h0);
    const saut = !this.baseFaite || Math.abs(pos0.d - avantTete) > Math.max(30, this.vitesse * 4);
    const ancien = this.retardAvant;           // tampon réutilisé : l'ancienne base
    ancien.set(this.base);
    for (let i = 0; i < n; i++) {
      const p = i === 0 ? pos0 : this.distanceA(h0 - i * this.dtVoiture);
      this.base[i] = p.d; this.vGrille[i] = p.v;
    }
    this.distance = pos0.d;
    this.vitesseActuelle = pos0.v;
    this.attente = 0;
    if (saut) {
      this.baseFaite = true;
      this.retard.fill(0); this.vLoc.fill(-1); this.rapport.fill(1);
      this.montrer(joueur);
      return;
    }
    // Ce que chaque voiture vise (`cible`, posé par `cederLePassage`), ou la
    // grille, ou un peu plus pour rattraper ; elle y va au rythme d'une voiture
    // (`rapprocher`) — ce qu'elle n'a pas fait devient du retard.
    // (un bloc entre deux pare-chocs EN LIGNE DROITE depuis la v429 : le
    // balayage serré arrête la suiveuse vers 1,2, le plancher ne doit pas la
    // retenir à 1,6. Mais dans un virage la corde est plus courte que l'arc et
    // les coins se touchent — mesuré à Tokyo, 19 relevés « file à l'arrêt » —
    // on y garde le 1,6 d'avant.)
    const miniDroit = 2 * this.demiLong + 1.0, miniVirage = 2 * this.demiLong + 1.6;
    for (let i = 0; i < n; i++) {
      const pas = this.base[i] - ancien[i];
      const vConv = dt > 0 ? Math.max(0, pas / dt) : 0;
      if (this.heurte[i] > 0) this.heurte[i] = Math.max(0, this.heurte[i] - dt);
      let vise = this.heurte[i] > 0 ? 0 : this.cible[i];
      // rattraper, oui, mais pas à soixante-dix dans Paris : trois blocs par
      // seconde de plus que la grille au plus
      const libre = this.retard[i] > 0.05 ? Math.min(vConv * 1.3, vConv + 3) : vConv;
      if (vise > libre) vise = libre;
      let v = this.vLoc[i] < 0 ? vConv : this.vLoc[i];
      v = (vise >= vConv && this.retard[i] <= 0.05) ? vConv : rapprocher(v, vise, dt);
      // CONTACT IMMINENT : l'autre est déjà au ras du capot — on s'arrête là,
      // sans attendre le freinage (v372)
      if (this.urgence[i]) v = 0;
      let r = this.retard[i] + pas - v * dt;
      if (r < 0) r = 0;
      // UN CONVOI NE SE TÉLESCOPE PAS (v283), par construction : la suiveuse
      // garde une longueur de voiture derrière celle qui la précède.
      // (la courbure sous la suiveuse ET devant elle, là où est la précédente)
      const dq = this.base[i] - r;
      const mini = Math.abs(this.parcours.courbure(dq)) > 0.03 || Math.abs(this.parcours.courbure(dq + 3)) > 0.03
        || Math.abs(this.parcours.courbure(dq + 5)) > 0.03 ? miniVirage : miniDroit;
      if (i > 0) {
        const plancher = this.retard[i - 1] - (this.base[i - 1] - this.base[i]) + mini;
        if (r < plancher) r = plancher;
      }
      // ET UNE LIGNE NON PLUS (v423) : là où la jumelle d'une seconde voie
      // partage la voie de sa file, la voiture qui la précède sur la ligne est
      // dans l'AUTRE convoi. La grille les garde à distance (`jumelleSansContact`) ;
      // un freinage local (un feu, l'enfant) ne doit pas les faire entrer l'une
      // dans l'autre. On lit l'autre convoi tel qu'il est à cette image.
      const devant = this.devantSurLaLigne(i);
      if (devant) {
        const plancher = this.base[i] - devant.dElement(devant.iDevant) + mini;
        if (r < plancher) r = plancher;
      }
      // LE RETARD D'UNE VOITURE QUE PERSONNE NE VOIT SE REND (v372). Chaque feu
      // rouge en ajoute ; rendu à 30 % de l'allure, il s'accumulerait d'un feu
      // à l'autre et la file finirait par s'étirer sur des centaines de blocs
      // derrière sa grille. Loin de l'enfant (aucune `cible`, hors de la portée
      // de la rue), on la remet à sa place en douceur — personne ne la voit.
      if (r > 0 && this.cible[i] === Infinity && i > 0 && this.retard[i - 1] < r) {
        const q = this.parcours.a(this.base[i] - r);
        if ((q.x - joueur.x) ** 2 + (q.z - joueur.z) ** 2 > (VU_VOITURE + 15) ** 2) r = Math.max(this.retard[i - 1], r - Math.max(2, r) * dt);
      } else if (r > 0 && i === 0 && this.cible[0] === Infinity) {
        const q = this.parcours.a(this.base[0] - r);
        if ((q.x - joueur.x) ** 2 + (q.z - joueur.z) ** 2 > (VU_VOITURE + 15) ** 2) r = Math.max(0, r - Math.max(2, r) * dt);
      }
      const obtenu = pas - (r - this.retard[i]);
      this.retard[i] = r;
      this.vLoc[i] = dt > 0 ? Math.max(0, Math.min(obtenu / dt, Math.max(v, vConv + 3))) : 0;
      this.rapport[i] = vConv > 0.01 ? this.vLoc[i] / vConv : (this.vLoc[i] > 0.01 ? 1 : 0);
    }
    this.montrer(joueur);
  }

  // La voiture de l'AUTRE file qui précède la voiture i sur la ligne, là où
  // les deux voies n'en font qu'une (v423), ou null. Les rangs se lisent dans
  // la grille : la jumelle est `rangJumeau` intervalles derrière sa file.
  devantSurLaLigne(i) {
    const B = this.jumeauDe ? this : this.jumelle, A = this.jumeauDe || this;
    if (!B || !B.baseFaite || !A.baseFaite || !(B.parcours instanceof ParcoursDecale)) return null;
    const d = this.base[i] - this.retard[i];
    if (Math.abs(B.parcours.decalageA(d)) > 2 * DEMI_LARG_VOITURE + 0.3) return null;
    const r = B.rangJumeau;
    let autre, j;
    if (this === B) { autre = A; j = i + Math.floor(r); }       // la voiture de la file juste devant
    else { autre = B; j = i - Math.ceil(r); }                   // la jumelle juste devant
    if (j < 0 || j >= autre.nb || autre.pris.has(j)) return null;
    autre.iDevant = j;
    return autre;
  }

  // L'allure que la grille donne à la voiture i, là où ELLE est (v372).
  vGrilleDe(i) { return this.vGrille && this.baseFaite ? this.vGrille[i] : (this.vitesseActuelle ?? this.vitesse); }

  // Où s'étend le convoi le long du tracé, de la tête à la queue (v372) : avec
  // la grille par voiture, l'écart n'est plus constant.
  etendue() {
    if (this.base) return Math.max(0, this.base[0] - this.base[this.nb - 1]) + this.retardMax();
    return this.ecart * (this.nb - 1) + this.retardMax();
  }

  update(dt, joueur, horloge = null) {
    if (this.profil && horloge !== null) return this.updateProfil(dt, joueur, horloge);
    this.dernierDt = dt;
    const avantTout = this.distance;
    const grille = horloge !== null ? this.horaire() : null;
    if (grille) {
      // devant l'enfant, un train attend comme à quai — sans limite (v304) —
      // et le temps qu'il a perdu se déduit de sa grille : il repart d'où il
      // s'était arrêté, il ne saute pas à l'heure.
      if (this.bloque) this.decalage = (this.decalage || 0) + dt;
      const pos = this.distanceA(horloge - (this.decalage || 0));
      this.attente = pos.pause;
      this.vitesseActuelle = pos.v;
      // UN SAUT D'HORLOGE N'EST PAS UNE AVANCE. L'invité qui adopte l'heure de
      // l'hôte, ou une tablette qui se réveille : on se POSE à la bonne place,
      // et ce que chaque voiture avait laissé filer en cédant le passage
      // repart de zéro — sinon un saut de cent blocs deviendrait cent blocs de
      // retard pour la voiture qui attendait.
      const saut = Math.abs(pos.d - avantTout) > Math.max(20, this.vitesse * 3);
      this.distance = pos.d;
      if (saut || pos.d <= avantTout) {
        if (saut && this.retard) { this.retard.fill(0); this.vLoc.fill(-1); }
        if (this.routier) this.rapport.fill(0);
        this.montrer(joueur);
        return;
      }
    } else {
    if (this.attente > 0) {
      // à quai : on ne bouge pas, mais on continue de se montrer ou de se
      // cacher selon la distance au joueur
      this.attente -= dt;
      this.montrer(joueur);
      return;
    }
    // devant l'enfant, un train attend comme à quai — sans limite (v304)
    if (this.bloque) { this.montrer(joueur); return; }
    if (this.freine) {
      // Un demi-tour complet (π/2 sur vingt mètres) ramène à l'allure minimale ;
      // la ligne droite rend toute la vitesse. L'inertie — on ne rejoint la
      // consigne qu'à moitié par seconde — donne le freinage et la relance, et
      // c'est elle qu'on voit à l'œil, bien plus que le chiffre.
      const virage = this.parcours.virageDevant(this.distance);
      const vise = this.vitesse
        * Math.max(this.allureMin, 1 - (virage / (Math.PI / 3)) * (1 - this.allureMin));
      this.vitesseActuelle += (vise - this.vitesseActuelle) * Math.min(1, dt * 2.2);
      this.distance += this.vitesseActuelle * dt;
    } else {
      const avant = this.distance;
      this.distance += this.vitesse * dt;
      // Vient-on de franchir un arrêt ? Si oui, on s'y cale exactement — la
      // tête du convoi au droit du quai — et on ouvre les portes.
      const L = this.parcours.longueur;
      if (this.arrets.length && L > 0) {
        const d0 = ((avant % L) + L) % L, d1 = ((this.distance % L) + L) % L;
        // LE PIÈGE DES FLOTTANTS QUI GELAIT LE MÉTRO. Le recalage à quai pose
        // la rame une poignée d'ulps EN DEÇÀ de l'arrêt (l'addition-modulo
        // n'est pas exacte), et le double modulo de d0 en perd encore : au
        // redémarrage, l'arrêt paraissait toujours devant — refranchi,
        // re-pause, à l'infini. Toutes les rames de Washington gelaient une à
        // une en quelques minutes de jeu ; la première de chaque ligne dès la
        // vingt-deuxième image. La marge d'un millionième écarte ces
        // fantômes : un vrai franchissement avance d'au moins trois
        // centièmes de bloc (huit m/s au deux-cent-quarantième de seconde).
        const EPS = 1e-6;
        for (const a of this.arrets) {
          const franchi = d1 >= d0 ? (a > d0 + EPS && a <= d1) : (a > d0 + EPS || a <= d1);
          if (!franchi) continue;
          this.distance = avant + ((a - d0 + L) % L);
          this.attente = this.pause;
          break;
        }
      }
    }
    }
    // Ce que le convoi vient d'avancer ; une voiture qui attend le laisse
    // filer, une voiture en retard le rattrape à une fois et demie l'allure.
    const pas = this.distance - avantTout;
    if (this.routier && pas <= 0) this.rapport.fill(0);
    if (this.routier && pas > 0) {
      const avant = this.retardAvant;
      avant.set(this.retard);
      // Chaque voiture vise ce que `cederLePassage` lui permet (`cible`), ou
      // l'allure du convoi, ou un peu plus pour rattraper ce qu'elle a laissé
      // filer ; elle y va au rythme d'une voiture (`rapprocher`), jamais d'un
      // coup. Ce qu'elle n'a pas fait devient du retard (v372).
      const vConv = dt > 0 ? pas / dt : 0;
      for (let i = 0; i < this.nb; i++) {
        if (this.heurte[i] > 0) this.heurte[i] = Math.max(0, this.heurte[i] - dt);
        let vise = this.heurte[i] > 0 ? 0 : this.cible[i];
        const libre = vConv * (this.retard[i] > 0.05 ? 1.3 : 1);
        if (vise > libre) vise = libre;
        let v = this.vLoc[i] < 0 ? vConv : this.vLoc[i];
        v = (vise >= vConv && this.retard[i] <= 0.05) ? vConv : rapprocher(v, vise, dt);
        if (this.urgence[i]) v = 0;            // le même arrêt d'urgence que l'autre chemin
        this.retard[i] += pas - v * dt;
        if (this.retard[i] < 0) this.retard[i] = 0;
        this.vLoc[i] = v;
      }
      // UN CONVOI NE SE TÉLESCOPE PAS, ET CELA SE GARANTIT PAR CONSTRUCTION.
      //
      // Max le signale depuis plusieurs versions : une voiture passe AU TRAVERS
      // de celle qui la précède dans sa propre file. `cederLePassage` avait bien
      // de quoi le voir — le balayage d'une suiveuse touche le rectangle de sa
      // tête — mais il ne le voit que SOUS CONDITIONS : les deux voitures
      // doivent être à moins de `PORTEE_CEDE` de l'enfant ET à moins de douze
      // blocs l'une de l'autre, alors qu'un convoi espace ses voitures jusqu'à
      // vingt-cinq. Une tête qui attend au feu accumule son `retard` pendant
      // que sa suiveuse, encore hors de la fenêtre, avance à pleine allure : la
      // suiveuse la rejoint, la dépasse, et le chevauchement s'installe — il ne
      // se résorbe pas, `retard` ne se rend qu'à la moitié de l'allure.
      //
      // Un seuil de fenêtre ne peut donc pas régler cela : ce qui doit être vrai
      // se garantit par construction, jamais par l'ordre dans lequel on regarde
      // (v270). Le long du tracé, la voiture i est à
      // `dElement(i) = distance − i × ecart − retard[i]` : deux voisines gardent
      // leur longueur d'écart si et seulement si
      // `retard[i] ≥ retard[i−1] − ecart + LONG_VOITURE`. La borne est une
      // GÉOMÉTRIE, pas un réglage — 4,4 blocs, la longueur d'une voiture, lue là
      // où elle se calcule (`DEMI_LONG_VOITURE`). Elle vaut partout, y compris
      // là où l'enfant n'est pas et où le balayage ne tourne pas du tout.
      //
      // On monte donc le retard de la suiveuse, jamais on ne baisse celui de la
      // tête : reculer est la seule correction sûre. En ordre croissant, pour que
      // `retard[i − 1]` soit déjà arrêté quand on s'appuie dessus ; le convoi se
      // comporte alors en accordéon, et quand la tête rend son retard, la
      // suiveuse voit son plancher descendre et rend le sien.
      // La borne ne CRÉE jamais d'écart, elle le PRÉSERVE : sur un convoi qui
      // serait plus serré que la longueur d'une voiture — `ecart` vaut
      // `longueur / nb`, et `nb` a un plancher de six — exiger 4,4 blocs
      // repousserait chaque suiveuse un peu plus que la précédente, sans fin.
      // On ne demande donc jamais plus que l'espacement nominal.
      const mini = Math.min(2 * DEMI_LONG_VOITURE, this.ecart);
      for (let i = 1; i < this.nb; i++) {
        const plancher = this.retard[i - 1] - this.ecart + mini;
        if (this.retard[i] < plancher) this.retard[i] = plancher;
      }
      // et l'allure obtenue : ce que `dElement(i)` a réellement avancé.
      for (let i = 0; i < this.nb; i++) {
        this.rapport[i] = Math.max(0, (pas - (this.retard[i] - avant[i])) / pas);
        this.vLoc[i] = this.rapport[i] * vConv;
      }
    }
    this.montrer(joueur);
  }

  // Placer les voitures sur le tracé, ou les effacer si l'enfant est loin.
  //
  // LA PORTÉE SE TESTE VOITURE PAR VOITURE, PAS SUR LA TÊTE DU CONVOI.
  //
  // C'était le même défaut que les personnages avant la v196 — « cesser
  // d'ANIMER ne suffit pas, il faut cesser de DESSINER » — d'un cran plus
  // haut : on regardait si la TÊTE était à portée, et si oui on dessinait
  // les vingt voitures, y compris celles qui sont à l'autre bout d'une
  // boucle de quatre cent trente et un blocs. Un circuit de Paris coûtait
  // donc toutes ses voitures dès qu'on approchait d'un seul de ses points.
  //
  // Le test par convoi reste, mais comme PRÉ-FILTRE, élargi de la traînée :
  // la queue traîne d'au plus `ecart × (n − 1)` le long du tracé, et une
  // courbe est toujours plus longue que sa corde. C'est la même arithmétique
  // que `placeProche`, et elle garde le calcul bon marché pour les mille
  // circuits du monde.
  montrer(joueur) {
    // D'où l'on regardait au dernier tour : c'est ce que `diagPlace` compare
    // à la position d'aujourd'hui (v322). Trois nombres, aucune allocation.
    this.vuX = joueur.x; this.vuZ = joueur.z; this.vuT = performance.now();
    const tete = this.parcours.a(this.distance);
    const portee = (this.decouvert && this.decouvert(tete)) ? VU : this.vu;
    const trainee = this.etendue();
    if (Math.hypot(tete.x - joueur.x, tete.z - joueur.z) > portee + trainee) {
      for (const m of this.elements) if (m && m.visible) m.visible = false;
      return;
    }
    const portee2 = portee * portee;
    for (let i = 0; i < this.nb; i++) {
      if (this.pris && this.pris.has(i)) continue;
      const p = this.parcours.a(this.dElement(i));
      const dedans = (p.x - joueur.x) ** 2 + (p.z - joueur.z) ** 2 < portee2;
      // Hors du champ : on ne fabrique rien, et l'on cache ce qui existe déjà.
      if (!dedans) {
        const dejaLa = this.elements[i];
        if (dejaLa && dejaLa.visible) dejaLa.visible = false;
        continue;
      }
      if (!this.elements[i] && performance.now() > fabrication.fin
        && (p.x - joueur.x) ** 2 + (p.z - joueur.z) ** 2 > FAB_PROCHE * FAB_PROCHE) { fabrication.differees++; continue; }
      if (!this.elements[i]) fabrication.faites++;
      const m = this.element(i);
      m.position.set(p.x, p.y, p.z);
      // Le modèle est dessiné le nez vers -z ; le cap donne la direction de la
      // marche, il faut donc le retourner d'un demi-tour. Le cap est celui de
      // l'empattement (v244) : la voiture pivote en franchissant le coin.
      const d = this.dElement(i);
      m.rotation.y = this.parcours.capLisse(d) + Math.PI;
      // l'allure de CETTE voiture : arrêtée si elle attend, pressée si elle rattrape
      const allure = this.routier ? this.rapport[i] : 1;
      if (this.routier) {
        // L'INCLINAISON DANS LE VIRAGE, purement visuelle (v244). Comme pour
        // l'avion (v231), elle se compose AVANT le cap — ordre YXZ — sinon la
        // voiture basculerait autour de l'axe du MONDE. Le corps d'une voiture
        // roule vers l'EXTÉRIEUR du virage, de ce que lui impose la force
        // centrifuge : vitesse au carré fois courbure, à l'échelle de ce qu'un
        // enfant voit — quatre degrés au pire coin, rien en ligne droite.
        // Le signe a été REGARDÉ sur capture, pas déduit.
        const v = this.vGrilleDe(i) * allure;
        const vise = Math.max(-0.08, Math.min(0.08, -this.parcours.courbure(d) * v * v * 0.012));
        const roulis = m.userData.roulis === undefined ? vise : m.userData.roulis + (vise - m.userData.roulis) * Math.min(1, this.dernierDt * 6);
        m.userData.roulis = roulis;
        m.rotation.order = 'YXZ';
        m.rotation.z = roulis;
      }
      m.visible = true;
      if (this.routier) feuxDeDetresse(m, this.heurte[i] > 0);
      // LES ROUES TOURNENT AUSSI EN VILLE. Le long d'un tracé on connaît la
      // distance exacte parcourue depuis la dernière image : l'angle en
      // découle sans rien mesurer. Une voiture qui glisse sans que ses roues
      // tournent, un enfant de sept ans le voit au premier mètre.
      const roues = m.userData.roues;
      if (roues && roues.length) {
        const angle = (this.vGrilleDe(i) * allure * this.dernierDt) / (m.userData.rayonRoue || 0.34);
        for (const r of roues) r.rotation.x += angle;
      }
      if (this.relooke) {
        const L = this.parcours.longueur;
        this.relooke(m, ((d % L) + L) % L, i);
      }
    }
  }
}

// LES ÉPIS D'UN TRACÉ (v372). `chainerVoies` va jusqu'au point de croisement
// de deux avenues puis repart : quand ce point est un peu au-delà du virage,
// le tracé fait un aller-retour d'un ou deux blocs (mesuré à Paris, près de
// (−321, 325) : ouest, puis est, en deux mètres). À quinze km/h la voiture le
// faisait sans qu'on le voie ; à cinquante, elle pivote sur place et la
// suivante, qui l'a rattrapée, se trouve en travers. On retire tout sommet
// où le tracé rebrousse (plus de 120°), jusqu'à ce qu'il n'y en ait plus.
export function sansEpis(pts) {
  let out = pts.slice();
  for (let passe = 0; passe < 60; passe++) {
    const n = out.length;
    if (n < 5) return out;
    const garde = [];
    let retire = false;
    for (let i = 0; i < n; i++) {
      const a = out[(i - 1 + n) % n], b = out[i], c = out[(i + 1) % n];
      const ux = b.x - a.x, uz = b.z - a.z, vx = c.x - b.x, vz = c.z - b.z;
      const l1 = Math.hypot(ux, uz), l2 = Math.hypot(vx, vz);
      if (!retire && l1 > 1e-6 && l2 > 1e-6 && (ux * vx + uz * vz) / (l1 * l2) < -0.5) { retire = true; continue; }
      if (!retire && l1 < 0.3) { retire = true; continue; }
      garde.push(b);
    }
    if (!retire) return out;
    out = garde;
  }
  return out;
}

// UN TRACÉ FERMÉ DÉCALÉ À DROITE DE SA MARCHE (v372). La droite d'une
// direction (fx, fz) est (−fz, fx) (v271, mesurée). À chaque sommet on suit la
// bissectrice, allongée de 1/cos(θ/2) pour garder la distance aux deux côtés,
// et bornée à deux fois le décalage dans un coin très fermé.
export function decalerADroite(pts, e) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    let ux = b.x - a.x, uz = b.z - a.z, l1 = Math.hypot(ux, uz);
    let vx = c.x - b.x, vz = c.z - b.z, l2 = Math.hypot(vx, vz);
    if (l1 < 1e-6) { ux = vx; uz = vz; l1 = l2; }
    if (l2 < 1e-6) { vx = ux; vz = uz; l2 = l1; }
    if (!(l1 > 1e-6)) { out.push({ ...b }); continue; }
    ux /= l1; uz /= l1; vx /= l2; vz /= l2;
    let nx = -uz - vz, nz = ux + vx;
    const ln = Math.hypot(nx, nz);
    if (ln < 1e-6) { nx = -uz; nz = ux; } else { nx /= ln; nz /= ln; }
    const cos = nx * -uz + nz * ux;
    const k = Math.min(2, 1 / Math.max(0.5, cos));
    out.push({ ...b, x: b.x + nx * e * k, z: b.z + nz * e * k });
  }
  return out;
}

// LES FEUX DE DÉTRESSE D'UNE VOITURE HEURTÉE (v372). Quatre petits feux
// orange aux coins, qui clignotent une fois par seconde, émissifs seulement
// (aucune lampe : la clé des programmes ne bouge pas, v248). La géométrie et
// le matériau sont PARTAGÉS (`liberer.js` ne les rend pas) ; le groupe ne se
// fabrique que pour une voiture effectivement heurtée.
let geoDetresse = null, matDetresse = null;
function feuxDeDetresse(m, allumes) {
  let g = m.userData.detresse;
  if (!allumes) { if (g) g.visible = false; return; }
  if (!g) {
    if (!geoDetresse) {
      geoDetresse = new THREE.SphereGeometry(0.16, 8, 6); geoDetresse.userData.partagee = true;
      matDetresse = new THREE.MeshBasicMaterial({ color: 0xffa21a, toneMapped: false }); matDetresse.userData.partagee = true;
    }
    g = new THREE.Group(); g.name = 'detresse';
    for (const [x, z] of [[-0.85, -2.1], [0.85, -2.1], [-0.85, 2.1], [0.85, 2.1]]) {
      const f = new THREE.Mesh(geoDetresse, matDetresse);
      f.position.set(x, 0.85, z);
      g.add(f);
    }
    m.add(g); m.userData.detresse = g;
  }
  g.visible = (performance.now() % 1000) < 550;
}

// REPEINDRE UNE VOITURE DE LA FLOTTE (v305) — une seule règle, lue par la rue
// (`voitureDeVille`) et par la monture (montures.js) : sans elle, la voiture
// qu'on prend dans la rue changeait de couleur sous l'enfant. La berline de
// New York se peint par son matériau `Paint_NYC` ; les autres par leur
// laque seule — vitres, chromes et carbone gardent leur rendu.
export function repeindre(modele, fichier, teinte) {
  modele.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const nom = o.material.name || '';
    if (fichier === 'berline-citadine' ? nom !== 'Paint_NYC' : !EST_LAQUE.test(nom)) return;
    o.material = o.material.clone(); o.material.userData.partagee = false;
    o.material.color.set(teinte);
  });
}

// UNE VOITURE TOUS LES DIX-HUIT BLOCS, SUR TOUT LE TOUR (v322). Le
// plafond de vingt par circuit rendait la densité INVERSE de la longueur :
// les grands anneaux de Rome n'avaient plus qu'une voiture tous les
// quarante blocs (25 pour mille blocs de rue, contre 72 à Londres, dont
// les circuits sont courts), et un tour de quartier de Paris de 885 blocs
// en aurait eu vingt. Le prix se mesure en voitures EN VUE — la portée se
// teste voiture par voiture, à quarante-cinq blocs (v201) — et il est
// nul là où il compte : sur les 275 villes, le point du monde qui voit le
// plus de voitures en voit 72,7 avant comme après (Washington, dont les
// circuits sont courts et ne touchaient pas le plafond) ; la moyenne de
// Rome passe de 4,1 à 9,0, sous les 15,7 de Londres. Soixante reste une
// borne de sûreté, qu'aucun circuit n'atteint (le plus long en a 49).
// Publiée pour le témoin de `carteMonde.js`, qui compte les voitures d'une
// ville sans en fabriquer une seule.
// DEUX VOISINES D'UNE FILE NE SE TOUCHENT JAMAIS (v372), et cela se calcule
// sur le tracé, pas sur un écart moyen. Les voitures passent partout à
// `P / nb` secondes l'une de l'autre ; on pose, toutes les deux dixièmes de
// seconde d'un tour, la voisine à cet intervalle derrière, et l'on teste les
// deux rectangles (trente centimètres de marge devant et derrière ; aucune sur le côté, où deux voies de la même avenue sont à 2,6 blocs). Le plus grand `nb` sans
// contact se cherche par dichotomie : six essais de deux cent cinquante poses.
const SEP_DL = DEMI_LONG_VOITURE + 0.3, SEP_DW = DEMI_LARG_VOITURE;
function rectSep(x, z, cap) {
  const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux;
  return [[x + ux * SEP_DL + vx * SEP_DW, z + uz * SEP_DL + vz * SEP_DW], [x + ux * SEP_DL - vx * SEP_DW, z + uz * SEP_DL - vz * SEP_DW],
    [x - ux * SEP_DL - vx * SEP_DW, z - uz * SEP_DL - vz * SEP_DW], [x - ux * SEP_DL + vx * SEP_DW, z - uz * SEP_DL + vz * SEP_DW]];
}
function rectsSeTouchent(P, Q) {
  for (const R of [P, Q]) for (let k = 0; k < 4; k++) {
    const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0];
    let p0 = Infinity, p1 = -Infinity, q0 = Infinity, q1 = -Infinity;
    for (let j = 0; j < 4; j++) {
      const a = P[j][0] * ax + P[j][1] * az, b = Q[j][0] * ax + Q[j][1] * az;
      if (a < p0) p0 = a; if (a > p1) p1 = a; if (b < q0) q0 = b; if (b > q1) q1 = b;
    }
    if (p1 < q0 || q1 < p0) return false;
  }
  return true;
}
export function nbSansChevauchement(parcours, grille, nbMax) {
  const { ts, ds } = grille, P = ts[ts.length - 1], L = parcours.longueur;
  if (!(P > 0) || nbMax <= 3) return Math.max(1, nbMax);
  const dA = (t) => {
    const n = Math.floor(t / P), r = t - n * P;
    let lo = 0, hi = ts.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ts[m] <= r) lo = m; else hi = m; }
    const u = ts[hi] > ts[lo] ? (r - ts[lo]) / (ts[hi] - ts[lo]) : 0;
    return n * L + ds[lo] + (ds[hi] - ds[lo]) * u;
  };
  const touche = (nb) => {
    const ecartT = P / nb;
    for (let t = 0; t < P; t += Math.max(0.2, P / 400)) {
      const a = dA(t + ecartT), b = dA(t);
      const qa = parcours.a(a), qb = parcours.a(b);
      if ((qa.x - qb.x) ** 2 + (qa.z - qb.z) ** 2 > 36) continue;
      if (rectsSeTouchent(rectSep(qa.x, qa.z, parcours.capLisse(a)), rectSep(qb.x, qb.z, parcours.capLisse(b)))) return true;
    }
    return false;
  };
  let nb = nbMax;
  if (touche(nbMax)) {
    let lo = 3, hi = nbMax;                // lo : sans contact (supposé), hi : contact
    if (touche(lo)) nb = lo;
    else { while (hi - lo > 1) { const m = (lo + hi) >> 1; if (touche(m)) hi = m; else lo = m; } nb = lo; }
  }
  return nb;
}

// UN TRACÉ QUI REPASSE PAR SON PROPRE CARREFOUR (v372). Un circuit en huit
// croise sa propre route : la voiture i y passe à l'heure t, puis la voiture j
// y revient à t + Δ, Δ fixé par le tracé. Si Δ tombe sur un multiple de l'écart
// horaire entre deux voitures, deux voitures de la MÊME file s'y présentent
// ensemble — et chacune attend l'autre, la file attend sa tête, et au bout de
// la patience l'une passe au travers (mesuré au croisement de Paris, −333, 271 :
// 1,8 % des paires au contact, retards de 126 blocs). Ce n'est pas une affaire
// de règle de collision : c'est la GRILLE qui les envoie ensemble. On choisit
// donc le nombre de voitures pour qu'à aucun croisement aucune voiture n'en
// trouve une autre — toutes les paires, pas seulement les voisines — et c'est
// une fonction de l'horloge, la même sur deux tablettes (v305).
// Les croisements d'un tracé avec lui-même, en écart d'heure : ils ne
// dépendent pas du nombre de voitures, et la seconde voie (v423) les
// redemande pour chaque nombre qu'elle essaie — on les garde avec le tracé.
const CROISEMENTS = new WeakMap();
function croisementsDe(parcours, grille) {
  const deja = CROISEMENTS.get(parcours);
  if (deja && deja.grille === grille) return deja.ecarts;
  const { ts, ds } = grille, P = ts[ts.length - 1], L = parcours.longueur;
  if (!(P > 0)) return [];
  const N = 720, h = P / N, X = new Float64Array(N), Z = new Float64Array(N), C = new Float64Array(N);
  let lo = 0;
  for (let s = 0; s < N; s++) {
    const r = s * h;
    while (lo < ts.length - 2 && ts[lo + 1] <= r) lo++;
    const u = ts[lo + 1] > ts[lo] ? (r - ts[lo]) / (ts[lo + 1] - ts[lo]) : 0;
    const d = Math.min(L, ds[lo] + (ds[lo + 1] - ds[lo]) * u);
    const q = parcours.a(d); X[s] = q.x; Z[s] = q.z; C[s] = parcours.capLisse(d);
  }
  // les paires d'instants dont les positions se touchent EN TRAVERS : c'est la
  // liste des croisements, en écart d'heure (les voisines le long du tracé
  // sont l'affaire du plancher, v283)
  // (v429) les paires se cherchent dans une grille de six blocs — la portée
  // du test de distance — et non plus toutes contre toutes : 259 000 paires
  // examinées au dépliage d'un circuit, 22 à 36 ms sous `frame` (v420). Même
  // ensemble de paires, au bit près ; l'ordre de `ecarts` ne compte pas.
  const ecarts = [], cases = new Map(), cle = (i, j) => i * 100003 + j;
  for (let s = 0; s < N; s++) {
    const k = cle(Math.floor(X[s] / 6), Math.floor(Z[s] / 6));
    const l = cases.get(k); if (l) l.push(s); else cases.set(k, [s]);
  }
  for (let a = 0; a < N; a++) {
    const ia = Math.floor(X[a] / 6), ja = Math.floor(Z[a] / 6);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const l = cases.get(cle(ia + di, ja + dj)); if (!l) continue;
      for (const b of l) {
        if (b <= a) continue;
        const dt = (b - a) * h; if (dt < 3 || P - dt < 3) continue;
        if ((X[a] - X[b]) ** 2 + (Z[a] - Z[b]) ** 2 > 36) continue;
        if (Math.abs(Math.cos(C[a] - C[b])) > 0.7) continue;
        if (rectsSeTouchent(rectSep(X[a], Z[a], C[a]), rectSep(X[b], Z[b], C[b]))) ecarts.push(dt);
      }
    }
  }
  CROISEMENTS.set(parcours, { grille, ecarts });
  return ecarts;
}
export function nbSansCroisement(parcours, grille, nb, plancher = 3, strict = false) {
  const { ts } = grille, P = ts[ts.length - 1];
  if (!(P > 0) || nb <= 3) return nb;
  const ecarts = croisementsDe(parcours, grille);
  if (!ecarts.length) return nb;
  // une marge d'une seconde et demie : le temps de dégager un carrefour
  const libre = (n) => {
    const e = P / n;
    for (const dt of ecarts) { const r = dt % e; if (Math.min(r, e - r) < 1.5) return false; }
    return true;
  };
  for (let n = nb; n >= plancher; n--) if (libre(n)) return n;
  // `strict` (v423) : rien de libre, on le dit au lieu de rendre `nb`
  return strict ? 0 : nb;
}

// une voiture passe à un carrefour toutes les deux secondes au plus (v372)
export const INTERVALLE_RUE = 2;
// UNE FILE ET SA JUMELLE SONT UNE SEULE LIGNE (v423) : la légitimité d'une
// attente (un feu devant) s'y propage, et l'on n'y pile pas sur un contact.
const memeLigne = (x, y) => x === y || (!!x && !!y && (x.jumeauDe === y || y.jumeauDe === x));

export function voituresDuCircuit(longueur) {
  return Math.max(6, Math.min(60, Math.round(longueur / 18)));
}

export function createVehicules({ scene, player }) {
  const convois = [];

  function ajouter(points, opts) {
    const c = new Convoi(scene, opts.parcours || new Parcours(points), opts);
    // UNE CLÉ QUI NE DÉPEND QUE DU TRACÉ (v305). Le RANG d'un convoi dans la
    // liste dépend de l'ordre où l'enfant a approché les villes : il n'est pas
    // le même d'une tablette à l'autre. Pour dire « Marlon a pris la voiture
    // 7 de CE convoi », il faut un nom que les deux calculent pareil.
    const p0 = points[0] || { x: 0, z: 0 };
    c.cle = `${opts.nom}|${points.length}|${Math.round(p0.x)},${Math.round(p0.z)}|${Math.round(opts.depart || 0)}`;
    // la jumelle d'une seconde voie (v423) : le même tracé, un autre nom
    if (opts.jumeauDe) { c.jumeauDe = opts.jumeauDe; c.rangJumeau = opts.rangJumeau; c.cle += '|voie2'; }
    c.pris = new Set();
    convois.push(c);
    return c;
  }

  // Deux rames sur le tour, à l'opposé l'une de l'autre : où qu'on soit sur la
  // ligne, il y en a toujours une qui arrive. C'est aussi ce qui fait qu'un
  // enfant n'attend jamais longtemps sur un quai.
  //
  // `opts` sert aux lignes nommées de Washington : chacune a sa couleur, son
  // nom sur le bouton d'embarquement, et une seule livrée — une ligne rouge
  // dont une rame sur deux serait jaune ne serait plus une ligne rouge.
  function metro(points, opts = {}) {
    const p = new Parcours(points);
    const nom = opts.nom || 'métro';
    const teintes = opts.teinte !== undefined
      ? [opts.teinte, opts.teinte] : [0x2a6ad8, 0xd8a02a];
    // Les arrêts sont donnés par leur RANG dans la liste de points, pas par une
    // distance : c'est le creusement du tunnel qui sait où sont les quais, et
    // lui compte en points de tracé. On convertit ici, une fois.
    const arrets = (opts.arretsIndex || []).map((i) => p.cumul[Math.min(i, p.cumul.length - 1)]);
    // COMBIEN DE RAMES ? Autant qu'il en faut pour qu'on n'attende pas.
    //
    // Deux suffisaient tant que le métro ne s'arrêtait jamais. Depuis qu'il
    // marque les stations, un tour complet de la ligne Bleue dure deux minutes
    // — treize arrêts dans chaque sens — et l'enfant restait une minute sur le
    // quai à ne rien voir venir. Trois rames ramènent l'attente sous la
    // demi-minute, ce qui est déjà l'intervalle du vrai métro aux heures
    // creuses.
    const rames = opts.rames ?? 2;
    for (let k = 0; k < rames; k++) {
      ajouter(points, {
        nb: opts.nb ?? 4, ecart: 7.6, vitesse: opts.vitesse ?? 7,
        depart: (k * p.longueur) / rames, nom, emoji: opts.emoji || '🚇', assise: 1.1,
        arrets, pause: opts.pause, souterrain: opts.souterrain, decouvert: opts.decouvert, rail: true,
        modele: (i) => construireRame(i === 0, teintes[k % teintes.length]),
      });
    }
  }

  // Les monoplaces, décalées en file, chacune à sa vitesse : le peloton
  // s'étire et se regroupe tout seul, ce qui rend la course vivante.
  function course(points, nb = 6) {
    const p = new Parcours(points);
    const teintes = [
      [0xd82a2a, 0xf0f0ea], [0x1a3aa8, 0xf0d030], [0xf07a10, 0x1a1a20],
      [0x0aa06a, 0xf0f0ea], [0xe0e4ea, 0xd82a2a], [0x6a2ad8, 0xf0d030],
    ];
    for (let i = 0; i < nb; i++) {
      const [c1, c2] = teintes[i % teintes.length];
      ajouter(points, {
        nb: 1, vitesse: 17 + (i % 3) * 1.6, depart: -i * (p.longueur / nb) * 0.55,
        nom: 'formule 1', emoji: '🏎️', assise: 0.75, freine: true, allureMin: 0.2, routier: true,
        modele: () => construireF1(c1, c2),
      });
    }
  }

  // La chaîne de la Giga-usine : les voitures avancent de poste en poste,
  // marquent l'arrêt à chacun — le temps qu'un robot soude, qu'une buse
  // peigne — puis sortent faire le tour du parc avant de revenir. Grises
  // avant le tunnel de peinture, colorées après : `peinture` donne la
  // fenêtre en distance, et chaque voiture garde SA teinte, stable de tour
  // en tour.
  function chaine(trace, opts = {}) {
    const p = new Parcours(trace.pts);
    const arrets = (trace.arretsIndex || []).map((i) => p.cumul[Math.min(i, p.cumul.length - 1)]);
    const teintes = [0xd82a2a, 0x2a6ad8, 0xf0f0ea, 0x3a9a4a, 0x58b8e8, 0xe8c83a];
    const fen = opts.peinture || trace.peinture || null;
    return ajouter(trace.pts, {
      nb: opts.nb ?? 8, ecart: opts.ecart ?? 16, vitesse: opts.vitesse ?? 4.5,
      nom: 'voiture de la chaîne', emoji: '🚗', assise: 1.15,
      arrets, pause: opts.pause ?? 5,
      modele: () => construireVoitureRoute(),
      relooke: fen ? (m, d, i) => {
        const peinte = d > fen.sortie && d < fen.retour;
        m.userData.carrosserie.color.set(peinte ? teintes[i % teintes.length] : 0x9a9a9a);
      } : null,
    });
  }

  // UNE VOITURE DE VILLE. La coque sculptée est posée tout de suite — il faut
  // un maillage dans la seconde — puis le vrai modèle de la flotte la
  // remplace dès qu'il arrive du réseau. C'est le même échange qu'aux
  // montures, à un détail près : ici on garde une trace des pivots de roue,
  // parce que c'est le convoi qui les fait tourner.
  function voitureDeVille(n, teinte, ville) {
    const g = construireVoitureRoute(teinte);
    const entree = choixFlotte(n, ville);
    // Elle retient QUEL modèle elle est. Sans cela, un enfant qui prend le
    // volant d'une Bugatti croisée dans la rue repartirait au hasard de la
    // flotte — c'est le même soin que pour la voiture garée.
    g.userData.flotte = entree.fichier;
    g.userData.nomVoiture = entree.nom;
    const chargement = chargerVoitureFlotte(entree);
    if (chargement) {
      chargement.then((proto) => {
        if (!proto || !g.userData.membres) return;
        for (const nom of ['caisse', 'verriere', 'tronc']) {
          const membre = g.userData.membres[nom];
          if (membre) g.remove(membre);
        }
        const modele = proto.clone(true);
        // UNE LAQUE PAR VOITURE (v246). Max : « assure-toi que toutes les
        // villes ont de la diversité dans les voitures ». Un modèle de la
        // flotte arrivait toujours dans SA couleur cuite dans le fichier :
        // vingt Bugatti bleues dans vingt villes. Deux voitures sur trois
        // prennent la teinte tirée pour elles, la troisième garde sa livrée
        // d'origine — une voiture dont la couleur fait l'identité (un taxi,
        // une Ferrari rouge) ne doit pas disparaître de la rue. La laque
        // seule est repeinte : vitres, chromes et carbone gardent leur rendu.
        const laque = entree.fichier !== 'berline-citadine' && ville !== 'ny' && n % 3 !== 0;
        g.userData.laque = laque ? teinte : null;
        // ce que la rue a réellement peint, quelle que soit la règle : c'est
        // ce qui part avec la voiture quand l'enfant la prend (v305)
        g.userData.peinture = laque || entree.fichier === 'berline-citadine' ? teinte : null;
        if (g.userData.peinture != null) repeindre(modele, entree.fichier, teinte);
        g.add(modele);
        const roues = [];
        modele.traverse((o) => { if (/^Wheel_/i.test(o.name || '')) roues.push(o); });
        g.userData.roues = roues;
        g.userData.rayonRoue = proto.userData.rayonRoue || 0.34;
      });
    }
    return g;
  }

  // LA CIRCULATION D'UNE VILLE. Verdict de Max, capture de Moscou de nuit à
  // l'appui : « les villes sont toujours désespérément vides, rajoute les
  // flottes de voitures qui circulent ». Il avait raison, et le chiffre le
  // dit : TROIS voitures espacées d'un tiers de tour, sur un anneau de deux
  // cents blocs, c'est une voiture tous les soixante-six blocs — on peut
  // traverser la ville sans en croiser une seule.
  //
  // Désormais une voiture tous les vingt-cinq blocs, chacune un modèle
  // différent de la flotte, à quatorze au plus par anneau : au-delà, une
  // tablette qui dessine déjà une ville entière commence à ramer. Et on ne
  // les dessine qu'à cent dix blocs — en ville, les immeubles cachent tout
  // ce qui est plus loin, il n'y a rien à gagner à les rendre.
  // LE CODE ET SON PROPRE COMMENTAIRE NE DISAIENT PAS LA MÊME CHOSE. Celui du
  // dessus promettait « une voiture tous les vingt-cinq blocs, à quatorze au
  // plus » ; le code calculait `min(10, longueur / 28)` — une tous les
  // trente-quatre. Sur les 431 blocs du plus grand circuit de Paris, cela fait
  // dix voitures pour toute la rive droite.
  //
  // Désormais une tous les DIX-HUIT blocs, vingt au plus par circuit. Le prix
  // se paie en appels de dessin, et il est mesuré : voir la note de main.js
  // sur les cent quarante voitures de Paris.
  const TEINTES = [
    0xd84a3a, 0x3a6ac8, 0xf0f0ea, 0x2a2a30, 0x3a9a4a, 0xe8c83a,   // les six d'origine
    // ET DOUZE DE PLUS, parce qu'un modèle de la flotte met une seconde ou
    // deux à arriver du réseau : jusque-là c'est la coque d'attente qu'on
    // voit, et six teintes pour cent quarante voitures donnaient six
    // voitures identiques par carrefour. La teinte, elle, est là tout de
    // suite.
    0x8a2b3a, 0x2f7f8f, 0xc86a2a, 0x5a4a8a, 0x1f4a2f, 0xb0b4bc,
    0x7a1f1f, 0x2a3f7a, 0xd8a83a, 0x3f7a5a, 0x6a2f6a, 0x8a8a6a,
  ];
  function circulation(pts, graine = 0, options = {}) {
    // ON ROULE À DROITE SUR LES AVENUES (v372). Les circuits des villes bâties
    // à la main suivent l'AXE de leurs avenues, et deux circuits qui partagent
    // une avenue dans les deux sens s'y rencontraient de face, sur la même
    // ligne : à quinze km/h ils se frôlaient, à cinquante ils se bloquaient
    // l'un l'autre à chaque rencontre (mesuré à Paris : la moitié des arrêts
    // « voiture » étaient des face-à-face). La voiture roule désormais dans sa
    // voie de droite, `decalage` blocs à droite de l'axe — la règle que les
    // villes engendrées suivent depuis la v271.
    pts = sansEpis(pts);
    if (options.decalage) pts = sansEpis(decalerADroite(pts, options.decalage));
    const p = new Parcours(pts);
    // L'ALLURE DE LA VOIE (v372). Une rue de ville roulait à 4,2 blocs par
    // seconde — quinze kilomètres à l'heure — et l'autoroute à douze. Chaque
    // voie a désormais sa limitation (`ALLURE_VOIE`, circulation.js), chaque
    // convoi son conducteur (±8 %, tiré de sa graine, le même sur toutes les
    // tablettes), et la grille horaire freine avant les virages et les
    // entrées de ville et réaccélère comme une voiture. `limite(x, z)` dit
    // l'allure permise en un point du tracé (l'autoroute qui entre en ville).
    const voie = options.voie || 'rue';
    const vitesse = options.vitesse ?? ALLURE_VOIE[voie] ?? ALLURE_VOIE.rue;
    const facteur = allureDuConducteur(graine * 31 + Math.round(p.longueur));
    const lim = options.limite
      ? (d) => { const q = p.a(d); return options.limite(q.x, q.z) * facteur; } : () => vitesse * facteur;
    const prof = profilVitesse({ longueur: p.longueur, capA: (d) => p.capLisse(d), limiteA: lim });
    // COMBIEN DE VOITURES : une tous les dix-huit blocs (v322), MAIS les
    // voitures se suivent à intervalle de TEMPS égal, donc la file se resserre
    // dans les virages lents — et dans un virage aigu, la voisine qui entre et
    // celle qui sort sont côte à côte. On ne devine pas l'écart qu'il faut :
    // on fait rouler deux voisines sur un tour, et l'on garde le plus grand
    // nombre où elles ne se touchent jamais (`nbSansChevauchement`).
    const grille = grilleDuProfil(prof);
    // Un tracé très tortueux (un tour de quartier de Paris) ne garderait que
    // trois voitures : on n'en retire jamais plus d'un tiers, et ce qui reste
    // de contacts se règle en roulant — la suiveuse freine sur celle qui la
    // précède (`cederLePassage`).
    // Et le compte se fait en TEMPS : à cinquante km/h, une voiture tous les
    // dix-huit blocs en laisse passer une toutes les une seconde et demie à
    // l'angle d'une rue droite, mais à peine une toutes les cinq dans le tour
    // d'un quartier. Une toutes les `INTERVALLE_RUE` secondes au moins.
    const nbMax = Math.min(60, Math.max(voituresDuCircuit(p.longueur), Math.round(grille.ts[grille.ts.length - 1] / INTERVALLE_RUE)));
    // les voisines ne se touchent pas (plancher), et la file ne se retrouve
    // pas elle-même à un croisement de son propre tracé (le huit de Paris)
    let nb = options.nb ?? (options.voiesAuBesoin
      // L'AUTOROUTE DENSE (v423). Vingt voitures imposées pour un tour de mille
      // six cents à cinq mille blocs : une tous les cent vingt blocs, le
      // contraire d'une autoroute. Mesuré sur les vingt-quatre corridors : le
      // plus grand nombre sans contact vaut une voiture toutes les deux
      // secondes (le demi-tour lent dans la ville, à chaque bout), et la file
      // qui laisse la place à sa jumelle en garde 0,44 à 0,47 — partout. On le
      // prend tel quel, sans le chercher au démarrage (v258) : la jumelle le
      // vérifie quand l'enfant approche, et deux files de 0,44 font 0,88.
      ? Math.max(8, Math.floor(0.44 * Math.min(120, Math.round(grille.ts[grille.ts.length - 1] / INTERVALLE_RUE))))
      : nbSansCroisement(p, grille,
        Math.max(Math.ceil(nbMax * 2 / 3), nbSansChevauchement(p, grille, nbMax)), Math.ceil(nbMax / 3)));
    // LA SECONDE VOIE (v423) : là où la section en a deux dans ce sens
    // (`voiesdoubles.js`, lu par main.js), la file peut changer de voie (`A`,
    // l'autoroute) et une jumelle roule dans l'autre (`B`).
    // LA FILE LAISSE LA PLACE À SA JUMELLE (v423). Là où la section n'a qu'une
    // voie, les deux files se rejoignent une demi-voiture l'une derrière
    // l'autre : mesuré, au même nombre de voitures, 62 des 77 circuits de ville
    // qui suivent un boulevard s'y touchaient dans le virage lent qui suit la
    // fin du boulevard. On cherche donc le plus grand nombre `n` (jusqu'à
    // 0,4 fois la file d'avant) où les deux files ne se touchent nulle part et
    // ne se retrouvent pas à un croisement de leur tracé : `2 n` voitures sur
    // la ligne au lieu de `nb`, et toutes les voies occupées sur le boulevard.
    // Mesuré sur les 37 circuits concernés : le meilleur `n` vaut 0,4 à 0,5
    // fois `nb` — la ligne garde 80 à 100 % de ses voitures, réparties sur
    // deux voies là où il y en a deux. En dessous de 0,4, pas de jumelle.
    // Un nombre IMPOSÉ (`options.nb`, l'autoroute) ne se cherche pas : la
    // jumelle a le même, ou n'existe pas.
    const rangB = options.bus ? 1.5 : 0.5;
    const voiesDe = () => {
      const voies = options.voies ? voiesLeLong(p, options.voies) : null;
      const pA = voies && voies.A.some((l) => l !== 0) ? new ParcoursDecale(p, voies.A) : p;
      let jumelle = null;
      if (voies && voies.longueur >= 40 && nb >= 2) {
        const pB = new ParcoursDecale(p, voies.B);
        const marche = (n) => (options.nb || nbSansCroisement(p, grille, 2 * n, 2 * n, true) === 2 * n)
          && jumelleSansContact(pA, pB, grille, n, rangB, options.bus ? n - 1 : n, !!options.bus);
        let lo = options.nb || options.voiesAuBesoin ? nb : Math.max(2, Math.ceil(nb * 0.4)), hi = nb;
        if (marche(hi)) lo = hi;
        else if (lo === hi || !marche(lo)) lo = 0;
        else while (hi - lo > 1) { const m = (lo + hi) >> 1; if (marche(m)) lo = m; else hi = m; }
        if (lo) jumelle = { pB, nb: lo };
      }
      return { voies, pA, jumelle };
    };
    // L'AUTOROUTE SE CALCULE AU DÉMARRAGE (v300, derrière « Jouer », v258) :
    // sa seconde voie attend que l'enfant approche du corridor
    // (`voiesAuBesoin`) — cent cinquante millisecondes de moins à l'accueil.
    const tout = options.voies && !options.voiesAuBesoin ? voiesDe() : null;
    const voies = tout ? tout.voies : null, pA = tout ? tout.pA : p;
    if (tout && tout.jumelle) nb = tout.jumelle.nb;
    const c = ajouter(pts, {
      parcours: pA,
      nb, ecart: p.longueur / nb, vitesse, freine: true, routier: true,
      profil: { limite: options.limite || null, facteur, calcule: prof },
      route: options.route || null,
      // QUARANTE-CINQ BLOCS, ET C'EST UNE MESURE, PAS UNE INTUITION. Une
      // voiture coûte TRENTE-DEUX MAILLAGES — trois fois un personnage, et
      // personne ne l'avait jamais compté. À cent dix blocs de portée, les
      // quatre-vingt-quinze voitures de Paris en faisaient dessiner
      // quatre-vingt-neuf : deux mille neuf cents maillages pour la seule
      // circulation, et le compteur d'appels passait de 537 à 1 018. C'est
      // exactement ce que la v196 avait gagné, rendu d'un coup.
      //
      // Or un bloc de ville vaut ici trente à quarante mètres : une voiture à
      // cent dix blocs est à quatre kilomètres, et les immeubles la cachent
      // depuis longtemps. Les personnages s'effacent à soixante-deux blocs
      // depuis des versions sans que personne ne l'ait jamais signalé ; une
      // voiture, plus petite et plus basse, tient largement à quarante-cinq.
      nom: 'voiture', emoji: '🚙', assise: 1.15, vu: VU_VOITURE,
      // LE PAS DE 13 SUR UNE FLOTTE DE 50 REVIENT SUR SES PAS AU BOUT DE
      // CINQUANTE : `13 × 50 ≡ 0`. Avec vingt voitures par circuit c'était
      // encore sans conséquence ; il vaut mieux un pas PREMIER avec la taille
      // de la flotte, et 17 l'est aussi de cinquante-deux — cinquante-deux
      // modèles différents.
      modele: (i) => voitureDeVille(graine * 7 + i * 17, TEINTES[(graine + i) % TEINTES.length],options.ville),
    });
    // Ce que ce convoi VA montrer, sans rien fabriquer : un témoin de
    // diversité le lit avant que la moindre voiture ne soit née.
    c.graine = graine;
    c.voie = voie;
    c.modeles = Array.from({ length: nb }, (_, i) => choixFlotte(graine * 7 + i * 17, options.ville).fichier);
    // LA JUMELLE (v423). Une portion de deux voies d'au moins quarante blocs, et
    // aucun contact sur un tour là où les deux files se rejoignent sur une
    // seule voie. Le bus du grand anneau (`options.bus`) prend la première
    // place de la ligne : la jumelle commence une voiture plus loin.
    const poserJumelle = ({ voies, pA: pa, jumelle }) => {
      c.voiesDoubles = voies ? { part: Math.round(voies.part * 1000) / 1000, longueur: Math.round(voies.longueur) } : null;
      if (pa !== c.parcours) c.parcours = pa;
      if (!voies || voies.longueur < 40) return;
      if (!jumelle) { c.voiesDoubles.refus = 'contact'; return; }
      const nbB = options.bus ? c.nb - 1 : c.nb, graineB = graine * 13 + 5;
      const b = ajouter(pts, {
        parcours: jumelle.pB, jumeauDe: c, rangJumeau: rangB,
        nb: nbB, ecart: p.longueur / c.nb, vitesse, freine: true, routier: true,
        profil: { limite: options.limite || null, facteur, calcule: prof },
        route: options.route || null,
        nom: 'voiture', emoji: '🚙', assise: 1.15, vu: VU_VOITURE,
        modele: (i) => voitureDeVille(graineB * 7 + i * 17, TEINTES[(graineB + i) % TEINTES.length], options.ville),
      });
      b.graine = graineB; b.voie = voie;
      b.modeles = Array.from({ length: nbB }, (_, i) => choixFlotte(graineB * 7 + i * 17, options.ville).fichier);
      c.jumelle = b;
    };
    if (tout) poserJumelle(tout);
    else if (options.voies) {
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const q of pts) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.z < z0) z0 = q.z; if (q.z > z1) z1 = q.z; }
      c.voiesEnAttente = { x0: x0 - 300, z0: z0 - 300, x1: x1 + 300, z1: z1 + 300, poser: () => poserJumelle(voiesDe()) };
    }
    return c;
  }

  // Le bus de la ville : un seul par anneau, plus lent que les voitures, et
  // qui marque quatre arrêts par tour — assez pour qu'un enfant le prenne
  // (« Monter à bord » le voit comme n'importe quel convoi). Max : « much
  // more life in cities, cars, buses… »
  //
  // LE BUS ROULE DANS LA FILE (v372). Il roulait à cinq blocs par seconde et
  // marquait quatre arrêts, sur le même tracé que les voitures : tant qu'elles
  // roulaient à 4,2 il les dépassait AU TRAVERS ; à quarante kilomètres à
  // l'heure, elles l'auraient rattrapé à chaque arrêt et toute la file serait
  // restée derrière lui pour toujours — un convoi n'a qu'une grille horaire,
  // ses voitures ne doublent pas. Il prend donc la grille de SON anneau
  // (`suit`), à mi-chemin entre deux voitures, et ne marque plus d'arrêt :
  // on y monte en marche, à neuf blocs, comme dans une voiture. Le prix est
  // déclaré : un bus qui ne s'arrête pas.
  function bus(pts, graine = 0, suit = null) {
    const teintes = [0xd84a3a, 0xe8c83a, 0x3a9a4a, 0x3a6ac8, 0xf0813a];
    return ajouter(pts, {
      nb: 1, vitesse: suit ? suit.vitesse : ALLURE_VOIE.rue, routier: true, freine: true,
      profil: suit ? suit.profil : { limite: null, facteur: 1 },
      suit, demiLong: 3.3,
      nom: 'bus', emoji: '🚌', assise: 1.7,
      modele: () => construireBus(teintes[graine % teintes.length]),
    });
  }

  // QUI CÈDE LE PASSAGE À QUI (v244). Max : « évite que les voitures puissent
  // se chevaucher ». Mesuré à Paris, trente secondes : soixante-quinze relevés
  // de paires de voitures à moins de 3,5 blocs, la pire à 1,38 — l'une dans
  // l'autre, là où deux circuits se croisent, en équerre ou en biais, et sur
  // les tronçons qu'ils partagent.
  //
  // TROIS JETS AVANT CELUI-CI, et chacun a coûté une mesure. Arrêter le CONVOI
  // entier laissait celle qui était déjà dans le carrefour en travers de
  // l'autre voie (75 → 65). Un couloir « devant moi » de six blocs ratait la
  // voiture qui arrive de trois quarts — les deux circuits de la rue de Rivoli
  // se coupent à cent soixante degrés, pas cent quatre-vingts (65 → 61). Et
  // départager une paire mutuelle par le rang de convoi faisait passer la
  // voiture de derrière AU TRAVERS de celle qui attendait devant elle.
  //
  // D'où ceci. Une voiture regarde où SON tracé la mène dans les cinq blocs qui
  // viennent, et demande si son rectangle (4,4 × 2,26) y toucherait celui d'une
  // autre voiture, de son convoi ou d'un autre. Si oui, elle attend — elle
  // seule : le convoi est élastique (`retard`), celles qui suivent font la
  // queue derrière elle. Dans une paire mutuelle, LA PLUS ENGAGÉE PASSE : celle
  // que l'autre voit le plus loin devant elle. Et l'on n'attend jamais plus de
  // quatre secondes d'affilée : à trois, on finit par y aller.
  //
  // Seules les voitures à portée de l'enfant se regardent : ce qui se
  // chevauche hors de vue ne coûte à personne, et mille circuits n'ont pas à
  // se comparer à chaque image.
  const PORTEE_CEDE = 90, DEMI_LONG = DEMI_LONG_VOITURE, DEMI_LARG = DEMI_LARG_VOITURE;
  const PAS_BALAYAGE = [0.5, 2, 3.5, 5, 6.5, 8];
  const rectangle = (x, z, ux, uz, dl = DEMI_LONG, dw = DEMI_LARG) => {
    const vx = uz, vz = -ux;
    return [
      [x + ux * dl + vx * dw, z + uz * dl + vz * dw],
      [x + ux * dl - vx * dw, z + uz * dl - vz * dw],
      [x - ux * dl - vx * dw, z - uz * dl - vz * dw],
      [x - ux * dl + vx * dw, z - uz * dl + vz * dw],
    ];
  };
  // LA VOITURE D'UN TRAIN (`construireRame` : 7,2 blocs de long, 1,5 de large,
  // plus les bogies et le chanfrein) — sa boîte, pour la voiture de l'enfant
  // qui ne doit pas y entrer et pour le train qui ne doit pas la traverser.
  // Deux voies à `ENTRAXE` deux blocs de la ligne : une rame sur l'une ne
  // touche pas une voiture centrée sur l'autre (4 − 0,9 − 1,13 = 2 blocs).
  const DEMI_LONG_RAME = 3.7, DEMI_LARG_RAME = 0.9;
  const PAS_TRAIN = [0.5, 1.5, 2.5, 3.5];   // on s'arrête près : RAYON_BORD (9) doit encore voir la motrice
  // Deux rectangles se touchent-ils ? Séparation d'axes : les quatre arêtes de
  // chacun servent d'axe ; s'il en est un où les projections ne se recouvrent
  // pas, ils sont disjoints.
  const seTouchent = (P, Q) => {
    for (const R of [P, Q]) {
      for (let k = 0; k < 4; k++) {
        const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0];
        let p0 = Infinity, p1 = -Infinity, q0 = Infinity, q1 = -Infinity;
        for (let j = 0; j < 4; j++) {
          const p = P[j][0] * ax + P[j][1] * az, q = Q[j][0] * ax + Q[j][1] * az;
          if (p < p0) p0 = p; if (p > p1) p1 = p; if (q < q0) q0 = q; if (q > q1) q1 = q;
        }
        if (p1 < q0 || q1 < p0) return false;
      }
    }
    return true;
  };
  // Ce que `cederLePassage` a regardé à la dernière image : `obstacleDevant`
  // s'en sert pour la voiture de l'enfant, sans refaire la collecte.
  let dernieres = [];
  // LE FEU ROUGE EST BRANCHÉ PAR `main.js` (v273) : c'est lui qui dessine les
  // feux et connaît leur état. Comme `obstaclePieton` et `vehiculeApproche`,
  // la règle vit là où elle se calcule, et la circulation la DEMANDE.
  let feuRouge = null;
  let amis = null;
  const CLE_ENFANT = -1;
  // les amis (v305) : des clés négatives, loin de celles des trains
  // (−2 − rang × 1000 − wagon), pour que la patience infinie les couvre aussi
  const CLE_AMI = -1e9;
  const CLE_PIETON = -2e9;
  let pietons = null;
  // des piétons posés par un témoin, en plus de ceux du monde (v372)
  const pietonsPoses = [];
  // le dernier choc de l'enfant qu'on a lu (`player.choc`, v372)
  let dernierChoc = 0;
  function cederLePassage(dt) {
    const px = player.pos.x, pz = player.pos.z;
    const voitures = [];
    // L'ENFANT AUSSI, À PIED OU AU VOLANT (v245). Max, après la v244 : « les
    // voitures passent les unes sur les autres ». Mesuré en roulant sur la rue
    // de Rivoli : soixante et onze relevés sur quatre-vingt-quatorze où une
    // voiture de la rue était DANS la voiture de l'enfant, et à l'arrêt sur la
    // chaussée un convoi entier lui passait au travers. Les convois cédaient
    // entre eux depuis la v244 — jamais à l'enfant, qui n'était pas dans la
    // liste. Il y est : sa voiture (4,4 × 2,26, cap du regard) ou lui-même à
    // pied (un carré à sa carrure). Il ne cède à personne ; la rue s'arrête
    // devant lui, comme devant tout ce qui est sur son chemin.
    const enVehicule = player.gabarit > 1;
    const capJ = player.yaw + Math.PI, uxJ = Math.sin(capJ), uzJ = Math.cos(capJ);
    const demi = player.gabarit / 2;
    voitures.push({
      c: null, i: -1, cle: CLE_ENFANT, x: px, y: player.pos.y, z: pz, ux: uxJ, uz: uzJ, enfant: true,
      rect: enVehicule ? rectangle(px, pz, uxJ, uzJ)
        : [[px - demi, pz - demi], [px + demi, pz - demi], [px + demi, pz + demi], [px - demi, pz + demi]],
      balayage: null, veut: null,
    });
    // LES TRAINS AUSSI (v304). Max, captures d'iPhone : sa voiture sur la
    // voie, et le train qui la traverse — l'intérieur noir de la rame plein
    // l'écran quand la caméra se retrouve dedans. Un train ne cède à personne
    // et ne fait pas la queue, mais il ne passe pas au travers de l'enfant :
    // si ce que sa motrice va balayer touche l'enfant (à pied ou au volant),
    // la rame s'arrête, sans limite, comme à quai ; et chacune de ses
    // voitures entre dans la liste, pour que la voiture de l'enfant bute
    // dessus (`obstacleDevant`) et que la circulation d'un passage à niveau
    // l'attende. Un train qui touche DÉJÀ l'enfant continue — y rester, c'est
    // y rester pour toujours (v245) — et celui où l'enfant est assis aussi.
    // LES AMIS AUSSI (v305). Max, capture en ligne : la voiture de Marlon au
    // milieu d'un convoi de Paris. Sur SA tablette la rue lui cède le passage ;
    // sur celle d'Alice il n'était qu'un avatar, et la circulation lui passait
    // au travers. Chaque ami entre dans la liste comme l'enfant — sa voiture
    // s'il conduit, un carré à sa carrure s'il marche — et la rue attend devant
    // lui, sans limite, sur toutes les tablettes : c'est aussi ce qui garde la
    // même circulation partout, puisque tout le monde cède aux mêmes joueurs.
    if (amis) {
      let k = 0;
      for (const a of amis()) {
        if ((a.x - px) ** 2 + (a.z - pz) ** 2 > PORTEE_CEDE * PORTEE_CEDE) continue;
        const ux = Math.sin(a.cap), uz = Math.cos(a.cap), dm = (a.gabarit || 0.6) / 2;
        voitures.push({
          c: null, i: -1, cle: CLE_AMI - k++, x: a.x, y: a.y, z: a.z, ux, uz, enfant: true, ami: true,
          vehicule: a.gabarit > 1,
          rect: a.gabarit > 1 ? rectangle(a.x, a.z, ux, uz)
            : [[a.x - dm, a.z - dm], [a.x + dm, a.z - dm], [a.x + dm, a.z + dm], [a.x - dm, a.z + dm]],
          balayage: null, veut: null,
        });
      }
    }
    const rectEnfant = voitures[0].rect;
    for (let ci = 0; ci < convois.length; ci++) {
      const c = convois[ci];
      if (!c.rail) continue;
      c.bloque = false;
      const tete = c.parcours.a(c.dElement(0));
      if (Math.hypot(tete.x - px, tete.z - pz) > PORTEE_CEDE + c.ecart * c.nb) continue;
      let dedans = false;
      for (let i = 0; i < c.nb; i++) {
        const d = c.dElement(i);
        const q = c.parcours.a(d);
        if ((q.x - px) ** 2 + (q.z - pz) ** 2 > PORTEE_CEDE * PORTEE_CEDE) continue;
        const cap = c.parcours.capLisse(d), ux = Math.sin(cap), uz = Math.cos(cap);
        const rect = rectangle(q.x, q.z, ux, uz, DEMI_LONG_RAME, DEMI_LARG_RAME);
        if (Math.abs(q.y - player.pos.y) < 2.5 && seTouchent(rect, rectEnfant)) dedans = true;
        voitures.push({ c, ci, i, cle: -2 - ci * 1000 - i, d, x: q.x, y: q.y, z: q.z, ux, uz,
          rect, balayage: null, veut: null, rail: true });
      }
      if (dedans || c.attente > 0) continue;
      const d0 = c.dElement(0), q0 = c.parcours.a(d0);
      if (Math.abs(q0.y - player.pos.y) > 3) continue;
      for (const pas of PAS_TRAIN) {
        const q = c.parcours.a(d0 + pas), cap = c.parcours.capLisse(d0 + pas);
        if (seTouchent(rectangle(q.x, q.z, Math.sin(cap), Math.cos(cap), DEMI_LONG_RAME, DEMI_LARG_RAME), rectEnfant)) {
          c.bloque = true; break;
        }
      }
    }
    for (let ci = 0; ci < convois.length; ci++) {
      const c = convois[ci];
      if (!c.routier) continue;
      const tete = c.parcours.a(c.distance);
      const trainee = c.etendue();
      if (Math.hypot(tete.x - px, tete.z - pz) > PORTEE_CEDE + trainee) { c.attend.fill(0); c.cible.fill(Infinity); c.urgence.fill(0); c.cause.fill(0); continue; }
      for (let i = 0; i < c.nb; i++) {
        if (c.pris.has(i)) { c.attend[i] = 0; c.cible[i] = Infinity; c.urgence[i] = 0; continue; }       // prise par un enfant (v305)
        const d = c.dElement(i);
        const q = c.parcours.a(d);
        if ((q.x - px) ** 2 + (q.z - pz) ** 2 > PORTEE_CEDE * PORTEE_CEDE) { c.attend[i] = 0; c.cible[i] = Infinity; c.urgence[i] = 0; continue; }
        const cap = c.parcours.capLisse(d), ux = Math.sin(cap), uz = Math.cos(cap);
        voitures.push({ c, ci, i, cle: ci * 1000 + i, d, x: q.x, y: q.y, z: q.z, ux, uz,
          rect: rectangle(q.x, q.z, ux, uz, c.demiLong), balayage: null, veut: null });
      }
    }
    // LES PIÉTONS AUSSI (v372). Jusqu'ici ce sont eux qui s'écartaient
    // (`vehiculeApproche`, v259), et la rue ne les voyait pas ; à quarante
    // kilomètres à l'heure, un passant qui presse le pas ne suffit plus à
    // garantir ce que la maison promet : on ne renverse jamais personne. La
    // voiture freine donc devant un piéton sur son chemin, sans limite de
    // patience, comme devant l'enfant — et elle continue de dire qu'elle
    // VEUT passer (`enMarche`), pour que le passant s'écarte.
    if (pietons || pietonsPoses.length) {
      let k = 0;
      for (const n of pietonsPoses.length ? [...(pietons ? pietons() : []), ...pietonsPoses] : pietons()) {
        if (!n || !n.pos) continue;
        const x = n.pos.x, z = n.pos.z;
        if ((x - px) ** 2 + (z - pz) ** 2 > PORTEE_CEDE * PORTEE_CEDE) continue;
        const dm = 0.35;
        voitures.push({ c: null, i: -1, cle: CLE_PIETON - k++, x, y: n.pos.y, z, ux: 0, uz: 1, enfant: true, pieton: true,
          rect: [[x - dm, z - dm], [x + dm, z - dm], [x + dm, z + dm], [x - dm, z + dm]], balayage: null, veut: null });
      }
    }
    // L'ALLURE D'UNE VOITURE DE LA LISTE, le long d'une direction (ux, uz) :
    // c'est ce que la suiveuse peut garder derrière elle (v372).
    const vEnfant = player.gabarit > 1 ? Math.max(0, player.vitesseVoiture || 0) : 0;
    const allureLe = (b, ux, uz) => {
      const dot = Math.max(0, b.ux * ux + b.uz * uz);
      if (b.pieton || b.ami) return 0;
      if (b.enfant) return vEnfant * dot;
      const c = b.c;
      if (b.rail) return (c.bloque ? 0 : (c.vitesseActuelle ?? c.vitesse)) * dot;
      const v = c.vLoc && c.vLoc[b.i] >= 0 ? c.vLoc[b.i] : c.vGrilleDe(b.i);
      return v * dot;
    };
    // LE BALAYAGE GRANDIT AVEC LA VITESSE (v372). Huit blocs suffisaient à
    // quinze kilomètres à l'heure ; à cinquante, une voiture a besoin de vingt-
    // cinq blocs pour s'arrêter en douceur. On regarde donc jusqu'à sa distance
    // de freinage, plus une demi-seconde de réaction.
    const porteeDe = (a) => {
      const c = a.c, v = Math.max(c.vLoc[a.i] >= 0 ? c.vLoc[a.i] : 0, c.vGrilleDe(a.i));
      return Math.min(40, 6 + v * v / (2 * FREIN) + v * 0.5);
    };
    const balayer = (a) => {
      if (a.balayage) return a.balayage;
      a.balayage = []; a.pas = [];
      // LES FILES SE SERRENT AU ROUGE (v429). Au pas d'un bloc et demi, la
      // voiture s'arrêtait entre 1,1 et 2,6 blocs de celle qui la précède
      // (médiane 1,9 à 2,4 mesurée, v423) ; une file au feu se lisait comme un
      // chapelet clairsemé. Les deux premiers blocs se balaient au quart : on
      // s'arrête entre 1,1 et 1,35 bloc, pare-chocs contre pare-chocs comme
      // dans une vraie rue. Au-delà, le pas d'avant (le coût ne bouge guère).
      for (let pas = 0.5; pas <= a.portee; pas += pas < 2 ? 0.25 : 1.5) {
        const q = a.c.parcours.a(a.d + pas), cap = a.c.parcours.capLisse(a.d + pas);
        // (soixante centimètres de plus devant et derrière : on s'arrête un
        // peu AVANT le contact, pas dessus)
        a.balayage.push(rectangle(q.x, q.z, Math.sin(cap), Math.cos(cap), a.c.demiLong + 0.6, DEMI_LARG + 0.15));
        a.pas.push(pas);
      }
      return a.balayage;
    };
    for (const a of voitures) {
      if (a.enfant || a.rail) continue;
      a.portee = porteeDe(a);
      const loin = (a.portee + 7) * (a.portee + 7);
      for (const b of voitures) {
        if (a === b || Math.abs(a.y - b.y) > 2.5) continue;
        const ex = b.x - a.x, ez = b.z - a.z;
        if (ex * ex + ez * ez > loin) continue;
        const devantMoi = ex * a.ux + ez * a.uz;
        if (devantMoi < -a.c.demiLong) continue;               // derrière moi : pas mon affaire
        // Déjà DANS la voiture de l'enfant (il s'est posé dessus, ou l'a
        // rattrapée) : continuer est la seule façon d'en sortir ; y attendre
        // sans limite, c'est rester dedans pour toujours.
        if (b.enfant && seTouchent(a.rect, b.rect)) continue;
        // Dans SA file, la grille garde déjà les distances (v372) : on ne
        // freine sur celle qui précède que si elle s'en écarte — arrêtée au
        // feu, retenue par l'enfant — sinon chaque virage ferait freiner toute
        // la file une seconde fois.
        // et celles qui SUIVENT dans la file sont derrière, par construction
        // (le plancher, v283) — même quand un virage serré en pose une contre
        // mon flanc. La regarder bloquait les deux : elle attend que je parte,
        // j'attends qu'elle parte (mesuré à Paris, une file entière à l'arrêt).
        // Seule exception, la queue qui précède la tête d'un tour.
        // (seulement celles qui sont derrière LE LONG DU TRACÉ : un circuit en
        // huit repasse par son propre carrefour, et la voiture qui le croise là
        // est bien devant)
        // — et seulement les deux qui suivent : au croisement du huit (−333, 271)
        // c'est la HUITIÈME derrière qui repasse devant, à moins de quarante
        // blocs le long du tracé dans un tour lent
        if (b.c === a.c && b.i > a.i && b.i - a.i <= 2 && a.d - b.d > 0 && a.d - b.d < 40) continue;
        // la jumelle d'une seconde voie partage la distance de la file (v423) :
        // celle qui la SUIT sur la ligne est derrière, comme dans la file
        if (b.c && b.c !== a.c && memeLigne(a.c, b.c) && a.d - b.d > 0 && a.d - b.d < 40) continue;
        const devantDansLaFile = b.c === a.c && (b.i === a.i - 1 || (a.i === 0 && b.i === a.c.nb - 1));
        // (et la grille ne voit pas un virage en épingle : deux voisines
        // séparées de sept blocs le long du tracé peuvent s'y toucher en
        // coupant — on regarde donc celle qui précède, toujours)
        // Là où elle EST, pas là où elle sera (v244) : on balaie MON tracé
        // contre SON rectangle actuel. Le premier pas qui la touche dit à quelle
        // distance s'arrêter — le pas d'avant (v372).
        const R = balayer(a);
        const travers = !b.enfant && b.ux * a.ux + b.uz * a.uz < 0.7;
        if (travers && b.c && !b.rail) {
          // EN TRAVERS, ON PRÉVOIT (v372). Deux voitures qui arrivent ensemble
          // à un carrefour ne sont ni l'une ni l'autre sur le chemin de l'autre
          // AVANT d'y entrer — à quinze km/h on le voyait encore à temps, à
          // cinquante non. On pose donc l'autre là où elle SERA quand on
          // passera chaque pas du balayage (sa vitesse, le long de son tracé),
          // et c'est le premier contact prévu qui compte. Au-delà de ce qu'il
          // faut pour freiner en douceur, plus quatre blocs, on ne regarde pas :
          // une voiture qui coupe la route à trente blocs aura passé.
          const va = Math.max(1, a.c.vLoc[a.i] >= 0 ? a.c.vLoc[a.i] : a.c.vGrilleDe(a.i));
          const vb = b.c.vLoc && b.c.vLoc[b.i] >= 0 ? b.c.vLoc[b.i] : b.c.vGrilleDe(b.i);
          const limite = Math.max(6.5, va * va / (2 * FREIN) + 4);
          // le chemin de l'autre pendant les deux secondes et demie qui viennent
          const RBs = [], tbs = [];
          for (let t = 0; t <= 2.5; t += 0.25) {
            if (vb <= 0.2 && t > 0) break;
            const db = b.d + vb * t, q = b.c.parcours.a(db), cap = b.c.parcours.capLisse(db);
            RBs.push(rectangle(q.x, q.z, Math.sin(cap), Math.cos(cap), b.c.demiLong + 0.5, DEMI_LARG + 0.4)); tbs.push(t);
          }
          // le premier pas de MON balayage que son chemin occupe à peu près au
          // moment où j'y serai (à une seconde et quart près) : c'est un
          // croisement, et l'on s'arrête avant — ou c'est elle qui s'arrête
          // (paire mutuelle : la première arrivée passe)
          let trouve = null;
          for (let k = 0; k < R.length && a.pas[k] <= limite && !trouve; k++) {
            const tau = a.pas[k] / va;
            if (seTouchent(R[k], b.rect)) { trouve = { k, tau, dejaLa: true }; break; }
            for (let j = 0; j < RBs.length; j++) {
              if (Math.abs(tbs[j] - tau) > 1.25) continue;
              if (seTouchent(R[k], RBs[j])) { trouve = { k, tau: Math.min(tau, tbs[j] + 0.01), dejaLa: false }; break; }
            }
          }
          if (trouve) {
            const s = trouve.k > 0 ? a.pas[trouve.k - 1] : 0;
            (a.veut || (a.veut = new Map())).set(b.cle, { devant: devantMoi, s, v: 0, tau: a.pas[trouve.k] / va, dejaLa: trouve.dejaLa });
          }
          continue;
        }
        for (let k = 0; k < R.length; k++) {
          if (!seTouchent(R[k], b.rect)) continue;
          const s = k > 0 ? a.pas[k - 1] : 0;
          if (travers) {
            const va = Math.max(0, a.c.vLoc[a.i]);
            if (s > Math.max(6.5, va * va / (2 * FREIN_URGENCE) + 2)) break;
          }
          (a.veut || (a.veut = new Map())).set(b.cle, { devant: devantMoi, s, v: allureLe(b, a.ux, a.uz), tau: s / Math.max(1, a.c.vLoc[a.i]), dejaLa: true });
          break;
        }
      }
    }
    const parCle = new Map(voitures.map((v) => [v.cle, v]));
    dernieres = voitures; enMarcheCache = null;
    // Ce que chaque voiture peut viser, et ce qui la retient.
    for (const a of voitures) {
      if (a.enfant || a.rail) continue;
      let cible = Infinity, bloquant = null;
      if (a.veut) {
        for (const [cle, g] of a.veut) {
          const b = parCle.get(cle);
          if (b && b.veut && b.veut.has(a.cle)) {
            // paire mutuelle : la plus engagée passe — celle que l'autre voit le
            // plus loin devant elle ; à égalité, la plus petite
            // paire mutuelle : passe celle qui arrive LA PREMIÈRE au point de
            // contact (v372) — la plus engagée ; à égalité, la plus petite clé
            // — sauf si l'autre est DÉJÀ sur mon chemin et moi pas sur le sien :
            // on ne passe pas devant un capot qui dépasse dans sa voie
            const lui = b.veut.get(a.cle);
            if (g.dejaLa !== lui.dejaLa) { if (lui.dejaLa) continue; }
            else if (lui.tau > g.tau || (lui.tau === g.tau && a.cle < cle)) continue;
          }
          const vc = allureDevant(g.s - 0.5, g.v);
          // le contact imminent ne vaut qu'EN TRAVERS d'une autre file : dans la
          // sienne, le plancher (v283) garde déjà la longueur d'une voiture, et
          // piler derrière celle qui précède faisait un arrêt sec au feu
          if (vc < cible) { cible = vc; bloquant = b; a.contact = g.s === 0 && g.dejaLa && g.v < 0.5 && !(b && memeLigne(b.c, a.c)); }
          // DEVANT L'ENFANT, UN AMI OU UN PIÉTON, ON PILE QUAND LE FREINAGE NE
          // SUFFIT PLUS (v372). Le freinage doux est pour le confort ; vue tard
          // — l'enfant posé devant elle, une image lente du banc —, une voiture
          // à cinquante ne s'arrête plus en douceur avant lui, et dès qu'elle le
          // touche, « pas si l'on est déjà dedans » la laisse le traverser.
          // Mesuré : trois et quatre relevés au travers, deux passages de
          // `monte.js` seuls, zéro sur la v363. Marge : une image à trois par
          // seconde, plus le demi-bloc d'avant le contact.
          if (b && b.enfant && !b.rail && g.v < 0.5) {
            const va = Math.max(0, a.c.vLoc[a.i] >= 0 ? a.c.vLoc[a.i] : a.c.vGrilleDe(a.i));
            if (va * va / (2 * FREIN_URGENCE) + va * 0.35 + 0.5 >= g.s) { cible = 0; bloquant = b; a.contact = true; }
          }
        }
      }
      a.cible = cible; a.bloquant = bloquant;
      a.legit = !!(bloquant && (bloquant.enfant || bloquant.rail));
    }
    // UNE FILE DERRIÈRE UN FEU NE FORCE PAS LE PASSAGE (v372). La patience de
    // quatre secondes (v244) dénoue les paires qui se regardent en travers d'un
    // carrefour ; appliquée à une file arrêtée derrière un feu ou derrière
    // l'enfant, elle faisait passer la deuxième voiture AU TRAVERS de la
    // première au bout de quatre secondes. Est « légitime » ce qui est retenu
    // par un feu, l'enfant, un piéton, un train — ou par la voiture de SA file
    // qui l'est. Une voiture d'une AUTRE file arrêtée en travers garde la
    // patience de quatre secondes : sans elle, deux files qui se bouchent
    // mutuellement un carrefour s'y bloqueraient pour toujours (mesuré : une
    // file de Paris arrêtée trente secondes derrière la queue d'une autre).
    const feuDe = new Map();
    for (const a of voitures) {
      if (a.enfant || a.rail || !feuRouge) continue;
      const f = feuRouge(a.x, a.z, Math.atan2(a.ux, a.uz));
      if (!f) continue;
      const s = f === true ? 0 : f.s;
      const v = a.c.vLoc[a.i] >= 0 ? a.c.vLoc[a.i] : a.c.vGrilleDe(a.i);
      // À L'ORANGE, ON PASSE SI L'ON NE PEUT PLUS S'ARRÊTER (zone de dilemme)
      if (f !== true && f.orange && passeAOrange(v, s)) continue;
      feuDe.set(a, allureDevant(s));
      a.legit = true;
    }
    // Et dans SA file, quel que soit le rang (v372) : au croisement d'un
    // circuit en huit (−333, 271), la voiture qui attend devant est une voiture
    // de la même file, douze rangs plus loin, elle-même arrêtée derrière un feu.
    // Ne propager que par la voisine faisait de cette attente un « nœud » : au
    // bout de quatre secondes la voiture passait au travers (mesuré, 1,8 % des
    // paires). Une file ne peut pas former de cycle légitime : la légitimité
    // part toujours d'un feu, de l'enfant, d'un piéton ou d'un train.
    // ET « DEVANT L'ENFANT » NE VEUT PAS DIRE « SEULEMENT LUI » (v383). Une
    // voiture gênée par un joueur (ou un train, clé négative) ET par une
    // voiture de la rue retombait sur la patience de quatre secondes, puis
    // `repart` la lançait à l'aveugle AU TRAVERS de l'enfant ou de l'ami —
    // mesuré à la sonde (`sonde-intrus-ami.cjs`) chez Alice : cinq voitures
    // entrées dans celle de Marlon, toutes en `repart`. Dès qu'un joueur est
    // dans son `veut`, elle est légitime : elle attend sans limite, et un
    // `repart` déjà lancé s'arrête net devant lui.
    for (const a of voitures) {
      if (a.enfant || a.rail || !a.veut) continue;
      for (const k of a.veut.keys()) if (k < 0) { a.legit = true; a.c.repart[a.i] = 0; break; }
    }
    for (let passe = 0; passe < 6; passe++) {
      for (const a of voitures) if (!a.legit && a.bloquant && memeLigne(a.bloquant.c, a.c) && a.bloquant.legit) a.legit = true;
    }
    for (const a of voitures) {
      if (a.enfant || a.rail) continue;
      const c = a.c, i = a.i;
      let cible = a.cible;
      const v = c.vLoc[i] >= 0 ? c.vLoc[i] : 0;
      if (c.repart[i] > 0) { c.repart[i] -= dt; if (!a.legit) { cible = Infinity; a.contact = false; } }
      else if (cible < 0.5 && v < 0.3 && !a.legit) {
        c.attenteDepuis[i] += dt;
        if (c.attenteDepuis[i] > 4) { cible = Infinity; a.contact = false; c.repart[i] = 2; c.attenteDepuis[i] = 0; }
      } else c.attenteDepuis[i] = 0;
      // ET UN FEU ROUGE ARRÊTE AUSSI (v273) — devant la ligne, jamais dans le
      // carrefour, et sans patience : un feu ne se force pas, il passe au vert.
      // Depuis la v372 on y arrive en FREINANT, pas en pilant.
      const f = feuDe.get(a);
      a.cause = cible === Infinity ? null : !a.bloquant ? '?' : a.bloquant.pieton ? 'pieton'
        : a.bloquant.ami ? 'ami' : a.bloquant.enfant ? 'enfant' : a.bloquant.rail ? 'train'
          : (a.bloquant.c === c && a.bloquant.i === i - 1) || (a.bloquant.c !== c && memeLigne(a.bloquant.c, c)) ? (a.legit ? 'file-feu' : 'file') : (a.legit ? 'voiture-feu' : 'voiture');
      if (f !== undefined && f < cible) { cible = f; c.repart[i] = 0; c.attenteDepuis[i] = 0; a.cause = 'feu'; }
      c.cible[i] = cible;
      c.urgence[i] = a.contact && cible === a.cible ? 1 : 0;
      c.cause[i] = a.cause === 'feu' || a.cause === 'file-feu' ? 1 : a.cause ? 2 : 0;
      a.parPieton = !!(a.bloquant && a.bloquant.pieton && cible === a.cible);
      c.attend[i] = cible < c.vGrilleDe(i) - 0.05 ? 1 : 0;
    }
  }

  // ET L'ENFANT NE TRAVERSE PAS LA RUE NON PLUS (v245). Sa voiture, posée à
  // (x, z) avec ce cap, toucherait-elle une voiture de la circulation ? C'est
  // `player.js` qui le demande avant d'avancer — la boîte de collision du
  // joueur ne connaît que les blocs. On relit la collecte de la dernière
  // image : les voitures de la rue avancent de quelques centimètres entre
  // deux images, c'est sans conséquence pour un arrêt.
  function obstacleDevant(x, z, cap) {
    const ux = Math.sin(cap), uz = Math.cos(cap);
    const moi = rectangle(x, z, ux, uz);
    for (const b of dernieres) {
      if (b.enfant && !b.ami) continue;
      if ((b.x - x) ** 2 + (b.z - z) ** 2 > 9 * 9 || Math.abs(b.y - player.pos.y) > 2.5) continue;
      if (seTouchent(moi, b.rect)) return true;
    }
    return false;
  }

  // LA VOITURE QU'ON TOUCHE, PAS SEULEMENT LE FAIT DE LA TOUCHER (v397,
  // conduite-physique). `obstacleDevant` dit « oui » ; le choc a besoin de
  // savoir CONTRE QUOI : sa boîte (centre, axe, demi-longueur, demi-largeur,
  // relues sur le rectangle de la collecte — une rame de train n'a pas les
  // cotes d'une voiture) et son allure du moment le long de son axe (zéro si
  // elle attend, comme `enMarche`). Lecture seule, une copie : rien de la
  // collecte ne sort d'ici.
  function voitureContre(x, z, cap) {
    const ux = Math.sin(cap), uz = Math.cos(cap);
    const moi = rectangle(x, z, ux, uz);
    for (const b of dernieres) {
      if (b.enfant && !b.ami) continue;
      if ((b.x - x) ** 2 + (b.z - z) ** 2 > 8 * 8 || Math.abs(b.y - player.pos.y) > 2.5) continue;
      if (!seTouchent(moi, b.rect)) continue;
      const vx = b.uz, vz = -b.ux;
      let a = 0, l = 0;
      for (const [px, pz] of b.rect) {
        a = Math.max(a, Math.abs((px - b.x) * b.ux + (pz - b.z) * b.uz));
        l = Math.max(l, Math.abs((px - b.x) * vx + (pz - b.z) * vz));
      }
      const c = b.c;
      let v = 0;
      if (c && !b.ami && !(c.attend && c.attend[b.i]) && !c.bloque && !(c.attente > 0)) {
        const allure = c.rapport ? c.rapport[b.i] : (c.retard && c.retard[b.i] > 0 ? 1.5 : 1);
        v = (c.vitesseActuelle ?? c.vitesse ?? 0) * allure;
      }
      return { x: b.x, z: b.z, ux: b.ux, uz: b.uz, a, b: l, v, rail: !!b.rail };
    }
    return null;
  }

  // ET UN PIÉTON NE TRAVERSE PAS UNE VOITURE (v259). Max, capture à la
  // Bastille : « les passants traversent la voiture de l'enfant ». Un passant
  // ne connaît que les blocs solides (`sweep`, marlon.js) ; une voiture n'en
  // est pas un. Ce point (les pieds d'un piéton) est-il DANS une voiture de
  // la rue, ou dans celle de l'enfant quand il est au volant ? On relit la
  // collecte de la dernière image, comme `obstacleDevant`. L'enfant à pied
  // n'est pas une voiture : on passe à côté de lui comme avant.
  function voitureA(x, z, y) {
    for (const b of dernieres) {
      if (b.pieton || (b.enfant && !(b.ami ? b.vehicule : player.gabarit > 1))) continue;
      if ((b.x - x) ** 2 + (b.z - z) ** 2 > 6 * 6 || Math.abs(b.y - y) > 2.5) continue;
      if (dansRectangle(b.rect, x, z)) return true;
    }
    return false;
  }
  // CE QUI ROULE, ET À QUELLE ALLURE (v259) : les voitures de la rue à portée
  // de l'enfant, telles que `cederLePassage` les a vues, avec leur vitesse
  // du moment (zéro si elles attendent). C'est ce qu'un piéton lit pour
  // s'écarter d'une voiture qui arrive (`world.vehiculeApproche`, main.js).
  //
  // UNE FOIS PAR IMAGE, PAS UNE FOIS PAR PIÉTON. Mon premier jet refaisait
  // cette liste à chaque appel : à Manhattan, des centaines de voitures à
  // portée, cent quarante piétons, deux appels chacun par image — la page
  // tombait à 0,4 image par seconde (mesuré à la sonde), et quatre suites du
  // portail mesuraient une boucle d'affichage moribonde. La liste est figée
  // tant que `cederLePassage` n'a pas refait sa collecte, et l'on ne rend
  // JAMAIS ce tableau à quelqu'un qui pourrait le modifier : lecture seule.
  // LES DÉGÂTS (v356) : la voiture de la rue la plus proche d'un point de
  // choc, telle que `cederLePassage` l'a vue à la dernière image. Un crochet
  // court, lu par degats3d.js (branché par main.js) : c'est lui qui froisse
  // la voiture, ce fichier ne fait que dire laquelle.
  function voitureRueProche(x, z, y, rayon = 3.5) {
    let mieux = null, dm = rayon * rayon;
    for (const b of dernieres) {
      if (b.enfant || b.rail || !b.c || Math.abs(b.y - y) > 2.5) continue;
      const d = (b.x - x) ** 2 + (b.z - z) ** 2, m = b.c.elements[b.i];
      if (d < dm && m) { dm = d; mieux = m; }
    }
    return mieux;
  }

  // LES DÉGÂTS À PLUSIEURS (v363) : une voiture de la rue se nomme par
  // `clé#rang` (v305), la seule chose qui soit la même d'une tablette à
  // l'autre. Crochet court, lu par degats3d.js (branché par main.js) : un
  // maillage → son nom, un nom → son maillage (null si la place est vide ou
  // prise). Appelé au choc, et deux fois par seconde sur une poignée de noms.
  function voitureNommee(q) {
    if (typeof q === 'string') {
      const k = q.lastIndexOf('#');
      const c = k < 0 ? null : convois.find((x) => x.cle === q.slice(0, k));
      const i = Number(q.slice(k + 1));
      return c && !c.pris.has(i) ? c.elements[i] || null : null;
    }
    for (const c of convois) { const i = c.elements.indexOf(q); if (i >= 0) return `${c.cle}#${i}`; }
    return null;
  }

  let enMarcheCache = null;
  function enMarche() {
    if (enMarcheCache) return enMarcheCache;
    const out = [];
    for (const b of dernieres) {
      if (b.enfant || b.rail) continue;
      const c = b.c;
      // ce qu'elle a OBTENU, pas ce qu'elle demandait (v283) : un piéton ne
      // s'écarte pas devant une voiture que le plancher tient immobile — SAUF
      // si c'est lui qu'elle attend (v372) : elle veut encore passer, et c'est
      // ce qui le fait s'écarter au lieu de la bloquer pour toujours (la règle
      // de `pousse`, v259, pour la voiture de l'enfant).
      let v = c.vLoc && c.vLoc[b.i] >= 0 ? c.vLoc[b.i] : c.vGrilleDe(b.i) * (c.rapport ? c.rapport[b.i] : 1);
      if (b.parPieton) v = Math.max(v, c.vGrilleDe(b.i));
      if (v < 0.3) continue;                             // à l'arrêt : personne ne s'en écarte
      out.push({ x: b.x, y: b.y, z: b.z, ux: b.ux, uz: b.uz, v, demiLarg: DEMI_LARG });
    }
    enMarcheCache = out;
    return out;
  }
  // Un point est-il dans un rectangle orienté (quatre sommets dans l'ordre) ?
  // Du même côté de chacune des quatre arêtes.
  function dansRectangle(R, x, z) {
    let signe = 0;
    for (let k = 0; k < 4; k++) {
      const a = R[k], b = R[(k + 1) % 4];
      const c = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]);
      if (c === 0) continue;
      if (signe === 0) signe = c > 0 ? 1 : -1;
      else if ((c > 0 ? 1 : -1) !== signe) return false;
    }
    return true;
  }

  // L'HORLOGE DE LA RUE (v305), en secondes RÉELLES — comme les feux (v273),
  // et pour la même raison : ce qu'elle décide doit être le même sur une
  // tablette qui rame et sur celle d'à côté. `dtReel` est borné par l'appelant
  // (deux secondes, `chronoReel`) ; l'hôte donne la sienne avec l'heure du ciel.
  let horloge = 0;
  function update(dt, dtReel = dt) {
    horloge += dtReel;
    lireLeChoc();
    // la patience se compte en temps RÉEL (v372) : en `dt`, borné à un
    // vingtième, quatre secondes en duraient vingt-cinq sur un banc qui rame
    cederLePassage(dtReel);
    // la seconde voie d'une autoroute, quand l'enfant approche (v423) — une
    // par image au plus
    for (const c of convois) {
      const w = c.voiesEnAttente;
      if (!w || player.pos.x < w.x0 || player.pos.x > w.x1 || player.pos.z < w.z0 || player.pos.z > w.z1) continue;
      c.voiesEnAttente = null; w.poser(); break;
    }
    fabrication.fin = performance.now() + FAB_MS;
    for (const c of convois) c.update(dtReel, player.pos, horloge);
  }
  // LA VOITURE QUE L'ENFANT PERCUTE S'ARRÊTE (v372). La session de conduite
  // publie `player.choc` = { force, t, x, z } quand la voiture de l'enfant
  // heurte quelque chose ; on le lit SI PRÉSENT. La voiture de la rue la plus
  // proche du point de choc s'immobilise trois à six secondes, feux de
  // détresse allumés, puis repart. C'est LOCAL — l'ami ne voit pas l'arrêt sur
  // sa tablette, comme il ne voit pas l'instant où une voiture cède (v305) —
  // et c'est déclaré.
  function lireLeChoc() {
    const ch = player.choc;
    if (!ch || typeof ch.t !== 'number' || ch.t === dernierChoc) return;
    dernierChoc = ch.t;
    if (performance.now() - ch.t > 1500) return;
    heurter(ch.x ?? player.pos.x, ch.z ?? player.pos.z, ch.force ?? 0.5);
  }
  function heurter(x, z, force = 0.5) {
    let meilleur = null, dMin = 4.5 * 4.5;
    for (const b of dernieres) {
      if (!b.c || b.rail || b.enfant) continue;
      const d = (b.x - x) ** 2 + (b.z - z) ** 2;
      if (d < dMin) { dMin = d; meilleur = b; }
    }
    if (!meilleur) return null;
    meilleur.c.heurte[meilleur.i] = 3 + 3 * Math.max(0, Math.min(1, force));
    return `${meilleur.ci}:${meilleur.i}`;
  }
  // On glisse vers l'heure de l'hôte quand l'écart est petit, on saute quand
  // il est grand — la règle du ciel (`adopterCiel`) : une seconde de rue, ce
  // sont quatre blocs de voiture, et c'est ce qu'on accepte de voir glisser.
  function adopterHorloge(t) {
    if (typeof t !== 'number' || !isFinite(t)) return;
    const e = t - horloge;
    horloge = Math.abs(e) > 1 ? t : horloge + e * 0.5;
  }

  // La place libre la plus proche d'un point donné : c'est elle qui décide si
  // le bouton « monter à bord » apparaît. On compare en trois dimensions —
  // le métro passe au-dessus des rues, et on ne monte pas dedans depuis le
  // trottoir six mètres plus bas.
  // LE RAYON D'EMBARQUEMENT. Max : « assure-toi que l'on peut monter dans
  // n'importe quel véhicule en déplacement dans les villes. » Le code pour
  // conduire marchait ; c'était ATTRAPER qui ne marchait pas. Cinq blocs
  // autour d'une voiture à 4,2 m/s, c'est une fenêtre d'une seconde — un
  // enfant de sept ans la rate à tous les coups, et il croit que le jeu ne
  // veut pas de lui. Neuf blocs lui laissent deux secondes, et l'on choisit
  // toujours la PLUS PROCHE : on ne monte pas dans une voiture d'en face.
  function placeProche(pos, rayon = 4) {
    let meilleur = null, meilleureD = rayon;
    convois.forEach((c, ci) => {
      // UN SEUL TEST AVANT D'ENTRER DANS LES WAGONS.
      //
      // Cette fonction est appelée à chaque image, pour tous les convois du
      // jeu. Avec les quatre lignes de Washington, cela faisait quatre-vingts
      // positions recalculées par image — dont soixante-dix-huit à l'autre bout
      // du monde. La queue du convoi traîne derrière la tête d'au plus
      // `ecart × (wagons − 1)` le long du tracé, et une courbe est toujours plus
      // longue que sa corde : si la tête est plus loin que ça plus le rayon,
      // aucun wagon ne peut être à portée.
      const tete = c.place(0);
      const trainee = c.etendue();
      if (Math.hypot(tete.x - pos.x, tete.z - pos.z) > rayon + trainee) return;
      c.elements.forEach((m, i) => {
        if (c.pris.has(i)) return;
        const p = c.place(i);
        const d = Math.hypot(p.x - pos.x, p.z - pos.z);
        if (d > meilleureD || Math.abs(p.y - pos.y) > 2.5) return;
        meilleureD = d;
        meilleur = { id: `${ci}:${i}`, nom: c.nom, emoji: c.emoji, d, x: p.x, y: p.y, z: p.z, cap: p.cap };
      });
    });
    return meilleur;
  }

  // CE QUE `montrer` A DÉCIDÉ POUR LA PLACE LA PLUS PROCHE (v322) — la sonde
  // de « une place à trois blocs sans voiture dessinée » (vu en v306). Rend la
  // portée du convoi, la tête, la traînée, et ce que `montrer` calcule pour
  // cette place depuis la position qu'il a VUE à son dernier tour et depuis
  // celle d'aujourd'hui : un écart entre les deux sépare « pas encore repassé
  // dans `montrer` » d'un vrai défaut de la règle.
  function diagPlace(pos, rayon = 5) {
    const p = placeProche(pos, rayon);
    if (!p) return null;
    const [ci, i] = p.id.split(':').map(Number);
    const c = convois[ci];
    const tete = c.parcours.a(c.distance);
    const q = c.parcours.a(c.dElement(i));
    const portee = (c.decouvert && c.decouvert(tete)) ? VU : c.vu;
    const trainee = c.etendue();
    const regle = (x, z) => ({
      prefiltre: Math.hypot(tete.x - x, tete.z - z) <= portee + trainee,
      dedans: (q.x - x) ** 2 + (q.z - z) ** 2 < portee * portee,
    });
    const m = c.elements[i];
    return {
      id: p.id, d: +p.d.toFixed(2), maillage: !!m, visible: !!(m && m.visible), pris: c.pris.has(i),
      vu: c.vu, portee, tete: +Math.hypot(tete.x - pos.x, tete.z - pos.z).toFixed(1), trainee: +trainee.toFixed(1),
      retardMax: +c.retardMax().toFixed(1),
      depuisMontrer: c.vuT === undefined ? null : Math.round(performance.now() - c.vuT),
      ecartVu: c.vuX === undefined ? null : +Math.hypot(c.vuX - pos.x, c.vuZ - pos.z).toFixed(1),
      regleVue: c.vuX === undefined ? null : regle(c.vuX, c.vuZ), regleIci: regle(pos.x, pos.z),
    };
  }

  // PRENDRE LE VOLANT D'UNE VOITURE QU'ON VOIT PASSER.
  //
  // Max : « je veux que l'on puisse conduire n'importe quel type de voiture
  // dans le jeu. » Jusqu'ici, monter dans une voiture de ville, c'était s'y
  // laisser PORTER : le convoi suit son tracé, l'enfant est collé au siège.
  // Ce qu'il demande, c'est de la conduire.
  //
  // On la sort donc du convoi et on la rend à l'appelant, qui en fera une
  // monture — le mode qui sait déjà conduire. La circulation perd une voiture,
  // et c'est honnête : l'enfant vient de la prendre. Le modèle part avec elle,
  // sinon il monterait dans une autre voiture que celle qu'il a vue.
  function emprunter(id) {
    const [ci, i] = String(id).split(':').map(Number);
    const c = convois[ci];
    if (!c || !(i >= 0 && i < c.nb) || c.pris.has(i)) return null;
    // UNE PLACE VIDE SE PREND AUSSI (v306). `placeProche` rend à dessein les
    // places qu'aucun maillage n'occupe encore (v235 : « c'est ce qui permet
    // de monter dans un convoi qu'on rejoint ») ; `emprunter`, lui, refusait
    // une place sans maillage, et `embarquer` retombait alors sur le chemin du
    // métro — « 🚙 Tu montes dans le voiture ! Il t'emmène », l'enfant
    // passager d'une voiture sans conducteur, vu au banc à 2,8 blocs. On
    // fabrique la voiture à sa place : c'est celle que le convoi y aurait
    // dessinée. Sa laque, elle, se pose au chargement du modèle : prise dans
    // l'instant, elle garde sa livrée d'origine — personne ne l'avait encore
    // vue d'une autre couleur.
    const p = c.place(i);
    const mesh = c.element(i);
    const flotte = mesh.userData ? mesh.userData.flotte : null;
    const nom = mesh.userData ? mesh.userData.nomVoiture : null;
    // LA COULEUR PART AVEC LA VOITURE (v305). Max : « quand on monte dans une
    // voiture, elle change de couleur ». Le modèle partait avec elle depuis la
    // v194, pas sa laque : la monture neuve reprenait la couleur cuite dans le
    // fichier. `peinture` est la teinte que la rue lui avait posée, ou null
    // pour une voiture restée dans sa livrée d'origine.
    const peinture = mesh.userData ? (mesh.userData.peinture ?? null) : null;
    scene.remove(mesh);
    c.elements[i] = null;
    // LA PLACE RESTE, VIDE (v305). Depuis la v194 on RETIRAIT la place du
    // convoi (`splice`) : toutes les voitures de derrière avançaient d'un rang,
    // donc d'un écart — elles sautaient en avant sous les yeux de l'enfant —
    // et le rang d'une voiture cessait d'être le même d'une tablette à
    // l'autre. La place est marquée prise : le convoi ne la refabrique pas, ne
    // la dessine pas et ne la fait pas céder. La circulation perd une voiture,
    // et c'est honnête : l'enfant vient de la prendre (v194).
    c.pris.add(i);
    return { x: p.x, y: p.y, z: p.z, cap: p.cap, flotte, nom, peinture, origine: `${c.cle}#${i}` };
  }

  // CE QU'UN AMI A PRIS NE ROULE PLUS CHEZ NOUS NON PLUS (v305). Sa position
  // porte l'origine de sa voiture (`clé du convoi#rang`) : on vide la même
  // place ici, sinon on verrait la voiture deux fois — dans la rue ET sous
  // lui.
  function retirer(origine) {
    const k = String(origine || '').lastIndexOf('#');
    if (k < 0) return false;
    const cle = origine.slice(0, k), i = Number(origine.slice(k + 1));
    const c = convois.find((x) => x.cle === cle);
    if (!c || !(i >= 0 && i < c.nb) || c.pris.has(i)) return false;
    c.pris.add(i);
    if (c.elements[i]) { scene.remove(c.elements[i]); liberer(c.elements[i]); c.elements[i] = null; }
    return true;
  }

  // Où en est la place qu'on occupe. Renvoie null si le convoi a disparu —
  // c'est ce qui fait redescendre proprement plutôt que de rester accroché
  // à un fantôme.
  function place(id) {
    const [ci, i] = String(id).split(':').map(Number);
    const c = convois[ci];
    if (!c || !c.elements[i]) return null;
    return c.place(i);
  }

  return {
    metro, course, chaine, circulation, bus, update, placeProche, diagPlace, place, emprunter, retirer, obstacleDevant, voitureContre, voitureA, dansRectangle, enMarche, voitureRueProche, voitureNommee,
    adopterHorloge, horloge: () => horloge,
    // la fabrication par tranches (v429) : combien de voitures fabriquées et
    // différées depuis le lancement — ce qu'un témoin compte à l'arrivée
    fabrication: () => ({ faites: fabrication.faites, differees: fabrication.differees }),
    // le crochet des feux tricolores (v273), branché par main.js
    brancherFeux: (f) => { feuRouge = f; },
    // les amis de la partie (v305), branchés par main.js : où ils sont, leur cap,
    // et s'ils conduisent
    brancherAmis: (f) => { amis = f; },
    // pour les sondes (v383) : ce que `cederLePassage` a vu à la dernière
    // image — qui gêne qui (`veut`), qui attend, qui vient de forcer (`repart`)
    diagCeder: () => dernieres.map((a) => ({ cle: a.cle, x: +a.x.toFixed(1), z: +a.z.toFixed(1), ami: !!a.ami, enfant: !!a.enfant,
      veut: a.veut ? [...a.veut.keys()] : [], attend: a.c && a.c.attend ? a.c.attend[a.i] : null,
      depuis: a.c && a.c.attenteDepuis ? +a.c.attenteDepuis[a.i].toFixed(1) : null, repart: a.c && a.c.repart ? +a.c.repart[a.i].toFixed(1) : null,
      nom: a.c ? `${a.c.cle}#${a.i}` : null, cap: +Math.atan2(a.ux, a.uz).toFixed(2) })),
    // les piétons de la rue (v372), branchés par main.js : la circulation
    // freine devant eux
    brancherPietons: (f) => { pietons = f; },
    // pour les tests (v372) : où la grille met la tête du convoi `cle` à
    // l'heure de rue `h` — c'est ce qu'une autre tablette compare à la sienne
    distanceA: (cle, h) => { const c = convois.find((x) => x.cle === cle); if (!c || !c.horaire()) return null; return c.distanceA(h - (c.decalage || 0)).d; },
    // pour les tests : un point du tracé `avance` blocs devant la voiture i
    devantVoiture: (ci, i, avance = 0) => { const c = convois[ci]; if (!c) return null; const q = c.parcours.a(c.dElement(i) + avance); return { x: q.x, y: q.y, z: q.z }; },
    poserPieton: (x, y, z) => { const n = { pos: { x, y, z } }; pietonsPoses.push(n); return n; },
    retirerPietons: () => { pietonsPoses.length = 0; },
    // CE QUI RETIENT LA RUE (v372), pour les sondes : par cause, combien de
    // voitures à portée visent moins que leur grille, et combien sont à l'arrêt
    diagAttente: () => {
      const out = { voitures: 0 };
      for (const a of dernieres) {
        if (a.enfant || a.rail) continue;
        out.voitures++;
        if (!a.cause) continue;
        const k = a.cause, arret = a.c.vLoc[a.i] >= 0 && a.c.vLoc[a.i] < 0.3;
        out[k] = (out[k] || 0) + 1;
        if (arret) out[k + '·arrêt'] = (out[k + '·arrêt'] || 0) + 1;
      }
      out.tetes = dernieres.filter((a) => a.cause === 'feu' || a.cause === 'voiture' || a.cause === 'file-feu' && a.bloquant && a.bloquant.cause === 'voiture').slice(0, 6).map((a) => ({
        k: a.ci + ':' + a.i, cause: a.cause, x: Math.round(a.x), z: Math.round(a.z), u: [+a.ux.toFixed(2), +a.uz.toFixed(2)], v: +a.c.vLoc[a.i].toFixed(2),
        cible: +a.c.cible[a.i].toFixed(2), r: Math.round(a.c.retard[a.i]),
        b: a.bloquant ? (a.bloquant.ci + ':' + a.bloquant.i + ' ' + (a.bloquant.cause || '-') + ' dot ' + (a.ux * a.bloquant.ux + a.uz * a.bloquant.uz).toFixed(2) + ' s ' + (a.veut && a.veut.get(a.bloquant.cle) ? a.veut.get(a.bloquant.cle).s : '?')) : null,
        f: feuRouge ? feuRouge(a.x, a.z, Math.atan2(a.ux, a.uz)) : null }));
      return out;
    },
    // pour les sondes : ce qu'une voiture voit et vise, à la dernière collecte
    diagVoiture: (ci, i) => {
      const a = dernieres.find((v) => v.ci === ci && v.i === i);
      if (!a) return null;
      return { x: +a.x.toFixed(1), z: +a.z.toFixed(1), u: [+a.ux.toFixed(2), +a.uz.toFixed(2)], d: +a.d.toFixed(1),
        v: +a.c.vLoc[i].toFixed(2), vg: +a.c.vGrilleDe(i).toFixed(2), cible: +a.c.cible[i].toFixed(2), r: +a.c.retard[i].toFixed(1),
        cause: a.cause || null, portee: a.portee, bloquant: a.bloquant ? a.bloquant.ci + ':' + a.bloquant.i : null,
        veut: a.veut ? [...a.veut].map(([k, g]) => [k, +g.s.toFixed(1), +g.tau.toFixed(2), g.dejaLa]) : [] };
    },
    // pour les tests : heurter la voiture de la rue la plus proche d'un point
    heurter,
    // pour les tests : un point du tracé, en avant de la tête du convoi, là
    // où l'on peut aller attendre son passage
    point: (ci, avance = 0) => (convois[ci] ? convois[ci].place(0, avance) : null),
    // pour les tests : où en est chaque convoi, et combien sont affichés
    // `nom` et `y` s'ajoutent au reste : sans eux, un test ne peut pas dire DE
    // QUEL convoi il parle ni à quelle hauteur il roule — c'est précisément ce
    // qu'il fallait pour prouver que le métro est passé sous terre.
    etat: () => convois.map((c) => ({
      nom: c.nom, route: c.route || null,
      // la seconde voie (v423) : jumelle d'une file, ou file qui en a une
      jumeau: !!c.jumeauDe, jumelle: !!c.jumelle, voiesDoubles: c.voiesDoubles || null,
      retardHoraire: c.jumeauDe && c.horaire() ? c.rangJumeau * c.dtVoiture : 0,
      // La LONGUEUR du tour, et le nombre d'arrêts marqués. C'est ce qui
      // permet à un témoin de dire combien de temps un enfant attend sur un
      // quai — et de le dire sur l'ANCIEN code comme sur le neuf, puisque la
      // géométrie d'une voie ne dépend pas du nom qu'on donne au train.
      longueur: Math.round(c.parcours.longueur),
      nbArrets: c.arrets.length,
      y: Math.round((c.elements[0] ? c.elements[0].position.y : 0) * 10) / 10,
      vitesse: Math.round((c.freine ? c.vitesseActuelle : c.vitesse) * 10) / 10,
      distance: Math.round(c.distance),
      attente: Math.round((c.attente || 0) * 10) / 10,
      bloque: !!c.bloque,                    // un train arrêté devant l'enfant (v304)
      // Une place encore VIDE (v235) n'est ni visible ni peinte : depuis que
      // les voitures naissent à la demande, `elements` porte des trous.
      visibles: c.elements.filter((m) => m && m.visible).length,
      total: c.elements.length - c.pris.size,
      cle: c.cle, pris: [...c.pris],
      // Où sont les voitures visibles, et vers où elles vont (v244) : c'est ce
      // qui permet à une sonde de dire QUI chevauche QUI — même convoi, ou deux.
      places: c.elements.map((m, i) => (m && m.visible
        ? [Math.round(m.position.x * 10) / 10, Math.round(m.position.z * 10) / 10, Math.round((m.rotation.y - Math.PI) * 100) / 100, i,
          c.retard ? Math.round(c.retard[i]) : 0, c.attend ? c.attend[i] : 0,
          // la teinte que la rue lui a posée (v305), null pour une livrée d'origine
          m.userData.peinture ?? null]
        : null)).filter(Boolean),
      retards: c.retard ? Array.from(c.retard).map((r) => Math.round(r)) : [],
      // L'ÉCART RÉEL ENTRE DEUX VOISINES LE LONG DU TRACÉ (v283), au centième.
      // C'est LA grandeur qui dit si un convoi se télescope, et elle se publie
      // ici parce qu'elle se calcule ici : `retards` est arrondi au bloc, ce qui
      // ne peut pas distinguer 4,4 de 2,1. Un témoin qui compterait des instants
      // « proches » mesurerait la cadence du banc ; celui-ci lit une borne que la
      // géométrie garantit (v279).
      ecart: Math.round(c.ecart * 100) / 100,
      ecarts: c.routier && c.retard
        ? Array.from({ length: Math.max(0, c.nb - 1) },
          (_, i) => Math.round((c.dElement(i) - c.dElement(i + 1)) * 100) / 100)
        : [],
      attendent: c.attend ? Array.from(c.attend).filter(Boolean).length : 0, routier: !!c.routier,
      // L'ALLURE DE LA RUE (v372) : le type de voie, la croisière du profil
      // (le plus vite qu'il roule sur le tour) et sa plus lente, la vitesse
      // PROPRE de chaque voiture (`vLoc`, ce qu'elle fait vraiment, freinage
      // compris) et celles qui ont été heurtées par l'enfant
      voie: c.voie || null,
      croisiere: c.profilCalcule ? Math.round(Math.max(...c.profilCalcule.vs) * 10) / 10 : null,
      lente: c.profilCalcule ? Math.round(Math.min(...c.profilCalcule.vs) * 10) / 10 : null,
      vitesses: c.vLoc ? Array.from(c.vLoc).map((v, i) => Math.round((v >= 0 ? v : c.vGrilleDe(i)) * 100) / 100) : [],
      // l'allure que la grille donne à chaque voiture, là où elle est
      grille: c.vGrille ? Array.from(c.vGrille).map((v) => Math.round(v * 100) / 100) : [],
      heurtees: c.heurte ? Array.from(c.heurte).filter((h) => h > 0).length : 0,
      // ce qui retient chaque voiture : 0 rien, 1 un feu ou sa file, 2 autre chose
      causes: c.cause ? Array.from(c.cause) : [],
      // la diversité (v246) : les modèles que le convoi va montrer, sa graine,
      // et la livrée — modèle + laque — de chaque voiture visible
      graine: c.graine, modeles: c.modeles || [],
      livrees: c.elements.filter((m) => m && m.visible && m.userData.flotte)
        .map((m) => `${m.userData.flotte}:${m.userData.laque == null ? 'origine' : m.userData.laque.toString(16)}`),
      // les teintes de carrosserie des éléments visibles — la preuve, pour un
      // témoin, que la peinture de la Giga-usine opère : du gris AVANT le
      // tunnel, des couleurs APRÈS, dans le même convoi au même instant
      couleurs: c.elements.filter((m) => m && m.visible && m.userData.carrosserie)
        .map((m) => m.userData.carrosserie.color.getHex()),
    })),
  };
}
