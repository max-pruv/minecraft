// LA RUE DENSE (palier GTA VI) — ce que voit un enfant au-dessus d'un
// boulevard, d'une autoroute et de quatre villes : voitures pour mille blocs
// de rue (convois nés autour de lui), voitures EN VUE (à moins de 45 blocs,
// v322), écart pare-chocs dans une file ARRÊTÉE (deux voisines à l'arrêt),
// part des voitures qui roulent sur une seconde voie (`jumeau`), et appels de
// dessin. Usage : node tests/sonde-rue-dense.cjs [lieux…] [--duree=20]
const { Banc, souffler } = require('./banc.js');
const args = process.argv.slice(2);
const duree = Number((args.find((a) => a.startsWith('--duree=')) || '--duree=20').slice(8));
const lieux = args.filter((a) => !a.startsWith('--'));
const LIEUX = lieux.length ? lieux : ['paris', 'a1', 'londres', 'rome', 'ny', 'zurich', 'tokyo', 'tokyo-bd', 'madrid-bd', 'dc'];
(async () => {
  const banc = new Banc({ portJeu: 8431, portPairs: 9431 });
  await banc.ouvrir();
  const out = {};
  try {
    for (const lieu of LIEUX) {
      await souffler();
      const page = await banc.jouerSeul('SondeDense' + lieu.replace(/\W/g, ''));
      out[lieu] = await page.evaluate(async ({ lieu, duree }) => {
        const g = window.__game, dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        let P;
        if (lieu === 'a1') {
          const r = await import('./src/routes.js'); const s = r.segmentsDeRoute()[0];
          const q = r.pointA(s, s.longueur * 0.4); P = { x: q.x, z: q.z };
        } else if (lieu === 'paris') {
          // sur la rue de Rivoli, là où le circuit 0 a sa jumelle (v415)
          const p = await import('./src/paris.js');
          P = { x: p.PARIS.x - 88, z: p.PARIS.z - 5 };
        } else if (lieu === 'tokyo-bd') P = { x: 53387, z: 8088 };
        else if (lieu === 'madrid-bd') P = { x: -2581, z: 5272 };
        else { const m = await import('./src/mondes.js'); P = m.positionDe(lieu); }
        g.player.pos.set(P.x, 75, P.z); g.player.vel.set(0, 0, 0); g.player.flying = true;
        await dodo(15000);
        const f0 = g.renderer.info.render.frame, t0 = performance.now();
        const vues = [], appels = [], gaps = [], jum = [];
        let paires = 0, contacts = 0; const familles = {};
        const rect = (x, z, cap, dl = 2.2) => { const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux;
          return [[x + ux * dl + vx * 1.13, z + uz * dl + vz * 1.13], [x + ux * dl - vx * 1.13, z + uz * dl - vz * 1.13], [x - ux * dl - vx * 1.13, z - uz * dl - vz * 1.13], [x - ux * dl + vx * 1.13, z - uz * dl + vz * 1.13]]; };
        const separes = (P, Q) => { for (const R of [P, Q]) for (let k = 0; k < 4; k++) { const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0]; const pr = (S) => S.map((q) => q[0] * ax + q[1] * az); const p1 = pr(P), p2 = pr(Q); if (Math.max(...p1) < Math.min(...p2) || Math.max(...p2) < Math.min(...p1)) return true; } return false; };
        let n = 0, voitures = 0, longueur = 0, convois = 0, jumeaux = 0;
        while (performance.now() - t0 < duree * 1000) {
          await dodo(500); n++;
          appels.push(g.renderer.info.render.calls);
          let v = 0, vj = 0; voitures = 0; longueur = 0; convois = 0; jumeaux = 0;
          for (const c of g.vehicules.etat()) {
            if (!c.routier || c.nom === 'bus') continue;
            const loin = c.places.length === 0 && c.visibles === 0;
            const dans = c.places.filter((p) => Math.hypot(p[0] - g.player.pos.x, p[1] - g.player.pos.z) < 45).length;
            v += dans; if (c.jumeau) { vj += dans; }
            if (!loin) { convois++; voitures += c.total; longueur += c.longueur; if (c.jumeau) jumeaux++; }
            const vs = c.vitesses || [];
            (c.ecarts || []).forEach((e, i) => { if (vs[i] < 0.3 && vs[i + 1] < 0.3 && c.causes[i + 1] === 1) gaps.push(Math.round((e - 4.4) * 10) / 10); });
          }
          vues.push(v); jum.push(vj);
          const tout = [];
          for (const c of g.vehicules.etat()) if (c.routier) for (const p of c.places) tout.push({ x: p[0], z: p[1], cap: p[2], dl: c.nom === 'bus' ? 3.2 : 2.2, ligne: (c.cle || '').replace('|voie2', ''), j: !!c.jumeau, v: c.vitesses ? c.vitesses[p[3]] : 0, cause: c.causes ? c.causes[p[3]] : 0 });
          for (let i = 0; i < tout.length; i++) for (let j = i + 1; j < tout.length; j++) {
            if (Math.hypot(tout[i].x - tout[j].x, tout[i].z - tout[j].z) > 7) continue;
            paires++; if (!separes(rect(tout[i].x, tout[i].z, tout[i].cap, tout[i].dl), rect(tout[j].x, tout[j].z, tout[j].cap, tout[j].dl))) { contacts++; const a = tout[i], b = tout[j]; const k = (a.ligne === b.ligne ? (a.j !== b.j ? 'jumelles' : 'file') : 'autre' + (a.j || b.j ? 'J' : '') + '@' + Math.round((a.x + b.x) / 2) + ',' + Math.round((a.z + b.z) / 2)) + (a.v < 0.3 && b.v < 0.3 ? '-arret' : '-roule') + (Math.abs(Math.cos(a.cap - b.cap)) > 0.7 ? (Math.cos(a.cap - b.cap) > 0 ? '-meme' : '-face') : '-travers'); familles[k] = (familles[k] || 0) + 1; }
          }
        }
        const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
        return { images: g.renderer.info.render.frame - f0, convois, jumeaux, voitures, longueur,
          densite: longueur ? Math.round(10000 * voitures / longueur) / 10 : 0,
          contact: paires ? Math.round(1000 * contacts / paires) / 10 : null, paires, familles, vues: med(vues), vuesMax: Math.max(...vues), vuesJumeau: med(jum), appels: med(appels),
          fileArret: { n: gaps.length, mediane: med(gaps), p90: gaps.length ? [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length * 0.9)] : null } };
      }, { lieu, duree });
      console.log(lieu, JSON.stringify(out[lieu]));
      await page.close();
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
