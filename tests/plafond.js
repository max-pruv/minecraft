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
// ON NE RECHARGE PAS UNE PAGE QUI CHARGE ENCORE SES CORPS (v252). Les neuf
// corps réalistes s'analysent après la première image ; un rechargement au
// milieu coupe les textures en cours de décodage et le chargeur écrit
// « Couldn't load texture blob: » dans la console — que « aucune erreur
// JavaScript » comptait comme une faute du jeu. Vert seul, rouge deux
// portails de suite (v251, v252) : seul, les corps sont là avant que le
// témoin ne recharge ; sous la charge de trois suites, ils ne le sont pas.
async function corpsCharges(tab) {
  const fin = Date.now() + 45000;
  while (Date.now() < fin) {
    const ok = await tab.evaluate(async () => { const H = await import('./src/humains.js'); return H.humainsCharges(); }).catch(() => false);
    if (ok) return true;
    await dormir(500);
  }
  return false;
}
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
// est IDENTIQUE des deux côtés — 170 278 colonnes, b2566e0e…, avec la MÊME
// découpe sur `origin/main` et sur la branche.
//
// Et le déménagement rend son sol : la colonne (−140, 80), qui valait 35 sous
// l'ancien tarmac, retrouve sa cote naturelle de 34. C'est mot pour mot ce
// qu'avait promis le déménagement de Washington en v162.
// v222 (avant les aérodromes) : c20adb7308aec773780185acfa4ecbc88d575f0d
// **v242 : LE MONDE ×2, POUR NEW YORK.** HUITIÈME usage de l'exception, et le
// second qui ne se BORNE pas : comme en v199, l'échelle passe de 0,375 à
// 0,1875 km par bloc et le relief se réécrit partout où la projection décide
// de la géographie. Décision de Max : Manhattan, refaite en v240, est un
// rectangle de 480 × 2 300 blocs qui touchait presque Boston (41 blocs) et
// Montréal (52), et JFK tombait dedans. Ce qui garde l'invariant est donc, à
// nouveau, le témoin « le sol n'a pas bougé là où les enfants ont bâti » — et
// cette fois un second, « les blocs suivent leur ville », parce que la
// migration de v242 déplace ce qu'un enfant a bâti dans une ville AVEC la
// ville, ce que celle de v199 ne faisait pas.
//
// Les dix-huit colonnes de référence et le Mall gardent leur cote au bloc
// près, et la maison sauvegardée avant le changement repose toujours sur le sol.
// v240 (avant le monde ×2) : 47fbedd47c47973c9eab0e6b479218f4ac3bd269
//
// **v306 : PARIS DOUBLÉ ET DÉPLACÉ.** Décision de Max : le disque de Paris
// passe de 185 à 370 blocs et son centre part de cent soixante-dix blocs vers
// le sud-ouest ; Roissy, Orly, Saint-Dizier, le village gaulois et le volcan
// lui cèdent la place. Le relief change sous l'ancien et le nouveau disque et
// sous ces cinq sites — et SEULEMENT là : c'est l'empreinte du dessous qui le
// prouve, mesurée avec la MÊME découpe sur `origin/main` et sur la branche.
// v305 : aea20fdad3a5c1672e23177dfe28a6bee9f5ae3c
const EMPREINTE_RELIEF = '85c89a216e6ecea71187f3f630477f7f68830ee8';

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
// donc (184 656 → 170 278) et le hash avec ; ce qui prouve la borne, c'est que
// la MÊME découpe mesurée sur `origin/main` (v222) et sur la branche rend le
// même hash, colonne pour colonne :
//   origin/main  170 278 colonnes  b2566e0ec8e4df10aa1b218d01a52791267d911b
//   la branche   170 278 colonnes  b2566e0ec8e4df10aa1b218d01a52791267d911b
// v204 → v222 (découpe sans les aérodromes) : c79c2f3b0135a6077aa49a46eb1f744c26cf6db5
// v242 : le monde ×2 n'est PAS une casse bornée — les villes s'écartent de
// Paris et le relief se réécrit dans toute la fenêtre. La découpe change
// (Lille, Bruxelles, Londres et leurs aérodromes en sortent : 170 278 →
// 190 816 colonnes) et le hash avec. Ce qui porte la preuve, comme en v199,
// c'est le témoin des 4 040 colonnes : sous le point d'apparition et sous
// Paris, la carte d'AVANT et celle d'APRÈS rendent le même sol, colonne pour
// colonne — mesuré à la livraison, zéro déplacée.
// v223 → v240 : b2566e0ec8e4df10aa1b218d01a52791267d911b
//
// v306 : PARIS DOUBLÉ SE BORNE, et c'est la forme canonique (v187, v200,
// v204) : la découpe retire l'ancien ET le nouveau disque de Paris, et les
// sites d'avant ET d'après des trois aérodromes, du village gaulois et du
// volcan. Mesurée avec cette même découpe sur `origin/main` (v302), sur la
// v305 et sur la branche : 154 158 colonnes, 2aeceaa1… des trois côtés.
// v242 → v305 : 23e5ce82956ab83322ef7b56dd1f9a5b68cc92b7
const EMPREINTE_HORS_VILLES = '2aeceaa10b2009e081d6bdb0a03586ae4022e1fb';

// LE MONDE D'AVANT PARIS DOUBLÉ (v306), MESURÉ SUR LA PRODUCTION. La migration
// juge les blocs d'avant contre ce monde-là (`new World({ avant: true })`) :
// s'il s'écartait de celui où les enfants ont bâti, le ménage du ciel
// retirerait une maison « en l'air » au-dessus d'une Seine qui n'y était pas.
// Ces deux empreintes ont été relevées sur `origin/main` (v302), avec un
// `World()` ordinaire : le relief de l'ancien Paris et de ses alentours
// (40 401 colonnes) et les blocs de seize morceaux autour de l'ancienne
// Notre-Dame (253 952 blocs). Elles ne se mettent JAMAIS à jour.
const EMPREINTE_AVANT_RELIEF = '81fbba5dcf224332176417875ace7d1723a3b561';
// Le relief de la production v308 autour de Salvador, Jakarta, Bari, Busan et
// Oslo (disque + 80 blocs, un point sur trois), relevé sur `origin/main` :
// c'est ce que `new World({ v308: true })` doit rendre au bloc près (v309).
const EMPREINTE_V308_RELIEF = 'e92db9d7ae703856de1cfb7e00dc4abce156c490';
const EMPREINTE_AVANT_BLOCS = 'b402b639d759d0586f32149aac4d3165edf0d10d';

// La marge de fondu que le terrain applique autour d'une ville : au-delà, plus
// rien de la ville ne déteint sur le relief.
const MARGE_VILLE = 40;

// Quelques colonnes nommées, pour que l'échec dise quelque chose de lisible.
const COLONNES = [
  [0, 0, 33], [40, -20, 42], [-240, 200, 34], [400, 110, 35], [112, 210, 34],
  // (-140, 420) : l'ancien cône du volcan, 53. Paris doublé l'a recouvert
  // (v306) : il est dans la ville, à sa base plate de 34 ; le volcan est parti
  // plein sud, en (−140, 788), où son sommet est à 53.
  [-140, 420, 34], [-140, 788, 53], [60, -190, 35], [620, 80, 37], [250, 205, 34], [-140, 80, 34],
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

  // --- LES MONUMENTS À LA HAUTEUR DE LEUR VILLE ----------------------------
  //
  // Un étage fait trois blocs depuis la v301, et les monuments n'avaient pas
  // suivi : l'Opéra à dix-neuf blocs au milieu d'immeubles à vingt. Le témoin
  // boucle sur TOUTES les villes — bâties à la main et engendrées — et appelle
  // les bâtisseurs comme le générateur les appelle : la hauteur du monument
  // (sa plus haute couche au-dessus du sol du repère) contre la MÉDIANE des
  // immeubles autour de lui (les colonnes à moins de trente blocs de sa boîte,
  // hors de toute autre boîte de repère, dont le sommet est à six blocs au moins
  // au-dessus du relief et n'est pas un feuillage). Aucun monument plus bas,
  // sauf ceux que `BAS_DECLARES` nomme, chacun avec sa raison.
  {
    const W = await import('../src/world.js');
    const { BLOCK } = await import('../src/blocks.js');
    const { VILLES_MONDE } = await import('../src/villesmonde.js');
    const EM = await import('../src/echelle-monuments.js').catch(() => null);
    const declares = EM ? EM.BAS_DECLARES : {};
    const villes = [...W.CITIES.map((c) => ({ nom: c.name, x: c.x, z: c.z, r: c.r })),
      ...VILLES_MONDE.map((f) => ({ nom: f.ancre.nom, x: f.ancre.x, z: f.ancre.z, r: f.rayon }))];
    const villeDe = (x, z) => villes.find((v) => Math.hypot(x - v.x, z - v.z) < v.r);
    const reperes = W.CONF_NEUF.reperes.filter((l) => !/mobilier/.test(l.name));
    const wm = new World();
    const feuillage = new Set([BLOCK.LEAVES, BLOCK.LOG]);
    const fautes = [], mesures = [], paris = [];
    let declaresVus = 0;
    for (const lm of reperes) {
      const v = villeDe(lm.x, lm.z);
      if (!v) continue;
      let h = -1;
      lm.build((dx, dy, dz, id) => { if (id !== BLOCK.AIR && dy > h) h = dy; });
      const R2 = lm.box + 30, hs = [];
      for (let x = lm.x - R2; x <= lm.x + R2; x++) for (let z = lm.z - R2; z <= lm.z + R2; z++) {
        if (Math.abs(x - lm.x) <= lm.box + 2 && Math.abs(z - lm.z) <= lm.box + 2) continue;
        if (Math.hypot(x - lm.x, z - lm.z) > R2) continue;
        if (reperes.some((o) => o !== lm && Math.abs(x - o.x) <= o.box && Math.abs(z - o.z) <= o.box)) continue;
        const t = wm.terrainHeight(x, z);
        let top = -1;
        for (let y = HEIGHT - 1; y > t; y--) {
          const id = wm.getBlock(x, y, z);
          if (id !== BLOCK.AIR && id !== BLOCK.WATER) { top = y; break; }
        }
        if (top < 0 || feuillage.has(wm.getBlock(x, top, z))) continue;
        if (top - t >= 6) hs.push(top - t);
      }
      if (wm.chunks.size > 4000) wm.chunks.clear();
      hs.sort((a, b) => a - b);
      const med = hs.length >= 40 ? hs[hs.length >> 1] : null;
      const cle = `${v.nom}|${lm.name}`;
      if (v.nom === 'Paris') {
        paris.push({ nom: lm.name, h, med, sol: wm.terrainHeight(lm.x, lm.z), echelle: EM ? EM.echelleDe('Paris', lm.name) : null });
      }
      if (med == null) continue;
      mesures.push(cle);
      if (h >= med) continue;
      if (declares[cle]) { declaresVus++; continue; }
      fautes.push(`${cle} ${h}/${med}`);
    }
    verifier('aucun monument plus bas que les immeubles qui l\'entourent, sauf exception déclarée',
      mesures.length > 150 && fautes.length === 0,
      `${mesures.length} monuments mesurés dans leurs villes, ${declaresVus} déclarés plus bas`
      + (fautes.length ? ` — EN FAUTE (hauteur/médiane) : ${fautes.join(' · ')}` : ''));

    // Une exception déclarée qui ne sert plus est un monument remis à l'échelle
    // qu'on a oublié de rayer : elle cacherait le jour où il redescend.
    const introuvables = Object.keys(declares).filter((k) => !mesures.includes(k));
    verifier('chaque exception déclarée nomme un monument mesuré',
      introuvables.length === 0,
      introuvables.length ? `introuvables : ${introuvables.join(' · ')}` : `${Object.keys(declares).length} exceptions`);

    // PARIS À L'ÉCHELLE DU CIEL : un bloc pour un mètre jusqu'à la corniche,
    // puis la courbe qui mène la tour Eiffel (330 m) à soixante-neuf. Les
    // hauteurs attendues sont écrites ici, pas lues dans le module : sur
    // l'ancien code il n'existe pas, et le témoin doit rendre un vrai chiffre.
    // Opéra 73 m, Panthéon et Sacré-Cœur 83, Notre-Dame 96, Invalides 107,
    // Arc 50, Bastille 52, Montparnasse 210.
    const ATTENDU = { 'Opéra': 41, 'Panthéon': 47, 'Invalides': 48, 'Sacré-Cœur': 47,
      'Notre-Dame': 48, 'Arc de Triomphe': 35, 'Bastille': 36, 'Montparnasse': 60 };
    const eiffel = paris.find((q) => q.nom === 'Tour Eiffel');
    const ecarts = Object.entries(ATTENDU).map(([nom, cible]) => {
      const m = paris.find((q) => q.nom === nom);
      if (!m) return `${nom} introuvable`;
      if (m.h !== cible) return `${nom} ${m.h} pour ${cible}`;
      if (eiffel && m.h >= eiffel.h) return `${nom} ${m.h} dépasse la tour Eiffel (${eiffel.h})`;
      if (m.sol + m.h >= HEIGHT) return `${nom} sort du ciel`;
      return null;
    }).filter(Boolean);
    verifier('les monuments de Paris sont à l\'échelle du ciel, sous la tour Eiffel',
      ecarts.length === 0,
      ecarts.length ? ecarts.join(' · ') : paris.map((q) => `${q.nom} ${q.h}`).join(' · '));
  }

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
  // ET CE QUE PARIS DOUBLÉ A DÉPLACÉ (v306), d'où ET vers où : l'ancien disque
  // de Paris, les trois aérodromes, le village gaulois et le volcan à leur
  // ancienne place — le déménagement leur a rendu leur relief, un changement
  // voulu. Sur l'ancien code ces listes n'existent pas : la découpe y retire
  // les mêmes disques, écrits ici en dur, pour que la MÊME découpe se mesure
  // des deux côtés.
  const WV = await import('../src/world.js');
  let AV_AERO, AV = [];
  try { ({ AEROPORTS_AVANT_V306: AV_AERO } = await import('../src/aeroport.js')); } catch { /* ancien code */ }
  if (!AV_AERO) AV_AERO = [{ x: -250, z: -91, r: 92 }, { x: -322, z: 504, r: 62 }, { x: 33, z: 300, r: 56 }];
  for (const a of AV_AERO) AERO_POS.push({ x: a.x, z: a.z, portee: a.r + 24 });
  AV = [
    { x: -240, z: 200, portee: 185 + MARGE_VILLE },                 // l'ancien Paris
    { x: -360, z: 320, portee: 370 + MARGE_VILLE },                 // le nouveau
    { x: -420, z: 300, portee: 76 + 30 }, { x: WV.GAULOIS.x, z: WV.GAULOIS.z, portee: WV.GAULOIS.r + 30 },
    { x: -140, z: 420, portee: 45 + 30 }, { x: WV.VOLCANO.x, z: WV.VOLCANO.z, portee: WV.VOLCANO.r + 30 },
  ];
  AERO_POS.push(...AV);
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
  verifier('et Paris non plus, malgré son emprise doublée et son déménagement',
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
    // L'ANCIEN Paris, celui où les enfants ont bâti : depuis la v306 la ville
    // est ailleurs sur la carte courante, et c'est sous l'ancien disque que ce
    // témoin a toujours mesuré (la carte 3 d'avant Paris doublé, `terreV3`).
    const P = M.MONDES.terreV3 ? M.positionDe('paris', 'terreV3') : M.positionDe('paris');
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

  // LES BLOCS SUIVENT LEUR VILLE (v242).
  //
  // La migration de v199 ne déplaçait les blocs qu'en hauteur : une maison
  // bâtie dans une ville restait à l'ancienne adresse quand la ville partait.
  // Celle de v242 est une chaîne, et sa seconde marche fait suivre à un bloc
  // le déplacement de sa ville — Manhattan par son rectangle, les autres par
  // leur disque — sans changer sa hauteur. Ce témoin interroge la fonction
  // PURE, sur un document fabriqué : c'est ce que le nuage lui donnera.
  //
  // Et il vérifie ce qui rend la chose sûre : Paris et le point d'apparition
  // ne bougent pas, un bloc daté d'APRÈS la refonte ne bouge pas, une marque
  // d'import suit comme un bloc, et repasser la migration ne change rien.
  const suivi = await (async () => {
    const W = await import('../src/world.js');
    const M = await import('../src/mondes.js');
    const { BORNES } = await import('../src/manhattan-plan.js');
    if (!W.migrerBlocsCarte3 || !M.MONDES.terreV2) return { absent: true };
    const nyA = M.positionDe('ny', 'terreV2'), ny = M.positionDe('ny');
    const liA = M.positionDe('lille', 'terreV2'), li = M.positionDe('lille');
    const t = Date.UTC(2026, 7, 1);
    const doc = { local: {
      [`${nyA.x + 10},40,${nyA.z - 500}`]: [3, t, 1],       // Manhattan, ancienne origine
      [`${liA.x + 50},40,${liA.z + 20}`]: [4, t],           // le disque de Lille
      '-230,40,210': [5, t],                                // Paris
      '10,40,10': [6, t],                                   // le point d'apparition
      [`${nyA.x + 10},41,${nyA.z - 500}`]: [3, W.DATE_CARTE_3 + 1000],  // posé sur la carte neuve
      '@manhattan-v240:1,2,3': [3, t, nyA.x, nyA.z],
    }, 'manhattan-v1:local': { '1,2,3': [3, t] } };
    const un = W.migrerBlocsCarte3(doc), deux = W.migrerBlocsCarte3(un.tout);
    const L = un.tout.local;
    const dedans = (k) => { const [x, , z] = k.split(',').map(Number);
      return x >= ny.x + BORNES.x0 && x < ny.x + BORNES.x1 && z >= ny.z + BORNES.z0 && z < ny.z + BORNES.z1; };
    return {
      manhattan: L[`${ny.x + 10},40,${ny.z - 500}`]?.[0] === 3 && dedans(`${ny.x + 10},40,${ny.z - 500}`),
      lille: L[`${li.x + 50},40,${li.z + 20}`]?.[0] === 4,
      paris: L['-230,40,210']?.[1] === t, apparition: L['10,40,10']?.[1] === t,
      neuf: L[`${nyA.x + 10},41,${nyA.z - 500}`]?.[0] === 3,
      marque: L['@manhattan-v240:1,2,3']?.[2] === ny.x && L['@manhattan-v240:1,2,3']?.[3] === ny.z,
      archive: un.tout['manhattan-v1:local']['1,2,3'][1] === t,
      idempotent: JSON.stringify(deux.tout) === JSON.stringify(un.tout),
      bilan: `${un.deplaces} déplacés, ${un.laisses} laissés, ${un.intacts} intacts`,
    };
  })();
  verifier('et les blocs suivent leur ville — Manhattan par son rectangle, Lille par son disque',
    !suivi.absent && suivi.manhattan && suivi.lille && suivi.marque,
    suivi.absent ? 'la migration de carte 3 n\'existe pas' : JSON.stringify(suivi));
  verifier('sans toucher à Paris, au point d\'apparition, ni à ce qui est posé sur la carte neuve',
    !suivi.absent && suivi.paris && suivi.apparition && suivi.neuf && suivi.archive && suivi.idempotent,
    suivi.absent ? 'la migration de carte 3 n\'existe pas' : suivi.bilan);

  // TOUT CUBE D'UNE COLONNE COUVERTE EST SOUS SA SURFACE, pas seulement le
  // sommet (v297, portail) : une voiture de 2,26 blocs de large a le nez deux
  // colonnes devant son centre, et sur une pente d'un bloc par bloc le cube
  // sous le sommet de cette colonne-là — solide au premier jet — la bloquait
  // net (13,4 blocs en quarante secondes). On cherche une pente couverte à
  // deux marches consécutives, et l'on demande au monde ce qu'il tait.
  const sousSurface = (() => {
    if (!w.blocSousLaSurface || !w.solContinu) return { absent: true };
    for (let x = -300; x <= 300; x += 3) {
      for (let z = -300; z <= 300; z += 3) {
        const t0 = w.terrainHeight(x, z), t1 = w.terrainHeight(x + 1, z), t2 = w.terrainHeight(x + 2, z);
        if (t1 !== t0 + 1 || t2 !== t1 + 1) continue;
        // une pente NATURELLE, pas le talus d'une route : sous un corridor la
        // cote vient du profil et les cubes sont ceux de l'ouvrage (v300) — l'A1
        // retracée avec Paris doublé (v306) passe désormais dans cette fenêtre
        if (w.corridorEn && [0, 1, 2].some((k) => w.corridorEn(x + k, z))) continue;
        if (w.solContinu(x + 0.5, z + 0.5) === null || w.solContinu(x + 2.5, z + 0.5) === null) continue;
        // et la colonne du haut COUVERTE — ses quatre cellules dessinées : un
        // arbre ou un bord de lac à côté la laisse au voxel, à bon droit, et le
        // témoin ne mesurerait plus ce qu'il annonce (v306 : la première pente
        // trouvée a changé quand l'A1 retracée a pris l'ancienne)
        if ([[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].some(([a, b]) => w.solContinu(x + 2 + a, z + b) === null)) continue;
        return {
          x, z, t0, t1, t2,
          sommet: w.blocSousLaSurface(x + 2, t2, z), dessous: w.blocSousLaSurface(x + 2, t2 - 1, z),
          plusBas: w.blocSousLaSurface(x + 2, t2 - 2, z), air: w.blocSousLaSurface(x + 2, t2 + 1, z),
        };
      }
    }
    return { introuvable: true };
  })();
  verifier('sur une pente couverte, le cube sous le sommet est sous la surface, et n\'arrête plus une voiture',
    !sousSurface.absent && !sousSurface.introuvable && sousSurface.sommet && sousSurface.dessous
      && !sousSurface.plusBas && !sousSurface.air,
    sousSurface.absent ? 'pas de sol continu' : JSON.stringify(sousSurface));

  // ET UN TUNNEL SOUS UNE COLLINE GARDE SON PLANCHER, ET SON ENFANT (v297,
  // portail) : « quand la rame arrive, on propose de monter à bord » posait
  // l'enfant sur un tracé de train à neuf blocs sous la surface, et le premier
  // jet du contact le remontait sur l'herbe. On CHERCHE un vide sous une
  // colonne naturelle couverte (un tunnel, une grotte), et l'on demande au
  // monde : le plancher du vide est-il solide, et un pied posé dedans y
  // reste-t-il ?
  const tunnel = (() => {
    if (!w.blocSousLaSurface || !w.accrocherAuSol) return { absent: true };
    for (let x = -700; x <= 700; x += 2) {
      for (let z = -700; z <= 700; z += 2) {
        const t = w.terrainHeight(x, z);
        if (w.solContinu(x + 0.5, z + 0.5) === null) continue;
        let vide = -1;
        for (let y = t - 3; y > Math.max(2, t - 20); y--) if (w.getBlock(x, y, z) === 0 && w.getBlock(x, y + 1, z) === 0 && w.getBlock(x, y - 1, z) !== 0) { vide = y; break; }
        if (vide < 0) continue;
        const pos = { x: x + 0.5, y: vide + 0.05, z: z + 0.5 }, vel = { x: 0, y: 0, z: 0 };
        const r = w.accrocherAuSol(pos, vel, { etaitAuSol: true, pasH: 0, half: 0.3, hauteur: 1.8 });
        return { x, z, t, vide, plancher: !w.blocSousLaSurface(x, vide - 1, z), reste: Math.abs(pos.y - (vide + 0.05)) < 1e-6, contact: r };
      }
    }
    return { introuvable: true };
  })();
  verifier('et un tunnel sous une colline garde son plancher, et l\'enfant qui y est n\'est pas remonté sur l\'herbe',
    !tunnel.absent && !tunnel.introuvable && tunnel.plancher && tunnel.reste,
    tunnel.absent ? 'pas de sol continu' : JSON.stringify(tunnel));

  // LES FALAISES ET LES BERGES (v327) — sous node, sur soixante morceaux de
  // campagne tirés autour des lieux de toute la carte (la graine est fixe).
  // On compte les faces LATÉRALES qu'on voit sur une colonne hors ville : une
  // marche de deux blocs ou plus (falaise), ou la rive d'un lac, d'un fleuve,
  // de la mer (berge). Sur `origin/main` (v321) : 2 863 faces de terre et
  // 1 164 d'herbe sur les falaises, 1 130 de terre sur les berges, pour 500
  // morceaux (`sonde-falaises.cjs`). Et le troisième verdict est celui de
  // l'invariant 1 par l'autre bout : le même monde SANS la règle a la MÊME
  // forme, bloc pour bloc — seule la matière change.
  const falaises = await (async () => {
    const { BLOCK, BLOCK_INFO } = await import('../src/blocks.js');
    const { dansVilleMonde } = await import('../src/villesmonde.js');
    const { lieuxDuMonde } = await import('../src/mondes.js');
    const W = await import('../src/world.js');
    const { colonneCouverte } = await import('../src/solcontinu.js');
    // sur l'ancien code la règle n'existe pas : le monde « sans » est alors le
    // même, et les trois verdicts mesurent quand même (v302 : un témoin neuf
    // mesure le défaut des deux côtés, pas l'absence d'un export)
    const sans = new W.World();
    sans.conf = { ...W.CONF_NEUF, falaises: false };
    const lieux = lieuxDuMonde().filter((l) => Number.isFinite(l.x));
    let g = 11; const alea = () => (g = (g * 1103515245 + 12345) % 2147483648) / 2147483648;
    const enVille = (x, z) => !!w.cityAt(x, z) || dansVilleMonde(x, z);
    const r = { morceaux: 0, falaise: 0, terreFalaise: 0, rocheFalaise: 0, berge: 0, terreBerge: 0, rive: 0, forme: 0, matiere: 0 };
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (r.morceaux < 60) {
      const l = lieux[Math.floor(alea() * lieux.length)];
      const a = alea() * Math.PI * 2, d = 120 + alea() * 780;
      const bx = Math.floor((l.x + Math.cos(a) * d) / 16) * 16, bz = Math.floor((l.z + Math.sin(a) * d) / 16) * 16;
      if (enVille(bx + 8, bz + 8)) continue;
      r.morceaux++;
      for (let z = bz; z < bz + 16; z++) for (let x = bx; x < bx + 16; x++) {
        if (enVille(x, z)) continue;
        const h = w.terrainHeight(x, z);
        for (let y = Math.max(0, W.WATER_LEVEL - 4); y <= h + 1; y++) {
          const id = w.getBlock(x, y, z), id0 = sans.getBlock(x, y, z);
          if ((BLOCK_INFO[id]?.solid ?? false) !== (BLOCK_INFO[id0]?.solid ?? false)) r.forme++;
          else if (id !== id0) r.matiere++;
        }
        const couverte = colonneCouverte(w, x, z);
        for (const [dx, dz] of D) {
          const hv = w.terrainHeight(x + dx, z + dz);
          for (let y = Math.min(h, hv + 1); y <= h; y++) {
            const id = w.getBlock(x, y, z);
            if (!BLOCK_INFO[id]?.solid || id === BLOCK.LOG || id === BLOCK.LEAVES) continue;
            if (y === h && couverte) continue;
            const v = w.getBlock(x + dx, y, z + dz);
            if (v !== BLOCK.AIR && v !== BLOCK.WATER) continue;
            const terre = id === BLOCK.DIRT || id === BLOCK.GRASS;
            if (v === BLOCK.WATER || (hv < W.WATER_LEVEL && y <= W.WATER_LEVEL + 3)) {
              r.berge++; if (terre) r.terreBerge++;
              if (id === BLOCK.SAND || id === BLOCK.GRAVEL) r.rive++;
            } else if (h - hv >= 2) {
              r.falaise++; if (terre) r.terreFalaise++;
              if (id === BLOCK.STONE) r.rocheFalaise++;
            }
          }
        }
      }
    }
    return r;
  })();
  verifier('une falaise de campagne montre de la roche, pas un escalier de terre et d\'herbe',
    falaises.falaise > 200 && falaises.terreFalaise === 0 && falaises.rocheFalaise > falaises.falaise * 0.9,
    `${falaises.terreFalaise} faces de terre ou d'herbe sur ${falaises.falaise} faces de falaise (roche ${falaises.rocheFalaise}), ${falaises.morceaux} morceaux`);
  verifier('et une berge a sa grève de sable et de gravier au ras de l\'eau, pas un talus de terre',
    falaises.berge > 200 && falaises.terreBerge <= falaises.berge * 0.02 && falaises.rive > 100,
    `${falaises.terreBerge} faces de terre ou d'herbe sur ${falaises.berge} faces de berge, ${falaises.rive} de sable ou de gravier`);
  verifier('et la règle ne change que la matière : même forme, bloc pour bloc',
    falaises.forme === 0 && falaises.matiere > 500,
    `${falaises.forme} blocs de forme différente, ${falaises.matiere} blocs de matière différente`);

  // LE MÉNAGE DU CIEL DE PARIS (v298) — PUR, sur un document fabriqué.
  //
  // Décision de Max (« clean les trucs bizarres ») : une spirale de planches
  // et de verre flottait à côté de la tour Eiffel, et le journal de son iPhone
  // a compté 505 blocs posés suspendus dans Paris. La règle retire ce qui
  // FLOTTE — un groupe de blocs posés qui ne touche ni le sol, ni un bloc du
  // jeu, ni un bloc posé au sol — et c'est le « rien d'autre » qui se prouve :
  // une maison (mur au sol, bloc dessus), un drapeau sur un toit du jeu, un
  // bloc collé au fer de la tour, un bloc posé APRÈS la date, un trou creusé,
  // une tour au point d'apparition, une marque d'import, une archive restent.
  const menage = await (async () => {
    const W = await import('../src/world.js');
    // L'ANCIEN PARIS (v306) : le ménage juge des blocs posés avant sa date,
    // donc dans la ville et sur le relief d'avant Paris doublé — la trame figée
    // et le monde d'avant. Sur l'ancien code, ce sont la ville et le monde
    // courants, qui SONT ceux d'avant.
    let P; try { P = await import('../src/paris-v302.js'); } catch { P = await import('../src/paris.js'); }
    const w = new W.World({ avant: true });
    if (!W.menagerBlocsCielParis || !W.DATE_MENAGE_PARIS) return { absent: true };
    const te = P.adresseParis(-4.4, 0.5);                    // la tour Eiffel
    const x = te[0] + 12, z = te[1];
    const h = w.terrainHeight(x, z), hs = w.terrainHeight(10, 10);
    const t = W.DATE_MENAGE_PARIS - 86400000;
    // un toit du jeu : la première colonne bâtie à l'est de la tour
    let xt = te[0] + 14; while (xt < te[0] + 60 && w.sommetColonne(xt, z) <= w.terrainHeight(xt, z) + 3) xt++;
    const toitJeu = w.sommetColonne(xt, z);
    // le fer de la tour : un montant, à y = 10 au-dessus du parvis
    const parvis = w.terrainHeight(te[0], te[1]);
    let fer = null;
    for (let dx = -8; dx <= 8 && !fer; dx++) for (let dz = -8; dz <= 8 && !fer; dz++) {
      if (w.getBlock(te[0] + dx, parvis + 10, te[1] + dz) !== 0 && w.getBlock(te[0] + dx + 1, parvis + 10, te[1] + dz) === 0) fer = [te[0] + dx + 1, parvis + 10, te[1] + dz];
    }
    const ciel1 = `${x},${h + 30},${z}`, ciel2 = `${x},${h + 31},${z}`;
    const mur = `${x + 3},${h + 1},${z}`, dessus = `${x + 3},${h + 2},${z}`;
    const drapeau = `${xt},${toitJeu + 1},${z}`, colle = fer ? fer.join(',') : null;
    const apres = `${x + 6},${h + 30},${z}`, trou = `${x + 8},${h + 30},${z}`, loin = `10,${hs + 40},10`;
    const doc = { local: {
      [ciel1]: [8, t], [ciel2]: [10, t], [mur]: [1, t], [dessus]: [1, t], [drapeau]: [23, t],
      ...(colle ? { [colle]: [23, t] } : {}),
      [apres]: [5, W.DATE_MENAGE_PARIS + 1000], [trou]: [0, t], [loin]: [5, t], '@manhattan-v240:1,2,3': [3, t, 1, 2],
    }, 'manhattan-v1:local': { [ciel1]: [3, t] } };
    const t0 = Date.now();
    const un = W.menagerBlocsCielParis(doc), deux = W.menagerBlocsCielParis(un.tout);
    const ms = Date.now() - t0;
    const L = un.tout.local;
    return {
      retire: !L[ciel1] && !L[ciel2], mur: !!L[mur], dessus: !!L[dessus], drapeau: !!L[drapeau],
      colle: colle ? !!L[colle] : 'pas de fer trouvé', apres: !!L[apres], trou: !!L[trou],
      loin: !!L[loin], marque: !!L['@manhattan-v240:1,2,3'], archive: !!un.tout['manhattan-v1:local'][ciel1],
      idempotent: JSON.stringify(deux.tout) === JSON.stringify(un.tout),
      bilan: `${un.retires} retiré(s), ${un.gardes} gardé(s), ${ms} ms, toit du jeu à ${toitJeu - w.terrainHeight(xt, z)}, fer ${colle}`,
    };
  })();
  verifier('le ménage du ciel de Paris retire ce qui flotte, d\'un seul tenant',
    !menage.absent && menage.retire && menage.bilan.startsWith('2 '),
    menage.absent ? 'le ménage du ciel de Paris n\'existe pas' : menage.bilan);
  verifier('et ne touche ni à une maison, ni à un drapeau sur un toit, ni au fer de la tour, ni à ce qui est posé après, ni hors de Paris',
    !menage.absent && menage.mur && menage.dessus && menage.drapeau && menage.colle === true && menage.apres
      && menage.trou && menage.loin && menage.marque && menage.archive && menage.idempotent,
    menage.absent ? 'le ménage du ciel de Paris n\'existe pas' : JSON.stringify(menage));

  // --- LE RELEVÉ DES TOITS DE PARIS (v301) : un étage fait trois blocs, et ce ---
  // --- qu'un enfant avait bâti sur un toit monte avec le toit ------------------
  //
  // Le relief ne bouge pas (les deux empreintes ci-dessus le disent) ; ce sont
  // les IMMEUBLES qui montent, de dix à vingt et un blocs. Une cabane posée sur
  // un toit d'avant serait enfermée dans l'immeuble neuf. La règle est pure et
  // se juge sur un document fabriqué : la cabane monte d'un seul tenant, et de
  // ce que `gabaritParis` déclare ; un bloc collé à la façade sous l'ancien
  // toit, une tour dans la rue, un bloc posé après la date, un bloc hors de
  // Paris, une marque d'import, une archive : rien ne bouge. Elle est
  // idempotente. ET ELLE PASSE AVANT LE MÉNAGE : jouée après, la cabane —
  // qui ne touche plus rien à onze blocs sous le toit neuf — aurait été
  // retirée. On fait passer la cabane par la chaîne entière, dans l'ordre de
  // `sync.js`, et l'on regarde ce qu'il en reste : tout, sur le toit neuf.
  const releve = await (async () => {
    const W = await import('../src/world.js');
    // LA TRAME OÙ LA CABANE A ÉTÉ POSÉE (v303) : depuis que les rues suivent la
    // règle du kit, les toits d'avant vivent dans la trame figée, et c'est elle
    // que le relevé lit. Sur l'ancien code elle n'existe pas : la trame
    // courante EST celle d'avant.
    let P; try { P = await import('../src/paris-v302.js'); } catch { P = await import('../src/paris.js'); }
    // et le MONDE où elle a été posée (v306) : celui d'avant Paris doublé
    const w = new W.World({ avant: true });
    if (!W.releverBlocsToitsParis || !W.DATE_RELEVE_PARIS || !P.gabaritParis) return { absent: true };
    const [x0, z0] = P.adresseParis(-0.8, -0.9);
    let col = null;
    for (let dx = -30; dx < 30 && !col; dx++) for (let dz = -30; dz < 30 && !col; dz++) {
      const x = x0 + dx, z = z0 + dz;
      if (P.solParis(x, z) !== null || !P.lotParisLibre(x, z)) continue;
      const g = P.gabaritParis(x, z);
      if (!g.dedans) col = { x, z, g };
    }
    if (!col) return { absent: false, colonne: false };
    const { x, z, g } = col;
    const h = w.terrainHeight(x, z);
    // le bâtisseur écrit à h + dy − 1 : le dernier bloc de l'ancien immeuble,
    // et celui du neuf — vérifié sur le MONDE, pas seulement sur le gabarit
    const toitAncien = h + g.ancien - 1, toitNeuf = h + g.sommet - 1;
    const monte = g.sommet - g.ancien;
    const t = W.DATE_RELEVE_PARIS - 86400000;
    // le monde d'un enfant qui a bâti là : sa cabane dans le journal, et la
    // colonne garde l'immeuble sur lequel elle a été posée (v303)
    const wc = new W.World({ avant: true });
    wc.installerEdits(new Map([[`${x},${toitAncien + 1},${z}`, 8]]), new Map([[`${x},${toitAncien + 1},${z}`, t]]));
    const monde = wc.getBlock(x, toitNeuf, z) !== 0 && wc.getBlock(x, toitNeuf + 1, z) === 0;
    let rue = null;
    for (let d = 1; d < 20 && !rue; d++) for (const [dx, dz] of [[d, 0], [-d, 0], [0, d], [0, -d]]) if (P.solParis(x + dx, z + dz) !== null) { rue = [x + dx, z + dz]; break; }
    const hr = w.terrainHeight(rue[0], rue[1]);
    const cabane = `${x},${toitAncien + 1},${z}`, cabane2 = `${x},${toitAncien + 2},${z}`;
    const facade = `${x},${h + 4},${z}`, tour = `${rue[0]},${hr + 15},${rue[1]}`;
    const apres = `${x},${toitAncien + 3},${z}`, loin = `${x + 900},${h + 20},${z}`;
    const doc = { local: {
      [cabane]: [8, t], [cabane2]: [10, t], [facade]: [1, t], [tour]: [5, t],
      [apres]: [5, W.DATE_RELEVE_PARIS + 1000], [loin]: [5, t], '@manhattan-v240:1,2,3': [3, t, 1, 2],
    }, 'manhattan-v1:local': { [cabane]: [3, t] } };
    const t0 = Date.now();
    const un = W.releverBlocsToitsParis(doc), deux = W.releverBlocsToitsParis(un.tout);
    const chaine = W.menagerBlocsCielParis(un.tout);          // l'ordre de sync.js : relever, puis ménager
    const ms = Date.now() - t0;
    const L = un.tout.local, C = chaine.tout.local;
    const haut1 = `${x},${toitAncien + 1 + monte},${z}`, haut2 = `${x},${toitAncien + 2 + monte},${z}`;
    const pos = W.releverPositionsParis({ 1: { x: x + 0.5, y: toitAncien + 2, z: z + 0.5, t }, 2: { x: rue[0] + 0.5, y: hr + 2, z: rue[1] + 0.5, t } });
    return {
      absent: false, colonne: true, monde, monte, deplaces: un.deplaces,
      cabane: !!L[haut1] && !!L[haut2] && !L[cabane] && !L[cabane2] && L[haut1][1] === W.DATE_RELEVE_PARIS,
      facade: !!L[facade], tour: !!L[tour], apres: !!L[apres], loin: !!L[loin],
      marque: !!L['@manhattan-v240:1,2,3'], archive: !!un.tout['manhattan-v1:local'][cabane],
      idempotent: deux.deplaces === 0 && JSON.stringify(deux.tout) === JSON.stringify(un.tout),
      chaine: !!C[haut1] && !!C[haut2] && chaine.retires === 0,
      pos: pos.pos[1].y === toitAncien + 2 + monte && pos.pos[2].y === hr + 2 && pos.deplaces === 1,
      bilan: `colonne (${x}, ${z}), toit ${toitAncien} → ${toitNeuf} (+${monte}), ${un.deplaces} déplacé(s), ${ms} ms`,
    };
  })();
  verifier('un étage de Paris fait trois blocs, et une cabane bâtie sur un toit monte avec le toit, d\'un seul tenant',
    !releve.absent && releve.colonne && releve.monde && releve.monte >= 5 && releve.deplaces === 2 && releve.cabane,
    releve.absent ? 'le relevé des toits de Paris n\'existe pas' : releve.bilan);
  verifier('et ne touche ni à la façade, ni à la rue, ni à ce qui est posé après, ni hors de Paris — puis le ménage la laisse sur le toit neuf',
    !releve.absent && releve.facade && releve.tour && releve.apres && releve.loin && releve.marque && releve.archive
      && releve.idempotent && releve.chaine && releve.pos,
    releve.absent ? 'le relevé des toits de Paris n\'existe pas' : JSON.stringify(releve));

  // --- PARIS DOUBLÉ ET DÉPLACÉ (v306) : le monde d'avant est celui de la ----
  // --- production, un bloc suit sa ville, et la ville cède à ce qu'on a bâti --
  //
  // Trois choses se prouvent ici, sous node.
  //  1. Le monde d'avant (`new World({ avant: true })`), contre lequel la
  //     migration juge les blocs d'avant, rend AU BLOC PRÈS le monde de la
  //     production v302 — ses deux empreintes ont été relevées sur
  //     `origin/main`. Sans lui, le ménage du ciel jugerait une maison de
  //     l'ancien Paris sur le relief du nouveau.
  //  2. La marche 5 → 6 (`migrerParisDouble`) emmène une maison bâtie au sol
  //     dans l'ancien Paris là où le plan doublé met le même endroit de la
  //     vraie ville, à la même hauteur au-dessus du sol ; une maison posée sur
  //     l'ancien tarmac de Roissy suit l'aérodrome ; un trou creusé dans un
  //     ancien immeuble disparaît avec lui ; rien ne bouge au point
  //     d'apparition, ni ce qui est posé après la date ; elle est idempotente.
  //     Et LA CHAÎNE ENTIÈRE, dans l'ordre de `sync.js`, ne perd pas une maison
  //     posée avant le ménage là où le relief a changé : c'est ce qu'un ménage
  //     jugé sur le monde neuf aurait retiré.
  //  3. Le nouveau Paris CÈDE : autour de la maison emmenée, aucun immeuble ;
  //     et un bloc posé après la date n'empêche pas la ville de bâtir.
  const double = await (async () => {
    const W = await import('../src/world.js');
    if (!W.migrerParisDouble || !W.DATE_PARIS_DOUBLE) return { absent: true };
    const A = await import('../src/paris-v302.js');
    const N = await import('../src/paris.js');
    const av = new W.World({ avant: true }), nf = new W.World();
    // 1. le monde d'avant, contre la production
    const rel = [];
    for (let x = -440; x <= -40; x += 2) for (let z = 0; z <= 400; z += 2) rel.push(av.terrainHeight(x, z));
    const blocs = [];
    for (let cx = -15; cx <= -12; cx++) for (let cz = 12; cz <= 15; cz++) {
      for (let x = cx * 16; x < cx * 16 + 16; x++) for (let z = cz * 16; z < cz * 16 + 16; z++) for (let y = 28; y < 90; y++) blocs.push(av.getBlock(x, y, z));
    }
    const hRel = createHash('sha1').update(rel.join(',')).digest('hex');
    const hBlocs = createHash('sha1').update(blocs.join(',')).digest('hex');
    // 2. la marche, sur un document fabriqué
    const t = W.DATE_PARIS_DOUBLE - 86400000, tM = W.DATE_MENAGE_PARIS - 86400000;
    const [mx, mz] = A.adresseParis(-2.5, 1.5);                  // une maison rive gauche, ancien Paris
    const gA = av.terrainHeight(mx, mz);
    const doc = { local: {} };
    const L0 = doc.local;
    for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) for (let dy = 1; dy <= 3; dy++) L0[`${mx + dx},${gA + dy},${mz + dz}`] = [5, t];
    // un trou dans un ancien immeuble, loin de la maison
    const [tx, tz] = A.adresseParis(0.8, -1.2);
    L0[`${tx},${av.terrainHeight(tx, tz) + 4},${tz}`] = [0, t];
    // sur l'ancien tarmac de Roissy
    const gR = av.terrainHeight(-250, -91);
    L0[`-250,${gR + 1},-91`] = [5, t]; L0[`-250,${gR + 2},-91`] = [5, t];
    // au point d'apparition, et après la date
    L0['10,40,10'] = [6, t];
    L0[`${mx},${gA + 9},${mz}`] = [7, W.DATE_PARIS_DOUBLE + 1000];
    // Une maison d'avant le ménage, posée au sol dans l'ancien Paris LÀ OÙ LE
    // RELIEF D'AUJOURD'HUI EST PLUS BAS (l'ancienne butte, une rive) : jugée
    // sur le monde neuf elle serait « en l'air » et le ménage la retirerait —
    // vérifié : zéro bloc arrivé avec un ménage sur le monde neuf, trois ici.
    // On cherche une rue où les deux mondes diffèrent d'au moins trois blocs.
    let bord = null;
    for (let bx = A.PARIS.x - 150; bx <= A.PARIS.x + 150 && !bord; bx += 3) {
      for (let bz = A.PARIS.z - 150; bz <= A.PARIS.z + 150 && !bord; bz += 3) {
        if (A.solParis(bx, bz) === null) continue;                   // une rue, pas un immeuble
        const ha = av.terrainHeight(bx, bz), hn = nf.terrainHeight(bx, bz);
        if (ha >= 33 && hn <= ha - 3) bord = { bx, bz, ha, hn };
      }
    }
    if (bord) for (let dy = 1; dy <= 3; dy++) L0[`${bord.bx},${bord.ha + dy},${bord.bz}`] = [11, tM];
    const un = W.migrerBlocsParisDouble(doc), deux = W.migrerBlocsParisDouble(un.tout);
    const L = un.tout.local;
    const P2 = N.PARIS, P1 = A.PARIS;
    const ax = Math.round(mx + 1), az = Math.round(mz + 1);
    const nx = Math.round(P2.x + 2 * (ax - P1.x)), nz = Math.round(P2.z + 2 * (az - P1.z));
    const gN = nf.terrainHeight(nx, nz);
    const maison = Object.keys(L).filter((k) => L[k][0] === 5 && L[k][1] === W.DATE_PARIS_DOUBLE).map((k) => k.split(',').map(Number))
      .filter(([x, , z]) => Math.hypot(x - nx, z - nz) < 4);
    const bas = maison.length ? Math.min(...maison.map((p) => p[1])) : null;
    const roissy = Object.keys(L).filter((k) => L[k][0] === 5 && L[k][1] === W.DATE_PARIS_DOUBLE)
      .map((k) => k.split(',').map(Number)).filter(([x, , z]) => Math.hypot(x - (-697), z - (-17)) < 3);
    const chaine = W.migrerBlocsParisDouble(W.menagerBlocsCielParis(W.releverBlocsToitsParis(W.migrerBlocsCarte3(doc).tout).tout).tout).tout.local;
    const bordArrive = bord ? Object.keys(chaine).filter((k) => chaine[k][0] === 11 && chaine[k][1] === W.DATE_PARIS_DOUBLE).length : 0;
    // 3. la ville cède
    const monde = (carte) => {
      const m = new W.World();
      const ed = new Map(), tm = new Map();
      for (const [k, e] of Object.entries(carte)) if (!k.startsWith('@')) { ed.set(k, e[0]); tm.set(k, e[1]); }
      m.installerEdits(ed, tm);
      return m;
    };
    const mc = monde(L);
    let bati = 0;
    for (let dx = -1; dx <= 3; dx++) for (let dz = -1; dz <= 3; dz++) for (let y = gN + 1; y < gN + 25; y++) {
      const k = `${nx - 1 + dx},${y},${nz - 1 + dz}`;
      if (!L[k] && mc.getBlock(nx - 1 + dx, y, nz - 1 + dz) !== 0) bati++;
    }
    // un bloc posé APRÈS la date, sur un lot du nouveau Paris : la ville y bâtit
    let lot = null;
    for (let d = 0; d < 80 && !lot; d++) for (let dx = -d; dx <= d && !lot; dx++) for (const dz of [-d, d]) {
      const x = P2.x + 60 + dx, z = P2.z + 40 + dz;
      if (N.solParis(x, z) === null && N.lotParisLibre(x, z)) { lot = [x, z]; break; }
    }
    const hl = nf.terrainHeight(lot[0], lot[1]);
    const kl = `${lot[0]},${hl + 30},${lot[1]}`;
    const apres = monde({ [kl]: [5, W.DATE_PARIS_DOUBLE + 1000] });
    const lotBati = [2, 3, 4, 6].some((dy) => apres.getBlock(lot[0], hl + dy, lot[1]) !== 0);
    return {
      absent: false, hRel, hBlocs,
      maison: maison.length === 27 && bas === gN + 1, bas, gN, ou: [nx, nz],
      trou: !Object.keys(L).some((k) => L[k][0] === 0), roissy: roissy.length === 2,
      apparition: L['10,40,10'] && L['10,40,10'][1] === t, apres: !!L[`${mx},${gA + 9},${mz}`],
      idempotent: deux.deplaces === 0 && JSON.stringify(deux.tout) === JSON.stringify(un.tout),
      bord: bord ? { ...bord, arrives: bordArrive } : null, bati, lotBati,
      bilan: `${un.deplaces} déplacé(s), ${un.jetes} jeté(s), ${un.laisses} laissé(s)`,
    };
  })();
  verifier('le monde d\'avant Paris doublé est, au bloc près, celui de la production',
    !double.absent && double.hRel === EMPREINTE_AVANT_RELIEF && double.hBlocs === EMPREINTE_AVANT_BLOCS,
    double.absent ? 'Paris n\'a pas doublé' : `relief ${double.hRel.slice(0, 12)} · blocs ${double.hBlocs.slice(0, 12)}`);
  verifier('une maison de l\'ancien Paris suit son quartier dans le nouveau, posée sur son sol',
    !double.absent && double.maison,
    double.absent ? 'Paris n\'a pas doublé' : `${double.bilan} · bas ${double.bas}, sol ${double.gN}, en (${double.ou})`);
  verifier('et l\'ancien tarmac de Roissy suit l\'aérodrome ; un trou d\'immeuble part avec l\'immeuble ; rien d\'autre ne bouge',
    !double.absent && double.roissy && double.trou && double.apparition && double.apres && double.idempotent,
    double.absent ? 'Paris n\'a pas doublé' : JSON.stringify(double));
  verifier('et la chaîne entière ne perd pas une maison d\'avant le ménage, posée là où le sol d\'avant n\'est plus celui d\'aujourd\'hui',
    !double.absent && !!double.bord && double.bord.arrives >= 3,
    double.absent ? 'Paris n\'a pas doublé' : JSON.stringify(double.bord));
  verifier('et le nouveau Paris ne bâtit pas d\'immeuble sur ce qu\'un enfant avait bâti — mais bâtit sous ce qu\'on pose après',
    !double.absent && double.bati === 0 && double.lotBati,
    double.absent ? 'Paris n\'a pas doublé' : `autour de la maison : ${double.bati} bloc(s) de ville · lot après la date bâti : ${double.lotBati}`);

  // --- LONDRES À LA RÈGLE DU KIT (v339) : la ville d'avant reste sous ce ----
  // --- qu'un enfant y a bâti ------------------------------------------------
  //
  // Les rues de Londres s'élargissent et ses îlots se recomposent : une
  // ancienne rue peut devenir un immeuble, un ancien immeuble une rue. Londres
  // ne bouge pas, donc rien ne se déplace — c'est la règle de la v303 qui
  // vaut : sous une colonne où un bloc a été posé avant `DATE_RUES_LONDRES`
  // (et ses huit voisines), la ville figée dans `londres-v332.js` reste.
  // Trois cas, lus dans le monde : une maison posée sur une ancienne rue que
  // la ville neuve bâtit n'est pas enfermée ; une cabane sur un ancien toit
  // que la ville neuve fait rue garde son toit ; et un bloc posé APRÈS la date
  // ne retient rien — la ville neuve bâtit dessous. Rouge sur `origin/main` :
  // la date n'existe pas, et les deux premiers cas montrent la ville neuve.
  const londres = await (async () => {
    const W = await import('../src/world.js');
    if (!W.DATE_RUES_LONDRES) return { absent: true };
    const A = await import('../src/londres-v332.js');
    const N = await import('../src/londres.js');
    const L = N.LONDRES, t = W.DATE_RUES_LONDRES - 86400000;
    const nf = new W.World();
    // une ancienne rue que la ville neuve bâtit, et un ancien lot qu'elle fait rue
    let rueBatie = null, lotRue = null;
    for (let d = 20; d < 100 && !(rueBatie && lotRue); d++) for (let a = 0; a < 64; a++) {
      const x = Math.round(L.x + d * Math.cos(a * Math.PI / 32)), z = Math.round(L.z + d * Math.sin(a * Math.PI / 32));
      const voisin = (f) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].every(([i, j]) => f(x + i, z + j));
      // une façade neuve (le bâtisseur y monte un mur) sur neuf colonnes d'ancienne rue
      const mur = () => { let n = 0; N.batirColonneLondres(x, z, (dy) => { if (dy >= 3) n++; }); return n >= 3; };
      if (!rueBatie && voisin((xx, zz) => A.solLondres(xx, zz) !== null) && N.lotLondresLibre(x, z) && mur()) rueBatie = [x, z];
      if (!lotRue && voisin(A.lotLondresLibre) && voisin((xx, zz) => N.solLondres(xx, zz) !== null)) lotRue = [x, z];
    }
    if (!rueBatie || !lotRue) return { absent: false, introuvable: true, rueBatie, lotRue };
    const monde = (carte) => {
      const m = new W.World();
      const ed = new Map(), tm = new Map();
      for (const [k, e] of Object.entries(carte)) { ed.set(k, e[0]); tm.set(k, e[1]); }
      m.installerEdits(ed, tm);
      return m;
    };
    // 1. une maison de trois blocs sur l'ancienne rue
    const [mx, mz] = rueBatie, gm = nf.terrainHeight(mx, mz);
    const maison = {};
    for (let dy = 1; dy <= 3; dy++) maison[`${mx},${gm + dy},${mz}`] = [5, t];
    const wm = monde(maison);
    let enferme = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = gm + 1; y <= gm + 6; y++) {
      if (!maison[`${mx + dx},${y},${mz + dz}`] && wm.getBlock(mx + dx, y, mz + dz) !== 0) enferme++;
    }
    // et sans la date, la ville neuve y bâtit bien (sinon le cas ne prouve rien)
    const neuf = monde({ [`${mx},${gm + 40},${mz}`]: [5, W.DATE_RUES_LONDRES + 1000] });
    let batiNeuf = 0;
    for (let y = gm + 1; y <= gm + 6; y++) if (neuf.getBlock(mx, y, mz) !== 0) batiNeuf++;
    // 2. une cabane sur l'ancien toit
    const [cx, cz] = lotRue, gc = nf.terrainHeight(cx, cz);
    const toit = (() => { let y0 = gc; A.batirColonneLondres(cx, cz, (dy) => { y0 = Math.max(y0, gc + dy - 1); }); return y0; })();
    const cabane = { [`${cx},${toit + 1},${cz}`]: [8, t] };
    const wc = monde(cabane);
    const porte = wc.getBlock(cx, toit, cz) !== 0;
    return { absent: false, enferme, batiNeuf, porte, toit, gc, rueBatie, lotRue };
  })();
  verifier('à Londres, une maison posée sur une ancienne rue n\'est pas enfermée dans un immeuble neuf',
    !londres.absent && !londres.introuvable && londres.enferme === 0 && londres.batiNeuf > 0,
    londres.absent ? 'pas de date des rues de Londres' : JSON.stringify(londres));
  verifier('et une cabane posée sur un ancien toit de Londres garde son toit',
    !londres.absent && !londres.introuvable && londres.porte,
    londres.absent ? 'pas de date des rues de Londres' : JSON.stringify(londres));

  // --- LE FONDU DOUX DES VILLES (v309) : le pays descend à un bloc par bloc --
  // --- au plus, le monde d'avant reste celui de la production, un bloc suit --
  //
  // Quatre choses, sous node.
  //  1. La dette de la v308, mesurée comme elle l'a été : soixante-quatre
  //     rayons par ville, du bord du disque à quinze blocs dehors ; ROUGE sur
  //     `origin/main` (651 rayons plus raides qu'un bloc par bloc).
  //  2. Le monde de la v308 (`new World({ v308: true })`), contre lequel la
  //     marche 6 → 7 juge les blocs d'avant, rend au bloc près le relief de la
  //     production autour de cinq villes touchées (empreinte relevée sur
  //     `origin/main`).
  //  3. Le cône n'a fait qu'ABAISSER, et seulement dans la couronne : jamais
  //     dans un disque, jamais au-delà de `FONDU_PORTEE`, jamais plus de
  //     vingt-quatre blocs (`ECART_MAX` de la migration).
  //  4. La marche 6 → 7 : une maison posée au sol dans la couronne de Salvador
  //     descend avec son sol d'un seul tenant ; un bloc posé après la date, un
  //     bloc dans le disque et un bloc au point d'apparition ne bougent pas ; la
  //     position de l'enfant suit ; elle est idempotente, et la chaîne entière
  //     dans l'ordre de `sync.js` rend la même chose.
  //  Et le cône n'atteint aucun des endroits où les enfants ont bâti.
  const fondu = await (async () => {
    const W = await import('../src/world.js');
    const VM = await import('../src/villesmonde.js');
    let raides = 0, rayons = 0;
    for (const f of VILLES_MONDE) for (let k = 0; k < 64; k++) {
      const a = 2 * Math.PI * k / 64;
      const hIn = w.terrainHeight(Math.round(f.ancre.x + Math.cos(a) * (f.rayon - 1)), Math.round(f.ancre.z + Math.sin(a) * (f.rayon - 1)));
      const hOut = w.terrainHeight(Math.round(f.ancre.x + Math.cos(a) * (f.rayon + 15)), Math.round(f.ancre.z + Math.sin(a) * (f.rayon + 15)));
      if (hOut < 29 || hIn < 29) continue;
      rayons++;
      if (Math.abs(hOut - hIn) / 15 > 1) raides++;
    }
    if (!W.migrerFonduDoux || !VM.FONDU_PORTEE) return { absent: true, raides, rayons };
    const v8 = new W.World({ v308: true }), nf = new W.World();
    // 2. le monde de la v308, contre la production
    const rel = [];
    for (const cle of ['salvador', 'jakarta', 'bari', 'busan', 'oslo']) {
      const f = VILLES_MONDE.find((v) => v.cle === cle);
      for (let x = Math.round(f.ancre.x - f.rayon - 80); x <= f.ancre.x + f.rayon + 80; x += 3)
        for (let z = Math.round(f.ancre.z - f.rayon - 80); z <= f.ancre.z + f.rayon + 80; z += 3) rel.push(v8.terrainHeight(x, z));
    }
    const hRel = createHash('sha1').update(rel.join(',')).digest('hex');
    // 3. seulement abaisser, seulement dans la couronne
    const fautes = [];
    let abaissees = 0, pire = 0;
    for (const f of VILLES_MONDE) for (let k = 0; k < 90; k++) {
      const a = k * 2.399, d = f.rayon - 30 + (k * 7) % (VM.FONDU_PORTEE + 60);
      const x = Math.round(f.ancre.x + Math.cos(a) * d), z = Math.round(f.ancre.z + Math.sin(a) * d);
      const h8 = v8.terrainHeight(x, z), h9 = nf.terrainHeight(x, z);
      if (h9 === h8) continue;
      abaissees++; pire = Math.max(pire, h8 - h9);
      const dd = Math.hypot(x - f.ancre.x, z - f.ancre.z);
      if (h9 > h8 || h8 - h9 > 24 || !VM.aPorteeDuFondu(x, z) || VILLES_MONDE.some((g) => Math.hypot(x - g.ancre.x, z - g.ancre.z) <= g.rayon)) {
        if (fautes.length < 4) fautes.push({ x, z, h8, h9, dd: Math.round(dd - f.rayon) });
      }
    }
    // 4. la marche 6 → 7, sur un document fabriqué
    const sal = VILLES_MONDE.find((v) => v.cle === 'salvador');
    let site = null;
    for (let k = 0; k < 64 && !site; k++) {
      const a = 2 * Math.PI * k / 64;
      for (let d = sal.rayon + 4; d <= sal.rayon + 30 && !site; d += 2) {
        const x = Math.round(sal.ancre.x + Math.cos(a) * d), z = Math.round(sal.ancre.z + Math.sin(a) * d);
        let ok = true, ga = null, gn = null;
        for (let dx = 0; dx < 3 && ok; dx++) for (let dz = 0; dz < 3 && ok; dz++) {
          const a8 = v8.terrainHeight(x + dx, z + dz), a9 = nf.terrainHeight(x + dx, z + dz);
          if (dx === 1 && dz === 1) { ga = a8; gn = a9; }
          if (a8 - a9 < 4) ok = false;
        }
        if (ok) site = { x, z, ga, gn };
      }
    }
    if (!site) return { absent: false, raides, rayons, hRel, abaissees, pire, fautes, site: null };
    const t = W.DATE_FONDU_DOUX - 86400000;
    const doc = { local: {} };
    const L0 = doc.local;
    for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) for (let dy = 1; dy <= 3; dy++) L0[`${site.x + dx},${site.ga + dy},${site.z + dz}`] = [5, t];
    L0[`${site.x},${site.ga + 12},${site.z}`] = [7, W.DATE_FONDU_DOUX + 1000];       // après la date
    const hc = v8.terrainHeight(sal.ancre.x, sal.ancre.z);
    L0[`${sal.ancre.x},${hc + 1},${sal.ancre.z}`] = [6, t];                           // dans le disque
    L0['10,40,10'] = [6, t];                                                          // au point d'apparition
    const un = W.migrerBlocsFonduDoux(doc), deux = W.migrerBlocsFonduDoux(un.tout);
    const L = un.tout.local;
    const maison = Object.keys(L).filter((k) => L[k][0] === 5).map((k) => k.split(',').map(Number));
    const dy = nf.terrainHeight(site.x + 1, site.z + 1) - site.ga;
    const bas = maison.length ? Math.min(...maison.map((p) => p[1])) : null;
    const pos = W.migrerPositionsFonduDoux({ local: { x: site.x + 1.5, y: site.ga + 1, z: site.z + 1.5, t } }).pos.local;
    const chaine = W.migrerBlocsFonduDoux(W.migrerBlocsParisDouble(W.menagerBlocsCielParis(W.releverBlocsToitsParis(W.migrerBlocsCarte3(doc).tout).tout).tout).tout).tout.local;
    return {
      absent: false, raides, rayons, hRel, abaissees, pire, fautes, site,
      maison: maison.length === 27 && maison.every((p) => L[p.join(',')][1] === W.DATE_FONDU_DOUX) && bas === site.ga + 1 + dy,
      bas, dy,
      reste: !!L[`${site.x},${site.ga + 12},${site.z}`] && !!L[`${sal.ancre.x},${hc + 1},${sal.ancre.z}`] && !!L['10,40,10'],
      pos: Math.abs(pos.y - (site.ga + 1 + dy)) < 1e-9,
      idempotent: deux.deplaces === 0 && JSON.stringify(deux.tout) === JSON.stringify(un.tout),
      chaine: JSON.stringify(chaine) === JSON.stringify(L),
      bilan: `${un.deplaces} déplacé(s), ${un.laisses} laissé(s)`,
    };
  })();
  verifier('autour des villes engendrées, le pays descend à un bloc par bloc au plus — plus de fosse à gradins',
    fondu.raides < 65,
    `${fondu.raides} rayon(s) raide(s) sur ${fondu.rayons} (651 sur origin/main)`);
  verifier('le monde de la v308 est, au bloc près, celui de la production',
    !fondu.absent && fondu.hRel === EMPREINTE_V308_RELIEF,
    fondu.absent ? 'pas de fondu doux' : `relief ${fondu.hRel.slice(0, 12)}`);
  verifier('le fondu doux n\'a fait qu\'abaisser, et seulement dans la couronne des villes',
    !fondu.absent && fondu.fautes.length === 0 && fondu.abaissees > 0 && fondu.pire <= 24,
    fondu.absent ? 'pas de fondu doux' : `${fondu.abaissees} colonne(s) abaissée(s) sur l'échantillon, ${fondu.pire} bloc(s) au plus · ${JSON.stringify(fondu.fautes)}`);
  verifier('une maison posée dans la couronne de Salvador descend avec son sol, d\'un seul tenant — et rien d\'autre ne bouge',
    !fondu.absent && !!fondu.site && fondu.maison && fondu.reste && fondu.pos && fondu.idempotent && fondu.chaine,
    fondu.absent ? 'pas de fondu doux' : JSON.stringify({ ...fondu, fautes: undefined }));
  {
    const VMf = await import('../src/villesmonde.js');
    const portee = VMf.FONDU_PORTEE || 14;
    const pres = VILLES_MONDE.map((f) => ({ cle: f.cle, marge: Math.round(Math.min(...SANCTUAIRES_PLUS.map(([, x, z, r]) =>
      Math.hypot(f.ancre.x - x, f.ancre.z - z) - f.rayon - portee - r))) })).sort((p1, p2) => p1.marge - p2.marge);
    verifier('et le fondu doux n\'atteint rien de ce que les enfants ont bâti',
      pres[0].marge > 0, `la couronne la plus proche est celle de ${pres[0].cle}, à ${pres[0].marge} blocs`);
  }

  const trop = [];
  for (let x = -700; x <= 700; x += 7) {
    for (let z = -700; z <= 700; z += 7) {
      const h = w.terrainHeight(x, z);
      if (h > SOMMET_TERRAIN) trop.push([x, z, h]);
    }
  }
  verifier('et aucune montagne n\'a poussé dans le ciel neuf', trop.length === 0,
    JSON.stringify(trop.slice(0, 3)));

  // --- LE SOL CONTINU (v297) : le rendu, le contact et la couture lisent la ---
  // --- même triangulation, et le sol N'A PAS BOUGÉ pour autant --------------
  //
  // Les empreintes ci-dessus tiennent parce que `solcontinu.js` n'écrit aucun
  // bloc et ne touche pas `terrainHeight` : la surface passe par le sommet de
  // chaque colonne EN SON CENTRE, exactement là où l'enfant marchait. Ce qui
  // se vérifie ici, sous node, sans navigateur : que la surface existe hors
  // des villes, qu'elle tait le cube qu'elle remplace, qu'elle coud deux
  // morceaux à l'identique, que le contact et le maillage sont la même
  // triangulation, qu'un bloc posé rend sa colonne au voxel et qu'un bloc
  // retiré la rend à la surface, et qu'en ville rien ne change.
  {
    const { buildChunkTampons } = await import('../src/mesher.js');
    const { grilleSol } = await import('../src/solcontinu.js');
    const { CHUNK } = await import('../src/world.js');
    const mesurer = (x, z) => {
      const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
      const t = buildChunkTampons(w, cx, cz);
      const g = grilleSol(w, cx, cz, CHUNK);
      const couvertes = g.couvertes.reduce((a, b) => a + b, 0);
      let fautes = 0, sommetsSurface = 0;
      if (t.solid) {
        const P = t.solid.positions, Nn = t.solid.normals, I = t.solid.indices;
        for (let i = 0; i < P.length; i += 3) if (P[i] % 1 === 0.5) sommetsSurface++;
        for (let q = 0; q < I.length; q += 6) {
          const v = [I[q], I[q + 1], I[q + 2], I[q + 4]];
          if (!(Nn[v[0] * 3 + 1] === 1 && v.every((k) => P[k * 3] % 1 === 0 && P[k * 3 + 2] % 1 === 0))) continue;
          const xs = v.map((k) => P[k * 3]), zs = v.map((k) => P[k * 3 + 2]), y = P[v[0] * 3 + 1];
          for (let lz = Math.min(...zs); lz < Math.max(...zs); lz++) for (let lx = Math.min(...xs); lx < Math.max(...xs); lx++) {
            if (g.couvertes[lx + lz * CHUNK] && g.hauts[lx + lz * CHUNK] + 1 === y) fautes++;
          }
        }
      }
      const gE = grilleSol(w, cx + 1, cz, CHUNK);
      let ecarts = 0;
      for (let lz = 0; lz < CHUNK; lz++) if (g.cote[g.idx(CHUNK, lz)] !== gE.cote[gE.idx(0, lz)]) ecarts++;
      let centres = 0, exacts = 0, milieux = 0, moyennes = 0;
      for (let lz = 1; lz < CHUNK - 1; lz++) for (let lx = 1; lx < CHUNK - 1; lx++) {
        if (!g.couvertes[lx + lz * CHUNK]) continue;
        const X = cx * CHUNK + lx, Z = cz * CHUNK + lz;
        const sc = w.solContinu(X + 0.5, Z + 0.5); centres++;
        // La cote de RÉFÉRENCE est celle de la grille du mailleur, pas le relief
        // + 1 : sous une route (v300) la surface est au profil de la route, et
        // c'est bien « contact = maillage » que ce témoin garde, pas
        // « contact = relief ».
        if (sc !== null && Math.abs(sc - g.cote[g.idx(lx, lz)]) < 1e-6) exacts++;
        if (g.couvertes[lx + 1 + lz * CHUNK]) {
          const m = w.solContinu(X + 1, Z + 0.5); milieux++;
          if (m !== null && Math.abs(m - (g.cote[g.idx(lx, lz)] + g.cote[g.idx(lx + 1, lz)]) / 2) < 1e-6) moyennes++;
        }
      }
      return { cellules: t.cellulesSol, couvertes, sommetsSurface, fautes, ecarts, centres, exacts, milieux, moyennes };
    };
    const a1 = mesurer(-110, -330), colline = mesurer(400, -600);
    verifier('hors des villes, le sol naturel est une surface continue, et le cube qu\'elle remplace n\'est plus dessiné',
      a1.cellules > 200 && colline.cellules > 200 && a1.fautes === 0 && colline.fautes === 0,
      `campagne ${a1.cellules} cellules · ${a1.couvertes} colonnes couvertes · ${a1.fautes} face(s) voxel de trop — colline ${colline.cellules} · ${colline.couvertes} · ${colline.fautes}`);
    verifier('deux morceaux voisins cousent leurs cotes à l\'identique — par construction, et mesuré',
      a1.ecarts === 0 && colline.ecarts === 0, `${a1.ecarts} · ${colline.ecarts} écart(s) sur 16 colonnes de couture`);
    verifier('le contact lit la même triangulation que le maillage : exact au centre des colonnes, moyenne à mi-arête',
      a1.exacts === a1.centres && a1.moyennes === a1.milieux && colline.exacts === colline.centres && colline.moyennes === colline.milieux && a1.centres > 100,
      `campagne ${a1.exacts}/${a1.centres} centres, ${a1.moyennes}/${a1.milieux} mi-arêtes — colline ${colline.exacts}/${colline.centres}, ${colline.moyennes}/${colline.milieux}`);
    // un bloc posé rend sa colonne au voxel ; retiré, la cicatrice guérit —
    // sur une colonne d'herbe HORS de l'A1 (le via de la v300 a mis le
    // couloir sur l'ancienne, (−108, −328) : posé sur une chaussée, rien ne
    // change, et le témoin rougissait sur du code sain)
    let X = -60, Z = -328;
    while (X < 0 && (w.routeEn(X, Z) || w.solContinu(X + 0.5, Z + 0.5) === null)) X++;
    const h = w.terrainHeight(X, Z);
    const avant = w.solContinu(X + 0.5, Z + 0.5), couvAvant = w.blocSousLaSurface(X, h, Z);
    w.setBlock(X, h + 1, Z, 11);
    const apres = w.solContinu(X + 0.5, Z + 0.5), couvApres = w.blocSousLaSurface(X, h, Z);
    const cellulesApres = buildChunkTampons(w, Math.floor(X / CHUNK), Math.floor(Z / CHUNK)).cellulesSol;
    w.setBlock(X, h + 1, Z, 0);
    const retrait = w.solContinu(X + 0.5, Z + 0.5);
    const cellulesRetrait = buildChunkTampons(w, Math.floor(X / CHUNK), Math.floor(Z / CHUNK)).cellulesSol;
    verifier('un bloc posé sur l\'herbe rend sa colonne au voxel — et retiré, la cicatrice guérit',
      avant === h + 1 && couvAvant && apres === null && !couvApres && cellulesApres < a1.cellules && retrait === h + 1 && cellulesRetrait === a1.cellules,
      `surface ${avant} → posé ${apres} (${cellulesApres} cellules) → retiré ${retrait} (${cellulesRetrait})`);
    w.sansSolContinu = true;
    const voxel = buildChunkTampons(w, Math.floor(-110 / CHUNK), Math.floor(-330 / CHUNK));
    const voxelContact = w.solContinu(-109.5, -329.5);
    w.sansSolContinu = false;
    verifier('le voxel d\'avant se rejoue à la demande (?solcontinu=0), pour mesurer — pas une cellule, le voxel décide',
      voxel.cellulesSol === 0 && voxelContact === null, `${voxel.cellulesSol} cellule(s), contact ${voxelContact}`);
    const paris = buildChunkTampons(w, Math.floor(-240 / CHUNK), Math.floor(200 / CHUNK));
    verifier('et dans Paris, rien ne change : pas une cellule, le voxel décide (sa couche de sol HD)',
      paris.cellulesSol === 0 && w.solContinu(-239.5, 200.5) === null && !w.blocSousLaSurface(-240, w.terrainHeight(-240, 200), 200),
      `Paris ${paris.cellulesSol} cellule(s)`);
    // LE RACCORD VILLE/CAMPAGNE (v308). Au bord du disque d'une ville, la
    // chaussée voxel dominait d'un bloc la campagne lissée : un mur d'un bloc
    // pour sortir de la ville, sur un rayon sur trois. On mesure ce que
    // l'enfant rencontre en MARCHANT : la hauteur où l'on pose le pied (la
    // surface continue ou le dessus du cube que rien ne tait), tous les
    // dixièmes de bloc, de r − 4 à r + 3, sur toutes les villes. Un seuil
    // traversé par un bâtiment ou par l'eau n'est pas un seuil de sol, il ne
    // compte pas. Mesuré : 1 666 rayons à marche sur 5 011 avant (33 %), 695
    // après (14 %), à 48 rayons ; les marches de deux blocs (le fondu trop
    // raide, 129) ne bougent pas, et c'est déclaré. La barre est au milieu.
    {
      const { VILLES_MONDE } = await import('../src/villesmonde.js');
      const pied = (x, z) => {
        const bx = Math.floor(x), bz = Math.floor(z);
        const h = w.terrainHeight(bx, bz), s = w.sommetColonne(bx, bz);
        if (s - h >= 1 || s < 29) return null;
        const sc = w.solContinu(x, z);
        const cube = w.blocSousLaSurface(bx, s, bz) ? -Infinity : s + 1;
        return Math.max(sc === null ? -Infinity : sc, cube);
      };
      const villes = [...w.conf.villes.map((c) => ({ x: c.x, z: c.z, r: c.r })),
        ...VILLES_MONDE.map((f) => ({ x: f.ancre.x, z: f.ancre.z, r: f.rayon }))];
      let rayons = 0, marches = 0, murs = 0;
      for (const c of villes) for (let k = 0; k < 24; k++) {
        const a = 2 * Math.PI * (k + 0.37) / 24, ux = Math.cos(a), uz = Math.sin(a);
        let prev = null, pire = 0, trou = false;
        for (let d = c.r - 4; d <= c.r + 3; d += 0.1) {
          const y = pied(c.x + ux * d, c.z + uz * d);
          if (y === null) { trou = true; break; }
          if (prev !== null) pire = Math.max(pire, Math.abs(y - prev));
          prev = y;
        }
        if (trou) continue;
        rayons++;
        if (pire >= 0.5) marches++;
        if (pire >= 1.5) murs++;
      }
      verifier('on sort d\'une ville sans marche : au seuil du disque, la chaussée rejoint la campagne en pente',
        rayons > 1000 && marches / rayons < 0.23,
        `${marches} seuil(s) à marche sur ${rayons} (${(100 * marches / rayons).toFixed(1)} %), dont ${murs} de deux blocs ou plus`);
      // le seuil de Vilnius, relevé à la sonde : sur `origin/main` la
      // chaussée est un bloc au-dessus de l'herbe, et le contact rend `null`
      // en ville — le voxel décide, marche comprise
      const f = VILLES_MONDE.find((v) => (v.cle || v.nom) === 'vilnius');
      const a = 3.19, ux = Math.cos(a), uz = Math.sin(a);
      let nuls = 0, saut = 0, prev = null, pas = 0;
      // de r − 2 (le raccord : deux rangs de part et d'autre du ressaut ; en deçà
      // la rue est à plat et reste en voxel, à la même cote) à r + 4
      for (let d = f.rayon - 2; d <= f.rayon + 4; d += 0.1) {
        const sc = w.solContinu(f.ancre.x + ux * d, f.ancre.z + uz * d);
        pas++;
        if (sc === null) { nuls++; prev = null; continue; }
        if (prev !== null) saut = Math.max(saut, Math.abs(sc - prev));
        prev = sc;
      }
      verifier('au seuil de Vilnius, le pied passe de l\'herbe à la chaussée sur la surface continue',
        nuls === 0 && saut < 0.2, `${nuls} point(s) sans surface sur ${pas}, plus grand écart d'un dixième de bloc à l'autre ${saut.toFixed(2)}`);
      // et le raccord ne vaut QUE là où le relief change : une rue à plat
      // reste en voxel (son occlusion au pied des murs, ses marquages calés
      // sur le bloc). Le centre de Dallas est plat ; vert des deux côtés à
      // dessein, il garde la borne de la règle.
      const { SOL_VILLE } = await import('../src/solcontinu.js').catch(() => ({}));
      const dal = VILLES_MONDE.find((v) => (v.cle || v.nom) === 'dallas');
      let plats = 0, plateRaccordee = 0;
      for (let dz = -24; dz <= 24; dz++) for (let dx = -24; dx <= 24; dx++) {
        const x = Math.round(dal.ancre.x) + dx, z = Math.round(dal.ancre.z) + dz;
        const h = w.terrainHeight(x, z);
        let plat = true;
        for (let j = -2; j <= 2 && plat; j++) for (let i = -2; i <= 2; i++) if (w.terrainHeight(x + i, z + j) !== h) { plat = false; break; }
        if (!plat || (SOL_VILLE && !SOL_VILLE.has(w.getBlock(x, h, z)))) continue;
        plats++;
        if (w.ficheMemo(x, z).nat) plateRaccordee++;
      }
      verifier('une rue à plat reste en voxel : le raccord ne touche que le sol en pente',
        plats > 200 && plateRaccordee === 0, `${plateRaccordee} colonne(s) de rue à plat passée(s) à la surface sur ${plats}`);
    }
    // ce que la surface coûte au mailleur : médiane de neuf passages alternés
    const med = (a) => { const b = [...a].sort((p, q) => p - q); return b[b.length >> 1]; };
    const avec = [], sans = [];
    const cx = Math.floor(-110 / CHUNK), cz = Math.floor(-330 / CHUNK);
    for (let i = 0; i < 9; i++) {
      let t0 = performance.now(); buildChunkTampons(w, cx, cz); avec.push(performance.now() - t0);
      w.sansSolContinu = true; t0 = performance.now(); buildChunkTampons(w, cx, cz); sans.push(performance.now() - t0); w.sansSolContinu = false;
    }
    // mesuré seul : +1,2 ms par morceau de campagne (4,9 contre 3,7) ; la
    // borne de garde vaut trois fois la mesure, parce qu'un portail charge
    verifier('la surface coûte au plus quelques millisecondes par morceau de campagne',
      med(avec) - med(sans) < 4, `${med(avec).toFixed(1)} ms avec, ${med(sans).toFixed(1)} sans (médianes de neuf)`);
    // LE PAYSAGE LOINTAIN NE REFERME PAS LE DÉBLAI (v300). `horizon.js` lisait
    // le relief au-dessus de la route : une dalle de terre flottait sur la
    // tranchée tant que le morceau n'était pas maillé (captures du pont et de
    // la porte de Paris). La cote qu'il dessine se demande au monde, et sous
    // une route c'est le sommet de la chaussée ou du talus.
    {
      let R = null; try { R = await import('../src/routes.js'); } catch { /* pas de routes.js : le témoin le dit */ }
      if (!R || !w.coteHorizon) {
        verifier('le paysage lointain ne referme pas le déblai de l\'A1 : sa cote est celle de la route', false, !R ? 'pas de routes.js' : 'pas de coteHorizon');
        verifier('rien ne flotte au-dessus de l\'A1 : ni relief, ni nappe, ni repère posé après les colonnes', false, !R ? 'pas de routes.js' : 'pas de coteHorizon');
      } else {
        const seg = R.segmentsDeRoute()[0];
        let route = 0, deblai = 0, justes = 0, pire = 0, horsRoute = 0, horsJustes = 0;
        for (let s0 = 0; s0 < seg.longueur; s0 += 8) {
          const q = R.pointA(seg, s0);
          for (let d = -30; d <= 30; d += 2) {
            const x = Math.round(q.x + (-q.fz) * d), z = Math.round(q.z + q.fx * d);
            const r = R.routeEn(x, z), c = w.coteHorizon(x, z), h = w.terrainHeight(x, z);
            if (!r || r.ouvrage) { horsRoute++; if (c === h) horsJustes++; continue; }
            route++;
            const t = Math.floor(r.cote) - 1;
            if (h > t) { deblai++; pire = Math.max(pire, h - t); }
            if (c === t) justes++;
          }
        }
        verifier('le paysage lointain ne referme pas le déblai de l\'A1 : sa cote est celle de la route',
          route > 500 && deblai > 50 && justes === route && horsJustes === horsRoute,
          `${justes}/${route} colonnes de route à la cote du profil, dont ${deblai} en déblai (jusqu'à ${pire} blocs sous le relief) ; ${horsJustes}/${horsRoute} hors route au relief`);
        // RIEN NE FLOTTE AU-DESSUS DE LA ROUTE. Trois choses y flottaient, et
        // aucune ne se voyait en relisant : la couche d'herbe d'un relief à
        // sept blocs (le déblai ne dégageait que six), la nappe d'un lac sur
        // un talus creusé sous elle, et le chalet du Pôle Nord — un repère
        // posé APRÈS les colonnes, que le premier via traversait. La première
        // sonde rendait zéro sur les trois : elle lisait `HEIGHT` d'un module
        // qui ne l'exporte pas, et sa boucle ne tournait jamais.
        const t0 = performance.now();
        let colonnes = 0, fautes = 0, exemple = null;
        for (let s0 = 0; s0 < seg.longueur; s0 += 4) {
          const q = R.pointA(seg, s0);
          for (let d = -30; d <= 30; d++) {
            const x = Math.round(q.x + (-q.fz) * d), z = Math.round(q.z + q.fx * d);
            const r = R.routeEn(x, z); if (!r || r.ouvrage) continue;
            colonnes++;
            const t = Math.floor(r.cote) - 1; let faute = null;
            for (let y = t + 1; y < HEIGHT; y++) {
              const b = w.getBlock(x, y, z);
              if (b === 0 || b === 6) continue;                       // l'air, et la couronne d'un arbre voisin
              if (b === 7 && y <= 30 && r.piece === 'talus') continue; // un talus sous un lac
              faute = `${b} à y=${y}`; break;
            }
            if (faute) { fautes++; if (!exemple) exemple = `s ${s0}, ${r.piece} (${x}, ${z}), sommet ${t}, relief ${w.terrainHeight(x, z)} : bloc ${faute}`; }
          }
        }
        verifier('rien ne flotte au-dessus de l\'A1 : ni relief, ni nappe, ni repère posé après les colonnes',
          colonnes > 2000 && fautes === 0,
          `${fautes} colonne(s) en faute sur ${colonnes}${exemple ? ` — ${exemple}` : ''} (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
      }
    }

    // LE RAIL CONTINU (v302, livraison 4 du programme « monde fidèle »). Les
    // quatre lecteurs de la voie — le ballast que le générateur écrit, les
    // rails que le mailleur émet, la gare, le convoi — lisent la MÊME cote
    // flottante (`coteContinue`). Sur l'ancien code : le train montait par
    // marches d'UN BLOC (la cote arrondie plus 2,05), les rails étaient des
    // blocs d'obsidienne, et le sol continu passait au relief AU-DESSUS des
    // tranchées : la surface refermait le déblai d'une dalle d'herbe, le
    // train roulait dessous. LES TROIS TÉMOINS MESURENT LE MÊME DÉFAUT DES
    // DEUX CÔTÉS, jamais l'absence d'un export : sur `origin/main` ils
    // rendent marche 2,0 · 1 441 blocs d'obsidienne · 53 colonnes de surface
    // justes sur 274.
    {
      let T = null; try { T = await import('../src/trains.js'); } catch { /* le témoin le dit */ }
      const { BLOCK } = await import('../src/blocks.js');
      const t0 = performance.now();
      const seg = T.segmentsDeTrain().find((q) => q.de === 'paris' && q.vers === 'lyon');
      const L = seg.longueur, ux = (seg.x1 - seg.x0) / L, uz = (seg.z1 - seg.z0) / L, nx = -uz, nz = ux;
      const continu = !!(T.coteContinue && T.rubansVoieDans && T.PAS_TRACE && T.PENTE_VOIE);
      // 1. le convoi : chaque pas de l'aller à `cote + RAIL_HAUT + ROUES`,
      //    et d'un pas au suivant, au plus la pente du profil (1/3 × 4 blocs)
      const tr = T.traceSegment(seg, (x, z) => w.terrainHeight(x, z), 30);
      const aller = tr.pts.slice(0, tr.arretsIndex[1] + 1);
      let marche = 0, ecart = 0;
      for (let i = 0; i < aller.length; i++) {
        const q = aller[i];
        if (i) marche = Math.max(marche, Math.abs(q.y - aller[i - 1].y));
        const t = ((q.x - seg.x0) * ux + (q.z - seg.z0) * uz) / L;
        if (continu) ecart = Math.max(ecart, Math.abs(q.y - (T.coteContinue(seg, t) + T.RAIL_HAUT + T.ROUES)));
      }
      verifier('le train roule sur le dessus de ses rails, sans une marche : la cote est continue',
        continu && aller.length > 100 && marche <= T.PAS_TRACE * T.PENTE_VOIE + 0.02 && ecart < 1e-6,
        `${aller.length} pas · marche max ${marche.toFixed(3)} bloc · ${continu ? `écart au rail ${ecart.toFixed(4)}` : 'pas de cote continue (code d\'avant la v302)'}`);
      // 2. sur quatre cents blocs de ligne : les blocs de la plate-forme, les
      //    rubans du mailleur (quatre files par pas), et la surface à la cote
      let obs = 0, planches = 0, colonnes = 0, surface = 0, ecartSurf = 0, tranchee = 0, tranchJuste = 0, sansRail = 0, pas = 0, talus = 0, falaise = 0;
      // UNE FALAISE RESTE UNE FALAISE (v297) : au bord d'une paroi naturelle
      // (le relief saute de huit blocs ou plus autour de la colonne — la rive
      // d'un lac), le talus descend d'un côté et monte de l'autre, la cellule
      // dépasse un bloc d'écart et le voxel reprend la main, à bon droit. La
      // ligne Paris–Lyon a bougé avec Paris doublé (v306) et sa fenêtre de
      // mesure longe désormais un lac : ces colonnes se comptent à part, et le
      // message le dit.
      const auBordDUneFalaise = (x, z) => {
        let bas = Infinity, haut = -Infinity;
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
          const t = w.terrainHeight(x + dx, z + dz); if (t < bas) bas = t; if (t > haut) haut = t;
        }
        return haut - bas >= 8;
      };
      for (let k = 300; k < 700; k++) {
        const ax = seg.x0 + ux * k, az = seg.z0 + uz * k;
        pas++;
        if (continu) {
          const rb = T.rubansVoieDans(Math.floor(ax), Math.floor(az), Math.floor(ax) + 1, Math.floor(az) + 1)
            .filter((r) => r.s === k && r.tuile === 'rail');
          if (rb.length !== 4) sansRail++;
        } else sansRail++;
        for (let o = -20; o <= 20; o++) {
          const x = Math.round(ax + nx * o), z = Math.round(az + nz * o);
          const v = T.voieEn(x, z);
          if (!v) continue;
          // l'ancien `voieEn` rendait le BLOC de ballast : la surface où l'on
          // marche est un bloc plus haut
          const bloc = v.bloc !== undefined ? v.bloc : v.cote;
          const cote = v.bloc !== undefined ? v.cote : v.cote + 1;
          colonnes++; if (v.piece === 'talus') talus++;
          for (let dy = -1; dy <= 2; dy++) {
            const id = w.getBlock(x, bloc + dy, z);
            if (id === BLOCK.OBSIDIAN) obs++;
            if (id === BLOCK.DARKPLANK) planches++;
          }
          const sc = w.solContinu(x + 0.5, z + 0.5);
          if (sc !== null) { surface++; ecartSurf = Math.max(ecartSurf, Math.abs(sc - cote)); }
          if (v.piece !== 'talus' && Math.abs(cote - (w.terrainHeight(x, z) + 1)) >= 2) {
            if (auBordDUneFalaise(x, z)) { falaise++; continue; }
            tranchee++; if (sc !== null && Math.abs(sc - cote) < 1e-6) tranchJuste++;
          }
        }
      }
      verifier('les rails sont des prismes continus, plus un bloc d\'obsidienne ni de planche sur la voie',
        continu && pas === 400 && sansRail === 0 && obs === 0 && planches === 0,
        `${pas} pas, ${sansRail} sans ses quatre files de prismes · ${obs} obsidienne, ${planches} planche(s) sur ${colonnes} colonnes`);
      verifier('le sol continu suit le profil de la voie, dans la tranchée comme sur le remblai',
        continu && colonnes > 3000 && talus > 200 && surface >= colonnes * 0.85 && ecartSurf < 1e-6 && tranchee > 200 && tranchJuste === tranchee,
        `${surface} colonnes de surface sur ${colonnes} (${talus} de talus), écart max à la cote ${ecartSurf.toFixed(4)} · en tranchée ou remblai de deux blocs et plus : ${tranchJuste}/${tranchee}, et ${falaise} au bord d'une falaise (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
    }
  }

  // --- ce qui se vérifie en jouant ------------------------------------------
  const banc = new Banc({ portJeu: 8327, portPairs: 9327 });
  await banc.ouvrir();
  try {
    const tab = await banc.joueur('Marlon');
    const contexte = await tab.evaluate(() => window.__game.world.ctx);

    // LES VILLES SE RECONNAISSENT AU LOIN (v331). Au-delà des morceaux
    // maillés, `horizon.js` ne dessinait que le relief : Paris, Londres, New
    // York et les villes engendrées étaient de la prairie vue d'avion. On
    // construit un paysage lointain à la portée de l'iPad (rr=12, 632 blocs)
    // au-dessus de quatre villes, sur le VRAI monde de la page (TerreUrbaine,
    // qui connaît la forme de Manhattan), et l'on lit ses attributs : la
    // couleur des sommets sous la ville, et les pavés de bâti instanciés. Rien
    // n'est maillé dans cet essai (`estDessine` rend faux), sauf pour le
    // dernier verdict, qui vérifie que le bâti lointain se retire devant le
    // vrai monde.
    {
      const r = await tab.evaluate(async () => {
        const { Horizon } = await import('./src/horizon.js');
        const VM = await import('./src/villesmonde.js');
        const w = window.__game.world;
        const rome = VM.VILLES_MONDE.find((f) => f.cle === 'rome');
        const villes = w.conf.villes;
        const ou = {
          paris: villes.find((c) => c.key === 'paris'),
          londres: villes.find((c) => c.key === 'londres'),
          ny: { x: -20045, z: 5030, r: 152 },
          rome: { x: rome.ancre.x, z: rome.ancre.z, r: rome.rayon },
        };
        const out = {};
        for (const [nom, c] of Object.entries(ou)) {
          const h = new Horizon(w, 632);
          while (h.maj(c.x, c.z, 1e9) > 0 && h.etat().manquantes > 0) { /* tout remplir */ }
          // vers le centre de la ville : le joueur est dessus, il regarde au nord
          h.majDecoupe(() => false, c.x, c.z, 0, -1);
          const N = h.N, col = h.geo.attributes.color.array, pos = h.geo.attributes.position.array;
          let sous = 0, vertes = 0, eau = 0;
          for (let i = 0; i < N * N; i++) {
            const x = pos[i * 3], z = pos[i * 3 + 2];
            const dx = x - c.x, dz = z - c.z;
            if (dx * dx + dz * dz > (c.r * 0.8) ** 2) continue;
            if (!w.cityAt(x, z) && !VM.dansVilleMonde(x, z)) continue;
            if (pos[i * 3 + 1] < 30.5) { eau++; continue; }
            sous++;
            const R = col[i * 3], G = col[i * 3 + 1], B = col[i * 3 + 2];
            if (G > R * 1.15 && G > B * 1.15) vertes++;   // l'herbe : le vert domine
          }
          // les pavés de bâti : combien, et combien dans la ville
          const bat = h.mesh.children.find((o) => o.isInstancedMesh);
          let n = 0, dedans = 0, hors = 0, hmax = 0;
          if (bat) {
            const m = bat.instanceMatrix.array;
            n = bat.count;
            for (let k = 0; k < n; k++) {
              const x = m[k * 16 + 12] + 3, z = m[k * 16 + 14] + 3;
              hmax = Math.max(hmax, m[k * 16 + 5]);
              if (w.cityAt(x, z) || VM.dansVilleMonde(x, z) || w.cityAt(x - 4, z - 4) || VM.dansVilleMonde(x - 4, z - 4)) dedans++; else hors++;
            }
          }
          // et devant le vrai monde il se retire : tous les morceaux « maillés »
          h.majDecoupe(() => true, c.x, c.z, 0, -1);
          const retires = bat ? bat.count : -1;
          out[nom] = { sous, vertes, eau, n, dedans, hors, hmax: Math.round(hmax), retires };
          h.geo.dispose();
        }
        return out;
      });
      const txt = (o) => Object.entries(o).map(([k, v]) => `${k} ${v.sous - v.vertes}/${v.sous} sommets urbains (${v.eau} d'eau), ${v.n} pavés dont ${v.dedans} en ville, ${v.hors} hors, jusqu'à ${v.hmax} blocs`).join(' ; ');
      verifier('vu de loin, le sol d\'une ville n\'est pas de la prairie (Paris, Londres, New York, Rome)',
        Object.values(r).every((v) => v.sous > 100 && v.vertes / v.sous < 0.1), txt(r));
      verifier('vu de loin, une ville a des immeubles : un pavé instancié par îlot, dans la ville et nulle part ailleurs',
        Object.values(r).every((v) => v.n > 50 && v.hors === 0 && v.hmax >= 9), txt(r));
      verifier('le bâti lointain se retire devant le vrai monde maillé',
        Object.values(r).every((v) => v.retires === 0), Object.entries(r).map(([k, v]) => `${k} ${v.retires}`).join(', '));
    }

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
    await corpsCharges(tab);
    await corpsCharges(tab);
    await corpsCharges(tab);
    await corpsCharges(tab);
    await corpsCharges(tab);
    await corpsCharges(tab);
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

    await corpsCharges(tab);
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

    // --- LE SOL CONTINU SOUS LES PIEDS (v297) --------------------------------
    //
    // Un enfant à pied ne saute pas tout seul : devant une marche d'un bloc
    // il s'arrête, et c'était la campagne entière — 98 marches sur 810
    // colonnes entre Paris et Lille. Sur la même page, le même départ (une
    // pente de huit marches d'un bloc sur quarante, relevée sur l'axe
    // Paris–Lille) et le même cap : le voxel d'avant (`sansSolContinu`, la
    // physique seule) puis la surface. On attend le RÉSULTAT, borné (v270) :
    // vingt blocs parcourus ou soixante images bloquées, et la durée entre
    // dans le message.
    // LA PENTE SE CHERCHE (v285, v306). Elle était écrite en (−165, −85),
    // « relevée sur l'axe Paris–Lille » : c'était le bord du disque aplani de
    // l'ancien Roissy, et Roissy parti au nord-ouest avec Paris doublé, ce sol
    // a retrouvé son relief naturel — un autre terrain, et un témoin qui
    // écrirait encore son terrain mesurerait autre chose que ce qu'il annonce.
    // On cherche donc, sur le cap du témoin, quarante blocs de surface continue
    // dont le profil porte au moins huit marches d'un bloc et aucune de deux.
    const pente = await tab.evaluate(() => {
      const g = window.__game, w = g.world;
      const yaw = -0.256, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      for (let X = -600; X <= 600; X += 11) for (let Z = -600; Z <= 600; Z += 11) {
        if (w.cityAt(X, Z)) continue;
        let marches = 0, ok = true, prec = null;
        for (let k = 0; k <= 40 && ok; k++) {
          const x = Math.floor(X + 0.5 + fx * k), z = Math.floor(Z + 0.5 + fz * k);
          const h = w.terrainHeight(x, z);
          if (h <= 31 || w.solContinu(x + 0.5, z + 0.5) === null) ok = false;
          for (let dy = 1; dy <= 3 && ok; dy++) if (w.getBlock(x, h + dy, z) !== 0) ok = false;
          // des marches qui MONTENT : en descendant, le voxel n'arrête personne
          if (prec !== null) { const d = h - prec; if (d > 1 || d < 0) ok = false; if (d === 1) marches++; }
          prec = h;
        }
        if (ok && marches >= 8) return { X, Z, marches };
      }
      return null;
    });
    verifier('on trouve une pente de huit marches d\'un bloc pour éprouver le sol continu', !!pente, JSON.stringify(pente));
    const marcher = async (sans) => tab.evaluate(async ({ sans, pente }) => {
      const g = window.__game, p = g.player;
      const X = pente ? pente.X : -165, Z = pente ? pente.Z : -85;
      g.world.sansSolContinu = sans;
      p.flying = false; p.pos.set(X + 0.5, g.world.terrainHeight(X, Z) + 2, Z + 0.5); p.vel.set(0, 0, 0);
      p.yaw = -0.256; p.pitch = 0;
      for (const a of [...g.animalManager.animals]) if (a.def.key !== 'poisson') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
      await new Promise((r) => setTimeout(r, 3000));
      const out = { images: 0, bloque: 0, sous: 0, flotte: 0, marches: 0, blocs: 0, ms: 0 };
      let xa = p.pos.x, za = p.pos.z, ya = p.pos.y, sola = p.onGround;
      const x0 = p.pos.x, z0 = p.pos.z, t0 = performance.now();
      p.touchMove.f = 1;
      await new Promise((fin) => {
        const tour = () => {
          out.images++;
          const sc = g.world.solContinu(p.pos.x, p.pos.z);
          if (sc !== null) {
            if (p.pos.y - sc < -0.01) out.sous++;
            if (p.onGround && p.pos.y - sc > 0.05) out.flotte++;
          }
          const dh = Math.hypot(p.pos.x - xa, p.pos.z - za), dy = Math.abs(p.pos.y - ya);
          if (sola && p.onGround) { if (dh < 0.01) out.bloque++; if (dy > 0.3 && dy > dh) out.marches++; }
          xa = p.pos.x; za = p.pos.z; ya = p.pos.y; sola = p.onGround;
          out.blocs = Math.hypot(p.pos.x - x0, p.pos.z - z0);
          out.ms = Math.round(performance.now() - t0);
          if (out.blocs >= 20 || out.bloque >= 60 || out.ms > 60000) fin(); else requestAnimationFrame(tour);
        };
        requestAnimationFrame(tour);
      });
      p.touchMove.f = 0; g.world.sansSolContinu = false;
      out.blocs = +out.blocs.toFixed(1);
      return out;
    }, { sans, pente });
    const voxelMarche = await marcher(true);
    const surfaceMarche = await marcher(false);
    verifier('sur une pente de huit marches, le voxel d\'avant arrête l\'enfant au premier bloc — la surface le laisse marcher',
      voxelMarche.bloque >= 60 && surfaceMarche.blocs >= 20 && surfaceMarche.bloque < surfaceMarche.images / 10 && voxelMarche.blocs < surfaceMarche.blocs,
      `voxel ${voxelMarche.blocs} bloc(s), ${voxelMarche.bloque} image(s) bloquée(s) en ${voxelMarche.ms} ms — surface ${surfaceMarche.blocs} bloc(s), ${surfaceMarche.bloque} bloquée(s) en ${surfaceMarche.ms} ms`);
    verifier('et sur la surface, les pieds ne passent jamais dessous ni ne flottent, sans une marche',
      surfaceMarche.sous === 0 && surfaceMarche.flotte === 0 && surfaceMarche.marches === 0,
      `${surfaceMarche.sous} image(s) sous la surface, ${surfaceMarche.flotte} flottante(s), ${surfaceMarche.marches} marche(s) sur ${surfaceMarche.images} images`);
    // une bête lit la même surface que l'enfant
    const bete = await tab.evaluate(async (pente) => {
      const g = window.__game;
      // sur la pente trouvée, dix blocs plus loin sur son cap
      const X = pente ? Math.round(pente.X + 0.5 - Math.sin(-0.256) * 10) : -160, Z = pente ? Math.round(pente.Z + 0.5 - Math.cos(-0.256) * 10) : -100;
      // la clé d'une espèce n'est pas son nom français (v285) : `cow`, pas « vache »
      const a = g.animalManager.invoquer('cow', X + 0.3, Z + 0.7);
      if (!a) return { echec: 'pas de vache (clé cow inconnue)' };
      await new Promise((r) => setTimeout(r, 2500));
      const sc = g.world.solContinu(a.pos.x, a.pos.z);
      return { y: +a.pos.y.toFixed(2), surface: sc === null ? null : +sc.toFixed(2), ecart: sc === null ? null : +(a.pos.y - sc).toFixed(2) };
    }, pente);
    verifier('une bête posée sur la pente se tient sur la même surface que l\'enfant',
      bete.surface !== null && bete.ecart !== null && bete.ecart >= -0.01 && bete.ecart < 0.3, JSON.stringify(bete));
    // ce que la page dessine : des cellules de surface (sommets à x + 0,5)
    const dessin = await tab.evaluate(() => {
      const g = window.__game; let surface = 0, total = 0;
      for (const e of g.chunkMeshes.values()) {
        if (!e.solid) continue;
        const pos = e.solid.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) if (pos[i] % 1 === 0.5) surface++;
        total += pos.length / 3;
      }
      return { surface, total, morceaux: g.chunkMeshes.size };
    });
    verifier('et le maillage reçu du worker porte la surface', dessin.surface > 1000, JSON.stringify(dessin));

    // --- AU VOLANT SUR L'A1 (v300) --------------------------------------------
    //
    // Le couloir Paris–Lille : on se pose sur la chaussée de droite à
    // l'abscisse `s0`, cap le long de l'axe, dans une voiture invoquée pour
    // cela (les bêtes retirées d'abord — l'idiome de la v284), et l'on roule
    // jusqu'au RÉSULTAT, borné : tant de blocs, ou soixante images bloquées,
    // ou une minute. Chaque image compare la hauteur de la voiture à la cote
    // du PROFIL sous elle — c'est ce qui distingue « je roule sur la route »
    // de « je roule sur les blocs qui la portent ». Le second départ est posé
    // devant le premier pont : on doit le franchir SUR son tablier.
    const rouler = (s0, blocsVoulus) => tab.evaluate(async ({ s0, blocsVoulus }) => {
      const g = window.__game, p = g.player;
      let R; try { R = await import('./src/routes.js'); } catch { return { echec: 'pas de routes.js' }; }
      const seg = R.segmentsDeRoute()[0];
      const q = R.pointA(seg, s0), L = R.largeurA(seg, s0);
      const o = L.terrePlein + L.demiChaussee / 2;
      const X = q.x + (-q.fz) * o, Z = q.z + q.fx * o;
      const yaw = Math.atan2(-q.fx, -q.fz);
      g.world.sansSolContinu = false;
      p.flying = false; p.pos.set(X, R.coteA(seg, s0) + 1.5, Z); p.vel.set(0, 0, 0); p.yaw = yaw; p.pitch = 0;
      for (const a of [...g.animalManager.animals]) if (a.def.key !== 'poisson') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      await dodo(3000);
      g.animalManager.invoquer('voiture', X - Math.sin(yaw) * 3, Z - Math.cos(yaw) * 3);
      await dodo(1500);
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      for (let e = 0; e < 6 && !auVolant(); e++) { const b = document.getElementById('ride-btn'); if (b) b.click(); await dodo(1000); }
      if (!auVolant()) return { echec: 'pas monté' };
      const out = { images: 0, bloque: 0, marches: 0, chutes: 0, surTablier: 0, horsTablier: 0, ecartMax: 0, blocs: 0, ms: 0 };
      let xa = p.pos.x, za = p.pos.z, ya = p.pos.y;
      const x0 = p.pos.x, z0 = p.pos.z, t0 = performance.now();
      p.touchMove.f = 1;
      await new Promise((fin) => {
        const tour = () => {
          out.images++;
          const r = R.routeEn(Math.round(p.pos.x), Math.round(p.pos.z));
          if (r) {
            const ecart = p.pos.y - r.cote;
            if (r.ouvrage) { out.surTablier++; if (ecart < -0.3) out.horsTablier++; }
            else if (ecart < -0.5) out.chutes++;
            out.ecartMax = Math.max(out.ecartMax, Math.abs(ecart));
          }
          const dh = Math.hypot(p.pos.x - xa, p.pos.z - za), dy = Math.abs(p.pos.y - ya);
          if (dh < 0.01) out.bloque++;
          if (dy > 0.3 && dy > dh) out.marches++;
          xa = p.pos.x; za = p.pos.z; ya = p.pos.y;
          out.blocs = Math.hypot(p.pos.x - x0, p.pos.z - z0);
          out.ms = Math.round(performance.now() - t0);
          // Borné à deux minutes, la durée dans le message : près du pont la
          // page rend 0,75 s par image au banc (81 images en 60 s), et la
          // borne d'une minute coupait la voiture à 31,6 blocs sur 36.
          if (out.blocs >= blocsVoulus || out.bloque >= 60 || out.ms > 120000) fin(); else requestAnimationFrame(tour);
        };
        requestAnimationFrame(tour);
      });
      p.touchMove.f = 0;
      out.blocs = +out.blocs.toFixed(1); out.ecartMax = +out.ecartMax.toFixed(2);
      out.x = +p.pos.x.toFixed(1); out.z = +p.pos.z.toFixed(1);
      out.sFin = +R.projeter(seg, p.pos.x, p.pos.z).s.toFixed(1);
      return out;
    }, { s0, blocsVoulus });
    // Quatre-vingts blocs de CHAUSSÉE, sans pont : de l'abscisse 120 sur l'A1
    // d'avant, de 220 sur celle de Paris doublé (v306), dont le premier pont est
    // à 185 — le franchissement se mesure à part, juste en dessous.
    let s0A1 = 120;
    try {
      const pr = await tab.evaluate(async () => { const R = await import('./src/routes.js'); const p = R.profilDe(R.segmentsDeRoute()[0]); return p.spans.map((sp) => [sp.s0, sp.s1]); });
      if (pr.some(([a, b]) => b >= 110 && a <= 210)) s0A1 = 220;
    } catch { /* ancien code sans routes.js */ }
    const a1 = await rouler(s0A1, 80);
    verifier('au volant sur l\'A1, quatre-vingts blocs à la cote du profil, sans une marche ni une chute',
      !a1.echec && a1.blocs >= 72 && a1.marches === 0 && a1.chutes === 0 && a1.bloque < a1.images / 10 && a1.ecartMax < 0.6,
      JSON.stringify(a1));
    const pont = await tab.evaluate(async () => {
      let R; try { R = await import('./src/routes.js'); } catch { return { echec: 'pas de routes.js' }; }
      const seg = R.segmentsDeRoute()[0], p = R.profilDe(seg);
      return p.spans.length ? { s0: Math.round(p.spans[0].s0), s1: Math.round(p.spans[0].s1) } : null;
    });
    const dessus = pont ? await rouler(pont.s0 - 12, (pont.s1 - pont.s0) + 24) : { echec: 'aucun pont sur la route' };
    verifier('le premier pont se franchit sur son tablier, d\'un bout à l\'autre',
      // « d'un bout à l'autre » se lit à l'ABSCISSE d'arrivée, pas à une distance
      // parcourue : la voiture part douze blocs avant le pont et doit finir
      // au-delà de son autre bout.
      !dessus.echec && dessus.surTablier >= 3 && dessus.horsTablier === 0 && dessus.chutes === 0 && dessus.sFin >= (pont ? pont.s1 + 4 : 1e9),
      JSON.stringify({ pont, ...dessus }));
    // et dessous : posé sur le sol sous le tablier, on y reste — deux parcours
    const dessous = await tab.evaluate(async ({ pont }) => {
      const g = window.__game, p = g.player;
      let R; try { R = await import('./src/routes.js'); } catch { return { echec: 'pas de routes.js' }; }
      const seg = R.segmentsDeRoute()[0];
      if (!pont) return { echec: 'aucun pont' };
      // descendre de la voiture
      for (let e = 0; e < 4 && g.fun.montureConduite && g.fun.montureConduite(); e++) { const b = document.getElementById('ride-btn'); if (b) b.click(); await new Promise((r) => setTimeout(r, 800)); }
      const s = (pont.s0 + pont.s1) / 2, q = R.pointA(seg, s);
      const x = Math.round(q.x), z = Math.round(q.z);
      const tablier = g.world.tablierEn(x + 0.5, z + 0.5), sol = g.world.terrainHeight(x, z) + 1;
      p.flying = false; p.pos.set(x + 0.5, sol + 0.5, z + 0.5); p.vel.set(0, 0, 0);
      await new Promise((r) => setTimeout(r, 2500));
      return { tablier: tablier === null ? null : +tablier.toFixed(2), sol, y: +p.pos.y.toFixed(2) };
    }, { pont });
    verifier('et sous le tablier, on reste en bas : deux parcours, jamais téléporté dessus',
      !dessous.echec && dessous.tablier !== null && dessous.tablier - dessous.sol >= 3 && dessous.y < dessous.tablier - 1,
      JSON.stringify(dessous));

    // --- LE JOINT DU PONT (v302) ---------------------------------------------
    //
    // Max, capture d'iPad : « trou dans l'autoroute ». La route est oblique
    // sur la grille : la dernière colonne de chaussée finit en escalier, le
    // tablier (un ruban) commence à un pas d'abscisse droit, et entre les deux
    // restaient des triangles ouverts sur la rivière. On échantillonne la
    // chaussée de part et d'autre de chaque bout de pont, tous les dixièmes de
    // bloc : chaque point doit avoir sous lui soit le cube de sa colonne, soit
    // un ruban de tablier. Mesuré sous node : 464 points sur 6 500 sans rien
    // dessous sur `origin/main`, zéro ici.
    const joint = await tab.evaluate(async () => {
      const g = window.__game;
      let R; try { R = await import('./src/routes.js'); } catch { return { echec: 'pas de routes.js' }; }
      // TOUTES LES ROUTES (v313), et dans la largeur RÉELLE de la section :
      // un pont de la BR-116 tombe dans le raccord où la chaussée se resserre
      // en avenue, et une fenêtre fixe de ±8 blocs y comptait comme « trous »
      // des points hors de la route (397, tous au-delà de l'accotement).
      let total = 0, trous = 0, ponts = 0; const ex = [];
      for (const seg of R.segmentsDeRoute()) {
        const pr = R.profilDe(seg);
        if (!pr.spans.length) continue;
        ponts += pr.spans.length;
        const rub = [];
        for (const sp of pr.spans) {
          const a = R.pointA(seg, sp.s0 - 4), b = R.pointA(seg, sp.s1 + 4);
          rub.push(...g.world.rubansDans(Math.min(a.x, b.x) - 20, Math.min(a.z, b.z) - 20, Math.max(a.x, b.x) + 20, Math.max(a.z, b.z) + 20)
            .filter((q) => q.genre === 'tablier'));
        }
        const sur = (x, z) => rub.some((q) => {
          const L = Math.hypot(q.bx - q.ax, q.bz - q.az);
          const t = (x - q.ax) * q.fx + (z - q.az) * q.fz, o = (x - q.ax) * -q.fz + (z - q.az) * q.fx;
          return t >= -1e-6 && t <= L + 1e-6 && o >= Math.min(q.o0, q.o1) - 1e-6 && o <= Math.max(q.o0, q.o1) + 1e-6;
        });
        for (const sp of pr.spans) for (const bout of [sp.s0, sp.s1]) {
          for (let s = bout - 2.5; s <= bout + 2.5; s += 0.1) for (let d = -8; d <= 8; d += 0.25) {
            if (R.largeurA && Math.abs(d) > R.largeurA(seg, s).demiEmprise - 0.5) continue;
            const a = R.pointA(seg, s), x = a.x - a.fz * d, z = a.z + a.fx * d;
            const X = Math.floor(x), Z = Math.floor(z), c = R.routeEn(X + 0.5, Z + 0.5);
            const cube = c && !c.ouvrage && g.world.isSolid(X, Math.floor(c.cote) - 1, Z);
            total++;
            if (!cube && !sur(x, z)) { trous++; if (ex.length < 4) ex.push([+x.toFixed(1), +z.toFixed(1)]); }
          }
        }
      }
      if (!ponts) return { echec: 'aucun pont' };
      return { total, trous, ex, ponts };
    });
    verifier('la chaussée ne s\'ouvre pas au joint du pont : un cube ou le tablier sous chaque point',
      !joint.echec && joint.total > 1000 && joint.trous === 0, JSON.stringify(joint));

    verifier('aucune erreur JavaScript de bout en bout', tab.erreurs.length === 0,
      JSON.stringify(tab.erreurs));

    // Deux pages de plus, courtes. `?solcontinu=0` doit rendre le voxel d'avant
    // jusque dans le worker (le drapeau voyage avec le journal des blocs) ;
    // et le palier BAS a la MÊME surface — le cahier de Max refuse un sol qui
    // change de forme avec la qualité, et la hauteur des pieds de l'enfant ne
    // doit pas dépendre de sa tablette.
    const compterSurface = (page) => page.evaluate(() => {
      const g = window.__game; let surface = 0;
      for (const e of g.chunkMeshes.values()) {
        if (!e.solid) continue;
        const pos = e.solid.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) if (pos[i] % 1 === 0.5) surface++;
      }
      return { surface, morceaux: g.chunkMeshes.size, sans: !!g.world.sansSolContinu };
    });
    await tab.close();
    const voxelPage = await banc.jouerSeul('Solb', { rr: 2, params: '&solcontinu=0' });
    await dormir(4000);
    const voxelDessin = await compterSurface(voxelPage);
    verifier('avec ?solcontinu=0, le worker maille le voxel d\'avant — pas un sommet de surface', voxelDessin.sans && voxelDessin.surface === 0, JSON.stringify(voxelDessin));
    await voxelPage.close();
    const basPage = await banc.jouerSeul('Solc', { rr: 2, params: '&palier=bas' });
    await dormir(4000);
    const basDessin = await compterSurface(basPage);
    verifier('et le palier bas a le même sol continu que les autres', !basDessin.sans && basDessin.surface > 0, JSON.stringify(basDessin));
    await basPage.close();
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ le ciel a doublé, le sol n\'a pas bougé d\'un bloc');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
