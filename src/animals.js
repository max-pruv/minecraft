// Passive animals, Minecraft-style: farm animals wander the grasslands,
// beach animals live on the sand, penguins waddle on the snowy peaks.
// Some spawn as babies. They are ambience — catch-balls ignore them.

import * as THREE from 'three';
import { BLOCK, isSolid as blockIsSolid, isSlab } from './blocks.js';
import { WATER_LEVEL } from './world.js';
import { MONTURES, MODELES_MONTURE } from './montures.js';

const GRAVITY = 22;

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

// Builders face -z, feet at y=0. Legs stored in userData for walk animation.
function quadruped({ bodyColor, headColor, bodyW = 0.55, bodyH = 0.45, bodyL = 0.85, legH = 0.35, extras }) {
  const g = new THREE.Group();
  const legs = [];
  const legPos = [[-0.18, -0.28], [0.18, -0.28], [-0.18, 0.28], [0.18, 0.28]];
  for (const [lx, lz] of legPos) {
    const leg = box(0.13, legH, 0.13, 0x3a2e22, lx, legH / 2, lz);
    g.add(leg);
    legs.push(leg);
  }
  const body = box(bodyW, bodyH, bodyL, bodyColor, 0, legH + bodyH / 2, 0);
  g.add(body);
  const head = box(0.36, 0.34, 0.32, headColor, 0, legH + bodyH + 0.05, -bodyL / 2 - 0.05);
  g.add(head);
  for (const sx of [-1, 1]) {
    g.add(box(0.05, 0.06, 0.02, 0x1a1a1a, sx * 0.1, legH + bodyH + 0.1, -bodyL / 2 - 0.22));
  }
  if (extras) extras(g, { legH, bodyH, bodyL });
  g.userData.legs = legs;
  return g;
}

const BUILDERS = {
  cow: () => quadruped({
    bodyColor: 0xf2f2ee, headColor: 0xf2f2ee,
    extras(g, { legH, bodyH, bodyL }) {
      g.add(box(0.56, 0.2, 0.3, 0x2b2b2b, 0, legH + bodyH - 0.05, 0.1));  // patches
      g.add(box(0.3, 0.46, 0.2, 0x2b2b2b, -0.1, legH + 0.15, -0.2));
      g.add(box(0.2, 0.1, 0.06, 0xe8bd93, 0, legH + bodyH - 0.02, -bodyL / 2 - 0.23)); // muzzle
      for (const sx of [-1, 1]) g.add(box(0.06, 0.08, 0.06, 0xd8d8d0, sx * 0.2, legH + bodyH + 0.26, -bodyL / 2 - 0.02)); // horns
    },
  }),
  pig: () => quadruped({
    bodyColor: 0xf0a8b8, headColor: 0xf0a8b8, legH: 0.25,
    extras(g, { legH, bodyH, bodyL }) {
      g.add(box(0.14, 0.1, 0.05, 0xd87a90, 0, legH + bodyH + 0.02, -bodyL / 2 - 0.24)); // snout
      g.add(box(0.08, 0.1, 0.08, 0xf0a8b8, 0, legH + bodyH / 2, bodyL / 2 + 0.03));     // tail
    },
  }),
  sheep: () => quadruped({
    bodyColor: 0xf4f0e6, headColor: 0xd8cfc0, bodyH: 0.5,
    extras(g, { legH, bodyH }) {
      g.add(box(0.4, 0.14, 0.3, 0xf4f0e6, 0, legH + bodyH + 0.22, -0.55)); // wool cap
    },
  }),
  horse: () => quadruped({
    bodyColor: 0x8a5a30, headColor: 0x8a5a30, bodyH: 0.5, bodyL: 1.0, legH: 0.5,
    extras(g, { legH, bodyH, bodyL }) {
      g.add(box(0.2, 0.4, 0.2, 0x8a5a30, 0, legH + bodyH + 0.2, -bodyL / 2 + 0.02));  // neck
      g.add(box(0.1, 0.34, 0.06, 0x4a3218, 0, legH + bodyH + 0.28, -bodyL / 2 + 0.16)); // mane
      g.add(box(0.1, 0.35, 0.1, 0x4a3218, 0, legH + bodyH - 0.05, bodyL / 2 + 0.05));   // tail
    },
  }),
  chicken: () => {
    const g = new THREE.Group();
    const legs = [];
    for (const sx of [-0.07, 0.07]) {
      const leg = box(0.05, 0.2, 0.05, 0xe8a53c, sx, 0.1, 0);
      g.add(leg);
      legs.push(leg);
    }
    g.add(box(0.32, 0.3, 0.42, 0xf4f2ec, 0, 0.35, 0));
    g.add(box(0.2, 0.24, 0.2, 0xf4f2ec, 0, 0.62, -0.24));    // head
    g.add(box(0.08, 0.06, 0.08, 0xe8a53c, 0, 0.6, -0.38));   // beak
    g.add(box(0.06, 0.08, 0.1, 0xd83a3a, 0, 0.76, -0.24));   // comb
    for (const sx of [-1, 1]) g.add(box(0.04, 0.16, 0.3, 0xe4e0d6, sx * 0.19, 0.4, 0)); // wings
    for (const sx of [-1, 1]) g.add(box(0.04, 0.05, 0.02, 0x1a1a1a, sx * 0.06, 0.66, -0.34));
    g.userData.legs = legs;
    return g;
  },
  rabbit: () => {
    const g = new THREE.Group();
    const legs = [];
    for (const [lx, lz] of [[-0.09, -0.1], [0.09, -0.1], [-0.09, 0.12], [0.09, 0.12]]) {
      const leg = box(0.07, 0.12, 0.07, 0xb0a090, lx, 0.06, lz);
      g.add(leg);
      legs.push(leg);
    }
    g.add(box(0.28, 0.24, 0.4, 0xc4b4a4, 0, 0.24, 0));
    g.add(box(0.2, 0.18, 0.18, 0xc4b4a4, 0, 0.42, -0.24));
    for (const sx of [-1, 1]) {
      g.add(box(0.06, 0.22, 0.04, 0xc4b4a4, sx * 0.06, 0.62, -0.24)); // long ears
      g.add(box(0.04, 0.05, 0.02, 0x1a1a1a, sx * 0.05, 0.44, -0.34));
    }
    g.add(box(0.1, 0.1, 0.08, 0xf2f2ee, 0, 0.26, 0.22)); // fluffy tail
    g.userData.legs = legs;
    return g;
  },
  goat: () => quadruped({
    bodyColor: 0xd8d4cc, headColor: 0xd8d4cc,
    extras(g, { legH, bodyH, bodyL }) {
      for (const sx of [-1, 1]) g.add(box(0.06, 0.14, 0.06, 0x8a7a5a, sx * 0.12, legH + bodyH + 0.3, -bodyL / 2 + 0.02)); // horns
      g.add(box(0.08, 0.12, 0.06, 0xbab4a8, 0, legH + bodyH - 0.08, -bodyL / 2 - 0.18)); // little beard
    },
  }),
  deer: () => quadruped({
    bodyColor: 0x9a6b3f, headColor: 0x9a6b3f, bodyH: 0.42, bodyL: 0.9, legH: 0.5,
    extras(g, { legH, bodyH, bodyL }) {
      for (const sx of [-1, 1]) { // antlers
        g.add(box(0.05, 0.26, 0.05, 0x6a4a26, sx * 0.12, legH + bodyH + 0.36, -bodyL / 2 - 0.02));
        g.add(box(0.16, 0.05, 0.05, 0x6a4a26, sx * 0.16, legH + bodyH + 0.46, -bodyL / 2 - 0.02));
      }
      g.add(box(0.12, 0.12, 0.06, 0xf2ede2, 0, legH + bodyH - 0.02, bodyL / 2 + 0.03)); // white tail
    },
  }),
  fox: () => quadruped({
    bodyColor: 0xe07a3a, headColor: 0xe07a3a, bodyW: 0.42, bodyH: 0.36, bodyL: 0.7, legH: 0.3,
    extras(g, { legH, bodyH, bodyL }) {
      for (const sx of [-1, 1]) g.add(box(0.08, 0.12, 0.04, 0xe07a3a, sx * 0.11, legH + bodyH + 0.26, -bodyL / 2 - 0.02)); // pointy ears
      g.add(box(0.12, 0.1, 0.08, 0xf2ede2, 0, legH + bodyH - 0.02, -bodyL / 2 - 0.22)); // white muzzle
      g.add(box(0.15, 0.15, 0.34, 0xe07a3a, 0, legH + bodyH / 2 + 0.05, bodyL / 2 + 0.18)); // bushy tail…
      g.add(box(0.13, 0.13, 0.1, 0xf2ede2, 0, legH + bodyH / 2 + 0.05, bodyL / 2 + 0.38));  // …with a white tip
    },
  }),
  wolf: () => quadruped({
    bodyColor: 0x9a9aa2, headColor: 0x9a9aa2, bodyH: 0.42, bodyL: 0.85, legH: 0.4,
    extras(g, { legH, bodyH, bodyL }) {
      for (const sx of [-1, 1]) g.add(box(0.08, 0.12, 0.05, 0x7a7a82, sx * 0.11, legH + bodyH + 0.26, -bodyL / 2 - 0.02)); // ears
      g.add(box(0.12, 0.12, 0.3, 0x7a7a82, 0, legH + bodyH / 2 + 0.08, bodyL / 2 + 0.15)); // tail
      g.add(box(0.14, 0.1, 0.1, 0xc6c6cc, 0, legH + bodyH - 0.04, -bodyL / 2 - 0.2)); // muzzle
    },
  }),
  duck: () => {
    const g = new THREE.Group();
    const legs = [];
    for (const sx of [-0.07, 0.07]) {
      const leg = box(0.05, 0.16, 0.05, 0xe8963c, sx, 0.08, 0);
      g.add(leg);
      legs.push(leg);
    }
    g.add(box(0.32, 0.26, 0.44, 0x9a8a6a, 0, 0.3, 0));       // brown body
    g.add(box(0.18, 0.2, 0.18, 0x2a7a3a, 0, 0.56, -0.24));   // green mallard head
    g.add(box(0.1, 0.05, 0.12, 0xe8c53c, 0, 0.52, -0.38));   // flat yellow bill
    for (const sx of [-1, 1]) g.add(box(0.04, 0.14, 0.3, 0x8a7a5a, sx * 0.19, 0.34, 0)); // wings
    for (const sx of [-1, 1]) g.add(box(0.04, 0.04, 0.02, 0x1a1a1a, sx * 0.06, 0.6, -0.32));
    g.userData.legs = legs;
    return g;
  },
  turtle: () => {
    const g = new THREE.Group();
    const legs = [];
    for (const [lx, lz] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.18], [0.2, 0.18]]) {
      const leg = box(0.1, 0.1, 0.12, 0x8aa04a, lx, 0.05, lz);
      g.add(leg);
      legs.push(leg);
    }
    g.add(box(0.4, 0.12, 0.5, 0x8aa04a, 0, 0.14, 0));        // body
    g.add(box(0.44, 0.14, 0.52, 0x4a7a3a, 0, 0.27, 0));      // shell
    g.add(box(0.3, 0.08, 0.38, 0x3a6a2e, 0, 0.38, 0));       // shell top
    g.add(box(0.16, 0.14, 0.14, 0x8aa04a, 0, 0.2, -0.32));   // head
    for (const sx of [-1, 1]) g.add(box(0.03, 0.04, 0.02, 0x1a1a1a, sx * 0.05, 0.24, -0.4));
    g.userData.legs = legs;
    return g;
  },
  crab: () => {
    const g = new THREE.Group();
    const legs = [];
    for (const [lx, lz] of [[-0.28, -0.08], [0.28, -0.08], [-0.28, 0.12], [0.28, 0.12]]) {
      const leg = box(0.06, 0.12, 0.06, 0xb83a2e, lx, 0.06, lz);
      g.add(leg);
      legs.push(leg);
    }
    g.add(box(0.5, 0.18, 0.36, 0xd84a3a, 0, 0.22, 0));       // flat body
    for (const sx of [-1, 1]) {
      g.add(box(0.12, 0.12, 0.14, 0xe86a5a, sx * 0.24, 0.24, -0.24)); // claws
      g.add(box(0.04, 0.1, 0.04, 0xd84a3a, sx * 0.08, 0.38, -0.1));   // eye stalks
      g.add(box(0.05, 0.05, 0.05, 0x1a1a1a, sx * 0.08, 0.45, -0.1));
    }
    g.userData.legs = legs;
    return g;
  },
  penguin: () => {
    const g = new THREE.Group();
    const legs = [];
    for (const sx of [-0.08, 0.08]) {
      const leg = box(0.08, 0.08, 0.12, 0xe8963c, sx, 0.04, 0);
      g.add(leg);
      legs.push(leg);
    }
    g.add(box(0.34, 0.5, 0.3, 0x2a2a34, 0, 0.33, 0));        // body
    g.add(box(0.24, 0.38, 0.05, 0xf2f2ee, 0, 0.3, -0.15));   // white belly
    g.add(box(0.26, 0.22, 0.26, 0x2a2a34, 0, 0.68, 0));      // head
    g.add(box(0.07, 0.05, 0.12, 0xe8963c, 0, 0.66, -0.18));  // beak
    for (const sx of [-1, 1]) {
      g.add(box(0.05, 0.3, 0.16, 0x2a2a34, sx * 0.2, 0.4, 0)); // flippers
      g.add(box(0.04, 0.05, 0.02, 0x1a1a1a, sx * 0.07, 0.72, -0.14));
    }
    g.userData.legs = legs;
    return g;
  },
  squirrel: () => {
    const g = new THREE.Group();
    const legs = [];
    for (const [lx, lz] of [[-0.07, -0.08], [0.07, -0.08], [-0.07, 0.1], [0.07, 0.1]]) {
      const leg = box(0.05, 0.1, 0.05, 0x8a5430, lx, 0.05, lz);
      g.add(leg);
      legs.push(leg);
    }
    g.add(box(0.2, 0.18, 0.32, 0xa4643a, 0, 0.2, 0));        // body
    g.add(box(0.16, 0.15, 0.15, 0xa4643a, 0, 0.36, -0.2));   // head
    for (const sx of [-1, 1]) {
      g.add(box(0.04, 0.07, 0.03, 0xa4643a, sx * 0.05, 0.48, -0.2)); // little ears
      g.add(box(0.03, 0.04, 0.02, 0x1a1a1a, sx * 0.04, 0.38, -0.29));
    }
    g.add(box(0.14, 0.4, 0.14, 0xb87848, 0, 0.34, 0.22));    // big fluffy tail, raised
    g.userData.legs = legs;
    return g;
  },
  ...MODELES_MONTURE,
};

// habitat: 'grass' (default) for meadows, 'sand' for beaches, 'snow' for peaks
const SPECIES = [
  { key: 'cow', name: 'Vache', cry: 'Meuh !', emoji: '🐄', speed: 1.0, height: 1.1, width: 0.7, meat: '🥩 Steak' },
  { key: 'pig', name: 'Cochon', cry: 'Groin groin !', emoji: '🐷', speed: 1.1, height: 0.8, width: 0.6, meat: '🍖 Côtelette' },
  { key: 'sheep', name: 'Mouton', cry: 'Bêêê !', emoji: '🐑', speed: 0.9, height: 1.0, width: 0.65, meat: '🍖 Gigot' },
  { key: 'horse', name: 'Cheval', cry: 'Hiiii !', emoji: '🐴', speed: 1.8, height: 1.4, width: 0.7, meat: '🍖 Viande', montable: true, allure: 2.2, assise: 1.0 },
  { key: 'chicken', name: 'Poule', cry: 'Cot cot !', emoji: '🐔', speed: 0.8, height: 0.7, width: 0.4, meat: '🍗 Poulet' },
  { key: 'rabbit', name: 'Lapin', cry: '…sniff sniff', emoji: '🐰', speed: 1.4, height: 0.6, width: 0.4, hopper: true, meat: '🍗 Lapin' },
  { key: 'goat', name: 'Chèvre', cry: 'Bêêêh !', emoji: '🐐', speed: 1.2, height: 1.0, width: 0.6, meat: '🍖 Gigot' },
  { key: 'deer', name: 'Cerf', cry: '…brame !', emoji: '🦌', speed: 1.9, height: 1.3, width: 0.65, meat: '🍖 Viande', montable: true, allure: 2.4, assise: 0.95 },
  { key: 'fox', name: 'Renard', cry: 'Glapit !', emoji: '🦊', speed: 1.7, height: 0.7, width: 0.5, meat: '🍓 Baies' },
  { key: 'wolf', name: 'Loup', cry: 'Aouuuh !', emoji: '🐺', speed: 1.6, height: 0.9, width: 0.6, meat: '🍖 Viande', montable: true, allure: 2.1, assise: 0.85 },
  { key: 'squirrel', name: 'Écureuil', cry: '…scrat scrat', emoji: '🐿️', speed: 1.5, height: 0.5, width: 0.35, hopper: true, meat: '🌰 Noisette' },
  { key: 'duck', name: 'Canard', cry: 'Coin coin !', emoji: '🦆', speed: 0.9, height: 0.7, width: 0.4, habitat: 'sand', meat: '🍗 Canard' },
  { key: 'turtle', name: 'Tortue', cry: '…', emoji: '🐢', speed: 0.4, height: 0.5, width: 0.55, habitat: 'sand', meat: '🥚 Œuf' },
  { key: 'crab', name: 'Crabe', cry: 'Clac clac !', emoji: '🦀', speed: 1.0, height: 0.5, width: 0.6, habitat: 'sand', meat: '🦀 Pince de crabe' },
  { key: 'penguin', name: 'Manchot', cry: 'Groink !', emoji: '🐧', speed: 0.9, height: 0.9, width: 0.45, habitat: 'snow', meat: '🐟 Poisson' },
  // Les bêtes qu'on peut monter vivent dans le même bestiaire que les autres :
  // elles broutent, fuient et se reproduisent exactement pareil. Ce qui les
  // distingue tient dans leur fiche (src/montures.js), pas dans leur code.
  ...MONTURES,
];

// Un peu plus de monde à l'écran depuis qu'il y a huit espèces de plus : sans
// cela, on pouvait marcher longtemps sans croiser une seule bête à monter.
const MAX_ANIMALS = 20;

class Animal {
  constructor(def, x, y, z, baby) {
    this.def = def;
    this.baby = baby;
    this.scale = baby ? 0.55 : 1;
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.yaw = Math.random() * Math.PI * 2;
    this.state = 'idle';
    this.stateTime = 1 + Math.random() * 3;
    this.onGround = false;
    this.animTime = 0;
    this.cryTimer = 6 + Math.random() * 20;
    this.hp = baby ? 2 : 3;
    this.fleeTime = 0;
    this.dying = 0;
    this.mesh = BUILDERS[def.key]();
    this.mesh.scale.setScalar(this.scale);
  }

  // A hit from the player: flash red, flee away, and eventually drop meat.
  hurt(player) {
    if (this.dying > 0) return false;
    this.hp--;
    this.fleeTime = 2.5;
    this.yaw = Math.atan2(this.pos.x - player.pos.x, this.pos.z - player.pos.z);
    this.state = 'walk';
    this.stateTime = Math.max(this.stateTime, 2.5);
    this.mesh.traverse((o) => {
      if (o.isMesh && o.material && o.material.color) {
        if (o.userData.baseColor === undefined) o.userData.baseColor = o.material.color.getHex();
        o.material.color.setHex(0xff6655);
      }
    });
    setTimeout(() => {
      this.mesh.traverse((o) => {
        if (o.isMesh && o.userData.baseColor !== undefined) o.material.color.setHex(o.userData.baseColor);
      });
    }, 160);
    if (this.hp <= 0) { this.dying = 0.5; return true; }
    return false;
  }

  update(dt, world, player, toast) {
    if (this.dying > 0) { // gentle poof: squash down and fade out
      this.dying -= dt;
      const t = Math.max(0.02, this.dying / 0.5);
      this.mesh.scale.set(this.scale * (2 - t), this.scale * t, this.scale * (2 - t));
      this.mesh.position.copy(this.pos);
      return;
    }
    this.fleeTime -= dt;
    this.stateTime -= dt;
    if (this.stateTime <= 0) {
      this.state = this.state === 'idle' ? 'walk' : 'idle';
      this.stateTime = this.state === 'idle' ? 1.5 + Math.random() * 3 : 1.5 + Math.random() * 2.5;
      if (this.state === 'walk') this.yaw = Math.random() * Math.PI * 2;
    }
    const panic = this.fleeTime > 0 ? 2.2 : 1;
    const speed = this.state === 'walk' ? this.def.speed * this.scale * panic : 0;

    this.vel.x = Math.sin(this.yaw) * speed;
    this.vel.z = Math.cos(this.yaw) * speed;
    this.vel.y -= GRAVITY * dt;
    this.vel.y = Math.max(this.vel.y, -30);
    if (this.def.hopper && speed > 0 && this.onGround) this.vel.y = 4.5;

    const blockedX = this.sweep(world, 0, this.vel.x * dt);
    this.sweep(world, 1, this.vel.y * dt);
    const blockedZ = this.sweep(world, 2, this.vel.z * dt);
    if ((blockedX || blockedZ) && this.onGround) {
      if (!this.def.hopper && speed > 0) this.vel.y = 5;
      if (this.state === 'walk') this.yaw += Math.PI / 2;
    }

    this.animTime += dt;
    const swing = speed > 0 ? Math.sin(this.animTime * 8) * 0.5 : 0;
    this.mesh.userData.legs.forEach((leg, i) => { leg.rotation.x = i % 2 ? -swing : swing; });
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw + Math.PI;

    // animal sounds when the player is nearby
    this.cryTimer -= dt;
    if (this.cryTimer <= 0) {
      this.cryTimer = 12 + Math.random() * 20;
      if (this.pos.distanceTo(player.pos) < 6) {
        toast(`${this.def.emoji} ${this.def.cry}`, 0xffffff);
      }
    }
  }

  sweep(world, axis, delta) {
    if (delta === 0) return false;
    const keys = ['x', 'y', 'z'];
    const key = keys[axis];
    this.pos[key] += delta;
    const half = (this.def.width * this.scale) / 2;
    const h = this.def.height * this.scale;
    const eps = 1e-4;
    const minX = Math.floor(this.pos.x - half + eps), maxX = Math.floor(this.pos.x + half - eps);
    const minY = Math.floor(this.pos.y + eps), maxY = Math.floor(this.pos.y + h - eps);
    const minZ = Math.floor(this.pos.z - half + eps), maxZ = Math.floor(this.pos.z + half - eps);
    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        for (let bx = minX; bx <= maxX; bx++) {
          const id = by < 0 ? BLOCK.STONE : world.getBlock(bx, by, bz);
          if (!blockIsSolid(id)) continue;
          const topY = by + (isSlab(id) ? 0.5 : 1);
          if (this.pos.y >= topY - eps && (axis !== 1 || delta < 0)) continue;
          if (axis === 0) this.pos.x = delta > 0 ? bx - half - eps : bx + 1 + half + eps;
          else if (axis === 1) {
            if (delta > 0) this.pos.y = by - h - eps;
            else { this.pos.y = topY + eps; this.onGround = true; }
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

export class AnimalManager {
  constructor(scene, world, player, toast) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.toast = toast;
    this.animals = [];
    this.spawnTimer = 1;
    this.onHarvest = null; // hook(def) — set by main.js to award the meat
  }

  // Player attacks the animal in the crosshair (within melee reach).
  attack(a) {
    if (!a || a.dying > 0) return;
    const dead = a.hurt(this.player);
    if (!dead) this.toast(`${a.def.emoji} Aïe ! (${a.hp} ❤️)`, 0xffb1a1);
  }

  trySpawn() {
    if (this.animals.length >= MAX_ANIMALS) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 30;
    const x = Math.floor(this.player.pos.x + Math.sin(angle) * dist);
    const z = Math.floor(this.player.pos.z + Math.cos(angle) * dist);
    const y = this.world.sommetColonne(x, z);
    const surface = y + 1;
    if (surface <= WATER_LEVEL) return; // never in the water
    // the ground block decides who lives here: meadow, beach or snowy peak
    const ground = this.world.getBlock(x, y, z);
    const habitat = ground === BLOCK.GRASS ? 'grass'
      : ground === BLOCK.SAND ? 'sand'
      : ground === BLOCK.SNOW ? 'snow' : null;
    if (!habitat) return;
    const pool = SPECIES.filter((s) => (s.habitat || 'grass') === habitat);
    const def = pool[Math.floor(Math.random() * pool.length)];
    const baby = Math.random() < 0.2;
    const animal = new Animal(def, x + 0.5, surface + 0.1, z + 0.5, baby);
    this.animals.push(animal);
    this.scene.add(animal.mesh);
  }

  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.5;
      this.trySpawn();
    }
    for (const a of [...this.animals]) {
      if (a.dying > 0) {
        a.update(dt, this.world, this.player, this.toast);
        if (a.dying <= 0) { // poof finished: award the meat
          this.scene.remove(a.mesh);
          this.animals = this.animals.filter((o) => o !== a);
          if (this.onHarvest) this.onHarvest(a.def);
        }
        continue;
      }
      if (a.pos.distanceTo(this.player.pos) > 70) {
        this.scene.remove(a.mesh);
        this.animals = this.animals.filter((o) => o !== a);
        continue;
      }
      a.update(dt, this.world, this.player, this.toast);
    }
  }

  // The animal the player is aiming at, for the HUD label.
  targeted() {
    const dir = new THREE.Vector3();
    this.player.camera.getWorldDirection(dir);
    const eye = this.player.eyePosition();
    let best = null, bestDot = 0.93;
    for (const a of this.animals) {
      if (a.dying > 0) continue;
      const to = a.pos.clone();
      to.y += a.def.height * a.scale * 0.6;
      to.sub(eye);
      const d = to.length();
      if (d > 18) continue;
      const dot = to.normalize().dot(dir);
      if (dot > bestDot) { bestDot = dot; best = a; }
    }
    return best;
  }

  // La bête qu'on propose de monter.
  //
  // Ce n'est volontairement pas la même chose que `targeted()`. Viser demande
  // de pointer le museau au degré près : c'est juste pour nourrir, où l'on
  // choisit vraiment un animal parmi d'autres. Pour monter, l'enfant ne vise
  // pas — il marche vers le cheval et veut grimper. On prend donc la plus
  // proche des bêtes montables qui se trouve devant soi, au sens large : tout
  // ce qui n'est pas dans le dos. Un bébé ne se monte pas.
  monture(portee = 8) {
    const dir = new THREE.Vector3();
    this.player.camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) return null;
    dir.normalize();
    const eye = this.player.eyePosition();
    let best = null, bestD = portee;
    for (const a of this.animals) {
      if (a.dying > 0 || a.baby || !a.def.montable) continue;
      const dx = a.pos.x - eye.x, dz = a.pos.z - eye.z;
      const d = Math.hypot(dx, dz);
      if (d > bestD) continue;
      // Tout près, l'orientation n'a plus de sens : on est déjà contre la bête.
      if (d > 1.2 && (dx * dir.x + dz * dir.z) / d < 0.2) continue;
      bestD = d;
      best = a;
    }
    return best;
  }

  // Poser une bête d'une espèce donnée, au sol, à l'endroit demandé. Sert au
  // banc d'essai, et un jour aux enclos : c'est le même chemin que la ponte
  // naturelle, surface comprise.
  invoquer(key, x, z, baby = false) {
    const def = SPECIES.find((s) => s.key === key);
    if (!def) return null;
    const bx = Math.floor(x), bz = Math.floor(z);
    const y = this.world.sommetColonne(bx, bz);
    const animal = new Animal(def, bx + 0.5, y + 1.1, bz + 0.5, baby);
    this.animals.push(animal);
    this.scene.add(animal.mesh);
    return animal;
  }
}
