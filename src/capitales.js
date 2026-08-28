// Le tour du monde : les monuments célèbres se dressent enfin quelque part.
//
// POURQUOI CE FICHIER EXISTE. `src/monuments.js` contient vingt et un
// monuments bâtis au bloc près — Big Ben et son horloge, le Colisée et ses
// arcades, le Taj Mahal et ses quatre minarets, le Christ Rédempteur bras
// ouverts, l'Opéra de Sydney et ses voiles. Ils étaient tous fabricables, et
// aucun n'existait dans le monde : on ne pouvait que les POSER soi-même
// depuis le menu du constructeur, comme on pose un meuble. Un enfant qui
// n'ouvrait pas ce menu n'a jamais vu un seul d'entre eux.
//
// La remise à plat de la carte a levé le seul vrai obstacle. Tant que les
// villes étaient placées à la main, ajouter Londres voulait dire trouver un
// coin libre et espérer qu'il le reste. Depuis que la projection déduit la
// position d'une latitude et d'une longitude, Londres est simplement à sa
// place, et Rome à la sienne — à 1 100 blocs de là, comme dans la réalité.
//
// CE QU'ON POSE, ET CE QU'ON NE POSE PAS. Une ville entière — rues, immeubles,
// métro — c'est le travail de Paris, de Manhattan ou de Washington, et cela se
// compte en semaines. Ici on pose le monument, son parvis, et de quoi qu'il
// n'ait pas l'air tombé du ciel : le sol s'aplanit sous lui, et une esplanade
// le porte. C'est peu, et c'est exactement ce qui manquait — un but au voyage.

import { monumentBati } from './monuments.js';
import { positionDe } from './mondes.js';

// Les blocs du parvis. On reste sur ceux que le jeu connaît déjà.
const DALLE = 566;        // pavé
const HERBE = 1;

// LES SITES.
//
// Chaque entrée dit : quelle ville, quels monuments, et où chacun se pose par
// rapport au centre. Les écarts sont en blocs et restent dans le rayon déclaré
// au registre — c'est ce que vérifie `capitales.js` côté test.
//
// `sol` : la cote à laquelle on aplanit le site. Toutes les villes du jeu sont
// bâties autour de 33-34 ; on garde la même, sinon un enfant qui arrive de
// Paris tomberait dans un trou ou sur une falaise.
export const SITES = [
  {
    cle: 'londres', emoji: '🇬🇧', sol: 34, parvis: 46,
    monuments: [
      { id: 'big-ben', du: -16, dv: -10 },
      { id: 'tower-bridge', du: 18, dv: 12 },
    ],
  },
  {
    cle: 'rome', emoji: '🇮🇹', sol: 34, parvis: 38,
    monuments: [{ id: 'colisee', du: 0, dv: 0 }],
  },
  {
    cle: 'barcelone', emoji: '🇪🇸', sol: 34, parvis: 32,
    monuments: [{ id: 'sagrada', du: 0, dv: 0 }],
  },
  {
    cle: 'pise', emoji: '🗼', sol: 34, parvis: 24,
    monuments: [{ id: 'tour-pise', du: 0, dv: 0 }],
  },
  {
    cle: 'gizeh', emoji: '🇪🇬', sol: 34, parvis: 42,
    monuments: [{ id: 'pyramide-gizeh', du: 0, dv: 0 }],
  },
  {
    cle: 'agra', emoji: '🇮🇳', sol: 34, parvis: 38,
    monuments: [{ id: 'taj-mahal', du: 0, dv: 0 }],
  },
  {
    cle: 'sydney', emoji: '🇦🇺', sol: 34, parvis: 32,
    monuments: [{ id: 'opera-sydney', du: 0, dv: 0 }],
  },
  {
    cle: 'rio', emoji: '🇧🇷', sol: 34, parvis: 32,
    monuments: [{ id: 'christ-redempteur', du: 0, dv: 0 }],
  },
  {
    cle: 'seattle', emoji: '🇺🇸', sol: 34, parvis: 28,
    monuments: [{ id: 'space-needle', du: 0, dv: 0 }],
  },
];

// La position d'un site, lue au registre. On la calcule une fois : `positionDe`
// reprojette à chaque appel, et ces listes sont parcourues à chaque morceau de
// terrain engendré.
const cachePos = new Map();
export function positionSite(cle) {
  if (!cachePos.has(cle)) cachePos.set(cle, positionDe(cle));
  return cachePos.get(cle);
}

// --- le relief ---------------------------------------------------------------

// Le site aplanit le sol sous lui, avec un fondu sur le pourtour — sans quoi le
// Colisée se retrouverait à cheval sur une colline, une moitié enterrée.
//
// C'est la même mécanique que pour les villes déjà bâties, et elle obéit à la
// même règle : au-delà du fondu, on rend la hauteur telle quelle, au bloc près.
// C'est ce qui permet au témoin `plafond.js` de jurer que le paysage n'a pas
// bougé hors des villes.
const FONDU = 24;

export function hauteurCapitales(x, z, h) {
  for (const s of SITES) {
    const p = positionSite(s.cle);
    const d = Math.hypot(x - p.x, z - p.z);
    if (d > s.parvis + FONDU) continue;
    if (d <= s.parvis) return s.sol;
    // le fondu : du sol du site vers le terrain naturel
    const t = (d - s.parvis) / FONDU;
    return Math.round(s.sol + (h - s.sol) * t);
  }
  return h;
}

// Le sol du parvis : dallé au centre, herbe sur le pourtour.
export function solCapitales(x, z) {
  for (const s of SITES) {
    const p = positionSite(s.cle);
    const d = Math.hypot(x - p.x, z - p.z);
    if (d <= s.parvis) return d <= s.parvis - 6 ? DALLE : HERBE;
  }
  return null;
}

// Sommes-nous dans un site ? La question que se pose le générateur avant de
// planter un arbre au milieu du Taj Mahal.
export function dansUneCapitale(x, z) {
  return SITES.some((s) => {
    const p = positionSite(s.cle);
    return Math.hypot(x - p.x, z - p.z) <= s.parvis;
  });
}

// --- ce que la carte et le monde lisent --------------------------------------

// Un LANDMARK par monument : c'est la forme que `world.js` sait bâtir. Le
// constructeur rejoue les blocs du monument déjà fabriqué, posés sur le sol du
// site — `monumentBati` les rend en coordonnées relatives, base en y = 0.
export function landmarksCapitales() {
  const out = [];
  for (const s of SITES) {
    const p = positionSite(s.cle);
    for (const m of s.monuments) {
      const bati = monumentBati(m.id);
      if (!bati) continue;
      // La boîte doit contenir le monument ENTIER : un rayon trop court le
      // ferait tronquer au bord d'un morceau de terrain, et il manquerait une
      // tranche de Big Ben sans que rien ne le signale.
      const box = Math.ceil(Math.max(bati.emprise.l, bati.emprise.p) / 2) + 2;
      out.push({
        name: bati.nom,
        x: p.x + m.du,
        z: p.z + m.dv,
        box,
        build: (poser) => {
          const e = bati.emprise;
          const cx = Math.round((e.minX + e.maxX) / 2);
          const cz = Math.round((e.minZ + e.maxZ) / 2);
          for (const [bx, by, bz, id] of bati.blocs) {
            // centré sur le point du monument, posé sur le sol du site
            poser(bx - cx, s.sol - 33 + (by - e.minY), bz - cz, id);
          }
        },
      });
    }
  }
  return out;
}

// Les destinations : une par ville, plus une par monument. Sans elles, on
// arriverait « à Londres » sans savoir de quel côté regarder.
export function placesCapitales() {
  const out = [];
  for (const s of SITES) {
    const p = positionSite(s.cle);
    out.push({ name: p.nom, x: p.x, z: p.z, r: p.r });
    for (const m of s.monuments) {
      const bati = monumentBati(m.id);
      if (bati) out.push({ name: bati.nom, x: p.x + m.du, z: p.z + m.dv, r: 0 });
    }
  }
  return out;
}
