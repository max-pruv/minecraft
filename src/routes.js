// Les routes entre les villes — le REGISTRE des corridors (v299).
//
// Programme « monde fidèle », livraison 3. Une route interurbaine est un
// corridor : deux portes de ville, un axe (une polyligne, jamais une droite
// quand un aérodrome est sur le chemin), un PROFIL vertical à pente bornée,
// une SECTION, et des OUVRAGES là où le profil quitte le terrain. Le sol
// continu (`solcontinu.js`) LIT ce registre : sous un corridor, la surface est
// celle du profil, raccordée au terrain par un talus ; le rendu, le contact au
// sol, la circulation interurbaine et la carte lisent la même chose. C'est la
// discipline de `trains.js` (une pièce de voie publiée, lue par le monde et
// par les témoins), appliquée à la route — et c'est de `trains.js` que vient la
// forme : un index spatial par cases de 512, un profil en filtre en cône.
//
// PUR : ni three, ni document. Importé par `world.js`, donc par le worker de
// maillage — le premier `import 'three'` de ce graphe le tuerait (v251).
//
// TOUTE COTE EST CONTINUE. Le rail arrondit sa cote au bloc et le train saute
// (272 sauts d'un bloc sur Londres–Paris, mesuré en v297) ; ici `routeEn`
// rend un flottant, et le voxel sous la route n'est que le REMBLAI — la
// surface, le contact et le convoi lisent le profil, jamais le bloc.

import { positionDe } from './mondes.js';

// --- le registre --------------------------------------------------------------
//
// `via` : les points de passage ÉCRITS EN BLOCS DU MONDE, parce qu'ils sont
// des résultats de mesure et non des adresses de ville. Celui de l'A1 est le
// contournement de Roissy : l'axe direct Paris–Lille passe à 83 blocs du
// centre de l'aérodrome, dont le disque fait 92 (mesuré sous node, v299) ; le
// point de passage est à l'est, à r + 12 + demi-emprise du centre — la
// promesse des aérodromes (v223) — et le détour coûte 5 blocs contre 151 par
// l'ouest. Le vrai A1 passe à l'ouest de Roissy ; le Roissy du jeu a été
// déplacé (v223), et l'on contourne celui du jeu.
export const ROUTES = [
  // LE POINT DE PASSAGE SE MESURE (v223, v299). L'axe direct Paris–Lille
  // passe DANS la marge de Roissy (5 blocs à l'intérieur de r + 12) et la
  // maison témoin de plafond.js (−100, −100) est de l'autre côté : le couloir
  // entre les deux fait huit blocs. Cherché sous node (scratchpad
  // cherche-via3.mjs, un et deux points de passage, angle ≤ 30°) : aucun
  // tracé ne tient à la fois quarante blocs de la maison et la marge de
  // Roissy. Celui-ci tient 37 blocs de la maison (l'emprise et le talus en
  // prennent au plus 21) et 2,7 blocs au-delà de la marge de Roissy, avec un
  // seul coude de 5°, un détour d'un demi-bloc, la même pente (0,064), le
  // même remblai (4,0) et les mêmes deux ponts que l'axe direct.
  { nom: 'A1', villes: ['paris', 'lille'], via: [[-150, -50]] },
];

// --- la section -----------------------------------------------------------------
//
// Une route à deux fois deux voies, dimensionnée sur la VOITURE (2,26 blocs de
// large, `DEMI_LARG_VOITURE` de vehicules.js) et non sur la projection : c'est
// la section `highway` du cahier de Max (`roadSection`, `unitsPerMeter` = 1 —
// le joueur fait 1,8 bloc, une voiture 4,4 : un bloc vaut un mètre à l'échelle
// de ce qui roule). Voie 3,5 ; deux voies par sens ; un terre-plein d'un bloc ;
// un accotement d'un bloc de chaque côté. Dix-sept blocs d'emprise, contre
// neuf pour la voie ferrée double.
export const VOIE = 3.5;
export const VOIES_PAR_SENS = 2;
export const TERRE_PLEIN = 1;
export const ACCOTEMENT = 1;
export const DEMI_CHAUSSEE = VOIE * VOIES_PAR_SENS;                      // 7 : un sens
export const DEMI_EMPRISE = TERRE_PLEIN / 2 + DEMI_CHAUSSEE + ACCOTEMENT; // 8,5
// En ville la route devient une avenue : sur les derniers `RACCORD` blocs de
// chaque bout, la section se resserre jusqu'à `DEMI_VILLE` — la demi-chaussée
// d'un boulevard à double sens (5,6 blocs, v271, v294).
export const DEMI_VILLE = 2.8;
export const RACCORD = 40;
// Le corridor entre DANS le disque de la ville jusqu'à `BORD_VILLE` du bord :
// c'est la largeur du raccord de relief d'une ville à sa campagne (vingt blocs,
// la même que les aérodromes), et le profil s'y épingle sur le sol de la ville,
// qui est plat. Mesuré à Paris : de 42 à la porte à 34 seize blocs plus loin.
export const BORD_VILLE = 20;

// --- le profil -------------------------------------------------------------------
//
// Six pour cent : la cible du cahier pour une route principale, mesurée
// praticable sur Paris–Lille (pente max 0,063 bouts épinglés, remblai 5,5 au
// pire, déblai 7,2). Le filtre en cône de `trains.js` garantit la pente par
// construction ; puis les deux bouts s'ÉPINGLENT sur le sol des portes par une
// rampe linéaire, qui ajoute au plus |écart| / longueur de pente — un
// centième sur huit cents blocs.
export const PENTE = 0.06;
// Au-delà de `VIADUC` blocs de remblai, ou sur l'eau, le remblai devient un
// PONT : tablier au profil, piles, et le sol dessous reste le sol. Un déblai
// se creuse jusqu'à `DEBLAI_MAX` — au-delà ce serait un tunnel, et aucun
// corridor n'en a besoin (mesuré : 7,2 au pire).
export const VIADUC = 4;
export const DEBLAI_MAX = 9;
// La pente du talus, par bloc d'écart à l'axe : 0,7 et non 1, parce que les
// quatre coins d'une cellule de surface s'écartent de l'axe de |fx| + |fz|
// blocs entre eux — jusqu'à √2 sur une route à 45° — et qu'à un bloc par bloc
// la cellule dépassait `MARCHE_MAX` et rendait la main au voxel. Mesuré sur le
// premier jet : 270 cellules de talus sur 3 705 refusées à 0,8, aucune à 0,7.
export const TALUS_PENTE = 0.7;
export const PILE_PAS = 8;          // une paire de piles tous les huit blocs
export const NIVEAU_EAU = 30;       // `WATER_LEVEL` : l'importer de world.js ferait un cycle

let SOL = null;
const PROFILS = new Map();
export function brancherSol(fn) { SOL = fn; PROFILS.clear(); }

// --- les segments ---------------------------------------------------------------

function porte(C, vers) {
  const vx = vers[0] - C.x, vz = vers[1] - C.z, l = Math.hypot(vx, vz) || 1;
  const r = C.r - BORD_VILLE;
  return [C.x + vx / l * r, C.z + vz / l * r];
}

let SEGMENTS = null;
export function segmentsDeRoute() {
  if (SEGMENTS) return SEGMENTS;
  SEGMENTS = [];
  for (const route of ROUTES) {
    for (let i = 0; i < route.villes.length - 1; i++) {
      const A = positionDe(route.villes[i]), B = positionDe(route.villes[i + 1]);
      const via = i === 0 ? route.via || [] : [];
      const pA = porte(A, via[0] || [B.x, B.z]);
      const pB = porte(B, via[via.length - 1] || [A.x, A.z]);
      const pts = [pA, ...via, pB];
      const cumul = [0];
      for (let k = 1; k < pts.length; k++) cumul.push(cumul[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      SEGMENTS.push({ route, de: route.villes[i], vers: route.villes[i + 1], pts, cumul, longueur: cumul[cumul.length - 1] });
    }
  }
  return SEGMENTS;
}

// L'index spatial, bloc par bloc le long de l'axe (leçon de l'ICE, v242 : un
// échantillon tous les 256 blocs rate une case dont on coupe le coin).
const CASE = 512;
let INDEX = null;
function indexer() {
  INDEX = new Map();
  for (const s of segmentsDeRoute()) {
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [x0, z0] = s.pts[k], [x1, z1] = s.pts[k + 1];
      const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0)) + 1;
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
        const m = DEMI_EMPRISE + DEBLAI_MAX / TALUS_PENTE + 2;
        for (let cx = Math.floor((x - m) / CASE); cx <= Math.floor((x + m) / CASE); cx++) {
          for (let cz = Math.floor((z - m) / CASE); cz <= Math.floor((z + m) / CASE); cz++) {
            const cle = cx * 100000 + cz;
            let liste = INDEX.get(cle);
            if (!liste) INDEX.set(cle, liste = []);
            if (!liste.includes(s)) liste.push(s);
          }
        }
      }
    }
  }
}
const RIEN = [];
const pres = (x, z) => {
  if (!INDEX) indexer();
  return INDEX.get(Math.floor(x / CASE) * 100000 + Math.floor(z / CASE)) || RIEN;
};

// La projection d'un point sur l'axe : l'abscisse `s` le long de la polyligne,
// l'écart SIGNÉ `d` (positif à droite du sens de marche, la droite valant
// (−fz, fx) — la convention de la conduite à droite, v271), et la direction.
export function projeter(seg, x, z) {
  let best = null;
  for (let k = 0; k + 1 < seg.pts.length; k++) {
    const [x0, z0] = seg.pts[k], [x1, z1] = seg.pts[k + 1];
    const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz || 1, l = Math.sqrt(l2);
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / l2));
    const px = x0 + dx * t, pz = z0 + dz * t;
    const fx = dx / l, fz = dz / l;
    const d = (x - px) * (-fz) + (z - pz) * fx;
    const dist = Math.hypot(x - px, z - pz);
    if (!best || dist < best.dist) best = { dist, d, s: seg.cumul[k] + l * t, fx, fz, px, pz };
  }
  return best;
}

// Le point de l'axe à l'abscisse `s`.
export function pointA(seg, s) {
  s = Math.max(0, Math.min(seg.longueur, s));
  let k = 0;
  while (k + 2 < seg.pts.length && seg.cumul[k + 1] < s) k++;
  const [x0, z0] = seg.pts[k], [x1, z1] = seg.pts[k + 1];
  const l = seg.cumul[k + 1] - seg.cumul[k] || 1, t = (s - seg.cumul[k]) / l;
  return { x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, fx: (x1 - x0) / l, fz: (z1 - z0) / l };
}

// Le profil : une cote par bloc d'abscisse, continue, bouts épinglés au sol
// des portes. Rend aussi le terrain sous l'axe (pour les ouvrages).
export function profilDe(seg) {
  let p = PROFILS.get(seg);
  if (p) return p;
  if (!SOL) return null;
  const n = Math.max(2, Math.round(seg.longueur));
  const terr = new Float64Array(n + 1), base = new Float64Array(n + 1);
  for (let k = 0; k <= n; k++) {
    const q = pointA(seg, k * seg.longueur / n);
    const h = SOL(Math.round(q.x), Math.round(q.z));
    terr[k] = h + 1;
    base[k] = Math.max(h, NIVEAU_EAU) + 1;   // jamais sous les flots
  }
  const bas = Float64Array.from(base), haut = Float64Array.from(base);
  for (let k = 1; k <= n; k++) bas[k] = Math.min(bas[k], bas[k - 1] + PENTE);
  for (let k = n - 1; k >= 0; k--) bas[k] = Math.min(bas[k], bas[k + 1] + PENTE);
  for (let k = 1; k <= n; k++) haut[k] = Math.max(haut[k], haut[k - 1] - PENTE);
  for (let k = n - 1; k >= 0; k--) haut[k] = Math.max(haut[k], haut[k + 1] - PENTE);
  const cote = new Float64Array(n + 1);
  for (let k = 0; k <= n; k++) cote[k] = (bas[k] + haut[k]) / 2;
  const d0 = terr[0] - cote[0], d1 = terr[n] - cote[n];
  for (let k = 0; k <= n; k++) cote[k] += d0 * (1 - k / n) + d1 * (k / n);
  // LES OUVRAGES : là où le remblai dépasse `VIADUC`, ou sur l'eau, un pont.
  // Une seule colonne d'eau isolée se remblaie (une buse), pas un pont.
  const ouvrage = new Uint8Array(n + 1);
  for (let k = 0; k <= n; k++) if (cote[k] - terr[k] > VIADUC || terr[k] - 1 < NIVEAU_EAU) ouvrage[k] = 1;
  for (let k = 0; k <= n; k++) {
    if (!ouvrage[k]) continue;
    let j = k; while (j + 1 <= n && ouvrage[j + 1]) j++;
    if (j - k + 1 < 3) for (let i = k; i <= j; i++) ouvrage[i] = 0;
    k = j;
  }
  const spans = [];
  for (let k = 0; k <= n; k++) {
    if (!ouvrage[k]) continue;
    let j = k; while (j + 1 <= n && ouvrage[j + 1]) j++;
    spans.push({ s0: k * seg.longueur / n, s1: j * seg.longueur / n });
    k = j;
  }
  p = { n, cote, terr, ouvrage, spans, pas: seg.longueur / n };
  PROFILS.set(seg, p);
  return p;
}

export function coteA(seg, s) {
  const p = profilDe(seg);
  if (!p) return null;
  const q = Math.max(0, Math.min(p.n, s / p.pas));
  const k = Math.min(p.n - 1, Math.floor(q));
  return p.cote[k] + (p.cote[k + 1] - p.cote[k]) * (q - k);
}

function ouvrageA(seg, s) {
  const p = profilDe(seg);
  if (!p) return false;
  return p.ouvrage[Math.max(0, Math.min(p.n, Math.round(s / p.pas)))] === 1;
}

// La section à l'abscisse `s` : pleine en rase campagne, resserrée sur les
// raccords de ville.
export function largeurA(seg, s) {
  const bout = Math.min(s, seg.longueur - s);
  const f = bout >= RACCORD ? 1 : bout / RACCORD;
  const demiChaussee = DEMI_VILLE + (DEMI_CHAUSSEE - DEMI_VILLE) * f;
  return { demiChaussee, demiEmprise: TERRE_PLEIN / 2 + demiChaussee + ACCOTEMENT, terrePlein: TERRE_PLEIN / 2 * f };
}

// LA ROUTE SOUS CETTE COLONNE, ou null. `world.js` la pose (remblai, déblai,
// piles), `solcontinu.js` en fait la surface et le contact, la carte la
// dessine, les témoins la mesurent — une seule règle, quatre lecteurs.
//
//   piece : 'chaussee' | 'terreplein' | 'accotement' | 'talus' | 'tablier'
//   cote  : la cote CONTINUE de la surface ici (talus : raccordé au terrain)
//   ouvrage : vrai sous un pont — le sol reste le sol, le tablier est un ruban
//   pile  : vrai sur une colonne de pile
const q64 = (v) => Math.round(v * 64) / 64;

export function routeEn(x, z) {
  let best = null;
  for (const seg of pres(x, z)) {
    const pr = projeter(seg, x, z);
    if (best && pr.dist >= best.pr.dist) continue;
    best = { seg, pr };
  }
  if (!best) return null;
  const { seg, pr } = best;
  const p = profilDe(seg);
  if (!p) return null;
  const L = largeurA(seg, pr.s);
  // LA DISTANCE, PAS L'ÉCART PERPENDICULAIRE. `d` est l'écart à la DROITE
  // de l'axe, mesuré au point projeté puis borné au tronçon : au-delà d'un
  // bout, un point sur le prolongement de l'axe avait d ≈ 0 et passait pour
  // de la chaussée — le centre de Paris, à 150 blocs de la porte, rendait
  // 112 colonnes « A1 » et 62 cellules de surface dans le morceau du témoin
  // de plafond.js (« dans une ville, rien ne change »). `dist` est la
  // distance au point borné : dans le tronçon elle vaut |d|, au-delà elle
  // compte le dépassement, et un point hors du ruban est refusé.
  const ad = pr.dist;
  // UNE COTE SE RANGE EN SIMPLE PRÉCISION DANS LA GRILLE DU MAILLEUR
  // (`Float32Array`, solcontinu.js) : 34,999999 y devient 35 tout rond, le
  // générateur posait l'herbe à 33 et le mailleur cherchait une tuile à 34,
  // dans l'air — une erreur par morceau de talus, et le contact (double
  // précision) ne lisait plus la triangulation du maillage. Toute cote de
  // route est donc un soixante-quatrième de bloc, exact dans les deux.
  const cote = q64(coteA(seg, pr.s));
  const ouvrage = ouvrageA(seg, pr.s);
  if (ouvrage) {
    if (ad > L.demiEmprise) return null;
    const rang = Math.round(pr.s / PILE_PAS) * PILE_PAS;
    const pile = Math.abs(pr.s - rang) < 0.5 && Math.abs(ad - (L.demiChaussee - 1)) < 0.5;
    return { seg, s: pr.s, d: pr.d, cote, piece: 'tablier', ouvrage: true, pile };
  }
  if (ad <= L.terrePlein) return { seg, s: pr.s, d: pr.d, cote, piece: 'terreplein', ouvrage: false };
  if (ad <= L.terrePlein + L.demiChaussee) return { seg, s: pr.s, d: pr.d, cote, piece: 'chaussee', ouvrage: false };
  if (ad <= L.demiEmprise) return { seg, s: pr.s, d: pr.d, cote, piece: 'accotement', ouvrage: false };
  // LE TALUS : de la cote de la route à celle du terrain, un bloc par bloc,
  // aussi large que l'écart. C'est ce qui rend la cellule dessinable (écart
  // d'un bloc au plus par cellule) et le raccord continu.
  // La cote se raccorde au terrain de CETTE colonne : au bout du talus, la
  // surface est le sol naturel, et la couture avec la colonne voisine tient.
  const terr = SOL(x, z) + 1;
  const ecart = cote - terr;
  const w = Math.min(Math.abs(ecart), DEBLAI_MAX) / TALUS_PENTE;
  const u = ad - L.demiEmprise;
  if (u >= w) return null;
  return { seg, s: pr.s, d: pr.d, cote: q64(terr + ecart * (1 - u / w)), piece: 'talus', ouvrage: false };
}

// Pour la carte : la route sous ce pixel ?
export function surLaRoute(x, z) {
  const r = routeEn(x, z);
  return r ? r.piece : null;
}

// --- ce que les autres lisent ------------------------------------------------------

// L'ENTRÉE D'UNE VILLE : le point où le corridor s'arrête dans le disque, en
// coordonnées du MONDE, et la direction dans laquelle il en vient. La ville en
// fait une avenue jusqu'à sa première voie nommée (Paris : la Gare du Nord).
export function entreesDe(cle) {
  const out = [];
  for (const seg of segmentsDeRoute()) {
    if (seg.de === cle) out.push({ x: seg.pts[0][0], z: seg.pts[0][1], route: seg.route.nom, vers: seg.vers });
    if (seg.vers === cle) { const q = seg.pts[seg.pts.length - 1]; out.push({ x: q[0], z: q[1], route: seg.route.nom, vers: seg.de }); }
  }
  return out;
}

// LE TRACÉ ROULANT d'un segment : aller sur la chaussée de droite du sens
// A→B, retour sur l'autre — une boucle fermée, un point par `PAS` blocs, la
// cote CONTINUE du profil (jamais arrondie : c'est là que le train saute).
// `avant` et `apres` prolongent la boucle DANS les villes, par leur avenue
// d'entrée (des points du monde, du bout du corridor vers la ville) ; leur
// cote est celle de la ville, `coteDe(x, z)`, parce qu'en ville le sol est
// voxel et que c'est `coteRoulable` qui sait où l'on roule (v210).
export const PAS = 4;
export function traceRoute(seg, { avant = null, apres = null, coteDe = null } = {}) {
  const p = profilDe(seg);
  const n = Math.max(2, Math.round(seg.longueur / PAS));
  const aller = [], retour = [];
  // en ville, on roule à droite de l'axe de l'avenue, à une demi-chaussée de ville
  const jambe = (pts, sens) => {
    const out = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      const l = Math.hypot(x1 - x0, z1 - z0) || 1, fx = (x1 - x0) / l * sens, fz = (z1 - z0) / l * sens;
      const o = DEMI_VILLE / 2 + 0.3, rx = -fz, rz = fx;
      const m = Math.max(1, Math.round(l / PAS));
      for (let k = (i ? 1 : 0); k <= m; k++) {
        const x = x0 + (x1 - x0) * k / m + rx * o, z = z0 + (z1 - z0) * k / m + rz * o;
        out.push({ x, y: (coteDe ? coteDe(Math.round(x), Math.round(z)) : 0) + 0.05, z });
      }
    }
    return out;
  };
  for (let k = 0; k <= n; k++) {
    const s = k * seg.longueur / n;
    const q = pointA(seg, s), L = largeurA(seg, s);
    const o = L.terrePlein + L.demiChaussee / 2;          // le milieu de la chaussée de ce sens
    const y = (p ? coteA(seg, s) : 0) + 0.05;
    const rx = -q.fz, rz = q.fx;                             // la droite du sens A→B
    aller.push({ x: q.x + rx * o, y, z: q.z + rz * o });
    retour.push({ x: q.x - rx * o, y, z: q.z - rz * o });
  }
  retour.reverse();
  // avant : de la ville A au corridor (sens ville → route), puis l'aller,
  // puis l'entrée de B (corridor → ville), et le retour de chacun
  const entreeA = avant ? [...avant].reverse() : null;   // [bout du corridor, …, ville]  → renversé : ville → corridor
  const entreeB = apres || null;                          // [bout du corridor, …, ville]
  const pts = [];
  if (entreeA) pts.push(...jambe(entreeA, 1));
  pts.push(...aller);
  if (entreeB) { pts.push(...jambe(entreeB, 1)); pts.push(...jambe([...entreeB].reverse(), 1)); }
  pts.push(...retour);
  if (entreeA) pts.push(...jambe([...entreeA].reverse(), 1));
  // DEUX POINTS CONFONDUS FONT UN TRONÇON DE LONGUEUR NULLE, et le parcours
  // (`Parcours.a`) y divise par zéro : au raccord d'une jambe et de la
  // suivante, le dernier point de l'une est le premier de l'autre.
  const propre = [];
  for (const q of pts) { const d = propre.length ? propre[propre.length - 1] : null; if (!d || Math.hypot(q.x - d.x, q.z - d.z) > 0.05) propre.push(q); }
  if (propre.length > 2 && Math.hypot(propre[0].x - propre[propre.length - 1].x, propre[0].z - propre[propre.length - 1].z) <= 0.05) propre.pop();
  return propre;
}

// LES RUBANS d'un morceau : ce que la surface ne peut pas dire par colonne —
// les tabliers des ponts (dessus, dessous, deux parapets) et le marquage au
// sol (une ligne blanche entre les deux voies de chaque sens, une au bord de
// chaque chaussée). Une tuile n'a pas d'orientation ; un trait qui suit un axe
// oblique est de la géométrie (leçon des rails, v281). Chaque quad va de `s`
// à `s + 1` et appartient au morceau où tombe son point d'axe.
//   { x0, z0, x1, z1 : les deux points d'axe ; y0, y1 : cotes ; fx, fz ;
//     o0, o1 : les écarts latéraux ; genre : 'tablier' | 'ligne' ; dy }
export function rubansDans(x0, z0, x1, z1) {
  const out = [];
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, portee = Math.hypot(x1 - x0, z1 - z0) / 2 + DEMI_EMPRISE + 2;
  for (const seg of pres(cx, cz)) {
    const p = profilDe(seg);
    if (!p) continue;
    const pr = projeter(seg, cx, cz);
    if (pr.dist > portee + 1) continue;
    const sA = Math.max(0, Math.floor(pr.s - portee - 2)), sB = Math.min(seg.longueur - 1, Math.ceil(pr.s + portee + 2));
    for (let s = sA; s < sB; s++) {
      const a = pointA(seg, s), b = pointA(seg, s + 1);
      if (a.x < x0 || a.x >= x1 || a.z < z0 || a.z >= z1) continue;
      const L = largeurA(seg, s), ya = coteA(seg, s), yb = coteA(seg, s + 1);
      const base = { seg, s, ax: a.x, az: a.z, bx: b.x, bz: b.z, ya, yb, fx: a.fx, fz: a.fz };
      if (ouvrageA(seg, s)) {
        out.push({ ...base, genre: 'tablier', o0: -L.demiEmprise, o1: L.demiEmprise, dy: 0 });
      } else {
        // le bord de chaque chaussée, continu ; entre les deux voies d'un sens, pointillé (3 sur 6)
        for (const o of [-(L.terrePlein + L.demiChaussee), L.terrePlein + L.demiChaussee]) {
          out.push({ ...base, genre: 'ligne', o0: o - 0.08, o1: o + 0.08, dy: 0.02 });
        }
        if ((s % 6) < 3 && L.demiChaussee > DEMI_VILLE + 0.5) {
          for (const o of [-(L.terrePlein + L.demiChaussee / 2), L.terrePlein + L.demiChaussee / 2]) {
            out.push({ ...base, genre: 'ligne', o0: o - 0.08, o1: o + 0.08, dy: 0.02 });
          }
        }
      }
    }
  }
  return out;
}
