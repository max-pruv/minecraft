// L'ARRÊT AU FEU (v447) — les relevés de vitesse des voitures visibles
// au-dessus de Paris, et les arrêts qui passent de 3 b/s ou plus à l'arrêt
// (un arrêt « sec » au-delà de 10 b/s², la règle du témoin de monte.js),
// comptés trois fois : cause « feu » à l'ARRIVÉE et heure de LECTURE (l'ancien
// témoin), la même à l'heure de l'IMAGE lue, et cause « feu » sur toute la
// DESCENTE. Mesuré sur `origin/main` (quatre fois 70 s) : lecture et image
// rendent les mêmes arrêts secs — l'horodatage n'y était pour rien —, et à la
// descente 5 secs sur 9 arrêts : des suiveuses recollées au plancher de la
// file en une image (corrigé en v447, 0 sur 12). Avec `gel` (ms), la page se
// fige ce temps toutes les deux secondes : la charge d'un portail, provoquée.
// Usage : node tests/sonde-feu-image.cjs [secondes] [gel ms]
const { Banc, souffler } = require('./banc.js');
const duree = Number(process.argv[2] || 60), gel = Number(process.argv[3] || 700);
(async () => {
  const banc = new Banc({ portJeu: 8431, portPairs: 9431 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeFeuImage');
    const r = await page.evaluate(async ({ duree, gel }) => {
      const m = await import('./src/mondes.js'); const P = m.positionDe('paris'); const g = window.__game;
      g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      await dodo(6000);
      let tImage = performance.now(), suivre = true;
      const image = () => { tImage = performance.now(); if (suivre) requestAnimationFrame(image); };
      requestAnimationFrame(image);
      const fige = gel > 0 ? setInterval(() => { const t = performance.now(); while (performance.now() - t < gel) { /* la page est prise */ } }, 2000) : null;
      const rel = [];
      const t0 = performance.now();
      while (performance.now() - t0 < duree * 1000) {
        await dodo(100);
        const lu = performance.now();
        g.vehicules.etat().forEach((c, ci) => {
          if (!c.routier || c.nom !== 'voiture' || !Array.isArray(c.vitesses)) return;
          for (const p of c.places) rel.push([ci + ':' + p[3], c.cle + ':' + p[3], c.vitesses[p[3]], lu, tImage, Array.isArray(c.causes) && c.causes.length ? c.causes[p[3]] : 1]);
        });
      }
      suivre = false; if (fige) clearInterval(fige);
      // un arrêt : une voiture qui passe d'au moins 3 b/s à moins de 0,3, à un
      // feu ; sec au-delà de 10 b/s² — la règle du témoin de monte.js
      const compter = (cle, t, toute = false) => {
        const suites = new Map();
        for (const r of rel) { const s = suites.get(r[cle]) || []; s.push(r); suites.set(r[cle], s); }
        let arrets = 0, secs = 0; const pires = [];
        for (const s of suites.values()) for (let i = 0; i < s.length; i++) {
          if (s[i][2] >= 0.3) continue;
          let j = i - 1; while (j >= 0 && s[j][2] < 3 && s[j][2] >= 0.3) j--;
          // (`toute` : la cause est le feu sur TOUTE la descente, pas seulement à l'arrivée)
          if (j >= 0 && s[j][2] >= 3 && s[i][5] === 1 && (!toute || s.slice(j, i + 1).every((x) => x[5] === 1))) {
            const dec = s[j][2] / Math.max(1e-3, (s[i][t] - s[j][t]) / 1000);
            arrets++; if (dec > 10) { secs++; pires.push(+dec.toFixed(1)); }
          }
          while (i < s.length && s[i][2] < 0.3) i++;
        }
        return { arrets, secs, pires: pires.slice(0, 5) };
      };
      return { gel, releves: rel.length, arrivee: compter(1, 3), arriveeImage: compter(1, 4), descente: compter(1, 3, true) };
    }, { duree, gel });
    console.log(JSON.stringify(r));
  } finally { await banc.fermer(); process.exit(0); }
})();
