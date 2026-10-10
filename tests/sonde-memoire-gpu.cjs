// CE QUE COÛTE L'ESTIMATION DE LA MÉMOIRE GRAPHIQUE (v412) — à Paris, rr 12,
// la scène la plus lourde du banc. Dix parcours, médiane et pire, et ce
// qu'elle rend. Usage : node sonde-memoire-gpu.cjs
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8418, portPairs: 9418 });
  await banc.ouvrir();
  try {
    const p = await banc.jouerSeul('Memoire', { rr: 12 });
    const r = await p.evaluate(async () => {
      const g = window.__game;
      const { positionDe } = await import('./src/mondes.js');
      const P = positionDe('paris');
      g.player.pos.set(P.x, 60, P.z);
      await new Promise((f) => setTimeout(f, 20000));
      const ms = [];
      let e = null;
      for (let i = 0; i < 10; i++) { e = g.memoireGPU(true); ms.push(e.ms); }
      ms.sort((a, b) => a - b);
      let objets = 0; g.scene.traverse(() => objets++);
      return { mediane: ms[5], pire: ms[9], e, objets, morceaux: g.chunkMeshes.size, tex: g.renderer.info.memory.textures, geo: g.renderer.info.memory.geometries };
    });
    console.log(JSON.stringify(r));
  } catch (e) { console.log('ÉCHEC', e.message); }
  await banc.fermer();
  process.exit(0);
})();
