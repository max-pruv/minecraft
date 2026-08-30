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
// 3. **Le modèle voyage avec la voiture.** La flotte compte cinquante-et-un
//    modèles tirés au sort à la fabrication. Ranger seulement « une voiture »
//    rendrait à l'enfant une Twingo à la place de sa Bugatti : on retient donc
//    le fichier du modèle, et on le réclame au moment de la refabriquer.

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
