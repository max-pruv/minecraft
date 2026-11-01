// L'AVION VOLE PLUS HAUT (v582) — sous node, le vrai joueur (player.js) dans le
// vrai monde. Max : « permettre qu'un avion vole beaucoup plus haut en
// altitude ». Trois passages, chacun avec son verdict lu par `plafond.js` :
//   - LE TOIT : aux commandes, manche tiré pendant soixante secondes depuis
//     150 blocs, le toit du réglage (`plafondAvion`) est atteint et jamais
//     dépassé ; sans réglage, l'ancien toit de 158, au bloc près ;
//   - SE POSER SUR PLACE depuis 1 500 blocs : ✈️ loin de tout aérodrome, l'avion
//     doit toucher le sol, sans s'écraser, en moins de soixante secondes ;
//   - L’APPROCHE ASSISTÉE depuis 1 500 blocs : ✈️ à trois mille blocs d'Orly,
//     nez dessus, l'avion doit se poser sur une piste, sans s'écraser.
// Sur l'ancien code, il n'y a ni `plafondAvion` ni descente selon la hauteur :
// le toit vaut 158 quoi qu'on demande.
//     node tests/sonde-altitude-avion.cjs [chemin/vers/src]
const path = require('path');
const { pathToFileURL } = require('url');
const { register } = require('node:module');
const trois = pathToFileURL(path.resolve(__dirname, '../vendor/three.module.min.js')).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
async function mesurer(src) {
  const SRC = pathToFileURL(src || path.resolve(__dirname, '../src')).href;
  const P = await import(SRC + '/player.js');
  const W = await import(SRC + '/world.js');
  const { MONTURES } = await import(SRC + '/montures.js');
  const A = await import(SRC + '/aeroport.js');
  const AP = await import(SRC + '/approche.js');
  const w = new W.World();
  const cam = { position: { copy() {} }, rotation: { set() {} } };
  const fiche = MONTURES.find((m) => m.key === 'avionligne');
  const TOIT = P.plafondAvion ? P.plafondAvion(20480) : 158;
  const pilote = (x, y, z, yaw, toit) => {
    const p = new P.Player(cam, w);
    p.pilote = fiche.pilote; p.prendreGabarit(fiche.gabarit);
    if (toit) p.plafondAvion = toit;
    p.pos.set(x, y, z); p.yaw = yaw; p.avionEtat = 'vol'; p.avionEnVol = true;
    p.vitesseAvion = fiche.pilote.max; p.gaz = 1;
    return p;
  };
  const out = { toitDemande: TOIT, plafonds: P.plafondAvion ? [104, 416, 632, 2560, 20480].map((v) => P.plafondAvion(v)) : null };
  // LE TOIT
  for (const [nom, toit] of [['regle', TOIT], ['sans', 0]]) {
    const p = pilote(-1500, 150, -2500, 0, toit);
    p.touchMove.f = 1;
    let yMax = 0;
    for (let t = 0; t < 60; t += 1 / 30) { p.update(1 / 30); yMax = Math.max(yMax, p.pos.y); }
    out['toit_' + nom] = +yMax.toFixed(2);
  }
  // SE POSER SUR PLACE, depuis le toit, loin de tout aérodrome : le premier
  // point d'une grille à plus de 5 000 blocs de toute piste, au-dessus de la
  // terre (le relief au-dessus de l'eau sur 400 blocs autour)
  {
    let lieu = null;
    for (let gx = -40; gx <= 40 && !lieu; gx++) for (let gz = -40; gz <= 40 && !lieu; gz++) {
      const x = gx * 1000 + 500, z = gz * 1000 + 500;
      if (A.AEROPORTS.some((a) => Math.hypot(a.x - x, a.z - z) < 5000)) continue;
      let sec = true;
      for (let dx = -400; dx <= 400 && sec; dx += 100) for (let dz = -400; dz <= 400 && sec; dz += 100) {
        if (w.terrainHeight(x + dx, z + dz) <= W.WATER_LEVEL + 2) sec = false;
      }
      if (sec) lieu = { x, z };
    }
    out.lieuSurPlace = lieu;
    const p = pilote(lieu.x, 1499, lieu.z, 0, TOIT);
    const r = p.decollerOuSePoser();
    let t = 0;
    for (; t < 120; t += 1 / 30) {
      p.update(1 / 30);
      if (p.avionEtat === 'epave' || p.avionEtat === 'sol' || p.avionEtat === 'freinage') break;
    }
    out.surPlace = { appui: r, etat: p.avionEtat, t: +t.toFixed(1), crash: p.crash ? p.crash.raison : null, y: +p.pos.y.toFixed(1) };
  }
  // L'APPROCHE ASSISTÉE depuis le toit, à trois mille blocs d'Orly
  {
    const a = A.AEROPORTS.find((x) => /orly/i.test(x.cle || x.nom || ''));
    const x = a.x - 3000, z = a.z;
    const yaw = Math.atan2(-(a.x - x), -(a.z - z));   // le joueur avance en (−sin, −cos)
    const p = pilote(x, 1499, z, yaw, TOIT);
    const r = p.decollerOuSePoser();
    let t = 0, tours = 0;
    for (; t < 400; t += 1 / 30) {
      p.update(1 / 30);
      if (p.approche && p.approche.tours) tours = p.approche.tours;
      if (p.avionEtat === 'epave' || p.avionEtat === 'sol' || p.avionEtat === 'freinage') break;
    }
    out.approche = { aerodrome: a.cle, appui: r, etat: p.avionEtat, t: +t.toFixed(1), tours,
      crash: p.crash ? p.crash.raison : null, surPiste: !!AP.surUnePiste(p.pos.x, p.pos.z) };
  }
  return out;
}
module.exports = { mesurer };
if (require.main === module) mesurer(process.argv[2]).then((r) => { console.log(JSON.stringify(r, null, 1)); process.exit(0); },
  (e) => { console.error(e); process.exit(1); });
