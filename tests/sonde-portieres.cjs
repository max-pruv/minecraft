// LA DÉCOUPE DES PORTIÈRES, MODÈLE PAR MODÈLE (v362). Pour chacun des modèles
// de la flotte : le plan (charnière, longueur, surface emportée, part de
// triangles à cheval sur un bord), le coût, et CE QUE LE TROU LAISSE VOIR —
// des rayons tirés de dehors au travers de l'ouverture, portière ouverte :
// touchent-ils l'habitacle (sièges, planche, autre flanc), ou traversent-ils
// la voiture sans rien rencontrer (le vide) ?
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8417, portPairs: 9417 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('SondePortes');
    const out = await tab.evaluate(async () => {
      const THREE = await import('three');
      const { MODELES_MONTURE } = await import('./src/montures.js');
      const V = await import('./src/vehicules.js');
      const P = await import('./src/portieres.js');
      const res = [];
      for (const f of V.FLOTTE) {
        const g = MODELES_MONTURE.voiture({ flotte: f.fichier });
        const proto = await V.chargerVoitureFlotte(f);
        await new Promise((r) => setTimeout(r, 0));
        g.updateMatrixWorld(true);
        const plan = P.planPortieres(g);
        if (!plan) { res.push({ f: f.fichier, plan: null, roues: (g.userData.roues || []).length }); continue; }
        const eq = P.equiperPortieres(g);
        P.ouvrir(eq['-1'], 1); P.ouvrir(eq['1'], 1);
        g.updateMatrixWorld(true);
        // le trou : rayons de dehors vers l'axe, au travers de l'ouverture
        const rc = new THREE.Raycaster();
        const cibles = []; g.traverse((o) => { if (o.isMesh && !(o.parent && o.parent.userData.estPortiere)) cibles.push(o); });
        let habitacle = 0, vide = 0;
        for (let k = 0; k < 6; k++) for (let j = 0; j < 4; j++) {
          const z = plan.z0 + (plan.z1 - plan.z0) * (k + 0.5) / 6;
          const y = 0.55 + j * 0.13;
          rc.set(new THREE.Vector3(-plan.demiLarg - 1, y, z), new THREE.Vector3(1, 0, 0));
          rc.far = plan.demiLarg * 2 + 0.6;
          const h = rc.intersectObjects(cibles, false);
          if (h.length) habitacle++; else vide++;
        }
        // et la portière, vue de dehors : son arête arrière est-elle sortie ?
        const p = eq['-1'];
        const arriere = new THREE.Vector3(0, 0.8, p.userData.longueur).applyMatrix4(p.matrixWorld);
        res.push({ f: f.fichier, ms: Math.round(plan.ms), tri: plan.triangles,
          aire: [plan.aire['-1'], plan.aire['1']].map((x) => +x.toFixed(2)),
          L: +plan.longueur['-1'].toFixed(2), z: [+plan.z0.toFixed(2), +plan.z1.toFixed(2)], dl: +plan.demiLarg.toFixed(2),
          ambig: +plan.ambigues.toFixed(3), coupes: plan.tranches, neufs: plan.sommetsNeufs, deborde: +Math.max(0, plan.longueur['-1'] - (plan.z1 - plan.z0)).toFixed(3), vu: `${habitacle}/${habitacle + vide}`, arriereX: +arriere.x.toFixed(2) });
      }
      return res;
    });
    for (const r of out) console.log(JSON.stringify(r));
    console.log('erreurs', JSON.stringify(tab.erreurs.slice(0, 5)));
  } finally { await banc.fermer(); process.exit(0); }
})();
