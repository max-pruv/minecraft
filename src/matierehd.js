// LE MATÉRIAU DE LA COUCHE HD (v287) — l'atlas, le shader, l'environnement.
//
// Un seul matériau pour tout le détail de Paris : les façades, les sols, les
// balcons, les stores. C'est ce qui fait qu'un morceau de ville coûte UN appel
// de dessin pour tout son relief, quel que soit le nombre de fenêtres.
//
// Ce que le matériau sait faire, et que `MeshStandardMaterial` ne sait pas
// seul :
//
// - REPLIER LES UV DANS LEUR TUILE. Les faces de sol sont fusionnées (une
//   chaussée de seize blocs est un quad) et les façades continuent d'un bloc à
//   l'autre : les UV sont en unités du monde et c'est le shader qui les
//   ramène dans la tuile (`tuile`, vec4) — la recette de `textures.js`, sur un
//   atlas de 1 024 pixels au lieu de 320.
// - LA MATIÈRE PAR SOMMET (`matiere`, vec2 : rugosité, métal). La pierre est
//   rugueuse, le zinc métallique, la vitre un miroir sombre — dans le même
//   maillage, sans changer de programme.
// - LA LUEUR PAR SOMMET (`lueur`, float) : une fenêtre allumée s'allume par son
//   émission, pilotée par un uniforme `nuitHD` que `main.js` règle sur la nuit.
//   Le jour, elle vaut zéro et la vitre reflète le ciel.
// - L'ENVIRONNEMENT : un ciel préfiltré (PMREM) une fois pour toutes — la
//   recette de Manhattan, sans capture par image. C'est lui que les vitres, le
//   zinc et les ferronneries reflètent.
//
// Les tuiles sont PEINTES ici, procéduralement, dans l'ordre de `TUILES_HD`
// (facadeshd.js) : rien n'est téléchargé, le jeu reste à un mégaoctet.

import * as THREE from 'three';
import { TUILES_HD, COLS_HD, PX_HD } from './facadeshd.js';

// --- un hasard stable ---------------------------------------------------------------

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Un bruit lisse et bon marché pour tacher la pierre et user l'asphalte.
function bruit(x, y, graine) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + graine * 37.719) * 43758.5453;
  return s - Math.floor(s);
}
// PÉRIODIQUE SUR LA TUILE : la texture se répète à chaque bloc, et un bruit
// qui ne se referme pas sur lui-même dessine une grille au raccord — vue en
// capture sur l'asphalte, un quadrillage au pas d'un bloc. Le treillis du bruit
// est replié sur la période de la tuile, donc le bord droit continue le bord
// gauche. Une échelle qui ne divise pas 128 est arrondie à la période entière.
function bruitLisse(x, y, echelle, graine) {
  const per = Math.max(1, Math.round(PX_HD / echelle));
  const fx = x / (PX_HD / per), fy = y / (PX_HD / per);
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const w = (i) => ((i % per) + per) % per;
  const a = bruit(w(x0), w(y0), graine), b = bruit(w(x0 + 1), w(y0), graine);
  const c = bruit(w(x0), w(y0 + 1), graine), d = bruit(w(x0 + 1), w(y0 + 1), graine);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

// --- les peintres, une tuile chacun -------------------------------------------------

// Chaque peintre reçoit un tableau de pixels RGBA de PX_HD × PX_HD et le
// remplit. `p(x, y, r, g, b, a)` écrit un pixel, `rempli(fn)` en parcourt tous.
function peintre(img, fn) {
  const N = PX_HD;
  const p = (x, y, r, g, b, a = 255) => {
    x = ((x % N) + N) % N; y = ((y % N) + N) % N;
    const i = (y * N + x) * 4;
    img[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    img[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    img[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    img[i + 3] = a;
  };
  const rempli = (f) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) f(x, y); };
  fn(p, rempli, N);
}

const PEINTRES = {
  // La pierre de taille : quatre assises par étage, joints décalés, chaque
  // pierre sa nuance, et un voile de salissure qui monte du sol.
  pierre(p, rempli, N) {
    const rng = mulberry32(31);
    const teintes = new Map();
    rempli((x, y) => {
      const assise = Math.floor(y / 32);
      const dx = (x + (assise % 2) * 32) % 64;
      const cle = `${assise}:${Math.floor((x + (assise % 2) * 32) / 64)}`;
      if (!teintes.has(cle)) teintes.set(cle, (rng() - 0.5) * 18);
      const n = (bruit(x, y, 1) - 0.5) * 10 + bruitLisse(x, y, 17, 2) * 14 - 7;
      let v = 192 + teintes.get(cle) + n;
      const joint = (y % 32) < 2 || dx < 2;
      if (joint) v -= 46;
      else if ((y % 32) === 2 || dx === 2) v += 14;   // l'arête claire de la pierre
      const sale = bruitLisse(x, y, 40, 3) * 0.5 + bruitLisse(x, y + 999, 9, 4) * 0.3;
      v -= sale * 22;
      p(x, y, v + 10, v + 2, v - 16);
    });
  },
  'pierre-lisse'(p, rempli) {
    rempli((x, y) => {
      const n = (bruit(x, y, 5) - 0.5) * 8 + bruitLisse(x, y, 23, 6) * 14 - 7;
      const v = 204 + n;
      p(x, y, v + 8, v + 1, v - 14);
    });
  },
  zinc(p, rempli, N) {
    rempli((x, y) => {
      const n = (bruit(x, y, 7) - 0.5) * 12 + bruitLisse(x, y, 30, 8) * 22 - 11;
      let v = 142 + n;
      const joint = x % 32;
      if (joint < 2) v -= 30; else if (joint === 2) v += 22;
      if (bruitLisse(x, y, 14, 9) > 0.72) v -= 9;   // la patine
      p(x, y, v - 6, v, v + 8);
    });
  },
  // La vitre : sombre, un peu plus claire en haut (le ciel s'y reflète), et
  // derrière, un rideau tiré à demi et la pénombre d'un appartement.
  verre(p, rempli, N) {
    rempli((x, y) => {
      const haut = 1 - y / N;
      let r = 34 + haut * 26, g = 44 + haut * 30, b = 58 + haut * 34;
      const rideau = x < 26 || x > N - 26;
      if (rideau) { r += 34; g += 26; b += 14; }
      const n = (bruit(x, y, 11) - 0.5) * 6;
      p(x, y, r + n, g + n, b + n);
    });
  },
  // La ferronnerie, en alpha : deux lisses, des barreaux, et la volute qui
  // fait un garde-corps parisien. Tout le reste est transparent.
  fer(p, rempli, N) {
    rempli((x, y) => p(x, y, 0, 0, 0, 0));
    const trait = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) p(x + dx, y + dy, 32, 33, 36, 255); };
    // la main courante, la lisse basse, et un barreau tous les seize pixels :
    // de la rue, un garde-corps se lit à ses VERTICALES, pas à ses volutes —
    // un premier jet de volutes rendait un gribouillis illisible.
    for (let x = 0; x < N; x++) { trait(x, 6); trait(x, 7); trait(x, N - 10); }
    for (let x = 8; x < N; x += 16) for (let y = 6; y < N - 8; y++) trait(x, y);
    // un anneau au milieu de chaque travée, le seul ornement
    for (let x0 = 8; x0 + 16 <= N; x0 += 16) {
      for (let a = 0; a <= Math.PI * 2; a += 0.08) {
        trait(Math.round(x0 + 8 + Math.cos(a) * 5), Math.round(64 + Math.sin(a) * 5));
      }
    }
  },
  menuiserie(p, rempli) {
    rempli((x, y) => {
      const n = (bruit(x, y, 13) - 0.5) * 6 + bruitLisse(x, y * 0.2, 9, 14) * 8 - 4;
      p(x, y, 236 + n, 232 + n, 222 + n);
    });
  },
  // La porte cochère : un vert-de-gris profond, des planches, deux panneaux.
  bois(p, rempli, N) {
    rempli((x, y) => {
      const n = (bruit(x, y, 15) - 0.5) * 10 + bruitLisse(x * 0.15, y, 11, 16) * 16 - 8;
      let v = 0;
      const planche = x % 32;
      if (planche < 2) v = -22;
      const panneau = (x > 12 && x < N / 2 - 6 || x > N / 2 + 6 && x < N - 12) && y > 14 && y < N - 14;
      const bord = panneau && (x === 13 || x === N / 2 - 7 || x === N / 2 + 7 || x === N - 13 || y === 15 || y === N - 15);
      if (bord) v += 26;
      p(x, y, 48 + n + v, 58 + n + v, 50 + n + v);
    });
  },
  store(p, rempli, N) {
    rempli((x, y) => {
      const bande = Math.floor(x / 16) % 2 === 0;
      const n = (bruit(x, y, 17) - 0.5) * 10 + (y % 4 === 0 ? -6 : 0);
      if (bande) p(x, y, 176 + n, 48 + n, 44 + n); else p(x, y, 238 + n, 230 + n, 212 + n);
    });
  },
  // Le bandeau d'enseigne : un fond sombre, un filet doré, et des lettres
  // qu'on devine sans les lire.
  enseigne(p, rempli, N) {
    const rng = mulberry32(19);
    const lettres = [];
    for (let x = 14; x < N - 14; x += 8 + Math.floor(rng() * 6)) lettres.push([x, 4 + Math.floor(rng() * 5)]);
    rempli((x, y) => {
      const n = (bruit(x, y, 21) - 0.5) * 8;
      let r = 46 + n, g = 42 + n, b = 40 + n;
      if (y === 8 || y === N - 9) { r = 196; g = 164; b = 84; }
      for (const [lx, lw] of lettres) {
        if (x >= lx && x < lx + lw && y > 40 && y < 88 && bruit(x >> 1, y >> 2, 23) > 0.35) { r = 222; g = 206; b = 160; }
      }
      p(x, y, r, g, b);
    });
  },
  // L'asphalte de la chaussée : presque noir, gris bleuté, un grain qui accroche
  // la lumière, des plaques d'usure plus claires.
  bitume(p, rempli) {
    rempli((x, y) => {
      const n = (bruit(x, y, 25) - 0.5) * 16 + bruitLisse(x, y, 32, 26) * 16 - 8;
      const grain = bruit(x, y, 27) > 0.965 ? 24 : 0;
      const usure = bruitLisse(x, y, 4, 28) > 0.7 ? 8 : 0;
      const v = 52 + n + grain + usure;
      p(x, y, v, v + 1, v + 4);
    });
  },
  // Les pavés en éventail : des arcs de cercle, chaque pavé sa nuance.
  pave(p, rempli, N) {
    rempli((x, y) => {
      const R = 40;
      // trois éventails qui se recouvrent par bandes
      const bande = Math.floor(y / R);
      const cx = ((bande % 2) * R * 0.5 + N * 0.5) % N;
      const dy = y - bande * R - R, dx = ((x - cx + N * 1.5) % N) - N * 0.5;
      const dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      const rang = Math.floor(dist / 9), sect = Math.floor(ang * (rang + 3) / 0.9);
      const joint = (dist % 9) < 1.6 || Math.abs(((ang * (rang + 3) / 0.9) % 1)) < 0.12;
      const nuance = bruit(rang, sect, 29) * 34 - 17 + (bruit(x, y, 30) - 0.5) * 10;
      let v = joint ? 70 : 118 + nuance;
      p(x, y, v + 2, v, v - 3);
    });
  },
  // Le trottoir de Paris : de l'asphalte, pas des dalles. Gris moyen, plus clair
  // et plus chaud que la chaussée, un grain fin, quelques plaques plus sombres
  // là où il a été refait — et aucun joint, un trottoir parisien n'en a pas.
  trottoir(p, rempli) {
    rempli((x, y) => {
      const n = (bruit(x, y, 33) - 0.5) * 14 + bruitLisse(x, y, 32, 34) * 14 - 7;
      const plaque = bruitLisse(x, y, 8, 35) > 0.74 ? -10 : 0;
      const grain = bruit(x, y, 36) > 0.97 ? 14 : 0;
      const v = 108 + n + plaque + grain;
      p(x, y, v + 3, v + 1, v - 3);
    });
  },
  // Le caniveau : des pavés de granit de dix centimètres en rangs serrés, joints
  // sombres, un peu mouillés — c'est la bande claire qui court au pied de toute
  // bordure parisienne.
  bordure(p, rempli) {
    rempli((x, y) => {
      const rang = Math.floor(y / 13);
      const dx = (x + (rang % 2) * 6) % 13;
      const joint = y % 13 < 2 || dx < 2;
      const n = bruit(rang, Math.floor((x + (rang % 2) * 6) / 13), 37) * 30 - 15 + (bruit(x, y, 38) - 0.5) * 8;
      const v = joint ? 82 : 138 + n;
      p(x, y, v - 2, v, v + 3);
    });
  },
  granit(p, rempli, N) {
    rempli((x, y) => {
      const n = (bruit(x, y, 41) - 0.5) * 20 + (bruit(x, y, 42) > 0.85 ? 22 : 0);
      const joint = x % 64 < 2 || y % 43 < 2;
      const v = (joint ? 110 : 158) + n;
      p(x, y, v, v - 1, v - 4);
    });
  },
  cour(p, rempli) {
    rempli((x, y) => {
      const gx = Math.floor(x / 16), gy = Math.floor(y / 16);
      const joint = x % 16 < 2 || y % 16 < 2;
      const n = bruit(gx, gy, 45) * 30 - 15 + (bruit(x, y, 46) - 0.5) * 10;
      const v = joint ? 74 : 112 + n;
      p(x, y, v + 3, v, v - 4);
    });
  },
  // La peinture au sol : blanche, usée par les roues, un peu de bitume qui
  // affleure.
  marquage(p, rempli) {
    rempli((x, y) => {
      const usure = bruitLisse(x, y, 11, 51) * 0.6 + bruit(x, y, 52) * 0.4;
      const v = usure > 0.78 ? 150 : 228 - usure * 30;
      p(x, y, v, v, v - 4);
    });
  },
  brique(p, rempli) {
    rempli((x, y) => {
      const rang = Math.floor(y / 16);
      const dx = (x + (rang % 2) * 16) % 32;
      const joint = y % 16 < 2 || dx < 2;
      const n = bruit(rang, Math.floor((x + (rang % 2) * 16) / 32), 47) * 40 - 20 + (bruit(x, y, 48) - 0.5) * 12;
      if (joint) p(x, y, 168, 160, 150); else p(x, y, 158 + n, 82 + n * 0.6, 64 + n * 0.5);
    });
  },
  // --- v288 : les quartiers, les arbres, le mobilier ---
  // L'enduit des vieux quartiers : blanc cassé (la teinte vient du sommet), un
  // grain fin, des taches d'humidité en bas et des cloques par endroits.
  enduit(p, rempli, N) {
    rempli((x, y) => {
      const n = (bruit(x, y, 61) - 0.5) * 10 + bruitLisse(x, y, 21, 62) * 16 - 8;
      const humide = bruitLisse(x, y, 32, 63) * (0.4 + 0.6 * (y / N));
      const cloque = bruitLisse(x, y, 6, 64) > 0.82 ? -14 : 0;
      const v = 226 + n - humide * 26 + cloque;
      p(x, y, v, v - 2, v - 8);
    });
  },
  // Le volet à persiennes : des lames horizontales, un cadre, peint en gris
  // vert — la couleur des volets de Paris.
  volet(p, rempli, N) {
    rempli((x, y) => {
      const cadre = x < 8 || x > N - 9 || y < 8 || y > N - 9;
      const lame = (y % 12) < 4;
      const n = (bruit(x, y, 65) - 0.5) * 10 + bruitLisse(x, y * 0.1, 9, 66) * 10 - 5;
      let v = cadre ? 0 : lame ? -34 : 6;
      p(x, y, 112 + v + n, 128 + v + n, 118 + v + n);
    });
  },
  // L'écorce : des sillons verticaux sombres, une lumière rasante.
  ecorce(p, rempli, N) {
    rempli((x, y) => {
      const sillon = bruitLisse(x, y * 0.25, 10, 67);
      const n = (bruit(x, y, 68) - 0.5) * 16 + bruitLisse(x, y, 25, 69) * 20 - 10;
      const v = 74 + n + (sillon > 0.6 ? -26 : sillon < 0.35 ? 14 : 0);
      p(x, y, v + 8, v, v - 10);
    });
  },
  // Le feuillage, en alpha : des amas de feuilles, du ciel entre eux. La
  // couleur vient du sommet ; ici seulement la lumière et le trou.
  feuillage(p, rempli, N) {
    rempli((x, y) => {
      const amas = bruitLisse(x, y, 8, 71) * 0.55 + bruitLisse(x, y, 16, 72) * 0.3 + bruit(x, y, 73) * 0.15;
      const trou = amas < 0.42;
      const lum = 190 + (amas - 0.5) * 120 + (bruit(x, y, 74) - 0.5) * 30;
      p(x, y, lum, lum + 6, lum - 30, trou ? 0 : 255);
    });
  },
  // La fonte peinte, vert sombre, presque unie, un peu de rouille au bord.
  fonte(p, rempli, N) {
    rempli((x, y) => {
      const n = (bruit(x, y, 75) - 0.5) * 8 + bruitLisse(x, y, 20, 76) * 10 - 5;
      const rouille = bruitLisse(x, y, 5, 77) > 0.88 ? 18 : 0;
      p(x, y, 216 + n + rouille, 220 + n, 214 + n - rouille);
    });
  },
  // La plaque de rue de Paris : fond bleu, liseré vert, deux lignes de
  // lettres blanches qu'on devine — l'arrondissement en haut, le nom en bas.
  plaque(p, rempli, N) {
    const rng = mulberry32(23);
    const mots = [];
    for (let x = 16; x < N - 16; x += 7 + Math.floor(rng() * 5)) mots.push([x, 4 + Math.floor(rng() * 3)]);
    rempli((x, y) => {
      const bord = x < 5 || x > N - 6 || y < 5 || y > N - 6;
      const liseré = !bord && (x < 9 || x > N - 10 || y < 9 || y > N - 10);
      let r = 22, g = 58, b = 132;
      if (bord) { r = 34; g = 96; b = 70; }
      else if (liseré) { r = 226; g = 226; b = 220; }
      for (const [lx, lw] of mots) {
        if (x >= lx && x < lx + lw && ((y > 58 && y < 86) || (y > 22 && y < 40 && lx > 40 && lx < 84)) && bruit(x >> 1, y >> 2, 78) > 0.3) { r = 236; g = 238; b = 240; }
      }
      const n = (bruit(x, y, 79) - 0.5) * 6;
      p(x, y, r + n, g + n, b + n);
    });
  },
  // Le cannage d'une chaise de bistrot : un tressage beige et vert.
  rotin(p, rempli) {
    rempli((x, y) => {
      const tx = Math.floor(x / 6) % 2, ty = Math.floor(y / 6) % 2;
      const n = (bruit(x, y, 81) - 0.5) * 14;
      if ((tx + ty) % 2 === 0) p(x, y, 214 + n, 188 + n, 132 + n); else p(x, y, 64 + n, 104 + n, 78 + n);
    });
  },
};

// --- l'atlas ------------------------------------------------------------------------

export function atlasHD() {
  const c = document.createElement('canvas');
  c.width = c.height = COLS_HD * PX_HD;
  const ctx = c.getContext('2d');
  TUILES_HD.forEach((nom, i) => {
    const fn = PEINTRES[nom];
    if (!fn) throw new Error(`pas de peintre pour la tuile HD ${nom}`);
    const img = ctx.createImageData(PX_HD, PX_HD);
    peintre(img.data, fn);
    ctx.putImageData(img, (i % COLS_HD) * PX_HD, Math.floor(i / COLS_HD) * PX_HD);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { texture: t, canvas: c };
}

// --- l'environnement : un ciel préfiltré une fois ---------------------------------------

function environnementHD(renderer) {
  const env = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(100, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 p;void main(){float h=normalize(p).y;
        vec3 sol=vec3(.30,.28,.26); vec3 horizon=vec3(.78,.80,.84); vec3 zenith=vec3(.36,.52,.78);
        vec3 c = h < 0.0 ? mix(horizon, sol, smoothstep(0.0,-0.3,h)) : mix(horizon, zenith, smoothstep(0.0,0.7,h));
        gl_FragColor=vec4(c,1.);}`,
    }),
  );
  env.add(dome);
  // quelques façades autour, pour qu'une vitre reflète de la pierre et pas
  // seulement du ciel
  const boite = new THREE.BoxGeometry(1, 1, 1);
  const pierre = new THREE.MeshBasicMaterial({ color: 0xb9b0a0 });
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const m = new THREE.Mesh(boite, pierre);
    m.position.set(Math.cos(a) * 26, 3, Math.sin(a) * 26);
    m.scale.set(6, 7 + (i % 3), 6);
    env.add(m);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.04, 0.1, 200);
  pmrem.dispose();
  boite.dispose(); pierre.dispose();
  dome.geometry.dispose(); dome.material.dispose();
  return rt.texture;
}

// --- le matériau ---------------------------------------------------------------------

export function materiauHD(renderer) {
  const { texture, canvas } = atlasHD();
  const uniforms = { nuitHD: { value: 0 } };
  const materiau = new THREE.MeshStandardMaterial({
    map: texture, vertexColors: true, alphaTest: 0.5,
    roughness: 1, metalness: 1,        // multipliés par la matière de chaque sommet
    envMap: environnementHD(renderer), envMapIntensity: 0.8,
  });
  materiau.onBeforeCompile = (shader) => {
    shader.uniforms.nuitHD = uniforms.nuitHD;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 tuile;
        attribute vec2 matiere;
        attribute float lueur;
        varying vec4 vTuile;
        varying highp vec2 vUvTuile;
        varying vec2 vMatiere;
        varying float vLueur;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vTuile = tuile;
        vUvTuile = uv;
        vMatiere = matiere;
        vLueur = lueur;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float nuitHD;
        varying vec4 vTuile;
        varying highp vec2 vUvTuile;
        varying vec2 vMatiere;
        varying float vLueur;`)
      .replace('#include <map_fragment>', `
        // LE REPLI DANS LA TUILE CASSE LES DÉRIVÉES : au bord de chaque bloc,
        // fract() saute d'une tuile entière, la carte graphique y lit une dérivée
        // énorme et choisit le mip le plus grossier — un trait de la couleur
        // moyenne de l'atlas à chaque bloc, le quadrillage vu sur les captures
        // aériennes. On lui donne les dérivées de l'UV NON replié, à l'échelle
        // de la tuile : le mip est alors celui de la texture continue.
        vec2 uvHD = vTuile.xy + fract(vUvTuile) * vTuile.zw;
        #if __VERSION__ >= 300
          vec4 texelHD = textureGrad(map, uvHD, dFdx(vUvTuile) * vTuile.zw, dFdy(vUvTuile) * vTuile.zw);
        #else
          vec4 texelHD = texture2D(map, uvHD);
        #endif
        diffuseColor *= texelHD;`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMatiere.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMatiere.y;')
      .replace('#include <emissivemap_fragment>', `
        totalEmissiveRadiance = vec3(1.0, 0.84, 0.58) * vLueur * nuitHD * 1.4;`);
  };
  materiau.customProgramCacheKey = () => 'paris-hd';
  return { materiau, uniforms, atlas: canvas };
}

// La BufferGeometry d'un tampon HD : les attributs du mailleur, plus la
// matière et la lueur.
export function geometrieHD(t) {
  if (!t) return null;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(t.positions, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(t.normals, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(t.uvs, 2));
  geom.setAttribute('color', new THREE.BufferAttribute(t.colors, 3));
  geom.setAttribute('tuile', new THREE.BufferAttribute(t.tiles, 4));
  geom.setAttribute('matiere', new THREE.BufferAttribute(t.matiere, 2));
  geom.setAttribute('lueur', new THREE.BufferAttribute(t.lueur, 1));
  geom.setIndex(new THREE.BufferAttribute(t.indices, 1));
  geom.computeBoundingSphere();
  return geom;
}
