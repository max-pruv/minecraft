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
  // Mars : les deux derniers identifiants libres avant la plage décorative
  MARS_SOL: 38,
  MARS_ROCHE: 39,
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
  // Tuiles martiennes : après les tuiles de ville (335..344), dans l'espace
  // encore libre de l'atlas
  MARS_SOL: 345,
  MARS_ROCHE: 346,
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
  [BLOCK.MARS_SOL]:   { name: 'Sol de Mars',  tiles: [TILE.MARS_SOL, TILE.MARS_SOL, TILE.MARS_SOL],       solid: true, transparent: false },
  [BLOCK.MARS_ROCHE]: { name: 'Roche de Mars', tiles: [TILE.MARS_ROCHE, TILE.MARS_ROCHE, TILE.MARS_ROCHE], solid: true, transparent: false },
};

export function isSlab(id) {
  return id >= BLOCK.SLAB_STONE && id <= BLOCK.SLAB_BRICK;
}

// --- decorative objects: 10 patterns x 30 colors = 300 generated blocks -----

export const DECOR_START = 40;      // first decor block id
export const DECOR_TILE_START = 35; // first decor tile index

export const DECOR_PATTERNS = [
  'Uni', 'Briques', 'Planches', 'Damier', 'Pois',
  'Rayures', 'Lignes', 'Zigzag', 'Cadre', 'Losange',
];

export const DECOR_COLORS = [
  ['Rouge', [200, 62, 56]], ['Orange', [232, 137, 44]], ['Jaune', [228, 200, 60]],
  ['Citron', [200, 220, 70]], ['Vert clair', [140, 200, 90]], ['Vert', [88, 160, 70]],
  ['Émeraude', [40, 150, 110]], ['Turquoise', [50, 170, 170]], ['Cyan', [70, 190, 220]],
  ['Ciel', [110, 170, 230]], ['Bleu', [64, 100, 190]], ['Indigo', [70, 70, 170]],
  ['Violet', [120, 80, 190]], ['Pourpre', [160, 60, 160]], ['Magenta', [200, 70, 160]],
  ['Rose', [235, 130, 180]], ['Saumon', [240, 150, 130]], ['Marron', [130, 90, 60]],
  ['Chocolat', [95, 60, 40]], ['Beige', [215, 195, 160]], ['Sable', [225, 210, 170]],
  ['Olive', [130, 130, 60]], ['Kaki', [150, 140, 100]], ['Gris clair', [190, 190, 190]],
  ['Gris', [130, 130, 130]], ['Anthracite', [70, 74, 80]], ['Noir', [35, 35, 38]],
  ['Blanc', [242, 242, 240]], ['Crème', [240, 232, 210]], ['Menthe', [170, 225, 195]],
];

// [{ id, tile, pattern, colorName, rgb }]
export const DECOR_ITEMS = [];
DECOR_COLORS.forEach(([colorName, rgb], ci) => {
  DECOR_PATTERNS.forEach((pattern, pi) => {
    const i = ci * DECOR_PATTERNS.length + pi;
    const id = DECOR_START + i;
    const tile = DECOR_TILE_START + i;
    DECOR_ITEMS.push({ id, tile, pattern, colorName, rgb });
    BLOCK_INFO[id] = {
      name: `${pattern} ${colorName.toLowerCase()}`,
      tiles: [tile, tile, tile],
      solid: true, transparent: false,
    };
  });
});

export function decorMapColor(id) {
  const item = DECOR_ITEMS[id - DECOR_START];
  if (item) return item.rgb;
  const prop = PROP_ITEMS[id - PROP_START];
  return prop ? prop.rgb : null;
}

// --- furniture & object props: real 3D shapes placed on a block cell --------

export const PROP_START = 340;

export const PROP_TYPES = [
  { key: 'tree', name: 'Arbre', emoji: '🌳' },
  { key: 'pine', name: 'Sapin', emoji: '🌲' },
  { key: 'flowerpot', name: 'Pot de fleurs', emoji: '🪴' },
  { key: 'bush', name: 'Buisson', emoji: '🌿' },
  { key: 'sofa', name: 'Canapé', emoji: '🛋️' },
  { key: 'armchair', name: 'Fauteuil', emoji: '💺' },
  { key: 'table', name: 'Table', emoji: '🍽️' },
  { key: 'chair', name: 'Chaise', emoji: '🪑' },
  { key: 'bed', name: 'Lit', emoji: '🛏️' },
  { key: 'lamp', name: 'Lampe', emoji: '💡' },
  { key: 'tv', name: 'Télé', emoji: '📺' },
  { key: 'rug', name: 'Tapis', emoji: '🧶' },
  { key: 'cake', name: 'Gâteau', emoji: '🍰' },
  { key: 'stool', name: 'Tabouret', emoji: '🦶' },
];

// 200 props: 14 types cycling through the 30-color palette.
export const PROP_ITEMS = [];
for (let i = 0; i < 200; i++) {
  const type = PROP_TYPES[i % PROP_TYPES.length];
  const [colorName, rgb] = DECOR_COLORS[Math.floor(i / PROP_TYPES.length) % DECOR_COLORS.length];
  const id = PROP_START + i;
  PROP_ITEMS.push({ id, type: type.key, emoji: type.emoji, colorName, rgb });
  BLOCK_INFO[id] = {
    name: `${type.name} ${colorName.toLowerCase()}`,
    prop: true, solid: false, transparent: true, tiles: null,
  };
}

export function isProp(id) {
  return id >= PROP_START && id < PROP_START + PROP_ITEMS.length;
}

// --- city blocks: realistic materials for the three themed districts --------

export const CITY_START = 560; // ids after the prop range (340..539)
export const CITY_TILE_START = 335;

export const CITY_BLOCK = {
  HAUSSMANN: 560, ZINC: 561, ASPHALT: 562, ROADLINE: 563, SIDEWALK: 564,
  BROWNSTONE: 565, GRANITE: 566, CURTAIN: 567, COPPER: 568, CROSSWALK: 569,
};

const CITY_NAMES = [
  'Pierre haussmannienne', 'Toit de zinc', 'Asphalte', 'Route marquée', 'Trottoir',
  'Brownstone', 'Granit', 'Mur de verre bleu', 'Cuivre patiné', 'Passage piéton',
];
CITY_NAMES.forEach((name, i) => {
  const id = CITY_START + i, tile = CITY_TILE_START + i;
  BLOCK_INFO[id] = { name, tiles: [tile, tile, tile], solid: true, transparent: false };
});

// Curated blocks shown in the inventory's first tab (decor has its own tab).
export const PLACEABLE_BLOCKS = Object.keys(BLOCK_INFO).map(Number)
  .filter((id) => id !== BLOCK.WATER && (id < DECOR_START || id >= CITY_START));

export function isSolid(id) {
  return id !== BLOCK.AIR && id !== BLOCK.WATER && !isProp(id);
}

export function isTransparent(id) {
  return id === BLOCK.AIR || id === BLOCK.WATER || id === BLOCK.GLASS || isProp(id);
}

// Default hotbar layout (customizable through the inventory).
export const HOTBAR_BLOCKS = [
  BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.COBBLE, BLOCK.PLANK,
  BLOCK.LOG, BLOCK.GLASS, BLOCK.BRICK, BLOCK.SLAB_PLANK,
];
