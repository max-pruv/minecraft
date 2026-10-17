// Les programmes nés au premier geste dans un avion (v487) : après la chauffe
// de l'accueil, combien de CLÉS de programme neuves pour (1) l'appareil posé,
// (2) ses flammes allumées, (3) l'épave en feu, (4) l'escalier et l'échelle.
// Usage : node sonde-flamme-chauffe.cjs <dossier tests>
const { Banc, souffler } = require(require('path').join(process.argv[2] || __dirname, 'banc.js'));
(async () => {
  const banc = new Banc({ portJeu: 8346, portPairs: 9346 });
  await banc.ouvrir();
  await souffler();
  const p = await banc.jouerSeul('Flamme' + Date.now() % 1000, { pret: true, params: process.argv[3] || '' });
  const r = await p.evaluate(async () => {
    const g = window.__game, am = g.animalManager;
    const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
    const images = async (n) => { const f0 = g.renderer.info.render.frame, t0 = performance.now(); while (g.renderer.info.render.frame - f0 < n && performance.now() - t0 < 30000) await dodo(50); };
    const cles = () => new Set((g.renderer.info.programs || []).map((p) => p.cacheKey));
    const neufs = (avant) => [...cles()].filter((k) => !avant.has(k)).map((k) => k);
    await dodo(3000); await images(10);
    const out = {};
    let k0 = cles();
    const a = am.invoquer('chasseur', g.player.pos.x, g.player.pos.z - 8, false);
    a.mesh.position.copy(a.pos);
    await images(8);
    out.appareil = neufs(k0);
    k0 = cles();
    for (const f of a.mesh.userData.tuyeres) { f.visible = true; f.scale.z = 3; }
    await images(8);
    out.flammes = neufs(k0);
    k0 = cles();
    const { accesAvion } = await import('./src/avions.js');
    for (const t of ['escalier', 'echelle']) {
      const acc = accesAvion({ x: 1, y: 2, z: 0, type: t });
      acc.groupe.position.set(a.pos.x + 3, a.pos.y, a.pos.z); g.scene.add(acc.groupe);
    }
    await images(8);
    out.acces = neufs(k0);
    k0 = cles();
    g.fun.degats.ecraser(a);
    await images(20);
    out.epave = neufs(k0);
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await banc.fermer(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
