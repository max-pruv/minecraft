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

function lieu(id, src, r, texte) {
  if (!src) return null;
  return { id, x: WASHINGTON.x + src.u, z: WASHINGTON.z + src.v, r, texte };
}

const georgetown = () => {
  const q = lieuxDeWashington().find((l) => l.name === 'Georgetown');
  return q ? { u: q.x - WASHINGTON.x, v: q.z - WASHINGTON.z } : null;
};

// Les rayons couvrent l'emprise du lieu et un peu de parvis ; deux rayons
// voisins ne se recouvrent pas (vérifié par le témoin).
export const GUIDES_DC = [
  lieu('capitole', monument('Capitole des États-Unis'), 30,
    "🏛️ Le Capitole : ici, le Congrès vote les lois des États-Unis. Une loi de 1910 limite la hauteur des immeubles : c'est pour ça que la ville est si basse."),
  lieu('obelisque', monument('Monument de Washington'), 15,
    "🗼 L'obélisque de Washington mesure 169 mètres. Regarde sa pierre : elle change de couleur, car le chantier s'est arrêté plus de vingt ans."),
  lieu('lincoln', monument('Lincoln Memorial'), 18,
    "🪑 Abraham Lincoln, assis, mesure presque 6 mètres. Il a fait abolir l'esclavage. Les 36 colonnes : une par État du pays en 1865."),
  lieu('cerisiers', monument('Mémorial Jefferson'), 20,
    '🌸 Les cerisiers autour du bassin sont un cadeau du Japon : la ville de Tokyo les a offerts en 1912.'),
  lieu('maisonBlanche', monument('Maison-Blanche'), 20,
    '🏠 La Maison-Blanche : le président des États-Unis y habite et y travaille.'),
  lieu('lenfant', cercle('Dupont Circle'), 14,
    "🧭 Un Français, Pierre L'Enfant, a dessiné Washington en 1791. Ses avenues en diagonale relient les places entre elles."),
  lieu('georgetown', georgetown(), 26,
    "🚇 Georgetown n'a pas de station de métro : au bord du fleuve, la colline obligeait à creuser beaucoup trop profond."),
].filter(Boolean);

// La règle, pure : `dire(texte)` affiche, `maintenant()` rend des millisecondes
// de vraie vie. `update(x, z)` peut être appelé à chaque image ; il ne
// travaille qu'au rythme de `CADENCE_MS`.
export function creerGuides({ dire, maintenant, guides = GUIDES_DC } = {}) {
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
    journal.push({ id: candidat.id, t });
    dire(candidat.texte);
  }

  return { update, journal, guides };
}
