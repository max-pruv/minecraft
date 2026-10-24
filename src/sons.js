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

import { STATIONS, programme, evenements, dureePas, pasDuMorceau, titreEnCours, stationSuivante } from './radio.js';

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
  const station = radio ? radio.indice : -1;
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
  // LE ROULEMENT (v541) : ce que les roues font entendre de la ROUTE. Sur
  // l'asphalte, rien ; sur l'herbe, le gravier, le sable, un grondement
  // sourd qui monte avec la vitesse — du bruit rose passé bas, séparé du
  // souffle du moteur pour qu'une voiture au ralenti dans un champ se taise.
  let roulement = null;
  if (type === 'voiture') {
    const sr = c.createBufferSource(); sr.buffer = tamponDeBruit(c); sr.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240; lp.Q.value = 0.9;
    const gr = c.createGain(); gr.gain.value = 0.0001;
    sr.connect(lp).connect(gr).connect(sortie);
    sr.start();
    roulement = { sr, lp, gain: gr };
  }
  moteur = { type, r, source, filtre, gainS, osc1, osc2, gainH, siffle, gainSif, toux, pneus, roulement,
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
//   roulement   0..1, le grondement de la route sous les roues (v541) —
//               déjà mis à l'échelle de la vitesse par celui qui appelle
export function voitureSons({ regime = 0, charge = 0, crissement = 0, sante = 1, panne = false, feu = false, roulement = 0 } = {}) {
  if (!moteur || !ctx) return;
  moteurRegime(regime, charge);
  const t = ctx.currentTime;
  if (moteur.pneus) moteur.pneus.gain.gain.setTargetAtTime(0.0001 + 0.11 * Math.max(0, Math.min(1, crissement)), t, 0.05);
  if (moteur.roulement) {
    const r = Math.max(0, Math.min(1, roulement));
    moteur.roulement.gain.gain.setTargetAtTime(0.0001 + 0.5 * r, t, 0.08);
    moteur.roulement.lp.frequency.setTargetAtTime(180 + 260 * r, t, 0.08);
  }
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
    m.pneus && m.pneus.sp, m.pneus && m.pneus.sif, m.pneus && m.pneus.trem, m.roulement && m.roulement.sr,
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
  if (m.roulement) m.roulement.gain.gain.setTargetAtTime(0.0001, t, 0.06);
  if (m.feu) { m.feu.g.gain.cancelScheduledValues(t); m.feu.g.gain.setTargetAtTime(0.0001, t, 0.06); m.feu.gg.gain.setTargetAtTime(0.0001, t, 0.06); }
  setTimeout(() => arreterMoteur(m), 400);
}

// --- la radio ----------------------------------------------------------------

// LE PROGRAMME VIT DANS `radio.js` (v541), pur : cinq stations, trois morceaux
// chacune, un jingle devant chaque morceau, et une horloge — `programme(st,
// t)` dit où en est la station à l'heure réelle `t`, comme une vraie radio
// qui joue même quand on ne l'écoute pas. Ici on ne fait que JOUER ce que le
// programme dit, contre l'horloge du contexte audio. Invariant 4 : les airs
// sont écrits dans le dépôt, rien n'appartient à personne.
export { STATIONS };

let radio = null;   // { station, indice, gain, prochain, morceau, pas, minuteur }
// LA STATION CHOISIE SE GARDE pour la prochaine voiture, sur cette tablette
// (`mémoire`, posée par `radioChoisir`) ; `null`, c'est la radio éteinte,
// qui se garde aussi — qui a coupé la musique ne veut pas qu'elle revienne
// à la portière suivante. Avant tout choix : une station au hasard.
let memoire;        // undefined : jamais choisi ; null : éteinte ; n : station

function radioAllumer(indice) {
  const c = contexteAudio();
  if (!c) return null;
  radioCoupe();
  const station = STATIONS[((indice % STATIONS.length) + STATIONS.length) % STATIONS.length];
  const gain = c.createGain();
  gain.gain.value = 0.0001;
  gain.connect(sortieAudio());
  gain.gain.setTargetAtTime(0.65, c.currentTime + 0.25, 0.25);
  // là où en est la station à cette heure-ci : on tombe DANS un morceau, pas
  // à son début — sauf au jingle, qu'on laisse finir
  const p = programme(station, Date.now() / 1000);
  radio = { station, indice: STATIONS.indexOf(station), gain, prochain: c.currentTime + 0.3, morceau: p.morceau, pas: p.pas, minuteur: null };
  grésillement(c, gain);
  // L'ORDONNANCEUR REGARDE L'HORLOGE DU SON, PAS CELLE DE L'ÉCRAN. Il
  // programme un quart de seconde d'avance toutes les cent millisecondes :
  // même si le fil principal saute une demi-seconde (ce qu'il fait en
  // arrivant dans une ville, mesuré en v266), la musique ne bégaie pas.
  radio.minuteur = setInterval(() => avancerRadio(), 100);
  avancerRadio();
  return station.nom;
}

// À la montée : la station gardée, ou une au hasard la première fois ; rien
// si la radio a été éteinte exprès.
export function radioDemarre(indice = null) {
  if (indice == null) {
    if (memoire === null) return null;
    indice = memoire == null ? Math.floor(Math.random() * STATIONS.length) : memoire;
  }
  return radioAllumer(indice);
}
// LE BOUTON DE LA RADIO : la station suivante, et le silence après la
// dernière (`stationSuivante`, radio.js). Rend le nom de la station, ou null.
export function radioChoisir(indice) {
  memoire = indice == null ? null : ((indice % STATIONS.length) + STATIONS.length) % STATIONS.length;
  if (memoire == null) { radioCoupe(); return null; }
  return radioAllumer(memoire);
}
export function radioSuivante() { return radioChoisir(stationSuivante(radio ? radio.indice : null)); }
export function radioIndice() { return radio ? radio.indice : null; }
export function radioMemoire() { return memoire; }
export function radioRestaurer(m) { memoire = m === null || m === undefined ? m : (Number.isInteger(m) && m >= 0 && m < STATIONS.length ? m : undefined); }
export function radioTitre() { return radio ? titreEnCours(radio.station, radio.morceau) : null; }

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

// La batterie : la grosse caisse est un souffle grave, le charleston un
// souffle aigu très court, la caisse claire (v541) un souffle du milieu, un
// peu plus long — c'est elle qui fait le « boum-tchak ».
function percussion(c, sortie, debut, quoi) {
  const s = c.createBufferSource();
  s.buffer = tamponDeBruit(c);
  const f = c.createBiquadFilter();
  if (quoi === 'grosse') { f.type = 'lowpass'; f.frequency.value = 160; }
  else if (quoi === 'caisse') { f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8; }
  else { f.type = 'highpass'; f.frequency.value = 5000; }
  const g = c.createGain();
  g.gain.setValueAtTime(quoi === 'grosse' ? 0.34 : quoi === 'caisse' ? 0.22 : 0.10, debut);
  g.gain.exponentialRampToValueAtTime(0.0001, debut + (quoi === 'grosse' ? 0.16 : quoi === 'caisse' ? 0.11 : 0.06));
  s.connect(f).connect(g).connect(sortie);
  s.start(debut); s.stop(debut + 0.2);
}

function avancerRadio() {
  if (!radio || !ctx) return;
  const c = ctx, st = radio.station;
  const croche = dureePas(st);
  while (radio.prochain < c.currentTime + 0.25) {
    const t = radio.prochain;
    for (const e of evenements(st, radio.morceau, radio.pas)) {
      if (e.quoi === 'grosse' || e.quoi === 'caisse' || e.quoi === 'charley') percussion(c, radio.gain, t, e.quoi);
      else note(c, radio.gain, e.note, t, croche * e.duree, e.quoi === 'basse' ? 'triangle' : st.onde, e.volume);
    }
    radio.prochain += croche;
    radio.pas++;
    if (radio.pas >= pasDuMorceau(st.morceaux[radio.morceau])) { radio.pas = 0; radio.morceau = (radio.morceau + 1) % st.morceaux.length; }
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

// --- le klaxon ----------------------------------------------------------------

// LE KLAXON (v541). Deux tons tenus — une tierce, comme un vrai avertisseur
// de voiture —, des dents de scie passées dans un filtre résonant autour du
// kilohertz, qui leur donne le nasillement du cornet. Tenu tant que le doigt
// est sur le bouton (`klaxonTenir(true)`), coupé en soixante millisecondes
// au lâcher. Un seul graphe, monté au premier appui, réglé par ses gains.
let klaxon = null;   // { o1, o2, gain, tenu }
export const KLAXON_HZ = [392, 494];      // sol 4, si 4
function monterKlaxon(c, ton = 1) {
  const g = c.createGain(); g.gain.value = 0.0001;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1050 * ton; f.Q.value = 1.4;
  const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = KLAXON_HZ[0] * ton;
  const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = KLAXON_HZ[1] * ton;
  o1.connect(f); o2.connect(f); f.connect(g);
  o1.start(); o2.start();
  return { o1, o2, gain: g };
}
export function klaxonTenir(oui) {
  const c = contexteAudio();
  if (!c) return false;
  if (oui) {
    if (!klaxon) { klaxon = { ...monterKlaxon(c), tenu: true }; klaxon.gain.connect(sortieAudio()); }
    klaxon.tenu = true;
    klaxon.gain.gain.cancelScheduledValues(c.currentTime);
    klaxon.gain.gain.setTargetAtTime(0.22, c.currentTime, 0.015);
    return true;
  }
  if (!klaxon) return false;
  klaxon.tenu = false;
  klaxon.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.04);
  return true;
}
export const klaxonTenu = () => !!(klaxon && klaxon.tenu);

// LE KLAXON D'UNE VOITURE DE LA RUE (v541) : un coup bref, placé dans
// l'espace — plus loin, plus doux ; à gauche ou à droite de l'enfant
// (`pan`, −1 à 1, calculé par celui qui sait où est l'enfant et où il
// regarde). Chaque voiture a son ton (`ton`, autour de 1) : deux klaxons ne
// se ressemblent pas. C'est un ÉVÉNEMENT, comme une note : il monte ses
// nœuds, les programme, les laisse s'éteindre.
let klaxonsRue = 0;
export function klaxonRue({ distance = 10, pan = 0, ton = 1, duree = 0.45 } = {}) {
  const c = contexteAudio();
  if (!c) return false;
  const t = c.currentTime;
  const k = monterKlaxon(c, ton);
  const vol = 0.2 / (1 + distance / 16) ** 2;
  let sortie = sortieAudio();
  if (c.createStereoPanner) {
    const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(sortie); sortie = p;
  }
  k.gain.connect(sortie);
  k.gain.gain.setValueAtTime(0.0001, t);
  k.gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.02);
  k.gain.gain.setValueAtTime(Math.max(0.001, vol), t + duree);
  k.gain.gain.exponentialRampToValueAtTime(0.0001, t + duree + 0.06);
  k.o1.stop(t + duree + 0.1); k.o2.stop(t + duree + 0.1);
  klaxonsRue++;
  return true;
}
export const klaxonsRueJoues = () => klaxonsRue;

// Ce qu'une sonde peut lire — et ce n'est PAS ce qu'un témoin doit croire :
// un témoin de son lit des ÉCHANTILLONS (voir `tests/monte.js`), jamais ce
// drapeau. Il sert à la mise au point et aux captures.
export function etatSon() {
  return {
    contexte: ctx ? ctx.state : null, actif, appel: enAppel, generation,
    moteur: moteur ? moteur.type : null,
    radio: radio ? radio.station.nom : null,
    titre: radio ? titreEnCours(radio.station, radio.morceau) : null,
    klaxon: klaxonTenu(), klaxonGain: klaxon ? +klaxon.gain.gain.value.toFixed(4) : null, klaxonsRue,
  };
}
