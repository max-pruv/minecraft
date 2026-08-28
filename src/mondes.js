// Les mondes : la Terre aujourd'hui, la Lune demain.
//
// POURQUOI CE FICHIER EXISTE. Les villes étaient posées à des coordonnées
// écrites à la main, choisies au fil des versions pour qu'elles ne se marchent
// pas dessus. Max, en jouant : « il y a un vrai sujet structurel, elles sont
// beaucoup trop rapprochées… considère cette opportunité comme un reset de la
// carte pour laisser beaucoup plus d'espace ». Et : « la ville de Paris ne
// ressemble pas du tout à la ville de Paris » — parce qu'elle n'avait pas la
// place.
//
// Une carte se déduit désormais d'une PROJECTION et d'une liste de LIEUX en
// coordonnées célestes. Personne n'écrit plus « Lille est en (-300, -200) » :
// on écrit sa latitude et sa longitude, et la projection décide.
//
// ET DEMAIN, LA LUNE. Max : « keep in mind que dans le futur on pourrait créer
// plusieurs mondes / cartes. Imagine demain on fait la lune. » C'est pour cela
// que la projection est une DONNÉE et non du code : la Lune a un rayon de
// 1 737 km au lieu de 6 371, et c'est un paramètre, pas une branche `if`. Un
// monde neuf, c'est une entrée de plus dans `MONDES` — pas une réécriture.

// --- les projections ---------------------------------------------------------

// Équirectangulaire : la plus simple des projections, et la bonne ici.
//
// CE QU'ELLE GARANTIT, ET CE QU'ELLE NE GARANTIT PAS. Elle est exacte au
// PARALLÈLE DE RÉFÉRENCE — ici la latitude de Paris — et s'écarte à mesure
// qu'on s'en éloigne, parce qu'un degré de longitude vaut plus de kilomètres
// près de l'équateur qu'au nord. Concrètement : Paris-Lille et Paris-Nice sont
// justes au bloc près ; New York-San Francisco, à huit degrés plus au sud,
// ressort 15 % trop court — 4 702 blocs au lieu de 5 519.
//
// C'est une propriété de TOUTE carte plate — aucune ne préserve à la fois les
// distances, les angles et les surfaces — et non un défaut qu'on aurait laissé
// passer. On la nomme ici plutôt que de la laisser découvrir, et le témoin
// `carteMonde.js` ne vérifie les distances au bloc près QUE là où la projection
// les promet. Ce qui reste vrai partout : l'ordre des villes, leurs directions
// les unes par rapport aux autres, et le fait qu'on ne les confond plus.
//
// `compressions` : des bandes de longitude qu'on resserre. Max a tranché sur
// l'Atlantique — « compresse légèrement la distance transocéanique » — parce
// qu'à l'échelle vraie, New York est à 1 415 blocs de vide liquide. La bande
// −74°/−10° est ramenée à 60 % : l'Europe, l'Afrique et l'Asie gardent leur
// échelle exacte au bloc près, et Paris-Tokyo aussi puisque c'est de la terre
// ferme d'un bout à l'autre.
function equirectangulaire(p) {
  const D = Math.PI / 180;
  const kmParDegreLon = p.rayonKm * D * Math.cos(p.lat0 * D);
  const kmParDegreLat = p.rayonKm * D;

  // L'écart de longitude, intégré EXACTEMENT par morceaux : on découpe aux
  // frontières des bandes de compression, et chaque morceau compte pour sa
  // largeur réelle — fractions comprises.
  //
  // La première version marchait par pas d'un degré ENTIER depuis le méridien
  // d'origine : le dernier pas, fractionnaire, comptait pour un degré plein.
  // Toutes les longitudes étaient donc quantifiées au degré près — Rome se
  // retrouvait 60 km trop à l'est, et personne ne l'a vu tant que la carte
  // n'avait pas de côtes. C'est le planisphère qui l'a trahi : la projection
  // inverse, exacte, ne retombait pas sur les villes posées par l'aller.
  const kmVersEst = (lon) => {
    const de = Math.min(p.lon0, lon), a = Math.max(p.lon0, lon);
    const bornes = [de, a];
    for (const c of p.compressions || []) {
      if (c.de > de && c.de < a) bornes.push(c.de);
      if (c.a > de && c.a < a) bornes.push(c.a);
    }
    bornes.sort((q, r) => q - r);
    let km = 0;
    for (let i = 0; i < bornes.length - 1; i++) {
      const milieu = (bornes[i] + bornes[i + 1]) / 2;
      const bande = (p.compressions || []).find((c) => milieu >= c.de && milieu < c.a);
      km += (bornes[i + 1] - bornes[i]) * kmParDegreLon * (bande ? bande.k : 1);
    }
    return lon >= p.lon0 ? km : -km;
  };

  return {
    versBlocs(lat, lon) {
      return {
        x: Math.round(p.ancre.x + kmVersEst(lon) / p.kmParBloc),
        // Le nord est vers les z négatifs : c'est la convention du monde, et
        // l'inverser ici retournerait la carte sans que personne ne le voie.
        z: Math.round(p.ancre.z - ((lat - p.lat0) * kmParDegreLat) / p.kmParBloc),
      };
    },
    kmParBloc: p.kmParBloc,
  };
}

const PROJECTIONS = { equirectangulaire };

// --- les mondes --------------------------------------------------------------

export const MONDES = {
  terre: {
    id: 'terre', nom: 'La Terre', emoji: '🌍',
    projection: {
      type: 'equirectangulaire',
      rayonKm: 6371,
      lat0: 48.8566, lon0: 2.3522,       // Paris : l'origine de la carte
      // 0,75 km par bloc, et ce chiffre est un RÉSULTAT, pas un choix de goût.
      //
      // Max avait tranché pour 4 km/bloc. La mesure l'a invalidé : les villes ne
      // sont pas à l'échelle de la carte. Washington est bâtie à 48 blocs par
      // kilomètre ; à 4 km/bloc elle devrait tenir dans 1,3 bloc. New York et
      // Washington, distantes de 330 km, se seraient superposées sur près de
      // deux cents blocs.
      //
      // Balayage, avec les emprises réelles : 4 km/bloc → −197 blocs de marge,
      // 1 km/bloc → −42, 0,75 → +58, 0,5 → +256. C'est la première échelle qui
      // tient, et elle sert ce que Max voulait — « laisser beaucoup plus
      // d'espace, pour laisser grossir les villes ». Le prix est la distance :
      // San Francisco à près de dix mille blocs. Le voyage se fait par
      // téléportation, déjà tranché, et le terrain est engendré à la demande.
      //
      // `carte.js` a un témoin qui rougit si une ville grossit au point d'en
      // toucher une autre : on ne redécouvrira pas ce défaut en jouant.
      kmParBloc: 0.75,
      // Paris ne bouge PAS. C'est là que les enfants ont le plus construit, et
      // ancrer la projection sur sa position actuelle épargne leurs blocs.
      ancre: { x: -240, z: 200 },
      compressions: [{ de: -74, a: -10, k: 0.6 }],   // l'Atlantique
    },
    // Les lieux, en coordonnées célestes. Le rayon reste en blocs : c'est une
    // taille de jeu, pas une mesure de géographie.
    lieux: [
      { cle: 'paris', nom: 'Paris', lat: 48.8566, lon: 2.3522, r: 55 },
      { cle: 'lille', nom: 'Lille', lat: 50.6292, lon: 3.0573, r: 46 },
      { cle: 'nice', nom: 'Nice', lat: 43.7102, lon: 7.2620, r: 48 },
      { cle: 'ny', nom: 'New York', lat: 40.7128, lon: -74.0060, r: 152 },
      { cle: 'sf', nom: 'San Francisco', lat: 37.7749, lon: -122.4194, r: 66 },
      // Washington est la plus étendue : bâtie à 48 blocs par kilomètre depuis
      // v162, son emprise fait 311 × 206 blocs. C'est elle qui dicte l'échelle.
      { cle: 'washington', nom: 'Washington', lat: 38.9072, lon: -77.0369, r: 187 },
      // La Chine est une région, pas une ville : le repère est Pékin.
      { cle: 'chine', nom: 'Chine', lat: 39.9042, lon: 116.4074, r: 70 },

      // --- LE TOUR DU MONDE ----------------------------------------------
      //
      // Vingt et un monuments célèbres dormaient dans src/monuments.js :
      // Big Ben, le Colisée, le Taj Mahal, le Christ Rédempteur, l'Opéra de
      // Sydney, la pyramide de Khéops… Chacun était bâti au bloc près, et
      // AUCUN ne se dressait nulle part. On ne pouvait que les poser soi-même
      // depuis le menu, comme des objets de décor — le monde, lui, n'en
      // portait pas un seul, et la carte n'allait pas plus loin que New York.
      //
      // Maintenant que les villes se déduisent de leurs coordonnées réelles,
      // les accueillir ne coûte qu'une ligne chacune : la projection sait
      // déjà où tombe Londres. Les monuments, eux, sont déjà écrits. Il ne
      // manquait que le rendez-vous entre les deux — c'est src/capitales.js.
      //
      // Les rayons sont modestes : ce sont des sites de monuments, pas des
      // villes entières. Une ville qui grandira plus tard n'a qu'à grandir —
      // le témoin `carteMonde.js` rougira bien avant qu'elle n'en touche une
      // autre. Marge la plus étroite aujourd'hui : 58 blocs.
      // Londres n'est plus un site à monument : c'est une VILLE bâtie
      // (src/londres.js), la première du tour du monde au niveau de Nice et
      // Lille. Son ancrage est Charing Cross, le point d'où les distances à
      // Londres se mesurent officiellement.
      { cle: 'londres', nom: 'Londres', lat: 51.5074, lon: -0.1278, r: 112 },
      { cle: 'rome', nom: 'Rome', lat: 41.9028, lon: 12.4964, r: 120 },
      { cle: 'barcelone', nom: 'Barcelone', lat: 41.3874, lon: 2.1686, r: 106 },
      // Pise cède quelques blocs : Florence n'est qu'à 84 blocs de Toscane.
      { cle: 'pise', nom: 'Pise', lat: 43.7228, lon: 10.3966, r: 36 },
      { cle: 'gizeh', nom: 'Gizeh', lat: 29.9773, lon: 31.1325, r: 99 },
      { cle: 'agra', nom: 'Agra', lat: 27.1751, lon: 78.0421, r: 93 },
      { cle: 'sydney', nom: 'Sydney', lat: -33.8688, lon: 151.2093, r: 106 },
      { cle: 'rio', nom: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729, r: 136 },
      { cle: 'seattle', nom: 'Seattle', lat: 47.6062, lon: -122.3321, r: 86 },

      // --- LES CINQUANTE GRANDES -----------------------------------------
      //
      // Max : « refais les 50 plus grosses et famous villes mondiales en
      // détail. » Trente-huit de plus d'un coup, par la machine à villes —
      // le registre porte leurs coordonnées et leur emprise, la machine
      // (src/villesmonde.js) porte leur eau, leurs rues et leurs monuments.
      // Les rayons sont dictés par la géographie : Bruxelles est serrée
      // entre Lille et la fenêtre des enfants, Florence et Pise se partagent
      // 84 blocs de Toscane.
      // Europe.
      { cle: 'madrid', nom: 'Madrid', lat: 40.4168, lon: -3.7038, r: 80 },
      { cle: 'lisbonne', nom: 'Lisbonne', lat: 38.7223, lon: -9.1393, r: 74 },
      { cle: 'amsterdam', nom: 'Amsterdam', lat: 52.3676, lon: 4.9041, r: 64 },
      { cle: 'bruxelles', nom: 'Bruxelles', lat: 50.8503, lon: 4.3517, r: 34 },
      { cle: 'berlin', nom: 'Berlin', lat: 52.52, lon: 13.405, r: 80 },
      { cle: 'munich', nom: 'Munich', lat: 48.1351, lon: 11.582, r: 67 },
      { cle: 'vienne', nom: 'Vienne', lat: 48.2082, lon: 16.3738, r: 74 },
      { cle: 'prague', nom: 'Prague', lat: 50.0755, lon: 14.4378, r: 70 },
      { cle: 'venise', nom: 'Venise', lat: 45.4408, lon: 12.3155, r: 40 },
      { cle: 'florence', nom: 'Florence', lat: 43.7696, lon: 11.2558, r: 40 },
      { cle: 'athenes', nom: 'Athènes', lat: 37.9838, lon: 23.7275, r: 74 },
      { cle: 'istanbul', nom: 'Istanbul', lat: 41.0082, lon: 28.9784, r: 86 },
      { cle: 'moscou', nom: 'Moscou', lat: 55.7558, lon: 37.6173, r: 90 },
      { cle: 'stpetersbourg', nom: 'Saint-Pétersbourg', lat: 59.9311, lon: 30.3609, r: 77 },
      { cle: 'stockholm', nom: 'Stockholm', lat: 59.3293, lon: 18.0686, r: 42 },
      { cle: 'copenhague', nom: 'Copenhague', lat: 55.6761, lon: 12.5683, r: 40 },
      // Asie et Moyen-Orient.
      // Ancrée sur la gare de Tokyo : c'est de là que la ville se visite.
      { cle: 'tokyo', nom: 'Tokyo', lat: 35.6812, lon: 139.7671, r: 96 },
      { cle: 'kyoto', nom: 'Kyoto', lat: 35.0116, lon: 135.7681, r: 67 },
      { cle: 'seoul', nom: 'Séoul', lat: 37.5665, lon: 126.978, r: 80 },
      { cle: 'shanghai', nom: 'Shanghai', lat: 31.2304, lon: 121.4737, r: 86 },
      { cle: 'hongkong', nom: 'Hong Kong', lat: 22.3193, lon: 114.1694, r: 46 },
      { cle: 'singapour', nom: 'Singapour', lat: 1.29, lon: 103.85, r: 44 },
      { cle: 'bangkok', nom: 'Bangkok', lat: 13.7563, lon: 100.5018, r: 74 },
      { cle: 'dubai', nom: 'Dubaï', lat: 25.2048, lon: 55.2708, r: 80 },
      { cle: 'jerusalem', nom: 'Jérusalem', lat: 31.7683, lon: 35.2137, r: 64 },
      { cle: 'mumbai', nom: 'Mumbai', lat: 18.94, lon: 72.835, r: 77 },
      { cle: 'delhi', nom: 'Delhi', lat: 28.6139, lon: 77.209, r: 72 },
      // Amériques.
      { cle: 'losangeles', nom: 'Los Angeles', lat: 34.0522, lon: -118.2437, r: 90 },
      { cle: 'chicago', nom: 'Chicago', lat: 41.8781, lon: -87.6298, r: 80 },
      { cle: 'lasvegas', nom: 'Las Vegas', lat: 36.11, lon: -115.17, r: 70 },
      // Le site de la Giga-usine automobile : Austin, Texas — là où la vraie
      // giga-usine s'étire sur plus d'un kilomètre. Pas une ville : un site,
      // bâti par src/usine.js, comme Roissy l'est près de Paris.
      { cle: 'gigatexas', nom: 'La Giga-usine', lat: 30.2225, lon: -97.6208, r: 114 },
      { cle: 'miami', nom: 'Miami', lat: 25.7617, lon: -80.1918, r: 42 },
      { cle: 'toronto', nom: 'Toronto', lat: 43.6532, lon: -79.3832, r: 70 },
      { cle: 'mexico', nom: 'Mexico', lat: 19.4326, lon: -99.1332, r: 80 },
      { cle: 'havane', nom: 'La Havane', lat: 23.1136, lon: -82.3666, r: 64 },
      { cle: 'buenosaires', nom: 'Buenos Aires', lat: -34.6037, lon: -58.3816, r: 77 },
      { cle: 'machupicchu', nom: 'Machu Picchu', lat: -13.1631, lon: -72.545, r: 30 },
      // Afrique.
      { cle: 'marrakech', nom: 'Marrakech', lat: 31.6295, lon: -7.9811, r: 70 },
      { cle: 'lecap', nom: 'Le Cap', lat: -33.9249, lon: 18.4241, r: 70 },
    ],
  },

  // La Lune n'existe pas encore, et c'est volontaire : ce qui compte est que
  // l'ajouter ne demande AUCUNE modification ailleurs. Le jour où on la fait,
  // c'est une entrée ici — rayon 1 737 km, ses propres lieux — et le reste du
  // moteur ne bouge pas d'une ligne. On la garde en commentaire plutôt qu'en
  // squelette vide : une entrée sans contenu se glisserait dans les listes du
  // jeu et Marlon verrait une carte où il n'y a rien.
  //
  //   lune: {
  //     id: 'lune', nom: 'La Lune', emoji: '🌙',
  //     projection: { type: 'equirectangulaire', rayonKm: 1737,
  //       lat0: 0, lon0: 0, kmParBloc: 2, ancre: { x: 0, z: 0 } },
  //     lieux: [
  //       { cle: 'tranquillite', nom: 'Mer de la Tranquillité', lat: 8.5, lon: 31.4, r: 90 },
  //       { cle: 'tycho', nom: 'Cratère Tycho', lat: -43.3, lon: -11.4, r: 60 },
  //     ],
  //   },
};

// --- ce que le reste du jeu appelle ------------------------------------------

const cache = new Map();

function projeteur(mondeId) {
  if (cache.has(mondeId)) return cache.get(mondeId);
  const m = MONDES[mondeId];
  if (!m) throw new Error(`monde inconnu : ${mondeId}`);
  const p = PROJECTIONS[m.projection.type](m.projection);
  cache.set(mondeId, p);
  return p;
}

// La position d'un lieu, en blocs. C'est LA fonction que tout le monde appelle,
// et la seule qui connaisse la projection.
export function positionDe(cle, mondeId = 'terre') {
  const m = MONDES[mondeId];
  const lieu = (m.lieux || []).find((l) => l.cle === cle);
  if (!lieu) throw new Error(`lieu inconnu sur ${mondeId} : ${cle}`);
  const { x, z } = projeteur(mondeId).versBlocs(lieu.lat, lieu.lon);
  return { x, z, r: lieu.r, nom: lieu.nom };
}

// Toutes les positions d'un coup, pour qui veut dessiner la carte entière.
export function lieuxDuMonde(mondeId = 'terre') {
  return (MONDES[mondeId].lieux || []).map((l) => ({ ...l, ...positionDe(l.cle, mondeId) }));
}

// --- la projection inverse : d'un bloc vers le ciel --------------------------
//
// La projection sait poser une latitude sur la carte ; dessiner les CONTINENTS
// demande l'inverse — pour chaque colonne de terrain, savoir au-dessus de quel
// point du globe elle se trouve, et demander à la Terre si c'est de la mer.
//
// La latitude s'inverse d'une ligne : elle est linéaire. La longitude, non —
// les compressions (l'Atlantique resserré à 60 %) la rendent affine PAR
// MORCEAUX. On bâtit donc une table cumulée, un demi-degré à la fois, et on y
// cherche par dichotomie. La table reprend les MÊMES facteurs de bande que le
// sens aller : les côtes dessinées et les villes posées se compressent
// ensemble, et New York reste sur sa côte même avec l'océan raccourci.
const cacheInverse = new Map();

function tableLongitudes(mondeId) {
  if (cacheInverse.has(mondeId)) return cacheInverse.get(mondeId);
  const p = MONDES[mondeId].projection;
  const D = Math.PI / 180;
  const kmParDegreLon = p.rayonKm * D * Math.cos(p.lat0 * D);
  // La table n'a besoin que des POINTS DE RUPTURE : la relation km↔longitude
  // est affine entre deux frontières de bande. Exacte, et minuscule.
  const ruptures = new Set([-180, 180, p.lon0]);
  for (const c of p.compressions || []) {
    if (c.de > -180 && c.de < 180) ruptures.add(c.de);
    if (c.a > -180 && c.a < 180) ruptures.add(c.a);
  }
  const lons = [...ruptures].sort((a, b) => a - b);
  const kms = [0];
  for (let i = 1; i < lons.length; i++) {
    const milieu = (lons[i - 1] + lons[i]) / 2;
    const bande = (p.compressions || []).find((c) => milieu >= c.de && milieu < c.a);
    kms.push(kms[i - 1] + (lons[i] - lons[i - 1]) * kmParDegreLon * (bande ? bande.k : 1));
  }
  const kmOrigine = kms[lons.indexOf(p.lon0)];
  const table = { lons, kms, kmOrigine, kmParDegreLat: p.rayonKm * D };
  cacheInverse.set(mondeId, table);
  return table;
}

export function cielDe(x, z, mondeId = 'terre') {
  const p = MONDES[mondeId].projection;
  const t = tableLongitudes(mondeId);
  const lat = p.lat0 + ((p.ancre.z - z) * p.kmParBloc) / t.kmParDegreLat;
  const km = t.kmOrigine + (x - p.ancre.x) * p.kmParBloc;
  // dichotomie dans la table cumulée, puis interpolation dans la tranche
  const { lons, kms } = t;
  if (km <= kms[0]) return { lat, lon: -180 };
  if (km >= kms[kms.length - 1]) return { lat, lon: 180 };
  let a = 0, b = kms.length - 1;
  while (b - a > 1) {
    const m = (a + b) >> 1;
    if (kms[m] <= km) a = m; else b = m;
  }
  const part = (km - kms[a]) / (kms[b] - kms[a] || 1);
  return { lat, lon: lons[a] + (lons[b] - lons[a]) * part };
}
