// LES MONUMENTS À LA HAUTEUR DE LEUR VILLE.
//
// Un étage fait trois blocs depuis la v301 : les immeubles de Paris montent à
// vingt et un, vingt-quatre blocs, et les monuments n'avaient pas suivi. Mesuré
// sous node en appelant les bâtisseurs (`tests/plafond.js`, le témoin des
// monuments) : l'Opéra à dix-neuf blocs au milieu d'immeubles à vingt, le
// Panthéon à trente-deux pour quatre-vingt-trois mètres, Notre-Dame à
// trente et un pour une flèche à quatre-vingt-seize. Dans la vraie ville, ils
// dominent les toits ; dans le jeu, l'Opéra était plus bas que ses voisins.
//
// LA RÈGLE : L'ÉCHELLE DU CIEL. Le premier jet posait la vraie hauteur à un
// bloc pour un mètre, et la capture aérienne l'a démenti : les Invalides à 107,
// Notre-Dame à 96, le Sacré-Cœur et le Panthéon à 83 passaient TOUS au-dessus
// de la tour Eiffel, qui reste à soixante-neuf par décision de la v292 — dans le
// vrai ciel de Paris, rien n'approche la tour. « Un bloc pour un mètre » et
// « Eiffel à soixante-dix » ne tiennent pas ensemble. La règle garde les deux
// points fixes : un bloc pour un mètre jusqu'à la corniche (vingt mètres, la
// hauteur des immeubles depuis la v301), puis une courbe logarithmique qui
// mène la tour Eiffel (330 m) à soixante-neuf. L'ORDRE du vrai ciel est
// gardé — Eiffel, Montparnasse, les Invalides, Notre-Dame, le Sacré-Cœur et le
// Panthéon, l'Opéra, la Bastille, l'Arc — et tout reste nettement au-dessus des
// toits. Les paliers s'écrivent en MÈTRES ; `blocsDuCiel` les convertit.
//
// LA MÉTHODE : ON N'ÉCRIT PAS DEUX FOIS UN MONUMENT. Le bâtisseur du voxel et le
// modèle en relief (`paris-monuments-hd.js`) gardent leurs cotes d'auteur ; ce
// fichier publie, par monument, une TABLE DE PALIERS — des couples (hauteur
// d'auteur, hauteur dans le monde) — et une seule fonction qui l'applique aux
// deux. Le voxel répète ses couches, le modèle étire ses sommets : un modèle
// suit les cotes du voxel (v292), par construction.
//
// Trois choses à savoir avant d'y toucher.
//
// 1. CE QUI EST SOUS LE PREMIER PALIER NE BOUGE PAS. Les trois premiers niveaux
//    (le sol, la porte, le rez) gardent leur hauteur : une porte reste à la
//    taille d'un enfant, un parvis reste un parvis, et rien ne s'étire sous la
//    cote du sol. On étire la MASSE, pas le seuil.
// 2. UNE COUPOLE S'ÉTIRE PAR SES COUCHES DE MÊME RAYON. Une coupole de voxel
//    est une pile d'anneaux qui rétrécissent ; étirée d'un bloc, chaque anneau
//    devient une marche haute et la coupole une RUCHE en gradins — vu en
//    capture aérienne aux Invalides. Les premières couches d'une coupole ont
//    le même rayon (`dome` de paris.js arrondit) : étirées, elles font un
//    TAMBOUR à paroi droite, ce qu'ont les vrais dômes de Paris, et la calotte
//    au-dessus garde une pente douce. Les paliers se posent donc aux couches
//    où le rayon change, pas à la moitié de la coupole.
// 3. LE MONDE D'AVANT GARDE SES MONUMENTS D'AVANT. `CONF_AVANT` et `CONF_V308`
//    (world.js) lisent la liste non étirée : un bloc posé avant cette version
//    se juge sur le monde où il a été posé (v306). Le prix se déclare
//    (`TASKS.md`) : une cabane posée sur un ancien toit de monument se retrouve
//    DANS le monument étiré — le journal des blocs la garde, rien n'est perdu.
//
// Aucun import : ce fichier tourne dans le worker du mailleur (v251).

// `paliers` : [[hauteur d'auteur, hauteur dans le monde], …], croissants, en
// couches du monde au-dessus du sol du repère (la couche 0 est le sol : les
// bâtisseurs de Paris posent leur premier niveau en 1). Une
// couche d'auteur `y` occupe [y, y + 1) ; elle va dans le monde de f(y) à
// f(y + 1). La seconde colonne est en MÈTRES réels (le dernier palier vaut
// (sommet d'auteur + 1, vraie hauteur + 1)) ; `paliersDuMonde` la passe par
// l'échelle du ciel.
export const ECHELLES = Object.freeze({
  // Notre-Dame : la nef à trente-trois mètres, le faîte à quarante-trois, les
  // tours à soixante-neuf, la flèche de Viollet-le-Duc à quatre-vingt-seize.
  'Paris|Notre-Dame': { vraie: 96, paliers: [[0, 0], [4, 4], [15, 34], [20, 44], [24, 70], [32, 97]] },
  // Le Sacré-Cœur : la basilique, puis le tambour et la coupole ovoïde, la
  // lanterne à quatre-vingt-trois.
  'Paris|Sacré-Cœur': { vraie: 83, paliers: [[0, 0], [4, 4], [11, 37], [15, 60], [19, 72], [24, 84]] },
  // Le Panthéon : la cella à trente mètres, le tambour à colonnes jusqu'à
  // cinquante-huit, la coupole et sa lanterne à quatre-vingt-trois.
  'Paris|Panthéon': { vraie: 83, paliers: [[0, 0], [4, 4], [13, 31], [23, 59], [33, 84]] },
  // Les Invalides : la façade à vingt-cinq mètres, l'église du Dôme à trente-deux,
  // puis le dôme d'or — le pied de la coupole tenu en tambour — et la flèche à
  // cent sept.
  'Paris|Invalides': { vraie: 107, paliers: [[0, 0], [4, 4], [10, 26], [13, 33], [17, 70], [20, 80], [23, 108]] },
  // L'Opéra Garnier : la façade à trente-deux mètres, la coupole verte, la lyre
  // d'Apollon à soixante-treize.
  'Paris|Opéra': { vraie: 73, paliers: [[0, 0], [4, 4], [11, 38], [17, 58], [20, 74]] },
  // L'Arc de Triomphe : cinquante mètres d'un seul bloc de pierre.
  'Paris|Arc de Triomphe': { vraie: 50, paliers: [[0, 0], [3, 3], [22, 51]] },
  // La colonne de Juillet : cinquante-deux mètres, génie compris. Le socle
  // garde ses deux marches.
  'Paris|Bastille': { vraie: 52, paliers: [[0, 0], [3, 3], [21, 53]] },
  // La tour Montparnasse : deux cent dix mètres. Sous la tour Eiffel, comme
  // dans la vraie ville.
  'Paris|Montparnasse': { vraie: 210, paliers: [[0, 0], [1, 1], [39, 211]] },
});

// LES MONUMENTS PLUS BAS QUE LEURS IMMEUBLES, ET C'EST VOULU — ou c'est pour un
// lot suivant. Le témoin (`tests/plafond.js`) exige qu'aucun monument ne soit
// plus bas que la médiane des immeubles autour de lui, SAUF ceux-ci, et chacun
// dit pourquoi. Un monument qui sort de cette liste doit être remis à
// l'échelle dans la même livraison ; un monument qui y entre se justifie.
//
// `vrai` : dans la vraie ville aussi, il est plus bas que ce qui l'entoure — un
// pont, une place, une statue, une fontaine, une voie. Ces entrées-là restent.
// `lot` : remis à l'échelle dans une livraison suivante, nommée. Ces entrées
// sont une DETTE DÉCLARÉE, elles doivent disparaître.
export const BAS_DECLARES = Object.freeze({
  // Dans la vraie ville aussi, ils sont plus bas que ce qui les entoure.
  'Paris|Pyramide du Louvre': { vrai: 'la pyramide (21,6 m) est plus basse que le palais du Louvre qui l\'entoure' },
  'New York|Bourse de New York': { vrai: 'la Bourse est un temple de six étages au pied des tours de Wall Street' },
  'San Francisco|Lombard Street': { vrai: 'c\'est une rue' },
  'San Francisco|Dragon Gate': { vrai: 'une porte de Chinatown, plus basse que les immeubles de Grant Avenue' },
  'Nice|Port Lympia': { vrai: 'c\'est un port' },
  'Nice|Cours Saleya': { vrai: 'c\'est un marché à ciel ouvert' },
  'Nice|Baleine du Paillon': { vrai: 'c\'est une fontaine' },
  'Nice|Promenade des Anglais': { vrai: 'c\'est une promenade' },
  'Washington|Pont du Mémorial': { vrai: 'c\'est un pont' },
  'Washington|Pont de la 14e Rue': { vrai: 'c\'est un pont' },
  'Washington|Mémorial des vétérans du Vietnam': { vrai: 'c\'est un mur creusé dans le sol' },
  'Washington|Arc de Chinatown': { vrai: 'une porte, plus basse que les immeubles de H Street' },
  'Londres|Le Globe': { vrai: 'un théâtre de trois galeries au pied des immeubles de Bankside' },
  'Rome|Forum romain': { vrai: 'ce sont des ruines' },
  'Madrid|Plaza Mayor': { vrai: 'c\'est une place, bordée d\'immeubles à la hauteur de leurs voisins' },
  'Lisbonne|Praça do Comércio': { vrai: 'c\'est une place' },
  'Bruxelles|Manneken Pis': { vrai: 'c\'est une statue de cinquante-cinq centimètres' },
  'Copenhague|La Petite Sirène': { vrai: 'c\'est une statue sur son rocher' },
  'Kyoto|Fushimi Inari': { vrai: 'ce sont des allées de torii' },
  'Hong Kong|Le Star Ferry': { vrai: 'c\'est un embarcadère' },
  'Singapour|Le Merlion': { vrai: 'c\'est une statue de huit mètres' },
  'Dubaï|La fontaine de Dubaï': { vrai: 'c\'est une fontaine' },
  'Chicago|Le Bean': { vrai: 'c\'est une sculpture de dix mètres' },
  'Chicago|Navy Pier': { vrai: 'c\'est une jetée' },
  'Miami|Ocean Drive': { vrai: 'c\'est une avenue de bord de mer' },
  'La Havane|Les vieilles américaines': { vrai: 'ce sont des voitures' },
  'Seattle|Pike Place': { vrai: 'un marché couvert au pied des tours du centre' },
  'Prague|Le pont Charles': { vrai: 'c\'est un pont' },
  'Florence|Le Ponte Vecchio': { vrai: 'c\'est un pont' },
  'Le Cap|Le château de Bonne-Espérance': { vrai: 'une forteresse aux murs bas' },
  'La Havane|El Morro': { vrai: 'une forteresse sur son rocher' },
  'Tokyo|Le palais impérial': { vrai: 'un palais bas dans ses jardins, au pied des tours de Marunouchi' },
  'Séoul|Gyeongbokgung': { vrai: 'un palais bas, au pied des tours de Gwanghwamun' },
  'Séoul|Namdaemun': { vrai: 'une porte de ville au milieu des tours' },
  'Shanghai|Le jardin Yu': { vrai: 'c\'est un jardin' },
  'Jérusalem|La vieille ville': { vrai: 'des remparts et des ruelles, plus bas que la ville neuve' },
  'Marrakech|Le palais Bahia': { vrai: 'un palais de plain-pied autour de ses cours' },
  // Dette déclarée : remis à l'échelle dans les deux livraisons suivantes.
  'New York|Arche de Washington': { lot: 'lot 2 — les villes bâties à la main' },
  'Lille|Opéra de Lille': { lot: 'lot 2 — les villes bâties à la main' },
  'Washington|Musée d\'Histoire américaine': { lot: 'lot 2 — les villes bâties à la main' },
  'Washington|Musée de l\'Indien d\'Amérique': { lot: 'lot 2 — les villes bâties à la main' },
  'Washington|Le Trésor': { lot: 'lot 2 — les villes bâties à la main' },
  'Washington|Archives nationales': { lot: 'lot 2 — les villes bâties à la main' },
  'Washington|Théâtre Ford': { lot: 'lot 2 — les villes bâties à la main' },
  'Londres|Buckingham Palace': { lot: 'lot 2 — les villes bâties à la main' },
  'Rome|Basilique St-Pierre': { lot: 'lot 3 — les villes engendrées' },
  'Pise|Duomo de Pise': { lot: 'lot 3 — les villes engendrées' },
  'Pise|Baptistère': { lot: 'lot 3 — les villes engendrées' },
  'Agra|Fort d\'Agra': { lot: 'lot 3 — les villes engendrées' },
  'Madrid|Palais royal': { lot: 'lot 3 — les villes engendrées' },
  'Madrid|Porte d\'Alcalá': { lot: 'lot 3 — les villes engendrées' },
  'Lisbonne|Château São Jorge': { lot: 'lot 3 — les villes engendrées' },
  'Lisbonne|Santa Justa': { lot: 'lot 3 — les villes engendrées' },
  'Amsterdam|Palais du Dam': { lot: 'lot 3 — les villes engendrées' },
  'Amsterdam|Rijksmuseum': { lot: 'lot 3 — les villes engendrées' },
  'Berlin|Porte de Brandebourg': { lot: 'lot 3 — les villes engendrées' },
  'Berlin|Reichstag': { lot: 'lot 3 — les villes engendrées' },
  'Munich|Colonne de Marie': { lot: 'lot 3 — les villes engendrées' },
  'Vienne|La Hofburg': { lot: 'lot 3 — les villes engendrées' },
  'Prague|Le château de Prague': { lot: 'lot 3 — les villes engendrées' },
  'Florence|Le Duomo': { lot: 'lot 3 — les villes engendrées' },
  'Athènes|Le Parthénon': { lot: 'lot 3 — les villes engendrées' },
  'Athènes|Temple de Zeus': { lot: 'lot 3 — les villes engendrées' },
  'Athènes|Le Parlement': { lot: 'lot 3 — les villes engendrées' },
  'Istanbul|Sainte-Sophie': { lot: 'lot 3 — les villes engendrées' },
  'Istanbul|La Mosquée bleue': { lot: 'lot 3 — les villes engendrées' },
  'Istanbul|Topkapi': { lot: 'lot 3 — les villes engendrées' },
  'Moscou|Saint-Basile': { lot: 'lot 3 — les villes engendrées' },
  'Moscou|Le Kremlin': { lot: 'lot 3 — les villes engendrées' },
  'Moscou|Le Bolchoï': { lot: 'lot 3 — les villes engendrées' },
  'Saint-Pétersbourg|Le palais d\'Hiver': { lot: 'lot 3 — les villes engendrées' },
  'Saint-Pétersbourg|Saint-Sauveur-sur-le-Sang': { lot: 'lot 3 — les villes engendrées' },
  'Saint-Pétersbourg|Notre-Dame-de-Kazan': { lot: 'lot 3 — les villes engendrées' },
  'Stockholm|Le Palais royal': { lot: 'lot 3 — les villes engendrées' },
  'Stockholm|Storkyrkan': { lot: 'lot 3 — les villes engendrées' },
  'Copenhague|Amalienborg': { lot: 'lot 3 — les villes engendrées' },
  'Copenhague|La Rundetaarn': { lot: 'lot 3 — les villes engendrées' },
  'Kyoto|Le Pavillon d\'or': { lot: 'lot 3 — les villes engendrées' },
  'Singapour|Les Supertrees': { lot: 'lot 3 — les villes engendrées' },
  'Bangkok|Le Grand Palais': { lot: 'lot 3 — les villes engendrées' },
  'Bangkok|Wat Pho': { lot: 'lot 3 — les villes engendrées' },
  'Jérusalem|Le mur des Lamentations': { lot: 'lot 3 — les villes engendrées' },
  'Mumbai|Le Taj Mahal Palace': { lot: 'lot 3 — les villes engendrées' },
  'Mumbai|La gare Victoria': { lot: 'lot 3 — les villes engendrées' },
  'Delhi|La porte de l\'Inde': { lot: 'lot 3 — les villes engendrées' },
  'Delhi|Jantar Mantar': { lot: 'lot 3 — les villes engendrées' },
  'Los Angeles|Walt Disney Hall': { lot: 'lot 3 — les villes engendrées' },
  'Toronto|Le Rogers Centre': { lot: 'lot 3 — les villes engendrées' },
  'Toronto|L\'ancien hôtel de ville': { lot: 'lot 3 — les villes engendrées' },
  'Mexico|La cathédrale': { lot: 'lot 3 — les villes engendrées' },
  'Mexico|Le Templo Mayor': { lot: 'lot 3 — les villes engendrées' },
  'Mexico|Bellas Artes': { lot: 'lot 3 — les villes engendrées' },
  'Buenos Aires|La Casa Rosada': { lot: 'lot 3 — les villes engendrées' },
  'Buenos Aires|Le Cabildo': { lot: 'lot 3 — les villes engendrées' },
});

// L'ÉCHELLE DU CIEL : un bloc pour un mètre jusqu'à la corniche, puis une
// courbe qui mène la tour Eiffel (330 m) à 69 blocs.
export const CORNICHE = 20, EIFFEL_M = 330, EIFFEL_BLOCS = 69;
const K_CIEL = (EIFFEL_BLOCS - CORNICHE) / Math.log(EIFFEL_M / CORNICHE);
export const blocsDuCiel = (m) => (m <= CORNICHE ? m : CORNICHE + K_CIEL * Math.log(m / CORNICHE));

// Les paliers en couches du monde. Une couche d'auteur n'est jamais écrasée
// sous une couche du monde : la pente reste au moins un, sinon le voxel
// perdrait des couches que le modèle, lui, garderait.
function paliersDuMonde(paliers) {
  const out = [];
  for (const [a, m] of paliers) {
    let b = blocsDuCiel(m);
    if (out.length) b = Math.max(b, out[out.length - 1][1] + (a - out[out.length - 1][0]));
    out.push([a, b]);
  }
  return out;
}

const cleDe = (ville, nom) => `${ville}|${nom}`;
const MONDE = new Map();
export const echelleDe = (ville, nom) => {
  const e = ECHELLES[cleDe(ville, nom)];
  if (!e) return null;
  if (!MONDE.has(e)) {
    const paliers = paliersDuMonde(e.paliers);
    MONDE.set(e, { ...e, paliers, cible: Math.floor(paliers[paliers.length - 1][1]) - 1 });
  }
  return MONDE.get(e);
};
export const basDeclare = (ville, nom) => BAS_DECLARES[cleDe(ville, nom)] || null;

// La hauteur dans le monde d'une cote d'auteur CONTINUE (le modèle en relief).
// Sous le premier palier comme au-delà du dernier, la pente vaut un.
export function hauteurEtiree(paliers, y) {
  if (y <= paliers[0][0]) return y + paliers[0][1] - paliers[0][0];
  for (let i = 1; i < paliers.length; i++) {
    const [a0, b0] = paliers[i - 1], [a1, b1] = paliers[i];
    if (y <= a1) return b0 + (y - a0) * (b1 - b0) / (a1 - a0);
  }
  const [a, b] = paliers[paliers.length - 1];
  return y + b - a;
}

// Le bâtisseur du voxel, étiré : chaque couche d'auteur `dy` se répète sur les
// couches du monde [⌊f(dy)⌋, ⌊f(dy + 1)⌋). Une cellule du monde ne vient que
// d'UNE cellule d'auteur, donc « la dernière écriture fait foi » reste vrai.
export function etirerBatisseur(build, paliers) {
  return (poser) => build((dx, dy, dz, id) => {
    const a = Math.floor(hauteurEtiree(paliers, dy));
    const b = Math.max(a + 1, Math.floor(hauteurEtiree(paliers, dy + 1)));
    for (let y = a; y < b; y++) poser(dx, y, dz, id);
  });
}

// Les sommets du modèle en relief, étirés par la même fonction.
export function etirerFaces(faces, paliers) {
  return faces.map((f) => ({ ...f, p: f.p.map((q) => [q[0], hauteurEtiree(paliers, q[1]), q[2]]) }));
}
