// LA FORCE DES CHOCS SUIT LA VITESSE (v424). Le VRAI joueur (player.js, three
// prêté par un crochet de module), sous node, contre un mur droit : de face à
// 10 blocs/s, de face pleins gaz (95 % de la pointe de la classe), et frôlé à
// 15° pleins gaz. On lit `player.choc.force` et l'on en tire ce que les dégâts
// en retirent, en « murs pleins » (degats.js : perte ∝ force^COURBE_FORCE).
// Exporte `mesurer(racine)` pour plafond.js ; lancé seul, imprime la table :
//   node tests/sonde-force-chocs.cjs [racine du dépôt]
const path = require('path');
const { pathToFileURL } = require('url');
async function mesurer(racine) {
  const { register } = require('node:module');
  const trois = pathToFileURL(path.resolve(racine, 'vendor/three.module.min.js')).href;
  register('data:text/javascript,' + encodeURIComponent(
    `export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
  const u = (f) => pathToFileURL(path.resolve(racine, 'src', f)).href;
  const { Player } = await import(u('player.js'));
  const { BLOCK } = await import(u('blocks.js'));
  const C = await import(u('conduite.js'));
  const D = await import(u('degats.js'));
  const cam = { position: { copy() {} }, rotation: { set() {} } };
  const MUR = 40;   // le mur commence à x = 40, il fait face à −x
  const monde = { getBlock: (x, y) => (y < 30 ? BLOCK.STONE : y > 45 ? BLOCK.AIR : x >= MUR ? BLOCK.STONE : BLOCK.AIR) };
  const choc = (classe, v, angle) => {
    const f = C.CLASSES[classe];
    const p = new Player(cam, monde);
    p.gabarit = 2.26; p.boost = f.vmax / C.MARCHE;
    const a = angle * Math.PI / 180, dx = Math.sin(a), dz = Math.cos(a);   // dx vers le mur
    p.pos.set(MUR - 2.2 - 0.6 - dx * 1, 30, -dz * 1); p.onGround = true;
    p.yaw = Math.atan2(-dx, -dz); p.vitesseVoiture = v; p.touchMove.f = 1;
    p.choc = null;
    for (let k = 0; k < 40 && !p.choc; k++) p.update(1 / 60);
    const force = p.choc ? p.choc.force : 0;
    return { force: +force.toFixed(3), murs: +Math.pow(force, D.COURBE_FORCE).toFixed(3) };
  };
  const out = {};
  for (const k of Object.keys(C.CLASSES)) {
    const vmax = C.CLASSES[k].vmax;
    out[k] = { lent: choc(k, 10, 90), plein: choc(k, 0.95 * vmax, 90), frole: choc(k, 0.95 * vmax, 15) };
  }
  return out;
}
module.exports = { mesurer };
if (require.main === module) {
  mesurer(path.resolve(process.argv[2] || path.join(__dirname, '..'))).then((t) => {
    for (const [k, r] of Object.entries(t)) console.log(k.padEnd(9), `mur 10 b/s ${r.lent.force} (${r.lent.murs} mur)`, `· pleins gaz ${r.plein.force} (${r.plein.murs})`, `· frôlé 15° ${r.frole.force} (${r.frole.murs})`);
  });
}
