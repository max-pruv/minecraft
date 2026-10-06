// MONTER EN VOITURE, ET EN DESCENDRE, COMME DANS UN VRAI JEU (v366).
//
// Max : « Quand on monte dans une voiture, on voit le personnage qui avance et
// qui rentre dans la voiture avec le gameplay de la porte qui s'ouvre, etc. »
// Jusqu'ici « Monter » était instantané : la voiture se TÉLÉPORTAIT sous
// l'enfant et pivotait sur son regard (`updateRide` la colle au joueur dès la
// première image). Désormais c'est l'enfant qui va à la voiture.
//
// LA SÉQUENCE, et pourquoi chacune de ses règles.
//
// - MONTER : l'avatar de l'enfant — le même corps que ses amis voient, v249 —
//   MARCHE jusqu'à la portière conducteur (en contournant la voiture s'il est
//   du mauvais côté), la portière s'ouvre, il entre et s'assied, la portière
//   se referme, la caméra glisse de la vue à la troisième personne à la vue
//   de poursuite. ≈ 1,5 à 2,4 s : la marche est bornée à 1,1 s (on presse le
//   pas si la voiture est loin), un enfant de sept ans ne doit pas attendre.
// - UN SECOND APPUI TERMINE TOUT DE SUITE. C'est la porte de sortie de toute
//   animation qu'on impose (la règle des réglages automatiques, v290, vue du
//   côté d'un geste) : on est assis, portière fermée, à l'image suivante.
// - `montureConduite()` NE DEVIENT VRAI QU'UNE FOIS ASSIS. Un témoin qui lit
//   l'état (v252 : un bouton-bascule ne se reclique pas) ne le voit jamais
//   ambigu : à pied pendant l'approche, au volant dès qu'on est assis. L'état
//   de la séquence se publie à part, `player.embarquement = { phase, t, sens }`
//   — le contrat du chantier « conduite ».
// - DESCENDRE : l'état bascule TOUT DE SUITE (on n'est plus au volant au
//   premier appui, rien d'ambigu là non plus), puis la portière s'ouvre,
//   l'enfant sort et se pose DEBOUT À CÔTÉ — sur une place libre : ni dans un
//   mur, ni dans l'eau, ni dans le couloir d'une voiture qui arrive (le
//   crochet des piétons, v259). Côté conducteur d'abord, côté passager si
//   c'est bouché ; sinon devant ou derrière, sans animation. La voiture reste
//   garée là.
// - `descendre({ presse: true })` : sans animation, posé à côté tout de suite —
//   pour la voiture qui prend feu (chantier « dégâts »).
// - PERSONNE N'EST SORTI DE FORCE D'UNE VOITURE. Une voiture prise dans la rue
//   est VIDE : les convois de `vehicules.js` n'ont pas de conducteur dessiné,
//   la voiture s'arrête (`emprunter` la sort du convoi) et l'enfant y monte.
// - UNE ANIMATION COMPTE EN TEMPS DE JEU (`dt`, v226) : sur une tablette qui
//   rame, la marche ralentit avec le monde, sans quoi l'avatar glisserait.
// - LE BANC SAUTE LA SÉQUENCE (`?embarq=0`, que `banc.js` met dans toute
//   adresse comme `rr=` et `prep=0`) : les cent témoins de conduite de
//   `monte.js` ne mesurent pas la séquence et retrouvent l'ancien geste au
//   bit près. Ceux qui l'éprouvent la demandent (`{ embarq: 1 }`).
//
// Les avions gardent leur montée (on ne marche pas jusqu'au cockpit d'un
// Concorde), une bête aussi : seule une fiche qui déclare un `siege` et pas de
// `pilote` passe par ici.

import * as THREE from 'three';
import { animerHumain } from './humains.js';
import { equiperPortieres, ouvrir } from './portieres.js';
import { FLOTTE } from './vehicules.js';
import { accesAvion } from './avions.js';
import { partagerTout } from './liberer.js';
import { BLOCK } from './blocks.js';

export const SEQUENCE_ACTIVE = (() => {
  try { return new URLSearchParams(location.search).get('embarq') !== '0'; } catch { return true; }
})();

// Les durées, en secondes de JEU.
export const DUREES = {
  marcheMin: 0.35, marcheMax: 1.1, ouverture: 0.35, entree: 0.6, fermeture: 0.35,
  sortieOuverture: 0.3, sortie: 0.55, sortieFermeture: 0.35,
  // l'avion (v381) : la marche jusqu'au pied de l'escalier peut faire le
  // tour du nez, on la borne plus large ; puis on monte les marches
  marcheAvionMax: 2.0, gravir: 0.9, ouvertureAvion: 0.45, entreeAvion: 0.5, fermetureAvion: 0.45,
};
const PAS = 3.2;               // la marche de l'enfant (blocs/s), qu'on presse si c'est loin
const LONG_VOITURE = 2.2;      // demi-longueur d'une voiture (4,4 blocs)
const ECART_PORTE = 0.42;      // où l'on se tient, au-delà du flanc

const lisse = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const lerp = (a, b, k) => a + (b - a) * k;

// La fiche du modèle dit-elle « pas de portière » ? Même discipline que
// `habitacle` (v230) : un modèle qui casse vaut moins qu'un modèle qui s'en
// passe, et la règle vit dans sa fiche.
function portiereRefusee(g) {
  const f = g && g.userData ? g.userData.flotte : null;
  if (!f) return true;
  if (f === 'voiture.glb') return false;
  const e = FLOTTE.find((x) => x.fichier === f);
  // Les taxis fabriqués (`fabrique`) ont des bords nets depuis la v372 (la
  // découpe coupe au plan), mais RIEN derrière : mesuré par la sonde des
  // portières, aucun des vingt-quatre rayons tirés au travers de l'ouverture
  // ne touche un habitacle. Une portière ouverte y montrerait le vide.
  return !e || e.portiere === false || !!e.fabrique;
}

export function creerEmbarquement(ctx) {
  const { player, world } = ctx;
  let s = null;            // la séquence en cours
  let av = null;           // les crochets de l'avatar, branchés par main.js
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  const qSeq = new THREE.Quaternion(), mSeq = new THREE.Matrix4();
  const camHaut = new THREE.Vector3(0, 1, 0);

  function publier() {
    player.embarquement = s ? { phase: s.phase, t: s.t, sens: s.sens } : null;
  }

  // ---- la géométrie de la voiture ----------------------------------------
  function dims(g, portes) {
    const p = portes && portes.plan;
    const demiLarg = p ? p.demiLarg : 1.1;
    const z0 = p ? p.z0 : -0.9, z1 = p ? p.z1 : 0.35;
    return { demiLarg, z0, z1, zPorte: (z0 + z1) / 2 + 0.1 };
  }
  function pointPorte(d, cote) {
    return new THREE.Vector3(cote * (d.demiLarg + ECART_PORTE), 0, d.zPorte);
  }
  const versMonde = (g, v) => { g.updateMatrixWorld(true); return g.localToWorld(v.clone()); };
  const versLocal = (g, v) => { g.updateMatrixWorld(true); return g.worldToLocal(v.clone()); };

  // LE CHEMIN JUSQU'À LA PORTIÈRE, dans le repère de la voiture (nez en −z).
  // Tout droit si rien ne coupe la carrosserie ; sinon le long d'un rectangle
  // qui l'entoure, par le côté le plus court.
  function chemin(P, D, d, demiLong = LONG_VOITURE) {
    const coupe = (A, B) => {
      for (let k = 1; k < 20; k++) {
        const x = lerp(A.x, B.x, k / 20), z = lerp(A.z, B.z, k / 20);
        if (Math.abs(x) < d.demiLarg + 0.25 && Math.abs(z) < demiLong + 0.25) return true;
      }
      return false;
    };
    const P0 = new THREE.Vector3(P.x, 0, P.z);
    if (!coupe(P0, D)) return [P0, D.clone()];
    const ex = d.demiLarg + 0.8, ez = demiLong + 0.8;
    // le point du pourtour le plus proche, et l'abscisse le long de ce pourtour
    // (sens : avant-gauche → arrière-gauche → arrière-droit → avant-droit)
    const coins = [new THREE.Vector3(-ex, 0, -ez), new THREE.Vector3(-ex, 0, ez),
      new THREE.Vector3(ex, 0, ez), new THREE.Vector3(ex, 0, -ez)];
    const cotes = [2 * ez, 2 * ex, 2 * ez, 2 * ex], tour = 2 * cotes[0] + 2 * cotes[1];
    const surPourtour = (v) => {
      let best = null;
      for (let i = 0; i < 4; i++) {
        const A = coins[i], B = coins[(i + 1) % 4];
        const AB = B.clone().sub(A), L = AB.length();
        const u = Math.max(0, Math.min(1, v.clone().sub(A).dot(AB) / (L * L)));
        const q = A.clone().addScaledVector(AB, u);
        const dd = q.distanceTo(v);
        if (!best || dd < best.d) {
          let s0 = 0; for (let j = 0; j < i; j++) s0 += cotes[j];
          best = { d: dd, q, s: s0 + u * L };
        }
      }
      return best;
    };
    const a = surPourtour(P0), b = surPourtour(D);
    let avant = (b.s - a.s + tour) % tour;
    const sens = avant <= tour / 2 ? 1 : -1;
    const pts = [P0, a.q];
    const coinsS = [0, cotes[0], cotes[0] + cotes[1], 2 * cotes[0] + cotes[1]];
    const longueur = sens > 0 ? avant : tour - avant;
    const entre = [];
    for (let i = 0; i < 4; i++) {
      const dc = sens > 0 ? (coinsS[i] - a.s + tour) % tour : (a.s - coinsS[i] + tour) % tour;
      if (dc > 1e-6 && dc < longueur - 1e-6) entre.push({ dc, p: coins[i] });
    }
    entre.sort((u, v) => u.dc - v.dc);
    for (const e of entre) pts.push(e.p.clone());
    pts.push(b.q, D.clone());
    return pts;
  }
  function longueurDe(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]); return L; }
  function pointA(pts, s0) {
    let reste = s0;
    for (let i = 1; i < pts.length; i++) {
      const l = pts[i].distanceTo(pts[i - 1]);
      if (reste <= l || i === pts.length - 1) {
        const k = l > 1e-6 ? Math.min(1, reste / l) : 1;
        return { p: pts[i - 1].clone().lerp(pts[i], k), dir: pts[i].clone().sub(pts[i - 1]) };
      }
      reste -= l;
    }
    return { p: pts[pts.length - 1].clone(), dir: new THREE.Vector3(0, 0, -1) };
  }
  // cap du modèle (visage en −z) pour une direction dans le repère voiture
  const capVers = (dx, dz) => Math.atan2(-dx, -dz);

  // ---- l'avatar --------------------------------------------------------
  function avatarDebout(g, pLocal, cap, vitesse, temps) {
    const a = av.obtenir();
    if (a.parent !== g) g.add(a);
    a.visible = true;
    a.scale.setScalar(1);
    a.position.copy(pLocal);
    a.rotation.set(0, cap, 0);
    const swing = vitesse > 0 ? Math.sin(temps * 9) * 0.6 : 0;
    a.userData.legs.forEach((l, i) => { l.rotation.x = i % 2 ? -swing : swing; });
    a.userData.arms.forEach((b, i) => { b.rotation.x = i % 2 ? swing * 0.7 : -swing * 0.7; });
    animerHumain(a, temps, vitesse);
    return a;
  }
  function avatarEntre(g, s0, k, temps) {
    // de la portière au siège : on s'assied en entrant, le corps tourne vers
    // l'avant, les jambes se replient — une pose qui SE MÉLANGE, pas un saut
    const a = av.obtenir();
    if (a.parent !== g) g.add(a);
    a.visible = true;
    const cible = s0.assise;
    const D = s0.D, kk = lisse(k);
    // d'abord vers le flanc, puis vers le siège : un arc, pas une glissade
    const milieu = new THREE.Vector3(s0.cote * (s0.d.demiLarg - 0.1), 0, cible.z);
    const p = k < 0.5
      ? D.clone().lerp(milieu, lisse(k / 0.5))
      : milieu.clone().lerp(new THREE.Vector3(cible.x, 0, cible.z), lisse((k - 0.5) / 0.5));
    p.y = lerp(0, cible.y, kk);
    a.position.copy(p);
    a.scale.setScalar(lerp(1, cible.echelle, kk));
    a.rotation.set(0, lerp(s0.cote * Math.PI / 2, 0, lisse(Math.max(0, k * 1.4 - 0.2))), 0);
    const P = av.pose;
    const pose = { cuisses: P.cuisses * kk, genoux: P.genoux * kk, bras: P.bras * kk, coudes: P.coudes * kk };
    a.userData.legs.forEach((l) => { l.rotation.x = pose.cuisses; });
    a.userData.arms.forEach((b) => { b.rotation.x = pose.bras; });
    animerHumain(a, temps, 0, pose);
  }
  function avatarRetire() {
    const a = av && av.obtenir ? av.obtenir() : null;
    if (a && a.parent) a.removeFromParent();
  }

  // ---- la caméra -------------------------------------------------------
  // De trois quarts arrière, du côté de la portière : on voit l'enfant
  // arriver, la portière s'ouvrir, et l'habitacle par l'ouverture. Puis elle
  // REND LA MAIN à la caméra du jeu (poursuite au volant, regard à pied) par
  // un fondu de position et d'orientation.
  function camSequence(s0, cible) {
    const g = s0.a.mesh;
    const Q = new THREE.Vector3(s0.cote * (s0.d.demiLarg + 3.4), 2.3, s0.d.zPorte + 2.6);
    let pos = versMonde(g, Q);
    // pas dans un mur : on avance vers la voiture tant que la caméra est
    // dans la pierre (jamais plus près que deux blocs)
    for (let i = 0; i < 8 && world.isSolid(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)); i++) {
      pos = pos.lerp(cible, 0.18);
      if (pos.distanceTo(cible) < 2) break;
    }
    mSeq.lookAt(pos, cible, camHaut);
    qSeq.setFromRotationMatrix(mSeq);
    return pos;
  }
  function appliquerCamera(w, pos, base) {
    const cam = player.camera;
    const bp = base ? base.p : cam.position.clone(), bq = base ? base.q : cam.quaternion.clone();
    cam.position.lerpVectors(bp, pos, w);
    cam.quaternion.slerpQuaternions(bq, qSeq, w);
  }

  // ---- la place où l'on se pose en descendant -------------------------
  // UN REFUS SE DIT (v223) : la raison du dernier refus de chaque place est
  // gardée, et `etat()` la publie — sans elle, « il est sorti côté passager »
  // ne se démonte pas.
  let refusSortie = {};
  function libre(x, y, z) {
    if (!world.boiteLibre(x, y, z, 0.3, 1.8)) return 'mur';
    const pieds = world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    const dessous = world.getBlock(Math.floor(x), Math.floor(y - 0.5), Math.floor(z));
    if (pieds === BLOCK.WATER || dessous === BLOCK.WATER) return 'eau';
    if (world.vehiculeApproche && world.vehiculeApproche(x, z, y)) return 'circulation';
    if (world.obstaclePieton && world.obstaclePieton(x, z, y + 1)) return 'voiture';
    return '';
  }
  function placeLibre(g, local, y0, nom) {
    const w = versMonde(g, local);
    const raisons = [];
    for (const dy of [0, 1, -1, 2]) {
      const r = libre(w.x, y0 + dy, w.z);
      if (!r) return new THREE.Vector3(w.x, y0 + dy, w.z);
      raisons.push(r);
    }
    refusSortie[nom] = raisons.join('/');
    return null;
  }
  // Rend { cote, D (local), monde } : par une portière si l'on peut, sinon
  // { cote: 0, monde } — une place devant, derrière, ou un peu plus loin.
  function choisirSortie(a, d, ordre = [-1, 1]) {
    const g = a.mesh, y0 = a.pos.y;
    refusSortie = {};
    for (const cote of ordre) {
      const D = pointPorte(d, cote);
      const m = placeLibre(g, D, y0, cote < 0 ? 'conducteur' : 'passager');
      if (m) return { cote, D, monde: m };
    }
    for (const L of [new THREE.Vector3(0, 0, LONG_VOITURE + 1.1), new THREE.Vector3(0, 0, -LONG_VOITURE - 1.1),
      new THREE.Vector3(-(d.demiLarg + 1.4), 0, 0), new THREE.Vector3(d.demiLarg + 1.4, 0, 0)]) {
      const m = placeLibre(g, L, y0, 'autour');
      if (m) return { cote: 0, monde: m };
    }
    return { cote: 0, monde: versMonde(g, pointPorte(d, -1)).setY(y0) };
  }

  // ---- monter ----------------------------------------------------------
  function monter(a) {
    if (s) { terminer(); return; }
    if (SEQUENCE_ACTIVE && av && a && a.mesh && a.def && a.def.pilote && a.mesh.userData.porte) { monterAvion(a); return; }
    if (!SEQUENCE_ACTIVE || !av || !a || !a.mesh || !a.def || !a.def.siege || a.def.pilote) { ctx.toggleRide(a); return; }
    const g = a.mesh;
    a.montee = true; a.state = 'idle';
    const portes = equiperPortieres(g, portiereRefusee(g));
    const d = dims(g, portes);
    const cote = -1;   // le volant est à gauche (x = −0,33, v249)
    const D = pointPorte(d, cote);
    const P = versLocal(g, player.pos);
    const pts = chemin(P, D, d);
    const L = longueurDe(pts);
    const T = Math.max(DUREES.marcheMin, Math.min(DUREES.marcheMax, L / PAS));
    s = { sens: 'monter', phase: 'approche', t: 0, a, d, cote, D, pts, L, T, portes,
      y0: player.pos.y, temps: 0, assise: null };
    publier();
  }

  // ---- monter dans un avion (v381) --------------------------------------
  // Max : « on voit le personnage qui avance et qui rentre ». Pour un avion :
  // l'enfant marche jusqu'au pied d'un escalier (une échelle pour le
  // chasseur) posé contre la porte avant gauche, le gravit, la porte (la
  // verrière) s'ouvre, il entre, il est aux commandes, elle se referme et
  // l'escalier s'en va. Mêmes règles que la voiture (v366) : l'état ne ment
  // jamais (`montureConduite()` faux jusqu'à « aux commandes »), un second
  // appui termine tout de suite, tout compte en temps de JEU, rien ne
  // s'écrit dans le monde, et le banc la saute (`embarq=0`). Un modèle qui ne
  // permet pas de porte (le Concorde, `userData.porte` nul) monte d'un coup.
  const accesCache = new Map();
  function acces(porte) {
    const cle = JSON.stringify(porte);
    if (!accesCache.has(cle)) {
      const a = accesAvion(porte);
      // gardé d'un embarquement à l'autre : `liberer` ne doit pas le rendre si
      // l'avion qui le porte quitte la scène pendant la séquence
      partagerTout(a.groupe);
      accesCache.set(cle, a);
    }
    return accesCache.get(cle);
  }
  function ouvrant(g, porte, k) {
    const m = g.userData.membres && g.userData.membres[porte.ouvrant];
    if (m) m.rotation[porte.axe] = porte.angle * k;
  }
  function monterAvion(a) {
    const g = a.mesh, porte = g.userData.porte;
    a.montee = true; a.state = 'idle';
    const ac = acces(porte);
    if (ac.groupe.parent !== g) g.add(ac.groupe);
    const pied = new THREE.Vector3(...ac.pied), haut = new THREE.Vector3(...ac.haut);
    const d = { demiLarg: Math.abs(porte.x) + 0.3, zPorte: porte.z };
    const pts = chemin(versLocal(g, player.pos), pied, d, porte.demiLong);
    const L = longueurDe(pts);
    const T = Math.max(DUREES.marcheMin, Math.min(DUREES.marcheAvionMax, L / PAS));
    s = { sens: 'monter', avion: true, phase: 'approche', t: 0, a, d, cote: -1, porte, ac, pied, haut,
      pts, L, T, y0: player.pos.y, temps: 0 };
    publier();
  }
  // la caméra : devant l'appareil, à gauche, assez loin pour voir l'escalier
  // ET la porte (on recule d'autant que l'appareil est grand)
  function camAvion(s0, cible) {
    const g = s0.a.mesh, p = s0.porte;
    const recul = s0.porte.type === 'echelle' ? 4.5 : 6.5;
    let pos = versMonde(g, new THREE.Vector3(p.x - recul, p.y + 2.6, p.z - recul * 0.9));
    for (let i = 0; i < 8 && world.isSolid(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)); i++) {
      pos = pos.lerp(cible, 0.18);
      if (pos.distanceTo(cible) < 2) break;
    }
    mSeq.lookAt(pos, cible, camHaut);
    qSeq.setFromRotationMatrix(mSeq);
    return pos;
  }
  function retirerAcces(s0) {
    if (s0 && s0.ac && s0.ac.groupe.parent) s0.ac.groupe.removeFromParent();
  }
  function updateAvion(dt) {
    const a = s.a, g = a.mesh, porte = s.porte;
    const tete = versMonde(g, new THREE.Vector3(porte.x, porte.y + 0.7, porte.z));
    if (s.phase === 'approche') {
      const k = Math.min(1, s.t / s.T);
      const { p, dir } = pointA(s.pts, s.L * lisse(k));
      p.y = lerp(s.y0 - g.position.y, 0, Math.min(1, k * 1.5));
      const w = versMonde(g, p);
      player.pos.copy(w);
      player.vel.set(0, 0, 0);
      avatarDebout(g, p, capVers(dir.x, dir.z), s.L / s.T, s.temps);
      appliquerCamera(lisse(Math.min(1, s.t / 0.35)), camAvion(s, tete));
      if (k >= 1) { s.phase = 'gravir'; s.t = 0; }
    } else if (s.phase === 'gravir') {
      const k = Math.min(1, s.t / DUREES.gravir);
      const p = s.pied.clone().lerp(s.haut, lisse(k));
      player.pos.copy(versMonde(g, p)); player.vel.set(0, 0, 0);
      // face à l'avion (+x), le pas des marches
      avatarDebout(g, p, -Math.PI / 2, 2.2, s.temps);
      appliquerCamera(1, camAvion(s, tete));
      if (k >= 1) { s.phase = 'ouverture'; s.t = 0; }
    } else if (s.phase === 'ouverture') {
      const k = Math.min(1, s.t / DUREES.ouvertureAvion);
      ouvrant(g, porte, lisse(k));
      avatarDebout(g, s.haut, -Math.PI / 2, 0, s.temps);
      player.pos.copy(versMonde(g, s.haut)); player.vel.set(0, 0, 0);
      appliquerCamera(1, camAvion(s, tete));
      if (k >= 1) { s.phase = 'entree'; s.t = 0; }
    } else if (s.phase === 'entree') {
      // il entre en se baissant : la porte fait la moitié de sa taille
      const k = Math.min(1, s.t / DUREES.entreeAvion);
      const av0 = av.obtenir();
      const p = s.haut.clone().lerp(new THREE.Vector3(0, porte.y, porte.z), lisse(k));
      avatarDebout(g, p, -Math.PI / 2, 1.2, s.temps);
      av0.scale.setScalar(lerp(1, 0.35, lisse(k)));
      player.pos.copy(versMonde(g, p)); player.vel.set(0, 0, 0);   // sinon il retombe
      appliquerCamera(1, camAvion(s, tete));
      if (k >= 1) {
        avatarRetire(); av0.scale.setScalar(1);
        asseoirMaintenant();       // aux commandes : toggleRide, l'état bascule ICI
        s.phase = 'fermeture'; s.t = 0;
      }
    } else if (s.phase === 'fermeture') {
      const k = Math.min(1, s.t / DUREES.fermetureAvion);
      ouvrant(g, porte, 1 - lisse(k));
      appliquerCamera(1 - lisse(k), camAvion(s, tete));
      if (k >= 1) { ouvrant(g, porte, 0); retirerAcces(s); s = null; }
    }
  }

  // ---- monter chez un ami (v377) -----------------------------------------
  // Le passager d'un ami (v253) collait l'enfant au siège d'un coup. Il entre
  // désormais par la portière DROITE de la voiture de l'ami (`cote: 1`, déjà
  // fabriquée par portieres.js), avec la même marche, la même portière, la
  // même assise — et l'ami voit la portière s'ouvrir sur SA tablette : un
  // message court (`portiere`, nom neuf : l'ancienne tablette l'ignore, le
  // receveur cède ; l'hôte relaie). `veh` est la voiture DISTANTE telle que
  // cette tablette la dessine ({ mesh, def }), `fin` fait de l'enfant un
  // passager (fun.js), `existe` dit si l'ami a encore cette voiture.
  function monterChez(veh, siege, de, fin, existe) {
    if (s) { terminer(); return; }
    if (!SEQUENCE_ACTIVE || !av || !veh || !veh.mesh || !veh.def || !siege) { fin(); return; }
    const g = veh.mesh;
    // la voiture d'un ami n'est pas une bête : on lui prête ce que la séquence
    // lit d'une monture (sa place, son cap — le modèle regarde en −z, d'où π)
    const a = { mesh: g, def: veh.def, montee: false, get pos() { return g.position; }, get yaw() { return g.rotation.y - Math.PI; } };
    const portes = equiperPortieres(g, portiereRefusee(g));
    const d = dims(g, portes);
    const cote = 1;   // le conducteur est à gauche : on monte à droite
    const D = pointPorte(d, cote);
    const pts = chemin(versLocal(g, player.pos), D, d);
    const L = longueurDe(pts);
    const T = Math.max(DUREES.marcheMin, Math.min(DUREES.marcheMax, L / PAS));
    s = { sens: 'monter', phase: 'approche', t: 0, a, d, cote, D, pts, L, T, portes,
      y0: player.pos.y, temps: 0, assise: null, chez: { fin, existe, siege, de } };
    publier();
  }
  // LA PORTIÈRE SE DIT À L'AMI : ouverte (1) ou refermée (0).
  let diffuser = null;
  function signaler(o) {
    if (s && s.chez && s.chez.de && diffuser) diffuser({ t: 'portiere', de: s.chez.de, c: s.cote, o });
  }

  // LA PORTIÈRE QU'UN AUTRE OUVRE (v377) : sur cette tablette, la voiture où
  // un ami monte en passager — la nôtre si l'on conduit, ou celle d'un autre.
  // Elle s'ouvre et se referme au rythme de la séquence de l'ami, en temps de
  // jeu (v226), sans rien attendre d'autre que ses deux messages.
  const distantes = new Map();   // pivot → { k, cible }
  function porteDistante(mesh, cote, o) {
    if (!mesh || (cote !== 1 && cote !== -1)) return;
    const portes = equiperPortieres(mesh, portiereRefusee(mesh));
    const p = portes ? portes[String(cote)] : null;
    if (!p) return;
    const e = distantes.get(p) || { k: 0, cible: 0 };
    e.cible = o ? 1 : 0;
    distantes.set(p, e);
  }
  function animerDistantes(dt) {
    for (const [p, e] of distantes) {
      const pas = dt / (e.cible ? DUREES.ouverture : DUREES.fermeture);
      e.k = e.cible > e.k ? Math.min(e.cible, e.k + pas) : Math.max(e.cible, e.k - pas);
      // une portière que la séquence d'ici tient (la nôtre) ne se dispute pas
      if (!(s && s.portes && s.portes[String(s.cote)] === p)) ouvrir(p, e.k);
      if (e.k === e.cible && !e.cible) distantes.delete(p);
    }
  }

  function asseoirMaintenant() {
    const a = s.a;
    if (s.chez) {
      // passager : c'est fun.js qui le tient désormais au siège (v253)
      player.vel.set(0, 0, 0);
      player.yaw = a.yaw + Math.PI;
      s.chez.fin();
      return;
    }
    player.pos.set(a.pos.x, a.pos.y, a.pos.z);
    player.vel.set(0, 0, 0);
    // la voiture ne pivote pas sous l'enfant : c'est lui qui prend son cap
    player.yaw = a.yaw + Math.PI;
    a.camYaw = player.yaw;
    a.montee = false;          // toggleRide la reprend
    ctx.toggleRide(a);
  }

  // ---- descendre -------------------------------------------------------
  function descendre(opts = {}) {
    const a = ctx.montureConduite();
    if (!a) return;
    if (s && s.sens === 'monter') terminer();
    const sansSequence = !SEQUENCE_ACTIVE || !av || !a.mesh || !a.def || !a.def.siege || a.def.pilote;
    if (sansSequence && !opts.presse) { ctx.toggleRide(null); return; }
    const g = a.mesh;
    const portes = g.userData.portieres || null;
    const d = dims(g, portes);
    const cam = { p: player.camera.position.clone(), q: player.camera.quaternion.clone() };
    ctx.toggleRide(null);           // on n'est plus au volant, tout de suite
    if (!ctx.existe(a)) return;     // rangée ailleurs : rien à animer
    const sortie = choisirSortie(a, d);
    if (opts.presse || !sortie.cote) {
      player.pos.copy(sortie.monde);
      player.vel.set(0, 0, 0);
      player.yaw = a.yaw + Math.PI;
      avatarRetire();
      return;
    }
    a.montee = true;
    const D = versLocal(g, sortie.monde);
    s = { sens: 'descendre', phase: 'ouverture', t: 0, a, d, cote: sortie.cote, D, portes,
      monde: sortie.monde, depart: a.pos.clone(), cam, temps: 0,
      // on part du siège du CONDUCTEUR, même pour sortir côté passager (on
      // enjambe la console, comme dans la vraie vie quand un mur bouche)
      assise: av.placeAssise(a, a.def.siege) };
    player.pos.copy(a.pos);
    player.vel.set(0, 0, 0);
    publier();
  }

  // ---- descendre de chez un ami (v384) -----------------------------------
  // Le pendant de `monterChez` : le passager d'un ami se retrouvait debout
  // d'un coup. Il ressort désormais par la portière DROITE de la voiture
  // DISTANTE (celle que cette tablette dessine), avec la même séquence que le
  // conducteur, à l'envers. `passagerDe()` est déjà nul quand on arrive ici
  // (fun.js l'efface au premier appui, comme `toggleRide(null)` pour le
  // conducteur, v366) ; et l'ami voit la portière par le même message court
  // que la montée (`portiere`, v377). Rend faux si rien n'est à animer — fun.js
  // pose alors l'enfant à côté, sans séquence.
  function descendreDeChez(veh, siege, de, existe) {
    if (s) terminer();
    if (!SEQUENCE_ACTIVE || !av || !veh || !veh.mesh || !veh.def || !siege) return false;
    const g = veh.mesh;
    const a = { mesh: g, def: veh.def, montee: false, get pos() { return g.position; }, get yaw() { return g.rotation.y - Math.PI; } };
    const portes = equiperPortieres(g, portiereRefusee(g));
    const d = dims(g, portes);
    const cam = { p: player.camera.position.clone(), q: player.camera.quaternion.clone() };
    // côté passager d'abord : c'est par là qu'il est monté
    const sortie = choisirSortie(a, d, [1, -1]);
    if (!sortie.cote) {
      player.pos.copy(sortie.monde);
      player.vel.set(0, 0, 0);
      player.yaw = a.yaw + Math.PI;
      return false;
    }
    const D = versLocal(g, sortie.monde);
    s = { sens: 'descendre', phase: 'ouverture', t: 0, a, d, cote: sortie.cote, D, portes,
      monde: sortie.monde, depart: a.pos.clone(), cam, temps: 0,
      assise: av.placeAssise(a, siege), chez: { existe, siege, de } };
    player.pos.copy(a.pos);
    player.vel.set(0, 0, 0);
    signaler(1);
    publier();
    return true;
  }

  // ---- fin --------------------------------------------------------------
  function porte(k) {
    if (!s || !s.portes) return;
    ouvrir(s.portes[String(s.cote)], k);
  }
  function terminer() {
    if (!s) return;
    const fini = s;
    if (fini.avion) {
      if (fini.phase !== 'fermeture') { avatarRetire(); const a0 = av.obtenir(); a0.scale.setScalar(1); asseoirMaintenant(); }
      ouvrant(fini.a.mesh, fini.porte, 0);
      retirerAcces(fini);
      s = null;
      publier();
      return;
    }
    if (fini.sens === 'monter') {
      if (fini.phase !== 'fermeture') {
        if (fini.chez && fini.phase !== 'approche') signaler(0);
        asseoirMaintenant();
      }
      porte(0);
    } else {
      if (fini.chez && fini.phase !== 'fermeture') signaler(0);
      porte(0);
      player.pos.copy(fini.monde);
      player.vel.set(0, 0, 0);
      player.yaw = fini.a.yaw + Math.PI;
      fini.a.montee = false;
      avatarRetire();
    }
    s = null;
    publier();
  }
  function annuler() {
    if (!s) return;
    if (s.avion) {
      ouvrant(s.a.mesh, s.porte, 0);
      retirerAcces(s);
      if (ctx.montureConduite() !== s.a) s.a.montee = false;
      const a0 = av && av.obtenir ? av.obtenir() : null;
      if (a0) a0.scale.setScalar(1);
      if (!ctx.montureConduite()) avatarRetire();
      s = null;
      publier();
      return;
    }
    if (s.chez && s.phase !== 'approche' && s.phase !== 'fermeture') signaler(0);
    porte(0);
    if (s.a && ctx.montureConduite() !== s.a) s.a.montee = false;
    if (!ctx.montureConduite()) avatarRetire();
    s = null;
    publier();
  }

  // ---- à chaque image, APRÈS `updateRide` ---------------------------------
  function update(dt) {
    if (distantes.size) animerDistantes(dt);
    if (!s) return;
    const a = s.a, g = a.mesh;
    if (!(s.chez ? s.chez.existe() : ctx.existe(a)) || !g) { annuler(); return; }
    s.t += dt; s.temps += dt;
    if (s.avion) { updateAvion(dt); publier(); return; }
    if (!s.portes && s.phase !== 'approche') {
      // le modèle est peut-être arrivé pendant la marche
      s.portes = equiperPortieres(g, portiereRefusee(g));
    }
    const tete = new THREE.Vector3();
    if (s.sens === 'monter') {
      if (s.phase === 'approche') {
        const k = Math.min(1, s.t / s.T);
        const { p, dir } = pointA(s.pts, s.L * lisse(k));
        const yLocal = lerp(s.y0 - g.position.y, 0, Math.min(1, k * 1.5));
        p.y = yLocal;
        const w = versMonde(g, p);
        player.pos.copy(w);
        const vit = s.L / s.T;
        const dirM = versMonde(g, dir.clone().add(p)).sub(w);
        player.vel.set(dirM.x * vit / Math.max(1e-3, dirM.length()), 0, dirM.z * vit / Math.max(1e-3, dirM.length()));
        avatarDebout(g, p, capVers(dir.x, dir.z), vit, s.temps);
        tete.copy(w).y += 1.2;
        if (k >= 1) { s.phase = 'ouverture'; s.t = 0; s.assise = av.placeAssise(a, s.chez ? s.chez.siege : a.def.siege); signaler(1); }
        const pos = camSequence(s, tete);
        appliquerCamera(lisse(Math.min(1, s.t / 0.35 + (s.phase === 'approche' ? 0 : 1))), pos);
        av.obtenir().visible = player.camera.position.distanceTo(w) > 1.2;
      } else if (s.phase === 'ouverture') {
        const k = Math.min(1, s.t / DUREES.ouverture);
        porte(k);
        player.pos.copy(versMonde(g, s.D)); player.vel.set(0, 0, 0);
        avatarDebout(g, s.D, s.cote * Math.PI / 2, 0, s.temps);
        tete.copy(versMonde(g, new THREE.Vector3(s.cote * s.d.demiLarg * 0.6, 0.9, s.d.zPorte)));
        appliquerCamera(1, camSequence(s, tete));
        if (k >= 1) { s.phase = 'entree'; s.t = 0; }
      } else if (s.phase === 'entree') {
        const k = Math.min(1, s.t / DUREES.entree);
        avatarEntre(g, s, k, s.temps);
        player.pos.copy(versMonde(g, s.D.clone().lerp(new THREE.Vector3(), lisse(k))));
        player.pos.y = a.pos.y;
        player.vel.set(0, 0, 0);
        tete.copy(versMonde(g, new THREE.Vector3(s.cote * s.d.demiLarg * 0.4, 0.9, s.d.zPorte)));
        appliquerCamera(1, camSequence(s, tete));
        if (k >= 1) { asseoirMaintenant(); s.phase = 'fermeture'; s.t = 0; signaler(0); }
      } else if (s.phase === 'fermeture') {
        const k = Math.min(1, s.t / DUREES.fermeture);
        porte(1 - k);
        tete.copy(versMonde(g, new THREE.Vector3(0, 0.9, 0)));
        appliquerCamera(1 - lisse(k), camSequence(s, tete));
        if (k >= 1) { porte(0); s = null; }
      }
    } else {
      // DESCENDRE
      if (s.phase === 'ouverture') {
        const k = Math.min(1, s.t / DUREES.sortieOuverture);
        porte(k);
        avatarAssis(g, s);
        player.pos.copy(s.depart); player.vel.set(0, 0, 0);
        tete.copy(versMonde(g, new THREE.Vector3(s.cote * s.d.demiLarg * 0.4, 0.9, s.d.zPorte)));
        appliquerCamera(lisse(k), camSequence(s, tete), s.cam);
        if (k >= 1) { s.phase = 'sortie'; s.t = 0; }
      } else if (s.phase === 'sortie') {
        const k = Math.min(1, s.t / DUREES.sortie);
        avatarEntre(g, s, 1 - k, s.temps);
        player.pos.lerpVectors(s.depart, s.monde, lisse(k)); player.vel.set(0, 0, 0);
        tete.copy(versMonde(g, new THREE.Vector3(s.cote * s.d.demiLarg * 0.6, 0.9, s.d.zPorte)));
        appliquerCamera(1, camSequence(s, tete));
        if (k >= 1) { s.phase = 'fermeture'; s.t = 0; player.yaw = a.yaw + Math.PI; signaler(0); }
      } else if (s.phase === 'fermeture') {
        const k = Math.min(1, s.t / DUREES.sortieFermeture);
        porte(1 - k);
        player.pos.copy(s.monde); player.vel.set(0, 0, 0);
        avatarDebout(g, s.D, s.cote * Math.PI / 2 + Math.PI, 0, s.temps);
        tete.copy(s.monde).y += 1.2;
        const w = 1 - lisse(k);
        appliquerCamera(w, camSequence(s, tete));
        av.obtenir().visible = w > 0.3;
        if (k >= 1) { porte(0); a.montee = false; avatarRetire(); av.obtenir().visible = true; s = null; }
      }
    }
    publier();
  }
  function avatarAssis(g, s0) {
    const a = av.obtenir();
    if (a.parent !== g) g.add(a);
    a.visible = true;
    const c = s0.assise;
    a.position.set(c.x, c.y, c.z); a.scale.setScalar(c.echelle); a.rotation.set(0, 0, 0);
    a.userData.legs.forEach((l) => { l.rotation.x = av.pose.cuisses; });
    a.userData.arms.forEach((b) => { b.rotation.x = av.pose.bras; });
    animerHumain(a, s0.temps, 0, av.pose);
  }

  return {
    monter, monterChez, descendre, descendreDeChez, terminer, annuler, update, porteDistante,
    brancherReseau(f) { diffuser = f; },
    enCours: () => !!s,
    // l'avatar est-il à nous cette image ? (main.js ne l'assied pas alors)
    avatarPilote: () => !!s && !(s.sens === 'monter' && s.phase === 'fermeture'),
    brancherAvatar(h) { av = h; },
    etat: () => (s ? { sens: s.sens, phase: s.phase, t: s.t, cote: s.cote, portes: !!s.portes, avion: !!s.avion, refus: refusSortie } : null),
    refusSortie: () => refusSortie,
  };
}
