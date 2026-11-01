// Revue visuelle isolée : node tests/sonde-captures-osm.cjs /tmp/captures
// Les coordonnées sont locales au plan ; aucune suite n'importe cette sonde.
const { Banc } = require('./banc.js');
const fs = require('node:fs');
const path = require('node:path');
const dossier = process.argv[2] || '/tmp/manhattan-osm';
const choix = process.argv[3]?.split(',');
const vues = [
  { nom: 'midtown-rue', x: 4.6, y: 33.01, z: 7.4, yaw: .22, pitch: .08 },
  { nom: 'facade-detail', x: 4.5, y: 36.4, z: 12.7, yaw: -1.15, pitch: .06 },
  { nom: 'midtown-toits', x: 175, y: 135, z: 210, yaw: .65, pitch: -.25 },
  { nom: 'village', x: 0, y: 33.01, z: 500, yaw: -.5, pitch: .10 },
  { nom: 'brooklyn', x: 343, y: 33.01, z: 212, yaw: Math.PI, pitch: .06 },
  { nom: 'liberte', x: -116, y: 43, z: 1250, yaw: Math.PI / 2, pitch: .26 },
  { nom: 'midtown-nuit', x: 4.6, y: 33.01, z: 7.4, yaw: .22, pitch: .08, heure: .75 },
];
(async () => {
  fs.mkdirSync(dossier, { recursive: true });
  const banc = new Banc({ portJeu: 8368, portPairs: 9368 });
  const bilan = [], erreursHttp = [];
  try {
    await banc.ouvrir();
    const page = await banc.jouerSeul('RevueOSM', {
      carte: 'manhattan', rr: 4, viewport: { width: 240, height: 160 }, dpr: 1, ombres: true,
    });
    page.on('response', r => { if (r.status() >= 400) erreursHttp.push([r.status(), r.url()]); });
    for (const vue of vues) {
      if (choix && !choix.includes(vue.nom)) continue;
      // Comme Banc.aLEcart : laisser le CPU bâtir la ville sans payer un grand
      // framebuffer SwiftShader à chaque image. La capture reprend 1200×800.
      await page.setViewportSize({ width: 240, height: 160 });
      const mesure = await page.evaluate(async v => {
        const { ORIGINE_MANHATTAN: O } = await import('/src/manhattan-world.js');
        const ny = await import('/src/new-york-modeles.js');
        const g = window.__game;
        if (v.nom === 'facade-detail') {
          // Cadrer une baie existante, même si le rythme des travées évolue.
          const P = await import('/src/manhattan-plan.js');
          const b = P.BATIMENTS.find(b => b.osm && b.x0 >= 0 && b.x0 < 15 && b.z0 >= 0 && b.z0 < 15);
          let baie;
          for (let x = b.x0; x < b.x1 && !baie; x++) for (let z = b.z0; z < b.z1 && !baie; z++)
            if (P.sommet(b, x, z) > 8 && !P.sommet(b, x - 1, z) && g.villeRealiste.baieOsm(b, x, z, -1, 0, 4))
              baie = { x, z };
          if (!baie) throw new Error('Aucune embrasure pour le gros plan');
          v.x = baie.x - 2.5; v.z = baie.z + 1.7;
        }
        // Le framebuffer réduit ne réduit pas le coût de la shadow map.
        // Préparer les secteurs sans la recalculer ; la capture la rafraîchit.
        g.renderer.shadowMap.autoUpdate = false;
        g.renderer.domElement.style.setProperty('width', '16px', 'important');
        g.renderer.domElement.style.setProperty('height', '16px', 'important');
        g.player.pos.set(O.x + v.x, v.y, O.z + v.z);
        g.player.vel.set(0, 0, 0);
        g.player.flying = true;
        g.player.yaw = v.yaw; g.player.pitch = v.pitch;
        window.__setDayTime(v.heure ?? .42);
        await Promise.all([ny.chargerModeleNY('empire'), ny.chargerModeleNY('liberte'), ny.chargerQuartiers()]);
        const debut = performance.now();
        let precedent = -1, stable = 0;
        while (performance.now() - debut < 120000) {
          await new Promise(r => setTimeout(r, 800));
          // Quatre lectures entre deux images ne prouvent pas que la ville
          // est prête après un saut : attendre des images de jeu distinctes.
          await new Promise(r => requestAnimationFrame(r));
          const n = g.chunkMeshes.size + (g.villeRealiste?.buildings.size || 0);
          const v = g.villeRealiste;
          const enCours = v && (v.queue?.length || v.groundQueue?.length || v.farQueue?.length || v.job);
          if (n === precedent && !enCours) { if (++stable >= 4) break; }
          else { precedent = n; stable = 0; }
        }
        return { ...v, attente: Math.round(performance.now() - debut), running: g.running,
          rendu: { ...g.renderer.info.render }, proches: g.villeRealiste?.buildings.size,
          file: g.villeRealiste?.stats.queued, webgl: g.renderer.getContext().getError() };
      }, vue);
      await page.evaluate(() => {
        const c = __game.renderer.domElement;
        c.style.removeProperty('width'); c.style.removeProperty('height');
        __game.renderer.shadowMap.autoUpdate = true;
        __game.renderer.shadowMap.needsUpdate = true;
      });
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: path.join(dossier, `${vue.nom}.png`), timeout: 180000 });
      bilan.push({ ...vue, ...mesure });
      console.log(JSON.stringify(bilan.at(-1)));
    }
    fs.writeFileSync(path.join(dossier, 'mesures.json'), JSON.stringify({ bilan, erreurs: page.erreurs, erreursHttp }, null, 2));
    if (page.erreurs.length || erreursHttp.length || bilan.some(v => v.webgl || !v.running)) throw new Error('Erreurs pendant la revue');
  } finally { await banc.fermer(); }
})().then(() => process.exit(0), e => { console.error(e); process.exit(1); });
