// SONDE (banc-intermittents) : « en vol, on ne rattrape pas le bout du monde
// qui se charge » (monte.js) — sa page mesure le débit de maillage pendant que
// la page principale de la suite (`tab`, en jeu) tourne à côté. Deux bras en
// ordre alterné : la voisine en jeu, la voisine gelée (CDP
// Page.setWebLifecycleState). Le corps de la mesure est recopié de monte.js.
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8464, portPairs: 9464 }); await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Voisine', { tactile: true });
    const cdp = await tab.context().newCDPSession(tab);
    for (const gele of (process.env.BRAS || 'non,oui,oui,non').split(',')) {
      await cdp.send('Page.setWebLifecycleState', { state: gele === 'oui' ? 'frozen' : 'active' });
      const ciel = await banc.jouerSeul('Amelie' + Math.random().toString(36).slice(2, 5), { rr: 12 });
      const t0 = Date.now();
    const suivi = await ciel.evaluate(async () => {
      const g = window.__game;
      const m = await import('./src/montures.js');
      let scene = g.npcs && g.npcs[0] ? g.npcs[0].mesh : null;
      while (scene && scene.parent) scene = scene.parent;
      if (!scene || !scene.fog) return { err: 'ni scène ni brouillard' };
      const CHUNK = 16, R = 12;
      const out = { brouillard: Math.round(scene.fog.near) };
      for (const key of ['avionligne', 'concorde', 'chasseur']) {
        const def = m.MONTURES.find((d) => d.key === key);
        // Un couloir vierge, loin de tout : on éprouve le STREAMING, pas le
        // coût d'une ville.
        g.player.pos.set(30000 + ['avionligne', 'concorde', 'chasseur'].indexOf(key) * 4000, 100, 30000);
        g.player.vel.set(0, 0, 0); g.player.yaw = 0; g.player.pitch = 0;
        g.player.flying = true;
        g.player.pilote = def.pilote;
        g.player.vitesseAvion = def.pilote.max;
        g.player.avionEnVol = true; g.player.avionEtat = 'vol';
        g.player.altitudeDecollage = -999;
        // ON OBSERVE PENDANT TOUTE LA FENÊTRE, PAS SEULEMENT À LA FIN. Un
        // front de chargement est irrégulier : le même code m'a rendu 68, 91
        // puis 101 blocs sur trois instantanés. Quatre secondes pour établir
        // le régime, puis six relevés à une seconde d'intervalle, et l'on
        // garde la MÉDIANE — ce qui se reproduit, pas le creux le plus
        // frappant.
        const patienter = (ms) => new Promise((fin) => {
          const t0 = performance.now();
          const tic = () => (performance.now() - t0 < ms ? requestAnimationFrame(tic) : fin());
          requestAnimationFrame(tic);
        });
        await patienter(4000);
        const releves = [];
        for (let n = 0; n < 6; n++) {
          await patienter(1000);
          const poses = new Set();
          scene.traverse((o) => {
            if (o.isMesh && o.position.y === 0
              && o.position.x % CHUNK === 0 && o.position.z % CHUNK === 0) {
              poses.add(`${o.position.x / CHUNK},${o.position.z / CHUNK}`);
            }
          });
          const pcx = Math.floor(g.player.pos.x / CHUNK), pcz = Math.floor(g.player.pos.z / CHUNK);
          const vx = -Math.sin(g.player.yaw), vz = -Math.cos(g.player.yaw);
          let trou = R;
          for (let dz = -R; dz <= R; dz++) {
            for (let dx = -R; dx <= R; dx++) {
              const len = Math.hypot(dx, dz);
              if (len > R || len < 0.5) continue;
              if ((dx / len) * vx + (dz / len) * vz < 0.3) continue;   // pas devant
              if (!poses.has(`${pcx + dx},${pcz + dz}`)) trou = Math.min(trou, len);
            }
          }
          releves.push(Math.round(trou * CHUNK));
        }
        releves.sort((x, y) => x - y);
        out[key] = { vitesse: def.pilote.max, trou: releves[3], releves };
        g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
        g.player.vitesseAvion = undefined; g.player.flying = false;
      }
      return out;
    });
      const r = ['avionligne', 'concorde', 'chasseur'].map((k) => suivi[k] ? `${k} ${suivi[k].trou}/${Math.round(suivi[k].vitesse / 2)} [${suivi[k].releves}]` : k + ' ?');
      console.log(`voisine ${gele === 'oui' ? 'gelée ' : 'en jeu'} : ${r.join(' · ')} (${Math.round((Date.now() - t0) / 1000)} s)`);
      await ciel.close();
    }
    await cdp.send('Page.setWebLifecycleState', { state: 'active' });
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
