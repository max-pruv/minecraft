// Procedurally generated 16x16 pixel-art texture atlas — no image assets needed.

import * as THREE from 'three';
import { TILE, DECOR_ITEMS, CITY_TILE_START, VILLANDRY_TILE, ARCHI_TILE, ROUTE_TILE_START } from './blocks.js';

const TILE_PX = 16;
export const ATLAS_COLS = 20;
// L'atlas était PLEIN : 360 cases, 350 prises. Impossible d'ajouter une seule
// texture — c'est ce qui plafonnait la fidélité des villes, où chaque bloc
// devait se contenter d'une teinte unie. On ouvre vingt-deux rangées de plus
// (440 cases libres) : de quoi peindre une vraie architecture, façade par
// façade. Le coût est une image de 320 × 640 pixels au lieu de 320 × 288 —
// deux cents kilo-octets de mémoire vidéo, rien pour une tablette.
export const ATLAS_ROWS = 40;

// Deterministic RNG so textures look identical every load.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp255(v) { return Math.max(0, Math.min(255, v | 0)); }

function px(ctx, ox, oy, x, y, r, g, b, a = 255) {
  ctx.fillStyle = `rgba(${clamp255(r)},${clamp255(g)},${clamp255(b)},${a / 255})`;
  ctx.fillRect(ox + x, oy + y, 1, 1);
}

function noisyFill(ctx, ox, oy, base, vary, rng) {
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const d = (rng() * 2 - 1) * vary;
      px(ctx, ox, oy, x, y, base[0] + d, base[1] + d, base[2] + d);
    }
  }
}

// --- l'architecture haussmannienne, registre par registre -------------------
//
// Tout se joue ici. Une façade parisienne n'est pas une teinte : c'est un
// calcaire lutétien crème, des fenêtres HAUTES à petits bois, des appuis en
// saillie, des ferronneries, une corniche moulurée. Peindre cela dans la tuile
// coûte quelques dizaines de pixels et change tout ce qu'on voit depuis la rue
// — bien davantage que n'importe quelle géométrie qu'on pourrait ajouter.
const PIERRE_PARIS = [223, 214, 192];
const JOINT_PARIS = [199, 190, 168];
const FER_FORGE = [38, 40, 44];
const ZINC_PARIS = [138, 144, 150];
const VITRE = [86, 108, 128];
const VITRE_CLAIRE = [122, 148, 170];

// La pierre de fond et ses assises horizontales : c'est elle qui donne
// l'échelle. Sans les joints, une façade est un mur de plâtre.
function pierreDeTaille(ctx, ox, oy, rng) {
  noisyFill(ctx, ox, oy, PIERRE_PARIS, 5, rng);
  for (let x = 0; x < TILE_PX; x++) {
    px(ctx, ox, oy, x, 0, ...JOINT_PARIS);
    px(ctx, ox, oy, x, 8, ...JOINT_PARIS);
  }
}

// Une fenêtre haute, son encadrement de pierre, son appui en saillie et ses
// petits bois.
function fenetre(ctx, ox, oy, y0, haut, clair) {
  const v = clair ? VITRE_CLAIRE : VITRE;
  for (let y = y0; y < y0 + haut; y++) {
    for (let x = 4; x <= 11; x++) px(ctx, ox, oy, x, y, ...v);
  }
  for (let y = y0 - 1; y <= y0 + haut; y++) {
    px(ctx, ox, oy, 3, y, 238, 231, 212);
    px(ctx, ox, oy, 12, y, 238, 231, 212);
  }
  for (let x = 3; x <= 12; x++) {
    px(ctx, ox, oy, x, y0 - 1, 238, 231, 212);
    px(ctx, ox, oy, x, y0 + haut, 210, 202, 182);
  }
  for (let y = y0; y < y0 + haut; y++) px(ctx, ox, oy, 7, y, 226, 220, 202);
  const mi = y0 + ((haut / 2) | 0);
  for (let x = 4; x <= 11; x++) px(ctx, ox, oy, x, mi, 226, 220, 202);
}

// Le balcon filant : deux lisses et les barreaux entre elles. C'est la
// signature de l'étage noble, celle qu'on reconnaît de l'autre bout du
// boulevard.
function ferronnerie(ctx, ox, oy, yh) {
  for (let x = 0; x < TILE_PX; x++) {
    px(ctx, ox, oy, x, yh, ...FER_FORGE);
    px(ctx, ox, oy, x, yh + 3, ...FER_FORGE);
  }
  for (let x = 0; x < TILE_PX; x += 2) {
    px(ctx, ox, oy, x, yh + 1, ...FER_FORGE);
    px(ctx, ox, oy, x, yh + 2, ...FER_FORGE);
  }
}

const peintresArchi = {
  // Le rez-de-chaussée commerçant : hauts plafonds, grande devanture, et le
  // store de toile rayé qui court au-dessus. Le registre le plus vivant.
  [ARCHI_TILE.VITRINE](ctx, ox, oy) {
    const rng = mulberry32(7001);
    noisyFill(ctx, ox, oy, [206, 197, 176], 5, rng);
    for (let x = 0; x < TILE_PX; x++) {
      const rouge = (x >> 1) & 1;
      px(ctx, ox, oy, x, 1, rouge ? 150 : 226, rouge ? 44 : 216, rouge ? 44 : 200);
      px(ctx, ox, oy, x, 2, rouge ? 128 : 200, rouge ? 36 : 190, rouge ? 36 : 176);
    }
    for (let y = 4; y <= 14; y++) {
      for (let x = 1; x <= 14; x++) px(ctx, ox, oy, x, y, ...VITRE_CLAIRE);
    }
    for (const x of [0, 7, 15]) for (let y = 3; y <= 15; y++) px(ctx, ox, oy, x, y, 62, 44, 34);
    for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, 3, 62, 44, 34);
    for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, 15, 74, 70, 64);
  },

  // L'entresol : coincé sous l'étage noble, plafond bas, petites fenêtres
  // presque carrées. On l'oublie toujours, et c'est pourtant lui qui donne à
  // la façade son rythme si particulier.
  [ARCHI_TILE.ENTRESOL](ctx, ox, oy) {
    const rng = mulberry32(7002);
    pierreDeTaille(ctx, ox, oy, rng);
    for (let y = 5; y <= 10; y++) for (let x = 5; x <= 10; x++) px(ctx, ox, oy, x, y, ...VITRE);
    for (let y = 4; y <= 11; y++) { px(ctx, ox, oy, 4, y, 238, 231, 212); px(ctx, ox, oy, 11, y, 238, 231, 212); }
    for (let x = 4; x <= 11; x++) { px(ctx, ox, oy, x, 4, 238, 231, 212); px(ctx, ox, oy, x, 11, 214, 206, 186); }
  },

  // L'étage courant.
  [ARCHI_TILE.ETAGE](ctx, ox, oy) {
    const rng = mulberry32(7003);
    pierreDeTaille(ctx, ox, oy, rng);
    fenetre(ctx, ox, oy, 3, 10, false);
  },

  // L'étage noble : la même fenêtre, et le balcon filant.
  [ARCHI_TILE.NOBLE](ctx, ox, oy) {
    const rng = mulberry32(7004);
    pierreDeTaille(ctx, ox, oy, rng);
    fenetre(ctx, ox, oy, 4, 9, true);
    ferronnerie(ctx, ox, oy, 11);
  },

  // La corniche : trois moulures en surplomb et leur ombre portée. C'est elle
  // qui donne à la ligne de toits parisienne son trait net.
  [ARCHI_TILE.CORNICHE](ctx, ox, oy) {
    const rng = mulberry32(7005);
    noisyFill(ctx, ox, oy, [231, 224, 204], 4, rng);
    for (let x = 0; x < TILE_PX; x++) {
      px(ctx, ox, oy, x, 0, 244, 238, 222);
      px(ctx, ox, oy, x, 3, 208, 200, 180);
      px(ctx, ox, oy, x, 4, 246, 240, 224);
      px(ctx, ox, oy, x, 8, 196, 188, 168);
      px(ctx, ox, oy, x, 9, 242, 236, 220);
      px(ctx, ox, oy, x, 14, 176, 168, 150);
      px(ctx, ox, oy, x, 15, 158, 150, 134);
    }
  },

  // Le comble à la Mansart : zinc à joints debout, et le chien-assis qui
  // l'éclaire.
  [ARCHI_TILE.MANSARDE](ctx, ox, oy) {
    const rng = mulberry32(7006);
    noisyFill(ctx, ox, oy, ZINC_PARIS, 8, rng);
    for (let x = 1; x < TILE_PX; x += 4) {
      for (let y = 0; y < TILE_PX; y++) px(ctx, ox, oy, x, y, 116, 122, 128);
    }
    for (let y = 5; y <= 11; y++) for (let x = 5; x <= 10; x++) px(ctx, ox, oy, x, y, ...VITRE);
    for (let y = 4; y <= 12; y++) { px(ctx, ox, oy, 4, y, 168, 174, 180); px(ctx, ox, oy, 11, y, 168, 174, 180); }
    for (let x = 4; x <= 11; x++) px(ctx, ox, oy, x, 12, 168, 174, 180);
    for (let x = 3; x <= 12; x++) px(ctx, ox, oy, x, 3, 178, 184, 190);
    px(ctx, ox, oy, 7, 2, 178, 184, 190); px(ctx, ox, oy, 8, 2, 178, 184, 190);
  },

  // Le zinc nu : le brisis et le terrasson, sans ouverture.
  [ARCHI_TILE.ZINC_LISSE](ctx, ox, oy) {
    const rng = mulberry32(7007);
    noisyFill(ctx, ox, oy, ZINC_PARIS, 9, rng);
    for (let x = 1; x < TILE_PX; x += 4) {
      for (let y = 0; y < TILE_PX; y++) px(ctx, ox, oy, x, y, 116, 122, 128);
      for (let y = 0; y < TILE_PX; y++) px(ctx, ox, oy, x + 1, y, 156, 162, 168);
    }
  },

  // Le chaînage d'angle : les grands blocs de pierre alternés qui tiennent les
  // angles. Sans eux un immeuble a l'air d'une boîte ; avec eux, il a l'air
  // construit.
  [ARCHI_TILE.CHAINAGE](ctx, ox, oy) {
    const rng = mulberry32(7008);
    noisyFill(ctx, ox, oy, [232, 225, 205], 5, rng);
    for (let x = 0; x < TILE_PX; x++) { px(ctx, ox, oy, x, 0, ...JOINT_PARIS); px(ctx, ox, oy, x, 7, ...JOINT_PARIS); }
    for (let y = 1; y <= 6; y++) px(ctx, ox, oy, 10, y, ...JOINT_PARIS);
    for (let y = 8; y < TILE_PX; y++) px(ctx, ox, oy, 5, y, ...JOINT_PARIS);
  },

  // La porte cochère : deux vantaux de bois sombre, une imposte vitrée et les
  // clous de bronze.
  [ARCHI_TILE.PORTE](ctx, ox, oy) {
    const rng = mulberry32(7009);
    pierreDeTaille(ctx, ox, oy, rng);
    for (let y = 4; y <= 15; y++) for (let x = 3; x <= 12; x++) px(ctx, ox, oy, x, y, 52, 38, 30);
    for (let x = 4; x <= 11; x++) px(ctx, ox, oy, x, 3, ...VITRE_CLAIRE);
    for (let y = 4; y <= 5; y++) for (let x = 5; x <= 10; x++) px(ctx, ox, oy, x, y, ...VITRE_CLAIRE);
    for (let y = 4; y < TILE_PX; y++) px(ctx, ox, oy, 8, y, 34, 24, 18);
    for (const [cx, cy] of [[5, 8], [11, 8], [5, 12], [11, 12]]) px(ctx, ox, oy, cx, cy, 168, 132, 62);
  },

  // Les pavés de Paris : posés en éventail, pas en damier. C'est ce qui les
  // distingue d'un dallage quelconque.
  [ARCHI_TILE.PAVE](ctx, ox, oy) {
    const rng = mulberry32(7010);
    noisyFill(ctx, ox, oy, [104, 102, 100], 10, rng);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const d = Math.abs(((x + y * 0.6) % 5) - 2);
        if (d < 0.6) px(ctx, ox, oy, x, y, 74, 72, 70);
        else if (d > 1.9) px(ctx, ox, oy, x, y, 124 + ((rng() * 10) | 0), 121, 118);
      }
    }
  },

  // La bordure de granit : le trait clair qui sépare le trottoir de la
  // chaussée, et le caniveau juste derrière.
  [ARCHI_TILE.BORDURE](ctx, ox, oy) {
    const rng = mulberry32(7011);
    noisyFill(ctx, ox, oy, [166, 164, 160], 7, rng);
    for (let x = 0; x < TILE_PX; x++) {
      px(ctx, ox, oy, x, 0, 196, 194, 190);
      px(ctx, ox, oy, x, 11, 128, 126, 122);
      px(ctx, ox, oy, x, 12, 96, 96, 94);
      px(ctx, ox, oy, x, 13, 88, 88, 86);
    }
    for (let x = 3; x < TILE_PX; x += 6) for (let y = 1; y <= 10; y++) px(ctx, ox, oy, x, y, 148, 146, 142);
  },

  // Le mur mitoyen : le pignon aveugle qu'on voit depuis les cours et les
  // percées. C'est ce qui manque quand tous les murs d'une ville ont des
  // fenêtres.
  [ARCHI_TILE.MUR_NU](ctx, ox, oy) {
    const rng = mulberry32(7012);
    noisyFill(ctx, ox, oy, [196, 190, 178], 9, rng);
    for (let i = 0; i < 20; i++) {
      const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
      px(ctx, ox, oy, x, y, 178, 172, 160);
    }
    for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, 12, 184, 178, 166);
  },
// textures.js (graines mulberry 7013 et suivantes, la 7012 est MUR_NU).

  // Le pan de bois : le torchis crème quadrillé de poutres brunes — montants,
  // sablières, et la croix de Saint-André qui contrevente. C'est la croix
  // qu'on reconnaît d'Alsace en Normandie.
  [ARCHI_TILE.COLOMBAGE](ctx, ox, oy) {
    const rng = mulberry32(7013);
    noisyFill(ctx, ox, oy, [228, 218, 196], 6, rng);
    const bois = [92, 62, 38];
    for (let y = 0; y < TILE_PX; y++) { px(ctx, ox, oy, 0, y, ...bois); px(ctx, ox, oy, 15, y, ...bois); }
    for (let x = 0; x < TILE_PX; x++) { px(ctx, ox, oy, x, 0, ...bois); px(ctx, ox, oy, x, 15, ...bois); }
    for (let k = 1; k < 15; k++) {
      px(ctx, ox, oy, k, k, ...bois); px(ctx, ox, oy, 15 - k, k, ...bois);
      if (k < 14) { px(ctx, ox, oy, k + 1, k, 108, 76, 48); px(ctx, ox, oy, 14 - k, k, 108, 76, 48); }
    }
  },

  // Le grès brun de Brooklyn : des blocs chauds, presque chocolat, aux joints
  // fins — et cette légère irrégularité de teinte qui fait la pierre vraie.
  [ARCHI_TILE.GRES_BRUN](ctx, ox, oy) {
    const rng = mulberry32(7014);
    noisyFill(ctx, ox, oy, [122, 82, 62], 9, rng);
    for (let y = 0; y < TILE_PX; y += 4) {
      for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, 96, 62, 46);
    }
    for (let y = 0; y < TILE_PX; y += 4) {
      const dec = ((y / 4) & 1) * 4;
      for (let x = dec; x < TILE_PX; x += 8) for (let k = 1; k < 4; k++) px(ctx, ox, oy, x, y + k, 100, 66, 50);
    }
  },

  // Le zellige : la mosaïque marocaine — étoiles bleues, blanches et vertes
  // taillées au petit fer. On pose le motif en losanges imbriqués.
  [ARCHI_TILE.ZELLIGE](ctx, ox, oy) {
    const rng = mulberry32(7015);
    noisyFill(ctx, ox, oy, [238, 234, 222], 4, rng);
    const teintes = [[38, 84, 148], [58, 128, 108], [222, 216, 202], [180, 140, 58]];
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const u = (x + y) & 7, v = (x - y + 16) & 7;
        if (u < 2 && v < 2) px(ctx, ox, oy, x, y, ...teintes[0]);
        else if (u >= 4 && u < 6 && v >= 4 && v < 6) px(ctx, ox, oy, x, y, ...teintes[1]);
        else if ((u === 3 || v === 3) && ((x ^ y) & 1)) px(ctx, ox, oy, x, y, ...teintes[3]);
      }
    }
  },

  // Le vitrail : des losanges de verre coloré sertis de plomb sombre. Vu du
  // dehors il est profond, vu du dedans il s'allume — ici, la mosaïque suffit.
  [ARCHI_TILE.VITRAIL](ctx, ox, oy) {
    const rng = mulberry32(7016);
    const teintes = [[172, 40, 52], [40, 78, 156], [196, 160, 48], [52, 122, 74], [124, 52, 132]];
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const cel = ((x >> 2) * 5 + (y >> 2) * 3) % teintes.length;
        const t = teintes[cel];
        const plomb = (x & 3) === 0 || (y & 3) === 0;
        if (plomb) px(ctx, ox, oy, x, y, 44, 42, 46);
        else px(ctx, ox, oy, x, y, t[0] + ((rng() * 22) | 0), t[1] + ((rng() * 22) | 0), t[2] + ((rng() * 22) | 0));
      }
    }
  },

  // Le shoji : le panneau coulissant japonais — papier lumineux sur son
  // treillis de bois clair, trois travées par vantail.
  [ARCHI_TILE.SHOJI](ctx, ox, oy) {
    const rng = mulberry32(7017);
    noisyFill(ctx, ox, oy, [240, 236, 222], 3, rng);
    const bois = [136, 104, 66];
    for (const x of [0, 5, 10, 15]) for (let y = 0; y < TILE_PX; y++) px(ctx, ox, oy, x, y, ...bois);
    for (const y of [0, 5, 10, 15]) for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, ...bois);
  },

  // La tuile grise d'Asie : les rangs ronds qui se recouvrent, l'ombre sous
  // chaque rang — le toit de Kyoto et de Séoul.
  [ARCHI_TILE.TUILE_GRISE](ctx, ox, oy) {
    const rng = mulberry32(7018);
    noisyFill(ctx, ox, oy, [124, 128, 134], 7, rng);
    for (let y = 0; y < TILE_PX; y += 4) {
      for (let x = 0; x < TILE_PX; x++) {
        px(ctx, ox, oy, x, y, 88, 92, 98);
        const bombe = 2 - Math.abs(((x + (y & 4 ? 4 : 0)) % 8) - 4) / 2;
        if (bombe > 1 && y + 2 < TILE_PX) px(ctx, ox, oy, x, y + 2, 152, 156, 162);
      }
    }
  },
};

const painters = {
  ...peintresArchi,

  // --- Villandry ----------------------------------------------------------
  // Le tuffeau : un calcaire blanc crème, très clair, à peine grenu. C'est lui
  // qui donne aux châteaux de la Loire leur lumière particulière.
  [VILLANDRY_TILE.TUFFEAU](ctx, ox, oy) {
    const rng = mulberry32(6001);
    noisyFill(ctx, ox, oy, [230, 224, 206], 7, rng);
    for (let i = 0; i < 14; i++) {
      const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
      px(ctx, ox, oy, x, y, 216, 209, 190);
    }
  },

  // Pierre de taille : le même calcaire, mais appareillé — les joints fins des
  // chaînages d'angle et des encadrements de fenêtres.
  [VILLANDRY_TILE.TUFFEAU_TAILLE](ctx, ox, oy) {
    const rng = mulberry32(6002);
    noisyFill(ctx, ox, oy, [226, 219, 200], 6, rng);
    for (let x = 0; x < TILE_PX; x++) {
      px(ctx, ox, oy, x, 0, 198, 190, 172);
      px(ctx, ox, oy, x, 8, 198, 190, 172);
    }
    for (let y = 1; y < 8; y++) px(ctx, ox, oy, 7, y, 198, 190, 172);
    for (let y = 9; y < TILE_PX; y++) px(ctx, ox, oy, 14, y, 198, 190, 172);
  },

  // L'ardoise d'Anjou : bleu-gris sombre, posée en écailles régulières.
  [VILLANDRY_TILE.ARDOISE](ctx, ox, oy) {
    const rng = mulberry32(6003);
    noisyFill(ctx, ox, oy, [76, 86, 102], 9, rng);
    for (let rangee = 0; rangee < 4; rangee++) {
      const y = rangee * 4;
      const decal = (rangee % 2) * 4;
      for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, 58, 66, 80);
      for (let k = 0; k < 2; k++) {
        const cx = (decal + k * 8) % TILE_PX;
        for (let dy = 1; dy < 4; dy++) px(ctx, ox, oy, cx, y + dy, 58, 66, 80);
      }
    }
  },

  // Le buis taillé : un vert sombre et dense, sans éclat, qui dessine les
  // parterres. C'est presque une matière de maçonnerie, pas de feuillage.
  [VILLANDRY_TILE.BUIS](ctx, ox, oy) {
    const rng = mulberry32(6004);
    noisyFill(ctx, ox, oy, [46, 86, 44], 12, rng);
    for (let i = 0; i < 30; i++) {
      const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
      const clair = rng() < 0.5;
      px(ctx, ox, oy, x, y, clair ? 62 : 34, clair ? 106 : 66, clair ? 56 : 32);
    }
  },

  // Les allées : un gravier beige clair, ratissé, qui fait ressortir le buis.
  [VILLANDRY_TILE.ALLEE](ctx, ox, oy) {
    const rng = mulberry32(6005);
    noisyFill(ctx, ox, oy, [208, 196, 168], 10, rng);
    for (let i = 0; i < 26; i++) {
      const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
      px(ctx, ox, oy, x, y, 186, 174, 148);
    }
  },

  // --- Mars ---------------------------------------------------------------
  // Régolithe : une poussière rouille très fine, semée de petits cailloux plus
  // sombres. C'est la couleur qui doit porter le dépaysement, pas le motif.
  [TILE.MARS_SOL](ctx, ox, oy) {
    const rng = mulberry32(4501);
    noisyFill(ctx, ox, oy, [176, 96, 62], 13, rng);
    for (let i = 0; i < 22; i++) {
      const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
      const d = -28 - rng() * 22;
      px(ctx, ox, oy, x, y, 176 + d, 96 + d * 0.7, 62 + d * 0.5);
    }
  },

  // Roche martienne : basalte rouge sombre, veiné d'oxyde plus clair.
  [TILE.MARS_ROCHE](ctx, ox, oy) {
    const rng = mulberry32(4502);
    noisyFill(ctx, ox, oy, [116, 62, 48], 12, rng);
    for (let i = 0; i < 5; i++) {
      let x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
      for (let k = 0; k < 7; k++) {
        px(ctx, ox, oy, (x + TILE_PX) % TILE_PX, (y + TILE_PX) % TILE_PX, 156, 92, 66);
        x += (rng() * 3 | 0) - 1; y += (rng() * 3 | 0) - 1;
      }
    }
  },

  [TILE.GRASS_TOP](ctx, ox, oy) {
    const rng = mulberry32(101);
    noisyFill(ctx, ox, oy, [104, 168, 62], 14, rng);
  },

  [TILE.GRASS_SIDE](ctx, ox, oy) {
    const rng = mulberry32(102);
    noisyFill(ctx, ox, oy, [134, 96, 67], 14, rng);
    for (let x = 0; x < TILE_PX; x++) {
      const depth = 2 + Math.floor(rng() * 3);
      for (let y = 0; y < depth; y++) {
        const d = (rng() * 2 - 1) * 14;
        px(ctx, ox, oy, x, y, 104 + d, 168 + d, 62 + d);
      }
    }
  },

  [TILE.DIRT](ctx, ox, oy) {
    const rng = mulberry32(103);
    noisyFill(ctx, ox, oy, [134, 96, 67], 16, rng);
  },

  [TILE.STONE](ctx, ox, oy) {
    const rng = mulberry32(104);
    noisyFill(ctx, ox, oy, [127, 127, 127], 11, rng);
    for (let i = 0; i < 10; i++) {
      const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
      px(ctx, ox, oy, x, y, 105, 105, 105);
    }
  },

  [TILE.SAND](ctx, ox, oy) {
    const rng = mulberry32(105);
    noisyFill(ctx, ox, oy, [219, 207, 163], 11, rng);
  },

  [TILE.LOG_SIDE](ctx, ox, oy) {
    const rng = mulberry32(106);
    for (let x = 0; x < TILE_PX; x++) {
      const streak = (rng() * 2 - 1) * 16;
      for (let y = 0; y < TILE_PX; y++) {
        const d = (rng() * 2 - 1) * 8 + streak;
        px(ctx, ox, oy, x, y, 103 + d, 82 + d, 49 + d);
      }
    }
  },

  [TILE.LOG_TOP](ctx, ox, oy) {
    const rng = mulberry32(107);
    noisyFill(ctx, ox, oy, [151, 122, 73], 8, rng);
    for (let ring = 1; ring <= 7; ring += 2) {
      for (let x = ring; x < TILE_PX - ring; x++) {
        px(ctx, ox, oy, x, ring, 120, 95, 55);
        px(ctx, ox, oy, x, TILE_PX - 1 - ring, 120, 95, 55);
      }
      for (let y = ring; y < TILE_PX - ring; y++) {
        px(ctx, ox, oy, ring, y, 120, 95, 55);
        px(ctx, ox, oy, TILE_PX - 1 - ring, y, 120, 95, 55);
      }
    }
  },

  [TILE.LEAVES](ctx, ox, oy) {
    const rng = mulberry32(108);
    noisyFill(ctx, ox, oy, [54, 116, 38], 20, rng);
    for (let i = 0; i < 22; i++) {
      const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
      px(ctx, ox, oy, x, y, 34, 84, 24);
    }
  },

  [TILE.WATER](ctx, ox, oy) {
    const rng = mulberry32(109);
    noisyFill(ctx, ox, oy, [55, 96, 200], 12, rng);
    for (let i = 0; i < 8; i++) {
      const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
      px(ctx, ox, oy, x, y, 90, 135, 225);
    }
  },

  [TILE.PLANK](ctx, ox, oy) {
    const rng = mulberry32(110);
    noisyFill(ctx, ox, oy, [162, 130, 78], 9, rng);
    for (let y = 3; y < TILE_PX; y += 4) {
      for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, 120, 94, 54);
    }
    px(ctx, ox, oy, 4, 0, 120, 94, 54); px(ctx, ox, oy, 4, 1, 120, 94, 54);
    px(ctx, ox, oy, 12, 5, 120, 94, 54); px(ctx, ox, oy, 12, 6, 120, 94, 54);
    px(ctx, ox, oy, 7, 9, 120, 94, 54); px(ctx, ox, oy, 7, 10, 120, 94, 54);
  },

  [TILE.COBBLE](ctx, ox, oy) {
    const rng = mulberry32(111);
    noisyFill(ctx, ox, oy, [120, 120, 120], 14, rng);
    for (let i = 0; i < 14; i++) {
      const x = (rng() * (TILE_PX - 3)) | 0, y = (rng() * (TILE_PX - 3)) | 0;
      const shade = rng() > 0.5 ? 145 : 95;
      const w = 2 + ((rng() * 2) | 0), h = 2 + ((rng() * 2) | 0);
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
        const d = (rng() * 2 - 1) * 8;
        px(ctx, ox, oy, x + dx, y + dy, shade + d, shade + d, shade + d);
      }
    }
  },

  [TILE.GLASS](ctx, ox, oy) {
    ctx.clearRect(ox, oy, TILE_PX, TILE_PX);
    for (let i = 0; i < TILE_PX; i++) {
      px(ctx, ox, oy, i, 0, 210, 235, 245); px(ctx, ox, oy, i, TILE_PX - 1, 210, 235, 245);
      px(ctx, ox, oy, 0, i, 210, 235, 245); px(ctx, ox, oy, TILE_PX - 1, i, 210, 235, 245);
    }
    for (let i = 2; i < 7; i++) px(ctx, ox, oy, i, 9 - i, 235, 250, 255);
    for (let i = 4; i < 12; i++) px(ctx, ox, oy, i, 16 - i, 225, 245, 252);
  },

  [TILE.BRICK](ctx, ox, oy) {
    const rng = mulberry32(113);
    noisyFill(ctx, ox, oy, [148, 68, 58], 10, rng);
    for (let y = 0; y < TILE_PX; y += 4) {
      for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, 182, 172, 165);
      const off = (y / 4) % 2 === 0 ? 0 : 4;
      for (let x = off; x < TILE_PX; x += 8) {
        for (let dy = 0; dy < 4; dy++) px(ctx, ox, oy, x, y + dy, 182, 172, 165);
      }
    }
  },

  [TILE.SNOW](ctx, ox, oy) {
    const rng = mulberry32(114);
    noisyFill(ctx, ox, oy, [242, 250, 250], 6, rng);
  },

  [TILE.SANDSTONE](ctx, ox, oy) {
    const rng = mulberry32(115);
    noisyFill(ctx, ox, oy, [216, 200, 155], 8, rng);
    for (const y of [0, 5, 10, 15]) {
      for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, 196, 178, 130);
    }
  },

  [TILE.GRAVEL](ctx, ox, oy) {
    const rng = mulberry32(116);
    noisyFill(ctx, ox, oy, [136, 130, 126], 20, rng);
    for (let i = 0; i < 18; i++) {
      const x = (rng() * (TILE_PX - 2)) | 0, y = (rng() * (TILE_PX - 2)) | 0;
      const shade = rng() > 0.5 ? 165 : 100;
      px(ctx, ox, oy, x, y, shade, shade - 4, shade - 6);
      px(ctx, ox, oy, x + 1, y, shade - 10, shade - 12, shade - 14);
    }
  },

  [TILE.MOSSY](ctx, ox, oy) {
    const rng = mulberry32(117);
    noisyFill(ctx, ox, oy, [120, 120, 120], 14, rng);
    for (let i = 0; i < 26; i++) {
      const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
      const d = (rng() * 2 - 1) * 12;
      px(ctx, ox, oy, x, y, 78 + d, 122 + d, 62 + d);
      if (rng() > 0.5) px(ctx, ox, oy, (x + 1) % TILE_PX, y, 78 + d, 122 + d, 62 + d);
    }
  },

  [TILE.BIRCH](ctx, ox, oy) {
    const rng = mulberry32(118);
    noisyFill(ctx, ox, oy, [214, 200, 165], 8, rng);
    for (let y = 3; y < TILE_PX; y += 4) {
      for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, 178, 162, 124);
    }
    px(ctx, ox, oy, 5, 1, 178, 162, 124); px(ctx, ox, oy, 11, 6, 178, 162, 124);
  },

  [TILE.DARKPLANK](ctx, ox, oy) {
    const rng = mulberry32(119);
    noisyFill(ctx, ox, oy, [92, 66, 42], 9, rng);
    for (let y = 3; y < TILE_PX; y += 4) {
      for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, 62, 42, 26);
    }
    px(ctx, ox, oy, 4, 1, 62, 42, 26); px(ctx, ox, oy, 12, 9, 62, 42, 26);
  },

  [TILE.ICE](ctx, ox, oy) {
    const rng = mulberry32(120);
    noisyFill(ctx, ox, oy, [160, 210, 240], 10, rng);
    for (let i = 2; i < 9; i++) px(ctx, ox, oy, i, 12 - i, 220, 240, 252);
    for (let i = 7; i < 14; i++) px(ctx, ox, oy, i, 20 - i, 205, 232, 248);
  },

  [TILE.GOLD](ctx, ox, oy) {
    const rng = mulberry32(121);
    noisyFill(ctx, ox, oy, [238, 202, 66], 8, rng);
    for (let i = 0; i < TILE_PX; i++) {
      px(ctx, ox, oy, i, 0, 255, 232, 130); px(ctx, ox, oy, 0, i, 255, 232, 130);
      px(ctx, ox, oy, i, TILE_PX - 1, 190, 150, 40); px(ctx, ox, oy, TILE_PX - 1, i, 190, 150, 40);
    }
    px(ctx, ox, oy, 4, 4, 255, 245, 180); px(ctx, ox, oy, 11, 9, 255, 245, 180);
  },

  [TILE.DIAMOND](ctx, ox, oy) {
    const rng = mulberry32(122);
    noisyFill(ctx, ox, oy, [96, 219, 213], 10, rng);
    for (let i = 0; i < TILE_PX; i++) {
      px(ctx, ox, oy, i, 0, 170, 245, 240); px(ctx, ox, oy, 0, i, 170, 245, 240);
      px(ctx, ox, oy, i, TILE_PX - 1, 55, 160, 155); px(ctx, ox, oy, TILE_PX - 1, i, 55, 160, 155);
    }
    px(ctx, ox, oy, 5, 5, 220, 255, 252); px(ctx, ox, oy, 10, 10, 220, 255, 252);
  },

  [TILE.OBSIDIAN](ctx, ox, oy) {
    const rng = mulberry32(123);
    noisyFill(ctx, ox, oy, [28, 22, 44], 8, rng);
    for (let i = 0; i < 8; i++) {
      const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
      px(ctx, ox, oy, x, y, 74, 50, 110);
    }
  },

  [TILE.BOOKSHELF](ctx, ox, oy) {
    const rng = mulberry32(124);
    noisyFill(ctx, ox, oy, [162, 130, 78], 8, rng);
    const bookColors = [[190, 60, 50], [60, 100, 180], [70, 150, 70], [200, 170, 60], [140, 80, 160]];
    for (const rowY of [2, 9]) {
      let x = 1;
      while (x < TILE_PX - 1) {
        const w = 1 + ((rng() * 2) | 0);
        const [r, g, b] = bookColors[(rng() * bookColors.length) | 0];
        for (let dx = 0; dx < w && x + dx < TILE_PX - 1; dx++) {
          for (let dy = 0; dy < 5; dy++) px(ctx, ox, oy, x + dx, rowY + dy, r, g, b);
        }
        x += w;
      }
    }
  },
};

// Brick-style tiles share one painter: base color + mortar grid pattern.
const BRICK_STYLES = {
  [TILE.STONEBRICK]: { base: [130, 130, 132], mortar: [95, 95, 98], seed: 140, big: true },
  [TILE.DARKBRICK]: { base: [92, 42, 40], mortar: [60, 46, 44], seed: 141, big: false },
  [TILE.WHITEBRICK]: { base: [232, 230, 222], mortar: [196, 192, 182], seed: 142, big: true },
  [TILE.TERRACOTTA]: { base: [190, 108, 62], mortar: [150, 82, 48], seed: 143, big: false },
  [TILE.BLUEBRICK]: { base: [66, 96, 160], mortar: [44, 64, 112], seed: 144, big: false },
};
for (const [tile, style] of Object.entries(BRICK_STYLES)) {
  painters[tile] = (ctx, ox, oy) => {
    const rng = mulberry32(style.seed);
    noisyFill(ctx, ox, oy, style.base, 9, rng);
    const rowH = style.big ? 8 : 4;
    const brickW = style.big ? 8 : 8;
    for (let y = 0; y < TILE_PX; y += rowH) {
      for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, ...style.mortar);
      const off = (y / rowH) % 2 === 0 ? 0 : brickW / 2;
      for (let x = off; x < TILE_PX; x += brickW) {
        for (let dy = 0; dy < rowH; dy++) px(ctx, ox, oy, x, y + dy, ...style.mortar);
      }
    }
  };
}

// City material tiles (Paris / New York / San Francisco districts).
const CT = CITY_TILE_START;

painters[CT + 0] = (ctx, ox, oy) => { // pierre haussmannienne: creamy carved limestone
  const rng = mulberry32(160);
  noisyFill(ctx, ox, oy, [229, 219, 194], 6, rng);
  for (const y of [0, 5, 10, 15]) {
    for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, 204, 192, 162);
  }
  for (const [jx, jy] of [[5, 1], [12, 6], [3, 11]]) {
    for (let dy = 0; dy < 4; dy++) px(ctx, ox, oy, jx, jy + dy, 208, 197, 168);
  }
};

painters[CT + 1] = (ctx, ox, oy) => { // toit de zinc: blue-grey standing seams
  const rng = mulberry32(161);
  noisyFill(ctx, ox, oy, [112, 122, 136], 7, rng);
  for (let x = 2; x < TILE_PX; x += 5) {
    for (let y = 0; y < TILE_PX; y++) px(ctx, ox, oy, x, y, 90, 99, 112);
  }
  for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, 0, 134, 144, 158);
};

painters[CT + 2] = (ctx, ox, oy) => { // asphalte
  // Gris moyen, pas charbon : l'ancien [57,58,62] rendait les rues noires
  // comme des gouffres — le vrai bitume au soleil est bien plus clair.
  const rng = mulberry32(162);
  noisyFill(ctx, ox, oy, [96, 97, 101], 7, rng);
  for (let i = 0; i < 14; i++) {
    const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
    const s = rng() > 0.5 ? 116 : 80;
    px(ctx, ox, oy, x, y, s, s, s + 2);
  }
};

painters[CT + 3] = (ctx, ox, oy) => { // route marquée: asphalt + yellow dashes
  painters[CT + 2](ctx, ox, oy);
  for (const y0 of [1, 9]) {
    for (let y = y0; y < y0 + 5; y++) {
      px(ctx, ox, oy, 7, y, 230, 190, 60);
      px(ctx, ox, oy, 8, y, 230, 190, 60);
    }
  }
};

painters[CT + 4] = (ctx, ox, oy) => { // trottoir: light concrete slabs
  const rng = mulberry32(164);
  noisyFill(ctx, ox, oy, [178, 178, 172], 6, rng);
  for (const c of [0, 8]) {
    for (let i = 0; i < TILE_PX; i++) {
      px(ctx, ox, oy, i, c, 152, 152, 146);
      px(ctx, ox, oy, c, i, 152, 152, 146);
    }
  }
};

painters[CT + 5] = (ctx, ox, oy) => { // brownstone: NY red-brown with lintels
  const rng = mulberry32(165);
  noisyFill(ctx, ox, oy, [126, 76, 56], 8, rng);
  for (let y = 0; y < TILE_PX; y += 4) {
    for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, 98, 58, 42);
    const off = (y / 4) % 2 === 0 ? 0 : 4;
    for (let x = off; x < TILE_PX; x += 8) {
      for (let dy = 0; dy < 4; dy++) px(ctx, ox, oy, x, y + dy, 98, 58, 42);
    }
  }
};

painters[CT + 6] = (ctx, ox, oy) => { // granit: pale speckled stone
  const rng = mulberry32(166);
  noisyFill(ctx, ox, oy, [168, 166, 160], 7, rng);
  for (let i = 0; i < 20; i++) {
    const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
    const s = rng() > 0.5 ? 190 : 138;
    px(ctx, ox, oy, x, y, s, s - 2, s - 4);
  }
  for (const y of [0, 8]) {
    for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, 140, 138, 132);
  }
};

painters[CT + 7] = (ctx, ox, oy) => { // mur de verre bleu: curtain-wall grid
  const rng = mulberry32(167);
  noisyFill(ctx, ox, oy, [78, 118, 164], 8, rng);
  for (let i = 2; i < 8; i++) px(ctx, ox, oy, i, 9 - i, 150, 190, 225);
  for (let i = 6; i < 13; i++) px(ctx, ox, oy, i, 19 - i, 120, 160, 205);
  for (let c = 0; c < TILE_PX; c += 4) {
    for (let i = 0; i < TILE_PX; i++) {
      px(ctx, ox, oy, i, c, 46, 66, 96);
      px(ctx, ox, oy, c, i, 46, 66, 96);
    }
  }
};

painters[CT + 8] = (ctx, ox, oy) => { // cuivre patiné: Lady-Liberty green
  const rng = mulberry32(168);
  noisyFill(ctx, ox, oy, [98, 168, 142], 10, rng);
  for (let i = 0; i < 10; i++) {
    const x = (rng() * TILE_PX) | 0, y = (rng() * TILE_PX) | 0;
    px(ctx, ox, oy, x, y, 76, 140, 118);
  }
};

painters[CT + 9] = (ctx, ox, oy) => { // passage piéton: zebra stripes on asphalt
  painters[CT + 2](ctx, ox, oy);
  for (let y0 = 1; y0 < TILE_PX; y0 += 4) {
    for (let y = y0; y < y0 + 2; y++) {
      for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, 225, 225, 222);
    }
  }
};

// Les marquages orientés du réalisme v2 (villes générées) : blancs, fins, et
// dans l'axe. Sur une face du dessus, texture-x suit le monde-x et texture-y
// le monde-z (mesher.js) — d'où une tuile par orientation, elles ne tournent pas.
const RT = ROUTE_TILE_START;
painters[RT] = (ctx, ox, oy) => { // ligne axiale N-S : tirets le long de z
  painters[CT + 2](ctx, ox, oy);
  for (const y0 of [1, 9]) {
    for (let y = y0; y < y0 + 5; y++) {
      px(ctx, ox, oy, 7, y, 232, 232, 228);
      px(ctx, ox, oy, 8, y, 232, 232, 228);
    }
  }
};
painters[RT + 1] = (ctx, ox, oy) => { // ligne axiale E-O : les mêmes, le long de x
  painters[CT + 2](ctx, ox, oy);
  for (const x0 of [1, 9]) {
    for (let x = x0; x < x0 + 5; x++) {
      px(ctx, ox, oy, x, 7, 232, 232, 228);
      px(ctx, ox, oy, x, 8, 232, 232, 228);
    }
  }
};
painters[RT + 2] = (ctx, ox, oy) => { // passage piéton N-S : bandes le long de z
  painters[CT + 2](ctx, ox, oy);
  for (let x0 = 1; x0 < TILE_PX; x0 += 4) {
    for (let x = x0; x < x0 + 2; x++) {
      for (let y = 0; y < TILE_PX; y++) px(ctx, ox, oy, x, y, 225, 225, 222);
    }
  }
};

const WOOL_COLORS = {
  [TILE.WOOL_RED]: [200, 62, 56],
  [TILE.WOOL_BLUE]: [64, 100, 190],
  [TILE.WOOL_YELLOW]: [228, 200, 60],
  [TILE.WOOL_GREEN]: [88, 160, 70],
  [TILE.WOOL_PURPLE]: [140, 84, 190],
  [TILE.WOOL_BLACK]: [42, 42, 46],
};
for (const [tile, base] of Object.entries(WOOL_COLORS)) {
  painters[tile] = (ctx, ox, oy) => {
    const rng = mulberry32(130 + Number(tile));
    noisyFill(ctx, ox, oy, base, 9, rng);
  };
}

// Decor patterns: painted from a base color and a darker accent.
const DECOR_PAINTERS = {
  Uni(ctx, ox, oy, base, dark, rng) {
    noisyFill(ctx, ox, oy, base, 8, rng);
  },
  Briques(ctx, ox, oy, base, dark, rng) {
    noisyFill(ctx, ox, oy, base, 8, rng);
    for (let y = 0; y < TILE_PX; y += 4) {
      for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, ...dark);
      const off = (y / 4) % 2 === 0 ? 0 : 4;
      for (let x = off; x < TILE_PX; x += 8) {
        for (let dy = 0; dy < 4; dy++) px(ctx, ox, oy, x, y + dy, ...dark);
      }
    }
  },
  Planches(ctx, ox, oy, base, dark, rng) {
    noisyFill(ctx, ox, oy, base, 7, rng);
    for (let y = 3; y < TILE_PX; y += 4) {
      for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, ...dark);
    }
    px(ctx, ox, oy, 4, 1, ...dark); px(ctx, ox, oy, 11, 6, ...dark); px(ctx, ox, oy, 7, 13, ...dark);
  },
  Damier(ctx, ox, oy, base, dark, rng) {
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const alt = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 1;
        const d = (rng() * 2 - 1) * 6;
        const c = alt ? dark : base;
        px(ctx, ox, oy, x, y, c[0] + d, c[1] + d, c[2] + d);
      }
    }
  },
  Pois(ctx, ox, oy, base, dark, rng) {
    noisyFill(ctx, ox, oy, base, 6, rng);
    for (let cy = 2; cy < TILE_PX; cy += 6) {
      for (let cx = 2 + ((cy / 6) % 2) * 3; cx < TILE_PX - 1; cx += 6) {
        px(ctx, ox, oy, cx, cy, ...dark); px(ctx, ox, oy, cx + 1, cy, ...dark);
        px(ctx, ox, oy, cx, cy + 1, ...dark); px(ctx, ox, oy, cx + 1, cy + 1, ...dark);
      }
    }
  },
  Rayures(ctx, ox, oy, base, dark, rng) {
    for (let y = 0; y < TILE_PX; y++) {
      const c = Math.floor(y / 4) % 2 === 0 ? base : dark;
      for (let x = 0; x < TILE_PX; x++) {
        const d = (rng() * 2 - 1) * 6;
        px(ctx, ox, oy, x, y, c[0] + d, c[1] + d, c[2] + d);
      }
    }
  },
  Lignes(ctx, ox, oy, base, dark, rng) {
    for (let x = 0; x < TILE_PX; x++) {
      const c = Math.floor(x / 4) % 2 === 0 ? base : dark;
      for (let y = 0; y < TILE_PX; y++) {
        const d = (rng() * 2 - 1) * 6;
        px(ctx, ox, oy, x, y, c[0] + d, c[1] + d, c[2] + d);
      }
    }
  },
  Zigzag(ctx, ox, oy, base, dark, rng) {
    noisyFill(ctx, ox, oy, base, 6, rng);
    for (let x = 0; x < TILE_PX; x++) {
      const period = x % 8;
      const zig = period < 4 ? period : 8 - period;
      for (const row of [2, 10]) {
        px(ctx, ox, oy, x, row + zig, ...dark);
        px(ctx, ox, oy, x, row + zig + 1, ...dark);
      }
    }
  },
  Cadre(ctx, ox, oy, base, dark, rng) {
    noisyFill(ctx, ox, oy, base, 6, rng);
    for (let i = 0; i < TILE_PX; i++) {
      for (const b of [0, 1, TILE_PX - 2, TILE_PX - 1]) {
        px(ctx, ox, oy, i, b, ...dark);
        px(ctx, ox, oy, b, i, ...dark);
      }
    }
  },
  Losange(ctx, ox, oy, base, dark, rng) {
    noisyFill(ctx, ox, oy, base, 6, rng);
    const c = TILE_PX / 2;
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const d = Math.abs(x - c + 0.5) + Math.abs(y - c + 0.5);
        if (d > 5.5 && d < 7.5) px(ctx, ox, oy, x, y, ...dark);
      }
    }
  },
};

export function createAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE_PX;
  canvas.height = ATLAS_ROWS * TILE_PX;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#7f7f7f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const [tile, paint] of Object.entries(painters)) {
    const i = Number(tile);
    const ox = (i % ATLAS_COLS) * TILE_PX;
    const oy = Math.floor(i / ATLAS_COLS) * TILE_PX;
    paint(ctx, ox, oy);
  }

  // decor tiles: pattern painter + color pair, deterministic per tile
  for (const item of DECOR_ITEMS) {
    const ox = (item.tile % ATLAS_COLS) * TILE_PX;
    const oy = Math.floor(item.tile / ATLAS_COLS) * TILE_PX;
    const dark = item.rgb.map((v) => Math.max(0, Math.round(v * 0.62)));
    const rng = mulberry32(5000 + item.tile);
    DECOR_PAINTERS[item.pattern](ctx, ox, oy, item.rgb, dark, rng);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, canvas };
}

// UV rectangle of a tile: [u0, v0, u1, v1] (v flipped, canvas row 0 = top).
// Inset by half a texel so nearest-neighbour sampling never bleeds into
// the adjacent tile at face edges.
export function tileUV(tile) {
  const col = tile % ATLAS_COLS;
  const row = Math.floor(tile / ATLAS_COLS);
  const iu = 0.5 / (ATLAS_COLS * TILE_PX);
  const iv = 0.5 / (ATLAS_ROWS * TILE_PX);
  const u0 = col / ATLAS_COLS + iu;
  const u1 = (col + 1) / ATLAS_COLS - iu;
  const v1 = 1 - row / ATLAS_ROWS - iv;
  const v0 = 1 - (row + 1) / ATLAS_ROWS + iv;
  return [u0, v0, u1, v1];
}

// Même rectangle que tileUV, exprimé en origine + taille : c'est la forme dont
// le shader a besoin pour ramener un UV fusionné dans sa tuile. On garde la
// marge d'un demi-texel, ce qui donne exactement le même rendu qu'avant sur
// une face isolée — et comme fract() reste strictement inférieur à 1, une face
// fusionnée ne peut pas déborder sur la tuile voisine non plus.
export function tileRect(tile) {
  const [u0, v0, u1, v1] = tileUV(tile);
  return [u0, v0, u1 - u0, v1 - v0];
}

// Une face fusionnée couvre plusieurs blocs : ses UV vont de 0 à la largeur du
// rectangle, et c'est le shader qui les ramène dans la tuile. Sans cela, un
// atlas interdit purement et simplement la répétition.
//
// `onde` ajoute au passage le clapot de la surface de l'eau — les deux
// modifications partagent le même point d'accroche, qui est unique par matériau.
export function activerTuilage(material, { onde = false } = {}) {
  if (onde) material.userData.temps = { value: 0 };
  material.onBeforeCompile = (shader) => {
    if (onde) shader.uniforms.temps = material.userData.temps;
    // `highp` explicite : une face fusionnée porte des UV allant jusqu'à 16, et
    // en mediump — la précision par défaut des varyings sur plusieurs GPU
    // mobiles — la partie fractionnaire n'aurait plus qu'un quart de texel de
    // résolution, ce qui ferait onduler la texture au loin sur l'iPad.
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 tuile;
        varying vec4 vTuile;
        varying highp vec2 vUvTuile;
        ${onde ? 'uniform float temps;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vTuile = tuile;
        vUvTuile = uv;
        ${onde ? `
        // seule la surface bouge : les faces immergées restent en place
        if (normal.y > 0.5) {
          float houle = sin(position.x * 0.9 + temps * 1.7) * 0.5
                      + sin(position.z * 1.3 + temps * 2.3) * 0.5;
          transformed.y += houle * 0.055;
        }` : ''}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec4 vTuile;
        varying highp vec2 vUvTuile;`)
      .replace('#include <map_fragment>', `
        diffuseColor *= texture2D(map, vTuile.xy + fract(vUvTuile) * vTuile.zw);`);
  };
  material.needsUpdate = true;
}

export { TILE_PX };
