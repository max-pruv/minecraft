// Entry point: scene setup, chunk streaming, input, HUD, and the game loop.

import * as THREE from 'three';
import { BLOCK, BLOCK_INFO, HOTBAR_BLOCKS, PLACEABLE_BLOCKS, DECOR_ITEMS, DECOR_START, decorMapColor, PROP_ITEMS, PROP_START, isProp, MEUBLE_ITEMS, MEUBLE_START, isMeuble, RUE_ITEMS, RUE_START, RUE, isRue, ARCHI } from './blocks.js';
import { PARIS as PARIS_ANCRE, circuitsParis } from './paris.js';
import { circuitsLondres } from './londres.js';
import { circuitsSF } from './sanfrancisco.js';
import { circuitsNice } from './nice.js';
import { circuitsLille } from './lille.js';
import { buildPropMesh } from './props.js';
import { AnimalManager } from './animals.js';
import { createAtlas, tileUV, activerTuilage, ATLAS_COLS, ATLAS_ROWS, TILE_PX } from './textures.js';
import { MONUMENTS, MONUMENTS_PAR_VILLE, monumentBati } from './monuments.js';
import { FAMILLES, batimentVariante, NB_BATIMENTS } from './batiments.js';
import { World, migrerLesBlocs, CHUNK, WATER_LEVEL, HEIGHT, CITIES, PLACES, MARS, VILLE, CIRCUIT, CHAUSSEE } from './world.js';
import { aeroportPres, postesAvion } from './aeroport.js';
import { cadence, chronoReel } from './cadence.js';
import { cadran } from './cap.js';
import { POLE } from './pole.js';
import { LIGNES as LIGNES_DC, traceLigneMetro, arretsDeLigne, circuitsWashington } from './washington.js';
import { buildChunkTampons } from './mesher.js';
import { Carte, MAP_COLORS } from './carte.js';
import { Horizon, rayonHorizon } from './horizon.js';
import { liberer } from './liberer.js';
import { createEffects } from './effects.js';
import { createSky } from './sky.js';
import { createSiege } from './siege.js';
import { createVie } from './vie.js';
import { createVehicules, lancerReflets, avancerReflets, refletsVoiture, chaufferLesProgrammes, programmesChauffes, programmesAChauffer, graineDeVille } from './vehicules.js';
import { decor, voirTout } from './couches.js';
import { traceAnneau } from './ville.js';
import { traceCourse } from './circuit.js';
import { USINE, PARC, traceChaine } from './usine.js';
import { tracesCirculation, tracesCirculationMain } from './villesmonde.js';
import { createPassants } from './passants.js';
import { createPoissons } from './poissons.js';
import { segmentsDeTrain, traceSegment } from './trains.js';
import { Player, raycastBlocks } from './player.js';
import { actualiserPresence } from './presence.js';
import { animerHumain, chargerHumains, humainsCharges, humainsPrets } from './humains.js';
import { MODELES_MONTURE, MONTURES } from './montures.js';
import { CreatureManager, TYPES } from './creatures.js';
import { initFun } from './fun.js';
import { Identity, prefetchScanner } from './identity.js';
import { ProfileSync } from './sync.js';
import { AdminPanel, isAdminName } from './admin.js';
import { Marlon, Cornichon, createHeroes, createBuilders, createVillagers, createAstronautes, createLutins, buildKidMesh } from './marlon.js';
import { NetSession, randomCode } from './net.js';
import { CloudSave } from './cloud.js';
import { EducationMode, GRADES, todayKey } from './education.js';
import { lienDuJeu, dessinerQR, partagerLien, lienWhatsApp, lienSMS } from './partage.js';
import { jouerLeSon, arreterLeSon, surSonEnAttente, Photographe } from './visio.js';

// New York appartient à la Terre. Les anciennes adresses deviennent un lieu de départ.
const VISITE_MANHATTAN = ['manhattan'].includes(new URLSearchParams(location.search).get('lieu')) || new URLSearchParams(location.search).get('carte') === 'manhattan';
let lieuInitialAVisiter = VISITE_MANHATTAN;
let renduDansManhattan = false;
const urbain = await import('./manhattan-world.js');
const planUrbain = await import('./manhattan-plan.js');
const renduUrbain = await import('./manhattan-render.js');
const contexteCarte = ctx => String(ctx).replace(/^manhattan-v1:/,'');

const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
// doubled view distance; ?rr= overrides (perf tuning and tests)
const RENDER_RADIUS = Number(new URLSearchParams(location.search).get('rr')) || (IS_TOUCH ? 12 : 16);
const UNLOAD_RADIUS = RENDER_RADIUS + 2;
// Les BLOCS s'oublient un peu plus loin que les maillages : de la marge pour
// qu'un demi-tour ne réengendre pas ce qu'on vient de quitter (v236).
const OUBLI_RADIUS = UNLOAD_RADIUS + 4;
const RAYON_OMBRE = 6;   // en morceaux : l'emprise de la caméra d'ombre (95 blocs), v247
// Les lampes de rue (v248) : la couleur des lanternes de Manhattan, une
// portée de dix-huit blocs, et une intensité MESURÉE sur captures de nuit.
const LAMPE_RUE = 0xffc989;
const PORTEE_LAMPE_RUE = 18;
const INTENSITE_LAMPE_RUE = 28;
// La portée du paysage lointain suit la distance d'affichage (voir horizon.js).
const RAYON_HORIZON = rayonHorizon(RENDER_RADIUS, CHUNK);
// Millisecondes maximum consacrées par frame à construire des chunks.
//
// LE BUDGET ÉTAIT SOUS LE COÛT D'UN SEUL MORCEAU (v229). Mesuré dans la boucle
// du jeu : 5,4 ms pour mailler un morceau. À six millisecondes, la boucle en
// maillait un, regardait l'heure, en maillait un second et s'arrêtait — le
// budget ne bornait donc rien, il fixait le débit à deux par image. C'est
// exactement la forme du seuil de charge du banc en v225 : une constante se
// règle sur le coût MESURÉ de ce qu'elle est censée laisser passer.
//
// Mesuré à 264 blocs/s, même page et même point : 6 ms → 76 morceaux/s pour 45
// images ; 12 ms → 154 morceaux/s pour 44 images ; 20 ms → 178 morceaux/s pour
// 30 images. Douze double le débit sans coûter une image, vingt gagne 15 % de
// plus et coûte un tiers de la cadence. On prend douze.
const MESH_BUDGET_MS = 12;
// LE MAILLAGE EST UNE CADENCE DE MÉNAGE, ET SON BUDGET ÉTAIT EN IMAGES (v237).
//
// Douze millisecondes PAR IMAGE, c'est douze cents millisecondes par seconde à
// cent images — mais seulement TRENTE-SIX à trois images par seconde. Or trois
// images par seconde, c'est exactement l'état d'une tablette qui ARRIVE dans
// une ville : le monde se charge vingt fois plus lentement au moment précis où
// l'enfant en a besoin. C'est le piège de `dt` de la v226, un étage plus haut,
// et sur le chemin le plus chaud du jeu.
//
// Le budget vise donc un DÉBIT — des millisecondes de maillage par seconde
// RÉELLE — et se répartit sur les images telles qu'elles viennent. Sept cent
// vingt, c'est exactement les douze millisecondes d'avant à soixante images :
// à cadence haute RIEN NE CHANGE, la correction ne fait qu'AJOUTER du budget
// quand les images s'allongent. Le plafond de vingt-deux empêche l'emballement
// (une image plus longue donnerait plus de budget, qui l'allongerait encore) et
// c'est le chiffre que la v229 avait déjà mesuré comme la limite au-delà de
// laquelle on paie un tiers de la cadence.
const MESH_MS_PAR_SECONDE = 720;
const MESH_BUDGET_MAX = 22;
// L'horloge du maillage : son propre chronomètre, appelé une fois par image.
const dtMaillage = chronoReel(0.5);
const REMESH_BUDGET_MS = 8;
const REACH = 5.5;                   // block interaction distance
const DAY_LENGTH = 600;              // seconds for a full day/night cycle

// --- renderer / scene -------------------------------------------------------

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// LE REGARD DE NEW YORK, PARTOUT (v247). Max : « regarde les améliorations
// qu'il y a encore eu dans la ville de New York et reproduis-les sur
// l'ensemble de la carte ». Manhattan rendait avec une correspondance tonale
// ACES et des ombres portées ; le reste du monde, en matériau non éclairé,
// avec un niveau de gris global pour tout soleil. Le monde entier prend le
// même regard : ACES, ombres du soleil (voir `sunLight`), blocs Lambert.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
// LES OMBRES DEMANDENT UNE CARTE GRAPHIQUE. Sans accélération matérielle
// (SwiftShader, llvmpipe — le banc, ou un navigateur sans GPU), la passe
// d'ombre double le temps d'image (217 → 383 ms mesurés à Paris) et le monde
// se charge deux fois moins vite : mieux vaut un monde sans ombres qu'un
// monde qui n'arrive pas. `?ombres=1` les force (les témoins du regard),
// `?ombres=0` les coupe. Sur l'iPad, la carte graphique est là.
function renduLogiciel() {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const nom = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|softpipe|software|mesa offscreen/i.test(nom);
  } catch { return false; }
}
// LA TABLETTE DIT ELLE-MÊME OÙ PASSE LE TEMPS (v257). Max : « le jeu lag
// énormément sur iPad » — et le banc ne peut pas mesurer la carte graphique
// d'un iPad. `?diag=1` affiche en haut de l'écran la cadence médiane, la pire
// image, les appels de dessin, la résolution et les réglages actifs ;
// `?ombres=0`, `?reflets=0`, `?lampes=0`, `?qualite=tablette|haute` et
// `?dpr=1.5` permettent d'isoler un poste en trente secondes, sur l'appareil.
const PARAMS_JEU = new URLSearchParams(location.search);
const DIAG = PARAMS_JEU.get('diag') === '1';
// La préparation avant « Jouer » (v258) : le banc la coupe par `?prep=0`.
const PREPARER = PARAMS_JEU.get('prep') !== '0';
const REFLETS_ACTIFS = PARAMS_JEU.get('reflets') !== '0';
const LAMPES_ACTIVES = PARAMS_JEU.get('lampes') !== '0';
// GRAPHISMES NORMAL OU AVANCÉ, DANS LES RÉGLAGES (v257). Max : « dans les
// settings, un mode normal ou un mode avancé du point de vue qualité de
// graphisme ». Normal : 1,25 pixel par point et pas d'ombres — c'est le
// réglage d'une tablette qui rame. Avancé : pleine résolution, ombres. Le
// choix vit sur l'APPAREIL (pas dans le profil de l'enfant : c'est une
// capacité de la machine, pas un goût), et par défaut une tablette ou un
// téléphone est en normal, un ordinateur en avancé. `?ombres=` et
// `?qualite=` gardent la main, pour mesurer.
const GRAPHISMES_CLE = 'web-minecraft-graphismes-v1';
function graphismes() {
  try { const v = localStorage.getItem(GRAPHISMES_CLE); if (v === 'normal' || v === 'avance') return v; } catch { /* mode privé */ }
  return IS_TOUCH ? 'normal' : 'avance';
}
const OMBRES_DEMANDEES = PARAMS_JEU.get('ombres');
const ombresVoulues = () => (OMBRES_DEMANDEES != null ? OMBRES_DEMANDEES !== '0' : (!renduLogiciel() && graphismes() === 'avance'));
const OMBRES = ombresVoulues();
renderer.shadowMap.enabled = OMBRES;
renderer.shadowMap.type = THREE.PCFShadowMap;
// Sans le troisième argument, setSize écrit la taille en dur dans le style du
// canvas et l'emporte sur la feuille de style — c'est ainsi qu'une mesure
// fausse devenait une bande noire. La vraie taille est posée par
// ajusterLaVue(), juste en dessous, une fois la caméra créée.
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
const DAY_SKY = new THREE.Color(0x87ceeb);
const NIGHT_SKY = new THREE.Color(0x0b1026);
scene.background = DAY_SKY.clone();
// LE BROUILLARD PORTE JUSQU'AU PAYSAGE LOINTAIN (v237). Il s'arrêtait à
// `RENDER_RADIUS * CHUNK − 4` — cent quatre-vingt-huit blocs — parce qu'au-delà
// il n'y avait rien à cacher que du vide. Depuis que `horizon.js` remplit ce
// vide, une brume à cent quatre-vingt-huit blocs EFFACERAIT le paysage qu'on
// vient de dessiner. Le début, lui, ne bouge pas : c'est le monde proche.
// Et le DÉBUT recule aussi : il valait `RENDER_RADIUS * CHUNK * 0.55` — cent
// six blocs — pour fondre le bord du monde chargé dans le ciel. Il n'y a plus
// de bord à fondre, et à cent six blocs le paysage lointain arrivait déjà
// délavé. Il commence au bout du monde proche et fond jusqu'à l'horizon.
scene.fog = new THREE.Fog(scene.background, RENDER_RADIUS * CHUNK, RAYON_HORIZON);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 900);
// La caméra de l'enfant voit toutes les couches (couches.js) : le décor que
// la sonde des reflets dessine, et la carrosserie qu'elle ne dessine pas.
voirTout(camera);

// Le ciel et le soleil éclairent TOUT depuis la v247 : les blocs (Lambert,
// occlusion ambiante cuite dans les sommets), les créatures, les gens et les
// voitures. Le soleil porte des ombres : sa caméra d'ombre suit l'enfant
// (`suivreLeSoleil`), cent quatre-vingt-dix blocs de côté, comme à Manhattan.
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x88aa77, 1.0);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xfff4e0, 0.8);
sunLight.position.set(0.6, 1, 0.4);
sunLight.castShadow = OMBRES;
// MILLE VINGT-QUATRE PARTOUT, ET LE FILTRE SIMPLE. Mesuré au banc à Paris
// (rendu logiciel, médiane par image) : sans ombres 217 ms · basique 512
// 350 · PCF 1024 400 · PCF doux 2048 467. La passe elle-même est le gros du
// coût, la taille et le filtre le reste ; sur 190 blocs d'emprise, 1024 fait
// cinq texels par bloc, ce qu'un bloc de trente mètres n'a pas besoin de
// dépasser. Manhattan garde son propre budget quand l'enfant y est.
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 380;
Object.assign(sunLight.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95 });
sunLight.shadow.bias = -0.00015;
sunLight.shadow.normalBias = 0.045;
scene.add(sunLight);
scene.add(sunLight.target);
// Le soleil vise l'enfant : c'est autour de lui que les ombres se dessinent.
// `dir` est la direction du soleil (sky.js), déjà retournée la nuit (lune).
function suivreLeSoleil(dir) {
  sunLight.target.position.copy(player.pos);
  sunLight.target.updateMatrixWorld();
  sunLight.position.copy(player.pos).addScaledVector(dir, 160);
}

// LA MOITIÉ DE L'ÉCRAN RESTÉE NOIRE.
//
// En revenant dans l'application sur l'iPad, la moitié de l'écran était noire
// et il fallait tuer l'application pour s'en sortir. La cause : le canvas
// gardait la taille qu'il avait au moment où iOS a suspendu la page.
//
// Deux fautes se cumulaient.
//
// La première : on ne mesurait qu'au seul événement « resize ». Or iOS ne le
// tire pas fidèlement au retour d'une application suspendue — et quand il le
// tire, innerHeight vaut encore l'ancienne valeur pendant quelques dizaines de
// millisecondes, le temps que la barre du navigateur se replace. On ne
// rattrapait donc jamais rien.
//
// La seconde, plus grave : renderer.setSize() écrivait la taille EN DUR dans
// le style du canvas, ce qui l'emportait sur le « 100 % » de la feuille de
// style. Une mesure fausse devenait donc une bande noire, définitivement. En
// laissant la mise en page à la CSS — setSize(…, false) — une mesure en
// retard ne coûte plus qu'une image légèrement adoucie pendant une fraction
// de seconde. La panne dégrade au lieu de casser.
//
// Et l'on mesure le canvas lui-même plutôt que la fenêtre : c'est la boîte
// qu'on remplit, c'est donc elle qui dit la vérité.
function ajusterLaVue() {
  const l = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  if (!l || !h) return;
  // La qualité demandée vaut PARTOUT (v257) ; sans demande, New York garde
  // son réglage (tablette : 1,25) et le reste du monde deux pixels par point,
  // comme avant. `?dpr=` l'emporte, pour mesurer.
  const qualite = PARAMS_JEU.get('qualite');
  const plafondDpr = qualite === 'tablette' ? 1.25 : qualite === 'haute' ? 1.75
    : graphismes() === 'normal' ? 1.25
      : (renduDansManhattan ? (IS_TOUCH ? 1.25 : 1.75) : 2);
  const dpr = Math.min(window.devicePixelRatio || 1, Number(PARAMS_JEU.get('dpr')) || plafondDpr);
  // On compare à ce que le canvas PORTE, jamais à ce qu'on croit lui avoir
  // donné. La nuance décide de tout : une surface abîmée par autre chose que
  // nous — une suspension d'iOS — laisse notre mémoire intacte et fausse, et
  // c'est exactement l'état dont il faut sortir. Le canvas, lui, ne ment pas.
  if (canvas.width === Math.round(l * dpr) && canvas.height === Math.round(h * dpr)) return;
  renderer.setPixelRatio(dpr);
  renderer.setSize(l, h, false);   // false : la CSS garde la main sur la mise en page
  camera.aspect = l / h;
  camera.updateProjectionMatrix();
}

// Au retour d'une suspension, la bonne taille n'est pas connue tout de suite :
// on repasse quelques fois plutôt que de croire la première mesure.
function ajusterEtRepasser() {
  ajusterLaVue();
  for (const delai of [50, 200, 600, 1500]) setTimeout(ajusterLaVue, delai);
}

for (const evt of ['resize', 'orientationchange', 'pageshow', 'focus']) {
  window.addEventListener(evt, ajusterEtRepasser);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') ajusterEtRepasser();
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', ajusterEtRepasser);
}
ajusterLaVue();

// --- materials ---------------------------------------------------------------

const { texture: atlasTexture, canvas: atlasCanvas } = createAtlas();

// LES BLOCS SONT ÉCLAIRÉS (v247). Ils étaient en `MeshBasicMaterial`, la
// couleur du matériau servant de niveau de lumière global : une façade au
// soleil et une façade à l'ombre avaient exactement la même teinte, et rien
// ne portait d'ombre. Lambert reçoit le ciel (hémisphère), le soleil et ses
// ombres ; l'occlusion ambiante reste cuite dans les couleurs de sommets.
const solidMaterial = new THREE.MeshLambertMaterial({
  map: atlasTexture, vertexColors: true, alphaTest: 0.25,
});

// LES FENÊTRES ALLUMÉES (mesher.js les met à part). Même atlas, même
// découpe — mais leur couleur ne suit PAS le cycle du jour : à minuit, la
// ville garde ses carrés de lumière au lieu de tomber à trente pour cent
// comme le reste. Une ville éteinte, c'est ce que Max a vu à Moscou.
const litMaterial = new THREE.MeshBasicMaterial({
  map: atlasTexture, vertexColors: true, alphaTest: 0.25,
});
const LUMIERE_FENETRE = new THREE.Color(1, 0.9, 0.66);
const waterMaterial = new THREE.MeshLambertMaterial({
  map: atlasTexture, vertexColors: true, transparent: true, opacity: 0.7,
  depthWrite: false, side: THREE.DoubleSide,
});

// Les faces du terrain sont fusionnées : une seule d'entre elles peut couvrir
// seize blocs, ses UV vont donc au-delà de 1 et c'est le shader qui les ramène
// dans la bonne tuile de l'atlas. L'eau y ajoute son clapot.
activerTuilage(solidMaterial);
activerTuilage(waterMaterial, { onde: true });
// Les fenêtres allumées sont de la même géométrie fusionnée : sans ce même
// repli, une baie étirée sur trois blocs échantillonnait l'atlas ENTIER —
// un immeuble arc-en-ciel en pleine rue, vu à la première capture de nuit.
activerTuilage(litMaterial);

// --- world & player ----------------------------------------------------------

// L'ancienne sauvegarde ne connaissait qu'un monde : on la reprend avant de
// rien charger, en la donnant à la fois au monde local et au dernier monde en
// ligne visité — c'est la même carte qui servait aux deux.
(function migrerMondes() {
  let dernier = null;
  try {
    const w = JSON.parse(localStorage.getItem('web-minecraft-worlds-v1') || '[]');
    if (Array.isArray(w) && w.length && w[0] && w[0].code) dernier = String(w[0].code);
  } catch { /* pas de liste de mondes */ }
  World.migrate(dernier);
})();

const world = new urbain.TerreUrbaine();

// LE PAYSAGE LOINTAIN. Il lit `terrainHeight` — une fonction PURE — et remplit
// exactement ce que les morceaux n'ont pas eu le temps de bâtir. Voir
// `horizon.js` : au-dessus d'une ville, le monde ne maille que quarante-deux
// morceaux par seconde quand voler en réclame cent soixante-cinq.
const horizon = new Horizon(world, RAYON_HORIZON);
scene.add(decor(horizon.objet()));

// LA MIGRATION AVANT LE CHARGEMENT, jamais après : `loadEdits` lit ce que le
// disque contient, et il doit déjà contenir les blocs remis à leur hauteur.
// Sinon l'enfant voit sa maison enterrée le temps d'une partie, et la
// sauvegarde suivante grave l'erreur.
{
  // Et la position où l'enfant s'était arrêté suit sa ville comme ses blocs
  // (v242) : sans cela, endormi à Times Square, il se réveillait en mer.
  const lirePos = () => { try { return JSON.parse(localStorage.getItem('web-minecraft-pos-v1')) || {}; } catch { return {}; } };
  const ecrirePos = (p) => { try { localStorage.setItem('web-minecraft-pos-v1', JSON.stringify(p)); } catch { /* ignore */ } };
  const bilan = migrerLesBlocs(() => World.loadAll(), (t) => World.saveAll(t), lirePos, ecrirePos);
  if (bilan && bilan.deplaces) {
    console.log(`carte agrandie : ${bilan.deplaces} blocs suivis, `
      + `${bilan.laisses} laissés, ${bilan.intacts} intacts`);
  }
}
world.loadEdits();

// --- LE MAILLAGE HORS DU FIL PRINCIPAL (v251) --------------------------------
//
// Max, iPad : « en avion le lag est fort ; en voiture, lag, et la définition
// des bâtiments s'affiche trop tard ». Engendrer et mailler un morceau de
// Paris coûte 24 ms, et le budget de maillage (720 ms par seconde) prenait
// aux images tout ce qu'il pouvait sans même suivre une voiture (27 morceaux
// par seconde pour 30 réclamés). Un worker (maillage-worker.js) porte un
// monde jumeau — même générateur, mêmes blocs de l'enfant — et rend des
// tampons prêts pour la carte graphique, plus les blocs pour les collisions.
// Le fil principal ne fait plus que les installer. `?maillage=local` rend
// l'ancien chemin, pour mesurer et pour les témoins.
const statsMaillage = { principalMs: 0, locaux: 0, distants: 0, refuses: 0, recus: [] };
// COMBIEN DE MORCEAUX LE WORKER A-T-IL D'AVANCE — et c'est un TEMPS, pas un
// compte (v265). Huit, réapprovisionnés une fois par IMAGE, c'est une file
// par image : à Paris un morceau coûte 24 ms, donc huit occupent le worker
// 192 ms et la file tient jusqu'à l'image suivante ; en campagne un morceau
// coûte 6,6 ms, huit ne font que 53 ms, et sur une tablette qui rame à cinq
// images par seconde le worker passe les quatre cinquièmes de son temps À
// SEC — au moment précis où l'enfant arrive quelque part. C'est le piège du
// budget par image de la v237, déplacé d'un cran : une file par image est
// une cadence de ménage déguisée en horloge d'affichage.
// Mesuré par saturation (une téléportation met tout le disque à mailler
// d'un coup), à rr=12, débit de POINTE en morceaux par seconde :
//
//   file      campagne   Paris
//      8         57        41
//     24        147        76
//     48        200        99
//     64        209       105
//    200        188       123
//
// Quarante-huit prend quatre-vingt-quinze pour cent du gain et garde la
// file fraîche — au-delà, on maille des morceaux que l'enfant a déjà
// dépassés. `?attente=` la force, pour remesurer.
//
// ET DEUX MAILLEURS N'AJOUTENT RIEN — c'est un non-résultat MESURÉ, on ne
// le réessaie pas. Avec la file à quarante-huit : un mailleur 200/99, deux
// 206/125 mais la cadence tombe de 4,9 à 3,8 images par seconde à Paris,
// trois 198/100 à 3,4 images. Passé la file, le goulot n'est plus le
// mailleur : c'est le fil principal, qui doit INSTALLER deux cents
// géométries par seconde. Ajouter des mailleurs ne fait que lui en envoyer
// plus.
const EN_ATTENTE_MAX = Number(new URLSearchParams(location.search).get('attente')) || 48;
const enAttente = new Map();          // key -> { cx, cz, sale }
let generationDistante = 0;           // monte à chaque resynchronisation des blocs
let maillageDistant = null;
function synchroniserLeWorker() {
  if (!maillageDistant) return;
  generationDistante++;
  enAttente.clear();
  maillageDistant.postMessage({ type: 'edits', edits: world.edits, temps: world.editTimes, ctx: world.ctx });
}
function recevoirMorceau(m) {
  const key = World.key(m.cx, m.cz);
  const attente = enAttente.get(key);
  enAttente.delete(key);
  if (m.generation !== generationDistante) { statsMaillage.refuses++; return; }
  const pcx = Math.floor(player.pos.x / CHUNK), pcz = Math.floor(player.pos.z / CHUNK);
  if (Math.abs(m.cx - pcx) > UNLOAD_RADIUS || Math.abs(m.cz - pcz) > UNLOAD_RADIUS) { statsMaillage.refuses++; return; }
  // Les blocs : ceux du worker si le fil principal n'a pas déjà engendré ce
  // morceau (collisions, passants) — les deux sont identiques, un témoin le
  // vérifie. Un bloc posé pendant que le worker maillait rend le morceau
  // sale : il se remaille ici, tout de suite après.
  if (!world.chunks.has(key)) {
    world.chunks.set(key, m.data);
    if (m.top !== undefined) world.tops.set(key, m.top);
    statsMaillage.recus.push(key);                                  // blocs adoptés du worker
    if (statsMaillage.recus.length > 64) statsMaillage.recus.shift();  // fenêtre glissante : les derniers sont encore en mémoire
  }
  installerMorceau(m.cx, m.cz, m);
  statsMaillage.distants++;
  if (attente && attente.sale) world.dirty.add(key);
}
(function creerMaillageDistant() {
  if (new URLSearchParams(location.search).get('maillage') === 'local') return;
  if (typeof Worker === 'undefined') return;
  try {
    const w = new Worker(new URL('./maillage-worker.js', import.meta.url), { type: 'module' });
    w.onmessage = (e) => { if (e.data && e.data.type === 'morceau') recevoirMorceau(e.data); };
    // UN WORKER QUI MEURT REND LA MAIN AU FIL PRINCIPAL : un navigateur sans
    // workers de module doit voir le monde quand même.
    w.onerror = (err) => {
      console.warn('maillage hors fil principal indisponible, on maille ici :', err && err.message);
      maillageDistant = null;
      for (const a of enAttente.values()) meshQueue.push({ cx: a.cx, cz: a.cz, d: 0 });
      enAttente.clear();
    };
    maillageDistant = w;
    synchroniserLeWorker();
  } catch (e) {
    maillageDistant = null;
  }
})();
// Tout bloc écrit — posé par l'enfant, reçu d'un ami, fusionné du nuage —
// part au worker ; si le morceau était en cours de maillage là-bas, il se
// remaillera ici à l'arrivée.
world.onBloc = (x, y, z, id) => {
  if (!maillageDistant) return;
  maillageDistant.postMessage({ type: 'bloc', x, y, z, id });
  const a = enAttente.get(World.key(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
  if (a) a.sale = true;
};

const player = new Player(camera, world);
// LES LAMPES DE RUE (v248) : quatre lumières ponctuelles, posées la nuit
// sous les réverbères les plus proches de l'enfant (`eclairerLaRue`), et
// prêtées à Manhattan quand il y est. Quatre et pas plus : le nombre de
// lampes fait partie de la clé de chaque programme de shader.
const lampesRue = [];
for (let i = 0; i < 4; i++) {
  const l = new THREE.PointLight(LAMPE_RUE, 0, PORTEE_LAMPE_RUE, 2);
  scene.add(l);
  lampesRue.push(l);
}
const villeRealiste = new renduUrbain.ManhattanRenderer({scene, renderer, world, camera, player, sunLight, hemiLight, touch:IS_TOUCH, renderRadius:RENDER_RADIUS, lamps: lampesRue});
const effects = createEffects({ scene, world, atlasCanvas });
const sky = createSky({ scene, camera, sunLight });
const creatureManager = new CreatureManager(scene, world, player);
const animalManager = new AnimalManager(scene, world, player, (msg, color) => creatureManager.toast(msg, color));
let marlon = null; // spawned after the spawn point is known
let cornichon = null;
let npcs = [];
let siege = null;
let vie = null;
let vehicules = null;
// La circulation qui attend son heure, et les passants des villes — déclarés
// ICI, avant le code d'amorçage qui les assigne : déclarés plus bas, c'était
// la zone morte temporelle, et le jeu ne démarrait plus du tout.
let circulationsEnAttente = [];
// EN TEMPS RÉEL, PAS EN `dt` — voir `cadence.js`. Ces trois cadences décident
// si le monde est peuplé autour de l'enfant ; écrites `-= dt`, elles
// ralentissaient exactement quand la cadence d'affichage s'effondre, c'est-à-
// dire à l'arrivée dans une ville. « It took a while to see cars in paris. »
// UNE SEULE CIRCULATION PAR TOUR, ET LE TOUR EST COURT (v235).
//
// Max, en vol : « il y a vraiment un lag, l'écran s'arrête pendant trois
// secondes, il redémarre pendant une seconde ». Profilé et mesuré, vingt
// secondes de vol au-dessus de Paris : ce n'était NI le maillage (16 ms par
// image, le budget est respecté) NI le rendu (4 ms), mais `animerLesVilles` —
// **557 ms dans une seule image**, où HUIT circuits de Paris naissaient
// ensemble parce que l'avion venait de franchir leur rayon de 220 blocs.
// Chaque circuit fait naître une vingtaine de voitures, et une voiture coûte
// trente-deux maillages (v201) : cinq mille maillages d'un coup.
//
// Le remède est celui du maillage des morceaux de monde, un fichier plus
// loin : on étale. Un circuit par tour, le PLUS PROCHE d'abord, et le tour
// passe de deux secondes et demie à un huitième de seconde — les huit circuits
// de Paris sont donc tous là en une seconde, au lieu d'arriver en bloc. Rien
// ne se perd : un convoi qui apparaît un dixième de seconde plus tard, à deux
// cents blocs, ne se voit pas.
const circulationPrete = cadence(125);
let passants = null;
let poissons = null;

// Spawn on land near the origin.
(function findSpawn() {
  if (VISITE_MANHATTAN) {
    const p = planUrbain.DEPART, pos=urbain.versTerre(p.x,p.z); player.setSpawn(pos.x,p.y,pos.z); player.yaw=p.yaw; return;
  }
  let best = null;
  for (let z = -48; z <= 48; z += 2) {
    for (let x = -48; x <= 48; x += 2) {
      const h = world.terrainHeight(x, z);
      if (h <= WATER_LEVEL + 1) continue;
      const d = x * x + z * z;
      if (!best || d < best.d) best = { x, z, h, d };
    }
  }
  if (best) player.setSpawn(best.x + 0.5, best.h + 1.01, best.z + 0.5);
  else player.setSpawn(0.5, 70, 0.5);
})();

// --- chunk streaming -----------------------------------------------------------

const chunkMeshes = new Map(); // key -> { solid, water }
let meshQueue = [];

function rebuildQueue() {
  const pcx = Math.floor(player.pos.x / CHUNK);
  const pcz = Math.floor(player.pos.z / CHUNK);
  // direction du regard : on sert d'abord le paysage qu'on a devant les yeux,
  // ce qui est dans le dos peut attendre quelques frames sans que ça se voie
  const visX = -Math.sin(player.yaw), visZ = -Math.cos(player.yaw);
  meshQueue = [];
  for (let dz = -RENDER_RADIUS; dz <= RENDER_RADIUS; dz++) {
    for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
      const cx = pcx + dx, cz = pcz + dz;
      if (chunkMeshes.has(World.key(cx, cz))) continue;
      const d2 = dx * dx + dz * dz;
      const len = Math.sqrt(d2);
      // produit scalaire : 1 pile devant, -1 dans le dos
      const devant = len < 1.5 ? 1 : (dx / len) * visX + (dz / len) * visZ;
      meshQueue.push({ cx, cz, d: d2 * (devant > 0.15 ? 1 : 2.5) });
    }
  }
  meshQueue.sort((a, b) => b.d - a.d); // pop() takes the nearest
}

function disposeChunkMesh(entry) {
  for (const mesh of [entry.solid, entry.water, entry.lumineux]) {
    if (!mesh) continue;
    scene.remove(mesh);
    mesh.geometry.dispose();
  }
  // prop groups share template geometry — just detach them
  if (entry.props) scene.remove(entry.props);
}

// Une BufferGeometry depuis les tampons du mailleur (v251) : une
// milliseconde, sur le fil principal, quel que soit le fil qui a maillé.
function geometrieDepuisTampons(t) {
  if (!t) return null;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(t.positions, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(t.normals, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(t.uvs, 2));
  geom.setAttribute('color', new THREE.BufferAttribute(t.colors, 3));
  geom.setAttribute('tuile', new THREE.BufferAttribute(t.tiles, 4));
  geom.setIndex(new THREE.BufferAttribute(t.indices, 1));
  geom.computeBoundingSphere();
  return geom;
}

// Le maillage sur le fil principal — Manhattan, les remaillages d'un bloc
// posé (qui doivent se voir tout de suite), et le secours si le worker
// manque. `statsMaillage.principalMs` compte ce que cela coûte à l'image.
function meshChunk(cx, cz) {
  const t0 = performance.now();
  installerMorceau(cx, cz, buildChunkTampons(world, cx, cz));
  statsMaillage.principalMs += performance.now() - t0;
  statsMaillage.locaux++;
}

function installerMorceau(cx, cz, tampons) {
  const key = World.key(cx, cz);
  const old = chunkMeshes.get(key);
  if (old) disposeChunkMesh(old);

  const { props } = tampons;
  const solid = geometrieDepuisTampons(tampons.solid);
  const water = geometrieDepuisTampons(tampons.water);
  const lumineux = geometrieDepuisTampons(tampons.lumineux);
  const entry = { solid: null, water: null, lumineux: null, props: null };
  if (solid) {
    entry.solid = new THREE.Mesh(solid, solidMaterial);
    entry.solid.position.set(cx * CHUNK, 0, cz * CHUNK);
    // Un morceau ne PORTE d'ombre qu'à portée de la caméra d'ombre (six
    // morceaux, quatre-vingt-quinze blocs) ; au-delà il en reçoit seulement.
    // La passe d'ombre ne rend ainsi que le monde proche, pas les 900
    // morceaux chargés — `updateChunks` remet le drapeau quand on bouge.
    entry.solid.castShadow = Math.abs(cx - Math.floor(player.pos.x / CHUNK)) <= RAYON_OMBRE
      && Math.abs(cz - Math.floor(player.pos.z / CHUNK)) <= RAYON_OMBRE;
    entry.solid.receiveShadow = true;
    scene.add(decor(entry.solid));
  }
  if (water) {
    entry.water = new THREE.Mesh(water, waterMaterial);
    entry.water.position.set(cx * CHUNK, 0, cz * CHUNK);
    scene.add(decor(entry.water));
  }
  if (lumineux) {
    entry.lumineux = new THREE.Mesh(lumineux, litMaterial);
    entry.lumineux.position.set(cx * CHUNK, 0, cz * CHUNK);
    scene.add(decor(entry.lumineux));
  }
  if (props.length > 0) {
    const group = new THREE.Group();
    const lanternes = [];
    for (const p of props) {
      const mesh = buildPropMesh(p.id);
      if (!mesh) continue;
      mesh.position.set(cx * CHUNK + p.x + 0.5, p.y, cz * CHUNK + p.z + 0.5);
      group.add(mesh);
      // LA LANTERNE D'UN RÉVERBÈRE EST UNE LAMPE POSSIBLE (v248) : sa place
      // est celle du bloc de lanterne du modèle (props.js), un demi-bloc en
      // avant du fût et à trois blocs du sol. `eclairerLaRue` y pose une des
      // quatre lumières de rue quand l'enfant passe à côté, la nuit. Et la
      // crosse se tourne VERS LA RUE : le modèle la porte en +x, on regarde
      // de quel côté du fût est la chaussée.
      if (p.id === RUE.REVERBERE) {
        mesh.rotation.y = versLaRue(cx * CHUNK + p.x, p.y - 1, cz * CHUNK + p.z);
        lanternes.push(new THREE.Vector3(
          mesh.position.x + 0.5 * Math.cos(mesh.rotation.y), p.y + 2.7,
          mesh.position.z - 0.5 * Math.sin(mesh.rotation.y)));
      }
    }
    entry.props = group;
    if (lanternes.length) entry.lanternes = lanternes;
    scene.add(decor(group));
  }
  chunkMeshes.set(key, entry);
}

// De quel côté d'un réverbère est la rue : le cap (autour de y) qui tourne
// la crosse du modèle, portée en +x, vers la première chaussée voisine. Sans
// chaussée autour — un réverbère posé par l'enfant dans son jardin — elle
// reste en +x.
function versLaRue(wx, wy, wz) {
  const rue = (x, z) => CHAUSSEE.has(world.getBlock(x, wy, z));
  if (rue(wx + 1, wz)) return 0;
  if (rue(wx - 1, wz)) return Math.PI;
  if (rue(wx, wz + 1)) return -Math.PI / 2;
  if (rue(wx, wz - 1)) return Math.PI / 2;
  return 0;
}

let lastPlayerChunk = null;

function updateChunks() {
  const pcx = Math.floor(player.pos.x / CHUNK);
  const pcz = Math.floor(player.pos.z / CHUNK);
  const chunkKey = pcx + ',' + pcz;

  if (chunkKey !== lastPlayerChunk) {
    lastPlayerChunk = chunkKey;
    rebuildQueue();
    // Unload far chunks.
    for (const [key, entry] of chunkMeshes) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - pcx) > UNLOAD_RADIUS || Math.abs(cz - pcz) > UNLOAD_RADIUS) {
        disposeChunkMesh(entry);
        chunkMeshes.delete(key);
      } else if (entry.solid) {
        entry.solid.castShadow = Math.abs(cx - pcx) <= RAYON_OMBRE && Math.abs(cz - pcz) <= RAYON_OMBRE;
      }
    }
    // ET LES BLOCS S'OUBLIENT AVEC LEUR MAILLAGE. Défaire le maillage rendait
    // la carte graphique ; les quatre-vingts kilo-octets de blocs, eux,
    // restaient dans `world.chunks` pour toujours. Voir `oublierLoinDe`.
    world.oublierLoinDe(pcx, pcz, OUBLI_RADIUS);
  }

  // Budget de temps plutôt qu'un nombre fixe de chunks : un chunk chargé
  // (château, forêt dense) ne peut plus geler la frame à lui tout seul. Au pire
  // le paysage lointain arrive une frame plus tard, derrière le brouillard.
  // Le budget de CETTE image : ce que le débit visé accorde pour le temps réel
  // écoulé, jamais moins que l'ancien budget fixe, jamais plus que le plafond.
  // L'écart est borné à un dixième de seconde — au réveil d'un onglet endormi
  // il vaut des minutes, et une image ne se laisse pas remplir avec cela.
  const ecart = Math.min(dtMaillage(), 0.1);
  const budget = Math.min(MESH_BUDGET_MAX,
    Math.max(MESH_BUDGET_MS, MESH_MS_PAR_SECONDE * ecart));
  // LE MAILLAGE PART AU WORKER (v251) : on lui confie les morceaux les plus
  // proches, quelques-uns d'avance, et l'on ne garde pour cette image que ce
  // que lui ne sait pas faire (Manhattan). Sans worker, l'ancien budget.
  if (maillageDistant) {
    const lot = [];
    while (enAttente.size + lot.length < EN_ATTENTE_MAX && meshQueue.length) {
      const suivant = meshQueue.pop();
      const key = World.key(suivant.cx, suivant.cz);
      if (enAttente.has(key) || chunkMeshes.has(key)) continue;
      if (world.maillageLocal(suivant.cx, suivant.cz)) { meshChunk(suivant.cx, suivant.cz); continue; }
      enAttente.set(key, { cx: suivant.cx, cz: suivant.cz, sale: false });
      lot.push({ cx: suivant.cx, cz: suivant.cz });
    }
    if (lot.length) {
      maillageDistant.postMessage({ type: 'mailler', liste: lot, generation: generationDistante,
        pcx, pcz, rayon: RENDER_RADIUS + 2 });
    }
  } else {
    const debut = performance.now();
    do {
      const suivant = meshQueue.pop();
      if (!suivant) break;
      meshChunk(suivant.cx, suivant.cz);
    } while (performance.now() - debut < budget);
  }

  // Changement de monde : le terrain en mémoire porte encore les blocs de
  // l'ancien, tous les maillages sont à refaire.
  if (world.allDirty) {
    world.allDirty = false;
    for (const key of chunkMeshes.keys()) world.dirty.add(key);
    synchroniserLeWorker();
  }

  // Remesh chunks whose blocks changed. Poser un bloc n'en salit qu'un ou deux,
  // mais un changement de monde en salit plusieurs centaines : on les traite du
  // plus proche au plus loin, et on rend la main dès que le budget est dépassé.
  if (world.dirty.size > 0) {
    const attente = [];
    for (const key of world.dirty) {
      if (!chunkMeshes.has(key)) continue;
      const [cx, cz] = key.split(',').map(Number);
      attente.push({ key, cx, cz, d: (cx - pcx) ** 2 + (cz - pcz) ** 2 });
    }
    world.dirty.clear();
    attente.sort((a, b) => a.d - b.d);
    const t0 = performance.now();
    for (let i = 0; i < attente.length; i++) {
      // le premier passe toujours : poser un bloc doit se voir immédiatement
      if (i > 0 && performance.now() - t0 > REMESH_BUDGET_MS) {
        for (let j = i; j < attente.length; j++) world.dirty.add(attente[j].key);
        break;
      }
      meshChunk(attente[i].cx, attente[i].cz);
    }
  }
}

// Generate the spawn area synchronously so the player doesn't fall through.
(function preloadSpawn() {
  const pcx = Math.floor(player.pos.x / CHUNK);
  const pcz = Math.floor(player.pos.z / CHUNK);
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) meshChunk(pcx + dx, pcz + dz);
  }
  rebuildQueue();
  const say = (msg, color) => creatureManager.toast(msg, color);
  marlon = new Marlon(scene, world, player, say);
  cornichon = new Cornichon(scene, world, player, say, player.pos.x + 6, player.pos.z + 4);
  npcs = [
    marlon, cornichon,
    ...createHeroes(scene, world, player, say, player.pos.x, player.pos.z),
    ...createBuilders(scene, world, player, say, player.pos.x, player.pos.z),
    ...createVillagers(scene, world, player, say, player.pos.x, player.pos.z),
    // les astronautes vivent sur Mars, pas là où l'enfant apparaît
    ...createAstronautes(scene, world, player, say, MARS.x, MARS.z),
    // Le Pôle Nord n'était qu'un décor : une usine vide, une étable sans
    // rennes, un village sans habitants. Les lutins et le Père Noël lui
    // donnent enfin quelqu'un à qui parler.
    ...createLutins(scene, world, player, say, POLE.x, POLE.z),
  ];
  // la garnison du château et ses assaillants : ils rejoignent la troupe des
  // personnages, c'est la boucle principale qui les anime
  siege = createSiege({
    scene, world, player, toast: say, emojiBurst, clang: () => cliquetis(),
    // Le bandeau plein écran et le cor : un simple message en bas d'écran
    // passait inaperçu au milieu d'une construction.
    annonce: (titre, sous) => grandBandeau(titre, sous, 3400),
    cor: () => carillon([220, 165, 220, 294]),
  });
  npcs.push(...siege.npcs);
  // Le petit peuple des deux châteaux : artisans, gens de maison, jardiniers,
  // et toute la basse-cour. Chaque site dort tant que l'enfant n'y est pas.
  vie = createVie({ scene, world, player, toast: say });
  npcs.push(...vie.npcs);
  // Les passants des villes : fabriqués à l'approche, jamais avant.
  passants = createPassants({ scene, world, player, toast: say, npcs });
  // Les poissons : un petit banc entretenu autour de l'enfant, partout où
  // il y a de l'eau — océans du planisphère, fleuves des villes, lacs.
  poissons = createPoissons({ scene, world, player });

  // Ce qui roule tout seul : les rames du métro aérien autour de la ville, et
  // les monoplaces sur le circuit. Les deux tracés viennent des bâtisseurs
  // eux-mêmes, si bien qu'un train ne peut pas rouler à côté de sa voie.
  vehicules = createVehicules({ scene, player });
  // la voiture de l'enfant s'arrête devant la circulation (player.js, v245)
  // ET LE MOBILIER NON PLUS (v252). Un réverbère, une jardinière, un banc,
  // une table de Times Square sont des props NON SOLIDES pour la marche —
  // c'est voulu, un enfant passe entre — mais une voiture ne les traverse
  // pas. On lit les cases au sol que couvre le rectangle de la voiture : un
  // bloc de mobilier dans le monde, ou une pièce notée par le renderer de
  // Manhattan. Même garde que pour la circulation : on ne bloque que si l'on
  // n'est pas DÉJÀ dedans (player.js), sinon une voiture garée contre un
  // banc ne repartirait plus.
  const mobilierDevant = (x, z, cap) => {
    const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux;
    const demiLong = 2.2, demiLarg = Math.max(0.3, player.gabarit / 2);
    const y0 = Math.floor(player.pos.y + 0.1);
    for (let a = -demiLong; a <= demiLong + 1e-6; a += 0.5)
      for (let b = -demiLarg; b <= demiLarg + 1e-6; b += 0.5) {
        const sx = x + ux * a + vx * b, sz = z + uz * a + vz * b;
        if (villeRealiste.obstacleA(sx, sz)) return true;
        const bx = Math.floor(sx), bz = Math.floor(sz);
        if (isProp(world.getBlock(bx, y0, bz)) || isProp(world.getBlock(bx, y0 + 1, bz))) return true;
      }
    return false;
  };
  // « Pas si l'on est déjà dedans » se juge PAR FAMILLE : une voiture de la
  // rue collée à la nôtre (obstacleDevant vrai ici ET là) ne désarme pas le
  // mobilier, et réciproquement. Mesuré avant cette règle : au départ sur
  // une rue de Paris, une voiture du convoi 89 à 0,67 bloc, et la nôtre
  // traversait un réverbère six blocs plus loin.
  // ET UN PIÉTON NON PLUS (v259). Max, capture à New York : une passante au
  // travers de son taxi. « Pas un mode violent comme GTA » : la voiture de
  // l'enfant FREINE devant un piéton, elle ne l'écrase pas — et le piéton,
  // lui, s'écarte (`world.vehiculeApproche`, plus bas), si bien qu'on ne
  // reste pas bloqué derrière lui. On ne bloque que l'entrée, jamais quand
  // un piéton est déjà dans la voiture.
  //
  // Qui a les pieds dans la voiture posée là ? Le CENTRE du piéton dans sa
  // largeur — pas de marge de côté : dans une ruelle de trois blocs, un
  // piéton plaqué contre le mur a le centre à 1,25 bloc de l'axe, et la
  // voiture (1,13 de demi-largeur) doit pouvoir passer le long de lui, sinon
  // les deux s'attendent pour toujours (mesuré : douze secondes sur place).
  const pietonsDans = (x, z, cap) => {
    const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux;
    const demiLong = 2.2 + 0.3, demiLarg = Math.max(0.3, player.gabarit / 2);
    const dedans = [];
    for (const n of npcs) {
      const dx = n.pos.x - x, dz = n.pos.z - z;
      if (dx * dx + dz * dz > 8 * 8 || Math.abs(n.pos.y - player.pos.y) > 2.5) continue;
      if (Math.abs(dx * ux + dz * uz) <= demiLong && Math.abs(dx * vx + dz * vz) <= demiLarg) dedans.push(n);
    }
    return dedans;
  };
  // « Pas si l'on est déjà dedans » se juge PAR PERSONNE, pas par famille :
  // jugé sur la famille, un piéton déjà contre la portière laissait la
  // voiture traverser celui qui est devant (neuf relevés à la sonde).
  const pietonDevant = (x, z, cap, x0, z0) => {
    const apres = pietonsDans(x, z, cap);
    if (!apres.length) return false;
    const avant = pietonsDans(x0, z0, cap);
    return apres.some((n) => !avant.includes(n));
  };
  player.obstacleVehicule = (x, z, cap, x0 = x, z0 = z) =>
    (vehicules.obstacleDevant(x, z, cap) && !vehicules.obstacleDevant(x0, z0, cap))
    || (mobilierDevant(x, z, cap) && !mobilierDevant(x0, z0, cap))
    || pietonDevant(x, z, cap, x0, z0);
  // UNE VOITURE ARRIVE SUR CE POINT ? (v259) Ce qu'un piéton regarde pour
  // s'écarter : une voiture de la rue en marche, ou celle de l'enfant quand
  // elle roule, dont le couloir — sa largeur plus une marge, deux secondes de
  // route devant elle plus quatre blocs, trente au plus — couvre le point.
  // Rend la direction de la voiture et le côté où s'écarter (celui où le
  // piéton est déjà), ou null. `marge` : la marge latérale, plus large quand
  // on est déjà en train de s'écarter, pour ne pas s'arrêter au bord même.
  // Ce crochet est appelé par CHAQUE piéton en marche à CHAQUE image : il ne
  // fabrique rien — la liste des voitures en marche est celle que
  // `vehicules.enMarche()` a figée pour l'image (lecture seule, jamais
  // copiée ni complétée), et la voiture de l'enfant se regarde à part.
  const dansLeCouloir = (r, x, z, y, marge) => {
    if (r.v <= 0.5 || Math.abs(r.y - y) > 2.5) return null;
    const dx = x - r.x, dz = z - r.z;
    if (dx * dx + dz * dz > 34 * 34) return null;
    const devant = dx * r.ux + dz * r.uz, cote = dx * r.uz - dz * r.ux;
    if (devant < -2.2 || devant > Math.min(30, r.v * 2 + 4)) return null;
    if (Math.abs(cote) > r.demiLarg + marge) return null;
    return { ux: r.ux, uz: r.uz, cote: cote >= 0 ? 1 : -1, lat: cote };
  };
  const voitureEnfant = { x: 0, y: 0, z: 0, ux: 0, uz: 1, v: 0, demiLarg: 1.1 };
  world.vehiculeApproche = (x, z, y, marge = 1.0) => {
    // la voiture de l'enfant : ce qu'il DEMANDE (`pousse`), pas ce qu'il
    // obtient — arrêtée devant un piéton, elle veut encore passer, et c'est
    // ce qui fait que le piéton s'écarte au lieu de la bloquer pour toujours
    if (player.gabarit > 1 && !player.pilote && player.pousse) {
      const v = Math.hypot(player.pousse.x, player.pousse.z);
      if (v > 0.5) {
        const e = voitureEnfant;
        e.x = player.pos.x; e.y = player.pos.y; e.z = player.pos.z;
        e.ux = player.pousse.x / v; e.uz = player.pousse.z / v; e.v = v; e.demiLarg = player.gabarit / 2;
        const r = dansLeCouloir(e, x, z, y, marge);
        if (r) return r;
      }
    }
    const roulent = vehicules.enMarche();
    for (let i = 0; i < roulent.length; i++) {
      const r = dansLeCouloir(roulent[i], x, z, y, marge);
      if (r) return r;
    }
    return null;
  };
  // ET LES PIÉTONS NE TRAVERSENT PAS LES VOITURES (v259). Max, capture à la
  // Bastille : des passants au travers de sa voiture. Un piéton (marlon.js)
  // regarde un pas devant lui avant d'avancer : une voiture de la rue, celle
  // de l'enfant au volant (`vehicules.voitureA`), ou un véhicule posé là —
  // voiture garée, avion au poste — dont la fiche porte un `gabarit`. Le
  // rectangle d'un véhicule posé se prend sur son cap, comme celui d'une
  // voiture de la rue ; sa longueur est celle d'une voiture.
  world.obstaclePieton = (x, z, y) => {
    if (vehicules.voitureA(x, z, y)) return true;
    for (const a of animalManager.animals) {
      const g = a.def.gabarit;
      if (!(g > 1) || Math.abs(a.pos.y - y) > 2.5) continue;
      const dx = x - a.pos.x, dz = z - a.pos.z;
      if (dx * dx + dz * dz > 6 * 6) continue;
      const ux = Math.sin(a.yaw), uz = Math.cos(a.yaw);
      // le long de l'axe, puis en travers
      if (Math.abs(dx * ux + dz * uz) <= 2.2 && Math.abs(dx * uz - dz * ux) <= g / 2) return true;
    }
    return false;
  };
  vehicules.metro(traceAnneau(VILLE, world.terrainHeight(VILLE.x, VILLE.z)));
  vehicules.course(traceCourse(CIRCUIT, world.terrainHeight(CIRCUIT.x, CIRCUIT.z)));
  // La chaîne de la Giga-usine : les voitures marquent l'arrêt à chaque poste
  // — presse, carrosserie, peinture, assemblage, test — puis font le tour du
  // parc. On peut monter à bord et suivre la sienne (bouton « Monter à
  // bord », comme le métro). Le tracé et la fenêtre de peinture viennent du
  // bâtisseur du site : la chaîne ne peut pas rouler à côté de son tapis.
  vehicules.chaine(traceChaine(world.terrainHeight(USINE().x, USINE().z)));
  // La circulation des villes : les anneaux sont calculés une fois, mais un
  // convoi ne naît qu'à l'approche de l'enfant — trente villes de voitures
  // fabriquées à l'ouverture pèseraient sur la tablette pour des rues
  // lointaines. Une ville visitée garde sa circulation pour la session.
  // La cote où roule une voiture, pas le relief nu : sur un pont, le tablier.
  // Voir `World.coteRoulable` — sans lui, les convois de Londres suivaient le
  // lit de la Tamise.
  const solDe = (x, z) => world.coteRoulable(x, z);
  // Les villes à trame, les villes bâties à la main (Paris, Londres…), et
  // Manhattan, dont les boucles suivent de vraies avenues.
  //
  // LES VILLES BÂTIES À LA MAIN DONNENT LEURS PROPRES CIRCUITS, faits de
  // vraies avenues mises bout à bout et validés par elles — c'est la seule
  // manière d'avoir des voitures qui suivent des rues. Le carré cherché au
  // hasard reste en secours pour celles qui n'en publient pas encore.
  const propres = [
    ...circuitsParis(solDe), ...circuitsLondres(solDe), ...circuitsSF(solDe),
    ...circuitsNice(solDe), ...circuitsLille(solDe), ...circuitsWashington(solDe),
  ];
  const dejaServies = new Set(propres.map((t) => t.cle));
  circulationsEnAttente = [
    ...tracesCirculation(solDe),
    ...tracesCirculationMain(
      CITIES.filter((c) => c.key !== 'ny' && !dejaServies.has(c.key)), solDe),
    ...planUrbain.circuitsManhattan().map(t=>({...t,...urbain.versTerre(t.x,t.z),ville:'ny',pts:t.pts.map(p=>({...p,...urbain.versTerre(p.x,p.z)}))})),
    ...propres,
  ];
  // Le métro de Washington : quatre lignes de couleur, trois rames chacune, et
  // des tracés qui viennent du creusement lui-même — une rame ne peut donc pas
  // rouler à côté de son tunnel.
  //
  // `souterrain` n'est pas décoratif : sans lui, ces douze rames se dessinent
  // depuis le point d'apparition, qui n'est qu'à cent trente-sept blocs de la
  // capitale — quarante wagons rendus dans la roche, et le jeu tombe à seize
  // images par seconde là où chaque partie commence.
  for (const ligne of LIGNES_DC) {
    vehicules.metro(traceLigneMetro(ligne.nom), {
      nom: `métro ${ligne.nom}`, emoji: ligne.emoji, teinte: ligne.teinte,
      nb: 4, vitesse: 8, rames: 3, pause: 3, arretsIndex: arretsDeLigne(ligne.nom),
      souterrain: true,
      // La Jaune sort de terre sur son pont du Potomac : à l'air libre, la
      // rame se voit de loin comme n'importe quel train de surface.
      decouvert: (p) => p.y >= world.terrainHeight(Math.floor(p.x), Math.floor(p.z)),
    });
  }

  // Les trains intervilles (v179). Max : « add train connecting cities from
  // real life train lanes ». Chaque segment est une navette qui fait
  // l'aller-retour de gare en gare, marquant l'arrêt à chaque bout —
  // « Monter à bord » fait le reste. Les gares sont aux portes des villes.
  //
  // COMBIEN DE TRAINS ? AUTANT QU'IL EN FAUT POUR QU'ON N'ATTENDE PAS (v222).
  //
  // Max : « make sure trains arrive and depart from train stations ». Les
  // gares étaient au bon endroit — mesuré, les dix-huit arrêts tombent à ZÉRO
  // bloc d'une gare — mais chaque ligne n'avait que DEUX trains pour un tour
  // qui dure jusqu'à cent vingt-sept secondes. Un enfant posté sur un quai
  // attendait donc de vingt-six à SOIXANTE-QUATRE secondes, et le train ne
  // restait que quatre. On peut rester une minute devant une gare sans rien
  // voir venir : c'est ce que Max a vu.
  //
  // La règle, elle, était déjà écrite — pour le métro de Washington, deux
  // versions plus tôt : « trois rames ramènent l'attente sous la demi-minute,
  // ce qui est déjà l'intervalle du vrai métro aux heures creuses ». Six
  // lignes sur neuf la violaient. Le nombre de trains est donc un RÉSULTAT et
  // non un goût : le tour divisé par la demi-minute, jamais moins de deux.
  //
  // Mesuré, pire attente : 64 s → 30 s, pour 18 trains devenus 29.
  const ATTENTE_QUAI = 30;
  for (const seg of segmentsDeTrain()) {
    const t = traceSegment(seg, (x, z) => world.terrainHeight(x, z), WATER_LEVEL);
    const vitesse = 14, pause = 4;
    let longueur = 0;
    for (let i = 0; i < t.pts.length; i++) {
      const a = t.pts[i], b = t.pts[(i + 1) % t.pts.length];
      longueur += Math.hypot(b.x - a.x, b.z - a.z);
    }
    // Le tour complet : le trajet, plus l'arrêt marqué à chaque bout.
    const tour = longueur / vitesse + t.arretsIndex.length * pause;
    const rames = Math.max(2, Math.ceil(tour / ATTENTE_QUAI));
    // LE NOM PORTE LE SEGMENT, pas seulement la ligne. Deux raisons : sur le
    // bouton, « train TGV Paris–Lyon » dit à l'enfant OÙ il va, là où
    // « train TGV » ne dit rien ; et un témoin qui compte les trains d'un quai
    // ne peut pas les distinguer autrement — le TGV a deux segments de
    // longueurs différentes, donc des nombres de trains différents.
    vehicules.metro(t.pts, {
      nom: `train ${seg.ligne.nom} ${seg.de}–${seg.vers}`,
      emoji: seg.ligne.emoji, teinte: seg.ligne.teinte,
      nb: 5, vitesse, rames, pause, arretsIndex: t.arretsIndex,
    });
  }
})();

// --- block highlight -----------------------------------------------------------

const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
  new THREE.LineBasicMaterial({ color: 0x111111 })
);
highlight.visible = false;
scene.add(highlight);

function getTarget() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return raycastBlocks(world, player.eyePosition(), dir, REACH);
}

// --- input ---------------------------------------------------------------------

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const touchUI = document.getElementById('touch-ui');
const pauseBtn = document.getElementById('pause-btn');
let locked = false;   // pointer lock held (desktop)
let dragLook = false; // desktop fallback when pointer lock is unavailable
let running = false;  // game accepts input and simulates
let saveTimer = null;

// --- player position persistence: come back exactly where you left off ------------
// One saved position per context ('local' or a world code), per profile.

const POS_KEY = 'web-minecraft-pos-v1';
let posCtx = contexteCarte('local');
const posRestored = new Set();
const posAppliquee = new Map(); // contexte -> horodatage de la position posée
let posEntree = 0;              // instant d'entrée dans le contexte courant

function loadPositions() {
  try {
    const all=JSON.parse(localStorage.getItem(POS_KEY))||{};
    for(const [ctx,p] of Object.entries(all)){
      if(!ctx.startsWith('manhattan-v1:')||!p||![p.x,p.y,p.z].every(Number.isFinite))continue;
      const cible=ctx.slice(13),current=all[cible];
      if(current&&current.t>=p.t)continue;
      const mark=Object.entries(World.loadAll()[cible]||{}).find(([k])=>k.startsWith('@manhattan-v240:'))?.[1];
      all[cible]={...p,x:p.x+(mark?.[2]??urbain.ORIGINE_MANHATTAN.x),z:p.z+(mark?.[3]??urbain.ORIGINE_MANHATTAN.z)};
    }
    return all;
  } catch { return {}; }
}

function savePosition() {
  if (!running) return;
  const all = loadPositions();
  all[posCtx] = {
    x: player.pos.x, y: player.pos.y, z: player.pos.z,
    yaw: player.yaw, pitch: player.pitch, t: Date.now(),
  };
  try { localStorage.setItem(POS_KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

// Highest solid block at a column (generates the chunk on demand).
function surfaceAt(x, z) {
  return world.sommetColonne(x, z) + 1;
}

// On the first entry into a context this session, teleport back to the
// last saved spot — but validate it first: terrain can change between
// versions (new biomes) and kids can fly off into the sky, so a saved
// position may now be buried, floating in the void or lost at sea.
function placerA(p) {
  let { x, y, z } = p;
  if (world.terrainHeight(Math.floor(x), Math.floor(z)) <= WATER_LEVEL - 2) {
    x = 0.5; z = 0.5; // lost far out at sea: come home to spawn
  }
  // buried in solid blocks (terrain rose under the save) or no floor at all
  // within 30 blocks below (stranded in the sky)? land safely on the surface.
  const bx = Math.floor(x), bz = Math.floor(z);
  const buried = world.isSolid(bx, Math.floor(y + 0.3), bz) && world.isSolid(bx, Math.floor(y + 1.3), bz);
  let support = false;
  for (let yy = Math.floor(y); yy > Math.floor(y) - 30 && yy > 0; yy--) {
    if (world.isSolid(bx, yy, bz)) { support = true; break; }
  }
  if (buried || !support || y >= HEIGHT) y = surfaceAt(x, z) + 0.2;
  player.pos.set(x, y, z);
  player.vel.set(0, 0, 0);
  player.yaw = p.yaw || 0;
  player.pitch = p.pitch || 0;
  player.syncCamera();
}

function restorePosition() {
  if (posRestored.has(posCtx)) return;
  posRestored.add(posCtx);
  posEntree = Date.now();
  if(lieuInitialAVisiter){
    lieuInitialAVisiter=false;
    const p=planUrbain.DEPART;
    placerA({...p,...urbain.versTerre(p.x,p.z)});
    posAppliquee.set(posCtx,Date.now());
    return;
  }
  const p = loadPositions()[posCtx];
  // Aucune position locale : l'appareil vient d'être réinstallé, ou l'enfant
  // joue ici pour la première fois. On note zéro pour que la réponse du cloud,
  // quelle que soit son heure d'arrivée, soit acceptée sans discussion.
  posAppliquee.set(posCtx, p && p.t ? p.t : 0);
  if (!p) return;
  placerA(p);
}

// Le cloud répond APRÈS que l'enfant a appuyé sur « Jouer » : la position lue
// au démarrage vient forcément du stockage de cet appareil-ci. Sur un appareil
// réinstallé, ou après une partie sur l'iPad, elle est vide ou périmée — et
// l'enfant repartait alors du point d'apparition, à des centaines de blocs de
// là où il s'était arrêté. Quand la réponse arrive et qu'elle est plus
// récente, on le remet au bon endroit.
function positionDuCloud(state) {
  let p = state && state.pos && state.pos[posCtx];
  const ancien=state?.pos?.['manhattan-v1:'+posCtx];
  if(ancien&&[ancien.x,ancien.y,ancien.z].every(Number.isFinite)&&(!p||ancien.t>p.t)){
    const mark=Object.entries(world.exportEdits()).find(([k])=>k.startsWith('@manhattan-v240:'))?.[1];
    p={...ancien,x:ancien.x+(mark?.[2]??urbain.ORIGINE_MANHATTAN.x),z:ancien.z+(mark?.[3]??urbain.ORIGINE_MANHATTAN.z)};
  }
  if (!p || !posRestored.has(posCtx)) return;
  const connue = posAppliquee.get(posCtx) || 0;
  if (!(p.t > connue)) return;
  // On ne téléporte pas un enfant déjà lancé dans sa partie. La correction ne
  // vaut que pendant les premières secondes — sauf s'il n'avait aucune
  // position ici, auquel cas il n'y a rien à perturber.
  if (connue > 0 && Date.now() - posEntree > 40000) return;
  posAppliquee.set(posCtx, p.t);
  placerA(p);
  creatureManager.toast('☁️ Je t\'ai remis là où tu t\'étais arrêté !', 0x9fd8e8);
}

// Live rescue: if a player somehow ends far above the world (runaway
// flying, bad save), float them gently back to the ground.
setInterval(() => {
  if (!running) return;
  if (player.pos.y > HEIGHT + 40 || player.pos.y < -12) {
    const gy = surfaceAt(player.pos.x, player.pos.z);
    player.pos.y = gy + 0.2;
    player.vel.set(0, 0, 0);
    player.flying = false;
    creatureManager.toast('🪂 Hop, retour sur la terre ferme !', 0x9fd8e8);
  }
}, 4000);

setInterval(savePosition, 3000); // continuous, cheap

// never lose edits or position on a sudden close (tab killed, app hidden)
window.addEventListener('beforeunload', () => { world.saveEdits(); savePosition(); });
window.addEventListener('pagehide', () => {
  world.saveEdits();
  savePosition();
  // On prévient les autres joueurs avant de disparaître. Sans ça, la
  // connexion mourait sans un mot et il fallait attendre que le réseau s'en
  // aperçoive : le compagnon restait planté là, puis s'évanouissait sans
  // qu'on comprenne quand ni pourquoi.
  if (net) { try { net.stop(); } catch { /* déjà parti */ } net = null; }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { world.saveEdits(); savePosition(); }
});

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => world.saveEdits(), 800);
}

function startGame() {
  // L'avertissement « tu es seul·e » attend d'être dans le monde pour se
  // montrer : c'est ici qu'on le lui redemande.
  setTimeout(updatePlayersBtn, 0);
  if (IS_TOUCH) {
    running = true;
    overlay.style.display = 'none';
    touchUI.style.display = 'block';
    pauseBtn.style.display = 'block';
    return;
  }
  if (!canvas.requestPointerLock) return enableDragFallback();
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => enableDragFallback());
  } catch {
    enableDragFallback();
  }
}

function enableDragFallback() {
  dragLook = true;
  running = true;
  overlay.style.display = 'none';
  pauseBtn.style.display = 'block';
}

// Une partie mise en pause doit pouvoir reprendre là où elle était.
//
// L'écran de pause n'offrait que « Jouer en local » et « Jouer en ligne » :
// depuis un monde partagé, le premier basculait vers l'autre monde et le
// second renvoyait au menu des codes. Autrement dit, une pause en ligne était
// sans retour — il fallait tout refaire pour retrouver ses amis.
const resumeBtn = document.getElementById('resume-btn');
let partieEnCours = false;

function montrerReprise(oui) {
  partieEnCours = oui;
  resumeBtn.style.display = oui ? 'block' : 'none';
}

function pauseGame() {
  running = false;
  overlay.style.display = 'flex';
  overlayTitle.textContent = 'Pause';
  montrerReprise(true);
}

resumeBtn.addEventListener('click', () => {
  overlayTitle.textContent = 'WEB MINECRAFT';
  startGame();
});

document.getElementById('play-btn').addEventListener('click', () => {
  world.switchContext('local');
  posCtx = contexteCarte('local');
  restorePosition();
  // La position locale est restaurée dès l'accueil (v258, pour préparer le
  // monde autour de l'enfant avant « Jouer ») : la fenêtre de quarante
  // secondes pendant laquelle le nuage peut le remettre où il s'était arrêté
  // se compte donc à partir d'ICI, pas du chargement de la page.
  posEntree = Date.now();
  startGame();
});
pauseBtn.addEventListener('click', pauseGame);

document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Réinitialiser ce monde ? Toutes tes constructions ici seront perdues.')) {
    world.clearSave(); // ce monde-ci seulement : les autres ne sont pas touchés
    location.reload();
  }
});

// Les panneaux qui prennent tout l'écran relâchent la souris ; il ne faut pas
// que le jeu prenne cette libération pour une mise en pause et vienne poser
// son menu par-dessus. La carte est de ceux-là : sans elle dans cette liste,
// le menu de pause recouvrait la carte et plus rien n'y répondait.
let carteOuverte = false;

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!IS_TOUCH && !dragLook) {
    running = locked;
    if (edu.quizActive || invOpen || carteOuverte) { overlay.style.display = 'none'; return; }
    overlay.style.display = locked ? 'none' : 'flex';
    if (!locked) { overlayTitle.textContent = 'Pause'; montrerReprise(true); }
  }
});
document.addEventListener('pointerlockerror', () => enableDragFallback());

document.addEventListener('mousemove', (e) => {
  if (locked) player.onMouseMove(e.movementX, e.movementY);
  else if (dragLook && running && dragState.active) {
    player.onMouseMove(e.clientX - dragState.x, e.clientY - dragState.y);
    dragState.moved += Math.abs(e.clientX - dragState.x) + Math.abs(e.clientY - dragState.y);
    dragState.x = e.clientX; dragState.y = e.clientY;
  }
});

document.addEventListener('keydown', (e) => {
  if (!running) return;
  player.keys.add(e.code);
  if (e.code === 'KeyF') refuserOuVoler();
  if (e.code === 'KeyQ') creatureManager.throwBall();
  if (e.code === 'KeyB') toggleDex();
  if (e.code === 'KeyE') openInventory();
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (n >= 1 && n <= HOTBAR_BLOCKS.length) selectSlot(n - 1);
  }
  if (e.code === 'Space') e.preventDefault();
});

document.addEventListener('keyup', (e) => player.keys.delete(e.code));

function breakBlock() {
  // attacking an animal in reach takes priority over mining the block behind it
  const animal = animalManager.targeted();
  if (animal && animal.pos.distanceTo(player.pos) < 4.5) {
    animalManager.attack(animal);
    return;
  }
  const hit = getTarget();
  if (!hit) return;
  effects.casse(hit.x, hit.y, hit.z, hit.id); // les éclats prennent la couleur du bloc cassé
  bruitCasse();
  world.setBlock(hit.x, hit.y, hit.z, BLOCK.AIR);
  // Let adjacent water flow into the gap (cheap approximation of fluid).
  for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0]]) {
    if (world.getBlock(hit.x + dx, hit.y + dy, hit.z + dz) === BLOCK.WATER) {
      world.setBlock(hit.x, hit.y, hit.z, BLOCK.WATER);
      break;
    }
  }
  scheduleSave();
}

function placeBlock() {
  const hit = getTarget();
  if (!hit) return;
  const x = hit.x + hit.normal[0];
  const y = hit.y + hit.normal[1];
  const z = hit.z + hit.normal[2];
  const current = world.getBlock(x, y, z);
  if (current !== BLOCK.AIR && current !== BLOCK.WATER) return;
  const placing = hotbarBlocks[selectedSlot];
  // props are walk-through, so placing one at your feet is fine
  if (!isProp(placing) && player.intersectsBlock(x, y, z)) return;
  world.setBlock(x, y, z, placing);
  effects.pose(x, y, z);
  bruitPose();
  fun.onBlockPlaced();
  scheduleSave();
}

function pickBlock() {
  const hit = getTarget();
  if (!hit) return;
  const idx = hotbarBlocks.indexOf(hit.id);
  if (idx >= 0) {
    selectSlot(idx);
  } else { // not in the hotbar: assign it to the current slot, Minecraft-style
    hotbarBlocks[selectedSlot] = hit.id;
    buildHotbar();
    selectSlot(selectedSlot);
    saveHotbar();
  }
}

let mouseRepeat = null;
const dragState = { active: false, x: 0, y: 0, moved: 0, button: 0 };

document.addEventListener('mousedown', (e) => {
  if (!running || IS_TOUCH) return;
  e.preventDefault();
  if (locked) {
    const action = e.button === 0 ? breakBlock : e.button === 2 ? placeBlock : pickBlock;
    action();
    if (e.button === 0 || e.button === 2) {
      clearInterval(mouseRepeat);
      mouseRepeat = setInterval(action, 240);
    }
  } else if (dragLook) {
    dragState.active = true;
    dragState.x = e.clientX; dragState.y = e.clientY;
    dragState.moved = 0;
    dragState.button = e.button;
  }
});
document.addEventListener('mouseup', () => {
  clearInterval(mouseRepeat);
  if (dragLook && dragState.active) {
    // a click without dragging acts on the targeted block
    if (dragState.moved < 6) {
      (dragState.button === 0 ? breakBlock : dragState.button === 2 ? placeBlock : pickBlock)();
    }
    dragState.active = false;
  }
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

// --- touch controls --------------------------------------------------------------

const joyBase = document.getElementById('joy-base');
const joyKnob = document.getElementById('joy-knob');
const JOY_RADIUS = 50;
let breakMode = true;

const touch = {
  joyId: null, joyX: 0, joyY: 0,
  lookId: null, lastX: 0, lastY: 0, moved: 0, startTime: 0,
  holdTimer: null, repeatTimer: null,
};

function touchAction() {
  (breakMode ? breakBlock : placeBlock)();
}

function stopHold() {
  clearTimeout(touch.holdTimer);
  clearInterval(touch.repeatTimer);
  touch.holdTimer = null;
  touch.repeatTimer = null;
}

canvas.addEventListener('touchstart', (e) => {
  if (!running) return;
  e.preventDefault();
  for (const t of e.changedTouches) {
    const leftZone = t.clientX < window.innerWidth * 0.45 && t.clientY > window.innerHeight * 0.4;
    if (touch.joyId === null && leftZone) {
      touch.joyId = t.identifier;
      touch.joyX = t.clientX; touch.joyY = t.clientY;
      joyBase.style.display = 'block';
      joyBase.style.left = (t.clientX - 60) + 'px';
      joyBase.style.top = (t.clientY - 60) + 'px';
      joyKnob.style.transform = 'translate(0px, 0px)';
    } else if (touch.lookId === null) {
      touch.lookId = t.identifier;
      touch.lastX = t.clientX; touch.lastY = t.clientY;
      touch.moved = 0;
      touch.startTime = performance.now();
      // press-and-hold repeats the action (mine a row of blocks)
      touch.holdTimer = setTimeout(() => {
        touchAction();
        touch.repeatTimer = setInterval(touchAction, 280);
      }, 450);
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (!running) return;
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === touch.joyId) {
      let dx = t.clientX - touch.joyX, dy = t.clientY - touch.joyY;
      const d = Math.hypot(dx, dy);
      if (d > JOY_RADIUS) { dx *= JOY_RADIUS / d; dy *= JOY_RADIUS / d; }
      joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      player.touchMove.f = -dy / JOY_RADIUS;
      player.touchMove.s = dx / JOY_RADIUS;
    } else if (t.identifier === touch.lookId) {
      const dx = t.clientX - touch.lastX, dy = t.clientY - touch.lastY;
      touch.moved += Math.abs(dx) + Math.abs(dy);
      if (touch.moved > 12) stopHold();
      player.onMouseMove(dx * 2.2, dy * 2.2);
      touch.lastX = t.clientX; touch.lastY = t.clientY;
    }
  }
}, { passive: false });

function endTouch(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === touch.joyId) {
      touch.joyId = null;
      player.touchMove.f = 0;
      player.touchMove.s = 0;
      joyBase.style.display = 'none';
    } else if (t.identifier === touch.lookId) {
      const quickTap = performance.now() - touch.startTime < 300 && touch.moved < 12;
      const repeating = touch.repeatTimer !== null;
      stopHold();
      touch.lookId = null;
      if (quickTap && !repeating) touchAction();
    }
  }
}
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);

// touch buttons: hold-style buttons map to key codes the player already understands
function bindHoldButton(id, code) {
  const el = document.getElementById(id);
  el.addEventListener('touchstart', (e) => { e.preventDefault(); player.keys.add(code); }, { passive: false });
  el.addEventListener('touchend', (e) => { e.preventDefault(); player.keys.delete(code); });
  el.addEventListener('touchcancel', () => player.keys.delete(code));
}
bindHoldButton('jump-btn', 'Space');
bindHoldButton('down-btn', 'KeyC');

document.getElementById('mode-btn').addEventListener('touchstart', (e) => {
  e.preventDefault();
  breakMode = !breakMode;
  e.target.textContent = breakMode ? '⛏️' : '🧱';
}, { passive: false });

// Une voiture ne vole pas — et l'enfant doit savoir POURQUOI le bouton ne
// fait rien, sinon il appuiera dix fois en croyant l'écran cassé.
// LE BOUTON ✈️ — et ce qu'il répondait au pilote du Concorde (v228).
//
// Aux commandes d'un avion, `volInterdit` est levé — la règle « un véhicule
// ne vole pas », écrite pour les voitures — et le bouton REFUSAIT, avec ce
// message : « 🚗 Une voiture ne vole pas ». Assis dans le Concorde. C'est un
// message faux, et le projet a une règle là-dessus : un message d'erreur doit
// dire à un enfant quoi faire, jamais accuser à tort ; un message faux est
// pire que pas de message. C'est toute la panne « les avions sont
// inutilisables » que Max a signalée.
//
// Le bouton garde donc son dessin et change de SENS selon le contexte : à
// pied il fait voler, aux commandes il fait décoller puis se poser. Rien de
// neuf à apprendre — c'est la même discipline que « un seul jeu de commandes ».
function refuserOuVoler() {
  const aBord = player.decollerOuSePoser();
  if (aBord === 'decollage') {
    creatureManager.toast('✈️ Pleins gaz ! Le nez se lève tout seul — le joystick tient le cap.', 0x9fd8ff);
    return true;
  }
  if (aBord === 'remise') {
    creatureManager.toast('✈️ On remet les gaz ! Le joystick monte, descend et tourne.', 0x9fd8ff);
    return true;
  }
  if (aBord === 'atterrissage') {
    creatureManager.toast('🛬 On se pose — train sorti, garde le cap jusqu\'à la piste.', 0x9fd8ff);
    return true;
  }
  if (player.toggleFly()) return true;
  creatureManager.toast('🚗 Une voiture ne vole pas — descends d\'abord (touche M).', 0xffd166);
  return false;
}

// Ce que l'avion fait tout seul se DIT : les roues qui touchent, l'arrêt.
player.surAvion = (quoi) => {
  if (quoi === 'touche') creatureManager.toast('🛬 Posé·e ! On freine…', 0x9fd8ff);
  else if (quoi === 'ventre') creatureManager.toast('💥 Sur le ventre ! Sors le train (🛞) avant de te poser.', 0xffd166);
  else if (quoi === 'arret') creatureManager.toast('🛑 À l\'arrêt. Le joystick fait rouler, ✈️ redécolle.', 0x9fd8ff);
};

// LA MANETTE DES GAZ (v262). Max : « le joystick à gauche pour la direction
// et, en multitouch, à droite un cadran qu'on monte/baisse pour la vitesse ».
// Un curseur vertical à droite, en événements de pointeur — un doigt sur le
// joystick (le canvas, à gauche) et un doigt ici ne se gênent pas, chacun a
// son pointeur. Il fixe `player.gaz` (0 à 1) ; `player.js` en fait la
// vitesse d'une voiture ou d'un avion. Tant qu'on ne l'a pas touché, l'avant
// du joystick reste l'accélérateur : rien de ce qu'un enfant sait ne cesse
// de marcher. Et il AFFICHE la vitesse, en km/h, que la manette serve ou non.
const gazBase = document.getElementById('gaz-base');
const gazFill = document.getElementById('gaz-fill');
const gazKnob = document.getElementById('gaz-knob');
const gazVal = document.getElementById('gaz-val');
const trainBtn = document.getElementById('train-btn');
function reglerGaz(e) {
  const r = gazBase.getBoundingClientRect();
  const marge = 14;
  const n = 1 - (e.clientY - r.top - marge) / (r.height - marge * 2);
  player.gaz = Math.max(0, Math.min(1, n));
}
gazBase.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  try { gazBase.setPointerCapture(e.pointerId); } catch { /* un pointeur déjà parti */ }
  reglerGaz(e);
});
gazBase.addEventListener('pointermove', (e) => {
  if (e.buttons === 0 && e.pointerType === 'mouse') return;
  if (player.gaz == null) return;
  reglerGaz(e);
});
gazBase.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
trainBtn.addEventListener('click', () => {
  if (!player.pilote) return;
  player.trainVoulu = !((player.trainSorti === undefined ? 1 : player.trainSorti) > 0.5);
  creatureManager.toast(player.trainVoulu ? '🛞 Train sorti.' : '🛞 Train rentré.', 0x9fd8ff);
});
// LES BOUTONS DE LA MARCHE S'EFFACENT EN VÉHICULE — saut, pioche, capture,
// coffre — et reviennent à pied (Max). La classe du `body` fait le tri en CSS.
let etatVehicule = '';
function majBoutonsVehicule() {
  const enAvion = running && !!player.pilote;
  const enVehicule = running && (enAvion || player.gabarit > 1);
  const cle = `${enVehicule}|${enAvion}`;
  if (cle !== etatVehicule) {
    etatVehicule = cle;
    document.body.classList.toggle('en-vehicule', enVehicule);
    document.body.classList.toggle('en-avion', enAvion);
  }
  if (!enVehicule) return;
  const v = enAvion ? (player.vitesseAvion || 0) : Math.abs(player.vitesseVoiture || 0);
  let niveau = player.gaz;
  if (niveau == null) {
    if (enAvion) niveau = player.pilote.max ? v / player.pilote.max : 0;
    else niveau = Math.max(0, player.touchMove.f, player.keys.has('KeyW') ? 1 : 0);
  }
  niveau = Math.max(0, Math.min(1, niveau));
  gazFill.style.height = `${Math.round(niveau * 100)}%`;
  gazKnob.style.bottom = `calc(${(niveau * 100).toFixed(1)}% - ${Math.round(niveau * 22)}px)`;
  gazVal.textContent = `${Math.round(v * 3.6)} km/h`;
  if (enAvion) {
    trainBtn.classList.toggle('sorti', (player.trainSorti === undefined ? 1 : player.trainSorti) > 0.5);
    majCadranDeCap();
  }
}
window.__majBoutonsVehicule = majBoutonsVehicule;

// LE CADRAN DE CAP (v263). Le calcul est pur (`cap.js`), le DOM ne s'écrit
// que quand ce qu'il dit change : deux cent soixante distances par image
// ne coûtent rien, une réécriture de texte par image coûte un reflow.
const capDegresEl = document.getElementById('cap-degres');
const capVilleEl = document.getElementById('cap-ville');
const capRepereEl = document.getElementById('cap-repere');
let capTexte = '';
let dernierCadran = null;
function majCadranDeCap() {
  const c = cadran(player.pos.x, player.pos.z, player.yaw, dernierCadran && dernierCadran.cle);
  dernierCadran = c;
  const fleche = c.ville == null ? '' : c.dansLeCone ? '' : (c.ecart > 0 ? ' ◀' : ' ▶');
  const texte = `${c.degres}|${c.ville || ''}|${c.lisible || ''}|${fleche}`;
  if (texte !== capTexte) {
    capTexte = texte;
    capDegresEl.textContent = `${String(c.degres).padStart(3, '0')}° ${c.point}`;
    capVilleEl.innerHTML = c.ville
      ? `${c.ville}${fleche} <small>${c.lisible}</small>`
      : '<small>aucune ville en vue</small>';
  }
  if (c.ville) {
    capRepereEl.style.left = `${(50 + c.repere * 50).toFixed(1)}%`;
    capRepereEl.classList.toggle('dehors', !c.dansLeCone);
  }
}
window.__cadranDeCap = () => dernierCadran;

document.getElementById('fly-btn').addEventListener('touchstart', (e) => {
  e.preventDefault();
  refuserOuVoler();
  document.getElementById('down-btn').style.display = player.flying ? 'flex' : 'none';
}, { passive: false });

document.getElementById('ball-btn').addEventListener('touchstart', (e) => {
  e.preventDefault();
  creatureManager.throwBall();
}, { passive: false });

// --- settings & gyroscope look ----------------------------------------------------

const SETTINGS_KEY = 'web-minecraft-settings-v1';
let settings = { gyro: true };
try { settings = { ...settings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
catch { /* defaults */ }
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

const settingsPanel = document.getElementById('settings-panel');
const gyroToggle = document.getElementById('gyro-toggle');
const graphToggle = document.getElementById('graph-toggle');
function renderSettings() {
  gyroToggle.classList.toggle('on', !!settings.gyro);
  if (graphToggle) graphToggle.classList.toggle('on', graphismes() === 'avance');
}
renderSettings();
// Le changement s'applique sur place : les ombres se rallument ou s'éteignent
// (les matériaux se recompilent une fois), et la résolution suit au prochain
// passage d'`ajusterLaVue`, qui compare le canvas à ce qu'il devrait porter.
function appliquerGraphismes() {
  const voulues = ombresVoulues();
  if (renderer.shadowMap.enabled !== voulues) {
    renderer.shadowMap.enabled = voulues;
    scene.traverse((o) => {
      if (!o.material) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) m.needsUpdate = true;
    });
  }
}
window.__graphismes = { lire: graphismes, choisir: (v) => { try { localStorage.setItem(GRAPHISMES_CLE, v); } catch { /* mode privé */ } appliquerGraphismes(); renderSettings(); } };
if (graphToggle) {
  graphToggle.addEventListener('click', () => {
    window.__graphismes.choisir(graphismes() === 'avance' ? 'normal' : 'avance');
  });
}

// iOS only delivers orientation events after an explicit permission request,
// and the request must come from a user gesture.
let gyroPermissionAsked = false;
function requestGyroPermission() {
  const DOE = window.DeviceOrientationEvent;
  if (!gyroPermissionAsked && DOE && typeof DOE.requestPermission === 'function') {
    gyroPermissionAsked = true;
    DOE.requestPermission().catch(() => {});
  }
}
document.getElementById('play-btn').addEventListener('click', () => {
  if (settings.gyro && IS_TOUCH) requestGyroPermission();
});

document.getElementById('settings-btn').addEventListener('click', () => {
  settingsPanel.style.display = settingsPanel.style.display === 'flex' ? 'none' : 'flex';
});
document.getElementById('settings-close').addEventListener('click', () => {
  settingsPanel.style.display = 'none';
});
document.getElementById('gyro-row').addEventListener('click', () => {
  settings.gyro = !settings.gyro;
  if (settings.gyro) requestGyroPermission();
  renderSettings();
  saveSettings();
  creatureManager.toast(settings.gyro ? '📱 Visée par mouvement activée' : '📱 Visée par mouvement désactivée', 0x9fd8e8);
});

// Applies the CHANGE in device angles to the camera, so gyro aiming and
// touch-drag aiming compose naturally.
const DEG2PX = (Math.PI / 180) / 0.0024; // 1° of device rotation = 1° in game
let lastOrient = null;
window.addEventListener('deviceorientation', (e) => {
  if (!settings.gyro || !running || e.alpha === null || e.alpha === undefined) {
    lastOrient = null;
    return;
  }
  if (lastOrient) {
    let dAlpha = e.alpha - lastOrient.alpha;
    if (dAlpha > 180) dAlpha -= 360; else if (dAlpha < -180) dAlpha += 360;
    const dBeta = e.beta - lastOrient.beta;
    const dGamma = e.gamma - lastOrient.gamma;
    const angle = (screen.orientation ? screen.orientation.angle : window.orientation) || 0;
    let dyDeg; // positive = look down, per screen orientation
    if (angle === 90) dyDeg = dGamma;
    else if (angle === -90 || angle === 270) dyDeg = -dGamma;
    else if (angle === 180) dyDeg = dBeta;
    else dyDeg = -dBeta;
    // ignore sensor jumps and gimbal flips
    if (Math.abs(dAlpha) < 15 && Math.abs(dyDeg) < 15) {
      player.onMouseMove(-dAlpha * DEG2PX, dyDeg * DEG2PX);
    }
  }
  lastOrient = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
});

// --- meat harvest -----------------------------------------------------------------

const MEAT_KEY = 'web-minecraft-meat-v1';
let meatCount = 0;
try { meatCount = Number(localStorage.getItem(MEAT_KEY)) || 0; } catch { meatCount = 0; }
const meatCounter = document.getElementById('meat-counter');
function renderMeat() {
  meatCounter.style.display = meatCount > 0 ? 'block' : 'none';
  meatCounter.textContent = `🍖 × ${meatCount}`;
}
renderMeat();
// Le garde-manger ouvrait l'atelier, où la viande se dépensait en recettes ;
// l'atelier n'existe plus (v255), la pastille ne fait plus que compter ce
// que l'enfant a récolté. Elle ne se touche plus — un bouton qui ne ferait
// rien serait pire qu'une pastille qui compte.

function emojiBurst(emojis, n = 18) {
  const container = document.getElementById('confetti');
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'emoji-burst2';
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = 20 + Math.random() * 60 + 'vw';
    s.style.animationDelay = Math.random() * 0.5 + 's';
    s.style.fontSize = 20 + Math.random() * 26 + 'px';
    container.appendChild(s);
    setTimeout(() => s.remove(), 2400);
  }
}

// Le garagiste de la Giga-usine : trois voitures neuves attendent toujours
// sur le parc, prêtes à conduire — ce sont des montures (montures.js), la
// seule façon de VRAIMENT conduire, au doigt, où l'on veut. Les bêtes du jeu
// s'effacent à soixante-dix blocs (animals.js) : une voiture garée
// disparaîtrait dès qu'on s'éloigne. Le garagiste regarnit donc les places
// quand un enfant approche — et une voiture emmenée au loin « rentre à
// l'usine », c'est-à-dire qu'une neuve l'attend à sa place au retour.
const PLACES_GARAGE = [[30, 7], [44, 7], [58, 7]];
const garagistePret = cadence(3000);
function animerLesVilles(dt) {
  if (passants) passants.update(dt);
  if (poissons) poissons.update(dt);
  if (!vehicules || !circulationPrete()) return;
  // Le plus proche d'abord : c'est celui que l'enfant va voir en premier.
  let choisi = -1, plusPres = 220;
  for (let i = 0; i < circulationsEnAttente.length; i++) {
    const tr = circulationsEnAttente[i];
    const d = Math.hypot(player.pos.x - tr.x, player.pos.z - tr.z);
    if (d < plusPres) { plusPres = d; choisi = i; }
  }
  if (choisi < 0) return;
  const tr = circulationsEnAttente[choisi];
  // la graine vient de la ville, pas de la file (v246, voir graineDeVille)
  vehicules.circulation(tr.pts, graineDeVille(tr), {ville:tr.ville});
  // le bus dessert le grand anneau — un par ville, à sa couleur
  if (tr.rang === 0) vehicules.bus(tr.pts, Math.abs(Math.round(tr.x + tr.z)));
  circulationsEnAttente.splice(choisi, 1);
}
// L'AÉROPORTISTE : sur le tarmac de l'aérodrome le plus proche, trois
// appareils attendent toujours.
//
// Même mécanisme que le garagiste, et pour la même raison : les bêtes du jeu
// s'effacent à soixante-deux blocs, donc un avion garé disparaîtrait dès qu'on
// s'éloigne. On regarnit les postes de stationnement quand un enfant approche,
// et un avion emmené au loin est remplacé — il « rentre au hangar ».
//
// LE PLAN DU TARMAC N'EST PAS RECOPIÉ ICI. `postesAvion` le publie depuis
// `aeroport.js`, là où le tarmac est dessiné : deux tables qui décrivent le
// même plan finissent toujours par diverger, et l'on garerait des avions dans
// l'herbe. Sur une base militaire, ce sont trois chasseurs — c'est de là
// qu'ils partent.
const aeroportistePret = cadence(3000);
function aeroportiste(dt) {
  if (!aeroportistePret()) return;
  // QUATRE-VINGT-DIX BLOCS, ET CE N'EST PAS LE REMÈDE QUE JE CROYAIS.
  //
  // J'ai d'abord ramené cette portée de 130 à 90 en accusant les trois
  // appareils de faire tomber la vie de rue pendant la traversée de Paris.
  // Mesuré : Roissy est à 291 blocs du centre de Paris, le bord nord de la
  // ville à 106 de l'aéroport — à 90, l'aéroportiste ne se déclenche JAMAIS
  // pendant cette traversée, et le témoin rendait exactement les mêmes
  // chiffres. Il était hors de cause.
  //
  // Quatre-vingt-dix reste juste pour sa propre raison : un appareil garé ne
  // se dessine qu'à soixante-deux blocs, comme toute créature. En faire naître
  // à cent trente ne montre rien à personne. Le garagiste travaille à
  // quatre-vingts pour exactement ce motif.
  const a = aeroportPres(player.pos.x, player.pos.z, 90);
  if (!a) return;
  for (const { espece, du, dv, cap } of postesAvion(a.profil)) {
    const x = a.x + du, z = a.z + dv;
    // HUIT BLOCS, PAS QUATORZE. Sur une base, trois chasseurs se garent à
    // quatorze blocs l'un de l'autre : à ce rayon-là, le voisin comptait pour
    // « déjà là » et deux postes sur trois restaient vides.
    const dejaLa = animalManager.animals.some((b) => b.def.key === espece
      && Math.hypot(b.pos.x - x, b.pos.z - z) < 8);
    if (dejaLa) continue;
    const ne = animalManager.invoquer(espece, x, z);
    // LE CAP N'EST PLUS UN TIRAGE AU SORT. `animals.js` donne à toute bête un
    // yaw aléatoire ; l'espèce étant `immobile`, un avion garé pointait donc
    // dans une direction quelconque, pour toujours. Le poste publie son cap,
    // l'appareil s'y aligne — et il est le long de l'aérogare, comme au large
    // d'un vrai aéroport.
    if (ne && cap !== undefined) ne.yaw = cap;
  }
}

function garagiste(dt) {
  if (!garagistePret()) return;
  const pu = USINE();
  if (Math.hypot(player.pos.x - (pu.x + 44), player.pos.z - (pu.z + 7)) > 80) return;
  for (const [du, dv] of PLACES_GARAGE) {
    const x = pu.x + du, z = pu.z + dv;
    const dejaLa = animalManager.animals.some((a) => a.def.key === 'voiture'
      && Math.hypot(a.pos.x - x, a.pos.z - z) < 6);
    if (!dejaLa) animalManager.invoquer('voiture', x, z);
  }
}

animalManager.onHarvest = (def) => {
  meatCount++;
  try { localStorage.setItem(MEAT_KEY, String(meatCount)); } catch { /* ignore */ }
  renderMeat();
  creatureManager.toast(`${def.meat} +1 ! (garde-manger : ${meatCount})`, 0xffd75e);
  emojiBurst([def.meat.split(' ')[0], '✨'], 10);
};

// --- catch celebration ------------------------------------------------------------

// --- multiplayer ------------------------------------------------------------------

const NET_CHARACTERS = [
  { name: 'Marin', emoji: '⚓', look: {
    skin: 0xf2c9a4, hair: 0x2c1f14, pants: 0x2f4468, shoes: 0x333333,
    torsoSlabs: [0xf2f2f2, 0x3a5aa8, 0xf2f2f2, 0x3a5aa8, 0xf2f2f2],
    sleeveSegs: [0xf2f2f2, 0x3a5aa8, 0xf2f2f2],
  } },
  { name: 'Super-héroïne', emoji: '🦸', look: {
    skin: 0xdca77e, hair: 0x18110c, pants: 0x222a6a, shoes: 0xd8b23a,
    torsoSlabs: [0xd83a3a, 0xd83a3a, 0xd8b23a, 0xd83a3a, 0xd83a3a],
    sleeveSegs: [0xd83a3a, 0xd83a3a, 0xd83a3a],
    cape: 0xd83a3a, mask: 0x222a6a,
  } },
  { name: 'Exploratrice', emoji: '🧭', look: {
    skin: 0xc98e5a, hair: 0x3a2412, pants: 0x8a7a52, shoes: 0x5a4632, hairstyle: 'bun',
    torsoSlabs: [0x5a7a3a, 0x5a7a3a, 0xd8c48a, 0x5a7a3a, 0x5a7a3a],
    sleeveSegs: [0x5a7a3a, 0xd8c48a, 0x5a7a3a],
  } },
  { name: 'Savant', emoji: '🔬', look: {
    skin: 0xf2c9a4, hair: 0x6a6a72, pants: 0x3a3a44, shoes: 0x222222, glasses: true,
    torsoSlabs: [0xf2f2f0, 0xf2f2f0, 0x9fd8e8, 0xf2f2f0, 0xf2f2f0],
    sleeveSegs: [0xf2f2f0, 0xf2f2f0, 0xf2f2f0],
  } },
  { name: 'Footballeur', emoji: '⚽', look: {
    skin: 0x9c6b46, hair: 0x18110c, pants: 0x2a4a8a, shoes: 0xf2f2f0,
    torsoSlabs: [0x3a8a4a, 0xf2f2f0, 0x3a8a4a, 0xf2f2f0, 0x3a8a4a],
    sleeveSegs: [0x3a8a4a, 0xf2f2f0, 0x3a8a4a],
  } },
  { name: 'Pirate', emoji: '🏴‍☠️', look: {
    skin: 0xe8b98a, hair: 0x2c1f14, pants: 0x3a2a1a, shoes: 0x1a1a1a, hat: 0xc03030,
    torsoSlabs: [0x22222a, 0xf2f2f0, 0x22222a, 0xf2f2f0, 0x22222a],
    sleeveSegs: [0x22222a, 0xf2f2f0, 0x22222a],
  } },
  { name: 'Astronaute', emoji: '🚀', look: {
    skin: 0xf2c9a4, hair: 0x3a2412, pants: 0xe8e8ea, shoes: 0x8a8a92, hat: 0xf2f2f4,
    torsoSlabs: [0xe8e8ea, 0xe8e8ea, 0xd85a2a, 0xe8e8ea, 0xe8e8ea],
    sleeveSegs: [0xe8e8ea, 0xd85a2a, 0xe8e8ea],
  } },
  { name: 'Chevalière', emoji: '🛡️', look: {
    skin: 0xdca77e, hair: 0x6a4a2a, pants: 0x5a5a64, shoes: 0x3a3a42, hairstyle: 'bun',
    torsoSlabs: [0x9a9aa4, 0x9a9aa4, 0xd8b23a, 0x9a9aa4, 0x9a9aa4],
    sleeveSegs: [0x9a9aa4, 0x9a9aa4, 0x9a9aa4],
    cape: 0x6a3a8a,
  } },
];

let net = null;
let selectedChar = 0;
const remotePlayers = new Map(); // peerId -> { mesh, target, yaw, moving, animTime }
const playersBtn = document.getElementById('players-btn');

function updatePlayersBtn() {
  if (!net || !net.active) {
    playersBtn.style.display = 'none';
    alerte('monde-seul', false);
    return;
  }
  playersBtn.style.display = 'block';
  const n = net.playerCount();
  playersBtn.textContent = `🌐 ${n} ▾`;
  // Le bandeau porte le code : c'est ce qu'il faut dicter à l'autre pour qu'il
  // arrive, et c'est justement l'information qu'on cherche à ce moment-là.
  //
  // Il n'apparaît qu'une fois dans le monde. Affiché depuis le menu, il venait
  // se poser en travers des boutons pour annoncer une solitude que l'enfant
  // n'avait pas encore eu l'occasion de constater.
  // « Dans le monde » se lit à l'écran d'accueil replié, pas au drapeau
  // `running` : celui-ci attend encore le verrouillage du pointeur sur un
  // ordinateur, alors que l'enfant, lui, joue déjà.
  const dansLeMonde = overlay.style.display === 'none';
  alerte('monde-seul', dansLeMonde && n === 1,
    `🕐 Seul·e dans le monde ${net.code} — donne ce code à ton ami·e`);
}

function openPlayersPanel() {
  if (!net || !net.active) return;
  document.getElementById('pp-code').textContent = net.code;
  const list = document.getElementById('pp-list');
  list.innerHTML = '';
  const row = (emoji, name, extra) => {
    const div = document.createElement('div');
    div.className = 'pp-row';
    div.innerHTML = `<span class="pp-emoji">${emoji}</span><span>${name}</span><span style="color:#8894b0">${extra}</span>`;
    list.appendChild(div);
  };
  row(NET_CHARACTERS[selectedChar].emoji, myName(), '(toi)');
  for (const c of net.conns.values()) {
    row((NET_CHARACTERS[c.lookIdx] || NET_CHARACTERS[0]).emoji, c.name, 'en ligne');
  }
  fun.decoratePlayersPanel(list); // friendly duels & hide-and-seek
  document.getElementById('pp-amis').innerHTML = '';
  document.getElementById('pp-amis-btn').style.display = cloud.configured ? 'block' : 'none';
  document.getElementById('players-panel').style.display = 'flex';
}
playersBtn.addEventListener('click', openPlayersPanel);
document.getElementById('players-close').addEventListener('click', () => {
  document.getElementById('players-panel').style.display = 'none';
});

// --- les amis connectés ailleurs ------------------------------------------
//
// Le compteur du monde ne dit qu'une chose : combien on est ICI. Un enfant qui
// voit « 🌐 1 » ne sait pas si son frère est devant sa tablette, dans son
// monde local, ou pas là du tout — et il n'avait aucun moyen de le lui
// demander autrement qu'en criant dans le couloir.
//
// La présence, elle, était déjà écrite : chaque tablette pose dans ses
// réglages où elle est et quand, toutes les vingt secondes. Seul l'espace
// parent la lisait. Il suffisait de la rendre à l'enfant.
const AMI_EN_LIGNE_MS = 90 * 1000;   // deux battements manqués : il n'est plus là

// `~parent`, `~invit` : les documents de service ne sont pas des joueurs.
const estUnJoueur = (nom) => !String(nom).includes('~');

async function listerLesAmis() {
  const zone = document.getElementById('pp-amis');
  zone.innerHTML = '<div class="pp-vide">On regarde qui est là…</div>';
  let presences = [];
  try { presences = await cloud.presences(); } catch { /* hors ligne */ }
  const moi = (myName() || '').toLowerCase();
  const maintenant = Date.now();
  const amis = presences
    .filter((p) => estUnJoueur(p.nom) && p.nom.toLowerCase() !== moi)
    .filter((p) => maintenant - (p.live.at || 0) < AMI_EN_LIGNE_MS)
    // ceux qui sont déjà dans NOTRE monde n'ont pas besoin d'invitation
    .filter((p) => !(net && net.active && p.live.monde === net.code));

  zone.innerHTML = '';
  if (!amis.length) {
    zone.innerHTML = '<div class="pp-vide">Personne d\'autre n\'est connecté en ce moment.</div>';
    return;
  }
  for (const a of amis) {
    const ligne = document.createElement('div');
    ligne.className = 'pp-row';
    const ou = a.live.monde ? `monde ${a.live.monde}` : 'son propre monde';
    const nom = document.createElement('span');
    nom.style.flex = '1';
    nom.textContent = a.nom;
    const lieu = document.createElement('span');
    lieu.className = 'pp-ou';
    lieu.textContent = ou;
    const bouton = document.createElement('button');
    bouton.className = 'pp-inviter';
    bouton.textContent = 'Inviter';
    bouton.addEventListener('click', async () => {
      bouton.disabled = true;
      bouton.textContent = '…';
      const parti = await inviter(a.nom);
      bouton.textContent = parti ? '✓ invité' : '✗ raté';
      if (!parti) bouton.disabled = false;
    });
    ligne.append(document.createElement('span'), nom, lieu, bouton);
    ligne.firstChild.className = 'pp-emoji';
    ligne.firstChild.textContent = '👋';
    zone.appendChild(ligne);
  }
}
document.getElementById('pp-amis-btn').addEventListener('click', listerLesAmis);

async function inviter(nom) {
  if (!net || !net.active) return false;
  try {
    await cloud.prefsPush(cleInvit(nom), { de: myName(), code: net.code, carte: 'terre', at: Date.now() });
    creatureManager.toast(`✉️ Invitation envoyée à ${nom} !`, 0x7ee787);
    return true;
  } catch {
    creatureManager.toast('Impossible d\'envoyer l\'invitation — réessaie.', 0xff9d5e);
    return false;
  }
}

// --- recevoir une invitation ----------------------------------------------
//
// Deux chemins, parce qu'un enfant n'a pas toujours le jeu sous les yeux :
// le panneau, qui attend qu'on revienne, et la vraie notification du système,
// qui va le chercher sur son écran d'accueil. Elle ne part qu'une fois par
// invitation — la date en fait l'identité, et on retient la dernière traitée.
function recevoirInvitation(inv) {
  if (!inv || !inv.code || !inv.at) return;
  if (Date.now() - inv.at > INVIT_MS) return;
  let vue = 0;
  try { vue = Number(localStorage.getItem(INVIT_VUE)) || 0; } catch { /* ignore */ }
  if (inv.at <= vue) return;
  try { localStorage.setItem(INVIT_VUE, String(inv.at)); } catch { /* ignore */ }
  // Déjà dedans : l'invitation est arrivée après coup, il n'y a rien à faire.
  if (net && net.active && net.code === inv.code) return;
  montrerInvitation(inv);
  notifierSysteme(`🎉 ${inv.de} t'invite !`,
    `Rejoins son monde ${inv.code} — ouvre le jeu et clique sur « Rejoindre ».`, 'wm-invit');
}

function montrerInvitation(inv) {
  document.getElementById('invit-txt').textContent =
    `${inv.de} t'invite à jouer dans son monde !`;
  document.getElementById('invit-code').textContent = inv.code;
  document.getElementById('invit-code').dataset.carte = inv.carte || 'terre';
  document.getElementById('invit-panel').style.display = 'flex';
}

function fermerInvitation() {
  document.getElementById('invit-panel').style.display = 'none';
}
document.getElementById('invit-plus-tard').addEventListener('click', fermerInvitation);
document.getElementById('invit-rejoindre').addEventListener('click', () => {
  accepterInvitation(document.getElementById('invit-code').textContent);
});

// On accepte souvent depuis un monde où l'on est déjà. Il faut donc quitter
// celui-ci avant d'ouvrir l'autre — sans cela, deux sessions se disputaient le
// même joueur et les avatars de l'ancien monde restaient plantés là.
async function accepterInvitation(code) {
  fermerInvitation();
  document.getElementById('players-panel').style.display = 'none';
  if (net) {
    try { net.stop(); } catch { /* déjà arrêté */ }
    net = null;
    syncRemotePlayers([]);
  }
  await openWorld(code);
}

// Les tests suivent le parcours entier, d'un enfant à l'autre.
window.__inviter = inviter;
window.__listerLesAmis = listerLesAmis;
window.__accepterInvitation = accepterInvitation;
const cloud = new CloudSave(world, (msg, color) => creatureManager.toast(msg, color));

// player profile: each device types its own character name (Marlon, Alice…)
const PROFILE_KEY = 'web-minecraft-profile-v1';
let playerProfile = { name: '' };
try { playerProfile = { ...playerProfile, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') }; }
catch { /* defaults */ }
// Whole-profile portability (declared here so the profile-switching helpers
// below can flush state before they reload). See the sync section further on.
const profileSync = new ProfileSync(cloud, () => playerProfile.name);
profileSync.onTrim = (dropped) => {
  creatureManager.toast(`☁️ Sauvegarde allégée (${dropped.join(', ')}) — trop de contenu`, 0xff9d5e);
};
// The world in memory is the truth; localStorage only catches up on a
// debounced save, so a push that read storage alone could ship a copy that
// is a few seconds behind what the child just built.
profileSync.liveEdits = () => ({ [world.ctx]: world.exportEdits() });
// A background merge can bring down blocks another device placed. They go
// straight into the live world so they appear without waiting for a reload.
profileSync.onMerged = (state) => {
  // L'import choisit aussi le décalage des anciens chantiers. Restaurer la
  // position avant lui enverrait l'enfant à New York même si son chantier
  // a dû être déplacé pour préserver une construction de Terre.
  const applied = state?.edits ? world.importerProfil(state.edits) : 0;
  if (applied > 0) {
    world.saveEdits();
    creatureManager.toast(`☁️ ${applied} blocs arrivés d'un autre appareil !`, 0x9fd8e8);
  }
  positionDuCloud(state);
};
profileSync.start();

// LA COPIE D'AVANT L'AGRANDISSEMENT DE LA CARTE.
//
// Max a tranché : la carte double, pour que les villes aient enfin la place de
// grandir. Le relief changera partout sauf à Paris, où l'ancre de la
// projection est plantée exprès parce que c'est là que les enfants ont le plus
// bâti. Avant que quoi que ce soit ne bouge, on met leurs blocs à l'abri —
// c'est la règle de `CLAUDE.md` sur les casses autorisées : on casse ce qu'on
// ne sait pas suivre, pas ce qu'on n'a pas envie de suivre.
//
// Une seule fois, sur son propre document, et sans un mot à l'enfant : ce
// n'est pas une manœuvre qui le concerne. On laisse d'abord la première
// synchronisation se faire — la copie doit contenir TOUT ce qu'il a bâti, y
// compris ce qui dort encore sur une autre tablette.
setTimeout(() => {
  profileSync.sauverAvantLaRefonte()
    .then((r) => { if (r === 'sauvé') console.log('blocs mis à l\'abri avant la refonte de la carte'); })
    .catch(() => {});
}, 12000);

// --- bandeau d'état : réseau et sauvegardes ---------------------------------
//
// Jusqu'ici, une sauvegarde qui échouait ou un monde en ligne qui décrochait
// ne se voyaient nulle part : l'enfant continuait à construire, persuadé que
// tout allait bien, et découvrait la perte au lancement suivant. Le bandeau
// dit ce qui se passe, en une ligne, sans jamais l'empêcher de jouer — un
// écran bloquant priverait aussi du mode hors-ligne, qui lui fonctionne.
//
// Deux messages au plus, les plus graves d'abord. Un seul cachait le reste :
// un monde qui décroche pendant que la sauvegarde échoue, ce sont deux
// informations différentes, et celle qu'on masque est justement celle qui
// explique ce qu'on voit à l'écran.
const linkBanner = document.getElementById('link-banner');
//
// « Pas d'internet » ne figure plus ici. Une phrase qui occupe une ligne en
// permanence finit par ne plus rien dire ; le bouton « Jouer en ligne » se
// barre d'un trait rouge, ce qui se comprend d'un coup d'œil et ne prend pas
// de place. La clé reste posée dans la table des alertes : c'est elle qui
// évite de répéter l'échec de sauvegarde qu'elle explique déjà.
const ALERTES = {
  'sauvegarde-ko': { rang: 4, cls: 'grave', txt: '⚠️ Sauvegarde en ligne impossible — préviens un parent' },
  'monde-perdu': { rang: 5, cls: 'grave', txt: '🔌 Monde en ligne perdu' },
  'monde-reco': { rang: 2, cls: '', txt: '🔄 Reconnexion au monde…' },
  'signal': { rang: 1, cls: '', txt: '📡 Reconnexion au serveur de jeu…' },
  // Seul dans un monde en ligne : ce n'est pas une panne, mais il faut le dire.
  // Un compteur « 🌐 1 » sur un petit bouton ne se lit pas quand on a sept ans,
  // et c'est ainsi qu'un enfant jouait dix minutes en croyant être avec l'autre.
  'monde-seul': { rang: 0, cls: '', txt: '🕐 Tu es seul·e dans ce monde' },
};
const alertes = new Map(); // clé -> texte affiché
// La place réservée est mesurée sur le bandeau lui-même : un texte long passe
// à la ligne sur un téléphone, et une hauteur écrite en dur laisserait la
// minicarte remonter dessus.
// Les messages qu'on a fermés, retenus par leur contenu : tant que c'est le
// même, on ne le remontre pas ; un message nouveau, lui, s'affiche.
let bandeauFerme = null;

function montrerBandeau(texte, cls) {
  if (texte === bandeauFerme) { cacherBandeau(); return; }
  document.getElementById('link-banner-txt').textContent = texte;
  linkBanner.className = cls;
  linkBanner.style.display = 'block';
  document.documentElement.classList.add('a-bandeau');
  const h = Math.ceil(linkBanner.getBoundingClientRect().height) + 6;
  document.documentElement.style.setProperty('--banner-h', `${h}px`);
}

function cacherBandeau() {
  linkBanner.style.display = 'none';
  document.documentElement.classList.remove('a-bandeau');
  document.documentElement.style.removeProperty('--banner-h');
}

function refreshBanner() {
  const actifs = [...alertes]
    .filter(([k]) => ALERTES[k])
    // hors-ligne explique déjà l'échec de sauvegarde : le répéter n'apprend rien
    .filter(([k]) => !(k === 'sauvegarde-ko' && alertes.has('hors-ligne')))
    .sort((a, b) => ALERTES[b[0]].rang - ALERTES[a[0]].rang);
  if (!actifs.length) { cacherBandeau(); return; }
  const garde = actifs.slice(0, 2);
  montrerBandeau(
    garde.map(([k, txt]) => txt || ALERTES[k].txt).join('  ·  '),
    garde.some(([k]) => ALERTES[k].cls === 'grave') ? 'grave' : '',
  );
}
function alerte(cle, actif, texte) {
  if (actif) alertes.set(cle, texte || '');
  else if (!alertes.has(cle)) return;
  else alertes.delete(cle);
  refreshBanner();
}
// Un retour à la normale mérite d'être dit, brièvement, sinon on ne sait pas
// si le problème est réglé ou seulement passé sous silence.
function bonneNouvelle(texte) {
  montrerBandeau(texte, 'ok');
  clearTimeout(linkBanner._t);
  linkBanner._t = setTimeout(refreshBanner, 2600);
}

// Le bouton « Jouer en ligne » porte l'état de la connexion.
function majBoutonEnLigne() {
  document.getElementById('online-btn')?.classList.toggle('offline', !navigator.onLine);
}

alerte('hors-ligne', !navigator.onLine);
majBoutonEnLigne();
window.addEventListener('offline', () => { alerte('hors-ligne', true); majBoutonEnLigne(); });
window.addEventListener('online', () => {
  alerte('hors-ligne', false);
  majBoutonEnLigne();
  profileSync.pull().catch(() => {});
});

// Fermer le bandeau : d'un doigt n'importe où dessus, ou par la croix.
linkBanner.addEventListener('click', () => {
  bandeauFerme = document.getElementById('link-banner-txt').textContent;
  cacherBandeau();
});

// Le toast se referme d'une pression : inutile d'attendre qu'il s'efface.
document.getElementById('toast')?.addEventListener('click', (e) => {
  e.currentTarget.style.opacity = '0';
});

// --- la pastille du siège ----------------------------------------------------
// Elle ne s'allume que pendant l'approche et l'assaut, et seulement si l'enfant
// est à portée : c'est le rappel qui manquait pour qu'il pense à aller voir.
const siegeChip = document.getElementById('siege-chip');
let siegeAllume = false;
function majPastilleSiege() {
  const actif = !!siege?.enCours();
  if (actif === siegeAllume) return;
  siegeAllume = actif;
  siegeChip.style.display = actif ? 'block' : 'none';
  siegeChip.textContent = siege?.phase() === 'approche'
    ? '🐎 Des assaillants approchent !' : '⚔️ Assaut au château !';
}

profileSync.onSaveState = (etat) => {
  if (etat === 'ko') alerte('sauvegarde-ko', true);
  else if (etat === 'ok') {
    const avait = alertes.has('sauvegarde-ko');
    alerte('sauvegarde-ko', false);
    if (avait) bonneNouvelle('☁️ Sauvegarde en ligne rétablie');
  }
};

// Signe de vie, pour l'espace parent : savoir si un enfant joue en ce moment,
// et où. Rangé dans les réglages plutôt que dans une table à part — la lecture
// des réglages ignore les clés qu'elle ne connaît pas, et une table de plus
// demanderait un accès à la base que le jeu n'a pas.
// La version qui tourne réellement sur CET appareil. Le service worker en est
// la seule source de vérité — le recopier ici finirait décalé.
let versionEnCours = null;
// L'espace parent la lit pour dire si une tablette est restée en arrière.
const publierVersion = () => { window.__version = versionEnCours; };

function presenceNow() {
  return {
    at: Date.now(),
    device: deviceId,
    carte: 'terre',
    monde: net && net.active ? net.code : null,   // null = monde local
    joue: !!running,
    joueurs: net && net.active ? net.playerCount() : 0,
    // Sur quelle version l'enfant joue. Elle voyage avec la présence, donc
    // elle survit à la déconnexion : l'espace parent peut ainsi répondre à
    // « sur quoi était-il la dernière fois ? », et pas seulement « maintenant ».
    version: versionEnCours,
    // Dans combien de secondes tombe le prochain quiz — la suite naturelle du
    // réglage de rythme : le parent qui vient de le poser peut vérifier d'un
    // coup d'œil que la tablette le suit vraiment, sans aller regarder
    // par-dessus l'épaule de l'enfant. null quand aucun quiz ne viendra
    // (répit gagné, arrêt réglé par le parent, ou partie fermée).
    quizDans: (typeof edu !== 'undefined' && running && !edu.quizFree() && !edu.quizArrete())
      ? Math.max(0, Math.round(edu.remaining)) : null,
  };
}

// Les consignes décidées depuis l'espace parent.
//
// Elles vivent dans le même document que les réglages de l'enfant, et c'est ce
// qui les faisait disparaître : l'appareil de l'enfant réécrit ce document
// entier toutes les quinze secondes, avec SA valeur. Un parent qui changeait le
// rythme des quiz le voyait donc revenir en arrière dans le quart de minute qui
// suivait — le réglage n'était pas « mal enregistré », il était consciencieusement
// écrasé.
//
// La règle est maintenant nette : ces clés-là, l'enfant les lit et les recopie
// telles quelles, il n'en fabrique jamais la valeur. Un seul auteur, plus de
// course.
const CLES_PARENT = ['sessionMin', 'quizStopMin'];
// Elles vivent dans un document à part, écrit par le seul espace parent.
//
// Les loger avec les réglages de l'enfant laissait une course : entre le moment
// où la tablette relit le document et celui où elle le réécrit, une décision du
// parent pouvait se glisser — et disparaissait alors définitivement, puisque
// l'écriture remplace le document entier. Fenêtre courte, mais toutes les
// quinze secondes, et sans rattrapage possible. Un document par auteur supprime
// la course au lieu de la rétrécir.
const cleConsignes = (nom) => `${nom}~parent`;
let consignesParents = {};

// `autoritaire` : le document dédié du parent fait foi, y compris par ses
// absences. Sans cela, une consigne RETIRÉE ne se retirait jamais : on ne
// copiait que les clés présentes, et la valeur d'avant restait en mémoire
// jusqu'au prochain redémarrage. Un parent qui rendait les quiz à l'enfant —
// « toutes les 10 min » après un « aucun quiz » — ne les rendait donc pas.
// Le repli sur le document de l'enfant (les vieilles versions y rangeaient
// les consignes) reste non autoritaire : son silence ne dit rien.
function retenirConsignes(prefs, autoritaire = false) {
  for (const k of CLES_PARENT) {
    if (prefs && prefs[k] !== undefined) consignesParents[k] = prefs[k];
    else if (autoritaire) delete consignesParents[k];
  }
}

// Les invitations voyagent dans un document à part, pour la même raison que
// les consignes : celui de l'enfant est réécrit en entier toutes les quinze
// secondes par sa propre tablette, et une invitation qui s'y serait glissée
// aurait disparu avant d'être lue. Le jeu n'a pas d'autre canal — il ne peut
// écrire que dans les tables qu'il lit déjà.
const cleInvit = (nom) => `${nom}~invit`;
// Passé ce délai, l'invitation ne vaut plus : l'ami est parti manger, ou a
// changé de monde. Mieux vaut ne rien dire que faire courir un enfant vers un
// monde vide.
const INVIT_MS = 5 * 60 * 1000;
const INVIT_VUE = 'wm-invit-vue';

// Les consignes d'abord dans leur document ; à défaut, dans celui de l'enfant,
// où les versions précédentes les rangeaient. L'invitation d'un ami arrive
// dans la même requête : c'est la boucle la plus fréquente du jeu, elle n'a pas
// à être doublée.
async function lireConsignes() {
  let vues = null, invit = null;
  try {
    const docs = await cloud.prefsPullMany([
      cleConsignes(playerProfile.name), cleInvit(playerProfile.name),
    ]);
    vues = docs.get(cleConsignes(playerProfile.name)) || null;
    invit = docs.get(cleInvit(playerProfile.name)) || null;
  } catch { /* hors ligne */ }
  if (invit) recevoirInvitation(invit);
  const avant = JSON.stringify(consignesParents);
  let profilChange = false;
  if (vues) {
    retenirConsignes(vues, true);
    // Un parent peut aussi régler la langue et le niveau. Ces deux-là,
    // l'enfant les choisit lui-même de son côté — c'est donc la date du
    // dernier choix qui tranche, et adopterProfilDistant s'en charge. Les
    // loger ici plutôt que dans le document de l'enfant est ce qui les met
    // hors de portée de sa réécriture toutes les quinze secondes.
    profilChange = adopterProfilDistant(vues);
  }
  return profilChange || JSON.stringify(consignesParents) !== avant;
}

// La veille des consignes : ce qu'un parent décide doit se voir tout de suite.
//
// Elles étaient relues au rythme des envois, toutes les quinze secondes. C'est
// long quand on est debout à côté de l'enfant, qu'on vient de changer un
// réglage et qu'il ne se passe rien : on doute du réglage, on recommence, on
// finit par croire que ça ne marche pas. Deux secondes, et le doute disparaît.
//
// Le coût est une requête minuscule — une ligne, sans le journal de blocs — et
// elle s'espace dès que l'application passe en arrière-plan, où personne ne
// regarde l'écran.
const GUET_ACTIF_MS = 2000;
const GUET_FOND_MS = 20000;

async function guetterConsignes() {
  if (playerProfile.name && cloud.configured && navigator.onLine) {
    try {
      if (await lireConsignes()) {
        appliquerConsignes();
        creatureManager.toast('⚙️ Un parent vient de changer tes réglages.', 0x9fd8e8);
      }
    } catch { /* on repassera dans deux secondes */ }
  }
  setTimeout(guetterConsignes,
    document.visibilityState === 'hidden' ? GUET_FOND_MS : GUET_ACTIF_MS);
}
setTimeout(guetterConsignes, GUET_ACTIF_MS);

function appliquerConsignes() {
  if (consignesParents.sessionMin !== undefined) edu.setSessionMinutes(consignesParents.sessionMin);
  edu.setArretApres(consignesParents.quizStopMin);
}

function prefsPayload() {
  return {
    // Quand ces réglages-ci ont été choisis. Deux tablettes de la maison
    // peuvent être allumées en même temps : sans cette date, celle qui n'a rien
    // changé réécrivait sa version périmée par-dessus le choix de l'autre.
    majProfil: playerProfile.majProfil || 0,
    lang: playerProfile.lang, grade: playerProfile.grade, charIdx: selectedChar,
    look: playerProfile.look, // their character's own skin/hair colours
    // the adaptive quiz engine's per-skill levels & recent-question memory
    // follow the child too, so switching devices mid-progress is seamless
    skills: edu.skills, recent: [...edu.recent],
    // Les questions déjà acquises voyagent avec l'enfant : sans cela, changer
    // d'appareil lui rendrait tout ce qu'il avait fini par savoir.
    acquis: Object.fromEntries([...edu.acquis]),
    acquisNiveau: Object.fromEntries([...edu.acquisNiveau]),
    live: presenceNow(),
  };
}

// On relit avant d'écrire.
//
// Le document de réglages a deux auteurs : la tablette de l'enfant et l'espace
// parent. Écrire sans relire, c'est écraser ce que l'autre vient de décider —
// et comme la tablette écrit toutes les quinze secondes, c'est toujours elle
// qui gagnait. Un parent voyait donc son réglage revenir en arrière presque
// aussitôt : il n'était pas mal enregistré, il était effacé.
//
// Relire d'abord règle les deux moitiés du problème d'un coup : on n'efface
// plus la consigne du parent, et on l'adopte au passage sans attendre que
// l'enfant relance le jeu.
let prefsPushTimer = null;
function pushPrefsToCloud() {
  clearTimeout(prefsPushTimer);
  prefsPushTimer = setTimeout(() => envoyerPrefs(), 1200);
}

async function envoyerPrefs() {
  if (!playerProfile.name) return;
  try {
    const distant = await cloud.prefsPull(playerProfile.name);
    if (distant) {
      // Une autre tablette de la maison a peut-être un choix plus récent que le
      // nôtre : adopterProfilDistant tranche sur la date et ne fait rien sinon.
      adopterProfilDistant(distant);
    }
  } catch { /* hors ligne : on écrit quand même ce qu'on a */ }
  cloud.prefsPush(playerProfile.name, prefsPayload()).catch(() => {});
}

// Un battement régulier : sans lui, « en ligne » voudrait dire « a ouvert un
// réglage récemment », ce qui n'est pas la même chose.
setInterval(() => {
  if (!playerProfile.name || !cloud.configured || !navigator.onLine) return;
  cloud.prefsPush(playerProfile.name, prefsPayload()).catch(() => {});
}, 20000);

function saveProfile() {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(playerProfile)); } catch { /* ignore */ }
  pushPrefsToCloud(); // settings follow the first name across devices
  pullPlayTime(); // and so does this device's view of the child's total play time
  // keep the profile registry's display name and look in sync
  const reg = loadRegistry();
  const entry = reg.list.find((p) => p.id === reg.current);
  if (entry && ((playerProfile.name && entry.name !== playerProfile.name) || entry.charIdx !== selectedChar)) {
    if (playerProfile.name) entry.name = playerProfile.name;
    entry.charIdx = selectedChar;
    saveRegistry(reg);
    renderProfiles();
  }
  refreshAdminBtn();
  refreshHello();
}

// Déclarée à part et sans dépendance : saveProfile peut l'appeler avant que
// le panneau parent n'existe.
function refreshAdminBtn() {
  const b = document.getElementById('admin-btn');
  if (b) b.style.display = isAdminName(playerProfile.name) ? 'flex' : 'none';
}

// Le prénom sur l'accueil : en allumant le jeu, la première question est
// « suis-je bien sur mon compte ? ». Elle se répondait jusqu'ici en ouvrant
// « Mon personnage ».
function refreshHello() {
  const el = document.getElementById('player-hello');
  if (!el) return;
  const nom = (playerProfile.name || '').trim();
  if (!nom) { el.style.display = 'none'; return; }
  el.innerHTML = '';
  el.append('👋 Salut ');
  const qui = document.createElement('span');
  qui.className = 'qui';
  qui.textContent = nom;
  el.append(qui, ' !');
  el.style.display = 'flex';
}

// --- local profiles ("Qui joue ?") -------------------------------------------------
// The storage shim in index.html suffixes all progress keys with the active
// profile id, so each player on this device has a fully separate save.

const REG_KEY = 'web-minecraft-profiles-v1';
const raw = window.__rawStorage;

function loadRegistry() {
  try {
    const reg = JSON.parse(raw.get(REG_KEY));
    if (reg && reg.list && reg.list.length) return reg;
  } catch { /* first run */ }
  // Un appareil qui a déjà servi garde sa partie : elle devient le joueur 1.
  // Un appareil neuf, lui, ne reçoit aucun profil — l'écran « Qui joue ? »
  // propose de créer un compte ou de se connecter, plutôt qu'un « Joueur 1 »
  // fantôme que personne n'a demandé et dans lequel les enfants atterrissaient.
  const reg = playerProfile.name
    ? { current: 1, nextId: 2, list: [{ id: 1, name: playerProfile.name }] }
    : { current: 0, nextId: 1, list: [] };
  raw.set(REG_KEY, JSON.stringify(reg));
  return reg;
}

function saveRegistry(reg) {
  try { raw.set(REG_KEY, JSON.stringify(reg)); } catch { /* ignore */ }
}

function switchProfile(id) {
  const reg = loadRegistry();
  if (id === reg.current) return;
  world.saveEdits();
  edu.save();
  profileSync.push(true).catch(() => {}); // this child's state before we swap away
  reg.current = id;
  saveRegistry(reg);
  try { sessionStorage.setItem('wm-who-done', '1'); } catch { /* ignore */ }
  location.reload(); // clean re-init on the new profile's save space
}

// Même règle que le shim de stockage dans index.html : le profil 1 garde les
// clés nues (c'est la partie qui existait avant les profils), les suivants
// sont suffixés. Écrire à côté rend la donnée invisible au jeu.
const profileKey = (key, id) => (id === 1 ? key : `${key}::p${id}`);

function deleteProfileData(id) {
  for (const k of raw.perProfileKeys) {
    raw.remove(profileKey(k, id));
  }
}

// Playful password-free identification (face + 6-digit backup code).
const identity = new Identity(cloud, raw);

// Porte de secours parentale : ouvrir l'adresse avec ?unlock=<code parental>
// lève la pause « trop d'essais » dès le démarrage. Le bouton dans l'écran de
// pause suffit d'habitude, mais il faut encore l'atteindre — un lien qu'on
// envoie par message débloque un enfant coincé sans rien lui faire chercher.
(function parentUnlock() {
  const asked = new URLSearchParams(location.search).get('unlock');
  if (!asked) return;
  if (asked !== '135246') { creatureManager.toast('Code parental incorrect', 0xff6b6b); return; }
  identity.clearLock();
  creatureManager.toast('🔓 Reconnaissance débloquée !', 0x9fd8e8);
  // On retire le code de la barre d'adresse — il n'a pas à rester dans
  // l'historique ni à repartir dans un lien partagé — sans toucher au reste
  // des paramètres, qui configurent le jeu.
  try {
    const q = new URLSearchParams(location.search);
    q.delete('unlock');
    const s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? `?${s}` : ''));
  } catch { /* ignore */ }
})();
identity.syncFromCloud();
// Le scanner se charge pendant que l'enfant lit l'accueil, pour qu'il n'ait
// plus à l'attendre au moment où il veut se faire reconnaître — mais JAMAIS
// pendant qu'il attend de jouer : ses 4,67 Mo font quatre-vingts pour cent du
// premier chargement. `running` dit exactement ce qu'il faut savoir : il passe
// à vrai dès que l'enfant entre dans le monde, donc pendant que les morceaux
// s'engendrent, et il redevient faux à la pause et sur les menus.
prefetchScanner(() => !running);

// Sampled from the enrolment photo: the child's character gets their skin
// and hair colour. Stored with the profile and synced, so it follows them.
identity.onLook = (name, look) => {
  if (name !== playerProfile.name) return; // a new account applies it after its reload
  playerProfile.look = look;
  saveProfile();
  refreshCharPortraits();
  creatureManager.toast('🎨 Ton personnage te ressemble maintenant !', 0x9fd8e8);
};

// A face enrolled just before this profile was entered (typically a
// brand-new account) left its colours against the name — adopt them now.
if (playerProfile.name && !playerProfile.look) {
  const seeded = identity.lookFor(playerProfile.name);
  if (seeded) {
    playerProfile.look = seeded;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(playerProfile)); } catch { /* ignore */ }
  }
}

// Picking a profile runs the right flow:
//  - never secured  -> the little sign-up (this is how pre-existing profiles
//    get onboarded); skipping it keeps the old behaviour exactly
//  - secured, and this device proved who they are in the last 30 days -> straight in
//  - secured but not trusted here yet -> a quick face/code check first
function enterProfile(p, reg) {
  const go = () => { if (p.id === reg.current) closeWhoScreen(); else switchProfile(p.id); };
  if (!p.name) { go(); return; }
  if (!identity.isEnrolled(p.name)) {
    identity.enroll(p.name, { onDone: () => { renderProfiles(); go(); } }); // 🔒 badge refresh
  } else if (identity.isTrusted(p.name)) {
    go();
  } else {
    identity.verify(p.name, { onOk: go });
  }
}

// Creates the local profile for a child and enters it. Used both by "new
// player" and by "connect to my account" on a device that has never seen
// them — in the latter case their progress then syncs down by first name.
function addLocalProfile(name, { grade, enroll = false } = {}) {
  const reg = loadRegistry();
  const existing = reg.list.find((p) => p.name === name);
  if (existing) { // already here: just switch to it
    if (existing.id === reg.current) closeWhoScreen(); else switchProfile(existing.id);
    return;
  }
  const id = reg.nextId || (Math.max(...reg.list.map((p) => p.id)) + 1);
  reg.nextId = id + 1;
  reg.list.push({ id, name, charIdx: 0 });
  reg.current = id;
  saveRegistry(reg);
  const seed = { name };
  if (grade !== undefined) seed.grade = grade;
  raw.set(profileKey(PROFILE_KEY, id), JSON.stringify(seed));
  world.saveEdits();
  edu.save();
  profileSync.push(true).catch(() => {}); // don't lose the outgoing child's state
  try { sessionStorage.setItem('wm-who-done', '1'); } catch { /* ignore */ }
  if (enroll) identity.enroll(name, { direct: true, onDone: () => location.reload() });
  else location.reload();
}

function renderProfiles() {
  const reg = loadRegistry();
  const row = document.getElementById('who-row');
  row.innerHTML = '';
  for (const p of reg.list) {
    const card = document.createElement('button');
    card.className = 'who-card' + (p.id === reg.current ? ' active' : '');
    const img = document.createElement('img');
    img.src = charPortraits[Math.min(Math.max(p.charIdx || 0, 0), charPortraits.length - 1)];
    img.alt = '';
    const name = document.createElement('span');
    name.className = 'who-name';
    name.textContent = p.name;
    card.append(img, name);
    if (p.name && identity.isEnrolled(p.name)) {
      const lock = document.createElement('span');
      lock.className = 'who-locked';
      lock.textContent = '🔒';
      lock.title = 'Compte sécurisé';
      card.appendChild(lock);
    }
    card.addEventListener('click', () => enterProfile(p, reg));
    { // toujours supprimable, y compris le dernier : plus de profil obligatoire
      const del = document.createElement('button');
      del.className = 'who-del';
      del.textContent = '✕';
      del.title = 'Supprimer ce joueur (code parental)';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ask = window.gameConfirm || ((m) => Promise.resolve(window.confirm(m)));
        if (!(await ask(`Supprimer le joueur ${p.name} et TOUTE sa progression ?`, '⚠️', 'Supprimer'))) return;
        const code = window.prompt('Code parental :');
        if (code !== '135246') {
          if (code !== null) window.alert('Code incorrect !');
          return;
        }
        const r2 = loadRegistry();
        r2.list = r2.list.filter((o) => o.id !== p.id);
        deleteProfileData(p.id);
        if (r2.current === p.id) {
          // plus personne : on repart sur un écran « Qui joue ? » vierge
          r2.current = r2.list.length ? r2.list[0].id : 0;
          saveRegistry(r2);
          location.reload();
          return;
        }
        saveRegistry(r2);
        renderProfiles();
      });
      card.appendChild(del);
    }
    row.appendChild(card);
  }
  const add = document.createElement('button');
  add.className = 'who-add';
  add.textContent = '➕ Nouveau joueur';
  add.addEventListener('click', () => {
    // name -> school grade -> face & code, then into the game
    identity.createAccount({
      grades: GRADES,
      onDone: ({ name, grade }) => addLocalProfile(name, { grade, enroll: true }),
    });
  });
  row.appendChild(add);
}

// Netflix-style flow: pick who's playing first, then reach the main menu.
const whoScreen = document.getElementById('who-screen');
function showWhoScreen() {
  renderProfiles();
  whoScreen.style.display = 'flex';
  document.getElementById('mode-row').style.display = 'none';
  onlineMenu.style.display = 'none';
  profileMenu.style.display = 'none';
}
function closeWhoScreen() {
  try { sessionStorage.setItem('wm-who-done', '1'); } catch { /* ignore */ }
  whoScreen.style.display = 'none';
  document.getElementById('mode-row').style.display = 'flex';
}
document.getElementById('switch-player-btn').addEventListener('click', showWhoScreen);

// "Reconnais-moi !": look at the camera, land straight in your own profile —
// works even on a device this child has never used, because the signatures
// travel with the name. Tapping a card by hand always stays available.
document.getElementById('face-login-btn').addEventListener('click', () => {
  const reg = loadRegistry();
  const named = reg.list.filter((p) => p.name);
  identity.recognize(named.map((p) => p.name), {
    onMatch: (who) => {
      const p = named.find((o) => o.name === who);
      // Reconnu mais inconnu de cet appareil : c'est un enfant qui arrive
      // depuis un autre appareil, on installe son profil et on va chercher
      // son contenu. Avant, on ne faisait rien du tout et l'écran restait figé.
      if (!p) return addLocalProfile(who);
      if (p.id === reg.current) closeWhoScreen();
      else switchProfile(p.id);
    },
  });
});

// "Me connecter à mon compte": for a device that has never seen this child.
// Their signature and code live in the cloud under their first name, so the
// camera alone is enough to find the account and bring it onto this device.
document.getElementById('account-login-btn').addEventListener('click', () => {
  identity.loginToAccount({ onMatch: (who) => addLocalProfile(who) });
});
// deferred: runs after the whole module evaluates, once charPortraits and
// the menu elements below are all initialized
queueMicrotask(() => {
  let whoDone = false;
  try { whoDone = !!sessionStorage.getItem('wm-who-done'); } catch { /* ignore */ }
  if (whoDone) renderProfiles();
  else showWhoScreen();
});
function myName() {
  return playerProfile.name || NET_CHARACTERS[selectedChar].name;
}

// worlds the device has already played in, for one-tap reopening
const WORLDS_KEY = 'web-minecraft-worlds-v1';
// Les mondes retirés, avec la date du geste. Sans cette trace, la liste des
// mondes était fusionnée avec celle du serveur par union — et une union ne sait
// pas représenter une absence voulue : le monde effacé revenait tout seul
// quelques secondes plus tard, sur cette tablette comme sur l'autre.
const WORLDS_DEL_KEY = 'web-minecraft-worlds-del-v1';
function loadWorlds() {
  try { return JSON.parse(localStorage.getItem(WORLDS_KEY) || '[]'); } catch { return []; }
}
function loadRetraits() {
  try { return JSON.parse(localStorage.getItem(WORLDS_DEL_KEY) || '{}'); } catch { return {}; }
}
function rememberWorld(code) {
  code = contexteCarte(code);
  const worlds = loadWorlds().filter((w) => w.code !== code);
  worlds.unshift({ code, t: Date.now() });
  try { localStorage.setItem(WORLDS_KEY, JSON.stringify(worlds.slice(0, 5))); } catch { /* ignore */ }
  // Y retourner, c'est le reprendre : la pierre tombale saute. C'est ce qui
  // permet à l'enfant de récupérer un monde retiré par erreur — il retape son
  // code, et tout revient.
  const retraits = loadRetraits();
  if (retraits[code] !== undefined) {
    delete retraits[code];
    try { localStorage.setItem(WORLDS_DEL_KEY, JSON.stringify(retraits)); } catch { /* ignore */ }
  }
}

// Retirer un monde : de la liste, de ses blocs, de sa position — et du profil
// en ligne, pour que l'autre tablette l'apprenne. Ce qui est partagé avec un
// ami, lui, reste : un enfant qui range sa liste n'efface pas le monde des
// autres, il s'en va. Retaper le code le ramène.
function oublierMonde(code) {
  const t = Date.now();
  // Si c'est le monde encore chargé en mémoire, on en sort d'abord : sinon la
  // sauvegarde suivante — ou le simple instantané envoyé au serveur, qui lit
  // le monde vivant et pas le stockage — le réécrirait aussitôt.
  if (world.ctx === code) world.switchContext('local');
  const retraits = loadRetraits();
  retraits[code] = t;
  try {
    localStorage.setItem(WORLDS_KEY, JSON.stringify(loadWorlds().filter((w) => w.code !== code)));
    localStorage.setItem(WORLDS_DEL_KEY, JSON.stringify(retraits));
    const blocs = JSON.parse(localStorage.getItem(World.STORAGE_KEY) || '{}');
    delete blocs[code];
    localStorage.setItem(World.STORAGE_KEY, JSON.stringify(blocs));
    const pos = JSON.parse(localStorage.getItem(POS_KEY) || '{}');
    delete pos[code];
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  } catch { /* le stockage est plein ou fermé : la liste reste, on n'aggrave pas */ }
  posRestored.delete(code);
  posAppliquee.delete(code);
  // Tout de suite au serveur : attendre le prochain battement, c'est laisser
  // à l'autre tablette une chance de republier le monde entre-temps.
  profileSync.push().catch(() => { /* le prochain battement s'en chargera */ });
}
function renderRecentWorlds() {
  const row = document.getElementById('recent-worlds');
  row.innerHTML = '';
  const worlds = [...new Map(loadWorlds().map(w=>[contexteCarte(w.code),{...w,code:contexteCarte(w.code)}])).values()];
  if (worlds.length === 0) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:13px;color:#8894b0;';
    hint.textContent = 'Aucun monde pour l\'instant — crée-en un juste en dessous !';
    row.appendChild(hint);
    return;
  }
  for (const w of worlds) {
    const roomCode = w.code;
    const chip = document.createElement('div');
    chip.className = 'world-chip';
    const btn = document.createElement('button');
    btn.className = 'world-btn';
    btn.textContent = `🌍 Monde ${roomCode}`;
    btn.addEventListener('click', () => openWorld(roomCode));
    const open = document.createElement('button');
    open.className = 'world-open';
    open.textContent = 'Jouer ➜';
    open.title = 'Entrer dans ce monde';
    open.addEventListener('click', () => openWorld(roomCode));
    const del = document.createElement('button');
    del.className = 'world-del';
    del.textContent = '✕';
    del.title = 'Retirer ce monde de la liste';
    del.addEventListener('click', async () => {
      const ask = window.gameConfirm || ((m) => Promise.resolve(window.confirm(m)));
      if (!(await ask(
        `Retirer le monde ${w.code} de ta liste ?\n\nCe que tu y as construit sera effacé de tes tablettes.`
        + ' Si un ami y joue encore, son monde à lui ne change pas — et tu peux revenir en retapant le code.',
        '🗑️', 'Retirer ✕',
      ))) return;
      oublierMonde(w.code);
      renderRecentWorlds();
    });
    chip.append(btn, open, del);
    row.appendChild(chip);
  }
}

// education recap straight from the main menu, with today's play time on
// the button itself
document.getElementById('edu-menu-btn').addEventListener('click', () => {
  edu.renderPanel();
  document.getElementById('edu-panel').style.display = 'block';
  pullPlayTime(); // refresh cross-device totals right away; re-renders if still open
});
// Le temps du jour vit dans son propre élément : mis dans le libellé, il
// faisait enfler le bouton et rompait l'alignement du menu.
function refreshEduMenuBtn() {
  const todayPlay = edu.today().play + (edu.otherDevicesPlaySeconds || 0);
  const el = document.getElementById('edu-today');
  if (el) el.textContent = `· ${edu.formatDuration(todayPlay)}`;
}
setInterval(refreshEduMenuBtn, 10000);
queueMicrotask(refreshEduMenuBtn); // after edu is constructed below

// --- partager le jeu ---------------------------------------------------------------
//
// Le carré à viser pour l'ami d'à côté, la feuille de partage du téléphone
// pour l'ami d'ailleurs. Le code QR n'est fabriqué qu'à la première ouverture
// — la bibliothèque qui le dessine ne se charge pas tant qu'on n'en a pas
// besoin.
const partagePanel = document.getElementById('partage-panel');
if (partagePanel) {
  const fermerPartage = () => partagePanel.classList.remove('on');
  document.getElementById('partage-btn').addEventListener('click', async () => {
    const lien = lienDuJeu();
    document.getElementById('partage-lien').textContent = lien;
    document.getElementById('partage-whatsapp').href = lienWhatsApp(lien);
    document.getElementById('partage-sms').href = lienSMS(lien);
    partagePanel.classList.add('on');
    try {
      await dessinerQR(document.getElementById('partage-qr'), lien);
    } catch {
      // Sans le carré, il reste le lien et les boutons : on n'ouvre pas un
      // panneau vide pour autant.
      document.getElementById('partage-qr').style.display = 'none';
    }
  });
  document.getElementById('partage-close').addEventListener('click', fermerPartage);
  partagePanel.addEventListener('click', (e) => { if (e.target === partagePanel) fermerPartage(); });
  document.getElementById('partage-envoyer').addEventListener('click', () => {
    partagerLien(lienDuJeu(), { toast: (m) => creatureManager.toast(m, 0x9fd8e8) });
  });
}

function nameSprite(text) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(text, 128, 42);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, 128, 42);
  const tex = new THREE.CanvasTexture(cv);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(1.6, 0.4, 1);
  sprite.position.y = 2.05;
  return sprite;
}

// --- arrivées et départs en multijoueur -------------------------------------
// Un joueur qui apparaît ou disparaît d'un coup passe inaperçu, surtout quand
// on regarde ailleurs. Une gerbe de lumière à l'arrivée et une disparition en
// spirale au départ rendent l'événement lisible depuis l'autre bout du monde.
const netFx = [];       // { mesh, vels, life, max, kind, spin }
const leaving = [];     // { mesh, life, max } — corps qui s'efface avant retrait

function fxParticles(pos, { color, count, up, spread }) {
  const geo = new THREE.BufferGeometry();
  const vels = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * spread;
    vels.push(new THREE.Vector3(Math.cos(a) * r, up * (0.4 + Math.random()), Math.sin(a) * r));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const mesh = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size: 0.28, transparent: true, opacity: 1, depthWrite: false,
  }));
  mesh.position.copy(pos);
  scene.add(mesh);
  return { mesh, vels };
}

function joinEffect(pos, name) {
  const p = fxParticles(pos, { color: 0x9fe8ff, count: 60, up: 5, spread: 3.2 });
  netFx.push({ ...p, life: 1.4, max: 1.4, kind: 'up' });
  // onde au sol, comme une téléportation qui se pose
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.5, 28),
    new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, pos.y - 0.9, pos.z);
  scene.add(ring);
  netFx.push({ mesh: ring, life: 1, max: 1, kind: 'ring' });
  // pas de message ici : net.js annonce déjà l'arrivée et le départ, deux
  // bulles pour le même événement se marcheraient dessus
}

function leaveEffect(mesh, name) {
  const pos = mesh.position.clone();
  const p = fxParticles(pos, { color: 0xffd27f, count: 40, up: 3, spread: 1.6 });
  netFx.push({ ...p, life: 1.1, max: 1.1, kind: 'up' });
  leaving.push({ mesh, life: 0.7, max: 0.7 });
}

function updateNetFx(dt) {
  for (const f of [...netFx]) {
    f.life -= dt;
    const k = Math.max(0, f.life / f.max);
    if (f.life <= 0) {
      scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mesh.material.dispose();
      netFx.splice(netFx.indexOf(f), 1);
      continue;
    }
    f.mesh.material.opacity = k;
    if (f.kind === 'ring') {
      const s = 1 + (1 - k) * 9;
      f.mesh.scale.set(s, s, 1);
    } else {
      const arr = f.mesh.geometry.attributes.position;
      for (let i = 0; i < f.vels.length; i++) {
        const v = f.vels[i];
        arr.array[i * 3] += v.x * dt;
        arr.array[i * 3 + 1] += v.y * dt;
        arr.array[i * 3 + 2] += v.z * dt;
        v.y -= 6 * dt; // retombée
      }
      arr.needsUpdate = true;
    }
  }
  // le corps rétrécit en tournant avant d'être retiré pour de bon
  for (const l of [...leaving]) {
    l.life -= dt;
    if (l.life <= 0) {
      // CE QU'ON RETIRE SE REND (v238). Le corps d'un ami qui s'en va porte ses
      // onze géométries en propre ; ses matériaux, eux, sont ceux de tout le
      // monde et `liberer` les épargne — voir `liberer.js`.
      scene.remove(l.mesh);
      liberer(l.mesh);
      leaving.splice(leaving.indexOf(l), 1);
      continue;
    }
    const k = l.life / l.max;
    l.mesh.scale.setScalar(Math.max(0.01, k));
    l.mesh.rotation.y += dt * 12;
    l.mesh.position.y += dt * 1.5;
  }
}

function syncRemotePlayers(list) {
  const seen = new Set();
  for (const p of list) {
    seen.add(p.id);
    let rp = remotePlayers.get(p.id);
    if (!rp) {
      const base = (NET_CHARACTERS[p.lookIdx] || NET_CHARACTERS[0]).look;
      // p.look carries the other player's own skin/hair, so they look like
      // themselves on our screen too
      const mesh = buildKidMesh(withOwnLook(base, p.look || {}));
      mesh.add(nameSprite(p.name));
      scene.add(mesh);
      rp = { mesh, target: null, yaw: 0, moving: false, animTime: 0, name: p.name, pop: 0.5,
        pos: new THREE.Vector3(), cap: 0, vehicule: null, passager: null };
      remotePlayers.set(p.id, rp);
      if (p.pos) { mesh.position.set(p.pos.x, p.pos.y, p.pos.z); rp.pos.set(p.pos.x, p.pos.y, p.pos.z); }
      mesh.scale.setScalar(0.01); // grandit depuis rien, cf. updateRemotePlayers
      joinEffect(mesh.position, p.name || 'Un ami');
    }
    if (p.pos) rp.target = p.pos;
    rp.yaw = p.yaw || 0;
    rp.moving = p.moving;
    synchroniserVehiculeDistant(rp, p.v || null);
    rp.passager = p.p || null;
  }
  for (const [id, rp] of remotePlayers) {
    if (!seen.has(id)) {
      // on ne retire pas tout de suite : leaveEffect fait disparaître le corps
      poserDebout(rp);
      synchroniserVehiculeDistant(rp, null);
      leaveEffect(rp.mesh, rp.name || 'Un ami');
      remotePlayers.delete(id);
    }
  }
}

// L'AMI AU VOLANT EST VU DANS SA VOITURE (v253). La position d'un joueur
// emporte désormais son véhicule (`v` : espèce, modèle de flotte) ; on le
// dessine avec la MÊME fabrique que la monture locale (`MODELES_MONTURE`),
// on l'assied dedans comme l'avatar de l'enfant (`asseoir`, siège de la
// fiche), et quand il descend on le remet debout à côté.
function synchroniserVehiculeDistant(rp, v) {
  const cle = v ? `${v.k}|${v.f || ''}` : '';
  if ((rp.vehicule ? rp.vehicule.cle : '') === cle) return;
  if (rp.vehicule) {
    poserDebout(rp);
    scene.remove(rp.vehicule.mesh);
    liberer(rp.vehicule.mesh);
    rp.vehicule = null;
  }
  if (!v) return;
  const fabrique = MODELES_MONTURE[v.k];
  const def = MONTURES.find((d) => d.key === v.k);
  if (!fabrique || !def || !def.siege) return;
  const mesh = fabrique(v.f ? { flotte: v.f } : undefined);
  mesh.position.copy(rp.pos);
  scene.add(mesh);
  rp.vehicule = { cle, mesh, def };
}
// L'avatar d'un ami revient dans la scène, debout, à sa taille : c'est ce
// qu'on fait quand il descend, quand son véhicule disparaît, quand il part.
function poserDebout(rp) {
  if (rp.mesh.parent && rp.mesh.parent !== scene) {
    scene.add(rp.mesh);
    rp.mesh.position.copy(rp.pos);
    rp.mesh.scale.setScalar(1);
    rp.mesh.rotation.set(0, rp.yaw + Math.PI, 0);
  }
}
// Le véhicule dans lequel un joueur (distant) est passager : celui d'un
// autre ami, ou le nôtre si c'est chez nous qu'il est monté.
function vehiculeDuConducteur(de) {
  const monId = net && net.peer ? net.peer.id : null;
  if (monId && de === monId) {
    const a = fun.montureConduite ? fun.montureConduite() : null;
    // la monture ELLE-MÊME, pas une copie : le cache du plafond vit dessus
    return a && a.def && a.def.sieges ? a : null;
  }
  const rp = remotePlayers.get(de);
  return rp && rp.vehicule ? rp.vehicule : null;
}

function updateRemotePlayers(dt) {
  updateNetFx(dt);
  for (const rp of remotePlayers.values()) {
    // apparition : le personnage grandit jusqu'à sa taille normale, avec un
    // léger dépassement pour que l'arrivée ait du ressort
    if (rp.pop > 0) {
      rp.pop = Math.max(0, rp.pop - dt);
      const k = 1 - rp.pop / 0.5;
      rp.mesh.scale.setScalar(Math.max(0.01, k < 1 ? k * (1.25 - 0.25 * k) : 1));
      if (rp.pop === 0) rp.mesh.scale.setScalar(1);
    }
    // La position VRAIE vit dans `rp.pos` (v253) : le maillage, lui, peut
    // être assis dans un véhicule, en coordonnées du siège.
    if (rp.target) {
      const t = Math.min(1, dt * 10);
      rp.pos.x += (rp.target.x - rp.pos.x) * t;
      rp.pos.y += (rp.target.y - rp.pos.y) * t;
      rp.pos.z += (rp.target.z - rp.pos.z) * t;
    }
    let dy = rp.yaw - rp.cap;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    rp.cap += dy * Math.min(1, dt * 10);
    rp.animTime += dt;
    if (rp.vehicule) {
      // au volant : la voiture suit la position, le cap suit le regard
      // (comme `updateRide`, fun.js : rotation.y = yaw), l'ami est assis
      const vm = rp.vehicule.mesh;
      vm.position.copy(rp.pos);
      vm.rotation.y = rp.cap;
      asseoir(rp.mesh, rp.vehicule, rp.vehicule.def.siege, rp.animTime);
      continue;
    }
    const chez = rp.passager ? vehiculeDuConducteur(rp.passager.de) : null;
    if (chez) {
      const sieges = chez.def.sieges || [];
      asseoir(rp.mesh, chez, sieges[Math.min(rp.passager.s || 0, sieges.length - 1)] || chez.def.siege, rp.animTime);
      continue;
    }
    poserDebout(rp);
    rp.mesh.position.copy(rp.pos);
    rp.mesh.rotation.y = rp.cap + Math.PI;
    const swing = rp.moving ? Math.sin(rp.animTime * 9) * 0.6 : 0;
    rp.mesh.userData.legs.forEach((leg, i) => { leg.rotation.x = i % 2 ? -swing : swing; });
    rp.mesh.userData.arms.forEach((arm, i) => { arm.rotation.x = i % 2 ? swing * 0.7 : -swing * 0.7; });
    animerHumain(rp.mesh, rp.animTime, rp.moving ? 1.6 : 0);
  }
}

// LES PAGES DU MÊME APPAREIL SE PARLENT DIRECTEMENT.
//
// Le fantôme qui barrait la route à l'enfant vivait dans une autre page du
// même téléphone — l'application laissée en arrière-plan. Deux pages d'un même
// site peuvent se parler sans aucun réseau, instantanément. On s'en sert pour
// que ce fantôme ne puisse plus exister : celui qui ouvre une partie annonce
// son prénom, et toute autre page du même appareil ouverte sous ce prénom
// referme la sienne.
//
// Cela ne répare pas le passé — une page d'une ancienne version n'écoute pas —
// mais à partir d'ici la situation ne peut plus se reproduire, et sans
// dépendre du réseau ni d'un serveur.
const CANAL_PAGES = (() => {
  try { return new BroadcastChannel('web-minecraft-sessions'); } catch { return null; }
})();

if (CANAL_PAGES) {
  CANAL_PAGES.addEventListener('message', (e) => {
    const m = e.data || {};
    if (m.t !== 'jouvre' || !net || !net.active) return;
    if (m.nom !== playerProfile.name) return;   // un autre enfant : rien à voir
    // Une autre page de cet appareil vient d'ouvrir une partie sous notre
    // prénom. La vivante est la plus récente : on s'efface, sans un mot.
    leaveToMainMenu();
  });
}

function annoncerOuverture() {
  if (!CANAL_PAGES) return;
  try { CANAL_PAGES.postMessage({ t: 'jouvre', nom: playerProfile.name }); }
  catch { /* le canal n'existe pas partout, ce n'est pas grave */ }
}

function startNetSession(code, isHost, patience) {
  // On prévient les autres pages de cet appareil AVANT d'ouvrir : elles ont
  // ainsi le temps de lâcher l'identifiant du monde.
  annoncerOuverture();
  net = new NetSession({
    world,
    // Le nuage sert de tuyau de secours quand le pair-à-pair est bloqué :
    // c'est ce qui fait qu'un Wi-Fi d'hôtel n'interdit plus de jouer ensemble.
    cloud,
    toast: (msg, color) => creatureManager.toast(msg, color),
    onPlayers: (list) => { syncRemotePlayers(list); updatePlayersBtn(); },
    onState: () => updatePlayersBtn(),
  });
  // L'appareil, pour que l'hôte sache reconnaître son propre fantôme d'une
  // session précédente — et lui céder la place au lieu de l'accuser.
  net.deviceId = deviceId;
  // Notre reflet nous rend la main : on rouvre le monde sans un mot. Pour
  // l'enfant, il a simplement rejoint sa partie.
  net.onCeder = () => { leaveToMainMenu(); };
  net.getPos = () => {
    const p = {
      x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw,
      moving: Math.abs(player.vel.x) + Math.abs(player.vel.z) > 0.5,
    };
    // AU VOLANT, LA POSITION EMPORTE LE VÉHICULE (v253) : sans cela l'ami
    // était vu à pied, glissant à toute vitesse (Max). Le modèle de flotte
    // voyage aussi, pour que ce soit SA voiture qu'on voit.
    const a = fun.montureConduite ? fun.montureConduite() : null;
    if (a && a.def && a.def.siege) p.v = { k: a.def.key, f: (a.mesh && a.mesh.userData && a.mesh.userData.flotte) || null };
    const pa = fun.passagerDe ? fun.passagerDe() : null;
    if (pa) p.p = { de: pa.de, s: pa.s };
    return p;
  };
  world.onOp = (k, id, ts) => { if (net && net.active) net.sendOp(k, id, ts); };
  // Le réseau raconte ce qui lui arrive ; le bandeau le montre.
  net.onLink = (etat, detail) => {
    const CLES = ['monde-reco', 'signal', 'monde-perdu'];
    const revenait = CLES.some((k) => alertes.has(k));
    alerte('monde-reco', etat === 'reconnexion', detail);
    alerte('signal', etat === 'signal', detail);
    alerte('monde-perdu', etat === 'perdu', detail);
    if (etat === 'ok' && revenait) bonneNouvelle('✅ Reconnecté au monde !');
    // Le secours a fonctionné : on le dit joyeusement plutôt que comme une
    // panne. Pour l'enfant, la seule chose qui compte est qu'il joue.
    if (etat === 'nuage') bonneNouvelle('☁️ Connecté par le nuage — ça marche même sur ce Wi-Fi !');
  };
  // Avant même la première poignée de main : à la connexion, les deux côtés
  // s'échangent tout leur journal de blocs. Sur l'ancien code, c'était donc
  // la maison locale de l'hôte qui partait dans le monde partagé.
  world.switchContext(code.toUpperCase());
  return net.start(code, isHost,
    { name: myName(), lookIdx: selectedChar, look: playerProfile.look }, patience);
}

// Reprendre pied dans un monde dont on vient de perdre la main, sans quitter
// la partie ni rien redemander à l'enfant : on rejoint celui qui l'héberge
// maintenant. Si personne ne le tient au bout de quelques essais, c'est qu'il
// est de nouveau libre — on le rouvre nous-mêmes.
// `motif` : ce qu'on montre à l'enfant pendant qu'on s'obstine. Reprendre son
// monde à un fantôme et se reconnecter après une coupure sont deux histoires
// différentes ; les dire de la même façon laissait l'enfant devant un message
// qui ne correspondait pas à ce qu'il venait de vivre.
async function reprendreLeMonde(code, essai = 0, motif = null) {
  if (net) { try { net.stop(); } catch { /* déjà arrêté */ } net = null; }
  syncRemotePlayers([]);
  try {
    // On rejoint un monde dont on sait qu'il existait il y a un instant : la
    // même patience qu'ailleurs, sinon un réseau lent renonce avant d'aboutir.
    await startNetSession(code, essai >= 3, PATIENCE_RELAIS);
    alerte('monde-reco', false);
    bonneNouvelle(essai >= 3 ? '✅ Monde rouvert !' : '✅ Monde rejoint !');
  } catch {
    if (net) { try { net.stop(); } catch { /* déjà arrêté */ } net = null; }
    alerte('monde-reco', true, motif || `Reconnexion au monde ${code}…`);
    setTimeout(() => reprendreLeMonde(code, essai + 1, motif), 4000);
  }
}

// Le temps qu'on accorde au canal quand on sait déjà que le monde est tenu.
// Vingt secondes : c'est long à regarder, mais c'est la durée réelle d'une
// poignée de main relayée en TCP derrière un VPN — et renoncer avant, c'est
// refuser une partie qui allait aboutir.
const PATIENCE_RELAIS = 20000;

// Opens a world by code: joins whoever is already there, or becomes the
// host and plays solo if the world is empty. Either way the cloud copy is
// pulled first so nothing is ever lost.
async function openWorld(code) {
  if (!navigator.onLine) {
    onlineStatus.textContent = '❌ Pas de connexion internet — le mode en ligne en a besoin.';
    return;
  }
  onlineStatus.textContent = `Ouverture du monde ${code}…`;

  // Ouvrir un monde doit marcher. Point.
  //
  // L'ancienne version ne se rabattait sur l'ouverture que pour UNE raison
  // d'échec bien précise — « partie introuvable ». Tous les autres cas
  // laissaient l'enfant devant un refus, y compris quand le canal ne s'ouvrait
  // pas alors que personne n'était en face : il voyait « le monde existe mais
  // le réseau bloque la connexion » sur son propre monde vide, sur du Wi-Fi
  // comme sur de la 5G, et n'avait aucun moyen d'entrer. Le message était
  // doublement fautif — il affirmait que le monde existait, ce que le code ne
  // sait pas, et il accusait un réseau qui n'y était pour rien.
  //
  // On procède donc par échelons, et on ne s'arrête qu'une fois dedans :
  // rejoindre, sinon ouvrir soi-même, sinon rejoindre à nouveau — ce dernier
  // cas étant celui où quelqu'un a pris la place entre nos deux tentatives.
  const essayer = async (hote, patience) => {
    try { await startNetSession(code, hote, patience); return null; }
    catch (e) { if (net) { try { net.stop(); } catch { /* déjà arrêté */ } net = null; } return e; }
  };

  let ouvertVide = false;
  let err = await essayer(false);
  // Un serveur de rendez-vous muet ne se soigne pas en changeant de rôle : la
  // première tentative a déjà prouvé qu'il ne répond pas, et retenter en hôte
  // ne faisait qu'ajouter neuf secondes d'attente avant le même message. Sur
  // un portail captif d'hôtel, l'enfant patientait quarante secondes devant
  // « Ouverture du monde… » pour finir sur un refus.
  // `tenu` : le phare de l'hôte brillait il y a moins de deux minutes.
  // Quelqu'un tient ce monde par le nuage — l'ouvrir à notre tour créerait un
  // SECOND monde sous le même code, et chacun bâtirait dans sa copie sans
  // jamais voir l'autre. C'est la pire panne possible : silencieuse,
  // divergente, irréconciliable. On ne retente donc l'ouverture que pour un
  // monde dont personne ne s'est réclamé.
  if (err && !err.signal && !err.tenu) {
    err = await essayer(true);
    ouvertVide = !err;
  }
  if (err && /déjà utilisé/i.test(err.message)) {
    // Ici on en sait beaucoup plus qu'au premier essai : le code est pris,
    // donc quelqu'un tient ce monde, maintenant, sur le serveur de rendez-vous.
    // La question n'est plus « y a-t-il un monde ? » mais « arrive-t-on à
    // l'atteindre ? » — et cela mérite qu'on attende pour de bon. Derrière un
    // VPN, le trafic passe par le relais en TCP sur le port 443 et la poignée
    // de main dépasse couramment les cinq secondes du premier essai.
    err = await essayer(false, PATIENCE_RELAIS);
    ouvertVide = false;
    // Et si l'on n'y arrive toujours pas, on dit ce qui est vrai. « Personne
    // n'a répondu dans ce monde » était doublement faux : quelqu'un est là,
    // c'est établi, et l'enfant n'avait aucune idée de quoi faire. La cause
    // de loin la plus fréquente à la maison est un VPN resté allumé.
    if (err && err.canal && !err.personne) {
      // Deux pannes, deux conseils. Quand aucun relais n'a répondu, le réseau
      // lui-même barre la route — hôtel, école, gare, café : couper un VPN
      // n'y changera rien, il faut sortir de ce Wi-Fi. Quand un relais a bien
      // répondu mais que le lien n'aboutit pas, la cause la plus fréquente à
      // la maison reste le VPN resté allumé. Et quand le NUAGE nous a parlé,
      // ni l'un ni l'autre : le réseau est sain, c'est l'hôte qui se tait —
      // ce cas-là est composé plus bas, pour tous les chemins à la fois.
      err = new Error(err.reseauFerme
        ? `Le monde ${code} existe, mais ce Wi-Fi bloque le jeu à plusieurs. `
          + 'C\'est fréquent dans les hôtels, les écoles et les gares. '
          + 'Essaie le partage de connexion d\'un téléphone, ou un autre Wi-Fi. '
          + '(Un VPN allumé fait pareil.)'
        : `Le monde ${code} existe, mais ta tablette n'arrive pas à le joindre. `
          + 'Un VPN ou un réseau protégé bloque souvent le jeu à plusieurs — demande à un parent de le couper.');
    }
  }
  // Quand le relais nous a parlé mais que personne n'a répondu, le réseau est
  // hors de cause — on vient d'en faire la preuve. Le message d'avant accusait
  // le Wi-Fi de la maison, plein écran, et le seul conseil qu'il donnait était
  // faux. La vérité est plus simple et plus utile : le monde est là, l'hôte ne
  // répond pas en ce moment, réessaie.
  if (err && err.personne) {
    err = new Error(`Le monde ${code} est bien là, mais personne n'y répond à l'instant `
      + '— l\'application est peut-être fermée ou endormie en face. '
      + 'Réessaie dans un petit moment.');
  }
  if (err) {
    onlineStatus.textContent = '❌ ' + err.message;
    world.switchContext('local');
    return;
  }
  if (ouvertVide) {
    grandBandeau('🚪 MONDE OUVERT !', `Personne n'est encore là. Donne le code ${code} à ton ami·e !`, 5200);
  }
  rememberWorld(code);
  cloud.attach(contexteCarte(code));
  onlineStatus.textContent = '';
  onlineMenu.style.display = 'none';
  showOnlineUI();
  posCtx = contexteCarte(code);
  restorePosition();
  startGame();
}

// online menu wiring
const onlineMenu = document.getElementById('online-menu');
const onlineStatus = document.getElementById('online-status');
const roomCodeBox = document.getElementById('room-code-box');
const charRow = document.getElementById('char-row');
selectedChar = Math.min(Math.max(playerProfile.charIdx || 0, 0), NET_CHARACTERS.length - 1);

// The skin/hair sampled from a child's enrolment photo is layered over
// whichever character they picked, so it looks like them without taking
// away the choice of outfit.
function withOwnLook(base, override) {
  const o = override || playerProfile.look;
  if (!o) return base;
  const out = { ...base };
  if (o.skin !== undefined) out.skin = o.skin;
  if (o.hair !== undefined) out.hair = o.hair;
  return out;
}

// Render each character look to a little 3D portrait for the picker.
function makeCharPortraits() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(96, 128);
  const cam2 = new THREE.PerspectiveCamera(38, 96 / 128, 0.1, 10);
  cam2.position.set(0.55, 1.35, -2.3);
  cam2.lookAt(0, 0.85, 0);
  const urls = NET_CHARACTERS.map((c) => {
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xffffff,0x556071,2.2));
    const key = new THREE.DirectionalLight(0xffeddb,2);key.position.set(-2,3,-3);sc.add(key);
    const mesh = buildKidMesh(withOwnLook(c.look));
    mesh.rotation.y = -0.35; // three-quarter pose
    sc.add(mesh);
    r.render(sc, cam2);
    const image = r.domElement.toDataURL();
    liberer(mesh);
    return image;
  });
  r.dispose();
  r.forceContextLoss();
  return urls;
}

let charPortraits = makeCharPortraits();

// Re-renders the portraits after the avatar takes on the child's colours.
function refreshCharPortraits() {
  charPortraits = makeCharPortraits();
  [...charRow.children].forEach((btn, i) => {
    const img = btn.querySelector('img');
    if (img && charPortraits[i]) img.src = charPortraits[i];
  });
  renderProfiles();
}

NET_CHARACTERS.forEach((c, i) => {
  const btn = document.createElement('button');
  btn.className = 'char-btn' + (i === selectedChar ? ' active' : '');
  btn.innerHTML = `<img src="${charPortraits[i]}" alt="${c.name}"><span>${c.emoji} ${c.name}</span>`;
  btn.addEventListener('click', () => {
    selectedChar = i;
    playerProfile.charIdx = i;
    saveProfile();
    [...charRow.children].forEach((b, j) => b.classList.toggle('active', j === i));
  });
  charRow.appendChild(btn);
});

function showOnlineUI() {
  updatePlayersBtn();
  camBtn.style.display = 'block';
  chatBtn.style.display = 'block';
  net.onRemoteVideo = (id, stream) => addRemoteTile(id, stream);
  net.onRemoteVideoClosed = (id) => removeRemoteTile(id);
  net.onPhoto = (id, img, nom) => addPhotoTile(id, img, nom);
  net.onPhotoFin = (id) => removePhotoTile(id);
  net.onCamChange = () => majVisio();
  net.onChat = (name, msg) => {
    addChatMsg(name, msg, false);
    chatDing();
    if (chatPanel.style.display !== 'block') {
      creatureManager.toast(`💬 ${name} : ${msg}`, 0x9fd8e8);
      setUnread(unread + 1);
    }
    // Un message qui arrive pendant qu'on est ailleurs mérite le système : le
    // bandeau du jeu, personne ne le voit quand le jeu n'est pas à l'écran.
    if (document.visibilityState !== 'visible') {
      notifierSysteme(`💬 ${name}`, msg, 'wm-chat');
    }
  };
  net.onAnnonce = (txt) => creatureManager.toast(txt, 0x9fd8e8);
  net.onCiel = (c) => adopterCiel(c);
  net.donnerCiel = () => cielDuMonde();
  net.onJoin = (nom) => annonceArrivee(nom);
  net.onLeave = (nom) => creatureManager.toast(`👋 ${nom} est parti·e`, 0xcccccc);
  // ON NE RENVOIE PLUS L'ENFANT AU MENU AVEC UNE ACCUSATION.
  //
  // Ce message vient d'un hôte qui porte notre prénom. Le jeu ne l'envoie plus
  // jamais depuis la v153 : s'il arrive encore, il vient d'une session
  // ANCIENNE — la nôtre, restée accrochée en arrière-plan, qui tourne un code
  // d'avant le correctif et ne sait pas céder la place.
  //
  // C'est précisément pourquoi le correctif précédent ne suffisait pas : il
  // demandait au fantôme de se comporter mieux, or le fantôme est par
  // définition l'ancienne version. Le seul côté toujours à jour est celui qui
  // ARRIVE — c'est donc ici que la panne doit être traitée, et nulle part
  // ailleurs.
  //
  // On reprend donc le monde en hôte, obstinément, en le disant. Dès que la
  // vieille session lâche l'identifiant — elle finit toujours par le lâcher —
  // l'enfant retrouve sa partie. Sans boîte d'alerte, et sans cul-de-sac.
  net.onDuplicate = () => {
    const code = net && net.code;
    if (!code) { leaveToMainMenu(); return; }
    const motif = `On reprend ton monde ${code}…`;
    alerte('monde-reco', true, motif);
    reprendreLeMonde(code, 3, motif);   // 3 : on rouvre en hôte, on ne rejoint plus
  };
  // Cet appareil vient de céder la place à un autre au même prénom — le plus
  // souvent le sien, revenu après une coupure. Ce n'est pas une faute : on le
  // dit d'un ton neutre, sans la boîte d'alerte qui fait peur.
  net.onRemplace = (name) => {
    leaveToMainMenu();
    creatureManager.toast(`🔄 ${name} a repris la partie depuis un autre appareil.`, 0x9fd8e8);
  };
  // On hébergeait, et le code nous a été repris pendant une coupure : l'autre
  // enfant tient désormais le monde. On le rejoint au lieu de rester chacun
  // dans sa bulle — sans quoi les deux jouent seuls sous le même code.
  net.onCodePris = (c) => { reprendreLeMonde(c); };
  fun.attachNet(net); // duels, émotes, panneaux reçus
}

// Leaves any session (local or online) and restores the full main menu.
// Used by the home button and by the duplicate-player guard.
function leaveToMainMenu() {
  savePosition(); // remember exactly where we were in this world
  if (net) { net.stop(); net = null; }
  for (const k of ['monde-reco', 'signal', 'monde-perdu', 'monde-seul']) alerte(k, false);
  cloud.detach();
  syncRemotePlayers([]); // remove remote avatars
  for (const id of [...remoteTiles.keys()]) removeRemoteTile(id);
  removeLocalTile();
  camBtn.style.display = 'none'; camBtn.textContent = '📷'; camBtn.classList.remove('on');
  viderLaVisio();
  playersBtn.style.display = 'none';
  chatBtn.style.display = 'none';
  chatPanel.style.display = 'none';
  setUnread(0); // en quittant le monde, la pastille n'a plus lieu d'être
  world.saveEdits();
  savePosition();
  world.switchContext('local');
  profileSync.push().catch(() => {});
  fun.onLeave();
  montrerReprise(false);   // il n'y a plus de partie où revenir
  if (document.exitPointerLock) document.exitPointerLock();
  pauseGame();
  // restore the full main menu, not the pause screen
  document.getElementById('overlay-title').textContent = 'WEB MINECRAFT';
  onlineMenu.style.display = 'none';
  roomCodeBox.style.display = 'none';
  document.getElementById('online-actions').style.display = 'flex';
  document.getElementById('mode-row').style.display = 'flex';
  onlineStatus.textContent = '';
}

document.getElementById('home-btn').addEventListener('click', () => {
  if (edu.quizActive || edu.hardStopActive) return;
  leaveToMainMenu();
});

// Local play is fully offline (PWA); online play needs a live connection.
const offlineNote = document.getElementById('offline-note');
function updateOnlineAvailability() {
  const online = navigator.onLine;
  document.getElementById('online-btn').classList.toggle('offline', !online);
  offlineNote.style.display = online ? 'none' : 'block';
}
window.addEventListener('online', updateOnlineAvailability);
window.addEventListener('offline', updateOnlineAvailability);
updateOnlineAvailability();

document.getElementById('online-btn').addEventListener('click', () => {
  if (!navigator.onLine) {
    offlineNote.textContent = '🌐 Pas de connexion internet — joue en local en attendant !';
    offlineNote.style.display = 'block';
    return;
  }
  renderRecentWorlds();
  onlineMenu.style.display = 'flex';
  document.getElementById('mode-row').style.display = 'none';
});
document.getElementById('online-back').addEventListener('click', () => {
  if (net) { net.stop(); net = null; }
  for (const k of ['monde-reco', 'signal', 'monde-perdu', 'monde-seul']) alerte(k, false);
  cloud.detach();
  onlineMenu.style.display = 'none';
  roomCodeBox.style.display = 'none';
  document.getElementById('online-actions').style.display = 'flex';
  document.getElementById('mode-row').style.display = 'flex';
  onlineStatus.textContent = '';
});
document.getElementById('host-btn').addEventListener('click', async () => {
  if (!navigator.onLine) {
    onlineStatus.textContent = '❌ Pas de connexion internet — le mode en ligne en a besoin.';
    return;
  }
  onlineStatus.textContent = 'Création de la partie…';
  try {
    const code = await startNetSession(randomCode(), true);
    onlineStatus.textContent = '';
    document.getElementById('online-actions').style.display = 'none';
    document.getElementById('room-code').textContent = code;
    roomCodeBox.style.display = 'flex';
  } catch (err) {
    onlineStatus.textContent = '❌ ' + err.message;
    if (net) { net.stop(); net = null; }
  }
});
document.getElementById('online-play-btn').addEventListener('click', () => {
  // Le bouton reste dans la page même quand le monde n'est pas ouvert : sans
  // ce garde-fou, un appui de trop levait une exception et laissait l'enfant
  // devant un menu qui ne répondait plus.
  if (!net || !net.active) return;
  rememberWorld(net.code);
  cloud.attach(contexteCarte(net.code));
  onlineMenu.style.display = 'none';
  showOnlineUI();
  posCtx = contexteCarte(net.code);
  restorePosition();
  startGame();
});
document.getElementById('join-btn').addEventListener('click', () => {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if (code.length < 4) { onlineStatus.textContent = 'Écris le code du monde !'; return; }
  openWorld(code);
});
document.getElementById('join-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('join-btn').click();
  e.stopPropagation();
});

// --- world chat: minimalist panel, messages persist in the database ----------------

const chatBtn = document.getElementById('chat-btn');
const chatPanel = document.getElementById('chat-panel');
const chatMsgs = document.getElementById('chat-msgs');
const chatInput = document.getElementById('chat-input');
const chatBadge = document.getElementById('chat-badge');

// Petit « ding » à l'arrivée d'un message : deux notes synthétisées à la
// volée plutôt qu'un fichier à télécharger. Le contexte audio se crée au
// premier besoin — les navigateurs mobiles refusent le son tant que l'enfant
// n'a rien touché, et il a forcément touché l'écran pour jouer.
let audioCtx = null;
function carillon(notes = [880, 1320]) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    for (const [i, freq] of notes.entries()) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t0 + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    }
  } catch { /* pas de son : la pastille suffit à prévenir */ }
}
const chatDing = () => carillon([880, 1320]);

// Casser et poser sont les gestes les plus répétés de la partie : leur son doit
// être court, discret et jamais fatigant. Un coup mat qui descend pour la
// casse, un petit clic qui monte pour la pose.
function bruitBloc(f0, f1, duree, type, volume) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(f1, t0 + duree);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + duree + 0.02);
  } catch { /* pas de son : les éclats suffisent au retour */ }
}
const bruitCasse = () => bruitBloc(190, 70, 0.13, 'triangle', 0.08);
const bruitPose = () => bruitBloc(420, 700, 0.07, 'square', 0.05);
// le choc des épées, pendant l'assaut du château
const cliquetis = () => { bruitBloc(1400, 620, 0.09, 'square', 0.05); bruitBloc(900, 380, 0.14, 'triangle', 0.04); };

// Messages non lus. La bulle passe et disparaît ; s'il regardait ailleurs,
// l'enfant ne saura jamais qu'on lui a écrit. La pastille, elle, reste.
let unread = 0;
function setUnread(n) {
  unread = Math.max(0, n);
  const show = unread > 0 && chatBtn.style.display === 'block';
  chatBadge.style.display = show ? 'block' : 'none';
  chatBadge.textContent = unread > 9 ? '9+' : String(unread);
  chatBtn.classList.toggle('unread', show);
  if (show) { // relance l'apparition pour que chaque message se remarque
    chatBadge.style.animation = 'none';
    void chatBadge.offsetWidth;
    chatBadge.style.animation = '';
  }
}

function addChatMsg(name, msg, mine) {
  chatMsgs.querySelector('[data-info]')?.remove(); // drop the placeholder
  const div = document.createElement('div');
  div.className = 'chat-msg' + (mine ? ' mine' : '');
  const b = document.createElement('b');
  b.textContent = `${name} : `;
  div.append(b, document.createTextNode(msg));
  chatMsgs.appendChild(div);
  while (chatMsgs.children.length > 80) chatMsgs.firstChild.remove();
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

async function openChat() {
  chatPanel.style.display = 'block';
  setUnread(0); // lus, puisqu'il les a sous les yeux
  chatMsgs.innerHTML = '<div class="chat-msg" data-info="1" style="color:#667">Chargement…</div>';
  try {
    const hist = await cloud.chatHistory();
    chatMsgs.innerHTML = '';
    for (const m of hist) addChatMsg(m.name, m.msg, m.name === myName());
    if (hist.length === 0) {
      chatMsgs.innerHTML = '<div class="chat-msg" data-info="1" style="color:#667">Aucun message — écris le premier !</div>';
    }
  } catch {
    chatMsgs.innerHTML = '<div class="chat-msg" data-info="1" style="color:#667">Messages indisponibles pour le moment</div>';
  }
}

chatBtn.addEventListener('click', () => {
  if (chatPanel.style.display === 'block') { fermerChat(); return; }
  openChat();
});

function fermerChat() {
  chatPanel.style.display = 'none';
  chatInput.blur(); // sinon le clavier reste ouvert par-dessus le jeu
}
document.getElementById('chat-close').addEventListener('click', fermerChat);

function sendChatMsg() {
  const msg = chatInput.value.trim().slice(0, 120);
  if (!msg || !net || !net.active) return;
  chatInput.value = '';
  addChatMsg(myName(), msg, true);
  net.sendChat(myName(), msg);
  cloud.chatSend(myName(), msg).catch(() => {});
}
document.getElementById('chat-send').addEventListener('click', sendChatMsg);
chatInput.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') sendChatMsg();
});

// --- mini FaceTime -----------------------------------------------------------------

const camBtn = document.getElementById('cam-btn');
const videoWrap = document.getElementById('video-wrap');
const remoteTiles = new Map(); // peerId -> { video, label }
let localTile = null;

function addLocalTile(stream) {
  if (localTile) return;
  localTile = document.createElement('video');
  localTile.className = 'local';
  localTile.muted = true;
  localTile.autoplay = true;
  localTile.setAttribute('playsinline', '');
  localTile.srcObject = stream;
  videoWrap.appendChild(localTile);
  localTile.play().catch(() => {});
}

function removeLocalTile() {
  if (localTile) { localTile.remove(); localTile = null; }
}

// LE CARRÉ NOIR, ET POURQUOI IL ÉTAIT NOIR.
//
// La vignette de l'autre portait l'image ET le son dans le même élément. Or
// aucun navigateur ne lance tout seul une lecture qui fait du bruit : play()
// était refusé, le refus tombait dans un catch vide, et il ne restait qu'un
// rectangle sombre et muet. On sépare donc les deux. L'image est MUETTE, donc
// elle démarre toujours ; le son a son propre élément, et s'il est refusé on
// demande une touche à l'enfant au lieu de se taire pour de bon.
function addRemoteTile(id, stream) {
  // PeerJS annonce le flux une fois par piste : deux fois, donc, pour une
  // caméra qui porte l'image et le son. Reconstruire la vignette au second
  // passage coupait le son qui venait de démarrer, et la relançait dans le
  // vide. On reconnaît le flux déjà branché et on le laisse tranquille.
  const dejaLa = remoteTiles.get(id);
  if (dejaLa && dejaLa.video.srcObject === stream) return;
  removeRemoteTile(id);
  const video = document.createElement('video');
  video.className = 'remote';
  video.autoplay = true;
  video.muted = true;                       // c'est ce qui garantit l'image
  video.setAttribute('playsinline', '');
  video.dataset.pair = id;
  video.srcObject = stream;
  const label = document.createElement('div');
  label.className = 'video-name';
  const entry = net && net.conns.get(id);
  const nom = entry ? entry.name : '';
  label.textContent = nom;
  videoWrap.prepend(label);
  videoWrap.prepend(video);
  // Une lecture refusée ne doit pas rester refusée : on retente dès que le
  // navigateur sait quelque chose du flux.
  const lancer = () => video.play().catch(() => {});
  lancer();
  video.addEventListener('loadedmetadata', lancer);
  video.addEventListener('canplay', lancer);
  const audio = stream.getAudioTracks().length ? jouerLeSon(stream, nom) : null;
  if (audio) audio.dataset.visio = id;
  remoteTiles.set(id, { video, label, audio });
  majVisio();
}

function removeRemoteTile(id) {
  const t = remoteTiles.get(id);
  if (!t) return;
  t.video.srcObject = null;
  t.video.remove();
  t.label.remove();
  arreterLeSon(t.audio);
  remoteTiles.delete(id);
  majVisio();
}

// --- la caméra lente : des images, quand le film ne peut pas passer -----------

const photoTiles = new Map();   // peerId -> { img, label }

function addPhotoTile(id, dataURL, nom) {
  let t = photoTiles.get(id);
  if (!t) {
    const img = document.createElement('img');
    img.className = 'remote';
    img.alt = nom || '';
    img.dataset.pair = id;
    const label = document.createElement('div');
    label.className = 'video-name';
    const entry = net && net.conns.get(id);
    label.textContent = entry ? entry.name : (nom || '');
    videoWrap.prepend(label);
    videoWrap.prepend(img);
    t = { img, label };
    photoTiles.set(id, t);
  }
  t.img.src = dataURL;
  majVisio();
}

function removePhotoTile(id) {
  const t = photoTiles.get(id);
  if (!t) return;
  t.img.remove();
  t.label.remove();
  photoTiles.delete(id);
  majVisio();
}

// Le photographe local : tant que la caméra est allumée, il expédie une image
// de temps en temps à ceux que seul le nuage nous relie.
const photographe = new Photographe(
  () => localTile,
  (img) => { if (net && net.active) net.envoyerPhoto(img); },
);

// --- l'invitation, et le chemin emprunté --------------------------------------

// « Alice a allumé sa caméra » : la voir apparaître sans savoir quoi faire est
// frustrant, et chercher le bouton pendant que l'autre attend l'est encore
// plus. On propose, en un geste.
function majVisio() {
  const invite = document.getElementById('visio-invite');
  const chemin = document.getElementById('visio-chemin');
  if (!invite || !chemin) return;
  const qui = [...remoteTiles.keys(), ...photoTiles.keys()];
  const noms = qui.map((id) => {
    const e = net && net.conns.get(id);
    return e && e.name ? e.name : null;
  }).filter(Boolean);
  const maCamera = !!(net && net.camOn);

  if (noms.length && !maCamera) {
    const liste = noms.length === 1 ? noms[0] : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
    const verbe = noms.length === 1 ? 'a allumé sa caméra' : 'ont allumé leur caméra';
    document.getElementById('visio-invite-txt').textContent = `${liste} ${verbe}`;
    invite.style.display = 'block';
  } else {
    invite.style.display = 'none';
  }

  // Par où passe l'image — et ce qui ne passe pas. Un enfant qui ne s'entend
  // pas doit savoir que ce n'est ni sa faute ni une panne.
  if (photoTiles.size) {
    chemin.textContent = '☁️ Image par le nuage — le son ne passe pas sur ce Wi-Fi';
    chemin.style.display = 'block';
  } else if (remoteTiles.size) {
    chemin.textContent = '⚡ Image et son en direct';
    chemin.style.display = 'block';
  } else {
    chemin.textContent = '';
    chemin.style.display = 'none';
  }
}

function viderLaVisio() {
  for (const id of [...remoteTiles.keys()]) removeRemoteTile(id);
  for (const id of [...photoTiles.keys()]) removePhotoTile(id);
  photographe.arreter();
  majVisio();
}

camBtn.addEventListener('click', async () => {
  if (!net || !net.active) {
    // the button used to do nothing at all here, which just looks broken
    creatureManager.toast('📷 La caméra sert à se voir entre joueurs — rejoins un monde en ligne !', 0xff9d5e);
    return;
  }
  await allumerOuEteindreLaCamera();
});

// Le même geste, appelable depuis le bouton de la barre ET depuis
// l'invitation : deux chemins vers une seule vérité.
async function allumerOuEteindreLaCamera() {
  const on = await net.toggleCam();
  camBtn.textContent = on ? '🎥' : '📷';
  camBtn.classList.toggle('on', on);
  if (on) {
    // La caméra porte aussi le son, dans le même flux : se voir sans
    // s'entendre n'a pas de sens, et c'est ce qui permet de se passer d'un
    // bouton micro séparé.
    addLocalTile(net.videoStream);
    // La caméra lente tourne dès que la nôtre est allumée : elle n'envoie
    // quelque chose qu'aux pairs joints par le nuage, et rien du tout aux
    // autres. Pas de condition à tenir à jour, donc pas de condition fausse.
    photographe.demarrer();
  } else {
    // toggleCam a déjà arrêté le flux — donc l'image et le son ensemble.
    removeLocalTile();
    photographe.arreter();
  }
  majVisio();
  return on;
}

// Le bouton de l'invitation fait exactement ce que fait celui de la barre.
document.getElementById('visio-invite-btn').addEventListener('click', async () => {
  if (!net || !net.active) return;
  await allumerOuEteindreLaCamera();
});

// Le son distant refusé faute de geste : on le dit une fois, gentiment, et le
// premier contact avec l'écran le débloque.
surSonEnAttente((nom) => {
  creatureManager.toast(nom
    ? `🔊 Touche l'écran pour entendre ${nom}`
    : "🔊 Touche l'écran pour entendre", 0xffd479);
});

// Quelqu'un arrive dans le monde partagé. Une bulle de trois secondes se rate
// facilement quand on est occupé à construire : on annonce en grand, avec un
// son, et — si l'application est en arrière-plan — par une vraie notification
// du système, puisque c'est justement là qu'on ne regarde pas l'écran.
// L'autorisation ne peut pas être réclamée depuis l'arrivée d'un joueur.
//
// C'était le défaut de la première version : requestPermission() y était appelé
// depuis une réponse du réseau, donc hors de tout geste de l'enfant. Safari —
// c'est-à-dire l'iPad de Marlon — exige une action directe et ignore purement
// la demande sinon. Résultat : la permission n'était jamais accordée là où elle
// comptait le plus. Elle se demande maintenant depuis un interrupteur des
// Réglages, sur lequel on appuie vraiment.
//
// Second point, propre à iOS : l'API Notification n'existe que si le jeu a été
// « ajouté à l'écran d'accueil ». Dans un onglet Safari, elle est absente, et
// il faut le dire plutôt que de laisser un interrupteur mort.
let notifProposee = false;
const notifsDispo = () => 'Notification' in window;
const notifsAutorisees = () => notifsDispo() && Notification.permission === 'granted';

// Une vraie notification du système : celle qui s'affiche sur l'écran
// verrouillé de l'iPad, pas un bandeau dans la page.
//
// Il faut passer par le service worker. `new Notification(...)`, la façon
// évidente, ne fonctionne tout simplement pas sur iPhone ni iPad : Safari ne
// connaît le constructeur que sur macOS. C'est pourquoi les alertes n'ont
// jamais quitté le jeu sur les tablettes de la maison — le code marchait, mais
// seulement là où personne ne joue. showNotification(), lui, est la voie
// officielle depuis iOS 16.4 pour une application ajoutée à l'écran d'accueil,
// et c'est la même sur Android.
//
// Le constructeur reste en second recours pour les ordinateurs, où le service
// worker peut être absent (ouverture par fichier, mode privé).
async function notifierSysteme(titre, corps, tag) {
  if (!notifsAutorisees()) return false;
  const options = {
    body: corps,
    tag,                       // une seule alerte par sujet, remplacée à chaque fois
    icon: './icon-192.png',
    badge: './icon-192.png',
    renotify: true,
    data: { url: './' },
  };
  try {
    if (navigator.serviceWorker) {
      // On ne s'accroche pas à `ready` : sur un premier lancement il peut ne
      // jamais se résoudre, et une alerte n'est pas une raison de bloquer.
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((ok) => setTimeout(() => ok(null), 1500)),
      ]);
      if (reg && reg.showNotification) {
        await reg.showNotification(titre, options);
        return true;
      }
    }
    const n = new Notification(titre, options);
    n.onclick = () => { window.focus(); n.close(); };
    return true;
  } catch {
    return false;   // refusées, indisponibles : les bandeaux du jeu restent
  }
}
// Les tests regardent ce qui part vraiment au système.
window.__notifierSysteme = notifierSysteme;

function majLigneNotif() {
  const bouton = document.getElementById('notif-toggle');
  const aide = document.getElementById('notif-hint');
  if (!bouton || !aide) return;
  if (!notifsDispo()) {
    bouton.classList.remove('on');
    bouton.style.opacity = '0.35';
    aide.textContent = 'Sur iPhone et iPad, il faut d\'abord ajouter le jeu à l\'écran d\'accueil (Partager ▸ Sur l\'écran d\'accueil).';
    return;
  }
  bouton.style.opacity = '1';
  bouton.classList.toggle('on', Notification.permission === 'granted');
  aide.textContent = Notification.permission === 'granted'
    ? 'Activé ! Tu seras prévenu même si le jeu n\'est pas à l\'écran.'
    : Notification.permission === 'denied'
      ? 'Refusé. Pour changer d\'avis, va dans les réglages de ton navigateur.'
      : 'Reçois une alerte même si le jeu n\'est pas à l\'écran.';
}

document.getElementById('notif-toggle')?.addEventListener('click', async () => {
  if (!notifsDispo()) {
    creatureManager.toast('📱 Ajoute d\'abord le jeu à ton écran d\'accueil !', 0x9fd8e8);
    return;
  }
  if (Notification.permission === 'granted') {
    creatureManager.toast('🔔 Déjà activé ! (pour couper, va dans les réglages du navigateur)', 0x9fd8e8);
    return;
  }
  if (Notification.permission === 'denied') {
    creatureManager.toast('🔕 Ton navigateur a bloqué les alertes. Change-le dans ses réglages.', 0xff9a9a);
    return;
  }
  // Ici, et seulement ici, on est dans un vrai geste de l'utilisateur.
  try { await Notification.requestPermission(); } catch { /* refusé */ }
  majLigneNotif();
  if (Notification.permission === 'granted') {
    creatureManager.toast('🔔 C\'est activé ! Tu seras prévenu quand un ami arrive.', 0x58b04c);
  }
});
document.getElementById('settings-btn')?.addEventListener('click', majLigneNotif);
majLigneNotif();

// --- la proposition spontanée ------------------------------------------------
//
// Attendre que l'enfant aille de lui-même dans ⚙️ Réglages pour activer les
// alertes, c'est attendre longtemps : il n'y a aucune raison qu'il y pense.
// On propose donc de nous-mêmes — mais on ne peut pas demander l'autorisation
// tout seul pour autant. Safari, donc l'iPad, n'accepte requestPermission()
// que depuis un vrai appui ; lancée par un minuteur, la demande est ignorée
// sans un mot. La carte ci-dessous est ce vrai appui : elle s'affiche d'elle-
// même, et c'est le bouton « Oui » qui déclenche la demande.
//
// Et on n'insiste pas. Un enfant à qui l'on repose la même question à chaque
// partie finit par appuyer sur « Plus tard » sans lire : trois propositions au
// total, espacées de trois jours, puis on se tait pour de bon.
const NOTIF_MEMO = 'wm-notif-propose';
const NOTIF_MAX = 3;
const NOTIF_REPOS = 3 * 24 * 3600 * 1000;

function notifMemo() {
  try { return JSON.parse(localStorage.getItem(NOTIF_MEMO)) || { n: 0, t: 0 }; }
  catch { return { n: 0, t: 0 }; }
}
function notifMemoEcrire(m) {
  try { localStorage.setItem(NOTIF_MEMO, JSON.stringify(m)); } catch { /* mode privé */ }
}

const notifCarte = document.getElementById('notif-carte');

function fermerCarteNotif(compter = true) {
  if (!notifCarte) return;
  notifCarte.classList.remove('on');
  clearTimeout(notifCarte._t);
  if (compter) {
    const m = notifMemo();
    notifMemoEcrire({ n: m.n + 1, t: Date.now() });
  }
}

// Faut-il proposer ? Trois cas où l'on se tait : déjà répondu (accordé ou
// refusé), quota épuisé, ou proposition trop récente.
function proposerNotifs(raison) {
  if (!notifCarte || notifCarte.classList.contains('on')) return;
  if (notifsDispo() && Notification.permission !== 'default') return;
  const m = notifMemo();
  if (m.n >= NOTIF_MAX || Date.now() - m.t < NOTIF_REPOS) return;

  const titre = document.getElementById('notif-carte-titre');
  const texte = document.getElementById('notif-carte-texte');
  const oui = document.getElementById('notif-oui');
  const tard = document.getElementById('notif-plus-tard');

  if (!notifsDispo()) {
    // Sur un onglet Safari ordinaire, l'API n'existe pas : aucun bouton ne peut
    // rien y changer. On explique une fois ce qu'il faut faire, et on ne
    // repropose plus jamais — d'où le quota consommé d'un coup.
    titre.textContent = '🔔 Pour recevoir les alertes';
    texte.textContent = 'Ajoute le jeu à ton écran d\'accueil : Partager ▸ Sur l\'écran d\'accueil. Demande à un grand si besoin !';
    oui.textContent = 'Compris !';
    tard.style.display = 'none';
    oui.onclick = () => { notifMemoEcrire({ n: NOTIF_MAX, t: Date.now() }); fermerCarteNotif(false); };
  } else {
    titre.textContent = raison === 'ami'
      ? '🔔 Être prévenu la prochaine fois ?'
      : '🔔 Être prévenu quand un ami arrive ?';
    texte.textContent = 'Tu seras averti même si le jeu n\'est pas à l\'écran.';
    oui.textContent = 'Oui, préviens-moi !';
    tard.style.display = '';
    // Ici, et seulement ici, on est dans un vrai geste de l'enfant.
    oui.onclick = async () => {
      fermerCarteNotif(false);
      try { await Notification.requestPermission(); } catch { /* refusé */ }
      majLigneNotif();
      notifMemoEcrire({ n: NOTIF_MAX, t: Date.now() });   // question réglée
      creatureManager.toast(
        Notification.permission === 'granted'
          ? '🔔 C\'est activé ! Tu seras prévenu quand un ami arrive.'
          : '🔕 Pas de souci — tu pourras l\'activer dans ⚙️ Réglages.',
        Notification.permission === 'granted' ? 0x58b04c : 0x9fd8e8
      );
    };
  }
  tard.onclick = () => fermerCarteNotif();
  document.getElementById('notif-carte-close').onclick = () => fermerCarteNotif();

  notifCarte.classList.add('on');
  // Sans réponse au bout d'une demi-minute, elle s'efface toute seule : une
  // carte qui reste en travers de l'écran devient un obstacle, pas une offre.
  clearTimeout(notifCarte._t);
  notifCarte._t = setTimeout(() => fermerCarteNotif(), 30000);
}

// La première proposition arrive une fois l'enfant installé dans sa partie,
// pas pendant qu'il découvre l'écran.
setTimeout(() => proposerNotifs('spontane'), 75000);

// Le grand bandeau du milieu de l'écran, celui des captures. Il sert aussi
// aux arrivées de joueurs et aux moments forts du siège.
function grandBandeau(titre, sous, duree = 3200) {
  const t = document.getElementById('catch-title');
  const s2 = document.getElementById('catch-sub');
  if (!t || !s2) return;
  t.textContent = titre;
  s2.textContent = sous;
  catchBanner.classList.remove('show');
  void catchBanner.offsetWidth; // relance l'animation
  catchBanner.classList.add('show');
  clearTimeout(catchBanner._t);
  catchBanner._t = setTimeout(() => catchBanner.classList.remove('show'), duree);
}

function annonceArrivee(nom) {
  grandBandeau('👋 UN JOUEUR ARRIVE !', `${nom} vient de rejoindre ton monde !`);
  carillon([660, 990, 1320]); // trois notes qui montent : quelqu'un entre
  emojiBurst(['👋', '🎉', '✨'], 14);

  // C'est le meilleur moment pour proposer les alertes : il vient précisément
  // de se passer la chose dont elles préviennent. On laisse d'abord la fête
  // d'arrivée se terminer, puis la carte s'affiche — et c'est son bouton, un
  // vrai appui, qui demandera l'autorisation.
  if (!notifProposee) {
    notifProposee = true;
    setTimeout(() => proposerNotifs('ami'), 4200);
  }

  // Hors écran, c'est le système qui prévient : c'est tout l'intérêt.
  if (document.visibilityState !== 'visible') {
    notifierSysteme(
      `👋 ${nom} a rejoint ton monde !`,
      net && net.code ? `Monde ${net.code} · ${net.playerCount()} joueurs` : 'Viens jouer !',
      'wm-arrivee',
    );
  }
}

// --- catch celebration ------------------------------------------------------------

const catchBanner = document.getElementById('catch-banner');
creatureManager.onCatch = (sp, level) => {
  document.getElementById('catch-title').textContent = '⭐ ATTRAPÉ ! ⭐';
  document.getElementById('catch-sub').textContent = `${sp.name} · ${sp.type} · Niveau ${level} rejoint ton Dex !`;
  catchBanner.classList.remove('show');
  void catchBanner.offsetWidth; // restart the pop animation
  catchBanner.classList.add('show');
  clearTimeout(catchBanner._t);
  catchBanner._t = setTimeout(() => catchBanner.classList.remove('show'), 2600);
  emojiBurst(['⭐', '✨', '🎉', '◓'], 22);
  fun.onCatch(sp);
};

// --- creature dex panel -----------------------------------------------------------

const dexPanel = document.getElementById('dex-panel');

function toggleDex() {
  const open = dexPanel.style.display === 'block';
  if (open) {
    dexPanel.style.display = 'none';
  } else {
    creatureManager.renderDex();
    dexPanel.style.display = 'block';
  }
}

document.getElementById('dex-btn').addEventListener('click', toggleDex);
document.getElementById('dex-close').addEventListener('click', toggleDex);

// --- educational mode ---------------------------------------------------------

const edu = new EducationMode({
  onPause: () => {
    running = false;
    if (document.pointerLockElement) document.exitPointerLock();
    overlay.style.display = 'none';
  },
  onResume: () => startGame(),
  toast: (msg, color) => creatureManager.toast(msg, color),
  reward: () => creatureManager.awardRandom(),
  // Le hub Éducation filtre par enfant et par période : la liste des enfants
  // vient des documents du cloud (comme dans l'espace parent), les journées
  // d'un autre enfant de ses lignes de temps de jeu.
  moi: () => playerProfile.name,
  famille: async () => {
    if (!cloud.configured) return [];
    const rows = await cloud.selectAll('player_prefs', 'select=name');
    return [...new Set(rows.map((r) => r.name))].filter((n) => n && !n.includes('~'));
  },
  tempsDe: (nom) => cloud.timePull(nom),
});

// --- cross-device play time: a child's total is per-name, not per-device ----------
// Each device pushes its own daily tally under a stable random device id;
// the totals shown to the child/parent sum every device's rows, so playing
// on the iPad and then a phone never resets — and the daily limit can't be
// dodged by switching devices either (see EducationMode.update).

const DEVICE_ID_KEY = 'web-minecraft-device-id-v1'; // intentionally NOT per-profile
const deviceId = (() => {
  let id = window.__rawStorage ? window.__rawStorage.get(DEVICE_ID_KEY) : localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    if (window.__rawStorage) window.__rawStorage.set(DEVICE_ID_KEY, id);
    else localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
})();

function pushPlayTime(keepalive = false) {
  if (!playerProfile.name || !cloud.configured) return;
  const t = edu.today();
  cloud.timePush(playerProfile.name, deviceId, todayKey(), {
    play: Math.round(t.play), quiz: Math.round(t.quiz || 0),
    correct: t.correct.length, wrong: t.wrong, qs: t.qs || [],
  }, keepalive).catch(() => {});
}

let crossDeviceRows = [];
function applyCrossDeviceDays() {
  const localDays = edu.data.days || {};
  const merged = {};
  for (const r of crossDeviceRows) {
    // this device's own rows are redundant with (and staler than) local
    // data for any day local already covers — skip to avoid double-counting
    if (r.device_id === deviceId && localDays[r.day]) continue;
    const m = merged[r.day] || (merged[r.day] = { play: 0, quiz: 0, wrong: 0, correctCount: 0, qs: [] });
    m.play += r.play || 0;
    m.quiz += r.quiz || 0;
    m.wrong += r.wrong || 0;
    m.correctCount += r.correct || 0;
    if (Array.isArray(r.qs)) m.qs.push(...r.qs); // another device's own questions
  }
  for (const [day, d] of Object.entries(localDays)) {
    const m = merged[day] || (merged[day] = { play: 0, quiz: 0, wrong: 0, correctCount: 0, qs: [] });
    m.play += d.play;
    m.quiz += d.quiz || 0;
    m.wrong += d.wrong;
    m.correctCount += d.correct.length;
    if (d.qs) m.qs.push(...d.qs); // this device's own questions
  }
  const days = {};
  for (const [day, m] of Object.entries(merged)) {
    m.qs.sort((a, b) => a.t - b.t);
    days[day] = { play: m.play, quiz: m.quiz, wrong: m.wrong, correct: new Array(m.correctCount), qs: m.qs };
  }
  const tKey = todayKey();
  const otherToday = crossDeviceRows
    .filter((r) => r.day === tKey && r.device_id !== deviceId)
    .reduce((a, r) => a + (r.play || 0), 0);
  edu.setCrossDeviceDays(days, otherToday);
}

async function pullPlayTime() {
  if (!playerProfile.name || !cloud.configured || !navigator.onLine) return;
  try { crossDeviceRows = await cloud.timePull(playerProfile.name); } catch { return; }
  applyCrossDeviceDays();
}

// --- whole-profile portability -----------------------------------------------
// The child's collection, buildings, records and settings live in the cloud
// under their name, with localStorage as the working copy so everything keeps
// working offline. On launch we merge what other devices did; if that brings
// anything new down, reload once so the already-constructed game modules pick
// it up (they read their state at construction, like a profile switch does).

(async () => {
  if (!playerProfile.name) return;
  const flag = `wm-sync-${playerProfile.name}`;
  let already = false;
  try { already = !!sessionStorage.getItem(flag); } catch { /* ignore */ }
  const { changed, state } = await profileSync.pull();
  // Blocks go into the live world rather than only into storage: the world
  // was built before this pull finished, and its own save-on-unload would
  // otherwise write that older copy straight back over the merged one.
  if (state && state.edits) {
    const applied = world.importerProfil(state.edits);
    if (applied > 0) {
      world.saveEdits();
      creatureManager.toast(`☁️ ${applied} blocs retrouvés depuis tes autres appareils !`, 0x9fd8e8);
    }
  }
  if (changed && !already) {
    try { sessionStorage.setItem(flag, '1'); } catch { /* ignore */ }
    try { sessionStorage.setItem('wm-who-done', '1'); } catch { /* ignore */ }
    // Reloading before the service worker has taken control leaves the new
    // page permanently uncontrolled — clients.claim() only runs once, at
    // activation — which would cost this session its offline support. Wait
    // for it (briefly) so the reload lands on a controlled page.
    if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((r) => setTimeout(r, 5000)),
      ]);
    }
    location.reload(); // once per session: bring the restored state into play
  }
})();

pullPlayTime();
setInterval(() => { pushPlayTime(); pushPrefsToCloud(); }, 15000);

setInterval(pullPlayTime, 60000);
window.addEventListener('pagehide', () => pushPlayTime(true));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') pushPlayTime(true);
});

// Un parent a demandé un nouveau code : l'ancien ne marche déjà plus côté
// cloud, on fait choisir le nouveau tout de suite plutôt que de laisser
// l'enfant découvrir seul que son code est refusé.
function demanderNouveauCode(prefs) {
  const nom = playerProfile.name;
  if (identity.local[nom]) {
    delete identity.local[nom].pinHash;
    identity.saveLocal();
  }
  identity.enrollPin(nom, (fait) => {
    if (!fait) return; // « Plus tard » : on redemandera au prochain lancement
    const { codeADefinir, ...reste } = prefs;
    cloud.prefsPush(nom, { ...reste, live: presenceNow() }).catch(() => {});
  });
  // enrollPin écrit son propre sous-titre : on le remplace, sinon l'enfant ne
  // saurait pas pourquoi on lui redemande un code.
  identity.el.sub.textContent =
    `Un parent a remis ton code à zéro, ${nom}. Choisis-en un nouveau — six chiffres que tu retiendras bien.`;
}

// Le compte a été supprimé depuis l'espace parent, éventuellement sur un autre
// appareil. On ne laisse pas cette copie-ci continuer à vivre — ni à repousser
// dans le cloud ce qu'on vient d'y effacer.
function demanderSuppression() {
  const nom = playerProfile.name;
  profileSync.stop();
  delete identity.local[nom];
  identity.saveLocal();
  identity.show('👋 Compte supprimé', `Le compte de ${nom} a été supprimé par un parent sur cet appareil ou un autre.`);
  identity.button('OK', 'id-primary', () => {
    try {
      const reg = loadRegistry();
      reg.list = reg.list.filter((p) => p.name !== nom);
      reg.current = 0;
      saveRegistry(reg);
    } catch { /* on recharge quand même */ }
    try { sessionStorage.removeItem('wm-who-done'); } catch { /* ignore */ }
    location.reload();
  });
}

// --- home-screen profile: name, quiz language, school grade ------------------------

const homeName = document.getElementById('home-name');
homeName.value = playerProfile.name;
homeName.addEventListener('input', () => {
  playerProfile.name = homeName.value.trim().slice(0, 12);
  saveProfile();
});
homeName.addEventListener('keydown', (e) => e.stopPropagation());

// "Mon personnage" dedicated page with its own back button
const profileMenu = document.getElementById('profile-menu');
// Numéro de version sur l'accueil : on le demande au service worker, seule
// source de vérité, plutôt que de le recopier ici où il finirait décalé. Sans
// service worker (première ouverture, navigation privée), on lit le fichier.
// Numéro de version sur l'accueil, avec l'état de mise à jour — c'est la
// vraie question qu'on se pose en le lisant. La version qui tourne est
// demandée au service worker, seule source de vérité ; celle attendue est
// lue sur le serveur. Hors-ligne on affiche le numéro sans se prononcer.
(async function showVersion() {
  const el = document.getElementById('app-version');
  const court = (v) => (v || '').replace('web-minecraft-', '');
  const active = async () => {
    if (!navigator.serviceWorker?.controller) return null;
    return new Promise((resolve) => {
      const chan = new MessageChannel();
      chan.port1.onmessage = (e) => resolve(e.data?.version);
      navigator.serviceWorker.controller.postMessage({ type: 'version' }, [chan.port2]);
      setTimeout(() => resolve(null), 1500);
    });
  };
  const serveur = async () => {
    const t = await (await fetch('./sw.js', { cache: 'no-store' })).text();
    return (t.match(/CACHE_VERSION\s*=\s*'([^']+)'/) || [])[1] || null;
  };
  // Sans service worker — première ouverture, navigation privée — la version
  // qui tourne est celle du fichier servi.
  const secours = async () => { try { versionEnCours = court(await serveur()) || null; } catch { /* hors ligne */ } };
  try {
    const v = await active();
    versionEnCours = court(v) || null;
    if (!versionEnCours) await secours();
    publierVersion();
    // La présence part toutes les vingt secondes ; on n'attend pas le prochain
    // battement pour dire sur quoi tourne cet appareil.
    if (versionEnCours) envoyerPrefs().catch(() => {});
    if (!el) return;
    if (!navigator.onLine) { el.textContent = `version ${court(v) || '?'}`; return; }
    const attendue = await serveur();
    const label = court(v || attendue);
    if (!label) return;
    if (v && attendue && v === attendue) {
      el.textContent = `version ${label} · à jour`;
      el.classList.add('ok');
    } else if (v && attendue) {
      el.textContent = `version ${label} · mise à jour dispo`;
      el.classList.add('old');
    } else {
      el.textContent = `version ${label}`;
    }
  } catch { /* l'accueil s'affiche très bien sans */ }
})();

// Espace parent : le bouton n'existe que pour un compte, et l'ouvrir demande
// encore le code parent. Rien ici n'est un vrai rempart — la clé du cloud est
// publique par nature — mais un enfant qui trouve l'iPad ouvert ne tombe pas
// dessus par hasard.
const admin = new AdminPanel(cloud, identity, () => playerProfile.name);
const adminBtn = document.getElementById('admin-btn');

adminBtn.addEventListener('click', () => admin.open());
refreshAdminBtn();
refreshHello();

const refaceHint = document.getElementById('reface-hint');
function refreshSecurityRow() {
  const name = playerProfile.name;
  const e = name ? identity.entry(name) : null;
  const nFaces = e ? (e.faces || []).length : 0;
  const hasPin = !!(e && e.pinHash);
  refaceHint.textContent = !name ? ''
    : nFaces || hasPin
      ? `🔒 Compte sécurisé — ${nFaces ? `${nFaces} empreinte(s) de visage` : 'pas de visage'}${hasPin ? ' + un code' : ', pas de code'}. `
        + 'Refais tes photos de temps en temps : tu changes en grandissant !'
      : "Ton compte n'est pas encore protégé — ajoute ton visage ou un code pour que personne d'autre n'y joue.";
}
// Changer de prénom, c'est déménager un compte entier : les empreintes du
// visage, la partie sauvegardée dans le cloud et le code secret sont tous
// rangés sous le prénom. Sans déménagement, l'enfant se retrouve coupé en
// deux — le jeu sauvegarde sous le nouveau prénom pendant que le scanner
// garde son visage sous l'ancien, et le « Reconnais-moi » suivant le salue
// sous un prénom qu'il n'utilise plus, devant un compte vide.
async function migrerCompte(ancien, nouveau, { identite = true } = {}) {
  if (!ancien || !nouveau || ancien === nouveau) return;
  if (identite) await identity.rename(ancien, nouveau);
  if (!cloud.configured || !navigator.onLine) return;
  try {
    const distant = await cloud.statePull(ancien);
    if (distant) {
      const { state } = profileSync.merge(profileSync.snapshot(), distant);
      profileSync.apply(state);
      profileSync.hydrated = true; // on vient de lire le cloud pour ce compte
      await cloud.statePush(nouveau, state);
    }
  } catch { /* réseau capricieux : la partie locale n'a pas bougé */ }
  renderProfiles();
  refreshSecurityRow();
}
// La fusion décidée pendant un scan (« oui, je m'appelle Max maintenant »)
// déménage la partie elle aussi : l'identité, elle, est déjà déplacée.
identity.onRenamed = (ancien, nouveau) => migrerCompte(ancien, nouveau, { identite: false });

let nomAvantMenu = '';
// `change` plutôt que `input` : on déménage quand le prénom est arrêté, pas à
// chaque lettre tapée.
homeName.addEventListener('change', () => {
  const nouveau = playerProfile.name;
  if (!nomAvantMenu || !nouveau || nouveau === nomAvantMenu) return;
  const ancien = nomAvantMenu;
  nomAvantMenu = nouveau;
  if (!identity.isEnrolled(ancien)) return; // rien à déménager
  refaceHint.textContent = `🧳 Je déménage le compte de ${ancien} vers ${nouveau}…`;
  migrerCompte(ancien, nouveau).then(() => {
    refaceHint.textContent = `✅ C'est fait : ton visage, ton code et ta partie sont maintenant sous « ${nouveau} ».`;
  });
});

document.getElementById('profile-btn').addEventListener('click', () => {
  profileMenu.style.display = 'flex';
  document.getElementById('mode-row').style.display = 'none';
  nomAvantMenu = playerProfile.name;
  refreshSecurityRow();
});
for (const [id, kind] of [['reface-btn', 'face'], ['repin-btn', 'pin']]) {
  document.getElementById(id).addEventListener('click', () => {
    identity.secureChange(playerProfile.name, kind, () => {
      renderProfiles();        // le badge 🔒 peut apparaître
      refreshSecurityRow();
    });
  });
}
function closeProfileMenu() {
  profileMenu.style.display = 'none';
  document.getElementById('mode-row').style.display = 'flex';
}
document.getElementById('profile-back').addEventListener('click', closeProfileMenu);
document.getElementById('profile-back-top').addEventListener('click', closeProfileMenu);

const gradeSelect = document.getElementById('grade-select');
GRADES.forEach(([fr, us], i) => {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = `${fr} (France) · ${us} (USA)`;
  gradeSelect.appendChild(opt);
});
if (playerProfile.lang === undefined) playerProfile.lang = 'both';
if (playerProfile.grade === undefined) playerProfile.grade = 1; // CP · 1st Grade
gradeSelect.value = String(playerProfile.grade);

function renderLangRow() {
  document.querySelectorAll('.pb-toggle').forEach((b) =>
    b.classList.toggle('active', b.dataset.lang === playerProfile.lang));
}
renderLangRow();
// La langue et le niveau montent au serveur sans attendre.
//
// L'envoi périodique les emportait déjà, mais jusqu'à quinze secondes plus
// tard : un enfant qui règle sa langue puis referme l'application perdait son
// choix. C'est un envoi immédiat, pas le correctif du défaut principal — celui-
// là est daté, voir adopterProfilDistant.
document.querySelectorAll('.pb-toggle').forEach((b) => {
  b.addEventListener('click', () => {
    playerProfile.lang = b.dataset.lang;
    playerProfile.majProfil = Date.now();
    renderLangRow();
    saveProfile();
    edu.setPrefs(playerProfile.lang, playerProfile.grade);
    pushPrefsToCloud();
  });
});
gradeSelect.addEventListener('change', () => {
  playerProfile.grade = Number(gradeSelect.value);
  playerProfile.majProfil = Date.now();
  saveProfile();
  edu.setPrefs(playerProfile.lang, playerProfile.grade);
  pushPrefsToCloud();
  creatureManager.toast(`🎓 Niveau réglé : ${GRADES[playerProfile.grade][0]} · ${GRADES[playerProfile.grade][1]}`, 0x9fd8e8);
});
edu.setPrefs(playerProfile.lang, playerProfile.grade);

// Recopier ici les réglages venus du serveur : langue, niveau scolaire,
// personnage. Extraite parce qu'elle sert deux fois — au lancement, et chaque
// fois qu'une autre tablette de la maison s'avère avoir un choix plus récent
// que le nôtre. C'est le même code qui doit s'appliquer dans les deux cas, sans
// quoi les deux chemins finiraient par diverger.
function adopterProfilDistant(prefs) {
  // On ne défait pas un choix plus récent que celui qu'on nous propose.
  //
  // C'était le vrai défaut de la langue : la lecture des réglages du serveur
  // arrive une fraction de seconde après l'ouverture, et si l'enfant a touché
  // au bouton entre-temps, elle remettait tranquillement l'ancienne valeur.
  // Mesuré : trois cents millisecondes suffisaient — et sur un réseau lent,
  // c'est plusieurs secondes. Le choix partait bien au serveur ; c'est le
  // serveur qui le reprenait aussitôt.
  //
  // La date du dernier choix tranche, ici comme entre deux tablettes de la
  // maison allumées en même temps : le plus récent gagne, et lui seul.
  if ((prefs.majProfil || 0) < (playerProfile.majProfil || 0)) return false;
  let change = false;
  if (typeof prefs.lang === 'string' && prefs.lang !== playerProfile.lang) {
    playerProfile.lang = prefs.lang;
    change = true;
  }
  if (Number.isInteger(prefs.grade) && prefs.grade !== playerProfile.grade) {
    playerProfile.grade = prefs.grade;
    change = true;
  }
  if (Number.isInteger(prefs.charIdx) && prefs.charIdx !== selectedChar &&
      prefs.charIdx >= 0 && prefs.charIdx < NET_CHARACTERS.length) {
    selectedChar = prefs.charIdx;
    playerProfile.charIdx = prefs.charIdx;
    [...charRow.children].forEach((b, j) => b.classList.toggle('active', j === selectedChar));
    change = true;
  }
  if (prefs.look && typeof prefs.look === 'object' && !playerProfile.look) {
    playerProfile.look = prefs.look; // their avatar follows them here too
    change = true;
  }
  if (!change) return false;
  // On reprend la date de l'autre appareil, sinon on se croirait plus récent
  // que lui et l'on repartirait aussitôt à contre-courant.
  if (prefs.majProfil) playerProfile.majProfil = prefs.majProfil;
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(playerProfile)); } catch { /* ignore */ }
  edu.setPrefs(playerProfile.lang, playerProfile.grade);
  gradeSelect.value = String(playerProfile.grade);
  renderLangRow();
  refreshCharPortraits();
  return true;
}

// Server-side preferences: on launch, pull the settings saved under this
// first name (language, school grade, character look) and apply them, so a
// child finds their own setup on any device. Local changes push back up.
(async () => {
  if (!playerProfile.name || !navigator.onLine) return;
  let prefs = null;
  try { prefs = await cloud.prefsPull(playerProfile.name); } catch { return; }
  if (!prefs) { pushPrefsToCloud(); return; } // first time: seed the server

  // Consignes venues de l'espace parent. Elles voyagent avec les réglages
  // parce que le jeu n'a pas d'autre canal : il ne peut qu'écrire dans les
  // tables qu'il lit déjà.
  if (prefs.supprime) return demanderSuppression();
  if (prefs.codeADefinir) return demanderNouveauCode(prefs);

  // Rythme des questions et arrêt des quiz, décidés depuis l'espace parent :
  // ils suivent l'enfant d'un appareil à l'autre, comme sa langue ou son niveau.
  retenirConsignes(prefs);      // repli sur les versions d'avant le document dédié
  await lireConsignes();
  appliquerConsignes();
  const changed = adopterProfilDistant(prefs);
  // Adaptive quiz progress follows the child too: per-skill difficulty
  // never regresses from a sync (only a higher remote level wins), so
  // catching up from another device can only help, never undo progress.
  let skillsChanged = false;
  if (prefs.skills && typeof prefs.skills === 'object') {
    const merged = { ...edu.skills };
    for (const [skill, r] of Object.entries(prefs.skills)) {
      const l = merged[skill];
      if (r && (!l || (r.level || 0) > (l.level || 0))) { merged[skill] = r; skillsChanged = true; }
    }
    // Les questions acquises se recollent même quand aucun niveau n'a bougé :
    // c'est le cas courant d'un enfant qui a simplement révisé ailleurs.
    const acquisDistant = prefs.acquis && typeof prefs.acquis === 'object' ? prefs.acquis : null;
    if (skillsChanged || acquisDistant) {
      const recentUnion = new Set([...edu.recent, ...(Array.isArray(prefs.recent) ? prefs.recent : [])]);
      edu.setRemoteSkills(merged, [...recentUnion].slice(-80), acquisDistant,
        prefs.acquisNiveau && typeof prefs.acquisNiveau === 'object' ? prefs.acquisNiveau : null);
      skillsChanged = skillsChanged || !!acquisDistant;
    }
  }
  if (changed || skillsChanged) {
    creatureManager.toast('☁️ Tes réglages et ton avancement ont été retrouvés sur le serveur !', 0x9fd8e8);
  }
})();

// --- draggable video tiles ---------------------------------------------------------

(function makeVideoDraggable() {
  const POS_KEY = 'web-minecraft-videopos-v1';
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (p) { videoWrap.style.left = p.x + 'px'; videoWrap.style.top = p.y + 'px'; videoWrap.style.right = 'auto'; }
  } catch { /* default position */ }
  let drag = null;
  videoWrap.addEventListener('pointerdown', (e) => {
    const r = videoWrap.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    try { videoWrap.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    e.preventDefault();
    e.stopPropagation();
  });
  videoWrap.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const x = Math.max(4, Math.min(e.clientX - drag.dx, window.innerWidth - videoWrap.offsetWidth - 4));
    const y = Math.max(4, Math.min(e.clientY - drag.dy, window.innerHeight - videoWrap.offsetHeight - 4));
    videoWrap.style.left = x + 'px';
    videoWrap.style.top = y + 'px';
    videoWrap.style.right = 'auto';
    e.preventDefault();
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    const r = videoWrap.getBoundingClientRect();
    try { localStorage.setItem(POS_KEY, JSON.stringify({ x: r.left, y: r.top })); } catch { /* ignore */ }
  };
  videoWrap.addEventListener('pointerup', endDrag);
  videoWrap.addEventListener('pointercancel', endDrag);
})();

const creatureLabel = document.getElementById('creature-label');

function updateCreatureLabel() {
  if (running) {
    for (const npc of npcs) {
      if (npc.isTargeted()) {
        creatureLabel.style.display = 'block';
        creatureLabel.textContent = npc.label;
        creatureLabel.style.color = '#fff';
        return;
      }
    }
    const animal = animalManager.targeted();
    if (animal) {
      creatureLabel.style.display = 'block';
      creatureLabel.textContent =
        `${animal.def.emoji} ${animal.def.name}${animal.baby ? ' (bébé)' : ''} · ${animal.def.cry}`;
      creatureLabel.style.color = '#fff';
      return;
    }
  }
  const c = running ? creatureManager.targeted() : null;
  if (!c) { creatureLabel.style.display = 'none'; return; }
  creatureLabel.style.display = 'block';
  creatureLabel.textContent =
    `Wild ${c.sp.name} · ${c.sp.type} · Lv ${c.level} — ${IS_TOUCH ? 'tap ◓' : 'press Q'} to throw!`;
  creatureLabel.style.color = '#' + new THREE.Color(TYPES[c.sp.type].color).getHexString();
}

// --- hotbar HUD ------------------------------------------------------------------

let selectedSlot = 0;
const hotbarEl = document.getElementById('hotbar');
const HOTBAR_KEY = 'web-minecraft-hotbar-v1';

let hotbarBlocks = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(HOTBAR_KEY));
    if (Array.isArray(saved) && saved.length === 9 && saved.every((id) => BLOCK_INFO[id])) return saved;
  } catch { /* fall through */ }
  return [...HOTBAR_BLOCKS];
})();

function blockThumb(id, size) {
  const thumb = document.createElement('canvas');
  thumb.width = size; thumb.height = size;
  const ctx = thumb.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const info = BLOCK_INFO[id];
  if (info.prop) { // furniture: colored background + type emoji
    // le mobilier Renaissance vit dans sa propre plage, après les 200 objets
    const item = isRue(id) ? RUE_ITEMS[id - RUE_START]
      : isMeuble(id) ? MEUBLE_ITEMS[id - MEUBLE_START] : PROP_ITEMS[id - PROP_START];
    ctx.fillStyle = `rgb(${item.rgb[0]},${item.rgb[1]},${item.rgb[2]})`;
    ctx.fillRect(0, 0, size, size);
    ctx.font = `${Math.floor(size * 0.62)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, size / 2, size / 2 + 1);
    return thumb;
  }
  const tile = info.tiles[1]; // side texture reads best
  const sx = (tile % ATLAS_COLS) * TILE_PX;
  const sy = Math.floor(tile / ATLAS_COLS) * TILE_PX;
  if (info.slab) { // draw slabs as half blocks
    ctx.drawImage(atlasCanvas, sx, sy + TILE_PX / 2, TILE_PX, TILE_PX / 2, 0, size / 2, size, size / 2);
  } else {
    ctx.drawImage(atlasCanvas, sx, sy, TILE_PX, TILE_PX, 0, 0, size, size);
  }
  return thumb;
}

function buildHotbar() {
  hotbarEl.innerHTML = '';
  hotbarBlocks.forEach((id, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.title = BLOCK_INFO[id].name;
    slot.appendChild(blockThumb(id, 32));
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = i + 1;
    slot.appendChild(num);
    slot.addEventListener('click', () => selectSlot(i));
    hotbarEl.appendChild(slot);
  });
  // "+" slot: opens the full block inventory — the discoverable way in
  const more = document.createElement('div');
  more.className = 'slot slot-more';
  more.title = 'Tous les blocs (E)';
  more.textContent = '+';
  more.addEventListener('click', () => openInventory());
  hotbarEl.appendChild(more);
}

function selectSlot(i) {
  selectedSlot = i;
  [...hotbarEl.children].forEach((el, j) => el.classList.toggle('selected', j === i));
  document.getElementById('block-name').textContent = BLOCK_INFO[hotbarBlocks[i]].name;
}

function saveHotbar() {
  try { localStorage.setItem(HOTBAR_KEY, JSON.stringify(hotbarBlocks)); } catch { /* ignore */ }
}

buildHotbar();
selectSlot(0);

// --- inventory: pick any block into the current hotbar slot -----------------

const invPanel = document.getElementById('inv-panel');
let invOpen = false;
let invTab = 'blocks';
let invBuildToken = 0;

function invCell(id) {
  const cell = document.createElement('button');
  cell.className = 'inv-cell';
  cell.title = BLOCK_INFO[id].name;
  cell.appendChild(blockThumb(id, 36));
  cell.addEventListener('click', () => {
    hotbarBlocks[selectedSlot] = id;
    buildHotbar();
    selectSlot(selectedSlot);
    saveHotbar();
    closeInventory(true);
  });
  return cell;
}

// --- l'onglet Bâtiments : la bibliothèque vit dans le + ----------------------
//
// Max : « les bâtiments, je voudrais que tu les déplaces dans le bouton plus,
// là où tu as les blocs, la déco et les meubles. » Chaque bâtiment se montre
// en VIGNETTE — sa façade sud, dessinée bloc par bloc aux couleurs de
// l'atlas — et se pose devant soi d'un tap. Les familles gardent leur bouton
// 🔀 : des centaines de modèles atteignables sans liste de centaines de
// lignes.

// La couleur moyenne d'une tuile de l'atlas, calculée une fois : c'est elle
// qui peint les vignettes, donc un bâtiment en vignette a VRAIMENT les
// couleurs qu'il aura posé.
const couleursTuile = new Map();
function couleurBloc(id) {
  const info = BLOCK_INFO[id];
  if (!info || info.prop) return [190, 190, 190];
  const tile = Array.isArray(info.tiles) ? info.tiles[1] : info.tiles;
  if (!couleursTuile.has(tile)) {
    const cx = (tile % ATLAS_COLS) * TILE_PX, cy = Math.floor(tile / ATLAS_COLS) * TILE_PX;
    const d = atlasCanvas.getContext('2d').getImageData(cx, cy, TILE_PX, TILE_PX).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    couleursTuile.set(tile, [(r / n) | 0, (g / n) | 0, (b / n) | 0]);
  }
  return couleursTuile.get(tile);
}

// La façade sud d'un bâtiment, en vignette : pour chaque colonne (x, y) on
// dessine le bloc le plus proche du regard. C'est une élévation d'architecte,
// pas un rendu — et c'est exactement ce qu'il faut pour choisir.
function vignetteBati(m, taille = 68) {
  const face = new Map();
  for (const [x, y, z, id] of m.blocs) {
    const k = x * 4096 + y;
    const cur = face.get(k);
    if (!cur || z < cur.z) face.set(k, { z, id });
  }
  const cv = document.createElement('canvas');
  cv.width = taille; cv.height = taille;
  const ctx = cv.getContext('2d');
  const l = m.emprise.maxX - m.emprise.minX + 1;
  const h = m.emprise.maxY - m.emprise.minY + 1;
  const ech = Math.min(taille / l, taille / h);
  const ox = (taille - l * ech) / 2, oy = (taille - h * ech) / 2;
  for (const [k, v] of face) {
    const x = Math.floor(k / 4096), y = k - x * 4096;
    const [r, g, b] = couleurBloc(v.id);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(ox + (x - m.emprise.minX) * ech, oy + (h - 1 - (y - m.emprise.minY)) * ech,
      Math.ceil(ech), Math.ceil(ech));
  }
  return cv;
}

// Le modèle que chaque famille montre en ce moment — le 🔀 passe au suivant.
const modeleInv = {};

function titreInv(texte) {
  const t = document.createElement('div');
  t.textContent = texte;
  t.style.cssText = 'grid-column:1/-1;color:#9fd8e8;font-weight:600;margin-top:6px';
  return t;
}

function celluleBati(m, sousTitre, surRemplace) {
  const cell = document.createElement('button');
  cell.className = 'inv-cell inv-bat';
  cell.style.flexDirection = 'column';
  cell.title = m.nom;
  const cv = vignetteBati(m);
  cv.style.cssText = 'width:68px;height:68px;image-rendering:pixelated';
  cell.appendChild(cv);
  const nom = document.createElement('div');
  nom.textContent = `${m.emoji} ${m.nom}`;
  nom.style.cssText = 'font-size:11px;color:#dfe6f2;margin-top:4px;text-align:center';
  cell.appendChild(nom);
  const petit = document.createElement('div');
  petit.textContent = sousTitre;
  petit.style.cssText = 'font-size:10px;color:#8894b0';
  cell.appendChild(petit);
  if (surRemplace) {
    const melanger = document.createElement('span');
    melanger.textContent = '🔀';
    melanger.title = 'Voir le modèle suivant';
    melanger.style.cssText = 'position:absolute;top:4px;right:6px;cursor:pointer';
    melanger.addEventListener('click', (e) => { e.stopPropagation(); surRemplace(cell); });
    cell.style.position = 'relative';
    cell.appendChild(melanger);
  }
  cell.addEventListener('click', () => {
    closeInventory(true);
    fun.poserBati(m);
  });
  return cell;
}

function celluleFamille(f) {
  const n = ((modeleInv[f.id] || 0) % f.variantes + f.variantes) % f.variantes;
  const m = batimentVariante(f.id, n);
  return celluleBati(m, `modèle ${n + 1}/${f.variantes} · ${m.emprise.l}×${m.emprise.p}×${m.emprise.h}`,
    (cell) => {
      modeleInv[f.id] = n + 1;
      cell.replaceWith(celluleFamille(f));
    });
}

function buildInventory() {
  const grid = document.getElementById('inv-grid');
  const pager = document.getElementById('inv-pager');
  grid.innerHTML = '';
  document.querySelectorAll('#inv-tabs button').forEach((b) =>
    b.classList.toggle('active', b.dataset.tab === invTab));

  pager.style.display = 'none';
  document.getElementById('inv-title').textContent = invTab === 'batiments'
    ? `🏛️ ${MONUMENTS.length + NB_BATIMENTS} bâtiments — choisis, il se pose devant toi`
    : '🎒 Choisis un bloc pour la case sélectionnée';
  grid.style.gridTemplateColumns = invTab === 'batiments'
    ? 'repeat(auto-fill, minmax(108px, 1fr))' : '';
  if (invTab === 'blocks') {
    for (const id of PLACEABLE_BLOCKS) grid.appendChild(invCell(id));
    return;
  }
  if (invTab === 'batiments') {
    // Les monuments célèbres d'abord, ville par ville, puis les familles —
    // le tout par petits paquets d'images : bâtir six cents modèles d'un
    // coup gèlerait l'ouverture.
    const lots = [];
    for (const [ville, liste] of MONUMENTS_PAR_VILLE()) {
      lots.push(() => grid.appendChild(titreInv(ville)));
      for (const def of liste) {
        lots.push(() => {
          const m = monumentBati(def.id);
          if (m) grid.appendChild(celluleBati({ ...m, nom: def.nom, emoji: def.emoji }, `${m.emprise.h} blocs de haut`));
        });
      }
    }
    lots.push(() => grid.appendChild(titreInv(`Bâtiments de ville — ${NB_BATIMENTS} modèles, 🔀 pour changer`)));
    for (const f of FAMILLES) lots.push(() => grid.appendChild(celluleFamille(f)));
    const myToken = ++invBuildToken;
    let index = 0;
    const paquet = () => {
      if (myToken !== invBuildToken) return;
      for (let n = 0; n < 4 && index < lots.length; n++, index++) lots[index]();
      if (index < lots.length) requestAnimationFrame(paquet);
    };
    paquet();
    return;
  }
  // decor & furniture tabs: every item, appended in rAF batches so opening
  // stays instant and the list just scrolls forever
  const items = invTab === 'props' ? PROP_ITEMS : DECOR_ITEMS;
  const myToken = ++invBuildToken;
  let index = 0;
  const appendBatch = () => {
    if (myToken !== invBuildToken) return; // tab changed mid-build
    const frag = document.createDocumentFragment();
    for (let n = 0; n < 60 && index < items.length; n++, index++) {
      frag.appendChild(invCell(items[index].id));
    }
    grid.appendChild(frag);
    if (index < items.length) requestAnimationFrame(appendBatch);
  };
  appendBatch();
}
buildInventory();

document.querySelectorAll('#inv-tabs button').forEach((b) => {
  b.addEventListener('click', () => {
    invTab = b.dataset.tab;
    document.getElementById('inv-card').scrollTop = 0;
    buildInventory();
  });
});

function openInventory() {
  if (edu.quizActive || edu.hardStopActive) return;
  invOpen = true;
  invPanel.style.display = 'flex';
  if (document.pointerLockElement) document.exitPointerLock();
}

function closeInventory(resume) {
  invOpen = false;
  invPanel.style.display = 'none';
  if (resume && !IS_TOUCH && !dragLook) startGame(); // the click is our user gesture
}

document.getElementById('inv-close').addEventListener('click', () => closeInventory(true));

// Styled confirmation modal (replaces the browser's default confirm()).
window.gameConfirm = (msg, icon = '🕊️', okLabel = 'Relâcher 🕊️') => new Promise((resolve) => {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-icon').textContent = icon;
  document.getElementById('confirm-ok').textContent = okLabel;
  modal.style.display = 'flex';
  const okBtn = document.getElementById('confirm-ok');
  const cancelBtn = document.getElementById('confirm-cancel');
  const done = (val) => {
    modal.style.display = 'none';
    okBtn.removeEventListener('click', onOk);
    cancelBtn.removeEventListener('click', onCancel);
    resolve(val);
  };
  const onOk = () => done(true);
  const onCancel = () => done(false);
  okBtn.addEventListener('click', onOk);
  cancelBtn.addEventListener('click', onCancel);
});
document.getElementById('inv-btn').addEventListener('click', () => {
  if (invOpen) closeInventory(true);
  else openInventory();
});

document.addEventListener('wheel', (e) => {
  if (!running) return;
  const dir = e.deltaY > 0 ? 1 : -1;
  selectSlot((selectedSlot + dir + hotbarBlocks.length) % hotbarBlocks.length);
});

// --- minimap ---------------------------------------------------------------------

const minimapCanvas = document.getElementById('minimap');
const mapModal = document.getElementById('map-modal');
const mapModalCanvas = document.getElementById('map-modal-canvas');
let minimapVisible = false;
// Le pas de rafraîchissement : huit blocs, soit sept points de la minicarte.
// En dessous, on paie un défilement pour un déplacement qui ne se voit pas ;
// au-dessus, la carte redevient en retard. La cadence de 120 ms est la borne
// haute — à 95 blocs/s elle donne onze blocs de retard, contre soixante-quatorze.
const CARTE_PAS = 8;
const horizonDecoupe = cadence(250);
let horizonCap = 0;
const carteSuivre = cadence(120);
let carteVue = null;
let refletsHorloge = 0;   // la cadence des reflets de carrosserie (voir frame)
// L'horloge du TEMPS D'ÉCRAN : des secondes réelles, bornées à deux. La borne
// n'est pas une précaution — c'est elle qui empêche un onglet passé à
// l'arrière-plan, ou un appareil endormi, de compter des minutes d'absence
// comme du jeu au premier réveil. Le plafond de `dt` le faisait par accident ;
// ici c'est exprès. Deux secondes laissent passer en entier l'image la plus
// lente qu'on ait mesurée (2 im/s à l'arrivée dans Paris).
const dtEcran = chronoReel(2);


// La hauteur à laquelle l'ombrage de la carte a été réglé, du temps où le
// monde s'arrêtait là. Elle reste fixe : c'est un choix de dessin, pas une
// dimension du monde.
const RELIEF_CARTE = 96;

// UNE CARTE QUI SE DÉPLACE SE FAIT DÉFILER, ELLE NE SE RECALCULE PAS (v233).
//
// Max, capture en vol : « pas dingue la carte en retard ». Mesuré à la sonde,
// en vol à 95 blocs/s avec la distance d'affichage de l'iPad :
//
//   écart réel entre deux redessins    2,4 s en moyenne, 4,23 s au pire
//   distance parcourue entre les deux  74 blocs en moyenne, 99,7 au pire
//   rayon de la minicarte              96 blocs
//   coût d'un redessin                 30,8 ms
//
// La carte montrait donc, en moyenne, un paysage laissé aux trois quarts
// derrière soi — et au pire un paysage entièrement sorti du cadre. Deux causes
// se cumulaient, et la seconde interdisait de corriger la première.
//
//  - LE MINUTEUR COMPTAIT EN `dt`. C'est le piège de la v226, et la minicarte
//    est la SEULE cadence de ménage à ne pas y être passée : `main.js` borne
//    `dt` à un vingtième, si bien qu'une seconde de minuteur en réclame
//    2,4 réelles dès que la cadence tombe — c'est-à-dire précisément en vol,
//    quand le monde se charge.
//  - REDESSINER PLUS SOUVENT COÛTAIT TROP CHER. 30,8 ms pour vingt-cinq mille
//    points dont chacun descend une colonne du monde : à dix fois par seconde,
//    c'est un tiers du temps de la machine.
//
// D'où le fond qui DÉFILE. Le raster est tenu à UN POINT PAR BLOC, ce qui rend
// le décalage exact et entier — à l'échelle d'affichage (0,83 point par bloc),
// il faudrait arrondir, et l'image dériverait d'un demi-point à chaque tour.
// Entre deux redessins on recopie ce qui reste à l'écran et l'on ne calcule que
// la bande neuve : le coût ne dépend plus de la taille de la carte mais de la
// DISTANCE parcourue.
//
// ET LE FOND ENTIER SE REFAIT QUAND MÊME, lentement. Un bloc posé par l'enfant
// tombe dans la partie recopiée, que rien ne recalculerait jamais.
let carteRaster = null;         // le fond, un point par bloc
let carteReel = null;           // 1 : peint d'après les vrais blocs ; 0 : d'après le relief (morceau absent)
let carteRasterCx = 0, carteRasterCz = 0, carteRasterR = 0;
let carteHorsSol = null;        // le canevas intermédiaire, à la taille du raster
let carteBande = 0;             // la prochaine ligne du raster à repeindre

// ET LE FOND ENTIER SE REFAIT PAR BANDES, JAMAIS D'UN COUP (v258).
//
// La v233 refaisait le fond ENTIER toutes les deux secondes, pour qu'un bloc
// posé par l'enfant finisse par apparaître dans la partie recopiée. Mesuré au
// banc, processeur bridé ×4 : 690 ms pour le premier fond (37 249 colonnes,
// et les morceaux qu'elles font engendrer), puis 90 à 240 ms toutes les deux
// secondes tant que la minicarte est affichée — un à-coup régulier que Max
// sentait « dès qu'on ouvre la carte ». Le fond se repeint désormais ligne
// par ligne, quelques millisecondes par image, en tournant sans fin : le
// même bloc posé apparaît dans la seconde, et aucune image ne le paie en
// entier. Un raster neuf, ou un grand saut (téléportation), se REMPLIT de
// la même façon au lieu d'être calculé d'un seul tenant — et il se prépare
// pendant l'accueil, avant « Jouer », pour que la minicarte soit là quand
// l'enfant l'allume.
function assurerRasterCarte(radius) {
  const pcx = Math.floor(player.pos.x), pcz = Math.floor(player.pos.z);
  const N = radius * 2 + 1;
  let neuf = false;
  if (!carteRaster || carteRasterR !== radius) {
    carteRaster = new Uint8ClampedArray(N * N * 4);
    carteReel = new Uint8Array(N * N);
    carteRasterR = radius;
    carteHorsSol = document.createElement('canvas');
    carteHorsSol.width = N; carteHorsSol.height = N;
    neuf = true;
  }
  const dx = pcx - carteRasterCx, dz = pcz - carteRasterCz;
  if (neuf || Math.abs(dx) >= N || Math.abs(dz) >= N) {
    // rien à recopier : le fond de nuit, que les bandes remplacent en une seconde
    for (let o = 0; o < carteRaster.length; o += 4) { carteRaster[o] = 20; carteRaster[o + 1] = 26; carteRaster[o + 2] = 40; carteRaster[o + 3] = 255; }
    carteReel.fill(0);
    carteBande = 0; carteBandeI = 0; carteTours = 0;
  } else if (dx !== 0 || dz !== 0) {
    decalerCarte(carteRaster, N, dx, dz);
    decalerCarte(carteReel, N, dx, dz, 1);
    // la bande neuve, et elle seule : c'est tout le gain
    const i0 = dx > 0 ? N - dx : 0, i1 = dx > 0 ? N : -dx;
    const j0 = dz > 0 ? N - dz : 0, j1 = dz > 0 ? N : -dz;
    for (let j = 0; j < N; j++) for (let i = i0; i < i1; i++) peindreCarte(carteRaster, N, i, j, pcx, pcz, radius, carteReel);
    for (let j = j0; j < j1; j++) for (let i = 0; i < N; i++) peindreCarte(carteRaster, N, i, j, pcx, pcz, radius, carteReel);
  }
  carteRasterCx = pcx; carteRasterCz = pcz;
}
// LA BANDE SE COMPTE EN LIGNES, ET LE BUDGET N'EST QU'UN PLAFOND. Mon
// premier jet repeignait « pendant quatre millisecondes » à chaque image :
// deux millions de lectures de blocs par seconde, dix fois la cadence de la
// v233, et à l'accueil une boucle sans fin qui a retardé de CINQUANTE
// secondes la mise à jour du service worker (mesuré : `reg.update()` résolu
// en 50 s avec, 1 s sans). Deux lignes par image font le tour du raster en
// deux secondes à soixante images — la cadence d'avant, sans son à-coup ;
// quatre quand le raster se remplit. Le budget en temps ne sert qu'à borner
// une colonne qui fait engendrer un morceau (`getBlock`) : il se vérifie
// tous les huit points, et une ligne entamée se reprend où elle en était.
let carteBandeI = 0;
let carteTours = 0;             // tours complets du raster depuis son remplissage
function repeindreBandeCarte(lignes, budgetMs) {
  if (!carteRaster) return;
  const N = carteRasterR * 2 + 1;
  const fin = performance.now() + budgetMs;
  let faites = 0;
  for (;;) {
    peindreCarte(carteRaster, N, carteBandeI, carteBande, carteRasterCx, carteRasterCz, carteRasterR, carteReel);
    if (++carteBandeI >= N) {
      carteBandeI = 0; carteBande = (carteBande + 1) % N;
      if (carteBande === 0) carteTours++;
      if (++faites >= lignes) return;
    }
    if ((carteBandeI & 7) === 0 && performance.now() >= fin) return;
  }
}

// UNE SONDE, PAS UN TÉMOIN. Elle compare le fond DÉFILÉ à un fond entièrement
// recalculé au même endroit : c'est ce qui prouve qu'une recopie ne montre pas
// un paysage périmé. Posée une seule fois, hors du chemin de chaque image.
// Depuis la v258 un point peint d'après le relief (morceau pas encore livré)
// n'est pas comparable à ce que le même point rend une fois le morceau là :
// on compare les points dont la nature n'a pas changé entre les deux, et
// `points` compte ceux-là — c'est encore la recopie qu'on éprouve.
window.__carteControle = () => {
  if (!carteRaster) return null;
  const N = carteRasterR * 2 + 1;
  const t = new Uint8ClampedArray(N * N * 4);
  const reel = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) peindreCarte(t, N, i, j, carteRasterCx, carteRasterCz, carteRasterR, reel);
  }
  let ecarts = 0, points = 0;
  for (let p = 0; p < N * N; p++) {
    if (reel[p] !== carteReel[p]) continue;
    points++;
    const k = p * 4;
    if (t[k] !== carteRaster[k] || t[k + 1] !== carteRaster[k + 1] || t[k + 2] !== carteRaster[k + 2]) ecarts++;
  }
  return { points, ecarts, total: N * N };
};

// Un point du fond : la couleur du premier bloc NON VIDE de sa colonne.
// LA MINICARTE N'ENGENDRE JAMAIS UN MORCEAU (v258). `getBlock` engendre le
// morceau qu'on lui demande, sur le fil principal : après une téléportation,
// les cent soixante-neuf morceaux du raster n'y étaient pas encore, et la
// minicarte les faisait naître un à un dans l'image — vingt-quatre
// millisecondes chacun dans une ville, pendant que le worker les engendrait
// de son côté. C'est ce qui a rendu « un appui long dépose n'importe où »
// rouge deux fois sur quatre : le minuteur de l'appui tirait plus de cent
// vingt millisecondes en retard, et la carte déclinait, à bon droit. Un
// morceau absent se peint d'après le RELIEF (`terrainHeight`, pure) et se
// marque comme tel (`carteReel` à 0) ; la bande suivante le repeint avec
// ses vrais blocs dès que le worker les a livrés.
function peindreCarte(buf, N, i, j, pcx, pcz, radius, reel = null) {
  const wx = pcx + i - radius, wz = pcz + j - radius;
  let color = [20, 26, 40], h = 0;
  const couleurUrbaine=world.urbanColor?.(wx,wz);
  if (couleurUrbaine) { const c=couleurUrbaine; const o=(j*N+i)*4; buf[o]=c[0];buf[o+1]=c[1];buf[o+2]=c[2];buf[o+3]=255; if (reel) reel[j * N + i] = 1; return; }
  const cxm = Math.floor(wx / CHUNK), czm = Math.floor(wz / CHUNK);
  const morceau = world.chunks.get(cxm + ',' + czm);
  if (!morceau) {
    h = world.terrainHeight(wx, wz);
    color = carte.couleur(wx, wz, h, false, false);
    if (reel) reel[j * N + i] = 0;
  } else {
    if (reel) reel[j * N + i] = 1;
    // On part du sommet réel de ce morceau de monde, pas du plafond : sinon
    // chaque point de la carte traverserait d'abord tout le ciel vide, et la
    // carte coûterait de plus en plus cher à chaque fois qu'on relève le
    // plafond. Ici c'est le premier bloc NON VIDE qu'on cherche, eau et
    // vitres comprises — pas le premier bloc plein.
    for (let y = Math.min(HEIGHT - 1, world.chunkTop(cxm, czm)); y >= 0; y--) {
      const id = world.getBlock(wx, y, wz);
      if (id !== BLOCK.AIR) {
        color = MAP_COLORS[id] || (id >= DECOR_START && decorMapColor(id)) || [150, 150, 150];
        h = y;
        break;
      }
    }
  }
  // Le relief lit plus clair en altitude. La référence est figée à la
  // hauteur du monde d'avant : indexée sur le plafond, elle aurait
  // assombri toute la carte d'un coup le jour où le ciel a monté.
  const shade = 0.65 + (Math.min(h, RELIEF_CARTE) / RELIEF_CARTE) * 0.6;
  const o = (j * N + i) * 4;
  buf[o] = Math.min(255, color[0] * shade);
  buf[o + 1] = Math.min(255, color[1] * shade);
  buf[o + 2] = Math.min(255, color[2] * shade);
  buf[o + 3] = 255;
}

// Le contenu se déplace de (−dx, −dz) points. Les lignes se parcourent dans le
// sens qui évite d'écraser ce qu'on n'a pas encore lu ; `copyWithin` fait le
// reste, y compris quand la source et la cible se chevauchent dans la ligne.
function decalerCarte(buf, N, dx, dz, canaux = 4) {
  const ligne = N * canaux;
  const montant = dz > 0;
  for (let k = 0; k < N; k++) {
    const j = montant ? k : N - 1 - k;
    const src = j + dz;
    if (src < 0 || src >= N) continue;
    const de = src * ligne, vers = j * ligne;
    if (dx === 0) buf.copyWithin(vers, de, de + ligne);
    else if (dx > 0) buf.copyWithin(vers, de + dx * canaux, de + ligne);
    else buf.copyWithin(vers - dx * canaux, de, de + ligne + dx * canaux);
  }
}

function drawMap(mapCanvas, radius) {
  const ctx = mapCanvas.getContext('2d');
  const size = mapCanvas.width;
  const pcx = Math.floor(player.pos.x), pcz = Math.floor(player.pos.z);
  const N = radius * 2 + 1;
  assurerRasterCarte(radius);
  const hctx = carteHorsSol.getContext('2d');
  const img = hctx.createImageData(N, N);
  img.data.set(carteRaster);
  hctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(carteHorsSol, 0, 0, N, N, 0, 0, size, size);

  const toMap = (x, z) => [((x - pcx + radius) / (radius * 2 + 1)) * size, ((z - pcz + radius) / (radius * 2 + 1)) * size];

  // NPCs (white) and wild creatures (violet)
  for (const npc of npcs) {
    const [mx, my] = toMap(npc.pos.x, npc.pos.z);
    if (mx < 0 || mx > size || my < 0 || my > size) continue;
    ctx.fillStyle = '#fff';
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }
  ctx.fillStyle = '#c86ee0';
  for (const c of creatureManager.creatures) {
    const [mx, my] = toMap(c.pos.x, c.pos.z);
    if (mx < 0 || mx > size || my < 0 || my > size) continue;
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }
  ctx.fillStyle = '#ffd75e'; // farm animals
  for (const a of animalManager.animals) {
    const [mx, my] = toMap(a.pos.x, a.pos.z);
    if (mx < 0 || mx > size || my < 0 || my > size) continue;
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }
  ctx.fillStyle = '#4ac9ff'; // the other players, bright blue
  let flechesAmis = 0;
  for (const rp of remotePlayers.values()) {
    const [mx, my] = toMap(rp.mesh.position.x, rp.mesh.position.z);
    if (mx < 0 || mx > size || my < 0 || my > size) {
      // L'ami est hors du cadre : une flèche à son bord montre la direction.
      // Les enfants passaient leur temps à se chercher — « t'es où ?? » crié
      // d'une pièce à l'autre — alors que la minicarte savait répondre.
      const a = Math.atan2(rp.mesh.position.z - player.pos.z, rp.mesh.position.x - player.pos.x);
      const ex = size / 2 + Math.cos(a) * (size / 2 - 9);
      const ey = size / 2 + Math.sin(a) * (size / 2 - 9);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(a);
      ctx.fillStyle = '#4ac9ff';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(7, 0); ctx.lineTo(-4, -4.5); ctx.lineTo(-4, 4.5); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
      if (rp.name) {
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const ix = size / 2 + Math.cos(a) * (size / 2 - 22);
        const iy = size / 2 + Math.sin(a) * (size / 2 - 22);
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.strokeText(rp.name[0], ix, iy);
        ctx.fillStyle = '#bfe9ff';
        ctx.fillText(rp.name[0], ix, iy);
      }
      flechesAmis++;
      continue;
    }
    ctx.fillRect(mx - 3, my - 3, 6, 6);
  }
  window.__flechesAmis = flechesAmis;   // le banc compte ce qui est dessiné

  // Le nom des lieux que l'on survole vraiment. Ils étaient auparavant tous
  // rabattus sur les bords en guise de panneaux indicateurs : dix-huit noms
  // empilés dans une vignette de cent soixante pixels, illisibles. Voir loin,
  // c'est désormais le travail de la grande carte.
  if (radius >= 60) {
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const c of [...CITIES, ...PLACES, ...urbain.lieuxManhattan]) {
      const [mx, my] = toMap(c.x, c.z);
      if (mx < 24 || mx > size - 24 || my < 12 || my > size - 6) continue;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(c.name, mx, my);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(c.name, mx, my);
    }
  }

  // player arrow, pointing where the camera looks
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(Math.atan2(-Math.cos(player.yaw), -Math.sin(player.yaw)));
  ctx.fillStyle = '#ff4444';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// --- la carte du monde -------------------------------------------------------
//
// Tout le dessin, le zoom et les gestes vivent dans src/carte.js. Ici on lui
// dit seulement où regarder et quoi faire quand un enfant touche un lieu.

// Pose le joueur au sol à cet endroit du monde. Le terrain lointain n'est pas
// forcément en mémoire : on demande donc sa hauteur au générateur, qui la
// connaît partout, plutôt que de sonder des blocs qui n'existent pas encore.
function deposerA(wx, wz) {
  const bx = Math.floor(wx), bz = Math.floor(wz);
  let sol = world.sommetColonne(bx, bz) + 1;
  if (sol <= 2) sol = world.terrainHeight(bx, bz) + 1;   // chunk pas encore généré
  const dansEau = sol <= WATER_LEVEL;
  const cible = dansEau ? WATER_LEVEL + 1 : sol;
  player.pos.set(bx + 0.5, cible + 0.2, bz + 0.5);
  player.vel.set(0, 0, 0);
  return { dansEau, y: cible };
}

const carte = new Carte({
  canvas: mapModalCanvas,
  world,
  joueur: () => ({ x: player.pos.x, z: player.pos.z, yaw: player.yaw }),
  // Le prénom, et rien d'autre. La table des autres joueurs est rangée par
  // identifiant de pair, et c'est cette clé qui servait d'étiquette : la carte
  // affichait « 632f7014-f54e-4ab2-9df2-eac67daa1b1c » sous le point bleu. Le
  // prénom était pourtant là, à côté, depuis toujours.
  //
  // Sans prénom, on ne dessine rien plutôt qu'un identifiant : un lien encore
  // en cours de présentation n'a pas de nom pendant une seconde ou deux, et
  // c'est un cas normal, pas une raison de montrer de la mécanique à un enfant.
  autres: () => [...remotePlayers.values()].map((rp) => ({
    x: rp.mesh.position.x, z: rp.mesh.position.z, nom: rp.name,
  })),
  // Habitants, bêtes et créatures : la liste n'est construite que si la carte
  // est assez rapprochée pour les montrer.
  // `toujours` : les créatures se voient à TOUS les zooms. Elles vivent à
  // moins de soixante-dix blocs du joueur — de loin, elles se regroupent
  // autour de sa flèche, ce qui est la vérité. Les cent quatorze habitants et
  // les animaux, eux, restent réservés au zoom proche : dessinés de loin, ils
  // couvraient les villes de confettis.
  mobiles: () => [
    ...npcs.map((n) => ({ x: n.pos.x, z: n.pos.z, couleur: '#ffffff' })),
    ...creatureManager.creatures.map((c) => ({ x: c.pos.x, z: c.pos.z, couleur: '#c86ee0', toujours: true })),
    ...animalManager.animals.map((a) => ({ x: a.pos.x, z: a.pos.z, couleur: '#ffd75e' })),
  ],
  surVoyage: (lieu) => {
    deposerA(lieu.x + 1.5, lieu.z + 1.5);   // sur la trame des rues, pas dans une maison
    fermerCarte();
    creatureManager.toast(`🧳 Voyage vers ${lieu.name} !`, 0xffd75e);
  },
  surTeleport: (wx, wz) => {
    const { dansEau } = deposerA(wx, wz);
    fermerCarte();
    creatureManager.toast(
      dansEau ? '🌊 Téléporté en pleine mer — nage jusqu\'à la terre !' : '✨ Téléporté ! Bon voyage.',
      dansEau ? 0x6ec8ff : 0xffd75e
    );
  },
});

function ouvrirCarte() {
  mapModal.style.display = 'flex';
  // Sur un ordinateur, la souris est capturée par le jeu tant qu'on joue :
  // sans cette ligne, tous les clics de la carte partaient dans la fenêtre 3D
  // et rien ne répondait. Les panneaux du jeu la relâchent déjà, la carte
  // l'oubliait — et elle est bien plus qu'une image à regarder.
  carteOuverte = true;
  if (document.pointerLockElement) document.exitPointerLock();
  // On arrive au-dessus du joueur, à l'échelle où la carte montre encore les
  // vraies constructions : on reconnaît sa maison avant de choisir où aller.
  carte.centrerSurJoueur(0.7);
  carte.ouvrir();
  // La recherche repart vierge à chaque ouverture : une liste laissée ouverte
  // recouvrirait la carte avant même qu'on l'ait regardée.
  if (champLieu) { champLieu.value = ''; listeLieux.style.display = 'none'; }
  // RIEN NE FLOTTE AU-DESSUS DE LA CARTE.
  //
  // Le bandeau du lien réseau est posé à z-index 20, au-dessus de tous les
  // panneaux du jeu — il le faut, car il doit rester lisible par-dessus
  // l'écran d'accueil, où se joue justement la connexion. Mais en jeu il
  // recouvrait le haut de la carte : il interceptait les touchers sur les
  // résultats de la recherche, et masquait les noms des lieux du nord. C'est
  // la même règle que les commandes, qui sont SOUS la carte et jamais dessus.
  //
  // On le masque par une CLASSE sur le corps du document, jamais en touchant
  // son `display`. La première version enregistrait l'état trouvé à
  // l'ouverture et le rendait à la fermeture — et perdait donc tout bandeau
  // ARRIVÉ PENDANT que la carte était ouverte : on lui rendait un « caché »
  // périmé, et l'enfant ne voyait jamais que son ami venait de le rejoindre.
  // Une classe ne mémorise rien : le bandeau garde sa propre logique
  // d'affichage, la carte se contente de le couvrir tant qu'elle est là.
  document.body.classList.add('carte-ouverte');
}
function fermerCarte() {
  carte.fermer();
  mapModal.style.display = 'none';
  carteOuverte = false;
  document.body.classList.remove('carte-ouverte');
  // On rend la souris au jeu, comme à la fermeture de l'inventaire : la
  // fermeture est elle-même le geste que le navigateur exige pour cela.
  if (!IS_TOUCH && !dragLook && !edu.quizActive) startGame();
}

// Le centre de la carte, c'est la moitié de sa largeur ET la moitié de sa
// hauteur : depuis que la carte peut être un rectangle (v187), les deux
// diffèrent, et zoomer visait un point au-dessus du cadre sur un téléphone
// couché — la vue partait vers le nord à chaque appui.
const centreDeLaCarte = () => {
  const c = mapModalCanvas.getBoundingClientRect();
  return [c.width / 2, c.height / 2];
};
document.getElementById('map-plus').addEventListener('click', () => {
  carte.zoomerVers(...centreDeLaCarte(), 1.7);
});
document.getElementById('map-moins').addEventListener('click', () => {
  carte.zoomerVers(...centreDeLaCarte(), 1 / 1.7);
});

// --- chercher un lieu par son nom -------------------------------------------
//
// Deux cent soixante-dix-huit lieux au registre, plus les places de Paris, les
// quartiers de Manhattan, les monuments de Washington. Les atteindre demandait
// jusqu'ici de faire glisser la carte jusqu'à eux — donc de savoir où ils
// sont, ce qui est exactement ce qu'un enfant ne sait pas. On tape « Tokyo »,
// on y va.
const champLieu = document.getElementById('map-chercher');
const listeLieux = document.getElementById('map-resultats');

// Sans accents ni casse : un enfant tape « eiffel », « chateau », « new york ».
const sansAccent = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function chercherLieux(saisie) {
  const t = sansAccent(saisie.trim());
  if (!t) return [];
  const vus = new Set();
  const debute = [], contient = [];
  for (const { c } of carte.catalogueDesLieux()) {
    if (!c.name || vus.has(c.name)) continue;
    const i = sansAccent(c.name).indexOf(t);
    if (i < 0) continue;
    vus.add(c.name);
    (i === 0 ? debute : contient).push(c);
  }
  // Ce qui COMMENCE par ce qu'on tape passe devant : « Paris » avant « Porte
  // de Paris », « Nice » avant « Venise ».
  return [...debute, ...contient].slice(0, 12);
}

let resultatsLieux = [];
function montrerResultats() {
  resultatsLieux = chercherLieux(champLieu.value);
  listeLieux.innerHTML = '';
  if (!champLieu.value.trim()) { listeLieux.style.display = 'none'; return; }
  if (!resultatsLieux.length) {
    const rien = document.createElement('div');
    rien.className = 'rien';
    rien.textContent = 'Aucun lieu de ce nom.';
    listeLieux.appendChild(rien);
  }
  for (const lieu of resultatsLieux) {
    const b = document.createElement('button');
    b.type = 'button';
    // La distance dit quelque chose d'utile : « Tokyo, à 2 400 blocs » prépare
    // l'enfant au voyage au lieu de le téléporter à l'aveugle.
    const d = Math.round(Math.hypot(lieu.x - player.pos.x, lieu.z - player.pos.z));
    b.textContent = `📍 ${lieu.name}  ·  ${d} blocs`;
    b.addEventListener('click', () => allerAuLieu(lieu));
    listeLieux.appendChild(b);
  }
  listeLieux.style.display = 'block';
}

function allerAuLieu(lieu) {
  champLieu.value = '';
  listeLieux.style.display = 'none';
  champLieu.blur();
  // La carte se recentre AVANT le voyage : si l'enfant rouvre la carte, il est
  // là où il vient d'arriver, pas là d'où il est parti.
  carte.vue.cx = lieu.x; carte.vue.cz = lieu.z;
  carte.limiter();
  deposerA(lieu.x + 1.5, lieu.z + 1.5);
  fermerCarte();
  creatureManager.toast(`🧳 Voyage vers ${lieu.name} !`, 0xffd75e);
}

champLieu.addEventListener('input', montrerResultats);
// Les touches du jeu ne doivent pas traverser le champ : sans cela, taper
// « Paris » ouvrait l'inventaire (« e »), faisait décoller (« f ») et lançait
// une balle (« q ») pendant qu'on écrivait. C'est déjà la règle du champ de
// prénom sur l'accueil.
for (const ev of ['keydown', 'keyup', 'keypress']) {
  champLieu.addEventListener(ev, (e) => {
    e.stopPropagation();
    if (ev === 'keydown' && e.key === 'Enter' && resultatsLieux.length) allerAuLieu(resultatsLieux[0]);
    if (ev === 'keydown' && e.key === 'Escape') { champLieu.value = ''; montrerResultats(); }
  });
}
// Un appui sur la carte referme la liste : elle flotte au-dessus, elle ne doit
// pas rester dans le chemin.
mapModalCanvas.addEventListener('pointerdown', () => { listeLieux.style.display = 'none'; });
document.getElementById('map-moi').addEventListener('click', () => carte.centrerSurJoueur(0.6));
document.getElementById('map-tout').addEventListener('click', () => carte.toutVoir());

document.getElementById('map-btn').addEventListener('click', () => {
  minimapVisible = !minimapVisible;
  minimapCanvas.style.display = minimapVisible ? 'block' : 'none';
  if (minimapVisible) {
    drawMap(minimapCanvas, 96);
    carteVue = { x: player.pos.x, z: player.pos.z };
  }
});
minimapCanvas.addEventListener('click', ouvrirCarte);
document.getElementById('map-modal-close').addEventListener('click', fermerCarte);
mapModal.addEventListener('click', (e) => {
  if (e.target === mapModal) fermerCarte();
});

// --- day/night cycle ----------------------------------------------------------------

const skyColor = new THREE.Color();
const lightColor = new THREE.Color();
let dayTime = DAY_LENGTH * 0.3; // start mid-morning
// La part de nuit, 0 le jour et 1 en pleine nuit : c'est elle qui allume les
// lampes de rue (v248), pas `daylight` brut, qui ne tombe jamais sous 0,08.
let nuitDehors = 0;

function updateSky(dt) {
  dayTime = (dayTime + dt) % DAY_LENGTH;
  const angle = (dayTime / DAY_LENGTH) * Math.PI * 2;
  // daylight: 1 at noon, 0 at midnight, smooth transitions
  const daylight = THREE.MathUtils.clamp(Math.sin(angle) * 1.6 + 0.5, 0.08, 1);
  nuitDehors = 1 - THREE.MathUtils.smoothstep(daylight, 0.1, 0.55);

  skyColor.lerpColors(NIGHT_SKY, DAY_SKY, daylight);
  // Lueur chaude du lever et du coucher. Elle se règle sur la hauteur du
  // soleil, pas sur la luminosité : c'est le même repère que celui du disque
  // et de son halo, donc le ciel s'embrase exactement quand l'astre rase
  // l'horizon, au lieu de virer à l'orange pendant que le ciel est encore bleu.
  const hauteurSoleil = Math.sin(angle);
  const rasant = Math.exp(-((hauteurSoleil / 0.22) ** 2));
  skyColor.lerp(SUNSET_SKY, rasant * 0.72);
  // Sur Mars, le ciel est saumon : la poussière de fer en suspension diffuse
  // le rouge au lieu du bleu. C'est ce qui fait vraiment croire à la planète —
  // sans ça, une plaine rouge sous un ciel bleu reste un désert terrestre.
  const distMars = Math.hypot(player.pos.x - MARS.x, player.pos.z - MARS.z);
  const surMars = THREE.MathUtils.clamp((MARS.r + 10 - distMars) / 26, 0, 1);
  dansMars = surMars > 0.5;
  if (surMars > 0) skyColor.lerp(MARS_SKY, surMars * (0.35 + 0.55 * daylight));

  if (weather === 'rain' && surMars < 0.5) skyColor.multiplyScalar(0.62); // grey rainy skies
  scene.background.copy(skyColor);
  scene.fog.color.copy(skyColor);

  const wDim = weather === 'rain' ? 0.8 : 1;
  const level = (0.25 + 0.75 * daylight) * wDim;
  lightColor.setRGB(level, level, level * (0.92 + 0.08 * daylight));
  // Les blocs, l'eau et le paysage lointain sont ÉCLAIRÉS (v247) : ce sont
  // les lampes ci-dessous qui font le jour et la nuit, plus une teinte de
  // matériau. `lightColor` ne sert plus qu'aux vitres allumées, qui gardent
  // le plus lumineux du jour et de leur propre lumière.
  // Les vitres allumées prennent le plus lumineux des deux : la lumière du
  // jour quand il fait jour, la leur quand la nuit tombe. Elles ne
  // s'allument donc pas au crépuscule — elles cessent simplement de
  // s'éteindre, ce qui est exactement ce que fait une ville.
  litMaterial.color.set(
    Math.max(lightColor.r, LUMIERE_FENETRE.r * 0.92),
    Math.max(lightColor.g, LUMIERE_FENETRE.g * 0.92),
    Math.max(lightColor.b, LUMIERE_FENETRE.b * 0.92),
  );
  // LE JOUR ET LA NUIT SONT DES LAMPES, PAS UNE TEINTE (v247). Le ciel
  // (hémisphère) porte la lumière diffuse, le soleil la lumière directe et
  // les ombres ; la nuit, la lune prend sa place, bleutée et faible, et la
  // ville garde ses vitres allumées. Manhattan règle les siennes quand
  // l'enfant y est (manhattan-render.js) ; on ne se marche pas dessus.
  if (!renduDansManhattan) {
    // Les intensités sont MESURÉES sur captures : à 1,27 + 1,66 (mon premier
    // jet, calqué sur Manhattan) les textures des blocs, plus claires que
    // les matériaux physiques de New York, sortaient délavées par la
    // correspondance tonale — ciel blanc, toits blancs.
    // ET LA NUIT SE RÈGLE AVEC LES OMBRES (v249). Max, capture d'iPad :
    // « Paris est dans le noir ». Le banc coupe ses ombres, donc mes captures
    // de nuit étaient éclairées par la lune partout ; sur l'iPad la rue est
    // dans l'ombre des immeubles et il ne reste que la lueur du ciel —
    // mesurée à 5,7/255 au sol, 2,6 sur un mur. Le plancher de nuit se lit
    // sur une page à ombres forcées ; le jour (daylight = 1) ne bouge pas.
    hemiLight.intensity = (HEMI_NUIT + (0.88 - HEMI_NUIT) * daylight) * wDim;
    hemiLight.color.setRGB(1, 1, 1).lerp(NUIT_CIEL_LAMPE, 1 - daylight);
    hemiLight.groundColor.copy(SOL_LAMPE);
    sunLight.intensity = (LUNE_NUIT + (1.14 - LUNE_NUIT) * daylight) * wDim;
    sunLight.color.copy(daylight > 0.5 ? SOLEIL_LAMPE : LUNE_LAMPE);
    sunLight.color.lerp(SUNSET_SKY, rasant * 0.45);
  }

  // le soleil, la lune et les étoiles suivent le même cycle — et le dôme du
  // ciel : l'horizon prend la couleur du ciel, le zénith plus profond
  sky.update(angle, daylight, camera.position, skyColor);
  sky.dome.visible = !renduDansManhattan;
  if (!renduDansManhattan) suivreLeSoleil(sky.direction);

  // L'eau avance sur son propre compteur : dayTime revient à zéro toutes les
  // dix minutes, ce qui ferait sauter les vagues d'un coup.
  tempsEau += dt;
  waterMaterial.userData.temps.value = tempsEau;
}
let tempsEau = 0;
const SUNSET_SKY = new THREE.Color(0xff8a4a);
const SOLEIL_LAMPE = new THREE.Color(0xffefd6);
const LUNE_LAMPE = new THREE.Color(0x8fa8d8);
// Les planchers de nuit (v249), mesurés ombres forcées : voir `updateSky`.
const HEMI_NUIT = 1.7;
const LUNE_NUIT = 0.45;
const NUIT_CIEL_LAMPE = new THREE.Color(0x7d93b8);
const SOL_LAMPE = new THREE.Color(0x6e6a5e);
const MARS_SKY = new THREE.Color(0xd9a184);
// Mis à jour par updateSky : sert aussi à faire taire la faune terrestre.
let dansMars = false;

// --- living sky: weather, drifting clouds, birds and the occasional plane ---------

let weather = 'clear';
let weatherTimer = 90;

const RAIN_COUNT = 700;
const rainGeo = new THREE.BufferGeometry();
{
  const pts = new Float32Array(RAIN_COUNT * 3);
  for (let i = 0; i < RAIN_COUNT; i++) {
    pts[i * 3] = (Math.random() - 0.5) * 70;
    pts[i * 3 + 1] = Math.random() * 40 - 5;
    pts[i * 3 + 2] = (Math.random() - 0.5) * 70;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
}
const rainPoints = new THREE.Points(rainGeo, new THREE.PointsMaterial({
  color: 0x9ab8e8, size: 0.16, transparent: true, opacity: 0.7, sizeAttenuation: true,
}));
rainPoints.visible = false;
scene.add(rainPoints);

// --- un seul ciel pour tout le monde ----------------------------------------
//
// L'heure et la météo étaient tirées au sort par chaque appareil. Deux enfants
// dans le même monde pouvaient donc être l'un sous la pluie en pleine nuit,
// l'autre au soleil de midi — ils décrivaient le même endroit sans se
// comprendre. Désormais l'hôte tient l'horloge et le baromètre ; les invités
// les suivent.
//
// Entre deux annonces, l'invité continue d'avancer sa propre horloge : le
// soleil ne se met pas à sauter d'un quart d'heure toutes les cinq secondes.
// Il ne décide simplement plus rien.
const invite = () => !!(net && net.active && !net.isHost);
const cielDuMonde = () => ({ temps: dayTime, meteo: weather });

// ON VOIT LE PERSONNAGE CONDUIRE (v249). Max : « fais en sorte qu'on voie le
// personnage conduire quand on conduit une voiture ». La vue de poursuite
// montrait une voiture vide. L'avatar de l'enfant — le même personnage que
// les autres joueurs voient de lui — est assis sur le `siege` que la fiche
// de la monture déclare, dans le repère du véhicule, cuisses en avant et
// bras vers le volant ; il descend avec lui. Une monture sans siège (un
// cheval, un avion sculpté) ne le montre pas : la règle vit dans la fiche.
let avatarLocal = null, avatarLocalChar = -1, avatarTemps = 0;
// LE VISAGE EST TOURNÉ VERS −z, COMME LE NEZ DE LA VOITURE (personnages.js :
// « visage tourné vers −z »). Mon premier jet le tournait de 180° en
// « déduisant » que le modèle regardait en +z ; Max l'a vu sur la capture,
// de dos au volant. Un signe se regarde, il ne se déduit pas — et le témoin
// lit désormais la direction du visage contre le cap de la voiture. Les
// cuisses et les bras vont en avant, donc vers −z : angles négatifs.
const POSE_AU_VOLANT = { cuisses: -1.35, genoux: 1.25, bras: -0.95, coudes: -0.55 };
function obtenirAvatarLocal() {
  if (!avatarLocal || avatarLocalChar !== selectedChar) {
    if (avatarLocal) { avatarLocal.removeFromParent(); liberer(avatarLocal); }
    avatarLocal = buildKidMesh(withOwnLook((NET_CHARACTERS[selectedChar] || NET_CHARACTERS[0]).look));
    avatarLocalChar = selectedChar;
  }
  return avatarLocal;
}
// Le plafond au-dessus du siège : parmi les maillages de la voiture (jamais
// l'avatar), ceux qui ont des sommets dans la colonne du siège au-dessus de
// l'assise ; le plus bas de leurs sommets les plus hauts est le pavillon —
// celui du modèle d'artiste ou le ciel de toit du cockpit sculpté. Mesuré
// une fois par voiture, et refait quand son modèle arrive (le nombre de
// pièces change). `null` : une voiture sans toit.
const _plafondInv = new THREE.Matrix4(), _plafondM = new THREE.Matrix4(), _plafondV = new THREE.Vector3();
function plafondAuSiege(a, siege) {
  // UN CACHE PAR SIÈGE (v253) : le conducteur et ses passagers n'ont pas le
  // même toit au-dessus d'eux (un pavillon descend vers l'arrière), et deux
  // sièges qui se partageraient une seule case se remesureraient à chaque
  // image — cent mille sommets. Toute pièce ajoutée au véhicule (un avatar
  // qui s'assied) invalide tout.
  const pieces = a.mesh.children.length;
  const cleSiege = `${siege.x}|${siege.z}`;
  if (!a.plafondSiege || a.plafondSiege.pieces !== pieces) a.plafondSiege = { pieces, y: new Map() };
  if (a.plafondSiege.y.has(cleSiege)) return a.plafondSiege.y.get(cleSiege);
  a.mesh.updateMatrixWorld(true);
  _plafondInv.copy(a.mesh.matrixWorld).invert();
  let plafond = Infinity;
  a.mesh.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    // ni l'avatar de l'enfant, ni celui d'un ami assis là (v253) : une tête
    // n'est pas un toit — reconnu à ses bras articulés (`buildKidMesh`)
    for (let p = o; p && p !== a.mesh; p = p.parent) if (p === avatarLocal || (p.userData && p.userData.arms)) return;
    const pos = o.geometry.attributes.position;
    _plafondM.multiplyMatrices(_plafondInv, o.matrixWorld);
    let haut = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      _plafondV.fromBufferAttribute(pos, i).applyMatrix4(_plafondM);
      if (Math.abs(_plafondV.x - siege.x) < 0.3 && Math.abs(_plafondV.z - siege.z) < 0.3
        && _plafondV.y > siege.y + 0.3 && _plafondV.y > haut) haut = _plafondV.y;
    }
    if (haut > -Infinity && haut < plafond) plafond = haut;
  });
  const y = plafond === Infinity ? null : plafond;
  a.plafondSiege.y.set(cleSiege, y);
  return y;
}
function asseoirLeConducteur(dt) {
  const a = fun.montureConduite ? fun.montureConduite() : null;
  const siege = a && a.def && a.def.siege;
  avatarTemps += dt;
  if (!siege || !a.mesh) {
    // PASSAGER CHEZ UN AMI (v253) : assis sur le siège de SA voiture
    const pa = fun.passagerDe ? fun.passagerDe() : null;
    const chez = pa ? vehiculeDuConducteur(pa.de) : null;
    if (chez) {
      const sieges = chez.def.sieges || [];
      asseoir(obtenirAvatarLocal(), chez, sieges[Math.min(pa.s || 0, sieges.length - 1)] || chez.def.siege, avatarTemps);
      return;
    }
    if (avatarLocal && avatarLocal.parent) avatarLocal.removeFromParent();
    return;
  }
  asseoir(obtenirAvatarLocal(), a, siege, avatarTemps);
}
// ASSEOIR UN PERSONNAGE SUR UN SIÈGE, dans le repère du véhicule — le même
// geste pour l'enfant au volant (v249), l'ami vu dans sa voiture et les
// passagers (v253). `a` : { mesh, def } ; le plafond se mesure une fois par
// véhicule (`plafondAuSiege`).
function asseoir(av, a, siege, temps) {
  if (av.parent !== a.mesh) a.mesh.add(av);
  // LA TÊTE RESTE SOUS LE TOIT (Max : « le personnage passe à travers la
  // carrosserie »). Le siège de la fiche vaut pour une berline ; une voiture
  // basse a son toit plus bas, et le sommet du crâne — 0,71 au-dessus des
  // hanches — sortait par le pavillon. On MESURE le plafond au-dessus du
  // siège, dans la carrosserie de chaque modèle, et l'on descend les
  // hanches ; si cela ne suffit pas, l'avatar rapetisse un peu.
  const plafond = plafondAuSiege(a, siege);
  let hanches = siege.y, echelle = 1;
  if (plafond !== null) {
    if (hanches + 0.706 > plafond - 0.06) hanches = Math.max(0.3, plafond - 0.06 - 0.706);
    if (hanches + 0.706 > plafond - 0.06) echelle = Math.max(0.7, Math.min(1, (plafond - 0.06 - hanches) / 0.706));
  }
  av.scale.setScalar(echelle);
  // les hanches sur l'assise : le modèle a ses hanches à H.hanche × 0,84
  av.position.set(siege.x, hanches - 0.77 * echelle, siege.z);
  av.rotation.y = 0;                             // visage en −z, comme le nez de la voiture
  av.userData.legs.forEach((l) => { l.rotation.x = POSE_AU_VOLANT.cuisses; });
  av.userData.arms.forEach((b) => { b.rotation.x = POSE_AU_VOLANT.bras; });
  animerHumain(av, temps, 0, POSE_AU_VOLANT);
}

// LES RÉVERBÈRES ÉCLAIRENT VRAIMENT LA RUE, LA NUIT (v248). Manhattan pose
// ses quatre lampes sur la grille de ses avenues ; partout ailleurs, on les
// pose sous les quatre lanternes les plus proches de l'enfant — celles que
// `meshChunk` a notées en dessinant les réverbères — à moins de quarante
// blocs. Une cadence de MÉNAGE, en temps réel : deux fois par seconde, ce
// qui suffit à un enfant qui marche à trois blocs par seconde, et rien à
// faire tant qu'il fait jour. Une lampe sans lanterne s'éteint.
const lampesPretes = cadence(500);
function eclairerLaRue() {
  if (renduDansManhattan || !lampesPretes()) return;
  if (!LAMPES_ACTIVES) { for (const l of lampesRue) l.intensity = 0; return; }
  const px = player.pos.x, pz = player.pos.z;
  const proches = [];
  if (nuitDehors > 0.02) {
    const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const e = chunkMeshes.get((pcx + dx) + ',' + (pcz + dz));
        if (!e || !e.lanternes) continue;
        for (const l of e.lanternes) {
          const d = (l.x - px) * (l.x - px) + (l.z - pz) * (l.z - pz);
          if (d < 40 * 40) proches.push({ l, d });
        }
      }
    }
    proches.sort((a, b) => a.d - b.d);
  }
  lampesRue.forEach((lampe, i) => {
    const c = proches[i];
    if (!c) { lampe.intensity = 0; return; }
    lampe.position.copy(c.l);
    lampe.color.set(LAMPE_RUE);
    lampe.distance = PORTEE_LAMPE_RUE;
    lampe.intensity = nuitDehors * INTENSITE_LAMPE_RUE;
  });
}

// Trois secondes entre deux annonces : le message est minuscule, et c'est le
// délai maximum pendant lequel une tablette peut afficher autre chose que ce
// que voit l'enfant d'à côté.
const CIEL_MS = 3;
let annonceCiel = 0;   // compte à rebours de l'hôte, en secondes

function adopterCiel({ temps, meteo }) {
  if (typeof temps === 'number' && isFinite(temps)) {
    // On glisse vers l'heure de l'hôte quand l'écart est petit, on saute quand
    // il est grand : un invité qui se réveille ne doit pas voir le soleil
    // traverser le ciel au ralenti pendant une minute.
    const ecart = ((temps - dayTime) % DAY_LENGTH + DAY_LENGTH * 1.5) % DAY_LENGTH - DAY_LENGTH / 2;
    dayTime = Math.abs(ecart) > DAY_LENGTH * 0.02 ? temps : (dayTime + ecart * 0.25 + DAY_LENGTH) % DAY_LENGTH;
  }
  if ((meteo === 'clear' || meteo === 'rain') && meteo !== weather) {
    weather = meteo;
    rainPoints.visible = weather === 'rain';
    if (running) creatureManager.toast(weather === 'rain' ? '🌧️ Il pleut !' : '🌈 Le soleil revient !', 0x9fd8e8);
  }
}

function updateWeather(dt) {
  // L'invité ne décide pas du temps qu'il fait : il attend qu'on le lui dise.
  if (invite()) {
    if (weather === 'rain') animerPluie(dt);
    return;
  }
  if (net && net.active && net.isHost) {
    annonceCiel -= dt;
    if (annonceCiel <= 0) { annonceCiel = CIEL_MS; net.diffuserCiel(cielDuMonde()); }
  }
  weatherTimer -= dt;
  if (weatherTimer <= 0) {
    weather = weather === 'clear' ? 'rain' : 'clear';
    weatherTimer = weather === 'rain' ? 50 + Math.random() * 70 : 140 + Math.random() * 160;
    rainPoints.visible = weather === 'rain';
    if (running) creatureManager.toast(weather === 'rain' ? '🌧️ Il pleut !' : '🌈 Le soleil revient !', 0x9fd8e8);
    // le changement part tout de suite : c'est ce qui se voit le plus
    if (net && net.active && net.isHost) { annonceCiel = CIEL_MS; net.diffuserCiel(cielDuMonde()); }
  }
  if (weather === 'rain') animerPluie(dt);
}

function animerPluie(dt) {
  const pos = rainGeo.attributes.position;
  for (let i = 0; i < RAIN_COUNT; i++) {
    let y = pos.getY(i) - dt * 24;
    if (y < -5) y += 40;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
  rainPoints.position.set(player.pos.x, player.pos.y, player.pos.z);
}

// --- seasons: the real-world calendar dresses the world ---------------------------
// Winter snowflakes, spring petals, autumn leaves, summer fireflies.

const SEASON = (() => {
  const m = new Date().getMonth(); // 0..11
  if (m >= 2 && m <= 4) return { label: 'le printemps', emoji: '🌸', color: 0xf0a8c8, fall: 1.6 };
  if (m >= 5 && m <= 7) return { label: "l'été", emoji: '✨', color: 0xf2e07a, fall: -0.4 };
  if (m >= 8 && m <= 10) return { label: "l'automne", emoji: '🍂', color: 0xd8843a, fall: 2.2 };
  return { label: "l'hiver", emoji: '❄️', color: 0xffffff, fall: 3 };
})();

const SEASON_COUNT = 160;
const seasonGeo = new THREE.BufferGeometry();
{
  const pts = new Float32Array(SEASON_COUNT * 3);
  for (let i = 0; i < SEASON_COUNT; i++) {
    pts[i * 3] = (Math.random() - 0.5) * 60;
    pts[i * 3 + 1] = Math.random() * 26 - 3;
    pts[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  seasonGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
}
const seasonPoints = new THREE.Points(seasonGeo, new THREE.PointsMaterial({
  color: SEASON.color, size: 0.24, transparent: true, opacity: 0.75, sizeAttenuation: true,
}));
scene.add(seasonPoints);

let seasonTime = 0, seasonToastShown = false;

function updateSeasons(dt) {
  if (!seasonToastShown && running) {
    seasonToastShown = true;
    creatureManager.toast(`${SEASON.emoji} C'est ${SEASON.label} dans le monde !`, 0xfff1b8);
  }
  seasonTime += dt;
  const pos = seasonGeo.attributes.position;
  for (let i = 0; i < SEASON_COUNT; i++) {
    let y = pos.getY(i) - SEASON.fall * dt;
    if (y < -3) y += 26;
    if (y > 23) y -= 26;
    pos.setY(i, y);
    pos.setX(i, pos.getX(i) + Math.sin(seasonTime * 1.3 + i) * dt * 0.8); // flutter
  }
  pos.needsUpdate = true;
  seasonPoints.position.set(player.pos.x, player.pos.y, player.pos.z);
}

const clouds = [];
{
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 });
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Group();
    const n = 3 + (i % 3);
    for (let j = 0; j < n; j++) {
      const puff = new THREE.Mesh(new THREE.BoxGeometry(6 + Math.random() * 8, 2.2, 5 + Math.random() * 6), cloudMat);
      puff.position.set(j * 5 - n * 2.5, Math.random() - 0.5, Math.random() * 4 - 2);
      c.add(puff);
    }
    c.position.set((Math.random() - 0.5) * 700, 76 + Math.random() * 14, (Math.random() - 0.5) * 700);
    c.userData.speed = 0.6 + Math.random() * 1.2;
    scene.add(c);
    clouds.push(c);
  }
}
function updateClouds(dt) {
  for (const c of clouds) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x - player.pos.x > 380) c.position.x = player.pos.x - 380;
    if (Math.abs(c.position.z - player.pos.z) > 380) {
      c.position.z = player.pos.z + (Math.random() - 0.5) * 700;
    }
  }
}

const flocks = [];
{
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2e, side: THREE.DoubleSide });
  for (let f = 0; f < 3; f++) {
    const g = new THREE.Group();
    for (let b = 0; b < 5; b++) {
      const bird = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 3), birdMat);
      bird.rotation.x = Math.PI / 2;
      bird.position.set((b - 2) * 2.2, 0, Math.abs(b - 2) * 1.8); // V formation
      g.add(bird);
    }
    g.position.set((Math.random() - 0.5) * 400, 58 + f * 5, (Math.random() - 0.5) * 400);
    g.userData = { dir: Math.random() * Math.PI * 2, speed: 6 + f * 2, flap: 0 };
    scene.add(g);
    flocks.push(g);
  }
}
function updateBirds(dt) {
  // Pas d'oiseaux ni d'avion de ligne sur Mars : ils cassaient tout l'effet.
  for (const g of flocks) g.visible = !dansMars;
  if (dansMars) return;
  for (const g of flocks) {
    const u = g.userData;
    u.flap += dt * 6;
    g.position.x -= Math.sin(u.dir) * u.speed * dt;
    g.position.z -= Math.cos(u.dir) * u.speed * dt;
    g.rotation.y = u.dir;
    g.scale.y = 0.7 + Math.sin(u.flap) * 0.3; // wing-flap illusion
    if (Math.hypot(g.position.x - player.pos.x, g.position.z - player.pos.z) > 320) {
      u.dir = Math.random() * Math.PI * 2;
      g.position.set(
        player.pos.x + (Math.random() - 0.5) * 300,
        56 + Math.random() * 12,
        player.pos.z + (Math.random() - 0.5) * 300
      );
    }
  }
}

let plane = null;
let planeTimer = 40;
function makePlane() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xf2f2f4 });
  const accent = new THREE.MeshBasicMaterial({ color: 0xd83a3a });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 7, 10), mat);
  body.rotation.z = Math.PI / 2; // along x, the travel axis
  g.add(body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 10), mat);
  g.add(wing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.2), accent);
  fin.position.set(-3, 1, 0);
  g.add(fin);
  return g;
}
function updatePlane(dt) {
  if (dansMars) { if (plane) plane.visible = false; return; }
  if (plane) plane.visible = true;
  if (!plane) {
    planeTimer -= dt;
    if (planeTimer <= 0) {
      plane = makePlane();
      const side = Math.random() < 0.5 ? -1 : 1;
      plane.position.set(player.pos.x - side * 380, 88, player.pos.z + (Math.random() - 0.5) * 200);
      plane.userData.vx = side * 18;
      if (side < 0) plane.rotation.y = Math.PI;
      scene.add(plane);
    }
    return;
  }
  plane.position.x += plane.userData.vx * dt;
  if (Math.abs(plane.position.x - player.pos.x) > 420) {
    scene.remove(plane);
    plane = null;
    planeTimer = 50 + Math.random() * 100;
  }
}

// --- underwater tint / debug -----------------------------------------------------------

const waterTint = document.getElementById('water-tint');
const debugEl = document.getElementById('debug');
let fpsSamples = [];
// Le diagnostic lit le temps RÉEL entre deux images, pas `dt` : `dt` est borné
// à un vingtième de seconde, et une image de 300 ms y compterait pour 20 i/s.
let diagDerniere = 0;
const diagImages = [];   // durées réelles des deux dernières secondes, en ms
if (DIAG) debugEl.style.cssText = 'display:block;position:fixed;top:0;left:0;right:0;z-index:60;font:12px/1.35 monospace;color:#fff;background:rgba(0,0,0,.6);padding:4px 8px;white-space:pre-wrap;pointer-events:none';

function updateHud(dt) {
  const eye = player.eyePosition();
  const eyeBlock = world.getBlock(Math.floor(eye.x), Math.floor(eye.y), Math.floor(eye.z));
  waterTint.style.display = eyeBlock === BLOCK.WATER ? 'block' : 'none';

  fpsSamples.push(1 / dt);
  if (fpsSamples.length > 30) fpsSamples.shift();
  const fps = Math.round(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length);
  if (!DIAG) {
    debugEl.textContent =
      `${fps} fps | xyz: ${player.pos.x.toFixed(1)} ${player.pos.y.toFixed(1)} ${player.pos.z.toFixed(1)}` +
      ` | chunks: ${chunkMeshes.size}${player.flying ? ' | flying' : ''}`;
    return;
  }
  const now = performance.now();
  if (diagDerniere) diagImages.push([now, now - diagDerniere]);
  diagDerniere = now;
  while (diagImages.length && diagImages[0][0] < now - 2000) diagImages.shift();
  const durees = diagImages.map((d) => d[1]).sort((a, b) => a - b);
  const mediane = durees.length ? durees[Math.floor(durees.length / 2)] : 0;
  const pire = durees.length ? durees[durees.length - 1] : 0;
  const info = renderer.info;
  const h = humainsPrets();
  debugEl.textContent =
    `${mediane ? (1000 / mediane).toFixed(0) : '–'} i/s médiane · pire image ${pire.toFixed(0)} ms · ${info.render.calls} appels · ${(info.render.triangles / 1000).toFixed(0)}k tri · ${info.programs ? info.programs.length : '?'} prog\n`
    + `graphismes ${graphismes()} · dpr ${renderer.getPixelRatio().toFixed(2)} (${canvas.width}×${canvas.height}) · ombres ${renderer.shadowMap.enabled ? 'ON' : 'off'} · reflets ${REFLETS_ACTIFS ? 'ON' : 'off'} · lampes ${LAMPES_ACTIVES ? 'ON' : 'off'}\n`
    + `morceaux ${chunkMeshes.size} · corps ${h.prets}/${h.total} · programmes chauffés ${programmesChauffes()} · ${myName() || ''} ${player.pos.x.toFixed(0)},${player.pos.z.toFixed(0)}`;
}

// --- fun & social systems (breeding, riding, duels, souvenirs, records…) ---------

const fun = initFun({
  scene, world, player, creatureManager, animalManager, edu, cloud, canvas,
  renderNow: () => renderer.render(scene, camera),
  emojiBurst,
  toast: (m, c) => creatureManager.toast(m, c),
  myName,
  getNet: () => net,
  remotePlayers: () => remotePlayers,
  isRunning: () => running,
  isNight: () => Math.sin((dayTime / DAY_LENGTH) * Math.PI * 2) < -0.05,
  getWeather: () => weather,
  getPosCtx: () => posCtx,
  // Les convois n'existent qu'une fois le monde bâti : on les demande au
  // moment de s'en servir, pas au moment de brancher les boutons.
  getVehicules: () => vehicules,
  vehiculeDistant: (id) => { const rp = remotePlayers.get(id); return rp && rp.vehicule ? rp.vehicule : null; },
  // Les photos voyagent sur leur propre document depuis qu'elles pesaient un
  // tiers du profil et faisaient jeter les blocs de l'enfant.
  photos: {
    pousser: () => profileSync.photosPousser().catch(() => {}),
    tirer: () => profileSync.photosTirer().catch(() => []),
  },
});

// --- main loop -------------------------------------------------------------------------

// console/debug handle
window.__syncRemotePlayers = syncRemotePlayers; // pour les tests d'animation
window.__admin = admin;
window.__fx = effects;
// permet aux captures automatisées de figer l'heure du jour
window.__setDayTime = (fraction) => { dayTime = fraction * DAY_LENGTH; };
// Le ciel du moment, tel que le joueur le voit : c'est ce que les tests
// comparent entre deux tablettes du même monde.
window.__ciel = () => ({ h: dayTime / DAY_LENGTH, meteo: weather });
window.__setMeteo = (m) => {
  weather = m;
  rainPoints.visible = weather === 'rain';
  weatherTimer = 999;   // on éprouve la synchronisation, pas le hasard
};
window.__eau = () => waterMaterial.userData.temps.value;
window.__carte = carte;   // les tests regardent la vue et la pilotent
window.__alerte = (k, v, t) => alerte(k, v, t);
window.__vehicules = {
  etat: () => vehicules?.etat(),
  point: (ci, avance) => vehicules?.point(ci, avance),
  placeProche: (rayon) => vehicules?.placeProche(player.pos, rayon),
};
window.__vie = { effectif: () => vie?.effectif(), sites: () => vie?.sites, eteindre: (v) => vie?.eteindre(v) };
// Pour les tests : ce que la nuit fait aux fenêtres. `solide` est le niveau
// de lumière du monde, `fenetres` celui des vitres allumées — la nuit, le
// second doit dominer, sinon la ville est éteinte.
// Depuis la v247 les murs sont ÉCLAIRÉS et non teintés : leur niveau de
// lumière est celui que reçoit un mur VERTICAL — la moitié de l'hémisphère
// (un mur voit moitié ciel, moitié sol) et la moitié du soleil ou de la lune
// (en moyenne sur les orientations) — pas la couleur du matériau, qui reste
// blanche. À minuit : 0,27 ; à midi : 1,0.
window.__lumiere = () => ({
  solide: Math.round((hemiLight.intensity * 0.5 + sunLight.intensity * 0.5) * 100) / 100,
  fenetres: Math.round(litMaterial.color.r * 100) / 100,
  morceauxEclaires: [...chunkMeshes.values()].filter((e) => e.lumineux).length,
});
// pour les tests : déclencher la proposition d'alertes sans attendre la minute
window.__proposerNotifs = proposerNotifs;
window.__siege = { phase: () => siege?.phase(), forcer: (p) => siege?.forcer(p) };
window.__game = { villeRealiste, renderer, world, player, fun, horizon, scene, camera, chunkMeshes, lampesRue, statsMaillage, get maillageDistant() { return !!maillageDistant; }, get avatarLocal() { return avatarLocal; }, get vehicules() { return vehicules; }, get passants() { return passants; }, get poissons() { return poissons; }, __archi: ARCHI, __paris: { PARIS: PARIS_ANCRE }, creatureManager, animalManager, edu, cloud, identity, admin, profileSync, deviceId, pushPlayTime, pullPlayTime, __netFx: netFx, __leaving: leaving, __montrerBandeau: montrerBandeau, __alerte: alerte, __pushPresence: () => envoyerPrefs(), __presenceNow: presenceNow, __reprendreMonde: rememberWorld, get net() { return net; }, get remotePlayers() { return remotePlayers; }, get marlon() { return marlon; }, get cornichon() { return cornichon; }, get npcs() { return npcs; }, get running() { return running; } };

let lastTime = performance.now();
let derniereMesureVue = 0;

// Le vol prend son élan au bout de quelques secondes. Sans un mot, l'enfant
// croit à un bug ; avec ce mot, il comprend qu'il vient de gagner quelque chose.
let elanAnnonce = false;
let croisiereAnnonce = false;
function signalerElanDeVol() {
  const lance = player.volLance();
  if (lance && !elanAnnonce) creatureManager.toast('🚀 Vol rapide — et ça continue d\'accélérer !', 0x6ec8ff);
  elanAnnonce = lance;
  // Puis la vitesse grandit sans bruit — sauf une fois, au sommet : l'enfant
  // sait qu'il tient sa vitesse de croisière et qu'insister ne donnera plus.
  const croisiere = player.volCroisiere && player.volCroisiere();
  if (croisiere && !croisiereAnnonce) creatureManager.toast('✈️ Vitesse de croisière — le monde défile !', 0x9fd8ff);
  croisiereAnnonce = croisiere;
}

function frame(now) {
  // L'horodatage fourni par requestAnimationFrame est celui du DÉBUT de la
  // frame, qui peut précéder le moment où lastTime a été posé : le tout premier
  // dt ressortait négatif, et repartait à l'envers dans la physique, les
  // animaux et le compteur de temps de jeu. Le plancher à zéro le neutralise.
  const dt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.05);
  lastTime = now;

  // LE FILET DE L'ÉCRAN. Deux fois par seconde, on vérifie que ce qu'on dessine
  // a bien la taille de la boîte qu'on remplit. Aucun événement du navigateur
  // n'est alors nécessaire : quoi qu'iOS oublie de nous dire en rendant la main
  // à l'application, l'écran se répare tout seul en moins d'une demi-seconde,
  // sans que l'enfant ait à tuer l'application et à la rouvrir.
  // EN TEMPS RÉEL, pas en rendus : l'ancien compteur (30 frames) tenait la
  // demi-seconde à 60 i/s — mais l'écran cassé arrive précisément quand les
  // images bégaient, au réveil de l'application. À trois images par seconde,
  // trente rendus font dix secondes d'écran à moitié noir.
  if (now - derniereMesureVue > 500) { derniereMesureVue = now; ajusterLaVue(); }

  if (running) {
    player.update(dt);
    signalerElanDeVol();
    creatureManager.update(dt);
    animalManager.update(dt);
    garagiste(dt);
    aeroportiste(dt);
    animerLesVilles(dt);
    // Les personnages lointains — la garnison du château, les astronautes de
    // Mars — n'ont pas besoin d'être animés : personne ne les voit, et leur
    // collision forcerait à garder en mémoire des chunks à l'autre bout de la
    // carte.
    //
    // ET ILS N'ONT PAS BESOIN D'ÊTRE DESSINÉS NON PLUS. On avait cessé de les
    // ANIMER au-delà de cent quarante blocs, jamais de les rendre : leurs
    // maillages partaient au dessin à chaque image, où qu'ils soient.
    //
    // Signalé par Max sur son iPad — « ce n'est pas très fluide, c'est
    // saccadé ». Mesuré à la sonde, au centre de Paris : 1 522 appels de
    // dessin, dont 1 353 pour des personnages — QUATRE-VINGT-NEUF POUR CENT.
    // Et sur les cent cinquante-trois personnages du monde, CENT TREIZE
    // étaient à plus de quatre-vingt-dix blocs. Un personnage est fait de onze
    // maillages — un par membre articulé, plus son verre — et c'est le prix
    // d'une marche qui se voit ; à quatre-vingt-dix blocs, il fait quatorze
    // pixels de haut et personne ne regarde ses jambes.
    //
    // Un seul propriétaire de la visibilité : la présence se fond en distance
    // et en temps. Ni le site ni le recyclage ne coupe un personnage visible.
    for (const npc of npcs) {
      const distance = npc.pos.distanceTo(player.pos);
      if (!actualiserPresence(npc, distance, dt, !npc.sommeilForce)) continue;
      npc.__tempsAnimation = (npc.__tempsAnimation || 0) + dt;
      if(distance < 35 || npc.__tempsAnimation >= (distance < 80 ? .066 : .1)){
        npc.update(npc.__tempsAnimation); npc.__tempsAnimation = 0;
      }
    }
    siege?.update(dt);
    vie?.update(dt);
    vehicules?.update(dt);
    majPastilleSiege();
  } else {
    player.syncCamera();
  }

  updateChunks();

  // LE PAYSAGE LOINTAIN SE DÉFILE, IL NE SE REFAIT PAS (leçon de la minicarte).
  // Le remplissage est borné en temps, comme le maillage ; la découpe — les
  // cases qu'on retire parce que le vrai monde les couvre — se refait à une
  // cadence en TEMPS RÉEL, jamais en `dt` (leçon de la v226).
  horizon.maj(player.pos.x, player.pos.z, 6);
  // La découpe se refait à une cadence en TEMPS RÉEL, et tout de suite si le
  // joueur a franchement tourné la tête — sinon le cône de vision découvrirait
  // un quart de seconde de ciel vide au milieu d'un virage.
  const vise = -Math.sin(player.yaw), viseZ = -Math.cos(player.yaw);
  if (horizonDecoupe() || Math.abs(player.yaw - horizonCap) > 0.5) {
    horizonCap = player.yaw;
    horizon.majDecoupe((cx, cz) => chunkMeshes.has(World.key(cx, cz)),
      player.pos.x, player.pos.z, vise, viseZ);
  }
  updateSky(dt);
  updateWeather(dt);
  updateClouds(dt);
  updateBirds(dt);
  updatePlane(dt);
  seasonPoints.visible=!renduDansManhattan;
  if (!renduDansManhattan) updateSeasons(dt);
  updateHud(dt);
  updateCreatureLabel();
  updateRemotePlayers(dt);
  // LE MODE ÉDUCATIF REÇOIT DU TEMPS RÉEL, PAS LE `dt` DE LA PHYSIQUE (v234).
  // `dt` est borné à un vingtième de seconde — juste pour que la chute de
  // cadence ne fasse pas traverser les murs — et compter la journée d'un
  // enfant avec lui la multipliait par quatre sur une tablette qui rame.
  // Mesuré : douze secondes réelles retenues comme trois à cinq images par
  // seconde. C'est ici que le choix d'horloge se fait, parce que c'est ici
  // qu'on sait ce que `dt` vaut.
  edu.update(dtEcran(), running);
  fun.update(dt);
  majBoutonsVehicule();
  asseoirLeConducteur(dt);
  effects.update(dt);

  // LA CARTE SE RAFRAÎCHIT QUAND ON A BOUGÉ, PAS QUAND UNE HORLOGE SONNE.
  // Debout sans bouger, il n'y a rien à redessiner et l'ancien code le faisait
  // quand même ; en vol, une seconde d'horloge valait soixante-quatorze blocs
  // de retard. Le déclencheur est donc la DISTANCE, bornée par une cadence en
  // temps réel — jamais en `dt`, qui ralentit avec l'affichage (leçon v226).
  if (minimapVisible) {
    const bouge = !carteVue
      || Math.hypot(player.pos.x - carteVue.x, player.pos.z - carteVue.z) >= CARTE_PAS;
    // le fond se repeint par bandes à chaque image (v258), et l'affichage se
    // refait toutes les 120 ms — le raster défile de lui-même quand l'enfant
    // a changé de bloc, et les bandes repeintes se montrent
    repeindreBandeCarte(carteTours ? 2 : 4, 4);
    if (bouge || carteSuivre()) {
      drawMap(minimapCanvas, 96);
      carteVue = { x: player.pos.x, z: player.pos.z };
    }
  } else if (!running && PREPARER && PARAMS_JEU.get('prepmini') !== '0') {
    // à l'accueil, la minicarte se prépare autour de l'enfant (v258) : son
    // premier fond, 37 000 colonnes, ne coûte rien à l'image où on l'allume.
    // UN tour, puis on s'arrête : une boucle sans fin à l'accueil retenait
    // la mise à jour du service worker (voir `repeindreBandeCarte`).
    assurerRasterCarte(96);
    if (!carteTours) repeindreBandeCarte(4, 8);
  }

  const hit = running ? getTarget() : null;
  highlight.visible = !!hit;
  if (hit) highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);

  // Les reflets de la carrosserie : la caméra cubique ne tourne que quand une
  // voiture est à portée de regard, et deux fois par seconde — six rendus de
  // 128 px, rien quand on est à pied loin de tout. Et depuis la v245, UNE
  // face par image : les six faces dans la même image faisaient l'à-coup
  // que Max sentait au volant (voir `avancerReflets`).
  refletsHorloge -= dt;
  if (refletsHorloge <= 0) {
    refletsHorloge = 0.5;
    const voitureProche = animalManager.animals.find((a) => a.def.key === 'voiture'
      && Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z) < 45);
    if (REFLETS_ACTIFS && voitureProche && refletsVoiture()) lancerReflets(voitureProche.pos);
  }
  avancerReflets(renderer, scene);

  eclairerLaRue();
  villeRealiste.update(dayTime / DAY_LENGTH, weather, now);
  renduDansManhattan=villeRealiste.active;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// the game is ready: fade out the boot loader (the SW update script may
// bring it back if a new version starts downloading)
requestAnimationFrame(() => {
  // APRÈS UNE MISE À JOUR, LE LOADER RESTE JUSQU'À CE QUE LE JEU RÉPONDE (v257).
  //
  // Max : « le jeu reste quasiment bloqué une ou deux minutes sur l'accueil
  // après chaque mise à jour » ; « s'il y a une installation nécessaire qui
  // prend une minute, mets un loader ». À la première image le loader
  // disparaissait, et l'accueil se montrait pendant que le fil principal
  // analysait huit mégaoctets de corps et compilait quarante programmes : un
  // accueil qu'on voit et qui ne répond pas. Sur une page qui vient d'être
  // rechargée pour une version neuve (`wm-maj-installe`, posé par index.html
  // avant le rechargement), le loader dit « installation… » avec l'avancement
  // et ne s'efface que quand corps et programmes sont là — borné à quatre-vingt-
  // dix secondes, pour ne jamais retenir un enfant. Un démarrage ordinaire ne
  // change pas.
  const loader = document.getElementById('boot-loader');
  // LA POSITION LOCALE SE RESTAURE À L'ACCUEIL, PAS AU CLIC (v258). Le monde
  // se chargeait autour du point d'apparition pendant que l'enfant lisait
  // l'accueil, puis « Jouer » le téléportait là où il s'était arrêté — et
  // tout se rechargeait sous ses yeux. Restauré ici, le monde autour de lui
  // (et le fond de la carte) se préparent pendant l'accueil.
  if (world.ctx === 'local') restorePosition();
  let apresMaj = false;
  try { apresMaj = sessionStorage.getItem('wm-maj-installe') === '1'; } catch { /* mode privé */ }
  if (!apresMaj) loader.classList.add('hidden');
  // Les corps réalistes (8 Mo) arrivent MAINTENANT, pas avant : l'accueil
  // répond déjà, et les gens nés en attendant se mettent à niveau sur place
  // (voir humains.js). C'était le « vingt secondes avant de pouvoir cliquer »
  // de Max sur l'iPad de quatre ans.
  chargerHumains();
  // Et l'on chauffe la sonde des reflets ici, au point d'apparition : ses six
  // faces compilent les programmes du décor vu depuis une cible cubique —
  // mesuré au banc, vingt-six programmes de plus à l'arrivée de la première
  // voiture, une seconde d'image figée. Compilés pendant l'accueil, ils ne
  // coûtent rien à l'enfant qui monte en voiture.
  if (REFLETS_ACTIFS && refletsVoiture()) lancerReflets(player.pos);
  // Et les programmes de la flotte, une signature par image, pendant l'accueil
  // (v246) : vingt compilations à l'arrivée en ville, c'était le gel de la
  // téléportation.
  const chauffe = chaufferLesProgrammes(renderer, scene, camera);
  let chauffeFinie = false;
  const pas = () => { if (chauffe()) requestAnimationFrame(pas); else chauffeFinie = true; };
  requestAnimationFrame(pas);

  // LE JEU SE PRÉPARE AVANT « JOUER », ET LE BOUTON ATTEND (v258).
  //
  // Max : « ne devrait-il pas y avoir le temps de télécharger tous les
  // fichiers nécessaires avant de permettre à l'utilisateur de démarrer le
  // jeu, pour éviter une expérience de lag ? » Ce qui lague dans les
  // premières minutes n'est pas un fichier qui manque — le service worker
  // les a tous — mais ce qui se CALCULE au premier usage : les corps
  // réalistes (8 Mo à analyser, à la première visite à télécharger), les
  // programmes de la flotte, les morceaux du monde autour de l'enfant et le
  // premier fond de la carte. Tout cela se fait maintenant, pendant
  // l'accueil : la position locale est déjà restaurée (le monde se charge
  // là où il jouera, pas au point d'apparition), la carte prépare son fond
  // par tranches, et une ligne sous les boutons dit où l'on en est. « Jouer »
  // et « Jouer en ligne » sont grisés jusqu'à ce que tout soit prêt — borné
  // à quarante-cinq secondes, pour ne jamais retenir un enfant. Le banc
  // demande `?prep=0` (les suites ne mesurent pas la préparation, et leur
  // rendu logiciel analyse les corps en dix secondes) ; le témoin de `maj.js`
  // la demande, elle.
  const lignePrep = document.getElementById('prep-line');
  const boutonsPrep = ['play-btn', 'online-btn'].map((id) => document.getElementById(id)).filter(Boolean);
  // la taille que la fiche de la carte aura (sa feuille de style) : préparer
  // à cette taille, c'est ne rien avoir à recalculer à l'ouverture
  if (PREPARER && PARAMS_JEU.get('prepcarte') !== '0') {
    carte.preparer(player.pos.x, player.pos.z, 0.7,
      Math.min(560, 0.88 * window.innerWidth), Math.min(560, 0.62 * window.innerHeight));
  }
  const departPrep = performance.now();
  let prepPrete = !PREPARER;
  window.__preparation = () => ({
    gate: PREPARER, prete: prepPrete, humains: humainsCharges(), programmes: programmesChauffes(),
    aChauffer: programmesAChauffer(), carte: carte.prete(), depuis: Math.round(performance.now() - departPrep),
    // ce que la préparation de la carte a fait — un rouge « carte … » se démonte avec
    cartePas: carte.prepPas, carteErreur: carte.prepErreur, carteTravail: !!carte.travail,
  });
  const veillerPrep = () => {
    const h = humainsPrets();
    const pret = humainsCharges() && chauffeFinie && carte.prete();
    if (pret || performance.now() - departPrep > 45000) {
      prepPrete = true;
      for (const b of boutonsPrep) b.disabled = false;
      if (lignePrep) lignePrep.style.display = 'none';
      return;
    }
    if (lignePrep) {
      lignePrep.style.display = 'block';
      lignePrep.textContent = `⏳ Préparation du jeu… personnages ${h.prets}/${h.total} · programmes ${programmesChauffes()}/${programmesAChauffer()} · carte ${carte.prete() ? '✓' : '…'}`;
    }
    setTimeout(veillerPrep, 250);
  };
  if (PREPARER) { for (const b of boutonsPrep) b.disabled = true; veillerPrep(); }
  if (apresMaj) {
    const texte = document.getElementById('boot-text');
    const depart = performance.now();
    const attendre = () => {
      const h = humainsPrets();
      const pret = humainsCharges() && chauffeFinie;
      if (pret || performance.now() - depart > 90000) {
        loader.classList.add('hidden');
        try { sessionStorage.removeItem('wm-maj-installe'); } catch { /* mode privé */ }
        document.dispatchEvent(new Event('maj-installee'));
        return;
      }
      texte.textContent = `✨ Installation de la nouvelle version… personnages ${h.prets} / ${h.total}, programmes ${programmesChauffes()} / ${programmesAChauffer()}`;
      setTimeout(attendre, 250);
    };
    attendre();
  }
});

// UN SEUL MONDE, ET PAS DE BOUTON « EXPLORER NEW YORK » SUR L'ACCUEIL (v242).
// Il rechargeait la page avec `?lieu=manhattan` pour poser l'enfant à New
// York — un point d'arrivée que la carte offre déjà par téléportation, comme
// pour toute autre ville. Max : « il n'y a qu'une seule carte et ça doit
// rester le cas ». L'adresse `?lieu=manhattan` reste comprise pour les
// anciens liens ; elle ne s'affiche plus nulle part.
const badge=document.createElement('div');badge.id='manhattan-adresse';document.body.appendChild(badge);
villeRealiste.onAdresse=texte=>{badge.textContent=texte;badge.style.display=texte?'':'none';};
const invitationCarte=new URLSearchParams(location.search).get('rejoindre');
if(invitationCarte && /^\d{5}$/.test(invitationCarte)) montrerInvitation({de:'Un ami',code:invitationCarte,carte:'terre'});
