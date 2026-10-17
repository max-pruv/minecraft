// DEUX VOISINES D'UN CONVOI, REJOUÉ SEUL (v480).
// Le passage de `monte.js` recopié, posé au-dessus de Paris comme son
// prédécesseur : sert la double mesure de la règle v195. Trois passages.
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: +(process.env.PORT || 8399), portPairs: +(process.env.PORT || 8399) + 1000 });
  await banc.ouvrir();
  try {
    for (let k = 0; k < 3; k++) {
      await souffler();
      const page = await banc.jouerSeul('SondeEcart' + k, { tactile: true });
      await page.evaluate(async () => {
        const m = await import('./src/mondes.js'); const P = m.positionDe('paris'); const g = window.__game;
        g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
      });
      await page.waitForTimeout(20000);
    const teles = await page.evaluate(async () => {
      const g = window.__game;
      let minTrace = Infinity, minVrai = Infinity, releves = 0, paires = 0;
      let ouTrace = null, ouVrai = null, publie = false;
      const t0 = performance.now();
      while (performance.now() - t0 < 30000) {
        await new Promise((f) => setTimeout(f, 200));
        const cs = (window.__vehicules.etat() || []).filter((c) => c.routier);
        if (!cs.length) continue;
        releves++;
        for (const c of cs) {
          if (Array.isArray(c.ecarts) && c.ecarts.length) {
            publie = true;
            for (let i = 0; i < c.ecarts.length; i++) {
              if (c.ecarts[i] < minTrace) { minTrace = c.ecarts[i]; ouTrace = [c.nom, i, c.ecart]; }
            }
          }
          // les places sont [x, z, cap, i, retard, attend] — on apparie par
          // indice CONSÉCUTIF dans le même convoi, la seule paire qui se suit
          const par = new Map(c.places.map((p) => [p[3], p]));
          for (const [i, a] of par) {
            const b = par.get(i + 1);
            if (!b) continue;
            paires++;
            const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
            if (d < minVrai) { minVrai = d; ouVrai = [c.nom, i, +d.toFixed(2)]; }
          }
        }
      }
      return {
        publie, releves, paires,
        minTrace: minTrace === Infinity ? null : +minTrace.toFixed(2),
        minVrai: minVrai === Infinity ? null : +minVrai.toFixed(2),
        ouTrace, ouVrai, ou: [Math.round(g.player.pos.x), Math.round(g.player.pos.z)],
      };
    });
      console.log(JSON.stringify(teles), teles.minTrace >= 4.39 ? 'VERT' : 'ROUGE');
      await page.close();
    }
  } finally { await banc.fermer(); }
  process.exit(0);
})().catch((e) => { console.error('💥', e); process.exit(2); });
