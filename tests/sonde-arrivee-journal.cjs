// L'ARRIVÉE APRÈS UNE TÉLÉPORTATION, CHEZ UN ENFANT QUI A BEAUCOUP BÂTI (v403)
//
// Le gel de téléportation (dettes de la v241 et de la v246) se mesurait sur un
// banc qui n'a posé AUCUN bloc. Or `generateChunk` relisait tout le journal de
// l'enfant pour chaque morceau — dans le worker (le débit du disque) ET sur le
// fil principal, qui engendre lui-même les morceaux dont il a besoin tout de
// suite (collisions, passants, sol sous l'enfant). On rejoue donc l'arrivée à
// Paris avec un journal fabriqué de N blocs (une maison, des villages autour du
// point d'apparition et de Paris), et l'on sépare :
//   • le débit : à quelle seconde la moitié, puis 90 % du disque sont maillés ;
//   • le fil principal : combien de morceaux il engendre lui-même, et combien
//     de millisecondes cela lui prend (`generateChunk` enveloppé) ;
//   • la cadence, la pire image, la part du temps au-delà de 300 ms.
// `vide=1` (v360) retire le dessin : ce qui reste se transpose à la tablette.
//
// Usage : node sonde-arrivee-journal.cjs [blocs] [tours] [variantes]
//   ex. node sonde-arrivee-journal.cjs 80000 2 '&vide=1&recharge=arrivee'
// Pour l'ancien code, on lance la MÊME sonde depuis un arbre détaché.
const { Banc, souffler } = require('./banc.js');
const blocs = Number(process.argv[2] || 80000);
const tours = Number(process.argv[3] || 2);
const variantes = (process.argv[4] || '&vide=1&recharge=arrivee').split('|');
const rr = 12;
(async () => {
  const banc = new Banc({ portJeu: 8411, portPairs: 9411 });
  await banc.ouvrir();
  try {
    let n = 0;
    for (let tour = 0; tour < tours; tour++) for (const params of variantes) for (const N of [0, blocs]) {
      await souffler();
      const page = await banc.jouerSeul(`Journal${n++}`, { rr, params });
      const r = await page.evaluate(async ({ N, rr }) => {
        const g = window.__game;
        const { positionDe } = await import('./src/mondes.js');
        const CHUNK = 16, R = rr;
        const patienter = (ms) => new Promise((fin) => {
          const t0 = performance.now();
          const tic = () => (performance.now() - t0 < ms ? requestAnimationFrame(tic) : fin());
          requestAnimationFrame(tic);
        });
        // le journal fabriqué (même générateur que `journalFabrique`)
        if (N) {
          let s = 7;
          const r = () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296);
          const sites = [[-100, -100], [40, 60], [-300, 200], [500, -400], [1200, 800], [-2000, 1500], [3000, -2500], [150, -700]];
          const m = new Map(), t = new Map();
          let i = 0;
          while (m.size < N) {
            const st = sites[i++ % sites.length];
            const x = Math.round(st[0] + (r() - 0.5) * 60), z = Math.round(st[1] + (r() - 0.5) * 60);
            const k = `${x},${34 + Math.floor(r() * 20)},${z}`;
            m.set(k, 1 + Math.floor(r() * 30)); t.set(k, 1.9e12 + i);
          }
          g.world.installerEdits(m, t, g.world.ctx);
          // la boucle du jeu resynchronise le worker et refait tout (changement de monde)
          g.world.allDirty = true;
        }
        await patienter(8000);
        if (location.search.includes('vide=1')) {
          const rendre = g.renderer.render.bind(g.renderer), vide = new g.scene.constructor();
          g.renderer.render = (sc, c) => rendre(vide, c);
        }
        // le fil principal : chaque morceau qu'il engendre lui-même
        const w = g.world, gen = w.generateChunk.bind(w);
        let fp = 0, fpMs = 0;
        w.generateChunk = (cx, cz) => { const a = performance.now(); const d = gen(cx, cz); fpMs += performance.now() - a; fp++; return d; };
        const C = positionDe('paris');
        const p = g.player;
        const y = w.terrainHeight(C.x, C.z) + 3;
        p.flying = true; p.pos.set(C.x + 0.5, y, C.z + 0.5); p.vel.set(0, 0, 0);
        const pcx = Math.floor(C.x / CHUNK), pcz = Math.floor(C.z / CHUNK);
        const total = (2 * R + 1) ** 2;
        const compter = () => { let k = 0; for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) if (g.chunkMeshes.has(`${pcx + dx},${pcz + dz}`)) k++; return k; };
        const t0 = performance.now();
        const durees = []; let prec = t0, suivre = true, a50 = null, a90 = null;
        const tic = (tt) => {
          if (!suivre) return;
          durees.push(tt - prec); prec = tt;
          p.pos.set(C.x + 0.5, y, C.z + 0.5); p.vel.set(0, 0, 0);
          const k = compter();
          if (a50 === null && k >= total * 0.5) a50 = Math.round(tt - t0);
          if (a90 === null && k >= total * 0.9) a90 = Math.round(tt - t0);
          requestAnimationFrame(tic);
        };
        requestAnimationFrame(tic);
        await patienter(20000);
        suivre = false;
        const tri = [...durees].sort((a, b) => a - b), somme = durees.reduce((a, c) => a + c, 0) || 1;
        return { N, journal: w.edits.size, a50, a90, final: compter(), total,
          filPrincipal: { morceaux: fp, ms: Math.round(fpMs) },
          cadence: +(durees.length / (somme / 1000)).toFixed(1), pire: Math.round(tri[tri.length - 1]),
          au300: +(durees.filter((d) => d > 300).reduce((a, c) => a + c, 0) / somme * 100).toFixed(1) };
      }, { N, rr });
      r.params = params;
      console.log(JSON.stringify(r));
      await page.context().close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
