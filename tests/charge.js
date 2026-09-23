// La charge du banc, lue à l'INSTANT — pas la moyenne d'une minute.
//
// `souffler` (banc.js) et `attendreLeCalme` (tout.js) lisaient tous deux
// `/proc/loadavg`, la charge moyenne d'une minute. Le dépôt avait déjà mesuré
// deux fois que cet instrument RETARDE de cent secondes : quand une page se
// ferme, ses processus meurent tout de suite et la machine est libre, mais le
// chiffre met plus d'une minute à le reconnaître. Mesuré sur le portail de la
// v253 : trente-huit appels à `souffler`, six cent quatre-vingt-dix secondes,
// vingt-deux d'entre eux au bout de leur budget — ONZE MINUTES sur
// cinquante-neuf à regarder un nombre qui ne descendait pas, alors que rien
// ne tournait plus. Une attente qui n'observe pas la bonne chose n'attend rien.
//
// Ce qu'on veut savoir avant d'ouvrir une page, c'est si ce qui devait mourir
// est mort. Cela se lit dans `/proc/stat` : deux relevés à une demi-seconde
// d'écart donnent le nombre de cœurs OCCUPÉS pendant cette demi-seconde. Mesuré
// sur ces quatre cœurs : machine au repos 0,1 ; une page de jeu ouverte
// 3,7 à 3,8, stable ; et une page qu'on vient de fermer retombe à 0,2 en moins
// d'une seconde.
//
// Et une charge qui ne redescend PAS n'est pas une charge qu'on attend : c'est
// une page vivante, que la suite a ouverte exprès (l'hôte qu'un invité va
// rejoindre). L'ancien `souffler` attendait alors tout son budget, pour rien.
// Ici, quatre relevés stables — deux secondes sans que rien ne baisse — et l'on
// rend la main en disant ce qu'on a vu.
const fs = require('fs');
const os = require('os');

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const COEURS = os.cpus().length || 1;

function lireCpu() {
  // Première ligne de /proc/stat : cpu user nice system idle iowait irq softirq …
  const f = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number);
  return { repos: f[3] + f[4], total: f.reduce((a, b) => a + b, 0) };
}

// Cœurs occupés sur la fenêtre `ms` qui vient de s'écouler. Sans /proc (hors
// Linux), on répond 0 : on ne sait pas, on avance — comme avant.
async function occupation(ms = 500) {
  let a;
  try { a = lireCpu(); } catch { await dormir(ms); return 0; }
  await dormir(ms);
  const b = lireCpu();
  const total = b.total - a.total;
  if (total <= 0) return 0;
  return COEURS * (1 - (b.repos - a.repos) / total);
}

// Attend que la machine soit libre (occupation ≤ `coeursMax`) OU que sa charge
// ait cessé de baisser (quatre relevés à moins de 0,3 cœur d'écart) — borné par
// `limiteMs`. Rend { ms, occupation, motif } ; `motif` vaut 'libre', 'stable'
// ou 'limite'.
async function attendreLaCharge(limiteMs = 30000, coeursMax = 2.5, pasMs = 500) {
  const depart = Date.now();
  const releves = [];
  let motif = 'limite';
  let occ = 0;
  while (Date.now() - depart < limiteMs) {
    occ = await occupation(pasMs);
    releves.push(occ);
    if (occ <= coeursMax) { motif = 'libre'; break; }
    if (releves.length >= 4) {
      const d = releves.slice(-4);
      if (Math.max(...d) - Math.min(...d) < 0.3) { motif = 'stable'; break; }
    }
  }
  return { ms: Date.now() - depart, occupation: occ, motif, coeurs: COEURS };
}

module.exports = { occupation, attendreLaCharge, COEURS };
