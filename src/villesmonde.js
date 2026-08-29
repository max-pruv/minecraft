// Le tour du monde, pour de vrai : la machine à villes iconiques.
//
// Max : « fais pas que Londres, hein — je veux plein de villes iconiques. »
// Puis : « refais les 50 plus grosses et famous villes mondiales en détail. »
// Londres a fixé la recette (src/londres.js) ; ce fichier en fait une MACHINE
// et la déroule sur les huit autres. Chaque ville est une fiche de données —
// son eau, sa trame de rues, sa palette, ses monuments aux coordonnées — et
// le moteur commun s'occupe du reste. Une ville de plus, demain, c'est une
// fiche de plus.
//
// TOUT EST RELEVÉ SUR DOCUMENTS, ville par ville :
// — ROME : le Tibre et l'île Tibérine, le Colisée (41,8902/12,4922), le
//   Panthéon, Saint-Pierre de l'autre côté du fleuve, le Forum. Ocre et
//   terracotta, ruelles serrées.
// — BARCELONE : la grille de l'Eixample aux angles CHANFREINÉS — la signature
//   aérienne de la ville, unique au monde —, la Rambla qui descend au port,
//   la Sagrada Família (41,4036/2,1744), la plage de la Barceloneta.
// — PISE : l'Arno, et la piazza dei Miracoli : la tour penchée, le Duomo et
//   le baptistère rond, ALIGNÉS comme sur place (43,7229/10,3966).
// — GIZEH : le plateau désertique, les TROIS pyramides sur leur diagonale
//   exacte — Khéops, Khéphren et sa coiffe de calcaire, Mykérinos — et le
//   Sphinx qui regarde le levant. La vallée verte du Nil à l'est.
// — AGRA : le Taj Mahal sur la Yamuna, son charbagh — le jardin moghol en
//   croix, coupé de canaux — la mosquée de grès rouge et son miroir, le fort
//   d'Agra en amont (27,1795/78,0211).
// — SYDNEY : LE PORT. L'Opéra sur la pointe Bennelong, le Harbour Bridge qui
//   enjambe la baie d'une seule arche, les tours du CBD, le jardin botanique.
// — RIO : la baie de Guanabara, le Pain de Sucre à l'entrée, le Corcovado et
//   son Christ à 700 m au-dessus de la ville, le croissant de Copacabana,
//   la forêt de Tijuca, les maisons vives accrochées aux pentes.
// — SEATTLE : la baie d'Elliott, la Space Needle (47,6205/−122,3493), le
//   marché de Pike Place, les tours du centre — et le mont Rainier à
//   l'horizon, déjà levé par le relief de la Terre.
//
// V166 — LES CINQUANTE GRANDES : trente-huit fiches de plus, relevées de la
// même façon. L'Europe de Madrid à Copenhague, l'Asie de Tokyo à Delhi, les
// Amériques de Chicago au Machu Picchu, l'Afrique de Marrakech au Cap. Le
// moteur a appris ce que ces villes exigeaient : les canaux concentriques
// d'Amsterdam, la lagune de Venise, les passes de Stockholm et du port
// Victoria, la montagne-table du Cap, le sol d'altitude du Machu Picchu,
// l'île-barrière de Miami, la bande du Strip dans le désert du Nevada — et
// trois monuments volontairement HORS du rayon de leur ville, parce qu'ils
// le sont en vrai : l'Atomium à Heysel, le panneau Hollywood sur sa
// colline, le Burj al Arab sur son île.

import { BLOCK, CITY_BLOCK, DECOR_START, RUE, ARCHI, ROUTE_BLOCK } from './blocks.js';
import { positionDe } from './mondes.js';
import { monumentBati } from './monuments.js';
import { surTerreReelle } from './terre.js';
import { VILLES_GENEREES } from './villes200.js';

const uni = (c) => DECOR_START + c * 10;
const brique = (c) => DECOR_START + c * 10 + 1;

const BITUME = CITY_BLOCK.ASPHALT;
const TROTTOIR = CITY_BLOCK.SIDEWALK;
const PAVE = CITY_BLOCK.GRANITE;
const HERBE = BLOCK.GRASS;
const ARBRE = BLOCK.LEAVES;
const EAU = BLOCK.WATER;
const SABLE = BLOCK.SAND;
const GRES = BLOCK.SANDSTONE;
const VERRE = BLOCK.GLASS;
const OR = BLOCK.GOLD;
const PIERRE = uni(19);
const BLANC = uni(27);
const CREME = uni(28);
const OCRE = uni(1);
const ROSE = uni(16);
const TUILE = uni(0);
const ARDOISE = uni(25);
const ACIER = uni(24);
const ROUGE_GRES = brique(18);
// Les marquages peints dans la texture (réalisme v2) : une bande à l'échelle
// d'une vraie bande, plus jamais des blocs entiers de blanc — c'est eux qui
// faisaient des chaussées un damier noir et blanc vu du ciel.
const LIGNE_NS = ROUTE_BLOCK.LIGNE_NS;
const LIGNE_EO = ROUTE_BLOCK.LIGNE_EO;
const PASSAGE_NS = ROUTE_BLOCK.PASSAGE_NS;
const PASSAGE_EO = CITY_BLOCK.CROSSWALK;
const BOIS_PORTE = BLOCK.DARKPLANK;   // les portes des boutiques
const BOIS_BANC = BLOCK.PLANK;        // les bancs des trottoirs
const BOISF_ARBRE = BLOCK.LOG;        // les troncs des jardins de poche

// Les enseignes des boutiques : le bandeau au-dessus de la vitrine (la
// « fascia » des devanturiers) et l'auvent rayé qui s'avance sur le trottoir.
// Rayures : le motif n° 5 de la palette de décor — c'est LE tissu de store.
// Palette SOBRE (réalisme v2) : bordeaux, vert anglais, marine, émeraude,
// anthracite, crème — les jaunes, pourpres et magentas criards faisaient de
// chaque rue un carnaval qui mangeait la ville vue du ciel.
const raye = (c) => DECOR_START + c * 10 + 5;
const ENSEIGNES = [raye(0), raye(5), raye(10), raye(6), raye(25), raye(28)];

// --- les fiches --------------------------------------------------------------
//
// Chaque ville : son échelle (blocs/km), son eau, sa trame, sa palette, ses
// monuments et ses lieux — tous en latitude/longitude réelles, convertis à la
// volée autour de l'ancre du registre.

function fabrique(cle, fiche) {
  const ancre = positionDe(cle);
  const kmLon = 111.32 * Math.cos((fiche.lat0 * Math.PI) / 180);
  const u = (lon) => Math.round((lon - fiche.lon0) * kmLon * fiche.echelle);
  const v = (lat) => Math.round(-(lat - fiche.lat0) * 111.19 * fiche.echelle);
  const local = (lat, lon) => [u(lon), v(lat)];
  const f = { cle, ancre, ...fiche, u, v, local };

  // LE GRAND RECALIBRAGE (v172). Max, captures à l'appui : « les rues sont
  // hyper petites, faut reformater les rues, le sizing des villes ». Les
  // trames historiques faisaient des rues d'UN bloc et des îlots de trois :
  // un tissu de couture, pas une ville. La normalisation se fait ICI, une
  // fois pour toutes les fiches : chaque ville garde son ANGLE, son
  // caractère (chanfreins, ruelles, part de tours), mais le gabarit devient
  // celui d'une vraie rue — chaussée de trois blocs, trottoirs de deux,
  // îlots de cinq à dix.
  if (f.trame) {
    const t = { ...f.trame };
    if (t.ruelles) {
      // Venise, la médina de Marrakech, la vieille ville de Jérusalem : les
      // ruelles SONT leur identité — on les élargit juste assez pour y
      // marcher à deux, sans les transformer en boulevards.
      t.pu = Math.round(t.pu * 2); t.pv = Math.round(t.pv * 2);
      t.w = 0.9; t.s = 2.0;
    } else {
      t.pu = Math.round(t.pu * 3); t.pv = Math.round(t.pv * 3);
      t.w = 1.7; t.s = 4.0;
      if (t.chanfrein) t.chanfrein = 4.2;                    // l'Eixample garde ses coins coupés
    }
    // LE MARQUAGE NE SE PEINT QUE S'IL RESTE NET. Vu sur la capture de
    // Moscou : sur une trame en diagonale, pointillés et zèbres se
    // pixellisent en mouchetis blanc aléatoire — pire que rien. Une trame
    // quasi alignée sur les axes du monde garde ses marques ; une trame
    // penchée roule sur de l'asphalte propre.
    {
      const a90 = ((t.ang % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
      t.net = Math.min(a90, Math.PI / 2 - a90) < 0.15;
    }
    f.trame = t;
    // les maisons grandissent avec les rues : un canyon d'un étage n'est pas
    // une rue, c'est une tranchée
    const [h0, h1] = f.hMaison || [3, 5];
    f.hMaison = [h0 + 2, h1 + 3];
  }

  // Les fleuves s'étendent jusqu'au nouveau bord : leurs polylignes avaient
  // été tracées pour l'ancien rayon, et un Bosphore qui s'arrête au milieu
  // de la ville n'est plus un détroit. On prolonge chaque bout dans l'axe de
  // son dernier segment.
  const prolonge = (fl) => {
    const pts = fl.pts.map((q) => q.slice());
    const etire = (a, b) => {
      const dx = a[0] - b[0], dz = a[1] - b[1];
      const l = Math.hypot(dx, dz) || 1;
      let [x2, z2] = a;
      while (Math.hypot(x2, z2) < f.rayon + 16) { x2 += (dx / l) * 8; z2 += (dz / l) * 8; }
      return [x2, z2];
    };
    pts.unshift(etire(pts[0], pts[1]));
    pts.push(etire(pts[pts.length - 1], pts[pts.length - 2]));
    return { ...fl, pts };
  };
  f.rayon = ancre.r;                                          // le registre fait foi
  if (f.fleuve) f.fleuve = prolonge(f.fleuve);
  if (f.fleuves) f.fleuves = f.fleuves.map(prolonge);

  // La place centrale reçoit sa fontaine — sauf si un monument vit déjà au
  // centre (l'Obélisque de Buenos Aires EST la pièce maîtresse de sa place).
  f.fontaine = !(f.monuments || []).some((m2) => {
    const [du, dv] = local(m2.lat, m2.lon);
    return Math.hypot(du, dv) < 7;
  });
  return f;
}

// Un pavillon de ville, tiré au sort mais toujours le même au même endroit.
function tirage(a, b, sel) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(sel, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Les petits constructeurs partagés.
const pyramide = (base, haut, coiffe) => (poser) => {
  for (let y = 0; y <= haut; y++) {
    const r = Math.round(base * (1 - y / haut));
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) === r || Math.abs(dz) === r) {
          poser(dx, y + 1, dz, coiffe && y > haut - coiffe ? BLANC : GRES);
        }
      }
    }
  }
};

const dome = (r, mur, calotte) => (poser) => {
  for (let y = 1; y <= 4; y++) {
    for (let a = 0; a < 360; a += 15) {
      const rad = (a * Math.PI) / 180;
      poser(Math.round(Math.cos(rad) * r), y, Math.round(Math.sin(rad) * r), mur);
    }
  }
  for (let dy = 0; dy <= r; dy++) {
    const rr = Math.sqrt(Math.max(0, r * r - dy * dy));
    for (let a = 0; a < 360; a += 12) {
      const rad = (a * Math.PI) / 180;
      poser(Math.round(Math.cos(rad) * rr), 5 + dy, Math.round(Math.sin(rad) * rr), calotte);
    }
  }
  poser(0, 6 + r, 0, OR);
};

const depuisCatalogue = (id, tourner = false) => (poser) => {
  const m = monumentBati(id);
  if (!m) return;
  const e = m.emprise;
  const cx = Math.round((e.minX + e.maxX) / 2);
  const cz = Math.round((e.minZ + e.maxZ) / 2);
  for (const [bx, by, bz, bloc] of m.blocs) {
    const dx = bx - cx, dz = bz - cz;
    if (tourner) poser(dz, by - e.minY, dx, bloc);
    else poser(dx, by - e.minY, dz, bloc);
  }
};

// Le Sphinx : le corps couché, les pattes vers le levant, la tête qui regarde
// l'est — depuis quatre mille cinq cents ans.
function buildSphinx(poser) {
  for (let dx = -3; dx <= 2; dx++) {
    for (let dz = -1; dz <= 1; dz++) { poser(dx, 1, dz, GRES); poser(dx, 2, dz, GRES); }
  }
  for (const dz of [-1, 1]) { poser(3, 1, dz, GRES); poser(4, 1, dz, GRES); }   // les pattes
  poser(2, 3, 0, GRES); poser(2, 4, 0, GRES);                                   // la tête
  poser(3, 4, 0, GRES);                                                          // le némès
}

// L'arche du Harbour Bridge : une seule portée au-dessus de la baie, le
// tablier suspendu dessous, les deux pylônes de granit aux culées.
function buildHarbourBridge(poser) {
  const L = 13, H = 12;
  for (let k = -L; k <= L; k++) {
    const y = Math.round(H * Math.cos((k / L) * (Math.PI / 2.2)));
    for (const du of [-2, 2]) poser(du, 6 + y, k, ACIER);
    poser(-2, 6, k, ACIER); poser(2, 6, k, ACIER);                 // le tablier
    for (let du = -1; du <= 1; du++) poser(du, 5, k, BITUME);
    if ((k & 3) === 0 && y > 2) { poser(-2, 6 + Math.round(y / 2), k, ACIER); poser(2, 6 + Math.round(y / 2), k, ACIER); }
  }
  for (const k of [-L, L]) {
    for (let y = 1; y <= 9; y++) { poser(-3, y, k, PIERRE); poser(3, y, k, PIERRE); }
  }
}

// La colonne de colonnes : ce qui reste d'un forum.
function buildForum(poser) {
  for (const [dx, dz] of [[-4, 0], [-2, 0], [0, 0], [2, 0], [4, 0], [-3, 3], [1, 3]]) {
    const h = 3 + ((dx + dz) & 1) * 2;
    for (let y = 1; y <= h; y++) poser(dx, y, dz, CREME);
    if (h >= 5) poser(dx, h + 1, dz, PIERRE);
  }
}

// La mosquée moghole : trois dômes blancs sur le grès rouge.
function buildMosqueeRouge(poser) {
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let y = 1; y <= 3; y++) {
        if (Math.abs(dx) === 4 || Math.abs(dz) === 2 || y === 3) poser(dx, y, dz, ROUGE_GRES);
      }
    }
  }
  for (const dx of [-3, 0, 3]) { poser(dx, 4, 0, BLANC); poser(dx, 5, 0, BLANC); }
}

// Le fort rouge : la muraille circulaire de grès.
function buildFortRouge(poser) {
  for (let a = 0; a < 360; a += 6) {
    const rad = (a * Math.PI) / 180;
    const dx = Math.round(Math.cos(rad) * 8), dz = Math.round(Math.sin(rad) * 8);
    for (let y = 1; y <= 5; y++) poser(dx, y, dz, ROUGE_GRES);
    if (a % 45 === 0) poser(dx, 6, dz, ROUGE_GRES);
  }
}

// La grande roue du front de mer de Seattle.
function buildGrandeRoue(poser) {
  const R = 7;
  for (let a = 0; a < 360; a += 12) {
    const rad = (a * Math.PI) / 180;
    poser(0, R + 2 + Math.round(Math.sin(rad) * R), Math.round(Math.cos(rad) * R), BLANC);
  }
  for (let y = 1; y <= R + 2; y++) poser(0, y, 0, ACIER);
}

// La halle de Pike Place et son enseigne rouge.
function buildPikePlace(poser) {
  for (let dz = -4; dz <= 4; dz++) {
    for (let y = 1; y <= 2; y++) { poser(-1, y, dz, brique(0)); poser(1, y, dz, brique(0)); }
    poser(0, 3, dz, ARDOISE); poser(-1, 3, dz, ARDOISE); poser(1, 3, dz, ARDOISE);
  }
  poser(0, 4, -3, BLOCK.WOOL_RED); poser(0, 4, -2, BLOCK.WOOL_RED);   // l'enseigne
}

// La colonne de Colomb, au bas de la Rambla.
function buildColom(poser) {
  for (let y = 1; y <= 3; y++) for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) poser(a, y, b, PIERRE);
  for (let y = 4; y <= 12; y++) poser(0, y, 0, PIERRE);
  poser(0, 13, 0, OR);
}

// Un minaret : le fût, le balcon du muezzin, le toit pointu.
function minaret(h, mur) {
  return (poser) => {
    for (let y = 1; y <= h; y++) poser(0, y, 0, mur);
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) poser(a, h - 2, b, mur);
    poser(0, h + 1, 0, PIERRE);
  };
}

// Des bulbes sur leurs tambours : Saint-Basile en cinq couleurs, les églises
// russes, les tours de Munich en vert.
function bulbes(couleurs, haut = 6) {
  return (poser) => {
    const postes = couleurs.length === 1 ? [[0, 0]]
      : [[0, 0], [-3, -3], [3, -3], [-3, 3], [3, 3]].slice(0, couleurs.length);
    postes.forEach(([dx, dz], i) => {
      const hh = i === 0 ? haut + 2 : haut;
      for (let y = 1; y <= hh; y++) poser(dx, y, dz, CREME);
      poser(dx, hh + 1, dz, couleurs[i]);
      poser(dx, hh + 2, dz, couleurs[i]);
      poser(dx, hh + 3, dz, OR);
    });
  };
}

// Une porte monumentale : Brandebourg, la porte de l'Inde, la Gateway de
// Bombay — deux piliers, un linteau, l'attique.
function archePorte(l, h, mur) {
  return (poser) => {
    for (const dz of [-l, l]) {
      for (let y = 1; y <= h; y++) { poser(0, y, dz, mur); poser(-1, y, dz, mur); }
    }
    for (let dz = -l; dz <= l; dz++) { poser(0, h + 1, dz, mur); poser(-1, h + 1, dz, mur); poser(0, h + 2, dz, mur); }
    poser(0, h + 3, 0, mur);
  };
}

// Une tour à boule(s) : la Fernsehturm, la CN Tower, la perle de Shanghai.
function tourBoule(h, boules, fut = ACIER, boule = ACIER) {
  return (poser) => {
    for (let y = 1; y <= h; y++) poser(0, y, 0, fut);
    for (const by of boules) {
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
        poser(a, by, b, boule); poser(a, by + 1, b, boule);
      }
    }
    poser(0, h + 1, 0, boule);
  };
}

// Le périptère grec : la colonnade du Parthénon, et rien que lui.
function colonnade(du2, dv2) {
  return (poser) => {
    for (let dx = -du2; dx <= du2; dx += 2) {
      for (const dz of [-dv2, dv2]) for (let y = 1; y <= 4; y++) poser(dx, y, dz, BLANC);
    }
    for (const dx of [-du2, du2]) {
      for (let dz = -dv2; dz <= dv2; dz += 2) for (let y = 1; y <= 4; y++) poser(dx, y, dz, BLANC);
    }
    for (let dx = -du2; dx <= du2; dx++) for (let dz = -dv2; dz <= dv2; dz++) poser(dx, 5, dz, CREME);
    for (let dz = -dv2 + 1; dz < dv2; dz++) poser(0, 6, dz, CREME);   // le fronton
  };
}

// Un long palais à ailes : l'Ermitage, Schönbrunn, le Palais royal.
function palaisLong(demi, mur, toit) {
  return (poser) => {
    for (let dz = -demi; dz <= demi; dz++) {
      for (let du = -1; du <= 1; du++) {
        for (let y = 1; y <= 4; y++) {
          poser(du, y, dz, y >= 2 && y <= 3 && (dz & 1) === 1 && du === 1 ? VERRE : mur);
        }
        poser(du, 5, dz, toit);
      }
    }
    poser(1, 5, 0, OR);
  };
}

// Une enceinte carrée à tours d'angle : le Kremlin, le Fort rouge, Jérusalem,
// les murailles de Marrakech.
function muraillesRect(demi, h, mur) {
  return (poser) => {
    for (let k = -demi; k <= demi; k++) {
      for (const [a, b] of [[k, -demi], [k, demi], [-demi, k], [demi, k]]) {
        for (let y = 1; y <= h; y++) poser(a, y, b, mur);
        if ((k & 3) === 0) poser(a, h + 1, b, mur);
      }
    }
    for (const [a, b] of [[-demi, -demi], [-demi, demi], [demi, -demi], [demi, demi]]) {
      for (let y = h + 1; y <= h + 3; y++) poser(a, y, b, mur);
    }
  };
}

// La grappe de sphères de l'Atomium : neuf boules, huit aux coins d'un cube
// et une au centre, reliées par leurs tubes.
function buildAtomium(poser) {
  const S = 5;
  const coins = [[0, 7, 0]];
  for (const dx of [-S, S]) for (const dy of [-S, S]) for (const dz of [-S, S]) coins.push([dx, 7 + dy, dz]);
  for (const [cx, cy, cz] of coins) {
    for (const [a, b, c] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      poser(cx + a, cy + b, cz + c, ACIER);
    }
  }
  for (let k = 1; k < S; k++) poser(0, 7 + k, 0, ACIER), poser(0, 7 - k, 0, ACIER), poser(k, 7, 0, ACIER), poser(-k, 7, 0, ACIER);
  for (let y = 1; y < 2; y++) poser(0, y, 0, ACIER);
}

// Un pont bâti : Vecchio et ses boutiques, Charles et ses statues.
function pontBati(demi, boutiques, travers = false) {
  return (poser) => {
    // tablier a +6 : l'eau des villes est a 30 sur un fond a 26 — un tablier
    // plus bas serait noye, la lecon est venue du Rialto.
    const P = travers ? (a, y, b, id) => poser(b, y, a, id) : poser;
    for (let k = -demi; k <= demi; k++) {
      for (let du = -1; du <= 1; du++) P(du, 6, k, PIERRE);
      if (boutiques && (k & 1) === 0 && Math.abs(k) < demi - 1) {
        P(-1, 7, k, OCRE); P(1, 7, k, OCRE); P(-1, 8, k, TUILE); P(1, 8, k, TUILE);
      }
      if (!boutiques && (k & 3) === 0) { P(-1, 7, k, NOIRB); P(1, 7, k, NOIRB); }
      if ((k + demi) % Math.max(3, Math.floor(demi / 2)) === 0 && k < demi) {
        for (let y = 1; y <= 5; y++) { P(-1, y, k, PIERRE); P(1, y, k, PIERRE); }
      }
    }
  };
}

// Une silhouette dressée : la Petite Sirène, le Merlion, un ange doré.
function statuette(h, bloc, socle = PIERRE) {
  return (poser) => {
    poser(0, 1, 0, socle);
    for (let y = 2; y <= h + 1; y++) poser(0, y, 0, bloc);
  };
}

// L'obélisque : Buenos Aires, et tous les autres.
function obelisque(h) {
  return (poser) => {
    for (let y = 1; y <= 2; y++) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) poser(a, y, b, BLANC);
    for (let y = 3; y <= h; y++) poser(0, y, 0, BLANC);
    poser(0, h + 1, 0, PIERRE);
  };
}

// La pagode étagée : Toji, le prang de Wat Arun, la Skytree n'en est pas une.
function pagode(niveaux, mur, toit) {
  return (poser) => {
    for (let n = 0; n < niveaux; n++) {
      const y0 = 1 + n * 3, r = Math.max(1, niveaux - n);
      for (let y = y0; y < y0 + 2; y++) poser(0, y, 0, mur);
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) === r || Math.abs(dz) === r) poser(dx, y0 + 2, dz, toit);
      }
    }
    poser(0, niveaux * 3 + 1, 0, OR);
  };
}

// La rangée de toriis vermillon de Fushimi Inari.
function buildToriis(poser) {
  for (let k = 0; k < 5; k++) {
    const dz = k * 3;
    for (let y = 1; y <= 3; y++) { poser(-1, y, dz, VERMILLON); poser(1, y, dz, VERMILLON); }
    for (let dx = -1; dx <= 1; dx++) poser(dx, 4, dz, VERMILLON);
  }
}

// Le Burj Khalifa : 828 mètres en Y — le seul monument bâti à 7 m par bloc,
// sinon il crèverait le ciel du monde.
function buildBurj(poser) {
  const H = 116;
  for (let y = 1; y <= H; y++) {
    const n = y < 40 ? 2 : y < 80 ? 1 : 0;
    for (let dx = -n; dx <= n; dx++) for (let dz = -n; dz <= n; dz++) {
      if (Math.abs(dx) === n || Math.abs(dz) === n) poser(dx, y, dz, y % 6 === 0 ? ACIER : VERRE);
    }
    if (y < 40 && y % 3 === 0) { poser(3, y, 0, VERRE); poser(-3, y, 0, VERRE); poser(0, y, 3, VERRE); poser(0, y, -3, VERRE); }
  }
  for (let y = H + 1; y <= H + 6; y++) poser(0, y, 0, ACIER);
}

// La voile du Burj al Arab, gonflée face au Golfe.
function buildVoile(poser) {
  const H = 30;
  for (let y = 1; y <= H; y++) {
    const bombe = Math.round(4 * Math.sin((y / H) * Math.PI));
    poser(bombe, y, -2, BLANC); poser(bombe, y, 2, BLANC);
    if (y % 2 === 0) poser(bombe, y, 0, VERRE);
    poser(0, y, -2, ACIER); poser(0, y, 2, ACIER);
  }
  for (let dz = -2; dz <= 2; dz++) poser(0, H + 1, dz, BLANC);
}

// Les neuf lettres blanches sur la colline de Los Angeles.
function buildHollywood(poser) {
  for (let k = 0; k < 9; k++) {
    const dz = k * 2 - 8;
    for (let y = 1; y <= 3; y++) poser(0, y, dz, BLANC);
  }
}

// Les terrasses incas : des gradins de granit accrochés à la crête.
function buildTerrasses(poser) {
  for (let n = 0; n < 6; n++) {
    const r = 4 + n * 2;
    for (let dx = -r; dx <= r; dx++) {
      for (const dz of [-r, r]) poser(dx, -n + 3, dz, PIERRE);
      for (const dzz of [-r, r]) poser(dzz - 0 + dx * 0, -n + 3, dx, PIERRE);
    }
  }
  for (const [dx, dz] of [[-2, -2], [2, 0], [0, 2], [-1, 3]]) {
    for (let y = 4; y <= 5; y++) { poser(dx, y, dz, PIERRE); poser(dx + 1, y, dz, PIERRE); }
  }
}

// Les vieilles américaines de La Havane, en couleurs.
function buildVoituresCubaines(poser) {
  const teintes = [VERMILLON, uni(10), uni(5), ROSE, OR];
  [[-8, -20], [4, -12], [-2, 6], [10, 14], [-14, 2], [6, -26]].forEach(([du, dv], i) => {
    poser(du, 1, dv, teintes[i % teintes.length]);
    poser(du + 1, 1, dv, teintes[i % teintes.length]);
  });
}

const VERMILLON = uni(0);          // le rouge des toriis et des Chevrolet
const NOIRB = ARDOISE;             // le bronze sombre des statues de pont

// --- les fiches ---------------------------------------------------------

const FICHES = {
  rome: {
    lat0: 41.9028, lon0: 12.4964, echelle: 20, rayon: 75,
    fleuve: { pts: [[-49, -62], [-44, -20], [-50, 1], [-44, 25], [-41, 30], [-44, 55], [-46, 75]], l: 3 },
    trame: { ang: 0.2, pu: 5, pv: 4, w: 0.45, s: 0.8 },
    palette: [OCRE, uni(2), CREME, ROSE], toit: TUILE, hMaison: [3, 5],
    monuments: [
      { nom: 'Colisée', lat: 41.8902, lon: 12.4922, build: depuisCatalogue('colisee') },
      { nom: 'Panthéon', lat: 41.8986, lon: 12.4769, box: 6, build: dome(4, CREME, PIERRE) },
      { nom: 'Basilique St-Pierre', lat: 41.9022, lon: 12.4539, box: 9, build: dome(6, CREME, ARDOISE) },
      { nom: 'Forum romain', lat: 41.8925, lon: 12.4853, box: 6, seuil: 0.4, build: buildForum },
    ],
    lieux: [['Fontaine de Trevi', 41.9009, 12.4833], ['Vatican', 41.9029, 12.4534],
      ['Île Tibérine', 41.8905, 12.4776], ['Circus Maximus', 41.886, 12.485]],
    couleurToits: [178, 108, 82],
  },
  barcelone: {
    lat0: 41.3874, lon0: 2.1686, echelle: 20, rayon: 66,
    mer: { nx: 0.55, nz: 0.84, d: 40, plage: 3 },
    trame: { ang: 0.55, pu: 6, pv: 6, w: 0.5, s: 0.85, chanfrein: 1.6 },
    palette: [uni(20), CREME, ROSE, OCRE], toit: TUILE, hMaison: [4, 6],
    voies: [{ pts: [[0, 0], [15, 26]], l: 1.0 }],                  // la Rambla
    parcs: [{ cu: -26, cv: -60, ru: 8, rv: 6, mosaique: true }],   // le parc Güell
    monuments: [
      { nom: 'Sagrada Família', lat: 41.4036, lon: 2.1744, build: depuisCatalogue('sagrada') },
      { nom: 'Colonne de Colom', lat: 41.3758, lon: 2.1778, box: 4, seuil: 0.4, build: buildColom },
    ],
    lieux: [['La Rambla', 41.3809, 2.1735], ['Barceloneta', 41.3785, 2.1925],
      ['Parc Güell', 41.4145, 2.1527], ['Plaça Catalunya', 41.3874, 2.1686]],
    couleurToits: [186, 138, 96],
  },
  pise: {
    lat0: 43.7228, lon0: 10.3966, echelle: 20, rayon: 42,
    fleuve: { pts: [[-40, 17], [-10, 13], [15, 16], [40, 14]], l: 2.5 },
    trame: { ang: 0.15, pu: 5, pv: 4, w: 0.45, s: 0.8 },
    palette: [OCRE, CREME, uni(2)], toit: TUILE, hMaison: [3, 4],
    monuments: [
      { nom: 'Tour de Pise', lat: 43.7229, lon: 10.3966, build: depuisCatalogue('tour-pise') },
      { nom: 'Duomo de Pise', lat: 43.7231, lon: 10.3955, box: 6, build: dome(4, BLANC, TUILE) },
      { nom: 'Baptistère', lat: 43.7233, lon: 10.3941, box: 5, seuil: 0.4, build: dome(3, BLANC, TUILE) },
    ],
    lieux: [['Piazza dei Miracoli', 43.7229, 10.3958], ["L'Arno", 43.7160, 10.4000]],
    couleurToits: [182, 116, 88],
  },
  gizeh: {
    lat0: 29.9773, lon0: 31.1325, echelle: 24, rayon: 62,
    desert: true, oasis: { u0: 40 },                              // la vallée du Nil, à l'est
    monuments: [
      { nom: 'Pyramide de Khéops', lat: 29.9792, lon: 31.1342, build: depuisCatalogue('pyramide-gizeh') },
      // Khéphren garde sa coiffe : le sommet a conservé son calcaire lisse.
      { nom: 'Pyramide de Khéphren', lat: 29.9761, lon: 31.1308, box: 18, build: pyramide(15, 26, 5) },
      { nom: 'Pyramide de Mykérinos', lat: 29.9725, lon: 31.1281, box: 11, build: pyramide(8, 13, 0) },
      { nom: 'Le Sphinx', lat: 29.9753, lon: 31.1376, box: 6, seuil: 0.4, build: buildSphinx },
    ],
    lieux: [['Plateau de Gizeh', 29.9773, 31.1325], ['La vallée du Nil', 29.977, 31.152]],
    couleurToits: [216, 192, 150],
  },
  agra: {
    lat0: 27.1751, lon0: 78.0421, echelle: 24, rayon: 58,
    fleuve: { pts: [[-62, -26], [-40, -12], [-10, -8], [10, -6], [30, -12], [45, -20]], l: 4 },
    charbagh: { v0: 3, v1: 30, demi: 14 },                        // le jardin moghol en croix
    trame: { ang: 0, pu: 6, pv: 5, w: 0.45, s: 0.8, sud: 34 },
    palette: [uni(20), CREME, ROSE], toit: CREME, hMaison: [2, 4],
    monuments: [
      { nom: 'Taj Mahal', lat: 27.1751, lon: 78.0421, build: depuisCatalogue('taj-mahal') },
      { nom: 'Mosquée du Taj', lat: 27.1751, lon: 78.0399, box: 6, seuil: 0.4, build: buildMosqueeRouge },
      { nom: "Fort d'Agra", lat: 27.1795, lon: 78.0211, box: 10, build: buildFortRouge },
    ],
    lieux: [['Charbagh', 27.1731, 78.0421], ['La Yamuna', 27.1785, 78.045]],
    couleurToits: [206, 178, 140],
  },
  sydney: {
    lat0: -33.8688, lon0: 151.2093, echelle: 20, rayon: 66,
    baie: { v0: -9, v1: -30, presquile: { u0: 7, u1: 14, v1: -28 } },   // le port, et Bennelong Point
    trame: { ang: 0.1, pu: 6, pv: 5, w: 0.5, s: 0.85, tours: 0.55 },
    palette: [CREME, uni(20), brique(0)], toit: ARDOISE, hMaison: [4, 6],
    parcs: [{ cu: 14, cv: 2, ru: 9, rv: 6 }],                     // le jardin botanique
    monuments: [
      { nom: "Opéra de Sydney", lat: -33.8568, lon: 151.2153, build: depuisCatalogue('opera-sydney') },
      { nom: 'Harbour Bridge', lat: -33.8598, lon: 151.2108, box: 16, build: buildHarbourBridge },
    ],
    lieux: [['Circular Quay', -33.8609, 151.2105], ['Le CBD', -33.868, 151.207],
      ['Jardin botanique', -33.8642, 151.2166]],
    couleurToits: [150, 158, 168],
  },
  rio: {
    lat0: -22.9068, lon0: -43.1729, echelle: 10, rayon: 85,
    baieRio: true,                                                 // la géographie la plus singulière du jeu
    collines: [
      { nom: 'Pain de Sucre', cu: 17, cv: 48, r: 5, h: 22, roche: true },
      { nom: 'Corcovado', cu: -39, cv: 50, r: 11, h: 30, roche: true },
      { nom: 'Santa Marta', cu: -15, cv: 35, r: 6, h: 10, favela: true },
    ],
    foret: { u1: -20, v0: 20 },                                    // la forêt de Tijuca
    plage: { v0: 70, v1: 78 },                                     // Copacabana
    trame: { ang: 0.05, pu: 6, pv: 5, w: 0.5, s: 0.85 },
    palette: [BLANC, CREME, uni(20)], toit: TUILE, hMaison: [3, 6],
    paletteFavela: [ROSE, uni(10), uni(2), uni(5), OCRE],
    monuments: [
      // Le Christ est posé AU SOMMET du Corcovado : le monument hérite de
      // l'altitude de sa colline, bras ouverts au-dessus de la baie.
      { nom: 'Christ Rédempteur', lat: -22.9519, lon: -43.2105, build: depuisCatalogue('christ-redempteur') },
    ],
    lieux: [['Pain de Sucre', -22.9486, -43.1566], ['Copacabana', -22.9714, -43.1822],
      ['Forêt de Tijuca', -22.94, -43.21], ['Centro', -22.9068, -43.1729]],
    couleurToits: [188, 148, 108],
  },
  seattle: {
    lat0: 47.6062, lon0: -122.3321, echelle: 20, rayon: 54,
    cote: { base: -16, pente: 0.35, quais: true },                // la baie d'Elliott, au nord-ouest
    trame: { ang: -0.3, pu: 6, pv: 5, w: 0.5, s: 0.85, tours: 0.6 },
    palette: [brique(0), CREME, ACIER], toit: ARDOISE, hMaison: [4, 6],
    monuments: [
      { nom: 'Space Needle', lat: 47.6205, lon: -122.3493, build: depuisCatalogue('space-needle') },
      { nom: 'Pike Place', lat: 47.6097, lon: -122.3422, box: 6, seuil: 0.4, build: buildPikePlace },
      { nom: 'La grande roue', lat: 47.6061, lon: -122.3425, box: 9, seuil: 0.4, build: buildGrandeRoue },
    ],
    lieux: [['Le front de mer', 47.605, -122.34], ['Downtown', 47.608, -122.335]],
    couleurToits: [140, 146, 156],
  },
  // --- LES CINQUANTE GRANDES — l'Europe --------------------------------------
  madrid: {
    lat0: 40.4168, lon0: -3.7038, echelle: 20, rayon: 50,
    trame: { ang: 0.3, pu: 6, pv: 5, w: 0.5, s: 0.85 },
    palette: [brique(0), CREME, OCRE], toit: TUILE, hMaison: [4, 6],
    parcs: [{ cu: 33, cv: 3, ru: 8, rv: 10, lac: { cu: 31, cv: 1, ru: 3, rv: 4 } }],   // le Retiro et son bassin
    monuments: [
      { nom: 'Palais royal', lat: 40.418, lon: -3.7144, box: 8, build: palaisLong(6, BLANC, ARDOISE) },
      { nom: "Porte d'Alcalá", lat: 40.42, lon: -3.6889, box: 6, seuil: 0.4, build: archePorte(4, 7, PIERRE) },
      { nom: 'Plaza Mayor', lat: 40.4155, lon: -3.7074, box: 8, seuil: 0.4, build: muraillesRect(6, 3, brique(0)) },
    ],
    lieux: [['Le Retiro', 40.4153, -3.6845], ['Gran Vía', 40.4203, -3.7058],
      ['Le Prado', 40.4138, -3.6921]],
    couleurToits: [186, 122, 92],
  },
  lisbonne: {
    lat0: 38.7223, lon0: -9.1393, echelle: 20, rayon: 46,
    mer: { nx: 0.1, nz: 0.99, d: 34, quais: true },               // le Tage, large comme une mer
    collines: [
      { nom: 'Alfama', cu: 10, cv: 19, r: 10, h: 8, favela: true },
      { nom: 'Bairro Alto', cu: -12, cv: 8, r: 9, h: 7, favela: true },
    ],
    trame: { ang: 0, pu: 5, pv: 4, w: 0.45, s: 0.8 },             // la Baixa de Pombal, au cordeau
    palette: [CREME, BLANC, ROSE, uni(2)], toit: TUILE, hMaison: [3, 5],
    paletteFavela: [CREME, ROSE, BLANC, OCRE],                    // les azulejos pastel des pentes
    monuments: [
      { nom: 'Château São Jorge', lat: 38.7139, lon: -9.1335, box: 8, build: muraillesRect(6, 4, PIERRE) },
      { nom: 'Santa Justa', lat: 38.7124, lon: -9.1393, box: 3, seuil: 0.4, build: minaret(10, ACIER) },
      { nom: 'Praça do Comércio', lat: 38.7075, lon: -9.1364, box: 6, seuil: 0.4, build: archePorte(4, 6, CREME) },
    ],
    lieux: [['La Baixa', 38.7118, -9.1365], ["L'Alfama", 38.7126, -9.1305], ['Le Tage', 38.703, -9.135]],
    couleurToits: [198, 128, 92],
  },
  amsterdam: {
    lat0: 52.3676, lon0: 4.9041, echelle: 20, rayon: 40,
    fleuve: { pts: [[-38, -33], [0, -29], [38, -31]], l: 6 },     // l'IJ, derrière la gare
    canaux: { rayons: [10, 15, 20, 25], v0: -6 },                 // la ceinture de canaux, en demi-cercles
    trame: { ang: 0, pu: 4, pv: 4, w: 0.4, s: 0.7 },
    palette: [brique(0), brique(18), CREME, ARDOISE], toit: ARDOISE, hMaison: [4, 6],
    monuments: [
      { nom: 'Palais du Dam', lat: 52.3731, lon: 4.8913, box: 7, build: palaisLong(5, CREME, ARDOISE) },
      { nom: 'Westerkerk', lat: 52.3745, lon: 4.8839, box: 3, build: minaret(16, brique(0)) },
      { nom: 'Rijksmuseum', lat: 52.36, lon: 4.8852, box: 8, build: palaisLong(6, brique(0), ARDOISE) },
    ],
    lieux: [['Le Dam', 52.373, 4.8936], ['Jordaan', 52.3739, 4.8809], ['Prinsengracht', 52.37, 4.884]],
    couleurToits: [150, 118, 96],
  },
  bruxelles: {
    lat0: 50.8503, lon0: 4.3517, echelle: 20, rayon: 34,
    trame: { ang: 0.15, pu: 5, pv: 4, w: 0.45, s: 0.8 },
    palette: [PIERRE, CREME, brique(0)], toit: ARDOISE, hMaison: [4, 6],
    parcs: [{ cu: 15, cv: 13, ru: 6, rv: 5 }],                    // le parc de Bruxelles
    monuments: [
      { nom: "L'hôtel de ville", lat: 50.8467, lon: 4.3525, box: 3, build: minaret(22, PIERRE) },
      { nom: 'Manneken Pis', lat: 50.845, lon: 4.3499, box: 2, seuil: 0.4, build: statuette(2, OR) },
      // L'Atomium est à Heysel, à cinq vrais kilomètres du centre : hors du
      // rayon de la ville, ses neuf boules posent sur la campagne — comme en vrai.
      { nom: "L'Atomium", lat: 50.8949, lon: 4.3415, box: 8, build: buildAtomium },
    ],
    lieux: [['Grand-Place', 50.8467, 4.3536], ['Le Sablon', 50.8415, 4.3565]],
    couleurToits: [160, 152, 144],
  },
  berlin: {
    lat0: 52.52, lon0: 13.405, echelle: 20, rayon: 50,
    fleuve: { pts: [[-46, -2], [-30, -4], [-16, -3], [-9, 1], [-2, 6], [8, 4], [22, -8], [46, -14]], l: 3 },   // la Spree
    trame: { ang: 0.1, pu: 6, pv: 5, w: 0.5, s: 0.85 },
    palette: [PIERRE, CREME, ACIER], toit: ARDOISE, hMaison: [4, 6],
    parcs: [{ cu: -47, cv: 12, ru: 6, rv: 8 }],                   // le Tiergarten
    monuments: [
      { nom: 'Porte de Brandebourg', lat: 52.5163, lon: 13.3777, box: 7, build: archePorte(5, 7, PIERRE) },
      { nom: 'Fernsehturm', lat: 52.5208, lon: 13.4094, box: 4, build: tourBoule(40, [28], ACIER, ACIER) },
      { nom: 'Reichstag', lat: 52.5186, lon: 13.3762, box: 7, build: dome(4, PIERRE, VERRE) },
      { nom: 'Berliner Dom', lat: 52.5192, lon: 13.4038, box: 6, build: dome(4, CREME, uni(6)) },
    ],
    lieux: [['Unter den Linden', 52.5171, 13.3888], ['Alexanderplatz', 52.5219, 13.4132],
      ["L'île aux Musées", 52.5169, 13.4019]],
    couleurToits: [156, 152, 148],
  },
  munich: {
    lat0: 48.1351, lon0: 11.582, echelle: 20, rayon: 42,
    fleuve: { pts: [[30, -40], [26, -10], [28, 15], [32, 40]], l: 3 },   // l'Isar
    trame: { ang: 0.1, pu: 5, pv: 4, w: 0.45, s: 0.8 },
    palette: [CREME, ROSE, OCRE, uni(2)], toit: TUILE, hMaison: [4, 5],
    parcs: [{ cu: 16, cv: -32, ru: 7, rv: 9 }],                   // le jardin anglais
    monuments: [
      { nom: 'Frauenkirche', lat: 48.1386, lon: 11.5736, box: 6, build: bulbes([uni(5), uni(5)], 10) },
      { nom: "Le nouvel hôtel de ville", lat: 48.1374, lon: 11.5755, box: 3, build: minaret(16, PIERRE) },
      { nom: 'Colonne de Marie', lat: 48.1371, lon: 11.5748, box: 2, seuil: 0.4, build: statuette(5, OR) },
    ],
    lieux: [['Marienplatz', 48.1374, 11.5755], ['Viktualienmarkt', 48.1353, 11.5763]],
    couleurToits: [190, 130, 96],
  },
  vienne: {
    lat0: 48.2082, lon0: 16.3738, echelle: 20, rayon: 46,
    fleuve: { pts: [[-22, -32], [8, -20], [28, -6], [40, 12]], l: 3 },   // le canal du Danube
    voies: [{ pts: [[-16, -14], [14, -14], [16, 12], [-14, 14], [-16, -14]], l: 1.2 }],   // le Ring
    trame: { ang: 0.2, pu: 5, pv: 5, w: 0.45, s: 0.8 },
    palette: [CREME, BLANC, OCRE], toit: ARDOISE, hMaison: [4, 6],
    monuments: [
      { nom: 'Stephansdom', lat: 48.2086, lon: 16.3733, box: 4, build: minaret(24, ARDOISE) },
      { nom: 'La Hofburg', lat: 48.2065, lon: 16.3653, box: 8, build: palaisLong(6, CREME, uni(6)) },
      { nom: 'La grande roue du Prater', lat: 48.2167, lon: 16.3958, box: 9, build: buildGrandeRoue },
    ],
    lieux: [['Le Graben', 48.2088, 16.3696], ['Le Prater', 48.2162, 16.3987],
      ['Naschmarkt', 48.1985, 16.3634]],
    couleurToits: [178, 170, 158],
  },
  prague: {
    lat0: 50.0755, lon0: 14.4378, echelle: 13, rayon: 44,
    fleuve: { pts: [[-28, 42], [-33, 10], [-29, -18], [-18, -36], [-2, -43]], l: 4 },   // la Vltava
    collines: [{ nom: 'Hradčany', cu: -35, cv: -22, r: 9, h: 8 }],
    trame: { ang: 0.35, pu: 5, pv: 4, w: 0.4, s: 0.75 },
    palette: [OCRE, CREME, ROSE, uni(2)], toit: TUILE, hMaison: [3, 5],
    monuments: [
      { nom: 'Le château de Prague', lat: 50.0906, lon: 14.4005, box: 8, build: palaisLong(6, CREME, ARDOISE) },
      { nom: 'Saint-Guy', lat: 50.0912, lon: 14.4025, box: 4, build: minaret(18, PIERRE) },
      { nom: 'Le pont Charles', lat: 50.0865, lon: 14.4114, box: 9, build: pontBati(7, false, true) },
      { nom: "L'horloge astronomique", lat: 50.087, lon: 14.4207, box: 3, seuil: 0.4, build: minaret(12, PIERRE) },
    ],
    lieux: [['La place de la Vieille-Ville', 50.0875, 14.4213], ['Malá Strana', 50.0874, 14.4039]],
    couleurToits: [192, 116, 82],
  },
  venise: {
    lat0: 45.4408, lon0: 12.3155, echelle: 15, rayon: 40,
    lagune: { r: 33 },                                            // la ville flotte au milieu de sa lagune
    fleuve: { pts: [[-8, -13], [2, -9], [10, -3], [18, 1], [24, 6], [21, 12], [24, 17]], l: 2.5 },   // le Grand Canal
    trame: { ang: 0.1, pu: 4, pv: 4, w: 0.35, s: 0.65, ruelles: true },   // les calli — pas une voiture
    palette: [OCRE, ROSE, CREME, brique(0)], toit: TUILE, hMaison: [3, 5],
    monuments: [
      { nom: 'Le campanile', lat: 45.4341, lon: 12.339, box: 3, build: minaret(20, brique(0)) },
      { nom: 'Saint-Marc', lat: 45.4346, lon: 12.3399, box: 6, build: dome(3, CREME, ARDOISE) },
      { nom: 'Le Rialto', lat: 45.438, lon: 12.3358, box: 6, build: pontBati(4, true) },
    ],
    lieux: [['Place Saint-Marc', 45.434, 12.3387], ['Le Grand Canal', 45.4408, 12.3306]],
    couleurToits: [196, 126, 92],
  },
  florence: {
    lat0: 43.7696, lon0: 11.2558, echelle: 20, rayon: 40,
    fleuve: { pts: [[-38, 9], [-15, 6], [-4, 4], [15, 4], [38, 7]], l: 3 },   // l'Arno
    trame: { ang: 0.05, pu: 5, pv: 4, w: 0.4, s: 0.75 },
    palette: [OCRE, CREME, ROSE], toit: TUILE, hMaison: [3, 5],
    monuments: [
      { nom: 'Le Duomo', lat: 43.7731, lon: 11.256, box: 7, build: dome(5, CREME, TUILE) },
      { nom: 'Palazzo Vecchio', lat: 43.7694, lon: 11.2565, box: 3, build: minaret(20, PIERRE) },
      { nom: 'Le Ponte Vecchio', lat: 43.7679, lon: 11.2531, box: 7, build: pontBati(5, true) },
    ],
    lieux: [['Les Offices', 43.7685, 11.256], ['Boboli', 43.7623, 11.2486]],
    couleurToits: [194, 128, 90],
  },
  athenes: {
    lat0: 37.9838, lon0: 23.7275, echelle: 20, rayon: 46,
    collines: [
      { nom: "L'Acropole", cu: -3, cv: 27, r: 10, h: 14, roche: true, mesa: true },
      { nom: 'Le Lycabette', cu: 29, cv: 4, r: 8, h: 18, roche: true },
    ],
    trame: { ang: 0.25, pu: 5, pv: 4, w: 0.45, s: 0.8 },
    palette: [BLANC, CREME], toit: CREME, hMaison: [3, 5],        // la ville blanche
    monuments: [
      // Le Parthénon hérite de l'altitude de sa mesa, comme le Christ du Corcovado.
      { nom: 'Le Parthénon', lat: 37.9715, lon: 23.7267, box: 9, build: colonnade(7, 3) },
      { nom: 'Temple de Zeus', lat: 37.9693, lon: 23.7331, box: 6, seuil: 0.4, build: colonnade(4, 2) },
      { nom: 'Le Parlement', lat: 37.9755, lon: 23.7375, box: 8, build: palaisLong(6, CREME, TUILE) },
    ],
    lieux: [['Plaka', 37.9725, 23.7286], ['Syntagma', 37.9756, 23.7349], ['Monastiraki', 37.976, 23.7256]],
    couleurToits: [226, 224, 216],
  },
  istanbul: {
    lat0: 41.0082, lon0: 28.9784, echelle: 20, rayon: 54,
    fleuve: { pts: [[40, -54], [36, -20], [42, 10], [38, 54]], l: 6 },        // le Bosphore
    fleuves: [{ pts: [[36, -22], [10, -25], [-15, -32], [-38, -45]], l: 4 }], // la Corne d'Or
    trame: { ang: 0.3, pu: 5, pv: 4, w: 0.4, s: 0.75 },
    palette: [OCRE, CREME, ROSE, uni(2)], toit: TUILE, hMaison: [3, 5],
    monuments: [
      { nom: 'Sainte-Sophie', lat: 41.0086, lon: 28.9802, box: 8, build: dome(6, OCRE, ARDOISE) },
      { nom: 'La Mosquée bleue', lat: 41.0054, lon: 28.9768, box: 7, build: dome(5, CREME, ARDOISE) },
      { nom: 'La tour de Galata', lat: 41.0256, lon: 28.9744, box: 3, build: minaret(18, PIERRE) },
      { nom: 'Topkapi', lat: 41.0115, lon: 28.9834, box: 9, build: muraillesRect(7, 4, PIERRE) },
    ],
    lieux: [['Le Grand Bazar', 41.0106, 28.9681], ['Sultanahmet', 41.0058, 28.9784],
      ['Galata', 41.0233, 28.9736]],
    couleurToits: [198, 138, 96],
  },
  moscou: {
    lat0: 55.7558, lon0: 37.6173, echelle: 20, rayon: 56,
    fleuve: { pts: [[-52, 30], [-25, 24], [-5, 20], [20, 22], [52, 28]], l: 4 },   // la Moskova
    trame: { ang: 0.15, pu: 6, pv: 5, w: 0.5, s: 0.85 },
    // Le PILOTE du programme réalisme v2 : la grammaire relevée sur la rue
    // Piatnitskaïa — pastels (crème, beige, sable, saumon) à travées
    // régulières et encadrements blancs, corniche, toits de métal vert.
    // Depuis « refait une passe sur toutes les villes » (Max), la grammaire
    // est le DÉFAUT de toute ville à trame hors médinas — chaque ville garde
    // ses matériaux par sa palette. `facades: 2` reste ici pour mémoire.
    facades: 2,
    palette: [CREME, uni(19), uni(20), uni(16)], toit: uni(6), hMaison: [4, 6],
    monuments: [
      { nom: 'Saint-Basile', lat: 55.7525, lon: 37.6231, box: 6, build: bulbes([VERMILLON, uni(5), uni(10), uni(2), ROSE]) },
      { nom: 'Le Kremlin', lat: 55.752, lon: 37.6175, box: 10, build: muraillesRect(8, 5, ROUGE_GRES) },
      { nom: 'Le Bolchoï', lat: 55.7602, lon: 37.6186, box: 6, build: colonnade(4, 3) },
    ],
    lieux: [['La place Rouge', 55.7539, 37.6208], ['Le Goum', 55.7547, 37.6215],
      ['La Tretiakov', 55.7415, 37.6208]],
    couleurToits: [176, 148, 128],
  },
  stpetersbourg: {
    lat0: 59.9311, lon0: 30.3609, echelle: 16, rayon: 48,
    fleuve: { pts: [[-48, -19], [-25, -25], [0, -35], [20, -48]], l: 4 },     // la Neva
    voies: [{ pts: [[-46, -13], [0, 0], [12, 5]], l: 1.2 }],                  // la perspective Nevski
    trame: { ang: 0.4, pu: 6, pv: 5, w: 0.5, s: 0.85 },
    palette: [CREME, ROSE, uni(29), OCRE], toit: ARDOISE, hMaison: [4, 5],
    monuments: [
      { nom: "Le palais d'Hiver", lat: 59.9398, lon: 30.3146, box: 11, build: palaisLong(9, uni(29), BLANC) },
      { nom: 'Saint-Sauveur-sur-le-Sang', lat: 59.94, lon: 30.3289, box: 6, build: bulbes([VERMILLON, uni(10), uni(2)]) },
      { nom: 'Notre-Dame-de-Kazan', lat: 59.9343, lon: 30.3245, box: 7, build: colonnade(5, 3) },
    ],
    lieux: [['La perspective Nevski', 59.933, 30.345], ['Dostoïevskaïa', 59.9284, 30.3465]],
    couleurToits: [172, 168, 160],
  },
  stockholm: {
    lat0: 59.3293, lon0: 18.0686, echelle: 20, rayon: 42,
    archipel: [{ v0: 1.6, v1: 3.4 }, { v0: 12, v1: 15 }],             // Norrström et Söderström — Gamla Stan entre les deux
    mer: { nx: 0.95, nz: 0.3, d: 30 },                            // le Saltsjön, vers le large
    trame: { ang: 0.2, pu: 5, pv: 4, w: 0.45, s: 0.8 },
    palette: [OCRE, ROSE, CREME, uni(2)], toit: TUILE, hMaison: [4, 6],
    monuments: [
      { nom: 'Le Palais royal', lat: 59.3268, lon: 18.0717, box: 8, build: palaisLong(6, OCRE, ARDOISE) },
      { nom: "L'hôtel de ville", lat: 59.3274, lon: 18.0543, box: 4, build: minaret(15, brique(0)) },
      { nom: 'Storkyrkan', lat: 59.3257, lon: 18.0706, box: 3, seuil: 0.4, build: minaret(10, OCRE) },
    ],
    lieux: [['Gamla Stan', 59.3258, 18.0717], ['Sergels torg', 59.3322, 18.0644],
      ['Djurgården', 59.3268, 18.0905]],
    couleurToits: [200, 144, 100],
  },
  copenhague: {
    lat0: 55.6761, lon0: 12.5683, echelle: 14, rayon: 40,
    fleuve: { pts: [[26, -40], [27, -12], [28, 12], [24, 40]], l: 3 },        // le port intérieur
    trame: { ang: 0.15, pu: 5, pv: 4, w: 0.45, s: 0.8 },
    palette: [brique(0), OCRE, ROSE, CREME], toit: ARDOISE, hMaison: [4, 6],
    monuments: [
      { nom: 'Amalienborg', lat: 55.6841, lon: 12.5928, box: 7, build: palaisLong(5, CREME, ARDOISE) },
      { nom: 'La Rundetaarn', lat: 55.6813, lon: 12.5757, box: 3, build: minaret(10, brique(0)) },
      // Sur son rocher, dans l'eau du port — la tête au-dessus des vagues.
      { nom: 'La Petite Sirène', lat: 55.6929, lon: 12.5993, box: 2, seuil: 0.4, build: statuette(6, uni(6)) },
      { nom: 'Tivoli', lat: 55.6736, lon: 12.5681, box: 9, build: buildGrandeRoue },
    ],
    lieux: [['Nyhavn', 55.6797, 12.59], ['Strøget', 55.6786, 12.5771]],
    couleurToits: [166, 122, 94],
  },
  // --- l'Asie et le Moyen-Orient ---------------------------------------------
  tokyo: {
    lat0: 35.6812, lon0: 139.7671, echelle: 11, rayon: 60,
    tourMax: 34,
    fleuve: { pts: [[38, -48], [31, -20], [34, 8], [28, 38]], l: 4 },         // la Sumida
    trame: { ang: 0.1, pu: 6, pv: 5, w: 0.5, s: 0.85, tours: 0.5 },
    palette: [BLANC, CREME, ACIER], toit: ARDOISE, hMaison: [4, 7],
    parcs: [{ cu: -14, cv: -5, ru: 10, rv: 8 }],                  // le palais impérial et ses jardins
    monuments: [
      { nom: 'La tour de Tokyo', lat: 35.6586, lon: 139.7454, box: 4, build: tourBoule(24, [], VERMILLON, BLANC) },
      { nom: 'La Skytree', lat: 35.7101, lon: 139.8107, box: 4, build: tourBoule(38, [30], ACIER, ACIER) },
      { nom: 'Sensō-ji', lat: 35.7148, lon: 139.7967, box: 8, build: pagode(5, VERMILLON, TUILE) },
      { nom: 'Le palais impérial', lat: 35.6852, lon: 139.7528, box: 10, build: muraillesRect(8, 3, PIERRE) },
    ],
    lieux: [['Ginza', 35.6717, 139.765], ['Akihabara', 35.6984, 139.7731], ['Ueno', 35.7141, 139.7774]],
    couleurToits: [158, 160, 168],
  },
  kyoto: {
    lat0: 35.0116, lon0: 135.7681, echelle: 8, rayon: 42,
    fleuve: { pts: [[3, -38], [2.5, -10], [2, 20], [-1, 40]], l: 1.6 },       // la Kamo — FINE : large de 2,5 elle avalait l'ancre, et Gion avec
    collines: [{ nom: 'Higashiyama', cu: 17, cv: 12, r: 10, h: 10 }],
    trame: { ang: 0, pu: 5, pv: 5, w: 0.45, s: 0.8 },             // la grille impériale, millénaire
    palette: [CREME, uni(19), OCRE], toit: ARDOISE, hMaison: [2, 4],
    monuments: [
      { nom: "Le Pavillon d'or", lat: 35.0394, lon: 135.7292, box: 5, build: pagode(3, OR, TUILE) },
      { nom: 'Fushimi Inari', lat: 34.9671, lon: 135.7727, box: 14, seuil: 0.4, build: buildToriis },
      { nom: 'Kiyomizu-dera', lat: 34.9949, lon: 135.785, box: 6, build: pagode(3, VERMILLON, TUILE) },
      { nom: 'Tō-ji', lat: 34.9805, lon: 135.7476, box: 7, build: pagode(5, ARDOISE, TUILE) },
    ],
    lieux: [['Gion', 35.0037, 135.7751], ['Le chemin de la philosophie', 35.0271, 135.7944]],
    couleurToits: [130, 126, 128],
  },
  seoul: {
    lat0: 37.5665, lon0: 126.978, echelle: 20, rayon: 50,
    tourMax: 30,
    fleuve: { pts: [[-48, 48], [-15, 44], [15, 42], [48, 46]], l: 6 },        // le Han
    collines: [{ nom: 'Namsan', cu: 18, cv: 34, r: 10, h: 16 }],
    trame: { ang: 0.1, pu: 6, pv: 5, w: 0.5, s: 0.85, tours: 0.55 },
    palette: [BLANC, CREME, ACIER], toit: ARDOISE, hMaison: [4, 7],
    monuments: [
      { nom: 'Gyeongbokgung', lat: 37.5796, lon: 126.977, box: 8, build: palaisLong(6, VERMILLON, uni(6)) },
      { nom: 'La tour de Séoul', lat: 37.5512, lon: 126.9882, box: 4, build: tourBoule(20, [16], ACIER, ACIER) },
      { nom: 'Namdaemun', lat: 37.5599, lon: 126.9753, box: 5, seuil: 0.4, build: archePorte(3, 4, PIERRE) },
    ],
    lieux: [['Myeongdong', 37.5637, 126.9838], ['Bukchon', 37.5826, 126.9831],
      ['Insadong', 37.5744, 126.9856]],
    couleurToits: [160, 162, 170],
  },
  shanghai: {
    lat0: 31.2304, lon0: 121.4737, echelle: 18, rayon: 54,
    tourMax: 40,
    fleuve: { pts: [[32, -50], [38, -20], [38, 5], [34, 30], [38, 52]], l: 5 },   // le Huangpu — le Bund d'un côté, Pudong de l'autre
    trame: { ang: 0.15, pu: 6, pv: 5, w: 0.5, s: 0.85, tours: 0.6 },
    palette: [ACIER, CREME, brique(0)], toit: ARDOISE, hMaison: [4, 7],
    monuments: [
      { nom: "La perle de l'Orient", lat: 31.2397, lon: 121.4998, box: 4, build: tourBoule(36, [10, 26], ACIER, ROSE) },
      { nom: 'La tour Jin Mao', lat: 31.2372, lon: 121.5015, box: 4, build: tourBoule(40, [], ACIER, ACIER) },
      { nom: 'Le jardin Yu', lat: 31.2271, lon: 121.4921, box: 5, seuil: 0.4, build: pagode(2, VERMILLON, TUILE) },
    ],
    lieux: [['Le Bund', 31.24, 121.4906], ['Nanjing Road', 31.2354, 121.4762], ['Pudong', 31.2397, 121.5064]],
    couleurToits: [152, 156, 166],
  },
  hongkong: {
    lat0: 22.3193, lon0: 114.1694, echelle: 8, rayon: 46,
    tourMax: 38,
    archipel: [{ v0: 23.5, v1: 29.5 }],                           // le port Victoria, entre Kowloon et l'île
    collines: [{ nom: 'Le pic Victoria', cu: -20, cv: 39, r: 12, h: 22 }],
    trame: { ang: 0.05, pu: 5, pv: 5, w: 0.45, s: 0.8, tours: 0.5 },
    palette: [ACIER, CREME, BLANC], toit: ARDOISE, hMaison: [5, 8],
    monuments: [
      { nom: 'La Banque de Chine', lat: 22.2789, lon: 114.1616, box: 4, build: tourBoule(30, [], ACIER, VERRE) },
      { nom: "L'IFC", lat: 22.2849, lon: 114.1577, box: 4, build: tourBoule(34, [], CREME, CREME) },
      { nom: 'Le Star Ferry', lat: 22.2937, lon: 114.1684, box: 4, seuil: 0.4, build: statuette(2, VERMILLON) },
    ],
    lieux: [['Tsim Sha Tsui', 22.2976, 114.1722], ['Central', 22.2819, 114.1582], ['Le Pic', 22.2759, 114.1455]],
    couleurToits: [150, 154, 164],
  },
  singapour: {
    lat0: 1.29, lon0: 103.85, echelle: 20, rayon: 44,
    tourMax: 34,
    mer: { nx: 0.5, nz: 0.87, d: 38 },
    parcs: [{ cu: 17, cv: 9, ru: 9, rv: 10, lac: { cu: 17, cv: 9, ru: 7, rv: 8 } }],   // la Marina Bay elle-même
    trame: { ang: 0.2, pu: 6, pv: 5, w: 0.5, s: 0.85, tours: 0.6 },
    palette: [BLANC, CREME, ACIER], toit: ARDOISE, hMaison: [5, 8],
    monuments: [
      // Trois tours, une planche posée dessus : le SkyPark au-dessus de la baie.
      { nom: 'Marina Bay Sands', lat: 1.2834, lon: 103.8607, box: 8, build: (poser) => {
        for (const dz of [-5, 0, 5]) for (let y = 1; y <= 16; y++) { poser(0, y, dz, CREME); poser(1, y, dz, VERRE); }
        for (let dz = -6; dz <= 6; dz++) { poser(0, 17, dz, BLANC); poser(1, 17, dz, BLANC); }
      } },
      { nom: 'Les Supertrees', lat: 1.2816, lon: 103.8636, box: 7, seuil: 0.4, build: (poser) => {
        for (const [du, dv] of [[0, 0], [-4, 2], [4, -2], [2, 4], [-3, -4]]) {
          for (let y = 1; y <= 8; y++) poser(du, y, dv, uni(13));
          for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) poser(du + a, 8, dv + b, uni(5));
        }
      } },
      { nom: 'Le Merlion', lat: 1.2868, lon: 103.8545, box: 2, seuil: 0.4, build: statuette(4, BLANC) },
    ],
    lieux: [['Gardens by the Bay', 1.2816, 103.8656], ['Le quartier colonial', 1.2903, 103.8519]],
    couleurToits: [172, 176, 182],
  },
  bangkok: {
    lat0: 13.7563, lon0: 100.5018, echelle: 20, rayon: 46,
    fleuve: { pts: [[-22, -40], [-26, -5], [-27, 14], [-24, 28], [-28, 46]], l: 3.5 },   // la Chao Phraya
    trame: { ang: 0.05, pu: 5, pv: 4, w: 0.45, s: 0.8, tours: 0.45 },
    palette: [CREME, BLANC, ROSE], toit: TUILE, hMaison: [3, 6],
    monuments: [
      { nom: 'Le Grand Palais', lat: 13.75, lon: 100.4913, box: 8, build: muraillesRect(6, 4, BLANC) },
      { nom: 'Wat Arun', lat: 13.7437, lon: 100.4889, box: 6, seuil: 0.4, build: pagode(4, CREME, OR) },
      { nom: 'Wat Pho', lat: 13.7465, lon: 100.4933, box: 4, seuil: 0.4, build: statuette(3, OR) },
    ],
    lieux: [['Khao San', 13.7588, 100.4972], ['Chinatown', 13.7403, 100.5096],
      ['Le marché aux fleurs', 13.7417, 100.4973]],
    couleurToits: [204, 158, 116],
  },
  dubai: {
    lat0: 25.2048, lon0: 55.2708, echelle: 20, rayon: 50,
    tourMax: 46,
    mer: { nx: -0.6, nz: -0.8, d: 38, plage: 4 },                 // le Golfe, au nord-ouest
    trame: { ang: 0.35, pu: 7, pv: 6, w: 0.55, s: 0.9, tours: 0.7 },
    palette: [CREME, BLANC, ACIER], toit: CREME, hMaison: [5, 9],
    monuments: [
      { nom: 'Burj Khalifa', lat: 25.1972, lon: 55.2744, box: 5, build: buildBurj },
      { nom: 'La fontaine de Dubaï', lat: 25.1953, lon: 55.2724, box: 5, seuil: 0.4, hmin: 2, build: (poser) => {
        for (let y = 1; y <= 2; y++) poser(0, y, 0, EAU);            // le jet
        for (let dx = -3; dx <= 3; dx++) for (let dz = -2; dz <= 2; dz++) {
          poser(dx, 0, dz, Math.abs(dx) === 3 || Math.abs(dz) === 2 ? PIERRE : EAU);
        }
      } },
      // Le Burj al Arab est sur son île, à quinze vrais kilomètres au
      // sud-ouest — hors du rayon, sa voile seule au bord du Golfe.
      { nom: 'Burj al Arab', lat: 25.1412, lon: 55.1853, box: 7, build: buildVoile },
    ],
    lieux: [['Dubai Mall', 25.1985, 55.2796], ['Sheikh Zayed Road', 25.2098, 55.2777]],
    couleurToits: [206, 196, 176],
  },
  jerusalem: {
    lat0: 31.7683, lon0: 35.2137, echelle: 14, rayon: 40,
    collines: [{ nom: 'Le mont des Oliviers', cu: 36, cv: -16, r: 8, h: 12 }],
    trame: { ang: 0.25, pu: 4, pv: 4, w: 0.4, s: 0.7, ruelles: true },    // la vieille ville en ruelles
    palette: [GRES, CREME, PIERRE], toit: CREME, hMaison: [2, 4], // tout en pierre de Jérusalem
    monuments: [
      { nom: 'Le dôme du Rocher', lat: 31.778, lon: 35.2354, box: 7, build: dome(5, uni(10), OR) },
      { nom: 'Le mur des Lamentations', lat: 31.7767, lon: 35.2262, box: 7, build: (poser) => {
        for (let dz = -5; dz <= 5; dz++) for (let y = 1; y <= 6; y++) poser(0, y, dz, GRES);
      } },
      { nom: 'La vieille ville', lat: 31.7767, lon: 35.2295, box: 14, build: muraillesRect(12, 4, GRES) },
      { nom: 'La tour de David', lat: 31.7765, lon: 35.2274, box: 3, seuil: 0.4, build: minaret(10, GRES) },
    ],
    lieux: [['Le Saint-Sépulcre', 31.7784, 35.2296], ['Mahané Yehuda', 31.7857, 35.2007]],
    couleurToits: [214, 200, 172],
  },
  mumbai: {
    lat0: 18.94, lon0: 72.835, echelle: 20, rayon: 48,
    mer: { nx: 0.99, nz: 0.15, d: 12, quais: true },              // le port, à l'est
    cote: { base: -16, pente: 0.1 },                               // la mer d'Arabie, à l'ouest — Colaba est une presqu'île
    trame: { ang: 0.1, pu: 5, pv: 4, w: 0.45, s: 0.8, tours: 0.4 },
    palette: [brique(0), CREME, OCRE], toit: TUILE, hMaison: [3, 6],
    monuments: [
      { nom: "La porte de l'Inde", lat: 18.922, lon: 72.8347, box: 6, build: archePorte(4, 8, GRES) },
      { nom: 'Le Taj Mahal Palace', lat: 18.9217, lon: 72.8331, box: 7, build: palaisLong(5, brique(0), TUILE) },
      { nom: 'La gare Victoria', lat: 18.9398, lon: 72.8355, box: 7, build: dome(4, brique(0), ARDOISE) },
    ],
    lieux: [['Colaba', 18.918, 72.8315], ['Marine Drive', 18.941, 72.828]],
    couleurToits: [182, 140, 104],
  },
  delhi: {
    lat0: 28.6139, lon0: 77.209, echelle: 20, rayon: 45,
    voies: [{ pts: [[-17, -1], [39, 2]], l: 1.5 }],               // le Rajpath, du palais à la porte
    trame: { ang: 0.55, pu: 6, pv: 5, w: 0.5, s: 0.85 },          // les avenues en étoile de Lutyens
    palette: [GRES, CREME, ROSE], toit: CREME, hMaison: [3, 5],
    monuments: [
      { nom: "La porte de l'Inde", lat: 28.6129, lon: 77.2295, box: 8, build: archePorte(5, 10, GRES) },
      { nom: 'Rashtrapati Bhavan', lat: 28.6144, lon: 77.1996, box: 7, build: dome(4, GRES, ARDOISE) },
      { nom: 'Jantar Mantar', lat: 28.627, lon: 77.2166, box: 5, seuil: 0.4, build: (poser) => {
        for (let k = 0; k <= 6; k++) poser(k - 3, 1 + Math.min(k, 6 - k), 0, ROUGE_GRES);   // le cadran géant
      } },
    ],
    lieux: [['Connaught Place', 28.6315, 77.2167], ['Lodhi Gardens', 28.5931, 77.2197]],
    couleurToits: [210, 186, 150],
  },
  // --- les Amériques ------------------------------------------------------
  losangeles: {
    lat0: 34.0522, lon0: -118.2437, echelle: 12, rayon: 56,
    tourMax: 30,
    trame: { ang: 0.63, pu: 6, pv: 5, w: 0.55, s: 0.9, tours: 0.6 },   // le damier penché du downtown
    palette: [BLANC, CREME, ACIER], toit: CREME, hMaison: [4, 7],
    parcs: [{ cu: -18, cv: 20, ru: 6, rv: 5 }],
    monuments: [
      { nom: "L'hôtel de ville", lat: 34.0537, lon: -118.2427, box: 3, build: minaret(20, BLANC) },
      { nom: 'Walt Disney Hall', lat: 34.0553, lon: -118.25, box: 6, build: dome(4, ACIER, ACIER) },
      // Le panneau est sur le mont Lee, à dix vrais kilomètres — hors du
      // rayon, ses neuf lettres blanches sur la colline, comme en vrai.
      { nom: 'Hollywood', lat: 34.1341, lon: -118.3215, box: 11, seuil: 0.4, build: buildHollywood },
    ],
    lieux: [['Grand Central Market', 34.0508, -118.2489], ['Little Tokyo', 34.0505, -118.24]],
    couleurToits: [188, 184, 176],
  },
  chicago: {
    lat0: 41.8781, lon0: -87.6298, echelle: 20, rayon: 50,
    tourMax: 36,
    mer: { nx: 1, nz: 0, d: 24, plage: 2 },                       // le lac Michigan
    fleuve: { pts: [[23, -8], [3, -6], [-3, -2], [-4, 22]], l: 2.5 },   // la Chicago River et sa fourche sud
    trame: { ang: 0, pu: 6, pv: 5, w: 0.5, s: 0.85, tours: 0.6 },
    palette: [brique(0), ACIER, CREME], toit: ARDOISE, hMaison: [4, 7],
    parcs: [{ cu: 14, cv: -6, ru: 5, rv: 8 }],                    // Millennium Park
    monuments: [
      { nom: 'La Willis Tower', lat: 41.8789, lon: -87.6359, box: 4, build: tourBoule(42, [], NOIRB, NOIRB) },
      { nom: 'Le Bean', lat: 41.8827, lon: -87.6233, box: 4, seuil: 0.4, build: dome(2, ACIER, ACIER) },
      { nom: 'Le John Hancock', lat: 41.8988, lon: -87.6229, box: 4, build: tourBoule(36, [], NOIRB, NOIRB) },
      { nom: 'Navy Pier', lat: 41.8917, lon: -87.6086, box: 9, build: palaisLong(7, CREME, TUILE) },
    ],
    lieux: [['Le Loop', 41.8786, -87.6297], ['Magnificent Mile', 41.8946, -87.6247]],
    couleurToits: [148, 150, 160],
  },
  lasvegas: {
    lat0: 36.11, lon0: -115.17, echelle: 20, rayon: 44,
    desert: { bande: 16 },                                         // le Strip — et le désert du Nevada tout autour
    voies: [{ pts: [[-5, -42], [-4, 0], [-8, 42]], l: 2 }],
    trame: { ang: 0, pu: 7, pv: 6, w: 0.5, s: 0.9, tours: 0.55 },
    palette: [OR, ROSE, BLANC, uni(12)], toit: CREME, hMaison: [4, 8],
    parcs: [{ cu: -12, cv: -7, ru: 5, rv: 4, lac: { cu: -12, cv: -7, ru: 4, rv: 3 } }],   // le lac du Bellagio
    monuments: [
      { nom: 'Le Luxor', lat: 36.0955, lon: -115.1761, box: 12, build: (poser) => {
        for (let y = 0; y <= 14; y++) {
          const r = 10 - Math.round((y * 10) / 14);
          for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (Math.abs(dx) === r || Math.abs(dz) === r) poser(dx, y + 1, dz, y === 14 ? BLANC : NOIRB);
          }
        }
      } },
      { nom: 'La High Roller', lat: 36.1173, lon: -115.1685, box: 9, build: buildGrandeRoue },
      { nom: 'La demi-tour Eiffel', lat: 36.1125, lon: -115.1707, box: 4, build: tourBoule(16, [], ACIER, ACIER) },
    ],
    lieux: [['Le Strip', 36.1147, -115.1728]],
    couleurToits: [216, 196, 152],
  },
  miami: {
    lat0: 25.7617, lon0: -80.1918, echelle: 20, rayon: 42,
    mer: { nx: 1, nz: 0, d: 14, ile: { u0: 26, u1: 34, plage: 3 } },   // la baie de Biscayne — et Miami Beach, l'île-barrière
    trame: { ang: 0, pu: 5, pv: 5, w: 0.5, s: 0.85, tours: 0.45 },
    palette: [BLANC, ROSE, CREME, uni(7)], toit: CREME, hMaison: [3, 6],
    monuments: [
      { nom: 'La Freedom Tower', lat: 25.7787, lon: -80.1896, box: 3, build: minaret(14, CREME) },
      // Trois façades Art déco pastel, face à la plage.
      { nom: 'Ocean Drive', lat: 25.772, lon: -80.177, box: 5, seuil: 0.4, build: (poser) => {
        [[-3, ROSE], [0, uni(7)], [3, uni(2)]].forEach(([dz, c]) => {
          for (let y = 1; y <= 3; y++) poser(0, y, dz, c);
          poser(0, 4, dz, BLANC);
        });
      } },
    ],
    lieux: [['Bayside', 25.7785, -80.1867], ['South Beach', 25.7717, -80.1774]],
    couleurToits: [224, 210, 200],
  },
  toronto: {
    lat0: 43.6532, lon0: -79.3832, echelle: 20, rayon: 44,
    tourMax: 30,
    mer: { nx: 0, nz: 1, d: 26, quais: true },                    // le lac Ontario
    trame: { ang: 0.3, pu: 6, pv: 5, w: 0.5, s: 0.85, tours: 0.6 },
    palette: [ACIER, brique(0), CREME], toit: ARDOISE, hMaison: [4, 7],
    monuments: [
      { nom: 'La CN Tower', lat: 43.6426, lon: -79.3871, box: 4, build: tourBoule(44, [32], ACIER, ACIER) },
      { nom: 'Le Rogers Centre', lat: 43.6414, lon: -79.3894, box: 7, build: dome(5, BLANC, BLANC) },
      { nom: "L'ancien hôtel de ville", lat: 43.6525, lon: -79.3818, box: 3, build: minaret(12, brique(0)) },
    ],
    lieux: [['La Distillerie', 43.6503, -79.3596], ['Kensington', 43.6547, -79.4005]],
    couleurToits: [152, 154, 162],
  },
  mexico: {
    lat0: 19.4326, lon0: -99.1332, echelle: 20, rayon: 50,
    trame: { ang: 0, pu: 5, pv: 4, w: 0.45, s: 0.8 },             // le damier colonial
    palette: [ROUGE_GRES, OCRE, ROSE, CREME], toit: CREME, hMaison: [3, 5],
    parcs: [{ cu: -23, cv: -7, ru: 6, rv: 3 }],                   // l'Alameda
    monuments: [
      { nom: 'La cathédrale', lat: 19.4342, lon: -99.1332, box: 7, build: dome(4, PIERRE, OCRE) },
      { nom: 'Le Templo Mayor', lat: 19.4348, lon: -99.1316, box: 9, build: pyramide(7, 9, 0) },
      { nom: 'Bellas Artes', lat: 19.4352, lon: -99.1413, box: 6, build: dome(4, CREME, OCRE) },
      { nom: 'La Torre Latino', lat: 19.4339, lon: -99.1406, box: 3, build: tourBoule(28, [], ACIER, ACIER) },
    ],
    lieux: [['Madero', 19.4337, -99.1389], ['La Merced', 19.4258, -99.1244]],
    couleurToits: [196, 152, 124],
  },
  havane: {
    lat0: 23.1136, lon0: -82.3666, echelle: 9, rayon: 40,
    mer: { nx: 0.2, nz: -0.98, d: 30, quais: true },              // le détroit de Floride — le Malecón en quais
    trame: { ang: 0.2, pu: 5, pv: 4, w: 0.45, s: 0.8 },
    palette: [ROSE, CREME, OCRE, uni(7)], toit: CREME, hMaison: [3, 5],
    monuments: [
      { nom: 'Le Capitole', lat: 23.1359, lon: -82.3592, box: 7, build: dome(5, BLANC, BLANC) },
      { nom: 'La cathédrale', lat: 23.1391, lon: -82.3517, box: 5, build: minaret(8, GRES) },
      // Le Morro garde l'entrée du port, les pieds dans l'eau de la passe.
      { nom: 'El Morro', lat: 23.1502, lon: -82.3564, box: 7, build: muraillesRect(5, 6, GRES) },
      { nom: 'Les vieilles américaines', lat: 23.116, lon: -82.361, box: 28, seuil: 0.4, hmin: 1, build: buildVoituresCubaines },
    ],
    lieux: [['Le Malecón', 23.1445, -82.3661], ['La Habana Vieja', 23.1373, -82.3535]],
    couleurToits: [216, 190, 156],
  },
  buenosaires: {
    lat0: -34.6037, lon0: -58.3816, echelle: 20, rayon: 48,
    mer: { nx: 0.6, nz: -0.8, d: 34 },                            // le Río de la Plata
    voies: [{ pts: [[0, -42], [0, 42]], l: 2.5 }],                // la 9 de Julio — la plus large du monde
    trame: { ang: 0, pu: 5, pv: 5, w: 0.5, s: 0.85, tours: 0.5 },
    palette: [CREME, BLANC, OCRE], toit: ARDOISE, hMaison: [4, 7],
    monuments: [
      // L'Obélisque est exactement à l'ancre : c'est lui, le centre.
      { nom: "L'Obélisque", lat: -34.6037, lon: -58.3816, box: 4, build: obelisque(22) },
      { nom: 'La Casa Rosada', lat: -34.608, lon: -58.3702, box: 8, build: palaisLong(6, ROSE, ROSE) },
      { nom: 'Le Cabildo', lat: -34.6089, lon: -58.3742, box: 5, seuil: 0.4, build: archePorte(3, 4, BLANC) },
    ],
    lieux: [['Florida', -34.6035, -58.3752], ['San Telmo', -34.6203, -58.3717],
      ['Puerto Madero', -34.6081, -58.3634]],
    couleurToits: [184, 176, 164],
  },
  machupicchu: {
    lat0: -13.1631, lon0: -72.545, echelle: 20, rayon: 30,
    sol: 52,                                                       // la citadelle vit en altitude, pas à 33
    collines: [{ nom: 'Huayna Picchu', cu: -3, cv: -13, r: 7, h: 20, roche: true }],
    foret: { u1: 30, v0: -30 },                                    // la forêt de nuages, partout
    monuments: [
      { nom: 'Les terrasses incas', lat: -13.1633, lon: -72.5456, box: 16, seuil: 0.4, build: buildTerrasses },
      { nom: 'Le temple du Soleil', lat: -13.1642, lon: -72.545, box: 4, seuil: 0.4, build: muraillesRect(2, 2, PIERRE) },
    ],
    lieux: [['La porte du Soleil', -13.1655, -72.54], ['Le Huayna Picchu', -13.1575, -72.5465]],
    couleurToits: [148, 164, 128],
  },
  // --- l'Afrique ---------------------------------------------------------------
  marrakech: {
    lat0: 31.6295, lon0: -7.9811, echelle: 20, rayon: 44,
    trame: { ang: 0.2, pu: 4, pv: 4, w: 0.4, s: 0.7, ruelles: true },     // les ruelles serrées de la médina
    palette: [ROUGE_GRES, OCRE, ROSE], toit: ROUGE_GRES, hMaison: [2, 4],   // la ville rouge
    parcs: [{ cu: -10, cv: -27, ru: 4, rv: 4 }],                  // le jardin Majorelle
    monuments: [
      { nom: 'La Koutoubia', lat: 31.6258, lon: -7.9891, box: 4, build: minaret(18, ROUGE_GRES) },
      { nom: 'Les remparts', lat: 31.6295, lon: -7.9811, box: 18, build: muraillesRect(16, 4, ROUGE_GRES) },
      { nom: 'Le palais Bahia', lat: 31.6216, lon: -7.9822, box: 6, build: palaisLong(4, OCRE, TUILE) },
    ],
    lieux: [['Jemaâ el-Fna', 31.6259, -7.9852], ['Les souks', 31.6308, -7.9843],
      ['La Majorelle', 31.6417, -7.9862]],
    couleurToits: [190, 122, 90],
  },
  lecap: {
    lat0: -33.9249, lon0: 18.4241, echelle: 8, rayon: 44,
    mer: { nx: -0.5, nz: -0.87, d: 16, quais: true },             // la baie de la Table
    collines: [
      // La montagne-table : la seule mesa du jeu avec l'Acropole — plate au
      // sommet, abrupte au bord. La ville l'aplanirait sans cette fiche.
      { nom: 'La montagne de la Table', cu: -11, cv: 34, r: 14, h: 24, roche: true, mesa: true },
      { nom: 'La tête de Lion', cu: -26, cv: 10, r: 5, h: 18, roche: true },
    ],
    trame: { ang: 0.15, pu: 5, pv: 4, w: 0.45, s: 0.8 },
    palette: [BLANC, CREME, ROSE, uni(7)], toit: TUILE, hMaison: [3, 5],   // Bo-Kaap en couleurs
    monuments: [
      { nom: 'Le château de Bonne-Espérance', lat: -33.9258, lon: 18.4276, box: 8, build: muraillesRect(6, 4, OCRE) },
    ],
    lieux: [['Bo-Kaap', -33.92, 18.411], ['Le Waterfront', -33.908, 18.421],
      ['La montagne de la Table', -33.9628, 18.4098]],
    couleurToits: [204, 184, 162],
  },

};

// --- les deux cents villes ---------------------------------------------------
//
// Max : « recalibrate all cities, and 200 other cities ». Les cinquante
// grandes gardent leurs fiches écrites à la main — monuments, fleuves, baies.
// Les deux cents autres reçoivent une fiche FABRIQUÉE : un archétype régional
// (palette, toits, hauteurs, part de tours), un angle de trame propre à
// chacune, et la côte AUTOMATIQUE — le générateur interroge le planisphère
// autour des vraies coordonnées de la ville, et si la mer est là, la fiche
// reçoit sa `mer` orientée comme dans la réalité : plage au sud de Marseille,
// quais à l'ouest de Porto.
//
// Les gabarits sont en unités PRÉ-NORMALISATION : fabrique() leur applique le
// même grand recalibrage (v172) qu'aux fiches manuscrites — mêmes rues, mêmes
// trottoirs, mêmes îlots.
const ARCHETYPES = {
  europe: { pu: 5, pv: 4, hMaison: [3, 5], palette: [CREME, PIERRE, uni(2), OCRE], toit: ARDOISE, couleurToits: [152, 144, 140] },
  britannique: { pu: 5, pv: 4, hMaison: [3, 5], palette: [brique(0), ROUGE_GRES, CREME], toit: ARDOISE, couleurToits: [152, 120, 104] },
  nordique: { pu: 5, pv: 4, hMaison: [3, 5], palette: [ROSE, OCRE, uni(7), CREME], toit: ARDOISE, couleurToits: [134, 128, 134] },
  mediterranee: { pu: 5, pv: 4, hMaison: [3, 5], palette: [BLANC, CREME, OCRE, ROSE], toit: TUILE, plage: true, couleurToits: [186, 122, 90] },
  orient: { pu: 5, pv: 4, hMaison: [2, 4], palette: [GRES, CREME, ROSE], toit: CREME, couleurToits: [212, 186, 146] },
  asie: { pu: 5, pv: 4, hMaison: [3, 6], tours: 0.45, tourMax: 26, palette: [CREME, BLANC, ACIER], toit: ARDOISE, couleurToits: [158, 154, 152] },
  moderne: { pu: 6, pv: 5, hMaison: [4, 7], tours: 0.55, tourMax: 34, palette: [ACIER, CREME, BLANC], toit: ARDOISE, couleurToits: [142, 144, 150] },
  ameriquenord: { pu: 6, pv: 5, hMaison: [4, 6], tours: 0.5, tourMax: 30, grille: true, palette: [brique(0), ACIER, CREME], toit: ARDOISE, couleurToits: [148, 134, 126] },
  ameriquelatine: { pu: 5, pv: 4, hMaison: [3, 5], palette: [ROSE, uni(7), OCRE, CREME], toit: TUILE, couleurToits: [184, 132, 100] },
  afrique: { pu: 5, pv: 4, hMaison: [2, 4], palette: [OCRE, ROUGE_GRES, CREME], toit: CREME, couleurToits: [198, 158, 120] },
  tropical: { pu: 5, pv: 4, hMaison: [2, 4], palette: [BLANC, ROSE, uni(7), CREME], toit: TUILE, plage: true, couleurToits: [196, 142, 110] },
};

// La côte automatique. Le juge de paix n'est pas la géographie réelle mais le
// PLANISPHÈRE DU JEU : c'est lui qui peint l'océan autour du disque protégé de
// chaque ville, et une mer découpée dans la ville doit prolonger CET océan-là
// — pas celui d'une carte plus fine que la nôtre (le planisphère pose Porto à
// quarante kilomètres dans les terres ; lui donner des quais ferait un carré
// d'eau posé au milieu de la campagne). On sonde donc seize caps juste au-delà
// du disque, à l'échelle du monde (0,75 km/bloc) : chaque cap qui trouve la
// mer vote pour sa direction. Des votes qui s'accordent → une `mer` orientée
// comme sur la carte ; des votes dans tous les sens → une île (Honolulu,
// Malte), et l'océan réel qui l'entoure suffit.
function chercheMer(v) {
  const kmLon = Math.max(20, 111.32 * Math.cos((v.lat * Math.PI) / 180));
  let sx = 0, sz = 0, votes = 0, pres = 0;
  for (let k = 0; k < 16; k++) {
    const cap = (k / 16) * Math.PI * 2;
    const e = Math.cos(cap), s = Math.sin(cap);            // est, sud — le repère (u, v) du jeu
    for (const [blocs, poids] of [[v.r + 18, 2], [v.r + 50, 1]]) {
      const dist = blocs * 0.75;                            // l'échelle du monde
      const lat = v.lat - (s * dist) / 111.19;
      const lon = v.lon + (e * dist) / kmLon;
      if (!surTerreReelle(lat, lon)) {
        sx += e * poids; sz += s * poids; votes += poids;
        if (poids === 2) pres++;
      }
    }
  }
  if (pres < 2) return null;                                // pas de mer au bord du disque
  const l = Math.hypot(sx, sz);
  if (l < votes * 0.5) return null;                         // île : la mer est partout autour
  return { nx: sx / l, nz: sz / l, d: 0 };                  // d est posé par ficheGeneree (0.55·rayon)
}

function ficheGeneree(v) {
  const arch = ARCHETYPES[v.style] || ARCHETYPES.europe;
  // L'angle de trame : déterministe par ville, pour que deux voisines ne
  // soient pas deux copies — sauf les grilles nord-américaines, plein nord.
  let h = 0;
  for (let i = 0; i < v.cle.length; i++) h = Math.imul(h ^ v.cle.charCodeAt(i), 2654435761);
  const t = (h >>> 0) / 4294967296;
  const fiche = {
    lat0: v.lat, lon0: v.lon, echelle: 20, rayon: v.r,
    trame: { ang: arch.grille ? 0 : t * 1.4, pu: arch.pu, pv: arch.pv, w: 0.5, s: 0.85 },
    palette: arch.palette, toit: arch.toit, hMaison: arch.hMaison,
    couleurToits: arch.couleurToits,
  };
  if (arch.tours) {
    fiche.trame.tours = arch.tours;
    // l'ambition suit la taille : une capitale moderne monte plus haut
    fiche.tourMax = Math.max(16, Math.round(arch.tourMax * Math.min(1, v.r / 80)));
  }
  const mer = chercheMer(v);
  if (mer) fiche.mer = { ...mer, d: Math.round(v.r * 0.55), ...(arch.plage ? { plage: 3 } : { quais: true }) };
  return fiche;
}

export const VILLES_MONDE = [
  ...Object.entries(FICHES).map(([cle, f]) => fabrique(cle, f)),
  ...VILLES_GENEREES.map((v) => fabrique(v.cle, ficheGeneree(v))),
];

// --- l'index spatial ---------------------------------------------------------
//
// Quarante-six villes, et chaque colonne de terrain les interrogeait TOUTES —
// quarante-six hypoténuses par colonne, des dizaines de milliers de colonnes
// par rendu de carte : c'est ce qui faisait laguer la carte. Une ville tient
// dans un disque de 128 blocs au plus (rayon + fondu) : on range donc chacune
// dans les cases de 512 blocs que son disque touche, et une colonne ne regarde
// plus que sa case — zéro ou une ville dans l'immense majorité des cas.
const CASE = 512;
const INDEX_VILLES = new Map();
for (const f of VILLES_MONDE) {
  const portee = f.rayon + 14;
  for (let cx = Math.floor((f.ancre.x - portee) / CASE); cx <= Math.floor((f.ancre.x + portee) / CASE); cx++) {
    for (let cz = Math.floor((f.ancre.z - portee) / CASE); cz <= Math.floor((f.ancre.z + portee) / CASE); cz++) {
      const cle2 = cx * 100000 + cz;
      if (!INDEX_VILLES.has(cle2)) INDEX_VILLES.set(cle2, []);
      INDEX_VILLES.get(cle2).push(f);
    }
  }
}
const RIEN = [];
function villesPres(x, z) {
  return INDEX_VILLES.get(Math.floor(x / CASE) * 100000 + Math.floor(z / CASE)) || RIEN;
}

// Cette colonne est-elle dans une ville de la machine ? La forêt sauvage
// s'arrête là (treeAt, dans world.js) : une ville plante ses parcs elle-même,
// et un chêne au milieu d'un carrefour n'est pas de la nature, c'est un bug.
// Vu sur les captures de Marseille et Lyon (v173) : posées sur du bruit de
// forêt dense, elles disparaissaient sous les feuillages.
export function dansVilleMonde(x, z) {
  for (const f of villesPres(x, z)) {
    if (Math.hypot(x - f.ancre.x, z - f.ancre.z) <= f.rayon) return true;
  }
  return false;
}

// --- la géométrie commune ----------------------------------------------------

function distancePolyligne(pts, u, v) {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [u0, v0] = pts[i], [u1, v1] = pts[i + 1];
    const du = u1 - u0, dv = v1 - v0;
    const l2 = du * du + dv * dv || 1;
    const t = Math.max(0, Math.min(1, ((u - u0) * du + (v - v0) * dv) / l2));
    min = Math.min(min, Math.hypot(u - (u0 + du * t), v - (v0 + dv * t)));
  }
  return min;
}

// L'eau d'une ville, en ce point ? (hors Tamise : Londres a son propre module)
function eauDeVille(f, u, v) {
  if (f.fleuve && distancePolyligne(f.fleuve.pts, u, v) < f.fleuve.l) return true;
  for (const fl of f.fleuves || []) {
    if (distancePolyligne(fl.pts, u, v) < fl.l) return true;      // la Corne d'Or, en plus du Bosphore
  }
  if (f.lagune && Math.hypot(u, v) > f.lagune.r) return true;     // Venise flotte au milieu
  if (f.canaux && v > f.canaux.v0) {
    const dc = Math.hypot(u, v);                                   // la ceinture d'Amsterdam
    for (const rc of f.canaux.rayons) if (Math.abs(dc - rc) < 1.1) return true;
  }
  for (const ch of f.archipel || []) {
    if (v >= ch.v0 && v <= ch.v1) return true;                    // les passes de Stockholm, le port Victoria
  }
  if (f.mer && u * f.mer.nx + v * f.mer.nz > f.mer.d
    && !(f.mer.ile && u >= f.mer.ile.u0 && u <= f.mer.ile.u1)) return true;   // sauf Miami Beach
  if (f.cote && u < f.cote.base + f.cote.pente * v) return true;
  if (f.baie) {
    if (v < f.baie.v0 && v > f.baie.v1) {
      const p = f.baie.presquile;
      if (!(u >= p.u0 && u <= p.u1 && v >= p.v1)) return true;    // sauf la pointe de l'Opéra
    }
  }
  if (f.baieRio) {
    // la baie de Guanabara à l'est, l'océan au sud — et les presqu'îles.
    if (u > 28 + Math.max(0, v - 40) * 0.5 && !(Math.hypot(u - 17, v - 48) < 8)) return true;
    if (v > 78 && !(Math.hypot(u - 17, v - 48) < 8)) return true;
  }
  if (f.charbagh) {
    const c = f.charbagh;
    if (v >= c.v0 && v <= c.v1 && Math.abs(u) <= c.demi) {
      if (Math.abs(u) < 1.2) return true;                          // le canal axial
      const milieu = (c.v0 + c.v1) / 2;
      if (Math.abs(v - milieu) < 1.2) return true;                 // le canal croisé
    }
  }
  for (const p of f.parcs || []) {
    if (p.lac && ((u - p.lac.cu) / p.lac.ru) ** 2 + ((v - p.lac.cv) / p.lac.rv) ** 2 < 1) return true;
  }
  return false;
}

function collineDeVille(f, u, v) {
  let plus = 0;
  for (const c of f.collines || []) {
    const d = Math.hypot(u - c.cu, v - c.cv);
    if (d >= c.r) continue;
    if (c.mesa) {
      // la montagne-table : plate jusqu'aux deux tiers, puis la falaise
      plus = Math.max(plus, Math.min(1, (1 - d / c.r) * 3) * c.h);
      continue;
    }
    const m = Math.cos((d / c.r) * Math.PI * 0.5);
    plus = Math.max(plus, m * m * c.h);
  }
  return plus;
}

// --- ce que world.js appelle -------------------------------------------------

export function hauteurVillesMonde(x, z, h) {
  for (const f of villesPres(x, z)) {
    const u = x - f.ancre.x, v = z - f.ancre.z;
    const d = Math.hypot(u, v);
    if (d > f.rayon + 14) continue;
    const marge = Math.min(1, (f.rayon + 14 - d) / 14);
    let cible = f.sol || 33;                                       // le Machu Picchu vit a 52
    if (eauDeVille(f, u, v)) cible = 26;
    else cible += collineDeVille(f, u, v);
    return h * (1 - marge) + cible * marge;
  }
  return h;
}

export function solVillesMonde(x, z) {
  for (const f of villesPres(x, z)) {
    const u = x - f.ancre.x, v = z - f.ancre.z;
    if (Math.hypot(u, v) > f.rayon) continue;

    if (eauDeVille(f, u, v)) return null;                          // l'eau se remplit seule
    if (f.mer && f.mer.plage && u * f.mer.nx + v * f.mer.nz > f.mer.d - f.mer.plage) return SABLE;
    if (f.mer && f.mer.quais && u * f.mer.nx + v * f.mer.nz > f.mer.d - 2) return PAVE;
    if (f.cote && f.cote.quais && u < f.cote.base + f.cote.pente * v + 2) return PAVE;
    if (f.plage && v >= f.plage.v0 && v <= f.plage.v1) return SABLE;
    if (f.desert && !(f.desert.bande && Math.abs(u) <= f.desert.bande)) {
      // Gizeh est desert partout ; Las Vegas garde une bande pour le Strip.
      if (f.oasis && u > f.oasis.u0) return ((u + v) & 3) === 0 ? ARBRE : HERBE;
      return SABLE;
    }
    if (f.mer && f.mer.ile && u >= f.mer.ile.u1 - (f.mer.ile.plage || 0) && u <= f.mer.ile.u1) {
      return SABLE;                                                // la plage de Miami Beach
    }
    if (f.charbagh) {
      const c = f.charbagh;
      if (v >= c.v0 && v <= c.v1 && Math.abs(u) <= c.demi) {
        if (Math.abs(u) < 2.4 || Math.abs(v - (c.v0 + c.v1) / 2) < 2.4) return TROTTOIR;
        return HERBE;
      }
    }
    for (const p of f.parcs || []) {
      if (((u - p.cu) / p.ru) ** 2 + ((v - p.cv) / p.rv) ** 2 < 1) {
        if (p.mosaique && ((u + v) & 1) === 0) return uni(((u * 7 + v * 13) & 3) * 5);
        return ((u + v) & 3) === 0 ? ARBRE : HERBE;
      }
    }
    const colline = collineDeVille(f, u, v);
    if (colline > 1) {
      const c = (f.collines || []).find((k) => Math.hypot(u - k.cu, v - k.cv) < k.r);
      if (c && c.roche) return PIERRE;
      if (c && c.favela) return 'lot';                             // les maisons s'accrochent
      return ((u + v) & 3) === 0 ? ARBRE : HERBE;
    }
    if (f.foret && u < f.foret.u1 && v > f.foret.v0) return ((u + v) & 1) === 0 ? ARBRE : HERBE;

    for (const voie of f.voies || []) {
      if (distancePolyligne(voie.pts, u, v) < voie.l) return BITUME;
      if (distancePolyligne(voie.pts, u, v) < voie.l + 0.8) return TROTTOIR;
    }
    if (!f.trame) return null;
    const t = f.trame;
    if (t.sud && v > t.sud) return null;

    // LA PLACE CENTRALE. On arrive en ville ICI, par la carte : une place
    // pavée, dégagée, avec sa fontaine — plus jamais le nez dans un mur.
    const dCentre = Math.hypot(u, v);
    if (dCentre < 10.5) {
      if (f.fontaine && dCentre < 2.3) return EAU;
      if (f.fontaine && dCentre < 3.3) return PIERRE;
      return PAVE;
    }

    const co = Math.cos(t.ang), si = Math.sin(t.ang);
    const a = u * co - v * si, b = u * si + v * co;
    // Les rues « à a constant » s'étendent le long du vecteur monde (si, co) :
    // elles sont nord-sud quand |co| domine. `t.net` accepte aussi les trames
    // tournées d'un quart de tour, où les axes s'échangent — d'où ce calcul,
    // au lieu de deviner l'orientation depuis a et b seuls.
    const nsDeA = Math.abs(co) >= Math.abs(si);

    // LES AVENUES : la croix centrale de la ville, deux fois plus large que
    // les rues, avec sa ligne médiane pointillée — c'est elle qui structure
    // le plan, comme dans toute vraie ville.
    if (!t.ruelles) {
      const dAxe = Math.min(Math.abs(a), Math.abs(b));
      if (dAxe < 5.6) {
        if (dAxe < 3.4) {
          // la ligne médiane vit dans la texture : des tirets à l'échelle
          // d'une vraie bande, continus le long de l'avenue
          if (t.net && dAxe < 0.4) {
            return (Math.abs(a) < Math.abs(b) ? nsDeA : !nsDeA) ? LIGNE_NS : LIGNE_EO;
          }
          return BITUME;
        }
        return TROTTOIR;
      }
    }

    const ra = a - Math.round(a / t.pu) * t.pu, rb = b - Math.round(b / t.pv) * t.pv;
    const dRue = Math.min(Math.abs(ra), Math.abs(rb));
    if (dRue < t.w) {
      const pres = Math.abs(ra) < Math.abs(rb);
      const travers = pres ? ra : rb;
      const ns = pres ? nsDeA : !nsDeA;
      const versCarrefour = Math.max(Math.abs(ra), Math.abs(rb));
      // le passage piéton à l'abord de chaque carrefour : les bandes sont
      // peintes dans la texture, dans l'axe de la circulation
      if (!t.ruelles && t.net && versCarrefour < t.w + 2.1 && versCarrefour > t.w + 0.4) {
        return ns ? PASSAGE_NS : PASSAGE_EO;
      }
      // la ligne médiane en tirets, qui s'interrompt avant le passage piéton
      // comme sur une vraie chaussée
      if (!t.ruelles && t.net && Math.abs(travers) < 0.4 && versCarrefour > t.w + 2.1) {
        return ns ? LIGNE_NS : LIGNE_EO;
      }
      return BITUME;
    }
    if (dRue < t.s) return TROTTOIR;
    // Les chanfreins de l'Eixample : aux carrefours, le coin est coupé —
    // c'est CE dessin-là qu'on voit du ciel à Barcelone, et nulle part
    // ailleurs au monde.
    if (t.chanfrein && Math.abs(ra) < t.chanfrein && Math.abs(rb) < t.chanfrein
      && Math.abs(ra) + Math.abs(rb) < t.chanfrein * 1.7) return TROTTOIR;
    return 'lot';
  }
  return null;
}

export function batirColonneVillesMonde(x, z, poser) {
  for (const f of villesPres(x, z)) {
    const u = x - f.ancre.x, v = z - f.ancre.z;
    if (Math.hypot(u, v) > f.rayon) continue;
    if (!f.trame && !f.collines) return;
    const t = f.trame || { ang: 0, pu: 6, pv: 5 };
    const co = Math.cos(t.ang), si = Math.sin(t.ang);
    const a = Math.round((u * co - v * si) / t.pu), b = Math.round((u * si + v * co) / t.pv);
    const r = tirage(a, b, f.rayon * 7 + 11);

    const c = (f.collines || []).find((k) => Math.hypot(u - k.cu, v - k.cv) < k.r);
    const favela = c && c.favela;
    const dCentre2 = Math.hypot(u, v);
    const tour = !favela && t.tours && r > t.tours && dCentre2 < f.rayon * 0.5;
    const palette = favela ? f.paletteFavela : f.palette;
    const [h0, h1] = favela ? [2, 3] : (f.hMaison || [3, 5]);
    // LA SKYLINE. Une vraie métropole n'a pas des tours de hauteur uniforme :
    // elle culmine au centre et redescend vers les quartiers — c'est cette
    // courbe qu'on reconnaît de loin. `tourMax` donne l'ambition de la ville
    // (Dubaï ne plafonne pas comme Séoul), le fondu fait le reste.
    const ambition = Math.max(0.3, 1 - dCentre2 / (f.rayon * 0.55));
    const bh = tour ? Math.max(8, Math.round((12 + r * (f.tourMax ?? 24)) * ambition))
      : h0 + Math.floor(r * (h1 - h0 + 1));
    const mur = tour ? ACIER : palette[Math.floor(tirage(a, b, 97) * palette.length) % palette.length];
    const face = (u & 1) === 0 ? v : u;

    // Où est cette colonne DANS son lot ? C'est ce qui décide de la façade.
    const A = u * co - v * si, B = u * si + v * co;
    const ra = A - a * t.pu, rb = B - b * t.pv;
    const dRue = Math.min(Math.abs(ra), Math.abs(rb));
    // La façade donne sur la petite rue — OU sur l'avenue : dans une vraie
    // ville, ce sont les avenues que les boutiques bordent en premier.
    const dAxe = Math.min(Math.abs(A), Math.abs(B));
    const bord = dRue < t.s + 1.15 || (!t.ruelles && dAxe >= 5.6 && dAxe < 6.8);

    // LE JARDIN DE POCHE (v178). Max, sur Londres : « too packed ». Une
    // vraie ville respire : un lot sur dix ne se bâtit pas — il devient un
    // jardin, avec son arbre au centre et ses fleurs — et cette seule règle
    // aère les deux cent soixante-dix-huit villes d'un coup. Jamais une
    // tour : le cœur d'affaires garde sa densité, c'est son caractère.
    if (!favela && !tour && tirage(a, b, 401) < 0.1) {
      const centreLot = Math.abs(ra) > t.pu / 2 - 0.6 && Math.abs(rb) > t.pv / 2 - 0.6;
      if (centreLot) {
        poser(1, BOISF_ARBRE); poser(2, BOISF_ARBRE); poser(3, BOISF_ARBRE);
        poser(4, ARBRE); poser(5, ARBRE);
      } else if ((((u + v) % 5) + 5) % 5 === 0) {
        poser(1, uni(((a * 7 + b * 13) & 3) * 5));   // un parterre de fleurs
      }
      return;
    }

    // LE REZ-DE-CHAUSSÉE COMMERÇANT. Max : « on ne retrouve pas des façades
    // de magasins ». La moitié des lots du centre en reçoivent une, à la
    // grammaire des vraies devantures : la vitrine sur deux blocs, la porte
    // de bois, et le bandeau d'enseigne coloré au-dessus — chaque boutique
    // garde la sienne, stable de visite en visite.
    const commerce = !favela && !tour && tirage(a, b, 131) < 0.5;
    const enseigne = ENSEIGNES[Math.floor(tirage(a, b, 173) * ENSEIGNES.length)];
    // La porte : une colonne par façade, au milieu du front du lot — qui est
    // un QUART d'îlot : son front court de s à p/2, son milieu est entre les
    // deux.
    const along = Math.abs(ra) < Math.abs(rb) ? Math.abs(rb) : Math.abs(ra);
    const milieuFront = Math.abs(ra) < Math.abs(rb) ? (t.s + t.pv / 2) / 2 : (t.s + t.pu / 2) / 2;
    // Une porte, pas une rayure : le premier rang de façade seulement, et une
    // demi-colonne de tolérance de part et d'autre du milieu du front.
    const porte = commerce && dRue < t.s + 1.0 && Math.abs(along - milieuFront) < 0.28;

    // Les toits ne sont plus tous du même gris : deux tiers gardent la
    // couleur de la ville, le reste pioche — c'est ce qui fait un vrai
    // quartier vu des toits.
    const toitLot = tour ? ACIER
      : [f.toit, f.toit, f.toit, f.toit, ARDOISE, TUILE][Math.floor(tirage(a, b, 199) * 6)];

    // LA GRAMMAIRE À TRAVÉES (réalisme v2, point 3). Née du pilote Moscou
    // (rue Piatnitskaïa), généralisée sur consigne de Max (« refait une
    // passe sur toutes les villes ») : un rez-de-chaussée distinct (socle de
    // pierre ou devanture), des ÉTAGES RÉGULIERS de trois rangs — l'allège
    // blanche, puis la fenêtre haute de deux rangs — une baie sur deux, et
    // la CORNICHE qui couronne. Chaque ville garde SES matériaux : le mur
    // vient de sa palette, le toit de sa fiche — Tokyo ≠ Rome ≠ Moscou.
    // Les médinas (`ruelles`) gardent leur grammaire propre : des baies
    // vitrées régulières n'ont rien à faire dans une ruelle de Marrakech.
    const grammaire2 = f.facades === 2 || (f.facades === undefined && !t.ruelles);
    if (grammaire2 && !tour && !favela) {
      // Le mur d'enduit domine, comme sur la vraie Piatnitskaïa : une baie de
      // fenêtre une colonne sur deux, encadrée de blanc, tout le reste en mur.
      const ci = Math.round(along);                          // le rang de colonne
      const fen = ((ci % 2) + 2) % 2 === 0;                  // une baie sur deux
      // Le nombre d'étages respecte la hauteur PROPRE de la ville (hMaison) :
      // la grammaire est partagée, l'échelle ne l'est pas — un bourg toscan
      // ne prend pas les quatre étages de la Piatnitskaïa.
      const etages = Math.max(1, Math.round((bh + 1) / 3));
      const bh2 = 3 + etages * 3;
      for (let y = 0; y < bh2; y++) {
        if (y < 3) {
          // le rez-de-chaussée : devanture si commerce, socle sinon
          if (commerce && bord && y === 0) { poser(1, porte ? BOIS_PORTE : VERRE); continue; }
          if (commerce && bord && y === 1) { poser(2, VERRE); continue; }
          if (commerce && bord && y === 2) { poser(3, enseigne); continue; }
          poser(y + 1, y === 0 ? PIERRE : (fen && y === 1 ? VERRE : mur));
          continue;
        }
        const yy = (y - 3) % 3;
        if (yy === 0) { poser(y + 1, fen ? BLANC : mur); continue; }   // l'encadrement
        poser(y + 1, fen ? VERRE : mur);                               // la fenêtre haute
      }
      poser(bh2 + 1, ARCHI.CORNICHE);
      poser(bh2 + 2, toitLot);
      if (Math.abs(ra) > t.pu / 2 - t.s - 0.9 && Math.abs(rb) > t.pv / 2 - t.s - 0.9
        && tirage(a, b, 241) < 0.5) {
        poser(bh2 + 3, brique(0));
        poser(bh2 + 4, brique(0));
      }
      return;
    }

    for (let y = 0; y < bh; y++) {
      if (tour) {
        // même une tour a son pied commerçant : vitrines sur deux niveaux et
        // bandeau d'enseigne — c'est le socle de toutes les tours du monde
        if (bord && y <= 1) { poser(y + 1, VERRE); continue; }
        if (bord && y === 2) { poser(3, enseigne); continue; }
        poser(y + 1, y % 3 === 2 ? ACIER : VERRE);
        continue;
      }
      if (commerce && bord && y === 0) { poser(1, porte ? BOIS_PORTE : VERRE); continue; }
      if (commerce && bord && y === 1) { poser(2, bh > 3 ? VERRE : mur); continue; }
      if (commerce && bord && y === 2) { poser(3, enseigne); continue; }
      const fenetre = y > 0 && y % 2 === 1 && (face & 1) === 1;
      poser(y + 1, fenetre ? VERRE : mur);
    }
    poser(bh + 1, toitLot);
    // La cheminée, au coin du lot — une maison sur deux en a une.
    if (!tour && !favela && Math.abs(ra) > t.pu / 2 - t.s - 0.9 && Math.abs(rb) > t.pv / 2 - t.s - 0.9
      && tirage(a, b, 241) < 0.5) {
      poser(bh + 2, brique(0));
      poser(bh + 3, brique(0));
    }
    return;
  }
}

// Le trottoir vivant : l'auvent de la boutique qui s'avance au-dessus du
// passant, le lampadaire au bord du caniveau, le banc et le bac à fleurs.
// Appelé par world.js pour chaque colonne de trottoir des villes machine —
// tout est déterministe : le même trottoir, les mêmes lampadaires, toujours.
export function mobilierVillesMonde(x, z, poser) {
  for (const f of villesPres(x, z)) {
    const u = x - f.ancre.x, v = z - f.ancre.z;
    if (Math.hypot(u, v) > f.rayon) continue;
    if (!f.trame) return;
    const t = f.trame;
    if (t.sud && v > t.sud) return;
    const co = Math.cos(t.ang), si = Math.sin(t.ang);
    const A = u * co - v * si, B = u * si + v * co;
    const a = Math.round(A / t.pu), b = Math.round(B / t.pv);
    const ra = A - a * t.pu, rb = B - b * t.pv;
    const dRue = Math.min(Math.abs(ra), Math.abs(rb));
    if (dRue < t.w || dRue >= t.s) return;                        // pas sur ce trottoir

    // L'AUVENT : la bande rayée de la boutique, au-dessus de la tête. Le
    // trottoir et son lot partagent le même index (a, b), donc le même
    // tirage : l'auvent est de la couleur de l'enseigne qu'il prolonge.
    const commerce = tirage(a, b, 131) < 0.5;
    if (commerce && t.s - dRue < 1.15) {
      // Par SEGMENTS, pas d'un seul tenant : un vrai store couvre une
      // devanture, pas tout le pâté de maisons — trois blocs d'auvent, deux
      // de vide, et la rue respire.
      const longA = Math.abs(ra) < Math.abs(rb) ? B : A;
      if (((Math.round(longA) % 5) + 5) % 5 < 3) {
        poser(3, ENSEIGNES[Math.floor(tirage(a, b, 173) * ENSEIGNES.length)]);
      }
      return;
    }
    // LE LAMPADAIRE : au bord du caniveau, un tous les neuf blocs le long de
    // la rue. `long` est la coordonnée LE LONG de la rue la plus proche.
    const long = Math.abs(ra) < Math.abs(rb) ? B : A;
    const cran = ((Math.round(long) % 9) + 9) % 9;
    if (dRue - t.w < 0.9) {
      // LE FEU TRICOLORE, un par coin de carrefour : la colonne du caniveau
      // qui touche le croisement en diagonale — une seule par coin.
      if (!t.ruelles && Math.abs(ra) > t.w + 0.4 && Math.abs(ra) < t.w + 1.3
        && Math.abs(rb) > t.w + 0.4 && Math.abs(rb) < t.w + 1.3) {
        poser(1, RUE.FEUX);
        return;
      }
      // LE RÉVERBÈRE : un mesh fin de trois mètres, plus jamais le monolithe
      // noir à chapeau doré de la capture de Moscou.
      if (cran === 4) { poser(1, RUE.REVERBERE); return; }
      // LE BANC, et LA JARDINIÈRE — assez rares pour rester des trouvailles.
      if (cran === 0 && tirage(a, b, 263) < 0.5) { poser(1, BOIS_BANC); return; }
      if (cran === 7 && tirage(a, b, 269) < 0.5) { poser(1, RUE.JARDINIERE); return; }
    }
    return;
  }
}


// --- la circulation ----------------------------------------------------------
//
// Max : « il n'y a pas de voitures qui circulent ». Chaque ville à trame
// reçoit un anneau de circulation : un rectangle qui suit ses rues, aux
// coins posés sur les intersections. Les voitures y roulent en freinant
// dans les virages (vehicules.js). L'anneau évite l'eau : on le mesure sur
// la géographie de la fiche, et s'il trempe, on essaie plus petit — Venise,
// elle, n'aura jamais de voitures, et c'est très bien comme ça.
export function tracesCirculation(solDe) {
  const traces = [];
  for (const f of VILLES_MONDE) {
    if (!f.trame) continue;
    const t = f.trame;
    const co = Math.cos(t.ang), si = Math.sin(t.ang);
    // UNE VILLE COUPÉE PAR UN FLEUVE N'AVAIT AUCUNE VOITURE. On essayait
    // deux anneaux centrés sur l'ancre ; s'ils trempaient, on abandonnait —
    // et Moscou, Paris, Londres, Rome, toutes les villes de rivière étaient
    // désespérément vides. Max l'a vu sur une capture de Moscou de nuit :
    // des feux, des lampadaires, des passages piétons, et rien qui roule.
    //
    // On cherche donc plus loin : quatre tailles, et quatre décalages qui
    // poussent l'anneau sur une seule rive. Le premier sec gagne, et on en
    // garde deux par ville.
    const candidats = [];
    for (const part of [0.55, 0.42, 0.34, 0.26]) {
      for (const [du, dv] of [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) {
        candidats.push([part, du, dv]);
      }
    }
    for (const [part, decU, decV] of candidats) {
      if (traces.filter((t2) => t2.cle === f.cle).length >= 2) break;
      const cU = Math.round((f.rayon * decU) / t.pu) * t.pu;
      const cV = Math.round((f.rayon * decV) / t.pv) * t.pv;
      const Ru = Math.max(t.pu, Math.round((f.rayon * part) / t.pu) * t.pu);
      const Rv = Math.max(t.pv, Math.round((f.rayon * part) / t.pv) * t.pv);
      // l'anneau trempe-t-il ? On échantillonne son périmètre dans le repère
      // de la trame, puis on tourne vers le monde.
      let sec = true;
      for (let k = 0; k < 40 && sec; k++) {
        const c2 = k / 40;
        let A, B;
        if (c2 < 0.25) { A = Ru; B = Rv * (c2 * 8 - 1); }
        else if (c2 < 0.5) { A = Ru * (3 - c2 * 8); B = Rv; }
        else if (c2 < 0.75) { A = -Ru; B = Rv * (5 - c2 * 8); }
        else { A = Ru * (c2 * 8 - 7); B = -Rv; }
        const u = (A + cU) * co + (B + cV) * si, v = -(A + cU) * si + (B + cV) * co;
        if (Math.hypot(u, v) > f.rayon - 2 || eauDeVille(f, u, v)) sec = false;
        if (t.sud && v > t.sud) sec = false;
      }
      if (!sec) continue;
      const y = solDe(f.ancre.x, f.ancre.z) + 1.05;
      const pts = [[Ru, Rv], [-Ru, Rv], [-Ru, -Rv], [Ru, -Rv]].map(([A, B]) => ({
        x: f.ancre.x + (A + cU) * co + (B + cV) * si,
        y,
        z: f.ancre.z + (-(A + cU) * si + (B + cV) * co),
      }));
      // `rang` distingue le grand anneau du petit : le bus ne dessert que le
      // grand. Depuis v178 on garde LES DEUX anneaux quand ils sont au sec —
      // Max : « much more life in cities » — au lieu de s'arrêter au premier.
      traces.push({ cle: f.cle, x: f.ancre.x, z: f.ancre.z, pts, rang: traces.filter((t2) => t2.cle === f.cle).length });
    }
  }
  return traces;
}

// LES VILLES BÂTIES À LA MAIN — Paris, Londres, Nice, Lille, Washington, San
// Francisco. Elles ne sont pas dans VILLES_MONDE : leur plan vit dans leur
// propre module, et elles n'ont donc JAMAIS eu de voitures. Paris est la
// ville de la maison, et elle était vide.
//
// Ici on ne connaît pas leur géographie ; on interroge donc le TERRAIN
// lui-même. Un anneau est bon si ses vingt-quatre points de contrôle sont
// tous sur du sol au niveau de la ville, à un bloc près : cela écarte d'un
// coup la Seine, la Tamise, la baie de San Francisco et les collines.
export function tracesCirculationMain(villes, solDe) {
  const traces = [];
  for (const c of villes) {
    const base = solDe(c.x, c.z);
    let gardes = 0;
    for (const part of [0.5, 0.38, 0.3, 0.22]) {
      for (const [decU, decV] of [[0, 0], [0.28, 0], [-0.28, 0], [0, 0.28], [0, -0.28]]) {
        if (gardes >= 2) break;
        const R = Math.round(Math.min(c.r, 70) * part);
        if (R < 12) continue;
        const cu = Math.round(c.r * decU), cv = Math.round(c.r * decV);
        const coins = [[R, R], [-R, R], [-R, -R], [R, -R]];
        let sec = true;
        for (let k = 0; k < 24 && sec; k++) {
          const t = (k / 24) * 4;
          const i = Math.floor(t), f = t - i;
          const a = coins[i % 4], b = coins[(i + 1) % 4];
          const u = cu + a[0] + (b[0] - a[0]) * f, v = cv + a[1] + (b[1] - a[1]) * f;
          if (Math.abs(solDe(c.x + u, c.z + v) - base) > 1) sec = false;
        }
        if (!sec) continue;
        traces.push({
          cle: c.key, x: c.x, z: c.z, rang: gardes,
          pts: coins.map(([a, b]) => ({ x: c.x + cu + a, y: base + 1.05, z: c.z + cv + b })),
        });
        gardes++;
      }
    }
  }
  return traces;
}

// Les monuments, pour la liste LANDMARKS de world.js.
export function landmarksVillesMonde() {
  const out = [];
  for (const f of VILLES_MONDE) {
    for (const m of f.monuments || []) {
      const [du, dv] = f.local(m.lat, m.lon);
      let box = m.box;
      if (!box) {
        // la boîte se lit sur le monument déjà bâti, jamais recopiée
        const nomCat = { 'Colisée': 'colisee', 'Sagrada Família': 'sagrada', 'Tour de Pise': 'tour-pise',
          'Pyramide de Khéops': 'pyramide-gizeh', 'Taj Mahal': 'taj-mahal', "Opéra de Sydney": 'opera-sydney',
          'Christ Rédempteur': 'christ-redempteur', 'Space Needle': 'space-needle' }[m.nom];
        const bati = nomCat && monumentBati(nomCat);
        box = bati ? Math.ceil(Math.max(bati.emprise.l, bati.emprise.p) / 2) + 2 : 8;
      }
      out.push({ name: m.nom, x: f.ancre.x + du, z: f.ancre.z + dv, box, seuil: m.seuil, build: m.build });
    }
  }
  return out;
}

// Les destinations et les étiquettes de la carte.
export function placesVillesMonde() {
  const out = [];
  for (const f of VILLES_MONDE) {
    out.push({ name: f.ancre.nom, x: f.ancre.x, z: f.ancre.z, r: f.rayon });
    for (const m of f.monuments || []) {
      const [du, dv] = f.local(m.lat, m.lon);
      out.push({ name: m.nom, x: f.ancre.x + du, z: f.ancre.z + dv, r: 0 });
    }
    for (const [nom, lat, lon] of f.lieux || []) {
      const [du, dv] = f.local(lat, lon);
      out.push({ name: nom, x: f.ancre.x + du, z: f.ancre.z + dv, r: 0 });
    }
  }
  return out;
}

export function lieuxDesVillesMonde() {
  return placesVillesMonde().filter((p) => p.r === 0).map((p) => ({ ...p, r: 6 }));
}

// La couleur sur la carte, vue du ciel.
export function couleurCarteVillesMonde(x, z) {
  for (const f of villesPres(x, z)) {
    const u = x - f.ancre.x, v = z - f.ancre.z;
    if (Math.hypot(u, v) > f.rayon) continue;
    if (eauDeVille(f, u, v)) return [92, 142, 196];
    const sol = solVillesMonde(x, z);
    if (sol === SABLE) return [226, 206, 156];
    if (sol === ARBRE || sol === HERBE) return [96, 156, 92];
    if (sol === BITUME || sol === LIGNE_NS || sol === LIGNE_EO
      || sol === PASSAGE_NS || sol === PASSAGE_EO) return [96, 97, 101];
    if (sol === TROTTOIR || sol === PAVE) return [178, 174, 166];
    return f.couleurToits;
  }
  return null;
}
