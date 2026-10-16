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

import { BLOCK, CITY_BLOCK, DECOR_START } from './blocks.js';
import { adresseParis, solParis, lotParisLibre } from './paris.js';

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


// =============================================================================
// LA LIGNE 1 DU MÉTRO DE PARIS (v456) — sous les Champs-Élysées, Rivoli et
// le Faubourg, de la Porte Maillot au Château de Vincennes.
//
// L'anneau de la v163 a suivi la caserne en banlieue (v293) : il reste sous
// elle, et c'est voulu — c'est le métro de la caserne, il ne gêne personne, et
// le retirer réécrirait un repère où l'on a pu jouer sans rien donner à Paris.
// Paris, elle, n'avait plus AUCUN métro. La 1 est la ligne qui se trace le
// mieux sur ce plan : elle suit exactement trois avenues que la ville a déjà
// (Champs-Élysées, Rivoli, Faubourg Saint-Antoine), comme la vraie.
//
// La méthode est celle de Washington (CLAUDE.md, section Washington) : le vide
// d'abord, les pleins qui tombent dedans abandonnés, le mobilier ensuite, le
// gabarit des rames en tout dernier. Rien ne se met en travers d'un train.
//
// Ce qui est creusé n'est PAS le relief : `terrainHeight` ne bouge pas, et les
// blocs des enfants sont réappliqués après la ville (fin de `generateChunk`) —
// ils gagnent sur le tunnel. Une cabane posée sur le tracé reste entière.
//
// Le PROFIL EST PLAT, et c'est mesuré : hors de la Seine, le relief vaut 33 ou
// 34 sous toute l'emprise (sonde de la v456). Une cote constante ne dépend
// d'aucun monde, donc deux tablettes, le worker et le fil principal creusent
// le même tunnel par construction.
//
// ET LA SEINE PASSE À QUELQUES BLOCS. Sur ce plan, Rivoli longe le fleuve de
// Châtelet à Saint-Paul et la ligne frôle l'eau de Gare de Lyon à Nation : cinq
// stations ont de l'eau à moins de huit blocs. Le fond du lit est à 27 (l'eau
// de 28 à 30). D'où seize blocs de profondeur et non douze : le haut de la
// voûte d'une station est à 27, sous le lit — jamais une voûte de carreaux qui
// dépasse dans le fleuve, jamais une poche d'air sous l'eau. Et un escalier ne
// passe jamais sous une colonne d'eau (`emprisesEscalier`).
//
// La Défense est HORS du disque de Paris (elle est à neuf kilomètres et demi de
// Notre-Dame, le disque en fait sept virgule sept) : la ligne s'arrête à la
// Porte Maillot. Déclaré, pas oublié.

const SOL_PARIS = 34;
export const LIGNE1 = {
  voie: SOL_PARIS - 16,     // le ballast : seize blocs sous la rue
  ecart: 2.2,               // chaque voie à 2,2 blocs de l'axe (la rame fait 1,5)
  demiTunnel: 4, hTunnel: 5,
  demiVoute: 7, hVoute: 8,  // la station : quinze blocs sous la voûte elliptique
  demiStation: 12,          // le quai fait vingt-cinq blocs de long
  quai: 3.4,                // le bord du quai, depuis l'axe
  tiroir: 9,
};
// Interrupteur de mesure : `actif = false` rend le monde d'avant la v456 au bit
// près (empreinte des 490 morceaux, plafond.js).
export const METRO_PARIS = { actif: true };

// Les stations, en KILOMÈTRES depuis Notre-Dame, sur le plan du jeu (celui de
// `LIEUX` dans paris.js) — jamais un décalage en blocs. Celles qui ne sont pas
// un lieu de la carte sont prises SUR l'avenue, entre deux lieux.
const entre = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const ETOILE = [-5.4, -1.6], CONCORDE = [-3.2, -0.9], LOUVRE = [-1.6, -0.6];
const HDV = [0.2, -0.35], BASTILLE = [1.5, -0.2], NATION = [3.0, 0.5];
export const STATIONS_LIGNE1 = [
  ['Porte Maillot', [-6.75, -1.875]],
  ['Charles de Gaulle–Étoile', ETOILE],
  ['George V', entre(ETOILE, CONCORDE, 0.3)],
  ['Franklin D. Roosevelt', entre(ETOILE, CONCORDE, 0.62)],
  ['Concorde', CONCORDE],
  ['Tuileries', [-2.3, -0.75]],
  ['Palais Royal–Musée du Louvre', LOUVRE],
  ['Châtelet', entre(LOUVRE, HDV, 0.78)],
  ['Hôtel de Ville', HDV],
  ['Saint-Paul', entre(HDV, BASTILLE, 0.5)],
  ['Bastille', BASTILLE],
  ['Gare de Lyon', [2.0, 0.0]],
  ['Reuilly–Diderot', [2.5, 0.25]],
  // Le quai de Nation est sous le débouché du cours de Vincennes, douze blocs à
  // l'est du centre de la place — comme le vrai quai de la 1 ; sous la place
  // elle-même, aucune bouche ne trouvait un trottoir qui ne soit pas une rue.
  ['Nation', [NATION[0] + 0.25, NATION[1] + 0.06]],
  ['Porte de Vincennes', [3.9, 0.5]],
  ['Château de Vincennes', [5.6, 0.3]],
].map(([nom, km]) => {
  const [x, z] = adresseParis(km[0], km[1]);
  return { nom, km, x: x + 0.5, z: z + 0.5 };
});

// Le tracé, un point par bloc, tiroirs compris.
const TRACE1 = (() => {
  const st = STATIONS_LIGNE1;
  const pts = [];
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i], b = st[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z)));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, arret: k === 0 ? a : null });
    }
  }
  const der = st[st.length - 1];
  pts.push({ x: der.x, z: der.z, arret: der });
  const prolonger = (a, b, fin) => {
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const dx = (b.x - a.x) / l, dz = (b.z - a.z) / l;
    const suite = [];
    for (let k = 1; k <= LIGNE1.tiroir; k++) suite.push({ x: b.x + dx * k, z: b.z + dz * k, arret: null });
    if (fin) pts.push(...suite); else pts.unshift(...suite.reverse());
  };
  prolonger(pts[pts.length - 2], pts[pts.length - 1], true);
  prolonger(pts[1], pts[0], false);
  return pts;
})();

const sensEn = (pts, i) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return [(b.x - a.x) / l, (b.z - a.z) / l];
};

// Les quais : centre, direction de l'avenue.
export const QUAIS_LIGNE1 = TRACE1.map((p, i) => [p, i]).filter(([p]) => p.arret).map(([p, i]) => {
  const [dx, dz] = sensEn(TRACE1, i);
  return { nom: p.arret.nom, x: p.x, z: p.z, dx, dz, i };
});

// LA BOUCHE SE POSE SUR LE TROTTOIR, ET CELA SE CHERCHE (règle v223 : un
// emplacement se mesure). L'escalier court le long de l'avenue, à côté de la
// station ; il remonte du bout du quai jusqu'à la rue. Ce qui touche la
// surface — la trémie, sa balustrade, l'arche verte — ne se pose que sur du
// trottoir ou de l'herbe : jamais sur la chaussée (aucun circuit muré), jamais
// sur un lot (aucun immeuble éventré). La recherche essaie le côté, l'écart à
// l'axe et le bout du quai, et garde le premier qui tient.
const MARCHES = SOL_PARIS - (LIGNE1.voie + 1);   // du quai à la rue
// L'ESCALIER MONTE DE 0,7 BLOC PAR BLOC, PAS D'UN. Il court le long de
// l'avenue, et l'avenue est en biais sur la grille : deux colonnes voisines
// peuvent alors être à 1,4 bloc l'une de l'autre le long de l'escalier, et à
// une marche par bloc l'arrondi y faisait une marche de DEUX blocs — un mur
// pour l'enfant (la sonde de la v456 l'a trouvé). À 0,7, l'écart entre deux
// voisines reste sous un bloc.
const PENTE_ESC = 0.7;
export const LONG_ESC = Math.ceil(MARCHES / PENTE_ESC);
export const marcheEn = (le) => Math.round(PENTE_ESC * le);
export const praticable = (x, z) => {
  const s = solParis(Math.floor(x), Math.floor(z));
  // un arbre d'alignement cède sa place à la trémie (on dégage son fût)
  return (s === CITY_BLOCK.SIDEWALK || s === BLOCK.GRASS || s === BLOCK.LEAVES);
};
const vers = (q, le, tr) => [q.x + q.dx * le - q.dz * tr, q.z + q.dz * le + q.dx * tr];
// Un point de l'escalier : `m` le long de la montée, `t` en travers. L'escalier
// court le long de l'avenue (`perp` faux) ou part droit vers le trottoir
// (`perp` vrai) — celui-là sert aux stations sous une place ou dans un virage
// de la ligne, où l'escalier parallèle retombait sur le tunnel d'à côté.
export const pointEsc = (q, b, m, t) => (b.perp
  ? vers(q, b.a + t, b.cote * (b.o + m))
  : vers(q, b.a + b.sg * m, b.o * b.cote + t));
export function emprisesTremie(q, b) {
  // la trémie et l'arche : ce qui s'ouvre ou se dresse sur la rue
  const out = [];
  for (let m = Math.floor((MARCHES - 3) / PENTE_ESC) - 1; m <= LONG_ESC + 2; m++) {
    for (let t = -1; t <= 1; t++) out.push(pointEsc(q, b, m, t));
  }
  return out;
}
const pasUneRue = (x, z) => {
  const xi = Math.floor(x), zi = Math.floor(z);
  const s = solParis(xi, zi);
  return (s === CITY_BLOCK.SIDEWALK || s === BLOCK.GRASS || s === BLOCK.LEAVES) && !lotParisLibre(xi, zi);
};
export function emprisesEscalier(q, b) {
  // tout le chemin, du couloir au palier : jamais sous le fleuve
  const out = [];
  for (let m = -1; m <= LONG_ESC + 2; m++) {
    for (let t = -2; t <= 2; t++) out.push(pointEsc(q, b, m, t));
  }
  for (let t = LIGNE1.demiVoute; t <= b.o; t++) for (const d of [-2, 0, 2]) out.push(vers(q, b.a + d, t * b.cote));
  return out;
}
export const pasDEau = ([x, z]) => solParis(Math.floor(x), Math.floor(z)) !== BLOCK.WATER;
// CE QUI EST DÉJÀ SOUS TERRE : le tunnel (6,5 blocs de l'axe), chaque station
// (son rectangle élargi), et les escaliers déjà posés. Deux escaliers voisins
// se croisaient — Saint-Paul et Bastille, mesuré : une marche de l'un posée à
// la rue au milieu de l'autre.
export const cleCol = (x, z) => Math.floor(x) * 65536 + Math.floor(z);
export const SOUS_TERRE = new Map();       // colonne → station (ou -1 pour le tunnel)
for (const p of TRACE1) {
  for (let dx = -7; dx <= 7; dx++) for (let dz = -7; dz <= 7; dz++) {
    if (Math.hypot(dx, dz) <= 6.5) {
      const c = cleCol(p.x + dx, p.z + dz);
      if (!SOUS_TERRE.has(c)) SOUS_TERRE.set(c, { k: -1, haut: LIGNE1.voie + LIGNE1.hTunnel + 1 });
    }
  }
}
QUAIS_LIGNE1.forEach((q, k) => {
  for (let le = -LIGNE1.demiStation - 2; le <= LIGNE1.demiStation + 2; le++) {
    for (let tr = -LIGNE1.demiVoute - 2; tr <= LIGNE1.demiVoute + 2; tr++) {
      SOUS_TERRE.set(cleCol(...vers(q, le, tr)), { k, haut: LIGNE1.voie + 1 + LIGNE1.hVoute });
    }
  }
});
// LE CHOIX SE FAIT ENSEMBLE, PAS STATION PAR STATION. Pris dans l'ordre de la
// ligne, le premier escalier de Saint-Paul prenait la place de celui de la
// Bastille. On garde les quarante premières places de chaque station, puis l'on
// sert d'abord celle qui en a le moins.
export const empreinteEsc = (q, b) => {
  const out = new Set();
  for (let m = -2; m <= LONG_ESC + 3; m++) for (let t = -3; t <= 3; t++) out.add(cleCol(...pointEsc(q, b, m, t)));
  return out;
};
export function placesDe(q, k) {
  const libre = (b) => {
    for (let m = 1; m <= LONG_ESC + 2; m++) {
      for (let t = -3; t <= 3; t++) {
        // ce qui est dessous ne gêne que si l'escalier y descend : il passe
        // AU-DESSUS du tunnel d'à côté avec un bloc de terre entre les deux
        const qui = SOUS_TERRE.get(cleCol(...pointEsc(q, b, m, t)));
        if (qui !== undefined && qui.k !== k && LIGNE1.voie + 1 + marcheEn(m) <= qui.haut + 1) return false;
      }
    }
    // le couloir, au niveau du quai : rien d'autre que sa propre station
    for (let t = LIGNE1.demiVoute; t <= b.o + 2; t++) {
      for (const d of [-2, 0, 2]) {
        const qui = SOUS_TERRE.get(cleCol(...vers(q, b.a + d, t * b.cote)));
        if (qui !== undefined && qui.k !== k) return false;
      }
    }
    return true;
  };
  const tient = (b) => emprisesTremie(q, b).every(([x, z]) => praticable(x, z) && !lotParisLibre(Math.floor(x), Math.floor(z)))
    && emprisesEscalier(q, b).every(pasDEau) && libre(b);
  const As = [];
  for (let a = 2; a <= LIGNE1.demiStation - 2; a++) As.push(a, -a);
  const out = [];
  for (const o of [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 8]) {
    for (const cote of [1, -1]) {
      for (const a of As) {
        for (const sg of [-Math.sign(a), Math.sign(a)]) {
          const b = { a, sg, o, cote };
          if (tient(b)) out.push(b);
          if (out.length >= 40) return out;
        }
      }
    }
  }
  // l'escalier droit vers le trottoir, pour une station sous une place ou dans
  // un virage de la ligne
  for (const o of [LIGNE1.demiVoute + 2, 12, 15, 18]) {
    for (const cote of [1, -1]) {
      for (const a of [0, ...As]) {
        const b = { a, sg: 1, o, cote, perp: true };
        if (tient(b)) out.push(b);
        if (out.length >= 40) return out;
      }
    }
  }
  return out;
}
export const BOUCHES_LIGNE1 = (() => {
  const places = QUAIS_LIGNE1.map((q, k) => placesDe(q, k).map((b) => ({ b, e: empreinteEsc(q, b) })));
  const ordre = QUAIS_LIGNE1.map((_, k) => k).sort((i, j) => places[i].length - places[j].length || i - j);
  // une recherche en profondeur, bornée : le plus de stations servies, et à
  // nombre égal le premier choix de chacune (l'ordre des places dit la préférence)
  const pris = new Map();
  let meilleur = null, meilleurN = -1, essais = 0;
  const courant = [];
  const chercher = (n, servies) => {
    if (++essais > 20000) return;
    if (servies + (ordre.length - n) <= meilleurN) return;
    if (n === ordre.length) { meilleurN = servies; meilleur = [...courant]; return; }
    const k = ordre[n];
    for (const p of places[k]) {
      if ([...p.e].some((c) => pris.has(c))) continue;
      for (const c of p.e) pris.set(c, k);
      courant[k] = p;
      chercher(n + 1, servies + 1);
      for (const c of p.e) pris.delete(c);
      courant[k] = null;
      if (meilleurN === ordre.length) return;
    }
    chercher(n + 1, servies);
  };
  chercher(0, 0);
  const choix = [];
  for (let k = 0; k < QUAIS_LIGNE1.length; k++) {
    const q = QUAIS_LIGNE1[k];
    const p = meilleur && meilleur[k];
    if (!p) { choix[k] = null; continue; }   // aucune place : le témoin le dit
    const b = p.b;
    const [tx, tz] = pointEsc(q, b, LONG_ESC + 2, 0);
    // l'arche verte si ses deux mâts tiennent sur le trottoir, sinon un mât
    // seul (le « M » jaune) à côté du haut des marches
    const mat = (t) => pasUneRue(...pointEsc(q, b, LONG_ESC + 1, t));
    b.arche = mat(-2) && mat(2);
    b.mat = b.arche ? 0 : mat(2) ? 2 : mat(-2) ? -2 : 0;
    choix[k] = { nom: q.nom, q, ...b, tx, tz };
  }
  return choix;
})();

// LES DEUX VOIES. Le métro parisien roule à droite ; au terminus, demi-tour
// dans le tiroir.
function voies1() {
  const pts = TRACE1;
  const e = LIGNE1.ecart;
  const cote = (i, s) => { const [dx, dz] = sensEn(pts, i); return { x: pts[i].x - dz * e * s, z: pts[i].z + dx * e * s }; };
  const arc = (i, s) => {
    const [dx, dz] = sensEn(pts, i);
    const out = [];
    for (let k = 1; k <= 5; k++) {
      const g = (k / 6) * Math.PI, c = Math.cos(g), si = Math.sin(g);
      out.push({ x: pts[i].x + e * s * (-dz * c + dx * si), z: pts[i].z + e * s * (dx * c + dz * si) });
    }
    return out;
  };
  return [
    ...pts.map((_, i) => cote(i, 1)),
    ...arc(pts.length - 1, 1),
    ...pts.map((_, i) => cote(i, -1)).reverse(),
    ...arc(0, -1),
  ];
}

export function traceLigne1Paris() {
  return voies1().map((p) => ({ x: p.x, y: LIGNE1.voie + 0.4, z: p.z }));
}
export function arretsLigne1Paris() {
  const n = TRACE1.length;
  const rangs = [];
  TRACE1.forEach((p, i) => { if (p.arret) { rangs.push(i); rangs.push(n + 5 + (n - 1 - i)); } });
  return rangs;
}

// Rangement par cases de huit, comme à Washington.
const CASE = 8;
const GRILLE1 = new Map();
const cle1 = (bx, bz) => bx * 65536 + bz;
function ranger1(x0, x1, z0, z1, obj) {
  for (let bx = Math.floor(x0 / CASE); bx <= Math.floor(x1 / CASE); bx++) {
    for (let bz = Math.floor(z0 / CASE); bz <= Math.floor(z1 / CASE); bz++) {
      const k = cle1(bx, bz);
      if (!GRILLE1.has(k)) GRILLE1.set(k, []);
      GRILLE1.get(k).push(obj);
    }
  }
}
for (let i = 0; i < TRACE1.length - 1; i++) {
  const a = TRACE1[i], b = TRACE1[i + 1];
  ranger1(Math.min(a.x, b.x) - 7, Math.max(a.x, b.x) + 7, Math.min(a.z, b.z) - 7, Math.max(a.z, b.z) + 7,
    { quoi: 'voie', x0: a.x, z0: a.z, x1: b.x, z1: b.z });
}
for (const q of QUAIS_LIGNE1) {
  const r = LIGNE1.demiStation + 10;
  ranger1(q.x - r, q.x + r, q.z - r, q.z + r, { quoi: 'station', ...q });
}
{
  const v = voies1();
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length];
    ranger1(Math.min(a.x, b.x) - 2, Math.max(a.x, b.x) + 2, Math.min(a.z, b.z) - 2, Math.max(a.z, b.z) + 2,
      { quoi: 'gabarit', x0: a.x, z0: a.z, x1: b.x, z1: b.z });
  }
}
for (const b of BOUCHES_LIGNE1) {
  if (!b) continue;
  const r = Math.abs(b.a) + LONG_ESC + 5 + b.o;
  ranger1(b.q.x - r, b.q.x + r, b.q.z - r, b.q.z + r, { quoi: 'bouche', ...b });
}

const surSegment = (x, z, s) => {
  const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((x - s.x0) * dx + (z - s.z0) * dz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(x - (s.x0 + t * dx), z - (s.z0 + t * dz));
};
const reperQ = (x, z, q) => {
  const ex = x - q.x, ez = z - q.z;
  return { le: ex * q.dx + ez * q.dz, tr: -ex * q.dz + ez * q.dx };
};

const CARREAU = BLANC;          // le carreau biseauté blanc, partout
const QUAI = GRIS;
const BORD = BLANC;
const PLAQUE = BLEU_NUIT;       // la plaque émaillée bleue du nom de station
const RAIL = GRIS_CLAIR;
const TRAVERSE = ROUGE_SOMBRE;
const hVoute1 = (tr) => Math.round(LIGNE1.hVoute * Math.sqrt(Math.max(0, 1 - (tr / (LIGNE1.demiVoute + 0.4)) ** 2)));

// Une colonne de Paris : (x, z) le coin du bloc, h la cote de la rue (le bloc
// de surface), `poser(y, id)` en cote ABSOLUE. Rend vrai si elle a creusé.
export function creuserMetroParis(x, z, h, poser) {
  if (!METRO_PARIS.actif) return false;
  const segs = GRILLE1.get(cle1(Math.floor(x / CASE), Math.floor(z / CASE)));
  if (!segs) return false;
  const cx = x + 0.5, cz = z + 0.5;
  const yr = LIGNE1.voie;
  const vides = [], pleins = [], apres = [], gabarit = [];
  const creuser = (y0, y1) => { if (y1 >= y0) vides.push([y0, y1]); };

  for (const s of segs) {
    if (s.quoi === 'gabarit') {
      if (surSegment(cx, cz, s) <= 1.0) gabarit.push([yr + 1, yr + 3]);
      continue;
    }
    if (s.quoi === 'voie') {
      const tr = surSegment(cx, cz, s);
      if (tr > LIGNE1.demiTunnel + 1.2) continue;
      if (tr > LIGNE1.demiTunnel) {                        // le piédroit
        for (let y = yr; y <= yr + LIGNE1.hTunnel + 1; y++) pleins.push([y, BETON]);
        continue;
      }
      const rail = Math.abs(tr - LIGNE1.ecart) < 0.6;
      pleins.push([yr, rail ? RAIL : ((x + z) % 3 === 0 && tr < LIGNE1.ecart + 1 ? TRAVERSE : GRIS)]);
      creuser(yr + 1, yr + LIGNE1.hTunnel);
      pleins.push([yr + LIGNE1.hTunnel + 1, BETON]);
      if (tr > LIGNE1.demiTunnel - 1 && (((x + z) % 8) + 8) % 8 === 0) apres.push([yr + 4, JAUNE]);
      continue;
    }
    if (s.quoi === 'station') {
      const r = reperQ(cx, cz, s);
      const L = LIGNE1.demiStation, V = LIGNE1.demiVoute;
      if (Math.abs(r.le) > L + 1 || Math.abs(r.tr) > V + 1.2) continue;
      const atr = Math.abs(r.tr);
      if (atr > V || Math.abs(r.le) > L) {               // l'enveloppe de la station
        for (let y = yr; y <= yr + 1 + hVoute1(0); y++) pleins.push([y, BETON]);
        continue;
      }
      const haut = yr + 1 + hVoute1(atr);
      if (atr < LIGNE1.quai) {
        // les voies, entre les deux quais
        const rail = Math.abs(atr - LIGNE1.ecart) < 0.6;
        pleins.push([yr, rail ? RAIL : GRIS]);
        creuser(yr + 1, haut - 1);
      } else {
        // le quai latéral, d'un bloc plus haut que les voies, et sa bordure blanche
        apres.push([yr + 1, atr < LIGNE1.quai + 0.8 ? BORD : QUAI]);
        pleins.push([yr, BETON]);
        // le carreau blanc des piédroits, la plaque bleue du nom tous les huit
        // — des PLEINS : le couloir d'une bouche les perce
        if (atr > V - 1) {
          const plaque = (((Math.round(r.le) % 8) + 8) % 8) === 4;
          for (let y = yr + 2; y < haut; y++) pleins.push([y, plaque && y === yr + 3 ? PLAQUE : CARREAU]);
        } else creuser(yr + 2, haut - 1);
      }
      pleins.push([haut, CARREAU]);                        // la voûte carrelée
      if (atr > 3.5 && atr < 4.5 && (((Math.round(r.le) % 6) + 6) % 6) === 0) apres.push([haut - 1, JAUNE]);
      continue;
    }
    if (s.quoi === 'bouche') {
      const r = reperQ(cx, cz, s.q);
      const lat = r.tr * s.cote;                          // vers le côté de la bouche
      const leQ = r.le - s.a;                              // depuis le pied, le long du quai
      // le repère de l'escalier : `le` le long de la montée, `dl` en travers
      const le = s.perp ? lat - s.o : leQ * s.sg;
      const dl = s.perp ? leQ : lat - s.o;
      // le couloir du quai au pied de l'escalier, au niveau du quai
      if (leQ >= -1.5 && leQ <= 1.5 && lat >= LIGNE1.demiVoute - 1 && lat <= s.o + (s.perp ? 0.5 : 2.5)) {
        if (Math.abs(leQ) > 1 || (!s.perp && lat > s.o + 1.5)) {
          for (let y = yr + 1; y <= yr + 5; y++) pleins.push([y, CARREAU]);
        } else {
          apres.push([yr + 1, QUAI]);
          creuser(yr + 2, yr + 4);
          pleins.push([yr + 5, CARREAU]);
        }
      }
      // l'escalier, de la cote du quai à celle de la rue
      if (Math.abs(dl) <= 2.5 && le > 0.5 && le <= LONG_ESC + 2.5) {
        const m = Math.round(le);
        const sol = Math.min(h, yr + 1 + marcheEn(le));
        const ouvert = sol + 3 >= h;                      // la trémie : on voit le ciel
        if (Math.abs(dl) > 1.5) {                          // les joues de l'escalier
          if (m <= LONG_ESC) for (let y = sol; y < Math.min(h, sol + 5); y++) pleins.push([y, CARREAU]);
          // la balustrade verte autour de la trémie, au niveau de la rue
          if (ouvert && m <= LONG_ESC && pasUneRue(cx, cz)) apres.push([h + 1, VERT_METRO]);
        } else if (m <= LONG_ESC) {
          apres.push([sol, GRIS_CLAIR]);
          // au débouché, on dégage aussi ce qui se dressait sur le trottoir
          // (le fût d'un arbre, un réverbère) : rien ne flotte au-dessus du trou
          creuser(sol + 1, ouvert ? h + 7 : sol + 3);
          if (sol + 4 < h) pleins.push([sol + 4, CARREAU]);
        } else {
          creuser(h + 1, h + 7);                           // le palier de la rue, dégagé
        }
        // l'édicule Guimard : deux mâts verts et l'enseigne, au haut des marches
        if (m === LONG_ESC + 1) {
          const d = Math.round(dl);
          if (s.arche) {
            if (Math.abs(d) === 2 && pasUneRue(cx, cz)) for (let y = h + 1; y <= h + 3; y++) apres.push([y, VERT_METRO]);
            apres.push([h + 4, VERT_METRO]);
            if (d === 0) apres.push([h + 5, JAUNE]);       // le M de l'enseigne
          } else if (s.mat && d === s.mat && pasUneRue(cx, cz)) {
            for (let y = h + 1; y <= h + 3; y++) apres.push([y, VERT_METRO]);
            apres.push([h + 4, JAUNE]);                    // le mât et son M
          }
        }
        // le dos de la trémie, côté bas : la barre verte
        if (ouvert && Math.abs(dl) <= 1.5 && yr + 1 + marcheEn(le - 1) + 3 < h && pasUneRue(cx, cz)) {
          apres.push([h + 1, VERT_METRO]);
        }
      }
      continue;
    }
  }

  if (!vides.length && !pleins.length && !apres.length && !gabarit.length) return false;
  for (const [y0, y1] of vides) for (let y = y0; y <= y1; y++) poser(y, BLOCK.AIR);
  const dansLeVide = (y) => vides.some(([a, b]) => y >= a && y <= b);
  for (const [y, id] of pleins) if (!dansLeVide(y)) poser(y, id);
  for (const [y, id] of apres) poser(y, id);
  for (const [y0, y1] of gabarit) for (let y = y0; y <= y1; y++) poser(y, BLOCK.AIR);
  return true;
}
