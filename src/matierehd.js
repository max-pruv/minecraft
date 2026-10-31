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

// L'alpha des pixels vides des tuiles de feuillage (v499) : sous l'alphaTest
// de la couche (0,5), donc coupé, mais une COULEUR que les mipmaps mélangent
// sans frange noire.
const ALPHA_VIDE = 76;

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
  // Le châssis d'une fenêtre, en alpha (v301) : le bois peint des montants,
  // du meneau et de la traverse, les petits bois plus fins, et du vide entre
  // eux — la vitre est derrière, dans le fond du creux. Un seul quad remplace
  // six boîtes de menuiserie ; c'est ce qui rend un étage de trois blocs
  // moins cher qu'un étage d'un bloc. La traverse est haute (les deux
  // cinquièmes), comme sur une croisée haussmannienne.
  croisee(p, rempli, N) {
    rempli((x, y) => p(x, y, 0, 0, 0, 0));
    const bois = (x, y) => {
      if (x < 0 || y < 0 || x >= N || y >= N) return;
      const n = (bruit(x, y, 13) - 0.5) * 6 + bruitLisse(x, y * 0.2, 9, 14) * 8 - 4;
      p(x, y, 236 + n, 232 + n, 222 + n, 255);
    };
    const large = 7, fin = 3, mi = N >> 1, trav = Math.round(N * 0.4);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const montant = x < large || x >= N - large || Math.abs(x - mi) < large / 2;
      const traverse = y < large || y >= N - large || Math.abs(y - trav) < large / 2;
      if (montant || traverse) { bois(x, y); continue; }
      // les petits bois : un par carreau, au tiers et aux deux tiers de chaque vantail
      const dansVantail = x < mi ? x : x - mi;
      const carreau = Math.abs(dansVantail - mi / 2) < fin / 2;
      const carreauH = (y > trav ? Math.abs(y - (trav + N) / 2) < fin / 2 : Math.abs(y - trav / 2) < fin / 2);
      if (carreau || carreauH) bois(x, y);
    }
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
  // LES VRAIS ARBRES (v499, arbreshd.js). Une carte de feuillage est un quad
  // posé dans le volume de la couronne : ce qui compte est son BORD, qui doit
  // s'effacer — un rectangle plein ferait des tôles. Les feuilles sont des
  // petites ellipses semées dans un disque, de plus en plus rares vers le bord ;
  // claires et presque grises, la couleur vient du sommet (par essence, par
  // climat). Le disque est à 95 % du rayon de la tuile : rien ne touche le bord.
  // ET UNE FEUILLE EST UN LIMBE, PAS UN POINT (v541). Max, devant les arbres
  // de la v499 : « les arbres sont décevants… je veux des vrais feuillages,
  // des choses extrêmement réalistes comme GTA ». La tuile d'avant semait deux
  // cent trente petites ellipses de six texels : vue de près, une carte était
  // un nuage de confettis. Ici cent soixante limbes de quinze à vingt-deux
  // texels, pointus aux deux bouts, une nervure claire au milieu et un bord
  // plus sombre, posés du centre de l'amas vers son bord ; les derniers posés
  // recouvrent les premiers, qui sont les plus sombres — c'est l'intérieur
  // d'une frondaison, dans l'ombre des feuilles de devant. Le bord de la
  // tuile ne porte que des feuilles isolées : c'est lui qui dessine la
  // silhouette d'une couronne.
  feuilles(p, rempli, N) {
    const rng = mulberry32(474);
    const c = N / 2, R = N * 0.47;
    const fe = [];
    for (let i = 0; i < 160; i++) {
      const a = rng() * Math.PI * 2, d = Math.pow(rng(), 0.72) * R * 0.9;
      // la demi-longueur, la demi-largeur, l'angle (vers l'extérieur de
      // l'amas, avec du jeu), la lumière de la feuille, sa place du centre
      fe.push([c + Math.cos(a) * d, c + Math.sin(a) * d, 7 + rng() * 4, 2.8 + rng() * 1.8, a + (rng() - 0.5) * 1.6, 0.25 + rng() * 0.75, i / 160]);
    }
    const img = new Float32Array(N * N);
    const lum = new Float32Array(N * N);
    for (const [fx, fy, L, W, ang, l, ordre] of fe) {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      for (let y = Math.floor(fy - L - 1); y <= fy + L + 1; y++) for (let x = Math.floor(fx - L - 1); x <= fx + L + 1; x++) {
        if (x < 0 || y < 0 || x >= N || y >= N) continue;
        const dx = x - fx, dy = y - fy, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        const t = u / L;
        if (Math.abs(t) >= 1) continue;
        // le limbe : une ellipse pincée aux deux bouts
        const w = W * Math.pow(1 - t * t, 0.45);
        if (Math.abs(v) > w) continue;
        img[y * N + x] = 1;
        // la nervure centrale (claire), le bord (sombre), et les feuilles
        // du fond plus sombres que celles de devant
        const nervure = Math.abs(v) < 0.55 && Math.abs(t) < 0.85 ? 0.22 : 0;
        const bord = w - Math.abs(v) < 0.9 ? -0.18 : 0;
        lum[y * N + x] = (0.45 + 0.55 * ordre) * l + nervure + bord;
      }
    }
    rempli((x, y) => {
      const i = y * N + x;
      // Un pixel vide porte la COULEUR de la tuile, sous l'alphaTest (0,5) :
      // les mipmaps mélangent les voisins, et du noir transparent y ferait
      // une frange sombre autour de chaque feuille et sur le bord des cartes
      // (la boîte noire vue en capture autour d'une couronne, elle, était le
      // curseur de bloc du jeu sur un cube de feuilles visé).
      if (!img[i]) { p(x, y, 222, 226, 216, ALPHA_VIDE); return; }
      const v = 150 + lum[i] * 110 + (bruit(x, y, 81) - 0.5) * 12;
      p(x, y, v - 4, v, v - 12, 255);
    });
  },
  // Les aiguilles : des traits courts et fins, par bouquets, dans le même disque.
  aiguilles(p, rempli, N) {
    const rng = mulberry32(475);
    const c = N / 2, R = N * 0.47;
    const img = new Float32Array(N * N), lum = new Float32Array(N * N);
    for (let i = 0; i < 160; i++) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * R * 0.9;
      const bx = c + Math.cos(a) * d, by = c + Math.sin(a) * d, dir = rng() * Math.PI * 2, l = rng();
      for (let k = 0; k < 5; k++) {
        const ang = dir + (k - 2) * 0.28, L = 7 + rng() * 6;
        for (let t = 0; t < L; t += 0.5) {
          const x = Math.round(bx + Math.cos(ang) * t), y = Math.round(by + Math.sin(ang) * t);
          if (x < 0 || y < 0 || x >= N || y >= N) continue;
          img[y * N + x] = 1; lum[y * N + x] = l;
          if (t < L * 0.5) { const x2 = x + (Math.abs(Math.cos(ang)) < 0.5 ? 1 : 0), y2 = y + (Math.abs(Math.cos(ang)) >= 0.5 ? 1 : 0); if (x2 < N && y2 < N) { img[y2 * N + x2] = 1; lum[y2 * N + x2] = l; } }
        }
      }
    }
    rempli((x, y) => {
      const i = y * N + x;
      if (!img[i]) { p(x, y, 212, 218, 218, ALPHA_VIDE); return; }
      const v = 190 + lum[i] * 56 + (bruit(x, y, 82) - 0.5) * 16;
      p(x, y, v - 6, v, v, 255);
    });
  },
  // La palme : une nervure du bas vers le haut, des folioles de part et
  // d'autre. La carte fait trois blocs de long pour un de large : les folioles
  // sont dessinées à vingt degrés de la nervure et s'ouvrent à cinquante sur
  // la carte étirée.
  palme(p, rempli, N) {
    const rng = mulberry32(476);
    const img = new Float32Array(N * N), lum = new Float32Array(N * N);
    const c = N / 2;
    for (let y = 2; y < N - 2; y++) for (let dx = -2; dx <= 2; dx++) { img[y * N + c + dx] = 1; lum[y * N + c + dx] = 0.3; }
    for (let y = 6; y < N - 6; y += 3) {
      for (const side of [-1, 1]) {
        const L = 12 + rng() * 22, l = rng(), ang = 0.35 + rng() * 0.12;
        for (let t = 0; t < L; t += 0.5) {
          const x = Math.round(c + side * Math.cos(ang) * t), yy = Math.round(y - Math.sin(ang) * t * 0.9);
          if (x < 0 || yy < 0 || x >= N || yy >= N) continue;
          img[yy * N + x] = 1; lum[yy * N + x] = l;
          if (t < L * 0.6 && yy + 1 < N) { img[(yy + 1) * N + x] = 1; lum[(yy + 1) * N + x] = l; }
        }
      }
    }
    rempli((x, y) => {
      const i = y * N + x;
      if (!img[i]) { p(x, y, 206, 216, 200, ALPHA_VIDE); return; }
      const v = 186 + lum[i] * 60 + (bruit(x, y, 83) - 0.5) * 16;
      p(x, y, v - 10, v, v - 16, 255);
    });
  },
  // L'écorce du bouleau : blanc cassé, des lenticelles sombres en travers, une
  // tache grise ici et là.
  bouleau(p, rempli, N) {
    rempli((x, y) => {
      const n = (bruit(x, y, 84) - 0.5) * 14 + bruitLisse(x, y, 16, 85) * 16 - 8;
      const len = bruitLisse(x * 0.2, y, 9, 86);
      const tache = bruitLisse(x, y, 5, 87) > 0.78;
      let v = 226 + n;
      if (len > 0.82) v -= 150; else if (tache) v -= 60;
      p(x, y, v, v - 2, v - 10);
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
  // Les affiches d'une colonne Morris : deux affiches par hauteur de tuile, chacune
  // son fond de couleur, un titre en gros, des lignes de texte qu'on devine, et un
  // liseré de fonte verte entre elles.
  affiche(p, rempli, N) {
    const fonds = [[196, 44, 52], [232, 178, 40], [36, 76, 148], [230, 230, 222], [50, 120, 80], [150, 40, 110]];
    rempli((x, y) => {
      const haut = y < N / 2;
      const k = haut ? 0 : 1;
      const yy = haut ? y : y - N / 2;
      const col = Math.floor(x / (N / 2));
      const f = fonds[(k * 2 + col) % fonds.length];
      let r = f[0], g = f[1], b = f[2];
      const bord = yy < 4 || yy > N / 2 - 5 || (x % (N / 2)) < 3 || (x % (N / 2)) > N / 2 - 4;
      if (bord) { r = 40; g = 56; b = 44; }
      else if (yy > 10 && yy < 24 && (x % (N / 2)) > 8 && (x % (N / 2)) < N / 2 - 8 && bruit(x >> 2, y >> 2, 91) > 0.35) { r = 250; g = 246; b = 236; }   // le titre
      else if (yy > 34 && yy < 56 && ((yy - 34) % 6) < 3 && (x % (N / 2)) > 10 && (x % (N / 2)) < N / 2 - 10 && bruit(x >> 1, y, 92) > 0.4) { r = r * 0.35; g = g * 0.35; b = b * 0.35; } // le texte
      const n = (bruit(x, y, 93) - 0.5) * 10;
      p(x, y, r + n, g + n, b + n);
    });
  },
  // Le BARDAGE des maisons victoriennes de San Francisco (v398) : des clins de
  // bois horizontaux, huit par bloc — chacun recouvre celui du dessous, d'où
  // une ombre franche sous son bord et une arête claire au-dessus. Blanc cassé :
  // la couleur (le rose, le menthe, le ciel des Painted Ladies) vient du sommet.
  bardage(p, rempli, N) {
    rempli((x, y) => {
      const l = y % 16;
      const fil = bruitLisse(x, y * 4, 11, 97) * 10 + (bruit(x, y, 98) - 0.5) * 6;
      let v = 222 + fil - l * 0.9;
      if (l > 13) v -= 58;
      else if (l < 2) v += 10;
      p(x, y, v, v - 2, v - 6);
    });
  },
  // Les lattes de bois d'un banc : des lattes chaudes et vernies, le fil du bois
  // le long, et l'ombre entre deux lattes.
  lattes(p, rempli, N) {
    rempli((x, y) => {
      const l = y % 16;
      const grain = bruitLisse(x, y * 3, 9, 95) * 22 + (bruit(x, y, 96) - 0.5) * 10;
      let r = 152 + grain, g = 104 + grain * 0.8, b = 58 + grain * 0.5;
      if (l < 2 || l > 13) { r *= 0.45; g *= 0.45; b *= 0.45; }
      p(x, y, r, g, b);
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
  return { materiau, uniforms, atlas: canvas, profondeur: profondeurHD(materiau) };
}

// L'OMBRE DE LA COUCHE (v572). La passe d'ombre de three dessine chaque
// maillage avec SON matériau de profondeur, à qui elle recopie `map` et
// `alphaTest`, et qui échantillonne la carte aux UV BRUTS. Or les UV des façades
// sont en unités du monde (0..3 sur une baie de trois blocs) : repliées par le
// shader ci-dessus à l'écran, elles tombaient pour l'ombre sur tout l'atlas
// (entre 0 et 1) ou sur son bord (au-delà). Une croisée, un garde-corps, une
// ferronnerie jetaient donc un aplat, ou une bande fantôme d'une autre tuile —
// mesuré par `sonde-ombre-facades-hd.cjs`. Ce matériau de profondeur replie les
// UV EXACTEMENT comme la couleur (le même calcul, les mêmes dérivées) : ce qui
// est coupé à l'écran est coupé dans l'ombre. Les arbres (v499, UV absolues
// dans le rectangle neutre) rendent la même ombre qu'avant, par construction.
//
// Une clé de programme à lui (`paris-hd-ombre`), chauffée à l'accueil quand
// l'appareil a des ombres (main.js, `chaufferLaCoucheHD`). `map` et `alphaTest`
// sont reposés par three à chaque passe : ceux du matériau de la couche.
export function profondeurHD(materiau) {
  const p = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: materiau.map, alphaTest: materiau.alphaTest });
  p.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 tuile;
        varying vec4 vTuile;
        varying highp vec2 vUvTuile;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vTuile = tuile;
        vUvTuile = uv;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec4 vTuile;
        varying highp vec2 vUvTuile;`)
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec2 uvHD = vTuile.xy + fract(vUvTuile) * vTuile.zw;
          #if __VERSION__ >= 300
            diffuseColor *= textureGrad(map, uvHD, dFdx(vUvTuile) * vTuile.zw, dFdy(vUvTuile) * vTuile.zw);
          #else
            diffuseColor *= texture2D(map, uvHD);
          #endif
        #endif`);
  };
  p.customProgramCacheKey = () => 'paris-hd-ombre';
  return p;
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
