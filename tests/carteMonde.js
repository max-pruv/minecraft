// La carte sur la vraie géographie, et le garde-fou qui va avec.
//
// CE QUI L'A DÉCLENCHÉ. Max : « il y a un vrai sujet structurel, elles sont
// beaucoup trop rapprochées… considère cette opportunité comme un reset de la
// carte pour laisser beaucoup plus d'espace ». Et : « la ville de Paris ne
// ressemble pas du tout à la ville de Paris » — faute de place.
//
// CE QUE CE TÉMOIN GARDE, et c'est le plus important : QU'AUCUNE VILLE N'EN
// TOUCHE UNE AUTRE. Le défaut a failli partir en production. À l'échelle
// d'abord retenue — 1 bloc = 4 km — New York et Washington, distantes de
// 330 km, se superposaient sur près de deux cents blocs : les villes ne sont
// pas à l'échelle de la carte (Washington est bâtie à 48 blocs par kilomètre).
// Ce genre de chose ne se voit pas dans un diff. Elle se voit ici, ou par un
// enfant qui sort de Manhattan et se retrouve dans le Mall.
//
//     cd tests && npm run carteMonde

const { Banc, dormir } = require('./banc.js');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

// Les distances réelles entre villes, en kilomètres, à vol d'oiseau.
//
// ON NE VÉRIFIE AU BLOC PRÈS QUE CE QUE LA PROJECTION PROMET. Une carte plate
// ne préserve pas les distances partout : l'équirectangulaire est exacte au
// parallèle de référence — la latitude de Paris — et s'écarte à mesure qu'on
// s'en éloigne. New York-San Francisco, huit degrés plus au sud, ressort 15 %
// trop court, et c'est de la géométrie, pas un défaut.
//
// Les paires européennes gardent donc une tolérance serrée ; les lointaines ne
// vérifient que l'ORDRE DE GRANDEUR, ce qui suffit à attraper une ville posée
// au mauvais endroit — le vrai risque.
const VRAIES_KM = [
  ['paris', 'lille', 204, 0.08],
  ['paris', 'nice', 686, 0.08],
  ['ny', 'washington', 328, 0.20],
  ['ny', 'sf', 4139, 0.25],
  // L'Atlantique est volontairement resserré à 60 % : décision de Max, pas une
  // erreur. On vérifie donc qu'il EST resserré, et de combien.
  ['paris', 'ny', 5837, 0.45],
  // Le tour du monde. Les paires européennes restent près du parallèle de
  // référence, donc justes au bloc près ; les lointaines ne vérifient que
  // l'ordre de grandeur, ce qui suffit à attraper une ville mal posée.
  ['paris', 'londres', 344, 0.10],
  ['paris', 'rome', 1106, 0.12],
  ['paris', 'barcelone', 831, 0.12],
  ['rome', 'pise', 265, 0.15],
  ['paris', 'gizeh', 3210, 0.25],
  ['paris', 'agra', 6675, 0.30],
];

(async () => {
  const banc = new Banc({ portJeu: 8401, portPairs: 9401 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Camille');

    const monde = await tab.evaluate(async () => {
      const m = await import('./src/mondes.js');
      return { lieux: m.lieuxDuMonde('terre'), kmParBloc: m.MONDES.terre.projection.kmParBloc };
    });
    verifier('le registre des mondes rend bien tous les lieux',
      monde.lieux.length >= 7, `${monde.lieux.length} lieux`);

    // LE TÉMOIN QUI COMPTE : aucune ville n'en touche une autre.
    const chevauchements = [];
    let margeMin = Infinity, paireMin = '';
    for (let i = 0; i < monde.lieux.length; i++) {
      for (let j = i + 1; j < monde.lieux.length; j++) {
        const a = monde.lieux[i], b = monde.lieux[j];
        const marge = Math.hypot(a.x - b.x, a.z - b.z) - (a.r + b.r);
        if (marge < margeMin) { margeMin = marge; paireMin = `${a.nom} / ${b.nom}`; }
        if (marge < 0) chevauchements.push(`${a.nom} / ${b.nom} : ${Math.round(marge)}`);
      }
    }
    verifier('aucune ville n\'en chevauche une autre',
      chevauchements.length === 0,
      chevauchements.length ? chevauchements.join(' · ')
        : `marge la plus faible ${Math.round(margeMin)} blocs (${paireMin})`);

    // La géographie est respectée : les distances sur la carte sont les vraies
    // distances, à l'échelle près. Sauf l'Atlantique, resserré par décision de
    // Max — donc Paris/New York est volontairement plus court.
    const pos = Object.fromEntries(monde.lieux.map((l) => [l.cle, l]));
    const ecarts = [];
    for (const [a, b, km, tolerance] of VRAIES_KM) {
      if (!pos[a] || !pos[b]) { ecarts.push(`${a}/${b} absent`); continue; }
      const blocs = Math.hypot(pos[a].x - pos[b].x, pos[a].z - pos[b].z);
      const attendu = km / monde.kmParBloc;
      const err = Math.abs(blocs - attendu) / attendu;
      if (err > tolerance) {
        ecarts.push(`${a}/${b} : ${Math.round(blocs)} au lieu de ${Math.round(attendu)}`
          + ` (${Math.round(err * 100)} % d'écart)`);
      }
    }
    verifier('les distances de la carte sont les vraies distances',
      ecarts.length === 0, ecarts.join(' · '));

    // L'ORDRE ET LES DIRECTIONS sont vrais PARTOUT — c'est ce qui reste exact
    // quand les distances se déforment, et c'est ce qu'un enfant ressent :
    // Lille est au nord de Paris, Nice au sud, New York à l'ouest.
    // On juge par QUADRANT, pas par axe dominant. Une première version prenait
    // l'axe le plus long et attendait « sud » pour Washington : or DC est au
    // sud-ouest de New York, et l'écart en longitude y dépasse celui en
    // latitude de dix-sept kilomètres. Le témoin accusait la carte d'une erreur
    // qui était la sienne.
    const boussole = [
      ['lille', 'paris', ['nord']],
      ['nice', 'paris', ['sud', 'est']],
      ['ny', 'paris', ['ouest']],
      ['chine', 'paris', ['est']],
      ['washington', 'ny', ['sud', 'ouest']],
      // Le tour du monde : Londres à l'ouest-nord-ouest de Paris, Rome au
      // sud-est, Sydney à l'autre bout, Rio au sud-ouest par l'Atlantique.
      ['londres', 'paris', ['nord', 'ouest']],
      ['rome', 'paris', ['sud', 'est']],
      ['barcelone', 'paris', ['sud', 'ouest']],
      ['gizeh', 'paris', ['sud', 'est']],
      ['sydney', 'paris', ['sud', 'est']],
      ['rio', 'paris', ['sud', 'ouest']],
      ['seattle', 'ny', ['nord', 'ouest']],
    ];
    const fauxCaps = [];
    for (const [a, ref, attendus] of boussole) {
      const dx = pos[a].x - pos[ref].x, dz = pos[a].z - pos[ref].z;
      const vus = [];
      if (dz < 0) vus.push('nord'); if (dz > 0) vus.push('sud');
      if (dx > 0) vus.push('est'); if (dx < 0) vus.push('ouest');
      const manque = attendus.filter((c) => !vus.includes(c));
      if (manque.length) fauxCaps.push(`${a} / ${ref} : vu ${vus.join('-')}, attendu ${attendus.join('-')}`);
    }
    verifier('et chaque ville est du bon côté de sa voisine',
      fauxCaps.length === 0, fauxCaps.join(' · '));

    // Les villes sont bien LÀ où le registre le dit — c'est ce qui prouve que
    // les modules les ont vraiment suivies au lieu de garder leur ancienne
    // adresse écrite en dur.
    const suivi = await tab.evaluate(async () => {
      const [w, lille, nice, sf, mh, paris, dc] = await Promise.all([
        import('./src/world.js'), import('./src/lille.js'), import('./src/nice.js'),
        import('./src/sanfrancisco.js'), import('./src/manhattan.js'),
        import('./src/paris.js'), import('./src/washington.js'),
      ]);
      return {
        lille: [lille.LILLE.x, lille.LILLE.z], nice: [nice.NICE.x, nice.NICE.z],
        sf: [sf.SF.x, sf.SF.z], ny: [mh.NY.x, mh.NY.z],
        paris: [paris.PARIS.x, paris.PARIS.z],
        washington: [dc.WASHINGTON.x, dc.WASHINGTON.z],
        // La caserne vit au cœur de Paris : elle doit l'avoir suivi.
        caserne: [w.VILLE.x, w.VILLE.z],
      };
    });
    const perdus = [];
    for (const [cle, xy] of Object.entries(suivi)) {
      const attendu = pos[cle === 'caserne' ? 'paris' : cle];
      if (!attendu) continue;
      if (xy[0] !== attendu.x || xy[1] !== attendu.z) {
        perdus.push(`${cle} en (${xy}) au lieu de (${attendu.x},${attendu.z})`);
      }
    }
    verifier('chaque ville est là où le registre la place', perdus.length === 0, perdus.join(' · '));

    // Et le terrain existe vraiment là-bas : une ville projetée à dix mille
    // blocs ne sert à rien si le monde n'y est pas engendré.
    const loin = await tab.evaluate((p) => {
      const w = window.__game.world;
      const h = w.terrainHeight(p.x, p.z);
      return { h, solide: w.isSolid(p.x, h - 1, p.z) };
    }, { x: pos.sf.x, z: pos.sf.z });
    verifier('le terrain existe là où San Francisco a déménagé',
      loin.h > 0 && loin.solide, JSON.stringify(loin));

    // --- LE TOUR DU MONDE : quarante-six villes, pas des esplanades ----------
    //
    // Max : « fais pas que Londres, hein — je veux plein de villes iconiques. »
    // Puis : « refais les 50 plus grosses et famous villes mondiales en
    // détail. » Chaque monument se dresse DANS sa ville (src/villesmonde.js),
    // au bord de son eau. Le témoin sonde le monde engendré : chaque monument
    // debout, les huit grands du catalogue jusqu'à leur vraie hauteur, l'eau
    // là où la géographie la met — du Tibre au Bosphore, de la lagune de
    // Venise au port Victoria — et le centre de chaque ville au sec.
    const tour = await tab.evaluate(async () => {
      const { VILLES_MONDE } = await import('./src/villesmonde.js');
      const { monumentBati } = await import('./src/monuments.js');
      const { WATER_LEVEL } = await import('./src/world.js');
      const w = window.__game.world;
      const CAT = { 'Colisée': 'colisee', 'Sagrada Família': 'sagrada', 'Tour de Pise': 'tour-pise',
        'Pyramide de Khéops': 'pyramide-gizeh', 'Taj Mahal': 'taj-mahal', "Opéra de Sydney": 'opera-sydney',
        'Christ Rédempteur': 'christ-redempteur', 'Space Needle': 'space-needle' };
      const EAU_TEMOIN = { rome: [-50, 1], barcelone: [45, 25], pise: [0, 15], agra: [10, -6],
        sydney: [-5, -18], rio: [45, 20], seattle: [-35, 0],
        // les cinquante grandes : chaque signature d'eau nouvelle a son point
        venise: [36, 0],          // la lagune, au-delà du rayon 33
        amsterdam: [0, 20],       // la ceinture de canaux, anneau r=20
        istanbul: [40, 30],       // le Bosphore
        stockholm: [0, 3],        // le Norrström, devant Gamla Stan
        tokyo: [33, -5],          // la Sumida
        hongkong: [0, 26],        // le port Victoria
        chicago: [40, 0],         // le lac Michigan
        miami: [20, 0],           // la baie de Biscayne, avant l'île-barrière
        lecap: [0, -25] };        // la baie de la Table
      const monuments = [], eaux = [], centres = [];
      for (const f of VILLES_MONDE) {
        for (const m of f.monuments) {
          const [du, dv] = f.local(m.lat, m.lon);
          const x = f.ancre.x + du, z = f.ancre.z + dv;
          const sol = w.terrainHeight(x, z);
          const cat0 = CAT[m.nom];
          const R = Math.min(m.box || 24, cat0 ? 24 : 12);
          let hMax = 0;
          // Le pas de deux doit TOMBER sur la colonne centrale : avec une
          // boîte impaire (R = 3), -3, -1, 1, 3 ne lit jamais 0 — et un
          // beffroi planté au centre exact d'une place dégagée passait pour
          // couché. La leçon du fleuron du Taj, version place publique.
          for (let a = -R + (R & 1); a <= R; a += 2) {
            for (let b = -R + (R & 1); b <= R; b += 2) {
              for (let y = sol + 115; y > sol; y--) {
                if (w.getBlock(x + a, y, z + b)) { hMax = Math.max(hMax, y - sol); break; }
              }
            }
          }
          const cat = cat0 ? monumentBati(cat0) : null;
          // LA FLÈCHE SE VÉRIFIE À SON ADRESSE EXACTE — la leçon de v164,
          // réapprise ici : l'échantillonnage de deux en deux ratait le
          // fleuron du Taj, large d'un bloc, et l'annonçait tronqué à 38/41.
          // On demande au modèle OÙ est son point le plus haut, et on lit
          // cette colonne-là.
          let fleche = !cat;
          if (cat) {
            const e2 = cat.emprise;
            const ccx = Math.round((e2.minX + e2.maxX) / 2);
            const ccz = Math.round((e2.minZ + e2.maxZ) / 2);
            let sommet = cat.blocs[0];
            for (const bl of cat.blocs) if (bl[1] > sommet[1]) sommet = bl;
            const fx = x + (sommet[0] - ccx), fz = z + (sommet[2] - ccz);
            // Le monde tamponne à baseY + (by − minY), où baseY est le sol AU
            // CENTRE du monument — pas sous la colonne de la flèche. Lire un
            // bloc plus haut (l'ancienne formule de v164, qui vivait avec le
            // parvis surélevé des capitales) déclarait six monuments sur huit
            // tronqués d'un bloc qu'ils avaient bel et bien.
            fleche = w.getBlock(fx, sol + (sommet[1] - e2.minY), fz) !== 0;
          }
          monuments.push({ nom: m.nom, ville: f.cle, hMax, fleche,
            attendu: cat ? cat.emprise.h : 3, hMin: m.hmin || 3 });
        }
        const e = EAU_TEMOIN[f.cle];
        if (e) eaux.push({ ville: f.cle, eau: w.terrainHeight(f.ancre.x + e[0], f.ancre.z + e[1]) < WATER_LEVEL });
        centres.push({ ville: f.cle, sec: w.terrainHeight(f.ancre.x, f.ancre.z) >= WATER_LEVEL });
      }
      return { monuments, eaux, centres };
    });
    // Un monument volontairement plat — les voitures de La Havane, la
    // fontaine de Dubaï — porte sa hauteur minimale dans sa fiche (hmin) ;
    // pour tous les autres, moins de trois blocs, c'est un monument couché.
    const couches = tour.monuments.filter((m) => m.hMax < m.hMin);
    verifier('les cent quarante-deux monuments des quarante-six villes se dressent, chacun chez lui',
      tour.monuments.length === 142 && couches.length === 0,
      couches.map((m) => `${m.nom} (${m.ville}) : ${m.hMax}`).join(' · ')
        || `${tour.monuments.length} monuments debout`);
    const tronques = tour.monuments.filter((m) => m.attendu > 3 && !m.fleche);
    verifier('et les huit grands du catalogue montent jusqu\'à leur vraie hauteur',
      tronques.length === 0,
      tronques.map((m) => `${m.nom} : ${m.hMax}/${m.attendu}`).join(' · ')
        || tour.monuments.filter((m) => m.attendu > 3).map((m) => `${m.nom} ${m.hMax}`).join(', '));
    const sansEau = tour.eaux.filter((e) => !e.eau);
    const noyes = tour.centres.filter((c) => !c.sec);
    verifier('chaque ville a son eau là où la géographie la met, et son centre au sec',
      sansEau.length === 0 && noyes.length === 0,
      [...sansEau.map((e) => `${e.ville} sans eau`), ...noyes.map((c) => `${c.ville} noyée`)].join(' · ')
        || `${tour.eaux.length} signatures d'eau, ${tour.centres.length} centres au sec`);

    // --- LA TERRE SE RECONNAÎT ----------------------------------------------
    //
    // Max : « quand je regarde la carte, je ne reconnais pas la vraie carte du
    // monde ». On sonde donc le monde ENGENDRÉ — pas le planisphère qui le
    // décrit : l'Atlantique est en eau entre Paris et New York, la Manche
    // sépare Londres de Lille, la Méditerranée borde Nice, et chaque ville du
    // registre est à terre.
    const geographie = await tab.evaluate(async () => {
      const { WATER_LEVEL } = await import('./src/world.js');
      const w = window.__game.world;
      const mer = (x, z) => w.terrainHeight(x, z) < WATER_LEVEL;
      const sonde = (x, z, r) => {
        let e = 0, t = 0;
        for (let dx = -r; dx <= r; dx += Math.max(2, r >> 2)) {
          for (let dz = -r; dz <= r; dz += Math.max(2, r >> 2)) { mer(x + dx, z + dz) ? e++ : t++; }
        }
        return { e, t };
      };
      return {
        atlantique: sonde(-3200, -800, 24), manche: sonde(-330, -125, 8),
        mediterranee: sonde(300, 1100, 12), pacifique: sonde(-12000, 3000, 24),
        france: sonde(-300, 480, 24), ameriques: sonde(-7000, 1200, 24),
      };
    });
    const enEau = (o) => o.e > o.t * 2;
    const aTerre = (o) => o.t > o.e * 2;
    verifier('les océans sont en eau : Atlantique, Manche, Méditerranée, Pacifique',
      enEau(geographie.atlantique) && enEau(geographie.manche)
      && enEau(geographie.mediterranee) && enEau(geographie.pacifique),
      JSON.stringify(geographie));
    verifier('et les continents sont à terre : la France, l\'Amérique',
      aTerre(geographie.france) && aTerre(geographie.ameriques),
      JSON.stringify({ france: geographie.france, ameriques: geographie.ameriques }));

    const villesATerre = await tab.evaluate(async () => {
      const { WATER_LEVEL } = await import('./src/world.js');
      const m = await import('./src/mondes.js');
      const w = window.__game.world;
      return m.lieuxDuMonde('terre')
        .filter((l) => w.terrainHeight(l.x, l.z) < WATER_LEVEL)
        .map((l) => l.nom);
    });
    verifier('chaque ville du registre est à terre, aucune ne baigne',
      villesATerre.length === 0, villesATerre.join(', ') || '16 villes au sec');

    // Le relief : l'Everest culmine, le Grand Canyon se creuse. Les sommets
    // sont sous le plafond du terrain — c'est plafond.js qui y veille.
    const relief = await tab.evaluate(async () => {
      const m = await import('./src/mondes.js');
      const w = window.__game.world;
      const blocDe = (lat, lon) => {
        const z = Math.round(200 - ((lat - 48.8566) * 111.19) / 0.75);
        let a = -30000, b = 30000;
        while (b - a > 1) { const mi = (a + b) >> 1; (m.cielDe(mi, z).lon < lon) ? a = mi : b = mi; }
        return { x: a, z };
      };
      const sommet = (lat, lon) => {
        const { x, z } = blocDe(lat, lon);
        let s = 0;
        for (let dx = -8; dx <= 8; dx += 2) {
          for (let dz = -8; dz <= 8; dz += 2) s = Math.max(s, w.terrainHeight(x + dx, z + dz));
        }
        return s;
      };
      const gc = blocDe(36.2, -112.4);
      let bord = 0, fond = 99;
      for (let dz = -40; dz <= 40; dz++) {
        const h = w.terrainHeight(gc.x, gc.z + dz);
        bord = Math.max(bord, h); fond = Math.min(fond, h);
      }
      return { everest: sommet(27.99, 86.92), montBlanc: sommet(45.83, 6.87),
        rainier: sommet(46.85, -121.76), canyon: bord - fond };
    });
    verifier('l\'Everest, le mont Blanc et le mont Rainier culminent',
      relief.everest >= 66 && relief.montBlanc >= 45 && relief.rainier >= 45,
      JSON.stringify(relief));
    verifier('et le Grand Canyon se creuse d\'au moins quatorze blocs',
      relief.canyon >= 14, `gorge de ${relief.canyon}`);

    // --- LA GIGA-USINE D'AUSTIN ---------------------------------------------
    //
    // Max : « une usine automobile comme une Tesla factory, extrêmement
    // réaliste ». Le site vit aux vraies coordonnées d'Austin, Texas, inscrit
    // au registre. On sonde le monde ENGENDRÉ : le hall et son bandeau vitré,
    // les lettres de la façade, un bras-robot, le tunnel de peinture, et le
    // parc garni de voitures neuves sur son asphalte.
    const usine = await tab.evaluate(async () => {
      const { USINE } = await import('./src/usine.js');
      const { BLOCK } = await import('./src/blocks.js');
      const w = window.__game.world;
      const p = USINE();
      const sol = w.terrainHeight(p.x, p.z);
      return {
        sol,
        mur: w.getBlock(p.x - 38, sol + 3, p.z - 20) !== 0,
        bandeau: w.getBlock(p.x - 38, sol + 6, p.z - 20) === BLOCK.GLASS,
        lettre: w.getBlock(p.x - 60, sol + 10, p.z + 21) !== 0,
        robot: w.getBlock(p.x - 56, sol + 5, p.z + 5) !== 0,
        tunnel: w.getBlock(p.x - 32, sol + 8, p.z) !== 0,
        voitureParc: w.getBlock(p.x + 20, sol + 1, p.z - 26) !== 0,
        asphalte: w.getBlock(p.x + 50, sol, p.z + 5) !== 0,
      };
    });
    verifier('la Giga-usine se dresse à Austin : hall vitré, lettres, robots, tunnel',
      usine.sol === 33 && usine.mur && usine.bandeau && usine.lettre && usine.robot && usine.tunnel,
      JSON.stringify(usine));
    verifier('et le parc des voitures neuves est garni, sur son asphalte',
      usine.voitureParc && usine.asphalte,
      JSON.stringify({ voiture: usine.voitureParc, asphalte: usine.asphalte }));

    // --- LES FAÇADES DES CINQUANTE GRANDES ----------------------------------
    //
    // Max : « on ne retrouve pas des façades de magasins… pas assez de
    // diversité d'objets ni de couleurs. » On sonde trois villes aux trames
    // et palettes opposées — Rome, Tokyo, Marrakech : chacune doit montrer
    // ses vitrines, ses portes de boutiques, ses bandeaux d'enseigne, ses
    // auvents rayés au-dessus du trottoir, ses lampadaires, ses bancs — et
    // une vraie diversité de blocs, comptée, pas promise.
    const facades = await tab.evaluate(async () => {
      const { positionDe } = await import('./src/mondes.js');
      const { BLOCK, CITY_BLOCK, DECOR_START } = await import('./src/blocks.js');
      const w = window.__game.world;
      const raye = (c) => DECOR_START + c * 10 + 5;
      const ENS = new Set([raye(0), raye(5), raye(10), raye(11), raye(13), raye(2), raye(6), raye(14)]);
      const villes = {};
      for (const cle of ['rome', 'tokyo', 'marrakech']) {
        const p = positionDe(cle);
        const c = { vitrines: 0, portes: 0, enseignes: 0, auvents: 0, lampes: 0, bancs: 0 };
        const ids = new Set();
        for (let du = -40; du <= 40; du++) {
          for (let dv = -40; dv <= 40; dv++) {
            const x = p.x + du, z = p.z + dv;
            const sol = w.terrainHeight(x, z);
            const s0 = w.getBlock(x, sol, z);
            for (let dy = 0; dy <= 8; dy++) { const id = w.getBlock(x, sol + dy, z); if (id) ids.add(id); }
            if (s0 === BLOCK.DARKPLANK) c.portes++;
            if (s0 === BLOCK.GLASS) c.vitrines++;
            if (s0 === CITY_BLOCK.SIDEWALK) {
              if (ENS.has(w.getBlock(x, sol + 3, z))) c.auvents++;
              if (w.getBlock(x, sol + 4, z) === BLOCK.GOLD) c.lampes++;
              if (w.getBlock(x, sol + 1, z) === BLOCK.PLANK) c.bancs++;
            } else if (ENS.has(w.getBlock(x, sol + 2, z))) c.enseignes++;
          }
        }
        villes[cle] = { ...c, diversite: ids.size };
      }
      return villes;
    });
    // Seuils recalés au grand recalibrage (v172) : les îlots ont triplé, la
    // fenêtre passe à ±40, et les mesures de référence sont Rome 113/29/189/
    // 207, Tokyo 594/8/317/165, Marrakech 456/192/631/1075.
    const sansDevanture = Object.entries(facades).filter(([, c]) =>
      !(c.vitrines >= 80 && c.portes >= 5 && c.enseignes >= 120 && c.auvents >= 110));
    verifier('les rues ont des devantures : vitrines, portes, enseignes, auvents',
      sansDevanture.length === 0,
      sansDevanture.map(([v]) => v).join(' · ') || JSON.stringify(facades));
    const sansVie = Object.entries(facades).filter(([, c]) =>
      !(c.lampes >= 45 && c.bancs >= 30 && c.diversite >= 20));
    verifier('et du mobilier : lampadaires, bancs — et la diversité se compte',
      sansVie.length === 0,
      sansVie.map(([v]) => v).join(' · ')
        || Object.entries(facades).map(([v, c]) => `${v} ${c.diversite} blocs différents`).join(' · '));

    verifier('aucune erreur JavaScript de bout en bout',
      tab.erreurs.length === 0, JSON.stringify(tab.erreurs.slice(0, 3)));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ la carte suit la vraie géographie, et rien ne se chevauche');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
