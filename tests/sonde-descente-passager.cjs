// SONDE (v384) : la montée PUIS la descente du passager par la portière,
// seules, sans le reste de reseau.js (vingt minutes) — pour mesurer le témoin
// des deux côtés vite. Copie conforme du passage de reseau.js.
const { Banc, nomsVus, dormir, jusqua } = require('./banc.js');
const verifier = (nom, ok, d = '') => console.log(`${ok ? '✅' : '❌'} ${nom} — ${d}`);
(async () => {
  const banc = new Banc();
  await banc.ouvrir();
  try {
    const { p: hote, code } = await banc.creerMonde('Marlon');
    const idDe = (page, nom) => page.evaluate((nom) => {
      for (const [id, rp] of window.__game.remotePlayers) if (rp.name === nom) return id;
      return null;
    }, nom);
    const lou = await banc.rejoindre('Lou', code, { embarq: 1 });
    await jusqua(async () => (await nomsVus(hote)).includes('Lou') && (await nomsVus(lou)).includes('Marlon'), 30000);
    const volantLou = await hote.evaluate(async () => {
      const g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
      const a = g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5, false, { flotte: 'amg-gt-black-series.glb' });
      for (let i = 0; i < 80 && !(a && a.mesh.userData.modele); i++) await dodo(100);
      document.getElementById('ride-btn').click();
      await dodo(800);
      const m = g.fun.montureConduite && g.fun.montureConduite();
      return { auVolant: !!m, modele: !!(m && m.mesh.userData.modele), x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z };
    });
    const marlonChezLou = await idDe(lou, 'Marlon');
    await jusqua(async () => lou.evaluate((id) => { const rp = window.__game.remotePlayers.get(id); return !!(rp && rp.vehicule && rp.vehicule.mesh.userData.modele); }, marlonChezLou), 20000);
    await lou.evaluate((p) => {
      const g = window.__game;
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      g.player.pos.set(p.x + 3, p.y, p.z); g.player.vel.set(0, 0, 0);
    }, volantLou);
    const boutonLou = () => lou.evaluate(() => { const b = document.getElementById('ride-btn'); return { texte: b.textContent, visible: b.style.display !== 'none' }; });
    await jusqua(async () => { const b = await boutonLou(); return b.visible && /Monter avec/.test(b.texte); }, 15000);
    await lou.evaluate(() => document.getElementById('ride-btn').click());
    const t0 = Date.now();
    const releves = [];
    while (Date.now() - t0 < 45000) {
      const [cL, cM] = await Promise.all([
        lou.evaluate(() => { const g = window.__game; const e = g.player.embarquement; return { ph: e ? e.phase : null, passager: !!(g.fun.passagerDe && g.fun.passagerDe()) }; }),
        hote.evaluate(() => {
          const m = window.__game.fun.montureConduite && window.__game.fun.montureConduite();
          const p = m && m.mesh.userData.portieres ? m.mesh.userData.portieres['1'] : null;
          return { angle: p ? +p.rotation.y.toFixed(3) : null };
        }),
      ]);
      releves.push({ t: Date.now() - t0, ...cL, ...cM });
      if (cL.passager && !cL.ph && releves.some((r) => r.angle > 0.5) && cM.angle !== null && Math.abs(cM.angle) < 0.02) break;
      await dormir(150);
    }
    const phases = [...new Set(releves.map((r) => r.ph).filter(Boolean))];
    const ouverteChezMarlon = releves.filter((r) => r.angle > 0.5);
    const fin = releves[releves.length - 1];
    verifier('le passager entre par la portière droite, et le conducteur la voit s\'ouvrir chez lui',
      volantLou.auVolant && phases.includes('ouverture') && phases.includes('entree') && fin.passager
        && ouverteChezMarlon.length > 0 && fin.angle !== null && Math.abs(fin.angle) < 0.02,
      JSON.stringify({ volantLou, phases, ouvertes: ouverteChezMarlon.length, max: Math.max(...releves.map((r) => r.angle || 0)), fin, n: releves.length, ms: fin.t }));
    // --- et il en DESCEND par la portière (v384) ------------------------------
    //
    // La descente du passager était instantanée : Lou se retrouvait debout
    // d'un coup, la portière de Marlon ne bougeait pas. Elle ressort désormais
    // par la portière droite, à l'envers de la montée, et Marlon la voit
    // s'ouvrir chez lui. Même lecture des deux pages au même instant ; et
    // `passagerDe()` doit être FAUX dès le premier relevé — on n'est plus
    // passager au premier appui (comme `montureConduite()` pour le conducteur,
    // v366). On attend le RÉSULTAT, borné : à deux pages une séquence de deux
    // secondes de jeu prend des dizaines de secondes de montre (v377). Sur
    // l'ancien code : aucune phase, portière fermée de bout en bout.
    const descenteLou = [];
    if (fin.passager) {
      await lou.evaluate(() => document.getElementById('ride-btn').click());
      const t1 = Date.now();
      while (Date.now() - t1 < 45000) {
        const [cL, cM] = await Promise.all([
          lou.evaluate(() => { const g = window.__game; const e = g.player.embarquement; return { ph: e ? e.phase : null, sens: e ? e.sens : null, passager: !!(g.fun.passagerDe && g.fun.passagerDe()) }; }),
          hote.evaluate(() => {
            const m = window.__game.fun.montureConduite && window.__game.fun.montureConduite();
            const p = m && m.mesh.userData.portieres ? m.mesh.userData.portieres['1'] : null;
            return { angle: p ? +p.rotation.y.toFixed(3) : null };
          }),
        ]);
        descenteLou.push({ t: Date.now() - t1, ...cL, ...cM });
        if (!cL.ph && descenteLou.some((r) => r.angle > 0.5) && cM.angle !== null && Math.abs(cM.angle) < 0.02) break;
        if (!cL.ph && Date.now() - t1 > 8000 && !descenteLou.some((r) => r.ph)) break;   // rien ne s'est joué
        await dormir(150);
      }
    }
    const phasesD = [...new Set(descenteLou.filter((r) => r.sens === 'descendre').map((r) => r.ph))];
    const finD = descenteLou[descenteLou.length - 1] || {};
    verifier('le passager descend par la portière droite, et le conducteur la voit s\'ouvrir chez lui',
      fin.passager && descenteLou.length > 0 && descenteLou.every((r) => !r.passager)
        && phasesD.includes('ouverture') && phasesD.includes('sortie')
        && descenteLou.some((r) => r.angle > 0.5) && !finD.ph && finD.angle !== null && Math.abs(finD.angle) < 0.02,
      JSON.stringify({ phasesD, ouvertes: descenteLou.filter((r) => r.angle > 0.5).length, max: Math.max(0, ...descenteLou.map((r) => r.angle || 0)),
        passagerPendant: descenteLou.filter((r) => r.passager).length, fin: finD, n: descenteLou.length }));
    await lou.evaluate(() => { const g = window.__game; if (g.fun.passagerDe && g.fun.passagerDe()) document.getElementById('ride-btn').click(); });
    await hote.evaluate(() => { const g = window.__game; if (g.fun.montureConduite && g.fun.montureConduite()) document.getElementById('ride-btn').click(); });

  } catch (e) { console.log('ERREUR', e && e.stack || e); }
  await banc.fermer().catch(() => {});
  process.exit(0);
})();
