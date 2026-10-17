// SONDE (feu-file) : « au feu, la voiture freine sur plusieurs relevés »
// rougissait sur une voiture de file qui passait de 4,3 b/s à 0 « en 112 ms ».
// Ce n'était pas l'arrêt d'urgence : la rue avance en temps RÉEL par image
// (v305), une image de banc dure jusqu'à une seconde, et les relevés tombent
// tous les dixièmes de seconde ENTRE les images. On relève donc chaque paire
// de relevés d'une voiture retenue par un feu (cause 1, depuis 3 b/s, passants
// écartés comme au témoin) avec DEUX horloges — la page et la rue
// (`vehicules.horloge()`) — et l'on compte ce qui dépasse 10 b/s² dans
// chacune. Mesuré : 7 paires sur 142 au-delà de 10 à l'horloge de la page,
// 0 à celle de la rue. Contrôle : `rapprocher` désarmé à 100 b/s² dans
// circulation.js, 14 paires sur 166 au-delà de 10 à l'horloge de la rue
// (pire 32,8) — la mesure voit un vrai coup de frein.
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8474, portPairs: 9474 }); await banc.ouvrir();
  try {
    const p = await banc.jouerSeul('RueFeuHorloge', { tactile: true });
    const r = await p.evaluate(async () => {
      const m = await import('./src/mondes.js'); const P = m.positionDe('paris'); const g = window.__game;
      g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      const S = new Map(); const t0 = performance.now();
      while (performance.now() - t0 < 60000) {
        await dodo(100);
        for (const site of (g.passants && g.passants.sites) || []) for (const h of site.peuple || []) {
          if (h && h.pos && Math.hypot(h.pos.x - g.player.pos.x, h.pos.z - g.player.pos.z) < 250) h.pos.set(P.x + 4000, h.pos.y, P.z + 4000);
        }
        const H = g.vehicules.horloge(), T = performance.now(), F = g.renderer.info.render.frame;
        g.vehicules.etat().forEach((c, ci) => {
          if (!c.routier || c.nom !== 'voiture') return;
          for (const q of c.places) { const k = ci + ':' + q[3]; const s = S.get(k) || []; s.push([c.vitesses[q[3]], T, H, F, c.causes[q[3]]]); S.set(k, s); }
        });
      }
      const gros = []; let pairesF = 0;
      for (const [k, s] of S) for (let i = 1; i < s.length; i++) {
        const [v0, t0_, h0, f0] = s[i - 1], [v1, t1, h1, f1, c1] = s[i];
        if (c1 !== 1 || v0 < 3 || v1 >= v0) continue;
        pairesF++;
        const dT = (t1 - t0_) / 1000, dH = h1 - h0;
        const decT = (v0 - v1) / Math.max(1e-3, dT), decH = (v0 - v1) / Math.max(1e-3, dH);
        if (decT > 10 || decH > 10) gros.push({ k, v0, v1, dT: +dT.toFixed(3), dH: +dH.toFixed(3), images: f1 - f0, decT: +decT.toFixed(1), decH: +decH.toFixed(1) });
      }
      return { pairesF, gros: gros.slice(0, 30), n: gros.length, nH: gros.filter((x) => x.decH > 10).length };
    });
    console.log(JSON.stringify(r));
    await p.close();
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
