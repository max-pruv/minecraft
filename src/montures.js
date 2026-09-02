// Les montures : les bêtes sur lesquelles on peut grimper.
//
// Elles vivent dans le même bestiaire que les vaches et les poules
// (src/animals.js) — même façon de marcher, de brouter, de fuir. Ce fichier
// n'ajoute que ce qui leur est propre : leur silhouette, et la hauteur de leur
// dos, qui décide d'où l'enfant regarde le monde une fois en selle.
//
// `assise` est cette hauteur, en blocs, mesurée depuis les sabots. Sur un âne
// on est à hauteur d'homme ; sur un éléphant on domine les toits. C'est ce
// chiffre, et lui seul, qui donne la sensation de grimper sur quelque chose de
// gros — la caméra monte, la bête garde ses pattes par terre.

import * as THREE from 'three';
import { construireVoitureRoute, chargerVraieVoiture, chargerVoitureFlotte, FLOTTE } from './vehicules.js';

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

// Même convention que le bestiaire : le modèle regarde vers -z, les pattes
// posées à y = 0, et les membres qui balancent rangés dans userData.legs.
function quadrupede({ corps, tete, patte = 0x3a2e22, largeur = 0.6, hauteurCorps = 0.5,
  longueur = 0.95, hauteurPatte = 0.5, epaisseurPatte = 0.14, ecart = 0.2, extras }) {
  const g = new THREE.Group();
  const legs = [];
  const dz = longueur * 0.32;
  for (const [lx, lz] of [[-ecart, -dz], [ecart, -dz], [-ecart, dz], [ecart, dz]]) {
    const leg = box(epaisseurPatte, hauteurPatte, epaisseurPatte, patte, lx, hauteurPatte / 2, lz);
    g.add(leg);
    legs.push(leg);
  }
  const yc = hauteurPatte + hauteurCorps / 2;
  g.add(box(largeur, hauteurCorps, longueur, corps, 0, yc, 0));
  if (extras) extras(g, { hauteurPatte, hauteurCorps, longueur, largeur, yc });
  g.userData.legs = legs;
  return g;
}

// Deux yeux noirs, posés de part et d'autre d'une tête.
function yeux(g, y, z, ecart = 0.11, taille = 0.05) {
  for (const sx of [-1, 1]) g.add(box(taille, taille * 1.2, 0.02, 0x1a1a1a, sx * ecart, y, z));
}

export const MODELES_MONTURE = {
  voiture: voitureNeuve,
  // L'éléphant : la seule bête du jeu plus haute qu'une maison de plain-pied.
  // Trompe en quatre segments qui descendent en s'affinant, défenses ivoire,
  // et de grandes oreilles plates qu'on voit de loin — c'est la silhouette qui
  // le rend reconnaissable, bien plus que sa couleur.
  elephant: () => quadrupede({
    corps: 0x9a9a96, tete: 0x9a9a96, patte: 0x8a8a86,
    largeur: 1.3, hauteurCorps: 1.25, longueur: 2.1, hauteurPatte: 1.15,
    epaisseurPatte: 0.36, ecart: 0.44,
    extras(g, { yc, longueur }) {
      const zt = -longueur / 2 - 0.28;
      g.add(box(0.85, 0.9, 0.7, 0x9a9a96, 0, yc + 0.25, zt));            // tête
      for (const sx of [-1, 1]) {
        g.add(box(0.1, 0.75, 0.62, 0x8e8e8a, sx * 0.5, yc + 0.3, zt + 0.05)); // oreilles
        g.add(box(0.08, 0.08, 0.42, 0xf0ead6, sx * 0.2, yc - 0.1, zt - 0.34)); // défenses
      }
      let ty = yc + 0.05, tz = zt - 0.3, tl = 0.26;
      for (let i = 0; i < 4; i++) {                                       // trompe
        g.add(box(tl, 0.3, tl, 0x8e8e8a, 0, ty, tz));
        ty -= 0.3; tz -= 0.03; tl -= 0.04;
      }
      yeux(g, yc + 0.45, zt - 0.36, 0.26, 0.07);
      g.add(box(0.1, 0.5, 0.1, 0x8a8a86, 0, yc - 0.2, longueur / 2 + 0.1)); // queue
    },
  }),

  // Le zèbre : un cheval rayé. Les rayures sont de vraies lames posées sur le
  // corps, pas une texture — c'est ce qui les fait tourner avec la bête.
  zebre: () => quadrupede({
    corps: 0xf2f0e8, tete: 0xf2f0e8, patte: 0xf2f0e8,
    largeur: 0.62, hauteurCorps: 0.62, longueur: 1.2, hauteurPatte: 0.78,
    epaisseurPatte: 0.15, ecart: 0.22,
    extras(g, { yc, longueur }) {
      for (let i = -4; i <= 4; i++) {
        g.add(box(0.64, 0.5, 0.09, 0x1c1c22, 0, yc, i * 0.13));           // rayures
      }
      const zt = -longueur / 2 - 0.2;
      g.add(box(0.34, 0.52, 0.34, 0xf2f0e8, 0, yc + 0.42, zt + 0.16));    // encolure
      g.add(box(0.3, 0.3, 0.56, 0xf2f0e8, 0, yc + 0.62, zt - 0.12));      // tête
      g.add(box(0.32, 0.3, 0.08, 0x1c1c22, 0, yc + 0.62, zt - 0.4));      // chanfrein noir
      g.add(box(0.1, 0.4, 0.42, 0x1c1c22, 0, yc + 0.8, zt + 0.2));        // crinière
      for (const sx of [-1, 1]) g.add(box(0.07, 0.14, 0.07, 0xf2f0e8, sx * 0.1, yc + 0.82, zt - 0.08));
      yeux(g, yc + 0.66, zt - 0.4, 0.13);
      g.add(box(0.09, 0.42, 0.09, 0x1c1c22, 0, yc + 0.1, longueur / 2 + 0.08));
    },
  }),

  // L'âne : petit, gris, et deux oreilles immenses. Tout est là.
  ane: () => quadrupede({
    corps: 0x9c948a, tete: 0x9c948a, patte: 0x8a827a,
    largeur: 0.5, hauteurCorps: 0.48, longueur: 0.92, hauteurPatte: 0.52,
    epaisseurPatte: 0.12, ecart: 0.17,
    extras(g, { yc, longueur }) {
      const zt = -longueur / 2 - 0.14;
      g.add(box(0.28, 0.4, 0.28, 0x9c948a, 0, yc + 0.3, zt + 0.12));      // encolure
      g.add(box(0.26, 0.26, 0.42, 0x9c948a, 0, yc + 0.46, zt - 0.1));     // tête
      g.add(box(0.27, 0.2, 0.08, 0xd8d0c4, 0, yc + 0.42, zt - 0.32));     // museau clair
      for (const sx of [-1, 1]) g.add(box(0.09, 0.34, 0.09, 0x9c948a, sx * 0.1, yc + 0.74, zt - 0.02));
      yeux(g, yc + 0.5, zt - 0.31, 0.1);
      g.add(box(0.2, 0.06, 0.5, 0x6a6258, 0, yc + 0.24, 0));              // raie de mulet
      g.add(box(0.07, 0.34, 0.07, 0x6a6258, 0, yc, longueur / 2 + 0.06));
    },
  }),

  // Le chameau : deux bosses (le dromadaire n'en a qu'une — ici c'est bien un
  // chameau) et un cou qui monte en biais. On s'assied entre les bosses.
  chameau: () => quadrupede({
    corps: 0xd8b378, tete: 0xd8b378, patte: 0xc8a368,
    largeur: 0.62, hauteurCorps: 0.6, longueur: 1.25, hauteurPatte: 0.95,
    epaisseurPatte: 0.15, ecart: 0.22,
    extras(g, { yc, longueur }) {
      g.add(box(0.5, 0.38, 0.42, 0xc8a368, 0, yc + 0.44, -0.24));         // bosse avant
      g.add(box(0.46, 0.32, 0.38, 0xc8a368, 0, yc + 0.41, 0.28));         // bosse arrière
      const zt = -longueur / 2 - 0.1;
      g.add(box(0.28, 0.72, 0.3, 0xd8b378, 0, yc + 0.5, zt));             // cou
      g.add(box(0.26, 0.3, 0.5, 0xd8b378, 0, yc + 0.92, zt - 0.18));      // tête
      g.add(box(0.22, 0.16, 0.08, 0xe8cfa0, 0, yc + 0.86, zt - 0.44));    // museau
      for (const sx of [-1, 1]) g.add(box(0.07, 0.1, 0.06, 0xd8b378, sx * 0.09, yc + 1.08, zt - 0.1));
      yeux(g, yc + 0.98, zt - 0.43, 0.1);
      g.add(box(0.07, 0.4, 0.07, 0xc8a368, 0, yc + 0.1, longueur / 2 + 0.06));
    },
  }),

  // Le lama : le cou d'abord, le reste ensuite. Laine crème, oreilles en
  // banane, et cette tête qu'il tient toujours très haut.
  lama: () => quadrupede({
    corps: 0xf0e6d2, tete: 0xf0e6d2, patte: 0xd8c8ac,
    largeur: 0.5, hauteurCorps: 0.55, longueur: 0.95, hauteurPatte: 0.62,
    epaisseurPatte: 0.12, ecart: 0.18,
    extras(g, { yc, longueur }) {
      const zt = -longueur / 2 - 0.06;
      g.add(box(0.24, 0.78, 0.24, 0xf0e6d2, 0, yc + 0.58, zt));           // long cou
      g.add(box(0.24, 0.26, 0.36, 0xf0e6d2, 0, yc + 1.02, zt - 0.1));     // tête
      g.add(box(0.2, 0.16, 0.08, 0xb89c78, 0, yc + 0.98, zt - 0.3));      // museau
      for (const sx of [-1, 1]) g.add(box(0.06, 0.2, 0.05, 0xf0e6d2, sx * 0.08, yc + 1.22, zt - 0.02));
      yeux(g, yc + 1.08, zt - 0.29, 0.09);
      g.add(box(0.54, 0.2, 0.5, 0xf6efe0, 0, yc + 0.3, 0.06));            // toison
      g.add(box(0.08, 0.22, 0.08, 0xf0e6d2, 0, yc + 0.24, longueur / 2 + 0.05));
    },
  }),

  // L'autruche : deux pattes, pas quatre. Elle court plus vite que tout le
  // reste du jeu, et c'est le seul bipède qu'on peut monter.
  autruche: () => {
    const g = new THREE.Group();
    const legs = [];
    for (const sx of [-1, 1]) {
      const leg = box(0.1, 0.86, 0.1, 0xe8a86a, sx * 0.14, 0.43, 0);
      g.add(leg);
      legs.push(leg);
      g.add(box(0.14, 0.06, 0.22, 0xe8a86a, sx * 0.14, 0.03, -0.06));     // pied
    }
    g.add(box(0.52, 0.5, 0.66, 0x2e2e34, 0, 1.1, 0));                     // corps plumeux
    g.add(box(0.46, 0.3, 0.24, 0xf4f2ea, 0, 1.02, 0.36));                 // plumes de queue
    g.add(box(0.16, 0.72, 0.16, 0xe8b884, 0, 1.55, -0.2));                // long cou
    g.add(box(0.2, 0.2, 0.3, 0xe8b884, 0, 1.94, -0.28));                  // petite tête
    g.add(box(0.1, 0.09, 0.16, 0xe8963c, 0, 1.9, -0.5));                  // bec
    yeux(g, 1.98, -0.44, 0.08, 0.06);
    g.userData.legs = legs;
    return g;
  },

  // Le sanglier : bas sur pattes, hérissé sur l'échine, deux défenses qui
  // remontent. Le seul à donner l'impression de charger même à l'arrêt.
  sanglier: () => quadrupede({
    corps: 0x4e4038, tete: 0x4e4038, patte: 0x2e2620,
    largeur: 0.58, hauteurCorps: 0.5, longueur: 1.0, hauteurPatte: 0.34,
    epaisseurPatte: 0.13, ecart: 0.19,
    extras(g, { yc, longueur }) {
      const zt = -longueur / 2 - 0.16;
      g.add(box(0.42, 0.42, 0.42, 0x5a4a40, 0, yc + 0.06, zt + 0.1));     // tête massive
      g.add(box(0.22, 0.18, 0.12, 0x3a302a, 0, yc - 0.02, zt - 0.16));    // groin
      for (const sx of [-1, 1]) {
        g.add(box(0.05, 0.16, 0.05, 0xf0ead6, sx * 0.12, yc + 0.04, zt - 0.16)); // défenses
        g.add(box(0.07, 0.14, 0.05, 0x4e4038, sx * 0.14, yc + 0.3, zt + 0.14));  // oreilles
      }
      yeux(g, yc + 0.12, zt - 0.11, 0.14, 0.04);
      for (let i = -2; i <= 2; i++) {                                     // soies de l'échine
        g.add(box(0.06, 0.16, 0.06, 0x2e2620, 0, yc + 0.32, i * 0.18));
      }
      g.add(box(0.05, 0.2, 0.05, 0x2e2620, 0, yc + 0.1, longueur / 2 + 0.05));
    },
  }),

  // L'ours brun : large, rond, sans cou. Il vit dans la neige des sommets.
  ours: () => quadrupede({
    corps: 0x6a4a2e, tete: 0x6a4a2e, patte: 0x543a24,
    largeur: 0.8, hauteurCorps: 0.72, longueur: 1.15, hauteurPatte: 0.42,
    epaisseurPatte: 0.22, ecart: 0.26,
    extras(g, { yc, longueur }) {
      const zt = -longueur / 2 - 0.16;
      g.add(box(0.52, 0.46, 0.4, 0x6a4a2e, 0, yc + 0.16, zt + 0.06));     // tête
      g.add(box(0.24, 0.2, 0.14, 0xa88458, 0, yc + 0.1, zt - 0.19));      // museau clair
      for (const sx of [-1, 1]) g.add(box(0.13, 0.13, 0.06, 0x543a24, sx * 0.19, yc + 0.4, zt + 0.06));
      yeux(g, yc + 0.22, zt - 0.15, 0.13, 0.05);
      g.add(box(0.3, 0.28, 0.1, 0x8a6a44, 0, yc - 0.06, -longueur / 2 + 0.02)); // poitrail
    },
  }),
};

// Les fiches d'espèce, au format du bestiaire (src/animals.js), plus trois
// champs qui n'existent que pour les montures :
//   montable — la bête accepte qu'on grimpe
//   allure   — combien de fois plus vite on avance en selle
//   assise   — la hauteur du dos, donc celle du regard une fois assis
// La voiture neuve de la Giga-usine : la seule monture à roues du jeu. C'est
// LA carrosserie de la vraie vie (vehicules.js) : un profil de Bézier extrudé
// en coque galbée, sous sa verrière de verre fumé. L'habitacle vit À
// L'INTÉRIEUR de la coque pleine : invisible de dehors (la coque opaque le
// couvre), et c'est TOUT ce qu'on voit une fois assis — la coque, elle,
// disparaît de l'intérieur, ses faces regardent dehors. D'où le cadre
// complet : montants, traverse, ciel de toit, et la plaque de capot dans la
// couleur de la caisse, pour voir l'avant de SA voiture en conduisant.
function voitureNeuve(voeu) {
  // Des teintes PROFONDES de carrosserie : les pastels saturaient sous
  // l'éclairage et mangeaient le bi-ton avant/arrière.
  const teintes = [0xb02020, 0x2a4e9c, 0xc0a878, 0x1f7a4c];
  const g = construireVoitureRoute(teintes[Math.floor(Math.random() * teintes.length)]);
  // LE COCKPIT — le nôtre, et il SURVIT au vrai modèle. L'ancien habitacle
  // partait quand le modèle arrivait, ne laissant qu'un petit tore centré qui
  // flottait au milieu du pare-brise (capture à l'appui) : l'intérieur du
  // modèle d'artiste n'est pas fait pour être habité par une caméra. On bâtit
  // donc un poste de conduite complet, ENVELOPPANT — planche de bord, ciel de
  // toit, panneaux de porte, baquets — dont les surfaces opaques cachent les
  // entrailles du modèle vues de dedans. Le siège est à GAUCHE (fiche
  // `siege`) : le volant est devant le conducteur, comme dans une voiture.
  const cockpit = new THREE.Group();
  const cuir = 0x14161a, anthr = 0x1d2026, creme = 0xd8d2c4, navy = 0x0e1a2e;
  // la plage du capot, vue à travers le pare-brise (les faces du modèle
  // regardent dehors : de dedans, sans elle, le capot serait invisible) —
  // INCLINÉE pour suivre le capot plongeant : plate et large, elle
  // dépassait de l'aile et flottait au-dessus du nez (vu de dehors)
  const plage = box(1.5, 0.02, 0.75, navy, 0, 0.66, -1.05);
  plage.rotation.x = -0.3;
  cockpit.add(plage);
  // LE NEZ SE REMPLIT. Verdict de Max en vue GTA : « la voiture à l'avant,
  // la transparence, on voit la pelouse — elle n'est pas bien fermée. » Le
  // capot du modèle n'a que des faces tournées vers dehors : un rayon qui
  // entre par le pare-brise ressort par le nez et tombe sur l'herbe. Deux
  // masses pleines, taillées SOUS la ligne de capot et entre les passages
  // de roue, bouchent le compartiment avant — et font un fond aux phares.
  // — étroites et basses : le capot plonge sur les flancs, et la première
  // version de ces masses perçait l'aile (capture à l'appui)
  cockpit.add(box(1.1, 0.34, 0.85, navy, 0, 0.42, -1.12));
  cockpit.add(box(0.8, 0.2, 0.6, navy, 0, 0.4, -1.76));  // jusqu'au dos de la calandre
  // le plancher et la cloison avant : le réservoir du modèle faisait office
  // des deux — retiré (il murait la vue), l'habitacle donnait sur la route
  cockpit.add(box(1.5, 0.03, 1.5, 0x101216, 0, 0.5, -0.05));
  cockpit.add(box(1.5, 0.26, 0.04, anthr, 0, 0.64, -0.78));
  // la planche de bord : la masse et le bourrelet, le cowl à 7,5 cm SOUS la
  // ligne du regard (0,96) — plus haut, la fente de vue devient meurtrière
  cockpit.add(box(1.5, 0.16, 0.34, anthr, 0, 0.78, -0.62));
  cockpit.add(box(1.5, 0.05, 0.38, cuir, 0, 0.86, -0.6));
  // le bloc-compteurs DERRIÈRE le volant (pas une dalle néon devant : la
  // première version dessinait un écran cyan géant par-dessus la jante).
  // Et rien d'autre sur la planche — verdict de Max sur capture iPhone :
  // « simplifie ». L'écran du milieu et le liseré orange sont partis.
  cockpit.add(box(0.26, 0.09, 0.06, cuir, -0.33, 0.89, -0.52));
  cockpit.add(box(0.19, 0.04, 0.015, 0x0e8aa8, -0.33, 0.885, -0.487));
  // LE VOLANT : jante, trois branches, moyeu — plus un anneau qui flotte.
  // PETIT : sur l'iPhone en portrait, le champ horizontal est étroit et la
  // jante d'avant mangeait l'écran entier (capture de Max). Jante fine,
  // sous la ligne du regard : on conduit en regardant PAR-DESSUS.
  const volant = new THREE.Group();
  volant.add(new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.014, 8, 20),
    new THREE.MeshBasicMaterial({ color: cuir })));
  const bMat = new THREE.MeshBasicMaterial({ color: anthr });
  for (const angle of [Math.PI / 2, Math.PI + 0.6, Math.PI * 2 - 0.6]) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.085, 0.016), bMat);
    br.position.set(Math.cos(angle) * 0.045, Math.sin(angle) * 0.045, 0);
    br.rotation.z = angle - Math.PI / 2;
    volant.add(br);
  }
  const moyeu = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.026, 12),
    new THREE.MeshBasicMaterial({ color: navy }));
  moyeu.rotation.x = Math.PI / 2;
  volant.add(moyeu);
  volant.rotation.x = -0.42;                                       // incliné vers soi
  volant.position.set(-0.33, 0.78, -0.46);
  cockpit.add(volant);
  cockpit.add(box(0.04, 0.05, 0.14, anthr, -0.33, 0.73, -0.51));   // la colonne
  // la console centrale, nue
  cockpit.add(box(0.2, 0.26, 0.55, anthr, 0, 0.7, -0.18));
  // deux baquets : assise, dossier épaulé, appuie-tête — crème, flancs navy
  for (const sx of [-0.33, 0.33]) {
    cockpit.add(box(0.4, 0.09, 0.42, creme, sx, 0.62, 0.18));
    cockpit.add(box(0.4, 0.44, 0.12, creme, sx, 0.85, 0.38));
    cockpit.add(box(0.05, 0.4, 0.14, navy, sx - 0.2, 0.83, 0.38));
    cockpit.add(box(0.05, 0.4, 0.14, navy, sx + 0.2, 0.83, 0.38));
    cockpit.add(box(0.2, 0.14, 0.1, creme, sx, 1.04, 0.4));
  }
  // les panneaux de porte, ARRÊTÉS SOUS la ligne du regard : au-dessus, les
  // faces de la coque regardent dehors et laissent le jour entrer — c'est la
  // fenêtre latérale, gratuite, comme dans une voiture sans vitre teintée.
  // L'accoudoir est sombre : en crème, si près de l'œil, c'était un pavé.
  for (const sx of [-1, 1]) {
    cockpit.add(box(0.045, 0.3, 1.15, anthr, sx * 0.73, 0.77, -0.05));
    cockpit.add(box(0.05, 0.05, 0.4, cuir, sx * 0.7, 0.86, -0.1));
    // le bas de caisse, entre plancher et porte : sans lui, on voyait la
    // roue avant par l'angle du plancher
    cockpit.add(box(0.05, 0.14, 1.5, 0x101216, sx * 0.75, 0.56, -0.05));
  }
  // le ciel de toit, collé à la ligne de toit du modèle (1,12 mesuré), du
  // haut du pare-brise jusque derrière les têtes : trop bas il fait visière,
  // trop court il découvre la tranche du toit (faces vers dehors : du dedans,
  // c'est un trou de ciel). Son bord avant EST la traverse : une traverse
  // séparée doublait la moulure de vitre du modèle — deux barres dans la vue.
  cockpit.add(box(1.16, 0.02, 1.3, 0x101318, 0, 1.13, -0.01));
  for (const sx of [-1, 1]) {
    const m = box(0.05, 0.05, 0.62, anthr, sx * 0.56, 1.0, -0.42);
    m.rotation.x = -0.55;
    cockpit.add(m);
  }
  g.add(cockpit);
  // LE VRAI MODÈLE remplace la sculpture dès qu'il est chargé — la coque de
  // primitives ne sert plus que d'attente, et de secours si le fichier
  // manque (ou tant qu'il n'a jamais été téléchargé, hors ligne).
  //
  // DEPUIS LA FLOTTE (Max : « add those cars for better diversity ») chaque
  // voiture neuve tire son modèle parmi cinquante-et-un : les cinquante de
  // vendor/voitures, plus le Chiron d'artiste historique — l'ajout est
  // additif, il ne remplace pas le cadeau. Deux différences de traitement :
  // les modèles de la flotte apportent leur PROPRE intérieur complet, donc
  // notre cockpit sculpté part avec la coque d'attente ; le modèle
  // d'artiste, lui, n'en a pas, et le cockpit reste.
  // UNE VOITURE GARÉE REVIENT AVEC SON MODÈLE. Un vœu (`voeu.flotte`, le nom
  // du fichier) court-circuite le tirage au sort : c'est ce qui rend à
  // l'enfant SA voiture au sortir du garage, et non une inconnue de la même
  // couleur. Sans vœu, ou si le modèle demandé n'existe plus dans la flotte,
  // on retombe sur le tirage — un fichier disparu ne doit pas rendre le
  // garage muet.
  const voulu = voeu && voeu.flotte
    ? FLOTTE.find((f) => f.fichier === voeu.flotte) || null : null;
  const enFlotte = voulu || (voeu && voeu.flotte === 'voiture.glb' ? null
    : Math.random() < FLOTTE.length / (FLOTTE.length + 1)
      ? FLOTTE[Math.floor(Math.random() * FLOTTE.length)] : null);
  g.userData.flotte = enFlotte ? enFlotte.fichier : 'voiture.glb';
  g.userData.nomVoiture = enFlotte ? enFlotte.nom : 'Bugatti Chiron';
  const chargement = enFlotte ? chargerVoitureFlotte(enFlotte) : chargerVraieVoiture();
  if (chargement) {
    chargement.then((proto) => {
      if (!proto || !g.userData.membres) return;
      for (const nom of ['caisse', 'verriere', 'tronc']) {
        const membre = g.userData.membres[nom];
        if (membre) g.remove(membre);
      }
      if (enFlotte) g.remove(cockpit);
      const modele = proto.clone(true);
      g.add(modele);
      // Les roues du clone, retrouvées par leur nom : le bestiaire les fera
      // tourner à la distance parcourue (animals.js). Les références ne se
      // recopient pas d'un clone à l'autre — le rayon, lui, si (userData).
      const roues = [];
      modele.traverse((o) => { if (/^Wheel_/i.test(o.name || '')) roues.push(o); });
      g.userData.roues = roues;
      g.userData.rayonRoue = proto.userData.rayonRoue || 0.34;
    });
  }
  g.userData.legs = [];                                            // rien ne balance
  return g;
}

export const MONTURES = [
  { key: 'elephant', name: 'Éléphant', cry: 'Barriiiit !', emoji: '🐘', speed: 0.9,
    height: 2.9, width: 1.6, meat: '🥜 Cacahuète', montable: true, allure: 1.6, assise: 2.5 },
  { key: 'zebre', name: 'Zèbre', cry: 'Hi-han-hii !', emoji: '🦓', speed: 2.0,
    height: 1.5, width: 0.7, meat: '🍎 Pomme', montable: true, allure: 2.3, assise: 1.45 },
  { key: 'ane', name: 'Âne', cry: 'Hi-han !', emoji: '🫏', speed: 1.2,
    height: 1.1, width: 0.55, meat: '🥕 Carotte', montable: true, allure: 1.7, assise: 1.05 },
  { key: 'chameau', name: 'Chameau', cry: 'Bloub !', emoji: '🐪', speed: 1.3,
    height: 1.9, width: 0.7, habitat: 'sand', meat: '🌴 Datte', montable: true, allure: 1.9, assise: 1.9 },
  { key: 'lama', name: 'Lama', cry: 'Mèèh !', emoji: '🦙', speed: 1.4,
    height: 1.6, width: 0.6, meat: '🧶 Laine', montable: true, allure: 1.8, assise: 1.25 },
  { key: 'autruche', name: 'Autruche', cry: 'Bouh bouh !', emoji: '🪶', speed: 2.2,
    height: 2.1, width: 0.6, habitat: 'sand', meat: '🥚 Gros œuf', montable: true, allure: 2.7, assise: 1.45 },
  { key: 'sanglier', name: 'Sanglier', cry: 'Grrrouf !', emoji: '🐗', speed: 1.7,
    height: 1.0, width: 0.7, meat: '🍄 Champignon', montable: true, allure: 1.9, assise: 0.9 },
  { key: 'ours', name: 'Ours brun', cry: 'Grooo !', emoji: '🐻', speed: 1.3,
    height: 1.3, width: 0.9, habitat: 'snow', meat: '🍯 Pot de miel', montable: true, allure: 1.8, assise: 1.2 },
  // La voiture neuve : elle sort de la chaîne de la Giga-usine, et c'est la
  // plus rapide de toutes les montures — c'est une voiture. Son habitat
  // `usine` n'existe dans aucun biome : elle n'apparaît JAMAIS toute seule
  // dans la nature, seul le garagiste de main.js la gare sur le parc.
  // Sa vitesse de flânerie est quasi nulle : une voiture garée ne broute pas.
  // `poursuite` : la VUE GTA, décidée par Max après deux essais de vue
  // intérieure (« on va rester dans une vue un peu comme GTA, où on voit la
  // voiture par derrière ») — la caméra recule et s'élève derrière le
  // véhicule. Le cockpit sculpté reste : on le voit à travers les vitres.
  // `assise` reste en secours : un fun.js ancien qui ignore `poursuite`
  // retombe dessus et l'enfant voit encore la route.
  // `nourrissable: false` : une voiture ne se nourrit pas (Max l'a vu sur le
  // bouton). Comme `montable`, la règle vit dans la fiche, jamais dans fun.js.
  // `immobile` : garée, elle ne flâne pas et ne pivote pas (le vagabondage
  // du bestiaire la faisait « bouger tac tac tac sans rouler » — Max). Elle
  // ne se déplace que conduite, où elle suit le joueur, en douceur.
  { key: 'voiture', name: 'Voiture neuve', cry: 'Vroum vroum !', emoji: '🚗', speed: 0.01,
    height: 1.3, width: 0.98, habitat: 'usine', meat: '🔩 Boulon', montable: true, allure: 3.4,
    assise: 1.0, poursuite: { recul: 5.2, hauteur: 2.1 }, nourrissable: false, immobile: true,
    // `vole: false` : la fiche interdit le vol, player.js l'applique. Voir la
    // note de `volInterdit` — la règle vit ici, jamais dans fun.js.
    vole: false, garable: true,
    // `gabarit` : la largeur de la boîte de collision quand on la conduit.
    // Le modèle mesure 2,26 blocs de large ; la boîte du piéton en fait 0,6,
    // et une voiture qui l'empruntait traversait les murs (Max, capture :
    // « cars crashing into walls »). Même discipline que `vole` et
    // `montable` : la règle vit dans la fiche, jamais dans fun.js.
    gabarit: 2.2 },
];
