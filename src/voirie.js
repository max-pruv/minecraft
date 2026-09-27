// LA SECTION D'UNE RUE — la règle du kit de Max, appliquée (v303).
//
// Max : « Les rues de Paris sont encore beaucoup trop étroites. Je comprends
// pas. T'as pas appliqué le code à la règle. » Il avait raison : le kit
// `world-fidelity-kit` livre `road-section.mjs`, qui CALCULE la section d'une
// rue à partir de son type et du véhicule qui y roule, et la v294 avait choisi
// ses largeurs à la main — 3,6 blocs de chaussée, « la voiture au milieu avec
// 0,67 de chaque côté ». Juste pour une voiture ; faux pour une ville, et
// devenu criant quand la v301 a donné trois blocs à un étage : des immeubles
// de vingt-quatre blocs sur des rues de sept, des canyons.
//
// Ce module est `roadSection` du kit, recopié et traduit, sans une valeur
// changée. Il est PUR et sans import : `paris.js` le lit, et `paris.js` est lu
// par le mailleur du worker (qui meurt au premier `import 'three'`, v251).
//
// L'ÉCHELLE : UN BLOC POUR UN MÈTRE. Le kit l'exige (« unitsPerMeter calibrée
// sur le joueur et les véhicules », jamais sur la projection des continents),
// et c'est ce que le dépôt mesure : l'enfant 1,8 bloc, une voiture 4,4 × 2,26,
// un étage de Paris trois blocs pour 3,2 m (v301). Les HAUTEURS de Paris sont
// à cette échelle depuis la v301 ; ses RUES le sont depuis celle-ci. Les ÎLOTS,
// eux, ne le sont pas — c'est l'entorse déclarée de `paris.js`, et elle ne
// change pas.

export const UNITES_PAR_METRE = 1;
// La largeur d'une voiture de la flotte — `DEMI_LARG_VOITURE` × 2 dans
// `vehicules.js`, recopiée ici parce que ce module ne peut pas l'importer
// (le worker). Un témoin exige que les deux disent la même chose.
export const LARGEUR_VOITURE = 2.26;

// Les types du kit (`standards.mjs`, `ROAD_TYPES`), tels quels : « valeurs de
// départ de conception pour le JEU, pas normes de voirie réelles ».
export const TYPES_DE_RUE = Object.freeze({
  ruelle:    { voies: 0, voieM: 0,    trottoirM: 0,   pietonM: 3, stationnement: 0, penteMax: 0.15 },
  locale:    { voies: 1, voieM: 3.1,  trottoirM: 2,   stationnement: 0, penteMax: 0.10 },
  collecteur:{ voies: 2, voieM: 3.2,  trottoirM: 2.5, stationnement: 0, penteMax: 0.08 },
  boulevard: { voies: 4, voieM: 3.25, trottoirM: 4,   stationnement: 0, penteMax: 0.06 },
  autoroute: { voies: 4, voieM: 3.5,  trottoirM: 0,   stationnement: 0, penteMax: 0.05 },
});

// `roadSection` : une voie vaut au moins la largeur du véhicule plus
// quarante centimètres de chaque côté ; la chaussée, les voies plus le
// terre-plein, les accotements et le stationnement (2,2 m par côté) ; les
// trottoirs, ceux du type. Tout en blocs.
export function sectionDeRue(type, { u = UNITES_PAR_METRE, vehicule = LARGEUR_VOITURE, degagementM = 0.4,
  stationnement, terrePleinM = 0 } = {}) {
  const p = TYPES_DE_RUE[type];
  if (!p) throw new TypeError(`type de rue inconnu : ${type}`);
  const garer = stationnement ?? p.stationnement;
  const voie = p.voies ? Math.max(p.voieM * u, vehicule + 2 * degagementM * u) : 0;
  const roulant = p.voies ? voie * p.voies + terrePleinM * u : p.pietonM * u;
  const chaussee = roulant + garer * 2.2 * u;
  const trottoir = p.trottoirM * u;
  return { type, voies: p.voies, voie, chaussee, trottoir, emprise: chaussee + 2 * trottoir };
}
