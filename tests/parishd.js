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
  // ── LE DÉTAIL A UN BUDGET D'OCTETS (v299) — la règle pure, sous node ────────
  //
  // Un morceau de l'ouest de Paris porte onze mégaoctets de façades, et un rayon
  // de six morceaux en fait cent soixante-neuf : c'est ce qui a tué l'iPhone de
  // Max. `planDetail` (palier.js) dépense `hdMo` du plus proche au plus loin.
  // Sur l'ancien code la fonction n'existe pas : on le dit, on ne s'effondre pas.
  {
    const PAL = await import('../src/palier.js');
    const M = 1048576;
    if (typeof PAL.planDetail !== 'function') {
      verifier('le détail a un budget d’octets (planDetail, palier.js)', false, 'planDetail absent');
    } else {
      const a = PAL.planDetail({ tenus: [{ key: 'a', d: 1, octets: 60 * M }, { key: 'b', d: 3, octets: 60 * M }, { key: 'c', d: 5, octets: 60 * M }], budget: 128 * M, estimation: 2 * M });
      const b = PAL.planDetail({ candidats: [{ key: 'n', d: 2 }], tenus: [{ key: 'a', d: 1, octets: 60 * M }, { key: 'c', d: 5, octets: 60 * M }], budget: 128 * M, estimation: 20 * M });
      const c = PAL.planDetail({ candidats: [{ key: 'n', d: 6 }], tenus: [{ key: 'a', d: 1, octets: 60 * M }, { key: 'c', d: 5, octets: 60 * M }], budget: 128 * M, estimation: 20 * M });
      const d = PAL.planDetail({ candidats: [{ key: 'n', d: 1 }, { key: 'm', d: 2 }], tenus: [], budget: 30 * M, estimation: 20 * M, attendus: 1 });
      verifier('le détail a un budget d’octets : ce qui dépasse se rend du plus loin, un tenu plus loin cède sa place au plus proche',
        JSON.stringify(a.rendre) === '["c"]' && a.demander.length === 0
          && JSON.stringify(b.rendre) === '["c"]' && JSON.stringify(b.demander) === '["n"]'
          && c.rendre.length === 0 && c.demander.length === 0
          && d.demander.length === 0,
        JSON.stringify({ a, b, c, d }));
      verifier('chaque palier porte son budget de façades, et le palier bas n’en a aucun',
        PAL.PALIERS.bas.hdMo === 0 && PAL.PALIERS.moyen.hdMo > 0 && PAL.PALIERS.haut.hdMo > 0
          && PAL.reglageDe(null, true).hdMo === PAL.PALIERS.moyen.hdMo && PAL.PARAMS_FORCANTS.includes('facadesmo'),
        JSON.stringify({ bas: PAL.PALIERS.bas.hdMo, moyen: PAL.PALIERS.moyen.hdMo, haut: PAL.PALIERS.haut.hdMo }));
    }
  }
  // Sur l'ancien code, le module n'existe pas : on le dit, on ne s'effondre pas.
  const HD = await import('../src/facadeshd.js').catch(() => null);
  verifier('la couche HD existe (src/facadeshd.js)', !!HD);
  if (!HD) { console.log(`\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`); process.exit(1); }
  const { FACADE_HD, SOL_HD, couvreHD } = HD;
  const RELEVE = HD.RELEVE ?? 0;
  const { BLOCK, isTransparent, isSlab } = await import('../src/blocks.js');

  // LE MORCEAU TÉMOIN SE CHERCHE (v285, v288) — et la v303 l'a prouvé une fois
  // de plus : l'adresse (−0,8 ; −0,9) tombait sur un îlot de façades, elle tombe
  // sur une rue depuis que les rues suivent la règle du kit, et neuf témoins
  // rendaient « 0 façade » sans rien mesurer. On prend, autour de l'adresse, le
  // morceau qui porte le plus de colonnes de façade (un lot au bord de son îlot),
  // et l'on se pose dans la rue la plus proche de son centre.
  const P0 = await import('../src/paris.js');
  const [ax, az] = adresseParis(-0.8, -0.9);
  let meilleur = null;
  for (let kx = Math.floor(ax / CHUNK) - 3; kx <= Math.floor(ax / CHUNK) + 3; kx++) {
    for (let kz = Math.floor(az / CHUNK) - 3; kz <= Math.floor(az / CHUNK) + 3; kz++) {
      let n = 0;
      for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
        const x = kx * CHUNK + lx, z = kz * CHUNK + lz;
        if (P0.solParis(x, z) === null && P0.lotParisLibre(x, z) && !P0.gabaritParis(x, z).dedans) n++;
      }
      if (!meilleur || n > meilleur.n) meilleur = { kx, kz, n };
    }
  }
  const cx = meilleur.kx, cz = meilleur.kz;
  let px = cx * CHUNK + 8, pz = cz * CHUNK + 8;
  for (let d = 0, trouve = false; d < 12 && !trouve; d++) for (let dx = -d; dx <= d && !trouve; dx++) for (const dz of [-d, d]) {
    if (P0.solParis(cx * CHUNK + 8 + dx, cz * CHUNK + 8 + dz) !== null) { px = cx * CHUNK + 8 + dx; pz = cz * CHUNK + 8 + dz; trouve = true; break; }
  }
  console.log(`   morceau témoin (${cx}, ${cz}) : ${meilleur.n} colonnes de façade ; l'enfant en (${px}, ${pz})`);

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

  // ── UN ÉTAGE FAIT TROIS BLOCS (v301) ─────────────────────────────────────────
  //
  // Décision de Max : « augmente ». Une personne de 1,8 bloc faisait la hauteur
  // d'un étage. Ce qui se garde : la façade d'un immeuble se lit de bas en haut
  // en BANDES — devanture (soubassement, vitrage, enseigne), entresol (deux
  // blocs), puis des étages de trois (allège, baie, linteau), les nobles au
  // premier et au dernier, la corniche au-dessus — et sa hauteur est celle que
  // `gabaritParis` déclare. Sur l'ancien code les bandes n'existent pas.
  {
    const P = await import('../src/paris.js');
    const { ARCHI } = await import('../src/blocks.js');
    if (!P.gabaritParis || !ARCHI.ETAGE_MI) {
      verifier('un étage de Paris fait trois blocs : la façade se lit en bandes', false, 'gabaritParis ou les bandes d’étage absents');
    } else {
      let col = null;
      for (let dx = -30; dx < 30 && !col; dx++) for (let dz = -30; dz < 30 && !col; dz++) {
        const x = px + dx, z = pz + dz;
        if (P.solParis(x, z) !== null || !P.lotParisLibre(x, z)) continue;
        const g = P.gabaritParis(x, z);
        if (!g.dedans && !g.angle && g.bh >= 5) col = { x, z, g };
      }
      const ids = [];
      if (col) P.batirColonneParis(col.x, col.z, (y, id) => { ids[y] = id; });
      const g = col ? col.g : null;
      const attendu = [];
      if (g) {
        attendu.push(null, ids[1] === ARCHI.PORTE_BAS ? ARCHI.PORTE_BAS : ARCHI.VITRINE_BAS, ids[1] === ARCHI.PORTE_BAS ? ARCHI.PORTE_HAUT : ARCHI.VITRINE_MI, ARCHI.VITRINE_HAUT, ARCHI.ENTRESOL_BAS, ARCHI.ENTRESOL_HAUT);
        const n = g.bh - 2;
        for (let k = 0; k < n; k++) attendu.push((k === 0 || k === n - 1) ? ARCHI.NOBLE_BAS : ARCHI.ETAGE_BAS, ARCHI.ETAGE_MI, ARCHI.ETAGE_HAUT);
        attendu.push(ARCHI.CORNICHE);
      }
      const facadeOk = !!g && ids.slice(1, g.facade + 2).every((id, i) => id === attendu[i + 1]);
      verifier('un étage de Paris fait trois blocs : la façade se lit en bandes, devanture, entresol, étages nobles et courants, corniche',
        facadeOk && g.facade === P.HAUT_RDC + P.HAUT_ENTRESOL + (g.bh - 2) * P.BLOCS_PAR_ETAGE && P.BLOCS_PAR_ETAGE === 3 && g.facade >= 14,
        col ? `colonne (${col.x}, ${col.z}), ${g.bh} niveaux, façade ${g.facade} blocs (avant : ${g.ancienne}), corniche à ${g.facade + 1}` : 'aucune colonne de façade trouvée');
      // ET LE HAUT D'UNE BAIE S'ALLUME AVEC SON BAS. Le tirage des vitres est par
      // bloc ; sans `yBaie`, une baie de deux blocs serait éclairée à moitié une
      // fois sur deux. On compte, sur le morceau, les baies où le tirage naïf
      // DIFFÈRE entre les deux blocs (il y en a), et celles où la règle diffère
      // (il ne doit pas y en avoir).
      const data = avec.data;
      let baies = 0, naif = 0, regle = 0;
      for (let y = 1; y < HEIGHT - 1; y++) for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) {
        if (data[x + z * CHUNK + y * CHUNK * CHUNK] !== ARCHI.ETAGE_MI || data[x + z * CHUNK + (y + 1) * CHUNK * CHUNK] !== ARCHI.ETAGE_HAUT) continue;
        baies++;
        const wx = cx * CHUNK + x, wz = cz * CHUNK + z;
        if (HD.vitreAllumee(wx, y, wz) !== HD.vitreAllumee(wx, y + 1, wz)) naif++;
        if (HD.vitreAllumee(wx, HD.yBaie(ARCHI.ETAGE_MI, y), wz) !== HD.vitreAllumee(wx, HD.yBaie(ARCHI.ETAGE_HAUT, y + 1), wz)) regle++;
      }
      verifier('le haut d\'une baie s\'allume avec son bas, jamais à moitié', baies > 20 && naif > 0 && regle === 0,
        `${baies} baies, ${naif} éclairées à moitié par un tirage par bloc, ${regle} par la règle`);
      // ET UN MORCEAU DENSE DE L'OUEST NE PÈSE PAS PLUS QU'AVANT, avec des façades
      // trois fois plus hautes : mesuré, 10,9 Mo avant (146 150 sommets, dont
      // 61 200 de menuiserie), 9,2 après — le châssis d'une baie est UN quad
      // ajouré au lieu de six boîtes. La barre à dix mégaoctets sépare les deux ;
      // c'est le budget de la v299 qui en dépend (128 Mo pour tout le détail).
      // LE MORCEAU SE CHERCHE (v306). Il était écrit en dur, (-25, 16) : l'ouest
      // dense de l'ANCIEN Paris. Paris déplacé et doublé, ce morceau tombait
      // sur une rue et rendait 5 139 sommets — rouge sans rien mesurer. On
      // prend, à trois kilomètres à l'ouest de Notre-Dame, le morceau qui
      // porte le plus de colonnes de façade (la mesure du morceau témoin plus
      // haut) ; mesuré : 110 000 à 124 000 sommets, 8,2 à 9,2 Mo.
      const [ox, oz] = adresseParis(-3, 0);
      let dense = null;
      for (let kx = Math.floor(ox / CHUNK) - 5; kx <= Math.floor(ox / CHUNK) + 5; kx++)
        for (let kz = Math.floor(oz / CHUNK) - 5; kz <= Math.floor(oz / CHUNK) + 5; kz++) {
          let nf = 0;
          for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
            const x = kx * CHUNK + lx, z = kz * CHUNK + lz;
            if (P0.solParis(x, z) === null && P0.lotParisLibre(x, z) && !P0.gabaritParis(x, z).dedans) nf++;
          }
          if (!dense || nf > dense.nf) dense = { kx, kz, nf };
        }
      const ouest = tampons(1, dense.kx, dense.kz);
      const f = ouest.t.facades;
      const n = f ? f.positions.length / 3 : 0;
      const octets = f ? (f.positions.length + f.normals.length + f.uvs.length + f.colors.length + f.tiles.length + f.matiere.length + f.lueur.length) * 4 + f.indices.length * (n > 65535 ? 4 : 2) : 0;
      verifier('un morceau dense de l\'ouest pèse moins de dix mégaoctets de façades, avec des étages trois fois plus hauts',
        n > 50000 && octets < 10 * 1048576, `morceau (${dense.kx}, ${dense.kz}), ${dense.nf} colonnes de façade : ${n} sommets, ${(octets / 1048576).toFixed(2)} Mo (avant la v301 : 146 150, 10,88 Mo)`);
    }
  }

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
    // LE MORCEAU DE LA RUE SE CHERCHE (v303) : le morceau témoin est choisi pour
    // ses FAÇADES, et depuis que les rues suivent la règle du kit les îlots sont
    // plus grands — le plus bâti de l'ouest n'a plus un carrefour, donc plus un
    // passage piéton (0 sommet de marquage sur un marquage parfaitement en
    // place : 33 morceaux sur 49 en portent autour de lui). On prend le plus
    // proche qui porte une rue, et il entre dans le message.
    const compter = (g) => {
      let marquage = 0, bordure = 0, trottoir = 0, trottoirBas = 0;
      if (!g) return { marquage, bordure, trottoir, trottoirBas };
      const haut = (i) => Math.abs((g.positions[i * 3 + 1] % 1) - RELEVE) < 0.02;
      for (let i = 0; i < nb(g); i++) {
        const rug = g.matiere[i * 2], met = g.matiere[i * 2 + 1];
        if (met !== 0) continue;
        if (Math.abs(rug - 0.7) < 0.01) marquage++;
        if (Math.abs(rug - 0.75) < 0.01 && haut(i)) bordure++;
        if (Math.abs(rug - 0.95) < 0.01 && g.normals[i * 3 + 1] > 0.5) { if (haut(i)) trottoir++; else trottoirBas++; }
      }
      return { marquage, bordure, trottoir, trottoirBas };
    };
    let c = compter(avec.t.sol), rueEn = [cx, cz];
    for (let r = 1; r <= 3 && !c.marquage; r++) for (let dz = -r; dz <= r && !c.marquage; dz++) for (let dx = -r; dx <= r && !c.marquage; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const essai = compter(tampons(1, cx + dx, cz + dz).t.sol);
      if (essai.marquage) { c = essai; rueEn = [cx + dx, cz + dz]; }
    }
    const { marquage, bordure, trottoir, trottoirBas } = c;
    verifier('la rue porte son marquage, sa bordure de granit et son trottoir relevé',
      marquage > 0 && bordure > 0 && trottoir > 0 && trottoirBas === 0,
      `${marquage} sommets de marquage, ${bordure} de bordure en relief, trottoir relevé ${trottoir} (à plat ${trottoirBas}) — morceau (${rueEn.join(', ')})`);
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
    // LE REGISTRE « ANCIEN » SE CHERCHE DANS SES DEUX QUARTIERS (v303). Le
    // Marais du jeu est un disque d'un kilomètre que Rivoli et les Grands
    // Boulevards traversent ; à la règle du kit (vingt et un blocs d'emprise)
    // ils n'y laissent que deux colonnes de lot, mesuré — 41 en v302. C'est le
    // prix déclaré de la v303, que Paris doublé rendra. Le registre, lui, vit
    // aussi au Quartier latin (122 colonnes de lot), et c'est le registre que
    // ce verdict garde, pas un nom de quartier.
    // ET LES MODÈLES DE MONUMENTS SONT ÉCARTÉS PAR LEUR NOM (v292) : le morceau
    // du Quartier latin porte le Panthéon, 376 sommets de PIERRE qui ne disent
    // rien du registre des immeubles. Un monde où tous les monuments sont
    // « touchés » les rend en cubes, hors des façades.
    const sansModeles = (x, z) => {
      const w = new World();
      w.hd = 1;
      w.monumentsTouches = { has: () => true, add() {}, clear() {} };
      return { t: buildChunkTampons(w, x, z) };
    };
    let marais = null, ou = null;
    for (const [nomQ, qx, qz] of [['Marais', 0.9, -0.35], ['Quartier latin', 0.15, 0.85]]) {
    const [mx, mz] = adresseParis(qx, qz);
    for (let r = 0; r <= 6; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const kx = Math.floor(mx / CHUNK) + dx, kz = Math.floor(mz / CHUNK) + dz;
      // UN MORCEAU À CHEVAL SUR DEUX QUARTIERS N'EST PAS UN TÉMOIN DE QUARTIER
      // (v294) : le morceau qui porte le plus de façades autour du centre du
      // Marais avait un coin dans Haussmann, et rendait « enduit 692 · volets
      // 480 · pierre 1200 » — deux registres à la fois, ce qui n'accuse ni
      // l'un ni l'autre. Le centre ET les quatre coins du morceau sont du
      // quartier, ou le morceau n'est pas retenu.
      const coins = [[CHUNK / 2, CHUNK / 2], [0, 0], [CHUNK - 1, 0], [0, CHUNK - 1], [CHUNK - 1, CHUNK - 1]];
      if (!coins.every(([cx, cz]) => { const i = infoFacadeParis(kx * CHUNK + cx, kz * CHUNK + cz); return i && i.quartier === nomQ; })) continue;
      const t = sansModeles(kx, kz);
      // ET ON GARDE LE MORCEAU QUI PORTE LE PLUS DE FAÇADES, pas le premier
      // qui en porte deux mille (v294) : les rues élargies laissent à un
      // morceau de seize blocs un coin d'îlot, et le premier venu a rendu
      // « enduit 100 · volets 0 » sur un registre parfaitement en place.
      if (nb(t.t.facades) > (marais ? nb(marais.t.facades) : 0)) { marais = t; ou = [kx, kz, nomQ]; }
    }
    }
    if (!marais) { const [mx, mz] = adresseParis(0.9, -0.35); marais = tampons(1, Math.floor(mx / CHUNK), Math.floor(mz / CHUNK)); }
    console.log(`   🔎 morceau du registre ancien : ${ou ? ou.join(',') : 'aucun avec façades'}`);
    const enduitM = compteTuile(marais.t.facades, 'enduit'), voletM = compteTuile(marais.t.facades, 'volet');
    const pierreM = compteTuile(marais.t.facades, 'pierre');
    const enduitH = compteTuile(avec.t.facades, 'enduit'), voletH = compteTuile(avec.t.facades, 'volet');
    const pierreH = compteTuile(avec.t.facades, 'pierre');
    verifier('chaque quartier a son registre : enduit et volets dans le Paris ancien, pierre de taille à Haussmann',
      enduitM > 100 && voletM > 50 && pierreM === 0 && pierreH > 100 && enduitH === 0 && voletH === 0,
      `${ou ? ou[2] : 'Marais'} enduit ${enduitM} · volets ${voletM} · pierre ${pierreM} — Haussmann pierre ${pierreH} · enduit ${enduitH} · volets ${voletH}`);
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

  // ── LES VILLES D'EUROPE (v390) : la couche HD hors de Paris ────────────────
  //
  // Max : « when done do all European cities ». `couvreHD` ne testait que le
  // disque de Paris ; il demande désormais une LISTE de villes (`VILLES_HD`),
  // et chaque ville porte son registre. Ce que le témoin garde, ville par
  // ville : le morceau le plus dense reçoit son détail (chaque face exposée,
  // ni plus ni moins), la couche ne pose aucun bloc, un palier sans HD rend
  // les tampons d'avant, le mur est celui de la ville (pas la pierre de Paris),
  // le mobilier de Paris reste à Paris, et le morceau le plus lourd tient dans
  // le budget. Sur l'ancien code `villeHD` n'existe pas : on le dit.
  // LE FER SE COMPTE À SA MATIÈRE, PAS À SA TUILE : la ferronnerie s'émet avec
  // des UV absolus, donc un rectangle neutre (`NEUTRE`) — compté à la tuile, un
  // garde-corps rendait zéro partout, et « pas de fer » était vrai à vide.
  const compteFer = (g) => {
    if (!g) return 0;
    let n = 0;
    for (let i = 0; i < nb(g); i++) if (Math.abs(g.matiere[i * 2] - 0.55) < 1e-5 && Math.abs(g.matiere[i * 2 + 1] - 0.85) < 1e-5) n++;
    return n;
  };
  async function temoinsVille({ cle, centre, attendu, interdit, rayonSonde }) {
    const fiche = HD.VILLES_HD && HD.VILLES_HD.find((d) => d.ville === cle);
    if (!fiche || typeof HD.villeHD !== 'function' || typeof HD.murHD !== 'function') {
      verifier(`${cle} : la couche HD couvre la ville (VILLES_HD, villeHD, murHD)`, false, 'la ville n’est pas dans VILLES_HD (ou villeHD, murHD absents)');
      return;
    }
    const cxc = Math.floor(centre.x / CHUNK), czc = Math.floor(centre.z / CHUNK);
    verifier(`${cle} : la couche HD couvre la ville`, HD.couvreHD(cxc, czc, CHUNK) && HD.villeHD(cxc, czc, CHUNK).ville === cle);
    // le morceau le plus dense : celui qui porte le plus de faces détaillées
    // (un balayage d'une ville sur deux morceaux), puis le pire en octets
    const w = new World(); w.hd = 1;
    const oct = (t) => (t ? ['positions', 'normals', 'uvs', 'colors', 'tiles', 'matiere', 'lueur', 'indices'].reduce((n, k) => n + (t[k] ? t[k].byteLength : 0), 0) : 0);
    let dense = null, pire = 0, total = 0, n = 0, paris = { affiche: 0, lattes: 0 };
    const tuiles = {};
    const r = Math.min(centre.r, rayonSonde || centre.r);
    for (let kx = Math.floor((centre.x - r) / CHUNK); kx <= Math.floor((centre.x + r) / CHUNK); kx += 2) {
      for (let kz = Math.floor((centre.z - r) / CHUNK); kz <= Math.floor((centre.z + r) / CHUNK); kz += 2) {
        if (Math.hypot(kx * CHUNK + 8 - centre.x, kz * CHUNK + 8 - centre.z) > centre.r) continue;
        const t = buildChunkTampons(w, kx, kz);
        const o = oct(t.facades);
        total += o; n++; if (o > pire) pire = o;
        for (const k of Object.keys(paris)) paris[k] += compteTuile(t.facades, k);
        for (const k of [...attendu, ...interdit]) tuiles[k] = (tuiles[k] || 0) + (k === 'fer' ? compteFer(t.facades) : compteTuile(t.facades, k));
        if (!dense || (t.facadesDetaillees || 0) > dense.f) dense = { kx, kz, f: t.facadesDetaillees || 0 };
        if (w.chunks.size > 300) { w.chunks.clear(); if (w.tops) w.tops.clear(); }
      }
    }
    const sansV = tampons(0, dense.kx, dense.kz), avecV = tampons(1, dense.kx, dense.kz);
    let memes = sansV.data.length === avecV.data.length;
    for (let i = 0; memes && i < sansV.data.length; i++) if (sansV.data[i] !== avecV.data[i]) memes = false;
    verifier(`${cle} : la couche HD ne pose aucun bloc (morceau (${dense.kx}, ${dense.kz}), à l'octet près)`, memes);
    verifier(`${cle} : sans HD, les tampons sont ceux d'avant — le palier bas ne reçoit rien de neuf`,
      !sansV.t.sol && !sansV.t.facades && !sansV.t.plat && !sansV.t.platLumineux && nb(sansV.t.solid) > 0);
    // le compte indépendant : toute face latérale exposée d'un bloc de façade
    // ou d'un mur de la ville (motifs Briques et Uni)
    const d = avecV.data;
    const getV = (x, y, z) => (y < 0 || y >= HEIGHT) ? BLOCK.AIR
      : (x >= 0 && x < CHUNK && z >= 0 && z < CHUNK) ? d[x + z * CHUNK + y * CHUNK * CHUNK] : avecV.w.getBlock(dense.kx * CHUNK + x, y, dense.kz * CHUNK + z);
    let faces = 0;
    for (let y = 0; y < HEIGHT; y++) for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) {
      const id = d[x + z * CHUNK + y * CHUNK * CHUNK];
      if (!FACADE_HD.has(id) && !HD.murHD(id, fiche)) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (expose(id, getV(x + dx, y, z + dz))) faces++;
    }
    verifier(`${cle} : chaque face exposée d'une façade ou d'un mur de la ville reçoit son détail, ni plus ni moins`,
      faces > 50 && avecV.t.facadesDetaillees === faces, `${faces} faces exposées, ${avecV.t.facadesDetaillees} détaillées`);
    verifier(`${cle} : le mur est celui de la ville (${attendu.join(', ')}), pas ${interdit.join(' ni ')}`,
      attendu.every((k) => tuiles[k] > 100) && interdit.every((k) => tuiles[k] === 0), `${n} morceaux lus : ${JSON.stringify(tuiles)}`);
    verifier(`${cle} : le mobilier de Paris reste à Paris — ni colonne Morris ni banc Davioud`,
      n > 10 && total > 0 && paris.affiche === 0 && paris.lattes === 0, `${n} morceaux lus : ${JSON.stringify(paris)}`);
    const M = 1048576;
    verifier(`${cle} : le morceau le plus lourd tient largement dans le budget (moins de 3 Mo, Paris en pèse 10)`,
      pire > 0 && pire < 3 * M, `pire ${(pire / M).toFixed(2)} Mo, moyenne ${(total / Math.max(1, n) / M).toFixed(2)} Mo sur ${n} morceaux`);
  }
  {
    const { LONDRES } = await import('../src/londres.js');
    await temoinsVille({ cle: 'londres', centre: LONDRES, attendu: ['brique', 'enduit'], interdit: ['pierre', 'fer'] });
    // PALIER B (v392) : Nice et Lille, même méthode
    const { NICE } = await import('../src/nice.js');
    const { LILLE } = await import('../src/lille.js');
    await temoinsVille({ cle: 'nice', centre: NICE, attendu: ['enduit', 'volet', 'fer'], interdit: ['pierre', 'brique'] });
    await temoinsVille({ cle: 'lille', centre: LILLE, attendu: ['brique'], interdit: ['pierre', 'volet', 'fer'] });
    // PALIER C (v394) : les villes engendrées d'Europe, une par registre
    const { VILLES_MONDE } = await import('../src/villesmonde.js');
    const vm = (cle) => { const f = VILLES_MONDE.find((v) => v.cle === cle); return { x: f.ancre.x, z: f.ancre.z, r: f.rayon }; };
    await temoinsVille({ cle: 'rome', centre: vm('rome'), attendu: ['enduit', 'volet', 'fer'], interdit: ['pierre'], rayonSonde: 60 });
    await temoinsVille({ cle: 'berlin', centre: vm('berlin'), attendu: ['enduit'], interdit: ['pierre', 'volet', 'fer'], rayonSonde: 60 });
    await temoinsVille({ cle: 'manchester', centre: vm('manchester'), attendu: ['brique'], interdit: ['pierre', 'volet', 'fer'] });
    {
      const reg = (cle) => (HD.VILLES_HD || []).find((d) => d.ville === cle)?.registre || null;
      const europe = VILLES_MONDE.filter((f) => f.trame && f.lat0 > 34 && f.lat0 < 72 && f.lon0 > -25 && f.lon0 < 46);
      const couvertes = europe.filter((f) => reg(f.cle));
      verifier('toutes les villes engendrées d’Europe ont leur registre, et pas une ville de la boîte qui n’est pas d’Europe',
        couvertes.length >= 85 && reg('istanbul') && reg('reykjavik') && reg('lavalette')
          && reg('edimbourg') === 'londres' && reg('dublin') === 'londres' && reg('rome') === 'sud' && reg('berlin') === 'nord'
          && !reg('tunis') && !reg('ankara') && !reg('fes') && !reg('tbilissi') && !reg('tokyo'),
        `${couvertes.length} sur ${europe.length} dans la boîte ; Édimbourg ${reg('edimbourg')}, Rome ${reg('rome')}, Berlin ${reg('berlin')}, Tunis ${reg('tunis')}`);
    }
    // un bloc de décor à motif posé par un enfant garde son dessin : seuls les
    // murs de brique et d'enduit passent dans la couche
    if (typeof HD.murHD === 'function') {
      const { DECOR_ITEMS } = await import('../src/blocks.js');
      const motif = (p) => DECOR_ITEMS.find((i) => i.pattern === p).id;
      const lo = HD.VILLES_HD.find((d) => d.ville === 'londres');
      verifier('un bloc de décor à damier, à pois ou à losanges garde son dessin ; la brique et l’enduit passent dans la couche',
        HD.murHD(motif('Briques'), lo) && HD.murHD(motif('Uni'), lo)
          && !HD.murHD(motif('Damier'), lo) && !HD.murHD(motif('Pois'), lo) && !HD.murHD(motif('Losange'), lo)
          && !HD.murHD(motif('Briques'), HD.VILLES_HD.find((d) => d.ville === 'paris')));
    }
  }

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
        // ON FABRIQUE CE QU'ON MONTRE (v296) : au-delà du rayon HD plus une
        // marge, aucun morceau ne doit PORTER de façades détaillées — elles
        // pesaient 1,6 Mo par morceau pour tout le disque, ce qui tuait un iPad
        // de trois gigaoctets à Paris. On compte les morceaux fautifs et les
        // octets de façades tenus, avant et après un déplacement.
        ...((() => {
          const octets = (m) => { if (!m) return 0; let n = 0; for (const a of Object.values(m.geometry.attributes)) n += a.array.byteLength; return n + (m.geometry.index ? m.geometry.index.array.byteLength : 0); };
          let fautifs = 0, facadesMo = 0, chargesHD = 0;
          for (const [k, e] of g.chunkMeshes) {
            const [a, b] = k.split(',').map(Number);
            const d = Math.max(Math.abs(a - cx), Math.abs(b - cz));
            if (e.hd) chargesHD++;
            if (e.facades) { facadesMo += octets(e.facades); if (d > g.RAYON_HD + 1) fautifs++; }
          }
          return { fautifs, facadesMo: +(facadesMo / 1048576).toFixed(1), chargesHD };
        })()),
      };
    }, [px, pz]);
    verifier('sous l\'enfant, le détail est visible et la tuile plate cachée',
      res.iciDetail === true && res.iciPlat === false, JSON.stringify(res));
    verifier('au-delà du rayon HD, la tuile plate est visible et aucune façade détaillée n\'est fabriquée',
      res.loinPlat === true && res.loinDetail === null, `${res.cleLoin} (≥ ${res.loinDe} morceaux) en ${res.attente} ms · ${JSON.stringify(res)}`);
    // Sur l'ancien code, TOUS les morceaux HD portaient leurs façades — dont
    // `loin`, à deux morceaux au-delà du rayon, qui est donc fautif par
    // construction ; ici, seuls ceux à portée + 1 en ont. Le garde est que le
    // morceau lointain EXISTE (on ne juge pas un disque vide).
    verifier('aucun morceau au-delà du rayon HD plus un ne porte de façades détaillées',
      res.fautifs === 0 && !!res.cleLoin && res.chargesHD > 0,
      `${res.fautifs} fautif(s) sur ${res.chargesHD} morceaux HD chargés, ${res.facadesMo} Mo de façades tenus`);

    // ET CE QU'ON QUITTE SE REND. L'enfant part cinq morceaux à l'est — assez
    // pour sortir de la marge, pas assez pour décharger les morceaux d'avant —
    // et l'on attend, borné, que le morceau sous lui ait ses façades ; les
    // anciennes ont alors dû être rendues à la carte graphique.
    const apres = await tab.evaluate(async ([x, z]) => {
      const g = window.__game;
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
      const nx = x + 16 * 5;
      g.player.pos.set(nx + 0.5, g.world.terrainHeight(nx, z) + 2, z + 0.5); g.player.vel.set(0, 0, 0);
      const ncx = cx + 5;
      const t0 = performance.now();
      let sous = null;
      while (performance.now() - t0 < 90000) {
        await dodo(500);
        sous = g.chunkMeshes.get(`${ncx},${cz}`);
        if (sous && sous.facades && g.statsMaillage.detailsRendus > 0) break;
      }
      let anciensAvecFacades = 0, anciens = 0;
      for (const [k, e] of g.chunkMeshes) {
        const [a, b] = k.split(',').map(Number);
        if (Math.max(Math.abs(a - cx), Math.abs(b - cz)) <= g.RAYON_HD && Math.abs(a - ncx) > g.RAYON_HD + 2 && e.hd) { anciens++; if (e.facades) anciensAvecFacades++; }
      }
      return { attente: Math.round(performance.now() - t0), sousFacades: !!(sous && sous.facades), anciens, anciensAvecFacades,
        demandes: g.statsMaillage.detailsDemandes, rendus: g.statsMaillage.detailsRendus, morceaux: g.chunkMeshes.size };
    }, [px, pz]);
    // `demandes` n'entre pas dans le verdict (v299) : il ne compte que les
    // morceaux maillés AVANT le déplacement puis REDEMANDÉS avec leur détail.
    // À trente-sept morceaux installés sur cent soixante-neuf, celui qui reçoit
    // l'enfant arrive frais de la file, détail compris, sans redemande — et le
    // témoin rendait rouge un relais juste. Il mesurait l'ordre de la file, pas
    // le relais (v288). Le chiffre reste dans le message.
    verifier('en s\'éloignant, les façades quittées sont rendues et celles d\'arrivée fabriquées',
      apres.sousFacades && apres.anciens > 0 && apres.anciensAvecFacades === 0 && apres.rendus > 0,
      `en ${apres.attente} ms · ${JSON.stringify(apres)}`);
    verifier('l\'atlas HD est peint et le rayon forcé est celui de l\'adresse', res.atlas === true && res.rayon === 2, `atlas ${res.atlas}, rayon ${res.rayon}`);
    verifier('aucune erreur JavaScript de bout en bout', tab.erreurs.length === 0, JSON.stringify(tab.erreurs.slice(0, 3)));
    await tab.close();

    // ── ET SUR LE SITE DU PLANTAGE, LE BUDGET TIENT (v299) ─────────────────────
    //
    // L'ouest de Paris, là où l'iPhone de Max est mort : ses morceaux portent
    // onze mégaoctets de façades chacun. À rr 6 · hd 2, l'ancien code en
    // fabrique vingt-cinq — 250 Mo ; le budget en tient 128. On attend que le
    // disque soit installé (borné, la durée dans le message), puis on lit ce
    // que les façades PÈSENT, et que le morceau sous l'enfant a bien reçu le
    // sien : le budget se dépense du plus proche au plus loin.
    const [ox, oz] = adresseParis(-6.67, 2.5);
    const ouest = await banc.jouerSeul('Odile', { rr: 6, params: '&hd=2' });
    const bud = await ouest.evaluate(async ([x, z]) => {
      const g = window.__game;
      const y = g.world.terrainHeight(x, z);
      g.player.pos.set(x + 0.5, y + 2, z + 0.5); g.player.vel.set(0, 0, 0);
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
      const octets = (m) => { if (!m) return 0; let n = 0; for (const a of Object.values(m.geometry.attributes)) n += a.array.byteLength; return n + (m.geometry.index ? m.geometry.index.array.byteLength : 0); };
      const t0 = performance.now();
      let n0 = -1, stable = 0;
      while (performance.now() - t0 < 120000) {
        await dodo(2000);
        const n = g.chunkMeshes.size;
        const sous = g.chunkMeshes.get(`${cx},${cz}`);
        if (n === n0 && sous && sous.facades) { if (++stable >= 3) break; } else { stable = 0; n0 = n; }
      }
      let facadesMo = 0, avec = 0, hd = 0;
      for (const e of g.chunkMeshes.values()) { if (e.hd) hd++; if (e.facades) { avec++; facadesMo += octets(e.facades); } }
      const sous = g.chunkMeshes.get(`${cx},${cz}`);
      return { attente: Math.round(performance.now() - t0), morceaux: g.chunkMeshes.size, hd, avec, facadesMo: +(facadesMo / 1048576).toFixed(1),
        budgetMo: g.BUDGET_FACADES ? g.BUDGET_FACADES / 1048576 : null, sousFacades: !!(sous && sous.facades),
        auBudget: g.statsMaillage.detailsBudget, tenu: g.detailTenu ? { n: g.detailTenu.n, Mo: +(g.detailTenu.octets / 1048576).toFixed(1) } : null };
    }, [ox, oz]);
    verifier('à l’ouest de Paris, les façades détaillées tiennent dans le budget du palier, et le morceau sous l’enfant a le sien',
      bud.sousFacades && bud.hd > 0 && bud.avec > 0 && bud.budgetMo > 0 && bud.facadesMo <= bud.budgetMo * 1.05,
      `${bud.facadesMo} Mo de façades pour ${bud.budgetMo} de budget, ${bud.avec} morceau(x) détaillé(s) sur ${bud.hd} HD, en ${bud.attente} ms · ${JSON.stringify(bud)}`);
    verifier('le compte tenu par le jeu est celui des façades en scène', !!bud.tenu && bud.tenu.n === bud.avec && Math.abs(bud.tenu.Mo - bud.facadesMo) < 1,
      JSON.stringify(bud.tenu) + ' contre ' + bud.avec + ' / ' + bud.facadesMo);
    await ouest.close();

    // ── ET À LONDRES, EN VOL, LE DÉTAIL ARRIVE ET TIENT DANS LE BUDGET (v390) ──
    //
    // Les terrasses de brique de Kensington : on s'y pose, on attend que le
    // disque soit installé (borné, la durée dans le message), puis on vole
    // quatre-vingts blocs vers l'est en relevant le poids des façades. Sur
    // l'ancien code aucun morceau de Londres n'est HD : zéro façade, rouge.
    const lon = await banc.jouerSeul('Lucy', { rr: 6, params: '&hd=2' });
    const vol = await lon.evaluate(async () => {
      const g = window.__game;
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const octets = (m) => { if (!m) return 0; let n = 0; for (const a of Object.values(m.geometry.attributes)) n += a.array.byteLength; return n + (m.geometry.index ? m.geometry.index.array.byteLength : 0); };
      const releve = () => { let mo = 0, avec = 0, hd = 0; for (const e of g.chunkMeshes.values()) { if (e.hd) hd++; if (e.facades) { avec++; mo += octets(e.facades); } } return { mo: mo / 1048576, avec, hd }; };
      const x0 = -1300, z0 = -1351;
      const y = g.world.terrainHeight(x0, z0);
      g.player.flying = true;
      g.player.pos.set(x0 + 0.5, y + 6, z0 + 0.5); g.player.vel.set(0, 0, 0);
      const t0 = performance.now();
      let n0 = -1, stable = 0;
      while (performance.now() - t0 < 120000) {
        await dodo(2000);
        const n = g.chunkMeshes.size, r = releve();
        if (n === n0 && r.avec > 0) { if (++stable >= 3) break; } else { stable = 0; n0 = n; }
      }
      const pose = releve(); let pireMo = pose.mo;
      for (let i = 1; i <= 8; i++) {
        g.player.pos.x = x0 + 0.5 + i * 10;
        await dodo(1500);
        pireMo = Math.max(pireMo, releve().mo);
      }
      return { attente: Math.round(performance.now() - t0), pose, pireMo: +pireMo.toFixed(1), budgetMo: g.BUDGET_FACADES ? g.BUDGET_FACADES / 1048576 : null };
    });
    verifier('à Londres, les façades détaillées arrivent et tiennent dans le budget du palier, en vol compris',
      vol.pose.avec > 0 && vol.pose.hd > 0 && vol.budgetMo > 0 && vol.pireMo <= vol.budgetMo * 1.05,
      `posé : ${vol.pose.avec} morceau(x) détaillé(s) sur ${vol.pose.hd} HD, ${vol.pose.mo.toFixed(1)} Mo ; pire en vol ${vol.pireMo} Mo pour ${vol.budgetMo} de budget, en ${vol.attente} ms`);
    verifier('à Londres, aucune erreur JavaScript', lon.erreurs.length === 0, JSON.stringify(lon.erreurs.slice(0, 3)));
    await lon.close();

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
