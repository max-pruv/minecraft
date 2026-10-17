// LE FLÂNEUR POSÉ SUR LA CHAUSSÉE, REJOUÉ SEUL (v482) — le témoin de `monte.js`
// (« un flâneur posé au milieu de la chaussée en sort et flâne au bord ») lu
// TEL QUEL dans monte.js, joué N fois à Rome sur une page neuve, pour comparer
// une distribution des deux côtés (règle v269).
//
//     node tests/sonde-flaneur-rome.cjs [N]
const fs = require('fs');
const path = require('path');
const { Banc, dormir } = require('./banc.js');
const N = +process.argv[2] || 4;
const src = fs.readFileSync(path.join(__dirname, 'monte.js'), 'utf8');
const debut = 'const sortieRue = await tab.evaluate(';
const a = src.indexOf(debut) + debut.length;
const b = src.indexOf("    verifier('un flâneur posé au milieu de la chaussée", a);
const corps = src.slice(a, src.lastIndexOf(');', b));
(async () => {
  const banc = new Banc({ portJeu: 8419, portPairs: 9419 });
  await banc.ouvrir();
  try {
    for (let i = 0; i < N; i++) {
      const tab = await banc.jouerSeul(`Flaneur${i}`, { tactile: true });
      await tab.evaluate(async () => {
        const g = window.__game; g.edu.today().unlocks = 99;
        const { positionDe } = await import('./src/mondes.js');
        const p = positionDe('rome'); g.player.flying = true; g.player.pos.set(p.x + 0.5, 50, p.z + 0.5);
      });
      for (let k = 0; k < 60; k++) {
        await dormir(1000);
        const ok = await tab.evaluate(() => { const s = window.__game.passants.sites.find((q) => q.peuple && q.peuple.length); return !!s && Math.hypot(s.x - window.__game.player.pos.x, s.z - window.__game.player.pos.z) < 300; });
        if (ok) break;
      }
      // eslint-disable-next-line no-eval
      const r = await tab.evaluate(eval(corps));
      const vert = !r.err && r.essais.length > 0 && r.essais.every((e) => !e.err && e.arrivee !== 'c' && e.poste !== 'c');
      console.log(JSON.stringify({ passe: i, vert, ville: r.ville, essais: r.essais }));
      await tab.close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
