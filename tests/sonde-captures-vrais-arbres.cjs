// LES VRAIS ARBRES (v497) : des captures pour juger sur image — une forêt
// tempérée de près et en vol, la taïga, les palmiers des tropiques, les
// oliviers et pins parasols, une rue plantée de Paris.
//   node tests/sonde-captures-vrais-arbres.cjs <dossier> <étiquette> [nom,nom]
// Le banc rend en logiciel : la couche se force (`hd=3`), comme pour Paris.
// Lancé depuis un arbre d'`origin/main`, le script photographie l'avant.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const TOUTES = [
  // la forêt tempérée la plus dense près de (−1 500, −2 500) : le morceau (−98, −156)
  { nom: 'foret-sol', x: -1560, z: -2488, h: 1.6, pitch: 0.12, yaw: 0.8 },
  { nom: 'foret-pres', x: -1560, z: -2488, h: 1.6, pitch: 0.35, yaw: -0.6 },
  { nom: 'foret-vol', x: -1560, z: -2470, h: 22, pitch: -0.55, yaw: 0.2 },
  { nom: 'foret-ciel', x: -1560, z: -2440, h: 60, pitch: -0.9, yaw: 0.0 },
  { nom: 'taiga-sol', lat: 52, lon: -72, h: 1.6, pitch: 0.15, yaw: 2.0 },
  { nom: 'taiga-vol', lat: 52, lon: -72, h: 24, pitch: -0.5, yaw: 0.6 },
  { nom: 'tropiques-sol', lat: 1, lon: 114, h: 1.6, pitch: 0.2, yaw: 2.0 },
  { nom: 'tropiques-vol', lat: 1, lon: 114, h: 24, pitch: -0.5, yaw: 0.6 },
  { nom: 'mediterranee-sol', lat: 43.1, lon: 11.4, h: 1.6, pitch: 0.1, yaw: 1.2 },
  { nom: 'mediterranee-vol', lat: 43.1, lon: 11.4, h: 20, pitch: -0.45, yaw: 0.6 },
  // les marronniers des Champs-Élysées, depuis le milieu de l'avenue
  { nom: 'champs', dx: -4.3, dz: -1.25, yaw: Math.PI / 2, pitch: 0.08, h: 1.6 },
  { nom: 'champs-trottoir', dx: -4.3, dz: -1.12, yaw: Math.PI / 2, pitch: 0.2, h: 1.6 },
  { nom: 'champs-vol', dx: -4.3, dz: -1.25, yaw: Math.PI / 2, pitch: -0.5, h: 22 },
];
const filtre = process.argv[4];
const VUES = filtre ? TOUTES.filter((v) => filtre.split(',').some((f) => v.nom.startsWith(f))) : TOUTES;
(async () => {
  const banc = new Banc({ portJeu: 8474, portPairs: 9474 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Arbres', { rr: 8, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1&hd=3' + (process.env.ARBRES === '0' ? '&arbres=0' : '') });
    for (const v of VUES) {
      try {
        const info = await page.evaluate(async (v) => {
          const { cielDe, zDeLatitude } = await import('./src/mondes.js');
          const { adresseParis } = await import('./src/paris.js');
          const g = window.__game, w = g.world;
          let x, z;
          if (v.lat !== undefined) {
            z = Math.round(zDeLatitude(v.lat));
            let a = -80000, b = 80000;
            for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (cielDe(m, z).lon < v.lon) a = m; else b = m; }
            x = Math.round(a);
          } else if (v.dx !== undefined) { [x, z] = adresseParis(v.dx, v.dz); } else { x = v.x; z = v.z; }
          // au sol : une colonne sans arbre dessus, à quelques blocs, pour que la
          // caméra ne soit pas dans un fût
          // au sol : une clairière — aucun arbre à moins de quatre blocs, pour que
          // la caméra ne soit ni dans un fût ni dans une couronne
          if (v.h < 3) {
            const libre = (ax, az) => { for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) if (w.treeAt(ax + dx, az + dz)) return false; return w.terrainHeight(ax, az) > 31; };
            cherche: for (let r = 0; r < 24; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
              if (libre(x + dx, z + dz)) { x += dx; z += dz; break cherche; }
            }
          }
          const sol = Math.max(w.terrainHeight(x, z), 30);
          g.player.flying = true;
          g.player.pos.set(x + 0.5, sol + 1 + v.h, z + 0.5);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = v.yaw; g.player.pitch = v.pitch;
          window.__setDayTime(0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          const t0 = performance.now();
          let n0 = -1, stable = 0;
          await dodo(6000);
          while (performance.now() - t0 < 90000) {
            await dodo(800);
            const n = g.chunkMeshes.size, att = [...g.chunkMeshes.values()].filter((e) => e.hd && !e.detail).length;
            if (n === n0 && att === 0) { if (++stable >= 4) break; } else { stable = 0; n0 = n; }
          }
          await dodo(1500);
          let arbres = 0, detaille = 0, mo = 0;
          for (const e of g.chunkMeshes.values()) { arbres += e.arbres || 0; if (e.facades && e.facades.visible) { detaille++; mo += e.octetsFacades || 0; } }
          const info = g.renderer.info;
          return { x, z, sol, attente: Math.round(performance.now() - t0), morceaux: g.chunkMeshes.size, arbres, detaille, facadesMo: +(mo / 1048576).toFixed(2), appels: info.render.calls, tri: info.render.triangles };
        }, v);
        const fch = path.join(dossier, `${tag}-${v.nom}.png`);
        await page.screenshot({ path: fch, timeout: 180000 });
        console.log(v.nom.padEnd(18), JSON.stringify(info), '→', fch);
      } catch (e) {
        console.log(v.nom.padEnd(18), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
      }
    }
  } catch (e) {
    console.log('ÉCHEC :', String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  } finally { await banc.fermer(); process.exit(0); }
})();
