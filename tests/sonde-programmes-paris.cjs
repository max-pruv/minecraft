// QUELS PROGRAMMES SE COMPILENT ENCORE À L'ARRIVÉE ? (v380)
//
// Le témoin de `monte.js` « se téléporter dans une ville ne compile plus de
// programmes » a rendu, la chauffe de New York FINIE (321/321), trois
// programmes neufs à Paris (`physical…`). Cette sonde rejoue SON trajet (page
// rr 6, chauffe attendue, Jouer, Paris) et nomme chaque programme neuf : sa clé
// complète, la case qui diffère de la clé ancienne la plus proche (méthode de
// la v319), et les objets de la scène qui le portent.
// Usage : node sonde-programmes-paris.cjs [lieux]
const { Banc, souffler } = require('./banc.js');
const lieux = (process.argv[2] || 'paris').split(',');
(async () => {
  const banc = new Banc({ portJeu: 8401, portPairs: 9401 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.joueur('Programmine', { rr: 6 });
    const c = await page.evaluate(async () => {
      const t0 = performance.now();
      while (performance.now() - t0 < 120000) {
        const c = window.__chauffeNY();
        if (c.finie) return { ...c, ms: Math.round(performance.now() - t0) };
        await new Promise((f) => setTimeout(f, 250));
      }
      return { expire: true, ...window.__chauffeNY() };
    });
    console.log('chauffe', JSON.stringify(c));
    await page.evaluate(() => { window.__game.edu.today().libreJusqua = 86400; document.getElementById('play-btn').click(); });
    await page.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    for (const cle of lieux) {
      const r = await page.evaluate(async (cle) => {
        const g = window.__game, info = g.renderer.info;
        const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        let n = info.programs.length, stable = 0;
        const t0 = performance.now();
        while (stable < 3 && performance.now() - t0 < 40000) { await dodo(1000); if (info.programs.length === n) stable++; else { stable = 0; n = info.programs.length; } }
        const avant = info.programs.map((p) => p.cacheKey);
        const avantSet = new Set(avant);
        const { positionDe } = await import('./src/mondes.js');
        const P = positionDe(cle);
        const dx = cle === 'paris' ? 20 : 0, dz = cle === 'paris' ? -30 : 0;
        window.__carte.surTeleport(P.x + dx, P.z + dz);
        await dodo(20000);
        const neufs = info.programs.filter((p) => !avantSet.has(p.cacheKey));
        const out = [];
        for (const p of neufs) {
          const k = p.cacheKey.split(',');
          let best = null, bd = 1e9;
          for (const a of avant) { const ka = a.split(','); if (ka[0] !== k[0] || ka.length !== k.length) continue; let d = 0; const diff = []; for (let i = 0; i < k.length; i++) if (ka[i] !== k[i]) { d++; diff.push(`${i}:${ka[i]}→${k[i]}`); } if (d < bd) { bd = d; best = diff; } }
          const porteurs = [];
          g.scene.traverse((o) => {
            for (const m of [].concat(o.material || [])) {
              const pr = g.renderer.properties.get(m);
              if (pr && pr.programs && [...pr.programs.values()].includes(p)) porteurs.push(`${o.type}:${o.name || '?'}/${m.type}:${m.name || '?'}${o.parent ? ' ⊂ ' + (o.parent.name || o.parent.type) : ''}`);
            }
          });
          out.push({ type: k[0], diff: best, porteurs: [...new Set(porteurs)].slice(0, 6), cle: p.cacheKey.slice(0, 400) });
        }
        return { cle, neufs: neufs.length, out };
      }, cle);
      console.log(JSON.stringify(r, null, 1));
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
