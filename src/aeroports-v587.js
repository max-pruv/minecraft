// LES AÉRODROMES DE LA v587, FIGÉS — la carte ×3 (session A, chantier « carte ×3 »).
//
// La carte ×3 (kmParBloc 0,1875 → 0,0625) déplace chaque aérodrome avec sa
// ville (session B, `aeroport.js`). Les mondes d'AVANT — `CONF_AVANT`,
// `CONF_V308` et `CONF_V587` (world.js) — doivent garder les aérodromes tels
// qu'ils étaient, sinon la zone à terre d'un aérodrome changerait le relief sous
// lequel un bloc d'enfant a été posé, et les marches de migration jugeraient ce
// bloc sur un monde où il n'a jamais été. Même règle que `MONDES.terreAvant` :
// cette table est la copie, au champ près, de `AEROPORTS` sur origin/main
// (938b396, v587), et ELLE NE SE MET JAMAIS À JOUR.
export const AEROPORTS_V587 = [
  {cle: "cdg", nom: "Aéroport Charles-de-Gaulle", ville: "Paris", x: -697, z: -17, r: 92, sol: 33, profil: "roissy"},
  {cle: "orly", nom: "Paris–Orly", x: -582, z: 705, r: 62, sol: 37, profil: "ville"},
  {cle: "lhr", nom: "Londres–Heathrow", x: -1410, z: -1344, r: 78, sol: 40, profil: "hub"},
  {cle: "jfk", nom: "New York–JFK", x: -19708, z: 4747, r: 84, sol: 38, profil: "hub"},
  {cle: "mad", nom: "Madrid–Barajas", x: -2409, z: 4974, r: 78, sol: 36, profil: "hub"},
  {cle: "bcn", nom: "Barcelone–El Prat", x: -677, z: 4885, r: 66, sol: 51, profil: "ville"},
  {cle: "ams", nom: "Amsterdam–Schiphol", x: 502, z: -1519, r: 74, sol: 36, profil: "hub"},
  {cle: "fra", nom: "Francfort", x: 1734, z: -1040, r: 74, sol: 41, profil: "hub"},
  {cle: "fco", nom: "Rome–Fiumicino", x: 3655, z: 3967, r: 72, sol: 33, profil: "ville"},
  {cle: "hnd", nom: "Tokyo–Haneda", x: 53019, z: 8014, r: 76, sol: 39, profil: "hub"},
  {cle: "dxb", nom: "Dubaï", x: 19742, z: 15020, r: 80, sol: 33, profil: "hub"},
  {cle: "del", nom: "Delhi–Indira-Gandhi", x: 28564, z: 12352, r: 70, sol: 47, profil: "ville"},
  {cle: "sfo", nom: "San Francisco", x: -38774, z: 7120, r: 72, sol: 44, profil: "ville"},
  {cle: "lax", nom: "Los Angeles", x: -37536, z: 9087, r: 78, sol: 38, profil: "hub"},
  {cle: "ist", nom: "Istanbul", x: 9945, z: 4500, r: 78, sol: 33, profil: "hub"},
  {cle: "sin", nom: "Singapour–Changi", x: 39562, z: 28381, r: 78, sol: 35, profil: "hub"},
  {cle: "bas-sd", nom: "Base aérienne de Saint-Dizier", x: 57, z: 472, r: 56, sol: 34, profil: "base"},
  {cle: "bas-adw", nom: "Base aérienne d'Andrews", x: -21126, z: 6381, r: 56, sol: 36, profil: "base"},
  {cle: "bas-llv", nom: "Base aérienne de Nellis", x: -37017, z: 8813, r: 56, sol: 42, profil: "base"},
  {cle: "bas-ykt", nom: "Base aérienne de Yokota", x: 52871, z: 7878, r: 56, sol: 51, profil: "base"},
];

// Les trois qui ont bougé en v306, à leur place d'avant (copie de `AVANT_V306`,
// aeroport.js) ; et ce qui est né après (Changi), absent du monde d'avant.
const AVANT_V306 = {
  cdg: { x: -250, z: -91, sol: 34 },
  orly: { x: -322, z: 504, sol: 41 },
  'bas-sd': { x: 33, z: 300, sol: 33 },
};
const NES_APRES_V306 = new Set(['sin']);
export const AEROPORTS_AVANT_V306_FIGES = AEROPORTS_V587.filter((a) => !NES_APRES_V306.has(a.cle))
  .map((a) => (AVANT_V306[a.cle] ? { ...a, ...AVANT_V306[a.cle] } : a));
