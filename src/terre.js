// La Terre : ses continents, relevés pour de vrai.
//
// POURQUOI CE FICHIER EXISTE. Max, devant la carte : « quand je regarde la
// carte, je ne reconnais pas la vraie carte du monde… je veux une espèce de
// carte du monde un peu réduite. » Les villes étaient posées sur leurs vraies
// coordonnées depuis v164 — mais autour d'elles, il n'y avait RIEN : du bruit
// de terrain, ni Atlantique entre Paris et New York, ni Manche entre Londres
// et Lille. Une ville bien placée sur une carte qui n'existe pas reste
// introuvable.
//
// CE QUE CE FICHIER SAIT : pour une latitude et une longitude, dire si c'est
// la terre ou la mer. Les côtes sont des polygones relevés au degré près —
// c'est la précision d'un planisphère scolaire, et c'est exactement le niveau
// demandé : qu'on RECONNAISSE la forme de l'Europe, de l'Afrique, des deux
// Amériques, de l'Australie. Au dézoom de la carte entière, un degré fait
// deux pixels : plus fin serait invisible, moins fin serait faux.
//
// CE QU'IL NE SAIT PAS, ET C'EST VOULU : la mer Noire, la Caspienne, la
// Baltique fine, les mille îles. Elles viendront si un enfant les cherche.
// Un planisphère se reconnaît à ses grandes masses, pas à ses détroits.
//
// Les données sont des FAITS géographiques — le contour des continents
// n'appartient à personne.

// Chaque contour : [lon, lat, lon, lat, …], dans l'ordre, sans se refermer
// (le test referme tout seul). Les noms servent au diagnostic, pas au jeu.
const CONTOURS = [
  ['eurasie', [
    // Ibérie et façade atlantique
    -9.5, 37, -9, 43.5, -1.8, 43.6, -4.8, 48.4, -1.5, 49.7,
    // la Manche côté sud, puis la mer du Nord
    1.6, 50.9, 3.3, 51.4, 4.8, 52.5, 6.8, 53.5,
    // Danemark, et l'entrée de la Baltique
    8.2, 55.5, 8.1, 56.8, 10.3, 57.7, 10.8, 54.8, 13.5, 54.3,
    // la Baltique sud, puis la remontée vers la Scandinavie par l'est
    18.5, 54.8, 21, 56.8, 24.5, 59.4, 29, 60.2,
    // la Finlande et la Scandinavie, à grands traits
    24, 65.3, 21.5, 68.5, 15, 68.9, 5, 62, 5.5, 58.5, 8, 57.9,
    9.5, 59, 11.5, 58.9, 12.8, 55.4, 14, 55.8, 18, 62, 21.3, 63.5, 25.5, 65,
    // le grand Nord russe et la Sibérie
    33, 66.5, 40, 68, 60, 69, 78, 73, 100, 77, 113, 74, 130, 71, 150, 70,
    170, 67, 178, 65,
    // le Pacifique : Tchoukotka, Kamtchatka, la mer d'Okhotsk
    178, 62, 162, 58, 156, 51, 152, 59, 142, 54, 135, 45, 131, 43,
    // la Corée et la mer Jaune
    129.5, 38.5, 129, 35, 126.5, 34.5, 126, 37.5, 122, 39, 122, 37,
    // la côte chinoise, le golfe du Tonkin, le Vietnam
    121, 32, 120, 28, 117, 23, 110, 20, 108, 18, 109, 12, 105, 9,
    // le golfe de Thaïlande et la péninsule malaise
    100, 13, 103, 1.5, 98, 8, 94, 16,
    // le golfe du Bengale et l'Inde
    91, 22, 87, 21, 80, 15, 77, 8, 73, 15, 70, 21, 66, 25,
    // l'Iran, le détroit d'Ormuz, l'Arabie
    57, 26, 56, 27, 48, 30, 51, 24, 56, 24, 59, 22, 52, 16, 44, 12.5,
    // la mer Rouge, le Sinaï, la Méditerranée orientale
    39, 15, 35, 28, 32.7, 29.6, 34, 31, 36, 36,
    // la Turquie et l'Égée
    30, 36, 27, 37, 26, 40,
    // la Grèce et l'Adriatique
    24.2, 38.4, 23.4, 37.6, 22, 36.5, 19, 40, 16, 43, 13.5, 45.5,
    // l'Italie : la botte
    14, 42, 16, 41.5, 18.4, 40, 17, 39.5, 16, 38, 15.9, 38.3,
    14, 40.5, 12, 42, 10, 44, 8.5, 44.3,
    // la Côte d'Azur — Nice est ici — puis l'Espagne
    7.3, 43.7, 5, 43.3, 3.3, 42.4, 2.0, 41.2, 0.5, 39.8, -0.3, 38.5, -2, 36.8, -5.4, 36,
    -7, 37,
  ]],
  ['afrique', [
    -6, 35.2, 10, 37.3, 11, 33.5, 15, 32, 20, 32.5, 25, 31.5, 32, 31,
    32.7, 29.6, 36, 22, 39, 15.5, 43, 11.5, 51.2, 11.8, 48, 5, 41, -2,
    40, -7, 35, -18, 33, -26, 26, -34.2, 18, -34.4, 15, -27, 12, -18,
    9, -5, 9, 0, 6, 4, 0, 5, -5, 5, -8, 4.5, -13, 8, -17, 15,
    -16, 20, -13, 27, -10, 31,
  ]],
  ['amerique-nord', [
    -166, 64, -156, 71, -130, 70, -110, 73, -95, 72, -82, 73, -70, 63,
    -60, 55, -66, 50, -70, 47, -60, 45, -70, 42, -74, 40.5, -75.5, 38,
    -76, 35, -80, 32, -80, 26, -80.3, 25.2, -81.5, 25, -83, 29, -90, 29, -94, 29.5,
    -97, 26, -97, 21, -90, 21, -87, 21.5, -89, 16, -83, 15, -80, 9,
    -85, 10, -94, 16, -105, 20, -110, 23, -114, 29, -117, 32.5,
    -120, 34.5, -123, 37.4, -124, 40, -124, 46, -125, 49, -135, 58,
    -152, 60, -160, 56,
  ]],
  ['amerique-sud', [
    -80, 9, -77, 7, -72, 12, -64, 10.7, -60, 8.5, -52, 5, -44, -3,
    -35, -8, -39, -15, -42, -23, -48, -28, -53, -34, -58, -39, -65, -45,
    -68, -52, -71, -54, -73, -50, -72, -40, -70, -18, -76, -14, -81, -6,
    -79, 1, -77, 8,
  ]],
  ['australie', [
    114, -22, 122, -17, 130, -12, 136, -12, 139, -17, 142, -11, 146, -19,
    150, -22, 153.6, -27, 151.5, -34.3, 147, -38, 140, -38, 138, -35, 129, -32,
    124, -33, 115, -34, 114, -26,
  ]],
  // Les îles qui font qu'un planisphère est un planisphère.
  ['royaume-uni', [
    -5.7, 50.05, -2.5, 50.6, -0.7, 50.75, 1.4, 51.15, 1.7, 52.5, 0.2, 53,
    0.1, 53.6, -1.5, 55, -2, 56, -3, 58, -5, 58.6, -6, 57, -5, 55,
    -3, 54, -4.7, 53.3, -5.3, 51.7, -3, 51.4, -4.5, 51, -5.7, 50.4,
  ]],
  ['irlande', [-10, 51.5, -6, 52, -6, 54, -8, 55.3, -10, 54, -10.5, 52.5]],
  ['islande', [-24, 64, -14, 65, -18, 66.5, -23, 66]],
  ['groenland', [
    -45, 60, -42, 65, -22, 70, -18, 76, -32, 83, -55, 82, -60, 76,
    -53, 70, -48, 61,
  ]],
  ['japon', [130, 31, 132, 33.5, 135, 34, 140, 35.5, 141, 38, 142, 42, 145, 44, 140, 42, 137, 37, 132, 34]],
  ['madagascar', [44, -12, 50, -15, 47, -25, 44, -22]],
  ['nouvelle-zelande', [173, -35, 178, -38, 174, -41, 172, -40]],
  ['nz-sud', [168, -46, 174, -42, 171, -44, 167, -45]],
  ['sumatra', [95, 5, 106, -6, 102, -5, 96, 2]],
  ['java', [105, -6.5, 114, -8, 106, -7.5]],
  ['borneo', [109, 1, 117, 7, 119, -4, 110, -2]],
  ['nouvelle-guinee', [131, -1, 141, -2, 147, -7, 138, -8, 132, -4]],
  ['cuba', [-85, 21.8, -82, 23.4, -74, 20.3, -78, 19.9, -84, 20.9]],
  ['sri-lanka', [80, 6, 82, 9, 80, 10]],
  ['philippines', [120, 18, 122, 14, 125, 7, 120, 12]],
];

// Les boîtes englobantes, calculées une fois : l'immense majorité des points
// est rejetée là, sans jamais dérouler un polygone.
const FORMES = CONTOURS.map(([nom, pts]) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    if (pts[i] < x0) x0 = pts[i];
    if (pts[i] > x1) x1 = pts[i];
    if (pts[i + 1] < y0) y0 = pts[i + 1];
    if (pts[i + 1] > y1) y1 = pts[i + 1];
  }
  return { nom, pts, x0, x1, y0, y1 };
});

// Le point est-il dans le polygone ? Le lancer de rayon classique.
function dedans(pts, lon, lat) {
  let interieur = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2], yi = pts[i * 2 + 1];
    const xj = pts[j * 2], yj = pts[j * 2 + 1];
    if ((yi > lat) !== (yj > lat)
      && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) interieur = !interieur;
  }
  return interieur;
}

// LA question : ce point du globe est-il à terre ?
export function surTerreReelle(lat, lon) {
  // la calotte arctique : de la banquise, pas un trou dans le monde
  if (lat > 78) return true;
  // l'Antarctique, tout en bas du planisphère
  if (lat < -63) return true;
  for (const f of FORMES) {
    if (lon < f.x0 || lon > f.x1 || lat < f.y0 || lat > f.y1) continue;
    if (dedans(f.pts, lon, lat)) return true;
  }
  return false;
}

// LES DÉSERTS CHAUDS (v341, point (d) du kit « monde fidèle », la plus petite
// tranche des « textures par climat »). Le planisphère savait la terre, la mer
// et les montagnes ; il ne savait pas le climat, et le Sahara était une
// prairie. Ces contours sont ceux des grands déserts chauds — les régions où il
// tombe moins de deux cent cinquante millimètres d'eau par an, relevés au degré
// comme les côtes : Sahara, Arabie, Iran, Thar, Taklamakan et Gobi, Kalahari et
// Namib, l'intérieur australien, l'Atacama, le Mojave et le Sonora. Les
// steppes et la toundra sont une autre tranche. Des FAITS géographiques,
// [lon, lat] comme `CONTOURS`.
const DESERTS = [
  ['sahara', [-17, 21, -16, 27.5, -10, 29, -4, 30.5, 2, 31.5, 9, 31.5, 11, 32.2, 15, 31,
    19, 30.5, 25, 30.5, 29, 30.2, 32, 29.5, 33.5, 27, 35, 24, 37.5, 18, 34, 15.5,
    25, 15, 15, 15.5, 5, 16, -5, 16, -16, 16]],
  ['arabie', [35, 29.5, 38, 32.5, 43, 33, 47, 30, 50, 28.5, 56, 26.5, 57, 24, 59, 22, 55.5, 17.5,
    45, 15.5, 43, 17, 39, 22, 36.5, 26]],
  ['iran', [51, 35.5, 56, 36, 61, 34.5, 63, 30, 61.5, 27, 57, 27.5, 52, 30]],
  ['thar', [68.5, 24.5, 70, 29.5, 74, 30, 75.5, 27, 72.5, 24]],
  ['taklamakan-gobi', [76, 40, 84, 42, 90, 42.5, 100, 43, 110, 45, 113, 44, 111, 41,
    104, 39.5, 98, 39, 90, 37.5, 80, 36.5, 76, 38]],
  ['kalahari-namib', [11.8, -17, 13.5, -23, 15.5, -28, 20, -28.5, 24.5, -26.5, 24, -21,
    21, -18.5, 15, -16.5]],
  ['australie', [114.5, -22, 119, -20, 125, -18.5, 133, -18, 139, -20.5, 142, -25,
    142, -29, 137, -31.5, 130, -31.5, 124, -30.5, 117, -28.5]],
  ['atacama', [-71.3, -17.5, -69, -17.5, -68.5, -23, -69, -28.5, -71.3, -28.5]],
  ['mojave-sonora', [-117.4, 34.5, -115.5, 37.5, -113, 37, -111.5, 34, -109.5, 31.5,
    -110.5, 28, -112.5, 28.5, -114.5, 30.5, -116.2, 32.8]],
];
const FORMES_DESERT = DESERTS.map(([nom, pts]) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
    y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
  }
  return { nom, pts, x0, x1, y0, y1 };
});
// La boîte de tous les déserts : le rejet d'une seule comparaison pour
// l'Europe, l'Amérique du Nord humide et les tropiques.
const LA0 = Math.min(...FORMES_DESERT.map((f) => f.y0)), LA1 = Math.max(...FORMES_DESERT.map((f) => f.y1));

// Ce point du globe est-il dans un désert chaud ? Le nom du désert, ou null.
export function desertReel(lat, lon) {
  if (lat < LA0 || lat > LA1) return null;
  for (const f of FORMES_DESERT) {
    if (lon < f.x0 || lon > f.x1 || lat < f.y0 || lat > f.y1) continue;
    if (dedans(f.pts, lon, lat)) return f.nom;
  }
  return null;
}
export function desertsDeLaTerre() { return FORMES_DESERT.map((f) => ({ nom: f.nom, pts: f.pts.slice() })); }

// LES CLIMATS (v345, la suite du point (d)). Les déserts chauds ont ouvert la
// voie ; viennent ensuite la TOUNDRA — au nord de la limite des arbres, et sur
// le haut plateau du Tibet — et la TAÏGA, la forêt boréale qui fait le tour du
// pôle sous elle. Ce sont, comme les côtes et les déserts, des FAITS relevés
// au degré : la limite des arbres passe à 68° sur le Mackenzie, 59° sur la
// côte ouest de la baie d'Hudson, 58° en Ungava, 67° au pied de l'Oural, 72°
// sur la Khatanga, 65° en Tchoukotka ; la taïga descend à 54° en Alberta, 48°
// au nord des Grands Lacs, 60° en Finlande, 56° en Sibérie occidentale, 48° sur
// l'Amour. Au-delà de 78° c'est la calotte, qui a sa propre règle. L'ORDRE de
// la liste est une priorité : un point dans deux zones prend la première.
// [lon, lat] comme `CONTOURS`.
const CLIMATS = [
  ['toundra', 'toundra-amerique', [-180, 64, -168, 66, -163, 64, -160, 67.5, -150, 68.5, -141, 69,
    -134, 68.5, -125, 67, -115, 65, -108, 63.5, -100, 61.5, -94, 59, -88, 56.5, -85, 57.5,
    -78, 58.5, -72, 58, -65, 58, -61, 56.5, -50, 58, -40, 59, -20, 68, -10, 78, -180, 78]],
  ['toundra', 'islande', [-25, 63, -13, 63, -13, 67, -25, 67]],
  ['toundra', 'toundra-eurasie', [17, 69.8, 25, 70.2, 30, 69.5, 36, 68.5, 42, 67.5, 50, 67.5,
    60, 67, 66, 66.5, 75, 67, 85, 69, 95, 70.5, 102, 72, 115, 71.5, 127, 71, 140, 70, 150, 69,
    160, 68, 170, 65.5, 180, 64.5, 180, 78, 17, 78]],
  ['toundra', 'tibet', [78, 32, 78, 34.5, 80, 36, 85, 36, 90, 36.5, 95, 36, 100, 34, 102, 32,
    99, 29, 95, 29, 90, 28.3, 85, 28.8, 81, 30]],
  ['taiga', 'taiga-amerique', [-165, 62, -158, 60, -150, 60, -140, 61.5, -135, 59, -128, 57,
    -120, 56, -115, 54.5, -105, 53.5, -98, 52, -95, 50.5, -88, 49, -84, 48, -79, 48, -74, 47.5,
    -70, 48, -66, 48.5, -60, 48, -52, 47.5, -55, 52, -61, 56.5, -65, 58, -72, 58, -78, 58.5,
    -85, 57.5, -88, 56.5, -94, 59, -100, 61.5, -108, 63.5, -115, 65, -125, 67, -134, 68.5,
    -141, 69, -150, 68.5, -160, 67.5, -163, 64]],
  ['taiga', 'taiga-eurasie', [10, 60.5, 17, 60.5, 22, 60.5, 28, 60, 32, 58.5, 40, 58, 50, 57.5,
    58, 56.5, 65, 56.5, 75, 56, 85, 55, 90, 52, 98, 51, 105, 51.5, 112, 50, 120, 49.5, 127, 48,
    133, 48.5, 138, 51, 141, 53, 156, 51, 163, 58, 170, 62, 180, 63, 180, 64.5, 170, 65.5,
    160, 68, 150, 69, 140, 70, 127, 71, 115, 71.5, 102, 72, 95, 70.5, 85, 69, 75, 67, 66, 66.5,
    60, 67, 50, 67.5, 42, 67.5, 36, 68.5, 30, 69.5, 25, 70.2, 17, 69.8, 14, 68, 8, 63, 6, 61]],
  // LES STEPPES (v347) : les herbes sèches à l'abri des pluies, entre les
  // forêts et les déserts. La steppe pontique et kazakhe (de la mer Noire à
  // l'Altaï, au sud de 47-53° N), la Mongolie, l'Anatolie centrale, le
  // plateau iranien, les Hautes Plaines à l'ouest du 100e méridien, le Grand
  // Bassin, le Sahel, la Corne de l'Afrique, le Karoo, la Patagonie,
  // l'anneau semi-aride de l'Australie, le nord du Mexique. Les déserts
  // passent avant (v341) : un anneau de steppe peut recouvrir le sien.
  ['steppe', 'steppe-pontique', [30, 47, 34, 47.5, 38, 48, 40, 49, 45, 51, 50, 52, 55, 52.5, 62, 53,
    70, 54, 78, 53.5, 83, 52, 80, 47, 75, 45, 70, 44, 65, 45, 60, 45.5, 55, 46.5, 50, 46, 47, 44,
    44, 45, 40, 46, 36, 45, 33, 46, 30, 46]],
  ['steppe', 'mongolie', [90, 50, 98, 50.5, 105, 50, 112, 49.5, 118, 49, 120, 46, 118, 43.5, 113, 44,
    105, 42, 100, 43.5, 95, 44.5, 90, 46]],
  ['steppe', 'anatolie', [31, 38, 34, 40, 38, 39.5, 37, 37.5, 33, 37]],
  ['steppe', 'iran', [45, 38, 52, 36.5, 60, 37, 68, 36, 70, 33, 66, 30, 62, 29, 57, 28, 52, 30, 48, 33, 45, 35]],
  ['steppe', 'hautes-plaines', [-114, 51, -105, 50.5, -101, 49.5, -100.5, 45, -100.5, 36, -101, 32,
    -104, 30, -106, 32, -105, 36, -106, 40, -109, 44, -112, 46, -114, 49]],
  ['steppe', 'grand-bassin', [-120, 42, -117, 44, -112, 43, -111, 41, -112, 38, -115, 37.5, -118, 38, -120, 40]],
  ['steppe', 'sahel', [-17, 16.5, -5, 16.5, 5, 16.5, 15, 16, 25, 15.5, 34, 16, 34, 12.5, 25, 11.5,
    15, 12, 5, 13, -5, 13, -16, 12.5]],
  ['steppe', 'corne-afrique', [40, 11, 44, 10.5, 51, 11.5, 51, 9, 48, 5, 45, 2, 42, -1, 40, 2, 38, 4, 40, 8]],
  ['steppe', 'karoo', [19, -31, 24, -30.5, 27, -30, 26, -33, 22, -33.5, 19, -33]],
  ['steppe', 'patagonie', [-72, -39, -69, -38, -64, -39, -63, -41, -65, -45, -67, -47, -68, -52,
    -71, -52, -72, -49, -71.5, -45, -71.5, -41]],
  ['steppe', 'australie', [113.5, -26, 114.5, -21.5, 122, -17, 130, -16, 137, -17, 142, -19, 145, -23,
    147, -28, 146, -32, 141, -34, 136, -33, 130, -31.8, 124, -31, 118, -31, 115, -29]],
  ['steppe', 'mexique-nord', [-106, 31.5, -104, 30, -101, 29, -100, 25, -101, 22, -103, 22, -105, 25,
    -107, 28, -108, 30.5]],
  // LES TROPIQUES HUMIDES (v348) : les forêts denses de l'équateur et des
  // côtes de mousson. L'Amazonie (à l'est des Andes), le golfe de Guinée et
  // le bassin du Congo, l'Insulinde de Sumatra à la Nouvelle-Guinée, les
  // Philippines, l'Amérique centrale, la forêt atlantique du Brésil, la côte
  // est de Madagascar, le Kerala, le Bengale et l'Assam, le Queensland.
  // Un contour peut couvrir la mer : seule la terre a de l'herbe.
  ['tropiques', 'amazonie', [-77, 2, -72, 4, -67, 6, -60, 8, -55, 6, -50, 4, -48, 0, -44, -2.5, -46, -5,
    -50, -8, -55, -11, -60, -13, -65, -14, -69, -13, -72, -10, -75, -7, -77, -3]],
  ['tropiques', 'guinee-congo', [-15, 11, -11, 10, -8, 8, -2, 7.5, 4, 7.5, 8, 6.5, 11, 6.5, 15, 5, 20, 5,
    25, 4.5, 30, 3, 30.5, -1, 29, -5, 25, -6, 20, -6, 15, -5, 12, -5, 9, 0, 9.5, 3.5, 8, 4.3, 5, 4.3,
    0, 5, -5, 4.5, -8, 4.5, -11, 6.5, -13.5, 8]],
  ['tropiques', 'insulinde', [94, 7, 104, 7, 119, 7.5, 127, 7, 127, -2, 141, -2, 151, -4, 151, -10.5,
    141, -9, 132, -5, 120, -8.8, 115, -8.8, 106, -7.5, 102, -5.5, 95, 2]],
  ['tropiques', 'philippines', [117, 8, 126.5, 6, 126, 13, 122, 19, 119, 16]],
  ['tropiques', 'amerique-centrale', [-92, 17, -90, 21, -87, 21.5, -88, 18, -83, 15, -83, 10, -77, 8,
    -77, 7, -80, 7.5, -85, 10, -88, 13.5, -92, 14.5]],
  ['tropiques', 'mata-atlantica', [-35, -6, -39, -15, -41, -22, -48, -26, -49, -23, -42, -17, -38, -9]],
  ['tropiques', 'madagascar-est', [49, -12, 50.5, -15.5, 48, -24.5, 47, -23, 48.5, -15]],
  ['tropiques', 'kerala', [74, 8, 77, 8, 76.5, 12, 74.5, 15.5, 73, 18, 72.5, 17]],
  ['tropiques', 'bengale-assam', [88, 21.5, 92, 21, 97, 24, 95.5, 27.5, 92, 27, 89, 26]],
  ['tropiques', 'queensland', [143.5, -11, 145.5, -14.5, 146.5, -19, 145.5, -19, 144.5, -16, 142.5, -11]],
];
const FORMES_CLIMAT = CLIMATS.map(([climat, nom, pts]) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
    y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
  }
  return { climat, nom, pts, x0, x1, y0, y1 };
});
// Les déserts d'abord (v341), puis les climats dans l'ordre de la table.
const TOUTES_LES_ZONES = [...FORMES_DESERT.map((f) => ({ ...f, climat: 'desert' })), ...FORMES_CLIMAT];

// Le climat d'un point du globe : 'desert', 'toundra', 'taiga', ou null — la
// campagne tempérée de toujours.
export function climatReel(lat, lon) {
  for (const f of TOUTES_LES_ZONES) {
    if (lon < f.x0 || lon > f.x1 || lat < f.y0 || lat > f.y1) continue;
    if (dedans(f.pts, lon, lat)) return f.climat;
  }
  return null;
}

// LE CLIMAT D'UN MORCEAU ENTIER, quand il est CERTAIN. Le monde fait trembler
// le bord des zones d'au plus `marge` degrés (`World.climat`) : un point plus
// loin que `marge` de tout bord a le même climat que toutes les colonnes
// autour de lui. On rend alors ce climat (ou null), et `undefined` quand un
// bord est trop près pour trancher — les colonnes se demandent une à une.
// C'est ce qui rend la question gratuite au mailleur et au générateur : la
// plupart des morceaux du monde sont loin de tout bord.
function distanceAuBord(pts, lon, lat) {
  let min = Infinity;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ax = pts[j * 2], ay = pts[j * 2 + 1], bx = pts[i * 2], by = pts[i * 2 + 1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((lon - ax) * dx + (lat - ay) * dy) / l2));
    const ex = ax + dx * t - lon, ey = ay + dy * t - lat;
    const d = ex * ex + ey * ey;
    if (d < min) min = d;
  }
  return Math.sqrt(min);
}
export function climatCertain(lat, lon, marge) {
  for (const f of TOUTES_LES_ZONES) {
    if (lon < f.x0 - marge || lon > f.x1 + marge || lat < f.y0 - marge || lat > f.y1 + marge) continue;
    if (distanceAuBord(f.pts, lon, lat) < marge) return undefined;
    if (dedans(f.pts, lon, lat)) return f.climat;
  }
  return null;
}
// LES TEINTES DES CLIMATS (v345). Une zone de climat ne change pas la MATIÈRE
// de l'herbe — c'est toujours le bloc d'herbe, que tout le monde sait lire —
// mais sa COULEUR, comme dans la vraie campagne : le lichen olive de la
// toundra, le vert sombre et froid de la forêt boréale. Un multiplicateur de
// la couleur de sommet (le mailleur, le sol continu), et la même règle sur
// les couleurs du paysage lointain et de la carte. L'indice 0 ne teint rien.
// Réglé sur la tuile d'herbe (104, 168, 62) : toundra → (126, 124, 80),
// taïga → (64, 118, 64) ; et sur la tuile de feuilles (54, 116, 38).
// La steppe (v347) → (178, 165, 92), l'herbe sèche couleur de paille ; ses
// rares arbres d'un vert olive.
// Les tropiques humides (v348) → (78, 150, 60), un vert profond — plus saturé
// en capture, il virait au vert fluo —
// et le feuillage (40, 120, 32).
export const CLIMATS_TEINTES = ['', 'toundra', 'taiga', 'steppe', 'tropiques'];
export const INDICE_CLIMAT = { toundra: 1, taiga: 2, steppe: 3, tropiques: 4 };
export const TEINTE_HERBE = [null, [1.21, 0.74, 1.29], [0.62, 0.70, 1.03], [1.71, 0.98, 1.48], [0.75, 0.89, 0.97]];
export const TEINTE_FEUILLES = [null, [0.85, 0.8, 1.0], [0.63, 0.71, 1.16], [1.25, 0.95, 1.05], [0.74, 1.03, 0.84]];
// LES MÊMES, POUR LA COULEUR DE SOMMET DU MONDE PROCHE. three tient une
// couleur de sommet pour LINÉAIRE et décode la tuile sRGB avant de les
// multiplier : un facteur 0,62 posé tel quel n'assombrit l'écran que de 0,80.
// Le premier jet l'a fait, et la taïga restait vert vif en capture alors que
// les maillages portaient bien la teinte (sonde dans la page : 201 516
// sommets teints sur 300 816). Le facteur linéaire est le facteur perçu à la
// puissance 2,2 ; la carte et le paysage lointain, eux, mêlent des couleurs
// de palette et prennent le facteur perçu.
const lineaire = (t) => t && t.map((v) => v ** 2.2);
export const TEINTE_HERBE_LIN = TEINTE_HERBE.map(lineaire);
export const TEINTE_FEUILLES_LIN = TEINTE_FEUILLES.map(lineaire);

export function climatsDeLaTerre() { return FORMES_CLIMAT.map((f) => ({ climat: f.climat, nom: f.nom, pts: f.pts.slice() })); }

// La liste des formes, pour qui veut les vérifier une à une.
export function contoursDeLaTerre() {
  return FORMES.map((f) => f.nom);
}

// --- le relief : les grandes chaînes, relevées comme les côtes ---------------
//
// Max : « il y a aussi le relief à prendre en considération : les Alpes,
// l'Himalaya, le Grand Canyon… ». Un planisphère sans relief est un aplat —
// c'est la chaîne des Alpes entre Nice et Rome, l'Himalaya au nord d'Agra,
// le mont Rainier au-dessus de Seattle qui font qu'on s'y croit.
//
// Chaque chaîne est une ÉPINE DORSALE (des points lat/lon relevés sur les
// vrais massifs), une demi-largeur en degrés, et l'altitude de son plus haut
// sommet en mètres. Le relief du monde a sa propre échelle verticale —
// 200 mètres par bloc — distincte de celle des monuments : l'Everest culmine
// ainsi à 44 blocs au-dessus de la plaine, jusqu'au plafond du terrain, sans
// le crever. Sources : emprises et sommets vérifiés (Alpes 1 200 km, Mont
// Blanc 45°50′N 6°52′E, 4 809 m ; Himalaya 2 400 km, Everest 8 849 m ;
// Andes 7 000 km, Aconcagua 6 961 m ; Grand Canyon 446 km, 1 857 m creusés).
const METRES_PAR_BLOC_RELIEF = 200;

const CHAINES = [
  { nom: 'alpes', sommet: 4809, l: 0.55,
    pts: [44.2, 6.9, 45.83, 6.87, 46.0, 7.7, 46.5, 8.6, 46.6, 10.5, 47.0, 12.0, 46.6, 13.5] },
  { nom: 'pyrenees', sommet: 3404, l: 0.35, pts: [42.8, -1.8, 42.6, 0.5, 42.4, 2.5] },
  { nom: 'himalaya', sommet: 8849, l: 1.0,
    pts: [34.5, 74.5, 32, 77, 29.5, 81, 28.3, 84.5, 27.99, 86.92, 27.5, 89.5, 27.8, 92.5, 28.5, 96] },
  { nom: 'andes', sommet: 6961, l: 1.0,
    pts: [10, -73, 0, -78.5, -10, -76.5, -20, -69.5, -32.65, -70, -42, -72, -52, -73] },
  { nom: 'rocheuses', sommet: 4401, l: 1.2,
    pts: [35.5, -105.5, 39.7, -105.8, 43.5, -110, 48.5, -114, 52, -117.5] },
  { nom: 'sierra-nevada', sommet: 4421, l: 0.5,
    pts: [35.5, -118.3, 36.58, -118.29, 38, -119.3, 39.5, -120.3] },
  { nom: 'cascades', sommet: 4392, l: 0.45,
    pts: [41.4, -122.2, 45.4, -121.7, 46.85, -121.76, 48.8, -121.8] },
  { nom: 'appalaches', sommet: 2037, l: 0.8,
    pts: [34.7, -84, 37, -81.5, 39, -79, 42, -74, 44.3, -71.7] },
  { nom: 'atlas', sommet: 4167, l: 0.5, pts: [30.5, -8.5, 31.06, -7.92, 33, -5, 35, -1] },
  { nom: 'oural', sommet: 1895, l: 0.6, pts: [51, 58.5, 56, 59, 61, 59.5, 66, 63] },
  { nom: 'scandinavie', sommet: 2469, l: 0.7, pts: [59, 7, 62, 8.5, 67, 15] },
  { nom: 'caucase', sommet: 5642, l: 0.4, pts: [43.3, 42, 43.35, 42.44, 42.7, 45] },
  { nom: 'highlands', sommet: 1345, l: 0.5, pts: [56.5, -5, 57.5, -4.5] },
  // Les sommets seuls, cônes reconnaissables entre tous.
  { nom: 'kilimandjaro', sommet: 5895, l: 0.35, pts: [-3.08, 37.35] },
  { nom: 'fuji', sommet: 3776, l: 0.25, pts: [35.36, 138.73] },
  { nom: 'uluru', sommet: 863, l: 0.12, mesa: true, pts: [-25.34, 131.03] },
  { nom: 'table-mountain', sommet: 1085, l: 0.2, mesa: true, pts: [-33.96, 18.41] },
];

// Le Grand Canyon : le seul relief qui CREUSE. Le plateau du Colorado se
// soulève, et la gorge s'y taille jusqu'au fleuve — qui se remplit d'eau tout
// seul, comme le vrai.
const CANYON = {
  l: 0.7, gorge: 0.09, plateau: 10, profondeur: 18,
  pts: [36.1, -111.8, 36.2, -112.1, 36.3, -112.7, 36.0, -113.5, 35.9, -114.3],
};

// Distance d'un point à une épine dorsale, en degrés « vrais » (la longitude
// comptée à sa largeur réelle sous cette latitude).
function distanceEpine(pts, lat, lon) {
  const k = Math.cos((lat * Math.PI) / 180);
  let min = Infinity, ou = 0, total = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = pts[i + 1] * k, ay = pts[i];
    const bx = pts[i + 3] * k, by = pts[i + 2];
    const px = lon * k, py = lat;
    const dx = bx - ax, dy = by - ay;
    const long2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / long2));
    const d = Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
    if (d < min) { min = d; ou = total + t; }
    total += 1;
  }
  if (pts.length === 2) min = Math.hypot((lon - pts[1]) * k, lat - pts[0]);
  return { d: min, ou };
}

// L'écart d'altitude que la Terre impose ici, en blocs. Positif : une chaîne
// se lève. Négatif : le canyon se creuse. Zéro : la plaine.
// Les boîtes des chaînes, élargies de leur demi-largeur : le rejet rapide qui
// épargne la géométrie à l'immense majorité des colonnes de terrain.
for (const c of [...CHAINES, CANYON]) {
  let la0 = Infinity, la1 = -Infinity, lo0 = Infinity, lo1 = -Infinity;
  for (let i = 0; i < c.pts.length; i += 2) {
    la0 = Math.min(la0, c.pts[i]); la1 = Math.max(la1, c.pts[i]);
    lo0 = Math.min(lo0, c.pts[i + 1]); lo1 = Math.max(lo1, c.pts[i + 1]);
  }
  const m = c.l * 1.6;
  c.la0 = la0 - m; c.la1 = la1 + m; c.lo0 = lo0 - m; c.lo1 = lo1 + m;
}

export function reliefReel(lat, lon) {
  let delta = 0;
  for (const c of CHAINES) {
    if (lat < c.la0 || lat > c.la1 || lon < c.lo0 || lon > c.lo1) continue;
    const { d, ou } = distanceEpine(c.pts, lat, lon);
    if (d >= c.l) continue;
    const t = 1 - d / c.l;
    // L'ondulation dessine les dents de la chaîne — mais elle s'efface à la
    // crête : le sommet nommé culmine à son altitude, pas à ce qu'un sinus
    // veut bien lui laisser. L'Everest plafonnait à 52 blocs avant ce terme.
    const dent = 0.5 + 0.5 * Math.sin(ou * 9.7 + lat * 3.1 + lon * 2.3);
    const crete = c.mesa ? (t > 0.35 ? 1 : t / 0.35)
      : Math.pow(t, 1.6) * (1 - 0.4 * (1 - t) * dent);
    delta = Math.max(delta, (c.sommet / METRES_PAR_BLOC_RELIEF) * crete);
  }
  if (lat < CANYON.la0 || lat > CANYON.la1 || lon < CANYON.lo0 || lon > CANYON.lo1) return delta;
  const gc = distanceEpine(CANYON.pts, lat, lon);
  if (gc.d < CANYON.l) {
    const t = 1 - gc.d / CANYON.l;
    delta = Math.max(delta, CANYON.plateau * Math.min(1, t * 2.5));
    if (gc.d < CANYON.gorge) {
      // les parois en marches : le profil étagé des strates
      const p = 1 - gc.d / CANYON.gorge;
      delta -= CANYON.profondeur * Math.min(1, p * 1.6);
    }
  }
  return delta;
}

