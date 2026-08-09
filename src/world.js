// Infinite procedurally generated voxel world, stored as 16xHx16 chunks.

import { BLOCK, CITY_BLOCK, DECOR_START, PROP_START, isSolid as blockIsSolid } from './blocks.js';
import { buildVillandry } from './villandry.js';
import { buildAeroport } from './aeroport.js';
import { buildGaulois } from './gaulois.js';
import { buildEspace } from './espace.js';
import { buildVille } from './ville.js';
import { buildCircuit } from './circuit.js';
import {
  NY, zoneManhattan, surTerre, hauteurManhattan, solManhattan, dansCentralPark, batirColonne,
  MONUMENTS, buildEmpireState, buildChrysler, buildFlatiron, buildOneWTC, buildGrandCentral,
} from './manhattan.js';

export const CHUNK = 16;
export const HEIGHT = 96;
export const WATER_LEVEL = 30;
export const SEED = 1337;

// --- deterministic noise -------------------------------------------------

function hash2i(x, z, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, z, seed) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2i(xi, zi, seed);
  const b = hash2i(xi + 1, zi, seed);
  const c = hash2i(xi, zi + 1, seed);
  const d = hash2i(xi + 1, zi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, z, seed, octaves = 4) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, z * freq, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm; // 0..1
}

// --- landmarks --------------------------------------------------------------
// Famous-city-inspired monuments stamped into the terrain at fixed coords
// near spawn: an Eiffel-style tower, a stepped Manhattan skyscraper, and a
// red suspension bridge. set(dx, dy, dz, id) is relative to the anchor base.

function buildEiffelTower(set) {
  const IRON = BLOCK.DARKBRICK;
  const ring = (r, y) => {
    for (let d = -r; d <= r; d++) {
      set(d, y, -r, IRON); set(d, y, r, IRON);
      set(-r, y, d, IRON); set(r, y, d, IRON);
    }
  };
  for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) set(dx, -1, dz, CITY_BLOCK.SIDEWALK); // parvis
  for (let y = 0; y < 10; y++) { // four splayed legs
    const off = y < 5 ? 4 : 3;
    for (const sx of [-off, off]) for (const sz of [-off, off]) set(sx, y, sz, IRON);
  }
  ring(4, 10); ring(3, 11); // first platform
  for (let y = 12; y < 20; y++) for (const sx of [-2, 2]) for (const sz of [-2, 2]) set(sx, y, sz, IRON);
  ring(2, 20); // second platform
  for (let y = 21; y < 30; y++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) set(sx, y, sz, IRON);
  ring(1, 30); // third platform
  for (let y = 31; y < 40; y++) set(0, y, 0, IRON); // mast
  set(0, 40, 0, BLOCK.GOLD);
  set(0, 41, 0, BLOCK.GLASS); // the beacon
}

function buildSkyscraper(set) { // Empire State: limestone tiers + steel spire
  const levels = [[5, 0, 16], [4, 16, 28], [3, 28, 38], [2, 38, 46]];
  for (const [r, from, to] of levels) {
    for (let y = from; y < to; y++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue; // walls only
          const glassRow = y % 3 !== 2;
          set(dx, y, dz, glassRow && (dx + dz) % 2 === 0 ? CITY_BLOCK.CURTAIN : CITY_BLOCK.GRANITE);
        }
      }
    }
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) set(dx, to, dz, CITY_BLOCK.GRANITE);
  }
  for (let y = 46; y < 53; y++) set(0, y, 0, CITY_BLOCK.GRANITE); // spire
  set(0, 53, 0, BLOCK.GOLD);
}

function buildStatue(set) { // Lady Liberty: granite pedestal, copper body, gold torch
  const C = CITY_BLOCK.COPPER;
  for (let y = 0; y < 5; y++) { // pedestal
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) set(dx, y, dz, CITY_BLOCK.GRANITE);
  }
  for (let y = 5; y < 12; y++) { // robe
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(dx, y, dz, C);
  }
  set(0, 12, 0, C); set(0, 13, 0, C); // head
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) set(dx, 14, dz, C); // crown spikes
  set(2, 11, 0, C); set(2, 12, 0, C); set(2, 13, 0, C); // raised arm
  set(2, 14, 0, BLOCK.GOLD); // the torch
  set(-2, 10, 0, C); // tablet arm
}

function buildSuspensionBridge(set) { // Golden Gate, international orange
  const R = BLOCK.WOOL_RED;
  for (const tx of [-18, 18]) { // the two towers
    for (let y = 0; y < 26; y++) {
      for (const dz of [-2, 3]) { set(tx, y, dz, R); set(tx + 1, y, dz, R); }
    }
    for (const yy of [13, 19, 25]) { // crossbeams
      for (let dz = -2; dz <= 3; dz++) { set(tx, yy, dz, R); set(tx + 1, yy, dz, R); }
    }
  }
  for (let dx = -30; dx <= 31; dx++) { // deck + side rails
    for (let dz = 0; dz <= 1; dz++) set(dx, 10, dz, CITY_BLOCK.ASPHALT);
    set(dx, 11, -1, R); set(dx, 11, 2, R);
  }
  for (let dx = -17; dx <= 18; dx++) { // main catenary between towers
    const t = Math.min(Math.abs(dx - 0.5) / 17.5, 1);
    const cy = 25 - Math.round((1 - t * t) * 13);
    set(dx, cy, -2, R); set(dx, cy, 3, R);
    if ((dx + 30) % 4 === 0) { // hangers
      for (let y = 12; y < cy; y++) { set(dx, y, -2, R); set(dx, y, 3, R); }
    }
  }
  for (const side of [-1, 1]) { // back spans to the shores
    for (let i = 0; i <= 11; i++) {
      const dx = side * (19 + i);
      const cy = 25 - i;
      if (cy > 11) { set(dx, cy, -2, R); set(dx, cy, 3, R); }
    }
  }
}

function buildGlassPyramid(set) { // le Louvre
  for (let level = 0; level <= 5; level++) {
    const r = 5 - level;
    for (let d = -r; d <= r; d++) {
      set(d, level, -r, BLOCK.GLASS); set(d, level, r, BLOCK.GLASS);
      set(-r, level, d, BLOCK.GLASS); set(r, level, d, BLOCK.GLASS);
    }
  }
  for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) set(dx, -1, dz, BLOCK.SANDSTONE);
}

function buildLighthouse(set) { // rayé rouge et blanc
  for (let y = 0; y < 16; y++) {
    const id = Math.floor(y / 2) % 2 === 0 ? BLOCK.WOOL_RED : BLOCK.SNOW;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        set(dx, y, dz, id);
      }
    }
  }
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(dx, 16, dz, BLOCK.GLASS);
  set(0, 16, 0, BLOCK.GOLD); // the light
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(dx, 17, dz, BLOCK.SLAB_STONE);
}

function buildArch(set) { // l'Arc de Triomphe
  const S = CITY_BLOCK.HAUSSMANN;
  for (let dx = -5; dx <= 5; dx++) for (let dz = -2; dz <= 3; dz++) set(dx, -1, dz, CITY_BLOCK.SIDEWALK);
  for (let y = 0; y < 8; y++) {
    for (const sx of [-4, -3, 3, 4]) {
      for (let dz = 0; dz <= 2; dz++) set(sx, y, dz, S);
    }
  }
  for (let y = 8; y < 12; y++) { // attic over the arch
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = 0; dz <= 2; dz++) set(dx, y, dz, S);
    }
  }
  for (let dx = -2; dx <= 2; dx++) { // vault curve carved out
    set(dx, 8, 1, BLOCK.AIR);
    if (Math.abs(dx) <= 1) set(dx, 9, 1, BLOCK.AIR);
  }
  for (let dx = -4; dx <= 4; dx++) { set(dx, 12, 0, BLOCK.SLAB_STONE); set(dx, 12, 1, BLOCK.SLAB_STONE); set(dx, 12, 2, BLOCK.SLAB_STONE); }
}

// Le château médiéval : douves en eau, pont-levis, courtines à créneaux,
// tours d'angle, donjon habitable et jardins à la française. Il tient dans
// une emprise de 30 blocs de rayon, posée sur l'esplanade plate que la
// génération de terrain lui réserve — une douve creusée à flanc de colline
// se viderait d'un côté et déborderait de l'autre.
//
// Il est unique et à coordonnées fixes : le terrain étant déterministe, il
// apparaît au même endroit dans tous les mondes, celui de chaque enfant
// comme les mondes partagés.
function buildCastle(set) {
  const MUR = BLOCK.STONEBRICK;
  const TOUR = BLOCK.COBBLE;
  const TOIT = BLOCK.WOOL_RED;
  const SOL = BLOCK.MOSSY;

  const carre = (r, y, id, plein = false) => {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (!plein && Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        set(dx, y, dz, id);
      }
    }
  };

  // --- l'esplanade et la douve -------------------------------------------
  // Un anneau creusé et rempli d'eau, avec ses berges en pierre : c'est ce
  // qu'on voit en premier en arrivant, et ce qui donne l'échelle.
  const R_EXT = 26, DOUVE_INT = 19, DOUVE_EXT = 24;
  for (let dx = -R_EXT; dx <= R_EXT; dx++) {
    for (let dz = -R_EXT; dz <= R_EXT; dz++) {
      const d = Math.max(Math.abs(dx), Math.abs(dz)); // douve carrée, comme les vraies
      if (d > R_EXT) continue;
      if (d >= DOUVE_INT && d <= DOUVE_EXT) {
        for (let y = -4; y <= 0; y++) set(dx, y, dz, y === -4 ? BLOCK.GRAVEL : BLOCK.WATER);
        set(dx, 1, dz, BLOCK.AIR);
      } else if (d > DOUVE_EXT) {
        set(dx, 0, dz, BLOCK.GRASS); // la campagne autour
      } else {
        set(dx, 0, dz, d >= DOUVE_INT - 2 ? BLOCK.COBBLE : SOL); // berge puis cour
      }
    }
  }

  // --- le pont-levis ------------------------------------------------------
  // Tablier de planches au ras de l'eau, chaînes tendues vers la herse, et
  // les deux montants qui le relèveraient.
  for (let dz = -DOUVE_EXT - 1; dz <= -DOUVE_INT + 1; dz++) {
    for (let dx = -2; dx <= 2; dx++) set(dx, 1, dz, BLOCK.PLANK);
    set(-3, 1, dz, BLOCK.LOG); set(3, 1, dz, BLOCK.LOG); // garde-corps
  }
  for (let y = 2; y <= 6; y++) { set(-3, y, -DOUVE_INT + 1, BLOCK.LOG); set(3, y, -DOUVE_INT + 1, BLOCK.LOG); }
  for (let dx = -3; dx <= 3; dx++) set(dx, 7, -DOUVE_INT + 1, BLOCK.LOG); // linteau
  for (let i = 0; i <= 4; i++) { // les chaînes
    set(-3, 6 - i, -DOUVE_INT - i, BLOCK.DARKBRICK);
    set(3, 6 - i, -DOUVE_INT - i, BLOCK.DARKBRICK);
  }

  // --- la courtine --------------------------------------------------------
  const R_MUR = 16, H_MUR = 8;
  for (let y = 1; y <= H_MUR; y++) carre(R_MUR, y, MUR);
  for (let y = 1; y <= H_MUR; y++) carre(R_MUR - 1, y, MUR); // épaisseur : on peut marcher dessus
  for (let d = -R_MUR; d <= R_MUR; d++) { // créneaux
    if (((d + R_MUR) % 2) !== 0) continue;
    for (const [a, b] of [[d, -R_MUR], [d, R_MUR], [-R_MUR, d], [R_MUR, d]]) set(a, H_MUR + 1, b, MUR);
  }
  // la porte, sous le châtelet
  for (let y = 1; y <= 4; y++) for (let dx = -2; dx <= 2; dx++) {
    set(dx, y, -R_MUR, BLOCK.AIR); set(dx, y, -R_MUR + 1, BLOCK.AIR);
  }
  for (let dx = -2; dx <= 2; dx++) set(dx, 5, -R_MUR, BLOCK.DARKBRICK); // la herse relevée
  for (let dz = -R_MUR; dz <= -DOUVE_INT + 1; dz++) for (let dx = -2; dx <= 2; dx++) set(dx, 1, dz, BLOCK.PLANK);

  // --- les tours d'angle ---------------------------------------------------
  const tour = (cx, cz, h) => {
    for (let y = 1; y <= h; y++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (dx * dx + dz * dz > 6) continue; // ronde, à peu près
          const bord = dx * dx + dz * dz > 2;
          if (!bord && y < h) continue; // creuse à l'intérieur
          const meurtriere = bord && y > 3 && y % 3 === 0 && (dx === 0 || dz === 0);
          set(cx + dx, y, cz + dz, meurtriere ? BLOCK.AIR : TOUR);
        }
      }
    }
    for (let i = 0; i <= 2; i++) { // toit conique
      const r = 2 - i;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) set(cx + dx, h + 1 + i, cz + dz, TOIT);
    }
    set(cx, h + 4, cz, BLOCK.LOG);
    set(cx, h + 5, cz, BLOCK.WOOL_BLUE); // l'oriflamme
  };
  // Une tour à chaque coin, plus hautes que la courtine pour qu'on les voie de
  // loin et que la garnison ait de quoi surveiller la campagne.
  for (const cx of [-R_MUR, R_MUR]) for (const cz of [-R_MUR, R_MUR]) tour(cx, cz, 16);
  tour(-5, -R_MUR, 12); tour(5, -R_MUR, 12); // les deux tours du châtelet

  // --- le donjon ----------------------------------------------------------
  // Carré, massif, avec un vrai intérieur : escalier, étage et chemin de
  // ronde. C'est le seul endroit du monde où l'on monte à quinze blocs.
  const D = 5, H_DON = 20;
  for (let y = 1; y <= H_DON; y++) {
    for (let dx = -D; dx <= D; dx++) {
      for (let dz = -D; dz <= D; dz++) {
        const mur = Math.abs(dx) === D || Math.abs(dz) === D;
        if (!mur) { if (y === 9) set(dx, y, dz, BLOCK.PLANK); continue; } // plancher d'étage
        const fenetre = (y === 5 || y === 13) && ((Math.abs(dx) === D && Math.abs(dz) <= 1) || (Math.abs(dz) === D && Math.abs(dx) <= 1));
        set(dx, y, dz, fenetre ? BLOCK.GLASS : MUR);
      }
    }
  }
  for (let y = 1; y <= 3; y++) { set(0, y, -D, BLOCK.AIR); set(-1, y, -D, BLOCK.AIR); } // la porte
  for (let i = 0; i < 8; i++) set(D - 1 - Math.floor(i / 2), 1 + i, -D + 1 + (i % 2), BLOCK.SLAB_COBBLE); // escalier
  for (let d = -D; d <= D; d++) { // créneaux du donjon
    if (((d + D) % 2) !== 0) continue;
    for (const [a, b] of [[d, -D], [d, D], [-D, d], [D, d]]) set(a, H_DON + 1, b, MUR);
  }
  set(0, H_DON + 2, 0, BLOCK.LOG); set(0, H_DON + 3, 0, BLOCK.LOG);
  set(0, H_DON + 4, 0, BLOCK.GOLD); // la girouette dorée

  // --- les jardins ---------------------------------------------------------
  // Quatre parterres à la française de part et d'autre de l'allée d'honneur,
  // bordés de buis, avec une fontaine au milieu de la cour.
  const FLEURS = [BLOCK.WOOL_RED, BLOCK.WOOL_YELLOW, BLOCK.WOOL_PURPLE, BLOCK.WOOL_BLUE];
  const parterre = (ox, oz, teinte) => {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const bord = Math.abs(dx) === 3 || Math.abs(dz) === 3;
        if (bord) { set(ox + dx, 1, oz + dz, BLOCK.LEAVES); continue; } // le buis taillé
        set(ox + dx, 1, oz + dz, (dx + dz) % 2 === 0 ? FLEURS[teinte] : BLOCK.GRASS);
      }
    }
  };
  parterre(-9, 8, 0); parterre(9, 8, 1);
  parterre(-9, -6, 2); parterre(9, -6, 3);
  for (let dz = -R_MUR + 2; dz <= D; dz++) for (let dx = -2; dx <= 2; dx++) set(dx, 1, dz, BLOCK.WHITEBRICK); // allée d'honneur

  // la fontaine, entre la porte et le donjon
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const bord = Math.abs(dx) === 2 || Math.abs(dz) === 2;
      set(dx, 1, -10 + dz, bord ? BLOCK.WHITEBRICK : BLOCK.WATER);
    }
  }
  set(0, 2, -10, BLOCK.WHITEBRICK); set(0, 3, -10, BLOCK.WATER);

  // quelques arbres et un puits, pour que la cour vive
  for (const [ax, az] of [[-12, 0], [12, 0], [-12, 13], [12, 13]]) {
    for (let y = 1; y <= 3; y++) set(ax, y, az, BLOCK.LOG);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(ax + dx, 4, az + dz, BLOCK.LEAVES);
    set(ax, 5, az, BLOCK.LEAVES);
  }
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    set(7 + dx, 1, -13 + dz, Math.abs(dx) + Math.abs(dz) === 0 ? BLOCK.WATER : BLOCK.COBBLE); // le puits
  }
  set(6, 2, -13, BLOCK.LOG); set(8, 2, -13, BLOCK.LOG); set(7, 3, -13, BLOCK.PLANK);
}

// Each landmark lives inside its own themed city district.
// waterBase: the base rises to water level so piers/bridges sit above the sea.
function buildBelfry(set) { // le beffroi de Lille, en brique avec son horloge
  for (let y = 0; y < 24; y++) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) !== 2 && Math.abs(dz) !== 2) continue; // walls only
        const window = y % 4 === 2 && (dx === 0 || dz === 0);
        set(dx, y, dz, window ? BLOCK.GLASS : BLOCK.BRICK);
      }
    }
  }
  for (const [dx, dz] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) set(dx, 19, dz, BLOCK.GOLD); // clocks
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) set(dx, 24, dz, BLOCK.SLAB_BRICK);
  for (let y = 25; y < 29; y++) set(0, y, 0, BLOCK.BRICK); // spire
  set(0, 29, 0, BLOCK.GOLD);
}

// The amusement park: an open flattened area with a Ferris wheel, a
// carousel, a circular roller-coaster and candy-striped circus tents.
export const PARK = { name: "Parc d'attractions", x: 150, z: -60, r: 34 };

// Special biome zones stamped over the base terrain.
export const DESERT = { name: 'Désert', x: 60, z: -190, r: 70 };
export const VOLCANO = { name: 'Volcan', x: -140, z: 420, r: 45 };
// Le château médiéval : douves, pont-levis, donjon et jardins. Il lui faut
// une esplanade plate — une douve creusée dans une colline se viderait d'un
// côté et déborderait de l'autre.
export const CASTLE = { name: 'Château médiéval', x: 112, z: 210, r: 40 };
export const ISLAND = { name: 'Île tropicale', x: 620, z: 80, r: 38 };

// La planète Mars : un plateau de régolithe rouge criblé de cratères, très
// loin de tout, avec sa base spatiale. Les martiens n'y vivent que là — c'est
// ce qui rend le voyage intéressant.
export const MARS = { name: 'Planète Mars', x: -520, z: -480, r: 90 };

// Le château de Villandry, planté juste à l'est du château médiéval : on passe
// de la forteresse à la Renaissance en marchant. Le domaine est vaste — six
// jardins sur trois terrasses — et demande un terrain parfaitement plat, comme
// le vrai site aménagé au-dessus du Cher.
export const VILLANDRY = { name: 'Château de Villandry', x: 250, z: 205, r: 92 };

// L'aéroport Charles-de-Gaulle, au nord-est de Paris — comme le vrai Roissy.
// Un aérodrome exige une planéité absolue : c'est le terrain le plus aplani de
// toute la carte, et il lui faut de la place, deux doublets de pistes obligent.
export const AEROPORT = { name: 'Aéroport Charles-de-Gaulle', x: -140, z: 80, r: 92 };

// Le village gaulois et, à portée de vue, le camp romain qui le surveille.
// Posés sur la côte ouest, comme en Armorique.
export const GAULOIS = { name: 'Village gaulois', x: -420, z: 300, r: 76 };

// La base spatiale, sur une planète de sable à l'autre bout de la carte : un
// astroport, sa flotte au sol et sa cantina.
export const ESPACE = { name: 'Base spatiale', x: 450, z: 420, r: 82 };

// Les services de la ville et le métro aérien : ils sont posés SUR Paris, dont
// la base plate porte l'anneau. Le circuit, lui, a besoin d'un grand terrain
// nu — il est donc à l'écart, au sud-est.
// Les coordonnées de Paris sont recopiées ici parce que CITIES est déclaré
// plus bas dans le fichier ; le test de cohérence les compare à chaque
// démarrage, elles ne peuvent donc pas se mettre à diverger en silence.
export const VILLE = { name: 'Caserne & Commissariat', x: -240, z: 200, r: 50 };
export const CIRCUIT = { name: 'Circuit de F1', x: 400, z: 110, r: 88 };

// Profondeur d'un cratère à la distance d de son centre. Bord relevé, fond
// plat : c'est ce liseré surélevé qui les rend reconnaissables de loin.
function cratere(d, rayon) {
  if (d > rayon) return 0;
  const t = d / rayon;
  if (t > 0.82) return 1.6 * Math.sin((1 - t) / 0.18 * Math.PI); // le bourrelet
  return -5.5 * Math.cos(t / 0.82 * Math.PI * 0.5);
}

// Lava & cactus reuse the generated decor palette (Uni pattern).
const LAVA = DECOR_START + 1 * 10;   // Uni orange
const LAVA_HOT = DECOR_START + 0 * 10; // Uni rouge
const CACTUS = DECOR_START + 5 * 10; // Uni vert

// Named places shown on the maps with tap-to-travel (besides the cities).
export const PLACES = [
  PARK, DESERT, VOLCANO, ISLAND, CASTLE, MARS, VILLANDRY, AEROPORT, GAULOIS, ESPACE, CIRCUIT,
  // La caserne et le commissariat sont bâtis au cœur de Paris, mais ils
  // n'étaient pas des destinations : on ne pouvait y aller qu'en tombant
  // dessus par hasard, au milieu d'une ville de cent dix blocs de large. Le
  // point d'arrivée est la place, entre les deux — de là on voit les deux
  // façades, les camions rouges et les voitures de patrouille.
  { name: 'Caserne & Commissariat', x: VILLE.x, z: VILLE.z + 14, r: 34 },
  // Manhattan a ses propres destinations : sans elles, on arrivait sur l'île
  // par son seul nom, à un endroit quelconque de neuf kilomètres de long.
  { name: 'Central Park', x: NY.x - 10, z: NY.z - 58, r: 30 },
  { name: 'Times Square', x: NY.x - 15, z: NY.z - 9, r: 12 },
  { name: 'Musée', x: -34, z: 40, r: 20 },
  { name: 'Quartier des enfants', x: 26, z: -14, r: 20 },
];

function buildFunPark(set) {
  const R = 24;
  // walkway grid across the park grounds
  for (let dx = -R; dx <= R; dx++) {
    for (let dz = -R; dz <= R; dz++) {
      if (Math.hypot(dx, dz) > R) continue;
      if (dx % 8 === 0 || dz % 8 === 0) set(dx, -1, dz, BLOCK.SANDSTONE);
    }
  }
  // entrance arch on the south side
  for (let y = 0; y < 5; y++) { set(-2, y, -R, BLOCK.GOLD); set(2, y, -R, BLOCK.GOLD); }
  for (let dx = -2; dx <= 2; dx++) set(dx, 5, -R, BLOCK.WOOL_YELLOW);
  set(0, 6, -R, BLOCK.WOOL_RED); // flag

  // la grande roue — a tall Ferris wheel with rainbow gondolas
  const FX = -10, FZ = 8, CY = 12, FR = 9;
  const GONDOLAS = [BLOCK.WOOL_RED, BLOCK.WOOL_YELLOW, BLOCK.WOOL_GREEN, BLOCK.WOOL_BLUE,
    BLOCK.WOOL_PURPLE, BLOCK.WOOL_RED, BLOCK.WOOL_YELLOW, BLOCK.WOOL_GREEN];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    set(FX + Math.round(Math.cos(a) * FR), CY + Math.round(Math.sin(a) * FR), FZ, BLOCK.WHITEBRICK);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    set(FX + Math.round(Math.cos(a) * (FR - 2)), CY + Math.round(Math.sin(a) * (FR - 2)), FZ, GONDOLAS[i]);
  }
  for (let r = 1; r < FR - 1; r++) { // spokes
    set(FX + r, CY, FZ, BLOCK.WHITEBRICK); set(FX - r, CY, FZ, BLOCK.WHITEBRICK);
    set(FX, CY + r, FZ, BLOCK.WHITEBRICK); set(FX, CY - r, FZ, BLOCK.WHITEBRICK);
  }
  set(FX, CY, FZ, BLOCK.GOLD); // hub
  for (let y = 0; y < CY; y++) { set(FX, y, FZ - 1, BLOCK.DARKBRICK); set(FX, y, FZ + 1, BLOCK.DARKBRICK); }

  // le carrousel — striped cone roof over golden poles
  const KX = 10, KZ = -8;
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      if (Math.hypot(dx, dz) > 4.3) continue;
      set(KX + dx, 0, KZ + dz, BLOCK.SLAB_PLANK);
    }
  }
  for (const [px, pz] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, 2], [2, -2], [-2, -2]]) {
    set(KX + px, 1, KZ + pz, BLOCK.GOLD); set(KX + px, 2, KZ + pz, BLOCK.GOLD);
  }
  for (let y = 1; y <= 3; y++) set(KX, y, KZ, BLOCK.LOG); // center mast
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      const d = Math.hypot(dx, dz);
      if (d <= 5.3) set(KX + dx, 4, KZ + dz, Math.round(d) % 2 === 0 ? BLOCK.WOOL_RED : BLOCK.SNOW);
      if (d <= 3.3) set(KX + dx, 5, KZ + dz, Math.round(d) % 2 === 0 ? BLOCK.WOOL_RED : BLOCK.SNOW);
    }
  }
  set(KX, 6, KZ, BLOCK.GOLD);

  // les montagnes russes — a wavy circular roller-coaster around everything
  const TR = 18;
  for (let i = 0; i < 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    const tx = Math.round(Math.cos(a) * TR), tz = Math.round(Math.sin(a) * TR);
    const ty = 2 + Math.round(3 + 3 * Math.sin(a * 3));
    set(tx, ty, tz, BLOCK.WOOL_PURPLE);
    if (i % 8 === 0) for (let y = 0; y < ty; y++) set(tx, y, tz, BLOCK.DARKBRICK);
  }

  // candy-striped circus tents near the entrance
  const tent = (tx, tz, col) => {
    for (let y = 0; y < 3; y++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) !== 2 && Math.abs(dz) !== 2) continue;
          set(tx + dx, y, tz + dz, (dx + dz + y) % 2 === 0 ? col : BLOCK.SNOW);
        }
      }
    }
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) set(tx + dx, 3, tz + dz, col);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(tx + dx, 4, tz + dz, col);
    set(tx, 5, tz, BLOCK.GOLD);
    set(tx, 0, tz - 2, BLOCK.AIR); set(tx, 1, tz - 2, BLOCK.AIR); // doorway
  };
  tent(6, -14, BLOCK.WOOL_RED);
  tent(-6, -14, BLOCK.WOOL_BLUE);

  // parkour: floating steps climbing to a golden podium (east side)
  const steps = [
    [12, 1, 2], [14, 2, 4], [16, 3, 6], [14, 4, 8], [12, 5, 10],
    [10, 6, 12], [12, 7, 14], [14, 8, 16], [16, 9, 18],
  ];
  for (const [sx, sy, sz2] of steps) set(sx, sy, sz2, BLOCK.SLAB_STONE);
  for (let dx = 15; dx <= 17; dx++) for (let dz = 19; dz <= 21; dz++) set(dx, 9, dz, BLOCK.GOLD); // podium
  set(16, 10, 20, BLOCK.WOOL_YELLOW); // victory beacon

  // race track posts: start (green) near the entrance, finish (checkered) north
  for (let y = 0; y < 4; y++) set(-16, y, -18, BLOCK.LOG);
  set(-16, 4, -18, BLOCK.WOOL_GREEN);
  for (let y = 0; y < 4; y++) set(-16, y, 20, BLOCK.LOG);
  set(-16, 4, 20, BLOCK.WOOL_BLACK); set(-16, 5, 20, BLOCK.SNOW);
}

function buildPyramid(set) { // grande pyramide de grès du désert
  const B = 11;
  for (let level = 0; level <= B; level++) {
    const r = B - level;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue; // hollow shell
        set(dx, level, dz, BLOCK.SANDSTONE);
      }
    }
  }
  for (let y = 0; y < 3; y++) { set(0, y, -B, BLOCK.AIR); if (y < 2) set(1, y, -B, BLOCK.AIR); } // entrance
  set(0, B + 1, 0, BLOCK.GOLD); // golden capstone
  // little sister pyramid
  for (let level = 0; level <= 4; level++) {
    const r = 4 - level;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) set(16 + dx, level, 10 + dz, BLOCK.SANDSTONE);
    }
  }
  // a few cactuses around
  for (const [cx2, cz2] of [[-15, 4], [-10, -12], [12, -8], [8, 16]]) {
    for (let y = 0; y < 3; y++) set(cx2, y, cz2, CACTUS);
    set(cx2 - 1, 1, cz2, CACTUS); set(cx2 + 1, 2, cz2, CACTUS); // arms
  }
}

function buildCottages(set) { // le quartier des enfants : deux maisons meublées
  const cottage = (ox, roof, bedProp) => {
    for (let dx = 0; dx <= 5; dx++) {
      for (let dz = 0; dz <= 5; dz++) {
        set(ox + dx, -1, dz, BLOCK.PLANK); // floor
        for (let y = 0; y < 3; y++) {
          const wall = dx === 0 || dx === 5 || dz === 0 || dz === 5;
          if (!wall) continue;
          const win = y === 1 && (dx === 0 || dx === 5) && (dz === 2 || dz === 3);
          set(ox + dx, y, dz, win ? BLOCK.GLASS : BLOCK.PLANK);
        }
        set(ox + dx, 3, dz, roof); // flat colored roof
      }
    }
    for (let dx = 1; dx <= 4; dx++) for (let dz = 1; dz <= 4; dz++) set(ox + dx, 4, dz, roof);
    set(ox + 2, 0, 0, BLOCK.AIR); set(ox + 2, 1, 0, BLOCK.AIR); // door
    set(ox + 4, 0, 4, bedProp);         // a bed
    set(ox + 1, 0, 4, PROP_START + 6);  // a table
    set(ox + 1, 0, 3, PROP_START + 9);  // a lamp
  };
  cottage(0, BLOCK.WOOL_RED, PROP_START + 8);        // Marlon's red cottage
  cottage(9, BLOCK.WOOL_BLUE, PROP_START + 8 + 14);  // Alice's blue one
  for (let dz = -3; dz < 0; dz++) { set(2, -1, dz, BLOCK.SANDSTONE); set(11, -1, dz, BLOCK.SANDSTONE); } // paths
}

function buildMuseum(set) { // le musée des champions : statues des créatures attrapées
  const W = 8, D = 6; // half sizes
  for (let dx = -W; dx <= W; dx++) {
    for (let dz = -D; dz <= D; dz++) {
      set(dx, -1, dz, BLOCK.WHITEBRICK); // marble floor
      for (let y = 0; y < 5; y++) {
        const wall = dx === -W || dx === W || dz === -D || dz === D;
        if (!wall) continue;
        const win = y >= 1 && y <= 3 && ((dx + 100) % 3 === 0 || (dz + 100) % 3 === 0);
        set(dx, y, dz, win ? BLOCK.GLASS : BLOCK.WHITEBRICK);
      }
      set(dx, 5, dz, BLOCK.SLAB_STONE); // roof
    }
  }
  for (let dx = -1; dx <= 1; dx++) { set(dx, 0, -D, BLOCK.AIR); set(dx, 1, -D, BLOCK.AIR); set(dx, 2, -D, BLOCK.AIR); } // grand entrance
  for (const sx of [-2, 2]) { for (let y = 0; y < 3; y++) set(sx, y, -D - 1, BLOCK.WHITEBRICK); set(sx, 3, -D - 1, BLOCK.GOLD); } // columns
  // pedestals for the statues (filled in by the game as creatures are caught)
  for (let i = 0; i < 6; i++) {
    set(-W + 2 + i * 2.4 | 0, 0, D - 2, BLOCK.STONEBRICK);
    set(-W + 2 + i * 2.4 | 0, 0, -D + 2, BLOCK.STONEBRICK);
  }
}

// La base martienne : une fusée posée sur son pas de tir, un dôme
// d'habitation vitré, des panneaux solaires et un drapeau. C'est le seul
// endroit habité de la planète, et le point d'arrivée du voyage.
function buildBaseMartienne(set) {
  const QUARTZ = BLOCK.WHITEBRICK, METAL = BLOCK.STONEBRICK;

  // esplanade circulaire, avec un liseré clair qui la détache du régolithe
  for (let dx = -22; dx <= 22; dx++) {
    for (let dz = -22; dz <= 22; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > 22) continue;
      set(dx, 0, dz, d > 20.5 ? QUARTZ : BLOCK.GRAVEL);
    }
  }

  // --- la fusée, posée à l'ouest de l'esplanade ---------------------------
  const FX = -11, FZ = 0, R = 3, H = 26;
  const disque = (y, rayon, id) => {
    for (let dx = -rayon; dx <= rayon; dx++) {
      for (let dz = -rayon; dz <= rayon; dz++) {
        if (Math.hypot(dx, dz) <= rayon + 0.2) set(FX + dx, y, FZ + dz, id);
      }
    }
  };
  const anneau = (y, rayon, id) => {
    for (let dx = -rayon; dx <= rayon; dx++) {
      for (let dz = -rayon; dz <= rayon; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= rayon + 0.2 && d > rayon - 1) set(FX + dx, y, FZ + dz, id);
      }
    }
  };
  // pas de tir surélevé
  disque(0, R + 3, METAL);
  disque(1, R + 3, BLOCK.DARKBRICK);
  // corps blanc, cerclé de rouge tous les six niveaux
  for (let y = 2; y < H - 6; y++) {
    anneau(y, R, (y - 2) % 6 === 0 ? BLOCK.WOOL_RED : QUARTZ);
  }
  // hublots
  for (const [dx, dz] of [[R, 0], [-R, 0], [0, R], [0, -R]]) {
    set(FX + dx, 10, FZ + dz, BLOCK.GLASS);
    set(FX + dx, 16, FZ + dz, BLOCK.GLASS);
  }
  // coiffe conique
  for (let k = 0; k < 6; k++) anneau(H - 6 + k, Math.max(0, R - Math.floor(k * 0.6)), QUARTZ);
  disque(H, 0, BLOCK.WOOL_RED);
  // ailerons
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let y = 2; y < 8; y++) {
      const ext = Math.max(1, 4 - Math.floor((y - 2) / 1.6));
      for (let e = R; e <= R + ext; e++) set(FX + ax * e, y, FZ + az * e, BLOCK.WOOL_RED);
    }
  }
  // passerelle d'accès depuis l'esplanade
  for (let dx = R + 1; dx <= 7; dx++) set(FX + dx, 5, FZ, BLOCK.SLAB_STONE);
  for (let y = 2; y <= 5; y++) set(FX + 7, y, FZ, METAL);

  // --- le dôme d'habitation, à l'est --------------------------------------
  const DX = 10, DZ = 0, DR = 8;
  for (let y = 0; y <= DR; y++) {
    const rayon = Math.sqrt(Math.max(0, DR * DR - y * y));
    for (let dx = -DR; dx <= DR; dx++) {
      for (let dz = -DR; dz <= DR; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > rayon + 0.2 || d <= rayon - 1) continue;
        // les deux premiers niveaux sont pleins, au-dessus c'est vitré : on
        // voit l'intérieur sans que la coupole paraisse fragile
        set(DX + dx, y + 1, DZ + dz, y < 2 ? QUARTZ : BLOCK.GLASS);
      }
    }
  }
  for (let dx = -DR + 1; dx <= DR - 1; dx++) {
    for (let dz = -DR + 1; dz <= DR - 1; dz++) {
      if (Math.hypot(dx, dz) < DR - 0.5) set(DX + dx, 0, DZ + dz, BLOCK.WHITEBRICK);
    }
  }
  // sas d'entrée face à la fusée
  for (let y = 1; y <= 3; y++) { set(DX - DR, y, DZ, BLOCK.AIR); set(DX - DR, y, DZ + 1, BLOCK.AIR); }
  for (let dx = -DR - 3; dx <= -DR; dx++) {
    set(DX + dx, 0, DZ, BLOCK.SLAB_STONE);
    set(DX + dx, 0, DZ + 1, BLOCK.SLAB_STONE);
  }
  // un peu de mobilier sous la coupole
  set(DX, 1, DZ, BLOCK.BOOKSHELF);
  set(DX + 3, 1, DZ - 3, BLOCK.WOOL_BLUE);
  set(DX - 3, 1, DZ + 3, BLOCK.WOOL_YELLOW);

  // --- panneaux solaires, au nord -----------------------------------------
  for (let p = 0; p < 3; p++) {
    const px2 = -6 + p * 7, pz2 = -16;
    for (let y = 1; y <= 2; y++) { set(px2, y, pz2, METAL); set(px2 + 4, y, pz2, METAL); }
    for (let dx = 0; dx <= 4; dx++) {
      for (let dz = -2; dz <= 2; dz++) set(px2 + dx, 3, pz2 + dz, BLOCK.BLUEBRICK);
    }
  }

  // --- drapeau et balises -------------------------------------------------
  for (let y = 1; y <= 7; y++) set(0, y, 14, METAL);
  for (let dz = 11; dz <= 13; dz++) for (let y = 5; y <= 7; y++) set(0, y, dz, BLOCK.WOOL_RED);
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const bx = Math.round(Math.cos(ang) * 19), bz = Math.round(Math.sin(ang) * 19);
    set(bx, 1, bz, BLOCK.GOLD);
  }
}

// Les repères bâtis à la main. La carte s'en sert pour nommer ce qu'on voit
// dès qu'on zoome : sans eux, une ville n'est qu'une tache grise.
const LANDMARKS = [
  // Paris
  { name: 'Tour Eiffel', x: -240, z: 174, box: 8, build: buildEiffelTower },
  { name: 'Arc de Triomphe', x: -263, z: 200, box: 7, build: buildArch },
  { name: 'Pyramide du Louvre', x: -217, z: 222, box: 7, build: buildGlassPyramid },
  // New York : chacun à son adresse réelle, ramenée à la grille de manhattan.js.
  // La Statue de la Liberté était plantée en pleine ville, sur ce qui est
  // devenu l'Upper East Side ; elle retrouve son île, dans la baie au sud.
  { name: 'Empire State', x: NY.x + MONUMENTS[0].u, z: NY.z + MONUMENTS[0].v, box: MONUMENTS[0].box, build: buildEmpireState },
  { name: 'Chrysler Building', x: NY.x + MONUMENTS[1].u, z: NY.z + MONUMENTS[1].v, box: MONUMENTS[1].box, build: buildChrysler },
  { name: 'Flatiron', x: NY.x + MONUMENTS[2].u, z: NY.z + MONUMENTS[2].v, box: MONUMENTS[2].box, build: buildFlatiron },
  { name: 'One World Trade Center', x: NY.x + MONUMENTS[3].u, z: NY.z + MONUMENTS[3].v, box: MONUMENTS[3].box, build: buildOneWTC },
  { name: 'Grand Central', x: NY.x + MONUMENTS[4].u, z: NY.z + MONUMENTS[4].v, box: MONUMENTS[4].box, build: buildGrandCentral },
  { name: 'Statue de la Liberté', x: NY.x - 22, z: NY.z + 102, box: 4, waterBase: true, build: buildStatue },
  // San Francisco
  { name: 'Golden Gate', x: 0, z: -373, box: 34, waterBase: true, build: buildSuspensionBridge },
  { name: 'Phare', x: -38, z: -353, box: 3, waterBase: true, build: buildLighthouse },
  // Lille
  { name: 'Beffroi de Lille', x: -300, z: -200, box: 5, build: buildBelfry },
  // Countryside
  { name: 'Château médiéval', x: CASTLE.x, z: CASTLE.z, box: 30, build: buildCastle },
  { name: 'Base martienne', x: MARS.x, z: MARS.z, box: 26, build: buildBaseMartienne },
  { name: 'Château de Villandry', x: VILLANDRY.x, z: VILLANDRY.z, box: 80, build: buildVillandry },
  { name: 'Aéroport Charles-de-Gaulle', x: AEROPORT.x, z: AEROPORT.z, box: 70, build: buildAeroport },
  { name: 'Village gaulois', x: GAULOIS.x, z: GAULOIS.z, box: 62, build: buildGaulois },
  { name: 'Base spatiale', x: ESPACE.x, z: ESPACE.z, box: 64, build: buildEspace },
  { name: 'Caserne & Commissariat', x: VILLE.x, z: VILLE.z, box: 46, build: buildVille },
  { name: 'Circuit de F1', x: CIRCUIT.x, z: CIRCUIT.z, box: 80, build: buildCircuit },
  { name: "Parc d'attractions", x: PARK.x, z: PARK.z, box: 26, build: buildFunPark },
  { name: 'Pyramides', x: DESERT.x, z: DESERT.z, box: 22, build: buildPyramid },
  { name: 'Quartier des enfants', x: 26, z: -14, box: 16, build: buildCottages },
  { name: 'Musée', x: -34, z: 40, box: 10, build: buildMuseum },
];

// La même liste, sans les constructeurs : ce que la carte a le droit de lire.
export const REPERES = LANDMARKS.map(({ name, x, z, box }) => ({ name, x, z, box }));

// --- world ----------------------------------------------------------------

// Three themed city districts, each with its own architecture, street
// pattern and landmarks: Haussmann Paris, skyscraper New York, and
// pastel-hilled San Francisco.
export const CITIES = [
  { key: 'paris', name: 'Paris', x: -240, z: 200, r: 55, cell: 12, base: 34, street: 3 },
  // New York n'est plus un disque : c'est l'île de Manhattan, longue et
  // étroite, dessinée par src/manhattan.js. Le rayon ne sert plus qu'à
  // délimiter grossièrement sa zone d'influence — la forme, elle, est donnée
  // par zoneManhattan().
  { key: 'ny', name: 'New York', x: 295, z: -110, r: 96, cell: 12, base: 33, street: 3 },
  { key: 'sf', name: 'San Francisco', x: 0, z: -320, r: 50, cell: 11, base: 33, street: 3 },
  { key: 'nice', name: 'Nice', x: 300, z: 260, r: 45, cell: 11, base: 32, street: 3 },
  { key: 'lille', name: 'Lille', x: -300, z: -200, r: 45, cell: 12, base: 34, street: 3 },
];

// SF painted-lady facades reuse the plain decor blocks (Uni pattern).
const SF_PASTELS = [15, 9, 29, 28, 16, 3, 4, 7].map((ci) => DECOR_START + ci * 10);
// Nice: warm Mediterranean facades (ochre, orange, rose, cream, sand).
const NICE_WARM = [1, 2, 16, 15, 28, 20].map((ci) => DECOR_START + ci * 10);

export class World {
  constructor() {
    this.chunks = new Map();      // "cx,cz" -> Uint8Array
    this.tops = new Map();        // "cx,cz" -> y du bloc le plus haut (plafond de maillage)
    this.dirty = new Set();       // chunk keys needing a remesh
    this.edits = new Map();       // "x,y,z" -> block id (player modifications)
    this.editTimes = new Map();   // "x,y,z" -> ms timestamp, for multiplayer merge
    this.onOp = null;             // hook(k, id, ts) — net layer broadcasts local edits
    this.ctx = 'local';           // monde courant : 'local' ou le code du monde en ligne
    this.allDirty = false;        // tout remailler (changement de monde)
  }

  static key(cx, cz) { return cx + ',' + cz; }

  static index(x, y, z) { return x + z * CHUNK + y * CHUNK * CHUNK; }

  terrainHeight(x, z) {
    const mountains = fbm(x * 0.0035, z * 0.0035, SEED + 9001);
    const hills = fbm(x * 0.016, z * 0.016, SEED);
    let h = 24 + hills * 14 + Math.pow(mountains, 3) * 48;

    // seas: low continentalness sinks the land, but never near spawn
    // (pushed far out so the playable continent is ~8x larger)
    const distO = Math.hypot(x, z);
    const oceanFactor = Math.min(1, Math.max(0, (distO - 260) / 120));
    const continent = fbm(x * 0.005, z * 0.005, SEED + 501);
    if (continent < 0.45) h -= (0.45 - continent) * 130 * oceanFactor;

    // lakes: small pockets carved below water level
    const lake = fbm(x * 0.03, z * 0.03, SEED + 601);
    if (lake > 0.72) h = Math.min(h, WATER_LEVEL - 2 - (lake - 0.72) * 30);

    // city districts: Paris and New York are flat plateaus; San Francisco
    // keeps its rolling hills so its streets climb like the real thing
    for (const c of CITIES) {
      if (c.key === 'ny') continue;   // Manhattan est une île : cf. plus bas
      const cd = Math.hypot(x - c.x, z - c.z);
      if (cd < c.r) {
        const m = Math.min(1, (c.r - cd) / 16);
        const target = c.key === 'sf' ? c.base + hills * 10 : c.base;
        h = h * (1 - m) + target * m;
        break;
      }
    }

    // Manhattan ne se pose pas sur le continent : elle en est détachée par
    // l'Hudson et l'East River. C'est le seul quartier dont le terrain est
    // creusé autant que nivelé.
    h = hauteurManhattan(x, z, h);

    // the amusement park sits on its own flat esplanade
    const pd = Math.hypot(x - PARK.x, z - PARK.z);
    if (pd < PARK.r) {
      const m = Math.min(1, (PARK.r - pd) / 14);
      h = h * (1 - m) + 33 * m;
    }

    // le château : terrain plat, sinon la douve se vide d'un côté
    const kd = Math.hypot(x - CASTLE.x, z - CASTLE.z);
    if (kd < CASTLE.r) {
      const m = Math.min(1, (CASTLE.r - kd) / 14);
      h = h * (1 - m) + 34 * m;
    }

    // Villandry : le domaine est terrassé, donc parfaitement plat. Les trois
    // niveaux sont bâtis en blocs par le constructeur, pas creusés dans le sol.
    const vd2 = Math.hypot(x - VILLANDRY.x, z - VILLANDRY.z);
    if (vd2 < VILLANDRY.r) {
      const m = Math.min(1, (VILLANDRY.r - vd2) / 16);
      h = h * (1 - m) + 34 * m;
    }

    // L'aéroport : plat jusqu'au dernier bloc, et sur un large rayon. Une piste
    // qui ondule n'est pas une piste ; le raccord au terrain naturel se fait
    // donc sur une trentaine de blocs, bien plus doucement qu'ailleurs.
    // Le raccord au terrain naturel se fait sur les vingt derniers blocs
    // seulement : tout l'intérieur, jusqu'au rayon 72, est rigoureusement plat.
    // Avec un raccord plus long, les bouts de piste retombaient dans la pente
    // et le tarmac flottait au-dessus du vide.
    const ad = Math.hypot(x - AEROPORT.x, z - AEROPORT.z);
    if (ad < AEROPORT.r) {
      const m = Math.min(1, (AEROPORT.r - ad) / 20);
      h = h * (1 - m) + 35 * m;
    }

    // Le village gaulois et le camp romain : une clairière plate au bord de la
    // mer. Le raccord se fait sur vingt-cinq blocs, assez pour que la côte
    // reste une côte au lieu d'une falaise.
    const gd = Math.hypot(x - GAULOIS.x, z - GAULOIS.z);
    if (gd < GAULOIS.r) {
      const m = Math.min(1, (GAULOIS.r - gd) / 25);
      h = h * (1 - m) + 34 * m;
    }

    // La base spatiale : une plaine de sable rigoureusement plate, comme
    // l'aéroport — on y fait décoller des vaisseaux.
    const ed = Math.hypot(x - ESPACE.x, z - ESPACE.z);
    if (ed < ESPACE.r) {
      const m = Math.min(1, (ESPACE.r - ed) / 18);
      h = h * (1 - m) + 36 * m;
    }

    // Le circuit : une piste qui ondule n'est plus une piste. Terrain plat
    // jusqu'au rayon 70, raccord sur les dix-huit derniers blocs.
    const cd = Math.hypot(x - CIRCUIT.x, z - CIRCUIT.z);
    if (cd < CIRCUIT.r) {
      const m = Math.min(1, (CIRCUIT.r - cd) / 18);
      h = h * (1 - m) + 35 * m;
    }

    // the desert: gentle sandy dunes
    const dd = Math.hypot(x - DESERT.x, z - DESERT.z);
    if (dd < DESERT.r) {
      const m = Math.min(1, (DESERT.r - dd) / 20);
      h = h * (1 - m) + (33 + hills * 4) * m;
    }

    // the tropical island rises out of the open sea
    const id2 = Math.hypot(x - ISLAND.x, z - ISLAND.z);
    if (id2 < ISLAND.r) {
      const m = Math.min(1, (ISLAND.r - id2) / 12);
      h = h * (1 - m) + (32 + Math.max(0, (ISLAND.r - 8 - id2) / 6)) * m;
    }

    // Mars : un plateau élevé, sec, criblé de cratères. Une grille régulière
    // dont chaque case porte au plus un cratère décalé au hasard suffit à
    // donner un relief crédible sans jamais rien mémoriser.
    const md = Math.hypot(x - MARS.x, z - MARS.z);
    if (md < MARS.r) {
      const m = Math.min(1, (MARS.r - md) / 24);
      let sol = 40 + fbm(x * 0.02, z * 0.02, SEED + 991) * 6;
      const CASE = 38;
      const gx = Math.floor(x / CASE), gz = Math.floor(z / CASE);
      for (let ax = -1; ax <= 1; ax++) {
        for (let az = -1; az <= 1; az++) {
          const cx2 = (gx + ax) * CASE + hash2i(gx + ax, gz + az, SEED + 992) * CASE;
          const cz2 = (gz + az) * CASE + hash2i(gx + ax, gz + az, SEED + 993) * CASE;
          const r2 = 7 + hash2i(gx + ax, gz + az, SEED + 994) * 12;
          sol += cratere(Math.hypot(x - cx2, z - cz2), r2);
        }
      }
      // l'esplanade de la base reste plate : une fusée sur un cratère penche
      const bd = Math.hypot(x - MARS.x, z - MARS.z);
      if (bd < 30) sol = sol * (bd / 30) + 41 * (1 - bd / 30);
      h = h * (1 - m) + sol * m;
    }

    // the volcano: a tall cone with a lava crater at the top
    const vd = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
    if (vd < VOLCANO.r) {
      const m = Math.min(1, (VOLCANO.r - vd) / 10);
      let cone = 34 + (1 - vd / VOLCANO.r) * 34;
      if (vd < 7) cone = 34 + (1 - 7 / VOLCANO.r) * 34 - (7 - vd) - 2; // crater bowl
      h = h * (1 - m) + cone * m;
    }

    return Math.max(2, Math.min(HEIGHT - 16, Math.floor(h)));
  }

  cityAt(x, z) {
    for (const c of CITIES) {
      if (Math.hypot(x - c.x, z - c.z) >= c.r) continue;
      // Manhattan tient dans ce cercle mais n'en occupe qu'une bande : hors de
      // l'île et de ses fleuves, on est en pleine campagne, avec ses arbres.
      if (c.key === 'ny' && !surTerre(x, z)) continue;
      return c;
    }
    return null;
  }

  // Densité de forêt en un point, entre 0 et 1. C'est le même bruit qui décide
  // où treeAt plantera des arbres — la carte peut donc dessiner les bois
  // partout, y compris là où pas un seul morceau de monde n'a été fabriqué.
  foret(x, z) {
    if (this.cityAt(x, z)) return 0;
    // La rampe suit les seuils de treeAt : rien avant 0,52, forêt pleine à
    // 0,70. La carte doit dire la même chose que le monde — sinon la limite du
    // terrain chargé se voit comme un carré plus clair au milieu de l'image.
    return Math.max(0, Math.min(1, (fbm(x * 0.008, z * 0.008, SEED + 701) - 0.52) / 0.18));
  }

  treeAt(x, z) {
    // Central Park compte vingt mille arbres : c'est le seul endroit d'une
    // ville où la forêt a le droit de repousser.
    if (dansCentralPark(x, z)) {
      if (hash2i(x, z, SEED + 777) >= 0.05) return null;
      const hp = this.terrainHeight(x, z);
      if (hp <= WATER_LEVEL + 1) return null;
      const roll = hash2i(x, z, SEED + 779);
      return { h: hp, trunk: 4 + Math.floor(hash2i(x, z, SEED + 778) * 3), kind: roll < 0.7 ? 0 : 1 };
    }
    if (this.cityAt(x, z)) return null; // no wild trees downtown
    if (Math.hypot(x - PARK.x, z - PARK.z) < PARK.r) return null; // park is kept open
    if (Math.hypot(x - DESERT.x, z - DESERT.z) < DESERT.r) return null; // cactuses only
    if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < VOLCANO.r) return null; // bare rock
    if (Math.hypot(x - MARS.x, z - MARS.z) < MARS.r) return null; // rien ne pousse sur Mars
    if (Math.hypot(x - VILLANDRY.x, z - VILLANDRY.z) < VILLANDRY.r) return null; // les jardins sont dessinés, pas sauvages
    if (Math.hypot(x - AEROPORT.x, z - AEROPORT.z) < AEROPORT.r) return null;     // pas d'arbre au milieu des pistes
    // au village, les arbres sont plantés par le constructeur, pas au hasard
    if (Math.hypot(x - GAULOIS.x, z - GAULOIS.z) < 52) return null;
    if (Math.hypot(x - ESPACE.x, z - ESPACE.z) < ESPACE.r) return null;   // rien ne pousse ici
    if (Math.hypot(x - CIRCUIT.x, z - CIRCUIT.z) < CIRCUIT.r - 6) return null;  // pas d'arbre sur la piste
    // the tropical island grows palm trees instead
    const di = Math.hypot(x - ISLAND.x, z - ISLAND.z);
    if (di < ISLAND.r) {
      if (di > ISLAND.r - 14 || hash2i(x, z, SEED + 785) >= 0.05) return null;
      const hi = this.terrainHeight(x, z);
      if (hi <= WATER_LEVEL) return null;
      return { h: hi, trunk: 6 + Math.floor(hash2i(x, z, SEED + 786) * 3), kind: 3 };
    }
    // forests are dense, plains nearly bare
    const forest = fbm(x * 0.008, z * 0.008, SEED + 701);
    const density = forest > 0.62 ? 0.06 : forest > 0.48 ? 0.015 : 0.0025;
    if (hash2i(x, z, SEED + 777) >= density) return null;
    const h = this.terrainHeight(x, z);
    if (h <= WATER_LEVEL + 1 || h >= 58) return null; // only on grass
    const trunk = 4 + Math.floor(hash2i(x, z, SEED + 778) * 3); // 4..6
    // three silhouettes: oak, pine, birch
    const roll = hash2i(x, z, SEED + 779);
    const kind = roll < 0.55 ? 0 : roll < 0.85 ? 1 : 2;
    return { h, trunk: kind === 2 ? trunk + 1 : trunk, kind };
  }

  generateChunk(cx, cz) {
    // 16-bit: block ids go beyond 255 with the decorative set
    const data = new Uint16Array(CHUNK * CHUNK * HEIGHT);
    const baseX = cx * CHUNK, baseZ = cz * CHUNK;

    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        const wx = baseX + x, wz = baseZ + z;
        const h = this.terrainHeight(wx, wz);

        let top = BLOCK.GRASS;
        let filler = BLOCK.DIRT;
        if (h <= WATER_LEVEL + 1) { top = BLOCK.SAND; filler = BLOCK.SAND; }
        else if (h >= 58) { top = BLOCK.SNOW; filler = BLOCK.STONE; }

        // biome overrides: sandy desert, rocky volcano with a lava crater
        const dd = Math.hypot(wx - DESERT.x, wz - DESERT.z);
        if (dd < DESERT.r - 2) { top = BLOCK.SAND; filler = BLOCK.SAND; }
        if (Math.hypot(wx - MARS.x, wz - MARS.z) < MARS.r - 2) {
          top = BLOCK.MARS_SOL; filler = BLOCK.MARS_ROCHE;
        }
        const vd = Math.hypot(wx - VOLCANO.x, wz - VOLCANO.z);
        if (vd < VOLCANO.r - 2 && h > 36) {
          filler = BLOCK.STONE;
          top = hash2i(wx, wz, SEED + 891) < 0.18 ? BLOCK.OBSIDIAN : BLOCK.STONE;
          if (vd < 5.5) top = hash2i(wx, wz, SEED + 892) < 0.3 ? LAVA_HOT : LAVA; // the lava lake
        }

        // winding caves under the surface, with glittering ore pockets
        const caveTunnel = Math.abs(fbm(wx * 0.02, wz * 0.02, SEED + 882) - 0.5);
        const caveY = 8 + fbm(wx * 0.01, wz * 0.01, SEED + 881) * 18;
        const city = this.cityAt(wx, wz);
        // rare open shafts let explorers climb in from the surface
        const entrance = !city && caveTunnel < 0.015 && h > WATER_LEVEL + 2 && h < 50 && caveY > h - 12;

        for (let y = 0; y <= h; y++) {
          let id;
          if (y === h) id = top;
          else if (y >= h - 3) id = filler;
          else id = BLOCK.STONE;
          if (caveTunnel < 0.05 && y > 3 && (id === BLOCK.STONE || entrance)) {
            const dy = Math.abs(y - caveY);
            if (dy < 2.2 || (entrance && y > caveY && y <= h)) id = BLOCK.AIR;
            else if (dy < 3.4) {
              const o = hash2i(wx + y * 977, wz - y * 331, SEED + 883);
              if (o < 0.05) id = BLOCK.GOLD;
              else if (o < 0.08) id = BLOCK.DIAMOND;
            }
          }
          data[World.index(x, y, z)] = id;
        }
        for (let y = h + 1; y <= WATER_LEVEL; y++) {
          data[World.index(x, y, z)] = BLOCK.WATER;
        }

        // Manhattan a son propre dessin de sol : avenues numérotées, rues tous
        // les cinq blocs, Broadway en diagonale, Central Park et ses pièces
        // d'eau. Une colonne, une décision — comme pour les autres villes.
        if (city && city.key === 'ny') {
          if (h > WATER_LEVEL) {
            const sol = solManhattan(wx, wz);
            if (sol !== null) data[World.index(x, h, z)] = sol;
            else {
              batirColonne(wx, wz, (dy, id) => {
                const wy = h + dy;
                if (wy >= 0 && wy < HEIGHT) data[World.index(x, wy, z)] = id;
              }, true);   // le sol a déjà répondu « rien à poser ici »
            }
          }
          continue;   // la trame générique ne s'applique pas ici
        }

        // city streets: asphalt with sidewalks, dashed center lines and
        // crosswalks at intersections
        if (city && Math.hypot(wx - city.x, wz - city.z) < city.r - 4 && h > WATER_LEVEL) {
          const w = city.street;
          const mid = Math.floor(w / 2);
          const mx = ((wx % city.cell) + city.cell) % city.cell;
          const mz = ((wz % city.cell) + city.cell) % city.cell;
          const inX = mx < w, inZ = mz < w;
          if (inX || inZ) {
            let id = CITY_BLOCK.ASPHALT;
            if (inX && inZ) {
              id = (mx + mz) % 2 === 0 ? CITY_BLOCK.CROSSWALK : CITY_BLOCK.ASPHALT;
            } else if (inX && (mx === 0 || mx === w - 1)) {
              id = CITY_BLOCK.SIDEWALK;
            } else if (inZ && (mz === 0 || mz === w - 1)) {
              id = CITY_BLOCK.SIDEWALK;
            } else if (inX && mx === mid && ((wz & 7) < 4)) {
              id = CITY_BLOCK.ROADLINE;
            } else if (inZ && mz === mid && ((wx & 7) < 4)) {
              id = CITY_BLOCK.ROADLINE;
            }
            data[World.index(x, h, z)] = id;
          }
        }
      }
    }

    // Trees — scan a border so canopies from neighbouring chunks reach in.
    for (let tz = baseZ - 3; tz < baseZ + CHUNK + 3; tz++) {
      for (let tx = baseX - 3; tx < baseX + CHUNK + 3; tx++) {
        const tree = this.treeAt(tx, tz);
        if (!tree) continue;
        const { h, trunk, kind } = tree;
        const topY = h + trunk;

        const put = (wx, wy, wz, id, replaceOnlyAir) => {
          const lx = wx - baseX, lz = wz - baseZ;
          if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || wy < 0 || wy >= HEIGHT) return;
          const i = World.index(lx, wy, lz);
          if (replaceOnlyAir && data[i] !== BLOCK.AIR) return;
          data[i] = id;
        };

        if (kind === 3) {
          // palm: a star of drooping fronds at the very top
          for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
            put(tx + fx, topY, tz + fz, BLOCK.LEAVES, true);
            put(tx + fx * 2, topY, tz + fz * 2, BLOCK.LEAVES, true);
            put(tx + fx * 3, topY - 1, tz + fz * 3, BLOCK.LEAVES, true);
          }
          put(tx, topY + 1, tz, BLOCK.LEAVES, true);
        } else if (kind === 1) {
          // pine: stacked shrinking rings of needles
          const layers = [[topY - 2, 2], [topY - 1, 2], [topY, 1], [topY + 1, 1], [topY + 2, 0]];
          for (const [y, r] of layers) {
            for (let dx = -r; dx <= r; dx++) {
              for (let dz = -r; dz <= r; dz++) {
                if (Math.abs(dx) === r && Math.abs(dz) === r && r > 1) continue;
                if (dx === 0 && dz === 0 && y <= topY) continue;
                put(tx + dx, y, tz + dz, BLOCK.LEAVES, true);
              }
            }
          }
        } else if (kind === 2) {
          // birch: tall pale trunk, small round crown
          for (let dy = -1; dy <= 1; dy++) {
            const r = dy === 0 ? 1 : 1;
            for (let dx = -r; dx <= r; dx++) {
              for (let dz = -r; dz <= r; dz++) {
                if (Math.abs(dx) === r && Math.abs(dz) === r && dy !== 0) continue;
                if (dx === 0 && dz === 0 && dy < 0) continue;
                put(tx + dx, topY + dy, tz + dz, BLOCK.LEAVES, true);
              }
            }
          }
          put(tx, topY + 2, tz, BLOCK.LEAVES, true);
        } else {
          // oak: the classic broad canopy
          for (let dy = -2; dy <= 1; dy++) {
            const y = topY + dy;
            const r = dy < 0 ? 2 : 1;
            for (let dx = -r; dx <= r; dx++) {
              for (let dz = -r; dz <= r; dz++) {
                if (Math.abs(dx) === r && Math.abs(dz) === r && dy >= 0) continue;
                if (dx === 0 && dz === 0 && dy < 0) continue; // trunk passes through
                put(tx + dx, y, tz + dz, BLOCK.LEAVES, true);
              }
            }
          }
          put(tx, topY + 2, tz, BLOCK.LEAVES, true);
        }
        // trunk
        const trunkBlock = kind === 2 ? BLOCK.BIRCH : BLOCK.LOG;
        for (let y = h + 1; y <= topY; y++) put(tx, y, tz, trunkBlock, false);
      }
    }

    // City buildings: one lot per grid cell, deterministic per cell.
    const stamp = (wx, wy, wz, id) => {
      const lx = wx - baseX, lz = wz - baseZ;
      if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || wy < 0 || wy >= HEIGHT) return;
      data[World.index(lx, wy, lz)] = id;
    };
    // Landmarks get an open plaza — no buildings on top of them.
    const nearLandmark = (ccx, ccz) =>
      LANDMARKS.some((lm) => Math.abs(ccx - lm.x) < lm.box + 7 && Math.abs(ccz - lm.z) < lm.box + 7);

    // Fill from the build level down to the terrain so hillside houses
    // never float (essential on San Francisco's slopes).
    const foundation = (wx, wz, by, id) => {
      const th = this.terrainHeight(wx, wz);
      for (let y = by - 1; y > th; y--) stamp(wx, y, wz, id);
    };

    for (const city of CITIES) {
      if (city.key === 'ny') continue;   // Manhattan se bâtit colonne par colonne
      const CELL = city.cell;
      const minGX = Math.floor((baseX - CELL) / CELL), maxGX = Math.floor((baseX + CHUNK + CELL) / CELL);
      const minGZ = Math.floor((baseZ - CELL) / CELL), maxGZ = Math.floor((baseZ + CHUNK + CELL) / CELL);
      for (let gz = minGZ; gz <= maxGZ; gz++) {
        for (let gx = minGX; gx <= maxGX; gx++) {
          const lotX = gx * CELL, lotZ = gz * CELL;
          const ccx = lotX + CELL / 2, ccz = lotZ + CELL / 2;
          if (Math.hypot(ccx - city.x, ccz - city.z) > city.r - 10) continue;
          if (nearLandmark(ccx, ccz)) continue;
          if (hash2i(gx, gz, SEED + 801) > 0.85) continue; // pocket park
          const by = this.terrainHeight(Math.floor(ccx), Math.floor(ccz)) + 1;
          const x0 = lotX + city.street, x1 = lotX + CELL - 2;
          const z0 = lotZ + city.street, z1 = lotZ + CELL - 2;
          const doorX = Math.floor((x0 + x1) / 2);

          if (city.key === 'paris') {
            // Haussmann: uniform cream stone, tall window bays, zinc mansard
            const bh = 6 + Math.floor(hash2i(gx, gz, SEED + 802) * 2);
            for (let y = 0; y < bh; y++) {
              for (let wx = x0; wx <= x1; wx++) {
                for (let wz = z0; wz <= z1; wz++) {
                  const wall = wx === x0 || wx === x1 || wz === z0 || wz === z1;
                  if (!wall) { if (y === 0) stamp(wx, by - 1, wz, BLOCK.PLANK); continue; }
                  if (y === 0) foundation(wx, wz, by, CITY_BLOCK.HAUSSMANN);
                  const u = (wx === x0 || wx === x1) ? wz : wx;
                  const win = y > 0 && y % 3 !== 0 && u % 2 === 1;
                  stamp(wx, by + y, wz, win ? BLOCK.GLASS : CITY_BLOCK.HAUSSMANN);
                }
              }
            }
            for (let wx = x0; wx <= x1; wx++) {
              for (let wz = z0; wz <= z1; wz++) stamp(wx, by + bh, wz, CITY_BLOCK.ZINC);
            }
            for (let wx = x0 + 1; wx <= x1 - 1; wx++) {
              for (let wz = z0 + 1; wz <= z1 - 1; wz++) stamp(wx, by + bh + 1, wz, CITY_BLOCK.ZINC);
            }
            for (let wx = x0 + 2; wx <= x1 - 2; wx++) {
              for (let wz = z0 + 2; wz <= z1 - 2; wz++) stamp(wx, by + bh + 2, wz, BLOCK.SLAB_STONE);
            }
            stamp(doorX, by, z0, BLOCK.AIR);
            stamp(doorX, by + 1, z0, BLOCK.AIR);

          } else if (city.key === 'nice') {
            // Nice: warm Mediterranean facades with terracotta roofs
            const mat = NICE_WARM[Math.floor(hash2i(gx, gz, SEED + 830) * NICE_WARM.length)];
            const bh = 4 + Math.floor(hash2i(gx, gz, SEED + 802) * 2);
            for (let y = 0; y < bh; y++) {
              for (let wx = x0; wx <= x1; wx++) {
                for (let wz = z0; wz <= z1; wz++) {
                  const wall = wx === x0 || wx === x1 || wz === z0 || wz === z1;
                  if (!wall) { if (y === 0) stamp(wx, by - 1, wz, BLOCK.SANDSTONE); continue; }
                  if (y === 0) foundation(wx, wz, by, mat);
                  const u = (wx === x0 || wx === x1) ? wz : wx;
                  const win = y > 0 && y % 3 !== 0 && u % 2 === 1;
                  stamp(wx, by + y, wz, win ? BLOCK.GLASS : mat);
                }
              }
            }
            for (let wx = x0; wx <= x1; wx++) { // terracotta tiled roof
              for (let wz = z0; wz <= z1; wz++) stamp(wx, by + bh, wz, BLOCK.TERRACOTTA);
            }
            for (let wx = x0 + 1; wx <= x1 - 1; wx++) {
              for (let wz = z0 + 1; wz <= z1 - 1; wz++) stamp(wx, by + bh + 1, wz, BLOCK.SLAB_BRICK);
            }
            stamp(doorX, by, z0, BLOCK.AIR);
            stamp(doorX, by + 1, z0, BLOCK.AIR);

          } else if (city.key === 'lille') {
            // Lille: Flemish red-brick row houses with stepped gables
            const mat = hash2i(gx, gz, SEED + 840) > 0.5 ? BLOCK.BRICK : BLOCK.DARKBRICK;
            const bh = 5 + Math.floor(hash2i(gx, gz, SEED + 802) * 2);
            for (let y = 0; y < bh; y++) {
              for (let wx = x0; wx <= x1; wx++) {
                for (let wz = z0; wz <= z1; wz++) {
                  const wall = wx === x0 || wx === x1 || wz === z0 || wz === z1;
                  if (!wall) { if (y === 0) stamp(wx, by - 1, wz, BLOCK.PLANK); continue; }
                  if (y === 0) foundation(wx, wz, by, mat);
                  const u = (wx === x0 || wx === x1) ? wz : wx;
                  // white stone lintel bands between floors, Flemish style
                  if (y > 0 && y % 3 === 0) { stamp(wx, by + y, wz, BLOCK.WHITEBRICK); continue; }
                  const win = y > 0 && u % 2 === 1;
                  stamp(wx, by + y, wz, win ? BLOCK.GLASS : mat);
                }
              }
            }
            // stepped gable roof: brick rows shrinking toward the ridge
            for (let s = 0; s < 3; s++) {
              for (let wx = x0 + s; wx <= x1 - s; wx++) {
                for (let wz = z0 + s; wz <= z1 - s; wz++) stamp(wx, by + bh + s, wz, s === 2 ? BLOCK.SLAB_BRICK : mat);
              }
            }
            stamp(doorX, by, z0, BLOCK.AIR);
            stamp(doorX, by + 1, z0, BLOCK.AIR);

          } else {
            // San Francisco: pastel painted ladies with white trim and bay windows
            const mat = SF_PASTELS[Math.floor(hash2i(gx, gz, SEED + 820) * SF_PASTELS.length)];
            const bh = 4 + Math.floor(hash2i(gx, gz, SEED + 802) * 2);
            for (let y = 0; y < bh; y++) {
              for (let wx = x0; wx <= x1; wx++) {
                for (let wz = z0; wz <= z1; wz++) {
                  const wall = wx === x0 || wx === x1 || wz === z0 || wz === z1;
                  if (!wall) { if (y === 0) stamp(wx, by - 1, wz, BLOCK.PLANK); continue; }
                  if (y === 0) foundation(wx, wz, by, mat);
                  const corner = (wx === x0 || wx === x1) && (wz === z0 || wz === z1);
                  const u = (wx === x0 || wx === x1) ? wz : wx;
                  const win = y > 0 && y % 3 !== 0 && u % 2 === 1;
                  stamp(wx, by + y, wz, corner ? BLOCK.WHITEBRICK : win ? BLOCK.GLASS : mat);
                }
              }
            }
            for (let y = 1; y < bh; y++) { // street-side bay window
              stamp(doorX, by + y, z0 - 1, y % 2 === 1 ? BLOCK.GLASS : mat);
            }
            foundation(doorX, z0 - 1, by + 1, mat);
            for (let wx = x0; wx <= x1; wx++) { // white cornice roof
              for (let wz = z0; wz <= z1; wz++) stamp(wx, by + bh, wz, BLOCK.WHITEBRICK);
            }
            for (let wx = x0 + 1; wx <= x1 - 1; wx++) {
              for (let wz = z0 + 1; wz <= z1 - 1; wz++) stamp(wx, by + bh + 1, wz, BLOCK.SLAB_STONE);
            }
            stamp(x0 + 1, by, z0, BLOCK.AIR); // SF doors sit to the side
            stamp(x0 + 1, by + 1, z0, BLOCK.AIR);
          }
        }
      }
    }

    // Landmarks (fixed world positions, deterministic base height).
    for (const lm of LANDMARKS) {
      if (lm.x + lm.box < baseX || lm.x - lm.box >= baseX + CHUNK ||
          lm.z + lm.box < baseZ || lm.z - lm.box >= baseZ + CHUNK) continue;
      let baseY = this.terrainHeight(lm.x, lm.z);
      if (lm.waterBase) baseY = Math.max(baseY, WATER_LEVEL - 1);
      lm.build((dx, dy, dz, id) => {
        const lx = lm.x + dx - baseX, lz = lm.z + dz - baseZ;
        const wy = baseY + dy;
        if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || wy < 0 || wy >= HEIGHT) return;
        data[World.index(lx, wy, lz)] = id;
      });
    }

    // Re-apply player edits inside this chunk.
    for (const [k, id] of this.edits) {
      const [ex, ey, ez] = k.split(',').map(Number);
      if (Math.floor(ex / CHUNK) === cx && Math.floor(ez / CHUNK) === cz) {
        data[World.index(ex - baseX, ey, ez - baseZ)] = id;
      }
    }

    return data;
  }

  ensureChunk(cx, cz) {
    const key = World.key(cx, cz);
    let data = this.chunks.get(key);
    if (!data) {
      data = this.generateChunk(cx, cz);
      this.chunks.set(key, data);
    }
    return data;
  }

  // Le terrain n'occupe qu'une fraction des 96 niveaux : au-dessus, c'est de
  // l'air pur qu'il est inutile de parcourir. On mémorise la hauteur du bloc le
  // plus haut de chaque chunk pour que le mailleur s'arrête là.
  // Les blocs sont rangés par y croissant, donc un balayage arrière du tableau
  // sort dès le premier bloc plein rencontré.
  chunkTop(cx, cz) {
    const key = World.key(cx, cz);
    const connu = this.tops.get(key);
    if (connu !== undefined) return connu;
    const data = this.ensureChunk(cx, cz);
    let i = data.length - 1;
    while (i >= 0 && data[i] === BLOCK.AIR) i--;
    const top = i < 0 ? -1 : Math.floor(i / (CHUNK * CHUNK));
    this.tops.set(key, top);
    return top;
  }

  getBlock(x, y, z) {
    if (y < 0 || y >= HEIGHT) return BLOCK.AIR;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const data = this.ensureChunk(cx, cz);
    return data[World.index(x - cx * CHUNK, y, z - cz * CHUNK)];
  }

  setBlock(x, y, z, id, ts, remote = false) {
    if (y < 0 || y >= HEIGHT) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const data = this.ensureChunk(cx, cz);
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    data[World.index(lx, y, lz)] = id;
    const k = `${x},${y},${z}`;
    const t = ts !== undefined ? ts : Date.now();
    this.edits.set(k, id);
    this.editTimes.set(k, t);
    if (!remote && this.onOp) this.onOp(k, id, t);

    // maintien du plafond de maillage : on le relève tout de suite quand on
    // pose plus haut, on l'oublie (recalcul paresseux) quand on creuse au sommet
    const ck = World.key(cx, cz);
    const top = this.tops.get(ck);
    if (top !== undefined) {
      if (id !== BLOCK.AIR) { if (y > top) this.tops.set(ck, y); }
      else if (y >= top) this.tops.delete(ck);
    }

    this.dirty.add(World.key(cx, cz));
    if (lx === 0) this.dirty.add(World.key(cx - 1, cz));
    if (lx === CHUNK - 1) this.dirty.add(World.key(cx + 1, cz));
    if (lz === 0) this.dirty.add(World.key(cx, cz - 1));
    if (lz === CHUNK - 1) this.dirty.add(World.key(cx, cz + 1));
  }

  // --- multiplayer sync: last-writer-wins merge of timestamped edit logs ----

  exportEdits() {
    const out = {};
    for (const [k, id] of this.edits) out[k] = [id, this.editTimes.get(k) || 0];
    return out;
  }

  // Applies every entry that is newer than what we have (ties broken by
  // block id so both sides converge on identical worlds). Returns the
  // number of blocks that changed.
  mergeEdits(blocks) {
    let applied = 0;
    for (const [k, entry] of Object.entries(blocks || {})) {
      const [id, t] = entry;
      const localT = this.editTimes.has(k) ? this.editTimes.get(k) : -1;
      const localId = this.edits.get(k);
      if (t < localT || (t === localT && (localId === id || localId > id))) continue;
      const [x, y, z] = k.split(',').map(Number);
      this.setBlock(x, y, z, id, t, true);
      applied++;
    }
    return applied;
  }

  isSolid(x, y, z) {
    if (y < 0) return true; // never fall out of the world
    if (y >= HEIGHT) return false;
    return blockIsSolid(this.getBlock(x, y, z));
  }

  // --- persistence (player edits only; terrain is deterministic) ----------

  // Un enregistrement par monde : { "local": {...}, "30953": {...} }.
  //
  // Avant, tous les mondes partageaient une seule carte de blocs. Rejoindre
  // un monde en ligne versait donc ses blocs dans la maison qu'on venait de
  // construire tout seul, et le retour au monde local rapportait ceux des
  // copains. Il n'existait en réalité qu'un seul monde, quel que soit le
  // code tapé — et un enfant qui revenait sur « son » monde en ligne ne
  // retrouvait pas ce qu'il y avait laissé.
  static STORAGE_KEY = 'web-minecraft-edits-v3';
  static STORAGE_KEY_V2 = 'web-minecraft-edits-v2';
  static STORAGE_KEY_V1 = 'web-minecraft-edits-v1';

  static loadAll() {
    try {
      const raw = localStorage.getItem(World.STORAGE_KEY);
      if (raw) return JSON.parse(raw) || {};
    } catch { /* sauvegarde abîmée — on repart du terrain nu */ }
    return {};
  }

  static saveAll(all) {
    try { localStorage.setItem(World.STORAGE_KEY, JSON.stringify(all)); }
    catch { /* stockage plein : on joue quand même, le cloud a une copie */ }
  }

  // Reprend l'ancienne carte unique. Elle est réclamée à la fois par le monde
  // local et par le dernier monde en ligne visité : c'est la même carte qui
  // servait aux deux, et personne ne doit voir ses constructions disparaître
  // le jour de la mise à jour. Les deux mondes divergeront ensuite.
  static migrate(dernierMondeEnLigne) {
    try {
      if (localStorage.getItem(World.STORAGE_KEY)) return false;
      let plat = null;
      const v2 = localStorage.getItem(World.STORAGE_KEY_V2);
      if (v2) plat = JSON.parse(v2);
      else {
        const v1 = localStorage.getItem(World.STORAGE_KEY_V1);
        if (v1) {
          plat = {};
          for (const [k, id] of Object.entries(JSON.parse(v1) || {})) plat[k] = [id, 0];
        }
      }
      if (!plat || !Object.keys(plat).length) return false;
      const all = { local: plat };
      if (dernierMondeEnLigne) all[dernierMondeEnLigne] = plat;
      World.saveAll(all);
      return true;
    } catch { return false; }
  }

  loadEdits() {
    const map = World.loadAll()[this.ctx] || {};
    for (const [k, entry] of Object.entries(map)) {
      if (!Array.isArray(entry)) continue;
      this.edits.set(k, entry[0]);
      this.editTimes.set(k, entry[1] || 0);
    }
  }

  saveEdits() {
    const all = World.loadAll();
    all[this.ctx] = this.exportEdits();
    World.saveAll(all);
  }

  // Changer de monde : on range celui qu'on quitte, on oublie les morceaux de
  // terrain déjà fabriqués — ils portent les blocs de l'ancien monde — puis on
  // charge l'autre. `allDirty` dit à l'affichage de tout refaire.
  switchContext(ctx) {
    if (ctx === this.ctx) return;
    this.saveEdits();
    this.ctx = ctx;
    this.chunks.clear(); // le terrain est déterministe : il se régénère à l'identique
    this.tops.clear();
    this.edits.clear();
    this.editTimes.clear();
    this.loadEdits();
    this.allDirty = true;
  }

  // Efface le monde en cours seulement : réinitialiser sa maison ne doit pas
  // faire disparaître le monde en ligne où l'on construit avec les copains.
  clearSave() {
    const all = World.loadAll();
    delete all[this.ctx];
    World.saveAll(all);
    this.edits.clear();
    this.editTimes.clear();
    this.chunks.clear();
    this.tops.clear();
    this.allDirty = true;
  }
}
