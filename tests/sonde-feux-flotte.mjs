// LES LUMIÈRES POSÉES SUR TOUTE LA FLOTTE, SOUS NODE (v550). Pour chaque
// modèle de `FLOTTE` (GLB et voitures fabriquées) : les phares
// (`posesPhares`), les feux de détresse (`posesDetresse`) et les feux stop
// (`feuxArriere`), chacun jugé par un rayon le long de sa normale (la
// lumière doit être SUR la tôle, v519) et par sa place dans la boîte (un
// phare à l'avant, sous la ceinture de caisse). Lancement :
//   node --import ./tests/three-node.mjs tests/sonde-feux-flotte.mjs
// ou depuis un témoin qui a déjà branché « three » (degats.js).
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

// node n'a ni document ni image : une toile muette pour l'enseigne du taxi,
// une texture vide pour les images des GLB (on mesure de la géométrie)
function sansNavigateur() {
  if (typeof globalThis.document !== 'undefined') return;
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'measureText' ? () => ({ width: 1 }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } });
  globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => ctx, style: {} }) };
  const vides = (parser) => ({ name: 'NODE_SANS_IMAGE', loadTexture: () => Promise.resolve(new THREE.Texture()) });
  GLTFLoader.prototype.loadAsync = function (url) {
    const fichier = new URL('../' + url.replace(/^\.\//, ''), import.meta.url);
    const o = readFileSync(fichier);
    return new GLTFLoader().register(vides).parseAsync(o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength), '');
  };
}

const rc = new THREE.Raycaster(); rc.layers.enableAll();
// l'écart d'une lumière à la tôle, le long de sa normale : > 0 devant, null si rien derrière
function ecart(corps, p, n) {
  rc.set(new THREE.Vector3(p.x, p.y, p.z).addScaledVector(n, 1), n.clone().negate()); rc.far = 3;
  const h = rc.intersectObjects(corps, false)[0];
  return h ? +(1 - h.distance).toFixed(3) : null;
}

// UNE VOITURE ABÎMÉE NE FAIT PAS LA RÈGLE DU MODÈLE (v550). Une Bolide en
// pleine animation d'échelle (la bête qui disparaît, `animals.js`), privée de
// ses feux avant (une pièce détachée quitte la voiture, `detacher`), mesurée la
// PREMIÈRE, puis une Bolide neuve : ses feux doivent être sur SA tôle. Aucune
// géométrie n'y est froissée, donc la règle de la v543 (une tôle intacte) la
// croit saine — sur l'ancien code, ses poses se gardaient pour tout le modèle.
// La Bolide est partie en v573 : la DB11 la remplace, ses feux avant se
// reconnaissent à leur matériau (« Day_Lights », « Low_Beams »), ses nœuds
// étant anonymes.
export async function empoisonner(fichier = 'aston-martin-db11.glb') {
  sansNavigateur();
  const V = await import('../src/vehicules.js');
  const P = await import('../src/phares.js');
  const f = V.FLOTTE.find((e) => e.fichier === fichier);
  const proto = await V.chargerVoitureFlotte(f);
  const neuve = () => { const m = new THREE.Group(), mo = proto.clone(true); m.add(mo); const r = []; mo.traverse((o) => { if (/^Wheel_/i.test(o.name || '')) r.push(o); }); m.userData.flotte = f.fichier; m.userData.roues = r; m.updateMatrixWorld(true); return m; };
  const a = neuve(); a.scale.set(1.2, 0.8, 1.2);
  const scene = new THREE.Scene(), ote = [];
  const avant = (o) => /front|day_light|low_beam/i.test(o.name || '') || [].concat(o.material || []).some((m) => /front|day_light|low_beam/i.test(m.name || ''));
  a.traverse((o) => { if (o.isMesh && avant(o)) ote.push(o); });
  for (const o of ote) scene.attach(o);
  V.posesDetresse(a); P.posesPhares(a);
  const r = (await mesurerFlotte({ modeles: [fichier] }))[0];
  return { ...r, otees: ote.length };
}

// La part des triangles d'une lueur posés sur la tôle : depuis le centre du
// triangle, un rayon le long de sa normale (dans un sens ou dans l'autre)
// retrouve la carrosserie à moins de trois centièmes. Et aucun sommet hors du
// nez : le premier quart de la longueur, sous les sept dixièmes de la hauteur.
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _t = new THREE.Vector3();
function lueursSurTole(corps, lueurs, b) {
  const L = b.max.z - b.min.z, h = b.max.y - b.min.y;
  let triangles = 0, sur = 0, essais = 0, horsNez = 0;
  for (const l of lueurs) {
    const pos = l.geometry.attributes.position, nt = pos.count / 3;
    triangles += nt;
    for (let i = 0; i < pos.count; i++) {
      _a.fromBufferAttribute(pos, i).add(l.position);
      if (_a.z > b.min.z + L / 4 || _a.y > b.min.y + 0.7 * h || Math.abs(_a.x) > Math.max(-b.min.x, b.max.x) + 0.02) horsNez++;
    }
    const pas = Math.max(1, Math.floor(nt / 40));
    for (let i = 0; i < nt; i += pas) {
      _a.fromBufferAttribute(pos, 3 * i).add(l.position); _b.fromBufferAttribute(pos, 3 * i + 1).add(l.position); _c.fromBufferAttribute(pos, 3 * i + 2).add(l.position);
      _n.subVectors(_b, _a).cross(_t.subVectors(_c, _a)); if (_n.lengthSq() < 1e-14) continue; _n.normalize();
      const centre = _a.clone().add(_b).add(_c).divideScalar(3);
      essais++;
      for (const sg of [1, -1]) {
        const d = _n.clone().multiplyScalar(sg);
        rc.set(centre.clone().addScaledVector(d, 0.3), d.clone().negate()); rc.far = 0.6;
        const hit = rc.intersectObjects(corps, false).find((x) => Math.abs(x.distance - 0.3) < 0.03);
        if (hit) { sur++; break; }
      }
    }
  }
  return { triangles, part: essais ? +(sur / essais).toFixed(2) : 1, horsNez };
}

export async function mesurerFlotte({ modeles = null } = {}) {
  sansNavigateur();
  const V = await import('../src/vehicules.js');
  const P = await import('../src/phares.js');
  const res = [];
  for (const f of V.FLOTTE) {
    if (modeles && !modeles.includes(f.fichier)) continue;
    const proto = await V.chargerVoitureFlotte(f);
    if (!proto) { res.push({ f: f.fichier, err: 'absent' }); continue; }
    const m = new THREE.Group(), modele = proto.clone(true); m.add(modele);
    const roues = []; modele.traverse((o) => { if (/^Wheel_/i.test(o.name || '')) roues.push(o); });
    m.userData.flotte = f.fichier; m.userData.roues = roues; m.updateMatrixWorld(true);
    const corps = []; m.traverse((o) => { if (o.isMesh) corps.push(o); });
    const b = new THREE.Box3(); for (const o of corps) b.union(new THREE.Box3().setFromObject(o));
    const h = b.max.y - b.min.y, L = b.max.z - b.min.z;
    const det = V.posesDetresse(m);
    const ecDet = det.map((p) => ecart(corps, p, new THREE.Vector3(p.nx, p.ny, p.nz)));
    const ph = P.posesPhares(m);
    // un phare est à l'avant (le premier sixième de la longueur) et sous la
    // ceinture de caisse (60 % de la hauteur)
    const phOk = ph.length === 2 && ph.every((p) => p.z < b.min.z + L / 6 && p.y < b.min.y + 0.6 * h);
    const g = V.feuxArriere(m, { frein: true });
    const ecStop = (g ? g.userData.stops : []).map((s) => ecart(corps, s.position, new THREE.Vector3(0, 0, 1).applyQuaternion(s.quaternion)));
    const surTole = (e) => e !== null && e > -0.05 && e < 0.06;
    // LA LUEUR ÉPOUSE L'OPTIQUE (v569) : allumée de nuit, chaque lueur est une
    // copie des triangles de l'optique du modèle, à fleur de SA tôle et au nez
    // — jamais un disque plaqué par-dessus (deux ronds de 0,17 bloc avant).
    const gp = P.allumerPhares(m, 1);
    const lueurs = gp ? gp.children.filter((o) => o.isMesh && !(gp.userData.pinceaux || []).includes(o)) : [];
    const disques = lueurs.filter((o) => o.geometry.type === 'CircleGeometry' || o.geometry.type === 'SphereGeometry').length;
    const lu = lueursSurTole(corps, lueurs, b);
    P.eteindrePhares(m);
    res.push({
      lueurs: lueurs.length, disques, triangles: lu.triangles, surToleLueur: lu.part, horsNez: lu.horsNez, rang: gp ? gp.userData.rang : null,
      lueurOk: disques === 0 && lu.horsNez === 0 && (lueurs.length === 0 || lu.part >= 0.9),
      f: f.fichier, boite: [b.min.z, b.max.z, b.min.y, b.max.y].map((v) => +v.toFixed(2)),
      phares: ph.map((p) => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]), phOk,
      // et chaque feu à son coin : les deux avant dans le premier sixième, les
      // deux arrière dans le dernier, sous les deux tiers de la hauteur (la
      // barre lumineuse du Lucid Gravity, un SUV, est à 0,61 h)
      ecDet, detOk: det.length === 4 && ecDet.every(surTole)
        && det.every((p, i) => (i < 2 ? p.z < b.min.z + L / 6 : p.z > b.max.z - L / 6) && p.y < b.min.y + 0.66 * h),
      ecStop, stopOk: ecStop.length === 2 && ecStop.every(surTole),
    });
  }
  return res;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await mesurerFlotte();
  for (const x of r) console.log(`${x.phOk && x.detOk && x.stopOk && x.lueurOk ? 'ok ' : 'KO '} ${x.f} ${x.err || ''} lueurs ${x.lueurs} rang ${x.rang} tri ${x.triangles} tôle ${x.surToleLueur} horsNez ${x.horsNez} disques ${x.disques} phares ${JSON.stringify(x.phares)} ${x.phOk ? '' : '!'} det ${JSON.stringify(x.ecDet)} stop ${JSON.stringify(x.ecStop)} boite ${JSON.stringify(x.boite)}`);
  console.log('KO :', r.filter((x) => !(x.phOk && x.detOk && x.stopOk && x.lueurOk)).length, '/', r.length);
}
