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
let enAppel = false;        // un appel de visio porte du son (v304)
let generation = 0;         // combien de contextes ont vécu — une sonde le lit
let veilleArmee = false;
// Pendant un appel, le jeu parle plus bas : l'annulation d'écho de la
// tablette n'a pas à se battre contre la radio et le moteur.
const GAIN_APPEL = 0.25;
const gainVoulu = () => (actif ? (enAppel ? GAIN_APPEL : 1) : 0);

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
    generation++;
    maitre = ctx.createGain();
    maitre.gain.value = gainVoulu();
    maitre.connect(ctx.destination);
    // Son coupé AVANT que le contexte n'existe (le réglage de l'appareil, ou
    // `?son=0`) : on le crée quand même — le graphe se monte, et rallumer
    // sera instantané — mais on l'endort tout de suite, sinon il tiendrait
    // un fil audio et ferait tourner l'ordonnanceur de la radio pour rien.
    if (!actif) ctx.suspend().catch(() => {});
    // L'ONGLET QUI PART EMPORTE SON SON. Une radio qui continue de jouer
    // pendant que l'enfant est ailleurs, c'est le genre de chose qu'on ne
    // pardonne pas à une application.
    // Un seul écouteur pour tous les contextes : un appel en recrée un.
    if (!veilleArmee) {
      veilleArmee = true;
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.visibilityState === 'hidden') ctx.suspend().catch(() => {});
        else if (actif) ctx.resume().catch(() => {});
      });
    }
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
  if (maitre) maitre.gain.setTargetAtTime(gainVoulu(), ctx.currentTime, 0.05);
  if (actif) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  // on laisse le fondu s'achever avant de couper le fil, sinon ça claque
  setTimeout(() => { if (!actif && ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }, 200);
}
export function sonActif() { return actif; }

// --- la visio : un contexte neuf quand l'iPad passe en mode appel (v304) ------
//
// Max : « Alice, quand elle utilise l'audio et la vidéo, entend un son hyper
// robotique de son côté sur son iPad. Pas avec tous les appareils, mais avec le
// sien. » Dès qu'un appel porte du son — son micro ouvert, ou la voix d'un ami
// qui arrive —, iOS bascule la session audio en mode APPEL, avec le traitement
// de la voix, et sur certains iPad à une autre fréquence d'échantillonnage que
// la lecture ordinaire. Un contexte Web Audio créé AVANT reste à l'ancienne
// fréquence et passe par un rééchantillonnage de mauvaise qualité : c'est le
// son robotique, connu de Safari, qui dépend du matériel — d'où « pas avec
// tous les appareils ». Le remède est de fermer le contexte du jeu et d'en
// ouvrir un neuf, qui prend la fréquence de la session en cours ; et de même à
// la fin de l'appel, quand iOS revient au mode lecture. Le moteur et la radio
// qui jouaient reprennent sur le contexte neuf.
//
// Et pendant l'appel le jeu parle plus bas (`GAIN_APPEL`) : l'annulation d'écho
// de la tablette ne connaît que la voix qu'elle joue elle-même, pas la radio ;
// une radio pleine puissance dans le haut-parleur, c'est un écho qu'elle
// découpe en morceaux, et c'est l'ami qui entend un robot.
export function appelEnCours(oui) {
  oui = !!oui;
  if (oui === enAppel) return;
  enAppel = oui;
  if (!ctx) return;              // le contexte naîtra à la bonne fréquence au premier besoin
  const typeMoteur = moteur ? moteur.type : null;
  const station = radio ? STATIONS.indexOf(radio.station) : -1;
  if (moteur) { arreterMoteur(moteur); moteur = null; }
  if (radio) { clearInterval(radio.minuteur); radio = null; }
  const vieux = ctx;
  ctx = null; maitre = null; bruitTampon = null;   // un tampon vit à la fréquence de son contexte
  vieux.close().catch(() => {});
  if (typeMoteur) moteurDemarre(typeMoteur);
  if (station >= 0) radioDemarre(station);
  // Hors d'un geste de l'enfant (après l'autorisation du micro), iOS peut
  // créer le contexte endormi : le premier contact avec l'écran le réveille.
  if (ctx && ctx.state === 'suspended') {
    const reveil = () => { if (ctx && actif && ctx.state === 'suspended') ctx.resume().catch(() => {}); };
    document.addEventListener('pointerdown', reveil, { once: true, capture: true });
  }
}
export function generationAudio() { return generation; }

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
  // LA TOUX ET LA PANNE (v401) passent par un robinet commun au souffle et aux
  // harmoniques : un moteur qui tousse se tait tout entier un instant, il ne
  // garde pas son souffle pendant que ses harmoniques s'éteignent.
  const toux = c.createGain();
  toux.gain.value = 1;
  toux.connect(sortie);
  source.connect(filtre).connect(gainS).connect(toux);
  source.start();

  const osc1 = c.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = r.base;
  const osc2 = c.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = r.base * r.harmo;
  const gainH = c.createGain(); gainH.gain.value = 0.0001;
  const doux = c.createBiquadFilter(); doux.type = 'lowpass'; doux.frequency.value = 1400;
  osc1.connect(doux); osc2.connect(doux); doux.connect(gainH).connect(toux);
  osc1.start(); osc2.start();

  let siffle = null, gainSif = null;
  if (r.siffle) {
    siffle = c.createOscillator(); siffle.type = 'triangle'; siffle.frequency.value = 1800;
    gainSif = c.createGain(); gainSif.gain.value = 0.0001;
    siffle.connect(gainSif).connect(sortie);
    siffle.start();
  }
  // LES PNEUS (v401), montés UNE fois avec le moteur d'une voiture et
  // silencieux tant qu'ils ne glissent pas : un souffle serré autour de trois
  // kilohertz et un sifflement tonal qui tremble — c'est le tremblement qui
  // fait un crissement plutôt qu'une bouilloire.
  let pneus = null;
  if (type === 'voiture') {
    const sp = c.createBufferSource(); sp.buffer = tamponDeBruit(c); sp.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2900; bp.Q.value = 4;
    const sif = c.createOscillator(); sif.type = 'triangle'; sif.frequency.value = 1850;
    const trem = c.createOscillator(); trem.frequency.value = 17;
    const tremG = c.createGain(); tremG.gain.value = 60;
    trem.connect(tremG).connect(sif.frequency);
    const gainSifP = c.createGain(); gainSifP.gain.value = 0.35;
    const gain = c.createGain(); gain.gain.value = 0.0001;
    sp.connect(bp).connect(gain);
    sif.connect(gainSifP).connect(gain);
    gain.connect(sortie);
    sp.start(); sif.start(); trem.start();
    pneus = { sp, sif, trem, gain };
  }
  moteur = { type, r, source, filtre, gainS, osc1, osc2, gainH, siffle, gainSif, toux, pneus,
    prochaineToux: 0, feu: null };
  moteurRegime(0);
  return true;
}

// LA VOITURE EN ENTIER (v401), appelée à chaque image depuis `sensations.js` :
// tout se règle par `setTargetAtTime` ou se PROGRAMME contre l'horloge du
// contexte audio — rien ne se crée par image, sauf une étincelle de feu
// programmée à l'avance, comme une note de radio.
//
//   regime      0..1, rapports compris (la vitesse de la voiture)
//   charge      0..1, ce que le moteur tire (l'accélération)
//   crissement  0..1, les pneus qui glissent
//   sante       0..1, le moteur abîmé tousse d'autant plus souvent
//   panne       le moteur se tait
//   feu         le crépitement des flammes
export function voitureSons({ regime = 0, charge = 0, crissement = 0, sante = 1, panne = false, feu = false } = {}) {
  if (!moteur || !ctx) return;
  moteurRegime(regime, charge);
  const t = ctx.currentTime;
  if (moteur.pneus) moteur.pneus.gain.gain.setTargetAtTime(0.0001 + 0.11 * Math.max(0, Math.min(1, crissement)), t, 0.05);
  // LA PANNE TAIT LE MOTEUR, LA TOUX LE COUPE PAR À-COUPS. Un moteur à moitié
  // mort tousse toutes les une à deux secondes ; à peine touché, presque
  // jamais. Chaque toux est une coupure de deux dixièmes, programmée.
  if (panne) {
    moteur.toux.gain.cancelScheduledValues(t);
    moteur.toux.gain.setTargetAtTime(0.0001, t, 0.12);
    moteur.enPanne = true;
  } else {
    if (moteur.enPanne) { moteur.toux.gain.cancelScheduledValues(t); moteur.toux.gain.setTargetAtTime(1, t, 0.1); moteur.enPanne = false; }
    if (sante < 0.6 && t >= moteur.prochaineToux) {
      const g = moteur.toux.gain;
      g.setValueAtTime(1, t + 0.02);
      g.linearRampToValueAtTime(0.08, t + 0.06);
      g.linearRampToValueAtTime(0.9, t + 0.18);
      g.linearRampToValueAtTime(0.15, t + 0.24);
      g.linearRampToValueAtTime(1, t + 0.4);
      const ecart = 0.5 + 3.5 * Math.max(0, sante) / 0.6;
      moteur.prochaineToux = t + ecart * (0.6 + 0.8 * Math.random());
    }
  }
  // LE FEU : un souffle grave continu et des étincelles sèches, programmées un
  // tiers de seconde d'avance. Le graphe se monte la première fois qu'il brûle.
  if (feu) {
    if (!moteur.feu) {
      const s = ctx.createBufferSource(); s.buffer = tamponDeBruit(ctx); s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
      const g = ctx.createGain(); g.gain.value = 0.0001;
      const sg = ctx.createBufferSource(); sg.buffer = tamponDeBruit(ctx); sg.loop = true;
      const fg = ctx.createBiquadFilter(); fg.type = 'lowpass'; fg.frequency.value = 220;
      const gg = ctx.createGain(); gg.gain.value = 0.0001;
      s.connect(f).connect(g).connect(sortieAudio());
      sg.connect(fg).connect(gg).connect(sortieAudio());
      s.start(); sg.start();
      moteur.feu = { s, sg, g, gg, prochain: t };
    }
    const F = moteur.feu;
    F.gg.gain.setTargetAtTime(0.09, t, 0.3);
    while (F.prochain < t + 0.33) {
      const d = Math.max(F.prochain, t + 0.01), fort = 0.06 + 0.2 * Math.random();
      F.g.gain.setValueAtTime(0.0001, d);
      F.g.gain.exponentialRampToValueAtTime(fort, d + 0.004);
      F.g.gain.exponentialRampToValueAtTime(0.0001, d + 0.03 + 0.05 * Math.random());
      F.prochain = d + 0.04 + 0.16 * Math.random();
    }
  } else if (moteur.feu) {
    moteur.feu.gg.gain.setTargetAtTime(0.0001, t, 0.3);
    moteur.feu.prochain = t;
  }
}

// LE CHOC (v401) : un coup sourd qui descend, un froissement de tôle, et pour
// un choc fort une résonance métallique. C'est un ÉVÉNEMENT, pas une image :
// il crée ses nœuds, les programme et les laisse s'éteindre, comme une note.
export function bruitDeChoc(force = 0.5) {
  const c = contexteAudio();
  if (!c) return;
  const f = Math.max(0.05, Math.min(1, force));
  const t = c.currentTime, sortie = sortieAudio();
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.25);
  const go = c.createGain();
  go.gain.setValueAtTime(0.0001, t);
  go.gain.exponentialRampToValueAtTime(0.9 * f, t + 0.008);
  go.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(go).connect(sortie);
  o.start(t); o.stop(t + 0.4);
  const s = c.createBufferSource(); s.buffer = tamponDeBruit(c);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700 + 1800 * f;
  const gs = c.createGain();
  gs.gain.setValueAtTime(0.0001, t);
  gs.gain.exponentialRampToValueAtTime(0.7 * f, t + 0.006);
  gs.gain.exponentialRampToValueAtTime(0.0001, t + 0.22 + 0.2 * f);
  s.connect(lp).connect(gs).connect(sortie);
  s.start(t); s.stop(t + 0.5);
  if (f > 0.35) {
    const m = c.createOscillator(); m.type = 'square'; m.frequency.value = 1300 + 500 * Math.random();
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 9;
    const gm = c.createGain();
    gm.gain.setValueAtTime(0.0001, t);
    gm.gain.exponentialRampToValueAtTime(0.12 * f, t + 0.01);
    gm.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    m.connect(bp).connect(gm).connect(sortie);
    m.start(t); m.stop(t + 0.55);
  }
}

// `regime` va de 0 (moteur au ralenti) à 1 (pleins gaz). Tout se fait par
// `setTargetAtTime` : l'interpolation vit dans le fil audio, et appeler cette
// fonction à chaque image ne coûte rien au fil principal.
export function moteurRegime(regime, charge = null) {
  if (!moteur || !ctx) return;
  const g = Math.max(0, Math.min(1, regime));
  // LA CHARGE (v401) : un moteur qui tire gronde, un moteur sur sa lancée
  // s'adoucit. Sans charge donnée (l'avion), on garde le dosage d'avant.
  const ch = charge == null ? null : Math.max(0, Math.min(1, charge));
  const t = ctx.currentTime, k = 0.09;
  const r = moteur.r;
  // Le régime monte la fondamentale d'une octave et demie, pas plus : au-delà
  // ce n'est plus un moteur, c'est une sirène.
  const f = r.base * (1 + 1.6 * g);
  moteur.osc1.frequency.setTargetAtTime(f, t, k);
  moteur.osc2.frequency.setTargetAtTime(f * r.harmo, t, k);
  moteur.gainH.gain.setTargetAtTime(r.gainH * (ch == null ? 0.35 + 0.65 * g : 0.3 + 0.45 * g + 0.45 * ch), t, k);
  moteur.filtre.frequency.setTargetAtTime(r.filtre * (1 + 1.1 * g), t, k);
  moteur.gainS.gain.setTargetAtTime(r.gainS * (0.4 + 0.6 * g), t, k);
  if (moteur.siffle) {
    moteur.siffle.frequency.setTargetAtTime(1200 + 1800 * g, t, k);
    moteur.gainSif.gain.setTargetAtTime(r.siffle * g * g, t, k);
  }
}

function arreterMoteur(m) {
  for (const n of [m.source, m.osc1, m.osc2, m.siffle,
    m.pneus && m.pneus.sp, m.pneus && m.pneus.sif, m.pneus && m.pneus.trem,
    m.feu && m.feu.s, m.feu && m.feu.sg]) {
    if (n) { try { n.stop(); } catch { /* déjà arrêté */ } }
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
  if (m.pneus) m.pneus.gain.gain.setTargetAtTime(0.0001, t, 0.06);
  if (m.feu) { m.feu.g.gain.cancelScheduledValues(t); m.feu.g.gain.setTargetAtTime(0.0001, t, 0.06); m.feu.gg.gain.setTargetAtTime(0.0001, t, 0.06); }
  setTimeout(() => arreterMoteur(m), 400);
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
    contexte: ctx ? ctx.state : null, actif, appel: enAppel, generation,
    moteur: moteur ? moteur.type : null,
    radio: radio ? radio.station.nom : null,
  };
}
