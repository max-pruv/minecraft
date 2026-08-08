// Les services de la ville : la caserne de pompiers, le commissariat, et le
// métro aérien qui fait le tour de Paris.
//
// Le viaduc n'est pas un caprice. Autour de la ville, quinze points sur
// vingt-quatre relevés sont sous l'eau : une voie posée au sol aurait plongé
// dans le fleuve. À l'intérieur, en revanche, la ville repose sur une base
// parfaitement plate — c'est là que passe l'anneau, porté sur piliers au-dessus
// des toits bas, comme un métro aérien. Il se creuse son propre couloir : sans
// cela, un immeuble sur son passage l'aurait enseveli.

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
const BETON = BLOCK.STONEBRICK;
const VERRE = BLOCK.GLASS;

// L'anneau du métro : rayon et hauteur du tablier, dans le repère du bâtisseur.
export const ANNEAU = { rayon: 38, tablier: 9 };

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
  metroAerien();

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
  halle(PX - 11, PX + 11, PZ - 10, PZ + 4, 8, BETON, BLEU_NUIT, [[PX, PZ + 4]]);
  // le perron et les colonnes
  dalle(PX - 6, PX + 6, PZ + 5, PZ + 7, -1, BLANC);
  for (const dx of [-5, -2, 2, 5]) {
    for (let y = 0; y <= 8; y++) set(PX + dx, y, PZ + 5, BLANC);
  }
  dalle(PX - 6, PX + 6, PZ + 4, PZ + 6, 9, BLEU_NUIT);
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
  function metroAerien() {
    const Y = ANNEAU.tablier;
    const R = ANNEAU.rayon;
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

    // Deux passes, et pas une seule : le couloir dégagé d'un point effaçait les
    // rails posés au point précédent, l'anneau se retrouvait en pointillé.
    for (const { x, z } of points) vider(x - 3, x + 3, Y, Y + 6, z - 3, z + 3);

    for (const { a, x, z } of points) {
      // le tablier : cinq blocs de large, posés le long du rayon
      for (let d = -2; d <= 2; d++) {
        set(Math.round(Math.sin(a) * (R + d)), Y - 1, Math.round(Math.cos(a) * (R + d)),
          Math.abs(d) === 2 ? GRIS : BETON);
      }
      // les deux files de rails, de part et d'autre de l'axe
      for (const d of [-1, 1]) {
        set(Math.round(Math.sin(a) * (R + d)), Y, Math.round(Math.cos(a) * (R + d)), GRIS_CLAIR);
      }
      // la traverse, une sur six
      if ((x + z) % 6 === 0) set(x, Y, z, ROUGE_SOMBRE);
      // le garde-corps, au bord du tablier
      for (const d of [-2, 2]) {
        set(Math.round(Math.sin(a) * (R + d)), Y + 1, Math.round(Math.cos(a) * (R + d)), GRIS);
      }
    }

    // les piliers, un tous les neuf degrés
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const x = Math.round(Math.sin(a) * R), z = Math.round(Math.cos(a) * R);
      for (let y = -1; y < Y - 1; y++) {
        set(x, y, z, BETON);
        if (y > 0 && y % 4 === 0) {
          set(Math.round(Math.sin(a) * (R + 1)), y, Math.round(Math.cos(a) * (R + 1)), GRIS);
          set(Math.round(Math.sin(a) * (R - 1)), y, Math.round(Math.cos(a) * (R - 1)), GRIS);
        }
      }
    }

    // Quatre stations aux points cardinaux : quai couvert, escalier jusqu'à la
    // rue, et le nom sur le fronton.
    for (const [sx, sz] of [[0, -R], [R, 0], [0, R], [-R, 0]]) {
      const long = Math.abs(sx) > Math.abs(sz);
      const [ax, az] = long ? [0, 1] : [1, 0];          // axe du quai
      for (let k = -6; k <= 6; k++) {
        const qx = sx + ax * k, qz = sz + az * k;
        // élargissement du quai
        for (let d = -4; d <= 4; d++) {
          const dx = long ? d : 0, dz = long ? 0 : d;
          set(qx + dx, Y - 1, qz + dz, Math.abs(d) > 2 ? GRIS_CLAIR : BETON);
        }
        // la marquise
        for (let d = -4; d <= 4; d++) {
          const dx = long ? d : 0, dz = long ? 0 : d;
          set(qx + dx, Y + 5, qz + dz, JAUNE);
        }
        if (k % 4 === 0) {
          for (const s of [-1, 1]) {
            const dx = long ? s * 4 : 0, dz = long ? 0 : s * 4;
            for (let y = Y; y <= Y + 4; y++) set(qx + dx, y, qz + dz, GRIS);
          }
        }
      }
      // l'escalier vers la rue, à l'intérieur de l'anneau
      const ix = Math.sign(-sx), iz = Math.sign(-sz);
      for (let k = 0; k <= Y + 1; k++) {
        const ex = sx + ix * (4 + k), ez = sz + iz * (4 + k);
        for (let d = -1; d <= 1; d++) {
          const dx = long ? d : 0, dz = long ? 0 : d;
          set(ex + dx, Y - 1 - k, ez + dz, GRIS_CLAIR);
        }
      }
      // le fronton
      for (let d = -3; d <= 3; d++) {
        const dx = long ? d : 0, dz = long ? 0 : d;
        set(sx + dx + ix * 3, Y + 6, sz + dz + iz * 3, BLEU);
      }
    }
  }
}
