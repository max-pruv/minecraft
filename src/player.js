// First-person player: pointer-lock look, WASD movement, AABB voxel collision,
// gravity/jumping, swimming, and a toggleable fly mode.

import * as THREE from 'three';
import { BLOCK, isSolid as blockIsSolid, isSlab } from './blocks.js';
import { HEIGHT, WATER_LEVEL } from './world.js';
import { ficheDeVitesse, pasVoiture, reponseChoc, casesSousBoite, pointDImpact, DERIVE_MAX, boiteVoiture, chocContreVoiture, normaleDeMur } from './conduite.js';

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
const PAS_VOITURE = 0.4;  // pas horizontal de la voiture (v358)
const DEMI_LONG_VOITURE = 2.2;   // la moitié des 4,4 blocs d'une voiture (vehicules.js)
const DEGAGEMENT_MARCHE = 0.7;
const RAYON_MUR = 4.5;     // la façade se lit sur ce rayon autour du contact (v375)
const FACES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const FREIN_PIETON = 22;         // le frein franc de conduite.js, devant un piéton   // ce qu'il faut avancer pour passer le bord d'une marche (v286)

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
// La dynamique de la VOITURE vit dans `conduite.js` depuis la v358 ; seule
// la marche arrière de l'AVION se règle encore ici.
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
    // LE CONTRAT DE LA CONDUITE (v358) : la physique PUBLIE ses chocs —
    // `null` tant qu'il n'y en a pas eu, et non `undefined`, sinon les dégâts
    // (degats3d.js) devinent des chocs aux chutes de vitesse, et un frein franc
    // en serait un — ; et elle LIT `etatVoiture` elle-même (moteur, direction,
    // panne), si bien que les dégâts n'appliquent pas leurs effets une
    // seconde fois.
    this.choc = null;
    this.physiqueLitEtat = true;
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
    // au volant, la boîte est ORIENTÉE (v358) — et elle doit être libre
    // tout entière : on ne monte pas une marche pour s'encastrer
    if (this.gabarit > 1 && !this.pilote) return this.cellulesPleinesVoiture(x, y, z, this.yaw).size === 0;
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
  // ET « UN BLOC » SE COMPTE DEPUIS LE NIVEAU VOXEL SOUS LA BOÎTE (v297) :
  // sur la surface continue la voiture est portée entre deux cotes, et devant
  // une colonne que la surface ne couvre pas, un saut d'un bloc depuis sa
  // cote restait sous le cube à franchir (`world.niveauVoxel`). La cible est
  // UN bloc au-dessus de ce niveau — c'est là que « deux blocs, c'est un mur »
  // se juge, depuis le sol voxel sous la boîte —, et la surface peut porter la
  // voiture jusqu'à un bloc et demi sous ce sol (mesuré : 39,4 pour un niveau
  // à 41 au bord d'une falaise en travers), d'où une borne de trois.
  franchirEnRoulant(dx, dz) {
    const y = this.pos.y, x = this.pos.x + dx, z = this.pos.z + dz;
    const base = this.world.niveauVoxel ? this.world.niveauVoxel(this.pos.x, this.pos.z, y, this.gabarit / 2) : y;
    const cible = Math.max(y, base) + 1;
    if (cible - y > 3 || !this.boiteLibre(x, cible, z)) return false;
    this.pos.x = x; this.pos.z = z; this.pos.y = cible;
    return true;
  }

  // LA BOÎTE ORIENTÉE DE LA VOITURE (v358). La v212 avait donné à la voiture
  // une AABB de sa LARGEUR seule (2,26 × 2,26), parce qu'une boîte alignée sur
  // les axes ne tourne pas et qu'une boîte de 4,4 n'aurait passé dans aucune
  // rue : le nez et le coffre traversaient tout ce qui dépassait des côtés. Le
  // rectangle tourne désormais avec la voiture (`casesSousBoite`, conduite.js,
  // séparation d'axes case par case).
  //
  // ET UNE MARCHE N'EST PAS UN MUR AU BOUT DU CAPOT. Sur la surface continue
  // (v297) une pente d'un bloc par bloc met le relief à 2,2 blocs au-dessus du
  // centre sous le nez : jugé sur toute la longueur, le cube sous la bande que
  // la surface tait arrêterait la voiture au pied de chaque colline. Ce qui
  // ne dépasse pas d'UN bloc la cote de la voiture ne compte donc que sous le
  // carré central (la largeur, comme avant) — c'est là que `franchirEnRoulant`
  // le gravit ; au-delà, seul ce qui est plus haut qu'une marche est un mur.
  cellulesPleinesVoiture(x, y, z, yaw) {
    const a = DEMI_LONG_VOITURE, b = this.gabarit / 2, cap = yaw + Math.PI;
    const ux = Math.sin(cap), uz = Math.cos(cap);
    const eps = 1e-4;
    const out = new Set();
    const minY = Math.floor(y + eps), maxY = Math.floor(y + PLAYER_HEIGHT - eps);
    for (const [bx, bz] of casesSousBoite(x, z, cap, a, b)) {
      const lng = Math.abs((bx + 0.5 - x) * ux + (bz + 0.5 - z) * uz);
      const auCoeur = lng < b + 0.71;   // la case touche le carré central
      for (let by = minY; by <= maxY; by++) {
        const id = by < 0 ? BLOCK.STONE : this.world.getBlock(bx, by, bz);
        if (!blockIsSolid(id)) continue;
        if (this.world.blocSousLaSurface && this.world.blocSousLaSurface(bx, by, bz)) continue;
        const top = by + (isSlab(id) ? 0.5 : 1);
        if (y >= top - eps) continue;                      // sous les roues
        if (!auCoeur && top <= y + 1 + eps) continue;      // une marche, pas un mur
        out.add(`${bx},${by},${bz}`);
      }
    }
    return out;
  }

  // La pose est-elle libre ? Libre = aucune case pleine que la pose d'avant ne
  // touchait pas déjà : « pas si l'on est déjà dedans » (v245), appliqué aux
  // blocs. Une voiture invoquée contre un mur, ou qui s'y est retrouvée en
  // tournant, s'en dégage au lieu d'y rester clouée.
  poseVoitureLibre(x, y, z, yaw, dedans) {
    for (const k of this.cellulesPleinesVoiture(x, y, z, yaw)) if (!dedans || !dedans.has(k)) return false;
    return true;
  }

  // LE CHOC SE PUBLIE (contrat du chantier « conduite ») : `player.choc` =
  // { force 0..1, t, x, z }, (x, z) le point d'impact dans le monde — la
  // session des dégâts froisse la carrosserie là, la caméra secoue. Un frôlement
  // sous cinq pour cent n'est pas un choc : poussée contre un mur, la voiture
  // le toucherait à chaque image et rien ne se lirait plus.
  publierChoc(force, dx, dz) {
    if (!(force >= 0.05)) return;
    const p = pointDImpact(this.pos.x, this.pos.z, this.yaw + Math.PI, DEMI_LONG_VOITURE, this.gabarit / 2, dx, dz);
    const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.choc = { force: +force.toFixed(3), t, x: p.x, z: p.z };
    this.chocs = (this.chocs || 0) + 1;
  }

  // LA VITESSE D'APRÈS UN CHOC RETOURNE DANS L'ÉTAT DE LA VOITURE : une
  // vitesse signée le long du cap, et la dérive entre le cap et la vitesse.
  // Si le choc a tourné la vitesse au-delà de ce que la dérive permet, c'est
  // la CAISSE qui s'aligne — le long d'un mur rasé, la voiture se remet dans
  // l'axe de la rue, comme dans GTA.
  vitesseApresChoc(wx, wz, aligner = false) {
    const sp = Math.hypot(wx, wz);
    if (sp < 1e-3) { this.vitesseVoiture = 0; this.derive = 0; this.vel.x = 0; this.vel.z = 0; return; }
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const v = (wx * fx + wz * fz) >= 0 ? sp : -sp;
    const h = Math.atan2(-wx / v, -wz / v);
    let d = h - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    // le long d'un mur, la caisse se remet TOUT ENTIÈRE dans l'axe de la
    // vitesse (sinon elle file en crabe, le nez contre la façade, et le
    // rattrapage de la dérive la renvoie dans le mur à chaque image)
    if (Math.abs(d) > DERIVE_MAX || (aligner && Math.abs(d) > 1e-3)) {
      const tourne = aligner ? d : d - Math.sign(d) * DERIVE_MAX;
      const dedans = this.cellulesPleinesVoiture(this.pos.x, this.pos.y, this.pos.z, this.yaw);
      if (this.poseVoitureLibre(this.pos.x, this.pos.y, this.pos.z, this.yaw + tourne, dedans)) {
        this.yaw += tourne; d -= tourne;
      } else if (Math.abs(d) > DERIVE_MAX) d = Math.sign(d) * DERIVE_MAX;
    }
    this.vitesseVoiture = v; this.derive = d;
    this.vel.x = wx; this.vel.z = wz;
  }

  // LES CASES DE SURFACE D'UN MUR AUTOUR DU CONTACT (v375). Les cases que la
  // pose voulue touche et que la pose d'avant ne touchait pas disent OÙ l'on
  // bute et à quelle hauteur ; autour d'elles (RAYON_MUR), les colonnes
  // pleines à cette hauteur qui ont de l'air à côté sont la façade. Leur
  // droite donne la normale (`normaleDeMur`, conduite.js).
  normaleDuMur(x, y, z, dedans) {
    const neuves = [];
    for (const k of this.cellulesPleinesVoiture(x, y, z, this.yaw)) {
      if (dedans && dedans.has(k)) continue;
      const [bx, by, bz] = k.split(',').map(Number);
      neuves.push([bx, by, bz]);
    }
    if (!neuves.length) return null;
    let hy = Infinity, cx = 0, cz = 0;
    for (const [bx, by, bz] of neuves) { hy = Math.min(hy, by); cx += bx + 0.5; cz += bz + 0.5; }
    cx /= neuves.length; cz /= neuves.length;
    const w = this.world, R = RAYON_MUR;
    const plein = (bx, bz) => {
      const id = w.getBlock(bx, hy, bz);
      return blockIsSolid(id) && !(w.blocSousLaSurface && w.blocSousLaSurface(bx, hy, bz));
    };
    const cases = [];
    for (let bz = Math.floor(cz - R); bz <= Math.floor(cz + R); bz++) {
      for (let bx = Math.floor(cx - R); bx <= Math.floor(cx + R); bx++) {
        if ((bx + 0.5 - cx) ** 2 + (bz + 0.5 - cz) ** 2 > R * R || !plein(bx, bz)) continue;
        // le milieu de chaque face EXPOSÉE tournée vers la voiture : sur un
        // escalier, ces milieux se répartissent des deux côtés de la vraie
        // façade (mesuré : 1,4° d'erreur moyenne, 7,8° au pire, contre 3,6 et
        // 15 avec les centres des cases sur 2,6 blocs)
        for (const [ex, ez] of FACES) {
          if (plein(bx + ex, bz + ez) || (x - bx - 0.5) * ex + (z - bz - 0.5) * ez <= 0) continue;
          cases.push([bx + 0.5 + ex * 0.5, bz + 0.5 + ez * 0.5]);
        }
      }
    }
    return normaleDeMur(cases, x, z);
  }

  // GLISSER LE LONG DE CE QU'ON A TOUCHÉ (v375) : le pas tangent tout de
  // suite, et s'il bute sur le coin d'une marche de l'escalier, la voiture se
  // décolle d'un cheveu le long de la normale — c'est la réaction du mur, pas
  // un passe-muraille : seule une pose LIBRE est prise.
  //
  // ET LA CAISSE SE MET DANS L'AXE DU MUR SI ELLE NE L'EST PAS : la normale
  // lue sur un escalier se trompe d'un ou deux degrés (mesuré), et une caisse
  // restée d'un degré vers la façade y coinçait son coin à la marche suivante
  // — arrêt net au bout de vingt-cinq blocs de glisse sur un mur à 37°.
  glisserLeLong(x, y, z, sx, sz, nx, nz) {
    const dedans = this.cellulesPleinesVoiture(x, y, z, this.yaw);
    const av = this.vitesseVoiture >= 0 ? 1 : -1;
    let yt = Math.atan2(-sx * av, -sz * av);
    let dy = Math.atan2(Math.sin(yt - this.yaw), Math.cos(yt - this.yaw));
    const caps = Math.abs(dy) > 1e-3 && Math.abs(dy) <= DERIVE_MAX ? [this.yaw, this.yaw + dy] : [this.yaw];
    for (const d of [0, 0.12, 0.3, 0.5]) {
      for (const cap of caps) {
        const tx = x + sx + nx * d, tz = z + sz + nz * d;
        if (!this.poseVoitureLibre(tx, y, tz, cap, dedans)) continue;
        this.pos.x = tx; this.pos.z = tz;
        if (cap !== this.yaw) { this.derive = (this.derive || 0) - (cap - this.yaw); this.yaw = cap; }
        return true;
      }
    }
    return false;
  }

  // LE DÉPLACEMENT DE LA VOITURE, PAS À PAS (au plus PAS_VOITURE blocs).
  //   · les familles de main.js d'abord (`obstacleVehicule`, qui rend la
  //     famille touchée) : un PIÉTON, on s'arrête devant — personne n'est
  //     jamais touché (v259) ; l'EAU, on s'arrête sur le quai (v272) ; une
  //     VOITURE de la rue ou le MOBILIER, c'est un choc, qui rebondit ;
  //   · puis les blocs, sous la boîte orientée : une marche d'un bloc se
  //     franchit (v286), sinon c'est un choc — rasant on glisse le long du
  //     mur en perdant de la vitesse selon l'angle, de face on s'arrête avec
  //     un petit rebond (`reponseChoc`, conduite.js). La normale du mur se lit
  //     en essayant chaque axe : le monde est fait de cubes alignés.
  //   · enfin la verticale, inchangée (le carré central, comme avant), et le
  //     sol continu (v297).
  // Une voiture de la rue ne se POUSSE pas : sa position est une fonction de
  // l'horloge partagée (v305). C'est elle qui s'arrête — elle attend sans
  // limite devant la voiture de l'enfant (`cederLePassage`, v245).
  deplacerVoiture(dt) {
    const etaitAuSol = this.onGround;
    this.onGround = false;
    const avantX = this.pos.x, avantZ = this.pos.z;
    // ON FREINE DEVANT UN PIÉTON, ON NE L'ATTEND PAS AU CONTACT. À cinquante
    // blocs par seconde, s'arrêter pile au pied de quelqu'un est un pilé qu'on
    // ne verrait dans aucune voiture : on regarde à la distance d'arrêt (plus
    // deux blocs, douze au plus) et l'on freine si un piéton y est. Il s'écarte
    // de lui-même (v259), et la voiture repart.
    const sp0 = Math.abs(this.vitesseVoiture || 0);
    if (sp0 > 2 && this.obstacleVehicule && dt > 0) {
      const arret = Math.min(12, (sp0 * sp0) / (2 * FREIN_PIETON) + 2);
      const h = this.yaw + (this.derive || 0), s = Math.sign(this.vitesseVoiture);
      const ax = this.pos.x - Math.sin(h) * s * arret, az = this.pos.z - Math.cos(h) * s * arret;
      if (this.obstacleVehicule(ax, az, this.yaw + Math.PI, this.pos.x, this.pos.z) === 'pieton') {
        const v = Math.max(0, sp0 - FREIN_PIETON * dt) * s;
        const k = sp0 > 1e-6 ? v / this.vitesseVoiture : 0;
        this.vitesseVoiture = v; this.vel.x *= k; this.vel.z *= k;
        this.freinePieton = true;
      } else this.freinePieton = false;
    }
    let reste = dt, tours = 0;
    while (reste > 1e-6 && tours++ < 32) {
      const vx = this.vel.x, vz = this.vel.z, sp = Math.hypot(vx, vz);
      if (sp < 1e-4) break;
      const pas = Math.min(reste, PAS_VOITURE / sp);
      const dx = vx * pas, dz = vz * pas;
      reste -= pas;
      const x = this.pos.x, y = this.pos.y, z = this.pos.z;
      const fam = this.obstacleVehicule ? this.obstacleVehicule(x + dx, z + dz, this.yaw + Math.PI, x, z) : false;
      if (fam === 'pieton' || fam === 'eau') {
        this.vitesseVoiture = 0; this.derive = 0; this.vel.x = 0; this.vel.z = 0;
        break;
      }
      if (fam) {
        // CONTRE UNE VOITURE DE LA RUE, LA NORMALE DE SON RECTANGLE (v375) :
        // `voitureContre` (main.js, lecture de la collecte de vehicules.js)
        // rend sa boîte et son allure, et le choc se calcule sur la vitesse
        // RELATIVE (`chocContreVoiture`). Le mobilier, et une voiture qu'on ne
        // sait pas lire, gardent la normale du mouvement.
        const autre = fam === 'voiture' && this.voitureContre ? this.voitureContre(x + dx, z + dz, this.yaw + Math.PI) : null;
        const moi = boiteVoiture(x + dx, z + dz, this.yaw + Math.PI, DEMI_LONG_VOITURE, this.gabarit / 2);
        const rv = autre ? chocContreVoiture(moi, autre, vx, vz) : null;
        if (rv) {
          this.contact = { famille: 'voiture', nx: rv.nx, nz: rv.nz, autre: { x: autre.x, z: autre.z } };
          this.publierChoc(rv.force, -rv.nx, -rv.nz);
          this.vitesseApresChoc(rv.vx, rv.vz, rv.glisse);
          const gl = rv.glisse || (vx * rv.nx + vz * rv.nz >= 0);
          if (gl && !this.glisserLeLong(x, y, z, rv.vx * pas, rv.vz * pas, rv.nx, rv.nz) && !rv.glisse) break;
          continue;
        }
        const n = Math.hypot(dx, dz) || 1;
        const r = reponseChoc(vx, vz, -dx / n, -dz / n);
        this.contact = { famille: fam, nx: -dx / n, nz: -dz / n };
        this.publierChoc(r.force, dx, dz);
        this.vitesseApresChoc(r.vx, r.vz);
        continue;
      }
      const dedans = this.cellulesPleinesVoiture(x, y, z, this.yaw);
      if (this.poseVoitureLibre(x + dx, y, z + dz, this.yaw, dedans)) {
        this.pos.x += dx; this.pos.z += dz;
        continue;
      }
      // UNE MARCHE D'UN BLOC SE FRANCHIT (v286), EN ROULANT VRAIMENT — et
      // aussi juste après une crête : plus vite qu'avant, la voiture décolle
      // d'une bosse et retombe devant la marche suivante sans être « au sol »
      // à l'image près ; tant qu'elle ne TOMBE pas, elle la gravit.
      if ((etaitAuSol || this.vel.y > -4) && Math.abs(this.vitesseVoiture) > 0.5) {
        const n = Math.hypot(dx, dz);
        if (this.franchirEnRoulant((dx / n) * DEGAGEMENT_MARCHE, (dz / n) * DEGAGEMENT_MARCHE)) continue;
      }
      // LA NORMALE DU MUR (v375) : la droite qui passe par les cases de
      // surface autour du contact (`normaleDeMur`), stable d'une marche à
      // l'autre sur une façade oblique en escalier. L'essai axe par axe ne
      // sert plus que de repli (moins de trois cases : un poteau, un coin).
      let nx, nz;
      const mur = this.normaleDuMur(x + dx, y, z + dz, dedans);
      if (mur) { nx = mur.nx; nz = mur.nz; }
      else {
        const libreX = this.poseVoitureLibre(x + dx, y, z, this.yaw, dedans);
        const libreZ = this.poseVoitureLibre(x, y, z + dz, this.yaw, dedans);
        if (libreX && !libreZ) { nx = 0; nz = -Math.sign(dz); }
        else if (libreZ && !libreX) { nx = -Math.sign(dx); nz = 0; }
        else { const n = Math.hypot(dx, dz); nx = -dx / n; nz = -dz / n; }
      }
      const r = reponseChoc(vx, vz, nx, nz);
      // une vitesse qui ne rentre pas dans la normale lue (elle la longe, à
      // l'erreur de lecture près) et qui bute quand même : c'est un coin de
      // marche, on glisse — sans quoi la voiture rejouait trente-deux fois le
      // même pas bloqué et le filet de la v272 la ramenait à zéro
      const glisse = r.glisse || (vx * nx + vz * nz >= 0);
      this.contact = { famille: 'mur', nx, nz, ligne: !!mur };
      this.publierChoc(r.force, -nx, -nz);
      this.vitesseApresChoc(r.vx, r.vz, glisse);
      // ce qui file le long du mur avance tout de suite, le long du mur
      if (glisse && !this.glisserLeLong(x, y, z, r.vx * pas, r.vz * pas, nx, nz) && !r.glisse) break;
    }
    // la verticale : le carré central, comme avant
    const dy = this.vel.y * dt;
    const n = Math.max(1, Math.ceil(Math.abs(dy) / MAX_STEP));
    for (let i = 0; i < n; i++) this.sweepAxis(1, dy / n);
    this.contactSolContinu(etaitAuSol, Math.hypot(this.pos.x - avantX, this.pos.z - avantZ), false);
    // UNE VOITURE BLOQUÉE N'ANNONCE PLUS DE VITESSE (v272) — filet : si le
    // sol continu ou une boîte a mangé le pas sans qu'un choc ne l'ait dit, on
    // ramène la vitesse à ce que la voiture a FAIT. Seulement quand elle est
    // bloquée (moins d'un quart du pas), jamais quand elle frotte.
    if (dt > 0 && this.vitesseVoiture) {
      const demande = Math.abs(this.vitesseVoiture) * dt;
      const vraie = Math.hypot(this.pos.x - avantX, this.pos.z - avantZ);
      if (demande > 1e-6 && vraie < demande * 0.25) this.vitesseVoiture = Math.sign(this.vitesseVoiture) * (vraie / dt);
    }
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

  // LE TOIT DU CIEL SE TIENT SUR LE PAS, PAS SUR LA POSITION (v309). On ne
  // bornait la vitesse qu'une fois le toit ATTEINT : une image lente (un
  // vingtième de seconde à vingt blocs par seconde) emportait l'enfant d'un
  // bloc au-dessus — 159 pour un toit à 158, vu au portail. La montée de
  // l'image se borne donc à ce qui reste jusqu'au toit, quelle que soit la
  // cadence.
  sousLeToit(dt) {
    if (this.vel.y <= 0) return;
    const reste = PLAFOND_VOL - this.pos.y;
    this.vel.y = reste <= 0 || !(dt > 0) ? 0 : Math.min(this.vel.y, reste / dt);
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
      // Le ciel a le même toit que pour tout le monde — voir `sousLeToit`.
      this.sousLeToit(dt);
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

    // UN CHOC EST UN ÉVÉNEMENT, PAS UN ÉTAT (v358) : les dégâts rejouent tout
    // `choc` dont la date n'est pas celle du dernier qu'ils ont vu POUR CETTE
    // VOITURE — une voiture neuve n'en a vu aucun, et elle héritait donc du
    // dernier choc de la précédente (mesuré dans `monte.js` : une citadine
    // neuve, aucun choc pendant le trajet, `direction −0,028` et un cap qui
    // tourne seul). On l'efface quand on monte ET quand on descend.
    const enVoiture = this.gabarit > 1 && !this.pilote;
    if (enVoiture !== !!this._enVoiture) { this.choc = null; this._enVoiture = enVoiture; }
    if (this.gabarit > 1) {
      // AU VOLANT (conduite-physique, v358) : le modèle de véhicule de
      // `conduite.js` — l'accélération qui s'essouffle vers la pointe, le frein
      // franc, le frein moteur au lâcher, le braquage qui se resserre avec la
      // vitesse, l'adhérence et sa petite dérive. Le joystick reste la seule
      // commande (v272) : l'avant accélère, l'arrière freine PUIS recule
      // (v269), le côté tourne le volant.
      //
      // LA FICHE VIENT DE L'ALLURE. `fun.js` ne transmet que `boost`, multiple
      // de la marche, et `allureDe` (vehicules.js) le tire de la table des
      // classes : la pointe désigne la classe. La touche Maj ne double pas une
      // voiture — elle reste à la marche (WALK_SPEED), pas au sprint.
      if (this.vitesseVoiture === undefined) this.vitesseVoiture = 0;
      const fiche = ficheDeVitesse(WALK_SPEED * (this.boost || 1));
      this.ficheVoiture = fiche;
      // CE QUE PUBLIENT LES AUTRES, LU SI PRÉSENT : l'état de la voiture (les
      // dégâts) et l'embarquement en cours. Chacun marche sans l'autre.
      const ev = this.etatVoiture, emb = this.embarquement;
      const inerte = !!(ev && (ev.enPanne || ev.enFeu)) || !!(emb && emb.phase);
      const moteur = ev && ev.moteur != null ? Math.max(0, Math.min(1, ev.moteur)) : 1;
      // LE PLAFOND SE PUBLIE LÀ OÙ IL SE CALCULE (v268) : le bruit du moteur
      // suit le régime, la vitesse rapportée à ce que la voiture sait faire.
      this.vitesseVoitureMax = fiche.vmax * (0.35 + 0.65 * moteur);
      // le geste prime sur une manette restée réglée (v269) — elle est
      // nulle en voiture depuis la v272, mais un état laissé ne la rallume pas
      let gaz = forward;
      if (forward < -0.15) { if (this.gaz != null) this.gaz = 0; }
      else if (this.gaz != null) gaz = this.gaz;
      const r = pasVoiture(
        { v: this.vitesseVoiture, braquage: this.braquage || 0, derive: this.derive || 0 },
        { gaz, volant: strafe, moteur, direction: ev ? ev.direction || 0 : 0, inerte },
        fiche, dt);
      // LA ROUE LIBRE SE RELÈVE (v375, `?diag=1`) : du lâcher du joystick, au
      // dessus de cinq blocs/s, jusqu'à l'arrêt — sur l'horloge du JEU, comme
      // la dynamique qu'elle mesure. Un nouvel appui l'abandonne.
      if (gaz === 0 && !inerte && Math.abs(this.vitesseVoiture) > 5 && !this._roueLibre) this._roueLibre = { depuis: Math.abs(this.vitesseVoiture), s: 0 };
      if (this._roueLibre) {
        if (gaz !== 0 || inerte) this._roueLibre = null;
        else {
          this._roueLibre.s += dt;
          if (Math.abs(r.v) < 0.3) { this.roueLibre = this._roueLibre; this._roueLibre = null; }
        }
      }
      this.vitesseVoiture = r.v; this.braquage = r.braquage; this.derive = r.derive;
      // LA CAISSE TOURNE — SAUF SI SON NEZ ENTRAIT DANS UN MUR. La boîte est
      // orientée : tourner la fait balayer. Un nez contre une façade ne pivote
      // pas dedans ; on garde le cap, et la vitesse fait le reste.
      if (r.dCap) {
        const avant = this.yaw;
        const dedans = this.cellulesPleinesVoiture(this.pos.x, this.pos.y, this.pos.z, avant);
        this.yaw += r.dCap;
        if (!this.poseVoitureLibre(this.pos.x, this.pos.y, this.pos.z, this.yaw, dedans)) this.yaw = avant;
      }
      const h = this.yaw + this.derive;
      this.vel.x = -Math.sin(h) * this.vitesseVoiture;
      this.vel.z = -Math.cos(h) * this.vitesseVoiture;
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
      this.sousLeToit(dt);
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
    // AU VOLANT, LA VOITURE A SON PROPRE DÉPLACEMENT (v358) : une boîte
    // ORIENTÉE, des chocs qui glissent ou rebondissent au lieu d'un arrêt net,
    // et les familles d'obstacles de main.js jugées pas à pas.
    if (this.gabarit > 1 && !this.pilote) {
      this.deplacerVoiture(dt);
      this.syncCamera();
      return;
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
