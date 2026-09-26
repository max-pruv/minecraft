// CAPTURES DES HUIT MONUMENTS EN RELIEF, pour juger sur image (v292). Usage :
//   node tests/sonde-captures-monuments.cjs <dossier> [étiquette] [noms,séparés]
//
// Consigne permanente de Max : il juge sur captures, de la rue et du ciel, de
// jour et de nuit. Trois vues par monument, cadrées depuis SA position dans le
// registre — jamais une coordonnée écrite à la main (v223).
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
const choix = process.argv[4] ? process.argv[4].split(',') : null;

// d : la distance en blocs ; cap : d'où l'on regarde (radians, 0 = depuis −z) ;
// h : la hauteur de l'œil au-dessus du sol ; pitch : le nez de la caméra.
const VUES = [
  ['Tour Eiffel', [
    { nom: 'rue', d: 34, cap: Math.PI, h: 2, pitch: 0.75 },
    { nom: 'pied', d: 7, cap: Math.PI * 0.75, h: 2, cible: 40, dedans: true },
    { nom: 'ciel', d: 60, cap: Math.PI * 0.25, h: 62, pitch: -0.35 },
    { nom: 'nuit', d: 34, cap: Math.PI, h: 2, pitch: 0.75, heure: 0.75 },
  ]],
  ['Arc de Triomphe', [
    { nom: 'rue', d: 26, cap: 0, h: 2, pitch: 0.5 },
    { nom: 'sous', d: 0, cap: 0, h: 2, cible: 14, dedans: true },
    { nom: 'ciel', d: 40, cap: Math.PI * 0.3, h: 34, pitch: -0.4 },
    { nom: 'nuit', d: 26, cap: 0, h: 2, pitch: 0.5, heure: 0.75 },
  ]],
  ['Notre-Dame', [
    { nom: 'rue', d: 26, cap: Math.PI / 2, h: 2, pitch: 0.45 },
    { nom: 'flanc', d: 22, cap: 0, h: 2, pitch: 0.45 },
    { nom: 'ciel', d: 40, cap: -Math.PI / 3, h: 40, pitch: -0.5 },
    { nom: 'nuit', d: 26, cap: Math.PI / 2, h: 2, pitch: 0.45, heure: 0.75 },
  ]],
  ['Pyramide du Louvre', [
    { nom: 'rue', d: 18, cap: Math.PI * 0.25, h: 2, pitch: 0.2 },
    { nom: 'ciel', d: 26, cap: Math.PI * 0.25, h: 20, pitch: -0.6 },
    { nom: 'nuit', d: 18, cap: Math.PI * 0.25, h: 2, pitch: 0.2, heure: 0.75 },
  ]],
  ['Panthéon', [
    { nom: 'rue', d: 24, cap: 0, h: 2, pitch: 0.55 },
    { nom: 'ciel', d: 36, cap: Math.PI * 0.2, h: 34, pitch: -0.4 },
    { nom: 'nuit', d: 24, cap: 0, h: 2, pitch: 0.55, heure: 0.75 },
  ]],
  ['Invalides', [
    { nom: 'rue', d: 26, cap: 0, h: 2, pitch: 0.45 },
    { nom: 'dome', d: 24, cap: Math.PI, h: 2, pitch: 0.6 },
    { nom: 'ciel', d: 40, cap: Math.PI * 0.8, h: 30, pitch: -0.45 },
    { nom: 'nuit', d: 26, cap: 0, h: 2, pitch: 0.45, heure: 0.75 },
  ]],
  ['Opéra', [
    { nom: 'rue', d: 22, cap: 0, h: 2, pitch: 0.5 },
    { nom: 'ciel', d: 32, cap: Math.PI * 0.2, h: 24, pitch: -0.45 },
    { nom: 'nuit', d: 22, cap: 0, h: 2, pitch: 0.5, heure: 0.75 },
  ]],
  ['Sacré-Cœur', [
    { nom: 'rue', d: 26, cap: Math.PI, h: 2, pitch: 0.55 },
    { nom: 'ciel', d: 42, cap: Math.PI * 0.8, h: 32, pitch: -0.4 },
    { nom: 'nuit', d: 26, cap: Math.PI, h: 2, pitch: 0.55, heure: 0.75 },
  ]],
].flatMap(([mon, vues]) => vues.filter((v) => typeof v === 'object').map((v) => ({ ...v, mon })));

(async () => {
  const banc = new Banc({ portJeu: 8399, portPairs: 9399 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Capture', { rr: 9, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&ombres=1&hd=6' });
    for (const v of VUES) {
      if (choix && !choix.includes(v.mon)) continue;
      try {
        const info = await page.evaluate(async (v) => {
          const g = window.__game;
          const { REPERES_HD } = await import('./src/world.js');
          const { boiteHD } = await import('./src/paris-monuments-hd.js');
          const lm = REPERES_HD.find((l) => l.name === v.mon);
          if (!lm) return { erreur: `repère inconnu : ${v.mon}` };
          const solMonument = g.world.terrainHeight(lm.x, lm.z);
          const haut = boiteHD(lm.name).y1;

          // UNE CAMÉRA SE PLACE, ELLE NE S'ÉCRIT PAS (v223, v285). Mon premier
          // jet posait l'œil à `terrainHeight + h` : à trente blocs de la tour
          // Eiffel, c'est DANS un immeuble haussmannien, et la capture montrait
          // un plafond. On cherche autour du point voulu une colonne dont le
          // sommet SOLIDE est celui de la rue — donc du ciel au-dessus — et le
          // point retenu entre dans le message.
          // On cherche un poste de rue D'OÙ L'ON VOIT LE MONUMENT : la première
          // version se contentait d'une colonne dégagée à `d` blocs, et la
          // capture montrait un mur haussmannien à trois mètres. On balaie donc
          // les caps autour de celui qu'on préfère, et à chaque candidat on
          // MARCHE jusqu'au monument en vérifiant que rien ne dépasse du sol.
          const degageEn = (cx, cz) => g.world.sommetColonne(cx, cz) <= g.world.terrainHeight(cx, cz) + 1;
          const voit = (cx, cz) => {
            const dx = lm.x - cx, dz = lm.z - cz, n = Math.hypot(dx, dz);
            for (let t = 2; t < n - lm.portee - 1; t += 1) {
              const px = Math.round(cx + dx * t / n), pz = Math.round(cz + dz * t / n);
              if (g.world.sommetColonne(px, pz) > g.world.terrainHeight(px, pz) + 2) return false;
            }
            return true;
          };
          let x = Math.round(lm.x - Math.sin(v.cap) * v.d), z = Math.round(lm.z - Math.cos(v.cap) * v.d);
          let trouve = v.dedans === true, capPris = v.cap;
          // Une vue SOUS le monument ne cherche rien : elle se pose là où on la
          // veut, à la cote du sol du repère. La chercher dégagée renvoyait la
          // caméra sur le TOIT de l'arc (mesuré : y 55, nez vers le bas).
          if (!v.dedans) chercher: for (const tour of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8]) {
            const cap = v.cap + tour * Math.PI / 8;
            for (const d of [v.d, v.d * 0.85, v.d * 1.15, v.d * 0.7, v.d * 1.3]) {
              const cx = Math.round(lm.x - Math.sin(cap) * d), cz = Math.round(lm.z - Math.cos(cap) * d);
              if (degageEn(cx, cz) && voit(cx, cz)) { x = cx; z = cz; trouve = true; capPris = cap; break chercher; }
            }
          }
          const y = v.dedans ? solMonument : g.world.sommetColonne(x, z);
          g.player.flying = true;
          g.player.pos.set(x + 0.5, y + 1 + v.h, z + 0.5);
          g.player.vel.set(0, 0, 0);
          // Le cap et le nez se DÉDUISENT de la position du monument : on vise
          // le milieu de sa hauteur, jamais un angle écrit à la main.
          g.player.yaw = v.d === 0 ? v.cap : Math.atan2(-(lm.x - x), -(lm.z - z));
          const dist = Math.max(1, Math.hypot(lm.x - x, lm.z - z));
          const cible = solMonument + (v.cible !== undefined ? v.cible : haut * 0.45);
          g.player.pitch = Math.atan2(cible - (y + 1 + v.h), dist);
          window.__setDayTime(v.heure !== undefined ? v.heure : 0.42);
          const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
          // On attend le FAIT DU MONDE : le nombre de morceaux installés a
          // cessé de bouger. Borné, et la durée entre dans le message.
          const t0 = performance.now();
          let n0 = -1, stable = 0;
          while (performance.now() - t0 < 40000) {
            await dodo(700);
            const n = g.chunkMeshes.size;
            if (n === n0) { if (++stable >= 3) break; } else { stable = 0; n0 = n; }
          }
          await dodo(1500);
          const i = g.renderer.info;
          return { x, z, y, vue: trouve, cap: +capPris.toFixed(2),
            pitch: +g.player.pitch.toFixed(2), attente: Math.round(performance.now() - t0),
            appels: i.render.calls, tri: i.render.triangles, morceaux: g.chunkMeshes.size };
        }, v);
        const f = path.join(dossier, `${tag}-${v.mon.replace(/[^a-zA-Z]/g, '')}-${v.nom}.png`);
        await page.screenshot({ path: f, timeout: 180000 });
        console.log(`${v.mon} ${v.nom}`.padEnd(32), JSON.stringify(info), '→', f);
      } catch (e) {
        console.log(`${v.mon} ${v.nom}`.padEnd(32), 'ÉCHEC :', String((e && e.message) || e).split('\n')[0]);
      }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
