// SONDE (v407) : la voiture de l'ami se refait PENDANT la marche du passager,
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
    // l'état du portail, PROVOQUÉ (v393) : dès l'approche, la clé de la voiture
    // de Marlon change chez Lou — la tablette en refait le maillage
    const enMarche = await jusqua(async () => lou.evaluate(() => { const e = window.__game.player.embarquement; return !!(e && e.phase === 'approche'); }), 10000);
    const refait = await lou.evaluate((id) => { const rp = window.__game.remotePlayers.get(id); if (!rp || !rp.vehicule) return false; rp.vehicule.cle = 'refaite'; return true; }, marlonChezLou);
    const t0 = Date.now(), vus = [];
    while (Date.now() - t0 < 45000) {
      const e = await lou.evaluate(() => { const g = window.__game; const x = g.fun.embarquement ? g.fun.embarquement() : null; return { ph: x ? x.phase : null, rebranchee: x ? x.rebranchee || 0 : 0, passager: !!(g.fun.passagerDe && g.fun.passagerDe()) }; });
      vus.push(e);
      if (!e.ph && vus.length > 8) break;
      await dormir(150);
    }
    const r = { enMarche, refait, rebranchee: Math.max(0, ...vus.map((v) => v.rebranchee)), passager: !!vus[vus.length - 1].passager,
      dernier: await lou.evaluate(() => { const f = window.__game.fun; return f.embarquementDernier ? f.embarquementDernier() : null; }) };
    verifier('la voiture de l\'ami se refait pendant la marche : le passager s\'y rebranche et s\'assied quand même',
      r.enMarche && r.refait && r.passager && r.rebranchee >= 1, JSON.stringify(r));
  } catch (e) { console.log('ERREUR', e && e.stack || e); }
  await banc.fermer().catch(() => {});
  process.exit(0);
})();
