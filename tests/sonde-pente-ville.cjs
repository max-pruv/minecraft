// Sonde (dette 5 du palier 3) : la voiture dans les rues en pente d'une ville en
// VOXEL — San Francisco, où la surface continue ne passe pas. Un témoin cherche
// son terrain (v285) : des lignes droites de cinquante blocs dont chaque colonne
// est de la chaussée, sans rien de solide à hauteur de carrosserie, rangées en
// MONTÉE, DESCENTE et PLAT. Publie la vitesse au bout de trente blocs à plein
// gaz, et la pente que la voiture croit lire (`player.pente`).
//     node tests/sonde-pente-ville.cjs [chemin/vers/src]
const path = require('path');
const { pathToFileURL } = require('url');
const { register } = require('node:module');
const trois = pathToFileURL(path.resolve(__dirname, '../vendor/three.module.min.js')).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
(async () => {
const SRC = pathToFileURL(process.argv[2] || path.resolve(__dirname, '../src')).href;
const { Player } = await import(SRC + '/player.js');
const W = await import(SRC + '/world.js');
const { SF } = await import(SRC + '/sanfrancisco.js');
const { isSolid } = await import(SRC + '/blocks.js');
const w = new W.World();
const cam = { position: { copy() {} }, rotation: { set() {} } };
let g = 99; const rnd = () => ((g = (Math.imul(g, 1103515245) + 12345) >>> 0) / 2 ** 32);
const L = 50;
const top = (x, z) => w.sommetColonne(Math.floor(x), Math.floor(z));
function profil(x0, z0, ux, uz) {
  const h = [];
  for (let s = -4; s <= L + 4; s += 1) {
    const x = x0 + ux * s, z = z0 + uz * s;
    for (const l of [-1.2, 0, 1.2]) {
      const px = x - uz * l, pz = z + ux * l;
      if (w.solContinu && w.solContinu(px, pz) !== null) return null;
      const y = top(px, pz);
      if (!W.CHAUSSEE.has(w.getBlock(Math.floor(px), y, Math.floor(pz)))) return null;
      for (let k = 1; k <= 3; k++) if (isSolid(w.getBlock(Math.floor(px), y + k, Math.floor(pz)))) return null;
    }
    h.push(top(x, z));
  }
  return h;
}
const sites = { montee: [], descente: [], plat: [] };
for (let essai = 0; essai < 60000 && !Object.values(sites).every((l) => l.length >= 5); essai++) {
  const x0 = SF.x + (rnd() * 2 - 1) * 210, z0 = SF.z + (rnd() * 2 - 1) * 210;
  const a = Math.floor(rnd() * 16) * Math.PI / 8, ux = Math.cos(a), uz = Math.sin(a);
  const h = profil(x0, z0, ux, uz); if (!h) continue;
  const d = h[4 + L] - h[4];
  const mono = (sg) => h.every((v, i) => i === 0 || sg * (v - h[i - 1]) >= 0);
  const site = { x: +x0.toFixed(1), z: +z0.toFixed(1), ux, uz, d };
  if (d >= 3 && mono(1) && sites.montee.length < 5) sites.montee.push(site);
  else if (d <= -3 && mono(-1) && sites.descente.length < 5) sites.descente.push(site);
  else if (d === 0 && Math.max(...h) === Math.min(...h) && sites.plat.length < 5) sites.plat.push(site);
}
function rouler(site) {
  const p = new Player(cam, w); p.gabarit = 2.26; p.boost = 40 / 3.2;
  p.pos.set(site.x, top(site.x, site.z) + 1.001, site.z); p.onGround = true; p.yaw = Math.atan2(-site.ux, -site.uz);
  p.vitesseVoiture = 12; p.touchMove.f = 1;
  let v30 = null, pentes = [], parcouru = 0;
  for (let t = 0; t < 8; t += 1 / 30) {
    p.update(1 / 30);
    if (p.pente != null) pentes.push(p.pente);
    parcouru = (p.pos.x - site.x) * site.ux + (p.pos.z - site.z) * site.uz;
    if (v30 === null && parcouru >= 30) { v30 = +p.vitesseVoiture.toFixed(1); break; }
  }
  const m = pentes.length ? pentes.reduce((a, b) => a + b, 0) / pentes.length : null;
  return { v30, parcouru: +parcouru.toFixed(1), penteLue: m == null ? null : +m.toFixed(2), lus: pentes.length };
}
for (const [fam, l] of Object.entries(sites)) {
  console.log(fam, l.length, 'sites');
  for (const s of l) console.log('  ', JSON.stringify(s), JSON.stringify(rouler(s)));
}
process.exit(0);
})();
