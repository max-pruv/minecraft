// CE QUE L'ENFANT VOIT ET ENTEND AU VOLANT (v370).
//
// Max (4 octobre 2026) : « une grosse refonte de la façon de conduire… comme
// GTA ». Ce fichier porte la part SENSIBLE de la conduite, et rien de la
// physique : la caméra de poursuite, la caisse qui vit (roulis, tangage, roues
// avant qui braquent, roues qui roulent), et le son (rapports, crissement,
// choc, toux, crépitement). La physique — vitesse, cap, collisions — vit dans
// `player.js` et ne se lit ici qu'en LECTURE.
//
// LE CONTRAT, chaque champ lu SI PRÉSENT (six sessions livrent en parallèle,
// chacune doit marcher sans les autres) : `vitesseVoiture`,
// `vitesseVoitureMax`, `braquage` (−1..1, positif à droite comme le joystick),
// `derive` (rad), `choc` = { force 0..1, t }, `etatVoiture` = { moteur 0..1,
// enPanne, enFeu }, `embarquement` = { phase }. Ce qui manque se DÉDUIT de ce
// que la voiture fait : le braquage de la vitesse de cap, le choc d'une
// vitesse qui s'effondre d'une image à l'autre.
//
// TROIS RÈGLES TIENNENT CE FICHIER :
//
//   1. RIEN NE SE DESSINE EN PLUS. Ni maillage, ni matériau, ni lumière : la
//      caisse tourne, la caméra bouge, le champ s'ouvre. Pas un appel de
//      dessin, pas un programme de shader de plus (v246, v319). Les deux
//      groupes de braquage insérés au-dessus des roues avant sont des
//      `Group`, qui ne se dessinent pas.
//   2. CE QUI EST UNE ANIMATION SUIT LE TEMPS DU JEU (`dt`, v226) : une
//      caméra qui compterait en temps réel tournerait plus vite que le monde
//      sur une tablette qui rame, et l'image se déchirerait.
//   3. UN SIGNE SE MESURE DANS LA MATRICE (v231, v244, v261). Le roulis penche
//      vers l'EXTÉRIEUR du virage, la roue avant pointe vers l'INTÉRIEUR :
//      deux témoins de `monte.js` les lisent dans la matrice monde rendue,
//      jamais dans une variable.

import * as THREE from 'three';
import { voitureSons, bruitDeChoc, moteurRegime } from './sons.js';

const PARAMS = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

// `?sensations=0` rejoue la conduite d'avant (v336) : la caméra rivée, la
// caisse figée, le moteur sans rapports. Pour MESURER — une sonde le bascule
// aussi en cours de page (`reglage.actif`), en ordre alterné (v268) — jamais
// un réglage de la famille.
export const reglage = { actif: PARAMS.get('sensations') !== '0' };

// --- la caméra ---------------------------------------------------------------

// LE RETARD DU CAP (v278) : combien de fois par seconde de JEU l'écart se
// réduit de moitié, à peu près. Mesuré par `?camlag=` : c'est lui qui montre
// le flanc de la voiture en virage.
export const REACTIVITE_CAM = Number(PARAMS.get('camlag')) || 3.2;

// LA VITESSE SE RESSENT, ELLE NE SE LIT PAS AU COMPTEUR. Trois choses la
// disent dans un jeu de conduite : la caméra recule, elle s'abaisse un peu
// derrière la voiture, et le champ s'ouvre — les bords de l'image défilent
// plus vite. La part de vitesse `s` sature en douceur (1 − e^(−v/30)) : 0,33 à
// douze blocs par seconde (une citadine), 0,58 à vingt-six (l'hypercar), 0,86
// à soixante — les vitesses vont monter (session de la physique) et la caméra
// doit tenir jusque-là sans partir dans le décor. Un bloc vaut ici un mètre.
export const V_SENSATION = 30;
export const FOV_EN_PLUS = 16;        // degrés de champ à pleine sensation
export const RECUL_EN_PLUS = 0.32;    // fraction du recul de la fiche
export const BAISSE = 0.14;           // fraction de la hauteur perdue
const REGARD_VIRAGE = 0.08;           // rad : on regarde un peu DANS le virage
const RETARD_MAX = 0.55;              // rad : le plus grand retard du cap de la caméra

export function partDeVitesse(v) {
  return 1 - Math.exp(-Math.abs(v || 0) / V_SENSATION);
}

// Pure, pour un témoin sous node : ce que la caméra VEUT à une vitesse donnée.
export function reglagesPoursuite(c, s, fovBase) {
  return {
    recul: c.recul * (1 + RECUL_EN_PLUS * s),
    hauteur: c.hauteur * (1 - BAISSE * s),
    fov: fovBase + FOV_EN_PLUS * s,
  };
}

// UN SEGMENT EST LIBRE S'IL NE TRAVERSE AUCUN BLOC PLEIN — parcouru cellule par
// cellule (DDA), pas échantillonné à pas fixe. L'ancienne recherche partait à
// 3,2 blocs, par pas de 0,6 : un mur collé au pare-chocs arrière, entre 2,2 et
// 3,2 blocs, n'était jamais vu, et la caméra se posait DE L'AUTRE CÔTÉ du mur.
export function segmentLibre(isSolid, a, b) {
  let x = Math.floor(a.x), y = Math.floor(a.y), z = Math.floor(a.z);
  const ex = Math.floor(b.x), ey = Math.floor(b.y), ez = Math.floor(b.z);
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
  const tdx = sx ? Math.abs(1 / dx) : Infinity, tdy = sy ? Math.abs(1 / dy) : Infinity, tdz = sz ? Math.abs(1 / dz) : Infinity;
  let tx = sx ? (sx > 0 ? x + 1 - a.x : a.x - x) * tdx : Infinity;
  let ty = sy ? (sy > 0 ? y + 1 - a.y : a.y - y) * tdy : Infinity;
  let tz = sz ? (sz > 0 ? z + 1 - a.z : a.z - z) * tdz : Infinity;
  for (let n = 0; n < 96; n++) {
    if (isSolid(x, y, z)) return false;
    if (x === ex && y === ey && z === ez) return true;
    if (tx <= ty && tx <= tz) { if (tx > 1) return true; x += sx; tx += tdx; }
    else if (ty <= tz) { if (ty > 1) return true; y += sy; ty += tdy; }
    else { if (tz > 1) return true; z += sz; tz += tdz; }
  }
  return true;
}

const TOIT = 1.4, PLANCHER_RECUL = 3.2;
const _yeux = new THREE.Vector3(), _cam = new THREE.Vector3();

// L'ANCIENNE POURSUITE, telle quelle, pour ce qui VOLE. Les témoins des avions
// lisent cette caméra ; on ne la touche pas d'un bloc.
function poursuiteAvion(a, player, dt) {
  if (a.camYaw == null) a.camYaw = player.yaw;
  let ecart = player.yaw - a.camYaw;
  while (ecart > Math.PI) ecart -= Math.PI * 2;
  while (ecart < -Math.PI) ecart += Math.PI * 2;
  a.camYaw += ecart * Math.min(1, dt * REACTIVITE_CAM);
  const c = a.def.poursuite, cy = Math.cos(a.camYaw), sy = Math.sin(a.camYaw);
  const hauteurA = (d) => TOIT + (c.hauteur - TOIT) * (d / c.recul);
  let recul = c.recul;
  for (let d = PLANCHER_RECUL; d <= c.recul; d += 0.6) {
    const bx = player.pos.x + sy * d, bz = player.pos.z + cy * d;
    if (player.world.isSolid(Math.floor(bx),
      Math.floor(player.pos.y + hauteurA(d)), Math.floor(bz))) {
      recul = Math.max(PLANCHER_RECUL, d - 0.6);
      break;
    }
  }
  player.camera.position.set(
    player.pos.x + sy * recul,
    player.pos.y + hauteurA(recul),
    player.pos.z + cy * recul,
  );
}

// LA POURSUITE DE LA VOITURE. L'état vit sur la monture (`a.sens`), parce que
// c'est elle qu'on conduit : on en change, l'état repart de zéro.
function poursuiteVoiture(a, player, dt, m) {
  const cam = player.camera;
  const S = a.sens;
  // PENDANT LA MONTÉE ET LA DESCENTE ANIMÉES, LA CAMÉRA N'EST PAS À NOUS : la
  // séquence de la portière la tient. On note seulement qu'il faudra la
  // reprendre EN DOUCEUR — un saut de caméra à la fin de l'animation
  // casserait tout ce qu'elle vient de montrer.
  const emb = player.embarquement;
  if (emb && emb.phase) { S.reprise = 0; S.camYaw = null; return; }

  if (S.camYaw == null) S.camYaw = player.yaw;
  let ecart = player.yaw - S.camYaw;
  while (ecart > Math.PI) ecart -= Math.PI * 2;
  while (ecart < -Math.PI) ecart += Math.PI * 2;
  ecart -= ecart * Math.min(1, dt * REACTIVITE_CAM);
  // LE RETARD EST BORNÉ : sur une tablette qui rame, un virage serré l'ouvrait
  // jusqu'à faire sortir la voiture du cadre. Trente degrés montrent le flanc,
  // au-delà on ne voit plus que le décor.
  ecart = Math.max(-RETARD_MAX, Math.min(RETARD_MAX, ecart));
  S.camYaw = player.yaw - ecart;

  // LA SENSATION DE VITESSE SE LISSE (≈ 0,4 s) : un recul qui suivrait la
  // vitesse à l'image près ferait respirer la caméra à chaque bosse. Et c'est
  // ce lissage qui donne le RETARD ÉLASTIQUE : à l'accélération la voiture
  // file devant et la caméra la rattrape, au freinage elle se rapproche.
  const sVoulue = partDeVitesse(m.v);
  S.s += (sVoulue - S.s) * Math.min(1, dt * 2.5);
  const fovBase = cam.userData.fovBase;
  const r = reglagesPoursuite(a.def.poursuite, S.s, fovBase);
  const cy = Math.cos(S.camYaw), sy = Math.sin(S.camYaw);
  const hauteurA = (d) => TOIT + (r.hauteur - TOIT) * (d / r.recul);

  // LA CAMÉRA NE TRAVERSE PAS LES MURS. Du toit de la voiture vers chaque
  // poste candidat, du plus loin au plus près, on garde le premier dont le
  // segment est libre de bout en bout. Sous le pare-chocs arrière (2,2 blocs),
  // la caméra s'élève au-dessus du coffre plutôt que d'entrer dans la
  // carrosserie : c'est ce que fait GTA dos à un mur.
  const isSolid = (x, y, z) => player.world.isSolid(x, y, z);
  _yeux.set(player.pos.x, player.pos.y + TOIT, player.pos.z);
  let recul = 0, haut = hauteurA(0) + PLANCHER_RECUL * 0.6;
  for (let d = r.recul; d >= 0; d -= 0.35) {
    const h = hauteurA(d) + Math.max(0, PLANCHER_RECUL - d) * 0.6;
    _cam.set(player.pos.x + sy * d, player.pos.y + h, player.pos.z + cy * d);
    // un demi-bloc de marge derrière la caméra : le plan proche ne doit pas
    // mordre dans le mur qu'on vient d'éviter
    const marge = d > 0.5 ? 0.45 : 0;
    _cam.x += sy * marge; _cam.z += cy * marge;
    if (segmentLibre(isSolid, _yeux, _cam)) { recul = d; haut = h; break; }
  }
  // ON SE RAPPROCHE TOUT DE SUITE, ON RECULE EN DOUCEUR : une caméra qui
  // passerait le mur une image en retard le montrerait de l'intérieur.
  if (S.recul == null || recul < S.recul) S.recul = recul;
  else S.recul += (recul - S.recul) * Math.min(1, dt * 3);
  if (S.haut == null) S.haut = haut;
  else S.haut += (haut - S.haut) * Math.min(1, dt * 6);

  let x = player.pos.x + sy * S.recul, y = player.pos.y + S.haut, z = player.pos.z + cy * S.recul;

  // LA SECOUSSE DU CHOC : brève, proportionnelle à la force, et qui s'éteint
  // d'elle-même (e^(−9t)). Deux sinus de fréquences voisines plutôt qu'un
  // hasard : un hasard tiré à chaque image dépendrait de la cadence.
  let roulisCam = 0;
  if (S.secousse > 0.001) {
    S.tSecousse += dt;
    const amp = S.secousse * Math.exp(-9 * S.tSecousse);
    if (amp < 0.004) S.secousse = 0;
    const ox = amp * Math.sin(S.tSecousse * 53), oy = amp * 0.7 * Math.sin(S.tSecousse * 41 + 1);
    x += cy * ox; z -= sy * ox; y += oy;
    roulisCam = amp * 0.09 * Math.sin(S.tSecousse * 37);
  }

  // LA REPRISE APRÈS L'EMBARQUEMENT : on part d'où la séquence a laissé la
  // caméra, et l'on rejoint la poursuite en trois quarts de seconde.
  if (S.reprise < 1) {
    if (S.reprise === 0) S.depart = cam.position.clone();
    S.reprise = Math.min(1, S.reprise + dt / 0.75);
    const k = S.reprise * S.reprise * (3 - 2 * S.reprise);
    x = S.depart.x + (x - S.depart.x) * k;
    y = S.depart.y + (y - S.depart.y) * k;
    z = S.depart.z + (z - S.depart.z) * k;
  }
  cam.position.set(x, y, z);

  // LA CAMÉRA REGARDE LA VOITURE, ET UN PEU DANS LE VIRAGE. Avant, elle
  // regardait dans l'axe de la voiture depuis une place en retard : en virage
  // la voiture glissait vers le bord du cadre, et jugé en capture elle en
  // SORTAIT. On vise désormais à mi-chemin entre la caméra et l'axe de la
  // voiture — elle reste dans le cadre et montre son flanc —, plus un regard
  // du côté où l'on tourne (braquage positif à droite, donc un cap qui
  // diminue). Le tangage reste celui de l'enfant (le regard libre, v249).
  S.regard += (-m.braquage * REGARD_VIRAGE - S.regard) * Math.min(1, dt * 4);
  cam.rotation.set(player.pitch, S.camYaw + ecart * 0.4 + S.regard, roulisCam, 'YXZ');

  // LE CHAMP S'OUVRE AVEC LA VITESSE. On ne recalcule la projection que s'il a
  // bougé d'un centième de degré.
  if (Math.abs(cam.fov - r.fov) > 0.01) { cam.fov = r.fov; cam.updateProjectionMatrix(); }
}

// --- la caisse ---------------------------------------------------------------

const ROULIS_MAX = 0.075;      // rad, ~4°
const TANGAGE_MAX = 0.05;      // rad, ~3° au freinage
const BRAQUAGE_ROUES = 0.5;    // rad, ~29° à plein volant
const _q = new THREE.Quaternion(), _qm = new THREE.Quaternion(), _up = new THREE.Vector3();

// LES ROUES AVANT BRAQUENT AUTOUR DE L'AXE VERTICAL DE LA VOITURE, pas de leur
// parent : un nœud de modèle peut porter n'importe quelle rotation (les
// exports à z vertical, les quarts de tour de `normaliserVoiture`). On glisse
// donc entre le pivot et son parent un groupe neutre, et l'axe de braquage se
// calcule UNE FOIS, dans le repère de ce parent. La rotation du pivot — la
// roue qui roule, autour du x de SON parent (v250) — tourne alors avec le
// braquage, comme un vrai essieu directeur.
function installerBraquage(mesh) {
  const roues = mesh.userData.roues;
  if (!roues || !roues.length || mesh.userData.braquage === roues) return;
  mesh.userData.braquage = roues;
  const avant = [];
  mesh.updateMatrixWorld(true);
  mesh.getWorldQuaternion(_qm);
  for (const p of roues) {
    if (!/^Wheel_F/i.test(p.name || '') || !p.parent) continue;
    const parent = p.parent;
    const g = new THREE.Group();
    g.name = 'Braquage_' + p.name.slice(6);
    g.position.copy(p.position);
    parent.add(g);
    p.position.set(0, 0, 0);
    g.add(p);
    // le haut de la VOITURE, exprimé dans le repère du parent
    parent.getWorldQuaternion(_q);
    _up.set(0, 1, 0).applyQuaternion(_qm).applyQuaternion(_q.invert()).normalize();
    g.userData.axe = _up.clone();
    avant.push(g);
  }
  mesh.userData.directrices = avant;
}

function vieDeVoiture(a, player, dt, m) {
  const mesh = a.mesh, S = a.sens;
  installerBraquage(mesh);

  // LE ROULIS : la caisse penche vers l'EXTÉRIEUR du virage, d'autant plus
  // que l'accélération latérale (v × vitesse de cap) est forte. Un virage à
  // gauche fait monter le cap ; la caisse penche alors à droite, c'est-à-dire
  // une rotation z NÉGATIVE (le nez est en −z, la droite en +x).
  // LE TANGAGE : le nez se lève à l'accélération et plonge au freinage —
  // rotation x positive = nez levé, le signe des avions (v261).
  // Un ressort amorti, pas un lissage : une caisse qui se pose fait un petit
  // rebond, et c'est ce rebond qui dit qu'elle a du poids.
  const roulisVise = Math.max(-ROULIS_MAX, Math.min(ROULIS_MAX, -m.lat * 0.0042));
  const tangageVise = Math.max(-TANGAGE_MAX, Math.min(TANGAGE_MAX * 0.6, m.acc * 0.0035));
  const h = Math.min(dt, 0.05);
  S.wr += ((roulisVise - S.roulis) * 70 - S.wr * 12) * h; S.roulis += S.wr * h;
  S.wt += ((tangageVise - S.tangage) * 70 - S.wt * 12) * h; S.tangage += S.wt * h;
  mesh.rotation.order = 'YXZ';
  mesh.rotation.z = S.roulis;
  mesh.rotation.x = S.tangage;

  // LA DÉRIVE : quand la physique en publie une, la caisse s'oriente à
  // `derive` du sens de la marche. Si le cap de la voiture le dit déjà (la
  // physique fait glisser la vitesse, pas le cap), on n'ajoute rien : on ne
  // tourne que la part qui ne se voit pas encore.
  let derive = 0;
  if (typeof player.derive === 'number' && Math.abs(m.v) > 1) {
    const vx = player.vel.x, vz = player.vel.z;
    if (Math.hypot(vx, vz) > 1) {
      const capMarche = Math.atan2(-vx, -vz) + (m.v < 0 ? Math.PI : 0);
      let deja = player.yaw - capMarche;
      while (deja > Math.PI) deja -= Math.PI * 2;
      while (deja < -Math.PI) deja += Math.PI * 2;
      derive = Math.max(-0.6, Math.min(0.6, player.derive - deja));
    }
  }
  S.derive += (derive - S.derive) * Math.min(1, dt * 8);
  mesh.rotation.y += S.derive;

  // LES ROUES AVANT BRAQUENT : positif à gauche autour de l'axe vertical, donc
  // l'opposé du braquage (positif à droite).
  S.volant += (-m.braquage * BRAQUAGE_ROUES - S.volant) * Math.min(1, dt * 10);
  for (const g of mesh.userData.directrices || []) g.quaternion.setFromAxisAngle(g.userData.axe, S.volant);

  // LES ROUES ROULENT À LA DISTANCE VRAIMENT PARCOURUE. Le bestiaire le faisait
  // (animals.js) avec une borne de deux blocs par image pour écarter les
  // téléports : à soixante blocs par seconde sur une tablette à vingt images,
  // une image honnête en fait trois, et les roues se figeaient précisément
  // quand on va vite. La borne suit désormais la vitesse : un pas plus long
  // que deux fois ce que la voiture peut faire dans l'image est un téléport.
  // On reprend la main sur le suivi du bestiaire pour ne pas compter deux fois.
  const roues = mesh.userData.roues;
  const suivi = S.suivi || (S.suivi = { x: player.pos.x, z: player.pos.z });
  const dx = player.pos.x - suivi.x, dz = player.pos.z - suivi.z;
  suivi.x = player.pos.x; suivi.z = player.pos.z;
  mesh.userData.roulement = { x: player.pos.x, z: player.pos.z };
  if (roues && roues.length) {
    const avance = -dx * Math.sin(player.yaw) - dz * Math.cos(player.yaw);
    const borne = Math.abs(m.v) * Math.min(dt, 0.25) * 2 + 1.5;
    if (avance !== 0 && Math.abs(avance) < borne) {
      const angle = avance / (mesh.userData.rayonRoue || 0.34);
      for (const r of roues) r.rotation.x += angle;
    }
  }
  mesh.userData.sensations = S;
}

// Rendre une voiture qu'on quitte : à plat, roues droites. Une voiture garée
// qui garderait son dernier roulis serait de travers pour toujours.
export function reposerVoiture(a) {
  if (!a || !a.mesh) return;
  a.mesh.rotation.z = 0; a.mesh.rotation.x = 0;
  for (const g of a.mesh.userData.directrices || []) g.quaternion.identity();
  a.sens = null;
}

// --- le son ------------------------------------------------------------------

// LES RAPPORTS SIMULÉS. Un moteur qui monterait d'une seule traite de zéro à
// la pointe ne ressemble à rien ; ce qui fait une voiture, c'est le régime qui
// grimpe, retombe au passage du rapport, et regrimpe. Des seuils en blocs par
// seconde, donc en mètres par seconde : 7 (25 km/h), 15, 25, 37, 50 — la
// cinquième tient jusqu'à soixante blocs par seconde et au-delà.
export const RAPPORTS = [0, 7, 15, 25, 37, 50];
export function rapportEtRegime(v) {
  const a = Math.abs(v || 0);
  let i = RAPPORTS.length - 1;
  while (i > 0 && a < RAPPORTS[i]) i--;
  if (i === RAPPORTS.length - 1) return { rapport: i + 1, regime: Math.min(1, 0.55 + 0.45 * (a - RAPPORTS[i]) / 25) };
  const f = (a - RAPPORTS[i]) / (RAPPORTS[i + 1] - RAPPORTS[i]);
  return { rapport: i + 1, regime: i === 0 ? 0.12 + 0.83 * f : 0.42 + 0.56 * f };
}

// --- l'image ---------------------------------------------------------------

// Ce que la voiture FAIT, mesuré d'une image à l'autre : vitesse, accélération
// (lissée), vitesse de cap, accélération latérale, braquage. Un saut de cap ou
// de vitesse qui ne peut pas venir de la conduite (une remise en place, un
// témoin qui pose le cap) ne compte pas comme une manœuvre.
function mesurer(a, player, dt) {
  const S = a.sens;
  const v = player.vitesseVoiture || 0;
  const vmax = player.vitesseVoitureMax || 12;
  let dyaw = player.yaw - S.yaw;
  while (dyaw > Math.PI) dyaw -= Math.PI * 2;
  while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  S.yaw = player.yaw;
  const h = Math.max(dt, 1e-3);
  const tauxCap = Math.abs(dyaw) > 0.5 ? 0 : dyaw / h;
  S.tauxCap += (tauxCap - S.tauxCap) * Math.min(1, dt * 10);
  const dv = v - S.v;
  S.v = v;
  const acc = Math.abs(dv) / h > vmax * 6 ? 0 : dv / h;
  S.acc += (acc - S.acc) * Math.min(1, dt * 6);
  let braquage;
  if (typeof player.braquage === 'number') braquage = player.braquage;
  else {
    const vise = Math.abs(v) > 0.5 ? -S.tauxCap / 1.3 * Math.sign(v) : 0;
    braquage = Math.max(-1, Math.min(1, vise));
  }
  // LE CHOC : celui de la physique s'il existe, sinon une vitesse qui
  // s'effondre plus vite qu'aucun frein ne le peut (FREIN_VOITURE vaut 2,5
  // allures par seconde) — c'est la voiture qui a tapé.
  let choc = null;
  if (player.choc && typeof player.choc === 'object') {
    if (player.choc.t !== S.chocVu) { S.chocVu = player.choc.t; if (S.chocVu !== undefined) choc = Math.max(0, Math.min(1, player.choc.force || 0)); }
  } else if (player.choc === undefined) {
    const chute = Math.abs(S.vAvant) - Math.abs(v);
    const freinMax = 2.5 * vmax * Math.min(dt, 0.05);
    if (Math.sign(S.vAvant) === Math.sign(v || S.vAvant) && chute > Math.max(3, freinMax * 1.6 + 1.5)) {
      choc = Math.max(0.1, Math.min(1, chute / 25));
    }
  }
  S.vAvant = v;
  return { v, vmax, acc: S.acc, lat: v * S.tauxCap, braquage, choc };
}

function etatNeuf(player, cam) {
  return { s: 0, camYaw: null, recul: null, haut: null, regard: 0, reprise: 1, depart: null,
    secousse: 0, tSecousse: 0, roulis: 0, wr: 0, tangage: 0, wt: 0, derive: 0, volant: 0,
    yaw: player.yaw, tauxCap: 0, v: player.vitesseVoiture || 0, vAvant: player.vitesseVoiture || 0, acc: 0,
    chocVu: player.choc && player.choc.t, suivi: null, crisse: 0, fovBase: cam.userData.fovBase };
}

// L'ENTRÉE UNIQUE, appelée par `fun.js` à chaque image où l'enfant est porté
// par une monture qui a une vue de poursuite.
export function sensationsAuVolant(a, player, dt) {
  const cam = player.camera;
  if (cam.userData.fovBase == null) cam.userData.fovBase = cam.fov;
  if (a.def.pilote || a.def.moteur !== 'voiture') {
    poursuiteAvion(a, player, dt);
    return;
  }
  if (!reglage.actif) {
    if (a.sens) reposerVoiture(a);
    if (cam.fov !== cam.userData.fovBase) { cam.fov = cam.userData.fovBase; cam.updateProjectionMatrix(); }
    poursuiteAvion(a, player, dt);
    moteurRegime(Math.abs(player.vitesseVoiture || 0) / (player.vitesseVoitureMax || 1));
    return;
  }
  if (!a.sens) a.sens = etatNeuf(player, cam);
  const m = mesurer(a, player, dt);
  if (m.choc != null && m.choc > 0) {
    a.sens.secousse = Math.max(a.sens.secousse, 0.12 + 0.5 * m.choc);
    a.sens.tSecousse = 0;
    bruitDeChoc(m.choc);
  }
  vieDeVoiture(a, player, dt, m);
  poursuiteVoiture(a, player, dt, m);

  // LE SON SUIT CE QUE LA VOITURE FAIT : le rapport et le régime viennent de
  // la vitesse, la CHARGE de l'accélération (un moteur qui tire gronde plus
  // fort qu'un moteur qui roule sur sa lancée). Les pneus crissent en dérive,
  // au freinage appuyé et dans un virage pris trop vite.
  const { regime } = rapportEtRegime(m.v);
  const charge = Math.max(0, Math.min(1, (m.acc * Math.sign(m.v || 1)) / (m.vmax * 1.2)));
  const derive = typeof player.derive === 'number' ? Math.abs(player.derive) : 0;
  const freinFort = -m.acc * Math.sign(m.v || 1) > 22 && Math.abs(m.v) > 6;
  const crisseVise = Math.min(1, Math.max(
    derive > 0.12 ? (derive - 0.12) * 4 : 0,
    freinFort ? 0.6 : 0,
    Math.abs(m.lat) > 16 ? (Math.abs(m.lat) - 16) / 14 : 0));
  a.sens.crisse += (crisseVise - a.sens.crisse) * Math.min(1, dt * 8);
  const ev = player.etatVoiture || {};
  voitureSons({
    regime, charge, crissement: a.sens.crisse,
    sante: typeof ev.moteur === 'number' ? ev.moteur : 1,
    panne: !!ev.enPanne, feu: !!ev.enFeu,
  });
}

// HORS DU VOLANT, LE CHAMP REVIENT À CELUI D'AVANT, en un tiers de seconde.
export function sensationsAPied(player, dt) {
  const cam = player.camera;
  const base = cam.userData.fovBase;
  if (base == null || cam.fov === base) return;
  const f = cam.fov + (base - cam.fov) * Math.min(1, dt * 8);
  cam.fov = Math.abs(f - base) < 0.05 ? base : f;
  cam.updateProjectionMatrix();
}
