// LES PIÉTONS ET LA ROUTE — la règle pure, sans import (lue par main.js, par
// marlon.js et, sous node, par les témoins).
//
// POURQUOI CE FICHIER (v351). Le chantier « conduite » fait rouler les voitures
// trois fois plus vite (40 à 70 blocs par seconde, 1 bloc ≈ 1 m pour un
// véhicule). L'écart de la v259 avait été réglé pour 4 à 25 b/s : un couloir
// de `min(30, 2 v + 4)` blocs devant la voiture, et un piéton qui s'en écarte
// à 1,6 fois son pas. MESURÉ sous node (sonde `sim-ancien.mjs`, la voiture en
// temps réel, le piéton en temps de jeu, trois décalages latéraux) :
//
//   cadence   premier choc
//   60 im/s     50 b/s
//   30 im/s     47 b/s
//   15 im/s     36 b/s
//    8 im/s     20 b/s
//    5 im/s      7 b/s
//
// DEUX CAUSES, ET LA SECONDE EST LA PLUS GRAVE.
//
// 1. UN COULOIR EN BLOCS EST UN TEMPS QUI RÉTRÉCIT. Trente blocs à 60 b/s, c'est
//    une demi-seconde d'avance ; il en faut 0,56 pour sortir d'une carrosserie
//    au pas pressé. Le regard porte désormais en SECONDES (`HORIZON_S`) : la
//    voiture est vue tant qu'elle arrive dans moins de 1,6 s, à toute vitesse.
// 2. LA VOITURE ROULE EN TEMPS RÉEL, LE PIÉTON EN TEMPS DE JEU. La position
//    d'un convoi est une fonction de l'horloge de la rue (v305), en secondes
//    réelles ; `main.js` borne `dt` à un vingtième. À cinq images par seconde
//    le piéton marche donc quatre fois moins vite QUE LA VOITURE qui arrive :
//    il n'a plus le temps de rien, à n'importe quelle vitesse. C'est le piège
//    de `dt` (v226), dans le sens où il blesse. L'écart se fait donc en temps
//    RÉEL (`marlon.js`), comme ce qu'il fuit : une animation suit le jeu, mais
//    ce qui doit tenir face à une horloge réelle se compte sur elle.
//
// Avec les deux remèdes, la même sonde (`sim-neuf.mjs`) : aucun choc jusqu'à
// 120 b/s, de 60 à 3 images par seconde, mise à jour à chaque image ou tous
// les dixièmes de seconde (les passants lointains, main.js). Un horizon d'une
// seconde tient encore ; 0,8 s touche à 3 images par seconde : 1,6 en est le
// double, la règle des bornes de garde (v237).

// Combien de secondes de route on regarde devant une voiture.
export const HORIZON_S = 1.6;
// Sous cette échéance, la marge de côté est large (on s'écarte franchement) ;
// au-delà, seul ce qui est DANS la trajectoire réagit — sinon tout passant du
// bord du trottoir sur cent blocs de rue ferait un pas de côté.
export const PROCHE_S = 0.8;
export const MARGE_LOIN = 0.45;
// L'allure de l'écart, en multiple du pas : on presse le pas, on ne court pas.
export const ALLURE_ECART = 2.0;
// Une mise à jour ne fait jamais plus de 0,9 bloc d'écart : la boîte d'un
// piéton glisse alors bloc à bloc et ne traverse pas un mur (`sweep`).
export const PAS_ECART_MAX = 0.9;
// Le temps réel qu'une mise à jour peut compter (un onglet endormi n'est pas
// une seconde d'écart).
export const DT_REEL_MAX = 0.25;

// Une voiture `r` = { x, y, z, ux, uz, v, demiLarg } arrive-t-elle sur le point
// (x, z) ? Rend { ux, uz, cote, lat, t } — `cote` le côté où s'écarter (celui
// où l'on est déjà), `lat` l'écart latéral signé, `t` l'échéance en secondes —
// ou null. `marge` est la marge de côté à courte échéance.
export function couloirVoiture(r, x, z, y, marge = 1.0) {
  if (!(r.v > 0.5) || Math.abs(r.y - y) > 2.5) return null;
  const portee = r.v * HORIZON_S + 4;
  const dx = x - r.x, dz = z - r.z;
  const pf = portee + 4;
  if (dx * dx + dz * dz > pf * pf) return null;
  const devant = dx * r.ux + dz * r.uz, cote = dx * r.uz - dz * r.ux;
  if (devant < -2.2 || devant > portee) return null;
  const t = Math.max(0, devant) / r.v;
  if (Math.abs(cote) > r.demiLarg + (t < PROCHE_S ? marge : MARGE_LOIN)) return null;
  return { ux: r.ux, uz: r.uz, cote: cote >= 0 ? 1 : -1, lat: cote, t };
}
