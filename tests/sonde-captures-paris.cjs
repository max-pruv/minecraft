// Captures de Paris pour juger sur image : rue, ciel, nuit. Usage :
//   node tests/sonde-captures-paris.cjs <dossier> [nom]
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'avant';

const VUES = [
  // dx, dz en km depuis Notre-Dame ; yaw ; pitch ; hauteur au-dessus du sol ; nom
  { nom: 'rue-haussmann', dx: -0.8, dz: -0.9, yaw: Math.PI / 2, pitch: 0.05, h: 1.6 },
  { nom: 'commerce', dx: -0.8, dz: -0.9, yaw: 0, pitch: 0.12, h: 1.6, rue: true },
  { nom: 'germain', dx: -1.7, dz: 0.8, yaw: Math.PI / 4, pitch: 0.18, h: 1.6, rue: true },
  { nom: 'germain-rue', dx: -1.7, dz: 0.8, yaw: Math.PI, pitch: 0.22, h: 1.6, rue: true },
  { nom: 'germain-carrefour', dx: -1.7, dz: 0.8, yaw: Math.PI, pitch: -0.9, h: 14, rue: true },
  { nom: 'germain-face', dx: -1.7, dz: 0.8, yaw: 0, pitch: 0.1, h: 1.6, rue: true },
  { nom: 'monceau', dx: -3.2, dz: -2.2, yaw: -Math.PI / 4, pitch: 0.15, h: 1.6, rue: true },
  { nom: 'coin', dx: -0.8, dz: -0.9, yaw: Math.PI / 4, pitch: 0.25, h: 1.6, rue: true },
  { nom: 'rue-rivoli', dx: -0.6, dz: -0.2, yaw: -Math.PI / 2, pitch: 0.05, h: 1.6 },
  { nom: 'quai', dx: 0.0, dz: -0.35, yaw: Math.PI, pitch: 0.05, h: 1.6 },
  { nom: 'ciel', dx: -1.2, dz: -0.5, yaw: Math.PI / 2, pitch: -0.5, h: 45 },
  { nom: 'nuit-rue', dx: -0.8, dz: -0.9, yaw: Math.PI / 2, pitch: 0.05, h: 1.6, heure: 0.0 },
  { nom: 'eiffel', dx: -3.6, dz: 0.9, yaw: Math.PI / 2, pitch: 0.15, h: 1.6 },
  // v288 : les quartiers, les arbres, le mobilier (adresses ABSOLUES, mesurées
  // par le témoin de parishd.js — le centre d'un quartier est une place)
  { nom: 'marais', x: -200, z: 200, yaw: Math.PI / 2, pitch: 0.12, h: 1.6, rue: true },
  { nom: 'marais-face', x: -200, z: 200, yaw: 0, pitch: 0.25, h: 1.6, rue: true },
  { nom: 'marais-est', x: -200, z: 200, yaw: -Math.PI / 2, pitch: 0.1, h: 1.6, rue: true },
  { nom: 'marais-ciel', x: -200, z: 200, yaw: -Math.PI / 2, pitch: -0.7, h: 18, rue: true },
  { nom: 'arbres', x: -264, z: 168, yaw: -Math.PI / 2, pitch: 0.1, h: 1.6, rue: true },
  { nom: 'trottoir', dx: -1.7, dz: 0.8, yaw: Math.PI, pitch: 0.3, h: 1.4, rue: true, trottoir: true },
  // les Champs-Élysées, au milieu de l'avenue, cap sur l'Étoile : les marronniers
  { nom: 'champs', dx: -4.3, dz: -1.25, yaw: Math.PI / 2, pitch: 0.08, h: 1.6 },
  { nom: 'champs-trottoir', dx: -4.3, dz: -1.12, yaw: Math.PI / 2, pitch: 0.15, h: 1.6 },
  { nom: 'champs-est', x: -330, z: 190, yaw: -Math.PI / 2, pitch: 0.06, h: 1.6 },
  { nom: 'cour', x: -265, z: 169, yaw: Math.PI, pitch: -0.75, h: 14 },
  // v289 : le comble à la Mansart, vu de la rue (le nez levé), de la hauteur de
  // la corniche (le profil brisis / terrasson), et du ciel ; un banc et une
  // colonne Morris, aux places que la sonde `ou-mobilier` a relevées.
  { nom: 'toits', x: -200, z: 200, yaw: Math.PI / 2, pitch: 0.55, h: 1.6, rue: true },
  { nom: 'toits-corniche', x: -200, z: 200, yaw: Math.PI / 2, pitch: 0.05, h: 8.5, rue: true },
  { nom: 'toits-ciel', dx: -0.8, dz: -0.9, yaw: Math.PI / 2, pitch: -0.45, h: 16 },
  // (le banc est à (−206, 210), la colonne à (−194, 221) : `ou-mobilier` les a
  // relevés dans les tampons, et la caméra se pose sur la chaussée d'en face)
  { nom: 'banc', x: -202, z: 206, yaw: 3 * Math.PI / 4, pitch: 0.15, h: 1.6 },
  { nom: 'banc-2', x: -209, z: 210, yaw: -Math.PI / 2, pitch: 0.05, h: 1.5 },
  { nom: 'morris', x: -200, z: 221, yaw: -Math.PI / 2, pitch: 0.1, h: 1.6 },
  { nom: 'toit-pres', x: -209, z: 210, yaw: 0, pitch: 0.55, h: 5 },
  { nom: 'toit-pres-2', x: -209, z: 210, yaw: 0, pitch: 0.15, h: 8.5 },
  { nom: 'toit-pres-3', x: -209, z: 210, yaw: -Math.PI / 2, pitch: 0.12, h: 8.5 },
  { nom: 'toit-plateau', x: -200, z: 200, yaw: Math.PI / 2, pitch: -0.6, h: 13 },
  { nom: 'toit-bord', x: -200, z: 206, yaw: 0, pitch: -0.35, h: 10 },
];

(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1&hd=6' });
    for (const v of VUES.filter((v) => !process.argv[4] || process.argv[4].split(',').includes(v.nom))) {
      // UNE VUE QUI ÉCHOUE LE DIT, et les suivantes se prennent quand même : le
      // `finally` d'en bas sort en zéro et avalait l'erreur en silence.
      try {
      const info = await page.evaluate(async (v) => {
        const g = window.__game;
        const { adresseParis } = await import('./src/paris.js');
        let [x, z] = v.x !== undefined ? [v.x, v.z] : adresseParis(v.dx, v.dz);
        if (v.rue) {
          // le milieu de la première chaussée trouvée, face à une façade — ou,
          // pour `trottoir`, le trottoir lui-même devant la façade
          const { solParis } = await import('./src/paris.js');
          const { ARCHI, CITY_BLOCK } = await import('./src/blocks.js');
          const vise = v.trottoir ? CITY_BLOCK.SIDEWALK : ARCHI.PAVE;
          cherche: for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (solParis(x + dx, z + dz) === vise && solParis(x + dx, z + dz - 3) === null) { x += dx; z += dz; break cherche; }
          }
        }
        const y = g.world.terrainHeight(x, z);
        g.player.flying = true;
        g.player.pos.set(x + 0.5, y + 1 + v.h, z + 0.5);
        g.player.vel.set(0, 0, 0);
        g.player.yaw = v.yaw; g.player.pitch = v.pitch;
        if (v.heure !== undefined) window.__setDayTime(v.heure); else window.__setDayTime(0.42);
        const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
        const t0 = performance.now();
        while (performance.now() - t0 < 25000) {
          await dodo(500);
          const n = g.chunkMeshes.size; if (n === (window.__n0 || -1)) { await dodo(2000); break; } window.__n0 = n;
        }
        const info = g.renderer.info;
        return { x, z, y, appels: info.render.calls, tri: info.render.triangles, morceaux: g.chunkMeshes.size };
      }, v);
      const f = path.join(dossier, `${tag}-${v.nom}.png`);
      await page.screenshot({ path: f, timeout: 120000 });
      console.log(v.nom, JSON.stringify(info), '→', f);
      } catch (e) { console.log(v.nom, 'ÉCHEC :', String(e && e.message || e).split('\n')[0]); }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
