// La garnison du château et les assaillants qui viennent l'attaquer.
//
// Une petite scène qui se rejoue toute seule : les gardes tiennent leurs
// postes, une bande approche depuis la forêt, l'assaut se déroule devant le
// pont-levis, puis les assaillants battent en retraite. Personne ne meurt et
// il n'y a rien à comprendre — c'est un spectacle, pas une mécanique de jeu.
//
// Tout est suspendu tant que l'enfant n'est pas à portée de vue du château :
// inutile de faire marcher onze personnages à l'autre bout de la carte.

import { BaseNPC } from './marlon.js';
import { CASTLE } from './world.js';

const R_MUR = 16;                 // demi-côté de la courtine, comme dans le bâti
const PORTE = { x: CASTLE.x, z: CASTLE.z - R_MUR - 6 };   // devant la herse
const CAMP = { x: CASTLE.x, z: CASTLE.z - 44 };           // le camp, hors de portée d'arc
const VISIBLE = 110;              // au-delà, la scène est en pause

// Durées du cycle, en secondes.
const CALME = 105, APPROCHE = 26, ASSAUT = 34, RETRAITE = 20;

const ACIER = 0xb8bcc4, CUIR = 0x6a4a2a;

function poste(dx, dz) {
  return { x: CASTLE.x + dx, z: CASTLE.z + dz };
}

// Les quatre coins et les deux côtés de la porte : un garde par tour d'angle,
// deux devant l'entrée.
const POSTES = [
  poste(-13, -13), poste(13, -13), poste(-13, 13), poste(13, 13),
  poste(-3, -R_MUR - 2), poste(3, -R_MUR - 2),
];

class Combattant extends BaseNPC {
  constructor(scene, world, player, toast, opts, x, z) {
    super(scene, world, player, toast, opts);
    this.attache = { x, z };      // poste de garde, ou emplacement au camp
    this.cible = { x, z };        // là où il veut aller maintenant
    this.balance = Math.random() * Math.PI * 2;
    this.placeAt(x, z, 40);
  }

  // Marche vers la cible et s'arrête à un pas d'elle, sinon les personnages
  // se piétinent en tremblant sur place.
  think() {
    const dx = this.cible.x - this.pos.x, dz = this.cible.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.2) {
      // au repos, il balaie lentement l'horizon du regard
      this.balance += 0.004;
      return { speed: 0, yaw: this.reposYaw + Math.sin(this.balance) * 0.9 };
    }
    return { speed: this.walkSpeed, yaw: Math.atan2(-dx, -dz) };
  }
}

export function createSiege({ scene, world, player, toast, emojiBurst, clang }) {
  const gardes = [];
  const NOMS_GARDES = ['Gontran', 'Berthe', 'Anselme', 'Aliénor', 'Godefroy', 'Mahaut'];
  POSTES.forEach((p, i) => {
    const g = new Combattant(scene, world, player, toast, {
      name: NOMS_GARDES[i],
      label: `${NOMS_GARDES[i]} — garde du château !`,
      walkSpeed: 1.9,
      firstSpeech: 18 + i * 11,
      look: {
        skin: [0xe8bd93, 0xc98a5e, 0xa56b42][i % 3], hair: 0x3a2a1a,
        torsoSlabs: [ACIER, 0xd83a3a, ACIER, ACIER, ACIER],
        sleeveSegs: [ACIER, ACIER, ACIER],
        pants: 0x4a4a54, shoes: 0x3a2a1a,
        hairstyle: 'short', hat: ACIER,
        epee: 0xd8dce4, bouclier: 0xd83a3a,
      },
      phrases: [
        'Halte ! Qui va là ?',
        'La porte est bien gardée.',
        'Monte sur la tour, on voit loin !',
        'Les assaillants reviennent toujours…',
        'Le donjon n\'est jamais tombé.',
        'Tiens bon, le pont-levis !',
      ],
    }, p.x, p.z);
    // face à l'extérieur : le regard tourné vers la campagne qu'il surveille
    g.reposYaw = Math.atan2(-(p.x - CASTLE.x), -(p.z - CASTLE.z));
    gardes.push(g);
  });

  const assaillants = [];
  const NOMS_ASSAUT = ['Rôdeur', 'Brigand', 'Sanglier', 'Corbeau', 'Renard'];
  NOMS_ASSAUT.forEach((nom, i) => {
    const x = CAMP.x - 8 + i * 4, z = CAMP.z - (i % 2) * 3;
    const a = new Combattant(scene, world, player, toast, {
      name: nom,
      label: `${nom} — assaillant du château !`,
      walkSpeed: 2.1,
      firstSpeech: 999,           // ils ne bavardent pas, ils crient à l'assaut
      look: {
        skin: [0xc98a5e, 0xa56b42, 0xe8bd93][i % 3], hair: 0x1c1c1c,
        torsoSlabs: [CUIR, 0x2e2e38, CUIR, CUIR, 0x2e2e38],
        sleeveSegs: [CUIR, CUIR, CUIR],
        pants: 0x3a2a1a, shoes: 0x2a1a10,
        hairstyle: 'short', hat: 0x4a3a2a,
        epee: 0x8a8f98, bouclier: 0x3a2a1a,
      },
      phrases: ['À l\'assaut !', 'Le château sera à nous !', 'En avant !'],
    }, x, z);
    a.reposYaw = 0;
    a.rang = i;
    assaillants.push(a);
  });

  let phase = 'calme';
  let reste = 45;                  // la première attaque ne se fait pas attendre
  let etincelles = 0;

  const proche = () => Math.hypot(player.pos.x - CASTLE.x, player.pos.z - CASTLE.z) < VISIBLE;

  function passerA(nouvelle) {
    phase = nouvelle;
    if (phase === 'approche') {
      reste = APPROCHE;
      // les assaillants convergent vers le pont-levis, en ligne
      assaillants.forEach((a, i) => { a.cible = { x: PORTE.x - 6 + i * 3, z: PORTE.z - 10 }; });
      if (proche()) toast('🐎 Des assaillants approchent du château !', 0xe8892c);
    } else if (phase === 'assaut') {
      reste = ASSAUT;
      assaillants.forEach((a, i) => { a.cible = { x: PORTE.x - 4 + i * 2, z: PORTE.z - 1 }; });
      // toute la garnison converge vers la porte : les tours se vident
      gardes.forEach((g, i) => { g.cible = { x: PORTE.x - 5 + i * 2, z: PORTE.z + 2 }; });
      if (proche()) toast('⚔️ L\'assaut commence — les gardes tiennent la porte !', 0xd83a3a);
    } else if (phase === 'retraite') {
      reste = RETRAITE;
      assaillants.forEach((a) => { a.cible = { ...a.attache }; });
      if (proche()) toast('🛡️ Les assaillants battent en retraite ! Le château tient bon.', 0x58b04c);
    } else {
      reste = CALME;
      gardes.forEach((g) => { g.cible = { ...g.attache }; });
      assaillants.forEach((a) => { a.cible = { ...a.attache }; });
    }
  }

  function update(dt) {
    // Hors de vue, la scène ne tourne pas : le cycle attend l'arrivée du
    // joueur au lieu de se dérouler dans le vide. Les personnages eux-mêmes
    // sont animés par la boucle principale, avec les autres.
    if (!proche()) return;

    reste -= dt;
    if (reste <= 0) {
      passerA(phase === 'calme' ? 'approche'
        : phase === 'approche' ? 'assaut'
        : phase === 'assaut' ? 'retraite' : 'calme');
    }

    // Pendant l'assaut, des étincelles jaillissent entre les lignes. Espacées,
    // sinon l'écran se couvre d'emojis et le combat devient illisible.
    if (phase === 'assaut') {
      etincelles -= dt;
      if (etincelles <= 0) {
        etincelles = 1.1 + Math.random() * 0.9;
        if (Math.hypot(player.pos.x - PORTE.x, player.pos.z - PORTE.z) < 40) {
          emojiBurst?.(['⚔️', '✨', '🛡️'], 7);
          clang?.();
        }
      }
    }
  }

  return {
    npcs: [...gardes, ...assaillants],
    update,
    // pour les tests : l'état de la scène, sans avoir à l'attendre
    phase: () => phase,
    forcer: (p) => passerA(p),
  };
}
