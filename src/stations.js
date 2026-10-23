// LE NOM DE CHAQUE STATION, ÉCRIT SUR LE QUAI (v529).
//
// Max : « elles ne ressemblent pas à l'intérieur des vraies stations ». Une
// station de métro se reconnaît d'abord à son nom, écrit partout où l'on
// attend : à Paris sur la plaque émaillée bleue des piédroits, à Washington
// en haut des pylônes du quai et sur le mur d'en face, de l'autre côté des
// voies. Un bloc ne sait pas écrire un mot ; le nom est donc un plan, devant
// la case qui le porte, dont `ville.js` (`plaquesParis`) et `washington.js`
// (`plaquesDC`) donnent la place — des règles pures, qu'un témoin relit contre
// le monde engendré. Ce module ne fait que les dessiner.
//
// Ce que ça coûte : une station n'existe ici qu'à moins de 70 blocs de
// l'enfant (rendue à 110), un maillage et une texture de canevas par station,
// UN appel de dessin pour toutes ses plaques. Le matériau est un
// `MeshBasicMaterial` à carte : toujours lisible dans un tunnel, aucune lampe
// de plus (quatre pour tout le jeu, v248), et son programme se compile pendant
// l'accueil (`chaufferStations`, la règle des feux et des traces, v306 v434).
// Aucun logo ni charte d'exploitant : une plaque bleue, un bandeau brun, un
// nom en blanc.
import * as THREE from 'three';
import { plaquesParis } from './ville.js';
import { plaquesDC } from './washington.js';

const PORTEE = 70;      // on fabrique à moins de 70 blocs
const RENDRE = 110;     // et l'on rend au-delà de 110

let liste = null;
const lister = () => {
  if (liste) return liste;
  liste = [...plaquesParis(), ...plaquesDC()].filter((s) => s.plaques.length).map((s) => {
    let x = 0, y = 0, z = 0;
    for (const p of s.plaques) { x += p.x; y += p.y; z += p.z; }
    const n = s.plaques.length;
    return { ...s, cx: x / n, cy: y / n, cz: z / n, mesh: null };
  });
  return liste;
};

// Le canevas : une plaque bleue cerclée de blanc (Paris), un bandeau brun
// (Washington) ; le nom en blanc, réduit jusqu'à tenir sur une ligne.
function texteDe(nom, style, rapport) {
  const W = 512, H = Math.max(64, Math.round(W / rapport));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (style === 'paris') {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.roundRect(0, 0, W, H, H * 0.18); g.fill();
    g.fillStyle = '#143a8c';
    g.beginPath(); g.roundRect(H * 0.07, H * 0.07, W - H * 0.14, H - H * 0.14, H * 0.13); g.fill();
  } else {
    g.fillStyle = '#3b2a1e';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#c9a46a';
    g.fillRect(0, H * 0.86, W, H * 0.05);
  }
  g.fillStyle = '#ffffff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let t = Math.round(H * 0.5);
  const police = (px) => `700 ${px}px "Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif`;
  g.font = police(t);
  while (t > 12 && g.measureText(nom).width > W * 0.88) { t -= 2; g.font = police(t); }
  g.fillText(nom, W / 2, H * (style === 'paris' ? 0.53 : 0.47));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Tous les plans d'une station en UNE géométrie : quatre sommets par plaque,
// tournés vers le quai (face avant dans le sens trigonométrique).
function geometrieDe(plaques) {
  const pos = [], uv = [], idx = [];
  for (const p of plaques) {
    const rx = p.nz, rz = -p.nx;             // la droite de qui regarde la plaque
    const w = p.larg / 2, h = p.haut / 2, i = pos.length / 3;
    pos.push(
      p.x - rx * w, p.y - h, p.z - rz * w,
      p.x + rx * w, p.y - h, p.z + rz * w,
      p.x + rx * w, p.y + h, p.z + rz * w,
      p.x - rx * w, p.y + h, p.z - rz * w,
    );
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

function fabriquer(s) {
  const p0 = s.plaques[0];
  const mat = new THREE.MeshBasicMaterial({ map: texteDe(s.nom, s.style, p0.larg / p0.haut) });
  const mesh = new THREE.Mesh(geometrieDe(s.plaques), mat);
  mesh.name = 'nom-station';
  mesh.userData.station = s.nom;
  mesh.matrixAutoUpdate = false;
  return mesh;
}

function rendre(s, scene) {
  if (!s.mesh) return;
  scene.remove(s.mesh);
  s.mesh.geometry.dispose();
  s.mesh.material.map.dispose();
  s.mesh.material.dispose();
  s.mesh = null;
}

// Appelé à chaque image : trente-six distances, rien d'autre tant qu'on
// n'approche pas d'une station.
export function creerNomsDeStations(scene) {
  return {
    update(pos) {
      for (const s of lister()) {
        const d = Math.hypot(s.cx - pos.x, s.cz - pos.z);
        if (!s.mesh && d < PORTEE) { s.mesh = fabriquer(s); scene.add(s.mesh); }
        else if (s.mesh && d > RENDRE) rendre(s, scene);
      }
    },
    // pour les témoins : les stations dont le nom est dans la scène
    etat() {
      return lister().filter((s) => s.mesh).map((s) => ({ nom: s.nom, ville: s.ville, plaques: s.plaques.length }));
    },
  };
}

// LA CHAUFFE, pendant l'accueil : une plaque, sur un matériau de la même
// signature (basic + carte), compilée hors champ.
export function chaufferStations(renderer, camera, decor) {
  const ici = new THREE.Scene();
  const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const m = new THREE.Mesh(geometrieDe([{ x: 0, y: -500, z: 0, nx: 0, nz: 1, larg: 1, haut: 1 }]),
    new THREE.MeshBasicMaterial({ map: tex }));
  ici.add(m);
  renderer.compile(ici, camera, decor);
  m.geometry.dispose(); m.material.dispose(); tex.dispose();
}
