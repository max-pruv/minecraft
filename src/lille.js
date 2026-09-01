// Lille.
//
// C'était un disque de maisons avec un beffroi posé au milieu. Or Lille se
// reconnaît à deux choses, et la première est une forme : **la citadelle de
// Vauban**, une étoile à cinq branches entourée d'eau, « la reine des
// citadelles ». On la voit sur n'importe quelle vue aérienne, et rien d'autre
// en France ne lui ressemble à cet endroit.
//
// La seconde, c'est la **Grand'Place** — la Vieille Bourse et ses vingt-quatre
// maisons serrées autour d'une cour, la colonne de la Déesse, le beffroi — et
// autour d'elle le **Vieux-Lille** : des façades de brique rouge à pignons, des
// rues étroites qui tournent, et pas un angle droit.
//
// Le plan suit la ville réelle, relevée sur documents : la rue Faidherbe file
// droit de la place du Théâtre à la gare Lille-Flandres qui ferme la vue ;
// derrière la gare, Euralille et la tour « chaussure de ski » ; au nord, le
// Vieux-Lille, la place du Théâtre (l'Opéra blanc et le beffroi rouge de la
// Chambre de commerce côte à côte) et la cathédrale de la Treille ; au sud, la
// Porte de Paris avec le grand beffroi de l'hôtel de ville juste derrière ; au
// nord-ouest, l'étoile de la citadelle que la Deûle enveloppe, et le quai du
// Wault, l'ancien port, comme un doigt d'eau pointé vers le centre.
//
// LA NEUVIÈME VILLE REMISE À L'ÉCHELLE GTA (v204) : trente-deux blocs par
// kilomètre, contre seize. Un bloc valait soixante-deux mètres, et la rue
// Faidherbe — la perspective de Lille — faisait dix blocs de long : on la
// traversait en cinq secondes. À trente-deux blocs par kilomètre, un bloc fait
// trente et un mètres, comme à Nice (33 m) et à Manhattan (30 m). Le disque
// passe de 46 à 92 blocs et couvre Lille intra-muros d'Euralille à la
// citadelle, et de Wazemmes au Vieux-Lille.
//
// Même méthode qu'à Paris et à Nice, et les mêmes pièges : le plan d'auteur se
// PROJETTE (`k()`), les largeurs se REMESURENT en blocs neufs, et les
// monuments se refont parce qu'un beffroi acceptable à côté de maisons de
// quatre blocs ne l'est plus à côté de maisons de sept.

import { BLOCK, CITY_BLOCK, DECOR_START, ARCHI } from './blocks.js';
import { rangerVoies, solDesVoies, fabriqueCircuits } from './voies.js';
import { positionDe } from './mondes.js';

const uni = (c) => DECOR_START + c * 10;
const brique = (c) => DECOR_START + c * 10 + 1;

const BITUME = CITY_BLOCK.ASPHALT;
const TROTTOIR = CITY_BLOCK.SIDEWALK;
const PAVE = CITY_BLOCK.GRANITE;
const HERBE = BLOCK.GRASS;
const ARBRE = BLOCK.LEAVES;
const EAU = BLOCK.WATER;
const BRIQUE = brique(0);
const BRIQUE_SOMBRE = brique(18);
const PIERRE = uni(19);
const BLANC = uni(27);
const CREME = uni(28);
const ROSE = uni(16);
const ARDOISE = uni(25);
const VERRE = BLOCK.GLASS;
const OR = BLOCK.GOLD;
const ACIER = uni(24);

// LE RAYON VIENT DU REGISTRE (`mondes.js`), jamais d'un littéral ici : c'est le
// piège de San Francisco, dont le `r: 66` masquait la valeur de la carte, et
// Lille portait le même `r: 46` jusqu'à sa remise à l'échelle.
export const LILLE = positionDe('lille');

export const BLOCS_PAR_KM = 32;
// Le plan d'auteur a été relevé à seize blocs par kilomètre ; tout ce qui y
// est écrit en blocs — la Deûle, le quai du Wault, les origines de trame — se
// projette par `k()`. Les LARGEURS, elles, ne passent jamais par là.
const K = BLOCS_PAR_KM / 16;
const k = (n) => n * K;

// La Grand'Place : le point d'où tout se mesure.
const GRAND_PLACE = { u: 0, v: 0 };
const de = (dx, dz) => [
  Math.round(GRAND_PLACE.u + dx * BLOCS_PAR_KM),
  Math.round(GRAND_PLACE.v + dz * BLOCS_PAR_KM),
];
// Une adresse du monde à partir de kilomètres réels depuis la Grand'Place
// (dx vers l'est, dz vers le sud). C'est ce que les sondes et les témoins
// doivent viser — jamais un (u, v) en dur, qui meurt à la remise à l'échelle
// suivante.
export const adresseLille = (dx, dz) => {
  const [u, v] = de(dx, dz);
  return [LILLE.x + u, LILLE.z + v];
};

// --- la citadelle -------------------------------------------------------------------

// L'étoile à cinq branches. Son rayon varie avec l'angle : c'est cette formule,
// et elle seule, qui donne les cinq bastions pointus et les cinq courtines
// rentrantes entre eux.
//
// Ses dimensions n'ont PAS suivi l'échelle, et c'est voulu : à seize blocs par
// kilomètre l'étoile faisait un kilomètre de pointe à pointe, soit près du
// double de la vraie (six cents mètres de bastion à bastion). À trente-deux
// blocs par kilomètre, les mêmes onze blocs de rayon font trois cent cinquante
// mètres — la citadelle est enfin à sa taille, et elle a cessé d'arriver aux
// portes de la Grand'Place.
export const CITADELLE = (() => {
  const [u, v] = de(-1.55, -0.8);
  return { u, v, R: 11, pointe: 5 };
})();

const rayonCitadelle = (a) => CITADELLE.R + CITADELLE.pointe * Math.cos(5 * (a + 0.3));

// Où sommes-nous par rapport à l'étoile ? Négatif dedans, positif dehors.
function versCitadelle(u, v) {
  const du = u - CITADELLE.u, dv = v - CITADELLE.v;
  const d = Math.hypot(du, dv);
  if (d > CITADELLE.R + CITADELLE.pointe + 9) return 99;
  return d - rayonCitadelle(Math.atan2(dv, du));
}

// --- la Deûle -----------------------------------------------------------------------

// Le canal contourne la citadelle par l'ouest et file vers le nord. Il alimente
// aussi les douves, ce qui est exactement son rôle historique.
// Le canal passe à l'OUEST de la citadelle, il ne la traverse pas. Tracé trop
// à l'est, il coupait l'étoile en deux et noyait deux de ses cinq bastions —
// la forme, qui est toute la raison d'être de cette citadelle, ne se lisait
// plus. Les points sont en kilomètres depuis la Grand'Place, du sud au nord.
const DEULE = [
  de(-2.4, 1.5), de(-2.35, 0.6), de(-2.3, -0.2), de(-2.3, -0.9),
  de(-2.15, -1.6), de(-1.8, -2.3), de(-1.3, -2.7),
];
const uDeule = (v) => {
  if (v >= DEULE[0][1]) return DEULE[0][0];
  const fin = DEULE[DEULE.length - 1];
  if (v <= fin[1]) return fin[0];
  for (let i = 0; i < DEULE.length - 1; i++) {
    const [ua, va] = DEULE[i], [ub, vb] = DEULE[i + 1];
    if (v <= va && v >= vb) return ua + (ub - ua) * ((va - v) / (va - vb));
  }
  return fin[0];
};

// Le quai du Wault : le bassin de l'ancien port de la Haute-Deûle, encore en
// eau, entre la rue Nationale et l'esplanade. C'est lui qui rappelle que Lille
// est née de l'eau — « l'île ». Deux cents mètres de long, un kilomètre à
// l'ouest de la Grand'Place.
const WAULT = { u0: -35, u1: -27, v0: -4, v1: -2 };
const dansLeWault = (u, v, marge) =>
  u >= WAULT.u0 - marge && u <= WAULT.u1 + marge && v >= WAULT.v0 - marge && v <= WAULT.v1 + marge;

// Le fondu a suivi l'échelle : vingt blocs, six cents mètres.
const FONDU = 20;

export function hauteurLille(x, z, h, base) {
  const u = x - LILLE.x, v = z - LILLE.z;
  const d = Math.hypot(u, v);
  if (d > LILLE.r + FONDU) return h;
  const marge = Math.min(1, (LILLE.r + FONDU - d) / FONDU);

  let cible = base;
  // le canal, et le bassin du quai du Wault
  if (Math.abs(u - uDeule(v)) < 3) cible = base - 5;
  if (dansLeWault(u, v, 1)) cible = base - 5;
  // les douves de la citadelle, et son glacis relevé
  const c = versCitadelle(u, v);
  if (c < 99) {
    if (c > 0 && c < 3.5) cible = base - 5;
    else if (c <= 0) cible = base + (c < -3 ? 2 : 3);      // le rempart, plus haut que la ville
  }
  return h * (1 - marge) + cible * marge;
}

// --- les lieux -----------------------------------------------------------------------

// `r` est en blocs — un disque de sol autour d'un repère, qui n'a pas à
// grandir avec la carte. Les EMPRISES de plan (`ku`, `kv`), elles, sont en
// kilomètres et se convertissent : le jardin Vauban fait quatre cents mètres
// sur trois cents, le parc de la citadelle huit cents sur sept cents.
const L = (nom, dx, dz, reste = {}) => {
  const [u, v] = de(dx, dz);
  const p = { nom, u, v, ...reste };
  if (p.ku) { p.ru = Math.round(p.ku * BLOCS_PAR_KM); p.rv = Math.round(p.kv * BLOCS_PAR_KM); }
  return p;
};

export const LIEUX_LILLE = [
  L("Grand'Place", 0, 0, { r: 7, sol: PAVE, damier: true }),
  L('Place du Théâtre', 0.55, -0.42, { r: 5, sol: PAVE }),
  L('Vieux-Lille', -0.15, -0.55, { r: 6 }),
  L('Citadelle', -1.55, -0.8, { r: 5 }),
  L('Porte de Paris', 0.35, 0.85, { r: 6, sol: PAVE }),
  L('Gare Lille-Flandres', 0.88, 0, { r: 5, sol: PAVE }),
  L('Euralille', 1.55, -0.35, { r: 5, sol: PAVE }),
  L('République – Beaux-Arts', -0.05, 1.0, { r: 5, sol: PAVE }),
  L('Wazemmes', -0.85, 1.3, { r: 5 }),
  L('Jardin Vauban', -1.2, -0.3, { ku: 0.19, kv: 0.16, jardin: true }),
  L('Parc de la Citadelle', -2.0, -1.3, { ku: 0.4, kv: 0.35, jardin: true }),
];

export const lieuxDeLille = () => LIEUX_LILLE
  .filter((p) => p.r || p.jardin)
  .map((p) => ({ name: p.nom, x: LILLE.x + p.u, z: LILLE.z + p.v, r: 6 }));

// --- les rues ------------------------------------------------------------------------

// LES LARGEURS NE SE PROJETTENT PAS, ELLES SE REMESURENT. Les pas d'îlot, les
// largeurs de chaussée et de trottoir sont en blocs neufs, relevés sur le vrai
// plan : un îlot du centre fait cent cinquante mètres, soit cinq blocs de
// façades entre deux rues. Les ORIGINES de trame, elles, sont des points du
// plan d'auteur et passent par `k()`.
const TRAMES = {
  // le Vieux-Lille : des rues étroites qui ne sont parallèles à rien
  vieux: { ang: 0.28, pu: 6, pv: 5.5, cu: k(-2), cv: k(-8), w: 0.6, s: 1.1 },
  // le centre du XIXe, percé après la démolition des remparts
  centre: { ang: -0.14, pu: 9, pv: 8, cu: k(4), cv: k(4), w: 1.0, s: 1.8 },
  // les faubourgs du sud, tracés au cordeau autour de leurs usines
  sud: { ang: 0, pu: 10, pv: 9, cu: k(-8), cv: k(18), w: 1.0, s: 1.8 },
};

function trameDeLille(u, v) {
  if (v > 36) return TRAMES.sud;
  if (v < -8 && u < 14) return TRAMES.vieux;
  return TRAMES.centre;
}

// Une avenue de Lille fait deux blocs et demi de chaussée : c'est une ville
// de rues, pas de boulevards haussmanniens, et une voiture y tient sans que
// la maison d'en face ne recule d'un pâté.
const AVENUE = 2.4;
const a = (l) => l * AVENUE;
const TROTTOIR_AV = 1.2;

// Les points de passage sont en BLOCS NEUFS, et chaque bout d'avenue tombe
// SUR la chaussée d'une autre — ou sur une place pavée : c'est ce qui permet
// de les mettre bout à bout en circuits, et la ville le vérifie elle-même.
//
// La rue Faidherbe est LA perspective de Lille : percée droite en 1869, elle
// part de la place du Théâtre et bute sur la façade de la gare. D'un bout on
// voit la gare, de l'autre le beffroi de la Chambre de commerce.
// Exportées pour que les témoins suivent la rue Faidherbe d'un bout à l'autre
// par sa voie déclarée, plutôt que par des blocs écrits en dur.
export const VOIES_LILLE = [
  // le centre, entre la Grand'Place et les gares
  { nom: 'Rue Faidherbe', l: a(0.9), t: TROTTOIR_AV, pts: [[18, -10], [28, 0]] },
  { nom: 'Boulevard Carnot', l: a(0.7), t: TROTTOIR_AV, pts: [[18, -14], [30, -21], [42, -24]] },
  { nom: 'Avenue Willy-Brandt', l: a(0.8), t: TROTTOIR_AV, pts: [[42, -24], [42, 7]] },
  { nom: 'Rue de Tournai', l: a(0.7), t: TROTTOIR_AV, pts: [[42, 7], [28, 7]] },
  // vers le sud : la Porte de Paris, l'hôtel de ville, la République
  { nom: 'Rue de Paris', l: a(0.7), t: TROTTOIR_AV, pts: [[2, 4], [6, 15], [11, 22]] },
  { nom: 'Rue Gustave-Delory', l: a(0.7), t: TROTTOIR_AV, pts: [[-2, 32], [11, 32]] },
  { nom: 'Boulevard de la Liberté', l: a(1.0), t: TROTTOIR_AV, pts: [[-32, 3], [-16, 19], [-2, 32]] },
  { nom: 'Rue Nationale', l: a(0.9), t: TROTTOIR_AV, pts: [[-2, 0], [-19, 2], [-43, 3]] },
  // l'ouest et Wazemmes
  { nom: 'Boulevard Vauban', l: a(0.8), t: TROTTOIR_AV, pts: [[-43, 3], [-40, 20], [-36, 36], [-35, 44]] },
  { nom: 'Rue Léon-Gambetta', l: a(0.7), t: TROTTOIR_AV, pts: [[-2, 32], [-15, 38], [-35, 44]] },
  { nom: 'Boulevard Victor-Hugo', l: a(0.8), t: TROTTOIR_AV, pts: [[11, 32], [-10, 40], [-35, 44]] },
  // le Vieux-Lille
  { nom: 'Rue Esquermoise', l: a(0.6), t: TROTTOIR_AV, pts: [[-1, -3], [-11, -11]] },
  { nom: 'Rue Royale', l: a(0.6), t: TROTTOIR_AV, pts: [[-11, -11], [-26, -22], [-34, -27]] },
  { nom: 'Avenue du Peuple-Belge', l: a(0.8), t: TROTTOIR_AV, pts: [[-11, -11], [-12, -28], [-16, -45]] },
  { nom: 'Rue de la Monnaie', l: a(0.6), t: TROTTOIR_AV, pts: [[-12, -28], [-3, -16], [1, -6]] },
];

const VOIES = VOIES_LILLE;
const BANDES = rangerVoies(VOIES);

// LES CIRCUITS SE MESURENT, ILS NE SE DEVINENT PAS. Toutes les combinaisons de
// deux à cinq avenues voisines ont été éprouvées contre `solLille`, et l'on
// n'a gardé que ce qui tient la rue à quatre-vingt-dix pour cent — puis choisi
// par couverture gloutonne, chaque circuit apportant le plus d'avenues neuves.
// Jusqu'en v203 Lille n'avait AUCUN circuit : ses sept rues faisaient dix
// blocs et aucune ne refermait une boucle. Six circuits couvrent les quinze
// avenues (mesures : part sur la rue, longueur en blocs).
const CIRCUITS = [
  // 100 %, 189 — la grande boucle du sud-ouest : Nationale vers l'ouest,
  // Vauban vers le sud, Gambetta et la Liberté pour revenir à République.
  ['Rue Nationale', 'Boulevard Vauban', 'Rue Léon-Gambetta', 'Boulevard de la Liberté'],
  // 100 %, 144 — de la Grand'Place à la Porte de Paris et retour par la Liberté.
  ['Rue de Paris', 'Rue Gustave-Delory', 'Boulevard de la Liberté', 'Rue Nationale'],
  // 99 %, 96 — le quartier des gares : Carnot, Euralille, retour par Faidherbe.
  ['Boulevard Carnot', 'Avenue Willy-Brandt', 'Rue de Tournai', 'Rue Faidherbe'],
  // 100 %, 94 — le tour du Vieux-Lille par la Monnaie et le Peuple-Belge.
  ['Rue de la Monnaie', 'Rue Esquermoise', 'Avenue du Peuple-Belge'],
  // 100 %, 82 — l'axe Esquermoise–Royale, aller et retour jusqu'à la Citadelle.
  ['Rue Esquermoise', 'Rue Royale'],
  // 100 %, 97 — Delory, Victor-Hugo et Gambetta : le triangle de Wazemmes.
  ['Rue Gustave-Delory', 'Boulevard Victor-Hugo', 'Rue Léon-Gambetta'],
];
// Le damier de la Grand'Place est roulant : les rues y débouchent.
const ROULANT = new Set([BITUME, PAVE, ROSE]);

export const circuitsLille = fabriqueCircuits({
  cle: 'lille', ancre: LILLE, chaines: CIRCUITS, roulant: ROULANT,
  voies: { liste: VOIES, sol: solLille },
});

export function solLille(x, z) {
  const u = x - LILLE.x, v = z - LILLE.z;
  if (Math.hypot(u, v) > LILLE.r) return null;

  // le canal, le bassin du quai du Wault, et les douves
  if (Math.abs(u - uDeule(v)) < 2.5) return EAU;
  if (dansLeWault(u, v, 0)) return EAU;
  const c = versCitadelle(u, v);
  if (c < 99) {
    if (c > 0.5 && c < 3) return EAU;                       // les douves en eau
    if (c >= -1.2 && c <= 0.5) return PAVE;                 // le rempart de brique et pierre
    if (c < -1.2) {
      // l'intérieur : la place d'armes, ses casernes et ses arbres
      if (Math.abs(u - CITADELLE.u) < 1 || Math.abs(v - CITADELLE.v) < 1) return PAVE;
      return ((u + v) & 3) === 0 ? ARBRE : HERBE;
    }
  }

  for (const p of LIEUX_LILLE) {
    if (p.jardin) {
      if (((u - p.u) / p.ru) ** 2 + ((v - p.v) / p.rv) ** 2 < 1) {
        if (Math.abs(v - p.v) < 0.6) return TROTTOIR;
        return ((u * 3 + v) & 3) === 0 ? ARBRE : HERBE;
      }
      continue;
    }
    if (!p.sol) continue;
    if (Math.hypot(u - p.u, v - p.v) < p.r) {
      // le damier de granit bleu et rose de la Grand'Place
      if (p.damier) return ((u + v) & 1) ? ROSE : p.sol;
      return p.sol;
    }
  }

  const voie = solDesVoies(BANDES, u, v, BITUME, TROTTOIR);
  if (voie !== null) return voie;

  const t = trameDeLille(u, v);
  const co = Math.cos(t.ang), si = Math.sin(t.ang);
  const du = u - t.cu, dv = v - t.cv;
  const a = du * co - dv * si, b = du * si + dv * co;
  const d = Math.min(
    Math.abs(a - Math.round(a / t.pu) * t.pu),
    Math.abs(b - Math.round(b / t.pv) * t.pv),
  );
  if (d < t.w) return BITUME;
  if (d < t.s) return TROTTOIR;
  return null;
}

export function lotLilleLibre(x, z) {
  const u = x - LILLE.x, v = z - LILLE.z;
  if (Math.hypot(u, v) > LILLE.r) return false;
  if (versCitadelle(u, v) < 6) return false;                // on ne bâtit pas sur le glacis
  if (Math.abs(u - uDeule(v)) < 4) return false;
  if (dansLeWault(u, v, 1)) return false;                   // les berges du bassin
  return solLille(x, z) === null;
}

// --- les maisons ---------------------------------------------------------------------

// La brique rouge et le pignon à redents : c'est cela, une rue de Lille. Les
// maisons sont étroites — trois blocs — et hautes, parce que l'impôt se payait
// à la largeur de façade. Et une maison sur deux porte le « rang de briques,
// rang de pierre » flamand : des bandes blanches en travers de la brique.
// PAS D'ORANGE NI DE SAUMON : `brique(1)` est l'orange de signalisation et
// `brique(16)` un rose vif — les « briques de plastique » que Max a signalées
// sur Rome. La brique du Nord est rouge, brune, ou jaune-ocre (Kaki).
const BRIQUES = [brique(0), brique(18), brique(17), brique(22), brique(0)];

function tirageLille(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function batirColonneLille(x, z, poser) {
  const u = x - LILLE.x, v = z - LILLE.z;
  const t = trameDeLille(u, v);
  const co = Math.cos(t.ang), si = Math.sin(t.ang);
  const du = u - t.cu, dv = v - t.cv;
  const a = Math.round((du * co - dv * si) / t.pu), b = Math.round((du * si + dv * co) / t.pv);
  const r = tirageLille(a, b, 641);
  // Euralille : quelques tours de bureaux, mais aucune ne dépasse la tour de
  // Lille (116 m) ni le beffroi de l'hôtel de ville (104 m) — la hiérarchie
  // des hauteurs de la vraie ville.
  const tour = u >= 38 && v > -24 && v < 6 && r > 0.72;
  const bh = tour ? 12 + Math.floor(r * 10) : 5 + Math.floor(r * 3);
  const mur = tour ? ACIER : BRIQUES[Math.floor(tirageLille(a, b, 642) * BRIQUES.length) % BRIQUES.length];
  const raye = !tour && tirageLille(a, b, 643) > 0.5;

  const oE = lotLilleLibre(x + 1, z), oO = lotLilleLibre(x - 1, z);
  const oS = lotLilleLibre(x, z + 1), oN = lotLilleLibre(x, z - 1);
  const dedans = oE && oO && oS && oN;
  const face = (!oE || !oO) ? v : u;

  for (let y = 0; y < bh; y++) {
    if (dedans) { if (y === 0) poser(1, BLOCK.PLANK); continue; }
    const fenetre = y > 0 && y % 2 === 1 && (face & 1) === 1;
    // Une fenêtre est un DESSIN, pas un trou : 16,4 % du volume bâti de Lille
    // était du verre, donc un trou par lequel on voyait l'intérieur creux.
    // Même remède qu'à San Francisco (v195) et aux villes engendrées (v200).
    let id = fenetre ? ARCHI.ETAGE : mur;
    if (raye && !fenetre && y > 0 && y % 2 === 0) id = PIERRE;
    poser(y + 1, id);
  }
  poser(bh + 1, tour ? ACIER : ARDOISE);
  // le pignon à redents : deux marches de pierre blanche au-dessus de la façade
  if (!tour && !dedans && (face & 3) === 1) {
    poser(bh + 2, PIERRE);
    poser(bh + 3, PIERRE);
  }
}

// --- ce que la carte doit peindre -------------------------------------------------------

const GRIS_RUE = [64, 66, 72];
const BEIGE = [214, 202, 176];
const VERT_JARDIN = [96, 156, 84];
const TOIT = [150, 84, 72];

export function couleurCarteLille(x, z) {
  const u = x - LILLE.x, v = z - LILLE.z;
  if (u < -LILLE.r || u > LILLE.r || v < -LILLE.r || v > LILLE.r) return null;
  const sol = solLille(x, z);
  if (sol === null) return Math.hypot(u, v) > LILLE.r ? null : TOIT;
  if (sol === EAU) return null;
  if (sol === ARBRE || sol === HERBE) return VERT_JARDIN;
  if (sol === PAVE || sol === ROSE) return BEIGE;
  return GRIS_RUE;
}

// --- les monuments -----------------------------------------------------------------------

// Les positions viennent de la fiche de terrain : distances réelles à vol
// d'oiseau depuis la Grand'Place, converties à trente-deux blocs par
// kilomètre. Les `box` sont l'emprise du bâtisseur, pas une longueur du plan :
// ils ne grandissent pas avec la carte.
// Le « seuil » : la ville est compacte, et dix noms de monuments par-dessus
// dix noms de lieux chassaient les destinations de la carte. Les petits
// monuments n'affichent donc leur nom que de tout près.
export const MONUMENTS_LILLE = [
  { nom: 'Vieille Bourse', dx: 0.28, dz: -0.22, box: 6 },
  { nom: 'Porte de Paris', dx: 0.35, dz: 0.85, box: 7 },
  { nom: 'Citadelle de Vauban', dx: -1.55, dz: -0.8, box: 18 },
  { nom: 'Colonne de la Déesse', dx: 0, dz: 0, box: 2, seuil: 0.3 },
  { nom: 'Opéra de Lille', dx: 0.75, dz: -0.38, box: 4, seuil: 0.3 },
  { nom: 'Beffroi de la Chambre de commerce', dx: 0.55, dz: -0.6, box: 3, seuil: 0.3 },
  { nom: 'Gare Lille-Flandres', dx: 1.03, dz: 0, box: 6, seuil: 0.3 },
  { nom: 'Tour de Lille', dx: 1.55, dz: -0.35, box: 5, seuil: 0.3 },
  { nom: 'Cathédrale de la Treille', dx: -0.05, dz: -0.75, box: 6, seuil: 0.3 },
].map((m) => { const [u, v] = de(m.dx, m.dz); return { ...m, u, v }; });

const boite = (poser) => {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
  };
  return { set, bloc };
};

// La Vieille Bourse : vingt-quatre maisons identiques serrées autour d'une
// cour intérieure — c'est la cour qui fait le monument, on y entre par quatre
// portes. Brique rouge, rang de pierre sous les toits, pignons, et le petit
// campanile doré de Mercure au-dessus de l'entrée nord.
export function buildVieilleBourse(poser) {
  const { set } = boite(poser);
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      const bord = Math.abs(dx) === 4 || Math.abs(dz) === 4;
      if (!bord) { set(dx, 0, dz, PAVE); continue; }
      for (let y = 0; y <= 5; y++) set(dx, y, dz, y === 4 ? PIERRE : BRIQUE);
      // une fenêtre est un DESSIN, pas un trou : la cour est creuse derrière
      if ((dx + dz) & 1) set(dx, 2, dz, ARCHI.ETAGE);
      // un pignon tous les deux blocs : ce sont les vingt-quatre maisons
      if ((dx + dz) % 2 === 0) { set(dx, 6, dz, PIERRE); set(dx, 7, dz, PIERRE); }
      else set(dx, 6, dz, ARDOISE);
    }
  }
  // les quatre entrées de la cour
  for (const [dx, dz] of [[0, 4], [0, -4], [4, 0], [-4, 0]]) {
    for (let y = 0; y <= 1; y++) set(dx, y, dz, BLOCK.AIR);
  }
  // Mercure, doré, au-dessus de l'entrée nord
  set(0, 8, -4, PIERRE);
  set(0, 9, -4, OR);
}

// La colonne de la Déesse, au centre du damier de la Grand'Place : une femme
// de bronze qui tient un boutefeu, souvenir du siège de 1792.
export function buildColonneDeesse(poser) {
  const { set } = boite(poser);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(dx, 0, dz, PIERRE);
  for (let y = 1; y <= 6; y++) set(0, y, 0, PIERRE);
  set(0, 7, 0, OR);
}

// L'Opéra : pierre blanche, colonnade, et le fronton d'Apollon doré. Il fait
// face à la place du Théâtre, dos au Vieux-Lille. Le bâtiment est PLEIN, donc
// ses baies de verre ne sont pas des trous.
export function buildOperaLille(poser) {
  const { set, bloc } = boite(poser);
  bloc(-2, 2, 0, 3, -1, 1, BLANC);
  for (const dx of [-1, 0, 1]) { set(dx, 1, 1, VERRE); set(dx, 2, 1, VERRE); }
  set(0, 0, 1, BLOCK.AIR);                                   // l'entrée
  for (let dx = -1; dx <= 1; dx++) set(dx, 4, 0, BLANC);     // le fronton
  set(0, 5, 0, OR);                                          // Apollon
}

// Le beffroi de la Chambre de commerce : 76 mètres de brique et de pierre,
// l'horloge à quatre cadrans, le carillon qui joue le P'tit Quinquin. Juste à
// côté de l'Opéra — le duo blanc et rouge est l'image classique de Lille.
export function buildBeffroiCCI(poser) {
  const { set } = boite(poser);
  for (let y = 0; y <= 16; y++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        set(dx, y, dz, y % 4 === 3 ? PIERRE : BRIQUE);
      }
    }
  }
  // l'horloge, un cadran doré par face
  for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) set(dx, 13, dz, OR);
  set(0, 17, 0, PIERRE);
  set(0, 18, 0, PIERRE);
  set(0, 19, 0, OR);
}

// La gare Lille-Flandres : l'ancienne façade de la gare de Paris-Nord,
// démontée et remontée ici pierre par pierre, avec son horloge au fronton.
// Elle ferme la perspective de la rue Faidherbe. Derrière, la halle de métal
// et de verre abrite les dix-sept voies du terminus. La façade est un mur
// PLEIN d'un bloc d'épaisseur : ses vitres ne donnent sur aucun vide.
export function buildGareFlandres(poser) {
  const { set, bloc } = boite(poser);
  // la façade de pierre, face à la rue Faidherbe
  bloc(-1, -1, 0, 4, -3, 3, PIERRE);
  for (const dz of [-2, 2]) { set(-1, 1, dz, ARCHI.ETAGE); set(-1, 2, dz, ARCHI.ETAGE); }
  for (let y = 0; y <= 1; y++) set(-1, y, 0, BLOCK.AIR);     // la porte
  // le fronton, et l'horloge dorée
  bloc(-1, -1, 5, 5, -2, 2, PIERRE);
  set(-1, 6, -1, PIERRE); set(-1, 6, 1, PIERRE);
  set(-1, 6, 0, OR);                                         // l'horloge
  // la halle : un arc d'acier et de verre au-dessus des quais
  for (let dx = 0; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const y = Math.abs(dz) === 3 ? 2 : Math.abs(dz) === 2 ? 3 : 4;
      set(dx, y, dz, (dx + dz) & 1 ? VERRE : ACIER);
    }
    for (const dz of [-3, 3]) { set(dx, 0, dz, BRIQUE); set(dx, 1, dz, BRIQUE); }
  }
}

// La tour de Lille, à Euralille : 120 mètres, un « L » renversé au sommet
// incliné que tout le monde surnomme la chaussure de ski, posée comme un pont
// au-dessus de la gare Lille-Europe. C'est le plus haut bâtiment de la carte
// de Lille — devant le beffroi de l'hôtel de ville, comme en vrai.
export function buildTourDeLille(poser) {
  const { set, bloc } = boite(poser);
  // la gare Lille-Europe, une verrière basse sous la tour
  bloc(-3, 3, 0, 1, -1, 1, VERRE);
  // le fût blanc, rythmé de verre. LE FÛT EST CREUX : ses vitres sont du mur-
  // rideau (`CURTAIN`), qui porte ses meneaux dans sa texture et s'allume la
  // nuit — pas du verre, par lequel on verrait le vide de la tour.
  for (let y = 0; y <= 27; y++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        const vitre = (dx === 0 || dz === 0) && y % 2 === 1;
        set(dx, y, dz, vitre ? CITY_BLOCK.CURTAIN : BLANC);
      }
    }
  }
  // la « chaussure » : le sommet déborde en porte-à-faux, puis s'incline
  bloc(-1, 1, 28, 30, -1, 3, BLANC);
  bloc(-1, 1, 31, 31, 0, 3, BLANC);
  bloc(-1, 1, 32, 32, 2, 3, BLANC);
}

// La cathédrale de la Treille : un corps néo-gothique de brique et de pierre,
// et la surprise de sa façade ouest, achevée en 1999 seulement — une grande
// ogive de marbre translucide, lisse et claire, avec sa rosace ronde. Le
// contraste des deux époques, c'est elle. La nef est PLEINE : la rosace de
// verre ne donne sur aucun vide.
export function buildTreille(poser) {
  const { set, bloc } = boite(poser);
  // le corps néo-gothique, contreforts de pierre sur brique
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let y = 0; y <= 5; y++) {
        const contrefort = (dx & 1) && Math.abs(dz) === 1;
        set(dx, y, dz, contrefort ? PIERRE : BRIQUE);
      }
      set(dx, 6, dz, ARDOISE);
    }
    set(dx, 7, 0, ARDOISE);                                  // la ligne de faîte
  }
  // la façade ouest de 1999 : une plaque claire, plus haute que la nef
  bloc(-4, -4, 0, 8, -1, 1, CREME);
  set(-4, 5, 0, VERRE);                                      // la rosace
  set(-4, 4, 0, VERRE);
  for (let y = 0; y <= 1; y++) set(-4, y, 0, BLOCK.AIR);     // le portail
}

// La Porte de Paris : un arc de triomphe pour Louis XIV, tout seul au milieu
// d'un rond-point, avec ses trophées et sa renommée dorée au sommet. L'arche
// est traversante du nord au sud : la rue de Paris passe dessous.
export function buildPorteDeParis(poser) {
  const { set, bloc } = boite(poser);
  bloc(-5, 5, 0, 11, -2, 2, PIERRE);
  bloc(-2, 2, 0, 7, -3, 3, BLOCK.AIR);
  for (let k = 0; k <= 2; k++) {
    for (let dx = -2 + k; dx <= 2 - k; dx++) for (let dz = -3; dz <= 3; dz++) set(dx, 8 + k, dz, BLOCK.AIR);
  }
  for (const dx of [-4, 4]) for (let y = 2; y <= 9; y += 3) { set(dx, y, -2, OR); set(dx, y, 2, OR); }
  bloc(-6, 6, 12, 12, -3, 3, PIERRE);
  for (let k = 0; k <= 3; k++) {
    for (let dx = -4 + k; dx <= 4 - k; dx++) set(dx, 13 + k, 0, PIERRE);
  }
  set(0, 17, 0, OR);
}

// La citadelle : cinq bastions, cinq courtines, la porte royale et la place
// d'armes. Vauban en a construit trois cents ; celle-ci était sa préférée.
export function buildCitadelle(poser) {
  const { set } = boite(poser);
  const { R, pointe } = CITADELLE;
  // le rempart, suivi angle par angle
  for (let i = 0; i < 1440; i++) {
    const a = (i / 1440) * Math.PI * 2;
    const r = R + pointe * Math.cos(5 * (a + 0.3));
    for (let e = 0; e <= 1; e++) {
      const x = Math.round(Math.cos(a) * (r - e)), z = Math.round(Math.sin(a) * (r - e));
      for (let y = 0; y <= 5; y++) set(x, y, z, y >= 4 ? PIERRE : BRIQUE);
      if (e === 0 && i % 12 === 0) set(x, 6, z, PIERRE);      // les créneaux
    }
  }
  // la porte royale, plein est, et son pont sur les douves
  for (let y = 0; y <= 3; y++) for (let dz = -1; dz <= 1; dz++) {
    set(Math.round(R + pointe * Math.cos(5 * 0.3)), y, dz, BLOCK.AIR);
  }
  for (let k = 0; k <= 5; k++) for (let dz = -1; dz <= 1; dz++) set(R + 1 + k, 0, dz, PAVE);
  // les casernes autour de la place d'armes, en brique
  for (const [cx, cz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let y = 0; y <= 4; y++) set(cx + dx, y, cz + dz, BRIQUE_SOMBRE);
        set(cx + dx, 5, cz + dz, ARDOISE);
      }
    }
  }
  // le mât au centre de la place d'armes
  for (let y = 0; y <= 8; y++) set(0, y, 0, PIERRE);
  set(0, 9, 0, OR);
}
