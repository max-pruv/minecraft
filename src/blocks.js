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
  SANDSTONE: 13,
  GRAVEL: 14,
  MOSSY: 15,
  BIRCH: 16,
  DARKPLANK: 17,
  ICE: 18,
  GOLD: 19,
  DIAMOND: 20,
  OBSIDIAN: 21,
  BOOKSHELF: 22,
  WOOL_RED: 23,
  WOOL_BLUE: 24,
  WOOL_YELLOW: 25,
  WOOL_GREEN: 26,
  WOOL_PURPLE: 27,
  WOOL_BLACK: 28,
  SLAB_STONE: 29,
  SLAB_PLANK: 30,
  SLAB_COBBLE: 31,
  SLAB_BRICK: 32,
  STONEBRICK: 33,
  DARKBRICK: 34,
  WHITEBRICK: 35,
  TERRACOTTA: 36,
  BLUEBRICK: 37,
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
  SANDSTONE: 14,
  GRAVEL: 15,
  MOSSY: 16,
  BIRCH: 17,
  DARKPLANK: 18,
  ICE: 19,
  GOLD: 20,
  DIAMOND: 21,
  OBSIDIAN: 22,
  BOOKSHELF: 23,
  WOOL_RED: 24,
  WOOL_BLUE: 25,
  WOOL_YELLOW: 26,
  WOOL_GREEN: 27,
  WOOL_PURPLE: 28,
  WOOL_BLACK: 29,
  STONEBRICK: 30,
  DARKBRICK: 31,
  WHITEBRICK: 32,
  TERRACOTTA: 33,
  BLUEBRICK: 34,
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
  [BLOCK.SANDSTONE]: { name: 'Sandstone',   tiles: [TILE.SANDSTONE, TILE.SANDSTONE, TILE.SANDSTONE], solid: true, transparent: false },
  [BLOCK.GRAVEL]:    { name: 'Gravel',      tiles: [TILE.GRAVEL, TILE.GRAVEL, TILE.GRAVEL],          solid: true, transparent: false },
  [BLOCK.MOSSY]:     { name: 'Mossy Cobble', tiles: [TILE.MOSSY, TILE.MOSSY, TILE.MOSSY],            solid: true, transparent: false },
  [BLOCK.BIRCH]:     { name: 'Birch Planks', tiles: [TILE.BIRCH, TILE.BIRCH, TILE.BIRCH],            solid: true, transparent: false },
  [BLOCK.DARKPLANK]: { name: 'Dark Planks', tiles: [TILE.DARKPLANK, TILE.DARKPLANK, TILE.DARKPLANK], solid: true, transparent: false },
  [BLOCK.ICE]:       { name: 'Ice',         tiles: [TILE.ICE, TILE.ICE, TILE.ICE],                   solid: true, transparent: false },
  [BLOCK.GOLD]:      { name: 'Gold Block',  tiles: [TILE.GOLD, TILE.GOLD, TILE.GOLD],                solid: true, transparent: false },
  [BLOCK.DIAMOND]:   { name: 'Diamond Block', tiles: [TILE.DIAMOND, TILE.DIAMOND, TILE.DIAMOND],     solid: true, transparent: false },
  [BLOCK.OBSIDIAN]:  { name: 'Obsidian',    tiles: [TILE.OBSIDIAN, TILE.OBSIDIAN, TILE.OBSIDIAN],    solid: true, transparent: false },
  [BLOCK.BOOKSHELF]: { name: 'Bookshelf',   tiles: [TILE.PLANK, TILE.BOOKSHELF, TILE.PLANK],         solid: true, transparent: false },
  [BLOCK.WOOL_RED]:    { name: 'Red Wool',    tiles: [TILE.WOOL_RED, TILE.WOOL_RED, TILE.WOOL_RED],          solid: true, transparent: false },
  [BLOCK.WOOL_BLUE]:   { name: 'Blue Wool',   tiles: [TILE.WOOL_BLUE, TILE.WOOL_BLUE, TILE.WOOL_BLUE],       solid: true, transparent: false },
  [BLOCK.WOOL_YELLOW]: { name: 'Yellow Wool', tiles: [TILE.WOOL_YELLOW, TILE.WOOL_YELLOW, TILE.WOOL_YELLOW], solid: true, transparent: false },
  [BLOCK.WOOL_GREEN]:  { name: 'Green Wool',  tiles: [TILE.WOOL_GREEN, TILE.WOOL_GREEN, TILE.WOOL_GREEN],    solid: true, transparent: false },
  [BLOCK.WOOL_PURPLE]: { name: 'Purple Wool', tiles: [TILE.WOOL_PURPLE, TILE.WOOL_PURPLE, TILE.WOOL_PURPLE], solid: true, transparent: false },
  [BLOCK.WOOL_BLACK]:  { name: 'Black Wool',  tiles: [TILE.WOOL_BLACK, TILE.WOOL_BLACK, TILE.WOOL_BLACK],    solid: true, transparent: false },
  [BLOCK.SLAB_STONE]:  { name: 'Stone Slab',  tiles: [TILE.STONE, TILE.STONE, TILE.STONE],    solid: true, transparent: false, slab: true },
  [BLOCK.SLAB_PLANK]:  { name: 'Plank Slab',  tiles: [TILE.PLANK, TILE.PLANK, TILE.PLANK],    solid: true, transparent: false, slab: true },
  [BLOCK.SLAB_COBBLE]: { name: 'Cobble Slab', tiles: [TILE.COBBLE, TILE.COBBLE, TILE.COBBLE], solid: true, transparent: false, slab: true },
  [BLOCK.SLAB_BRICK]:  { name: 'Brick Slab',  tiles: [TILE.BRICK, TILE.BRICK, TILE.BRICK],    solid: true, transparent: false, slab: true },
  [BLOCK.STONEBRICK]: { name: 'Stone Bricks', tiles: [TILE.STONEBRICK, TILE.STONEBRICK, TILE.STONEBRICK], solid: true, transparent: false },
  [BLOCK.DARKBRICK]:  { name: 'Dark Bricks',  tiles: [TILE.DARKBRICK, TILE.DARKBRICK, TILE.DARKBRICK],    solid: true, transparent: false },
  [BLOCK.WHITEBRICK]: { name: 'Quartz Bricks', tiles: [TILE.WHITEBRICK, TILE.WHITEBRICK, TILE.WHITEBRICK], solid: true, transparent: false },
  [BLOCK.TERRACOTTA]: { name: 'Terracotta',   tiles: [TILE.TERRACOTTA, TILE.TERRACOTTA, TILE.TERRACOTTA], solid: true, transparent: false },
  [BLOCK.BLUEBRICK]:  { name: 'Blue Bricks',  tiles: [TILE.BLUEBRICK, TILE.BLUEBRICK, TILE.BLUEBRICK],    solid: true, transparent: false },
};

export function isSlab(id) {
  return id >= BLOCK.SLAB_STONE && id <= BLOCK.SLAB_BRICK;
}

// Everything the player can place from the inventory.
export const PLACEABLE_BLOCKS = Object.keys(BLOCK_INFO).map(Number).filter((id) => id !== BLOCK.WATER);

export function isSolid(id) {
  return id !== BLOCK.AIR && id !== BLOCK.WATER;
}

export function isTransparent(id) {
  return id === BLOCK.AIR || id === BLOCK.WATER || id === BLOCK.GLASS;
}

// Default hotbar layout (customizable through the inventory).
export const HOTBAR_BLOCKS = [
  BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.COBBLE, BLOCK.PLANK,
  BLOCK.LOG, BLOCK.GLASS, BLOCK.BRICK, BLOCK.SLAB_PLANK,
];
