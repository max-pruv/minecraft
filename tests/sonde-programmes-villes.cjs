// QUELS PROGRAMMES SE COMPILENT EN ARRIVANT DANS UNE VILLE ? (v319)
//
// La sonde de Paris (`sonde-programmes-paris.cjs`) étendue à un échantillon de
// villes — Max : « lance sur toutes les villes, pas juste celle-là ». Chaque
// programme compilé à l'arrivée est une image figée sur la tablette.
//
// Pour chaque lieu : page NEUVE (`FRAICHE=1`, défaut) ou page partagée
// (`FRAICHE=0`, plus rapide, chaque lieu ne compte que ce que les précédents
// n'ont pas déjà compilé). On attend que le compte de programmes se stabilise
// (la chauffe de l'accueil comprise), on se téléporte, on laisse vingt
// secondes, puis l'on NOMME les programmes neufs ET les matériaux qui les
// portent — non pas le programme COURANT d'un matériau (le seul que la sonde de
// Paris lisait, et qui ne voyait rien), mais TOUS ses programmes
// (`renderer.properties.get(m).programs`) : un même matériau a une variante
// par cible de rendu (l'écran, la cible cubique des reflets) et par lumières.
//
//   node sonde-programmes-villes.cjs            → tous les lieux, pages neuves
//   LIEUX=paris,rome node sonde-programmes-villes.cjs
const { Banc, souffler } = require('./banc.js');

const LIEUX = [
  { cle: 'paris', dx: 20, dz: -30 },      // couche HD (forcée hors rendu logiciel ? non : voir HD)
  { cle: 'londres' }, { cle: 'washington' }, { cle: 'sf' }, { cle: 'ny' },
  { cle: 'nice' }, { cle: 'lille' },
  { cle: 'marrakech' },  // médina
  { cle: 'mendoza' },    // damier
  { cle: 'kyoto' },      // organique
  { cle: 'shanghai' },   // superîlot
  { cle: 'barcelone' },  // eixample
  { cle: 'rome' },       // périmètre
  { cle: 'zurich' },     // faubourg
  { cle: 'aero:fra', x: 1734, z: -1040 },   // un aérodrome (Francfort, hub)
  { cle: 'gare:lyon', x: 685 - 0.536 * 12, z: 1964 - 0.844 * 12 }, // la gare de Lyon (TGV)
];

(async () => {
  const filtre = process.env.LIEUX ? new Set(process.env.LIEUX.split(',')) : null;
  const lieux = LIEUX.filter((l) => !filtre || filtre.has(l.cle));
  const fraiche = process.env.FRAICHE !== '0';
  const hd = process.env.HD || '';
  const banc = new Banc({ portJeu: 8406, portPairs: 9406 });
  await banc.ouvrir();
  const rapport = [];
  let tab = null, n = 0;
  try {
    for (const l of lieux) {
      if (!tab || fraiche) {
        if (tab) await tab.close();
        await souffler();
        const opts = { rr: 6, ...(hd ? { params: '&hd=' + hd } : {}), ...(process.env.OMBRES ? { ombres: 1 } : {}) };
        // L'enfant qui lit l'accueil jusqu'au bout : on attend que la chauffe
        // de fond (New York, v319) ait fini avant d'appuyer sur « Jouer ».
        // `PRESSE=1` appuie tout de suite, comme l'enfant pressé.
        if (process.env.PRESSE) tab = await banc.jouerSeul('SondeV' + (n++), opts);
        else {
          tab = await banc.joueur('SondeV' + (n++), opts);
          const att = await tab.evaluate(async () => {
            const t0 = performance.now();
            while (performance.now() - t0 < 60000) {
              const c = window.__chauffeNY && window.__chauffeNY();
              if (!c || c.finie) return { ...c, ms: Math.round(performance.now() - t0) };
              await new Promise((f) => setTimeout(f, 250));
            }
            return { expire: true, ...window.__chauffeNY() };
          });
          console.log('chauffe NY', JSON.stringify(att));
          await tab.evaluate(() => { window.__game.edu.today().libreJusqua = 86400; document.getElementById('play-btn').click(); });
          await tab.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
        }
      }
      const out = await tab.evaluate(async (l) => {
        const g = window.__game, r = g.renderer, info = r.info;
        const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        let k = info.programs.length, stable = 0;
        const t0 = performance.now();
        while (stable < 3 && performance.now() - t0 < 40000) {
          await dodo(1000);
          if (info.programs.length === k) stable++; else { stable = 0; k = info.programs.length; }
        }
        const avant = new Set(info.programs.map((p) => p.cacheKey));
        let x = l.x, z = l.z;
        if (x === undefined) {
          const { positionDe } = await import('./src/mondes.js');
          const P = positionDe(l.cle);
          x = P.x + (l.dx || 0); z = P.z + (l.dz || 0);
        }
        const f0 = info.render.frame;
        window.__carte.surTeleport(x, z);
        await dodo(20000);
        const neufs = info.programs.filter((p) => !avant.has(p.cacheKey));
        const cles = new Set(neufs.map((p) => p.cacheKey));
        // la fin de la clé : espace de couleur, correspondance tonale…
        const queue = (c) => c.split(',').slice(-4).join(',');
        const qui = {};
        const vus = new Set();
        g.scene.traverse((o) => {
          if (!o.material) return;
          for (const m of [].concat(o.material)) {
            if (vus.has(m)) continue;
            vus.add(m);
            const progs = r.properties.get(m).programs;
            if (!progs) continue;
            for (const [cle] of progs) {
              if (!cles.has(cle)) continue;
              let p = o, nom = '';
              for (let i = 0; i < 4 && p; i++, p = p.parent) nom += (p.name || p.type) + '<';
              const e = m.type + (m.name ? '「' + m.name + '」' : '') + ' ' + nom + ' ⟶ ' + queue(cle);
              qui[e] = (qui[e] || 0) + 1;
            }
          }
        });
        // QUELLE CASE DE LA CLÉ A CHANGÉ ? Pour chaque clé neuve, la clé d'avant
        // la plus semblable (même longueur, le plus de cases égales), et les
        // cases qui diffèrent : c'est ce qui nomme la variante.
        const anciennes = [...avant].map((c) => c.split(','));
        const ecarts = neufs.map((p) => {
          const c = p.cacheKey.split(',');
          let best = null, bestEg = -1;
          for (const a of anciennes) {
            if (a.length !== c.length) continue;
            let eg = 0;
            for (let i = 0; i < c.length; i++) if (a[i] === c[i]) eg++;
            if (eg > bestEg) { bestEg = eg; best = a; }
          }
          if (!best) return { tete: c.slice(0, 3).join(','), longueur: c.length, sansVoisine: true };
          const d = [];
          for (let i = 0; i < c.length; i++) if (best[i] !== c[i]) d.push(i + ':' + String(best[i]).slice(0, 40) + '→' + String(c[i]).slice(0, 40));
          return { tete: c.slice(0, 3).join(',').slice(0, 60), ecart: d };
        });
        return {
          ecarts,
          neufs: neufs.length, images: info.render.frame - f0,
          arrive: Math.hypot(g.player.pos.x - x, g.player.pos.z - z) < 60,
          programmes: neufs.map((p) => p.name + ' ⟶ ' + queue(p.cacheKey)),
          qui,
        };
      }, l);
      rapport.push({ lieu: l.cle, ...out });
      console.log(JSON.stringify({ lieu: l.cle, ...out }, null, 1));
    }
    console.log('RÉSUMÉ ' + rapport.map((r) => r.lieu + ':' + r.neufs + (r.arrive ? '' : '(pas arrivé)')).join(' '));
  } catch (e) { console.log("ÉCHEC DE LA SONDE", e && e.stack || e); } finally { if (tab) await tab.close().catch(() => {}); await banc.fermer(); process.exit(0); }
})();
