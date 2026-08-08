// La vie autour des deux châteaux.
//
// D'un côté la forteresse du XIIIᵉ : sa garnison, sa forge, ses écuries, sa
// basse-cour, ses manants. De l'autre Villandry au XVIᵉ : ses jardiniers, sa
// maison, ses paons. Chaque métier a sa tenue, son outil, son poste de travail
// et son geste — le forgeron frappe l'enclume, le jardinier ratisse, le
// ménestrel gratte son luth.
//
// Rien de tout cela ne tourne quand l'enfant est ailleurs : les deux sites sont
// à cent quarante blocs l'un de l'autre, et chacun s'endort — animation et
// affichage — dès qu'on s'en éloigne. C'est ce qui permet d'en mettre autant
// sans que la tablette souffre.

import * as THREE from 'three';
import { BaseNPC } from './marlon.js';
import { CASTLE, VILLANDRY, GAULOIS, ESPACE, VILLE } from './world.js';
import { BLOCK, DECOR_START, isSolid as blockIsSolid, isSlab } from './blocks.js';
import { construireHumain } from './personnages.js';
import { construireBete, BETES } from './betes.js';

const PORTEE = 120;          // au-delà, le site entier est en sommeil
const VU = 62;               // au-delà, chacun s'efface et cesse de s'animer
const GRAVITE = 22;

const TEINTS = [0xe0b48c, 0xc9905e, 0xa9713f, 0xf0c9a4, 0xd8a878];
const CHEVEUX = [0x3a2a1a, 0x6a4a26, 0x1c1814, 0x8a6a3a, 0x9a9a94, 0x4a3524];

// --- les gens ----------------------------------------------------------------

// Un habitant tient un poste : il s'en écarte un peu, y revient, se tourne vers
// l'enfant qui approche, et fait son geste de métier quand il est à l'arrêt.
class Habitant extends BaseNPC {
  constructor(scene, world, player, toast, opts, x, z) {
    super(scene, world, player, toast, opts);
    this.poste = new THREE.Vector2(x, z);
    this.rayon = opts.rayon ?? 4;
    this.etat = 'pause';
    this.minuteur = 1 + Math.random() * 3;
    this.capYaw = Math.random() * Math.PI * 2;
    this.metier = opts.metier || null;
    this.phaseGeste = Math.random() * 6;
    this.pas = 0;
    this.placeAt(x, z, 40);
  }

  think(dt) {
    const vers = this.player.pos.clone().sub(this.pos);
    vers.y = 0;
    const d = vers.length();
    if (d < 5.5) {                       // on salue celui qui vient à soi
      this.pas = 0;
      return { speed: 0, yaw: Math.atan2(vers.x, vers.z) + Math.PI };
    }
    this.minuteur -= dt;
    if (this.minuteur <= 0) {
      this.etat = this.etat === 'pause' ? 'marche' : 'pause';
      this.minuteur = this.etat === 'pause' ? 2.5 + Math.random() * 5 : 1 + Math.random() * 2;
      if (this.etat === 'marche') {
        const loin = Math.hypot(this.pos.x - this.poste.x, this.pos.z - this.poste.y);
        this.capYaw = loin > this.rayon
          ? Math.atan2(this.poste.x - this.pos.x, this.poste.y - this.pos.z) + Math.PI
          : Math.random() * Math.PI * 2;
      }
    }
    this.pas = this.etat === 'marche' ? this.walkSpeed : 0;
    return { speed: this.pas, yaw: this.etat === 'marche' ? this.capYaw : this.yaw };
  }

  // Le geste de métier : il n'a lieu qu'à l'arrêt, sinon il se bat avec le
  // balancement de la marche et le personnage part en vrille.
  geste(dt, vitesse) {
    if (!this.metier || vitesse > 0) return;
    this.phaseGeste += dt;
    const { arms } = this.mesh.userData;
    if (this.metier === 'forge') {
      // le marteau monte lentement, retombe d'un coup
      const t = (this.phaseGeste % 1.4) / 1.4;
      arms[1].rotation.x = t < 0.75 ? -2.1 * (t / 0.75) : -2.1 * (1 - (t - 0.75) / 0.25);
      arms[0].rotation.x = -0.5;
    } else if (this.metier === 'ratisse') {
      arms[1].rotation.x = Math.sin(this.phaseGeste * 1.7) * 0.42 - 0.25;
      arms[0].rotation.x = Math.sin(this.phaseGeste * 1.7) * 0.3 - 0.2;
    } else if (this.metier === 'taille') {
      arms[1].rotation.x = -0.9 + Math.sin(this.phaseGeste * 3.4) * 0.22;
    } else if (this.metier === 'musique') {
      arms[1].rotation.x = -1.0 + Math.sin(this.phaseGeste * 4.2) * 0.28;
      arms[0].rotation.x = -0.75;
    } else if (this.metier === 'porte') {          // il porte quelque chose devant lui
      arms[0].rotation.x = -0.5;
      arms[1].rotation.x = -0.5;
    } else if (this.metier === 'garde') {
      arms[1].rotation.x = -0.15;
      this.mesh.rotation.y = this.yaw + Math.sin(this.phaseGeste * 0.35) * 0.5;
    } else if (this.metier === 'fauconnier') {     // le poing levé, l'oiseau dessus
      arms[0].rotation.x = -1.5;
    } else if (this.metier === 'lit') {
      arms[0].rotation.x = -1.1;
      arms[1].rotation.x = -0.3;
    } else if (this.metier === 'lance') {          // la lance tenue à deux mains
      arms[1].rotation.x = -1.15 + Math.sin(this.phaseGeste * 0.9) * 0.12;
      arms[0].rotation.x = -0.95;
      this.mesh.rotation.y = this.yaw + Math.sin(this.phaseGeste * 0.5) * 0.35;
    } else if (this.metier === 'talkie') {         // la radio portée à la bouche
      arms[1].rotation.x = -2.35;
      arms[0].rotation.x = -0.2;
    } else if (this.metier === 'signale') {        // il règle la circulation
      arms[0].rotation.x = -2.0;
      arms[1].rotation.x = -0.4 + Math.sin(this.phaseGeste * 1.3) * 0.5;
    }
  }
}

// --- les bêtes ---------------------------------------------------------------

// Les bêtes du château ne se promènent pas au hasard du monde comme la faune
// sauvage : elles vivent dans leur enclos et y restent.
class Bestiole {
  constructor(espece, x, y, z, zone, humeur) {
    this.espece = espece;
    this.def = BETES[espece];
    this.zone = zone;                 // { x, z, r }
    this.humeur = humeur;             // 'vive', 'paisible', 'fiere'
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.yaw = Math.random() * Math.PI * 2;
    this.etat = 'pause';
    this.minuteur = Math.random() * 3;
    this.onGround = false;
    this.temps = Math.random() * 10;
    this.cri = 8 + Math.random() * 30;
    this.mesh = construireBete(espece);
  }

  update(dt, world, player, toast) {
    this.minuteur -= dt;
    // Les poules détalent quand on les approche : c'est ce qui fait vivre une
    // basse-cour plus que tout le reste.
    const dJoueur = Math.hypot(this.pos.x - player.pos.x, this.pos.z - player.pos.z);
    const effarouchee = this.humeur === 'vive' && dJoueur < 4.5;
    if (effarouchee) {
      this.etat = 'marche';
      this.minuteur = Math.max(this.minuteur, 0.5);
      this.yaw = Math.atan2(this.pos.x - player.pos.x, this.pos.z - player.pos.z);
    } else if (this.minuteur <= 0) {
      const vive = this.humeur === 'vive';
      this.etat = this.etat === 'pause' ? 'marche' : 'pause';
      this.minuteur = this.etat === 'pause'
        ? (vive ? 0.6 + Math.random() * 1.6 : 3 + Math.random() * 6)
        : (vive ? 0.5 + Math.random() * 1.2 : 1.5 + Math.random() * 2.5);
      if (this.etat === 'marche') {
        const loin = Math.hypot(this.pos.x - this.zone.x, this.pos.z - this.zone.z);
        this.yaw = loin > this.zone.r
          ? Math.atan2(this.zone.x - this.pos.x, this.zone.z - this.pos.z)
          : Math.random() * Math.PI * 2;
      }
    }

    const allure = this.def.v * (effarouchee ? 2.2 : 1);
    const vitesse = this.etat === 'marche' ? allure : 0;
    this.vel.x = Math.sin(this.yaw) * vitesse;
    this.vel.z = Math.cos(this.yaw) * vitesse;
    this.vel.y -= GRAVITE * dt;
    this.vel.y = Math.max(this.vel.y, -30);

    const murX = this.balayer(world, 0, this.vel.x * dt);
    this.balayer(world, 1, this.vel.y * dt);
    const murZ = this.balayer(world, 2, this.vel.z * dt);
    if ((murX || murZ) && this.onGround) {
      if (vitesse > 0) this.vel.y = 5;       // un petit saut pour franchir la marche
      this.yaw += Math.PI / 2 + Math.random();
    }

    this.temps += dt;
    const balance = vitesse > 0 ? Math.sin(this.temps * (this.humeur === 'vive' ? 13 : 8)) * 0.55 : 0;
    this.mesh.userData.legs.forEach((p, i) => { p.rotation.x = i % 2 ? -balance : balance; });
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw + Math.PI;

    this.cri -= dt;
    if (this.cri <= 0) {
      this.cri = 14 + Math.random() * 34;
      if (dJoueur < 7) toast(`${this.def.emoji} ${this.def.cri}`, 0xffffff);
    }
  }

  balayer(world, axe, delta) {
    if (delta === 0) return false;
    const cles = ['x', 'y', 'z'];
    const cle = cles[axe];
    this.pos[cle] += delta;
    const demi = this.def.l / 2, h = this.def.h, eps = 1e-4;
    const minX = Math.floor(this.pos.x - demi + eps), maxX = Math.floor(this.pos.x + demi - eps);
    const minY = Math.floor(this.pos.y + eps), maxY = Math.floor(this.pos.y + h - eps);
    const minZ = Math.floor(this.pos.z - demi + eps), maxZ = Math.floor(this.pos.z + demi - eps);
    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        for (let bx = minX; bx <= maxX; bx++) {
          const id = by < 0 ? BLOCK.STONE : world.getBlock(bx, by, bz);
          if (!blockIsSolid(id)) continue;
          const dessus = by + (isSlab(id) ? 0.5 : 1);
          if (this.pos.y >= dessus - eps && (axe !== 1 || delta < 0)) continue;
          if (axe === 0) this.pos.x = delta > 0 ? bx - demi - eps : bx + 1 + demi + eps;
          else if (axe === 1) {
            if (delta > 0) this.pos.y = by - h - eps;
            else { this.pos.y = dessus + eps; this.onGround = true; }
          } else this.pos.z = delta > 0 ? bz - demi - eps : bz + 1 + demi + eps;
          this.vel[cle] = 0;
          return true;
        }
      }
    }
    if (axe === 1 && delta < 0) this.onGround = false;
    return false;
  }
}

// --- le personnel des deux châteaux -----------------------------------------

// dx/dz sont relatifs au centre du château. rayon : de combien il s'écarte.
const FORTERESSE = [
  {
    nom: 'Sire Baudouin', role: 'chevalier du château', dx: -6, dz: -12, rayon: 3, metier: 'garde',
    profil: { tenue: 'plates', objets: ['epee', 'bouclier'], plume: 0xd03838, ecu: 0xb03030 },
    mots: ['Que Dieu te garde, jeune écuyer !', 'Mon armure pèse trente livres.',
      'Un chevalier protège les faibles.', 'Le donjon n\'est jamais tombé.',
      'Mon destrier m\'attend à l\'écurie.'],
  },
  {
    nom: 'Dame Aliénor', role: 'dame du château', dx: 9, dz: -11, rayon: 4,
    profil: { tenue: 'dame', coupe: 'nattes', drap: 0x7a2a4a, objets: ['panier'] },
    mots: ['Bienvenue en ces murs.', 'La tapisserie du grand hall est mon ouvrage.',
      'Au Moyen Âge, on mangeait avec les doigts !', 'Le ménestrel chantera ce soir.'],
  },
  {
    nom: 'Renaud le Forgeron', role: 'forgeron du château', dx: -9, dz: 11, rayon: 2, metier: 'forge',
    profil: { tenue: 'tablier', barbe: 0x4a3020, coiffe: 'bandeau', objets: ['marteau', 'tenailles'] },
    mots: ['Le fer rouge, ça ne pardonne pas !', 'Une épée demande trois jours de travail.',
      'Attention, ça chauffe par ici !', 'Je referre les chevaux du seigneur.',
      'Mon soufflet monte à mille degrés.'],
  },
  {
    nom: 'Guillaume l\'Armurier', role: 'armurier du château', dx: -5, dz: 11, rayon: 2, metier: 'forge',
    profil: { tenue: 'tablier', tabColor: 0x4a3220, moustache: true, barbe: 0x2a2018, objets: ['marteau'] },
    mots: ['Une cotte de mailles, c\'est vingt mille anneaux.',
      'Ce heaume a sauvé la vie de mon seigneur.', 'Chaque plaque est martelée à la main.'],
  },
  {
    nom: 'Perrin l\'Écuyer', role: 'écuyer du chevalier', dx: -2, dz: -12, rayon: 4,
    profil: { tenue: 'tunique', drap: 0x3a5a8a, objets: ['epee'] },
    mots: ['Un jour, je serai chevalier !', 'Je porte l\'écu de Sire Baudouin.',
      'J\'astique son armure tous les matins.', 'On fait la course jusqu\'à la tour ?'],
  },
  {
    nom: 'Thibaut le Palefrenier', role: 'palefrenier des écuries', dx: 20, dz: -30, rayon: 4, metier: 'porte',
    profil: { tenue: 'tunique', drap: 0x6a5a3a, coupe: 'court', objets: ['seau'] },
    mots: ['Les chevaux ont soif !', 'Ce cheval-là est le plus rapide du comté.',
      'Une botte de foin par jour et par bête.', 'Doucement, ne les effraie pas.'],
  },
  {
    nom: 'Alix la Lavandière', role: 'lavandière du château', dx: 10, dz: -31, rayon: 3, metier: 'porte',
    profil: { tenue: 'lavandiere', coupe: 'chignon', fichu: 0x5a8ab0, objets: ['seau'] },
    mots: ['Je lave le linge à la rivière.', 'On frappe le drap au battoir, comme ça !',
      'Le savon ? De la cendre et du suif.'],
  },
  {
    nom: 'Frère Anselme', role: 'moine copiste', dx: 4, dz: 12, rayon: 3, metier: 'lit',
    profil: { tenue: 'bure', coupe: 'tonsure', cheveux: 0x9a9a94, barbe: 0x9a9a94, objets: ['livre'] },
    mots: ['Je copie les livres à la main.', 'Une bible, c\'est un an de travail.',
      'L\'encre est faite de noix de galle.', 'Le silence sied à l\'étude.'],
  },
  {
    nom: 'Colin le Ménestrel', role: 'ménestrel du château', dx: 6, dz: -11, rayon: 5, metier: 'musique',
    profil: { tenue: 'tunique', drap: 0xb03858, drap2: 0xd8c060, coupe: 'long', objets: ['luth'] },
    mots: ['Écoute donc ma chanson !', 'Je connais cent chansons par cœur.',
      'Le luth vient des pays d\'Orient.', 'On ne lisait pas la musique, on la retenait.'],
  },
  {
    nom: 'Mahaut la Boulangère', role: 'boulangère du bourg', dx: -8, dz: -31, rayon: 3, metier: 'porte',
    profil: { tenue: 'tunique', drap: 0x8a6a4a, coupe: 'chignon', objets: ['panier'] },
    mots: ['Le pain sort du four !', 'On cuit une fois par semaine, au four banal.',
      'Du pain noir pour les manants, du blanc pour le seigneur.'],
  },
  {
    nom: 'Gautier l\'Archer', role: 'archer de la garnison', dx: 15, dz: -29, rayon: 3, metier: 'garde',
    profil: { tenue: 'cuir', cheveux: 0x1c1814, objets: ['arc'] },
    mots: ['Mon arc fait deux mètres.', 'Je décoche dix flèches par minute.',
      'Vise le corbeau sur la tour, tu verras.', 'L\'if donne le meilleur bois d\'arc.'],
  },
  {
    nom: 'Ysabeau la Fauconnière', role: 'fauconnière du seigneur', dx: -16, dz: -30, rayon: 4, metier: 'fauconnier',
    profil: { tenue: 'tunique', drap: 0x4a6a4a, coupe: 'nattes', objets: ['faucon'] },
    mots: ['Mon faucon me revient toujours.', 'Il pique à trois cents à l\'heure !',
      'La chasse au vol est un art de seigneur.', 'Ne fais pas de bruit, il est nerveux.'],
  },
  {
    nom: 'Berthe la Cuisinière', role: 'cuisinière du château', dx: 8, dz: 11, rayon: 3, metier: 'porte',
    profil: { tenue: 'tablier', coiffe: 'toque', coupe: 'chignon', objets: ['balai'] },
    mots: ['Ce soir, sanglier aux épices !', 'Le poivre coûte plus cher que l\'or.',
      'On cuisine dans la cheminée, pas au fourneau.'],
  },
  {
    nom: 'Garin le Veilleur', role: 'veilleur de la porte', dx: 0, dz: -13, rayon: 2, metier: 'garde',
    profil: { tenue: 'maille', barbe: 0x2a2018, surcot: 0x3a5a8a, objets: ['hallebarde', 'torche'] },
    mots: ['Je veille jour et nuit.', 'La herse tombe au premier signal.',
      'De la tour, on voit à deux lieues.', 'Qui va là ?'],
  },
];

const VILLANDRY_GENS = [
  {
    nom: 'Joachim', role: 'jardinier en chef de Villandry', dx: 0, dz: 14, rayon: 4, metier: 'taille',
    profil: { tenue: 'jardinier', barbe: 0x6a5a48, objets: ['cisailles'] },
    mots: ['Le buis se taille deux fois l\'an.', 'Il y a mille mètres de buis ici !',
      'Chaque carré du potager change de légume chaque année.',
      'Un jardin, ça se dessine avant de se planter.'],
  },
  {
    nom: 'Marguerite', role: 'jardinière du potager', dx: -14, dz: 20, rayon: 5, metier: 'porte',
    profil: { tenue: 'jardinier', coupe: 'chignon', drap: 0x7a6a4a, objets: ['panier'] },
    mots: ['Choux, poireaux, carottes : tout est dessiné !',
      'Le potager fait neuf carrés, comme un damier.',
      'On plante quarante mille légumes par an.'],
  },
  {
    nom: 'Blaise', role: 'jardinier des allées', dx: 16, dz: 12, rayon: 6, metier: 'ratisse',
    profil: { tenue: 'jardinier', coiffe: 'nu', cheveux: 0x8a6a3a, objets: ['rateau'] },
    mots: ['Les allées se ratissent chaque matin.', 'Le gravier crisse, c\'est le bruit du jardin.',
      'Regarde comme les lignes sont droites !'],
  },
  {
    nom: 'Perrine', role: 'jardinière du jardin du Soleil', dx: 40, dz: 2, rayon: 6, metier: 'porte',
    profil: { tenue: 'jardinier', coupe: 'nattes', drap: 0x5a7a52, objets: ['seau'] },
    mots: ['Le jardin du Soleil est le plus jeune de tous.',
      'Ici, on va du bleu des nuages à l\'orange du soleil.',
      'Les pommiers de la chambre des enfants sont à moi.'],
  },
  {
    nom: 'Madame de Villandry', role: 'maîtresse de maison', dx: -2, dz: -8, rayon: 3,
    profil: { tenue: 'robeRen', coupe: 'chignon', drap: 0x6a2f5a, objets: ['panier'] },
    mots: ['Soyez le bienvenu en notre demeure.',
      'Le plafond du salon oriental vient de Tolède.',
      'Trois mille six cents pièces de bois peint, pas une de moins !',
      'La salle à manger a ses boiseries saumon.'],
  },
  {
    nom: 'Le seigneur Jean', role: 'seigneur de Villandry', dx: 4, dz: -8, rayon: 3,
    profil: { tenue: 'pourpoint', barbe: 0x3a2a1a, moustache: true, objets: ['epee'] },
    mots: ['Ce château fut bâti en 1536.', 'La Renaissance nous vient d\'Italie.',
      'Nos jardins n\'ont pas leur pareil en Loire.', 'Le donjon, lui, est bien plus ancien.'],
  },
  {
    nom: 'Léonard le Page', role: 'page de la maison', dx: -8, dz: -6, rayon: 5, metier: 'porte',
    profil: { tenue: 'livree', taille: 0.86, objets: ['panier'] },
    mots: ['Je porte les messages du seigneur !', 'Je connais tous les raccourcis du jardin.',
      'Un jour je serai écuyer.'],
  },
  {
    nom: 'Maître Gervais', role: 'maître d\'hôtel', dx: 8, dz: -6, rayon: 3, metier: 'garde',
    profil: { tenue: 'livree', drap: 0x2a3a5a, drap2: 0xc8b070, barbe: 0x5a5a54 },
    mots: ['La table est mise pour douze.', 'Le sol de la salle à manger est en marbre.',
      'Le parquet, lui, reste aux pièces privées.'],
  },
  {
    nom: 'Simone la Cuisinière', role: 'cuisinière de Villandry', dx: -10, dz: -3, rayon: 3, metier: 'porte',
    profil: { tenue: 'tablier', coiffe: 'toque', coupe: 'chignon', objets: ['panier'] },
    mots: ['Tout vient du potager, à trente pas d\'ici.',
      'Aujourd\'hui : soupe de poireaux et tarte aux pommes.',
      'Les légumes du jardin sont donnés, pas vendus.'],
  },
  {
    nom: 'Jeanne la Lavandière', role: 'lavandière du jardin d\'eau', dx: -20, dz: 8, rayon: 4, metier: 'porte',
    profil: { tenue: 'lavandiere', coupe: 'chignon', fichu: 0x8a6ab0, objets: ['seau'] },
    mots: ['Le grand bassin sert de miroir au ciel.',
      'Le linge sèche sur l\'herbe, au soleil.'],
  },
  {
    nom: 'Anselme le Musicien', role: 'musicien de la maison', dx: 10, dz: -2, rayon: 4, metier: 'musique',
    profil: { tenue: 'pourpoint', drap: 0x3a5a4a, drap2: 0xd0c090, coupe: 'long', objets: ['viole'] },
    mots: ['La viole de gambe se joue entre les jambes.',
      'On danse la pavane et la gaillarde.', 'Écoutez donc cet air de cour !'],
  },
  {
    nom: 'Étienne le Fauconnier', role: 'fauconnier de Villandry', dx: 24, dz: -4, rayon: 4, metier: 'fauconnier',
    profil: { tenue: 'livree', drap: 0x5a4a3a, drap2: 0xb09a5a, objets: ['faucon'] },
    mots: ['Mon faucon connaît tout le domaine.', 'Il ne chasse jamais dans les jardins.',
      'On l\'appelle au leurre, avec un sifflet.'],
  },
];

// --- le village gaulois et le camp romain ------------------------------------
//
// Les décalages sont ceux du bâti : le village est centré sur (−22, 0), le
// camp romain sur (+30, 0), la route droite entre les deux.
const GAULOIS_GENS = [
  {
    nom: 'Astucix', role: 'guerrier du village', dx: -22, dz: 4, rayon: 6,
    profil: { tenue: 'gaulois', casque: true, moustache: true, barbe: 0xe8c53c, coupe: 'long',
      cheveux: 0xe8c53c, drap: 0x3a6a9a, objets: ['epee'], taille: 0.88 },
    mots: ['Ils sont fous, ces Romains !', 'Une goutte de potion et hop !',
      'Le village ne se rendra jamais.', 'Tu veux voir le menhir de mon ami ?',
      'Attention, la patrouille romaine arrive.'],
  },
  {
    nom: 'Costaudix', role: 'livreur de menhirs', dx: -14, dz: 6, rayon: 5, metier: 'porte',
    profil: { tenue: 'gaulois', drap: 0x2a7a3a, braies: 0x3a5a8a, moustache: true,
      cheveux: 0xe8952c, coupe: 'nattes', objets: ['menhir'], taille: 1.14 },
    mots: ['Il est lourd, mon menhir !', 'Je n\'ai PAS besoin de potion.',
      'On mange du sanglier ce soir ?', 'Livraison en Armorique et alentours.'],
  },
  {
    nom: 'Herborix', role: 'druide du village', dx: -31, dz: -12, rayon: 4, metier: 'lit',
    profil: { tenue: 'druide', cheveux: 0xf0ece0, barbe: 0xf0ece0, coupe: 'long', objets: ['serpe'] },
    mots: ['La potion n\'est pas encore prête.', 'Le gui se coupe à la serpe d\'or.',
      'Non, tu es tombé dedans quand tu étais petit.',
      'Un peu de fer, du gui, et un secret que je garde.'],
  },
  {
    nom: 'Grandchefix', role: 'chef du village', dx: -22, dz: -7, rayon: 3, metier: 'garde',
    profil: { tenue: 'gaulois', drap: 0x9a2a4a, braies: 0x2a4a7a, moustache: true, barbe: 0x8a2a2a,
      cheveux: 0x8a2a2a, casque: true, ailes: 0xd8c48a, objets: ['epee'] },
    mots: ['Je ne crains qu\'une chose : que le ciel me tombe sur la tête.',
      'Portez-moi sur le pavois !', 'Ce village est le dernier à résister.',
      'Que le banquet commence !'],
  },
  {
    nom: 'Faussenotix', role: 'barde du village', dx: -28, dz: 10, rayon: 4, metier: 'musique',
    profil: { tenue: 'gaulois', drap: 0xb09030, braies: 0x7a5a3a, coupe: 'long',
      cheveux: 0xe8b83c, objets: ['harpe'] },
    mots: ['Je vais vous chanter quelque chose !', 'Personne ne comprend mon art.',
      'La ré mi fa sol… enfin, à peu près.', 'On m\'a encore attaché au banquet.'],
  },
  {
    nom: 'Poissonnix', role: 'poissonnier du village', dx: -34, dz: 10, rayon: 3, metier: 'porte',
    profil: { tenue: 'gaulois', drap: 0x3a8a8a, braies: 0x5a4a3a, moustache: true, objets: ['poisson'] },
    mots: ['Mes poissons sont frais !', 'Qui a dit qu\'ils sentaient ?',
      'Ils arrivent tout droit de Lutèce.', 'Ne touche pas à mon étal !'],
  },
  {
    nom: 'Forgeronix', role: 'forgeron du village', dx: -9, dz: 9, rayon: 3, metier: 'forge',
    profil: { tenue: 'tablier', barbe: 0x2a2018, coiffe: 'bandeau', objets: ['marteau', 'tenailles'] },
    mots: ['Le fer chauffe, écarte-toi !', 'Non, ses poissons ne sont pas frais.',
      'Je referre tout le village.', 'Une épée neuve ? Reviens demain.'],
  },
  {
    nom: 'Bonnemine', role: 'femme du chef', dx: -18, dz: -8, rayon: 4,
    profil: { tenue: 'dame', drap: 0x6a3a7a, coupe: 'chignon', guimpe: 0xf0ece0, objets: ['panier'] },
    mots: ['Range un peu cette hutte !', 'Le banquet, c\'est encore moi qui le prépare.',
      'Nos huttes sont les plus belles d\'Armorique.'],
  },
  {
    nom: 'Agecanonix', role: 'doyen du village', dx: -26, dz: -3, rayon: 4,
    profil: { tenue: 'gaulois', drap: 0x7a6a5a, braies: 0x5a5a5a, cheveux: 0xf0ece0,
      barbe: 0xf0ece0, moustache: true, taille: 0.9, objets: ['epee'] },
    mots: ['De mon temps, on résistait mieux !', 'J\'ai connu la bataille de Gergovie.',
      'Laissez-moi y aller, je suis encore vaillant !'],
  },
  // --- le camp romain ---
  {
    nom: 'Marcus Sestertius', role: 'centurion du camp', dx: 30, dz: 8, rayon: 4, metier: 'garde',
    profil: { tenue: 'romain', transverse: true, cimier: 0x2a2a2a, objets: ['epee', 'scutum'] },
    mots: ['Par Jupiter, encore eux !', 'Legio, en formation !',
      'Ce village finira bien par tomber.', 'Personne ne sort du camp ce soir.'],
  },
  {
    nom: 'Lucius Bavardus', role: 'légionnaire du camp', dx: 22, dz: -6, rayon: 6, metier: 'garde',
    profil: { tenue: 'romain', objets: ['epee', 'scutum'] },
    mots: ['J\'aurais dû rester à Rome.', 'On monte la garde, encore…',
      'Tu n\'aurais pas vu passer un gros Gaulois ?'],
  },
  {
    nom: 'Quintus Grognus', role: 'légionnaire du camp', dx: 38, dz: -8, rayon: 6, metier: 'garde',
    profil: { tenue: 'romain', tunique: 0x9a3028, objets: ['epee', 'scutum'] },
    mots: ['Encore une patrouille pour rien.', 'La soupe est froide.',
      'Je préférerais garder un pont.'],
  },
  {
    nom: 'Julius Optimus', role: 'général du camp', dx: 30, dz: -8, rayon: 3,
    profil: { tenue: 'romain', tunique: 0x8a2a6a, cimier: 0xd8c44a, transverse: true, objets: ['epee'] },
    mots: ['Rome finira par l\'emporter.', 'Apportez-moi une carte de la Gaule !',
      'Ce petit village m\'agace prodigieusement.'],
  },
  {
    nom: 'Caius Pilus', role: 'légionnaire de garde', dx: 30, dz: 17, rayon: 3, metier: 'garde',
    profil: { tenue: 'romain', objets: ['hallebarde', 'scutum'] },
    mots: ['Halte ! Qui va là ?', 'On ne passe pas.', 'Le camp est fermé.'],
  },
];

const GAULOIS_BETES = [
  ['chien', 2, -22, 2, 12, 'vive'],          // le petit chien du village
  ['cochon', 3, -30, 14, 5, 'paisible'],
  ['porcelet', 2, -30, 14, 4, 'vive'],
  ['poule', 3, -14, -4, 6, 'vive'],
  ['poule_rousse', 2, -14, -4, 6, 'vive'],
  ['coq', 1, -14, -4, 5, 'vive'],
  ['oie', 2, -34, 4, 5, 'vive'],
  ['mouton', 2, -40, -14, 6, 'paisible'],
  ['chat', 1, -20, 8, 8, 'paisible'],
  ['ane', 1, -8, -10, 4, 'paisible'],
  // les chevaux de la cavalerie romaine
  ['cheval', 2, 30, -20, 5, 'paisible'],
  ['cheval_noir', 1, 34, -18, 5, 'paisible'],
];

// --- la base spatiale --------------------------------------------------------
const ESPACE_GENS = [
  {
    nom: 'Commandante Vela', role: 'chef de la base', dx: -6, dz: -24, rayon: 4, metier: 'garde',
    profil: { tenue: 'pilote', drap: 0xd86a1c, objets: ['blaster'] },
    mots: ['Bienvenue à la base, pilote.', 'Les deux soleils se couchent tard, ici.',
      'Ne t\'approche pas du croiseur sans autorisation.', 'Tous les appareils sont prêts au décollage.'],
  },
  {
    nom: 'Rix Solane', role: 'pilote de chasseur', dx: -18, dz: -4, rayon: 5,
    profil: { tenue: 'pilote', objets: ['blaster'] },
    mots: ['Mon chasseur a quatre ailerons en croix.', 'On file plus vite que la lumière.',
      'Tu veux voir la cabine ?', 'Le sable, ça encrasse tout.'],
  },
  {
    nom: 'Nima Sarr', role: 'pilote de chasseur', dx: -18, dz: 20, rayon: 5,
    profil: { tenue: 'pilote', drap: 0xe89a30, coupe: 'nattes', objets: ['blaster'] },
    mots: ['Je pilote le chasseur du fond.', 'Trois soleils levants, trois sorties.',
      'La cantina sert la meilleure soupe du secteur.'],
  },
  {
    nom: 'Maître Orin', role: 'chevalier de l\'ordre', dx: 8, dz: 10, rayon: 5,
    profil: { tenue: 'chevalierEspace', barbe: 0x9a9a94, cheveux: 0x9a9a94, objets: ['sabre'] },
    mots: ['La patience est une arme.', 'Ce sabre m\'a été confié, pas donné.',
      'Écoute avant de frapper.', 'L\'ordre veille sur ce secteur.'],
  },
  {
    nom: 'Kaelis', role: 'chevalière de l\'ordre', dx: 14, dz: 4, rayon: 5,
    profil: { tenue: 'chevalierEspace', drap: 0x5a6a7a, capuche: 0x3a4a5a, coupe: 'nattes',
      lame: 0x6ae87a, objets: ['sabre'] },
    mots: ['Ma lame est verte, celle de mon maître est bleue.',
      'On s\'entraîne à l\'aube, avant la chaleur.', 'Tu tiendrais un sabre, toi ?'],
  },
  {
    nom: 'L\'Ombre', role: 'chevalier noir', dx: -26, dz: -22, rayon: 6, metier: 'garde',
    profil: { tenue: 'chevalierEspace', drap: 0x1a1a20, capuche: 0x121216,
      lame: 0xd83a2a, objets: ['sabre'] },
    mots: ['…', 'Tu n\'aurais pas dû venir ici.', 'Le croiseur est à moi.',
      'Ta présence m\'est connue.'],
  },
  {
    nom: 'TX-9', role: 'droïde de protocole', dx: 2, dz: 16, rayon: 5, metier: 'porte',
    profil: { tenue: 'droide' },
    mots: ['Je maîtrise six millions de formes de communication.',
      'Les probabilités ne nous sont pas favorables.', 'Oh, mon circuit !',
      'Puis-je vous être utile ?'],
  },
  {
    nom: 'V2-BO', role: 'droïde mécanicien', dx: -14, dz: 12, rayon: 6, metier: 'forge',
    profil: { tenue: 'droide', metal: 0xbcbcc4, objets: ['marteau'] },
    mots: ['Bip bip.', 'Le réacteur trois fuit encore.', 'Bzzt… réparation en cours.'],
  },
  {
    nom: 'Soldat TK-40', role: 'garde de la base', dx: 22, dz: -12, rayon: 5, metier: 'garde',
    profil: { tenue: 'soldat', objets: ['blaster'] },
    mots: ['Circulez.', 'Zone sous surveillance.', 'Vos papiers de vol ?'],
  },
  {
    nom: 'Soldat TK-52', role: 'garde de la base', dx: 30, dz: -20, rayon: 5, metier: 'garde',
    profil: { tenue: 'soldat', objets: ['blaster'] },
    mots: ['Rien à signaler.', 'On a perdu deux droïdes dans le désert.',
      'Ce casque tient chaud, tu n\'imagines pas.'],
  },
  {
    nom: 'Zib le Tenancier', role: 'patron de la cantina', dx: 30, dz: 22, rayon: 3, metier: 'porte',
    profil: { tenue: 'tablier', coiffe: 'toque', barbe: 0x3a2a1a, objets: ['panier'] },
    mots: ['Pas de droïdes au comptoir !', 'Une boisson bleue ? C\'est la maison qui régale.',
      'Ici, on ne pose pas de questions.', 'La musique commence dans un instant.'],
  },
  {
    nom: 'Sana Vex', role: 'mécanicienne du port', dx: 16, dz: -18, rayon: 6, metier: 'forge',
    profil: { tenue: 'tablier', coupe: 'chignon', tabColor: 0x4a4a54, objets: ['marteau', 'tenailles'] },
    mots: ['Le cargo à disque est increvable.', 'Trois passages de sable par jour, tu parles.',
      'Ne touche pas au réacteur, il est chaud.'],
  },
];

const ESPACE_BETES = [
  ['chien', 2, 24, 26, 10, 'vive'],
  ['chat_roux', 1, 30, 28, 8, 'paisible'],
  ['poule', 2, 34, 34, 5, 'vive'],
  ['ane', 1, -34, 24, 5, 'paisible'],
];

// La place des secours, au cœur de Paris : la caserne à l'ouest, le
// commissariat à l'est. Ce que ces trente-là racontent est le seul contenu du
// jeu qui puisse servir un jour pour de vrai — les numéros d'urgence, ce qu'on
// dit au téléphone, ce qu'on fait quand ça sent la fumée. C'est pour cela
// qu'ils sont si nombreux à en parler : on ne retient pas ce qu'on entend une
// fois, on retient ce qu'on croise dix fois.
//
// Repère : la caserne est centrée sur (-17, -8), le commissariat sur (17, -8).
const VILLE_GENS = [
  // ----- la caserne : quinze sapeurs-pompiers -----
  {
    nom: 'Capitaine Roussel', role: 'chef de la caserne', dx: -17, dz: 6, rayon: 3, metier: 'garde',
    profil: { tenue: 'pompier', objets: ['talkie'], moustache: true },
    mots: ['En cas de feu, on appelle le 18 !', 'Le 112 marche partout en Europe.',
      'On sort en moins de deux minutes, jour et nuit.',
      'Le plus important, c\'est de sortir du bâtiment. Les objets, on s\'en fiche.'],
  },
  {
    nom: 'Lieutenant Vasseur', role: 'officier de garde', dx: -11, dz: 5, rayon: 3, metier: 'talkie',
    profil: { tenue: 'pompier', objets: ['talkie'] },
    mots: ['Au téléphone, on donne l\'adresse d\'abord.', 'Puis ce qu\'on voit, puis son prénom.',
      'On ne raccroche jamais le premier.', 'Quatre-vingts pour cent de nos sorties : du secours à personne.'],
  },
  {
    nom: 'Sergent Amiot', role: 'chef d\'agrès', dx: -23, dz: 5, rayon: 3, metier: 'garde',
    profil: { tenue: 'pompier', barbe: 0x3a2a1a, objets: ['hache'] },
    mots: ['Cette hache ouvre une porte en trois coups.', 'On coupe le courant avant d\'arroser.',
      'Le camion pèse quinze tonnes en charge.'],
  },
  {
    nom: 'Caporal Berthier', role: 'porte-lance', dx: -27, dz: 1, rayon: 4, metier: 'lance',
    profil: { tenue: 'pompier', ari: true, objets: ['lanceEau'] },
    mots: ['La lance envoie cinq cents litres à la minute !',
      'À deux mains, sinon elle part toute seule.', 'On attaque le feu par en dessous, jamais par le haut.'],
  },
  {
    nom: 'Caporal Nadaud', role: 'porte-lance', dx: -12, dz: 1, rayon: 4, metier: 'lance',
    profil: { tenue: 'pompier', ari: true, objets: ['lanceEau'] },
    mots: ['La fumée monte : au sol, l\'air reste respirable.',
      'On rampe pour sortir, la tête basse.', 'Ma bouteille d\'air tient trente minutes.'],
  },
  {
    nom: 'Sapeur Lemoine', role: 'conducteur de la grande échelle', dx: -25, dz: -7, rayon: 3, metier: 'porte',
    profil: { tenue: 'pompier', objets: ['extincteur'] },
    mots: ['Mon échelle monte à trente mètres.', 'C\'est dix étages, si tu préfères.',
      'Je cale le camion sur quatre béquilles avant de la déplier.'],
  },
  {
    nom: 'Sapeur Guerrin', role: 'conducteur du fourgon', dx: -9, dz: -7, rayon: 3, metier: 'porte',
    profil: { tenue: 'pompier', objets: ['extincteur'] },
    mots: ['La citerne contient trois mille litres.', 'Ça vide en six minutes de lance !',
      'Ensuite on se branche sur une bouche d\'incendie.'],
  },
  {
    nom: 'Sapeur Delaunay', role: 'sapeur de garde', dx: -20, dz: -15, rayon: 3, metier: 'garde',
    profil: { tenue: 'pompier', objets: ['hache'] },
    mots: ['On dort ici, en tenue.', 'Le signal sonne, on est debout en dix secondes.',
      'La perche du hangar, c\'est plus rapide que l\'escalier.'],
  },
  {
    nom: 'Sapeuse Ancelin', role: 'sapeuse de garde', dx: -12, dz: -15, rayon: 3, metier: 'garde',
    profil: { tenue: 'pompier', coupe: 'chignon', objets: ['talkie'] },
    mots: ['Il y a des femmes pompiers depuis longtemps.',
      'On passe le même test physique que les garçons.', 'Ma tenue pèse vingt-cinq kilos avec la bouteille.'],
  },
  {
    nom: 'Infirmière Beaulieu', role: 'infirmière de la caserne', dx: -5, dz: 3, rayon: 4, metier: 'porte',
    profil: { tenue: 'pompier', drap: 0x2a3a58, coupe: 'chignon', objets: ['panier'] },
    mots: ['Un brûlé, on le passe sous l\'eau froide vingt minutes.',
      'De l\'eau tiède, en fait — jamais glacée.', 'Et on n\'enlève pas ce qui colle à la peau.'],
  },
  {
    nom: 'Sapeur Coudert', role: 'sapeur plongeur', dx: -29, dz: 4, rayon: 4, metier: 'porte',
    profil: { tenue: 'pompier', drap: 0x1a3a52, ari: true, objets: ['extincteur'] },
    mots: ['Je plonge dans le fleuve quand il faut.', 'On ne se baigne jamais seul, jamais.',
      'Même bon nageur : l\'eau froide coupe les jambes.'],
  },
  {
    nom: 'Sapeur Vialard', role: 'sapeur cordiste', dx: -4, dz: -12, rayon: 3, metier: 'garde',
    profil: { tenue: 'pompier', objets: ['hache'] },
    mots: ['Je descends en rappel de la tour.',
      'La tour sert à faire sécher les tuyaux, pas à s\'entraîner.',
      'Cent mètres de tuyau, ça met deux jours à sécher.'],
  },
  {
    nom: 'Sapeuse Fombeur', role: 'sapeuse de garde', dx: -20, dz: 9, rayon: 4, metier: 'signale',
    profil: { tenue: 'pompier', coupe: 'nattes', objets: ['talkie'] },
    mots: ['Écarte-toi, le camion sort !', 'Quand tu entends la sirène, tu te ranges.',
      'Deux tons : c\'est nous. Trois tons : la police.'],
  },
  {
    nom: 'Sapeur Ollivier', role: 'sapeur de garde', dx: -14, dz: 10, rayon: 4, metier: 'porte',
    profil: { tenue: 'pompier', objets: ['extincteur'] },
    mots: ['Un détecteur de fumée par étage, c\'est la loi.',
      'Teste le tien une fois par mois, avec un grand.', 'Une pile par an, et il te réveille la nuit.'],
  },
  {
    nom: 'Vétérinaire Sarlat', role: 'vétérinaire des secours', dx: -31, dz: 9, rayon: 4, metier: 'lit',
    profil: { tenue: 'pompier', drap: 0x2a4a3a, coupe: 'chignon', objets: ['livre'] },
    mots: ['On sort aussi les chats des arbres, oui.',
      'Et les chiens tombés dans un trou.', 'Un animal affolé mord : on l\'approche doucement.'],
  },

  // ----- le commissariat : quinze policiers -----
  {
    nom: 'Commissaire Aubertin', role: 'chef du commissariat', dx: 17, dz: 6, rayon: 3, metier: 'garde',
    profil: { tenue: 'policier', coiffe: 'kepi', moustache: true, objets: ['talkie'] },
    mots: ['La police, c\'est le 17.', 'Perdu ? Va voir un policier, ou un commerçant.',
      'On n\'arrête personne sans preuve.', 'Mon commissariat est ouvert jour et nuit.'],
  },
  {
    nom: 'Brigadier Naveau', role: 'chef de brigade', dx: 12, dz: 6, rayon: 3, metier: 'garde',
    profil: { tenue: 'policier', objets: ['matraque'] },
    mots: ['On patrouille toujours à deux.', 'Un policier seul, ça n\'existe pas.',
      'Le gyrophare bleu, c\'est nous.'],
  },
  {
    nom: 'Gardienne Perrot', role: 'gardienne de la paix', dx: 22, dz: 6, rayon: 3, metier: 'talkie',
    profil: { tenue: 'policier', coupe: 'chignon', objets: ['talkie'] },
    mots: ['Si tu es perdu, tu restes sur place.', 'Bouger, c\'est ce qui complique tout.',
      'Apprends le prénom entier de tes parents, ça aide.'],
  },
  {
    nom: 'Gardien Chaumette', role: 'agent de la circulation', dx: 9, dz: -1, rayon: 4, metier: 'signale',
    profil: { tenue: 'policier', objets: ['matraque'] },
    mots: ['On traverse sur le passage piéton.', 'On regarde à gauche, à droite, encore à gauche.',
      'Le feu vert pour les voitures, c\'est le rouge pour toi.'],
  },
  {
    nom: 'Gardienne Vaudrey', role: 'agente de la circulation', dx: 25, dz: -1, rayon: 4, metier: 'signale',
    profil: { tenue: 'policier', coupe: 'nattes', objets: ['talkie'] },
    mots: ['Un vélo, ça roule à droite, comme les voitures.',
      'Le casque n\'est pas une option avant douze ans.', 'On tend le bras avant de tourner.'],
  },
  {
    nom: 'Lieutenant Sorel', role: 'officier de police judiciaire', dx: 10, dz: -7, rayon: 3, metier: 'lit',
    profil: { tenue: 'policier', coiffe: 'nu', objets: ['livre'] },
    mots: ['J\'écris le procès-verbal, mot pour mot.',
      'Une enquête, c\'est surtout de la paperasse.', 'On croit toujours la victime, on vérifie ensuite.'],
  },
  {
    nom: 'Brigadière Alard', role: 'chef de poste', dx: 24, dz: -7, rayon: 3, metier: 'porte',
    profil: { tenue: 'policier', coupe: 'chignon', objets: ['talkie'] },
    mots: ['Je tiens le registre des appels.', 'Chaque appel est noté, même les fausses alertes.',
      'Un appel pour rien, ça bloque la ligne d\'un vrai.'],
  },
  {
    nom: 'Gardien Fressard', role: 'gardien des cellules', dx: 14, dz: -15, rayon: 3, metier: 'garde',
    profil: { tenue: 'policier', barbe: 0x2a2018, objets: ['matraque'] },
    mots: ['La garde à vue dure vingt-quatre heures.',
      'Ensuite c\'est le juge qui décide, pas nous.', 'On a le droit à un avocat, tout de suite.'],
  },
  {
    nom: 'Gardien Malbec', role: 'maître-chien', dx: 20, dz: -15, rayon: 4, metier: 'porte',
    profil: { tenue: 'policier', objets: ['talkie'] },
    mots: ['Mon chien sent mille fois mieux que moi.',
      'On ne caresse pas un chien de service en travail.', 'Il retrouve une personne perdue en forêt.'],
  },
  {
    nom: 'Gardienne Terrasse', role: 'agente d\'accueil', dx: 17, dz: 9, rayon: 3, metier: 'porte',
    profil: { tenue: 'policier', coupe: 'nattes', coiffe: 'nu', objets: ['livre'] },
    mots: ['Ici, on peut déposer plainte.', 'On peut aussi juste demander son chemin.',
      'Un objet trouvé ? Apporte-le, on le rend.'],
  },
  {
    nom: 'Gardien Estève', role: 'motocycliste', dx: 5, dz: 4, rayon: 4, metier: 'garde',
    profil: { tenue: 'policier', drap: 0x1a2038, objets: ['matraque'] },
    mots: ['En ville, c\'est cinquante kilomètres-heure.',
      'Trente devant les écoles.', 'La moto passe où la voiture reste coincée.'],
  },
  {
    nom: 'Gardienne Ronsard', role: 'gardienne de la paix', dx: 29, dz: 4, rayon: 4, metier: 'garde',
    profil: { tenue: 'policier', coupe: 'chignon', objets: ['matraque'] },
    mots: ['On porte un gilet, il pèse cinq kilos.',
      'Ce n\'est pas confortable, mais c\'est comme ça.', 'La journée fait douze heures.'],
  },
  {
    nom: 'Adjudant Cabanel', role: 'gendarme en renfort', dx: 3, dz: 8, rayon: 4, metier: 'garde',
    profil: { tenue: 'policier', coiffe: 'kepi', drap: 0x1e2440, objets: ['talkie'] },
    mots: ['La gendarmerie s\'occupe des campagnes.',
      'La police, des villes. On se relaie.', 'Le numéro reste le 17 dans les deux cas.'],
  },
  {
    nom: 'Gardien Ferrière', role: 'agent de police scientifique', dx: 31, dz: 8, rayon: 4, metier: 'lit',
    profil: { tenue: 'policier', coiffe: 'nu', drap: 0x2c3550, objets: ['livre'] },
    mots: ['Chaque doigt laisse un dessin unique.',
      'Même les vrais jumeaux ont des empreintes différentes.', 'On relève, on compare, on conclut.'],
  },
  {
    nom: 'Gardien Bourdet', role: 'gardien de la paix', dx: 26, dz: -12, rayon: 3, metier: 'talkie',
    profil: { tenue: 'policier', objets: ['talkie'] },
    mots: ['La radio, c\'est notre fil avec le poste.',
      'On annonce où on est avant chaque intervention.', 'Bien reçu, terminé !'],
  },
];

const VILLE_BETES = [
  ['chien', 2, -17, -6, 5, 'vive'],       // les chiens de la caserne
  ['chien', 2, 20, -12, 5, 'vive'],       // les chiens du commissariat
  ['cheval_noir', 2, 30, 6, 4, 'paisible'],  // la brigade équestre
  ['chat', 1, -28, 6, 6, 'paisible'],
  ['colombe', 6, 0, 4, 10, 'vive'],
];

// espèce, effectif, position de l'enclos (relative au château), rayon, humeur
const FORTERESSE_BETES = [
  // Le bourg est au nord, au-delà de la douve : c'est là que vit la basse-cour.
  ['poule', 3, -4, -30, 5, 'vive'],
  ['poule_rousse', 2, -4, -30, 5, 'vive'],
  ['poule_grise', 1, -4, -30, 5, 'vive'],
  ['coq', 1, -4, -30, 4, 'vive'],
  ['poussin', 3, -3, -29, 3, 'vive'],
  ['cochon', 2, 11, -32, 4, 'paisible'],
  ['porcelet', 2, 11, -32, 4, 'vive'],
  ['oie', 2, 4, -30, 4, 'vive'],
  // les écuries, à l'est du bourg
  ['cheval', 1, 22, -31, 5, 'paisible'],
  ['cheval_noir', 1, 24, -28, 5, 'paisible'],
  ['cheval_blanc', 1, 20, -34, 5, 'paisible'],
  ['ane', 1, 25, -33, 4, 'paisible'],
  // le pré, à l'ouest
  ['mouton', 3, -22, -31, 7, 'paisible'],
  ['vache', 1, -26, -28, 6, 'paisible'],
  // et ceux qui vont partout : les chiens de la cour, le chat des cuisines
  ['chien', 1, -4, -12, 11, 'vive'],
  ['chien', 1, 2, -28, 12, 'vive'],
  ['chat', 1, 8, 9, 8, 'paisible'],
];

const VILLANDRY_BETES = [
  ['paon', 2, 12, 6, 7, 'fiere'],
  ['colombe', 4, 2, -9, 5, 'vive'],
  ['poule', 2, -24, 24, 4, 'vive'],
  ['poule_rousse', 1, -24, 24, 4, 'vive'],
  ['coq', 1, -24, 24, 4, 'vive'],
  ['ane', 1, -26, 26, 4, 'paisible'],
  ['cheval_blanc', 1, -2, -34, 5, 'paisible'],
  ['cheval', 1, 4, -36, 5, 'paisible'],
  ['levrier', 2, 6, -6, 11, 'vive'],
  ['chat_roux', 1, -14, 4, 8, 'paisible'],
  ['chat', 1, 18, 18, 8, 'paisible'],
  ['oie', 2, -20, 14, 5, 'paisible'],
  ['mouton', 2, 34, 24, 5, 'paisible'],
];

// --- trouver un sol où poser tout ce monde -----------------------------------

// Ce sur quoi on accepte de faire marcher quelqu'un : de la terre, de la
// pierre, un pavage, une allée de gravier. Pas de l'eau, pas du feuillage, pas
// une toiture d'ardoise.
const SOLS = new Set([
  BLOCK.GRASS, BLOCK.DIRT, BLOCK.SAND, BLOCK.STONE, BLOCK.COBBLE, BLOCK.GRAVEL,
  BLOCK.SANDSTONE, BLOCK.MOSSY, BLOCK.PLANK, BLOCK.STONEBRICK, BLOCK.SLAB_STONE,
  BLOCK.SLAB_COBBLE, BLOCK.SLAB_PLANK,
  580, 581, 584,   // tuffeau, tuffeau taillé et allées de Villandry
  DECOR_START + 19 * 10, DECOR_START + 23 * 10, DECOR_START + 24 * 10,  // roche, dalles et métal de la base spatiale
  DECOR_START + 18 * 10,   // les sols de terre battue du village gaulois
  DECOR_START + 25 * 10, DECOR_START + 27 * 10,  // le sol des halles et le perron du commissariat
]);

function hauteurSol(world, x, z) {
  let y = 95;
  while (y > 0 && !world.isSolid(x, y, z)) y--;
  return y;
}

// Le niveau de référence d'un site : le premier quartile des hauteurs relevées
// autour de lui. La médiane serait tirée vers le haut par les courtines et les
// toitures ; le quartile, lui, retient le sol sur lequel on marche.
function niveauDuSite(world, centre, rayon = 42) {
  const h = [];
  for (let dz = -rayon; dz <= rayon; dz += 6) {
    for (let dx = -rayon; dx <= rayon; dx += 6) {
      const x = Math.floor(centre.x + dx), z = Math.floor(centre.z + dz);
      const y = hauteurSol(world, x, z);
      if (world.getBlock(x, y + 1, z) === BLOCK.WATER) continue;   // fond de douve
      h.push(y);
    }
  }
  if (!h.length) return 40;
  h.sort((a, b) => a - b);
  return h[Math.floor(h.length * 0.25)];
}

function praticable(world, x, z, niveau) {
  const y = hauteurSol(world, x, z);
  if (Math.abs(y - niveau) > 4) return null;        // courtine, toit, ou ravin
  if (!SOLS.has(world.getBlock(x, y, z))) return null;
  if (world.getBlock(x, y + 1, z) !== BLOCK.AIR) return null;   // sous l'eau, sous un mur
  if (world.getBlock(x, y + 2, z) !== BLOCK.AIR) return null;
  return y + 1;
}

// Cherche en spirale autour du point voulu. Sans ce filet, un décalage écrit à
// la main finit dans les douves, sur un toit ou en haut d'un arbre — c'est
// exactement ce qui s'était produit au premier placement.
function poserAuSol(world, x, z, niveau, portee = 14) {
  const bx = Math.floor(x), bz = Math.floor(z);
  for (let r = 0; r <= portee; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (r > 0 && Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const y = praticable(world, bx + dx, bz + dz, niveau);
        if (y !== null) return { x: bx + dx + 0.5, z: bz + dz + 0.5, y };
      }
    }
  }
  return null;
}

// --- assemblage --------------------------------------------------------------

function creerSite(scene, world, player, toast, centre, gens, betes, graine) {
  const niveau = niveauDuSite(world, centre);
  const npcs = [];
  const egares = [];
  gens.forEach((g, i) => {
    const profil = {
      teint: TEINTS[(i + graine) % TEINTS.length],
      cheveux: CHEVEUX[(i * 3 + graine) % CHEVEUX.length],
      ...g.profil,
    };
    const sol = poserAuSol(world, centre.x + g.dx, centre.z + g.dz, niveau);
    if (!sol) egares.push(g.nom);
    const p = sol || { x: centre.x + g.dx, z: centre.z + g.dz };
    const h = new Habitant(scene, world, player, toast, {
      name: g.nom,
      label: `${g.nom} — ${g.role} !`,
      walkSpeed: 1.5 + ((i * 7) % 5) * 0.14,
      firstSpeech: 12 + i * 9,
      rayon: g.rayon,
      metier: g.metier,
      hauteur: 1.8, largeur: 0.55,
      build: () => construireHumain(profil),
      phrases: g.mots,
    }, p.x, p.z);
    npcs.push(h);
  });

  const troupeau = [];
  for (const [espece, nb, dx, dz, r, humeur] of betes) {
    // L'enclos lui-même est recalé sur du sol praticable : si le point écrit à
    // la main tombe dans la douve, tout le troupeau y tomberait avec lui.
    const ancre = poserAuSol(world, centre.x + dx, centre.z + dz, niveau)
      || { x: centre.x + dx, z: centre.z + dz };
    const zone = { x: ancre.x, z: ancre.z, r };
    for (let k = 0; k < nb; k++) {
      const ang = Math.random() * Math.PI * 2, d = Math.random() * r;
      const sol = poserAuSol(world, zone.x + Math.sin(ang) * d, zone.z + Math.cos(ang) * d, niveau, 6);
      const q = sol || { x: zone.x, z: zone.z, y: ancre.y ?? niveau };
      const b = new Bestiole(espece, q.x, q.y + 0.15, q.z, zone, humeur);
      scene.add(b.mesh);
      troupeau.push(b);
    }
  }
  return { npcs, troupeau, centre, niveau, egares };
}

export function createVie({ scene, world, player, toast }) {
  const sites = [
    creerSite(scene, world, player, toast, CASTLE, FORTERESSE, FORTERESSE_BETES, 0),
    creerSite(scene, world, player, toast, VILLANDRY, VILLANDRY_GENS, VILLANDRY_BETES, 2),
    creerSite(scene, world, player, toast, GAULOIS, GAULOIS_GENS, GAULOIS_BETES, 4),
    creerSite(scene, world, player, toast, ESPACE, ESPACE_GENS, ESPACE_BETES, 1),
    creerSite(scene, world, player, toast, VILLE, VILLE_GENS, VILLE_BETES, 3),
  ];

  // Les habitants rejoignent la troupe animée par la boucle principale ; les
  // bêtes sont mises à jour ici, site par site.
  const npcs = sites.flatMap((s) => s.npcs);

  let sommeilForce = false;      // interrupteur de mesure, voir window.__vie

  // Le réveil se décide individu par individu, pas site par site.
  //
  // Réveiller tout un château d'un coup faisait tourner quatre-vingts
  // personnages dont les trois quarts étaient derrière l'enfant ou à l'autre
  // bout des jardins : mesuré, cela coûtait plus de quarante pour cent du temps
  // d'image à Villandry. Chacun s'anime maintenant quand il est à portée de
  // regard, et pas avant.
  const VU2 = VU * VU;

  function update(dt) {
    const px = player.pos.x, pz = player.pos.z;
    for (const site of sites) {
      // un test grossier d'abord : hors du site, on ne parcourt même pas la liste
      const dSite = Math.hypot(px - site.centre.x, pz - site.centre.z);
      const siteOuvert = !sommeilForce && dSite < PORTEE;
      if (!siteOuvert) {
        if (site.endormi) continue;
        for (const b of site.troupeau) b.mesh.visible = false;
        for (const h of site.npcs) h.mesh.visible = false;
        site.endormi = true;
        continue;
      }
      site.endormi = false;
      for (const b of site.troupeau) {
        const dx = b.pos.x - px, dz = b.pos.z - pz;
        const proche = dx * dx + dz * dz < VU2;
        if (b.mesh.visible !== proche) b.mesh.visible = proche;
        if (proche) b.update(dt, world, player, toast);
      }
      for (const h of site.npcs) {
        const dx = h.pos.x - px, dz = h.pos.z - pz;
        const proche = dx * dx + dz * dz < VU2;
        if (h.mesh.visible !== proche) h.mesh.visible = proche;
      }
    }
  }

  return {
    npcs,
    update,
    // pour les tests : éteindre toute la population permet de mesurer ce
    // qu'elle coûte réellement, au même endroit et à la même seconde
    eteindre: (v) => { sommeilForce = v; },
    sites,
    effectif: () => ({
      gens: npcs.length,
      betes: sites.reduce((n, s) => n + s.troupeau.length, 0),
    }),
  };
}
