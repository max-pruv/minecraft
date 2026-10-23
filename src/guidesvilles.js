// LES GUIDES DES VILLES — Paris, Londres, Rome, New York (v535).
//
// Les panneaux de Washington (v460, `guides.js`) racontaient la ville quand
// l'enfant arrive quelque part. Ce module en donne autant aux quatre autres
// grandes villes, et c'est la MÊME règle qui les dit (`creerGuides` : une fois
// par visite, jamais en rafale, en temps réel). Ce qui change : chaque panneau
// a un GUIDE, un personnage original posé au pied du monument (`vie.js`,
// classe `Guide`), et une version anglaise.
//
// Trois règles :
//
//   - LES POSITIONS SE DEMANDENT AU REGISTRE DES REPÈRES (`REPERES`, la ville
//     par `villeDuRepere`). Recopiées ici, elles mentiraient le jour où un
//     monument bouge ; un repère introuvable retire son guide (le témoin le
//     compte).
//   - DEUX PHRASES, TROIS AU PLUS, POUR UN ENFANT DE SEPT À DIX ANS. Ce qu'on
//     regarde, et une chose qui étonne. Pas de date qu'il faudrait apprendre
//     par cœur, sauf celle qui fait l'histoire du lieu.
//   - LES FAITS SONT VÉRIFIÉS, JAMAIS INVENTÉS. Chaque phrase est un fait
//     encyclopédique courant (hauteur, année, usage) ; ce qui n'était pas
//     certain a été retiré plutôt qu'arrondi.
//
// Les rayons ne se recouvrent pas dans une même ville (le témoin le vérifie) :
// le Tower Bridge et la Tour de Londres sont à sept blocs l'un de l'autre, un
// seul des deux a donc son guide.

import { REPERES, villeDuRepere } from './world.js';
import { GUIDES_DC } from './guides.js';
import { BLOCK } from './blocks.js';

function lieu(id, ville, nom, r, guide, texte) {
  const rep = REPERES.find((l) => l.name === nom && villeDuRepere(l) === ville);
  if (!rep) return null;
  return { id, ville, repere: nom, x: rep.x, z: rep.z, r, guide, texte };
}

export const GUIDES_VILLES = [
  // --- Paris -----------------------------------------------------------------
  lieu('eiffel', 'Paris', 'Tour Eiffel', 20, 'Capucine', {
    fr: "🗼 La tour Eiffel a été construite pour l'Exposition universelle de 1889. Elle mesure environ 330 mètres, et on la repeint à peu près tous les sept ans.",
    en: '🗼 The Eiffel Tower was built for the World’s Fair of 1889. It is about 330 meters tall, and it gets a new coat of paint about every seven years.',
  }),
  lieu('arc', 'Paris', 'Arc de Triomphe', 18, 'Léon', {
    fr: "🏛️ Napoléon a commandé l'Arc de Triomphe en 1806. Sous l'arc repose le Soldat inconnu : on y rallume une flamme chaque soir.",
    en: '🏛️ Napoleon ordered the Arc de Triomphe in 1806. The Unknown Soldier rests under the arch: a flame is lit again there every evening.',
  }),
  lieu('louvre', 'Paris', 'Pyramide du Louvre', 16, 'Margaux', {
    fr: "🔺 Le Louvre était le palais des rois avant de devenir un musée en 1793. La pyramide de verre a été ajoutée en 1989. La Joconde est exposée à l'intérieur.",
    en: '🔺 The Louvre was a palace of the kings before it became a museum in 1793. The glass pyramid was added in 1989. The Mona Lisa is inside.',
  }),
  lieu('notredame', 'Paris', 'Notre-Dame', 16, 'Anatole', {
    fr: "⛪ On a commencé à bâtir Notre-Dame en 1163, et le chantier a duré près de deux siècles. Abîmée par un incendie en 2019, elle a rouvert en décembre 2024.",
    en: '⛪ Work on Notre-Dame began in 1163 and took almost two hundred years. Damaged by a fire in 2019, it opened again in December 2024.',
  }),
  lieu('sacrecoeur', 'Paris', 'Sacré-Cœur', 22, 'Rose', {
    fr: '⛪ Le Sacré-Cœur est sur la butte Montmartre, le point le plus haut de Paris. Sa pierre devient plus blanche quand il pleut.',
    en: '⛪ The Sacré-Cœur stands on the hill of Montmartre, the highest point in Paris. Its stone gets whiter when it rains.',
  }),

  // --- Londres ---------------------------------------------------------------
  lieu('bigben', 'Londres', 'Big Ben', 14, 'Wilfred', {
    fr: "🔔 Big Ben, c'est le nom de la grosse cloche, pas de la tour ! La tour s'appelle Elizabeth Tower depuis 2012.",
    en: '🔔 Big Ben is the name of the great bell, not of the tower! The tower has been called the Elizabeth Tower since 2012.',
  }),
  lieu('buckingham', 'Londres', 'Buckingham Palace', 14, 'Poppy', {
    fr: '👑 Buckingham Palace est la maison du roi à Londres. Quand le drapeau royal flotte sur le toit, cela veut dire que le roi est là.',
    en: '👑 Buckingham Palace is the King’s home in London. When the royal flag flies on the roof, it means the King is there.',
  }),
  lieu('stpaul', 'Londres', 'Cathédrale St Paul', 14, 'Arthur', {
    fr: "⛪ La cathédrale Saint-Paul a été rebâtie après le grand incendie de Londres de 1666. Dans la galerie de sa coupole, un murmure contre le mur s'entend de l'autre côté.",
    en: '⛪ St Paul’s Cathedral was rebuilt after the Great Fire of London in 1666. In the gallery of its dome, a whisper against the wall can be heard on the other side.',
  }),
  lieu('towerbridge', 'Londres', 'Tower Bridge', 16, 'Ivy', {
    fr: "🌉 Tower Bridge a ouvert en 1894. Ses deux moitiés se lèvent pour laisser passer les grands bateaux sur la Tamise.",
    en: '🌉 Tower Bridge opened in 1894. Its two halves lift up to let big ships pass on the River Thames.',
  }),

  // --- Rome ------------------------------------------------------------------
  lieu('colisee', 'Rome', 'Colisée', 24, 'Livia', {
    fr: "🏟️ Le Colisée a été inauguré en l'an 80. Environ 50 000 spectateurs pouvaient y regarder les combats de gladiateurs.",
    en: '🏟️ The Colosseum opened in the year 80. About 50,000 people could watch the gladiator fights there.',
  }),
  lieu('pantheon', 'Rome', 'Panthéon', 14, 'Marco', {
    fr: "🏛️ Le Panthéon a presque 1 900 ans. Sa coupole a un trou rond au sommet, l'oculus : quand il pleut, la pluie tombe à l'intérieur.",
    en: '🏛️ The Pantheon is almost 1,900 years old. Its dome has a round hole at the top, the oculus: when it rains, the rain falls inside.',
  }),
  lieu('stpierre', 'Rome', 'Basilique St-Pierre', 18, 'Giulia', {
    fr: '⛪ La basilique Saint-Pierre est au Vatican, le plus petit pays du monde. Michel-Ange a dessiné sa grande coupole.',
    en: '⛪ St Peter’s Basilica is in Vatican City, the smallest country in the world. Michelangelo designed its great dome.',
  }),

  // --- New York --------------------------------------------------------------
  lieu('empire', 'New York', 'Empire State', 14, 'Jasmine', {
    fr: "🏙️ L'Empire State Building a été construit en un peu plus d'un an et terminé en 1931. Pendant près de quarante ans, ce fut le plus haut gratte-ciel du monde.",
    en: '🏙️ The Empire State Building was built in just over a year and finished in 1931. For almost forty years it was the tallest skyscraper in the world.',
  }),
  lieu('timessquare', 'New York', 'Times Square', 16, 'Theo', {
    fr: '✨ Times Square porte le nom du journal The New York Times. Chaque 31 décembre, une grosse boule lumineuse y descend pour fêter la nouvelle année.',
    en: '✨ Times Square is named after the New York Times newspaper. Every December 31st, a big glowing ball comes down there to welcome the new year.',
  }),
  lieu('wtc', 'New York', 'One World Trade Center', 16, 'Maya', {
    fr: "🗽 One World Trade Center mesure 1 776 pieds, environ 541 mètres. Ce nombre rappelle 1776, l'année de l'indépendance des États-Unis.",
    en: '🗽 One World Trade Center is 1,776 feet tall, about 541 meters. The number recalls 1776, the year the United States declared independence.',
  }),
].filter(Boolean);

// Tous les guides du monde : ceux de Washington (v460) d'abord, puis les autres.
export const TOUS_LES_GUIDES = [...GUIDES_DC, ...GUIDES_VILLES];

// OÙ POSER LE GUIDE : la colonne praticable la plus proche du monument, au
// niveau de la rue (pas sur un toit, pas dans l'eau), à l'intérieur du rayon du
// panneau — sinon on le verrait sans que le panneau passe. Pure : `essai(x, z)`
// rend la cote où l'on pose le pied, ou null, pour se rejouer sous node.
export function posteDuGuide(lieu, essai) {
  const bx = Math.floor(lieu.x), bz = Math.floor(lieu.z);
  const max = Math.max(2, Math.floor(lieu.r) - 2);
  for (let r = 2; r <= max; r++) {
    let meilleur = null;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const d = Math.hypot(dx, dz);
      if (d > lieu.r - 1.5) continue;
      const y = essai(bx + dx, bz + dz);
      if (y === null || y === undefined) continue;
      if (!meilleur || d < meilleur.d) meilleur = { x: bx + dx + 0.5, z: bz + dz + 0.5, y, d };
    }
    if (meilleur) return meilleur;
  }
  return null;
}

// Une colonne de blocs est praticable si son premier bloc plein est au niveau
// du relief (deux blocs de marge : un trottoir, une marche), sec, et À CIEL
// OUVERT. Un toit, un trou, l'eau : non. Et pas sous une voûte : le centre d'un
// monument est souvent creux (la rotonde du Capitole, la nef de Notre-Dame, le
// dessous de la tour Eiffel), et un guide posé dedans parlerait sans qu'on le
// voie — mesuré au premier jet, douze guides sur dix-neuf à deux blocs du centre.
export const CIEL = 64;   // blocs d'air au-dessus du guide : rien ne le couvre

export function essaiParBlocs(lire, sol, estSolide, interdit = null) {
  return (x, z) => {
    const h = sol(x, z);
    let y = h + 6;
    while (y > h - 4 && !estSolide(lire(x, y, z))) y--;
    if (y < h - 1 || y > h + 2) return null;
    // Jamais sur la chaussée : un guide est un piéton pour la rue, et une
    // voiture attend sans limite devant un piéton (v395) — un guide posé sur
    // l'asphalte arrêtait une file pour toujours (mesuré : quatre sur dix-neuf,
    // dont Capucine à la tour Eiffel).
    if (interdit && interdit(lire(x, y, z))) return null;
    for (let k = 1; k <= CIEL; k++) if (lire(x, y + k, z) !== BLOCK.AIR) return null;
    return y + 1;
  };
}

