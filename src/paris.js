// Paris.
//
// Le quartier existait déjà — pierre de taille, toits de zinc, la Tour Eiffel,
// l'Arc de Triomphe et la pyramide du Louvre — et il avait reçu son fleuve,
// son île et ses deux percées. Mais rien de tout cela n'était placé : la Tour
// Eiffel se dressait sur la rive droite, le Louvre sur la rive gauche, et
// l'Opéra, le Panthéon, les Invalides, la Bastille, le Luxembourg n'existaient
// pas du tout. Un plan de Paris, ce sont d'abord ces lieux-là et la façon dont
// les boulevards les relient.
//
// Tout est donc replacé à sa vraie adresse, comme à Manhattan : une échelle
// unique, huit blocs par kilomètre, et un point d'ancrage — Notre-Dame. Chaque
// lieu est donné par son écart réel à Notre-Dame, en kilomètres, et le reste
// suit. Paris fait douze kilomètres d'est en ouest : quatre-vingt-seize blocs
// ici, ce qui la fait tenir juste à l'intérieur de l'anneau du métro aérien —
// lequel devient, de fait, son boulevard périphérique.
//
// Ce qui n'a pas bougé : le centre de la ville, son rayon, l'anneau du métro,
// la caserne et le commissariat. Les mondes déjà sauvegardés y retrouvent
// leurs repères.

import { BLOCK, CITY_BLOCK, DECOR_START } from './blocks.js';
import { rangerVoies, solDesVoies } from './voies.js';

const uni = (couleur) => DECOR_START + couleur * 10;

const PAVE = CITY_BLOCK.SIDEWALK;
const BITUME = CITY_BLOCK.ASPHALT;
const PIERRE = CITY_BLOCK.HAUSSMANN;
const ZINC = CITY_BLOCK.ZINC;
const QUAI = CITY_BLOCK.GRANITE;
const ARBRE = BLOCK.LEAVES;
const BLANC = uni(27);
const VERT_DE_GRIS = CITY_BLOCK.COPPER;
const NOIR = uni(25);
const VERRE = BLOCK.GLASS;

export const PARIS = { x: -240, z: 200, r: 55 };

// L'échelle, et le point d'ancrage. `de(dx, dz)` traduit un écart réel à
// Notre-Dame, en kilomètres vers l'est et vers le sud, en coordonnées locales.
const BLOCS_PAR_KM = 8;
const ND = { u: 8, v: 6 };
const de = (dx, dz) => [
  Math.round(ND.u + dx * BLOCS_PAR_KM),
  Math.round(ND.v + dz * BLOCS_PAR_KM),
];

// --- la Seine -----------------------------------------------------------------

// Le fleuve entre au sud-est, remonte vers le nord-ouest jusqu'aux îles, longe
// le Louvre, puis redescend vers l'ouest en passant sous la Tour Eiffel. C'est
// ce grand S couché qu'on reconnaît sur un plan, et aucune sinusoïde ne le
// donne : il est relevé point par point.
const SEINE = [
  [-58, 9], [-42, 8], [-32, 5], [-24, 7], [-18, 7], [-10, 6], [-5, 5],
  [3, 6], [8, 6], [15, 7], [24, 9], [32, 12], [44, 16], [58, 21],
];

export function zSeine(x) {
  const u = x - PARIS.x;
  if (u <= SEINE[0][0]) return PARIS.z + SEINE[0][1];
  const dernier = SEINE[SEINE.length - 1];
  if (u >= dernier[0]) return PARIS.z + dernier[1];
  for (let i = 0; i < SEINE.length - 1; i++) {
    const [ua, va] = SEINE[i], [ub, vb] = SEINE[i + 1];
    if (u >= ua && u <= ub) return PARIS.z + va + (vb - va) * ((u - ua) / (ub - ua));
  }
  return PARIS.z + dernier[1];
}

// La Seine fait deux cents mètres de large : moins d'un bloc à notre échelle.
// On l'élargit à cinq, ce qu'il faut pour qu'elle se voie et se traverse — et
// on l'élargit encore autour des îles, comme dans la réalité, sinon la Cité
// remplirait tout le lit et Notre-Dame n'aurait plus de rive en face d'elle.
const LARGEUR_SEINE = 2.6;
function largeurSeine(u) {
  const d = Math.abs(u - CITE.u) / (CITE.long + 2);
  return d >= 1 ? LARGEUR_SEINE : LARGEUR_SEINE + (4.4 - LARGEUR_SEINE) * (1 - d);
}
// L'axe du fleuve en coordonnées locales : ce dont les adresses ont besoin
// pour savoir de quel côté elles tombent.
const vSeine = (u) => zSeine(PARIS.x + u) - PARIS.z;

// Les deux îles. La Cité d'abord — c'est là qu'est née la ville, et là qu'est
// Notre-Dame ; Saint-Louis juste en amont, plus petite. Elles sont plus larges
// que nature : une île de trois blocs ne porterait pas une cathédrale.
export const CITE = { u: ND.u, long: 8, large: 2.5 };
const SAINT_LOUIS = { u: ND.u + 12, long: 4, large: 1.6 };
// Le centre de l'île, là où se pose Notre-Dame. On le calcule plutôt que de le
// recopier : la courbe du fleuve déplace l'île avec elle.
export const zCite = () => Math.round(zSeine(PARIS.x + CITE.u));

const surUneIle = (x, z, ile) => {
  const u = x - PARIS.x - ile.u;
  if (Math.abs(u) > ile.long) return false;
  const e = ile.large * Math.sqrt(Math.max(0, 1 - (u / ile.long) ** 2));
  return Math.abs(z - zSeine(x)) <= e;
};
export const surLIle = (x, z) => surUneIle(x, z, CITE) || surUneIle(x, z, SAINT_LOUIS);

// Distance au fleuve, négative sur l'eau. Les îles n'en font pas partie.
export function versSeine(x, z) {
  if (Math.hypot(x - PARIS.x, z - PARIS.z) > PARIS.r + 6) return 99;
  if (surLIle(x, z)) return 3;
  return Math.abs(z - zSeine(x)) - largeurSeine(x - PARIS.x);
}

// --- le terrain ----------------------------------------------------------------

// La butte Montmartre : la seule vraie colline de Paris, celle qui porte le
// Sacré-Cœur et d'où l'on voit toute la ville.
export const BUTTE = { u: de(-1.6, -3.5)[0], v: de(-1.6, -3.5)[1], r: 13 };

export function hauteurParis(x, z, h, base) {
  const d = versSeine(x, z);
  // Le lit doit descendre SOUS le niveau de l'eau, sinon la Seine n'est qu'un
  // fossé sec : c'est le remplissage général du monde qui la met en eau.
  if (d < 0) return Math.min(h, base - 6);
  if (d < 2) return base - 1;                        // le quai bas, au ras de l'eau
  const bd = Math.hypot(x - (PARIS.x + BUTTE.u), z - (PARIS.z + BUTTE.v));
  if (bd < BUTTE.r) {
    const m = Math.cos((bd / BUTTE.r) * Math.PI * 0.5);
    return h + Math.round(m * m * 12);               // la butte
  }
  return h;
}

// --- les lieux ------------------------------------------------------------------
//
// Chacun à son écart réel à Notre-Dame. C'est cette liste qui décide de tout le
// reste : les boulevards la relient, les monuments s'y posent, la carte y
// emmène. Un seul endroit à corriger le jour où l'échelle change.

// Un lieu, par son écart réel à Notre-Dame. `rive` dit de quel côté du fleuve
// il se trouve — 'd' pour la rive droite, 'g' pour la gauche — et sert à le
// repousser si le fleuve le recouvre. Ce n'est pas une licence : la Seine fait
// deux cents mètres, on la dessine à six cents, et cette largeur en trop
// engloutissait le Louvre, l'Hôtel de Ville, la Tour Eiffel et la Bastille,
// qui la longent tous de près. Les quais gagnent donc ce que le lit a pris.
const L = (nom, dx, dz, reste = {}) => {
  const [u, v0] = de(dx, dz);
  let v = v0;
  if (reste.rive) {
    const bord = largeurSeine(u) + 2.5;
    v = reste.rive === 'd'
      ? Math.min(v, Math.round(vSeine(u) - bord))
      : Math.max(v, Math.round(vSeine(u) + bord));
  }
  return { nom, u, v, ...reste };
};

// `sol` : ce que la place pose au sol. `r` : son rayon.
export const LIEUX = [
  L('Notre-Dame', 0, 0),
  L("Hôtel de Ville", 0.2, -0.35, { discret: true, rive: 'd', r: 2.5, sol: PAVE }),
  L('Châtelet', -0.2, -0.45, { discret: true, rive: 'd', r: 2, sol: PAVE }),
  L('Louvre', -1.6, -0.6, { rive: 'd', r: 3, sol: PAVE }),
  L('Tuileries', -2.3, -0.75, { rive: 'd', ru: 5, rv: 2.5, jardin: true }),
  L('Concorde', -3.2, -0.9, { r: 3.5, sol: PAVE }),
  L('Madeleine', -2.9, -1.4, { discret: true, r: 2, sol: PAVE }),
  L('Opéra', -2.2, -1.7, { r: 2.5, sol: PAVE }),
  L('Arc de Triomphe', -5.4, -1.6, { r: 4.5, sol: PAVE }),
  L('Trocadéro', -4.7, -0.6, { rive: 'd', r: 3, sol: PAVE }),
  L('Tour Eiffel', -4.4, 0.5, { rive: 'g', r: 2.5, sol: PAVE }),
  L('Champ-de-Mars', -4.35, 0.95, { rive: 'g', ru: 2.5, rv: 4, jardin: true }),
  L('Invalides', -3.3, 0.6, { rive: 'g', ru: 2.5, rv: 3.5, jardin: true }),
  L('Montparnasse', -1.7, 1.9, { r: 2.5, sol: PAVE }),
  L('Luxembourg', -0.6, 1.1, { rive: 'g', ru: 4, rv: 3, jardin: true }),
  L('Panthéon', 0.1, 0.9, { rive: 'g', r: 2.5, sol: PAVE }),
  L('Bastille', 1.5, -0.2, { rive: 'd', r: 3, sol: PAVE }),
  L('Place des Vosges', 0.9, -0.3, { discret: true, rive: 'd', ru: 2, rv: 2, jardin: true }),
  L('République', 0.9, -1.5, { r: 3, sol: PAVE }),
  L('Nation', 3.0, 0.5, { rive: 'd', r: 3, sol: PAVE }),
  L('Père-Lachaise', 3.3, -0.6, { ru: 4, rv: 4, jardin: true }),
  L('Buttes-Chaumont', 2.8, -2.8, { ru: 4, rv: 3.5, jardin: true }),
  L('Sacré-Cœur', -1.6, -3.5, { r: 2.5, sol: PAVE }),
  L('Moulin Rouge', -2.1, -3.1, { r: 1.5, sol: PAVE }),
  L('Gare du Nord', -0.5, -2.4, { discret: true, r: 2, sol: PAVE }),
  L('Gare de Lyon', 2.0, 0.0, { discret: true, rive: 'd', r: 2, sol: PAVE }),
  L('Bois de Boulogne', -7.0, -0.2, { rive: 'd', ru: 7, rv: 8, jardin: true }),
  L('Bois de Vincennes', 5.0, 0.7, { rive: 'd', ru: 7, rv: 6, jardin: true }),
];

const lieu = (nom) => LIEUX.find((p) => p.nom === nom);
export const ETOILE = lieu('Arc de Triomphe');
export const CONCORDE = lieu('Concorde');

// Les destinations que la carte a le droit de proposer : les places et les
// jardins dont un enfant a entendu le nom, en coordonnées du monde.
// `discret` : les adresses qui existent au sol mais qu'on ne met pas sur la
// carte. Vingt-huit noms dans un rayon de cinquante blocs, c'est plus que la
// carte n'en peut porter : les pastilles se chassaient les unes les autres et
// le Luxembourg finissait par disparaître. On garde les lieux qu'un enfant
// nomme, pas les carrefours.
export const lieuxDeParis = () => LIEUX
  .filter((p) => (p.r || p.jardin) && !p.discret)
  .map((p) => ({ name: p.nom, x: PARIS.x + p.u, z: PARIS.z + p.v, r: 7 }));

// --- les percées d'Haussmann ------------------------------------------------------
//
// Ce qui fait qu'un plan de Paris ne ressemble à aucun autre : une ville
// médiévale, et par-dessus, tracées au cordeau entre 1853 et 1870, une
// vingtaine de saignées droites qui vont d'une place à l'autre.

const pt = (nom) => [lieu(nom).u, lieu(nom).v];

const VOIES = [
  // rive droite
  { nom: 'Rue de Rivoli', l: 1.1, pts: [pt('Concorde'), pt('Tuileries'), pt('Louvre'), pt("Hôtel de Ville"), pt('Bastille')] },
  { nom: 'Grands Boulevards', l: 1.0, pts: [pt('Madeleine'), pt('Opéra'), [-2, -9], pt('République'), [20, -1], pt('Bastille')] },
  { nom: "Avenue de l'Opéra", l: 0.8, pts: [[-7, 0], pt('Opéra')] },
  { nom: 'Boulevard de Sébastopol', l: 0.9, pts: [pt('Châtelet'), [5, -6], [4, -14]] },
  { nom: 'Boulevard de Magenta', l: 0.8, pts: [pt('République'), pt('Gare du Nord')] },
  { nom: 'Rue La Fayette', l: 0.8, pts: [pt('Gare du Nord'), [-4, -11], pt('Opéra')] },
  { nom: 'Boulevard de Clichy', l: 0.8, pts: [[-17, -19], pt('Moulin Rouge'), [-2, -19]] },
  { nom: 'Boulevard Voltaire', l: 0.9, pts: [pt('République'), pt('Nation')] },
  { nom: 'Faubourg Saint-Antoine', l: 0.8, pts: [pt('Bastille'), pt('Nation')] },
  { nom: 'Rue de Belleville', l: 0.8, pts: [pt('République'), pt('Buttes-Chaumont')] },
  { nom: 'Avenue de la Grande Armée', l: 1.0, pts: [pt('Arc de Triomphe'), [-46, -9]] },
  // rive gauche
  { nom: 'Boulevard Saint-Germain', l: 1.0, pts: [[-18, 11], [-12, 13], [-2, 14], [8, 13], [15, 11], [18, 10]] },
  { nom: 'Boulevard Saint-Michel', l: 0.9, pts: [[6, 11], pt('Luxembourg'), [1, 22], [-1, 27]] },
  { nom: 'Rue de Rennes', l: 0.8, pts: [pt('Montparnasse'), [-3, 13]] },
  { nom: 'Boulevard du Montparnasse', l: 0.9, pts: [[-18, 19], pt('Montparnasse'), [4, 23]] },
  { nom: 'Boulevard Raspail', l: 0.7, pts: [[-4, 12], [-7, 20], [-8, 26]] },
  { nom: 'Avenue des Gobelins', l: 0.7, pts: [[10, 15], [14, 25]] },
  { nom: "Avenue de la Motte-Picquet", l: 0.7, pts: [pt('Tour Eiffel'), pt('Invalides')] },
];

const BANDES = rangerVoies(VOIES);

// Les ponts. Ils sont donnés par leur abscisse, comme sur un plan : c'est la
// seule chose qui compte pour savoir où l'on traverse.
const PONTS = [-28, -22, -19, -10, 3, 11, 17, 22, 30];

// --- le sol ------------------------------------------------------------------------

// Ce qu'il faut poser au sol, ou null si la trame ordinaire de la ville doit
// reprendre la main.
export function solParis(x, z) {
  const u = x - PARIS.x, v = z - PARIS.z;
  if (Math.hypot(u, v) > PARIS.r) return null;

  const d = versSeine(x, z);
  if (d < 0) {
    // Les ponts passent par-dessus l'eau : sans eux, les deux rives ne se
    // rejoignaient qu'en nageant.
    for (const pu of PONTS) if (Math.abs(u - pu) <= 1) return PAVE;
    return BLOCK.WATER;
  }
  if (d < 2) return QUAI;                    // les quais de pierre

  // Les places et les jardins passent avant les rues : une avenue ne traverse
  // pas le Luxembourg.
  for (const p of LIEUX) {
    if (p.jardin) {
      if (((u - p.u) / p.ru) ** 2 + ((v - p.v) / p.rv) ** 2 < 1) {
        // une allée en croix, et des arbres en bordure
        if (Math.abs(u - p.u) < 0.6 || Math.abs(v - p.v) < 0.6) return PAVE;
        return ((u + v) & 3) === 0 ? ARBRE : BLOCK.GRASS;
      }
      continue;
    }
    if (!p.r) continue;
    const dp = Math.hypot(u - p.u, v - p.v);
    if (dp < p.r) return dp > p.r - 1 ? BITUME : p.sol;
  }

  // La place de l'Étoile et ses douze avenues rayonnantes : la figure la plus
  // reconnaissable du plan de Paris — une étoile, littéralement.
  const de2 = Math.hypot(u - ETOILE.u, v - ETOILE.v);
  if (de2 < 16) {
    const a = Math.atan2(v - ETOILE.v, u - ETOILE.u);
    const secteur = a / (Math.PI * 2 / 12);
    if (Math.abs(secteur - Math.round(secteur)) * de2 < 1.0) return BITUME;
  }

  // Les Champs-Élysées : de l'Étoile à la Concorde, larges et plantés d'arbres.
  const t = (u - ETOILE.u) / (CONCORDE.u - ETOILE.u);
  if (t >= 0 && t <= 1) {
    const axe = ETOILE.v + (CONCORDE.v - ETOILE.v) * t;
    const dv = Math.abs(v - axe);
    if (dv <= 1) return BITUME;
    if (dv <= 3) return dv > 2 ? ARBRE : PAVE;
  }

  return solDesVoies(BANDES, u, v, BITUME, PAVE);
}

// Un lot est-il bâtissable ? Non sur l'eau, les quais, les percées et les
// places — sinon un immeuble se retrouverait les pieds dans la Seine.
export function lotParisLibre(x, z) {
  if (versSeine(x, z) < 4) return false;
  return solParis(x, z) === null;
}

// --- ce que la carte doit peindre ---------------------------------------------------

const VERT_JARDIN = [92, 152, 74];
const VERT_PELOUSE = [116, 176, 92];
const GRIS_RUE = [64, 66, 72];
const BEIGE_PLACE = [212, 204, 188];

// Paris comme Manhattan : ses places, ses jardins et ses percées se calculent,
// la carte peut donc les montrer avant qu'on y ait mis les pieds.
export function couleurCarteParis(x, z) {
  const u = x - PARIS.x, v = z - PARIS.z;
  if (Math.hypot(u, v) > PARIS.r) return null;
  const sol = solParis(x, z);
  if (sol === null) return null;
  if (sol === BLOCK.WATER) return null;      // au fleuve de décider
  if (sol === BLOCK.GRASS) return VERT_PELOUSE;
  if (sol === ARBRE) return VERT_JARDIN;
  if (sol === PAVE || sol === QUAI) return BEIGE_PLACE;
  return GRIS_RUE;
}

// --- les monuments ------------------------------------------------------------------

const boite = (poser) => {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
  };
  const dome = (cx, cz, y0, r, id) => {
    for (let y = 0; y <= r; y++) {
      const rr = Math.round(Math.sqrt(Math.max(0, r * r - y * y)) * 0.9);
      for (let dx = -rr; dx <= rr; dx++) {
        for (let dz = -rr; dz <= rr; dz++) {
          const h = Math.hypot(dx, dz);
          if (h > rr || h < rr - 1.3) continue;
          set(cx + dx, y0 + y, cz + dz, id);
        }
      }
    }
  };
  return { set, bloc, dome };
};

// Notre-Dame. Sur l'île, tournée vers l'ouest : la façade à deux tours carrées,
// la grande rosace entre elles, la nef et la flèche au-dessus de la croisée.
// Elle a été resserrée : l'île fait seize blocs de long, pas trente.
export function buildNotreDame(poser) {
  const { set, bloc } = boite(poser);
  bloc(-5, 6, 0, 9, -2, 2, PIERRE);
  bloc(-4, 5, 0, 8, -1, 1, BLOCK.AIR);
  for (let x = -4; x <= 5; x++) {
    for (const dz of [-2, 2]) for (let y = 3; y <= 6; y++) if ((x & 1) === 0) set(x, y, dz, VERRE);
  }
  for (let k = 0; k <= 2; k++) {
    for (let x = -5; x <= 6; x++) { set(x, 10 + k, -2 + k, ZINC); set(x, 10 + k, 2 - k, ZINC); }
  }
  // les deux tours de la façade ouest, et la rosace entre elles
  for (const dz of [-2, 2]) {
    bloc(-7, -5, 0, 15, dz, dz, PIERRE);
    for (let y = 11; y <= 14; y += 3) set(-7, y, dz, VERRE);
    bloc(-7, -5, 16, 16, dz, dz, ZINC);
  }
  bloc(-7, -5, 0, 12, -1, 1, PIERRE);
  bloc(-7, -7, 6, 9, -1, 1, VERRE);
  for (let y = 0; y <= 2; y++) set(-7, y, 0, BLOCK.AIR);     // le portail
  for (let k = 0; k <= 9; k++) set(1, 13 + k, 0, k > 6 ? BLOCK.GOLD : ZINC);   // la flèche
}

// Le Sacré-Cœur : blanc, sur sa butte, sa grande coupole et ses deux coupoles
// d'angle. C'est le point le plus haut de la ville : on le voit de partout.
export function buildSacreCoeur(poser) {
  const { set, bloc, dome } = boite(poser);
  bloc(-7, 7, 0, 8, -7, 7, BLANC);
  bloc(-6, 6, 0, 7, -6, 6, BLOCK.AIR);
  for (let x = -6; x <= 6; x += 2) { set(x, 4, -7, VERRE); set(x, 4, 7, VERRE); }
  for (let y = 0; y <= 2; y++) set(0, y, 7, BLOCK.AIR);      // le portail, plein sud
  bloc(-7, 7, 9, 9, -7, 7, BLANC);
  dome(0, 0, 10, 7, BLANC);
  for (let k = 0; k <= 3; k++) set(0, 18 + k, 0, BLANC);
  set(0, 22, 0, BLOCK.GOLD);
  for (const [cx, cz] of [[-5, -5], [-5, 5]]) {
    for (let y = 0; y <= 3; y++) {
      const r = 3 - y;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.hypot(dx, dz) <= r) set(cx + dx, 10 + y, cz + dz, BLANC);
      }
    }
  }
  for (let k = 1; k <= 8; k++) for (let dx = -4; dx <= 4; dx++) set(dx, -k, 7 + k, PAVE);
}

// Le Panthéon : un temple grec surmonté d'une coupole, en haut de la montagne
// Sainte-Geneviève. C'est là que la France met ses grands morts.
export function buildPantheon(poser) {
  const { set, bloc, dome } = boite(poser);
  bloc(-6, 6, 0, 9, -5, 5, BLANC);
  bloc(-5, 5, 0, 8, -4, 4, BLOCK.AIR);
  bloc(-6, 6, 10, 10, -5, 5, BLANC);
  // le portique à colonnes, plein nord
  for (let dx = -5; dx <= 5; dx += 2) for (let y = 0; y <= 8; y++) set(dx, y, -7, BLANC);
  for (let k = 0; k <= 3; k++) for (let dx = -5 + k; dx <= 5 - k; dx++) set(dx, 9 + k, -7, BLANC);
  for (let dz = -7; dz <= -5; dz++) for (let dx = -6; dx <= 6; dx++) set(dx, 9, dz, BLANC);
  // le tambour à colonnes, puis la coupole
  for (let y = 11; y <= 15; y++) {
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
      const h = Math.hypot(dx, dz);
      if (h > 4 || h < 3) continue;
      set(dx, y, dz, (dx + dz) % 2 === 0 ? BLANC : VERRE);
    }
  }
  dome(0, 0, 16, 5, BLANC);
  for (let k = 0; k <= 2; k++) set(0, 21 + k, 0, BLANC);
  set(0, 24, 0, BLOCK.GOLD);
}

// Les Invalides : la longue façade et, derrière, le dôme doré sous lequel
// repose Napoléon. C'est le seul dôme d'or de Paris.
export function buildInvalides(poser) {
  const { set, bloc, dome } = boite(poser);
  bloc(-10, 10, 0, 7, -5, -2, PIERRE);                 // la façade, plein nord
  bloc(-9, 9, 0, 6, -4, -3, BLOCK.AIR);
  for (let dx = -9; dx <= 9; dx += 2) for (let y = 2; y <= 5; y += 3) set(dx, y, -5, VERRE);
  bloc(-10, 10, 8, 8, -5, -2, ZINC);
  // l'église du dôme, au sud
  bloc(-5, 5, 0, 11, 0, 8, PIERRE);
  bloc(-4, 4, 0, 10, 1, 7, BLOCK.AIR);
  for (let dx = -3; dx <= 3; dx += 3) for (let y = 3; y <= 8; y += 3) set(dx, y, 8, VERRE);
  dome(0, 4, 12, 6, BLOCK.GOLD);
  for (let k = 0; k <= 3; k++) set(0, 18 + k, 4, BLOCK.GOLD);
}

// L'Opéra Garnier : large, chargé, sa coupole verte et ses deux groupes dorés
// sur le toit. C'est le bâtiment le plus doré de la ville.
export function buildOpera(poser) {
  const { set, bloc, dome } = boite(poser);
  bloc(-7, 7, 0, 8, -4, 4, PIERRE);
  bloc(-6, 6, 0, 7, -3, 3, BLOCK.AIR);
  for (let dx = -6; dx <= 6; dx += 2) for (let y = 2; y <= 6; y += 2) set(dx, y, -4, VERRE);
  for (let dx = -6; dx <= 6; dx += 3) set(dx, 7, -4, BLOCK.GOLD);   // les bustes de la façade
  bloc(-7, 7, 9, 9, -4, 4, PIERRE);
  dome(0, 1, 10, 5, VERT_DE_GRIS);
  for (let k = 0; k <= 2; k++) set(0, 15 + k, 1, VERT_DE_GRIS);
  set(0, 18, 1, BLOCK.GOLD);
  for (const dx of [-6, 6]) for (let k = 0; k <= 2; k++) set(dx, 10 + k, 0, BLOCK.GOLD);
}

// La tour Montparnasse : deux cents mètres de verre noir au milieu des toits de
// zinc. C'est la tour que les Parisiens n'aiment pas, et qu'on voit de partout.
export function buildMontparnasse(poser) {
  const { set } = boite(poser);
  const H = 34;
  for (let y = 0; y < H; y++) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) !== 3 && Math.abs(dz) !== 2) continue;
        set(dx, y, dz, y % 4 === 0 ? NOIR : VERRE);
      }
    }
  }
  for (let dx = -3; dx <= 3; dx++) for (let dz = -2; dz <= 2; dz++) set(dx, H, dz, NOIR);
  for (let k = 1; k <= 3; k++) set(0, H + k, 0, NOIR);
}

// La colonne de Juillet, au milieu de la place de la Bastille, et son génie
// doré tout en haut. De la prison, il ne reste que le nom.
export function buildColonneBastille(poser) {
  const { set } = boite(poser);
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) set(dx, 0, dz, BLANC);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(dx, 1, dz, BLANC);
  for (let y = 2; y <= 17; y++) set(0, y, 0, VERT_DE_GRIS);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(dx, 18, dz, BLOCK.GOLD);
  set(0, 18, 0, BLOCK.GOLD);
  set(0, 19, 0, BLOCK.GOLD);
}

// Le Moulin Rouge : un moulin rouge, littéralement, avec ses quatre ailes qui
// tournent au-dessus du boulevard de Clichy.
export function buildMoulinRouge(poser) {
  const { set, bloc } = boite(poser);
  bloc(-4, 4, 0, 5, -2, 2, uni(0));
  bloc(-3, 3, 0, 4, -1, 1, BLOCK.AIR);
  for (let dx = -3; dx <= 3; dx += 2) set(dx, 3, -2, BLOCK.GOLD);
  for (let y = 0; y <= 1; y++) set(0, y, -2, BLOCK.AIR);       // la porte
  bloc(-4, 4, 6, 6, -2, 2, uni(18));
  // la tour du moulin et ses quatre ailes
  for (let y = 7; y <= 11; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(dx, y, dz, uni(0));
  for (let k = 1; k <= 4; k++) {
    set(k, 12 + k, 0, BLOCK.GOLD); set(-k, 12 - k, 0, BLOCK.GOLD);
    set(0, 12 + k, k, BLOCK.GOLD); set(0, 12 - k, -k, BLOCK.GOLD);
  }
  set(0, 12, 0, uni(18));
}
