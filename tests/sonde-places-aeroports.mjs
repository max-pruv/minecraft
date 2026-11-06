// LA SONDE DES EMPLACEMENTS D'AÉRODROMES (carte ×3, v588) — isolée : aucune
// suite ne l'importe. Elle rend la table `AEROPORTS` d'aeroport.js.
//
// La carte passe de 0,1875 à 0,0625 km par bloc ; les villes gardent leur
// taille en blocs. Les dix-neuf aérodromes avaient des `x, z` absolus : ils
// se reposent PAR SONDE, jamais à la main (v223 : « un emplacement se
// mesure, il ne s'écrit pas »).
//
// LA MÉTHODE est celle de la v223. On part de la VRAIE position de
// l'aérodrome (latitude et longitude réelles), ramenée à sa ville sur la
// carte courante (`ville + (vrai aérodrome − vraie ville)`, ce qui garde la
// surcharge de Paris doublé). On garde ce cap et l'on s'éloigne, puis on
// tourne de cinq en cinq degrés, jusqu'au premier emplacement qui tient les
// promesses :
//   1. au sec : moins de six pour cent d'eau sous le disque (Changi gagne sa
//      terre sur la mer par sa zone, v486 : on n'y juge pas l'eau) ;
//   2. à douze blocs de toute ville (bâtie à la main, engendrée, Manhattan et
//      ses banlieues, la boîte de Washington), de tout autre aérodrome, de
//      tout repère, de tout lieu (village, volcan, base spatiale) ;
//   3. à quarante blocs de ce que les enfants ont bâti ;
//   4. à douze blocs de toute voie ferrée et de toute gare ;
//   5. assez plat pour l'ouvrage : sous le disque pavé (`r − 10`), le relief
//      reste dans les bornes du remblai et de la tranchée (`REMBLAI`,
//      `DECAISSE`) autour de `sol`, la médiane du relief naturel.
// ET LES VILLES COMPTENT À UNE FOIS ET DEMIE LEUR RAYON : le palier 2 de la
// carte ×3 (décision de Max) les élargit d'autant. Un aérodrome posé contre
// un disque d'aujourd'hui serait mangé par la ville de demain.
//
// LES ROUTES NE COMPTENT PAS ICI, et c'est déclaré : leurs points de passage
// sont en blocs de l'ancienne carte et la session des routes les retrace.
// C'est à elles de contourner les aérodromes (`AEROPORTS` est publié).
//
// Le relief se lit sur un monde SANS aérodromes ni leurs zones à terre : le
// relief naturel, celui que la plate-forme aplanira.
//
//     cd tests && node sonde-places-aeroports.mjs
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
const M = await import('../src/mondes.js');
const { BORNES } = await import('../src/manhattan-plan.js');
const { BOITE_ZONES, TALUS } = await import('../src/new-york-banlieues.js');
const { ZONE_WASHINGTON } = await import('../src/washington.js');
const { prolongerPistes } = await import('./sonde-prolongements-aeroports.mjs');

// Les vraies coordonnées des aérodromes, et la ville dont ils dépendent.
export const VRAIS = {
  cdg: ['paris', 49.0097, 2.5479], orly: ['paris', 48.7262, 2.3652],
  lhr: ['londres', 51.4700, -0.4543], jfk: ['ny', 40.6413, -73.7781],
  mad: ['madrid', 40.4983, -3.5676], bcn: ['barcelone', 41.2974, 2.0833],
  ams: ['amsterdam', 52.3105, 4.7683], fra: ['francfort', 50.0379, 8.5622],
  fco: ['rome', 41.8003, 12.2389], hnd: ['tokyo', 35.5494, 139.7798],
  dxb: ['dubai', 25.2532, 55.3657], del: ['delhi', 28.5562, 77.1000],
  sfo: ['sf', 37.6213, -122.3790], lax: ['losangeles', 33.9416, -118.4085],
  ist: ['istanbul', 41.2753, 28.7519], sin: ['singapour', 1.3644, 103.9915],
  'bas-sd': ['paris', 48.6360, 4.8994], 'bas-adw': ['washington', 38.8108, -76.8669],
  'bas-llv': ['lasvegas', 36.2362, -115.0342], 'bas-ykt': ['tokyo', 35.7485, 139.3485],
};

const MARGE = 12, MARGE_ENFANTS = 40, K_VILLE = 1.5, PRIX_DEGRE = 8, PLANCHER = 0.85;
const SANCT = [[0, 0, 4], [26, -14, 16], [-34, 40, 10], [-100, -100, 3]];

// Le monde nu : ni aérodrome, ni leur zone à terre.
const w = new W.World();
w.conf = { ...W.CONF_NEUF, cle: 'sonde-sans-aerodromes', aeroports: [],
  reperes: W.CONF_NEUF.reperes.filter((l) => !l.aerodrome && !l.piste) };


function positionVille(cle) {
  const lieux = M.MONDES.terre.lieux;
  if (lieux.find((l) => l.cle === cle)) return { ...M.positionDe(cle), cle };
  const f = VM.VILLES_MONDE.find((q) => q.cle === cle);
  if (f) return { x: f.ancre.x, z: f.ancre.z, r: f.rayon, cle };
  throw new Error('ville inconnue ' + cle);
}

const ny = W.CITIES.find((c) => c.key === 'ny');
const RECTS = [
  { x0: ny.x + Math.min(BORNES.x0, BOITE_ZONES.x0) - TALUS, x1: ny.x + Math.max(BORNES.x1, BOITE_ZONES.x1) + TALUS,
    z0: ny.z + Math.min(BORNES.z0, BOITE_ZONES.z0) - TALUS, z1: ny.z + Math.max(BORNES.z1, BOITE_ZONES.z1) + TALUS, nom: 'New York (plan et banlieues)' },
  { ...ZONE_WASHINGTON, nom: 'Washington' },
];
const dRect = (x, z, q) => Math.hypot(Math.max(q.x0 - x, 0, x - q.x1), Math.max(q.z0 - z, 0, z - q.z1));

function disques() {
  const out = [];
  for (const c of W.CITIES) if (c.key !== 'ny' && c.key !== 'washington' && c.key !== 'dc') out.push({ x: c.x, z: c.z, r: c.r * K_VILLE, nom: c.name });
  for (const f of VM.VILLES_MONDE) out.push({ x: f.ancre.x, z: f.ancre.z, r: (f.rayon + 14) * K_VILLE, nom: f.nom || f.cle });
  for (const p of W.PLACES) if (p.r > 0) out.push({ x: p.x, z: p.z, r: p.r, nom: p.name || 'lieu' });
  for (const [x, z, r] of SANCT) out.push({ x, z, r: r + MARGE_ENFANTS - MARGE, nom: 'enfants' });
  return out;
}
const DISQUES = disques();
const BOITES = W.REPERES.filter((l) => !A.AEROPORTS.some((a) => a.nom === l.name))
  .map((l) => ({ x: l.x, z: l.z, b: l.box || 10, nom: l.name }));

function mediane(t) { const s = [...t].sort((p, q) => p - q); return s[s.length >> 1]; }

export function juger(a, X, Z, places) {
  for (const d of DISQUES) if (Math.hypot(X - d.x, Z - d.z) < d.r + a.r + MARGE) return d.nom;
  for (const q of RECTS) if (dRect(X, Z, q) < a.r + MARGE) return q.nom;
  for (const q of BOITES) if (dRect(X, Z, { x0: q.x - q.b, x1: q.x + q.b, z0: q.z - q.b, z1: q.z + q.b }) < a.r + MARGE) return q.nom;
  for (const b of places) if (Math.hypot(X - b.x, Z - b.z) < a.r + b.r + MARGE) return b.nom;
  // un premier coup d'œil, un point sur huit : l'eau écarte presque tout
  if (a.cle !== 'sin') {
    let e = 0, m = 0;
    for (let dx = -a.r; dx <= a.r; dx += 8) for (let dz = -a.r; dz <= a.r; dz += 8) {
      if (Math.hypot(dx, dz) > a.r) continue;
      m++; if (w.terrainHeight(X + dx, Z + dz) < W.WATER_LEVEL) e++;
    }
    if (e / m > 0.12) return `eau ${(100 * e / m).toFixed(0)} %`;
  }
  // le relief et l'eau
  const hs = [], dedans = [];
  let eau = 0, n = 0;
  for (let dx = -a.r; dx <= a.r; dx += 2) for (let dz = -a.r; dz <= a.r; dz += 2) {
    const d = Math.hypot(dx, dz);
    if (d > a.r) continue;
    const h = w.terrainHeight(X + dx, Z + dz);
    n++; if (h < W.WATER_LEVEL) eau++;
    hs.push(h); if (d <= a.r - 10) dedans.push(h);
  }
  if (a.cle !== 'sin' && eau / n > 0.06) return `eau ${(100 * eau / n).toFixed(0)} %`;
  const sol = Math.max(W.WATER_LEVEL + 3, mediane(hs));
  const haut = Math.max(...dedans) - sol, bas = sol - Math.min(...dedans);
  if (a.cle !== 'sin' && (haut > A.DECAISSE || bas > A.REMBLAI)) return `relief +${haut}/−${bas}`;
  // les rails, à douze blocs du disque
  for (let dx = -a.r - MARGE; dx <= a.r + MARGE; dx += 3) for (let dz = -a.r - MARGE; dz <= a.r + MARGE; dz += 3) {
    if (Math.hypot(dx, dz) > a.r + MARGE) continue;
    if (T.voieEn(X + dx, Z + dz)) return 'voie ferrée';
    if (T.gareEn(X + dx, Z + dz)) return 'gare';
  }
  return { sol, eau: eau / n, ecart: Math.max(...dedans) - Math.min(...dedans) };
}

// Les aérodromes à poser, et ceux déjà posés (dans l'ordre de la table).
export function placer(ecrire = () => {}) {
  const res = [];
  for (const a of A.AEROPORTS) {
    const [vcle, lat, lon] = VRAIS[a.cle];
    const V = positionVille(vcle);
    const lieuV = M.MONDES.terre.lieux.find((l) => l.cle === vcle) || VM.VILLES_MONDE.find((f) => f.cle === vcle);
    // l'écart réel aérodrome − ville, sur la carte courante
    const pv = lieuV.lat !== undefined ? vraiBlocs(lieuV.lat, lieuV.lon) : null;
    const pa = vraiBlocs(lat, lon);
    const ex = pa.x - pv.x, ez = pa.z - pv.z;
    const cap0 = Math.atan2(ex, -ez);               // 0 = nord, sens horaire
    const d0 = Math.hypot(ex, ez);
    // Pour chaque écart de cap (de cinq en cinq degrés), le premier
    // emplacement qui tient en s'éloignant ; on garde celui qui coûte le
    // moins, un degré d'écart valant `PRIX_DEGRE` blocs de distance. Le cap
    // cède donc en dernier, mais il cède : Dubaï, petite île de terre au
    // milieu d'une mer que le planisphère n'a pas comblée, ne doit pas
    // trouver sa piste en Iran parce que l'Iran est dans son vrai cap.
    let trouve = null, raison = '';
    const dMin = d0;
    for (const exige of [1, PLANCHER]) {
    if (trouve) break;
    for (let dev = 0; dev <= 180; dev += 5) {
      for (const s of dev && dev < 180 ? [1, -1] : [1]) {
        const cap = cap0 + s * dev * Math.PI / 180;
        for (let d = dMin; d <= dMin + 4000; d += d < dMin + 800 ? 8 : 24) {
          if (trouve && d + PRIX_DEGRE * dev >= trouve.cout) break;
          const X = Math.round(V.x + Math.sin(cap) * d), Z = Math.round(V.z - Math.cos(cap) * d);
          const j = juger(a, X, Z, res);
          if (typeof j === 'string') { if (dev === 0 && d === dMin) raison = j; continue; }
          // 6. LA PISTE ATTEINT SA CIBLE (`CIBLE_PISTE`), prolongements compris :
          // un aérodrome posé où sa piste ne peut pas s'allonger est un
          // aérodrome où l'on ne se pose pas (v448). Si aucun emplacement ne
          // tient la cible, on se contente de `PLANCHER` (le pire mesuré).
          const pistes = prolongerPistes({ ...a, x: X, z: Z, sol: j.sol }, res);
          const court = Math.min(...pistes.map((q) => q.long / q.cible));
          if (a.cle !== 'sin' && court < exige) { if (dev === 0 && d === dMin) raison = raison || `piste ${Math.round(100 * court)} %`; continue; }
          trouve = { cle: a.cle, x: X, z: Z, r: a.r, sol: j.sol, nom: a.nom, eau: j.eau, ecart: j.ecart,
            cap: Math.round(((cap * 180 / Math.PI) % 360 + 360) % 360), vraiCap: Math.round(((cap0 * 180 / Math.PI) % 360 + 360) % 360),
            dist: Math.round(d), vraiDist: Math.round(d0), raison, court, cout: d + PRIX_DEGRE * dev };
          break;
        }
      }
    }
    }
    if (!trouve) throw new Error('aucun emplacement pour ' + a.cle);
    // CHANGI SE MESURE SUR LE MONDE QUI PORTE SA ZONE (v486) : sans elle, sa
    // place est de la mer et la médiane ne dit rien.
    if (a.cle === 'sin') {
      const wz = new W.World();
      wz.conf = { ...w.conf, cle: 'sonde-changi', reperes: [...w.conf.reperes, { name: 'Changi', x: trouve.x, z: trouve.z, box: a.r - 9 }] };
      const hs = [];
      let eau = 0;
      for (let dx = -a.r; dx <= a.r; dx += 2) for (let dz = -a.r; dz <= a.r; dz += 2) {
        if (Math.hypot(dx, dz) > a.r) continue;
        const h = wz.terrainHeight(trouve.x + dx, trouve.z + dz); hs.push(h); if (h < W.WATER_LEVEL) eau++;
      }
      // la médiane de l'île vaut 38 ; on la garde à 35, la cote de la v486 : une
      // île plus basse est plus près du fond, et la digue de ses pistes tient
      // dans le remblai (la sonde des prolongements le vérifie)
      trouve.sol = W.WATER_LEVEL + 5; trouve.solIle = mediane(hs); trouve.eau = eau / hs.length;
      trouve.ecart = Math.max(...hs) - Math.min(...hs);
    }
    res.push(trouve);
    ecrire(`${a.cle.padEnd(8)} (${trouve.x}, ${trouve.z}) sol ${trouve.sol} · vrai cap ${trouve.vraiCap}° → ${trouve.cap}°, ${trouve.vraiDist} → ${trouve.dist} blocs · eau ${(100 * trouve.eau).toFixed(1)} %, écart ${trouve.ecart}${trouve.court < 1 ? ' · piste ' + Math.round(100 * trouve.court) + ' %' : ''}${raison ? ' · le vrai site : ' + raison : ''}`);
  }
  return res;
}

// La projection courante, SANS surcharge : la vraie géographie.
function vraiBlocs(lat, lon) {
  const lieux = M.MONDES.terre.lieux;
  lieux.push({ cle: '__sonde', lat, lon, r: 1 });
  try { return M.positionDe('__sonde'); } finally { lieux.pop(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const t0 = Date.now();
  const r = placer((l) => console.log(l));
  console.log(JSON.stringify(r.map(({ cle, x, z, sol }) => ({ cle, x, z, sol }))));
  console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(0);
}
