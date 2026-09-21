// LE TÉMOIN DE LA CARTE GRAPHIQUE PEUT-IL ENCORE ROUGIR ? (v285)
//
// Il éprouvait les CRÉATURES, parties avec le mode d'attrape. Repointé sur les
// BÊTES — même cycle : naissance, retrait à soixante-dix blocs, `liberer` sur le
// maillage — il faut vérifier qu'il mesure encore quelque chose. Qu'un témoin
// PUISSE rougir se vérifie et ne se raconte pas (v276).
const { Banc, souffler } = require('./banc.js');

(async () => {
  const banc = new Banc({ portJeu: 8395, portPairs: 9395 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeLiberer', { rr: 4 });
    const out = await page.evaluate(() => {
      const g = window.__game, am = g.animalManager, R = g.renderer;
      if (!am || !am.invoquer) return { err: 'pas de gestionnaire de bêtes' };
      am.spawnTimer = 999;
      R.render(g.scene, g.camera);
      const avant = R.info.memory.geometries;
      const CLE = 'cow';
      const nees = [];
      for (let i = 0; i < 40 && nees.length < 10; i++) {
        const a = am.invoquer(CLE, g.player.pos.x + 3 + i, g.player.pos.z + 3);
        if (a) nees.push(a);
      }
      if (!nees.length) return { err: 'invoquer a refusé la clé ' + CLE };
      for (const a of nees) a.mesh.traverse((o) => { o.frustumCulled = false; });
      R.render(g.scene, g.camera);
      const pleine = R.info.memory.geometries;
      for (const a of nees) a.pos.set(g.player.pos.x + 400, a.pos.y, g.player.pos.z + 400);
      am.spawnTimer = 999;
      am.update(0.001);
      R.render(g.scene, g.camera);
      const apres = R.info.memory.geometries;
      return { avant, pleine, apres, nees: nees.length, restantes: am.animals.length,
        prises: pleine - avant, rendues: pleine - apres, perdues: apres - avant };
    });
    await page.close();
    console.log(JSON.stringify(out));
    console.log(out.err ? 'ÉCHEC' : `verdict : ${!out.err && out.nees >= 5 && out.prises >= 20 && out.perdues <= 10 ? 'VERT' : 'ROUGE'}`);
  } finally { await banc.fermer(); }
  process.exit(0);
})().catch((e) => { console.error('💥 SONDE PLANTÉE :', e); process.exit(2); });
