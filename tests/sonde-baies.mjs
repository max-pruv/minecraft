// QUI TIENT LES SOMMETS D'UNE FAÇADE DE PARIS (v466). Sous node : on maille
// en détail les morceaux de l'ouest de Paris (la moitié du disque à l'ouest
// de Notre-Dame, où l'iPhone de Max est mort en v299), on garde les plus
// lourds, et l'on range leurs sommets de `facades` par TUILE. C'est la sonde
// qu'appelle le témoin de poids de `plafond.js` (`poidsOuestParis`), et
// `node tests/sonde-baies.mjs [src] [options JSON]` l'imprime.
export async function poidsOuestParis(src = '../src', options = {}, garder = 8, liste = null) {
  const { World, CHUNK } = await import(src + '/world.js');
  const { buildChunkTampons } = await import(src + '/mesher.js');
  const { TUILES_HD, rectHD } = await import(src + '/facadeshd.js');
  const { positionDe } = await import(src + '/mondes.js');
  const P = positionDe('paris');
  const parRect = new Map(TUILES_HD.map((n) => [rectHD(n).map((v) => v.toFixed(5)).join(','), n]));
  const w = new World(); w.hd = 1;
  const c0x = Math.floor(P.x / CHUNK), c0z = Math.floor(P.z / CHUNK), R = Math.floor(P.r / CHUNK);
  const morceaux = [];
  const lus = liste || [];
  if (!liste) for (let dx = -R; dx <= -2; dx += 2) for (let dz = -R; dz <= R; dz += 2) if (dx * dx + dz * dz <= R * R) lus.push([dx, dz]);
  for (const [dx, dz] of lus) {
    const t = buildChunkTampons(w, c0x + dx, c0z + dz, { detail: true, ...options });
    const f = t.facades;
    if (!f) continue;
    let octets = 0;
    for (const k of Object.keys(f)) if (f[k] && f[k].byteLength) octets += f[k].byteLength;
    morceaux.push({ dx, dz, cx: c0x + dx, cz: c0z + dz, sommets: f.positions.length / 3, mo: octets / 1048576, f });
  }
  morceaux.sort((a, b) => b.mo - a.mo);
  const lourds = morceaux.slice(0, garder);
  const tuiles = {};
  for (const m of lourds) {
    const tl = m.f.tiles;
    for (let i = 0; i < tl.length; i += 4) {
      const cle = [tl[i], tl[i + 1], tl[i + 2], tl[i + 3]].map((v) => v.toFixed(5)).join(',');
      const n = parRect.get(cle) || 'uv-absolus';
      tuiles[n] = (tuiles[n] || 0) + 1;
    }
    m.f = null;
  }
  const mo = lourds.map((m) => m.mo).sort((a, b) => a - b);
  return {
    lus: morceaux.length,
    pire: mo[mo.length - 1], mediane: mo[Math.floor(mo.length / 2)],
    lourds: lourds.map((m) => ({ dx: m.dx, dz: m.dz, cx: m.cx, cz: m.cz, sommets: m.sommets, mo: +m.mo.toFixed(2) })),
    tuiles: Object.fromEntries(Object.entries(tuiles).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v / lourds.length)])),
  };
}

// LES MÊMES TRIANGLES, FAITS DES MÊMES VALEURS : pour chaque coin de chaque
// triangle, les dix-huit mots du sommet (position, normale, UV, tuile, teinte,
// matière, lueur), comparés bit à bit entre le tampon soudé et l'ancien.
const CHAMPS = [['positions', 3], ['normals', 3], ['uvs', 2], ['tiles', 4], ['colors', 3], ['matiere', 2], ['lueur', 1]];
export function memesTriangles(a, b) {
  if (a.indices.length !== b.indices.length) return { ok: false, coins: 0, ecarts: -1 };
  let ecarts = 0;
  const vues = CHAMPS.map(([k, c]) => [new Uint32Array(a[k].buffer, a[k].byteOffset, a[k].length), new Uint32Array(b[k].buffer, b[k].byteOffset, b[k].length), c]);
  for (let i = 0; i < a.indices.length; i++) {
    const ia = a.indices[i], ib = b.indices[i];
    for (const [va, vb, c] of vues) for (let j = 0; j < c; j++) if (va[ia * c + j] !== vb[ib * c + j]) { ecarts++; break; }
  }
  return { ok: ecarts === 0, coins: a.indices.length, ecarts };
}

// Les huit morceaux les plus lourds de l'ouest (relevés par cette sonde sur la
// v454), en écart au morceau de Notre-Dame.
export const LOURDS_OUEST = [[-13, 5], [-13, 7], [-13, -15], [-13, 11], [-11, -15], [-11, -13], [-21, -1], [-3, -5]];

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await poidsOuestParis(process.argv[2] || '../src', JSON.parse(process.argv[3] || '{}'));
  console.log(JSON.stringify(r, null, 1));
}
