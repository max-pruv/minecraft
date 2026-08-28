// Les passants : la vie dans les rues des villes.
//
// Max : « les villes n'ont pas de vie. Il n'y a pas de voitures qui
// circulent, il n'y a pas de piétons. » Voici les piétons — les voitures ont
// leur propre mécanique (la circulation, dans vehicules.js et main.js).
//
// LE PRINCIPE DES SITES PARESSEUX. Cinquante villes à six passants, c'est
// trois cents personnages : les fabriquer tous à l'ouverture coûterait des
// secondes et de la mémoire pour des rues que l'enfant ne verra peut-être
// jamais. Une ville ne fabrique donc ses passants qu'à l'approche de
// l'enfant (150 blocs), une seule fois — et ils rejoignent la troupe
// mondiale de main.js, qui ne les anime que sous 140 blocs, comme tout le
// monde. Une ville visitée garde ses passants pour la session : ce sont des
// habitants, pas des figurants qu'on éteint.
//
// CHAQUE VILLE A LES SIENS, TOUJOURS LES MÊMES. Les profils sont tirés d'une
// graine par ville : le passant à la chemise rouge de Rome y sera encore
// demain. Les teintes de peau et de cheveux viennent du même nuancier que
// les gens des châteaux ; les habits, eux, sont d'aujourd'hui — la tenue
// « passant » de personnages.js — avec quelques robes de la tenue « dame ».

import * as THREE from 'three';
import { Habitant } from './vie.js';
import { construireHumain } from './personnages.js';
import { VILLES_MONDE } from './villesmonde.js';
import { CITIES } from './world.js';

const PORTEE_REVEIL = 150;         // l'enfant approche : la ville peuple ses rues
// Dix par ville depuis v178 — Max : « much more life… people walking » — et
// un sur cinq est un CHIEN qui trottine : la rue a ses promeneurs.
const PAR_VILLE = 10;

// Un petit chien de ville : corps, tête, museau, quatre pattes, la queue en
// l'air. Quatre robes, stables par graine — le chien roux de Rome y sera
// encore demain.
const ROBES_CHIEN = [0x8a5a30, 0x2a2a2e, 0xe8e2d4, 0xc86a2a];
function construireChien(robe) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: robe });
  const boite = (w, h, d, x, y, z, m = mat) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    g.add(b);
    return b;
  };
  boite(0.3, 0.28, 0.62, 0, 0.42, 0);                       // le corps
  boite(0.26, 0.24, 0.26, 0, 0.58, -0.4);                   // la tête
  boite(0.14, 0.12, 0.14, 0, 0.5, -0.56);                   // le museau
  boite(0.08, 0.12, 0.06, -0.09, 0.74, -0.42);              // les oreilles
  boite(0.08, 0.12, 0.06, 0.09, 0.74, -0.42);
  const pattes = [];
  for (const sz of [-0.22, 0.22]) for (const sx of [-0.1, 0.1]) pattes.push(boite(0.09, 0.3, 0.09, sx, 0.14, sz));
  boite(0.07, 0.22, 0.07, 0, 0.56, 0.34);                   // la queue, dressée
  // Habitant.update anime `legs` et `arms` — sans elles, la troupe entière
  // plantait au premier chien (vécu en sonde : une image morte par frame).
  // Les pattes avant jouent les bras, les arrière les jambes : le trot vient
  // tout seul du balancement croisé de la marche.
  g.userData = { legs: [pattes[0], pattes[1]], arms: [pattes[2], pattes[3]] };
  return g;
}

const TEINTS = [0xe0b48c, 0xc9905e, 0xa9713f, 0xf0c9a4, 0xd8a878, 0x8a5a30];
const CHEVEUX = [0x3a2a1a, 0x6a4a26, 0x1c1814, 0x8a6a3a, 0x9a9a94, 0xb8b8b2];
const HAUTS = [0x4a78c8, 0xd84a3a, 0x3a9a4a, 0xe8c83a, 0x8a4ac8, 0xf0f0ea, 0x2a2a30, 0xe88a3a];
const BAS = [0x2e3038, 0x3a4a6a, 0x5a4a38, 0x23262c];
const ROBES = [0xd85a8a, 0x4a9ac8, 0xe8b83a, 0x8a5ac8];

// Le même tirage déterministe que la machine à villes.
function tirage(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const parmi = (liste, t) => liste[Math.floor(t * liste.length) % liste.length];

export function createPassants({ scene, world, player, toast, npcs }) {
  // Toutes les villes à rues : les cinquante grandes qui ont une trame, et
  // les villes historiques (Paris, New York, Nice, Lille, Londres…).
  const sites = [
    ...VILLES_MONDE.filter((f) => f.trame).map((f) => ({
      nom: f.ancre.nom, x: f.ancre.x, z: f.ancre.z, r: Math.min(f.rayon, 40), graine: f.rayon * 31 + 7,
    })),
    ...CITIES.map((c, i) => ({ nom: c.name, x: c.x, z: c.z, r: Math.min(c.r, 40), graine: i * 53 + 11 })),
  ].map((s) => ({ ...s, peuple: null }));

  let minuteur = 0;

  function peupler(site) {
    const gens = [];
    for (let k = 0; k < PAR_VILLE; k++) {
      const g = site.graine + k;
      // Un promeneur sur cinq est un chien.
      if (k % 5 === 4) {
        const a2 = (k / PAR_VILLE) * Math.PI * 2 + tirage(g, 23, 43);
        const d2 = site.r * (0.25 + 0.5 * tirage(g, 29, 47));
        const chien = new Habitant(scene, world, player, toast, {
          name: 'chien', label: '🐕 Un chien', phrases: ['Wouf !', 'Wouf wouf !'],
          walkSpeed: 2.2, rayon: 10, largeur: 0.4, hauteur: 0.7,
          build: () => construireChien(ROBES_CHIEN[Math.floor(tirage(g, 31, 53) * ROBES_CHIEN.length)]),
        }, site.x + Math.cos(a2) * d2, site.z + Math.sin(a2) * d2);
        gens.push(chien);
        npcs.push(chien);
        continue;
      }
      const robe = tirage(g, 3, 17) < 0.3;
      const profil = {
        tenue: robe ? 'dame' : 'passant',
        teint: parmi(TEINTS, tirage(g, 5, 19)),
        cheveux: parmi(CHEVEUX, tirage(g, 7, 23)),
        coupe: tirage(g, 11, 29) < 0.5 ? 'court' : 'long',
        haut: parmi(HAUTS, tirage(g, 13, 31)),
        bas: parmi(BAS, tirage(g, 17, 37)),
        drap: parmi(ROBES, tirage(g, 19, 41)),
      };
      // Le poste : en couronne autour du centre, sur le tiers du rayon — les
      // rues du cœur de ville. L'habitant s'en écarte, y revient, salue.
      const a = (k / PAR_VILLE) * Math.PI * 2 + tirage(g, 23, 43);
      const d = site.r * (0.25 + 0.5 * tirage(g, 29, 47));
      const x = site.x + Math.cos(a) * d, z = site.z + Math.sin(a) * d;
      const h = new Habitant(scene, world, player, toast, {
        name: 'passant', label: '🚶 Un passant', phrases: ['Bonjour !', 'Belle journée, non ?'],
        walkSpeed: 1.6, rayon: 8, largeur: 0.5, hauteur: 1.72,
        build: () => construireHumain(profil),
      }, x, z);
      gens.push(h);
      npcs.push(h);
    }
    site.peuple = gens;
  }

  function update(dt) {
    minuteur -= dt;
    if (minuteur > 0) return;
    minuteur = 2;
    for (const site of sites) {
      if (site.peuple) continue;
      if (Math.hypot(player.pos.x - site.x, player.pos.z - site.z) < PORTEE_REVEIL) peupler(site);
    }
  }

  return { update, sites, effectif: () => sites.reduce((n, s) => n + (s.peuple ? s.peuple.length : 0), 0) };
}
