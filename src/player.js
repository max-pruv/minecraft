// First-person player: pointer-lock look, WASD movement, AABB voxel collision,
// gravity/jumping, swimming, and a toggleable fly mode.

import * as THREE from 'three';
import { BLOCK } from './blocks.js';

const WIDTH = 0.6;        // player AABB width (x and z)
const PLAYER_HEIGHT = 1.8;
const EYE_HEIGHT = 1.62;
const GRAVITY = 26;
const JUMP_SPEED = 8.6;
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 6.8;
const FLY_SPEED = 11;
const SWIM_SPEED = 3.0;
const MAX_STEP = 0.4;     // max movement per collision substep

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.pos = new THREE.Vector3(0, 60, 0); // feet position
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.flying = false;
    this.inWater = false;
    this.keys = new Set();
    this.touchMove = { f: 0, s: 0 }; // analog stick input, -1..1
  }

  setSpawn(x, y, z) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
  }

  onMouseMove(dx, dy) {
    const sensitivity = 0.0024;
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    const limit = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
  }

  toggleFly() {
    this.flying = !this.flying;
    this.vel.y = 0;
  }

  eyePosition() {
    return new THREE.Vector3(this.pos.x, this.pos.y + EYE_HEIGHT, this.pos.z);
  }

  // Does the given block position intersect the player's AABB?
  intersectsBlock(bx, by, bz) {
    const half = WIDTH / 2;
    return (
      bx + 1 > this.pos.x - half && bx < this.pos.x + half &&
      bz + 1 > this.pos.z - half && bz < this.pos.z + half &&
      by + 1 > this.pos.y && by < this.pos.y + PLAYER_HEIGHT
    );
  }

  update(dt) {
    const k = this.keys;
    const forward = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0) + this.touchMove.f;
    const strafe = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + this.touchMove.s;

    const bodyBlock = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.4), Math.floor(this.pos.z));
    const headBlock = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + EYE_HEIGHT), Math.floor(this.pos.z));
    this.inWater = bodyBlock === BLOCK.WATER || headBlock === BLOCK.WATER;

    // Horizontal velocity from input, rotated by yaw.
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let dx = (-sin * forward + cos * strafe);
    let dz = (-cos * forward - sin * strafe);
    const len = Math.hypot(dx, dz);
    if (len > 1) { dx /= len; dz /= len; } // keep analog magnitudes below 1

    let speed = k.has('ShiftLeft') || k.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED;
    if (this.flying) speed = FLY_SPEED;
    else if (this.inWater) speed = SWIM_SPEED;

    this.vel.x = dx * speed;
    this.vel.z = dz * speed;

    if (this.flying) {
      this.vel.y = 0;
      if (k.has('Space')) this.vel.y = FLY_SPEED;
      if (k.has('KeyC')) this.vel.y = -FLY_SPEED;
    } else if (this.inWater) {
      this.vel.y -= GRAVITY * 0.25 * dt;
      this.vel.y *= Math.pow(0.02, dt); // heavy drag
      if (k.has('Space')) this.vel.y = SWIM_SPEED;
      this.vel.y = Math.max(this.vel.y, -4);
    } else {
      this.vel.y -= GRAVITY * dt;
      this.vel.y = Math.max(this.vel.y, -50);
      if (k.has('Space') && this.onGround) {
        this.vel.y = JUMP_SPEED;
        this.onGround = false;
      }
    }

    // Move with collision, in substeps so we never tunnel through blocks.
    const move = this.vel.clone().multiplyScalar(dt);
    const steps = Math.max(1, Math.ceil(move.length() / MAX_STEP));
    this.onGround = false;
    for (let i = 0; i < steps; i++) {
      this.sweepAxis(0, move.x / steps);
      this.sweepAxis(1, move.y / steps);
      this.sweepAxis(2, move.z / steps);
    }

    this.syncCamera();
  }

  syncCamera() {
    this.camera.position.copy(this.eyePosition());
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  sweepAxis(axis, delta) {
    if (delta === 0) return;
    const p = this.pos;
    const coords = ['x', 'y', 'z'];
    const key = coords[axis];
    p[key] += delta;

    const half = WIDTH / 2;
    const eps = 1e-4;
    const minX = Math.floor(p.x - half + eps), maxX = Math.floor(p.x + half - eps);
    const minY = Math.floor(p.y + eps), maxY = Math.floor(p.y + PLAYER_HEIGHT - eps);
    const minZ = Math.floor(p.z - half + eps), maxZ = Math.floor(p.z + half - eps);

    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        for (let bx = minX; bx <= maxX; bx++) {
          if (!this.world.isSolid(bx, by, bz)) continue;
          if (axis === 0) {
            p.x = delta > 0 ? bx - half - eps : bx + 1 + half + eps;
          } else if (axis === 1) {
            if (delta > 0) {
              p.y = by - PLAYER_HEIGHT - eps;
            } else {
              p.y = by + 1 + eps;
              this.onGround = true;
            }
          } else {
            p.z = delta > 0 ? bz - half - eps : bz + 1 + half + eps;
          }
          this.vel[key] = 0;
          return;
        }
      }
    }
  }
}

// Voxel raycast (Amanatides & Woo DDA). Returns the first solid block hit
// and the face normal, or null. Water is passed through.
export function raycastBlocks(world, origin, direction, maxDistance) {
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
  const stepX = Math.sign(direction.x), stepY = Math.sign(direction.y), stepZ = Math.sign(direction.z);

  const tDeltaX = stepX !== 0 ? Math.abs(1 / direction.x) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / direction.y) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / direction.z) : Infinity;

  const frac = (v) => v - Math.floor(v);
  let tMaxX = stepX > 0 ? (1 - frac(origin.x)) * tDeltaX : frac(origin.x) * tDeltaX;
  let tMaxY = stepY > 0 ? (1 - frac(origin.y)) * tDeltaY : frac(origin.y) * tDeltaY;
  let tMaxZ = stepZ > 0 ? (1 - frac(origin.z)) * tDeltaZ : frac(origin.z) * tDeltaZ;
  if (stepX === 0) tMaxX = Infinity;
  if (stepY === 0) tMaxY = Infinity;
  if (stepZ === 0) tMaxZ = Infinity;

  let normal = [0, 0, 0];
  let t = 0;

  while (t <= maxDistance) {
    const id = world.getBlock(x, y, z);
    if (id !== BLOCK.AIR && id !== BLOCK.WATER) {
      return { x, y, z, id, normal };
    }
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX; t = tMaxX; tMaxX += tDeltaX; normal = [-stepX, 0, 0];
    } else if (tMaxY < tMaxZ) {
      y += stepY; t = tMaxY; tMaxY += tDeltaY; normal = [0, -stepY, 0];
    } else {
      z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; normal = [0, 0, -stepZ];
    }
  }
  return null;
}
