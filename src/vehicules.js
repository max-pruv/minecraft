// Ce qui roule tout seul : les rames du métro aérien et les voitures du
// circuit.
//
// Le principe est le même pour les deux — un tracé fermé, une position le long
// de ce tracé qui avance à chaque image, et un maillage qu'on repose dessus en
// l'orientant dans le sens de la marche. C'est ce qui permet d'avoir un train
// qui tourne réellement, wagons compris, sans rien simuler de compliqué.
//
// Comme partout ailleurs, rien ne tourne quand l'enfant est loin : un convoi
// hors de vue ne coûte ni animation, ni appel de rendu.

import * as THREE from 'three';
import { construireTaxi } from './taxis.js';
import { Atelier } from './modeles.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

// --- les reflets --------------------------------------------------------------
//
// La carrosserie REFLÈTE le monde : une caméra cubique rend la scène autour
// de la voiture la plus proche (128 px, quelques fois par seconde, voir
// main.js) et sa texture sert d'horizon aux matériaux. C'est ce qui sépare
// la laque de l'argile. L'essai précédent — un « ciel en boîte » peint à la
// main dans des canvases — cassait l'échantillonnage et blanchissait toute
// la voiture ; une cible de rendu GPU, elle, est valide par construction.
let refletsRT = null;
let refletsCamera = null;
export function refletsVoiture() {
  if (!refletsRT && typeof document !== 'undefined') {
    refletsRT = new THREE.WebGLCubeRenderTarget(128, {
      generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter,
    });
    refletsCamera = new THREE.CubeCamera(0.5, 120, refletsRT);
  }
  return refletsRT;
}
export function majRefletsVoiture(renderer, scene, pos) {
  if (!refletsRT) return;
  refletsCamera.position.set(pos.x, pos.y + 1.1, pos.z);
  // Un matériau ne peut lire la texture cubique pendant qu’on l’écrit :
  // WebGL signale alors une boucle de rétroaction. Les surfaces qui utilisent
  // cette sonde sont exclues de sa capture, puis restaurées pour la vue joueur.
  const masques = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m.envMap === refletsRT.texture)) {
      masques.push(o);
      o.visible = false;
    }
  });
  try { refletsCamera.update(renderer, scene); }
  finally { for (const o of masques) o.visible = true; }
}

// --- la vraie voiture ---------------------------------------------------------
//
// Le modèle d'artiste (vendor/voiture.glb, voir vendor/VOITURE_LICENSE) :
// une vraie carrosserie de 99 000 triangles fournie par Max — la sculpture
// de primitives à l'aveugle plafonnait au low-poly, et il a eu raison de le
// dire. Chargé UNE fois, cloné pour chaque voiture garée. En cas d'échec
// (fichier absent d'un vieux cache), la coque sculptée reste en place : le
// modèle améliore, il ne conditionne jamais le démarrage.
let chargementVraieVoiture = null;
export function chargerVraieVoiture() {
  if (chargementVraieVoiture || typeof document === 'undefined') return chargementVraieVoiture;
  chargementVraieVoiture = new GLTFLoader().loadAsync('./vendor/voiture.glb').then((gltf) => {
    const brut = gltf.scene;
    const chercherMesh = (bout) => {
      let trouve = null;
      brut.traverse((o) => {
        if (!trouve && o.isMesh && (o.name || '').toLowerCase().includes(bout)) trouve = o;
      });
      return trouve;
    };
    // Le modèle embarque un socle de présentation nommé « None », posé 1,4
    // sous les pneus : mesuré avec lui, la voiture flottait à sa hauteur.
    // Le RÉSERVOIR, lui, est la baignoire noire qui remplit l'habitacle du
    // modèle : elle enterrait notre poste de conduite (montures.js) et
    // murait la vue. Le moteur reste — on le voit derrière les sièges,
    // comme sur la vraie.
    const retraits = [];
    brut.traverse((o) => {
      if (!o.isMesh) return;
      const nom = (o.name || '').toLowerCase();
      if (o.name === 'None' || nom.includes('fuel_tank')) retraits.push(o);
    });
    for (const s of retraits) s.removeFromParent();
    const boite = new THREE.Box3().setFromObject(brut);
    const taille = boite.getSize(new THREE.Vector3());
    const centre = boite.getCenter(new THREE.Vector3());
    // recentré, posé au sol, à l'échelle du jeu
    const cadre = new THREE.Group();
    cadre.add(brut);
    brut.position.set(-centre.x, -boite.min.y, -centre.z);
    cadre.scale.setScalar(4.4 / Math.max(taille.x, taille.z));
    if (taille.x > taille.z) cadre.rotation.y = Math.PI / 2;
    // L'AVANT VERS -Z, VÉRIFIÉ, PAS DEVINÉ. Aligner le grand axe sur z ne
    // dit pas quel bout est l'avant : pile ou face — et c'était tombé face.
    // Pendant toute la v181 la voiture a roulé phares vers l'arrière, et de
    // l'habitacle on regardait l'aileron (capture à l'appui). Les phares
    // tranchent : s'ils finissent à z positif, demi-tour.
    cadre.updateMatrixWorld(true);
    const phare = chercherMesh('headlight');
    if (phare) {
      const ou = new THREE.Box3().setFromObject(phare).getCenter(new THREE.Vector3());
      if (ou.z > 0) { cadre.rotation.y += Math.PI; cadre.updateMatrixWorld(true); }
    }
    // LA CABINE SUR L'ORIGINE, MESURÉE, PAS RÉGLÉE À L'ŒIL. La caméra
    // s'assied sur l'origine (fiche `siege`) : le pare-brise du modèle doit
    // tomber juste devant elle, son centre au-dessus de la planche de bord
    // de montures.js. L'ancien recalage (+0,55, réglé à l'œil sur le modèle
    // à l'envers) posait le moteur sur les genoux du conducteur.
    const vitre = chercherMesh('front_window');
    if (vitre) {
      const ou = new THREE.Box3().setFromObject(vitre).getCenter(new THREE.Vector3());
      cadre.position.z = -0.45 - ou.z;
    } else cadre.position.z = 0.55;
    const porteur = new THREE.Group();
    porteur.add(cadre);
    const rt = refletsVoiture();
    porteur.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      // La transparence se juge sur le nom du matériau ET celui du maillage :
      // le pare-brise s'appelle front_window mais porte le matériau à tout
      // faire « breaks_ » — jugé sur le matériau seul, il restait OPAQUE, et
      // la vue cockpit regardait un mur sombre. Ce matériau étant PARTAGÉ
      // (freins, moteur, jantes…), on le CLONE avant de le rendre
      // transparent, sinon la moitié de la voiture devient fantôme.
      const matNom = (o.material.name || '').toLowerCase();
      const meshNom = (o.name || '').toLowerCase();
      const matVitre = matNom.includes('glass') || matNom.includes('window');
      if (matVitre || meshNom.includes('glass') || meshNom.includes('window')) {
        if (!matVitre) o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.35;
      }
      if (rt) { o.material.envMap = rt.texture; o.material.envMapIntensity = 1.0; }
      o.material.needsUpdate = true;
    });
    return porteur;
  }).catch(() => null);
  return chargementVraieVoiture;
}

// --- la flotte ----------------------------------------------------------------
//
// Cinquante modèles fournis par Max (vendor/voitures, voir LICENSE.md) pour
// la diversité des voitures à conduire. Paramétriques, HOMOGÈNES, et déjà
// normalisés par leur manifeste — c'est ce qui rend ce chargeur trivial là
// où celui du modèle d'artiste mesure et devine :
//   - mètres réels, et 1 m = 1 bloc : AUCUNE mise à l'échelle ;
//   - roues posées à y = 0, origine au centre : AUCUN recalage ;
//   - +Z vers le nez pour tous : UNE rotation π, la même pour tous —
//     l'avant ne se devine pas, il est écrit dans le contrat du fichier ;
//   - vitrage déjà transparent (alpha BLEND), intérieur complet.
// Chaque fichier pèse ~1,6 Mo et N'EST PAS dans les ASSETS : il passe par
// le STATIC_CACHE du service worker — téléchargé à la première rencontre,
// gardé à travers les mises à jour. Hors ligne avant cette rencontre, la
// coque sculptée d'attente reste en place : un modèle absent ne casse rien.
// `habitacle: false` — LE MODÈLE N'A PAS DE POSTE DE CONDUITE.
//
// Les cinquante d'origine ont tous un intérieur avec un volant nommé
// (`Interior_SteeringWheel`), et un témoin s'en sert : « le volant reste dans
// l'habitacle, visible par les vitres ». Les deux modèles déposés en v230 sont
// des carrosseries seules — la Chiron Stealth n'a aucun intérieur, la Lucid a
// une planche de bord mais pas de volant. Sans cette ligne, ce témoin
// rougirait DEUX FOIS SUR CINQUANTE-TROIS, au hasard du tirage : une bascule
// de quatre pour cent, du genre qu'on met des jours à démonter.
//
// La règle vit donc dans la FICHE, jamais dans une liste écrite dans le
// témoin — même discipline que `montable`, `nourrissable` et `vole`.
export const FLOTTE = [
  {fichier:'berline-citadine',nom:'Berline citadine',fabrique:()=>construireTaxi({taxi:false})},
  {fichier:'ny-crown-victoria',ville:'ny',nom:'Ford Crown Victoria · taxi jaune',fabrique:()=>construireTaxi()},
  {fichier:'ny-town-sedan',ville:'ny',nom:'Berline new-yorkaise',fabrique:()=>construireTaxi({taxi:false})},
  { fichier: 'acura-nsx-type-s.glb', nom: 'Acura NSX Type S' },
  { fichier: 'amg-gt-black-series.glb', nom: 'Mercedes-AMG GT Black Series' },
  { fichier: 'aston-martin-dbs-superleggera.glb', nom: 'Aston Martin DBS Superleggera' },
  { fichier: 'aston-martin-one-77.glb', nom: 'Aston Martin One-77' },
  { fichier: 'aston-martin-valkyrie.glb', nom: 'Aston Martin Valkyrie' },
  { fichier: 'audi-r8-v10-performance.glb', nom: 'Audi R8 V10 Performance' },
  { fichier: 'bentley-continental-gt-speed.glb', nom: 'Bentley Continental GT Speed' },
  { fichier: 'bmw-i8.glb', nom: 'BMW i8' },
  { fichier: 'bmw-m8-competition.glb', nom: 'BMW M8 Competition' },
  { fichier: 'bugatti-bolide.glb', nom: 'Bugatti Bolide' },
  { fichier: 'bugatti-chiron.glb', nom: 'Bugatti Chiron' },
  { fichier: 'bugatti-chiron-stealth.glb', nom: 'Bugatti Chiron Stealth', habitacle: false },
  { fichier: 'bugatti-veyron.glb', nom: 'Bugatti Veyron 16.4' },
  { fichier: 'bugatti-w16-mistral.glb', nom: 'Bugatti W16 Mistral' },
  { fichier: 'ferrari-812-competizione.glb', nom: 'Ferrari 812 Competizione' },
  { fichier: 'ferrari-daytona-sp3.glb', nom: 'Ferrari Daytona SP3' },
  { fichier: 'ferrari-f40.glb', nom: 'Ferrari F40' },
  { fichier: 'ferrari-laferrari.glb', nom: 'Ferrari LaFerrari' },
  { fichier: 'ferrari-sf90.glb', nom: 'Ferrari SF90 Stradale' },
  { fichier: 'ford-gt.glb', nom: 'Ford GT' },
  { fichier: 'koenigsegg-cc850.glb', nom: 'Koenigsegg CC850' },
  { fichier: 'koenigsegg-gemera.glb', nom: 'Koenigsegg Gemera' },
  { fichier: 'koenigsegg-jesko.glb', nom: 'Koenigsegg Jesko' },
  { fichier: 'koenigsegg-regera.glb', nom: 'Koenigsegg Regera' },
  { fichier: 'lamborghini-aventador-svj.glb', nom: 'Lamborghini Aventador SVJ' },
  { fichier: 'lamborghini-countach-lpi-800-4.glb', nom: 'Lamborghini Countach LPI 800-4' },
  { fichier: 'lamborghini-huracan-sto.glb', nom: 'Lamborghini Huracan STO' },
  { fichier: 'lamborghini-revuelto.glb', nom: 'Lamborghini Revuelto' },
  { fichier: 'lamborghini-sian-fkp-37.glb', nom: 'Lamborghini Sian FKP 37' },
  { fichier: 'lexus-lfa.glb', nom: 'Lexus LFA' },
  { fichier: 'lotus-evija.glb', nom: 'Lotus Evija' },
  { fichier: 'lucid-gravity.glb', nom: 'Lucid Gravity', habitacle: false },
  { fichier: 'maserati-mc20.glb', nom: 'Maserati MC20' },
  { fichier: 'mclaren-765lt.glb', nom: 'McLaren 765LT' },
  { fichier: 'mclaren-artura.glb', nom: 'McLaren Artura' },
  { fichier: 'mclaren-p1.glb', nom: 'McLaren P1' },
  { fichier: 'mclaren-senna.glb', nom: 'McLaren Senna' },
  { fichier: 'mclaren-speedtail.glb', nom: 'McLaren Speedtail' },
  { fichier: 'mercedes-amg-one.glb', nom: 'Mercedes-AMG One' },
  { fichier: 'nissan-gtr-nismo.glb', nom: 'Nissan GT-R Nismo' },
  { fichier: 'pagani-huayra-bc.glb', nom: 'Pagani Huayra BC' },
  { fichier: 'pagani-utopia.glb', nom: 'Pagani Utopia' },
  { fichier: 'pagani-zonda-cinque.glb', nom: 'Pagani Zonda Cinque' },
  { fichier: 'pininfarina-battista.glb', nom: 'Automobili Pininfarina Battista' },
  { fichier: 'porsche-718-cayman-gt4-rs.glb', nom: 'Porsche 718 Cayman GT4 RS' },
  { fichier: 'porsche-911-gt3-rs.glb', nom: 'Porsche 911 GT3 RS (992)' },
  { fichier: 'porsche-918-spyder.glb', nom: 'Porsche 918 Spyder' },
  { fichier: 'porsche-carrera-gt.glb', nom: 'Porsche Carrera GT' },
  { fichier: 'porsche-taycan-turbo-s.glb', nom: 'Porsche Taycan Turbo S' },
  { fichier: 'rimac-nevera.glb', nom: 'Rimac Nevera' },
  { fichier: 'rolls-royce-spectre.glb', nom: 'Rolls-Royce Spectre' },
  { fichier: 'sls-amg-black-series.glb', nom: 'Mercedes-Benz SLS AMG Black Series' },
];

const chargementsFlotte = new Map();
// UN MODÈLE SE MESURE, IL NE SE DÉCLARE PAS.
//
// Les cinquante-et-un modèles d'origine suivent un manifeste
// (`vendor/voitures/LICENSE.md`) : mètres, +Y en haut, +Z vers le nez, roues
// posées à y = 0, pivots `Wheel_FL/FR/RL/RR`, laque `Paint_*`. Trois endroits
// du jeu s'y fient pour faire tourner les roues et poser les reflets.
//
// Les modèles que Max dépose ensuite viennent d'ailleurs. Mesuré sur les deux
// premiers : la Bugatti Chiron Stealth a chaque roue éclatée en HUIT nœuds —
// un par matériau — aucun matériau nommé `Paint`, et le nez vers -X ; la Lucid
// Gravity groupe les siennes sous `FW|` et `RW|`. Sans rien faire : roues
// figées, rayon de repli, pas de reflets, voiture en travers.
//
// Convertir chaque fichier à la main marcherait UNE fois. On mesure donc le
// modèle qu'on reçoit — et l'on ne touche à RIEN quand le manifeste est
// respecté, pour que les cinquante-et-un ne bougent pas d'un pixel.
const EST_ROUE = /wheel|tire|tyre|rim|roue|pneu/i;
const EST_AVANT = /front|\bFW\b|^FW\||avant/i;
const EST_ARRIERE = /rear|back|\bRW\b|^RW\||arri/i;

// Le nom d'un nœud et de tous ses parents : chez ces modèles, « Front wheel 1 »
// est le PARENT des huit maillages de matériau.
function lignee(o) {
  const bouts = [];
  for (let n = o; n; n = n.parent) if (n.name) bouts.push(n.name);
  return bouts.join(' / ');
}

function normaliserVoiture(scene) {
  scene.updateMatrixWorld(true);
  const dejaConforme = [];
  scene.traverse((o) => { if (/^Wheel_(FL|FR|RL|RR)$/i.test(o.name || '')) dejaConforme.push(o); });
  if (dejaConforme.length >= 4) return 'manifeste';

  // 1. LES ROUES, PAR LEUR LIGNÉE. On garde les maillages dont le nom — ou
  //    celui d'un parent — parle de roue, et l'on note leur centre du MONDE.
  const morceaux = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const nom = lignee(o);
    if (!EST_ROUE.test(nom)) return;
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    morceaux.push({ o, nom, c });
  });
  if (morceaux.length < 4) return 'sans roues';

  // 2. QUEL AXE EST LA LONGUEUR ? Celui sur lequel les roues s'écartent le
  //    plus : un empattement est toujours plus long qu'une voie.
  const etendue = (k) => Math.max(...morceaux.map((m) => m.c[k])) - Math.min(...morceaux.map((m) => m.c[k]));
  const axeLong = etendue('x') >= etendue('z') ? 'x' : 'z';
  const axeLarge = axeLong === 'x' ? 'z' : 'x';

  // 3. OÙ EST L'AVANT ? Le NOM le dit — c'est plus sûr que la géométrie, qui
  //    ne distingue pas un train avant d'un train arrière.
  const avants = morceaux.filter((m) => EST_AVANT.test(m.nom) && !EST_ARRIERE.test(m.nom));
  const arrieres = morceaux.filter((m) => EST_ARRIERE.test(m.nom) && !EST_AVANT.test(m.nom));
  if (!avants.length || !arrieres.length) return 'avant introuvable';
  const moy = (t, k) => t.reduce((s, m) => s + m.c[k], 0) / t.length;
  const versAvant = Math.sign(moy(avants, axeLong) - moy(arrieres, axeLong)) || 1;

  // 4. QUATRE PIVOTS, POSÉS AU CENTRE DE CHAQUE ROUE. `attach` conserve la
  //    position du monde : on ne déplace rien, on regroupe.
  const milieuLarge = (Math.max(...morceaux.map((m) => m.c[axeLarge]))
    + Math.min(...morceaux.map((m) => m.c[axeLarge]))) / 2;
  const familles = { FL: [], FR: [], RL: [], RR: [] };
  for (const m of morceaux) {
    const av = EST_AVANT.test(m.nom) && !EST_ARRIERE.test(m.nom);
    const gauche = m.c[axeLarge] > milieuLarge;
    familles[(av ? 'F' : 'R') + (gauche ? 'L' : 'R')].push(m);
  }
  for (const [cle, liste] of Object.entries(familles)) {
    if (!liste.length) continue;
    const pivot = new THREE.Group();
    pivot.name = 'Wheel_' + cle;
    const boite = new THREE.Box3();
    for (const m of liste) boite.union(new THREE.Box3().setFromObject(m.o));
    pivot.position.copy(boite.getCenter(new THREE.Vector3()));
    scene.add(pivot);
    scene.updateMatrixWorld(true);
    for (const m of liste) pivot.attach(m.o);
  }

  // 5. LE NEZ VERS +Z, comme le manifeste. On tourne par quarts de tour :
  //    à ce pas-là rien ne se déforme.
  const quarts = axeLong === 'z' ? (versAvant > 0 ? 0 : 2) : (versAvant > 0 ? 3 : 1);
  scene.rotation.y += quarts * Math.PI / 2;
  scene.updateMatrixWorld(true);

  // 6. LES ROUES AU SOL. Le manifeste les pose à y = 0 ; un modèle qui ne le
  //    fait pas laisse la voiture flotter ou l'enterre jusqu'aux moyeux.
  const tout = new THREE.Box3().setFromObject(scene);
  scene.position.y -= tout.min.y;
  return 'mesuré';
}

export function chargerVoitureFlotte(entree) {
  if (typeof document === 'undefined') return null;
  if (chargementsFlotte.has(entree.fichier)) return chargementsFlotte.get(entree.fichier);
  if(entree.fabrique){
    const modele=entree.fabrique(),rt=refletsVoiture();
    if(rt)modele.traverse(o=>{if(o.isMesh&&(o.material.isMeshStandardMaterial||o.material.isMeshPhysicalMaterial)){o.material.envMap=rt.texture;o.material.envMapIntensity=.75;}});
    const p=Promise.resolve(modele);chargementsFlotte.set(entree.fichier,p);return p;
  }
  const chargement = new GLTFLoader().loadAsync('./vendor/voitures/' + entree.fichier)
    .then((gltf) => {
      const cadre = new THREE.Group();
      // On remet le modèle au manifeste AVANT de l'accrocher : la rotation et
      // la pose au sol se calculent dans son propre repère.
      const forme = normaliserVoiture(gltf.scene);
      cadre.add(gltf.scene);
      cadre.rotation.y = Math.PI;                      // +Z nez (contrat) → -z jeu
      const porteur = new THREE.Group();
      porteur.add(cadre);
      const rt = refletsVoiture();
      if (rt) {
        porteur.traverse((o) => {
          if (!o.isMesh || !o.material) return;
          // la laque seulement : le vitrage et le carbone gardent leur rendu
          // `Paint_*` est le nom du manifeste ; les modèles déposés ensuite
          // appellent leur laque « Pearl white body » ou « clear-coated
          // bodywork ». On reconnaît les deux, sinon la carrosserie neuve
          // reste mate au milieu d'une flotte qui brille.
          if (/paint|bodywork|\bbody\b/i.test(o.material.name || '')) {
            o.material.envMap = rt.texture;
            o.material.envMapIntensity = 1.0;
            o.material.needsUpdate = true;
          }
        });
      }
      // LE RAYON DES ROUES, MESURÉ. Le manifeste garantit les pivots
      // Wheel_FL/FR/RL/RR ; c'est animals.js qui les fait tourner, et il lui
      // faut un rayon — un angle, c'est une distance divisée par un rayon.
      // On le mesure sur le pneu plutôt que de le supposer : d'une Countach
      // à une Rolls il varie assez pour que l'œil voie la roue patiner.
      porteur.updateMatrixWorld(true);
      let roue = null;
      porteur.traverse((o) => { if (!roue && /^Wheel_/i.test(o.name || '')) roue = o; });
      const boite = roue ? new THREE.Box3().setFromObject(roue) : null;
      const rayon = boite ? (boite.max.y - boite.min.y) / 2 : 0;
      porteur.userData.rayonRoue = rayon > 0.1 ? rayon : 0.34;
      porteur.userData.forme = forme;      // « manifeste » ou « mesuré » : le témoin le lit
      return porteur;
    }).catch(() => null);
  chargementsFlotte.set(entree.fichier, chargement);
  return chargement;
}

const VU = 150;                 // au-delà, le convoi s'efface et se fige

// MAIS CENT CINQUANTE BLOCS, C'EST LA PORTÉE DU REGARD À CIEL OUVERT.
//
// Sous terre, on ne voit rien du tout : un train enterré à douze blocs est
// caché par douze blocs de roche, qu'on soit à dix mètres ou à cent. Washington
// est à cent trente-sept blocs du point d'apparition, et ses douze rames
// tombaient donc dans la portée : DIX convois, quarante wagons dessinés dans la
// pierre, au-dessus de l'endroit précis où chaque partie commence. Le rendu est
// tombé de vingt-cinq à seize images par seconde — et comme `main.js` borne
// `dt` à un vingtième de seconde, sous cette barre le monde avance moins vite
// que le temps réel : l'enfant court moins loin en appuyant aussi longtemps.
//
// Un convoi souterrain ne se montre donc que quand on est dans le tunnel avec
// lui — assez loin pour le voir arriver le long du quai, pas assez pour le
// dessiner à travers la ville.
const VU_SOUTERRAIN = 40;

// --- le tracé ----------------------------------------------------------------

// Un parcours fermé, échantillonné : on précalcule les longueurs cumulées pour
// pouvoir demander « où suis-je après 42 mètres ? » sans chercher à chaque fois.
export class Parcours {
  constructor(points) {
    this.pts = points;
    this.cumul = [0];
    let total = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      total += Math.hypot(b.x - a.x, b.z - a.z);
      this.cumul.push(total);
    }
    this.longueur = total;
  }

  // Position et cap à une distance donnée depuis le départ.
  a(distance) {
    const d = ((distance % this.longueur) + this.longueur) % this.longueur;
    // recherche dichotomique dans les longueurs cumulées
    let lo = 0, hi = this.cumul.length - 1;
    while (lo < hi - 1) {
      const mi = (lo + hi) >> 1;
      if (this.cumul[mi] <= d) lo = mi; else hi = mi;
    }
    const a = this.pts[lo % this.pts.length];
    const b = this.pts[(lo + 1) % this.pts.length];
    const seg = this.cumul[lo + 1] - this.cumul[lo] || 1;
    const t = (d - this.cumul[lo]) / seg;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      cap: Math.atan2(b.x - a.x, b.z - a.z),
    };
  }

  // LE CAP D'UNE VOITURE EST CELUI DE SON EMPATTEMENT, PAS DU SEGMENT (v244).
  //
  // `a(d).cap` est la direction du segment sous la voiture : à un carrefour,
  // elle pivotait de quatre-vingt-dix degrés en une image — mesuré, cinquante-
  // neuf sauts de plus de trente-quatre degrés en trente secondes à Paris. Max :
  // « quand la voiture tourne, ce soit beaucoup plus naturel ». Une vraie
  // voiture tourne sur la longueur de son empattement : on prend la corde
  // entre le point sous l'essieu arrière et celui sous l'essieu avant, et le
  // corps pivote progressivement pendant qu'il franchit le coin.
  capLisse(distance, demi = 1.6) {
    const ar = this.a(distance - demi), av = this.a(distance + demi);
    return Math.atan2(av.x - ar.x, av.z - ar.z);
  }

  // La courbure ici, en radians par bloc : ce que le cap change sur un bloc de
  // trajet. Positive à gauche (le cap augmente), négative à droite.
  courbure(distance) {
    let e = this.capLisse(distance + 0.5) - this.capLisse(distance - 0.5);
    while (e > Math.PI) e -= Math.PI * 2;
    while (e < -Math.PI) e += Math.PI * 2;
    return e;
  }

  // De combien le tracé tourne dans les prochains mètres, en radians.
  //
  // C'est ce qui manquait pour que la monoplace ressemble à une monoplace :
  // elle roulait à dix-sept mètres par seconde partout, épingles comprises.
  // Une vraie voiture freine AVANT le virage — d'où ce regard en avant, et
  // non la courbure sous les roues.
  virageDevant(distance, avance = 16) {
    const ici = this.a(distance).cap;
    let max = 0;
    for (let d = 3; d <= avance; d += 3) {
      let e = this.a(distance + d).cap - ici;
      while (e > Math.PI) e -= Math.PI * 2;
      while (e < -Math.PI) e += Math.PI * 2;
      const abs = Math.abs(e);
      if (abs > max) max = abs;
    }
    return max;
  }
}

// --- les modèles -------------------------------------------------------------

// Une voiture de métro : caisse arrondie, bandeau vitré continu, portes, bogies.
// Le nez est plus arrondi sur la motrice que sur les remorques.
function construireRame(motrice, couleur = 0x2a6ad8) {
  const a = new Atelier();
  const L = 7.2, larg = 1.5, h = 1.6;
  const y0 = 0.75;
  // la caisse
  a.cylindre(couleur, {
    p: [0, y0 + h / 2, 0], r: [Math.PI / 2, 0, 0], e: [larg, L, h],
    haut: 0.5, bas: 0.5, seg: 12,
  });
  // les deux bouts, arrondis
  for (const s of [-1, 1]) {
    a.sphere(couleur, { p: [0, y0 + h / 2, s * L / 2], e: [larg, h, motrice ? 1.5 : 0.8], seg: 12 });
  }
  // le bandeau vitré, continu sur toute la longueur
  for (const s of [-1, 1]) {
    a.boite(0x9fd8ee, { p: [s * larg * 0.5, y0 + h * 0.62, 0], e: [0.06, 0.42, L * 0.86] });
  }
  // les portes, deux par flanc
  for (const s of [-1, 1]) {
    for (const dz of [-1.9, 1.9]) {
      a.boite(0x1a2a44, { p: [s * larg * 0.51, y0 + h * 0.42, dz], e: [0.06, 1.0, 0.9] });
    }
  }
  // la bande de livrée
  a.cylindre(0xf0f0ea, { p: [0, y0 + 0.28, 0], r: [Math.PI / 2, 0, 0], e: [larg * 1.01, L * 0.98, 0.22], haut: 0.5, bas: 0.5, seg: 12 });
  // le pare-brise et les feux de la motrice
  if (motrice) {
    a.boite(0x9fd8ee, { p: [0, y0 + h * 0.66, -L / 2 - 0.5], e: [1.0, 0.6, 0.1] });
    for (const s of [-1, 1]) {
      a.sphere(0xfff0b0, { p: [s * 0.45, y0 + 0.42, -L / 2 - 0.62], e: [0.2, 0.2, 0.12], seg: 8 });
    }
  }
  // les bogies
  for (const dz of [-2.4, 2.4]) {
    a.boite(0x2a2a30, { p: [0, y0 - 0.42, dz], e: [1.3, 0.4, 1.5] });
    for (const s of [-1, 1]) {
      for (const d2 of [-0.5, 0.5]) {
        a.cylindre(0x4a4a54, {
          p: [s * 0.66, y0 - 0.58, dz + d2], r: [0, 0, Math.PI / 2],
          e: [0.4, 0.12, 0.4], haut: 0.5, bas: 0.5, seg: 8,
        });
      }
    }
  }
  return a.finir();
}

// Une monoplace : museau pointu, ailerons avant et arrière, roues à l'air libre,
// pontons latéraux et arceau. La silhouette ne ressemble à aucune autre voiture.
function construireF1(couleur = 0xd82a2a, second = 0xf0f0ea) {
  const a = new Atelier();
  const y0 = 0.34;
  // le fond plat et le corps effilé
  a.boite(couleur, { p: [0, y0, 0], e: [0.9, 0.18, 4.6] });
  a.cylindre(couleur, { p: [0, y0 + 0.24, 0.3], r: [Math.PI / 2, 0, 0], e: [0.78, 3.4, 0.6], haut: 0.5, bas: 0.5, seg: 10 });
  // le museau, qui s'affine vers l'avant
  a.cylindre(couleur, { p: [0, y0 + 0.2, -2.1], r: [Math.PI / 2, 0, 0], e: [0.42, 1.7, 0.34], haut: 0.16, bas: 0.5, seg: 8 });
  // l'aileron avant, large et bas
  a.boite(second, { p: [0, y0 - 0.02, -2.95], e: [2.0, 0.08, 0.62] });
  for (const s of [-1, 1]) a.boite(couleur, { p: [s * 0.95, y0 + 0.12, -2.95], e: [0.08, 0.34, 0.6] });
  // les pontons
  for (const s of [-1, 1]) {
    a.cylindre(couleur, { p: [s * 0.62, y0 + 0.22, 0.5], r: [Math.PI / 2, 0, 0], e: [0.5, 1.9, 0.5], haut: 0.34, bas: 0.5, seg: 8 });
    a.boite(0x2a2a30, { p: [s * 0.85, y0 + 0.3, -0.3], e: [0.06, 0.34, 0.5] });   // l'écope
  }
  // le cockpit, l'arceau et le casque du pilote
  a.sphere(0x1a1a20, { p: [0, y0 + 0.46, -0.5], e: [0.52, 0.3, 1.0], seg: 10 });
  a.sphere(0xe8e2d0, { p: [0, y0 + 0.6, -0.5], e: [0.36, 0.34, 0.4], seg: 10 });
  a.boite(0x1a1a20, { p: [0, y0 + 0.62, -0.72], e: [0.3, 0.12, 0.06] });
  a.cylindre(second, { p: [0, y0 + 0.72, 0.05], r: [0, 0, 0], e: [0.5, 0.5, 0.16], haut: 0.5, bas: 0.5, seg: 8 });
  // la prise d'air au-dessus de la tête
  a.cylindre(couleur, { p: [0, y0 + 0.78, 0.45], r: [Math.PI / 2, 0, 0], e: [0.34, 0.9, 0.42], haut: 0.5, bas: 0.5, seg: 8 });
  // l'aileron arrière, haut et à deux plans
  for (const s of [-1, 1]) a.boite(couleur, { p: [s * 0.5, y0 + 0.62, 2.35], e: [0.08, 0.7, 0.4] });
  a.boite(second, { p: [0, y0 + 0.95, 2.35], e: [1.15, 0.09, 0.52] });
  a.boite(second, { p: [0, y0 + 0.78, 2.45], e: [1.05, 0.07, 0.32] });
  // les quatre roues, à l'air libre
  for (const sz of [-1.75, 1.9]) {
    for (const sx of [-1, 1]) {
      const r = sz > 0 ? 0.42 : 0.36;
      a.cylindre(0x1c1c22, {
        p: [sx * (0.72 + r * 0.3), y0 + r * 0.5, sz], r: [0, 0, Math.PI / 2],
        e: [r * 2, 0.42, r * 2], haut: 0.5, bas: 0.5, seg: 12,
      });
      a.cylindre(0x9aa0aa, {
        p: [sx * (0.72 + r * 0.3), y0 + r * 0.5, sz], r: [0, 0, Math.PI / 2],
        e: [r, 0.44, r], haut: 0.5, bas: 0.5, seg: 8,
      });
    }
  }
  return a.finir();
}

// Une voiture de la vraie vie, pas un empilement de cubes — Max, capture à
// l'appui : « je les veux pas en format minecraft mais en format de la vraie
// vie ». Sculptée à l'Atelier comme les rames : galbe des flancs, capot
// plongeant, pare-brise couché, montants fins, et de VRAIES vitres — on voit
// l'habitacle à travers. Deux membres : `caisse` porte tout ce qui se peint,
// son maillage fusionné reçoit un matériau à lui (userData.carrosserie, celui
// que la chaîne de la Giga-usine repeint) ; `tronc` porte le reste — roues,
// verre, optiques. Trois maillages par voiture, contre neuf à l'ancienne.
// Le profil de la caisse, vu de côté, en UNE courbe continue : nez rond,
// capot qui plonge, pare-brise couché, arche de toit, arrière fuyant. `sx`
// est l'AVANT vers le positif (l'extrusion retourne l'axe), `sy` la hauteur.
// Extrudé sur la largeur avec un chanfrein arrondi (bevel), il donne des
// flancs bombés — c'est le bevel qui fait les épaules de la voiture.
function profilCaisse() {
  // Le profil d'une hypersportive — l'expérience « réplique une Chiron »
  // demandée par Max : TRÈS basse (le toit culmine à ~1,29 pour 1,9 de
  // large), le nez émoussé et plongeant, le pare-brise profond qui part
  // loin en avant, l'arche courte au-dessus des sièges, la longue plage
  // moteur et le petit becquet de queue. Pas de logo, pas de nom : la
  // forme, rien que la forme.
  const s = new THREE.Shape();
  s.moveTo(1.7, 0.42);                                    // la lame avant, au ras du sol
  s.quadraticCurveTo(1.86, 0.56, 1.6, 0.7);               // le nez émoussé
  s.quadraticCurveTo(1.2, 0.84, 0.75, 0.88);              // le capot bas, l'aile qui monte
  s.quadraticCurveTo(0.35, 1.06, 0.02, 1.12);             // le pare-brise, profond
  s.quadraticCurveTo(-0.32, 1.18, -0.68, 1.06);           // l'arche courte du toit
  s.quadraticCurveTo(-1.1, 0.88, -1.42, 0.8);             // la plage moteur
  s.lineTo(-1.58, 0.78);                                  // le becquet de queue
  s.quadraticCurveTo(-1.72, 0.7, -1.62, 0.48);            // la poupe, pleine
  s.lineTo(1.7, 0.42);                                    // le dessous
  return s;
}

// La verrière : l'arc du profil entre le bas du pare-brise et la plage
// arrière, refermé par la ligne de ceinture. Extrudée un peu PLUS LARGE que
// la caisse, elle l'enveloppe d'une coque de verre fumé — c'est elle qui
// fait l'habitacle sombre et galbé de la vraie vie.
function profilVerriere() {
  const s = new THREE.Shape();
  s.moveTo(0.78, 0.86);                                   // le bas du pare-brise
  s.quadraticCurveTo(0.35, 1.08, 0.02, 1.14);
  s.quadraticCurveTo(-0.32, 1.21, -0.7, 1.08);
  s.quadraticCurveTo(-0.88, 0.98, -0.98, 0.9);            // la plage arrière
  s.lineTo(0.78, 0.86);                                   // la ligne de ceinture
  return s;
}

// Souder puis lisser : l'extrusion sort des normales À FACETTES — la coque
// était courbe mais éclairée comme un origami, et Max la voyait « cubique ».
// On indexe les sommets confondus et on remoyenne les normales : la lumière
// glisse alors d'une facette à l'autre, et le galbe devient continu.
function lisser(geo) {
  const p = geo.attributes.position;
  const vus = new Map();
  const index = [];
  for (let i = 0; i < p.count; i++) {
    const k = `${Math.round(p.getX(i) * 500)}|${Math.round(p.getY(i) * 500)}|${Math.round(p.getZ(i) * 500)}`;
    let j = vus.get(k);
    if (j === undefined) { j = i; vus.set(k, i); }
    index.push(j);
  }
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

function extruderProfil(shape, largeur, arrondi) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: largeur, curveSegments: 12,
    bevelEnabled: true, bevelThickness: arrondi, bevelSize: arrondi * 0.8,
    bevelSegments: 5,
  });
  geo.rotateY(Math.PI / 2);                               // la largeur suit x, l'avant part vers -z
  geo.translate(-largeur / 2, 0, 0);                      // centré sur l'axe
  return lisser(geo);
}

export function construireVoitureRoute(couleur = 0x9a9a9a) {
  const a = new Atelier();
  const BLANC = 0xffffff, NOIR = 0x14161a, SOMBRE = 0x26262c, ARGENT = 0xcfd4da;
  // tout ce qui se repeint est posé blanc : la teinte vient du matériau
  a.membre('caisse');
  a.geometrie(extruderProfil(profilCaisse(), 1.34, 0.3), BLANC, {});               // la coque, basse et large
  for (const sx of [-1, 1]) {
    a.boite(BLANC, { p: [sx * 0.95, 0.88, -0.45], e: [0.11, 0.05, 0.14] });        // rétroviseur
    // Les AILES BOMBÉES au-dessus des roues : les hanches de l'hypersportive.
    a.sphere(BLANC, { p: [sx * 0.78, 0.66, -1.25], e: [0.55, 0.34, 1.0], seg: 12 });
    a.sphere(BLANC, { p: [sx * 0.8, 0.68, 1.25], e: [0.58, 0.36, 1.05], seg: 12 });
  }
  // La verrière a son membre À ELLE : verre fumé quasi opaque, reflets du ciel.
  a.membre('verriere');
  a.geometrie(extruderProfil(profilVerriere(), 1.36, 0.3), 0xffffff, { p: [0, 0.02, 0] });
  a.membre('tronc');
  // La LIGNE EN C sur le flanc, qui sépare les deux tons comme sur la vraie.
  for (const sx of [-1, 1]) {
    const arc = new THREE.TorusGeometry(0.4, 0.05, 6, 18, Math.PI * 1.15);
    arc.rotateZ(Math.PI * 0.42);                          // l'ouverture regarde l'avant-haut
    arc.rotateY(Math.PI / 2);                             // dans le plan du flanc
    a.geometrie(arc, SOMBRE, { p: [sx * 0.92, 0.72, 0.1] });
  }
  // LA FACE AVANT — c'est elle qu'on regarde en premier sur la photo :
  // le fer à cheval VERTICAL, les quadruples phares dans leur bandeau
  // sombre, la grande bouche basse et la lame.
  a.sphere(NOIR, { p: [0, 0.58, -1.96], e: [0.4, 0.5, 0.26], seg: 12 });           // le fer à cheval
  a.boite(0x1a1e24, { p: [0, 0.4, -1.9], e: [1.34, 0.16, 0.16] });                 // la bouche basse
  a.boite(SOMBRE, { p: [0, 0.32, -1.92], e: [1.62, 0.08, 0.3] });                  // la lame avant
  a.boite(SOMBRE, { p: [0, 0.4, 1.82], e: [1.6, 0.2, 0.3] });                      // le diffuseur
  a.boite(0xd83a2a, { p: [0, 0.84, 1.88], e: [1.46, 0.06, 0.08] });                // la barre de feux
  // L'AILERON déployé : deux jambes, une lame.
  for (const sx of [-1, 1]) a.boite(SOMBRE, { p: [sx * 0.42, 0.92, 1.5], e: [0.07, 0.22, 0.16] });
  a.boite(SOMBRE, { p: [0, 1.05, 1.52], r: [0.14, 0, 0], e: [1.44, 0.05, 0.34] }); // la lame de l'aileron
  for (const sx of [-1, 1]) {
    a.boite(0x22262c, { p: [sx * 0.56, 0.74, -1.88], e: [0.38, 0.12, 0.1] });      // le bandeau de phare
    for (let k = 0; k < 4; k++) {
      a.boite(0xfff7d8, { p: [sx * (0.42 + k * 0.1), 0.74, -1.93], e: [0.055, 0.07, 0.05] }); // les 4 LED
    }
    a.cylindre(0x1c1c22, { p: [sx * 0.3, 0.46, 1.94], r: [Math.PI / 2, 0, 0],
      e: [0.14, 0.12, 0.14], seg: 8 });                                            // l'échappement
    // LA ROUE : pneu, fond de jante sombre, six rayons d'argent, moyeu —
    // un disque plein ne ressemble à rien de la vraie vie.
    for (const sz of [-1.25, 1.25]) {
      a.cylindre(0x141418, { p: [sx * 0.94, 0.4, sz], r: [0, 0, Math.PI / 2],
        e: [0.84, 0.28, 0.84], seg: 14 });                                         // le pneu
      a.cylindre(0x2e3236, { p: [sx * 0.95, 0.4, sz], r: [0, 0, Math.PI / 2],
        e: [0.6, 0.29, 0.6], seg: 12 });                                           // le fond de jante
      for (const th of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
        a.boite(ARGENT, { p: [sx * 0.97, 0.4, sz], r: [th, 0, 0], e: [0.05, 0.56, 0.09] }); // les rayons
      }
      a.cylindre(ARGENT, { p: [sx * 0.98, 0.4, sz], r: [0, 0, Math.PI / 2],
        e: [0.14, 0.3, 0.14], seg: 8 });                                           // le moyeu
    }
  }
  const g = a.finir();
  // LE BI-TON de la vraie : clair à l'avant, sombre à l'arrière, la coupure
  // suit la ligne en C. Peint dans les SOMMETS de la coque — le matériau
  // multiplie, donc la chaîne repeint toujours d'une seule teinte, déclinée.
  const mc = g.userData.membres.caisse.children[0];
  const pos = mc.geometry.attributes.position, col = mc.geometry.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getZ(i) + 0.2) / 0.55));
    // 0,65 devant, 0,065 derrière. Le 0,65 compense l'éclairage de la scène
    // (ambiant + soleil doublent presque la teinte : un rouge profond
    // ressortait rose layette) ; il vit ICI, dans les sommets, pour que la
    // peinture de la chaîne — qui refixe material.color — le garde. Et
    // l'arrière à un dixième : tout facteur plus doux se délavait en gris.
    const v = 0.65 * (1 - 0.9 * t * t * (3 - 2 * t));
    col.setXYZ(i, v, v, v);
  }
  col.needsUpdate = true;
  // Une peinture LAQUÉE : le spéculaire Phong fait glisser un reflet sur le
  // galbe — le passage de l'argile à la laque. PAS de carte d'environnement :
  // une CubeTexture de canvases cassait l'échantillonnage et blanchissait
  // toute la voiture, bi-ton compris — vérifié en bissection de matériaux.
  const rt = refletsVoiture();
  const peint = new THREE.MeshPhongMaterial({
    color: couleur, shininess: 80, specular: 0x8a9098, vertexColors: true,
    envMap: rt ? rt.texture : null, combine: THREE.MixOperation, reflectivity: 0.22,
  });
  mc.material = peint;
  g.userData.carrosserie = peint;
  g.userData.membres.verriere.children[0].material = new THREE.MeshPhongMaterial({
    color: 0x0e161f, shininess: 130, specular: 0xbbccdd,
    envMap: rt ? rt.texture : null, combine: THREE.MixOperation, reflectivity: 0.4,
    transparent: true, opacity: 0.78,
  });
  return g;
}

// Le bus de ville : long, haut, une bande de fenêtres continue — la
// silhouette qu'un enfant reconnaît avant même de lire « bus ». La teinte
// vient de la ville (rouge à Londres, jaune ailleurs…), stable par graine.
function construireBus(couleur = 0xd84a3a) {
  const g = new THREE.Group();
  const caisse = new THREE.MeshBasicMaterial({ color: couleur });
  const boite = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      mat instanceof THREE.Material ? mat : new THREE.MeshBasicMaterial({ color: mat }));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  boite(2.1, 1.5, 6.4, caisse, 0, 1.15, 0);                       // la caisse haute
  boite(2.12, 0.6, 5.9, 0x9fc8e8, 0, 1.55, 0);                    // la bande de fenêtres
  boite(2.0, 0.12, 6.4, 0xf0f0ea, 0, 1.96, 0);                    // le toit clair
  boite(1.9, 0.5, 0.15, 0x9fc8e8, 0, 1.1, -3.2);                  // le pare-brise
  boite(0.5, 1.1, 0.12, 0x2a2a30, 0.7, 0.9, 3.2);                 // la porte arrière
  for (const sz of [-2.2, 2.2]) {
    for (const sx of [-1, 1]) {
      const roue = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10),
        new THREE.MeshBasicMaterial({ color: 0x1c1c22 }));
      roue.rotation.z = Math.PI / 2;
      roue.position.set(sx * 1.0, 0.42, sz);
      g.add(roue);
    }
  }
  g.userData.carrosserie = caisse;
  return g;
}

// --- les convois -------------------------------------------------------------

class Convoi {
  constructor(scene, parcours, opts) {
    this.parcours = parcours;
    this.vitesse = opts.vitesse;
    this.distance = opts.depart || 0;
    this.ecart = opts.ecart ?? 8;
    this.nom = opts.nom || 'véhicule';
    this.emoji = opts.emoji || '🚗';
    // À quelle hauteur, au-dessus du tracé, on est assis dedans.
    this.assise = opts.assise ?? 1.2;
    // `freine` : la vitesse suit le tracé. Une rame de métro garde la sienne —
    // elle roule sur des rails — mais une monoplace ralentit en épingle et
    // relance en ligne droite. `allureMin` est la part de vitesse qu'il lui
    // reste dans le virage le plus serré.
    // À partir de quelle distance on cesse de le dessiner. Voir VU_SOUTERRAIN.
    this.vu = opts.vu ?? (opts.souterrain ? VU_SOUTERRAIN : VU);
    // La Jaune de Washington sort de terre pour franchir le Potomac sur son
    // pont : là, et là seulement, elle se voit de loin comme un convoi de
    // surface. `decouvert(p)` répond « ce point est-il à l'air libre ? » —
    // c'est main.js qui le branche, car lui seul connaît le monde.
    this.decouvert = opts.decouvert || null;
    this.freine = !!opts.freine;
    this.allureMin = opts.allureMin ?? 0.35;
    // UN VÉHICULE ROUTIER CÈDE LE PASSAGE ET S'INCLINE DANS LE VIRAGE (v244).
    // Un métro et un train roulent sur des rails : ils ne font ni l'un ni
    // l'autre. `routier` déclare la voiture, le bus, la monoplace.
    this.routier = !!opts.routier;
    // CHAQUE VOITURE CÈDE POUR ELLE-MÊME, ET LE CONVOI EST ÉLASTIQUE. Un convoi
    // n'a qu'une distance pour toutes ses voitures ; arrêter le convoi entier
    // laissait celle qui était déjà dans le carrefour en travers de la voie de
    // l'autre. `retard[i]` est ce que la voiture i a laissé filer en attendant :
    // elle reste sur place pendant que le convoi avance, puis rattrape à une
    // fois et demie l'allure. Celle qui suit fait la queue derrière elle.
    this.retard = new Float64Array(opts.nb);
    this.attend = new Uint8Array(opts.nb);       // ce tour-ci, quelqu'un est devant
    this.attenteDepuis = new Float32Array(opts.nb);
    this.repart = new Float32Array(opts.nb);     // secondes pendant lesquelles on n'attend plus
    // `relooke(mesh, distanceAbsolue, rang)` : appelé à chaque image sur
    // chaque élément visible. C'est lui qui peint les voitures de la chaîne
    // de la Giga-usine — grises avant le tunnel de peinture, colorées après.
    this.relooke = opts.relooke || null;
    this.vitesseActuelle = opts.vitesse;
    this.dernierDt = 0;
    // LES ARRÊTS. Un métro qui ne s'arrête jamais n'est pas un métro : il
    // traverse la station à huit mètres par seconde, la fenêtre pour monter
    // dure une seconde, et un enfant de sept ans la rate à tous les coups.
    // `arrets` donne les distances, le long du tracé, où la tête doit
    // s'immobiliser — et `pause` combien de temps les portes restent ouvertes.
    this.arrets = (opts.arrets || []).slice().sort((a, b) => a - b);
    this.pause = opts.pause ?? 5;
    this.attente = 0;
    // UN CONVOI NE FABRIQUE PAS CE QUE PERSONNE NE VOIT (v235).
    //
    // Il naissait avec ses vingt voitures d'un coup — et une voiture coûte
    // TRENTE-DEUX MAILLAGES (v201). Or un convoi ne se montre qu'à
    // quarante-cinq blocs : les huit circuits de Paris, instanciés quand
    // l'avion franchit leur rayon de deux cent vingt blocs, fabriquaient donc
    // cinq mille maillages que personne ne pouvait voir avant deux secondes
    // de vol. Mesuré au profil : **557 ms dans une seule image**, l'écran
    // figé — « il y a vraiment un lag », signalé par Max.
    //
    // Chaque place reste donc VIDE jusqu'à ce qu'elle entre dans le champ.
    // Rien ne change à l'écran : on fabrique au moment exact où l'on aurait
    // rendu le modèle visible. Et `place(i)` continue de répondre pour une
    // place vide, parce qu'elle se calcule sur le TRACÉ et jamais sur le
    // maillage — c'est ce qui permet de monter dans un convoi qu'on rejoint.
    this.scene = scene;
    this.nb = opts.nb;
    this.faireModele = opts.modele;
    this.elements = new Array(opts.nb).fill(null);
  }

  // La voiture numéro i, fabriquée si c'est la première fois qu'on la voit.
  element(i) {
    let m = this.elements[i];
    if (!m) {
      m = this.faireModele(i);
      m.visible = false;
      this.scene.add(m);
      this.elements[i] = m;
    }
    return m;
  }

  // Où se trouve la place assise de l'élément i, en ce moment même.
  //
  // C'est recalculé depuis le tracé, jamais lu sur le maillage : loin du
  // joueur les modèles sont cachés et leur position est périmée, alors que le
  // convoi, lui, continue de rouler. On peut donc demander « où est la rame ? »
  // même quand elle est à l'autre bout de la ville.
  // Où en est la voiture i le long du tracé : sa place dans le convoi, moins
  // ce qu'elle a laissé filer en cédant le passage.
  dElement(i) { return this.distance - i * this.ecart - (this.retard ? this.retard[i] : 0); }

  // La queue peut traîner plus loin que `ecart × (n − 1)` : de tout ce que ses
  // voitures ont laissé filer en cédant le passage.
  retardMax() {
    let m = 0;
    if (this.retard) for (let i = 0; i < this.retard.length; i++) if (this.retard[i] > m) m = this.retard[i];
    return m;
  }

  place(i, avance = 0) {
    const p = this.parcours.a(this.dElement(i) + avance);
    return { x: p.x, y: p.y + this.assise, z: p.z, cap: p.cap };
  }

  update(dt, joueur) {
    this.dernierDt = dt;
    if (this.attente > 0) {
      // à quai : on ne bouge pas, mais on continue de se montrer ou de se
      // cacher selon la distance au joueur
      this.attente -= dt;
      this.montrer(joueur);
      return;
    }
    const avantTout = this.distance;
    if (this.freine) {
      // Un demi-tour complet (π/2 sur vingt mètres) ramène à l'allure minimale ;
      // la ligne droite rend toute la vitesse. L'inertie — on ne rejoint la
      // consigne qu'à moitié par seconde — donne le freinage et la relance, et
      // c'est elle qu'on voit à l'œil, bien plus que le chiffre.
      const virage = this.parcours.virageDevant(this.distance);
      const vise = this.vitesse
        * Math.max(this.allureMin, 1 - (virage / (Math.PI / 3)) * (1 - this.allureMin));
      this.vitesseActuelle += (vise - this.vitesseActuelle) * Math.min(1, dt * 2.2);
      this.distance += this.vitesseActuelle * dt;
    } else {
      const avant = this.distance;
      this.distance += this.vitesse * dt;
      // Vient-on de franchir un arrêt ? Si oui, on s'y cale exactement — la
      // tête du convoi au droit du quai — et on ouvre les portes.
      const L = this.parcours.longueur;
      if (this.arrets.length && L > 0) {
        const d0 = ((avant % L) + L) % L, d1 = ((this.distance % L) + L) % L;
        // LE PIÈGE DES FLOTTANTS QUI GELAIT LE MÉTRO. Le recalage à quai pose
        // la rame une poignée d'ulps EN DEÇÀ de l'arrêt (l'addition-modulo
        // n'est pas exacte), et le double modulo de d0 en perd encore : au
        // redémarrage, l'arrêt paraissait toujours devant — refranchi,
        // re-pause, à l'infini. Toutes les rames de Washington gelaient une à
        // une en quelques minutes de jeu ; la première de chaque ligne dès la
        // vingt-deuxième image. La marge d'un millionième écarte ces
        // fantômes : un vrai franchissement avance d'au moins trois
        // centièmes de bloc (huit m/s au deux-cent-quarantième de seconde).
        const EPS = 1e-6;
        for (const a of this.arrets) {
          const franchi = d1 >= d0 ? (a > d0 + EPS && a <= d1) : (a > d0 + EPS || a <= d1);
          if (!franchi) continue;
          this.distance = avant + ((a - d0 + L) % L);
          this.attente = this.pause;
          break;
        }
      }
    }
    // Ce que le convoi vient d'avancer ; une voiture qui attend le laisse
    // filer, une voiture en retard le rattrape à une fois et demie l'allure.
    const pas = this.distance - avantTout;
    if (this.routier && pas > 0) {
      for (let i = 0; i < this.nb; i++) {
        if (this.attend[i]) this.retard[i] += pas;
        else if (this.retard[i] > 0) this.retard[i] = Math.max(0, this.retard[i] - pas * 0.5);
      }
    }
    this.montrer(joueur);
  }

  // Placer les voitures sur le tracé, ou les effacer si l'enfant est loin.
  //
  // LA PORTÉE SE TESTE VOITURE PAR VOITURE, PAS SUR LA TÊTE DU CONVOI.
  //
  // C'était le même défaut que les personnages avant la v196 — « cesser
  // d'ANIMER ne suffit pas, il faut cesser de DESSINER » — d'un cran plus
  // haut : on regardait si la TÊTE était à portée, et si oui on dessinait
  // les vingt voitures, y compris celles qui sont à l'autre bout d'une
  // boucle de quatre cent trente et un blocs. Un circuit de Paris coûtait
  // donc toutes ses voitures dès qu'on approchait d'un seul de ses points.
  //
  // Le test par convoi reste, mais comme PRÉ-FILTRE, élargi de la traînée :
  // la queue traîne d'au plus `ecart × (n − 1)` le long du tracé, et une
  // courbe est toujours plus longue que sa corde. C'est la même arithmétique
  // que `placeProche`, et elle garde le calcul bon marché pour les mille
  // circuits du monde.
  montrer(joueur) {
    const tete = this.parcours.a(this.distance);
    const portee = (this.decouvert && this.decouvert(tete)) ? VU : this.vu;
    const trainee = this.ecart * (this.nb - 1) + this.retardMax();
    if (Math.hypot(tete.x - joueur.x, tete.z - joueur.z) > portee + trainee) {
      for (const m of this.elements) if (m && m.visible) m.visible = false;
      return;
    }
    const portee2 = portee * portee;
    for (let i = 0; i < this.nb; i++) {
      const p = this.parcours.a(this.dElement(i));
      const dedans = (p.x - joueur.x) ** 2 + (p.z - joueur.z) ** 2 < portee2;
      // Hors du champ : on ne fabrique rien, et l'on cache ce qui existe déjà.
      if (!dedans) {
        const dejaLa = this.elements[i];
        if (dejaLa && dejaLa.visible) dejaLa.visible = false;
        continue;
      }
      const m = this.element(i);
      m.position.set(p.x, p.y, p.z);
      // Le modèle est dessiné le nez vers -z ; le cap donne la direction de la
      // marche, il faut donc le retourner d'un demi-tour. Le cap est celui de
      // l'empattement (v244) : la voiture pivote en franchissant le coin.
      const d = this.dElement(i);
      m.rotation.y = this.parcours.capLisse(d) + Math.PI;
      // l'allure de CETTE voiture : arrêtée si elle attend, pressée si elle rattrape
      const allure = this.routier && this.attend[i] ? 0 : (this.routier && this.retard[i] > 0 ? 1.5 : 1);
      if (this.routier) {
        // L'INCLINAISON DANS LE VIRAGE, purement visuelle (v244). Comme pour
        // l'avion (v231), elle se compose AVANT le cap — ordre YXZ — sinon la
        // voiture basculerait autour de l'axe du MONDE. Le corps d'une voiture
        // roule vers l'EXTÉRIEUR du virage, de ce que lui impose la force
        // centrifuge : vitesse au carré fois courbure, à l'échelle de ce qu'un
        // enfant voit — quatre degrés au pire coin, rien en ligne droite.
        // Le signe a été REGARDÉ sur capture, pas déduit.
        const v = this.vitesseActuelle * allure;
        const vise = Math.max(-0.08, Math.min(0.08, -this.parcours.courbure(d) * v * v * 0.012));
        const roulis = m.userData.roulis === undefined ? vise : m.userData.roulis + (vise - m.userData.roulis) * Math.min(1, this.dernierDt * 6);
        m.userData.roulis = roulis;
        m.rotation.order = 'YXZ';
        m.rotation.z = roulis;
      }
      m.visible = true;
      // LES ROUES TOURNENT AUSSI EN VILLE. Le long d'un tracé on connaît la
      // distance exacte parcourue depuis la dernière image : l'angle en
      // découle sans rien mesurer. Une voiture qui glisse sans que ses roues
      // tournent, un enfant de sept ans le voit au premier mètre.
      const roues = m.userData.roues;
      if (roues && roues.length) {
        const angle = (this.vitesseActuelle * allure * this.dernierDt) / (m.userData.rayonRoue || 0.34);
        for (const r of roues) r.rotation.x += angle;
      }
      if (this.relooke) {
        const L = this.parcours.longueur;
        this.relooke(m, ((d % L) + L) % L, i);
      }
    }
  }
}

export function createVehicules({ scene, player }) {
  const convois = [];

  function ajouter(points, opts) {
    const c = new Convoi(scene, new Parcours(points), opts);
    convois.push(c);
    return c;
  }

  // Deux rames sur le tour, à l'opposé l'une de l'autre : où qu'on soit sur la
  // ligne, il y en a toujours une qui arrive. C'est aussi ce qui fait qu'un
  // enfant n'attend jamais longtemps sur un quai.
  //
  // `opts` sert aux lignes nommées de Washington : chacune a sa couleur, son
  // nom sur le bouton d'embarquement, et une seule livrée — une ligne rouge
  // dont une rame sur deux serait jaune ne serait plus une ligne rouge.
  function metro(points, opts = {}) {
    const p = new Parcours(points);
    const nom = opts.nom || 'métro';
    const teintes = opts.teinte !== undefined
      ? [opts.teinte, opts.teinte] : [0x2a6ad8, 0xd8a02a];
    // Les arrêts sont donnés par leur RANG dans la liste de points, pas par une
    // distance : c'est le creusement du tunnel qui sait où sont les quais, et
    // lui compte en points de tracé. On convertit ici, une fois.
    const arrets = (opts.arretsIndex || []).map((i) => p.cumul[Math.min(i, p.cumul.length - 1)]);
    // COMBIEN DE RAMES ? Autant qu'il en faut pour qu'on n'attende pas.
    //
    // Deux suffisaient tant que le métro ne s'arrêtait jamais. Depuis qu'il
    // marque les stations, un tour complet de la ligne Bleue dure deux minutes
    // — treize arrêts dans chaque sens — et l'enfant restait une minute sur le
    // quai à ne rien voir venir. Trois rames ramènent l'attente sous la
    // demi-minute, ce qui est déjà l'intervalle du vrai métro aux heures
    // creuses.
    const rames = opts.rames ?? 2;
    for (let k = 0; k < rames; k++) {
      ajouter(points, {
        nb: opts.nb ?? 4, ecart: 7.6, vitesse: opts.vitesse ?? 7,
        depart: (k * p.longueur) / rames, nom, emoji: opts.emoji || '🚇', assise: 1.1,
        arrets, pause: opts.pause, souterrain: opts.souterrain, decouvert: opts.decouvert,
        modele: (i) => construireRame(i === 0, teintes[k % teintes.length]),
      });
    }
  }

  // Les monoplaces, décalées en file, chacune à sa vitesse : le peloton
  // s'étire et se regroupe tout seul, ce qui rend la course vivante.
  function course(points, nb = 6) {
    const p = new Parcours(points);
    const teintes = [
      [0xd82a2a, 0xf0f0ea], [0x1a3aa8, 0xf0d030], [0xf07a10, 0x1a1a20],
      [0x0aa06a, 0xf0f0ea], [0xe0e4ea, 0xd82a2a], [0x6a2ad8, 0xf0d030],
    ];
    for (let i = 0; i < nb; i++) {
      const [c1, c2] = teintes[i % teintes.length];
      ajouter(points, {
        nb: 1, vitesse: 17 + (i % 3) * 1.6, depart: -i * (p.longueur / nb) * 0.55,
        nom: 'formule 1', emoji: '🏎️', assise: 0.75, freine: true, allureMin: 0.2, routier: true,
        modele: () => construireF1(c1, c2),
      });
    }
  }

  // La chaîne de la Giga-usine : les voitures avancent de poste en poste,
  // marquent l'arrêt à chacun — le temps qu'un robot soude, qu'une buse
  // peigne — puis sortent faire le tour du parc avant de revenir. Grises
  // avant le tunnel de peinture, colorées après : `peinture` donne la
  // fenêtre en distance, et chaque voiture garde SA teinte, stable de tour
  // en tour.
  function chaine(trace, opts = {}) {
    const p = new Parcours(trace.pts);
    const arrets = (trace.arretsIndex || []).map((i) => p.cumul[Math.min(i, p.cumul.length - 1)]);
    const teintes = [0xd82a2a, 0x2a6ad8, 0xf0f0ea, 0x3a9a4a, 0x58b8e8, 0xe8c83a];
    const fen = opts.peinture || trace.peinture || null;
    return ajouter(trace.pts, {
      nb: opts.nb ?? 8, ecart: opts.ecart ?? 16, vitesse: opts.vitesse ?? 4.5,
      nom: 'voiture de la chaîne', emoji: '🚗', assise: 1.15,
      arrets, pause: opts.pause ?? 5,
      modele: () => construireVoitureRoute(),
      relooke: fen ? (m, d, i) => {
        const peinte = d > fen.sortie && d < fen.retour;
        m.userData.carrosserie.color.set(peinte ? teintes[i % teintes.length] : 0x9a9a9a);
      } : null,
    });
  }

  // UNE VOITURE DE VILLE. La coque sculptée est posée tout de suite — il faut
  // un maillage dans la seconde — puis le vrai modèle de la flotte la
  // remplace dès qu'il arrive du réseau. C'est le même échange qu'aux
  // montures, à un détail près : ici on garde une trace des pivots de roue,
  // parce que c'est le convoi qui les fait tourner.
  function voitureDeVille(n, teinte, ville) {
    const g = construireVoitureRoute(teinte);
    const choix = FLOTTE.filter(e=>ville==='ny'?e.ville==='ny':e.ville!=='ny');
    const entree = ville !== 'ny' && n % 4 === 0 ? FLOTTE.find(e=>e.fichier==='berline-citadine') : choix[((n % choix.length) + choix.length) % choix.length];
    // Elle retient QUEL modèle elle est. Sans cela, un enfant qui prend le
    // volant d'une Bugatti croisée dans la rue repartirait au hasard de la
    // flotte — c'est le même soin que pour la voiture garée.
    g.userData.flotte = entree.fichier;
    g.userData.nomVoiture = entree.nom;
    const chargement = chargerVoitureFlotte(entree);
    if (chargement) {
      chargement.then((proto) => {
        if (!proto || !g.userData.membres) return;
        for (const nom of ['caisse', 'verriere', 'tronc']) {
          const membre = g.userData.membres[nom];
          if (membre) g.remove(membre);
        }
        const modele = proto.clone(true);
        if(entree.fichier==='berline-citadine')modele.traverse(o=>{
          if(o.isMesh&&o.material.name==='Paint_NYC'){
            o.material=o.material.clone();o.material.userData.partagee=false;o.material.color.set(teinte);
          }
        });
        g.add(modele);
        const roues = [];
        modele.traverse((o) => { if (/^Wheel_/i.test(o.name || '')) roues.push(o); });
        g.userData.roues = roues;
        g.userData.rayonRoue = proto.userData.rayonRoue || 0.34;
      });
    }
    return g;
  }

  // LA CIRCULATION D'UNE VILLE. Verdict de Max, capture de Moscou de nuit à
  // l'appui : « les villes sont toujours désespérément vides, rajoute les
  // flottes de voitures qui circulent ». Il avait raison, et le chiffre le
  // dit : TROIS voitures espacées d'un tiers de tour, sur un anneau de deux
  // cents blocs, c'est une voiture tous les soixante-six blocs — on peut
  // traverser la ville sans en croiser une seule.
  //
  // Désormais une voiture tous les vingt-cinq blocs, chacune un modèle
  // différent de la flotte, à quatorze au plus par anneau : au-delà, une
  // tablette qui dessine déjà une ville entière commence à ramer. Et on ne
  // les dessine qu'à cent dix blocs — en ville, les immeubles cachent tout
  // ce qui est plus loin, il n'y a rien à gagner à les rendre.
  // LE CODE ET SON PROPRE COMMENTAIRE NE DISAIENT PAS LA MÊME CHOSE. Celui du
  // dessus promettait « une voiture tous les vingt-cinq blocs, à quatorze au
  // plus » ; le code calculait `min(10, longueur / 28)` — une tous les
  // trente-quatre. Sur les 431 blocs du plus grand circuit de Paris, cela fait
  // dix voitures pour toute la rive droite.
  //
  // Désormais une tous les DIX-HUIT blocs, vingt au plus par circuit. Le prix
  // se paie en appels de dessin, et il est mesuré : voir la note de main.js
  // sur les cent quarante voitures de Paris.
  const TEINTES = [
    0xd84a3a, 0x3a6ac8, 0xf0f0ea, 0x2a2a30, 0x3a9a4a, 0xe8c83a,   // les six d'origine
    // ET DOUZE DE PLUS, parce qu'un modèle de la flotte met une seconde ou
    // deux à arriver du réseau : jusque-là c'est la coque d'attente qu'on
    // voit, et six teintes pour cent quarante voitures donnaient six
    // voitures identiques par carrefour. La teinte, elle, est là tout de
    // suite.
    0x8a2b3a, 0x2f7f8f, 0xc86a2a, 0x5a4a8a, 0x1f4a2f, 0xb0b4bc,
    0x7a1f1f, 0x2a3f7a, 0xd8a83a, 0x3f7a5a, 0x6a2f6a, 0x8a8a6a,
  ];
  function circulation(pts, graine = 0, options = {}) {
    const p = new Parcours(pts);
    const nb = Math.max(6, Math.min(20, Math.round(p.longueur / 18)));
    return ajouter(pts, {
      nb, ecart: p.longueur / nb, vitesse: 4.2, freine: true, allureMin: 0.4, routier: true,
      // QUARANTE-CINQ BLOCS, ET C'EST UNE MESURE, PAS UNE INTUITION. Une
      // voiture coûte TRENTE-DEUX MAILLAGES — trois fois un personnage, et
      // personne ne l'avait jamais compté. À cent dix blocs de portée, les
      // quatre-vingt-quinze voitures de Paris en faisaient dessiner
      // quatre-vingt-neuf : deux mille neuf cents maillages pour la seule
      // circulation, et le compteur d'appels passait de 537 à 1 018. C'est
      // exactement ce que la v196 avait gagné, rendu d'un coup.
      //
      // Or un bloc de ville vaut ici trente à quarante mètres : une voiture à
      // cent dix blocs est à quatre kilomètres, et les immeubles la cachent
      // depuis longtemps. Les personnages s'effacent à soixante-deux blocs
      // depuis des versions sans que personne ne l'ait jamais signalé ; une
      // voiture, plus petite et plus basse, tient largement à quarante-cinq.
      nom: 'voiture', emoji: '🚙', assise: 1.15, vu: 45,
      // LE PAS DE 13 SUR UNE FLOTTE DE 50 REVIENT SUR SES PAS AU BOUT DE
      // CINQUANTE : `13 × 50 ≡ 0`. Avec vingt voitures par circuit c'était
      // encore sans conséquence ; il vaut mieux un pas PREMIER avec la taille
      // de la flotte, et 17 l'est aussi de cinquante-deux — cinquante-deux
      // modèles différents.
      modele: (i) => voitureDeVille(graine * 7 + i * 17, TEINTES[(graine + i) % TEINTES.length],options.ville),
    });
  }

  // Le bus de la ville : un seul par anneau, plus lent que les voitures, et
  // qui marque quatre arrêts par tour — assez pour qu'un enfant le prenne
  // (« Monter à bord » le voit comme n'importe quel convoi). Max : « much
  // more life in cities, cars, buses… »
  function bus(pts, graine = 0) {
    const p = new Parcours(pts);
    const teintes = [0xd84a3a, 0xe8c83a, 0x3a9a4a, 0x3a6ac8, 0xf0813a];
    const arrets = [0.12, 0.37, 0.62, 0.87].map((f) => p.longueur * f);
    // Pas de `freine` : les arrêts ne vivent que dans la marche à vitesse
    // constante (c'est le mécanisme du métro), et un bus qui ne s'arrête
    // jamais n'est pas un bus.
    return ajouter(pts, {
      nb: 1, vitesse: 5, routier: true,
      nom: 'bus', emoji: '🚌', assise: 1.7,
      arrets, pause: 2,
      modele: () => construireBus(teintes[graine % teintes.length]),
    });
  }

  // QUI CÈDE LE PASSAGE À QUI (v244). Max : « évite que les voitures puissent
  // se chevaucher ». Mesuré à Paris, trente secondes : soixante-quinze relevés
  // de paires de voitures à moins de 3,5 blocs, la pire à 1,38 — l'une dans
  // l'autre, là où deux circuits se croisent, en équerre ou en biais, et sur
  // les tronçons qu'ils partagent.
  //
  // TROIS JETS AVANT CELUI-CI, et chacun a coûté une mesure. Arrêter le CONVOI
  // entier laissait celle qui était déjà dans le carrefour en travers de
  // l'autre voie (75 → 65). Un couloir « devant moi » de six blocs ratait la
  // voiture qui arrive de trois quarts — les deux circuits de la rue de Rivoli
  // se coupent à cent soixante degrés, pas cent quatre-vingts (65 → 61). Et
  // départager une paire mutuelle par le rang de convoi faisait passer la
  // voiture de derrière AU TRAVERS de celle qui attendait devant elle.
  //
  // D'où ceci. Une voiture regarde où SON tracé la mène dans les cinq blocs qui
  // viennent, et demande si son rectangle (4,4 × 2,26) y toucherait celui d'une
  // autre voiture, de son convoi ou d'un autre. Si oui, elle attend — elle
  // seule : le convoi est élastique (`retard`), celles qui suivent font la
  // queue derrière elle. Dans une paire mutuelle, LA PLUS ENGAGÉE PASSE : celle
  // que l'autre voit le plus loin devant elle. Et l'on n'attend jamais plus de
  // quatre secondes d'affilée : à trois, on finit par y aller.
  //
  // Seules les voitures à portée de l'enfant se regardent : ce qui se
  // chevauche hors de vue ne coûte à personne, et mille circuits n'ont pas à
  // se comparer à chaque image.
  const PORTEE_CEDE = 90, DEMI_LONG = 2.2, DEMI_LARG = 1.13, PAS_BALAYAGE = [0.5, 2, 3.5, 5, 6.5, 8];
  const rectangle = (x, z, ux, uz) => {
    const vx = uz, vz = -ux;
    return [
      [x + ux * DEMI_LONG + vx * DEMI_LARG, z + uz * DEMI_LONG + vz * DEMI_LARG],
      [x + ux * DEMI_LONG - vx * DEMI_LARG, z + uz * DEMI_LONG - vz * DEMI_LARG],
      [x - ux * DEMI_LONG - vx * DEMI_LARG, z - uz * DEMI_LONG - vz * DEMI_LARG],
      [x - ux * DEMI_LONG + vx * DEMI_LARG, z - uz * DEMI_LONG + vz * DEMI_LARG],
    ];
  };
  // Deux rectangles se touchent-ils ? Séparation d'axes : les quatre arêtes de
  // chacun servent d'axe ; s'il en est un où les projections ne se recouvrent
  // pas, ils sont disjoints.
  const seTouchent = (P, Q) => {
    for (const R of [P, Q]) {
      for (let k = 0; k < 4; k++) {
        const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0];
        let p0 = Infinity, p1 = -Infinity, q0 = Infinity, q1 = -Infinity;
        for (let j = 0; j < 4; j++) {
          const p = P[j][0] * ax + P[j][1] * az, q = Q[j][0] * ax + Q[j][1] * az;
          if (p < p0) p0 = p; if (p > p1) p1 = p; if (q < q0) q0 = q; if (q > q1) q1 = q;
        }
        if (p1 < q0 || q1 < p0) return false;
      }
    }
    return true;
  };
  function cederLePassage(dt) {
    const px = player.pos.x, pz = player.pos.z;
    const voitures = [];
    for (let ci = 0; ci < convois.length; ci++) {
      const c = convois[ci];
      if (!c.routier) continue;
      const tete = c.parcours.a(c.distance);
      const trainee = c.ecart * (c.nb - 1) + c.retardMax();
      if (Math.hypot(tete.x - px, tete.z - pz) > PORTEE_CEDE + trainee) { c.attend.fill(0); continue; }
      for (let i = 0; i < c.nb; i++) {
        const d = c.dElement(i);
        const q = c.parcours.a(d);
        if ((q.x - px) ** 2 + (q.z - pz) ** 2 > PORTEE_CEDE * PORTEE_CEDE) { c.attend[i] = 0; continue; }
        const cap = c.parcours.capLisse(d), ux = Math.sin(cap), uz = Math.cos(cap);
        voitures.push({ c, ci, i, cle: ci * 1000 + i, d, x: q.x, y: q.y, z: q.z, ux, uz,
          rect: rectangle(q.x, q.z, ux, uz), balayage: null, veut: null });
      }
    }
    // le balayage de chaque voiture : ses rectangles un peu plus loin sur son tracé
    for (const a of voitures) {
      a.balayage = PAS_BALAYAGE.map((pas) => {
        const q = a.c.parcours.a(a.d + pas), cap = a.c.parcours.capLisse(a.d + pas);
        return rectangle(q.x, q.z, Math.sin(cap), Math.cos(cap));
      });
    }
    for (const a of voitures) {
      for (const b of voitures) {
        if (a === b || Math.abs(a.y - b.y) > 2.5) continue;
        const ex = b.x - a.x, ez = b.z - a.z;
        if (ex * ex + ez * ez > 12 * 12) continue;
        if (ex * a.ux + ez * a.uz < -DEMI_LONG) continue;          // derrière moi : pas mon affaire
        // Là où elle EST, pas là où elle sera : comparer les deux chemins des
        // huit prochains blocs mettait presque toutes les paires en conflit
        // mutuel, et la patience de quatre secondes les relâchait ensemble —
        // 17 → 77, mesuré. Le reliquat (dix-sept relevés sur trente secondes,
        // un raccord à cent soixante degrés entre deux circuits de Rivoli) est
        // une affaire de tracé, déclarée dans TASKS.md.
        let gene = false;
        for (const R of a.balayage) if (seTouchent(R, b.rect)) { gene = true; break; }
        if (gene) (a.veut || (a.veut = new Map())).set(b.cle, ex * a.ux + ez * a.uz);
      }
    }
    const parCle = new Map(voitures.map((v) => [v.cle, v]));
    for (const a of voitures) {
      let attend = false;
      if (a.veut) {
        for (const [cle, devantMoi] of a.veut) {
          const b = parCle.get(cle);
          if (b && b.veut && b.veut.has(a.cle)) {
            // paire mutuelle : la plus engagée passe — celle que l'autre voit le
            // plus loin devant elle ; à égalité, la plus petite
            const devantLui = b.veut.get(a.cle);
            if (devantLui > devantMoi || (devantLui === devantMoi && a.cle < cle)) continue;
          }
          attend = true; break;
        }
      }
      const c = a.c, i = a.i;
      if (c.repart[i] > 0) { c.repart[i] -= dt; attend = false; }          // on vient de décider d'y aller
      else if (attend) {
        c.attenteDepuis[i] += dt;
        if (c.attenteDepuis[i] > 4) { attend = false; c.repart[i] = 2; c.attenteDepuis[i] = 0; }
      } else c.attenteDepuis[i] = 0;
      c.attend[i] = attend ? 1 : 0;
    }
  }

  function update(dt) {
    cederLePassage(dt);
    for (const c of convois) c.update(dt, player.pos);
  }

  // La place libre la plus proche d'un point donné : c'est elle qui décide si
  // le bouton « monter à bord » apparaît. On compare en trois dimensions —
  // le métro passe au-dessus des rues, et on ne monte pas dedans depuis le
  // trottoir six mètres plus bas.
  // LE RAYON D'EMBARQUEMENT. Max : « assure-toi que l'on peut monter dans
  // n'importe quel véhicule en déplacement dans les villes. » Le code pour
  // conduire marchait ; c'était ATTRAPER qui ne marchait pas. Cinq blocs
  // autour d'une voiture à 4,2 m/s, c'est une fenêtre d'une seconde — un
  // enfant de sept ans la rate à tous les coups, et il croit que le jeu ne
  // veut pas de lui. Neuf blocs lui laissent deux secondes, et l'on choisit
  // toujours la PLUS PROCHE : on ne monte pas dans une voiture d'en face.
  function placeProche(pos, rayon = 4) {
    let meilleur = null, meilleureD = rayon;
    convois.forEach((c, ci) => {
      // UN SEUL TEST AVANT D'ENTRER DANS LES WAGONS.
      //
      // Cette fonction est appelée à chaque image, pour tous les convois du
      // jeu. Avec les quatre lignes de Washington, cela faisait quatre-vingts
      // positions recalculées par image — dont soixante-dix-huit à l'autre bout
      // du monde. La queue du convoi traîne derrière la tête d'au plus
      // `ecart × (wagons − 1)` le long du tracé, et une courbe est toujours plus
      // longue que sa corde : si la tête est plus loin que ça plus le rayon,
      // aucun wagon ne peut être à portée.
      const tete = c.place(0);
      const trainee = c.ecart * (c.elements.length - 1) + c.retardMax();
      if (Math.hypot(tete.x - pos.x, tete.z - pos.z) > rayon + trainee) return;
      c.elements.forEach((m, i) => {
        const p = c.place(i);
        const d = Math.hypot(p.x - pos.x, p.z - pos.z);
        if (d > meilleureD || Math.abs(p.y - pos.y) > 2.5) return;
        meilleureD = d;
        meilleur = { id: `${ci}:${i}`, nom: c.nom, emoji: c.emoji, d, x: p.x, y: p.y, z: p.z, cap: p.cap };
      });
    });
    return meilleur;
  }

  // PRENDRE LE VOLANT D'UNE VOITURE QU'ON VOIT PASSER.
  //
  // Max : « je veux que l'on puisse conduire n'importe quel type de voiture
  // dans le jeu. » Jusqu'ici, monter dans une voiture de ville, c'était s'y
  // laisser PORTER : le convoi suit son tracé, l'enfant est collé au siège.
  // Ce qu'il demande, c'est de la conduire.
  //
  // On la sort donc du convoi et on la rend à l'appelant, qui en fera une
  // monture — le mode qui sait déjà conduire. La circulation perd une voiture,
  // et c'est honnête : l'enfant vient de la prendre. Le modèle part avec elle,
  // sinon il monterait dans une autre voiture que celle qu'il a vue.
  function emprunter(id) {
    const [ci, i] = String(id).split(':').map(Number);
    const c = convois[ci];
    if (!c || !c.elements[i]) return null;
    const p = c.place(i);
    const mesh = c.elements[i];
    const flotte = mesh.userData ? mesh.userData.flotte : null;
    const nom = mesh.userData ? mesh.userData.nomVoiture : null;
    scene.remove(mesh);
    c.elements.splice(i, 1);
    // ET LE COMPTE SUIT LA PLACE RETIRÉE (v235). Depuis que les voitures
    // naissent à la demande, `nb` dit combien de places le convoi a ; sans
    // cette ligne il en resterait une de trop, et le convoi se fabriquerait
    // une voiture neuve pour remplacer celle que l'enfant vient de prendre.
    // La circulation perd une voiture, et c'est honnête : il vient de la
    // prendre (v194).
    c.nb = c.elements.length;
    // Un convoi vidé de tous ses éléments n'a plus rien à animer ; on le
    // laisse en place, `place()` rendra null et l'appelant descendra proprement.
    return { x: p.x, y: p.y, z: p.z, cap: p.cap, flotte, nom };
  }

  // Où en est la place qu'on occupe. Renvoie null si le convoi a disparu —
  // c'est ce qui fait redescendre proprement plutôt que de rester accroché
  // à un fantôme.
  function place(id) {
    const [ci, i] = String(id).split(':').map(Number);
    const c = convois[ci];
    if (!c || !c.elements[i]) return null;
    return c.place(i);
  }

  return {
    metro, course, chaine, circulation, bus, update, placeProche, place, emprunter,
    // pour les tests : un point du tracé, en avant de la tête du convoi, là
    // où l'on peut aller attendre son passage
    point: (ci, avance = 0) => (convois[ci] ? convois[ci].place(0, avance) : null),
    // pour les tests : où en est chaque convoi, et combien sont affichés
    // `nom` et `y` s'ajoutent au reste : sans eux, un test ne peut pas dire DE
    // QUEL convoi il parle ni à quelle hauteur il roule — c'est précisément ce
    // qu'il fallait pour prouver que le métro est passé sous terre.
    etat: () => convois.map((c) => ({
      nom: c.nom,
      // La LONGUEUR du tour, et le nombre d'arrêts marqués. C'est ce qui
      // permet à un témoin de dire combien de temps un enfant attend sur un
      // quai — et de le dire sur l'ANCIEN code comme sur le neuf, puisque la
      // géométrie d'une voie ne dépend pas du nom qu'on donne au train.
      longueur: Math.round(c.parcours.longueur),
      nbArrets: c.arrets.length,
      y: Math.round((c.elements[0] ? c.elements[0].position.y : 0) * 10) / 10,
      vitesse: Math.round((c.freine ? c.vitesseActuelle : c.vitesse) * 10) / 10,
      distance: Math.round(c.distance),
      attente: Math.round((c.attente || 0) * 10) / 10,
      // Une place encore VIDE (v235) n'est ni visible ni peinte : depuis que
      // les voitures naissent à la demande, `elements` porte des trous.
      visibles: c.elements.filter((m) => m && m.visible).length,
      total: c.elements.length,
      // Où sont les voitures visibles, et vers où elles vont (v244) : c'est ce
      // qui permet à une sonde de dire QUI chevauche QUI — même convoi, ou deux.
      places: c.elements.map((m, i) => (m && m.visible
        ? [Math.round(m.position.x * 10) / 10, Math.round(m.position.z * 10) / 10, Math.round((m.rotation.y - Math.PI) * 100) / 100, i,
          c.retard ? Math.round(c.retard[i]) : 0, c.attend ? c.attend[i] : 0]
        : null)).filter(Boolean),
      retards: c.retard ? Array.from(c.retard).map((r) => Math.round(r)) : [],
      attendent: c.attend ? Array.from(c.attend).filter(Boolean).length : 0, routier: !!c.routier,
      // les teintes de carrosserie des éléments visibles — la preuve, pour un
      // témoin, que la peinture de la Giga-usine opère : du gris AVANT le
      // tunnel, des couleurs APRÈS, dans le même convoi au même instant
      couleurs: c.elements.filter((m) => m && m.visible && m.userData.carrosserie)
        .map((m) => m.userData.carrosserie.color.getHex()),
    })),
  };
}
