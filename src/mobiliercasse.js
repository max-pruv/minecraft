// LE MOBILIER SE CASSE (v523). Max : « quand tu roules, tout le mobilier
// urbain, poteau, feu rouge, est hyper dur. Comme dans GTA, il devrait pouvoir
// tomber, s'écraser pour ne pas bloquer la voiture. »
//
// Mesuré avant d'écrire (`tests/sonde-mobilier-route.cjs`) : ce sur quoi la
// voiture de l'enfant bute en ville, ce sont des BLOCS de la famille `RUE` —
// réverbères, feux, jardinières —, et presque rien d'autre. Rome, Zurich,
// Tokyo, Berlin : zéro pièce au milieu de la voie, 60 à 100 par kilomètre dès
// qu'on s'écarte d'un bloc vers le trottoir (la marge d'une voiture centrée
// sur sa voie y est de 2,1 blocs). Londres : 35 par kilomètre AU MILIEU de la
// voie (des feux aux coins que les circuits rasent).
//
// Ce module est PUR (sans three, sans document) : la règle — qu'est-ce qui se
// casse, à quelle vitesse, combien de temps ça reste au sol, comment ça tombe —
// et le registre de ce qui est tombé. `main.js` lit l'un et l'autre.
//
// RIEN N'EST ÉCRIT DANS LE MONDE (invariant 1). Un réverbère tombé est le MÊME
// maillage, couché ; son bloc reste dans le morceau, et le journal de l'enfant
// n'est jamais touché. Un objet qu'un ENFANT a posé ne se casse pas : il reste
// un obstacle comme avant (décision à confirmer par Max, voir TASKS.md).
import { RUE } from './blocks.js';

// Sous cette vitesse on se gare contre : l'objet reste un obstacle, comme
// avant (on ne fait pas tomber un poteau en le frôlant au pas). Cinq blocs par
// seconde, c'est le tiers de l'allure d'une rue (v395) : on le dépasse à la
// première seconde de gaz.
export const VITESSE_CASSE = 5;
// Ce que la voiture perd en le renversant, une fois par pièce : elle continue,
// un peu moins vite (GTA). Ni rebond, ni `player.choc` : le contrat des dégâts
// (v343) ne voit que les chocs que la physique publie.
export const PERTE_CASSE = 0.18;
// La chute dure un peu plus d'une demi-seconde, en temps RÉEL : c'est un geste
// qu'on regarde, pas un minuteur de jeu.
export const DUREE_CHUTE_MS = 650;
// Ce qui est tombé reste au sol au moins quarante secondes, puis se relève
// quand l'enfant est assez loin pour ne pas le voir se relever.
export const DUREE_AU_SOL_MS = 40000;
export const LOIN_RELEVE = 48;

// LES FAMILLES QUI SE CASSENT, ET COMMENT. Un fût tombe à plat (un réverbère,
// un feu) ; un bac s'écrase sur place (une jardinière). Le mobilier de la
// couche HD (terrasse, banc, colonne Morris : `MOBILIER_OBSTACLE`) n'a pas de
// maillage à lui — il vit dans les façades fusionnées du morceau — : il
// s'écrase, c'est-à-dire que le morceau se remaille sans lui.
const FACON = new Map([
  [RUE.REVERBERE, 'tombe'],
  [RUE.FEUX, 'tombe'],
  [RUE.JARDINIERE, 'ecrase'],
]);
export function faconDeCasser(id) { return FACON.get(id) || null; }
export const GENRES_HD_CASSABLES = new Set(['terrasse', 'banc', 'morris']);

// La clé d'un bloc de mobilier, celle du journal des blocs (`x,y,z`), et celle
// d'une pièce de la couche HD (une colonne de trottoir).
export const cleBloc = (x, y, z) => `${x},${y},${z}`;
export const cleHD = (x, z) => `h${x},${z}`;

// LA POSE D'UNE PIÈCE QUI TOMBE, à l'avancement `p` (0 debout, 1 au sol). Un
// fût tombe DANS LE SENS OÙ ROULAIT LA VOITURE (dx, dz, unitaire) : pivot à son
// pied, autour de l'axe horizontal perpendiculaire (a × haut = sens de chute,
// donc a = (dz, 0, −dx)). Il accélère en tombant (p²), comme un poteau. Un bac
// s'écrase : il s'aplatit et penche un peu.
export function poseDeChute(facon, dx, dz, p) {
  const q = Math.max(0, Math.min(1, p));
  if (facon === 'ecrase') return { ax: dz, az: -dx, angle: 0.3 * q, echelleY: 1 - 0.6 * q };
  return { ax: dz, az: -dx, angle: (Math.PI / 2 - 0.05) * q * q, echelleY: 1 };
}

// LE REGISTRE DE CE QUI EST TOMBÉ. `t` est l'heure (performance.now) de la
// casse ; `dx, dz` le sens de la chute ; `facon` ; `x, z` la place, pour
// savoir si l'enfant est assez loin quand elle peut se relever.
export class Casses {
  constructor() { this.m = new Map(); }
  get taille() { return this.m.size; }
  has(cle) { return this.m.has(cle); }
  get(cle) { return this.m.get(cle) || null; }
  casser(cle, info) { if (!this.m.has(cle)) this.m.set(cle, info); return this.m.get(cle); }
  // ce qui se relève maintenant : resté au sol assez longtemps ET hors de vue
  aRelever(maintenant, px, pz) {
    const out = [];
    for (const [cle, c] of this.m) {
      if (maintenant - c.t < DUREE_AU_SOL_MS) continue;
      if ((c.x - px) * (c.x - px) + (c.z - pz) * (c.z - pz) < LOIN_RELEVE * LOIN_RELEVE) continue;
      out.push(cle);
    }
    for (const cle of out) this.m.delete(cle);
    return out;
  }
  // les pièces de la couche HD tombées, par colonne (pour le mailleur)
  colonnesHD() {
    const s = new Set();
    for (const cle of this.m.keys()) if (cle[0] === 'h') s.add(cle.slice(1));
    return s;
  }
}
