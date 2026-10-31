// SONDE (v563) : on monte dans les avions déposés (A320, A321, F-35) par la
// séquence entière (`embarq: 1`), comme le témoin de monte.js le fait pour
// l'avion de ligne et le chasseur : phases, hauteur des pieds en haut des
// marches, angle du membre qui s'ouvre, escalier rendu, CLÉS de programme
// neuves. Une capture au moment où la porte s'ouvre, par une caméra à part.
// Isolée : aucune suite ne l'importe.
//
//   node tests/sonde-embarquement-deposes.cjs <dossier>
const { Banc } = require('./banc.js');
const DOSSIER = process.argv[2] || '.';
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  try {
    const p = await banc.jouerSeul('SondeEmbDeposes', { embarq: 1, pret: true });
    await p.evaluate(async () => {
      const m = await import('/src/avions.js');
      const t0 = performance.now();
      while (m.avionsPrets().length < 4 && performance.now() - t0 < 60000) await new Promise((r) => setTimeout(r, 200));
    });
    for (const [key, variante] of [['avionligne', 'a320'], ['avionligne', 'a321'], ['avionligne', 'jet'], ['chasseur', 'f35']]) {
      const r = await p.evaluate(async ({ key, variante }) => {
        const THREE = await import('three');
        const g = window.__game, am = g.animalManager;
        const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        const images = async (n) => { const f0 = g.renderer.info.render.frame, t0 = performance.now(); while (g.renderer.info.render.frame - f0 < n && performance.now() - t0 < 20000) await dodo(50); };
        const bouton = () => document.getElementById('ride-btn').click();
        const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
        for (let i = 0; i < 3 && auVolant(); i++) { bouton(); await images(3); }
        for (const a of [...am.animals]) { am.scene.remove(a.mesh); am.animals.splice(am.animals.indexOf(a), 1); }
        g.player.pilote = null; g.player.avionEtat = undefined; g.player.avionEnVol = undefined; g.player.flying = false;
        const x0 = -1500.5, z0 = -2500.5, y0 = 60;
        for (let x = -16; x <= 16; x++) for (let z = -16; z <= 16; z++) {
          g.world.setBlock(Math.floor(x0) + x, y0, Math.floor(z0) + z, 3);
          for (let y = 1; y < 12; y++) g.world.setBlock(Math.floor(x0) + x, y0 + y, Math.floor(z0) + z, 0);
        }
        g.player.pos.set(x0 + 8, y0 + 1, z0 + 8);
        await images(10);
        const cles = () => new Set((g.renderer.info.programs || []).map((q) => q.cacheKey));
        const a = am.invoquer(key, x0, z0, false, { variante });
        a.yaw = 0; a.mesh.rotation.y = Math.PI; a.mesh.position.copy(a.pos); a.mesh.updateMatrixWorld(true);
        const ici = a.mesh.localToWorld(new THREE.Vector3(-3.5, 0, -5));
        g.player.pos.set(ici.x, y0 + 1, ici.z); g.player.vel.set(0, 0, 0);
        g.player.yaw = Math.atan2(-(a.pos.x - ici.x), -(a.pos.z - ici.z));
        await images(15);
        const avant = cles();
        const porte = a.mesh.userData.porte, mb = porte && a.mesh.userData.membres[porte.ouvrant];
        const enfants0 = a.mesh.children.length;
        bouton();
        const out = []; let png = null; const t0 = performance.now();
        while (performance.now() - t0 < 40000) {
          const e = g.player.embarquement;
          out.push({ ph: e ? e.phase : null, v: auVolant(), dy: +(g.player.pos.y - a.pos.y).toFixed(2),
            ang: mb ? +Math.abs(mb.rotation[porte.axe]).toFixed(2) : 0, acces: a.mesh.children.length });
          if (!png && e && e.phase === 'entree') {
            const cam = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400); cam.layers.enableAll();
            const c = a.mesh.localToWorld(new THREE.Vector3(porte.x, porte.y, porte.z));
            const d = a.mesh.localToWorld(new THREE.Vector3(porte.x - 9, porte.y + 2.5, porte.z - 4));
            cam.position.copy(d); cam.lookAt(c);
            g.renderer.render(g.scene, cam); png = g.renderer.domElement.toDataURL('image/png');
          }
          if (!e && auVolant() && out.length > 3) break;
          await dodo(100);
        }
        const fin = out[out.length - 1];
        const res = { variante: a.mesh.userData.variante, phases: [...new Set(out.map((x) => x.ph).filter(Boolean))],
          volantPendant: out.filter((x) => x.v && ['approche', 'gravir', 'ouverture', 'entree'].includes(x.ph)).length,
          dyHaut: Math.max(-99, ...out.filter((x) => x.ph === 'ouverture').map((x) => x.dy)), seuil: porte && porte.y,
          angMax: Math.max(...out.map((x) => x.ang)), accesPendant: out.some((x) => x.acces > enfants0),
          fin: { ...fin, enfants0 }, clesNeuves: [...cles()].filter((k) => !avant.has(k)).map((k) => k.slice(0, 40)), png };
        // la descente par l'escalier (v400)
        const out2 = []; bouton(); const t1 = performance.now();
        while (performance.now() - t1 < 30000) {
          const e = g.player.embarquement; out2.push(e ? e.phase : null);
          if (!e && out2.length > 3) break; await dodo(100);
        }
        res.descente = [...new Set(out2.filter(Boolean))];
        res.pieds = +(g.player.pos.y - a.pos.y).toFixed(2);
        return res;
      }, { key, variante });
      if (r.png) require('fs').writeFileSync(`${DOSSIER}/emb-${variante}.png`, Buffer.from(r.png.split(',')[1], 'base64'));
      delete r.png;
      console.log(variante, JSON.stringify(r));
    }
  } catch (e) { console.log('ERREUR', e && e.stack || e); }
  await banc.fermer().catch(() => {}); process.exit(0);
})();
