// LA REVUELTO ADAPTÉE CONTRE L'ANCIENNE (v546). Max a déposé une adaptation
// CC-BY-4.0 du modèle de BRO, plus lourde que la Revuelto paramétrique de la
// flotte ; elle la remplace à l'affichage par le champ `asset` (vehicules.js).
// Avant de la proposer, on mesure les deux DANS LES MÊMES CONDITIONS, en ordre
// alterné (v268) : ancienne, neuve, neuve, ancienne, une page neuve chacune.
//
//   node tests/sonde-revuelto.cjs [bas|moyen]   (les deux par défaut)
//
// Pour chaque passage : le chargement (octets, durée), ce que le prototype
// tient en mémoire graphique (`estimerMemoire`, journal.js), les programmes nés
// en dessinant le modèle APRÈS la chauffe (zéro attendu), la forme mesurée
// (`normaliserVoiture`), puis AU VOLANT sur une dalle (appels de dessin,
// cadence, pire image) et DANS UNE RUE DE PARIS où la flotte est réduite à la
// Revuelto et aux trois modèles fabriqués : quatre voitures sur six en sont.
// Isolée (aucune suite ne l'importe) : elle ne coûte rien au portail.
const { Banc, souffler } = require('./banc.js');

const PALIERS = { bas: { rr: 8 }, moyen: { rr: 12 } };
const ordre = ['ancienne', 'neuve', 'neuve', 'ancienne'];

(async () => {
  const banc = new Banc({ portJeu: 8441, portPairs: 9441 });
  await banc.ouvrir();
  const resultats = [];
  try {
    const voulus = process.argv[2] ? [process.argv[2]] : ['moyen', 'bas'];
    let k = 0;
    for (const palier of voulus) {
      for (const bras of ordre) {
        await souffler();
        const page = await banc.jouerSeul('SondeRevuelto' + (k++), { rr: PALIERS[palier].rr, pret: true, params: '&palier=' + palier });
        const erreurs = [];
        page.on('pageerror', (e) => erreurs.push(e.message));
        const r = await page.evaluate(async (bras) => {
          const g = window.__game;
          const THREE = await import('three');
          const V = await import('./src/vehicules.js');
          const J = await import('./src/journal.js');
          const { BLOCK } = await import('./src/blocks.js');
          const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
          const entree = V.FLOTTE.find((e) => e.fichier === 'lamborghini-revuelto.glb');
          if (!entree) return { err: 'pas de Revuelto dans la flotte' };
          if (bras === 'ancienne') delete entree.asset;
          const url = './vendor/voitures/' + (entree.asset || entree.fichier);
          const res = { url };
          // 1. CHARGEMENT : octets et durée de chargement + analyse
          const t0 = performance.now();
          const proto = await V.chargerVoitureFlotte(entree);
          res.chargementMs = Math.round(performance.now() - t0);
          const rs = performance.getEntriesByType('resource').filter((e) => e.name.includes(url.slice(1)));
          res.octets = rs.length ? rs[rs.length - 1].encodedBodySize || rs[rs.length - 1].decodedBodySize : null;
          if (!proto) return { ...res, err: 'modèle non chargé' };
          const m = J.estimerMemoire([proto]);
          res.memoire = { texMo: +m.texMo.toFixed(2), geoMo: +m.geoMo.toFixed(2), sources: m.sources, geometries: m.geometries };
          let tri = 0, maillages = 0, roues = 0, volant = false;
          proto.traverse((o) => {
            if (o.isMesh) { maillages++; tri += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }
            if (/^Wheel_/i.test(o.name || '')) roues++;
            if (/steer|volant/i.test(o.name || '')) volant = true;
          });
          proto.updateMatrixWorld(true);
          const b = new THREE.Box3().setFromObject(proto);
          res.forme = { forme: proto.userData.forme, rayonRoue: +proto.userData.rayonRoue.toFixed(3), roues, volant, maillages, triangles: Math.round(tri),
            longueur: +(b.max.z - b.min.z).toFixed(2), largeur: +(b.max.x - b.min.x).toFixed(2), hauteur: +(b.max.y - b.min.y).toFixed(2), sol: +b.min.y.toFixed(3) };
          // 2. PROGRAMMES nés en dessinant le modèle après la chauffe
          const p0 = new Set(g.renderer.info.programs.map((p) => p.cacheKey));
          const essai = proto.clone(true);
          essai.position.set(g.player.pos.x, g.player.pos.y, g.player.pos.z - 6);
          g.scene.add(essai);
          await dormir(800);
          g.scene.remove(essai);
          res.programmesNeufs = g.renderer.info.programs.filter((p) => !p0.has(p.cacheKey)).length;
          // 3. AU VOLANT, sur une dalle loin de tout
          const x0 = 41000, z0 = 41000; let y0 = 0;
          for (let d = -10; d <= 60; d += 5) for (let w = -20; w <= 20; w += 5) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
          y0 += 3;
          for (let d = -10; d <= 60; d++) for (let w = -20; w <= 20; w++) g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
          const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
          for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
          g.animalManager.animals.length = 0;
          g.player.flying = false; g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
          g.player.pos.set(x0, y0 + 1.2, z0); g.player.vel.set(0, 0, 0);
          g.animalManager.invoquer('voiture', x0 + 3, z0, false, { flotte: 'lamborghini-revuelto.glb' });
          await dormir(1500);
          for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); const t = performance.now(); while (!auVolant() && performance.now() - t < 2500) await dormir(150); }
          res.auVolant = auVolant();
          const mesurer = async (ms) => {
            const f0 = g.renderer.info.render.frame; const appels = [], tris = [], durees = [];
            let prec = performance.now(); const t1 = prec;
            await new Promise((fin) => {
              const pas = (t) => {
                durees.push(t - prec); prec = t;
                appels.push(g.renderer.info.render.calls); tris.push(g.renderer.info.render.triangles);
                if (t - t1 < ms) requestAnimationFrame(pas); else fin();
              };
              requestAnimationFrame(pas);
            });
            const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
            return { images: g.renderer.info.render.frame - f0, cadence: +((g.renderer.info.render.frame - f0) / (ms / 1000)).toFixed(1),
              appels: med(appels), triangles: med(tris), pireMs: Math.round(Math.max(...durees.slice(1))) };
          };
          await dormir(1500);
          const pv0 = new Set(g.renderer.info.programs.map((p) => p.cacheKey));
          res.volant = await mesurer(6000);
          res.volant.programmesNeufs = g.renderer.info.programs.filter((p) => !pv0.has(p.cacheKey)).length;
          // descendre, et la rue
          for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await dormir(500); }
          for (let i = V.FLOTTE.length - 1; i >= 0; i--) {
            const e = V.FLOTTE[i];
            if (e !== entree && !e.fabrique) V.FLOTTE.splice(i, 1);
          }
          const P = await import('./src/paris.js');
          const cs = P.circuitsParis((x, z) => g.world.terrainHeight(Math.round(x), Math.round(z)));
          const c = cs[0]; const q0 = c.pts[0], q1 = c.pts[1];
          const x = Math.round((q0.x + q1.x) / 2), z = Math.round((q0.z + q1.z) / 2);
          g.player.flying = false;
          g.player.pos.set(x, g.world.sommetColonne(x, z) + 3, z);
          g.player.vel.set(0, 0, 0);
          await dormir(20000);
          const prues = new Set(g.renderer.info.programs.map((p) => p.cacheKey));
          res.rue = await mesurer(8000);
          res.rue.programmesNeufs = g.renderer.info.programs.filter((p) => !prues.has(p.cacheKey)).length;
          let rev = 0, vues = 0;
          g.scene.traverse((o) => { if (o.userData && o.userData.flotte) { if (o.userData.flotte === 'lamborghini-revuelto.glb') rev++; if (o.visible) vues++; } });
          res.rue.revueltos = rev; res.rue.voituresVisibles = vues;
          res.rue.memoireScene = (() => { const s = J.estimerMemoire([g.scene]); return { texMo: +s.texMo.toFixed(1), geoMo: +s.geoMo.toFixed(1) }; })();
          return res;
        }, bras);
        resultats.push({ palier, bras, ...r, erreurs: erreurs.slice(0, 3) });
        console.log(JSON.stringify({ palier, bras, ...r, erreurs: erreurs.slice(0, 3) }));
        await page.close();
        banc.pages = banc.pages.filter((p) => p !== page);
      }
    }
  } finally {
    require('fs').writeFileSync(process.env.SORTIE || '/tmp/sonde-revuelto.json', JSON.stringify(resultats, null, 1));
    await banc.fermer(); process.exit(0);
  }
})();
