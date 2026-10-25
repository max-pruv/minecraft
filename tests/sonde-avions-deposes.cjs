// SONDE (v554) : les avions déposés (A320, A321, F-35) dans le jeu.
// Pour chaque variante : on la fait naître sur une dalle, on relève ce que le
// jeu a posé (modèle, membres, roues au sol, flammes, feux), puis des captures
// de trois quarts et de côté par une caméra à part (`layers.enableAll`, v250),
// train sorti puis rentré, flammes allumées. Écrit les images dans le dossier
// passé. Isolée : aucune suite ne l'importe.
//
//   node tests/sonde-avions-deposes.cjs <dossier> [jour|nuit]
const { Banc } = require('./banc.js');
const DOSSIER = process.argv[2] || '.';
const HEURE = process.argv[3] === 'nuit' ? 0.75 : 0.3;
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  try {
    const p = await banc.jouerSeul('SondeAvionsDeposes', { rr: 4 });
    const prets = await p.evaluate(async () => {
      const m = await import('/src/avions.js');
      const t0 = performance.now();
      while (m.avionsPrets().length < 3 && performance.now() - t0 < 60000) await new Promise((r) => setTimeout(r, 200));
      return { prets: m.avionsPrets(), ms: Math.round(performance.now() - t0) };
    });
    console.log('prêts', JSON.stringify(prets));
    for (const [espece, variante] of [['avionligne', 'a320'], ['avionligne', 'a321'], ['chasseur', 'f35'], ['concorde', null]]) {
      const r = await p.evaluate(async ({ espece, variante, heure }) => {
        const THREE = await import('three');
        const g = window.__game, am = g.animalManager;
        for (const a of [...am.animals]) { am.scene.remove(a.mesh); am.animals.splice(am.animals.indexOf(a), 1); }
        window.__setDayTime && window.__setDayTime(heure);
        // une dalle de pierre, loin de tout (le couloir de la v237 est en mer)
        const x0 = -1500.5, z0 = -2500.5, y0 = 60;
        for (let x = -14; x <= 14; x++) for (let z = -14; z <= 14; z++) {
          g.world.setBlock(Math.floor(x0) + x, y0, Math.floor(z0) + z, 3);
          for (let y = 1; y < 14; y++) g.world.setBlock(Math.floor(x0) + x, y0 + y, Math.floor(z0) + z, 0);
        }
        g.player.pos.set(x0 + 12, y0 + 1, z0 + 12);
        await new Promise((f) => setTimeout(f, 2500));
        const a = am.invoquer(espece, x0, z0, false, variante ? { variante } : null);
        a.yaw = 0; a.mesh.rotation.y = 0; a.mesh.position.copy(a.pos); a.mesh.updateMatrixWorld(true);
        window.__avion = a;
        const ud = a.mesh.userData;
        const boite = new THREE.Box3().setFromObject(a.mesh);
        let maillages = 0;
        a.mesh.traverse((o) => { if (o.isMesh && o.visible) maillages++; });
        return {
          variante: ud.variante || null, fichier: ud.modeleAvion || null,
          membres: Object.keys(ud.membres || {}), train: (ud.train || []).length,
          tuyeres: (ud.tuyeres || []).length, feux: !!ud.feuxNav, porte: ud.porte && ud.porte.ouvrant,
          posY: +a.pos.y.toFixed(2), basY: +boite.min.y.toFixed(2),
          taille: boite.getSize(new THREE.Vector3()).toArray().map((v) => +v.toFixed(2)), maillages,
        };
      }, { espece, variante, heure: HEURE });
      console.log(espece, variante, JSON.stringify(r));
      const nom = variante || espece;
      for (const [vue, train, gaz] of [['trois-quarts', 1, 0], ['cote', 1, 0], ['vol', 0, 1]]) {
        const png = await p.evaluate(async ({ vue, train, gaz }) => {
          const THREE = await import('three');
          const g = window.__game, a = window.__avion, ud = a.mesh.userData;
          for (const t of ud.train || []) { t.rotation.x = -(Math.PI / 2) * (1 - train); t.visible = train > 0.03; }
          for (const f of ud.tuyeres || []) { f.visible = gaz > 0; f.scale.z = gaz ? 6 * f.userData.rayon : 0.001; }
          if (ud.feuxNav) { ud.feuxNav.rouge.visible = gaz > 0; ud.feuxNav.vert.visible = gaz > 0; ud.feuxNav.eclat.visible = gaz > 0; }
          a.mesh.position.y = a.pos.y + (train ? 0 : 6);
          a.mesh.updateMatrixWorld(true);
          const c = new THREE.Vector3().setFromMatrixPosition(a.mesh.matrixWorld);
          const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 400);
          cam.layers.enableAll();
          const L = new THREE.Box3().setFromObject(a.mesh).getSize(new THREE.Vector3()).length();
          const d = vue === 'cote' ? new THREE.Vector3(1, 0.12, 0) : vue === 'vol' ? new THREE.Vector3(0.8, 0.35, 0.9) : new THREE.Vector3(-0.9, 0.45, -1.0);
          cam.position.copy(c).add(d.normalize().multiplyScalar(L * 0.95));
          cam.lookAt(c.x, c.y + 1, c.z);
          window.__camSonde = cam;
          const r = g.renderer;
          r.render(g.scene, cam);
          return r.domElement.toDataURL('image/png');
        }, { vue, train, gaz });
        require('fs').writeFileSync(`${DOSSIER}/${nom}-${vue}.png`, Buffer.from(png.split(',')[1], 'base64'));
      }
    }
  } catch (e) { console.log('ERREUR', e && e.stack || e); }
  await banc.fermer().catch(() => {}); process.exit(0);
})();
