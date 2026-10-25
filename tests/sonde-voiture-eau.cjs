// Sonde (v559) : que fait une voiture qui roule vers l'eau ?
// Max : « s'il tombe dans l'eau, il tombe dans l'eau » — plus d'arrêt au bord.
// Le VRAI joueur (player.js) sous node, un port fabriqué au-dessus du relief
// (un quai de pierre, puis un bassin en eau), pleins gaz vers le bassin.
// Deux bras : `regle: 'v272'` rejoue l'ancien crochet d'eau de main.js (la
// voiture s'arrête sur le quai), `regle: 'aucune'` laisse la physique seule.
//     node tests/sonde-voiture-eau.cjs [chemin/vers/src]
const path = require('path');
const { pathToFileURL } = require('url');
const { register } = require('node:module');
let crochet = false;
function brancherThree() {
  if (crochet) return; crochet = true;
  const trois = pathToFileURL(path.resolve(__dirname, '../vendor/three.module.min.js')).href;
  register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
}
async function rouleVersLEau(src = path.resolve(__dirname, '../src'), regle = 'aucune', secondes = 8, profond = 5) {
  brancherThree();
  const SRC = pathToFileURL(src).href;
  const { Player } = await import(SRC + '/player.js');
  const W = await import(SRC + '/world.js');
  const { BLOCK } = await import(SRC + '/blocks.js');
  const w = new W.World();
  const cam = { position: { copy() {} }, rotation: { set() {} } };
  const x0 = 31200, z0 = 31500, LARG = 8, QUAI = 12;
  let y0 = 0;
  for (let d = -8; d <= 44; d += 4) for (let k = -LARG; k <= LARG; k += 4) y0 = Math.max(y0, w.terrainHeight(x0 + d, z0 + k));
  y0 += 2;
  const surface = y0 - 1, fond = y0 - 1 - profond;
  for (let d = -8; d <= 44; d++) for (let k = -LARG; k <= LARG; k++) {
    if (d <= QUAI) for (let y = fond; y <= y0; y++) w.setBlock(x0 + d, y, z0 + k, BLOCK.STONE);
    else {
      w.setBlock(x0 + d, fond, z0 + k, BLOCK.STONE);
      for (let y = fond + 1; y <= surface; y++) w.setBlock(x0 + d, y, z0 + k, BLOCK.WATER);
      w.setBlock(x0 + d, y0, z0 + k, 0);
    }
    for (let h = 1; h <= 8; h++) w.setBlock(x0 + d, y0 + h, z0 + k, 0);
  }
  const p = new Player(cam, w);
  p.gabarit = 2.26; p.boost = 20 / 3.2;
  if (regle === 'v272') p.obstacleVehicule = (x, z, cap, xa, za) => (w.eauSousLaVoiture(x, z, cap, p.pos.y, p.gabarit / 2) && !w.eauSousLaVoiture(xa, za, cap, p.pos.y, p.gabarit / 2) ? 'eau' : false);
  p.pos.set(x0, y0 + 1.01, z0 + 0.5); p.onGround = true; p.yaw = -Math.PI / 2;
  p.touchMove.f = 1;
  const releves = [];
  let tEau = null, vEntree = null, tNoyee = null, sortie = null, tSurface = null;
  for (let t = 0; t < secondes; t += 1 / 30) {
    p.update(1 / 30);
    // la sortie de fun.js, recopiée : 1,2 s après que le moteur a calé sous
    // l'eau, l'enfant quitte la voiture au-dessus du toit et remonte (`remonter`)
    if (tNoyee === null && p.voitureDansLEau && p.voitureDansLEau.noyee) tNoyee = t;
    if (!sortie && tNoyee !== null && t - tNoyee > 1.2 && p.gabarit > 1) {
      sortie = { t: +t.toFixed(2), y: +(p.pos.y - surface).toFixed(1) };
      const yv = p.pos.y;
      p.gabarit = 0.6; p.boost = undefined; p.vitesseVoiture = 0; p.touchMove.f = 0;
      p.pos.set(p.pos.x, yv + 1.4, p.pos.z); p.vel.set(0, 0, 0);
      p.remonter = performance.now() + 60000;
    }
    if (sortie && tSurface === null && p.pos.y + 1.62 > surface + 1) tSurface = +(t - sortie.t).toFixed(2);
    const d = p.pos.x - x0;
    if (tEau === null && p.voitureDansLEau) { tEau = +t.toFixed(2); vEntree = +Math.abs(p.vitesseVoiture).toFixed(1); }
    if (Math.round(t * 30) % 15 === 0) releves.push({ t: +t.toFixed(1), d: +d.toFixed(1), y: +(p.pos.y - surface).toFixed(1), v: +(p.vitesseVoiture || 0).toFixed(1), eau: p.inWater ? 1 : 0, noyee: p.voitureDansLEau ? +(p.voitureDansLEau.s).toFixed(1) : 0 });
  }
  const fin = releves[releves.length - 1];
  return { regle, quai: QUAI, surface, fond: fond - surface, tEau, vEntree, tNoyee: tNoyee === null ? null : +tNoyee.toFixed(2), sortie, tSurface, fin, releves };
}
module.exports = { rouleVersLEau };
if (require.main === module) {
  (async () => {
    for (const r of ['v272', 'aucune']) {
      const o = await rouleVersLEau(process.argv[2], r);
      console.log(r, JSON.stringify({ tEau: o.tEau, vEntree: o.vEntree, tNoyee: o.tNoyee, sortie: o.sortie, tSurface: o.tSurface, fin: o.fin }));
      console.log('  ', o.releves.map((q) => `${q.t}s d${q.d} y${q.y} v${q.v}${q.eau ? ' 🌊' : ''}`).join(' | '));
    }
    const g = await rouleVersLEau(process.argv[2], 'aucune', 8, 1);
    console.log('gué d\'un bloc', JSON.stringify({ tEau: g.tEau, tNoyee: g.tNoyee, fin: g.fin }));
    process.exit(0);
  })();
}
