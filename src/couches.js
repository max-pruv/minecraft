// Les couches de rendu — ce que chaque caméra a le droit de voir.
//
// LA SONDE DES REFLETS NE DESSINE QUE LE DÉCOR (v245). Elle rend six faces
// de 128 px autour de la voiture la plus proche ; chacune soumettait au
// pilote TOUS les appels de dessin de la scène, personnages (onze maillages
// chacun), voitures (trente-deux), créatures compris — mesuré au banc au
// centre de Paris : 200, 455, 15, 149, 240 et 282 appels pour les six faces,
// autant que la vue de l'enfant elle-même. Sur une tablette, le goulot est le
// nombre d'appels (voir « Ce qui se dessine, et ce qui coûte » dans
// CLAUDE.md) : chaque capture coûtait donc jusqu'à six images de travail
// processeur. Or à 128 px un passant fait trois pixels sur un capot : ce qui
// se voit dans une carrosserie, c'est le ciel, les façades et la rue. Le
// décor porte donc une couche à lui, la sonde ne regarde que celle-là, et la
// caméra de l'enfant voit tout.
//
// Deux couches à nous, plus celle par défaut, et la règle est celle de
// `montable` ou `vole` : la couche se pose LÀ OÙ L'OBJET ENTRE DANS LA
// SCÈNE, jamais dans une liste tenue ailleurs. `Object3D.clone()` recopie la
// couche.

// La carrosserie : elle lit la texture cubique, elle ne peut donc pas être
// dedans (WebGL refuse la boucle de rétroaction). Seule la caméra de l'enfant
// la voit.
export const COUCHE_CARROSSERIE = 2;
// Le décor : morceaux du monde, eau, ciel, paysage lointain, Manhattan. C'est
// tout ce que la sonde des reflets a le droit de dessiner.
export const COUCHE_DECOR = 4;

// Marque un objet, et tout ce qu'il porte, comme décor. Rend l'objet.
export function decor(objet) {
  if (!objet) return objet;
  objet.traverse((o) => o.layers.enable(COUCHE_DECOR));
  return objet;
}

// La caméra de l'enfant voit tout : le décor, la carrosserie, et la couche
// par défaut où vit le reste.
export function voirTout(camera) {
  camera.layers.enable(COUCHE_CARROSSERIE);
  camera.layers.enable(COUCHE_DECOR);
  return camera;
}

// Une caméra de reflet ne voit que le décor.
export function voirLeDecor(camera) {
  camera.layers.set(COUCHE_DECOR);
  return camera;
}
