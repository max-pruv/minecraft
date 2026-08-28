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
import { Atelier } from './modeles.js';

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

// Une voiture de route, celle qui naît sur la chaîne de la Giga-usine : la
// caisse, l'habitacle vitré, quatre roues. La carrosserie garde son matériau
// sous la main (userData.carrosserie) pour que la peinture puisse opérer —
// c'est la seule voiture du jeu qui change de couleur en roulant.
function construireVoitureRoute(couleur = 0x9a9a9a) {
  const g = new THREE.Group();
  const caisse = new THREE.MeshBasicMaterial({ color: couleur });
  const boite = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      mat instanceof THREE.Material ? mat : new THREE.MeshBasicMaterial({ color: mat }));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  boite(1.7, 0.5, 3.6, caisse, 0, 0.62, 0);                       // la caisse
  boite(1.4, 0.55, 1.8, caisse, 0, 1.12, 0.15);                   // le pavillon
  boite(1.32, 0.42, 1.9, 0x18242e, 0, 1.14, 0.14);                // les vitres, teintées
  boite(1.5, 0.16, 0.5, 0xf0f0ea, 0, 0.5, -1.72);                 // le bouclier avant
  boite(1.5, 0.16, 0.4, 0x2a2a30, 0, 0.5, 1.75);                  // l'arrière
  for (const sz of [-1.15, 1.2]) {
    for (const sx of [-1, 1]) {
      const roue = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10),
        new THREE.MeshBasicMaterial({ color: 0x1c1c22 }));
      roue.rotation.z = Math.PI / 2;
      roue.position.set(sx * 0.82, 0.36, sz);
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
    this.vu = opts.souterrain ? VU_SOUTERRAIN : VU;
    // La Jaune de Washington sort de terre pour franchir le Potomac sur son
    // pont : là, et là seulement, elle se voit de loin comme un convoi de
    // surface. `decouvert(p)` répond « ce point est-il à l'air libre ? » —
    // c'est main.js qui le branche, car lui seul connaît le monde.
    this.decouvert = opts.decouvert || null;
    this.freine = !!opts.freine;
    this.allureMin = opts.allureMin ?? 0.35;
    // `relooke(mesh, distanceAbsolue, rang)` : appelé à chaque image sur
    // chaque élément visible. C'est lui qui peint les voitures de la chaîne
    // de la Giga-usine — grises avant le tunnel de peinture, colorées après.
    this.relooke = opts.relooke || null;
    this.vitesseActuelle = opts.vitesse;
    // LES ARRÊTS. Un métro qui ne s'arrête jamais n'est pas un métro : il
    // traverse la station à huit mètres par seconde, la fenêtre pour monter
    // dure une seconde, et un enfant de sept ans la rate à tous les coups.
    // `arrets` donne les distances, le long du tracé, où la tête doit
    // s'immobiliser — et `pause` combien de temps les portes restent ouvertes.
    this.arrets = (opts.arrets || []).slice().sort((a, b) => a - b);
    this.pause = opts.pause ?? 5;
    this.attente = 0;
    this.elements = [];
    for (let i = 0; i < opts.nb; i++) {
      const m = opts.modele(i);
      m.visible = false;
      scene.add(m);
      this.elements.push(m);
    }
  }

  // Où se trouve la place assise de l'élément i, en ce moment même.
  //
  // C'est recalculé depuis le tracé, jamais lu sur le maillage : loin du
  // joueur les modèles sont cachés et leur position est périmée, alors que le
  // convoi, lui, continue de rouler. On peut donc demander « où est la rame ? »
  // même quand elle est à l'autre bout de la ville.
  place(i, avance = 0) {
    const p = this.parcours.a(this.distance + avance - i * this.ecart);
    return { x: p.x, y: p.y + this.assise, z: p.z, cap: p.cap };
  }

  update(dt, joueur) {
    if (this.attente > 0) {
      // à quai : on ne bouge pas, mais on continue de se montrer ou de se
      // cacher selon la distance au joueur
      this.attente -= dt;
      this.montrer(joueur);
      return;
    }
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
        for (const a of this.arrets) {
          const franchi = d1 >= d0 ? (a > d0 && a <= d1) : (a > d0 || a <= d1);
          if (!franchi) continue;
          this.distance = avant + ((a - d0 + L) % L);
          this.attente = this.pause;
          break;
        }
      }
    }
    this.montrer(joueur);
  }

  // Placer les voitures sur le tracé, ou les effacer si l'enfant est loin.
  montrer(joueur) {
    const tete = this.parcours.a(this.distance);
    const portee = (this.decouvert && this.decouvert(tete)) ? VU : this.vu;
    const proche = Math.hypot(tete.x - joueur.x, tete.z - joueur.z) < portee;
    if (!proche) {
      if (this.elements[0].visible) for (const m of this.elements) m.visible = false;
      return;
    }
    this.elements.forEach((m, i) => {
      const p = this.parcours.a(this.distance - i * this.ecart);
      m.position.set(p.x, p.y, p.z);
      // Le modèle est dessiné le nez vers -z ; le cap donne la direction de la
      // marche, il faut donc le retourner d'un demi-tour.
      m.rotation.y = p.cap + Math.PI;
      m.visible = true;
      if (this.relooke) {
        const L = this.parcours.longueur;
        this.relooke(m, (((this.distance - i * this.ecart) % L) + L) % L, i);
      }
    });
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
        nom: 'formule 1', emoji: '🏎️', assise: 0.75, freine: true, allureMin: 0.2,
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

  // La circulation d'une ville : trois voitures sur l'anneau de ses rues,
  // espacées d'un tiers de tour, qui freinent dans les virages. Chacune sa
  // couleur, stable — la voiture bleue de Rome est toujours la bleue.
  function circulation(pts, graine = 0) {
    const p = new Parcours(pts);
    const teintes = [0xd84a3a, 0x3a6ac8, 0xf0f0ea, 0x2a2a30, 0x3a9a4a, 0xe8c83a];
    return ajouter(pts, {
      nb: 3, ecart: p.longueur / 3, vitesse: 4.2, freine: true, allureMin: 0.4,
      nom: 'voiture', emoji: '🚙', assise: 1.15,
      modele: (i) => construireVoitureRoute(teintes[(graine + i) % teintes.length]),
    });
  }

  function update(dt) {
    for (const c of convois) c.update(dt, player.pos);
  }

  // La place libre la plus proche d'un point donné : c'est elle qui décide si
  // le bouton « monter à bord » apparaît. On compare en trois dimensions —
  // le métro passe au-dessus des rues, et on ne monte pas dedans depuis le
  // trottoir six mètres plus bas.
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
      const trainee = c.ecart * (c.elements.length - 1);
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
    metro, course, chaine, circulation, update, placeProche, place,
    // pour les tests : un point du tracé, en avant de la tête du convoi, là
    // où l'on peut aller attendre son passage
    point: (ci, avance = 0) => (convois[ci] ? convois[ci].place(0, avance) : null),
    // pour les tests : où en est chaque convoi, et combien sont affichés
    // `nom` et `y` s'ajoutent au reste : sans eux, un test ne peut pas dire DE
    // QUEL convoi il parle ni à quelle hauteur il roule — c'est précisément ce
    // qu'il fallait pour prouver que le métro est passé sous terre.
    etat: () => convois.map((c) => ({
      nom: c.nom,
      y: Math.round((c.elements[0] ? c.elements[0].position.y : 0) * 10) / 10,
      vitesse: Math.round((c.freine ? c.vitesseActuelle : c.vitesse) * 10) / 10,
      distance: Math.round(c.distance),
      visibles: c.elements.filter((m) => m.visible).length,
      total: c.elements.length,
      // les teintes de carrosserie des éléments visibles — la preuve, pour un
      // témoin, que la peinture de la Giga-usine opère : du gris AVANT le
      // tunnel, des couleurs APRÈS, dans le même convoi au même instant
      couleurs: c.elements.filter((m) => m.visible && m.userData.carrosserie)
        .map((m) => m.userData.carrosserie.color.getHex()),
    })),
  };
}
