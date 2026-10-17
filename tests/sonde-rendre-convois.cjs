// LES VOITURES DE LA RUE RENDENT LEUR MÉMOIRE QUAND L'ENFANT S'EN VA (v474).
// Le passage du témoin de `monte.js` vit ICI, et `monte.js` le requiert : une
// copie de sonde finit par diverger du témoin (v400). Seule, elle se rejoue
// en deux minutes au lieu d'une suite entière (v384).
const { Banc, souffler } = require('./banc.js');

function passage(page) {
return page.evaluate(async () => {
    const g = window.__game, R = g.renderer;
    const { positionDe } = await import('./src/mondes.js');
    const P = positionDe('rome');
    const avant = g.player.pos.clone();
    const voitures = () => g.scene.children.filter((o) => o.userData && o.userData.flotte !== undefined);
    g.player.pos.set(P.x + 6, 60, P.z + 6); g.player.vel.set(0, 0, 0); g.player.flying = true;
    // les voitures naissent à l'approche, leurs modèles arrivent du réseau
    const t0 = performance.now();
    let vs = [];
    while (performance.now() - t0 < 40000) {
      await new Promise((f) => setTimeout(f, 1000));
      g.player.yaw += 1;
      vs = voitures();
      const chargees = vs.filter((v) => v.children.some((c) => !Object.values(v.userData.membres || {}).includes(c)
        && !(c === v.userData.detresse)));
      if (vs.length >= 8 && chargees.length >= vs.length * 0.8) break;
    }
    if (vs.length < 4) return { err: 'Rome n\'a pas fabriqué de voitures', voitures: vs.length };
    // géométries ET matériaux : une voiture repeinte porte sa laque à elle
    // (`repeindre`), alors que sa géométrie est toute au prototype
    const propres = new Set(), proto = new Set();
    let rendues = 0, protoRendues = 0;
    for (const v of vs) v.traverse((o) => {
      o.frustumCulled = false;
      for (const r of [o.geometry].concat(o.material || [])) {
        if (r) (r.userData.partagee ? proto : propres).add(r);
      }
    });
    for (const r of propres) r.addEventListener('dispose', () => { rendues++; });
    for (const r of proto) r.addEventListener('dispose', () => { protoRendues++; });
    R.render(g.scene, g.camera);
    const gpuPleine = R.info.memory.geometries;
    const fab0 = window.__vehicules.fabrication() || {};
    // loin, au sud de Rome : au-delà de la portée ET de la marge
    g.player.pos.set(P.x + 1200, 90, P.z + 1200);
    const t1 = performance.now();
    while (performance.now() - t1 < 20000 && voitures().some((v) => vs.includes(v))) {
      await new Promise((f) => setTimeout(f, 500));
    }
    const restantes = voitures().filter((v) => vs.includes(v)).length;
    R.render(g.scene, g.camera);
    const gpuApres = R.info.memory.geometries;
    const fab1 = window.__vehicules.fabrication() || {};
    // et l'on revient : la rue se refait
    g.player.pos.set(P.x + 6, 60, P.z + 6);
    const t2 = performance.now();
    let revues = 0;
    while (performance.now() - t2 < 25000) {
      await new Promise((f) => setTimeout(f, 1000));
      revues = (window.__vehicules.etat() || []).reduce((n, c) => n + c.visibles, 0);
      if (revues >= 3) break;
    }
    g.player.pos.copy(avant); g.player.flying = false;
    return { voitures: vs.length, propres: propres.size, proto: proto.size, rendues, protoRendues,
      restantes, revues, gpuPleine, gpuApres,
      rendus: (fab1.rendues ?? 0) - (fab0.rendues ?? 0), secondes: Math.round((performance.now() - t0) / 1000) };
  });
}

function juger(c) {
  return !c.err && c.voitures >= 4 && c.propres >= 4 && c.restantes === 0
    && c.rendues >= c.propres && c.protoRendues === 0 && c.revues >= 3;
}

module.exports = { passage, juger };

if (require.main === module) {
  (async () => {
    const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
    await banc.ouvrir();
    try {
      await souffler();
      const page = await banc.jouerSeul('SondeRendre', { rr: 12 });
      const r = await passage(page);
      console.log(JSON.stringify(r));
      console.log('verdict :', juger(r) ? 'VERT' : 'ROUGE');
      await page.close();
    } finally { await banc.fermer(); }
    process.exit(0);
  })().catch((e) => { console.error('💥 SONDE PLANTÉE :', e); process.exit(2); });
}
