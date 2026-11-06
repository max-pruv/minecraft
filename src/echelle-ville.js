// L'ÉCHELLE DES VILLES (v587) — une table, lue par les bâtisseurs ET les témoins.
//
// Max, trois captures d'iPhone à pied dans une rue de Paris : un adulte arrive
// presque en haut du rez-de-chaussée, les stores sont juste au-dessus des
// têtes, une vitrine fait la hauteur d'un passant. Mesuré AVANT d'écrire une
// ligne (`tests/sonde-echelle-paris.mjs`, `tests/sonde-echelle-captures.cjs`,
// le tableau est dans `docs/echelle-villes.md`) : les personnages (1,48 à
// 1,82 bloc), l'œil (1,63), les voitures, les tables et les chaises sont à
// l'échelle ; ce qui était faux, c'est le BÂTI. Le bâtisseur écrit son premier
// rang à la cote du trottoir (`world.js` : `wy = h + dy - 1`, le trottoir à
// `h`) : la première bande de toute façade était ENTERRÉE, et le
// rez-de-chaussée « de trois blocs » n'en montrait que deux — vitrage visible
// 1,35 m, enseigne à 1,4 m, porte cochère visible 0,84 m, corniche à 16 m.
//
// Ce module est la table d'échelle partagée : un bâtisseur qui l'ignore
// recopie une hauteur, et le témoin qui la mesure recopie la même — deux
// tables qui décrivent la même façade finissent par diverger. Il est PUR et
// sans import : le worker de maillage, le fil principal et les témoins sous
// node le lisent tel quel.
//
// À LA VERTICALE, UN BLOC VAUT UN MÈTRE (v301). Les hauteurs ci-dessous sont
// en blocs, comptées en RANGS du bâtisseur (`dy`), dont le premier (`socle`)
// est au ras du trottoir et ne se voit pas : la hauteur VISIBLE d'une façade
// est `hauteurFacade(n) - socle`.
export const METRE_PAR_BLOC = 1;

export const ECHELLE_VILLE = Object.freeze({
  socle: 1,       // le rang enterré, au ras du trottoir : de la pierre, jamais une bande de façade
  rdc: 4,         // le rez-de-chaussée commerçant, visible : 4 m (réel 3,5 à 4,5)
  porte: 3,       // la porte cochère, du trottoir au bandeau : 3 m (réel 3 à 4)
  entresol: 3,    // l'entresol : 3 m, allège, baie, haut de baie (réel 2,5 à 3,2)
  etage: 3,       // un étage courant : 3 m, allège, baie, linteau (réel 2,8 à 3,5)
});

// Ce que la v586 faisait, pour mesurer la croissance : trois rangs de RDC dont
// le premier enterré, deux d'entresol, trois par étage.
export const ECHELLE_V586 = Object.freeze({ socle: 0, rdc: 3, porte: 2, entresol: 2, etage: 3 });

// La hauteur de la façade en rangs du bâtisseur (le dernier rang de façade,
// la corniche est juste au-dessus) pour `niveaux` niveaux : le rez-de-chaussée,
// l'entresol, puis les étages.
export function hauteurFacade(niveaux, e = ECHELLE_VILLE) {
  return e.socle + e.rdc + e.entresol + Math.max(0, niveaux - 2) * e.etage;
}

// Ce que l'enfant voit, en mètres, d'une façade de `niveaux` niveaux.
export function facadeVisible(niveaux, e = ECHELLE_VILLE) {
  return (hauteurFacade(niveaux, e) - e.socle) * METRE_PAR_BLOC;
}

// DE COMBIEN UN IMMEUBLE DE PARIS A MONTÉ (v587) : la différence est la même
// pour toute colonne de lot, quel que soit le nombre de niveaux — c'est ce qui
// permet à la marche de migration (`releverEchelleParis`, world.js) de monter
// une cabane bâtie sur un toit d'un seul tenant. Un RÉSULTAT, pas un chiffre
// recopié : il suit la table.
export const CROISSANCE_PARIS = hauteurFacade(2) - hauteurFacade(2, ECHELLE_V586);

// LES DIMENSIONS RÉELLES, en mètres, contre lesquelles le jeu se mesure.
// Fourchettes [bas, haut] ; les sources sont dans `docs/echelle-villes.md`.
export const REEL = Object.freeze({
  adulte: [1.6, 1.85],        // la stature d'un adulte
  enfant: [1.15, 1.5],        // un enfant de 7 à 10 ans
  oeil: [1.5, 1.7],           // la hauteur de l'œil d'un adulte debout
  voitureHaut: [1.4, 1.9],    // une berline, un SUV
  voitureLong: [4.0, 5.0],
  rdc: [3.5, 4.5],            // le rez-de-chaussée commerçant haussmannien
  porteCochere: [3.0, 4.0],   // hauteur d'une porte cochère (au moins 3,50 m selon J. J. Storck)
  vitrine: [2.5, 3.2],        // le haut du vitrage d'une devanture
  enseigne: [3.0, 3.8],       // le bandeau d'enseigne, au-dessus du vitrage
  store: [2.6, 3.3],          // l'attache d'un store banne
  entresol: [2.5, 3.2],
  etageNoble: [3.2, 3.6],     // le deuxième étage
  etage: [2.8, 3.5],          // un étage courant
  corniche: [17.55, 20.0],    // le haut de la façade : 17,55 m (1784), 20 m (1859, 1884)
  faite: [20.0, 26.0],        // le comble, sous une diagonale à 45°
  reverbere: [3.5, 4.5],      // un candélabre parisien
  potelet: [0.9, 1.2],
  banc: [0.4, 0.5],           // l'assise du banc Davioud
  bancLong: [2.0, 2.4],       // 2,25 m
  table: [0.7, 0.76],
  chaise: [0.42, 0.47],       // l'assise ; le dossier à 0,8–0,9
  morris: [3.5, 4.5],         // la colonne Morris, affichage compris
  trottoir: [2.0, 5.0],
  chaussee: [5.0, 12.0],
});
