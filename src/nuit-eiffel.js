// LA NUIT DE LA TOUR EIFFEL (v575) — le phare et le scintillement.
//
// La vraie tour a trois nuits l'une sur l'autre : l'or des projecteurs à
// sodium (la lueur du fer, `paris-monuments-hd.js`), le phare du sommet, qui
// balaie Paris de ses faisceaux, et le scintillement, vingt mille ampoules
// blanches qui crépitent quelques minutes au début de chaque heure.
//
// TROIS RÈGLES, toutes déjà payées ailleurs :
// - AUCUNE LAMPE (v248). Quatre lumières ponctuelles pour tout le jeu ; une
//   cinquième changerait la clé de tous les programmes. Ce qui brille ici est
//   ÉMISSIF.
// - AUCUN PROGRAMME NEUF (v491, v533). Faisceaux et ampoules prennent
//   `matiereAdditive` (avions.js) : les mêmes réglages que la flamme des
//   réacteurs, chauffée à l'accueil. Une géométrie de positions seules ne
//   change pas la clé d'un `MeshBasicMaterial` sans carte ; un témoin lit les
//   clés après avoir allumé la tour.
// - LE SCINTILLEMENT EST UN GESTE DE VISIBILITÉ, PAS D'UNIFORME. Les ampoules
//   sont rangées en GROUPES, chacun un maillage ; on montre et cache des
//   groupes, on ne touche à aucun matériau à chaque image.
//
// Le scintillement suit l'heure du JEU (« au début de chaque heure ») comme
// la vraie tour : un quart d'heure de jeu sur quatre, à la nuit tombée. Le
// crépitement et la rotation du phare, eux, sont en temps RÉEL : ce sont des
// rythmes qu'on voit, pas des durées qu'on compte, et ils n'ont pas à ralentir
// quand la tablette rame (v268).
//
// Les ampoules se posent sur le MODÈLE (les sommets du fer, décodés comme le
// mailleur les décode) : jamais à côté des poutres (v230, v519). Sous une tour
// d'avant gardée pour un enfant (`world.tourEiffelAvant`, v575), le modèle
// n'est plus là : la nuit de la tour s'éteint avec lui.
import * as THREE from 'three';
import { matiereAdditive } from './avions.js';
import { decoderPartie } from './paris-monuments-hd.js';
import { PARTIES } from './tour-eiffel-donnees.js';

export const GROUPES_SCINTILLEMENT = 6;
export const AMPOULE = 0.5;            // côté d'une ampoule, en blocs
export const PAS_OR = 0.55;           // les points d'or, plus serrés que les ampoules
export const POINT_OR = 0.42;
export const SAILLIE = 0.95;          // hors du squelette de cubes
export const AMPOULE_PRES = 0.16;     // de près, sur le modèle en relief
export const SAILLIE_PRES = 0.12;
export const PAS_AMPOULES = 0.9;       // une ampoule au plus par case de ce pas
export const HAUT_PHARE = 67.2;        // la lanterne, au-dessus du pied (69 blocs de haut)
export const LONG_FAISCEAU = 150;
export const TOUR_PHARE_S = 24;        // un tour de faisceau, en secondes réelles
export const PORTEE_NUIT = 2600;       // au-delà, on ne dessine rien (le brouillard est plein)

// Le scintillement : la part de l'heure de jeu où la tour crépite. Pure, pour
// le témoin. `heure` est la fraction du jour (0 au lever, 0,75 minuit).
export function scintilleA(heure, nuit) {
  if (nuit < 0.5) return false;
  const h = ((heure * 24) % 1 + 1) % 1;           // la minute dans l'heure du jeu
  return h < 0.25;
}

// Les places des ampoules : un sommet du fer par case de `PAS_AMPOULES`, en
// coordonnées du modèle (pied au centre, y vers le haut). Déterministe.
export function placesAmpoules(pas = PAS_AMPOULES, saillie = SAILLIE) {
  const { pos } = decoderPartie(PARTIES[0]);
  const vues = new Set(), out = [];
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    if (y < 3 || y > HAUT_PHARE - 1) continue;
    const k = `${Math.round(x / pas)},${Math.round(y / pas)},${Math.round(z / pas)}`;
    if (vues.has(k)) continue;
    vues.add(k);
    // un bloc vers l'extérieur, le long de l'axe dominant : le squelette de
    // cubes (`buildEiffelModele`) couvre la surface du modèle, et une ampoule
    // posée dessus serait cachée dans la case (vu en capture)
    const ax = Math.abs(x), az = Math.abs(z);
    const dx = ax >= az && ax > 0.4 ? Math.sign(x) * saillie : 0, dz = az > ax && az > 0.4 ? Math.sign(z) * saillie : 0;
    out.push(x + dx, y, z + dz);
  }
  return out;
}

function geometrieAmpoules(places, filtre, cote = AMPOULE) {
  const s = cote / 2, pts = [];
  for (let i = 0; i < places.length; i += 3) {
    if (!filtre(i / 3)) continue;
    const x = places[i], y = places[i + 1], z = places[i + 2];
    // trois carrés croisés : une ampoule se voit de partout
    pts.push(x - s, y, z, x + s, y, z, x, y + s, z, x - s, y, z, x, y + s, z, x, y - s, z);
    pts.push(x + s, y, z, x, y - s, z, x, y + s, z);
    pts.push(x, y, z - s, x, y, z + s, x, y + s, z, x, y, z - s, x, y - s, z, x, y, z + s);
    pts.push(x - s, y, z, x + s, y, z, x, y, z + s, x - s, y, z, x, y, z - s, x + s, y, z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.computeBoundingSphere();
  return g;
}

// Un faisceau : une lame qui s'évase, en deux plans croisés (vue de côté et
// vue d'en haut). Il part de la lanterne vers +x.
function geometrieFaisceau() {
  const L = LONG_FAISCEAU, a = 0.25, b = 7;
  const p = [
    0, -a, 0, L, -b, 0, L, b, 0, 0, -a, 0, L, b, 0, 0, a, 0,
    0, 0, -a, L, 0, -b, L, 0, b, 0, 0, -a, L, 0, b, 0, 0, a,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.computeBoundingSphere();
  return g;
}

// DEUX JEUX D'AMPOULES, et l'on bascule à la portée du détail (`pres`, en
// blocs). De près, le modèle en relief est dessiné et son fer luit déjà d'or :
// de petites ampoules posées sur lui, et pas de points d'or. De loin, c'est le
// squelette de cubes : les ampoules et l'or sortent d'un bloc (vu en capture
// au pied de la tour : les grandes ampoules de loin faisaient des losanges
// blancs qui couvraient le fer).
export function creerNuitEiffel(scene, lm, world, { pres = 0 } = {}) {
  const groupe = new THREE.Group();
  groupe.name = 'nuit-eiffel';
  groupe.visible = false;
  const places = placesAmpoules(), placesPres = placesAmpoules(PAS_AMPOULES, SAILLIE_PRES);
  const blanc = matiereAdditive(0xfff8ea, 0.95);
  const jeu = (pl, cote) => {
    const ms = [];
    for (let k = 0; k < GROUPES_SCINTILLEMENT; k++) {
      // un hachage de l'indice, pas un tirage : deux tablettes ont la même tour
      const m = new THREE.Mesh(geometrieAmpoules(pl, (i) => ((i * 2654435761) >>> 0) % GROUPES_SCINTILLEMENT === k, cote), blanc);
      m.name = 'eiffel-ampoules';
      m.frustumCulled = false;
      m.visible = false;
      groupe.add(m);
      ms.push(m);
    }
    return ms;
  };
  const loinA = jeu(places, AMPOULE), presA = jeu(placesPres, AMPOULE_PRES);
  let ampoules = loinA;
  // L'OR DE LA TOUR VU DE LOIN. La lueur du fer (paris-monuments-hd.js) ne
  // vit que dans le modèle en relief, donc à portée du détail ; au-delà, la
  // tour est son squelette de cubes, et elle était NOIRE à minuit (vu en
  // capture depuis le Champ-de-Mars, à soixante-dix blocs). Des points ambrés
  // serrés sur le fer en font une silhouette dorée à toute distance.
  const or = new THREE.Mesh(geometrieAmpoules(placesAmpoules(PAS_OR), () => true, POINT_OR), matiereAdditive(0xffb54a, 0.5));
  or.name = 'eiffel-or';
  or.frustumCulled = false;
  groupe.add(or);
  const phare = new THREE.Group();
  phare.name = 'eiffel-phare';
  phare.position.y = HAUT_PHARE;
  const geo = geometrieFaisceau(), mat = matiereAdditive(0xffd27a, 0.11);
  for (let k = 0; k < 2; k++) {
    const f = new THREE.Mesh(geo, mat);
    f.name = 'eiffel-faisceau';
    f.rotation.y = k * Math.PI;
    f.frustumCulled = false;
    phare.add(f);
  }
  const lanterne = new THREE.Mesh(geometrieAmpoules([0, 0, 0], () => true), matiereAdditive(0xfff1c8, 1));
  lanterne.scale.setScalar(4);
  lanterne.name = 'eiffel-lanterne';
  phare.add(lanterne);
  groupe.add(phare);
  scene.add(groupe);

  let pose = false, dernierCrepit = 0;
  const etat = { allumee: false, scintille: false, groupesVus: 0, angle: 0, proche: false };
  return {
    groupe, etat, nbAmpoules: places.length / 3,
    // nuit : 0 le jour, 1 en pleine nuit (`nuitDehors`) ; heure : la fraction du jour
    maj(nuit, heure, cam) {
      if (!pose) {
        if (!world.morceauxPrets || world.morceauxPrets(lm.x, lm.z)) {
          groupe.position.set(lm.x + 0.5, world.terrainHeight(lm.x, lm.z), lm.z + 0.5);
          pose = true;
        } else return;
      }
      const d = Math.hypot(cam.x - groupe.position.x, cam.z - groupe.position.z), loin = d > PORTEE_NUIT;
      const allumee = nuit > 0.3 && !loin && !world.tourEiffelAvant;
      groupe.visible = allumee;
      etat.allumee = allumee;
      if (!allumee) return;
      const proche = d < pres;
      etat.proche = proche;
      or.visible = !proche;
      const voulu = proche ? presA : loinA;
      if (voulu !== ampoules) { for (const m of ampoules) m.visible = false; ampoules = voulu; }
      const t = performance.now() / 1000;
      etat.angle = (t / TOUR_PHARE_S) * Math.PI * 2;
      phare.rotation.y = etat.angle;
      const scint = scintilleA(heure, nuit);
      etat.scintille = scint;
      if (!scint) { for (const m of ampoules) m.visible = false; etat.groupesVus = 0; return; }
      if (t - dernierCrepit < 0.09) return;          // un crépitement à onze par seconde
      dernierCrepit = t;
      let vus = 0;
      for (const m of ampoules) { m.visible = Math.random() < 0.4; if (m.visible) vus++; }
      etat.groupesVus = vus;
    },
  };
}
