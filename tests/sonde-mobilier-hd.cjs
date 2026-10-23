// SONDE — LE MOBILIER DE LA COUCHE HD S'ÉCRASE (v533) : une terrasse, un banc
// ou une colonne Morris de Paris touchés à plus de cinq blocs par seconde
// cessent d'arrêter la voiture, et leur morceau se remaille sans eux.
// Lu par personne.   node tests/sonde-mobilier-hd.cjs
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8392, portPairs: 9392 });
  await banc.ouvrir();
  try {
    const page = await banc.jouerSeul('SondeHD', { rr: 4, params: '&hd=2' });
    const r = await page.evaluate(async () => {
      const g = window.__game, w = g.world, p = g.player;
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      const { positionDe } = await import('./src/mondes.js');
      const P = positionDe('paris');
      window.__carte.surTeleport(P.x + 40, P.z + 60);
      await dodo(15000);
      const px = Math.round(p.pos.x), pz = Math.round(p.pos.z);
      let trouve = null;
      for (let r = 0; r < 30 && !trouve; r++) for (let dx = -r; dx <= r && !trouve; dx++) for (let dz = -r; dz <= r && !trouve; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = px + dx, z = pz + dz, y = w.sommetColonne(x, z) + 1;
        const genre = w.mobilierVu(x + 0.5, z + 0.5, y);
        if (genre) trouve = { x, z, y, genre };
      }
      if (!trouve) return { trouve: null };
      const { x, z, y } = trouve;
      p.pos.set(x + 0.5, y + 0.01, z + 3.5);
      const cap = 0 + Math.PI;    // vers −z
      p.gabarit = 2.2;
      p.vitesseVoiture = 0;
      const lent = p.obstacleVehicule(x + 0.5, z + 2.0, cap, x + 0.5, z + 3.5);
      p.vitesseVoiture = 10; p.vel.set(0, 0, -10);
      const vite = p.obstacleVehicule(x + 0.5, z + 2.0, cap, x + 0.5, z + 3.0);
      const casse = g.mobilierCasse.casses.has('h' + x + ',' + z);
      await dodo(6000);
      const apres = w.mobilierVu(x + 0.5, z + 0.5, y);
      p.gabarit = 0.6;
      return { trouve, lent, vite, casse, apres, v: +p.vitesseVoiture.toFixed(2), n: g.mobilierCasse.stats.n, colonnes: [...(w.mobilierCasse || [])] };
    });
    console.log(JSON.stringify(r));
  } finally { await banc.fermer(); process.exit(0); }
})();
