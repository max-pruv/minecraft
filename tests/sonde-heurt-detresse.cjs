// Rejoue le témoin « voiture heurtée … feux de détresse » 6 fois, sans charge et à 300 ms/image.
const { Banc, dormir } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8473, portPairs: 9473 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Heurtd', { rr: 2, pret: true });
    await tab.evaluate(async () => {
      const m = await import('./src/mondes.js'); const P = m.positionDe('paris'); const g = window.__game;
      g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
    });
    await dormir(20000);
    for (const brule of [0, 0, 0, 300, 300, 300]) {
      const r = await tab.evaluate(async (brule) => {
        const g = window.__game, v = g.vehicules, dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        let actif = true;
        const burn = () => { if (!actif) return; const t = performance.now(); while (performance.now() - t < brule); requestAnimationFrame(burn); };
        if (brule) requestAnimationFrame(burn);
        let cible = null;
        for (let k = 0; k < 100 && !cible; k++) {
          await dodo(150);
          const vits = new Map();
          v.etat().forEach((c, ci) => { if (!c.routier || c.nom !== 'voiture') return; for (const p of c.places) vits.set(`${c.cle}#${p[3]}`, { ci, i: p[3], s: c.vitesses[p[3]] || 0 }); });
          for (const a of v.diagCeder()) { const q = a.nom && vits.get(a.nom); if (q && q.s > 4) { cible = { ...q, x: a.x, z: a.z }; break; } }
        }
        if (!cible) { actif = false; return { err: 'aucune' }; }
        const id = v.heurter(cible.x, cible.z, 0.8);
        const [ci, i] = (id || '').split(':').map(Number);
        const cle = (v.etat()[ci] || {}).cle;
        const maillage = () => (v.voitureNommee && cle ? v.voitureNommee(`${cle}#${i}`) : null);
        const m0 = maillage(); const dejaPose = !!(m0 && m0.userData.detresse);
        let arretee = null, pose = false, repart = null, sansMaillage = 0;
        const t0 = performance.now();
        while (performance.now() - t0 < 15000) {
          await dodo(100);
          const s = v.etat()[ci].vitesses[i];
          const m = maillage(); if (!m) sansMaillage++;
          if (m && m.userData.detresse && !dejaPose) pose = true;
          if (arretee === null && s < 0.3) arretee = Math.round(performance.now() - t0);
          if (arretee !== null && s > 1.5 && performance.now() - t0 > arretee + 500) { repart = Math.round(performance.now() - t0); break; }
        }
        actif = false;
        return { brule, id, nom: `${cle}#${i}`, cible: `${cible.ci}:${cible.i}`, m0: !!m0, dejaPose, arretee, pose, repart, sansMaillage };
      }, brule);
      console.log(JSON.stringify(r));
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
