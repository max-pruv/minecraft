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

// LES ROUTES QUE L'EMPREINTE A RELEVÉES (v357), et elles seules. Une route
// AJOUTÉE au registre est un contenu neuf, pas une optimisation : la hacher
// rendait ce témoin rouge à chaque livraison de route — il l'a été en
// production en v355 et v356 sans que rien ne le dise, et la v357 l'a
// re-relevé sur ses vingt et une routes. Les routes neuves ont leurs propres
// témoins (carteMonde.js) ; une route qui volerait l'emprise d'une ancienne
// change `routeEn` sur l'ancienne, donc ce hash.
export const ROUTES_RELEVEES = ['A1', 'E429', 'E19', 'A20', 'BR-116', 'A-4', 'A109', 'A3', 'E1', 'Autosole',
  'A4', 'Yamuna', 'A1 Sud', 'M1', 'A1 Nord', 'A24', 'I-45', 'A7', 'AP-2', '401', 'Hansalinie'];

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
    if (!ROUTES_RELEVEES.includes(seg.route.nom)) continue;
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

// LES BLOCS DE L'ENFANT, RANGÉS PAR MORCEAU (v403).
//
// Un journal FABRIQUÉ, comme celui d'un enfant qui a beaucoup bâti : huit
// sites (la maison témoin, des villages, des cabanes au loin), soixante blocs
// de côté, des hauteurs de maison. Graine fixe, donc le même journal partout.
export function journalFabrique(n, graine = 7) {
  let g = graine >>> 0;
  const r = () => ((g = Math.imul(g ^ (g >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296);
  const sites = [[-100, -100], [40, 60], [-300, 200], [500, -400], [1200, 800], [-2000, 1500], [3000, -2500], [150, -700]];
  const m = new Map(), t = new Map();
  let i = 0;
  while (m.size < n) {
    const s = sites[i++ % sites.length];
    const x = Math.round(s[0] + (r() - 0.5) * 60), z = Math.round(s[1] + (r() - 0.5) * 60);
    const k = `${x},${34 + Math.floor(r() * 20)},${z}`;
    m.set(k, 1 + Math.floor(r() * 30)); t.set(k, 1.9e12 + i);
  }
  return [m, t];
}

//   • `empreinteJournal` engendre tous les morceaux qui portent un bloc d'un
//     journal de quarante mille, par les trois chemins d'écriture — journal
//     installé d'un bloc, blocs posés un à un par `setBlock`, blocs retirés —
//     et rend le SHA-256 des blocs. Relevée sur la v391 (`origin/main`, avant
//     l'index) : aucun bloc d'enfant ne bouge (invariant 1).
//   • `lecturesDuJournal` compte les entrées du journal que `generateChunk`
//     parcourt pour UN morceau — la cause, pas des millisecondes (v236).
export async function empreinteJournal(src) {
  const { World, CHUNK } = await import(src + '/world.js');
  const h = crypto.createHash('sha256');
  const [m, t] = journalFabrique(40000);
  const cles = new Set();
  for (const k of m.keys()) { const [x, , z] = k.split(',').map(Number); cles.add(Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK)); }
  const liste = [...cles].sort();
  let morceaux = 0;
  const lire = (w) => {
    for (const c of liste) {
      const [cx, cz] = c.split(',').map(Number);
      const d = w.ensureChunk(cx, cz);
      h.update(c); h.update(Buffer.from(d.buffer, d.byteOffset, d.byteLength)); morceaux++;
    }
  };
  const w = new World();
  w.installerEdits(m, t, 'local');
  lire(w);
  const w2 = new World();
  let i = 0;
  for (const [k, id] of m) { if (i++ % 7) continue; const [x, y, z] = k.split(',').map(Number); w2.setBlock(x, y, z, id, 1.95e12); }
  for (const [k] of m) { if (i++ % 11) continue; const [x, y, z] = k.split(',').map(Number); w2.setBlock(x, y, z, 0, 1.96e12); }
  w2.chunks.clear(); w2.tops.clear();
  lire(w2);
  return { empreinte: h.digest('hex'), morceaux };
}

export async function lecturesDuJournal(src, n = 80000) {
  const { World } = await import(src + '/world.js');
  const [m, t] = journalFabrique(n);
  const w = new World();
  w.installerEdits(m, t, 'local');
  let lues = 0;
  const parcourir = Map.prototype[Symbol.iterator];
  w.edits[Symbol.iterator] = function* () { for (const e of parcourir.call(this)) { lues++; yield e; } };
  const t0 = performance.now();
  for (let i = 0; i < 10; i++) w.generateChunk(1875 + i, 1875);
  return { lues: lues / 10, ms: (performance.now() - t0) / 10, journal: w.edits.size };
}
