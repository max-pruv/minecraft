// First-person player: pointer-lock look, WASD movement, AABB voxel collision,
// gravity/jumping, swimming, and a toggleable fly mode.

import * as THREE from 'three';
import { BLOCK, isSolid as blockIsSolid, isSlab } from './blocks.js';
import { HEIGHT } from './world.js';

const WIDTH = 0.6;        // player AABB width (x and z)
// LE GABARIT D'UN VÉHICULE CONDUIT (v212). Max, capture à l'appui : « cars
// crashing into walls » — une voiture rouge encastrée dans une façade
// haussmannienne, dans une rue de Paris.
//
// Conduire, ici, c'est brancher le véhicule sur les commandes du joueur, donc
// sur SA physique — y compris sa boîte de collision, qui fait SOIXANTE
// CENTIMÈTRES de large. Une voiture en fait 2,26 : elle passait donc au
// travers de tout ce qui la bordait, murs compris, tant que le point central
// restait dans la rue. La dette était écrite dans `CLAUDE.md` depuis la v155 :
// « le véhicule a besoin de sa propre boîte de collision ».
//
// La boîte prend la LARGEUR du véhicule, pas sa longueur : une AABB ne tourne
// pas, et une boîte de 4,4 blocs ne passerait dans aucune rue même en roulant
// droit. Une voiture qui se met en travers mord donc un peu — c'est le prix
// d'une boîte alignée sur les axes, et il est très inférieur à celui d'une
// voiture fantôme.
const PLAYER_HEIGHT = 1.8;
// Assez bas pour que la tête reste dans le monde, assez haut pour qu'on
// puisse bâtir jusqu'au dernier étage.
const PLAFOND_VOL = HEIGHT - PLAYER_HEIGHT - 0.2;
const EYE_HEIGHT = 1.62;
const GRAVITY = 26;
const JUMP_SPEED = 8.6;
// LA MARCHE, RALENTIE (Max, capture depuis une rue de Londres : « la vitesse
// de marche est trop rapide ! »). 4,3 m/s était la valeur de Minecraft — mais
// là-bas un bloc fait un mètre, alors qu'ici un pâté d'immeubles en fait
// quarante : on le traversait en deux secondes, et les villes défilaient au
// lieu de se parcourir. Les distances, elles, se font en volant ou par la
// carte, pas à pied.
const WALK_SPEED = 3.2;
const SPRINT_SPEED = 5.4;
const FLY_SPEED = 11;
// Voler longtemps, c'est vouloir aller loin. Passé trois secondes en l'air,
// on double l'allure — puis, depuis que la carte fait des milliers de blocs
// (Max : « en fonction du temps de vol, la vitesse s'accélère de manière
// progressive »), elle continue de monter, sans à-coup, jusqu'à une vraie
// vitesse de croisière : Paris-Rome se survole en une demi-minute au lieu
// de deux. Un petit saut de toit en toit reste précis : les trois premières
// secondes gardent l'allure de toujours, et se poser remet tout à zéro.
// Réglé DEUX fois sur verdict de Max : la première rampe (un cran par six
// secondes, plafond ×6 atteint à vingt-sept) lui semblait encore molle —
// « j'expect une augmentation progressive de la vitesse plus rapide ». La
// montée se fait donc en dix-sept secondes, et va plus haut.
const FLY_ELAN_APRES = 2;   // secondes de vol continu avant l'élan
const FLY_ELAN = 2;         // multiplicateur au moment de l'élan
const FLY_CROISIERE = 8;    // multiplicateur maximal (88 blocs/s)
const FLY_MONTEE = 2.5;     // secondes de vol pour gagner un cran (+×1)
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
    // UNE VOITURE NE VOLE PAS (Max, août 2026 : « aujourd'hui, on est capable
    // de voler avec une voiture. Je ne veux pas qu'une voiture vole »).
    //
    // Conduire, dans ce jeu, c'est brancher le véhicule sur les commandes du
    // joueur — donc sur SA physique. Le vol en faisait partie sans que
    // personne l'ait décidé : une berline montait dans le ciel à la touche F.
    // Le drapeau vit ici parce que c'est ici que le vol se décide, et il est
    // POSÉ par la fiche de l'espèce (`vole: false`), jamais par une liste de
    // véhicules écrite ailleurs — même règle que `montable` et `nourrissable`.
    this.volInterdit = false;
    // La largeur de la boîte de collision. `WIDTH` à pied ; la fiche de
    // l'espèce la remplace quand on prend le volant (`gabarit`).
    this.gabarit = WIDTH;
    this.volDepuis = 0;       // secondes de vol continu, cf. FLY_ELAN_APRES
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

  // La fiche du véhicule décide, le joueur obéit. Monter dans une voiture
  // pose l'interdit ET coupe le vol en cours — sinon l'enfant déjà en l'air
  // repartirait avec la voiture au plafond du monde.
  interdireVol(interdit) {
    this.volInterdit = !!interdit;
    if (interdit) this.flying = false;
  }
  // Le gabarit de ce qu'on pilote. Rendu à sa valeur de piéton dès qu'on
  // descend — sans quoi l'enfant garderait la boîte d'une voiture à pied et
  // resterait bloqué entre deux murs.
  prendreGabarit(largeur) {
    this.gabarit = largeur > 0 ? largeur : WIDTH;
  }


  toggleFly() {
    // Refuser en silence serait pire que tout : l'enfant appuierait dix fois.
    // On rend `false`, et l'appelant explique pourquoi.
    if (this.volInterdit) { this.flying = false; return false; }
    this.flying = !this.flying;
    this.volDepuis = 0;   // on repart au pas : l'élan se mérite
    this.vel.y = 0;
    return true;
  }

  // Vitesse de vol du moment. Elle double après quelques secondes en l'air,
  // puis grandit d'un cran toutes les FLY_MONTEE secondes jusqu'à la
  // croisière — la progression que Max a demandée pour la grande carte.
  vitesseVol() {
    if (this.volDepuis < FLY_ELAN_APRES) return FLY_SPEED;
    const facteur = Math.min(FLY_CROISIERE, FLY_ELAN + (this.volDepuis - FLY_ELAN_APRES) / FLY_MONTEE);
    return FLY_SPEED * facteur;
  }

  // Vrai quand l'élan est pris — le jeu s'en sert pour le dire à l'enfant.
  volLance() {
    return this.flying && this.volDepuis >= FLY_ELAN_APRES;
  }

  // Vrai quand la croisière est atteinte — même usage.
  volCroisiere() {
    return this.flying && this.vitesseVol() >= FLY_SPEED * FLY_CROISIERE;
  }

  eyePosition() {
    return new THREE.Vector3(this.pos.x, this.pos.y + EYE_HEIGHT, this.pos.z);
  }

  // Does the given block position intersect the player's AABB?
  intersectsBlock(bx, by, bz) {
    const half = this.gabarit / 2;
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

    // PILOTER — LE TROISIÈME MODE, ET IL N'INVENTE AUCUNE COMMANDE.
    //
    // Trois façons d'être porté, et celle-ci manquait depuis la v155 : la
    // monture suit le joueur, le convoi suit son tracé, et le PILOTE décide
    // où l'on va. Comme les deux autres, elle se réduit aux trois nombres que
    // le clavier et le joystick tactile alimentent déjà — `forward`, `strafe`
    // et le regard. Rien de neuf à apprendre pour un enfant, et l'iPad marche
    // sans une ligne de plus.
    //
    // Le branchement est celui que le projet a écrit avant de l'implanter :
    //   forward → la poussée      strafe → le roulis      le regard → l'assiette
    //   et la portance dépend de la vitesse.
    if (this.pilote) {
      const p = this.pilote;
      // LA POUSSÉE SE GARDE QUAND ON LÂCHE. `forward` est une manette des
      // gaz, pas une pédale : c'est ce qui distingue un avion d'une voiture,
      // et c'est ce qui permet à un enfant de lâcher les commandes pour
      // regarder le paysage sans tomber.
      if (this.vitesseAvion === undefined) this.vitesseAvion = 0;
      this.vitesseAvion = Math.max(0,
        Math.min(p.max, this.vitesseAvion + forward * p.poussee * dt));
      // LE ROULIS FAIT VIRER, ET SEULEMENT EN VOLANT. Un avion à l'arrêt sur
      // le tarmac ne pivote pas sur place — c'est la même règle que le volant
      // d'une voiture, qui n'agit qu'en roulant.
      const part = this.vitesseAvion / p.max;
      this.yaw -= strafe * p.virage * dt * part;
      // LE NEZ SUIT LE REGARD. L'assiette est le tangage : on tire sur le
      // manche en regardant vers le haut.
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      this.vel.set(-Math.sin(this.yaw) * cp, sp, -Math.cos(this.yaw) * cp)
        .multiplyScalar(this.vitesseAvion);
      // LA PORTANCE DÉPEND DE LA VITESSE. Sous la vitesse de décrochage,
      // l'avion ne tient plus l'air : il descend, d'autant plus vite qu'il
      // est lent. C'est ce qui oblige à prendre son élan sur la piste avant
      // de tirer sur le manche — et ce qui fait qu'on ne décolle pas à
      // l'arrêt.
      if (this.vitesseAvion < p.decrochage) {
        this.vel.y -= GRAVITY * (1 - this.vitesseAvion / p.decrochage);
      }
      // Le ciel a le même toit que pour tout le monde.
      if (this.pos.y >= PLAFOND_VOL) this.vel.y = Math.min(this.vel.y, 0);
      const vol = this.vel.clone().multiplyScalar(dt);
      const pas = Math.max(1, Math.ceil(vol.length() / MAX_STEP));
      this.onGround = false;
      for (let i = 0; i < pas; i++) {
        this.sweepAxis(0, vol.x / pas);
        this.sweepAxis(1, vol.y / pas);
        this.sweepAxis(2, vol.z / pas);
      }
      this.syncCamera();
      return;
    }

    const bodyBlock = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.4), Math.floor(this.pos.z));
    const headBlock = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + EYE_HEIGHT), Math.floor(this.pos.z));
    this.inWater = bodyBlock === BLOCK.WATER || headBlock === BLOCK.WATER;

    // Horizontal velocity from input, rotated by yaw.
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let dx = (-sin * forward + cos * strafe);
    let dz = (-cos * forward - sin * strafe);
    const len = Math.hypot(dx, dz);
    if (len > 1) { dx /= len; dz /= len; } // keep analog magnitudes below 1

    // POSÉ, PAS EN L'AIR. En mode vol on peut marcher au sol — le vol ne se
    // coupe pas quand on atterrit — et la rampe de croisière s'appliquait
    // donc aussi à la marche : « on est à pied et pas en vol, la vitesse ne
    // doit pas accélérer » (Max). `onGround` ne sert à rien ici : en vol la
    // vitesse verticale est nulle et la collision vers le bas ne se déclenche
    // jamais. Posé = un bloc solide juste sous les pieds, et alors on marche
    // à la vitesse de la marche, élan remis à zéro.
    const solSous = this.world.getBlock(
      Math.floor(this.pos.x), Math.floor(this.pos.y - 0.15), Math.floor(this.pos.z));
    const pose = blockIsSolid(solSous);
    const enLair = this.flying && !pose;
    if (enLair) this.volDepuis += dt; else this.volDepuis = 0;

    let speed = k.has('ShiftLeft') || k.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED;
    if (enLair) speed = this.vitesseVol();
    else if (this.inWater) speed = SWIM_SPEED;
    if (this.boost) speed *= this.boost; // riding a mount / berry-juice power-up

    this.vel.x = dx * speed;
    this.vel.z = dz * speed;

    if (this.flying) {
      const v = this.vitesseVol();
      this.vel.y = 0;
      if (k.has('Space')) this.vel.y = v;
      if (k.has('KeyC')) this.vel.y = -v;
      // Le ciel a un toit.
      //
      // Rien n'arrêtait la montée : un enfant qui gardait le doigt sur
      // « monter » sortait du monde par le haut, dans une zone où plus rien
      // n'existe et où poser un bloc ne fait rien du tout — le jeu finissait
      // par le reposer au sol sans un mot, comme s'il avait triché. On bute
      // désormais contre le plafond, ce qui se comprend tout seul.
      if (this.pos.y >= PLAFOND_VOL) this.vel.y = Math.min(this.vel.y, 0);
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

    const half = this.gabarit / 2;
    const eps = 1e-4;
    const minX = Math.floor(p.x - half + eps), maxX = Math.floor(p.x + half - eps);
    const minY = Math.floor(p.y + eps), maxY = Math.floor(p.y + PLAYER_HEIGHT - eps);
    const minZ = Math.floor(p.z - half + eps), maxZ = Math.floor(p.z + half - eps);

    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        for (let bx = minX; bx <= maxX; bx++) {
          const id = by < 0 ? BLOCK.STONE : this.world.getBlock(bx, by, bz);
          if (!blockIsSolid(id)) continue;
          const topY = by + (isSlab(id) ? 0.5 : 1); // slabs only fill their lower half
          // above the block's top: no side collision, and no landing yet while falling
          if (p.y >= topY - eps && (axis !== 1 || delta < 0)) continue;
          if (axis === 0) {
            p.x = delta > 0 ? bx - half - eps : bx + 1 + half + eps;
          } else if (axis === 1) {
            if (delta > 0) {
              p.y = by - PLAYER_HEIGHT - eps;
            } else {
              p.y = topY + eps;
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
