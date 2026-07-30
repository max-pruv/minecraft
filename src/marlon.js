// Marlon — a friendly companion NPC. A blocky kid with light brown hair and
// a navy-striped shirt who follows the player around and chats in French.

import * as THREE from 'three';

const SKIN = 0xe8bd93;
const HAIR = 0x9a7b4f;
const WHITE = 0xf4f4f0;
const NAVY = 0x2b3a67;
const PANTS = 0x46536b;
const SHOES = 0x2c2c2c;

const GRAVITY = 24;
const WIDTH = 0.5;
const NPC_HEIGHT = 1.5;
const WALK_SPEED = 4.0;
const FOLLOW_DIST = 3.2;    // stops this close to the player
const TELEPORT_DIST = 26;   // catches up instantly if left far behind

const PHRASES = [
  'Salut !',
  'Attends-moi !',
  'Trop stylé ce monde !',
  'On construit une maison ?',
  'Regarde, une créature là-bas !',
  'Lance une ball, vite !',
  'On va voir la montagne ?',
  "J'adore les arbres ici.",
  'Tu as attrapé combien de créatures ?',
  'On fait la course ?',
];

function box(w, h, d, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
}

// A limb group whose pivot sits at the top so it swings from the joint.
function limb(parts) {
  const g = new THREE.Group();
  for (const p of parts) g.add(p);
  return g;
}

function buildMarlonMesh() {
  const g = new THREE.Group(); // faces -z, feet at y=0

  // legs (pivot at hip, y=0.53)
  const legs = [];
  for (const sx of [-1, 1]) {
    const leg = limb([]);
    const pant = box(0.15, 0.45, 0.17, PANTS);
    pant.position.y = -0.225;
    const shoe = box(0.16, 0.09, 0.2, SHOES);
    shoe.position.set(0, -0.475, -0.02);
    leg.add(pant, shoe);
    leg.position.set(sx * 0.1, 0.53, 0);
    g.add(leg);
    legs.push(leg);
  }

  // torso: horizontal slabs = the striped sailor shirt
  const stripes = [WHITE, NAVY, WHITE, NAVY, WHITE];
  stripes.forEach((color, i) => {
    const slab = box(0.46, 0.1, 0.25, color);
    slab.position.y = 0.58 + i * 0.1;
    g.add(slab);
  });

  // arms (pivot at shoulder, y=1.03): striped sleeve + skin hand
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = limb([]);
    const sleeveColors = [WHITE, NAVY, WHITE];
    sleeveColors.forEach((color, i) => {
      const seg = box(0.13, 0.12, 0.14, color);
      seg.position.y = -0.06 - i * 0.12;
      arm.add(seg);
    });
    const hand = box(0.12, 0.14, 0.13, SKIN);
    hand.position.y = -0.43;
    arm.add(hand);
    arm.position.set(sx * 0.3, 1.03, 0);
    g.add(arm);
    arms.push(arm);
  }

  // head
  const head = box(0.36, 0.36, 0.36, SKIN);
  head.position.y = 1.26;
  g.add(head);

  // hair: cap on top, fringe over the forehead, sides and back
  const hairTop = box(0.4, 0.1, 0.4, HAIR);
  hairTop.position.y = 1.47;
  const fringe = box(0.4, 0.12, 0.04, HAIR);
  fringe.position.set(0, 1.38, -0.19);
  const back = box(0.4, 0.22, 0.04, HAIR);
  back.position.set(0, 1.33, 0.19);
  g.add(hairTop, fringe, back);
  for (const sx of [-1, 1]) {
    const side = box(0.04, 0.16, 0.4, HAIR);
    side.position.set(sx * 0.19, 1.36, 0);
    g.add(side);
  }

  // face: eyes + mouth
  for (const sx of [-1, 1]) {
    const eye = box(0.06, 0.07, 0.02, 0x3d2f23);
    eye.position.set(sx * 0.09, 1.28, -0.185);
    g.add(eye);
  }
  const mouth = box(0.1, 0.03, 0.02, 0xc98a6d);
  mouth.position.set(0, 1.16, -0.185);
  g.add(mouth);

  g.userData.legs = legs;
  g.userData.arms = arms;
  return g;
}

export class Marlon {
  constructor(scene, world, player, toast) {
    this.world = world;
    this.player = player;
    this.toast = toast;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.onGround = false;
    this.animTime = 0;
    this.speechTimer = 4; // says hi shortly after the game starts
    this.mesh = buildMarlonMesh();
    scene.add(this.mesh);
    this.teleportNearPlayer();
  }

  surfaceY(x, z) {
    for (let y = 95; y > 0; y--) {
      if (this.world.isSolid(Math.floor(x), y, Math.floor(z))) return y + 1;
    }
    return null;
  }

  teleportNearPlayer() {
    const p = this.player.pos;
    const angle = Math.random() * Math.PI * 2;
    const x = p.x + Math.sin(angle) * 2.5;
    const z = p.z + Math.cos(angle) * 2.5;
    const y = this.surfaceY(x, z);
    this.pos.set(x, (y !== null ? y : p.y) + 0.1, z);
    this.vel.set(0, 0, 0);
  }

  update(dt) {
    const toPlayer = this.player.pos.clone().sub(this.pos);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    if (dist > TELEPORT_DIST) this.teleportNearPlayer();

    let speed = 0;
    if (dist > FOLLOW_DIST) {
      speed = WALK_SPEED;
      this.yaw = Math.atan2(toPlayer.x, toPlayer.z) + Math.PI;
    } else {
      // idle: turn to face the player
      this.yaw = Math.atan2(toPlayer.x, toPlayer.z) + Math.PI;
    }

    this.vel.x = -Math.sin(this.yaw) * speed;
    this.vel.z = -Math.cos(this.yaw) * speed;
    this.vel.y -= GRAVITY * dt;
    this.vel.y = Math.max(this.vel.y, -30);

    const blockedX = this.sweep(0, this.vel.x * dt);
    this.sweep(1, this.vel.y * dt);
    const blockedZ = this.sweep(2, this.vel.z * dt);
    if ((blockedX || blockedZ) && this.onGround && speed > 0) this.vel.y = 7.5; // hop up ledges

    // animate limbs
    this.animTime += dt;
    const swing = speed > 0 ? Math.sin(this.animTime * 8) * 0.7 : 0;
    const { legs, arms } = this.mesh.userData;
    legs[0].rotation.x = swing;
    legs[1].rotation.x = -swing;
    arms[0].rotation.x = -swing * 0.8;
    arms[1].rotation.x = swing * 0.8;

    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;

    // chatter when nearby
    this.speechTimer -= dt;
    if (this.speechTimer <= 0) {
      this.speechTimer = 18 + Math.random() * 22;
      if (dist < 9) {
        const msg = PHRASES[(Math.random() * PHRASES.length) | 0];
        this.toast(`Marlon : ${msg}`, 0xffffff);
      }
    }
  }

  sweep(axis, delta) {
    if (delta === 0) return false;
    const keys = ['x', 'y', 'z'];
    const key = keys[axis];
    this.pos[key] += delta;
    const half = WIDTH / 2;
    const eps = 1e-4;
    const minX = Math.floor(this.pos.x - half + eps), maxX = Math.floor(this.pos.x + half - eps);
    const minY = Math.floor(this.pos.y + eps), maxY = Math.floor(this.pos.y + NPC_HEIGHT - eps);
    const minZ = Math.floor(this.pos.z - half + eps), maxZ = Math.floor(this.pos.z + half - eps);
    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        for (let bx = minX; bx <= maxX; bx++) {
          if (!this.world.isSolid(bx, by, bz)) continue;
          if (axis === 0) this.pos.x = delta > 0 ? bx - half - eps : bx + 1 + half + eps;
          else if (axis === 1) {
            if (delta > 0) this.pos.y = by - NPC_HEIGHT - eps;
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

  // Is the player roughly looking at Marlon? (for the HUD label)
  isTargeted() {
    const dir = new THREE.Vector3();
    this.player.camera.getWorldDirection(dir);
    const eye = this.player.eyePosition();
    const to = this.pos.clone(); to.y += NPC_HEIGHT * 0.7;
    to.sub(eye);
    const d = to.length();
    if (d > 14) return false;
    return to.normalize().dot(dir) > 0.93;
  }
}
