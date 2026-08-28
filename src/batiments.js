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

import { BLOCK, ARCHI, DECOR_START } from './blocks.js';
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
// La palette de décor : trente couleurs à motifs. `uni(c)` est l'aplat.
const uni = (c) => DECOR_START + c * 10;
const OCRE_PISE = uni(1);        // le pisé orangé des médinas
const CREME_D = uni(28);
const ROSE_D = uni(15);
const CIEL_D = uni(9);
const MENTHE_D = uni(29);

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

  {
    id: 'colombage', nom: 'Maison à colombages', emoji: '🏘️', variantes: 24,
    // Alsace, Normandie, Tudor : un rez-de-chaussée de pierre, des étages de
    // pans de bois hourdés de torchis clair — et l'ENCORBELLEMENT : chaque
    // étage déborde d'un bloc sur la rue, c'est lui qui fait la silhouette
    // médiévale. Le toit est raide, deux fois plus haut que large.
    reglages: (d) => ({
      l: entre(d, 6, 10), p: entre(d, 6, 9), etages: entre(d, 2, 3),
      toitId: choisir(d, [TUILE, BOISF, Z]),
    }),
    bati(c, p) {
      let hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      c.murs(-hx, 0, -hz, hx, 3, hz, P);                  // le soubassement de pierre
      c.poser(0, 1, -hz, BOISF); c.poser(0, 2, -hz, BOISF);
      let y = 4;
      for (let e = 1; e < p.etages; e++) {
        hx++; hz++;                                       // l'encorbellement
        c.murs(-hx, y, -hz, hx, y + 3, hz, ARCHI.COLOMBAGE);
        for (let x = -hx + 2; x <= hx - 2; x += 3) { c.poser(x, y + 1, -hz, V); c.poser(x, y + 1, hz, V); }
        y += 4;
      }
      c.toit(-hx, -hz, hx, hz, y, p.toitId);
      c.toit(-hx + 1, -hz + 1, hx - 1, hz - 1, y + 1, p.toitId);
      c.boite(hx - 1, y + 1, 0, hx - 1, y + 4, 0, B);     // la souche de cheminée
    },
  },
  {
    id: 'brownstone', nom: 'Brownstone de New York', emoji: '🪜', variantes: 22,
    // Brooklyn, Harlem : le grès brun, le PERRON — huit marches qui montent à
    // la porte du bel étage, par-dessus le demi-sous-sol — et les fenêtres à
    // guillotine alignées en travées strictes. Toit plat à corniche.
    reglages: (d) => ({
      l: entre(d, 7, 11), p: entre(d, 9, 13), etages: entre(d, 3, 5),
      corniche: d(2) === 0,
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      const h = p.etages * 3 + 2;
      c.murs(-hx, 0, -hz, hx, h, hz, ARCHI.GRES_BRUN);
      for (let e = 0; e < p.etages; e++) {
        const y = e * 3 + 3;
        for (let x = -hx + 1; x <= hx - 1; x += 2) {
          c.poser(x, y, -hz, V); c.poser(x, y + 1, -hz, V);
          c.poser(x, y, hz, V); c.poser(x, y + 1, hz, V);
        }
      }
      // Le perron : les marches montent de la rue au premier, la porte est là.
      for (let k = 0; k < 4; k++) c.boite(-1, k, -hz - 4 + k, 1, k, -hz - 4 + k, ARCHI.GRES_BRUN);
      c.poser(0, 4, -hz, BOISF); c.poser(0, 5, -hz, BOISF);
      c.boite(-hx, h + 1, -hz, hx, h + 1, hz, p.corniche ? ARCHI.CORNICHE : Z);
    },
  },
  {
    id: 'pagode', nom: 'Pagode', emoji: '🏯', variantes: 22,
    // Japon, Chine : des toits SUPERPOSÉS qui débordent largement, chaque
    // niveau plus étroit que le précédent, et la flèche (sōrin) au sommet.
    // C'est le débord des toits qui fait la pagode, pas la hauteur.
    reglages: (d) => ({
      base: entre(d, 5, 8), niveaux: entre(d, 3, 5),
      mur: choisir(d, [B, BOISF, ARCHI.SHOJI]),
      toitId: choisir(d, [ARCHI.TUILE_GRISE, TUILE, CUIVRE]),
    }),
    bati(c, p) {
      let r = p.base, y = 0;
      for (let n = 0; n < p.niveaux; n++) {
        c.murs(-r, y, -r, r, y + 3, r, p.mur);
        for (let x = -r + 1; x <= r - 1; x += 2) { c.poser(x, y + 2, -r, V); c.poser(x, y + 2, r, V); }
        if (n === 0) { c.poser(0, y + 1, -r, BLOCK.AIR); c.poser(0, y + 2, -r, BLOCK.AIR); }
        // le toit débordant : deux blocs au-delà des murs, coins relevés
        c.boite(-r - 2, y + 4, -r - 2, r + 2, y + 4, r + 2, p.toitId);
        for (const [sx, sz] of [[-r - 2, -r - 2], [r + 2, -r - 2], [-r - 2, r + 2], [r + 2, r + 2]]) {
          c.poser(sx, y + 5, sz, p.toitId);                // le coin qui se relève
        }
        y += 5; r = Math.max(2, r - 1);
      }
      c.boite(0, y, 0, 0, y + 3, 0, BLOCK.GOLD);          // le sōrin doré
    },
  },
  {
    id: 'riad', nom: 'Riad marocain', emoji: '🕌', variantes: 20,
    // Marrakech, Fès : la maison est tournée vers DEDANS. Des murs de pisé
    // presque aveugles sur la rue, et au centre le patio — fontaine, oranger,
    // zellige au sol — sur lequel ouvrent les arcades. Toit-terrasse crénelé.
    reglages: (d) => ({
      l: entre(d, 11, 15), p: entre(d, 11, 15), etages: entre(d, 1, 2),
      oranger: d(2) === 0,
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      const h = p.etages * 4 + 3;
      c.murs(-hx, 0, -hz, hx, h, hz, OCRE_PISE);
      // le patio : un puits de lumière au centre, du zellige au sol
      const px = Math.max(2, hx - 3), pz = Math.max(2, hz - 3);
      c.boite(-px, 1, -pz, px, h + 1, pz, BLOCK.AIR);
      c.boite(-px, 0, -pz, px, 0, pz, ARCHI.ZELLIGE);
      c.poser(0, 1, 0, BLOCK.WATER);                       // la vasque
      if (p.oranger) { c.poser(px - 1, 1, pz - 1, BOISF); c.poser(px - 1, 2, pz - 1, BLOCK.LEAVES); }
      // les arcades du patio, et la porte cloutée sur la rue
      for (let x = -px + 1; x <= px - 1; x += 2) { c.poser(x, 2, -pz, BLOCK.AIR); c.poser(x, 2, pz, BLOCK.AIR); }
      c.poser(0, 1, -hz, BOISF); c.poser(0, 2, -hz, BOISF);
      // le toit-terrasse et ses merlons
      c.boite(-hx, h + 1, -hz, hx, h + 1, hz, OCRE_PISE);
      c.boite(-px, h + 1, -pz, px, h + 1, pz, BLOCK.AIR);
      for (let x = -hx; x <= hx; x += 2) { c.poser(x, h + 2, -hz, OCRE_PISE); c.poser(x, h + 2, hz, OCRE_PISE); }
      for (let z = -hz; z <= hz; z += 2) { c.poser(-hx, h + 2, z, OCRE_PISE); c.poser(hx, h + 2, z, OCRE_PISE); }
    },
  },
  {
    id: 'gothique', nom: 'Église gothique', emoji: '⛪', variantes: 24,
    // Une nef haute et étroite, des fenêtres en vitrail sur toute la hauteur,
    // le clocher-porche à flèche en façade, et des contreforts qui épaulent
    // les murs — c'est eux qui font tenir la pierre, et la silhouette.
    reglages: (d) => ({
      l: entre(d, 9, 13), p: entre(d, 17, 25), fleche: entre(d, 8, 14),
      pierre: choisir(d, [P, PB, S]),
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      const h = 11;
      c.murs(-hx, 0, -hz, hx, h, hz, p.pierre);
      // les vitraux : lancettes de trois blocs, une travée sur deux
      for (let z = -hz + 2; z <= hz - 2; z += 3) {
        for (let y = 3; y <= 8; y++) { c.poser(-hx, y, z, ARCHI.VITRAIL); c.poser(hx, y, z, ARCHI.VITRAIL); }
      }
      // les contreforts, au droit des travées pleines
      for (let z = -hz; z <= hz; z += 3) {
        c.boite(-hx - 1, 0, z, -hx - 1, 7, z, p.pierre);
        c.boite(hx + 1, 0, z, hx + 1, 7, z, p.pierre);
      }
      c.toit(-hx, -hz, hx, hz, h + 1, Z);
      // le clocher-porche et sa flèche
      c.murs(-3, 0, -hz - 6, 3, h + 4, -hz, p.pierre);
      c.boite(-1, 1, -hz - 6, 1, 3, -hz - 6, BLOCK.AIR);   // le portail
      c.poser(0, h + 2, -hz - 3, ARCHI.VITRAIL);           // la rosace
      c.cone(0, -hz - 3, 3.4, 0.5, h + 5, h + 5 + p.fleche, Z);
    },
  },
  {
    id: 'mosquee', nom: 'Mosquée', emoji: '🕌', variantes: 20,
    // Une salle sous coupole, la cour à arcades, et le MINARET — la tour fine
    // d'où l'appel se lance, toujours plus haute que la coupole.
    reglages: (d) => ({
      l: entre(d, 11, 17), minaret: entre(d, 12, 18),
      pierre: choisir(d, [S, PB, CREME_D]),
      coupole: choisir(d, [CUIVRE, BLOCK.GOLD, Z]),
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2);
      c.murs(-hx, 0, -hx, hx, 6, hx, p.pierre);
      for (let x = -hx + 1; x <= hx - 1; x += 2) { c.poser(x, 2, -hx, BLOCK.AIR); }
      c.boite(-hx, 7, -hx, hx, 7, hx, p.pierre);
      c.dome(0, 8, 0, hx - 1, p.coupole);
      // le minaret : fût, balcon du muezzin, lanternon
      const mx = hx + 3;
      c.cylindre(mx, mx, 1.4, 0, p.minaret, p.pierre, false);
      c.boite(mx - 2, p.minaret, mx - 2, mx + 2, p.minaret, mx + 2, p.pierre);
      c.cylindre(mx, mx, 1, p.minaret + 1, p.minaret + 3, p.pierre, false);
      c.dome(mx, p.minaret + 4, mx, 1.6, p.coupole);
    },
  },
  {
    id: 'templegrec', nom: 'Temple grec', emoji: '🏛️', variantes: 16,
    // Le périptère : la colonnade qui fait tout le tour, posée sur trois
    // marches, sous un fronton triangulaire à chaque bout. Les proportions
    // font tout — six colonnes de front, deux fois plus sur le flanc.
    reglages: (d) => ({
      front: choisir(d, [6, 8]), flanc: entre(d, 11, 15),
      pierre: choisir(d, [PB, S]),
    }),
    bati(c, p) {
      const hx = p.front + 1, hz = p.flanc + 1;
      for (let k = 0; k < 3; k++) c.boite(-hx - 2 + k, k, -hz - 2 + k, hx + 2 - k, k, hz + 2 - k, p.pierre);
      for (let x = -hx; x <= hx; x += 2) for (const z of [-hz, hz]) c.boite(x, 3, z, x, 8, z, p.pierre);
      for (let z = -hz; z <= hz; z += 2) for (const x of [-hx, hx]) c.boite(x, 3, z, x, 8, z, p.pierre);
      c.murs(-hx + 2, 3, -hz + 3, hx - 2, 8, hz - 3, p.pierre);   // la cella
      c.boite(-hx, 9, -hz, hx, 9, hz, p.pierre);                  // l'architrave
      // les frontons, et le toit à deux pentes très douces
      for (let k = 0; k <= 3; k++) {
        c.boite(-hx + k * 2, 10 + k, -hz, hx - k * 2, 10 + k, -hz, p.pierre);
        c.boite(-hx + k * 2, 10 + k, hz, hx - k * 2, 10 + k, hz, p.pierre);
        c.boite(-hx + k * 2, 10 + k, -hz, -hx + k * 2, 10 + k, hz, TUILE);
        c.boite(hx - k * 2, 10 + k, -hz, hx - k * 2, 10 + k, hz, TUILE);
      }
    },
  },
  {
    id: 'chalet', nom: 'Chalet alpin', emoji: '🏔️', variantes: 22,
    // Un socle de pierre contre la pente, un corps de madriers sombres, le
    // BALCON FILANT sous l'avant-toit — et un toit à faible pente qui déborde
    // largement, fait pour porter la neige.
    reglages: (d) => ({
      l: entre(d, 9, 13), p: entre(d, 7, 11),
      fleurs: d(2) === 0,
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      c.murs(-hx, 0, -hz, hx, 2, hz, P);                   // le socle
      c.murs(-hx, 3, -hz, hx, 8, hz, BOISF);
      for (let x = -hx + 2; x <= hx - 2; x += 3) { c.poser(x, 5, -hz, V); c.poser(x, 5, hz, V); }
      c.poser(0, 3, -hz, BLOCK.AIR); c.poser(0, 4, -hz, BLOCK.AIR);
      // le balcon filant, et ses bacs de géraniums
      c.boite(-hx, 5, -hz - 1, hx, 5, -hz - 1, BOIS);
      if (p.fleurs) for (let x = -hx + 1; x <= hx - 1; x += 2) c.poser(x, 6, -hz - 1, BLOCK.WOOL_RED);
      // le grand toit débordant, pente douce
      for (let k = 0; k <= Math.ceil(hz / 2) + 1; k++) {
        c.boite(-hx - 2, 9 + k, -hz - 2 + k * 2, hx + 2, 9 + k, -hz - 2 + k * 2 + 1, BOISF);
        c.boite(-hx - 2, 9 + k, hz + 2 - k * 2 - 1, hx + 2, 9 + k, hz + 2 - k * 2, BOISF);
      }
    },
  },
  {
    id: 'canal', nom: 'Maison de canal', emoji: '🏚️', variantes: 22,
    // Amsterdam : étroite (l'impôt se payait à la largeur), haute, presque
    // toute en fenêtres — et le PIGNON dessiné qui monte en cloche ou en
    // redans, avec la potence de levage qui hisse les meubles par la façade.
    reglages: (d) => ({
      l: entre(d, 5, 7), p: entre(d, 8, 12), etages: entre(d, 3, 5),
      brique: choisir(d, [B, BLOCK.DARKBRICK, ARCHI.GRES_BRUN]),
      redans: d(2) === 0,
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      const h = p.etages * 3 + 2;
      c.murs(-hx, 0, -hz, hx, h, hz, p.brique);
      for (let e = 0; e < p.etages; e++) {
        const y = e * 3 + 2;
        for (let x = -hx + 1; x <= hx - 1; x++) { c.poser(x, y, -hz, V); c.poser(x, y + 1, -hz, V); }
      }
      c.poser(0, 1, -hz, BOISF); c.poser(0, 2, -hz, BOISF);
      // le pignon : en redans (escalier) ou en cloche, sur la rue
      for (let k = 0; k <= hx; k++) {
        const yk = h + 1 + (p.redans ? k : Math.round(Math.sqrt(k) * 1.6));
        c.boite(-hx + k, h + 1, -hz, -hx + k, yk, -hz, p.brique);
        c.boite(hx - k, h + 1, -hz, hx - k, yk, -hz, p.brique);
      }
      c.toit(-hx, -hz, hx, hz, h + 1, Z);
      // la potence de levage, au faîte du pignon
      c.boite(0, h + hx + 1, -hz - 1, 0, h + hx + 1, -hz, BOISF);
    },
  },
  {
    id: 'artdeco', nom: 'Gratte-ciel Art déco', emoji: '🌇', variantes: 20,
    // New York 1930 : le zoning impose les RETRAITS — la tour monte en
    // gradins comme un gâteau — et le calcaire clair porte des bandes
    // verticales qui filent vers le couronnement en flèche.
    reglages: (d) => ({
      base: entre(d, 8, 11), gradins: entre(d, 3, 4), parGradin: entre(d, 5, 8),
      pierre: choisir(d, [S, PB]),
    }),
    bati(c, p) {
      let r = p.base, y = 0;
      for (let g = 0; g < p.gradins; g++) {
        for (let e = 0; e < p.parGradin; e++) {
          for (let k = 0; k < 3; k++, y++) {
            for (let x = -r; x <= r; x++) for (const z of [-r, r]) c.poser(x, y, z, (x % 2 === 0) ? p.pierre : (k === 2 ? p.pierre : V));
            for (let z = -r; z <= r; z++) for (const x of [-r, r]) c.poser(x, y, z, (z % 2 === 0) ? p.pierre : (k === 2 ? p.pierre : V));
          }
        }
        c.boite(-r, y, -r, r, y, r, p.pierre);
        r = Math.max(2, r - 2);
      }
      c.cone(0, 0, 2.4, 0.4, y, y + 7, p.pierre);
      c.boite(0, y + 7, 0, 0, y + 10, 0, BLOCK.GOLD);      // la flèche
      c.boite(-1, 1, -p.base, 1, 3, -p.base, BLOCK.AIR);   // le hall
    },
  },
  {
    id: 'phare', nom: 'Phare', emoji: '🗼', variantes: 14,
    // Un fût conique rayé de deux couleurs, la galerie, la lanterne vitrée —
    // et la maison du gardien blottie au pied.
    reglages: (d) => ({
      haut: entre(d, 14, 22),
      raye1: choisir(d, [BLOCK.WOOL_RED, BLOCK.DARKBRICK, BLOCK.WOOL_BLUE]),
    }),
    bati(c, p) {
      for (let y = 0; y <= p.haut; y++) {
        const r = 3.4 - (y / p.haut) * 1.4;
        c.cylindre(0, 0, r, y, y, Math.floor(y / 3) % 2 === 0 ? PB : p.raye1, true);
      }
      c.boite(-3, p.haut + 1, -3, 3, p.haut + 1, 3, P);    // la galerie
      c.murs(-2, p.haut + 2, -2, 2, p.haut + 4, 2, V);     // la lanterne
      c.poser(0, p.haut + 3, 0, BLOCK.GOLD);               // le feu
      c.dome(0, p.haut + 5, 0, 2.6, CUIVRE);
      c.murs(4, 0, -3, 10, 4, 3, PB);                       // la maison du gardien
      c.toit(4, -3, 10, 3, 5, TUILE);
      c.poser(7, 1, -3, BLOCK.AIR); c.poser(7, 2, -3, BLOCK.AIR);
    },
  },
  {
    id: 'moulin', nom: 'Moulin à vent', emoji: '🌬️', variantes: 14,
    // Hollandais : le tronc conique de brique, la calotte de bois qui
    // s'oriente au vent, la galerie à mi-hauteur — et les quatre AILES en
    // croix, le trait que tout le monde reconnaît.
    reglages: (d) => ({
      haut: entre(d, 9, 13),
      corps: choisir(d, [B, BOISF, BLOCK.DARKBRICK]),
    }),
    bati(c, p) {
      c.cone(0, 0, 4.4, 2.6, 0, p.haut, p.corps, true);
      c.poser(0, 1, -4, BLOCK.AIR); c.poser(0, 2, -4, BLOCK.AIR);
      c.boite(-5, Math.floor(p.haut / 2), -5, 5, Math.floor(p.haut / 2), 5, BOIS);  // la galerie
      c.dome(0, p.haut + 1, 0, 2.8, BOISF);                // la calotte
      // les ailes : une croix de bois inclinée devant la calotte
      const ay = p.haut + 1;
      for (let k = 1; k <= 6; k++) {
        c.poser(0, ay + k, -3, BOIS); c.poser(-1, ay + k, -3, BOIS);
        c.poser(0, ay - k, -3, BOIS); c.poser(1, ay - k, -3, BOIS);
        c.poser(k, ay, -3, BOIS); c.poser(k, ay + 1, -3, BOIS);
        c.poser(-k, ay, -3, BOIS); c.poser(-k, ay - 1, -3, BOIS);
      }
    },
  },
  {
    id: 'gare2', nom: 'Gare', emoji: '🚉', variantes: 18,
    // Une halle voûtée de verre et d'acier sur toute la longueur des quais,
    // et le pavillon d'accueil en pierre avec sa grande HORLOGE — le rendez-
    // vous de toutes les gares du monde.
    reglages: (d) => ({
      long: entre(d, 15, 23), larg: entre(d, 9, 13),
      pierre: choisir(d, [P, B, S]),
    }),
    bati(c, p) {
      const hx = Math.floor(p.larg / 2), hz = Math.floor(p.long / 2);
      // la halle : arceaux d'acier, verrière entre les arcs
      for (let z = -hz; z <= hz; z += 3) {
        for (let x = -hx; x <= hx; x++) {
          const y = 6 + Math.round(Math.sqrt(Math.max(0, (hx * hx - x * x))) * 0.5);
          c.poser(x, y, z, O);
          if (z + 3 <= hz) for (let dz = 1; dz < 3; dz++) c.poser(x, y, z + dz, V);
        }
        c.boite(-hx, 0, z, -hx, 5, z, O); c.boite(hx, 0, z, hx, 5, z, O);
      }
      // le pavillon d'accueil, en tête, et son horloge
      c.murs(-hx - 1, 0, -hz - 7, hx + 1, 8, -hz, p.pierre);
      c.boite(-2, 1, -hz - 7, 2, 4, -hz - 7, BLOCK.AIR);
      c.poser(0, 6, -hz - 7, BLOCK.GOLD);                  // l'horloge
      c.boite(-hx - 1, 9, -hz - 7, hx + 1, 9, -hz, Z);
    },
  },
  {
    id: 'hanok', nom: 'Maison d’Asie', emoji: '🎎', variantes: 20,
    // Hanok coréen, minka japonaise : un soubassement bas, des murs de bois
    // et de papier (les panneaux coulissants), et le toit de tuiles grises
    // incurvé qui déborde sur une galerie tout autour.
    reglages: (d) => ({
      l: entre(d, 9, 13), p: entre(d, 7, 10),
      mur: choisir(d, [ARCHI.SHOJI, BOIS, BOISF]),
    }),
    bati(c, p) {
      const hx = Math.floor(p.l / 2), hz = Math.floor(p.p / 2);
      c.boite(-hx - 1, 0, -hz - 1, hx + 1, 0, hz + 1, P);  // le soubassement
      c.murs(-hx, 1, -hz, hx, 4, hz, p.mur);
      for (let x = -hx + 1; x <= hx - 1; x += 2) { c.poser(x, 2, -hz, ARCHI.SHOJI); }
      c.poser(0, 1, -hz, BLOCK.AIR); c.poser(0, 2, -hz, BLOCK.AIR);
      // la galerie : le plancher qui déborde, sous l'avant-toit
      for (const z of [-hz - 1, hz + 1]) c.boite(-hx - 1, 1, z, hx + 1, 1, z, BOIS);
      // le toit incurvé : large en bas, qui se redresse vers le faîte
      const niveaux = Math.ceil(hz / 2) + 2;
      for (let k = 0; k < niveaux; k++) {
        const dz = hz + 2 - k * 2;
        if (dz < 0) break;
        c.boite(-hx - 2 + k, 5 + k, -dz, hx + 2 - k, 5 + k, -Math.max(0, dz - 1), ARCHI.TUILE_GRISE);
        c.boite(-hx - 2 + k, 5 + k, Math.max(0, dz - 1), hx + 2 - k, 5 + k, dz, ARCHI.TUILE_GRISE);
      }
    },
  },
  {
    id: 'shophouse', nom: 'Shophouse', emoji: '🏮', variantes: 22,
    // Singapour, Hanoï, Penang : étroite et profonde, un commerce sous
    // arcade au rez-de-chaussée (le « five-foot way » où l'on marche à
    // l'ombre), des volets hauts en couleurs, un fronton chantourné.
    reglages: (d) => ({
      p: entre(d, 9, 13), etages: entre(d, 2, 3),
      teinte: choisir(d, [ROSE_D, CIEL_D, MENTHE_D, CREME_D, BLOCK.WOOL_YELLOW]),
    }),
    bati(c, p) {
      const hx = 3, hz = Math.floor(p.p / 2);
      const h = p.etages * 3 + 3;
      c.murs(-hx, 0, -hz, hx, h, hz, p.teinte);
      // l'arcade du rez-de-chaussée : deux piliers, la galerie ouverte
      c.boite(-hx + 1, 1, -hz, hx - 1, 3, -hz, BLOCK.AIR);
      c.boite(-hx + 1, 1, -hz + 1, hx - 1, 3, -hz + 1, BLOCK.AIR);
      for (const x of [-hx, hx]) c.boite(x, 1, -hz, x, 3, -hz, PB);
      for (let e = 1; e <= p.etages; e++) {
        const y = e * 3 + 1;
        for (let x = -hx + 1; x <= hx - 1; x += 2) { c.poser(x, y, -hz, BOISF); c.poser(x, y + 1, -hz, V); }
      }
      // le fronton chantourné, au sommet de la façade
      c.boite(-hx, h + 1, -hz, hx, h + 1, -hz, p.teinte);
      c.boite(-1, h + 2, -hz, 1, h + 2, -hz, p.teinte);
      c.toit(-hx, -hz, hx, hz, h + 1, TUILE);
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
