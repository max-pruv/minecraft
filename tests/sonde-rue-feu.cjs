// SONDE (banc-lot3) : « au feu, la voiture freine sur plusieurs relevés »
// rougit sur des arrêts « secs ». `etat().causes` vaut 1 pour « un feu OU LA
// FILE d'un feu », et la file est légitime derrière un feu, l'enfant, un
// piéton ou un train (v395) : une voiture qui suit une voiture qui a PILÉ
// devant un piéton est comptée « au feu ». On relève, pour chaque arrêt, la
// cause FINE (`diagVoiture`) au dernier relevé en mouvement et à l'arrêt, et
// l'on sépare aussi « la rue ne roule pas » (médiane 0) de « la page ne rend
// pas » (images rendues pendant la fenêtre). Même pose que le témoin.
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8473, portPairs: 9473 }); await banc.ouvrir();
  try {
    for (let passe = 0; passe < Number(process.env.PASSES || 2); passe++) {
      const p = await banc.jouerSeul('RueFeu' + passe, { tactile: true });
      const r = await p.evaluate(async () => {
        const m = await import('./src/mondes.js'); const P = m.positionDe('paris'); const g = window.__game;
        g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
        const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
        const suites = new Map(); const vit = [];
        const f0 = g.renderer.info.render.frame, t0 = performance.now();
        while (performance.now() - t0 < 60000) {
          await dodo(100);
          g.vehicules.etat().forEach((c, ci) => {
            if (!c.routier || c.nom !== 'voiture') return;
            for (const q of c.places) {
              const v = c.vitesses[q[3]]; vit.push(v);
              const k = ci + ':' + q[3]; const s = suites.get(k) || [];
              let fine = null;
              if (v < 3.5) { const d = g.vehicules.diagVoiture(ci, q[3]); fine = d ? (d.cause || '-') : 'x'; }
              s.push([v, performance.now(), c.causes[q[3]], fine]); suites.set(k, s);
            }
          });
        }
        const arrets = [];
        for (const [k, s] of suites) for (let i = 0; i < s.length; i++) {
          if (s[i][0] >= 0.3) continue;
          let j = i - 1; while (j >= 0 && s[j][0] < 3 && s[j][0] >= 0.3) j--;
          if (j >= 0 && s[j][0] >= 3 && s[i][2] === 1) {
            const dec = s[j][0] / Math.max(1e-3, (s[i][1] - s[j][1]) / 1000);
            arrets.push({ k, dec: +dec.toFixed(1), sec: dec > 10, causeArret: s[i][3], causeAvant: s[j][3], suite: s.slice(j, i + 1).map((x) => x[3]).join('>') });
          }
          while (i < s.length && s[i][0] < 0.3) i++;
        }
        vit.sort((a, b) => a - b);
        return { images: g.renderer.info.render.frame - f0, releves: vit.length, mediane: vit[Math.floor(vit.length / 2)],
          arrets: arrets.length, secs: arrets.filter((a) => a.sec), causesArret: arrets.reduce((o, a) => { o[a.causeArret] = (o[a.causeArret] || 0) + 1; return o; }, {}) };
      });
      console.log('passe', passe, JSON.stringify(r));
      await p.close();
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
