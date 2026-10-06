// LE CROISEMENT DU HUIT DE PARIS (v372) — à chaque contact de deux voitures de
// la même file en travers, ce que chacune voit et vise (`diagVoiture`).
// Usage : node tests/sonde-huit.cjs [secondes]
const { Banc, souffler } = require('./banc.js');
const duree = Number(process.argv[2] || 60);
(async () => {
  const banc = new Banc({ portJeu: 8421, portPairs: 9421 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeHuit');
    const r = await page.evaluate(async (duree) => {
      const g = window.__game; const V = g.vehicules;
      const m = await import('./src/mondes.js'); const P = m.positionDe('paris'); g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      await dodo(6000);
      const rect = (x, z, ux, uz) => { const vx = uz, vz = -ux, dl = 2.2, dw = 1.13;
        return [[x + ux * dl + vx * dw, z + uz * dl + vz * dw], [x + ux * dl - vx * dw, z + uz * dl - vz * dw], [x - ux * dl - vx * dw, z - uz * dl - vz * dw], [x - ux * dl + vx * dw, z - uz * dl + vz * dw]]; };
      const separes = (P, Q) => { for (const R of [P, Q]) for (let k = 0; k < 4; k++) { const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0]; const pr = (S) => S.map((q) => q[0] * ax + q[1] * az); const p1 = pr(P), p2 = pr(Q); if (Math.max(...p1) < Math.min(...p2) || Math.max(...p2) < Math.min(...p1)) return true; } return false; };
      const out = []; const t0 = performance.now(); let releves = 0, pres = 0, paires = 0; const vus = new Set();
      while (performance.now() - t0 < duree * 1000 && out.length < 6) {
        await dodo(100); releves++;
        const etat = V.etat();
        const tout = []; 
        etat.forEach((c, ci) => (c.places || []).forEach((p) => { if (Math.hypot(p[0] + 333, p[1] - 274) < 25) tout.push({ ci, i: p[3], x: p[0], z: p[1], cap: p[2] }); }));
        for (let a = 0; a < tout.length; a++) for (let b = a + 1; b < tout.length; b++) {
          const A = tout[a], B = tout[b];
          if (A.ci !== B.ci) continue; paires++;
          if (separes(rect(A.x, A.z, Math.sin(A.cap), Math.cos(A.cap)), rect(B.x, B.z, Math.sin(B.cap), Math.cos(B.cap)))) continue;
          const k = A.ci + ':' + A.i + '/' + B.i; if (vus.has(k)) continue; vus.add(k);
          out.push({ paire: k, A: V.diagVoiture(A.ci, A.i), B: V.diagVoiture(B.ci, B.i), capA: A.cap.toFixed(2), capB: B.cap.toFixed(2) });
        }
      }
      return { releves, paires, out };
    }, duree);
    console.log(JSON.stringify(r, null, 1));
  } catch (e) { console.log('ERR', e.message); } finally { await banc.fermer(); process.exit(0); }
})();
