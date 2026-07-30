// Friendly NPCs: Marlon (a kid in a striped sailor shirt who follows the
// player) and Professeur Cornichon (the creature expert who hosts the quiz).

import * as THREE from 'three';
import { BLOCK, isSolid as blockIsSolid, isSlab } from './blocks.js';

const GRAVITY = 24;
const WIDTH = 0.5;
const NPC_HEIGHT = 1.5;

function box(w, h, d, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
}

// look: { skin, hair, torsoSlabs[5], sleeveSegs[3], pants, shoes, hairstyle,
//         glasses, cape, mask } — cape/mask take a color, for superheroes
function buildKidMesh(look) {
  const g = new THREE.Group(); // faces -z, feet at y=0

  const legs = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group();
    const pant = box(0.15, 0.45, 0.17, look.pants);
    pant.position.y = -0.225;
    const shoe = box(0.16, 0.09, 0.2, look.shoes);
    shoe.position.set(0, -0.475, -0.02);
    leg.add(pant, shoe);
    leg.position.set(sx * 0.1, 0.53, 0);
    g.add(leg);
    legs.push(leg);
  }

  look.torsoSlabs.forEach((color, i) => {
    const slab = box(0.46, 0.1, 0.25, color);
    slab.position.y = 0.58 + i * 0.1;
    g.add(slab);
  });

  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    look.sleeveSegs.forEach((color, i) => {
      const seg = box(0.13, 0.12, 0.14, color);
      seg.position.y = -0.06 - i * 0.12;
      arm.add(seg);
    });
    const hand = box(0.12, 0.14, 0.13, look.skin);
    hand.position.y = -0.43;
    arm.add(hand);
    arm.position.set(sx * 0.3, 1.03, 0);
    g.add(arm);
    arms.push(arm);
  }

  if (look.cape) {
    const cape = box(0.44, 0.6, 0.05, look.cape);
    cape.position.set(0, 0.78, 0.17);
    cape.rotation.x = 0.12;
    g.add(cape);
  }

  const head = box(0.36, 0.36, 0.36, look.skin);
  head.position.y = 1.26;
  g.add(head);

  if (look.hat) { // construction hard hat
    const hatTop = box(0.42, 0.14, 0.42, look.hat);
    hatTop.position.y = 1.5;
    const brim = box(0.5, 0.05, 0.5, look.hat);
    brim.position.y = 1.44;
    g.add(hatTop, brim);
  } else {
    const hairTop = box(0.4, 0.1, 0.4, look.hair);
    hairTop.position.y = 1.47;
    g.add(hairTop);
  }
  const fringe = box(0.4, 0.12, 0.04, look.hair);
  fringe.position.set(0, 1.38, -0.19);
  g.add(fringe);
  if (look.hairstyle === 'bun') {
    const back = box(0.4, 0.3, 0.06, look.hair);
    back.position.set(0, 1.3, 0.2);
    const bun = box(0.16, 0.16, 0.14, look.hair);
    bun.position.set(0, 1.5, 0.24);
    g.add(back, bun);
  } else {
    const back = box(0.4, 0.22, 0.04, look.hair);
    back.position.set(0, 1.33, 0.19);
    g.add(back);
  }
  for (const sx of [-1, 1]) {
    const side = box(0.04, 0.16, 0.4, look.hair);
    side.position.set(sx * 0.19, 1.36, 0);
    g.add(side);
  }

  if (look.mask) {
    const band = box(0.4, 0.13, 0.02, look.mask);
    band.position.set(0, 1.28, -0.19);
    g.add(band);
  }
  for (const sx of [-1, 1]) {
    const eye = box(0.06, 0.07, 0.02, look.mask ? 0xffffff : 0x3d2f23);
    eye.position.set(sx * 0.09, 1.28, look.mask ? -0.2 : -0.185);
    g.add(eye);
    if (look.glasses) {
      const rim = box(0.12, 0.11, 0.015, 0x222222);
      rim.position.set(sx * 0.09, 1.28, -0.19);
      const lens = box(0.09, 0.08, 0.02, 0xbcd8e8);
      lens.position.set(sx * 0.09, 1.28, -0.195);
      g.add(rim, lens);
      const eye2 = box(0.05, 0.06, 0.02, 0x3d2f23);
      eye2.position.set(sx * 0.09, 1.28, -0.2);
      g.add(eye2);
    }
  }
  if (look.glasses) {
    const bridge = box(0.06, 0.03, 0.015, 0x222222);
    bridge.position.set(0, 1.29, -0.19);
    g.add(bridge);
  }
  const mouth = box(0.1, 0.03, 0.02, 0xc98a6d);
  mouth.position.set(0, 1.16, -0.185);
  g.add(mouth);

  g.userData.legs = legs;
  g.userData.arms = arms;
  return g;
}

class BaseNPC {
  constructor(scene, world, player, toast, opts) {
    this.world = world;
    this.player = player;
    this.toast = toast;
    this.name = opts.name;
    this.label = opts.label || opts.name;
    this.phrases = opts.phrases;
    this.walkSpeed = opts.walkSpeed;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.onGround = false;
    this.animTime = 0;
    this.speechTimer = opts.firstSpeech ?? 6;
    this.mesh = buildKidMesh(opts.look);
    scene.add(this.mesh);
  }

  surfaceY(x, z) {
    for (let y = 95; y > 0; y--) {
      if (this.world.isSolid(Math.floor(x), y, Math.floor(z))) return y + 1;
    }
    return null;
  }

  placeAt(x, z, fallbackY) {
    const y = this.surfaceY(x, z);
    this.pos.set(x, (y !== null ? y : fallbackY) + 0.1, z);
    this.vel.set(0, 0, 0);
  }

  // subclasses return { speed, yaw }
  think() { return { speed: 0, yaw: this.yaw }; }

  update(dt) {
    const { speed, yaw } = this.think(dt);
    this.yaw = yaw;

    this.vel.x = -Math.sin(this.yaw) * speed;
    this.vel.z = -Math.cos(this.yaw) * speed;
    this.vel.y -= GRAVITY * dt;
    this.vel.y = Math.max(this.vel.y, -30);

    const blockedX = this.sweep(0, this.vel.x * dt);
    this.sweep(1, this.vel.y * dt);
    const blockedZ = this.sweep(2, this.vel.z * dt);
    if ((blockedX || blockedZ) && this.onGround && speed > 0) this.vel.y = 7.5;

    this.animTime += dt;
    const swing = speed > 0 ? Math.sin(this.animTime * 8) * 0.7 : 0;
    const { legs, arms } = this.mesh.userData;
    legs[0].rotation.x = swing;
    legs[1].rotation.x = -swing;
    arms[0].rotation.x = -swing * 0.8;
    arms[1].rotation.x = swing * 0.8;

    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;

    this.speechTimer -= dt;
    if (this.speechTimer <= 0) {
      this.speechTimer = 18 + Math.random() * 22;
      const dist = this.player.pos.distanceTo(this.pos);
      if (dist < 9) {
        const msg = this.phrases[(Math.random() * this.phrases.length) | 0];
        this.toast(`${this.name} : ${msg}`, 0xffffff);
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
          const id = by < 0 ? BLOCK.STONE : this.world.getBlock(bx, by, bz);
          if (!blockIsSolid(id)) continue;
          const topY = by + (isSlab(id) ? 0.5 : 1);
          if (this.pos.y >= topY - eps && (axis !== 1 || delta < 0)) continue;
          if (axis === 0) this.pos.x = delta > 0 ? bx - half - eps : bx + 1 + half + eps;
          else if (axis === 1) {
            if (delta > 0) this.pos.y = by - NPC_HEIGHT - eps;
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

const NAVY = 0x2b3a67, WHITE = 0xf4f4f0;

export class Marlon extends BaseNPC {
  constructor(scene, world, player, toast) {
    super(scene, world, player, toast, {
      name: 'Marlon',
      label: 'Marlon — ton compagnon !',
      walkSpeed: 4.0,
      firstSpeech: 4,
      look: {
        skin: 0xe8bd93, hair: 0x9a7b4f,
        torsoSlabs: [WHITE, NAVY, WHITE, NAVY, WHITE],
        sleeveSegs: [WHITE, NAVY, WHITE],
        pants: 0x46536b, shoes: 0x2c2c2c,
        hairstyle: 'short', glasses: false,
      },
      phrases: [
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
      ],
    });
    this.placeNearPlayer();
  }

  placeNearPlayer() {
    const p = this.player.pos;
    const angle = Math.random() * Math.PI * 2;
    this.placeAt(p.x + Math.sin(angle) * 2.5, p.z + Math.cos(angle) * 2.5, p.y);
  }

  think() {
    const toPlayer = this.player.pos.clone().sub(this.pos);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > 26) this.placeNearPlayer();
    const yaw = Math.atan2(toPlayer.x, toPlayer.z) + Math.PI;
    return { speed: dist > 3.2 ? this.walkSpeed : 0, yaw };
  }
}

// Wanders around a home point; faces the player when approached.
export class Wanderer extends BaseNPC {
  constructor(scene, world, player, toast, opts, homeX, homeZ) {
    super(scene, world, player, toast, opts);
    this.home = new THREE.Vector2(homeX, homeZ);
    this.state = 'idle';
    this.stateTime = 2;
    this.placeAt(homeX, homeZ, player.pos.y);
  }

  think(dt) {
    const toPlayer = this.player.pos.clone().sub(this.pos);
    toPlayer.y = 0;
    const playerDist = toPlayer.length();

    // face the player when they come close
    if (playerDist < 5) {
      return { speed: 0, yaw: Math.atan2(toPlayer.x, toPlayer.z) + Math.PI };
    }

    this.stateTime -= dt;
    if (this.stateTime <= 0) {
      this.state = this.state === 'idle' ? 'walk' : 'idle';
      this.stateTime = this.state === 'idle' ? 2 + Math.random() * 3 : 1.5 + Math.random() * 2;
      if (this.state === 'walk') {
        const fromHome = Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.y);
        this.wanderYaw = fromHome > 8
          ? Math.atan2(this.home.x - this.pos.x, this.home.y - this.pos.z) + Math.PI
          : Math.random() * Math.PI * 2;
      }
    }
    return {
      speed: this.state === 'walk' ? this.walkSpeed : 0,
      yaw: this.state === 'walk' ? this.wanderYaw : this.yaw,
    };
  }
}

export class Cornichon extends Wanderer {
  constructor(scene, world, player, toast, homeX, homeZ) {
    super(scene, world, player, toast, {
      name: 'Prof. Cornichon',
      label: 'Professeur Cornichon — expert en créatures !',
      walkSpeed: 1.6,
      firstSpeech: 10,
      look: {
        skin: 0xdfae85, hair: 0x7a8a3a, // pickle-green hair, obviously
        torsoSlabs: [WHITE, WHITE, WHITE, WHITE, WHITE], // lab coat
        sleeveSegs: [WHITE, WHITE, WHITE],
        pants: 0x3f5a3a, shoes: 0x4a3526,
        hairstyle: 'short', glasses: true,
      },
      phrases: [
        'Bonjour, jeune dresseur !',
        'Je suis le Professeur Cornichon !',
        'Les créatures rares adorent la neige et le sable !',
        'As-tu rempli ton Dex ?',
        'Réponds bien à mon quiz pour jouer plus longtemps !',
        'Les créatures SPOOKY sont très difficiles à attraper.',
        'Un cornichon par jour, en pleine forme toujours !',
        'Reviens me voir quand tu auras tout attrapé !',
      ],
    }, homeX, homeZ);
  }
}

// Original caped superheroes who patrol the world.
export function createHeroes(scene, world, player, toast, cx, cz) {
  const eclair = new Wanderer(scene, world, player, toast, {
    name: 'Capitaine Éclair',
    label: 'Capitaine Éclair — super-héros !',
    walkSpeed: 2.6,
    firstSpeech: 14,
    look: {
      skin: 0xe8bd93, hair: 0x2c2416,
      torsoSlabs: [0x2b4fd9, 0x2b4fd9, 0xe8c53c, 0x2b4fd9, 0x2b4fd9],
      sleeveSegs: [0x2b4fd9, 0x2b4fd9, 0x2b4fd9],
      pants: 0x24398f, shoes: 0xe8c53c,
      hairstyle: 'short', glasses: false,
      cape: 0xd83a3a, mask: 0xd83a3a,
    },
    phrases: [
      "Plus rapide que l'éclair ! ⚡",
      'Justice et blocs pour tous !',
      'Un héros protège toujours ses amis !',
      'J\'ai vu une créature rare près de la montagne !',
      'Entraîne-toi bien au quiz, petit héros !',
      'Mon costume ? Cousu par ma grand-mère.',
    ],
  }, cx - 9, cz + 7);

  const nova = new Wanderer(scene, world, player, toast, {
    name: 'Super Nova',
    label: 'Super Nova — super-héroïne !',
    walkSpeed: 2.2,
    firstSpeech: 20,
    look: {
      skin: 0xc98a5e, hair: 0x3a2a5e,
      torsoSlabs: [0x7a3ae8, 0x7a3ae8, 0xe8c53c, 0x7a3ae8, 0x7a3ae8],
      sleeveSegs: [0x7a3ae8, 0x7a3ae8, 0x7a3ae8],
      pants: 0x5a2ab8, shoes: 0xe8c53c,
      hairstyle: 'bun', glasses: false,
      cape: 0xe8c53c, mask: 0x2a1a4e,
    },
    phrases: [
      'Je veille sur ce monde depuis les étoiles ! ✨',
      'Boum ! Supernova !',
      'Les vrais héros lisent bien avant de répondre !',
      'Ensemble, on est plus forts !',
      'Attrape-les tous, jeune héros !',
      'Ma cape brille même la nuit.',
    ],
  }, cx + 11, cz - 6);

  return [eclair, nova];
}

// Blocky builder minifigures in hard hats and safety vests.
export function createBuilders(scene, world, player, toast, cx, cz) {
  const VEST = 0xe8892c, STRIPE = 0xe8c53c;
  const leo = new Wanderer(scene, world, player, toast, {
    name: 'Léo le Bâtisseur',
    label: 'Léo le Bâtisseur — champion de la construction !',
    walkSpeed: 2.0,
    firstSpeech: 24,
    look: {
      skin: 0xe8bd93, hair: 0x3a2a1a,
      torsoSlabs: [VEST, STRIPE, VEST, STRIPE, VEST],
      sleeveSegs: [VEST, VEST, VEST],
      pants: 0x4a5a6a, shoes: 0x5a3a20,
      hairstyle: 'short', glasses: false,
      hat: 0xe8c53c,
    },
    phrases: [
      'Un bloc après l\'autre !',
      'On construit une tour ensemble ?',
      'As-tu vu la Tour Eiffel là-bas ?',
      'Les briques rouges, y a que ça de vrai.',
      'Mon casque ? Sécurité d\'abord !',
      'Le grand pont rouge, c\'est moi qui l\'ai fini !',
    ],
  }, cx - 12, cz - 9);

  const mia = new Wanderer(scene, world, player, toast, {
    name: 'Mia la Bâtisseuse',
    label: 'Mia la Bâtisseuse — architecte des monuments !',
    walkSpeed: 2.0,
    firstSpeech: 30,
    look: {
      skin: 0xc98a5e, hair: 0x1c1c1c,
      torsoSlabs: [VEST, STRIPE, VEST, STRIPE, VEST],
      sleeveSegs: [VEST, VEST, VEST],
      pants: 0x4a5a6a, shoes: 0x5a3a20,
      hairstyle: 'bun', glasses: false,
      hat: 0xd83a3a,
    },
    phrases: [
      'C\'est moi qui ai dessiné le gratte-ciel !',
      'Pose tes blocs bien droits !',
      'Un jour, on construira jusqu\'aux nuages.',
      'La géométrie, ça sert à construire !',
      'Va voir le grand pont, il est magnifique.',
      'Les architectes adorent les maths !',
    ],
  }, cx + 8, cz + 13);

  return [leo, mia];
}
