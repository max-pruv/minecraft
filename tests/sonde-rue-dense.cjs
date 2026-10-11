// LA RUE DENSE, PALIERS C (v433) — sous node, la VRAIE circulation
// (`createVehicules`, les circuits comme main.js les pose), sans rien dessiner.
//
//   node tests/sonde-rue-dense.cjs jeu [villes engendrées à prendre]
//     Pour chaque convoi : un tour d'horloge au pas d'un dixième de seconde, les
//     voitures posées par la grille SEULE (`distanceA` à l'heure de chacune,
//     avec son jeu — jamais le freinage local) ; deux voisines de la file (ou de
//     la ligne, avec la jumelle) qui se touchent comptent. Le même tour sans le
//     jeu (`_jeuT = null`) : le jeu ne doit pas ajouter un seul contact.
//   node tests/sonde-rue-dense.cjs boulevards
//     Paris : le long de chaque circuit, où la section a deux voies
//     (`secondeVoieParis`) et ce que la seconde voie en garde, portion par
//     portion — et pourquoi elle le perd (virage, rampe, contact).
const { register } = require('node:module');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const RACINE = path.resolve(process.argv[4] || path.join(__dirname, '..'));
const THREE_URL = pathToFileURL(path.join(RACINE, 'vendor/three.module.min.js')).href;
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(s, c, n) {
  if (s === 'three') return { url: ${JSON.stringify(THREE_URL)}, shortCircuit: true };
  return n(s, c);
}`));
const src = (f) => pathToFileURL(path.join(RACINE, 'src', f)).href;
const mode = process.argv[2] || 'jeu'; globalThis.__dbg = !!process.env.DBG;

async function monter() {
  const { World } = await import(src('world.js'));
  const P = await import(src('paris.js'));
  const T = await import('three');
  const V = await import(src('vehicules.js'));
  const VD = await import(src('voiesdoubles.js'));
  const w = new World();
  const scene = new T.Scene();
  const player = { pos: new T.Vector3(0, -500, 0), yaw: 0, gabarit: 0.6, vel: new T.Vector3() };
  const veh = V.createVehicules({ scene, player });
  return { w, P, T, V, VD, veh };
}

// la pose d'une circulation, comme main.js (animerLesVilles)
function poser(M, tr) {
  const { V, VD, veh } = M;
  const decalage = tr.voie === 'avenue' && tr.ville !== 'ny' ? 1.3 : 0;
  const allure = VD.allureDuTroncon && (decalage ? (x, z) => VD.allureDuTroncon(tr.cle, x, z) : VD.allureVilleMonde);
  const C = require('node:module');
  return veh.circulation(tr.pts, V.graineDeVille(tr), { ville: tr.ville, voie: tr.voie || 'rue', decalage,
    voies: decalage ? (x, z) => VD.secondeVoieParis(x, z, decalage) : VD.secondeVoieVilleMonde, bus: tr.rang === 0 });
}

function rect(x, z, cap, dl = 2.5, dw = 1.13) {
  const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux;
  return [[x + ux * dl + vx * dw, z + uz * dl + vz * dw], [x + ux * dl - vx * dw, z + uz * dl - vz * dw],
    [x - ux * dl - vx * dw, z - uz * dl - vz * dw], [x - ux * dl + vx * dw, z - uz * dl + vz * dw]];
}
function touche(P, Q) {
  for (const R of [P, Q]) for (let k = 0; k < 4; k++) {
    const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0];
    let p0 = Infinity, p1 = -Infinity, q0 = Infinity, q1 = -Infinity;
    for (let j = 0; j < 4; j++) { const a = P[j][0] * ax + P[j][1] * az, b = Q[j][0] * ax + Q[j][1] * az; p0 = Math.min(p0, a); p1 = Math.max(p1, a); q0 = Math.min(q0, b); q1 = Math.max(q1, b); }
    if (p1 < q0 || q1 < p0) return false;
  }
  return true;
}
// les voitures d'un convoi à l'heure h, par la grille seule
let JOUE = 0, POSES = 0;
function poses(c, h) {
  const out = [];
  for (let i = 0; i < c.nb; i++) {
    if (c.pris && c.pris.has(i)) continue;
    const hi = h - i * c.dtVoiture, e = c.jeu ? c.jeu(i, hi + c.phase) : 0;
    POSES++; if (Math.abs(e) > 0.02) JOUE++;
    const d = c.distanceA(hi - e).d, q = c.parcours.a(d);
    out.push({ x: q.x, z: q.z, cap: c.parcours.capLisse ? c.parcours.capLisse(d) : q.cap });
  }
  return out;
}
function contacts(convs, P) {
  let n = 0, examines = 0;
  for (let h = 0; h < P; h += 0.1) {
    const tout = convs.flatMap((c) => poses(c, h));
    for (let a = 0; a < tout.length; a++) for (let b = a + 1; b < tout.length; b++) {
      const A = tout[a], B = tout[b];
      if ((A.x - B.x) ** 2 + (A.z - B.z) ** 2 > 49) continue;
      examines++;
      // en travers, c'est la cession locale ; une même ligne se juge ici
      if (Math.abs(Math.cos(A.cap - B.cap)) < 0.7) continue;
      if (touche(rect(A.x, A.z, A.cap), rect(B.x, B.z, B.cap))) n++;
    }
  }
  return { n, examines };
}

(async () => {
  const M = await monter();
  if (mode === 'jeu') {
    const { w, P } = M;
    const traces = P.circuitsParis((x, z) => w.coteRoulable(x, z)).map((t) => ({ ...t, voie: 'avenue' }));
    const VM = await import(src('villesmonde.js'));
    const nV = +(process.argv[3] || 12);
    const engendrees = VM.tracesCirculation((x, z) => w.terrainHeight(x, z));
    const prises = new Set();
    for (const t of engendrees) { if (prises.size >= nV && !prises.has(t.cle)) continue; prises.add(t.cle); traces.push(t); }
    const lignes = [];
    for (const tr of traces) {
      const c = poser(M, tr);
      if (tr.rang === 0) M.veh.bus(tr.pts, Math.abs(Math.round(tr.x + tr.z)), c);
      lignes.push({ cle: tr.cle, c });
    }
    let avec = 0, sans = 0, ex = 0, jouent = 0, total = 0, jeuPoses = 0;
    const pires = [];
    for (const { cle, c } of lignes) {
      c.horaire(); if (c.jumelle) c.jumelle.horaire();
      const convs = [c, c.jumelle].filter(Boolean);
      const P = c._horaire ? c._horaire.P : 0;
      if (!(P > 0)) continue;
      total++;
      const T = c.jeuTable ? c.jeuTable() : null;
      if (T) jouent++;
      const j0 = JOUE;
      const r1 = contacts(convs, P);
      jeuPoses += JOUE - j0;
      for (const x of convs) { x._jeuT = null; }
      const r0 = contacts(convs, P);
      for (const x of convs) { delete x._jeuT; }
      avec += r1.n; sans += r0.n; ex += r1.examines;
      if (r1.n > r0.n) pires.push([cle, c.cle.slice(0, 40), r0.n, r1.n]);
    }
    console.log(JSON.stringify({ convois: total, jouent, poses: POSES, posesQuiJouent: jeuPoses, examines: ex, contactsSansJeu: sans, contactsAvecJeu: avec, pires: pires.slice(0, 10) }));
  } else if (mode === 'ville') {
    // node tests/sonde-rue-dense.cjs ville madrid [secondes] : les voitures de
    // TOUS les convois de la ville posées par la grille, et les paires de deux
    // convois différents qui se touchent, rangées par paire de convois
    const cle = process.argv[3] || 'madrid', duree = +(process.argv[5] || 300);
    const VM = await import(src('villesmonde.js'));
    const traces = VM.tracesCirculation((x, z) => M.w.terrainHeight(x, z)).filter((t) => t.cle === cle);
    const lignes = traces.map((tr) => { const c = poser(M, tr); if (tr.rang === 0) M.veh.bus(tr.pts, Math.abs(Math.round(tr.x + tr.z)), c); return { tr, c }; });
    const convs = lignes.flatMap(({ c }) => [c, c.jumelle].filter(Boolean));
    convs.forEach((c) => c.horaire());
    const parPaire = {};
    let n = 0;
    for (let h = 0; h < duree; h += 0.2) {
      const tout = convs.flatMap((c, k) => poses(c, h).map((q, i) => ({ ...q, k, i })));
      for (let a = 0; a < tout.length; a++) for (let b = a + 1; b < tout.length; b++) {
        const A = tout[a], B = tout[b];
        if ((A.k === B.k && Math.abs(A.i - B.i) <= 1) || (A.x - B.x) ** 2 + (A.z - B.z) ** 2 > 49) continue;
        if (!touche(rect(A.x, A.z, A.cap, 2.2), rect(B.x, B.z, B.cap, 2.2))) continue;
        n++;
        const cs = Math.cos(A.cap - B.cap), fam = Math.abs(cs) > 0.7 ? (cs > 0 ? 'meme' : 'face') : 'travers';
        const kk = A.k === B.k ? `${A.k} soi ${fam}` : `${Math.min(A.k, B.k)}-${Math.max(A.k, B.k)} ${fam}`;
        const e = parPaire[kk] || (parPaire[kk] = { n: 0, x: Math.round(A.x), z: Math.round(A.z), ex: [] }); e.n++;
        // l'écart LATÉRAL (perpendiculaire au cap de A) et longitudinal
        const ux = Math.sin(A.cap), uz = Math.cos(A.cap), dx = B.x - A.x, dz = B.z - A.z;
        if (e.ex.length < 3 && e.n % 7 === 1) e.ex.push([Math.round(A.x), Math.round(A.z), +(dx * uz - dz * ux).toFixed(1), +(dx * ux + dz * uz).toFixed(1), +h.toFixed(1)]);
      }
    }
    console.log(JSON.stringify({ convois: convs.map((c, k) => k + ':' + (c.jumeauDe ? 'J' : '') + c.cle.split('|').slice(1, 3).join('|') + ' nb' + c.nb), contacts: n }));
    console.log(JSON.stringify(Object.entries(parPaire).sort((a, b) => b[1].n - a[1].n).slice(0, 12)));
  } else {
    const { w, P, VD, V } = M;
    const traces = P.circuitsParis((x, z) => w.coteRoulable(x, z));
    let brut = 0, garde = 0;
    const lignes = [];
    for (const tr of traces) {
      const c = poser(M, { ...tr, voie: 'avenue' });
      const p = c.parcoursBase || c.parcours.base || c.parcours;
      const L = p.longueur; let b = 0, virage = 0;
      for (let d = 0; d < L; d += 1) {
        const q = p.a(d);
        if (!VD.secondeVoieParis(q.x, q.z, 1.3)) continue;
        b++;
        let e = p.a(d + 4).cap - p.a(d - 4).cap; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
        if (Math.abs(e) > 1.0) virage++;
      }
      const vd = c.voiesDoubles || {};
      brut += b; garde += c.jumelle ? (vd.longueur || 0) : 0;
      lignes.push({ cle: tr.rang, L: Math.round(L), boulevard: b, virage, section: vd.longueur || 0, jumelle: !!c.jumelle, refus: vd.refus || null, nb: c.nb });
    }
    console.log(JSON.stringify({ brut, garde }));
    for (const l of lignes) console.log(JSON.stringify(l));
  }
})().catch((e) => { console.error(e); process.exit(1); });
