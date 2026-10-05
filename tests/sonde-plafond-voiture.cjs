// QUEL EST LE PLAFOND DE VITESSE D'UNE VOITURE ? (conduite-physique)
//
// Le plafond de la v260 (28 blocs/s en ville) a été CALCULÉ avant que le
// maillage ne parte dans le worker (v251) : 42 morceaux par seconde à Paris,
// une vitesse v en réclame 1,5 × v. Il se remesure, au critère de la v229 :
// le TROU devant soi — la distance au premier morceau non maillé dans le cône
// d'avance —, médiane de six relevés après quatre secondes de régime, à la
// distance d'affichage de l'iPad (rr=12). Campagne ET Paris, plusieurs vitesses.
// On se déplace en ligne droite au-dessus des toits (le mode vol de l'avion,
// vitesse forcée) : ce qu'on mesure est le chargement, pas la conduite.
const { Banc, souffler } = require('./banc.js');

(async () => {
  const banc = new Banc({ portJeu: 8395, portPairs: 9395 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondePlafond', { rr: 12 });
    const vitesses = (process.env.VITESSES || '30,40,50,60').split(',').map(Number);
    const out = await page.evaluate(async (vitesses) => {
      const g = window.__game;
      const m = await import('./src/montures.js');
      const { positionDe } = await import('./src/mondes.js');
      const P = positionDe('paris');
      let scene = g.npcs && g.npcs[0] ? g.npcs[0].mesh : null;
      while (scene && scene.parent) scene = scene.parent;
      const CHUNK = 16, R = 12;
      const def = m.MONTURES.find((d) => d.key === 'chasseur');
      const patienter = (ms) => new Promise((fin) => { const t0 = performance.now(); const tic = () => (performance.now() - t0 < ms ? requestAnimationFrame(tic) : fin()); requestAnimationFrame(tic); });
      const res = [];
      const lieux = [
        { nom: 'campagne', x: 30000, z: 30000, y: 100, yaw: 0 },
        { nom: 'paris', x: P.x + 500, z: P.z + 40, y: 130, yaw: Math.PI / 2 },   // vers -x, à travers Paris
      ];
      let decal = 0;
      for (const l of lieux) for (const v of vitesses) {
        decal += 1;
        const x0 = l.nom === 'campagne' ? l.x + decal * 3000 : l.x, z0 = l.z;
        g.player.pos.set(x0, l.y, z0); g.player.vel.set(0, 0, 0); g.player.yaw = l.yaw; g.player.pitch = 0;
        g.player.flying = true; g.player.pilote = null; g.player.keys.clear(); g.player.touchMove.f = 0; g.player.touchMove.s = 0;
        // LE BANC REND DIX IMAGES PAR SECONDE ET `dt` EST BORNÉ À UN VINGTIÈME :
        // laissé au joueur, le déplacement irait au ralenti et l'on mesurerait
        // la cadence du banc (premier passage : 77 blocs en dix secondes « à
        // 36 »). On déplace donc la position EN TEMPS RÉEL, à chaque image.
        let marche = true, prec = performance.now();
        const avance = (t) => { if (!marche) return; const d = Math.min(0.5, (t - prec) / 1000); prec = t; g.player.pos.x += -Math.sin(l.yaw) * v * d; g.player.pos.z += -Math.cos(l.yaw) * v * d; g.player.pos.y = l.y; g.player.vel.set(0, 0, 0); requestAnimationFrame(avance); };
        requestAnimationFrame(avance);
        await patienter(4000);
        const releves = []; const fps = [];
        for (let n = 0; n < 6; n++) {
          const i0 = g.renderer ? g.renderer.info.render.frame : 0, t0 = performance.now();
          await patienter(1000);
          if (g.renderer) fps.push((g.renderer.info.render.frame - i0) / ((performance.now() - t0) / 1000));
          const poses = new Set();
          scene.traverse((o) => { if (o.isMesh && o.position.y === 0 && o.position.x % CHUNK === 0 && o.position.z % CHUNK === 0) poses.add(`${o.position.x / CHUNK},${o.position.z / CHUNK}`); });
          const pcx = Math.floor(g.player.pos.x / CHUNK), pcz = Math.floor(g.player.pos.z / CHUNK);
          const vx = -Math.sin(l.yaw), vz = -Math.cos(l.yaw);
          let trou = R;
          for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
            const len = Math.hypot(dx, dz); if (len > R || len < 0.5) continue;
            if ((dx / len) * vx + (dz / len) * vz < 0.3) continue;
            if (!poses.has(`${pcx + dx},${pcz + dz}`)) trou = Math.min(trou, len);
          }
          releves.push(Math.round(trou * CHUNK));
        }
        marche = false;
        const parcouru = Math.round(Math.hypot(g.player.pos.x - x0, g.player.pos.z - z0));
        releves.sort((a, b) => a - b);
        res.push({ lieu: l.nom, v, trou: releves[3], releves, parcouru, fps: fps.length ? +(fps.reduce((a, b) => a + b, 0) / fps.length).toFixed(1) : null });
              }
      return res;
    }, vitesses);
    for (const r of out) console.log(JSON.stringify(r));
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
