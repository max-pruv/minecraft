// QUI ENGENDRE DES MORCEAUX SUR LE FIL PRINCIPAL À L'ARRIVÉE (v422)
//
// La v420 a nommé `ensureChunk` sur le fil principal dans la première
// demi-seconde d'une téléportation (66 à 94 ms). Cette sonde compte, pendant
// les N premières millisecondes de l'arrivée, chaque `generateChunk` appelé
// sur le fil principal et le range par APPELANT (la pile, sans `world.js`).
// Usage : node sonde-arrivee-engendre.cjs [ville] [tours] [fenêtre ms]
const { Banc, souffler } = require('./banc.js');
const ville = process.argv[2] || 'paris';
const tours = Number(process.argv[3] || 2);
const FEN = Number(process.argv[4] || 1000);
(async () => {
  const banc = new Banc({ portJeu: 8413, portPairs: 9413 });
  await banc.ouvrir();
  try {
    for (let tour = 0; tour < tours; tour++) {
      await souffler();
      const page = await banc.jouerSeul(`Engendre${tour}`, { rr: 12, params: '&vide=1&recharge=arrivee' });
      await page.evaluate(() => new Promise((fin) => setTimeout(fin, 8000)));
      const r = await page.evaluate(async ({ ville, FEN }) => {
        const g = window.__game, w = g.world;
        const { positionDe } = await import('./src/mondes.js');
        const gen = w.generateChunk.bind(w);
        const parAppelant = new Map();
        let n = 0, ms = 0, suivre = true;
        w.generateChunk = (cx, cz) => {
          const a = performance.now(); const d = gen(cx, cz); const dt = performance.now() - a;
          if (suivre) {
            n++; ms += dt;
            const pile = (new Error().stack || '').split('\n').slice(2)
              .filter((l) => !/world\.js/.test(l)).slice(0, 3)
              .map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\/src\//, '').replace(/\?[^:)]*/, ''));
            const cle = pile.join(' ← ');
            const e = parAppelant.get(cle) || { n: 0, ms: 0 };
            e.n++; e.ms += dt; parAppelant.set(cle, e);
          }
          return d;
        };
        const C = positionDe(ville), p = g.player;
        const y = w.terrainHeight(C.x, C.z) + 3;
        p.flying = true; p.pos.set(C.x + 0.5, y, C.z + 0.5); p.vel.set(0, 0, 0);
        await new Promise((fin) => setTimeout(fin, FEN));
        suivre = false;
        w.generateChunk = gen;
        const attentes = g.statsMaillage.attentesJoueur;
        return { ville, n, ms: Math.round(ms), attentesJoueur: attentes,
          appelants: [...parAppelant].sort((a, b) => b[1].ms - a[1].ms).slice(0, 12)
            .map(([k, v]) => `${v.n} × ${Math.round(v.ms)} ms  ${k}`) };
      }, { ville, FEN });
      console.log(JSON.stringify(r, null, 1));
      await page.context().close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
