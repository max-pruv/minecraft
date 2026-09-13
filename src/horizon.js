// LE PAYSAGE LOINTAIN — celui que les morceaux de monde n'auront jamais le
// temps de bâtir.
//
// Max, capture à l'appui, en vol : du ciel vide entouré au feutre rouge, et
// « 0 improvement ». Mesuré dans le champ de la caméra au-dessus de Paris :
// TRENTE ET UN maillages, et le plus lointain à CINQUANTE-NEUF BLOCS. Le
// brouillard porte pourtant à 188. L'enfant vole donc au-dessus d'un disque de
// monde qui dure une demi-seconde.
//
// LA CAUSE EST ARITHMÉTIQUE, ET AUCUNE MICRO-OPTIMISATION NE LA RÈGLE. Mesuré,
// morceau par morceau :
//
//   campagne vide          6,6 ms   →  153 morceaux/s
//   couloir du témoin      6,8 ms   →  147
//   Paris                 23,5 ms   →   42
//   Londres               22,6 ms   →   44
//
// Voler à cent dix blocs par seconde en réclame CENT SOIXANTE-CINQ (la largeur
// du front de chargement multipliée par les morceaux franchis). Au-dessus
// d'une ville on en produit quarante-deux : il manque un facteur QUATRE. Et le
// chiffre de « 154 morceaux/s » de la v229, sur lequel les vitesses des avions
// ont été réglées, avait été mesuré DANS UN COULOIR VIDE — c'est aussi là que
// vole le témoin qui le garde, à (30 000, 30 000). Il ne pouvait pas voir ce
// que Max voit.
//
// LE REMÈDE EST DE NE PAS PAYER CE PRIX-LÀ. `terrainHeight` est une fonction
// PURE : elle rend la cote d'une colonne sans engendrer le morceau et sans
// mailler une seule face. Vingt-cinq mille neuf cent vingt et une colonnes —
// un carré de 1 280 blocs de côté — coûtent 120 ms au-dessus de Paris. LA MÊME
// SURFACE EN VRAIS MORCEAUX EN COÛTERAIT CENT CINQUANTE SECONDES.
//
// Trois choses à savoir avant d'y toucher.
//
// - ON NE DESSINE QUE LÀ OÙ LE MONDE N'EST PAS CHARGÉ. Chaque case demande au
//   monde si son morceau existe ; s'il existe, la case est retirée du tracé.
//   C'est ce qui évite d'un seul coup les trois artefacts d'un « sol de
//   secours » posé partout : la fausse dalle au fond d'un trou que l'enfant
//   creuse, le plafond coloré d'une grotte, et la bataille de profondeur au
//   ras du vrai terrain. Le paysage lointain remplit EXACTEMENT le vide.
// - IL SE FAIT DÉFILER, IL NE SE REFAIT PAS. C'est la leçon de la minicarte
//   (v233), et `decaler` ci-dessous est le frère de `decalerCarte` : le coût ne
//   dépend plus de la TAILLE du paysage mais de la DISTANCE parcourue. À cent
//   dix blocs par seconde, une case de huit blocs par tour, soit 161 colonnes
//   — sept dixièmes de milliseconde.
// - IL NE TOUCHE À RIEN. Il LIT `terrainHeight` et n'écrit pas un bloc : les
//   deux empreintes de `plafond.js` ne bougent pas d'un octet, et l'invariant 1
//   tient sans qu'on ait rien à déclarer.

import * as THREE from 'three';
import { WATER_LEVEL, DESERT, MARS, VOLCANO, dansUneCalotte, CHUNK } from './world.js';
import { BLOCK } from './blocks.js';
import { decor } from './couches.js';
import { MAP_COLORS } from './carte.js';

export const PAS_HORIZON = 8;   // un sommet tous les huit blocs

// LA PORTÉE SUIT LA DISTANCE D'AFFICHAGE, et ce n'est pas un réglage de
// confort. Le paysage lointain PROLONGE la vue au-delà des morceaux : un joueur
// qui demande un monde de deux morceaux ne demande pas un panorama de six cents
// blocs. Écrite en dur à 640, la portée coûtait VINGT-NEUF POUR CENT de la
// cadence du banc — qui ouvre toutes ses suites à `rr=2` — pour un paysage que
// personne n'avait demandé. Sur l'iPad (rr=12) elle vaut 632, sur un ordinateur
// (rr=16) 840.
export const rayonHorizon = (rayonRendu, chunk) =>
  Math.round(rayonRendu * chunk * 3.3 / PAS_HORIZON) * PAS_HORIZON;

// Le contenu se déplace de (−dix, −diz) cases. Même figure que `decalerCarte`
// dans `main.js` : les lignes se parcourent dans le sens qui évite d'écraser ce
// qu'on n'a pas encore lu, et `copyWithin` fait le reste.
function decaler(buf, N, comp, dix, diz) {
  const ligne = N * comp;
  const montant = dix > 0;
  for (let k = 0; k < N; k++) {
    const ix = montant ? k : N - 1 - k;
    const src = ix + dix;
    if (src < 0 || src >= N) continue;
    const de = src * ligne, vers = ix * ligne;
    if (diz === 0) buf.copyWithin(vers, de, de + ligne);
    else if (diz > 0) buf.copyWithin(vers, de + diz * comp, de + ligne);
    else buf.copyWithin(vers - diz * comp, de, de + ligne + diz * comp);
  }
}

// La couleur d'une colonne, SANS engendrer son morceau. Elle rejoue les règles
// de surface de `generateChunk` — calotte, plage, neige d'altitude, désert,
// Mars, volcan — et va chercher sa teinte dans la palette de la carte, pour que
// la minicarte et le paysage ne disent pas deux choses différentes du même
// endroit (leçon de `couleurToits`).
function blocDeSurface(x, z, h) {
  if (h < WATER_LEVEL) return BLOCK.WATER;
  if (dansUneCalotte(z)) return h <= WATER_LEVEL + 1 ? BLOCK.ICE : BLOCK.SNOW;
  // Les trois biomes ronds sont minuscules et loin de presque toutes les
  // colonnes : une comparaison de BOÎTE avant tout calcul de racine, comme
  // dans `terrainHeight` (v223, +29 % pour dix-neuf `Math.hypot` par colonne).
  for (const b of BIOMES) {
    if (Math.abs(x - b.x) > b.r || Math.abs(z - b.z) > b.r) continue;
    if (Math.hypot(x - b.x, z - b.z) >= b.r - 2) continue;
    if (b.id === BLOCK.STONE && h <= 36) continue;   // le volcan n'a de roche qu'en hauteur
    return b.id;
  }
  if (h <= WATER_LEVEL + 1) return BLOCK.SAND;
  if (h >= 58) return BLOCK.SNOW;
  return BLOCK.GRASS;
}

const BIOMES = [
  { x: DESERT.x, z: DESERT.z, r: DESERT.r, id: BLOCK.SAND },
  { x: MARS.x, z: MARS.z, r: MARS.r, id: BLOCK.MARS_SOL },
  { x: VOLCANO.x, z: VOLCANO.z, r: VOLCANO.r, id: BLOCK.STONE },
];

export class Horizon {
  constructor(world, rayon) {
    this.world = world;
    this.rayon = rayon;
    const N = this.N = (rayon * 2) / PAS_HORIZON + 1;
    this.CASES = N - 1;
    this.ox = null; this.oz = null;          // l'origine de la grille, en CASES
    this.hauteurs = new Float32Array(N * N);
    this.pret = new Uint8Array(N * N);
    this.curseur = 0;                        // où reprendre le remplissage

    const positions = new Float32Array(N * N * 3);
    const couleurs = new Float32Array(N * N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(this.CASES * this.CASES * 6), 1));
    geo.setDrawRange(0, 0);
    this.geo = geo;

    this.materiau = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
    this.mesh = new THREE.Mesh(geo, this.materiau);
    decor(this.mesh);   // le paysage lointain se reflète dans les carrosseries
    this.mesh.frustumCulled = false;         // il entoure toujours le joueur
    // IL SE DESSINE EN DERNIER, ET CE N'EST PAS UN DÉTAIL. three.js trie les
    // opaques du plus PRÈS au plus loin pour que le tampon de profondeur
    // rejette au plus tôt ; mais il trie sur le CENTRE de la boîte englobante,
    // et celle du paysage lointain est centrée sur le joueur. Laissé à lui-même
    // il passait donc en PREMIER, et chaque pixel de l'écran était peint deux
    // fois — une fois par le paysage, une fois par le monde proche. Forcé après
    // tout le reste, il n'est peint QUE là où rien d'autre ne l'a été.
    this.mesh.renderOrder = 1;
    this.mesh.name = 'horizon';
  }

  objet() { return this.mesh; }

  // La couleur du jour, celle du monde entier (`solidMaterial`) : sans elle le
  // paysage lointain resterait en plein soleil à minuit.
  majLumiere(couleur) { this.materiau.color.copy(couleur); }

  // Recentre la grille sur le joueur, remplit ce qui manque dans le budget
  // donné, et rend le nombre de colonnes calculées.
  maj(px, pz, budgetMs = 6) {
    const N = this.N;
    const ncx = Math.round(px / PAS_HORIZON), ncz = Math.round(pz / PAS_HORIZON);
    const nox = ncx - (N - 1) / 2, noz = ncz - (N - 1) / 2;
    if (this.ox === null) { this.ox = nox; this.oz = noz; this.pret.fill(0); this.curseur = 0; }
    else if (nox !== this.ox || noz !== this.oz) {
      const dix = nox - this.ox, diz = noz - this.oz;
      if (Math.abs(dix) >= N || Math.abs(diz) >= N) { this.pret.fill(0); }
      else {
        decaler(this.hauteurs, N, 1, dix, diz);
        decaler(this.pret, N, 1, dix, diz);
        // LES SOMMETS DÉFILENT AUSSI, et c'est ce qui rend l'affaire tenable.
        // Mon premier jet réécrivait les 25 921 sommets — position, couleur,
        // biome — à CHAQUE image où quelque chose bougeait : huit millisecondes
        // et trois cents kilo-octets envoyés à la carte graphique par image. Le
        // maillage du monde proche n'avait plus de budget, et le paysage
        // lointain avait AVALÉ le monde : sept appels de dessin au lieu de
        // quarante. Comme les coordonnées écrites sont ABSOLUES, les décaler
        // les laisse justes — c'est exactement le défilement de la minicarte.
        decaler(this.geo.attributes.position.array, N, 3, dix, diz);
        decaler(this.geo.attributes.color.array, N, 3, dix, diz);
        // les bandes découvertes n'ont rien de valable
        if (dix > 0) this.pret.fill(0, (N - dix) * N, N * N);
        if (dix < 0) this.pret.fill(0, 0, -dix * N);
        if (diz !== 0) {
          for (let ix = 0; ix < N; ix++) {
            const l = ix * N;
            if (diz > 0) this.pret.fill(0, l + N - diz, l + N);
            else this.pret.fill(0, l, l - diz);
          }
        }
      }
      this.ox = nox; this.oz = noz;
      this.curseur = 0;
    }

    const t0 = performance.now();
    let faites = 0;
    const total = N * N;
    for (let n = 0; n < total; n++) {
      const i = (this.curseur + n) % total;
      if (this.pret[i]) continue;
      const ix = (i / N) | 0, iz = i - ix * N;
      const x = (this.ox + ix) * PAS_HORIZON, z = (this.oz + iz) * PAS_HORIZON;
      this.hauteurs[i] = this.world.terrainHeight(x, z);
      this.ecrireSommet(i, x, z, this.hauteurs[i]);
      this.pret[i] = 1;
      faites++;
      if ((faites & 255) === 0 && performance.now() - t0 > budgetMs) {
        this.curseur = (i + 1) % total;
        break;
      }
    }
    if (faites > 0) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.color.needsUpdate = true;
    }
    return faites;
  }

  ecrireSommet(i, x, z, h) {
    const pos = this.geo.attributes.position.array;
    const col = this.geo.attributes.color.array;
    const o = i * 3;
    const id = blocDeSurface(x, z, h);
    // Un demi-bloc SOUS la vraie surface : là où le monde chargé et le paysage
    // lointain se touchent, c'est toujours le vrai terrain qui gagne.
    pos[o] = x;
    pos[o + 1] = id === BLOCK.WATER ? WATER_LEVEL + 0.4 : h + 0.5;
    pos[o + 2] = z;
    const c = MAP_COLORS[id] || [140, 140, 140];
    // Le relief lit plus clair en altitude, comme sur la carte 2D — sans cela
    // un massif et une plaine ont exactement la même teinte.
    const teinte = 0.72 + Math.min(Math.max(h, 0), 70) / 70 * 0.38;
    col[o] = Math.min(1, c[0] / 255 * teinte);
    col[o + 1] = Math.min(1, c[1] / 255 * teinte);
    col[o + 2] = Math.min(1, c[2] / 255 * teinte);
  }

  // ON NE DESSINE QUE CE QUI N'EST PAS DESSINÉ. Une case dont le morceau de
  // monde est MAILLÉ est retirée du tracé : le vrai monde a toujours le dernier
  // mot, et le paysage lointain ne peut ni percer un plancher, ni tapisser une
  // grotte.
  //
  // ET C'EST LE MAILLAGE QUI DÉCIDE, PAS LA DONNÉE. Mon premier jet demandait à
  // `world.chunks` — les morceaux ENGENDRÉS. Or un morceau peut être engendré
  // sans être maillé : `getBlock` en fabrique bien au-delà du front de maillage
  // (collisions, passants, convois). Le paysage se retirait donc devant un
  // monde qui n'était pas encore dessiné, et laissait un TROU de ciel vide de
  // soixante à cent quatre-vingt-dix blocs — exactement là où Max l'avait
  // entouré. La question n'est pas « ce morceau existe-t-il » mais « le
  // voit-on ».
  // ET L'ON NE DESSINE PAS CE QU'ON A DANS LE DOS. Le paysage fait un disque
  // complet autour du joueur, mais un seul maillage ne se découpe pas au
  // champ de vision : sans ce test, plus de la moitié de ses triangles sont
  // rasterisés pour rien derrière la caméra. Le cône est large (±110°, contre
  // 46° de champ réel) pour qu'un demi-tour ne découvre jamais de trou avant
  // que la découpe ne se refasse.
  majDecoupe(estDessine, px, pz, vx, vz) {
    const N = this.N, CASES = this.CASES;
    const idx = this.geo.index.array;
    let n = 0;
    for (let ix = 0; ix < CASES; ix++) {
      const wx = (this.ox + ix) * PAS_HORIZON;
      const cxA = Math.floor(wx / CHUNK);
      for (let iz = 0; iz < CASES; iz++) {
        const wz = (this.oz + iz) * PAS_HORIZON;
        const cz = Math.floor(wz / CHUNK);
        if (estDessine(cxA, cz)) continue;
        const dx = wx - px, dz = wz - pz;
        const d2 = dx * dx + dz * dz;
        if (d2 > 100 * 100 && dx * vx + dz * vz < -0.34 * Math.sqrt(d2)) continue;
        // LE SENS DE PARCOURS SE CALCULE, IL NE SE DEVINE PAS. Écrits
        // (a, c, b) — l'ordre qui vient sous les doigts — les deux triangles
        // ont leur normale vers le BAS : un avion les regarde donc par leur
        // face arrière, éliminée au rendu, et l'on ne voit rien du tout.
        // C'est le piège du roulis de la v231 par un autre bout : un SIGNE se
        // vérifie, il ne se déduit pas.
        //   a = (x, z)   b = (x, z+8)   c = (x+8, z)   d = (x+8, z+8)
        //   (b−a) × (c−a) = (0,0,8) × (8,0,0) = (0, +64, 0)  → vers le haut
        //   (d−b) × (c−b) = (8,0,0) × (8,0,−8) = (0, +64, 0) → vers le haut
        const a = ix * N + iz, b = a + 1, c = a + N, d = c + 1;
        idx[n] = a; idx[n + 1] = b; idx[n + 2] = c;
        idx[n + 3] = b; idx[n + 4] = d; idx[n + 5] = c;
        n += 6;
      }
    }
    this.geo.index.needsUpdate = true;
    this.geo.setDrawRange(0, n);
    return n / 6;
  }

  // Pour les sondes et les témoins : jusqu'où le paysage porte-t-il vraiment.
  etat() {
    let manquantes = 0;
    for (let i = 0; i < this.pret.length; i++) if (!this.pret[i]) manquantes++;
    return { pas: PAS_HORIZON, rayon: this.rayon, colonnes: this.N * this.N, manquantes,
      triangles: this.geo.drawRange.count / 3 };
  }
}
