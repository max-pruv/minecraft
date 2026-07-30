// 3D meshes for furniture & object props. Each prop id gets a cached template
// Group built from boxes; chunks clone the template (geometry is shared).

import * as THREE from 'three';
import { PROP_ITEMS, PROP_START } from './blocks.js';

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

const templates = new Map(); // prop id -> Group template

export function buildPropMesh(id) {
  let template = templates.get(id);
  if (!template) {
    const item = PROP_ITEMS[id - PROP_START];
    if (!item) return null;
    template = BUILDERS[item.type](rgbToHex(item.rgb));
    templates.set(id, template);
  }
  return template.clone();
}
