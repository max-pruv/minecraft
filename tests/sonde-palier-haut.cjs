// QUE COÛTE LE PALIER `haut`, QUI N'AVAIT JAMAIS TOURNÉ NULLE PART ? (v291)
//
// Max, capture d'iPhone sur la production : « A problem repeatedly occurred »,
// « Game break after 3sec ». Le jeu est cassé pour Marlon et Alice.
//
// UN FAIT, PAS UNE HYPOTHÈSE : jusqu'à la v290, `haut` était INATTEIGNABLE —
// sa barre `msTravail <= 8` était comparée à la PÉRIODE de rafraîchissement,
// donc 17,0 ms sur tout appareil à 60 Hz (c'est la panne que la v290 corrige).
// La v290 a rendu la grandeur juste, et par là a rendu `haut` atteignable POUR
// LA PREMIÈRE FOIS : rr 16, file 16, portée HD 6. Cette configuration n'a
// jamais tourné sur un appareil réel, ni au banc — `parishd.js` force `?hd=2`.
//
// ON MESURE LA CAUSE ET NON L'EFFET (v236) : le banc a de la mémoire à revendre
// et rend en logiciel, donc il ne PEUT PAS subir l'arrêt d'onglet d'iOS. Ce qui
// se transpose, ce sont les OCTETS et les compteurs du pilote. Deux bras, dans
// l'ORDRE ALTERNÉ (v268), au centre de Paris, la couche HD forcée des deux
// côtés parce que `RAYON_HD` vaut zéro en rendu logiciel (v287).
const { Banc } = require('./banc.js');

const OCTETS_MORCEAU = 16 * 16 * 160 * 2;   // Int16 par bloc (v236)

(async () => {
  const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
  await banc.ouvrir();
  const { positionDe } = await import('../src/mondes.js');
  const PARIS = positionDe('paris');

  const bras = async (nom, rr, file, hd, prenom) => {
    const p = await banc.joueur(prenom, {
      rr, tactile: true, params: `&hd=${hd}&attente=${file}`,
      viewport: { width: 700, height: 460 },
    });
    await p.locator('.who-card.active').click();
    await p.getByRole('button', { name: 'Plus tard', exact: true }).click();
    await p.locator('#play-btn').click();
    await p.waitForFunction(() => __game.running, { timeout: 120000 });
    await p.evaluate((P) => {
      const g = __game;
      g.player.pos.set(P.x, g.world.sommetColonne(Math.floor(P.x), Math.floor(P.z)) + 2, P.z);
      g.player.vel.set(0, 0, 0);
    }, PARIS);
    // ON ATTEND LE FAIT DU MONDE, BORNÉ, ET LA DURÉE ENTRE DANS LE MESSAGE
    // (v270, v290) : le disque se remplit au rythme des IMAGES, et une durée
    // fixe mesurerait la cadence du banc. On attend que le compte de morceaux
    // ait cessé de monter, ou la borne.
    const t0 = Date.now();
    let stable = 0; let avant = -1; let n = 0;
    while (Date.now() - t0 < 180000 && stable < 4) {
      await new Promise((r) => setTimeout(r, 3000));
      n = await p.evaluate(() => __game.world.chunks.size);
      stable = n === avant ? stable + 1 : 0;
      avant = n;
    }
    const r = await p.evaluate(() => {
      const g = __game;
      let hdMorceaux = 0;
      for (const e of g.chunkMeshes.values()) if (e && (e.detail || e.hd || e.facades)) hdMorceaux++;
      const m = performance.memory || {};
      return {
        rr: g.diag ? null : null,
        morceaux: g.world.chunks.size,
        maillages: g.chunkMeshes.size,
        hdMorceaux,
        rayonHD: g.RAYON_HD,
        geometries: g.renderer.info.memory.geometries,
        textures: g.renderer.info.memory.textures,
        programmes: g.renderer.info.programs ? g.renderer.info.programs.length : null,
        appels: g.renderer.info.render.calls,
        triangles: g.renderer.info.render.triangles,
        tasJS: m.usedJSHeapSize ? Math.round(m.usedJSHeapSize / 1048576) : null,
        tasMax: m.jsHeapSizeLimit ? Math.round(m.jsHeapSizeLimit / 1048576) : null,
      };
    });
    r.nom = nom;
    r.attenduMorceaux = (2 * rr + 1) ** 2;
    r.moBlocsFilPrincipal = Math.round((r.morceaux * OCTETS_MORCEAU) / 1048576);
    r.moBlocsDeuxMondes = r.moBlocsFilPrincipal * 2;   // le worker a son jumeau (v251)
    r.secondes = Math.round((Date.now() - t0) / 1000);
    await p.context().close();
    return r;
  };

  const lignes = [];
  // ORDRE ALTERNÉ : moyen, haut, haut, moyen — sinon on mesure la place dans la
  // série et non le traitement (v268).
  lignes.push(await bras('moyen (ce que le jeu servait)', 12, 8, 3, 'PalA'));
  lignes.push(await bras('HAUT (jamais servi avant v290)', 16, 16, 6, 'PalB'));
  lignes.push(await bras('HAUT (jamais servi avant v290)', 16, 16, 6, 'PalC'));
  lignes.push(await bras('moyen (ce que le jeu servait)', 12, 8, 3, 'PalD'));

  console.log('\n=== CE QUE COÛTE LE PALIER, MESURÉ AU CENTRE DE PARIS ===');
  for (const l of lignes) {
    console.log(`\n${l.nom}  (${l.secondes} s pour se stabiliser)`);
    console.log(`  morceaux chargés   ${l.morceaux} / ${l.attenduMorceaux} attendus`);
    console.log(`  blocs fil principal ${l.moBlocsFilPrincipal} Mo · deux mondes ${l.moBlocsDeuxMondes} Mo`);
    console.log(`  maillages ${l.maillages} · dont HD ${l.hdMorceaux} (rayon HD ${l.rayonHD})`);
    console.log(`  géométries ${l.geometries} · textures ${l.textures} · programmes ${l.programmes}`);
    console.log(`  appels de dessin ${l.appels} · triangles ${l.triangles}`);
    console.log(`  tas JS ${l.tasJS} Mo / plafond ${l.tasMax} Mo`);
  }
  console.log('\n(banc en rendu logiciel, mémoire à revendre : il ne PEUT PAS subir');
  console.log(" l'arrêt d'onglet d'iOS. Ce qui se transpose, ce sont les octets.)");
  process.exit(0);
})().catch((e) => { console.error('SONDE MORTE :', e && e.message); process.exit(1); });
