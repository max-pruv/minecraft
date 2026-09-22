// LA COUCHE HD DE PARIS (v287) : le relief des façades, en tampons et à l'écran.
//     cd tests && npm run parishd
//
// Ce qu'un enfant vit : depuis un trottoir de Paris, une façade a des fenêtres
// EN RETRAIT, des balcons qui saillent, une corniche qui porte son ombre — et
// de loin, la même façade est la tuile plate d'avant. Ce que le témoin garde :
//
// 1. LE DÉTAIL COUVRE EXACTEMENT CE QUE LE PLAT COUVRAIT. Pour chaque face de
//    façade exposée — même règle d'exposition que le mailleur, contre le
//    voisin — un détail est émis, ni plus ni moins. Le compte est fait
//    INDÉPENDAMMENT ici, sur les blocs du morceau, et comparé à ce que le
//    mailleur déclare.
// 2. LA COUCHE HD NE POSE AUCUN BLOC. Les blocs d'un morceau sont identiques
//    à l'octet près avec et sans la couche : invariant 1, par construction,
//    et ici par mesure.
// 3. UN PALIER SANS HD REND LES TAMPONS D'AVANT : ni sol, ni façades, ni plat —
//    tout est dans `solid`, comme en v285. L'iPad de quatre ans ne perd rien.
// 4. HORS DE PARIS, RIEN NE CHANGE, même avec la couche allumée : un morceau
//    de campagne ne reçoit ni sol ni façade HD.
// 5. LE RETRAIT EXISTE : des sommets de vitre sont DANS l'épaisseur du bloc,
//    derrière le nu du mur. C'est la différence entre un relief et une tuile.
// 6. À L'ÉCRAN, le relais près/loin se fait : sous l'enfant le détail est
//    visible et la tuile cachée ; à cinq morceaux, l'inverse. Et `?hd=0`
//    n'installe rien de HD du tout.
const { Banc, dormir } = require('./banc.js');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

(async () => {
  // --- sous node : les tampons ----------------------------------------------------
  const { World, CHUNK, HEIGHT } = await import('../src/world.js');
  const { buildChunkTampons } = await import('../src/mesher.js');
  const { adresseParis } = await import('../src/paris.js');
  // Sur l'ancien code, le module n'existe pas : on le dit, on ne s'effondre pas.
  const HD = await import('../src/facadeshd.js').catch(() => null);
  verifier('la couche HD existe (src/facadeshd.js)', !!HD);
  if (!HD) { console.log(`\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`); process.exit(1); }
  const { FACADE_HD, SOL_HD, couvreHD } = HD;
  const { BLOCK, isTransparent, isSlab } = await import('../src/blocks.js');

  const [px, pz] = adresseParis(-0.8, -0.9);
  const cx = Math.floor(px / CHUNK), cz = Math.floor(pz / CHUNK);

  const tampons = (hd, x, z) => {
    const w = new World();
    w.hd = hd;
    const t = buildChunkTampons(w, x, z);
    return { t, data: w.ensureChunk(x, z).slice(), w };
  };
  const nb = (g) => (g ? g.positions.length / 3 : 0);

  const sans = tampons(0, cx, cz);
  const avec = tampons(1, cx, cz);

  verifier('sans HD, les tampons sont ceux d\'avant : ni sol, ni façades, ni plat',
    !sans.t.sol && !sans.t.facades && !sans.t.plat && !sans.t.platLumineux && nb(sans.t.solid) > 0,
    `solid ${nb(sans.t.solid)}`);

  let identiques = sans.data.length === avec.data.length;
  for (let i = 0; identiques && i < sans.data.length; i++) if (sans.data[i] !== avec.data[i]) identiques = false;
  verifier('la couche HD ne pose aucun bloc : le morceau est identique à l\'octet près', identiques);

  // Le compte indépendant des faces de façade exposées : la règle du mailleur
  // (`shouldRenderFace`), réécrite ici pour ne pas lui faire confiance.
  const data = avec.data;
  const get = (x, y, z) => {
    if (y < 0 || y >= HEIGHT) return BLOCK.AIR;
    if (x >= 0 && x < CHUNK && z >= 0 && z < CHUNK) return data[x + z * CHUNK + y * CHUNK * CHUNK];
    return avec.w.getBlock(cx * CHUNK + x, y, cz * CHUNK + z);
  };
  const expose = (id, voisin) => voisin !== id && (voisin === BLOCK.AIR || isSlab(voisin) || isTransparent(voisin));
  let faces = 0, sols = 0;
  for (let y = 0; y < HEIGHT; y++) for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) {
    const id = data[x + z * CHUNK + y * CHUNK * CHUNK];
    if (FACADE_HD.has(id)) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (expose(id, get(x + dx, y, z + dz))) faces++;
    }
    if (SOL_HD.has(id) && expose(id, get(x, y + 1, z))) sols++;
  }
  verifier('chaque face de façade exposée reçoit son détail, ni plus ni moins',
    faces > 50 && avec.t.facadesDetaillees === faces,
    `${faces} faces exposées, ${avec.t.facadesDetaillees} détaillées`);
  verifier('le sol de la ville passe en HD', sols > 20 && nb(avec.t.sol) > 0, `${sols} faces de sol, ${nb(avec.t.sol)} sommets HD`);
  verifier('le loin garde sa tuile plate', nb(avec.t.plat) + nb(avec.t.platLumineux) > 0,
    `plat ${nb(avec.t.plat)}, plat allumé ${nb(avec.t.platLumineux)}`);

  // Le retrait : un sommet de vitre est derrière le nu du mur. On le lit sur la
  // matière (le verre est le seul métal non rugueux) et sur la position : sa
  // coordonnée dans l'axe de la normale est strictement à l'intérieur du bloc.
  let enRetrait = 0, vitres = 0;
  const f = avec.t.facades;
  for (let i = 0; i < nb(f); i++) {
    const rug = f.matiere[i * 2], met = f.matiere[i * 2 + 1];
    if (!(rug < 0.2 && met > 0.5)) continue;
    vitres++;
    const nx = f.normals[i * 3], nz = f.normals[i * 3 + 2];
    if (Math.abs(nx) < 0.99 && Math.abs(nz) < 0.99) continue;
    const p = Math.abs(nx) > 0.5 ? f.positions[i * 3] : f.positions[i * 3 + 2];
    const frac = p - Math.floor(p);
    if (frac > 0.05 && frac < 0.95) enRetrait++;
  }
  verifier('les vitres sont en retrait dans l\'épaisseur du mur', vitres > 100 && enRetrait > vitres * 0.5,
    `${vitres} sommets de vitre, ${enRetrait} en retrait`);

  // La rue se lit : du marquage blanc (la seule matière à 0,7 de rugosité sans
  // métal) et des lèvres de bordure (le granit, à 0,75) dans le tampon du sol.
  {
    const g = avec.t.sol;
    let marquage = 0, bordure = 0;
    for (let i = 0; i < nb(g); i++) {
      const rug = g.matiere[i * 2], met = g.matiere[i * 2 + 1];
      if (met !== 0) continue;
      if (Math.abs(rug - 0.7) < 0.01) marquage++;
      if (Math.abs(rug - 0.75) < 0.01 && g.positions[i * 3 + 1] % 1 > 0.1) bordure++;
    }
    verifier('la rue porte son marquage et sa bordure en relief', marquage > 0 && bordure > 0,
      `${marquage} sommets de marquage, ${bordure} de bordure en relief`);
  }

  const campagne = tampons(1, Math.floor(30000 / CHUNK), Math.floor(30000 / CHUNK));
  verifier('hors de Paris, la couche allumée ne change rien',
    !couvreHD(Math.floor(30000 / CHUNK), Math.floor(30000 / CHUNK), CHUNK) && !campagne.t.sol && !campagne.t.facades && !campagne.t.plat);

  // Le coût, mesuré et imprimé — pas un verdict, une mesure pour le journal.
  {
    const w = new World(); w.hd = 1;
    buildChunkTampons(w, cx, cz);
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) { w.chunks.clear(); w.tops.clear(); buildChunkTampons(w, cx, cz); }
    const avecMs = (performance.now() - t0) / 5;
    w.hd = 0;
    const t1 = performance.now();
    for (let i = 0; i < 5; i++) { w.chunks.clear(); w.tops.clear(); buildChunkTampons(w, cx, cz); }
    const sansMs = (performance.now() - t1) / 5;
    console.log(`   ⏱ un morceau de Paris : ${sansMs.toFixed(1)} ms sans HD, ${avecMs.toFixed(1)} ms avec (${nb(avec.t.facades)} sommets, ${(avec.t.facades.indices.length / 3) | 0} triangles de façade)`);
  }

  // --- à l'écran : le relais près/loin ---------------------------------------------
  const banc = new Banc({ portJeu: 8402, portPairs: 9402 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Colette', { rr: 6, params: '&hd=2' });
    const res = await tab.evaluate(async ([x, z]) => {
      const g = window.__game;
      const y = g.world.terrainHeight(x, z);
      g.player.pos.set(x + 0.5, y + 2, z + 0.5); g.player.vel.set(0, 0, 0);
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
      const cle = (dx, dz) => `${cx + dx},${cz + dz}`;
      const t0 = performance.now();
      while (performance.now() - t0 < 40000) {
        await dodo(500);
        const ici = g.chunkMeshes.get(cle(0, 0)), loin = g.chunkMeshes.get(cle(5, 0)) || g.chunkMeshes.get(cle(-5, 0)) || g.chunkMeshes.get(cle(0, 5));
        if (ici && ici.facades && loin && (loin.plat || loin.facades)) {
          await dodo(300);
          return {
            attente: Math.round(performance.now() - t0),
            iciDetail: ici.facades.visible, iciPlat: ici.plat ? ici.plat.visible : null,
            loinDetail: loin.facades ? loin.facades.visible : null, loinPlat: loin.plat ? loin.plat.visible : null,
            atlas: !!g.atlasHD, rayon: g.RAYON_HD, appels: g.renderer.info.render.calls,
            morceauxHD: [...g.chunkMeshes.values()].filter((e) => e.facades).length,
          };
        }
      }
      return { attente: 40000, ici: !!g.chunkMeshes.get(cle(0, 0)), loin: !!g.chunkMeshes.get(cle(5, 0)) };
    }, [px, pz]);
    verifier('sous l\'enfant, le détail est visible et la tuile plate cachée',
      res.iciDetail === true && res.iciPlat === false, JSON.stringify(res));
    verifier('à cinq morceaux, la tuile plate est visible et le détail caché',
      res.loinPlat === true && res.loinDetail === false, JSON.stringify(res));
    verifier('l\'atlas HD est peint et le rayon forcé est celui de l\'adresse', res.atlas === true && res.rayon === 2);
    verifier('aucune erreur JavaScript de bout en bout', tab.erreurs.length === 0, JSON.stringify(tab.erreurs.slice(0, 3)));
    await tab.close();

    const bas = await banc.jouerSeul('Firmin', { rr: 4, params: '&hd=0' });
    const res0 = await bas.evaluate(async ([x, z]) => {
      const g = window.__game;
      const y = g.world.terrainHeight(x, z);
      g.player.pos.set(x + 0.5, y + 2, z + 0.5); g.player.vel.set(0, 0, 0);
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
      const t0 = performance.now();
      while (performance.now() - t0 < 30000) {
        await dodo(500);
        if (g.chunkMeshes.get(`${cx},${cz}`)) break;
      }
      await dodo(1500);
      const entrees = [...g.chunkMeshes.values()];
      return { morceaux: entrees.length, hd: entrees.filter((e) => e.facades || e.sol || e.plat).length, atlas: !!g.atlasHD, rayon: g.RAYON_HD };
    }, [px, pz]);
    verifier('avec ?hd=0, rien de HD n\'est installé — ni maillage, ni atlas',
      res0.morceaux > 0 && res0.hd === 0 && res0.atlas === false && res0.rayon === 0, JSON.stringify(res0));
    verifier('aucune erreur JavaScript sans HD', bas.erreurs.length === 0, JSON.stringify(bas.erreurs.slice(0, 3)));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ Paris a du relief de près, sa tuile de loin, et pas un bloc n\'a bougé');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
