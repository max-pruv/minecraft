// LA PORTÉE DU PALIER « LOIN » (v497) : mesures et captures, au palier haut
// avec et sans couronne lointaine, et au palier moyen. Usage :
//   node tests/sonde-horizon-loin.cjs <dossier>
// Pour chaque bras : la portée visible (le sommet dessiné le plus lointain dans
// l'axe du regard), les octets que tient le paysage lointain, le coût par
// image du remplissage et de la découpe, la cadence, et deux captures (vue
// aérienne au-dessus des Alpes, vue au sol au pied du relief).
// Le bras « sans » est `?loin=0` : sur la branche, le même chemin de code que
// la v496 (RAYON_LOIN vaut 0, donc ni couronne, ni brouillard, ni plan lointain
// changés).
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';

const BRAS = [
  { nom: 'loin-sans', rr: 16, params: '&palier=haut&loin=0&batiloin=1' },
  { nom: 'loin-avec', rr: 16, params: '&palier=haut&batiloin=1' },
  { nom: 'moyen', rr: 12, params: '&palier=moyen&batiloin=1' },
];

const octets = (h) => {
  if (!h) return 0;
  let n = 0;
  for (const a of Object.values(h.geo.attributes)) n += a.array.byteLength;
  n += h.geo.index.array.byteLength;
  for (const k of ['hauteurs', 'pret', 'bati', 'toits', 'estNY', 'climats']) n += h[k].byteLength;
  n += h.bat.instanceMatrix.array.byteLength + (h.bat.instanceColor ? h.bat.instanceColor.array.byteLength : 0);
  return n;
};

(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    for (const b of BRAS) {
      await souffler();
      const page = await banc.jouerSeul('Horizon' + b.nom.replace(/-/g, ''), { rr: b.rr, viewport: { width: 1280, height: 720 }, dpr: 1, params: b.params });
      for (const vue of ['ciel', 'sol']) {
        try {
          const info = await page.evaluate(async ({ vue, octetsSrc }) => {
            const octets = eval(octetsSrc);
            const g = window.__game;
            const VM = await import('./src/villesmonde.js');
            const f = VM.VILLES_MONDE.find((v) => /zurich/i.test(v.cle)) || VM.VILLES_MONDE[0];
            // au sud-est de Zurich, cap au sud vers les Alpes
            let x = f.ancre.x + 150, z = f.ancre.z + 250;
            // au sol : le sommet le plus haut à 250 blocs à la ronde, l'œil au-dessus des arbres
            if (vue === 'sol') {
              let best = -1;
              for (let dx = -250; dx <= 250; dx += 10) for (let dz = -250; dz <= 250; dz += 10) {
                const h = g.world.terrainHeight(x + dx, z + dz);
                if (h > best) { best = h; var bx = x + dx, bz = z + dz; }
              }
              x = bx; z = bz;
            }
            g.player.flying = true;
            const sol = g.world.terrainHeight(x, z);
            g.player.pos.set(x + 0.5, vue === 'ciel' ? Math.max(sol + 140, 160) : sol + 9, z + 0.5);
            g.player.vel.set(0, 0, 0);
            g.player.yaw = Math.PI; g.player.pitch = vue === 'ciel' ? -0.22 : 0.02;   // cap au sud
            window.__setDayTime(0.42);
            const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
            const t0 = performance.now(); let n0 = -1;
            while (performance.now() - t0 < 60000) {
              await dodo(1500);
              const n = g.chunkMeshes.size;
              const fin = g.horizon.etat().manquantes === 0 && (!g.horizonLoin || g.horizonLoin.etat().manquantes === 0);
              if (n === n0 && fin) break; n0 = n;
            }
            await dodo(800);
            // la portée visible, dans l'axe du regard (cap au sud, +z)
            const portee = (h) => {
              if (!h) return 0;
              const idx = h.geo.index.array, pos = h.geo.attributes.position.array, n = h.geo.drawRange.count;
              let m = 0;
              for (let k = 0; k < n; k++) {
                const i = idx[k];
                const dz = pos[i * 3 + 2] - g.player.pos.z, dx = pos[i * 3] - g.player.pos.x;
                if (Math.abs(dx) < dz * 0.6) m = Math.max(m, dz);
              }
              return Math.round(m);
            };
            // le coût par image : la découpe telle que le jeu l'appelle, vingt fois
            const decoupe = (h) => {
              if (!h) return 0;
              const t = performance.now();
              for (let k = 0; k < 20; k++) h.majDecoupe((cx, cz) => g.chunkMeshes.has(`${cx},${cz}`), g.player.pos.x, g.player.pos.z, 0, 1);
              return +((performance.now() - t) / 20).toFixed(2);
            };
            // le remplissage complet d'une grille neuve (ce que coûte une arrivée)
            const remplir = async (h, opts) => {
              if (!h) return 0;
              const { Horizon } = await import('./src/horizon.js');
              const neuf = new Horizon(g.world, h.rayon, opts ? { ...opts, interieur: g.horizon } : undefined);
              const t = performance.now();
              while (neuf.maj(g.player.pos.x, g.player.pos.z, 1e9) > 0 && neuf.etat().manquantes > 0) { /* tout */ }
              const ms = performance.now() - t;
              neuf.geo.dispose(); neuf.bat.dispose();
              return Math.round(ms);
            };
            const l = g.horizonLoin;
            const f0 = g.renderer.info.render.frame, tc = performance.now();
            await dodo(4000);
            const ips = (g.renderer.info.render.frame - f0) / ((performance.now() - tc) / 1000);
            return {
              reglage: g.reglageApplique,
              porteeFine: portee(g.horizon), porteeLoin: portee(l),
              octetsFine: octets(g.horizon), octetsLoin: octets(l),
              decoupeFine: decoupe(g.horizon), decoupeLoin: decoupe(l),
              remplirFine: await remplir(g.horizon), remplirLoin: await remplir(l, l ? { pas: l.pas, abaisse: l.abaisse, bords: false } : null),
              trianglesFine: g.horizon.etat().triangles, trianglesLoin: l ? l.etat().triangles : 0,
              batiFine: g.horizon.bat.count, batiLoin: l ? l.bat.count : 0,
              appels: g.renderer.info.render.calls, ips: +ips.toFixed(1), morceaux: g.chunkMeshes.size,
            };
          }, { vue, octetsSrc: '(' + octets.toString() + ')' });
          const fi = path.join(dossier, `${b.nom}-${vue}.png`);
          await page.screenshot({ path: fi, timeout: 180000 });
          console.log(b.nom, vue, JSON.stringify(info), '→', fi);
        } catch (e) { console.log(b.nom, vue, 'ÉCHEC :', String(e && e.message || e).split('\n')[0]); }
      }
      await page.close();
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
