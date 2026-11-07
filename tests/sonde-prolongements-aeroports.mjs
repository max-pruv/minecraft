// LA SONDE DES PROLONGEMENTS DE PISTE (v448, refaite pour la carte ×3, v588) —
// isolée : aucune suite ne l'importe. Elle rend la table `PROLONGEMENTS`
// d'aeroport.js, et la liste des pistes qui n'atteignent pas leur cible.
//
// Colonne par colonne le long de chaque axe et dans chaque sens, hors du
// disque pavé, la bande de la piste (demi-largeur + 2) doit rester dans les
// bornes de l'ouvrage (`REMBLAI`, `DECAISSE` ; sur la mer, une digue descend
// d'`APPUI_PROLONGE` de plus), à DOUZE blocs au moins de toute
// ville (à une fois et demie son rayon, pour le palier 2), voie ferrée, gare,
// autre aérodrome et repère, et à QUARANTE de ce que les enfants ont bâti. On
// prend dans chaque sens ce qu'il faut pour la cible (`CIBLE_PISTE`), en
// reportant sur l'autre sens ce qu'un sens refuse.
//
// LES ROUTES N'Y SONT PAS : elles se retracent sur la carte ×3 (session des
// routes), et c'est à elles de contourner les pistes publiées.
//
//     cd tests && node sonde-prolongements-aeroports.mjs
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
const T = await import('../src/trains.js');
const { BORNES } = await import('../src/manhattan-plan.js');
const { BOITE_ZONES, TALUS } = await import('../src/new-york-banlieues.js');
const { ZONE_WASHINGTON } = await import('../src/washington.js');

const MARGE = 12, MARGE_ENFANTS = 40, K_VILLE = 1.5, PORTEE = 260;
const SANCT = [[0, 0, 4], [26, -14, 16], [-34, 40, 10], [-100, -100, 3]];
const w = new W.World();
const ny = W.CITIES.find((c) => c.key === 'ny');
const RECTS = [
  { x0: ny.x + Math.min(BORNES.x0, BOITE_ZONES.x0) - TALUS, x1: ny.x + Math.max(BORNES.x1, BOITE_ZONES.x1) + TALUS,
    z0: ny.z + Math.min(BORNES.z0, BOITE_ZONES.z0) - TALUS, z1: ny.z + Math.max(BORNES.z1, BOITE_ZONES.z1) + TALUS, nom: 'New York' },
  { ...ZONE_WASHINGTON, nom: 'Washington' },
];
const dRect = (x, z, q) => Math.hypot(Math.max(q.x0 - x, 0, x - q.x1), Math.max(q.z0 - z, 0, z - q.z1));

function obstacles(a, aeroports = A.AEROPORTS) {
  const D = [];
  for (const c of W.CITIES) if (c.key !== 'ny' && c.key !== 'washington') D.push({ x: c.x, z: c.z, r: c.r * K_VILLE + MARGE, nom: c.name });
  for (const f of VM.VILLES_MONDE) D.push({ x: f.ancre.x, z: f.ancre.z, r: (f.rayon + 14) * K_VILLE + MARGE, nom: f.nom || f.cle });
  for (const p of W.PLACES) if (p.r > 0) D.push({ x: p.x, z: p.z, r: p.r + MARGE, nom: p.name || 'lieu' });
  for (const b of aeroports) if (b.cle !== a.cle) D.push({ x: b.x, z: b.z, r: b.r + MARGE, nom: b.nom });
  for (const [x, z, r] of SANCT) D.push({ x, z, r: r + MARGE_ENFANTS, nom: 'enfants' });
  const B = W.REPERES.filter((l) => l.name !== a.nom && Math.hypot(l.x - a.x, l.z - a.z) < 900)
    .map((l) => ({ x0: l.x - (l.box || 10) - MARGE, x1: l.x + (l.box || 10) + MARGE, z0: l.z - (l.box || 10) - MARGE, z1: l.z + (l.box || 10) + MARGE, nom: l.name }));
  return { D: D.filter((d) => Math.hypot(d.x - a.x, d.z - a.z) < d.r + 900), B };
}

// Jusqu'où l'on peut aller dans un sens, et pourquoi on s'arrête.
function portee(a, p, sens, O) {
  const bord = Math.floor(Math.sqrt(Math.max(0, p.rayon * p.rayon - p.z0 * p.z0)));
  let L = 0, cause = 'portée';
  for (let d = bord + 1; d <= bord + PORTEE; d++) {
    let mauvais = null;
    for (let dz = -p.demi - 2; dz <= p.demi + 2 && !mauvais; dz++) {
      const lx = sens * d, lz = p.z0 + dz;
      if (lx * lx + lz * lz <= p.rayon * p.rayon) continue;
      const X = a.x + lx, Z = a.z + lz;
      const t = w.terrainHeight(X, Z);
      if (t - a.sol > A.DECAISSE) mauvais = `relief +${t - a.sol}`;
      // SUR LA MER, UNE DIGUE (v486, v530) : le remblai d'un prolongement descend
      // de `APPUI_PROLONGE` de plus hors du disque, et sous l'eau c'est ce qui
      // le porte. Sur terre, la borne mesurée de la v448.
      else if (a.sol - t > A.REMBLAI + (t < W.WATER_LEVEL ? A.APPUI_PROLONGE : 0)) mauvais = `relief −${a.sol - t}`;
      if (!mauvais) for (const q of O.D) if (Math.hypot(X - q.x, Z - q.z) < q.r) { mauvais = q.nom; break; }
      if (!mauvais) for (const q of O.B) if (X >= q.x0 && X <= q.x1 && Z >= q.z0 && Z <= q.z1) { mauvais = q.nom; break; }
      if (!mauvais) for (const q of RECTS) if (dRect(X, Z, q) < MARGE) { mauvais = q.nom; break; }
    }
    // voies ferrées et gares, à douze blocs de la bande
    if (!mauvais) {
      for (let dz = -p.demi - 2 - MARGE; dz <= p.demi + 2 + MARGE && !mauvais; dz += 2) {
        for (let k = 0; k <= MARGE && !mauvais; k += 2) {
          const X = a.x + sens * (d + k), Z = a.z + p.z0 + dz;
          if (T.voieEn(X, Z)) mauvais = 'voie ferrée';
          else if (T.gareEn(X, Z)) mauvais = 'gare';
        }
      }
    }
    if (mauvais) { cause = mauvais; break; }
    L = d - bord;
  }
  return { L, cause, bord };
}

// LA LONGUEUR QUE LE TÉMOIN ROULE (carteMonde.js) : un sens sans prolongement
// s'arrête au bord pavé du disque, un bloc avant `bord` (Andrews : 219 pour
// 220). Ajouter ce bloc à l'est faisait s'arrêter le chasseur du dernier poste
// de l'aire en roulant vers la piste (le guidage d'approche.js juge la place
// devant lui à un bloc près) : la piste reste à 219 et se déclare courte.
const longueur = (bord, o, e) => 2 * bord + o + e - (o === 0 || e === 0 ? 1 : 0);

// Les pistes d'un aérodrome (posé ou candidat), prolongées au mieux.
export function prolongerPistes(a, aeroports = A.AEROPORTS) {
  const O = obstacles(a, aeroports);
  const cible = A.CIBLE_PISTE[a.profil];
  const out = [];
  for (const p of A.pistesDe({ ...a, prolongements: {} }, false)) {
    const po = portee(a, p, -1, O), pe = portee(a, p, 1, O);
    const bord = po.bord;
    const besoin = Math.max(0, cible - 2 * bord);
    let o = Math.ceil(besoin / 2), e = besoin - o;
    if (o > po.L) { e += o - po.L; o = po.L; }
    if (e > pe.L) { o = Math.min(po.L, o + e - pe.L); e = pe.L; }
    out.push({ z0: p.z0, o, e, long: longueur(bord, o, e), cible, po, pe });
  }
  return out;
}

export function mesurerProlongements(ecrire = () => {}) {
  const table = {}, courtes = {};
  for (const a of A.AEROPORTS) {
    const O = obstacles(a);
    const cible = A.CIBLE_PISTE[a.profil];
    table[a.cle] = {};
    const lignes = [];
    for (const p of A.pistesDe({ ...a, prolongements: {} }, false)) {
      const po = portee(a, p, -1, O), pe = portee(a, p, 1, O);
      const bord = po.bord;
      const besoin = Math.max(0, cible - 2 * bord);
      let o = Math.ceil(besoin / 2), e = besoin - o;
      if (o > po.L) { e += o - po.L; o = po.L; }
      if (e > pe.L) { o = Math.min(po.L, o + e - pe.L); e = pe.L; }
      table[a.cle][p.z0] = [o, e];
      const long = longueur(bord, o, e);
      if (long < cible) courtes[a.cle] = `ouest ${po.cause}, est ${pe.cause}`;
      lignes.push(`z${p.z0} [${o}, ${e}] = ${long}/${cible} (ouest ≤ ${po.L} ${po.cause} · est ≤ ${pe.L} ${pe.cause})`);
    }
    ecrire(`${a.cle.padEnd(8)} ${lignes.join('  ')}`);
  }
  return { table, courtes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const r = mesurerProlongements((l) => console.log(l));
  console.log(JSON.stringify(r.table));
  console.log(JSON.stringify(r.courtes, null, 1));
  process.exit(0);
}
