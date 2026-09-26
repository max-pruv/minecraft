// L'ÉTAT INITIAL DU MONDE — avant le programme « monde fidèle » (kit de Max,
// septembre 2026), et après chacune de ses étapes.
//
// Le cahier demande des caméras FIXES et des parcours REPRODUCTIBLES, mêmes
// points de vue avant/après, mêmes réglages, mêmes durées ; et de ne jamais
// présenter une intention comme une preuve visuelle. Cette sonde est cet
// instrument : elle prend les vues, mesure deux parcours (à pied, au volant)
// avec P50/P95/P99 des images, et écrit un compte rendu JSON à côté des
// captures. Elle mesure LE BANC (rendu logiciel, quatre cœurs) — jamais un iPad :
// ce qui se compare, c'est avant/après sur cette même machine.
//
//   node tests/sonde-etat-initial.cjs [dossier] [tag] [vue,vue,...]
//   → <dossier>/<tag>-<vue>.png et <dossier>/<tag>.json
const { Banc, souffler, dormir } = require('./banc.js');
const fs = require('fs');
const path = require('path');

const dossier = process.argv[2] || 'docs/monde-fidele/captures';
const tag = process.argv[3] || 'avant';
const seules = process.argv[4] ? process.argv[4].split(',') : null;
// Un cinquième argument s'ajoute à l'adresse du jeu : `&solcontinu=0` rejoue
// le voxel d'avant la v297 sur le même code, à l'octet près dans le mailleur.
const extra = process.argv[5] || '';

// Les vues : en kilomètres de Notre-Dame (`dx`, `dz`, via adresseParis) ou en
// blocs absolus (`x`, `z`) ; `rue` cherche la chaussée la plus proche ; `h` est
// la hauteur des yeux au-dessus du sol ; `heure` fige le ciel (0,42 = jour).
const VUES = [
  { nom: 'paris-rue', dx: -0.8, dz: -0.9, yaw: Math.PI / 2, pitch: 0.05, h: 1.6, rue: true },
  { nom: 'paris-carrefour', dx: -1.7, dz: 0.8, yaw: Math.PI, pitch: -0.9, h: 14, rue: true },
  { nom: 'paris-monument', x: -322, z: 248, yaw: 0, pitch: 0.28, h: 1.6 },
  { nom: 'paris-sortie-nord', x: -240, z: 24, yaw: 0, pitch: 0.02, h: 1.6 },
  { nom: 'campagne-a1', x: -110, z: -330, yaw: 0.25, pitch: 0.0, h: 1.6 },
  { nom: 'campagne-a1-ciel', x: -110, z: -330, yaw: 0.25, pitch: -0.55, h: 40 },
  { nom: 'lille-entree-sud', x: 35, z: -752, yaw: 0, pitch: 0.02, h: 1.6 },
  { nom: 'lille-centre', x: 35, z: -851, yaw: Math.PI / 2, pitch: 0.05, h: 1.6, rue: true },
  { nom: 'gare-paris', gare: 'paris', yaw: 0, pitch: 0.05, h: 1.6 },
  { nom: 'paris-nuit', dx: -0.8, dz: -0.9, yaw: Math.PI / 2, pitch: 0.05, h: 1.6, rue: true, heure: 0.0 },
];

// Un échantillonneur DANS la page : les périodes réelles entre images pendant
// `ms`, et ce que le joueur a parcouru. `dt` est borné dans le jeu ; ici on
// lit l'horloge.
const echantillonner = (page, ms) => page.evaluate(async (ms) => {
  const g = window.__game;
  const p0 = g.player.pos.clone();
  const t0 = performance.now();
  const per = [];
  let last = t0;
  await new Promise((r) => {
    const f = (t) => { per.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else r(); };
    requestAnimationFrame(f);
  });
  per.sort((a, b) => a - b);
  const q = (p) => +per[Math.min(per.length - 1, Math.floor(per.length * p))].toFixed(1);
  const info = g.renderer.info;
  return {
    images: per.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), pire: +per[per.length - 1].toFixed(0),
    blocs: +g.player.pos.distanceTo(p0).toFixed(1), morceaux: g.chunkMeshes.size, appels: info.render.calls,
    ktri: Math.round(info.render.triangles / 1000), tasMo: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    x: Math.round(g.player.pos.x), z: Math.round(g.player.pos.z), y: +g.player.pos.y.toFixed(1),
  };
}, ms);

(async () => {
  fs.mkdirSync(dossier, { recursive: true });
  const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
  await banc.ouvrir();
  const rapport = { tag, date: new Date().toISOString(), banc: 'rendu logiciel, rr 9, hd 6, ombres, 1280×720, dpr 1', vues: {}, parcours: {} };
  try {
    await souffler();
    const page = await banc.jouerSeul('Etat', { rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1&hd=6' + extra });
    for (const v of VUES.filter((v) => !seules || seules.includes(v.nom))) {
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game;
          const { adresseParis, solParis } = await import('./src/paris.js');
          const { ARCHI } = await import('./src/blocks.js');
          let x, z;
          if (v.gare) {
            // Sur le QUAI, pas sur la voie : la gare est un ouvrage posé
            // au-dessus du terrain, et une caméra à `terrainHeight` sur l'axe
            // regardait le dessous du remblai (première sonde, vue inutilisable).
            const { garesDeTrain, QUAI_DEDANS, QUAI_DEHORS } = await import('./src/trains.js');
            const gare = garesDeTrain().find((q) => q.ville === v.gare);
            const at = (QUAI_DEDANS + QUAI_DEHORS) / 2;
            x = Math.round(gare.x - gare.ux * 6 - gare.uz * at); z = Math.round(gare.z - gare.uz * 6 + gare.ux * at);
            v.yaw = Math.atan2(-gare.ux, -gare.uz);
          } else if (v.x !== undefined) { x = v.x; z = v.z; } else { [x, z] = adresseParis(v.dx, v.dz); }
          if (v.rue) {
            cherche: for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
              if (solParis(x + dx, z + dz) === ARCHI.PAVE && solParis(x + dx, z + dz - 3) === null) { x += dx; z += dz; break cherche; }
            }
          }
          // UNE CAMÉRA DE CAPTURE SE PLACE, ET « SE PLACER » VEUT DIRE VOIR
          // (v292) : on cherche autour du point une colonne dont le sommet
          // solide a deux blocs d'air au-dessus — l'entrée sud de Lille
          // tombait DANS un tronc, et la première planche montrait de l'écorce.
          const { BLOCK } = await import('./src/blocks.js');
          const degage = (px, pz) => { const s = g.world.sommetColonne(px, pz); return g.world.getBlock(px, s + 1, pz) === BLOCK.AIR && g.world.getBlock(px, s + 2, pz) === BLOCK.AIR ? s : null; };
          let y = degage(x, z);
          if (y === null) {
            cherche2: for (let r = 1; r < 8; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
              const s = degage(x + dx, z + dz); if (s !== null) { x += dx; z += dz; y = s; break cherche2; }
            }
          }
          if (y === null) y = g.world.terrainHeight(x, z);
          g.player.flying = true;
          g.player.pos.set(x + 0.5, y + 1 + v.h, z + 0.5); g.player.vel.set(0, 0, 0);
          g.player.yaw = v.yaw; g.player.pitch = v.pitch;
          window.__setDayTime(v.heure !== undefined ? v.heure : 0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          // ON ATTEND QUE LE MONDE SOIT LÀ, PAS QUE DEUX RELEVÉS SE RESSEMBLENT.
          // Deux relevés égaux à une demi-seconde d'écart, c'est le worker
          // qui n'a pas encore rendu son premier lot : la première planche de
          // la campagne montrait QUATRE morceaux et le paysage lointain à la
          // place du proche. Huit secondes au moins, puis quatre relevés
          // consécutifs sans changement (deux secondes), borné à quarante.
          const t0 = performance.now();
          let n0 = -1, stables = 0;
          while (performance.now() - t0 < 40000) {
            await dodo(500);
            const n = g.chunkMeshes.size;
            stables = n === n0 ? stables + 1 : 0; n0 = n;
            if (performance.now() - t0 > 8000 && stables >= 4) break;
          }
          const info = g.renderer.info;
          return { x, z, y, appels: info.render.calls, ktri: Math.round(info.render.triangles / 1000), morceaux: g.chunkMeshes.size, attente: Math.round(performance.now() - t0) };
        }, v);
        const f = path.join(dossier, `${tag}-${v.nom}.png`);
        await page.screenshot({ path: f, timeout: 120000 });
        rapport.vues[v.nom] = info;
        console.log(v.nom, JSON.stringify(info), '→', f);
      } catch (e) { rapport.vues[v.nom] = { echec: String(e && e.message || e).split('\n')[0] }; console.log(v.nom, 'ÉCHEC :', rapport.vues[v.nom].echec); }
    }

    // PARCOURS 1 — à pied dans Paris, soixante secondes vers l'est depuis la rue témoin.
    if (!seules || seules.includes('pied')) {
      await page.evaluate(async () => {
        const g = window.__game;
        const { adresseParis } = await import('./src/paris.js');
        const [x, z] = adresseParis(-0.8, -0.9);
        g.player.flying = false; g.player.pos.set(x + 0.5, g.world.terrainHeight(x, z) + 2, z + 0.5); g.player.vel.set(0, 0, 0);
        g.player.yaw = -Math.PI / 2; g.player.pitch = 0; window.__setDayTime(0.42);
        await new Promise((r) => setTimeout(r, 3000));
        g.player.touchMove.f = 1;
      });
      rapport.parcours.pied = await echantillonner(page, 60000);
      await page.evaluate(() => { window.__game.player.touchMove.f = 0; });
      console.log('parcours à pied', JSON.stringify(rapport.parcours.pied));
    }

    // PARCOURS 2 — au volant, soixante secondes sur la rue de Rivoli. On
    // invoque une voiture devant soi, on monte par le bouton (l'idiome de
    // monte.js : l'état se lit dans le jeu, jamais dans le texte du bouton).
    if (!seules || seules.includes('voiture')) {
      await page.evaluate(async () => {
        const g = window.__game;
        const { adresseParis } = await import('./src/paris.js');
        const [x, z] = adresseParis(-0.6, -0.2);
        g.player.flying = false; g.player.pos.set(x + 0.5, g.world.terrainHeight(x, z) + 2, z + 0.5); g.player.vel.set(0, 0, 0);
        g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
        for (const a of [...g.animalManager.animals]) if (a.def.key !== 'poisson') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
        g.animalManager.invoquer('voiture', x + 3, z);
      });
      await dormir(2500);
      const auVolant = () => page.evaluate(() => !!(window.__game.fun.montureConduite && window.__game.fun.montureConduite()));
      for (let essai = 0; essai < 6 && !(await auVolant()); essai++) {
        await page.evaluate(() => { const b = document.getElementById('ride-btn'); if (b) b.click(); });
        await dormir(1200);
      }
      const monte = await auVolant();
      if (monte) {
        await page.evaluate(() => { window.__game.player.touchMove.f = 1; });
        rapport.parcours.voiture = await echantillonner(page, 60000);
        await page.evaluate(() => { window.__game.player.touchMove.f = 0; });
      } else rapport.parcours.voiture = { echec: 'pas monté en voiture' };
      console.log('parcours au volant', JSON.stringify(rapport.parcours.voiture));
    }
  } finally {
    // Un rejeu PARTIEL (une liste de vues) complète le compte rendu existant
    // au lieu de l'écraser : repointer deux vues ne doit pas perdre les huit
    // autres ni les deux parcours.
    const fichier = path.join(dossier, `${tag}.json`);
    let final = rapport;
    if (seules && fs.existsSync(fichier)) {
      try {
        const avant = JSON.parse(fs.readFileSync(fichier, 'utf8'));
        final = { ...avant, vues: { ...avant.vues, ...rapport.vues }, parcours: { ...avant.parcours, ...rapport.parcours } };
      } catch { final = rapport; }
    }
    fs.writeFileSync(fichier, JSON.stringify(final, null, 1));
    await banc.fermer();
    process.exit(0);
  }
})();
