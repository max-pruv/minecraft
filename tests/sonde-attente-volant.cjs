// COMBIEN DE TEMPS ATTEND-ON UNE VOITURE AU POINT DU TÉMOIN DU VOLANT ? (v318)
//
// La position d'un convoi est une fonction de l'heure réelle (v305) : le
// témoin « on prend le volant d'une voiture vue dans la rue » (fumee.js) dépend
// donc de l'heure à laquelle le banc tourne. Cette sonde rejoue la VRAIE
// circulation de Paris sous node — `createVehicules`, cession comprise, les huit
// circuits et le bus du premier — avec l'enfant immobile au point du témoin,
// pour cent heures de départ sur un tour d'horloge, et rend la distribution de
// l'attente d'une voiture à moins de cinq blocs (et à 2,5 blocs de hauteur).
//
//   node tests/sonde-attente-volant.cjs [décalage latéral] [pas d'heure] [fin] [borne]
//
// `three` est résolu vers vendor/ par un crochet de module : rien n'est dessiné,
// seuls les tracés, les grilles horaires et `cederLePassage` travaillent.
const { register } = require('node:module');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const RACINE = path.resolve(__dirname, '..');
const THREE_URL = pathToFileURL(path.join(RACINE, 'vendor/three.module.min.js')).href;
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(s, c, n) {
  if (s === 'three') return { url: ${JSON.stringify(THREE_URL)}, shortCircuit: true };
  return n(s, c);
}`));
const src = (f) => pathToFileURL(path.join(RACINE, 'src', f)).href;
(async () => {
  const lat = +(process.argv[2] || 0), pasH = +(process.argv[3] || 3);
  const finH = +(process.argv[4] || 300), borne = +(process.argv[5] || 130);
  const { World } = await import(src('world.js'));
  const P = await import(src('paris.js'));
  const T = await import('three');
  const V = await import(src('vehicules.js'));
  const w = new World();
  const cs = P.circuitsParis((x, z) => w.coteRoulable(x, z));
  const csT = P.circuitsParis((x, z) => w.terrainHeight(x, z));
  const A = csT[0].pts[2], B = csT[0].pts[3];
  const L = Math.hypot(B.x - A.x, B.z - A.z);
  const nx = -(B.z - A.z) / L, nz = (B.x - A.x) / L;
  const x = A.x + (B.x - A.x) * 0.4 + nx * lat, z = A.z + (B.z - A.z) * 0.4 + nz * lat;
  const y = w.sommetColonne(Math.floor(x), Math.floor(z)) + 1;
  const res = [];
  for (let depart = 0; depart < finH; depart += pasH) {
    const scene = new T.Scene();
    const player = { pos: new T.Vector3(x, y, z), yaw: 0, gabarit: 0.6, vel: new T.Vector3() };
    const veh = V.createVehicules({ scene, player });
    for (const tr of cs) {
      veh.circulation(tr.pts, V.graineDeVille(tr), { ville: tr.ville });
      if (tr.rang === 0) veh.bus(tr.pts, Math.abs(Math.round(tr.x + tr.z)));
    }
    veh.adopterHorloge(depart);
    let t = 0, trouve = false, bus = 0;
    for (; t < borne; t += 0.1) {
      veh.update(0.1, 0.1);
      const pl = veh.placeProche(player.pos, 5);
      if (pl && pl.nom === 'bus') bus++;
      if (pl && pl.nom === 'voiture') { trouve = true; break; }
    }
    res.push([depart, trouve ? +t.toFixed(1) : -1, bus]);
  }
  const at = res.map((r) => (r[1] < 0 ? borne : r[1])).sort((a, b) => a - b);
  console.log(JSON.stringify({ decalage: lat, pieds: y, essais: res.length,
    echecs: res.filter((r) => r[1] < 0).length, mediane: at[at.length >> 1],
    p90: at[Math.floor(at.length * 0.9)], pire: at[at.length - 1] }));
  console.log('attentes de plus de 20 s [heure, attente, relevés où le bus était le plus proche] :',
    JSON.stringify(res.filter((r) => r[1] < 0 || r[1] > 20)));
})().catch((e) => { console.error(e); process.exit(1); });
