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
// - ET SOUS UNE ROUTE, IL LIT LA ROUTE (v300). `world.coteHorizon` rend le
//   relief partout, sauf sous l'A1 où c'est la chaussée ou le talus : lu au
//   relief, le paysage refermait le déblai d'une dalle de terre au-dessus de
//   la route tant que le morceau n'était pas maillé.

import * as THREE from 'three';
import { WATER_LEVEL, DESERT, MARS, VOLCANO, dansUneCalotte, CHUNK, matiereDuBord, NEIGE_TOUNDRA } from './world.js';
import { INDICE_CLIMAT, TEINTE_HERBE, TEINTE_FEUILLES } from './terre.js';
import { BLOCK, DECOR_START, decorMapColor } from './blocks.js';
import { decor } from './couches.js';
import { MAP_COLORS } from './carte.js';
import { villeMondeEn } from './villesmonde.js';

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
function blocDeSurface(x, z, h, world) {
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
  // le climat (v341, v344), la même question que le générateur : le désert
  // est de sable, la toundra de neige là où le relief monte
  const cl = world && world.climat ? world.climat(x, z) : null;
  if (cl === 'desert') return BLOCK.SAND;
  if (cl === 'toundra' && h >= NEIGE_TOUNDRA) return BLOCK.SNOW;
  return BLOCK.GRASS;
}

// LA COULEUR DE L'HERBE D'UN CLIMAT, VUE DE LOIN (v344). L'herbe de la carte
// sous la teinte du climat — la même que le mailleur pose sur le bloc — et,
// pour la taïga, mêlée à moitié au feuillage sombre qui la couvre presque
// partout. Pure et exportée : le témoin la lit, la carte dit la même chose.
export function herbeDuClimat(it, herbe = MAP_COLORS[BLOCK.GRASS]) {
  if (!it) return herbe;
  const t = TEINTE_HERBE[it];
  const c = [herbe[0] * t[0], herbe[1] * t[1], herbe[2] * t[2]];
  if (it !== INDICE_CLIMAT.taiga) return c;
  const f = TEINTE_FEUILLES[it], fe = MAP_COLORS[BLOCK.LEAVES];
  return [(c[0] + fe[0] * f[0]) / 2, (c[1] + fe[1] * f[1]) / 2, (c[2] + fe[2] * f[2]) / 2];
}

// Le relief lit plus clair en altitude, comme sur la carte 2D — sans cela un
// massif et une plaine ont exactement la même teinte.
function teindre(col, o, c, h) {
  const teinte = 0.72 + Math.min(Math.max(h, 0), 70) / 70 * 0.38;
  col[o] = Math.min(1, c[0] / 255 * teinte);
  col[o + 1] = Math.min(1, c[1] / 255 * teinte);
  col[o + 2] = Math.min(1, c[2] / 255 * teinte);
}

// L'état d'un sommet : à remplir (0), relief et couleur posés mais la règle
// des bords pas encore lue, ou fini.
const A_RAFFINER = 1, FAIT = 2;

// La couleur qu'un sommet d'herbe prend sous la règle des bords (v326) : son
// dessus quand il n'est plus de l'herbe — la roche d'une crête, le sable d'une
// grève — et, sur une marche de deux ou trois blocs qui garde son gazon, la
// moitié de roche de sa paroi, qu'on voit de loin. `null` : rien ne change.
// Pure et exportée : le témoin la lit.
export function couleurDuBord(herbe, r) {
  if (!r) return null;
  if (r.top !== BLOCK.GRASS) return MAP_COLORS[r.top] || herbe;
  if (r.chute < 2) return null;
  const roc = MAP_COLORS[BLOCK.STONE];
  return [(herbe[0] + roc[0]) / 2, (herbe[1] + roc[1]) / 2, (herbe[2] + roc[2]) / 2];
}

const BIOMES = [
  { x: DESERT.x, z: DESERT.z, r: DESERT.r, id: BLOCK.SAND },
  { x: MARS.x, z: MARS.z, r: MARS.r, id: BLOCK.MARS_SOL },
  { x: VOLCANO.x, z: VOLCANO.z, r: VOLCANO.r, id: BLOCK.STONE },
];

// LES VILLES SE RECONNAISSENT AU LOIN (v331). `terrainHeight` ne sait rien des
// immeubles : au-delà des morceaux maillés, Paris, Londres, New York et les
// deux cent soixante-neuf villes engendrées étaient de la PRAIRIE vue d'avion.
// Deux choses, et aucune n'écrit un bloc ni ne touche au relief :
//
// - UNE TEINTE URBAINE PAR SOMMET : le gris des rues mêlé à la couleur des
//   toits de la ville (`couleurToits` de sa fiche, la même que la carte 2D).
// - UNE SILHOUETTE DE BÂTI : un pavé par case de huit blocs, six de côté (les
//   deux qui restent sont la rue), à la hauteur PROPRE de la ville. UN SEUL
//   appel de dessin (`InstancedMesh`) pour tout le paysage.
//
// LA QUESTION « EST-CE UNE VILLE ? » NE SE POSE PAS À 280 VILLES PAR COLONNE.
// Les villes engendrées ont leur index de cases de 512 blocs (`villeMondeEn`) ;
// les sept villes bâties à la main se filtrent par une BOÎTE avant toute racine
// (`villesMainPres`), et `world.cityAt` — qui connaît la vraie forme de
// Manhattan (`TerreUrbaine`), de San Francisco, de Nice et de Washington — n'est
// interrogé que si la boîte touche.

// La hauteur d'un immeuble vu de loin, en blocs, et la couleur de ses toits.
// Les villes bâties à la main ont leurs chiffres relevés dans CLAUDE.md : Paris
// à trois blocs l'étage (v301), New York et ses tours, Washington basse.
const VILLES_MAIN = {
  paris: { h: [14, 24], tours: 0, toit: [122, 128, 138], mur: [214, 203, 178] },     // le zinc
  ny: { h: [12, 30], tours: 0.35, toit: [128, 126, 124], mur: [176, 170, 162] },
  londres: { h: [10, 18], tours: 0.05, toit: [118, 112, 112], mur: [168, 112, 92] },
  sf: { h: [8, 14], tours: 0.1, toit: [150, 146, 140], mur: [218, 212, 200] },
  nice: { h: [10, 18], tours: 0, toit: [178, 108, 82], mur: [224, 192, 150] },
  lille: { h: [8, 14], tours: 0, toit: [104, 96, 96], mur: [160, 92, 72] },
  dc: { h: [6, 12], tours: 0, toit: [150, 148, 142], mur: [226, 222, 212] },
};
const GRIS_RUE = [96, 97, 101];

// La couleur des murs d'une ville engendrée : la moyenne de sa palette de
// façades, lue comme la carte 2D la lit (`decorMapColor`). Mémoïsée par fiche.
const MURS = new Map();
function murDeFiche(f) {
  let m = MURS.get(f);
  if (m) return m;
  const cs = (f.palette || []).map((id) => MAP_COLORS[id] || (id >= DECOR_START && decorMapColor(id))).filter(Boolean);
  m = cs.length ? [0, 1, 2].map((k) => cs.reduce((a, c) => a + c[k], 0) / cs.length) : [180, 172, 160];
  MURS.set(f, m);
  return m;
}

// Un tirage par case, en coordonnées du MONDE (sinon le motif changerait au
// défilement) : la ville a des hauteurs variées, pas un plateau.
function hacher(x, z) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Ce que la ville met sur cette case : sa hauteur de bâti (0 = rien, une rue,
// un parc) et la couleur de ses toits. `null` hors de toute ville.
export function urbainEn(world, x, z, villesMain) {
  let h, tours, toit, cle, mur;
  const f = villeMondeEn(x, z);
  if (f) {
    const hm = f.hMaison || [4, 6];
    h = hm; tours = (f.trame && f.trame.tours) || 0; toit = f.couleurToits || [150, 140, 130]; cle = f.cle;
    mur = murDeFiche(f);
  } else {
    if (!villesMain(x, z)) return null;
    const c = world.cityAt(x, z);
    if (!c) return null;
    const m = VILLES_MAIN[c.key] || { h: [8, 14], tours: 0, toit: [150, 140, 130] };
    h = m.h; tours = m.tours; toit = m.toit; cle = c.key; mur = m.mur || [180, 172, 160];
  }
  const t = hacher(x, z), t2 = hacher(z + 7, x - 3);
  // Une case sur cinq est une rue, une cour, une place : la ville se lit en
  // îlots, pas en tapis.
  let haut = 0;
  if (t2 > 0.2) {
    // La hauteur de la grammaire à travées (villesmonde.js) : trois blocs par
    // étage plus le rez-de-chaussée ; `hMaison` est en étages-blocs.
    const etages = Math.max(1, Math.round((h[0] + t * (h[1] - h[0]) + 1) / 3));
    haut = 3 + etages * 3;
    if (tours && t2 > 1 - tours * 0.3) haut = Math.round(haut * (2 + t));   // une tour
  }
  return { haut, toit, mur, cle };
}

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
    this.curseurRegle = 0;                   // … et la règle des bords (v340)
    this.aRaffiner = false;                  // reste-t-il un sommet à relire ?
    // le jeu l'éteint à l'accueil : la préparation garde toutes ses images
    this.raffinerPermis = true;
    this.falaises = !!world.conf?.falaises;
    // La ville sous chaque sommet : la hauteur de bâti (0 = aucun) et la
    // couleur des toits. Elles DÉFILENT avec les hauteurs, comme tout le reste.
    this.bati = new Float32Array(N * N);
    this.toits = new Float32Array(N * N * 3);   // la couleur des MURS du bâti
    this.estNY = new Uint8Array(N * N);
    // le climat de chaque sommet d'herbe (v344) : la règle des bords le relit
    this.climats = new Uint8Array(N * N);
    this.sansNY = false;                     // Manhattan dessine ses propres silhouettes
    // Le filtre des sept villes bâties à la main, par BOÎTE. Manhattan déborde
    // de son disque du registre (TerreUrbaine la tient dans 1 300 blocs).
    this.boitesMain = (world.conf?.villes || []).map((c) => {
      const r = (c.key === 'ny' ? Math.max(c.r, 1300) : c.r) + 2;
      return [c.x - r, c.x + r, c.z - r, c.z + r];
    });
    this.villesMain = (x, z) => {
      for (const b of this.boitesMain) if (x >= b[0] && x <= b[1] && z >= b[2] && z <= b[3]) return true;
      return false;
    };

    const positions = new Float32Array(N * N * 3);
    const couleurs = new Float32Array(N * N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(this.CASES * this.CASES * 6), 1));
    geo.setDrawRange(0, 0);
    this.geo = geo;

    // ÉCLAIRÉ COMME LE MONDE PROCHE (v247) : Lambert, avec des normales vers
    // le haut posées une fois — un paysage à des centaines de blocs se lit
    // comme du sol, et recalculer des normales à chaque défilement coûterait
    // pour rien. Sans cela, le lointain resterait au niveau de gris d'avant
    // pendant que le monde proche prend le soleil, et la couture se verrait.
    const normales = new Float32Array(N * N * 3);
    for (let i = 0; i < N * N; i++) normales[i * 3 + 1] = 1;
    geo.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
    this.materiau = new THREE.MeshLambertMaterial({ vertexColors: true, fog: true });
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

    // LE BÂTI LOINTAIN : un pavé unitaire, posé, étiré et teint par instance.
    // La capacité est un plafond, pas une prévision : au-dessus de Paris à
    // `rr=12`, le cône de vision en garde quelques milliers.
    this.capacite = Math.min(16000, this.CASES * this.CASES);
    const boite = new THREE.BoxGeometry(1, 1, 1);
    boite.translate(0.5, 0.5, 0.5);          // l'origine au coin bas, comme une case
    // L'instance porte la couleur des MURS ; le dessus est assombri par une
    // couleur de sommet — un toit vu d'avion se lit plus sombre que ses façades.
    const pb = boite.attributes.position.array, cb = new Float32Array(pb.length);
    for (let k = 0; k < pb.length; k += 3) {
      const dessus = boite.attributes.normal.array[k + 1] > 0.5;
      cb[k] = cb[k + 1] = cb[k + 2] = dessus ? 0.62 : 1;
    }
    boite.setAttribute('color', new THREE.BufferAttribute(cb, 3));
    this.materiauBati = new THREE.MeshLambertMaterial({ fog: true, vertexColors: true });
    this.bat = new THREE.InstancedMesh(boite, this.materiauBati, this.capacite);
    this.bat.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bat.setColorAt(0, new THREE.Color(1, 1, 1));
    this.bat.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.bat.count = 0;
    this.bat.frustumCulled = false;
    this.bat.renderOrder = 1;                // même raison que le sol lointain
    this.bat.name = 'horizon-bati';
    decor(this.bat);
    this.mesh.add(this.bat);                 // il suit le paysage dans la scène
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
        decaler(this.bati, N, 1, dix, diz);
        decaler(this.toits, N, 3, dix, diz);
        decaler(this.estNY, N, 1, dix, diz);
        decaler(this.climats, N, 1, dix, diz);
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
      this.hauteurs[i] = this.world.coteHorizon(x, z);   // le relief, ou la route qui le creuse (v300)
      this.ecrireSommet(i, x, z, this.hauteurs[i]);
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
    // la règle des bords ne prend que ce qui reste, deux millisecondes au plus
    // par image, et rien du tout une fois tout lu
    const t1 = performance.now();
    if (this.aRaffiner && this.raffinerPermis !== false && t1 - t0 <= budgetMs) faites += this.raffiner(t1, Math.min(2, budgetMs - (t1 - t0)));
    return faites;
  }

  ecrireSommet(i, x, z, h) {
    const pos = this.geo.attributes.position.array;
    const col = this.geo.attributes.color.array;
    const o = i * 3;
    const id = blocDeSurface(x, z, h, this.world);
    // Un demi-bloc SOUS la vraie surface : là où le monde chargé et le paysage
    // lointain se touchent, c'est toujours le vrai terrain qui gagne.
    pos[o] = x;
    pos[o + 1] = id === BLOCK.WATER ? WATER_LEVEL + 0.4 : h + 0.5;
    pos[o + 2] = z;
    let c = MAP_COLORS[id] || [140, 140, 140];
    // Sous une ville, hors de l'eau : le gris des rues mêlé aux toits.
    const u = id === BLOCK.WATER ? null : urbainEn(this.world, x, z, this.villesMain);
    // l'herbe de la toundra et de la taïga (v344), hors des villes
    const it = id === BLOCK.GRASS && !u && this.world.climat ? (INDICE_CLIMAT[this.world.climat(x, z)] || 0) : 0;
    this.climats[i] = it;
    if (it) c = herbeDuClimat(it);
    if (u) {
      c = [(GRIS_RUE[0] + u.toit[0]) / 2, (GRIS_RUE[1] + u.toit[1]) / 2, (GRIS_RUE[2] + u.toit[2]) / 2];
      this.bati[i] = u.haut;
      this.toits[o] = u.mur[0] / 255; this.toits[o + 1] = u.mur[1] / 255; this.toits[o + 2] = u.mur[2] / 255;
      this.estNY[i] = u.cle === 'ny' ? 1 : 0;
    } else {
      this.bati[i] = 0;
      this.estNY[i] = 0;
    }
    teindre(col, o, c, h);
    // De l'herbe de campagne : la règle des bords (v340) passera après.
    this.pret[i] = id === BLOCK.GRASS && !u && this.falaises ? A_RAFFINER : FAIT;
    if (this.pret[i] === A_RAFFINER) this.aRaffiner = true;
  }

  // LES FALAISES ET LES BERGES, VUES DE LOIN (v340). Le monde proche montre
  // depuis la v326 de la roche sur une marche de deux blocs et plus, une crête
  // de roche dès quatre, une grève au bord de l'eau ; le paysage lointain
  // gardait le vert de la carte partout. Il lit la MÊME règle, `matiereDuBord`,
  // sur la colonne du sommet — un échantillon de la règle, pas une moyenne
  // inventée — et seulement là où elle s'applique : de l'herbe de campagne,
  // hors ville.
  //
  // ET ELLE PASSE APRÈS LE RELIEF, DANS LE BUDGET QUI RESTE. Quatre cotes de
  // plus par sommet, c'est +6 µs sur trois (mesuré, `sonde-horizon-bords.cjs`) :
  // dans la boucle de remplissage, le paysage arrivait trois fois plus tard
  // après une téléportation. Le relief et sa couleur d'abord, à la cadence
  // d'avant au sommet près ; la roche et le sable ensuite, quand il n'y a plus
  // rien à remplir. La règle ne mord que sur un sommet de campagne sur
  // soixante-quinze : le paysage est juste avant d'être fini.
  raffiner(t0, budgetMs) {
    const N = this.N, total = N * N;
    const col = this.geo.attributes.color.array;
    const th = (a, b) => this.world.terrainHeight(a, b);
    let faites = 0, change = false, n = 0;
    for (; n < total; n++) {
      const i = (this.curseurRegle + n) % total;
      if (this.pret[i] !== A_RAFFINER) continue;
      const ix = (i / N) | 0, iz = i - ix * N;
      const x = (this.ox + ix) * PAS_HORIZON, z = (this.oz + iz) * PAS_HORIZON;
      const h = this.hauteurs[i];
      const c = couleurDuBord(herbeDuClimat(this.climats[i]),
        matiereDuBord(h, th(x + 1, z), th(x - 1, z), th(x, z + 1), th(x, z - 1)));
      if (c) { teindre(col, i * 3, c, h); change = true; }
      this.pret[i] = FAIT;
      faites++;
      if ((faites & 63) === 0 && performance.now() - t0 > budgetMs) {
        this.curseurRegle = (i + 1) % total;
        break;
      }
    }
    if (n === total) this.aRaffiner = false;   // un tour complet sans rien laisser
    if (change) this.geo.attributes.color.needsUpdate = true;
    return faites;
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
    const mat = this.bat.instanceMatrix.array, col = this.bat.instanceColor.array, cap = this.capacite;
    let nb = 0;
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
        if (this.bati[a] > 0 && nb < cap && !(this.sansNY && this.estNY[a])) {
          // Le pavé repose sur le PLUS BAS des quatre coins de sa case, pour
          // ne jamais flotter au-dessus d'une pente ; six blocs sur huit, les
          // deux qui restent sont la rue.
          const pos = this.geo.attributes.position.array;
          const y0 = Math.min(pos[a * 3 + 1], pos[b * 3 + 1], pos[c * 3 + 1], pos[d * 3 + 1]) - 0.5;
          const m = mat, k = nb * 16;
          m[k] = 6; m[k + 1] = 0; m[k + 2] = 0; m[k + 3] = 0;
          m[k + 4] = 0; m[k + 5] = this.bati[a] + 0.5; m[k + 6] = 0; m[k + 7] = 0;
          m[k + 8] = 0; m[k + 9] = 0; m[k + 10] = 6; m[k + 11] = 0;
          m[k + 12] = wx + 1; m[k + 13] = y0; m[k + 14] = wz + 1; m[k + 15] = 1;
          col[nb * 3] = this.toits[a * 3]; col[nb * 3 + 1] = this.toits[a * 3 + 1]; col[nb * 3 + 2] = this.toits[a * 3 + 2];
          nb++;
        }
        idx[n] = a; idx[n + 1] = b; idx[n + 2] = c;
        idx[n + 3] = b; idx[n + 4] = d; idx[n + 5] = c;
        n += 6;
      }
    }
    this.geo.index.needsUpdate = true;
    this.geo.setDrawRange(0, n);
    this.bat.count = nb;
    if (nb > 0) {
      this.bat.instanceMatrix.clearUpdateRanges?.();
      this.bat.instanceMatrix.needsUpdate = true;
      this.bat.instanceColor.needsUpdate = true;
    }
    return n / 6;
  }

  // Pour les sondes et les témoins : jusqu'où le paysage porte-t-il vraiment.
  etat() {
    let manquantes = 0, aRaffiner = 0;
    for (let i = 0; i < this.pret.length; i++) {
      if (!this.pret[i]) manquantes++;
      else if (this.pret[i] === A_RAFFINER) aRaffiner++;
    }
    return { pas: PAS_HORIZON, rayon: this.rayon, colonnes: this.N * this.N, manquantes, aRaffiner,
      triangles: this.geo.drawRange.count / 3, bati: this.bat.count };
  }
}
