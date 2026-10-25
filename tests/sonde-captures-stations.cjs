// Captures des stations de métro, pour juger sur image (v529) : le quai, le
// mur d'en face, l'escalier, la salle des billets — Paris et Washington. Les
// vues se posent dans le repère de chaque station (rien d'écrit en blocs), si
// bien qu'elles visent la même chose sur l'ancien code et sur le neuf.
//   RACINE=<dépôt> node tests/sonde-captures-stations.cjs <dossier> <tag> [vues]
const path = require('path');
const racine = process.env.RACINE || path.resolve(__dirname, '..');
const { Banc, souffler } = require(path.join(racine, 'tests/banc.js'));
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'avant';

// ville, station, quoi
const VUES = [
  ['paris', 'Concorde', 'quai'],
  ['paris', 'Concorde', 'face'],
  ['paris', 'Concorde', 'escalier'],
  ['paris', 'Concorde', 'salle'],
  ['paris', 'Bastille', 'quai'],
  ['paris', 'Hôtel de Ville', 'escalier'],
  ['paris', 'Hôtel de Ville', 'rue'],
  ['paris', 'Reuilly–Diderot', 'plaque'],
  ['dc', 'Archives', 'quai'],
  ['dc', 'Archives', 'face'],
  ['dc', 'Archives', 'escalier'],
  ['dc', 'Archives', 'mezzanine'],
  ['dc', 'Dupont Circle', 'quai'],
];

(async () => {
  const banc = new Banc({ portJeu: 8399, portPairs: 9399 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 6, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1' });
    for (const [ville, nom, quoi] of VUES.filter((v) => !process.argv[4] || process.argv[4].split(',').includes(v.join('-')))) {
      try {
        const info = await page.evaluate(async ({ ville, nom, quoi }) => {
          const g = window.__game;
          const w = g.world;
          const plein = (x, y, z) => { const id = w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)); return id !== 0 && id !== 7; };
          // le sol sous (x, z), en descendant depuis y0
          const sol = (x, z, y0) => { for (let y = Math.floor(y0); y > y0 - 12; y--) if (plein(x, y - 1, z) && !plein(x, y, z)) return y; return y0; };
          let x, z, y0, cx, cz, cy = null;
          if (ville === 'paris') {
            const V = await import('./src/ville.js');
            const q = V.QUAIS_LIGNE1.find((s) => s.nom === nom);
            const b = V.BOUCHES_LIGNE1.find((s) => s && s.nom === nom);
            const yr = V.LIGNE1.voie;
            const P = (le, tr) => [q.x + q.dx * le - q.dz * tr, q.z + q.dz * le + q.dx * tr];
            const sg = b ? b.cote : 1;
            if (quoi === 'quai') { [x, z] = P(-10, sg * 4.8); [cx, cz] = P(8, sg * 3.6); y0 = yr + 2; }
            if (quoi === 'face') { [x, z] = P(4, sg * 4.6); [cx, cz] = P(3, -sg * 7); y0 = yr + 2; }
            // le piédroit du côté de la bouche, à la case du nom (v555)
            if (quoi === 'plaque') { [x, z] = P(4, -sg * 2.5); [cx, cz] = P(8.5, sg * 7); y0 = yr + 2; }
            if (quoi === 'escalier' || quoi === 'salle') {
              const pe = (m) => V.pointEsc(q, b, m, 0);
              if (quoi === 'escalier') { [x, z] = pe(1); [cx, cz] = pe(9); y0 = yr + 3; cy = yr + 9; }
              else { [x, z] = pe(-5); [cx, cz] = pe(2); y0 = yr + 2; }
            }
            // la trémie vue de la rue (v555) : de l'autre bout, en surplomb
            if (quoi === 'rue') {
              const pe = (m, t = 0) => V.pointEsc(q, b, m, t);
              [x, z] = pe(V.LONG_ESC + 9, 3); [cx, cz] = pe(V.LONG_ESC - 4); y0 = yr + 16 + 4; cy = yr + 16;
            }
          } else {
            const D = await import('./src/washington.js');
            const q = D.QUAIS_METRO.find((s) => s.nom === nom);
            const b = D.BOUCHES_METRO.find((s) => s.nom === nom);
            const fin = q.fin || 1, k0 = q.k0 === undefined ? 7 : q.k0, lat = b.lat || 1;
            const P = (k, t) => [D.WASHINGTON.x + q.u + q.du * k * fin - q.dv * t * lat, D.WASHINGTON.z + q.v + q.dv * k * fin + q.du * t * lat];
            if (quoi === 'quai') { [x, z] = P(-10, 0.4); [cx, cz] = P(10, 0); y0 = q.y + 2; }
            if (quoi === 'face') { [x, z] = P(-4, 1.6); [cx, cz] = P(-5, 8); y0 = q.y + 2; }
            if (quoi === 'escalier') { [x, z] = P(k0 - 3, 0); [cx, cz] = P(k0 + 6, 0); y0 = q.y + 2; cy = q.y + 8; }
            if (quoi === 'mezzanine') { [x, z] = P(k0 + 7.5, -1); [cx, cz] = P(k0 + 7.5, 12); y0 = q.y + 7; }
          }
          const y = sol(x, z, y0 + 0.5);
          g.player.flying = true;
          g.player.pos.set(x, y, z);
          g.player.vel.set(0, 0, 0);
          const dx = cx - x, dz = cz - z, d = Math.hypot(dx, dz);
          g.player.yaw = Math.atan2(-dx, -dz);
          g.player.pitch = cy === null ? 0.06 : Math.atan2(cy - (y + 1.6), d);
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now();
          while (performance.now() - t0 < 25000) {
            await dodo(500);
            const n = g.chunkMeshes.size; if (n === (window.__n0 || -1)) { await dodo(2500); break; } window.__n0 = n;
          }
          return { x: +x.toFixed(1), y, z: +z.toFixed(1), appels: g.renderer.info.render.calls };
        }, { ville, nom, quoi });
        const f = path.join(dossier, `${tag}-${ville}-${nom.replace(/[^A-Za-z]/g, '')}-${quoi}.png`);
        await page.screenshot({ path: f, timeout: 120000 });
        console.log(ville, nom, quoi, JSON.stringify(info), '→', f);
      } catch (e) { console.log(ville, nom, quoi, 'ÉCHEC :', String(e && e.message || e).split('\n')[0]); }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
