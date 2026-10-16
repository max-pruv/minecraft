// LA LIGNE 1 DE PARIS SE MESURE COMME L'ENFANT LA VIT (v456), sous node, sur
// le vrai monde engendré : on descend de la rue au quai case par case (une
// marche d'un bloc au plus, deux blocs d'air au-dessus des pieds), le passage
// des rames est libre sur tout le tracé, aucune voûte n'ouvre le fleuve, et
// aucune bouche ne mure une rue ni un circuit de voitures. `plafond.js`
// l'appelle telle quelle (une copie de sonde finit par diverger du témoin).
//
//     node tests/sonde-metro-paris.mjs [chemin/vers/src/]
export async function mesurerLigne1(src = new URL('../src/', import.meta.url).href) {
  const V = await import(src + 'ville.js');
  const W = await import(src + 'world.js');
  const P = await import(src + 'paris.js');
  const B = await import(src + 'blocks.js');
  if (!V.traceLigne1Paris) return { absente: true };
  const w = new W.World();
  const yr = V.LIGNE1.voie;
  const bloc = (x, y, z) => w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
  const plein = (x, y, z) => { const b = bloc(x, y, z); return b !== B.BLOCK.AIR && b !== B.BLOCK.WATER; };

  // 1. le gabarit des rames, tous les demi-blocs des deux voies
  const pts = V.traceLigne1Paris();
  let gabarit = 0, lus = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 2));
    for (let k = 0; k < n; k++) {
      const x = a.x + ((b.x - a.x) * k) / n, z = a.z + ((b.z - a.z) * k) / n;
      lus++;
      for (let y = yr + 1; y <= yr + 2; y++) if (plein(x, y, z)) gabarit++;
    }
  }

  // 2. l'enfant descend : de la rue (haut de chaque bouche) au quai
  const marche = (x0, z0, cibles, rayon) => {
    const h0 = w.terrainHeight(Math.floor(x0), Math.floor(z0));
    const ok = (x, y, z) => plein(x, y - 1, z) && !plein(x, y, z) && !plein(x, y + 1, z);
    let pied = null;
    for (let y = h0 + 3; y >= h0 - 1; y--) if (ok(x0, y, z0)) { pied = y; break; }
    if (pied === null) return { depart: false };
    const vus = new Set();
    const file = [[Math.floor(x0), pied, Math.floor(z0)]];
    let pas = 0;
    while (file.length && pas < 60000) {
      const [x, y, z] = file.shift(); pas++;
      const k = `${x},${y},${z}`;
      if (vus.has(k)) continue;
      vus.add(k);
      if (cibles(x, y, z)) return { arrive: true, cases: vus.size };
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (Math.abs(nx - x0) > rayon || Math.abs(nz - z0) > rayon) continue;
        for (const dy of [0, 1, -1]) {
          const ny = y + dy;
          if (dy === 1 && plein(x, y + 2, z)) continue;   // la tête passe pour monter
          if (ok(nx, ny, nz)) { file.push([nx, ny, nz]); break; }
        }
      }
    }
    return { arrive: false, cases: vus.size };
  };
  const descentes = [];
  for (const b of V.BOUCHES_LIGNE1) {
    if (!b) { descentes.push({ nom: '?', arrive: false, sansBouche: true }); continue; }
    const q = b.q;
    const surQuai = (x, y, z) => {
      if (y !== yr + 2) return false;
      const ex = x + 0.5 - q.x, ez = z + 0.5 - q.z;
      const le = ex * q.dx + ez * q.dz, tr = Math.abs(-ex * q.dz + ez * q.dx);
      return Math.abs(le) <= V.LIGNE1.demiStation - 1 && tr >= V.LIGNE1.quai + 0.5 && tr <= V.LIGNE1.demiVoute - 1.5;
    };
    const r = marche(b.tx, b.tz, surQuai, 60);
    descentes.push({ nom: b.nom, ...r });
  }

  // 3. le fleuve : aucune colonne d'eau dont l'eau ait disparu au-dessus du tunnel
  let poches = 0;
  for (const q of V.QUAIS_LIGNE1) {
    for (let le = -14; le <= 14; le++) for (let tr = -9; tr <= 9; tr++) {
      const x = q.x + q.dx * le - q.dz * tr, z = q.z + q.dz * le + q.dx * tr;
      if (P.solParis(Math.floor(x), Math.floor(z)) !== B.BLOCK.WATER) continue;
      // le lit (27) et l'eau (28 à 30) : rien n'y est de l'air
      for (let y = 27; y <= 30; y++) if (bloc(x, y, z) === B.BLOCK.AIR) poches++;
    }
  }

  // 4. les bouches ne murent ni une rue ni un circuit : ce que la bouche pose
  //    à hauteur de carrosserie n'est jamais dans le passage d'une voiture
  //    d'un circuit (demi-largeur 1,13 plus le demi-bloc : 1,7 de l'axe de sa
  //    voie), et jamais sur la chaussée
  const solDe = (x, z) => w.terrainHeight(x, z);
  const circuits = [...P.circuitsParis(solDe), ...(P.circuitsQuartiersParis ? P.circuitsQuartiersParis(solDe) : [])];
  const cpts = [];
  for (const c of circuits) {
    const p = c.pts;
    for (let i = 0; i < p.length - 1; i++) {
      const n = Math.max(1, Math.ceil(Math.hypot(p[i + 1].x - p[i].x, p[i + 1].z - p[i].z) * 2));
      for (let k = 0; k < n; k++) cpts.push([p[i].x + ((p[i + 1].x - p[i].x) * k) / n, p[i].z + ((p[i + 1].z - p[i].z) * k) / n]);
    }
  }
  let mure = 0, surChaussee = 0;
  const VERT = B.DECOR_START + 13 * 10, JAUNE = B.DECOR_START + 2 * 10;
  for (const b of V.BOUCHES_LIGNE1) {
    if (!b) continue;
    const q = b.q;
    for (let le = -30; le <= 30; le++) for (let tr = -26; tr <= 26; tr++) {
      const x = Math.floor(q.x + q.dx * le - q.dz * tr), z = Math.floor(q.z + q.dz * le + q.dx * tr);
      const h = w.terrainHeight(x, z);
      for (let y = h + 1; y <= h + 3; y++) {
        const id = bloc(x, y, z);
        if (id !== VERT && id !== JAUNE) continue;
        const s = P.solParis(x, z);
        if (s !== B.CITY_BLOCK.SIDEWALK && s !== B.BLOCK.GRASS && s !== B.BLOCK.LEAVES) { surChaussee++; if (process.env.DIAG) console.log('chaussee', b.nom, x, y, z, id, s); }
        if (cpts.some(([cx, cz]) => Math.hypot(cx - x - 0.5, cz - z - 0.5) < 1.7)) { mure++; if (process.env.DIAG) console.log('mure', b.nom, x, y, z, id, s); }
        break;
      }
    }
  }
  return {
    stations: V.QUAIS_LIGNE1.length, bouches: V.BOUCHES_LIGNE1.filter(Boolean).length,
    gabarit, lus, descentes, poches, mure, surChaussee, circuits: circuits.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2] ? new URL(process.argv[2], `file://${process.cwd()}/`).href : undefined;
  const r = await mesurerLigne1(src);
  console.log(JSON.stringify({ ...r, descentes: r.descentes && r.descentes.map((d) => `${d.nom}:${d.arrive ? 'ok' : 'NON'}`) }, null, 1));
}
