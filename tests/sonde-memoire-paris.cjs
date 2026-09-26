// CE QUE PARIS COÛTE EN MÉMOIRE, PALIER PAR PALIER (v296).
//
// Max : un iPad d'environ six ans se connecte, ne lague pas trop, et PLANTE
// après une vingtaine de secondes de jeu à Paris. Safari tue une page qui
// dépasse la mémoire qu'il lui accorde, sans un mot ; le banc, lui, a de la
// mémoire à revendre et ne peut pas subir cette panne. On mesure donc la
// CAUSE et non l'effet (v236) : les OCTETS que le jeu tient une fois le disque
// de morceaux rempli — tampons de géométrie envoyés à la carte graphique,
// blocs des morceaux engendrés, textures — au réglage que reçoit un appareil
// jamais classé (rr 12 · hd 3, « moyen ») et au palier bas (rr 8 · hd 0).
// Ordre alterné (v268), deux relevés par bras.
//
//   node tests/sonde-memoire-paris.cjs
const { Banc, souffler } = require('./banc.js');

const BRAS = [
  { nom: 'moyen', rr: 12, hd: 3 },
  { nom: 'bas', rr: 8, hd: 0 },
  { nom: 'bas', rr: 8, hd: 0 },
  { nom: 'moyen', rr: 12, hd: 3 },
];

(async () => {
  const banc = new Banc({ portJeu: 8399, portPairs: 9399 });
  await banc.ouvrir();
  try {
    for (const b of BRAS) {
      await souffler();
      const page = await banc.jouerSeul('Memoire', { rr: b.rr, dpr: 1, viewport: { width: 1024, height: 768 }, params: `&hd=${b.hd}` });
      const r = await page.evaluate(async () => {
        const g = window.__game;
        const { adresseParis } = await import('./src/paris.js');
        const [x, z] = adresseParis(-0.8, -0.9);
        const y = g.world.terrainHeight(x, z);
        g.player.flying = false;
        g.player.pos.set(x + 0.5, y + 2, z + 0.5);
        g.player.vel.set(0, 0, 0);
        const dodo = (ms) => new Promise((res) => setTimeout(res, ms));
        // On attend que le disque soit REMPLI : le nombre de morceaux maillés
        // ne bouge plus pendant six secondes, borné à trois minutes.
        const t0 = performance.now();
        let n0 = -1, stable = 0;
        while (performance.now() - t0 < 180000) {
          await dodo(2000);
          const n = g.chunkMeshes.size;
          if (n === n0) { if (++stable >= 3) break; } else { stable = 0; n0 = n; }
        }
        // Les octets des tampons de TOUTE la scène, par famille de tampon.
        const parNom = {};
        let total = 0;
        g.scene.traverse((o) => {
          const geo = o.geometry;
          if (!geo || !geo.attributes) return;
          if (geo.userData.__compte) return; geo.userData.__compte = true;
          let octets = 0;
          for (const a of Object.values(geo.attributes)) octets += a.array ? a.array.byteLength : 0;
          if (geo.index && geo.index.array) octets += geo.index.array.byteLength;
          const nom = o.name || (o.userData && o.userData.tampon) || o.type;
          parNom[nom] = (parNom[nom] || 0) + octets;
          total += octets;
        });
        g.scene.traverse((o) => { if (o.geometry && o.geometry.userData) delete o.geometry.userData.__compte; });
        // Les blocs des morceaux engendrés, tenus par le monde.
        let blocs = 0, morceauxMonde = 0;
        for (const c of g.world.chunks.values()) { morceauxMonde++; blocs += c.data ? c.data.byteLength : 0; }
        const mem = performance.memory ? { tas: performance.memory.usedJSHeapSize, limite: performance.memory.jsHeapSizeLimit } : null;
        const info = g.renderer.info;
        const gros = Object.entries(parNom).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}:${(v / 1048576).toFixed(1)}`);
        return {
          secondes: Math.round((performance.now() - t0) / 1000), morceauxMailles: g.chunkMeshes.size, morceauxMonde,
          tamponsMo: +(total / 1048576).toFixed(1), blocsMo: +(blocs / 1048576).toFixed(1),
          tasMo: mem ? +(mem.tas / 1048576).toFixed(0) : null,
          geometries: info.memory.geometries, textures: info.memory.textures, appels: info.render.calls, gros,
        };
      });
      console.log(`${b.nom.padEnd(6)} rr ${b.rr} hd ${b.hd} →`, JSON.stringify(r));
      await page.close();
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
