// LE PIÉTON ET LA VOITURE À 60-70 B/S (v340) : le corps du témoin de monte.js,
// rejouable seul et sur `origin/main` (copie dans un arbre détaché).
//   node tests/sonde-pieton-rapide.cjs [tours]
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8413, portPairs: 9413 });
  await banc.ouvrir();
  try {
    for (let tour = 0; tour < (+process.argv[2] || 1); tour++) {
      await souffler();
      const tab = await banc.jouerSeul('Pieton' + tour);
      const r = await tab.evaluate(async () => {
      const g = window.__game;
      const { Habitant } = await import('./src/vie.js');
      const { construireHumain } = await import('./src/personnages.js');
      // un carré plat de 13 × 13 blocs, loin de toute ville (le couloir de la v237)
      let ancre = null;
      for (let k = 0; k < 400 && !ancre; k++) {
        const x0 = 30000 + (k % 20) * 16, z0 = 30000 + Math.floor(k / 20) * 16;
        const h0 = g.world.terrainHeight(x0, z0);
        let plat = true;
        for (let dx = -6; dx <= 6 && plat; dx++) for (let dz = -6; dz <= 6 && plat; dz++) if (g.world.terrainHeight(x0 + dx, z0 + dz) !== h0) plat = false;
        if (plat) ancre = { x: x0 + 0.5, z: z0 + 0.5, y: h0 + 1 };
      }
      if (!ancre) return { err: 'aucun carré plat' };
      const majPlayer = g.player.update, sauve = g.player.pos.clone(), gab0 = g.player.gabarit, pousse0 = g.player.pousse;
      g.player.update = () => {};
      const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
      const image = () => new Promise((f) => requestAnimationFrame(f));
      const h = new Habitant(g.scene, g.world, g.player, () => {}, {
        name: 'essai', phrases: ['…'], walkSpeed: 1.6, largeur: 0.5, hauteur: 1.72,
        build: () => construireHumain({ tenue: 'passant' }),
      }, ancre.x, ancre.z);
      const passes = [];
      try {
        // la dernière passe PROVOQUE une tablette qui rame (v234) : cent quatre-vingts
        // millisecondes de calcul par image, environ cinq images par seconde
        for (const [v, lat0, lourd] of [[60, 0], [60, 0.6], [60, 1.0], [70, 0], [70, 0.8], [60, 0.3, 180]]) {
          const ux = 0, uz = 1, DL = 1.13, MI = 0.25, L = 4.4;
          h.placeAt(ancre.x + lat0, ancre.z, ancre.y);
          h.ecart = null; h.repos = 0; h.ecarts = 0; h.etat = 'pause'; h.minuteur = 1e9; h.surTrottoir = false; h.poste.set(h.pos.x, h.pos.z);
          for (let k = 0; k < 10; k++) { h.update(0.02); await image(); }   // il se pose
          h.placeAt(ancre.x + lat0, ancre.z, ancre.y);
          g.player.gabarit = 2.26;
          let front = ancre.z - v * 1.9 - 10, prec = performance.now(), touche = 0, images = 0, latMin = 9;
          const s = ancre.z;
          while (front - L < s + 6) {
            await image();
            if (lourd) { const t = performance.now(); while (performance.now() - t < lourd); }
            const now = performance.now(), dtR = Math.min(0.5, (now - prec) / 1000); prec = now;
            const lat = h.pos.x - ancre.x;
            const f1 = front + v * dtR;
            g.player.pos.set(ancre.x, ancre.y, f1 - L / 2);
            g.player.pousse = { x: ux * v, z: uz * v };
            h.update(Math.min(dtR, 0.05));
            const lat1 = h.pos.x - ancre.x, sz = h.pos.z;
            if (sz >= front - L && sz <= f1 && Math.min(Math.abs(lat), Math.abs(lat1)) <= DL + MI) touche++;
            latMin = Math.min(latMin, Math.abs(lat1));
            front = f1; images++;
          }
          passes.push({ v, lat0, lourd: !!lourd, touche, images, arrivee: +Math.abs(h.pos.x - ancre.x).toFixed(2), ecarts: h.ecarts || 0 });
        }
      } finally {
        g.player.update = majPlayer; g.player.gabarit = gab0; g.player.pousse = pousse0; g.player.pos.copy(sauve);
        g.scene.remove(h.mesh);
      }
      return { passes };
    });

      console.log(JSON.stringify(r));
      await tab.close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
