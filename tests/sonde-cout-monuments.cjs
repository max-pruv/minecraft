// CE QUE LES MONUMENTS EN RELIEF COÛTENT AU MAILLEUR (v292).
//
// « Mesurer sur les configurations mobiles plutôt que supposer que plus de
// détail est abordable. » Le coût d'un morceau se paie DANS le worker, et c'est
// lui que le palier de la v284 mesure pour décider ce que l'appareil peut
// porter : un morceau qui passe de vingt à quarante millisecondes ferait
// classer l'iPad plus bas et LUI RETIRERAIT la couche HD.
//
// Deux bras sur les MÊMES morceaux, en ORDRE ALTERNÉ (v268) : avec le modèle,
// et avec le modèle désarmé — `monumentsTouches` porte les huit noms, ce qui
// est exactement l'état d'un monument qu'un enfant a creusé. À froid le premier
// morceau paie la rastérisation de la couverture ; on l'imprime à part, parce
// qu'un chiffre pris au premier passage n'est pas une mesure (v289).
(async () => {
  const { World, CHUNK, REPERES_HD } = await import('../src/world.js');
  const { buildChunkTampons } = await import('../src/mesher.js');
  const { MONUMENTS_HD } = await import('../src/paris-monuments-hd.js');

  const morceaux = [];
  for (const lm of REPERES_HD) {
    const cx = Math.floor(lm.x / CHUNK), cz = Math.floor(lm.z / CHUNK);
    morceaux.push([lm.name, cx, cz]);
  }

  const mesurer = (arme) => {
    const out = [];
    for (const [nom, cx, cz] of morceaux) {
      const w = new World();
      w.hd = 1;
      if (!arme) for (const n of Object.keys(MONUMENTS_HD)) w.monumentsTouches.add(n);
      w.ensureChunk(cx, cz);                       // la génération est hors mesure
      const t0 = performance.now();
      const t = buildChunkTampons(w, cx, cz);
      const ms = performance.now() - t0;
      out.push({ nom, ms, tri: t.facades ? t.facades.indices.length / 3 : 0,
        sommets: t.facades ? t.facades.positions.length / 3 : 0 });
    }
    return out;
  };

  // À froid, une fois, pour voir ce que la rastérisation coûte au tout premier.
  const froid = mesurer(true);
  console.log('à froid (la couverture se rastérise) :',
    froid.map((r) => `${r.nom} ${r.ms.toFixed(0)}`).join(' · '));

  const bras = { arme: [], nu: [] };
  for (let tour = 0; tour < 3; tour++) {
    for (const [cle, arme] of tour % 2 === 0 ? [['arme', true], ['nu', false]] : [['nu', false], ['arme', true]]) {
      bras[cle].push(mesurer(arme));
    }
  }
  const median = (v) => v.slice().sort((a, b) => a - b)[Math.floor(v.length / 2)];
  console.log('\nmorceau               modèle armé   modèle désarmé   écart   triangles du modèle');
  let totA = 0, totN = 0;
  for (let i = 0; i < morceaux.length; i++) {
    const a = median(bras.arme.map((s) => s[i].ms)), n = median(bras.nu.map((s) => s[i].ms));
    const tri = bras.arme[0][i].tri - bras.nu[0][i].tri;
    totA += a; totN += n;
    console.log(`${morceaux[i][0].padEnd(20)} ${a.toFixed(1).padStart(8)} ms ${n.toFixed(1).padStart(12)} ms ${(a - n >= 0 ? '+' : '') + (a - n).toFixed(1)}`.padEnd(70) + `${tri}`);
  }
  console.log(`\ntotal des huit : ${totA.toFixed(1)} ms armé contre ${totN.toFixed(1)} ms désarmé`
    + ` — ${(totA / totN).toFixed(2)}×, soit ${((totA - totN) / morceaux.length).toFixed(1)} ms par morceau de monument.`);
  console.log('Un morceau de Paris SANS monument ne paie rien : le filtre est une boucle sur huit repères.');
})();
