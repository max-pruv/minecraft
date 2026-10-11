// LES UTILITAIRES ET LES PICKUPS DE LA RUE (v438). Max : « Improve all
// cities ». La rue ne roulait que des berlines et des voitures de sport —
// cinquante modèles d'exception et la berline citadine : pas une
// fourgonnette de livraison, pas un pickup de chantier. Une vraie rue, ce sont
// d'abord eux.
//
// Deux modèles ORIGINAUX (invariant 4), fabriqués comme la berline de New
// York (`taxis.js`) : géométrie et décors écrits ici, aucune marque.
//   · la fourgonnette : quatre mètres soixante, un toit haut, la cabine
//     vitrée et le compartiment de charge aveugle — le gabarit des
//     fourgonnettes de livraison européennes ;
//   · le pickup : quatre mètres quatre-vingts, une cabine double, la benne
//     ouverte derrière (et parfois des caisses dedans).
//
// LE COÛT EST UN APPEL DE DESSIN PAR MATÉRIAU (v196, v322). Une silhouette
// entière vient d'un PROFIL extrudé — une seule géométrie, galbée par le
// biseau — et tout ce qui partage un matériau est fusionné : la carrosserie
// complète fait sept maillages, chaque roue deux. Quinze en tout, contre
// trente-deux pour un modèle de la flotte (v201) : une rue qui gagne des
// utilitaires DESSINE MOINS.
//
// Le nez est en −z (comme `construireTaxi`), les roues touchent y = 0, les
// pivots s'appellent `Wheel_FL/FR/RL/RR` (le manifeste de la flotte), la
// laque `Paint_Primary` : la rue la repeint par la même règle que les autres
// (`repeindre`, v305).
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { partager } from './liberer.js';

// Les cotes, publiées pour les témoins : un gabarit se mesure sur le modèle
// rendu, et l'on compare à ce qu'on a voulu.
export const GABARITS_UTILITAIRES = Object.freeze({
  fourgon: { long: 4.6, larg: 1.9, haut: 2.0 },
  pickup: { long: 4.8, larg: 1.9, haut: 1.85 },
});

const ROUE_Y = 0.36, ROUE_R = 0.36, EMPATTEMENT = 1.42, VOIE = 0.8;

function materiaux(couleur) {
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: couleur, roughness: 0.34, metalness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2, name: 'Paint_Primary' }),
    trim: new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.85, name: 'Trim' }),
    gris: new THREE.MeshStandardMaterial({ color: 0x9aa1a6, roughness: 0.4, metalness: 0.6, name: 'Chrome' }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x2c3a44, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide, name: 'Glass' }),
    light: new THREE.MeshStandardMaterial({ color: 0xfff3d8, emissive: 0xffe2a6, emissiveIntensity: 0.35, roughness: 0.2, name: 'Headlight' }),
    red: new THREE.MeshStandardMaterial({ color: 0xa31a16, emissive: 0x4a0503, emissiveIntensity: 0.3, roughness: 0.3, name: 'Taillight' }),
    bois: new THREE.MeshStandardMaterial({ color: 0x8a6239, roughness: 0.9, name: 'Cargo' }),
  };
}

// Une géométrie posée, non indexée, avec ses UV : tout ce qu'on fusionne doit
// avoir les mêmes attributs.
function poser(geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
  if (geo.index) { const n = geo.toNonIndexed(); geo.dispose(); geo = n; }
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  return geo;
}

// UN PROFIL DE CARROSSERIE EXTRUDÉ sur la largeur. `pts` : la silhouette vue
// de côté, en (z, y) du monde, du nez vers l'arrière par le dessus ; le bas
// est refermé avec les deux passages de roue. Le biseau arrondit toutes les
// arêtes : c'est ce qui sépare une carrosserie d'une boîte.
function profil(pts, larg, bas = 0.32, arches = true) {
  const s = new THREE.Shape();
  // le repère de la forme est (−z, y) : tourné d'un quart de tour autour de y,
  // son x devient le z du monde (rotateY(π/2) envoie x sur −z)
  s.moveTo(-pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(-pts[i][0], pts[i][1]);
  const zA = pts[pts.length - 1][0], zN = pts[0][0];
  s.lineTo(-zA, bas);
  // le bas, de l'arrière vers l'avant, en contournant les roues
  for (const zr of arches ? [EMPATTEMENT, -EMPATTEMENT] : []) {
    const a = ROUE_R + 0.07, t0 = Math.asin((bas - ROUE_Y) / a);
    s.lineTo(-zr - a * Math.cos(t0), bas);
    s.absarc(-zr, ROUE_Y, a, Math.PI - t0, t0, true);
  }
  s.lineTo(-zN, bas);
  s.closePath();
  const b = 0.07;
  const geo = new THREE.ExtrudeGeometry(s, { depth: larg - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
  geo.translate(0, 0, -(larg - 2 * b) / 2);
  geo.rotateY(Math.PI / 2);
  return poser(geo);
}

// Une vitre : un quadrilatère dans le plan d'une face, légèrement en saillie.
function vitre(coins) {
  const g = new THREE.BufferGeometry();
  const [a, b, c, d] = coins;
  const p = [...a, ...b, ...c, ...a, ...c, ...d];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.computeVertexNormals();
  return poser(g);
}

function roues(groupe, mat) {
  for (const [sx, sz, nom] of [[-1, -1, 'FL'], [1, -1, 'FR'], [-1, 1, 'RL'], [1, 1, 'RR']]) {
    const w = new THREE.Group();
    w.name = 'Wheel_' + nom;
    w.position.set(sx * VOIE, ROUE_Y, sz * EMPATTEMENT);
    const pneu = poser(new THREE.CylinderGeometry(ROUE_R, ROUE_R, 0.26, 20), [0, 0, 0], [0, 0, Math.PI / 2]);
    const jante = mergeGeometries([
      poser(new THREE.CylinderGeometry(0.22, 0.22, 0.27, 16), [0, 0, 0], [0, 0, Math.PI / 2]),
      poser(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10), [0, 0, 0], [0, 0, Math.PI / 2]),
    ], false);
    w.add(new THREE.Mesh(pneu, mat.trim), new THREE.Mesh(jante, mat.gris));
    groupe.add(w);
  }
}

function finir(g, tas, mat, forme) {
  for (const [cle, geos] of tas) {
    if (!geos.length) continue;
    const geo = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    const m = new THREE.Mesh(geo, mat[cle]);
    m.name = cle;
    g.add(m);
  }
  roues(g, mat);
  Object.values(mat).forEach(partager);
  g.traverse((o) => {
    if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = true; partager(o.geometry); }
  });
  g.userData.rayonRoue = ROUE_R;
  g.userData.forme = forme;
  return g;
}

// Les feux et les pare-chocs, communs aux deux : avant en −z, arrière en +z.
function avantArriere(tas, L, larg, yPhare, yFeu) {
  const zN = -L / 2, zA = L / 2, x = larg / 2 - 0.22;
  for (const s of [-1, 1]) {
    tas.light.push(poser(new THREE.BoxGeometry(0.34, 0.16, 0.06), [s * x, yPhare, zN - 0.005]));
    tas.red.push(poser(new THREE.BoxGeometry(0.12, 0.34, 0.06), [s * (larg / 2 - 0.1), yFeu, zA + 0.005]));
  }
  tas.trim.push(poser(new THREE.BoxGeometry(larg + 0.04, 0.22, 0.16), [0, 0.42, zN + 0.04]));
  tas.trim.push(poser(new THREE.BoxGeometry(larg + 0.04, 0.22, 0.16), [0, 0.42, zA - 0.04]));
  // la calandre
  tas.trim.push(poser(new THREE.BoxGeometry(larg - 0.9, 0.22, 0.05), [0, yPhare, zN - 0.01]));
  // les plaques
  tas.gris.push(poser(new THREE.BoxGeometry(0.5, 0.12, 0.02), [0, 0.42, zN - 0.04]));
  tas.gris.push(poser(new THREE.BoxGeometry(0.5, 0.12, 0.02), [0, 0.42, zA + 0.04]));
}

// LA FOURGONNETTE. Profil : capot court, pare-brise incliné, toit haut et
// plat jusqu'à l'arrière droit.
export function construireUtilitaire({ couleur = 0xeef0f0 } = {}) {
  const g = new THREE.Group(), mat = materiaux(couleur);
  const { long: L, larg: W, haut: H } = GABARITS_UTILITAIRES.fourgon;
  const tas = Object.fromEntries(Object.keys(mat).map((k) => [k, []]));
  const zN = -L / 2, zA = L / 2;
  tas.paint.push(profil([[zN, 0.55], [zN + 0.05, 0.98], [zN + 0.8, 1.12], [zN + 1.45, H - 0.05], [zN + 1.6, H], [zA - 0.05, H], [zA, H - 0.08]], W));
  // le pare-brise et les vitres de la cabine (la charge est aveugle)
  const xv = W / 2 + 0.003, zp0 = zN + 0.85, zp1 = zN + 1.48;
  // (posé un biseau AU-DESSUS de la tôle inclinée : à fleur, la laque le cache)
  tas.glass.push(vitre([[-W / 2 + 0.12, 1.18, zp0], [W / 2 - 0.12, 1.18, zp0], [W / 2 - 0.12, H - 0.1, zp1], [-W / 2 + 0.12, H - 0.1, zp1]].map(([x, y, z]) => [x, y + 0.06, z - 0.07])));
  for (const s of [-1, 1]) {
    tas.glass.push(vitre(s < 0
      ? [[s * xv, 1.18, zN + 1.0], [s * xv, 1.18, zN + 2.05], [s * xv, H - 0.15, zN + 2.05], [s * xv, H - 0.15, zN + 1.55]]
      : [[s * xv, 1.18, zN + 2.05], [s * xv, 1.18, zN + 1.0], [s * xv, H - 0.15, zN + 1.55], [s * xv, H - 0.15, zN + 2.05]]));
    // la porte coulissante et le rail
    tas.trim.push(poser(new THREE.BoxGeometry(0.02, 0.04, 1.6), [s * (W / 2 + 0.002), H - 0.25, zA - 1.4]));
    tas.trim.push(poser(new THREE.BoxGeometry(0.02, 1.25, 0.02), [s * (W / 2 + 0.002), 1.05, zN + 2.12]));
    // le rétroviseur
    tas.trim.push(poser(new THREE.BoxGeometry(0.06, 0.24, 0.16), [s * (W / 2 + 0.1), 1.35, zN + 1.0]));
    // la baguette de protection
    tas.trim.push(poser(new THREE.BoxGeometry(0.03, 0.08, L - 1.9), [s * (W / 2 + 0.01), 0.72, 0.25]));
  }
  // les portes arrière : un joint au milieu, deux vitres
  tas.trim.push(poser(new THREE.BoxGeometry(0.02, H - 0.5, 0.02), [0, (H + 0.4) / 2, zA + 0.003]));
  tas.glass.push(vitre([[0.08, 1.35, zA + 0.004], [W / 2 - 0.16, 1.35, zA + 0.004], [W / 2 - 0.16, H - 0.18, zA + 0.004], [0.08, H - 0.18, zA + 0.004]].map(([x, y, z]) => [-x, y, z])));
  tas.glass.push(vitre([[0.08, 1.35, zA + 0.004], [W / 2 - 0.16, 1.35, zA + 0.004], [W / 2 - 0.16, H - 0.18, zA + 0.004], [0.08, H - 0.18, zA + 0.004]]));
  avantArriere(tas, L, W, 0.82, 1.0);
  return finir(g, Object.entries(tas).reduce((m, [k, v]) => m.set(k, v), new Map()), mat, 'fourgon-v438');
}

// LE PICKUP. Profil bas (capot, benne) ; la cabine double s'y pose.
export function construirePickup({ couleur = 0x3d4a57, chargement = false } = {}) {
  const g = new THREE.Group(), mat = materiaux(couleur);
  const { long: L, larg: W, haut: H } = GABARITS_UTILITAIRES.pickup;
  const tas = Object.fromEntries(Object.keys(mat).map((k) => [k, []]));
  const zN = -L / 2, zA = L / 2, zC0 = zN + 1.25, zC1 = zN + 3.05;
  // le bas : capot, cabine, ridelles de la benne
  tas.paint.push(profil([[zN, 0.6], [zN + 0.05, 1.02], [zC0, 1.12], [zA - 0.03, 1.12], [zA, 1.05]], W));
  // la cabine
  tas.paint.push(profil([[zC0 - 0.05, 1.1], [zC0 + 0.55, H - 0.04], [zC0 + 0.65, H], [zC1 - 0.05, H], [zC1, H - 0.06], [zC1, 1.1]], W - 0.08, 1.0, false));
  // la benne : l'intérieur sombre, posé un cheveu sous le haut des ridelles
  tas.trim.push(poser(new THREE.BoxGeometry(W - 0.26, 0.04, zA - zC1 - 0.22), [0, 1.13, (zA + zC1) / 2]));
  // les vitres de la cabine
  const xv = (W - 0.08) / 2 + 0.003;
  tas.glass.push(vitre([[-W / 2 + 0.16, 1.2, zC0 + 0.05], [W / 2 - 0.16, 1.2, zC0 + 0.05], [W / 2 - 0.16, H - 0.08, zC0 + 0.6], [-W / 2 + 0.16, H - 0.08, zC0 + 0.6]].map(([x, y, z]) => [x, y + 0.06, z - 0.08])));
  tas.glass.push(vitre([[W / 2 - 0.2, 1.25, zC1 + 0.004], [-W / 2 + 0.2, 1.25, zC1 + 0.004], [-W / 2 + 0.2, H - 0.12, zC1 + 0.004], [W / 2 - 0.2, H - 0.12, zC1 + 0.004]]));
  for (const s of [-1, 1]) {
    for (const [a, b] of [[zC0 + 0.15, zC0 + 0.95], [zC0 + 1.0, zC1 - 0.12]]) {
      tas.glass.push(vitre(s < 0
        ? [[s * xv, 1.22, a], [s * xv, 1.22, b], [s * xv, H - 0.1, b], [s * xv, H - 0.1, a + 0.3 * (a < zC0 + 0.5)]]
        : [[s * xv, 1.22, b], [s * xv, 1.22, a], [s * xv, H - 0.1, a + 0.3 * (a < zC0 + 0.5)], [s * xv, H - 0.1, b]]));
    }
    tas.trim.push(poser(new THREE.BoxGeometry(0.06, 0.24, 0.16), [s * (W / 2 + 0.1), 1.32, zC0 + 0.2]));
    // les marchepieds
    tas.trim.push(poser(new THREE.BoxGeometry(0.16, 0.05, zC1 - zC0), [s * (W / 2 + 0.04), 0.36, (zC0 + zC1) / 2]));
  }
  // une barre d'arceau derrière la cabine
  tas.gris.push(poser(new THREE.BoxGeometry(W - 0.2, 0.06, 0.06), [0, H - 0.1, zC1 + 0.12]));
  for (const s of [-1, 1]) tas.gris.push(poser(new THREE.BoxGeometry(0.06, H - 1.12, 0.06), [s * (W / 2 - 0.13), (H + 1.12) / 2, zC1 + 0.12]));
  if (chargement) {
    tas.bois.push(poser(new THREE.BoxGeometry(0.6, 0.45, 0.6), [-0.3, 1.36, zC1 + 0.55]));
    tas.bois.push(poser(new THREE.BoxGeometry(0.5, 0.35, 0.5), [0.35, 1.31, zC1 + 0.7], [0, 0.3, 0]));
  }
  avantArriere(tas, L, W, 0.86, 0.92);
  return finir(g, Object.entries(tas).reduce((m, [k, v]) => m.set(k, v), new Map()), mat, 'pickup-v438');
}
