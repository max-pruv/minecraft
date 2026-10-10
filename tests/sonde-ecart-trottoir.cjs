// SONDE — UN ÉCART QUI FAIT TRAVERSER LA RUE (v411). Sous node, sans navigateur.
//
// On PROVOQUE la situation au lieu de l'attendre (leçon des poissons, v233) :
// des passants posés au bord du trottoir, face à la rue, aux coins des feux de
// quatre villes (relevés dans les blocs, comme le témoin du feu de monte.js),
// et des voitures SYNTHÉTIQUES qui passent devant eux sur la chaussée — droites
// ou en virage (courbure ±1/7, ±1/12), en biais de −45° à +45°, à 1 à 4 blocs
// du bord. La voiture roule à 12 b/s en temps réel ; le passant fait l'écart
// tel que `marlon.js` le fait (pas de côté à 3,2 b/s, demi-tour contre un mur
// une fois, fin hors du couloir ou à deux secondes), avec l'ancien choix du
// côté (`v.cote`) puis le neuf (`coteDEcart`). Le pire cas : AUCUN freinage de
// la voiture, comme le témoin de la v351.
//
// Rend, par bras : écarts déclenchés, écarts qui DESCENDENT sur la chaussée,
// passants qui finissent sur le trottoir d'EN FACE, et contacts (le point du
// passant, gonflé de 0,3, dans le rectangle 4,4 × 2,26 de la voiture).
//
//   node tests/sonde-ecart-trottoir.cjs [src]
(async () => {
  const path = require('path');
  const src = path.resolve(process.argv[2] || path.join(__dirname, '..', 'src'));
  const { World, TROTTOIR, CHAUSSEE } = await import(path.join(src, 'world.js'));
  const { RUE, ARCHI } = await import(path.join(src, 'blocks.js'));
  const { positionDe } = await import(path.join(src, 'mondes.js'));
  const P = await import(path.join(src, 'pietons.js'));
  const w = new World();
  const solMemo = new Map();
  const sol = (x, z) => {
    const bx = Math.floor(x), bz = Math.floor(z), k = bx * 100003 + bz;
    let r = solMemo.get(k);
    if (r) return r;
    const b = w.getBlock(bx, w.sommetColonne(bx, bz), bz);
    r = TROTTOIR.has(b) ? 't' : (CHAUSSEE.has(b) || b === ARCHI.BORDURE) ? 'c' : 'x';
    solMemo.set(k, r);
    return r;
  };
  const VE = 1.6 * P.ALLURE_ECART, DT = 0.05, V = 12;
  const total = { ancien: z0(), neuf: z0() };
  function z0() { return { ecarts: 0, descend: 0, enFace: 0, contacts: 0 }; }
  for (const cle of ['rome', 'zurich', 'paris', 'londres']) {
    const c = positionDe(cle);
    // les feux à moins de cent blocs du centre
    const feux = [];
    for (let x = c.x - 100; x <= c.x + 100; x++) for (let z = c.z - 100; z <= c.z + 100; z++) {
      const y = w.sommetColonne(x, z);
      for (let k = 0; k <= 2; k++) if (w.getBlock(x, y + k, z) === RUE.FEUX) { feux.push({ x, z }); break; }
    }
    const poses = [], vus = new Set();
    for (const f of feux) {
      if (poses.length >= 16) break;
      const cl = Math.round(f.x / 8) + ',' + Math.round(f.z / 8);
      if (vus.has(cl)) continue;
      let trouve = null;
      for (let dx = -3; dx <= 3 && !trouve; dx++) for (let dz = -3; dz <= 3 && !trouve; dz++) {
        const x = f.x + dx + 0.5, z = f.z + dz + 0.5;
        if (sol(x, z) !== 't') continue;
        for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (sol(x + ux * 1.2, z + uz * 1.2) !== 'c') continue;
          if (P.cheminDeTraversee(sol, x, z, ux, uz) === null) continue;
          trouve = { x, z, ux, uz }; break;
        }
      }
      if (trouve) { vus.add(cl); poses.push(trouve); }
    }
    const parVille = { ancien: z0(), neuf: z0() };
    for (const p of poses) for (const sens of [1, -1]) for (let phi = -45; phi <= 45; phi += 15)
      for (const kap of [-1 / 7, -1 / 12, 0, 1 / 12, 1 / 7]) for (const dP of [1.5, 2.5, 3.5, 4.5]) {
        const Px = p.x + p.ux * dP, Pz = p.z + p.uz * dP;
        if (sol(Px, Pz) !== 'c') continue;
        // une voiture roule sur la chaussée : son centre y reste d'un bout à l'autre du passage
        let surRue = true;
        const a0 = Math.atan2(-p.ux * sens, p.uz * sens) + phi * Math.PI / 180;   // le long de la rue, en biais
        const voiture = (tau) => {
          const a = a0 + kap * V * tau;
          const x = kap ? Px + (Math.sin(a) - Math.sin(a0)) / kap : Px + Math.cos(a0) * V * tau;
          const z = kap ? Pz - (Math.cos(a) - Math.cos(a0)) / kap : Pz + Math.sin(a0) * V * tau;
          return { x, y: 0, z, ux: Math.cos(a), uz: Math.sin(a), v: V, demiLarg: 1.13 };
        };
        for (let tau = -1.5; tau <= 1.5 && surRue; tau += 0.1) { const r = voiture(tau); if (sol(r.x, r.z) !== 'c') surRue = false; }
        if (!surRue) continue;
        for (const bras of ['ancien', 'neuf']) {
          let x = p.x, z = p.z, e = null, repos = 0, descend = false, contact = false, declenche = false;
          for (let tau = -3; tau <= 2.5; tau += DT) {
            const r = voiture(tau);
            const dx = x - r.x, dz = z - r.z;
            if (Math.abs(dx * r.ux + dz * r.uz) <= 2.2 + 0.3 && Math.abs(dx * r.uz - dz * r.ux) <= 1.13 + 0.3) contact = true;
            if (!e && repos <= 0) {
              const v = P.couloirVoiture(r, x, z, 0);
              if (v) {
                declenche = true;
                const ch = bras === 'neuf' ? P.coteDEcart(v, sol, x, z, VE) : { ex: v.uz * v.cote, ez: -v.ux * v.cote, garde: false };
                e = { ux: v.ux, uz: v.uz, cote: v.cote, ex: ch.ex, ez: ch.ez, garde: ch.garde, t: 0, lat0: v.lat, retourne: ch.garde };
              }
            }
            if (e) {
              // dans l'ordre de marlon.js : le couloir relu D'ABORD, au point
              // où l'on est ; hors du couloir ou au bout de deux secondes,
              // l'écart finit sans faire de pas
              e.t += DT;
              const encore = P.couloirVoiture(r, x, z, 0, 1.8);
              if (encore && !e.retourne && e.t > 0.6 && Math.abs(encore.lat - e.lat0) < 0.25 && (bras === 'ancien' || P.retournementPermis(sol, x, z, e, encore.lat, encore.demi, VE))) { e.cote = -e.cote; e.ex = -e.ex; e.ez = -e.ez; e.retourne = true; e.t = 0; e.lat0 = encore.lat; }
              if (!encore || e.t > 2) { e = null; repos = P.REPOS_ECART_S; }
              else {
                const pas = Math.min(P.PAS_ECART_MAX, VE * DT);
                const nx = x + e.ex * pas, nz = z + e.ez * pas;
                if (sol(nx, nz) !== 'x' && (bras === 'ancien' || P.pasDEcartPermis(sol, x, z, nx, nz, encore))) { x = nx; z = nz; }
                if (sol(x, z) === 'c') descend = true;
              }
            } else repos -= DT;
          }
          if (!declenche) continue;
          const s = parVille[bras];
          s.ecarts++;
          if (descend) s.descend++;
          if (process.env.DETAIL && descend && bras === 'neuf' && s.descend <= 3) console.log('  descend', cle, JSON.stringify({ p, sens, phi, kap: +kap.toFixed(3), dP, fin: [+(x - p.x).toFixed(1), +(z - p.z).toFixed(1)], derriere: [1, 2, 3].map((k) => sol(p.x - p.ux * k, p.z - p.uz * k)).join('') }));
          if (sol(x, z) === 't' && descend && Math.hypot(x - p.x, z - p.z) > 3) s.enFace++;
          if (contact) s.contacts++;
        }
      }
    console.log(cle, 'feux', feux.length, 'poses', poses.length, JSON.stringify(parVille));
    for (const b of ['ancien', 'neuf']) for (const k in total[b]) total[b][k] += parVille[b][k];
  }
  console.log('TOTAL', JSON.stringify(total));
  process.exit(0);
})();
