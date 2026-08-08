// L'atelier de modélisation : de quoi sculpter des personnages et des bêtes en
// volume — sphères, cônes, cylindres effilés, tores — au lieu d'empiler des
// cubes.
//
// Le piège, quand on passe du cube au galbe, c'est le nombre d'appels de rendu :
// un forgeron dessiné finement, c'est quarante morceaux, et quarante morceaux
// par personnage sur cinquante personnages, c'est une tablette à genoux. Donc
// tout ce qui bouge ensemble est fusionné ici même en un seul maillage, avec la
// couleur portée par les sommets. Un personnage entier coûte six appels de
// rendu — un par membre articulé — quelle que soit sa finesse.
//
// Les géométries de base sont mises en cache et partagées : mille cylindres de
// mêmes proportions ne pèsent qu'une fois en mémoire, seule leur matrice change.

import * as THREE from 'three';

// --- géométries de base, partagées -------------------------------------------

const cache = new Map();

function garder(cle, fabrique) {
  let g = cache.get(cle);
  if (!g) { g = fabrique(); cache.set(cle, g); }
  return g;
}

// Les découpes sont volontairement basses : à la taille où ces modèles sont vus
// (un personnage fait 1,7 bloc de haut), au-delà de 12 segments plus personne ne
// voit la différence, et chaque segment se paie en sommets.
//
// FINESSE rabote toutes les découpes d'un coup. Une sphère perd la moitié de ses
// triangles entre 14 et 10 segments, et à cette échelle l'œil ne fait pas la
// différence — mais la tablette, elle, la fait. Toutes les demandes de segments
// du code passent par ici : c'est le seul endroit à toucher pour arbitrer.
const FINESSE = 0.72;
const decoupe = (n) => Math.max(5, Math.round(n * FINESSE));
// Les rayons sont arrondis avant de servir de clé : sans cela chaque membre
// légèrement différent créerait sa propre géométrie et le cache ne servirait
// plus à rien.
const CYL = (haut, bas, seg) => {
  const h = Math.round(haut * 200) / 200, b = Math.round(bas * 200) / 200;
  return garder(`c${h}|${b}|${seg}`, () => new THREE.CylinderGeometry(h, b, 1, seg, 1));
};
const SPH = (seg) => garder(`s${seg}`, () => new THREE.SphereGeometry(0.5, seg, Math.max(4, seg >> 1)));
const DEMI = (seg) => garder(`d${seg}`,
  () => new THREE.SphereGeometry(0.5, seg, Math.max(4, seg >> 1), 0, Math.PI * 2, 0, Math.PI / 2));
const CONE = (seg) => garder(`k${seg}`, () => new THREE.ConeGeometry(0.5, 1, seg));
const BOITE = () => garder('b', () => new THREE.BoxGeometry(1, 1, 1));
const TORE = (tube, seg) => garder(`t${tube}|${seg}`,
  () => new THREE.TorusGeometry(0.5, tube, 6, seg));

// --- accumulateur ------------------------------------------------------------

const _mat = new THREE.Matrix4();
const _norm = new THREE.Matrix3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _pos = new THREE.Vector3();
const _ech = new THREE.Vector3();
const _v = new THREE.Vector3();
const _couleur = new THREE.Color();

class Tas {
  constructor() {
    this.pos = []; this.nor = []; this.col = []; this.idx = []; this.n = 0;
  }

  pousser(geo, m, couleur, teinte) {
    const p = geo.attributes.position;
    const nr = geo.attributes.normal;
    _norm.getNormalMatrix(m);
    _couleur.set(couleur);
    if (teinte) _couleur.multiplyScalar(teinte);
    const base = this.n;
    for (let i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(m);
      this.pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(nr, i).applyMatrix3(_norm).normalize();
      this.nor.push(_v.x, _v.y, _v.z);
      this.col.push(_couleur.r, _couleur.g, _couleur.b);
    }
    this.n += p.count;
    const ix = geo.index;
    if (ix) for (let i = 0; i < ix.count; i++) this.idx.push(base + ix.getX(i));
    else for (let i = 0; i < p.count; i++) this.idx.push(base + i);
  }

  geometrie() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.nor), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.col), 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

// Un seul matériau pour toute la population du jeu : la couleur vient des
// sommets. C'est ce qui permet de fusionner des morceaux de teintes différentes
// dans le même maillage.
let matiere = null;
export function matiereVivante() {
  if (!matiere) matiere = new THREE.MeshLambertMaterial({ vertexColors: true });
  return matiere;
}

let matiereVitre = null;
function matiereVerre() {
  if (!matiereVitre) {
    matiereVitre = new THREE.MeshLambertMaterial({
      vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false,
    });
  }
  return matiereVitre;
}

// --- l'atelier ---------------------------------------------------------------

// Chaque « membre » est un THREE.Group : c'est lui qu'on fait pivoter pour
// animer la marche. Les morceaux déposés dedans finissent fusionnés en un seul
// maillage attaché à ce groupe.
export class Atelier {
  constructor() {
    this.membres = new Map();   // nom -> { tas, verre, pivot, parent }
    this.courant = null;
    this.membre('tronc', [0, 0, 0]);
  }

  // pivot : le point autour duquel le membre tourne, en coordonnées du modèle.
  membre(nom, pivot = [0, 0, 0], parent = null) {
    if (!this.membres.has(nom)) {
      this.membres.set(nom, { tas: new Tas(), verre: null, pivot, parent });
    }
    this.courant = this.membres.get(nom);
    return this;
  }

  // p : position, r : rotation (radians), e : échelle (x,y,z), t : teinte
  // multiplicative — pratique pour ombrer un pli sans inventer une couleur.
  _poser(geo, couleur, o) {
    const p = o.p || [0, 0, 0];
    const r = o.r || [0, 0, 0];
    const e = o.e || [1, 1, 1];
    const pv = this.courant.pivot;
    _pos.set(p[0] - pv[0], p[1] - pv[1], p[2] - pv[2]);
    _euler.set(r[0], r[1], r[2], o.ordre || 'XYZ');
    _quat.setFromEuler(_euler);
    _ech.set(e[0], e[1], e[2]);
    _mat.compose(_pos, _quat, _ech);
    if (o.verre) {
      if (!this.courant.verre) this.courant.verre = new Tas();
      this.courant.verre.pousser(geo, _mat, couleur, o.t);
    } else {
      this.courant.tas.pousser(geo, _mat, couleur, o.t);
    }
    return this;
  }

  boite(couleur, o) { return this._poser(BOITE(), couleur, o); }

  sphere(couleur, o) { return this._poser(SPH(decoupe(o.seg || 12)), couleur, o); }

  demiSphere(couleur, o) { return this._poser(DEMI(decoupe(o.seg || 12)), couleur, o); }

  cone(couleur, o) { return this._poser(CONE(decoupe(o.seg || 12)), couleur, o); }

  tore(couleur, o) { return this._poser(TORE(o.tube || 0.18, decoupe(o.seg || 12)), couleur, o); }

  // Cylindre effilé : c'est la brique de base de toute anatomie. Un bras, une
  // cuisse, un cou, une tour de château — tout est un tronc de cône.
  cylindre(couleur, o) {
    const seg = decoupe(o.seg || 10);
    const haut = o.haut ?? 0.5, bas = o.bas ?? haut;
    const e = o.e || [1, 1, 1];
    return this._poser(CYL(haut, bas, seg), couleur, { ...o, e: [e[0], e[1], e[2]] });
  }

  // Un membre galbé : cylindre effilé + rotule sphérique à chaque bout. C'est
  // ce qui distingue une jambe d'un bâton.
  membreGalbe(couleur, o) {
    const { de, a, r1, r2 = r1, seg = 8, t } = o;
    const dx = a[0] - de[0], dy = a[1] - de[1], dz = a[2] - de[2];
    const L = Math.hypot(dx, dy, dz) || 1e-6;
    const milieu = [(de[0] + a[0]) / 2, (de[1] + a[1]) / 2, (de[2] + a[2]) / 2];
    // Le cylindre pointe vers +y ; on l'aligne sur le segment. L'ordre YXZ est
    // indispensable : il faut incliner d'abord, pivoter ensuite, sinon le
    // membre part de travers dès qu'il n'est pas dans un plan principal.
    const ry = Math.atan2(dx, dz);
    const rx = Math.acos(Math.max(-1, Math.min(1, dy / L)));
    // radiusTop est du côté « a », radiusBottom du côté « de »
    this.cylindre(couleur, {
      p: milieu, r: [rx, ry, 0], ordre: 'YXZ', e: [r1 * 2, L, r1 * 2],
      haut: (r2 / r1) * 0.5, bas: 0.5, seg, t,
    });
    // Une seule rotule, au bout « a ». Chaînés, deux segments posaient chacun
    // leur sphère au même coude : c'était payer deux fois la même articulation,
    // et sur un personnage entier cela faisait des centaines de triangles pour
    // rien. Le départ se ferme tout seul, enfoui dans le tronc ou l'épaule.
    this.sphere(couleur, { p: a, e: [r2 * 2, r2 * 2, r2 * 2], seg, t });
    if (o.debut) this.sphere(couleur, { p: de, e: [r1 * 2, r1 * 2, r1 * 2], seg, t });
    return this;
  }

  // Une étoffe : un plan très fin, légèrement galbé par une sphère écrasée.
  etoffe(couleur, o) {
    return this._poser(SPH(decoupe(o.seg || 10)), couleur, o);
  }

  // Monte tout : un THREE.Group racine, un sous-groupe par membre articulé,
  // chacun portant un unique maillage fusionné.
  finir() {
    const racine = new THREE.Group();
    const groupes = {};
    for (const [nom, m] of this.membres) {
      const g = new THREE.Group();
      g.position.set(m.pivot[0], m.pivot[1], m.pivot[2]);
      if (m.tas.n) g.add(new THREE.Mesh(m.tas.geometrie(), matiereVivante()));
      if (m.verre && m.verre.n) {
        const v = new THREE.Mesh(m.verre.geometrie(), matiereVerre());
        v.renderOrder = 2;
        g.add(v);
      }
      groupes[nom] = g;
    }
    // les membres déclarés avec un parent s'y accrochent (l'avant-bras suit le
    // bras), les autres pendent à la racine
    for (const [nom, m] of this.membres) {
      const parent = m.parent && groupes[m.parent] ? groupes[m.parent] : racine;
      if (parent !== racine) {
        // repositionner en coordonnées du parent
        const pp = this.membres.get(m.parent).pivot;
        groupes[nom].position.set(m.pivot[0] - pp[0], m.pivot[1] - pp[1], m.pivot[2] - pp[2]);
      }
      parent.add(groupes[nom]);
    }
    racine.userData.membres = groupes;
    return racine;
  }
}

// Nombre de maillages réellement produits — les tests s'en servent pour vérifier
// que la fusion fait bien son travail.
export function compterMaillages(objet) {
  let n = 0;
  objet.traverse((o) => { if (o.isMesh) n++; });
  return n;
}
