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
  const RELEVE = HD.RELEVE ?? 0;
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

  // La rue se lit comme une rue de Paris : du marquage blanc (la seule matière à
  // 0,7 de rugosité sans métal), une bordure de granit (0,75) qui MONTE de
  // `RELEVE`, et un trottoir d'asphalte (0,95) dont la face est à `RELEVE`
  // au-dessus du bloc — dans le tampon du sol, jamais dans les blocs.
  {
    const g = avec.t.sol;
    let marquage = 0, bordure = 0, trottoir = 0, trottoirBas = 0;
    const haut = (i) => Math.abs((g.positions[i * 3 + 1] % 1) - RELEVE) < 0.02;
    for (let i = 0; i < nb(g); i++) {
      const rug = g.matiere[i * 2], met = g.matiere[i * 2 + 1];
      if (met !== 0) continue;
      if (Math.abs(rug - 0.7) < 0.01) marquage++;
      if (Math.abs(rug - 0.75) < 0.01 && haut(i)) bordure++;
      if (Math.abs(rug - 0.95) < 0.01 && g.normals[i * 3 + 1] > 0.5) { if (haut(i)) trottoir++; else trottoirBas++; }
    }
    verifier('la rue porte son marquage, sa bordure de granit et son trottoir relevé',
      marquage > 0 && bordure > 0 && trottoir > 0 && trottoirBas === 0,
      `${marquage} sommets de marquage, ${bordure} de bordure en relief, trottoir relevé ${trottoir} (à plat ${trottoirBas})`);
  }

  // --- v288 : les quartiers, les arbres, le mobilier -----------------------------
  // On classe les sommets par leur TUILE (le rectangle d'atlas qu'ils portent),
  // pas par leur matière : deux tuiles peuvent partager une rugosité.
  const rectDe = HD.rectHD;
  const compteTuile = (g, nom) => {
    if (!g || !rectDe) return 0;
    // une tuile que l'ancien code ne connaît pas compte zéro : le témoin rougit,
    // il ne fait pas lâcher le banc (et les verdicts suivants sont rendus)
    let r;
    try { r = rectDe(nom); } catch (e) { return 0; }
    let n = 0;
    for (let i = 0; i < nb(g); i++) if (Math.abs(g.tiles[i * 4] - r[0]) < 1e-5 && Math.abs(g.tiles[i * 4 + 1] - r[1]) < 1e-5) n++;
    return n;
  };
  {
    // Le Marais n'est pas Monceau : un mur d'enduit et des volets d'un côté, de
    // la pierre de taille et aucun volet de l'autre.
    // Le morceau témoin du Marais se CHERCHE : le centre du quartier tombe sur
    // une place, et un morceau sans façade ne prouverait rien (v285 : un témoin
    // qui écrit son terrain se trompe de terrain).
    const { infoFacadeParis } = await import('../src/paris.js');
    const [mx, mz] = adresseParis(0.9, -0.35);
    let marais = null, ou = null;
    for (let r = 0; r <= 6; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const kx = Math.floor(mx / CHUNK) + dx, kz = Math.floor(mz / CHUNK) + dz;
      // UN MORCEAU À CHEVAL SUR DEUX QUARTIERS N'EST PAS UN TÉMOIN DE QUARTIER
      // (v294) : le morceau qui porte le plus de façades autour du centre du
      // Marais avait un coin dans Haussmann, et rendait « enduit 692 · volets
      // 480 · pierre 1200 » — deux registres à la fois, ce qui n'accuse ni
      // l'un ni l'autre. Le centre ET les quatre coins du morceau sont du
      // Marais, ou le morceau n'est pas retenu.
      const coins = [[CHUNK / 2, CHUNK / 2], [0, 0], [CHUNK - 1, 0], [0, CHUNK - 1], [CHUNK - 1, CHUNK - 1]];
      if (!coins.every(([cx, cz]) => { const i = infoFacadeParis(kx * CHUNK + cx, kz * CHUNK + cz); return i && i.quartier === 'Marais'; })) continue;
      const t = tampons(1, kx, kz);
      // (La v292 écartait tout morceau qu'un monument ATTEINT : celui de
      // Notre-Dame, (−13, 13), avait un coin dans le Quartier latin et deux
      // mille sommets de pierre. Le critère des cinq points le rejette déjà ;
      // et « atteint » n'est pas « écrit » — le vrai morceau du Marais,
      // (−13, 12), est à portée du modèle sans en recevoir un sommet. Ce que
      // le verdict exige — pas de pierre — reste exigé.)
      // ET ON GARDE LE MORCEAU QUI PORTE LE PLUS DE FAÇADES, pas le premier
      // qui en porte deux mille (v294) : les rues élargies laissent à un
      // morceau de seize blocs un coin d'îlot, et le premier venu a rendu
      // « enduit 100 · volets 0 » sur un registre parfaitement en place.
      // Mesuré sous node : (−13, 12) porte 25 322 sommets de façade, enduit
      // 1 924 · volets 3 680 · pierre 0.
      if (nb(t.t.facades) > (marais ? nb(marais.t.facades) : 0)) { marais = t; ou = [kx, kz]; }
    }
    if (!marais) marais = tampons(1, Math.floor(mx / CHUNK), Math.floor(mz / CHUNK));
    console.log(`   🔎 morceau du Marais : ${ou ? ou.join(',') : 'aucun avec façades'}`);
    const enduitM = compteTuile(marais.t.facades, 'enduit'), voletM = compteTuile(marais.t.facades, 'volet');
    const pierreM = compteTuile(marais.t.facades, 'pierre');
    const enduitH = compteTuile(avec.t.facades, 'enduit'), voletH = compteTuile(avec.t.facades, 'volet');
    const pierreH = compteTuile(avec.t.facades, 'pierre');
    verifier('chaque quartier a son registre : enduit et volets au Marais, pierre de taille à Haussmann',
      enduitM > 100 && voletM > 50 && pierreM === 0 && pierreH > 100 && enduitH === 0 && voletH === 0,
      `Marais enduit ${enduitM} · volets ${voletM} · pierre ${pierreM} — Haussmann pierre ${pierreH} · enduit ${enduitH} · volets ${voletH}`);
    // La plaque de rue, au coin de l'immeuble, sur le premier chaînage.
    verifier('les coins portent une plaque de rue', compteTuile(avec.t.facades, 'plaque') > 0,
      `${compteTuile(avec.t.facades, 'plaque')} sommets de plaque`);
    // Le mobilier : des potelets au bord du caniveau, et des terrasses.
    const fonte = compteTuile(avec.t.facades, 'fonte'), rotin = compteTuile(avec.t.facades, 'rotin');
    verifier('des potelets de fonte bordent le trottoir', fonte > 0, `${fonte} sommets de fonte, ${rotin} de cannage`);
  }
  {
    // UN ARBRE HD PAR TRONC. On cherche un morceau de Paris qui plante des
    // arbres (autour du morceau témoin), on compte ses bases de tronc dans les
    // BLOCS, et l'on exige autant de fûts maillés — et plus une seule face de
    // bois ou de feuilles dans `solid` : elles sont toutes passées dans `plat`.
    let trouve = null;
    boucle: for (let r = 0; r <= 4; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const t = tampons(1, cx + dx, cz + dz);
      let troncs = 0;
      for (let y = 1; y < HEIGHT - 1; y++) for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) {
        const i = x + z * CHUNK + y * CHUNK * CHUNK;
        if (t.data[i] === BLOCK.LOG && t.data[i - CHUNK * CHUNK] !== BLOCK.LOG) troncs++;
      }
      if (troncs > 0) { trouve = { t, troncs, cx: cx + dx, cz: cz + dz }; break boucle; }
    }
    if (!trouve) {
      verifier('un morceau de Paris avec des arbres existe près du témoin', false, 'aucun tronc dans 81 morceaux');
    } else {
      const ecorce = compteTuile(trouve.t.t.facades, 'ecorce'), feuillage = compteTuile(trouve.t.t.facades, 'feuillage');
      // un fût = 8 pans × 2 anneaux = 16 sommets ; deux branches de 5 pans = 20 ; 36 par arbre
      const futs = ecorce / 36;
      const sans = tampons(0, trouve.cx, trouve.cz);
      verifier('un arbre maillé par tronc, et les blocs de l\'arbre passent au loin',
        Math.abs(futs - trouve.troncs) < 0.01 && feuillage > 0 && nb(trouve.t.t.solid) < nb(sans.t.solid),
        `${trouve.troncs} tronc(s), ${futs} fût(s) maillé(s), ${feuillage} sommets de feuillage ; solid ${nb(sans.t.solid)} → ${nb(trouve.t.t.solid)} (morceau ${trouve.cx},${trouve.cz})`);
    }
  }

  // --- v289 : le comble à la Mansart, et le mobilier du milieu du trottoir ----------
  // Le zinc se lit à sa MATIÈRE (rugosité 0,42, métal 0,78 : la seule), parce
  // qu'un quad à UV absolus porte la tuile neutre. Une pente est un sommet de
  // zinc dont la normale a une composante verticale ET une composante
  // horizontale : le brisis (raide, ny < 0,4), le terrasson (le champ de
  // hauteurs, 0,4 < ny < 0,99 : de 45° à presque plat).
  {
    const zinc = (g, pred) => {
      let n = 0;
      for (let i = 0; i < nb(g); i++) {
        if (Math.abs(g.matiere[i * 2] - 0.42) > 1e-3 || Math.abs(g.matiere[i * 2 + 1] - 0.78) > 1e-3) continue;
        const ny = g.normals[i * 3 + 1], nh = Math.abs(g.normals[i * 3]) + Math.abs(g.normals[i * 3 + 2]);
        if (pred(ny, nh)) n++;
      }
      return n;
    };
    // TOUT SE COMPTE SUR UN CARRÉ DE VINGT-CINQ MORCEAUX : le morceau de base est
    // une place presque sans toit (52 sommets de brisis à lui seul), et un témoin
    // qui écrit son terrain se trompe de terrain (v285). Mesuré à l'écriture :
    // 2 512 sommets de brisis, 2 292 de terrasson en pente, 1 552 de dessus dans
    // `plat` ; les barres sont à la moitié. Sur l'ancien code, zéro des trois.
    let brisis = 0, terrasson = 0, platHaut = 0, affiche = 0, lattes = 0, corbeilles = 0;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const t = (dx === 0 && dz === 0) ? avec.t : tampons(1, cx + dx, cz + dz).t;
      if (t.facades) {
        brisis += zinc(t.facades, (ny, nh) => ny > 0.1 && ny < 0.4 && nh > 0.1);
        terrasson += zinc(t.facades, (ny, nh) => ny > 0.4 && ny < 0.99 && nh > 0.05);
        affiche += compteTuile(t.facades, 'affiche'); lattes += compteTuile(t.facades, 'lattes');
        corbeilles += compteTuile(t.facades, 'fer');
      }
      for (let i = 0; i < nb(t.plat); i++) if (t.plat.normals[i * 3 + 1] > 0.99) platHaut++;
    }
    verifier('le comble est à la Mansart : un brisis raide au premier rang, un terrasson en pente douce au-dessus',
      brisis > 1200 && terrasson > 1100,
      `${brisis} sommets de brisis, ${terrasson} de terrasson en pente, sur 25 morceaux`);
    // AUCUNE PENTE N'EST VRILLÉE, ET AUCUNE NE SORT DE SA COLONNE. Un quad dont
    // l'arête haute va à rebours de l'arête basse est un nœud papillon : deux
    // ailerons de zinc dressés au bout des faîtières (vu en capture, quand les
    // deux côtés d'un bloc étaient à l'air). On lit les quads par leurs indices
    // (a, b, c, a, c, d) et l'on compare le sens des deux arêtes. Un brisis
    // monte jusqu'au bord du champ de hauteurs, donc jusqu'à trois blocs ; en
    // plan, rien ne dépasse la colonne.
    let vrilles = 0, debordent = 0, pentes = 0;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const t = (dx === 0 && dz === 0) ? avec.t : tampons(1, cx + dx, cz + dz).t;
      const g = t.facades; if (!g) continue;
      const P = g.positions, N = g.normals, Mt = g.matiere, I = g.indices;
      for (let k = 0; k + 5 < I.length; k += 6) {
        const a = I[k], b = I[k + 1], c = I[k + 2], d = I[k + 5];
        if (I[k + 3] !== a || I[k + 4] !== c) continue;
        if (Math.abs(Mt[a * 2] - 0.42) > 1e-3 || Math.abs(Mt[a * 2 + 1] - 0.78) > 1e-3) continue;
        const ny = N[a * 3 + 1], nh = Math.abs(N[a * 3]) + Math.abs(N[a * 3 + 2]);
        if (!(ny > 0.1 && ny < 0.99 && nh > 0.05)) continue;
        pentes++;
        const p = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
        const [pa, pb, pc, pd] = [a, b, c, d].map(p);
        const bas = [pb[0] - pa[0], pb[2] - pa[2]], haut = [pc[0] - pd[0], pc[2] - pd[2]];
        if (bas[0] * haut[0] + bas[1] * haut[1] < -1e-6) vrilles++;
        for (const ax of [0, 1, 2]) {
          const v = [pa[ax], pb[ax], pc[ax], pd[ax]];
          if (Math.max(...v) - Math.min(...v) > (ax === 1 ? 3.001 : 1.001)) { debordent++; break; }
        }
      }
    }
    verifier('aucune pente de toit n\'est vrillée, aucune ne sort de sa colonne',
      pentes > 500 && vrilles === 0 && debordent === 0,
      `${pentes} pentes, ${vrilles} vrillée(s), ${debordent} hors colonne`);
    verifier('le dessus des blocs de toit exposés est dans le loin, avec leurs faces', platHaut > 700,
      `${platHaut} sommets de dessus de toit dans plat, sur 25 morceaux`);
    verifier('des bancs, des colonnes Morris et des corbeilles meublent les trottoirs',
      affiche > 0 && lattes > 0 && corbeilles > 0,
      `${affiche} sommets d'affiche, ${lattes} de lattes, ${corbeilles} de fil de corbeille, sur 25 morceaux`);
  }

  // --- les huit monuments en relief (v292) ------------------------------------------

  {
    const MH = await import('../src/paris-monuments-hd.js').catch(() => null);
    const W = await import('../src/world.js');
    const REPERES_HD = W.REPERES_HD || [];
    verifier('les huit monuments de Paris ont un modèle en relief, et un seul chacun',
      !!MH && REPERES_HD.length === 8 && new Set(REPERES_HD.map((l) => l.name)).size === 8,
      `${REPERES_HD.length} repère(s) : ${REPERES_HD.map((l) => l.name).join(', ')}`);

    if (MH && REPERES_HD.length) {
      // 1. LE MODÈLE NE POSE AUCUN BLOC — invariant 1, mesuré à l'octet près sur
      //    le morceau de la tour Eiffel, celui qui porte le plus de géométrie.
      const eiffel = REPERES_HD.find((l) => l.name === 'Tour Eiffel');
      const ecx = Math.floor(eiffel.x / CHUNK), ecz = Math.floor(eiffel.z / CHUNK);
      const sansM = tampons(0, ecx, ecz), avecM = tampons(1, ecx, ecz);
      let memes = sansM.data.length === avecM.data.length;
      for (let i = 0; memes && i < sansM.data.length; i++) if (sansM.data[i] !== avecM.data[i]) memes = false;
      verifier('un monument en relief ne pose aucun bloc : le morceau est identique à l\'octet près', memes);

      // 2. IL EST ÉMIS DANS CHAQUE MORCEAU QU'IL TOUCHE, découpé aux frontières :
      //    un monument ne disparaît pas quand son centre sort du champ.
      const morceaux = [];
      for (let a = Math.floor((eiffel.x - eiffel.portee) / CHUNK); a <= Math.floor((eiffel.x + eiffel.portee) / CHUNK); a++) {
        for (let b = Math.floor((eiffel.z - eiffel.portee) / CHUNK); b <= Math.floor((eiffel.z + eiffel.portee) / CHUNK); b++) {
          const t = tampons(1, a, b).t;
          morceaux.push({ a, b, nomme: (t.monumentsDetailles || []).includes('Tour Eiffel'), sommets: nb(t.facades) });
        }
      }
      verifier('la tour Eiffel est émise dans chacun des morceaux qu\'elle touche, découpée à leurs frontières',
        morceaux.length > 1 && morceaux.every((m) => m.nomme && m.sommets > 0),
        morceaux.map((m) => `${m.a},${m.b}:${m.nomme ? m.sommets : 'absent'}`).join(' '));

      // 3. LE LOIN GARDE SON VOXEL : les faces du monument partent dans `plat`,
      //    pas dans `solid`. À cinq morceaux, on voit la tour d'avant, à
      //    l'identique — c'est ce qui rend le relais près/loin gratuit.
      verifier('le voxel du monument part dans le loin, jamais dans le proche',
        nb(avecM.t.plat) > nb(sansM.t.plat) * 0.5 && nb(avecM.t.solid) < nb(sansM.t.solid),
        `solid ${nb(sansM.t.solid)} → ${nb(avecM.t.solid)}, plat ${nb(avecM.t.plat)}`);

      // 4. AUCUN MUR INVISIBLE À HAUTEUR D'ENFANT. On ne masque une cellule que
      //    si le modèle la COUVRE (mesuré : la règle « masquer tout ce que le
      //    bâtisseur écrit » laissait 325 cellules nues aux Invalides et le
      //    parvis de Notre-Dame sous les pieds de personne). Le témoin garde la
      //    règle : ce que le mailleur masque, le modèle le dessine.
      const { BLOCK } = await import('../src/blocks.js');
      const nues = [];
      for (const lm of REPERES_HD) {
        const cel = new Map();
        lm.build((x, y, z, id) => cel.set(`${x},${y},${z}`, id));
        const solide = new Set();
        for (const [k, id] of cel) if (id !== BLOCK.AIR) solide.add(k);
        const couvre = MH.cellulesCouvertes(lm.name);
        let n = 0;
        for (const k of solide) {
          const [x, y, z] = k.split(',').map(Number);
          if (y < 0 || y > 3 || !couvre.has(k)) continue;           // non masquée : elle reste en cubes
          const expose = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
            .some(([dx, dy, dz]) => !solide.has(`${x + dx},${y + dy},${z + dz}`));
          if (!expose) continue;
          let vu = false;
          for (let dx = -1; !vu && dx <= 1; dx++) for (let dy = -1; !vu && dy <= 1; dy++) for (let dz = -1; !vu && dz <= 1; dz++) {
            if (couvre.has(`${x + dx},${y + dy},${z + dz}`)) vu = true;
          }
          if (!vu) n++;
        }
        if (n) nues.push(`${lm.name}:${n}`);
      }
      verifier('aucun mur invisible à hauteur d\'enfant : ce qu\'on masque, le modèle le dessine',
        nues.length === 0, nues.length ? nues.join(' ') : 'huit monuments, zéro cellule masquée sans géométrie devant elle');

      // 4 bis. ET LE VOXEL DE LA TOUR EIFFEL SUIT SON MODÈLE (v295). Max, capture
      //    d'iPad : « des trucs bizarres dans Paris ». Les cubes noirs qui
      //    flottaient à côté de la tour étaient les seize cellules du voxel que
      //    le modèle ne couvre pas — l'arche écrite à l'envers (un ventre pendu
      //    entre les jambes, fini aux quatre coins à deux blocs de tout montant)
      //    et une diagonale dans la travée du sol, que la vraie tour n'a pas.
      //    Ce que le modèle ne couvre pas reste en cubes, c'est la règle de la
      //    v292 ; ici le voxel avait tort, et c'est lui qu'on corrige. Mesuré :
      //    seize cubes sur l'ancien code, zéro ici ; la barre est au milieu.
      {
        const cel = new Map();
        eiffel.build((x, y, z, id) => cel.set(`${x},${y},${z}`, id));
        const couvre = MH.cellulesCouvertes('Tour Eiffel');
        const restes = [];
        for (const [k, id] of cel) {
          const y = +k.split(',')[1];
          if (id === BLOCK.AIR || y < 0 || couvre.has(k)) continue;
          restes.push(k);
        }
        verifier('la tour Eiffel ne laisse aucun cube de voxel flotter à côté de son modèle',
          restes.length <= 8, `${restes.length} cellule(s) hors du modèle${restes.length ? ' : ' + restes.slice(0, 8).join(' ') : ''}`);
      }

      // 5. UNE ÉDITION REND LE MONUMENT ÉDITABLE EN CUBES — et son emprise
      //    ENTIÈRE : un demi-monument lisse contre un demi-monument en cubes
      //    serait pire que pas de relief du tout.
      const w = new World();
      w.hd = 1;
      buildChunkTampons(w, ecx, ecz);
      w.dirty.clear();
      w.setBlock(eiffel.x + 2, w.terrainHeight(eiffel.x, eiffel.z) + 4, eiffel.z + 2, BLOCK.STONE);
      const salis = w.dirty.size;
      w.chunks.clear(); w.tops.clear();
      const apres = buildChunkTampons(w, ecx, ecz);
      verifier('un bloc posé dans l\'emprise rend le monument éditable en cubes, sur toute son emprise',
        w.monumentsTouches.has('Tour Eiffel') && (apres.monumentsDetailles || []).length === 0
        && nb(apres.solid) > nb(avecM.t.solid) && salis >= 4,
        `${salis} morceau(x) à remailler, solid ${nb(avecM.t.solid)} → ${nb(apres.solid)}`);

      // 6. UN JOURNAL INSTALLÉ D'UN BLOC REFAIT L'INDEX. Le worker de maillage
      //    remplace `edits` en entier à chaque resynchronisation : un index tenu
      //    bloc par bloc ne peut pas voir un journal remplacé.
      const w2 = new World();
      w2.hd = 1;
      w2.installerEdits([[`${eiffel.x},${w2.terrainHeight(eiffel.x, eiffel.z) + 4},${eiffel.z}`, BLOCK.STONE]], [], 'local');
      verifier('un journal installé d\'un bloc refait l\'index des monuments touchés',
        w2.monumentsTouches.has('Tour Eiffel')
        && (buildChunkTampons(w2, ecx, ecz).monumentsDetailles || []).length === 0);
    }
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
      // LE LOINTAIN, C'EST N'IMPORTE QUEL MORCEAU AU-DELÀ DU RAYON HD. Le
      // premier jet guettait trois morceaux nommés « à cinq » et dormait
      // quarante secondes : à rr=6 la page rend 0,75 image par seconde en
      // rendu logiciel, le fil principal installe les morceaux au rythme des
      // images, et ces trois-là arrivaient à 41 et 43 s — celui de l'autre
      // côté dès 22 s (sonde-hd-lod.cjs). Le témoin mesurait l'ordre d'arrivée
      // de la file, pas le relais. On attend le RÉSULTAT, borné, et le temps
      // pris entre dans le message (v270).
      const loinDe = g.RAYON_HD + 2;
      const t0 = performance.now();
      let ici = null, loin = null, cleLoin = null;
      while (performance.now() - t0 < 90000) {
        await dodo(500);
        ici = g.chunkMeshes.get(`${cx},${cz}`);
        loin = null;
        for (const [k, e] of g.chunkMeshes) {
          const [a, b] = k.split(',').map(Number);
          if (Math.max(Math.abs(a - cx), Math.abs(b - cz)) >= loinDe && (e.plat || e.facades)) { loin = e; cleLoin = k; break; }
        }
        if (ici && ici.facades && loin) break;
      }
      if (ici && ici.facades && loin) await dodo(300);
      return {
        trouve: !!(ici && ici.facades && loin), attente: Math.round(performance.now() - t0),
        ici: !!ici, iciFacades: !!(ici && ici.facades), cleLoin, loinDe,
        iciDetail: ici && ici.facades ? ici.facades.visible : null, iciPlat: ici && ici.plat ? ici.plat.visible : null,
        loinDetail: loin && loin.facades ? loin.facades.visible : null, loinPlat: loin && loin.plat ? loin.plat.visible : null,
        atlas: !!g.atlasHD, rayon: g.RAYON_HD, appels: g.renderer.info.render.calls,
        morceaux: g.chunkMeshes.size, morceauxHD: [...g.chunkMeshes.values()].filter((e) => e.facades).length,
      };
    }, [px, pz]);
    verifier('sous l\'enfant, le détail est visible et la tuile plate cachée',
      res.iciDetail === true && res.iciPlat === false, JSON.stringify(res));
    verifier('au-delà du rayon HD, la tuile plate est visible et le détail caché',
      res.loinPlat === true && res.loinDetail === false, `${res.cleLoin} (≥ ${res.loinDe} morceaux) en ${res.attente} ms · ${JSON.stringify(res)}`);
    verifier('l\'atlas HD est peint et le rayon forcé est celui de l\'adresse', res.atlas === true && res.rayon === 2, `atlas ${res.atlas}, rayon ${res.rayon}`);
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
      // LE RÉVERBÈRE PARISIEN COÛTE DEUX APPELS DE DESSIN (v288) : sa fonte est
      // fusionnée, la lanterne à part. Le premier jet en douze maillages avait
      // fait passer une rue de 1 100 à 2 500 appels.
      let reverbere = null;
      try {
        const { buildPropMesh } = await import('./src/props.js');
        const { RUE } = await import('./src/blocks.js');
        const r = buildPropMesh(RUE.REVERBERE);
        reverbere = r ? r.children.length : null;
      } catch (e) { reverbere = String(e && e.message || e); }
      return { morceaux: entrees.length, hd: entrees.filter((e) => e.facades || e.sol || e.plat).length, atlas: !!g.atlasHD, rayon: g.RAYON_HD, reverbere };
    }, [px, pz]);
    verifier('avec ?hd=0, rien de HD n\'est installé — ni maillage, ni atlas',
      res0.morceaux > 0 && res0.hd === 0 && res0.atlas === false && res0.rayon === 0, JSON.stringify(res0));
    verifier('aucune erreur JavaScript sans HD', bas.erreurs.length === 0, JSON.stringify(bas.erreurs.slice(0, 3)));
    verifier('le réverbère parisien coûte deux maillages : la fonte fusionnée, la lanterne',
      res0.reverbere === 2, `${res0.reverbere} maillage(s)`);
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ Paris a du relief de près, sa tuile de loin, et pas un bloc n\'a bougé');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
