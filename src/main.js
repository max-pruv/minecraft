// Entry point: scene setup, chunk streaming, input, HUD, and the game loop.

import * as THREE from 'three';
import { BLOCK, BLOCK_INFO, HOTBAR_BLOCKS } from './blocks.js';
import { createAtlas, tileUV, ATLAS_COLS, ATLAS_ROWS, TILE_PX } from './textures.js';
import { World, CHUNK, WATER_LEVEL } from './world.js';
import { buildChunkGeometry } from './mesher.js';
import { Player, raycastBlocks } from './player.js';

const RENDER_RADIUS = 5;             // chunks in each direction
const UNLOAD_RADIUS = RENDER_RADIUS + 2;
const MESHES_PER_FRAME = 2;
const REACH = 5.5;                   // block interaction distance
const DAY_LENGTH = 600;              // seconds for a full day/night cycle

// --- renderer / scene -------------------------------------------------------

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const DAY_SKY = new THREE.Color(0x87ceeb);
const NIGHT_SKY = new THREE.Color(0x0b1026);
scene.background = DAY_SKY.clone();
scene.fog = new THREE.Fog(scene.background, RENDER_RADIUS * CHUNK * 0.55, RENDER_RADIUS * CHUNK - 4);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 600);

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
}

function meshChunk(cx, cz) {
  const key = World.key(cx, cz);
  const old = chunkMeshes.get(key);
  if (old) disposeChunkMesh(old);

  const { solid, water } = buildChunkGeometry(world, cx, cz);
  const entry = { solid: null, water: null };
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
let locked = false;
let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => world.saveEdits(), 800);
}

document.getElementById('play-btn').addEventListener('click', () => {
  canvas.requestPointerLock();
});

document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Reset the world? All your block edits will be lost.')) {
    World.clearSave();
    location.reload();
  }
});

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  overlay.style.display = locked ? 'none' : 'flex';
  if (!locked) overlayTitle.textContent = 'Paused';
});

document.addEventListener('mousemove', (e) => {
  if (locked) player.onMouseMove(e.movementX, e.movementY);
});

document.addEventListener('keydown', (e) => {
  if (!locked) return;
  player.keys.add(e.code);
  if (e.code === 'KeyF') player.toggleFly();
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (n >= 1 && n <= HOTBAR_BLOCKS.length) selectSlot(n - 1);
  }
  if (e.code === 'Space') e.preventDefault();
});

document.addEventListener('keyup', (e) => player.keys.delete(e.code));

function breakBlock() {
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
  if (player.intersectsBlock(x, y, z)) return; // don't build inside yourself
  world.setBlock(x, y, z, HOTBAR_BLOCKS[selectedSlot]);
  scheduleSave();
}

function pickBlock() {
  const hit = getTarget();
  if (!hit) return;
  const idx = HOTBAR_BLOCKS.indexOf(hit.id);
  if (idx >= 0) selectSlot(idx);
}

let mouseRepeat = null;
document.addEventListener('mousedown', (e) => {
  if (!locked) return;
  e.preventDefault();
  const action = e.button === 0 ? breakBlock : e.button === 2 ? placeBlock : pickBlock;
  action();
  if (e.button === 0 || e.button === 2) {
    clearInterval(mouseRepeat);
    mouseRepeat = setInterval(action, 240);
  }
});
document.addEventListener('mouseup', () => clearInterval(mouseRepeat));
document.addEventListener('contextmenu', (e) => e.preventDefault());

// --- hotbar HUD ------------------------------------------------------------------

let selectedSlot = 0;
const hotbarEl = document.getElementById('hotbar');

function buildHotbar() {
  HOTBAR_BLOCKS.forEach((id, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.title = BLOCK_INFO[id].name;
    const thumb = document.createElement('canvas');
    thumb.width = 32; thumb.height = 32;
    const ctx = thumb.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const tile = BLOCK_INFO[id].tiles[1]; // side texture reads best
    const sx = (tile % ATLAS_COLS) * TILE_PX;
    const sy = Math.floor(tile / ATLAS_COLS) * TILE_PX;
    ctx.drawImage(atlasCanvas, sx, sy, TILE_PX, TILE_PX, 0, 0, 32, 32);
    slot.appendChild(thumb);
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = i + 1;
    slot.appendChild(num);
    slot.addEventListener('click', () => selectSlot(i));
    hotbarEl.appendChild(slot);
  });
}

function selectSlot(i) {
  selectedSlot = i;
  [...hotbarEl.children].forEach((el, j) => el.classList.toggle('selected', j === i));
  document.getElementById('block-name').textContent = BLOCK_INFO[HOTBAR_BLOCKS[i]].name;
}

buildHotbar();
selectSlot(0);

document.addEventListener('wheel', (e) => {
  if (!locked) return;
  const dir = e.deltaY > 0 ? 1 : -1;
  selectSlot((selectedSlot + dir + HOTBAR_BLOCKS.length) % HOTBAR_BLOCKS.length);
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

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (locked) player.update(dt);
  else player.syncCamera();

  updateChunks();
  updateSky(dt);
  updateHud(dt);

  const hit = locked ? getTarget() : null;
  highlight.visible = !!hit;
  if (hit) highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
