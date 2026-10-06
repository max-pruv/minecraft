// SONDE (v396) : la ligne `?diag=1` de la dernière séquence d'embarquement,
// seule, des deux côtés — monter dans une voiture, second appui, puis lire
// `fun.embarquementDernier` ET le texte du diagnostic.
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc();
  await banc.ouvrir();
  try {
    const p = await banc.jouerSeul('SondeDiagEmb', { embarq: 1, params: '&diag=1' });
    const r = await p.evaluate(async () => {
      const g = window.__game, am = g.animalManager;
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const x = -600.5, z = -520.5;
      g.player.pos.set(x, g.world.terrainHeight(x, z) + 1, z); g.player.vel.set(0, 0, 0);
      await dodo(3000);
      for (const a of [...am.animals]) { am.scene.remove(a.mesh); am.animals.splice(am.animals.indexOf(a), 1); }
      const a = am.invoquer('voiture', g.player.pos.x, g.player.pos.z - 5, false);
      if (!a) return { err: 'pas de voiture' };
      await dodo(1500);
      g.player.yaw = Math.atan2(-(a.pos.x - g.player.pos.x), -(a.pos.z - g.player.pos.z));
      await dodo(300);
      document.getElementById('ride-btn').click();
      await dodo(400);
      const pendant = g.player.embarquement && g.player.embarquement.phase;
      document.getElementById('ride-btn').click();
      await dodo(1500);
      const d = g.fun.embarquementDernier ? g.fun.embarquementDernier() : null;
      const dbg = document.getElementById('debug');
      return { pendant, volant: !!g.fun.montureConduite(), d, ligne: dbg ? dbg.textContent.split('\n').filter((l) => l.startsWith('embarquement')) : null };
    });
    console.log(JSON.stringify(r));
  } catch (e) { console.log('ERREUR', e.message); }
  process.exit(0);
})();
