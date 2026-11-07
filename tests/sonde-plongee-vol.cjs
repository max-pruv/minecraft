// ON NE PASSE PAS SOUS LE SOL EN DESCENDANT VITE EN VOL.
// Le VRAI joueur (player.js, three prêté par un crochet de module) dans le VRAI
// monde (world.js), sous node : on vole au-dessus de colonnes couvertes par la
// surface continue (v297), on prend l'élan de croisière, et l'on descend
// (touche C) à cadence de tablette lente, en glissant de côté. On compte les
// essais qui finissent les pieds sous la surface — l'œil dans la terre, ce que
// Max a vu en capture. Exporte `mesurer(racine)` pour plafond.js ; seul :
//   node tests/sonde-plongee-vol.cjs [racine du dépôt]
const path = require('path');
const { pathToFileURL } = require('url');
async function mesurer(racine, { essais = 60 } = {}) {
  const { register } = require('node:module');
  const trois = pathToFileURL(path.resolve(racine, 'vendor/three.module.min.js')).href;
  register('data:text/javascript,' + encodeURIComponent(
    `export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
  const u = (f) => pathToFileURL(path.resolve(racine, 'src', f)).href;
  const { Player } = await import(u('player.js'));
  const { World } = await import(u('world.js'));
  const cam = { position: { copy() {} }, rotation: { set() {} } };
  const monde = new World();
  // des colonnes COUVERTES (la surface y remplace le sommet), en pente
  const sites = [];
  for (let x = -640; x <= 640 && sites.length < essais; x += 23) {
    for (let z = -640; z <= 640 && sites.length < essais; z += 29) {
      const s = monde.solContinu(x + 0.5, z + 0.5);
      if (s === null) continue;
      const c = Math.floor(s + 0.5);
      if (!monde.blocSousLaSurface(x, c - 1, z)) continue;
      sites.push([x, z]);
    }
  }
  let sous = 0, lus = 0; const exemples = [];
  const cadences = [1 / 60, 1 / 20, 1 / 8];
  sites.forEach(([x, z], i) => {
    const dt = cadences[i % cadences.length];
    const p = new Player(cam, monde);
    p.flying = true; p.volDepuis = 30;   // croisière
    p.pos.set(x + 0.5, monde.solContinu(x + 0.5, z + 0.5) + 30, z + 0.5);
    p.yaw = (i * 1.7) % (Math.PI * 2);
    p.keys.add('KeyC');
    if (i % 2) p.touchMove.f = 0.4;        // on glisse en descendant
    for (let k = 0; k < Math.ceil(3 / dt); k++) p.update(dt);
    p.keys.delete('KeyC'); p.touchMove.f = 0;
    const s = monde.solContinu(p.pos.x, p.pos.z);
    if (s === null) return;
    lus++;
    if (p.pos.y < s - 0.05) { sous++; if (exemples.length < 5) exemples.push({ x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1), y: +p.pos.y.toFixed(2), s: +s.toFixed(2), dt: +dt.toFixed(3) }); }
  });
  // ET L'ENFANT DÉJÀ COINCÉ DESSOUS (une partie d'avant la correction) : posé
  // sur le troisième cube, sous la bande, il remonte sur la surface en une image.
  let coinces = 0, repris = 0;
  for (const [x, z] of sites) {
    if (coinces >= 20) break;
    const c = Math.floor(monde.ficheMemo(x, z).cote);
    if (!monde.blocSousLaSurface(x, c - 2, z)) continue;
    // un point de la colonne où la surface passe AU-DESSUS de la cote : c'est
    // là que la bande ne descend pas jusqu'au troisième cube
    let px = null, pz = null;
    for (const [a, b] of [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]]) {
      if (monde.solContinu(x + a, z + b) - 2 > c - 2 + 0.05) { px = x + a; pz = z + b; break; }
    }
    if (px === null) continue;
    const p = new Player(cam, monde);
    p.pos.set(px, c - 2 + 1e-3, pz);
    coinces++;
    p.update(1 / 30);
    if (p.pos.y >= monde.solContinu(p.pos.x, p.pos.z) - 0.05) repris++;
  }
  return { sites: sites.length, lus, sous, exemples, coinces, repris };
}
module.exports = { mesurer };
if (require.main === module) {
  mesurer(path.resolve(process.argv[2] || path.join(__dirname, '..'))).then((r) => console.log(JSON.stringify(r)));
}
