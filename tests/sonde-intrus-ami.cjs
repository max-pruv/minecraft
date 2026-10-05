// SONDE (v375) : la voiture de la rue qui entre chez l'ami — trois pistes.
// (1) cap de l'ami lu sur rp.yaw ; (2) position réseau en retard ; (3) une
// voiture d'un autre convoi, de travers. On relève CHEZ ALICE, image par
// image, chaque voiture qui touche le rectangle VRAI de Marlon, avec ce que
// cederLePassage en pensait.
const { Banc, dormir, jusqua } = require('./banc.js');
const { servirLeNuage } = require('./nuage.js');
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  const nuage = await servirLeNuage(9721);
  try {
    const { p: hote, code } = await banc.creerMonde('Marlon');
    const alice = await banc.rejoindre('Alice', code);
    await dormir(4000);
    const allerAParis = (page) => page.evaluate(async () => {
      const g = window.__game; const { PARIS } = await import('./src/paris.js');
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      g.player.pos.set(PARIS.x, g.world.terrainHeight(PARIS.x, PARIS.z) + 30, PARIS.z);
      g.player.vel.set(0, 0, 0); g.player.flying = true;
    });
    await allerAParis(hote); await allerAParis(alice); await dormir(15000);
    const prise = await hote.evaluate(async () => {
      const g = window.__game, v = window.__vehicules; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      g.player.flying = false;
      for (let e = 0; e < 40; e++) {
        for (const c of v.etat()) { if (!c.routier || c.nom !== 'voiture') continue;
          for (const pl of c.places) {
            g.player.pos.set(pl[0] + 0.5, g.world.terrainHeight(pl[0], pl[1]) + 1.2, pl[1]); g.player.vel.set(0, 0, 0);
            await dodo(150); document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' })); await dodo(1500);
            const a = g.fun.montureConduite && g.fun.montureConduite(); if (a && a.mesh) return true;
          } }
        await dodo(500);
      }
      return false;
    });
    console.log('au volant', prise);
    const id = await alice.evaluate(() => { for (const [k, rp] of window.__game.remotePlayers) if (rp.name === 'Marlon') return k; return null; });
    const resultats = [];
    for (let essai = 0; essai < Number(process.env.ESSAIS || 6); essai++) {
      const pose = await alice.evaluate((k) => {
        const cands = [];
        for (const c of window.__vehicules.etat()) { if (!c.routier || c.nom !== 'voiture') continue; for (const pl of c.places) if (!pl[5]) cands.push(pl); }
        if (!cands.length) return null; const pl = cands[(k * 7) % cands.length]; return { x: pl[0], z: pl[1], cap: pl[2] };
      }, essai);
      if (!pose) { await dormir(1000); continue; }
      await hote.evaluate((c) => { const g = window.__game;
        g.player.pos.set(c.x, g.world.terrainHeight(Math.floor(c.x), Math.floor(c.z)) + 1.2, c.z); g.player.vel.set(0, 0, 0); g.player.yaw = c.cap + Math.PI; }, pose);
      const r = await alice.evaluate(async ({ id, m }) => {
        const v = window.__vehicules, g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        const rect = (x, z, cap, dl = 2.2, dw = 1.13) => { const ux = Math.sin(cap), uz = Math.cos(cap), lx = uz, lz = -ux;
          return [[x + ux * dl + lx * dw, z + uz * dl + lz * dw], [x + ux * dl - lx * dw, z + uz * dl - lz * dw], [x - ux * dl - lx * dw, z - uz * dl - lz * dw], [x - ux * dl + lx * dw, z - uz * dl + lz * dw]]; };
        const separe = (A, B) => { for (const P of [A, B]) for (let k = 0; k < 4; k++) { const a = P[k], b = P[(k + 1) % 4], nx = b[1] - a[1], nz = a[0] - b[0];
          const pa = A.map((p) => p[0] * nx + p[1] * nz), pb = B.map((p) => p[0] * nx + p[1] * nz); if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return true; } return false; };
        const rp = g.remotePlayers.get(id); if (!rp) return { absent: true };
        const t00 = performance.now();
        while (performance.now() - t00 < 8000 && Math.hypot(rp.pos.x - m.x, rp.pos.z - m.z) > 1.5) await dodo(100);
        // on suit, image par image, l'histoire de chaque voiture proche
        const hist = new Map(); const deja = new Set(); const evts = []; let images = 0, dtMax = 0, tPrec = performance.now();
        const RV = rect(m.x, m.z, m.cap);
        await new Promise((fin) => {
          const t0 = performance.now();
          const tick = () => {
            const now = performance.now(); dtMax = Math.max(dtMax, now - tPrec); tPrec = now; images++;
            const diag = v.diagCeder() || []; const parNom = new Map(diag.filter((d) => d.nom).map((d) => [d.nom, d]));
            const ami = diag.find((d) => d.ami);
            for (const c of v.etat()) { if (!c.routier) continue;
              for (const pl of c.places) { const qui = `${c.cle}#${pl[3]}`; const d = Math.hypot(pl[0] - m.x, pl[1] - m.z); if (d > 14) continue;
                const RP = rect(rp.pos.x, rp.pos.z, m.cap), RC = rect(pl[0], pl[1], pl[2]);
                const toucheVrai = d < 6 && !separe(RV, RC), toucheVu = d < 6 && !separe(RP, RC), touche = toucheVrai || toucheVu;
                const h = hist.get(qui) || []; const dg = parNom.get(qui);
                h.push({ t: Math.round(now - t0), d: +d.toFixed(1), cap: pl[2], touche, att: dg ? dg.attend : null, veut: dg ? dg.veut : null, depuis: dg ? dg.depuis : null, rep: dg ? dg.repart : null });
                if (h.length > 12) h.shift(); hist.set(qui, h);
                if (images === 1) { if (touche) deja.add(qui); continue; }
                if (touche && !deja.has(qui)) { deja.add(qui);
                  evts.push({ qui, toucheVrai, toucheVu, angle: +Math.abs(Math.sin(pl[2] - m.cap)).toFixed(2), rpEcart: +Math.hypot(rp.pos.x - m.x, rp.pos.z - m.z).toFixed(2),
                    amiVu: ami ? { x: ami.x, z: ami.z, cap: ami.cap } : null, capPose: m.cap, histoire: h.slice() }); }
              } }
            if (now - t0 < 25000) requestAnimationFrame(tick); else fin();
          };
          requestAnimationFrame(tick);
        });
        return { images, dtMax: Math.round(dtMax), evts };
      }, { id, m: pose });
      resultats.push(r);
      console.log(`essai ${essai}: images ${r.images}, pire image ${r.dtMax} ms, intrus ${r.evts ? r.evts.length : r.absent}`);
      for (const e of r.evts || []) console.log('  ', JSON.stringify(e));
    }
  } finally { await banc.fermer?.(); process.exit(0); }
})();
