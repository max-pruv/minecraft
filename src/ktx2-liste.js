// LES MODÈLES DÉPOSÉS DONT LES TEXTURES EXISTENT AUSSI EN KTX2 (mémoire, v590).
//
// Sans import : le script hors ligne (`scripts/compresser-textures-ktx2.mjs`),
// le jeu (`ktx2.js`) et les témoins sous node lisent la MÊME liste. Chaque
// entrée est le fichier que le jeu charge aujourd'hui (`asset` s'il existe,
// sinon `fichier`, règle v545) ; sa version KTX2 est un fichier NEUF à côté,
// donc une URL neuve (`nomKTX2`), et l'original reste dans le dépôt : une
// tablette restée sur l'ancienne version le demande encore, et `?ktx2=0`
// le rend pour comparer.
//
// Les modèles sans aucune image (Chiron Stealth, Lucid Gravity, Rolls Ghost,
// Cybertruck) n'y sont pas : il n'y a rien à comprimer.
export const MODELES_KTX2 = [
  ['voitures', 'ferrari-sf90-xx.glb'],
  ['voitures', 'lamborghini-revuelto-wip.glb'],
  ['voitures', 'maserati-mc12-gt1.glb'],
  ['voitures', 'porsche-911-gt3-rs-hd-v2-compact.glb'],
  ['voitures', 'tesla-model-y.glb'],
  ['voitures', 'aston-martin-victor.glb'],
  ['voitures', 'aston-martin-db11.glb'],
  ['voitures', 'alpine-a110-gt4.glb'],
  ['voitures', 'bentley-mulliner-batur.glb'],
  ['voitures', 'gmc-hummer-ev.glb'],
  ['voitures', 'chevrolet-camaro-ss-1967.glb'],
  ['voitures', 'cadillac-escalade-esv.glb'],
  ['voitures', 'renault-fuego.glb'],
  ['voitures', 'porsche-cayenne-turbo-gt.glb'],
  ['voitures', 'abt-audi-rs6-r.glb'],
  ['voitures', 'porsche-992-gt3-r.glb'],
  ['voitures', 'bugatti-divo.glb'],
  ['voitures', 'ford-f150-raptor-r.glb'],
  ['voitures', 'ford-mondeo-taxi.glb'],
  ['voitures', 'generique-citadine.glb'],
  ['voitures', 'generique-coupe.glb'],
  ['voitures', 'generique-compacte.glb'],
  ['voitures', 'generique-monospace.glb'],
  ['voitures', 'generique-tout-terrain.glb'],
  ['voitures', 'generique-pickup.glb'],
  ['voitures', 'generique-berline.glb'],
  ['voitures', 'generique-supercar.glb'],
  ['voitures', 'generique-suv.glb'],
  ['voitures', 'generique-break.glb'],
  ['voitures', 'lucid-air-sapphire.glb'],
  ['voitures', 'police-car.glb'],
  ['voitures', 'police-suv.glb'],
  ['voitures', 'moto-police.glb'],
  ['avions', 'airbus-a320.glb'],
  ['avions', 'airbus-a321.glb'],
  ['avions', 'chasseur-f35.glb'],
  ['avions', 'jet-prive.glb'],
  ['newyork', 'empire-state.glb'],
  ['newyork', 'statue-liberte.glb'],
  ['newyork', 'quartiers.glb'],
  // Les corps Rocketbox (humains.js) : neuf fichiers, 38 images en RGBA,
  // le premier poste de textures une fois la flotte comprimée. Les maillages
  // à squelette passent par le même script : il vérifie aussi les os, les
  // poids et les animations, octet pour octet.
  ['humains', 'homme-chemise.glb'],
  ['humains', 'homme-veste.glb'],
  ['humains', 'homme-denim.glb'],
  ['humains', 'homme-costume.glb'],
  ['humains', 'femme-tailleur.glb'],
  ['humains', 'femme-chemise.glb'],
  ['humains', 'femme-manteau.glb'],
  ['humains', 'garcon.glb'],
  ['humains', 'fille.glb'],
  ['humains', 'policier.glb'],
];
export const nomKTX2 = (f) => f.replace(/\.glb$/, '-ktx2.glb');

const AVEC = new Set(MODELES_KTX2.map(([d, f]) => d + '/' + f));
// L'URL KTX2 d'une URL de modèle (`./vendor/<dossier>/<fichier>`), ou null
// s'il n'en a pas.
export function urlKTX2(url) {
  const m = /vendor\/([a-z]+)\/([^/?#]+\.glb)$/.exec(url || '');
  if (!m || !AVEC.has(m[1] + '/' + m[2])) return null;
  return url.slice(0, url.length - m[2].length) + nomKTX2(m[2]);
}
