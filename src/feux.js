// LE FEU TRICOLORE — l'horloge, et l'axe qu'un feu commande.
//
// Pur : aucun import, ni three, ni document. C'est ce qui permet à un témoin
// de le lire sous node, comme `cap.js` et `signatures.js`, et à `main.js`
// (qui allume les lanternes) comme à la circulation (qui s'arrête au rouge)
// de lire la MÊME règle. Deux tables qui décrivent le même feu finissent par
// diverger.
//
// L'HORLOGE EST EN TEMPS RÉEL, JAMAIS EN `dt`. `main.js` borne `dt` à un
// vingtième de seconde : un cycle compté en `dt` durerait deux fois plus
// longtemps sur une tablette qui rame — et le feu passerait au vert quand
// l'enfant ne regarde plus. C'est la règle des cadences de ménage (v226), et
// un feu est une cadence de ménage : il décide de ce que le monde fait, pas
// de ce que l'enfant fait.

export const VERT = 9000;      // la part verte d'un axe
export const ORANGE = 2000;    // puis l'orange, avant que l'autre ne passe
// Le tour complet vaut DEUX demi-cycles exactement : sans cela l'orange d'un
// axe déborde sur le vert de l'autre, et deux files avancent ensemble dans le
// carrefour. Ici l'orange est le dégagement, et il tombe toujours avant.
export const CYCLE = 2 * (VERT + ORANGE);

// L'AXE QU'UN FEU COMMANDE SE LIT DANS SA POSITION. Un carrefour porte un feu
// par coin (villesmonde.js) : la parité de (x + z) met les coins en DIAGONALE
// deux à deux — c'est exactement la paire qui, dans une vraie ville, regarde
// la même file de voitures. Aucun identifiant de bloc en plus, et la règle est
// la même pour celui qui l'allume et pour celle qui s'y arrête.
//
// L'axe 0 est la rue qui court le long de x.
export function axeDuFeu(x, z) {
  return (((Math.round(x) + Math.round(z)) % 2) + 2) % 2;
}

// L'axe d'une voiture : celui dont elle suit la direction.
export function axeDuCap(ux, uz) { return Math.abs(ux) >= Math.abs(uz) ? 0 : 1; }

// 'vert' | 'orange' | 'rouge', pour un axe, à un instant en millisecondes.
// Les deux axes ne sont JAMAIS verts en même temps : l'axe 1 démarre à la
// moitié du cycle, et l'orange tient lieu de dégagement.
export function etatFeu(axe, t) {
  const debut = axe === 0 ? 0 : CYCLE / 2;
  const d = ((((t - debut) % CYCLE) + CYCLE) % CYCLE);
  if (d < VERT) return 'vert';
  if (d < VERT + ORANGE) return 'orange';
  return 'rouge';
}
