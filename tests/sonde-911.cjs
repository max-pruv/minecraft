// CE QUE COÛTE LA 911 RECONSTRUITE (v541) — l'ancienne et la neuve, dans les
// mêmes conditions, en ordre alterné (ABBA, v268). Usage :
//   node tests/sonde-911.cjs [tours=1] [configs=moyen:1,moyen:0,bas:0]
// Une config est « palier:ombres ». Chaque page force la 911 partout
// (`?voiture=911` : la voiture qu'on invoque ET toute la rue), le bras
// « ancienne » ajoute `?asset=0`. Par page :
//   - le décodage seul du fichier (GLTFLoader.parseAsync, octets déjà lus) ;
//   - ce que le prototype tient en carte graphique (`estimerMemoire`, v426) ;
//   - au volant en campagne, puis dans une rue de Paris où TOUTE la rue est
//     des 911 (le pire cas : le tirage normal en met une sur cinquante-deux) :
//     cadence (intervalles de rAF), appels, triangles, mémoire de la scène,
//     et le nombre de 911 dessinées contre le nombre de géométries DISTINCTES
//     qu'elles portent (v495 : les exemplaires partagent celles du prototype).
// Les millisecondes sont celles de SwiftShader (rendu logiciel) : elles ne se
// transposent pas à l'iPad (v247). Ce qui se transpose : les octets, les
// triangles, les appels, le partage, et l'ÉCART entre les deux bras.
const { Banc, souffler } = require('./banc.js');

const TOURS = Number(process.argv[2] || 1);
const CONFIGS = (process.argv[3] || 'moyen:1,moyen:0,bas:0').split(',').map((c) => {
  const [palier, ombres] = c.split(':');
  return { palier, ombres: ombres === '1', rr: palier === 'bas' ? 8 : 12 };
});

async function mesurerPage(banc, cfg, bras, n) {
  const p = await banc.joueur(`Sonde911${n}`, {
    rr: cfg.rr, ombres: cfg.ombres,
    params: `&palier=${cfg.palier}&voiture=911${bras === 'ancienne' ? '&asset=0' : ''}`,
  });
  await p.waitForFunction(() => { try { const e = window.__preparation && window.__preparation(); return !!e && e.programmes >= e.aChauffer; } catch { return false; } },
    null, { timeout: 45000, polling: 250 }).catch(() => {});
  await p.evaluate(() => { document.getElementById('play-btn').click(); window.__game.edu.today().libreJusqua = 86400; });
  await p.waitForFunction(() => window.__game.running, null, { timeout: 30000 }).catch(() => {});
  return p.evaluate(async ({ bras }) => {
    const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
    const g = window.__game, r = g.renderer;
    const V = await import('./src/vehicules.js');
    const J = await import('./src/journal.js');
    const { GLTFLoader } = await import('./vendor/GLTFLoader.js');
    const e = V.FLOTTE.find((f) => f.fichier === 'porsche-911-gt3-rs.glb');
    const fichier = V.fichierCharge(e);
    // 1. le décodage : octets lus d'abord, puis parse (images comprises)
    const octets = await (await fetch('./vendor/voitures/' + fichier)).arrayBuffer();
    const t0 = performance.now();
    await new GLTFLoader().parseAsync(octets, './vendor/voitures/');
    const parseMs = Math.round(performance.now() - t0);
    // 2. le prototype du jeu
    const proto = await V.chargerVoitureFlotte(e);
    let tri = 0, maillages = 0;
    proto.traverse((o) => { if (o.isMesh) { maillages++; tri += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
    const m = J.estimerMemoire([proto]);
    const proj = { fichier, octets: octets.byteLength, parseMs, tri: Math.round(tri), maillages,
      texMo: +m.texMo.toFixed(1), geoMo: +m.geoMo.toFixed(1) };

    async function cadence(s) {
      const intervalles = [], appels = [], tris = [];
      let avant = performance.now();
      const fin = avant + s * 1000;
      await new Promise((ok) => {
        const pas = () => {
          const now = performance.now();
          intervalles.push(now - avant); avant = now;
          appels.push(r.info.render.calls); tris.push(r.info.render.triangles);
          if (now < fin) requestAnimationFrame(pas); else ok();
        };
        requestAnimationFrame(pas);
      });
      intervalles.shift();
      const tri = [...intervalles].sort((a, b) => a - b);
      const q = (f) => tri.length ? tri[Math.min(tri.length - 1, Math.floor(f * tri.length))] : 0;
      const moy = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
      const sc = J.estimerMemoire([g.scene]);
      return { images: tri.length, ips: +(1000 / q(0.5)).toFixed(1), p90ms: Math.round(q(0.9)), pireMs: Math.round(q(1)),
        appels: moy(appels), ktri: Math.round(moy(tris) / 1000), sceneMo: Math.round(sc.texMo + sc.geoMo) };
    }
    async function monter() {
      const pl = g.player, yaw = pl.yaw;
      for (const a of g.animalManager.animals) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const auto = g.animalManager.invoquer('voiture', pl.pos.x - Math.sin(yaw) * 3, pl.pos.z - Math.cos(yaw) * 3);
      await dormir(1500);
      for (let i = 0; i < 6 && !(g.fun.montureConduite && g.fun.montureConduite()); i++) {
        document.getElementById('ride-btn').click(); await dormir(800);
      }
      const a = g.fun.montureConduite && g.fun.montureConduite();
      return { monte: !!a, flotte: a && a.mesh && a.mesh.userData.flotte, modele: !!(a && a.mesh && a.mesh.userData.modele), auto: !!auto };
    }
    // 3. au volant, en campagne
    const montee = await monter();
    for (let i = 0; i < 40 && !(g.fun.montureConduite() && g.fun.montureConduite().mesh.userData.modele); i++) await dormir(250);
    await dormir(3000);
    const campagne = await cadence(10);
    // 4. dans Paris, toute la rue en 911
    const mo = await import('./src/mondes.js'); const P = mo.positionDe('paris');
    g.player.pos.set(P.x + 30, 90, P.z - 10); g.player.vel.set(0, 0, 0);
    await dormir(12000);
    const place = window.__vehicules.placeProche(250);
    if (place) { g.player.pos.set(place.x + 2.5, (place.y || 40) + 2, place.z + 2.5); g.player.vel.set(0, 0, 0); }
    await dormir(8000);
    const rue = await cadence(12);
    // 5. les 911 de la rue partagent-elles la géométrie du prototype ?
    const geos = new Set(), protoGeos = new Set();
    proto.traverse((o) => { if (o.isMesh) protoGeos.add(o.geometry); });
    let n911 = 0, maillages911 = 0, propres = 0;
    g.scene.traverse((o) => {
      if (o.userData && o.userData.flotte === 'porsche-911-gt3-rs.glb' && o.visible) {
        n911++;
        o.traverse((x) => { if (x.isMesh) { maillages911++; geos.add(x.geometry); if (!protoGeos.has(x.geometry)) propres++; } });
      }
    });
    rue.n911 = n911; rue.maillages911 = maillages911; rue.geometriesDistinctes = geos.size; rue.horsPrototype = propres;
    return { bras, proj, montee, campagne, rue, erreurs: (window.__erreurs || []).length };
  }, { bras }).finally(() => p.close().catch(() => {}));
}

(async () => {
  const banc = new Banc({ portJeu: 8431, portPairs: 9431 });
  await banc.ouvrir();
  let n = 0;
  try {
    for (const cfg of CONFIGS) {
      for (let t = 0; t < TOURS; t++) {
        for (const bras of ['neuve', 'ancienne', 'ancienne', 'neuve']) {
          await souffler();
          try {
            const r = await mesurerPage(banc, cfg, bras, n++);
            console.log(JSON.stringify({ palier: cfg.palier, ombres: cfg.ombres, ...r }));
          } catch (e) { console.log(JSON.stringify({ palier: cfg.palier, ombres: cfg.ombres, bras, err: e.message.slice(0, 200) })); }
        }
      }
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
