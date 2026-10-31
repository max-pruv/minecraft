// LA BOÎTE DE LA MOTO (police-réseau). La v562 lui donnait la boîte d'une
// voiture EN LONGUEUR : 1,2 de large, mais 4,4 de long — son nez butait sur un
// mur à la distance d'un capot de voiture. Le VRAI joueur (player.js), sous
// node, roule au pas vers un mur droit, au volant d'une moto
// (`prendreGabarit(1,2, 2,4)`, la fiche de montures.js) puis d'une voiture
// (`prendreGabarit(2,26)`) : on lit où il s'arrête, centre contre mur.
// Exporte `mesurer(racine)` pour plafond.js ; lancé seul, imprime la table :
//   node tests/sonde-moto-boite.cjs [racine du dépôt]
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
  const { MONTURES } = await import(u('montures.js'));
  const moto = MONTURES.find((s) => s.key === 'moto') || {};
  const cam = { position: { copy() {} }, rotation: { set() {} } };
  const MUR = 40;   // le mur commence à x = 40
  const monde = { getBlock: (x, y) => (y < 30 ? BLOCK.STONE : y > 45 ? BLOCK.AIR : x >= MUR ? BLOCK.STONE : BLOCK.AIR) };
  const arret = (classe, largeur, longueur) => {
    const f = C.CLASSES[classe] || C.CLASSES.citadine;
    const p = new Player(cam, monde);
    p.prendreGabarit(largeur, longueur);
    p.boost = f.vmax / C.MARCHE;
    p.pos.set(MUR - 8, 30, 0.5); p.onGround = true;
    p.yaw = -Math.PI / 2; p.vitesseVoiture = 3; p.touchMove.f = 0.25;
    for (let k = 0; k < 300; k++) p.update(1 / 60);
    return +(MUR - p.pos.x).toFixed(2);
  };
  return {
    fiche: { gabarit: moto.gabarit, longueur: moto.longueur },
    moto: arret('moto', moto.gabarit || 1.2, moto.longueur || 0),
    voiture: arret('citadine', 2.26, 0),
  };
}
module.exports = { mesurer };
if (require.main === module) {
  mesurer(path.resolve(process.argv[2] || path.join(__dirname, '..'))).then((t) => console.log(JSON.stringify(t)));
}
