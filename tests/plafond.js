// Le plafond du monde : on l'a relevé, et le sol ne doit pas avoir bougé.
//
// Le monde s'arrêtait à quatre-vingt-seize blocs de haut. C'était assez pour
// une maison, pas pour une tour Eiffel. Il monte maintenant à cent soixante.
//
// Le danger n'est pas dans le ciel qu'on ouvre : il est dans le sol. Des
// mondes existent déjà, avec des milliers de blocs posés par les enfants, et
// chacun est repéré par ses coordonnées absolues. Que le relief se décale
// d'un seul bloc, et une maison se retrouve enterrée ou suspendue en l'air.
// C'est irrattrapable — personne ne peut deviner où elle était.
//
// Ces témoins gardent donc deux choses, dans cet ordre d'importance : que le
// paysage engendré est resté exactement le même, et qu'on peut désormais
// bâtir bien plus haut.
//
//     cd tests && npm install && npm run plafond

const { Banc, dormir } = require('./banc.js');
const { createHash } = require('crypto');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

// L'empreinte du relief, sur deux cent mille colonnes réparties sur toute la
// carte.
//
// Si ce chiffre change, c'est que le terrain engendré n'est plus le même —
// donc que tous les mondes déjà sauvegardés viennent de se décaler. Ce n'est
// pas une valeur à mettre à jour d'un revers de main : c'est une décision, et
// elle se paie en maisons perdues.
//
// **Elle a changé deux fois**, toutes deux pour Washington, sous l'exception
// que Max a accordée pour la remise à plat de la carte — « on peut se
// permettre de casser certaines choses pour refaire bien le fond ».
//
// En v161, pour bâtir la capitale près du point d'apparition. En v162, pour
// la DÉMÉNAGER au sud et la tripler : l'ancienne emprise rend alors son relief
// d'avant v161 — vérifié : l'empreinte hors-zone de v162 est identique à celle
// de v160, colonne pour colonne — et la nouvelle emprise prend le sien.
// Valeurs précédentes, pour mémoire :
// v160 : eb490353e3ffb238d8090c0854f9654045ff6bef
// v161 : b29a76348ff4b20a5827ba585b65d1786f19131b
// v162 : 7d60346f002c3df460f9be9e879b51ff60f024e1
//
// **Troisième changement, en v163** : la remise à plat de la carte. Les villes
// ne sont plus posées à des coordonnées écrites à la main mais déduites de leur
// latitude et de leur longitude réelles (cf. src/mondes.js). Toutes ont bougé —
// New York, San Francisco et Washington de plusieurs milliers de blocs vers
// l'ouest —, donc le relief de la fenêtre observée a changé partout où l'une
// d'elles se trouvait. C'est la casse que Max avait autorisée pour ce chantier
// précis : « on peut se permettre de casser certaines choses pour refaire bien
// le fond ».
// v163 (villes remises sur leurs vraies coordonnées) : e6041d0a5a7b3f8c…
//
// Et une quatrième fois dans la même livraison, pour le TOUR DU MONDE : neuf
// sites s'ajoutent — Londres, Rome, Barcelone, Pise, Gizeh, Agra, Sydney, Rio
// et Seattle — chacun aplanissant le parvis de son monument. Un seul tombe
// dans la fenêtre observée, Londres ; les huit autres sont trop loin pour y
// paraître, et ne changent donc pas ce chiffre-ci.
// v164 (villes sur leurs vraies coordonnées) : da4fccca8dc97507…
//
// **Cinquième changement, en v165, et c'est le plus grand** : la Terre. Max —
// « quand je regarde la carte, je ne reconnais pas la vraie carte du monde…
// il y a aussi le relief : les Alpes, l'Himalaya, le Grand Canyon. » La
// fenêtre observée contient désormais la Manche et la mer du Nord (le
// planisphère les met là où elles sont), Londres bâtie en ville entière, et
// les villes recalées au kilomètre près — la projection quantifiait la
// longitude au degré, Rome était 60 km trop à l'est. Les DIX-HUIT colonnes
// nommées, elles, n'ont pas bougé d'un bloc : la casse est réelle, elle est
// voulue, et elle est confinée là où la Terre a pris ses droits.
//
// Recalculée en v166 : les cinquante grandes posent Bruxelles et Amsterdam
// dans la fenêtre observée — deux disques aplanis de plus, l'IJ et les
// canaux en eau. Le changement est celui-là et rien d'autre : la même
// découpe, mesurée sur main et sur v166, rend la MÊME empreinte hors
// villes (voir ci-dessous).
// v172 : le grand recalibrage étend trente-six disques de villes — dont
// Amsterdam, dans la fenêtre — d'où la nouvelle valeur ; la preuve
// d'intégrité hors villes est refaite plus bas.
// v173 : les deux cents villes — une vingtaine tombe dans la fenêtre
// observée (Lyon, Cologne, Francfort, Zurich, Genève, Manchester…) — d'où
// la nouvelle valeur ; la preuve hors villes, refaite plus bas.
//
// **v187 : PARIS**, et c'est la troisième fois que l'exception de Max sert.
// La ville passe de huit à vingt-quatre blocs par kilomètre : son disque
// s'étend de 55 à 185 blocs de rayon, la Seine se recreuse sur toute sa
// nouvelle course, la butte Montmartre s'élargit. Paris est en plein dans la
// fenêtre observée — contrairement à New York en v186 — donc cette empreinte
// change, et c'est exactement le genre de casse que l'invariant 1 exige de
// DÉCLARER et de BORNER. La borne est vérifiée deux lignes plus bas : hors du
// disque de Paris, le paysage est identique au bloc près.
// v186 (avant Paris) : a18ae3735ba737b6198a68cb24cdebab06b9836d
// v199 — L'AGRANDISSEMENT DE LA CARTE. Décision de Max : « agrandir la carte
// entière », pour que les villes aient enfin la place de grandir. L'échelle
// passe de 0,75 à 0,375 km par bloc, les distances doublent, et la marge la
// plus étroite entre deux villes passe de HUIT blocs à SOIXANTE-QUINZE.
//
// Cette empreinte change donc, et c'est la quatrième fois de l'histoire du
// projet qu'elle en a le droit. Mais ici la casse n'est PAS confinée à une
// zone : le relief se réécrit partout où la projection décide de la
// géographie. La borner est impossible — alors on prouve AUTRE CHOSE, et
// c'est le témoin « le sol n'a pas bougé là où les enfants ont bâti », plus
// bas, qui porte la garantie désormais. Il est plus fort qu'un hash : il
// compare la carte d'AUJOURD'HUI à la carte d'AVANT, figée dans
// `MONDES.terreAvant`, et il ne peut pas être satisfait en mettant une
// valeur à jour.
//
// Ce qui reste vert de l'ancien monde, et ce n'est pas rien : les dix-huit
// colonnes de référence ont gardé leur cote AU BLOC PRÈS, et la maison
// sauvegardée avant le changement repose toujours sur le sol.
// v200 — LES VILLES ENGENDRÉES REMISES À L'ÉCHELLE. C'est la CINQUIÈME fois
// que l'exception sert, et cette fois elle se borne à nouveau, comme en v162
// et v187 : deux cent soixante-neuf villes passent leur échelle de 20 à 36
// blocs par kilomètre et leur disque avec, et DEUX d'entre elles tombent dans
// la fenêtre observée — Bruxelles et Cologne. Le relief change sous leurs
// disques, nulle part ailleurs, et c'est mesuré des deux côtés dix lignes
// plus bas.
// v199 (avant la remise à l'échelle) : 4754a91ef7fed692c2b8f6b6238f7c0cb4f082c5
// v204 — LILLE À L'ÉCHELLE GTA. SIXIÈME usage de l'exception, borné comme
// en v187 pour Paris : Lille passe de 16 à 32 blocs par kilomètre et son
// disque de 46 à 92, et elle est à (−102, −326), DANS la fenêtre observée.
// Le relief change sous son disque — citadelle en étoile, douves, Deûle —
// et nulle part ailleurs : hors du disque (92 + 40 de fondu) l'empreinte est
// IDENTIQUE des deux côtés, 184 656 colonnes, même découpe sur `origin/main`
// et sur la branche. C'est la ligne du dessous qui le prouve.
// v203 (avant Lille) : f0b43c078bb4787599b1762c7d25834cca4a88c5
// **v223 : LES DIX-NEUF AÉRODROMES.** SEPTIÈME usage de l'exception de Max, et
// il est né d'un signalement : « il faut que tu refasses l'aéroport de
// Charles-de-Gaulle parce qu'il est maintenant SUR la ville de Paris ». Mesuré :
// cent vingt et un blocs de chevauchement avec le disque de la capitale. Roissy
// déménage à 291 blocs plein nord, et dix-huit aérodromes s'ajoutent — quinze
// aéroports et quatre bases militaires — dont chacun aplanit son disque.
//
// La casse est BORNÉE et la borne est vérifiée juste en dessous : hors des
// villes ET des aérodromes (l'ancienne place de Roissy comprise), l'empreinte
// est IDENTIQUE des deux côtés — 172 379 colonnes, fa120ab1…, avec la MÊME
// découpe sur `origin/main` et sur la branche.
//
// Et le déménagement rend son sol : la colonne (−140, 80), qui valait 35 sous
// l'ancien tarmac, retrouve sa cote naturelle de 34. C'est mot pour mot ce
// qu'avait promis le déménagement de Washington en v162.
// v222 (avant les aérodromes) : c20adb7308aec773780185acfa4ecbc88d575f0d
const EMPREINTE_RELIEF = 'c50f67147c96f6ea6c4ca926b95466db6ba9d634';

// ET CELLE-CI, ELLE, N'A PAS LE DROIT DE BOUGER.
//
// La même empreinte, en retirant les colonnes que Washington touche. C'est
// elle qui prouve que la casse est CONFINÉE : hors de la zone d'influence de
// la capitale — fondu du pourtour compris — le paysage est identique au bloc
// près à ce qu'il était avant. Le point d'apparition, le musée et le quartier
// des enfants sont dehors, et c'est vérifié plus bas.
//
// Autrement dit : la première empreinte dit « on a bâti une ville », la
// seconde dit « et on n'a rien cassé ailleurs ». C'est la seconde qui protège
// les maisons de Marlon et d'Alice.
// Calculée sur v160 ET sur v162 avec la même découpe : identiques. Hors de la
// capitale, v162 rend le monde EXACTEMENT tel qu'il était avant v161.
//
// EN v163, CE TÉMOIN S'ÉTAIT VIDÉ DE SON SENS — ET IL LE DISAIT EN VERT.
//
// La découpe ne retirait QUE Washington. Le remaniement de la carte l'a
// expédiée à x ≈ −5 500, très au-delà de la fenêtre observée (±700) : la
// soustraction ne retirait donc plus une seule colonne, et cette empreinte
// était devenue, au bit près, la copie de la précédente. Elle continuait de
// passer sans plus rien protéger — le pire état pour un test, car il inspire
// une confiance qu'il ne mérite plus.
//
// On découpe donc autour de TOUTES les villes, pas de la seule capitale. Ce que
// le témoin promet redevient vrai et le restera quand la carte grandira : là où
// aucune ville ne se pose, le paysage est celui du bruit de terrain, intact.
// `PAS_VIDE` plus bas interdit désormais à ce témoin de se vider en silence.
//
// v166 : la découpe s'élargit aux villes de la machine (Bruxelles, Amsterdam
// dans la fenêtre), donc la valeur change — mais la preuve d'intégrité a été
// refaite à l'identique : cette empreinte, calculée avec la MÊME découpe sur
// origin/main (avant les cinquante grandes) et sur v166, donne le même hash
// des deux côtés. Hors des villes neuves, pas un bloc n'a bougé.
// v172 : découpe recalculée avec les NOUVEAUX rayons — et mesurée identique
// sur origin/main et sur la branche : hors des disques agrandis, pas un
// bloc n'a bougé (ec09838a…, 195 668 colonnes des deux côtés).
// v173 : découpe élargie aux deux cents villes (278 lieux au registre) — et
// mesurée identique sur origin/main (v172) et sur la branche : hors des
// disques neufs, pas un bloc n'a bougé (c5a30b6f…, 167 512 colonnes des
// deux côtés). Trois villes candidates (Gand, Luxembourg, Nuremberg) ont
// été RETIRÉES parce que leur fondu atteignait des colonnes-témoins
// ci-dessous — dont la maison sauvegardée en (-100,-100) : le contrat avec
// les vieilles sauvegardes pèse plus lourd qu'une ville de plus.
//
// v187 : la découpe s'élargit au nouveau disque de Paris (55 → 185 blocs), et
// la preuve d'intégrité a été refaite exactement comme en v162, v166, v172 et
// v173 — cette empreinte, calculée avec la MÊME découpe sur origin/main (v186)
// et sur la branche, donne le même hash des deux côtés :
// d813ba3f…, 153 382 colonnes des deux côtés. Hors du disque de Paris, pas un
// bloc n'a bougé. C'est cela qui protège les maisons de Marlon et d'Alice —
// et c'est cela, et rien d'autre, qui autorise l'empreinte du dessus à changer.
// v199 : 191 185 colonnes hors villes contre 153 382 avant — non pas parce que
// le monde a grandi, mais parce que les villes se sont ÉCARTÉES : dans la
// fenêtre de ±700 blocs, il n'en reste presque plus qu'une, Paris, dont
// l'ancre ne bouge pas.
// v200 : la découpe s'élargit aux nouveaux disques, et la preuve se refait
// comme toujours — la MÊME découpe (les disques d'APRÈS, des deux côtés)
// mesurée sur origin/main (v199) et sur la branche :
//   origin/main  188 166 colonnes  5503fd10965064886b1dc6d8dba2800b50d122be
//   la branche   188 166 colonnes  5503fd10965064886b1dc6d8dba2800b50d122be
// Hors des disques de Bruxelles et de Cologne, pas un bloc n'a bougé. On ne
// met pas un hash à jour : on mesure les deux côtés, et c'est cela, et rien
// d'autre, qui autorise l'empreinte du dessus à changer.
// v204 : la découpe s'élargit avec le disque de Lille (86 → 132 blocs de
// portée), donc le NOMBRE de colonnes change — 188 166 → 184 656 — et le hash
// avec. Ce qui compte : mesuré avec CETTE découpe sur `origin/main` (v203) ET
// sur la branche, les deux rendent c79c2f3b…, colonne pour colonne.
// v200 → v203 (découpe à 86) : 5503fd10965064886b1dc6d8dba2800b50d122be
// v223 : la découpe s'élargit aux dix-neuf aérodromes ET à l'ancienne place de
// Roissy — sans cette dernière, le témoin accuserait le déménagement d'avoir
// bougé le sol là où il l'a précisément RENDU. Le nombre de colonnes change
// donc (184 656 → 172 379) et le hash avec ; ce qui prouve la borne, c'est que
// la MÊME découpe mesurée sur `origin/main` (v222) et sur la branche rend le
// même hash, colonne pour colonne :
//   origin/main  172 379 colonnes  fa120ab12649fa81656f6293d946c2a11be91bf0
//   la branche   172 379 colonnes  fa120ab12649fa81656f6293d946c2a11be91bf0
// v204 → v222 (découpe sans les aérodromes) : c79c2f3b0135a6077aa49a46eb1f744c26cf6db5
const EMPREINTE_HORS_VILLES = 'fa120ab12649fa81656f6293d946c2a11be91bf0';

// La marge de fondu que le terrain applique autour d'une ville : au-delà, plus
// rien de la ville ne déteint sur le relief.
const MARGE_VILLE = 40;

// Quelques colonnes nommées, pour que l'échec dise quelque chose de lisible.
const COLONNES = [
  [0, 0, 33], [40, -20, 42], [-240, 200, 34], [400, 110, 35], [112, 210, 34],
  [-140, 420, 53], [60, -190, 35], [620, 80, 37], [250, 205, 34], [-140, 80, 34],
  [-420, 300, 34], [450, 420, 36], [-520, -480, 41],
  // (-140, 80) : l'ancien tarmac de Roissy l'aplanissait à 35. L'aéroport est
  // parti plein nord en v223, et la colonne a RETROUVÉ sa cote naturelle, 34 —
  // la même promesse qu'a tenue le déménagement de Washington en v162.
  [-100, -100, 26], [300, -300, 24], [-64, 16, 46],
  // (100, 100) et (16, 64) : Washington v161 était passée dessus (36 et 37) ;
  // la capitale a déménagé au sud en v162, et elles ont RETROUVÉ leurs cotes
  // de v160 — 26 et 35. C'est exactement ce que promet le déménagement : là où
  // la ville n'est plus, le sol redevient ce qu'il a toujours été.
  [100, 100, 26], [16, 64, 35],
];

// Et deux colonnes DANS la capitale, pour figer son relief à elle : le Mall, et
// l'esplanade du Pentagone.
//
// Elles étaient écrites en absolu — [106, 374] et [−31, 456] — et le
// remaniement de la carte les a laissées sur place pendant que la ville, elle,
// partait à quatre mille blocs de là. Le test annonçait « le Mall s'est
// affaissé de 33 à 8 » alors que le Mall se portait très bien : c'est le témoin
// qui regardait au mauvais endroit. On les exprime donc en ÉCART au centre de
// Washington, lu dans le registre : la capitale peut déménager encore, ses
// repères la suivent.
const REPERES_DC = [[-60, 0, 33, 'le Mall'], [-197, 82, 33, 'le Pentagone']];

// Une maison telle que l'aurait sauvegardée la version d'avant : des
// coordonnées absolues, et rien d'autre. Le sol est à 26 autour de
// (-100, -100) ; le plancher repose donc sur 27.
//
// Loin du point d'apparition, volontairement : bâtie à l'origine, elle
// enfermait l'enfant dans ses propres murs dès l'ouverture du monde, et c'est
// le test qui fabriquait la panne qu'il croyait mesurer. Elle était en
// (100, 100) jusqu'à ce que Washington s'y installe — un témoin qui prouve
// qu'une maison ne bouge pas ne peut pas être bâti sous une ville neuve.
const MAISON_X = -100, MAISON_Z = -100, SOL_MAISON = 26;
const MAISON = [];
for (let x = MAISON_X - 1; x <= MAISON_X + 1; x++) {
  for (let z = MAISON_Z - 1; z <= MAISON_Z + 1; z++) MAISON.push([x, SOL_MAISON + 1, z]);
}

(async () => {
  // --- ce qui se vérifie sans navigateur ------------------------------------
  const { World, HEIGHT, SOMMET_TERRAIN } = await import('../src/world.js');
  const w = new World();

  verifier('le ciel est monté', HEIGHT >= 160, `${HEIGHT} blocs`);
  verifier('et le sol a son propre plafond, qui ne suit pas le ciel',
    SOMMET_TERRAIN === 80, `${SOMMET_TERRAIN}`);

  const { ZONE_WASHINGTON: Z } = await import('../src/washington.js');
  const { CITIES } = await import('../src/world.js');
  const { SITES, positionSite } = await import('../src/capitales.js');
  // Les sites du tour du monde aplanissent eux aussi leur parvis : Londres
  // tombe dans la fenêtre observée, et sans elle dans la découpe le témoin
  // annoncerait « le paysage a bougé hors des villes » pour une esplanade
  // parfaitement voulue.
  const SITES_POS = SITES.map((s) => ({ ...positionSite(s.cle), portee: s.parvis + 24 }));
  // Les villes de la machine aplanissent leur disque elles aussi. Depuis les
  // cinquante grandes, deux d'entre elles tombent dans la fenêtre observée :
  // Bruxelles et Amsterdam. Sans elles dans la découpe, le témoin « hors des
  // villes » compterait leurs rues comme du paysage qui a bougé.
  const { VILLES_MONDE } = await import('../src/villesmonde.js');
  const VM_POS = VILLES_MONDE.map((f) => ({ x: f.ancre.x, z: f.ancre.z, portee: f.rayon + MARGE_VILLE }));
  // Les dix-neuf aérodromes aplanissent leur disque comme une ville aplanit le
  // sien — trois d'entre eux tombent dans la fenêtre observée (Roissy, Orly,
  // Schiphol) plus la base de Saint-Dizier. ET L'ANCIENNE PLACE DE ROISSY EST
  // DANS LA DÉCOUPE : le déménagement lui a rendu son relief naturel, ce qui
  // est un changement voulu ; l'y laisser ferait accuser la livraison d'avoir
  // cassé ce qu'elle a réparé.
  const { AEROPORTS } = await import('../src/aeroport.js');
  const AERO_POS = [
    { x: -140, z: 80, portee: 92 + 24 },   // Roissy avant v223
    ...AEROPORTS.map((a) => ({ x: a.x, z: a.z, portee: a.r + 24 })),
  ];
  // Dans une ville, ou dans le fondu qui la borde ?
  const dansUneVille = (x, z) => {
    if (x >= Z.x0 - MARGE_VILLE && x <= Z.x1 + MARGE_VILLE
      && z >= Z.z0 - MARGE_VILLE && z <= Z.z1 + MARGE_VILLE) return true;
    if (CITIES.some((c) => Math.hypot(x - c.x, z - c.z) <= c.r + MARGE_VILLE)) return true;
    if (VM_POS.some((p) => Math.hypot(x - p.x, z - p.z) <= p.portee)) return true;
    if (AERO_POS.some((p) => Math.hypot(x - p.x, z - p.z) <= p.portee)) return true;
    return SITES_POS.some((p) => Math.hypot(x - p.x, z - p.z) <= p.portee);
  };
  const vals = [], hors = [];
  for (let x = -700; x <= 700; x += 3) {
    for (let z = -700; z <= 700; z += 3) {
      const h = w.terrainHeight(x, z);
      vals.push(h);
      if (!dansUneVille(x, z)) hors.push(h);
    }
  }
  const empreinte = createHash('sha1').update(vals.join(',')).digest('hex');
  verifier('le paysage est resté exactement le même',
    empreinte === EMPREINTE_RELIEF, `${vals.length} colonnes · ${empreinte.slice(0, 12)}`);

  // LE TÉMOIN QUI SURVEILLE LE TÉMOIN.
  //
  // Sans lui, une ville qui s'éloigne de la fenêtre vide la soustraction sans
  // que personne ne le voie : l'empreinte « hors des villes » redevient la
  // copie de l'empreinte totale et passe au vert en ne prouvant plus rien.
  // C'est exactement ce qui est arrivé en v163. On exige donc qu'il reste
  // quelque chose à soustraire, et que le résultat DIFFÈRE du tout.
  verifier('la découpe retire vraiment quelque chose — le témoin n\'est pas vide',
    hors.length > 0 && hors.length < vals.length
      && createHash('sha1').update(hors.join(',')).digest('hex') !== empreinte,
    `${vals.length - hors.length} colonnes retirées sur ${vals.length}`);

  const empreinteHors = createHash('sha1').update(hors.join(',')).digest('hex');
  verifier('et hors des villes, le paysage n\'a pas bougé d\'un bloc',
    empreinteHors === EMPREINTE_HORS_VILLES,
    `${hors.length} colonnes · ${empreinteHors.slice(0, 12)}`);

  // Ce que la zone d'influence NE DOIT PAS toucher : les endroits où les
  // enfants ont bâti. Si l'un d'eux tombe dedans un jour, ce témoin le dira
  // avant que le sol ne se dérobe sous une maison.
  const SANCTUAIRES = [
    ['le point d\'apparition', 0, 0, 4],
    ['le quartier des enfants', 26, -14, 16],
    ['le musée', -34, 40, 10],
  ];
  const atteints = SANCTUAIRES.filter(([, x, z, r]) =>
    x + r >= Z.x0 && x - r <= Z.x1 && z + r >= Z.z0 && z - r <= Z.z1);
  verifier('et la capitale ne touche à rien de ce que les enfants ont bâti',
    atteints.length === 0, atteints.map((a) => a[0]).join(', '));

  // MÊME EXIGENCE POUR PARIS, qui a triplé d'emprise en v187.
  //
  // Une ville qui grandit de 55 à 185 blocs de rayon déplace le sol sous elle,
  // c'est le prix déclaré. Ce qui n'est PAS déclaré, c'est qu'elle aille
  // déplacer le sol ailleurs — et « ailleurs », ici, ce sont les trois endroits
  // où les enfants ont vraiment bâti. Le fondu du pourtour compte : le relief
  // se lisse sur seize blocs au-delà du disque, on prend donc la marge de
  // ville, qui est plus large.
  const PARIS_CITE = CITIES.find((c) => c.key === 'paris');
  const prochesDeParis = SANCTUAIRES.filter(([, x, z, r]) =>
    Math.hypot(x - PARIS_CITE.x, z - PARIS_CITE.z) < PARIS_CITE.r + MARGE_VILLE + r);
  verifier('et Paris non plus, malgré son emprise triplée',
    prochesDeParis.length === 0,
    prochesDeParis.length ? prochesDeParis.map((a) => a[0]).join(', ')
      : `le plus proche est à ${Math.round(Math.min(...SANCTUAIRES.map(([, x, z, r]) =>
        Math.hypot(x - PARIS_CITE.x, z - PARIS_CITE.z) - PARIS_CITE.r - r)))} blocs du bord`);

  // ET MÊME EXIGENCE POUR LILLE, qui a doublé d'emprise en v204 (46 → 92).
  //
  // Lille est à (−102, −326) : DANS la fenêtre d'empreinte, comme Paris — la
  // double empreinte du haut porte donc la borne au bit près. Ce témoin-ci dit
  // autre chose : que le disque agrandi, fondu compris, n'atteint aucun des
  // trois endroits où les enfants ont bâti. Le plus proche est le quartier
  // des enfants, à (26, −14) : deux cent vingt-neuf blocs du bord.
  const LILLE_CITE = CITIES.find((c) => c.key === 'lille');
  const prochesDeLille = SANCTUAIRES.filter(([, x, z, r]) =>
    Math.hypot(x - LILLE_CITE.x, z - LILLE_CITE.z) < LILLE_CITE.r + MARGE_VILLE + r);
  verifier('et Lille non plus, malgré son emprise doublée',
    prochesDeLille.length === 0,
    prochesDeLille.length ? prochesDeLille.map((a) => a[0]).join(', ')
      : `le plus proche est à ${Math.round(Math.min(...SANCTUAIRES.map(([, x, z, r]) =>
        Math.hypot(x - LILLE_CITE.x, z - LILLE_CITE.z) - LILLE_CITE.r - r)))} blocs du bord`);

  // ET MÊME EXIGENCE POUR LES DIX-NEUF AÉRODROMES (v223).
  //
  // Un aérodrome est le terrain le plus aplani de la carte — c'est ce qu'exige
  // une piste — donc le plus dangereux à poser près de ce que les enfants ont
  // bâti. Et la maison sauvegardée en (−100, −100), celle dont le témoin plus
  // bas vérifie qu'elle repose toujours sur son sol, en fait partie : le premier
  // brouillon de cette livraison plaçait Roissy à (−102, −100), c'est-à-dire
  // DEUX BLOCS de son plancher. C'est la sonde de placement qui l'a dit, pas la
  // relecture — un aérodrome se place en MESURANT ce qu'il recouvre.
  //
  // Le nord-est de Paris, cap réel de Roissy, tombe pile sur le quartier des
  // enfants : l'aéroport part donc plein nord. Le sol des enfants passe avant
  // la fidélité du plan.
  const { AEROPORTS: AERO } = await import('../src/aeroport.js');
  const SANCTUAIRES_PLUS = [...SANCTUAIRES, ['la maison sauvegardée', MAISON_X, MAISON_Z, 3]];
  const touches = [];
  let pireAero = Infinity, pireNom = '';
  for (const a of AERO) {
    for (const [nom, x, z, r] of SANCTUAIRES_PLUS) {
      const marge = Math.hypot(x - a.x, z - a.z) - a.r - r;
      if (marge < 0) touches.push(`${a.nom} sur ${nom}`);
      if (marge < pireAero) { pireAero = marge; pireNom = `${nom} / ${a.nom}`; }
    }
  }
  verifier('et aucun aérodrome ne se pose sur ce que les enfants ont bâti',
    touches.length === 0,
    touches.length ? touches.join(', ')
      : `le plus proche est à ${Math.round(pireAero)} blocs du bord — ${pireNom}`);

  // ET AUCUN AÉRODROME NE SE POSE SUR UNE VILLE. C'est le signalement de Max,
  // mot pour mot : « il est maintenant sur la ville de Paris et pas à côté ».
  // Mesuré avant : cent vingt et un blocs de chevauchement du disque de Paris.
  const surUneVille = [];
  let pireVille = Infinity, pireQui = '';
  for (const a of AERO) {
    for (const c of [...CITIES, ...VILLES_MONDE.map((f) => ({ name: f.ancre.nom, x: f.ancre.x, z: f.ancre.z, r: f.rayon }))]) {
      const marge = Math.hypot(a.x - c.x, a.z - c.z) - a.r - c.r;
      if (marge < 0) surUneVille.push(`${a.nom} sur ${c.name}`);
      if (marge < pireVille) { pireVille = marge; pireQui = `${a.nom} / ${c.name}`; }
    }
  }
  verifier('ni sur une ville — un aéroport est À CÔTÉ de sa ville',
    surUneVille.length === 0,
    surUneVille.length ? surUneVille.join(', ')
      : `la paire la plus serrée garde ${Math.round(pireVille)} blocs — ${pireQui}`);

  // ET MÊME EXIGENCE POUR LES DEUX CENT SOIXANTE-NEUF VILLES ENGENDRÉES,
  // qui ont pris 1,8 fois leur emprise en v200.
  //
  // C'est la forme que prend une casse autorisée quand on SAIT la borner : on
  // ne demande pas « le hash est-il le bon », on demande « le disque qui a
  // grandi atteint-il un endroit où un enfant a bâti ». Un jour où une ville
  // grandira encore, ce témoin rougira AVANT que le sol ne se dérobe — et il
  // ne peut pas être satisfait en mettant une valeur à jour.
  const villeTropPres = VILLES_MONDE.map((f) => {
    const pire = Math.min(...SANCTUAIRES.map(([, x, z, r]) =>
      Math.hypot(f.ancre.x - x, f.ancre.z - z) - f.rayon - MARGE_VILLE - r));
    return { cle: f.cle, marge: Math.round(pire) };
  }).sort((p1, p2) => p1.marge - p2.marge);
  verifier('et aucune ville engendrée ne s\'approche de ce que les enfants ont bâti',
    villeTropPres[0].marge > 0,
    `la plus proche est ${villeTropPres[0].cle}, à ${villeTropPres[0].marge} blocs du bord`);

  const { WASHINGTON } = await import('../src/washington.js');
  const toutes = [
    ...COLONNES,
    ...REPERES_DC.map(([dx, dz, h]) => [WASHINGTON.x + dx, WASHINGTON.z + dz, h]),
  ];
  const decalees = toutes.filter(([x, z, h]) => w.terrainHeight(x, z) !== h);
  verifier('aucune colonne de référence n\'a bougé', decalees.length === 0,
    JSON.stringify(decalees.map(([x, z, h]) => ({ x, z, attendu: h, trouve: w.terrainHeight(x, z) }))));

  // LE SOL N'A PAS BOUGÉ LÀ OÙ LES ENFANTS ONT BÂTI.
  //
  // C'est ce témoin, désormais, qui porte l'invariant numéro un — pas
  // l'empreinte du dessus. L'agrandissement de la carte (v199) réécrit le
  // relief partout où la projection décide de la géographie : une empreinte
  // globale ne peut plus rien promettre, et la borner est impossible.
  //
  // Alors on prouve ce qui compte vraiment, et on le prouve d'une manière
  // qu'aucune mise à jour de valeur ne peut satisfaire : on demande au jeu la
  // hauteur du sol sur la carte d'AUJOURD'HUI et sur la carte d'AVANT — figée
  // pour toujours dans `MONDES.terreAvant` — et l'on exige qu'elles soient
  // IDENTIQUES autour du point d'apparition et autour de Paris. Ce sont les
  // deux endroits où Marlon et Alice ont construit, et l'ancre de la
  // projection est plantée sur Paris exprès pour cela.
  //
  // Mesuré à la livraison : 4 040 colonnes, cent pour cent identiques.
  const chezLesEnfants = await (async () => {
    const W = await import('../src/world.js');
    const M = await import('../src/mondes.js');
    if (!W.hauteurBase) return { absent: true };
    const P = M.positionDe('paris');
    const zones = [['apparition', 0, 0, 90], ['Paris', P.x, P.z, 200]];
    const bouge = [];
    let n = 0;
    for (const [nom, cx, cz, r] of zones) {
      for (let dx = -r; dx <= r; dx += 7) {
        for (let dz = -r; dz <= r; dz += 7) {
          const x = Math.round(cx + dx), z = Math.round(cz + dz);
          n++;
          const av = W.hauteurBase(x, z, 'terreAvant');
          const ap = W.hauteurBase(x, z, 'terre');
          if (av !== ap) bouge.push({ ou: nom, x, z, avant: av, apres: ap });
        }
      }
    }
    return { n, bouge: bouge.slice(0, 5), total: bouge.length };
  })();
  verifier('et le sol n\'a pas bougé d\'un bloc là où les enfants ont bâti',
    !chezLesEnfants.absent && chezLesEnfants.total === 0 && chezLesEnfants.n > 3000,
    chezLesEnfants.absent ? 'la carte d\'avant n\'est pas gardée'
      : `${chezLesEnfants.n} colonnes · ${chezLesEnfants.total} déplacée(s)`
        + (chezLesEnfants.total ? ` · ${JSON.stringify(chezLesEnfants.bouge)}` : ''));

  const trop = [];
  for (let x = -700; x <= 700; x += 7) {
    for (let z = -700; z <= 700; z += 7) {
      const h = w.terrainHeight(x, z);
      if (h > SOMMET_TERRAIN) trop.push([x, z, h]);
    }
  }
  verifier('et aucune montagne n\'a poussé dans le ciel neuf', trop.length === 0,
    JSON.stringify(trop.slice(0, 3)));

  // --- ce qui se vérifie en jouant ------------------------------------------
  const banc = new Banc({ portJeu: 8327, portPairs: 9327 });
  await banc.ouvrir();
  try {
    const tab = await banc.joueur('Marlon');
    const contexte = await tab.evaluate(() => window.__game.world.ctx);

    // La maison d'avant, écrite comme l'ancienne version l'aurait laissée.
    //
    // On la sème AVANT le chargement de la page, et pas après : en quittant,
    // le jeu range le monde qu'il a en mémoire, et il écrasait la graine juste
    // posée. Semer à l'ouverture, c'est reproduire ce que vit l'enfant — une
    // sauvegarde déjà sur la tablette quand le jeu démarre.
    await tab.addInitScript(({ maison, ctx }) => {
      const tout = JSON.parse(localStorage.getItem('web-minecraft-edits-v3') || '{}');
      tout[ctx] = tout[ctx] || {};
      for (const [x, y, z] of maison) tout[ctx][`${x},${y},${z}`] = [4, 1];
      localStorage.setItem('web-minecraft-edits-v3', JSON.stringify(tout));
    }, { maison: MAISON, ctx: contexte });
    await tab.reload({ waitUntil: 'load' });
    await tab.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await tab.evaluate(() => {
      window.__game.edu.today().libreJusqua = 86400;
      document.getElementById('play-btn').click();
    });
    await tab.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    await dormir(3000);

    const maison = await tab.evaluate(({ maison, sol, ctx }) => {
      const g = window.__game;
      if (g.world.ctx !== ctx) return { contexte: g.world.ctx };
      const posees = maison.filter(([x, y, z]) => g.world.getBlock(x, y, z) === 4).length;
      const surLeSol = maison.filter(([x, y, z]) => g.world.isSolid(x, sol, z)).length;
      const enLair = maison.filter(([x, , z]) => !g.world.isSolid(x, sol, z)).length;
      return { posees, surLeSol, enLair, total: maison.length };
    }, { maison: MAISON, sol: SOL_MAISON, ctx: contexte });

    verifier('une maison sauvegardée avant le changement est toujours là',
      maison.posees === maison.total, JSON.stringify(maison));
    verifier('et elle repose toujours sur le sol, ni enterrée ni en l\'air',
      maison.enLair === 0 && maison.surLeSol === maison.total, JSON.stringify(maison));

    // Monter là où l'on ne pouvait pas aller.
    //
    // On rend d'abord le clavier au jeu : le bouton « Jouer » garde le focus
    // après un clic, et c'est LUI qui recevait la barre d'espace. Un enfant
    // touche l'écran avant de voler ; le banc doit faire pareil, sinon il
    // mesure le focus du navigateur et pas le vol.
    await tab.evaluate(() => {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.__game.player.flying = true;
    });
    await tab.keyboard.down('Space');
    // On REGARDE PENDANT que la touche est tenue, pas une fois à la fin.
    //
    // Le décollage était lu après sept cents millisecondes de montre. Or ce
    // qui fait monter le joueur, ce sont des tours d'affichage — et sur un
    // conteneur chargé, sept cents millisecondes de montre peuvent n'en
    // contenir presque aucun. Le témoin annonçait alors « vy 0 », c'est-à-dire
    // que la touche ne faisait rien, alors qu'elle n'avait pas encore eu
    // l'occasion d'agir. On lui laisse le temps de faire ses preuves, borné.
    const decolle = await (async () => {
      const fin = Date.now() + 6000;
      let e = null;
      do {
        e = await tab.evaluate(() => ({
          vy: window.__game.player.vel.y, y: window.__game.player.pos.y,
        }));
        if (e.vy > 0) return e;
        await dormir(150);
      } while (Date.now() < fin);
      return e;
    })();
    verifier('la touche « monter » fait bien décoller', decolle.vy > 0, JSON.stringify(decolle));
    // DOUZE SECONDES DE JEU, pas douze secondes d'horloge. La montée dépend
    // du temps SIMULÉ, et `main.js` borne dt au vingtième de seconde : sous
    // la charge du portail complet, une douzaine de secondes murales n'en
    // contient que la moitié en temps de jeu, et l'enfant monte deux fois
    // moins haut. Le témoin accusait alors le vol d'un défaut qui était
    // celui de la machine — 79 blocs mesurés au lieu de 130. C'est la même
    // leçon que le lien muet, le zoom et la vitesse au volant : quand on
    // mesure une durée, on la compte dans l'horloge du jeu.
    await tab.evaluate(() => new Promise((fin) => {
      let cumul = 0, prec = performance.now();
      const pas = (t) => {
        cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05);
        prec = t;
        if (cumul >= 12) fin(); else requestAnimationFrame(pas);
      };
      requestAnimationFrame(pas);
    }));
    await tab.keyboard.up('Space');
    const haut = await tab.evaluate(() => ({
      y: window.__game.player.pos.y,
      jeu: window.__game.running,
    }));
    verifier('on monte bien au-dessus de l\'ancien plafond',
      haut.y > 110, `${haut.y.toFixed(0)} blocs`);
    // Le vol n'avait aucun toit : en gardant le doigt appuyé, on sortait du
    // monde par le haut, là où poser un bloc ne fait rien, et le jeu finissait
    // par nous reposer au sol sans explication.
    verifier('mais on ne sort plus du monde par le haut',
      haut.jeu && haut.y < HEIGHT - 1, `${haut.y.toFixed(0)} pour un monde de ${HEIGHT}`);

    // LE VOL QUI ACCÉLÈRE (v175). Max : « en fonction du temps de vol, la
    // vitesse s'accélère de manière progressive jusqu'à une vitesse assez
    // rapide pour vite progresser sur la carte. » On mesure ce que l'enfant
    // OBTIENT — des blocs parcourus par seconde de JEU — à trois moments d'un
    // même vol : au décollage, après quinze secondes, à la croisière. Trois
    // choses doivent être vraies : ça part calme (précis pour sauter de toit
    // en toit), ça grandit franchement, et ça plafonne (la croisière est un
    // sommet, pas une fuite).
    const allures = await tab.evaluate(async () => {
      const g = window.__game;
      g.player.flying = true;
      // À 140 : au-dessus de tout ce qui se dresse, et surtout PLUS HAUT que
      // la barre du témoin suivant — le perchoir se pose à hauteur du joueur,
      // et ce vol-ci ne doit pas le faire redescendre sous l'ancien plafond.
      g.player.pos.set(0, 140, 0);
      g.player.yaw = Math.PI / 2;
      g.player.vel.set(0, 0, 0);
      g.player.keys.add('KeyW');
      // la même horloge que le jeu : min(dt, 0.05) cumulé sur les images
      let sim = 0, prec = performance.now();
      const tic = (now) => { sim += Math.min(Math.max((now - prec) / 1000, 0), 0.05); prec = now; requestAnimationFrame(tic); };
      requestAnimationFrame(tic);
      const fenetre = (depuis, duree) => new Promise((res) => {
        const attendre = () => {
          if (sim < depuis) return requestAnimationFrame(attendre);
          const x0 = g.player.pos.x, z0 = g.player.pos.z, s0 = sim;
          const finir = () => {
            if (sim - s0 < duree) return requestAnimationFrame(finir);
            res(Math.hypot(g.player.pos.x - x0, g.player.pos.z - z0) / (sim - s0));
          };
          requestAnimationFrame(finir);
        };
        attendre();
      });
      g.player.volDepuis = 0;
      const depart = await fenetre(0.3, 1.4);        // avant l'élan : ~11 blocs/s
      const milieu = await fenetre(6, 2);            // en pleine montée : ~45 blocs/s
      g.player.volDepuis = 60;                       // très au-delà de la croisière
      const sommet = await fenetre(sim + 0.3, 2);    // le plafond : ~88 blocs/s
      g.player.keys.delete('KeyW');
      g.player.vel.set(0, 0, 0);
      return { depart, milieu, sommet };
    });
    verifier('le vol part calme, accélère franchement, et plafonne en croisière',
      allures.depart < 16 && allures.milieu > allures.depart * 2.5
      && allures.sommet > allures.milieu * 1.3 && allures.sommet < 95,
      `${allures.depart.toFixed(0)} puis ${allures.milieu.toFixed(0)} puis ${allures.sommet.toFixed(0)} blocs par seconde de jeu`);

    // ET LA MARCHE N'EN HÉRITE PAS (Max, v182 : « on est à pied et pas en
    // vol, la vitesse ne doit pas accélérer »). Le vol ne se coupe pas quand
    // on atterrit, et l'ancienne rampe lisait donc ses secondes de vol
    // pendant qu'on MARCHAIT. Debout sur un ponton posé exprès, mode vol
    // encore actif, élan réglé au sommet : trois secondes de jeu de marche
    // doivent rester à l'allure de la marche, pas à quatre-vingt-huit blocs
    // par seconde. Rouge garanti sur l'ancien code.
    const marche = await tab.evaluate(async () => {
      const g = window.__game;
      const x0 = Math.floor(g.player.pos.x), z0 = Math.floor(g.player.pos.z);
      const y = 120;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -60; dz <= 2; dz++) g.world.setBlock(x0 + dx, y, z0 + dz, 3);
      }
      g.player.flying = true;
      g.player.volDepuis = 60;                        // l'élan d'un long vol
      g.player.pos.set(x0, y + 1, z0);
      g.player.yaw = 0;                               // vers -z, le long du ponton
      g.player.vel.set(0, 0, 0);
      g.player.keys.add('KeyW');
      let sim = 0, prec = performance.now();
      const tic = (now) => {
        sim += Math.min(Math.max((now - prec) / 1000, 0), 0.05); prec = now;
        if (sim < 3) requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
      await new Promise((res) => {
        const fin = () => { if (sim >= 3) return res(); requestAnimationFrame(fin); };
        requestAnimationFrame(fin);
      });
      g.player.keys.delete('KeyW');
      const d = Math.hypot(g.player.pos.x - x0, g.player.pos.z - z0) / sim;
      g.player.flying = false;
      g.player.vel.set(0, 0, 0);
      return d;
    });
    verifier('posé au sol, même en mode vol, on marche à l\'allure de la marche',
      marche < 9, `${marche.toFixed(1)} blocs par seconde de jeu (marche 4,3 · sprint 6,8)`);

    // Y bâtir, et retrouver ce qu'on y a bâti.
    const perchoir = await tab.evaluate(() => {
      const g = window.__game;
      const x = Math.floor(g.player.pos.x), z = Math.floor(g.player.pos.z);
      const y = Math.floor(g.player.pos.y) - 2;
      g.world.setBlock(x, y, z, 4);
      g.world.saveEdits();
      return { x, y, z };
    });
    verifier('on peut poser un bloc bien plus haut que l\'ancien monde',
      perchoir.y > 100, `y = ${perchoir.y}`);
    await dormir(1200);
    const maille = await tab.evaluate(() => window.__game.world.dirty.size);
    verifier('et le jeu le dessine sans rien laisser en attente', maille === 0,
      `${maille} morceau(x) en attente`);

    await tab.reload({ waitUntil: 'load' });
    await tab.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await tab.evaluate(() => {
      window.__game.edu.today().libreJusqua = 86400;
      document.getElementById('play-btn').click();
    });
    await tab.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    await dormir(2500);
    const retrouve = await tab.evaluate((p) => window.__game.world.getBlock(p.x, p.y, p.z), perchoir);
    verifier('ce qu\'on bâtit dans le ciel neuf est encore là au retour',
      retrouve === 4, `bloc ${retrouve} en ${perchoir.y}`);

    // La carte se dessine toujours, et n'est pas devenue noire.
    const carte = await tab.evaluate(() => {
      const c = document.getElementById('minimap-canvas') || document.querySelector('#minimap canvas');
      if (!c) return { trouvee: false };
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let somme = 0;
      for (let i = 0; i < d.length; i += 4) somme += d[i] + d[i + 1] + d[i + 2];
      return { trouvee: true, clarte: somme / (d.length / 4) / 3 };
    });
    if (carte.trouvee) {
      verifier('la carte reste éclairée comme avant', carte.clarte > 40,
        `clarté moyenne ${carte.clarte.toFixed(0)}/255`);
    }

    verifier('aucune erreur JavaScript de bout en bout', tab.erreurs.length === 0,
      JSON.stringify(tab.erreurs));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ le ciel a doublé, le sol n\'a pas bougé d\'un bloc');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
