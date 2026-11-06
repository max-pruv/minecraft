// CE QUE PARIS MESURE DANS LE JEU RENDU (chantier échelle, v587). Sous node :
// on maille en détail des morceaux de rue de Paris avec le mailleur du jeu
// (`buildChunkTampons`, les tampons que la tablette dessine tels quels), et l'on
// relève, colonne de façade par colonne de façade, la cote de chaque élément —
// soubassement, vitrage, enseigne, store, porte cochère, entresol, baies,
// corniche, faîte — et celle du mobilier (table, chaise, banc, potelet, colonne
// Morris, corbeille). Le voxel se lit par `batirColonneParis`. Tout est en blocs
// = mètres (un bloc vaut un mètre à la verticale, v301).
//
//   node tests/sonde-echelle-paris.mjs [src]
export async function mesurerParis(src = '../src') {
  const { World, CHUNK } = await import(src + '/world.js');
  const { buildChunkTampons } = await import(src + '/mesher.js');
  const { TUILES_HD, rectHD } = await import(src + '/facadeshd.js');
  const P_ = await import(src + '/paris.js');
  const { PARIS, solParis, lotParisLibre, batirColonneParis, gabaritParis } = P_;
  const { ARCHI, BLOCK, BLOCK_INFO } = await import(src + '/blocks.js');
  const nomBloc = (id) => { for (const k in ARCHI) if (ARCHI[k] === id) return 'ARCHI.' + k; for (const k in BLOCK) if (BLOCK[k] === id) return k; return String(id); };
  const parRect = new Map(TUILES_HD.map((n) => [rectHD(n).map((v) => v.toFixed(5)).join(','), n]));
  const w = new World(); w.hd = 1;

  // 1. Le voxel : la colonne de façade type (une vitrine, une porte cochère),
  //    et la distribution des gabarits sur un échantillon du disque.
  const colonnes = [];
  for (let x = PARIS.x - 120; x <= PARIS.x + 120; x += 1) for (let z = PARIS.z - 120; z <= PARIS.z + 120; z += 1) {
    if (solParis(x, z) !== null || !lotParisLibre(x, z)) continue;
    const g = gabaritParis(x, z);
    if (g.dedans) continue;
    colonnes.push({ x, z, g });
  }
  const parBh = {};
  for (const c of colonnes) parBh[c.g.bh] = (parBh[c.g.bh] || 0) + 1;
  const typeVitrine = colonnes.find((c) => { const col = {}; batirColonneParis(c.x, c.z, (dy, id) => { col[dy] = id; }); return (col[1] === ARCHI.VITRINE_BAS || col[2] === ARCHI.VITRINE_BAS) && !c.g.angle && c.g.bh === 6; });   // le premier rang est le socle depuis la v587
  const typePorte = colonnes.find((c) => { const col = {}; batirColonneParis(c.x, c.z, (dy, id) => { col[dy] = id; }); return (col[1] === ARCHI.PORTE_BAS || col[2] === ARCHI.PORTE_BAS) && !c.g.angle && c.g.bh === 6; });
  const lire = (c) => { const col = []; batirColonneParis(c.x, c.z, (dy, id) => { col[dy] = nomBloc(id); }); return col.slice(1); };
  const voxel = {
    colonnesLues: colonnes.length, parBh,
    rdc: P_.HAUT_RDC, entresol: P_.HAUT_ENTRESOL, etage: P_.BLOCS_PAR_ETAGE,
    facade6: typeVitrine ? typeVitrine.g.facade : null,
    sommet6: typeVitrine ? typeVitrine.g.sommet : null,
    vitrine: typeVitrine ? lire(typeVitrine) : null,
    porte: typePorte ? lire(typePorte) : null,
  };

  // 2. La couche HD : on maille les morceaux des colonnes types et l'on range
  //    les sommets de `facades` par colonne et par tuile.
  const releve = {};
  const mobilier = {};
  const chunks = new Set();
  for (const c of [typeVitrine, typePorte]) if (c) chunks.add(`${Math.floor(c.x / CHUNK)},${Math.floor(c.z / CHUNK)}`);
  // et quelques morceaux de plus pour le mobilier
  const cc = [Math.floor(PARIS.x / CHUNK), Math.floor(PARIS.z / CHUNK)];
  for (let dx = -4; dx <= 4; dx += 2) for (let dz = -4; dz <= 4; dz += 2) chunks.add(`${cc[0] + dx},${cc[1] + dz}`);
  for (const k of chunks) {
    const [cx, cz] = k.split(',').map(Number);
    const t = buildChunkTampons(w, cx, cz, { detail: true });
    const f = t.facades;
    if (!f) continue;
    const pos = f.positions, tl = f.tiles, nrm = f.normals;
    const sol = (x, z) => w.terrainHeight(x, z);
    for (let i = 0; i < pos.length / 3; i++) {
      const cle = [tl[i * 4], tl[i * 4 + 1], tl[i * 4 + 2], tl[i * 4 + 3]].map((v) => v.toFixed(5)).join(',');
      const tuile = parRect.get(cle) || 'uv-absolus';
      const lx = pos[i * 3], y = pos[i * 3 + 1], lz = pos[i * 3 + 2];
      const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
      // le mobilier : tuiles de fonte, rotin, lattes, affiche, fer ; on les
      // range par colonne entière (le pied) et l'on garde l'étendue en y
      if (['fonte', 'rotin', 'lattes', 'affiche', 'fer'].includes(tuile)) {
        const col = `${Math.floor(wx - 1e-6)},${Math.floor(wz - 1e-6)}`;
        const m = mobilier[col] || (mobilier[col] = { tuiles: {}, y0: Infinity, y1: -Infinity, sol: null });
        if (m.sol === null) m.sol = sol(Math.floor(wx - 1e-6), Math.floor(wz - 1e-6)) + 1;
        const tt = m.tuiles[tuile] || (m.tuiles[tuile] = { y0: Infinity, y1: -Infinity });
        tt.y0 = Math.min(tt.y0, y); tt.y1 = Math.max(tt.y1, y);
        m.y0 = Math.min(m.y0, y); m.y1 = Math.max(m.y1, y);
      }
      for (const c of [typeVitrine, typePorte]) {
        if (!c) continue;
        // la façade de la colonne type : les sommets à moins de 0,6 bloc de son
        // centre en (x, z) hors de la direction de la face
        const dx = wx - (c.x + 0.5), dz = wz - (c.z + 0.5);
        if (Math.abs(dx) > 0.75 || Math.abs(dz) > 0.75) continue;
        const nom = c === typeVitrine ? 'vitrine' : 'porte';
        const r = releve[nom] || (releve[nom] = { sol: sol(c.x, c.z) + 1, tuiles: {} });
        const tt = r.tuiles[tuile] || (r.tuiles[tuile] = { y0: Infinity, y1: -Infinity, n: 0 });
        tt.y0 = Math.min(tt.y0, y); tt.y1 = Math.max(tt.y1, y); tt.n++;
      }
    }
  }
  // Les relevés HD en hauteur au-dessus du trottoir (le sol de la colonne)
  const hd = {};
  for (const [nom, r] of Object.entries(releve)) {
    hd[nom] = {};
    for (const [tuile, tt] of Object.entries(r.tuiles).sort((a, b) => a[1].y0 - b[1].y0)) hd[nom][tuile] = { bas: +(tt.y0 - r.sol).toFixed(2), haut: +(tt.y1 - r.sol).toFixed(2), sommets: tt.n };
  }
  // Le mobilier : on reconnaît le genre à sa combinaison de tuiles et à sa hauteur
  const meubles = {};
  for (const m of Object.values(mobilier)) {
    const h = +(m.y1 - m.sol).toFixed(2);
    const t = Object.keys(m.tuiles).sort().join('+');
    let genre = 'autre';
    if (t === 'fonte+rotin') genre = 'terrasse';
    else if (t === 'fonte+lattes') genre = 'banc';
    else if (t.includes('affiche')) genre = 'morris';
    else if (t === 'fonte+fer') genre = 'corbeille';
    else if (t === 'fonte' && h < 1.1) genre = 'potelet';
    const g = meubles[genre] || (meubles[genre] = { n: 0, hauteurs: [], detail: {} });
    g.n++; g.hauteurs.push(h);
    for (const [tu, tt] of Object.entries(m.tuiles)) {
      const d = g.detail[tu] || (g.detail[tu] = { bas: Infinity, haut: -Infinity });
      d.bas = Math.min(d.bas, +(tt.y0 - m.sol).toFixed(2)); d.haut = Math.max(d.haut, +(tt.y1 - m.sol).toFixed(2));
    }
  }
  for (const g of Object.values(meubles)) { g.hauteurs.sort((a, b) => a - b); g.mediane = g.hauteurs[Math.floor(g.hauteurs.length / 2)]; delete g.hauteurs; }
  return { voxel, hd, meubles };
}

if (process.argv[1] && process.argv[1].endsWith('sonde-echelle-paris.mjs')) {
  const r = await mesurerParis(process.argv[2] || '../src');
  console.log(JSON.stringify(r, null, 1));
}
