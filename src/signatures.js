// Les SIGNATURES DE PROGRAMME des modèles déposés (v246).
//
// Une carte graphique compile un programme par signature — et une signature
// n'est PAS un matériau : c'est le matériau (cartes, verre, double face,
// vernis…) CROISÉ avec la géométrie qui le porte (couleurs de sommets,
// absence de normales → ombrage plat, tangentes, second jeu d'UV) et avec le
// maillage (squelette). Mon premier relevé ne regardait que les matériaux et
// trouvait onze signatures pour la flotte ; il y en a quatorze — et cinq pour
// les humains — parce que la
// plupart des carrosseries arrivent SANS normales et que le chargeur GLTF les
// passe alors en ombrage plat — un programme à part. Compter un motif n'est
// pas compter la chose.
//
// Ce module n'a AUCUN import : le banc le charge sous node, lit les fichiers
// `.glb` du dépôt et vérifie que `SIGNATURES_GLB` est exactement ce que les
// fichiers contiennent. Le jour où Max dépose un modèle d'une autre facture,
// le témoin rougit et nomme la signature manquante — sinon elle se
// compilerait dans l'image où la voiture apparaît, c'est-à-dire à l'arrivée
// en ville, qui est précisément le gel signalé.

// Les signatures des cinquante-deux voitures et des neuf corps humains,
// telles que `signaturesDuGlb` les lit. `vehicules.js` compile chacune
// pendant l'accueil (`chaufferLesProgrammes`).
export const SIGNATURES_GLB = [
  'Physical+cc+DS+env',
  'Physical+cc+DS',
  'Physical+cc+alpha+DS',
  'Physical+cc+env',
  'Physical+cc+flat+env',
  'Physical+cc',
  'Physical+flat',
  'Physical+map+nrm+cc+flat',
  'Standard+DS',
  'Standard+alpha+DS',
  'Standard+flat',
  'Standard+map+atest+DS+skin',
  'Standard+map+atest+DS+vc+skin',
  'Standard+map+nrm+atest+DS+vc+skin',
  'Standard+map+nrm+flat',
  'Standard+map+nrm+skin',
  'Standard+map+nrm+vc+skin',
  'Standard+nrm+flat',
  'Standard',
];

// ET CE QUE LE JEU FABRIQUE LUI-MÊME, mesuré à l'arrivée à Paris une fois les
// fichiers chauffés : un seul programme restait, le Lambert uni du chien des
// passants (`construireChien`, passants.js). Les bêtes de `creatures.js` le
// partageaient, et c'est pour cela que leur retrait (v285) ne change rien ici :
// la signature ne tient pas à elles, elle tient au chien. Les autres matériaux
// du jeu (blocs, personnages sculptés, vitres) sont déjà rendus au point
// d'apparition.
export const SIGNATURES_JEU = ['Lambert'];

// La laque reçoit la sonde des reflets (`refleter`, vehicules.js) : c'est la
// seule chose qui distingue une signature de fichier d'une signature rendue,
// et la règle est la même ici et là-bas.
export const EST_PEINTURE = /paint|bodywork|\bbody\b/i;

// Le JSON d'un fichier .glb, depuis ses octets (node ou navigateur).
export function jsonDuGlb(octets) {
  const v = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  if (v.getUint32(0, true) !== 0x46546c67) throw new Error('pas un fichier glb');
  const longueur = v.getUint32(12, true);
  if (v.getUint32(16, true) !== 0x4e4f534a) throw new Error('le premier morceau du glb n\'est pas le JSON');
  const texte = new TextDecoder().decode(octets.subarray(20, 20 + longueur));
  return JSON.parse(texte);
}

// Les signatures d'un glb, dans l'ordre où les drapeaux s'écrivent :
// type, cartes, vernis, verre, faces, sommets, ombrage, squelette, reflets.
// `env` dit si les matériaux de peinture reçoivent la sonde des reflets
// (vrai pour la flotte, faux pour les humains).
export function signaturesDuGlb(j, { env = false } = {}) {
  const out = new Set();
  const avecSquelette = new Set((j.nodes || [])
    .filter((n) => n.skin !== undefined && n.mesh !== undefined).map((n) => n.mesh));
  const PHYSIQUE = ['KHR_materials_clearcoat', 'KHR_materials_transmission', 'KHR_materials_ior',
    'KHR_materials_specular', 'KHR_materials_sheen', 'KHR_materials_iridescence',
    'KHR_materials_anisotropy', 'KHR_materials_volume', 'KHR_materials_emissive_strength'];
  (j.meshes || []).forEach((mesh, mi) => {
    for (const p of mesh.primitives || []) {
      if (p.mode !== undefined && p.mode !== 4) continue;    // ni points ni lignes
      const m = p.material !== undefined ? (j.materials || [])[p.material] || {} : {};
      const ext = m.extensions || {};
      const pbr = m.pbrMetallicRoughness || {};
      const f = [];
      if (ext.KHR_materials_unlit) f.push('Basic');
      else f.push(PHYSIQUE.some((k) => ext[k]) ? 'Physical' : 'Standard');
      if (pbr.baseColorTexture) f.push('map');
      if (pbr.metallicRoughnessTexture) f.push('mr');
      if (m.normalTexture) f.push('nrm');
      if (m.occlusionTexture) f.push('ao');
      if (m.emissiveTexture) f.push('emap');
      const cc = ext.KHR_materials_clearcoat;
      if (cc && (cc.clearcoatFactor === undefined || cc.clearcoatFactor > 0)) {
        f.push('cc');
        if (cc.clearcoatTexture) f.push('ccmap');
        if (cc.clearcoatRoughnessTexture) f.push('ccrough');
        if (cc.clearcoatNormalTexture) f.push('ccnrm');
      }
      const tr = ext.KHR_materials_transmission;
      if (tr && tr.transmissionFactor > 0) f.push('trans');
      if (ext.KHR_materials_sheen) f.push('sheen');
      const sp = ext.KHR_materials_specular;
      if (sp && (sp.specularTexture || sp.specularColorTexture)) f.push('specmap');
      if (m.alphaMode === 'MASK') f.push('atest');
      if (m.alphaMode === 'BLEND') f.push('alpha');
      if (m.doubleSided) f.push('DS');
      const a = p.attributes || {};
      if (a.COLOR_0 !== undefined) {
        f.push('vc');
        if (((j.accessors || [])[a.COLOR_0] || {}).type === 'VEC4') f.push('vc4');
      }
      if (a.NORMAL === undefined) f.push('flat');
      if (a.TANGENT !== undefined && m.normalTexture) f.push('tan');
      if (a.TEXCOORD_1 !== undefined) f.push('uv1');
      if (p.targets && p.targets.length) f.push('morph');
      if (avecSquelette.has(mi)) f.push('skin');
      if (env && EST_PEINTURE.test(m.name || '')) f.push('env');
      out.add(f.join('+'));
    }
  });
  return out;
}
