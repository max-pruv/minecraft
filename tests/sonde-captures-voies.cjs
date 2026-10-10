// CAPTURES DE LA SECONDE VOIE (v405) : un boulevard de Paris et l'A1, vus de
// trois quarts au-dessus de la chaussée, à `rr=9` (le banc ouvre à 2, un mur
// gris à trente blocs). Usage : node tests/sonde-captures-voies.cjs <dossier>
const { Banc, souffler } = require('./banc.js');
const dossier = process.argv[2] || '.';
(async () => {
  const banc = new Banc({ portJeu: 8435, portPairs: 9435 });
  await banc.ouvrir();
  try {
    for (const lieu of ['paris', 'a1']) {
      await souffler();
      const page = await banc.jouerSeul('Capture' + lieu, { rr: 9, dpr: 1 });
      const r = await page.evaluate(async (lieu) => {
        const g = window.__game, dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        let x, z, cap;
        if (lieu === 'a1') {
          const ro = await import('./src/routes.js'); const s = ro.segmentsDeRoute().find((q) => q.route.nom === 'A1');
          const q = ro.pointA(s, s.longueur * 0.4); x = q.x; z = q.z; cap = Math.atan2(q.fx, q.fz);
        } else { const p = await import('./src/paris.js'); x = p.PARIS.x - 88; z = p.PARIS.z - 5; cap = Math.PI / 2; }
        g.player.flying = true; g.player.pos.set(x, g.world.terrainHeight(Math.floor(x), Math.floor(z)) + 14, z); g.player.vel.set(0, 0, 0);
        g.player.yaw = cap + Math.PI; g.player.pitch = -0.45;
        await dodo(20000);
        const vues = (window.__vehicules.etat() || []).reduce((n, c) => n + (c.routier ? c.places.length : 0), 0);
        return { vues };
      }, lieu);
      await page.screenshot({ path: `${dossier}/voies-${lieu}.png` });
      console.log(lieu, JSON.stringify(r));
      await page.close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
