// L'ARRIVÉE APRÈS UNE TÉLÉPORTATION, DÉCOUPÉE IMAGE PAR IMAGE (v420)
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
const PROFIL_MS = Number(process.env.PROFIL_MS || 0);   // 0 : tout ; sinon la première fenêtre de l'arrivée
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
      await cdp.send('Profiler.setSamplingInterval', { interval: PROFIL_MS ? 100 : 500 });
      await page.evaluate(() => new Promise((fin) => setTimeout(fin, 8000)));
      await page.evaluate((ms) => { window.__profilMs = ms; }, PROFIL_MS);
      await cdp.send('Profiler.start');
      let profilTot = null;
      if (PROFIL_MS) {
        (async () => {
          await page.waitForFunction(() => window.__profilFini, null, { timeout: 120000, polling: 50 });
          profilTot = (await cdp.send('Profiler.stop')).profile;
        })();
      }
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
        if (window.__profilMs) { await patienter(window.__profilMs); window.__profilFini = true; }
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
      const profile = profilTot || (await cdp.send('Profiler.stop')).profile;
      // temps propre par fonction, sur tout le profil
      const parId = new Map(profile.nodes.map((nd) => [nd.id, nd]));
      const propre = new Map();
      const dts = profile.timeDeltas;
      profile.samples.forEach((id, i) => {
        const nd = parId.get(id), f = nd.callFrame;
        const cle = `${f.functionName || '(anonyme)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`;
        propre.set(cle, (propre.get(cle) || 0) + (dts[i] || 0) / 1000);
      });
      // qui appelle les fonctions natives lourdes (getParameter, etc.) : la pile
      const parent = new Map();
      for (const nd of profile.nodes) for (const c of (nd.children || [])) parent.set(c, nd.id);
      const piles = new Map();
      profile.samples.forEach((id, i) => {
        const f = parId.get(id).callFrame;
        if (f.functionName !== 'getParameter' && f.functionName !== 'texImage2D' && f.functionName !== 'bufferData' && f.functionName !== 'compileShader' && f.functionName !== 'linkProgram') return;
        const pile = [];
        let q = parent.get(id);
        while (q && pile.length < 6) { const g = parId.get(q).callFrame; if (g.functionName) pile.push(`${g.functionName}@${g.url.split('/').pop()}:${g.lineNumber + 1}`); q = parent.get(q); }
        const cle = f.functionName + ' ← ' + pile.join(' ← ');
        piles.set(cle, (piles.get(cle) || 0) + (dts[i] || 0) / 1000);
      });
      r.natifs = [...piles].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => `${Math.round(v)} ms ${k}`);
      // temps INCLUSIF des fonctions appelées sous `frame` (main.js), deux niveaux
      const incl = new Map();
      const sousFrame = (id) => { const pile = []; let q = id; while (q) { pile.push(q); q = parent.get(q); } return pile.reverse(); };
      profile.samples.forEach((id, i) => {
        const pile = sousFrame(id).map((q) => parId.get(q).callFrame);
        const k = pile.findIndex((f) => f.functionName === 'frame' && /main\.js/.test(f.url));
        if (k < 0) return;
        for (const prof of (process.env.NIVEAUX || '1,2').split(',').map(Number)) {
          const f = pile[k + prof]; if (!f) continue;
          const cle = `${'  '.repeat(prof - 1)}${f.functionName || '(anonyme)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`;
          incl.set(cle, (incl.get(cle) || 0) + (dts[i] || 0) / 1000);
        }
      });
      r.sousFrame = [...incl].sort((x, y) => y[1] - x[1]).slice(0, 24).map(([k, v]) => `${Math.round(v)} ms ${k}`);
      r.profil = [...propre].sort((x, y) => y[1] - x[1]).slice(0, 18).map(([k, v]) => `${Math.round(v)} ms ${k}`);
      r.params = params;
      console.log(JSON.stringify(r, null, 1));
      await page.context().close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
