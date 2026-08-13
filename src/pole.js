// Le pôle Nord.
//
// Un trésor caché : aucun panneau n'y mène, aucun nom ne l'annonce sur la
// carte tant qu'on ne s'en est pas approché. Il faut voler droit vers le nord,
// bien au-delà de la dernière ville, jusqu'à ce que la mer gèle — et il est là.
//
// Tout y est de notre invention : la maison rouge et son toit enneigé, la
// grande fabrique de jouets et ses cheminées, l'étable des rennes, le traîneau
// prêt à partir, et les lutins qui s'affairent entre les deux. Aucun
// personnage sous droits, aucune marque : un Père Noël de conte, celui qu'on
// dessine à l'école.

import { BLOCK, DECOR_START } from './blocks.js';

const uni = (couleur) => DECOR_START + couleur * 10;

const ROUGE = uni(0);
const ROUGE_SOMBRE = uni(18);
const VERT_SAPIN = uni(5);
const VERT_LUTIN = uni(6);
const BLANC = uni(27);
const BOIS = BLOCK.DARKPLANK;
const PLANCHE = BLOCK.PLANK;
const OR = BLOCK.GOLD;
const GLACE = BLOCK.ICE;
const NEIGE = BLOCK.SNOW;
const VERRE = BLOCK.GLASS;
const BRIQUE = BLOCK.BRICK;
const PIERRE = BLOCK.STONEBRICK;

// Tout au nord, très loin de tout : la traversée fait partie du secret. Le
// rayon est large — c'est une banquise, pas un village.
export const POLE = { name: 'Pôle Nord', x: 40, z: -690, r: 60 };

export function buildPole(poser) {
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

  // Une maison : murs, toit à deux pentes, fenêtres éclairées et cheminée.
  function maison(cx, cz, demi, prof, h, mur, toit) {
    vider(cx - demi - 1, cx + demi + 1, 0, h + demi + 2, cz - prof, cz + prof);
    bloc(cx - demi, cx + demi, 0, h, cz - prof, cz + prof, mur);
    vider(cx - demi + 1, cx + demi - 1, 0, h, cz - prof + 1, cz + prof - 1);
    // le toit, une pente de chaque côté
    for (let k = 0; k <= demi; k++) {
      dalle(cx - demi + k, cx - demi + k, cz - prof - 1, cz + prof + 1, h + k, toit);
      dalle(cx + demi - k, cx + demi - k, cz - prof - 1, cz + prof + 1, h + k, toit);
      if (k > 0) {
        dalle(cx - demi + k + 1, cx + demi - k - 1, cz - prof, cz + prof, h + k, BLOCK.AIR);
      }
    }
    dalle(cx - 1, cx + 1, cz - prof, cz + prof, h + demi, toit);
    // les fenêtres, toujours allumées
    for (let z = cz - prof + 2; z <= cz + prof - 2; z += 3) {
      set(cx - demi, 2, z, VERRE); set(cx + demi, 2, z, VERRE);
    }
    // la porte, côté sud
    vider(cx, cx, 0, 1, cz + prof, cz + prof);
  }

  const cheminee = (cx, cz, base, haut) => {
    for (let y = base; y <= haut; y++) {
      for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(cx + dx, y, cz + dz, BRIQUE);
    }
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(cx + dx, haut + 1, cz + dz, BLOCK.AIR);
  };

  // ================= LA BANQUISE =================
  // Une plaque de glace et de neige, avec quelques crevasses d'eau libre.
  for (let dx = -60; dx <= 60; dx++) {
    for (let dz = -60; dz <= 60; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > 58) continue;
      const craquelure = Math.abs(Math.sin(dx * 0.17 + dz * 0.09) + Math.sin(dz * 0.21 - dx * 0.13));
      if (d > 30 && craquelure < 0.12) { set(dx, -1, dz, BLOCK.WATER); continue; }
      set(dx, -1, dz, d > 44 || craquelure < 0.35 ? GLACE : NEIGE);
    }
  }

  // ================= LA MAISON DU PÈRE NOËL =================
  // Rouge, trapue, au centre, avec sa grande cheminée. On la voit de loin,
  // c'est le seul point de couleur sur toute la banquise.
  maison(-14, 0, 6, 8, 5, ROUGE, ROUGE_SOMBRE);
  cheminee(-11, -5, 0, 14);
  // le perron et le sapin de la porte
  dalle(-16, -12, 9, 11, -1, PLANCHE);
  for (let y = 0; y <= 4; y++) set(-18, y, 10, BOIS);
  for (let y = 2; y <= 6; y++) {
    const r = 6 - y;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) + Math.abs(dz) <= r) set(-18 + dx, y, 10 + dz, VERT_SAPIN);
      }
    }
  }
  set(-18, 7, 10, OR);   // l'étoile

  // ================= LA FABRIQUE DE JOUETS =================
  // La grande halle, à l'est : deux fois plus longue que la maison, un toit de
  // verre pour que les lutins y voient clair, et trois cheminées qui fument.
  const FX = 16, FZ = 0;
  vider(FX - 13, FX + 13, 0, 16, FZ - 16, FZ + 16);
  bloc(FX - 12, FX + 12, 0, 9, FZ - 15, FZ + 15, PIERRE);
  vider(FX - 11, FX + 11, 0, 8, FZ - 14, FZ + 14);
  dalle(FX - 12, FX + 12, FZ - 15, FZ + 15, -1, PLANCHE);
  // la verrière : une rangée de verre sur deux, tout le long du toit
  for (let x = FX - 12; x <= FX + 12; x++) {
    for (let z = FZ - 15; z <= FZ + 15; z++) {
      set(x, 10, z, (x + FX) % 3 === 0 ? VERRE : PIERRE);
    }
  }
  // les fenêtres en bandeau, et les grandes portes
  for (let z = FZ - 13; z <= FZ + 13; z += 2) {
    set(FX - 12, 3, z, VERRE); set(FX + 12, 3, z, VERRE);
    set(FX - 12, 6, z, VERRE); set(FX + 12, 6, z, VERRE);
  }
  vider(FX - 3, FX + 3, 0, 4, FZ - 15, FZ - 15);
  for (let x = FX - 4; x <= FX + 4; x++) set(x, 5, FZ - 15, ROUGE);
  cheminee(FX - 8, FZ + 6, 10, 18);
  cheminee(FX, FZ + 6, 10, 20);
  cheminee(FX + 7, FZ + 6, 10, 17);

  // ---- l'intérieur de l'usine : ce qu'on vient voir -----------------------
  //
  // La halle était vide : quatre murs, un toit de verre, trois établis perdus
  // dedans. On y met maintenant ce qui fait une fabrique de jouets — une
  // chaîne qui traverse tout le bâtiment, la grande machine à cadeaux qui
  // fume au bout, des étagères pleines, des montagnes de paquets, le sapin
  // de l'atelier et le tri du courrier.

  // La chaîne de montage : un long tapis de fer qui court du nord au sud, et
  // dessus les jouets aux différentes étapes de leur fabrication.
  const JOUETS = [ROUGE, VERT_LUTIN, uni(2), uni(10), uni(16), uni(7)];
  for (let z = FZ - 12; z <= FZ + 12; z++) {
    for (let dx = -1; dx <= 1; dx++) set(FX + dx, 0, z, PIERRE);
    // le rebord du tapis
    set(FX - 2, 0, z, BOIS); set(FX + 2, 0, z, BOIS);
    // un jouet tous les deux blocs, de plus en plus fini vers le sud
    if (z % 2 === 0) {
      const j = JOUETS[((z + 24) / 2) % JOUETS.length];
      set(FX, 1, z, j);
      if (z > FZ) set(FX + 1, 1, z, OR);          // au bout, le paquet est doré
    }
  }

  // La grande machine à cadeaux, au bout de la chaîne : un bloc de fer, un
  // entonnoir, des engrenages dorés et son tuyau de vapeur qui monte au toit.
  bloc(FX - 4, FX + 4, 0, 5, FZ - 15, FZ - 12, PIERRE);
  bloc(FX - 3, FX + 3, 1, 4, FZ - 14, FZ - 13, BOIS);
  for (const dy of [2, 4]) { set(FX - 4, dy, FZ - 13, OR); set(FX + 4, dy, FZ - 13, OR); }
  set(FX, 6, FZ - 13, OR);                         // l'entonnoir
  for (let y = 6; y <= 9; y++) set(FX - 2, y, FZ - 14, PIERRE);   // le tuyau
  for (let y = 1; y <= 4; y++) set(FX, y, FZ - 12, VERRE);        // le hublot

  // Les établis, de part et d'autre de la chaîne, avec leurs outils et leurs
  // pièces détachées.
  for (let z = FZ - 10; z <= FZ + 10; z += 4) {
    for (const x of [FX - 7, FX + 7]) {
      bloc(x - 2, x + 2, 0, 0, z, z, BOIS);
      set(x - 1, 1, z, JOUETS[(z + 40) % JOUETS.length]);
      set(x + 1, 1, z, JOUETS[(z + 41) % JOUETS.length]);
      set(x, 1, z, BLANC);                          // le pot à outils
    }
  }

  // Les étagères contre les murs : des rangées de jouets finis, du sol au
  // plafond. C'est ce qui donne le sentiment qu'il y en a des milliers.
  for (const x of [FX - 11, FX + 11]) {
    for (let z = FZ - 13; z <= FZ + 13; z++) {
      for (let y = 0; y <= 6; y += 2) {
        set(x, y, z, BOIS);
        if (y < 6) set(x, y + 1, z, JOUETS[(z * 3 + y) % JOUETS.length]);
      }
    }
  }

  // Les montagnes de cadeaux emballés, près de la grande porte : des paquets
  // colorés avec leur ruban doré, empilés en pyramides.
  for (const [px, pz] of [[FX - 7, FZ + 12], [FX + 7, FZ + 12], [FX, FZ + 13]]) {
    for (let y = 0; y <= 2; y++) {
      const r = 2 - y;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          const paquet = JOUETS[(px + pz + dx + dz + y) % JOUETS.length];
          set(px + dx, y, pz + dz, (dx === 0 || dz === 0) && y === r ? OR : paquet);
        }
      }
    }
  }

  // Le sapin de l'atelier, au milieu de la halle : les lutins ont bien le
  // droit d'avoir le leur.
  for (let y = 0; y <= 1; y++) set(FX + 6, y, FZ - 6, BOIS);
  for (let y = 2; y <= 6; y++) {
    const r = 6 - y;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > r) continue;
        const boule = (dx + dz + y) % 5 === 0;
        set(FX + 6 + dx, y, FZ - 6 + dz, boule ? ROUGE : VERT_SAPIN);
      }
    }
  }
  set(FX + 6, 7, FZ - 6, OR);

  // Le tri du courrier : les sacs de lettres des enfants, et la table où on
  // les lit.
  for (const [sx, sz] of [[FX - 8, FZ + 8], [FX - 9, FZ + 9], [FX - 7, FZ + 9]]) {
    set(sx, 0, sz, BLANC); set(sx, 1, sz, BLANC);
  }
  bloc(FX - 9, FX - 6, 0, 0, FZ + 6, FZ + 6, BOIS);
  set(FX - 8, 1, FZ + 6, BLANC);                    // une lettre ouverte

  // Les guirlandes du plafond : une rangée de boules rouges et dorées d'un
  // bout à l'autre de la halle.
  for (let z = FZ - 13; z <= FZ + 13; z += 3) {
    set(FX - 5, 8, z, z % 2 ? ROUGE : OR);
    set(FX + 5, 8, z, z % 2 ? OR : ROUGE);
  }

  // ================= L'ÉTABLE DES RENNES =================
  // Au nord, ouverte sur la piste d'envol : neuf stalles, une par renne.
  const EX = -2, EZ = -26;
  vider(EX - 12, EX + 12, 0, 9, EZ - 6, EZ + 6);
  bloc(EX - 11, EX + 11, 0, 5, EZ - 5, EZ + 5, BOIS);
  vider(EX - 10, EX + 10, 0, 4, EZ - 4, EZ + 4);
  for (let k = 0; k <= 3; k++) {
    dalle(EX - 11 + k, EX + 11 - k, EZ - 6, EZ + 6, 6 + k, ROUGE_SOMBRE);
  }
  dalle(EX - 11, EX + 11, EZ + 5, EZ + 5, 0, BLOCK.AIR);   // la façade ouverte
  bloc(EX - 11, EX + 11, 1, 4, EZ + 5, EZ + 5, BLOCK.AIR);
  // les stalles, le foin — et les rennes dedans, ce qui manquait le plus :
  // une étable sans rennes n'est qu'un hangar.
  for (let x = EX - 9; x <= EX + 9; x += 5) {
    for (let y = 0; y <= 2; y++) set(x, y, EZ + 2, PLANCHE);
    set(x - 2, 0, EZ - 3, BLOCK.LEAVES);
  }
  dalle(EX - 10, EX + 10, EZ - 4, EZ + 4, -1, PLANCHE);

  // Un renne : quatre pattes, un corps brun, une tête claire et surtout des
  // BOIS — c'est à eux qu'un enfant le reconnaît du premier coup d'œil.
  const renne = (rx, rz, nezRouge) => {
    const BRUN = uni(17), BRUN_CLAIR = uni(19);
    for (const [dx, dz] of [[0, 0], [2, 0], [0, 1], [2, 1]]) set(rx + dx, 0, rz + dz, uni(18));  // les pattes
    for (let dx = 0; dx <= 2; dx++) for (let dz = 0; dz <= 1; dz++) set(rx + dx, 1, rz + dz, BRUN);
    set(rx + 3, 1, rz, BRUN_CLAIR); set(rx + 3, 1, rz + 1, BRUN_CLAIR);   // l'encolure
    set(rx + 4, 2, rz, BRUN_CLAIR);                                        // la tête
    set(rx + 5, 2, rz, nezRouge ? ROUGE : BRUN_CLAIR);                     // le museau
    // les bois, en fourche
    for (const dz of [0, 1]) { set(rx + 4, 3, rz + dz - (dz ? 0 : 0), BOIS); }
    set(rx + 4, 4, rz, BOIS); set(rx + 3, 4, rz, BOIS); set(rx + 5, 4, rz, BOIS);
    set(rx + 5, 4, rz + 1, BOIS); set(rx + 3, 4, rz + 1, BOIS);
  };
  // Huit rennes dans leurs stalles, et le neuvième au nez rouge devant.
  for (let i = 0; i < 4; i++) {
    renne(EX - 9 + i * 5, EZ - 2, false);
    renne(EX - 9 + i * 5, EZ + 1, false);
  }

  // ================= LE TRAÎNEAU =================
  // Devant l'étable, tourné vers le sud, chargé de sa hotte.
  const TX = 4, TZ = -16;
  // La coque, rouge et or, avec son dossier haut à l'arrière
  for (let x = TX - 4; x <= TX + 4; x++) {
    set(x, 0, TZ - 1, ROUGE); set(x, 0, TZ + 1, ROUGE);
    set(x, 1, TZ - 1, ROUGE_SOMBRE); set(x, 1, TZ + 1, ROUGE_SOMBRE);
    set(x, 0, TZ, ROUGE);
  }
  for (let dz = -1; dz <= 1; dz++) { set(TX + 4, 2, TZ + dz, ROUGE_SOMBRE); set(TX + 4, 3, TZ + dz, OR); }
  // Les patins recourbés : deux lames dorées qui remontent à l'avant. C'est
  // cette courbe qui fait qu'on lit « traîneau » et pas « caisse ».
  for (const dz of [-2, 2]) {
    for (let x = TX - 5; x <= TX + 4; x++) set(x, -1, TZ + dz, OR);
    set(TX - 6, 0, TZ + dz, OR);
    set(TX - 6, 1, TZ + dz, OR);
  }
  // Le siège, et la hotte débordante de cadeaux
  bloc(TX + 2, TX + 3, 1, 1, TZ - 1, TZ + 1, BOIS);
  bloc(TX - 2, TX + 1, 1, 2, TZ - 1, TZ + 1, BOIS);
  for (const [gx, gz, c] of [[TX - 2, TZ, ROUGE], [TX - 1, TZ - 1, VERT_LUTIN],
    [TX - 1, TZ + 1, uni(2)], [TX, TZ, uni(10)], [TX + 1, TZ - 1, uni(16)]]) {
    set(gx, 3, gz, c);
    set(gx, 4, gz, OR);                                    // le ruban
  }
  // Les traits, et l'attelage : deux rennes devant, dont celui au nez rouge
  for (let z = TZ - 2; z >= TZ - 7; z--) { set(TX - 5, 0, z, BOIS); set(TX + 3, 0, z, BOIS); }
  renne(TX - 6, TZ - 11, true);
  renne(TX + 1, TZ - 11, false);

  // ================= LA PISTE D'ENVOL =================
  // Une allée de glace bordée de lanternes, plein sud : c'est par là qu'ils
  // partent le soir du 24.
  for (let z = -14; z <= 34; z++) {
    for (let dx = -3; dx <= 3; dx++) set(4 + dx, -1, z, GLACE);
    if (z % 6 === 0) {
      for (const dx of [-4, 4]) {
        for (let y = 0; y <= 2; y++) set(4 + dx, y, z, BOIS);
        set(4 + dx, 3, z, OR);
      }
    }
  }

  // ================= LE VILLAGE DES LUTINS =================
  // Six petites maisons vertes en arc de cercle, autour de la place.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const mx = Math.round(Math.cos(a) * 34) - 4;
    const mz = Math.round(Math.sin(a) * 34) + 6;
    maison(mx, mz, 3, 3, 3, i % 2 ? VERT_LUTIN : ROUGE, BOIS);
    set(mx, 8, mz, OR);
  }

  // ================= LE MÂT DU PÔLE =================
  // Le poteau rouge et blanc avec sa boule dorée : le point exact du pôle, et
  // le repère qu'on cherche des yeux en arrivant.
  for (let y = 0; y <= 11; y++) set(0, y, 20, y % 2 ? BLANC : ROUGE);
  set(0, 12, 20, OR);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(dx, 11, 20 + dz, GLACE);

  // quelques sapins enneigés, épars, pour que la banquise ne soit pas nue
  for (let i = 0; i < 26; i++) {
    const a = i * 2.399;                       // l'angle d'or : ça se répartit tout seul
    const d = 22 + (i % 7) * 5;
    const sx = Math.round(Math.cos(a) * d), sz = Math.round(Math.sin(a) * d);
    if (Math.hypot(sx - FX, sz - FZ) < 20 || Math.hypot(sx + 14, sz) < 16) continue;
    if (Math.hypot(sx - 4, sz) < 8) continue;   // pas sur la piste
    for (let y = 0; y <= 3; y++) set(sx, y, sz, BOIS);
    for (let y = 2; y <= 5; y++) {
      const r = 5 - y;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) + Math.abs(dz) <= r) set(sx + dx, y, sz + dz, VERT_SAPIN);
        }
      }
    }
    set(sx, 6, sz, NEIGE);
  }
}
