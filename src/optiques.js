// LES FEUX D'UNE VOITURE SUIVENT LE DESSIN DE SON OPTIQUE (v569, v587).
// Max : « les phares des voitures font des ronds très génériques et ne
// respectent pas la forme réelle du phare ». La v569 avait fait des PHARES
// une copie des triangles de l'optique du modèle ; les feux stop et de recul
// restaient deux disques, les feux de détresse deux rectangles orange, et
// quinze modèles sur quarante et un n'avaient AUCUNE optique reconnue à
// l'avant (une livrée peinte d'un seul tenant, un maillage « Optics » que la
// règle ne nommait pas). Ce module est la seule règle qui trouve une optique,
// pour tous les feux : on COPIE ses triangles à fleur, jamais une forme.
//
// Une optique se reconnaît par rangs, du plus sûr au moins sûr :
//   1. ce qui ÉMET déjà dans la zone (le modèle a dessiné sa lumière) ;
//   2. ce qui est NOMMÉ comme ce feu (`Headlight`, `Taillight`, `Optics`) ;
//   3. le verre nommé d'une optique (`Smoked headlamp lenses`) ;
//   4. LA COULEUR DE LA TEXTURE sous chaque triangle : une livrée peinte
//      porte ses phares et ses feux dans son image (la voiture de police, le
//      taxi, les dix génériques). On lit le pixel au centre UV de chaque
//      triangle, une fois par modèle (un canevas réduit par texture).
// Rien de tout cela : pas de lueur sur la tôle — on ne dessine pas une forme
// qu'on ne connaît pas. Sous node (aucune image), le rang 4 ne voit rien.
//
// Pur de toute règle de jeu : three seulement. `phares.js` et `vehicules.js`
// le lisent ; le prototype d'un modèle se demande à l'appelant (`propre`).
import * as THREE from 'three';

const RE_PAS = /plastic|chrome_trim|lightly|interior|inside|inner|^int_|_int_|guide|windshield|wheel|reflector|gear|carbon|racelogic|aux|grille|badge|cabin|dome|seat|housing|fog|disc|caliper|pneu|tire|tyre/i;
const RE_AVANT = /light|lamp|phare|drl|daytime|optique|optic|lens|lentille/i;
const RE_PAS_AVANT = /rear|(?<![a-z])tail|brake|(?<![a-z])back|turn|amber|orange|indicat|clignot|stop|reverse/i;
const RE_ARRIERE = /(?<![a-z])tail|rear.?l|brake.?(l|on)|stop|feu.?ar|(?<![a-z])back.?l|light|lamp|optique|optic|lens|lentille/i;
const RE_PAS_ARRIERE = /head|front|phare|drl|daytime|turn|amber|orange|indicat|clignot|low.?beam|high.?beam/i;
const RE_CLIGNO = /turn|amber|orange|indicat|clignot|blinker|signal/i;
const RE_VERRE = /glass|lens|lentille|verre/i;
const RE_LAQUE = /paint|laque|body_?paint/i;
export const DECALE = 0.012;            // à fleur, devant la face qu'elle couvre
const TRIANGLES_MAX = 12000;            // par côté : au-delà, un triangle sur n
const PIXELS = 256;                     // côté du canevas réduit d'une texture

export function lumEmissive(mt) {
  if (!mt || !mt.emissive) return 0;
  const e = mt.emissive, k = mt.emissiveIntensity == null ? 1 : mt.emissiveIntensity;
  return (0.2126 * e.r + 0.7152 * e.g + 0.0722 * e.b) * k;
}
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export const cleSource = (o) => `${o.name || ''}|${(o.material && o.material.name) || ''}`;

// LA COULEUR QUE CHAQUE FEU PORTE (rgb sRGB de 0 à 1). Un phare est clair et
// neutre (le verre et le chrome du réflecteur) ; un feu stop rouge franc ; un
// feu de recul blanc, dans le bloc arrière.
export const COULEUR = {
  avant: (r, g, b) => lum(r, g, b) > 0.62 && Math.max(r, g, b) - Math.min(r, g, b) < 0.3,
  arriere: (r, g, b) => r > 0.35 && r > 1.7 * g && r > 1.7 * b,
  recul: (r, g, b) => lum(r, g, b) > 0.62 && Math.max(r, g, b) - Math.min(r, g, b) < 0.25,
};

// Les pixels d'une texture, réduits, gardés par image. null sans navigateur.
const pixelsParImage = new WeakMap();
function pixelsDe(tex) {
  const img = tex && tex.image;
  if (!img || !img.width || typeof document === 'undefined') return null;
  if (pixelsParImage.has(img)) return pixelsParImage.get(img);
  let px = null;
  try {
    const c = document.createElement('canvas'); c.width = PIXELS; c.height = PIXELS;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, PIXELS, PIXELS);
    const d = ctx.getImageData(0, 0, PIXELS, PIXELS);
    px = d && d.data && d.data.length === PIXELS * PIXELS * 4 ? d.data : null;
  } catch (e) { px = null; }
  pixelsParImage.set(img, px);
  return px;
}
const _uv = new THREE.Vector2();
// La couleur sous un point UV : la texture (transformée comme three la pose)
// multipliée par la couleur du matériau.
function couleurEn(mt, px, u, v, out) {
  _uv.set(u, v);
  if (mt.map.matrixAutoUpdate) mt.map.updateMatrix();
  mt.map.transformUv(_uv);
  // une glTF ne retourne pas ses images (flipY faux) : v se lit vers le bas
  const x = Math.min(PIXELS - 1, Math.max(0, Math.floor(_uv.x * PIXELS)));
  const y = Math.min(PIXELS - 1, Math.max(0, Math.floor((mt.map.flipY ? 1 - _uv.y : _uv.y) * PIXELS)));
  const i = 4 * (y * PIXELS + x), c = mt.color || { r: 1, g: 1, b: 1 };
  // la couleur du matériau est linéaire : on la ramène en sRGB pour la multiplier
  const s = (k) => Math.pow(Math.max(0, k), 1 / 2.2);
  out[0] = px[i] / 255 * s(c.r); out[1] = px[i + 1] / 255 * s(c.g); out[2] = px[i + 2] / 255 * s(c.b);
  return out;
}

// La zone d'un feu dans le repère de la voiture (nez vers −z) : le premier
// ou le dernier quart, sous les sept dixièmes de la hauteur.
function zone(boite, sens) {
  const L = boite.max.z - boite.min.z, h = boite.max.y - boite.min.y;
  return { avant: sens !== 'arriere', zLim: sens === 'arriere' ? boite.max.z - L * 0.25 : boite.min.z + L * 0.25, yMax: boite.min.y + h * 0.7, demi: Math.max(-boite.min.x, boite.max.x) };
}
const dansZone = (z, cz) => (z.avant ? cz <= z.zLim : cz >= z.zLim);

// Les maillages de la voiture dans son repère, feux posés exclus.
function maillages(m) {
  m.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(m.matrixWorld).invert();
  const boite = new THREE.Box3(), b = new THREE.Box3(), out = [];
  m.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    for (let p = o; p && p !== m; p = p.parent) if (p.name === 'phares' || p.name === 'detresse' || p.name === 'feux-arriere' || p.visible === false) return;
    const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    b.copy(o.geometry.boundingBox).applyMatrix4(rel);
    // les roues comptent dans la boîte (la hauteur se lit depuis la route),
    // jamais parmi les optiques
    boite.union(b);
    if (/^(Wheel|Pneu|Roue|Essieu)/i.test(o.name || '') || Array.isArray(o.material)) return;
    out.push({ o, rel, b: b.clone() });
  });
  // la part de la longueur qu'un maillage couvre : un maillage d'optiques
  // d'un seul tenant (phares ET feux arrière) se filtre par sa couleur
  const L = Math.max(1e-6, boite.max.z - boite.min.z);
  for (const e of out) e.long = (e.b.max.z - e.b.min.z) / L;
  return { boite, liste: out };
}

// Choisir les maillages d'une optique : { choisis, verres, rang, couleur }.
// `couleur` (rang 4, ou un filtre sur un maillage nommé qui porte une
// texture) dit quels triangles garder ; sinon tous.
function choisir(liste, z, sens) {
  const rangs = [[], [], [], []];
  for (const e of liste) {
    if (z.avant ? e.b.min.z > z.zLim : e.b.max.z < z.zLim) continue;
    const mt = e.o.material, nom = cleSource(e.o);
    if (RE_PAS.test(nom)) continue;
    let nomme, emet;
    const em = lumEmissive(mt) > 0.1 && !RE_LAQUE.test(mt.name || '');
    if (sens === 'avant') {
      nomme = RE_AVANT.test(nom) && !RE_PAS_AVANT.test(nom);
      emet = em && !RE_PAS_AVANT.test(nom);
    } else if (sens === 'arriere') {
      nomme = RE_ARRIERE.test(nom) && !RE_PAS_ARRIERE.test(nom);
      emet = em && !RE_PAS_ARRIERE.test(nom) && mt.emissive.r > 1.5 * mt.emissive.g;
    } else {
      nomme = RE_CLIGNO.test(nom);
      emet = false;
    }
    if (emet) rangs[0].push(e);
    else if (nomme && !RE_VERRE.test(nom)) rangs[1].push(e);
    else if (nomme && (sens !== 'avant' || /head|phare|optique|optic|lamp/i.test(nom))) rangs[2].push(e);
  }
  if (rangs[0].length || rangs[1].length) return { choisis: [...rangs[0], ...rangs[1]], verres: sens === 'avant' ? rangs[2] : [], rang: rangs[0].length ? 1 : 2 };
  if (rangs[2].length) return { choisis: rangs[2], verres: [], rang: 3 };
  // rang 4 : tout maillage texturé de la zone, filtré par la couleur du pixel
  // les détails d'un modèle d'abord ; la livrée (qui porte aussi les
  // autocollants et la peinture) seulement s'ils ne donnent rien
  const textures = liste.filter((e) => (z.avant ? e.b.min.z <= z.zLim : e.b.max.z >= z.zLim)
    && e.o.material.map && e.o.geometry.attributes.uv && pixelsDe(e.o.material.map) && !RE_PAS.test(cleSource(e.o)));
  const livree = (e) => /livree|livery/i.test(cleSource(e.o));
  const details = textures.filter((e) => !livree(e));
  return { choisis: textures, details, verres: [], rang: textures.length ? 4 : 0, couleur: COULEUR[sens] };
}

// Les triangles des maillages `choisis` dans la zone, copiés à fleur, par
// côté (gauche puis droite). `couleur` filtre les triangles d'une texture.
function copier(choisis, z, couleur, rang) {
  const tris = [[], []], src = [new Map(), new Map()];
  const a = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3(), t = new THREE.Vector3();
  const rgb = [0, 0, 0];
  for (const { o, rel, long } of choisis) {
    const pos = o.geometry.attributes.position, idx = o.geometry.index, uv = o.geometry.attributes.uv;
    const mt = o.material;
    // un maillage nommé qui porte une texture se filtre aussi par sa couleur
    // (le maillage « Optics » des génériques porte phares ET feux arrière) —
    // si le filtre ne laisse rien, on garde tout
    const px = couleur && (rang === 4 || long > 0.6) && mt.map && uv ? pixelsDe(mt.map) : null;
    // au rang 4, un maillage dont on ne lit pas les pixels ne dit rien
    if (rang === 4 && !px) continue;
    const nb = idx ? idx.count / 3 : pos.count / 3;
    const tmp = [];
    let surfTout = 0;
    for (let i = 0; i < nb; i++) {
      const i0 = idx ? idx.getX(3 * i) : 3 * i, i1 = idx ? idx.getX(3 * i + 1) : 3 * i + 1, i2 = idx ? idx.getX(3 * i + 2) : 3 * i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(rel);
      c.fromBufferAttribute(pos, i1).applyMatrix4(rel);
      d.fromBufferAttribute(pos, i2).applyMatrix4(rel);
      const cz = (a.z + c.z + d.z) / 3, cy = (a.y + c.y + d.y) / 3, cx = (a.x + c.x + d.x) / 3;
      // le triangle ENTIER dans la zone : un grand triangle de carrosserie
      // dont seul le centre y tombe n'est pas une optique
      if (!dansZone(z, a.z) || !dansZone(z, c.z) || !dansZone(z, d.z) || Math.max(a.y, c.y, d.y) > z.yMax - DECALE) continue;
      n.subVectors(c, a).cross(t.subVectors(d, a));
      const aire = n.length();
      if (aire < 1e-9) continue;
      n.divideScalar(aire);
      // la normale sortante : celle qui ne rentre pas dans la voiture
      const sz = z.avant ? 1 : -1;
      if (sz * n.z > 0.05 || (Math.abs(n.z) <= 0.05 && n.x * cx < 0)) n.negate();
      if (sz * n.z > 0.2 || n.y < -0.5) continue;
      // lue dans une livrée, une optique regarde vers son bout : un flanc
      // blanc (la portière d'une voiture de police) n'est pas un phare
      if (rang === 4 && sz * n.z > -0.35) continue;
      let ok = true;
      surfTout += aire;
      if (px) {
        const u = (uv.getX(i0) + uv.getX(i1) + uv.getX(i2)) / 3, v = (uv.getY(i0) + uv.getY(i1) + uv.getY(i2)) / 3;
        couleurEn(mt, px, u, v, rgb);
        ok = couleur(rgb[0], rgb[1], rgb[2]);
      }
      tmp.push({ ok, aire, k: cx < 0 ? 0 : 1, cx, v: [a.x + n.x * DECALE, a.y + n.y * DECALE, a.z + n.z * DECALE, c.x + n.x * DECALE, c.y + n.y * DECALE, c.z + n.z * DECALE, d.x + n.x * DECALE, d.y + n.y * DECALE, d.z + n.z * DECALE] });
    }
    let filtres = tmp.filter((x) => x.ok);
    // UNE OPTIQUE EST UNE PETITE PART DU BOUT DE LA VOITURE : lue dans une
    // livrée, une couleur qui en couvre plus du tiers est la peinture (le
    // taxi jaune, qu'on aurait allumé tout entier en ambre)
    if (rang === 4 && filtres.reduce((n, x) => n + x.aire, 0) > 0.33 * surfTout) filtres = [];
    const retenus = rang === 4 || filtres.length ? filtres : tmp;
    for (const x of retenus) {
      tris[x.k].push({ cx: x.cx, v: x.v, aire: x.aire });
      if (!src[x.k].has(cleSource(o))) {
        const col = mt.color;
        src[x.k].set(cleSource(o), { cle: cleSource(o), lum: col ? lum(col.r, col.g, col.b) : 0, em: lumEmissive(mt) });
      }
    }
  }
  // ET UNE OPTIQUE EST D'UN SEUL TENANT, SUR LE CÔTÉ : lue dans une texture,
  // une couleur semée sur tout le bout de la voiture (le taxi, ses triangles
  // rouges épars) n'en dessine aucune, et ce qui est au milieu est un écusson
  // ou un lettrage (le « M » du SUV de police, « POLICE » sur le coffre).
  if (rang === 4) for (const k of [0, 1]) tris[k] = amas(tris[k], z.demi);
  return { tris, src };
}

// Le plus grand morceau d'un seul tenant (triangles qui se touchent par un
// sommet) : il doit porter l'essentiel de la surface du côté, compter
// quelques triangles, ne pas être au milieu de la voiture ni prendre tout le
// bouclier.
const TOUCHE = 0.02, AMAS_PART = 0.5, AMAS_MIN = 4, AMAS_COTE = 0.3, AMAS_LARGE = 0.6;
function amas(t, demi) {
  if (!t.length) return t;
  const n = t.length, pere = Array.from({ length: n }, (_, i) => i);
  const racine = (i) => { while (pere[i] !== i) i = pere[i] = pere[pere[i]]; return i; };
  const cases = new Map(), q = (x) => Math.round(x / TOUCHE);
  for (let i = 0; i < n; i++) {
    const v = t[i].v;
    for (let j = 0; j < 9; j += 3) {
      const cle = q(v[j]) + ',' + q(v[j + 1]) + ',' + q(v[j + 2]);
      const autre = cases.get(cle);
      if (autre === undefined) cases.set(cle, i); else pere[racine(i)] = racine(autre);
    }
  }
  const aires = new Map(); let total = 0;
  for (let i = 0; i < n; i++) { const r = racine(i); aires.set(r, (aires.get(r) || 0) + t[i].aire); total += t[i].aire; }
  let meilleur = -1, am = -1;
  for (const [r, a] of aires) if (a > am) { am = a; meilleur = r; }
  const garde = t.filter((x, i) => racine(i) === meilleur);
  const cx = garde.reduce((s, x) => s + x.cx * x.aire, 0) / am;
  let x0 = Infinity, x1 = -Infinity;
  for (const x of garde) for (let j = 0; j < 9; j += 3) { x0 = Math.min(x0, x.v[j]); x1 = Math.max(x1, x.v[j]); }
  // et une optique n'est pas tout le bouclier (la livrée blanche de l'Alpine)
  if (garde.length < AMAS_MIN || am < AMAS_PART * total || Math.abs(cx) < AMAS_COTE * demi || x1 - x0 > AMAS_LARGE * demi) return [];
  return garde;
}

// Au rang 4, les détails d'abord, la livrée ensuite.
function copierRang(ch, z, coul) {
  if (ch.rang === 4 && ch.details && ch.details.length) {
    const c = cotes(copier(ch.details, z, coul, 4));
    if (c.length) return c;
  }
  return cotes(copier(ch.choisis, z, coul, ch.rang));
}

function geometrie(liste) {
  let arr = [];
  for (const t of liste) arr.push(...t.v);
  const nt = arr.length / 9;
  if (nt > TRIANGLES_MAX) {
    const pas = Math.ceil(nt / TRIANGLES_MAX), r = [];
    for (let i = 0; i < nt; i += pas) for (let j = 0; j < 9; j++) r.push(arr[9 * i + j]);
    arr = r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  geo.computeBoundingBox();
  const centre = geo.boundingBox.getCenter(new THREE.Vector3());
  geo.translate(-centre.x, -centre.y, -centre.z);
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  geo.userData.partagee = true;
  return { geo, centre };
}

function cotes({ tris, src }) {
  const out = [];
  for (const k of [0, 1]) if (tris[k].length) out.push({ ...geometrie(tris[k]), sources: [...src[k].values()], k });
  return out;
}

// LES OPTIQUES D'UN MODÈLE POUR UN FEU. `sens` : 'avant' (les phares),
// 'arriere' (les feux stop), 'recul', 'clignotant'. Rend
// { cotes: [{ geo, centre, sources }], verres, rang }. Une fois par modèle,
// mesurées sur le prototype (`propre`, v550), géométries partagées.
const parModele = new Map();
export function optiquesDe(m, sens, propre = null) {
  const cle = m.userData && m.userData.flotte && m.userData.roues ? m.userData.flotte : null;
  const k = cle && `${cle}|${sens}`;
  if (k && parModele.has(k)) return parModele.get(k);
  if (propre) { const r = optiquesDe(propre, sens); if (k) parModele.set(k, r); return r; }
  const { boite, liste } = maillages(m);
  let r = { cotes: [], verres: [], rang: 0 };
  if (!boite.isEmpty()) {
    if (sens === 'recul') r = recul(m, liste, boite);
    else if (sens === 'clignotant') r = clignotants(m, liste, boite);
    else {
      const z = zone(boite, sens);
      const ch = choisir(liste, z, sens);
      const coul = ch.couleur || (sens === 'arriere' ? COULEUR.arriere : COULEUR.avant);
      r = { cotes: copierRang(ch, z, coul), verres: cotes(copier(ch.verres, z, null, ch.rang)), rang: ch.rang };
    }
    if (!r.cotes.length) r.rang = 0;
  }
  if (k) parModele.set(k, r);
  return r;
}

// LE FEU DE RECUL : la part blanche du bloc arrière. Nommé (`reverse`,
// `recul`, `backup`) s'il l'est ; sinon les triangles du bloc arrière dont le
// pixel est blanc ; sinon la part du bloc la plus proche de l'axe (un tiers),
// là où la plupart des voitures logent leur feu de recul — la FORME reste
// celle du bloc, jamais un disque.
function recul(m, liste, boite) {
  const z = zone(boite, 'arriere');
  const nommes = liste.filter((e) => e.b.max.z >= z.zLim && /reverse|recul|backup|back.?up/i.test(cleSource(e.o)));
  if (nommes.length) {
    const c = cotes(copier(nommes, z, null, 2));
    if (c.length) return { cotes: c, verres: [], rang: 2 };
  }
  const ch = choisir(liste, z, 'arriere');
  if (!ch.choisis.length) return { cotes: [], verres: [], rang: 0 };
  const blancs = copier(ch.choisis, z, COULEUR.recul, 4);
  if (blancs.tris[0].length + blancs.tris[1].length > 0) return { cotes: cotes(blancs), verres: [], rang: 4 };
  const tout = copier(ch.choisis, z, ch.couleur || COULEUR.arriere, ch.rang);
  for (const k of [0, 1]) {
    const t = tout.tris[k];
    if (!t.length) continue;
    const ax = t.map((x) => Math.abs(x.cx)), lo = Math.min(...ax), hi = Math.max(...ax);
    tout.tris[k] = t.filter((x) => Math.abs(x.cx) <= lo + (hi - lo) / 3);
  }
  return { cotes: cotes(tout), verres: [], rang: ch.rang };
}

// LES CLIGNOTANTS (les feux de détresse) : les optiques ambre nommées, à
// l'avant et à l'arrière ; sinon le bloc du phare et le bloc arrière eux-mêmes, que le feu de détresse allume
// en ambre — la forme de l'optique, jamais un rectangle.
function clignotants(m, liste, boite) {
  const out = [];
  let rangMin = 9;
  for (const sens of ['avant', 'arriere']) {
    const z = zone(boite, sens);
    // un clignotant se NOMME ; lu à la couleur, l'ambre d'une livrée (le taxi
    // jaune, ses reflets orangés) s'allumait en éclats épars
    let ch = choisir(liste, z, 'clignotant');
    let c = ch.choisis.length && ch.rang < 4 ? copierRang(ch, z, null) : [];
    let rg = ch.rang;
    if (!c.length) {
      // repli : l'optique du bout, mais seulement une optique NOMMÉE ou
      // émissive — reprise à la couleur d'une texture, elle rendait sur un
      // modèle bas en triangles (le taxi) des éclats ambre épars
      ch = choisir(liste, z, sens);
      c = ch.rang < 4 ? copierRang(ch, z, ch.couleur || COULEUR[sens]) : [];
      rg = ch.rang;
    }
    for (const x of c) out.push({ ...x, sens });
    if (c.length) rangMin = Math.min(rangMin, rg);
  }
  return { cotes: out, verres: [], rang: out.length ? rangMin : 0 };
}

// Une source de lueur est-elle encore là, et entière ? Une pièce détachée
// (`degats3d.detacher`) quitte la voiture ; un feu cassé ou calciné reçoit un
// matériau à lui, assombri — sa lueur s'éteint avec lui. On compare au
// matériau du PROTOTYPE, relevé à la mesure.
export function sourceIntacte(s, m) {
  let p = s.o;
  while (p && p !== m) p = p.parent;
  if (!p) return false;
  const mt = s.o.material;
  if (!mt) return false;
  if (s.em > 0.1 && lumEmissive(mt) <= 0.05) return false;
  const c = mt.color;
  return !c || !s.lum || lum(c.r, c.g, c.b) > 0.6 * s.lum;
}

// Les maillages de CETTE voiture d'où viennent les lueurs, par leur nom.
export function sourcesDe(m, cote) {
  const parCle = new Map();
  m.traverse((o) => { if (o.isMesh && !Array.isArray(o.material)) { const k = cleSource(o); if (!parCle.has(k)) parCle.set(k, []); parCle.get(k).push(o); } });
  const out = [];
  for (const sc of cote.sources) for (const o of parCle.get(sc.cle) || []) out.push({ o, lum: sc.lum, em: sc.em });
  return out;
}

// Une lueur : la copie à fleur, posée à son centre, dessinée avant les
// verres (v569 : une optique sous une glace se dessine d'abord).
export function lueurDe(cote, matiere, nom) {
  const l = new THREE.Mesh(cote.geo, matiere);
  l.name = nom;
  l.position.copy(cote.centre);
  l.frustumCulled = false;
  l.renderOrder = -1;
  return l;
}
