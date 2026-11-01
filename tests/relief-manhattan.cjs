// Mesure optique dans les maillages effectivement affichés. Un mur photographié
// peut sembler creux de face ; des rayons distincts révèlent son absence de relief.
module.exports = async function sonderReliefManhattan() {
  const THREE = await import('three');
  const { BATIMENTS, SOL } = await import('/src/manhattan-plan.js');
  const v = __game.villeRealiste;
  const mesures = [];
  let photos = 0, immeubles = 0;
  const matrix = new THREE.Matrix4(), centre = new THREE.Vector3(), taille = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const rayon = new THREE.Raycaster();
  for (const [id, groupe] of v.buildings) {
    if (!BATIMENTS[id]?.osm) continue;
    immeubles++;
    groupe.updateWorldMatrix(true, true);
    groupe.traverse(o => {
      if (o.material && Object.entries(v.mats).some(([nom, m]) => nom.startsWith('far') && m === o.material)) photos++;
    });
    const vitres = [];
    groupe.traverse(o => { if (o.isInstancedMesh && o.material === v.mats.windowGlass) vitres.push(o); });
    for (const mesh of vitres) {
      if (!mesh.material.transparent || mesh.material.opacity >= .8) continue;
      for (let i = 0; i < mesh.count && mesures.length < 6; i++) {
        mesh.getMatrixAt(i, matrix);
        matrix.decompose(centre, rotation, taille);
        if (centre.y < SOL + 5 || centre.y > SOL + 11) continue;
        const axe = taille.x < taille.z ? 'x' : 'z';
        const tangente = new THREE.Vector3(axe === 'z' ? 1 : 0, 0, axe === 'x' ? 1 : 0);
        const point = mesh.localToWorld(centre.clone()).addScaledVector(tangente, .12);
        point.y += .15; // éviter la traverse du châssis et le rideau latéral
        for (const signe of [-1, 1]) {
          const normale = new THREE.Vector3(axe === 'x' ? signe : 0, 0, axe === 'z' ? signe : 0);
          const origine = point.clone().addScaledVector(normale, 2);
          rayon.set(origine, normale.clone().negate());
          rayon.far = 3;
          const hits = rayon.intersectObject(groupe, true);
          const vitre = hits.find(h => h.object === mesh && h.instanceId === i);
          const fond = hits.find(h => !h.object.material.transparent);
          if (!vitre || !fond || hits[0].object !== mesh || fond.distance <= vitre.distance) continue;
          // Le second rayon frappe le tableau de maçonnerie à côté de la baie.
          rayon.set(origine.clone().addScaledVector(tangente, .36), normale.clone().negate());
          const cadre = rayon.intersectObject(groupe, true).find(h => !h.object.material.transparent);
          if (!cadre) continue;
          mesures.push({ profondeur: +(fond.distance - vitre.distance).toFixed(3),
            relief: +(fond.distance - cadre.distance).toFixed(3) });
          break;
        }
      }
    }
  }
  return { immeubles, photos, baies: mesures.length,
    profondeurMin: mesures.length ? Math.min(...mesures.map(m => m.profondeur)) : 0,
    reliefMin: mesures.length ? Math.min(...mesures.map(m => m.relief)) : 0 };
};
