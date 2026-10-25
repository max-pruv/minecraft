// SONDE (feu-file-douce) : la voiture de file au feu, à l'horloge de la rue
// (v481), mesurée comme le témoin de `monte.js` — chaque paire de relevés
// d'une voiture retenue par un feu (cause 1), depuis trois b/s : la pire perte
// de vitesse, et combien de paires dépassent dix b/s². Et ce qu'on ne doit pas
// perdre : les voitures visibles (`visibles`, le compte du témoin de Moscou),
// la vitesse des voitures de la rue (médiane, 90e centile) et le TAUX de
// voitures l'une dans l'autre (rectangles de 4,4 × 2,26, paires à moins de
// sept blocs). Une page neuve par passage. VILLE=paris|moscou, PASSES=n,
// VIDE=0 garde les passants (par défaut on les écarte, comme le témoin du feu),
// PORT=k pour en lancer deux en parallèle (une charge de portail).
const { Banc } = require('./banc.js');
const VILLE = process.env.VILLE || 'paris', PASSES = Number(process.env.PASSES || 3), VIDE = process.env.VIDE !== '0';
const K = Number(process.env.PORT || 0);
(async () => {
  const banc = new Banc({ portJeu: 8475 + K, portPairs: 9475 + K }); await banc.ouvrir();
  try {
    for (let passe = 0; passe < PASSES; passe++) {
      const p = await banc.jouerSeul('FeuFile' + VILLE + passe + 'k' + K, { tactile: true });
      const r = await p.evaluate(async ({ VILLE, VIDE }) => {
        const m = await import('./src/mondes.js'); const P = m.positionDe(VILLE); const g = window.__game;
        if (VILLE === 'paris') g.player.pos.set(P.x + 30, 70, P.z - 10);
        else g.player.pos.set(P.x, g.world.terrainHeight(P.x, P.z) + 24, P.z + 30);
        g.player.vel.set(0, 0, 0); g.player.flying = true;
        const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        const rect = (x, z, cap) => { const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux; return [[x + ux * 2.2 + vx * 1.13, z + uz * 2.2 + vz * 1.13], [x + ux * 2.2 - vx * 1.13, z + uz * 2.2 - vz * 1.13], [x - ux * 2.2 - vx * 1.13, z - uz * 2.2 - vz * 1.13], [x - ux * 2.2 + vx * 1.13, z - uz * 2.2 + vz * 1.13]]; };
        const separes = (A, B) => { for (const R of [A, B]) for (let k = 0; k < 4; k++) { const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0]; const pr = (S) => S.map((q) => q[0] * ax + q[1] * az); const p1 = pr(A), p2 = pr(B); if (Math.max(...p1) < Math.min(...p2) || Math.max(...p2) < Math.min(...p1)) return true; } return false; };
        const S = new Map(), vit = [], familles = {}; let paires = 0, chev = 0, visibles = 0, nVis = 0;
        const f0 = g.renderer.info.render.frame, t0 = performance.now();
        while (performance.now() - t0 < 60000) {
          await dodo(100);
          if (VIDE) for (const site of (g.passants && g.passants.sites) || []) for (const h of site.peuple || []) {
            if (h && h.pos && Math.hypot(h.pos.x - g.player.pos.x, h.pos.z - g.player.pos.z) < 250) h.pos.set(P.x + 4000, h.pos.y, P.z + 4000);
          }
          const H = g.vehicules.horloge(), tout = []; let vis = 0;
          g.vehicules.etat().forEach((c, ci) => {
            if (c.nom !== 'voiture') return;
            vis += c.visibles || 0;
            if (!c.routier) return;
            for (const q of c.places) {
              q.ci = ci; q.cle = c.cle; q.v = c.vitesses[q[3]]; q.cause = c.causes[q[3]];
              const k = ci + ':' + q[3]; const s = S.get(k) || []; s.push([c.vitesses[q[3]], H, c.causes[q[3]]]); S.set(k, s);
              vit.push(c.vitesses[q[3]]); tout.push(q);
            }
          });
          if (performance.now() - t0 > 10000) { visibles += vis; nVis++; }
          for (let i = 0; i < tout.length; i++) for (let j = i + 1; j < tout.length; j++) {
            if (Math.hypot(tout[i][0] - tout[j][0], tout[i][1] - tout[j][1]) > 7) continue;
            paires++; if (!separes(rect(tout[i][0], tout[i][1], tout[i][2]), rect(tout[j][0], tout[j][1], tout[j][2]))) {
              chev++; const a = tout[i], b = tout[j];
              // la famille du contact : même file, même ligne (seconde voie), ou deux files ; arrêtées ou en marche
              const fam = (a.ci === b.ci ? 'file' : a.cle && b.cle && (a.cle.split('|voie2')[0] === b.cle.split('|voie2')[0]) ? 'ligne' : 'files')
                + (a.v < 0.3 && b.v < 0.3 ? '/arret' : '/marche');
              familles[fam] = (familles[fam] || 0) + 1;
            }
          }
        }
        let pasFeu = 0, plus10 = 0, pire = 0, pirePas = null;
        for (const [k, s] of S) for (let j = 1; j < s.length; j++) {
          const [v0, h0] = s[j - 1], [v1, h1, c1] = s[j];
          if (c1 !== 1 || v0 < 3 || v1 >= v0) continue;
          pasFeu++; const dec = (v0 - v1) / Math.max(1e-3, h1 - h0);
          if (dec > 10) plus10++;
          if (dec > pire) { pire = dec; pirePas = [k, v0, v1, +(h1 - h0).toFixed(3)]; }
        }
        vit.sort((a, b) => a - b); const q = (f) => (vit.length ? +vit[Math.floor(f * (vit.length - 1))].toFixed(1) : null);
        return { pasFeu, plus10, pire: +pire.toFixed(1), pirePas, visibles: nVis ? +(visibles / nVis).toFixed(1) : null,
          mediane: q(0.5), p90: q(0.9), paires, chev, familles, taux: paires ? +(100 * chev / paires).toFixed(2) : null,
          images: g.renderer.info.render.frame - f0 };
      }, { VILLE, VIDE });
      console.log(VILLE, 'passe', passe, JSON.stringify(r));
      await p.close();
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
