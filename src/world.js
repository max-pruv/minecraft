// Infinite procedurally generated voxel world, stored as 16xHx16 chunks.

import { BLOCK, CITY_BLOCK, DECOR_START, PROP_START, ARCHI, isSolid as blockIsSolid } from './blocks.js';
import { buildVillandry } from './villandry.js';
import { buildAeroport } from './aeroport.js';
import {
  USINE, hauteurUsine, solUsine, buildUsine, buildParcUsine, dansLUsine,
} from './usine.js';
import { buildGaulois } from './gaulois.js';
import { buildEspace } from './espace.js';
import { buildVille } from './ville.js';
import { buildCircuit } from './circuit.js';
import { POLE, buildPole } from './pole.js';
import { PARC_ATTRACTIONS, buildParc, lieuxDuParc } from './parc.js';
import {
  SF, surTerreSF, surMarin, hauteurSF, solSF, lotSFLibre, LIEUX_SF, MONUMENTS_SF,
  buildTransamerica, buildCoit, buildSutro, buildFerryBuilding, buildPaintedLadies,
  buildPalaisBeauxArts, buildAlcatraz, batirColonneSF,
  buildGoldenGate, buildKarl, buildPier39, buildLombard, buildDragonGate, adresseSF,
} from './sanfrancisco.js';
import {
  NICE, surTerreNice, hauteurNice, solNice, lotNiceLibre, batirColonneNice,
  MONUMENTS_NICE, buildMassena, buildCathedraleRusse, buildCollineChateau,
  buildNegresco, buildPortLympia, buildSaleya, buildBaleine, buildPromenade,
} from './nice.js';
import {
  CHINE, hauteurChine, solChine, LIEUX_CHINE,
  buildMuraille, buildCiteInterdite, buildVillageChinois, buildGuilin, buildPandas,
} from './chine.js';
import {
  hauteurCapitales, solCapitales, landmarksCapitales, placesCapitales,
} from './capitales.js';
import {
  LONDRES, hauteurLondres, solLondres, lotLondresLibre, batirColonneLondres,
  MONUMENTS_LONDRES, lieuxDeLondres, pontLondres,
} from './londres.js';
import {
  hauteurVillesMonde, solVillesMonde, batirColonneVillesMonde, mobilierVillesMonde,
  landmarksVillesMonde, placesVillesMonde, dansVilleMonde,
} from './villesmonde.js';
import {
  LILLE, adresseLille, hauteurLille, solLille, lotLilleLibre, batirColonneLille,
  MONUMENTS_LILLE, buildVieilleBourse, buildPorteDeParis, buildCitadelle,
  buildColonneDeesse, buildOperaLille, buildBeffroiCCI, buildGareFlandres,
  buildTourDeLille, buildTreille,
} from './lille.js';
import {
  PARIS, BUTTE, CITE, zCite, hauteurParis, solParis, lotParisLibre, batirColonneParis, versSeine,
  LIEUX, buildNotreDame, buildSacreCoeur, buildPantheon, buildInvalides, buildOpera,
  buildMontparnasse, buildColonneBastille, buildMoulinRouge,
} from './paris.js';
import {
  WASHINGTON, WASHINGTON_R, surTerreWashington, dansEauWashington, hauteurWashington, solWashington,
  batirColonneWashington, MONUMENTS_DC, QUAIS_METRO,
} from './washington.js';
import {
  buildCapitole, buildObelisque, buildLincoln, buildMemorialGuerre, buildMaisonBlanche,
  buildCourSupreme, buildBibliotheque, buildUnionStation, buildGalerieArt, buildNGAEst,
  buildHistoireNaturelle, buildHistoireAmericaine, buildAirEspace, buildHirshhorn,
  buildIndienAmerique, buildArtsIndustries, buildChateauSmithsonian, buildFreer,
  buildAfroAmericain, buildTresor, buildArchives, buildArcChinatown, buildFordTheatre,
  buildJefferson, buildMLK, buildRoosevelt, buildCoree, buildVietnam, buildKennedyCenter,
  buildPentagone, buildSoldatInconnu, buildIwoJima,
  buildPontMemorial, buildPont14e, buildKeyBridge,
} from './dcmonuments.js';
import {
  NY, zoneManhattan, surTerre, hauteurManhattan, solManhattan, dansCentralPark, batirColonne,
  MONUMENTS, LIBERTE, buildEmpireState, buildChrysler, buildFlatiron, buildOneWTC,
  buildGrandCentral, buildTimesSquare, buildBourse, buildTrinity, buildLiberte, buildBrooklyn,
  buildArcheWashington, buildPontAcier, WALL, PARC, vDeRue, bordEst, vDuPlan,
} from './manhattan.js';
import { positionDe, cielDe, zDeLatitude } from './mondes.js';
import { surLaVoie, presDeLaVoie, voieEn, brancherSol } from './trains.js';

// LES CALOTTES POLAIRES. Le planisphère déclare « terre » tout ce qui passe
// le cercle arctique (78°) et l'Antarctique (−63°) — pour que le monde n'ait
// pas de trous — mais ce sol se rendait en campagne verte, et Max l'a vu sur
// la carte : deux bandes de prairie mouchetée en haut et en bas du monde. Au
// delà de ces deux lignes, le sol est NEIGE. La latitude ne dépendant que de
// z, la lisière se calcule une fois et le test par colonne est gratuit.
const Z_ARCTIQUE = Math.round(zDeLatitude(78));
const Z_ANTARCTIQUE = Math.round(zDeLatitude(-63));
const dansUneCalotte = (z) => z < Z_ARCTIQUE || z > Z_ANTARCTIQUE;
import { surTerreReelle, reliefReel } from './terre.js';

export const CHUNK = 16;

// LE CIEL MONTE, LE SOL NE BOUGE PAS.
//
// Le monde s'arrêtait à quatre-vingt-seize blocs. Le sol étant vers 45, il
// restait une cinquantaine de blocs de ciel : de quoi bâtir un immeuble, pas
// une tour Eiffel, qui en demande plus de cent à l'échelle des bâtiments. Le
// plafond passe donc à cent soixante.
//
// Toute la difficulté est là : des mondes existent déjà, avec des milliers de
// blocs posés par les enfants, et ces blocs sont repérés par leurs
// coordonnées absolues. Si le relief se décalait ne serait-ce que d'un bloc,
// une maison se retrouverait enterrée ou suspendue en l'air.
//
// Or le relief était plafonné à `HEIGHT - 16`. Lié au plafond, il aurait donc
// grandi avec lui. On le détache : `SOMMET_TERRAIN` garde la valeur qu'avait
// `HEIGHT - 16` jusqu'ici — quatre-vingts — et ne bougera plus, quel que soit
// le ciel qu'on ouvre au-dessus. Le paysage engendré reste identique au bloc
// près, et un témoin le vérifie sur deux cent mille colonnes.
export const HEIGHT = 160;
export const SOMMET_TERRAIN = 80;
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
  // LA TOUR EIFFEL, REFAITE POUR LE PARIS À VINGT-QUATRE BLOCS PAR KILOMÈTRE.
  //
  // L'ancienne faisait quarante et un blocs pour douze de large. À côté d'une
  // ville dont les immeubles font quatre blocs, elle passait ; à côté d'une
  // ville dont les immeubles en font neuf, c'était un pylône trapu.
  //
  // Et surtout : la tour Eiffel n'est pas une MASSE, c'est un TREILLIS. On
  // voit le ciel à travers, et c'est à cela qu'on la reconnaît avant même sa
  // silhouette — la première version d'ici, pleine, ressemblait à une cheminée
  // d'usine. On ne pose donc que quatre montants, des ceintures tous les cinq
  // blocs, et une diagonale par panneau. Tout le reste est du vide, exprès.
  //
  // Les proportions vraies sont 330 m de haut pour 125 m de côté. Ici la
  // hauteur suit l'étage (trois mètres et demi le bloc) et l'emprise suit le
  // sol (quarante-deux mètres le bloc) : élargir la base pour retrouver le
  // rapport vrai lui ferait manger le Champ-de-Mars entier.
  const FER = BLOCK.DARKBRICK;
  const H = 64, P1 = 16, P2 = 30, P3 = 52, PANNEAU = 6;

  // Le profil : la demi-portée à chaque hauteur. C'est une courbe, et Eiffel
  // l'a calculée — elle suit le vent, pas le compas.
  const portee = (y) => {
    if (y <= P1) return 6 - 3 * Math.pow(y / P1, 0.8);     // les jambes s'écartent
    if (y <= P2) return 3 - 1 * ((y - P1) / (P2 - P1));
    if (y <= P3) return 2 - 1 * ((y - P2) / (P3 - P2));
    return 0.4;                                            // la flèche
  };
  const rayon = (y) => Math.max(0, Math.round(portee(y)));

  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = -8; dz <= 8; dz++) set(dx, -1, dz, CITY_BLOCK.SIDEWALK); // le parvis
  }

  // La diagonale d'un panneau : UN SEUL bloc par niveau, qui se décale d'un
  // coin vers l'autre. La première version en posait trois — en projection les
  // quatre niveaux d'un panneau recouvraient la face entière, et la tour
  // redevenait une cheminée pleine. Un treillis, c'est d'abord du vide.
  const diagonale = (y, r, t) => {
    const d = Math.round(-r + (2 * r) * (t / PANNEAU));
    set(d, y, -r, FER); set(-d, y, r, FER); set(-r, y, -d, FER); set(r, y, d, FER);
  };

  for (let y = 0; y < H; y++) {
    const r = rayon(y);
    if (r <= 0) { set(0, y, 0, FER); continue; }
    // Les quatre montants. Épais de deux blocs dans les tout premiers niveaux
    // — ce sont des maçonneries —, d'un seul au-dessus.
    for (const sx of [-r, r]) {
      for (const sz of [-r, r]) {
        set(sx, y, sz, FER);
        if (y < 3) { set(sx - Math.sign(sx), y, sz, FER); set(sx, y, sz - Math.sign(sz), FER); }
      }
    }
    if (y % PANNEAU === 0) {                                                   // les ceintures
      for (let d = -r; d <= r; d++) {
        set(d, y, -r, FER); set(d, y, r, FER); set(-r, y, d, FER); set(r, y, d, FER);
      }
    } else if (r >= 2) {
      diagonale(y, r, y % PANNEAU);
    }
  }

  // Les trois plateformes, en encorbellement : elles débordent la tour, et ce
  // sont les trois traits horizontaux qu'on lit de loin.
  const plateforme = (y, r) => {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) < r - 1) continue;
        set(dx, y, dz, FER);
      }
    }
  };
  plateforme(P1, rayon(P1) + 1);
  plateforme(P2, rayon(P2) + 1);
  plateforme(P3, rayon(P3) + 1);

  // La grande arche entre les jambes : c'est ce qu'on voit du Trocadéro, et
  // c'est le seul détail qui distingue la tour d'un pylône à haute tension.
  for (let d = -6; d <= 6; d++) {
    const creux = Math.round(Math.sqrt(Math.max(0, 36 - d * d)) * 0.55);
    const y = P1 - 4 - creux;
    if (y < 1) continue;
    for (const c of [-6, 6]) { set(d, y, c, FER); set(c, y, d, FER); }
  }

  // La flèche et le phare.
  for (let y = H; y < H + 4; y++) set(0, y, 0, FER);
  set(0, H + 4, 0, BLOCK.GOLD);
  set(0, H + 5, 0, BLOCK.GLASS);
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

function buildSuspensionBridge(set, R = BLOCK.WOOL_RED) { // pont suspendu générique
  // Le Bay Bridge le prend en GRIS : le Golden Gate a désormais son propre
  // bâtisseur, orange international, dans sanfrancisco.js.
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

function buildArch(set) {
  // L'ARC DE TRIOMPHE. L'ancien faisait neuf blocs de large sur trois de
  // profondeur : vu du ciel, une dalle ; vu de la rue, un pilier. Or l'arc de
  // l'Étoile est un CUBE percé de deux passages qui se croisent — c'est un arc
  // à quatre faces, et c'est ce qui le distingue de tous les autres arcs.
  //
  // Cinquante mètres de large, quarante-cinq de haut, vingt-deux d'épaisseur :
  // les hauteurs suivent l'étage, l'emprise suit le sol, et treize blocs sur
  // sept rendent le rapport juste sans écraser la place.
  const S = CITY_BLOCK.HAUSSMANN;
  // Quarante-cinq mètres de haut : deux fois et demie la corniche
  // haussmannienne. C'est ce rapport qui le fait dominer l'Étoile — à quatorze
  // blocs il se cachait derrière les immeubles de la place.
  const R = 7, D = 4, H = 21;            // demi-largeur, demi-profondeur, hauteur
  const PASSAGE = 3, VOUTE = 11;         // demi-largeur du grand passage, sa clé

  for (let dx = -R - 3; dx <= R + 3; dx++) {
    for (let dz = -D - 3; dz <= D + 3; dz++) set(dx, -1, dz, CITY_BLOCK.SIDEWALK);
  }

  for (let y = 0; y < H; y++) {
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -D; dz <= D; dz++) {
        // Les deux passages voûtés, croisés. Une voûte est un demi-cercle :
        // elle se calcule, elle ne s'empile pas en marches.
        const arcX = Math.abs(dz) <= PASSAGE
          && y < VOUTE + Math.sqrt(Math.max(0, PASSAGE * PASSAGE - dz * dz)) * 1.4;
        const arcZ = Math.abs(dx) <= PASSAGE
          && y < VOUTE + Math.sqrt(Math.max(0, PASSAGE * PASSAGE - dx * dx)) * 1.4;
        if (arcX || arcZ) continue;
        // Le bandeau d'attique, en retrait : le haut de l'arc est plus étroit.
        if (y >= H - 4 && (Math.abs(dx) === R || Math.abs(dz) === D)) continue;
        set(dx, y, dz, S);
      }
    }
  }

  // La corniche, qui déborde, puis la terrasse.
  for (let dx = -R; dx <= R; dx++) {
    for (let dz = -D; dz <= D; dz++) set(dx, H - 4, dz, BLOCK.SLAB_STONE);
  }
  for (let dx = -R + 1; dx <= R - 1; dx++) {
    for (let dz = -D + 1; dz <= D - 1; dz++) set(dx, H, dz, BLOCK.SLAB_STONE);
  }
  // Les hauts-reliefs des quatre piliers : un liseré de pierre claire qui
  // casse la face nue — sans lui l'arc reste un bloc lisse de treize mètres.
  for (const dx of [-R, R]) {
    for (let y = 4; y <= 9; y++) for (const dz of [-1, 0, 1]) set(dx, y, dz, BLOCK.SANDSTONE);
  }
  for (const dz of [-D, D]) {
    for (let y = 4; y <= 9; y++) for (const dx of [-1, 0, 1]) set(dx, y, dz, BLOCK.SANDSTONE);
  }
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
        // une fenêtre est un DESSIN, pas un trou : le beffroi est creux, et
        // un bloc de verre y ouvrait une meurtrière sur le vide
        const window = y % 4 === 2 && (dx === 0 || dz === 0);
        set(dx, y, dz, window ? ARCHI.ETAGE : BLOCK.BRICK);
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
// Le parc d'attractions a son propre module : c'est lui qui décide de sa
// position et de son étendue, et le monde s'y conforme.
export const PARK = { name: "Parc d'attractions", x: PARC_ATTRACTIONS.x, z: PARC_ATTRACTIONS.z, r: PARC_ATTRACTIONS.r };

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
// La caserne et le commissariat sont AU CŒUR de Paris : ils suivent la ville,
// ils ne vivent pas à une adresse à eux. Les laisser sur des coordonnées écrites
// à la main, c'était les voir rester en rase campagne le jour où Paris bouge.
export const VILLE = { name: 'Caserne & Commissariat', ...positionDe('paris'), r: 50 };
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
  // La Giga-usine d'Austin, Texas : le nom vient du registre des mondes.
  { name: USINE().nom, x: USINE().x, z: USINE().z, r: USINE().r },
  // La Chine : une région culturelle entière — muraille, Cité interdite,
  // karsts, rizières, pandas — dans l'ancienne zone morte du nord.
  { name: 'Chine', x: CHINE.x, z: CHINE.z, r: CHINE.r },
  // La caserne et le commissariat sont bâtis au cœur de Paris, mais ils
  // n'étaient pas des destinations : on ne pouvait y aller qu'en tombant
  // dessus par hasard, au milieu d'une ville de cent dix blocs de large. Le
  // point d'arrivée est la place, entre les deux — de là on voit les deux
  // façades, les camions rouges et les voitures de patrouille.
  { name: 'Caserne & Commissariat', x: VILLE.x, z: VILLE.z + 14, r: 34 },
  // Manhattan a ses propres destinations : sans elles, on arrivait sur l'île
  // par son seul nom, à un endroit quelconque de vingt kilomètres de long.
  // Chacune est calculée depuis le plan, jamais recopiée : le jour où
  // l'échelle de l'île change, elles suivent au lieu de rester en arrière.
  { name: 'Central Park', x: NY.x - 8, z: NY.z + (PARC.v0 + PARC.v1) / 2, r: 34 },
  { name: 'Times Square', x: NY.x - 11, z: NY.z + vDeRue(42), r: 12 },
  { name: 'Wall Street', x: NY.x, z: NY.z + WALL.v - 3, r: 12 },
  { name: 'Washington Square', x: NY.x - 2, z: NY.z + 70, r: 12 },
  { name: 'SoHo', x: NY.x - 5, z: NY.z + 82, r: 12 },
  { name: 'Musée', x: -34, z: 40, r: 20 },
  { name: 'Quartier des enfants', x: 26, z: -14, r: 20 },
  // Washington : ses destinations, calculées depuis le plan comme celles de
  // Manhattan. Arriver « à Washington » sans elles, c'était atterrir quelque
  // part dans cent quarante blocs de capitale.
  { name: 'Le Mall', x: WASHINGTON.x - 60, z: WASHINGTON.z, r: 45 },
  { name: 'Capitole', x: WASHINGTON.x, z: WASHINGTON.z + 24, r: 18 },
  { name: 'Maison-Blanche', x: WASHINGTON.x - 115, z: WASHINGTON.z - 55, r: 14 },
  { name: 'Tidal Basin', x: WASHINGTON.x - 125, z: WASHINGTON.z + 36, r: 14 },
  { name: 'Georgetown', x: WASHINGTON.x - 222, z: WASHINGTON.z - 66, r: 20 },
  { name: 'Arlington', x: WASHINGTON.x - 230, z: WASHINGTON.z + 52, r: 22 },
  // Les stations de métro sont des destinations à part entière : c'est de
  // là qu'on prend le train, et une station qu'on ne sait pas trouver ne
  // sert à rien. Le point d'arrivée est le haut de l'escalier, pas le quai.
  ...QUAIS_METRO.map((q) => ({
    name: `Métro ${q.nom}`, x: WASHINGTON.x + q.u, z: WASHINGTON.z + q.v, r: 0,
  })),
  // Le tour du monde : une destination par ville, et une par monument. Sans
  // elles on arriverait « à Rome » sans savoir de quel côté regarder.
  ...placesCapitales(),
  ...placesVillesMonde(),
  // Les destinations de Londres : la ville, puis ses hauts lieux.
  { name: 'Londres', x: LONDRES.x, z: LONDRES.z, r: LONDRES.r },
  ...lieuxDeLondres().map((p) => ({ name: p.name, x: p.x, z: p.z, r: 0 })),
];

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
// UN ARBRE D'ALIGNEMENT, PAS UN CARRÉ VERT.
//
// Les fonctions `sol*` d'une ville rendent un identifiant de SOL. Un feuillage
// rendu comme tel se pose à plat : de la pelouse sur le bitume. Paris l'a payé
// en v187 ; Nice, Lille et Londres marquaient leurs arbres exactement de la
// même façon et n'avaient jamais reçu le remède.
//
// Deux cas, et le second est celui qu'on oublie :
//  — la colonne EST l'arbre : un fût de deux blocs, une couronne de trois ;
//  — la colonne est AU PIED d'un arbre voisin : elle reçoit le débord de la
//    couronne. Sans lui, un arbre large d'un seul bloc est un poteau vert —
//    trois captures de rue pour s'en convaincre.
//
// Rend `true` si la colonne a été traitée.
function arbreDeVille(data, x, z, h, wx, wz, sol, ss) {
  // ET IL EST PLUS HAUT QU'UN ENFANT. Un fût de deux blocs met la couronne à
  // hauteur de visage : la première capture de Londres montrait une rue dont
  // le feuillage commençait aux genoux. Trois blocs de tronc, et l'on marche
  // DESSOUS — c'est ce qui fait une rue plantée plutôt qu'un fourré.
  if (ss === BLOCK.LEAVES) {
    // AU PIED D'UN ARBRE, LE SOL EST CELUI D'À CÔTÉ. La première version
    // posait du trottoir sous TOUS les arbres — juste sur une avenue, faux
    // dans un parc : Hyde Park se retrouvait pavé sous chacun de ses
    // marronniers, et son témoin de verdure rougissait à bon droit. On
    // demande donc aux quatre voisins de quoi ils sont faits.
    const auPied = [sol(wx + 1, wz), sol(wx - 1, wz), sol(wx, wz + 1), sol(wx, wz - 1)]
      .includes(BLOCK.GRASS) ? BLOCK.GRASS : CITY_BLOCK.SIDEWALK;
    data[World.index(x, h, z)] = auPied;
    for (let dy = 1; dy <= 6; dy++) {
      const wy = h + dy;
      if (wy < HEIGHT) data[World.index(x, wy, z)] = dy <= 3 ? BLOCK.LOG : BLOCK.LEAVES;
    }
    return true;
  }
  // Le débord ne se demande que pour ce qui peut être au pied d'un arbre —
  // un trottoir, une pelouse — jamais pour une chaussée ni une façade.
  if (ss !== CITY_BLOCK.SIDEWALK && ss !== BLOCK.GRASS) return false;
  const voisin = sol(wx + 1, wz) === BLOCK.LEAVES || sol(wx - 1, wz) === BLOCK.LEAVES
    || sol(wx, wz + 1) === BLOCK.LEAVES || sol(wx, wz - 1) === BLOCK.LEAVES;
  if (!voisin) return false;
  data[World.index(x, h, z)] = ss;
  for (const dy of [4, 5]) {
    const wy = h + dy;
    if (wy < HEIGHT) data[World.index(x, wy, z)] = BLOCK.LEAVES;
  }
  return true;
}

const LANDMARKS = [
  // Paris
  // Paris : chacun à son écart réel à Notre-Dame, calculé par paris.js. La
  // Tour Eiffel se dressait sur la rive droite et le Louvre sur la rive
  // gauche — les deux ont changé de rive, et huit monuments manquants sont
  // arrivés avec eux.
  // La taille de la boîte n'est plus recopiée ici : c'est le `socle` déclaré
  // avec le lieu dans paris.js. Le même nombre interdit le bâti ordinaire
  // au pied du monument et dit aux morceaux de monde voisins de le dessiner —
  // ils ne peuvent donc plus se contredire.
  ...[
    ['Tour Eiffel', buildEiffelTower], ['Arc de Triomphe', buildArch],
    ['Louvre', buildGlassPyramid], ['Panthéon', buildPantheon],
    ['Invalides', buildInvalides], ['Opéra', buildOpera],
    ['Montparnasse', buildMontparnasse], ['Bastille', buildColonneBastille],
    ['Moulin Rouge', buildMoulinRouge], ['Sacré-Cœur', buildSacreCoeur],
  ].map(([nom, build]) => {
    const p = LIEUX.find((q) => q.nom === nom);
    return {
      name: nom === 'Louvre' ? 'Pyramide du Louvre' : nom,
      x: PARIS.x + p.u, z: PARIS.z + p.v, box: Math.max(p.socle[0], p.socle[1]), build,
    };
  }),
  { name: 'Notre-Dame', x: PARIS.x + CITE.u, z: zCite(), box: 9, build: buildNotreDame },
  // New York : chacun à son adresse réelle, ramenée à la grille de manhattan.js.
  // La Statue de la Liberté était plantée en pleine ville, sur ce qui est
  // devenu l'Upper East Side ; elle retrouve son île, dans la baie au sud.
  ...[
    buildEmpireState, buildChrysler, buildGrandCentral, buildFlatiron, buildGrandCentral,
    buildOneWTC, buildTimesSquare, buildBourse, buildTrinity, buildArcheWashington,
  ].map((build, i) => ({
    name: MONUMENTS[i].nom,
    x: NY.x + MONUMENTS[i].u,
    z: NY.z + MONUMENTS[i].v,
    // Un monument peut être plus long que large — le clocher de Trinity fait
    // neuf blocs vers le nord. La boîte du repère doit couvrir le plus grand
    // des deux, sinon le morceau de monde voisin oublie de le dessiner.
    box: Math.max(MONUMENTS[i].box, MONUMENTS[i].bu || 0, MONUMENTS[i].bv || 0),
    build,
  })),
  // Les trois ponts de l'East River, chacun au débouché de sa rue : Brooklyn
  // face à l'Hôtel de Ville, Manhattan au bout de Canal Street, Williamsburg
  // au bout de Delancey. C'est ce qui donne un but à ces rues-là.
  { name: 'Pont de Brooklyn', x: NY.x + Math.round(bordEst(vDuPlan(96))) + 46, z: NY.z + vDuPlan(96), box: 66, waterBase: true, build: buildBrooklyn },
  { name: 'Pont de Manhattan', x: NY.x + Math.round(bordEst(vDuPlan(85))) + 38, z: NY.z + vDuPlan(85), box: 56, waterBase: true, build: buildPontAcier },
  { name: 'Pont de Williamsburg', x: NY.x + Math.round(bordEst(vDuPlan(80))) + 38, z: NY.z + vDuPlan(80), box: 56, waterBase: true, build: buildPontAcier },
  // Liberty Island, dans la baie au sud-ouest de Battery — pas en pleine ville.
  { name: 'Statue de la Liberté', x: NY.x + LIBERTE.u, z: NY.z + LIBERTE.v, box: 20, waterBase: true, build: buildLiberte },
  // San Francisco
  // San Francisco : le Golden Gate — orange international, orienté nord-sud,
  // du Presidio aux Marin Headlands — avec Karl the Fog qui entre par la
  // passe ; le Bay Bridge, GRIS, relie le centre à l'est : les confondre est
  // l'erreur classique, la couleur les distingue désormais.
  // PAR SON ADRESSE, PAS PAR UN DÉCALAGE EN BLOCS. Il était posé à
  // `SF.x - 21, SF.z - 42` — des blocs de l'ancienne échelle. Quand San
  // Francisco est passée de neuf à vingt-sept blocs par kilomètre, le pont
  // s'est retrouvé trois fois trop près du centre, au milieu des maisons, et
  // le détroit était vide. Sept kilomètres et demi à l'ouest-nord-ouest du
  // Ferry Building : c'est là qu'il est, et cela ne changera plus.
  { name: 'Golden Gate', ...(() => { const [x, z] = adresseSF(-7.33, -4.22); return { x, z }; })(),
    box: 76, waterBase: true, build: buildGoldenGate },
  // MÊME PIÈGE QUE LE PONT, DEUX LIGNES PLUS HAUT. Karl était posé lui aussi
  // par un décalage en blocs de l'ancienne échelle : j'ai corrigé le Golden
  // Gate et laissé son voisin. Résultat, le brouillard tombait à un tiers du
  // chemin, quelque part au-dessus des maisons, et la passe restait dégagée.
  // Il se pose désormais à la même adresse que le pont, et son emprise suit :
  // un détroit trois fois plus large demande une nappe trois fois plus large.
  { name: 'Karl the Fog', ...(() => { const [x, z] = adresseSF(-7.33, -4.44); return { x, z }; })(),
    box: 54, waterBase: true, seuil: 0.3, build: buildKarl },
  // ET LES DEUX DERNIERS DE LA MÊME FAMILLE. Mesuré à la sonde : sur les
  // soixante-trois colonnes du tablier du Bay Bridge, ZÉRO n'était de l'eau —
  // un pont suspendu gris planté en travers de la ville, à trois kilomètres à
  // l'OUEST du Ferry Building quand le vrai part vers l'est. Le phare, lui,
  // se dressait au milieu d'un quartier. Aucun des deux n'était visible d'un
  // témoin : celui du Bay Bridge cherchait de la pierre grise dans un rayon
  // de huit blocs, et il en trouvait — celle des immeubles.
  //
  // Le pont enjambe désormais la travée ouest, du Rincon à Yerba Buena :
  // soixante-trois colonnes d'eau sous le tablier. Le phare va à Point Bonita,
  // sur son rocher au large de la passe — le seul phare de San Francisco qui
  // tienne dans le disque de la ville (202 blocs du centre pour 220).
  { name: 'Bay Bridge', ...(() => { const [x, z] = adresseSF(1.56, -0.5); return { x, z }; })(),
    box: 36, waterBase: true, build: (set) => buildSuspensionBridge(set, BLOCK.STONEBRICK) },
  { name: 'Phare', ...(() => { const [x, z] = adresseSF(-11.95, -2.26); return { x, z }; })(),
    box: 3, waterBase: true, build: buildLighthouse },
  ...[
    buildTransamerica, buildCoit, buildSutro, buildFerryBuilding,
    buildPaintedLadies, buildPalaisBeauxArts, buildAlcatraz,
    buildPier39, buildLombard, buildDragonGate,
  ].map((build, i) => ({
    name: MONUMENTS_SF[i].nom,
    x: SF.x + MONUMENTS_SF[i].u,
    z: SF.z + MONUMENTS_SF[i].v,
    box: MONUMENTS_SF[i].box,
    seuil: MONUMENTS_SF[i].seuil,
    waterBase: !!(MONUMENTS_SF[i].waterBase || MONUMENTS_SF[i].nom === 'Alcatraz'),
    build,
  })),
  // Lille
  // L'hôtel de ville et son beffroi, place Roger-Salengro : 680 m à l'est et
  // 1,15 km au sud de la Grand'Place, en KILOMÈTRES réels — un `LILLE.x + 6`
  // écrit en blocs de l'ancienne échelle serait mort à la remise à l'échelle.
  { name: 'Beffroi de Lille', x: adresseLille(0.68, 1.15)[0], z: adresseLille(0.68, 1.15)[1], box: 5, build: buildBelfry },
  ...[buildVieilleBourse, buildPorteDeParis, buildCitadelle, buildColonneDeesse,
    buildOperaLille, buildBeffroiCCI, buildGareFlandres, buildTourDeLille, buildTreille,
  ].map((build, i) => ({
    name: MONUMENTS_LILLE[i].nom,
    x: LILLE.x + MONUMENTS_LILLE[i].u, z: LILLE.z + MONUMENTS_LILLE[i].v,
    box: MONUMENTS_LILLE[i].box, seuil: MONUMENTS_LILLE[i].seuil, build,
  })),
  ...[buildMassena, buildCathedraleRusse, buildCollineChateau, buildNegresco,
    buildPortLympia, buildSaleya, buildBaleine, buildPromenade,
  ].map((build, i) => ({
    name: MONUMENTS_NICE[i].nom,
    x: NICE.x + MONUMENTS_NICE[i].u, z: NICE.z + MONUMENTS_NICE[i].v,
    box: MONUMENTS_NICE[i].box, seuil: MONUMENTS_NICE[i].seuil, build,
  })),
  // WASHINGTON. Trente-cinq repères — trente-deux bâtiments et trois ponts —
  // et l'ordre compte : les ponts d'abord,
  // parce qu'un pont TOUCHE ce qu'il dessert — celui du Mémorial part du pied
  // du Lincoln — et que le monument doit garder la main sur les colonnes
  // communes. Le tableau vient de src/washington.js : les positions ne sont
  // pas recopiées, elles s'en déduisent.
  ...[
    ['Pont du Mémorial', buildPontMemorial], ['Pont de la 14e Rue', buildPont14e],
    ['Key Bridge', buildKeyBridge],
    ['Capitole des États-Unis', buildCapitole], ['Monument de Washington', buildObelisque],
    ['Lincoln Memorial', buildLincoln], ['Mémorial de la Seconde Guerre mondiale', buildMemorialGuerre],
    ["Galerie nationale d'art — Est", buildNGAEst], ["Galerie nationale d'art", buildGalerieArt],
    ["Musée d'Histoire naturelle", buildHistoireNaturelle],
    ["Musée d'Histoire américaine", buildHistoireAmericaine],
    ['Musée afro-américain', buildAfroAmericain],
    ["Musée de l'Indien d'Amérique", buildIndienAmerique],
    ["Musée de l'Air et de l'Espace", buildAirEspace], ['Hirshhorn', buildHirshhorn],
    ['Arts et Industries', buildArtsIndustries], ['Château du Smithsonian', buildChateauSmithsonian],
    ['Galerie Freer', buildFreer],
    ['Maison-Blanche', buildMaisonBlanche], ['Le Trésor', buildTresor],
    ['Archives nationales', buildArchives], ['Arc de Chinatown', buildArcChinatown],
    ['Théâtre Ford', buildFordTheatre],
    ['Cour suprême', buildCourSupreme], ['Bibliothèque du Congrès', buildBibliotheque],
    ['Union Station', buildUnionStation],
    ['Mémorial des vétérans du Vietnam', buildVietnam],
    ['Mémorial de la guerre de Corée', buildCoree], ['Mémorial Martin Luther King', buildMLK],
    ['Mémorial Roosevelt', buildRoosevelt], ['Mémorial Jefferson', buildJefferson],
    ['Kennedy Center', buildKennedyCenter], ['Pentagone', buildPentagone],
    ['Tombe du Soldat inconnu', buildSoldatInconnu], ['Mémorial Iwo Jima', buildIwoJima],
  ].map(([nom, build]) => {
    const m = MONUMENTS_DC.find((q) => q.nom === nom);
    return {
      name: nom, x: WASHINGTON.x + m.u, z: WASHINGTON.z + m.v,
      box: Math.max(m.bu, m.bv), seuil: m.seuil, waterBase: !!m.eau, build,
    };
  }),
  // Countryside
  { name: 'Château médiéval', x: CASTLE.x, z: CASTLE.z, box: 30, build: buildCastle },
  { name: 'Base martienne', x: MARS.x, z: MARS.z, box: 26, build: buildBaseMartienne },
  { name: 'Château de Villandry', x: VILLANDRY.x, z: VILLANDRY.z, box: 80, build: buildVillandry },
  { name: 'Aéroport Charles-de-Gaulle', x: AEROPORT.x, z: AEROPORT.z, box: 70, build: buildAeroport },
  // La Giga-usine d'Austin : le hall et sa chaîne d'un côté, le parc des
  // voitures neuves de l'autre — deux tampons, parce qu'une seule boîte assez
  // grande pour les deux ferait rejouer tout le site à chaque morceau voisin.
  // Les bâtisseurs de l'usine comptent depuis le centre du SITE ; le tampon,
  // lui, pose depuis le centre de sa boîte — la translation se fait ici.
  { name: 'La Giga-usine', x: USINE().x - 38, z: USINE().z, box: 60,
    build: (poser) => buildUsine((u, y, v, id) => poser(u + 38, y, v, id)) },
  { name: 'Le parc des voitures neuves', x: USINE().x + 50, z: USINE().z - 18, box: 42,
    build: (poser) => buildParcUsine((u, y, v, id) => poser(u - 50, y, v + 18, id)) },
  { name: 'Village gaulois', x: GAULOIS.x, z: GAULOIS.z, box: 62, build: buildGaulois },
  { name: 'Base spatiale', x: ESPACE.x, z: ESPACE.z, box: 64, build: buildEspace },
  { name: 'Caserne & Commissariat', x: VILLE.x, z: VILLE.z, box: 46, build: buildVille },
  { name: 'Circuit de F1', x: CIRCUIT.x, z: CIRCUIT.z, box: 80, build: buildCircuit },
  { name: "Parc d'attractions", x: PARK.x, z: PARK.z, box: PARC_ATTRACTIONS.r, build: buildParc },
  { name: 'Pyramides', x: DESERT.x, z: DESERT.z, box: 22, build: buildPyramid },
  { name: 'Quartier des enfants', x: 26, z: -14, box: 16, build: buildCottages },
  { name: 'Musée', x: -34, z: 40, box: 10, build: buildMuseum },
  // Le pôle Nord. Il ne figure ni dans les villes ni dans les lieux : aucun
  // panneau n'y mène, aucun nom ne l'annonce. Il faut voler droit vers le nord
  // jusqu'à ce que la mer gèle.
  { name: 'Pôle Nord', x: POLE.x, z: POLE.z, box: 62, build: buildPole },
  // La Chine : la muraille suit la crête de son propre chef (elle en connaît
  // la formule), les autres monuments se posent sur la plaine.
  { name: 'Grande Muraille', x: CHINE.x, z: CHINE.z, box: 66, build: buildMuraille },
  { name: 'Cité interdite', x: CHINE.x - 6, z: CHINE.z + 2, box: 14, build: buildCiteInterdite },
  { name: 'Village chinois', x: CHINE.x - 34, z: CHINE.z + 26, box: 16, build: buildVillageChinois },
  { name: 'Radeau de Guilin', x: CHINE.x + 30, z: CHINE.z + 16, box: 5, seuil: 0.25, waterBase: true, build: buildGuilin },
  { name: 'Bambouseraie', x: CHINE.x - 14, z: CHINE.z + 40, box: 11, seuil: 0.3, build: buildPandas },
  // LE TOUR DU MONDE. Big Ben, Tower Bridge, le Colisée, la Sagrada Família,
  // la tour de Pise, la pyramide de Khéops, le Taj Mahal, l'Opéra de Sydney,
  // le Christ Rédempteur et la Space Needle. Ils étaient tous écrits dans
  // src/monuments.js depuis longtemps, et aucun ne se dressait nulle part :
  // on ne pouvait que les poser soi-même depuis le menu du constructeur.
  // Maintenant que les villes se déduisent de leurs coordonnées réelles,
  // chacun se dresse chez lui.
  // Londres, bâtie monument par monument à ses vraies coordonnées : Big Ben
  // au bord de l'eau, Tower Bridge TOURNÉ pour enjamber la Tamise, le London
  // Eye en face du Parlement, St Paul dans la City, le Shard sur la rive sud.
  ...MONUMENTS_LONDRES.map((m) => ({
    name: m.nom, x: LONDRES.x + m.u, z: LONDRES.z + m.v,
    box: m.box, seuil: m.seuil, build: m.build,
  })),
  ...landmarksCapitales(),
  ...landmarksVillesMonde(),
];

// La même liste, sans les constructeurs : ce que la carte a le droit de lire.
export const REPERES = LANDMARKS.map(({ name, x, z, box, seuil }) => ({ name, x, z, box, seuil }));

// --- world ----------------------------------------------------------------

// Three themed city districts, each with its own architecture, street
// pattern and landmarks: Haussmann Paris, skyscraper New York, and
// pastel-hilled San Francisco.
export const CITIES = [
  { key: 'paris', name: 'Paris', ...positionDe('paris'), r: 185, cell: 12, base: 34, street: 3 },
  // New York n'est plus un disque : c'est l'île de Manhattan, longue et
  // étroite, dessinée par src/manhattan.js. Le rayon ne sert plus qu'à
  // délimiter grossièrement sa zone d'influence — la forme, elle, est donnée
  // par zoneManhattan().
  { key: 'ny', name: 'New York', ...positionDe('ny'), r: 152, cell: 12, base: 33, street: 3 },
  // San Francisco n'est pas un disque non plus : c'est une presqu'île, avec
  // l'océan à l'ouest, la passe au nord et la baie à l'est — cf. src/sanfrancisco.js.
  { key: 'sf', name: 'San Francisco', x: SF.x, z: SF.z, r: SF.r, cell: 11, base: 33, street: 3 },
  { key: 'nice', name: 'Nice', x: NICE.x, z: NICE.z, r: NICE.r, cell: 11, base: 32, street: 3 },
  { key: 'lille', name: 'Lille', x: LILLE.x, z: LILLE.z, r: LILLE.r, cell: 12, base: 34, street: 3 },
  // Washington n'est pas un disque non plus : c'est un rectangle posé sur le
  // confluent de deux rivières, découpé par surTerreWashington(). Le rayon ne
  // sert qu'à écarter d'emblée ce qui est loin.
  { key: 'dc', name: 'Washington', x: WASHINGTON.x, z: WASHINGTON.z, r: WASHINGTON_R, cell: 12, base: 33, street: 3 },
  // Londres : la première ville du tour du monde bâtie en entier — la Tamise
  // et son coude de Westminster, trois tissus de rues, ses monuments à leurs
  // vraies coordonnées. Cf. src/londres.js.
  { key: 'londres', name: 'Londres', x: LONDRES.x, z: LONDRES.z, r: LONDRES.r, cell: 11, base: 33, street: 3 },
];

// SF painted-lady facades reuse the plain decor blocks (Uni pattern).
// Mêmes tons rompus que `sanfrancisco.js` : le citron, le vert clair et le
// turquoise donnaient une ville en briques de plastique.
const SF_PASTELS = [15, 9, 29, 28, 16, 19, 22, 23].map((ci) => DECOR_START + ci * 10);
// Nice: warm Mediterranean facades (ochre, orange, rose, cream, sand).
const NICE_WARM = [1, 2, 16, 15, 28, 20].map((ci) => DECOR_START + ci * 10);

// --- la vraie Terre : océans et grandes chaînes -------------------------------
//
// Max : « quand je regarde la carte, je ne reconnais pas la vraie carte du
// monde ». Chaque colonne de terrain demande donc au planisphère (src/terre.js)
// au-dessus de quel point du globe elle se trouve : la mer s'y creuse, les
// Alpes s'y lèvent, le Grand Canyon s'y taille.
//
// TOUT CE QUI EST BÂTI EST À L'ABRI. Les villes, les domaines, les monuments
// et le point d'apparition gardent leur sol quoi qu'en dise l'océan : une
// ville trente fois trop grande pour l'échelle de la carte (Washington est
// bâtie à 48 blocs/km sur une carte à 1,3 bloc/km) déborde forcément sur la
// géographie voisine — c'est assumé depuis v162, la côte s'écarte autour.
// DEUX CENT CINQUANTE ZONES, ET CHAQUE COLONNE DE MER LES INTERROGEAIT
// TOUTES. Les cinquante grandes ont porté la liste à ~250 entrées (142
// monuments à elles seules), et la carte, qui rejoue des dizaines de
// milliers de colonnes par rendu, s'est mise à laguer. Une zone tient dans
// un disque borné : on la range dans les cases de 512 blocs qu'elle touche,
// et une colonne ne regarde plus que sa case — presque toujours vide.
let zonesIndex = null;
const CASE_ZONE = 512;
function dansUneZoneATerre(x, z) {
  if (!zonesIndex) {
    const zones = [
      { x: 0, z: 0, r: 320 },                    // le continent du départ
      // +24 et pas davantage : les fondus de villes font quatorze blocs, et
      // une marge de +60 faisait déborder le renflement de Londres jusque sur
      // le détroit de Douvres — la Manche disparaissait à l'endroit exact où
      // elle est la plus célèbre.
      ...CITIES.map((c) => ({ x: c.x, z: c.z, r: c.r + 24 })),
      ...PLACES.filter((p) => p.r > 0).map((p) => ({ x: p.x, z: p.z, r: p.r + 40 })),
      ...LANDMARKS.map((l) => ({ x: l.x, z: l.z, r: (l.box || 10) + 30 })),
    ];
    zonesIndex = new Map();
    for (const zone of zones) {
      for (let cx = Math.floor((zone.x - zone.r) / CASE_ZONE); cx <= Math.floor((zone.x + zone.r) / CASE_ZONE); cx++) {
        for (let cz = Math.floor((zone.z - zone.r) / CASE_ZONE); cz <= Math.floor((zone.z + zone.r) / CASE_ZONE); cz++) {
          const cle = cx * 100000 + cz;
          if (!zonesIndex.has(cle)) zonesIndex.set(cle, []);
          zonesIndex.get(cle).push(zone);
        }
      }
    }
  }
  const pres = zonesIndex.get(Math.floor(x / CASE_ZONE) * 100000 + Math.floor(z / CASE_ZONE));
  if (!pres) return false;
  for (const zone of pres) {
    if (Math.hypot(x - zone.x, z - zone.z) <= zone.r) return true;
  }
  return false;
}

function hauteurTerre(x, z, h, mondeId = 'terre') {
  const ciel = cielDe(x, z, mondeId);
  // Une côte au cordeau fait maquette : un léger tremblé la rend naturelle,
  // déterministe pour que deux tablettes engendrent le même rivage.
  const lat = ciel.lat + 0.05 * Math.sin(x * 0.021 + z * 0.013) + 0.02 * Math.sin(x * 0.11);
  const lon = ciel.lon + 0.05 * Math.sin(z * 0.019 - x * 0.011) + 0.02 * Math.sin(z * 0.13);
  if (!surTerreReelle(lat, lon)) {
    if (dansUneZoneATerre(x, z)) return h;
    const fond = WATER_LEVEL - 6 + Math.sin(x * 0.05) * 1.5 + Math.sin(z * 0.043) * 1.5;
    return Math.min(h, Math.round(fond));
  }
  // à terre : le relief réel s'ajoute, plafonné sous le toit du terrain
  const delta = reliefReel(lat, lon);
  if (delta && !dansUneZoneATerre(x, z)) {
    h = Math.min(SOMMET_TERRAIN - 2, Math.max(2, Math.round(h + delta)));
  }
  return h;
}

// LA HAUTEUR DE BASE, SUR LA CARTE QU'ON VEUT.
//
// C'est le relief SANS les villes : le bruit, les lacs, et le planisphère.
// La migration s'en sert pour comparer le sol d'avant et le sol d'après sous
// chaque bloc d'un enfant. On écarte volontairement les villes : sous une
// ville, la hauteur est décidée par la ville, et une ville qui se déplace ne
// laisse pas un écart de hauteur à rattraper — elle laisse un AUTRE endroit.
export function hauteurBase(x, z, mondeId = 'terre') {
  const mountains = fbm(x * 0.0035, z * 0.0035, SEED + 9001);
  const hills = fbm(x * 0.016, z * 0.016, SEED);
  let h = 24 + hills * 14 + Math.pow(mountains, 3) * 48;
  const lake = fbm(x * 0.03, z * 0.03, SEED + 601);
  if (lake > 0.72) h = Math.min(h, WATER_LEVEL - 2 - (lake - 0.72) * 30);
  return Math.round(hauteurTerre(x, z, h, mondeId));
}

// SUIVRE LES BLOCS QUAND LE SOL BOUGE.
//
// Agrandir la carte déplace le relief. `CLAUDE.md` dit comment s'y prendre :
// « versionner le générateur de terrain et migrer chaque bloc de la différence
// de hauteur de sa colonne — pas régénérer et espérer ». `MONDES.terreAvant`
// garde la projection d'avant, figée ; `hauteurBase` répond sur l'une ou
// l'autre. Il ne reste qu'à décaler.
//
// CE QUE ÇA RATTRAPE, ET CE QUE ÇA NE RATTRAPE PAS. Une maison enterrée de
// deux blocs remonte de deux blocs : c'est le cas courant, et c'est réglé. Une
// maison dont la colonne est passée sous la mer, non — aucun décalage vertical
// ne sauve un endroit qui n'existe plus. On borne donc le décalage : au-delà,
// on laisse le bloc où il est plutôt que de le catapulter, et on le compte.
//
// Mesuré AVANT de livrer, sur 4 040 colonnes : autour du point d'apparition et
// autour de Paris, le sol ne bouge PAS D'UN BLOC — cent pour cent identiques.
// L'ancre de la projection est plantée sur Paris exprès, et le bruit du
// terrain ne dépend que de la position. C'est la campagne lointaine qui se
// réécrit : douze blocs d'écart médian à six cents blocs à l'ouest.
export const CARTE_VERSION = 2;
const CLE_CARTE = 'web-minecraft-carte-v1';
const ECART_MAX = 24;          // au-delà, on ne déplace plus : on laisse et on dit

export function migrerLesBlocs(lire, ecrire) {
  let version = 0;
  try { version = Number(localStorage.getItem(CLE_CARTE)) || 0; } catch { /* ignore */ }
  if (version >= CARTE_VERSION) return null;
  const tout = lire() || {};
  let deplaces = 0, laisses = 0, intacts = 0;
  const sols = new Map();       // une colonne se calcule une fois, pas par bloc
  for (const [ctx, map] of Object.entries(tout)) {
    const neuf = {};
    for (const [k, entry] of Object.entries(map || {})) {
      const [x, y, z] = k.split(',').map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) { neuf[k] = entry; continue; }
      const cle = `${x},${z}`;
      let d = sols.get(cle);
      if (d === undefined) {
        d = hauteurBase(x, z, 'terre') - hauteurBase(x, z, 'terreAvant');
        sols.set(cle, d);
      }
      if (d === 0) { neuf[k] = entry; intacts++; continue; }
      if (Math.abs(d) > ECART_MAX) { neuf[k] = entry; laisses++; continue; }
      neuf[`${x},${y + d},${z}`] = entry;
      deplaces++;
    }
    tout[ctx] = neuf;
  }
  ecrire(tout);
  try { localStorage.setItem(CLE_CARTE, String(CARTE_VERSION)); } catch { /* ignore */ }
  return { deplaces, laisses, intacts };
}

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
    // Le profil d'une voie ferrée se lisse sur toute sa longueur, donc il a
    // besoin de la hauteur du terrain BIEN AU-DELÀ de la colonne qu'on est
    // en train de bâtir. `trains.js` ne la connaît pas : on la lui donne.
    brancherSol((x, z) => this.terrainHeight(x, z));
  }

  static key(cx, cz) { return cx + ',' + cz; }

  static index(x, y, z) { return x + z * CHUNK + y * CHUNK * CHUNK; }

  // LA COTE OÙ ROULE UNE VOITURE. C'est le terrain, sauf là où la ville a posé
  // un OUVRAGE par-dessus l'eau : le tablier d'un pont de Londres est à la
  // cote des quais, l'eau reste dessous, et le relief ne bouge pas (v208).
  // Un convoi qui suivait `terrainHeight` sur ces colonnes suivait le LIT DU
  // FLEUVE — soixante-treize pas de circuit sous la Tamise, mesurés.
  coteRoulable(x, z) {
    const h = this.terrainHeight(x, z);
    const c = this.cityAt(x, z);
    // Sur un tablier, la cote des quais — et le MAX avec le terrain, jamais
    // la cote seule : près d'une culée le lit remonte au-dessus du niveau
    // général de l'eau, et une condition « seulement si c'est profond »
    // laissait deux colonnes de convoi dans la Tamise.
    if (c && c.key === 'londres' && pontLondres(x - c.x, z - c.z) !== null) {
      return h > c.base + 1 ? h : c.base + 1;
    }
    return h;
  }

  terrainHeight(x, z) {
    const mountains = fbm(x * 0.0035, z * 0.0035, SEED + 9001);
    const hills = fbm(x * 0.016, z * 0.016, SEED);
    let h = 24 + hills * 14 + Math.pow(mountains, 3) * 48;

    // LA MER DE BRUIT A VÉCU. Avant le planisphère, un bruit de
    // « continentalité » creusait des mers au hasard passé 260 blocs du
    // départ — c'était la seule façon d'avoir des côtes. Maintenant que les
    // océans sont les VRAIS, ces mers aléatoires tombaient au milieu de la
    // France et l'empêchaient de ressembler à la France. La mer vient du
    // planisphère (hauteurTerre, plus bas), et de lui seul ; les lacs, eux,
    // restent — la France a des lacs.

    // lakes: small pockets carved below water level
    const lake = fbm(x * 0.03, z * 0.03, SEED + 601);
    if (lake > 0.72) h = Math.min(h, WATER_LEVEL - 2 - (lake - 0.72) * 30);

    // La vraie Terre : les océans du planisphère et les grandes chaînes.
    // Après les lacs — la mer a le dernier mot sur le bruit — et avant les
    // villes, qui gardent la main sur leur propre relief.
    h = hauteurTerre(x, z, h);

    // city districts: Paris and New York are flat plateaus; San Francisco
    // keeps its rolling hills so its streets climb like the real thing
    for (const c of CITIES) {
      // Quatre reliefs à part, chacun dans son module : cf. plus bas.
      if (c.key === 'ny' || c.key === 'sf' || c.key === 'nice' || c.key === 'lille' || c.key === 'dc' || c.key === 'londres') continue;
      const cd = Math.hypot(x - c.x, z - c.z);
      if (cd < c.r) {
        const m = Math.min(1, (c.r - cd) / 16);
        h = h * (1 - m) + c.base * m;
        break;
      }
    }

    // Paris : la Seine se creuse dans la base plate, et la butte Montmartre s'y
    // relève. Une ville née autour d'un fleuve ne pouvait pas rester une table.
    h = hauteurParis(x, z, h, 34);

    // San Francisco : ses treize collines nommées, chacune à sa hauteur réelle,
    // et la mer sur trois côtés. L'ancienne version se contentait d'ajouter du
    // bruit à la base plate — la ville n'avait donc ni collines ni côte, alors
    // que ce sont exactement les deux choses qui la font reconnaître.
    h = hauteurSF(x, z, h, 33);

    // Nice : la baie des Anges se creuse, et les trois collines se lèvent —
    // celle du Château, Cimiez et le mont Boron.
    h = hauteurNice(x, z, h, 32);

    // Lille : la Deûle et les douves de la citadelle se creusent, et le rempart
    // de Vauban se relève au-dessus de la ville.
    h = hauteurLille(x, z, h, 34);

    // Londres : la Tamise se creuse dans la plaine — son coude de Westminster
    // est LE trait qu'on reconnaît sur tous les plans — et Primrose Hill se
    // lève au nord, d'où toute la ville se découvre.
    h = hauteurLondres(x, z, h, 33);

    // La Chine : les crêtes de la muraille, la rivière de Guilin et ses
    // karsts, les rizières en marches — une région entière dans ce qui était
    // une zone morte entre San Francisco et le Pôle Nord.
    h = hauteurChine(x, z, h);

    // Le tour du monde : Londres, Rome, Barcelone, Pise, Gizeh, Agra, Sydney,
    // Rio et Seattle. Chacune aplanit le parvis de son monument, avec un fondu
    // au pourtour — au-delà, le paysage est celui du bruit, au bloc près.
    h = hauteurCapitales(x, z, h);

    // Les huit villes iconiques du tour du monde : Rome et le Tibre, la
    // grille chanfreinée de Barcelone, l'Arno de Pise, le plateau de Gizeh,
    // la Yamuna d'Agra, le port de Sydney, la baie de Rio et ses mornes, la
    // baie d'Elliott de Seattle. Cf. src/villesmonde.js.
    h = hauteurVillesMonde(x, z, h);

    // La Giga-usine d'Austin : son disque est plat — une chaîne de production
    // qui ondule n'assemble rien du tout. Cf. src/usine.js.
    h = hauteurUsine(x, z, h);

    // Liberty Island : un haut-fond dans la baie, juste au-dessus de l'eau.
    // Sans lui, la statue se dresserait sur la mer.
    const ld = Math.hypot(x - (NY.x + LIBERTE.u), z - (NY.z + LIBERTE.v));
    if (ld < LIBERTE.r) h = Math.max(h, WATER_LEVEL + 1 - Math.floor(ld / 3));

    // Manhattan ne se pose pas sur le continent : elle en est détachée par
    // l'Hudson et l'East River. C'est le seul quartier dont le terrain est
    // creusé autant que nivelé.
    h = hauteurManhattan(x, z, h);

    // Washington : le Potomac et l'Anacostia se creusent et se rejoignent, le
    // ravin de Rock Creek coupe le nord-ouest, et les collines nommées se
    // lèvent — Capitol Hill sous le Capitole, la crête d'Arlington en face,
    // Mount Saint Alban sous la cathédrale.
    h = hauteurWashington(x, z, h);

    // Le pôle Nord : une banquise plate posée sur l'océan, tout au nord. On n'y
    // arrive qu'en volant longtemps — c'est un trésor caché, il n'est annoncé
    // nulle part.
    const pd2 = Math.hypot(x - POLE.x, z - POLE.z);
    if (pd2 < POLE.r) {
      const m = Math.min(1, (POLE.r - pd2) / 12);
      h = h * (1 - m) + 32 * m;
    }

    // the amusement park sits on its own flat esplanade
    // Le raccord au terrain naturel se fait AU-DELÀ du parc, pas dedans : avec
    // un fondu de quatorze blocs pris sur le parc lui-même, sa lisière restait
    // en pente et un étang naturel remontait par le sud-ouest, au milieu des
    // allées. L'esplanade est plate jusqu'au monorail, qui en marque le bord.
    const pd = Math.hypot(x - PARK.x, z - PARK.z);
    if (pd < PARK.r + 10) {
      const m = Math.min(1, (PARK.r + 10 - pd) / 12);
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

    return Math.max(2, Math.min(SOMMET_TERRAIN, Math.floor(h)));
  }

  cityAt(x, z) {
    for (const c of CITIES) {
      if (Math.hypot(x - c.x, z - c.z) >= c.r) continue;
      // Manhattan tient dans ce cercle mais n'en occupe qu'une bande : hors de
      // l'île et de ses fleuves, on est en pleine campagne, avec ses arbres.
      if (c.key === 'ny' && !surTerre(x, z)) continue;
      // Les Marin Headlands font partie de San Francisco : sans cela, leur
      // herbe sèche dorée restait l'herbe verte de la campagne.
      if (c.key === 'sf' && !surTerreSF(x, z) && !surMarin(x, z)) continue;
      if (c.key === 'nice' && !surTerreNice(x, z)) continue;
      if (c.key === 'dc' && !surTerreWashington(x, z)) continue;
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
    if (dansUneCalotte(z)) return null;                             // rien ne pousse sur les calottes
    if (presDeLaVoie(x, z)) return null;                            // la voie ferrée reste dégagée
    if (Math.hypot(x - POLE.x, z - POLE.z) < POLE.r) return null;   // rien ne pousse sur la banquise
    if (versSeine(x, z) < 3) return null;                           // ni dans la Seine
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
    // Ni dans les villes de la machine : elles plantent leurs parcs
    // elles-mêmes. Sans ce garde, une ville posée sur du bruit de forêt dense
    // (Marseille, Lyon) disparaissait sous les feuillages sauvages.
    if (dansVilleMonde(x, z)) return null;
    if (Math.hypot(x - PARK.x, z - PARK.z) < PARK.r) return null; // park is kept open
    if (Math.hypot(x - DESERT.x, z - DESERT.z) < DESERT.r) return null; // cactuses only
    if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < VOLCANO.r) return null; // bare rock
    if (Math.hypot(x - MARS.x, z - MARS.z) < MARS.r) return null; // rien ne pousse sur Mars
    if (Math.hypot(x - VILLANDRY.x, z - VILLANDRY.z) < VILLANDRY.r) return null; // les jardins sont dessinés, pas sauvages
    if (Math.hypot(x - AEROPORT.x, z - AEROPORT.z) < AEROPORT.r) return null;     // pas d'arbre au milieu des pistes
    if (dansLUsine(x, z)) return null;                                            // ni sur la chaîne, ni sur le parc
    // au village, les arbres sont plantés par le constructeur, pas au hasard
    if (Math.hypot(x - GAULOIS.x, z - GAULOIS.z) < 52) return null;
    if (Math.hypot(x - ESPACE.x, z - ESPACE.z) < ESPACE.r) return null;   // rien ne pousse ici
    // en Chine, la végétation est composée : bambouseraie plantée, karsts
    // coiffés d'herbe — pas de forêt sauvage par-dessus
    if (Math.hypot(x - CHINE.x, z - CHINE.z) < CHINE.r) return null;
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
        if (dansUneCalotte(wz)) {
          // la banquise et l'Antarctique : de la neige sur la terre, de la
          // glace au ras de l'eau — jamais de plage de sable au pôle
          top = h <= WATER_LEVEL + 1 ? BLOCK.ICE : BLOCK.SNOW;
          filler = BLOCK.SNOW;
        } else if (h <= WATER_LEVEL + 1) { top = BLOCK.SAND; filler = BLOCK.SAND; }
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

        // La voie ferrée (v179) : le ballast de gravier sur la terre, et le
        // VIADUC au ras des flots quand la ligne traverse la mer — l'Eurostar
        // voit la Manche passer sous ses fenêtres. Les rails s'arrêtent aux
        // portes des villes, donc aucune rue n'est jamais éventrée.
        const voie = voieEn(wx, wz);
        if (voie) {
          // DE VRAIS RAILS, PAS UNE BANDE DE GRAVIER. Max : « train no
          // rails ». Deux files sombres continues, des traverses au milieu,
          // le ballast en bordure : c'est à ça qu'on reconnaît une voie
          // ferrée, et cela tient dans les trois blocs de large qu'elle fait.
          const y = voie.cote;
          // Le REMBLAI et la TRANCHÉE. Le profil ne suit plus le terrain
          // bloc à bloc — il est lissé — donc il passe tantôt au-dessus,
          // tantôt en dessous. On comble sous les rails et l'on dégage
          // au-dessus, sur le gabarit d'un train.
          for (let wy = Math.max(0, Math.min(h, WATER_LEVEL) ); wy < y; wy++) {
            if (wy >= 0 && wy < HEIGHT) data[World.index(x, wy, z)] = BLOCK.STONEBRICK;
          }
          for (let wy = y + 1; wy <= y + 5 && wy < HEIGHT; wy++) data[World.index(x, wy, z)] = BLOCK.AIR;
          if (y >= 0 && y < HEIGHT) {
            // Le motif se tire en coordonnées du MONDE : en coordonnées
            // locales il se répéterait dans chaque morceau et sauterait au
            // remaillage.
            const traverse = (((wx + wz) % 2) + 2) % 2 === 0;
            data[World.index(x, y, z)] = voie.d < 0.55
              ? (traverse ? BLOCK.DARKPLANK : BLOCK.GRAVEL)
              : (voie.d < 1.25 ? BLOCK.OBSIDIAN : BLOCK.GRAVEL);
          }
          // LA VOIE A LE DERNIER MOT SUR SA COLONNE. Sans ce `continue`, une
          // ville engendrée traversée par la ligne rebâtissait par-dessus les
          // rails : vingt-sept colonnes d'immeuble en travers du Shinkansen,
          // mesurées entre Tokyo et Kyoto. C'est le même piège que les arbres
          // de ville, qui laissaient la trame générique repasser derrière.
          // Trois blocs de large sur quatre mille : la ville ne perd rien.
          continue;
        }

        // Manhattan a son propre dessin de sol : avenues numérotées, rues tous
        // les cinq blocs, Broadway en diagonale, Central Park et ses pièces
        // d'eau. Une colonne, une décision — comme pour les autres villes.
        let fait = false;
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

        // Washington : le plan de L'Enfant — la grille, les avenues d'État en
        // diagonale, les ronds-points — puis le Mall, et enfin ce qui est
        // SOUS la ville : quatre lignes de métro, leurs voûtes à caissons et
        // leurs escaliers. Le creusement se fait à chaque colonne, y compris
        // sous les rues et les pelouses ; c'est pour cela qu'il vient APRÈS
        // le sol et non à sa place.
        //
        // Y COMPRIS SUR L'EAU : `cityAt` s'arrête à la rive — c'est son rôle,
        // il dit où est la VILLE — mais le fleuve appartient quand même à la
        // capitale : la Bleue passe en tunnel SOUS le Potomac, et la Jaune le
        // franchit SUR son pont. Sans cette clause, ni l'un ni l'autre
        // n'existaient : le générateur sautait les colonnes d'eau, et le train
        // traversait le fleuve dans un tunnel fantôme jamais creusé.
        if ((city && city.key === 'dc') || dansEauWashington(wx, wz)) {
          const sw = solWashington(wx, wz);
          // Les ormes du Mall et les bosquets des parcs poussent ici — fût et
          // couronne — comme dans toute ville de la boucle générique. Sans cet
          // appel, ARBRE était posé À PLAT : de la pelouse sur le gravier des
          // allées, vu en capture de rue (v205). Le bâtisseur passe ENSUITE
          // quand même : c'est lui qui creuse le métro sous les parcs.
          if (!arbreDeVille(data, x, z, h, wx, wz, solWashington, sw) && sw !== null) {
            data[World.index(x, h, z)] = sw;
          }
          batirColonneWashington(wx, wz, h, (dy, id) => {
            const wy = h + dy;
            if (wy >= 0 && wy < HEIGHT) data[World.index(x, wy, z)] = id;
          });
          continue;
        }

        // Paris : le fleuve, ses quais, ses ponts, l'Étoile, les
        // Champs-Élysées, puis la trame de chaque quartier — ses rues tordues,
        // ses pans coupés, ses cours — et enfin l'immeuble lui-même. La trame
        // générique ne s'applique pas ici : ses lots carrés de douze blocs
        // faisaient un lotissement, pas une ville.
        if (city && city.key === 'paris') {
          const sp = solParis(wx, wz);
          // La couronne déborde d'un bloc sur les quatre côtés : un arbre
          // large d'un seul bloc est un poteau vert, pas un arbre — trois
          // captures de rue pour s'en convaincre. On ne pose la question que
          // pour les colonnes qui peuvent être AU PIED d'un arbre (trottoir,
          // pelouse), jamais pour une chaussée ou une façade.
          const souche = (sp === CITY_BLOCK.SIDEWALK || sp === BLOCK.GRASS)
            && (solParis(wx + 1, wz) === BLOCK.LEAVES || solParis(wx - 1, wz) === BLOCK.LEAVES
              || solParis(wx, wz + 1) === BLOCK.LEAVES || solParis(wx, wz - 1) === BLOCK.LEAVES);
          if (souche) {
            data[World.index(x, h, z)] = sp;
            for (const dy of [3, 4]) {
              const wy = h + dy;
              if (wy < HEIGHT) data[World.index(x, wy, z)] = BLOCK.LEAVES;
            }
          } else if (sp === BLOCK.LEAVES) {
            // UN ARBRE D'ALIGNEMENT, PAS UN CARRÉ VERT.
            //
            // `solParis` rend un identifiant de sol, et le feuillage était
            // posé comme tel : à plat, au ras du trottoir. Vus du ciel les
            // marronniers des Champs-Élysées faisaient de belles rangées ; vus
            // de la rue, c'était de la pelouse sur le bitume. Un fût de trois
            // blocs et une couronne de deux, et l'avenue devient une avenue.
            data[World.index(x, h, z)] = CITY_BLOCK.SIDEWALK;
            for (let dy = 1; dy <= 5; dy++) {
              const wy = h + dy;
              if (wy < HEIGHT) data[World.index(x, wy, z)] = dy <= 2 ? BLOCK.LOG : BLOCK.LEAVES;
            }
          } else if (sp !== null) data[World.index(x, h, z)] = sp;
          else if (lotParisLibre(wx, wz)) {
            batirColonneParis(wx, wz, (dy, id) => {
              const wy = h + dy - 1;
              if (wy >= 0 && wy < HEIGHT) data[World.index(x, wy, z)] = id;
            });
          }
          continue;
        }

        // San Francisco : ses deux quadrillages qui ne sont pas parallèles,
        // Market Street entre les deux, la plage, les quais et les parcs.
        // Nice et Lille : chacune sa trame, ses places et ses maisons. Comme à
        // San Francisco, la trame générique ne s'applique pas par-dessus.
        for (const [cle, sol, libre, batir, pont] of [
          ['nice', solNice, lotNiceLibre, batirColonneNice],
          ['lille', solLille, lotLilleLibre, batirColonneLille],
          ['londres', solLondres, lotLondresLibre, batirColonneLondres, pontLondres],
        ]) {
          if (!city || city.key !== cle) continue;
          const ss = sol(wx, wz);
          // UN ARBRE, PAS UN CARRÉ VERT — et la leçon vaut pour TOUTE ville,
          // pas seulement pour Paris.
          //
          // Ces trois villes marquaient déjà leurs arbres (`BLOCK.LEAVES` dans
          // les parcs), mais la boucle générique les posait comme n'importe
          // quel sol : à plat, au ras de l'herbe. Vus du ciel, de belles
          // taches vertes ; vus de la rue, de la pelouse d'une autre nuance.
          // C'est mot pour mot ce que Paris avait payé en v187, et les trois
          // autres villes ne l'avaient jamais reçu. Max, sur sa capture de
          // Londres : « les villes sont vides : pas d'arbres ».
          // ON LÈVE LE DRAPEAU AVANT DE PASSER. Ce `continue` sort de la
          // boucle qui cherche LA VILLE, pas de celle des colonnes : sans
          // `fait = true`, la grille de rues générique repasse derrière et
          // écrase le sol qu'on vient de poser. C'est ainsi que Hyde Park se
          // retrouvait pavé sous ses arbres alors que le code plantait bien
          // de l'herbe — le tronc et la couronne, eux, survivaient, ce qui
          // rendait le défaut invisible en capture de rue.
          if (arbreDeVille(data, x, z, h, wx, wz, sol, ss)) { fait = true; continue; }
          if (ss !== null) {
            // UN PONT SE POSE AU-DESSUS DE L'EAU, PAS AU FOND DU LIT. Sur une
            // colonne de fleuve, `h` est le lit (base − 7) et l'eau monte
            // jusqu'à WATER_LEVEL : écrire le sol du tablier à `h`, c'est
            // paver le fond de la Tamise sous quatre blocs d'eau. Le tablier
            // va à la cote des quais (base + 1) ; l'eau reste dessous, et le
            // relief ne bouge pas.
            const surEau = pont && h < WATER_LEVEL && pont(wx - city.x, wz - city.z) !== null;
            data[World.index(x, surEau ? city.base + 1 : h, z)] = ss;
          } else if (libre(wx, wz)) {
            batir(wx, wz, (dy, id) => {
              const wy = h + dy - 1;
              if (wy >= 0 && wy < HEIGHT) data[World.index(x, wy, z)] = id;
            });
          }
          fait = true;
        }
        if (fait) continue;

        if (city && city.key === 'sf') {
          const ss = solSF(wx, wz);
          if (ss !== null) data[World.index(x, h, z)] = ss;
          else if (lotSFLibre(wx, wz)) {
            batirColonneSF(wx, wz, (dy, id) => {
              const wy = h + dy - 1;
              if (wy >= 0 && wy < HEIGHT) data[World.index(x, wy, z)] = id;
            });
          }
          // La trame générique ne s'applique pas ici : San Francisco a DEUX
          // quadrillages à elle, qui ne sont pas parallèles. Laisser la trame
          // ordinaire par-dessus, c'était trois grilles superposées — et plus
          // aucune des trois lisible.
          continue;
        }

        // La Chine n'est pas une ville : pas de rues, pas de maisons en
        // grille. Seul son sol parle — la rivière turquoise, l'eau des
        // rizières — et ses monuments font le reste.
        {
          const sc = solChine(wx, wz);
          if (sc !== null) { data[World.index(x, h, z)] = sc; continue; }
        }

        // Le parvis des monuments du tour du monde : dallé sous le monument,
        // herbe sur le pourtour. Sans lui, le Colisée poserait ses arcades
        // dans un pré.
        {
          const scap = solCapitales(wx, wz);
          if (scap !== null) { data[World.index(x, h, z)] = scap; continue; }
        }

        // Les huit villes iconiques : leur sol, et leurs maisons quand la
        // colonne est un lot à bâtir.
        {
          const svm = solVillesMonde(wx, wz);
          if (svm === 'lot') {
            batirColonneVillesMonde(wx, wz, (dy, id) => {
              const wy = h + dy - 1;
              if (wy >= 0 && wy < HEIGHT) data[World.index(x, wy, z)] = id;
            });
            continue;
          }
          // ET LE MÊME REMÈDE POUR LES CINQUANTE VILLES DU TOUR DU MONDE.
          // `solVillesMonde` marque des arbres dans ses parcs, ses oasis et
          // ses forêts — le Tiergarten de Berlin, le Retiro de Madrid, le
          // jardin anglais de Munich — et cette branche les posait à plat
          // comme n'importe quel sol. C'est le défaut de Paris (v187), de
          // Londres, de Nice et de Lille (v197), une quatrième fois : il ne
          // manquait plus que la boucle qui dessine le monde entier.
          if (arbreDeVille(data, x, z, h, wx, wz, solVillesMonde, svm)) continue;
          if (svm !== null) {
            data[World.index(x, h, z)] = svm;
            // Le trottoir porte son mobilier : auvents des boutiques,
            // lampadaires, bancs, bacs à fleurs. Cf. mobilierVillesMonde.
            if (svm === CITY_BLOCK.SIDEWALK) {
              mobilierVillesMonde(wx, wz, (dy, id) => {
                const wy = h + dy;
                if (wy >= 0 && wy < HEIGHT) data[World.index(x, wy, z)] = id;
              });
            }
            continue;
          }
        }

        // La Giga-usine : la dalle du hall, l'asphalte du parc et de la voie,
        // les lignes blanches des places.
        {
          const su = solUsine(wx, wz);
          if (su !== null) { data[World.index(x, h, z)] = su; continue; }
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
      // Six villes se bâtissent colonne par colonne, cf. leurs modules. Oublier
      // Washington dans cette liste ne se voyait pas tout de suite : la trame
      // générique posait par-dessus des maisons pastel de San Francisco, pleines
      // et sans porte, au milieu des maisons de brique de la capitale.
      if (['ny', 'sf', 'nice', 'lille', 'paris', 'dc'].includes(city.key)) continue;
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

          // La Seine et les percées d'Haussmann ne se contentent pas d'écarter
          // le centre du lot : un pâté fait douze blocs de large, et le fleuve
          // dix. Tester le seul centre laissait des immeubles les pieds dans
          // l'eau — on éprouve donc les quatre coins.
          if (city.key === 'paris' && [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [ccx, ccz]]
            .some(([ax, az]) => !lotParisLibre(ax, az))) continue;

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

  // Le plus haut bloc plein d'une colonne, ou -1 si elle est vide.
  //
  // Tout ce qui cherche le sol — poser un animal, faire réapparaître un
  // enfant, dessiner la carte — descendait depuis le plafond du monde. Ce
  // plafond ayant grandi de soixante-quatre blocs, chacune de ces recherches
  // paierait désormais soixante-quatre pas de vide avant même de commencer.
  // On part donc du sommet réel du morceau de monde, déjà connu et tenu à
  // jour : la recherche coûte ce que le terrain contient, et non ce que le
  // ciel mesure. Relever encore le plafond, demain, ne coûtera rien non plus.
  sommetColonne(x, z) {
    const bx = Math.floor(x), bz = Math.floor(z);
    const cx = Math.floor(bx / CHUNK), cz = Math.floor(bz / CHUNK);
    let y = Math.min(HEIGHT - 1, this.chunkTop(cx, cz));
    while (y >= 0 && !this.isSolid(bx, y, bz)) y--;
    return y;
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
      // Une entrée mal formée — écriture tronquée, format plus ancien, moitié
      // de synchronisation — faisait échouer le fondu ENTIER : une seule case
      // douteuse et l'enfant perdait tout le reste du lot, sans un mot. On
      // laisse passer celle-là et on continue.
      if (!Array.isArray(entry) || entry.length < 2) continue;
      const [id, t] = entry;
      if (!Number.isFinite(id) || !Number.isFinite(t)) continue;
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
