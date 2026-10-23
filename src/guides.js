// LES GUIDES DE WASHINGTON — un panneau à lire sur place (v460).
//
// Ce que la ville raconte vivait dans les commentaires de `washington.js` :
// pourquoi les avenues coupent la grille en diagonale, pourquoi la ville est
// basse, d'où viennent les cerisiers, pourquoi Georgetown n'a pas de métro.
// Un enfant de sept ans ne lit pas le code. Il lit un bandeau qui s'affiche
// quand il ARRIVE quelque part.
//
// Trois règles, et les trois se mesurent (tests/washington.js) :
//
//   - UNE FOIS PAR VISITE. On entre dans le rayon d'un lieu : le panneau passe.
//     On tourne autour, on revient sur ses pas : il ne repasse pas. Il faut
//     s'éloigner franchement (`SORTIE` blocs au-delà du rayon) pour qu'une
//     prochaine visite le rouvre — sans cette marge, un enfant au bord du rayon
//     le verrait clignoter à chaque pas.
//   - JAMAIS EN RAFALE. Deux lieux proches ne parlent pas en même temps : un
//     panneau attend que le précédent ait été lu (`ESPACEMENT_MS`). Celui qui
//     attend n'est pas perdu : il passe dès que la place est libre, si l'enfant
//     est encore là.
//   - EN TEMPS RÉEL. La lecture d'un panneau dure des secondes de vraie vie,
//     pas des secondes de jeu (piège de `dt`, v226) : l'horloge est
//     `performance.now()`, injectée pour que la règle se rejoue sous node.
//
// Les faits sont vérifiés ; aucun chiffre n'est inventé. Les positions se
// DEMANDENT à `washington.js` (monuments, places, quartiers) : recopiées ici,
// elles mentiraient le jour où un monument bouge.

import { WASHINGTON, MONUMENTS_DC, CERCLES, lieuxDeWashington } from './washington.js';

export const ESPACEMENT_MS = 9000;   // un panneau se lit en ~7 s ; on laisse la place
export const DUREE_PANNEAU_MS = 7000;
export const SORTIE = 12;            // blocs au-delà du rayon pour clore une visite
const CADENCE_MS = 250;              // une cadence de ménage, en temps réel

const monument = (nom) => MONUMENTS_DC.find((m) => m.nom === nom);
const cercle = (nom) => CERCLES.find((c) => c.nom === nom);

function lieu(id, src, r, texte, guide) {
  if (!src) return null;
  return { id, ville: 'Washington', x: WASHINGTON.x + src.u, z: WASHINGTON.z + src.v, r, texte, guide };
}

const georgetown = () => {
  const q = lieuxDeWashington().find((l) => l.name === 'Georgetown');
  return q ? { u: q.x - WASHINGTON.x, v: q.z - WASHINGTON.z } : null;
};

// Les rayons couvrent l'emprise du lieu et un peu de parvis ; deux rayons
// voisins ne se recouvrent pas (vérifié par le témoin). Depuis la v533 chaque
// panneau a sa version anglaise (la famille est franco-américaine, et le
// profil a une langue : 'fr', 'en' ou 'both') et un guide qui le raconte.
export const GUIDES_DC = [
  lieu('capitole', monument('Capitole des États-Unis'), 30, {
    fr: "🏛️ Le Capitole : ici, le Congrès vote les lois des États-Unis. Une loi de 1910 limite la hauteur des immeubles : c'est pour ça que la ville est si basse.",
    en: "🏛️ The Capitol: this is where Congress votes on the laws of the United States. A law from 1910 limits how tall buildings can be: that's why the city is so low.",
  }, 'Abigail'),
  lieu('obelisque', monument('Monument de Washington'), 15, {
    fr: "🗼 L'obélisque de Washington mesure 169 mètres. Regarde sa pierre : elle change de couleur, car le chantier s'est arrêté plus de vingt ans.",
    en: '🗼 The Washington Monument is 169 meters tall. Look at its stone: the color changes, because the building work stopped for more than twenty years.',
  }, 'Samuel'),
  lieu('lincoln', monument('Lincoln Memorial'), 18, {
    fr: "🪑 Abraham Lincoln, assis, mesure presque 6 mètres. Il a fait abolir l'esclavage. Les 36 colonnes : une par État du pays en 1865.",
    en: '🪑 Seated Abraham Lincoln is almost 6 meters tall. He ended slavery. The 36 columns: one for each state of the country in 1865.',
  }, 'Grace'),
  lieu('cerisiers', monument('Mémorial Jefferson'), 20, {
    fr: '🌸 Les cerisiers autour du bassin sont un cadeau du Japon : la ville de Tokyo les a offerts en 1912.',
    en: '🌸 The cherry trees around the basin were a gift from Japan: the city of Tokyo gave them in 1912.',
  }, 'Henry'),
  lieu('maisonBlanche', monument('Maison-Blanche'), 20, {
    fr: '🏠 La Maison-Blanche : le président des États-Unis y habite et y travaille.',
    en: '🏠 The White House: the President of the United States lives and works here.',
  }, 'Clara'),
  lieu('lenfant', cercle('Dupont Circle'), 14, {
    fr: "🧭 Un Français, Pierre L'Enfant, a dessiné Washington en 1791. Ses avenues en diagonale relient les places entre elles.",
    en: "🧭 A Frenchman, Pierre L'Enfant, drew the plan of Washington in 1791. His diagonal avenues link the squares together.",
  }, 'Owen'),
  lieu('georgetown', georgetown(), 26, {
    fr: "🚇 Georgetown n'a pas de station de métro : au bord du fleuve, la colline obligeait à creuser beaucoup trop profond.",
    en: '🚇 Georgetown has no metro station: next to the river, the hill would have meant digging much too deep.',
  }, 'Ruth'),
].filter(Boolean);

// LA LANGUE DU PANNEAU (v533). `fr`, `en`, ou `both` — le réglage du profil,
// le même que celui du quiz. En `both`, les panneaux alternent d'une visite à
// l'autre : deux langues dans un même bandeau feraient six phrases, trop pour
// un enfant qui lit en marchant. Un texte écrit en une seule chaîne (un lieu
// d'avant la v533) se dit tel quel dans les deux langues.
export function langueDuGuide(langue, rang = 0) {
  return langue === 'en' ? 'en' : langue === 'fr' ? 'fr' : (rang % 2 ? 'en' : 'fr');
}

export function texteDuGuide(g, langue, rang = 0) {
  const t = g.texte;
  const l = langueDuGuide(langue, rang);
  const corps = typeof t === 'string' ? t : (t[l] || t.fr);
  if (!g.guide) return corps;
  const ou = g.ville || '';
  return l === 'en' ? `${corps} — ${g.guide}, ${ou} guide` : `${corps} — ${g.guide}, guide de ${ou}`;
}

// La règle, pure : `dire(texte, lieu)` affiche, `langue()` rend la langue du
// profil, `maintenant()` rend des millisecondes
// de vraie vie. `update(x, z)` peut être appelé à chaque image ; il ne
// travaille qu'au rythme de `CADENCE_MS`.
export function creerGuides({ dire, maintenant, guides = GUIDES_DC, langue = () => 'fr' } = {}) {
  const vus = new Set();       // lieux dont la visite est en cours (panneau déjà passé)
  let dernier = -Infinity;     // quand le dernier panneau est passé
  let prochainTour = -Infinity;
  const journal = [];          // ce qui a été dit, pour les témoins

  function update(x, z) {
    const t = maintenant();
    if (t < prochainTour) return;
    prochainTour = t + CADENCE_MS;
    let candidat = null, dCand = Infinity;
    for (const g of guides) {
      const d = Math.hypot(x - g.x, z - g.z);
      if (d > g.r + SORTIE) { vus.delete(g.id); continue; }   // la visite est finie
      if (d <= g.r && !vus.has(g.id) && d < dCand) { candidat = g; dCand = d; }
    }
    if (!candidat || t - dernier < ESPACEMENT_MS) return;
    vus.add(candidat.id);
    dernier = t;
    const l = langueDuGuide(langue(), journal.length);
    const texte = texteDuGuide(candidat, l, journal.length);
    journal.push({ id: candidat.id, t, texte, langue: l });
    dire(texte, candidat, l);
  }

  return { update, journal, guides };
}

// LE GUIDE PARLE, IL N'ÉCRIT PAS (v504, Max : « tu vires tous ces messages-là »).
// Plus rien ne s'affiche pendant le jeu ; le panneau passe donc par la voix du
// navigateur, dans la langue du panneau, et seulement si le son du jeu est
// allumé (c'est l'appelant qui le demande à `sons.js`). Les pictogrammes ne se
// lisent pas ; le tiret de la signature devient une pause. Un appareil sans
// synthèse vocale ne dit rien : le panneau se compte quand même.
export function phraseAParler(texte) {
  return String(texte)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/([.!?…])?\s+—\s+/g, (m, f) => (f ? `${f} ` : '. '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function parlerAVoixHaute(texte, langue, synth = globalThis.speechSynthesis,
  Enonce = globalThis.SpeechSynthesisUtterance) {
  if (!synth || typeof Enonce !== 'function') return null;
  const u = new Enonce(phraseAParler(texte));
  const code = langue === 'en' ? 'en-US' : 'fr-FR';
  u.lang = code;
  const voix = (typeof synth.getVoices === 'function' ? synth.getVoices() : []) || [];
  const v = voix.find((x) => x.lang === code) || voix.find((x) => (x.lang || '').startsWith(code.slice(0, 2)));
  if (v) u.voice = v;
  u.rate = 0.95;           // un enfant de sept ans écoute en marchant
  try { synth.cancel?.(); synth.speak(u); } catch (e) { return null; }
  return u;
}
