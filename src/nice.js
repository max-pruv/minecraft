// Nice.
//
// C'était un disque de maisons posé au bord de rien. Or Nice se reconnaît à
// quatre choses : **la baie des Anges**, cette courbe que la ville épouse sur
// cinq kilomètres ; **la Promenade des Anglais** qui la longe d'un bout à
// l'autre ; **le Vieux-Nice**, un lacis de ruelles italiennes serrées entre le
// Paillon et la colline ; et **la colline du Château**, qui ferme la baie à
// l'est et sépare la vieille ville du port.
//
// Une échelle unique, et un point d'ancrage, la place Masséna : chaque lieu est
// donné par son écart réel à elle, en kilomètres.
//
// LA HUITIÈME VILLE REMISE À L'ÉCHELLE GTA (v203) : trente blocs par kilomètre,
// contre dix. Un bloc valait cent mètres, la baie des Anges tenait en
// quatre-vingt-seize blocs et aucune avenue n'était assez longue pour refermer
// un circuit de voitures — Nice roulait sur un anneau de secours. Même méthode
// qu'à Paris (v187) et San Francisco (v192) : le plan d'auteur reste dans ses
// unités d'origine (dix blocs par kilomètre) et se PROJETTE par `k()` ; les
// largeurs, elles, ne se projettent pas, elles se REDONNENT en blocs.

import { BLOCK, CITY_BLOCK, DECOR_START, ARCHI } from './blocks.js';
import { rangerVoies, solDesVoies, fabriqueCircuits } from './voies.js';
import { positionDe } from './mondes.js';

const uni = (c) => DECOR_START + c * 10;
const damier = (c) => DECOR_START + c * 10 + 3;

const BITUME = CITY_BLOCK.ASPHALT;
const TROTTOIR = CITY_BLOCK.SIDEWALK;
const PAVE = CITY_BLOCK.GRANITE;
const HERBE = BLOCK.GRASS;
const ARBRE = BLOCK.LEAVES;
const EAU = BLOCK.WATER;
const GALETS = BLOCK.GRAVEL === undefined ? BLOCK.SAND : BLOCK.SAND;
const OCRE = uni(1);
const ROSE = uni(16);
const SABLE = uni(20);
const TUILE = uni(0);
const BLANC = uni(27);
const CREME = uni(28);
const VERRE = BLOCK.GLASS;
const OR = BLOCK.GOLD;
const BLEU = uni(10);
const VERT = uni(5);

// LE RAYON VIENT DU REGISTRE (`mondes.js`), jamais d'un littéral ici : c'est le
// piège de San Francisco, dont le `r: 66` masquait la valeur de la carte.
export const NICE = positionDe('nice');

export const BLOCS_PAR_KM = 30;
// Le plan d'auteur a été relevé à dix blocs par kilomètre ; tout ce qui y est
// écrit en blocs — le rivage, les origines de trame, les points du quai — se
// projette par `k()`. Les LARGEURS, elles, ne passent jamais par là.
const K = BLOCS_PAR_KM / 10;
const k = (n) => n * K;
const pk = ([u, v]) => [k(u), k(v)];
// La place Masséna : le point où tout se croise, et d'où tout se mesure.
const MASSENA = { u: 0, v: 0 };
const de = (dx, dz) => [
  Math.round(MASSENA.u + dx * BLOCS_PAR_KM),
  Math.round(MASSENA.v + dz * BLOCS_PAR_KM),
];
// Une adresse du monde à partir de kilomètres réels depuis Masséna. C'est ce
// que les sondes et les témoins doivent viser — jamais un (u, v) en dur, qui
// meurt à la remise à l'échelle suivante.
export const adresseNice = (dx, dz) => {
  const [u, v] = de(dx, dz);
  return [NICE.x + u, NICE.z + v];
};

// --- la baie des Anges ---------------------------------------------------------------

// Le rivage, relevé point par point : une courbe très ouverte, qui se relève à
// l'est où la colline du Château vient fermer la baie, puis retombe au port.
// Relevé à dix blocs par kilomètre, projeté : les cinq kilomètres de baie
// tiennent désormais en deux cent quatre-vingt-huit blocs.
const RIVAGE_AUTEUR = [
  [-48, 16], [-38, 13], [-26, 10], [-14, 7], [-4, 5], [4, 5], [9, 8], [13, 10],
  [16, 6], [22, 4], [30, 2], [48, 0],
];
const RIVAGE = RIVAGE_AUTEUR.map(pk);
// La plage de galets, en blocs : quatre, soit cent trente mètres — c'est sa
// vraie largeur devant la Promenade.
const PLAGE = 4;

export const vRivage = (u) => {
  if (u <= RIVAGE[0][0]) return RIVAGE[0][1];
  const fin = RIVAGE[RIVAGE.length - 1];
  if (u >= fin[0]) return fin[1];
  for (let i = 0; i < RIVAGE.length - 1; i++) {
    const [a, va] = RIVAGE[i], [b, vb] = RIVAGE[i + 1];
    if (u >= a && u <= b) return va + (vb - va) * ((u - a) / (b - a));
  }
  return fin[1];
};

export const surTerreNice = (x, z) => {
  const u = x - NICE.x, v = z - NICE.z;
  if (Math.hypot(u, v) > NICE.r) return false;
  // Le bassin du port s'ouvre sur la mer : son coin sud-est passe le rivage, et
  // il appartient quand même à la ville — sinon ce coin devient une bande de
  // galets à sec au milieu de l'eau du port.
  return v < vRivage(u) || dansBassin(u, v);
};

// --- les collines ------------------------------------------------------------------

// Les rayons sont en KILOMÈTRES et se relèvent sur la vraie carte, pas sur
// l'ancienne échelle : le Château fait quatre cents mètres de rayon, Cimiez
// un bon kilomètre, le mont Boron huit cents mètres — et ses cent
// quatre-vingt-onze mètres en font le plus haut, deux fois le Château.
export const COLLINES_NICE = [
  // La colline du Château : pas de château dessus depuis 1706, mais le nom est
  // resté, et c'est elle qui coupe la ville en deux.
  // `parc` : la colline est un BOIS SUR UN ROCHER, pas un quartier. Le
  // Château et le mont Boron sont des parcs de pins dans la vraie ville ; la
  // capture du port montrait des maisons empilées dans leur talus de pierre.
  { nom: 'Colline du Château', dx: 0.9, dz: 0.2, rayon: 0.43, h: 18, parc: true },
  { nom: 'Cimiez', dx: 0.3, dz: -1.7, rayon: 1.2, h: 14 },
  // Le mont Boron est REPOUSSÉ derrière le port : à 2,1 km et huit cents
  // mètres de rayon, son pied soulevait les quais du bassin. La vraie
  // colline commence à l'est du port, pas dessus.
  { nom: 'Mont Boron', dx: 2.4, dz: 0.1, rayon: 0.6, h: 26, parc: true },
].map((c) => {
  const [u, v] = de(c.dx, c.dz);
  return { ...c, u, v, r: Math.round(c.rayon * BLOCS_PAR_KM) };
});

// Le bassin du port Lympia est CREUSÉ : ses quais dominent l'eau de trois
// blocs, comme les vrais. Le relief le demande avant les collines, sinon le
// pied du mont Boron le soulevait en étang perché.
const dansBassin = (u, v) => LIEUX_NICE.some((p) =>
  p.bassin && Math.abs(u - p.u) <= p.ru && Math.abs(v - p.v) <= p.rv);

// L'emprise de la place Masséna, en coordonnées locales. Deux choses la
// consultent : le relief, qui ne veut pas de talus dessus, et la colline du
// Château, dont le tapis d'herbe débordait sur les statues.
export const surLaPlaceMassena = (u, v) =>
  Math.abs(u - MASSENA.u) <= 8 && Math.abs(v - MASSENA.v) <= 7;

const FONDU = 30;

export function hauteurNice(x, z, h, base) {
  const u = x - NICE.x, v = z - NICE.z;
  const d = Math.hypot(u, v);
  // Le fondu a suivi l'échelle : trente blocs, un kilomètre, comme avant.
  if (d > NICE.r + FONDU) return h;
  const marge = Math.min(1, (NICE.r + FONDU - d) / FONDU);

  const mer = v - vRivage(u);
  let cible;
  // Le bassin passe AVANT le rivage : son coin sud-est déborde sur la mer, et
  // la bande de galets le rebouchait à sec.
  if (dansBassin(u, v)) cible = base - 3;
  else if (mer >= 0) cible = mer < PLAGE ? base - 1 - mer : Math.max(20, 26 - Math.min(6, (mer - PLAGE) / K));
  else {
    cible = base;
    // UNE PLACE EST PLATE — MÊME AU PIED D'UNE COLLINE.
    //
    // La colline du Château monte à dix blocs et son pied déborde sur la place
    // Masséna : la moitié est de la place se retrouvait dans le talus, et deux
    // des sept statues de « Conversation à Nice » y étaient enterrées jusqu'aux
    // épaules. Cela ne se voyait pas tant que Nice était un plateau uniforme —
    // elle n'a reçu son relief qu'avec la remise à plat de la carte. Dans la
    // vraie ville, la place est plate et la colline commence après : on protège
    // donc son emprise, et le talus reprend juste derrière.
    if (!surLaPlaceMassena(u, v)) {
      for (const c of COLLINES_NICE) {
        const dc = Math.hypot(u - c.u, v - c.v);
        if (dc >= c.r) continue;
        const m = Math.cos((dc / c.r) * Math.PI * 0.5);
        cible += m * m * c.h;
      }
    }
  }
  return h * (1 - marge) + cible * marge;
}

// --- les lieux -----------------------------------------------------------------------

// `r` est en blocs — un disque de sol autour d'un repère, qui n'a pas à
// grandir avec la carte. Les EMPRISES de plan (`ku`, `kv`), elles, sont en
// kilomètres et se convertissent : le bassin du port fait quatre cents mètres
// sur six cents, la coulée verte du Paillon deux cents sur huit cents.
const L = (nom, dx, dz, reste = {}) => {
  const [u, v] = de(dx, dz);
  const p = { nom, u, v, ...reste };
  if (p.ku) { p.ru = p.ku * BLOCS_PAR_KM; p.rv = p.kv * BLOCS_PAR_KM; }
  return p;
};

export const LIEUX_NICE = [
  L('Place Masséna', 0, 0, { r: 5, sol: damier(0) }),
  L('Vieux-Nice', 0.5, 0.3, { r: 4 }),
  L('Cours Saleya', 0.5, 0.4, { discret: true, r: 4, sol: PAVE }),
  L('Colline du Château', 0.9, 0.2, { r: 4 }),
  L('Port Lympia', 1.65, 0.25, { ku: 0.2, kv: 0.3, bassin: true }),
  L('Promenade des Anglais', -1.6, 0.75, { r: 4 }),
  L('Cimiez', 0.3, -1.7, { r: 4 }),
  L('Gare de Nice', -0.7, -0.9, { r: 5, sol: PAVE }),
  L('Jardin du Paillon', 0.05, -0.35, { ku: 0.1, kv: 0.4, jardin: true }),
  L('Mont Boron', 2.4, 0.1, { r: 4 }),
];

export const lieuxDeNice = () => LIEUX_NICE
  .filter((p) => (p.r || p.jardin || p.bassin) && !p.discret)
  .map((p) => ({ name: p.nom, x: NICE.x + p.u, z: NICE.z + p.v, r: 12 }));

// --- les rues ------------------------------------------------------------------------
//
// Deux trames, et elles n'ont rien à voir. Le Vieux-Nice est génois : des
// ruelles d'un mètre cinquante, tortueuses, orientées n'importe comment. La
// ville du XIXe, à l'ouest du Paillon, est tracée au cordeau pour les hivernants
// anglais et russes. La frontière entre les deux, c'est le Paillon — aujourd'hui
// couvert, et devenu jardin.

// Les ORIGINES de trame (`cu`, `cv`) sont du plan et se projettent ; le pas,
// la chaussée et le trottoir sont en BLOCS et se redonnent, parce qu'une rue
// doit rester praticable quelle que soit l'échelle. Une ruelle du Vieux-Nice
// fait un bloc de chaussée, une rue de la ville neuve deux, et les îlots
// passent de deux blocs et demi à cinq — de quoi poser une façade ET une
// maison derrière.
const TRAMES = {
  vieux: { ang: 0.34, pu: 5, pv: 4.5, cu: k(5), cv: k(3), w: 0.6, s: 1.1 },
  neuve: { ang: 0, pu: 9, pv: 8, cu: k(-6), cv: k(-4), w: 1.0, s: 1.8 },
  cimiez: { ang: 0.15, pu: 11, pv: 10, cu: k(3), cv: k(-17), w: 0.9, s: 1.6 },
};

// Les frontières entre quartiers sont du plan, elles aussi.
const LIMITE_CIMIEZ = k(-10);
const VIEUX = { u0: k(2), u1: k(12), v0: k(-2) };

function trameDeNice(u, v) {
  if (v < LIMITE_CIMIEZ) return TRAMES.cimiez;
  if (u >= VIEUX.u0 && u <= VIEUX.u1 && v >= VIEUX.v0) return TRAMES.vieux;
  return TRAMES.neuve;
}

const pt = (nom) => [lieu(nom).u, lieu(nom).v];
const lieu = (nom) => LIEUX_NICE.find((p) => p.nom === nom);

// LES LARGEURS NE SE PROJETTENT PAS, ELLES SE REDONNENT. `l` est la
// demi-largeur de la chaussée en blocs, `t` le trottoir de chaque côté ; la
// Promenade est la plus large, et son trottoir côté mer est le plus large de
// la ville — c'est lui, la promenade.
const AVENUE = 2.4;
const a = (l) => l * AVENUE;
const TROTTOIR_AV = 1.2;
// La chaussée de la Promenade passe à dix blocs derrière le rivage : quatre
// de galets, trois de trottoir planté de palmiers, puis la route. La rue de
// France court parallèle, douze blocs plus haut — entre les deux, la rangée
// des palaces, dont le Negresco.
const RECUL_PROMENADE = 10;
const RECUL_FRANCE = 22;
const surPromenade = (u) => [u, Math.round(vRivage(u)) - RECUL_PROMENADE];
const surFrance = (u) => [u, Math.round(vRivage(u)) - RECUL_FRANCE];

// UN CIRCUIT SE REFERME SUR DES CARREFOURS. `chainerVoies` accroche chaque
// avenue par son EXTRÉMITÉ la plus proche — jamais au milieu — et relie deux
// extrémités par une droite. Une avenue dont le bout tombe au milieu d'un
// îlot ne peut donc appartenir à aucune boucle : chaque bout ci-dessous est
// posé SUR la chaussée d'une autre avenue, et c'est ce qui a fait passer la
// meilleure boucle de 89 % à plus de 90 %. Les tracés restent ceux du vrai
// plan ; ce sont les bouts qui sont recalés au carrefour.
const VOIES = [
  // Le front de mer, d'ouest en est : la Promenade des Anglais, le quai des
  // États-Unis sous la colline, puis Rauba-Capeu qui contourne le cap jusqu'au
  // port.
  { nom: 'Promenade des Anglais', l: a(1.2), t: 2.2, pts: [-114, -78, -42, -12, 12].map(surPromenade) },
  { nom: 'Quai des États-Unis', l: a(0.9), t: 1.6, pts: [surPromenade(12), [27, 16], [39, 22]] },
  { nom: 'Quai Rauba-Capeu', l: a(0.6), t: 1.2, pts: [[39, 22], [42, 18], [40, -4]] },
  // Le boulevard Carabacel descend du nord vers le port, et Dubouchage puis
  // Victor-Hugo traversent la ville neuve d'est en ouest, au nord de Masséna.
  { nom: 'Boulevard Carabacel', l: a(0.6), t: TROTTOIR_AV, pts: [[27, -15], [36, -8], [40, -4]] },
  { nom: 'Boulevard Dubouchage', l: a(0.7), t: TROTTOIR_AV, pts: [[-4, -15], [6, -15], [27, -15]] },
  { nom: 'Boulevard Victor-Hugo', l: a(0.7), t: TROTTOIR_AV, pts: [[-48, -15], [-4, -15]] },
  // Jean-Médecin monte de Masséna à la gare ; Thiers longe la gare vers
  // l'ouest ; Gambetta et Verdun redescendent vers la mer.
  { nom: 'Avenue Jean-Médecin', l: a(0.9), t: TROTTOIR_AV, pts: [[-4, -9], [-4, -30]] },
  { nom: 'Avenue Thiers', l: a(0.7), t: TROTTOIR_AV, pts: [[-4, -30], [-21, -30], [-48, -30]] },
  { nom: 'Boulevard Gambetta', l: a(0.6), t: TROTTOIR_AV, pts: [surPromenade(-48), [-48, -15], [-48, -30]] },
  { nom: 'Avenue de Verdun', l: a(0.7), t: TROTTOIR_AV, pts: [surPromenade(-12), [-9, -9]] },
  // La rue de France, puis l'avenue de la Californie qui la prolonge vers
  // l'aéroport ; René-Cassin referme la boucle sur la Promenade à l'ouest.
  { nom: 'Rue de France', l: a(0.6), t: TROTTOIR_AV, pts: [[-9, -7], [-30, surFrance(-30)[1]], surFrance(-48)] },
  { nom: 'Avenue de la Californie', l: a(0.6), t: TROTTOIR_AV, pts: [surFrance(-48), surFrance(-84), surFrance(-114)] },
  { nom: 'Boulevard René-Cassin', l: a(0.6), t: TROTTOIR_AV, pts: [surFrance(-114), surPromenade(-114)] },
  // Le boulevard de Cimiez grimpe la colline depuis Dubouchage ; l'avenue des
  // Arènes en redescend vers Libération, et Malausséna — le prolongement de
  // Jean-Médecin au nord de la gare — ramène en ville.
  { nom: 'Boulevard de Cimiez', l: a(0.7), t: TROTTOIR_AV, pts: [[6, -15], [9, -33], [9, -51]] },
  { nom: 'Avenue des Arènes de Cimiez', l: a(0.6), t: TROTTOIR_AV, pts: [[9, -51], [-4, -51]] },
  { nom: 'Avenue Malausséna', l: a(0.8), t: TROTTOIR_AV, pts: [[-4, -51], [-4, -30]] },
];

const BANDES = rangerVoies(VOIES);

// --- où roulent les voitures -------------------------------------------------
//
// LES ENCHAÎNEMENTS NE SE DEVINENT PAS, ILS SE MESURENT. Toutes les
// combinaisons de deux à cinq avenues voisines ont été éprouvées contre
// `solNice` et l'on n'a gardé que celles qui tiennent la rue à 90 % au moins,
// choisies par couverture gloutonne — à chaque tour, celle qui apporte le
// plus d'avenues neuves. Avant la remise à l'échelle, la meilleure paire
// tenait à 89 % : la ville était trop petite pour refermer une seule boucle.
// Cinq circuits couvrent les seize avenues de Nice.
//
// ET UN PARC PEUT MANGER LE RETOUR D'UN CIRCUIT. Le front de mer se refermait
// en deux quais (93 %) tant que la colline du Château portait des rues : sa
// ligne de retour la traversait en droite ligne. Boisée, la colline n'a plus
// de chaussée, et la même paire tombe à 72 %. Le tour se fait donc comme dans
// la vraie ville : par le cap, derrière la colline par Carabacel, et retour
// à la mer par Verdun.
const CIRCUITS = [
  // Le grand tour de l'ouest, par la rue de France et la Promenade — 100 %, 486 blocs.
  ['Boulevard Gambetta', 'Avenue de la Californie', 'Rue de France', 'Avenue de Verdun', 'Promenade des Anglais'],
  // La montée de Cimiez et le retour par Malausséna — 100 %, 149 blocs.
  ['Boulevard Dubouchage', 'Boulevard de Cimiez', 'Avenue des Arènes de Cimiez', 'Avenue Malausséna', 'Avenue Jean-Médecin'],
  // Le carré de la ville neuve, autour de la gare — 100 %, 186 blocs.
  ['Boulevard Victor-Hugo', 'Avenue Jean-Médecin', 'Avenue Thiers', 'Boulevard Gambetta'],
  // Le tour du vieux Nice : les quais, le cap, Carabacel derrière la colline
  // et Verdun pour redescendre à la mer — 99 %, 153 blocs.
  ['Quai des États-Unis', 'Quai Rauba-Capeu', 'Boulevard Carabacel', 'Boulevard Dubouchage', 'Avenue de Verdun'],
  // La Californie, jusqu'au bout de la Promenade — 100 %, 160 blocs.
  ['Boulevard René-Cassin', 'Avenue de la Californie'],
];

const ROULANT = new Set([BITUME, PAVE]);

export const circuitsNice = fabriqueCircuits({
  cle: 'nice', ancre: NICE, chaines: CIRCUITS, roulant: ROULANT,
  voies: { liste: VOIES, sol: solNice },
});

export function solNice(x, z) {
  if (!surTerreNice(x, z)) return null;
  const u = x - NICE.x, v = z - NICE.z;

  // Le port avant la plage : le bassin du port Lympia s'ouvre sur la mer par
  // son extrémité sud, il n'est pas ensablé. Vérifié dans l'autre ordre, la
  // bande de galets recouvrait tout le bord sud-est du bassin.
  for (const p of LIEUX_NICE) {
    if (p.bassin && Math.abs(u - p.u) <= p.ru && Math.abs(v - p.v) <= p.rv) return EAU;
  }

  // La plage de galets : Nice n'a pas de sable, et c'est la première chose que
  // remarque un enfant qui y met les pieds.
  if (vRivage(u) - v < PLAGE) return GALETS;

  for (const p of LIEUX_NICE) {
    if (p.bassin) {
      // Le port Lympia est un bassin RECTANGULAIRE creusé derrière la colline —
      // un ovale ne ressemble à aucun port, et surtout pas à celui-là. (Sa
      // surface en eau est servie plus haut, avant la plage.)
      continue;
    }
    if (p.jardin) continue;
    if (!p.sol) continue;
    if (Math.hypot(u - p.u, v - p.v) < p.r) return p.sol;
  }

  const voie = solDesVoies(BANDES, u, v, BITUME, TROTTOIR);
  if (voie !== null) return voie;

  // La coulée verte du Paillon vient APRÈS les avenues : Dubouchage la
  // traverse, comme dans la vraie ville, et une rue qui s'arrête au bord
  // d'un jardin ne referme aucune boucle.
  for (const p of LIEUX_NICE) {
    if (!p.jardin) continue;
    if (((u - p.u) / p.ru) ** 2 + ((v - p.v) / p.rv) ** 2 < 1) {
      if (Math.abs(u - p.u) < 0.6) return TROTTOIR;
      // Un arbre sur vingt-cinq colonnes : chaque couronne déborde d'un
      // bloc, et plus serré la coulée verte devenait un fourré.
      return (u % 5 === 0 && v % 5 === 0) ? ARBRE : HERBE;
    }
  }

  // Les collines boisées viennent APRÈS les avenues — Rauba-Capeu contourne
  // le cap du Château — et AVANT la trame : à dix-huit blocs sur treize de
  // rayon, la pente expose la roche, et des maisons posées dedans font un
  // escalier de pierre, pas un quartier. Des pins sur l'herbe, un sur seize
  // colonnes — assez serrés pour qu'on lise un bois vu du ciel, assez
  // espacés pour marcher dessous ; le sommet du Château reste dégagé pour
  // ses ruines.
  for (const c of COLLINES_NICE) {
    if (!c.parc) continue;
    const dc = Math.hypot(u - c.u, v - c.v);
    if (dc >= c.r) continue;
    return (dc > 5 && u % 4 === 0 && v % 4 === 0) ? ARBRE : HERBE;
  }

  const t = trameDeNice(u, v);
  const c = Math.cos(t.ang), s = Math.sin(t.ang);
  const du = u - t.cu, dv = v - t.cv;
  const a = du * c - dv * s, b = du * s + dv * c;
  const d = Math.min(
    Math.abs(a - Math.round(a / t.pu) * t.pu),
    Math.abs(b - Math.round(b / t.pv) * t.pv),
  );
  if (d < t.w) return BITUME;
  if (d < t.s) return TROTTOIR;
  return null;
}

export function lotNiceLibre(x, z) {
  if (!surTerreNice(x, z)) return false;
  const u = x - NICE.x, v = z - NICE.z;
  if (vRivage(u) - v < PLAGE + 1) return false;
  // les collines-parcs ne se bâtissent pas — leur sol le dit déjà, mais on
  // le redit ici pour que la règle se lise sans suivre `solNice`
  for (const c of COLLINES_NICE) {
    if (c.parc && Math.hypot(u - c.u, v - c.v) < c.r) return false;
  }
  return solNice(x, z) === null;
}

// --- les maisons ---------------------------------------------------------------------

// L'ocre, le rose et le sable : les trois couleurs des façades niçoises, avec
// leurs tuiles rondes. Dans le Vieux-Nice, les maisons sont hautes et étroites ;
// à l'ouest, plus basses et plus larges.
const FACADES = [OCRE, ROSE, SABLE, uni(2), uni(16), CREME];

function tirageNice(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function batirColonneNice(x, z, poser) {
  const u = x - NICE.x, v = z - NICE.z;
  const t = trameDeNice(u, v);
  const c = Math.cos(t.ang), s = Math.sin(t.ang);
  const du = u - t.cu, dv = v - t.cv;
  const a = Math.round((du * c - dv * s) / t.pu), b = Math.round((du * s + dv * c) / t.pv);
  const r = tirageNice(a, b, 731);
  const vieux = t === TRAMES.vieux;
  const bh = vieux ? 5 + Math.floor(r * 4) : 4 + Math.floor(r * 3);
  const mur = FACADES[Math.floor(tirageNice(a, b, 732) * FACADES.length) % FACADES.length];

  const oE = lotNiceLibre(x + 1, z), oO = lotNiceLibre(x - 1, z);
  const oS = lotNiceLibre(x, z + 1), oN = lotNiceLibre(x, z - 1);
  const dedans = oE && oO && oS && oN;
  const face = (!oE || !oO) ? v : u;

  for (let y = 0; y < bh; y++) {
    if (dedans) { if (y === 0) poser(1, BLOCK.PLANK); continue; }
    // UNE FENÊTRE EST UN DESSIN, PAS UN TROU. Un rang sur deux était un bloc
    // de VERRE : comme un bâtiment est creux, on voyait au travers — 18,7 %
    // du volume bâti de Nice était un trou. C'est la panne de San Francisco
    // (v195) puis des deux cent soixante-neuf villes engendrées (v200), la
    // troisième fois. `ARCHI.ETAGE` porte ses meneaux dans sa texture, il est
    // opaque, et il s'allume déjà la nuit.
    const fenetre = y > 0 && y % 2 === 1 && (face & 1) === 1;
    poser(y + 1, fenetre ? ARCHI.ETAGE : mur);
  }
  // les tuiles rondes, et les volets peints du Vieux-Nice
  poser(bh + 1, TUILE);
  if (vieux && !dedans && (face & 3) === 0) poser(3, VERT);
}

// --- ce que la carte doit peindre -------------------------------------------------------

const GRIS_RUE = [64, 66, 72];
const BEIGE = [214, 200, 168];
const GALET = [206, 198, 186];
const VERT_JARDIN = [96, 156, 84];

export function couleurCarteNice(x, z) {
  const u = x - NICE.x, v = z - NICE.z;
  if (u < -NICE.r || u > NICE.r || v < -NICE.r || v > NICE.r) return null;
  const sol = solNice(x, z);
  if (sol === null) {
    if (!surTerreNice(x, z)) return null;
    return [206, 168, 132];     // les toits de tuiles, vus du ciel
  }
  // Le bassin du port est creusé dans un quartier plus haut que la mer : sans
  // cette couleur, la carte le peignait comme de la terre et le port disparaissait.
  if (sol === EAU) return [92, 142, 196];
  if (sol === GALETS) return GALET;
  if (sol === ARBRE || sol === HERBE) return VERT_JARDIN;
  if (sol === PAVE || sol === damier(0)) return BEIGE;
  return GRIS_RUE;
}

// --- les monuments -----------------------------------------------------------------------

// Les positions viennent de la fiche de terrain : distances réelles à vol
// d'oiseau depuis la place Masséna. La cathédrale russe est à 1,3 km à
// l'ouest-nord-ouest ; le Negresco lève sa coupole rose SUR la Promenade,
// à un kilomètre à l'ouest. Les petits repères n'affichent leur nom que de
// tout près, pour ne pas chasser les grands de la carte.
export const MONUMENTS_NICE = [
  { nom: 'Place Masséna', dx: 0, dz: 0, box: 9 },
  { nom: 'Cathédrale russe', dx: -1.1, dz: -0.7, box: 7 },
  { nom: 'Colline du Château', dx: 0.9, dz: 0.2, box: 8 },
  // Le Negresco se pose ENTRE la Promenade et la rue de France, pas sur la
  // chaussée : à dz = 0,2 il était au milieu de la route.
  { nom: 'Hôtel Negresco', dx: -1.0, dz: 0.03, box: 5, seuil: 0.3 },
  { nom: 'Port Lympia', dx: 1.65, dz: 0.25, box: 5, seuil: 0.3 },
  { nom: 'Cours Saleya', dx: 0.5, dz: 0.4, box: 4, seuil: 0.3 },
  { nom: 'Baleine du Paillon', dx: 0.1, dz: -0.6, box: 4, seuil: 0.3 },
  // La Promenade s'ancre SUR le trottoir, pas dans l'eau.
  //
  // Son point d'ancrage était à dz = 1,0, soit trois blocs au large du rivage :
  // le repère prenait donc sa cote de base dans la mer (29) alors qu'il dessine
  // ses palmiers et ses chaises bleues sur la promenade (32). Tant que Nice
  // était un plateau parfaitement plat — elle n'a eu sa vraie baie qu'avec la
  // remise à plat de la carte — l'écart n'existait pas et rien ne se voyait.
  // Depuis que la mer entre pour de bon, le mobilier se retrouvait enterré
  // trois blocs sous le sable. On pose l'ancre sur le trottoir, et depuis la
  // remise à l'échelle le bâtisseur calcule lui-même sa ligne depuis
  // `vRivage` : l'ancre n'a plus à tomber juste, elle n'a qu'à être à terre.
  { nom: 'Promenade des Anglais', dx: -2.0, dz: 0.55, box: 60, seuil: 0.3 },
].map((m) => { const [u, v] = de(m.dx, m.dz); return { ...m, u, v }; });

const boite = (poser) => {
  const set = (x, y, z, id) => poser(x, y + 1, z, id);
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
  };
  return { set, bloc };
};

// La place Masséna : son dallage en damier noir et blanc, et les immeubles
// rouge ocre à arcades qui la bordent au sud. Aucune autre place n'a ces
// deux-là ensemble.
export function buildMassena(poser) {
  const { set, bloc } = boite(poser);
  for (let dx = -7; dx <= 7; dx++) {
    for (let dz = -6; dz <= 6; dz++) {
      poser(dx, 0, dz, ((Math.floor((dx + 40) / 2) + Math.floor((dz + 40) / 2)) & 1) ? BLANC : uni(25));
    }
  }
  for (const dz of [-6, 6]) {
    bloc(-7, 7, 0, 9, dz, dz + Math.sign(dz), uni(0));
    for (let dx = -6; dx <= 6; dx += 2) {
      for (let y = 1; y <= 2; y++) set(dx, y, dz, BLOCK.AIR);          // les arcades
      for (let y = 4; y <= 8; y += 2) set(dx, y, dz, VERRE);
    }
    bloc(-7, 7, 10, 10, dz - Math.sign(dz), dz + Math.sign(dz), TUILE);
  }
  // la fontaine du Soleil, au milieu
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) if (Math.hypot(dx, dz) <= 2.4) poser(dx, 0, dz, EAU);
  }
  for (let y = 1; y <= 5; y++) set(0, y, 0, BLANC);
  set(0, 6, 0, OR);
  // les sept statues sur leurs colonnes, autour de la place — sept, comme les
  // sept continents de « Conversation à Nice », perchées sur leurs mâts
  for (const [dx, dz] of [[-6, -3], [-6, 3], [6, -3], [6, 3], [0, -4], [0, 4], [6, 0]]) {
    for (let y = 1; y <= 6; y++) set(dx, y, dz, BLANC);
    set(dx, 7, dz, uni(19));
  }
}

// La cathédrale orthodoxe Saint-Nicolas, bâtie pour les hivernants du tsar :
// un cube d'ocre aux touches bleu pastel, et CINQ coupoles à bulbes VERTES à
// croix dorées — vertes, pas multicolores : c'est leur tuile vernissée qui
// fait la carte postale. La plus grande cathédrale russe hors de Russie.
export function buildCathedraleRusse(poser) {
  const { set, bloc } = boite(poser);
  bloc(-4, 4, 0, 7, -3, 3, OCRE);
  bloc(-3, 3, 0, 6, -2, 2, BLOCK.AIR);
  // la frise bleu pastel, et les hautes fenêtres
  for (let dx = -4; dx <= 4; dx += 2) { set(dx, 5, -3, BLEU); set(dx, 5, 3, BLEU); }
  for (let dx = -3; dx <= 3; dx += 2) for (const dz of [-3, 3]) { set(dx, 2, dz, VERRE); set(dx, 3, dz, VERRE); }
  for (let y = 0; y <= 2; y++) set(0, y, 3, BLOCK.AIR);      // le portail
  bloc(-4, 4, 8, 8, -3, 3, OCRE);                            // le toit
  // les cinq bulbes verts : le grand au centre, quatre aux angles
  const bulbes = [[0, 0, 3, 10], [-3, -2, 2, 9], [3, -2, 2, 9], [-3, 2, 2, 9], [3, 2, 2, 9]];
  for (const [dx, dz, r, base] of bulbes) {
    set(dx, base - 1, dz, BLANC);                            // le tambour
    for (let y = 0; y <= r; y++) {
      const rr = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
      for (let ax = -rr; ax <= rr; ax++) {
        for (let az = -rr; az <= rr; az++) {
          const hh = Math.hypot(ax, az);
          if (hh > rr || hh < rr - 1.3) continue;
          set(dx + ax, base + y, dz + az, VERT);
        }
      }
    }
    set(dx, base + r + 1, dz, OR);                           // la croix dorée
  }
}

// Le Negresco : la façade blanche et la coupole rose, posées sur la Promenade
// des Anglais. La coupole seule suffit à dire « Nice » sur une photo.
export function buildNegresco(poser) {
  const { set, bloc } = boite(poser);
  bloc(-3, 3, 0, 4, -1, 1, BLANC);
  for (const dx of [-2, -1, 0, 1]) { set(dx, 1, 1, VERRE); set(dx, 3, 1, VERRE); }
  set(0, 0, 1, BLOCK.AIR);                                   // l'entrée, face à la mer
  set(0, 1, 2, BLOCK.WOOL_RED);                              // l'auvent rouge du portier
  // la tour d'angle et sa coupole rose
  for (let y = 5; y <= 7; y++) for (const [tx, tz] of [[2, -1], [3, -1], [2, 0], [3, 0]]) set(tx, y, tz, BLANC);
  for (const [tx, tz] of [[2, -1], [3, -1], [2, 0], [3, 0]]) { set(tx, 8, tz, ROSE); set(tx, 9, tz, ROSE); }
  set(2, 10, 0, ROSE);
  set(2, 11, 0, OR);
}

// Le port Lympia : les pointus — les barques de pêche colorées — à quai dans
// le bassin, et le quai pavé côté ville.
export function buildPortLympia(poser) {
  const { set } = boite(poser);
  const barques = [[-1, -2, BLOCK.WOOL_RED], [1, 0, BLOCK.WOOL_YELLOW], [-1, 2, BLOCK.WOOL_BLUE]];
  for (const [dx, dz, c] of barques) { set(dx, 0, dz, c); set(dx + 1, 0, dz, c); }
  for (let dz = -3; dz <= 3; dz++) set(-3, 0, dz, PAVE);
}

// Le cours Saleya : le marché aux fleurs sous ses stores rayés, à deux pas de
// la mer, au pied de la colline.
export function buildSaleya(poser) {
  const { set } = boite(poser);
  for (const [dx, dz] of [[-2, -1], [2, -1], [-2, 1], [2, 1]]) { set(dx, 0, dz, BLOCK.LOG); set(dx, 1, dz, BLOCK.LOG); }
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -1; dz <= 1; dz++) set(dx, 2, dz, (dx & 1) ? BLOCK.WOOL_RED : BLOCK.WOOL_YELLOW);
  }
}

// La baleine de bois du Paillon : le jeu le plus connu de la coulée verte,
// celui que tous les enfants de Nice ont escaladé.
export function buildBaleine(poser) {
  const { set, bloc } = boite(poser);
  bloc(-2, 1, 0, 1, -1, 0, BLOCK.LOG);                       // le corps
  set(2, 0, -1, BLOCK.LOG); set(2, 0, 0, BLOCK.LOG);         // la tête
  set(-3, 1, 0, BLOCK.LOG); set(-3, 2, 0, BLOCK.LOG);        // la queue levée
  set(2, 1, 0, BLOCK.WOOL_BLUE);                             // le jet d'eau
}

// La Promenade des Anglais elle-même : les palmiers, et les fameuses chaises
// bleues tournées vers la mer. Sans elles, ce n'est qu'un trottoir.
//
// Le bâtisseur se repère sur SON ancre (`MONUMENTS_NICE`), pas sur des
// constantes recopiées : l'ancienne version portait `CV = 10` pour une ancre à
// v = 7, et le mobilier se posait trois blocs à côté de la ligne visée. Les
// palmiers vont sur le trottoir côté mer, un bloc derrière les galets ; les
// chaises devant eux, tournées vers la baie. Tout cela sur les quatre
// kilomètres de Promenade, de l'ouest jusqu'au jardin Albert-Ier.
const PROMENADE_ANCRE = () => MONUMENTS_NICE.find((m) => m.nom === 'Promenade des Anglais');
export function buildPromenade(poser) {
  const { set } = boite(poser);
  const { u: CU, v: CV } = PROMENADE_ANCRE();
  const u0 = Math.round(k(-38)), u1 = Math.round(k(-2));
  for (let u = u0; u <= u1; u++) {
    const vp = Math.round(vRivage(u)) - PLAGE - 1;           // le trottoir côté mer
    if (u % 10 === 0) {                                      // un palmier
      for (let y = 0; y <= 3; y++) set(u - CU, y, vp - CV, BLOCK.LOG);
      for (const [ax, az] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        set(u - CU + ax, 4, vp - CV + az, BLOCK.LEAVES);
      }
    } else if (u % 7 === 0) {                                // deux chaises bleues
      set(u - CU, 0, vp - CV, BLOCK.WOOL_BLUE);
      set(u - CU + 1, 0, vp - CV, BLOCK.WOOL_BLUE);
    }
  }
}

// La colline du Château : il n'y a plus de château, mais il y a la cascade, les
// ruines de la cathédrale et le belvédère d'où l'on voit toute la baie.
export function buildCollineChateau(poser) {
  const { set } = boite(poser);
  // La cascade, sur le flanc ouest — et qui s'arrête au bord de la place. Son
  // pied retombait sur le dallage de Masséna et noyait la septième statue.
  const COLLINE = COLLINES_NICE.find((c) => c.nom === 'Colline du Château');
  for (let k = 0; k <= 9; k++) {
    for (let dx = -2; dx <= 2; dx++) {
      const cu = -6 + Math.round(k * 0.3) + dx, cv = -1 + Math.round(k * 0.2);
      if (surLaPlaceMassena(COLLINE.u + cu, COLLINE.v + cv)) continue;
      set(cu, 8 - k, cv, EAU);
    }
  }
  // Le tapis d'herbe du sommet, qui s'arrête au bord de la place : le repère
  // est bâti APRÈS Masséna et son herbe recouvrait deux des sept statues.
  for (let dx = -4; dx <= 4; dx++) for (let dz = -3; dz <= 3; dz++) {
    if (Math.hypot(dx, dz) > 4) continue;
    if (surLaPlaceMassena(COLLINE.u + dx, COLLINE.v + dz)) continue;
    set(dx, 0, dz, HERBE);
  }
  // les ruines : des pans de mur et deux colonnes
  for (const [x0, x1, z0] of [[-3, 2, -3], [-3, -3, -3], [2, 2, -3]]) {
    for (let x = x0; x <= x1; x++) for (let y = 1; y <= 4; y++) set(x, y, z0, PAVE);
  }
  for (const dx of [-2, 2]) for (let y = 1; y <= 6; y++) set(dx, y, 2, BLANC);
  // le belvédère et son mât
  for (let y = 1; y <= 8; y++) set(0, y, 0, PAVE);
  set(0, 9, 0, uni(0));
}
