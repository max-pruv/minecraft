// SONDE (v387) — la portière droite chez un ami : pourquoi l'approche
// s'annule-t-elle parfois ? Elle s'annule quand la voiture distante change de
// maillage (`existe`, fun.js). On rejoue la scène de reseau.js plusieurs fois
// et l'on relève, chez Lou, le maillage de la voiture de Marlon et sa clé ;
// chez Marlon, s'il est au volant, sa vitesse, son choc et l'état des dégâts.
// Usage : node sonde-portiere-ami.cjs [tours]
const { Banc, nomsVus, dormir, jusqua } = require('./banc.js');
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  const tours = +(process.argv[2] || 3);
  try {
    const { p: hote, code } = await banc.creerMonde('Marlon');
    const lou = await banc.rejoindre('Lou', code, { embarq: 1 });
    await jusqua(async () => (await nomsVus(hote)).includes('Lou') && (await nomsVus(lou)).includes('Marlon'), 30000);
    const marlonChezLou = await lou.evaluate(() => { for (const [id, rp] of window.__game.remotePlayers) if (rp.nom === 'Marlon' || rp.name === 'Marlon') return id; return [...window.__game.remotePlayers.keys()][0]; });
    for (let t = 0; t < tours; t++) {
      const volant = await hote.evaluate(async () => {
        const g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        for (let e = 0; e < 6 && g.fun.montureConduite && g.fun.montureConduite(); e++) { document.getElementById('ride-btn').click(); await dodo(400); }
        for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
        g.animalManager.animals.length = 0;
        const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
        const a = g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5, false, { flotte: 'amg-gt-black-series.glb' });
        for (let i = 0; i < 80 && !(a && a.mesh.userData.modele); i++) await dodo(100);
        document.getElementById('ride-btn').click();
        await dodo(800);
        window.__sondeH = [];
        const m = g.fun.montureConduite && g.fun.montureConduite();
        return { auVolant: !!m, x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z };
      });
      await jusqua(async () => lou.evaluate((id) => { const rp = window.__game.remotePlayers.get(id); return !!(rp && rp.vehicule && rp.vehicule.mesh.userData.modele); }, marlonChezLou), 20000);
      await lou.evaluate((p) => {
        const g = window.__game;
        if (g.fun.passagerDe && g.fun.passagerDe()) document.getElementById('ride-btn').click();
        for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
        g.animalManager.animals.length = 0;
        g.player.pos.set(p.x + 3, p.y, p.z); g.player.vel.set(0, 0, 0);
      }, volant);
      await jusqua(async () => lou.evaluate(() => { const b = document.getElementById('ride-btn'); return b.style.display !== 'none' && /Monter avec/.test(b.textContent); }), 15000);
      await lou.evaluate(() => document.getElementById('ride-btn').click());
      const t0 = Date.now(); const rel = []; let uuid0 = null;
      while (Date.now() - t0 < 30000) {
        const [cL, cM] = await Promise.all([
          lou.evaluate((id) => { const g = window.__game; const rp = g.remotePlayers.get(id); const e = g.player.embarquement;
            return { ph: e ? e.phase : null, pas: !!(g.fun.passagerDe && g.fun.passagerDe()), mesh: rp && rp.vehicule ? rp.vehicule.mesh.uuid.slice(0, 6) : null, cle: rp && rp.vehicule ? rp.vehicule.cle : null }; }, marlonChezLou),
          hote.evaluate(() => { const g = window.__game, P = g.player; const m = g.fun.montureConduite && g.fun.montureConduite();
            return { volant: !!m, v: +(P.vitesseVoiture || 0).toFixed(2), choc: P.choc ? +P.choc.force.toFixed(2) : 0, etat: P.etatVoiture ? +(P.etatVoiture.sante || 0).toFixed(2) : null, x: +P.pos.x.toFixed(2), z: +P.pos.z.toFixed(2), contact: P.contact ? P.contact.famille : null }; }),
        ]);
        if (!uuid0) uuid0 = cL.mesh;
        rel.push({ t: Date.now() - t0, ...cL, ...cM });
        if (cL.pas && !cL.ph) break;
        await dormir(150);
      }
      const ph = [...new Set(rel.map((r) => r.ph).filter(Boolean))];
      const meshes = [...new Set(rel.map((r) => r.mesh))];
      const cles = [...new Set(rel.map((r) => r.cle))];
      const chocs = rel.filter((r) => r.choc > 0).length;
      const volantPerdu = rel.filter((r) => !r.volant).length;
      console.log(`TOUR ${t}: volant ${volant.auVolant} · phases ${JSON.stringify(ph)} · passager ${rel[rel.length - 1].pas} · maillages ${JSON.stringify(meshes)} · clés ${JSON.stringify(cles)} · chocs ${chocs} · volant perdu ${volantPerdu} · contacts ${JSON.stringify([...new Set(rel.map((r) => r.contact))])} · x ${rel[0].x}→${rel[rel.length - 1].x} z ${rel[0].z}→${rel[rel.length - 1].z} · n ${rel.length}`);
      if (meshes.length > 1) { const i = rel.findIndex((r) => r.mesh !== uuid0); console.log('   bascule :', JSON.stringify(rel.slice(Math.max(0, i - 2), i + 2))); }
    }
  } catch (e) { console.log('ERREUR', e.message); }
  process.exit(0);
})();
