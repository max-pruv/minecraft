// Sonde (v370) : la voiture contre de VRAIES façades obliques de Paris, deux
// angles d'approche, sous node. Les sites : une colonne de chaussée à 2-5
// blocs d'une façade dont la normale est à plus de 12° d'un axe du monde, et
// qui reste droite et libre sur vingt blocs. On roule à 25 blocs/s, joystick
// en avant, et l'on compte ce que la voiture fait APRÈS le premier contact.
//     node tests/sonde-mur-oblique.cjs [chemin/vers/src]
// Mesuré à la livraison (16 sites) : trajet médian après contact 1,4 → 10,4
// blocs (approche 10°), 1,5 → 14,3 (25°) ; ce qui l'arrête ensuite est la
// rue elle-même (un trottoir qu'on gravit, un coin d'îlot), pas le mur.
const path = require('path');
const { pathToFileURL } = require('url');
const { register } = require('node:module');
const trois = pathToFileURL(path.resolve(__dirname, '../vendor/three.module.min.js')).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
(async () => {
// Sonde : la voiture contre de VRAIES façades obliques de Paris, deux angles d'approche.
const SRC = pathToFileURL(process.argv[2] || path.resolve(__dirname, '../src')).href;
const { Player } = await import(SRC + '/player.js');
const W = await import(SRC + '/world.js');
const { PARIS } = await import(SRC + '/paris.js');
const C = await import(pathToFileURL(path.resolve(__dirname, '../src/conduite.js')).href);   // la mesure de façade, toujours la neuve
const { isSolid } = await import(SRC + '/blocks.js');
const w = new W.World();
const cam = { position: { copy() {} }, rotation: { set() {} } };
// des sites : une colonne de chaussée dont un mur est à 2-4 blocs, façade oblique
let g = 12345; const rnd = () => ((g = (Math.imul(g, 1103515245) + 12345) >>> 0) / 2 ** 32);
const sites = [];
for (let essai = 0; essai < 300000 && sites.length < 16; essai++) {
  const x = Math.floor(PARIS.x + (rnd() - 0.5) * 720), z = Math.floor(PARIS.z + (rnd() - 0.5) * 720);
  const top = w.sommetColonne(x, z);
  if (top == null || !W.CHAUSSEE.has(w.getBlock(x, top, z))) continue;
  const y = top + 1;
  if (isSolid(w.getBlock(x, y, z)) || isSolid(w.getBlock(x, y + 1, z))) continue;
  // cases de surface du mur à hauteur y+1 dans un rayon de 6
  const plein = (bx, bz) => isSolid(w.getBlock(bx, y + 1, bz));
  const cases = [];
  for (let bz = z - 6; bz <= z + 6; bz++) for (let bx = x - 6; bx <= x + 6; bx++) {
    if ((bx - x) ** 2 + (bz - z) ** 2 > 36 || !plein(bx, bz)) continue;
    for (const [ex, ez] of [[1,0],[-1,0],[0,1],[0,-1]]) if (!plein(bx+ex, bz+ez) && (x - bx) * ex + (z - bz) * ez > 0) cases.push([bx + .5 + ex * .5, bz + .5 + ez * .5]);
  }
  const n = C.normaleDeMur(cases, x + .5, z + .5);
  if (!n || cases.length < 10) continue;
  const ang = Math.atan2(n.nz, n.nx) * 180 / Math.PI;
  const axe = Math.min(...[0, 90, 180, -90, -180].map(a => Math.abs(ang - a)));
  if (axe < 12) continue;
  // distance au mur le long de -n
  let d = 0; while (d < 8 && !plein(Math.floor(x + .5 - n.nx * d), Math.floor(z + .5 - n.nz * d))) d += 0.25;
  if (d < 2 || d > 5) continue;
  // une vraie façade droite : le mur continue le long de la tangente, la voie
  // de la voiture reste libre, sur vingt-quatre blocs
  const libre = (px, pz) => !isSolid(w.getBlock(Math.floor(px), y, Math.floor(pz))) && !isSolid(w.getBlock(Math.floor(px), y + 1, Math.floor(pz)));
  let ok = true;
  for (let u = -7; u <= 12 && ok; u += 0.5) {
    const cx = x + .5 - n.nz * u, cz = z + .5 + n.nx * u;   // t = (-nz, nx)
    for (let l = -1.2; l <= Math.min(1.2, d - 1.2); l += 0.4) if (!libre(cx + n.nx * l - n.nx * 0, cz + n.nz * l)) { ok = false; break; }
    if (!ok) break;
    let mur = false; for (let e = d - 1.5; e <= d + 1.5; e += 0.25) if (plein(Math.floor(cx - n.nx * e), Math.floor(cz - n.nz * e))) mur = true;
    if (!mur) ok = false;
  }
  if (!ok) continue;
  sites.push({ x: x + .5, y, z: z + .5, nx: n.nx, nz: n.nz, ang: +ang.toFixed(0), d });
}
const res = [];
for (const s of sites) for (const ap of [10, 25]) {
  const p = new Player(cam, w); p.gabarit = 2.26; p.boost = 34 / 3.2;
  // tangente (le long de la façade), puis tournée de `ap` vers le mur
  const tx = -s.nz, tz = s.nx, a = ap * Math.PI / 180;
  const dx = tx * Math.cos(a) - s.nx * Math.sin(a), dz = tz * Math.cos(a) - s.nz * Math.sin(a);
  p.pos.set(s.x - dx * 6, s.y, s.z - dz * 6); p.onGround = true; p.yaw = Math.atan2(-dx, -dz);
  p.vitesseVoiture = 25; p.touchMove.f = 1;
  let chocs = 0, arrets = 0, trajet = 0, prev = { x: p.pos.x, z: p.pos.z }, touche = false, yaws = [];
  for (let t = 0; t < 2.5; t += 0.05) {
    const c0 = p.chocs || 0; p.update(0.05);
    if ((p.chocs || 0) > c0) { chocs += p.chocs - c0; touche = true; }
    const pas = Math.hypot(p.pos.x - prev.x, p.pos.z - prev.z); prev = { x: p.pos.x, z: p.pos.z };
    if (touche) { trajet += pas; if (pas < 0.05) arrets++; yaws.push(p.yaw); }
  }
  let inv = 0, sp = 0; for (let i = 1; i < yaws.length; i++) { const d = yaws[i] - yaws[i-1]; const sg = Math.abs(d) < 1e-4 ? 0 : Math.sign(d); if (sg && sp && sg !== sp) inv++; if (sg) sp = sg; }
  res.push({ ang: s.ang, ap, touche, chocs, trajet: +trajet.toFixed(1), arrets, inv, v: +p.vitesseVoiture.toFixed(1) });
}
const tou = res.filter(r => r.touche);
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : null; };
for (const ap of [10, 25]) {
  const r = tou.filter(x => x.ap === ap);
  console.log(`approche ${ap}° : ${r.length} contacts sur ${sites.length} sites · trajet médian ${med(r.map(x => x.trajet))} · bloquées ${r.filter(x => x.arrets > 10).length} · chocs médians ${med(r.map(x => x.chocs))} · inversions de cap médianes ${med(r.map(x => x.inv))} · vitesse finale médiane ${med(r.map(x => x.v))}`);
}
if (process.env.DETAIL) console.log(JSON.stringify(res));

})();
