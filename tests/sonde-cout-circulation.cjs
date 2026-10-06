// CE QUE COÛTE LA RUE À CHAQUE IMAGE (v372) — `vehicules.update` chronométré
// au-dessus de Paris : médiane, 90e centile et pire, en millisecondes, et
// combien de voitures la rue regardait. Usage : node tests/sonde-cout-circulation.cjs
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8421, portPairs: 9421 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeCoutRue');
    const r = await page.evaluate(async () => {
      const m = await import('./src/mondes.js'); const P = m.positionDe('paris'); const g = window.__game;
      g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
      await new Promise((f) => setTimeout(f, 8000));
      const v = g.vehicules, orig = v.update, ms = [];
      v.update = function (...a) { const t = performance.now(); const x = orig.apply(this, a); ms.push(performance.now() - t); return x; };
      await new Promise((f) => setTimeout(f, 25000));
      v.update = orig;
      ms.sort((a, b) => a - b);
      const q = (f) => +ms[Math.floor(f * (ms.length - 1))].toFixed(2);
      return { images: ms.length, mediane: q(0.5), p90: q(0.9), pire: q(1), regardees: v.diagAttente ? v.diagAttente().voitures : null };
    });
    console.log(JSON.stringify(r));
  } catch (e) { console.log('ERR', e.message); } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
