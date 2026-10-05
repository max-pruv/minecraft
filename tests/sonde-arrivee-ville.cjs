// L'ÉCRAN SE FIGE-T-IL EN ARRIVANT SUR UNE VILLE, ET POURQUOI ? (v373)
//
// Le témoin de `monte.js` (v235) est rouge des deux côtés depuis plusieurs
// portails : 1 367 ms · 21,7 % sur la branche de la v360, 2 350 ms · 20,5 % sur
// `origin/main`. Il ne mesure que la durée des images ; on rejoue SON vol (le
// chasseur, à sa pointe, de 700 blocs en amont de Paris, dix-huit secondes) et
// l'on sépare, image par image, ce qui la remplit :
//   • l'installation des morceaux reçus du worker (`statsMaillage.installMs`) ;
//   • les programmes de shaders compilés (`renderer.info.programs.length`) ;
//   • le temps JavaScript de `renderer.render` et les appels de dessin ;
//   • et, en contre-épreuve, la même chose dans une scène VIDE (`vide=1`,
//     v360) : ce qui reste des images longues quand on retire le dessin est ce
//     qui se transpose à la tablette ; le reste est SwiftShader.
//
// Usage : node sonde-arrivee-ville.cjs [tours] [variantes]
const { Banc, souffler } = require('./banc.js');
const tours = Number(process.argv[2] || 2);
const variantes = (process.argv[3] || '|&vide=1').split('|');
(async () => {
  const banc = new Banc({ portJeu: 8402, portPairs: 9402 });
  await banc.ouvrir();
  try {
    let n = 0;
    for (let tour = 0; tour < tours; tour++) {
      const ordre = tour % 2 ? [...variantes].reverse() : variantes;
      for (const params of ordre) {
        await souffler();
        const page = await banc.jouerSeul(`Arrivee${n++}`, { rr: 12, params });
        const r = await page.evaluate(async () => {
          const g = window.__game;
          const m = await import('./src/montures.js');
          const { positionDe } = await import('./src/mondes.js');
          const def = m.MONTURES.find((d) => d.key === 'chasseur');
          const V = positionDe('paris');
          const vide = location.search.includes('vide=1');
          const rendre = g.renderer.render.bind(g.renderer), sceneVide = new g.scene.constructor();
          let jsRendu = 0, appels = 0;
          g.renderer.render = (s, c) => {
            const t = performance.now();
            rendre(vide && s === g.scene ? sceneVide : s, c);
            jsRendu += performance.now() - t;
            if (s === g.scene) appels = g.renderer.info.render.calls;
          };
          const longues = [];
          const obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) longues.push(e.duration); });
          try { obs.observe({ entryTypes: ['longtask'] }); } catch (e) { /* absent */ }
          const x0 = V.x - 700;
          g.player.pos.set(x0, 96, V.z);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
          g.player.flying = true;
          g.player.pilote = def.pilote;
          g.player.vitesseAvion = def.pilote.max;
          g.player.avionEnVol = true; g.player.avionEtat = 'vol';
          g.player.altitudeDecollage = -9999;
          await new Promise((f) => setTimeout(f, 3000));
          longues.length = 0;
          const S = g.statsMaillage, info = g.renderer.info;
          const images = [];
          let prec = performance.now(), actif = true;
          let i0 = S.installMs, d0 = S.distants, p0 = info.programs.length, j0 = jsRendu, c0 = S.principalMs || 0;
          const tic = (t) => {
            images.push({ d: t - prec, inst: S.installMs - i0, n: S.distants - d0, prog: info.programs.length - p0,
              js: jsRendu - j0, appels, local: (S.principalMs || 0) - c0 });
            prec = t; i0 = S.installMs; d0 = S.distants; p0 = info.programs.length; j0 = jsRendu; c0 = S.principalMs || 0;
            if (actif) requestAnimationFrame(tic);
          };
          requestAnimationFrame(tic);
          await new Promise((f) => setTimeout(f, 18000));
          actif = false; obs.disconnect();
          const parcouru = Math.round(g.player.pos.x - x0);
          g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
          g.player.vitesseAvion = undefined; g.player.flying = false;
          g.renderer.render = rendre;
          const total = images.reduce((a, c) => a + c.d, 0) || 1;
          const lentes = images.filter((i) => i.d > 300);
          const somme = (a, k) => Math.round(a.reduce((x, y) => x + y[k], 0));
          return { parcouru, images: images.length, cadence: +(images.length / (total / 1000)).toFixed(1),
            pire: Math.round(Math.max(...images.map((i) => i.d))),
            au300: +(lentes.reduce((a, c) => a + c.d, 0) / total * 100).toFixed(1),
            lentes: lentes.length, lentesMs: somme(lentes, 'd'),
            dansLesLentes: { installMs: somme(lentes, 'inst'), morceaux: somme(lentes, 'n'), programmes: somme(lentes, 'prog'),
              rendreJsMs: somme(lentes, 'js'), maillageLocalMs: somme(lentes, 'local'),
              appelsMoyens: Math.round(lentes.reduce((a, c) => a + c.appels, 0) / (lentes.length || 1)) },
            partout: { installMs: somme(images, 'inst'), programmes: somme(images, 'prog'), rendreJsMs: somme(images, 'js'),
              maillageLocalMs: somme(images, 'local'), appelsMax: Math.max(...images.map((i) => i.appels)) },
            longues: longues.length, longuesMs: Math.round(longues.reduce((a, c) => a + c, 0)), pireLongue: Math.round(Math.max(0, ...longues)) };
        });
        r.params = params || '(dessin)';
        console.log(JSON.stringify(r));
        await page.context().close();
      }
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
