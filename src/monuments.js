// La bibliothèque de monuments : des bâtiments entiers, posés comme une brique.
//
// Un enfant choisit la Tour Eiffel dans son inventaire, la pose devant lui, et
// elle est là. C'est tout le contrat.
//
// L'ÉCHELLE. Le monde plafonne à cent soixante blocs, dont une centaine
// au-dessus du sol. À échelle unique, la Tour Eiffel (324 m) ne rentrerait pas,
// ou alors la Maison-Blanche (20 m) ferait deux blocs de haut et n'aurait plus
// ni colonnes ni fronton. Chaque monument a donc SA propre échelle, choisie
// pour qu'il soit aussi grand que possible tout en gardant ses détails — comme
// une boîte de maquettes, où le voilier et la cathédrale ne sont pas au même
// millième. Le champ `metresParBloc` la dit, pour que ce soit un choix affiché
// et non un hasard.
//
// LA FIDÉLITÉ. Chaque monument porte ses vraies proportions en commentaire —
// hauteur, largeur, nombre d'étages — et le dessin s'y tient. C'est ce qui
// sépare « une tour en treillis » de « la Tour Eiffel » : les quatre piliers
// évasés, les deux plateformes aux bons tiers, l'arche du premier étage.

import { BLOCK, ARCHI, CITY_BLOCK } from './blocks.js';

// --- l'atelier ---------------------------------------------------------------

// De quoi écrire un bâtiment sans compter les blocs un par un. Tout est en
// coordonnées locales : x vers la droite, y vers le haut, z vers le fond, et
// l'origine au centre de l'emprise, au sol.
export class Chantier {
  constructor() {
    this.blocs = new Map();   // "x,y,z" -> id
  }

  poser(x, y, z, id) {
    if (id === undefined || id === BLOCK.AIR) return;
    this.blocs.set(`${Math.round(x)},${Math.round(y)},${Math.round(z)}`, id);
  }

  // Un pavé plein, bornes comprises.
  boite(x0, y0, z0, x1, y1, z1, id) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) this.poser(x, y, z, id);
      }
    }
  }

  // Les quatre murs et rien dedans : c'est ce qui rend un bâtiment visitable,
  // et ce qui évite de poser dix mille blocs pour un volume qu'on ne voit pas.
  murs(x0, y0, z0, x1, y1, z1, id) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
          const bord = x === x0 || x === x1 || z === z0 || z === z1
            || y === y0 || y === y1;
          if (bord) this.poser(x, y, z, id);
        }
      }
    }
  }

  // Un cylindre debout, plein ou creux.
  cylindre(cx, cz, r, y0, y1, id, creux = false) {
    for (let y = y0; y <= y1; y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
          const d = Math.hypot(x - cx, z - cz);
          if (d > r) continue;
          if (creux && d < r - 1) continue;
          this.poser(x, y, z, id);
        }
      }
    }
  }

  // Un tronc de cône : le rayon passe de r0 à r1 entre y0 et y1. C'est la
  // forme des flèches, des piliers évasés et des coupoles.
  cone(cx, cz, r0, r1, y0, y1, id, creux = false) {
    const h = Math.max(1, y1 - y0);
    for (let y = y0; y <= y1; y++) {
      const r = r0 + (r1 - r0) * ((y - y0) / h);
      this.cylindre(cx, cz, r, y, y, id, creux && r > 2);
    }
  }

  // Une coupole : une demi-sphère posée sur son diamètre.
  dome(cx, cy, cz, r, id, creux = true) {
    for (let y = 0; y <= r; y++) {
      const rr = Math.sqrt(Math.max(0, r * r - y * y));
      this.cylindre(cx, cz, rr, cy + y, cy + y, id, creux && rr > 2);
    }
  }

  // Un toit à deux pentes, faîtage sur l'axe des z.
  toit(x0, z0, x1, z1, y, id) {
    const demi = Math.floor((x1 - x0) / 2);
    for (let i = 0; i <= demi; i++) {
      for (let z = z0; z <= z1; z++) {
        this.poser(x0 + i, y + i, z, id);
        this.poser(x1 - i, y + i, z, id);
      }
    }
  }

  // Une ligne droite entre deux points — les entretoises d'un treillis, les
  // câbles d'un pont.
  ligne(x0, y0, z0, x1, y1, z1, id) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0;
      this.poser(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t, id);
    }
  }

  // Ce qu'on vient d'écrire, une fois pour toutes.
  finir() {
    const liste = [];
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const [cle, id] of this.blocs) {
      const [x, y, z] = cle.split(',').map(Number);
      liste.push([x, y, z, id]);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    return {
      blocs: liste,
      emprise: liste.length
        ? { minX, minY, minZ, maxX, maxY, maxZ,
          l: maxX - minX + 1, h: maxY - minY + 1, p: maxZ - minZ + 1 }
        : { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, l: 0, h: 0, p: 0 },
    };
  }
}

// --- les monuments -----------------------------------------------------------

const P = BLOCK.STONEBRICK;      // pierre de taille claire
const PB = BLOCK.WHITEBRICK;     // pierre blanche
const F = BLOCK.DARKBRICK;       // fer, fonte, charpente sombre
const V = BLOCK.GLASS;           // verre
const B = BLOCK.BRICK;           // brique rouge
const S = BLOCK.SANDSTONE;       // grès, calcaire chaud
const Z = BLOCK.SLAB_STONE;      // zinc, ardoise, couverture
const O = BLOCK.OBSIDIAN;        // acier sombre, granit noir
const OR = BLOCK.GOLD;           // dorures
const VG = BLOCK.WOOL_GREEN;     // cuivre oxydé, végétation
const RG = BLOCK.WOOL_RED;       // toitures de tuile, laque rouge

export const MONUMENTS = [
  {
    id: 'tour-eiffel', nom: 'Tour Eiffel', ville: 'Paris', emoji: '🗼',
    metresParBloc: 3,
    // 324 m, base carrée de 125 m, premier étage à 57 m, deuxième à 115 m,
    // sommet de la structure à 276 m puis le campanile et l'antenne.
    bati(c) {
      const H = 104;                    // 324 m / 3
      const et1 = 19, et2 = 38, et3 = 92;
      // Les quatre piliers, évasés en bas et resserrés vers le haut. C'est
      // cette courbe-là qu'on reconnaît de loin, bien avant le treillis.
      const pilier = (sx, sz) => {
        for (let y = 0; y <= et3; y++) {
          const t = y / et3;
          // large en bas, presque joints au sommet : une courbe, pas une droite
          const e = 20 * (1 - t) ** 1.7 + 1.5;
          c.poser(sx * e, y, sz * e, F);
          c.poser(sx * (e + 1), y, sz * e, F);
          c.poser(sx * e, y, sz * (e + 1), F);
          // les croisillons du treillis, tous les quatre blocs
          if (y % 4 === 0 && y < et3 - 2) {
            const e2 = 20 * (1 - (y + 4) / et3) ** 1.7 + 1.5;
            c.ligne(sx * e, y, sz * e, sx * e2, y + 4, sz * e2, F);
          }
        }
      };
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) pilier(sx, sz);
      // L'arche du rez-de-chaussée, entre les piliers
      for (const s of [-1, 1]) {
        for (let i = 0; i <= 14; i++) {
          const y = Math.round(11 * Math.sin((i / 14) * Math.PI));
          c.poser(s * 18, y, i - 7, F);
          c.poser(i - 7, y, s * 18, F);
        }
      }
      // Les deux plateformes, larges et débordantes
      const plateforme = (y, r) => {
        c.boite(-r, y, -r, r, y, r, F);
        c.boite(-r, y + 1, -r, r, y + 3, r, V);   // les salons vitrés
        c.boite(-r, y + 4, -r, r, y + 4, r, F);
      };
      plateforme(et1, 13);
      plateforme(et2, 7);
      // Le fût supérieur, puis le campanile et l'antenne
      c.cone(0, 0, 4, 1.6, et2 + 5, et3, F, true);
      c.boite(-3, et3, -3, 3, et3 + 3, 3, F);
      c.boite(-2, et3 + 4, -2, 2, et3 + 6, 2, V);
      c.cylindre(0, 0, 1, et3 + 7, H, F);
      c.poser(0, H + 1, 0, OR);
    },
  },
  {
    id: 'arc-triomphe', nom: 'Arc de Triomphe', ville: 'Paris', emoji: '🏛️',
    metresParBloc: 1.6,
    // 50 m de haut, 45 m de large, 22 m de profondeur. Une seule grande arche.
    bati(c) {
      const L = 14, H = 31, P2 = 7;
      c.murs(-L, 0, -P2, L, H - 5, P2, S);
      // La grande arche, percée de part en part
      for (let i = -6; i <= 6; i++) {
        const h = Math.round(Math.sqrt(Math.max(0, 49 - i * i)) + 12);
        c.boite(i, 0, -P2, i, h, P2, BLOCK.AIR);
        for (let z = -P2; z <= P2; z++) c.blocs.delete(`${i},${h},${z}`);
      }
      for (let i = -6; i <= 6; i++) {
        for (let y = 0; y <= Math.round(Math.sqrt(Math.max(0, 49 - i * i)) + 12); y++) {
          for (let z = -P2; z <= P2; z++) c.blocs.delete(`${i},${y},${z}`);
        }
      }
      // Les arches transversales, plus petites
      for (let z = -3; z <= 3; z++) {
        for (let y = 0; y <= Math.round(Math.sqrt(Math.max(0, 9 - z * z)) + 7); y++) {
          for (let x = -L; x <= L; x++) c.blocs.delete(`${x},${y},${z}`);
        }
      }
      // L'attique et sa corniche
      c.boite(-L - 1, H - 5, -P2 - 1, L + 1, H - 4, P2 + 1, P);
      c.murs(-L, H - 3, -P2, L, H, P2, S);
      c.boite(-L - 1, H + 1, -P2 - 1, L + 1, H + 1, P2 + 1, P);
      // Les quatre hauts-reliefs aux angles de la façade
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        c.boite(sx * 10, 14, sz * (P2 + 1), sx * 12, 22, sz * (P2 + 1), P);
      }
    },
  },
  {
    id: 'notre-dame', nom: 'Notre-Dame de Paris', ville: 'Paris', emoji: '⛪',
    metresParBloc: 1.6,
    // Deux tours de 69 m, façade de 43 m, nef de 128 m de long.
    bati(c) {
      const H = 43;                       // 69 m / 1,6
      // La nef, longue, avec ses arcs-boutants
      c.murs(-9, 0, -8, 9, 26, 40, P);
      c.boite(-9, 27, -8, 9, 27, 40, Z);
      c.toit(-9, -8, 9, 40, 28, Z);
      for (let z = 4; z <= 36; z += 6) {
        for (const sx of [-1, 1]) {
          c.ligne(sx * 10, 8, z, sx * 15, 2, z, P);
          c.boite(sx * 15, 0, z - 1, sx * 16, 14, z + 1, P);
        }
      }
      // La façade et ses deux tours carrées
      for (const sx of [-1, 1]) {
        c.murs(sx * 4, 0, -8, sx * 9, H, -2, P);
        c.boite(sx * 4, H + 1, -8, sx * 9, H + 1, -2, P);
        // les baies jumelles du beffroi
        for (let y = 30; y <= 38; y++) {
          c.poser(sx * 6, y, -8, BLOCK.AIR);
          c.blocs.delete(`${sx * 6},${y},${-8}`);
          c.blocs.delete(`${sx * 7},${y},${-8}`);
        }
      }
      // La galerie qui relie les deux tours, et la rosace au-dessous
      c.boite(-4, 26, -8, 4, 28, -7, P);
      for (let a = 0; a < 360; a += 12) {
        const r = 4.5;
        c.poser(Math.cos(a * Math.PI / 180) * r, 18 + Math.sin(a * Math.PI / 180) * r, -8, V);
      }
      c.boite(-3, 16, -8, 3, 20, -8, V);
      // La flèche, sur la croisée du transept
      c.cone(0, 0, 3, 0.5, 28, 46, Z);
      c.boite(-14, 12, 14, 14, 14, 20, P);   // le transept
      c.murs(-14, 0, 14, 14, 24, 20, P);
    },
  },
  {
    id: 'sacre-coeur', nom: 'Sacré-Cœur', ville: 'Paris', emoji: '⛪',
    metresParBloc: 1.6,
    // 83 m au sommet du dôme, pierre blanche de Château-Landon.
    bati(c) {
      c.murs(-12, 0, -12, 12, 20, 12, PB);
      c.boite(-13, 21, -13, 13, 22, 13, PB);
      // Les quatre coupoles d'angle, puis la grande au centre
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        c.cylindre(sx * 8, sz * 8, 3.5, 23, 30, PB, true);
        c.dome(sx * 8, 31, sz * 8, 4, PB);
      }
      c.cylindre(0, 0, 7, 23, 36, PB, true);
      for (let a = 0; a < 360; a += 30) {
        c.boite(Math.cos(a * Math.PI / 180) * 6, 26, Math.sin(a * Math.PI / 180) * 6,
          Math.cos(a * Math.PI / 180) * 6, 32, Math.sin(a * Math.PI / 180) * 6, V);
      }
      c.dome(0, 37, 0, 8, PB);
      c.cylindre(0, 0, 1.5, 45, 49, PB);
      c.poser(0, 50, 0, OR);
      // Le grand escalier de la butte
      for (let i = 0; i < 10; i++) c.boite(-10, -i, -13 - i, 10, -i, -13 - i, PB);
    },
  },
  {
    id: 'empire-state', nom: 'Empire State Building', ville: 'New York', emoji: '🏙️',
    metresParBloc: 4,
    // 381 m au toit, 443 m à l'antenne, 102 étages, retraits successifs.
    bati(c) {
      const cal = BLOCK.SANDSTONE;
      // Creux, comme les tours qui suivent : un gratte-ciel plein coûterait
      // trente mille blocs pour un volume que personne ne voit — et les mondes
      // de la famille se sauvegardent, eux.
      c.murs(-11, 0, -8, 11, 12, 8, cal);
      c.murs(-8, 13, -6, 8, 23, 6, cal);
      c.murs(-6, 24, -5, 6, 69, 5, cal);
      c.murs(-5, 70, -4, 5, 79, 4, cal);
      c.murs(-3, 80, -2, 3, 87, 2, cal);
      // Les bandes verticales de fenêtres — c'est ce qui donne l'élan
      for (let x = -5; x <= 5; x += 2) {
        for (let y = 26; y <= 67; y++) { c.poser(x, y, -5, V); c.poser(x, y, 5, V); }
      }
      for (let z = -4; z <= 4; z += 2) {
        for (let y = 26; y <= 67; y++) { c.poser(-6, y, z, V); c.poser(6, y, z, V); }
      }
      // Le mât d'amarrage des dirigeables, devenu l'antenne
      c.cylindre(0, 0, 2, 88, 94, O);
      c.cylindre(0, 0, 1, 95, 104, O);
      c.poser(0, 105, 0, RG);
    },
  },
  {
    id: 'chrysler', nom: 'Chrysler Building', ville: 'New York', emoji: '🏙️',
    metresParBloc: 4,
    // 319 m, la couronne d'acier inoxydable à sept arcs superposés.
    bati(c) {
      c.murs(-7, 0, -7, 7, 45, 7, B);
      c.murs(-6, 46, -6, 6, 58, 6, B);
      for (let x = -6; x <= 6; x += 2) {
        for (let y = 4; y <= 43; y++) { c.poser(x, y, -7, V); c.poser(x, y, 7, V); }
      }
      // La couronne : sept arcs de rayon décroissant, chacun percé de lucarnes
      let r = 6, y = 59;
      for (let etage = 0; etage < 7; etage++) {
        const haut = 4 - Math.floor(etage / 3);
        c.cone(0, 0, r, r - 0.8, y, y + haut, BLOCK.ICE);
        // les lucarnes en éventail, marque de fabrique de la couronne
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          c.poser(sx * Math.round(r * 0.6), y + haut - 1, sz * Math.round(r * 0.6), V);
        }
        y += haut; r -= 0.9;
      }
      c.cylindre(0, 0, 1, y, y + 18, BLOCK.ICE);
      c.poser(0, y + 19, 0, BLOCK.DIAMOND);
    },
  },
  {
    id: 'statue-liberte', nom: 'Statue de la Liberté', ville: 'New York', emoji: '🗽',
    metresParBloc: 1.6,
    // 46 m de statue, 47 m de socle, cuivre oxydé vert.
    bati(c) {
      // Le socle étoilé de Fort Wood, puis le piédestal
      c.murs(-13, 0, -13, 13, 6, 13, P);
      c.murs(-9, 7, -9, 9, 28, 9, P);
      c.boite(-10, 29, -10, 10, 30, 10, P);
      // Le corps drapé, qui s'affine
      c.cone(0, 0, 4.5, 3, 31, 48, VG, true);
      // Les plis de la robe, marqués devant
      for (let y = 33; y <= 47; y += 3) c.poser(0, y, -4, P);
      // Les bras : le droit levé avec la torche, le gauche tenant la tablette
      c.ligne(3, 48, 0, 7, 60, 0, VG);
      c.cylindre(7, 0, 1.5, 61, 63, OR);
      c.poser(7, 64, 0, BLOCK.WOOL_YELLOW);
      c.ligne(-3, 46, 0, -5, 40, -2, VG);
      c.boite(-7, 38, -4, -4, 44, -1, P);          // la tablette
      // La tête et les sept pointes de la couronne
      c.boite(-2, 49, -2, 2, 53, 2, VG);
      for (let i = 0; i < 7; i++) {
        const a = (-90 + i * 30) * Math.PI / 180;
        c.ligne(0, 54, 0, Math.cos(a) * 5, 56, Math.sin(a) * 5, VG);
      }
    },
  },
  {
    id: 'flatiron', nom: 'Flatiron Building', ville: 'New York', emoji: '🏢',
    metresParBloc: 2,
    // 87 m, 22 étages, et surtout ce triangle de 6,5 m de large à la pointe.
    bati(c) {
      const H = 43;
      // Le plan triangulaire : la pointe au nord, la base au sud
      for (let z = -16; z <= 16; z++) {
        const demi = Math.max(1, Math.round((z + 16) / 32 * 9));
        for (let y = 0; y <= H; y++) {
          c.poser(-demi, y, z, S);
          c.poser(demi, y, z, S);
          if (z === 16) c.boite(-demi, y, z, demi, y, z, S);
        }
      }
      // Les fenêtres en bandeau
      for (let z = -14; z <= 14; z += 2) {
        for (let y = 4; y <= H - 4; y += 2) {
          const demi = Math.max(1, Math.round((z + 16) / 32 * 9));
          c.poser(-demi, y, z, V); c.poser(demi, y, z, V);
        }
      }
      // La corniche très saillante qui couronne l'immeuble
      for (let z = -17; z <= 17; z++) {
        const demi = Math.max(2, Math.round((z + 16) / 32 * 9) + 1);
        c.boite(-demi, H + 1, z, demi, H + 2, z, P);
      }
    },
  },
  {
    id: 'big-ben', nom: 'Big Ben', ville: 'Londres', emoji: '🕰️',
    metresParBloc: 1.6,
    // Tour Elizabeth : 96 m, quatre cadrans de 7 m, flèche néogothique.
    bati(c) {
      const H = 40;
      c.murs(-5, 0, -5, 5, H, 5, S);
      // Les contreforts d'angle, qui montent jusqu'aux cadrans
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        c.boite(sx * 5, 0, sz * 5, sx * 6, H + 4, sz * 6, S);
      }
      // Les quatre cadrans
      for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        for (let a = 0; a < 360; a += 15) {
          const r = 3.2;
          const px = Math.cos(a * Math.PI / 180) * r, py = Math.sin(a * Math.PI / 180) * r;
          c.poser(dx ? dx * 5 : px, H - 4 + py, dz ? dz * 5 : px, PB);
        }
        c.poser(dx * 5, H - 4, dz * 5, BLOCK.WOOL_BLACK);
      }
      // Le beffroi ajouré, puis la flèche et sa croix
      c.boite(-5, H + 5, -5, 5, H + 5, 5, S);
      for (let y = H + 6; y <= H + 11; y++) {
        c.murs(-4, y, -4, 4, y, 4, S);
      }
      c.cone(0, 0, 5, 0.5, H + 12, H + 26, Z);
      c.cylindre(0, 0, 0.5, H + 27, H + 29, OR);
    },
  },
  {
    id: 'tower-bridge', nom: 'Tower Bridge', ville: 'Londres', emoji: '🌉',
    metresParBloc: 2.5,
    // 244 m de long, deux tours de 65 m, tablier basculant au centre.
    bati(c) {
      const H = 26;
      // Les deux tours néogothiques
      for (const sx of [-1, 1]) {
        c.murs(sx * 12 - 4, 0, -5, sx * 12 + 4, H, 5, S);
        for (const ax of [-4, 4]) for (const az of [-5, 5]) {
          c.boite(sx * 12 + ax, 0, az, sx * 12 + ax, H + 3, az, S);
          c.cone(sx * 12 + ax, az, 1.5, 0.4, H + 4, H + 9, Z);
        }
        c.cone(sx * 12, 0, 5, 1, H + 1, H + 12, Z);
        for (let y = 6; y <= H - 4; y += 4) {
          c.boite(sx * 12 - 2, y, -5, sx * 12 + 2, y + 2, -5, V);
          c.boite(sx * 12 - 2, y, 5, sx * 12 + 2, y + 2, 5, V);
        }
      }
      // Les deux passerelles hautes qui relient les tours
      for (const y of [H - 4, H - 1]) c.boite(-8, y, -3, 8, y, 3, BLOCK.WOOL_BLUE);
      c.boite(-8, H - 3, -3, 8, H - 2, -3, V);
      c.boite(-8, H - 3, 3, 8, H - 2, 3, V);
      // Le tablier et ses deux volées suspendues
      c.boite(-30, 7, -4, 30, 8, 4, O);
      for (const sx of [-1, 1]) {
        for (let i = 0; i <= 14; i++) {
          const x = sx * (16 + i);
          const y = 9 + Math.round(6 * Math.sin((i / 14) * Math.PI));
          for (const z of [-4, 4]) c.poser(x, y, z, BLOCK.WOOL_BLUE);
        }
      }
    },
  },
  {
    id: 'colisee', nom: 'Colisée', ville: 'Rome', emoji: '🏟️',
    metresParBloc: 2.5,
    // Ellipse de 189 × 156 m, 48 m de haut, quatre niveaux d'arcades.
    bati(c) {
      const a = 38, b = 31, H = 19;
      const surEllipse = (x, z, ka) => Math.hypot(x / (a * ka), z / (b * ka)) <= 1;
      for (let y = 0; y <= H; y++) {
        for (let x = -a; x <= a; x++) {
          for (let z = -b; z <= b; z++) {
            if (!surEllipse(x, z, 1) || surEllipse(x, z, 0.9)) continue;
            // Les arcades : on perce les trois premiers niveaux
            const niveau = Math.floor(y / 5);
            const arc = niveau < 3 && y % 5 >= 1 && y % 5 <= 3
              && (Math.round(Math.atan2(z, x) * 24 / Math.PI) % 2 === 0);
            c.poser(x, y, z, arc ? BLOCK.AIR : S);
            if (arc) c.blocs.delete(`${x},${y},${z}`);
          }
        }
      }
      // L'arène et les gradins effondrés d'un côté
      for (let x = -a; x <= a; x++) {
        for (let z = -b; z <= b; z++) {
          if (surEllipse(x, z, 0.62)) c.poser(x, 0, z, BLOCK.SAND);
          else if (surEllipse(x, z, 0.9) && (x + z) % 2 === 0) {
            const d = Math.hypot(x / a, z / b);
            c.poser(x, Math.round((d - 0.62) * 26), z, P);
          }
        }
      }
      for (let x = 10; x <= a; x++) {
        for (let z = -b; z <= b; z++) {
          for (let y = 11; y <= H; y++) if (Math.random() < 0.6) c.blocs.delete(`${x},${y},${z}`);
        }
      }
    },
  },
  {
    id: 'tour-pise', nom: 'Tour de Pise', ville: 'Pise', emoji: '🏛️',
    metresParBloc: 1.2,
    // 57 m, huit étages d'arcades, et près de 4° d'inclinaison.
    bati(c) {
      const H = 47;
      for (let y = 0; y <= H; y++) {
        // L'inclinaison : tout le fût glisse d'un peu plus de trois blocs
        const dx = Math.round((y / H) * 3.4);
        const etage = Math.floor((y - 5) / 5);
        const r = 5;
        for (let x = -r; x <= r; x++) {
          for (let z = -r; z <= r; z++) {
            const d = Math.hypot(x, z);
            if (d > r || d < r - 1.4) continue;
            // les galeries à colonnettes : une colonne sur deux
            const colonne = Math.round(Math.atan2(z, x) * 16 / Math.PI) % 2 === 0;
            const dansGalerie = y > 5 && y < H - 5 && (y - 5) % 5 >= 1 && (y - 5) % 5 <= 3;
            if (dansGalerie && !colonne) continue;
            c.poser(x + dx, y, z, etage % 2 || !dansGalerie ? PB : P);
          }
        }
      }
      // Le beffroi au sommet, plus étroit
      const dxh = Math.round(3.4);
      c.cylindre(dxh, 0, 3.5, H + 1, H + 6, PB, true);
    },
  },
  {
    id: 'sagrada', nom: 'Sagrada Família', ville: 'Barcelone', emoji: '⛪',
    metresParBloc: 3,
    // 172 m à la tour de Jésus-Christ, dix-huit tours prévues.
    bati(c) {
      c.murs(-11, 0, -16, 11, 22, 16, S);
      c.boite(-11, 23, -16, 11, 23, 16, S);
      // Les tours : quatre par façade, hyperboloïdes, hauteurs échelonnées
      const tour = (x, z, h) => {
        c.cone(x, z, 3, 1.2, 0, h, S, true);
        c.cone(x, z, 1.2, 2, h, h + 4, S);
        c.cone(x, z, 2, 0.5, h + 5, h + 9, OR);
        for (let y = 6; y < h; y += 5) {
          c.poser(x, y, z - 3, V); c.poser(x, y, z + 3, V);
        }
      };
      for (const sz of [-14, 14]) {
        tour(-8, sz, 34); tour(-3, sz, 40); tour(3, sz, 40); tour(8, sz, 34);
      }
      // La tour centrale de Jésus-Christ, et sa croix
      c.cone(0, 0, 7, 3, 24, 46, S, true);
      c.cone(0, 0, 3, 1.5, 47, 52, S);
      c.ligne(0, 53, 0, 0, 57, 0, PB);
      c.ligne(-2, 55, 0, 2, 55, 0, PB);
      c.ligne(0, 55, -2, 0, 55, 2, PB);
    },
  },
  {
    id: 'taj-mahal', nom: 'Taj Mahal', ville: 'Agra', emoji: '🕌',
    metresParBloc: 2,
    // 73 m au sommet du dôme, quatre minarets de 40 m, socle de 100 m.
    bati(c) {
      // La plateforme de marbre
      c.boite(-24, 1, -24, 24, 2, 24, PB);
      // Le mausolée, carré à pans coupés
      c.murs(-11, 3, -11, 11, 20, 11, PB);
      c.boite(-12, 21, -12, 12, 22, 12, PB);
      // Le grand iwan de la façade
      for (let i = -4; i <= 4; i++) {
        const h = Math.round(Math.sqrt(Math.max(0, 16 - i * i)) + 10);
        for (let y = 3; y <= h; y++) c.blocs.delete(`${i},${y},${-11}`);
      }
      // Le dôme bulbeux et ses quatre chattris
      c.cylindre(0, 0, 6, 23, 26, PB, true);
      c.dome(0, 27, 0, 8, PB);
      c.cone(0, 0, 3, 0.6, 35, 40, PB);
      c.poser(0, 41, 0, OR);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        c.cylindre(sx * 8, sz * 8, 1, 21, 24, PB);
        c.dome(sx * 8, 25, sz * 8, 2.5, PB);
      }
      // Les quatre minarets, légèrement inclinés vers l'extérieur
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        c.cylindre(sx * 21, sz * 21, 2, 3, 24, PB, true);
        for (const y of [10, 17]) c.cylindre(sx * 21, sz * 21, 3, y, y, PB);
        c.dome(sx * 21, 25, sz * 21, 3, PB);
      }
      // Le bassin qui mène à l'entrée
      c.boite(-2, 1, -50, 2, 1, -26, BLOCK.WATER);
    },
  },
  {
    id: 'christ-redempteur', nom: 'Christ Rédempteur', ville: 'Rio', emoji: '⛰️',
    metresParBloc: 1,
    // 30 m de statue, 8 m de socle, 28 m d'envergure des bras.
    bati(c) {
      // Le socle-chapelle
      c.boite(-5, 0, -4, 5, 8, 4, P);
      // Le corps, drapé, qui s'affine
      c.cone(0, 0, 3.5, 2.2, 9, 28, PB, false);
      // Les bras, tendus à l'horizontale, avec leur légère retombée
      for (const sx of [-1, 1]) {
        c.ligne(sx * 2, 26, 0, sx * 14, 25, 0, PB);
        c.ligne(sx * 2, 25, 0, sx * 13, 24, 0, PB);
        c.boite(sx * 14, 23, -1, sx * 15, 25, 1, PB);   // les mains
      }
      // La tête et le col
      c.boite(-1, 29, -1, 1, 30, 1, PB);
      c.boite(-2, 31, -2, 2, 34, 2, PB);
      c.poser(0, 35, -2, PB);
    },
  },
  {
    id: 'golden-gate', nom: 'Golden Gate', ville: 'San Francisco', emoji: '🌉',
    metresParBloc: 4,
    // 2 737 m de long, deux pylônes de 227 m, travée centrale de 1 280 m.
    bati(c) {
      const rouge = BLOCK.WOOL_RED;
      const H = 54, ecart = 40;
      // Les deux pylônes à cellules, avec leurs entretoises
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) c.boite(sx * ecart, 0, sz * 3, sx * ecart, H, sz * 3, rouge);
        for (let y = 8; y <= H; y += 9) c.boite(sx * ecart, y, -3, sx * ecart, y + 1, 3, rouge);
      }
      // Le tablier
      c.boite(-70, 20, -4, 70, 21, 4, rouge);
      for (let x = -70; x <= 70; x += 4) c.boite(x, 18, -4, x, 19, 4, rouge);
      // Les câbles porteurs, en chaînette entre les pylônes et au-delà
      for (const sz of [-3, 3]) {
        for (let x = -ecart; x <= ecart; x++) {
          const t = x / ecart;
          c.poser(x, Math.round(22 + (H - 22) * t * t), sz, rouge);
        }
        for (const sx of [-1, 1]) {
          for (let i = 0; i <= 30; i++) {
            const x = sx * (ecart + i);
            c.poser(x, Math.round(H - (H - 22) * (i / 30) ** 1.4), sz, rouge);
          }
        }
      }
      // Les suspentes verticales
      for (let x = -ecart; x <= ecart; x += 4) {
        const y = Math.round(22 + (H - 22) * (x / ecart) ** 2);
        for (const sz of [-3, 3]) c.ligne(x, 22, sz, x, y, sz, rouge);
      }
    },
  },
  {
    id: 'space-needle', nom: 'Space Needle', ville: 'Seattle', emoji: '🛸',
    metresParBloc: 2,
    // 184 m, la soucoupe à 158 m, trois pieds évasés.
    bati(c) {
      const H = 72;
      for (const a of [90, 210, 330]) {
        const r = a * Math.PI / 180;
        c.ligne(Math.cos(r) * 12, 0, Math.sin(r) * 12, Math.cos(r) * 2, 40, Math.sin(r) * 2, PB);
        c.ligne(Math.cos(r) * 13, 0, Math.sin(r) * 13, Math.cos(r) * 3, 40, Math.sin(r) * 3, PB);
      }
      c.cylindre(0, 0, 2.5, 40, H - 8, PB, true);
      // La soucoupe et son restaurant tournant
      c.cylindre(0, 0, 11, H - 8, H - 7, PB);
      c.cylindre(0, 0, 12, H - 6, H - 5, O);
      c.cylindre(0, 0, 11, H - 4, H - 2, V, true);
      c.cylindre(0, 0, 9, H - 1, H, PB);
      c.cylindre(0, 0, 1, H + 1, H + 12, PB);
      c.poser(0, H + 13, 0, RG);
    },
  },
  {
    id: 'pyramide-gizeh', nom: 'Pyramide de Khéops', ville: 'Gizeh', emoji: '🔺',
    metresParBloc: 5,
    // 138 m aujourd'hui (146 à l'origine), base de 230 m, pente de 51°.
    bati(c) {
      const base = 23;
      for (let y = 0; y <= 28; y++) {
        const r = Math.round(base * (1 - y / 28));
        for (let x = -r; x <= r; x++) {
          for (let z = -r; z <= r; z++) {
            // creuse à l'intérieur : seuls les blocs de parement comptent
            if (Math.max(Math.abs(x), Math.abs(z)) < r - 1 && y > 0) continue;
            c.poser(x, y, z, S);
          }
        }
      }
      // Le revêtement de calcaire poli qui subsiste au sommet
      for (let y = 24; y <= 28; y++) {
        const r = Math.round(base * (1 - y / 28));
        for (let x = -r; x <= r; x++) {
          c.poser(x, y, -r, PB); c.poser(x, y, r, PB);
          c.poser(-r, y, x, PB); c.poser(r, y, x, PB);
        }
      }
      // L'entrée, sur la face nord
      for (let z = -base; z <= -base + 6; z++) c.blocs.delete(`0,${8 + (z + base)},${z}`);
    },
  },
  {
    id: 'opera-sydney', nom: 'Opéra de Sydney', ville: 'Sydney', emoji: '🎭',
    metresParBloc: 2,
    // 65 m à la plus haute coque, 183 m de long, coques de céramique blanche.
    bati(c) {
      // Le podium de granit
      c.murs(-28, 0, -14, 28, 4, 14, S);
      // Les coques : des quarts de sphère adossés, par tailles décroissantes
      const coque = (x0, z0, r, sens) => {
        for (let y = 0; y <= r; y++) {
          const rr = Math.sqrt(Math.max(0, r * r - y * y));
          for (let a = 0; a <= 180; a += 4) {
            const ra = a * Math.PI / 180;
            const px = Math.cos(ra) * rr, pz = Math.sin(ra) * rr * sens;
            c.poser(x0 + px, 5 + y, z0 + pz, PB);
          }
        }
      };
      coque(-14, 0, 26, 1); coque(-4, 2, 20, 1); coque(4, 4, 14, 1);
      coque(16, -2, 16, -1); coque(23, 0, 10, -1);
      // Les baies vitrées entre les coques et le podium
      for (let x = -26; x <= 26; x += 2) c.boite(x, 5, -13, x, 9, -13, V);
    },
  },
  {
    id: 'maison-blanche', nom: 'Maison-Blanche', ville: 'Washington', emoji: '🏛️',
    metresParBloc: 1,
    // 51 m de large, deux étages sur rez-de-chaussée, portique à quatre colonnes.
    bati(c) {
      c.murs(-25, 0, -10, 25, 12, 10, PB);
      c.boite(-26, 13, -11, 26, 14, 11, PB);   // la corniche
      c.boite(-25, 15, -10, 25, 15, 10, Z);
      // Les fenêtres, trois rangées régulières
      for (let x = -22; x <= 22; x += 4) {
        for (const y of [3, 8]) {
          c.boite(x, y, -10, x, y + 2, -10, V);
          c.boite(x, y, 10, x, y + 2, 10, V);
        }
      }
      // Le portique nord et ses quatre colonnes
      c.boite(-7, 0, -14, 7, 1, -10, PB);
      for (const x of [-6, -2, 2, 6]) c.cylindre(x, -13, 1, 2, 12, PB);
      c.boite(-8, 13, -15, 8, 14, -10, PB);
      c.toit(-8, -15, 8, -10, 15, PB);
      // L'aile ouest, plus basse
      c.murs(-40, 0, -6, -27, 8, 6, PB);
      c.boite(-40, 9, -6, -27, 9, 6, Z);
    },
  },
  {
    id: 'elysee', nom: 'Palais de l\'Élysée', ville: 'Paris', emoji: '🏛️',
    metresParBloc: 1,
    // Hôtel particulier du XVIIIᵉ : corps de logis, cour d'honneur, deux ailes.
    bati(c) {
      // Le corps de logis
      c.murs(-20, 0, -8, 20, 11, 8, S);
      c.boite(-21, 12, -9, 21, 12, 9, P);
      c.toit(-21, -9, 21, 9, 13, Z);
      // L'avant-corps central, à fronton
      c.murs(-6, 0, -11, 6, 12, -8, S);
      c.boite(-7, 13, -12, 7, 13, -8, P);
      for (let i = 0; i <= 6; i++) c.boite(-6 + i, 14 + i, -12, 6 - i, 14 + i, -8, P);
      for (const x of [-5, -2, 2, 5]) c.cylindre(x, -11, 0.9, 1, 11, PB);
      // Les fenêtres à la française, hautes et étroites
      for (let x = -18; x <= 18; x += 3) {
        for (const y of [2, 7]) c.boite(x, y, -8, x, y + 3, -8, V);
      }
      // Les deux ailes de la cour d'honneur, et sa grille
      for (const sx of [-1, 1]) {
        c.murs(sx * 20, 0, -26, sx * 26, 8, -8, S);
        c.boite(sx * 20, 9, -26, sx * 26, 9, -8, Z);
      }
      for (let x = -19; x <= 19; x += 2) c.boite(x, 0, -26, x, 4, -26, F);
      c.boite(-20, 5, -26, 20, 5, -26, OR);
      c.boite(-26, 0, -26, -26, 6, -26, P);
      c.boite(26, 0, -26, 26, 6, -26, P);
    },
  },
  // --- les garages -----------------------------------------------------------
  //
  // Les seuls bâtiments de la bibliothèque qui ne copient rien de réel : ce
  // sont des OUTILS. Demande de Max — « quand un véhicule est déposé dans un
  // garage, il reste tout le temps, un peu comme dans GTA ». Le champ `garage`
  // porte cette promesse : `places` donne les emplacements de stationnement en
  // coordonnées d'auteur, et `src/garages.js` fait le reste.
  //
  // CE QUI FAIT QU'ON RECONNAÎT UN GARAGE, et qui a manqué au premier dessin
  // (verdict sur capture : un kiosque à musique). Dans l'ordre :
  //   1. LA PORTE, et le fait qu'on la VOIE — un simple trou dans un mur, c'est
  //      un abri de bus. Le tablier de la porte reste donc dessiné, relevé sous
  //      le linteau, comme une porte sectionnelle ouverte.
  //   2. Un volume BAS et PROFOND. Le premier était aussi haut que large.
  //   3. Une allée qui mène à la porte, et le marquage de la place au sol.
  //
  // La porte regarde celui qui pose le bâtiment : `poserBati` fait pivoter par
  // quarts de tour tout ce qui déclare une façade.
  {
    id: 'garage', nom: 'Garage', ville: 'Garages 🅿️', emoji: '🅿️',
    metresParBloc: 3,
    // Un garage de maison : 15 m sur 21, porte de 12 m. Une voiture, son
    // établi au fond, et l'allée devant.
    garage: { places: [[0, -2]], l: 11, p: 17 },
    bati(c) {
      const MUR = PB, SOCLE = P, CADRE = F, TABLIER = Z;
      const BITUME = CITY_BLOCK.ASPHALT, DALLE = CITY_BLOCK.SIDEWALK;
      const MARQUE = CITY_BLOCK.ROADLINE;
      // Le sol. Deux gris qui se distinguent : la dalle de béton dedans, le
      // bitume de l'allée dehors. Un seul gris, et l'on ne lit plus le seuil.
      c.boite(-4, 0, -8, 4, 0, 7, DALLE);
      // LE SEUIL, PAS UN PARVIS. La première allée courait sur sept blocs de
      // bitume sombre : posée un bloc au-dessus du sol comme tout le bâtiment,
      // elle formait une estrade de music-hall devant la porte — c'est ce que
      // la capture a montré. Trois rangs suffisent à dire « on entre par là ».
      c.boite(-4, 0, 8, 4, 0, 10, BITUME);
      // Le marquage de la place : deux traits blancs. C'est le détail qui dit
      // « on gare ici », et il ne coûte que vingt blocs.
      for (const sx of [-3, 3]) c.boite(sx, 0, -6, sx, 0, 4, MARQUE);
      // Les quatre murs, d'un bloc, sur un soubassement de pierre.
      c.boite(-5, 0, -9, -5, 4, 7, MUR);
      c.boite(5, 0, -9, 5, 4, 7, MUR);
      c.boite(-5, 0, -9, 5, 4, -9, MUR);
      c.boite(-5, 0, 7, -4, 4, 7, MUR);
      c.boite(4, 0, 7, 5, 4, 7, MUR);
      for (const z of [-9, 7]) c.boite(-5, 0, z, 5, 0, z, SOCLE);
      for (const sx of [-5, 5]) c.boite(sx, 0, -9, sx, 0, 7, SOCLE);
      // L'ENCADREMENT ET LE TABLIER. Le jambage sombre de part et d'autre, le
      // linteau au-dessus, et la porte elle-même — relevée, une bande sous le
      // linteau. Sans elle, la façade n'a plus qu'un trou, et un trou ne
      // ressemble à rien.
      for (const sx of [-4, 4]) c.boite(sx, 0, 7, sx, 4, 7, CADRE);
      c.boite(-4, 4, 7, 4, 4, 7, CADRE);
      c.boite(-3, 3, 7, 3, 3, 7, TABLIER);
      // La porte de service, sur le côté, et sa fenêtre haute : c'est ce qui
      // donne l'échelle du bâtiment quand on le voit de trois quarts.
      for (let y = 0; y <= 2; y++) c.blocs.delete(`-5,${y},-6`);
      c.boite(-5, 3, -6, -5, 3, -6, CADRE);
      // UN MUR AVEUGLE DE SEIZE BLOCS N'EST PAS UN MUR, C'EST UNE PALISSADE.
      // Deux fenêtres hautes et un bandeau de pierre à mi-hauteur : de quoi
      // lire l'échelle du bâtiment depuis la rue.
      for (const sx of [-5, 5]) {
        c.boite(sx, 3, -2, sx, 3, 0, V);
        c.boite(sx, 3, 3, sx, 3, 5, V);
        c.boite(sx, 2, -9, sx, 2, -7, SOCLE);
      }
      // Le toit plat, débordant d'un bloc — la casquette de béton d'un garage.
      c.boite(-6, 5, -10, 6, 5, 9, Z);
      // L'établi du fond et son panneau à outils.
      c.boite(-4, 1, -8, 4, 1, -8, BLOCK.PLANK);
      c.boite(-3, 2, -9, 3, 3, -9, CADRE);
    },
  },
  {
    id: 'garage-double', nom: 'Grand garage (2 places)', ville: 'Garages 🅿️', emoji: '🏎️',
    metresParBloc: 3,
    // Deux boxes côte à côte, séparés par un pilier de maçonnerie — 27 m sur 21.
    garage: { places: [[-5, -2], [5, -2]], l: 19, p: 17 },
    bati(c) {
      // Le grès plutôt que la brique : sur capture, l'encadrement sombre des
      // portes se noyait dans le rouge du mur et l'on ne voyait plus les deux
      // baies. Un mur clair, un cadre sombre — c'est le contraste qui fait
      // qu'on lit une porte de garage, pas la couleur.
      const MUR = S, SOCLE = P, CADRE = F, TABLIER = Z;
      const BITUME = CITY_BLOCK.ASPHALT, DALLE = CITY_BLOCK.SIDEWALK;
      const MARQUE = CITY_BLOCK.ROADLINE;
      c.boite(-8, 0, -8, 8, 0, 7, DALLE);
      c.boite(-8, 0, 8, 8, 0, 10, BITUME);
      for (const sx of [-8, -2, 2, 8]) c.boite(sx, 0, -6, sx, 0, 4, MARQUE);
      c.boite(-9, 0, -9, -9, 4, 7, MUR);
      c.boite(9, 0, -9, 9, 4, 7, MUR);
      c.boite(-9, 0, -9, 9, 4, -9, MUR);
      // La façade : deux jambages extérieurs et le pilier central.
      c.boite(-9, 0, 7, -8, 4, 7, MUR);
      c.boite(-1, 0, 7, 1, 4, 7, MUR);
      c.boite(8, 0, 7, 9, 4, 7, MUR);
      for (const z of [-9, 7]) c.boite(-9, 0, z, 9, 0, z, SOCLE);
      for (const sx of [-9, 9]) c.boite(sx, 0, -9, sx, 0, 7, SOCLE);
      // Les deux portes, encadrées et à tablier relevé.
      for (const cx of [-5, 5]) {
        for (const sx of [cx - 3, cx + 3]) c.boite(sx, 0, 7, sx, 4, 7, CADRE);
        c.boite(cx - 3, 4, 7, cx + 3, 4, 7, CADRE);
        c.boite(cx - 2, 3, 7, cx + 2, 3, 7, TABLIER);
      }
      for (let y = 0; y <= 2; y++) c.blocs.delete(`-9,${y},-6`);
      c.boite(-9, 3, -6, -9, 3, -6, CADRE);
      for (const sx of [-9, 9]) {
        c.boite(sx, 3, -2, sx, 3, 0, V);
        c.boite(sx, 3, 3, sx, 3, 5, V);
      }
      c.boite(-10, 5, -10, 10, 5, 9, Z);
      c.boite(-8, 1, -8, 8, 1, -8, BLOCK.PLANK);
      c.boite(-6, 2, -9, 6, 3, -9, CADRE);
    },
  },
];

// Le catalogue, prêt à l'emploi : chaque monument construit une fois, gardé en
// mémoire. Un enfant qui feuillette la bibliothèque ne rebâtit pas la Tour
// Eiffel à chaque coup d'œil.
const cache = new Map();

export function monumentBati(id) {
  if (cache.has(id)) return cache.get(id);
  const def = MONUMENTS.find((m) => m.id === id);
  if (!def) return null;
  const c = new Chantier();
  def.bati(c);
  const fait = { ...def, ...c.finir() };
  cache.set(id, fait);
  return fait;
}

export const MONUMENTS_PAR_VILLE = () => {
  const villes = new Map();
  for (const m of MONUMENTS) {
    if (!villes.has(m.ville)) villes.set(m.ville, []);
    villes.get(m.ville).push(m);
  }
  return villes;
};
