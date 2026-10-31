// Sonde (claude/temoins-intermittents) : « une voiture de la rue heurtée par
// l'enfant s'arrête… » rendait `id: null` au portail. `heurter(x, z)` cherche
// dans `dernieres` (la collecte de `cederLePassage`, AVANT `update`) ; le témoin
// lui donnait la position du MAILLAGE (`etat().places`, APRÈS `update`). On
// mesure l'écart entre les deux pour la même voiture, sans charge puis avec une
// image lente (on brûle N ms de fil principal par image, v451).
//     node tests/sonde-heurter-image.cjs
const { Banc, dormir } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8472, portPairs: 9472 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Heurt', { rr: 2, pret: true });
    await tab.evaluate(async () => {
      const m = await import('./src/mondes.js'); const P = m.positionDe('paris'); const g = window.__game;
      g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
    });
    await dormir(20000);
    for (const brule of [0, 300, 800]) {
      const r = await tab.evaluate(async (brule) => {
        const g = window.__game, v = g.vehicules, dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        let actif = true;
        const burn = () => { if (!actif) return; const t = performance.now(); while (performance.now() - t < brule); requestAnimationFrame(burn); };
        if (brule) requestAnimationFrame(burn);
        const ecarts = []; let nuls = 0, essais = 0;
        for (let k = 0; k < 30; k++) {
          await dodo(150);
          const diag = new Map(v.diagCeder().filter((a) => a.nom).map((a) => [a.nom, a]));
          v.etat().forEach((c, ci) => {
            if (!c.routier || c.nom !== 'voiture') return;
            for (const p of c.places) if ((c.vitesses[p[3]] || 0) > 4) {
              const a = diag.get(`${c.cle}#${p[3]}`);
              if (a) ecarts.push(Math.hypot(a.x - p[0], a.z - p[1]));
            }
          });
          // l'ancien geste du témoin, sans heurter (on lit seulement si heurter trouverait)
          let cible = null;
          v.etat().forEach((c) => { if (cible || !c.routier || c.nom !== 'voiture') return; for (const p of c.places) if ((c.vitesses[p[3]] || 0) > 4 && !cible) cible = p; });
          if (cible) { essais++; const proche = v.diagCeder().some((a) => a.nom && (a.x - cible[0]) ** 2 + (a.z - cible[1]) ** 2 < 4.5 * 4.5); if (!proche) nuls++; }
        }
        actif = false;
        ecarts.sort((a, b) => a - b);
        const q = (f) => ecarts.length ? +ecarts[Math.floor(f * (ecarts.length - 1))].toFixed(2) : null;
        return { brule, n: ecarts.length, med: q(0.5), p90: q(0.9), max: q(1), essais, nuls };
      }, brule);
      console.log(JSON.stringify(r));
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
