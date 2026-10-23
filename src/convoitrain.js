// LE TRAIN INTERVILLES (v537) — une motrice, des voitures, et rien qui se
// recouvre.
//
// Max, capture d'iPhone sur le TGV Paris–Lyon : « Those things should never
// happen ». Le convoi était la rame du MÉTRO (`construireRame`) : une caisse
// cylindrique terminée par deux demi-sphères, 8,0 blocs de long (8,7 pour la
// motrice), posée tous les 7,6 blocs. Les bouts arrondis de deux voitures
// voisines se TRAVERSAIENT d'un demi-bloc à chaque attelage, et des cylindres
// gris à bandeau bleu ne se lisaient pas comme un train.
//
// Le dessin est original (invariant 4) et se lit à la silhouette : une motrice
// au NEZ effilé avec son pare-brise et ses phares, des voitures à caisse plate,
// une rangée de FENÊTRES séparées, une bande de livrée, deux bogies à quatre
// roues, et un SOUFFLET entre deux voitures. Tout est fait à l'Atelier, donc
// avec `matiereVivante` : aucune clé de programme neuve (v246), deux appels de
// dessin par voiture comme la rame (le tronc et la porte qui coulisse, v489).
//
// L'ÉCART SE DÉDUIT DES LONGUEURS, IL NE SE RECOPIE PAS. `ECART_TRAIN` est la
// longueur d'une caisse plus ses deux demi-soufflets : deux soufflets voisins
// se touchent, deux caisses jamais. Un témoin de `carteMonde.js` mesure les
// modèles rendus et exige que la queue de l'une s'arrête avant le nez de la
// suivante.
import { Atelier } from './modeles.js';

export const CAISSE = 8;            // la longueur d'une caisse, nez compris pour une motrice
export const SOUFFLET = 0.4;        // ce qui dépasse de chaque bout d'attelage
export const ECART_TRAIN = CAISSE + 2 * SOUFFLET + 0.1;
const LARG = 1.6, Y0 = 0.8, H = 1.7;

// `role` : 'motrice' (nez en −z, en tête), 'queue' (nez en +z, en dernier),
// 'voiture' entre les deux.
export function construireTrain(role = 'voiture', couleur = 0x8c8c94) {
  const a = new Atelier();
  const nez = role === 'motrice' ? -1 : role === 'queue' ? 1 : 0;
  const L = CAISSE, demi = L / 2;
  // La caisse droite : sur une motrice, elle s'arrête où le nez commence.
  const NEZ = 2.6;
  const z0 = nez < 0 ? -demi + NEZ : -demi, z1 = nez > 0 ? demi - NEZ : demi;
  const zc = (z0 + z1) / 2, lc = z1 - z0;
  a.boite(couleur, { p: [0, Y0 + H * 0.45, zc], e: [LARG, H * 0.9, lc] });
  // le toit, bombé
  a.cylindre(couleur, { p: [0, Y0 + H * 0.9, zc], r: [Math.PI / 2, 0, 0], e: [LARG * 0.98, lc, 0.42], haut: 0.5, bas: 0.5, seg: 12, t: 0.92 });
  // la jupe sous la caisse, plus sombre
  a.boite(0x2a2c34, { p: [0, Y0 + 0.05, zc], e: [LARG * 0.94, 0.16, lc] });
  // la bande de livrée, sur toute la longueur droite
  for (const s of [-1, 1]) a.boite(0xf0f0ea, { p: [s * LARG * 0.5, Y0 + 0.32, zc], e: [0.05, 0.16, lc * 0.995] });
  // LE NEZ : un tronc de cône couché, aplati, qui s'effile vers l'avant — la
  // silhouette qui dit « train à grande vitesse », pas une capsule.
  if (nez) {
    const zn = nez * (demi - NEZ / 2);
    a.cylindre(couleur, {
      p: [0, Y0 + H * 0.42, zn], r: [nez * Math.PI / 2, 0, 0], e: [LARG, NEZ, H * 0.84],
      haut: 0.14, bas: 0.5, seg: 14,
    });
    a.boite(0x2a2c34, { p: [0, Y0 + 0.08, nez * (demi - NEZ * 0.75)], e: [LARG * 0.86, 0.18, NEZ * 0.5] });
    // le pare-brise, incliné sur le dessus du nez
    a.boite(0x1c2a3a, {
      p: [0, Y0 + H * 0.74, nez * (demi - NEZ * 0.82 + 0.35)], r: [nez * 0.5, 0, 0], e: [LARG * 0.74, 0.06, 1.1],
    });
    // les phares, au bout du nez
    for (const s of [-1, 1]) a.sphere(0xfff0b0, { p: [s * 0.32, Y0 + 0.42, nez * (demi - 0.35)], e: [0.18, 0.12, 0.12], seg: 8 });
  }
  // LES FENÊTRES : une rangée de baies séparées par des trumeaux, de chaque
  // côté — c'est elle qui fait une voiture de voyageurs.
  const PAS_BAIE = 1.2, BAIE = 0.86;
  for (const s of [-1, 1]) {
    for (let z = z0 + 0.7; z + BAIE / 2 <= z1 - 0.5; z += PAS_BAIE) {
      if (Math.abs(z - 1.9) < 0.7 || Math.abs(z + 1.9) < 0.7) continue;    // les portes
      a.boite(0x1c2a3a, { p: [s * LARG * 0.505, Y0 + H * 0.66, z + BAIE / 2], e: [0.04, 0.5, BAIE] });
    }
  }
  // Les portes, deux par flanc. Celle de l'arrière (z +1,9) COULISSE (v489) :
  // c'est par elle que l'enfant monte, dans un membre à part.
  for (const s of [-1, 1]) {
    a.boite(0x3a3c46, { p: [s * LARG * 0.505, Y0 + H * 0.45, -1.9], e: [0.05, 1.2, 0.9] });
    a.boite(0x0c1016, { p: [s * LARG * 0.5, Y0 + H * 0.45, 1.9], e: [0.04, 1.18, 0.88] });
  }
  // LE SOUFFLET, aux bouts d'attelage : un accordéon sombre plus étroit que
  // la caisse, qui touche celui de la voisine.
  for (const s of [-1, 1]) {
    if (s === nez) continue;
    a.boite(0x22242a, { p: [0, Y0 + H * 0.5, s * (demi + SOUFFLET / 2)], e: [LARG * 0.8, H * 0.86, SOUFFLET] });
  }
  // les bogies, deux essieux de deux roues chacun
  for (const dz of [-2.6, 2.6]) {
    const zb = Math.max(z0 + 1, Math.min(z1 - 1, dz));
    a.boite(0x2a2a30, { p: [0, Y0 - 0.3, zb], e: [1.3, 0.34, 1.7] });
    for (const s of [-1, 1]) {
      for (const d2 of [-0.55, 0.55]) {
        a.cylindre(0x4a4a54, {
          p: [s * 0.66, Y0 - 0.5, zb + d2], r: [0, 0, Math.PI / 2],
          e: [0.5, 0.12, 0.5], haut: 0.5, bas: 0.5, seg: 10,
        });
      }
    }
  }
  const yPorte = Y0 + H * 0.45;
  a.membre('porte', [0, yPorte, 1.9]);
  for (const s of [-1, 1]) a.boite(0x3a3c46, { p: [s * LARG * 0.505, yPorte, 1.9], e: [0.05, 1.2, 0.9] });
  a.membre('tronc');
  const g = a.finir();
  // L'ACCÈS (v489), comme la rame : le seuil, les deux flancs, la porte qui
  // coulisse le long de z.
  g.userData.porte = {
    type: 'coulissante', ouvrant: 'porte', axe: 'z', z: 1.9, course: 0.86,
    x: LARG / 2, y: 1.1, demiLong: demi + (nez ? 0 : SOUFFLET), cotes: [-1, 1],
  };
  return g;
}
