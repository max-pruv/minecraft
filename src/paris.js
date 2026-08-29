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
//
// Restait le tissu. Un plan juste posé sur une prairie n'est pas une ville :
// entre les percées, Paris n'avait littéralement aucun immeuble ordinaire — la
// trame générique en pose un par lot de douze blocs, mais elle écarte tout lot
// voisin d'un repère, et le repère « Caserne & Commissariat » couvre Paris
// entière. Le pâté haussmannien n'a donc jamais été bâti une seule fois.
// Paris se construit maintenant colonne par colonne, comme les quatre autres
// villes, avec ses îlots, ses cours et sa ligne de corniche.

import { BLOCK, CITY_BLOCK, DECOR_START, ARCHI } from './blocks.js';
import { rangerVoies, solDesVoies } from './voies.js';
import { positionDe } from './mondes.js';

const uni = (couleur) => DECOR_START + couleur * 10;

const PAVE = CITY_BLOCK.SIDEWALK;
// La chaussée de Paris est pavée, pas bitumée : des pavés de grès posés en
// éventail, et c'est ce dessin-là qu'on reconnaît au sol sur toutes les photos
// de la ville. L'asphalte uni convenait à n'importe quelle route ; il ne disait
// rien de Paris.
const BITUME = ARCHI.PAVE;
const PIERRE = CITY_BLOCK.HAUSSMANN;
const ZINC = CITY_BLOCK.ZINC;
const QUAI = CITY_BLOCK.GRANITE;
const ARBRE = BLOCK.LEAVES;
const BLANC = uni(27);
const VERT_DE_GRIS = CITY_BLOCK.COPPER;
const NOIR = uni(25);
const VERRE = BLOCK.GLASS;
const COUR = BLOCK.COBBLE;       // les pavés du fond des cours

// Le rayon vient du REGISTRE, il ne se recopie pas. Il était écrit ici en dur
// (`r: 55`) et il masquait celui de `mondes.js` : la ville a triplé dans le
// registre et paris.js a continué de croire à son ancien disque — tout ce qui
// dépassait cinquante-cinq blocs n'était ni bâti ni pavé.
export const PARIS = positionDe('paris');

// L'ÉCHELLE, ET SA REFONTE.
//
// `de(dx, dz)` traduit un écart réel à Notre-Dame, en kilomètres vers l'est et
// vers le sud, en coordonnées locales. C'est la seule chose que le plan
// d'auteur connaisse : chaque lieu de Paris est écrit à sa vraie adresse, en
// kilomètres, et cette fonction décide de tout le reste.
//
// v187 : HUIT blocs par kilomètre deviennent VINGT-QUATRE. Même verdict que
// pour Washington en v162 et pour New York en v186 — à huit blocs par
// kilomètre, un pâté d'immeubles faisait quatre blocs, une rue en faisait un,
// et l'enfant qui descendait dans Paris se cognait le nez dans une façade sans
// jamais voir la rue. Ce n'est pas une carte qu'on veut, c'est une ville où
// l'on marche.
//
// LE PLAN D'AUTEUR NE SE RÉÉCRIT PAS. Il est déjà en kilomètres réels ; ce qui
// restait en blocs de l'ancienne échelle — la courbe de la Seine, les îles, la
// butte, les points de passage des percées, les ponts — se projette par `k()`.
// Les LARGEURS, elles, se redonnent en absolu : une chaussée, un trottoir, un
// pas d'îlot ne triplent pas parce que la carte triple, ils se règlent sur le
// pas d'un enfant. C'est exactement la recette de Manhattan.
const BLOCS_PAR_KM = 24;
// Le facteur de projection de l'ancien plan. Tout ce qui était écrit en blocs
// de v186 passe par là — et par là seulement.
const K = BLOCS_PAR_KM / 8;
const k = (n) => n * K;
const kr = (n) => Math.round(n * K);

const ND = { u: kr(8), v: kr(6) };
const de = (dx, dz) => [
  Math.round(ND.u + dx * BLOCS_PAR_KM),
  Math.round(ND.v + dz * BLOCS_PAR_KM),
];

// L'adresse d'un point de Paris donné en kilomètres réels, en coordonnées du
// MONDE. Les sondes et les témoins visent ainsi un lieu — « quatre cents
// mètres à l'ouest de Notre-Dame » — sans rien savoir de l'échelle du jour :
// c'est ce qui leur permet de survivre à la prochaine remise à l'échelle.
export const adresseParis = (dx, dz) => {
  const [u, v] = de(dx, dz);
  return [PARIS.x + u, PARIS.z + v];
};

// --- la Seine -----------------------------------------------------------------

// Le fleuve entre au sud-est, remonte vers le nord-ouest jusqu'aux îles, longe
// le Louvre, puis redescend vers l'ouest en passant sous la Tour Eiffel. C'est
// ce grand S couché qu'on reconnaît sur un plan, et aucune sinusoïde ne le
// donne : il est relevé point par point.
const SEINE = [
  [-58, 9], [-42, 8], [-32, 5], [-24, 7], [-18, 7], [-10, 6], [-5, 5],
  [3, 6], [8, 6], [15, 7], [24, 9], [32, 12], [44, 16], [58, 21],
].map(([u, v]) => [k(u), k(v)]);

// LE FIL DU FLEUVE, TABULÉ.
//
// `zSeine` parcourait quatorze points de contrôle à chaque appel, et
// `versSeine` l'appelle trois fois (une fois pour lui, deux pour les îles).
// Tant que Paris faisait cent dix blocs de large, personne ne le sentait ; à
// trois cent soixante-dix, le fond de carte s'y arrête — et un geste à deux
// doigts arrivé pendant ce temps-là n'est plus lu comme un geste. C'est
// exactement la panne que le fichier documente déjà pour les listes de lieux.
//
// L'axe du fleuve ne dépend que de u : il se tabule une fois, au bloc près,
// et se lit ensuite par interpolation entre deux cases.
const filBrut = (u) => {
  if (u <= SEINE[0][0]) return SEINE[0][1];
  const dernier = SEINE[SEINE.length - 1];
  if (u >= dernier[0]) return dernier[1];
  for (let i = 0; i < SEINE.length - 1; i++) {
    const [ua, va] = SEINE[i], [ub, vb] = SEINE[i + 1];
    if (u >= ua && u <= ub) return va + (vb - va) * ((u - ua) / (ub - ua));
  }
  return dernier[1];
};
const FIL_DE = Math.floor(SEINE[0][0]) - 2;
const FIL_A = Math.ceil(SEINE[SEINE.length - 1][0]) + 2;
const FIL = new Float32Array(FIL_A - FIL_DE + 1);
for (let i = 0; i < FIL.length; i++) FIL[i] = filBrut(FIL_DE + i);

// L'axe du fleuve, en coordonnées LOCALES.
function filSeine(u) {
  if (u <= FIL_DE) return FIL[0];
  if (u >= FIL_A) return FIL[FIL.length - 1];
  const t = u - FIL_DE, i = t | 0, f = t - i;
  return FIL[i] + (FIL[i + 1] - FIL[i]) * f;
}

export function zSeine(x) {
  return PARIS.z + filSeine(x - PARIS.x);
}

// La Seine fait deux cents mètres de large. À huit blocs par kilomètre c'était
// moins d'un bloc, et on la dessinait cinq fois trop large pour qu'elle se
// voie — au prix d'un lit qui engloutissait le Louvre et la Bastille, d'où
// toutes les corrections de rive plus bas. À vingt-quatre, deux cents mètres
// font cinq blocs : le fleuve peut enfin être dessiné À SA VRAIE LARGEUR, et
// c'est la première chose que la nouvelle échelle rend gratuitement.
// Il s'élargit encore autour des îles, comme dans la réalité.
const LARGEUR_SEINE = 4;
// La berge basse en pierre, puis la voie sur berge : cinq blocs en tout, soit
// cent vingt mètres. C'est large — les quais de Seine en font trente — mais
// c'est la promenade la plus fréquentée de la ville, et un enfant doit
// pouvoir y courir.
const QUAI_BAS = 2.2;
const QUAI_HAUT = 5.5;
// `CITE` est déclarée plus bas — la portée se calcule donc au premier appel,
// une seule fois, plutôt que d'imposer un ordre de déclaration au fichier.
let porteeCite = 0;
function largeurSeine(u) {
  if (!porteeCite) porteeCite = CITE.long + k(2);
  const d = Math.abs(u - CITE.u);
  return d >= porteeCite ? LARGEUR_SEINE
    : LARGEUR_SEINE + (11 - LARGEUR_SEINE) * (1 - d / porteeCite);
}
// L'axe du fleuve en coordonnées locales : ce dont les adresses ont besoin
// pour savoir de quel côté elles tombent.
const vSeine = filSeine;

// Les deux îles. La Cité d'abord — c'est là qu'est née la ville, et là qu'est
// Notre-Dame ; Saint-Louis juste en amont, plus petite. Elles sont plus larges
// que nature : une île de trois blocs ne porterait pas une cathédrale.
// L'île de la Cité fait un kilomètre de long sur trois cents mètres : à la
// nouvelle échelle, elle les fait pour de vrai. Saint-Louis, en amont, est
// plus petite — sept cents mètres sur deux cents.
export const CITE = { u: ND.u, long: 12, large: 5 };
const SAINT_LOUIS = { u: ND.u + 21, long: 8, large: 3 };
// Le centre de l'île, là où se pose Notre-Dame. On le calcule plutôt que de le
// recopier : la courbe du fleuve déplace l'île avec elle.
export const zCite = () => Math.round(zSeine(PARIS.x + CITE.u));

// `du` est l'écart en u au centre de l'île, `dv` l'écart au fil du fleuve :
// les deux sont déjà calculés par l'appelant, on ne les recalcule pas.
const dansUneIle = (du, dv, ile) => {
  if (du > ile.long || du < -ile.long) return false;
  const e = ile.large * Math.sqrt(1 - (du / ile.long) * (du / ile.long));
  return Math.abs(dv) <= e;
};
export const surLIle = (x, z) => {
  const u = x - PARIS.x, dv = z - PARIS.z - filSeine(u);
  return dansUneIle(u - CITE.u, dv, CITE) || dansUneIle(u - SAINT_LOUIS.u, dv, SAINT_LOUIS);
};

// Distance au fleuve, négative sur l'eau. Les îles n'en font pas partie.
export function versSeine(x, z) {
  const u = x - PARIS.x, v = z - PARIS.z;
  const portee = PARIS.r + 6;
  if (u * u + v * v > portee * portee) return 99;
  const dv = v - filSeine(u);
  if (dansUneIle(u - CITE.u, dv, CITE) || dansUneIle(u - SAINT_LOUIS.u, dv, SAINT_LOUIS)) return 3;
  return Math.abs(dv) - largeurSeine(u);
}

// --- le terrain ----------------------------------------------------------------

// La butte Montmartre : la seule vraie colline de Paris, celle qui porte le
// Sacré-Cœur et d'où l'on voit toute la ville.
export const BUTTE = { u: de(-1.6, -3.5)[0], v: de(-1.6, -3.5)[1], r: 30 };

export function hauteurParis(x, z, h, base) {
  const d = versSeine(x, z);
  // Le lit doit descendre SOUS le niveau de l'eau, sinon la Seine n'est qu'un
  // fossé sec : c'est le remplissage général du monde qui la met en eau.
  if (d < 0) return Math.min(h, base - 6);
  if (d < QUAI_BAS) return base - 1;                 // le quai bas, au ras de l'eau
  const bd = Math.hypot(x - (PARIS.x + BUTTE.u), z - (PARIS.z + BUTTE.v));
  if (bd < BUTTE.r) {
    const m = Math.cos((bd / BUTTE.r) * Math.PI * 0.5);
    return h + Math.round(m * m * 20);               // la butte
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
  // Les rayons de places et de jardins ne se PROJETTENT pas, ils se
  // RELÈVENT. Multipliés par trois comme le reste du plan, ils auraient gardé
  // leur taille réelle d'avant — et cette taille était fausse : la place de
  // l'Étoile faisait cinq cent soixante mètres de rayon, quatre fois la vraie,
  // et ses douze avenues cent soixante-dix mètres de large. À huit blocs par
  // kilomètre cela ne se voyait pas ; à vingt-quatre, l'Étoile mangeait tout
  // l'ouest de Paris. Chaque valeur ci-dessous est donc redonnée en blocs
  // neufs, mesurée sur le vrai plan — un bloc vaut quarante-deux mètres.
  let v = v0;
  if (reste.rive) {
    const bord = largeurSeine(u) + k(2.5);
    v = reste.rive === 'd'
      ? Math.min(v, Math.round(vSeine(u) - bord))
      : Math.max(v, Math.round(vSeine(u) + bord));
  }
  return { nom, u, v, ...reste };
};

// `sol` : ce que la place pose au sol. `r` : son rayon.
export const LIEUX = [
  L('Notre-Dame', 0, 0),
  L("Hôtel de Ville", 0.2, -0.35, { discret: true, rive: 'd', r: 2.2, sol: PAVE }),
  L('Châtelet', -0.2, -0.45, { discret: true, rive: 'd', r: 2, sol: PAVE }),
  L('Louvre', -1.6, -0.6, { rive: 'd', r: 5, sol: PAVE, socle: [5, 5] }),
  L('Tuileries', -2.3, -0.75, { rive: 'd', ru: 11, rv: 3.6, jardin: true }),
  L('Concorde', -3.2, -0.9, { r: 4.5, sol: PAVE }),
  L('Madeleine', -2.9, -1.4, { discret: true, r: 1.6, sol: PAVE }),
  L('Opéra', -2.2, -1.7, { r: 2.2, sol: PAVE, socle: [7, 6] }),
  L('Arc de Triomphe', -5.4, -1.6, { r: 8, sol: PAVE, socle: [10, 8] }),
  L('Trocadéro', -4.7, -0.6, { rive: 'd', r: 3.5, sol: PAVE }),
  L('Tour Eiffel', -4.4, 0.5, { rive: 'g', r: 3, sol: PAVE, socle: [9, 9] }),
  L('Champ-de-Mars', -4.35, 0.95, { rive: 'g', ru: 3, rv: 10, jardin: true }),
  L('Invalides', -3.3, 0.6, { rive: 'g', ru: 4, rv: 6, jardin: true, socle: [10, 9] }),
  L('Montparnasse', -1.7, 1.9, { r: 2.2, sol: PAVE, socle: [3, 2] }),
  L('Luxembourg', -0.6, 1.1, { rive: 'g', ru: 6, rv: 4.2, jardin: true }),
  L('Panthéon', 0.1, 0.9, { rive: 'g', r: 2.2, sol: PAVE, socle: [6, 7] }),
  L('Bastille', 1.5, -0.2, { rive: 'd', r: 3, sol: PAVE, socle: [2, 2] }),
  L('Place des Vosges', 0.9, -0.3, { discret: true, rive: 'd', ru: 1.8, rv: 1.8, jardin: true }),
  L('République', 0.9, -1.5, { r: 3, sol: PAVE }),
  L('Nation', 3.0, 0.5, { rive: 'd', r: 2.6, sol: PAVE }),
  L('Père-Lachaise', 3.3, -0.6, { ru: 8.5, rv: 7, jardin: true }),
  L('Buttes-Chaumont', 2.8, -2.8, { ru: 7, rv: 5.5, jardin: true }),
  L('Sacré-Cœur', -1.6, -3.5, { r: 2.5, sol: PAVE, socle: [8, 15] }),
  L('Moulin Rouge', -2.1, -3.1, { r: 1.2, sol: PAVE, socle: [4, 4] }),
  L('Gare du Nord', -0.5, -2.4, { discret: true, r: 2.5, sol: PAVE }),
  L('Gare de Lyon', 2.0, 0.0, { discret: true, rive: 'd', r: 2.5, sol: PAVE }),
  // Les deux bois sont les poumons de Paris et se voient du ciel avant tout le
  // reste. Ils débordent l'un et l'autre le disque de la ville : on les montre
  // aux deux tiers de leur étendue vraie plutôt que de les couper en deux.
  L('Bois de Boulogne', -7.0, -0.2, { rive: 'd', ru: 30, rv: 19, jardin: true }),
  L('Bois de Vincennes', 5.0, 0.7, { rive: 'd', ru: 30, rv: 22, jardin: true }),
];

const lieu = (nom) => LIEUX.find((p) => p.nom === nom);

// Les trois sous-listes que `solParis` consulte à chaque colonne. Elles sont
// préparées une fois : la carte appelle `solParis` une fois par pixel, et
// parcourir vingt-huit lieux trois fois par pixel se payait comptant — le fond
// de carte est passé de 95 à 139 ms, et un geste à deux doigts arrivé pendant
// ce temps-là n'était plus lu comme un geste.
// LA LISTE CHAUDE, ET POURQUOI ELLE EST RECOPIÉE À PLAT.
//
// `solParis` la parcourt à chaque colonne du monde ET à chaque pixel du fond
// de carte. Les lieux de `LIEUX` n'ont pas tous la même forme — l'un porte
// `jardin` et `ru`, l'autre `r` et `sol`, un troisième un `socle` —, et une
// boucle qui lit des propriétés sur des objets de formes différentes est ce
// que V8 appelle mégamorphique : il perd le cache et refait la recherche à
// chaque accès. On recopie donc une fiche PLATE, identique pour tous, avec
// les inverses des demi-axes déjà calculés — l'ellipse se teste alors sans
// une seule division.
const PLACES = LIEUX.filter((p) => p.jardin || p.r).map((p) => ({
  u: p.u, v: p.v,
  jardin: !!p.jardin,
  ru: p.ru || 0, rv: p.rv || 0,
  iru: p.ru ? 1 / (p.ru * p.ru) : 0, irv: p.rv ? 1 / (p.rv * p.rv) : 0,
  r: p.r || 0, sol: p.sol || 0,
}));
const SOCLES = LIEUX.filter((p) => p.socle)
  .map((p) => ({ u: p.u, v: p.v, bu: p.socle[0] + 1, bv: p.socle[1] + 1 }));
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
// Un point de passage écrit dans l'ancienne unité du plan : il se projette,
// comme la courbe du fleuve. Les points nommés, eux, sortent déjà de `de()`.
const pk = (u, v) => [k(u), k(v)];

// La largeur des percées, redonnée en ABSOLU.
//
// `l` restait la hiérarchie voulue par Haussmann — la Rivoli plus large qu'une
// rue de quartier — mais il était écrit en blocs de l'ancienne échelle, où le
// plus large des boulevards faisait deux blocs de chaussée. Un boulevard de
// deux blocs entre des immeubles de sept, c'est une tranchée, pas un
// boulevard : à Paris la rue est aussi large que les façades sont hautes, et
// c'est précisément ce rapport-là qu'on reconnaît. On multiplie donc la
// hiérarchie par une largeur d'avenue, et le trottoir suit.
const AVENUE = 2.6;
const a = (l) => l * AVENUE;
const TROTTOIR_AV = 1.4;

const VOIES = [
  // rive droite
  { nom: 'Rue de Rivoli', l: a(1.1), t: TROTTOIR_AV, pts: [pt('Concorde'), pt('Tuileries'), pt('Louvre'), pt("Hôtel de Ville"), pt('Bastille')] },
  { nom: 'Grands Boulevards', l: a(1.0), t: TROTTOIR_AV, pts: [pt('Madeleine'), pt('Opéra'), pk(-2, -9), pt('République'), pk(20, -1), pt('Bastille')] },
  { nom: "Avenue de l'Opéra", l: a(0.8), t: TROTTOIR_AV, pts: [pk(-7, 0), pt('Opéra')] },
  { nom: 'Boulevard de Sébastopol', l: a(0.9), t: TROTTOIR_AV, pts: [pt('Châtelet'), pk(5, -6), pk(4, -14)] },
  { nom: 'Boulevard de Magenta', l: a(0.8), t: TROTTOIR_AV, pts: [pt('République'), pt('Gare du Nord')] },
  { nom: 'Rue La Fayette', l: a(0.8), t: TROTTOIR_AV, pts: [pt('Gare du Nord'), pk(-4, -11), pt('Opéra')] },
  { nom: 'Boulevard de Clichy', l: a(0.8), t: TROTTOIR_AV, pts: [pk(-17, -19), pt('Moulin Rouge'), pk(-2, -19)] },
  { nom: 'Boulevard Voltaire', l: a(0.9), t: TROTTOIR_AV, pts: [pt('République'), pt('Nation')] },
  { nom: 'Faubourg Saint-Antoine', l: a(0.8), t: TROTTOIR_AV, pts: [pt('Bastille'), pt('Nation')] },
  { nom: 'Rue de Belleville', l: a(0.8), t: TROTTOIR_AV, pts: [pt('République'), pt('Buttes-Chaumont')] },
  { nom: 'Avenue de la Grande Armée', l: a(1.0), t: TROTTOIR_AV, pts: [pt('Arc de Triomphe'), pk(-46, -9)] },
  // rive gauche
  { nom: 'Boulevard Saint-Germain', l: a(1.0), t: TROTTOIR_AV, pts: [pk(-18, 11), pk(-12, 13), pk(-2, 14), pk(8, 13), pk(15, 11), pk(18, 10)] },
  { nom: 'Boulevard Saint-Michel', l: a(0.9), t: TROTTOIR_AV, pts: [pk(6, 11), pt('Luxembourg'), pk(1, 22), pk(-1, 27)] },
  { nom: 'Rue de Rennes', l: a(0.8), t: TROTTOIR_AV, pts: [pt('Montparnasse'), pk(-3, 13)] },
  { nom: 'Boulevard du Montparnasse', l: a(0.9), t: TROTTOIR_AV, pts: [pk(-18, 19), pt('Montparnasse'), pk(4, 23)] },
  { nom: 'Boulevard Raspail', l: a(0.7), t: TROTTOIR_AV, pts: [pk(-4, 12), pk(-7, 20), pk(-8, 26)] },
  { nom: 'Avenue des Gobelins', l: a(0.7), t: TROTTOIR_AV, pts: [pk(10, 15), pk(14, 25)] },
  { nom: "Avenue de la Motte-Picquet", l: a(0.7), t: TROTTOIR_AV, pts: [pt('Tour Eiffel'), pt('Invalides')] },
];

const BANDES = rangerVoies(VOIES);

// Les ponts. Ils sont donnés par leur abscisse, comme sur un plan : c'est la
// seule chose qui compte pour savoir où l'on traverse.
const PONTS = [-28, -22, -19, -10, 3, 11, 17, 22, 30].map(kr);
// La largeur d'un pont, en absolu : deux voies et deux trottoirs. À l'ancienne
// échelle un pont faisait trois blocs de large et on le manquait en marchant.
const DEMI_PONT = 2.5;

// --- le tissu : les îlots, les cours et le gabarit -------------------------------
//
// Le fleuve, les places et les percées étaient au bon endroit ; entre elles, la
// ville restait un lotissement — des immeubles carrés isolés, posés tous les
// douze blocs sur une grille unique, avec du vide autour de chacun. Or de près,
// un plan de Paris c'est exactement le contraire :
//
//   · des rues qui ne sont pas parallèles, parce qu'elles sont bien plus
//     vieilles que la règle et le compas ;
//   · des immeubles mitoyens, joints les uns aux autres, qui font le mur
//     continu d'une rue au lieu de pavillons entourés de vide ;
//   · au milieu de chaque îlot, une cour ;
//   · aux carrefours, des pans coupés ;
//   · et par-dessus tout une ligne de corniche : la hauteur est celle de
//     l'ÎLOT, pas de la maison. C'est de là que vient le fameux ciel de Paris,
//     ces toits qui s'alignent sur des kilomètres, seuls les monuments
//     dépassant.
//
// Chaque quartier a donc sa trame — son angle, son pas — et son *désordre* :
// l'amplitude du gauchissement appliqué à sa grille. À zéro, c'est l'ouest
// d'Haussmann tiré au cordeau. À 1,7, ce sont les ruelles de Montmartre. C'est
// ce seul nombre qui sépare la ville planifiée de la ville héritée, et l'écart
// entre les deux est ce qu'on lit d'abord sur un plan de Paris.
//
// `cour` est la part de l'îlot laissée ouverte en son milieu. C'est une part et
// non une profondeur en blocs : à profondeur bâtie fixe, élargir un îlot
// n'élargissait que sa cour, et la ville perdait en densité tout ce qu'elle
// gagnait en grandeur. À zéro — le Marais, le Quartier latin, Montmartre — les
// îlots sont pleins, ce qui est juste : on n'y perçait pas de cour, on y
// bâtissait jusqu'au fond. À 0,32 on obtient le puits de lumière de l'immeuble
// haussmannien ; à 0,38, la cour du faubourg Saint-Germain, où les hôtels sont
// « entre cour et jardin ».

// Un quartier, à son écart réel à Notre-Dame. `rive` le repousse hors du lit du
// fleuve, exactement comme pour un lieu, et pour la même raison : la Seine est
// dessinée trois fois trop large, et le Marais — trois cents mètres au nord de
// Notre-Dame — se retrouvait au milieu de l'eau. Sans cette correction, les
// quartiers hérités n'existaient tout simplement pas : le vieux Paris était
// sous la Seine, et il ne restait à voir que l'ouest d'Haussmann.
const Q = (nom, dx, dz, r0, t) => {
  const [u, v0] = de(dx, dz);
  const r = k(r0);          // le rayon du quartier suit la carte
  let v = v0;
  if (t.rive) {
    const bord = largeurSeine(u) + k(4);
    v = t.rive === 'd'
      ? Math.min(v, Math.round(vSeine(u) - bord))
      : Math.max(v, Math.round(vSeine(u) + bord));
  }
  return { nom, u, v, r, r2: r * r, ...t };
};

// LE PAS DES ÎLOTS SE REDONNE EN ABSOLU, et c'est la décision qui fait la
// ville. Un îlot parisien fait cent mètres : à vingt-quatre blocs par
// kilomètre, deux blocs et demi — de quoi poser une façade, et rien derrière.
// On l'élargit donc, exactement comme Washington a élargi les siens d'un
// facteur 1,7 pour que chaque maison ait un étage et un escalier. C'est
// l'entorse assumée de cette ville : l'îlot haussmannien fait ici douze
// blocs, soit cinq cents mètres, quatre fois sa taille vraie.
//
// Ce qu'on achète avec : une chaussée de trois blocs, deux trottoirs, et
// deux bandes de bâti de trois blocs de profondeur autour d'une cour. Un
// enfant peut traverser la rue, entrer dans la cour, voir le ciel entre les
// corniches. C'est ce qui n'existait pas.
// LA RUE APPARTIENT AU QUARTIER, ET C'EST NEUF.
//
// Jusqu'ici, toutes les rues de Paris avaient la même largeur : une seule
// paire de nombres pour la ville entière. À huit blocs par kilomètre cela ne
// se voyait pas — tout faisait un bloc. À vingt-quatre, cela se voit
// immédiatement, et c'est faux : une venelle du Marais fait cinq mètres, une
// avenue de Monceau en fait trente. Chaque quartier porte donc sa `rue`
// (demi-largeur de la chaussée) et sa `face` (où commence la façade, un
// trottoir plus loin), au même titre que son angle et son pas.
//
// L'ENTORSE, DÉCLARÉE. Un îlot parisien fait cent mètres ; ici le plus grand
// en fait dix-sept blocs, soit sept cents. C'est le même arbitrage que
// Washington, qui a élargi les siens de 1,7 pour qu'une maison ait un
// escalier, et il est inévitable : à l'échelle du sol une rue de vingt mètres
// tient dans un bloc, et une ville dont les rues font un bloc est une ville
// où l'on ne marche pas. On choisit donc la rue praticable, et l'îlot suit.
const QUARTIERS = [
  // le tissu hérité : ruelles tordues, îlots serrés, pas de cour
  Q('Marais', 0.9, -0.35, 8, { rive: 'd', ang: 0.30, pas: 10, rue: 0.7, face: 1.4, cour: 0, etages: 5, desordre: 3.2 }),
  Q('Quartier latin', 0.15, 0.85, 8, { rive: 'g', ang: -0.24, pas: 9.5, rue: 0.7, face: 1.4, cour: 0, etages: 5, desordre: 3.6 }),
  Q('Montmartre', -1.6, -3.4, 7, { ang: 0.5, pas: 9, rue: 0.6, face: 1.3, cour: 0, etages: 3, desordre: 4.4 }),
  Q('Belleville', 2.7, -1.6, 9, { rive: 'd', ang: -0.38, pas: 12, rue: 0.9, face: 1.7, cour: 0, etages: 4, desordre: 3.4 }),
  Q('Faubourg Saint-Antoine', 2.3, 0.25, 8, { rive: 'd', ang: 0.12, pas: 14, rue: 1.0, face: 1.8, cour: 0.22, etages: 5, desordre: 2.1 }),
  // et le tissu voulu : de grands îlots réguliers, chacun sa cour
  Q('Saint-Germain', -1.7, 0.8, 8, { rive: 'g', ang: 0.06, pas: 15, rue: 1.0, face: 1.9, cour: 0.42, etages: 5, desordre: 0.9 }),
  Q('Monceau', -3.2, -2.2, 9, { ang: -0.2, pas: 16, rue: 1.2, face: 2.1, cour: 0.38, etages: 6, desordre: 0.25 }),
  Q('Étoile', -5.3, -1.4, 11, { ang: 0, pas: 17, rue: 1.2, face: 2.2, cour: 0.38, etages: 6, desordre: 0 }),
  Q('Passy', -6.2, 0.35, 9, { ang: 0.33, pas: 16, rue: 1.2, face: 2.1, cour: 0.38, etages: 6, desordre: 0.3 }),
];

// Partout ailleurs : la ville d'Haussmann ordinaire, un peu moins réglée que
// l'ouest, un peu moins tordue que le Marais.
const HAUSSMANN = { nom: 'Haussmann', ang: 0.09, pas: 15, rue: 1.0, face: 1.9, cour: 0.38, etages: 6, desordre: 1.3 };

function trameDeParis(u, v) {
  let q = HAUSSMANN, meilleur = Infinity;
  for (const c of QUARTIERS) {
    const du = u - c.u, dv = v - c.v, d = du * du + dv * dv;
    if (d < c.r2 && d < meilleur) { meilleur = d; q = c; }
  }
  return q;
}

// La maille du quartier : on tourne dans son angle, puis on gauchit avec deux
// ondes de basse fréquence. Une grille droite gauchie, c'est une ville qui a
// poussé toute seule — et cela ne coûte que quatre sinus par colonne.
function formeParis(u, v) {
  const t = trameDeParis(u, v);
  const c = Math.cos(t.ang), s = Math.sin(t.ang);
  let p = u * c - v * s, q = u * s + v * c;
  // Le gauchissement travaille en blocs : son amplitude est déjà donnée à la
  // nouvelle échelle, mais ses LONGUEURS D'ONDE, elles, étaient réglées sur
  // l'ancienne. Sans les allonger, la même onde se replierait trois fois plus
  // souvent et les ruelles du Marais deviendraient des zigzags de dents de
  // scie — du désordre au mètre, pas au quartier.
  const d = t.desordre;
  if (d) {
    p += Math.sin(q * (0.23 / K) + 1.7) * d + Math.sin(q * (0.081 / K) + 0.3) * d * 1.7;
    q += Math.sin(p * (0.19 / K) + 0.9) * d + Math.cos(p * (0.063 / K)) * d * 1.7;
  }
  const ai = Math.round(p / t.pas), bi = Math.round(q / t.pas);
  const ep = Math.abs(p - ai * t.pas), eq = Math.abs(q - bi * t.pas);
  // le fond de l'îlot : au-delà commence la cour
  const fond = t.face + (t.pas / 2 - t.face) * (1 - t.cour);
  return { t, ai, bi, ep, eq, fond, d: Math.min(ep, eq) };
}

function tirageParis(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// --- le sol ------------------------------------------------------------------------

// Ce qu'il faut poser au sol, ou null si la trame ordinaire de la ville doit
// reprendre la main.
export function solParis(x, z) {
  const u = x - PARIS.x, v = z - PARIS.z;
  // Le rejet le plus fréquent, et donc le plus pressé : un carré avant un
  // cercle, et un carré avant une racine.
  if (u > PARIS.r || u < -PARIS.r || v > PARIS.r || v < -PARIS.r) return null;
  if (u * u + v * v > PARIS.r * PARIS.r) return null;

  const d = versSeine(x, z);
  if (d < 0) {
    // Les ponts passent par-dessus l'eau : sans eux, les deux rives ne se
    // rejoignaient qu'en nageant.
    for (const pu of PONTS) if (Math.abs(u - pu) <= DEMI_PONT) return PAVE;
    return BLOCK.WATER;
  }
  // Les quais. En bas, la pierre au ras de l'eau ; au-dessus, la voie qui longe
  // le fleuve d'un bout à l'autre de la ville. Cette bande haute restait en
  // herbe : on ne bâtit pas à quatre blocs de la Seine — c'est la règle qui
  // empêche un immeuble d'avoir les pieds dans l'eau — mais rien ne venait
  // remplir ce qu'elle interdisait, et Paris avait des berges en prairie.
  // Les quais, en ABSOLU. Ils étaient donnés en blocs de l'ancienne échelle :
  // triplés, ils auraient fait trois cents mètres de berge de chaque côté du
  // fleuve, une esplanade là où Paris a un trottoir et une voie sur berge.
  if (d < QUAI_BAS) return QUAI;
  if (d < QUAI_HAUT) return d < QUAI_BAS + 1.2 ? PAVE : BITUME;

  // Les places et les jardins passent avant les rues : une avenue ne traverse
  // pas le Luxembourg.
  //
  // CETTE BOUCLE COÛTAIT LES DEUX TIERS DU TEMPS DE `solParis`, et donc les
  // deux tiers du fond de carte. Deux raisons : les ellipses des jardins
  // étaient éprouvées sans rejet préalable — le bois de Boulogne fait
  // soixante blocs de large, sa boîte en écarte pourtant l'immense majorité
  // des colonnes en deux comparaisons —, et les divisions se refaisaient à
  // chaque appel alors que les rayons ne changent jamais. Une ville trois fois
  // plus large appelle neuf fois plus de colonnes : ce qui passait inaperçu à
  // huit blocs par kilomètre rendait la carte poisseuse à vingt-quatre.
  for (const p of PLACES) {
    const du = u - p.u, dv = v - p.v;
    if (p.jardin) {
      if (du > p.ru || du < -p.ru || dv > p.rv || dv < -p.rv) continue;
      if (du * du * p.iru + dv * dv * p.irv < 1) {
        // une allée en croix, et des arbres en bordure
        if (du < 0.6 && du > -0.6) return PAVE;
        if (dv < 0.6 && dv > -0.6) return PAVE;
        // Les arbres du jardin, sur une maille de quatre : assez pour faire
        // une frondaison vue du ciel, assez peu pour qu'on marche dessous.
        return (((Math.round(u) % 4) + 4) % 4) === 0 && (((Math.round(v) % 4) + 4) % 4) === 0
          ? ARBRE : BLOCK.GRASS;
      }
      continue;
    }
    if (!p.r) continue;
    if (du > p.r || du < -p.r || dv > p.r || dv < -p.r) continue;
    const dp = Math.sqrt(du * du + dv * dv);
    if (dp < p.r) return dp > p.r - 1 ? BITUME : p.sol;
  }

  // La place de l'Étoile et ses douze avenues rayonnantes : la figure la plus
  // reconnaissable du plan de Paris — une étoile, littéralement.
  const eu = u - ETOILE.u, ev = v - ETOILE.v;
  const de2 = (eu > 42 || eu < -42 || ev > 42 || ev < -42) ? 99 : Math.sqrt(eu * eu + ev * ev);
  if (de2 < 42) {
    const ang = Math.atan2(v - ETOILE.v, u - ETOILE.u);
    const secteur = ang / (Math.PI * 2 / 12);
    // La demi-largeur de l'avenue est donnée en ABSOLU : une avenue de
    // l'Étoile fait quarante mètres, et elle doit se voir comme un rayon
    // franc jusqu'au bout, pas comme un fil qui s'épaissit avec la distance.
    const ecart = Math.abs(secteur - Math.round(secteur)) * de2 * (Math.PI * 2 / 12);
    if (ecart < 1.5) return BITUME;
    if (ecart < 2.4) return PAVE;
  }

  // Les Champs-Élysées : de l'Étoile à la Concorde, larges et plantés d'arbres.
  // Les Champs-Élysées font soixante-dix mètres de large et sont plantés de
  // quatre rangées de marronniers : c'est la plus large avenue de Paris, et
  // c'est cette largeur-là qu'on reconnaît. En absolu, donc — six blocs de
  // chaussée, un trottoir, puis les arbres.
  const t = (u - ETOILE.u) / (CONCORDE.u - ETOILE.u);
  if (t >= 0 && t <= 1) {
    const axe = ETOILE.v + (CONCORDE.v - ETOILE.v) * t;
    const dv = Math.abs(v - axe);
    if (dv <= 2) return BITUME;
    if (dv <= 3.2) return PAVE;
    // Un marronnier sur trois : depuis que l'arbre est un VRAI arbre (un fût
    // et une couronne, cf. world.js), une colonne sur deux faisait une haie
    // pleine de cinq blocs de haut qui bouchait l'avenue. On les espace.
    if (dv <= 4.4) return (((Math.round(u) % 3) + 3) % 3) === 0 ? ARBRE : PAVE;
  }

  const percee = solDesVoies(BANDES, u, v, BITUME, PAVE);
  if (percee !== null) return percee;

  // Le parvis et son square. Un monument occupe jusqu'à vingt blocs, la place
  // déclarée avec lui n'en faisait que deux ou trois : tout autour, l'herbe
  // repoussait au pied de la Tour Eiffel et sur le parvis du Sacré-Cœur. Le
  // socle est donc dallé en son cœur, et planté sur son pourtour — le parvis,
  // puis le square. C'est ainsi que sont posés les monuments de Paris : jamais
  // à même la rue, jamais au milieu d'un pré.
  const socle = socleDe(u, v);
  if (socle !== null) {
    if (socle < 0.55) return PAVE;
    return ((Math.round(u) * 3 + Math.round(v) * 5) % 7) === 0 ? ARBRE : BLOCK.GRASS;
  }

  // Et enfin la trame ordinaire du quartier : ses rues, ses pans coupés et le
  // cœur de ses îlots.
  const f = formeParis(u, v);
  if (f.d < f.t.rue) return BITUME;
  // La bordure de granit : le trait clair qui sépare la chaussée du trottoir.
  // Un détail d'un seul bloc, et c'est pourtant lui qui fait qu'une rue se lit
  // comme une rue plutôt que comme deux aplats côte à côte.
  if (f.d < f.t.rue + 0.35) return ARCHI.BORDURE;
  if (f.d < f.t.face) return PAVE;

  // Le pan coupé. À l'angle de deux rues, l'immeuble est tranché en biais et le
  // trottoir s'élargit d'autant : c'est la signature des carrefours parisiens,
  // et la raison pour laquelle un croisement à Paris n'est jamais un angle droit
  // franc. Il n'y en a pas dans les quartiers médiévaux, qui l'ignoraient.
  if (f.t.desordre < k(1) && f.ep + f.eq < f.t.face * 2 + 1.6) return PAVE;

  // La cour intérieure : pavée, avec parfois un arbre. Elle n'existe que si
  // l'îlot est plus large que deux fois son bâti — ailleurs, il est plein.
  if (f.d >= f.fond) {
    return ((Math.round(u) * 5 + Math.round(v) * 3) % 11) === 0 ? ARBRE : COUR;
  }
  return null;
}

// Un lot est-il bâtissable ? Non sur l'eau, les quais, les percées, les places
// et les cours — sinon un immeuble se retrouverait les pieds dans la Seine, ou
// bouché la cour qu'il est censé entourer.
export function lotParisLibre(x, z) {
  const u = x - PARIS.x, v = z - PARIS.z;
  if (u * u + v * v > PARIS.r * PARIS.r) return false;
  if (versSeine(x, z) < QUAI_HAUT) return false;
  if (surUnSocle(x - PARIS.x, z - PARIS.z)) return false;
  return solParis(x, z) === null;
}

// Le socle d'un monument : son emprise au sol, relevée sur son bâtisseur et non
// estimée au jugé. Deux choses en dépendent, d'où le nombre unique : rien
// d'ordinaire ne se bâtit dessus — sans quoi la ville venait pousser dans le
// pied de la Tour Eiffel — et `world.js` en fait la boîte du repère, celle qui
// dit aux morceaux de monde voisins de le dessiner. Recopiés séparément, les
// deux avaient déjà divergé : l'escalier du Sacré-Cœur descend à quinze blocs
// et sa boîte en annonçait douze — il était donc tranché de loin.
const V_CITE = zCite() - PARIS.z;

function socleDe(u, v) {
  for (const p of SOCLES) {
    const au = u > p.u ? u - p.u : p.u - u;
    if (au > p.bu) continue;
    const av = v > p.v ? v - p.v : p.v - v;
    if (av > p.bv) continue;
    const du = au / p.bu, dv = av / p.bv;
    return du > dv ? du : dv;
  }
  // Notre-Dame, elle, se place sur l'île et non à son adresse de la liste.
  const du = Math.abs(u - CITE.u) / 12, dv = Math.abs(v - V_CITE) / 5;
  const dn = du > dv ? du : dv;
  return dn <= 1 ? dn : null;
}
const surUnSocle = (u, v) => socleDe(u, v) !== null;

// --- l'immeuble haussmannien ------------------------------------------------------
//
// Une colonne, une décision — comme à Manhattan, à San Francisco, à Nice et à
// Lille. Ce qu'elle doit rendre : le rez-de-chaussée commerçant plus ouvert que
// le reste, les travées de fenêtres alignées à la verticale, les balcons
// continus du deuxième et du dernier étage, la corniche de pierre blanche, et
// le toit de zinc à deux pentes percé de lucarnes, avec ses souches de cheminée
// en terre cuite.

export function batirColonneParis(x, z, poser) {
  const u = x - PARIS.x, v = z - PARIS.z;
  const f = formeParis(u, v);
  const t = f.t;
  const r = tirageParis(f.ai, f.bi, 611);

  // Le gabarit. La hauteur est tirée une fois par ÎLOT — tous les immeubles
  // d'un même pâté montent donc exactement à la même corniche, et c'est
  // précisément ce qui fait le ciel de Paris. Un tirage par colonne aurait
  // donné une dentelure : joli nulle part, faux ici.
  const bh = t.etages + (r > 0.72 ? 1 : 0);

  const oE = lotParisLibre(x + 1, z), oO = lotParisLibre(x - 1, z);
  const oS = lotParisLibre(x, z + 1), oN = lotParisLibre(x, z - 1);
  const dedans = oE && oO && oS && oN;
  // La travée : on compte le long de la façade, pas en travers, pour que les
  // fenêtres d'un même immeuble s'alignent à la verticale.
  const face = (!oE || !oO) ? v : u;

  // Le coin de l'immeuble : il est en façade dans les DEUX directions. C'est
  // là que se pose le chaînage d'angle, ces grands blocs de pierre alternés
  // sans lesquels un immeuble a l'air d'une boîte posée sur le trottoir.
  const angle = (!oE || !oO) && (!oS || !oN);

  if (dedans) {
    // Le cœur de l'îlot bâti : un plancher, et rien de plus. Les immeubles sont
    // des coques, comme partout ailleurs dans le jeu.
    poser(1, BLOCK.PLANK);
  } else {
    // LA FAÇADE HAUSSMANNIENNE, REGISTRE PAR REGISTRE.
    //
    // Ce n'est pas une invention : c'est la règle écrite du Second Empire, et
    // elle se lit de bas en haut. Rez-de-chaussée commerçant à haut plafond,
    // entresol bas, ÉTAGE NOBLE au deuxième avec son balcon filant, des étages
    // courants, un second balcon filant au dernier, la corniche, puis le
    // comble. Six niveaux, jamais plus.
    //
    // Avant, chacun de ces registres était un cube uni — pierre crème ou verre
    // plein. Une fenêtre était donc un bloc de verre d'un mètre de côté. C'est
    // ce qui faisait grossier, et aucune forme n'y pouvait rien : le défaut
    // n'était pas dans le volume, il était dans la surface.
    for (let y = 1; y <= bh; y++) {
      let id;
      if (y === 1) {
        // Une porte cochère par immeuble, le reste en devantures. Une rue où
        // chaque travée serait une boutique n'existe nulle part.
        id = (face & 7) === 2 ? ARCHI.PORTE : ARCHI.VITRINE;
      } else if (y === 2) {
        id = ARCHI.ENTRESOL;
      } else if (y === 3 || y === bh) {
        id = ARCHI.NOBLE;          // les deux balcons filants
      } else {
        id = ARCHI.ETAGE;
      }
      // L'angle prime sur le registre : la pierre de taille monte d'un seul
      // tenant, du trottoir à la corniche. C'est ainsi que ça se construit.
      poser(y, angle && y > 1 ? ARCHI.CHAINAGE : id);
    }
    poser(bh + 1, ARCHI.CORNICHE);
  }

  // Le toit. Il monte en marchant vers l'intérieur de l'îlot : la colonne de
  // façade ne porte que le premier rang de zinc, celle d'un pas en arrière deux,
  // et ainsi de suite — c'est le brisis du comble à la Mansart.
  const prof = Math.max(0, Math.min(2, Math.round(f.d - f.t.face)));
  const faite = bh + 1 + (dedans ? 3 : 1 + prof);
  for (let y = bh + 2; y <= faite; y++) poser(y, ARCHI.ZINC_LISSE);

  if (!dedans) {
    // Le chien-assis : sa lucarne est DESSINÉE dans le zinc, elle n'est plus un
    // cube de verre planté dans la pente. Une travée sur trois, au premier rang
    // du comble — c'est ce qu'on voit en levant la tête depuis le trottoir.
    if ((face % 3) === 0) poser(bh + 2, ARCHI.MANSARDE);
    // Et les souches de cheminée, en terre cuite, une par immeuble.
    if (tirageParis(f.ai, f.bi, 612) > 0.45 && (face & 7) === 3) {
      poser(faite + 1, BLOCK.TERRACOTTA);
      poser(faite + 2, BLOCK.TERRACOTTA);
    }
  }
}

// --- ce que la carte doit peindre ---------------------------------------------------

const VERT_JARDIN = [92, 152, 74];
const VERT_PELOUSE = [116, 176, 92];
const GRIS_RUE = [64, 66, 72];
const BEIGE_PLACE = [212, 204, 188];
const GRIS_COUR = [128, 124, 118];
const CREME_TOIT = [186, 186, 182];   // le zinc et la pierre, vus du ciel

// Paris comme Manhattan : ses places, ses jardins et ses percées se calculent,
// la carte peut donc les montrer avant qu'on y ait mis les pieds.
export function couleurCarteParis(x, z) {
  const u = x - PARIS.x, v = z - PARIS.z;
  if (u > PARIS.r || u < -PARIS.r || v > PARIS.r || v < -PARIS.r) return null;
  if (u * u + v * v > PARIS.r * PARIS.r) return null;
  const sol = solParis(x, z);
  // Le bâti. Sans lui, tout l'intérieur des îlots restait vert : Paris
  // apparaissait comme une prairie traversée de rues, alors que c'est la ville
  // la plus dense d'Europe. La couleur est celle des toits de zinc.
  if (sol === null) return CREME_TOIT;
  if (sol === BLOCK.WATER) return null;      // au fleuve de décider
  if (sol === BLOCK.GRASS) return VERT_PELOUSE;
  if (sol === ARBRE) return VERT_JARDIN;
  if (sol === COUR) return GRIS_COUR;
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

// NOTRE-DAME DE PARIS, REFAITE À L'ÉCHELLE DE LA VILLE NEUVE.
//
// L'ancienne faisait douze blocs de nef et cinq de large : sur une île de
// vingt-quatre blocs, vue du pont voisin, elle ressemblait à une cheminée de
// pierre. Or Notre-Dame est d'abord une FAÇADE — deux tours carrées, la rosace
// entre elles — et ensuite une longue nef que la flèche coupe en son milieu.
// Il faut de la longueur pour que cela se lise.
//
// Cent vingt-huit mètres de long, quarante-huit de large, des tours à
// soixante-neuf et une flèche à quatre-vingt-seize : les hauteurs suivent
// l'étage, la longueur suit l'île. Elle est tournée vers l'OUEST, comme
// toutes les cathédrales — le portail au couchant, le chœur au levant.
export function buildNotreDame(poser) {
  const { set, bloc } = boite(poser);
  const N0 = -8, N1 = 11;        // la nef, d'ouest en est
  const LARGE = 4;               // sa demi-largeur
  const HAUT = 13;               // la hauteur des murs de la nef

  // La nef : des murs et un vaisseau creux. Les églises du jeu sont des
  // coques, comme tous les bâtiments — on y entre, on n'y remplit rien.
  bloc(N0, N1, 0, HAUT, -LARGE, LARGE, PIERRE);
  bloc(N0 + 1, N1 - 1, 0, HAUT - 1, -LARGE + 1, LARGE - 1, BLOCK.AIR);

  // Les verrières hautes, une travée sur deux, et les bas-côtés.
  for (let x = N0 + 2; x <= N1 - 1; x += 2) {
    for (const dz of [-LARGE, LARGE]) {
      for (let y = 6; y <= 10; y++) set(x, y, dz, VERRE);
    }
  }
  // Les arcs-boutants : la signature du gothique, et ce qui empêche la nef de
  // ressembler à une grange. Un contrefort tous les trois blocs, en biais.
  for (let x = N0 + 3; x <= N1 - 1; x += 3) {
    for (const s2 of [-1, 1]) {
      for (let d = 1; d <= 3; d++) {
        set(x, HAUT - d, (LARGE + d) * s2, PIERRE);
        set(x, 0, (LARGE + d) * s2, PIERRE);
      }
      set(x, 1, (LARGE + 3) * s2, PIERRE);
      set(x, 2, (LARGE + 3) * s2, PIERRE);
    }
  }

  // Le comble à deux pentes, en plomb sombre.
  for (let k = 0; k <= LARGE; k++) {
    for (let x = N0; x <= N1; x++) {
      set(x, HAUT + 1 + k, -LARGE + k, ZINC);
      set(x, HAUT + 1 + k, LARGE - k, ZINC);
    }
  }

  // LA FAÇADE OUEST : deux tours carrées, et la rosace entre elles.
  for (const dz of [-3, 3]) {
    for (const dx of [N0 - 2, N0]) {
      for (let y = 0; y <= 21; y++) { set(dx, y, dz - 1, PIERRE); set(dx, y, dz + 1, PIERRE); }
    }
    bloc(N0 - 2, N0, 0, 21, dz - 1, dz + 1, PIERRE);
    bloc(N0 - 1, N0 - 1, 2, 19, dz, dz, BLOCK.AIR);
    for (let y = 13; y <= 19; y += 3) set(N0 - 2, y, dz, VERRE);   // les baies du beffroi
    bloc(N0 - 2, N0, 22, 22, dz - 2, dz + 2, PIERRE);              // la balustrade
  }
  // Le mur entre les tours, la grande rosace et les trois portails.
  bloc(N0 - 2, N0, 0, 14, -2, 2, PIERRE);
  for (let dz = -2; dz <= 2; dz++) for (let y = 8; y <= 12; y++) {
    if (Math.hypot(dz * 1.0, (y - 10) * 1.0) <= 2.4) set(N0 - 2, y, dz, VERRE);
  }
  for (const dz of [-3, 0, 3]) for (let y = 0; y <= 3; y++) set(N0 - 2, y, dz, BLOCK.AIR);
  bloc(N0 - 2, N0, 15, 15, -3, 3, PIERRE);                          // la galerie des rois

  // LA FLÈCHE, à la croisée du transept — celle de Viollet-le-Duc, refaite.
  const CROISEE = 2;
  bloc(CROISEE - 2, CROISEE + 2, HAUT + 1, HAUT + 3, -2, 2, PIERRE);
  for (let k = 0; k <= 12; k++) {
    const r = k < 4 ? 1 : 0;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) set(CROISEE + dx, HAUT + 4 + k, dz, ZINC);
    }
  }
  set(CROISEE, HAUT + 17, 0, BLOCK.GOLD);

  // Le parvis, devant la façade : c'est de là qu'on la regarde.
  for (let dx = N0 - 9; dx <= N0 - 3; dx++) {
    for (let dz = -6; dz <= 6; dz++) set(dx, -1, dz, PAVE);
  }
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

// LE PANTHÉON. Un temple grec — un portique à fronton, plein nord — surmonté
// d'une coupole sur tambour à colonnes. C'est là que la France met ses grands
// morts, et c'est la coupole qu'on voit de tout le Quartier latin.
//
// La première version empilait un cube blanc de treize blocs et posait
// quelques colonnes dessus : vu du ciel c'était une caisse. Ce qui fait le
// Panthéon, c'est la VERTICALE — le tambour est plus haut que large, et la
// coupole le coiffe. On a donc rétréci le corps et allongé le tambour.
export function buildPantheon(poser) {
  const { set, bloc, dome } = boite(poser);
  const R = 5, P = 4, H = 10;

  bloc(-R, R, 0, H, -P, P, BLANC);
  bloc(-R + 1, R - 1, 0, H - 1, -P + 1, P - 1, BLOCK.AIR);
  bloc(-R, R, H + 1, H + 1, -P, P, BLANC);                 // l'entablement

  // Le portique, plein nord : six colonnes, l'architrave, puis le fronton.
  for (let dx = -R; dx <= R; dx += 2) for (let y = 0; y <= H; y++) set(dx, y, -P - 3, BLANC);
  for (let dx = -R; dx <= R; dx++) {
    for (let dz = -P - 3; dz <= -P; dz++) set(dx, H + 1, dz, BLANC);
  }
  for (let k = 0; k <= R; k++) {                            // le fronton triangulaire
    for (let dx = -R + k; dx <= R - k; dx++) set(dx, H + 2 + k, -P - 3, BLANC);
  }
  for (let y = 0; y <= 2; y++) set(0, y, -P - 3, BLOCK.AIR); // l'entrée

  // Le tambour : une couronne de colonnes, plus haute que large. C'est lui qui
  // porte la coupole, et c'est lui qu'on reconnaît par-dessus les toits.
  for (let y = H + 2; y <= H + 11; y++) {
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > 4 || d < 3.1) continue;
        // une colonne sur deux, et deux anneaux pleins en haut et en bas
        const pleine = y <= H + 3 || y >= H + 10;
        set(dx, y, dz, pleine || (dx + dz) % 2 === 0 ? BLANC : VERRE);
      }
    }
  }

  dome(0, 0, H + 12, 5, BLANC);
  for (let k = 0; k <= 3; k++) set(0, H + 17 + k, 0, BLANC);   // la lanterne
  set(0, H + 21, 0, BLOCK.GOLD);
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
