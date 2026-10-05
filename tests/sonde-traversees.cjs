// LES PASSANTS CHANGENT-ILS DE TROTTOIR, ET OÙ ? (point 2 de la zone piétons)
//
// Pour chaque ville, l'enfant se pose (en vol, immobile) au centre ; on relève
// tous les quarts de seconde le SOL sous chaque passant animé, et l'on découpe
// sa trace en événements :
//   - une SORTIE : trottoir → chaussée ;
//   - une TRAVERSÉE : sortie suivie d'un retour au trottoir à plus de trois
//     blocs du point de sortie (il a changé de trottoir) ;
//   - un RETOUR : revenu au trottoir à moins de trois blocs (un écart, un pas
//     de travers) ;
//   - en cours : encore sur la chaussée à la fin.
// Et pour chaque sortie : un feu à moins de cinq blocs ? un passage marqué
// sous les pieds ? un écart (v351) en cours ?
//   node tests/sonde-traversees.cjs [secondes] [villes…]
const { Banc, souffler } = require('./banc.js');
const duree = +process.argv[2] || 60;
const villes = process.argv.slice(3).length ? process.argv.slice(3) : ['rome', 'paris', 'londres'];
(async () => {
  const banc = new Banc({ portJeu: 8417, portPairs: 9417 });
  await banc.ouvrir();
  try {
    for (const ville of villes) {
      await souffler();
      const tab = await banc.jouerSeul('Traverse' + ville, { rr: 4 });
      const r = await tab.evaluate(async ({ ville, duree }) => {
        const g = window.__game;
        const { positionDe } = await import('./src/mondes.js');
        const { TROTTOIR, CHAUSSEE } = await import('./src/world.js');
        const { RUE, CITY_BLOCK } = await import('./src/blocks.js');
        const { etatFeu, axeDuCap } = await import('./src/feux.js');
        const heure = () => (g.world.heureRue ? g.world.heureRue() : window.__vehicules.horloge() * 1000);
        const p = positionDe(ville);
        g.player.flying = true;
        g.player.pos.set(p.x + 0.5, g.world.terrainHeight(p.x, p.z) + 8, p.z + 0.5);
        g.player.vel.set(0, 0, 0);
        const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
        // on laisse naître la ville
        const t00 = performance.now();
        while (performance.now() - t00 < 12000) {
          const s = g.passants.sites.find((q) => q.peuple && q.peuple.length >= 10 && Math.hypot(q.x - p.x, q.z - p.z) < 50);
          if (s) break;
          await dormir(300);
        }
        await dormir(4000);
        const sol = (x, z) => {
          const bx = Math.floor(x), bz = Math.floor(z);
          const y = g.world.sommetColonne(bx, bz);
          const b = g.world.getBlock(bx, y, bz);
          return { cat: TROTTOIR.has(b) ? 't' : CHAUSSEE.has(b) ? 'c' : 'a', passage: b === CITY_BLOCK.CROSSWALK, y };
        };
        const feuPres = (x, z) => {
          for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
            const bx = Math.floor(x) + dx, bz = Math.floor(z) + dz;
            const y = g.world.sommetColonne(bx, bz);
            for (let k = 0; k <= 2; k++) if (g.world.getBlock(bx, y + k, bz) === RUE.FEUX) return true;
          }
          return false;
        };
        const diag = { appels: 0, trouves: 0, feux: 0, ms: 0, msMax: 0 };
        const orig = g.world.passagePieton;
        if (orig) g.world.passagePieton = (x, z, c) => { diag.appels++; const t1 = performance.now(); const r = orig(x, z, c); const dt1 = performance.now() - t1; diag.ms += dt1; diag.msMax = Math.max(diag.msMax, dt1); if (r) diag.trouves++; return r; };
        const suivi = new Map();
        const ev = { sorties: 0, traversees: 0, retours: 0, enCours: 0, sortiesFeu: 0, traverseesFeu: 0, traverseesPassage: 0, sortiesEcart: 0, traverseesAuRouge: 0, releves: 0, surChaussee: 0, voitures: 0 };
        const exemples = [];
        const t0 = performance.now();
        while (performance.now() - t0 < duree * 1000) {
          const gens = g.passants.sites.flatMap((s) => s.peuple || []).filter((h) => h.name === 'passant'
            && Math.hypot(h.pos.x - g.player.pos.x, h.pos.z - g.player.pos.z) < 80);
          for (const h of gens) {
            const s = sol(h.pos.x, h.pos.z);
            ev.releves++;
            if (s.cat === 'c') ev.surChaussee++;
            let e = suivi.get(h);
            if (!e) { e = { prec: s.cat, sortie: null }; suivi.set(h, e); continue; }
            if (e.prec === 't' && s.cat === 'c') {
              ev.sorties++;
              const feu = feuPres(h.pos.x, h.pos.z);
              if (feu) ev.sortiesFeu++;
              if (h.ecart) ev.sortiesEcart++;
              e.sortie = { etat: h.etat, x: h.pos.x, z: h.pos.z, feu, passage: s.passage, ecart: !!h.ecart, t: performance.now(), heure: heure() };
            } else if (e.sortie && s.cat === 't') {
              const d = Math.hypot(h.pos.x - e.sortie.x, h.pos.z - e.sortie.z);
              if (d > 3) {
                ev.traversees++;
                if (e.sortie.feu) ev.traverseesFeu++;
                const axe = 1 - axeDuCap(h.pos.x - e.sortie.x, h.pos.z - e.sortie.z);
                const feuCoupe = etatFeu(axe, e.sortie.heure);
                if (e.sortie.feu && feuCoupe === 'rouge') ev.traverseesAuRouge++;
                if (e.sortie.passage) ev.traverseesPassage++;
                if (exemples.length < 6) exemples.push({ d: +d.toFixed(1), feu: e.sortie.feu, feuCoupe, ecart: e.sortie.ecart, s: +((performance.now() - e.sortie.t) / 1000).toFixed(1) });
              } else { ev.retours++; ev.retoursEtats = (ev.retoursEtats || '') + e.sortie.etat + '/' + h.etat + ' '; }
              e.sortie = null;
            }
            e.prec = s.cat === 'a' ? e.prec : s.cat;
          }
          await dormir(250);
        }
        for (const e of suivi.values()) if (e.sortie) ev.enCours++;
        // qui est sur la chaussée à la fin, et dans quel état
        ev.surChausseeFin = [...suivi.keys()].filter((h) => sol(h.pos.x, h.pos.z).cat === 'c').map((h) => ({ etat: h.etat, tr: !!h.traversee, trottoir: h.surTrottoir, ecart: !!h.ecart, d: +Math.hypot(h.pos.x - g.player.pos.x, h.pos.z - g.player.pos.z).toFixed(0) }));
        const etat = window.__vehicules.etat() || [];
        ev.voitures = etat.filter((c) => c.nom === 'voiture').reduce((n, c) => n + c.visibles, 0);
        const decidees = [...suivi.keys()].reduce((n, h) => n + (h.traversees || 0), 0);
        diag.feux = (window.__feux ? window.__feux().length : -1);
        return { ville, passants: suivi.size, decidees, diag, ...ev, partChaussee: +(ev.surChaussee / Math.max(1, ev.releves)).toFixed(3), exemples };
      }, { ville, duree });
      console.log(JSON.stringify(r));
      await tab.close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
