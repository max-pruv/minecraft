// LA CADENCE DU BANC SUR LES MINUTERIES DU JEU (v482).
//
// Le portail passait des minutes à attendre des minuteries de production : le
// battement de vingt secondes qui republie les réglages, la relève de quinze.
// Un témoin qui prouve « au battement suivant, l'autre tablette ne défait pas
// le choix » n'a pas besoin de vingt vraies secondes — il a besoin que le jeu
// et le témoin parlent du même délai. `?tempo=4` les divise par quatre, des
// deux côtés (`banc.fixerTempo`, `banc.enTempo`).
//
// TROIS RÈGLES, ET LA PREMIÈRE EST CELLE QUI REND LE MODULE SÛR.
//
// - EN PRODUCTION, `t(ms)` REND `ms` AU BIT PRÈS. Le tempo ne se lit que sur
//   127.0.0.1 ou localhost, et seulement s'il ACCÉLÈRE (un entier de 2 à 8) :
//   une adresse partagée avec `?tempo=4` ne change rien chez un enfant. Le
//   témoin sous node de `reglages.js` relit chaque cadence à l'échelle réelle.
// - UNE CADENCE PASSE SOUS TEMPO ; UNE FENÊTRE CALÉE SUR LE MONDE, NON. Le
//   battement des réglages, la republication, la relève du temps de jeu se
//   divisent. Ce qui borne une opération réseau (ouvrir une session, une
//   présentation, une sonde du nuage) ou qui tolère une durée de TRAVAIL réelle
//   reste réel — le réseau et le processeur du banc ne vont pas plus vite à
//   tempo 4. Le silence toléré de `net.js` en est le cas mesuré : un pair du
//   nuage n'a pas de canal à sonder, et une page qui charge son monde se tait
//   des secondes. À `STALE_MS` divisé par quatre, deux tablettes sans courtier
//   ne se retrouvaient plus (0 couple sur 4, 4 sur 4 à l'échelle réelle,
//   `sonde-tempo-nuage.cjs`) et le passager ne s'asseyait plus chez son ami.
//   `net.js` ne lit donc pas ce module. L'horloge scolaire, `cadence.js`, la
//   borne de `dt` et les débits que `monte.js` mesure n'y passent jamais.
// - UN SEUL POINT D'ENTRÉE. Un délai qui passe sous tempo s'écrit
//   `t(20000)` (ou sous un alias) à l'endroit où il vit, la valeur réelle en
//   clair : le témoin lit la valeur, le code lit le délai.

// Pure : aucune importation, lisible sous node (où il n'y a pas d'adresse,
// donc tempo 1).
export function lireTempo(href) {
  let u;
  try { u = new URL(String(href || '')); } catch { return 1; }
  if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') return 1;
  const brut = u.searchParams.get('tempo');
  if (brut === null) return 1;
  const n = Number(brut);
  return Number.isInteger(n) && n > 1 && n <= 8 ? n : 1;
}

export const TEMPO = lireTempo(typeof location !== 'undefined' ? location.href : '');

export const t = (ms) => (TEMPO === 1 ? ms : ms / TEMPO);
