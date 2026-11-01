// Morphologies extraites du modèle OSM de MENUDQ2 (CC BY 4.0).
// Les parcelles restent celles du monde jouable ; chaque profil conserve ses
// cours, ses ailes et ses retraits. Ce n'est pas un cadastre géoréférencé.
import { PROFILS_OSM } from './manhattan-osm-data.js';

const quartiers = new Map();
for (const p of PROFILS_OSM) {
  if (!quartiers.has(p[0])) quartiers.set(p[0], []);
  quartiers.get(p[0]).push(p);
}

export function quartierArchitecture(x, z) {
  if (z < -920) return 'heights';
  if (z < -816) return 'harlem';
  if (z < -326.4) return x < -60 ? 'west' : 'east';
  if (z < 260) return 'midtown';
  if (z < 422.4) return 'chelsea';
  if (z < 566.4) return 'village';
  if (z < 672) return 'soho';
  if (z < 792) return x < -32 ? 'tribeca' : 'chinatown';
  return 'financial';
}

export function hauteurJouable(metres) {
  // Les petits immeubles gardent des étages lisibles de 3 unités ; la partie
  // haute des tours se comprime progressivement pour tenir sous HEIGHT=160.
  // Même fonction monotone dans TOUS les quartiers, jamais un tirage de hauteur.
  const h = metres <= 36 ? metres * .65 : 23.4 + (metres - 36) * .22;
  return Math.max(6, Math.min(108, Math.round(h / 3) * 3));
}

export function profilArchitecture(x, z, seed) {
  const liste = quartiers.get(quartierArchitecture(x, z));
  return liste[(seed >>> 0) % liste.length];
}

// Le champ final est petit (une valeur par colonne du bâtiment). Collisions,
// façades proches, toit et silhouette le lisent tous : une cour ne se referme
// pas quand on recule et une terrasse dessinée porte réellement le joueur.
export function preparerArchitecture(b, sol) {
  const p = profilArchitecture((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, b.seed);
  const largeur = b.x1 - b.x0, profondeur = b.z1 - b.z0;
  b.osm = { quartier: p[0], composante: p[1], hauteur: p[6], largeur: p[4], profondeur: p[5] };
  b.h = hauteurJouable(p[6]);
  b.colonnes = new Uint8Array(largeur * profondeur);
  for (let z = 0; z < profondeur; z++)
    for (let x = 0; x < largeur; x++) {
      const u = Math.min(11, Math.floor((x + .5) / largeur * 12));
      const v = Math.min(11, Math.floor((z + .5) / profondeur * 12));
      // Broadway et les raccords diagonaux peuvent traverser l'intérieur
      // d'une boîte dont les quatre coins sont libres. Sonder CHAQUE colonne.
      const interdit = ['road', 'water', 'plaza'].includes(sol(b.x0 + x + .5, b.z0 + z + .5));
      const valeur = interdit ? 0 : parseInt(p[7][v * 12 + u], 36);
      b.colonnes[z * largeur + x] = valeur === 0 ? 0
        : Math.max(3, Math.min(b.h, Math.round(b.h * valeur / 35 / 3) * 3));
    }
  // Le sommet échantillonné peut être plus bas qu'une flèche très fine du
  // modèle. Le toit et le matériel se posent sur le champ, jamais en lévitation.
  b.h = Math.max(...b.colonnes);
  const hauteurs = new Set(b.colonnes);
  const vide = b.colonnes.filter(h => h === 0).length / b.colonnes.length;
  const quartier = p[0];
  b.architecture = p[6] > 110 ? (hauteurs.size > 2 ? 'retraits' : b.seed % 2 ? 'verre' : 'artdeco')
    : vide > .18 ? 'cour'
    : ['soho', 'tribeca'].includes(quartier) ? 'loft'
    : p[6] < 22 ? 'brownstone'
    : p[6] > 60 ? 'residentiel' : 'tenement';
  b.mat = ['verre', 'retraits'].includes(b.architecture) ? 'glass'
    : ['loft', 'artdeco', 'residentiel'].includes(b.architecture) ? 'limestone'
    : b.architecture === 'brownstone' ? 'brownstone' : 'brick';
  b.style = b.mat === 'glass' ? 'office' : 'masonry';
  // Couleurs d'architecture originales : le modèle OSM décrit les volumes,
  // ses murs orange par défaut ne sont pas des relevés de matériaux réels.
  const palettes = {
    brick: [[1.18,.88,.76],[.82,.78,.72],[1.10,1.02,.84],[.92,.70,.62]],
    brownstone: [[1.20,1.05,.90],[.92,.83,.78],[1.30,1.18,1.00],[.82,.77,.72]],
    limestone: [[1,1,1],[.83,.87,.89],[1.02,.96,.85],[.78,.79,.82]],
    glass: [[.79,.94,1.08],[.98,1.06,1.02],[.72,.83,.92],[1.08,1.00,.85]],
  };
  b.teinte = palettes[b.mat][b.seed % 4];
  b.travee = b.architecture === 'loft' || b.mat === 'glass' ? 4 : b.seed % 3 === 0 ? 2 : 3;
  b.enseigne = !['brownstone', 'residentiel'].includes(b.architecture);

  // Fusionner les rectangles de hauteur égale pour le lointain : aucune
  // colonne n'est dessinée deux fois, et les vides ne coûtent aucun triangle.
  const vus = new Uint8Array(b.colonnes.length);
  b.volumes = [];
  for (let z = 0; z < profondeur; z++)
    for (let x = 0; x < largeur; x++) {
      const i = z * largeur + x, h = b.colonnes[i];
      if (!h || vus[i]) continue;
      let w = 1, d = 1;
      while (x + w < largeur && !vus[i + w] && b.colonnes[i + w] === h) w++;
      suivant: while (z + d < profondeur) {
        for (let k = 0; k < w; k++)
          if (vus[(z + d) * largeur + x + k] || b.colonnes[(z + d) * largeur + x + k] !== h) break suivant;
        d++;
      }
      for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) vus[(z + dz) * largeur + x + dx] = 1;
      b.volumes.push({ x: b.x0 + x, z: b.z0 + z, w, d, h });
    }
}

export function sommetArchitecture(b, x, z) {
  const ix = Math.floor(x - b.x0), iz = Math.floor(z - b.z0);
  const w = b.x1 - b.x0, d = b.z1 - b.z0;
  return ix < 0 || iz < 0 || ix >= w || iz >= d ? 0 : b.colonnes[iz * w + ix];
}
