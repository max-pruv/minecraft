// LA RUE DENSE, PALIERS C (v438) — sous node, la VRAIE circulation
// (`createVehicules`, les circuits comme main.js les pose), sans rien dessiner.
//
//   node tests/sonde-rue-dense.cjs jeu [villes engendrées à prendre]
//     Pour chaque convoi : un tour d'horloge au pas d'un dixième de seconde, les
//     voitures posées par la grille SEULE (`distanceA` à l'heure de chacune,
//     avec son jeu — jamais le freinage local) ; deux voisines de la file (ou de
//     la ligne, avec la jumelle) qui se touchent comptent. Le même tour sans le
//     jeu (`_jeuT = null`) : le jeu ne doit pas ajouter un seul contact.
//   node tests/sonde-rue-dense.cjs raccords [_ racine]
//     Chaque raccord route/ville engendrée : où son avenue rencontre la voie
//     d'un anneau, la table `RACCORDS_COURTS` qu'en tire la règle, et le
//     partage qui reste sur tout le tracé (avenue entière, raccord court, ce
//     que le jeu fait, arrêt à la porte). plafond.js lit la ligne BILAN.
//   node tests/sonde-rue-dense.cjs bus
//     Le grand anneau de chaque ville et son bus : à mi-temps (v438) ou à la
//     place de la voiture 0 (v442), les contacts de grille et le jeu.
//   node tests/sonde-rue-dense.cjs tranches
//     La fabrique par tranches (v443) contre le calcul d'un seul tenant.
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
globalThis.__dbg = !!process.env.DBG;
// le relevé que rendent `raccords` et `bus` à qui requiert ce fichier (plafond.js)
let RESULTAT = null;

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

async function principal(mode) {
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
  } else if (mode === 'routes') {
    // node tests/sonde-rue-dense.cjs routes : pour chaque autoroute, la
    // longueur de son tracé (dans les villes) qui roule sur la voie d'un
    // circuit de la ville — même sens (on s'y suit) ou en face — à moins de
    // 1,6 bloc latéral : c'est là que deux grilles indépendantes se touchent.
    const RO = await import(src('routes.js'));
    const VM = await import(src('villesmonde.js'));
    const [Pa, Li, Lo, Ni] = await Promise.all(['paris.js', 'lille.js', 'londres.js', 'nice.js'].map((f) => import(src(f))));
    const ENTREES = { paris: Pa.ENTREES_PARIS, lille: Li.ENTREES_LILLE, londres: Lo.ENTREES_LONDRES, nice: Ni.ENTREES_NICE };
    const { w, V, T } = M;
    const entree = (cle, route) => {
      const i = RO.entreesDe(cle).findIndex((e) => e.route === route);
      if (i < 0) return undefined;
      if (ENTREES[cle]) return ENTREES[cle][i];
      const fiche = RO.segmentsDeRoute().find((sg) => sg.route.nom === route);
      if (fiche && fiche.route.avenues && fiche.route.avenues[cle]) return fiche.route.avenues[cle];
      const e = RO.entreesDe(cle)[i];
      return VM.avenueDEntree(cle, e.x, e.z) || undefined;
    };
    const anneaux = VM.tracesCirculation((x, z) => w.terrainHeight(x, z));
    const parVille = new Map();
    for (const t of anneaux) { const l = parVille.get(t.cle) || []; l.push(t); parVille.set(t.cle, l); }
    // les circuits d'une ville, posés comme la rue les pose (voie de droite)
    const voiesDe = (cle) => (parVille.get(cle) || []).map((tr) => { const c = poser(M, tr); return c.parcours; });
    const res = [];
    for (const seg of RO.segmentsDeRoute()) {
      const pts = RO.traceRoute(seg, { avant: entree(seg.de, seg.route.nom), apres: entree(seg.vers, seg.route.nom), coteDe: (x, z) => w.coteRoulable(x, z) + 1 });
      const pr = new V.Parcours(pts);
      for (const cle of [seg.de, seg.vers]) {
        const ps = voiesDe(cle);
        if (!ps.length) continue;
        let meme = 0, face = 0, blvd = 0;
        for (let d = 0; d < pr.longueur; d += 1) {
          const q = pr.a(d), cq = pr.capLisse(d);
          let mm = false, ff = false;
          for (const p of ps) {
            for (let e = 0; e < p.longueur; e += 1) {
              const r = p.a(e); if ((r.x - q.x) ** 2 + (r.z - q.z) ** 2 > 2.56) continue;
              const cs = Math.cos(p.capLisse(e) - cq); if (cs > 0.7) mm = true; else if (cs < -0.7) ff = true;
            }
          }
          if (mm) meme++; if (ff) face++; if ((mm || ff) && M.VD.secondeVoieVilleMonde(q.x, q.z)) blvd++;
        }
        res.push([seg.route.nom, cle, meme, face, blvd]);
      }
    }
    for (const r of res.filter((r) => r[2] + r[3] > 0)) console.log(JSON.stringify(r));
    console.log('routes', res.length, 'touchées', res.filter((r) => r[2] + r[3] > 0).length);
  } else if (mode === 'bus') {
    // node tests/sonde-rue-dense.cjs bus [villes] : le grand anneau de chaque
    // ville (et de Paris) et son bus, un tour d'horloge par la grille seule.
    // v438 : le bus à mi-temps entre les voitures 0 et 1, l'anneau sans jeu ;
    // v442 : le bus à la place de la voiture 0, l'anneau joue. Les contacts
    // « même axe » de la ligne (file, jumelle, bus), et ceux du bus.
    const VM = await import(src('villesmonde.js'));
    const nV = +(process.argv[3] || 300);
    const traces = [
      ...M.P.circuitsParis((x, z) => M.w.coteRoulable(x, z)).map((t) => ({ ...t, voie: 'avenue' })),
      ...VM.tracesCirculation((x, z) => M.w.terrainHeight(x, z)),
    ].filter((t) => t.rang === 0).slice(0, nV);
    const res = {};
    for (const miTemps of [true, false]) {
      M.veh.busAMiTemps(miTemps);
      const lignes = traces.map((tr) => { const c = poser(M, tr); const b = M.veh.bus(tr.pts, Math.abs(Math.round(tr.x + tr.z)), c); return { c, b }; });
      let n = 0, nBus = 0, jouent = 0, total = 0, poses0 = 0, posesJ = 0, voitures = 0, jumelles = 0;
      for (const { c, b } of lignes) {
        c.horaire(); if (c.jumelle) c.jumelle.horaire(); b.horaire();
        const P = c._horaire ? c._horaire.P : 0; if (!(P > 0)) continue;
        total++; if (c.jeuTable()) jouent++;
        voitures += c.nb - c.pris.size + (c.jumelle ? c.jumelle.nb : 0); if (c.jumelle) jumelles++;
        const convs = [c, c.jumelle].filter(Boolean);
        for (let h = 0; h < P; h += 0.1) {
          const j0 = JOUE, p0 = POSES;
          const tout = convs.flatMap((x) => poses(x, h).map((q) => ({ ...q, dl: 2.5 })));
          posesJ += JOUE - j0; poses0 += POSES - p0;
          const qb = poses(b, h)[0]; if (qb) tout.push({ ...qb, dl: 3.6, bus: true });
          for (let i = 0; i < tout.length; i++) for (let j = i + 1; j < tout.length; j++) {
            const A = tout[i], B = tout[j];
            if ((A.x - B.x) ** 2 + (A.z - B.z) ** 2 > 64) continue;
            if (Math.abs(Math.cos(A.cap - B.cap)) < 0.7) continue;
            if (touche(rect(A.x, A.z, A.cap, A.dl), rect(B.x, B.z, B.cap, B.dl))) { n++; if (A.bus || B.bus) nBus++; }
          }
        }
      }
      res[miTemps ? 'v438' : 'v442'] = { anneaux: total, jouent, partJouee: +(posesJ / Math.max(1, poses0)).toFixed(3), voitures, jumelles, contacts: n, dontBus: nBus };
    }
    RESULTAT = res;
    console.log('BUS', JSON.stringify(res));
  } else if (mode === 'tranches') {
    // node tests/sonde-rue-dense.cjs tranches : chaque circuit de Paris et de
    // douze villes engendrées fabriqué deux fois — d'un seul tenant
    // (`circulation`) et par tranches d'une étape (`circulationParTranches`,
    // budget nul) : le même convoi (voitures, jumelle, grille, voies), et
    // combien d'étapes, la plus longue et le tout en millisecondes.
    const VM = await import(src('villesmonde.js'));
    const { V, VD, veh, w } = M;
    const traces = [
      ...M.P.circuitsParis((x, z) => w.coteRoulable(x, z)).map((t) => ({ ...t, voie: 'avenue' })),
      ...VM.tracesCirculation((x, z) => w.terrainHeight(x, z)).slice(0, 48),
    ];
    const opts = (tr) => { const decalage = tr.voie === 'avenue' && tr.ville !== 'ny' ? 1.3 : 0;
      return { ville: tr.ville, voie: tr.voie || 'rue', decalage, voies: decalage ? (x, z) => VD.secondeVoieParis(x, z, decalage) : VD.secondeVoieVilleMonde, bus: tr.rang === 0 }; };
    const signe = (c) => { c.horaire(); return JSON.stringify([c.nb, c.jumelle ? c.jumelle.nb : 0, +c._horaire.P.toFixed(6), Math.round(c.parcours.longueur * 1000), c.voiesDoubles, c.jumelle ? c.jumelle.rangJumeau : null]); };
    let egaux = 0, diff = [], etapesMax = 0, pireMs = 0, entierMax = 0, avecJumelle = 0, multi = 0;
    for (const tr of traces) {
      const t0 = performance.now(); const a = veh.circulation(tr.pts, V.graineDeVille(tr), opts(tr)); const tA = performance.now() - t0;
      const prep = veh.circulationParTranches(tr.pts, V.graineDeVille(tr), opts(tr));
      let b = null; while (!(b = prep.avancer(0)));
      entierMax = Math.max(entierMax, tA); pireMs = Math.max(pireMs, prep.pire); etapesMax = Math.max(etapesMax, prep.tranches);
      if (a.jumelle) avecJumelle++;
      if (prep.tranches >= 4) multi++;
      if (signe(a) === signe(b)) egaux++; else diff.push([tr.cle || tr.ville, signe(a), signe(b)]);
    }
    RESULTAT = { circuits: traces.length, egaux, diff: diff.slice(0, 5), avecJumelle, enQuatreEtapesOuPlus: multi, etapesMax, entierMaxMs: +entierMax.toFixed(1), pireEtapeMs: +pireMs.toFixed(1) };
    console.log('TRANCHES', JSON.stringify(RESULTAT));
  } else if (mode === 'raccords') {
    // node tests/sonde-rue-dense.cjs raccords : pour chaque raccord route/ville
    // engendrée, où l'avenue d'entrée rencontre la VOIE d'un anneau (même sens
    // ou en face, à moins de 1,6 bloc), donc où elle doit s'arrêter pour ne
    // jamais partager une voie (`finAvantAnneaux`, raccords.js) ; puis le
    // partage qui reste sur tout le tracé, raccord court et arrêt à la porte.
    const RO = await import(src('routes.js'));
    const VM = await import(src('villesmonde.js'));
    const RA = await import(src('raccords.js'));
    const { w, V } = M;
    const anneaux = VM.tracesCirculation((x, z) => w.terrainHeight(x, z));
    const parVille = new Map();
    for (const t of anneaux) { const l = parVille.get(t.cle) || []; l.push(t); parVille.set(t.cle, l); }
    // LES VILLES BÂTIES À LA MAIN (v441) : leurs circuits roulent sur les
    // avenues nommées, à droite (décalage 1,3), et leur entrée est déclarée
    const sol = (x, z) => w.coteRoulable(x, z);
    const MAIN = { paris: ['paris.js', ['circuitsParis', 'circuitsQuartiersParis'], 'ENTREES_PARIS'],
      londres: ['londres.js', ['circuitsLondres'], 'ENTREES_LONDRES'], nice: ['nice.js', ['circuitsNice'], 'ENTREES_NICE'],
      lille: ['lille.js', ['circuitsLille'], 'ENTREES_LILLE'], sf: ['sanfrancisco.js', ['circuitsSF'], 'ENTREES_SF'] };
    const ENTREES = {};
    for (const [cle, [f, fns, E]] of Object.entries(MAIN)) {
      const Mo = await import(src(f));
      ENTREES[cle] = Mo[E];
      parVille.set(cle, fns.flatMap((fn) => Mo[fn](sol)).map((t) => ({ ...t, voie: 'avenue', ville: cle })));
    }
    const voiesCache = new Map();
    const voiesDe = (cle) => {
      if (voiesCache.has(cle)) return voiesCache.get(cle);
      const ps = (parVille.get(cle) || []).map((tr) => poser(M, tr).parcours);
      const ech = RA.echantillonner(ps);
      voiesCache.set(cle, { ps, ech });
      return voiesCache.get(cle);
    };
    const avenueDe = (cle, route) => {
      const i = RO.entreesDe(cle).findIndex((e) => e.route === route);
      if (i < 0) return undefined;
      if (ENTREES[cle]) return ENTREES[cle][i];
      const e = RO.entreesDe(cle)[i];
      return VM.avenueDEntree(cle, e.x, e.z) || undefined;
    };
    const partage = (pts, ech, nom) => { const pr = new V.Parcours(pts); let n = 0; for (let d = 0; d < pr.longueur; d += 1) { const q = pr.a(d); if (RA.voieOccupee(ech, q.x, q.z, pr.capLisse(d))) { n++; if (process.env.DBG && nom) console.log('  partage', nom, Math.round(q.x), Math.round(q.z), Math.round(d), '/', Math.round(pr.longueur)); } } return n; };
    const table = {};
    const lignes = [];
    for (const seg of RO.segmentsDeRoute()) {
      const av = {}, fins = {};
      for (const cle of [seg.de, seg.vers]) {
        const a = avenueDe(cle, seg.route.nom); av[cle] = a;
        if (!a || !parVille.has(cle)) continue;
        let L = 0; for (let k = 0; k + 1 < a.length; k++) L += Math.hypot(a[k + 1][0] - a[k][0], a[k + 1][1] - a[k][1]);
        const fin = RA.finAvantAnneaux(a, voiesDe(cle).ech);
        fins[cle] = { L: +L.toFixed(1), fin };
        if (fin < L - 0.01) table[seg.route.nom + '|' + cle] = fin;
      }
      const cote = (x, z) => w.coteRoulable(x, z) + 1;
      const court = (cle) => { const a = av[cle]; if (!a || !fins[cle]) return a; return RA.raccourcir(a, fins[cle].fin); };
      const variantes = {
        long: RO.traceRoute(seg, { avant: av[seg.de], apres: av[seg.vers], coteDe: cote }),
        court: RO.traceRoute(seg, { avant: court(seg.de), apres: court(seg.vers), coteDe: cote }),
        // ce que le JEU fait : main.js passe l'avenue par la table (`raccordDe`)
        jeu: RO.traceRoute(seg, { avant: RA.raccordDe(seg.route.nom, seg.de, av[seg.de]), apres: RA.raccordDe(seg.route.nom, seg.vers, av[seg.vers]), coteDe: cote }),
        porte: RO.traceRoute(seg, { avant: parVille.has(seg.de) ? undefined : av[seg.de], apres: parVille.has(seg.vers) ? undefined : av[seg.vers], coteDe: cote }),
      };
      for (const cle of [seg.de, seg.vers]) {
        if (!parVille.has(cle)) continue;
        const { ech } = voiesDe(cle);
        const r = { route: seg.route.nom, cle, ...fins[cle] };
        for (const [k, pts] of Object.entries(variantes)) r[k] = partage(pts, ech, k === 'court' ? seg.route.nom + '|' + cle : null);
        lignes.push(r);
      }
    }
    for (const l of lignes.filter((l) => l.long + l.court + l.porte > 0 || (l.fin !== undefined && l.fin < l.L - 0.01))) console.log(JSON.stringify(l));
    const som = (k) => lignes.reduce((s, l) => s + l[k], 0);
    const K = ['long', 'court', 'jeu', 'porte'];
    const bilan = { raccords: lignes.length, touches: Object.fromEntries(K.map((k) => [k, lignes.filter((l) => l[k] > 0).length])), blocs: Object.fromEntries(K.map((k) => [k, som(k)])) };
    // la table du jeu est-elle celle que la règle donne aujourd'hui ?
    const ecarts = [...new Set([...Object.keys(table), ...Object.keys(RA.RACCORDS_COURTS)])].filter((k) => table[k] !== RA.RACCORDS_COURTS[k]).map((k) => [k, RA.RACCORDS_COURTS[k], table[k]]);
    console.log(JSON.stringify(bilan));
    console.log('TABLE', JSON.stringify(table));
    RESULTAT = { ...bilan, ecarts, pires: lignes.filter((l) => l.jeu > 0).map((l) => [l.route + '|' + l.cle, l.long, l.jeu]) };
    console.log('BILAN', JSON.stringify(RESULTAT));
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
  return RESULTAT;
}

// LANCÉE SEULE, elle imprime ; REQUISE (plafond.js, v440), elle rend le relevé
// des modes `raccords` et `bus` — et l'aiguillage du portail voit que la suite
// en dépend (un `spawn` ne se lit pas comme un `require`).
async function mesurer(mode) { return principal(mode); }
module.exports = { mesurer };
if (require.main === module) principal(process.argv[2] || 'jeu').catch((e) => { console.error(e); process.exit(1); });
