const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8430, portPairs: 9430 });
  await banc.ouvrir();
  try { await souffler(); const tab = await banc.jouerSeul('AuPassage');
    const auPassage = await tab.evaluate(async () => {
      const g = window.__game;
      const { positionDe } = await import('./src/mondes.js');
      const { TROTTOIR, CHAUSSEE } = await import('./src/world.js');
      const { RUE, ARCHI, CITY_BLOCK, ROUTE_BLOCK } = await import('./src/blocks.js');
      const PEINT = new Set([CITY_BLOCK.CROSSWALK, ROUTE_BLOCK.PASSAGE_NS]);
      const w = g.world, sauve = g.player.pos.clone();
      const blk = (x, z) => { const bx = Math.floor(x), bz = Math.floor(z); return w.getBlock(bx, w.sommetColonne(bx, bz), bz); };
      const sol = (x, z) => { const b = blk(x, z); return TROTTOIR.has(b) ? 't' : (CHAUSSEE.has(b) || b === ARCHI.BORDURE) ? 'c' : 'a'; };
      const p = positionDe('kyoto');
      g.player.flying = true; g.player.vel.set(0, 0, 0);
      g.player.pos.set(p.x + 0.5, w.terrainHeight(p.x, p.z) + 8, p.z + 0.5);
      let site = null;
      const tN = performance.now();
      while (performance.now() - tN < 25000) {
        site = g.passants.sites.find((q) => q.peuple && q.peuple.filter((h) => h.name === 'passant' && h.pos).length >= 8 && Math.hypot(q.x - p.x, q.z - p.z) < 60);
        if (site) break;
        await new Promise((f) => setTimeout(f, 500));
      }
      if (!site) { g.player.pos.copy(sauve); return { err: 'Kyoto pas peuplée en 25 s' }; }
      const feux = [];
      for (let x = p.x - 40; x < p.x + 40; x++) for (let z = p.z - 40; z < p.z + 40; z++) {
        const y = w.sommetColonne(x, z);
        for (let k = 0; k <= 2; k++) if (w.getBlock(x, y + k, z) === RUE.FEUX) { feux.push([x + 0.5, z + 0.5]); break; }
      }
      const poses = [];
      for (let x = p.x - 36; x < p.x + 36 && poses.length < 8; x++) for (let z = p.z - 36; z < p.z + 36 && poses.length < 8; z++) {
        const cx = x + 0.5, cz = z + 0.5;
        if (sol(cx, cz) !== 't' || feux.some(([a, b]) => (a - cx) ** 2 + (b - cz) ** 2 <= 49)) continue;
        if (poses.some((q) => Math.hypot(q.x - cx, q.z - cz) < 6)) continue;
        for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (sol(cx + ux * 1.2, cz + uz * 1.2) !== 'c') continue;
          let n = 0, o = 0, fin = false;
          for (let s = 1; s <= 16; s++) { const q = sol(cx + ux * s, cz + uz * s); if (q === 'a') break; if (q === 'c') { n++; if (PEINT.has(blk(cx + ux * s, cz + uz * s))) o++; } else if (n >= 3) { fin = true; break; } }
          if (fin && o * 2 >= n) { poses.push({ x: cx, z: cz, ux, uz }); break; }
        }
      }
      const gens = site.peuple.filter((h) => h.name === 'passant' && h.pos).slice(0, poses.length);
      gens.forEach((h, i) => {
        const q = poses[i];
        h.traversee = null; h.ecart = null; h.repos = 0; h.vu = null; h.sonde = 0; h.sortie = null;
        h.placeAt(q.x, q.z, g.player.pos.y); h.poste.set(q.x, q.z);
        h.surTrottoir = true; h.etat = 'marche'; h.minuteur = 20; h.capYaw = Math.atan2(-q.ux, -q.uz);
      });
      // l'enfant au barycentre, pour que la troupe soit animée
      if (gens.length) {
        const cx = gens.reduce((a, h) => a + h.pos.x, 0) / gens.length, cz = gens.reduce((a, h) => a + h.pos.z, 0) / gens.length;
        g.player.pos.set(cx, w.sommetColonne(Math.floor(cx), Math.floor(cz)) + 2.5, cz);
      }
      const suivi = new Map();
      let traversees = 0, surPassage = 0; const detail = [];
      const t0 = performance.now(), f0 = g.renderer.info.render.frame;
      const jeu = () => (g.renderer.info.render.frame - f0) * 0.05;
      while ((jeu() < 15 || performance.now() - t0 < 60000) && performance.now() - t0 < 180000) {
        for (const h of gens) {
          const c = sol(h.pos.x, h.pos.z);
          let e = suivi.get(h);
          if (!e) { suivi.set(h, { prec: c === 'a' ? null : c, sortie: null, peint: 0, n: 0 }); continue; }
          if (e.prec === 't' && c === 'c') e.sortie = { x: h.pos.x, z: h.pos.z, tr: h.traversee ? h.traversee.axe : undefined, ecart: !!h.ecart };
          if (e.sortie && c === 't') {
            // la PREMIÈRE traversée de chacun : c'est la situation qu'on a posée ;
            // après, il continue sa promenade et peut traverser à un feu
            // LA PEINTURE SE LIT SUR LA LIGNE DE LA TRAVERSÉE, tous les demi-blocs de
            // la sortie à l'arrivée — pas sous le passant à chaque relevé : à cinq
            // images par seconde, deux ou trois relevés par traversée, et le
            // compte devenait un tirage (5 sur 7 au portail, 7 sur 7 seul).
            const L = Math.hypot(h.pos.x - e.sortie.x, h.pos.z - e.sortie.z);
            if (!e.fait && L > 3) {
              e.fait = true; traversees++;
              let n = 0, o = 0;
              for (let t = 0; t <= L; t += 0.5) {
                const x = e.sortie.x + (h.pos.x - e.sortie.x) * t / L, z = e.sortie.z + (h.pos.z - e.sortie.z) * t / L;
                if (sol(x, z) !== 'c') continue; n++; if (PEINT.has(blk(x, z))) o++;
              }
              if (n && o * 2 >= n) surPassage++;
              detail.push({ peint: `${o}/${n}`, L: +L.toFixed(1), tr: e.sortie.tr, ecart: e.sortie.ecart });
            }
            e.sortie = null;
          }
          if (c !== 'a') e.prec = c;
        }
        await new Promise((f) => setTimeout(f, 250));
      }
      g.player.pos.copy(sauve);
      return { poses: poses.length, feux: feux.length, traversees, surPassage, detail, secondesDeJeu: +jeu().toFixed(1), secondes: +((performance.now() - t0) / 1000).toFixed(1) };
    });
    console.log(JSON.stringify(auPassage));
  } catch (e) { console.log('ERREUR', e.message); } finally { await banc.fermer(); process.exit(0); }
})();
