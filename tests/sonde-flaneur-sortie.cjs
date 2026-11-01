// Sonde (claude/temoins-intermittents) : « un flâneur posé au milieu de la
// chaussée en sort » rendait un essai sur trois `arrivee c, poste c, sorties 7`.
// Sept sorties en dix-sept secondes : il vise un bord, ne l'atteint pas en six
// secondes, et prend son poste LÀ OÙ IL EST (sur la chaussée). On sépare les
// cas : bord visé, distance au bord, avance par seconde, ce que le crochet
// d'obstacle (`obstaclePieton`) répond devant lui, et la cote du bord.
//     node tests/sonde-flaneur-sortie.cjs [ville] [essais] [ms brûlées par image] [mur]
const { Banc, dormir } = require('./banc.js');
(async () => {
  const ville = process.argv[2] || 'rome', n = Number(process.argv[3] || 9), brule = Number(process.argv[4] || 0), mur = process.argv[5] === 'mur';
  const banc = new Banc({ portJeu: 8474, portPairs: 9474 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Flaneur', { rr: 2, pret: true });
    const r = await tab.evaluate(async ({ ville, n, brule, mur }) => {
      const g = window.__game, w = g.world, dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      const { TROTTOIR, CHAUSSEE } = await import('./src/world.js');
      const { positionDe } = await import('./src/mondes.js');
      const P = positionDe(ville);
      g.player.flying = true; g.player.pos.set(P.x + 0.5, w.terrainHeight(P.x, P.z) + 8, P.z + 0.5);
      let s2 = null; const tN = performance.now();
      while (!s2 && performance.now() - tN < 40000) { await dodo(500); s2 = g.passants.sites.find((q) => q.peuple && q.peuple.filter((h) => h.name === 'passant').length >= 3 && Math.hypot(q.x - P.x, q.z - P.z) < 80); }
      if (!s2) return { err: 'pas peuplée' };
      const cat = (x, z) => { const bx = Math.floor(x), bz = Math.floor(z); const b = w.getBlock(bx, w.sommetColonne(bx, bz), bz); return TROTTOIR.has(b) ? 't' : CHAUSSEE.has(b) ? 'c' : 'a'; };
      const out = [];
      if (brule) { const b = () => { const t = performance.now(); while (performance.now() - t < brule); requestAnimationFrame(b); }; requestAnimationFrame(b); }
      const gens = s2.peuple.filter((h) => h.name === 'passant' && h.pos);
      for (let e = 0; e < n; e++) {
        const h = gens[e % gens.length];
        let ou = null;
        for (let r = 2 + (e % 5); r < 16 && !ou; r++) for (let k = 0; k < 24 && !ou; k++) {
          const a = (k + e * 7) / 24 * Math.PI * 2;
          const x = Math.floor(h.pos.x + Math.cos(a) * r) + 0.5, z = Math.floor(h.pos.z + Math.sin(a) * r) + 0.5;
          if (cat(x, z) === 'c' && Math.abs(w.sommetColonne(Math.floor(x), Math.floor(z)) + 1 - h.pos.y) < 1.2) ou = { x, z };
        }
        if (!ou) { out.push({ err: 'pas de chaussée' }); continue; }
        h.traversee = null; h.ecart = null; h.sortie = null; h.sorties = 0;
        h.surTrottoir = false; h.etat = 'pause'; h.minuteur = 6;
        h.poste.set(ou.x, ou.z); h.placeAt(ou.x, ou.z, 40);
        const crochet = w.obstaclePieton;
        if (mur) w.obstaclePieton = (x, z) => Math.hypot(x - ou.x, z - ou.z) > 0.4;
        g.player.pos.set(ou.x + 4, h.pos.y, ou.z + 4); g.player.vel.set(0, 0, 0);
        const cibles = [], obst = []; let pr = null; const t0 = performance.now();
        while (performance.now() - t0 < 17000 && !(mur && (h.sorties >= 2 || (h.sorties >= 1 && !h.sortie)))) {
          await dodo(250);
          if (h.sortie && (!pr || pr.x !== h.sortie.x || pr.z !== h.sortie.z)) { pr = { x: h.sortie.x, z: h.sortie.z }; cibles.push({ ...pr, d: +Math.hypot(pr.x - h.pos.x, pr.z - h.pos.z).toFixed(1), y: w.sommetColonne(Math.floor(pr.x), Math.floor(pr.z)) + 1 - +h.pos.y.toFixed(1), cat: cat(pr.x, pr.z) }); }
          if (h.sortie) { const dx = h.sortie.x - h.pos.x, dz = h.sortie.z - h.pos.z, L = Math.hypot(dx, dz) || 1;
            const ox = h.pos.x + dx / L * 0.6, oz = h.pos.z + dz / L * 0.6;
            const o = w.obstaclePieton ? w.obstaclePieton(ox, oz, h.pos.y) : null;
            const ap = w.vehiculeApproche ? w.vehiculeApproche(h.pos.x, h.pos.z, h.pos.y) : null;
            obst.push((o ? 'O' : '') + (ap ? 'V' : '') + (h.ecart ? 'E' : '') || '.'); }
        }
        w.obstaclePieton = crochet;
        out.push({ arrivee: cat(h.pos.x, h.pos.z), poste: cat(h.poste.x, h.poste.y), sorties: h.sorties, cibles: cibles.slice(0, 4), obst: obst.join('').slice(0, 70), d: +Math.hypot(h.pos.x - ou.x, h.pos.z - ou.z).toFixed(1) });
      }
      return { ville: s2.nom, out };
    }, { ville, n, brule, mur });
    for (const o of r.out || [r]) console.log(JSON.stringify(o));
  } finally { await banc.fermer(); process.exit(0); }
})();
