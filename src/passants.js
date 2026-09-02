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
import { CITY_BLOCK, ARCHI } from './blocks.js';

// Ce sur quoi un passant se tient : la chaussée, le trottoir, les pavés.
const SOLS_DE_RUE = new Set([CITY_BLOCK.ASPHALT, CITY_BLOCK.SIDEWALK,
  CITY_BLOCK.GRANITE, CITY_BLOCK.CROSSWALK, ARCHI.PAVE, ARCHI.BORDURE]);

// L'ENFANT APPROCHE : LA VILLE PEUPLE SES RUES. Le réveil se mesure depuis le
// BORD de la ville, pas depuis son centre — sinon une ville de deux cents
// blocs de rayon reste morte tant qu'on n'a pas marché jusqu'à son cœur.
const PORTEE_REVEIL = 150;
// À quelle distance de l'enfant on pose les passants, et au-delà de quoi on
// les rapatrie. Voir la note de `poste()`.
const AUTOUR_MIN = 14;
const AUTOUR_MAX = 55;
// ON RAPATRIE CELUI QU'ON NE VOIT PLUS, PAS CELUI QUI EST LOIN.
//
// Max, après la v216 : « clairement pas de piétons, pas de vie dans les
// villes. » Mesuré en traversant Paris d'ouest en est par bonds de vingt-cinq
// blocs, en comptant les passants RENDUS : 10, 8, 7, 4, **0**, 2, 1. Les dix
// existaient toujours — ils étaient restés derrière.
//
// Le seuil valait CENT CINQUANTE blocs quand un personnage cesse d'être
// dessiné à SOIXANTE-DEUX (`VU` de vie.js, appliqué à tous depuis la v196).
// Entre les deux, un passant est invisible ET pas rapatrié : la ville se vide
// dès que l'enfant marche cent blocs, et se repeuple une minute plus tard.
//
// Soixante-quatre, c'est juste au-delà de la portée de rendu — et c'est ce qui
// rend le déplacement HONNÊTE : on ne déplace jamais quelqu'un qu'on voit.
// Un passant sort du champ, il revient devant ; l'enfant ne surprend personne
// en train de sauter d'un bout de la rue à l'autre.
const TROP_LOIN = 64;
// Dix-huit par ville depuis la v217 — dix était le chiffre d'avant les
// grandes villes, et Max : « clairement pas de piétons, pas de vie dans les
// villes ». Un sur cinq est un CHIEN qui trottine : la rue a ses promeneurs.
// Le prix est mesuré : 88 à 265 appels de dessin sur une traversée de Paris,
// pour un budget de l'ordre de 450 — un passant ne se dessine que sous
// soixante-deux blocs, les dix-huit ne sont donc jamais tous à l'écran.
const PAR_VILLE = 18;

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
    // LE RAYON DE LA VILLE, PAS QUARANTE BLOCS.
    //
    // `Math.min(r, 40)` datait du temps où les villes étaient petites. Depuis,
    // Londres fait 112 blocs de rayon, Paris 185, San Francisco 220 — et les
    // dix passants restaient entassés dans un disque de trente blocs au centre.
    // Max, capture à l'appui depuis une rue de Londres : « les villes sont
    // vides : pas d'arbres, pas de piétons, de chien, de voitures ». Il était à
    // soixante blocs du centre, c'est-à-dire à côté de toute la vie de la ville.
    ...VILLES_MONDE.filter((f) => f.trame).map((f) => ({
      nom: f.ancre.nom, x: f.ancre.x, z: f.ancre.z, r: f.rayon, graine: f.rayon * 31 + 7,
    })),
    ...CITIES.map((c, i) => ({ nom: c.name, x: c.x, z: c.z, r: c.r, graine: i * 53 + 11 })),
  ].map((s) => ({ ...s, peuple: null }));

  let minuteur = 0;

  // OÙ POSER QUELQU'UN : autour de L'ENFANT, pas autour du centre de la ville.
  //
  // C'est le cœur du correctif. Dix passants ne peuvent pas remplir un disque
  // de deux cents blocs ; en revanche ils suffisent largement à remplir ce que
  // l'enfant VOIT. On les pose donc en couronne autour de lui — assez loin
  // pour ne pas apparaître sous son nez, assez près pour qu'il les croise — et
  // toujours à l'intérieur de la ville, sinon on peuplerait la campagne.
  function dansLaVille(site, x, z) {
    const du = x - site.x, dv = z - site.z;
    const dist = Math.hypot(du, dv);
    if (dist <= site.r) return [x, z];
    const f = (site.r * 0.9) / dist;
    return [site.x + du * f, site.z + dv * f];
  }

  // SUR LE TROTTOIR, PAS DANS UNE COUR.
  //
  // Un passant posé à un angle au hasard tombe une fois sur deux derrière un
  // immeuble, et l'enfant ne le voit jamais — c'est ce que la capture a
  // montré : vingt-deux personnages à moins de soixante-dix blocs, et pas un
  // seul dans le cadre. On essaie donc une douzaine de points et l'on garde le
  // premier qui tombe sur de la chaussée ou du trottoir. Le monde répond tout
  // seul : nul besoin de connaître la ville, il suffit de regarder le bloc du
  // dessus. Faute de rue, on garde le premier point — mieux vaut un passant
  // dans une cour que pas de passant du tout.
  function posteAutour(site, g) {
    let repli = null;
    for (let essai = 0; essai < 12; essai++) {
      const a = tirage(g + essai * 7, 23, 43) * Math.PI * 2;
      const d = AUTOUR_MIN + (AUTOUR_MAX - AUTOUR_MIN) * tirage(g + essai * 7, 29, 47);
      const [x, z] = dansLaVille(site, player.pos.x + Math.cos(a) * d, player.pos.z + Math.sin(a) * d);
      if (!repli) repli = [x, z];
      const bx = Math.floor(x), bz = Math.floor(z);
      // `sommetColonne` rend le y DU bloc de surface, pas de l'espace au-dessus.
      // Lu un cran trop bas, on interrogeait la terre sous la chaussée : aucun
      // passant ne trouvait jamais de rue, et tous retombaient sur le repli.
      const y = world.sommetColonne(bx, bz);
      if (SOLS_DE_RUE.has(world.getBlock(bx, y, bz))) return [x, z];
    }
    return repli;
  }

  function peupler(site) {
    const gens = [];
    for (let k = 0; k < PAR_VILLE; k++) {
      const g = site.graine + k;
      // Un promeneur sur cinq est un chien.
      if (k % 5 === 4) {
        const [cx, cz] = posteAutour(site, g + 7777);
        const chien = new Habitant(scene, world, player, toast, {
          name: 'chien', label: '🐕 Un chien', phrases: ['Wouf !', 'Wouf wouf !'],
          walkSpeed: 2.2, rayon: 10, largeur: 0.4, hauteur: 0.7,
          build: () => construireChien(ROBES_CHIEN[Math.floor(tirage(g, 31, 53) * ROBES_CHIEN.length)]),
        }, cx, cz);
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
      const [x, z] = posteAutour(site, g);
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

  // Un compteur qui ne se répète pas : sans lui, un passant rapatrié
  // retomberait toujours au même endroit relatif, et l'enfant verrait la même
  // personne le doubler en boucle.
  let tour = 0;

  function update(dt) {
    minuteur -= dt;
    if (minuteur > 0) return;
    minuteur = 2;
    tour++;
    for (const site of sites) {
      // Le réveil se mesure au BORD de la ville : une ville de deux cents
      // blocs de rayon se peuplait sinon seulement depuis son cœur.
      const d = Math.hypot(player.pos.x - site.x, player.pos.z - site.z);
      if (!site.peuple) {
        if (d < site.r + PORTEE_REVEIL) peupler(site);
        continue;
      }
      // ON RAPATRIE CEUX QUI SONT RESTÉS DERRIÈRE. Dix passants posés une fois
      // pour toutes, c'est une ville vide dès qu'on s'éloigne de cent mètres.
      // Ceux que l'enfant a distancés reviennent devant lui — la ville reste
      // habitée partout, sans qu'il y ait un seul habitant de plus.
      if (d > site.r + PORTEE_REVEIL) continue;
      for (let i = 0; i < site.peuple.length; i++) {
        const h = site.peuple[i];
        if (!h.pos) continue;
        if (Math.hypot(player.pos.x - h.pos.x, player.pos.z - h.pos.z) < TROP_LOIN) continue;
        const [nx, nz] = posteAutour(site, site.graine + i + tour * 131);
        // `poste` est le point autour duquel il flâne, `placeAt` le pose au sol
        // — c'est le même chemin que sa naissance, donc rien à réinventer.
        h.poste.set(nx, nz);
        h.placeAt(nx, nz, 40);
      }
    }
  }

  return { update, sites, effectif: () => sites.reduce((n, s) => n + (s.peuple ? s.peuple.length : 0), 0) };
}
