// L'ORDRE EN CÔNE SE VOIT-IL ENCORE AU BANC ? (v380)
//
// Le témoin de `monte.js` (« à soixante blocs par seconde dans Paris, le monde
// se maille dans le champ ») rendait 0,29 d'écart à la v346, et 0,02 à 0,07
// des deux côtés à la v379. Cette sonde rejoue SA mesure (même lieu, même
// vitesse, même fenêtre) sur UNE page, en ordre alterné, et sépare trois
// variables : l'ordre (cone | regard), la recharge (image | arrivee), la scène
// (dessinée | vide). Elle publie, par passage, la part installée dans le cône,
// le débit, la cadence et les appels de dessin.
// Usage : node sonde-cone-banc.cjs [paires] [variantes]
//   variantes : « cone,image,0|regard,image,0 » (ordre, recharge, vide)
const { Banc, souffler } = require('./banc.js');
const paires = Number(process.argv[2] || 3);
const variantes = (process.argv[3] || 'cone,image,0|regard,image,0').split('|').map((s) => s.split(','));
(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    const page = await banc.jouerSeul('Sondine', { rr: 12 });
    const rouler = (mode, recharge, vide) => page.evaluate(async ({ mode, recharge, vide }) => {
      const g = window.__game;
      g.fileMaillage(mode);
      if (g.rechargeMaillage) g.rechargeMaillage(recharge === 'regle' ? null : recharge);
      const { positionDe } = await import('./src/mondes.js');
      const CHUNK = 16, R = 12, v = 60;
      const P = positionDe('paris');
      const x0 = P.x - v * 7, z = P.z + 0.5;
      const p = g.player;
      const patienter = (ms) => new Promise((fin) => {
        const t0 = performance.now();
        const tic = () => (performance.now() - t0 < ms ? requestAnimationFrame(tic) : fin());
        requestAnimationFrame(tic);
      });
      const poser = (x) => { p.pos.set(x, 140, z); p.vel.set(0, 0, 0); p.yaw = -Math.PI / 2; p.pitch = 0; };
      p.flying = true;
      poser(x0);
      const t0 = performance.now();
      const pcz = Math.floor(z / CHUNK);
      while (performance.now() - t0 < 40000) {
        poser(x0);
        let n = 0; const pcx = Math.floor(x0 / CHUNK);
        for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) if (g.chunkMeshes.has(`${pcx + dx},${pcz + dz}`)) n++;
        if (n >= (2 * R + 1) ** 2 * 0.9) break;
        await patienter(250);
      }
      const charge = Math.round(performance.now() - t0);
      const rendre = g.renderer.render;
      if (vide) { const sc = new g.scene.constructor(); g.renderer.render = (s, c) => rendre.call(g.renderer, sc, c); }
      const depart = performance.now();
      let roule = true;
      const tic = () => { if (!roule) return; poser(x0 + v * (performance.now() - depart) / 1000); requestAnimationFrame(tic); };
      requestAnimationFrame(tic);
      await patienter(4000);
      const vus = new Set(g.chunkMeshes.keys());
      let installes = 0, dansCone = 0, images = 0, appels = 0, file = [];
      const tf = performance.now() + 6000, tdeb = performance.now();
      while (performance.now() < tf) {
        await patienter(0);
        images++; appels += g.renderer.info.render.calls;
        file.push(g.fileDeMorceaux.length);
        const pcx = Math.floor(p.pos.x / CHUNK);
        for (const k of g.chunkMeshes.keys()) {
          if (vus.has(k)) continue;
          vus.add(k); installes++;
          const [kx, kz] = k.split(',').map(Number);
          const ax = kx - pcx, az = kz - pcz;
          if (ax > 0 && Math.abs(az) <= ax * 0.84) dansCone++;
        }
      }
      const duree = (performance.now() - tdeb) / 1000;
      const pcx = Math.floor(p.pos.x / CHUNK);
      let champ = R;
      for (let dz = -R; dz <= R; dz++) for (let dx = 1; dx <= R; dx++) {
        const len = Math.hypot(dx, dz);
        if (len > R || dx / len < 0.766) continue;
        if (!g.chunkMeshes.has(`${pcx + dx},${pcz + dz}`)) champ = Math.min(champ, len);
      }
      roule = false;
      g.renderer.render = rendre;
      p.flying = false;
      g.fileMaillage(null);
      if (g.rechargeMaillage) g.rechargeMaillage(null);
      file.sort((a, b) => a - b);
      return { mode, recharge, vide, charge, installes, dansCone, part: +(dansCone / (installes || 1)).toFixed(2),
        debit: +(installes / duree).toFixed(0), ips: +(images / duree).toFixed(1), appels: Math.round(appels / images),
        champ: Math.round(champ * CHUNK), fileMed: file[file.length >> 1], regle: g.rechargeRegle };
    }, { mode, recharge, vide });
    for (let k = 0; k < paires; k++) {
      const ordre = k % 2 ? [...variantes].reverse() : variantes;
      for (const [mode, recharge, vide] of ordre) {
        await souffler();
        const r = await rouler(mode, recharge, vide === '1');
        console.log(JSON.stringify(r));
      }
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
