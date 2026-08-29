// Les services de la ville : la caserne de pompiers, le commissariat, et le
// métro qui fait le tour de Paris — SOUS terre.
//
// POURQUOI IL EST PASSÉ SOUS TERRE. Il était aérien, porté sur piliers au-dessus
// des toits. Max, en jouant : « pas du tout de métro ou de train aérien à Paris.
// Typiquement, la réalité voudrait dire qu'on devrait avoir un métro souterrain.
// Le train ne devrait pas être aérien. » Il a raison : le viaduc parisien
// n'existe que sur deux tronçons des lignes 2 et 6, et ce n'est pas l'image
// qu'on a de la ville. Un anneau aérien qui fait le tour de Paris, ça
// n'existe nulle part.
//
// La ville repose sur une base parfaitement plate — c'est ce qui rend le tunnel
// possible sans jamais déboucher à flanc de colline. Le tunnel se creuse son
// propre couloir sous les rues, et on y descend par des bouches de métro
// posées au bord du trottoir, comme on le fait vraiment.
//
// CE QUE LE TUNNEL NE PEUT PAS CASSER. Les blocs posés par un enfant sont
// réappliqués APRÈS la ville, à la fin de `generateChunk` : ils gagnent sur
// tout ce que le bâtisseur pose ou creuse. Une cabane enterrée sur le tracé
// reste donc intacte, et c'est le tunnel qui a un trou — pas l'inverse.

import { BLOCK, DECOR_START } from './blocks.js';

const uni = (couleur) => DECOR_START + couleur * 10;

const ROUGE = uni(0);          // le rouge des pompiers
const ROUGE_SOMBRE = uni(18);
const BLEU = uni(10);          // le bleu de la police
const BLEU_NUIT = uni(11);
const BLANC = uni(27);
const GRIS = uni(24);
const GRIS_CLAIR = uni(23);
const ANTHRACITE = uni(25);
const JAUNE = uni(2);
const VERT_METRO = uni(13);      // le vert des édicules Guimard, reconnaissable de loin
const BETON = BLOCK.STONEBRICK;
const VERRE = BLOCK.GLASS;

// L'anneau du métro : rayon, et niveau des rails dans le repère du bâtisseur.
//
// `tablier` est désormais NÉGATIF : c'est une profondeur. Les rails sont à sept
// blocs sous la surface, ce qui laisse trois blocs de terre au-dessus de la
// voûte — assez pour qu'on ne voie rien depuis la rue, assez peu pour que les
// bouches de métro restent des escaliers et non des puits.
// v187, Paris à vingt-quatre blocs par kilomètre : l'anneau NE CHANGE PAS, et
// c'est un choix. À huit blocs par kilomètre, trente-huit blocs de rayon
// faisaient quatre kilomètres et sept cents — le boulevard périphérique. À
// vingt-quatre ils en font mille six cents : la boucle du centre historique,
// de la Bastille à la Concorde. C'est un métro plus petit dans une ville plus
// grande, et c'est plus juste ainsi : les vraies lignes de Paris viendront
// avec le creuseur de Washington, qui sait faire des lignes et des stations.
export const ANNEAU = { rayon: 38, tablier: -8 };

// Le tracé, en coordonnées ABSOLUES du monde. Les véhicules s'en servent pour
// tourner ; le bâtisseur, pour poser la voie. Un seul endroit décide donc du
// parcours, et la rame ne peut pas dérailler d'un tracé qui aurait changé.
export function traceAnneau(centre, sol) {
  const pts = [];
  const N = 96;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push({
      x: centre.x + Math.sin(a) * ANNEAU.rayon,
      y: sol + ANNEAU.tablier + 1,
      z: centre.z + Math.cos(a) * ANNEAU.rayon,
    });
  }
  return pts;
}

export function buildVille(poser) {
  // y = -1 : le bloc de surface ; y = 0 : le premier bloc en l'air.
  const set = (x, y, z, id) => poser(x, y + 1, z, id);

  const dalle = (x0, x1, z0, z1, y, id) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, id);
    }
  };
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) dalle(x0, x1, z0, z1, y, id);
  };
  const vider = (x0, x1, y0, y1, z0, z1) => bloc(x0, x1, y0, y1, z0, z1, BLOCK.AIR);

  // Une caserne : grande halle vitrée, portes larges pour les véhicules,
  // tour de séchage des tuyaux, et le véhicule à l'intérieur.
  function halle(x0, x1, z0, z1, h, mur, toit, portes) {
    vider(x0, x1, 0, h + 1, z0, z1);
    bloc(x0, x1, 0, h, z0, z1, mur);
    vider(x0 + 1, x1 - 1, 0, h - 1, z0 + 1, z1 - 1);
    dalle(x0 - 1, x1 + 1, z0 - 1, z1 + 1, h + 1, toit);
    dalle(x0, x1, z0, z1, -1, ANTHRACITE);
    // bandeau vitré tout autour
    for (let x = x0 + 1; x < x1; x++) { set(x, h - 1, z0, VERRE); set(x, h - 1, z1, VERRE); }
    for (let z = z0 + 1; z < z1; z++) { set(x0, h - 1, z, VERRE); set(x1, h - 1, z, VERRE); }
    // les grandes portes, côté rue
    // assez hautes pour laisser sortir un camion gyrophare compris
    for (const [px, pz] of portes) vider(px - 2, px + 2, 0, Math.min(4, h - 2), pz, pz);
  }

  // Le viaduc est posé EN PREMIER, les bâtiments par-dessus.
  //
  // C'est ce qui rend l'ensemble insensible à l'ordre : le dégagement du couloir
  // de l'anneau ne peut plus décoiffer une halle, et un pilier qui tomberait
  // dans un mur est simplement recouvert par le mur. Chaque fois qu'on ajoutera
  // un bâtiment ici, il gagnera contre la voie au lieu d'être mangé par elle.
  metroSouterrain();

  // ================= LA CASERNE DE POMPIERS =================
  // À l'ouest de la place centrale, portes ouvertes sur celle-ci.
  //
  // Les deux bâtiments tiennent à l'intérieur de l'anneau, en deçà du rayon 35 :
  // au-delà commence la bande où passent le viaduc et ses piliers, et une halle
  // qui empiétait dessus se retrouvait traversée par une colonne de béton ou
  // décoiffée par le dégagement du couloir. La règle est vérifiée par un test.
  const CX = -17, CZ = -8;
  vider(CX - 14, CX + 14, 0, 18, CZ - 12, CZ + 14);   // on rase le pâté d'immeubles
  dalle(CX - 14, CX + 14, CZ - 12, CZ + 14, -1, GRIS_CLAIR);
  halle(CX - 12, CX + 12, CZ - 10, CZ + 4, 6, ROUGE, ROUGE_SOMBRE,
    [[CX - 6, CZ + 4], [CX + 6, CZ + 4]]);
  // le bandeau blanc et l'enseigne
  for (let x = CX - 12; x <= CX + 12; x++) set(x, 5, CZ + 4, BLANC);
  for (let x = CX - 4; x <= CX + 4; x += 2) set(x, 7, CZ + 4, JAUNE);
  // la tour de séchage des tuyaux, la silhouette d'une caserne
  bloc(CX + 9, CX + 12, 0, 15, CZ - 10, CZ - 7, ROUGE);
  vider(CX + 10, CX + 11, 0, 14, CZ - 9, CZ - 8);
  for (let y = 3; y <= 13; y += 3) { set(CX + 9, y, CZ - 8, VERRE); set(CX + 12, y, CZ - 9, VERRE); }
  dalle(CX + 8, CX + 13, CZ - 11, CZ - 6, 16, ROUGE_SOMBRE);
  set(CX + 10, 17, CZ - 8, JAUNE);
  // la vasque et le mât du drapeau, devant
  for (let y = 0; y <= 6; y++) set(CX - 13, y, CZ + 8, GRIS);
  for (let y = 4; y <= 6; y++) { set(CX - 12, y, CZ + 8, ROUGE); set(CX - 11, y, CZ + 8, BLANC); }

  // Deux camions rouges dans la halle, plus un dehors, prêt à partir.
  // Ils regardent tous vers +x : un paramètre de sens rendait l'expression
  // illisible pour un cas qui ne se présente jamais.
  // Les roues sont posées SUR le sol, pas au niveau du sol : enfoncées dans la
  // chaussée elles étaient invisibles, et le camion ne se lisait plus que comme
  // un long mur rouge. Un châssis gris sous la caisse fait le reste.
  function camion(bx, bz, echelle) {
    for (const dz of [-1, 1]) for (const dx of [1, 8, 10]) set(bx + dx, 0, bz + dz, ANTHRACITE);
    bloc(bx, bx + 11, 1, 1, bz - 1, bz + 1, GRIS);           // le châssis
    bloc(bx, bx + 3, 2, 3, bz - 1, bz + 1, ROUGE);           // la cabine
    set(bx, 3, bz, VERRE);                                    // le pare-brise
    for (const dz of [-1, 1]) set(bx + 1, 3, bz + dz, VERRE); // les vitres de portière
    bloc(bx + 4, bx + 11, 2, 3, bz - 1, bz + 1, ROUGE);      // la caisse
    for (let x = bx + 4; x <= bx + 11; x += 2) set(x, 2, bz - 1, BLANC);
    set(bx + 1, 4, bz, BLEU);                                 // le gyrophare
    if (echelle) {
      for (let k = 0; k <= 9; k++) set(bx + 3 + k, 4, bz, GRIS_CLAIR);
      set(bx + 12, 5, bz, GRIS_CLAIR);
    } else {
      bloc(bx + 5, bx + 10, 4, 4, bz - 1, bz + 1, BLANC);     // la citerne
    }
  }
  camion(CX - 11, CZ - 3, true);
  camion(CX, CZ - 3, false);
  // Celui-ci est garé au large des deux portes, sinon il en masque une.
  camion(CX + 1, CZ + 12, true);

  // ================= LE COMMISSARIAT =================
  // De l'autre côté de la place, en pierre bleue et béton.
  const PX = 17, PZ = -8;
  vider(PX - 14, PX + 14, 0, 18, PZ - 12, PZ + 14);
  dalle(PX - 14, PX + 14, PZ - 12, PZ + 14, -1, GRIS_CLAIR);
  // Le toit est en ARDOISE et non en bleu vif. Paris a triplé d'échelle en
  // v187, et ce qui n'était qu'une tuile de couleur au milieu d'un village est
  // devenu, vu du ciel, une bâche bleue de vingt-cinq blocs posée à côté de
  // Notre-Dame. Le bleu de la police reste — en bandeau, sur la façade, là où
  // un enfant le lit — mais il ne fait plus le toit.
  halle(PX - 11, PX + 11, PZ - 10, PZ + 4, 8, BETON, ANTHRACITE, [[PX, PZ + 4]]);
  // le perron et les colonnes
  dalle(PX - 6, PX + 6, PZ + 5, PZ + 7, -1, BLANC);
  for (const dx of [-5, -2, 2, 5]) {
    for (let y = 0; y <= 8; y++) set(PX + dx, y, PZ + 5, BLANC);
  }
  dalle(PX - 6, PX + 6, PZ + 4, PZ + 6, 9, BLEU);
  // le bandeau bleu, l'enseigne et le gyrophare de façade
  for (let x = PX - 11; x <= PX + 11; x++) set(x, 7, PZ + 4, BLEU);
  for (let x = PX - 3; x <= PX + 3; x += 2) set(x, 10, PZ + 5, BLEU);
  // les cellules, au fond : barreaux visibles depuis la rue
  for (let x = PX - 9; x <= PX - 3; x += 2) {
    for (let y = 1; y <= 3; y++) set(x, y, PZ - 10, GRIS);
  }
  // le mât et le drapeau
  for (let y = 0; y <= 8; y++) set(PX + 13, y, PZ + 8, GRIS);
  for (let y = 6; y <= 8; y++) { set(PX + 12, y, PZ + 8, BLEU); set(PX + 11, y, PZ + 8, BLANC); }

  // Trois voitures de patrouille, bleu et blanc, garées en épi.
  function voiture(bx, bz) {
    for (const dz of [-1, 1]) { set(bx + 1, 0, bz + dz, ANTHRACITE); set(bx + 4, 0, bz + dz, ANTHRACITE); }
    bloc(bx, bx + 5, 1, 1, bz - 1, bz + 1, BLANC);
    for (const dz of [-1, 1]) for (let x = bx; x <= bx + 5; x++) set(x, 1, bz + dz, BLEU);
    bloc(bx + 1, bx + 4, 2, 2, bz - 1, bz + 1, BLANC);
    for (const dz of [-1, 1]) for (let x = bx + 2; x <= bx + 3; x++) set(x, 2, bz + dz, VERRE);
    set(bx + 1, 2, bz, VERRE); set(bx + 4, 2, bz, VERRE);   // pare-brise et lunette
    set(bx + 2, 3, bz, BLEU);                                // le gyrophare
  }
  voiture(PX - 10, PZ + 10);
  voiture(PX - 3, PZ + 10);
  voiture(PX + 4, PZ + 10);

  // ================= LE MÉTRO AÉRIEN =================
  // Un anneau porté sur piliers. Le tablier se creuse d'abord son couloir :
  // sans cela, la voie disparaissait dans le premier immeuble rencontré.
  // Le métro souterrain : un tunnel annulaire, quatre stations, et les bouches
  // par lesquelles on y descend.
  //
  // Trois choses comptent pour qu'un enfant y croie, et aucune n'est décorative :
  //   — on DESCEND. Une bouche au bord du trottoir, un escalier, un quai. Un
  //     tunnel où l'on tombe par un trou ne ressemble pas au métro.
  //   — le tunnel est ÉCLAIRÉ. Sous terre, sans repère lumineux, on ne sait plus
  //     de quel côté on regarde ; les lampes régulières donnent la direction.
  //   — la voûte est ARRONDIE. Un couloir carré fait cave ; c'est la courbe du
  //     plafond qui fait métro.
  function metroSouterrain() {
    const Y = ANNEAU.tablier;          // niveau des rails (négatif : sous terre)
    const R = ANNEAU.rayon;
    const SOL = Y;                     // le ballast
    const VOUTE = Y + 5;               // le sommet du tunnel

    // Les points de l'anneau, dédoublonnés une fois pour toutes.
    const points = [];
    const vus = new Set();
    for (let i = 0; i < 900; i++) {
      const a = (i / 900) * Math.PI * 2;
      const x = Math.round(Math.sin(a) * R), z = Math.round(Math.cos(a) * R);
      const cle = `${x},${z}`;
      if (vus.has(cle)) continue;
      vus.add(cle);
      points.push({ a, x, z });
    }

    // Deux passes, et pas une seule : le couloir creusé d'un point effaçait la
    // voie posée au point précédent, et l'anneau se retrouvait en pointillé.
    // C'est le même piège qu'au temps du viaduc — il n'a pas disparu en
    // descendant sous terre.
    for (const { a } of points) {
      for (let d = -3; d <= 3; d++) {
        const px = Math.round(Math.sin(a) * (R + d)), pz = Math.round(Math.cos(a) * (R + d));
        // La voûte s'abaisse sur les bords : c'est ce qui l'arrondit.
        const haut = VOUTE - (Math.abs(d) === 3 ? 2 : Math.abs(d) === 2 ? 1 : 0);
        vider(px, px, SOL, haut, pz, pz);
      }
    }

    for (const { a, x, z } of points) {
      const en = (d, y, id) => set(Math.round(Math.sin(a) * (R + d)), y,
        Math.round(Math.cos(a) * (R + d)), id);
      // le ballast et la plate-forme de voie
      for (let d = -3; d <= 3; d++) en(d, SOL - 1, Math.abs(d) === 3 ? BETON : GRIS);
      // les deux files de rails
      for (const d of [-1, 1]) en(d, SOL, GRIS_CLAIR);
      // la traverse, une sur six
      if ((x + z) % 6 === 0) set(x, SOL, z, ROUGE_SOMBRE);
      // le piédroit carrelé de blanc, des deux côtés — le carreau du métro
      for (const d of [-3, 3]) {
        for (let y = SOL; y <= VOUTE - 2; y++) en(d, y, BLANC);
      }
      // la voûte, arrondie
      for (const d of [-3, -2, -1, 0, 1, 2, 3]) {
        const haut = VOUTE - (Math.abs(d) === 3 ? 2 : Math.abs(d) === 2 ? 1 : 0);
        en(d, haut + 1, BETON);
      }
      // les lampes, tous les sept blocs : sous terre, c'est ce qui donne la
      // direction et empêche de se croire à l'arrêt
      if ((x + z) % 7 === 0) en(0, VOUTE, JAUNE);
    }

    // --- les quatre stations, aux points cardinaux ---------------------------
    //
    // Un quai, c'est un renfoncement à côté de la voie, pas la voie elle-même :
    // un enfant qui attend doit pouvoir se tenir HORS du passage de la rame.
    const stations = [[0, -R], [R, 0], [0, R], [-R, 0]];
    for (const [sx, sz] of stations) {
      const long = Math.abs(sx) > Math.abs(sz);
      const [ax, az] = long ? [0, 1] : [1, 0];          // axe du quai
      const [px, pz] = long ? [1, 0] : [0, 1];          // perpendiculaire
      const cote = Math.sign(sx || sz);                 // vers l'intérieur de l'anneau

      for (let k = -7; k <= 7; k++) {
        const qx = sx + ax * k, qz = sz + az * k;
        // on élargit la salle : quatre blocs de plus du côté du quai
        for (let d = 1; d <= 5; d++) {
          const ex = qx - px * cote * d, ez = qz - pz * cote * d;
          vider(ex, ex, SOL, VOUTE + 1, ez, ez);
          set(ex, SOL, ez, d <= 4 ? GRIS_CLAIR : BLANC);   // le quai, surélevé
          set(ex, VOUTE + 2, ez, BETON);                    // son plafond
          if (d === 5) for (let y = SOL + 1; y <= VOUTE + 1; y++) set(ex, y, ez, BLANC);
        }
        // la bande d'éveil au bord du quai, jaune, comme partout
        const bx = qx - px * cote, bz = qz - pz * cote;
        set(bx, SOL + 1, bz, k % 2 === 0 ? JAUNE : GRIS_CLAIR);
        // les lampes du quai
        if (k % 4 === 0) {
          const lx = qx - px * cote * 3, lz = qz - pz * cote * 3;
          set(lx, VOUTE + 1, lz, JAUNE);
        }
      }

      // --- la bouche de métro, au bord du trottoir --------------------------
      //
      // C'est elle qui rend le métro trouvable. Sans elle, un tunnel parfait
      // reste invisible : l'enfant passe au-dessus sans se douter de rien.
      const ox = sx - px * cote * 8, oz = sz - pz * cote * 8;   // au bout du quai
      // la trémie : une cage d'escalier qui monte du quai jusqu'à la rue
      for (let y = SOL; y <= 1; y++) {
        for (let d = -1; d <= 1; d++) {
          const ex = ox + ax * d, ez = oz + az * d;
          vider(ex, ex, y, y, ez, ez);
        }
      }
      // les marches, du quai jusqu'à la rue
      const marches = Math.abs(SOL) + 1;
      for (let m = 0; m <= marches; m++) {
        const ex = ox - px * cote * Math.round(m / 2), ez = oz - pz * cote * Math.round(m / 2);
        for (let d = -1; d <= 1; d++) {
          const mx = ex + ax * d, mz = ez + az * d;
          vider(mx, mx, SOL + m, SOL + m + 3, mz, mz);
          set(mx, SOL + m - 1, mz, GRIS_CLAIR);
        }
      }
      // l'édicule en surface : l'arche verte, deux mâts et l'enseigne jaune.
      // C'est le seul morceau du métro qu'on voit depuis la rue, donc c'est
      // lui qui doit se reconnaître de loin.
      const ex0 = ox - px * cote * Math.round(marches / 2), ez0 = oz - pz * cote * Math.round(marches / 2);
      for (const d of [-2, 2]) {
        const mx = ex0 + ax * d, mz = ez0 + az * d;
        for (let y = 0; y <= 3; y++) set(mx, y, mz, VERT_METRO);
      }
      for (let d = -2; d <= 2; d++) {
        set(ex0 + ax * d, 4, ez0 + az * d, VERT_METRO);
      }
      set(ex0, 5, ez0, JAUNE);                                  // le M de l'enseigne
      // la balustrade autour de la trémie, pour ne pas y tomber
      for (const d of [-2, 2]) {
        const mx = ex0 + px * cote * d, mz = ez0 + pz * cote * d;
        set(mx, 0, mz, VERT_METRO);
      }
    }
  }
}
