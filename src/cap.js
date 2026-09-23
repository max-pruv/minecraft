// Le cadran de cap — où l'on va, et quelle ville est devant (v263).
//
// Max : « un cadran de pilote en avion : la ville visée au loin ». Aux
// commandes, l'enfant tient l'altitude et le cap au joystick (v228) ; ce qui
// lui manquait, c'est de SAVOIR où son nez pointe. Le monde fait des
// milliers de blocs de large, et à cent blocs par seconde on ne reconnaît
// rien avant d'y être.
//
// Ce module est PUR : ni three, ni document, ni le monde chargé. Il ne lit
// que le registre des lieux (`mondes.js`) — villes bâties à la main ET les
// deux cents villes engendrées, puisqu'elles y vivent toutes — et l'on peut
// donc l'interroger sous node, ce que fait le témoin.
//
// LA CONVENTION DE CAP EST CELLE DU JOUEUR, PAS UNE DE PLUS : `player.js`
// avance en (−sin yaw, −cos yaw). Le nord de la carte est −z (la latitude
// monte quand z descend, voir la projection), l'est est +x. Le cap en degrés
// est donc (−yaw) ramené dans [0, 360) : yaw = 0 regarde le nord, yaw = −π/2
// l'est. Un signe se REGARDE (leçon du roulis, v231) : le témoin vérifie que
// se tourner vers +x affiche l'est.
import { lieuxDuMonde, MONDES } from './mondes.js';

// Le cône devant l'appareil : ±45°. C'est le champ du pare-brise, à peu
// près (46° de champ de vision, v218) — ce que l'enfant peut voir arriver.
export const CONE = Math.PI / 4;

let registre = null;
function lieux(mondeId = 'terre') {
  if (!registre) registre = lieuxDuMonde(mondeId).map((l) => ({ cle: l.cle, nom: l.nom, x: l.x, z: l.z, r: l.r }));
  return registre;
}

// Le yaw qu'il faut pour se diriger vers (dx, dz).
export function capVers(dx, dz) {
  return Math.atan2(-dx, -dz);
}

// L'écart entre le cap tenu et le cap voulu, dans [−π, π] : négatif, la
// cible est à gauche (il faut augmenter le yaw) ; positif, à droite.
export function ecartDeCap(yaw, voulu) {
  let e = yaw - voulu;
  while (e > Math.PI) e -= 2 * Math.PI;
  while (e < -Math.PI) e += 2 * Math.PI;
  return e;
}

// Le cap en degrés, comme sur un vrai cadran : 0 nord, 90 est, 180 sud.
export function capDegres(yaw) {
  const d = Math.round((-yaw * 180) / Math.PI) % 360;
  return (d + 360) % 360;
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export function pointCardinal(degres) {
  return POINTS[Math.round(degres / 45) % 8];
}

// LA VILLE VISÉE. Parmi les lieux du registre où l'on n'est PAS déjà (à
// plus de son rayon), la plus PROCHE de celles qui tombent dans le cône
// devant l'appareil ; s'il n'y en a aucune, la plus proche tout court, avec
// son écart de cap pour dire de quel côté tourner. « La plus proche » et
// non « la mieux alignée » : à un enfant, une ville à dix kilomètres à
// vingt degrés vaut plus qu'une capitale à mille kilomètres pile devant.
//
// ET LE CADRAN NE PAPILLONNE PAS : deux villes à distance presque égale dans
// le cône (Lyon et Genève à cent kilomètres, mesuré en sonde) se
// relaieraient à chaque image. La ville déjà nommée (`precedent`) est
// gardée tant qu'elle reste dans le cône et à moins de quinze pour cent de
// plus que la plus proche. L'état est PASSÉ, la fonction reste pure.
export const TOLERANCE = 1.15;
export function villeVisee(x, z, yaw, precedent = null, liste = lieux()) {
  let dansLeCone = null, proche = null, tenue = null;
  for (const l of liste) {
    const dx = l.x - x, dz = l.z - z;
    const d = Math.hypot(dx, dz);
    if (d <= l.r) continue;                       // on y est déjà
    const ecart = ecartDeCap(yaw, capVers(dx, dz));
    const c = { cle: l.cle, nom: l.nom, x: l.x, z: l.z, distance: d, ecart, dansLeCone: Math.abs(ecart) <= CONE };
    if (c.dansLeCone && (!dansLeCone || d < dansLeCone.distance)) dansLeCone = c;
    if (!proche || d < proche.distance) proche = c;
    if (precedent && c.cle === precedent && c.dansLeCone) tenue = c;
  }
  if (tenue && dansLeCone && tenue.distance <= dansLeCone.distance * TOLERANCE) return tenue;
  return dansLeCone || proche;
}

// Une distance en blocs, dite comme sur un panneau : en kilomètres au-delà
// d'un, en mètres en dessous. L'échelle se DEMANDE à la projection, elle ne
// se recopie pas (leçon de `chercheMer`, v199).
export function distanceLisible(blocs, mondeId = 'terre') {
  const km = blocs * MONDES[mondeId].projection.kmParBloc;
  if (km >= 100) return `${Math.round(km)} km`;
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km * 1000)} m`;
}

// Tout ce que le cadran affiche, en un objet : ce que `main.js` écrit dans
// le DOM et ce que le témoin relit.
export function cadran(x, z, yaw, precedent = null, liste) {
  const v = villeVisee(x, z, yaw, precedent, liste);
  const degres = capDegres(yaw);
  if (!v) return { degres, point: pointCardinal(degres), ville: null };
  return {
    degres, point: pointCardinal(degres),
    ville: v.nom, cle: v.cle, distance: v.distance, lisible: distanceLisible(v.distance),
    ecart: v.ecart, dansLeCone: v.dansLeCone,
    // Le repère glisse sur la règle : 0 au centre, ±1 aux bords du cône.
    repere: Math.max(-1, Math.min(1, -v.ecart / CONE)),
  };
}
