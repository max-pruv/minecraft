// L'APPROCHE ASSISTÉE — ✈️ « Se poser » va chercher une piste (aviation,
// octobre 2026).
//
// Max : « améliore la séquence d'atterrissage parce que l'avion est compliqué
// à gérer ». Jusqu'ici (v261) ✈️ descendait OÙ L'ON ÉTAIT : au-dessus d'une
// forêt, l'avion se posait dans la forêt ; à côté d'une piste, il fallait
// l'aligner soi-même, au joystick, à soixante blocs par seconde. Un enfant de
// sept ans n'y arrive pas, et il n'a aucune raison d'y arriver : un vrai pilote
// a un ILS.
//
// Ce module est PUR (aucun three, aucun document, un seul import pur) : la
// liste des pistes du monde, le choix de la piste, et la loi de guidage. Le
// joueur (`player.js`) l'applique, le cadran de cap l'affiche, et les témoins
// le lisent sous node. Une seule règle, trois lecteurs (discipline de
// `postesAvion`).
//
// LA SÉQUENCE, dans l'ordre où l'enfant la vit :
//
//   ralliement   l'avion vole vers le point d'entrée, sur l'axe prolongé de la
//                piste, à `D_ENTREE` blocs du seuil — en tenant la hauteur
//                au-dessus du relief qu'il survole
//   finale       sur l'axe : il s'aligne tout seul, descend sur un plan de
//                `PENTE` (une hauteur `H_ENTREE` à l'entrée, zéro au point de
//                toucher), train sorti, à la vitesse d'approche de sa fiche
//   arrondi      sous `H_ARRONDI`, la descente s'adoucit jusqu'au toucher ;
//                puis le freinage d'avant (v261)
//
// L'enfant garde le joystick : ↔ décale la visée de côté (une correction, pas
// un virage), ↕ monte ou descend un peu sur le plan. Et un second ✈️ remet les
// gaz — la porte de sortie de toute séquence imposée (v290, v366).

import { AEROPORTS, pistesDe } from './aeroport.js';

// À quelle distance une piste se propose. Un chasseur à 120 b/s la rejoint en
// une vingtaine de secondes ; au-delà, le jeu dit où est la plus proche.
export const PORTEE_PISTE = 2600;
export const D_ENTREE = 220;     // le point d'entrée, avant le seuil
export const H_ENTREE = 28;      // la hauteur au point d'entrée, au-dessus de la piste
export const TOUCHER = 8;        // où le plan touche la piste : huit blocs après le seuil — au seuil pile, un
                                 // arrondi un peu court touchait AVANT la piste (Los Angeles, mesuré)
export const PENTE = H_ENTREE / (D_ENTREE + TOUCHER);
export const H_ARRONDI = 3;      // sous cette hauteur, l'arrondi
export const ARRONDI_VZ = 2;     // … qui pose les roues à deux blocs par seconde
export const DESCENTE_MAX = 12;  // ce que le guidage demande au plus, vers le bas
export const MONTEE_MAX = 16;    // … et vers le haut
export const MARGE_RELIEF = 14;  // en ralliement, la hauteur gardée au-dessus du relief

let memo = null;
// LES PISTES DU MONDE, en coordonnées du monde. Une piste est une bande
// est-ouest (toutes le sont) : son axe `z`, ses deux bouts `x0 < x1`, sa
// demi-largeur, et `sol`, la cote du bloc de revêtement — l'avion roule à
// `sol + 1`. Le bout se calcule comme le bâtisseur le dessine (la corde du
// disque pavé à `|z| + demi`), puis le prolongement mesuré s'y ajoute.
export function pistesDuMonde() {
  if (memo) return memo;
  const out = [];
  for (const a of AEROPORTS) {
    for (const p of pistesDe(a)) {
      out.push({ cle: a.cle, nom: a.nom, z: a.z + p.z0, x0: a.x - p.ouest, x1: a.x + p.est,
        demi: p.demi, sol: a.sol, cx: a.x, cz: a.z });
    }
  }
  memo = out;
  return out;
}

// Le cap (convention du joueur : on avance en (−sin yaw, −cos yaw)) d'un
// atterrissage vers l'est (+x) ou vers l'ouest (−x).
export const capDuSens = (sens) => (sens > 0 ? -Math.PI / 2 : Math.PI / 2);

// LA LONGUEUR QU'UN APPAREIL RÉCLAME POUR SE POSER ASSISTÉ : la seconde de
// flottement de l'arrondi à la vitesse d'approche, puis le freinage de sa
// fiche, et dix blocs. Ce n'est pas un goût : c'est exactement la règle de la
// remise des gaz plus bas — une piste plus courte ferait refaire des tours
// sans fin. Une piste trop courte pour CET appareil ne se propose donc pas.
export function longueurRequise(fiche) {
  const a = fiche.approche || Math.max(fiche.decrochage * 1.3, fiche.max * 0.5);
  return Math.round(a * 1.2 + a * a / (2 * (fiche.frein || 30)) + 10);
}

// LA PISTE LA PLUS PROCHE, et le SENS dans lequel s'y poser. On compare les
// points d'entrée — c'est là que l'avion va d'abord — en ajoutant ce que coûte
// le demi-tour : arriver face à l'entrée par l'arrière coûte un tour.
export function pisteLaPlusProche(x, z, yaw, portee = PORTEE_PISTE, fiche = null, exclues = null) {
  let best = null;
  const requise = fiche ? longueurRequise(fiche) : 0;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  for (const p of pistesDuMonde()) {
    const dCentre = Math.hypot(x - (p.x0 + p.x1) / 2, z - p.z);
    if (dCentre > portee + 400 || p.x1 - p.x0 < requise || (exclues && exclues.has(p))) continue;
    for (const sens of [1, -1]) {
      const seuil = sens > 0 ? p.x0 : p.x1;
      const ex = seuil - sens * D_ENTREE, ez = p.z;
      const d = Math.hypot(x - ex, z - ez);
      if (d > portee) continue;
      // Ce que coûte de virer vers l'entrée, puis de s'aligner sur la piste.
      const vx = (ex - x) / (d || 1), vz = (ez - z) / (d || 1);
      const virage1 = Math.acos(Math.max(-1, Math.min(1, fx * vx + fz * vz)));
      const virage2 = Math.acos(Math.max(-1, Math.min(1, vx * sens)));
      const note = d + 120 * (virage1 + virage2);
      if (!best || note < best.note) best = { piste: p, sens, seuil, d, note };
    }
  }
  return best;
}

// L'aérodrome le plus proche, à toute distance : ce que le jeu montre quand
// aucune piste n'est à portée.
export function aerodromeLePlusProche(x, z) {
  let best = null;
  for (const a of AEROPORTS) {
    const d = Math.hypot(x - a.x, z - a.z);
    if (!best || d < best.d) best = { cle: a.cle, nom: a.nom, x: a.x, z: a.z, d };
  }
  return best;
}

// Abscisse le long de la piste (0 au seuil, positive vers le bout) et écart
// latéral, positif à DROITE de la marche : vers l'est (+x) la droite est +z
// (la droite d'une direction (fx, fz) vaut (−fz, fx), v271), vers l'ouest −z.
export function repereDePiste(ap, x, z) {
  const s = (x - ap.seuil) * ap.sens;
  const lat = (z - ap.piste.z) * ap.sens;
  return { s, lat };
}

// LE GUIDAGE. `ap` = { piste, sens, seuil, phase, decalage } (muté : la phase
// avance) ; `pos` la position, `yaw`, `v` la vitesse ; `fiche` le `pilote` de
// la monture ; `solA(x, z)` la cote du relief (sommet de colonne) ;
// `entree` = { strafe, forward } le joystick ; `plein(x, y, z)`, si donné, dit
// si un bloc est plein (ce qui flotte au-dessus d'une piste). Rend le cap visé, la vitesse
// verticale voulue, la vitesse visée, si le train doit sortir et la hauteur au-
// dessus de la piste.
export function guiderApproche(ap, pos, yaw, v, fiche, solA, entree = {}, plein = null) {
  const p = ap.piste, sens = ap.sens;
  const yPiste = p.sol + 1;
  const approche = fiche.approche || Math.max(fiche.decrochage * 1.3, fiche.max * 0.5);
  const { s, lat } = repereDePiste(ap, pos.x, pos.z);
  const capPiste = capDuSens(sens);
  // La correction de l'enfant : ↔ décale la visée, jamais au-delà de la piste.
  ap.decalage = Math.max(-p.demi, Math.min(p.demi, (ap.decalage || 0) + (entree.strafe || 0) * 4 * (entree.dt || 0)));
  // LE POINT DE TOUCHER SE CALCULE SUR LES OBSTACLES DE L'AXE, une fois. Mesuré
  // sous node (`simapproche`) : un rideau d'arbres ou une croupe avant le seuil
  // faisait toucher l'avion AVANT la piste, même en montée — il n'avait plus le
  // temps de passer au-dessus. Le plan passe donc à trois blocs au-dessus de
  // tout ce qui borde l'axe sur la largeur de l'appareil, quitte à toucher plus
  // loin ; et si la piste devient alors trop courte dans ce sens, on prend
  // l'autre sens de la même piste.
  if (ap.toucher === undefined) {
    // AU BLOC PRÈS (v480). Par pas de trois, le balayage enjambait le mur d'une
    // colonne qui borde le seuil de Los Angeles (huit blocs au-dessus de la
    // piste) : le Concorde y entrait. Un obstacle d'une colonne se lit une
    // colonne à la fois, sur la largeur de l'appareil.
    //
    // ET AU-DESSUS DE LA PISTE, CE QUI CROISE LA BOÎTE SUR LE PLAN (v480). Des
    // couronnes d'arbres sans tronc flottent au-dessus des pistes de Roissy et
    // d'Andrews, neuf et dix blocs plus haut. Leur SOMMET ne dit rien : on vole
    // dessous, et compter le sommet de chaque colonne ferait reculer le toucher
    // de proche en proche jusqu'au bout de la piste (mesuré : 238 sur 300).
    // `plein(x, y, z)` demande ce qui se trouve à la hauteur du plan, de
    // l'avion moins un bloc et demi à trois blocs au-dessus ; ce qui s'y trouve,
    // on le passe par-dessus. Sans `plein` (un ancien appelant), la règle
    // d'avant.
    const viser = (sn, seuil) => {
      let T = TOUCHER;
      for (let ss = -D_ENTREE - 40; ss <= 0; ss++) {
        for (let ll = -3; ll <= 3; ll++) {
          const ho = solA(seuil + sn * ss, p.z + ll * sn) + 1 - yPiste;
          if (ho > -2) T = Math.max(T, ss + (ho + 3) / PENTE);
        }
      }
      if (plein) {
        for (let ss = 1; ss <= T; ss++) {
          const hp = (T - ss) * PENTE;
          const y0 = Math.max(yPiste, Math.floor(yPiste + hp - 1.5)), y1 = Math.floor(yPiste + hp + 3);
          for (let ll = -3; ll <= 3; ll++) {
            const x = seuil + sn * ss, z = p.z + ll * sn;
            let gene = false;
            for (let y = y0; y <= y1 && !gene; y++) gene = plein(x, y, z);
            if (gene) T = Math.max(T, ss + 1 + (solA(x, z) + 1 - yPiste + 3) / PENTE);
          }
        }
      }
      return T;
    };
    const requise = (T) => T + approche * 1.2 + approche * approche / (2 * (fiche.frein || 30)) + 10;
    let T = viser(sens, ap.seuil);
    if (requise(T) > p.x1 - p.x0) {
      const autre = -sens, seuilAutre = autre > 0 ? p.x0 : p.x1;
      const T2 = viser(autre, seuilAutre);
      if (T2 < T) { ap.sens = autre; ap.seuil = seuilAutre; T = T2; ap.loin = false; ap.cote = 0; }
    }
    ap.toucher = T;
    // TROP COURTE DANS LES DEUX SENS, une fois les obstacles comptés : on va
    // chercher la piste suivante, comme un vrai pilote qu'on dérouterait.
    if (requise(T) > p.x1 - p.x0 && changerDePiste(ap, pos, yaw, fiche)) return guiderApproche(ap, pos, yaw, v, fiche, solA, entree, plein);
    return guiderApproche(ap, pos, yaw, v, fiche, solA, entree, plein);
  }
  let capVise, yVise, vitesse = approche;
  const R = Math.max(30, v / Math.max(0.2, fiche.virage || 0.5));   // le rayon de virage
  const ecartCap = Math.abs(angle(yaw - capPiste));
  const versMonde = (sl, ll) => ({ x: ap.seuil + sens * sl, z: p.z + ll * sens });
  const reliefDevant = () => {
    let r = solA(pos.x, pos.z);
    for (const k of [0.5, 1, 1.5, 2.5, 4]) r = Math.max(r, solA(pos.x - Math.sin(yaw) * v * k, pos.z - Math.cos(yaw) * v * k));
    return r;
  };
  if (ap.phase === 'ralliement') {
    // LE RALLIEMENT EST UN CHAMP DE CAP, PAS UNE SUITE DE POINTS. Mesuré sous
    // node (sonde `simapproche`) : viser le point d'entrée en ligne droite
    // faisait tourner en rond tout avion arrivé du côté de la piste — il
    // atteignait le point face au mauvais sens et le poursuivait. On
    // s'ÉLOIGNE d'abord (un point loin derrière l'entrée, de son côté de
    // l'axe), puis l'on rejoint l'axe à 45° au plus, et la finale commence
    // quand on y est, dans le bon sens.
    const sLoin = -D_ENTREE - 2 * R;
    if (ap.monter && pos.y - yPiste < H_ENTREE) {
      capVise = capPiste;
    } else if (!ap.loin && s > sLoin + 10) {
      ap.monter = false;
      if (!ap.cote) ap.cote = Math.abs(lat) > 5 ? Math.sign(lat) : 1;
      const P = versMonde(sLoin - R, ap.cote * 2.5 * R);
      capVise = Math.atan2(-(P.x - pos.x), -(P.z - pos.z));
    } else {
      ap.loin = true;
      capVise = capPiste + Math.max(-0.8, Math.min(0.8, Math.atan(lat / Math.max(40, R))));
      if (Math.abs(lat) < 10 && ecartCap < 0.35 && s < -D_ENTREE * 0.6) ap.phase = 'finale';
      // passé l'entrée sans s'être aligné : on recommence le tour
      if (s > -D_ENTREE * 0.6 && ap.phase === 'ralliement') { ap.loin = false; ap.cote = 0; }
    }
    vitesse = Math.min(fiche.max, approche * 1.35);
    const dEntree = Math.hypot(pos.x - (ap.seuil - sens * D_ENTREE), pos.z - p.z);
    yVise = Math.max(yPiste + H_ENTREE + Math.min(60, Math.max(0, dEntree - 60) * 0.08), reliefDevant() + MARGE_RELIEF);
  }
  if (ap.phase === 'finale' || ap.phase === 'arrondi') {
    // Le cap : l'axe, plus une interception proportionnelle à l'écart.
    // `lat` est positif à DROITE de la marche ; tourner à gauche, c'est
    // AUGMENTER le cap (le joueur fait `yaw -= strafe`). Vérifié sous node
    // dans les deux sens, à gauche et à droite de l'axe : un signe se mesure.
    const L = Math.max(40, v * 1.4);
    const ecart = lat - (ap.decalage || 0);
    capVise = capPiste + Math.atan(ecart / L);
    // Le plan : une hauteur proportionnelle à la distance au point de toucher.
    const hPlan = Math.max(0, (ap.toucher - s) * PENTE);
    const plan = yPiste + Math.min(H_ENTREE + 30, hPlan) + (entree.forward || 0) * 3;
    yVise = plan;
    if (s < -10) yVise = Math.max(yVise, reliefDevant() + 4);
    ap.surPlan = yVise === plan;
    // TROP LONG POUR S'ARRÊTER : ON REMET LES GAZ. Le toucher le plus loin
    // qu'on accepte laisse la distance de freinage de la fiche, et dix blocs.
    // C'est ce qui garantit qu'une approche assistée ne finit JAMAIS au bout
    // de la piste : un relief qui la tient haute, un enfant qui tire sur le
    // manche — elle refait un tour au lieu de toucher trop loin.
    const freinage = approche * approche / (2 * (fiche.frein || 30));
    if (s > (p.x1 - p.x0) - freinage - 10 && pos.y - yPiste > 0.6) {
      ap.phase = 'ralliement'; ap.loin = false; ap.cote = 0; ap.tours = (ap.tours || 0) + 1; ap.remise = true;
      // ON MONTE TOUT DROIT AVANT DE VIRER : virer au ras de la piste faisait
      // passer l'avion dans l'aérogare de Roissy (mesuré sous node).
      ap.monter = true;
      // DEUX TOURS MANQUÉS SUR LA MÊME PISTE : on en prend une autre (Fiumicino
      // faisait des tours sans fin, mesuré).
      if (ap.tours >= 2) changerDePiste(ap, pos, yaw, fiche);
    } else if (Math.abs(lat) > 40) {
      // dérivé de l'axe : on repart en tour de piste
      ap.phase = 'ralliement'; ap.loin = false; ap.cote = 0;
    } else if (pos.y - yPiste < H_ARRONDI && s > -30) ap.phase = 'arrondi';
  }
  // La vitesse verticale : on rejoint la hauteur visée en deux secondes, et
  // l'arrondi pose les roues à moins de deux blocs par seconde.
  let vy;
  const h = pos.y - yPiste;
  if (ap.phase === 'arrondi') {
    vy = -Math.max(ARRONDI_VZ, Math.min(PENTE * v, h * 1.5));
  } else {
    vy = (yVise - pos.y) / 2 - (ap.phase === 'finale' && ap.surPlan ? PENTE * v : 0);
    vy = Math.max(-DESCENTE_MAX, Math.min(MONTEE_MAX, vy));
    // PRÈS DE LA PISTE, ON NE PLONGE PAS. Un relief qui a tenu l'avion haut
    // jusqu'au seuil le laissait ensuite descendre à douze blocs par seconde,
    // et il touchait à huit (Roissy, Los Angeles : mesuré). La descente se borne
    // à la hauteur qui reste — l'arrondi prend le relais sous trois blocs.
    if (ap.phase === 'finale' && s > -40) vy = Math.max(vy, -(ARRONDI_VZ + h));
  }
  const train = ap.phase !== 'ralliement' || Math.hypot(pos.x - ap.seuil, pos.z - p.z) < D_ENTREE * 1.6;
  return { capVise, vy, vitesse, train, s, lat, h, phase: ap.phase };
}

// Le point (x, z) est-il SUR une piste — dans sa largeur, entre ses bouts ?
export function surUnePiste(x, z) {
  for (const p of pistesDuMonde()) if (Math.abs(z - p.z) <= p.demi + 1 && x >= p.x0 - 1 && x <= p.x1 + 1) return p;
  return null;
}

// Remplace la piste visée par la plus proche des AUTRES. Rend vrai si l'on a
// changé.
function changerDePiste(ap, pos, yaw, fiche) {
  ap.exclues = ap.exclues || new Set();
  ap.exclues.add(ap.piste);
  const c = pisteLaPlusProche(pos.x, pos.z, yaw, PORTEE_PISTE * 1.5, fiche, ap.exclues);
  if (!c) return false;
  Object.assign(ap, { piste: c.piste, sens: c.sens, seuil: c.seuil, phase: 'ralliement', loin: false, cote: 0,
    toucher: undefined, tours: 0, change: true });
  return true;
}

// Ramène un angle dans ]−π, π].
export function angle(a) {
  a = ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return a === -Math.PI ? Math.PI : a;
}
