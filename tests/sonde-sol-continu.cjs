// LE SOL CONTINU SOUS LES PIEDS (v297) — la sonde qui distingue les cas.
//
// Deux bras, même page, même point de départ, même durée : le sol continu
// (défaut) et le voxel d'avant (`?solcontinu=0`). À pied puis au volant, on
// tient le joystick en avant pendant N secondes et l'on relève à chaque image
// la hauteur des pieds, la surface sous eux, l'appui au sol. Ce qui se
// compare : la distance parcourue (un enfant à pied s'arrête devant une
// marche d'un bloc — il ne saute pas tout seul), le nombre de sauts de
// hauteur d'une image à l'autre, et le nombre d'images où les pieds sont SOUS
// la surface ou flottent au-dessus tout en étant « au sol ».
//
//   node tests/sonde-sol-continu.cjs [secondes] [x] [z] [yaw]
const { Banc, souffler, dormir } = require('./banc.js');
const secondes = Number(process.argv[2]) || 30;
const X = Number(process.argv[3]) || -110, Z = Number(process.argv[4]) || -330;
const YAW = process.argv[5] !== undefined ? Number(process.argv[5]) : 0.25;

async function bras(banc, nom, params) {
  const erreurs = [];
  const page = await banc.jouerSeul(nom === 'voxel' ? 'Solb' : 'Sola', { rr: 4, params });
  page.on('pageerror', (e) => erreurs.push(String(e.message || e).split('\n')[0]));
  const relever = async (etiquette, ms) => {
    const r = await page.evaluate(async ({ ms }) => {
      const g = window.__game, p = g.player;
      // Ce qu'on compte, et pourquoi. `marches` : d'une image à l'autre, au sol
      // des deux côtés, la hauteur change de plus de 0,3 ET plus vite que
      // l'avance horizontale — une pente d'un bloc par bloc descendue à
      // trois images par seconde fait 0,7 de dénivelée en une image, ce n'est
      // pas une marche. `chutes` : un décollage suivi d'un atterrissage plus
      // d'un demi-bloc plus bas — le bord d'un bloc voxel. `bloque` : au sol,
      // joystick en avant, et moins d'un centième de bloc d'avance — le pied
      // contre une marche qu'un enfant ne franchit pas sans sauter.
      const out = { images: 0, surface: 0, sous: 0, flotte: 0, marches: 0, pireMarche: 0, chutes: 0, bloque: 0, auSol: 0, pireSous: 0, pireFlotte: 0 };
      let yAvant = null, solAvant = null, xAvant = null, zAvant = null, yDecollage = null;
      const x0 = p.pos.x, z0 = p.pos.z, t0 = performance.now();
      await new Promise((fin) => {
        const tour = () => {
          const s = g.world.solContinu ? g.world.solContinu(p.pos.x, p.pos.z) : null;
          out.images++;
          if (s !== null) {
            out.surface++;
            const ecart = p.pos.y - s;
            if (ecart < -0.01) { out.sous++; out.pireSous = Math.min(out.pireSous, ecart); }
            if (p.onGround && ecart > 0.05) { out.flotte++; out.pireFlotte = Math.max(out.pireFlotte, ecart); }
          }
          if (p.onGround) out.auSol++;
          if (yAvant !== null) {
            const dy = p.pos.y - yAvant, dh = Math.hypot(p.pos.x - xAvant, p.pos.z - zAvant);
            if (solAvant && p.onGround) {
              if (Math.abs(dy) > 0.3 && Math.abs(dy) > dh) { out.marches++; out.pireMarche = Math.max(out.pireMarche, Math.abs(dy)); }
              if (dh < 0.01) out.bloque++;
            }
            if (solAvant && !p.onGround) yDecollage = yAvant;
            if (!solAvant && p.onGround && yDecollage !== null) { if (p.pos.y < yDecollage - 0.5) out.chutes++; yDecollage = null; }
          }
          yAvant = p.pos.y; solAvant = p.onGround; xAvant = p.pos.x; zAvant = p.pos.z;
          if (performance.now() - t0 < ms) requestAnimationFrame(tour); else fin();
        };
        requestAnimationFrame(tour);
      });
      out.blocs = +Math.hypot(p.pos.x - x0, p.pos.z - z0).toFixed(1);
      out.x = +p.pos.x.toFixed(1); out.z = +p.pos.z.toFixed(1); out.y = +p.pos.y.toFixed(2);
      out.morceaux = g.chunkMeshes.size;
      return out;
    }, { ms });
    console.log(`  ${nom} · ${etiquette}`, JSON.stringify(r));
    return r;
  };
  // à pied
  await page.evaluate(async ({ X, Z, YAW }) => {
    const g = window.__game;
    g.player.flying = false; g.player.pos.set(X + 0.5, g.world.terrainHeight(X, Z) + 2, Z + 0.5); g.player.vel.set(0, 0, 0);
    g.player.yaw = YAW; g.player.pitch = 0; window.__setDayTime(0.42);
    for (const a of [...g.animalManager.animals]) if (a.def.key !== 'poisson') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
    await new Promise((r) => setTimeout(r, 4000));
    g.player.touchMove.f = 1;
  }, { X, Z, YAW });
  const pied = await relever('à pied', secondes * 1000);
  await page.evaluate(() => { window.__game.player.touchMove.f = 0; });
  // au volant, depuis le même point
  await page.evaluate(async ({ X, Z, YAW }) => {
    const g = window.__game;
    g.player.flying = false; g.player.pos.set(X + 0.5, g.world.terrainHeight(X, Z) + 2, Z + 0.5); g.player.vel.set(0, 0, 0);
    g.player.yaw = YAW; g.player.pitch = 0;
    for (const a of [...g.animalManager.animals]) if (a.def.key !== 'poisson') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
    g.animalManager.invoquer('voiture', X + 0.5 - Math.sin(YAW) * 3, Z + 0.5 - Math.cos(YAW) * 3);
  }, { X, Z, YAW });
  await dormir(2500);
  const auVolant = () => page.evaluate(() => !!(window.__game.fun.montureConduite && window.__game.fun.montureConduite()));
  for (let essai = 0; essai < 6 && !(await auVolant()); essai++) {
    await page.evaluate(() => { const b = document.getElementById('ride-btn'); if (b) b.click(); });
    await dormir(1200);
  }
  let voiture = { echec: 'pas monté' };
  if (await auVolant()) {
    await page.evaluate(() => { window.__game.player.touchMove.f = 1; });
    voiture = await relever('au volant', secondes * 1000);
    await page.evaluate(() => { window.__game.player.touchMove.f = 0; });
  } else console.log(`  ${nom} · au volant : pas monté`);
  const cellules = await page.evaluate(() => {
    const g = window.__game; let cells = 0, faces = 0;
    for (const e of g.chunkMeshes.values()) {
      if (!e.solid) continue;
      const pos = e.solid.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) if (pos[i] % 1 === 0.5) cells++;
      faces += pos.length / 3;
    }
    return { sommetsSurface: cells, sommetsSolid: faces };
  });
  console.log(`  ${nom} · maillage`, JSON.stringify(cellules), 'erreurs', JSON.stringify(erreurs));
  await page.close();
  return { pied, voiture, cellules, erreurs };
}

(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    await souffler();
    const avec = await bras(banc, 'sol continu', '&ombres=0');
    await souffler();
    const sans = await bras(banc, 'voxel', '&ombres=0&solcontinu=0');
    const resume = (b) => ({ pied: b.pied.blocs, marches: b.pied.marches, chutes: b.pied.chutes, bloque: b.pied.bloque, sous: b.pied.sous, flotte: b.pied.flotte,
      voiture: b.voiture.blocs, marchesVoiture: b.voiture.marches, chutesVoiture: b.voiture.chutes, erreurs: b.erreurs.length });
    console.log('\nBILAN', JSON.stringify({ avec: resume(avec), sans: resume(sans) }));
  } finally { await banc.fermer(); process.exit(0); }
})();
