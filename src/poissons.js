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
import { Atelier } from './modeles.js';

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
  const a=new Atelier();
  a.sphere(robe.corps,{p:[0,0,0],e:[.58,.25,.15],seg:38});
  // Nageoires à bord courbe et queue fourchue, fusionnées par articulation.
  const nageoire=(points,couleur)=>{
    const forme=new THREE.Shape();forme.moveTo(...points[0]);
    for(let i=1;i<points.length;i+=2)forme.quadraticCurveTo(...points[i],...points[i+1]);
    forme.closePath();
    const geo=new THREE.ExtrudeGeometry(forme,{depth:.008,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,steps:1,curveSegments:12});
    a.geometrie(geo,couleur,{p:[0,0,-.004]});geo.dispose();
  };
  nageoire([[-.17,.07],[-.08,.24],[.04,.2],[.09,.16],[.15,.08]],robe.queue);
  nageoire([[-.14,-.06],[-.1,-.2],[.02,-.16],[.07,-.12],[.13,-.07]],robe.queue);
  for(const s of [-1,1]) {
    a.sphere(0xc6bf99,{p:[.2,.035,s*.055],e:[.055,.055,.022],seg:24});
    a.sphere(0x091315,{p:[.208,.035,s*.065],e:[.032,.037,.014],seg:24});
  }
  a.membre('queue',[-.24,0,0]);
  nageoire([[-.23,0],[-.4,.06],[-.49,.15],[-.43,0],[-.49,-.15],[-.4,-.06],[-.23,0]],robe.queue);
  const g=a.finir();
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:.12,emissive:robe.corps,emissiveIntensity:.09});
  mat.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n varying vec3 vEcaille;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n vEcaille=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n varying vec3 vEcaille;')
      .replace('#include <color_fragment>',`#include <color_fragment>
        float rang=floor(vEcaille.y*130.0);
        float ecaille=sin(vEcaille.x*270.0+mod(rang,2.0)*3.14159)*sin(vEcaille.y*410.0);
        diffuseColor.rgb*=.92+ecaille*.07;`);
  };
  mat.customProgramCacheKey=()=> 'poisson-ecailles-v1';
  g.traverse(o=>{if(o.isMesh)o.material=mat;});
  g.scale.setScalar(taille);
  g.userData.queue = g.userData.membres.queue;
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
    // un poisson ne naît que dans un monde déjà là : lire l'eau d'un morceau
    // absent l'engendrerait sur le fil principal (v436, 77 ms à l'arrivée)
    if (world.morceauxPrets && world.arriveeEnCours(x, z) && !world.morceauxPrets(x, z)) return null;
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
      // UN POISSON NE SORT JAMAIS DE L'EAU — et le regard devant le museau ne
      // suffit pas à le garantir (v233). Le demi-tour est PROGRESSIF : le
      // poisson continue d'avancer pendant qu'il vire, et il lui arrive de
      // franchir le rivage avant d'avoir fini. Le clampage de profondeur ne le
      // rattrape pas, au contraire : `min(surface, max(fond + 1.1, y))` rend
      // la SURFACE dès que le fond la dépasse, c'est-à-dire qu'il maintient le
      // poisson à la cote de l'eau alors que le terrain est monté de quinze
      // blocs au-dessus. Mesuré sur `origin/main`, donc en production : 24
      // relevés hors de l'eau sur 120, et les vingt-quatre dans ce cas —
      // poissons à y = 29,3 avec le terrain à 44, enterrés dans la roche.
      //
      // Le remède n'est pas un meilleur clampage, c'est de ne pas y aller : on
      // calcule le pas, on regarde si l'arrivée est de l'eau, et sinon on
      // reste où l'on est en virant plus franchement. Un poisson né dans l'eau
      // y reste alors par construction.
      const nx = m.x + Math.cos(p.cap) * p.allure * dt;
      const nz = m.z + Math.sin(p.cap) * p.allure * dt;
      // La profondeur respire, sans jamais crever la surface ni racler le fond.
      const fond = world.terrainHeight(Math.floor(nx), Math.floor(nz));
      const y = m.y + Math.sin(t * 0.9 + p.phase) * 0.25 * dt * 3;
      const ny = Math.min(WATER_LEVEL - 0.7, Math.max(fond + 1.1, y));
      if (estEau(world, nx, ny, nz)) {
        m.x = nx; m.z = nz; m.y = ny;
      } else {
        p.cap += 1.9 * dt * (p.phase > Math.PI ? -1 : 1) * 6;
      }

      p.mesh.rotation.y = -p.cap;
      p.mesh.userData.queue.rotation.y = Math.sin(t * 9 + p.phase) * 0.6;
      p.mesh.rotation.z = Math.sin(t * 2.2 + p.phase) * 0.08;
    }
  }

  return { update, effectif: () => banc.length, banc };
}
