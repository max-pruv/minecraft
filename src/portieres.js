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
import { Atelier } from './modeles.js';

// Ouverture : soixante degrés, vers l'EXTÉRIEUR (le signe se lit dans la
// matrice — v249 — et un témoin le lit).
export const OUVERTURE = 60 * Math.PI / 180;
// En ciseau (Lamborghini), la portière se lève de soixante-quinze degrés.
export const OUVERTURE_CISEAU = 75 * Math.PI / 180;

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
    if (o !== g && o.userData && (o.userData.arms || o.userData.estPortiere || o.userData.garniture)) return;
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
  // un plan ne vaut que pour le prototype qui l'a produit : un témoin qui
  // bâtit son propre prototype du même fichier (porsche-911.mjs) ne doit pas
  // laisser au jeu des géométries qui ne sont pas les siennes (vNEXT)
  if (plans.has(cle)) { const p = plans.get(cle); if (!p || !p.proto || p.proto === g.userData.proto) return p; }
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  // LE PLAN SE CALCULE SUR LE PROTOTYPE, jamais sur la voiture : une voiture
  // froissée (degats3d.js, v343) porte des géométries clonées et déformées,
  // et un plan pris sur elle serait mémoïsé pour tout le modèle. Le prototype,
  // lui, n'est jamais touché — c'est lui que les clones partagent.
  const proto = g.userData.proto;
  if (!proto) return null;   // modèle pas encore arrivé : on réessaiera
  const roues = [];
  // les nœuds de roue les plus hauts seulement : un pneu fait de plusieurs
  // primitives rend des enfants « Wheel_FL_1… » (la MC12, vNEXT), et prendre
  // les quatre premiers z triés mettait les quatre roues à l'avant
  proto.traverse((o) => { if (/^Wheel_/i.test(o.name || '') && !(o.parent && sousUneRoue(o.parent, proto))) roues.push(o); });
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
  // LA PEAU DE LA VOITURE, relevée au passage (vNEXT) : pour chaque flanc,
  // tranche de hauteur et tranche de longueur, le |x| le plus grand de la
  // carrosserie ; pour chaque colonne (x, z), le plus haut sommet. C'est dans
  // cette enveloppe que se pose la garniture fabriquée (`garnitureDe`) : rien
  // ne doit en sortir. Et la ceinture de caisse — le bas des vitres de la
  // portière — dit jusqu'où monte le panneau de porte.
  const peau = new Map(), toit = new Map();
  const ceinture = { '-1': Infinity, '1': Infinity };
  function noterPeau(x, y, z) {
    const ke = ((x < 0 ? 0 : 1) * 4096 + (Math.floor(y / 0.1) + 64)) * 4096 + Math.floor(z / 0.2) + 2048;
    const ax = Math.abs(x);
    if (!(peau.get(ke) >= ax)) peau.set(ke, ax);
    const kt = (Math.floor(x / 0.2) + 2048) * 4096 + Math.floor(z / 0.2) + 2048;
    if (!(toit.get(kt) >= y)) toit.set(kt, y);
  }
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
      noterPeau(a.x, a.y, a.z);
    }
    const vitre = estVitre(m.material);
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
      if (vitre) ceinture[cote] = Math.min(ceinture[cote], ay, by, cy);
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
  // LE REVERS D'UNE PORTIÈRE SE FABRIQUE (v373). Mesuré par la sonde du
  // revers : une portière ouverte vue de face prend 10 à 20 rayons sur 24,
  // vue de DERRIÈRE — l'enfant qui arrive de l'arrière de la voiture — zéro,
  // sur les cinquante modèles de la flotte : aucun n'a meublé l'intérieur de
  // sa portière, et la face simple est culée. Un `DoubleSide` changerait la
  // clé de programme (v246) et coûterait une compilation à la première
  // montée ; on DOUBLE donc la géométrie : la portière reçoit une copie
  // compacte de ses sommets, puis une seconde, normales retournées, et ses
  // triangles à l'envers. Même matériau, même programme, même appel de
  // dessin ; seuls les sommets de la portière doublent. `endroit` dit où
  // finit l'endroit dans l'index (le reste est le revers).
  const versPorte = (geo, liste, attrs) => {
    // un maillage à cibles de morphose garderait sa clé de programme : on
    // ne lui fabrique pas de revers (aucun modèle de la flotte n'en a)
    if (Object.keys(geo.morphAttributes || {}).length) return vers(geo, liste, attrs);
    const src = attrs || geo.attributes;
    const nb = src.position.count;
    const carte = new Int32Array(nb).fill(-1);
    const ordre = [];
    for (const i of liste) if (carte[i] < 0) { carte[i] = ordre.length; ordre.push(i); }
    const n = ordre.length;
    const g2 = new THREE.BufferGeometry();
    for (const [nom, at] of Object.entries(src)) {
      const k = at.itemSize;
      const arr = new Float32Array(n * 2 * k);
      const lire = (i, j) => (j === 0 ? at.getX(i) : j === 1 ? at.getY(i) : j === 2 ? at.getZ(i) : at.getW(i));
      const signe = nom === 'normal' ? -1 : 1;
      for (let q = 0; q < n; q++) for (let j = 0; j < k; j++) {
        const x = lire(ordre[q], j);
        arr[q * k + j] = x;
        arr[(n + q) * k + j] = signe * x;
      }
      g2.setAttribute(nom, new THREE.BufferAttribute(arr, k));
    }
    const idx = new (n * 2 > 65535 ? Uint32Array : Uint16Array)(liste.length * 2);
    for (let t = 0; t < liste.length; t += 3) {
      const a0 = carte[liste[t]], a1 = carte[liste[t + 1]], a2 = carte[liste[t + 2]];
      idx[t] = a0; idx[t + 1] = a1; idx[t + 2] = a2;
      const o = liste.length + t;
      idx[o] = n + a0; idx[o + 1] = n + a2; idx[o + 2] = n + a1;
    }
    g2.setIndex(new THREE.BufferAttribute(idx, 1));
    g2.userData.endroit = liste.length;
    g2.computeBoundingBox(); g2.computeBoundingSphere();
    return partager(g2);
  };
  const geos = maillages.map((m, k) => {
    const cp = coupes[k];
    if (!cp) return null;
    return {
      reste: vers(m.geometry, cp.reste, cp.attrs),
      '-1': cp.gauche.length ? versPorte(m.geometry, cp.gauche, cp.attrs) : null,
      '1': cp.droite.length ? versPorte(m.geometry, cp.droite, cp.attrs) : null,
    };
  });
  // LES CHARNIÈRES : sur l'arête avant de chaque portière, au nu du flanc.
  const charniere = (cote) => {
    const bx = portees[cote].box;
    return new THREE.Vector3(cote === '-1' ? bx.min.x : bx.max.x, 0, bx.min.z);
  };
  const plan = {
    cle, proto, ms, geos, sources: maillages.map((m) => m.geometry), demiLarg, z0, z1, y0, y1, xIn, rayon,
    longueur: { '-1': portees['-1'].box.max.z - portees['-1'].box.min.z, '1': portees['1'].box.max.z - portees['1'].box.min.z },
    charnieres: { '-1': charniere('-1'), '1': charniere('1') },
    aire: { '-1': portees['-1'].aire, '1': portees['1'].aire },
    ambigues: aireTotale ? ambigues / aireTotale : 0,
    triangles: portees['-1'].n + portees['1'].n,
    tranches, sommetsNeufs,
    peau, toit, ceinture,
    deja: sonderHabitacle(proto, maillages, { z0, z1, y0, y1, demiLarg }),
  };
  plans.set(cle, plan);
  return plan;
}


// Une vitre : ce qu'on voit au travers. Elle ne compte ni pour la ceinture de
// caisse (son bas, si), ni pour les sondes de l'habitacle (un rayon qui la
// touche ne prouve pas qu'il y a un siège derrière).
function estVitre(mat) {
  const ms = Array.isArray(mat) ? mat : [mat];
  return ms.some((x) => x && (x.transparent || x.opacity < 0.99 || x.transmission > 0 || /glass|vitre|window|windshield/i.test(x.name || '')));
}

// CE QUE LE MODÈLE A DÉJÀ DANS SON HABITACLE (vNEXT). Mesuré par la sonde des
// portières : derrière l'ouverture, la plupart des paquets n'ont RIEN — 0 à 4
// rayons sur 24 touchent quelque chose sur les dix voitures de tous les jours,
// et l'enfant qui monte voyait la rue au travers de la voiture. Trois
// questions, posées par des rayons sur le PROTOTYPE (jamais touché), dans le
// repère de la voiture : y a-t-il une assise sous le siège du conducteur, une
// planche devant lui, des panneaux sur les flancs ? Ce qui existe déjà n'est
// pas fabriqué une seconde fois (deux sièges l'un dans l'autre se voient).
function sonderHabitacle(proto, maillages, d) {
  const cibles = maillages.filter((m) => !sousUneRoue(m, proto) && !estVitre(m.material));
  const W = proto.matrixWorld;
  const rc = new THREE.Raycaster();
  rc.layers.enableAll();
  // un rayon rend le premier point touché, dans le repère de la voiture — une
  // peau en double face (la plupart des paquets déposés, v566) se touche AUSSI
  // de dedans : c'est la POSITION du point qui dit s'il y a un meuble
  const Winv = new THREE.Matrix4().copy(W).invert();
  const tire = (o, dir, loin) => {
    rc.set(new THREE.Vector3(...o).applyMatrix4(W), new THREE.Vector3(...dir).transformDirection(W));
    rc.far = loin;
    const h = rc.intersectObjects(cibles, false)[0];
    return h ? h.point.clone().applyMatrix4(Winv) : null;
  };
  const xs = 0.33, ys = 0.52, zs = 0.22;
  // une assise : sous les hanches, à moins de 0,22 (le plancher est plus bas)
  const assise = (x) => { const h = tire([x, ys + 0.4, zs], [0, -1, 0], 0.62); return !!h && h.y > ys - 0.22; };
  const sieges = assise(-xs) && assise(xs);
  // une planche : devant le conducteur, avant le pied du montant avant
  const hp = tire([-xs, ys + 0.3, zs], [0, 0, -1], Math.max(0.6, zs - d.z0 + 0.6));
  const planche = !!hp && hp.z > d.z0 - 0.3;
  // des panneaux : un meuble, pas la tôle vue de dedans
  let murs = 0, n = 0;
  for (const sx of [-1, 1]) for (const y of [d.y0 + 0.2, d.y0 + 0.4]) for (const k of [0.25, 0.75, 1.3]) {
    const z = d.z0 + (d.z1 - d.z0) * k;
    n++;
    const h = tire([0, y, z], [sx, 0, 0], d.demiLarg + 0.2);
    if (h && Math.abs(h.x) < d.demiLarg - 0.15) murs++;
  }
  return { sieges, planche, murs: murs >= n * 0.75 };
}

// LA GARNITURE FABRIQUÉE (vNEXT). Max : « on voit la personne qui rentre et qui
// disparaît là-dedans ». Une portière qui s'ouvre sur le vide montre la rue au
// travers de la voiture ; on meuble donc l'habitacle de ce que le modèle n'a
// pas : plancher, deux baquets et la banquette, console, planche et volant,
// panneaux de flanc derrière la portière, et le PANNEAU DE PORTE sur la face
// intérieure de chaque portière (il pivote avec elle). Tout à l'atelier, avec
// `matiereVivante` (v538) : aucun programme neuf. Une fois par modèle,
// géométries partagées ; chaque voiture équipée n'en porte qu'une copie de
// maillages. Chaque pièce se pose DANS l'enveloppe relevée (`peau`, `toit`) :
// un baquet qui percerait le toit d'une voiture basse se tasse, un panneau se
// tient à sept centimètres en dedans de la tôle.
const SOMBRE = 0x1b1d21, CUIR = 0x2c2a2b, CUIR_CLAIR = 0x3a3836, MOQUETTE = 0x141518, GARNI = 0x26282d, CHROME = 0x6b6f76;
export function garnitureDe(plan, siege = { x: -0.33, y: 0.52, z: 0.22 }) {
  if (plan.garniture !== undefined) return plan.garniture;
  if (!plan.peau) { plan.garniture = null; return null; }
  const { peau, toit, z0, z1, y0, demiLarg } = plan;
  const deja = plan.deja || {};
  // le |x| intérieur minimal sur une plage (y, z) d'un flanc
  const env = (cote, ya, yb, za, zb) => {
    let m = Infinity;
    for (let yb0 = Math.floor(ya / 0.1); yb0 <= Math.floor(yb / 0.1); yb0++) {
      for (let zb0 = Math.floor(za / 0.2); zb0 <= Math.floor(zb / 0.2); zb0++) {
        const v = peau.get(((cote < 0 ? 0 : 1) * 4096 + yb0 + 64) * 4096 + zb0 + 2048);
        if (v !== undefined && v < m) m = v;
      }
    }
    return m === Infinity ? demiLarg : m;
  };
  // le toit le plus BAS au-dessus d'une plage (x, z) — on se tient dessous
  const sous = (xa, xb, za, zb) => {
    let m = Infinity;
    for (let xb0 = Math.floor(xa / 0.2); xb0 <= Math.floor(xb / 0.2); xb0++) {
      for (let zb0 = Math.floor(za / 0.2); zb0 <= Math.floor(zb / 0.2); zb0++) {
        const v = toit.get((xb0 + 2048) * 4096 + zb0 + 2048);
        if (v !== undefined && v < m) m = v;
      }
    }
    return m;
  };
  const xs = Math.abs(siege.x), zs = siege.z;
  const zr = zs + 0.84;                         // la banquette (mesurée sur la Lucid Air)
  const ceint = (c) => Math.max(y0 + 0.3, Math.min(plan.y1 - 0.15, Number.isFinite(plan.ceinture[c]) ? plan.ceinture[c] : y0 + 0.55 * (plan.y1 - y0)));
  const yPl = y0 + 0.04;                        // dessus du plancher
  const A = new Atelier();
  const boite = (c, x0, x1, ya, yb, za, zb, o = {}) => {
    if (!(x1 - x0 > 0.01 && yb - ya > 0.01 && zb - za > 0.01)) return;
    A.boite(c, { p: [(x0 + x1) / 2, (ya + yb) / 2, (za + zb) / 2], e: [x1 - x0, yb - ya, zb - za], ...o });
  };
  // le plancher, d'un flanc à l'autre, de la planche au dos de la banquette
  const lp = Math.min(env(-1, y0, y0 + 0.2, z0 - 0.2, zr + 0.3), env(1, y0, y0 + 0.2, z0 - 0.2, zr + 0.3)) - 0.08;
  boite(MOQUETTE, -lp, lp, yPl - 0.05, yPl, z0 - 0.35, zr + 0.35);
  // l'assise : à la hauteur des hanches que `placeAssise` (main.js) donnera,
  // sous le toit mesuré au-dessus du siège
  const toitS = sous(-xs - 0.2, -xs + 0.2, zs - 0.2, zs + 0.2);
  let hanches = siege.y;
  if (Number.isFinite(toitS) && hanches + 0.706 > toitS - 0.06) hanches = Math.max(0.3, toitS - 0.06 - 0.706);
  const yAs = Math.max(yPl + 0.08, hanches - 0.03);
  if (!deja.sieges) {
    for (const sx of [-1, 1]) {
      const x = sx * xs;
      const plafond = sous(x - 0.2, x + 0.2, zs, zs + 0.45);
      // l'assise et son pied
      boite(GARNI, x - 0.16, x + 0.16, yPl, yAs - 0.09, zs - 0.18, zs + 0.18);
      A.boite(CUIR, { p: [x, yAs - 0.05, zs - 0.03], e: [0.42, 0.1, 0.46], r: [-0.06, 0, 0] });
      // les bourrelets de l'assise
      for (const b of [-1, 1]) A.boite(CUIR_CLAIR, { p: [x + b * 0.19, yAs - 0.01, zs - 0.03], e: [0.06, 0.08, 0.44] });
      // le dossier, incliné en arrière, sous le toit
      const hD = Math.max(0.3, Math.min(0.62, (Number.isFinite(plafond) ? plafond - 0.1 : yAs + 0.75) - yAs - 0.06));
      A.boite(CUIR, { p: [x, yAs + hD / 2, zs + 0.26], e: [0.42, hD, 0.11], r: [0.18, 0, 0] });
      for (const b of [-1, 1]) A.boite(CUIR_CLAIR, { p: [x + b * 0.2, yAs + hD * 0.45, zs + 0.24], e: [0.06, hD * 0.8, 0.13], r: [0.18, 0, 0] });
      // l'appuie-tête, s'il reste de la place sous le toit
      if (!Number.isFinite(plafond) || yAs + hD + 0.17 < plafond - 0.06) {
        A.boite(CUIR, { p: [x, yAs + hD + 0.08, zs + 0.33], e: [0.24, 0.14, 0.09], r: [0.18, 0, 0] });
      }
    }
    // la banquette arrière
    const lb = Math.min(env(-1, yAs - 0.1, yAs + 0.2, zr - 0.2, zr + 0.3), env(1, yAs - 0.1, yAs + 0.2, zr - 0.2, zr + 0.3)) - 0.1;
    const plafondR = sous(-0.4, 0.4, zr, zr + 0.4);
    const hR = Math.max(0.25, Math.min(0.55, (Number.isFinite(plafondR) ? plafondR - 0.12 : yAs + 0.65) - yAs));
    boite(GARNI, -lb, lb, yPl, yAs - 0.08, zr - 0.2, zr + 0.2);
    boite(CUIR, -lb, lb, yAs - 0.1, yAs, zr - 0.22, zr + 0.22);
    A.boite(CUIR, { p: [0, yAs + hR / 2, zr + 0.28], e: [lb * 2, hR, 0.11], r: [0.15, 0, 0] });
  }
  // la console centrale, entre les deux baquets
  boite(SOMBRE, -0.09, 0.09, yPl, yAs - 0.02, z0 - 0.05, zs + 0.15);
  if (!deja.planche) {
    // LA PLANCHE DE BORD, sous le pare-brise mesuré au-dessus d'elle
    const zA = z0 - 0.42, zB = z0 + 0.1;
    const lpl = Math.min(env(-1, 0.5, 0.8, zA, zB), env(1, 0.5, 0.8, zA, zB)) - 0.1;
    const haut = Math.min(yAs + 0.34, sous(-lpl, lpl, zA, zB) - 0.08);
    boite(SOMBRE, -lpl, lpl, yPl, Math.max(yPl + 0.2, haut - 0.12), zA, zB - 0.05);
    boite(GARNI, -lpl, lpl, haut - 0.12, haut, zA, zB);
    // le volant, devant le conducteur : jante et colonne
    const yV = Math.min(haut + 0.02, yAs + 0.3), zV = Math.max(zB + 0.04, zs - 0.42);
    A.tore(SOMBRE, { p: [-xs, yV, zV], e: [0.34, 0.34, 0.34], r: [-0.42, 0, 0], tube: 0.13, seg: 18 });
    A.cylindre(GARNI, { p: [-xs, yV - 0.02, (zV + zB) / 2], e: [0.05, Math.max(0.05, zV - zB + 0.08), 0.05], r: [Math.PI / 2 - 0.42, 0, 0] });
    A.cylindre(CHROME, { p: [-xs, yV, zV], e: [0.07, 0.03, 0.07], r: [Math.PI / 2 - 0.42, 0, 0] });
  }
  if (!deja.murs) {
    // LES FLANCS DERRIÈRE LA PORTIÈRE (montant central, places arrière) et
    // devant elle (la cloison du pédalier) : sans eux, l'enfant qui ouvre voit
    // la rue au travers de l'autre côté de la voiture
    for (const c of [-1, 1]) {
      const ce = ceint(String(c));
      const xa = env(c, yPl, ce, z1, zr + 0.35) - 0.07;
      boite(GARNI, c < 0 ? -xa : xa - 0.04, c < 0 ? -xa + 0.04 : xa, yPl, ce - 0.02, z1 + 0.02, zr + 0.35);
      const xf = env(c, yPl, ce, z0 - 0.35, z0) - 0.07;
      boite(GARNI, c < 0 ? -xf : xf - 0.04, c < 0 ? -xf + 0.04 : xf, yPl, ce - 0.04, z0 - 0.35, z0 - 0.02);
    }
    // le dos de la banquette ferme le coffre : on ne voit pas la rue par là
    const lc = Math.min(env(-1, yPl, yAs + 0.3, zr + 0.3, zr + 0.5), env(1, yPl, yAs + 0.3, zr + 0.3, zr + 0.5)) - 0.08;
    boite(GARNI, -lc, lc, yPl, Math.min(ceint('-1'), ceint('1')) - 0.02, zr + 0.4, zr + 0.44);
  }
  // LES PANNEAUX DE PORTE : sur la face intérieure de chaque portière, du
  // seuil à la ceinture de caisse, avec l'accoudoir et la poignée. Posés en
  // repère de la voiture, rangés dans un membre à part dont le pivot est la
  // charnière : `equiperPortieres` les accroche au pivot de SA portière.
  if (plan.charnieres) {
    for (const c of [-1, 1]) {
      const ch = plan.charnieres[String(c)];
      const ce = ceint(String(c));
      const zA = ch.z + 0.06, zB = ch.z + plan.longueur[String(c)] - 0.06;
      const xi = env(c, y0 + 0.05, ce, zA, zB) - 0.08;
      A.membre('carte' + c, [ch.x, 0, ch.z]);
      const x0 = c < 0 ? -xi : xi - 0.035, x1 = c < 0 ? -xi + 0.035 : xi;
      boite(GARNI, x0, x1, y0 + 0.05, ce - 0.03, zA, zB);
      const xr = c < 0 ? -xi + 0.035 : xi - 0.035;
      boite(CUIR, Math.min(xr, xr - c * 0.07), Math.max(xr, xr - c * 0.07), ce - 0.2, ce - 0.14, zA + 0.15, zB - 0.12);
      boite(CHROME, Math.min(xr, xr - c * 0.025), Math.max(xr, xr - c * 0.025), ce - 0.09, ce - 0.06, zA + 0.1, zA + 0.22);
      A.membre('tronc');
    }
  }
  const racine = A.finir();
  // les membres se retrouvent par leur NOM sur chaque clone : `clone` recopie
  // `userData` par JSON, et des groupes n'ont rien à y faire
  for (const [nom, gm] of Object.entries(racine.userData.membres)) gm.name = 'Garniture_' + nom;
  delete racine.userData.membres;
  racine.traverse((o) => { o.userData.garniture = true; if (o.isMesh) partager(o.geometry); });
  racine.name = 'Garniture';
  plan.garniture = racine;
  return racine;
}

// LES VRAIES PORTES D'UN MODÈLE (Lucid Air Sapphire) : deux nœuds `Portiere_G` et
// `Portiere_D` posés sur leur charnière, avec leur intérieur. Rien à découper,
// aucune géométrie à toucher : chaque clone a déjà ses pivots, et l'on ne fait
// que rendre ce que la séquence attend. Le plan se mesure une fois par modèle,
// dans le repère de la voiture (nez en −z). Le modèle est dans un cadre tourné
// d'un demi-tour autour de y : la rotation d'`ouvrir` commute avec lui, et le
// signe reste celui du flanc VU DANS LA VOITURE.
function vraiesPortes(g) {
  const modele = g.userData.modele || g;
  const G = modele.getObjectByName('Portiere_G'), D = modele.getObjectByName('Portiere_D');
  if (!G || !D) return null;
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const M = new THREE.Matrix4();
  const mesure = (pivot) => {
    const boite = new THREE.Box3();
    pivot.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      M.multiplyMatrices(inv, o.matrixWorld);
      boite.union(o.geometry.boundingBox.clone().applyMatrix4(M));
    });
    return boite;
  };
  const cle = cleModele(g);
  let plan = cle ? plans.get(cle) : null;
  if (!plan) {
    const a = mesure(G), b = mesure(D);
    const boite = mesure(modele);
    plan = { cle, vraie: true, ms: 0, demiLarg: Math.max(Math.abs(boite.min.x), Math.abs(boite.max.x)),
      z0: Math.min(a.min.z, b.min.z), z1: Math.max(a.max.z, b.max.z), y0: Math.min(a.min.y, b.min.y), y1: Math.max(a.max.y, b.max.y),
      longueur: { '-1': a.max.z - a.min.z, '1': b.max.z - b.min.z }, ambigues: 0, triangles: 0, tranches: 0, sommetsNeufs: 0 };
    if (cle) plans.set(cle, plan);
  }
  // un flanc se lit dans la voiture, jamais dans le nom d'un paquet
  const sens = (pivot) => { M.multiplyMatrices(inv, pivot.matrixWorld); return new THREE.Vector3().setFromMatrixPosition(M).x < 0 ? -1 : 1; };
  const out = { plan };
  for (const p of [G, D]) {
    const cote = sens(p);
    p.userData.estPortiere = true;
    p.userData.cote = cote;
    p.userData.longueur = plan.longueur[String(cote)] ?? plan.longueur['-1'];
    out[String(cote)] = p;
  }
  g.userData.portieres = out;
  return out;
}

// ÉQUIPER UNE VOITURE : SES maillages perdent les portières, elle gagne deux
// pivots. Rend `{ '-1': pivot, '1': pivot, plan }`, ou null si le modèle ne
// s'y prête pas. Idempotent : une voiture déjà équipée rend ses pivots.
export function equiperPortieres(g, refuse = false, opts = {}) {
  if (!g) return null;
  if (g.userData.portieres) return g.userData.portieres;
  if (refuse) return null;
  const vraies = vraiesPortes(g);
  if (vraies) return vraies;
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
  // la charnière d'une porte en ciseau est HAUTE (mi-hauteur de l'ouverture) :
  // posée au sol, la portière levée plongerait dans l'aile avant
  const ch = {};
  for (const cote of ['-1', '1']) {
    ch[cote] = plan.charnieres[cote].clone();
    if (opts.ciseau) ch[cote].y = (plan.y0 + plan.y1) / 2;
  }
  for (const cote of ['-1', '1']) {
    const p = new THREE.Group();
    p.name = 'Portiere_' + (cote === '-1' ? 'G' : 'D');
    p.userData.estPortiere = true;
    p.userData.cote = Number(cote);
    p.position.copy(ch[cote]);
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
      T.makeTranslation(-ch[cote].x, -ch[cote].y, -ch[cote].z).multiply(M);
      T.decompose(d.position, d.quaternion, d.scale);
      pivots[cote].add(d);
    }
    m.geometry = gs.reste;
  });
  g.add(pivots['-1']); g.add(pivots['1']);
  // LA GARNITURE (vNEXT) : l'habitacle que le modèle n'a pas, et un panneau
  // sur la face intérieure de chaque portière, qui pivote avec elle
  const gar = opts.garniture === false ? null : garnitureDe(plan, g.userData.siege || undefined);
  if (gar) {
    const c = gar.clone();
    for (const cote of ['-1', '1']) {
      const carte = c.getObjectByName('Garniture_carte' + Number(cote));
      if (!carte) continue;
      carte.removeFromParent();
      carte.position.set(0, -ch[cote].y, 0);
      pivots[cote].add(carte);
    }
    g.add(c);
  }
  // UNE PORTE EN CISEAU (la Revuelto, vNEXT) pivote vers le HAUT autour de sa
  // charnière avant, comme la vraie ; la fiche de la flotte le dit
  if (opts.ciseau) for (const cote of ['-1', '1']) pivots[cote].userData.ciseau = true;
  g.userData.portieres = { '-1': pivots['-1'], '1': pivots['1'], plan, garniture: !!gar };
  return g.userData.portieres;
}

// L'angle d'une portière, de 0 (fermée) à 1 (grande ouverte), vers
// l'EXTÉRIEUR : la portière gauche (−x) tourne de −60°, la droite de +60°.
// L'arête arrière (en +z de la charnière) part donc du côté de son flanc.
export function ouvrir(pivot, k) {
  if (!pivot) return;
  const e = k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  if (pivot.userData.ciseau) {
    // l'arête arrière monte (rotation négative autour de x : le +z local part
    // vers le haut), un peu écartée du flanc
    pivot.rotation.set(-OUVERTURE_CISEAU * e, pivot.userData.cote * 0.14 * e, 0);
    return;
  }
  pivot.rotation.y = pivot.userData.cote * OUVERTURE * e;
}

// Pour un témoin : le plan d'un modèle, sans rien fabriquer de plus.
export function planConnu(cle) { return plans.has(cle) ? plans.get(cle) : undefined; }
