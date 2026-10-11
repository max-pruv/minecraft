// L'ARRÊT AU FEU, HORODATÉ DE DEUX FAÇONS (v442) — la même suite de relevés
// de vitesse au-dessus de Paris, l'heure de chaque relevé prise (a) quand on le
// LIT (l'ancien témoin de monte.js) et (b) à l'IMAGE dont il lit l'état (le
// rappel d'image qui suit la boucle du jeu). Avec `gel` (ms), la page se fige
// ce temps-là toutes les deux secondes — la charge d'un portail, provoquée :
// un « arrêt sec » qui n'existe qu'en (a) est un artefact de mesure.
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
      const suites = new Map(), tLu = new Map(), tIm = new Map(), feu = new Map();
      const t0 = performance.now();
      while (performance.now() - t0 < duree * 1000) {
        await dodo(100);
        g.vehicules.etat().forEach((c, ci) => {
          if (!c.routier || c.nom !== 'voiture' || !Array.isArray(c.vitesses)) return;
          for (const p of c.places) {
            const k = ci + ':' + p[3];
            const push = (M, v) => { const s = M.get(k) || []; s.push(v); M.set(k, s); };
            push(suites, c.vitesses[p[3]]); push(tLu, performance.now()); push(tIm, tImage);
            push(feu, Array.isArray(c.causes) && c.causes.length ? c.causes[p[3]] : 1);
          }
        });
      }
      suivre = false; if (fige) clearInterval(fige);
      const compter = (T) => {
        let arrets = 0, secs = 0; const pires = [];
        for (const [k, s] of suites) for (let i = 0; i < s.length; i++) {
          if (s[i] >= 0.3) continue;
          let j = i - 1; while (j >= 0 && s[j] < 3 && s[j] >= 0.3) j--;
          if (j >= 0 && s[j] >= 3 && feu.get(k)[i] === 1) {
            const ts = T.get(k), dec = s[j] / Math.max(1e-3, (ts[i] - ts[j]) / 1000);
            arrets++; if (dec > 10) { secs++; pires.push(+dec.toFixed(1)); }
          }
          while (i < s.length && s[i] < 0.3) i++;
        }
        return { arrets, secs, pires: pires.slice(0, 6) };
      };
      return { gel, lu: compter(tLu), image: compter(tIm) };
    }, { duree, gel });
    console.log(JSON.stringify(r));
  } finally { await banc.fermer(); process.exit(0); }
})();
