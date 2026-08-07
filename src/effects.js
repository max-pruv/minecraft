// Retours sensoriels sur les gestes du jeu : éclats quand on casse un bloc,
// éclair de confirmation quand on en pose. Aucune règle nouvelle à comprendre,
// juste le geste central du jeu rendu agréable.
//
// Tout est mis en réserve (pool) : casser des blocs est le geste le plus répété
// de la partie, il ne doit produire aucune allocation ni aucun ramasse-miettes.

import * as THREE from 'three';
import { BLOCK_INFO } from './blocks.js';
import { tileUV } from './textures.js';

const NB_ECLATS = 10;          // éclats projetés par bloc cassé
const RESERVE = 72;            // assez pour ~7 blocs cassés coup sur coup
const VIE = 0.75;              // secondes avant disparition d'un éclat
const GRAVITE = 22;
const REBOND = 0.42;           // amorti au contact du sol

// Couleur moyenne de la face latérale d'un bloc, lue une fois dans l'atlas.
// Les éclats portent ainsi la vraie couleur de ce qu'on casse, terre brune,
// pierre grise ou laine rouge, sans table de couleurs à tenir à jour.
const couleurs = new Map();

function couleurDuBloc(atlasCanvas, id) {
  const connue = couleurs.get(id);
  if (connue) return connue;
  const c = new THREE.Color(0x9a9a9a);
  const info = BLOCK_INFO[id];
  if (info && info.tiles && atlasCanvas) {
    try {
      const [u0, , u1, v1] = tileUV(info.tiles[1]);
      const w = atlasCanvas.width, h = atlasCanvas.height;
      // v est inversé par rapport au canevas : v1 (haut de la tuile en UV)
      // correspond au bord supérieur de la tuile dans l'image
      const px = Math.round(u0 * w), py = Math.round((1 - v1) * h);
      const taille = Math.max(1, Math.round((u1 - u0) * w));
      const d = atlasCanvas.getContext('2d', { willReadFrequently: true })
        .getImageData(px, py, taille, taille).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      if (n) c.setRGB((r / n) / 255, (g / n) / 255, (b / n) / 255, THREE.SRGBColorSpace);
    } catch { /* atlas illisible : la couleur neutre fera l'affaire */ }
  }
  couleurs.set(id, c);
  return c;
}

export function createEffects({ scene, world, atlasCanvas }) {
  const geoEclat = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  const eclats = [];
  for (let i = 0; i < RESERVE; i++) {
    const m = new THREE.Mesh(geoEclat, new THREE.MeshBasicMaterial({ transparent: true }));
    m.visible = false;
    m.matrixAutoUpdate = false;
    scene.add(m);
    eclats.push({ mesh: m, vie: 0, vx: 0, vy: 0, vz: 0, spin: 0 });
  }
  let curseur = 0;

  // Cube translucide qui se resserre sur le bloc qu'on vient de poser. Il part
  // plus grand que le bloc et ne descend jamais en dessous de sa taille, donc
  // il ne peut pas entrer en conflit de profondeur avec lui.
  const geoPose = new THREE.BoxGeometry(1, 1, 1);
  const matPose = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
  });
  const marqueur = new THREE.Mesh(geoPose, matPose);
  marqueur.visible = false;
  scene.add(marqueur);
  let poseT = 0;
  const POSE_DUREE = 0.22;

  function casse(x, y, z, id) {
    const couleur = couleurDuBloc(atlasCanvas, id);
    for (let i = 0; i < NB_ECLATS; i++) {
      const e = eclats[curseur];
      curseur = (curseur + 1) % RESERVE;
      e.vie = VIE;
      e.mesh.material.color.copy(couleur);
      e.mesh.material.opacity = 1;
      e.mesh.position.set(x + 0.2 + Math.random() * 0.6, y + 0.2 + Math.random() * 0.6, z + 0.2 + Math.random() * 0.6);
      e.mesh.scale.setScalar(0.6 + Math.random() * 0.7);
      e.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      const angle = Math.random() * Math.PI * 2;
      const force = 1.4 + Math.random() * 1.9;
      e.vx = Math.cos(angle) * force;
      e.vz = Math.sin(angle) * force;
      e.vy = 3.2 + Math.random() * 2.6;
      e.spin = (Math.random() - 0.5) * 9;
      e.mesh.visible = true;
      e.mesh.updateMatrix();
    }
  }

  function pose(x, y, z) {
    marqueur.position.set(x + 0.5, y + 0.5, z + 0.5);
    marqueur.visible = true;
    poseT = POSE_DUREE;
  }

  function update(dt) {
    for (const e of eclats) {
      if (e.vie <= 0) continue;
      e.vie -= dt;
      if (e.vie <= 0) { e.mesh.visible = false; continue; }

      e.vy -= GRAVITE * dt;
      const p = e.mesh.position;
      const ny = p.y + e.vy * dt;
      // rebond simple sur le premier bloc plein rencontré vers le bas
      if (e.vy < 0 && world.getBlock(Math.floor(p.x), Math.floor(ny), Math.floor(p.z)) !== 0) {
        e.vy = -e.vy * REBOND;
        e.vx *= 0.7; e.vz *= 0.7;
      } else {
        p.y = ny;
      }
      p.x += e.vx * dt;
      p.z += e.vz * dt;
      e.mesh.rotation.x += e.spin * dt;
      e.mesh.rotation.z += e.spin * dt;
      // les éclats s'effacent sur le dernier tiers de leur vie
      e.mesh.material.opacity = Math.min(1, e.vie / (VIE * 0.34));
      e.mesh.updateMatrix();
    }

    if (poseT > 0) {
      poseT -= dt;
      if (poseT <= 0) { marqueur.visible = false; matPose.opacity = 0; return; }
      const t = poseT / POSE_DUREE;            // 1 → 0
      marqueur.scale.setScalar(1 + 0.42 * t);  // se resserre de 1,42 à 1
      matPose.opacity = 0.5 * t;
    }
  }

  return {
    casse, pose, update,
    // introspection pour les tests automatisés
    actifs: () => eclats.filter((e) => e.vie > 0).length,
    marqueurVisible: () => marqueur.visible,
    couleurDernier: () => '#' + eclats[(curseur + RESERVE - 1) % RESERVE].mesh.material.color.getHexString(),
  };
}
