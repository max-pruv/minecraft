// LA DÉRIVE DESSINÉE (v438) — la mesure du témoin de `monte.js`, partagée avec
// `sonde-derive-signe.cjs`. Au frein à main, volant à gauche, sur une piste
// posée dans le ciel : à chaque image, l'angle de la caisse RENDUE (sa matrice
// monde, nez en −z) moins la direction de la vitesse, et `player.derive`. La
// physique fait aller la vitesse dans la direction `yaw + derive` : la caisse
// vraie est donc à −derive de sa vitesse, et c'est ce qu'on doit VOIR.
async function mesurerDeriveDessinee() {
  const g = window.__game;
  const { BLOCK } = await import('./src/blocks.js');
  const THREE = await import('three');
  const tenir = (n) => new Promise((f) => { let c = 0, p = performance.now(); const s = (t) => { c += (t - p) / 1000; p = t; if (c >= n) f(); else requestAnimationFrame(s); }; requestAnimationFrame(s); });
  const image = () => new Promise((f) => requestAnimationFrame(() => f()));
  const P = g.player, auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
  const x0 = 32400, z0 = 30600, y0 = 120;
  for (let x = x0 - 10; x <= x0 + 90; x++) for (let z = z0 - 50; z <= z0 + 50; z++) if (g.world.getBlock(x, y0, z) !== BLOCK.STONE) g.world.setBlock(x, y0, z, BLOCK.STONE);
  P.keys.clear();
  for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
  P.pilote = null; P.flying = false; P.gaz = null; P.freinMain = false; delete P.derive;
  for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
  g.animalManager.animals.length = 0;
  P.yaw = -Math.PI / 2; P.pos.set(x0, y0 + 1.01, z0 + 0.5); P.vel.set(0, 0, 0);
  await tenir(0.6);
  g.animalManager.invoquer('voiture', x0 + 3, z0);
  await tenir(0.5);
  for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
  if (!auVolant()) return { err: 'pas au volant' };
  const a = g.fun.montureConduite();
  P.yaw = -Math.PI / 2; P.pos.set(x0, y0 + 1.01, z0 + 0.5); P.vel.set(0, 0, 0);
  await tenir(0.6);
  P.gaz = 1; await tenir(3);
  P.freinMain = true; P.keys.add('KeyA');
  const ecarts = [], derives = [], q = new THREE.Quaternion(), f = new THREE.Vector3();
  const t0 = performance.now();
  let dMax = 0, vMax = 0;
  while (performance.now() - t0 < 12000 && ecarts.length < 30) {
    await image();
    const d = P.derive || 0, vx = P.vel.x, vz = P.vel.z;
    dMax = Math.max(dMax, Math.abs(d)); vMax = Math.max(vMax, Math.hypot(vx, vz));
    if (Math.hypot(vx, vz) < 4 || Math.abs(d) < 0.15) continue;
    a.mesh.updateMatrixWorld(true);
    a.mesh.getWorldQuaternion(q);
    f.set(0, 0, -1).applyQuaternion(q);
    let e = Math.atan2(-f.x, -f.z) - Math.atan2(-vx, -vz);
    while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
    ecarts.push(e); derives.push(d);
  }
  P.keys.delete('KeyA'); P.freinMain = false; P.gaz = null;
  await tenir(1.5);
  for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
  const med = (t) => { if (!t.length) return null; const s = [...t].sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(3); };
  // l'écart qu'on voit, rapporté à celui que la physique dit (−derive) : 1 si
  // la caisse dessinée est celle de la physique, −1 si elle est en miroir
  const rapports = ecarts.map((e, i) => e / -derives[i]);
  return { dMax: +dMax.toFixed(3), vMax: +vMax.toFixed(1), releves: ecarts.length, ecart: med(ecarts), derive: med(derives), rapport: med(rapports) };
}
if (typeof module !== 'undefined') module.exports = { mesurerDeriveDessinee };
