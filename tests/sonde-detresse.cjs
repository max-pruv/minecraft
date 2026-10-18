// LES FEUX DE DÉTRESSE, MODÈLE PAR MODÈLE (v507). Pour chaque modèle de la
// flotte : la boîte de la carrosserie, où les feux de détresse se posent, et
// combien ne sont pas SUR la tôle (un rayon le long de leur normale) ; et les maillages ou matériaux qui portent un feu.
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8418, portPairs: 9418 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('SondeDetresse');
    const out = await tab.evaluate(async () => {
      const THREE = await import('three');
      const V = await import('./src/vehicules.js');
      const res = [];
      for (const f of V.FLOTTE) {
        const proto = await V.chargerVoitureFlotte(f);
        if (!proto) { res.push({ f: f.fichier, proto: null }); continue; }
        const g = new THREE.Group(), modele = proto.clone(true); g.add(modele);
        const roues = []; modele.traverse((o) => { if (/^Wheel_/i.test(o.name || '')) roues.push(o); });
        g.userData.flotte = f.fichier; g.userData.roues = roues; g.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(g);
        const corps = []; g.traverse((o) => { if (o.isMesh) corps.push(o); });
        // la v372 : quatre sphères de 0,16 à cotes fixes ; la v505 : les poses mesurées
        const feux = V.posesDetresse ? V.posesDetresse(g).map((p) => ({ ...p, r: 0 }))
          : [[-0.85, 0.85, -2.1], [0.85, 0.85, -2.1], [-0.85, 0.85, 2.1], [0.85, 0.85, 2.1]].map(([x, y, z]) => ({ x, y, z, nx: 0, ny: 0, nz: Math.sign(z), r: 0.16 }));
        const rc = new THREE.Raycaster(); rc.layers.enableAll();
        let dehors = 0, vide = 0, pire = 0; const ecarts = [];
        for (const p of feux) {
          const n = new THREE.Vector3(p.nx, p.ny, p.nz);
          rc.set(new THREE.Vector3(p.x, p.y, p.z).addScaledVector(n, 1), n.clone().negate()); rc.far = 3;
          const h = rc.intersectObjects(corps, false)[0];
          // > 0 : la lumière est DEVANT la tôle (elle flotte) ; null : rien derrière, dans le vide
          const e = h ? +(1 - h.distance - p.r).toFixed(3) : null;
          ecarts.push(e);
          if (e === null) vide++; else if (e > 0.06 || e < -0.05) dehors++;
          if (e !== null) pire = Math.max(pire, Math.abs(e));
        }
        const noms = new Set();
        g.traverse((o) => { if (!o.isMesh) return; const s = (o.name || '') + '|' + ((o.material && o.material.name) || ''); if (/light|lamp|feu|indic|blink|turn|tail|head|signal|brake|led|orange|amber/i.test(s)) noms.add(s); });
        res.push({ f: f.fichier, boite: [b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z].map((v) => +v.toFixed(2)), ecarts, vide, dehors, feux: [...noms].slice(0, 3) });
      }
      return res;
    });
    let n = 0, d = 0, v = 0, l = 0;
    for (const r of out) { console.log(JSON.stringify(r)); n++; if (r.dehors || r.vide) d++; v += r.vide || 0; l += (r.ecarts || []).length; }
    console.log(`modèles ${n}, avec un feu hors de la tôle : ${d} ; feux dans le vide ${v} sur ${l}`);
    console.log('erreurs', JSON.stringify(tab.erreurs.slice(0, 5)));
  } finally { await banc.fermer(); process.exit(0); }
})();
