// LA CIRCULATION À L'ALLURE D'UNE VILLE (v372) — ce que voit un enfant au-dessus
// d'une rue : la vitesse PROPRE de chaque voiture visible, la façon dont elle
// s'arrête au feu (une suite de relevés qui descend, ou un saut de v à zéro),
// et les voitures l'une dans l'autre (rectangles vrais, par séparation d'axes,
// rapportés aux paires examinées — un compte absolu est un tirage, v277).
// Usage : node tests/sonde-circulation.cjs [paris|rome] [secondes]
const { Banc, souffler } = require('./banc.js');
const ville = process.argv[2] || 'paris', duree = Number(process.argv[3] || 40);
(async () => {
  const banc = new Banc({ portJeu: 8419, portPairs: 9419 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeRue' + ville);
    const r = await page.evaluate(async ({ ville, duree }) => {
      const m = await import('./src/mondes.js'); const P = m.positionDe(ville); const g = window.__game;
      g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      await dodo(6000);
      const rect = (x, z, cap, dl = 2.2) => { const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux;
        return [[x + ux * dl + vx * 1.13, z + uz * dl + vz * 1.13], [x + ux * dl - vx * 1.13, z + uz * dl - vz * 1.13], [x - ux * dl - vx * 1.13, z - uz * dl - vz * 1.13], [x - ux * dl + vx * 1.13, z - uz * dl + vz * 1.13]]; };
      const separes = (P, Q) => { for (const R of [P, Q]) for (let k = 0; k < 4; k++) { const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0]; const pr = (S) => S.map((q) => q[0] * ax + q[1] * az); const p1 = pr(P), p2 = pr(Q); if (Math.max(...p1) < Math.min(...p2) || Math.max(...p2) < Math.min(...p1)) return true; } return false; };
      const types = {}; const echant = []; const vit = []; const suites = new Map(); let paires = 0, chev = 0, releves = 0, attentes = 0;
      const f0 = g.renderer.info.render.frame, t0 = performance.now();
      const voies = {}; const croisieres = {};
      while (performance.now() - t0 < duree * 1000) {
        await dodo(100); releves++;
        const tout = [];
        g.vehicules.etat().forEach((c, ci) => {
          if (!c.routier) return;
          voies[c.voie] = (voies[c.voie] || 0) + 1; if (c.croisiere) croisieres[c.voie] = c.croisiere;
          for (const p of c.places) {
            const v = c.vitesses ? c.vitesses[p[3]] : (p[5] ? 0 : c.vitesse); vit.push(v); if (p[5]) attentes++;
            const k = ci + ':' + p[3]; const s = suites.get(k) || []; s.push(v); suites.set(k, s);
            tout.push({ x: p[0], z: p[1], cap: p[2], dl: c.nom === 'bus' ? 3.2 : 2.2, ci, i: p[3], v });
          }
        });
        for (let i = 0; i < tout.length; i++) for (let j = i + 1; j < tout.length; j++) {
          if (Math.hypot(tout[i].x - tout[j].x, tout[i].z - tout[j].z) > 7) continue;
          paires++; if (!separes(rect(tout[i].x, tout[i].z, tout[i].cap, tout[i].dl), rect(tout[j].x, tout[j].z, tout[j].cap, tout[j].dl))) { chev++; const meme = tout[i].ci === tout[j].ci; const arr = tout[i].v < 0.3 && tout[j].v < 0.3; const k = (meme ? 'file' : 'autre') + (arr ? '-arrêt' : '-roule') + (Math.abs(Math.cos(tout[i].cap - tout[j].cap)) > 0.7 ? (Math.cos(tout[i].cap - tout[j].cap) > 0 ? '-meme' : '-face') : '-travers'); types[k] = (types[k] || 0) + 1; if (meme && echant.length < 12) echant.push([tout[i].ci, tout[i].i, tout[j].i, +Math.hypot(tout[i].x - tout[j].x, tout[i].z - tout[j].z).toFixed(1), +tout[i].x.toFixed(0), +tout[i].z.toFixed(0), +tout[i].v.toFixed(1), +tout[j].v.toFixed(1)]); }
        }
      }
      // les arrêts : une suite qui passe de > 5 à < 0,3 ; combien de relevés entre les deux
      let arrets = 0, progressifs = 0, secs = 0; const pas = [];
      for (const s of suites.values()) {
        for (let k = 0; k < s.length; k++) {
          if (s[k] >= 0.3) continue;
          let j = k - 1; while (j >= 0 && s[j] < 5 && s[j] >= 0.3) j--;
          if (j >= 0 && s[j] >= 5 && k - j >= 2) { arrets++; const n = k - j - 1; pas.push(n); if (n >= 3) progressifs++; else secs++; }
          while (k < s.length && s[k] < 0.3) k++;
        }
      }
      vit.sort((a, b) => a - b);
      const q = (f) => vit.length ? +vit[Math.floor(f * (vit.length - 1))].toFixed(1) : null;
      return { releves, images: g.renderer.info.render.frame - f0, voitures: vit.length, voies, croisieres,
        v: { mediane: q(0.5), p90: q(0.9), max: q(1) }, arrets, progressifs, secs, pas: pas.slice(0, 20),
        attentes, paires, chev, types, echant, taux: paires ? +(chev / paires * 100).toFixed(2) : null };
    }, { ville, duree });
    console.log(JSON.stringify(r));
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
