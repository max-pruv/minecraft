// LA CONDUITE DE LA RUE (v372) — à quelle allure roule une voiture que
// l'enfant ne conduit pas, où elle freine, comment elle repart.
//
// Pur : un seul import, pur lui aussi (`feux.js`, v455), ni three ni document. Un témoin le lit sous node, comme
// `feux.js` et `cap.js`, et `vehicules.js` le lit pour bâtir la grille horaire
// des convois (v305) : deux tables qui décrivent la même conduite finiraient
// par diverger.
//
// Max (octobre 2026) : « des vitesses de circulation cohérentes — aujourd'hui
// les véhicules sont trop lents ». Mesuré avant d'écrire : une voiture de ville
// roulait à 4,2 blocs par seconde, QUINZE kilomètres à l'heure, et l'autoroute
// à douze (43 km/h). Une voiture fait 4,4 blocs pour quatre mètres et demi :
// pour les véhicules un bloc vaut un mètre, et les km/h valent b/s × 3,6.

export const KMH = 3.6;

// L'ALLURE DE CROISIÈRE PAR TYPE DE VOIE, en blocs par seconde. Ce sont les
// limitations d'une vraie ville européenne : trente en zone apaisée, cinquante
// en ville, cent vingt sur l'autoroute. Une rue de ville engendrée roule à
// quarante (sa trame n'a qu'une file par sens) ; une avenue des villes bâties
// à la main — percées, boulevards, avenues nommées de Manhattan — à cinquante.
export const ALLURE_VOIE = {
  ruelle: 30 / KMH,
  rue: 40 / KMH,
  avenue: 50 / KMH,
  autoroute: 120 / KMH,
};

// CE QUE PEUT UNE VOITURE ORDINAIRE, et ce qu'accepte un passager.
// Accélération : 0 à 50 km/h en cinq secondes et demie, une citadine pressée.
// Freinage : 3,5 m/s² est le freinage « de confort » d'un conducteur qui voit
// venir le feu ; 7,5 est l'urgence, ce que l'ABS donne sur sec. Accélération
// latérale : trois m/s², ce qu'un passager supporte sans se tenir — c'est elle
// qui fixe l'allure d'un virage (v = √(a / κ)).
export const ACCEL = 2.6;
export const FREIN = 3.5;
export const FREIN_URGENCE = 7.5;
export const A_LATERALE = 3.0;
// Un tracé est une polyligne : ses coins ont un rayon nul. Une voiture les
// coupe sur la largeur de sa chaussée ; on mesure donc la courbure sur une
// fenêtre de cinq blocs (±2,5), ce qui donne à un coin droit un rayon de
// trois blocs — et onze km/h au plus fort du virage, ce qu'on fait en ville.
export const FENETRE_COURBURE = 2.5;
// et l'on ne descend jamais sous ce plancher : un virage ne s'arrête pas.
export const ALLURE_VIRAGE_MIN = 2.5;

// LA VARIANCE D'UN CONDUCTEUR À L'AUTRE. Un convoi a une seule grille horaire
// (v305 : sa position est une fonction de l'horloge), donc ses voitures roulent
// ensemble ; d'un convoi à l'autre, le conducteur change. ±8 %, tiré de la
// graine — la MÊME sur deux tablettes, donc la même rue chez Alice et Marlon.
export function allureDuConducteur(graine) {
  let h = (Math.imul((graine | 0) ^ 0x5bd1e995, 0x27d4eb2d) >>> 0);
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13;
  return 0.92 + 0.16 * ((h >>> 0) / 4294967296);
}

// La vitesse qu'on peut avoir à s blocs d'un point où il faudra rouler à
// `vFin` (zéro devant un feu), en freinant à `frein` : √(vFin² + 2·a·s).
export function vitesseAvant(s, vFin = 0, frein = FREIN) {
  return Math.sqrt(vFin * vFin + 2 * frein * Math.max(0, s));
}

const replier = (e) => {
  while (e > Math.PI) e -= Math.PI * 2;
  while (e < -Math.PI) e += Math.PI * 2;
  return e;
};

// LE PROFIL DE VITESSE D'UN TRACÉ FERMÉ.
//
// `longueur` : le tour, en blocs. `capA(d)` : le cap à la distance d (celui de
// l'empattement, `Parcours.capLisse`). `limiteA(d)` : l'allure permise ici —
// la rue, l'autoroute, l'entrée de ville. Rend, tous les `pas` blocs, la
// vitesse d'une voiture qui respecte trois choses à la fois :
//   · la limite de la voie, et l'allure qu'un virage permet ;
//   · elle a FREINÉ AVANT ce qui l'oblige à ralentir (passe arrière) ;
//   · elle n'ACCÉLÈRE pas plus vite qu'une voiture (passe avant).
// Les deux passes font deux fois le tour, parce que le tracé est fermé : ce
// qui l'oblige à freiner en fin de tour peut se trouver au début.
export function profilVitesse({ longueur, capA, limiteA, pas = 1,
  accel = ACCEL, frein = FREIN, aLat = A_LATERALE }) {
  const n = Math.max(4, Math.ceil(longueur / pas));
  const h = longueur / n;
  const ds = new Float64Array(n + 1), vs = new Float64Array(n + 1);
  const W = FENETRE_COURBURE;
  for (let k = 0; k < n; k++) {
    const d = k * h;
    const lim = limiteA(d);
    const kappa = Math.abs(replier(capA(d + W) - capA(d - W))) / (2 * W);
    const virage = kappa > 1e-6 ? Math.sqrt(aLat / kappa) : Infinity;
    ds[k] = d;
    vs[k] = Math.min(lim, Math.max(Math.min(ALLURE_VIRAGE_MIN, lim), virage));
  }
  // passe arrière : on freine AVANT
  for (let tour = 0; tour < 2; tour++) {
    for (let k = n - 1; k >= 0; k--) {
      const suiv = vs[(k + 1) % n];
      const v = Math.sqrt(suiv * suiv + 2 * frein * h);
      if (vs[k] > v) vs[k] = v;
    }
  }
  // passe avant : on accélère comme une voiture
  for (let tour = 0; tour < 2; tour++) {
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n;
      const v = Math.sqrt(vs[k] * vs[k] + 2 * accel * h);
      if (vs[j] > v) vs[j] = v;
    }
  }
  ds[n] = longueur; vs[n] = vs[0];
  return { ds, vs, pas: h };
}

// LA GRILLE HORAIRE D'UN PROFIL : le temps où la tête arrive à chaque point.
// Entre deux points la vitesse varie linéairement en distance ; le temps d'un
// pas est donc sa longueur sur la vitesse moyenne. C'est la forme que lit
// `Convoi.distanceA` (v305), et c'est ce qui garde la même circulation sur
// deux tablettes : une fonction de l'horloge, jamais une somme de pas.
export function grilleDuProfil({ ds, vs }) {
  const ts = new Float64Array(ds.length);
  for (let k = 1; k < ds.length; k++) {
    const v = Math.max(0.2, (vs[k - 1] + vs[k]) / 2);
    ts[k] = ts[k - 1] + (ds[k] - ds[k - 1]) / v;
  }
  return { ts, ds };
}

// L'ALLURE QU'UNE VOITURE PEUT VISER, sur place, devant un obstacle à `s`
// blocs qui roule à `vObstacle` dans son sens — le feu (zéro), la voiture qui
// la précède, l'enfant. C'est le freinage de confort tant qu'il suffit ; la
// voiture ne descend sous lui qu'en urgence.
export function allureDevant(s, vObstacle = 0) {
  return vitesseAvant(s, Math.max(0, vObstacle), FREIN);
}

// LE FEU DU CARREFOUR SANS FEU (v455). L'avenue d'entrée d'une autoroute
// coupe des rues de la ville sans feu : elle n'est pas dans les voies
// nommées, et c'est d'elles que naissent les feux (v274). Quatre files
// d'autoroute (aller, retour, leurs jumelles) contre un circuit de la ville :
// en travers, chacune attendait l'autre, et seule la patience de quatre
// secondes (v244) dénouait le nœud, une voiture à la fois. Mesuré à
// (−325, 195) : une tête de file arrêtée quinze à trente secondes, et la queue
// jusqu'au point du témoin de la fumée.
//
// UN TOUR DE RÔLE DANS LA DÉCISION DE CÉDER NE SUFFIT PAS — mesuré : donner
// la main à un côté quand deux voitures se voient en travers laissait celles
// déjà engagées se nouer DANS le carrefour, et la file passait autant (19 et
// 12 contre 26 et 12 en une minute). Ce qui vide un carrefour, c'est une ligne
// d'arrêt AVANT lui : la règle d'un feu, sans poteau, l'axe 0 pour la route et
// l'axe 1 pour la ville, à l'heure de la rue — la même sur deux tablettes
// (v305). Le carrefour se trouve sur les TRACÉS, pas sur le sol.
import { etatFeu } from './feux.js';
// Un croisement est le point où deux VOIES se coupent (chaque voie d'une
// file : l'aller, le retour, les jumelles) : à combien de lui s'arrête le
// centre d'une voiture — la demi-largeur d'une voiture de l'autre voie, sa
// propre demi-longueur, et un bloc.
export const ECART_DEVANT_VILLE = 1.13 + 2.2 + 1.2;   // la route devant la voie d'un circuit
export const ECART_DEVANT_ROUTE = 1.13 + 2.2 + 1.2;   // la ville devant une voie de l'entrée
const VOIT_CROISEMENT = 40, COTE_CROISEMENT = 1.5, ENGAGE_CROISEMENT = 8;
// Pour une voiture en (x, z) qui va vers (ux, uz) : faut-il s'arrêter avant un
// des croisements `liste` ({ x, z, autre }) ? Rend `{ s, orange }` ou null,
// comme un feu de la ville (`feuRougeDevant`, main.js).
export function feuDeCroisement(x, z, ux, uz, liste, route, heureMs) {
  const etat = etatFeu(route ? 0 : 1, heureMs);
  if (etat === 'vert') return null;
  let mieux = null;
  for (const q of liste) {
    const ex = q.x - x, ez = q.z - z;
    if (Math.abs(ex * uz - ez * ux) > COTE_CROISEMENT) continue;
    const devant = ex * ux + ez * uz;
    // déjà sur la ligne ou dans le carrefour (entre deux voies qu'il coupe) :
    // on le dégage, et les voies suivantes ne l'arrêtent pas au milieu
    if (devant > -ENGAGE_CROISEMENT && devant < q.autre) return null;
    if (devant < q.autre || devant > VOIT_CROISEMENT) continue;
    const s = devant - q.autre;
    if (!mieux || s < mieux.s) mieux = { s, orange: etat === 'orange' };
  }
  return mieux;
}
// Où deux tracés (`Parcours`) se coupent : on les échantillonne tous les
// deux blocs, une grille de huit range les segments du premier, et l'on garde
// un point par croisement de deux voies (deux à moins d'un bloc et demi n'en
// font qu'un : l'aller et le retour d'une file sont deux voies).
export function croisementsDeTraces(pa, pb, pas = 2) {
  const ech = (p) => { const out = []; for (let d = 0; d <= p.longueur; d += pas) { const q = p.a(d); out.push([q.x, q.z]); } return out; };
  const A = ech(pa), B = ech(pb), G = 8, grille = new Map();
  for (let i = 0; i + 1 < A.length; i++) {
    const k = Math.floor((A[i][0] + A[i + 1][0]) / 2 / G) + ':' + Math.floor((A[i][1] + A[i + 1][1]) / 2 / G);
    (grille.get(k) || grille.set(k, []).get(k)).push(i);
  }
  const out = [];
  for (let j = 0; j + 1 < B.length; j++) {
    const [p, q] = [B[j], B[j + 1]];
    const cx = Math.floor((p[0] + q[0]) / 2 / G), cz = Math.floor((p[1] + q[1]) / 2 / G);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const i of grille.get((cx + dx) + ':' + (cz + dz)) || []) {
        const [r, s] = [A[i], A[i + 1]];
        const d1x = q[0] - p[0], d1z = q[1] - p[1], d2x = s[0] - r[0], d2z = s[1] - r[1];
        const den = d1x * d2z - d1z * d2x; if (Math.abs(den) < 1e-9) continue;
        const t = ((r[0] - p[0]) * d2z - (r[1] - p[1]) * d2x) / den, u = ((r[0] - p[0]) * d1z - (r[1] - p[1]) * d1x) / den;
        if (t < 0 || t > 1 || u < 0 || u > 1) continue;
        // un tracé qui en LONGE un autre n'est pas un croisement
        if (Math.abs(d1x * d2x + d1z * d2z) / (Math.hypot(d1x, d1z) * Math.hypot(d2x, d2z)) > 0.7) continue;
        const x = p[0] + t * d1x, z = p[1] + t * d1z;
        if (!out.some((o) => Math.hypot(o.x - x, o.z - z) < 1.5)) out.push({ x, z });
      }
    }
  }
  return out;
}

// UNE VOITURE AU FEU ORANGE PASSE SI ELLE NE PEUT PLUS S'ARRÊTER. C'est la
// règle du code de la route (la « zone de dilemme ») : piler au milieu du
// carrefour serait pire que le franchir. Au rouge, on s'arrête toujours, en
// urgence s'il le faut.
export function passeAOrange(v, s) {
  return v * v > 2 * FREIN_URGENCE * Math.max(0, s);
}

// Fait évoluer la vitesse propre `v` d'une voiture vers `vise`, sur `dt`
// secondes : elle monte au plus à ACCEL, et descend à FREIN_URGENCE au plus —
// jamais d'un coup. C'est ce qui fait qu'au feu rouge la vitesse DIMINUE sur
// plusieurs relevés au lieu de passer de v à zéro (v273 arrêtait sec).
export function rapprocher(v, vise, dt) {
  if (vise > v) return Math.min(vise, v + ACCEL * dt);
  return Math.max(vise, v - FREIN_URGENCE * dt);
}
