// Sonde (claude/temoins-intermittents) : « chez Alice aussi, la voiture de la
// rue que Marlon percute s'arrête feux de détresse allumés » (degats.js, 9 bis)
// rendait `recues 0` rejouée seule, `recues 1` au portail. On sépare les cas :
// le `rue_choc` est-il reçu ? avant ou après l'histoire par la position ?
// `nommer` trouve-t-il la voiture ? `heurteRecu` est-il posé, puis consommé ?
//     node tests/sonde-detresse-ami.cjs [passes]
const { Banc, jusqua } = require('./banc.js');
(async () => {
  const passes = Number(process.argv[2] || 2);
  const banc = new Banc({ portJeu: 8471, portPairs: 9471 });
  await banc.ouvrir();
  try {
    for (let k = 0; k < passes; k++) {
      const { p: hote, code } = await banc.creerMonde('Marlon' + k);
      const alice = await banc.rejoindre('Alice' + k, code);
      const pose = await hote.evaluate(async () => {
        const g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
        g.animalManager.animals.length = 0;
        const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
        const a = g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5, false, { flotte: 'ferrari-f40.glb' });
        const t0 = performance.now();
        while (performance.now() - t0 < 30000 && !a.mesh.userData.roues) await dodo(300);
        for (let e = 0; e < 8 && !(g.fun.montureConduite && g.fun.montureConduite()); e++) { document.getElementById('ride-btn').click(); await dodo(600); }
        const y = g.player.pos.y, x = Math.round(g.player.pos.x), z = Math.round(g.player.pos.z);
        const pts = [[-40, 6], [40, 6], [40, 16], [-40, 16], [-40, 6]].map(([dx, dz]) => ({ x: x + dx, y, z: z + dz }));
        return { auVolant: !!g.fun.montureConduite(), pts, x: g.player.pos.x, y, z: g.player.pos.z };
      });
      const ouvrirRue = (page) => page.evaluate((pts) => {
        const g = window.__game;
        for (const a of [...g.animalManager.animals]) if (!a.montee) g.animalManager.scene.remove(a.mesh);
        g.animalManager.animals = g.animalManager.animals.filter((a) => a.montee);
        window.__convB = g.vehicules.circulation(pts, 99, { nb: 6, vitesse: 4 });
        return window.__convB.cle;
      }, pose.pts);
      await alice.evaluate((p) => { const g = window.__game; g.player.pos.set(p.x + 4, p.y, p.z - 3); g.player.vel.set(0, 0, 0); }, pose);
      const cles = [await ouvrirRue(hote), await ouvrirRue(alice)];
      // instrumentation chez Alice
      await alice.evaluate(() => {
        const g = window.__game, n = g.net, d = g.fun.degats, t0 = performance.now();
        const j = window.__journal = [];
        const rc = n.onRueChoc, rh = n.onRueHistoires;
        n.onRueChoc = (m) => {
          const V = window.__vehicules || g.vehicules;
          const avant = g.vehicules.voitureNommee(m.o);
          j.push({ t: Math.round(performance.now() - t0), quoi: 'rue_choc', o: m.o, trouvee: !!avant });
          rc(m);
          j.push({ t: Math.round(performance.now() - t0), quoi: 'apres', heurteRecu: avant ? avant.userData.heurteRecu : null });
        };
        n.onRueHistoires = (h) => { j.push({ t: Math.round(performance.now() - t0), quoi: 'rc', noms: Object.keys(h || {}) }); rh(h); };
        const c = window.__convB;
        window.__suivi = setInterval(() => {
          const i = c.elements.findIndex((m) => m && m.userData.heurteRecu > 0);
          if (i >= 0) j.push({ t: Math.round(performance.now() - t0), quoi: 'attend', i });
        }, 100);
      });
      const dessines = (page) => page.evaluate(() => (window.__convB.elements || []).map((m, i) => (m && m.parent && m.userData.roues ? i : -1)).filter((i) => i >= 0));
      let rang = -1;
      await jusqua(async () => { const [a, b] = [await dessines(hote), await dessines(alice)]; rang = a.find((i) => b.includes(i)) ?? -1; return rang >= 0; }, 40000);
      const coup = rang < 0 ? { err: 'aucun rang' } : await hote.evaluate(async (i) => {
        const g = window.__game, d = g.fun.degats, conv = window.__convB, p = g.player;
        const tenir = (n) => new Promise((fin) => { let cumul = 0, prec = performance.now(); const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); }; requestAnimationFrame(pas); });
        const a = g.fun.montureConduite(), m = conv.elements[i];
        if (!a || !m) return { err: 'pas au volant' };
        p.pos.set(m.position.x, m.position.y + 0.05, m.position.z - 3); a.pos.copy(p.pos); a.mesh.position.copy(a.pos);
        await tenir(0.2);
        p.choc = { force: 0.8, t: performance.now(), x: m.position.x, z: m.position.z };
        await tenir(0.4);
        p.choc = null;
        const touchee = d.rue().find((r) => conv.elements.includes(r));
        return touchee ? { rang: conv.elements.indexOf(touchee), nom: g.vehicules.voitureNommee(touchee), chocs: d.etat(touchee).chocs } : { err: 'rien froissé' };
      }, rang);
      const releve = () => alice.evaluate((r) => { const c = window.__convB, m = c.elements[r];
        return { recues: m ? m.userData.detresseRecue || 0 : null, hr: m ? m.userData.heurteRecu || 0 : null, heurte: c.heurte ? +(c.heurte[r] || 0).toFixed(2) : null, profil: !!c.profil }; }, coup.rang);
      const tout = [];
      for (let s = 0; s < 12 && !coup.err; s++) { tout.push(await releve()); await new Promise((f) => setTimeout(f, 500)); }
      const journal = await alice.evaluate(() => window.__journal.filter((e) => e.quoi !== 'attend' || true).slice(0, 40));
      console.log(JSON.stringify({ passe: k, memeCle: cles[0] === cles[1], rang, coup: { ...coup, chocs: coup.chocs && coup.chocs.length }, premier: tout[0], dernier: tout[tout.length - 1], journal: journal.slice(0, 12) }));
      await hote.close(); await alice.close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
