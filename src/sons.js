// LE SON DES VÉHICULES — synthétisé, jamais téléchargé (v268).
//
// Max : « les véhicules, on devrait avoir un bruit ambiant. Quand on rentre
// dans une voiture, on devrait avoir un bruit de radio, un petit peu comme
// dans GTA. »
//
// TOUT EST FABRIQUÉ DANS LA PAGE, et ce n'est pas une coquetterie : le jeu
// entier pèse 1,12 Mo compressé, et la v245 a mesuré ce que coûte un seul
// gros fichier au premier chargement. Une boucle de moteur en MP3 pèse
// davantage que le jeu. Le dépôt synthétise déjà ses carillons et ses bruits
// de blocs (`main.js`) : on continue.
//
// Trois règles tiennent ce fichier :
//
//   1. RIEN NE SE CRÉE PAR IMAGE. Le moteur est un graphe de nœuds monté une
//      fois à la montée et démonté à la descente ; le régime se règle par
//      `setTargetAtTime`, qui interpole dans le fil audio sans réveiller le
//      fil principal. Une note de radio est le seul objet éphémère, et elle
//      est programmée À L'AVANCE.
//   2. L'ORDONNANCEUR DE LA RADIO COMPTE EN TEMPS RÉEL, jamais en `dt` : le
//      son n'a pas à ralentir quand la tablette rame (piège de la v226, et
//      ici il s'entendrait). Il regarde l'horloge du contexte audio, qui est
//      la seule qui fasse foi pour du son.
//   3. LA MUSIQUE EST ORIGINALE. Invariant 4 : aucune propriété
//      intellectuelle. Trois stations écrites ici, en degrés de gamme.

let ctx = null;
let maitre = null;          // le gain général, qu'un réglage peut fermer
let actif = true;

// Le contexte se crée au PREMIER BESOIN, jamais au chargement : les
// navigateurs mobiles refusent le son tant que l'enfant n'a rien touché, et
// un contexte créé trop tôt reste suspendu pour toujours.
export function contexteAudio() {
  // On ne RÉVEILLE que si le son est voulu : sans cette garde, le moindre
  // appel annulerait la suspension que `reglerSon(false)` vient de poser.
  if (ctx) { if (actif && ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    maitre = ctx.createGain();
    maitre.gain.value = actif ? 1 : 0;
    maitre.connect(ctx.destination);
    // Son coupé AVANT que le contexte n'existe (le réglage de l'appareil, ou
    // `?son=0`) : on le crée quand même — le graphe se monte, et rallumer
    // sera instantané — mais on l'endort tout de suite, sinon il tiendrait
    // un fil audio et ferait tourner l'ordonnanceur de la radio pour rien.
    if (!actif) ctx.suspend().catch(() => {});
    // L'ONGLET QUI PART EMPORTE SON SON. Une radio qui continue de jouer
    // pendant que l'enfant est ailleurs, c'est le genre de chose qu'on ne
    // pardonne pas à une application.
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.visibilityState === 'hidden') ctx.suspend().catch(() => {});
      else if (actif) ctx.resume().catch(() => {});
    });
  } catch { ctx = null; }
  return ctx;
}

export function sortieAudio() { contexteAudio(); return maitre; }

// Le réglage de l'appareil. On ne DÉTRUIT pas les nœuds — rallumer serait
// alors à reconstruire, et un enfant qui rallume en roulant n'entendrait rien
// jusqu'à ce qu'il redescende. On ferme le robinet ET L'ON SUSPEND LE
// CONTEXTE : un contexte suspendu n'a plus de fil audio, son horloge s'arrête,
// et l'ordonnanceur de la radio, qui compare à cette horloge, ne programme
// plus rien. **Fermer le seul robinet ne suffisait pas** — mesuré : avec
// `?son=0`, `etat()` annonçait encore « moteur voiture, radio Nuit Cubique »,
// c'est-à-dire tous les oscillateurs vivants pour un silence. Un enfant qui
// coupe le son parce que sa tablette rame doit y gagner quelque chose.
export function reglerSon(oui) {
  actif = !!oui;
  if (!ctx) return;
  if (maitre) maitre.gain.setTargetAtTime(actif ? 1 : 0, ctx.currentTime, 0.05);
  if (actif) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  // on laisse le fondu s'achever avant de couper le fil, sinon ça claque
  setTimeout(() => { if (!actif && ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }, 200);
}
export function sonActif() { return actif; }

// --- le bruit de fond d'un moteur -------------------------------------------

// UN MOTEUR, C'EST UN SOUFFLE ET DES HARMONIQUES. Le souffle est du bruit
// blanc filtré — c'est lui qui porte l'air et la route ; les harmoniques sont
// deux dents de scie dont la fréquence suit le régime. Une voiture a des
// harmoniques franches et peu de souffle ; un réacteur, l'inverse : presque
// tout est du souffle, plus un sifflement aigu de compresseur.
const RECETTES = {
  voiture: { base: 42, harmo: 2.02, gainH: 0.055, gainS: 0.020, filtre: 420, q: 1.2, siffle: 0 },
  avion:   { base: 30, harmo: 2.51, gainH: 0.016, gainS: 0.075, filtre: 900, q: 0.7, siffle: 0.012 },
};

let bruitTampon = null;
function tamponDeBruit(c) {
  if (bruitTampon) return bruitTampon;
  // Deux secondes de bruit rose approché (une moyenne glissante sur du
  // blanc) : bouclé, l'oreille n'entend pas la couture.
  const n = Math.floor(c.sampleRate * 2);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  let prec = 0;
  for (let i = 0; i < n; i++) {
    const blanc = Math.random() * 2 - 1;
    prec = 0.92 * prec + 0.08 * blanc;
    d[i] = prec * 3.2;
  }
  bruitTampon = buf;
  return buf;
}

let moteur = null;   // { type, source, filtre, gainS, osc1, osc2, gainH, siffle, gainSif }

export function moteurDemarre(type = 'voiture') {
  const c = contexteAudio();
  if (!c) return false;
  moteurCoupe();
  const r = RECETTES[type] || RECETTES.voiture;
  const sortie = sortieAudio();
  const source = c.createBufferSource();
  source.buffer = tamponDeBruit(c);
  source.loop = true;
  const filtre = c.createBiquadFilter();
  filtre.type = 'bandpass';
  filtre.frequency.value = r.filtre;
  filtre.Q.value = r.q;
  const gainS = c.createGain();
  gainS.gain.value = 0.0001;
  source.connect(filtre).connect(gainS).connect(sortie);
  source.start();

  const osc1 = c.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = r.base;
  const osc2 = c.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = r.base * r.harmo;
  const gainH = c.createGain(); gainH.gain.value = 0.0001;
  const doux = c.createBiquadFilter(); doux.type = 'lowpass'; doux.frequency.value = 1400;
  osc1.connect(doux); osc2.connect(doux); doux.connect(gainH).connect(sortie);
  osc1.start(); osc2.start();

  let siffle = null, gainSif = null;
  if (r.siffle) {
    siffle = c.createOscillator(); siffle.type = 'triangle'; siffle.frequency.value = 1800;
    gainSif = c.createGain(); gainSif.gain.value = 0.0001;
    siffle.connect(gainSif).connect(sortie);
    siffle.start();
  }
  moteur = { type, r, source, filtre, gainS, osc1, osc2, gainH, siffle, gainSif };
  moteurRegime(0);
  return true;
}

// `regime` va de 0 (moteur au ralenti) à 1 (pleins gaz). Tout se fait par
// `setTargetAtTime` : l'interpolation vit dans le fil audio, et appeler cette
// fonction à chaque image ne coûte rien au fil principal.
export function moteurRegime(regime) {
  if (!moteur || !ctx) return;
  const g = Math.max(0, Math.min(1, regime));
  const t = ctx.currentTime, k = 0.09;
  const r = moteur.r;
  // Le régime monte la fondamentale d'une octave et demie, pas plus : au-delà
  // ce n'est plus un moteur, c'est une sirène.
  const f = r.base * (1 + 1.6 * g);
  moteur.osc1.frequency.setTargetAtTime(f, t, k);
  moteur.osc2.frequency.setTargetAtTime(f * r.harmo, t, k);
  moteur.gainH.gain.setTargetAtTime(r.gainH * (0.35 + 0.65 * g), t, k);
  moteur.filtre.frequency.setTargetAtTime(r.filtre * (1 + 1.1 * g), t, k);
  moteur.gainS.gain.setTargetAtTime(r.gainS * (0.4 + 0.6 * g), t, k);
  if (moteur.siffle) {
    moteur.siffle.frequency.setTargetAtTime(1200 + 1800 * g, t, k);
    moteur.gainSif.gain.setTargetAtTime(r.siffle * g * g, t, k);
  }
}

export function moteurCoupe() {
  if (!moteur || !ctx) { moteur = null; return; }
  const t = ctx.currentTime;
  for (const g of [moteur.gainS, moteur.gainH, moteur.gainSif]) {
    if (g) g.gain.setTargetAtTime(0.0001, t, 0.06);
  }
  const m = moteur;
  moteur = null;
  setTimeout(() => {
    try { m.source.stop(); m.osc1.stop(); m.osc2.stop(); if (m.siffle) m.siffle.stop(); } catch { /* déjà arrêtés */ }
  }, 400);
}

// --- la radio ----------------------------------------------------------------

// TROIS STATIONS, ÉCRITES ICI (invariant 4 : rien qui appartienne à
// quelqu'un). Chacune est une gamme, une suite d'accords en degrés, un motif
// de basse et un motif de percussion. C'est peu de chose et ça suffit : ce
// qu'on veut, c'est qu'il se passe quelque chose quand la portière se ferme.
const GAMME = [0, 2, 3, 5, 7, 8, 10];          // mineur naturel
const MAJEURE = [0, 2, 4, 5, 7, 9, 11];
export const STATIONS = [
  { nom: 'Radio Bloc',    tempo: 104, gamme: MAJEURE, racine: 55,
    accords: [0, 5, 3, 4], basse: [0, 0, 4, 0, 2, 0, 4, 0], onde: 'triangle', melodie: [4, 2, 0, 2, 4, 5, 4, 2] },
  { nom: 'Nuit Cubique',  tempo: 92,  gamme: GAMME,   racine: 49,
    accords: [0, 3, 4, 3], basse: [0, 0, 0, 3, 2, 2, 4, 4], onde: 'square', melodie: [0, 3, 4, 3, 2, 0, -3, 0] },
  { nom: 'Grand Large',   tempo: 118, gamme: MAJEURE, racine: 57,
    accords: [0, 4, 5, 3], basse: [0, 4, 2, 4, 0, 4, 5, 4], onde: 'sawtooth', melodie: [2, 4, 5, 4, 2, 0, 2, 4] },
];

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const degre = (st, d) => {
  const g = st.gamme, o = Math.floor(d / g.length), i = ((d % g.length) + g.length) % g.length;
  return st.racine + g[i] + 12 * o;
};

let radio = null;   // { station, gain, prochain, pas, minuteur }

export function radioDemarre(indice = null) {
  const c = contexteAudio();
  if (!c) return null;
  radioCoupe();
  const station = STATIONS[indice == null ? Math.floor(Math.random() * STATIONS.length) : indice % STATIONS.length];
  const gain = c.createGain();
  gain.gain.value = 0.0001;
  gain.connect(sortieAudio());
  gain.gain.setTargetAtTime(0.5, c.currentTime + 0.25, 0.25);
  radio = { station, gain, prochain: c.currentTime + 0.3, pas: 0, minuteur: null };
  grésillement(c, gain);
  // L'ORDONNANCEUR REGARDE L'HORLOGE DU SON, PAS CELLE DE L'ÉCRAN. Il
  // programme un quart de seconde d'avance toutes les cent millisecondes :
  // même si le fil principal saute une demi-seconde (ce qu'il fait en
  // arrivant dans une ville, mesuré en v266), la musique ne bégaie pas.
  radio.minuteur = setInterval(() => avancerRadio(), 100);
  avancerRadio();
  return station.nom;
}

// Le petit souffle d'une radio qu'on allume — deux dixièmes de seconde de
// bruit qui s'éteint, avant la première note.
function grésillement(c, sortie) {
  const s = c.createBufferSource();
  s.buffer = tamponDeBruit(c);
  s.loop = true;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2200;
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  s.connect(f).connect(g).connect(sortie);
  s.start(t); s.stop(t + 0.35);
}

function note(c, sortie, freq, debut, duree, onde, volume) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = onde; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, debut);
  g.gain.exponentialRampToValueAtTime(volume, debut + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  o.connect(g).connect(sortie);
  o.start(debut); o.stop(debut + duree + 0.03);
}

function percussion(c, sortie, debut, fort) {
  const s = c.createBufferSource();
  s.buffer = tamponDeBruit(c);
  const f = c.createBiquadFilter();
  f.type = fort ? 'lowpass' : 'highpass';
  f.frequency.value = fort ? 160 : 5000;
  const g = c.createGain();
  g.gain.setValueAtTime(fort ? 0.34 : 0.10, debut);
  g.gain.exponentialRampToValueAtTime(0.0001, debut + (fort ? 0.16 : 0.06));
  s.connect(f).connect(g).connect(sortie);
  s.start(debut); s.stop(debut + 0.2);
}

function avancerRadio() {
  if (!radio || !ctx) return;
  const c = ctx, st = radio.station;
  const croche = 30 / st.tempo;              // une croche, en secondes
  while (radio.prochain < c.currentTime + 0.25) {
    const t = radio.prochain, i = radio.pas;
    const accord = st.accords[Math.floor(i / 8) % st.accords.length];
    // la basse, une croche sur deux
    if (i % 2 === 0) {
      const d = accord + st.basse[i % st.basse.length];
      note(c, radio.gain, midi(degre(st, d) - 12), t, croche * 1.7, 'triangle', 0.10);
    }
    // la mélodie, sur les temps faibles : c'est ce qui donne l'air
    if (i % 2 === 1) {
      const d = accord + st.melodie[i % st.melodie.length];
      note(c, radio.gain, midi(degre(st, d)), t, croche * 1.2, st.onde, 0.045);
    }
    // et une batterie très simple : grosse caisse sur 1 et 3, charleston partout
    percussion(c, radio.gain, t, i % 4 === 0);
    radio.prochain += croche;
    radio.pas++;
  }
}

export function radioCoupe() {
  if (!radio) return;
  const r = radio;
  radio = null;
  clearInterval(r.minuteur);
  if (ctx) r.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
  setTimeout(() => { try { r.gain.disconnect(); } catch { /* déjà */ } }, 600);
}

export function radioEnCours() { return radio ? radio.station.nom : null; }

// Ce qu'une sonde peut lire — et ce n'est PAS ce qu'un témoin doit croire :
// un témoin de son lit des ÉCHANTILLONS (voir `tests/monte.js`), jamais ce
// drapeau. Il sert à la mise au point et aux captures.
export function etatSon() {
  return {
    contexte: ctx ? ctx.state : null, actif,
    moteur: moteur ? moteur.type : null,
    radio: radio ? radio.station.nom : null,
  };
}
