// SONDE — par le nuage, à tempo 4, le passager s'assoit-il chez son ami ?
//
// Sans courtier, la partie passe par le relais du nuage : pas de canal à
// sonder, une relève toutes les demi-secondes de chaque côté, et une latence
// qui est celle du BANC — elle ne passe pas sous tempo. Le témoin de
// `reseau.js` « sans courtier, le conducteur voit son passager assis » est
// devenu rouge au premier passage à tempo 4. Cette sonde rejoue son geste
// exact sur N couples neufs, et sépare ce qui se mêlait dans le témoin :
// (1) les deux tablettes se retrouvent-elles (une intermittence connue des
// deux côtés), (2) le bouton « Monter avec » apparaît-il, (3) le passager
// est-il assis chez lui, (4) chez le conducteur.
//
//     T=4 N=4 node sonde-tempo-nuage.cjs     (puis T=1 pour comparer)
const { Banc, fixerTempo, nomsVus, dormir, jusqua } = require('./banc.js');
const { servirLeNuage } = require('./nuage.js');

(async () => {
  fixerTempo(Number(process.env.T || 4));
  const N = Number(process.env.N || 4);
  const banc = new Banc();
  await banc.ouvrir();
  await servirLeNuage(9721);
  const AVEC_NUAGE = { portNuage: 9721 };
  const bilan = [];
  try {
    for (let k = 0; k < N; k++) {
      const r = { ensemble: false, s: null, volant: false, bouton: false, passagere: null, assise: false };
      const a = await banc.joueurVers(`Sacha${k}`, 9798, AVEC_NUAGE);
      await a.evaluate(() => document.getElementById('online-btn').click());
      await dormir(400);
      await a.evaluate(() => document.getElementById('host-btn').click());
      await jusqua(async () => a.evaluate(() => !!(window.__game.net && window.__game.net.bus)), 60000);
      const code = await a.evaluate(() => document.getElementById('room-code').textContent.trim());
      const b = await banc.joueurVers(`Alba${k}`, 9798, AVEC_NUAGE);
      await b.evaluate(() => document.getElementById('online-btn').click());
      await dormir(400);
      await b.evaluate((c) => { document.getElementById('join-code').value = c; document.getElementById('join-btn').click(); }, code);
      await dormir(2000);
      await b.evaluate(() => document.getElementById('online-play-btn')?.click());
      await a.evaluate(() => document.getElementById('online-play-btn')?.click());
      const t0 = Date.now();
      r.ensemble = await jusqua(async () => (await nomsVus(a)).includes(`Alba${k}`) && (await nomsVus(b)).includes(`Sacha${k}`), 60000);
      r.s = Math.round((Date.now() - t0) / 1000);
      if (r.ensemble) {
        r.volant = await a.evaluate(async () => {
          const g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
          for (const x of [...g.animalManager.animals]) g.animalManager.scene.remove(x.mesh);
          g.animalManager.animals.length = 0;
          const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
          g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5);
          await dodo(1500); document.getElementById('ride-btn').click(); await dodo(800);
          return !!(g.fun.montureConduite && g.fun.montureConduite());
        });
        const p0 = await a.evaluate(() => { const p = window.__game.player.pos; return { x: p.x, y: p.y, z: p.z }; });
        await b.evaluate((p) => {
          const g = window.__game;
          for (const x of [...g.animalManager.animals]) g.animalManager.scene.remove(x.mesh);
          g.animalManager.animals.length = 0;
          g.player.pos.set(p.x + 3, p.y, p.z); g.player.vel.set(0, 0, 0);
        }, p0);
        r.bouton = await jusqua(async () => b.evaluate(() => {
          const x = document.getElementById('ride-btn'); return x.style.display !== 'none' && /Monter avec/.test(x.textContent);
        }), 20000);
        if (r.bouton) await b.evaluate(() => document.getElementById('ride-btn').click());
        // Le passager, image par image pendant trois secondes : monte-t-il,
        // et qu'est-ce qui le fait redescendre ?
        r.suivi = await b.evaluate(async () => {
          const g = window.__game; const out = [];
          for (let i = 0; i < 15; i++) {
            const p = g.fun.passagerDe(); out.push(p ? 1 : 0);
            await new Promise((f) => setTimeout(f, 200));
          }
          return out.join('');
        });
        r.passagere = await b.evaluate(() => { const p = window.__game.fun.passagerDe(); return p ? p.s : null; });
        r.assise = await jusqua(async () => a.evaluate((nom) => {
          const g = window.__game; const v = g.fun.montureConduite && g.fun.montureConduite();
          for (const rp of g.remotePlayers.values()) if (rp.name === nom) return !!(v && rp.mesh.parent === v.mesh);
          return false;
        }, `Alba${k}`), 20000);
      }
      console.log(`couple ${k}`, JSON.stringify(r));
      bilan.push(r);
      await a.close(); await b.close();
    }
    const ens = bilan.filter((r) => r.ensemble);
    console.log(`BILAN T=${process.env.T || 4} : retrouvés ${ens.length}/${N} · bouton ${ens.filter((r) => r.bouton).length} · passagère ${ens.filter((r) => r.passagere !== null).length} · assise ${ens.filter((r) => r.assise).length}`);
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})().catch((e) => { console.error(e); process.exit(2); });
