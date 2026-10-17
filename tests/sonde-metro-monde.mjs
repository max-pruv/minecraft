// LES MÉTROS DES VILLES ENGENDRÉES SE MESURENT COMME L'ENFANT LES VIT (v500),
// sous node, sur le vrai monde engendré — la sonde de la ligne 1 de Paris
// (`sonde-metro-paris.mjs`), recopiée pour une ville qui n'a qu'une fiche : de
// la rue au quai case par case pour chaque bouche (une marche d'un bloc au
// plus, deux blocs d'air au-dessus des pieds), le passage des rames libre sur
// les deux voies, aucune poche d'air dans le fleuve, rien de la bouche sur la
// chaussée ni dans le passage d'un circuit, aucun feu retiré, et RIEN de changé
// hors du métro (le monde désarmé, comparé bloc à bloc au-dessus de la rue).
// `plafond.js` l'appelle telle quelle.
//
//     node tests/sonde-metro-monde.mjs [chemin/vers/src/]
export async function mesurerMetrosMonde(src = new URL('../src/', import.meta.url).href) {
  let M;
  try { M = await import(src + 'metromonde.js'); } catch { return { absente: true }; }
  const W = await import(src + 'world.js');
  const VM = await import(src + 'villesmonde.js');
  const B = await import(src + 'blocks.js');
  const w = new W.World();
  const res = [];
  for (const L of M.LIGNES_MONDE) {
    const yr = L.voie;
    const bloc = (x, y, z) => w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    const plein = (x, y, z) => { const b = bloc(x, y, z); return b !== B.BLOCK.AIR && b !== B.BLOCK.WATER; };

    // 1. le gabarit des rames, tous les demi-blocs des deux voies
    const pts = M.traceLigneMonde(L);
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

    // 2. l'enfant descend : du haut de chaque bouche au quai
    const marche = (x0, z0, cible, rayon) => {
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
        if (cible(x, y, z)) return { arrive: true, cases: vus.size };
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
    const G = M.GABARIT;
    const descentes = [];
    for (const b of L.bouches) {
      if (!b) continue;
      const q = b.q;
      const surQuai = (x, y, z) => {
        if (y !== yr + 2) return false;
        const ex = x + 0.5 - q.x, ez = z + 0.5 - q.z;
        const le = ex * q.dx + ez * q.dz, tr = Math.abs(-ex * q.dz + ez * q.dx);
        return Math.abs(le) <= G.demiStation - 1 && tr >= G.quai + 0.5 && tr <= G.demiVoute - 1.5;
      };
      descentes.push({ nom: b.nom, ...marche(b.tx, b.tz, surQuai, 60) });
    }

    // 3. le fleuve : aucune colonne d'eau dont l'eau ait disparu au-dessus
    let poches = 0;
    for (const p of L.trace) {
      for (let dx = -9; dx <= 9; dx++) for (let dz = -9; dz <= 9; dz++) {
        const x = Math.floor(p.x + dx), z = Math.floor(p.z + dz);
        const h = w.terrainHeight(x, z);
        if (h >= 30) continue;
        for (let y = h + 1; y <= 30; y++) if (bloc(x, y, z) === B.BLOCK.AIR) poches++;
        if (!plein(x, h, z)) poches++;
      }
    }

    // 4. ce que la bouche pose au-dessus de la rue est sur le trottoir, hors du
    //    passage d'un circuit (1,7 de l'axe de sa voie), et aucun feu ne manque ;
    //    5. et rien d'autre ne change au-dessus de la rue (monde désarmé)
    const solDe = (x, z) => w.terrainHeight(x, z);
    const circuits = VM.circulationsAPlier(solDe).filter((c) => c.cle === L.def.cle).flatMap((c) => c.deplier());
    const cpts = [];
    for (const c of circuits) {
      const p = c.pts;
      for (let i = 0; i < p.length - 1; i++) {
        const n = Math.max(1, Math.ceil(Math.hypot(p[i + 1].x - p[i].x, p[i + 1].z - p[i].z) * 2));
        for (let k = 0; k < n; k++) cpts.push([p[i].x + ((p[i + 1].x - p[i].x) * k) / n, p[i].z + ((p[i + 1].z - p[i].z) * k) / n]);
      }
    }
    // les deux mondes se lisent chacun sous SON réglage : un morceau s'engendre
    // à la première lecture, et l'interrupteur est celui du module
    const cases = [];
    const vus = new Set();
    for (const b of L.bouches) {
      if (!b) continue;
      const q = b.q;
      for (let le = -40; le <= 40; le++) for (let tr = -40; tr <= 40; tr++) {
        const x = Math.floor(q.x + q.dx * le - q.dz * tr), z = Math.floor(q.z + q.dz * le + q.dx * tr);
        const k = x * 65536 + z;
        if (vus.has(k)) continue;
        vus.add(k);
        const h = w.terrainHeight(x, z);
        const ids = [];
        for (let y = h; y <= h + 8; y++) ids.push(bloc(x, y, z));
        cases.push({ x, z, h, ids, nom: b.nom });
      }
    }
    M.METRO_MONDE.actif = false;
    const w0 = new W.World();
    for (const c of cases) { c.ids0 = []; for (let y = c.h; y <= c.h + 8; y++) c.ids0.push(w0.getBlock(c.x, y, c.z)); }
    M.METRO_MONDE.actif = true;
    let mure = 0, surChaussee = 0, feux = 0, ailleurs = 0, poses = 0, trouSousVoie = 0;
    for (const { x, z, h, ids, ids0, nom } of cases) {
      if (h < 30) continue;            // le fleuve : son lit est la voûte, les poches se comptent plus haut
      const s = VM.solVillesMonde(x, z);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i], id0 = ids0[i], y = h + i;
        if (id0 === B.RUE.FEUX && id !== B.RUE.FEUX) feux++;
        if (id === id0) continue;
        // ce qui a changé : du vide creusé (la trémie), ou une pièce posée
        if (id !== B.BLOCK.AIR) {
          poses++;
          if (s !== B.CITY_BLOCK.SIDEWALK) { surChaussee++; if (process.env.DIAG) console.log('chaussee', nom, x, y, z, id, s); }
          if (cpts.some(([cx, cz]) => Math.hypot(cx - x - 0.5, cz - z - 0.5) < 1.7)) { mure++; if (process.env.DIAG) console.log('mure', nom, x, y, z); }
        } else {
          if (s !== B.CITY_BLOCK.SIDEWALK) { ailleurs++; if (process.env.DIAG) console.log('trou hors trottoir', nom, x, y, z, s); }
          // la trémie ouverte (le sol de la rue creusé) jamais sous une voiture
          if (y === h && cpts.some(([cx, cz]) => Math.hypot(cx - x - 0.5, cz - z - 0.5) < 1.7)) { trouSousVoie++; if (process.env.DIAG) console.log('trou sous voie', nom, x, y, z); }
        }
      }
    }
    res.push({
      ville: L.def.cle, nom: L.def.nom, stations: L.quais.length, bouches: L.bouches.filter(Boolean).length,
      sansBouche: L.bouches.map((b, k) => (b ? null : L.quais[k].nom)).filter(Boolean),
      gabarit, lus, descentes, poches, mure, trouSousVoie, surChaussee, feux, ailleurs, poses, circuits: circuits.length,
    });
  }
  return { lignes: res };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2] ? new URL(process.argv[2], `file://${process.cwd()}/`).href : undefined;
  const r = await mesurerMetrosMonde(src);
  for (const l of r.lignes || []) console.log(JSON.stringify({ ...l, descentes: l.descentes.map((d) => `${d.nom}:${d.arrive ? 'ok' : 'NON'}`) }, null, 1));
  if (r.absente) console.log('absente');
}
