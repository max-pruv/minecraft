// LA PRÉPARATION DE L'ACCUEIL, MESURÉE (v318) : le témoin « corps, programmes et
// fond de carte » de maj.js rend son verdict à la borne des 45 s ; on relève ici
// quand chaque morceau est prêt, le nombre de pas du fond de carte, les tâches
// longues du fil principal et les convois nés pendant l'accueil.
// Usage : node tests/sonde-prep-carte.cjs [passages]
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8421, portPairs: 9421 });
  await banc.ouvrir();
  try {
    for (let k = 0; k < +(process.argv[2] || 2); k++) {
      await souffler();
      const page = await banc.joueur('Prep' + k, { prep: 1 });
      await page.evaluate(() => {
        window.__longues = [];
        new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)); })
          .observe({ type: 'longtask', buffered: true });
      });
      const t0 = Date.now();
      let fin = null, tCarte = null, tProg = null, tHum = null;
      while (Date.now() - t0 < 60000) {
        const e = await page.evaluate(() => ({ p: window.__preparation ? window.__preparation() : null,
          convois: window.__vehicules && window.__vehicules.etat ? (window.__vehicules.etat() || []).length : -1 })).catch(() => null);
        const t = Date.now() - t0;
        if (e && e.p) {
          if (e.p.carte && tCarte === null) tCarte = t;
          if (e.p.programmes >= e.p.aChauffer && tProg === null) tProg = t;
          if (e.p.humains && tHum === null) tHum = t;
          if (e.p.prete) { fin = { t, ...e }; break; }
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      const longues = await page.evaluate(() => window.__longues);
      longues.sort((a, b) => b - a);
      console.log(JSON.stringify({ fin: fin && fin.t, humains: tHum, programmes: tProg, carte: tCarte,
        cartePas: fin && fin.p.cartePas, convois: fin && fin.convois, longues: longues.slice(0, 8), totalLongues: longues.reduce((s, x) => s + x, 0) }));
      await page.close();
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
