// Matériaux originaux générés localement : aucun téléchargement ni licence
// tierce supplémentaire. Les motifs sont en mètres du monde, pas étirés par
// la taille des cubes instanciés. PBR Three.js r160, reflets PMREM.
import * as THREE from 'three';
import { ALEA } from './manhattan-plan.js';
function texture(type) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      let n = ALEA(x, y),
        v = 180 + (n - 0.5) * 35;
      if (type === 'brick') {
        const row = Math.floor(y / 24),
          dx = (x + (row % 2) * 32) % 64;
        v =
          y % 24 < 2 || dx < 2
            ? 100
            : 174 +
              (ALEA(Math.floor((x + (row % 2) * 32) / 64), row) - 0.5) * 44 +
              (n - 0.5) * 20;
      }
      if (type === 'stone')
        v = x % 128 < 2 || y % 64 < 2 ? 142 : 210 + (n - 0.5) * 15;
      if (type === 'paving')
        v = x % 128 < 2 || y % 128 < 2 ? 113 : 195 + (n - 0.5) * 25;
      if (type === 'asphalt') v = 100 + (n - 0.5) * 44 + (n > 0.96 ? 30 : 0);
      if (type.startsWith('facade')) {
        const px = x % 64,
          py = y % 64;
        const win = px > 18 && px < 44 && py > 9 && py < 49;
        v = win
          ? 68 + ((Math.floor(x / 64) + Math.floor(y / 64)) % 3) * 16
          : 196 + (n - 0.5) * 12;
        if (py < 3) v = 145;
        if (type === 'facadeglass')
          v =
            px < 3 || py < 3
              ? 102
              : 120 + ALEA(Math.floor(x / 64), Math.floor(y / 64)) * 65;
      }
      if (type === 'facadelights')
        v =
          x % 64 > 18 &&
          x % 64 < 44 &&
          y % 64 > 9 &&
          y % 64 < 49 &&
          ALEA(Math.floor(x / 64) + 11, Math.floor(y / 64)) > 0.42
            ? 255
            : 0;
      if (type === 'metal') v = 180 + (n - 0.5) * 9 + (y % 8 === 0 ? -28 : 0);
      const i = (y * 256 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function physique(color, map, taille, roughness = 0.8, metalness = 0) {
  const m = new THREE.MeshStandardMaterial({
    color,
    map,
    bumpMap: map,
    bumpScale: map ? 0.025 : 0,
    roughness,
    metalness,
  });
  if (map) {
    m.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 villePosition; varying vec3 villeNormale;'
      );
      s.vertexShader = s.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 vp=vec4(position,1.0); vec3 vn=normal;
        #ifdef USE_INSTANCING
          vp=instanceMatrix*vp; vn=mat3(instanceMatrix)*vn;
        #endif
        villePosition=(modelMatrix*vp).xyz; villeNormale=normalize(mat3(modelMatrix)*vn);`
      );
      s.fragmentShader = s.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 villePosition; varying vec3 villeNormale;'
      );
      s.fragmentShader = s.fragmentShader.replace(
        '#include <map_fragment>',
        `
        vec3 poids=abs(normalize(villeNormale));
        vec2 coord=poids.y>.5 ? villePosition.xz : (poids.x>.5 ? villePosition.zy : villePosition.xy);
        vec4 texel=texture2D(map,coord/${taille.toFixed(2)});
        diffuseColor*=texel;
        // Micro-relief optique conservant les normales et les ombres du bâti.
      `
      );
      s.fragmentShader = s.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #ifdef USE_EMISSIVEMAP
          totalEmissiveRadiance *= texture2D(emissiveMap,coord/${taille.toFixed(2)}).rgb;
        #endif
      `
      );
      s.fragmentShader = s.fragmentShader.replace(
        '#include <bumpmap_pars_fragment>',
        THREE.ShaderChunk.bumpmap_pars_fragment.replaceAll(
          'vBumpMapUv',
          `(abs(villeNormale.y)>.5?villePosition.xz:(abs(villeNormale.x)>.5?villePosition.zy:villePosition.xy))/${taille.toFixed(2)}`
        )
      );
      s.fragmentShader = s.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(texel.r-.5)*.14,.08,1.0);`
      );
    };
    m.customProgramCacheKey = () => `manhattan-pbr-${taille}`;
  }
  return m;
}
export function materiauxManhattan(renderer) {
  const brick = texture('brick'),
    stone = texture('stone'),
    paving = texture('paving'),
    asphalt = texture('asphalt'),
    metal = texture('metal');
  const facade = texture('facade'),
    facadeglass = texture('facadeglass'),
    lights = texture('facadelights');
  const mats = {
    farBrick: physique(0xbfa18d, facade, 12, 0.86),
    farLimestone: physique(0xd7d1c0, facade, 12, 0.82),
    farBrownstone: physique(0x9f8a7b, facade, 12, 0.88),
    farGlass: physique(0x7b9faa, facadeglass, 12, 0.24, 0.42),
    brick: physique(0xa6765c, brick, 3, 0.89),
    brownstone: physique(0x786052, brick, 3, 0.92),
    limestone: physique(0xe3d3b5, stone, 5, 0.78),
    trim: physique(0xc6b99f, stone, 4, 0.72),
    concrete: physique(0xb2b1a6, paving, 4, 0.96),
    asphalt: physique(0x60656a, asphalt, 4, 0.94),
    path: physique(0xbcb393, paving, 4, 0.95),
    grass: physique(0x647347, asphalt, 3, 1),
    metal: physique(0x555e63, metal, 1, 0.44, 0.65),
    roof: physique(0x545958, asphalt, 4, 0.94),
    glass: physique(0x65818b, null, 1, 0.19, 0.55),
    glassDark: physique(0x304a55, null, 1, 0.22, 0.5),
    glassLit: physique(0x9eaaa1, null, 1, 0.32, 0.22),
    white: physique(0xe6dfc9, null, 1, 0.92),
    yellow: physique(0xd9ad4b, null, 1, 0.84),
    foliage: physique(0x8b9b61, null, 2, 0.96),
    wood: physique(0x6e5341, brick, 2, 0.97),
    glow: physique(0xffdc98, null, 1, 0.38),
    signal: physique(0x71d3a4, null, 1, 0.4),
    water: physique(0x355d69, null, 1, 0.18, 0.58),
  };
  for (const m of [
    mats.farBrick,
    mats.farBrownstone,
    mats.farLimestone,
    mats.farGlass,
  ]) {
    m.emissiveMap = lights;
    m.emissive.set(0xffcb82);
    m.emissiveIntensity = 0;
  }
  mats.signal.emissive.set(0x28ff83);
  mats.signal.emissiveIntensity = 1.2;
  mats.glassLit.emissive.set(0xffcb82);
  mats.glassLit.emissiveIntensity = 0;
  mats.glow.emissive.set(0xffcb83);
  mats.glow.emissiveIntensity = 1;
  // Environnement de réflexion stable, préfiltré une fois. Pas de capture de
  // la ville six fois par image : budget identique avec cent tours de verre.
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x8cabb9);
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(100, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader:
        'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:
        'varying vec3 p;void main(){float h=normalize(p).y;vec3 c=mix(vec3(.18,.22,.23),vec3(.58,.72,.82),smoothstep(-.2,.65,h));gl_FragColor=vec4(c,1.);}',
    })
  );
  env.add(room);
  const blocks = new THREE.BoxGeometry(1, 1, 1),
    em = new THREE.MeshBasicMaterial({ color: 0x78858b });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2,
      m = new THREE.Mesh(blocks, em);
    m.position.set(Math.cos(a) * 30, 8, Math.sin(a) * 30);
    m.scale.set(5, 10 + ALEA(i) * 20, 5);
    env.add(m);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.03, 0.1, 200);
  pmrem.dispose();
  blocks.dispose();
  em.dispose();
  room.geometry.dispose();
  room.material.dispose();
  for (const m of Object.values(mats)) {
    m.envMap = rt.texture;
    m.envMapIntensity = 0.65;
  }
  return {
    mats,
    dispose() {
      Object.values(mats).forEach((m) => m.dispose());
      [
        brick,
        stone,
        paving,
        asphalt,
        metal,
        facade,
        facadeglass,
        lights,
      ].forEach((t) => t.dispose());
      rt.dispose();
    },
  };
}
export function enseignesManhattan() {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1024;
  const ctx = c.getContext('2d');
  const labels = [
    ['FIFTH AVENUE', '#193d36'],
    ['W 42 ST', '#193d36'],
    ['BROADWAY', '#193d36'],
    ['MADISON AVE', '#193d36'],
    ['HUDSON COFFEE', '#343c39'],
    ['MIDTOWN BOOKS', '#5a3431'],
    ['DELI & GROCERY', '#2c4136'],
    ['THE ATELIER', '#303c48'],
    ['NEW YORK / 42', '#132a3b'],
    ['GRAND CENTRAL', '#716652'],
    ['RADIO CITY', '#493431'],
    ['CENTRAL PARK', '#283e32'],
    ['ONE WAY  →', '#ece7d7'],
    ['PARK AVENUE', '#193d36'],
    ['BROADWAY\nLIVE TONIGHT', '#682f39'],
    ['MANHATTAN\nAFTER HOURS', '#264455'],
  ];
  labels.forEach(([txt, bg], i) => {
    const x = (i % 4) * 512,
      y = Math.floor(i / 4) * 256;
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, 512, 256);
    ctx.strokeStyle = '#e7dfc066';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 8, y + 8, 496, 240);
    ctx.fillStyle = i === 12 ? '#202727' : '#f3eddb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = txt.split('\n');
    ctx.font = '500 ' + (lines.length > 1 ? 58 : 110) + 'px Arial';
    lines.forEach((s, j) =>
      ctx.fillText(s, x + 256, y + 128 + (j - (lines.length - 1) / 2) * 62, 470)
    );
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({
    map: t,
    emissiveMap: t,
    emissive: 0xffffff,
    emissiveIntensity: 0.15,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  return { material: m, texture: t };
}
