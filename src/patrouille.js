// LA POLICE DANS LE MONDE (v554). La règle vit dans `police.js` (pure, lue
// sous node) ; ici on la BRANCHE : ce qui compte comme bêtise, la voiture de
// police et la moto qui suivent l'enfant, la sirène, les gyrophares, et le
// contrôle — un policier qui descend, dit à voix haute ce qui s'est passé et
// quoi faire, et souhaite bonne route.
//
// Trois choix, et chacun a sa raison.
//
//  1. LES UNITÉS SONT DES MONTURES DU BESTIAIRE (`invoquer`), MENÉES d'ici
//     (`menee`, `enService`, animals.js) : elles ont donc tout ce qu'une voiture
//     invoquée a déjà — leur boîte que la voiture de l'enfant percute
//     (`gareeContre`, main.js), leurs roues qui roulent, leurs dégâts, et la
//     place qu'elles prennent dans la rue (la circulation leur cède comme à un
//     ami, `brancherAmis`). Une fois le contrôle fini, elles se garent et
//     redeviennent des voitures qu'on peut prendre.
//  2. ELLES SUIVENT LA PISTE DE L'ENFANT (`Piste`, police.js) : les positions
//     qu'il a vraiment occupées. Là où il a roulé, elles roulent — jamais dans
//     un mur, jamais dans l'eau —, sans un seul calcul de chemin.
//  3. RIEN N'EST VIOLENT, ET TOUT SE DIT. Elles ne percutent personne (elles
//     s'arrêtent à la moitié de leur écart), elles ne bloquent pas l'enfant, et
//     la seule sortie qu'on apprend à un enfant de sept ans est de s'arrêter.
//     Ce qui se dit passe par la VOIX (la règle des guides, v538) : depuis la
//     v504, rien ne s'écrit en jeu. L'état — combien d'étoiles — est une
//     pilule de la file du centre, comme l'atterrissage (v516).
//
// LE MONDE EST LOCAL À LA TABLETTE. Un ami voit les voitures de police comme
// des voitures garées ou conduites (elles n'ont pas de `p.v` à elles) : la
// poursuite ne voyage pas — dette déclarée dans TASKS.md.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { partagerTout, liberer } from './liberer.js';
import { matiereAdditive } from './avions.js';
import { FLOTTE, chargerVoitureFlotte } from './vehicules.js';
import { chargerMoto, motoPrete } from './moto.js';
import { sireneJouer } from './sons.js';
import {
  BETISES, FORCE_VOITURE, FORCE_MUR, VITESSE_PIETON, etoiles, ajouterBetise, oublier,
  VU_POLICE, Piste, ECART, PLANCHER, VMAX_POLICE, vitessePoursuite, abscisseApparition, pretAuControle,
  DUREE_CONTROLE, phrasePolice,
} from './police.js';

export const FICHIER_POLICE = 'police-car.glb';
const ENTREE_POLICE = FLOTTE.find((e) => e.fichier === FICHIER_POLICE);
// la moto suit la voiture de quelques longueurs, et vient à deux étoiles
const ECART_MOTO = ECART + 8;
const VMAX_MOTO = 42;
// les gyrophares alternent quatre fois par seconde
const CLIGNE = 0.25;
// le policier marche à 1,6 bloc par seconde, et se tient à 1,6 bloc de la
// portière de l'enfant
const PAS_AGENT = 1.6;
const PRES_PORTIERE = 1.6;

// --- les gyrophares : deux éclats additifs posés SUR la rampe ---------------
// Mesurés sur le prototype (v230 : un emplacement se mesure, il ne s'écrit
// pas) — les pièces `Gyrophare_G` (rouge, gauche) et `Gyrophare_D` (bleu) que
// la conversion a séparées. `matiereAdditive`, la flamme des réacteurs (v264) :
// aucune clé de programme neuve, aucune lampe (v248).
const GEO_ECLAT = new THREE.SphereGeometry(1, 12, 8);
GEO_ECLAT.userData.partagee = true;
const posesGyro = new WeakMap();
function mesurerGyrophares(proto) {
  if (posesGyro.has(proto)) return posesGyro.get(proto);
  proto.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(proto.matrixWorld).invert();
  const out = [];
  proto.traverse((o) => {
    if (!o.isMesh || !/^Gyrophare_(G|D)/.test(o.name || '')) return;
    const b = new THREE.Box3().setFromObject(o).applyMatrix4(inv);
    const c = b.getCenter(new THREE.Vector3()), t = b.getSize(new THREE.Vector3());
    out.push({ rouge: /_G/.test(o.name), c, t });
  });
  posesGyro.set(proto, out);
  return out;
}
export function equiperGyrophares(g, proto) {
  if (g.userData.eclatsPolice) return g.userData.eclatsPolice;
  const eclats = [];
  for (const p of mesurerGyrophares(proto)) {
    const m = new THREE.Mesh(GEO_ECLAT, matiereAdditive(p.rouge ? 0xff2a1a : 0x2a5cff, 0.85));
    m.name = p.rouge ? 'Eclat_G' : 'Eclat_D';
    m.position.copy(p.c);
    m.scale.set(p.t.x * 0.5 + 0.06, p.t.y * 0.9 + 0.08, p.t.z * 0.6 + 0.06);
    m.visible = false;
    g.add(m);
    eclats.push(m);
  }
  g.userData.eclatsPolice = eclats;
  return eclats;
}
// allumés en alternance (rouge, puis bleu) — ou éteints
export function gyrophares(g, allumes, t) {
  const e = [];
  g.traverse((o) => { if (o.name === 'Eclat_G' || o.name === 'Eclat_D') e.push(o); });
  const phase = Math.floor(t / CLIGNE) % 2;
  for (const o of e) o.visible = !!allumes && ((o.name === 'Eclat_G') === (phase === 0));
  return e.length;
}

// --- le policier --------------------------------------------------------------
let chargementAgent = null, protoAgent = null;
function chargerAgent() {
  if (typeof document === 'undefined') return null;
  if (chargementAgent) return chargementAgent;
  chargementAgent = new GLTFLoader().loadAsync('./vendor/humains/policier.glb').then((gltf) => {
    const g = new THREE.Group();
    g.add(gltf.scene);
    partagerTout(g);
    g.userData.protoDe = 'policier.glb';
    protoAgent = g;
    return g;
  }).catch((e) => { console.warn('policier', e); return null; });
  return chargementAgent;
}

// --- la patrouille --------------------------------------------------------
export function creerPatrouille(ctx) {
  const { scene, player, animaux, montureConduite, dire, langue, casses } = ctx;
  let etat = { points: 0, derniere: null };
  const piste = new Piste();
  const unites = [];             // { a, type, s, v, cible, vmax, appel }
  let controle = null;           // { agent, etape, t, cible, fin, cle }
  let vuChoc = player.choc && player.choc.t;
  let freinait = false, dernierPieton = -1e9, dernierMobilier = -1e9, cassesVues = casses ? casses() : 0;
  let arretDepuis = 0, tPrec = null, horloge = 0;
  let alterne = 0;
  let chargeLance = false, policePrete = false;
  let appelDit = false;
  let pilotee = null;            // la voiture de police que l'enfant conduit (ses gyrophares)

  const auVolant = () => player.gabarit > 1 && !player.pilote;
  // LA VITESSE DE L'ENFANT SE LIT SUR SA PISTE, PAS SUR SA CONSIGNE :
  // `vitesseVoiture` reste à vingt blocs par seconde quand la voiture glisse
  // contre un mur à sept (mesuré à la sonde) — la police réglée sur la
  // consigne la doublait puis pilait, par à-coups. Lissée sur un tiers de seconde.
  let vPiste = 0, finPrec = null;
  const vitesseEnfant = () => vPiste;
  const estUnite = (a) => unites.some((u) => u.a === a);

  function betise(quoi) {
    etat = ajouterBetise(etat, quoi, horloge);
    if (!chargeLance) {
      // on ne télécharge rien tant qu'il n'y a pas eu de bêtise : la police
      // ne coûte rien à l'enfant sage (le scanner de visages, v220)
      chargeLance = true;
      const p = ENTREE_POLICE && chargerVoitureFlotte(ENTREE_POLICE);
      if (p) p.then((proto) => { policePrete = !!proto; });
      chargerMoto();
      chargerAgent();
    }
  }

  // LES BÊTISES, lues sur ce que la physique publie déjà : le choc (et contre
  // quoi), le freinage devant un piéton, le mobilier renversé. Rien n'est
  // deviné : un choc qui n'est pas publié n'est pas un choc.
  function lireBetises() {
    if (!auVolant()) { freinait = false; return; }
    const c = player.choc;
    if (c && typeof c === 'object' && c.t !== vuChoc) {
      vuChoc = c.t;
      const k = player.contact && player.contact.famille;
      const autre = player.contact && player.contact.autre;
      const contrePolice = k === 'voiture' && autre
        && unites.some((u) => Math.hypot(u.a.pos.x - autre.x, u.a.pos.z - autre.z) < 4);
      if (contrePolice) betise('police');
      else if (k === 'voiture' && c.force >= FORCE_VOITURE) betise('voiture');
      else if (k === 'mur' && c.force >= FORCE_MUR) betise('mur');
    }
    // un piéton qu'on force à s'écarter : la voiture freine pour lui (v358),
    // et on ne compte que si elle FONÇAIT — se garer près d'un passant n'est
    // pas une bêtise. Une fois par passage (le front montant du freinage).
    const fp = !!player.freinePieton;
    if (fp && !freinait && Math.abs(player.vitesseVoiture || 0) >= VITESSE_PIETON - 1 && horloge - dernierPieton > 4) {
      dernierPieton = horloge; betise('pieton');
    }
    freinait = fp;
    if (casses) {
      const n = casses();
      if (n > cassesVues && horloge - dernierMobilier > 1.5) { dernierMobilier = horloge; betise('mobilier'); }
      cassesVues = n;
    }
  }

  function retirerUnite(u) {
    const i = unites.indexOf(u);
    if (i >= 0) unites.splice(i, 1);
    u.a.menee = false; u.a.enService = false; u.a.elan = null;
    gyrophares(u.a.mesh, false, 0);
  }
  // fin de service : on se gare là où l'on est. La voiture redevient une
  // voiture garée (montable, à portée de la main de l'enfant) — le bestiaire la
  // reprendra à soixante-dix blocs comme toute autre.
  function toutesSeGarent() {
    for (const u of [...unites]) retirerUnite(u);
    sireneJouer(false);
  }

  function apparaitre(type) {
    // on attend le VRAI modèle : une coque d'attente au hasard ne dit pas
    // « police » (la rue n'en montre jamais une non plus, v547)
    if (!(type === 'moto' ? motoPrete() : policePrete)) return null;
    const retard = type === 'moto' ? 48 + 14 : 48;
    const s = abscisseApparition(piste, retard);
    if (s == null) return null;
    const p = piste.positionA(s);
    const a = type === 'moto'
      ? animaux.invoquer('moto', p.x, p.z)
      : animaux.invoquer('voiture', p.x, p.z, false, { flotte: FICHIER_POLICE });
    if (!a) return null;
    a.pos.set(p.x, p.y, p.z);
    if (p.cap != null) a.yaw = p.cap;
    a.menee = true; a.enService = true;
    a.mesh.userData.police = true;
    const u = { a, type, s, v: Math.min(VMAX_POLICE, vitesseEnfant() + 6),
      cible: type === 'moto' ? ECART_MOTO : ECART, vmax: type === 'moto' ? VMAX_MOTO : VMAX_POLICE };
    unites.push(u);
    a.poser();
    return u;
  }

  // les gyrophares de la voiture : mesurés sur son prototype dès qu'il est là
  function equiper(u) {
    const g = u.a.mesh;
    if (u.type === 'moto' || g.userData.eclatsPolice) return;
    if (g.userData.proto) equiperGyrophares(g, g.userData.proto);
  }

  function avancer(u, dt) {
    const ecart = piste.fin - u.s;
    u.v = vitessePoursuite(u.v, ecart, vitesseEnfant(), dt, { cible: u.cible, vmax: u.vmax });
    u.s = Math.min(piste.fin - u.cible * PLANCHER, Math.max(piste.debut, u.s + u.v * dt));
    const p = piste.positionA(u.s);
    if (!p) return;
    u.a.pos.set(p.x, p.y, p.z);
    if (p.cap != null && u.v > 0.2) {
      let d = p.cap - u.a.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      u.a.yaw += d * Math.min(1, dt * 7);
    }
  }

  // --- le contrôle ----------------------------------------------------------
  function commencerControle(u) {
    if (!protoAgent) return false;
    const agent = protoAgent.clone(true);
    const ay = u.a.yaw;
    // la portière du conducteur de la police : à gauche de la voiture qui
    // avance vers (sin, cos) — la gauche est (cos, −sin)
    agent.position.set(u.a.pos.x + Math.cos(ay) * 1.4, u.a.pos.y, u.a.pos.z - Math.sin(ay) * 1.4);
    scene.add(agent);
    controle = { u, agent, etape: 'aller', t: 0, cle: (etat.derniere && etat.derniere.quoi) || 'defaut' };
    sireneJouer(false);
    return true;
  }
  function cibleAgent() {
    // à hauteur de la portière de l'enfant (à gauche de sa voiture : le
    // volant est à gauche, v249) — ou à côté de lui s'il est à pied
    const ay = player.yaw + Math.PI;
    const ecartPortiere = auVolant() ? (player.gabarit || 2.2) / 2 + PRES_PORTIERE : PRES_PORTIERE;
    return { x: player.pos.x + Math.cos(ay) * ecartPortiere, z: player.pos.z - Math.sin(ay) * ecartPortiere };
  }
  function finirControle(parti) {
    const c = controle;
    controle = null;
    if (c && c.agent) { scene.remove(c.agent); liberer(c.agent); }
    if (!parti) { etat = { points: 0, derniere: null }; toutesSeGarent(); appelDit = false; }
  }
  function majControle(dt) {
    const c = controle;
    c.t += dt;
    const g = c.agent;
    // l'enfant repart avant la fin : le policier remonte, la poursuite reprend
    if (c.etape !== 'retour' && (vitesseEnfant() > 3 || Math.hypot(player.pos.x - c.u.a.pos.x, player.pos.z - c.u.a.pos.z) > 30)) {
      c.etape = 'retour'; c.parti = true;
    }
    let vise;
    if (c.etape === 'aller') vise = cibleAgent();
    else if (c.etape === 'retour') {
      const ay = c.u.a.yaw;
      vise = { x: c.u.a.pos.x + Math.cos(ay) * 1.4, z: c.u.a.pos.z - Math.sin(ay) * 1.4 };
    }
    if (vise) {
      const dx = vise.x - g.position.x, dz = vise.z - g.position.z, d = Math.hypot(dx, dz);
      const pas = Math.min(d, (c.etape === 'retour' && c.parti ? PAS_AGENT * 2.5 : PAS_AGENT) * dt);
      if (d > 1e-3) {
        g.position.x += (dx / d) * pas; g.position.z += (dz / d) * pas;
        g.rotation.y = Math.atan2(dx, dz);     // le modèle regarde +z
      }
      g.position.y = player.pos.y + (d > 0.05 ? Math.abs(Math.sin(c.t * 9)) * 0.04 : 0);
      if (d < 0.1 && c.etape === 'aller') {
        c.etape = 'parle'; c.t = 0;
        const { texte, langue: l } = phrasePolice(c.cle, langue ? langue() : 'fr', alterne++);
        c.texte = texte;
        if (dire) dire(texte, l);
      } else if (d < 0.1 && c.etape === 'retour') {
        finirControle(!!c.parti);
        return;
      }
    } else if (c.etape === 'parle') {
      // il regarde l'enfant pendant qu'il parle
      g.rotation.y = Math.atan2(player.pos.x - g.position.x, player.pos.z - g.position.z);
      if (c.t > DUREE_CONTROLE) { c.etape = 'retour'; c.t = 0; }
    }
  }

  // --- chaque image --------------------------------------------------------
  function update() {
    const maintenant = performance.now() / 1000;
    const dt = tPrec == null ? 0 : Math.min(0.25, Math.max(0, maintenant - tPrec));   // temps RÉEL (v226)
    tPrec = maintenant; horloge += dt;

    // la piste : seulement AU VOLANT (une voiture, une moto) — à pied, l'enfant
    // passe des portes où une voiture ne passe pas ; un avion ne se suit pas.
    // Et un saut (la carte) coupe tout : on ne poursuit pas un enfant à
    // travers la carte du monde
    if (auVolant()) {
      if (piste.ajouter(player.pos.x, player.pos.y, player.pos.z) === 'saut') {
        finPrec = null; vPiste = 0;
        if (controle) finirControle(true);
        toutesSeGarent();
        etat = { points: 0, derniere: null }; appelDit = false;
      }
    }
    lireBetises();
    if (finPrec != null && dt > 0) {
      const vInst = Math.max(0, (piste.fin - finPrec) / dt);
      vPiste += (vInst - vPiste) * Math.min(1, dt * 3);
    }
    finPrec = piste.fin;
    if (!auVolant()) vPiste += (Math.hypot(player.vel.x, player.vel.z) - vPiste) * Math.min(1, dt * 3);

    // les unités qu'un autre geste a retirées (l'enfant en a pris une, une
    // carcasse en feu) ne sont plus à nous
    for (const u of [...unites]) {
      if (u.a.dying > 0 || u.a.horsService || u.a.montee || !animaux.animals.includes(u.a)) retirerUnite(u);
    }

    const n = etoiles(etat.points);
    if (n >= 1 && !unites.some((u) => u.type === 'voiture') && !controle) apparaitre('voiture');
    if (n >= 2 && unites.some((u) => u.type === 'voiture') && !unites.some((u) => u.type === 'moto') && !controle) apparaitre('moto');

    const vEnf = vitesseEnfant();
    arretDepuis = vEnf < 1.2 ? arretDepuis + dt : 0;
    for (const u of unites) {
      equiper(u);
      if (!controle) avancer(u, dt);
      else if (u !== controle.u) u.v = 0;
      gyrophares(u.a.mesh, true, horloge);
    }

    // le contrôle : l'enfant s'est arrêté, la voiture est juste derrière
    const voiture = unites.find((u) => u.type === 'voiture');
    if (!controle && voiture && n >= 1) {
      const ecart = piste.fin - voiture.s;
      if (pretAuControle(ecart, vEnf, arretDepuis)) commencerControle(voiture);
    }
    if (controle) majControle(dt);

    // vue de la police, l'oubli, la sirène
    let dMin = Infinity, plus = null;
    for (const u of unites) {
      const d = Math.hypot(u.a.pos.x - player.pos.x, u.a.pos.z - player.pos.z);
      if (d < dMin) { dMin = d; plus = u; }
    }
    const vu = dMin < VU_POLICE;
    etat = oublier(etat, horloge, dt, vu || !!controle);
    if (etat.points <= 0 && unites.length && !controle) { toutesSeGarent(); appelDit = false; }
    if (plus && !controle) {
      // à gauche ou à droite de là où l'enfant regarde : comme le klaxon de la rue
      const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
      const pan = dMin > 1e-3 ? ((plus.a.pos.x - player.pos.x) * rx + (plus.a.pos.z - player.pos.z) * rz) / dMin : 0;
      sireneJouer(true, { distance: dMin, pan });
      // « Police ! Arrête-toi sur le côté » — une fois par poursuite, quand
      // elle arrive à portée de voix : c'est ce qui dit à l'enfant QUOI FAIRE
      if (!appelDit && dMin < 30 && dire) {
        appelDit = true;
        const { texte, langue: l } = phrasePolice('appel', langue ? langue() : 'fr', alterne);
        dire(texte, l);
      }
    } else if (!unites.length) sireneJouer(false);
  }

  // conduire SA voiture de police (ou sa moto) : les gyrophares s'allument
  function auVolantDePolice(t) {
    const a = montureConduite && montureConduite();
    const police = a && a.mesh && (a.mesh.userData.flotte === FICHIER_POLICE || (a.def && a.def.key === 'moto'));
    if (pilotee && pilotee !== (police ? a.mesh : null)) { gyrophares(pilotee, false, 0); pilotee = null; }
    if (!police) return;
    if (a.mesh.userData.proto && a.def.key === 'voiture') equiperGyrophares(a.mesh, a.mesh.userData.proto);
    gyrophares(a.mesh, true, t);
    pilotee = a.mesh;
  }

  return {
    update() { update(); auVolantDePolice(horloge); },
    // ce que la circulation doit éviter : les unités, comme des amis (v305)
    obstacles() {
      return unites.map((u) => ({ x: u.a.pos.x, y: u.a.pos.y, z: u.a.pos.z, cap: u.a.yaw, gabarit: u.type === 'moto' ? 1.2 : 2.2 }));
    },
    etoiles: () => etoiles(etat.points),
    // pour la pilule de la file du centre, et pour les témoins
    etat: () => ({
      points: etat.points, etoiles: etoiles(etat.points), derniere: etat.derniere && etat.derniere.quoi,
      unites: unites.map((u) => ({ type: u.type, x: u.a.pos.x, z: u.a.pos.z, v: u.v, ecart: piste.fin - u.s })),
      controle: controle ? { etape: controle.etape, texte: controle.texte || null, cle: controle.cle,
        x: controle.agent.position.x, z: controle.agent.position.z } : null,
      piste: piste.fin - piste.debut,
    }),
    // pour le banc : une bêtise qu'on provoque (v233), et le grand ménage
    betise,
    estUnite,
    remiseAZero() { if (controle) finirControle(true); toutesSeGarent(); etat = { points: 0, derniere: null }; appelDit = false; },
    BETISES,
  };
}
