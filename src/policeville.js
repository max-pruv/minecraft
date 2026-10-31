// LA POLICE DE CHAQUE VILLE (v576). Max : « certaines voitures sont
// américaines, allemandes, etc. — c'est utile pour rendre les villes un peu
// différentes, et créer des expériences qui ont du sens ». Une voiture de la
// NYPD à New York, une Polizei bleue et argent à Berlin, une Battenburg jaune
// et bleue à Manchester, la Met à Londres.
//
// Pur et sans import (lu sous node par les témoins) : une FAMILLE par ville,
// et la voiture déclare dans sa fiche de FLOTTE les familles qu'elle sert
// (`polices`, vehicules.js) — jamais une liste de fichiers ici. Une ville qui
// n'a pas de famille, et la campagne loin de toute ville, prennent `monde` :
// les voitures d'avant la v576, dans le même ordre (la Crown Victoria d'abord).

export const FAMILLE_DEFAUT = 'monde';

// La ville la plus proche décide, tant qu'on est à moins de son rayon plus
// cette marge (en blocs : à 0,1875 km par bloc, ≈ 225 km) — la banlieue et la
// route qui en sort sont encore à elle.
export const MARGE_VILLE = 1200;

export const FAMILLES_POLICE = {
  // la NYPD, et elle seule, à New York
  nypd: ['ny'],
  // la côte Ouest et les Rocheuses : la noir et blanc de Los Angeles, et les
  // shérifs de comté
  ouest: ['losangeles', 'sf', 'sandiego', 'lasvegas', 'phoenix', 'portland', 'seattle', 'saltlake', 'denver', 'honolulu'],
  // le reste des États-Unis
  usa: ['washington', 'chicago', 'gigatexas', 'miami', 'boston', 'atlanta', 'houston', 'dallas', 'nouvelleorleans',
    'minneapolis', 'detroit', 'nashville', 'orlando'],
  // la Metropolitan Police : argent, bande orange et bleue
  londres: ['londres'],
  // le reste du Royaume-Uni : le damier Battenburg (Heddlu, la police
  // galloise, sur la berline — Cardiff en est)
  gb: ['manchester', 'liverpool', 'birmingham', 'leeds', 'newcastle', 'glasgow', 'edimbourg', 'belfast', 'cardiff'],
  // la Polizei : bleu et argent
  allemagne: ['berlin', 'munich', 'hambourg', 'cologne', 'francfort', 'stuttgart', 'dresde', 'leipzig'],
};

const PAR_VILLE = new Map();
for (const [f, villes] of Object.entries(FAMILLES_POLICE)) for (const v of villes) PAR_VILLE.set(v, f);

export function familleDeVille(cle) {
  return PAR_VILLE.get(cle) || FAMILLE_DEFAUT;
}

// la ville qui décide en (x, z), parmi des lieux { cle, x, z, r } — ou null
export function villeDePolice(x, z, lieux) {
  let best = null, bd = Infinity;
  for (const l of lieux) {
    const d = Math.hypot(x - l.x, z - l.z) - (l.r || 0);
    if (d < bd) { bd = d; best = l; }
  }
  return best && bd < MARGE_VILLE ? best : null;
}

export function familleEn(x, z, lieux) {
  const v = villeDePolice(x, z, lieux);
  return v ? familleDeVille(v.cle) : FAMILLE_DEFAUT;
}

// les fichiers d'une famille, dans l'ordre de la flotte ; une famille sans
// voiture retombe sur `monde`
export function voituresDeFamille(famille, flotte) {
  const de = (f) => flotte.filter((e) => e.police && (e.polices || [FAMILLE_DEFAUT]).includes(f)).map((e) => e.fichier);
  const l = de(famille);
  return l.length ? l : de(FAMILLE_DEFAUT);
}
