// Sonde : un DÉCOLLAGE PAR LE BOUTON ✈️ depuis chaque poste de chaque
// aérodrome, sous node, avec le vrai joueur (player.js) dans le vrai monde.
//     node tests/sonde-decollage-postes.cjs [chemin/vers/src]
// Elle publie, poste par poste : décollé ou non, la distance roulée, et, si
// l'appareil bute, OÙ (coordonnées locales à l'aérodrome) et SUR QUOI (le bloc
// devant le nez, son nom de bloc et ce qu'il est dans le plan).
const path = require('path');
const { pathToFileURL } = require('url');
const { register } = require('node:module');
const trois = pathToFileURL(path.resolve(__dirname, '../vendor/three.module.min.js')).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
async function mesurer(src) {
  const SRC = pathToFileURL(src || path.resolve(__dirname, '../src')).href;
  const { Player } = await import(SRC + '/player.js');
  const W = await import(SRC + '/world.js');
  const { isSolid } = await import(SRC + '/blocks.js');
  const { MONTURES } = await import(SRC + '/montures.js');
  const A = await import(SRC + '/aeroport.js');
  const w = new W.World();
  const cam = { position: { copy() {} }, rotation: { set() {} } };
  const out = [];
  for (const a of A.AEROPORTS) {
    for (const q of A.postesAvion(a.profil, a.r)) {
      const fiche = MONTURES.find((m) => m.key === q.espece);
      const p = new Player(cam, w);
      p.pilote = fiche.pilote; p.prendreGabarit(fiche.gabarit);
      const x = a.x + q.du + 0.5, z = a.z + q.dv + 0.5;
      const y = w.sommetColonne(Math.floor(x), Math.floor(z)) + 1;
      p.pos.set(x, y + 1e-3, z); p.onGround = true;
      p.yaw = q.cap + Math.PI; p.avionEtat = 'sol'; p.avionEnVol = false;
      p.decollerOuSePoser();
      let t = 0, arret = 0, ancien = { x, z }, bute = null, roule = 0, tGaz = null;
      for (; t < 30; t += 1 / 30) {
        p.update(1 / 30);
        if (tGaz === null && p.avionEtat === 'decollage') tGaz = t;
        if (p.avionEtat === 'epave') { bute = { raison: 'crash:' + (p.crash && p.crash.raison) }; break; }
        if (p.avionEtat === 'vol' || p.pos.y - y > 18) break;
        const d = Math.hypot(p.pos.x - ancien.x, p.pos.z - ancien.z); roule += d; ancien = { x: p.pos.x, z: p.pos.z };
        if (d < 0.02 && t > 1) { if (++arret > 15) break; } else arret = 0;
      }
      const decolle = p.avionEtat === 'vol' || p.pos.y - y > 18;
      if (!decolle && !bute) {
        const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), yy = Math.floor(p.pos.y);
        for (let s = 0.5; s <= 3 && !bute; s += 0.5) for (let l = -1; l <= 1 && !bute; l++) for (let h = 0; h <= 2 && !bute; h++) {
          const bx = Math.floor(p.pos.x + fx * s - fz * l), bz = Math.floor(p.pos.z + fz * s + fx * l);
          const id = w.getBlock(bx, yy + h, bz);
          if (isSolid(id)) bute = { raison: 'bloc', id, h, lx: bx - a.x, lz: bz - a.z };
        }
        if (!bute) bute = { raison: 'arrêt' };
      }
      out.push({ cle: a.cle, profil: a.profil, espece: q.espece, du: q.du, dv: q.dv, decolle, roule: +roule.toFixed(1), roulage: tGaz === null ? null : +tGaz.toFixed(1),
        ou: { lx: +(p.pos.x - a.x).toFixed(1), lz: +(p.pos.z - a.z).toFixed(1) }, bute });
    }
  }
  return out;
}
module.exports = { mesurer };
if (require.main === module) mesurer(process.argv[2]).then((r) => {
  for (const l of r) console.log(JSON.stringify(l));
  console.log(`décollés ${r.filter((l) => l.decolle).length} / ${r.length}`);
  process.exit(0);
});
