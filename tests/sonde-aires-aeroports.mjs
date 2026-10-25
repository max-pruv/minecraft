// LA SONDE DES AIRES DE STATIONNEMENT (v565) — isolée : aucune suite ne
// l'importe, elle se rejoue à la main et rend la table `AIRES` d'aeroport.js.
//
// Max : « que les aéroports soient vraiment beaucoup plus grands, et qu'il y
// ait tous les modèles d'avions garés ». L'aire s'allonge le long de la piste
// prolongée (v448), en BLOCS, comme les prolongements : `terrainHeight` ne
// bouge pas. La longueur de chaque côté est un RÉSULTAT : on avance colonne
// par colonne dans la bande de l'aire, hors du disque pavé, et l'on s'arrête
// au premier de ces obstacles —
//   - le relief hors des bornes de l'ouvrage (`REMBLAI`, `DECAISSE`) ;
//   - à moins de DOUZE blocs : une ville (bâtie à la main ou engendrée,
//     Manhattan en rectangle, Washington en boîte), un autre aérodrome ou ses
//     pistes prolongées, un repère, une route, une voie ferrée ou une gare ;
//   - à moins de QUARANTE blocs de ce que les enfants ont bâti ;
//   - le bout de la piste prolongée de ce côté (moins `RETRAIT`) : un poste
//     qui ne borde plus la piste n'a plus de piste où rouler.
//
//     cd tests && node sonde-aires-aeroports.mjs
//
// `plafond.js` l'importe (`mesurerAires`) et exige que la table `AIRES`
// soit exactement ce qu'elle rend : une aire qu'on allongerait à la main
// rougit, et une sonde qui trouverait un obstacle neuf aussi.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { register } = require('node:module');
const trois = pathToFileURL(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../vendor/three.module.min.js')).href;
register('data:text/javascript,' + encodeURIComponent(
  `export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));

const A = await import('../src/aeroport.js');
const W = await import('../src/world.js');
const VM = await import('../src/villesmonde.js');
const R = await import('../src/routes.js');
const T = await import('../src/trains.js');
const { BORNES } = await import('../src/manhattan-plan.js');
const { ZONE_WASHINGTON } = await import('../src/washington.js');

let w = null;
const MARGE = 12, MARGE_ENFANTS = 40;
const SANCT = [[0, 0, 4], [26, -14, 16], [-34, 40, 10], [-100, -100, 3]];
const ny = W.CITIES.find((c) => c.key === 'ny');
const RECT = [
  { x0: ny.x + BORNES.x0, x1: ny.x + BORNES.x1, z0: ny.z + BORNES.z0, z1: ny.z + BORNES.z1, nom: 'Manhattan' },
  { ...ZONE_WASHINGTON, nom: 'Washington' },
];
const dRect = (x, z, r) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));


// Un obstacle « disque » : centre, rayon, nom.
function disques(a) {
  const out = [];
  for (const c of W.CITIES) if (c.key !== 'ny' && c.key !== 'dc') out.push({ x: c.x, z: c.z, r: c.r + MARGE, nom: c.name });
  for (const f of VM.VILLES_MONDE) out.push({ x: f.ancre.x, z: f.ancre.z, r: f.rayon + 14 + MARGE, nom: f.nom || f.cle });
  for (const b of A.AEROPORTS) if (b !== a) out.push({ x: b.x, z: b.z, r: b.r + MARGE, nom: b.nom });
  for (const [x, z, r] of SANCT) out.push({ x, z, r: r + MARGE_ENFANTS, nom: 'enfants' });
  return out;
}
function boites(a) {
  const out = [];
  for (const l of W.REPERES) if (Math.hypot(l.x - a.x, l.z - a.z) > a.r) out.push({ x0: l.x - (l.box || 10) - MARGE, x1: l.x + (l.box || 10) + MARGE, z0: l.z - (l.box || 10) - MARGE, z1: l.z + (l.box || 10) + MARGE, nom: l.name });
  for (const b of A.AEROPORTS) if (b !== a) for (const t of A.tronconsDePiste(b)) {
    out.push({ x0: t.x - t.box - MARGE, x1: t.x + t.box + MARGE, z0: t.z - t.box - MARGE, z1: t.z + t.box + MARGE, nom: b.nom + ' (piste)' });
  }
  for (const r of RECT) out.push({ x0: r.x0 - MARGE, x1: r.x1 + MARGE, z0: r.z0 - MARGE, z1: r.z1 + MARGE, nom: r.nom });
  return out;
}

export function mesurerAires(ecrire = () => {}) {
w = w || new W.World();
const res = {};
for (const a of A.AEROPORTS) {
  if (!A.bandesAire) return null;
  const D = disques(a), B = boites(a);
  res[a.cle] = [];
  const ligne = [];
  for (const b of A.bandesAire(a)) {
    const rang = [];
    for (const sens of [-1, 1]) {
      const fin = b.finPiste[sens < 0 ? 0 : 1] - A.RETRAIT_AIRE;
      let x = b.bordDisque, cause = 'bout de la piste';
      for (; x <= fin; x++) {
        let mauvais = null;
        for (let lz = b.z0; lz <= b.z1 && !mauvais; lz++) {
          const lx = sens * x;
          if (lx * lx + lz * lz <= b.rayon * b.rayon) continue;   // dans le disque pavé
          const X = a.x + lx, Z = a.z + lz;
          const t = w.terrainHeight(X, Z);
          if (t - a.sol > A.DECAISSE) mauvais = `relief +${t - a.sol}`;
          else if (a.sol - t > A.REMBLAI) mauvais = `relief −${a.sol - t}`;
          if (!mauvais) for (const d of D) if (Math.hypot(X - d.x, Z - d.z) < d.r) { mauvais = d.nom; break; }
          if (!mauvais) for (const q of B) if (X >= q.x0 && X <= q.x1 && Z >= q.z0 && Z <= q.z1) { mauvais = q.nom; break; }
        }
        // routes, voies ferrées, gares : à douze blocs de la bande
        if (!mauvais) {
          for (let lz = b.z0 - MARGE; lz <= b.z1 + MARGE && !mauvais; lz++) {
            for (let dx = 0; dx <= MARGE && !mauvais; dx++) {
              const lx = sens * (x + dx), X = a.x + lx, Z = a.z + lz;
              const dz = lz < b.z0 ? b.z0 - lz : lz > b.z1 ? lz - b.z1 : 0;
              if (Math.hypot(dx, dz) >= MARGE) continue;
              if (R.routeEn(X, Z)) mauvais = 'route';
              else if (T.voieEn(X, Z)) mauvais = 'voie ferrée';
              else if (T.gareEn(X, Z)) mauvais = 'gare';
            }
          }
        }
        if (mauvais) { cause = mauvais; break; }
      }
      const L = Math.max(0, x - 1 - b.bordDisque);
      rang.push(L);
      ligne.push(`${b.cote < 0 ? 'S' : 'N'}${sens < 0 ? 'O' : 'E'} ${String(L).padStart(3)} (${cause})`);
    }
    res[a.cle].push(rang);
  }
  ecrire(`${a.cle.padEnd(8)} ${ligne.join('  ')}`);
}
return res;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(mesurerAires((l) => console.log(l))));
  process.exit(0);
}
