// LES PORTIÈRES QUI S'OUVRENT, FABRIQUÉES DANS LA CARROSSERIE (v366).
//
// Max : « Quand on monte dans une voiture, on voit le personnage qui avance et
// qui rentre dans la voiture avec le gameplay de la porte qui s'ouvre. »
//
// MESURÉ AVANT D'ÉCRIRE : aucun des cinquante-deux modèles de vendor/voitures
// n'a de nœud de portière. Leurs maillages sont groupés par MATÉRIAU — la
// laque, le vitrage, les chromes — et une portière n'est qu'un morceau de
// chacun d'eux. Elle se fabrique donc : on prend, dans chaque maillage, les
// triangles dont le centre tombe dans le VOLUME de la portière avant (entre le
// passage de la roue avant et le montant central, sur le flanc), et on en fait
// un maillage à part accroché à un pivot sur son arête avant.
//
// TROIS RÈGLES, ET CHACUNE A UN PRIX CONNU.
//
// - LA GÉOMÉTRIE DE LA FLOTTE EST PARTAGÉE (v238) : toutes les voitures d'un
//   même modèle clonent le même prototype. On ne touche JAMAIS à ses tampons.
//   La découpe fabrique des géométries NEUVES qui partagent les ATTRIBUTS du
//   prototype (positions, normales, UV) et ne portent qu'un INDEX à elles :
//   le reste de la caisse, la portière gauche, la portière droite. Mémoïsées
//   par modèle, marquées partagées (`liberer.js` ne les rend pas) : une
//   seconde voiture du même modèle ne coûte que des pivots.
// - UNE SEULE VOITURE CHANGE : celle dans laquelle on monte. On remplace la
//   géométrie de SES maillages par « la caisse sans les portières », et on lui
//   accroche ses deux portières. Un autre exemplaire du même modèle dans la
//   rue garde la géométrie du prototype, intacte — et un témoin le vérifie.
// - AUCUN PROGRAMME NE NAÎT. Même matériau, mêmes attributs : la portière se
//   dessine avec le programme de la carrosserie. Un `side: DoubleSide` pour
//   montrer l'intérieur de la portière changerait la clé de programme (v246) :
//   on ne le fait pas, et c'est un prix déclaré (le revers d'une portière
//   dont le modèle n'a pas dessiné l'intérieur est invisible).
//
// UN MODÈLE QUI CASSE VAUT MOINS QU'UN MODÈLE QUI S'EN PASSE. Quand la
// découpe ne trouve pas de roues, ou presque rien dans le volume de la
// portière, `planPortieres` rend `null` et la voiture monte sans portière —
// comme un modèle dont la fiche dit `portiere: false` (vehicules.js, FLOTTE).

import * as THREE from 'three';
import { partager } from './liberer.js';

// Ouverture : soixante degrés, vers l'EXTÉRIEUR (le signe se lit dans la
// matrice — v249 — et un témoin le lit).
export const OUVERTURE = 60 * Math.PI / 180;

const plans = new Map();     // clé de modèle → plan (ou null : pas de portière)
// POURQUOI un modèle n'a pas de portière : un refus se dit (v223), sinon il ne
// se démonte pas. Lu par la sonde et par les témoins.
export const refus = new Map();

// La clé d'un modèle : le fichier de la flotte, que la voiture porte depuis
// la v188. Sans fichier, pas de mémoire possible, donc pas de portière.
function cleModele(g) { return (g && g.userData && g.userData.flotte) || null; }

// Les maillages de la carrosserie, dans un ordre STABLE d'un clone à l'autre :
// on saute les avatars (un enfant assis là, v249/v253, reconnu à ses bras
// articulés) et les pivots de portière qu'on aurait déjà accrochés.
function maillagesDe(g) {
  const out = [];
  (function visite(o) {
    if (o !== g && o.userData && (o.userData.arms || o.userData.estPortiere)) return;
    if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position
      && !Array.isArray(o.material) && !o.isInstancedMesh && !o.isSkinnedMesh) out.push(o);
    for (const c of o.children) visite(c);
  })(g);
  return out;
}

function sousUneRoue(o, g) {
  for (let p = o; p && p !== g; p = p.parent) if (/^Wheel_/i.test(p.name || '')) return true;
  return false;
}

// LE PLAN D'UN MODÈLE : où sont les portières, et quels triangles elles
// emportent. Calculé une fois, sur la première voiture de ce modèle qu'un
// enfant ouvre ; le coût se mesure (`ms`) et entre dans le plan.
export function planPortieres(g) {
  const cle = cleModele(g);
  if (!cle) return null;
  if (plans.has(cle)) return plans.get(cle);
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  // LE PLAN SE CALCULE SUR LE PROTOTYPE, jamais sur la voiture : une voiture
  // froissée (degats3d.js, v343) porte des géométries clonées et déformées,
  // et un plan pris sur elle serait mémoïsé pour tout le modèle. Le prototype,
  // lui, n'est jamais touché — c'est lui que les clones partagent.
  const proto = g.userData.proto;
  if (!proto) return null;   // modèle pas encore arrivé : on réessaiera
  const roues = [];
  proto.traverse((o) => { if (/^Wheel_/i.test(o.name || '')) roues.push(o); });
  if (roues.length < 4) { refus.set(cle, { raison: 'roues' }); plans.set(cle, null); return null; }
  proto.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(proto.matrixWorld).invert();
  const boite = new THREE.Box3();
  const M = new THREE.Matrix4();
  // les roues, dans le repère de la voiture : l'avant est en −z
  const centres = roues.map((r) => {
    const b = new THREE.Box3();
    r.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      M.multiplyMatrices(inv, o.matrixWorld);
      b.union(o.geometry.boundingBox.clone().applyMatrix4(M));
    });
    return b;
  }).filter((b) => !b.isEmpty());
  if (centres.length < 4) { refus.set(cle, { raison: 'roues' }); plans.set(cle, null); return null; }
  const zs = centres.map((b) => (b.min.z + b.max.z) / 2).sort((a, b) => a - b);
  const rayon = Math.max(0.2, (centres[0].max.y - centres[0].min.y) / 2);
  const zAvant = (zs[0] + zs[1]) / 2, zArriere = (zs[2] + zs[3]) / 2;
  // la caisse, hors roues
  const maillages = maillagesDe(proto);
  for (const m of maillages) {
    if (sousUneRoue(m, proto)) continue;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    M.multiplyMatrices(inv, m.matrixWorld);
    boite.union(m.geometry.boundingBox.clone().applyMatrix4(M));
  }
  const demiLarg = Math.max(Math.abs(boite.min.x), Math.abs(boite.max.x));
  // LE VOLUME DE LA PORTIÈRE : derrière le passage de roue avant, devant le
  // montant central (jamais plus de 1,25 bloc, jamais dans le passage de la
  // roue arrière), sur le flanc — à plus de 0,6 bloc de l'axe, là où ni les
  // sièges (0,13 à 0,53) ni le volant (0,33) ne vont —, du bas de caisse au
  // haut de la vitre.
  const z0 = zAvant + rayon + 0.05;
  const z1 = Math.min(z0 + 1.25, zArriere - rayon - 0.12);
  const y0 = Math.max(0.22, rayon * 0.7), y1 = boite.max.y - 0.05;
  const xIn = Math.min(0.6, demiLarg * 0.6);
  if (!(z1 - z0 > 0.6) || !(y1 - y0 > 0.4) || !(demiLarg > 0.7)) { refus.set(cle, { raison: 'gabarit' }); plans.set(cle, null); return null; }
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const coupes = [];   // par maillage : { reste, gauche, droite, attrs } (index), ou null
  const portees = { '-1': { n: 0, aire: 0, box: new THREE.Box3() }, '1': { n: 0, aire: 0, box: new THREE.Box3() } };
  let ambigues = 0, aireTotale = 0, tranches = 0, sommetsNeufs = 0;
  // LES BORDS SE COUPENT AU PLAN (v372). Un triangle à cheval sur un bord du
  // volume — avant, arrière, bas de caisse, haut de vitre — n'est plus emporté
  // entier par son centre : il est COUPÉ au plan du bord, la part du dedans
  // va à la portière, le reste à la caisse. Les sommets neufs sont des
  // mélanges barycentriques des trois sommets du triangle d'origine (tous les
  // attributs : position, normale, UV, couleur), donc rien ne change de
  // matière ni de programme. Mesuré avant : 21 % de la surface de la portière
  // à cheval sur un bord sur la Lucid Gravity, 36 à 38 % sur les taxis — les
  // dents de scie. Agrandir le volume aurait déplacé les dents, pas ôté.
  const PLANS = [[2, 1, z0], [2, -1, z1], [1, 1, y0], [1, -1, y1]];   // [axe, sens, cote] : on garde sens·(p − cote) > 0
  const cZ = (p, ax) => (ax === 2 ? p.z : p.y);
  const aireDe = (poly) => {
    let s = 0;
    for (let k = 1; k + 1 < poly.length; k++) {
      const p0 = poly[0], p1 = poly[k], p2 = poly[k + 1];
      const ux = p1.x - p0.x, uy = p1.y - p0.y, uz = p1.z - p0.z, wx = p2.x - p0.x, wy = p2.y - p0.y, wz = p2.z - p0.z;
      s += Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx) / 2;
    }
    return s;
  };
  // Couper un polygone convexe (sommets { x, y, z, w: [w0, w1, w2] }) par un plan.
  const couper = (poly, [ax, sens, cote]) => {
    const dans = [], hors = [];
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k], q = poly[(k + 1) % poly.length];
      const dp = sens * (cZ(p, ax) - cote), dq = sens * (cZ(q, ax) - cote);
      (dp >= 0 ? dans : hors).push(p);
      if ((dp >= 0) !== (dq >= 0)) {
        const t = dp / (dp - dq);
        const r = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t,
          w: [0, 1, 2].map((j) => p.w[j] + (q.w[j] - p.w[j]) * t) };
        dans.push(r); hors.push(r);
      }
    }
    return [dans, hors];
  };
  for (const m of maillages) {
    if (sousUneRoue(m, proto)) { coupes.push(null); continue; }
    const geo = m.geometry, pos = geo.attributes.position, idx = geo.index;
    const n = idx ? idx.count : pos.count;
    const peutCouper = !Object.keys(geo.morphAttributes || {}).length;
    M.multiplyMatrices(inv, m.matrixWorld);
    const reste = [], gauche = [], droite = [];
    const neufs = [];   // sommets neufs : [i0, i1, i2, w0, w1, w2]
    const base = pos.count;
    const emettre = (poly, tri, liste) => {
      if (poly.length < 3 || aireDe(poly) < 1e-7) return;
      const ids = poly.map((p) => {
        for (let j = 0; j < 3; j++) if (p.w[j] > 1 - 1e-9) return tri[j];
        neufs.push(tri[0], tri[1], tri[2], p.w[0], p.w[1], p.w[2]);
        return base + neufs.length / 6 - 1;
      });
      for (let k = 1; k + 1 < ids.length; k++) liste.push(ids[0], ids[k], ids[k + 1]);
    };
    // chaque sommet passe UNE fois dans le repère de la voiture (un maillage
    // indexé en partage trois à six), et la boucle ne lit que des nombres
    const P = new Float32Array(pos.count * 3);
    for (let k = 0; k < pos.count; k++) {
      a.fromBufferAttribute(pos, k).applyMatrix4(M);
      P[k * 3] = a.x; P[k * 3 + 1] = a.y; P[k * 3 + 2] = a.z;
    }
    const ix = idx ? idx.array : null;
    for (let i = 0; i + 2 < n; i += 3) {
      const i0 = ix ? ix[i] : i, i1 = ix ? ix[i + 1] : i + 1, i2 = ix ? ix[i + 2] : i + 2;
      const ay = P[i0 * 3 + 1], az = P[i0 * 3 + 2], by = P[i1 * 3 + 1], bz = P[i1 * 3 + 2], cy = P[i2 * 3 + 1], cz = P[i2 * 3 + 2];
      // tout le triangle du même côté d'un plan, hors du volume : la caisse
      // (c'est l'immense majorité, et elle ne coûte que ces comparaisons)
      if ((az <= z0 && bz <= z0 && cz <= z0) || (az >= z1 && bz >= z1 && cz >= z1)
        || (ay <= y0 && by <= y0 && cy <= y0) || (ay >= y1 && by >= y1 && cy >= y1)
        || (Math.abs(P[i0 * 3]) <= xIn && Math.abs(P[i1 * 3]) <= xIn && Math.abs(P[i2 * 3]) <= xIn)) {
        reste.push(i0, i1, i2); continue;
      }
      a.set(P[i0 * 3], ay, az); b.set(P[i1 * 3], by, bz); c.set(P[i2 * 3], cy, cz);
      const tri = [i0, i1, i2];
      const sommets = [a, b, c];
      const toutDedans = az > z0 && az < z1 && bz > z0 && bz < z1 && cz > z0 && cz < z1
        && ay > y0 && ay < y1 && by > y0 && by < y1 && cy > y0 && cy < y1;
      let mi = null, hors = [];
      if (toutDedans || !peutCouper) {
        v.copy(a).add(b).add(c).multiplyScalar(1 / 3);
        const dedans = v.z > z0 && v.z < z1 && v.y > y0 && v.y < y1 && Math.abs(v.x) > xIn;
        if (!dedans) { reste.push(i0, i1, i2); continue; }
      } else {
        // la part du triangle dans le volume, et ce qui en sort
        let poly = sommets.map((p, j) => ({ x: p.x, y: p.y, z: p.z, w: [j === 0 ? 1 : 0, j === 1 ? 1 : 0, j === 2 ? 1 : 0] }));
        for (const pl of PLANS) {
          if (poly.length < 3) break;
          const [dans, dehors] = couper(poly, pl);
          if (dehors.length >= 3) hors.push(dehors);
          poly = dans;
        }
        if (poly.length < 3 || aireDe(poly) < 1e-7) { reste.push(i0, i1, i2); continue; }
        let sx = 0; for (const p of poly) sx += p.x; sx /= poly.length;
        if (!(Math.abs(sx) > xIn)) { reste.push(i0, i1, i2); continue; }
        mi = poly;
        v.set(sx, 0, 0);
      }
      const cote = v.x < 0 ? '-1' : '1';
      const pt = portees[cote];
      const cible = cote === '-1' ? gauche : droite;
      let aire;
      if (mi) {
        tranches++;
        emettre(mi, tri, cible);
        for (const h of hors) emettre(h, tri, reste);
        aire = aireDe(mi);
        for (const p of mi) pt.box.expandByPoint(v.set(p.x, p.y, p.z));
      } else {
        cible.push(i0, i1, i2);
        aire = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
        pt.box.expandByPoint(a); pt.box.expandByPoint(b); pt.box.expandByPoint(c);
        // ce qui dépasse encore d'un bord (un maillage qu'on ne sait pas
        // couper) : c'est ce qui ferait des dents de scie
        const horsZ = sommets.filter((p) => p.z < z0 - 0.08 || p.z > z1 + 0.08).length;
        if (horsZ) ambigues += aire;
      }
      pt.n++; pt.aire += aire;
      aireTotale += aire;
    }
    let attrs = null;
    if (neufs.length) {
      // LES ATTRIBUTS DE CE MAILLAGE SE RECOPIENT, AGRANDIS : jamais ceux du
      // prototype, que toute la rue partage (v238). Tout attribut s'interpole
      // (getX lit déjà les valeurs dénormalisées d'un modèle quantifié).
      const nn = neufs.length / 6;
      sommetsNeufs += nn;
      attrs = {};
      for (const [nom, at] of Object.entries(geo.attributes)) {
        // on recopie les valeurs BRUTES, dans le même type (un modèle
        // quantifié reste quantifié, normalisé reste normalisé) : la copie
        // se fait d'un geste, et seuls les sommets neufs s'interpolent
        const k = at.itemSize, tot = base + nn;
        const src = at.isInterleavedBufferAttribute ? at.data.array : at.array;
        const Type = src.constructor;
        const entier = !(src instanceof Float32Array || src instanceof Float64Array);
        const arr = new Type(tot * k);
        const pas = at.isInterleavedBufferAttribute ? at.data.stride : k, dec = at.isInterleavedBufferAttribute ? at.offset : 0;
        if (pas === k && dec === 0) arr.set(src.subarray(0, base * k));
        else for (let i = 0; i < base; i++) for (let j = 0; j < k; j++) arr[i * k + j] = src[i * pas + dec + j];
        for (let q = 0; q < nn; q++) {
          const o = q * 6, d = (base + q) * k;
          for (let j = 0; j < k; j++) {
            const x = neufs[o + 3] * arr[neufs[o] * k + j] + neufs[o + 4] * arr[neufs[o + 1] * k + j] + neufs[o + 5] * arr[neufs[o + 2] * k + j];
            arr[d + j] = entier ? Math.round(x) : x;
          }
          if (nom === 'normal' && k === 3 && !entier) {
            const l = Math.hypot(arr[d], arr[d + 1], arr[d + 2]) || 1;
            arr[d] /= l; arr[d + 1] /= l; arr[d + 2] /= l;
          }
        }
        attrs[nom] = new THREE.BufferAttribute(arr, k, at.normalized);
      }
    }
    coupes.push(gauche.length || droite.length ? { reste, gauche, droite, attrs } : null);
  }
  const ms = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
  // TROP PEU DANS LE VOLUME : ce n'est pas une portière, c'est un éclat.
  // Moins d'un demi-bloc carré de chaque côté (les supercars, dont la verrière
  // est étroite, ont 0,61 à 0,78 de panneau), on s'en passe.
  if (portees['-1'].aire < 0.5 || portees['1'].aire < 0.5) {
    refus.set(cle, { raison: 'surface', aire: [portees['-1'].aire, portees['1'].aire], n: [portees['-1'].n, portees['1'].n], z0, z1, y0, y1, xIn, demiLarg });
    plans.set(cle, null); return null;
  }
  // Les géométries neuves, mémoïsées : attributs PARTAGÉS avec le prototype,
  // index à elles.
  const vers = (geo, liste, attrs) => {
    const g2 = new THREE.BufferGeometry();
    for (const [nom, attr] of Object.entries(attrs || geo.attributes)) g2.setAttribute(nom, attr);
    g2.morphAttributes = geo.morphAttributes;
    const max = (attrs || geo.attributes).position.count;
    g2.setIndex(liste.length && max > 65535 ? new THREE.Uint32BufferAttribute(liste, 1) : liste);
    g2.boundingBox = geo.boundingBox; g2.boundingSphere = geo.boundingSphere;
    return partager(g2);
  };
  const geos = maillages.map((m, k) => {
    const cp = coupes[k];
    if (!cp) return null;
    return {
      reste: vers(m.geometry, cp.reste, cp.attrs),
      '-1': cp.gauche.length ? vers(m.geometry, cp.gauche, cp.attrs) : null,
      '1': cp.droite.length ? vers(m.geometry, cp.droite, cp.attrs) : null,
    };
  });
  // LES CHARNIÈRES : sur l'arête avant de chaque portière, au nu du flanc.
  const charniere = (cote) => {
    const bx = portees[cote].box;
    return new THREE.Vector3(cote === '-1' ? bx.min.x : bx.max.x, 0, bx.min.z);
  };
  const plan = {
    cle, ms, geos, sources: maillages.map((m) => m.geometry), demiLarg, z0, z1, y0, y1, xIn, rayon,
    longueur: { '-1': portees['-1'].box.max.z - portees['-1'].box.min.z, '1': portees['1'].box.max.z - portees['1'].box.min.z },
    charnieres: { '-1': charniere('-1'), '1': charniere('1') },
    aire: { '-1': portees['-1'].aire, '1': portees['1'].aire },
    ambigues: aireTotale ? ambigues / aireTotale : 0,
    triangles: portees['-1'].n + portees['1'].n,
    tranches, sommetsNeufs,
  };
  plans.set(cle, plan);
  return plan;
}

// ÉQUIPER UNE VOITURE : SES maillages perdent les portières, elle gagne deux
// pivots. Rend `{ '-1': pivot, '1': pivot, plan }`, ou null si le modèle ne
// s'y prête pas. Idempotent : une voiture déjà équipée rend ses pivots.
export function equiperPortieres(g, refuse = false) {
  if (!g) return null;
  if (g.userData.portieres) return g.userData.portieres;
  if (refuse) return null;
  const plan = planPortieres(g);
  if (!plan) return null;
  const modele = g.userData.modele;
  if (!modele) return null;
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const maillages = maillagesDe(modele);
  if (maillages.length !== plan.geos.length) return null;   // ce n'est pas le même modèle
  // UNE VOITURE DÉJÀ FROISSÉE NE S'ÉQUIPE PAS : ses pièces touchées portent
  // une géométrie à elles (degats3d.js), et la remplacer par « la caisse sans
  // les portières » effacerait le froissé — ou, rejouée, rendrait la portière
  // en double. Elle monte sans portière animée, et le refus se dit.
  for (let k = 0; k < maillages.length; k++) {
    if (plan.geos[k] && maillages[k].geometry !== plan.sources[k]) {
      refus.set(plan.cle + '#instance', { raison: 'abimee' });
      return null;
    }
  }
  const pivots = {};
  for (const cote of ['-1', '1']) {
    const p = new THREE.Group();
    p.name = 'Portiere_' + (cote === '-1' ? 'G' : 'D');
    p.userData.estPortiere = true;
    p.userData.cote = Number(cote);
    p.position.copy(plan.charnieres[cote]);
    p.userData.longueur = plan.longueur[cote];
    pivots[cote] = p;
  }
  const M = new THREE.Matrix4(), T = new THREE.Matrix4();
  maillages.forEach((m, k) => {
    const gs = plan.geos[k];
    if (!gs) return;
    M.multiplyMatrices(inv, m.matrixWorld);
    for (const cote of ['-1', '1']) {
      if (!gs[cote]) continue;
      const d = new THREE.Mesh(gs[cote], m.material);
      d.layers.mask = m.layers.mask;
      d.castShadow = m.castShadow; d.receiveShadow = m.receiveShadow;
      d.renderOrder = m.renderOrder;
      T.makeTranslation(-plan.charnieres[cote].x, 0, -plan.charnieres[cote].z).multiply(M);
      T.decompose(d.position, d.quaternion, d.scale);
      pivots[cote].add(d);
    }
    m.geometry = gs.reste;
  });
  g.add(pivots['-1']); g.add(pivots['1']);
  g.userData.portieres = { '-1': pivots['-1'], '1': pivots['1'], plan };
  return g.userData.portieres;
}

// L'angle d'une portière, de 0 (fermée) à 1 (grande ouverte), vers
// l'EXTÉRIEUR : la portière gauche (−x) tourne de −60°, la droite de +60°.
// L'arête arrière (en +z de la charnière) part donc du côté de son flanc.
export function ouvrir(pivot, k) {
  if (!pivot) return;
  const e = k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  pivot.rotation.y = pivot.userData.cote * OUVERTURE * e;
}

// Pour un témoin : le plan d'un modèle, sans rien fabriquer de plus.
export function planConnu(cle) { return plans.has(cle) ? plans.get(cle) : undefined; }
