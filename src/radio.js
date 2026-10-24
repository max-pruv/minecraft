// LA RADIO DE LA VOITURE — le programme, pur (v542).
//
// Max : « améliore la conduite pour qu'elle ressemble à GTA… la musique, le
// son ». La radio de la v268 jouait une boucle de quatre mesures, la même
// pour toujours, sur une station tirée au sort à la montée, et rien ne
// permettait d'en changer. Ce module porte ce qu'une radio a et que celle-là
// n'avait pas :
//
//   - DES STATIONS QUI ONT CHACUNE UN CARACTÈRE, et plusieurs MORCEAUX par
//     station, chacun avec un titre, deux parties (couplet, refrain) et une
//     FORME (l'ordre des parties) — un morceau dure autour d'une minute, et
//     il ne repasse qu'après les autres ;
//   - UN PROGRAMME QUI AVANCE SANS NOUS. Une vraie radio continue de jouer
//     quand on l'éteint : `programme(station, t)` rend, pour une heure réelle
//     en secondes, le morceau et le pas de croche en cours. Changer de
//     station et y revenir tombe donc plus loin dans le morceau, et deux
//     tablettes qui écoutent la même station entendent la même chose ;
//   - UN JINGLE au début de chaque morceau — l'indicatif de la station, sans
//     batterie — qui dit à l'oreille sur quelle station on est.
//
// Tout est écrit ici en DEGRÉS DE GAMME, relatifs à l'accord en cours : un
// 0, un 2, un 4 sont les notes de l'accord, et une mélodie reste juste quelle
// que soit la progression. Invariant 4 : rien n'appartient à personne, ces
// airs sont écrits ici. `sons.js` joue ce que ce module lui dit ; les
// témoins (reglages.js) lisent ce module sous node, sans son.
//
// Aucun import : le worker et les témoins peuvent le charger tel quel.

export const CROCHES_PAR_MESURE = 8;
export const MESURES_PAR_PARTIE = 4;
export const PAS_PAR_PARTIE = CROCHES_PAR_MESURE * MESURES_PAR_PARTIE;   // 32
export const PAS_JINGLE = 8;                                             // une mesure, avant chaque morceau

const MAJEURE = [0, 2, 4, 5, 7, 9, 11];
const MINEURE = [0, 2, 3, 5, 7, 8, 10];
const DORIEN = [0, 2, 3, 5, 7, 9, 10];
const _ = null;   // un silence, dans une mélodie

// Les batteries : huit croches, 'x' frappe. `grosse` est la grosse caisse,
// `caisse` la caisse claire, `charley` le charleston. `aucune` : rien.
export const BATTERIES = {
  pop:    { grosse: 'x...x...', caisse: '..x...x.', charley: 'xxxxxxxx' },
  hiphop: { grosse: 'x..x..x.', caisse: '..x...x.', charley: 'x.xxx.xx' },
  disco:  { grosse: 'x.x.x.x.', caisse: '..x...x.', charley: '.x.x.x.x' },
  rock:   { grosse: 'x...x.x.', caisse: '..x...x.', charley: 'x.x.x.x.' },
  aucune: { grosse: '........', caisse: '........', charley: '........' },
};

// Une partie : quatre accords (un par mesure, en degrés de la gamme), une
// basse de huit noires (deux mesures, elle se répète), une mélodie de seize
// ou trente-deux croches (relative à l'accord, `null` = silence). `arpege`
// remplace basse et mélodie par l'accord égrené croche par croche.
const P = (accords, basse, melodie, extra = {}) => ({ accords, basse, melodie, ...extra });

export const STATIONS = [
  {
    nom: 'Radio Bloc', style: 'pop', tempo: 108, gamme: MAJEURE, racine: 55, onde: 'triangle', aigu: 12,
    batterie: 'pop', jingle: [[0, 1], [2, 1], [4, 1], [7, 3], [4, 2]],
    morceaux: [
      { titre: 'Pavé mouillé', forme: ['A', 'A', 'B', 'A', 'B', 'B'],
        parties: {
          A: P([0, 5, 3, 4], [0, 0, 4, 0, 2, 0, 4, 4], [4, _, 2, 0, 2, 4, _, 5, 4, 2, _, 0, 2, 4, 5, 7]),
          B: P([3, 4, 0, 4], [0, 4, 0, 4, 0, 2, 4, 2], [7, 7, 5, 4, _, 4, 5, 7, 9, _, 7, 5, 4, 2, 4, _]),
        } },
      { titre: 'Sous les toits', forme: ['A', 'B', 'A', 'B', 'A'],
        parties: {
          A: P([0, 3, 5, 4], [0, 0, 2, 4, 0, 0, 4, 2], [0, 2, 4, _, 4, 5, 4, 2, 0, _, 2, 4, 7, _, 5, 4]),
          B: P([5, 3, 0, 4], [0, 4, 0, 4, 2, 4, 2, 0], [4, 4, _, 7, 9, 7, 4, _, 2, 4, 5, 4, 2, _, 0, _]),
        } },
      { titre: 'Deux roues sur le quai', forme: ['A', 'A', 'B', 'B', 'A'],
        parties: {
          A: P([0, 4, 5, 3], [0, 2, 4, 2, 0, 2, 4, 7], [2, _, 2, 4, 5, _, 4, 2, 0, 2, _, 0, 4, 4, 2, _]),
          B: P([3, 0, 4, 0], [0, 0, 4, 4, 0, 0, 2, 2], [9, 7, 5, 4, _, 5, 7, 9, 11, 9, 7, _, 4, 5, 7, 7]),
        } },
    ],
  },
  {
    nom: 'Nuit Cubique', style: 'synth', tempo: 92, gamme: MINEURE, racine: 49, onde: 'square', aigu: 12,
    batterie: 'rock', jingle: [[0, 2], [3, 1], [4, 1], [7, 2], [3, 2]],
    morceaux: [
      { titre: 'Néons bleus', forme: ['A', 'A', 'B', 'A', 'B'],
        parties: {
          A: P([0, 3, 4, 3], [0, 0, 0, 3, 2, 2, 4, 4], [0, 3, 4, 3, 2, 0, -3, 0, _, 4, 3, 2, 0, _, 2, 0]),
          B: P([5, 3, 0, 4], [0, 4, 0, 4, 0, 4, 2, 0], [7, _, 7, 9, 7, 4, _, 4, 5, 4, 2, _, 0, 2, 4, _]),
        } },
      { titre: 'Le périph la nuit', forme: ['A', 'B', 'A', 'B', 'B'],
        parties: {
          A: P([0, 0, 5, 4], [0, 0, 4, 0, 0, 0, 4, 2], [4, 4, _, 4, 2, 0, _, 2, 4, 5, 4, _, 2, 0, _, _]),
          B: P([3, 4, 0, 0], [0, 4, 2, 4, 0, 4, 2, 4], [7, 5, 4, _, 7, 5, 4, _, 9, 7, 5, 4, _, 2, 4, 4]),
        } },
      { titre: 'Pluie sur le pare-brise', forme: ['A', 'A', 'B', 'A'],
        parties: {
          A: P([0, 5, 0, 4], [0, 0, 2, 0, 0, 0, 2, 4], [0, _, 2, 4, _, 2, 0, _, 3, _, 2, 0, _, -3, 0, _]),
          B: P([3, 5, 4, 4], [0, 2, 4, 2, 0, 2, 4, 7], [4, 5, 7, _, 5, 4, 2, _, 4, 5, 7, 9, 7, 5, 4, 2]),
        } },
    ],
  },
  {
    nom: 'Grand Large', style: 'disco', tempo: 120, gamme: MAJEURE, racine: 57, onde: 'sawtooth', aigu: 12,
    batterie: 'disco', jingle: [[0, 1], [4, 1], [7, 1], [9, 1], [7, 2], [4, 2]],
    morceaux: [
      { titre: 'Autoroute du soleil', forme: ['A', 'A', 'B', 'A', 'B', 'B'],
        parties: {
          A: P([0, 4, 5, 3], [0, 4, 2, 4, 0, 4, 5, 4], [2, 4, 5, 4, 2, 0, 2, 4, _, 4, 5, 7, 5, 4, 2, _]),
          B: P([3, 4, 5, 4], [0, 4, 0, 4, 2, 4, 2, 4], [7, _, 7, 9, 7, 5, 4, _, 5, 7, 9, _, 7, 5, 4, 2]),
        } },
      { titre: 'Plein phare', forme: ['A', 'B', 'A', 'B', 'A'],
        parties: {
          A: P([0, 3, 4, 0], [0, 2, 4, 2, 0, 2, 4, 2], [4, 4, 2, 4, 5, 5, 4, 2, 0, _, 2, 4, 5, 4, 2, 0]),
          B: P([5, 4, 3, 4], [0, 0, 4, 4, 0, 0, 2, 2], [9, 7, 5, 7, 9, _, 7, 5, 4, 5, 7, _, 5, 4, 2, 4]),
        } },
      { titre: 'Les quais à midi', forme: ['A', 'A', 'B', 'B'],
        parties: {
          A: P([0, 5, 3, 4], [0, 4, 0, 4, 0, 4, 0, 4], [0, 2, 4, 7, _, 4, 2, 0, 2, 4, 5, _, 4, 2, 0, _]),
          B: P([3, 0, 5, 4], [0, 2, 4, 7, 4, 2, 0, 2], [7, 7, 9, 7, 5, _, 4, 5, 7, _, 9, 11, 9, 7, 5, 4]),
        } },
    ],
  },
  {
    nom: 'Boulevard 93', style: 'hiphop', tempo: 86, gamme: DORIEN, racine: 50, onde: 'sawtooth', aigu: 12,
    batterie: 'hiphop', jingle: [[0, 2], [3, 1], [0, 1], [5, 2], [3, 2]],
    morceaux: [
      { titre: 'Bitume', forme: ['A', 'A', 'B', 'A', 'B'],
        parties: {
          A: P([0, 0, 3, 4], [0, 0, 0, -3, 0, 0, 4, 2], [_, 4, _, 2, 0, _, 2, _, 4, _, 5, 4, 2, _, 0, _]),
          B: P([5, 3, 0, 0], [0, 4, 0, 4, 0, 2, 0, 2], [7, _, 5, 4, _, 4, 5, _, 4, 2, _, 0, _, 2, 4, _]),
        } },
      { titre: 'Feu rouge, feu vert', forme: ['A', 'B', 'A', 'B', 'A'],
        parties: {
          A: P([0, 3, 0, 3], [0, 0, 2, 0, 0, 0, 2, 4], [0, _, 0, 2, _, 2, 4, _, 2, _, 0, _, -3, _, 0, _]),
          B: P([4, 3, 5, 4], [0, 2, 0, 2, 4, 2, 0, 2], [4, 4, _, 5, 4, _, 2, 4, 5, 7, _, 5, 4, _, 2, _]),
        } },
      { titre: 'Sur la rocade', forme: ['A', 'A', 'B', 'B', 'A'],
        parties: {
          A: P([0, 5, 0, 5], [0, -3, 0, 2, 0, -3, 0, 4], [2, _, 2, 4, _, 4, 2, 0, _, 0, 2, _, 4, _, 2, _]),
          B: P([3, 4, 3, 0], [0, 4, 2, 4, 0, 4, 2, 0], [7, 5, _, 4, 5, _, 4, 2, 4, _, 2, 0, _, 2, 4, 5]),
        } },
    ],
  },
  {
    nom: 'Salle Ronde', style: 'classique', tempo: 76, gamme: MAJEURE, racine: 60, onde: 'triangle', aigu: 0,
    batterie: 'aucune', jingle: [[0, 1], [4, 1], [7, 1], [11, 1], [14, 4]],
    morceaux: [
      { titre: 'Petite rivière', forme: ['A', 'A', 'B', 'A'],
        parties: {
          A: P([0, 3, 4, 0], [0, 2, 4, 2, 0, 2, 4, 2], [], { arpege: [0, 2, 4, 7, 4, 2, 0, 2] }),
          B: P([5, 3, 4, 4], [0, 2, 4, 2, 0, 2, 4, 2], [], { arpege: [0, 4, 2, 7, 9, 7, 4, 2] }),
        } },
      { titre: 'Les marches du palais', forme: ['A', 'B', 'A', 'B'],
        parties: {
          A: P([0, 4, 5, 3], [0, 0, 2, 2, 4, 4, 2, 2], [7, _, 4, _, 2, _, 4, 5, 7, _, 5, _, 4, _, 2, _], { aigu: 12 }),
          B: P([3, 4, 0, 4], [0, 2, 4, 2, 0, 2, 4, 2], [], { arpege: [0, 2, 4, 2, 7, 4, 2, 0] }),
        } },
      { titre: 'Berceuse pour un cube', forme: ['A', 'B', 'A'],
        parties: {
          A: P([0, 5, 3, 4], [0, 4, 2, 4, 0, 4, 2, 4], [4, _, _, 2, 0, _, _, 2, 4, _, _, 5, 4, _, _, _], { aigu: 12 }),
          B: P([3, 0, 4, 0], [0, 2, 4, 2, 0, 2, 4, 2], [], { arpege: [0, 4, 7, 4, 2, 4, 7, 9] }),
        } },
    ],
  },
];

export const dureePas = (st) => 30 / st.tempo;           // une croche, en secondes
export const pasDuMorceau = (m) => PAS_JINGLE + m.forme.length * PAS_PAR_PARTIE;
export const pasDeStation = (st) => st.morceaux.reduce((s, m) => s + pasDuMorceau(m), 0);

export const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
export function degre(st, d) {
  const g = st.gamme, o = Math.floor(d / g.length), i = ((d % g.length) + g.length) % g.length;
  return st.racine + g[i] + 12 * o;
}

// OÙ EN EST LA STATION À L'HEURE `t` (secondes réelles) : le morceau et le pas
// de croche en cours. C'est ce qui fait qu'une station continue de jouer
// quand on ne l'écoute pas.
export function programme(st, t) {
  const total = pasDeStation(st);
  let pas = Math.floor(Math.max(0, t) / dureePas(st)) % total;
  for (let k = 0; k < st.morceaux.length; k++) {
    const n = pasDuMorceau(st.morceaux[k]);
    if (pas < n) return { morceau: k, pas };
    pas -= n;
  }
  return { morceau: 0, pas: 0 };
}

// CE QUI SE JOUE À UN PAS DONNÉ d'un morceau : une liste d'événements
//   { quoi: 'jingle'|'basse'|'melodie'|'arpege', note (midi), duree (croches), volume }
//   { quoi: 'grosse'|'caisse'|'charley' }
// Dans le jingle, pas de batterie : l'indicatif se reconnaît au silence
// autour de lui.
export function evenements(st, k, pas) {
  const m = st.morceaux[k % st.morceaux.length];
  const evts = [];
  if (pas < PAS_JINGLE) {
    let debut = 0;
    for (const [d, duree] of st.jingle) {
      if (debut === pas) evts.push({ quoi: 'jingle', note: midi(degre(st, d) + (st.aigu || 0)), duree, volume: 0.09 });
      debut += duree;
    }
    return evts;
  }
  const p = pas - PAS_JINGLE;
  const partie = m.parties[m.forme[Math.floor(p / PAS_PAR_PARTIE) % m.forme.length]];
  const i = p % PAS_PAR_PARTIE;
  const accord = partie.accords[Math.floor(i / CROCHES_PAR_MESURE) % partie.accords.length];
  const aigu = partie.aigu != null ? partie.aigu : (st.aigu || 0);
  if (partie.arpege) {
    const d = accord + partie.arpege[i % partie.arpege.length];
    evts.push({ quoi: 'arpege', note: midi(degre(st, d) + aigu), duree: 1.6, volume: 0.065 });
    if (i % CROCHES_PAR_MESURE === 0) evts.push({ quoi: 'basse', note: midi(degre(st, accord) - 12), duree: 7, volume: 0.09 });
  } else {
    if (i % 2 === 0) {
      const d = accord + partie.basse[(i / 2) % partie.basse.length];
      evts.push({ quoi: 'basse', note: midi(degre(st, d) - 12), duree: 1.7, volume: 0.10 });
    }
    const mel = partie.melodie[i % partie.melodie.length];
    if (mel != null) evts.push({ quoi: 'melodie', note: midi(degre(st, accord + mel) + aigu), duree: 1.2, volume: 0.06 });
  }
  const b = BATTERIES[st.batterie] || BATTERIES.aucune, c = i % CROCHES_PAR_MESURE;
  if (b.grosse[c] === 'x') evts.push({ quoi: 'grosse' });
  if (b.caisse[c] === 'x') evts.push({ quoi: 'caisse' });
  if (b.charley[c] === 'x') evts.push({ quoi: 'charley' });
  return evts;
}

// Le titre en cours, pour le bouton de la radio et le diagnostic.
export function titreEnCours(st, k) {
  const m = st.morceaux[k % st.morceaux.length];
  return m ? m.titre : '';
}

// LA STATION SUIVANTE, PUIS LE SILENCE. `indice` est l'indice en cours ou
// `null` (radio éteinte) ; on rend l'indice suivant, et `null` après la
// dernière — un tour complet repasse par le silence, pour qui veut rouler
// sans musique.
export function stationSuivante(indice, n = STATIONS.length) {
  if (indice == null) return 0;
  const k = indice + 1;
  return k >= n ? null : k;
}
