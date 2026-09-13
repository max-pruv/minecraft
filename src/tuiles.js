// LES TUILES DE L'ATLAS — la partie PURE de textures.js (v251).
//
// Le mailleur des morceaux tourne désormais hors du fil principal, dans un
// Web Worker (maillage-worker.js). Un worker de module n'a pas l'import map
// de la page : le premier `import 'three'` de son graphe le fait mourir sans
// un mot. `textures.js` importe three (l'atlas est une texture) ; le mailleur
// n'a besoin que de ces quatre fonctions et de ces trois nombres, qui ne
// touchent ni à three ni au document. Ils vivent ici, et textures.js les
// réexporte pour ses lecteurs d'avant.
export const TILE_PX = 16;
export const ATLAS_COLS = 20;
// L'atlas était PLEIN : 360 cases, 350 prises. Impossible d'ajouter une seule
// texture — c'est ce qui plafonnait la fidélité des villes, où chaque bloc
// devait se contenter d'une teinte unie. On ouvre vingt-deux rangées de plus
// (440 cases libres) : de quoi peindre une vraie architecture, façade par
// façade. Le coût est une image de 320 × 640 pixels au lieu de 320 × 288 —
// deux cents kilo-octets de mémoire vidéo, rien pour une tablette.
export const ATLAS_ROWS = 40;

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
