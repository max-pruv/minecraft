// SONDE — SUR QUOI BUTE LA VOITURE DE L'ENFANT EN VILLE (v535). Sous node,
// sans navigateur.
//
// Max : « tout le mobilier urbain, poteau, feu rouge… est hyper dur. C'est
// hyper dur de conduire parce que tout est méga étroit. » Deux mesures avant
// une ligne de code.
//
//  1. LA LARGEUR. Le long des circuits de la ville (les vrais tracés que la
//     circulation roule, décalés dans la voie de droite comme main.js), tous
//     les deux blocs : la chaussée traversée perpendiculairement à la marche
//     (colonnes de CHAUSSEE contiguës de part et d'autre de l'axe de la rue),
//     et la marge qui reste à une voiture de 2,26 blocs centrée sur la voie.
//  2. LES BUTÉES. La voiture de l'enfant (rectangle 4,4 × 2,26, la règle de
//     `mobilierDevant` : blocs `isProp` à la cote des roues et un au-dessus)
//     roule le même tracé décalé de 0 à 2 blocs vers le trottoir : combien de
//     pièces de mobilier distinctes entrent dans son rectangle, par famille, et
//     par minute de conduite à 15 b/s.
//
//   node tests/sonde-mobilier-route.cjs [src]
const { register } = require('node:module');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const RACINE = path.resolve(path.join(__dirname, '..'));
const THREE_URL = pathToFileURL(path.join(RACINE, 'vendor/three.module.min.js')).href;
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(s, c, n) {
  if (s === 'three') return { url: ${JSON.stringify(THREE_URL)}, shortCircuit: true };
  return n(s, c);
}`));
const SRC = path.resolve(process.argv[2] || path.join(RACINE, 'src'));
const src = (f) => pathToFileURL(path.join(SRC, f)).href;

(async () => {
  const { World, CHAUSSEE, TROTTOIR } = await import(src('world.js'));
  const B = await import(src('blocks.js'));
  const V = await import(src('vehicules.js'));
  const { circuitsParis } = await import(src('paris.js'));
  const { circuitsLondres } = await import(src('londres.js'));
  const VM = await import(src('villesmonde.js'));
  const w = new World();
  const solDe = (x, z) => w.coteRoulable(x, z);
  const nomDe = (id) => (B.BLOCK_INFO[id] && B.BLOCK_INFO[id].name || String(id)).split(' ')[0];
  const VILLES = {
    paris: circuitsParis(solDe).slice(0, 8),
    londres: circuitsLondres(solDe).slice(0, 8),
  };
  const eng = VM.tracesCirculation((x, z) => w.terrainHeight(x, z));
  for (const cle of ['rome', 'zurich', 'tokyo', 'berlin']) VILLES[cle] = eng.filter((t) => t.cle === cle).slice(0, 4);
  const OFFS = [0, 0.5, 1, 1.5, 2];
  for (const [ville, traces] of Object.entries(VILLES)) {
    const larg = [], tro = [];
    const butees = OFFS.map(() => ({ n: 0, fam: {} })); let longueur = 0;
    for (const tr of traces) {
      const avenue = ville === 'paris' || ville === 'londres';
      const pts = avenue ? V.decalerADroite(tr.pts, 1.3) : tr.pts;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const L = Math.hypot(b.x - a.x, b.z - a.z);
        if (L < 1e-6) continue;
        const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L, rx = -uz, rz = ux; // droite = (−uz, ux)
        for (let s = 0; s < L; s += 2) {
          const x = a.x + ux * s, z = a.z + uz * s;
          longueur += 2;
          const y0 = Math.floor(solDe(x, z) + 1 + 0.1);
          // 1. la chaussée, perpendiculairement
          const estC = (d) => { const px = Math.floor(x + rx * d), pz = Math.floor(z + rz * d);
            const b = w.getBlock(px, w.sommetColonne(px, pz), pz); return CHAUSSEE.has(b) || b === B.ARCHI.BORDURE; };
          if (estC(0)) {
            let g = 0, d = 0;
            while (g < 12 && estC(-(g + 0.5))) g += 0.5;
            while (d < 12 && estC(d + 0.5)) d += 0.5;
            larg.push(g + d + 0.5);
            // le trottoir au-delà du bord droit
            let t = 0; const estT = (dd) => { const px = Math.floor(x + rx * dd), pz = Math.floor(z + rz * dd);
              return TROTTOIR.has(w.getBlock(px, w.sommetColonne(px, pz), pz)); };
            while (t < 10 && estT(d + 1 + t)) t += 0.5;
            tro.push(t);
          }
          // 2. les butées, à chaque décalage vers le trottoir
          OFFS.forEach((o, k) => {
            const cx = x + rx * o, cz = z + rz * o;
            for (let al = -2.2; al <= 2.2001; al += 0.5) for (let bl = -1.13; bl <= 1.1301; bl += 0.5) {
              const sx = cx + ux * al + rx * bl, sz = cz + uz * al + rz * bl;
              const bx = Math.floor(sx), bz = Math.floor(sz);
              for (const yy of [y0, y0 + 1]) {
                const id = w.getBlock(bx, yy, bz);
                if (!B.isProp(id)) continue;
                const cle = bx + ',' + yy + ',' + bz;
                const vus = butees[k].vus || (butees[k].vus = new Set());
                if (vus.has(cle)) continue;
                vus.add(cle); butees[k].n++;
                const f = nomDe(id); butees[k].fam[f] = (butees[k].fam[f] || 0) + 1;
              }
            }
          });
        }
      }
    }
    larg.sort((p, q) => p - q); tro.sort((p, q) => p - q);
    const q = (t, f) => t.length ? t[Math.floor((t.length - 1) * f)] : NaN;
    const sous = (t, v) => t.length ? (100 * t.filter((x) => x < v).length / t.length).toFixed(0) + '%' : '-';
    console.log(`\n${ville} — ${traces.length} circuits, ${(longueur / 1000).toFixed(1)} km lus`);
    console.log(`  chaussée : p10 ${q(larg, 0.1)} · médiane ${q(larg, 0.5)} · p90 ${q(larg, 0.9)} blocs ; sous 4,5 (deux voitures) ${sous(larg, 4.5)} ; marge d'une voiture centrée sur la voie (médiane) ${((q(larg, 0.5) - 2.26) / 2).toFixed(2)}`);
    console.log(`  trottoir (droite) : médiane ${q(tro, 0.5)} · p10 ${q(tro, 0.1)}`);
    OFFS.forEach((o, k) => {
      const parKm = butees[k].n / (longueur / 1000), parMin = parKm * 0.9;
      console.log(`  décalé de ${o} vers le trottoir : ${butees[k].n} pièces (${parKm.toFixed(0)}/km, ${parMin.toFixed(1)}/min à 15 b/s) ${JSON.stringify(butees[k].fam)}`);
    });
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
