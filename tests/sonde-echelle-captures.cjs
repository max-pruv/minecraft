// CE QUE L'ENFANT VOIT À PARIS, MESURÉ DANS LA SCÈNE RENDUE (chantier échelle).
// Comme les captures de Max : à pied, à la première personne, format portrait de
// l'iPhone, une rue de Paris avec une terrasse de café. La sonde mesure dans la
// page ce que le voxel ne dit pas : la hauteur des passants (adultes, enfants)
// et des voitures telles qu'elles sont dessinées, l'œil du joueur, le réverbère,
// et le premier rang de la façade — le bloc au ras du trottoir.
//   node tests/sonde-echelle-captures.cjs <dossier> [tag] [--vues=iphone,ipad] [--sans-nuit]
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'avant';
const opt = (n) => { const a = process.argv.find((s) => s.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : null; };
const vues = (opt('vues') || 'iphone,ipad').split(',');
const sansNuit = process.argv.includes('--sans-nuit');
const FORMATS = { iphone: { width: 430, height: 932 }, ipad: { width: 820, height: 1180 } };

// La terrasse de Saint-Germain relevée par la v433 : la caméra est sur le
// trottoir d'en face, à hauteur d'œil, de biais le long de la rue.
const VUES = [
  { nom: 'terrasse', x: -440, z: 427, yaw: -Math.PI / 2 + 0.45, pitch: 0.06 },
  { nom: 'terrasse-face', x: -437, z: 425, yaw: -Math.PI / 2 + 0.6, pitch: 0.2 },
  { nom: 'terrasse-nuit', x: -440, z: 427, yaw: -Math.PI / 2 + 0.45, pitch: 0.06, heure: 0.75 },
  { nom: 'aerien', x: -440, z: 427, yaw: -Math.PI / 2 + 0.45, pitch: -0.75, h: 40 },
];

(async () => {
  const banc = new Banc({ portJeu: 8399, portPairs: 9399 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Mesure', { rr: 7, viewport: FORMATS.iphone, dpr: 1, params: '&ombres=1&hd=4&arbres=1' });
    const mesures = await page.evaluate(async (v) => {
      const g = window.__game;
      const THREE = await import('three');
      const { ARCHI, BLOCK, CITY_BLOCK } = await import('./src/blocks.js');
      const { solParis, lotParisLibre } = await import('./src/paris.js');
      const y = g.world.terrainHeight(v.x, v.z);
      g.player.flying = true;
      g.player.pos.set(v.x + 0.5, y + 1 + 0.01, v.z + 0.5);
      g.player.vel.set(0, 0, 0);
      g.player.yaw = v.yaw; g.player.pitch = v.pitch;
      window.__setDayTime(0.42);
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const t0 = performance.now();
      let n0 = -1;
      while (performance.now() - t0 < 40000) { await dodo(1000); const n = g.chunkMeshes.size; if (n === n0) break; n0 = n; }
      await dodo(3000);
      // 1. l'œil du joueur au-dessus du trottoir
      const oeil = g.player.eyePosition().y - (y + 1);
      // 2. les passants dessinés : la boîte monde de chaque corps réaliste
      const gens = [];
      g.scene.traverse((o) => {
        if (o.userData && o.userData.anatomie && o.visible) {
          o.updateMatrixWorld(true);
          const b = new THREE.Box3().setFromObject(o);
          if (isFinite(b.min.y)) gens.push({ enfant: !!o.userData.enfant, h: +(b.max.y - b.min.y).toFixed(2), declare: o.userData.hauteur });
        }
      });
      // 3. les voitures de la rue : la boîte des maillages de FLOTTE
      const voitures = [];
      const V = window.__vehicules;
      const etat = V && V.etat ? V.etat() : null;
      if (etat) for (const c of etat) for (const p of (c.places || [])) if (p && p.visible) voitures.push(p.modele || '?');
      let boiteVoiture = null;
      g.scene.traverse((o) => {
        if (boiteVoiture) return;
        if (o.userData && (o.userData.protoDe || o.userData.fichier) && o.visible) {
          const b = new THREE.Box3().setFromObject(o);
          if (isFinite(b.min.y) && b.max.y - b.min.y > 0.8 && b.max.y - b.min.y < 3) boiteVoiture = { fichier: o.userData.fichier || o.userData.protoDe, h: +(b.max.y - b.min.y).toFixed(2), l: +Math.max(b.max.x - b.min.x, b.max.z - b.min.z).toFixed(2), w: +Math.min(b.max.x - b.min.x, b.max.z - b.min.z).toFixed(2) };
        }
      });
      // 4. le premier rang de la façade la plus proche : le bloc au ras du trottoir
      let facade = null;
      cherche: for (let r = 1; r < 10; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        const X = v.x + dx, Z = v.z + dz;
        if (solParis(X, Z) === null && lotParisLibre(X, Z)) {
          const h = g.world.terrainHeight(X, Z);
          const col = [];
          for (let dy = 0; dy < 24; dy++) col.push(g.world.getBlock(X, h + dy, Z));
          const nom = (id) => { for (const k in ARCHI) if (ARCHI[k] === id) return k; for (const k in BLOCK) if (BLOCK[k] === id) return k; for (const k in CITY_BLOCK) if (CITY_BLOCK[k] === id) return 'CITY.' + k; return String(id); };
          facade = { x: X, z: Z, h, trottoirVoisin: nom(g.world.getBlock(v.x, g.world.terrainHeight(v.x, v.z), v.z)), colonne: col.map(nom), hTrottoir: g.world.terrainHeight(v.x, v.z) };
          break cherche;
        }
      }
      // 5. les réverbères (props) et le mobilier HD n'ont pas d'objet à eux : le
      //    réverbère est un clone de props, on lit sa boîte
      let reverbere = null;
      g.scene.traverse((o) => {
        if (reverbere) return;
        if (o.name === 'reverbere' || (o.userData && o.userData.prop === 'reverbere')) {
          const b = new THREE.Box3().setFromObject(o); reverbere = +(b.max.y - b.min.y).toFixed(2);
        }
      });
      const info = g.renderer.info;
      return { oeil: +oeil.toFixed(2), gens, boiteVoiture, voituresEnVue: voitures.length, facade, reverbere, appels: info.render.calls, morceaux: g.chunkMeshes.size, cadence: g.fps || null };
    }, VUES[0]);
    console.log('MESURES', JSON.stringify(mesures));
    for (const fmt of vues) {
      await page.setViewportSize(FORMATS[fmt]);
      for (const v of VUES) {
        if (sansNuit && v.heure !== undefined) continue;
        try {
          await page.evaluate(async (v) => {
            const g = window.__game;
            const y = g.world.terrainHeight(v.x, v.z);
            g.player.flying = true;
            g.player.pos.set(v.x + 0.5, y + 1 + (v.h || 0.01), v.z + 0.5);
            g.player.vel.set(0, 0, 0);
            g.player.yaw = v.yaw; g.player.pitch = v.pitch;
            window.__setDayTime(v.heure !== undefined ? v.heure : 0.42);
            await new Promise((r) => setTimeout(r, v.heure !== undefined ? 4000 : 2500));
          }, v);
          const f = path.join(dossier, `${tag}-${fmt}-${v.nom}.png`);
          await page.screenshot({ path: f, timeout: 120000 });
          console.log(fmt, v.nom, '→', f);
        } catch (e) { console.log(fmt, v.nom, 'ÉCHEC :', String(e && e.message || e).split('\n')[0]); }
      }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
