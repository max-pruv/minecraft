// Les familles de bâtiments : trois cents maisons sans écrire trois cents fichiers.
//
// POURQUOI DES FAMILLES PLUTÔT QUE DES BÂTIMENTS. Max en voulait « à peu près
// trois cents ». Les vingt-et-un monuments de `monuments.js` sont écrits un par
// un, et c'est justifié : la Tour Eiffel mérite ses quatre piliers évasés et ses
// deux plateformes aux bons tiers. Mais un immeuble de rue ne mérite pas qu'on
// l'écrive à la main, et trois cents fichiers à la main, ce sont des semaines
// pour un résultat moins varié qu'une famille bien paramétrée.
//
// Une famille est un dessin à trous : « un immeuble haussmannien » sait où vont
// la devanture, l'entresol, l'étage noble et son balcon, la corniche et le
// comble en zinc. Ce qu'on lui donne, c'est la largeur, la profondeur, le nombre
// d'étages et la pierre. Douze réglages donnent des dizaines de bâtiments
// vraiment différents — pas la même boîte repeinte.
//
// LA VARIANTE EST UN NUMÉRO, PAS UN HASARD. `variante(f, 7)` rend toujours
// exactement le même bâtiment. Un enfant qui aime le septième modèle le
// retrouve demain, et un témoin d'essai peut le comparer d'une version à
// l'autre. C'est pour cela qu'on tire les réglages d'une suite déterministe et
// non de Math.random.

import { BLOCK, ARCHI } from './blocks.js';
import { Chantier } from './monuments.js';

// --- la palette --------------------------------------------------------------

const P = BLOCK.STONEBRICK;      // pierre de taille
const PB = BLOCK.WHITEBRICK;     // pierre blanche
const B = BLOCK.BRICK;           // brique rouge
const S = BLOCK.SANDSTONE;       // calcaire chaud
const BOIS = BLOCK.PLANK;        // bois clair
const BOISF = BLOCK.DARKPLANK;   // bois sombre
const V = BLOCK.GLASS;           // verre
const Z = BLOCK.SLAB_STONE;      // zinc, ardoise
const O = BLOCK.OBSIDIAN;        // acier sombre
const TUILE = BLOCK.WOOL_RED;    // tuile
const CUIVRE = BLOCK.WOOL_GREEN; // cuivre oxydé

// Une suite déterministe : même numéro, même bâtiment, toujours. On mélange les
// bits plutôt que d'enchaîner des modulos, sinon deux réglages voisins varient
// ensemble et toutes les variantes se ressemblent par paquets.
function des(graine) {
  let x = (graine * 2654435761) >>> 0;
  return (n) => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    return x % n;
  };
}
const choisir = (d, liste) => liste[d(liste.length)];
const entre = (d, a, b) => a + d(b - a + 1);

// --- les familles ------------------------------------------------------------

export const FAMILLES = [
  {
    id: 'maison', nom: 'Maison de village', emoji: '🏠', variantes: 44,
    // Ce qu'un enfant dessine quand on lui dit « une maison » : quatre murs, des
    // fenêtres, une porte, un toit en pente. La variété vient des proportions et
    // du matériau, pas d'un gadget en plus.
    reglages: (d) => ({
      l: entre(d, 5, 11), p: entre(d, 5, 10), etages: entre(d, 1, 2),
      mur: choisir(d, [BOIS, B, PB, S, BOISF]),
      toitId: choisir(d, [TUILE, Z, BOISF]),
      cheminee: d(2) === 0,
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      const h = p.etages * 4;
      c.murs(-hx, 0, -hz, hx, h, hz, p.mur);
      // Les fenêtres : une par façade et par étage, à hauteur d'œil.
      for (let e = 0; e < p.etages; e++) {
        const y = e * 4 + 2;
        for (let x = -hx + 2; x <= hx - 2; x += 3) {
          c.poser(x, y, -hz, V); c.poser(x, y, hz, V);
        }
        for (let z = -hz + 2; z <= hz - 2; z += 3) {
          c.poser(-hx, y, z, V); c.poser(hx, y, z, V);
        }
      }
      // La porte, toujours au milieu de la façade avant : c'est par là qu'on
      // entre, et un enfant doit pouvoir entrer.
      c.poser(0, 1, -hz, BLOCK.AIR); c.poser(0, 2, -hz, BLOCK.AIR);
      c.boite(-hx, 0, -hz, hx, 0, hz, BLOCK.SLAB_PLANK);   // le plancher
      c.toit(-hx, -hz, hx, hz, h + 1, p.toitId);
      if (p.cheminee) c.boite(hx - 2, h + 1, 0, hx - 2, h + 4, 0, B);
    },
  },
  {
    id: 'haussmann', nom: 'Immeuble haussmannien', emoji: '🏢', variantes: 48,
    // La façade parisienne a une grammaire, et elle est déjà dessinée dans
    // l'atlas depuis v152 : devanture, entresol, étage noble à balcon, étages
    // courants, corniche, comble en zinc. On ne fait que l'empiler dans le bon
    // ordre — c'est cet ordre-là qui fait « Paris » plutôt que « immeuble ».
    reglages: (d) => ({
      l: entre(d, 9, 17), p: entre(d, 8, 13), etages: entre(d, 4, 7),
      commerce: d(3) !== 0, angle: d(2) === 0,
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      let y = 0;
      const registre = (haut, id) => {
        for (let k = 0; k < haut; k++, y++) {
          for (let x = -hx; x <= hx; x++) { c.poser(x, y, -hz, id); c.poser(x, y, hz, id); }
          for (let z = -hz; z <= hz; z++) { c.poser(-hx, y, z, id); c.poser(hx, y, z, id); }
        }
      };
      registre(3, p.commerce ? ARCHI.VITRINE : ARCHI.PORTE);   // rez-de-chaussée
      registre(2, ARCHI.ENTRESOL);                              // entresol
      registre(3, ARCHI.NOBLE);                                 // l'étage noble
      for (let e = 0; e < p.etages - 1; e++) registre(3, ARCHI.ETAGE);
      registre(1, ARCHI.CORNICHE);
      registre(3, ARCHI.MANSARDE);
      // Le terrasson : le zinc presque plat qui coiffe le comble.
      c.boite(-hx, y, -hz, hx, y, hz, ARCHI.ZINC_LISSE);
      // Le chaînage d'angle en pierre de taille, du sol à la corniche.
      if (p.angle) {
        for (const sx of [-hx, hx]) for (const sz of [-hz, hz]) {
          c.boite(sx, 0, sz, sx, y - 4, sz, ARCHI.CHAINAGE);
        }
      }
      c.poser(0, 1, -hz, ARCHI.PORTE); c.poser(0, 2, -hz, ARCHI.PORTE);
    },
  },
  {
    id: 'tour', nom: 'Tour de bureaux', emoji: '🏙️', variantes: 38,
    // Le verre et l'acier : ce qui pousse à La Défense et à Manhattan. La
    // variété tient au retrait — l'étage qui rétrécit en montant — parce que
    // c'est lui qui fait la silhouette, bien plus que la couleur du verre.
    reglages: (d) => ({
      l: entre(d, 9, 15), etages: entre(d, 10, 26),
      retrait: d(3), ossature: choisir(d, [O, P, BLOCK.DARKBRICK]),
      antenne: d(2) === 0,
    }),
    bati(c, p) {
      let hx = Math.floor(p.l / 2), hz = hx;
      let y = 0;
      for (let e = 0; e < p.etages; e++) {
        // Le retrait : tous les huit étages, la tour rentre d'un bloc.
        if (p.retrait && e > 0 && e % (10 - p.retrait * 2) === 0 && hx > 3) { hx--; hz--; }
        for (let k = 0; k < 3; k++, y++) {
          const id = k === 2 ? p.ossature : V;   // le nez de dalle entre deux vitrages
          for (let x = -hx; x <= hx; x++) { c.poser(x, y, -hz, id); c.poser(x, y, hz, id); }
          for (let z = -hz; z <= hz; z++) { c.poser(-hx, y, z, id); c.poser(hx, y, z, id); }
        }
        for (const sx of [-hx, hx]) for (const sz of [-hz, hz]) {
          c.boite(sx, y - 3, sz, sx, y, sz, p.ossature);
        }
      }
      c.boite(-hx, y, -hz, hx, y, hz, p.ossature);
      if (p.antenne) c.boite(0, y + 1, 0, 0, y + 8, 0, O);
    },
  },
  {
    id: 'hotel', nom: 'Hôtel', emoji: '🏨', variantes: 32,
    reglages: (d) => ({
      l: entre(d, 13, 21), p: entre(d, 9, 14), etages: entre(d, 4, 8),
      mur: choisir(d, [PB, S, B, P]), marquise: d(2) === 0,
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      const h = p.etages * 4 + 4;
      c.murs(-hx, 0, -hz, hx, h, hz, p.mur);
      // Les chambres : deux fenêtres par travée, alignées sur toute la hauteur.
      for (let e = 1; e <= p.etages; e++) {
        const y = e * 4;
        for (let x = -hx + 2; x <= hx - 2; x += 2) {
          c.poser(x, y, -hz, V); c.poser(x, y + 1, -hz, V);
          c.poser(x, y, hz, V); c.poser(x, y + 1, hz, V);
        }
      }
      // Le hall vitré du rez-de-chaussée, et la marquise au-dessus de l'entrée.
      for (let x = -hx + 1; x <= hx - 1; x++) for (let y = 1; y <= 3; y++) c.poser(x, y, -hz, V);
      c.poser(0, 1, -hz, BLOCK.AIR); c.poser(0, 2, -hz, BLOCK.AIR);
      if (p.marquise) c.boite(-3, 4, -hz - 2, 3, 4, -hz, CUIVRE);
      c.boite(-hx, h + 1, -hz, hx, h + 1, hz, Z);
    },
  },
  {
    id: 'boutique', nom: 'Boutique', emoji: '🏪', variantes: 30,
    reglages: (d) => ({
      l: entre(d, 5, 9), p: entre(d, 5, 8),
      mur: choisir(d, [B, BOIS, PB, S]),
      store: choisir(d, [BLOCK.WOOL_RED, BLOCK.WOOL_GREEN, BLOCK.WOOL_BLUE, BLOCK.WOOL_YELLOW]),
      etage: d(2) === 0,
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      const h = p.etage ? 8 : 5;
      c.murs(-hx, 0, -hz, hx, h, hz, p.mur);
      for (let x = -hx + 1; x <= hx - 1; x++) for (let y = 1; y <= 3; y++) c.poser(x, y, -hz, ARCHI.VITRINE);
      c.poser(0, 1, -hz, BLOCK.AIR); c.poser(0, 2, -hz, BLOCK.AIR);
      // Le store : ce qui fait qu'on reconnaît un commerce de loin.
      c.boite(-hx, 4, -hz - 1, hx, 4, -hz - 1, p.store);
      if (p.etage) for (let x = -hx + 1; x <= hx - 1; x += 2) c.poser(x, 6, -hz, V);
      c.boite(-hx, h + 1, -hz, hx, h + 1, hz, Z);
    },
  },
  {
    id: 'ecole', nom: 'École', emoji: '🏫', variantes: 26,
    reglages: (d) => ({
      l: entre(d, 17, 27), p: entre(d, 11, 16), etages: entre(d, 1, 3),
      mur: choisir(d, [B, PB, S]), preau: d(2) === 0,
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      const h = p.etages * 4 + 2;
      c.murs(-hx, 0, -hz, hx, h, hz, p.mur);
      // Les grandes fenêtres d'une salle de classe : larges, pas des meurtrières.
      for (let e = 0; e < p.etages; e++) {
        const y = e * 4 + 2;
        for (let x = -hx + 2; x <= hx - 2; x++) {
          if ((x + hx) % 4 === 0) continue;
          c.poser(x, y, -hz, V); c.poser(x, y + 1, -hz, V);
          c.poser(x, y, hz, V); c.poser(x, y + 1, hz, V);
        }
      }
      c.boite(-1, 1, -hz, 1, 3, -hz, BLOCK.AIR);      // le grand portail
      c.boite(-hx, h + 1, -hz, hx, h + 1, hz, Z);
      // Le préau : le toit sous lequel on joue quand il pleut.
      if (p.preau) {
        c.boite(-hx, 4, hz + 1, hx, 4, hz + 5, Z);
        for (const x of [-hx, 0, hx]) c.boite(x, 0, hz + 5, x, 3, hz + 5, P);
      }
    },
  },
  {
    id: 'pavillon', nom: 'Pavillon de banlieue', emoji: '🏡', variantes: 34,
    reglages: (d) => ({
      l: entre(d, 7, 12), p: entre(d, 7, 11),
      mur: choisir(d, [PB, S, BOIS, B]),
      toitId: choisir(d, [TUILE, Z, BOISF]),
      garage: d(2) === 0, veranda: d(3) === 0,
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      c.murs(-hx, 0, -hz, hx, 7, hz, p.mur);
      for (const y of [2, 5]) {
        for (let x = -hx + 2; x <= hx - 2; x += 3) { c.poser(x, y, -hz, V); c.poser(x, y, hz, V); }
        for (let z = -hz + 2; z <= hz - 2; z += 3) { c.poser(-hx, y, z, V); c.poser(hx, y, z, V); }
      }
      c.poser(0, 1, -hz, BLOCK.AIR); c.poser(0, 2, -hz, BLOCK.AIR);
      c.toit(-hx, -hz, hx, hz, 8, p.toitId);
      if (p.garage) {
        c.murs(hx + 1, 0, -hz, hx + 6, 4, hz - 3, p.mur);
        c.boite(hx + 2, 1, -hz, hx + 5, 3, -hz, BLOCK.AIR);
        c.boite(hx + 1, 5, -hz, hx + 6, 5, hz - 3, p.toitId);
      }
      if (p.veranda) {
        c.murs(-hx, 0, hz + 1, hx, 4, hz + 5, V);
        c.boite(-hx, 5, hz + 1, hx, 5, hz + 5, Z);
      }
    },
  },
  {
    id: 'ferme', nom: 'Ferme', emoji: '🚜', variantes: 28,
    reglages: (d) => ({
      l: entre(d, 11, 17), p: entre(d, 9, 14),
      mur: choisir(d, [BOISF, B, S]), silo: d(2) === 0,
      grange: choisir(d, [TUILE, BOISF, Z]),
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      // La grange : haute et ouverte, c'est ce qui distingue une ferme d'une
      // grosse maison. Le grand portail va du sol jusque sous le toit.
      c.murs(-hx, 0, -hz, hx, 9, hz, p.mur);
      c.boite(-2, 1, -hz, 2, 6, -hz, BLOCK.AIR);
      for (let z = -hz + 2; z <= hz - 2; z += 3) { c.poser(-hx, 5, z, V); c.poser(hx, 5, z, V); }
      c.toit(-hx, -hz, hx, hz, 10, p.grange);
      if (p.silo) {
        c.cylindre(hx + 5, 0, 3, 0, 14, P, true);
        c.dome(hx + 5, 15, 0, 3, Z);
      }
      // La cour, en terre battue : elle donne l'échelle et sépare de la rue.
      c.boite(-hx - 4, 0, -hz - 8, hx + 4, 0, -hz - 1, BLOCK.GRAVEL);
    },
  },
];

// --- le catalogue ------------------------------------------------------------

// Combien de bâtiments la bibliothèque propose vraiment.
export const NB_BATIMENTS = FAMILLES.reduce((n, f) => n + f.variantes, 0);

// Une variante bâtie, gardée en mémoire : feuilleter la bibliothèque ne doit
// pas rebâtir dix fois le même immeuble.
const cache = new Map();

export function batimentVariante(familleId, n) {
  const cle = `${familleId}#${n}`;
  if (cache.has(cle)) return cache.get(cle);
  const f = FAMILLES.find((x) => x.id === familleId);
  if (!f) return null;
  const idx = ((n % f.variantes) + f.variantes) % f.variantes;
  const c = new Chantier();
  const p = f.reglages(des(idx + 1));
  f.bati(c, p);
  const fait = {
    id: cle, nom: `${f.nom} nº${idx + 1}`, emoji: f.emoji,
    famille: f.id, variante: idx, reglages: p, ...c.finir(),
  };
  cache.set(cle, fait);
  return fait;
}
