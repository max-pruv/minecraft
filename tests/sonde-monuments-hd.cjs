// L'ACCORD ENTRE CE QU'ON VOIT ET CE QU'ON TOUCHE (v292).
//
// Le voxel reste le squelette : c'est lui qui arrête l'enfant. Le modèle
// d'auteur est ce qu'il VOIT. Deux désaccords sont possibles, et ils n'ont pas
// le même prix :
//
//   • DE LA PIERRE QU'ON TRAVERSE — une surface du modèle là où le voxel est
//     de l'air. On la voit, on passe au travers. Une corniche en saillie à
//     seize blocs de haut n'est pas grave ; un mur au sol l'est.
//   • UN MUR INVISIBLE — une cellule de voxel EXPOSÉE que le modèle ne couvre
//     pas. Comme le mailleur masque les cellules du monument près du joueur,
//     l'enfant se cogne à rien. C'est le pire des deux.
//
// La sonde IMPRIME les deux, monument par monument, à la hauteur où ils sont —
// et c'est cette mesure qui décide ce qu'on corrige, pas l'intuition.
(async () => {
  const { REPERES_HD } = await import('../src/world.js');
  const { geometrieMonument, cellulesCouvertes } = await import('../src/paris-monuments-hd.js');
  const { BLOCK } = await import('../src/blocks.js');
  const HAUTEUR_ENFANT = 3;   // ce qu'un enfant de sept ans peut toucher, en blocs

  // On RASTÉRISE le modèle : chaque triangle est échantillonné assez fin pour
  // qu'aucune cellule traversée ne soit manquée. Comparer des SOMMETS ne dit
  // rien d'un grand quad, qui couvre du terrain sans y poser de sommet.
  const rasteriser = (faces) => {
    const cellules = new Set();
    const points = [];
    for (const f of faces) {
      for (const [a, b, c] of [[0, 1, 2], [0, 2, 3]]) {
        if (!f.p[c]) continue;
        const A = f.p[a], B = f.p[b], C = f.p[c];
        const n = Math.max(2, Math.ceil(Math.max(
          Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]),
          Math.hypot(C[0] - A[0], C[1] - A[1], C[2] - A[2])) * 3));
        for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
          const u = i / n, v = j / n;
          const p = [0, 1, 2].map((k) => A[k] + (B[k] - A[k]) * u + (C[k] - A[k]) * v);
          points.push(p);
          cellules.add(`${Math.round(p[0])},${Math.floor(p[1])},${Math.round(p[2])}`);
        }
      }
    }
    return { cellules, points };
  };

  const voisine = (ens, x, y, z) => {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      if (ens.has(`${x + dx},${y + dy},${z + dz}`)) return true;
    }
    return false;
  };

  for (const lm of REPERES_HD) {
    // Les cellules que le bâtisseur du voxel pose (la dernière écriture fait foi).
    // Seules celles à y >= 0 sont masquées par le mailleur : le parvis, écrit
    // sous le sol, garde son rendu de ville. Le mesurer avec le reste ferait
    // accuser le modèle de ne pas dessiner ce qu'on ne lui a jamais masqué.
    const cellules = new Map();
    lm.build((x, y, z, id) => cellules.set(`${x},${y},${z}`, id));
    const solide = new Set(), masquees = new Set();
    for (const [k, id] of cellules) {
      if (id === BLOCK.AIR) continue;
      solide.add(k);
      if (+k.split(',')[1] >= 0) masquees.add(k);
    }

    const { cellules: hd, points } = rasteriser(geometrieMonument(lm.name));

    // (a) de la pierre qu'on traverse : un point du modèle loin de tout voxel.
    let dehors = 0, dehorsBas = 0, pireBas = 0;
    for (const p of points) {
      if (voisine(solide, Math.round(p[0]), Math.floor(p[1]), Math.round(p[2]))) continue;
      dehors++;
      if (p[1] <= HAUTEUR_ENFANT) { dehorsBas++; pireBas = Math.max(pireBas, p[1]); }
    }

    // (b) LA RÈGLE DU MAILLEUR, telle quelle : une cellule n'est masquée que si
    // le modèle la COUVRE. Un mur invisible est donc impossible par
    // construction — et on le MESURE quand même, parce qu'une garantie de
    // construction qu'aucun chiffre ne surveille finit par se perdre. Ce qui
    // reste se paie en CUBES QUI DÉPASSENT : du voxel resté visible à côté du
    // modèle, honnête, et qui arrête ce qu'il a l'air d'arrêter.
    const couvre = cellulesCouvertes(lm.name);
    const expose = (x, y, z) => [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
      .some(([dx, dy, dz]) => !solide.has(`${x+dx},${y+dy},${z+dz}`));
    // Un CUBE se lit à sa face LATÉRALE : une cellule dont seul le dessus est à
    // l'air est du SOL — le parvis de Notre-Dame, l'esplanade de la tour — et le
    // sol garde très bien sa tuile de trottoir HD. La compter en cube ferait
    // accuser le modèle de ne pas dessiner une dalle qu'il n'a pas à dessiner.
    const cube = (x, y, z) => [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]
      .some(([dx, dy, dz]) => !solide.has(`${x+dx},${y+dy},${z+dz}`));
    let exposees = 0, masque = 0, nues = 0, nuesBas = 0, cubes = 0, cubesBas = 0;
    for (const k of masquees) {
      const [x, y, z] = k.split(',').map(Number);
      if (!expose(x, y, z)) continue;
      exposees++;
      if (!couvre.has(k)) {
        if (cube(x, y, z)) { cubes++; if (y <= HAUTEUR_ENFANT) cubesBas++; }
        continue;
      }
      masque++;
      if (!voisine(hd, x, y, z)) { nues++; if (y <= HAUTEUR_ENFANT) nuesBas++; }
    }

    console.log(`${lm.name.padEnd(20)} ${String(exposees).padStart(5)} cellules exposées, ${String(masque).padStart(5)} masquées`
      + ` | pierre traversable ${(100 * dehors / points.length).toFixed(1)}% (hauteur d'enfant ${dehorsBas}, la plus haute y=${pireBas.toFixed(1)})`
      + ` | murs invisibles ${nues} (hauteur d'enfant ${nuesBas})`
      + ` | cubes qui dépassent ${String(cubes).padStart(4)} = ${(100 * cubes / exposees).toFixed(1)}% (hauteur d'enfant ${cubesBas})`);
  }
})();
