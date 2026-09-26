// First-person player: pointer-lock look, WASD movement, AABB voxel collision,
// gravity/jumping, swimming, and a toggleable fly mode.

import * as THREE from 'three';
import { BLOCK, isSolid as blockIsSolid, isSlab } from './blocks.js';
import { HEIGHT, WATER_LEVEL } from './world.js';

const WIDTH = 0.6;        // player AABB width (x and z)
// LE GABARIT D'UN VÉHICULE CONDUIT (v212). Max, capture à l'appui : « cars
// crashing into walls » — une voiture rouge encastrée dans une façade
// haussmannienne, dans une rue de Paris.
//
// Conduire, ici, c'est brancher le véhicule sur les commandes du joueur, donc
// sur SA physique — y compris sa boîte de collision, qui fait SOIXANTE
// CENTIMÈTRES de large. Une voiture en fait 2,26 : elle passait donc au
// travers de tout ce qui la bordait, murs compris, tant que le point central
// restait dans la rue. La dette était écrite dans `CLAUDE.md` depuis la v155 :
// « le véhicule a besoin de sa propre boîte de collision ».
//
// La boîte prend la LARGEUR du véhicule, pas sa longueur : une AABB ne tourne
// pas, et une boîte de 4,4 blocs ne passerait dans aucune rue même en roulant
// droit. Une voiture qui se met en travers mord donc un peu — c'est le prix
// d'une boîte alignée sur les axes, et il est très inférieur à celui d'une
// voiture fantôme.
const PLAYER_HEIGHT = 1.8;
// Assez bas pour que la tête reste dans le monde, assez haut pour qu'on
// puisse bâtir jusqu'au dernier étage.
const PLAFOND_VOL = HEIGHT - PLAYER_HEIGHT - 0.2;
const EYE_HEIGHT = 1.62;
const GRAVITY = 26;
const JUMP_SPEED = 8.6;
// LA MARCHE, RALENTIE (Max, capture depuis une rue de Londres : « la vitesse
// de marche est trop rapide ! »). 4,3 m/s était la valeur de Minecraft — mais
// là-bas un bloc fait un mètre, alors qu'ici un pâté d'immeubles en fait
// quarante : on le traversait en deux secondes, et les villes défilaient au
// lieu de se parcourir. Les distances, elles, se font en volant ou par la
// carte, pas à pied.
const WALK_SPEED = 3.2;
const SPRINT_SPEED = 5.4;
const FLY_SPEED = 11;
// Voler longtemps, c'est vouloir aller loin. Passé trois secondes en l'air,
// on double l'allure — puis, depuis que la carte fait des milliers de blocs
// (Max : « en fonction du temps de vol, la vitesse s'accélère de manière
// progressive »), elle continue de monter, sans à-coup, jusqu'à une vraie
// vitesse de croisière : Paris-Rome se survole en une demi-minute au lieu
// de deux. Un petit saut de toit en toit reste précis : les trois premières
// secondes gardent l'allure de toujours, et se poser remet tout à zéro.
// Réglé DEUX fois sur verdict de Max : la première rampe (un cran par six
// secondes, plafond ×6 atteint à vingt-sept) lui semblait encore molle —
// « j'expect une augmentation progressive de la vitesse plus rapide ». La
// montée se fait donc en dix-sept secondes, et va plus haut.
const FLY_ELAN_APRES = 2;   // secondes de vol continu avant l'élan
const FLY_ELAN = 2;         // multiplicateur au moment de l'élan
const FLY_CROISIERE = 8;    // multiplicateur maximal (88 blocs/s)
const FLY_MONTEE = 2.5;     // secondes de vol pour gagner un cran (+×1)
const SWIM_SPEED = 3.0;
const MAX_STEP = 0.4;     // max movement per collision substep

// LE VOL D'UN AVION — trois chiffres, et chacun a sa raison.
//
// PALIER_DECOLLAGE : la hauteur que le bouton ✈️ fait gagner tout seul. Vingt
// blocs, c'est au-dessus des terminaux (sept blocs), des tours de contrôle
// (treize) et des hangars — l'enfant sort du décor sans rien avoir à faire,
// puis il prend la main.
// MONTEE_DECOLLAGE : ce palier en une seconde et demie environ. Plus lent, on
// croit que le bouton n'a pas marché ; plus vif, on rate le décollage des yeux.
// PART_MONTEE : au manche, on monte au tiers de sa vitesse — un avion qui
// grimperait aussi vite qu'il avance monterait à la verticale.
const PALIER_DECOLLAGE = 20;
const MONTEE_DECOLLAGE = 14;
const PART_MONTEE = 0.33;
const DESCENTE = 12;      // la perte d'altitude quand on se pose
// UN AVION DÉCOLLE DE SA PISTE, ET IL S'Y POSE (v261). Max : « une vraie
// motion de décollage, accélération sur la piste puis décollage en levant le
// nez ; idem à l'atterrissage, baisser l'altitude et ouvrir le train ; et le
// roulage sur la piste. » Cinq états, dans l'ordre où l'enfant les vit :
//
//   sol           on roule au joystick (vitesse de roulage de la fiche), la
//                 roue avant tourne — et seulement si l'on roule
//   decollage     ✈️ : pleins gaz, nez au sol jusqu'à la vitesse de ROTATION
//                 de la fiche, puis le nez se lève et l'on monte au palier ;
//                 le train rentre passé RENTRER_TRAIN_A
//   vol           le joystick tient l'altitude et le cap, comme avant (v228)
//   atterrissage  ✈️ : vitesse d'approche, train sorti, descente jusqu'à
//                 toucher — et un second ✈️ remet les gaz
//   freinage      les roues ont touché : on freine jusqu'à l'arrêt, puis `sol`
//
// Les nombres qui font le caractère de chaque appareil (rotation, approche,
// roulage, frein) vivent dans la FICHE (`pilote`, montures.js) ; ceux-ci sont
// communs à tout ce qui vole.
const APPUI_SOL = 10;             // ce qui plaque l'appareil au sol quand il roule (blocs/s)
const VIRAGE_SOL = 0.6;           // la roue avant, en radians par seconde à vitesse de roulage
const ASSIETTE_ROTATION = 0.22;   // ~12,5° : le nez qui se lève au décollage
const ASSIETTE_APPROCHE = -0.06;  // le nez un peu bas en finale
const HAUTEUR_ARRONDI = 6;        // sous cette hauteur, l'arrondi : on adoucit la descente
// UN AVION NE SE POSE PAS DANS L'EAU (v267). Trois blocs au-dessus de la
// surface : la hauteur à laquelle un appareil tient encore l'air, et sous
// laquelle il n'a plus rien à faire au-dessus de la mer.
const PLANCHER_EAU = WATER_LEVEL + 3;
// Et l'on ne va chercher le fond que quand on s'en approche : `sommetColonne`
// descend colonne par colonne, et c'est inutile à cent blocs d'altitude.
const GARDE_EAU = WATER_LEVEL + 16;
const DESCENTE_ARRONDI = 5;       // ... à cinq blocs par seconde
const ASSIETTE_ARRONDI = 0.05;    // ... et le nez se relève un peu
const ASSIETTE_MAX = 0.35;        // ce que le manche donne au plus, en vol
const TRAIN_SECONDES = 1.6;       // rentrer ou sortir le train
const RENTRER_TRAIN_A = 8;        // hauteur gagnée au-dessus de la piste où le train rentre

// L'INCLINAISON EN VIRAGE — demande de Max (v231) : « quand on va à gauche,
// il tilte un peu ». Trente degrés, c'est le virage d'un avion de ligne en
// croisière ; au-delà on ne joue plus, on fait de la voltige. C'est PUREMENT
// visuel : le cap vient toujours du joystick, et la trajectoire ne change pas
// d'un bloc. Ce que ça change, c'est qu'un virage se VOIT — un avion qui
// tourne à plat ressemble à une maquette qu'on pousse sur une table.
const ROULIS_MAX = 0.52;          // ~30°

// LA MANETTE DES GAZ ET LE VOLANT (v262). Max : « le joystick à gauche pour la
// direction et, en multitouch, à droite un cadran qu'on monte/baisse pour la
// vitesse ; accélérer et ralentir les voitures, idem pour les avions ».
// `gaz` est la consigne de la manette (0 à 1), ou null tant qu'elle n'a pas
// été touchée — alors l'avant du joystick reste l'accélérateur, comme avant.
// Une voiture a désormais de l'INERTIE : elle prend sa vitesse en une
// demi-seconde et freine plus fort encore ; et c'est le joystick ↔ qui la
// fait tourner, d'autant plus qu'elle roule — à l'arrêt, un volant ne fait
// rien. La demi-seconde est un choix d'enfant : assez pour qu'un départ se
// voie, pas assez pour qu'on croie la voiture en panne.
const ACCEL_VOITURE = 2.0;        // fraction de l'allure gagnée par seconde
const FREIN_VOITURE = 2.5;        // fraction de l'allure perdue par seconde
const BRAQUAGE = 1.3;             // radians par seconde à plein volant
const RECUL = 0.35;               // la marche arrière, part de l'allure

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.pos = new THREE.Vector3(0, 60, 0); // feet position
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.flying = false;
    // UNE VOITURE NE VOLE PAS (Max, août 2026 : « aujourd'hui, on est capable
    // de voler avec une voiture. Je ne veux pas qu'une voiture vole »).
    //
    // Conduire, dans ce jeu, c'est brancher le véhicule sur les commandes du
    // joueur — donc sur SA physique. Le vol en faisait partie sans que
    // personne l'ait décidé : une berline montait dans le ciel à la touche F.
    // Le drapeau vit ici parce que c'est ici que le vol se décide, et il est
    // POSÉ par la fiche de l'espèce (`vole: false`), jamais par une liste de
    // véhicules écrite ailleurs — même règle que `montable` et `nourrissable`.
    this.volInterdit = false;
    // La largeur de la boîte de collision. `WIDTH` à pied ; la fiche de
    // l'espèce la remplace quand on prend le volant (`gabarit`).
    this.gabarit = WIDTH;
    this.volDepuis = 0;       // secondes de vol continu, cf. FLY_ELAN_APRES
    this.inWater = false;
    this.keys = new Set();
    this.touchMove = { f: 0, s: 0 }; // analog stick input, -1..1
  }

  setSpawn(x, y, z) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
  }

  onMouseMove(dx, dy) {
    const sensitivity = 0.0024;
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    const limit = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
  }

  // La fiche du véhicule décide, le joueur obéit. Monter dans une voiture
  // pose l'interdit ET coupe le vol en cours — sinon l'enfant déjà en l'air
  // repartirait avec la voiture au plafond du monde.
  // DÉCOLLER ET SE POSER — le bouton ✈️, quand on est aux commandes.
  //
  // Il rend ce qu'il vient de faire pour que l'appelant le DISE à l'enfant :
  // un bouton qui change tout sans un mot laisse croire qu'il n'a rien fait.
  decollerOuSePoser() {
    if (!this.pilote) return null;
    const etat = this.avionEtat || (this.avionEnVol ? 'vol' : 'sol');
    if (etat === 'vol' || (etat === 'decollage' && this.rotationFaite)) {
      this.avionEtat = 'atterrissage';
      return 'atterrissage';
    }
    if (etat === 'atterrissage') {
      // remise des gaz : on repart d'où l'on est, nez en l'air
      this.avionEtat = 'decollage'; this.rotationFaite = true; this.avionEnVol = true;
      this.altitudeDecollage = this.pos.y;
      return 'remise';
    }
    // au sol, ou encore en train de freiner : pleins gaz, le nez se lèvera
    // tout seul à la vitesse de rotation
    this.avionEtat = 'decollage'; this.rotationFaite = false;
    this.altitudeDecollage = this.pos.y;
    return 'decollage';
  }

  // Le sol sous un appareil qui roule : la cote du bloc plein sous l'origine.
  // Un saut d'UN bloc se franchit — un bord de dalle, une bordure — parce
  // qu'un avion qui ne peut plus rouler ne peut plus décoller, et l'enfant
  // resterait planté là. Deux blocs, c'est un mur.
  // Y A-T-IL DE L'EAU SOUS L'APPAREIL ? La question se pose au sommet SOLIDE
  // de la colonne — au-dessus de la mer, c'est le fond — et l'on regarde ce
  // qu'il y a juste au-dessus : de l'eau, ou de l'air. Bornée en altitude :
  // à cent blocs on ne va pas chercher le fond de l'océan à chaque image.
  eauSousLAppareil() {
    if (this.pos.y > GARDE_EAU) return false;
    const fx = Math.floor(this.pos.x), fz = Math.floor(this.pos.z);
    const sol = this.world.sommetColonne(fx, fz);
    return this.world.getBlock(fx, sol + 1, fz) === BLOCK.WATER;
  }

  // LA BOÎTE EST-ELLE LIBRE ICI ? La même géométrie que `sweepAxis` — largeur
  // `gabarit`, hauteur du joueur, dalles à mi-hauteur —, posée en question au
  // lieu d'être posée en déplacement. C'est ce qui permet de demander « et si
  // je montais d'un bloc ? » sans bouger de là où l'on est.
  boiteLibre(x, y, z) {
    const half = this.gabarit / 2, eps = 1e-4;
    const minX = Math.floor(x - half + eps), maxX = Math.floor(x + half - eps);
    const minY = Math.floor(y + eps), maxY = Math.floor(y + PLAYER_HEIGHT - eps);
    const minZ = Math.floor(z - half + eps), maxZ = Math.floor(z + half - eps);
    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        for (let bx = minX; bx <= maxX; bx++) {
          const id = by < 0 ? BLOCK.STONE : this.world.getBlock(bx, by, bz);
          if (!blockIsSolid(id)) continue;
          if (this.world.blocSousLaSurface && this.world.blocSousLaSurface(bx, by, bz)) continue;   // sol continu (v297)
          if (y >= by + (isSlab(id) ? 0.5 : 1) - eps) continue;   // on est au-dessus
          return false;
        }
      }
    }
    return true;
  }

  // UNE VOITURE FRANCHIT UNE MARCHE D'UN BLOC (v286).
  //
  // Max : « je voudrais que les voitures puissent circuler correctement […]
  // qu'on n'ait pas vraiment des blocs carrés qui empêchent le véhicule de
  // circuler. » Mesuré sur `terrainHeight`, pur, huit régions de la carte :
  //
  //   · 92 à 97 % de ce qui arrête une voiture dans la nature est une marche
  //     d'EXACTEMENT UN BLOC (marches > 1 : 0,2 à 0,7 % des paires voisines) ;
  //   · une voiture fait aujourd'hui 11 à 22 blocs avant d'être arrêtée ;
  //   · en lui laissant franchir UN bloc : 80 à 226, soit ×6 à ×17.
  //
  // ET DEUX BLOCS EST UN NON-RÉSULTAT MESURÉ : identique dans sept régions sur
  // huit (142/142, 179/179, 164/164, 135/135, 181/181). On ne le réessaie pas —
  // cela n'achèterait rien et laisserait une voiture escalader un mur.
  //
  // CE QUI REND LA RÈGLE SÛRE, C'EST QU'ELLE SE GARDE ELLE-MÊME : on ne monte
  // que si la boîte ENTIÈRE passe un bloc plus haut. Contre un mur de deux
  // blocs, la boîte montée touche le second — refusé. Un escalier d'une marche
  // par bloc, lui, se gravit, et c'est exactement ce qu'est une colline.
  //
  // Elle ne touche NI `terrainHeight` NI un bloc : les deux empreintes de
  // `plafond.js` ne bougent pas, et l'invariant 1 tient sans rien déclarer.
  // `DEGAGEMENT` est ce qu'il faut avancer pour passer LE BORD de la marche : en
  // montant sur place on retomberait dessus. Un peu plus du demi-gabarit d'une
  // voiture n'est pas une bonne idée — elle tiendrait dans le mur — c'est la
  // profondeur d'une case qui compte, et 0,7 la couvre. Le chiffre se remesure
  // le jour où une voiture lurche à basse vitesse : le témoin publie la distance.
  franchirEnRoulant(dx, dz) {
    const y = this.pos.y, x = this.pos.x + dx, z = this.pos.z + dz;
    if (!this.boiteLibre(x, y + 1, z)) return false;
    this.pos.x = x; this.pos.z = z; this.pos.y = y + 1;
    return true;
  }

  franchirUneMarche(dx, dz) {
    const w = this.world;
    const x = Math.floor(this.pos.x + dx), z = Math.floor(this.pos.z + dz);
    const y = Math.floor(this.pos.y + 0.01);
    if (!blockIsSolid(w.getBlock(x, y, z))) return false;
    for (let h = 1; h <= 3; h++) if (blockIsSolid(w.getBlock(x, y + h, z))) return false;
    const xi = Math.floor(this.pos.x), zi = Math.floor(this.pos.z);
    for (let h = 1; h <= 3; h++) if (blockIsSolid(w.getBlock(xi, y + h, zi))) return false;
    this.pos.y = y + 1 + 1e-3;
    return true;
  }

  interdireVol(interdit) {
    this.volInterdit = !!interdit;
    if (interdit) this.flying = false;
  }
  // Le gabarit de ce qu'on pilote. Rendu à sa valeur de piéton dès qu'on
  // descend — sans quoi l'enfant garderait la boîte d'une voiture à pied et
  // resterait bloqué entre deux murs.
  prendreGabarit(largeur) {
    this.gabarit = largeur > 0 ? largeur : WIDTH;
  }


  toggleFly() {
    // Refuser en silence serait pire que tout : l'enfant appuierait dix fois.
    // On rend `false`, et l'appelant explique pourquoi.
    if (this.volInterdit) { this.flying = false; return false; }
    this.flying = !this.flying;
    this.volDepuis = 0;   // on repart au pas : l'élan se mérite
    this.vel.y = 0;
    return true;
  }

  // Vitesse de vol du moment. Elle double après quelques secondes en l'air,
  // puis grandit d'un cran toutes les FLY_MONTEE secondes jusqu'à la
  // croisière — la progression que Max a demandée pour la grande carte.
  vitesseVol() {
    if (this.volDepuis < FLY_ELAN_APRES) return FLY_SPEED;
    const facteur = Math.min(FLY_CROISIERE, FLY_ELAN + (this.volDepuis - FLY_ELAN_APRES) / FLY_MONTEE);
    return FLY_SPEED * facteur;
  }

  // Vrai quand l'élan est pris — le jeu s'en sert pour le dire à l'enfant.
  volLance() {
    return this.flying && this.volDepuis >= FLY_ELAN_APRES;
  }

  // Vrai quand la croisière est atteinte — même usage.
  volCroisiere() {
    return this.flying && this.vitesseVol() >= FLY_SPEED * FLY_CROISIERE;
  }

  eyePosition() {
    return new THREE.Vector3(this.pos.x, this.pos.y + EYE_HEIGHT, this.pos.z);
  }

  // Does the given block position intersect the player's AABB?
  intersectsBlock(bx, by, bz) {
    const half = this.gabarit / 2;
    return (
      bx + 1 > this.pos.x - half && bx < this.pos.x + half &&
      bz + 1 > this.pos.z - half && bz < this.pos.z + half &&
      by + 1 > this.pos.y && by < this.pos.y + PLAYER_HEIGHT
    );
  }

  update(dt) {
    const k = this.keys;
    const forward = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0) + this.touchMove.f;
    const strafe = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + this.touchMove.s;

    // PILOTER — LE TROISIÈME MODE, ET IL N'INVENTE AUCUNE COMMANDE.
    //
    // Trois façons d'être porté, et celle-ci manquait depuis la v155 : la
    // monture suit le joueur, le convoi suit son tracé, et le PILOTE décide
    // où l'on va. Comme les deux autres, elle se réduit aux trois nombres que
    // le clavier et le joystick tactile alimentent déjà — `forward`, `strafe`
    // et le regard. Rien de neuf à apprendre pour un enfant, et l'iPad marche
    // sans une ligne de plus.
    //
    // Le branchement est celui que le projet a écrit avant de l'implanter :
    //   forward → la poussée      strafe → le roulis      le regard → l'assiette
    //   et la portance dépend de la vitesse.
    if (this.pilote) {
      const p = this.pilote;
      if (this.vitesseAvion === undefined) this.vitesseAvion = 0;
      if (!this.avionEtat) this.avionEtat = this.avionEnVol ? 'vol' : 'sol';
      if (this.assietteAvion === undefined) this.assietteAvion = 0;
      if (this.trainSorti === undefined) this.trainSorti = 1;
      if (this.roulisAvion === undefined) this.roulisAvion = 0;
      // LES COMMANDES SONT CELLES QUE MAX A DEMANDÉES (v228) : « le bouton
      // avion le fait décoller, et le joystick manage la hauteur, direction,
      // altitude, gauche droite ». Et depuis la v261 le même bouton fait
      // TOUT le trajet d'un vol : pleins gaz sur la piste, rotation, montée ;
      // approche, train sorti, toucher, freinage ; et le joystick fait rouler
      // au sol. Un enfant de sept ans a deux axes et un bouton, et ce qu'il
      // veut, c'est choisir OÙ IL VA.
      //
      //   ✈️ (bouton)     décoller ; se poser ; remettre les gaz
      //   joystick ↕      au sol : rouler · en vol : monter et descendre
      //   joystick ↔      au sol : la roue avant · en vol : tourner
      //   le regard       libre — on regarde le paysage sans changer de cap
      const etat = this.avionEtat;
      const auSol = etat === 'sol' || etat === 'freinage' || (etat === 'decollage' && !this.rotationFaite);
      // LA VITESSE EST AUTOMATIQUE, et c'est elle qui garde le caractère de
      // chaque appareil : la pointe, la poussée, la vitesse de rotation et
      // l'approche viennent de la fiche.
      // ET LA MANETTE DES GAZ (v262) : en vol elle fixe la vitesse, au sol
      // l'allure de roulage ; les deux trajets assistés (décollage,
      // atterrissage) la tiennent eux-mêmes — pleins gaz, puis l'approche —
      // et le cadran suit.
      let cible, accel = p.poussee;
      if (etat === 'sol') {
        // ET UN AVION SE REPOUSSE (v269). `Math.max(0, forward)` écrasait le
        // geste : tirer le joystick en arrière ne faisait rien du tout, et un
        // appareil nez contre un hangar y restait pour toujours. On recule au
        // pas — la moitié de l'allure de roulage, c'est un repoussage, pas
        // une marche arrière de voiture — et le cadran suit le geste.
        if (forward < -0.5) {
          if (this.gaz != null) this.gaz = 0;
          cible = this.vitesseAvion > 0.5 ? 0 : forward * (p.roulage || 6) * RECUL;
        } else {
          cible = (this.gaz != null ? this.gaz : Math.max(0, forward)) * (p.roulage || 6);
        }
        accel = Math.max(p.frein || 0, p.poussee);
      } else if (etat === 'decollage') {
        cible = p.max; if (this.gaz != null) this.gaz = 1;
      } else if (etat === 'vol') {
        cible = this.gaz != null ? this.gaz * p.max : p.max;
      } else if (etat === 'atterrissage') {
        cible = p.approche || Math.max(p.decrochage * 1.3, p.max * 0.5);
        if (this.gaz != null) this.gaz = cible / p.max;
      } else {
        cible = 0; accel = p.frein || p.poussee * 1.5;   // freinage
        if (this.ventre) accel *= 2;
      }
      const ecart = cible - this.vitesseAvion;
      this.vitesseAvion += Math.sign(ecart) * Math.min(accel * dt, Math.abs(ecart));
      const v = this.vitesseAvion;
      // LE CAP. En vol, le taux de virage de la fiche : le chasseur tourne
      // trois fois plus court que le Concorde. Au sol, la ROUE AVANT : elle
      // ne tourne que si l'on roule, et de moins en moins à mesure qu'on va
      // vite — à pleine vitesse sur la piste on ne fait pas de tête-à-queue.
      if (auSol) {
        // L'AMPLITUDE VIENT DE |v|, LE SENS DU SIGNE — en reculant, la roue
        // avant fait tourner l'appareil dans l'autre sens, exactement comme
        // le volant d'une voiture (v212). Sans `abs`, un `v` négatif rendait
        // `Math.min(1, v/4)` négatif ET `1 − v/80` supérieur à un : le
        // virage s'inversait puis s'amplifiait.
        const av = Math.abs(v);
        this.yaw -= strafe * VIRAGE_SOL * Math.min(1, av / 4) * Math.max(0.3, 1 - av / 80)
          * (v < 0 ? -1 : 1) * dt;
      } else {
        this.yaw -= strafe * p.virage * dt;
      }
      // ON ENTRE DANS L'INCLINAISON ET L'ON EN SORT, on n'y saute pas : une
      // aile qui claque d'un coup n'est pas un avion, c'est un interrupteur.
      // Et la VIVACITÉ vient de la fiche — un chasseur s'incline sec, un
      // Concorde prend son temps — comme le reste de son caractère. Au sol,
      // les ailes restent à plat.
      const cibleRoulis = auSol ? 0 : -strafe * ROULIS_MAX;
      const vif = Math.min(1, dt * 3 * (p.virage / 0.55));
      this.roulisAvion += (cibleRoulis - this.roulisAvion) * vif;
      this.vel.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).multiplyScalar(v);
      // LA HAUTEUR, ET L'ASSIETTE QUI VA AVEC. L'assiette est purement
      // visuelle — c'est le nez que l'enfant voit se lever —, la trajectoire
      // ne lui doit rien.
      let cibleAssiette = 0;
      if (etat === 'decollage') {
        if (!this.rotationFaite) {
          this.vel.y = -APPUI_SOL;
          if (v >= (p.rotation || p.decrochage * 1.4)) {
            this.rotationFaite = true; this.avionEnVol = true;
            this.altitudeDecollage = this.pos.y;
          }
        }
        if (this.rotationFaite) {
          // LE DÉCOLLAGE MONTE TOUT SEUL jusqu'à une hauteur où l'on respire
          // (v228) : au-dessus des terminaux et des tours de contrôle.
          this.vel.y = MONTEE_DECOLLAGE;
          cibleAssiette = ASSIETTE_ROTATION;
          if (this.pos.y - this.altitudeDecollage >= PALIER_DECOLLAGE) this.avionEtat = 'vol';
        }
      } else if (etat === 'vol') {
        this.vel.y = forward * p.max * PART_MONTEE;
        // SOUS LA VITESSE DE DÉCROCHAGE, L'AVION NE TIENT PLUS L'AIR : gaz
        // réduits, il descend, d'autant plus vite qu'il est lent — c'est ce
        // qui permet de se poser soi-même, manette en bas et manche en avant.
        if (v < p.decrochage) this.vel.y = Math.min(this.vel.y, -(1 - v / p.decrochage) * DESCENTE);
        // ET L'ATTERRISSAGE MANUEL NE PLONGE PAS NON PLUS (v267) : manche en
        // avant au-dessus de la mer, l'appareil s'arrête à trois blocs de la
        // surface au lieu de couler. Le décrochage continue de le faire
        // descendre partout ailleurs — c'est ce qui permet de se poser
        // soi-même sur une vraie piste.
        if (this.pos.y <= PLANCHER_EAU && this.vel.y < 0 && this.eauSousLAppareil()) {
          this.vel.y = 0;
          this.pos.y = Math.max(this.pos.y, PLANCHER_EAU);
        }
        cibleAssiette = Math.max(-ASSIETTE_MAX, Math.min(ASSIETTE_MAX,
          Math.atan2(this.vel.y, Math.max(1, v)) * 1.4));
      } else if (etat === 'atterrissage') {
        // SE POSER, C'EST DESCENDRE JUSQU'AU SOL, pas se téléporter : le
        // bouton lance l'atterrissage et l'appareil perd de l'altitude tant
        // qu'il n'a pas retouché la piste — train sorti, nez un peu bas. Et
        // L'ARRONDI : sous six blocs, la descente s'adoucit et le nez se
        // relève un peu, comme un vrai appareil juste avant de toucher.
        //
        // MAIS PAS DANS L'EAU (v267). Max : « un avion ne peut pas atterrir
        // dans l'eau ». `sommetColonne` cherche le premier bloc SOLIDE en
        // descendant, et l'eau n'en est pas un : au-dessus de la mer elle
        // rend le FOND, et l'appareil descendait tranquillement jusque-là.
        // Mesuré au large de Nice (sonde `v267/sonde-eau`) : posé à y = 25,
        // sous CINQ blocs d'eau, à rouler au fond de la Méditerranée.
        //
        // Ce qu'un vrai pilote fait devant une piste impraticable, c'est une
        // REMISE DES GAZ : on ne force pas, on remonte et l'on va chercher
        // la terre. C'est le geste réel, et il n'a rien de violent — le jeu
        // dit à l'enfant quoi faire.
        if (this.eauSousLAppareil()) {
          this.avionEtat = 'vol'; this.avionEnVol = true;
          if (this.gaz != null) this.gaz = 1;
          this.vel.y = Math.max(this.vel.y, MONTEE_DECOLLAGE * 0.6);
          cibleAssiette = ASSIETTE_ROTATION;
          if (this.surAvion) this.surAvion('remiseDesGaz');
        } else {
          const sol = this.world.sommetColonne(Math.floor(this.pos.x), Math.floor(this.pos.z));
          const hauteur = this.pos.y - (sol + 1);
          const arrondi = hauteur < HAUTEUR_ARRONDI;
          this.vel.y = arrondi ? -DESCENTE_ARRONDI : -DESCENTE;
          cibleAssiette = arrondi ? ASSIETTE_ARRONDI : ASSIETTE_APPROCHE;
        }
      } else {
        this.vel.y = -APPUI_SOL;   // sol, freinage : plaqué à la piste
      }
      this.assietteAvion += (cibleAssiette - this.assietteAvion) * Math.min(1, dt * 2.5);
      // LE TRAIN : sorti au sol, en finale et jusqu'à huit blocs au-dessus de
      // la piste ; rentré au-delà. Il rentre et sort en une seconde et demie.
      // En vol, c'est le bouton 🛞 qui décide (`trainVoulu`) : rentré par
      // défaut, sorti pour se poser soi-même.
      const trainDehors = auSol || etat === 'atterrissage'
        || (etat === 'decollage' && this.pos.y - this.altitudeDecollage < RENTRER_TRAIN_A)
        || (etat === 'vol' && this.trainVoulu === true);
      this.trainSorti = Math.max(0, Math.min(1,
        this.trainSorti + (trainDehors ? 1 : -1) * dt / TRAIN_SECONDES));
      // Le ciel a le même toit que pour tout le monde.
      if (this.pos.y >= PLAFOND_VOL) this.vel.y = Math.min(this.vel.y, 0);
      const vol = this.vel.clone().multiplyScalar(dt);
      const pas = Math.max(1, Math.ceil(vol.length() / MAX_STEP));
      const vx0 = this.vel.x, vz0 = this.vel.z;
      const etaitAuSolAvion = this.onGround;
      const avantXa = this.pos.x, avantZa = this.pos.z;
      this.onGround = false;
      for (let i = 0; i < pas; i++) {
        this.sweepAxis(0, vol.x / pas);
        this.sweepAxis(1, vol.y / pas);
        this.sweepAxis(2, vol.z / pas);
      }
      this.contactSolContinu(etaitAuSolAvion, Math.hypot(this.pos.x - avantXa, this.pos.z - avantZa), etat === 'vol' || etat === 'decollage');
      // Bloqué par une marche en roulant : on la franchit si elle ne fait
      // qu'un bloc.
      if (auSol && v > 0.5 && ((vx0 !== 0 && this.vel.x === 0) || (vz0 !== 0 && this.vel.z === 0))) {
        this.franchirUneMarche(-Math.sin(this.yaw) * 0.8, -Math.cos(this.yaw) * 0.8);
      }
      // LES ROUES TOUCHENT : on freine. Et à l'arrêt, on roule au joystick.
      if ((etat === 'atterrissage' || etat === 'vol') && this.onGround) {
        // Posé soi-même sans sortir le train, c'est sur le ventre : ça
        // freine deux fois plus fort, et on le dit.
        this.ventre = this.trainSorti < 0.5;
        this.avionEtat = 'freinage'; this.avionEnVol = false;
        if (this.surAvion) this.surAvion(this.ventre ? 'ventre' : 'touche');
      } else if (etat === 'freinage' && this.vitesseAvion < 0.5) {
        this.avionEtat = 'sol'; this.vitesseAvion = 0; this.ventre = false; this.trainVoulu = undefined;
        if (this.surAvion) this.surAvion('arret');
      }
      this.syncCamera();
      return;
    }

    const bodyBlock = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.4), Math.floor(this.pos.z));
    const headBlock = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + EYE_HEIGHT), Math.floor(this.pos.z));
    this.inWater = bodyBlock === BLOCK.WATER || headBlock === BLOCK.WATER;

    // Horizontal velocity from input, rotated by yaw.
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let dx = (-sin * forward + cos * strafe);
    let dz = (-cos * forward - sin * strafe);
    const len = Math.hypot(dx, dz);
    if (len > 1) { dx /= len; dz /= len; } // keep analog magnitudes below 1

    // POSÉ, PAS EN L'AIR. En mode vol on peut marcher au sol — le vol ne se
    // coupe pas quand on atterrit — et la rampe de croisière s'appliquait
    // donc aussi à la marche : « on est à pied et pas en vol, la vitesse ne
    // doit pas accélérer » (Max). `onGround` ne sert à rien ici : en vol la
    // vitesse verticale est nulle et la collision vers le bas ne se déclenche
    // jamais. Posé = un bloc solide juste sous les pieds, et alors on marche
    // à la vitesse de la marche, élan remis à zéro.
    const solSous = this.world.getBlock(
      Math.floor(this.pos.x), Math.floor(this.pos.y - 0.15), Math.floor(this.pos.z));
    const pose = blockIsSolid(solSous);
    const enLair = this.flying && !pose;
    if (enLair) this.volDepuis += dt; else this.volDepuis = 0;

    let speed = k.has('ShiftLeft') || k.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED;
    if (enLair) speed = this.vitesseVol();
    else if (this.inWater) speed = SWIM_SPEED;
    if (this.boost) speed *= this.boost; // riding a mount / berry-juice power-up

    if (this.gabarit > 1) {
      // AU VOLANT (v262) : la manette des gaz — ou l'avant du joystick tant
      // qu'elle n'a pas servi — fixe la vitesse visée, l'inertie fait le
      // reste, et le joystick ↔ tourne le volant. La marche arrière, lente,
      // se prend en tirant le joystick à l'arrêt.
      if (this.vitesseVoiture === undefined) this.vitesseVoiture = 0;
      const max = speed;
      // LE PLAFOND SE PUBLIE LÀ OÙ IL SE CALCULE (v268). Le bruit du moteur
      // suit le régime, c'est-à-dire la vitesse rapportée à ce que la voiture
      // sait faire — et cette allure vient de la classe du modèle (v260).
      // Le recopier dans `fun.js` le rendrait faux à la première classe qu'on
      // ajoute, sans que rien ne rougisse : c'est le piège de l'échelle.
      this.vitesseVoitureMax = max;
      // TIRER LE JOYSTICK EN ARRIÈRE FREINE, PUIS RECULE — QUOI QUE DISE LE
      // CADRAN (v269). Max : « impossible de faire marche arrière avec un
      // avion ou une voiture. » La marche arrière exigeait TROIS conditions
      // à la fois : cadran sous cinq pour cent, voiture à l'arrêt, joystick
      // tiré. Or le cadran RESTE où on l'a laissé (v262) : dès qu'un enfant
      // y avait touché, il lui fallait un second doigt pour le ramener à
      // zéro avant de pouvoir reculer. À sept ans, la marche arrière
      // n'existait pas.
      //
      // Le geste prime donc sur la consigne, comme une pédale de frein
      // annule un régulateur de vitesse — et LE CADRAN SUIT LE GESTE, sinon
      // il afficherait pleins gaz pendant qu'on recule, et la voiture
      // bondirait en avant au relâchement.
      let consigne;
      if (forward < -0.5) {
        if (this.gaz != null) this.gaz = 0;
        // on freine d'abord : on ne passe pas la marche arrière à vingt
        // blocs par seconde
        consigne = this.vitesseVoiture > 0.5 ? 0 : forward * max * RECUL;
      } else if (this.gaz != null) {
        consigne = this.gaz * max;
      } else {
        consigne = Math.max(0, forward) * max;
      }
      const ecart = consigne - this.vitesseVoiture;
      const taux = Math.abs(consigne) > Math.abs(this.vitesseVoiture) ? ACCEL_VOITURE : FREIN_VOITURE;
      this.vitesseVoiture += Math.sign(ecart) * Math.min(max * taux * dt, Math.abs(ecart));
      const v = this.vitesseVoiture;
      this.yaw -= strafe * BRAQUAGE * Math.min(1, Math.abs(v) / 3) * (v < 0 ? -1 : 1) * dt;
      this.vel.x = -Math.sin(this.yaw) * v;
      this.vel.z = -Math.cos(this.yaw) * v;
    } else {
      this.vitesseVoiture = 0;
      this.vel.x = dx * speed;
      this.vel.z = dz * speed;
    }
    // ce que l'enfant DEMANDE, avant qu'un obstacle ne l'arrête : c'est ce
    // qu'un piéton lit pour s'écarter d'une voiture qui veut passer (v259)
    this.pousse = { x: this.vel.x, z: this.vel.z };

    if (this.flying) {
      const v = this.vitesseVol();
      this.vel.y = 0;
      if (k.has('Space')) this.vel.y = v;
      if (k.has('KeyC')) this.vel.y = -v;
      // Le ciel a un toit.
      //
      // Rien n'arrêtait la montée : un enfant qui gardait le doigt sur
      // « monter » sortait du monde par le haut, dans une zone où plus rien
      // n'existe et où poser un bloc ne fait rien du tout — le jeu finissait
      // par le reposer au sol sans un mot, comme s'il avait triché. On bute
      // désormais contre le plafond, ce qui se comprend tout seul.
      if (this.pos.y >= PLAFOND_VOL) this.vel.y = Math.min(this.vel.y, 0);
    } else if (this.inWater) {
      this.vel.y -= GRAVITY * 0.25 * dt;
      this.vel.y *= Math.pow(0.02, dt); // heavy drag
      if (k.has('Space')) this.vel.y = SWIM_SPEED;
      this.vel.y = Math.max(this.vel.y, -4);
    } else {
      this.vel.y -= GRAVITY * dt;
      this.vel.y = Math.max(this.vel.y, -50);
      if (k.has('Space') && this.onGround) {
        this.vel.y = JUMP_SPEED;
        this.onGround = false;
      }
    }

    // Move with collision, in substeps so we never tunnel through blocks.
    const move = this.vel.clone().multiplyScalar(dt);
    // AU VOLANT, ON NE RENTRE PAS DANS UNE VOITURE DE LA RUE (v245). La boîte
    // de collision ne connaît que les blocs ; `obstacleVehicule` (branché par
    // main.js sur la circulation) dit si la voiture de l'enfant, un pas plus
    // loin, toucherait une voiture de la rue. On ne bloque que si l'on n'est
    // pas DÉJÀ dedans — sinon une voiture arrivée au travers de la nôtre nous
    // clouerait sur place.
    // Le crochet reçoit AUSSI la position actuelle (v252) : c'est lui qui
    // applique « pas si l'on est déjà dedans », FAMILLE PAR FAMILLE — une
    // voiture de la rue collée à la nôtre ne doit pas nous laisser traverser
    // un réverbère.
    if (this.gabarit > 1 && !this.pilote && this.obstacleVehicule && (move.x !== 0 || move.z !== 0)) {
      const cap = this.yaw + Math.PI;
      if (this.obstacleVehicule(this.pos.x + move.x, this.pos.z + move.z, cap, this.pos.x, this.pos.z)) {
        move.x = 0; move.z = 0; this.vel.x = 0; this.vel.z = 0;
      }
    }
    // ET À PIED NON PLUS, ON NE TRAVERSE PAS UNE VOITURE (v278).
    //
    // Max : « quand on joue avec le jeu, on ne devrait pas être capable de
    // pouvoir marcher à travers une voiture. » La branche ci-dessus est gardée
    // par `gabarit > 1` depuis la v245 : elle ne parle qu'au VOLANT, donc à
    // pied le crochet n'était jamais consulté et l'enfant passait au travers.
    //
    // ET CE N'EST PAS LE MÊME CROCHET, parce que ce n'est pas la même question.
    // `obstacleVehicule` juge avec le RECTANGLE d'une voiture (2,26 blocs de
    // large) : appliqué à pied, il donnerait à l'enfant la carrure d'une
    // berline et le collerait à un mètre de tout. Ce qu'un piéton demande,
    // c'est « ce POINT est-il dans une voiture ? » — la question que
    // `world.obstaclePieton` (v259) pose déjà pour les passants, et qui laisse
    // de côté la voiture de l'enfant quand il n'est pas dedans.
    //
    // ON N'EXAMINE QUE L'ENTRÉE, comme partout ailleurs : si l'on est DÉJÀ
    // dedans — une voiture est venue se garer sur nous —, on sort librement.
    // Et l'on juge AXE PAR AXE, sinon on se colle au flanc d'une voiture au
    // lieu de la longer : c'est ce que `sweepAxis` fait déjà pour les blocs.
    if (!(this.gabarit > 1) && !this.pilote && this.pietonBloque
        && (move.x !== 0 || move.z !== 0)) {
      const y = this.pos.y;
      if (!this.pietonBloque(this.pos.x, this.pos.z, y)) {
        if (move.x !== 0 && this.pietonBloque(this.pos.x + move.x, this.pos.z, y)) {
          move.x = 0; this.vel.x = 0;
        }
        if (move.z !== 0 && this.pietonBloque(this.pos.x, this.pos.z + move.z, y)) {
          move.z = 0; this.vel.z = 0;
        }
      }
    }
    const steps = Math.max(1, Math.ceil(move.length() / MAX_STEP));
    const etaitAuSol = this.onGround;
    this.onGround = false;
    const avantX = this.pos.x, avantZ = this.pos.z;
    for (let i = 0; i < steps; i++) {
      this.sweepAxis(0, move.x / steps);
      this.sweepAxis(1, move.y / steps);
      this.sweepAxis(2, move.z / steps);
    }
    this.contactSolContinu(etaitAuSol, Math.hypot(this.pos.x - avantX, this.pos.z - avantZ), this.flying);
    // UNE VOITURE QUI TOUCHE QUELQUE CHOSE PERD SA VITESSE (v272). Max,
    // capture de Hambourg : « il est marqué 86 km/h », voiture immobile dans
    // le port. `vitesseVoiture` était la vitesse DEMANDÉE : ni la boîte de
    // collision ni le crochet d'obstacle ne la touchaient, si bien qu'une
    // voiture plaquée contre un mur gardait vingt-quatre blocs par seconde
    // pour toujours — le compteur le disait, le bruit du moteur le disait,
    // les roues tournaient. On la borne donc au déplacement RÉELLEMENT
    // obtenu, c'est-à-dire à ce que la voiture FAIT : contre un mur elle
    // tombe à zéro, et elle reprend son allure en une demi-seconde
    // (`ACCEL_VOITURE`) dès que la voie est libre.
    //
    // `pousse` — ce qu'un piéton lit pour s'écarter (v259) — est relevé plus
    // haut, AVANT le déplacement, et reste donc la vitesse demandée : une
    // voiture arrêtée devant quelqu'un veut encore passer, et c'est ce qui
    // fait que le piéton s'écarte au lieu de la bloquer pour toujours.
    //
    // ET L'ON NE BORNE QUE CE QUI EST BLOQUÉ, PAS CE QUI FROTTE. Mon premier
    // jet ramenait la vitesse au déplacement réel À CHAQUE image, quel qu'il
    // soit : une voiture qui rase un mur, ou dont le pas est rogné par une
    // bordure, tombait alors à presque rien — et comme elle repart de CETTE
    // valeur, la borne se mordait la queue. Mesuré à la sonde au point
    // d'apparition, accélérateur tenu trois secondes : 4,4 blocs parcourus, la
    // vitesse demandée montée à 17,9 puis **zéro pendant 1,2 s** alors que
    // l'enfant appuyait toujours. C'est le contraire de ce qu'on voulait.
    // On ne borne donc que le cas de Max — le nez CONTRE quelque chose, où le
    // déplacement obtenu est un quart au plus de celui demandé ; entre les
    // deux, la voiture garde sa consigne et ralentit d'elle-même.
    // ET LA MARCHE SE FRANCHIT AVANT QU'ON NE BORNE LA VITESSE. La borne de la
    // v272 ramène la vitesse au déplacement obtenu ; si elle passait d'abord,
    // elle ramènerait à zéro la voiture qui est en train de monter la marche, et
    // l'enfant sentirait un à-coup à chaque bosse. L'ordre est le remède.
    // ET L'ON NE MONTE QU'EN ROULANT VRAIMENT, comme l'avion le fait depuis la
    // v261 (`v > 0,5`) : une voiture qui rampe contre une bordure ne doit pas
    // bondir dessus, et à l'arrêt un volant ne fait rien (v262).
    const DEGAGEMENT = 0.7;
    if (this.gabarit > 1 && !this.pilote && this.onGround
        && Math.abs(this.vitesseVoiture || 0) > 0.5
        && ((move.x !== 0 && this.vel.x === 0) || (move.z !== 0 && this.vel.z === 0))) {
      // On vise là où le DÉPLACEMENT voulait aller, pas le cap du regard : au
      // volant le regard est libre (v249), et viser le cap ferait monter une
      // marche de côté. C'est la leçon du signe qu'on regarde au lieu de le
      // déduire, appliquée à une direction.
      const n = Math.hypot(move.x, move.z);
      if (n > 1e-6) {
        this.franchirEnRoulant((move.x / n) * DEGAGEMENT, (move.z / n) * DEGAGEMENT);
      }
    }

    const BLOQUEE = 0.25;
    if (this.gabarit > 1 && !this.pilote && dt > 0 && this.vitesseVoiture) {
      const demande = Math.abs(this.vitesseVoiture) * dt;
      const vraie = Math.hypot(this.pos.x - avantX, this.pos.z - avantZ);
      if (demande > 1e-6 && vraie < demande * BLOQUEE) {
        this.vitesseVoiture = Math.sign(this.vitesseVoiture) * (vraie / dt);
      }
    }

    this.syncCamera();
  }

  syncCamera() {
    this.camera.position.copy(this.eyePosition());
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  // LE SOL CONTINU EST L'AUTORITÉ DU CONTACT hors des villes (v297) : après
  // les balayages voxel, on demande à `world.accrocherAuSol` où est la
  // surface — la MÊME triangulation que le mailleur dessine — et l'on s'y pose.
  // Le voxel garde tout le reste : murs, dalles, blocs posés, villes.
  contactSolContinu(etaitAuSol, pasH, vole) {
    if (!this.world.accrocherAuSol) return;
    const r = this.world.accrocherAuSol(this.pos, this.vel, {
      etaitAuSol, pasH, half: this.gabarit / 2, hauteur: PLAYER_HEIGHT, vole,
    });
    if (r && r.auSol) this.onGround = true;
  }

  sweepAxis(axis, delta) {
    if (delta === 0) return;
    const p = this.pos;
    const coords = ['x', 'y', 'z'];
    const key = coords[axis];
    p[key] += delta;

    const half = this.gabarit / 2;
    const eps = 1e-4;
    const minX = Math.floor(p.x - half + eps), maxX = Math.floor(p.x + half - eps);
    const minY = Math.floor(p.y + eps), maxY = Math.floor(p.y + PLAYER_HEIGHT - eps);
    const minZ = Math.floor(p.z - half + eps), maxZ = Math.floor(p.z + half - eps);

    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        for (let bx = minX; bx <= maxX; bx++) {
          const id = by < 0 ? BLOCK.STONE : this.world.getBlock(bx, by, bz);
          if (!blockIsSolid(id)) continue;
          // LE SOMMET D'UNE COLONNE COUVERTE N'ARRÊTE RIEN (v297) : la surface
          // continue le remplace, et c'est `accrocherAuSol` qui pose les pieds.
          if (this.world.blocSousLaSurface && this.world.blocSousLaSurface(bx, by, bz)) continue;
          const topY = by + (isSlab(id) ? 0.5 : 1); // slabs only fill their lower half
          // above the block's top: no side collision, and no landing yet while falling
          if (p.y >= topY - eps && (axis !== 1 || delta < 0)) continue;
          if (axis === 0) {
            p.x = delta > 0 ? bx - half - eps : bx + 1 + half + eps;
          } else if (axis === 1) {
            if (delta > 0) {
              p.y = by - PLAYER_HEIGHT - eps;
            } else {
              p.y = topY + eps;
              this.onGround = true;
            }
          } else {
            p.z = delta > 0 ? bz - half - eps : bz + 1 + half + eps;
          }
          this.vel[key] = 0;
          return;
        }
      }
    }
  }
}

// Voxel raycast (Amanatides & Woo DDA). Returns the first solid block hit
// and the face normal, or null. Water is passed through.
export function raycastBlocks(world, origin, direction, maxDistance) {
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
  const stepX = Math.sign(direction.x), stepY = Math.sign(direction.y), stepZ = Math.sign(direction.z);

  const tDeltaX = stepX !== 0 ? Math.abs(1 / direction.x) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / direction.y) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / direction.z) : Infinity;

  const frac = (v) => v - Math.floor(v);
  let tMaxX = stepX > 0 ? (1 - frac(origin.x)) * tDeltaX : frac(origin.x) * tDeltaX;
  let tMaxY = stepY > 0 ? (1 - frac(origin.y)) * tDeltaY : frac(origin.y) * tDeltaY;
  let tMaxZ = stepZ > 0 ? (1 - frac(origin.z)) * tDeltaZ : frac(origin.z) * tDeltaZ;
  if (stepX === 0) tMaxX = Infinity;
  if (stepY === 0) tMaxY = Infinity;
  if (stepZ === 0) tMaxZ = Infinity;

  let normal = [0, 0, 0];
  let t = 0;

  while (t <= maxDistance) {
    const id = world.getBlock(x, y, z);
    if (id !== BLOCK.AIR && id !== BLOCK.WATER) {
      return { x, y, z, id, normal };
    }
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX; t = tMaxX; tMaxX += tDeltaX; normal = [-stepX, 0, 0];
    } else if (tMaxY < tMaxZ) {
      y += stepY; t = tMaxY; tMaxY += tDeltaY; normal = [0, -stepY, 0];
    } else {
      z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; normal = [0, 0, -stepZ];
    }
  }
  return null;
}
