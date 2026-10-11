// SONDE (banc-intermittents) : une page EN JEU à côté coûte-t-elle moins si
// l'on réduit sa fenêtre ? Le gel CDP ne change rien (sonde-voisines.cjs) ;
// le coût d'une page en rendu logiciel est surtout du REMPLISSAGE. On mesure
// l'occupation des cœurs et, surtout, la grandeur qu'un témoin attend : la
// durée de la chauffe de New York d'une page neuve (`__chauffeNY`).
const { Banc, dormir } = require('./banc.js');
const { occupation } = require('./charge.js');
(async () => {
  const banc = new Banc({ portJeu: 8469, portPairs: 9469 }); await banc.ouvrir();
  try {
    const voisine = await banc.jouerSeul('Voisine', { tactile: true });
    for (const bras of (process.env.BRAS || 'normale,reduite,normale,reduite').split(',')) {
      await voisine.setViewportSize(bras === 'reduite' ? { width: 16, height: 16 } : { width: 420, height: 760 });
      await dormir(3000);
      const o = []; for (let i = 0; i < 3; i++) o.push(await occupation(1000));
      const p = await banc.joueur('Arrivee' + Math.random().toString(36).slice(2, 5), { rr: 6 });
      const c = await p.evaluate(async () => {
        const t0 = performance.now();
        while (performance.now() - t0 < 150000) {
          const c = window.__chauffeNY && window.__chauffeNY();
          if (!c || c.finie) return { ...(c || { absente: true }), ms: Math.round(performance.now() - t0) };
          await new Promise((f) => setTimeout(f, 250));
        }
        return { expire: true, ...window.__chauffeNY() };
      });
      console.log(`voisine ${bras.padEnd(8)} : cœurs ${o.map((x) => x.toFixed(2)).join(' · ')} → chauffe ${JSON.stringify(c)}`);
      await p.close();
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
