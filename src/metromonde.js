// =============================================================================
// LES MÉTROS DES VILLES ENGENDRÉES (v482) — la ligne A de Rome d'abord.
//
// La méthode est celle de Washington et de la ligne 1 de Paris (v473, ville.js),
// recopiée pour une ville qui n'a pas de plan à elle : sa géographie est une
// FICHE (villesmonde.js), et c'est la fiche qui place les stations, par leur
// vraie latitude et leur vraie longitude (`f.local`). Le vide d'abord, les
// pleins qui tombent dedans abandonnés, le mobilier ensuite, le gabarit des
// rames en tout dernier : rien ne se met en travers d'un train.
//
// POURQUOI ROME, ET C'EST MESURÉ (sonde de la v482, les trois villes que la
// tâche nommait, les vraies stations à l'intérieur du disque) :
//
//   ville  | stations | espacement (blocs) | relief sous l'emprise | eau  | monuments à moins de box + 14
//   Rome   |   12     |  17 à 35           | 33 partout            |  4 % | aucun
//   Berlin |   10     |  14 à 32           | 33 partout            | 24 % | huit (Brandebourg, Reichstag, Dom, Fernsehturm)
//   Tokyo  |   12     |   8 à 21           | 33 partout            |  0 % | deux (Sensō-ji)
//
// Tokyo est à vingt blocs par kilomètre : ses stations de la Ginza tombent à
// huit blocs l'une de l'autre, moins qu'un quai. Berlin a la Spree le long de
// la U5 et quatre monuments posés sur ses stations. Rome a la ligne A sous un
// sol plat, un seul passage sous le Tibre, et rien au-dessus de ses quais.
//
// Ce qui est creusé n'est PAS le relief : `terrainHeight` ne bouge pas (les
// deux empreintes de `plafond.js` sont intactes par construction), et les
// blocs des enfants sont réappliqués après la ville (fin de `generateChunk`) —
// ils gagnent sur le tunnel.
//
// LE PROFIL EST PLAT, comme à Paris : seize blocs sous la rue (la cote de la
// ville, `coteDeVille`). Le lit du Tibre est à 26 (l'eau de 27 à 30) : le haut
// de la voûte d'une station est à 26, jamais au-dessus — aucune voûte ne
// dépasse dans le fleuve, aucune poche d'air sous l'eau. Une cote constante ne
// dépend d'aucun monde : le worker, le fil principal et deux tablettes
// creusent le même tunnel par construction.
//
// ET L'ESCALIER SUIT LE TROTTOIR, PAS LA LIGNE. À Paris la ligne 1 court sous
// trois avenues, et l'escalier longe l'avenue. Ici la ligne coupe la trame en
// biais (la trame de Rome est tournée de 0,2 rad, la ligne va d'ouest en
// est-sud-est) : un escalier parallèle à la ligne retomberait dans un lot. Les
// directions candidates sont donc aussi les deux axes de la TRAME, dans les
// deux sens — le trottoir d'une rue de Rome fait trois à cinq blocs, assez
// pour une trémie de trois.

import { BLOCK, CITY_BLOCK, DECOR_START, RUE } from './blocks.js';
import { VILLES_MONDE, solVillesMonde, eauVillesMonde, mobilierVillesMonde, coteDeVille } from './villesmonde.js';

const uni = (couleur) => DECOR_START + couleur * 10;
const BETON = BLOCK.STONEBRICK;
const CARREAU = uni(27);          // le carreau blanc
const QUAI = uni(24);
const BORD = uni(2);              // la bande jaune du bord du quai
const RAIL = uni(23);
const TRAVERSE = uni(18);
const GRIS = uni(24);
const ROUGE = uni(0);             // le rouge du « M » romain, sur son mât
const BLANC = uni(27);

// Interrupteur de mesure : `actif = false` rend le monde d'avant la v482 au bit
// près (empreinte des 490 morceaux, plafond.js — Rome est un des neuf lieux).
export const METRO_MONDE = { actif: true };

// Les lignes. Une ligne de plus est une entrée de plus — la ville, ses
// stations en (lat, lon) RÉELLES, sa teinte. Les dimensions sont communes.
export const GABARIT = {
  ecart: 2.2,               // chaque voie à 2,2 blocs de l'axe (la rame fait 1,5)
  demiTunnel: 4, hTunnel: 5,
  demiVoute: 7, hVoute: 8,  // la station : quinze blocs sous la voûte elliptique
  // le quai fait dix-neuf blocs : Repubblica et Termini sont à dix-sept blocs
  // l'une de l'autre (470 m réels), Paris en avait vingt-cinq
  demiStation: 9,
  quai: 3.4,                // le bord du quai, depuis l'axe
  tiroir: 9,
  profondeur: 16,           // de la rue au ballast
};

export const LIGNES_DEF = [
  {
    cle: 'rome', nom: 'métro ligne A', emoji: '🟠', teinte: 0xe8641e,
    // la ligne A, de Cipro à Re di Roma : les douze stations dans le disque de
    // Rome (Battistini et Anagnina en sont loin)
    stations: [
      ['Cipro', 41.9073, 12.4473], ['Ottaviano', 41.9094, 12.4583],
      ['Lepanto', 41.9131, 12.4688], ['Flaminio', 41.9116, 12.4760],
      ['Spagna', 41.9068, 12.4830], ['Barberini', 41.9038, 12.4886],
      ['Repubblica', 41.9022, 12.4955], ['Termini', 41.9008, 12.5009],
      ['Vittorio Emanuele', 41.8946, 12.5047], ['Manzoni', 41.8902, 12.5118],
      ['San Giovanni', 41.8858, 12.5108], ['Re di Roma', 41.8818, 12.5163],
    ],
  },
];

const G = GABARIT;
const MARCHES = G.profondeur - 1;          // du quai à la rue
// L'ESCALIER MONTE DE 0,7 BLOC PAR BLOC (v473) : en biais sur la grille, deux
// colonnes voisines peuvent être à 1,4 bloc l'une de l'autre le long de la
// montée, et à une marche par bloc l'arrondi y ferait une marche de deux.
const PENTE_ESC = 0.7;
export const LONG_ESC = Math.ceil(MARCHES / PENTE_ESC);
// L'ESCALIER FAIT DEUX BLOCS DE LARGE, PAS TROIS. Le trottoir d'une rue
// engendrée fait deux blocs et demi (`RUE_VILLE`, de la chaussée au lot) : une
// trémie de trois n'y tenait nulle part sans mordre la chaussée ou un immeuble
// — six stations sur douze sans bouche, toutes refusées pour cette seule
// raison (mesuré, `L.refus`). L'enfant fait 0,6 bloc de large.
export const DEMI_ESC = 1.0;
export const marcheEn = (le) => Math.round(PENTE_ESC * le);
// la première marche dont la trémie s'ouvre sur la rue (`sol + 3 >= h`), plus
// une : la colonne de cette marche-là est dans la trémie à coup sûr
const M_TOUCHE = (() => { let m = 1; while (marcheEn(m) + 4 < MARCHES + 1) m++; return m + 1; })();
export const cleCol = (x, z) => Math.floor(x) * 65536 + Math.floor(z);

// Ce qui touche la rue ne se pose que sur du TROTTOIR : jamais la chaussée
// (aucun circuit muré), jamais un lot (aucun immeuble éventré), jamais la cour
// d'un îlot (herbe enfermée par les façades : on n'y arriverait pas de la rue),
// jamais la place (les anneaux de voitures peuvent la contourner au plus près).
export const praticable = (x, z) => solVillesMonde(Math.floor(x), Math.floor(z)) === CITY_BLOCK.SIDEWALK;
// Et jamais sur un feu : le feu d'un carrefour est ce que lit la circulation.
const feuIci = (x, z) => {
  let feu = false;
  mobilierVillesMonde(Math.floor(x), Math.floor(z), (dy, id) => { if (id === RUE.FEUX) feu = true; });
  return feu;
};
export const pasDEau = ([x, z]) => !eauVillesMonde(Math.floor(x), Math.floor(z));

const sensEn = (pts, i) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return [(b.x - a.x) / l, (b.z - a.z) / l];
};
const vers = (q, le, tr) => [q.x + q.dx * le - q.dz * tr, q.z + q.dz * le + q.dx * tr];

// Le pied de l'escalier : au bout du couloir, à `o` blocs de l'axe, `a` blocs
// le long du quai. L'escalier part de là dans la direction (ex, ez).
const pied = (q, b) => vers(q, b.a, b.cote * b.o);
export const pointEsc = (q, b, m, t) => {
  const [fx, fz] = pied(q, b);
  return [fx + b.ex * m - b.ez * t, fz + b.ez * m + b.ex * t];
};

function construireLigne(def) {
  const f = VILLES_MONDE.find((x) => x.cle === def.cle);
  const sol = coteDeVille(f);
  const voie = sol - G.profondeur;
  const stations = def.stations.map(([nom, lat, lon]) => {
    const [u, v] = f.local(lat, lon);
    return { nom, lat, lon, x: f.ancre.x + u + 0.5, z: f.ancre.z + v + 0.5 };
  });

  // Le tracé, un point par bloc, tiroirs compris.
  const trace = [];
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i], b = stations[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z)));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      trace.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, arret: k === 0 ? a : null });
    }
  }
  const der = stations[stations.length - 1];
  trace.push({ x: der.x, z: der.z, arret: der });
  const prolonger = (a, b, fin) => {
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const dx = (b.x - a.x) / l, dz = (b.z - a.z) / l;
    const suite = [];
    for (let k = 1; k <= G.tiroir; k++) suite.push({ x: b.x + dx * k, z: b.z + dz * k, arret: null });
    if (fin) trace.push(...suite); else trace.unshift(...suite.reverse());
  };
  prolonger(trace[trace.length - 2], trace[trace.length - 1], true);
  prolonger(trace[1], trace[0], false);

  const quais = trace.map((p, i) => [p, i]).filter(([p]) => p.arret).map(([p, i]) => {
    const [dx, dz] = sensEn(trace, i);
    return { nom: p.arret.nom, x: p.x, z: p.z, dx, dz, i };
  });

  // CE QUI EST DÉJÀ SOUS TERRE (v473) : le tunnel, chaque station, et les
  // escaliers qu'on choisit ensemble.
  const sousTerre = new Map();
  for (const p of trace) {
    for (let dx = -7; dx <= 7; dx++) for (let dz = -7; dz <= 7; dz++) {
      if (Math.hypot(dx, dz) <= 6.5) {
        const c = cleCol(p.x + dx, p.z + dz);
        if (!sousTerre.has(c)) sousTerre.set(c, { k: -1, haut: voie + G.hTunnel + 1 });
      }
    }
  }
  quais.forEach((q, k) => {
    for (let le = -G.demiStation - 2; le <= G.demiStation + 2; le++) {
      for (let tr = -G.demiVoute - 2; tr <= G.demiVoute + 2; tr++) {
        sousTerre.set(cleCol(...vers(q, le, tr)), { k, haut: voie + 1 + G.hVoute });
      }
    }
  });

  // Les directions de l'escalier : le long de la ligne, en travers, et les
  // deux axes de la trame (le repère de `tracesCirculationDe`).
  const co = Math.cos(f.trame.ang), si = Math.sin(f.trame.ang);
  const AXES = [[co, -si], [-co, si], [si, co], [-si, -co]];

  // CE QUI TOUCHE LA RUE SE COMPTE COLONNE PAR COLONNE, avec la règle même du
  // creuseur (`creuserMetroMonde`) : le trottoir d'une rue engendrée fait deux
  // blocs et demi pour une trémie de trois, et un échantillonnage par points
  // laissait passer la colonne de lot du bord — un immeuble éventré.
  // `rue` : les colonnes que l'escalier ouvre (marche ouverte ou palier) ;
  // `bord` : un bloc de plus de chaque côté (rambarde, mât).
  const colonnesHautes = (q, b) => {
    const rue = [], bord = [];
    const [fx, fz] = pied(q, b);
    const m0 = Math.floor((MARCHES - 3) / PENTE_ESC) - 2;
    const xs = [], zs = [];
    for (const [m, t] of [[m0, -3], [m0, 3], [LONG_ESC + 3, -3], [LONG_ESC + 3, 3]]) {
      const [x, z] = pointEsc(q, b, m, t); xs.push(x); zs.push(z);
    }
    for (let x = Math.floor(Math.min(...xs)); x <= Math.floor(Math.max(...xs)); x++) {
      for (let z = Math.floor(Math.min(...zs)); z <= Math.floor(Math.max(...zs)); z++) {
        const px = x + 0.5 - fx, pz = z + 0.5 - fz;
        const le = px * b.ex + pz * b.ez, dl = -px * b.ez + pz * b.ex;
        if (Math.abs(dl) > DEMI_ESC + 1 || le <= 0.5 || le > LONG_ESC + 2.5) continue;
        const m = Math.round(le);
        const touche = m > LONG_ESC || voie + 1 + marcheEn(le) + 3 >= sol;
        if (!touche && m < m0) continue;
        if (Math.abs(dl) <= DEMI_ESC && touche) rue.push([x, z]); else bord.push([x, z]);
      }
    }
    return { rue, bord };
  };
  // UN COIN DE CARREFOUR N'EST PAS UN TROTTOIR COMME UN AUTRE : un anneau de
  // voitures y coupe le virage, et sa carrosserie passe sur le trottoir (une
  // rambarde à 1,2 bloc de la voie d'un circuit à Manzoni, mesuré). Une
  // colonne qui voit de la chaussée selon les DEUX axes de la trame, à trois
  // blocs, est un coin : la trémie ne s'y ouvre pas, et la rambarde et le mât
  // ne s'y dressent pas.
  const rueSur = (x, z) => { const t = solVillesMonde(Math.floor(x), Math.floor(z)); return t !== CITY_BLOCK.SIDEWALK && t !== 'lot'; };
  const coin = (x, z) => {
    const cx = x + 0.5, cz = z + 0.5;
    const voit = ([ex, ez]) => {
      for (let d = 1; d <= 3; d++) if (rueSur(cx + ex * d, cz + ez * d) || rueSur(cx - ex * d, cz - ez * d)) return true;
      return false;
    };
    return voit(AXES[0]) && voit(AXES[2]);
  };
  const emprisesEscalier = (q, b) => {
    const out = [];
    for (let m = -1; m <= LONG_ESC + 2; m++) for (let t = -2; t <= 2; t++) out.push(pointEsc(q, b, m, t));
    for (let t = G.demiVoute; t <= b.o; t++) for (const d of [-2, 0, 2]) out.push(vers(q, b.a + d, t * b.cote));
    return out;
  };
  const empreinteEsc = (q, b) => {
    const out = new Set();
    for (let m = -2; m <= LONG_ESC + 3; m++) for (let t = -3; t <= 3; t++) out.add(cleCol(...pointEsc(q, b, m, t)));
    for (let t = G.demiVoute; t <= b.o + 1; t++) for (let d = -2; d <= 2; d++) out.add(cleCol(...vers(q, b.a + d, t * b.cote)));
    return out;
  };
  const refus = [];
  // le sol d'une colonne se lit une fois pour toute la recherche
  const solMemo = new Map();
  const praticableMemo = (x, z) => {
    const c = cleCol(x, z);
    let v = solMemo.get(c);
    if (v === undefined) { v = praticable(x, z); solMemo.set(c, v); }
    return v;
  };
  const feuMemo = new Map(), eauMemo = new Map();
  const feuIciMemo = (x, z) => {
    const c = cleCol(x, z);
    let v = feuMemo.get(c);
    if (v === undefined) { v = feuIci(x, z); feuMemo.set(c, v); }
    return v;
  };
  const pasDEauMemo = ([x, z]) => {
    const c = cleCol(x, z);
    let v = eauMemo.get(c);
    if (v === undefined) { v = pasDEau([x, z]); eauMemo.set(c, v); }
    return v;
  };
  const placesDe = (q, k) => {
    const libre = (b) => {
      for (let m = 1; m <= LONG_ESC + 2; m++) {
        for (let t = -3; t <= 3; t++) {
          // ce qui est dessous ne gêne que si l'escalier y descend : il passe
          // AU-DESSUS du tunnel d'à côté avec un bloc de terre entre les deux
          const qui = sousTerre.get(cleCol(...pointEsc(q, b, m, t)));
          if (qui !== undefined && qui.k !== k && voie + 1 + marcheEn(m) <= qui.haut + 1) return false;
          // et le bas de l'escalier ne repasse pas dans sa propre station
          if (qui !== undefined && qui.k === k && m > 2 && voie + 1 + marcheEn(m) <= qui.haut + 1) return false;
        }
      }
      // le couloir, au niveau du quai : rien d'autre que sa propre station
      for (let t = G.demiVoute; t <= b.o + 2; t++) {
        for (const d of [-2, 0, 2]) {
          const qui = sousTerre.get(cleCol(...vers(q, b.a + d, t * b.cote)));
          if (qui !== undefined && qui.k !== k) return false;
        }
      }
      return true;
    };
    // la trémie sur le trottoir ; sa rambarde et son mât (un bloc de plus de
    // chaque côté) jamais sur un feu
    // les refus se comptent par raison : une station sans bouche dit pourquoi
    const r = refus[k] = { rue: 0, feu: 0, eau: 0, sousTerre: 0 };
    const tient = (b) => {
      // l'axe de la montée d'abord : ses colonnes sont dans `rue`, et c'est là
      // que presque tous les candidats tombent (sur un lot, sur la chaussée) —
      // le compte exact, colonne par colonne, ne se fait que pour les autres
      for (let m = M_TOUCHE; m <= LONG_ESC + 2; m++) {
        if (!praticableMemo(...pointEsc(q, b, m, 0))) { r.rue++; return false; }
      }
      const { rue, bord } = colonnesHautes(q, b);
      if (!rue.length || !rue.every(([x, z]) => praticableMemo(x, z))) { r.rue++; return false; }
      if (!rue.every(([x, z]) => !feuIciMemo(x, z)) || !bord.every(([x, z]) => !feuIciMemo(x, z))) { r.feu++; return false; }
      if (rue.some(([x, z]) => coin(x, z)) ) { r.coin = (r.coin || 0) + 1; return false; }
      if (!emprisesEscalier(q, b).every(pasDEauMemo)) { r.eau++; return false; }
      if (!libre(b)) { r.sousTerre++; return false; }
      return true;
    };
    const As = [0];
    for (let a = 1; a <= G.demiStation - 2; a += 0.5) As.push(a, -a);
    const out = [];
    // l'escalier droit vers le trottoir (en travers de la ligne), puis les
    // axes de la trame : l'ordre dit la préférence
    for (let o = G.demiVoute + 2; o <= 20; o += 0.5) {
      for (const cote of [1, -1]) {
        const n = [-q.dz * cote, q.dx * cote];
        for (const [ex, ez] of [n, ...AXES]) {
          // jamais un escalier qui revient vers la ligne
          if (ex * n[0] + ez * n[1] < -0.1) continue;
          for (const a of As) {
            const b = { a, o, cote, ex, ez };
            if (tient(b)) out.push(b);
            if (out.length >= 40) return out;
          }
        }
      }
    }
    return out;
  };

  const choisirBouches = () => {
    const places = quais.map((q, k) => placesDe(q, k).map((b) => ({ b, e: empreinteEsc(q, b) })));
    const ordre = quais.map((_, k) => k).sort((i, j) => places[i].length - places[j].length || i - j);
    // DES BOUCHES VOISINES SE CHOISISSENT ENSEMBLE (v473) : une recherche en
    // profondeur bornée, le plus de stations servies, et à nombre égal le
    // premier choix de chacune
    const pris = new Map();
    let meilleur = null, meilleurN = -1, essais = 0;
    const courant = [];
    const chercher = (n, servies) => {
      if (++essais > 20000) return;
      if (servies + (ordre.length - n) <= meilleurN) return;
      if (n === ordre.length) { meilleurN = servies; meilleur = [...courant]; return; }
      const k = ordre[n];
      for (const p of places[k]) {
        let libre = true;
        for (const c of p.e) if (pris.has(c)) { libre = false; break; }
        if (!libre) continue;
        for (const c of p.e) pris.set(c, k);
        courant[k] = p;
        chercher(n + 1, servies + 1);
        for (const c of p.e) pris.delete(c);
        courant[k] = null;
        if (meilleurN === ordre.length) return;
      }
      chercher(n + 1, servies);
    };
    chercher(0, 0);
    return quais.map((q, k) => {
      const p = meilleur && meilleur[k];
      if (!p) return null;
      const b = p.b;
      const [tx, tz] = pointEsc(q, b, LONG_ESC + 2, 0);
      return { nom: q.nom, q, ...b, tx, tz };
    });
  };

  // LES DEUX VOIES : on roule à droite, demi-tour dans le tiroir.
  const voies = (() => {
    const e = G.ecart;
    const cote = (i, s) => { const [dx, dz] = sensEn(trace, i); return { x: trace[i].x - dz * e * s, z: trace[i].z + dx * e * s }; };
    const arc = (i, s) => {
      const [dx, dz] = sensEn(trace, i);
      const out = [];
      for (let k = 1; k <= 5; k++) {
        const g = (k / 6) * Math.PI, c = Math.cos(g), sn = Math.sin(g);
        out.push({ x: trace[i].x + e * s * (-dz * c + dx * sn), z: trace[i].z + e * s * (dx * c + dz * sn) });
      }
      return out;
    };
    return [
      ...trace.map((_, i) => cote(i, 1)),
      ...arc(trace.length - 1, 1),
      ...trace.map((_, i) => cote(i, -1)).reverse(),
      ...arc(0, -1),
    ];
  })();
  const n = trace.length;
  const arrets = [];
  trace.forEach((p, i) => { if (p.arret) { arrets.push(i); arrets.push(n + 5 + (n - 1 - i)); } });

  // LES BOUCHES SE CHOISISSENT AU PREMIER MORCEAU QUI EN A BESOIN (v482). La
  // recherche coûte deux cents millisecondes (des dizaines de milliers de
  // colonnes de sol lues) : au chargement du module, le jeu les paierait
  // derrière « Jouer » et le worker aussi, pour une ville que l'enfant ne verra
  // peut-être pas. Le tracé, les quais et les voies, eux, sont prêts tout de
  // suite (la rame naît au démarrage). Le choix est pur : le worker et le fil
  // principal, qui le font chacun de leur côté, trouvent les mêmes bouches.
  const L = { def, f, sol, voie, stations, trace, quais, voies, arrets, refus, coin, _bouches: null };
  Object.defineProperty(L, 'bouches', {
    get() {
      if (!this._bouches) { this._bouches = choisirBouches(); rangerBouches(this); }
      return this._bouches;
    },
  });
  return L;
}

export const LIGNES_MONDE = LIGNES_DEF.map(construireLigne);

export function traceLigneMonde(L) {
  return L.voies.map((p) => ({ x: p.x, y: L.voie + 0.4, z: p.z }));
}

// Rangement par cases de huit, comme à Washington et à Paris.
const CASE = 8;
const GRILLE = new Map();
const ZONES = new Map();
const cle = (bx, bz) => bx * 65536 + bz;
function ranger(x0, x1, z0, z1, obj) {
  for (let bx = Math.floor(x0 / CASE); bx <= Math.floor(x1 / CASE); bx++) {
    for (let bz = Math.floor(z0 / CASE); bz <= Math.floor(z1 / CASE); bz++) {
      const k = cle(bx, bz);
      if (!GRILLE.has(k)) GRILLE.set(k, []);
      GRILLE.get(k).push(obj);
    }
  }
}
for (const L of LIGNES_MONDE) {
  const T = L.trace;
  for (let i = 0; i < T.length - 1; i++) {
    const a = T[i], b = T[i + 1];
    ranger(Math.min(a.x, b.x) - 7, Math.max(a.x, b.x) + 7, Math.min(a.z, b.z) - 7, Math.max(a.z, b.z) + 7,
      { quoi: 'voie', L, x0: a.x, z0: a.z, x1: b.x, z1: b.z });
  }
  for (const q of L.quais) {
    const r = G.demiStation + 10;
    ranger(q.x - r, q.x + r, q.z - r, q.z + r, { quoi: 'station', L, ...q });
  }
  const v = L.voies;
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length];
    ranger(Math.min(a.x, b.x) - 2, Math.max(a.x, b.x) + 2, Math.min(a.z, b.z) - 2, Math.max(a.z, b.z) + 2,
      { quoi: 'gabarit', L, x0: a.x, z0: a.z, x1: b.x, z1: b.z });
  }
  // la zone où une bouche peut se poser : un morceau qui la touche demande les
  // bouches avant de creuser (`creuserMetroMonde`)
  const portee = G.demiStation + LONG_ESC + 26;
  for (const q of L.quais) {
    for (let bx = Math.floor((q.x - portee) / CASE); bx <= Math.floor((q.x + portee) / CASE); bx++) {
      for (let bz = Math.floor((q.z - portee) / CASE); bz <= Math.floor((q.z + portee) / CASE); bz++) {
        const k = cle(bx, bz);
        if (!ZONES.has(k)) ZONES.set(k, new Set());
        ZONES.get(k).add(L);
      }
    }
  }
}
function rangerBouches(L) {
  for (const b of L._bouches) {
    if (!b) continue;
    const r = Math.abs(b.a) + LONG_ESC + 6 + b.o;
    ranger(b.q.x - r, b.q.x + r, b.q.z - r, b.q.z + r, { quoi: 'bouche', L, ...b });
  }
}

const surSegment = (x, z, s) => {
  const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((x - s.x0) * dx + (z - s.z0) * dz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(x - (s.x0 + t * dx), z - (s.z0 + t * dz));
};
const reperQ = (x, z, q) => {
  const ex = x - q.x, ez = z - q.z;
  return { le: ex * q.dx + ez * q.dz, tr: -ex * q.dz + ez * q.dx };
};
const hVoute = (tr) => Math.round(G.hVoute * Math.sqrt(Math.max(0, 1 - (tr / (G.demiVoute + 0.4)) ** 2)));

// La colonne a-t-elle quelque chose à creuser ? (une case de huit : le morceau
// entier se juge en quatre questions)
export function metroMondePres(x, z) {
  if (!METRO_MONDE.actif) return false;
  const k = cle(Math.floor(x / CASE), Math.floor(z / CASE));
  return GRILLE.has(k) || ZONES.has(k);
}

// Une colonne : (x, z) le coin du bloc, h le sommet de la colonne (la rue),
// `poser(y, id)` en cote ABSOLUE. Rend vrai si elle a creusé.
export function creuserMetroMonde(x, z, h, poser) {
  if (!METRO_MONDE.actif) return false;
  const k = cle(Math.floor(x / CASE), Math.floor(z / CASE));
  const zone = ZONES.get(k);
  if (zone) for (const L of zone) if (!L._bouches) void L.bouches;
  const segs = GRILLE.get(k);
  if (!segs) return false;
  const cx = x + 0.5, cz = z + 0.5;
  const vides = [], pleins = [], apres = [], gabarit = [];
  const creuser = (y0, y1) => { if (y1 >= y0) vides.push([y0, y1]); };

  for (const s of segs) {
    const yr = s.L.voie;
    if (s.quoi === 'gabarit') {
      if (surSegment(cx, cz, s) <= 1.0) gabarit.push([yr + 1, yr + 3]);
      continue;
    }
    if (s.quoi === 'voie') {
      const tr = surSegment(cx, cz, s);
      if (tr > G.demiTunnel + 1.2) continue;
      if (tr > G.demiTunnel) {                              // le piédroit
        for (let y = yr; y <= yr + G.hTunnel + 1; y++) pleins.push([y, BETON]);
        continue;
      }
      const rail = Math.abs(tr - G.ecart) < 0.6;
      pleins.push([yr, rail ? RAIL : ((x + z) % 3 === 0 && tr < G.ecart + 1 ? TRAVERSE : GRIS)]);
      creuser(yr + 1, yr + G.hTunnel);
      pleins.push([yr + G.hTunnel + 1, BETON]);
      continue;
    }
    if (s.quoi === 'station') {
      const r = reperQ(cx, cz, s);
      const Ls = G.demiStation, V = G.demiVoute;
      if (Math.abs(r.le) > Ls + 1 || Math.abs(r.tr) > V + 1.2) continue;
      const atr = Math.abs(r.tr);
      if (atr > V || Math.abs(r.le) > Ls) {                 // l'enveloppe de la station
        for (let y = yr; y <= yr + 1 + hVoute(0); y++) pleins.push([y, BETON]);
        continue;
      }
      const haut = yr + 1 + hVoute(atr);
      if (atr < G.quai) {
        const rail = Math.abs(atr - G.ecart) < 0.6;
        pleins.push([yr, rail ? RAIL : GRIS]);
        creuser(yr + 1, haut - 1);
      } else {
        // le quai latéral, d'un bloc plus haut que les voies, et sa bande jaune
        apres.push([yr + 1, atr < G.quai + 0.8 ? BORD : QUAI]);
        pleins.push([yr, BETON]);
        // les piédroits carrelés, la plaque rouge du nom tous les huit — des
        // PLEINS : le couloir d'une bouche les perce
        if (atr > V - 1) {
          const plaque = (((Math.round(r.le) % 8) + 8) % 8) === 4;
          for (let y = yr + 2; y < haut; y++) pleins.push([y, plaque && y === yr + 3 ? ROUGE : CARREAU]);
        } else creuser(yr + 2, haut - 1);
      }
      pleins.push([haut, CARREAU]);                          // la voûte carrelée
      continue;
    }
    if (s.quoi === 'bouche') {
      const r = reperQ(cx, cz, s.q);
      const lat = r.tr * s.cote;                            // vers le côté de la bouche
      const leQ = r.le - s.a;                                // depuis l'axe du couloir
      // le couloir, du quai au pied de l'escalier, au niveau du quai
      if (leQ >= -1.5 && leQ <= 1.5 && lat >= G.demiVoute - 1 && lat <= s.o + 1.5) {
        if (Math.abs(leQ) > 1) {
          for (let y = yr + 1; y <= yr + 5; y++) pleins.push([y, CARREAU]);
        } else {
          apres.push([yr + 1, QUAI]);
          creuser(yr + 2, yr + 4);
          pleins.push([yr + 5, CARREAU]);
        }
      }
      // l'escalier, dans son repère : `le` le long de la montée, `dl` en travers
      const [fx, fz] = pied(s.q, s);
      const px = cx - fx, pz = cz - fz;
      const le = px * s.ex + pz * s.ez, dl = -px * s.ez + pz * s.ex;
      // le palier du pied : un carré de trois au niveau du quai, sous l'arrivée
      // du couloir (l'escalier peut partir de biais par rapport à lui)
      if (Math.abs(le) <= 1.5 && Math.abs(dl) <= 1.5 && Math.hypot(px, pz) <= 2.2) {
        apres.push([yr + 1, QUAI]);
        creuser(yr + 2, yr + 4);
      }
      if (Math.abs(dl) <= DEMI_ESC + 1 && le > 0.5 && le <= LONG_ESC + 2.5) {
        const m = Math.round(le);
        const sol = Math.min(h, yr + 1 + marcheEn(le));
        const ouvert = sol + 3 >= h;                        // la trémie : on voit le ciel
        if (Math.abs(dl) > DEMI_ESC) {                       // les joues de l'escalier
          if (m <= LONG_ESC) for (let y = sol; y < Math.min(h, sol + 5); y++) pleins.push([y, CARREAU]);
          // la rambarde autour de la trémie, au niveau de la rue
          if (ouvert && m <= LONG_ESC && praticable(cx, cz) && !s.L.coin(x, z)) apres.push([h + 1, GRIS]);
        } else if (m <= LONG_ESC) {
          apres.push([sol, RAIL]);
          // au débouché, on dégage ce qui se dressait sur le trottoir (un
          // réverbère, un banc) : rien ne flotte au-dessus du trou
          creuser(sol + 1, ouvert ? h + 7 : sol + 3);
          if (sol + 4 < h) pleins.push([sol + 4, CARREAU]);
        } else {
          creuser(h + 1, h + 7);                             // le palier de la rue, dégagé
        }
        // le mât rouge au « M » blanc, au haut des marches, côté droit
        if (m === LONG_ESC + 1 && dl >= DEMI_ESC + 0.5 && praticable(cx, cz) && !s.L.coin(x, z)) {
          for (let y = h + 1; y <= h + 3; y++) apres.push([y, GRIS]);
          apres.push([h + 4, ROUGE]);
          apres.push([h + 5, BLANC]);
        }
        // le dos de la trémie, côté bas : la rambarde
        if (ouvert && Math.abs(dl) <= DEMI_ESC && yr + 1 + marcheEn(le - 1) + 3 < h && praticable(cx, cz) && !s.L.coin(x, z)) {
          apres.push([h + 1, GRIS]);
        }
      }
      continue;
    }
  }

  if (!vides.length && !pleins.length && !apres.length && !gabarit.length) return false;
  for (const [y0, y1] of vides) for (let y = y0; y <= y1; y++) poser(y, BLOCK.AIR);
  const dansLeVide = (y) => vides.some(([a, b]) => y >= a && y <= b);
  for (const [y, id] of pleins) if (!dansLeVide(y)) poser(y, id);
  for (const [y, id] of apres) poser(y, id);
  for (const [y0, y1] of gabarit) for (let y = y0; y <= y1; y++) poser(y, BLOCK.AIR);
  return true;
}
