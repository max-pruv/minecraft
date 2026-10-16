// Les garages — et la promesse qu'ils portent.
//
// Demande de Max : « je voudrais que dans les monuments que tu as, tu puisses
// avoir des garages, et que quand un véhicule est déposé dans un garage, il
// reste tout le temps, un peu comme dans le jeu GTA. »
//
// C'est une promesse forte, et c'est elle qui décide de tout le fichier : un
// enfant qui gare sa voiture dans SON garage doit la retrouver là, le
// lendemain, sur l'autre tablette, après une mise à jour. Pas une voiture qui
// lui ressemble — la SIENNE, le même modèle, à la même place, dans le même
// sens.
//
// D'où trois choix qu'il faut connaître avant d'y toucher :
//
// 1. **Une voiture garée n'est pas une créature qui dort, c'est une ligne de
//    sauvegarde.** Le bestiaire ne survit pas au rechargement de la page —
//    aucune bête n'a jamais été enregistrée, elles repeuplent le monde à
//    chaque lancement. Une voiture garée, elle, est écrite dans le profil de
//    l'enfant, à côté de ses blocs, et c'est ce qui la fait durer.
//
// 2. **Le garage est repéré par sa POSE, pas par ses blocs.** On pourrait
//    chercher dans le monde ce qui ressemble à un garage ; ce serait fragile
//    et lent. Quand la bibliothèque pose un bâtiment marqué `garage`, on note
//    son emprise une fois pour toutes. Un enfant qui démolit son garage garde
//    donc une place de parking invisible — c'est le prix, et il est bien plus
//    petit que celui d'une voiture qu'on ne retrouve pas.
//
// 3. **Le modèle voyage avec la voiture.** La flotte compte cinquante-trois
//    modèles tirés au sort à la fabrication. Ranger seulement « une voiture »
//    rendrait à l'enfant une Twingo à la place de sa Bugatti : on retient donc
//    le fichier du modèle, et on le réclame au moment de la refabriquer.

import { BLOCK } from './blocks.js';

export const CLE_GARAGES = 'web-minecraft-garages-v1';

// Le document, monde par monde — la même découpe que les blocs :
//   { [ctx]: { [idGarage]: { x, y, z, l, p, places, voiture, t } } }
// `voiture` vaut null quand le garage est vide.

const lire = () => {
  try { return JSON.parse(localStorage.getItem(CLE_GARAGES) || '{}') || {}; }
  catch { return {}; }
};

const ecrire = (tout) => {
  try { localStorage.setItem(CLE_GARAGES, JSON.stringify(tout)); }
  catch { /* espace plein : on ne casse pas la partie pour ça */ }
};

// L'identité d'un garage est sa position au bloc près. Deux tablettes qui
// posent le même garage au même endroit décrivent le même garage — c'est ce
// qui permet de fusionner deux documents sans se demander lequel a raison.
export const idGarage = (x, y, z) => `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;

export function garagesDe(ctx) {
  return lire()[ctx] || {};
}

// Poser un garage. Idempotent : reposer le même au même endroit ne vide pas
// celui qui s'y trouvait déjà — un enfant qui appuie deux fois ne perd rien.
export function inscrireGarage(ctx, g) {
  const tout = lire();
  const monde = tout[ctx] || (tout[ctx] = {});
  const id = idGarage(g.x, g.y, g.z);
  const avant = monde[id];
  monde[id] = {
    x: Math.round(g.x), y: Math.round(g.y), z: Math.round(g.z),
    l: g.l, p: g.p, places: g.places,
    voiture: avant ? avant.voiture : null,
    t: avant ? avant.t : 0,
  };
  ecrire(tout);
  return id;
}

// Dans quel garage se trouve ce point ? On compare à l'emprise au sol, avec
// une tolérance d'un bloc : l'enfant s'arrête rarement au centimètre, et un
// garage qui refuse la voiture pour un demi-bloc ne tient pas sa promesse.
export function garageAutour(ctx, x, y, z) {
  for (const [id, g] of Object.entries(garagesDe(ctx))) {
    if (Math.abs(y - g.y) > 6) continue;
    if (Math.abs(x - g.x) > g.l / 2 + 1) continue;
    if (Math.abs(z - g.z) > g.p / 2 + 1) continue;
    return { id, ...g };
  }
  return null;
}

// Ranger une voiture. `voiture` : { flotte, nom, x, y, z, yaw }.
export function garer(ctx, id, voiture) {
  const tout = lire();
  const monde = tout[ctx];
  if (!monde || !monde[id]) return false;
  monde[id].voiture = voiture;
  monde[id].t = Date.now();
  ecrire(tout);
  return true;
}

// La sortir. Sert quand l'enfant repart avec, et quand il l'abandonne dehors.
export function sortir(ctx, id) {
  const tout = lire();
  const monde = tout[ctx];
  if (!monde || !monde[id] || !monde[id].voiture) return false;
  monde[id].voiture = null;
  monde[id].t = Date.now();
  ecrire(tout);
  return true;
}

// LA FUSION DE DEUX TABLETTES.
//
// Deux appareils peuvent poser des garages chacun de leur côté : l'union les
// garde tous les deux. Pour un MÊME garage, c'est la dernière manœuvre qui
// fait foi — d'où l'horodatage : sans lui, l'iPad resté allumé toute la nuit
// aurait ressorti du garage la voiture que l'autre venait d'y ranger.
export function fusionnerGarages(a, b) {
  const out = {};
  for (const ctx of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const ga = (a && a[ctx]) || {}, gb = (b && b[ctx]) || {};
    const monde = {};
    for (const id of new Set([...Object.keys(ga), ...Object.keys(gb)])) {
      const x = ga[id], y = gb[id];
      if (!x) { monde[id] = y; continue; }
      if (!y) { monde[id] = x; continue; }
      monde[id] = (Number(y.t) || 0) > (Number(x.t) || 0) ? y : x;
    }
    out[ctx] = monde;
  }
  return out;
}

// ---- la pose d'un bâtiment de la bibliothèque (v455) ---------------------
//
// UN BÂTIMENT DE PLAIN-PIED SE POSE AU NIVEAU DE SON SEUIL. La bibliothèque
// posait tout sur le point le plus bas de l'emprise : juste pour un monument
// (rien ne s'enterre à moitié), fatal pour un garage sur une pente — le fond
// disparaissait dans la colline, l'intérieur restait plein de terre, et l'on
// n'entrait plus. Un bâtiment qui déclare `plainPied` (tout garage le fait)
// prend la cote de la colonne DEVANT SA PORTE : son plancher se pose sur le
// sol à cet endroit, une marche comme toute maison — on y entre à pied d'un
// saut, en voiture sans rien faire. Sous le plancher on comble jusqu'au terrain (des fondations de
// pierre), au-dessus on dégage la terre jusqu'au toit.
//
// ET RIEN DE CE QU'UN ENFANT A POSÉ NE BOUGE (invariant 1). On ne remplace
// que de l'air ou du terrain naturel : une case que le journal porte avec un
// bloc posé reste telle quelle — le garage a un trou, la maison d'à côté est
// intacte. Une case que l'enfant a creusée (journal à l'air) se remplit,
// comme de l'air.
//
// Pure (le monde est passé), pour qu'un témoin la rejoue sous node.
// Rend { sol, y0, ecritures: [[x, y, z, id]], tourner, ox, oz }.
const FONDATION_MAX = 24;

export function planDePose(m, monde, cx, cz, quart = 0) {
  const cosT = [1, 0, -1, 0][quart], sinT = [0, 1, 0, -1][quart];
  const ox = Math.round((m.emprise.minX + m.emprise.maxX) / 2);
  const oz = Math.round((m.emprise.minZ + m.emprise.maxZ) / 2);
  const tourner = (bx, bz) => [bx * cosT + bz * sinT, bz * cosT - bx * sinT];
  const plainPied = !!(m.plainPied || m.garage);
  const ecritures = [];

  if (!plainPied) {
    // Le sol de référence d'un monument : le point le plus bas sous
    // l'emprise. Poser sur le plus haut enterrerait la moitié du monument.
    let sol = Infinity;
    for (let dx = -m.emprise.l / 2; dx <= m.emprise.l / 2; dx += 4) {
      for (let dz = -m.emprise.p / 2; dz <= m.emprise.p / 2; dz += 4) {
        const s = monde.sommetColonne(cx + dx, cz + dz);
        if (s < sol) sol = s;
      }
    }
    if (!isFinite(sol)) sol = monde.terrainHeight(cx, cz);
    const y0 = sol + 1;
    for (const [bx, by, bz, bid] of m.blocs) {
      const [rx, rz] = tourner(bx - ox, bz - oz);
      ecritures.push([cx + rx, y0 + (by - m.emprise.minY), cz + rz, bid]);
    }
    return { sol, y0, ecritures, tourner, ox, oz };
  }

  // Le seuil : la colonne au milieu de la façade, sur le bord avant (+z en
  // coordonnées d'auteur — c'est là que s'ouvre la porte d'un garage).
  const [sx, sz] = tourner(ox - ox, m.emprise.maxZ - oz);
  const sol = monde.sommetColonne(cx + sx, cz + sz);
  // Le plancher POSÉ SUR le sol du seuil, pas à sa place : une dalle ou un
  // bitume qui remplace le dessus du terrain est un « sol de ville » que le
  // sol continu (v308) raccorde au relief — sur une pente, il en lissait les
  // premiers rangs et laissait au bord du reste une lèvre de deux dixièmes de
  // bloc où l'enfant à pied butait (sonde, v455). Posé dessus, tout le
  // plancher reste en cubes : une marche d'un bloc au seuil, que l'enfant
  // saute et que la voiture franchit.
  const y0 = sol + 1;
  const pose = (k) => {
    const e = monde.edits && monde.edits.get(k);
    return e === undefined || e === BLOCK.AIR;
  };
  const occupe = new Map();     // colonne → { bas: le plancher y est-il ? }
  const pleines = new Set();
  for (const [bx, by, bz, bid] of m.blocs) {
    const [rx, rz] = tourner(bx - ox, bz - oz);
    const x = cx + rx, z = cz + rz, y = y0 + (by - m.emprise.minY);
    const k = `${x},${y},${z}`;
    pleines.add(k);
    const c = `${x},${z}`;
    if (!occupe.has(c)) occupe.set(c, { x, z, bas: false });
    if (by === m.emprise.minY) occupe.get(c).bas = true;
    if (pose(k)) ecritures.push([x, y, z, bid]);
  }
  const haut = y0 + (m.emprise.maxY - m.emprise.minY);
  for (const { x, z, bas } of occupe.values()) {
    // L'air dégagé, du plancher jusqu'au-dessus du toit.
    for (let y = y0 + 1; y <= haut + 1; y++) {
      const k = `${x},${y},${z}`;
      if (pleines.has(k) || !pose(k)) continue;
      if (monde.getBlock(x, y, z) !== BLOCK.AIR) ecritures.push([x, y, z, BLOCK.AIR]);
    }
    // Les fondations, sous ce qui touche le sol, jusqu'au terrain.
    if (!bas) continue;
    for (let y = y0 - 1, n = 0; y >= 0 && n < FONDATION_MAX; y--, n++) {
      const k = `${x},${y},${z}`;
      if (!pose(k)) break;
      const b = monde.getBlock(x, y, z);
      if (b !== BLOCK.AIR && b !== BLOCK.WATER) break;
      ecritures.push([x, y, z, BLOCK.STONE]);
    }
  }
  return { sol, y0, ecritures, tourner, ox, oz };
}
