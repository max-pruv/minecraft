// LA SONDE DU RENDU WEBGPU (chantier réalisme 3/5). Isolée : aucune suite ne
// l'importe. Elle ouvre le jeu DEUX fois dans le même banc — le rendu WebGL
// d'aujourd'hui (three r160) et le prototype `?rendu=webgpu` (three r187) —,
// pose la caméra au même endroit de Paris, et mesure ce qui se TRANSPOSE à la
// tablette : les appels de dessin, les triangles, les pipelines compilés, le
// temps PROCESSEUR passé dans `renderer.render` par image (le fil principal,
// ce que l'iPad paie), la part du temps d'image qui n'est pas du rendu. La
// cadence, elle, est celle de SwiftShader (Dawn sous WebGPU, ANGLE sous WebGL)
// et ne se transpose pas (v247) : elle est dans le tableau, elle n'est pas un
// verdict. Ordre alterné (A B B A) : le premier passage paie l'ouverture du
// banc (v268, v382).
//
//   node tests/sonde-rendu-webgpu.cjs [fumee|mesure] [dossier des captures]
//
// Le banc ne donne un adaptateur WebGPU qu'avec trois drapeaux (mesuré :
// `webgpu-dispo2`, novembre 2026) ; `BANC_ARGS` les porte à Chromium.
process.env.BANC_ARGS = process.env.BANC_ARGS || '--enable-unsafe-webgpu --enable-features=WebGPU,Vulkan --ignore-gpu-blocklist';
const path = require('path');
const fs = require('fs');
const { Banc, souffler } = require('./banc.js');

const mode = process.argv[2] || 'mesure';
const dossier = process.argv[3] || path.join(__dirname, '..', 'docs', 'webgpu');
const DUREE_MS = Number(process.env.SONDE_DUREE || 15000);

// La vue : le Marais, à hauteur d'enfant, face à une façade — la même que
// `sonde-captures-paris.cjs` (`marais-km`).
const VUE = { dx: 0.9, dz: -0.5, yaw: Math.PI / 2, pitch: 0.12, h: 1.6, heure: 0.42 };

async function ouvrir(banc, rendu, prenom) {
  const erreurs = [], console_ = [];
  const page = await banc.jouerSeul(prenom, { rr: 6, dpr: 1, viewport: { width: 960, height: 540 },
    params: `&hd=3${rendu === 'webgpu' ? '&rendu=webgpu' : ''}&diag=1&reflets=1` });
  page.on('pageerror', (e) => erreurs.push(String(e.message).split('\n')[0]));
  page.on('console', (m) => { if (m.type() === 'error') console_.push(m.text().slice(0, 200)); });
  return { page, erreurs, console_ };
}

async function placer(page) {
  return page.evaluate(async (v) => {
    const g = window.__game;
    const { adresseParis, solParis } = await import('./src/paris.js');
    const { ARCHI } = await import('./src/blocks.js');
    let [x, z] = adresseParis(v.dx, v.dz);
    cherche: for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (solParis(x + dx, z + dz) === ARCHI.PAVE && solParis(x + dx, z + dz - 3) === null) { x += dx; z += dz; break cherche; }
    }
    const y = g.world.terrainHeight(x, z);
    g.player.flying = true;
    g.player.pos.set(x + 0.5, y + 1 + v.h, z + 0.5);
    g.player.vel.set(0, 0, 0);
    g.player.yaw = v.yaw; g.player.pitch = v.pitch;
    window.__setDayTime(v.heure);
    // une voiture devant, pour que la mesure porte aussi la flotte (reflets, laque)
    // la même invocation que les témoins de `monte.js` : la voiture est posée là où le regard porte
    try { g.animalManager.invoquer('voiture', x + 0.5 + 4, z + 0.5 - 1, false); } catch { /* la rue suffit */ }
    const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
    const t0 = performance.now(); let n0 = -1;
    while (performance.now() - t0 < 40000) {
      await dodo(1000);
      const n = g.chunkMeshes.size; if (n === n0 && n > 0) { await dodo(2000); break; } n0 = n;
    }
    return { x, z, y, morceaux: g.chunkMeshes.size, attente: Math.round(performance.now() - t0) };
  }, VUE);
}

// La mesure : on enveloppe `renderer.render` pour chronométrer le fil principal
// image par image, et l'on relève les compteurs du rendu.
async function mesurer(page, duree) {
  return page.evaluate(async (duree) => {
    const g = window.__game, r = g.renderer;
    const rendus = [], images = [];
    const orig = r.render.bind(r);
    let dernier = 0;
    r.render = (s, c) => { const t = performance.now(); const out = orig(s, c); rendus.push(performance.now() - t); if (dernier) images.push(t - dernier); dernier = t; return out; };
    await new Promise((res) => setTimeout(res, duree));
    r.render = orig;
    const med = (a) => { const b = [...a].sort((p, q) => p - q); return b.length ? b[Math.floor(b.length / 2)] : 0; };
    const p90 = (a) => { const b = [...a].sort((p, q) => p - q); return b.length ? b[Math.floor(b.length * 0.9)] : 0; };
    const info = r.info;
    const tas = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    return {
      images: rendus.length, renduMs: Math.round(med(rendus) * 100) / 100, renduP90: Math.round(p90(rendus) * 100) / 100,
      imageMs: Math.round(med(images)), horsRenduMs: Math.round((med(images) - med(rendus)) * 10) / 10,
      appels: info.render.calls, ktri: Math.round(info.render.triangles / 1000), programmes: info.programs ? info.programs.length : null,
      geometries: info.memory.geometries, textures: info.memory.textures, tasMo: tas,
      diag: (document.getElementById('debug') || {}).textContent || '',
    };
  }, duree);
}

(async () => {
  fs.mkdirSync(dossier, { recursive: true });
  const banc = new Banc({ portJeu: 8473, portPairs: 9473 });
  await banc.ouvrir();
  const resultats = [];
  try {
    const ordre = mode === 'fumee' ? ['webgpu'] : ['webgl', 'webgpu', 'webgpu', 'webgl'];
    let i = 0;
    for (const rendu of ordre) {
      await souffler();
      const t0 = Date.now();
      const { page, erreurs, console_ } = await ouvrir(banc, rendu, `Mesure${i}`);
      const ouverture = Date.now() - t0;
      const place = await placer(page);
      const m = mode === 'fumee' ? await mesurer(page, 3000) : await mesurer(page, DUREE_MS);
      const capture = path.join(dossier, `${rendu}-marais-${i}.png`);
      await page.screenshot({ path: capture, timeout: 120000 });
      const ligne = { rendu, passage: i, ouvertureMs: ouverture, ...place, ...m, erreurs: [...new Set(erreurs)], console: [...new Set(console_)].slice(0, 8) };
      resultats.push(ligne);
      console.log(`\n=== ${rendu} (passage ${i})`);
      for (const [k, v] of Object.entries(ligne)) if (k !== 'diag') console.log(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
      console.log('  diag:', ligne.diag.split('\n').slice(0, 4).join(' | ').slice(0, 400));
      await page.close();
      i++;
    }
    fs.writeFileSync(path.join(dossier, 'mesures.json'), JSON.stringify(resultats, null, 2));
    if (mode !== 'fumee') {
      const par = (r) => resultats.filter((l) => l.rendu === r);
      const med = (a) => { const b = [...a].sort((p, q) => p - q); return b[Math.floor(b.length / 2)]; };
      console.log('\n| grandeur | WebGL (r160) | WebGPU (r187) |\n| --- | --- | --- |');
      for (const k of ['appels', 'ktri', 'programmes', 'renduMs', 'renduP90', 'imageMs', 'horsRenduMs', 'geometries', 'textures', 'tasMo', 'ouvertureMs', 'morceaux']) {
        console.log(`| ${k} | ${par('webgl').map((l) => l[k]).join(' · ')} | ${par('webgpu').map((l) => l[k]).join(' · ')} |`);
      }
    }
  } finally { await banc.fermer(); }
})();
