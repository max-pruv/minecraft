// Les montures : les bêtes sur lesquelles on peut grimper.
//
// Elles vivent dans le même bestiaire que les vaches et les poules
// (src/animals.js) — même façon de marcher, de brouter, de fuir. Ce fichier
// n'ajoute que ce qui leur est propre : leur silhouette, et la hauteur de leur
// dos, qui décide d'où l'enfant regarde le monde une fois en selle.
//
// `assise` est cette hauteur, en blocs, mesurée depuis les sabots. Sur un âne
// on est à hauteur d'homme ; sur un éléphant on domine les toits. C'est ce
// chiffre, et lui seul, qui donne la sensation de grimper sur quelque chose de
// gros — la caméra monte, la bête garde ses pattes par terre.

import * as THREE from 'three';
import { creerAnimalHD } from './animauxhd.js';
import { MODELES_AVION } from './avions.js';
import { construireVoitureRoute, chargerVraieVoiture, chargerVoitureFlotte, FLOTTE, repeindre, VOITURE_FORCEE } from './vehicules.js';
import { allureDeClasse } from './conduite.js';
import { construireMoto } from './moto.js';

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

// Même convention que le bestiaire : le modèle regarde vers -z, les pattes
// posées à y = 0, et les membres qui balancent rangés dans userData.legs.
export const MODELES_MONTURE = {
  voiture: voitureNeuve,
  moto: () => construireMoto(),
  ...MODELES_AVION,
  ...Object.fromEntries(['elephant', 'zebre', 'ane', 'chameau', 'lama', 'autruche', 'sanglier', 'ours']
    .map(k => [k, () => creerAnimalHD(k)])),
};

// Les fiches d'espèce, au format du bestiaire (src/animals.js), plus trois
// champs qui n'existent que pour les montures :
//   montable — la bête accepte qu'on grimpe
//   allure   — combien de fois plus vite on avance en selle
//   assise   — la hauteur du dos, donc celle du regard une fois assis
// La voiture neuve de la Giga-usine : la seule monture à roues du jeu. C'est
// LA carrosserie de la vraie vie (vehicules.js) : un profil de Bézier extrudé
// en coque galbée, sous sa verrière de verre fumé. L'habitacle vit À
// L'INTÉRIEUR de la coque pleine : invisible de dehors (la coque opaque le
// couvre), et c'est TOUT ce qu'on voit une fois assis — la coque, elle,
// disparaît de l'intérieur, ses faces regardent dehors. D'où le cadre
// complet : montants, traverse, ciel de toit, et la plaque de capot dans la
// couleur de la caisse, pour voir l'avant de SA voiture en conduisant.
function voitureNeuve(voeu) {
  // Des teintes PROFONDES de carrosserie : les pastels saturaient sous
  // l'éclairage et mangeaient le bi-ton avant/arrière.
  const teintes = [0xb02020, 0x2a4e9c, 0xc0a878, 0x1f7a4c];
  const g = construireVoitureRoute(teintes[Math.floor(Math.random() * teintes.length)]);
  // LE COCKPIT — le nôtre, et il SURVIT au vrai modèle. L'ancien habitacle
  // partait quand le modèle arrivait, ne laissant qu'un petit tore centré qui
  // flottait au milieu du pare-brise (capture à l'appui) : l'intérieur du
  // modèle d'artiste n'est pas fait pour être habité par une caméra. On bâtit
  // donc un poste de conduite complet, ENVELOPPANT — planche de bord, ciel de
  // toit, panneaux de porte, baquets — dont les surfaces opaques cachent les
  // entrailles du modèle vues de dedans. Le siège est à GAUCHE (fiche
  // `siege`) : le volant est devant le conducteur, comme dans une voiture.
  const cockpit = new THREE.Group();
  const cuir = 0x14161a, anthr = 0x1d2026, creme = 0xd8d2c4, navy = 0x0e1a2e;
  // la plage du capot, vue à travers le pare-brise (les faces du modèle
  // regardent dehors : de dedans, sans elle, le capot serait invisible) —
  // INCLINÉE pour suivre le capot plongeant : plate et large, elle
  // dépassait de l'aile et flottait au-dessus du nez (vu de dehors)
  const plage = box(1.5, 0.02, 0.75, navy, 0, 0.66, -1.05);
  plage.rotation.x = -0.3;
  cockpit.add(plage);
  // LE NEZ SE REMPLIT. Verdict de Max en vue GTA : « la voiture à l'avant,
  // la transparence, on voit la pelouse — elle n'est pas bien fermée. » Le
  // capot du modèle n'a que des faces tournées vers dehors : un rayon qui
  // entre par le pare-brise ressort par le nez et tombe sur l'herbe. Deux
  // masses pleines, taillées SOUS la ligne de capot et entre les passages
  // de roue, bouchent le compartiment avant — et font un fond aux phares.
  // — étroites et basses : le capot plonge sur les flancs, et la première
  // version de ces masses perçait l'aile (capture à l'appui)
  cockpit.add(box(1.1, 0.34, 0.85, navy, 0, 0.42, -1.12));
  cockpit.add(box(0.8, 0.2, 0.6, navy, 0, 0.4, -1.76));  // jusqu'au dos de la calandre
  // le plancher et la cloison avant : le réservoir du modèle faisait office
  // des deux — retiré (il murait la vue), l'habitacle donnait sur la route
  cockpit.add(box(1.5, 0.03, 1.5, 0x101216, 0, 0.5, -0.05));
  cockpit.add(box(1.5, 0.26, 0.04, anthr, 0, 0.64, -0.78));
  // la planche de bord : la masse et le bourrelet, le cowl à 7,5 cm SOUS la
  // ligne du regard (0,96) — plus haut, la fente de vue devient meurtrière
  cockpit.add(box(1.5, 0.16, 0.34, anthr, 0, 0.78, -0.62));
  cockpit.add(box(1.5, 0.05, 0.38, cuir, 0, 0.86, -0.6));
  // le bloc-compteurs DERRIÈRE le volant (pas une dalle néon devant : la
  // première version dessinait un écran cyan géant par-dessus la jante).
  // Et rien d'autre sur la planche — verdict de Max sur capture iPhone :
  // « simplifie ». L'écran du milieu et le liseré orange sont partis.
  cockpit.add(box(0.26, 0.09, 0.06, cuir, -0.33, 0.89, -0.52));
  cockpit.add(box(0.19, 0.04, 0.015, 0x0e8aa8, -0.33, 0.885, -0.487));
  // LE VOLANT : jante, trois branches, moyeu — plus un anneau qui flotte.
  // PETIT : sur l'iPhone en portrait, le champ horizontal est étroit et la
  // jante d'avant mangeait l'écran entier (capture de Max). Jante fine,
  // sous la ligne du regard : on conduit en regardant PAR-DESSUS.
  const volant = new THREE.Group();
  volant.add(new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.014, 8, 20),
    new THREE.MeshBasicMaterial({ color: cuir })));
  const bMat = new THREE.MeshBasicMaterial({ color: anthr });
  for (const angle of [Math.PI / 2, Math.PI + 0.6, Math.PI * 2 - 0.6]) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.085, 0.016), bMat);
    br.position.set(Math.cos(angle) * 0.045, Math.sin(angle) * 0.045, 0);
    br.rotation.z = angle - Math.PI / 2;
    volant.add(br);
  }
  const moyeu = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.026, 12),
    new THREE.MeshBasicMaterial({ color: navy }));
  moyeu.rotation.x = Math.PI / 2;
  volant.add(moyeu);
  volant.rotation.x = -0.42;                                       // incliné vers soi
  volant.position.set(-0.33, 0.78, -0.46);
  cockpit.add(volant);
  cockpit.add(box(0.04, 0.05, 0.14, anthr, -0.33, 0.73, -0.51));   // la colonne
  // la console centrale, nue
  cockpit.add(box(0.2, 0.26, 0.55, anthr, 0, 0.7, -0.18));
  // deux baquets : assise, dossier épaulé, appuie-tête — crème, flancs navy
  for (const sx of [-0.33, 0.33]) {
    cockpit.add(box(0.4, 0.09, 0.42, creme, sx, 0.62, 0.18));
    cockpit.add(box(0.4, 0.44, 0.12, creme, sx, 0.85, 0.38));
    cockpit.add(box(0.05, 0.4, 0.14, navy, sx - 0.2, 0.83, 0.38));
    cockpit.add(box(0.05, 0.4, 0.14, navy, sx + 0.2, 0.83, 0.38));
    cockpit.add(box(0.2, 0.14, 0.1, creme, sx, 1.04, 0.4));
  }
  // les panneaux de porte, ARRÊTÉS SOUS la ligne du regard : au-dessus, les
  // faces de la coque regardent dehors et laissent le jour entrer — c'est la
  // fenêtre latérale, gratuite, comme dans une voiture sans vitre teintée.
  // L'accoudoir est sombre : en crème, si près de l'œil, c'était un pavé.
  for (const sx of [-1, 1]) {
    cockpit.add(box(0.045, 0.3, 1.15, anthr, sx * 0.73, 0.77, -0.05));
    cockpit.add(box(0.05, 0.05, 0.4, cuir, sx * 0.7, 0.86, -0.1));
    // le bas de caisse, entre plancher et porte : sans lui, on voyait la
    // roue avant par l'angle du plancher
    cockpit.add(box(0.05, 0.14, 1.5, 0x101216, sx * 0.75, 0.56, -0.05));
  }
  // le ciel de toit, collé à la ligne de toit du modèle (1,12 mesuré), du
  // haut du pare-brise jusque derrière les têtes : trop bas il fait visière,
  // trop court il découvre la tranche du toit (faces vers dehors : du dedans,
  // c'est un trou de ciel). Son bord avant EST la traverse : une traverse
  // séparée doublait la moulure de vitre du modèle — deux barres dans la vue.
  cockpit.add(box(1.16, 0.02, 1.3, 0x101318, 0, 1.13, -0.01));
  for (const sx of [-1, 1]) {
    const m = box(0.05, 0.05, 0.62, anthr, sx * 0.56, 1.0, -0.42);
    m.rotation.x = -0.55;
    cockpit.add(m);
  }
  g.add(cockpit);
  // LE VRAI MODÈLE remplace la sculpture dès qu'il est chargé — la coque de
  // primitives ne sert plus que d'attente, et de secours si le fichier
  // manque (ou tant qu'il n'a jamais été téléchargé, hors ligne).
  //
  // DEPUIS LA FLOTTE (Max : « add those cars for better diversity ») chaque
  // voiture neuve tire son modèle parmi cinquante-trois : les cinquante-deux de
  // vendor/voitures, plus le Chiron d'artiste historique — l'ajout est
  // additif, il ne remplace pas le cadeau. Deux différences de traitement :
  // les modèles de la flotte apportent leur PROPRE intérieur complet, donc
  // notre cockpit sculpté part avec la coque d'attente ; le modèle
  // d'artiste, lui, n'en a pas, et le cockpit reste.
  // UNE VOITURE GARÉE REVIENT AVEC SON MODÈLE. Un vœu (`voeu.flotte`, le nom
  // du fichier) court-circuite le tirage au sort : c'est ce qui rend à
  // l'enfant SA voiture au sortir du garage, et non une inconnue de la même
  // couleur. Sans vœu, ou si le modèle demandé n'existe plus dans la flotte,
  // on retombe sur le tirage — un fichier disparu ne doit pas rendre le
  // garage muet.
  const voulu = voeu && voeu.flotte
    ? FLOTTE.find((f) => f.fichier === voeu.flotte) || null : null;
  // le tirage ne sort pas la voiture de police (`horsRue`, v562) : l'usine et
  // le garage livrent des voitures de tout le monde ; la police, on la prend
  // à la fin d'un contrôle, ou on la demande par son nom (le vœu)
  const tirables = FLOTTE.filter((f) => !f.horsRue);
  const enFlotte = voulu || VOITURE_FORCEE || (voeu && voeu.flotte === 'voiture.glb' ? null
    : Math.random() < tirables.length / (tirables.length + 1)
      ? tirables[Math.floor(Math.random() * tirables.length)] : null);
  g.userData.flotte = enFlotte ? enFlotte.fichier : 'voiture.glb';
  g.userData.nomVoiture = enFlotte ? enFlotte.nom : 'Bugatti Chiron';
  // ET SA COULEUR (v305) : la teinte que la rue lui avait posée voyage avec
  // le vœu, sinon la voiture prise dans la rue changeait de couleur sous
  // l'enfant — et chez l'ami qui le regarde conduire.
  const peinture = enFlotte && voeu && typeof voeu.peinture === 'number' ? voeu.peinture : null;
  g.userData.peinture = peinture;
  const chargement = enFlotte ? chargerVoitureFlotte(enFlotte) : chargerVraieVoiture();
  if (chargement) {
    chargement.then((proto) => {
      if (!proto || !g.userData.membres) return;
      for (const nom of ['caisse', 'verriere', 'tronc']) {
        const membre = g.userData.membres[nom];
        if (membre) g.remove(membre);
      }
      if (enFlotte) g.remove(cockpit);
      const modele = proto.clone(true);
      if (peinture != null) repeindre(modele, enFlotte.fichier, peinture);
      g.add(modele);
      // le prototype et son clone : la portière se découpe sur le PROTOTYPE,
      // qu'aucun choc ne froisse jamais (portieres.js, v366)
      g.userData.proto = proto; g.userData.modele = modele;
      // Les roues du clone, retrouvées par leur nom : le bestiaire les fera
      // tourner à la distance parcourue (animals.js). Les références ne se
      // recopient pas d'un clone à l'autre — le rayon, lui, si (userData).
      const roues = [];
      modele.traverse((o) => { if (/^Wheel_/i.test(o.name || '')) roues.push(o); });
      g.userData.roues = roues;
      g.userData.rayonRoue = proto.userData.rayonRoue || 0.34;
    });
  }
  g.userData.legs = [];                                            // rien ne balance
  return g;
}

export const MONTURES = [
  { key: 'elephant', name: 'Éléphant', cry: 'Barriiiit !', emoji: '🐘', speed: 0.9,
    height: 2.9, width: 1.6, montable: true, allure: 1.6, assise: 2.5 },
  { key: 'zebre', name: 'Zèbre', cry: 'Hi-han-hii !', emoji: '🦓', speed: 2.0,
    height: 1.5, width: 0.7, montable: true, allure: 2.3, assise: 1.45 },
  { key: 'ane', name: 'Âne', cry: 'Hi-han !', emoji: '🫏', speed: 1.2,
    height: 1.1, width: 0.55, montable: true, allure: 1.7, assise: 1.05 },
  { key: 'chameau', name: 'Chameau', cry: 'Bloub !', emoji: '🐪', speed: 1.3,
    height: 1.9, width: 0.7, habitat: 'sand', montable: true, allure: 1.9, assise: 1.9 },
  { key: 'lama', name: 'Lama', cry: 'Mèèh !', emoji: '🦙', speed: 1.4,
    height: 1.6, width: 0.6, montable: true, allure: 1.8, assise: 1.25 },
  { key: 'autruche', name: 'Autruche', cry: 'Bouh bouh !', emoji: '🪶', speed: 2.2,
    height: 2.1, width: 0.6, habitat: 'sand', montable: true, allure: 2.7, assise: 1.45 },
  { key: 'sanglier', name: 'Sanglier', cry: 'Grrrouf !', emoji: '🐗', speed: 1.7,
    height: 1.0, width: 0.7, montable: true, allure: 1.9, assise: 0.9 },
  { key: 'ours', name: 'Ours brun', cry: 'Grooo !', emoji: '🐻', speed: 1.3,
    height: 1.3, width: 0.9, habitat: 'snow', montable: true, allure: 1.8, assise: 1.2 },
  // La voiture neuve : elle sort de la chaîne de la Giga-usine, et c'est la
  // plus rapide de toutes les montures — c'est une voiture. Son habitat
  // `usine` n'existe dans aucun biome : elle n'apparaît JAMAIS toute seule
  // dans la nature, seul le garagiste de main.js la gare sur le parc.
  // Sa vitesse de flânerie est quasi nulle : une voiture garée ne broute pas.
  // `poursuite` : la VUE GTA, décidée par Max après deux essais de vue
  // intérieure (« on va rester dans une vue un peu comme GTA, où on voit la
  // voiture par derrière ») — la caméra recule et s'élève derrière le
  // véhicule. Le cockpit sculpté reste : on le voit à travers les vitres.
  // `assise` reste en secours : un fun.js ancien qui ignore `poursuite`
  // retombe dessus et l'enfant voit encore la route.
  //
  // LE RECUL PASSE DE 5,2 À 6,4 (v279), ET C'EST LA MOITIÉ DE LA DEMANDE DE MAX
  // QUE LA v278 N'AVAIT PAS LIVRÉE : « il faudrait la zoom out un petit peu ET
  // faire comme dans GTA, quand la voiture tourne, on voit le flanc de la
  // voiture sur le côté. » La v278 a donné à la caméra son propre cap, en
  // retard — le flanc —, et n'a pas touché à la distance.
  //
  // JUGÉ SUR CAPTURES, TROIS VALEURS DEPUIS LE MÊME POINT, sur le boulevard
  // Voltaire, en ligne droite et en virage tenu : à 5,2 la carrosserie mange le
  // bas du cadre et l'on ne voit guère que le coffre ; à 7,6 la voiture devient
  // un objet lointain et l'on perd la sensation de conduire ; à 6,4 elle tient
  // entière dans le cadre, la rue s'ouvre devant, et le flanc est net en virage.
  // La hauteur suit la distance pour garder le même angle de vue
  // (2,1 / 5,2 = 0,404 → 2,59).
  //
  // Et mon premier jeu de captures ne valait rien : il enchaînait les trois
  // valeurs sans remettre la voiture en place, si bien que la deuxième a été
  // prise à l'ARRÊT contre une façade. On ne compare pas trois reculs si l'on
  // compare trois endroits.
  // `nourrissable: false` : une voiture ne se nourrit pas (Max l'a vu sur le
  // bouton). Comme `montable`, la règle vit dans la fiche, jamais dans fun.js.
  // `immobile` : garée, elle ne flâne pas et ne pivote pas (le vagabondage
  // du bestiaire la faisait « bouger tac tac tac sans rouler » — Max). Elle
  // ne se déplace que conduite, où elle suit le joueur, en douceur.
  { key: 'voiture', name: 'Voiture neuve', cry: 'Vroum vroum !', emoji: '🚗', speed: 0.01,
    height: 1.3, width: 0.98, habitat: 'usine', montable: true,
    // l'allure de SECOURS, quand le modèle n'a pas de classe : une berline
    // (v358 — elle valait 3,4, plus lent que toutes les classes)
    allure: allureDeClasse('berline'),
    assise: 1.0, poursuite: { recul: 6.4, hauteur: 2.59 }, nourrissable: false, immobile: true,
    // LE SIÈGE DU CONDUCTEUR (v249), dans le repère du véhicule (le nez est
    // en −z, le volant du cockpit à x = −0,33) : c'est là que main.js assied
    // l'avatar de l'enfant quand il conduit — Max : « qu'on voie le
    // personnage conduire ». `y` est le dessus de l'assise, plus bas que le
    // baquet sculpté pour que la tête reste sous le toit des modèles.
    siege: { x: -0.33, y: 0.52, z: 0.22 },
    // LES SIÈGES DES PASSAGERS (v253) : le premier conduit, les autres
    // montent ici — à droite devant, puis la banquette. Max : « permets que
    // plusieurs joueurs rentrent dans un moyen de transport ».
    sieges: [{ x: 0.33, y: 0.52, z: 0.22 }, { x: -0.33, y: 0.52, z: -0.75 }, { x: 0.33, y: 0.52, z: -0.75 }],
    // `vole: false` : la fiche interdit le vol, player.js l'applique. Voir la
    // note de `volInterdit` — la règle vit ici, jamais dans fun.js.
    vole: false, garable: true,
    // `gabarit` : la largeur de la boîte de collision quand on la conduit.
    // Le modèle mesure 2,26 blocs de large ; la boîte du piéton en fait 0,6,
    // et une voiture qui l'empruntait traversait les murs (Max, capture :
    // « cars crashing into walls »). Même discipline que `vole` et
    // `montable` : la règle vit dans la fiche, jamais dans fun.js.
    gabarit: 2.2,
    // LE SON (v268) : `moteur` nomme la recette de bruit de fond, `radio`
    // dit qu'une station s'allume à la montée — Max : « quand on rentre
    // dans une voiture, on devrait avoir un bruit de radio ». Un cheval n'a
    // ni l'un ni l'autre, et cela s'écrit en ne l'écrivant pas. Même
    // discipline que `montable`, `vole`, `gabarit` et `habitacle`.
    moteur: 'voiture', radio: true },

  // LA MOTO (v553). Max : « j'ajoute aussi le concept de moto ». Elle roule
  // avec la physique d'une voiture (`gabarit` > 1 : `conduite.js`, sa classe
  // `moto`), et ce qui la distingue vit ici, dans sa fiche :
  //   · `selle` : on l'enfourche d'un coup — ni portière ni séquence de
  //     marche jusqu'au volant (embarquement.js) ;
  //   · `penche` : dans un virage elle se couche vers l'INTÉRIEUR, quand une
  //     voiture penche vers l'extérieur (sensations.js) ;
  //   · `pose` : l'enfant est à califourchon, bras tendus vers le guidon
  //     (main.js, `asseoir`) ;
  //   · `gabarit` 1,2 : la machine et les genoux du pilote, bien plus étroite
  //     qu'une voiture — elle se faufile ;
  //   · `moteur: 'moto'` : un bicylindre plus aigu que la voiture (sons.js) ;
  //     pas de radio sur une moto.
  // Le siège est dans le repère du véhicule (nez en −z), mesuré sur la selle
  // du modèle converti : son avant, à 0,80 du sol.
  { key: 'moto', name: 'Moto de police', cry: 'Vrrroum !', emoji: '🏍️', speed: 0.01,
    height: 1.4, width: 0.8, habitat: 'usine', montable: true,
    allure: allureDeClasse('moto'),
    assise: 0.8, poursuite: { recul: 4.6, hauteur: 2.1 }, nourrissable: false, immobile: true,
    siege: { x: 0.03, y: 0.8, z: 0.32 },
    sieges: [{ x: 0.03, y: 0.88, z: 0.78 }],
    pose: { cuisses: -1.05, genoux: 1.15, bras: -1.25, coudes: -0.3 },
    selle: true, penche: true,
    //   · `longueur` 2,4 : mesurée sur le modèle converti (z −1,31 à +1,12) —
    //     la boîte orientée et le choc de face la lisent (player.js) : une
    //     moto ne bute pas sur un mur à la distance d'une voiture ;
    vole: false, gabarit: 1.2, longueur: 2.4, moteur: 'moto' },

  // --- LES AVIONS : le mode `pilote`, le troisième --------------------------
  //
  // Max : « add planes, airbus, concord and military jets and allow us to fly
  // with them at relevant speed for each ».
  //
  // LES VITESSES SONT DES RAPPORTS RÉELS, PAS DES GOÛTS. Un avion de ligne
  // croise à 900 km/h, le Concorde à 2 180, un chasseur à 2 200 : le rapport
  // est de 1 à 2,4, et le chasseur se distingue du Concorde par son AGILITÉ,
  // pas par sa pointe. L'ancre est mesurée dans le jeu : un enfant qui vole
  // librement atteint 88 blocs par seconde en croisière (`player.js`), donc un
  // avion de ligne doit se sentir plus rapide que cela — 110 — et le Concorde
  // deux fois et demie plus.
  //
  // `pilote` porte les quatre nombres de la physique de vol, et la règle vit
  // ICI, dans la fiche de l'espèce, jamais dans `fun.js` ni dans `player.js` —
  // même discipline que `montable`, `nourrissable`, `vole` et `gabarit`, dont
  // l'oubli a déjà coûté des mois.
  //
  //   max         la vitesse de pointe, en blocs par seconde
  //   poussee     ce que la manette des gaz ajoute par seconde
  //   decrochage  en dessous, l'avion ne tient plus l'air et descend
  //   virage      le taux de virage à plein roulis, en radians par seconde
  //   rotation    la vitesse à laquelle le nez se lève sur la piste (v261)
  //   approche    la vitesse tenue en finale, jusqu'au toucher des roues
  //   roulage     l'allure au sol, au joystick
  //   frein       ce que les freins retirent par seconde, roues au sol
  //   toucherMax  au-delà de cette vitesse au toucher, l'avion se casse (aviation)
  //   chuteMax    au-delà de cette vitesse de chute au toucher, aussi — un peu
  //               plus d'une fois et demie l'approche, et trois fois et demie
  //               ce que l'arrondi assisté laisse (deux blocs par seconde)
  //
  // Le roulement avant la rotation vaut rotation² / (2 × poussée) : 49 blocs
  // pour l'avion de ligne, 57 pour le Concorde, 13 pour le chasseur — sur
  // des pistes de 140 blocs à Roissy. Le freinage, approche² / (2 × frein) :
  // 34, 43 et 21 blocs. C'est ce qu'un témoin de `monte.js` mesure.
  //
  // ET LA CARTE DOIT POUVOIR SUIVRE — LE RAPPORT RÉEL A CÉDÉ (v229).
  //
  // Max : « les jets volent trop vite, la carte n'arrive pas à suivre et ça
  // rame. » Mesuré dans la boucle du jeu : le monde se maille à 154 morceaux
  // par seconde, et voler à la vitesse v en réclame 1,5 × v. À 264 il en
  // manquait un facteur cinq — l'enfant volait dans le vide, deux appels de
  // dessin par image.
  //
  // Le critère se lit dans le monde, pas dans un pourcentage : à quelle
  // distance devant soi commence le paysage qui n'est pas encore maillé.
  // Médiane sur six relevés, distance d'affichage de l'iPad :
  //
  //     95 b/s → 132-137 blocs      110 → 125-138      170 → 51-86      264 → 32-51
  //
  // Le plafond était donc à cent dix. Garder les 1 à 2,4 du réel (900 km/h
  // contre 2 180) voulait dire un Concorde qui vole devant le monde ; Max a
  // tranché pour l'autre branche : TOUT LE MONDE AUTOUR DE CENT. 95 pour
  // l'avion de ligne — juste au-dessus des 88 du vol libre, sinon prendre
  // l'avion ne sert à rien — et 110 pour les deux rapides.
  //
  // ET LA DETTE SE REMBOURSE COMME ELLE L'AVAIT ANNONCÉ : EN MAILLANT PLUS
  // VITE (v265). Max : « Jet should fly faster ». La v229 écrivait « le seul
  // moyen de reprendre le rapport est de MAILLER PLUS VITE, pas de réécrire
  // ce commentaire » — c'est exactement ce qui vient d'arriver. Le mailleur
  // est sorti du fil principal en v251, et la v265 a trouvé qu'on ne lui
  // confiait que HUIT morceaux d'avance, réapprovisionnés une fois par
  // image : il passait l'essentiel de son temps à sec. La file à SEIZE
  // (`EN_ATTENTE_MAX`, main.js) doublait le débit de pointe sans coûter une
  // image — c'est ce qu'on croyait alors.
  //
  // ET C'ÉTAIT FAUX : LA FILE EST REVENUE À HUIT EN v269, parce que seize
  // rendait le jeu impraticable sur l'iPad (9,1 images par seconde à Paris
  // contre 18,3, et 3,1 % du temps en images de plus de trois cents
  // millisecondes). Le plateau de vitesse ci-dessous a donc été mesuré sur
  // une file qui n'existe plus, et il a été REMESURÉ le jour même — le
  // tableau qui fait foi est celui du bas, « ET LE PLATEAU SE REMESURE QUAND
  // LA FILE CHANGE ». Ce qui suit reste écrit parce qu'il dit COMMENT on
  // mesure, et parce qu'un plateau mesuré sur une file donnée ne vaut que
  // pour elle : **une vitesse qu'on ne remesure pas quand le mailleur change
  // est une vitesse fausse qui ne rougit nulle part** — celle-ci a rougi,
  // par le témoin du trou de `monte.js`, et c'est ce qui l'a rattrapée.
  //
  // ON REMESURE DONC LE PLATEAU AVEC LE MÊME CRITÈRE, jamais on ne le
  // déduit du débit : le TROU devant soi, médiane sur six relevés, à rr=12,
  // en campagne et sur un couloir de villes.
  //
  //     file de huit (l'ancien code)       110 →  91 ·  82
  //                                        160 →  51 ·  58
  //     file de seize                      110 → 165 · 165
  //                                        160 → 125 · 122
  //                                        190 → 107 · 107
  //                                        240 →  72 ·  72
  //
  // Le plateau est à CENT SOIXANTE, et c'est la barre de la v229 elle-même
  // qui le dit : elle acceptait 125-138 blocs de trou et rejetait 51-86. À
  // 160 on rend 122-125 — la qualité qu'elle avait retenue — quand 240 rend
  // 72, dans sa bande de refus. Et l'on est plus au large qu'avant : à 160
  // le trou vaut 122, quand l'ancien code en rendait 82 à 110, et 51 à 160.
  //
  // CE QUE MON PREMIER JET AVAIT MANQUÉ, et qui vaut pour la prochaine fois :
  // une file de quarante-huit rend bien 192 de trou à 190 blocs par seconde,
  // et le portail complet l'a REFUSÉ — sept suites rouges de cadence. On ne
  // règle pas une vitesse sur un seul chiffre quand un second chiffre paie
  // la note.
  //
  // MA PREMIÈRE SONDE NE MESURAIT RIEN, et c'est à savoir avant de
  // remesurer : elle posait `vitesseAvion = v` et l'avion redescendait à
  // `p.max` en une seconde (player.js, état `vol` : `cible = p.max`).
  // Parcouru 495 blocs à 110 et 506 à 300 — le même vol quatre fois. La
  // vitesse d'essai se met dans la FICHE, jamais dans la variable du moment.
  //
  // ET LE PLATEAU SE REMESURE QUAND LA FILE CHANGE (v269). La file du
  // mailleur est revenue de seize à huit — seize rendait le jeu impraticable
  // sur l'iPad — donc le monde ne maille plus au même débit, donc les
  // 160 blocs par seconde de la v265 ne tiennent plus. Remesuré au MÊME
  // critère (trou devant soi, médiane de six relevés, rr=12, couloir
  // vierge), file de huit :
  //
  //     v   | trou | barre v/2 |
  //     95  | 115  |    48     |
  //     110 | 112  |    55     |
  //     120 |  93  |    60     |   ← retenu pour les deux rapides
  //     130 |  80  |    65     |
  //     145 |  80  |    73     |
  //     160 |  64  |    80     |   ← la règle tombe
  //
  // LE GENOU EST ENTRE 120 ET 130, ET C'EST LA CHARGE QUI TRANCHE. Ces
  // chiffres sont mesurés SEULS ; le portail complet, lui, a rendu 80 à 120
  // et 51-58 à 160 — quinze pour cent de moins. À 130 la marge tomberait à
  // trois blocs et le témoin battrait d'une exécution à l'autre ; à 120 elle
  // reste de vingt. Une vitesse se choisit sur la mesure SOUS CHARGE, pas
  // sur la meilleure qu'on vient de voir — c'est la règle des bornes de
  // garde, appliquée à une constante de jeu.
  //
  // Ce qu'on garde donc : l'avion de ligne à 95 (le chiffre que la v229
  // avait mesuré pour lui, et qui reste au-dessus du vol libre de l'enfant,
  // 88 — sinon prendre l'avion ne sert à rien), les deux rapides à 120,
  // c'est-à-dire AU-DESSUS des 110 d'avant la demande de Max. Le rapport est
  // de 1,26, meilleur que les 1,16 de la v229. Le réel est à 2,4 : il reste
  // hors de portée, et c'est une dette déclarée dont le seul remède est de
  // mailler plus vite. Le chasseur et le Concorde gardent la MÊME pointe :
  // ce qui les sépare est l'agilité, comme depuis la v229.
  //
  // ET LE COMPTEUR NE BOUGE PAS D'UN KILOMÈTRE-HEURE : `kmh` est intact, et
  // l'affichage en prend la fraction de `max` atteinte (main.js). Pleins gaz,
  // le chasseur affiche toujours Mach 1,8. C'est exactement ce que la v267 a
  // construit pour ce cas : ce qu'on affiche n'est pas ce qu'on parcourt.
  //
  // ET CE QU'ON AFFICHE N'EST PAS CE QU'ON PARCOURT (v267). Max : « peut-être
  // fake la vraie vitesse, mais quand ton avion de chasse vole il devrait
  // voler à une vitesse supersonique ; idem, un Concorde ça ne vole pas à
  // 500 km/h ». Il a raison sur les deux bouts, et il a lui-même donné la
  // sortie : le compteur faisait `blocs par seconde × 3,6`, c'est-à-dire un
  // bloc pour un mètre, et rendait 576 km/h pour un Concorde.
  //
  // Un bloc ne vaut UN MÈTRE nulle part dans ce jeu. Au sol il en vaut trente
  // à quarante dans une ville ; sur la carte du monde, 187 (`kmParBloc`). Le
  // compteur mentait donc DÉJÀ, et dans le sens qui rapetisse tout. `kmh` est
  // la vraie vitesse de croisière de l'appareil, et l'affichage la rapporte à
  // la fraction de `max` réellement atteinte : la manette à mi-course montre
  // la moitié. Ce qui se DÉPLACE reste borné par ce que le monde sait mailler
  // — c'est `max`, mesuré, et ce paragraphe-là ne bouge pas.
  //
  // Les chiffres sont ceux des vrais appareils, pas des goûts : un long
  // courrier croise à Mach 0,85 (900 km/h), le Concorde volait à Mach 2,04
  // (2 180), un chasseur moderne tient Mach 1,8 (2 200). Le Concorde et le
  // chasseur se retrouvent donc à égalité DANS LE RÉEL AUSSI — ce que la
  // v229 avait décidé pour de tout autres raisons.
  //
  // `gabarit` n'est PAS l'envergure. Une boîte de collision ne tourne pas :
  // à quinze blocs de large, un avion resterait coincé entre deux hangars et
  // ne pourrait même pas rouler sur sa piste. On prend la largeur du
  // FUSELAGE — les ailes débordent, comme le capot d'une voiture en travers
  // mord un peu (v212). Un avion passe l'essentiel de sa vie en l'air, où
  // rien ne le frotte.
  { key: 'avionligne', name: 'Avion de ligne', cry: 'Rrrrrouuuu !', emoji: '✈️', speed: 0.01,
    height: 4.2, width: 2.2, habitat: 'aeroport',
    montable: true, allure: 1, assise: 2.6, poursuite: { recul: 18, hauteur: 7 },
    nourrissable: false, immobile: true, vole: true, gabarit: 2.4,
    pilote: { max: 95, poussee: 18, decrochage: 30, virage: 0.55,
      rotation: 42, approche: 45, roulage: 6, frein: 30, kmh: 900,
      toucherMax: 64, chuteMax: 7 },
    // LES SIÈGES DES PASSAGERS (Max, 20 octobre : « rentrer dans une voiture,
    // avion… en passager si un autre joueur est déjà conducteur »). Dans la
    // CABINE, derrière la porte avant (z −5,9), jamais au poste de pilotage :
    // deux de front, trois rangées. Mesurés sur le modèle (avions.js) : axe
    // du fuselage à 1,62, rayon 0,85, donc un plancher vers 0,9 et un
    // plafond à 2,47 ; des hanches à 1,15 mettent le crâne à 1,86.
    sieges: [{ x: -0.3, y: 1.15, z: -4.0 }, { x: 0.3, y: 1.15, z: -4.0 },
      { x: -0.3, y: 1.15, z: -2.6 }, { x: 0.3, y: 1.15, z: -2.6 },
      { x: -0.3, y: 1.15, z: -1.2 }, { x: 0.3, y: 1.15, z: -1.2 }],
    moteur: 'avion' },

  { key: 'concorde', name: 'Concorde', cry: 'Whoooosh !', emoji: '🛩️', speed: 0.01,
    height: 4.4, width: 1.6, habitat: 'aeroport',
    montable: true, allure: 1, assise: 2.7, poursuite: { recul: 22, hauteur: 8 },
    nourrissable: false, immobile: true, vole: true, gabarit: 2.0,
    // Il vole vite mais il vire mal : une aile delta ne tourne pas court, et
    // il décroche haut — c'est pour cela que les vraies pistes du Concorde
    // étaient les plus longues.
    pilote: { max: 120, poussee: 34, decrochage: 55, virage: 0.40,
      rotation: 62, approche: 62, roulage: 6, frein: 45, kmh: 2180,
      toucherMax: 84, chuteMax: 7 },
    // un seul rang : le fuselage fait 0,94 bloc (axe à 1,72, rayon 0,47) —
    // des hanches à 1,4 laissent le crâne à 2,11 sous un plafond à 2,19.
    // Pas de porte (v381) : on monte à bord d'un coup.
    sieges: [{ x: 0, y: 1.4, z: -4.5 }, { x: 0, y: 1.4, z: -3.0 },
      { x: 0, y: 1.4, z: -1.5 }, { x: 0, y: 1.4, z: 0 }],
    moteur: 'avion' },

  { key: 'chasseur', name: 'Avion de chasse', cry: 'Vriiiii !', emoji: '🚀', speed: 0.01,
    height: 3.2, width: 1.4, habitat: 'aeroport',
    montable: true, allure: 1, assise: 2.2, poursuite: { recul: 13, hauteur: 5 },
    nourrissable: false, immobile: true, vole: true, gabarit: 1.8,
    // Même pointe que le Concorde, mais il grimpe trois fois plus vite et
    // vire trois fois plus court : c'est ce qui fait un chasseur.
    pilote: { max: 120, poussee: 90, decrochage: 40, virage: 1.30,
      rotation: 48, approche: 50, roulage: 7, frein: 60, kmh: 2200,
      toucherMax: 70, chuteMax: 8 },
    // UNE PLACE ARRIÈRE, SOUS LA VERRIÈRE : un chasseur n'a pas de cabine, et
    // la version biplace (le pilote devant, le passager derrière) est la
    // seule façon d'y emmener un ami. RELEVÉE SUR LES DEUX MODÈLES (v563) :
    // la bulle du chasseur déposé va de z −3,9 à −1,9 et culmine à 2,03 ; la
    // place à −0,9 de la v552 tombait DERRIÈRE elle, la tête dans le dos du
    // fuselage (1,89). À −2,7, des hanches à 1,2 mettent le crâne à 1,91 sous
    // les deux bulles (celle du modèle sculpté monte à 2,6).
    sieges: [{ x: 0, y: 1.2, z: -2.7 }],
    moteur: 'avion' },
];
