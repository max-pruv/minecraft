// Sonde (v430) : « Une voiture ne roule pas dans l'eau » sur une autoroute.
// Max, capture d'iPhone : la voiture arrêtée au bout d'un pont, le bandeau de
// l'eau affiché, pas une goutte en vue. Le générateur décide « pont » au COIN
// d'une colonne et n'y écrit aucun bloc ; le contrôle de l'eau lisait le
// tablier au CENTRE. Aux deux bouts de chaque pont, une colonne n'avait donc
// ni bloc ni tablier pour le contrôle, de l'eau dessous, et la voiture
// s'arrêtait net.
//
// On fait traverser au VRAI joueur (player.js, three chargé par un crochet de
// module) chaque pont de chaque route, dans les deux sens, sur une voie de
// chaque côté, avec le crochet d'obstacle branché sur la règle du monde
// (`world.eauSousLaVoiture`). Sur l'ancien code, qui n'a pas la règle dans le
// monde, on rejoue la règle de `main.js` telle qu'elle était (le tablier lu
// au centre de la colonne) — c'est ce qui rend la sonde rouge là-bas.
//     node tests/sonde-ponts-eau.cjs [chemin/vers/src]
// Mesuré : 52 traversées, 12 arrêtées par l'eau sur la v416, 0 ici.
// `plafond.js` l'appelle telle quelle (`traverserLesPonts`).
const path = require('path');
const { pathToFileURL } = require('url');
const { register } = require('node:module');
let crochet = false;
function brancherThree() {
  if (crochet) return; crochet = true;
  const trois = pathToFileURL(path.resolve(__dirname, '../vendor/three.module.min.js')).href;
  register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
}
async function traverserLesPonts(src = path.resolve(__dirname, '../src')) {
  brancherThree();
  const SRC = pathToFileURL(src).href;
  const { Player } = await import(SRC + '/player.js');
  const W = await import(SRC + '/world.js');
  const { BLOCK } = await import(SRC + '/blocks.js');
  const R = await import(SRC + '/routes.js');
  const w = new W.World();
  const cam = { position: { copy() {} }, rotation: { set() {} } };
  const regle = w.eauSousLaVoiture ? 'monde' : 'ancienne';
  // la règle de main.js d'avant la v430, recopiée seulement pour l'ancien code
  const ancienne = (x, z, cap, y, demiLarg) => {
    const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux, y0 = Math.floor(y + 0.1);
    for (let a = -2.2; a <= 2.2 + 1e-6; a += 1.1) for (let b = -demiLarg; b <= demiLarg + 1e-6; b += demiLarg) {
      const bx = Math.floor(x + ux * a + vx * b), bz = Math.floor(z + uz * a + vz * b);
      if (w.isSolid(bx, y0 - 1, bz) || w.isSolid(bx, y0, bz)) continue;
      const tab = w.tablierEn(bx + 0.5, bz + 0.5); if (tab !== null && Math.abs(tab - y) < 1.5) continue;
      if (w.getBlock(bx, w.sommetColonne(bx, bz) + 1, bz) === BLOCK.WATER) return true;
    }
    return false;
  };
  const eau = (p, x, z, cap) => (regle === 'monde' ? w.eauSousLaVoiture(x, z, cap, p.pos.y, p.gabarit / 2) : ancienne(x, z, cap, p.pos.y, p.gabarit / 2));
  const out = { regle, traversees: 0, passees: 0, arreteesParLEau: [], autres: [], tombees: [] };
  for (const seg of R.segmentsDeRoute()) {
    const nom = seg.route && (seg.route.nom || seg.route.id);
    const ponts = []; let deb = null;
    for (let s = 0; s <= seg.longueur; s += 1) {
      const q = R.pointA(seg, s), r = R.routeEn(q.x, q.z), o = !!(r && r.ouvrage);
      if (o && deb === null) deb = s;
      if (!o && deb !== null) { ponts.push([deb, s]); deb = null; }
    }
    for (const [a, b] of ponts) for (const dir of [-1, 1]) {
      const s0 = dir > 0 ? a - 25 : b + 25, s1 = dir > 0 ? b + 25 : a - 25;
      const L = R.largeurA(seg, s0), o = -dir * (L.terrePlein + L.demiChaussee / 2);
      const P = (s) => { const q = R.pointA(seg, s); return { x: q.x - q.fz * o, z: q.z + q.fx * o, fx: q.fx * dir, fz: q.fz * dir }; };
      const d0 = P(s0), r0 = R.routeEn(d0.x, d0.z);
      if (!r0) continue;
      out.traversees++;
      const p = new Player(cam, w); p.gabarit = 2.26; p.boost = 20 / 3.2;
      let nEau = 0, ouEau = null;
      p.obstacleVehicule = (x, z, cap, x0, z0) => {
        const e = eau(p, x, z, cap) && !eau(p, x0, z0, cap);
        if (e) { nEau++; ouEau = [Math.round(x), Math.round(z)]; }
        return e ? 'eau' : false;
      };
      p.pos.set(d0.x, r0.cote + 1e-4, d0.z); p.onGround = true; p.yaw = Math.atan2(-d0.fx, -d0.fz);
      p.vitesseVoiture = 12; p.touchMove.f = 1;
      // on tient le cap le long de la voie, et l'on s'arrête quand la voiture
      // n'avance plus depuis trois secondes de jeu
      const tot = Math.abs(s1 - s0); let maxF = -1e9, tMax = 0, tombe = null;
      for (let t = 0; t < 30 && maxF < tot - 6 && t - tMax < 3; t += 1 / 30) {
        const q = P(dir > 0 ? Math.min(s0 + Math.max(0, maxF) + 4, s1) : Math.max(s0 - Math.max(0, maxF) - 4, s1));
        p.yaw = Math.atan2(-(q.x - p.pos.x), -(q.z - p.pos.z));
        p.update(1 / 30);
        // l'avance se lit à l'ABSCISSE de la route : une route qui tourne fait
        // plafonner une projection sur le cap de départ
        const fait = dir * (R.projeter(seg, p.pos.x, p.pos.z).s - s0);
        if (fait > maxF + 0.05) { maxF = fait; tMax = t; }
        const r = R.routeEn(p.pos.x, p.pos.z);
        if (r && p.pos.y < r.cote - 1.5 && !tombe) tombe = { y: +p.pos.y.toFixed(1), cote: r.cote, x: Math.round(p.pos.x), z: Math.round(p.pos.z) };
      }
      const fiche = { nom, pont: [a, b], dir, fait: +maxF.toFixed(1), tot, nEau, ouEau, v: +(p.vitesseVoiture || 0).toFixed(1), pos: [+p.pos.x.toFixed(1), +p.pos.y.toFixed(2), +p.pos.z.toFixed(1)], yaw: +p.yaw.toFixed(2), contact: p.contact && p.contact.famille, chocs: p.chocs || 0 };
      if (tombe) out.tombees.push({ ...fiche, ...tombe });
      else if (maxF >= tot - 6) out.passees++;
      // arrêtée par l'eau : la voiture est À L'ARRÊT et le crochet a parlé
      else if (nEau > 0 && Math.abs(fiche.v) < 1) out.arreteesParLEau.push(fiche);
      else out.autres.push(fiche);
    }
  }
  return out;
}
// LES TROUS AU BOUT DES PONTS (v430) : là où le générateur décide « pont » au
// coin d'une colonne, il n'écrit aucun bloc. Un point de chaussée de cette
// colonne que le contact ne porte pas — ni tablier lu au point, ni bloc sous
// le tablier, ni sol continu à sa cote — est un trou : la voiture y tombait
// sous le premier pont de l'A1 (sonde-pont-tablier.cjs). On balaie la
// chaussée de chaque pont au quart de bloc, avec la lecture du contact du
// monde (`tablierSousLePoint`, ou `tablierEn` sur l'ancien code).
async function trousAuxCulees(src = path.resolve(__dirname, '../src')) {
  brancherThree();
  const SRC = pathToFileURL(src).href;
  const W = await import(SRC + '/world.js');
  const R = await import(SRC + '/routes.js');
  const w = new W.World();
  const lecture = w.tablierSousLePoint ? 'colonne' : 'point';
  const tab = (x, z) => (w.tablierSousLePoint ? w.tablierSousLePoint(x, z) : w.tablierEn(x, z));
  const out = { lecture, points: 0, trous: 0, ex: [] };
  for (const seg of R.segmentsDeRoute()) {
    const pr = R.profilDe(seg);
    for (const sp of pr.spans) for (let s = sp.s0 - 4; s <= sp.s1 + 4; s += 0.25) {
      const q = R.pointA(seg, s), L = R.largeurA(seg, s);
      for (const cote of [-1, 1]) for (let d = L.terrePlein; d <= L.terrePlein + 2 * L.demiChaussee; d += 0.25) {
        const x = q.x + (-q.fz) * d * cote, z = q.z + q.fx * d * cote;
        const bx = Math.floor(x), bz = Math.floor(z), c = R.routeEn(bx, bz);
        if (!c || !c.ouvrage) continue;
        out.points++;
        if (tab(x, z) !== null) continue;
        const y = Math.floor(c.cote);
        if (w.isSolid(bx, y - 1, bz) || w.isSolid(bx, y, bz)) continue;
        const sc = w.solContinu(x, z);
        if (sc !== null && Math.abs(sc - c.cote) < 1) continue;
        out.trous++;
        if (out.ex.length < 6) out.ex.push({ x: +x.toFixed(2), z: +z.toFixed(2), cote: c.cote });
      }
    }
  }
  return out;
}
module.exports = { traverserLesPonts, trousAuxCulees };
if (require.main === module) {
  traverserLesPonts(process.argv[2] ? path.resolve(process.argv[2]) : undefined).then((o) => {
    console.log(JSON.stringify({ regle: o.regle, traversees: o.traversees, passees: o.passees, eau: o.arreteesParLEau.length, autres: o.autres.length, tombees: o.tombees.length }));
    for (const k of ['arreteesParLEau', 'autres', 'tombees']) if (o[k].length) console.log(k, JSON.stringify(o[k].slice(0, 12)));
    return trousAuxCulees(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  }).then((t) => { console.log('trous au bout des ponts', JSON.stringify(t)); process.exit(0); });
}
