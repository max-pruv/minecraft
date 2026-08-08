// Le circuit de Formule 1 et son paddock.
//
// Le tracé n'est pas un ovale : ce qui fait qu'on reconnaît un circuit, ce sont
// les enchaînements — une longue ligne droite, un gros freinage, une épingle,
// deux virages rapides. Il est défini une seule fois, sous forme de courbe
// paramétrée, et sert à la fois à poser l'asphalte, les vibreurs, les
// dégagements, et à faire tourner les voitures. Les deux ne peuvent donc pas
// diverger.

import { BLOCK, DECOR_START } from './blocks.js';

const uni = (couleur) => DECOR_START + couleur * 10;

const ASPHALTE = uni(25);
const VIBREUR_R = uni(0);
const VIBREUR_B = uni(27);
const DEGAGEMENT = uni(20);     // sable : les bacs à graviers
const HERBE = BLOCK.GRASS;
const BETON = uni(23);
const GRIS = uni(24);
const BLANC = uni(27);
const NOIR = uni(26);
const ROUGE = uni(0);
const BLEU = uni(10);
const JAUNE = uni(2);
const VERT = uni(5);
const VERRE = BLOCK.GLASS;

const LARGEUR = 7;              // demi-largeur de la piste, en blocs

// Le tracé, en coordonnées relatives au centre du site. Une courbe fermée
// dessinée à la main, en rayon variable selon l'angle : c'est ce qui donne les
// longues droites et les épingles plutôt qu'un anneau régulier.
export function tracePiste() {
  const pts = [];
  const N = 240;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    // le rayon respire : deux grandes boucles, un resserrement, une épingle
    const r = 46
      + 12 * Math.sin(a)
      - 9 * Math.cos(2 * a)
      + 6 * Math.sin(3 * a + 0.7)
      - 4 * Math.cos(4 * a);
    pts.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, a });
  }
  return pts;
}

// Le même tracé, en coordonnées absolues et à la bonne altitude, pour les
// voitures. La ligne médiane est décalée pour qu'elles ne roulent pas
// exactement sur la corde blanche.
export function traceCourse(centre, sol) {
  return tracePiste().map((p) => ({ x: centre.x + p.x, y: sol + 1.05, z: centre.z + p.z }));
}

export function buildCircuit(poser) {
  const RAYON = 78;
  const set = (x, y, z, id) => {
    if (x * x + z * z > RAYON * RAYON) return;
    poser(x, y + 1, z, id);
  };
  const dalle = (x0, x1, z0, z1, y, id) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, id);
    }
  };
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) dalle(x0, x1, z0, z1, y, id);
  };
  const vider = (x0, x1, y0, y1, z0, z1) => bloc(x0, x1, y0, y1, z0, z1, BLOCK.AIR);

  // --- le sol ---------------------------------------------------------------
  for (let x = -RAYON; x <= RAYON; x++) {
    for (let z = -RAYON; z <= RAYON; z++) {
      if (x * x + z * z <= RAYON * RAYON) set(x, -1, z, HERBE);
    }
  }

  // --- la piste -------------------------------------------------------------
  // On échantillonne le tracé très finement et on peint une bande
  // perpendiculaire à la marche : asphalte au milieu, vibreurs aux bords,
  // dégagement sableux au-delà des virages.
  const brut = tracePiste();
  const N = 2400;
  const point = (t) => {
    const f = (t % 1 + 1) % 1;
    const i = f * brut.length;
    const a = brut[Math.floor(i) % brut.length];
    const b = brut[(Math.floor(i) + 1) % brut.length];
    const u = i - Math.floor(i);
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u };
  };

  for (let k = 0; k < N; k++) {
    const p = point(k / N);
    const q = point((k + 1) / N);
    const dx = q.x - p.x, dz = q.z - p.z;
    const L = Math.hypot(dx, dz) || 1;
    const nx = -dz / L, nz = dx / L;          // la normale à la trajectoire
    for (let d = -LARGEUR - 3; d <= LARGEUR + 3; d++) {
      const x = Math.round(p.x + nx * d), z = Math.round(p.z + nz * d);
      const ad = Math.abs(d);
      let id;
      if (ad <= LARGEUR - 1) id = ASPHALTE;
      else if (ad === LARGEUR) id = BLANC;                     // la corde
      else if (ad === LARGEUR + 1) id = (k % 8 < 4) ? VIBREUR_R : VIBREUR_B;
      else id = DEGAGEMENT;
      set(x, -1, z, id);
    }
    // la ligne médiane pointillée, sur les portions rapides
    if (k % 16 < 6) set(Math.round(p.x), -1, Math.round(p.z), NOIR);
  }

  // La ligne de départ, en damier, sur la portion nord.
  {
    const p = point(0), q = point(0.004);
    const dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz) || 1;
    const nx = -dz / L, nz = dx / L;
    for (let d = -LARGEUR; d <= LARGEUR; d++) {
      for (let e = 0; e < 3; e++) {
        const x = Math.round(p.x + nx * d - dz / L * 0), z = Math.round(p.z + nz * d);
        set(x + Math.round((dx / L) * e), -1, z + Math.round((dz / L) * e),
          ((d + e) % 2 === 0) ? BLANC : NOIR);
      }
    }
    // les emplacements de grille, en quinconce derrière la ligne
    for (let g = 1; g <= 10; g++) {
      const gp = point(-g * 0.011);
      const gq = point(-g * 0.011 + 0.004);
      const gdx = gq.x - gp.x, gdz = gq.z - gp.z, GL = Math.hypot(gdx, gdz) || 1;
      const gnx = -gdz / GL, gnz = gdx / GL;
      const cote = g % 2 ? -3 : 3;
      for (let d = cote - 1; d <= cote + 1; d++) {
        set(Math.round(gp.x + gnx * d), -1, Math.round(gp.z + gnz * d), BLANC);
      }
    }
  }

  // --- la voie des stands et le paddock -------------------------------------
  // Tout le complexe est à l'INTÉRIEUR de la boucle, et s'éloigne de la piste
  // en allant vers -z : voie des stands au plus près, puis les garages, puis le
  // bâtiment, puis le podium au fond.
  //
  // Le sens compte. Bâti dans l'autre sens, le paddock partait vers la piste et
  // la ligne droite passait sous son toit — les monoplaces roulaient à
  // l'intérieur du bâtiment. La contrainte est simple : sur x ∈ [-6, 44] le
  // bord sud de la piste ne descend jamais sous z = 32, donc rien ici ne doit
  // dépasser z = 22. Le test du circuit vérifie que le ruban reste dégagé.
  const SX = -6, SZ = 22, LONG = 50;   // coin piste-est du complexe
  // Le béton du paddock ne déborde ni à l'est ni au nord au-delà de la voie des
  // stands : au-delà, il passait sous la trajectoire des monoplaces.
  dalle(SX - 12, SX + LONG, SZ - 34, SZ - 1, -1, BETON);
  // la voie des stands, avec sa limite de vitesse
  dalle(SX, SX + LONG, SZ - 5, SZ, -1, ASPHALTE);
  for (let x = SX; x <= SX + LONG; x++) set(x, -1, SZ, BLANC);
  for (let x = SX; x <= SX + LONG; x += 6) { set(x, -1, SZ - 5, JAUNE); set(x + 1, -1, SZ - 5, JAUNE); }

  // Dix garages alignés, rideau relevé, la couleur de l'écurie sur le fronton.
  for (let g = 0; g < 10; g++) {
    const gx = SX + 1 + g * 5;
    bloc(gx, gx + 4, 0, 5, SZ - 13, SZ - 6, BETON);
    vider(gx + 1, gx + 3, 0, 4, SZ - 12, SZ - 7);
    vider(gx + 1, gx + 3, 0, 3, SZ - 6, SZ - 6);          // le rideau relevé
    dalle(gx, gx + 4, SZ - 13, SZ - 6, 6, GRIS);
    const teinte = [ROUGE, BLEU, JAUNE, VERT, BLANC, uni(1), uni(12), uni(6), uni(15), GRIS][g];
    for (let x = gx; x <= gx + 4; x++) set(x, 5, SZ - 6, teinte);
    // le matériel devant le stand : jeux de pneus et chariot
    for (let k = 0; k < 3; k++) set(gx + 1 + (k % 2), 0, SZ - 5 + (k > 1 ? 1 : 0), NOIR);
  }

  // Le bâtiment du paddock, à l'étage, avec sa terrasse vitrée sur la piste.
  bloc(SX, SX + LONG, 7, 11, SZ - 20, SZ - 7, BETON);
  vider(SX + 1, SX + LONG - 1, 7, 10, SZ - 19, SZ - 8);
  for (let x = SX + 2; x <= SX + LONG - 2; x += 2) { set(x, 9, SZ - 7, VERRE); set(x, 10, SZ - 7, VERRE); }
  dalle(SX - 1, SX + LONG + 1, SZ - 21, SZ - 6, 12, GRIS);
  // les drapeaux au-dessus de la ligne des stands
  for (let x = SX + 4; x <= SX + LONG - 4; x += 10) {
    for (let y = 13; y <= 16; y++) set(x, y, SZ - 8, GRIS);
    for (let y = 15; y <= 16; y++) { set(x, y, SZ - 9, ROUGE); set(x, y, SZ - 10, BLANC); }
  }

  // Le podium, au fond du paddock.
  dalle(SX + 16, SX + 26, SZ - 30, SZ - 22, -1, BETON);
  for (const [dx, h] of [[17, 1], [20, 2], [23, 1]]) {
    bloc(SX + dx, SX + dx + 2, 0, h, SZ - 27, SZ - 25, h === 2 ? JAUNE : GRIS);
  }
  for (let x = SX + 16; x <= SX + 26; x++) { for (let y = 4; y <= 6; y++) set(x, y, SZ - 30, ROUGE); }
  for (const dx of [16, 26]) for (let y = 0; y <= 6; y++) set(SX + dx, y, SZ - 30, GRIS);

  // --- les tribunes ---------------------------------------------------------
  // Deux gradins face à la piste : des marches successives, avec les rangées
  // de sièges alternées pour qu'on lise les places.
  function tribune(cx, cz, larg, sens) {
    for (let k = 0; k < 7; k++) {
      const z = cz + sens * (k + 2);
      dalle(cx - larg, cx + larg, z, z, k, BETON);
      for (let x = cx - larg + 1; x < cx + larg; x += 2) {
        set(x, k + 1, z, [ROUGE, BLANC, BLEU][(k + x) % 3 < 0 ? 0 : (k + x + 30) % 3]);
      }
    }
    // le toit et ses poteaux
    dalle(cx - larg - 1, cx + larg + 1, cz + sens * 2, cz + sens * 9, 10, GRIS);
    for (let x = cx - larg; x <= cx + larg; x += 6) {
      for (let y = 7; y <= 9; y++) set(x, y, cz + sens * 9, GRIS);
    }
  }
  // Les deux gradins sont DEHORS, au nord et au sud de la boucle. Le second
  // était auparavant posé à l'ouest, à z ≈ 0 — c'est-à-dire exactement là où la
  // piste remonte : les spectateurs étaient assis en travers du bitume.
  tribune(0, -56, 22, -1);
  tribune(20, 56, 12, 1);

  // --- les abords -----------------------------------------------------------
  // La tour de chronométrage, à l'entrée de la voie des stands — côté ouest,
  // pas côté est : à l'est la piste revient beaucoup plus près qu'il n'y paraît
  // sur un plan, et la casquette de la tour surplombait le bitume.
  bloc(SX - 9, SX - 4, 0, 16, SZ - 9, SZ - 4, BETON);
  vider(SX - 8, SX - 5, 0, 15, SZ - 8, SZ - 5);
  for (let y = 4; y <= 14; y += 3) {
    for (let x = SX - 8; x <= SX - 5; x++) set(x, y, SZ - 4, VERRE);
  }
  dalle(SX - 10, SX - 3, SZ - 10, SZ - 3, 17, GRIS);
  for (let x = SX - 9; x <= SX - 4; x++) set(x, 18, SZ - 7, ROUGE);

  // Le parking des spectateurs, hors de la boucle, au nord-ouest. Il était
  // seize blocs plus à l'est : les voitures garées mordaient sur la piste, que
  // le plan fait paraître plus loin qu'elle ne l'est réellement à cet endroit.
  dalle(-72, -56, -28, -12, -1, GRIS);
  for (let x = -70; x <= -58; x += 4) {
    for (let z = -26; z <= -14; z += 6) {
      bloc(x, x + 2, 0, 1, z, z + 3, [uni(0), uni(10), uni(27), uni(5), uni(2)][(x + z + 100) % 5]);
    }
  }

  // les barrières de sécurité, le long des dégagements les plus exposés
  for (let k = 0; k < N; k += 20) {
    const p = point(k / N), q = point((k + 1) / N);
    const dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz) || 1;
    const nx = -dz / L, nz = dx / L;
    for (const s of [-1, 1]) {
      const bx = Math.round(p.x + nx * s * (LARGEUR + 4));
      const bz = Math.round(p.z + nz * s * (LARGEUR + 4));
      set(bx, 0, bz, (k / 20) % 2 ? ROUGE : BLANC);
      set(bx, 1, bz, GRIS);
    }
  }
}
