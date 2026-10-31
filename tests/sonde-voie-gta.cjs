// LA VOIE À LA GTA (v575) — sous node : où roule la carrosserie des convois des
// villes bâties à la main, selon le décalage à droite de l'axe.
//   node tests/sonde-voie-gta.cjs [décalages, ex. 1.3,2.13,-1] [racine]
// (−1 : le décalage par section du jeu, `decalerSelonLaSection`, v575)
// Pour chaque circuit (comme main.js les pose : sansEpis∘decalerADroite), tous
// les demi-blocs, cinq points en travers de la carrosserie : la colonne sous
// chacun (chaussée, trottoir, autre) et un bloc plein à hauteur de caisse.
const { register } = require('node:module');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const RACINE = path.resolve(process.argv[3] || path.join(__dirname, '..'));
const THREE_URL = pathToFileURL(path.join(RACINE, 'vendor/three.module.min.js')).href;
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(s, c, n) {
  if (s === 'three') return { url: ${JSON.stringify(THREE_URL)}, shortCircuit: true };
  return n(s, c);
}`));
const src = (f) => pathToFileURL(path.join(RACINE, 'src', f)).href;

async function principal() {
  const W = await import(src('world.js'));
  const B = await import(src('blocks.js'));
  const V = await import(src('vehicules.js'));
  const VD = await import(src('voiesdoubles.js'));
  const mods = {
    paris: await import(src('paris.js')), londres: await import(src('londres.js')), nice: await import(src('nice.js')),
    lille: await import(src('lille.js')), sf: await import(src('sanfrancisco.js')), dc: await import(src('washington.js')),
  };
  const w = new W.World();
  const solDe = (x, z) => w.coteRoulable(x, z);
  const circuits = [
    ...mods.paris.circuitsParis(solDe).map((c) => ({ ...c, v: 'paris' })),
    ...(mods.paris.circuitsQuartiersParis ? mods.paris.circuitsQuartiersParis(solDe).map((c) => ({ ...c, v: 'parisQ' })) : []),
    ...mods.londres.circuitsLondres(solDe).map((c) => ({ ...c, v: 'londres' })),
    ...mods.sf.circuitsSF(solDe).map((c) => ({ ...c, v: 'sf' })),
    ...mods.nice.circuitsNice(solDe).map((c) => ({ ...c, v: 'nice' })),
    ...mods.lille.circuitsLille(solDe).map((c) => ({ ...c, v: 'lille' })),
    ...mods.dc.circuitsWashington(solDe).map((c) => ({ ...c, v: 'dc' })),
  ];
  const decs = (process.argv[2] || '1.3,2.13').split(',').map(Number);
  const DEMI = 1.13;
  const out = {};
  for (const e of decs) {
    const par = {};
    for (const c of circuits) {
      const brut = c.pts.map((p) => ({ ...p }));
      const r2 = e < 0 ? VD.decalerSelonLaSection(c.cle, brut, solDe) : { pts: brut, e };
      const P = V.sansEpis(V.decalerADroite(r2.pts, r2.e));
      const r = par[c.v] || (par[c.v] = { pas: 0, flancHors: 0, centreHors: 0, dur: 0 });
      const n = P.length;
      for (let k = 0; k < n; k++) {
        const a = P[k], q = P[(k + 1) % n];
        const L = Math.hypot(q.x - a.x, q.z - a.z);
        if (!(L > 1e-6)) continue;
        const lx = -(q.z - a.z) / L, lz = (q.x - a.x) / L;
        for (let s = 0; s < L; s += 0.5) {
          const t = s / L;
          const x = a.x + (q.x - a.x) * t, z = a.z + (q.z - a.z) * t, y = a.y + (q.y - a.y) * t;
          r.pas++;
          let hors = 0, dur = false, centre = false;
          for (const d of [-DEMI, -DEMI / 2, 0, DEMI / 2, DEMI]) {
            const bx = Math.floor(x + lx * d), bz = Math.floor(z + lz * d);
            const yb = w.sommetColonne(bx, bz);
            const sol = w.getBlock(bx, yb, bz);
            const ch = W.CHAUSSEE.has(sol);
            if (!ch) { hors++; if (d === 0) centre = true; }
            for (const dy of [0, 1]) { const id = w.getBlock(bx, Math.floor(y + dy), bz); if (id && B.isSolid(id)) dur = true; }
          }
          if (hors && (hors > 0)) r.flancHors++;
          if (centre) r.centreHors++;
          if (dur) r.dur++;
        }
      }
    }
    out[e] = par;
  }
  for (const [e, par] of Object.entries(out)) {
    console.log('décalage', e);
    for (const [v, r] of Object.entries(par)) console.log('  ', v.padEnd(8), JSON.stringify({ ...r, partFlancHors: +(r.flancHors / r.pas).toFixed(3), partCentreHors: +(r.centreHors / r.pas).toFixed(3) }));
  }
}
principal().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
