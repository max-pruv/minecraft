// LA SECONDE VOIE (v423) — où une rue a deux voies dans chaque sens, et de
// combien la seconde est décalée de celle où roulent déjà les voitures.
//
// Max, une capture de GTA VI à côté d'une de GTA V : « Good inspiration ».
// Les voies y sont serrées et TOUTES occupées. Chez nous, mesuré : une seule
// file par sens partout, même sur les boulevards de quatre voies du kit
// (`voirie.js`, `boulevard` : deux voies par sens) et sur l'autoroute (deux
// fois deux voies, `routes.js`) — la seconde voie de chaque sens restait vide,
// et sur l'autoroute la file roulait À CHEVAL sur la ligne entre les deux.
//
// Ce module ne fait que LIRE la section : il ne pose aucun bloc et ne trace
// aucun circuit. Il répond, pour un point d'un tracé de voitures, « y a-t-il
// ici une seconde voie dans ce sens, et à combien de blocs à droite de la
// file existante ? ». `vehicules.js` en fait un convoi JUMEAU — la même
// grille horaire, décalée d'une demi-voiture, posée dans l'autre voie — et ne
// connaît ni Paris, ni les villes engendrées, ni les routes.
//
// Trois lecteurs de la section, une seule règle par famille, chacun relu là
// où il se calcule (une dimension de ville se demande, elle ne se recopie pas,
// v203, v271) :
//   · Paris : les percées de premier rang (`sectionDeVoie`, `VOIES_PARIS`) ;
//     la file y roule à `DECALAGE_AVENUE` de l'axe (main.js, v372) ;
//   · les villes engendrées : la croix centrale quand elle est un boulevard
//     (`t.axe`, v307) ; l'anneau y roule à une demi-chaussée de rue (v271) ;
//   · l'autoroute : la pleine section (deux voies de 3,5) hors des raccords
//     de ville, où la chaussée se resserre (`largeurA`).
//
// Ce module est PUR (pas de three) : un témoin le lit sous node.
import { VOIES_PARIS, PARIS } from './paris.js';
import { villeMondeEn } from './villesmonde.js';
import { routeEn, largeurA } from './routes.js';
import { sectionDeRue, LARGEUR_VOITURE } from './voirie.js';

const BOULEVARD = sectionDeRue('boulevard');
// le centre de la voie EXTÉRIEURE d'un sens, depuis l'axe de la rue
const VOIE_EXTERIEURE = 1.5 * BOULEVARD.voie;
// deux voitures côte à côte, avec la marge du kit (0,4 m de chaque côté) :
// en dessous, une demi-chaussée d'autoroute n'a qu'une voie
const DEUX_VOIES = 2 * (LARGEUR_VOITURE + 0.8);

function distanceSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

// Les percées de premier rang de Paris, en coordonnées du monde, une fois.
let boulevardsParis = null;
function boulevardsDeParis() {
  if (!boulevardsParis) {
    boulevardsParis = VOIES_PARIS.filter((v) => v.type === 'boulevard')
      .map((v) => ({ l: v.l, pts: v.pts.map(([u, w]) => [PARIS.x + u, PARIS.z + w]) }));
  }
  return boulevardsParis;
}

// PARIS : un point d'une file qui roule à `decalage` à droite de l'axe d'une
// avenue. Sur un boulevard (à un bloc du bord de sa chaussée au moins), la
// seconde voie est l'extérieure : à `1,5 voie − decalage` plus à droite.
export function secondeVoieParis(x, z, decalage) {
  for (const v of boulevardsDeParis()) {
    for (let i = 0; i + 1 < v.pts.length; i++) {
      const [ax, az] = v.pts[i], [bx, bz] = v.pts[i + 1];
      if (distanceSegment(x, z, ax, az, bx, bz) < v.l - 1) return VOIE_EXTERIEURE - decalage;
    }
  }
  return 0;
}

// UNE VILLE ENGENDRÉE : la croix centrale, quand c'est un boulevard. La file
// d'un anneau y roule à une demi-chaussée de RUE de l'axe (`t.w / 2`, v271).
// Le repère de la trame est celui de `solVillesMonde` (lu, pas modifié).
export function secondeVoieVilleMonde(x, z) {
  const f = villeMondeEn(x, z);
  if (!f || !f.trame) return 0;
  const t = f.trame;
  if (t.ruelles || !t.axe) return 0;
  const u = x - f.ancre.x, v = z - f.ancre.z;
  const co = Math.cos(t.ang), si = Math.sin(t.ang);
  const a = u * co - v * si, b = u * si + v * co;
  if (Math.min(Math.abs(a), Math.abs(b)) >= t.axe.w - 1) return 0;
  return VOIE_EXTERIEURE - t.w / 2;
}

// L'AUTOROUTE : la file roulait au MILIEU de la demi-chaussée de son sens,
// sur la ligne qui sépare ses deux voies. Là où la pleine section a deux
// voies, la file d'origine passe dans la voie de DROITE (+ dc/4) et sa jumelle
// dans celle de GAUCHE (− dc/4) ; dans le raccord, où la chaussée se resserre
// vers la ville, les deux se rejoignent au milieu. Rend [file, jumelle].
// `pt` est le point du tracé (`traceRoute`) qui porte la demi-chaussée sous
// lui (`dc`) : la lire là coûte dix fois moins que de reprojeter le point sur
// la route, et l'autoroute se calcule au démarrage du jeu (v258).
export function voiesAutoroute(x, z, pt) {
  let dc;
  if (pt && pt.dc !== undefined) dc = pt.dc;
  else {
    const r = routeEn(x, z);
    if (!r || (r.piece !== 'chaussee' && r.piece !== 'tablier')) return null;
    dc = largeurA(r.seg, r.s).demiChaussee;
  }
  if (!(dc >= DEUX_VOIES)) return null;
  return [dc / 4, -dc / 4];
}

export const VOIES_DOUBLES = Object.freeze({ VOIE_EXTERIEURE, DEUX_VOIES });

// LE TYPE DE VOIE PAR TRONÇON (v438). La limitation suivait le CIRCUIT (rue
// engendrée, avenue nommée, autoroute) : sur un même anneau, un boulevard et
// une rue de quartier roulaient à la même allure. La section se demande à la
// ville, au point du tracé — la même règle du kit (`voirie.js`) que le sol :
//   · boulevard (deux voies par sens) → cinquante, `avenue` ;
//   · collectrice (une voie par sens) → quarante, `rue` ;
//   · locale (une seule voie) → trente, `ruelle`.
// Hors de toute voie nommée (le tour d'une place, un raccord), la rue. Les
// avenues de Washington ne portent pas de type (le plan de L'Enfant, larges
// partout) : cinquante. Rend le NOM de l'allure ; `circulation.js` la chiffre.
import { VOIES_LONDRES, LONDRES } from './londres.js';
import { VOIES_NICE, NICE } from './nice.js';
import { VOIES_LILLE, LILLE } from './lille.js';
import { VOIES_SF, SF } from './sanfrancisco.js';
import { VOIES_CIRCUITS_DC, WASHINGTON } from './washington.js';

const ALLURE_DU_TYPE = { boulevard: 'avenue', collecteur: 'rue', locale: 'ruelle' };
const RANG_ALLURE = { ruelle: 0, rue: 1, avenue: 2 };
const SOURCES = {
  paris: () => [VOIES_PARIS, PARIS], londres: () => [VOIES_LONDRES, LONDRES], nice: () => [VOIES_NICE, NICE],
  lille: () => [VOIES_LILLE, LILLE], sf: () => [VOIES_SF, SF], dc: () => [VOIES_CIRCUITS_DC, WASHINGTON],
};
const voiesTypees = new Map();
function voiesDe(cle) {
  if (voiesTypees.has(cle)) return voiesTypees.get(cle);
  const s = SOURCES[cle];
  let out = null;
  if (s) {
    const [liste, o] = s();
    out = liste.map((v) => {
      const pts = v.pts.map(([u, w]) => [o.x + u, o.z + w]);
      const l = (v.l || 3.2) + 1.5;
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      return { pts, l, allure: ALLURE_DU_TYPE[v.type] || 'avenue', x0: x0 - l, z0: z0 - l, x1: x1 + l, z1: z1 + l };
    });
  }
  voiesTypees.set(cle, out);
  return out;
}
// L'allure d'un point d'un circuit de la ville bâtie à la main `cle`, ou null
// si la ville n'est pas connue (Manhattan garde son avenue).
export function allureDuTroncon(cle, x, z) {
  const voies = voiesDe(cle);
  if (!voies) return null;
  let best = null;
  for (const v of voies) {
    if (x < v.x0 || x > v.x1 || z < v.z0 || z > v.z1) continue;
    if (best && RANG_ALLURE[v.allure] <= RANG_ALLURE[best]) continue;
    for (let i = 0; i + 1 < v.pts.length; i++) {
      const [ax, az] = v.pts[i], [bx, bz] = v.pts[i + 1];
      if (distanceSegment(x, z, ax, az, bx, bz) < v.l) { best = v.allure; break; }
    }
  }
  return best || 'rue';
}
// UNE VILLE ENGENDRÉE : le boulevard de la croix centrale (`t.axe`, la même
// lecture que sa seconde voie) roule à cinquante, la trame à quarante.
export function allureVilleMonde(x, z) {
  return secondeVoieVilleMonde(x, z) ? 'avenue' : 'rue';
}
