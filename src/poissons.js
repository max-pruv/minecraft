// Les poissons : la vie sous l'eau.
//
// Max : « add fish swimming ». Les océans du planisphère, les fleuves des
// villes, les lacs de la campagne : tout ça était de l'eau parfaitement
// immobile. Voici les poissons — petits, colorés, et qui NAGENT : ils
// avancent, ondulent de la queue, virent quand le bord ou le fond approche.
//
// LE MÊME PRINCIPE PARESSEUX QUE LES PASSANTS. On ne peuple pas les océans du
// globe : on entretient un petit banc AUTOUR de l'enfant. Toutes les deux
// secondes, si un poisson manque à l'appel, on en fait naître un dans une
// colonne d'eau à portée de vue ; celui qui reste loin derrière rend son
// mesh. Le monde entier semble ainsi habité, pour le prix d'une vingtaine de
// petits meshes.
//
// ILS RESTENT DANS L'EAU, PAR CONSTRUCTION. Chaque pas de nage regarde le
// bloc DEVANT le museau : si ce n'est pas de l'eau (une berge, le fond, la
// surface), le poisson vire — et s'il se retrouve malgré tout hors de l'eau
// (un chunk qui se recharge autrement), il disparaît au prochain entretien
// plutôt que de flotter dans le pré.

import * as THREE from 'three';
import { BLOCK } from './blocks.js';
import { WATER_LEVEL } from './world.js';

const EFFECTIF = 22;            // le banc autour de l'enfant
// Naître à portée de VUE : sous l'eau, on ne voit pas à trente blocs — un
// banc né à quarante-six blocs (première coupe) était invisible, et la mer
// paraissait vide alors que vingt-deux poissons y nageaient. De neuf à
// trente-sept blocs : jamais sous le nez, toujours dans le bleu qu'on voit.
const NAISSANCE_MIN = 9;
const NAISSANCE_MAX = 37;
const PORTEE_OUBLI = 110;       // au-delà, le poisson rend son mesh
const PORTEE_ANIMATION = 100;   // on n'anime que ce qui peut se voir

// Les robes : des tropicaux de récif, pas des sardines — c'est un jeu
// d'enfants, les poissons y sont orange, rayés, turquoise.
const ROBES = [
  { corps: 0xf08a2a, queue: 0xf0c83a },   // poisson-clown
  { corps: 0x3a9ad8, queue: 0x8ad8f0 },   // chirurgien bleu
  { corps: 0xe8d83a, queue: 0xf0f0ea },   // demoiselle jaune
  { corps: 0xd84a6a, queue: 0xf08aa8 },   // vivaneau rose
  { corps: 0x4ac8a8, queue: 0x2a8a6a },   // turquoise
  { corps: 0x9a6ad8, queue: 0xc8a8f0 },   // gramma violet
];

function estEau(world, x, y, z) {
  return world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) === BLOCK.WATER;
}

function construirePoisson(robe, taille) {
  const g = new THREE.Group();
  // Basic, pas Lambert : sous l'eau, la lumière de la scène éteignait les
  // robes — le poisson-clown ressortait marron. Un poisson de récif est un
  // aplat de couleur vive, et c'est la brume bleue qui fait l'ambiance.
  const mat = (c) => new THREE.MeshBasicMaterial({ color: c });
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.24, 0.14), mat(robe.corps));
  g.add(corps);
  const queue = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), mat(robe.queue));
  queue.position.x = -0.34;
  g.add(queue);
  const nageoire = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.04), mat(robe.queue));
  nageoire.position.set(0.05, 0.18, 0);
  g.add(nageoire);
  g.scale.setScalar(taille);
  g.userData.queue = queue;
  return g;
}

export function createPoissons({ scene, world, player }) {
  const banc = [];
  let entretien = 0;

  // Une colonne d'eau naviguable près de l'enfant, ou null : on tire un point
  // au hasard dans la couronne de naissance et on regarde si l'eau y est
  // assez profonde pour nager (le bloc sous la surface ET celui du dessous).
  function berceau() {
    const a = Math.random() * Math.PI * 2;
    const d = NAISSANCE_MIN + (NAISSANCE_MAX - NAISSANCE_MIN) * Math.random();
    const x = player.pos.x + Math.cos(a) * d, z = player.pos.z + Math.sin(a) * d;
    const fond = world.terrainHeight(Math.floor(x), Math.floor(z));
    if (fond >= WATER_LEVEL - 1) return null;                  // pas d'eau, ou une flaque
    const y = Math.max(fond + 1.4, WATER_LEVEL - 1.6 - Math.random() * 3);
    if (!estEau(world, x, y, z)) return null;                  // une ville a posé son quai ici
    return { x, y, z };
  }

  function naitre() {
    const lieu = berceau();
    if (!lieu) return false;
    const robe = ROBES[Math.floor(Math.random() * ROBES.length)];
    const mesh = construirePoisson(robe, 0.9 + Math.random() * 0.8);
    mesh.position.set(lieu.x, lieu.y, lieu.z);
    scene.add(mesh);
    banc.push({
      mesh, cap: Math.random() * Math.PI * 2,
      allure: 0.7 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
    });
    return true;
  }

  function oublier(i) {
    const p = banc[i];
    scene.remove(p.mesh);
    p.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    banc.splice(i, 1);
  }

  function update(dt) {
    // L'entretien du banc : naissances et oublis, toutes les secondes. Une
    // seule tentative par entretien peuplait la mer en sept minutes — un
    // enfant qui plonge veut des poissons TOUT DE SUITE : on tire jusqu'à
    // huit points, on accorde jusqu'à trois naissances, et le banc est là
    // en une vingtaine de secondes sans jamais apparaître d'un bloc.
    entretien -= dt;
    if (entretien <= 0) {
      entretien = 1;
      for (let i = banc.length - 1; i >= 0; i--) {
        const m = banc[i].mesh.position;
        if (Math.hypot(player.pos.x - m.x, player.pos.z - m.z) > PORTEE_OUBLI
          || !estEau(world, m.x, m.y, m.z)) oublier(i);
      }
      let nes = 0;
      for (let e = 0; e < 8 && nes < 3 && banc.length < EFFECTIF; e++) {
        if (naitre()) nes++;
      }
    }

    const t = performance.now() / 1000;
    for (const p of banc) {
      const m = p.mesh.position;
      if (Math.hypot(player.pos.x - m.x, player.pos.z - m.z) > PORTEE_ANIMATION) continue;

      // Le pas de nage : un regard devant le museau, et on vire si ça bute.
      const dx = Math.cos(p.cap), dz = Math.sin(p.cap);
      const devantX = m.x + dx * 1.1, devantZ = m.z + dz * 1.1;
      if (!estEau(world, devantX, m.y, devantZ)) {
        p.cap += 1.9 * dt * (p.phase > Math.PI ? -1 : 1) * 3;   // demi-tour franc
      } else {
        p.cap += Math.sin(t * 0.6 + p.phase) * 0.5 * dt;        // flânerie
      }
      m.x += Math.cos(p.cap) * p.allure * dt;
      m.z += Math.sin(p.cap) * p.allure * dt;
      // La profondeur respire, sans jamais crever la surface ni racler le fond.
      const fond = world.terrainHeight(Math.floor(m.x), Math.floor(m.z));
      const y = m.y + Math.sin(t * 0.9 + p.phase) * 0.25 * dt * 3;
      m.y = Math.min(WATER_LEVEL - 0.7, Math.max(fond + 1.1, y));

      p.mesh.rotation.y = -p.cap;
      p.mesh.userData.queue.rotation.y = Math.sin(t * 9 + p.phase) * 0.6;
      p.mesh.rotation.z = Math.sin(t * 2.2 + p.phase) * 0.08;
    }
  }

  return { update, effectif: () => banc.length, banc };
}
