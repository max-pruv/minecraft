// L'ARRIVÉE APRÈS UNE TÉLÉPORTATION, DÉCOUPÉE IMAGE PAR IMAGE (v418)
//
// Ce qui reste du gel de téléportation après la v403 : une pire image de 250 à
// 300 ms en scène VIDE, non attribuée (`sonde-arrivee-journal.cjs`). Cette
// sonde sépare, pour chaque image de l'arrivée :
//   • le travail de la boucle du jeu (`statsMaillage.travailMs`), dont le rendu ;
//   • l'installation des morceaux reçus du worker (hors boucle, `installMs`) ;
//   • ce que le fil principal engendre lui-même (`generateChunk` enveloppé) ;
//   • le reste (ramasse-miettes, compositeur, tâches hors jeu).
// Et un profil (Profiler du protocole) nomme les fonctions qui portent le
// temps propre des images lentes.
// `vide=1` retire le dessin (v379) : ce qui reste se transpose à la tablette.
//
// Usage : node sonde-arrivee-decoupe.cjs [ville] [tours] [variantes]
//   ex. node sonde-arrivee-decoupe.cjs paris 2 '&vide=1&recharge=arrivee'
const { Banc, souffler } = require('./banc.js');
const ville = process.argv[2] || 'paris';
const tours = Number(process.argv[3] || 2);
const variantes = (process.argv[4] || '&vide=1&recharge=arrivee').split('|');
const rr = 12;
(async () => {
  const banc = new Banc({ portJeu: 8412, portPairs: 9412 });
  await banc.ouvrir();
  try {
    let n = 0;
    for (let tour = 0; tour < tours; tour++) for (const params of variantes) {
      await souffler();
      const page = await banc.jouerSeul(`Decoupe${n++}`, { rr, params });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
      await page.evaluate(() => new Promise((fin) => setTimeout(fin, 8000)));
      await cdp.send('Profiler.start');
      const r = await page.evaluate(async ({ ville, rr }) => {
        const g = window.__game, s = g.statsMaillage, w = g.world;
        const { positionDe } = await import('./src/mondes.js');
        const patienter = (ms) => new Promise((fin) => setTimeout(fin, ms));
        if (location.search.includes('vide=1')) {
          const rendre = g.renderer.render.bind(g.renderer), vide = new g.scene.constructor();
          g.renderer.render = (sc, c) => rendre(vide, c);
        }
        const gen = w.generateChunk.bind(w);
        let genMs = 0, genN = 0;
        w.generateChunk = (cx, cz) => { const a = performance.now(); const d = gen(cx, cz); genMs += performance.now() - a; genN++; return d; };
        const C = positionDe(ville), p = g.player;
        const y = w.terrainHeight(C.x, C.z) + 3;
        p.flying = true; p.pos.set(C.x + 0.5, y, C.z + 0.5); p.vel.set(0, 0, 0);
        const t0 = performance.now();
        const images = [];
        let prec = t0, suivre = true;
        let a = { tr: s.travailMs, re: s.renduMs, in: s.installMs, pr: s.principalMs, ge: genMs, di: s.distants };
        const tic = (tt) => {
          if (!suivre) return;
          const b = { tr: s.travailMs, re: s.renduMs, in: s.installMs, pr: s.principalMs, ge: genMs, di: s.distants };
          const d = tt - prec;
          images.push({ t: Math.round(prec - t0), d: Math.round(d), travail: Math.round(b.tr - a.tr),
            rendu: Math.round(b.re - a.re), install: Math.round(b.in - a.in), maillageLocal: Math.round(b.pr - a.pr),
            generation: Math.round(b.ge - a.ge), recus: b.di - a.di });
          a = b; prec = tt;
          p.pos.set(C.x + 0.5, y, C.z + 0.5); p.vel.set(0, 0, 0);
          requestAnimationFrame(tic);
        };
        requestAnimationFrame(tic);
        await patienter(20000);
        suivre = false;
        const somme = images.reduce((x, i) => x + i.d, 0) || 1;
        const lentes = images.filter((i) => i.d > 120).sort((x, y) => y.d - x.d).slice(0, 8);
        const tot = (k) => Math.round(images.reduce((x, i) => x + i[k], 0));
        return { ville, images: images.length, cadence: +(images.length / (somme / 1000)).toFixed(1),
          pire: Math.max(...images.map((i) => i.d)), au150: +(images.filter((i) => i.d > 150).reduce((x, i) => x + i.d, 0) / somme * 100).toFixed(1),
          totaux: { travail: tot('travail'), rendu: tot('rendu'), install: tot('install'), maillageLocal: tot('maillageLocal'), generation: tot('generation'), recus: tot('recus') },
          lentes };
      }, { ville, rr });
      const { profile } = await cdp.send('Profiler.stop');
      // temps propre par fonction, sur tout le profil
      const parId = new Map(profile.nodes.map((nd) => [nd.id, nd]));
      const propre = new Map();
      const dts = profile.timeDeltas;
      profile.samples.forEach((id, i) => {
        const nd = parId.get(id), f = nd.callFrame;
        const cle = `${f.functionName || '(anonyme)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`;
        propre.set(cle, (propre.get(cle) || 0) + (dts[i] || 0) / 1000);
      });
      r.profil = [...propre].sort((x, y) => y[1] - x[1]).slice(0, 18).map(([k, v]) => `${Math.round(v)} ms ${k}`);
      r.params = params;
      console.log(JSON.stringify(r, null, 1));
      await page.context().close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
