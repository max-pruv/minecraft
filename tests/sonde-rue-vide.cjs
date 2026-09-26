// LA RUE VIDE, SEULE : le témoin « et l'on ne marche pas dans une rue vide »
// (monte.js, v218), rejoué sur une page NEUVE, avec ce que le témoin ne publie
// pas — la taille de la troupe, combien sont à portée, combien visibles — pour
// distinguer « personne n'a été posé » de « posés mais épuisés derrière » (le
// plafond de 88 par ville, v241). Usage : node tests/sonde-rue-vide.cjs
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8411, portPairs: 9411 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('RueVide', { rr: 6 });
    const r = await page.evaluate(async () => {
      const m = await import('./src/paris.js');
      const g = window.__game;
      const cam = g.player.camera;
      const demi = Math.atan(Math.tan(((cam.fov * Math.PI) / 180) / 2) * cam.aspect);
      const trajets = [['Rivoli', [-53, -4], [60, 13]], ['Voltaire', [46, -18], [96, 25]]];
      const out = [];
      const cadre = (dx, dz) => {
        let n = 0, portee = 0, caches = 0;
        for (const q of g.npcs) {
          if (!q.pos || (q.name !== 'passant' && q.name !== 'chien')) continue;
          const ex = q.pos.x - g.player.pos.x, ez = q.pos.z - g.player.pos.z;
          const dd = Math.hypot(ex, ez);
          if (dd >= 62 || dd < 1) continue;
          portee++;
          if (!(q.mesh && q.mesh.visible)) { caches++; continue; }
          const cos = (ex * dx + ez * dz) / dd;
          if (Math.acos(Math.max(-1, Math.min(1, cos))) <= demi) n++;
        }
        return { n, portee, caches };
      };
      for (const [nom, a, b] of trajets) {
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const yaw = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));
        const dx = -Math.sin(yaw), dz = -Math.cos(yaw);
        for (let d = 0; d <= L; d += 25) {
          const f = d / L;
          const x = Math.round(m.PARIS.x + a[0] + (b[0] - a[0]) * f);
          const z = Math.round(m.PARIS.z + a[1] + (b[1] - a[1]) * f);
          g.player.pos.set(x + 0.5, g.world.terrainHeight(x, z) + 1.2, z + 0.5);
          g.player.vel.set(0, 0, 0); g.player.yaw = yaw;
          const fin = Date.now() + 7000; let c = cadre(dx, dz);
          while (c.n < 4 && Date.now() < fin) { await new Promise((r) => setTimeout(r, 500)); c = cadre(dx, dz); }
          const sol = g.world.getBlock(x, g.world.sommetColonne(x, z), z);
          const site = g.passants && g.passants.sites && g.passants.sites.find((s) => s.peuple && s.peuple.length);
          const troupe = g.passants && g.passants.sites ? g.passants.sites.reduce((s, q) => s + ((q.peuple && q.peuple.length) || 0), 0) : -1;
          out.push({ nom, x: x - m.PARIS.x, z: z - m.PARIS.z, sol, ...c, attente: +((7000 - Math.max(0, fin - Date.now())) / 1000).toFixed(1), troupe, sites: g.passants && g.passants.sites ? g.passants.sites.filter((q) => q.peuple && q.peuple.length).length : -1 });
        }
      }
      return out;
    });
    console.log(JSON.stringify(r));
    const vus = r.map((s) => s.n);
    console.log(`vus ${JSON.stringify(vus)} vides ${vus.filter((n) => !n).length} moyenne ${(vus.reduce((s, n) => s + n, 0) / vus.length).toFixed(2)}`);
  } catch (e) { console.log('ÉCHEC :', String((e && e.stack) || e).split('\n').slice(0, 4).join('\n')); }
  finally { await banc.fermer(); process.exit(0); }
})();
