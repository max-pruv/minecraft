// Entry point: scene setup, chunk streaming, input, HUD, and the game loop.

import * as THREE from 'three';
import { BLOCK, BLOCK_INFO, HOTBAR_BLOCKS, PLACEABLE_BLOCKS, DECOR_ITEMS, DECOR_START, decorMapColor, PROP_ITEMS, PROP_START, isProp, MEUBLE_ITEMS, MEUBLE_START, isMeuble, ARCHI } from './blocks.js';
import { PARIS as PARIS_ANCRE } from './paris.js';
import { buildPropMesh } from './props.js';
import { AnimalManager } from './animals.js';
import { createAtlas, tileUV, activerTuilage, ATLAS_COLS, ATLAS_ROWS, TILE_PX } from './textures.js';
import { World, CHUNK, WATER_LEVEL, HEIGHT, CITIES, PLACES, MARS, VILLE, CIRCUIT } from './world.js';
import { POLE } from './pole.js';
import { buildChunkGeometry } from './mesher.js';
import { Carte, MAP_COLORS } from './carte.js';
import { createEffects } from './effects.js';
import { createSky } from './sky.js';
import { createSiege } from './siege.js';
import { createVie } from './vie.js';
import { createVehicules } from './vehicules.js';
import { traceAnneau } from './ville.js';
import { traceCourse } from './circuit.js';
import { Player, raycastBlocks } from './player.js';
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

const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
// doubled view distance; ?rr= overrides (perf tuning and tests)
const RENDER_RADIUS = Number(new URLSearchParams(location.search).get('rr')) || (IS_TOUCH ? 12 : 16);
const UNLOAD_RADIUS = RENDER_RADIUS + 2;
// Millisecondes maximum consacrées par frame à construire des chunks. À 60 fps
// une frame dure 16,7 ms : en laisser 6 au terrain garde de la marge pour le
// reste du jeu et rend les gels structurellement impossibles.
const MESH_BUDGET_MS = 6;
const REMESH_BUDGET_MS = 8;
const REACH = 5.5;                   // block interaction distance
const DAY_LENGTH = 600;              // seconds for a full day/night cycle

// --- renderer / scene -------------------------------------------------------

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Sans le troisième argument, setSize écrit la taille en dur dans le style du
// canvas et l'emporte sur la feuille de style — c'est ainsi qu'une mesure
// fausse devenait une bande noire. La vraie taille est posée par
// ajusterLaVue(), juste en dessous, une fois la caméra créée.
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
const DAY_SKY = new THREE.Color(0x87ceeb);
const NIGHT_SKY = new THREE.Color(0x0b1026);
scene.background = DAY_SKY.clone();
scene.fog = new THREE.Fog(scene.background, RENDER_RADIUS * CHUNK * 0.55, RENDER_RADIUS * CHUNK - 4);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 900);

// Lights only affect Lambert materials (the high-fidelity creatures);
// blocks keep their baked flat look via MeshBasic + vertex AO.
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x88aa77, 1.0);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xfff4e0, 0.8);
sunLight.position.set(0.6, 1, 0.4);
scene.add(sunLight);

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
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

// Basic materials + baked per-face shading = the classic flat Minecraft look.
// material.color doubles as the global light level for day/night.
const solidMaterial = new THREE.MeshBasicMaterial({
  map: atlasTexture, vertexColors: true, alphaTest: 0.25,
});
const waterMaterial = new THREE.MeshBasicMaterial({
  map: atlasTexture, vertexColors: true, transparent: true, opacity: 0.7,
  depthWrite: false, side: THREE.DoubleSide,
});

// Les faces du terrain sont fusionnées : une seule d'entre elles peut couvrir
// seize blocs, ses UV vont donc au-delà de 1 et c'est le shader qui les ramène
// dans la bonne tuile de l'atlas. L'eau y ajoute son clapot.
activerTuilage(solidMaterial);
activerTuilage(waterMaterial, { onde: true });

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

const world = new World();
world.loadEdits();

const player = new Player(camera, world);
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

// Spawn on land near the origin.
(function findSpawn() {
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
  for (const mesh of [entry.solid, entry.water]) {
    if (!mesh) continue;
    scene.remove(mesh);
    mesh.geometry.dispose();
  }
  // prop groups share template geometry — just detach them
  if (entry.props) scene.remove(entry.props);
}

function meshChunk(cx, cz) {
  const key = World.key(cx, cz);
  const old = chunkMeshes.get(key);
  if (old) disposeChunkMesh(old);

  const { solid, water, props } = buildChunkGeometry(world, cx, cz);
  const entry = { solid: null, water: null, props: null };
  if (solid) {
    entry.solid = new THREE.Mesh(solid, solidMaterial);
    entry.solid.position.set(cx * CHUNK, 0, cz * CHUNK);
    scene.add(entry.solid);
  }
  if (water) {
    entry.water = new THREE.Mesh(water, waterMaterial);
    entry.water.position.set(cx * CHUNK, 0, cz * CHUNK);
    scene.add(entry.water);
  }
  if (props.length > 0) {
    const group = new THREE.Group();
    for (const p of props) {
      const mesh = buildPropMesh(p.id);
      if (!mesh) continue;
      mesh.position.set(cx * CHUNK + p.x + 0.5, p.y, cz * CHUNK + p.z + 0.5);
      group.add(mesh);
    }
    entry.props = group;
    scene.add(group);
  }
  chunkMeshes.set(key, entry);
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
      }
    }
  }

  // Budget de temps plutôt qu'un nombre fixe de chunks : un chunk chargé
  // (château, forêt dense) ne peut plus geler la frame à lui tout seul. Au pire
  // le paysage lointain arrive une frame plus tard, derrière le brouillard.
  const debut = performance.now();
  do {
    const suivant = meshQueue.pop();
    if (!suivant) break;
    meshChunk(suivant.cx, suivant.cz);
  } while (performance.now() - debut < MESH_BUDGET_MS);

  // Changement de monde : le terrain en mémoire porte encore les blocs de
  // l'ancien, tous les maillages sont à refaire.
  if (world.allDirty) {
    world.allDirty = false;
    for (const key of chunkMeshes.keys()) world.dirty.add(key);
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

  // Ce qui roule tout seul : les rames du métro aérien autour de la ville, et
  // les monoplaces sur le circuit. Les deux tracés viennent des bâtisseurs
  // eux-mêmes, si bien qu'un train ne peut pas rouler à côté de sa voie.
  vehicules = createVehicules({ scene, player });
  vehicules.metro(traceAnneau(VILLE, world.terrainHeight(VILLE.x, VILLE.z)));
  vehicules.course(traceCourse(CIRCUIT, world.terrainHeight(CIRCUIT.x, CIRCUIT.z)));
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
let posCtx = 'local';
const posRestored = new Set();
const posAppliquee = new Map(); // contexte -> horodatage de la position posée
let posEntree = 0;              // instant d'entrée dans le contexte courant

function loadPositions() {
  try { return JSON.parse(localStorage.getItem(POS_KEY)) || {}; } catch { return {}; }
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
  let y = HEIGHT - 1;
  while (y > 1 && !world.isSolid(Math.floor(x), y, Math.floor(z))) y--;
  return y + 1;
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
  const p = state && state.pos && state.pos[posCtx];
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
  posCtx = 'local';
  restorePosition();
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
  if (e.code === 'KeyF') player.toggleFly();
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

document.getElementById('fly-btn').addEventListener('touchstart', (e) => {
  e.preventDefault();
  player.toggleFly();
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
function renderSettings() { gyroToggle.classList.toggle('on', !!settings.gyro); }
renderSettings();

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

animalManager.onHarvest = (def) => {
  meatCount++;
  try { localStorage.setItem(MEAT_KEY, String(meatCount)); } catch { /* ignore */ }
  renderMeat();
  creatureManager.toast(`${def.meat} +1 ! (garde-manger : ${meatCount})`, 0xffd75e);
  emojiBurst([def.meat.split(' ')[0], '✨'], 10);
  fun.onHarvest(def); // the item also goes into the bag (crafting, quests, chest)
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
    await cloud.prefsPush(cleInvit(nom), { de: myName(), code: net.code, at: Date.now() });
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
  positionDuCloud(state);
  if (!state || !state.edits) return;
  const applied = world.mergeEdits(state.edits[world.ctx]);
  if (applied > 0) {
    world.saveEdits();
    creatureManager.toast(`☁️ ${applied} blocs arrivés d'un autre appareil !`, 0x9fd8e8);
  }
};
profileSync.start();

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
// plus à l'attendre au moment où il veut se faire reconnaître.
prefetchScanner();

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
  const worlds = loadWorlds();
  if (worlds.length === 0) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:13px;color:#8894b0;';
    hint.textContent = 'Aucun monde pour l\'instant — crée-en un juste en dessous !';
    row.appendChild(hint);
    return;
  }
  for (const w of worlds) {
    const chip = document.createElement('div');
    chip.className = 'world-chip';
    const btn = document.createElement('button');
    btn.className = 'world-btn';
    btn.textContent = `🌍 Monde ${w.code}`;
    btn.addEventListener('click', () => openWorld(w.code));
    const open = document.createElement('button');
    open.className = 'world-open';
    open.textContent = 'Jouer ➜';
    open.title = 'Entrer dans ce monde';
    open.addEventListener('click', () => openWorld(w.code));
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
      scene.remove(l.mesh);
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
      rp = { mesh, target: null, yaw: 0, moving: false, animTime: 0, name: p.name, pop: 0.5 };
      remotePlayers.set(p.id, rp);
      if (p.pos) mesh.position.set(p.pos.x, p.pos.y, p.pos.z);
      mesh.scale.setScalar(0.01); // grandit depuis rien, cf. updateRemotePlayers
      joinEffect(mesh.position, p.name || 'Un ami');
    }
    if (p.pos) rp.target = p.pos;
    rp.yaw = p.yaw || 0;
    rp.moving = p.moving;
  }
  for (const [id, rp] of remotePlayers) {
    if (!seen.has(id)) {
      // on ne retire pas tout de suite : leaveEffect fait disparaître le corps
      leaveEffect(rp.mesh, rp.name || 'Un ami');
      remotePlayers.delete(id);
    }
  }
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
    if (rp.target) {
      const t = Math.min(1, dt * 10);
      rp.mesh.position.x += (rp.target.x - rp.mesh.position.x) * t;
      rp.mesh.position.y += (rp.target.y - rp.mesh.position.y) * t;
      rp.mesh.position.z += (rp.target.z - rp.mesh.position.z) * t;
    }
    let dy = rp.yaw + Math.PI - rp.mesh.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    rp.mesh.rotation.y += dy * Math.min(1, dt * 10);
    rp.animTime += dt;
    const swing = rp.moving ? Math.sin(rp.animTime * 9) * 0.6 : 0;
    rp.mesh.userData.legs.forEach((leg, i) => { leg.rotation.x = i % 2 ? -swing : swing; });
    rp.mesh.userData.arms.forEach((arm, i) => { arm.rotation.x = i % 2 ? swing * 0.7 : -swing * 0.7; });
  }
}

function startNetSession(code, isHost, patience) {
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
  net.getPos = () => ({
    x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw,
    moving: Math.abs(player.vel.x) + Math.abs(player.vel.z) > 0.5,
  });
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
async function reprendreLeMonde(code, essai = 0) {
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
    alerte('monde-reco', true, `Reconnexion au monde ${code}…`);
    setTimeout(() => reprendreLeMonde(code, essai + 1), 4000);
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
  if (err && !err.signal) {
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
    if (err && err.canal) {
      // Deux pannes, deux conseils. Quand aucun relais n'a répondu, le réseau
      // lui-même barre la route — hôtel, école, gare, café : couper un VPN
      // n'y changera rien, il faut sortir de ce Wi-Fi. Quand un relais a bien
      // répondu mais que le lien n'aboutit pas, la cause la plus fréquente à
      // la maison reste le VPN resté allumé.
      err = new Error(err.reseauFerme
        ? `Le monde ${code} existe, mais ce Wi-Fi bloque le jeu à plusieurs. `
          + 'C\'est fréquent dans les hôtels, les écoles et les gares. '
          + 'Essaie le partage de connexion d\'un téléphone, ou un autre Wi-Fi. '
          + '(Un VPN allumé fait pareil.)'
        : `Le monde ${code} existe, mais ta tablette n'arrive pas à le joindre. `
          + 'Un VPN ou un réseau protégé bloque souvent le jeu à plusieurs — demande à un parent de le couper.');
    }
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
  cloud.attach(code);
  onlineStatus.textContent = '';
  onlineMenu.style.display = 'none';
  showOnlineUI();
  posCtx = code;
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
    const mesh = buildKidMesh(withOwnLook(c.look));
    mesh.rotation.y = -0.35; // three-quarter pose
    sc.add(mesh);
    r.render(sc, cam2);
    return r.domElement.toDataURL();
  });
  r.dispose();
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
  net.onDuplicate = (name) => {
    leaveToMainMenu();
    window.alert(`⚠️ ${name} joue déjà dans ce monde depuis un autre appareil !\nChaque joueur ne peut être connecté qu'à un seul endroit à la fois.`);
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
  fun.attachNet(net); // duels, emotes, signs and the shared chest
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
  cloud.attach(net.code);
  onlineMenu.style.display = 'none';
  showOnlineUI();
  posCtx = net.code;
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
    const applied = world.mergeEdits((state.edits || {})[world.ctx]);
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
    const item = isMeuble(id) ? MEUBLE_ITEMS[id - MEUBLE_START] : PROP_ITEMS[id - PROP_START];
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

function buildInventory() {
  const grid = document.getElementById('inv-grid');
  const pager = document.getElementById('inv-pager');
  grid.innerHTML = '';
  document.querySelectorAll('#inv-tabs button').forEach((b) =>
    b.classList.toggle('active', b.dataset.tab === invTab));

  pager.style.display = 'none';
  if (invTab === 'blocks') {
    for (const id of PLACEABLE_BLOCKS) grid.appendChild(invCell(id));
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
let minimapTimer = 0;

function drawMap(mapCanvas, radius) {
  const ctx = mapCanvas.getContext('2d');
  const size = mapCanvas.width;
  const scale = size / (radius * 2 + 1);
  const pcx = Math.floor(player.pos.x), pcz = Math.floor(player.pos.z);
  const img = ctx.createImageData(size, size);

  for (let py = 0; py < size; py++) {
    const wz = pcz + Math.floor(py / scale) - radius;
    for (let pxx = 0; pxx < size; pxx++) {
      const wx = pcx + Math.floor(pxx / scale) - radius;
      let color = [20, 26, 40], h = 0;
      for (let y = HEIGHT - 1; y >= 0; y--) {
        const id = world.getBlock(wx, y, wz);
        if (id !== BLOCK.AIR) {
          color = MAP_COLORS[id] || (id >= DECOR_START && decorMapColor(id)) || [150, 150, 150];
          h = y;
          break;
        }
      }
      const shade = 0.65 + (h / HEIGHT) * 0.6; // higher terrain reads brighter
      const o = (py * size + pxx) * 4;
      img.data[o] = Math.min(255, color[0] * shade);
      img.data[o + 1] = Math.min(255, color[1] * shade);
      img.data[o + 2] = Math.min(255, color[2] * shade);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

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
    for (const c of [...CITIES, ...PLACES]) {
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
  let y = HEIGHT - 1;
  while (y > 1 && !world.isSolid(bx, y, bz)) y--;
  let sol = y + 1;
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
}
function fermerCarte() {
  carte.fermer();
  mapModal.style.display = 'none';
  carteOuverte = false;
  // On rend la souris au jeu, comme à la fermeture de l'inventaire : la
  // fermeture est elle-même le geste que le navigateur exige pour cela.
  if (!IS_TOUCH && !dragLook && !edu.quizActive) startGame();
}

document.getElementById('map-plus').addEventListener('click', () => {
  const c = mapModalCanvas.getBoundingClientRect();
  carte.zoomerVers(c.width / 2, c.width / 2, 1.7);
});
document.getElementById('map-moins').addEventListener('click', () => {
  const c = mapModalCanvas.getBoundingClientRect();
  carte.zoomerVers(c.width / 2, c.width / 2, 1 / 1.7);
});
document.getElementById('map-moi').addEventListener('click', () => carte.centrerSurJoueur(0.6));
document.getElementById('map-tout').addEventListener('click', () => carte.toutVoir());

document.getElementById('map-btn').addEventListener('click', () => {
  minimapVisible = !minimapVisible;
  minimapCanvas.style.display = minimapVisible ? 'block' : 'none';
  if (minimapVisible) drawMap(minimapCanvas, 96);
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

function updateSky(dt) {
  dayTime = (dayTime + dt) % DAY_LENGTH;
  const angle = (dayTime / DAY_LENGTH) * Math.PI * 2;
  // daylight: 1 at noon, 0 at midnight, smooth transitions
  const daylight = THREE.MathUtils.clamp(Math.sin(angle) * 1.6 + 0.5, 0.08, 1);

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
  solidMaterial.color.copy(lightColor);
  waterMaterial.color.copy(lightColor);
  hemiLight.intensity = (0.3 + 0.8 * daylight) * wDim;
  sunLight.intensity = 0.15 + 0.75 * daylight * wDim;

  // le soleil, la lune et les étoiles suivent le même cycle
  sky.update(angle, daylight, camera.position);

  // L'eau avance sur son propre compteur : dayTime revient à zéro toutes les
  // dix minutes, ce qui ferait sauter les vagues d'un coup.
  tempsEau += dt;
  waterMaterial.userData.temps.value = tempsEau;
}
let tempsEau = 0;
const SUNSET_SKY = new THREE.Color(0xff8a4a);
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

function updateHud(dt) {
  const eye = player.eyePosition();
  const eyeBlock = world.getBlock(Math.floor(eye.x), Math.floor(eye.y), Math.floor(eye.z));
  waterTint.style.display = eyeBlock === BLOCK.WATER ? 'block' : 'none';

  fpsSamples.push(1 / dt);
  if (fpsSamples.length > 30) fpsSamples.shift();
  const fps = Math.round(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length);
  debugEl.textContent =
    `${fps} fps | xyz: ${player.pos.x.toFixed(1)} ${player.pos.y.toFixed(1)} ${player.pos.z.toFixed(1)}` +
    ` | chunks: ${chunkMeshes.size}${player.flying ? ' | flying' : ''}`;
}

// --- fun & social systems (breeding, riding, duels, quests, records…) -------------

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
  getProfiles: () => loadRegistry().list.map((p) => ({ id: p.id, name: p.name })),
  getMeat: () => meatCount,
  takeMeat: (n) => {
    if (meatCount < n) return false;
    meatCount -= n;
    try { localStorage.setItem(MEAT_KEY, String(meatCount)); } catch { /* ignore */ }
    renderMeat();
    return true;
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
window.__vehicules = { etat: () => vehicules?.etat() };
window.__vie = { effectif: () => vie?.effectif(), sites: () => vie?.sites, eteindre: (v) => vie?.eteindre(v) };
// pour les tests : déclencher la proposition d'alertes sans attendre la minute
window.__proposerNotifs = proposerNotifs;
window.__siege = { phase: () => siege?.phase(), forcer: (p) => siege?.forcer(p) };
window.__game = { renderer, world, player, __archi: ARCHI, __paris: { PARIS: PARIS_ANCRE }, creatureManager, animalManager, edu, cloud, identity, admin, profileSync, deviceId, pushPlayTime, pullPlayTime, __netFx: netFx, __leaving: leaving, __montrerBandeau: montrerBandeau, __alerte: alerte, __pushPresence: () => envoyerPrefs(), __presenceNow: presenceNow, __reprendreMonde: rememberWorld, get net() { return net; }, get remotePlayers() { return remotePlayers; }, get marlon() { return marlon; }, get cornichon() { return cornichon; }, get npcs() { return npcs; }, get running() { return running; } };

let lastTime = performance.now();
let frameDepuisMesure = 0;

// Le vol prend son élan au bout de quelques secondes. Sans un mot, l'enfant
// croit à un bug ; avec ce mot, il comprend qu'il vient de gagner quelque chose.
let elanAnnonce = false;
function signalerElanDeVol() {
  const lance = player.volLance();
  if (lance && !elanAnnonce) creatureManager.toast('🚀 Vol rapide — tu vas deux fois plus vite !', 0x6ec8ff);
  elanAnnonce = lance;
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
  if (++frameDepuisMesure >= 30) { frameDepuisMesure = 0; ajusterLaVue(); }

  if (running) {
    player.update(dt);
    signalerElanDeVol();
    creatureManager.update(dt);
    animalManager.update(dt);
    // Les personnages lointains — la garnison du château, les astronautes de
    // Mars — n'ont pas besoin d'être animés : personne ne les voit, et leur
    // collision forcerait à garder en mémoire des chunks à l'autre bout de la
    // carte.
    for (const npc of npcs) {
      if (!npc.mesh.visible) continue;
      if (npc.pos.distanceToSquared(player.pos) < 140 * 140) npc.update(dt);
    }
    siege?.update(dt);
    vie?.update(dt);
    vehicules?.update(dt);
    majPastilleSiege();
  } else {
    player.syncCamera();
  }

  updateChunks();
  updateSky(dt);
  updateWeather(dt);
  updateClouds(dt);
  updateBirds(dt);
  updatePlane(dt);
  updateSeasons(dt);
  updateHud(dt);
  updateCreatureLabel();
  updateRemotePlayers(dt);
  edu.update(dt, running);
  fun.update(dt);
  effects.update(dt);

  if (minimapVisible) {
    minimapTimer -= dt;
    if (minimapTimer <= 0) {
      minimapTimer = 1;
      drawMap(minimapCanvas, 96);
    }
  }

  const hit = running ? getTarget() : null;
  highlight.visible = !!hit;
  if (hit) highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// the game is ready: fade out the boot loader (the SW update script may
// bring it back if a new version starts downloading)
requestAnimationFrame(() => {
  document.getElementById('boot-loader').classList.add('hidden');
});
