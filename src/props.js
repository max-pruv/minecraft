// 3D meshes for furniture & object props. Each prop id gets a cached template
// Group built from boxes; chunks clone the template (geometry is shared).

import * as THREE from 'three';
import { PROP_ITEMS, PROP_START, MEUBLE_ITEMS, MEUBLE_START, isMeuble, RUE_ITEMS, RUE_START, isRue } from './blocks.js';

const WOOD = 0x6b4a2a, DARKWOOD = 0x4a3218, TRUNK = 0x67513a, LEG = 0x2c2c2c;
const WHITE = 0xf2f2f0, DARK = 0x222226, GLOW = 0xffe9a0;

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

function rgbToHex([r, g, b]) { return (r << 16) | (g << 8) | b; }

// Each builder receives the variant color and returns a Group with its
// origin at the center of the block's floor (y=0 is the ground).
const BUILDERS = {
  tree(c) {
    const g = new THREE.Group();
    g.add(box(0.22, 1.1, 0.22, TRUNK, 0, 0.55, 0));
    g.add(box(0.95, 0.7, 0.95, c, 0, 1.35, 0));
    g.add(box(0.65, 0.35, 0.65, c, 0, 1.85, 0));
    return g;
  },
  pine(c) {
    const g = new THREE.Group();
    g.add(box(0.18, 0.5, 0.18, TRUNK, 0, 0.25, 0));
    g.add(box(0.95, 0.4, 0.95, c, 0, 0.7, 0));
    g.add(box(0.7, 0.4, 0.7, c, 0, 1.1, 0));
    g.add(box(0.45, 0.4, 0.45, c, 0, 1.5, 0));
    g.add(box(0.2, 0.3, 0.2, c, 0, 1.85, 0));
    return g;
  },
  flowerpot(c) {
    const g = new THREE.Group();
    g.add(box(0.34, 0.28, 0.34, 0xbe6c3e, 0, 0.14, 0));
    g.add(box(0.08, 0.35, 0.08, 0x3f7a30, 0, 0.45, 0));
    g.add(box(0.26, 0.2, 0.26, c, 0, 0.72, 0));
    return g;
  },
  bush(c) {
    const g = new THREE.Group();
    g.add(box(0.85, 0.55, 0.85, c, 0, 0.28, 0));
    g.add(box(0.55, 0.3, 0.55, c, 0, 0.65, 0));
    return g;
  },
  sofa(c) {
    const g = new THREE.Group();
    g.add(box(0.95, 0.3, 0.55, c, 0, 0.25, 0));           // seat
    g.add(box(0.95, 0.45, 0.15, c, 0, 0.55, 0.2));        // backrest
    g.add(box(0.15, 0.28, 0.55, c, -0.4, 0.5, 0));        // armrests
    g.add(box(0.15, 0.28, 0.55, c, 0.4, 0.5, 0));
    g.add(box(0.85, 0.1, 0.45, LEG, 0, 0.05, 0));
    return g;
  },
  armchair(c) {
    const g = new THREE.Group();
    g.add(box(0.6, 0.3, 0.55, c, 0, 0.25, 0));
    g.add(box(0.6, 0.5, 0.15, c, 0, 0.55, 0.2));
    g.add(box(0.14, 0.3, 0.5, c, -0.26, 0.5, 0));
    g.add(box(0.14, 0.3, 0.5, c, 0.26, 0.5, 0));
    g.add(box(0.5, 0.1, 0.42, LEG, 0, 0.05, 0));
    return g;
  },
  table(c) {
    const g = new THREE.Group();
    g.add(box(0.95, 0.08, 0.95, c, 0, 0.54, 0));
    for (const sx of [-0.4, 0.4]) for (const sz of [-0.4, 0.4]) {
      g.add(box(0.09, 0.5, 0.09, DARKWOOD, sx, 0.25, sz));
    }
    return g;
  },
  chair(c) {
    const g = new THREE.Group();
    g.add(box(0.45, 0.06, 0.45, c, 0, 0.42, 0));
    g.add(box(0.45, 0.5, 0.07, c, 0, 0.7, 0.19));
    for (const sx of [-0.17, 0.17]) for (const sz of [-0.17, 0.17]) {
      g.add(box(0.06, 0.42, 0.06, DARKWOOD, sx, 0.21, sz));
    }
    return g;
  },
  bed(c) {
    const g = new THREE.Group();
    g.add(box(0.95, 0.18, 0.98, WOOD, 0, 0.14, 0));       // frame
    g.add(box(0.9, 0.14, 0.92, WHITE, 0, 0.3, 0));        // mattress
    g.add(box(0.9, 0.1, 0.55, c, 0, 0.4, 0.2));           // blanket
    g.add(box(0.5, 0.1, 0.22, WHITE, 0, 0.42, -0.32));    // pillow
    g.add(box(0.95, 0.45, 0.08, WOOD, 0, 0.3, -0.46));    // headboard
    return g;
  },
  lamp(c) {
    const g = new THREE.Group();
    g.add(box(0.3, 0.06, 0.3, DARK, 0, 0.03, 0));
    g.add(box(0.06, 0.9, 0.06, DARK, 0, 0.5, 0));
    g.add(box(0.34, 0.3, 0.34, c, 0, 1.05, 0));
    g.add(box(0.16, 0.1, 0.16, GLOW, 0, 0.88, 0));
    return g;
  },
  tv(c) {
    const g = new THREE.Group();
    g.add(box(0.5, 0.06, 0.25, DARK, 0, 0.03, 0));
    g.add(box(0.08, 0.2, 0.08, DARK, 0, 0.13, 0));
    g.add(box(0.9, 0.55, 0.08, c, 0, 0.5, 0));            // frame
    g.add(box(0.78, 0.44, 0.03, 0x101418, 0, 0.5, -0.04)); // screen
    return g;
  },
  rug(c) {
    const g = new THREE.Group();
    g.add(box(0.98, 0.04, 0.98, c, 0, 0.02, 0));
    g.add(box(0.7, 0.045, 0.7, WHITE, 0, 0.021, 0));
    g.add(box(0.4, 0.05, 0.4, c, 0, 0.022, 0));
    return g;
  },
  cake(c) {
    const g = new THREE.Group();
    g.add(box(0.55, 0.25, 0.55, 0xf0e0c0, 0, 0.13, 0));
    g.add(box(0.57, 0.08, 0.57, c, 0, 0.29, 0));
    g.add(box(0.05, 0.18, 0.05, WHITE, 0, 0.42, 0));
    g.add(box(0.06, 0.06, 0.06, GLOW, 0, 0.54, 0));
    return g;
  },
  stool(c) {
    const g = new THREE.Group();
    g.add(box(0.4, 0.08, 0.4, c, 0, 0.4, 0));
    for (const sx of [-0.14, 0.14]) for (const sz of [-0.14, 0.14]) {
      g.add(box(0.06, 0.38, 0.06, DARKWOOD, sx, 0.19, sz));
    }
    return g;
  },
};

// Upscale factor per prop type — furniture at ~1 block felt dollhouse-sized
// next to the 1.8-block player, so everything grows (origin stays on the floor).
// --- mobilier Renaissance (Villandry) ---------------------------------------
// Ces meubles-là ont une silhouette précise : c'est elle qu'on reconnaît en
// entrant dans une pièce, plus que le détail.
const PIERRE = 0xe2dccc, OR = 0xd4b05c, CHENE = 0x4e341e;

Object.assign(BUILDERS, {
  lit_baldaquin(c) {
    const g = new THREE.Group();
    for (const sx of [-0.42, 0.42]) for (const sz of [-0.42, 0.42]) {
      g.add(box(0.09, 1.5, 0.09, CHENE, sx, 0.75, sz)); // les quatre colonnes
    }
    g.add(box(1.0, 0.1, 1.0, CHENE, 0, 1.52, 0));       // le ciel de lit
    g.add(box(1.02, 0.2, 0.1, c, 0, 1.4, -0.46));       // le lambrequin
    g.add(box(0.9, 0.22, 0.9, CHENE, 0, 0.28, 0));      // le châlit
    g.add(box(0.86, 0.14, 0.86, 0xf0eade, 0, 0.45, 0)); // le matelas
    g.add(box(0.86, 0.06, 0.5, c, 0, 0.53, 0.18));      // la courtepointe
    g.add(box(0.4, 0.1, 0.22, 0xffffff, 0, 0.55, -0.3));// l'oreiller
    return g;
  },
  cheminee() {
    const g = new THREE.Group();
    g.add(box(1.0, 1.15, 0.34, PIERRE, 0, 0.58, -0.32)); // le manteau
    g.add(box(1.16, 0.14, 0.44, PIERRE, 0, 1.22, -0.28)); // la tablette
    g.add(box(0.62, 0.72, 0.2, 0x2a2320, 0, 0.36, -0.2)); // l'âtre
    g.add(box(0.5, 0.16, 0.16, 0x8a3a1c, 0, 0.12, -0.2)); // les braises
    for (const sx of [-0.42, 0.42]) g.add(box(0.16, 1.15, 0.36, 0xd6cfbb, sx, 0.58, -0.32));
    return g;
  },
  lustre(c) {
    const g = new THREE.Group();
    g.add(box(0.05, 0.7, 0.05, c, 0, 1.6, 0));           // la tige
    g.add(box(0.34, 0.1, 0.34, c, 0, 1.22, 0));          // la couronne
    for (const [dx, dz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) {
      g.add(box(0.3, 0.05, 0.05, c, dx / 2, 1.24, dz / 2));
      g.add(box(0.07, 0.2, 0.07, 0xf6f0dc, dx, 1.36, dz)); // les bougies
      g.add(box(0.05, 0.08, 0.05, GLOW, dx, 1.5, dz));
    }
    return g;
  },
  tapisserie(c) {
    const g = new THREE.Group();
    g.add(box(1.3, 1.0, 0.06, c, 0, 1.1, -0.45));
    g.add(box(1.3, 0.08, 0.08, OR, 0, 1.62, -0.44));     // la tringle
    g.add(box(0.8, 0.5, 0.02, 0xb9a86a, 0, 1.12, -0.41)); // le motif central
    return g;
  },
  buffet(c) {
    const g = new THREE.Group();
    g.add(box(1.15, 0.75, 0.45, c, 0, 0.38, -0.2));
    g.add(box(1.2, 0.08, 0.5, 0x6a4a2a, 0, 0.79, -0.2)); // le plateau
    for (const sx of [-0.28, 0.28]) {
      g.add(box(0.44, 0.5, 0.03, 0x3a2614, sx, 0.4, -0.43)); // les portes
      g.add(box(0.07, 0.07, 0.05, OR, sx, 0.4, -0.46));      // les boutons
    }
    return g;
  },
  table_banquet(c) {
    const g = new THREE.Group();
    g.add(box(1.9, 0.1, 0.85, c, 0, 0.74, 0));
    for (const sx of [-0.78, 0.78]) {
      g.add(box(0.16, 0.72, 0.16, 0x3a2614, sx, 0.36, -0.3));
      g.add(box(0.16, 0.72, 0.16, 0x3a2614, sx, 0.36, 0.3));
    }
    g.add(box(1.5, 0.05, 0.06, 0x3a2614, 0, 0.2, 0));   // l'entretoise
    g.add(box(1.6, 0.03, 0.6, 0xf2ece0, 0, 0.8, 0));    // la nappe
    return g;
  },
  fauteuil_renaissance(c) {
    const g = new THREE.Group();
    g.add(box(0.62, 0.1, 0.6, CHENE, 0, 0.46, 0));
    g.add(box(0.56, 0.09, 0.54, c, 0, 0.53, 0));        // l'assise
    g.add(box(0.62, 0.85, 0.1, CHENE, 0, 0.85, -0.28)); // le dossier haut
    g.add(box(0.5, 0.5, 0.03, c, 0, 0.85, -0.22));
    for (const sx of [-0.3, 0.3]) {
      g.add(box(0.08, 0.46, 0.08, CHENE, sx, 0.23, -0.24));
      g.add(box(0.08, 0.46, 0.08, CHENE, sx, 0.23, 0.24));
      g.add(box(0.07, 0.07, 0.5, CHENE, sx, 0.72, -0.02)); // les accotoirs
    }
    return g;
  },
  vasque(c) {
    const g = new THREE.Group();
    g.add(box(0.8, 0.16, 0.8, c, 0, 0.08, 0));          // la margelle
    g.add(box(0.18, 0.4, 0.18, c, 0, 0.32, 0));         // le pied
    g.add(box(0.72, 0.14, 0.72, c, 0, 0.58, 0));        // la coupe
    g.add(box(0.6, 0.06, 0.6, 0x5aa8d8, 0, 0.64, 0));   // l'eau
    return g;
  },
});

// --- le mobilier de rue (v180) -----------------------------------------------
//
// À l'échelle RÉELLE du bloc : un réverbère fait trois mètres, pas un
// monolithe. Le fût est fin comme celui de la lampe d'intérieur — c'est
// exactement pour cela qu'on passe des blocs aux meshes.
Object.assign(BUILDERS, {
  reverbere() {
    const g = new THREE.Group();
    g.add(box(0.34, 0.06, 0.34, DARK, 0, 0.03, 0));         // le socle
    g.add(box(0.1, 3.0, 0.1, DARK, 0, 1.5, 0));             // le fût
    g.add(box(0.55, 0.08, 0.1, DARK, 0.26, 2.96, 0));       // la crosse
    g.add(box(0.26, 0.14, 0.2, GLOW, 0.5, 2.86, 0));        // la lanterne
    g.add(box(0.3, 0.04, 0.24, DARK, 0.5, 2.95, 0));        // son chapeau
    return g;
  },
  feux() {
    const g = new THREE.Group();
    g.add(box(0.3, 0.05, 0.3, DARK, 0, 0.02, 0));
    g.add(box(0.09, 2.4, 0.09, DARK, 0, 1.2, 0));
    g.add(box(0.26, 0.72, 0.18, 0x2a2a30, 0, 2.35, 0));     // le boîtier
    g.add(box(0.14, 0.14, 0.05, 0xd83a2a, 0, 2.58, -0.09)); // rouge
    g.add(box(0.14, 0.14, 0.05, 0xf0a83a, 0, 2.35, -0.09)); // orange
    g.add(box(0.14, 0.14, 0.05, 0x3ac862, 0, 2.12, -0.09)); // vert
    return g;
  },
  jardiniere(c) {
    const g = new THREE.Group();
    g.add(box(0.86, 0.34, 0.42, WOOD, 0, 0.17, 0));         // le bac
    g.add(box(0.8, 0.08, 0.36, 0x3a5a2a, 0, 0.38, 0));      // la terre et la verdure
    for (const dx of [-0.26, 0, 0.26]) {
      g.add(box(0.14, 0.16, 0.14, c, dx, 0.5, 0));          // les fleurs
    }
    return g;
  },
});

const SCALE = {
  tree: 1.8, pine: 1.8, bush: 1.5,
  sofa: 1.55, armchair: 1.5, table: 1.5, chair: 1.45, bed: 1.55,
  lamp: 1.5, tv: 1.5, rug: 1.6, stool: 1.4,
  flowerpot: 1.3, cake: 1.3,
  // le mobilier Renaissance est déjà dessiné à l'échelle du bloc
  lit_baldaquin: 1.0, cheminee: 1.0, lustre: 1.0, tapisserie: 1.0,
  buffet: 1.0, table_banquet: 1.0, fauteuil_renaissance: 1.0, vasque: 1.0,
  // le mobilier de rue est dessiné à l'échelle réelle
  reverbere: 1.0, feux: 1.0, jardiniere: 1.0,
};

const templates = new Map(); // prop id -> Group template

export function buildPropMesh(id) {
  let template = templates.get(id);
  if (!template) {
    const item = isRue(id) ? RUE_ITEMS[id - RUE_START]
      : isMeuble(id) ? MEUBLE_ITEMS[id - MEUBLE_START] : PROP_ITEMS[id - PROP_START];
    if (!item || !BUILDERS[item.type]) return null;
    template = BUILDERS[item.type](rgbToHex(item.rgb));
    template.scale.setScalar(SCALE[item.type] || 1.5);
    templates.set(id, template);
  }
  return template.clone();
}
