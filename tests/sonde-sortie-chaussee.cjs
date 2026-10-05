// UN FLÂNEUR POSÉ SUR LA CHAUSSÉE EN SORT-IL ? (v382) — le témoin de
// `monte.js`, joué seul sur une page de Rome, pour la double mesure.
//   node tests/sonde-sortie-chaussee.cjs
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8427, portPairs: 9427 });
  await banc.ouvrir();
  try {
    await souffler();
    const tab = await banc.jouerSeul('SortieRue');
    await tab.evaluate(async () => {
      const g = window.__game;
      const { positionDe } = await import('./src/mondes.js');
      const p = positionDe('rome');
      g.player.flying = true;
      g.player.pos.set(p.x, g.world.terrainHeight(p.x, p.z) + 6, p.z);
      g.player.vel.set(0, 0, 0);
      await new Promise((f) => setTimeout(f, 16000));
    });
    const r = await tab.evaluate(async () => {
      const g = window.__game;
      const { TROTTOIR, CHAUSSEE } = await import('./src/world.js');
      const w = g.world;
      const cat = (x, z) => {
        const bx = Math.floor(x), bz = Math.floor(z);
        const b = w.getBlock(bx, w.sommetColonne(bx, bz), bz);
        return TROTTOIR.has(b) ? 't' : CHAUSSEE.has(b) ? 'c' : 'a';
      };
      const s2 = g.passants.sites.find((q) => q.peuple && q.peuple.length);
      if (!s2) return { err: 'aucune ville peuplée' };
      const gens = s2.peuple.filter((h) => h.name === 'passant' && h.pos);
      const sauve = g.player.pos.clone();
      const essais = [];
      for (const h of gens.slice(0, 3)) {
        // une colonne de chaussée au niveau de la rue, à moins de quinze blocs
        let ou = null;
        for (let r = 2; r < 16 && !ou; r++) for (let k = 0; k < 24 && !ou; k++) {
          const a = k / 24 * Math.PI * 2;
          const x = Math.floor(h.pos.x + Math.cos(a) * r) + 0.5, z = Math.floor(h.pos.z + Math.sin(a) * r) + 0.5;
          if (cat(x, z) === 'c' && Math.abs(w.sommetColonne(Math.floor(x), Math.floor(z)) + 1 - h.pos.y) < 1.2) ou = { x, z };
        }
        if (!ou) { essais.push({ err: 'pas de chaussée' }); continue; }
        h.traversee = null; h.ecart = null; h.sortie = null;
        h.surTrottoir = false; h.etat = 'pause'; h.minuteur = 6;
        h.poste.set(ou.x, ou.z); h.placeAt(ou.x, ou.z, 40);
        g.player.pos.set(ou.x + 4, h.pos.y, ou.z + 4); g.player.vel.set(0, 0, 0);
        const t0 = performance.now();
        while (performance.now() - t0 < 15000 && cat(h.pos.x, h.pos.z) === 'c') await new Promise((f) => setTimeout(f, 250));
        // et l'on regarde encore deux secondes : sortir pour y revenir ne compte pas
        await new Promise((f) => setTimeout(f, 2000));
        essais.push({ secondes: +((performance.now() - t0) / 1000).toFixed(1), arrivee: cat(h.pos.x, h.pos.z),
          poste: cat(h.poste.x, h.poste.y), d: +Math.hypot(h.pos.x - ou.x, h.pos.z - ou.z).toFixed(2), sorties: h.sorties || 0 });
      }
      g.player.pos.copy(sauve);
      return { ville: s2.nom, essais };
    });
    console.log(JSON.stringify(r));
  } catch (e) { console.log('ERREUR', e.message); } finally { await banc.fermer(); process.exit(0); }
})();
