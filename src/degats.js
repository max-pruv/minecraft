// LES DÉGÂTS DE LA VOITURE QUE L'ENFANT CONDUIT — la partie PURE (v338).
//
// Max, 4 octobre 2026 : « Comme dans GTA, quand tu crashes ton véhicule, il
// s'abîme, tu vois vraiment les défauts de carrosserie… La voiture perd son
// sens, à un moment elle ne marche plus, potentiellement elle prend feu, on se
// retrouve à sortir de la voiture. »
//
// Ce fichier ne sait RIEN de three ni du document : il tient la santé d'une
// voiture, zone par zone, et dit ce qu'elle fait à la conduite. Il se lit sous
// node (`tests/degats.js`), comme `palier.js` ou `feux.js` — une règle qu'un
// témoin ne peut pas appeler sans navigateur finit par n'être éprouvée que par
// des captures. La partie qui se VOIT (carrosserie enfoncée, vitres étoilées,
// fumée, flammes) vit dans `degats3d.js`, et elle lit celle-ci.
//
// LE CONTRAT AVEC LES AUTRES SESSIONS DU CHANTIER « CONDUITE » :
//   lu      `player.choc = { force 0..1, t, x, z }` — le point d'impact en
//           coordonnées du MONDE, publié par la physique ; tant qu'il n'existe
//           pas, `detecterChoc` le déduit d'une chute brutale de vitesse.
//   écrit   `player.etatVoiture = { sante, moteur, direction, enPanne, enFeu }`
//           — `direction` est un biais de cap en radians par seconde, positif
//           vers la GAUCHE (le sens où `player.yaw` augmente), à pleine
//           vitesse ; il se réduit avec l'allure comme le volant (v262).
//
// JEU POUR ENFANTS DE SEPT ET NEUF ANS : PERSONNE N'EST JAMAIS BLESSÉ. Rien ici
// ne compte une santé de l'enfant ; c'est la VOITURE qui s'abîme, et sous le
// seuil critique elle prend feu et l'enfant est déposé à côté, sain et sauf.

// LES ZONES d'une voiture, dans son propre repère : le nez est en −z (c'est la
// convention des montures, `fun.js` : rotation.y = cap), la droite en +x.
export const ZONES = ['avant', 'arriere', 'gauche', 'droite', 'toit'];

// Les seuils, et ce qu'ils veulent dire pour l'enfant. Ils se lisent sur la
// SANTÉ globale (1 neuve, 0 détruite), qui baisse de `PERTE_SANTE × force` à
// chaque choc : un mur pris à pleine vitesse (force 1) en retire trois
// dixièmes. Trois gros chocs mettent la voiture en panne, quatre la font
// brûler — assez pour que l'enfant le voie venir (la fumée, puis la panne),
// pas assez pour que ce soit une corvée.
export const SEUIL_CHOC = 0.06;     // en dessous, une bordure frôlée : rien
export const PERTE_SANTE = 0.3;
export const PERTE_ZONE = 0.55;     // une zone prend plus que l'ensemble
export const SEUIL_FUMEE = 0.75;    // le moteur fume sous ce niveau
export const SEUIL_PANNE = 0.3;     // la voiture cale (santé ou moteur)
export const SEUIL_FEU = 0.12;      // le feu prend
// Le feu, en secondes RÉELLES (v226 : un feu ne doit pas durer trois fois plus
// longtemps parce que la tablette rame). L'enfant a d'abord le temps de lire
// le bandeau et de descendre lui-même ; passé ce délai, le jeu le dépose.
export const DELAI_SORTIE = 3.5;
export const DUREE_FEU = 14;        // puis il s'éteint : une carcasse fumante
export const DUREE_CARCASSE = 90;   // puis elle s'en va

// Les dimensions d'une voiture de la flotte, publiées par vehicules.js
// (`DEMI_LONG_VOITURE`, `DEMI_LARG_VOITURE`) et recopiées ici parce que ce
// fichier ne doit rien importer : il est lu sous node.
export const DEMI_LONG = 2.2;
export const DEMI_LARG = 1.13;

export function etatNeuf() {
  return {
    zones: { avant: 1, arriere: 1, gauche: 1, droite: 1, toit: 1 },
    sante: 1, moteur: 1, direction: 0,
    enPanne: false, enFeu: false, eteint: false,
    feu: 0,          // secondes depuis que le feu a pris
    carcasse: 0,     // secondes depuis qu'il s'est éteint
    chocs: [],       // les impacts, pour rejouer la déformation (réseau)
  };
}

// Un point du MONDE dans le repère de la voiture. `cap` est la rotation y du
// maillage (celle du joueur au volant) : l'avant du monde (−sin cap, −cos cap)
// tombe sur (0, −1), le nez.
export function versRepere(px, pz, cap, wx, wz) {
  const dx = wx - px, dz = wz - pz;
  const c = Math.cos(cap), s = Math.sin(cap);
  return { lx: dx * c - dz * s, lz: dx * s + dz * c };
}

// La zone touchée, par le côté de la boîte que l'impact regarde le plus.
export function zoneDe(lx, lz, demiLong = DEMI_LONG, demiLarg = DEMI_LARG) {
  const nx = lx / demiLarg, nz = lz / demiLong;
  if (Math.abs(nz) >= Math.abs(nx)) return nz < 0 ? 'avant' : 'arriere';
  return nx < 0 ? 'gauche' : 'droite';
}

const borner = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// Ce que la santé des zones fait à la mécanique. Une seule fonction, lue après
// chaque choc et par un témoin.
export function deriver(e) {
  const z = e.zones;
  // LE MOTEUR EST À L'AVANT, et il souffre aussi de l'ensemble : une voiture
  // percutée trois fois par l'arrière finit par caler, elle aussi.
  e.moteur = borner(Math.min(z.avant, e.sante + 0.25));
  // LA DIRECTION TIRE DU CÔTÉ ABÎMÉ : un flanc gauche enfoncé (gauche < droite)
  // rend un biais positif, c'est-à-dire vers la gauche. Un avant très touché
  // ajoute un peu de jeu, du côté du flanc le plus abîmé.
  const flancs = z.droite - z.gauche;
  const jeu = (1 - z.avant) * 0.05 * Math.sign(flancs || 0);
  e.direction = borner(flancs * 0.35 + jeu, -0.3, 0.3);
  if (e.sante <= SEUIL_PANNE || e.moteur <= SEUIL_PANNE) e.enPanne = true;
  if (e.sante <= SEUIL_FEU && !e.eteint) e.enFeu = true;
  return e;
}

// Un choc : `force` 0..1, le point en coordonnées de la VOITURE. Rend la zone
// touchée, ou null pour un frôlement. Mute `e`.
export function subirChoc(e, { force, lx = 0, lz = -DEMI_LONG }, dims = {}) {
  const f = borner(force || 0);
  if (f < SEUIL_CHOC || e.eteint) return null;
  const zone = zoneDe(lx, lz, dims.demiLong, dims.demiLarg);
  e.zones[zone] = borner(e.zones[zone] - PERTE_ZONE * f);
  // un choc très fort secoue aussi le toit (la caisse se tord)
  if (f > 0.7) e.zones.toit = borner(e.zones.toit - (f - 0.7) * 0.5);
  e.sante = borner(e.sante - PERTE_SANTE * f);
  e.chocs.push({ f: Math.round(f * 100) / 100, x: Math.round(lx * 100) / 100, z: Math.round(lz * 100) / 100 });
  if (e.chocs.length > 12) e.chocs.shift();
  deriver(e);
  return zone;
}

// CE QUE LES DÉGÂTS FONT À LA CONDUITE. `allure` multiplie l'allure de la
// classe (l'accélération suit, elle est une fraction de l'allure — v262) ;
// `biais` est le cap que la voiture prend toute seule, en rad/s à pleine
// vitesse. En panne, l'allure est nulle : la voiture ne repart plus.
export function effetsConduite(e) {
  if (!e) return { allure: 1, biais: 0 };
  if (e.enPanne || e.enFeu || e.eteint) return { allure: 0, biais: 0 };
  return { allure: 0.35 + 0.65 * e.moteur, biais: e.direction };
}

// Ce que la physique lit (le contrat) : cinq nombres, rien de plus.
export function publier(e) {
  return {
    sante: Math.round(e.sante * 1000) / 1000,
    moteur: Math.round(e.moteur * 1000) / 1000,
    direction: Math.round(e.direction * 1000) / 1000,
    enPanne: !!e.enPanne, enFeu: !!e.enFeu,
  };
}

// LE REPLI, tant que la physique ne publie pas `player.choc` : une chute de
// vitesse qu'aucun frein ne peut expliquer. Freiner retire au plus
// `FREIN × allure × dt` (player.js : 2,5 fois l'allure par seconde) ; un mur
// ramène la vitesse au déplacement obtenu, c'est-à-dire presque zéro, en UNE
// image (v272). Rend la force 0..1, ou 0. `vmax` est le plafond de la classe.
export const FREIN = 2.5;
export const V_CHOC_PLEIN = 22;     // une chute de 22 b/s est un choc de force 1
export function detecterChoc(avant, apres, dt, vmax) {
  const a = Math.abs(avant || 0), b = Math.abs(apres || 0);
  const chute = a - b;
  const attendu = FREIN * (vmax || 0) * Math.max(0, dt || 0);
  if (chute <= Math.max(2.5, attendu * 1.5 + 1.5)) return 0;
  return borner(chute / V_CHOC_PLEIN);
}

// Le temps du feu et de la carcasse. Rend ce qui vient de se passer, pour que
// le jeu le dise : 'sortir' (le délai de lecture est passé, on dépose
// l'enfant), 'eteint', 'partie' (la carcasse s'en va), ou null.
export function avancerFeu(e, dtReel, conduite = false) {
  if (e.enFeu) {
    const avant = e.feu;
    e.feu += dtReel;
    if (conduite && avant < DELAI_SORTIE && e.feu >= DELAI_SORTIE) return 'sortir';
    if (e.feu >= DUREE_FEU) { e.enFeu = false; e.eteint = true; e.carcasse = 0; return 'eteint'; }
    return null;
  }
  if (e.eteint) {
    const avant = e.carcasse;
    e.carcasse += dtReel;
    if (avant < DUREE_CARCASSE && e.carcasse >= DUREE_CARCASSE) return 'partie';
  }
  return null;
}

// LE RÉSEAU (palier 2) : un champ COURT dans le message `pos` (`p.v.d`), que
// une tablette restée sur l'ancienne version ignore — le receveur cède. On
// envoie les impacts (pour que l'ami rejoue la même déformation) et l'état du
// feu ; rien de plus.
export function versReseau(e) {
  if (!e || !e.chocs.length) return null;
  return { c: e.chocs.map((k) => [k.f, k.x, k.z]), f: e.enFeu ? 1 : e.eteint ? 2 : 0 };
}
export function depuisReseau(d) {
  const e = etatNeuf();
  if (!d || !Array.isArray(d.c)) return e;
  for (const [f, x, z] of d.c) subirChoc(e, { force: f, lx: x, lz: z });
  if (d.f === 1) { e.enFeu = true; e.eteint = false; }
  else if (d.f === 2) { e.enFeu = false; e.eteint = true; }
  else e.enFeu = false;
  return e;
}
