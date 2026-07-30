// Entry point: scene setup, chunk streaming, input, HUD, and the game loop.

import * as THREE from 'three';
import { BLOCK, BLOCK_INFO, HOTBAR_BLOCKS, PLACEABLE_BLOCKS, DECOR_ITEMS, DECOR_START, decorMapColor, PROP_ITEMS, PROP_START, isProp } from './blocks.js';
import { buildPropMesh } from './props.js';
import { AnimalManager } from './animals.js';
import { createAtlas, tileUV, ATLAS_COLS, ATLAS_ROWS, TILE_PX } from './textures.js';
import { World, CHUNK, WATER_LEVEL, HEIGHT } from './world.js';
import { buildChunkGeometry } from './mesher.js';
import { Player, raycastBlocks } from './player.js';
import { CreatureManager, TYPES } from './creatures.js';
import { Marlon, Cornichon, createHeroes, createBuilders, createVillagers } from './marlon.js';
import { EducationMode } from './education.js';

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
  drawMap(mapModalCanvas, 120);
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
window.__game = { world, player, creatureManager, animalManager, edu, get marlon() { return marlon; }, get cornichon() { return cornichon; }, get npcs() { return npcs; } };

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
