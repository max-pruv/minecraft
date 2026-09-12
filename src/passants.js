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
import { cadence } from './cadence.js';
import { DISTANCE_PRESENCE } from './presence.js';
import { Habitant } from './vie.js';
import { construireHumain } from './personnages.js';
import { VILLES_MONDE } from './villesmonde.js';
import { dansManhattan, ORIGINE_MANHATTAN } from './manhattan-world.js';
import { surface as surfaceManhattan, batimentA } from './manhattan-plan.js';
import { CITIES } from './world.js';
import { CITY_BLOCK, ARCHI } from './blocks.js';

// Ce sur quoi un passant se tient : la chaussée, le trottoir, les pavés.
const SOLS_TROTTOIR = new Set([CITY_BLOCK.SIDEWALK,CITY_BLOCK.GRANITE]);
const SOLS_DE_RUE = new Set([CITY_BLOCK.ASPHALT, CITY_BLOCK.SIDEWALK,
  CITY_BLOCK.GRANITE, CITY_BLOCK.CROSSWALK, ARCHI.PAVE, ARCHI.BORDURE]);

// L'ENFANT APPROCHE : LA VILLE PEUPLE SES RUES. Le réveil se mesure depuis le
// BORD de la ville, pas depuis son centre — sinon une ville de deux cents
// blocs de rayon reste morte tant qu'on n'a pas marché jusqu'à son cœur.
const PORTEE_REVEIL = 150;
// À quelle distance de l'enfant on pose les passants, et au-delà de quoi on
// les rapatrie. Voir la note de `poste()`.
const AUTOUR_MIN = 14;
// TRENTE-QUATRE, ET CE N'EST PAS POUR EN VOIR PLUS — c'est pour les voir.
// Mesuré : le champ de vision fait 46°, un huitième de tour, et une couronne
// est uniforme en angle. Son RAYON ne change donc rien au nombre de passants
// dans le cadre : 2,3 à 14-55 blocs, 2,33 à 14-34. Ce qui change, c'est qu'à
// trente-quatre blocs un personnage est encore lisible et rarement caché par
// un immeuble, là qu'à cinquante-cinq il est un pixel derrière une façade.
const AUTOUR_MAX = 34;
// DEUX SUR TROIS SONT POSÉS DEVANT L'ENFANT.
//
// Le nombre de passants DANS LE CADRE ne dépend que de deux choses : combien
// il y en a, et quelle part du tour d'horizon l'enfant voit. Dix-huit répartis
// sur 360° dans un champ de 46° en donnent 18 × 46/360 = 2,3 — c'est
// exactement la mesure, et c'est la raison pour laquelle la rue paraît vide.
//
// En acheter plus se paie en appels de dessin : un passant coûte ONZE
// maillages, et dix-huit en valent déjà deux cents. Les poser là où l'enfant
// REGARDE ne coûte rien. Deux sur trois vont donc dans un cône de ±60° devant
// lui — le tiers restant garde la rue derrière habitée, sinon un demi-tour
// donnerait un désert.
//
// Et le déplacement reste invisible : on ne replace que quelqu'un qui est
// DÉJÀ hors de portée de rendu (voir `TROP_LOIN`).
const CONE_DEVANT = Math.PI / 3;
// Aucun rapatriement lié au regard : un demi-tour doit retrouver les mêmes
// voisins. On ne recycle que très loin, après la fin effective du fondu.
const TROP_LOIN = DISTANCE_PRESENCE.recyclage;
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
const HAUTS = [0x4a78c8, 0x914e48, 0x586654, 0xa29372, 0x665772, 0xf0f0ea, 0x2a2a30, 0xe88a3a];
const BAS = [0x2e3038, 0x3a4a6a, 0x5a4a38, 0x23262c];
const ROBES = [0xd85a8a, 0x4a9ac8, 0xe8b83a, 0x8a5ac8];

// Le même tirage déterministe que la machine à villes.
function tirage(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const parmi = (liste, t) => liste[Math.floor(t * liste.length) % liste.length];

export function createPassants({ scene, world, player, toast, npcs, sitesCarte = null, seulementTrottoir = false }) {
  // Toutes les villes à rues : les cinquante grandes qui ont une trame, et
  // les villes historiques (Paris, New York, Nice, Lille, Londres…).
  const sites = (sitesCarte || [
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
    ...CITIES.map((c, i) => ({ urbain:c.key==='ny', nom: c.name, x: c.x, z: c.z, r: c.key==='ny'?1200:c.r, graine: i * 53 + 11 })),
  ]).map((s) => ({ ...s, peuple: null }));

  // Le rapatriement bat en TEMPS RÉEL : voir `cadence.js`. Écrit `minuteur -= dt`,
  // il ralentissait avec la cadence d'affichage — donc il ne passait plus du tout
  // à l'arrivée dans une ville, quand les morceaux se chargent.
  const cestLHeure = cadence(2000);

  // OÙ POSER QUELQU'UN : autour de L'ENFANT, pas autour du centre de la ville.
  //
  // C'est le cœur du correctif. Dix passants ne peuvent pas remplir un disque
  // de deux cents blocs ; en revanche ils suffisent largement à remplir ce que
  // l'enfant VOIT. On les pose donc en couronne autour de lui — assez loin
  // pour ne pas apparaître sous son nez, assez près pour qu'il les croise — et
  // toujours à l'intérieur de la ville, sinon on peuplerait la campagne.
  function dansLaVille(site, x, z) {
    if(site.urbain)return [x,z];
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
  function demiVue() {
    const cam = player.camera;
    return Math.min(CONE_DEVANT, Math.atan(Math.tan(cam.fov * Math.PI / 360) * cam.aspect));
  }

  function posteAutour(site, g, devant = false, recycle = false) {
    let repli = null;
    for (let essai = 0; essai < 80; essai++) {
      // Le cap du regard, dans le repère du jeu : dx = −sin(yaw), dz = −cos(yaw),
      // donc l'angle de `Math.cos/sin` employé plus bas vaut −yaw − π/2.
      const vise = -player.yaw - Math.PI / 2;
      const t = tirage(g + essai * 7, 23, 43);
      const a = devant
        ? vise + (t - 0.5) * 2 * demiVue() * 0.9
        : t * Math.PI * 2;
      const d = recycle ? 40 + 20 * tirage(g + essai * 7, 29, 47) : AUTOUR_MIN + (AUTOUR_MAX - AUTOUR_MIN) * tirage(g + essai * 7, 29, 47);
      const [x, z] = dansLaVille(site, player.pos.x + Math.cos(a) * d, player.pos.z + Math.sin(a) * d);
      if(site.urbain){
        const lx=x-ORIGINE_MANHATTAN.x,lz=z-ORIGINE_MANHATTAN.z;
        if(!dansManhattan(x,z)||!['sidewalk','plaza','path'].includes(surfaceManhattan(lx,lz))||batimentA(lx,lz))continue;
        if(world.piedPieton(x,z)===33)return [x,z];
        continue;
      }
      if (!repli) repli = [x, z];
      const bx = Math.floor(x), bz = Math.floor(z);
      // `sommetColonne` rend le y DU bloc de surface, pas de l'espace au-dessus.
      // Lu un cran trop bas, on interrogeait la terre sous la chaussée : aucun
      // passant ne trouvait jamais de rue, et tous retombaient sur le repli.
      const y = world.sommetColonne(bx, bz);
      if ((seulementTrottoir ? SOLS_TROTTOIR : SOLS_DE_RUE).has(world.getBlock(bx, y, bz))) return [x, z];
    }
    return repli || [site.x+5,site.z+7];
  }

  function peupler(site, debut = 0, nombre = site.urbain ? 44 : PAR_VILLE) {
    const gens = site.peuple || [];
    for (let k = debut; k < debut + nombre; k++) {
      const g = site.graine + k;
      // Un promeneur sur cinq est un chien.
      if (k % (site.urbain?16:5) === 4) {
        const [cx, cz] = posteAutour(site, g + 7777, k % 3 !== 2);
        const chien = new Habitant(scene, world, player, toast, {
          name: 'chien', label: '🐕 Un chien', phrases: ['Wouf !', 'Wouf wouf !'],
          walkSpeed: 2.2, rayon: 10, largeur: 0.4, hauteur: 0.7,
          build: () => construireChien(ROBES_CHIEN[Math.floor(tirage(g, 31, 53) * ROBES_CHIEN.length)]),
        }, cx, cz);
        chien.apparitionDouce = true;
        gens.push(chien);
        npcs.push(chien);
        continue;
      }
      const robe = tirage(g, 3, 17) < 0.3;
      const profil = {
        tenue: 'passant', modeleHumain: ['homme-chemise','femme-tailleur','homme-denim','femme-chemise','homme-costume','femme-manteau','homme-veste'][k%7], veste: k%3===0, sac:k%4===0?0x4a4139:null,
        teint: parmi(TEINTS, tirage(g, 5, 19)),
        cheveux: parmi(CHEVEUX, tirage(g, 7, 23)),
        coupe: tirage(g, 11, 29) < 0.5 ? 'court' : 'long',
        haut: parmi(HAUTS, tirage(g, 13, 31)),
        bas: parmi(BAS, tirage(g, 17, 37)),
        drap: parmi(ROBES, tirage(g, 19, 41)),
      };
      const [x, z] = posteAutour(site, g + tour * 131, debut > 0 || k % 3 !== 2);
      const h = new Habitant(scene, world, player, toast, {
        name: 'passant', label: '🚶 Un passant', phrases: ['Bonjour !', 'Belle journée, non ?'],
        walkSpeed: 1.6, rayon: 8, largeur: 0.5, hauteur: 1.72,
        build: () => construireHumain(profil),
      }, x, z);
      h.rueUrbaine=site.urbain;
      h.apparitionDouce = true;
      gens.push(h);
      npcs.push(h);
    }
    site.peuple = gens;
  }

  // Un compteur qui ne se répète pas : sans lui, un passant rapatrié
  // retomberait toujours au même endroit relatif, et l'enfant verrait la même
  // personne le doubler en boucle.
  let tour = 0;

  function update() {
    if (!cestLHeure()) return;
    tour++;
    for (const site of sites) {
      // Le réveil se mesure au BORD de la ville : une ville de deux cents
      // blocs de rayon se peuplait sinon seulement depuis son cœur.
      const d = Math.hypot(player.pos.x - site.x, player.pos.z - site.z);
      if (!site.peuple) {
        if (site.urbain?dansManhattan(player.pos.x,player.pos.z):d < site.r + PORTEE_REVEIL) peupler(site);
        continue;
      }
      // ON RAPATRIE CEUX QUI SONT RESTÉS DERRIÈRE. Dix passants posés une fois
      // pour toutes, c'est une ville vide dès qu'on s'éloigne de cent mètres.
      // Ceux que l'enfant a distancés reviennent devant lui — la ville reste
      // habitée partout, sans qu'il y ait un seul habitant de plus.
      if (site.urbain?!dansManhattan(player.pos.x,player.pos.z):d > site.r + PORTEE_REVEIL) continue;
      // UN DÉPLACEMENT QUI NE RAMÈNE PERSONNE DANS LE CHAMP NE SE FAIT PAS.
      //
      // `dansLaVille` ramène tout candidat DANS la ville : quand l'enfant est
      // dehors, le point reposé reste à plus de `TROP_LOIN` de lui, et il est
      // donc repris au tour suivant. Mesuré au point d'apparition, avec le
      // seuil de 64 : 17 à 18 passants sur 18 replacés toutes les deux
      // secondes, indéfiniment, et ZÉRO jamais en vue. Douze sondages de
      // colonne chacun, pour rien — et une page trop occupée pour finir son
      // rechargement, ce qui a rendu `maj.js` rouge.
      //
      // La borne est exacte, pas prudente : un point clampé se retrouve à
      // `0,9 × r` du centre, donc à au moins `d − 0,9 r` de l'enfant. Si cela
      // dépasse déjà `TROP_LOIN`, aucun tirage ne peut ramener qui que ce soit
      // en vue. C'est le prix caché du seuil serré de la v217 : plus il est
      // petit, plus il faut vérifier que le déplacement SERT.
      if (d - site.r * 0.9 > TROP_LOIN) continue;
      // On ouvre quelques places devant en avançant, au lieu de voler les
      // personnes encore proches derrière. Le plafond reste borné par ville.
      const vx = -Math.sin(player.yaw), vz = -Math.cos(player.yaw);
      const cosVue = Math.cos(demiVue());
      const devant = site.peuple.filter(h => {
        const x = h.pos.x-player.pos.x, z = h.pos.z-player.pos.z, d = Math.hypot(x,z);
        return d > 4 && d < 50 && (x*vx+z*vz)/d > cosVue;
      }).length;
      // Les corps partagés permettent une réserve pour les rues suivantes,
      // sans déplacer les voisins encore proches quand le cadre se vide.
      const plafond = 88;
      if (devant < 6 && site.peuple.length < plafond) peupler(site, site.peuple.length, Math.min(4, plafond-site.peuple.length));
      for (let i = 0; i < site.peuple.length; i++) {
        const h = site.peuple[i];
        if (!h.pos) continue;
        const dh = Math.hypot(h.pos.x - player.pos.x, h.pos.z - player.pos.z);
        if (dh < TROP_LOIN || !h.presence || h.presence.valeur > 0) continue;
        const [nx, nz] = posteAutour(site, site.graine + i + tour * 131, i % 3 !== 2, true);
        // `poste` est le point autour duquel il flâne, `placeAt` le pose au sol
        // — c'est le même chemin que sa naissance, donc rien à réinventer.
        h.poste.set(nx, nz);
        h.placeAt(nx, nz, 40);
      }
    }
  }

  return { update, sites, effectif: () => sites.reduce((n, s) => n + (s.peuple ? s.peuple.length : 0), 0) };
}
