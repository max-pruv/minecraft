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

// LE LOT 3 : LES VILLES ENGENDRÉES. Chaque monument dit sa vraie hauteur et
// comment se lit son bâtisseur (`corps`, voir `paliersDuCorps`) ; quelques
// formes ont leurs paliers écrits en mètres, comme à Paris (une enceinte à
// tours, une pagode). Les hauteurs viennent des vrais monuments.
//
// ET LE CIEL GARDE SON ORDRE — le piège du premier jet de la v335 (les
// Invalides au-dessus de la tour Eiffel), que `tests/plafond.js` garde ville
// par ville. Un repère PLUS HAUT dans la vraie ville qu'un monument remis à
// l'échelle reste au-dessus de lui : s'il est un fût d'un bloc, la courbe de la
// ville passe dessous (le `k` de `CIELS`) ; s'il a du corps (une coupole, un
// prang, les tours de Marina Bay), il monte avec la ville (`ordre`). Un repère
// déjà plus haut que son ciel ne redescend jamais (la tour de Pise, la CN Tower).
// Une coupole : le tambour (couches 1 à 4), puis la calotte. Les premières
// couches de la calotte ont le rayon du tambour, mais elles sont de la COULEUR
// de la calotte : les étirer avec le corps faisait un long cylindre d'ardoise,
// un obus — vu en capture à Rome, Florence et Berlin. Le corps s'arrête donc
// au tambour.
const DOME = { 3: [5, 9], 4: [5, 10], 5: [5, 11], 6: [5, 12] };      // r → [a1, sommet]
const MINARET = (h) => [h - 2, h + 1];
const PALAIS = [5, 5], COLONNADE = [5, 6];
const ARCHE = (h) => [h + 1, h + 3];
export const ECHELLES_VILLES = Object.freeze({
  'Rome|Basilique St-Pierre': { vraie: 137, corps: DOME[6] },
  // La façade de la cathédrale de Pise, trente-quatre mètres ; le baptistère
  // en fait cinquante-cinq, un peu moins que la tour penchée.
  'Pise|Duomo de Pise': { vraie: 34, corps: DOME[4] },
  'Pise|Baptistère': { vraie: 55, corps: DOME[3] },
  // Les remparts de grès rouge, vingt et un mètres.
  'Agra|Fort d\'Agra': { vraie: 21, corps: [6, 6] },
  'Madrid|Palais royal': { vraie: 35, corps: PALAIS },
  'Madrid|Porte d\'Alcalá': { vraie: 20, corps: ARCHE(7) },
  // LES TOURS D'ANGLE D'UNE ENCEINTE SONT DES FÛTS. `muraillesRect` les pose
  // d'un bloc de large sur trois couches : étirées jusqu'à la vraie tour
  // Spasskaïa, c'étaient des aiguilles (vu en capture au Kremlin et au Grand
  // Palais). Les murs prennent leur vraie hauteur, les tours une fois et demie
  // leurs trois couches au-dessus — `vraie` est alors la hauteur de ces tours.
  // Des murailles de quatorze mètres, des tours de vingt-deux.
  'Lisbonne|Château São Jorge': { vraie: 22, paliers: [[0, 0], [1, 1], [5, 14], [6, 15], [8, 23]] },
  'Lisbonne|Santa Justa': { vraie: 45, corps: MINARET(10), fut: true },
  'Amsterdam|Palais du Dam': { vraie: 51, corps: PALAIS },
  'Amsterdam|Rijksmuseum': { vraie: 45, corps: PALAIS },
  'Berlin|Porte de Brandebourg': { vraie: 26, corps: ARCHE(7) },
  'Berlin|Reichstag': { vraie: 47, corps: DOME[4] },
  'Berlin|Berliner Dom': { vraie: 98, corps: DOME[4], ordre: true },
  'Vienne|La Hofburg': { vraie: 30, corps: PALAIS },
  'Prague|Le château de Prague': { vraie: 25, corps: PALAIS },
  'Florence|Le Duomo': { vraie: 114, corps: DOME[5] },
  // Le Parthénon fait 13,7 mètres : c'est son rocher qui le met au-dessus
  // d'Athènes, et le rocher n'est pas dans le bâtisseur.
  'Athènes|Le Parthénon': { vraie: 14, corps: COLONNADE },
  'Athènes|Temple de Zeus': { vraie: 17, corps: COLONNADE },
  'Athènes|Le Parlement': { vraie: 25, corps: PALAIS },
  'Istanbul|Sainte-Sophie': { vraie: 55, corps: DOME[6] },
  // La coupole de la Mosquée bleue, quarante-trois mètres (ses minarets, que
  // le bâtisseur n'a pas, en font soixante-quatre).
  'Istanbul|La Mosquée bleue': { vraie: 43, corps: DOME[5] },
  'Moscou|Saint-Basile': { vraie: 48, corps: [7, 11] },
  // Des murs de dix-neuf mètres, des tours d'enceinte d'une trentaine (la
  // Spasskaïa, soixante et onze, n'est pas dans le bâtisseur).
  'Moscou|Le Kremlin': { vraie: 30, paliers: [[0, 0], [1, 1], [6, 19], [7, 20], [9, 31]] },
  'Moscou|Le Bolchoï': { vraie: 36, corps: COLONNADE },
  'Saint-Pétersbourg|Le palais d\'Hiver': { vraie: 23, corps: PALAIS },
  'Saint-Pétersbourg|Saint-Sauveur-sur-le-Sang': { vraie: 81, corps: [7, 11] },
  'Saint-Pétersbourg|Notre-Dame-de-Kazan': { vraie: 72, corps: COLONNADE },
  'Stockholm|Le Palais royal': { vraie: 32, corps: PALAIS },
  'Stockholm|Storkyrkan': { vraie: 66, corps: MINARET(10), fut: true },
  'Copenhague|Amalienborg': { vraie: 22, corps: PALAIS },
  'Copenhague|La Rundetaarn': { vraie: 35, corps: MINARET(10), fut: true },
  // Les plus hauts Supertrees, cinquante mètres ; Marina Bay Sands, deux cents.
  'Singapour|Les Supertrees': { vraie: 50, corps: [8, 8] },
  'Singapour|Marina Bay Sands': { vraie: 200, corps: [17, 17], ordre: true },
  // Des murs de huit mètres, des tours d'angle de quatorze.
  'Bangkok|Le Grand Palais': { vraie: 14, paliers: [[0, 0], [1, 1], [5, 8], [6, 9], [8, 15]] },
  // Le prang de Wat Arun, quatre-vingt-deux mètres, quatre étages qui
  // rétrécissent : chaque étage s'étire, chaque toit reste un rang.
  'Bangkok|Wat Arun': { vraie: 82, ordre: true,
    paliers: [[0, 0], [1, 1], [3, 9], [4, 10], [6, 18], [7, 19], [9, 34], [10, 37], [12, 55], [13, 60], [14, 83]] },
  // Le mur des Lamentations, dix-neuf mètres au-dessus de son esplanade.
  'Jérusalem|Le mur des Lamentations': { vraie: 19, corps: [7, 6] },
  'Mumbai|Le Taj Mahal Palace': { vraie: 60, corps: PALAIS },
  'Mumbai|La gare Victoria': { vraie: 50, corps: DOME[4] },
  'Delhi|La porte de l\'Inde': { vraie: 42, corps: ARCHE(10) },
  // Le Samrat Yantra, le grand cadran, vingt et un mètres.
  'Delhi|Jantar Mantar': { vraie: 21, corps: [5, 4] },
  'Delhi|Rashtrapati Bhavan': { vraie: 55, corps: DOME[4], ordre: true },
  'Los Angeles|Walt Disney Hall': { vraie: 46, corps: DOME[4] },
  'Toronto|Le Rogers Centre': { vraie: 86, corps: DOME[5] },
  // La tour de l'horloge de l'ancien hôtel de ville, cent quatre mètres.
  'Toronto|L\'ancien hôtel de ville': { vraie: 104, corps: MINARET(12), fut: true },
  'Mexico|La cathédrale': { vraie: 67, corps: DOME[4] },
  'Mexico|Bellas Artes': { vraie: 53, corps: DOME[4] },
  'Buenos Aires|La Casa Rosada': { vraie: 26, corps: PALAIS },
  // La tour du Cabildo, trente mètres.
  'Buenos Aires|Le Cabildo': { vraie: 30, corps: ARCHE(4) },
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
  'Munich|Colonne de Marie': { vrai: 'une colonne de onze mètres au milieu de la Marienplatz' },
  'Istanbul|Topkapi': { vrai: 'un palais bas, en pavillons autour de ses cours et de ses jardins' },
  'Mexico|Le Templo Mayor': { vrai: 'ce sont des ruines, fouillées sous le niveau de la rue' },
  'Kyoto|Le Pavillon d\'or': { vrai: 'un pavillon de douze mètres et demi au bord de son étang' },
  'Bangkok|Wat Pho': { vrai: 'le Bouddha couché (quinze mètres) dort sous le toit de son temple' },
  // Dette déclarée : remis à l'échelle dans la livraison suivante.
  'New York|Arche de Washington': { lot: 'lot 2 — les villes bâties à la main' },
  'Lille|Opéra de Lille': { lot: 'lot 2 — les villes bâties à la main' },
  'Washington|Musée d\'Histoire américaine': { lot: 'lot 2 — les villes bâties à la main' },
  'Washington|Musée de l\'Indien d\'Amérique': { lot: 'lot 2 — les villes bâties à la main' },
  'Washington|Le Trésor': { lot: 'lot 2 — les villes bâties à la main' },
  'Washington|Archives nationales': { lot: 'lot 2 — les villes bâties à la main' },
  'Washington|Théâtre Ford': { lot: 'lot 2 — les villes bâties à la main' },
  'Londres|Buckingham Palace': { lot: 'lot 2 — les villes bâties à la main' },
});

// L'ÉCHELLE DU CIEL : un bloc pour un mètre jusqu'à la corniche, puis une
// courbe qui mène la tour Eiffel (330 m) à 69 blocs.
export const CORNICHE = 20, EIFFEL_M = 330, EIFFEL_BLOCS = 69;
const K_CIEL = (EIFFEL_BLOCS - CORNICHE) / Math.log(EIFFEL_M / CORNICHE);

// LE CIEL DE CHAQUE VILLE (lot 3, les villes engendrées). Un bloc pour un mètre
// jusqu'à la corniche de SES immeubles, puis la courbe de Paris posée sur cette
// corniche : la même forme, mise à l'échelle de la corniche (`K` vaut
// `K_CIEL × c / 20`), si bien qu'un monument N fois plus haut que les toits de
// sa ville en est N fois plus haut dans le ciel de Paris comme dans le sien —
// et la pente au ras des toits reste sous un bloc par mètre. Garder le `K` de
// Paris sur une corniche de treize blocs aurait mis le palais d'Hiver (22 m) à
// vingt-quatre blocs : plus d'un bloc par mètre, le contraire d'une échelle.
//
// La corniche est une MESURE : la plus haute des médianes des immeubles autour
// des repères de la ville (le témoin de `tests/plafond.js`, même lecture). Une
// ville qui n'est pas ici garde la corniche de Paris.
//
// ET LA COURBE PASSE SOUS LE PLUS HAUT REPÈRE. Là où un repère que la livraison
// ne touche pas est plus haut dans la vraie ville qu'un monument remis à
// l'échelle — la Westerkerk (85 m, 17 blocs) au-dessus du palais du Dam (51 m),
// la tour de Galata au-dessus de Sainte-Sophie, la Torre Latino au-dessus de la
// cathédrale de Mexico — la courbe de la ville se COMPRIME (`[c, k]` : son `K`
// multiplié par `k`) jusqu'à passer sous lui. Le premier jet montait ces
// repères à la place : des fûts d'un bloc de large étirés en aiguilles, vus en
// capture. `k` est un RÉSULTAT : le plus grand, au centième, qui garde l'ordre
// du vrai ciel de la ville (sonde `k.mjs` de la v341, refaite par le témoin).
export const CIELS = Object.freeze({
  Rome: 13, Pise: 12, Agra: 12, Madrid: 13, Lisbonne: [13, 0.92], Amsterdam: [13, 0.38],
  Berlin: 13, Vienne: 13, Prague: [10, 0.59], Florence: 13, 'Athènes': 12, Istanbul: [13, 0.48],
  Moscou: 13, 'Saint-Pétersbourg': 12, Stockholm: [13, 0.26], Copenhague: [13, 0.92],
  Singapour: 13, Bangkok: 12, 'Jérusalem': [8, 0.78], Mumbai: 12, Delhi: 15,
  'Los Angeles': [20, 0.2], Toronto: [15, 0.3], Mexico: [13, 0.95], 'Buenos Aires': 15,
});
export const blocsDuCiel = (m, c = CORNICHE, k = 1) => (m <= c ? m : c + k * K_CIEL * (c / CORNICHE) * Math.log(m / c));

// Les paliers en couches du monde. Une couche d'auteur n'est jamais écrasée
// sous une couche du monde : la pente reste au moins un, sinon le voxel
// perdrait des couches que le modèle, lui, garderait.
function paliersDuMonde(paliers, c, k) {
  const out = [];
  for (const [a, m] of paliers) {
    let b = blocsDuCiel(m, c, k);
    if (out.length) b = Math.max(b, out[out.length - 1][1] + (a - out[out.length - 1][0]));
    out.push([a, b]);
  }
  return out;
}

// LE CORPS ET LA COURONNE. Les monuments des villes engendrées sortent des
// petits bâtisseurs partagés de `villesmonde.js` (`dome`, `minaret`,
// `palaisLong`…), et chacun se lit en deux parties : un CORPS de section
// constante (le tambour d'une coupole, le fût d'une tour, les murs d'un
// palais) et une COURONNE qui change de section à chaque couche (la calotte,
// le balcon et la flèche, le toit). `corps: [a1, sommet]` : le corps va de la
// couche 1 à `a1`, la couronne de `a1` au sommet d'auteur. Le corps prend
// l'étirement, la couronne ne s'étire que du facteur à la puissance ¾ (au
// moins un) : une calotte étirée d'autant que le tambour deviendrait un obus
// (v335), à la racine elle restait une galette sur un fût. La couche 0, le sol
// du repère, ne bouge pas.
function paliersDuCorps([a1, sommet], vraie, c, k, fut) {
  const T = Math.min(blocsDuCiel(vraie + 1, c, k), fut ? FUT_MAX * (sommet + 1) : Infinity);
  const f = (T - 1) / (sommet + 1 - 1);
  const s = Math.max(1, Math.min(f, f ** 0.75));
  const n = sommet + 1 - a1;
  const D = Math.max(a1, T - n * s);
  return n > 0 ? [[0, 0], [1, 1], [a1, D], [sommet + 1, Math.max(T, D + n)]] : [[0, 0], [1, 1], [sommet + 1, T]];
}

// UN FÛT D'UN BLOC DE LARGE NE S'ÉTIRE PAS EN AIGUILLE. Le minaret partagé
// est une colonne d'un bloc : à vingt-six blocs, Santa Justa était une aiguille
// au-dessus de Lisbonne — vu en capture, le piège même de la v335. Un fût
// (`fut: true`) ne monte pas au-delà d'une fois et demie sa hauteur d'auteur,
// et la courbe de sa ville passe sous lui (le `k` de `CIELS`).
const FUT_MAX = 1.5;

const cleDe = (ville, nom) => `${ville}|${nom}`;
const MONDE = new Map();
export const echelleDe = (ville, nom) => {
  const e = ECHELLES[cleDe(ville, nom)] || ECHELLES_VILLES[cleDe(ville, nom)];
  if (!e) return null;
  if (!MONDE.has(e)) {
    const [c, k] = [].concat(CIELS[ville] || CORNICHE, 1);
    const paliers = e.corps ? paliersDuCorps(e.corps, e.vraie, c, k, e.fut) : paliersDuMonde(e.paliers, c, k);
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
