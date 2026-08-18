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

// Équirectangulaire : la plus simple des projections, et la bonne ici. Elle
// déforme les surfaces près des pôles, ce qui n'a aucune importance pour un
// jeu où l'on va de Paris à Rome — et elle a la propriété qui compte : une
// distance sur la carte est une distance sur le terrain.
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

  const kmVersEst = (lon) => {
    let km = 0;
    let reste = lon - p.lon0;
    // On parcourt l'écart de longitude par morceaux, en appliquant à chacun le
    // facteur de sa bande. Traiter la bande d'un bloc, comme le faisait un
    // premier jet, déplaçait aussi tout ce qui se trouvait au-delà.
    const pas = reste >= 0 ? 1 : -1;
    for (let l = p.lon0; pas > 0 ? l < lon : l > lon; l += pas) {
      const large = Math.min(l, l + pas);
      const bande = (p.compressions || []).find((c) => large >= c.de && large < c.a);
      km += pas * kmParDegreLon * (bande ? bande.k : 1);
    }
    return km;
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
      kmParBloc: 4,
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
      { cle: 'washington', nom: 'Washington', lat: 38.9072, lon: -77.0369, r: 120 },
      { cle: 'chine', nom: 'Chine', lat: 39.9042, lon: 116.4074, r: 150 },
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
