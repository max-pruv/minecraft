// CE QUE LES VOITURES DE CONVOI GARDENT QUAND L'ENFANT S'EN VA (v474).
//
// On traverse trois villes (Paris, Rome, Londres), puis l'on part loin de
// toute ville. On compte ce que la scène tient encore de voitures de la rue :
// groupes, maillages, géométries qu'elles possèdent EN PROPRE (pas celles du
// prototype de la flotte, que toutes les voitures du modèle partagent), et
// l'estimation en octets du journal de bord (v426).
const { Banc, souffler } = require('./banc.js');
const villes = (process.env.VILLES || 'paris,rome,london').split(',');

(async () => {
  const banc = new Banc({ portJeu: 8396, portPairs: 9396 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeConvois', { rr: 4 });
    const releve = () => page.evaluate(async () => {
      const g = window.__game, R = g.renderer;
      const voitures = g.scene.children.filter((o) => o.userData && (o.userData.flotte !== undefined || o.userData.carrosserie));
      let mailles = 0; const geos = new Set();
      for (const v of voitures) v.traverse((o) => { if (o.isMesh) { mailles++; if (o.geometry) geos.add(o.geometry); } });
      R.render(g.scene, g.camera);
      const j = await import('./src/journal.js');
      const est = j.estimerMemoire ? j.estimerMemoire([g.scene]) : null;
      return { voitures: voitures.length, visibles: voitures.filter((v) => v.visible).length, mailles,
        geos: geos.size, rendues: (window.__rendues || 0), conv: window.__vehicules.fabrication(), gpuGeos: R.info.memory.geometries,
        objets: (() => { let n = 0; g.scene.traverse(() => n++); return n; })(),
        est: est ? { geoMo: +est.geoMo.toFixed(1), texMo: +est.texMo.toFixed(1), n: est.geometries } : null };
    });
    await page.evaluate(async () => {
      const T = await import('three');
      const d = T.BufferGeometry.prototype.dispose;
      T.BufferGeometry.prototype.dispose = function () { window.__rendues = (window.__rendues || 0) + 1; return d.call(this); };
    });
    for (const v of villes) {
      await page.evaluate(async (v) => {
        const m = await import('./src/mondes.js'); const P = m.positionDe(v); const g = window.__game;
        g.player.pos.set(P.x + 6, 90, P.z + 6); g.player.vel.set(0, 0, 0); g.player.flying = true;
      }, v);
      // on tourne sur place pour faire entrer le plus de rues possible
      for (let k = 0; k < 6; k++) {
        await page.evaluate((k) => { const g = window.__game; g.player.yaw = k; g.player.pos.y = 60; }, k);
        await new Promise((f) => setTimeout(f, 4000));
      }
      console.log(v, JSON.stringify(await releve()));
    }
    await page.evaluate(() => { const g = window.__game; g.player.pos.set(0, 120, 20000); });
    await new Promise((f) => setTimeout(f, 15000));
    console.log('loin', JSON.stringify(await releve()));
    await page.close();
  } finally { await banc.fermer(); }
  process.exit(0);
})().catch((e) => { console.error('💥 SONDE PLANTÉE :', e); process.exit(2); });
