// LES SCANS À 2 048 PIXELS (v588) — mémoire et captures, au palier haut.
//
// Deux pages du palier « Loin » (`?palier=haut`), l'une après l'autre (jamais
// deux ouvertes ensemble, v220), l'une avec les scans de 1 024 (`scannes2k=0`),
// l'autre avec ceux de 2 048. Dans chacune : le monde chargé au point le plus
// dense de Paris (l'ouest, où l'iPhone de Max a planté en v298), puis ce que la
// scène tient en carte graphique (`memoireGPU`, la mesure du journal de bord),
// puis une capture de façade de près. Isolée (aucune suite ne l'importe).
//
//     cd tests && node sonde-scannes-2048.cjs [dossier] [--iphone|--ipad]
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

const args = process.argv.slice(2);
const dossier = args.find((a) => !a.startsWith('--')) || path.join(os.tmpdir(), 'scannes-2048');
fs.mkdirSync(dossier, { recursive: true });
const viewport = args.includes('--iphone') ? { width: 430, height: 932 } : args.includes('--ipad') ? { width: 820, height: 1180 } : { width: 1280, height: 720 };
const suffixe = args.includes('--iphone') ? '-iphone' : args.includes('--ipad') ? '-ipad' : '';

// dx, dz en km depuis Notre-Dame ; `lieu` : où l'on mesure la mémoire
const VUES = [
  { nom: 'facade', dx: -1.7, dz: 0.8, yaw: 0, pitch: 0.1, h: 1.6, d: 2.2 },
  { nom: 'facade-pres', dx: -1.7, dz: 0.8, yaw: Math.PI / 4, pitch: 0.05, h: 1.6, d: 1.2 },
  { nom: 'chaussee', dx: -1.7, dz: 0.8, yaw: Math.PI, pitch: 0.55, h: 1.6 },
];

async function poser(page, v) {
  return page.evaluate(async (v) => {
    const g = window.__game;
    const { adresseParis, solParis } = await import('./src/paris.js');
    const { ARCHI } = await import('./src/blocks.js');
    let [x, z] = adresseParis(v.dx, v.dz);
    cherche: for (let r = 0; r < 14; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (solParis(x + dx, z + dz) === ARCHI.PAVE && solParis(x + dx, z + dz - 3) === null) { x += dx; z += dz; break cherche; }
    }
    const y = g.world.terrainHeight(x, z);
    g.player.flying = true;
    g.player.pos.set(x + 0.5, y + 1 + v.h, z + 0.5);
    g.player.vel.set(0, 0, 0);
    g.player.yaw = v.yaw; g.player.pitch = v.pitch;
    window.__setDayTime(0.42);
    const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
    const t0 = performance.now();
    let n0 = -1;
    while (performance.now() - t0 < 60000) {
      await dodo(1000);
      const n = g.chunkMeshes.size; if (n === n0) { await dodo(3000); break; } n0 = n;
    }
    return { x, z, morceaux: g.chunkMeshes.size, s: Math.round((performance.now() - t0) / 1000) };
  }, v);
}

(async () => {
  const banc = new Banc({ portJeu: 8418, portPairs: 9418 });
  await banc.ouvrir();
  const bilan = {};
  try {
    for (const k2 of ['0', '1']) {
      await souffler();
      const page = await banc.jouerSeul(`Scans${k2}`, { rr: 16, viewport, dpr: 1, params: `&palier=haut&ombres=1&hd=6&scannes=1&scannes2k=${k2}`, pret: true });
      const etat = await page.evaluate(async () => {
        const g = window.__game;
        const t0 = performance.now();
        while (performance.now() - t0 < 60000 && (!g.scannesHD || g.scannesHD.statut === 'attente')) await new Promise((r) => setTimeout(r, 250));
        return { scans: g.scannesHD && { ...g.scannesHD }, palier: g.reglageApplique, normales: g.materiauHD && g.materiauHD.normalMap ? g.materiauHD.normalMap.image.width : 0 };
      });
      const lignes = [];
      for (const v of VUES) {
        try {
          const info = await poser(page, v);
          const mem = await page.evaluate(() => window.__game.memoireGPU(true));
          lignes.push({ vue: v.nom, ...info, texMo: mem.texMo, geoMo: mem.geoMo, total: Math.round(mem.texMo + mem.geoMo) });
          await page.screenshot({ path: path.join(dossier, `${k2 === '1' ? 'apres' : 'avant'}-${v.nom}${suffixe}.png`), timeout: 120000 });
        } catch (e) { lignes.push({ vue: v.nom, echec: String(e && e.message || e).split('\n')[0] }); }
      }
      bilan[k2 === '1' ? '2048' : '1024'] = { etat, lignes };
      console.log(k2 === '1' ? '2048' : '1024', JSON.stringify({ etat, lignes }, null, 1));
      await page.close();
    }
  } finally {
    fs.writeFileSync(path.join(dossier, `bilan${suffixe}.json`), JSON.stringify(bilan, null, 1));
    await banc.fermer();
    process.exit(0);
  }
})();
