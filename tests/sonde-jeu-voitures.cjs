// LE JEU PAR VOITURE (v436) — dans une ville, ce que chaque file fait de son
// jeu : combien de convois jouent, sur quelle part de leur tour, de combien
// les voisines s'écartent de leur intervalle de grille (en secondes), si la
// règle se refait à l'identique, et les modèles qui roulent (utilitaires
// compris). Usage : node tests/sonde-jeu-voitures.cjs [paris|rome|madrid] [secondes]
const { Banc, souffler } = require('./banc.js');
const ville = process.argv[2] || 'paris', duree = Number(process.argv[3] || 25);
(async () => {
  const banc = new Banc({ portJeu: 8437, portPairs: 9437 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeJeu' + ville);
    const r = await page.evaluate(async ({ ville, duree }) => {
      const m = await import('./src/mondes.js'); const P = m.positionDe(ville); const g = window.__game;
      g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      await dodo(duree * 1000);
      const out = { convois: 0, jouent: 0, purs: 0, parts: [], ecarts: [], modeles: {}, croisieres: {} };
      for (const c of g.vehicules.etat()) {
        if (!c.routier || c.nom !== 'voiture') continue;
        out.convois++;
        for (const f of c.modeles || []) out.modeles[f] = (out.modeles[f] || 0) + 1;
        if (c.croisiere) out.croisieres[c.voie] = Math.max(out.croisieres[c.voie] || 0, c.croisiere);
        const j = g.vehicules.jeu ? g.vehicules.jeu(c.cle) : null;
        if (!j) continue;
        if (j.pur) out.purs++;
        if (j.A > 0) { out.jouent++; out.parts.push(j.part); out.ecarts.push(...j.ecarts); }
      }
      const abs = out.ecarts.map(Math.abs).sort((a, b) => a - b);
      const q = (f) => (abs.length ? abs[Math.floor(f * (abs.length - 1))] : null);
      const utilitaires = (out.modeles.fourgonnette || 0) + (out.modeles.pickup || 0), total = Object.values(out.modeles).reduce((a, b) => a + b, 0);
      return { convois: out.convois, jouent: out.jouent, purs: out.purs, partMoy: out.parts.length ? +(out.parts.reduce((a, b) => a + b, 0) / out.parts.length).toFixed(2) : 0,
        ecarts: abs.length, med: q(0.5), p90: q(0.9), max: q(1), utilitaires, total, croisieres: out.croisieres };
    }, { ville, duree });
    console.log(ville, JSON.stringify(r));
    await page.close();
  } finally { await banc.fermer(); process.exit(0); }
})();
