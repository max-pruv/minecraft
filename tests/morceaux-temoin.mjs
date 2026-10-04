// LE COÛT D'UN MORCEAU BAISSE, SA SORTIE NE BOUGE PAS (v352).
//
// Deux mesures, sous node, partagées par `plafond.js` (le témoin) et par qui
// veut les rejouer sur un autre arbre (`git worktree add --detach … origin/main`,
// puis `empreinteMorceaux('<arbre>/src')`) :
//
//   • `empreinteMorceaux` engendre ET maille, avec un monde neuf, quarante-neuf
//     morceaux autour de neuf lieux — Paris (avec et sans la couche HD), une
//     ville engendrée à fleuve (Rome), Londres et sa Tamise, la campagne,
//     l'autoroute A1, Washington, San Francisco, Marrakech, Tokyo — et rend le
//     SHA-256 des blocs et de TOUS les tampons du mailleur, octet pour octet.
//     Une optimisation du worker qui changerait un bloc ou un sommet change ce
//     nombre. Il dit aussi combien de colonnes lues portaient une route : un
//     témoin qui ne lit pas la route ne peut pas garder `routeEn`.
//   • `travailParMorceau` compte, en roulant le long d'une bande, ce que coûte
//     un morceau en APPELS — relief (`terrainHeight`) et blocs lus hors du
//     morceau (`getBlock`) — et non en millisecondes : un compte ne dépend pas
//     de la charge du banc (on mesure la cause, v236).
import crypto from 'crypto';

const LIEUX = [['paris'], ['rome'], ['londres'], ['campagne', { x: 30000, z: 30000 }], ['a1'],
  ['washington'], ['sf'], ['marrakech'], ['tokyo']];

async function charger(src) {
  const { World, CHUNK } = await import(src + '/world.js');
  const { buildChunkTampons } = await import(src + '/mesher.js');
  const { positionDe } = await import(src + '/mondes.js');
  const { routeEn, segmentsDeRoute, pointA } = await import(src + '/routes.js');
  const lieu = (nom, pos) => {
    if (pos) return pos;
    if (nom === 'a1') { const P = positionDe('paris'), L = positionDe('lille'); return { x: (P.x + L.x) / 2, z: (P.z + L.z) / 2 }; }
    const p = positionDe(nom); return { x: p.x, z: p.z };
  };
  return { World, CHUNK, buildChunkTampons, routeEn, segmentsDeRoute, pointA, lieu };
}

export async function empreinteMorceaux(src) {
  const { World, CHUNK, buildChunkTampons, routeEn, segmentsDeRoute, pointA, lieu } = await charger(src);
  const h = crypto.createHash('sha256');
  let morceaux = 0, route = 0;
  for (const [nom, pos] of LIEUX) {
    const C = lieu(nom, pos);
    for (const hd of nom === 'paris' ? [0, 1] : [0]) {
      const w = new World(); w.hd = hd;
      h.update(`${nom}/${hd}`);
      const c0x = Math.floor(C.x / CHUNK), c0z = Math.floor(C.z / CHUNK);
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
        const cx = c0x + dx * 3, cz = c0z + dz * 3;
        const data = w.ensureChunk(cx, cz);
        h.update(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
        const t = buildChunkTampons(w, cx, cz, { detail: (dx + dz) % 2 === 0 });
        for (const k of Object.keys(t).sort()) {
          const g = t[k];
          if (g && typeof g === 'object' && g.positions) {
            for (const kk of Object.keys(g).sort()) {
              const a = g[kk];
              if (a && a.buffer) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
              else h.update(JSON.stringify(a) ?? 'u');
            }
          } else h.update(k + ':' + JSON.stringify(g));
        }
        if (hd === 0) for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
          if (routeEn(cx * CHUNK + lx, cz * CHUNK + lz)) route++;
        }
        morceaux++;
      }
    }
  }
  // Et TOUTES les routes du registre, en travers, tous les six blocs : les
  // talus les plus larges (jusqu'à DEBLAI_MAX / TALUS_PENTE au-delà de
  // l'emprise, douze blocs et demi) sont rares, et les quarante-neuf morceaux
  // de l'A1 n'en contiennent pas un — une borne de `routeEn` cassée à dix
  // blocs y passait inaperçue. Ici, elle se voit.
  new World();   // branche le relief des routes
  let talus = 0;
  for (const seg of segmentsDeRoute()) {
    for (let s = 0; s < seg.longueur; s += 6) {
      const p = pointA(seg, s);
      for (let d = -24; d <= 24; d++) {
        const r = routeEn(Math.round(p.x - p.fz * d), Math.round(p.z + p.fx * d));
        h.update(r ? `${r.piece}:${r.cote}` : '-');
        if (r && r.piece === 'talus') talus++;
      }
    }
  }
  return { empreinte: h.digest('hex'), morceaux, route, talus };
}

export async function travailParMorceau(src, noms = ['paris', 'rome', 'londres']) {
  const { World, CHUNK, buildChunkTampons, lieu } = await charger(src);
  const out = {};
  for (const nom of noms) {
    const C = lieu(nom);
    const w = new World();
    let reliefs = 0, lus = 0;
    const th = w.terrainHeight.bind(w), gb = w.getBlock.bind(w);
    w.terrainHeight = (x, z) => { reliefs++; return th(x, z); };
    w.getBlock = (x, y, z) => { lus++; return gb(x, y, z); };
    // une bande de 7 de large, parcourue comme en roulant vers +x : chaque
    // morceau maillé a ses voisins de derrière déjà là, ceux de devant non
    const cz0 = Math.floor(C.z / CHUNK), cx0 = Math.floor(C.x / CHUNK) - 6;
    for (let s = -1; s <= 0; s++) for (let dz = -4; dz <= 4; dz++) w.ensureChunk(cx0 + s, cz0 + dz);
    reliefs = 0; lus = 0;
    let n = 0;
    for (let s = 1; s <= 12; s++) for (let dz = -3; dz <= 3; dz++) { buildChunkTampons(w, cx0 + s, cz0 + dz, { detail: false }); n++; }
    out[nom] = { reliefs: Math.round(reliefs / n), lus: Math.round(lus / n) };
  }
  return out;
}
