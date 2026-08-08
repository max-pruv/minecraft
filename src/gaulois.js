// Le village gaulois et le camp romain qui le surveille.
//
// Le village est bâti d'après ce qu'on voit dans les albums : un cercle de
// huttes rondes à toit de chaume, serrées derrière une palissade de pieux
// pointus, une seule porte, la hutte du chef surélevée, celle du druide avec
// son chaudron sur le feu, l'atelier du forgeron, l'étal du poissonnier, et
// des menhirs un peu partout — dont un tout prêt à être livré. Le tout au bord
// de la mer, comme en Armorique.
//
// À l'est, le camp romain : un castrum carré, palissade et fossé, quatre tours
// d'angle, deux portes opposées, les tentes rouges alignées au cordeau et le
// pavillon du général au centre. C'est le contraste qui fait la scène — le
// désordre rond des Gaulois contre la géométrie romaine.

import { BLOCK, DECOR_START } from './blocks.js';

const uni = (couleur) => DECOR_START + couleur * 10;

const TORCHIS = uni(28);       // crème : le mélange de terre et de paille
const CHAUME = uni(20);        // sable : les toits de roseau
const CHAUME_VIEUX = uni(22);  // kaki : celui qu'on n'a pas refait
const BOIS = BLOCK.LOG;
const POUTRE = uni(18);        // chocolat
const PIERRE = uni(24);
const ROUGE = uni(0);
const OR = uni(2);
const BLANC = uni(27);
const VERT = uni(5);

export function buildGaulois(poser) {
  // Même convention que l'aéroport : y = -1 est le bloc de surface.
  const set = (x, y, z, id) => poser(x, y + 1, z, id);

  const dalle = (x0, x1, z0, z1, y, id) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, id);
    }
  };
  const bloc = (x0, x1, y0, y1, z0, z1, id) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) dalle(x0, x1, z0, z1, y, id);
  };
  const anneau = (cx, cz, rInt, rExt, y, id) => {
    for (let dx = -Math.ceil(rExt); dx <= Math.ceil(rExt); dx++) {
      for (let dz = -Math.ceil(rExt); dz <= Math.ceil(rExt); dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= rExt && d >= rInt) set(cx + dx, y, cz + dz, id);
      }
    }
  };
  const disque = (cx, cz, r, y, id) => anneau(cx, cz, 0, r, y, id);

  // --- une hutte gauloise ---------------------------------------------------
  // Murs ronds en torchis sur solin de pierre, toit de chaume conique. La
  // rondeur est ce qui distingue immédiatement le village du camp romain.
  function hutte(cx, cz, r, hMur, chaume = CHAUME, porteVers = 'sud') {
    anneau(cx, cz, r - 1, r, -1, PIERRE);
    for (let y = 0; y < hMur; y++) anneau(cx, cz, r - 1, r, y, TORCHIS);
    disque(cx, cz, r - 1, -1, POUTRE);              // le plancher de terre battue
    // toit conique : chaque assise se resserre
    for (let k = 0; k <= r + 1; k++) {
      const rr = r + 0.6 - k * 0.85;
      if (rr < 0.4) { set(cx, hMur + k, cz, POUTRE); break; }
      anneau(cx, cz, 0, rr, hMur + k, k === 0 ? chaume : chaume);
    }
    // la porte, percée dans le mur
    const [dx, dz] = { sud: [0, 1], nord: [0, -1], est: [1, 0], ouest: [-1, 0] }[porteVers];
    for (let y = 0; y < 2; y++) {
      set(cx + dx * r, y, cz + dz * r, BLOCK.AIR);
      set(cx + dx * (r - 1), y, cz + dz * (r - 1), BLOCK.AIR);
    }
    // et une fenêtre en face
    set(cx - dx * r, 1, cz - dz * r, BLOCK.GLASS);
  }

  const menhir = (x, z, h = 4) => {
    for (let y = 0; y < h; y++) {
      set(x, y, z, PIERRE);
      if (y < h - 1) { set(x + 1, y, z, PIERRE); set(x, y, z + 1, PIERRE); set(x + 1, y, z + 1, PIERRE); }
    }
  };

  // ================= LE VILLAGE GAULOIS =================
  const VX = -22, VZ = 0, R_VILLAGE = 20;

  // la clairière, tondue autour du village
  disque(VX, VZ, R_VILLAGE + 5, -1, BLOCK.GRASS);

  // La palissade : des pieux jointifs, taillés en pointe. C'est elle qu'on
  // reconnaît de loin, bien avant les toits.
  for (let a = 0; a < 360; a++) {
    const rad = (a * Math.PI) / 180;
    const x = Math.round(VX + Math.sin(rad) * R_VILLAGE);
    const z = Math.round(VZ + Math.cos(rad) * R_VILLAGE);
    // la porte, plein sud
    if (Math.abs(x - VX) <= 2 && z > VZ + R_VILLAGE - 2) continue;
    for (let y = 0; y < 4; y++) set(x, y, z, BOIS);
    set(x, 4, z, POUTRE);          // la pointe
  }
  // le portail et son linteau
  for (let y = 0; y < 5; y++) { set(VX - 3, y, VZ + R_VILLAGE, BOIS); set(VX + 3, y, VZ + R_VILLAGE, BOIS); }
  for (let x = VX - 3; x <= VX + 3; x++) set(x, 5, VZ + R_VILLAGE, POUTRE);
  for (let x = VX - 2; x <= VX + 2; x++) set(x, 4, VZ + R_VILLAGE, BOIS);
  // le chemin qui mène à la porte
  for (let z = VZ + R_VILLAGE; z <= VZ + R_VILLAGE + 12; z++) dalle(VX - 2, VX + 2, z, z, -1, POUTRE);

  // la place centrale, en terre battue
  disque(VX, VZ, 6, -1, POUTRE);

  // Les huttes, en couronne autour de la place. Les tailles diffèrent : un
  // village qui s'est fait tout seul n'a pas deux maisons identiques.
  const HUTTES = [
    // [angle°, distance, rayon, hauteur de mur, chaume]
    [10, 14, 5, 4, CHAUME], [55, 15, 4, 3, CHAUME_VIEUX], [100, 14, 4, 3, CHAUME],
    [145, 15, 5, 4, CHAUME_VIEUX], [190, 14, 4, 3, CHAUME], [235, 15, 4, 4, CHAUME],
    [280, 14, 5, 3, CHAUME_VIEUX], [325, 15, 4, 3, CHAUME],
  ];
  for (const [ang, d, r, h, ch] of HUTTES) {
    const rad = (ang * Math.PI) / 180;
    const hx = Math.round(VX + Math.sin(rad) * d);
    const hz = Math.round(VZ + Math.cos(rad) * d);
    // la porte regarde toujours la place
    const vers = Math.abs(hx - VX) > Math.abs(hz - VZ)
      ? (hx > VX ? 'ouest' : 'est') : (hz > VZ ? 'nord' : 'sud');
    hutte(hx, hz, r, h, ch, vers);
  }

  // La hutte du chef, plus grande et surélevée sur une plateforme : dans les
  // albums, on le porte partout sur son pavois, et sa maison domine la place.
  disque(VX, VZ - 13, 7, -1, PIERRE);
  disque(VX, VZ - 13, 7, 0, POUTRE);
  hutte(VX, VZ - 13, 6, 5, CHAUME, 'sud');
  for (const s of [-1, 1]) {          // deux étendards de part et d'autre
    for (let y = 1; y <= 6; y++) set(VX + s * 7, y, VZ - 7, BOIS);
    for (let y = 4; y <= 6; y++) { set(VX + s * 7, y, VZ - 6, ROUGE); set(VX + s * 7, y, VZ - 5, BLANC); }
  }

  // La hutte du druide, à l'écart, avec son grand chaudron sur le feu.
  hutte(VX - 15, VZ - 12, 5, 4, CHAUME_VIEUX, 'est');
  const CX = VX - 9, CZ = VZ - 12;
  anneau(CX, CZ, 2, 3, -1, PIERRE);              // le foyer
  disque(CX, CZ, 2, -1, uni(1));                 // les braises
  for (let y = 0; y <= 2; y++) anneau(CX, CZ, 2, 3, y, uni(25));   // la panse du chaudron
  disque(CX, CZ, 2, 2, uni(6));                  // la potion, vert émeraude
  for (const s of [-1, 1]) {                     // le trépied
    for (let y = 0; y <= 4; y++) set(CX + s * 4, y, CZ, BOIS);
  }
  for (let x = CX - 4; x <= CX + 4; x++) set(x, 5, CZ, BOIS);
  // le gui et les herbes qui sèchent devant la hutte
  for (let k = 0; k < 5; k++) set(CX - 1 + k, 4, CZ + 4, VERT);

  // L'atelier du forgeron : enclume, four, et des épées en tas.
  const FX = VX + 13, FZ = VZ + 9;
  bloc(FX - 2, FX + 2, 0, 2, FZ - 2, FZ - 2, PIERRE);
  set(FX, 1, FZ - 2, uni(1));                    // la gueule du four, rougeoyante
  set(FX - 1, 0, FZ, uni(25)); set(FX - 1, 1, FZ, uni(25));   // l'enclume
  for (let k = 0; k < 4; k++) set(FX + 1 + (k % 2), 0, FZ + (k >> 1), uni(23));

  // L'étal du poissonnier — dans les albums, c'est toujours de là que part la
  // bagarre. Poissons bien en vue sur le comptoir.
  const PX = VX - 12, PZ = VZ + 10;
  for (let x = PX - 2; x <= PX + 2; x++) { set(x, 0, PZ, POUTRE); set(x, 1, PZ, POUTRE); }
  for (const s of [-2, 2]) for (let y = 0; y <= 3; y++) set(PX + s, y, PZ - 1, BOIS);
  for (let x = PX - 2; x <= PX + 2; x++) set(x, 4, PZ - 1, CHAUME);
  for (let k = 0; k < 3; k++) set(PX - 1 + k, 2, PZ, uni(9));   // les poissons

  // Les menhirs : deux dressés dans le village, un couché prêt à partir, et
  // trois dans la clairière autour.
  menhir(VX + 6, VZ - 4, 5);
  menhir(VX - 6, VZ + 3, 4);
  for (let k = 0; k < 5; k++) { set(VX + 8 + k, 0, VZ + 3, PIERRE); set(VX + 8 + k, 0, VZ + 4, PIERRE); }
  menhir(VX + 26, VZ - 18, 6);
  menhir(VX - 26, VZ + 20, 5);
  menhir(VX + 2, VZ + 30, 4);

  // La grande table du banquet, au milieu de la place : sangliers rôtis et
  // bancs tout autour. Tous les albums finissent là.
  for (let x = VX - 4; x <= VX + 4; x++) { set(x, 0, VZ + 2, POUTRE); set(x, 0, VZ + 3, POUTRE); }
  for (let x = VX - 4; x <= VX + 4; x += 2) { set(x, 0, VZ + 1, BOIS); set(x, 0, VZ + 4, BOIS); }
  for (let k = 0; k < 3; k++) set(VX - 2 + k * 2, 1, VZ + 2, uni(17));   // les sangliers
  // la broche, à côté
  for (const s of [-1, 1]) for (let y = 0; y <= 2; y++) set(VX + 6 + s, y, VZ + 6, BOIS);
  for (let x = VX + 5; x <= VX + 7; x++) set(x, 2, VZ + 6, uni(17));
  disque(VX + 6, VZ + 6, 1, -1, uni(1));

  // ================= LE CAMP ROMAIN =================
  // Un castrum : carré, fossé, palissade, quatre tours d'angle, deux portes.
  const CAX = 30, CAZ = 0, C = 17;   // demi-côté

  dalle(CAX - C - 6, CAX + C + 6, CAZ - C - 6, CAZ + C + 6, -1, BLOCK.GRASS);
  // le fossé, tout autour
  for (let x = CAX - C - 3; x <= CAX + C + 3; x++) {
    for (let z = CAZ - C - 3; z <= CAZ + C + 3; z++) {
      const dehors = Math.abs(x - CAX) > C + 1 || Math.abs(z - CAZ) > C + 1;
      const dedans = Math.abs(x - CAX) <= C && Math.abs(z - CAZ) <= C;
      if (dehors && !dedans) { set(x, -1, z, BLOCK.DIRT); set(x, -2, z, BLOCK.DIRT); }
    }
  }
  // la palissade, sur son talus
  for (let x = CAX - C; x <= CAX + C; x++) {
    for (const z of [CAZ - C, CAZ + C]) {
      if (Math.abs(x - CAX) <= 2) continue;    // les portes nord et sud
      for (let y = 0; y < 4; y++) set(x, y, z, BLOCK.PLANK);
      set(x, 4, z, POUTRE);
    }
  }
  for (let z = CAZ - C; z <= CAZ + C; z++) {
    for (const x of [CAX - C, CAX + C]) {
      for (let y = 0; y < 4; y++) set(x, y, z, BLOCK.PLANK);
      set(x, 4, z, POUTRE);
    }
  }
  // quatre tours d'angle, avec leur plancher de guet
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tx = CAX + sx * C, tz = CAZ + sz * C;
      bloc(tx - 2, tx + 2, 0, 7, tz - 2, tz + 2, BLOCK.PLANK);
      bloc(tx - 1, tx + 1, 0, 6, tz - 1, tz + 1, BLOCK.AIR);
      dalle(tx - 3, tx + 3, tz - 3, tz + 3, 8, POUTRE);
      for (let k = -3; k <= 3; k++) { set(tx + k, 9, tz - 3, BLOCK.PLANK); set(tx + k, 9, tz + 3, BLOCK.PLANK); }
      for (let k = -3; k <= 3; k++) { set(tx - 3, 9, tz + k, BLOCK.PLANK); set(tx + 3, 9, tz + k, BLOCK.PLANK); }
    }
  }
  // les deux portes, encadrées de tours plus basses
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const px = CAX + sx * 3, pz = CAZ + sz * C;
      for (let y = 0; y < 6; y++) { set(px, y, pz, BLOCK.PLANK); }
      set(px, 6, pz, POUTRE);
    }
    for (let x = CAX - 3; x <= CAX + 3; x++) set(x, 6, CAZ + sz * C, POUTRE);
  }

  // La via principalis, la rue centrale pavée qui traverse le camp.
  dalle(CAX - 2, CAX + 2, CAZ - C, CAZ + C, -1, PIERRE);
  dalle(CAX - C, CAX + C, CAZ - 2, CAZ + 2, -1, PIERRE);

  // Le prétoire, la tente du général, au croisement.
  bloc(CAX - 5, CAX + 5, 0, 3, CAZ - 5, CAZ + 5, ROUGE);
  bloc(CAX - 4, CAX + 4, 0, 2, CAZ - 4, CAZ + 4, BLOCK.AIR);
  for (let k = 0; k <= 5; k++) {
    dalle(CAX - 5 + k, CAX + 5 - k, CAZ - 5 + k, CAZ + 5 - k, 4 + k, k === 0 ? BLANC : ROUGE);
  }
  for (let y = 0; y < 2; y++) set(CAX, y, CAZ + 5, BLOCK.AIR);   // l'entrée
  // l'aigle et les étendards, plantés devant
  for (const s of [-1, 1]) {
    for (let y = 0; y <= 6; y++) set(CAX + s * 3, y, CAZ + 7, BLOCK.PLANK);
    for (let y = 4; y <= 6; y++) set(CAX + s * 3, y, CAZ + 8, ROUGE);
    set(CAX + s * 3, 7, CAZ + 7, OR);
  }

  // Les tentes de la troupe : alignées au cordeau, quatre quartiers.
  function tente(tx, tz) {
    bloc(tx, tx + 3, 0, 1, tz, tz + 4, ROUGE);
    bloc(tx + 1, tx + 2, 0, 1, tz + 1, tz + 3, BLOCK.AIR);
    for (let k = 0; k <= 1; k++) dalle(tx + k, tx + 3 - k, tz, tz + 4, 2 + k, ROUGE);
    for (let y = 0; y < 2; y++) set(tx + 1, y, tz + 4, BLOCK.AIR);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
          tente(CAX + sx * (5 + i * 5) - (sx < 0 ? 3 : 0), CAZ + sz * (5 + j * 6) - (sz < 0 ? 4 : 0));
        }
      }
    }
  }

  // Deux catapultes, tournées vers le village — elles ne serviront à rien.
  for (const dz of [-8, 8]) {
    const bx = CAX - C - 5, bz = CAZ + dz;
    bloc(bx, bx + 3, 0, 0, bz, bz + 2, POUTRE);
    for (let y = 1; y <= 3; y++) set(bx + 1, y, bz + 1, BLOCK.PLANK);
    set(bx + 2, 3, bz + 1, PIERRE);
    for (const s of [0, 2]) { set(bx, 0, bz + s, uni(25)); set(bx + 3, 0, bz + s, uni(25)); }
  }

  // La route romaine, bien droite, qui relie le camp au village — et s'arrête
  // net à la lisière : personne n'a jamais réussi à aller plus loin.
  for (let x = VX + 24; x <= CAX - C - 4; x++) {
    dalle(x, x, CAZ - 1, CAZ + 1, -1, PIERRE);
    if (x % 6 === 0) { set(x, -1, CAZ - 2, uni(23)); set(x, -1, CAZ + 2, uni(23)); }
  }
  // la borne milliaire, à mi-chemin
  const BX = Math.round((VX + 24 + CAX - C - 4) / 2);
  for (let y = 0; y <= 2; y++) set(BX, y, CAZ + 3, uni(23));
  set(BX, 3, CAZ + 3, OR);
}
