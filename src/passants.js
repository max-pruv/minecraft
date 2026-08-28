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

import { Habitant } from './vie.js';
import { construireHumain } from './personnages.js';
import { VILLES_MONDE } from './villesmonde.js';
import { CITIES } from './world.js';

const PORTEE_REVEIL = 150;         // l'enfant approche : la ville peuple ses rues
const PAR_VILLE = 6;

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
