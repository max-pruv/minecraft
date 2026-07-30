// Creature-catching mode: original procedurally generated voxel creatures
// spawn in the world by biome; throw catch-balls to add them to your collection.

import * as THREE from 'three';
import { BLOCK } from './blocks.js';
import { HEIGHT, WATER_LEVEL } from './world.js';

// --- creature types ---------------------------------------------------------

export const TYPES = {
  FIRE:     { color: 0xe8613c, dark: 0xa33a20, biomes: [BLOCK.SAND] },
  WATER:    { color: 0x4a90d9, dark: 0x2c5d96, biomes: ['water'] },
  GRASS:    { color: 0x58b04c, dark: 0x35702d, biomes: [BLOCK.GRASS] },
  ELECTRIC: { color: 0xe8c53c, dark: 0xa88a1e, biomes: [BLOCK.GRASS] },
  ROCK:     { color: 0x9a8a70, dark: 0x635846, biomes: [BLOCK.STONE, BLOCK.GRASS] },
  ICE:      { color: 0x9fd8e8, dark: 0x5d97ad, biomes: [BLOCK.SNOW] },
  BUG:      { color: 0xa8c04c, dark: 0x6d8028, biomes: [BLOCK.GRASS] },
  SPOOKY:   { color: 0x8a6ad0, dark: 0x54388f, biomes: [BLOCK.GRASS, BLOCK.SAND, BLOCK.SNOW] },
};

// --- deterministic species generation ---------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYLLABLES = ['fla', 'zu', 'mo', 'ki', 'ra', 'pi', 'vol', 'aq', 'ter', 'bul', 'sni', 'gro', 'lu', 'my', 'dra', 'fen'];
const ENDINGS = ['mon', 'ling', 'by', 'zor', 'let', 'puff', 'fang', 'wing', 'ette', 'oo', 'ix', 'ari'];

function makeName(rng) {
  const a = SYLLABLES[(rng() * SYLLABLES.length) | 0];
  const b = rng() < 0.5 ? SYLLABLES[(rng() * SYLLABLES.length) | 0] : '';
  const c = ENDINGS[(rng() * ENDINGS.length) | 0];
  const name = a + b + c;
  return name[0].toUpperCase() + name.slice(1);
}

export function generateSpecies() {
  const rng = mulberry32(424242);
  const species = [];
  const names = new Set();
  const typeKeys = Object.keys(TYPES);
  for (let i = 0; i < 32; i++) {
    const type = typeKeys[i % typeKeys.length]; // four of each type
    let name = makeName(rng);
    while (names.has(name)) name = makeName(rng);
    names.add(name);
    const rarity = rng() < 0.6 ? 0 : rng() < 0.75 ? 1 : 2; // common / uncommon / rare
    species.push({
      id: i,
      name,
      type,
      rarity,
      catchRate: [0.8, 0.55, 0.35][rarity],
      size: 0.45 + rng() * 0.4,
      legs: rng() < 0.35 ? 2 : 4,
      earStyle: (rng() * 3) | 0,   // 0 none, 1 pointy, 2 wide
      tail: rng() < 0.7,
      hopper: rng() < 0.3,         // hops instead of walking
      speed: 1.2 + rng() * 1.4,
      // separate rng stream: keeps ids/names of existing saved collections stable
      horn: mulberry32(9000 + i)() < 0.3,
    });
  }
  return species;
}

// --- creature mesh -----------------------------------------------------------

function buildCreatureMesh(sp) {
  const g = new THREE.Group();
  const main = new THREE.MeshBasicMaterial({ color: TYPES[sp.type].color });
  const dark = new THREE.MeshBasicMaterial({ color: TYPES[sp.type].dark });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const s = sp.size;
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

  const legH = s * 0.3;
  const body = box(s, s * 0.55, s * 1.15, main);
  body.position.y = legH + s * 0.28;
  g.add(body);

  const head = box(s * 0.7, s * 0.6, s * 0.6, main);
  head.position.set(0, legH + s * 0.62, -s * 0.75);
  g.add(head);

  for (const sx of [-1, 1]) {
    const eye = box(s * 0.1, s * 0.12, s * 0.05, eyeMat);
    eye.position.set(sx * s * 0.2, legH + s * 0.68, -s * 1.06);
    g.add(eye);
  }

  if (sp.earStyle === 1) {
    for (const sx of [-1, 1]) {
      const ear = box(s * 0.12, s * 0.4, s * 0.12, dark);
      ear.position.set(sx * s * 0.24, legH + s * 1.05, -s * 0.75);
      g.add(ear);
    }
  } else if (sp.earStyle === 2) {
    for (const sx of [-1, 1]) {
      const ear = box(s * 0.3, s * 0.2, s * 0.1, dark);
      ear.position.set(sx * s * 0.38, legH + s * 0.95, -s * 0.75);
      g.add(ear);
    }
  }

  if (sp.horn) {
    const horn = box(s * 0.1, s * 0.3, s * 0.1, 0xe8e0c8);
    horn.position.set(0, legH + s * 1.0, -s * 0.85);
    g.add(horn);
  }

  if (sp.tail) {
    const tail = box(s * 0.15, s * 0.15, s * 0.5, dark);
    tail.position.set(0, legH + s * 0.45, s * 0.75);
    tail.rotation.x = -0.5;
    g.add(tail);
  }

  const legs = [];
  const legPositions = sp.legs === 2
    ? [[-0.25, 0.2], [0.25, 0.2]]
    : [[-0.28, -0.4], [0.28, -0.4], [-0.28, 0.4], [0.28, 0.4]];
  for (const [lx, lz] of legPositions) {
    const leg = box(s * 0.16, legH, s * 0.16, dark);
    leg.position.set(lx * s, legH / 2, lz * s);
    g.add(leg);
    legs.push(leg);
  }

  g.userData.legs = legs;
  g.userData.legH = legH;
  return g;
}

// --- wild creature entity ----------------------------------------------------

const GRAVITY = 22;

class Creature {
  constructor(sp, x, y, z) {
    this.sp = sp;
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.yaw = Math.random() * Math.PI * 2;
    this.state = 'idle';          // idle | wander | flee | pending
    this.stateTime = 1 + Math.random() * 2;
    this.onGround = false;
    this.animTime = 0;
    this.level = 2 + ((Math.random() * 10) | 0);
    this.mesh = buildCreatureMesh(sp);
  }

  update(dt, world, player) {
    if (this.state === 'pending') return; // frozen inside a ball

    this.stateTime -= dt;
    if (this.state !== 'flee' && this.stateTime <= 0) {
      this.state = this.state === 'idle' ? 'wander' : 'idle';
      this.stateTime = this.state === 'idle' ? 1 + Math.random() * 2.5 : 1 + Math.random() * 2;
      if (this.state === 'wander') this.yaw = Math.random() * Math.PI * 2;
    }

    let speed = 0;
    if (this.state === 'wander') speed = this.sp.speed;
    if (this.state === 'flee') {
      speed = this.sp.speed * 3;
      this.yaw = Math.atan2(this.pos.x - player.pos.x, this.pos.z - player.pos.z);
    }

    this.vel.x = Math.sin(this.yaw) * speed;
    this.vel.z = Math.cos(this.yaw) * speed;
    this.vel.y -= GRAVITY * dt;
    this.vel.y = Math.max(this.vel.y, -30);

    // hoppers jump to move
    if (this.sp.hopper && speed > 0 && this.onGround) this.vel.y = 5.5;

    const blockedX = this.sweep(world, 0, this.vel.x * dt);
    this.sweep(world, 1, this.vel.y * dt);
    const blockedZ = this.sweep(world, 2, this.vel.z * dt);
    if ((blockedX || blockedZ) && this.onGround) {
      if (!this.sp.hopper && speed > 0) this.vel.y = 5.5; // step up small ledges
      if (this.state === 'wander') this.yaw += Math.PI / 2;
    }

    // animate
    this.animTime += dt;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
    const moving = speed > 0;
    for (let i = 0; i < this.mesh.userData.legs.length; i++) {
      const leg = this.mesh.userData.legs[i];
      leg.rotation.x = moving ? Math.sin(this.animTime * 9 + i * Math.PI) * 0.6 : 0;
    }
  }

  sweep(world, axis, delta) {
    if (delta === 0) return false;
    const keys = ['x', 'y', 'z'];
    const key = keys[axis];
    this.pos[key] += delta;
    const half = this.sp.size / 2;
    const h = this.sp.size;
    const eps = 1e-4;
    const minX = Math.floor(this.pos.x - half + eps), maxX = Math.floor(this.pos.x + half - eps);
    const minY = Math.floor(this.pos.y + eps), maxY = Math.floor(this.pos.y + h - eps);
    const minZ = Math.floor(this.pos.z - half + eps), maxZ = Math.floor(this.pos.z + half - eps);
    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        for (let bx = minX; bx <= maxX; bx++) {
          if (!world.isSolid(bx, by, bz)) continue;
          if (axis === 0) this.pos.x = delta > 0 ? bx - half - eps : bx + 1 + half + eps;
          else if (axis === 1) {
            if (delta > 0) this.pos.y = by - h - eps;
            else { this.pos.y = by + 1 + eps; this.onGround = true; }
          } else this.pos.z = delta > 0 ? bz - half - eps : bz + 1 + half + eps;
          this.vel[key] = 0;
          return true;
        }
      }
    }
    if (axis === 1 && delta < 0) this.onGround = false;
    return false;
  }
}

// --- catch-ball --------------------------------------------------------------

function buildBallMesh() {
  const g = new THREE.Group();
  const r = 0.16;
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xd83a3a })
  );
  const bottom = new THREE.Mesh(
    new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xf2f2f2 })
  );
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.02, r * 1.02, r * 0.25, 12),
    new THREE.MeshBasicMaterial({ color: 0x222222 })
  );
  g.add(top, bottom, band);
  return g;
}

// --- manager -----------------------------------------------------------------

const MAX_WILD = 16;
const SPAWN_MIN = 10, SPAWN_MAX = 34, DESPAWN_DIST = 70;
const STORAGE_KEY = 'web-minecraft-dex-v1';

export class CreatureManager {
  constructor(scene, world, player) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.species = generateSpecies();
    this.creatures = [];
    this.balls = [];
    this.spawnTimer = 0;
    this.collection = this.loadCollection();
  }

  loadCollection() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  saveCollection() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.collection)); } catch { /* ignore */ }
  }

  surfaceY(x, z) {
    for (let y = HEIGHT - 1; y > 0; y--) {
      if (this.world.isSolid(x, y, z)) return y + 1;
    }
    return null;
  }

  speciesForBiome(topBlock, nearWater) {
    const pool = this.species.filter((sp) => {
      const biomes = TYPES[sp.type].biomes;
      if (nearWater && biomes.includes('water')) return true;
      return biomes.includes(topBlock);
    });
    const candidates = pool.length ? pool : this.species;
    // rarity-weighted pick
    const weights = candidates.map((sp) => [7, 4, 2][sp.rarity]);
    let total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return candidates[i];
    }
    return candidates[0];
  }

  trySpawn() {
    if (this.creatures.length >= MAX_WILD) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
    const x = Math.floor(this.player.pos.x + Math.sin(angle) * dist);
    const z = Math.floor(this.player.pos.z + Math.cos(angle) * dist);
    const y = this.surfaceY(x, z);
    if (y === null || y >= HEIGHT - 4) return;
    if (this.world.getBlock(x, y, z) === BLOCK.WATER) return; // don't drown them
    const below = this.world.getBlock(x, y - 1, z);
    const nearWater = y <= WATER_LEVEL + 2;
    const sp = this.speciesForBiome(below, nearWater);
    const c = new Creature(sp, x + 0.5, y + 0.1, z + 0.5);
    this.creatures.push(c);
    this.scene.add(c.mesh);
  }

  removeCreature(c) {
    this.scene.remove(c.mesh);
    this.creatures = this.creatures.filter((o) => o !== c);
  }

  throwBall() {
    const dir = new THREE.Vector3();
    this.player.camera.getWorldDirection(dir);
    const ball = {
      pos: this.player.eyePosition().addScaledVector(dir, 0.4),
      vel: dir.clone().multiplyScalar(16).add(new THREE.Vector3(0, 2.5, 0)),
      mesh: buildBallMesh(),
      life: 3,
      state: 'flying',   // flying | shaking
      target: null,
      shakeTime: 0,
    };
    ball.mesh.position.copy(ball.pos);
    this.scene.add(ball.mesh);
    this.balls.push(ball);
  }

  removeBall(ball) {
    this.scene.remove(ball.mesh);
    this.balls = this.balls.filter((b) => b !== ball);
  }

  resolveCatch(ball) {
    const c = ball.target;
    this.removeBall(ball);
    if (Math.random() < c.sp.catchRate) {
      this.removeCreature(c);
      let entry = this.collection.find((e) => e.id === c.sp.id);
      if (!entry) {
        entry = { id: c.sp.id, name: c.sp.name, type: c.sp.type, count: 0, bestLevel: 0 };
        this.collection.push(entry);
      }
      entry.count++;
      entry.bestLevel = Math.max(entry.bestLevel, c.level);
      this.saveCollection();
      this.toast(`Caught ${c.sp.name}! (${c.sp.type} · Lv ${c.level})`, TYPES[c.sp.type].color);
    } else {
      c.state = 'flee';
      c.stateTime = 4;
      c.mesh.visible = true;
      this.toast(`${c.sp.name} broke free!`, 0xcccccc);
      setTimeout(() => { if (this.creatures.includes(c)) this.removeCreature(c); }, 4000);
    }
  }

  updateBalls(dt) {
    for (const ball of [...this.balls]) {
      if (ball.state === 'shaking') {
        ball.shakeTime -= dt;
        ball.mesh.rotation.z = Math.sin(ball.shakeTime * 20) * 0.45;
        if (ball.shakeTime <= 0) this.resolveCatch(ball);
        continue;
      }
      ball.life -= dt;
      if (ball.life <= 0) { this.removeBall(ball); continue; }
      ball.vel.y -= 18 * dt;
      ball.pos.addScaledVector(ball.vel, dt);
      ball.mesh.position.copy(ball.pos);
      ball.mesh.rotation.x += dt * 10;

      // hit a creature?
      for (const c of this.creatures) {
        if (c.state === 'pending') continue;
        const center = c.pos.clone(); center.y += c.sp.size * 0.5;
        if (ball.pos.distanceTo(center) < c.sp.size * 0.7 + 0.2) {
          ball.state = 'shaking';
          ball.shakeTime = 1.6;
          ball.vel.set(0, 0, 0);
          ball.target = c;
          c.state = 'pending';
          c.mesh.visible = false;
          break;
        }
      }
      if (ball.state === 'shaking') continue;

      // hit terrain?
      if (this.world.isSolid(Math.floor(ball.pos.x), Math.floor(ball.pos.y), Math.floor(ball.pos.z))) {
        this.removeBall(ball);
      }
    }
  }

  // Wild creature the player is roughly aiming at, for the HUD hint.
  targeted() {
    const dir = new THREE.Vector3();
    this.player.camera.getWorldDirection(dir);
    const eye = this.player.eyePosition();
    let best = null, bestDot = 0.92;
    for (const c of this.creatures) {
      if (c.state === 'pending') continue;
      const to = c.pos.clone().sub(eye);
      const d = to.length();
      if (d > 24) continue;
      const dot = to.normalize().dot(dir);
      if (dot > bestDot) { bestDot = dot; best = c; }
    }
    return best;
  }

  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.2;
      this.trySpawn();
    }
    for (const c of [...this.creatures]) {
      if (c.pos.distanceTo(this.player.pos) > DESPAWN_DIST) { this.removeCreature(c); continue; }
      c.update(dt, this.world, this.player);
    }
    this.updateBalls(dt);
  }

  toast(msg, color = 0xffffff) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.color = '#' + new THREE.Color(color).getHexString();
    el.style.opacity = '1';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2600);
  }

  renderDex() {
    const list = document.getElementById('dex-list');
    const caught = this.collection.reduce((a, e) => a + e.count, 0);
    document.getElementById('dex-title').textContent =
      `Creature Dex — ${this.collection.length}/${this.species.length} species · ${caught} caught`;
    list.innerHTML = '';
    for (const sp of this.species) {
      const entry = this.collection.find((e) => e.id === sp.id);
      const row = document.createElement('div');
      row.className = 'dex-row' + (entry ? '' : ' unknown');
      const chip = document.createElement('span');
      chip.className = 'type-chip';
      chip.style.background = '#' + new THREE.Color(TYPES[sp.type].color).getHexString();
      chip.textContent = sp.type;
      const label = document.createElement('span');
      label.textContent = entry
        ? ` ${sp.name} · best Lv ${entry.bestLevel} · ×${entry.count}`
        : ` ??? (${['common', 'uncommon', 'rare'][sp.rarity]})`;
      row.append(chip, label);
      list.appendChild(row);
    }
  }
}
