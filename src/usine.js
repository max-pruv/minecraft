// La Giga-usine automobile d'Austin, Texas.
//
// Max : « une usine automobile comme une Tesla factory, extrêmement réaliste,
// tant de l'extérieur que de l'intérieur : des chaînes de production, des
// robots, des voitures qui avancent, des steps de process — châssis,
// assemblage, peinture. On peut monter dedans, les suivre ; finies, elles se
// garent sur un géant parking. Je veux conduire la voiture quand elle est
// finie. »
//
// TOUT EST RELEVÉ SUR LE VRAI PROCESS d'une giga-usine automobile, dans
// l'ordre où une voiture le traverse :
//
//  1. LA PRESSE — l'emboutissage : des presses géantes frappent les panneaux
//     de carrosserie dans des rouleaux de tôle.
//  2. LA GIGA-PRESSE — la signature d'Austin : le soubassement entier moulé
//     d'UNE SEULE pièce d'aluminium, dans la plus grosse machine de fonderie
//     du monde.
//  3. LA CARROSSERIE — des rangées de bras-robots orange soudent la caisse.
//  4. LA PEINTURE — la caisse grise entre dans le tunnel blanc, elle en
//     ressort COLORÉE. C'est l'instant magique, et le jeu le montre pour de
//     vrai : les voitures de la chaîne changent de couleur en franchissant
//     le tunnel (le crochet `relooke` de src/vehicules.js).
//  5. L'ASSEMBLAGE GÉNÉRAL — le « mariage » de la caisse et de la batterie,
//     puis les portes, les sièges, les roues, pris sur les racks.
//  6. LE TEST — le portique de fin de ligne, et la sortie.
//  7. LE PARC — les voitures neuves alignées en rangées sur le parking géant.
//
// Le bâtiment est celui d'Austin : un très long hall blanc au bandeau vitré,
// les lettres géantes en façade. Le vrai fait 1,2 km ; ici l'enfant le
// traverse en une minute — même règle d'échelle que Roissy (src/aeroport.js),
// dont ce fichier suit le patron : le site aplanit son disque, un LANDMARK
// bâtit le hall, un second le parc, et la carte reçoit sa couleur.
//
// Le site vit aux vraies coordonnées d'Austin (30.2225, −97.6208), inscrites
// au registre des mondes sous la clé `gigatexas` : c'est une destination du
// tour du monde, comme les cinquante grandes.

import { BLOCK, DECOR_START } from './blocks.js';
import { positionDe } from './mondes.js';

const uni = (couleur) => DECOR_START + couleur * 10;

const BLANC = uni(27);
const VERRE = BLOCK.GLASS;
const ARDOISE = uni(25);       // le toit
const BETON = uni(23);         // le sol du hall
const ASPHALTE = uni(25);      // le parking
const GRIS = uni(24);          // les machines
const NOIR = uni(26);
const ROUGE = uni(0);          // les lettres de la façade, la Giga-presse
const ORANGE = uni(1);         // les bras-robots
const JAUNE = uni(2);          // marquages, portique de test
const BLEU = uni(10);
const VERT = uni(5);
const CIEL = uni(9);

let cache = null;
export function USINE() {
  if (!cache) cache = { ...positionDe('gigatexas') };
  return cache;
}

// Les cinq postes de la chaîne, en u (est-ouest) le long de la ligne v = 0.
// Ces chiffres servent trois fois — le bâtisseur, le tracé du convoi et les
// arrêts — et ne sont donc écrits qu'une fois.
export const POSTES = [
  { u: -70, nom: 'la presse' },
  { u: -52, nom: 'la carrosserie' },
  { u: -32, nom: 'la peinture' },
  { u: -14, nom: "l'assemblage" },
  { u: -4, nom: 'le test' },
];
const HALL = { u0: -78, u1: 2, v0: -20, v1: 20, h: 12 };     // le grand hall
const TUNNEL = { u0: -38, u1: -26 };                          // la cabine de peinture
export const PARC = { u0: 14, u1: 86, v0: -30, v1: 30 };      // le parking géant

// --- le relief ----------------------------------------------------------------

// Le site aplanit son disque, avec le fondu du pourtour — même mécanique que
// l'aéroport. Au-delà, le terrain est rendu tel quel, au bloc près.
export function hauteurUsine(x, z, h) {
  const p = USINE();
  const d = Math.hypot(x - p.x, z - p.z);
  if (d >= p.r) return h;
  const m = Math.min(1, (p.r - d) / 20);
  return Math.round(h * (1 - m) + 33 * m);
}

export function dansLUsine(x, z) {
  const p = USINE();
  return Math.hypot(x - p.x, z - p.z) < p.r;
}

// --- le sol -------------------------------------------------------------------

// Le sol du site : la dalle du hall, l'asphalte du parking et de la voie,
// l'herbe rase ailleurs. Les marquages blancs des places sont posés ici — ils
// font partie du sol, pas du bâtiment.
export function solUsine(x, z) {
  const p = USINE();
  const u = x - p.x, v = z - p.z;
  if (Math.hypot(u, v) >= p.r) return null;
  if (u >= HALL.u0 - 2 && u <= HALL.u1 + 2 && v >= HALL.v0 - 2 && v <= HALL.v1 + 2) return BETON;
  if (u >= PARC.u0 && u <= PARC.u1 && v >= PARC.v0 && v <= PARC.v1) {
    // les lignes blanches des places, une rangée sur huit blocs
    if ((v === -26 || v === -18 || v === -10) && ((u - PARC.u0) & 7) === 0) return BLANC;
    return ASPHALTE;
  }
  // la voie qui relie le hall au parc, et la boucle de retour au sud
  if (v >= -3 && v <= 3 && u > HALL.u1 && u < PARC.u0) return ASPHALTE;
  if (v >= 12 && v <= 20 && u >= PARC.u0 && u <= PARC.u1) return ASPHALTE;
  if (v >= 28 && v <= 38 && u >= -66 && u <= 24) return ASPHALTE;
  return null;
}

// --- le hall ------------------------------------------------------------------

// Les lettres de la façade, en 3 × 5 — G, I, G, A.
const LETTRES = {
  G: ['111', '100', '101', '101', '111'],
  I: ['111', '010', '010', '010', '111'],
  A: ['111', '101', '111', '101', '101'],
};

export function buildUsine(poser) {
  const { u0, u1, v0, v1, h } = HALL;
  const mur = (u, y, v) => poser(u, y, v, y >= 5 && y <= 7 ? VERRE : BLANC);

  // les quatre murs — portes ouvertes à l'ouest et à l'est pour la chaîne
  for (let u = u0; u <= u1; u++) {
    for (let y = 1; y <= h; y++) { mur(u, y, v0); mur(u, y, v1); }
  }
  for (let v = v0; v <= v1; v++) {
    for (let y = 1; y <= h; y++) {
      const porte = v >= -4 && v <= 4 && y <= 6;
      if (!porte) { mur(u0, y, v); mur(u1, y, v); }
    }
  }
  // le toit, et sa casquette
  for (let u = u0 - 1; u <= u1 + 1; u++) {
    for (let v = v0 - 1; v <= v1 + 1; v++) poser(u, h + 1, v, ARDOISE);
  }
  // les lettres GIGA sur la façade sud, rouges, hautes de cinq blocs
  let cu = u0 + 18;
  for (const lettre of ['G', 'I', 'G', 'A']) {
    const dessin = LETTRES[lettre];
    for (let ligne = 0; ligne < 5; ligne++) {
      for (let col = 0; col < 3; col++) {
        if (dessin[ligne][col] === '1') poser(cu + col, h - 1 - ligne + 3, v1 + 1, ROUGE);
      }
    }
    cu += 5;
  }

  // le tapis de la chaîne : une bande sombre au sol, jalonnée de jaune
  for (let u = u0 + 1; u < u1; u++) {
    for (let v = -2; v <= 2; v++) poser(u, 0, v, NOIR);
    if ((u & 3) === 0) { poser(u, 0, -3, JAUNE); poser(u, 0, 3, JAUNE); }
  }

  // 1. LA PRESSE : deux presses géantes de part et d'autre de la ligne
  for (const sv of [-1, 1]) {
    for (let du = -73; du <= -68; du++) {
      for (let dv = 6 * sv; sv > 0 ? dv <= 10 : dv >= -10; dv += sv) {
        for (let y = 1; y <= 8; y++) poser(du, y, dv, y === 8 ? NOIR : GRIS);
      }
    }
  }
  // 2. LA GIGA-PRESSE : la plus grosse machine de la fonderie mondiale, un
  // monolithe rouge et gris contre le mur nord, ses pistons dressés
  for (let du = -66; du <= -58; du++) {
    for (let dv = -18; dv <= -8; dv++) {
      for (let y = 1; y <= 9; y++) poser(du, y, dv, y >= 4 && y <= 5 ? ROUGE : GRIS);
    }
  }
  for (const du of [-64, -62, -60]) for (let y = 10; y <= 11; y++) poser(du, y, -13, GRIS);

  // 3. LA CARROSSERIE : huit bras-robots orange penchés sur la ligne, qui
  // soudent — l'étincelle est un bloc jaune au bout du bras
  for (const du of [-56, -52, -48, -44]) {
    for (const sv of [-1, 1]) {
      for (let y = 1; y <= 5; y++) poser(du, y, 5 * sv, ORANGE);      // l'épaule
      poser(du, 5, 4 * sv, ORANGE); poser(du, 5, 3 * sv, ORANGE);     // le bras
      poser(du, 4, 2 * sv, ORANGE);                                    // le poignet
      poser(du, 3, 1 * sv, JAUNE);                                     // l'étincelle
    }
  }

  // 4. LA PEINTURE : le tunnel blanc vitré ; dedans, les buses et leurs
  // gouttes de couleur au-dessus du passage
  for (let du = TUNNEL.u0; du <= TUNNEL.u1; du++) {
    for (const sv of [-1, 1]) {
      for (let y = 1; y <= 7; y++) poser(du, y, 5 * sv, y >= 3 && y <= 5 ? VERRE : BLANC);
    }
    for (let dv = -5; dv <= 5; dv++) poser(du, 8, dv, BLANC);
    if ((du & 1) === 0) {
      poser(du, 7, 0, NOIR);                                           // la buse
      poser(du, 6, 0, [ROUGE, BLEU, VERT, CIEL][((du - TUNNEL.u0) >> 1) & 3]);
    }
  }

  // 5. L'ASSEMBLAGE : les racks de roues et de portes, de part et d'autre
  for (const sv of [-1, 1]) {
    for (let du = -18; du <= -8; du++) {
      poser(du, 1, 8 * sv, GRIS); poser(du, 4, 8 * sv, GRIS);          // les étagères
      if ((du & 1) === 0) { poser(du, 2, 8 * sv, NOIR); poser(du, 3, 8 * sv, NOIR); }   // les roues
      else poser(du, 5, 8 * sv, [ROUGE, BLEU, VERT][du & 3] || BLEU);  // les portes
    }
  }

  // 6. LE TEST : le portique jaune de fin de ligne, juste avant la porte est
  for (let y = 1; y <= 6; y++) { poser(-4, y, -4, GRIS); poser(-4, y, 4, GRIS); }
  for (let dv = -4; dv <= 4; dv++) poser(-4, 7, dv, JAUNE);
}

// Le parc des voitures neuves : trois rangées pleines au nord du parking —
// les livrées de la semaine — chacune de sa couleur, prêtes à partir.
export function buildParcUsine(poser) {
  const teintes = [ROUGE, BLEU, BLANC, VERT, CIEL, JAUNE];
  let n = 0;
  for (const dv of [-26, -18, -10]) {
    for (let du = PARC.u0 + 6; du <= PARC.u1 - 8; du += 8) {
      const c = teintes[n++ % teintes.length];
      for (let a = 0; a <= 3; a++) {
        poser(du + a, 1, dv, c); poser(du + a, 1, dv + 1, c);           // la caisse
      }
      poser(du + 1, 2, dv, VERRE); poser(du + 1, 2, dv + 1, VERRE);     // l'habitacle
      poser(du + 2, 2, dv, c); poser(du + 2, 2, dv + 1, c);
    }
  }
}

// --- la chaîne ----------------------------------------------------------------

// Le tracé de la chaîne de production : il entre par la porte ouest, marque
// chaque poste, sort par la porte est, fait le tour du parc — c'est là qu'on
// suit sa voiture — et revient à l'ouest par la boucle sud. Les distances des
// arrêts se lisent sur les rangs des postes dans la liste de points.
export function traceChaine(sol) {
  const p = USINE();
  const y = sol + 1.05;
  const pts = [{ x: p.x - 92, y, z: p.z }];
  const arretsIndex = [];
  for (const poste of POSTES) {
    arretsIndex.push(pts.length);
    pts.push({ x: p.x + poste.u, y, z: p.z });
  }
  for (const [du, dv] of [[10, 0], [84, 0], [84, 16], [20, 16], [20, 32], [-30, 34], [-66, 32], [-88, 14]]) {
    pts.push({ x: p.x + du, y, z: p.z + dv });
  }
  // La fenêtre de peinture, en distance le long du tracé : la carrosserie
  // est grise de l'entrée jusqu'à la sortie du tunnel, colorée de la sortie
  // du tunnel au retour à la porte ouest. On mesure les longueurs cumulées
  // ici même — le tracé est à nous, autant le connaître.
  const cumul = [0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    cumul.push(cumul[i] + Math.hypot(b.x - a.x, b.z - a.z));
  }
  let sortie = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (a.z === p.z && b.z === p.z && a.x <= p.x + TUNNEL.u1 && b.x >= p.x + TUNNEL.u1) {
      sortie = cumul[i] + (p.x + TUNNEL.u1 - a.x);
      break;
    }
  }
  return { pts, arretsIndex, peinture: { sortie, retour: cumul[pts.length - 1] } };
}

// La couleur du site sur la carte, vue du ciel.
export function couleurCarteUsine(x, z) {
  const p = USINE();
  const u = x - p.x, v = z - p.z;
  if (Math.hypot(u, v) >= p.r) return null;
  if (u >= HALL.u0 && u <= HALL.u1 && v >= HALL.v0 && v <= HALL.v1) return [235, 235, 232];
  const sol = solUsine(x, z);
  if (sol === ASPHALTE || sol === BETON) return [96, 98, 104];
  if (sol === BLANC) return [220, 220, 218];
  return [126, 158, 96];
}
