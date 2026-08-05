// Entry point: scene setup, chunk streaming, input, HUD, and the game loop.

import * as THREE from 'three';
import { BLOCK, BLOCK_INFO, HOTBAR_BLOCKS, PLACEABLE_BLOCKS, DECOR_ITEMS, DECOR_START, decorMapColor, PROP_ITEMS, PROP_START, isProp, CITY_BLOCK } from './blocks.js';
import { buildPropMesh } from './props.js';
import { AnimalManager } from './animals.js';
import { createAtlas, tileUV, ATLAS_COLS, ATLAS_ROWS, TILE_PX } from './textures.js';
import { World, CHUNK, WATER_LEVEL, HEIGHT, CITIES } from './world.js';
import { buildChunkGeometry } from './mesher.js';
import { Player, raycastBlocks } from './player.js';
import { CreatureManager, TYPES } from './creatures.js';
import { Marlon, Cornichon, createHeroes, createBuilders, createVillagers, buildKidMesh } from './marlon.js';
import { NetSession, randomCode } from './net.js';
import { CloudSave } from './cloud.js';
import { EducationMode, GRADES } from './education.js';

const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const RENDER_RADIUS = IS_TOUCH ? 6 : 8; // chunks in each direction (smaller on mobile GPUs)
const UNLOAD_RADIUS = RENDER_RADIUS + 2;
const MESHES_PER_FRAME = 3;
const REACH = 5.5;                   // block interaction distance
const DAY_LENGTH = 600;              // seconds for a full day/night cycle

// --- renderer / scene -------------------------------------------------------

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const DAY_SKY = new THREE.Color(0x87ceeb);
const NIGHT_SKY = new THREE.Color(0x0b1026);
scene.background = DAY_SKY.clone();
scene.fog = new THREE.Fog(scene.background, RENDER_RADIUS * CHUNK * 0.55, RENDER_RADIUS * CHUNK - 4);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 600);

// Lights only affect Lambert materials (the high-fidelity creatures);
// blocks keep their baked flat look via MeshBasic + vertex AO.
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x88aa77, 1.0);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xfff4e0, 0.8);
sunLight.position.set(0.6, 1, 0.4);
scene.add(sunLight);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

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

// --- world & player ----------------------------------------------------------

const world = new World();
world.loadEdits();

const player = new Player(camera, world);
const creatureManager = new CreatureManager(scene, world, player);
const animalManager = new AnimalManager(scene, world, player, (msg, color) => creatureManager.toast(msg, color));
let marlon = null; // spawned after the spawn point is known
let cornichon = null;
let npcs = [];

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
  meshQueue = [];
  for (let dz = -RENDER_RADIUS; dz <= RENDER_RADIUS; dz++) {
    for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
      const cx = pcx + dx, cz = pcz + dz;
      if (!chunkMeshes.has(World.key(cx, cz))) {
        meshQueue.push({ cx, cz, d: dx * dx + dz * dz });
      }
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

  for (let i = 0; i < MESHES_PER_FRAME && meshQueue.length > 0; i++) {
    const { cx, cz } = meshQueue.pop();
    meshChunk(cx, cz);
  }

  // Remesh chunks whose blocks changed.
  if (world.dirty.size > 0) {
    for (const key of world.dirty) {
      if (chunkMeshes.has(key)) {
        const [cx, cz] = key.split(',').map(Number);
        meshChunk(cx, cz);
      }
    }
    world.dirty.clear();
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
  ];
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

// never lose edits on a sudden close (tab killed, app switched away)
window.addEventListener('beforeunload', () => world.saveEdits());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') world.saveEdits();
});

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => world.saveEdits(), 800);
}

function startGame() {
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

function pauseGame() {
  running = false;
  overlay.style.display = 'flex';
  overlayTitle.textContent = 'Paused';
}

document.getElementById('play-btn').addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);

document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Reset the world? All your block edits will be lost.')) {
    World.clearSave();
    location.reload();
  }
});

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!IS_TOUCH && !dragLook) {
    running = locked;
    if (edu.quizActive || invOpen) { overlay.style.display = 'none'; return; }
    overlay.style.display = locked ? 'none' : 'flex';
    if (!locked) overlayTitle.textContent = 'Paused';
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
const micBtn = document.getElementById('mic-btn');

function updatePlayersBtn() {
  if (!net || !net.active) { playersBtn.style.display = 'none'; return; }
  playersBtn.style.display = 'block';
  playersBtn.textContent = `🌐 ${net.playerCount()} ▾`;
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
  document.getElementById('players-panel').style.display = 'flex';
}
playersBtn.addEventListener('click', openPlayersPanel);
document.getElementById('players-close').addEventListener('click', () => {
  document.getElementById('players-panel').style.display = 'none';
});
const cloud = new CloudSave(world, (msg, color) => creatureManager.toast(msg, color));

// player profile: each device types its own character name (Marlon, Alice…)
const PROFILE_KEY = 'web-minecraft-profile-v1';
let playerProfile = { name: '' };
try { playerProfile = { ...playerProfile, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') }; }
catch { /* defaults */ }
const nameInput = document.getElementById('player-name');
nameInput.value = playerProfile.name;
nameInput.addEventListener('input', () => {
  playerProfile.name = nameInput.value.trim().slice(0, 12);
  saveProfile();
});
function saveProfile() {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(playerProfile)); } catch { /* ignore */ }
}
nameInput.addEventListener('keydown', (e) => e.stopPropagation());
function myName() {
  return playerProfile.name || NET_CHARACTERS[selectedChar].name;
}

// worlds the device has already played in, for one-tap reopening
const WORLDS_KEY = 'web-minecraft-worlds-v1';
function loadWorlds() {
  try { return JSON.parse(localStorage.getItem(WORLDS_KEY) || '[]'); } catch { return []; }
}
function rememberWorld(code) {
  const worlds = loadWorlds().filter((w) => w.code !== code);
  worlds.unshift({ code, t: Date.now() });
  try { localStorage.setItem(WORLDS_KEY, JSON.stringify(worlds.slice(0, 5))); } catch { /* ignore */ }
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
    const btn = document.createElement('button');
    btn.className = 'world-btn';
    btn.textContent = `🌍 Monde ${w.code}`;
    btn.addEventListener('click', () => openWorld(w.code));
    row.appendChild(btn);
  }
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

function syncRemotePlayers(list) {
  const seen = new Set();
  for (const p of list) {
    seen.add(p.id);
    let rp = remotePlayers.get(p.id);
    if (!rp) {
      const look = (NET_CHARACTERS[p.lookIdx] || NET_CHARACTERS[0]).look;
      const mesh = buildKidMesh(look);
      mesh.add(nameSprite(p.name));
      scene.add(mesh);
      rp = { mesh, target: null, yaw: 0, moving: false, animTime: 0, name: p.name };
      remotePlayers.set(p.id, rp);
      if (p.pos) mesh.position.set(p.pos.x, p.pos.y, p.pos.z);
    }
    if (p.pos) rp.target = p.pos;
    rp.yaw = p.yaw || 0;
    rp.moving = p.moving;
  }
  for (const [id, rp] of remotePlayers) {
    if (!seen.has(id)) {
      scene.remove(rp.mesh);
      remotePlayers.delete(id);
    }
  }
}

function updateRemotePlayers(dt) {
  for (const rp of remotePlayers.values()) {
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

function startNetSession(code, isHost) {
  net = new NetSession({
    world,
    toast: (msg, color) => creatureManager.toast(msg, color),
    onPlayers: (list) => { syncRemotePlayers(list); updatePlayersBtn(); },
    onState: () => updatePlayersBtn(),
  });
  net.getPos = () => ({
    x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw,
    moving: Math.abs(player.vel.x) + Math.abs(player.vel.z) > 0.5,
  });
  world.onOp = (k, id, ts) => { if (net && net.active) net.sendOp(k, id, ts); };
  return net.start(code, isHost, { name: myName(), lookIdx: selectedChar });
}

// Opens a world by code: joins whoever is already there, or becomes the
// host and plays solo if the world is empty. Either way the cloud copy is
// pulled first so nothing is ever lost.
async function openWorld(code) {
  onlineStatus.textContent = `Ouverture du monde ${code}…`;
  try {
    await startNetSession(code, false);
  } catch (err) {
    if (net) { net.stop(); net = null; }
    if (/introuvable/i.test(err.message)) {
      // nobody is online in this world — become its host
      try {
        await startNetSession(code, true);
      } catch (err2) {
        onlineStatus.textContent = '❌ ' + err2.message;
        if (net) { net.stop(); net = null; }
        return;
      }
    } else {
      onlineStatus.textContent = '❌ ' + err.message;
      return;
    }
  }
  rememberWorld(code);
  cloud.attach(code);
  onlineStatus.textContent = '';
  onlineMenu.style.display = 'none';
  showOnlineUI();
  startGame();
}

// online menu wiring
const onlineMenu = document.getElementById('online-menu');
const onlineStatus = document.getElementById('online-status');
const roomCodeBox = document.getElementById('room-code-box');
const charRow = document.getElementById('char-row');
selectedChar = Math.min(Math.max(playerProfile.charIdx || 0, 0), NET_CHARACTERS.length - 1);

// Render each character look to a little 3D portrait for the picker.
function makeCharPortraits() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(96, 128);
  const cam2 = new THREE.PerspectiveCamera(38, 96 / 128, 0.1, 10);
  cam2.position.set(0.55, 1.35, -2.3);
  cam2.lookAt(0, 0.85, 0);
  const urls = NET_CHARACTERS.map((c) => {
    const sc = new THREE.Scene();
    const mesh = buildKidMesh(c.look);
    mesh.rotation.y = -0.35; // three-quarter pose
    sc.add(mesh);
    r.render(sc, cam2);
    return r.domElement.toDataURL();
  });
  r.dispose();
  return urls;
}

const charPortraits = makeCharPortraits();
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
  micBtn.style.display = 'block';
  camBtn.style.display = 'block';
  net.onRemoteVideo = (id, stream) => addRemoteTile(id, stream);
  net.onRemoteVideoClosed = (id) => removeRemoteTile(id);
}

// home button: leave the current game and go back to the main menu, where
// you can pick local or multiplayer again
document.getElementById('home-btn').addEventListener('click', () => {
  if (edu.quizActive || edu.hardStopActive) return;
  if (net) { net.stop(); net = null; }
  cloud.detach();
  syncRemotePlayers([]); // remove remote avatars
  for (const id of [...remoteTiles.keys()]) removeRemoteTile(id);
  removeLocalTile();
  micBtn.style.display = 'none'; micBtn.textContent = '🔇'; micBtn.classList.remove('on');
  camBtn.style.display = 'none'; camBtn.textContent = '📷'; camBtn.classList.remove('on');
  playersBtn.style.display = 'none';
  world.saveEdits();
  pauseGame();
  // restore the full main menu, not the pause screen
  document.getElementById('overlay-title').textContent = 'WEB MINECRAFT';
  onlineMenu.style.display = 'none';
  roomCodeBox.style.display = 'none';
  document.getElementById('online-actions').style.display = 'flex';
  document.getElementById('mode-row').style.display = 'flex';
  onlineStatus.textContent = '';
});

document.getElementById('online-btn').addEventListener('click', () => {
  renderRecentWorlds();
  onlineMenu.style.display = 'flex';
  document.getElementById('mode-row').style.display = 'none';
});
document.getElementById('online-back').addEventListener('click', () => {
  if (net) { net.stop(); net = null; }
  cloud.detach();
  onlineMenu.style.display = 'none';
  roomCodeBox.style.display = 'none';
  document.getElementById('online-actions').style.display = 'flex';
  document.getElementById('mode-row').style.display = 'flex';
  onlineStatus.textContent = '';
});
document.getElementById('host-btn').addEventListener('click', async () => {
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
  rememberWorld(net.code);
  cloud.attach(net.code);
  onlineMenu.style.display = 'none';
  showOnlineUI();
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

micBtn.addEventListener('click', async () => {
  if (!net) return;
  const on = await net.toggleMic();
  micBtn.textContent = on ? '🎤' : '🔇';
  micBtn.classList.toggle('on', on);
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

function addRemoteTile(id, stream) {
  removeRemoteTile(id);
  const video = document.createElement('video');
  video.className = 'remote';
  video.autoplay = true;
  video.setAttribute('playsinline', '');
  video.srcObject = stream;
  const label = document.createElement('div');
  label.className = 'video-name';
  const entry = net && net.conns.get(id);
  label.textContent = entry ? entry.name : '';
  videoWrap.prepend(label);
  videoWrap.prepend(video);
  remoteTiles.set(id, { video, label });
  video.play().catch(() => {});
}

function removeRemoteTile(id) {
  const t = remoteTiles.get(id);
  if (t) { t.video.remove(); t.label.remove(); remoteTiles.delete(id); }
}

camBtn.addEventListener('click', async () => {
  if (!net) return;
  const on = await net.toggleCam();
  camBtn.textContent = on ? '🎥' : '📷';
  camBtn.classList.toggle('on', on);
  if (on) addLocalTile(net.videoStream);
  else removeLocalTile();
});

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
});

// --- home-screen profile: name, quiz language, school grade ------------------------

const homeName = document.getElementById('home-name');
homeName.value = playerProfile.name;
homeName.addEventListener('input', () => {
  playerProfile.name = homeName.value.trim().slice(0, 12);
  nameInput.value = homeName.value;
  saveProfile();
});
homeName.addEventListener('keydown', (e) => e.stopPropagation());
nameInput.addEventListener('input', () => { homeName.value = nameInput.value; });

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
document.querySelectorAll('.pb-toggle').forEach((b) => {
  b.addEventListener('click', () => {
    playerProfile.lang = b.dataset.lang;
    renderLangRow();
    saveProfile();
    edu.setPrefs(playerProfile.lang, playerProfile.grade);
  });
});
gradeSelect.addEventListener('change', () => {
  playerProfile.grade = Number(gradeSelect.value);
  saveProfile();
  edu.setPrefs(playerProfile.lang, playerProfile.grade);
  creatureManager.toast(`🎓 Niveau réglé : ${GRADES[playerProfile.grade][0]} · ${GRADES[playerProfile.grade][1]}`, 0x9fd8e8);
});
edu.setPrefs(playerProfile.lang, playerProfile.grade);

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
    const item = PROP_ITEMS[id - PROP_START];
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
window.gameConfirm = (msg) => new Promise((resolve) => {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-msg').textContent = msg;
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

const MAP_COLORS = {
  [BLOCK.GRASS]: [88, 176, 76], [BLOCK.DIRT]: [138, 96, 67], [BLOCK.STONE]: [125, 125, 125],
  [BLOCK.SAND]: [219, 207, 163], [BLOCK.LOG]: [103, 82, 49], [BLOCK.LEAVES]: [54, 116, 38],
  [BLOCK.WATER]: [64, 120, 210], [BLOCK.PLANK]: [162, 130, 78], [BLOCK.COBBLE]: [120, 120, 120],
  [BLOCK.GLASS]: [200, 230, 245], [BLOCK.BRICK]: [148, 68, 58], [BLOCK.SNOW]: [242, 250, 250],
  [BLOCK.SANDSTONE]: [216, 200, 155], [BLOCK.GRAVEL]: [136, 130, 126], [BLOCK.MOSSY]: [98, 122, 82],
  [BLOCK.BIRCH]: [214, 200, 165], [BLOCK.DARKPLANK]: [92, 66, 42], [BLOCK.ICE]: [160, 210, 240],
  [BLOCK.GOLD]: [238, 202, 66], [BLOCK.DIAMOND]: [96, 219, 213], [BLOCK.OBSIDIAN]: [28, 22, 44],
  [BLOCK.BOOKSHELF]: [162, 130, 78], [BLOCK.WOOL_RED]: [200, 62, 56], [BLOCK.WOOL_BLUE]: [64, 100, 190],
  [BLOCK.WOOL_YELLOW]: [228, 200, 60], [BLOCK.WOOL_GREEN]: [88, 160, 70], [BLOCK.WOOL_PURPLE]: [140, 84, 190],
  [BLOCK.WOOL_BLACK]: [42, 42, 46], [BLOCK.SLAB_STONE]: [125, 125, 125], [BLOCK.SLAB_PLANK]: [162, 130, 78],
  [BLOCK.SLAB_COBBLE]: [120, 120, 120], [BLOCK.SLAB_BRICK]: [148, 68, 58],
  [BLOCK.STONEBRICK]: [130, 130, 132], [BLOCK.DARKBRICK]: [92, 42, 40], [BLOCK.WHITEBRICK]: [232, 230, 222],
  [BLOCK.TERRACOTTA]: [190, 108, 62], [BLOCK.BLUEBRICK]: [66, 96, 160],
  [CITY_BLOCK.HAUSSMANN]: [229, 219, 194], [CITY_BLOCK.ZINC]: [112, 122, 136],
  [CITY_BLOCK.ASPHALT]: [57, 58, 62], [CITY_BLOCK.ROADLINE]: [80, 76, 58],
  [CITY_BLOCK.SIDEWALK]: [178, 178, 172], [CITY_BLOCK.BROWNSTONE]: [126, 76, 56],
  [CITY_BLOCK.GRANITE]: [168, 166, 160], [CITY_BLOCK.CURTAIN]: [78, 118, 164],
  [CITY_BLOCK.COPPER]: [98, 168, 142], [CITY_BLOCK.CROSSWALK]: [120, 120, 120],
};

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

  // city names — clamped to the edge so they double as direction signs
  if (radius >= 60) {
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const c of CITIES) {
      let [mx, my] = toMap(c.x, c.z);
      mx = Math.max(30, Math.min(size - 30, mx));
      my = Math.max(12, Math.min(size - 6, my));
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

document.getElementById('map-btn').addEventListener('click', () => {
  minimapVisible = !minimapVisible;
  minimapCanvas.style.display = minimapVisible ? 'block' : 'none';
  if (minimapVisible) drawMap(minimapCanvas, 48);
});
minimapCanvas.addEventListener('click', () => {
  mapModal.style.display = 'flex';
  drawMap(mapModalCanvas, 160); // wide enough to show all three cities
});
document.getElementById('map-modal-close').addEventListener('click', () => {
  mapModal.style.display = 'none';
});
mapModal.addEventListener('click', (e) => {
  if (e.target === mapModal) mapModal.style.display = 'none';
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
  scene.background.copy(skyColor);
  scene.fog.color.copy(skyColor);

  const level = 0.25 + 0.75 * daylight;
  lightColor.setRGB(level, level, level * (0.92 + 0.08 * daylight));
  solidMaterial.color.copy(lightColor);
  waterMaterial.color.copy(lightColor);
  hemiLight.intensity = 0.3 + 0.8 * daylight;
  sunLight.intensity = 0.15 + 0.75 * daylight;
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

// --- main loop -------------------------------------------------------------------------

// console/debug handle
window.__game = { world, player, creatureManager, animalManager, edu, cloud, get net() { return net; }, get remotePlayers() { return remotePlayers; }, get marlon() { return marlon; }, get cornichon() { return cornichon; }, get npcs() { return npcs; } };

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (running) {
    player.update(dt);
    creatureManager.update(dt);
    animalManager.update(dt);
    for (const npc of npcs) npc.update(dt);
  } else {
    player.syncCamera();
  }

  updateChunks();
  updateSky(dt);
  updateHud(dt);
  updateCreatureLabel();
  updateRemotePlayers(dt);
  edu.update(dt, running);

  if (minimapVisible) {
    minimapTimer -= dt;
    if (minimapTimer <= 0) {
      minimapTimer = 1;
      drawMap(minimapCanvas, 48);
    }
  }

  const hit = running ? getTarget() : null;
  highlight.visible = !!hit;
  if (hit) highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
