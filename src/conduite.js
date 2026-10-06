// LA CONDUITE DE LA VOITURE DE L'ENFANT (conduite-physique, v358).
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
//   · l'accélération est forte au démarrage (le coup de départ) et
//     s'essouffle vers la pointe, a0 · (1 − (v / vmax)²) ; le frein est franc ; lâcher le joystick,
//     c'est le frein moteur ; tirer en arrière freine PUIS recule (v269).
//
// TOUT SE JOUE D'UN DOIGT (v272) : l'avant du joystick accélère, l'arrière
// freine, le côté tourne le volant. La dérive n'est jamais une commande —
// elle vient d'un virage serré pris vite, et se rattrape sans rien faire.

import { VITESSE_SOL_MAX } from './plafond-sol.js';

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

// LE PLAFOND DU SOL EST CELUI QUE PUBLIE LE MONDE (`plafond-sol.js`, v346 :
// « tu mesures, elle applique »). Mesuré par deux sessions, deux sondes, au
// même critère (le trou devant soi à rr=12, le déplacement en temps réel) :
// 60 blocs/s en ville et 70 en campagne là-bas ; ici, 125 blocs de trou à 60
// blocs/s, Paris comme campagne (`sonde-plafond-voiture.cjs`). Les classes se
// posent sous le plafond de la VILLE — une voiture ne sait pas où elle roule
// —, l'hypercar à 55.
export const PLAFOND_SOL = VITESSE_SOL_MAX.ville;

// LE COUP DE DÉPART. Une accélération seulement en a0 · (1 − (v/vm)²) démarre
// mou : mesuré au banc à Manhattan, même nombre d'images des deux côtés,
// l'ancienne voiture (toute son allure en une demi-seconde) faisait 6 blocs,
// la nouvelle 1,75. Un enfant appuie et la voiture doit BONDIR. On ajoute
// donc une poussée de départ, pleine à l'arrêt, éteinte à LANCER_JUSQUA :
// 0 → 36 km/h en une demi-seconde, et la courbe d'avant au-delà.
export const LANCER = 12;             // blocs/s² de plus à l'arrêt
export const LANCER_JUSQUA = 10;      // blocs/s où le coup de départ s'éteint
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

// L'ACCÉLÉRATION À PLEIN GAZ à la vitesse v (v ≥ 0) : la courbe qui
// s'essouffle vers la pointe, plus le coup de départ. Une seule formule, que
// lisent le pas de dynamique et le temps de 0 à 100.
export function accelVoiture(v, vmax, a0) {
  const courbe = a0 * Math.max(0, 1 - (v / vmax) ** 2);
  const coup = LANCER * Math.max(0, 1 - v / LANCER_JUSQUA);
  return courbe + coup;
}

// Le temps de 0 à `cible` blocs/s, moteur intact, à plein gaz : ∫ dv / a(v),
// intégré finement (la courbe seule a une forme fermée en atanh, le coup de
// départ non). Infini si la pointe est sous la cible.
export function tempsJusqua(cible, fiche) {
  if (cible >= fiche.vmax) return Infinity;
  let t = 0;
  const n = 2000, dv = cible / n;
  for (let i = 0; i < n; i++) t += dv / accelVoiture((i + 0.5) * dv, fiche.vmax, fiche.a0);
  return t;
}

const signe = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const borne = (x, a) => Math.max(-a, Math.min(a, x));

// LA PENTE ET LA BOSSE (palier 3). Une seule pesanteur le long de la route,
// la vraie (9,81) : celle du jeu (26, le saut) rendrait une pente d'un bloc
// par bloc — la plus raide que la surface continue dessine — plus forte que
// le moteur d'une citadine, et un enfant resterait au pied d'une colline.
// `pente` est la montée par bloc parcouru, nez en haut positif.
export const PESANTEUR_PENTE = 9.81;
export const MAINTIEN = 0.3;          // blocs/s : sous ce seuil, sans commande, on tient
export function gravitePente(pente) {
  return -PESANTEUR_PENTE * pente / Math.sqrt(1 + pente * pente);
}
// La vitesse d'équilibre à plein gaz sur une pente constante (au-dessus du
// coup de départ, v > LANCER_JUSQUA) : a0·(1 − (v/vmax)²) = g·sin θ. Infinie
// en descente : là c'est l'air et le frein moteur qui bornent.
export function vitesseEnCote(pente, fiche) {
  const g = -gravitePente(pente);
  if (g <= 0) return fiche.vmax;
  return g >= fiche.a0 ? 0 : fiche.vmax * Math.sqrt(1 - g / fiche.a0);
}
// La vitesse de roue libre sur une descente constante, joystick lâché :
// FREIN_MOTEUR + TRAINEE·v² = g·sin θ. Nulle tant que le frein moteur tient.
export function vitesseEnRoueLibre(pente) {
  const g = gravitePente(pente);
  return g <= FREIN_MOTEUR ? 0 : Math.sqrt((g - FREIN_MOTEUR) / TRAINEE);
}
// CE QUE LA CAISSE VOIT DE LA SURFACE. La surface continue passe par le centre
// de chaque colonne : sur une colline de relief entier, c'est une dent de scie
// (des facettes à 0 et à 1 bloc par bloc pour une pente de 0,37). Un point qui
// la suivrait décollerait de chaque dent — mesuré au premier jet : 1,1 à
// 3,2 s « en l'air » sur six côtes droites. Une voiture a des roues sur toute
// sa longueur et une suspension : on lit la surface en CINQ points le long de
// la caisse (de −2 à +2 blocs) et l'on en prend la moyenne (la cote) et la
// droite des moindres carrés (la pente, nez en haut positif). `sol` rend la
// cote de la surface continue en (x, z), ou null (voxel : ville, bloc posé,
// falaise) — et alors on ne lit rien.
export const LECTURE = [-2, -1, 0, 1, 2];
export function sousLaCaisse(sol, x, z, cap) {
  const fx = -Math.sin(cap), fz = -Math.cos(cap);
  let somme = 0, pente = 0, n2 = 0;
  for (const o of LECTURE) {
    const c = sol(x + fx * o, z + fz * o);
    if (c === null) return null;
    somme += c; pente += o * c; n2 += o * o;
  }
  return { cote: somme / LECTURE.length, pente: pente / n2 };
}
export function penteSousLaCaisse(sol, x, z, cap) {
  const r = sousLaCaisse(sol, x, z, cap);
  return r ? r.pente : null;
}
// LA SUSPENSION : tant que la caisse est à moins de DEBATTEMENT au-dessus de la
// surface, ses roues touchent (traction, volant, pente) et elle y revient à
// RAPPEL blocs/s. Au-delà, elle vole, et cela se voit.
export const DEBATTEMENT = 0.35;
export const RAPPEL = 3;
// Le sol de la caisse est la surface LISSÉE (la cote de `sousLaCaisse`) — sans
// quoi chaque marche d'une descente faisait sauter la voiture (mesuré : 0,5 à
// 0,8 s « en l'air » sur six descentes droites, et la descente devenait plus
// LENTE que le plat faute de roues au sol). Sur une crête de dent de scie, la
// surface au centre peut dépasser la cote lissée : la caisse ne s'y enfonce
// pas de plus d'ENFONCE (les roues l'enjambent, cela ne se voit pas).
export const ENFONCE = 0.3;
// L'ATTERRISSAGE : la vitesse avec laquelle la caisse rencontre la surface
// (`vyCible` est la vitesse verticale qu'exige la surface sous les roues, la
// vitesse le long de la route fois la pente). Une chute de CHUTE_PLEINE blocs/s
// — 4,3 blocs de haut à la pesanteur du jeu — vaut un atterrissage plein.
export const CHUTE_PLEINE = 15;
export function forceAtterrissage(vyImpact, vyCible) {
  return Math.max(0, Math.min(1, (vyCible - vyImpact) / CHUTE_PLEINE));
}

// SUIVRE UNE VOITURE PLUS LENTE (palier 3). Une voiture de la rue ne se pousse
// pas (horloge partagée, v305) : collé derrière elle, joystick en avant, on la
// touchait à chaque image — des caresses sous CONTACT_DOUX, invisibles aux
// dégâts mais pas à l'enfant, dont la voiture tremblait contre un pare-chocs.
// On la SUIT : la vitesse permise est celle qu'on peut encore perdre, au
// freinage de confort, avant d'arriver à ECART_SUIVI de son pare-chocs — et
// à cet écart, c'est la sienne. `ecart` : de notre pare-chocs avant au sien
// arrière, le long de notre cap.
export const ECART_SUIVI = 1.5;       // blocs entre les deux pare-chocs, à l'arrêt comme en file
export const FREIN_SUIVI = 9;         // blocs/s², un freinage qu'on sent sans piler
export const PORTEE_SUIVI = 36;       // blocs devant le pare-chocs : l'arrêt au frein franc depuis 40 b/s
export function vitesseDeSuivi(vAutre, ecart) {
  return Math.max(0, vAutre) + Math.sqrt(2 * FREIN_SUIVI * Math.max(0, ecart - ECART_SUIVI));
}
// le freinage qu'il faut pour arriver à ECART_SUIVI à la vitesse de l'autre :
// celui du confort si cela suffit, jusqu'au frein franc sinon (une voiture vue
// tard — un virage, une file qui débouche)
export function freinDeSuivi(v, vAutre, ecart) {
  const va = Math.max(0, vAutre);
  if (v <= va) return FREIN_SUIVI;
  const besoin = (v * v - va * va) / (2 * Math.max(0.1, ecart - ECART_SUIVI));
  return Math.max(FREIN_SUIVI, Math.min(FREIN, besoin));
}

// LE PAS DE DYNAMIQUE.
//   e      : { v, braquage, derive } — l'état d'avant (v signée, blocs/s)
//   entree : { gaz, volant, moteur, direction, inerte }
//            gaz ∈ [−1, 1] l'avant/arrière du joystick ; volant ∈ [−1, 1]
//            (positif = à droite) ; moteur ∈ [0, 1] (dégâts) ; direction en
//            rad/s à pleine vitesse (la voiture tire d'un côté, contrat de
//            degats.js) ; inerte : plus aucune commande
//            (panne, feu, embarquement en cours) ; pente (montée par bloc,
//            nez en haut, palier 3) ; auSol === false : les roues en l'air ;
//            plafond : la vitesse de suivi d'une voiture plus lente devant.
//   fiche  : CLASSES[...] (ou `ficheDeVitesse`)
// Rend { v, braquage, derive, dCap } : dCap est ce qu'on AJOUTE au cap du
// corps (convention de `player.yaw` : tourner à droite le fait décroître).
// La direction de la vitesse vaut alors cap + derive.
export function pasVoiture(e, entree, fiche, dt) {
  // EN L'AIR (palier 3) : les roues ne touchent rien — ni moteur, ni frein, ni
  // volant, ni pente. Seul l'air freine, et le cap ne tourne pas.
  if (entree.auSol === false) {
    let v = e.v || 0;
    const d = TRAINEE * v * v * dt;
    v = Math.abs(v) <= d ? 0 : v - signe(v) * d;
    return { v, braquage: e.braquage || 0, derive: e.derive || 0, dCap: 0 };
  }
  let v = e.v || 0;
  let braquage = e.braquage || 0;
  let derive = e.derive || 0;
  const inerte = !!entree.inerte;
  const m = entree.moteur == null ? 1 : Math.max(0, Math.min(1, entree.moteur));
  // le facteur des dégâts (`effetsConduite`, degats.js) : un moteur à zéro
  // garde trente-cinq pour cent de l'allure — en panne, c'est `inerte`
  const facteur = 0.35 + 0.65 * m;
  const vmax = fiche.vmax * facteur;
  const a0 = fiche.a0 * facteur;
  let gaz = inerte ? 0 : borne(entree.gaz || 0, 1);
  if (Math.abs(gaz) < ZONE_MORTE) gaz = 0;
  const volant = inerte ? 0 : borne(entree.volant || 0, 1);

  // — longitudinal —
  const roule = (a) => {   // frein moteur et air : vers zéro, sans le franchir
    const d = a * dt;
    v = Math.abs(v) <= d ? 0 : v - signe(v) * d;
  };
  // plafond de suivi (palier 3) : une voiture plus lente devant, on la suit
  const plafond = entree.plafond == null ? Infinity : Math.max(0, entree.plafond);
  if (gaz > 0 && v > plafond + 0.5) {
    v = Math.max(plafond, v - (entree.freinSuivi || FREIN_SUIVI) * dt);
  } else if (gaz > 0) {
    if (v < -0.3) {
      v = Math.min(0, v + FREIN * gaz * dt);           // on freine la marche arrière
    } else {
      const cible = Math.min(gaz * vmax, plafond);
      if (v < cible) v = Math.min(cible, v + accelVoiture(Math.max(0, v), vmax, a0) * dt);
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
  // LA PENTE (palier 3) : la montée ralentit, la descente accélère. La
  // composante de la pesanteur le long de la caisse, pente prise nez en haut.
  // Une voiture arrêtée qu'on ne commande pas tient sur son frein (MAINTIEN) :
  // un enfant qui lâche le joystick sur une colline ne la redescend pas.
  if (entree.pente && !(gaz === 0 && Math.abs(v) < MAINTIEN)) v += gravitePente(entree.pente) * dt;
  if (v > vmax) roule(FREIN_MOTEUR + TRAINEE * v * v); // moteur abîmé en route

  // — volant lissé, retour au centre —
  const vitesseVolant = Math.abs(volant) < 0.05 ? VOLANT_RETOUR : VOLANT_VITESSE;
  const dB = volant - braquage;
  braquage += signe(dB) * Math.min(Math.abs(dB), vitesseVolant * dt);

  // — lacet —
  const a = Math.abs(v);
  const delta = braquage * braquageMax(v, fiche);
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
  // LA DIRECTION FAUSSÉE (degats.js, contrat) : un biais de CAP en rad/s à
  // pleine vitesse, positif = le cap croît, proportionnel à la vitesse —
  // exactement ce que les dégâts appliquaient eux-mêmes avant que la
  // physique ne le lise (`physiqueLitEtat`).
  if (entree.direction) dCap += entree.direction * Math.min(1, a / Math.max(1, fiche.vmax)) * signe(v) * dt;
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

// ━━ PALIER 2 (v397) : LA NORMALE DE CE QU'ON TOUCHE ━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Le palier 1 prenait deux normales commodes et fausses : contre une voiture
// de la rue, celle du MOUVEMENT (toujours un choc de face, même en frôlant
// son flanc) ; contre un mur, celle d'un AXE DU MONDE, choisi en essayant x
// puis z. Sur une façade oblique — une trame tournée, Paris, la moitié des
// villes engendrées —, ce mur est un escalier de cubes et l'axe libre change
// à chaque marche. Mesuré sur un mur à 24° (sonde du palier 2, monde
// synthétique, berline à 30 blocs/s) : approchée à 25°, la voiture s'arrête
// net après quarante-deux « chocs » au lieu de glisser ; approchée à 12°,
// elle est renvoyée à quatorze blocs du mur.

// UNE BOÎTE : { x, z, ux, uz, a, b } — le centre, l'axe long (unitaire), la
// demi-longueur a et la demi-largeur b.
const boiteVoiture = (x, z, cap, a, b) => ({ x, z, ux: Math.sin(cap), uz: Math.cos(cap), a, b });
export { boiteVoiture };

// LA NORMALE ENTRE DEUX BOÎTES QUI SE CHEVAUCHENT, par séparation d'axes :
// des quatre axes des deux rectangles, celui où ils s'enfoncent le MOINS est
// celui par où l'on est entré. Rend { nx, nz, prof } avec n tourné de B vers A
// (vers la voiture de l'enfant), ou null s'ils ne se touchent pas.
export function normaleEntreBoites(A, B) {
  const axes = [[A.ux, A.uz], [A.uz, -A.ux], [B.ux, B.uz], [B.uz, -B.ux]];
  const dx = A.x - B.x, dz = A.z - B.z;
  let mieux = null;
  for (const [ax, az] of axes) {
    const rA = A.a * Math.abs(A.ux * ax + A.uz * az) + A.b * Math.abs(A.uz * ax - A.ux * az);
    const rB = B.a * Math.abs(B.ux * ax + B.uz * az) + B.b * Math.abs(B.uz * ax - B.ux * az);
    const d = dx * ax + dz * az;
    const prof = rA + rB - Math.abs(d);
    if (prof <= 0) return null;
    if (!mieux || prof < mieux.prof - 1e-9) {
      const s = d >= 0 ? 1 : -1;
      mieux = { nx: ax * s, nz: az * s, prof };
    }
  }
  return mieux;
}

// LE CHOC CONTRE UNE VOITURE QUI ROULE. `moi` et `autre` sont des boîtes
// (autre.v : sa vitesse le long de son axe, blocs/s), (vx, vz) la vitesse de
// la voiture de l'enfant. La réponse se calcule dans le repère de l'AUTRE —
// sur la vitesse RELATIVE — puis l'on y rajoute sa vitesse : un choc par
// l'arrière dans une voiture qui roule à vingt quand on en fait vingt-cinq
// est un choc à cinq, et l'on repart derrière elle à son allure ; un flanc
// frôlé glisse, comme un mur. La voiture de la rue, elle, ne se pousse pas :
// sa position est une fonction de l'horloge partagée (v305).
// Rend { vx, vz, force, glisse, nx, nz } ou null si les boîtes ne se touchent
// pas (on retombe alors sur la normale du mouvement).
export const CONTACT_DOUX = 0.15;    // 3 blocs/s relatifs, 11 km/h
// La rue juge le contact avec SES cotes (la voiture de l'enfant à 4,4 × 2,26,
// `rectangle` de vehicules.js) et le joueur porte son gabarit de fiche (2,2
// pour une berline) : au bord, la rue dit « touché » quand nos boîtes ne se
// recouvrent pas encore. On relit alors avec une boîte grossie d'un cheveu,
// sinon le choc retombait sur la normale du mouvement — vu au banc, un flanc
// frôlé rendu en choc de face.
export const MARGE_CONTACT = 0.15;
export function chocContreVoiture(moi, autre, vx, vz) {
  const n = normaleEntreBoites(moi, autre)
    || normaleEntreBoites({ ...moi, a: moi.a + MARGE_CONTACT, b: moi.b + MARGE_CONTACT }, autre);
  if (!n) return null;
  const ax = (autre.v || 0) * autre.ux, az = (autre.v || 0) * autre.uz;
  const r = reponseChoc(vx - ax, vz - az, n.nx, n.nz);
  // pare-chocs contre pare-chocs à moins de CONTACT_DOUX : un contact, pas un
  // choc. Collé derrière une voiture plus lente, joystick en avant, on la
  // touche à chaque image ; publiées, ces caresses useraient la voiture
  // jusqu'au feu au milieu d'un bouchon.
  const force = r.force < CONTACT_DOUX ? 0 : r.force;
  return { vx: r.vx + ax, vz: r.vz + az, force, glisse: r.glisse, nx: n.nx, nz: n.nz };
}

// LA NORMALE D'UN MUR FAIT DE CUBES. `cases` : les centres [x, z] des cases
// de SURFACE du mur (pleines, avec de l'air à côté) autour du contact ;
// (cx, cz) le centre de la voiture. Un mur oblique est un escalier de cubes
// alignés sur une droite : la droite qui passe au mieux par leurs centres
// (axe principal) donne la vraie façade, et sa normale ne change plus d'une
// marche à l'autre. Un coin (pas de droite nette) rend la direction du coin
// vers la voiture. Moins de trois cases : null — on garde la normale d'axe.
export const LIGNE_NETTE = 0.3;       // λ2/λ1 sous lequel les cases font une droite
export function normaleDeMur(cases, cx, cz) {
  const n = cases.length;
  if (n < 3) return null;
  let mx = 0, mz = 0, W = 0;
  for (const [x, z, p = 1] of cases) { mx += x * p; mz += z * p; W += p; }
  if (W <= 0) return null;
  mx /= W; mz /= W;
  let sxx = 0, szz = 0, sxz = 0;
  for (const [x, z, p = 1] of cases) { const a = x - mx, b = z - mz; sxx += p * a * a; szz += p * b * b; sxz += p * a * b; }
  const tr = sxx + szz, det = sxx * szz - sxz * sxz;
  const l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det)), l2 = tr - l1;
  let nx, nz;
  if (l1 > 1e-9 && l2 / l1 < LIGNE_NETTE) {
    // la direction de la droite (vecteur propre de l1), puis sa perpendiculaire
    let ex, ez;
    if (Math.abs(sxz) > 1e-9) { ex = l1 - szz; ez = sxz; } else if (sxx >= szz) { ex = 1; ez = 0; } else { ex = 0; ez = 1; }
    const e = Math.hypot(ex, ez); ex /= e; ez /= e;
    nx = -ez; nz = ex;
  } else {
    nx = cx - mx; nz = cz - mz;
  }
  const s = (cx - mx) * nx + (cz - mz) * nz;
  const l = Math.hypot(nx, nz);
  if (l < 1e-9) return null;
  return s >= 0 ? { nx: nx / l, nz: nz / l } : { nx: -nx / l, nz: -nz / l };
}

// ━━ CE QUE MAX RELÈVE SUR LA TABLETTE (v397, `?diag=1`) ━━━━━━━━━━━━━━━━━━━━━━━
// Deux choses du palier 1 ne se mesurent pas au banc : le PLAFOND (le banc
// rend une image par seconde dans Paris, le fil principal de l'iPad installe
// les morceaux à SA cadence) et la ROUE LIBRE (quelques secondes, voulues —
// à juger avec Marlon). Au volant, le diagnostic dit donc la classe, la
// vitesse et la pointe, le monde déjà maillé DEVANT la voiture (en blocs et
// en secondes de route), et la dernière roue libre (de quelle vitesse, en
// combien de secondes).

// Le monde maillé devant soi : on avance le long du cap, deux blocs à la
// fois, jusqu'au premier morceau qui n'est pas maillé. `maille(cx, cz)` dit
// si un morceau l'est ; `taille` est la taille d'un morceau.
export function mondeDevant(maille, x, z, yaw, taille, max = 400) {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  for (let d = 0; d <= max; d += 2) {
    if (!maille(Math.floor((x + fx * d) / taille), Math.floor((z + fz * d) / taille))) return d;
  }
  return max;
}

export function ligneDiagConduite({ classe, v, vmax, devant, roueLibre, pente, atterrissage, suivi }) {
  const a = Math.abs(v || 0);
  const kmh = (b) => Math.round(b * 3.6);
  let l = `au volant : ${classe || '?'} · ${a.toFixed(1)} blocs/s (${kmh(a)} km/h) · pointe ${(vmax || 0).toFixed(0)} (${kmh(vmax || 0)} km/h)`;
  if (devant != null) l += ` · monde maillé devant ${devant} blocs${a > 1 ? ` (${(devant / a).toFixed(1)} s de route)` : ''}`;
  if (roueLibre) l += ` · roue libre ${roueLibre.depuis.toFixed(0)} → 0 en ${roueLibre.s.toFixed(1)} s`;
  // palier 3 : la pente sous la caisse, et le dernier saut (ce que Max relève
  // en roulant sur une colline, TASKS.md « POUR MAX, SUR LA TABLETTE »)
  if (pente != null) l += ` · pente ${Math.round(pente * 100)} %`;
  if (suivi) l += ` · suit une voiture à ${suivi.v.toFixed(0)} blocs/s, ${suivi.ecart.toFixed(1)} blocs devant`;
  if (atterrissage) l += ` · dernier saut ${atterrissage.air.toFixed(1)} s, ${atterrissage.hauteur.toFixed(1)} blocs, choc ${atterrissage.force.toFixed(2)}`;
  return l;
}
