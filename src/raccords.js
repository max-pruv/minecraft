// LES RACCORDS D'AUTOROUTE NE PARTAGENT PAS LA VOIE D'UN ANNEAU (v442).
//
// Une autoroute entre dans une ville engendrée par son avenue d'entrée (v310) :
// l'axe de la trame, jusqu'à douze blocs de la place. Or cet axe est souvent
// le côté d'un anneau de la ville — et la file de l'autoroute y roulait dans la
// MÊME voie qu'un ou plusieurs convois de l'anneau, même sens ou en face. Deux
// grilles horaires indépendantes (v305) sur une voie ne se cadencent pas l'une
// contre l'autre : 6,4 % de paires au contact à Madrid, mesuré au navigateur.
//
// Deux pistes ont été mesurées (sonde-rue-dense.cjs raccords) :
//   - ARRÊTER L'AUTOROUTE À LA PORTE dans ces villes : plus aucun partage,
//     mais les voitures n'entrent plus du tout (le contraire de la v300) ;
//   - LE RACCORD S'ARRÊTE AVANT LA PREMIÈRE VOIE D'ANNEAU (`finAvantAnneaux`) :
//     plus aucun partage non plus, et les voitures entrent dans la ville aussi
//     loin que la rue est à elles. C'est elle qu'on garde.
// La troisième, « le raccord devient une file de l'anneau » (une seule
// grille), n'existe pas sans téléporter : les deux convois n'ont ni la même
// période ni le même nombre de voitures, une voiture de l'autoroute devrait
// devenir une voiture de l'anneau à l'entrée de la voie partagée.
//
// LE CALCUL EST UNE TABLE MESURÉE, PAS UN CALCUL AU DÉMARRAGE. Les autoroutes
// naissent au démarrage (v423) ; les anneaux de leurs trente-six villes coûtent
// 877 ms sous node, derrière « Jouer » (v258). Et le raccord ne peut pas être
// raccourci à l'approche : son tracé fixe la grille de toute la file, que deux
// tablettes doivent partager (v305). La table est donc relevée sous node par la
// règle ci-dessous, et un témoin de `carteMonde.js` la recalcule : si un anneau
// bouge, il rougit et nomme le raccord à remesurer.
//
// Pur : aucune dépendance au monde ni à three.

import { DEMI_VILLE } from './routes.js';

// « route|ville » → distance (blocs, depuis la porte) où l'avenue s'arrête.
// Relevé par `node tests/sonde-rue-dense.cjs raccords` (ligne TABLE).
export const RACCORDS_COURTS = {
  'E19|amsterdam': 10.5, 'A20|quebec': 0.5, 'A-4|madrid': 29, 'A3|cologne': 0,
  'A3|francfort': 0, 'E1|kyoto': 25.5, 'A4|turin': 0, 'Yamuna|delhi': 34.5,
  'Yamuna|agra': 29, 'A1 Sud|naples': 0, 'M1|budapest': 0, 'A1 Nord|milan': 0,
  '401|toronto': 39, 'Hansalinie|cologne': 8, 'Hansalinie|hambourg': 0,
  'I-95|boston': 7.5, 'Tōmei|tokyo': 1, 'A8|marseille': 0, 'US-101|losangeles': 7.5,
  // les villes bâties à la main (v447) : leur entrée finit sur une avenue
  // nommée que des circuits roulent — Lille dès la rue de Paris
  'A1|paris': 262.5, 'A6|paris': 202, 'A1|lille': 11.5, 'A8|nice': 17.5,
};

// Une voie à moins de 1,6 bloc, dans le même axe (|cos| > 0,7) : c'est le
// critère de la sonde des routes (v438), une voiture fait 2,26 de large.
const PROCHE2 = 1.6 * 1.6, AXE = 0.7;
// Le demi-tour se fait à `MARGE` blocs avant la voie partagée : la moitié de
// la voiture (2,2) et de quoi ne pas toucher un convoi qui y passe.
export const MARGE = 4;
// Un raccord plus court que cela n'entre pas : le demi-tour se fait à la porte.
export const RACCORD_MIN = 6;
const CASE = 4;

// les voies des anneaux, échantillonnées au bloc et rangées par case
export function echantillonner(parcours) {
  const g = new Map();
  for (const p of parcours) {
    for (let d = 0; d < p.longueur; d += 1) {
      const q = p.a(d), c = p.capLisse ? p.capLisse(d) : q.cap;
      const k = Math.floor(q.x / CASE) + ',' + Math.floor(q.z / CASE);
      let l = g.get(k); if (!l) g.set(k, l = []);
      l.push(q.x, q.z, c);
    }
  }
  return g;
}

export function voieOccupee(ech, x, z, cap) {
  const cx = Math.floor(x / CASE), cz = Math.floor(z / CASE);
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
    const l = ech.get(i + ',' + j); if (!l) continue;
    for (let k = 0; k < l.length; k += 3) {
      const dx = l[k] - x, dz = l[k + 1] - z;
      if (dx * dx + dz * dz > PROCHE2) continue;
      if (Math.abs(Math.cos(l[k + 2] - cap)) > AXE) return true;
    }
  }
  return false;
}

// Le long de l'avenue (porte → ville), les deux voies du raccord — l'entrante
// à droite, la sortante à gauche, au décalage de `traceRoute` — et la première
// distance où l'une d'elles roule sur la voie d'un anneau. Rend la distance où
// le raccord doit s'arrêter (sa longueur entière s'il ne croise rien).
export function finAvantAnneaux(avenue, ech, o = DEMI_VILLE / 2 + 0.3) {
  let s0 = 0;
  for (let i = 0; i + 1 < avenue.length; i++) {
    const [x0, z0] = avenue[i], [x1, z1] = avenue[i + 1];
    const l = Math.hypot(x1 - x0, z1 - z0);
    if (l < 1e-6) continue;
    const fx = (x1 - x0) / l, fz = (z1 - z0) / l, rx = -fz, rz = fx;
    const cap = Math.atan2(fx, fz);
    for (let d = 0; d <= l; d += 0.5) {
      const x = x0 + fx * d, z = z0 + fz * d;
      if (voieOccupee(ech, x + rx * o, z + rz * o, cap) || voieOccupee(ech, x - rx * o, z - rz * o, cap + Math.PI)) {
        return Math.max(0, s0 + d - MARGE);
      }
    }
    s0 += l;
  }
  return s0;
}

// l'avenue coupée à `fin` blocs de la porte ; trop courte, pas d'avenue
export function raccourcir(avenue, fin) {
  if (!(fin >= RACCORD_MIN)) return undefined;
  const out = [avenue[0]];
  let reste = fin;
  for (let i = 0; i + 1 < avenue.length; i++) {
    const [x0, z0] = avenue[i], [x1, z1] = avenue[i + 1];
    const l = Math.hypot(x1 - x0, z1 - z0);
    if (l >= reste) {
      const t = l > 0 ? reste / l : 0;
      out.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]);
      return out;
    }
    out.push(avenue[i + 1]); reste -= l;
  }
  return out;
}

// ce que main.js donne à `traceRoute` : l'avenue, raccourcie si la table le dit
export function raccordDe(route, cle, avenue) {
  if (!avenue) return avenue;
  const k = route + '|' + cle;
  return k in RACCORDS_COURTS ? raccourcir(avenue, RACCORDS_COURTS[k]) : avenue;
}
