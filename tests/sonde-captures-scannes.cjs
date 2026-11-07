// LES MATÉRIAUX SCANNÉS (vNEXT) — avant / après, dans la MÊME page.
//
// Le remap des scans est un uniforme (matierehd.js) : à zéro, la couche dessine
// l'atlas peint d'avant, au pixel près (la carte de normales y est plate). On
// photographie donc chaque vue deux fois sans recharger : même lumière, mêmes
// voitures, même instant. Isolée (aucune suite ne l'importe).
//
//     cd tests && node sonde-captures-scannes.cjs [dossier] [vue,vue] [--iphone|--ipad]
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

const args = process.argv.slice(2);
const dossier = args.find((a) => !a.startsWith('--') && !a.includes(',') && !/^[a-z-]+$/.test(a)) || path.join(os.tmpdir(), 'scannes');
const choix = args.find((a) => /^[a-z,-]+$/.test(a) && !a.startsWith('--'));
fs.mkdirSync(dossier, { recursive: true });
const viewport = args.includes('--iphone') ? { width: 430, height: 932 } : args.includes('--ipad') ? { width: 820, height: 1180 } : { width: 1280, height: 720 };
const suffixe = args.includes('--iphone') ? '-iphone' : args.includes('--ipad') ? '-ipad' : '';

// dx, dz en km depuis Notre-Dame (adresseParis) ; `rue` : la chaussée la plus
// proche ; `vise` : le bloc de sol cherché
const VUES = [
  { nom: 'facade', dx: -1.7, dz: 0.8, yaw: 0, pitch: 0.1, h: 1.6, rue: true },
  { nom: 'facade-biais', dx: -1.7, dz: 0.8, yaw: Math.PI / 4, pitch: 0.18, h: 1.6, rue: true },
  { nom: 'rue', dx: -0.8, dz: -0.9, yaw: Math.PI / 2, pitch: 0.05, h: 1.6 },
  { nom: 'trottoir', dx: -1.7, dz: 0.8, yaw: Math.PI, pitch: 0.3, h: 1.4, rue: true, trottoir: true },
  { nom: 'chaussee', dx: -1.7, dz: 0.8, yaw: Math.PI, pitch: 0.45, h: 1.6, rue: true },
  { nom: 'marais', dx: 0.9, dz: -0.5, yaw: Math.PI / 2, pitch: 0.12, h: 1.6, rue: true },
  { nom: 'champs', dx: -4.3, dz: -1.12, yaw: Math.PI / 2, pitch: 0.15, h: 1.6 },
  { nom: 'ciel', dx: -1.2, dz: -0.5, yaw: Math.PI / 2, pitch: -0.5, h: 45 },
  { nom: 'nuit', dx: -1.7, dz: 0.8, yaw: Math.PI / 4, pitch: 0.18, h: 1.6, rue: true, heure: 0.75 },
];

(async () => {
  const banc = new Banc({ portJeu: 8417, portPairs: 9417 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Scans', { rr: 9, viewport, dpr: 1, params: '&ombres=1&hd=6&scannes=1', pret: true });
    const etat = await page.evaluate(async () => {
      const g = window.__game;
      const t0 = performance.now();
      while (performance.now() - t0 < 30000 && (!g.scannesHD || g.scannesHD.statut === 'attente')) await new Promise((r) => setTimeout(r, 250));
      return g.scannesHD && { ...g.scannesHD };
    });
    console.log('scans :', JSON.stringify(etat));
    for (const v of VUES.filter((v) => !choix || choix.split(',').includes(v.nom))) {
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game;
          const { adresseParis, solParis } = await import('./src/paris.js');
          const { ARCHI, CITY_BLOCK } = await import('./src/blocks.js');
          let [x, z] = adresseParis(v.dx, v.dz);
          if (v.rue) {
            const vise = v.trottoir ? CITY_BLOCK.SIDEWALK : ARCHI.PAVE;
            cherche: for (let r = 0; r < 14; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
              if (solParis(x + dx, z + dz) === vise && solParis(x + dx, z + dz - 3) === null) { x += dx; z += dz; break cherche; }
            }
          }
          const y = g.world.terrainHeight(x, z);
          g.player.flying = true;
          g.player.pos.set(x + 0.5, y + 1 + v.h, z + 0.5);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = v.yaw; g.player.pitch = v.pitch;
          window.__setDayTime(v.heure !== undefined ? v.heure : 0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now();
          let n0 = -1;
          while (performance.now() - t0 < 30000) {
            await dodo(700);
            const n = g.chunkMeshes.size; if (n === n0) { await dodo(2500); break; } n0 = n;
          }
          return { x, z, morceaux: g.chunkMeshes.size };
        }, v);
        const u = (on) => page.evaluate(async (on) => {
          const s = window.__game.scannesHD;
          const r = s.uniformes.remapHD.value;
          if (!window.__remapGarde) window.__remapGarde = r.map((q) => q.clone());
          r.forEach((q, i) => (on ? q.copy(window.__remapGarde[i]) : q.set(0, 0, 0, 0)));
          await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 400))));
        }, on);
        await u(false);
        await page.screenshot({ path: path.join(dossier, `avant-${v.nom}${suffixe}.png`), timeout: 120000 });
        await u(true);
        await page.screenshot({ path: path.join(dossier, `apres-${v.nom}${suffixe}.png`), timeout: 120000 });
        console.log(v.nom, JSON.stringify(info));
      } catch (e) { console.log(v.nom, 'ÉCHEC :', String(e && e.message || e).split('\n')[0]); }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
