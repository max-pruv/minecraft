// SONDE (v383) : « quand la monoplace arrive, on a le temps de voir le
// bouton » — l'enfant posé SUR le circuit, ou au BORD. Où s'arrête la
// monoplace qui l'attend, et pourquoi (veut, repart) ?
const { Banc, dormir } = require('./banc.js');
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Marlon', { tactile: true });
    await dormir(4000);
    for (const bord of [0, 3.5, 0, 3.5]) {
      const r = await tab.evaluate(async (bord) => {
        const v = window.__vehicules, g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        const pt = v.point(2, 12); if (!pt) return { pasDeCircuit: true };
        const ox = Math.cos(pt.cap) * bord, oz = -Math.sin(pt.cap) * bord;
        g.player.flying = true; g.player.pos.set(pt.x + ox, pt.y, pt.z + oz); g.player.vel.set(0, 0, 0);
        const t0 = performance.now(); let dMin = Infinity, bouton = false, vu = null;
        while (performance.now() - t0 < 60000) {
          const b = document.getElementById('board-btn');
          if (b && getComputedStyle(b).display !== 'none' && getComputedStyle(b.closest('.fun-target')).display !== 'none' && b.textContent.includes('🏎️')) { bouton = true; break; }
          const e = v.etat()[2];
          for (const pl of e.places) { const d = Math.hypot(pl[0] - g.player.pos.x, pl[1] - g.player.pos.z); if (d < dMin) dMin = d; }
          const dg = (v.diagCeder ? v.diagCeder() : []).filter((d) => d.nom && d.nom.startsWith(e.cle + '#') && d.veut.length);
          if (dg.length) vu = dg.slice(0, 3);
          await dodo(300);
        }
        return { bord, bouton, ms: Math.round(performance.now() - t0), dMin: +dMin.toFixed(1), vu };
      }, bord);
      console.log(JSON.stringify(r));
    }
  } finally { process.exit(0); }
})();
