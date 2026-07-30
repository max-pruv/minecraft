// Procedurally generated 16x16 pixel-art texture atlas — no image assets needed.

import * as THREE from 'three';
import { TILE } from './blocks.js';

const TILE_PX = 16;
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 4;

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

const painters = {
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

export { TILE_PX };
