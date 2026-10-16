// SONDE (banc-lot3) : « en vol au-dessus de Paris, le monde se maille hors du
// fil principal » rendait 10 blocs en 47 s au portail, 19 en 120 s rejoué
// seul sur origin/main. Avant de toucher au témoin, on sépare les cas :
// la page rend-elle des images (cadence), l'avion avance-t-il par image
// (pas de jeu), et ce qui coûte est-il le dessin (scène vide) ou le reste ?
// Le même vol que le témoin, en relevant TOUT image par image pendant 30 s.
// BRAS=seul,voisine,vide (une page en jeu à côté ; la scène vidée).
const { Banc, dormir } = require('./banc.js');
const { occupation } = require('./charge.js');
(async () => {
  const banc = new Banc({ portJeu: 8471, portPairs: 9471 }); await banc.ouvrir();
  try {
    for (const bras of (process.env.BRAS || 'seul,voisine,seul').split(',')) {
      let voisine = null;
      if (bras === 'voisine') voisine = await banc.jouerSeul('Voisine' + Math.random().toString(36).slice(2, 5), {});
      const p = await banc.jouerSeul('MonteFil' + Math.random().toString(36).slice(2, 5), { rr: 12 });
      const r = await p.evaluate(async ({ bras, avion }) => {
        const g = window.__game;
        const m = await import('./src/montures.js');
        const { positionDe } = await import('./src/mondes.js');
        const P = positionDe('paris');
        const def = m.MONTURES.find((d) => d.key === avion);
        g.player.pos.set(P.x - 160, 96, P.z); g.player.vel.set(0, 0, 0);
        g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
        g.player.flying = true; g.player.pilote = def.pilote;
        g.player.vitesseAvion = def.pilote.max; g.player.avionEnVol = true; g.player.avionEtat = 'vol';
        g.player.altitudeDecollage = -999;
        if (bras === 'vide') g.scene.visible = false;
        const rr = () => g.renderer.info.render.frame;
        const f0 = rr(), t0 = performance.now(), x0 = g.player.pos.x;
        const rel = [];
        let pire = 0, tp = performance.now();
        await new Promise((fin) => {
          const tic = () => {
            const now = performance.now();
            pire = Math.max(pire, now - tp); tp = now;
            if (now - t0 > 30000) return fin();
            requestAnimationFrame(tic);
          };
          requestAnimationFrame(tic);
          const iv = setInterval(() => {
            rel.push([Math.round((performance.now() - t0) / 1000), Math.round(g.player.pos.x - x0), rr() - f0]);
            if (performance.now() - t0 > 30000) clearInterval(iv);
          }, 5000);
        });
        g.scene.visible = true;
        return { avion, ips: +((rr() - f0) / 30).toFixed(2), parcouru: Math.round(g.player.pos.x - x0),
          y: Math.round(g.player.pos.y), pireMs: Math.round(pire),
          appels: g.renderer.info.render.calls, morceaux: g.chunkMeshes.size,
          distants: g.statsMaillage && g.statsMaillage.distants, rel };
      }, { bras, avion: process.env.AVION || 'avionligne' });
      const o = []; for (let i = 0; i < 2; i++) o.push(await occupation(500));
      console.log(`${bras.padEnd(8)} : ${JSON.stringify(r)} · cœurs ${o.map((x) => x.toFixed(2)).join(' ')}`);
      await p.close(); if (voisine) await voisine.close();
      await dormir(2000);
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
