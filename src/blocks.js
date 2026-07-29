// Block ids and per-block metadata (texture tiles, transparency, solidity).

export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  LOG: 5,
  LEAVES: 6,
  WATER: 7,
  PLANK: 8,
  COBBLE: 9,
  GLASS: 10,
  BRICK: 11,
  SNOW: 12,
};

// Tile indices into the texture atlas (see textures.js).
export const TILE = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  LOG_SIDE: 5,
  LOG_TOP: 6,
  LEAVES: 7,
  WATER: 8,
  PLANK: 9,
  COBBLE: 10,
  GLASS: 11,
  BRICK: 12,
  SNOW: 13,
};

// tiles: [top, side, bottom]
export const BLOCK_INFO = {
  [BLOCK.GRASS]:  { name: 'Grass',       tiles: [TILE.GRASS_TOP, TILE.GRASS_SIDE, TILE.DIRT], solid: true,  transparent: false },
  [BLOCK.DIRT]:   { name: 'Dirt',        tiles: [TILE.DIRT, TILE.DIRT, TILE.DIRT],            solid: true,  transparent: false },
  [BLOCK.STONE]:  { name: 'Stone',       tiles: [TILE.STONE, TILE.STONE, TILE.STONE],         solid: true,  transparent: false },
  [BLOCK.SAND]:   { name: 'Sand',        tiles: [TILE.SAND, TILE.SAND, TILE.SAND],            solid: true,  transparent: false },
  [BLOCK.LOG]:    { name: 'Oak Log',     tiles: [TILE.LOG_TOP, TILE.LOG_SIDE, TILE.LOG_TOP],  solid: true,  transparent: false },
  [BLOCK.LEAVES]: { name: 'Leaves',      tiles: [TILE.LEAVES, TILE.LEAVES, TILE.LEAVES],      solid: true,  transparent: false },
  [BLOCK.WATER]:  { name: 'Water',       tiles: [TILE.WATER, TILE.WATER, TILE.WATER],         solid: false, transparent: true },
  [BLOCK.PLANK]:  { name: 'Oak Planks',  tiles: [TILE.PLANK, TILE.PLANK, TILE.PLANK],         solid: true,  transparent: false },
  [BLOCK.COBBLE]: { name: 'Cobblestone', tiles: [TILE.COBBLE, TILE.COBBLE, TILE.COBBLE],      solid: true,  transparent: false },
  [BLOCK.GLASS]:  { name: 'Glass',       tiles: [TILE.GLASS, TILE.GLASS, TILE.GLASS],         solid: true,  transparent: true },
  [BLOCK.BRICK]:  { name: 'Bricks',      tiles: [TILE.BRICK, TILE.BRICK, TILE.BRICK],         solid: true,  transparent: false },
  [BLOCK.SNOW]:   { name: 'Snow',        tiles: [TILE.SNOW, TILE.SNOW, TILE.SNOW],            solid: true,  transparent: false },
};

export function isSolid(id) {
  return id !== BLOCK.AIR && id !== BLOCK.WATER;
}

export function isTransparent(id) {
  return id === BLOCK.AIR || id === BLOCK.WATER || id === BLOCK.GLASS;
}

// Blocks the player can select in the hotbar.
export const HOTBAR_BLOCKS = [
  BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.COBBLE, BLOCK.PLANK,
  BLOCK.LOG, BLOCK.LEAVES, BLOCK.GLASS, BLOCK.BRICK,
];
