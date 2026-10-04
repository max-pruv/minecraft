// LA CONDUITE DE LA VOITURE DE L'ENFANT (conduite-physique, v337).
//
// Max (4 octobre 2026) : « une grosse refonte de la façon de conduire… comme
// GTA : des véhicules qui tournent de manière naturelle, des accélérations
// cohérentes, des vitesses cohérentes — aujourd'hui les véhicules sont trop
// lents —, des collisions cohérentes ».
//
// CE FICHIER EST PUR : ni three, ni document, ni monde. Il dit ce qu'une
// voiture FAIT d'une commande (le pas de dynamique) et ce qu'un choc fait de
// sa vitesse ; `player.js` l'applique, et les témoins le lisent sous node.
// Deux copies de ces formules — l'une dans le joueur, l'autre dans un témoin —
// finiraient par diverger (discipline de `postesAvion`).
//
// ÉCHELLE : une voiture fait 4,4 blocs, donc un bloc vaut à peu près un mètre
// et km/h = blocs/s × 3,6.
//
// LE MODÈLE est celui d'une « bicyclette » simplifiée, le modèle des jeux de
// course arcade :
//   · la voiture a UN cap (son corps, `player.yaw`) et sa vitesse a une
//     DIRECTION qui peut s'en écarter un peu — c'est la dérive ;
//   · le lacet voulu vaut v · tan(δ) / L (δ l'angle des roues, L
//     l'empattement) : au pas on tourne serré, à pleine vitesse large ;
//   · l'adhérence borne ce que la DIRECTION de la vitesse peut tourner
//     (μ / v) ; ce que le corps tourne en plus devient la dérive, bornée, et
//     elle se rattrape toute seule dès qu'on relâche le volant ;
//   · l'accélération est forte au démarrage et s'essouffle vers la pointe,
//     a = a0 · (1 − (v / vmax)²) ; le frein est franc ; lâcher le joystick,
//     c'est le frein moteur ; tirer en arrière freine PUIS recule (v269).
//
// TOUT SE JOUE D'UN DOIGT (v272) : l'avant du joystick accélère, l'arrière
// freine, le côté tourne le volant. La dérive n'est jamais une commande —
// elle vient d'un virage serré pris vite, et se rattrape sans rien faire.

export const MARCHE = 3.2;            // WALK_SPEED de player.js : l'unité des allures
export const EMPATTEMENT = 2.7;       // L, blocs (une voiture de 4,4)

// UNE CLASSE, UNE FICHE. `vmax` est la pointe (blocs/s), `a0` l'accélération
// à l'arrêt (blocs/s²), `mu` l'adhérence latérale (blocs/s², ≈ g × 10).
// Les pointes sont bornées par ce que le monde sait CHARGER devant la
// voiture — mesuré, pas calculé (`tests/sonde-plafond-voiture.cjs`) :
// voir PLAFOND_SOL.
export const CLASSES = {
  citadine: { vmax: 30, a0: 8.5, mu: 18 },
  berline:  { vmax: 34, a0: 9.0, mu: 19 },
  suv:      { vmax: 33, a0: 8.5, mu: 17 },
  gt:       { vmax: 42, a0: 11.0, mu: 22 },
  sportive: { vmax: 48, a0: 12.5, mu: 24 },
  hypercar: { vmax: 55, a0: 14.0, mu: 26 },
};

// LE PLAFOND DU SOL, MESURÉ (v337) : le trou devant soi — la distance au
// premier morceau non maillé dans le cône d'avance, critère de la v229 —, à
// la distance d'affichage de l'iPad (rr=12), le déplacement en TEMPS RÉEL
// (la position avancée à chaque image : laissée au joueur, `dt` borné l'aurait
// fait aller au ralenti sur un banc à dix images par seconde) :
//
//   vitesse      30    40    50    60  blocs/s
//   campagne    182   161   151   125  blocs de trou
//   Paris       160   151   136   125
//
// À soixante blocs par seconde le monde se maille encore deux secondes de
// route devant la voiture, dans Paris comme dans les champs : le plafond de
// la v260 (28, calculé avant le worker de la v251) ne tient plus. On retient
// 60 comme plafond MESURÉ, et l'hypercar reste dessous (55). La mesure de la
// tablette (`?diag=1`) reste à faire : dette déclarée dans TASKS.md.
export const PLAFOND_SOL = 60;

export const FREIN = 22;              // blocs/s² — un frein franc
export const FREIN_MOTEUR = 3.5;      // blocs/s² quand on lâche tout
export const TRAINEE = 0.004;         // × v² : l'air, qui fait le reste à haute vitesse
export const RECUL_MAX = 8;           // la marche arrière, blocs/s
export const ACCEL_RECUL = 7;
export const ZONE_MORTE = 0.12;       // joystick : ce qui ne compte pas

export const BRAQUAGE_ROUES = 0.6;    // rad aux roues, au pas (≈ 34°)
export const SUR_ADHERENCE = 1.12;    // à fond de volant, on demande un peu plus que l'adhérence
export const VOLANT_VITESSE = 3.2;    // tours de volant par seconde vers la consigne
export const VOLANT_RETOUR = 4.5;     // et retour au centre quand on lâche
export const DERIVE_MAX = 0.28;       // ≈ 16° : on glisse, on ne part pas en tête-à-queue
export const DERIVE_TAU = 0.35;       // s : la vitesse rattrape le cap
export const FROTTEMENT_DERIVE = 1.1; // la dérive coûte de la vitesse

// La fiche d'une voiture d'après sa pointe. `fun.js` ne transmet au joueur
// que l'allure (`player.boost`, multiple de la marche) : la classe se
// retrouve à sa pointe, qui est unique par classe. Une pointe inconnue
// (une bête de secours) prend la fiche la plus proche, à sa pointe à elle.
export function ficheDeVitesse(vmax) {
  let best = null, ecart = Infinity;
  for (const [nom, f] of Object.entries(CLASSES)) {
    const e = Math.abs(f.vmax - vmax);
    if (e < ecart) { ecart = e; best = { classe: nom, ...f }; }
  }
  if (ecart > 0.01) best = { ...best, vmax, classe: best.classe };
  return best;
}

export function allureDeClasse(classe) {
  const f = CLASSES[classe];
  return f ? f.vmax / MARCHE : null;
}

// L'angle des roues au plus, à la vitesse v : au pas, tout le braquage ; vite,
// juste ce qu'il faut pour demander un peu plus que l'adhérence — c'est ce
// qui fait qu'un virage à fond de volant DÉRIVE un peu, sans jamais partir.
export function braquageMax(v, fiche) {
  const a = Math.abs(v);
  if (a < 1) return BRAQUAGE_ROUES;
  return Math.min(BRAQUAGE_ROUES, Math.atan((EMPATTEMENT * fiche.mu * SUR_ADHERENCE) / (a * a)));
}

// Le rayon de virage à fond de volant, en régime établi, à la vitesse v :
// la géométrie (L / tan δ) tant qu'elle tient, l'adhérence (v² / μ) au-delà.
export function rayonDeVirage(v, fiche) {
  const geo = EMPATTEMENT / Math.tan(braquageMax(v, fiche));
  return Math.max(geo, (v * v) / fiche.mu);
}

// Le temps de 0 à `cible` blocs/s, moteur intact, à plein gaz :
// ∫ dv / (a0 (1 − (v/vm)²)) = (vm / a0) · atanh(cible / vm). Infini si la
// pointe est sous la cible.
export function tempsJusqua(cible, fiche) {
  if (cible >= fiche.vmax) return Infinity;
  return (fiche.vmax / fiche.a0) * Math.atanh(cible / fiche.vmax);
}

const signe = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const borne = (x, a) => Math.max(-a, Math.min(a, x));

// LE PAS DE DYNAMIQUE.
//   e      : { v, braquage, derive } — l'état d'avant (v signée, blocs/s)
//   entree : { gaz, volant, moteur, direction, inerte }
//            gaz ∈ [−1, 1] l'avant/arrière du joystick ; volant ∈ [−1, 1]
//            (positif = à droite) ; moteur ∈ [0, 1] (dégâts) ; direction en
//            rad (la voiture tire d'un côté) ; inerte : plus aucune commande
//            (panne, feu, embarquement en cours).
//   fiche  : CLASSES[...] (ou `ficheDeVitesse`)
// Rend { v, braquage, derive, dCap } : dCap est ce qu'on AJOUTE au cap du
// corps (convention de `player.yaw` : tourner à droite le fait décroître).
// La direction de la vitesse vaut alors cap + derive.
export function pasVoiture(e, entree, fiche, dt) {
  let v = e.v || 0;
  let braquage = e.braquage || 0;
  let derive = e.derive || 0;
  const inerte = !!entree.inerte;
  const m = entree.moteur == null ? 1 : Math.max(0, Math.min(1, entree.moteur));
  const vmax = fiche.vmax * (0.3 + 0.7 * m);
  const a0 = fiche.a0 * (0.3 + 0.7 * m);
  let gaz = inerte ? 0 : borne(entree.gaz || 0, 1);
  if (Math.abs(gaz) < ZONE_MORTE) gaz = 0;
  const volant = inerte ? 0 : borne(entree.volant || 0, 1);

  // — longitudinal —
  const roule = (a) => {   // frein moteur et air : vers zéro, sans le franchir
    const d = a * dt;
    v = Math.abs(v) <= d ? 0 : v - signe(v) * d;
  };
  if (gaz > 0) {
    if (v < -0.3) {
      v = Math.min(0, v + FREIN * gaz * dt);           // on freine la marche arrière
    } else {
      const cible = gaz * vmax;
      if (v < cible) v = Math.min(cible, v + a0 * Math.max(0, 1 - (v / vmax) ** 2) * dt);
      else roule(FREIN_MOTEUR + TRAINEE * v * v);
    }
  } else if (gaz < 0) {
    if (v > 0.5) {
      v = Math.max(0, v + FREIN * gaz * dt);           // on freine d'abord
    } else {
      const cible = gaz * RECUL_MAX;                   // puis l'on recule
      if (v > cible) v = Math.max(cible, v - ACCEL_RECUL * dt);
      else roule(FREIN_MOTEUR);
    }
  } else {
    roule(FREIN_MOTEUR + TRAINEE * v * v);
  }
  if (v > vmax) roule(FREIN_MOTEUR + TRAINEE * v * v); // moteur abîmé en route

  // — volant lissé, retour au centre —
  const vitesseVolant = Math.abs(volant) < 0.05 ? VOLANT_RETOUR : VOLANT_VITESSE;
  const dB = volant - braquage;
  braquage += signe(dB) * Math.min(Math.abs(dB), vitesseVolant * dt);

  // — lacet —
  const a = Math.abs(v);
  const delta = braquage * braquageMax(v, fiche) + (entree.direction || 0);
  const omega = (v * Math.tan(delta)) / EMPATTEMENT;   // rad/s, positif = à droite
  const corps = -omega;                                // ce que le cap voudrait tourner
  // la direction de la vitesse suit le corps, et rattrape la dérive…
  let vitesseCap = corps - derive / DERIVE_TAU;
  // … dans la limite de l'adhérence
  const grip = fiche.mu / Math.max(a, 0.5);
  vitesseCap = borne(vitesseCap, grip);
  if (a < 0.3) { vitesseCap = corps; }
  let nouvelle = derive + (vitesseCap - corps) * dt;
  let dCap = corps * dt;
  if (Math.abs(nouvelle) > DERIVE_MAX) {
    // le corps ne tourne pas plus que ce que la dérive permet
    const exces = nouvelle - signe(nouvelle) * DERIVE_MAX;
    dCap += exces;
    nouvelle -= exces;
  }
  derive = a < 0.3 ? 0 : nouvelle;
  // la dérive coûte de la vitesse : on frotte les pneus
  if (derive) v -= v * FROTTEMENT_DERIVE * Math.abs(Math.sin(derive)) * dt;
  return { v, braquage, derive, dCap };
}

// LE CHOC. `vx, vz` la vitesse de la voiture, `nx, nz` la normale de ce qu'on
// touche (unitaire, tournée VERS la voiture). Rend la vitesse d'après et la
// force du choc (0 à 1).
//   · rasant (moins de RASANT entre la vitesse et le mur) : on GLISSE le long,
//     et l'on perd de la vitesse selon l'angle d'impact ;
//   · de face : on s'arrête, avec un petit rebond.
// La force est la vitesse d'impact NORMALE rapportée à CHOC_PLEIN : un mur pris
// de face à 72 km/h vaut un choc plein, le même mur frôlé presque rien.
export const RASANT = 0.5;            // cos(60°) : moins de 30° entre la vitesse et le mur
export const PERTE_GLISSE = 0.9;      // la part de vitesse perdue au pire des rasants
export const REBOND = 0.18;           // ce qui revient d'un choc de face
export const CHOC_PLEIN = 20;         // blocs/s normaux = force 1
export function reponseChoc(vx, vz, nx, nz) {
  const vn = vx * nx + vz * nz;
  const vit = Math.hypot(vx, vz);
  if (vn >= 0 || vit < 1e-6) return { vx, vz, force: 0, glisse: false };
  const tx = vx - vn * nx, tz = vz - vn * nz;
  const c = -vn / vit;                                 // 1 de face, 0 tout à fait rasant
  const force = Math.min(1, -vn / CHOC_PLEIN);
  if (c < RASANT) {
    const k = 1 - PERTE_GLISSE * c;
    return { vx: tx * k, vz: tz * k, force, glisse: true };
  }
  const k = 0.25 * (1 - c);                            // de face : presque rien ne file de côté
  return { vx: tx * k - vn * REBOND * nx, vz: tz * k - vn * REBOND * nz, force, glisse: false };
}

// LES CASES SOUS UNE BOÎTE ORIENTÉE. La boîte : centre (x, z), cap (le sens
// du NEZ, en convention `cap` de la circulation : avant = (sin cap, cos cap)),
// demi-longueur a, demi-largeur b. Rend les cases [bx, bz] que le rectangle
// recouvre vraiment — séparation d'axes, case contre rectangle —, pas sa
// boîte englobante : une voiture en biais dans une rue ne touche pas les
// façades que touche son carré englobant.
export function casesSousBoite(x, z, cap, a, b, marge = 1e-4) {
  const ux = Math.sin(cap), uz = Math.cos(cap);   // le long
  const vx = uz, vz = -ux;                         // en travers
  const ex = Math.abs(ux) * a + Math.abs(vx) * b;
  const ez = Math.abs(uz) * a + Math.abs(vz) * b;
  const out = [];
  const x0 = Math.floor(x - ex + marge), x1 = Math.floor(x + ex - marge);
  const z0 = Math.floor(z - ez + marge), z1 = Math.floor(z + ez - marge);
  for (let bz = z0; bz <= z1; bz++) {
    for (let bx = x0; bx <= x1; bx++) {
      // axes de la boîte : projection de la case (demi-côté 0,5) sur u et v
      const cx = bx + 0.5 - x, cz = bz + 0.5 - z;
      const ru = 0.5 * (Math.abs(ux) + Math.abs(uz));
      const rv = 0.5 * (Math.abs(vx) + Math.abs(vz));
      if (Math.abs(cx * ux + cz * uz) >= a + ru - marge) continue;
      if (Math.abs(cx * vx + cz * vz) >= b + rv - marge) continue;
      out.push([bx, bz]);
    }
  }
  return out;
}

// LE POINT D'IMPACT d'une boîte orientée poussée dans la direction (dx, dz) :
// le milieu de la face qui avance — le nez, le coffre ou un flanc. C'est ce
// que lit la session des dégâts pour froisser la carrosserie au bon endroit.
export function pointDImpact(x, z, cap, a, b, dx, dz) {
  const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux;
  const du = dx * ux + dz * uz, dv = dx * vx + dz * vz;
  if (Math.abs(du) / a >= Math.abs(dv) / b) {
    const s = signe(du) || 1;
    return { x: x + ux * a * s, z: z + uz * a * s };
  }
  const s = signe(dv) || 1;
  return { x: x + vx * b * s, z: z + vz * b * s };
}
