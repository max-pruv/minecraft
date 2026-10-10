// LES PIÉTONS ET LA ROUTE — la règle pure (lue par main.js, par marlon.js, par
// vie.js et, sous node, par les témoins). Un seul import : `feux.js`, pur lui
// aussi, parce que le piéton lit le MÊME feu que la voiture (v371).
import { etatFeu, axeDuCap, VERT, ORANGE, CYCLE } from './feux.js';
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
// `horizon` (v371) : le passant qui va TRAVERSER regarde aussi loin que dure
// sa traversée, pas seulement les 1,6 s de l'écart.
export function couloirVoiture(r, x, z, y, marge = 1.0, horizon = HORIZON_S) {
  if (!(r.v > 0.5) || Math.abs(r.y - y) > 2.5) return null;
  const portee = r.v * horizon + 4;
  const dx = x - r.x, dz = z - r.z;
  const pf = portee + 4;
  if (dx * dx + dz * dz > pf * pf) return null;
  const devant = dx * r.ux + dz * r.uz, cote = dx * r.uz - dz * r.ux;
  if (devant < -2.2 || devant > portee) return null;
  const t = Math.max(0, devant) / r.v;
  if (Math.abs(cote) > r.demiLarg + (t < PROCHE_S ? marge : MARGE_LOIN)) return null;
  return { ux: r.ux, uz: r.uz, cote: cote >= 0 ? 1 : -1, lat: cote, t, demi: r.demiLarg, rx: r.x, rz: r.z };
}

// UN ÉCART NE TRAVERSE PAS LA RUE (v411). Le pas de côté de la v259 part du
// côté où l'on est DÉJÀ par rapport à l'axe de la voiture. Une voiture qui
// TOURNE au carrefour a un axe en biais : pour un passant au coin du trottoir,
// ce côté-là mène à la rue PERPENDICULAIRE, et l'écart de deux secondes (6,4
// blocs à 3,2 b/s) le portait jusqu'au trottoir d'EN FACE, au vert — le témoin
// du feu de la v402 l'a publié, deux fois sur quatre des deux côtés.
//
// LA RÈGLE, ET CE QUI LA REND SÛRE. Une voiture qui roule sur la chaussée n'est
// sur la route d'un passant du trottoir que par la projection DROITE de son
// couloir (elle tourne) ou parce qu'elle frôle la bordure ; une voiture sur le
// trottoir (l'enfant au volant) l'est vraiment. Donc : un passant SUR le
// trottoir, devant une voiture SUR la chaussée, ne descend pas sur la
// chaussée. Il prend le côté naturel s'il reste en haut, sinon ce côté tourné
// de 45° d'un bord ou de l'autre (on s'éloigne encore de l'axe), sinon l'autre
// côté s'il a le temps d'y sortir du couloir avant la voiture, sinon il RESTE
// sur le trottoir — et la voiture, qui freine devant un piéton (v395), passe.
// Dans tout autre cas (sur la chaussée, voiture sur le trottoir, pas de sol),
// rien ne change. `sol(x, z)` rend 't', 'c' ou 'x' (celui de
// `cheminDeTraversee`). Rend { ex, ez, garde } : la direction du pas (nulle si
// l'on reste), et `garde` vrai quand on a choisi CONTRE la chaussée.
export const SORTIE_ECART = 1.8;     // la marge à laquelle l'écart se termine (marlon.js)
export const MARGE_CHOIX_S = 0.25;   // le temps de rab pour passer devant la voiture
export function descendSurLaChaussee(sol, x, z, ux, uz, d) {
  for (let s = 0.5; s <= d + 0.5; s += 0.5) {
    const c = sol(x + ux * s, z + uz * s);
    if (c === 'c') return true;
    if (c === 'x') return false;
  }
  return false;
}
export function coteDEcart(v, sol, x, z, vEcart) {
  const dir = (c) => ({ ex: v.uz * c, ez: -v.ux * c });
  if (!v) return { ex: 0, ez: 0, garde: false };
  const naturel = { ...dir(v.cote), garde: false };
  if (!sol || sol(x, z) !== 't' || v.rx === undefined || sol(v.rx, v.rz) !== 'c') return naturel;
  const demi = v.demi ?? 1.13;
  const reste = (c) => Math.max(0, demi + SORTIE_ECART - c * v.lat);
  const loin = Math.min(reste(v.cote), vEcart * 2);
  if (!descendSurLaChaussee(sol, x, z, naturel.ex, naturel.ez, loin)) return naturel;
  // tourné de 45° : on s'éloigne encore de l'axe, d'un bord ou de l'autre
  const k = Math.SQRT1_2;
  for (const s of [1, -1]) {
    const ex = (naturel.ex - s * naturel.ez) * k, ez = (naturel.ez + s * naturel.ex) * k;
    if (!descendSurLaChaussee(sol, x, z, ex, ez, loin / k)) return { ex, ez, garde: true };
  }
  const autre = -v.cote, d = dir(autre);
  if (reste(autre) / vEcart <= v.t - MARGE_CHOIX_S && !descendSurLaChaussee(sol, x, z, d.ex, d.ez, Math.min(reste(autre), vEcart * 2))) return { ...d, garde: true };
  return { ex: 0, ez: 0, garde: true };
}

// ET LE PAS LUI-MÊME NE DESCEND PAS (v411). La voiture tourne, son couloir
// suit le passant, et l'écart dure jusqu'à deux secondes : un côté qui restait
// sur le trottoir sur la distance prévue peut y mener plus loin. Chaque pas se
// juge donc aussi : depuis le trottoir, devant une voiture sur la chaussée, on
// ne pose pas le pied sur la chaussée — on s'arrête au bord.
export function pasDEcartPermis(sol, x, z, nx, nz, v) {
  if (!sol || !v || v.rx === undefined) return true;
  return !(sol(x, z) === 't' && sol(nx, nz) === 'c' && sol(v.rx, v.rz) === 'c');
}

// ET L'ÉCART NE SE RETOURNE PAS VERS LA CHAUSSÉE (v411). Contre un mur, la
// v259 essayait l'autre côté une fois : depuis le trottoir, c'était la rue —
// la sonde l'a montré, c'est par là que passaient la plupart des traversées.
// Un passant collé au mur, SUR le trottoir, n'est pas sur la route de la
// voiture ; un passant qui repart à travers la chaussée l'est. `lat` est
// l'écart latéral lu à cet instant, `demi` la demi-largeur de la voiture.
export function retournementPermis(sol, x, z, e, lat, demi, vEcart) {
  if (!sol || sol(x, z) !== 't') return true;
  if (e.garde) return false;
  const c = -e.cote;
  const d = Math.min(Math.max(0, (demi ?? 1.13) + SORTIE_ECART - c * lat), vEcart * 2);
  return !descendSurLaChaussee(sol, x, z, e.uz * c, -e.ux * c, d);
}

// TRAVERSER AU FEU (v371). MESURÉ AVANT D'ÉCRIRE (`tests/sonde-traversees.cjs`,
// soixante secondes, l'enfant immobile au centre) : les passants ne changeaient
// pour ainsi dire JAMAIS de trottoir — Rome une traversée sur vingt et un
// passants, et elle n'était pas à un feu ; Paris zéro sur dix-huit ; Londres
// zéro sur vingt-quatre. Au coin, le trottoir s'arrête et `tourner()` fait le
// tour de l'îlot : une ville où chacun reste sur son pâté de maisons.
//
// LE PIÉTON LIT LE MÊME FEU QUE LA VOITURE. `etatFeu` et `axeDuCap` sont ceux
// de `feux.js`, que la circulation lit pour s'arrêter : deux lectures du même
// feu, jamais deux règles. Traverser dans la direction (ux, uz), c'est couper
// la rue PERPENDICULAIRE, donc les voitures de l'autre axe : on part quand
// elles sont au rouge ET qu'il reste assez de rouge pour arriver de l'autre
// côté, marge comprise. Tous les feux d'un même axe sont en phase (le cycle ne
// dépend que de l'axe et de l'heure de la rue, v305) : la règle n'a pas besoin
// de savoir QUEL feu.
//
// ET LA TRAVERSÉE SE FAIT EN TEMPS RÉEL, comme l'écart (v351) : la fenêtre du
// feu est une durée de l'horloge de la rue. Comptée en `dt` borné, une
// traversée de six blocs durerait quinze secondes réelles à cinq images par
// seconde, et le feu passerait au vert sous ses pieds.
export const ALLURE_TRAVERSEE = 1.25;   // on presse un peu le pas sur la chaussée
export const MARGE_FEU_S = 1.5;         // le rouge qui doit rester en plus de la traversée
// On n'attend pas plus que cela au bord : au-delà, on continue sur le trottoir
// (un passant qui fait le pied de grue est ce que Max appelle « figé », v278).
// Un peu plus d'un demi-cycle (onze secondes) : mesuré à six, six coins à feu
// sur dix renonçaient, parce qu'une traversée de huit à treize blocs demande
// six à huit des onze secondes de rouge.
export const ATTENTE_MAX_S = 12;
// La part des coins à feu où l'on traverse au lieu de tourner.
export const ENVIE_TRAVERSER = 0.6;
// Une traversée ne fait pas plus de seize blocs : au-delà ce n'est plus une rue.
export const TRAVERSEE_MAX = 16;

export function axeCoupe(ux, uz) { return 1 - axeDuCap(ux, uz); }

// Les secondes de rouge qui restent aux voitures de l'axe `axe` à l'instant
// `tMs` (0 si elles ne sont pas au rouge), et les secondes jusqu'au prochain
// début de rouge.
export function rougeDe(axe, tMs) {
  const debut = axe === 0 ? 0 : CYCLE / 2;
  const d = ((((tMs - debut) % CYCLE) + CYCLE) % CYCLE);
  const libre = VERT + ORANGE;
  if (d < libre) return { reste: 0, prochain: (libre - d) / 1000 };
  return { reste: (CYCLE - d) / 1000, prochain: (CYCLE - d + libre) / 1000 };
}

// La décision au bord du trottoir : partir maintenant, ou combien attendre.
export function feuPieton(axe, tMs, dureeS) {
  const r = rougeDe(axe, tMs);
  if (etatFeu(axe, tMs) === 'rouge' && r.reste >= dureeS + MARGE_FEU_S) return { partir: true, attente: 0 };
  return { partir: false, attente: r.prochain };
}

// Le chemin d'un trottoir à l'autre dans la direction (ux, uz), lu par
// `sol(x, z)` qui rend 't' (trottoir), 'c' (chaussée ou bordure) ou 'x'
// (autre chose : un mur, une pelouse, l'eau). Rend la longueur jusqu'au
// trottoir d'en face, un demi-bloc DEDANS, ou null. On peut encore avoir trois
// blocs de son propre trottoir devant soi ; il faut au moins deux blocs et
// demi de chaussée — un caniveau n'est pas une rue.
export function cheminDeTraversee(sol, x, z, ux, uz, max = TRAVERSEE_MAX) {
  let phase = 0, chaussee = 0;
  for (let s = 0.5; s <= max; s += 0.5) {
    const c = sol(x + ux * s, z + uz * s);
    if (c === 'x') return null;
    if (phase === 0) {
      if (c === 'c') { phase = 1; chaussee = 0.5; } else if (s > 3) return null;
    } else if (c === 'c') chaussee += 0.5;
    else if (c === 't') return chaussee >= 2.5 ? s + 0.5 : null;
  }
  return null;
}

// RÉAGIR À LA ROUTE (v376) — des gestes courts, jamais de peur ni d'arrêt
// prolongé (v243 : un passant ne s'arrête pas pour l'enfant).
//
// LE SURSAUT : une voiture qui arrive à moins de `SURSAUT_S` secondes sur le
// piéton lui fait lever les bras d'un coup et sautiller, le temps de
// `DUREE_SURSAUT` — pendant que l'écart (v351) le met de côté. Ce n'est qu'un
// geste : il ne change rien au pas de côté, qui reste la seule chose qui le
// protège.
export const SURSAUT_S = 0.45;
export const DUREE_SURSAUT = 0.5;
// On veille le passage de la voiture jusqu'à deux secondes après le début de
// l'écart, dans un couloir élargi à trois blocs : c'est la voiture qui passe
// AU RAS qui fait sursauter, pas celle qu'on a vue venir de loin.
export const VEILLE_SURSAUT_S = 2;
export const MARGE_SURSAUT = 3;
// APRÈS L'ÉCART, ON REPART TOUT DE SUITE. La pause valait 0,8 seconde de JEU :
// à cinq images par seconde, trois secondes de montre plantées au bord de la
// rue. Elle se compte désormais en temps réel, et elle est plus courte.
export const REPOS_ECART_S = 0.35;
// LE CHOC : `player.choc = { force, t, x, z }` (session physique, lu SI
// PRÉSENT). Un passant à moins de `PORTEE_CHOC` blocs se retourne vers le
// bruit, s'arrête un instant (`ARRET_CHOC_S`), puis reprend son chemin. Un
// choc plus vieux que `CHOC_FRAIS_MS` ne se regarde plus — un passant né après
// ne se retourne pas vers un bruit qu'il n'a pas entendu.
export const PORTEE_CHOC = 24;
export const ARRET_CHOC_S = 0.7;
export const CHOC_FRAIS_MS = 1500;
export const FORCE_CHOC_MIN = 0.15;

// Faut-il se retourner vers ce choc ? Rend le cap (yaw) vers le point, ou null.
// `t` est en millisecondes de `performance.now()`, comme le choc.
export function regardChoc(c, x, z, maintenant) {
  if (!c || typeof c.t !== 'number' || maintenant - c.t > CHOC_FRAIS_MS || maintenant < c.t - 50) return null;
  if ((c.force ?? 1) < FORCE_CHOC_MIN) return null;
  const dx = c.x - x, dz = c.z - z;
  const d = Math.hypot(dx, dz);
  if (d > PORTEE_CHOC || d < 0.5) return null;
  return Math.atan2(-dx, -dz);
}
