// La carte du monde.
//
// Avant, c'était une vignette : une image fixe, centrée sur le joueur, qu'on
// regardait sans pouvoir y entrer. Ici c'est un atlas — on la fait glisser,
// on l'écarte à deux doigts, et plus on s'approche plus elle en dit :
//
//   loin   le relief, les mers, les massifs, les six domaines
//   moyen  les villes et leur trame de rues
//   près   les vraies constructions, là où le monde est déjà en mémoire
//
// Le fond est redessiné à partir du générateur de terrain — il connaît la
// hauteur de n'importe quel point sans avoir à fabriquer le moindre bloc, ce
// qui permet de survoler un continent entier sans rien charger. Entre deux
// rendus, l'image précédente est simplement étirée : le doigt ne se heurte
// jamais au calcul.

import {
  CHUNK, HEIGHT, WATER_LEVEL, CITIES, PLACES, REPERES,
  MARS, VILLANDRY, AEROPORT, ESPACE, GAULOIS, CIRCUIT,
} from './world.js';
import { couleurCarteManhattan, quartiersDuMonde } from './manhattan.js';
import { couleurCarteUsine } from './usine.js';
import { couleurCarteParis, lieuxDeParis } from './paris.js';
import { couleurCarteParc, lieuxDuParc } from './parc.js';
import { couleurCarteSF, lieuxDeSF } from './sanfrancisco.js';
import { couleurCarteNice, lieuxDeNice } from './nice.js';
import { couleurCarteLille, lieuxDeLille } from './lille.js';
import { couleurCarteLondres, lieuxDeLondres } from './londres.js';
import { couleurCarteVillesMonde, lieuxDesVillesMonde } from './villesmonde.js';
import { zDeLatitude } from './mondes.js';
import { surLaVoie } from './trains.js';

// Les lisières des calottes, calculées une fois : la latitude ne dépend que
// de z, donc peindre le pôle coûte une comparaison — pas une projection.
const Z_ARCTIQUE = Math.round(zDeLatitude(78));
const Z_ANTARCTIQUE = Math.round(zDeLatitude(-63));
import { couleurCarteWashington, lieuxDeWashington } from './washington.js';
import { couleurCarteChine, LIEUX_CHINE } from './chine.js';
import { POLE } from './pole.js';
import { BLOCK, CITY_BLOCK, VILLANDRY_BLOCK, ARCHI, ROUTE_BLOCK, DECOR_START, decorMapColor } from './blocks.js';

// Couleur de chaque bloc vu du dessus. Sert à la vignette comme à la carte.
export const MAP_COLORS = {
  [BLOCK.GRASS]: [88, 176, 76], [BLOCK.DIRT]: [138, 96, 67], [BLOCK.STONE]: [125, 125, 125],
  [BLOCK.SAND]: [219, 207, 163], [BLOCK.LOG]: [103, 82, 49], [BLOCK.LEAVES]: [54, 116, 38],
  [BLOCK.WATER]: [64, 120, 210], [BLOCK.PLANK]: [162, 130, 78], [BLOCK.COBBLE]: [120, 120, 120],
  [BLOCK.GLASS]: [200, 230, 245], [BLOCK.BRICK]: [148, 68, 58], [BLOCK.SNOW]: [242, 250, 250],
  [BLOCK.SANDSTONE]: [216, 200, 155], [BLOCK.GRAVEL]: [136, 130, 126], [BLOCK.MOSSY]: [98, 122, 82],
  [BLOCK.BIRCH]: [214, 200, 165], [BLOCK.DARKPLANK]: [92, 66, 42], [BLOCK.ICE]: [160, 210, 240],
  [BLOCK.GOLD]: [238, 202, 66], [BLOCK.DIAMOND]: [96, 219, 213], [BLOCK.OBSIDIAN]: [28, 22, 44],
  [BLOCK.BOOKSHELF]: [162, 130, 78], [BLOCK.WOOL_RED]: [200, 62, 56], [BLOCK.WOOL_BLUE]: [64, 100, 190],
  [BLOCK.WOOL_YELLOW]: [228, 200, 60], [BLOCK.WOOL_GREEN]: [88, 160, 70], [BLOCK.WOOL_PURPLE]: [140, 84, 190],
  [BLOCK.WOOL_BLACK]: [42, 42, 46], [BLOCK.SLAB_STONE]: [125, 125, 125], [BLOCK.SLAB_PLANK]: [162, 130, 78],
  [BLOCK.SLAB_COBBLE]: [120, 120, 120], [BLOCK.SLAB_BRICK]: [148, 68, 58],
  [BLOCK.STONEBRICK]: [130, 130, 132], [BLOCK.DARKBRICK]: [92, 42, 40], [BLOCK.WHITEBRICK]: [232, 230, 222],
  [BLOCK.TERRACOTTA]: [190, 108, 62], [BLOCK.BLUEBRICK]: [66, 96, 160],
  [BLOCK.MARS_SOL]: [176, 96, 62], [BLOCK.MARS_ROCHE]: [116, 62, 48],
  [VILLANDRY_BLOCK.TUFFEAU]: [230, 224, 206], [VILLANDRY_BLOCK.TUFFEAU_TAILLE]: [226, 219, 200],
  [VILLANDRY_BLOCK.ARDOISE]: [76, 86, 102], [VILLANDRY_BLOCK.BUIS]: [46, 86, 44],
  [VILLANDRY_BLOCK.ALLEE]: [208, 196, 168],
  [CITY_BLOCK.HAUSSMANN]: [229, 219, 194], [CITY_BLOCK.ZINC]: [112, 122, 136],
  [CITY_BLOCK.ASPHALT]: [96, 97, 101], [CITY_BLOCK.ROADLINE]: [104, 100, 84],
  [CITY_BLOCK.SIDEWALK]: [178, 178, 172], [CITY_BLOCK.BROWNSTONE]: [126, 76, 56],
  [CITY_BLOCK.GRANITE]: [168, 166, 160], [CITY_BLOCK.CURTAIN]: [78, 118, 164],
  [CITY_BLOCK.COPPER]: [98, 168, 142], [CITY_BLOCK.CROSSWALK]: [128, 128, 128],
  // Les marquages orientés des villes générées : sur la carte, une chaussée
  // marquée reste une chaussée — même gris que l'asphalte, à peine relevé.
  [ROUTE_BLOCK.LIGNE_NS]: [108, 109, 112], [ROUTE_BLOCK.LIGNE_EO]: [108, 109, 112],
  [ROUTE_BLOCK.PASSAGE_NS]: [128, 128, 128],
  // L'architecture. Sans ces lignes, une ville rebâtie avec le nouveau
  // vocabulaire devenait INVISIBLE sur la carte : la table ne connaissait pas
  // ces identifiants, et les rues pavées disparaissaient au moment même où
  // elles devenaient fidèles. Vu du ciel, une façade est sa corniche, un
  // comble est son zinc, une chaussée est son pavé.
  [ARCHI.VITRINE]: [206, 197, 176], [ARCHI.ENTRESOL]: [223, 214, 192],
  [ARCHI.ETAGE]: [223, 214, 192], [ARCHI.NOBLE]: [219, 210, 188],
  [ARCHI.CORNICHE]: [231, 224, 204], [ARCHI.MANSARDE]: [130, 137, 144],
  [ARCHI.ZINC_LISSE]: [138, 144, 150], [ARCHI.CHAINAGE]: [232, 225, 205],
  [ARCHI.PORTE]: [92, 74, 58], [ARCHI.PAVE]: [72, 71, 70],
  [ARCHI.BORDURE]: [166, 164, 160], [ARCHI.MUR_NU]: [196, 190, 178],
};

// Une icône par lieu : un enfant de sept ans lit un pictogramme avant un mot.
const ICONES = {
  'Paris': '🥖', 'New York': '🗽', 'San Francisco': '🌁', 'Nice': '🏖️', 'Lille': '🔔',
  'Planète Mars': '🔴', 'Château de Villandry': '🌷', 'Aéroport Charles-de-Gaulle': '✈️',
  'Village gaulois': '🛖', 'Base spatiale': '🚀', 'Circuit de F1': '🏎️',
  "Parc d'attractions": '🎡', 'Désert': '🌵', 'Volcan': '🌋', 'Île tropicale': '🏝️',
  'Château médiéval': '🏰', 'Musée': '🖼️', 'Quartier des enfants': '🏘️',
  'Tour Eiffel': '🗼', 'Arc de Triomphe': '🏛️', 'Pyramide du Louvre': '🔷',
  'Empire State': '🏢', 'Statue de la Liberté': '🗽', 'Golden Gate': '🌉', 'Phare': '🚨',
  'Beffroi de Lille': '🔔', 'Base martienne': '🛸', 'Caserne & Commissariat': '🚒',
  'Vieille Bourse': '🏛️', 'Porte de Paris': '🚪', 'Citadelle de Vauban': '⭐',
  'Colonne de la Déesse': '👑', 'Opéra de Lille': '🎭',
  'Beffroi de la Chambre de commerce': '🕰️', 'Gare Lille-Flandres': '🚉',
  'Tour de Lille': '🎿', 'Cathédrale de la Treille': '⛪',
  'Cathédrale russe': '⛪', 'Hôtel Negresco': '🏨', 'Cours Saleya': '💐',
  'Baleine du Paillon': '🐋',
  'Pier 39': '🦭', 'Lombard Street': '🌺', 'Dragon Gate': '🐉',
  'Karl the Fog': '☁️', 'Bay Bridge': '🌉',
  'Chine': '🐉', 'Grande Muraille': '🧱', 'Cité interdite': '🏯',
  'Village chinois': '🏮', 'Karsts de Guilin': '⛰️', 'Rizières': '🌾',
  'Bambouseraie': '🐼', 'Radeau de Guilin': '🛶',
  'Pyramides': '🔺', 'Central Park': '🌳', 'Times Square': '🎭',
  'Chrysler Building': '🏙️', 'Flatiron': '📐', 'One World Trade Center': '🗼',
  'Grand Central': '🚉', 'Rockefeller Center': '⛸️', 'Wall Street': '💰',
  'Bourse de New York': '📈', 'Trinity Church': '⛪', 'Pont de Brooklyn': '🌉',
  Harlem: '🎷', 'Upper West Side': '🎻', 'Upper East Side': '🖼️', Midtown: '🏙️',
  Chelsea: '🎨', Gramercy: '🌿', 'Greenwich Village': '☕', 'East Village': '🎸',
  SoHo: '👜', TriBeCa: '🎬', Chinatown: '🥟', 'Little Italy': '🍕',
  'Lower East Side': '🥯', 'Financial District': '💵',
  'Washington Heights': '⛰️', Inwood: '🌲',
  // Washington. Le métro a la sienne : sur un plan de la capitale, c'est le
  // premier repère qu'on cherche quand on veut aller quelque part.
  Washington: '🏛️', 'Le Mall': '🌿', Capitole: '🏛️', 'Maison-Blanche': '🏠',
  'Monument de Washington': '📍', 'Lincoln Memorial': '🏛️', 'Mémorial Jefferson': '🏛️',
  'Tidal Basin': '🌸', 'Union Station': '🚉',
  Pentagone: '🛡️', Arlington: '🎖️', 'Tombe du Soldat inconnu': '🎖️',
  'Mémorial Iwo Jima': '🎖️',
  "Musée de l'Air et de l'Espace": '🚀', 'Château du Smithsonian': '🏰',
  "Galerie nationale d'art": '🖼️', "Galerie nationale d'art — Est": '🖼️',
  "Musée d'Histoire naturelle": '🦕', "Musée d'Histoire américaine": '🚂',
  "Musée de l'Indien d'Amérique": '🪶', 'Hirshhorn': '🍩',
  'Arts et Industries': '🧱', 'Galerie Freer': '🖼️',
  'Musée afro-américain': '✊', 'Archives nationales': '📜', 'Cour suprême': '⚖️',
  'Bibliothèque du Congrès': '📚', 'Kennedy Center': '🎭', 'Arc de Chinatown': '🐉',
  'Le Trésor': '💰', 'Théâtre Ford': '🎭', Georgetown: '🧱',
  'Mémorial des vétérans du Vietnam': '🕯️', 'Mémorial de la guerre de Corée': '🕯️',
  'Mémorial Martin Luther King': '✊', 'Mémorial Roosevelt': '💧',
  'Mémorial de la Seconde Guerre mondiale': '⭐',
  'Pont du Mémorial': '🌉', 'Pont de la 14e Rue': '🌉', 'Key Bridge': '🌉',
  'Dupont Circle': '⭕', 'Logan Circle': '⭕', 'Thomas Circle': '⭕',
  'Scott Circle': '⭕', 'Washington Circle': '⭕', 'Mount Vernon Square': '⭕',
  'Farragut Square': '🌳', 'Lafayette Square': '🌳', 'McPherson Square': '🌳',
  'Franklin Square': '🌳', 'Judiciary Square': '⚖️', 'Stanton Park': '🌳',
  'Folger Park': '🌳', 'Seward Square': '🌳',
  'Capitol Hill': '🏛️', 'Foggy Bottom': '🌫️', 'West End': '🏢',
  Shaw: '🎷', 'Mount Vernon': '🏘️',
  'Le Triangle fédéral': '🏛️', 'Penn Quarter': '🎫', Chinatown: '🥟',
  'K Street': '💼', NoMa: '🏗️', 'Navy Yard': '⚓', 'Southwest Waterfront': '⛵',
  'Pentagon City': '🏢',
};

// Les stations de métro portent toutes le même pictogramme : le « M » brun de
// Washington. Un enfant qui cherche une bouche la reconnaît d'un coup d'œil,
// sans lire le nom.
const ICONE_METRO = 'Ⓜ️';
const icone = (nom) => (nom.startsWith('Métro ') ? ICONE_METRO : ICONES[nom] || '📍');

// Blocs par pixel. Petit = près.
const ZOOM_MIN = 0.22;    // on distingue un bloc
// Le dézoom MINIMUM garanti, pour un monde qui tiendrait dans un mouchoir.
// Ce n'est plus un plafond : voir `zoomMax()`, qui l'élargit à la taille réelle
// du monde. Tant que la carte s'arrêtait à 4,5, elle montrait 2 700 blocs de
// large — assez quand le monde en faisait 1 500, plus du tout depuis que les
// villes sont posées sur leurs vraies coordonnées et que la carte en fait
// vingt et un mille. Le bouton 🌍 « voir tout le monde » ne montrait alors
// qu'un huitième du monde, et San Francisco n'existait plus pour personne.
const ZOOM_MAX = 4.5;
const RENDU_MS = 110;     // on ne recalcule pas le fond plus souvent que ça
const MARGE = 1.3;        // le fond déborde de la fenêtre : glisser ne montre pas de vide

const borne = (v, a, b) => Math.max(a, Math.min(b, v));

// Safari ne connaît roundRect que depuis peu, et l'iPad de la maison n'est pas
// forcément à jour : on trace le rectangle arrondi à la main.
function rectArrondi(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const melange = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t,
];

export class Carte {
  // opts : { canvas, world, joueur(), autres(), mobiles(), surVoyage(lieu), surTeleport(x, z) }
  constructor(opts) {
    Object.assign(this, opts);
    this.vue = { cx: 0, cz: 0, bpp: 3 };
    this.fond = document.createElement('canvas');
    this.fondVue = null;        // la vue pour laquelle le fond a été calculé
    this.dernierRendu = 0;
    this.etiquettes = [];       // rectangles cliquables du dernier calque
    this.pointeurs = new Map();
    this.appuiLong = null;
    this.aBouge = false;
    this.dernierTap = 0;
    this.boucle = 0;
    this.ouverte = false;
    this._brancher();
  }

  // --- géométrie -------------------------------------------------------------

  // La taille affichée, en pixels CSS. Elle est relue une fois par image et
  // mémorisée : la mesurer à chaque étiquette forcerait le navigateur à
  // recalculer la mise en page des dizaines de fois par seconde.
  // LA CARTE N'EST PLUS CARRÉE, ET C'EST TOUT LE SUJET.
  //
  // Elle lisait UNE dimension — la largeur — et s'en servait pour les deux
  // axes. Tant que la feuille de style lui donnait un carré, personne ne le
  // voyait. Sur un iPhone COUCHÉ, la hauteur disponible tombe à 74 % de
  // trois cent quatre-vingt-dix pixels : la boîte devenait un rectangle large,
  // l'image restait carrée, et le navigateur l'écrasait dedans. Le monde
  // s'étirait à l'horizontale — capture de Max à l'appui, le golfe du Mexique
  // deux fois trop large.
  //
  // On rend donc les DEUX dimensions, et tout ce qui suit s'en sert. En
  // échange, la carte remplit désormais la place qu'on lui donne dans les deux
  // sens : couché, on voit large ; debout, on voit loin.
  taille() {
    if (this._l) return { l: this._l, h: this._h };
    const r = this.canvas.getBoundingClientRect();
    // hors écran (modale masquée) le rectangle est nul : on retombe sur
    // l'attribut du canvas plutôt que de diviser par zéro plus loin.
    return { l: Math.round(r.width) || 480, h: Math.round(r.height) || 480 };
  }

  versMonde(px, py) {
    const { l, h } = this.taille();
    const b = this.vue.bpp;
    return { x: this.vue.cx + (px - l / 2) * b, z: this.vue.cz + (py - h / 2) * b };
  }

  versEcran(x, z) {
    const { l, h } = this.taille();
    const b = this.vue.bpp;
    return { x: l / 2 + (x - this.vue.cx) / b, y: h / 2 + (z - this.vue.cz) / b };
  }

  // Le monde tient dans cette boîte : au-delà, il n'y a plus que de l'océan
  // procédural, et un enfant qui glisse trop loin ne saurait plus revenir.
  bornesMonde() {
    let x0 = -700, x1 = 760, z0 = -700, z1 = 620;
    for (const c of [...CITIES, ...PLACES]) {
      const m = (c.r || 40) + 120;
      x0 = Math.min(x0, c.x - m); x1 = Math.max(x1, c.x + m);
      z0 = Math.min(z0, c.z - m); z1 = Math.max(z1, c.z + m);
    }
    return { x0, x1, z0, z1 };
  }

  limiter() {
    const b = this.bornesMonde();
    this.vue.cx = borne(this.vue.cx, b.x0, b.x1);
    this.vue.cz = borne(this.vue.cz, b.z0, b.z1);
  }

  // Jusqu'où l'on a le droit de s'éloigner : assez pour que le monde ENTIER
  // tienne dans la fenêtre, quelle que soit sa taille. C'était un `min` contre
  // un plafond fixe, ce qui revenait à promettre « tout le monde » en n'en
  // montrant qu'une part — et la part rétrécissait à chaque ville ajoutée.
  zoomMax() {
    const { l, h } = this.taille();
    const b = this.bornesMonde();
    // Le monde entier doit tenir : c'est la plus contraignante des deux
    // dimensions qui décide, jamais une moyenne.
    return Math.max(ZOOM_MAX, Math.max((b.x1 - b.x0) / l, (b.z1 - b.z0) / h));
  }

  zoomerVers(px, py, facteur) {
    const avant = this.versMonde(px, py);
    this.vue.bpp = borne(this.vue.bpp / facteur, ZOOM_MIN, this.zoomMax());
    const apres = this.versMonde(px, py);
    this.vue.cx += avant.x - apres.x;
    this.vue.cz += avant.z - apres.z;
    this.limiter();
  }

  centrerSurJoueur(bpp) {
    const j = this.joueur();
    this.vue.cx = j.x; this.vue.cz = j.z;
    if (bpp) this.vue.bpp = borne(bpp, ZOOM_MIN, this.zoomMax());
    this.limiter();
  }

  toutVoir() {
    const b = this.bornesMonde();
    this.vue.cx = (b.x0 + b.x1) / 2;
    this.vue.cz = (b.z0 + b.z1) / 2;
    this.vue.bpp = this.zoomMax();
  }

  // --- lecture du monde ------------------------------------------------------

  // Bloc de surface, uniquement là où le terrain existe déjà en mémoire.
  // Passer par world.getBlock fabriquerait le morceau manquant : sur une carte
  // qui survole mille blocs, ce serait des centaines de morceaux générés pour
  // afficher une image.
  blocDeSurface(wx, wz) {
    const w = this.world;
    const cx = Math.floor(wx / CHUNK), cz = Math.floor(wz / CHUNK);
    const data = w.chunks.get(cx + ',' + cz);
    if (!data) return 0;
    const lx = wx - cx * CHUNK, lz = wz - cz * CHUNK;
    const haut = Math.min(HEIGHT - 1, (w.tops.get(cx + ',' + cz) ?? HEIGHT - 1));
    for (let y = haut; y >= 0; y--) {
      const id = data[lx + lz * CHUNK + y * CHUNK * CHUNK];
      if (id !== BLOCK.AIR) return id;
    }
    return 0;
  }

  // Couleur d'un point du monde, à n'importe quelle échelle.
  couleur(wx, wz, h, fin, rues) {
    const w = this.world;

    if (fin) {
      const id = this.blocDeSurface(wx, wz);
      if (id) return MAP_COLORS[id] || (id >= DECOR_START && decorMapColor(id)) || [150, 150, 150];
    }

    // Les domaines se reconnaissent à leur couleur — la carte lit la hauteur
    // du terrain, pas les blocs : sans cette règle, le plateau martien
    // ressortirait vert comme une prairie.
    if (Math.hypot(wx - MARS.x, wz - MARS.z) < MARS.r - 2) return [176, 96, 62];
    if (Math.hypot(wx - VILLANDRY.x, wz - VILLANDRY.z) < VILLANDRY.r - 2) return [176, 186, 138];
    if (Math.hypot(wx - AEROPORT.x, wz - AEROPORT.z) < AEROPORT.r - 6) return [108, 112, 118];
    // La Giga-usine : le hall blanc, l'asphalte du parc, la pelouse du site.
    {
      const cu = couleurCarteUsine(wx, wz);
      if (cu) return cu;
    }
    if (Math.hypot(wx - ESPACE.x, wz - ESPACE.z) < ESPACE.r - 6) return [214, 190, 140];
    if (Math.hypot(wx - GAULOIS.x, wz - GAULOIS.z) < GAULOIS.r - 20) return [126, 158, 84];
    if (Math.hypot(wx - CIRCUIT.x, wz - CIRCUIT.z) < CIRCUIT.r - 10) return [96, 108, 96];
    // La banquise du pôle. Elle apparaît sur la carte — une tache blanche tout
    // au nord, sans nom ni étiquette. C'est exactement ce qu'il faut : de quoi
    // se demander ce que c'est, pas de quoi le savoir.
    if (Math.hypot(wx - POLE.x, wz - POLE.z) < POLE.r - 4) return [236, 244, 250];

    if (h <= WATER_LEVEL) {
      const p = Math.min(1, (WATER_LEVEL - h) / 16);
      return melange([92, 156, 216], [20, 50, 122], p);
    }

    const ville = w.cityAt(wx, wz);
    // Manhattan a son propre dessin — rues, places et Central Park — que la
    // trame régulière des autres villes ne saurait rendre : sans cela, l'île
    // n'était qu'un rectangle gris, parc compris.
    if (ville && ville.key === 'ny') {
      const c = couleurCarteManhattan(wx, wz);
      if (c) return c;
    }
    // Paris de même : la Seine, ses îles, ses places, ses jardins et les
    // percées d'Haussmann sont calculés — la carte peut donc les montrer avant
    // qu'on y ait mis les pieds.
    if (ville && ville.key === 'paris') {
      const c = couleurCarteParis(wx, wz);
      if (c) return c;
    }
    {
      const c = couleurCarteParc(wx, wz);
      if (c) return c;
    }
    // San Francisco : sa presqu'île, ses deux quadrillages, Market Street en
    // couture, la plage, le Golden Gate Park et la teinte qui monte avec les
    // collines. Tout cela se calcule — la carte n'a pas à attendre la visite.
    if (ville && ville.key === 'sf') {
      const c = couleurCarteSF(wx, wz);
      if (c) return c;
    }
    // Nice et Lille : la baie des Anges, la Promenade, le Vieux-Nice — et
    // l'étoile de la citadelle de Vauban, qui ne se lit que vue du ciel.
    if (ville && ville.key === 'nice') {
      const c = couleurCarteNice(wx, wz);
      if (c) return c;
    }
    if (ville && ville.key === 'lille') {
      const c = couleurCarteLille(wx, wz);
      if (c) return c;
    }
    // Londres : la Tamise et son coude, le Mall rouge, les parcs royaux, la
    // brique et le verre — le plan qu'on reconnaît d'en haut.
    if (ville && ville.key === 'londres') {
      const c = couleurCarteLondres(wx, wz);
      if (c) return c;
    }
    // Les huit villes iconiques du tour du monde, chacune sa signature vue du
    // ciel : le damier chanfreiné de Barcelone, le charbagh d'Agra, la baie
    // de Rio…
    {
      const c = couleurCarteVillesMonde(wx, wz);
      if (c) return c;
    }
    // Washington : le plan de L'Enfant se lit d'en haut et de nulle part
    // ailleurs — la grille, les diagonales qui la coupent, les ronds-points
    // où elles se croisent, et le Mall qui traverse tout d'est en ouest.
    if (ville && ville.key === 'dc') {
      const c = couleurCarteWashington(wx, wz);
      if (c) return c;
    }
    // La Chine n'est pas une ville : sa rivière turquoise et ses rizières se
    // peignent par-dessus le terrain ordinaire.
    {
      const c = couleurCarteChine(wx, wz);
      if (c) return c;
    }
    if (ville) {
      // La trame des rues, telle que le générateur la pose. On ne la dessine
      // que d'assez près : échantillonnée de loin, elle produirait un moiré.
      if (rues && Math.hypot(wx - ville.x, wz - ville.z) < ville.r - 4 && h > WATER_LEVEL) {
        const mx = ((wx % ville.cell) + ville.cell) % ville.cell;
        const mz = ((wz % ville.cell) + ville.cell) % ville.cell;
        if (mx < ville.street || mz < ville.street) return [62, 63, 68];
      }
      return [172, 168, 162];
    }

    // La voie ferrée : le trait qui relie les villes se lit sur la carte —
    // c'est ainsi qu'un enfant découvre qu'un train l'attend.
    if (surLaVoie(wx, wz)) return h <= WATER_LEVEL + 1 ? [150, 150, 156] : [122, 120, 116];
    // Les calottes : au-delà du cercle arctique et de l'Antarctique, le sol
    // du monde est neige (world.js) — la carte doit dire la même chose. Vu
    // par Max : deux bandes de prairie mouchetée en haut et en bas du monde.
    if (wz < Z_ARCTIQUE || wz > Z_ANTARCTIQUE) {
      return h <= WATER_LEVEL + 1 ? [214, 230, 238] : [244, 249, 252];
    }
    if (h <= WATER_LEVEL + 1) return [226, 214, 172];               // la plage
    if (h >= 58) return [242, 250, 250];                            // les neiges
    if (h >= 48) return melange([140, 136, 126], [200, 202, 200], (h - 48) / 10);

    // Prairie, puis bois. Les forêts sont peintes d'après le bruit qui les
    // sème, jamais d'après les arbres posés : elles couvrent ainsi toute la
    // carte, et non le seul carré de monde chargé autour du joueur — c'est ce
    // raccord visible qui trahissait la limite de la mémoire.
    const prairie = melange([104, 174, 88], [76, 138, 68], borne((h - 31) / 17, 0, 1));
    return melange(prairie, [50, 104, 40], w.foret(wx, wz) * 0.8);
  }

  // --- le fond ---------------------------------------------------------------

  rendreFond(grossier = false) {
    const { l, h } = this.taille();
    // Pendant un glisser ou un pincement, un échantillon pour quatre pixels :
    // quatre fois moins de colonnes à calculer, le geste reste fluide sur
    // tablette. Au repos, la pleine finesse revient en un rendu.
    const div = grossier ? 4 : 2;
    const NL = Math.max(64, Math.round((l * MARGE) / div));
    const NH = Math.max(64, Math.round((h * MARGE) / div));
    this.fondGrossier = grossier;
    if (this.fond.width !== NL || this.fond.height !== NH) {
      this.fond.width = NL; this.fond.height = NH;
    }
    const ctx = this.fond.getContext('2d');
    const img = ctx.createImageData(NL, NH);

    const largeL = l * this.vue.bpp * MARGE;     // largeur couverte, en blocs
    const largeH = h * this.vue.bpp * MARGE;     // et hauteur, qui peut différer
    // Le PAS est le même sur les deux axes — c'est ce qui empêche le monde de
    // s'étirer, et c'est vrai par construction puisque les deux côtés se
    // déduisent du même `bpp`.
    const pas = largeL / NL;
    const x0 = this.vue.cx - largeL / 2, z0 = this.vue.cz - largeH / 2;
    // Les vrais blocs, seulement d'assez près : le monde n'est en mémoire que
    // sur un carré d'environ 380 blocs autour du joueur, et au-delà de cette
    // échelle ce carré se verrait comme une pièce rapportée.
    const fin = this.vue.bpp <= 0.7;
    // La trame des rues, elle, est calculée : on peut la montrer un peu plus
    // loin, tant que l'échantillonnage ne la transforme pas en moirage.
    const rues = this.vue.bpp <= 1.0;

    // Le champ de hauteurs d'abord, avec une bordure : l'ombrage a besoin des
    // voisins, et les recalculer pour chaque point coûterait cinq fois plus.
    const L = NL + 2;
    const H = new Float32Array(L * (NH + 2));
    // Le cache de colonnes : la hauteur d'une colonne est immuable — c'est le
    // même chiffre à chaque rendu. Pendant un glisser, la carte se redessine
    // à chaque image, et l'écran suivant recouvre presque le même monde que
    // le précédent : on garde donc les hauteurs déjà calculées, et un rendu
    // qui suit un autre ne paie que la tranche neuve. Le cache se vide quand
    // il déborde : un tour du monde entier tient dedans sans effort.
    if (!this.cacheH) this.cacheH = new Map();
    if (this.cacheH.size > 400000) this.cacheH.clear();
    const cache = this.cacheH;
    for (let j = -1; j <= NH; j++) {
      const wz = Math.floor(z0 + (j + 0.5) * pas);
      for (let i = -1; i <= NL; i++) {
        const wx = Math.floor(x0 + (i + 0.5) * pas);
        const cle = wx * 262144 + wz;
        let h = cache.get(cle);
        if (h === undefined) { h = this.world.terrainHeight(wx, wz); cache.set(cle, h); }
        H[(j + 1) * L + i + 1] = h;
      }
    }

    for (let j = 0; j < NH; j++) {
      const wz = Math.floor(z0 + (j + 0.5) * pas);
      for (let i = 0; i < NL; i++) {
        const wx = Math.floor(x0 + (i + 0.5) * pas);
        const k = (j + 1) * L + i + 1;
        const h = H[k];
        const c = this.couleur(wx, wz, h, fin, rues);

        // Relief : lumière rasante venant du nord-ouest. C'est elle qui donne
        // aux montagnes leur volume — une carte plate paraît morte.
        let ombre = 1;
        if (h > WATER_LEVEL) {
          const pente = ((H[k + 1] - H[k - 1]) + (H[k + L] - H[k - L])) / (2 * Math.max(1, pas));
          ombre = borne(1 + pente * 0.30, 0.62, 1.34);
        }
        const o = (j * NL + i) * 4;
        img.data[o] = Math.min(255, c[0] * ombre);
        img.data[o + 1] = Math.min(255, c[1] * ombre);
        img.data[o + 2] = Math.min(255, c[2] * ombre);
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.fondVue = { ...this.vue, l, h };
    this.dernierRendu = performance.now();
  }

  // --- le calque : ce qui bouge et ce qui se lit -----------------------------

  // Un lieu se dessine en deux morceaux : la pastille d'icône, plantée sur le
  // point exact, et le nom, posé juste dessous. Le nom peut manquer quand la
  // carte est trop chargée ; l'icône, jamais — c'est elle qu'on touche pour
  // partir, et une destination qui s'efface est une destination perdue.
  jeton(ctx, p, emoji, fort) {
    ctx.fillStyle = 'rgba(16, 22, 38, 0.82)';
    ctx.strokeStyle = fort ? 'rgba(255, 215, 94, 0.85)' : 'rgba(255,255,255,0.32)';
    ctx.lineWidth = fort ? 2 : 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, p.x, p.y + 0.5);
  }

  // Cherche à la place exacte, puis sur deux anneaux de plus en plus larges.
  // Le décalage reste borné : au-delà, on préfère renoncer plutôt que de
  // planter une destination loin de là où elle se trouve vraiment.
  ecarter(p, libre, l, h) {
    const essais = [{ x: 0, y: 0 }];
    for (const r of [16, 28]) {
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        essais.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
      }
    }
    for (const d of essais) {
      const q = { x: p.x + d.x, y: p.y + d.y };
      if (q.x < 14 || q.x > l - 14 || q.y < 14 || q.y > h - 14) continue;
      if (libre({ x0: q.x - 13, y0: q.y - 13, x1: q.x + 13, y1: q.y + 13 })) return q;
    }
    return null;
  }

  // Les places possibles pour le nom, dans l'ordre où on les préfère : dessous,
  // dessus, à droite, à gauche. Chercher ailleurs quand la première est prise
  // change tout — sur une carte chargée, c'est la différence entre trois noms
  // affichés et douze. Chacune est rentrée de force dans le cadre : un nom
  // coupé par le bord — « Base spatia » — n'est ni lisible ni touchable.
  boites(ctx, p, texte, fort, larg, haut) {
    ctx.font = fort ? 'bold 12px system-ui, sans-serif' : '11px system-ui, sans-serif';
    const l = ctx.measureText(texte).width + 12;
    const hh = fort ? 19 : 17;
    const faire = (cx, cy) => {
      const ex = borne(cx, l / 2 + 4, larg - l / 2 - 4);
      const ey = borne(cy - hh / 2, 4, haut - hh - 4);
      return { l, hh, ex, ey, x0: ex - l / 2, y0: ey, x1: ex + l / 2, y1: ey + hh };
    };
    return [
      faire(p.x, p.y + 14 + hh / 2),
      faire(p.x, p.y - 14 - hh / 2),
      faire(p.x + 15 + l / 2, p.y),
      faire(p.x - 15 - l / 2, p.y),
    ];
  }

  pastille(ctx, b, texte, fort) {
    ctx.font = fort ? 'bold 12px system-ui, sans-serif' : '11px system-ui, sans-serif';
    ctx.fillStyle = fort ? 'rgba(16, 22, 38, 0.88)' : 'rgba(16, 22, 38, 0.74)';
    ctx.strokeStyle = fort ? 'rgba(255, 215, 94, 0.6)' : 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 1;
    rectArrondi(ctx, b.x0, b.y0, b.l, b.hh, b.hh / 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = fort ? '#ffe9a8' : '#e8edf8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texte, b.ex, b.ey + b.hh / 2 + 0.5);
  }

  // LE CATALOGUE DES LIEUX — un seul endroit, deux usages.
  //
  // Cette liste servait uniquement à dessiner les noms, et elle se
  // reconstruisait à CHAQUE image : deux cents lieux rassemblés soixante fois
  // par seconde pendant qu'on fait glisser la carte. Elle est désormais
  // calculée une fois — rien là-dedans ne bouge pendant une partie — et elle
  // sert aussi à la barre de recherche, qui doit pouvoir trouver un lieu que
  // la carte n'affiche pas encore parce qu'on est trop loin. C'est même tout
  // son intérêt : on tape « Tokyo » sans savoir où il est.
  //
  // `seuil` est l'échelle au-delà de laquelle un nom disparaît de la carte —
  // exprimé en blocs par pixel, donc plus il est grand, plus le nom résiste au
  // dézoom. La recherche, elle, l'ignore : elle voit tout.
  catalogueDesLieux() {
    if (this._catalogue) return this._catalogue;
    const majeur = (c) => (c.r || 0) >= 30;
    this._catalogue = [

      ...CITIES.map((c) => ({ c, fort: true, seuil: 99 })),
      ...PLACES.map((c) => ({ c, fort: true, seuil: majeur(c) ? 99 : 1.9 })),
      ...REPERES.map((c) => ({ c, fort: false, seuil: c.seuil || 1.6 })),
      // Les quartiers de Manhattan, à courte distance seulement. Sur un plan
      // de New York, ce sont eux qu'on lit avant les noms de rue — et ils
      // disent que l'île n'est pas une ville uniforme mais une file de
      // villages soudés.
      ...quartiersDuMonde().map((c) => ({ c, fort: false, seuil: 0.7 })),
      // Et les places de Paris : l'Étoile, la Concorde, la Bastille, le
      // Luxembourg, Montmartre. Un plan de Paris se lit par ses places, comme
      // New York par ses quartiers.
      //
      // Leur seuil est plus large que celui des autres villes (1,3 au lieu de
      // 0,7) parce que Paris est plus large : depuis v187 elle fait trois cent
      // soixante-dix blocs de bord à bord, et au zoom qui la montre ENTIÈRE le
      // seuil de 0,7 effaçait justement ses places. Un plan qu'on ne peut pas
      // lire d'un coup d'œil n'est pas un plan. Sur un téléphone la carte n'a
      // que quatre cents pixels de côté : montrer Paris en entier y demande
      // presque UN bloc par pixel, d'où 1,3 et non 1,0 — c'est le petit écran
      // qui fixe la barre, pas le grand.
      ...lieuxDeParis().map((c) => ({ c, fort: false, seuil: 1.3 })),
      ...lieuxDuParc().map((c) => ({ c, fort: false, seuil: 0.55 })),
      // Et les quartiers et collines de San Francisco — MÊME RAISON QUE PARIS,
      // huit lignes plus haut, et le même remède. Depuis la v192 la ville fait
      // quatre cent quarante blocs de bord à bord au lieu de cent trente-deux :
      // au zoom qui la montre entière, le seuil de 0,7 effaçait Chinatown, le
      // Presidio, le Golden Gate Park et les autres. Une ville qui triple
      // demande qu'on relève le seuil de ses quartiers, sinon elle devient
      // illisible au moment même où elle devient promenable.
      ...lieuxDeSF().map((c) => ({ c, fort: false, seuil: 1.3 })),
      // Nice a triplé en v203 (dix à trente blocs par kilomètre, disque de
      // 144) : de bord à bord elle fait deux cent quatre-vingt-huit blocs, et
      // sur un téléphone de quatre cents pixels la montrer ENTIÈRE demande
      // 0,72 bloc par pixel. À 0,55, ses quartiers s'effaçaient à ce zoom-là —
      // le portail l'a vu avant Max. Même leçon que Paris et San Francisco,
      // et la barre suit la même règle : un peu au-dessus du petit écran.
      ...lieuxDeNice().map((c) => ({ c, fort: false, seuil: 0.8 })),
      ...lieuxDeLille().map((c) => ({ c, fort: false, seuil: 0.55 })),
      ...lieuxDeLondres().map((c) => ({ c, fort: false, seuil: 0.7 })),
      ...lieuxDesVillesMonde().map((c) => ({ c, fort: false, seuil: 0.7 })),
      ...LIEUX_CHINE.map((c) => ({ c, fort: false, seuil: 0.55 })),
      // Et les quartiers et ronds-points de Washington : un plan de la
      // capitale se lit par ses cercles, comme New York par ses quartiers.
      ...lieuxDeWashington().map((c) => ({ c, fort: false, seuil: 0.7 })),
    ];
    return this._catalogue;
  }

  rendreCalque(ctx, l, h) {
    const b = this.vue.bpp;
    this.etiquettes = [];

    // Les bêtes et les gens, tant qu'on est assez près pour les distinguer.
    // Les lieux, du plus important au plus discret, sans jamais se recouvrir.
    // Les deux coins que la carte se dessine à elle-même sont réservés
    // d'avance : un lieu caché derrière la boussole n'est plus touchable.
    const pris = [
      { x0: l - 46, y0: 0, x1: l, y1: 46 },                // la boussole
      { x0: 0, y0: h - 46, x1: 180, y1: h },               // l'échelle
    ];
    const libre = (r) => !pris.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0);
    // Trois rangs, et l'ordre compte : quand deux noms se disputent la même
    // place, c'est toujours le plus important qui l'emporte. Les petites
    // adresses n'apparaissent qu'une fois qu'on s'est approché, sinon elles
    // encombrent le centre de la carte et chassent les grandes destinations.
    const candidats = this.catalogueDesLieux();
    // On réserve d'abord la petite pastille d'icône de CHAQUE destination :
    // vue du ciel, la carte est un menu de voyage, et une destination qui
    // disparaît est une destination qu'on ne peut plus atteindre. Les grands
    // noms ne s'ajoutent qu'ensuite, là où il reste de la place.
    const deja = new Set();
    const retenus = [];
    for (const { c, fort, seuil } of candidats) {
      if (b > seuil || deja.has(c.name)) continue;
      const exact = this.versEcran(c.x, c.z);
      if (exact.x < 2 || exact.x > l - 2 || exact.y < 2 || exact.y > h - 2) continue;
      // Vue du ciel, deux domaines voisins tombent sur le même pixel. Plutôt
      // que d'en effacer un, on écarte sa pastille de quelques pixels — moins
      // que l'épaisseur d'un doigt, et une poignée de blocs à cette échelle,
      // alors qu'un lieu effacé, lui, devient impossible à rejoindre.
      const p = this.ecarter(exact, libre, l, h);
      if (!p) continue;
      const jeton = { x0: p.x - 13, y0: p.y - 13, x1: p.x + 13, y1: p.y + 13 };
      deja.add(c.name);
      pris.push(jeton);
      retenus.push({ c, p, fort, jeton });
      this.jeton(ctx, p, icone(c.name), fort);
      this.etiquettes.push({ rect: jeton, lieu: c });
    }
    for (const r of retenus) {
      const boite = this.boites(ctx, r.p, r.c.name, r.fort, l, h).find(libre);
      if (!boite) continue;
      pris.push(boite);
      this.pastille(ctx, boite, r.c.name, r.fort);
      // le nom aussi emmène en voyage : c'est la plus grande cible du doigt
      this.etiquettes.push({ rect: boite, lieu: r.c });
    }

    // Les autres joueurs, avec leur prénom : c'est ce qu'on vient chercher.
    if (this.autres) {
      for (const a of this.autres()) {
        const p = this.versEcran(a.x, a.z);
        if (p.x < 0 || p.x > l || p.y < 0 || p.y > h) continue;
        ctx.fillStyle = '#4ac9ff';
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (a.nom) {
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
          ctx.strokeText(a.nom, p.x, p.y - 14);
          ctx.fillStyle = '#bfe9ff';
          ctx.fillText(a.nom, p.x, p.y - 14);
        }
      }
    }

    // Les créatures se dessinent à tous les zooms — la légende les promet, et
    // un enfant qui dézoome les voyait disparaître sans un mot : « je ne vois
    // plus de Pokémon sur la carte ». Habitants et animaux, plus nombreux et
    // moins chassés, n'apparaissent qu'en s'approchant. Et elles se dessinent
    // APRÈS les étiquettes : quatre pixels violets sous une pastille de nom
    // étaient effacés, et de loin il n'en reste parfois qu'une à l'écran.
    if (this.mobiles) {
      const tous = b <= 1.4;
      for (const m of this.mobiles()) {
        if (!tous && !m.toujours) continue;
        const p = this.versEcran(m.x, m.z);
        if (p.x < -4 || p.x > l + 4 || p.y < -4 || p.y > h + 4) continue;
        ctx.fillStyle = m.couleur;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
    }

    // Le joueur, flèche pointée là où il regarde.
    const j = this.joueur();
    const p = this.versEcran(j.x, j.z);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(-Math.cos(j.yaw), -Math.sin(j.yaw)));
    ctx.fillStyle = '#ff4444'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    this.echelle(ctx, h);
    this.boussole(ctx, l);
  }

  // Une barre de mesure : sans elle, on ne sait pas si le zoom a bougé.
  echelle(ctx, haut) {
    const jolis = [10, 20, 50, 100, 200, 500, 1000];
    let blocs = jolis[jolis.length - 1];
    for (const v of jolis) { if (v / this.vue.bpp >= 56) { blocs = v; break; } }
    const l = blocs / this.vue.bpp;
    const x = 14, y = haut - 16;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y);
    ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 3); ctx.moveTo(x + l, y - 5); ctx.lineTo(x + l, y + 3);
    ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(`${blocs} blocs`, x, y - 9);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${blocs} blocs`, x, y - 9);
  }

  boussole(ctx, larg) {
    const x = larg - 24, y = 24;
    ctx.fillStyle = 'rgba(16,22,38,0.66)';
    ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff5b5b';
    ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x - 5, y + 2); ctx.lineTo(x + 5, y + 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8edf8';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('N', x, y + 8);
  }

  // --- la boucle -------------------------------------------------------------

  peindre() {
    this._l = 0;
    const { l, h } = this.taille();
    this._l = l; this._h = h;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.canvas.width !== Math.round(l * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(l * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.fondVue = null;
    }
    const maintenant = performance.now();
    const perime = !this.fondVue
      || this.fondVue.l !== l || this.fondVue.h !== h
      || this.fondVue.bpp !== this.vue.bpp
      || this.fondVue.cx !== this.vue.cx
      || this.fondVue.cz !== this.vue.cz;
    // Tant que la vue bouge, on note l'instant : c'est lui qui décide si on
    // rend grossier (geste en cours) ou fin (la carte s'est posée).
    if (perime) this.vueBougeaitA = maintenant;
    // Un fond périmé attend son tour ; un fond absent, non — sans quoi la
    // première image après un changement de taille n'aurait rien à étirer.
    if (perime && (!this.fondVue || maintenant - this.dernierRendu >= RENDU_MS)) {
      this.rendreFond(maintenant - (this.vueBougeaitA || 0) < 350 && !!this.fondVue);
    } else if (!perime && this.fondGrossier && maintenant - this.dernierRendu >= RENDU_MS
      && maintenant - (this.vueBougeaitA || 0) >= 350) {
      this.rendreFond(false);        // le geste est fini : la finesse revient
    }

    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, l, h);

    // Le fond calculé pour la vue précédente est étiré jusqu'à la vue
    // courante : le déplacement reste fluide même pendant qu'on recalcule.
    const f = this.fondVue;
    const largeFL = f.l * f.bpp * MARGE, largeFH = f.h * f.bpp * MARGE;
    const gx = f.cx - largeFL / 2, gz = f.cz - largeFH / 2;
    const a = this.versEcran(gx, gz);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.fond, a.x, a.y, largeFL / this.vue.bpp, largeFH / this.vue.bpp);

    this.rendreCalque(ctx, l, h);
  }

  ouvrir() {
    this.ouverte = true;
    this.fondVue = null;
    const tick = () => {
      if (!this.ouverte) return;
      this.peindre();
      this.boucle = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(this.boucle);
    tick();
  }

  fermer() {
    this.ouverte = false;
    cancelAnimationFrame(this.boucle);
    this.annulerAppui();
  }

  // --- les gestes ------------------------------------------------------------

  annulerAppui() {
    clearTimeout(this.appuiLong);
    this.appuiLong = null;
    if (this.cible) { this.cible.classList.remove('arme'); this.cible.style.display = 'none'; }
  }

  _brancher() {
    const cv = this.canvas;
    this.cible = document.getElementById('map-cible');

    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture?.(e.pointerId);
      this.pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointeurs.size === 1) {
        this.depart = { x: e.clientX, y: e.clientY, t: performance.now() };
        this.aBouge = false;
        this._armerAppuiLong(e);
      } else {
        // deux doigts : c'est un zoom, pas une téléportation
        this.annulerAppui();
        this.multi = true;
        this.pince = this._pince();
      }
      e.preventDefault();
    });

    cv.addEventListener('pointermove', (e) => {
      const p = this.pointeurs.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;

      if (this.pointeurs.size === 1) {
        if (Math.hypot(e.clientX - this.depart.x, e.clientY - this.depart.y) > 10) {
          this.annulerAppui();
          this.aBouge = true;
        }
        if (this.aBouge) {
          this.vue.cx -= dx * this.vue.bpp;
          this.vue.cz -= dy * this.vue.bpp;
          this.limiter();
        }
      } else if (this.pointeurs.size >= 2 && this.pince) {
        const p2 = this._pince();
        const r = cv.getBoundingClientRect();
        if (this.pince.d > 8) {
          const mx = p2.x - r.left, my = p2.y - r.top;
          this.zoomerVers(mx, my, p2.d / this.pince.d);
          // le milieu des deux doigts entraîne aussi la carte
          this.vue.cx -= (p2.x - this.pince.x) * this.vue.bpp;
          this.vue.cz -= (p2.y - this.pince.y) * this.vue.bpp;
          this.limiter();
        }
        this.pince = p2;
      }
      e.preventDefault();
    });

    const fini = (e) => {
      const etait = this.pointeurs.size;
      this.pointeurs.delete(e.pointerId);
      if (this.pointeurs.size < 2) this.pince = null;
      if (etait !== 1) { this.annulerAppui(); return; }
      this.annulerAppui();
      // Un zoom à deux doigts se termine par deux doigts levés l'un après
      // l'autre : sans cette mémoire, le second était pris pour un appui bref
      // et emmenait l'enfant en voyage au beau milieu de son geste.
      const pince = this.multi;
      this.multi = false;
      if (pince || this.aBouge || this.teleporte) { this.teleporte = false; return; }
      if (performance.now() - this.depart.t > 520) return;   // l'appui long a déjà tranché
      this._tap(e);
    };
    for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, fini);

    cv.addEventListener('wheel', (e) => {
      const r = cv.getBoundingClientRect();
      this.zoomerVers(e.clientX - r.left, e.clientY - r.top, e.deltaY > 0 ? 1 / 1.18 : 1.18);
      e.preventDefault();
    }, { passive: false });

    // Le navigateur ne doit ni faire défiler la page ni zoomer par-dessus.
    cv.style.touchAction = 'none';
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _pince() {
    const [a, b] = [...this.pointeurs.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
  }

  _armerAppuiLong(e) {
    const cv = this.canvas;
    const parent = cv.offsetParent;
    if (this.cible && parent) {
      const pr = parent.getBoundingClientRect();
      this.cible.style.left = `${e.clientX - pr.left}px`;
      this.cible.style.top = `${e.clientY - pr.top}px`;
      this.cible.style.display = 'block';
      void this.cible.offsetWidth;
      this.cible.classList.add('arme');
    }
    const r = cv.getBoundingClientRect();
    const m = this.versMonde(e.clientX - r.left, e.clientY - r.top);
    const prevu = performance.now() + 550;
    this.appuiLong = setTimeout(() => {
      // UN MINUTEUR EN RETARD N'A PAS LE DROIT DE TÉLÉPORTER. S'il tire très
      // au-delà de son heure, c'est que le fil principal était bloqué — et
      // les gestes du doigt pendant ce blocage sont peut-être ENCORE en
      // route : même l'image suivante ne les aura pas vus. Dans le doute, on
      // renonce ; l'enfant rappuiera, et « le glisser ne téléporte jamais »
      // pèse plus lourd qu'un appui long à refaire. Vécu au banc de v173 :
      // la carte alourdie de deux cents villes a élargi la fenêtre de la
      // course de v169, et le correctif d'alors ne suffisait plus.
      if (performance.now() - prevu > 120) { this.annulerAppui(); return; }
      // LA COURSE DU MINUTEUR. Sur une machine chargée, le doigt a bougé mais
      // ses évènements attendent encore leur tour dans la file : le minuteur
      // tire AVANT que l'annulation n'ait été traitée, et l'enfant qui
      // faisait glisser la carte se retrouve téléporté au point de départ de
      // son geste. Vécu au banc, reproductible sous contention. On remet donc
      // la décision à l'image suivante — les entrées en attente sont
      // dépouillées avant les rappels d'animation — et on ne part que si le
      // doigt n'a VRAIMENT pas bougé, est toujours posé, et que rien n'a
      // annulé l'appui entre-temps.
      requestAnimationFrame(() => {
        if (this.aBouge || this.pointeurs.size !== 1 || !this.appuiLong) return;
        this.annulerAppui();
        this.teleporte = true;
        this.surTeleport(m.x, m.z);
      });
    }, 550);
  }

  // Un appui bref : sur une étiquette on voyage, ailleurs on rapproche.
  _tap(e) {
    const r = this.canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    for (const et of this.etiquettes) {
      const q = et.rect;
      if (px >= q.x0 - 6 && px <= q.x1 + 6 && py >= q.y0 - 6 && py <= q.y1 + 6) {
        this.surVoyage(et.lieu);
        return;
      }
    }
    const t = performance.now();
    if (t - this.dernierTap < 320 && Math.hypot(px - this.tapX, py - this.tapY) < 34) {
      this.dernierTap = 0;
      this.zoomerVers(px, py, 1.9);
      return;
    }
    this.dernierTap = t; this.tapX = px; this.tapY = py;
  }
}
