// SONDE (v518) : ce que coûte la troisième grille du palier « Loin ». Même
// page, palier haut, rr 12, en vol à cent blocs au-dessus de la campagne ;
// ordre alterné (v268) entre `?loin=2560` (la v497/v504 au sommet près) et
// le défaut (10 240). On relève les sommets et les octets des grilles, les
// triangles dessinés, la cadence et la pire image sur vingt secondes. Le
// rendu est LOGICIEL : la cadence ne se transpose pas à l'iPhone (v237),
// les sommets et les octets, si.
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8472, portPairs: 9472 }); await banc.ouvrir();
  try {
    for (const bras of (process.env.BRAS || 'avant,apres,apres,avant').split(',')) {
      const params = '&palier=haut' + (bras === 'avant' ? '&loin=2560' : '');
      const p = await banc.jouerSeul('Loin' + Math.random().toString(36).slice(2, 6), { rr: 12, params });
      const r = await p.evaluate(async () => {
        const g = window.__game;
        g.player.pos.set(1200, 140, -900); g.player.vel.set(0, 0, 0);
        g.player.flying = true; g.player.yaw = 0; g.player.pitch = -0.1;
        const att = (ms) => new Promise((f) => setTimeout(f, ms));
        await att(15000);
        const grilles = [g.horizon, g.horizonLoin, g.horizonTresLoin].filter(Boolean);
        const octets = (h) => {
          let o = 0;
          for (const a of Object.values(h.geo.attributes)) o += a.array.byteLength;
          o += h.geo.index.array.byteLength + h.bat.instanceMatrix.array.byteLength + h.bat.instanceColor.array.byteLength;
          for (const k of ['hauteurs', 'pret', 'bati', 'toits', 'estNY', 'climats']) o += h[k].byteLength;
          return o;
        };
        const f0 = g.renderer.info.render.frame, t0 = performance.now();
        let pire = 0, tp = t0, tri = 0, n = 0;
        await new Promise((fin) => {
          const tic = () => {
            const now = performance.now();
            pire = Math.max(pire, now - tp); tp = now;
            tri += g.renderer.info.render.triangles; n++;
            if (now - t0 > 20000) return fin();
            requestAnimationFrame(tic);
          };
          requestAnimationFrame(tic);
        });
        return {
          grilles: grilles.map((h) => ({ pas: h.pas, rayon: h.rayon, sommets: h.N * h.N, mo: +(octets(h) / 1048576).toFixed(2),
            manquantes: h.etat().manquantes, triangles: h.etat().triangles, decoupeMs: h.msDecoupe ? +h.msDecoupe.toFixed(1) : null })),
          brouillard: g.scene.fog.far, planLointain: g.camera.far,
          ips: +((g.renderer.info.render.frame - f0) / ((performance.now() - t0) / 1000)).toFixed(1),
          pireMs: Math.round(pire), trianglesParImage: Math.round(tri / Math.max(1, n)),
        };
      });
      await p.close();
      console.log(bras, JSON.stringify(r));
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
