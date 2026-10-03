// UNE PLACE À MOINS DE TROIS BLOCS, SANS VOITURE DESSINÉE (vu en v306) — la
// sonde qui distingue les cas. Le témoin « on prend le volant » de fumee.js
// téléporte l'enfant sur un circuit de Paris puis interroge `placeProche` par
// un minuteur, HORS de la boucle d'affichage. Ce qu'on relève à chaque place
// rendue sans maillage : la portée du convoi, la tête, la traînée,
// `retardMax()`, le temps écoulé depuis le dernier passage dans `montrer`, et
// ce que `montrer` calcule pour cette place depuis la position qu'il a VUE et
// depuis celle d'aujourd'hui (`diagPlace`, vehicules.js).
// Usage : node tests/sonde-place-vide.cjs
const { Banc, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8417, portPairs: 9417 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('PlaceVide');
    const r = await page.evaluate(async () => {
      const P = await import('./src/paris.js');
      const g = window.__game;
      const cs = [...P.circuitsParis((x, z) => g.world.terrainHeight(x, z)), ...(P.circuitsQuartiersParis ? P.circuitsQuartiersParis((x, z) => g.world.terrainHeight(x, z)) : [])];
      const out = { vides: [], pleines: 0, polls: 0, tps: 0 };
      // des téléportations sur chaque circuit, comme le témoin
      for (const c of cs) for (const f of [0.1, 0.45, 0.8]) {
        out.tps++;
        const k = Math.floor(f * (c.pts.length - 2));
        const A = c.pts[k], B = c.pts[k + 1];
        const x = A.x + (B.x - A.x) * 0.4, z = A.z + (B.z - A.z) * 0.4;
        g.player.pos.set(x, g.world.sommetColonne(Math.floor(x), Math.floor(z)) + 1, z);
        g.player.vel.set(0, 0, 0);
        const f0 = g.renderer.info.render.frame;
        for (let i = 0; i < 40; i++) {
          await new Promise((r2) => setTimeout(r2, 100));
          out.polls++;
          const d = window.__vehicules.diagPlace(5);
          if (!d) continue;
          if (d.visible) { out.pleines++; continue; }
          out.vides.push({ ...d, imagesDepuisTp: g.renderer.info.render.frame - f0, poll: i });
        }
      }
      return out;
    });
    const vides = r.vides;
    console.log(`polls ${r.polls} · places dessinées ${r.pleines} · places VIDES ${vides.length}`);
    const cas = { pasEncoreMontre: 0, regleDitDedans: 0, regleDitDehors: 0 };
    for (const v of vides) {
      if (v.regleVue && !v.regleVue.dedans && v.regleIci.dedans) cas.pasEncoreMontre++;
      else if (v.regleIci.dedans && v.regleIci.prefiltre) cas.regleDitDedans++;
      else cas.regleDitDehors++;
    }
    console.log('cas', JSON.stringify(cas));
    for (const v of vides.slice(0, 12)) console.log(JSON.stringify(v));
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
