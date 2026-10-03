// Le GPS — s'y rendre au lieu de s'y téléporter (v306).
//
// Max : « une forme de GPS quand on veut se rendre dans une destination. Soit
// on se téléporte, soit on fait GPS. Au clic long, deux boutons : téléporter
// ou s'y rendre. » La téléportation existe depuis longtemps ; ce qui manquait,
// c'est le voyage lui-même — à pied, à cheval, en voiture ou en avion, la
// flèche dit où tourner et combien il reste.
//
// Ce module est PUR, comme `cap.js` dont il reprend la convention de cap (on
// ne l'écrit pas deux fois : deux conventions finissent par diverger, et une
// flèche qui tourne à l'envers passe toute mesure d'amplitude). Ni three, ni
// document : le témoin l'interroge sous node, `main.js` écrit ce qu'il rend.
import { capVers, ecartDeCap, distanceLisible } from './cap.js';
import { lieuxDuMonde } from './mondes.js';

// ON EST ARRIVÉ À DOUZE BLOCS. Un point choisi sur la carte au zoom large vaut
// une dizaine de blocs sous le doigt : exiger le bloc exact ferait tourner
// l'enfant en rond autour d'une cible qu'il a déjà atteinte. Et en avion, à
// cent blocs par seconde, une borne plus serrée se franchirait entre deux
// images sans jamais être vue (on la juge donc aussi sur le SEGMENT parcouru,
// voir `arriveEntre`).
export const ARRIVEE = 12;

// Le nom d'une destination, dit à un enfant : la ville où tombe le point, ou
// « le point choisi ». On ne nomme qu'une ville dont le DISQUE contient le
// point — « vers Paris » pour un champ à trente kilomètres serait faux.
let registre = null;
export function nomDestination(x, z, liste) {
  if (!liste) { if (!registre) registre = lieuxDuMonde('terre'); liste = registre; }
  let meilleure = null;
  for (const l of liste) {
    if (!l.r) continue;
    const d = Math.hypot(l.x - x, l.z - z);
    if (d <= l.r && (!meilleure || d < meilleure.d)) meilleure = { nom: l.nom, d };
  }
  return meilleure ? meilleure.nom : 'le point choisi';
}

// Tout ce que la flèche affiche, en un objet. `rotation` est l'angle, en
// radians, dont on tourne une flèche qui pointe vers le HAUT de l'écran
// (c'est-à-dire devant soi) : positif dans le sens des aiguilles d'une montre,
// donc vers la droite. C'est exactement l'écart de `cap.js`, dont le signe dit
// déjà « positif, à droite ».
export function guidage(x, z, yaw, cible) {
  const dx = cible.x - x, dz = cible.z - z;
  const distance = Math.hypot(dx, dz);
  const ecart = ecartDeCap(yaw, capVers(dx, dz));
  return {
    distance,
    lisible: distanceLisible(distance),
    rotation: ecart,
    arrive: distance <= ARRIVEE,
    // Un mot quand l'enfant tourne le dos : une flèche vers le bas se lit mal
    // à sept ans, « fais demi-tour » se lit tout de suite.
    consigne: Math.abs(ecart) > (2.5 * Math.PI) / 4 ? 'fais demi-tour'
      : Math.abs(ecart) < Math.PI / 12 ? 'tout droit'
        : ecart > 0 ? 'à droite' : 'à gauche',
  };
}

// ARRIVÉ ENTRE DEUX IMAGES. Un avion à 120 blocs par seconde qui rend cinq
// images par seconde avance de vingt-quatre blocs d'une image à l'autre : il
// peut passer AU-DESSUS du disque d'arrivée sans qu'aucune image ne l'y
// trouve, et la flèche se retournerait pour le renvoyer en arrière. On juge
// donc la distance de la cible au SEGMENT parcouru depuis l'image d'avant.
export function arriveEntre(ax, az, bx, bz, cible) {
  const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((cible.x - ax) * vx + (cible.z - az) * vz) / l2)) : 0;
  return Math.hypot(ax + vx * t - cible.x, az + vz * t - cible.z) <= ARRIVEE;
}

// LA FLÈCHE TOURNE PAR L'ÉCART LE PLUS COURT (v321). `guidage` rend un angle
// dans ]−π, π] ; écrit tel quel dans le style, une cible qui passe derrière
// l'enfant fait sauter l'angle de +3,1 à −3,1 et la transition CSS de la
// flèche fait un tour presque complet pour aller de l'un à l'autre. On garde
// donc l'angle AFFICHÉ et l'on n'y ajoute que l'écart le plus court jusqu'au
// nouveau : la flèche ne tourne jamais de plus d'un demi-tour d'une image à
// l'autre. `precedente` nul (premier affichage) rend l'angle tel quel.
export function rotationContinue(precedente, nouvelle) {
  if (precedente == null || !Number.isFinite(precedente)) return nouvelle;
  let d = (nouvelle - precedente) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  else if (d <= -Math.PI) d += 2 * Math.PI;
  return precedente + d;
}

// LA DESTINATION SUR LA MINICARTE (v321). La minicarte est orientée nord en
// haut et centrée sur l'enfant ; `radius` blocs de chaque côté tiennent dans
// `size` pixels. Une cible dans le cadre est un REPÈRE à son pixel ; hors du
// cadre, une FLÈCHE posée au bord, du côté de la cible — la même règle que les
// amis hors cadre, qui marche depuis toujours. `marge` garde la flèche
// entière dans la vignette. Pur : le témoin l'interroge sous node, `main.js`
// dessine ce qu'il rend.
export function repereMinicarte(px, pz, cible, radius, size, marge = 9) {
  const pcx = Math.floor(px), pcz = Math.floor(pz);
  const n = radius * 2 + 1;
  const x = ((cible.x - pcx + radius) / n) * size;
  const y = ((cible.z - pcz + radius) / n) * size;
  if (x >= marge && x <= size - marge && y >= marge && y <= size - marge) {
    return { dedans: true, x, y };
  }
  const angle = Math.atan2(cible.z - pz, cible.x - px);
  return {
    dedans: false,
    angle,
    x: size / 2 + Math.cos(angle) * (size / 2 - marge),
    y: size / 2 + Math.sin(angle) * (size / 2 - marge),
  };
}
