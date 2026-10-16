// LE BOUCHON DE L'OUEST DE PARIS (v455) — le témoin de la fumée voyait une
// file arrêtée trente secondes à (−277, 199). Sa tête est au carrefour de
// (−325, 195), où un circuit de la ville coupe l'avenue d'entrée de l'A1 —
// quatre files d'autoroute, sans feu. Cette sonde compte, pendant `secondes`,
// les voitures de chaque côté qui FRANCHISSENT le carrefour, la plus longue
// immobilité d'une tête de file, et combien de fois la patience a forcé
// (`repart`) — c'est elle qui dénouait le nœud, une voiture toutes les quatre
// secondes. Usage : node tests/sonde-bus-ouest.cjs [secondes] [PARAMS=…]
const { Banc, souffler } = require('./banc.js');
const duree = Number(process.argv[2] || 60);
const C = [-325, 195];
(async () => {
  const banc = new Banc({ portJeu: 8431, portPairs: 9431 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeBouchonOuest', process.env.PARAMS ? { params: process.env.PARAMS } : {});
    const r = await page.evaluate(async ({ duree, C, sans }) => {
      const g = window.__game; if (sans && g.vehicules.tourDeRole) g.vehicules.tourDeRole(false); const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      g.player.pos.set(C[0], 60, C[1]); g.player.vel.set(0, 0, 0); g.player.flying = true;
      await dodo(5000);
      const avant = new Map(), passees = { ville: new Set(), route: new Set() }, arret = new Map();
      let forces = 0, pire = 0, releves = 0; const t0 = performance.now();
      while (performance.now() - t0 < duree * 1000) {
        await dodo(250); releves++;
        const now = performance.now();
        for (const a of window.__vehicules.diagCeder()) {
          if (!a.nom || Math.hypot(a.x - C[0], a.z - C[1]) > 30) continue;
          const route = a.nom.includes('|558|'), ville = a.nom.includes('|472|');
          if (!route && !ville) continue;
          // de quel côté du carrefour : la ville le long de x, la route le long de z
          const cote = ville ? Math.sign(a.x - C[0]) : Math.sign(a.z - C[1]);
          const p = avant.get(a.nom);
          if (p !== undefined && p !== 0 && cote !== 0 && p !== cote) passees[ville ? 'ville' : 'route'].add(a.nom);
          avant.set(a.nom, cote);
          if (a.repart > 1.9) forces++;
          if (a.attend && Math.hypot(a.x - C[0], a.z - C[1]) < 14) {
            const d0 = arret.get(a.nom) ?? now; arret.set(a.nom, d0); pire = Math.max(pire, now - d0);
          } else arret.delete(a.nom);
        }
      }
      return { releves, villePasse: passees.ville.size, routePasse: passees.route.size, pireArretS: +(pire / 1000).toFixed(1), forcesRelevees: forces };
    }, { duree, C, sans: !!process.env.SANS });
    console.log(JSON.stringify(r));
  } finally { await banc.fermer(); process.exit(0); }
})();
