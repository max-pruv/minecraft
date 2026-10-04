// LE MONDE À LA VITESSE (v337) — ce que le chargement du monde permet au sol,
// et dans quel ordre on le charge quand on va vite.
//
// Module PUR, sans import : `main.js` y lit l'ordre de la file de maillage, la
// conduite y lit le plafond de vitesse, un témoin le lit sous node.
//
// ── POURQUOI CE FICHIER ─────────────────────────────────────────────────────
//
// Les vitesses des voitures (`ALLURES`, vehicules.js, v260) étaient bornées
// par un chiffre d'AVANT le worker de maillage : « Paris se maille à 42
// morceaux par seconde au banc (v237), et une vitesse v en réclame 1,5 × v
// (v229) » — d'où vingt-huit blocs par seconde en ville. Le worker (v251) a
// sorti la génération et le maillage du fil principal ; ce chiffre-là n'avait
// jamais été remesuré. Il l'est ici, EN ROULANT, en régime établi
// (`tests/sonde-monde-a-la-vitesse.cjs`), et le plafond se publie là où il se
// calcule : ce n'est pas à la conduite de le deviner, ni à ce fichier de régler
// les voitures (« tu mesures, elle applique »).
//
// ── LA MESURE (sonde-monde-a-la-vitesse.cjs, rr 12, file 8, banc, ordre neuf
// forcé par `?file=cone` — en rendu logiciel le jeu garde l'ordre d'avant) ──
//
// L'enfant avance en ligne droite à v blocs par seconde de TEMPS RÉEL, le
// disque chargé d'abord à l'arrêt, quatre secondes pour établir le régime,
// puis six relevés à une seconde : médiane du « trou » — la distance au premier
// morceau non maillé dans le champ de la caméra (±40°) — et, sur la fenêtre,
// la cadence et la pire image. File neuve (v337) :
//
//   v (b/s)   campagne   A1 (Paris–Lille)   Paris   Londres   Rome
//     60        179          158             138      132      143
//     70        160          151             107       —       107
//     80        158          143             102      115       86
//    100        132          115              80       93       86
//
// Pire image 117 à 233 ms, AUCUNE image au-delà de 300 ms, sur toutes ces
// lignes. Au palier bas (rr 8, file 6) le disque ne fait que 128 blocs : à 60
// b/s, 128 · 128 · 128 · 122 · 128 ; à 80, 128 · 128 · 113 · 113 · 101.
//
// LE DÉBIT N'EST PLUS CELUI DE LA v237. En roulant, régime établi, le worker
// rend 43 à 58 morceaux par seconde en ville et 54 à 78 en campagne — à
// rapporter aux « 42 morceaux par seconde à Paris » sur lesquels ALLURES avait
// plafonné les voitures à vingt-huit blocs par seconde.
//
// LE CRITÈRE : le monde est maillé dans le champ jusqu'à au moins DEUX
// SECONDES DE ROUTE — ce qu'on rejoindra dans deux secondes est déjà là, le
// reste est le paysage lointain (horizon.js). Il tient à 60 b/s en ville (138,
// 132, 143 pour 120) et pas à 70 (107 pour 140) ; à 70 en campagne et sur
// l'autoroute (160, 151 pour 140) et pas à 80 (158 pour 160). Le disque borne
// aussi la règle par géométrie : deux secondes de route ne peuvent pas
// dépasser son rayon, d'où `plafondSol(rr)`.
//
// CE QUI SE TRANSPOSE À L'IPAD, ET CE QUI NE SE TRANSPOSE PAS. Le banc rend en
// logiciel, à 11 à 20 images par seconde en roulant : la file se recharge une
// fois par image, et une tablette à trente ou soixante images la recharge plus
// souvent — le débit n'y est pas moindre si son processeur engendre un morceau
// aussi vite. L'ORDRE (ce qui est maillé d'abord) et les NOMBRES de morceaux se
// transposent ; les millisecondes du worker et la cadence ne se transposent
// pas, et c'est une mesure à faire sur la tablette (`?diag=1`), déclarée dans
// TASKS.md.

// REMESURÉ EN v349, APRÈS LA BAISSE DU COÛT D'UN MORCEAU DANS LE WORKER
// (Paris 8,3 → 3,3 ms, Rome 10,5 → 4,1, campagne 4,1 → 2,5, sous node). Même
// sonde, ordre ABBA, v348 puis v349, « cone40 » à 80 b/s pour 160 exigés :
//
//   Paris 125 · 125  →  125 · 129      Rome     113 · 122  →  138 · 129
//   Londres 125 · 137 →  143 · 129     campagne 160 · 172  →  173 · 160–173
//   A1 144 · 151     →  158 · 158      (à 90 : campagne 158 → 160, A1 143–148 → 145–151)
//
// Le gain est réel en ville (+5 à +25 blocs) et ne suffit pas : au banc le débit
// plafonne vers 55 morceaux par seconde en ville DES DEUX CÔTÉS — ce n'est
// plus le worker qui limite ici, c'est la cadence du banc (la file se recharge
// une fois par image, rendu logiciel). Le plafond NE BOUGE PAS : on ne publie
// qu'une valeur tenue, et 80 b/s ne tient ni en ville ni sur l'A1 (158).

// Plafond au sol, en blocs par seconde (≈ mètres par seconde : une voiture
// fait 4,4 blocs pour 4,5 m), pour une distance d'affichage de douze morceaux
// ou plus.
export const VITESSE_SOL_MAX = Object.freeze({ ville: 60, campagne: 70 });

// Le plafond pour une distance d'affichage donnée (en morceaux de 16 blocs) :
// celui de la table, et jamais plus que deux secondes de route dans le rayon
// du disque — au palier bas (rr 8), 64 : soixante partout, au pas de dix.
export function plafondSol({ ville = true, rr = 12 } = {}) {
  const table = ville ? VITESSE_SOL_MAX.ville : VITESSE_SOL_MAX.campagne;
  const disque = Math.floor((rr * 16) / 2 / 10) * 10;
  return Math.min(table, disque);
}

// ── L'ORDRE DE LA FILE QUAND ON VA VITE ─────────────────────────────────────
//
// La file était ordonnée par la distance au carré, pondérée par le REGARD : un
// morceau à moins de 81° du regard pesait 1, les autres 2,5. Deux défauts à
// vitesse de voiture, et les deux se mesurent dans la sonde :
//   • un morceau de CÔTÉ à sept morceaux (49 × 2,5 = 122) passait avant celui
//     de l'AXE à douze (144) : en déficit de débit, la file mangeait les côtés
//     qu'on dépasse au lieu du paysage où l'on va ;
//   • ce qui est DERRIÈRE restait dans la file : un morceau qu'on vient de
//     dépasser, demandé puis maillé, puis jeté deux morceaux plus loin.
// L'ordre suit donc le DÉPLACEMENT quand on en a un (`dir`), et le poids croît
// continûment avec l'écart à l'axe. Au-dessus de `VITESSE_CONE`, ce qui est
// derrière ne se demande plus du tout ; on le redemande en ralentissant (main.js
// refait la file quand le régime change).

// Au-dessus de cette vitesse (blocs par seconde, mesurée sur le déplacement
// réel), la file suit le déplacement et oublie ce qui est derrière. Huit : plus
// vite qu'un enfant qui court (5,4), aussi vite que la plus lente voiture au
// démarrage.
export const VITESSE_CONE = 8;
// Le cercle qu'on charge toujours, même derrière soi, même vite : ce qui est
// sous les roues et juste à côté (collisions, passants).
export const RAYON_TOUJOURS = 2;

// Le poids d'un morceau selon le cosinus de son écart à l'axe du déplacement :
// 1 dans l'axe, 2,5 à 72°, 4 de côté. Continu, pour qu'aucun seuil ne fasse
// basculer l'ordre d'un pas à l'autre.
export function poidsDeCap(dot) {
  const e = 1 - Math.max(-1, Math.min(1, dot));
  return 1 + 3 * e * e;
}

// La file de maillage : les morceaux du carré de rayon R autour de (pcx, pcz)
// qui ne sont pas déjà maillés (`deja(cx, cz)`), triés pour être PRIS PAR LA
// FIN (`pop()` prend le plus urgent) — la convention de main.js.
//   dir    : direction unitaire {x, z} de ce qui compte (déplacement, ou regard)
//   rapide : on va vite — ce qui est derrière, hors du cercle proche, sort.
export function fileDeMaillage({ pcx, pcz, R, dir, rapide, deja }) {
  const file = [];
  for (let dz = -R; dz <= R; dz++) {
    for (let dx = -R; dx <= R; dx++) {
      const cx = pcx + dx, cz = pcz + dz;
      if (deja(cx, cz)) continue;
      const d2 = dx * dx + dz * dz;
      const len = Math.sqrt(d2);
      const dot = len < 1.5 ? 1 : (dx / len) * dir.x + (dz / len) * dir.z;
      if (rapide && len > RAYON_TOUJOURS && dot < -0.1) continue;
      file.push({ cx, cz, d: d2 * poidsDeCap(dot) });
    }
  }
  file.sort((a, b) => b.d - a.d);
  return file;
}
