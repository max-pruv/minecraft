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
      // CES POINTS SONT EN UNITÉS DE FICHE, PAS EN BLOCS — et c'est ce qui
      // leur permet de survivre à une remise à l'échelle. Ils sont relevés sur
      // le plan que la fiche décrit (la lagune de Venise au-delà de son rayon
      // 33, l'anneau de canaux d'Amsterdam à 20) ; la conversion en blocs se
      // fait à la lecture, en multipliant par le facteur de la ville. Une
      // sonde qui vise un (u, v) en dur meurt à la prochaine échelle : c'est
      // écrit noir sur blanc pour Paris, et cela vaut ici aussi.
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
        for (const m of f.monuments || []) {
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
        if (e) {
          const ex = Math.round(f.ancre.x + e[0] * f.K), ez = Math.round(f.ancre.z + e[1] * f.K);
          eaux.push({ ville: f.cle, eau: w.terrainHeight(ex, ez) < WATER_LEVEL });
        }
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
    // ON VISE UNE LATITUDE ET UNE LONGITUDE, PAS UN x/z EN DUR.
    //
    // Ces six sondes étaient écrites en coordonnées absolues, calculées pour
    // l'échelle d'alors. L'agrandissement de la carte (v199) les a laissées
    // sur place pendant que la géographie, elle, doublait ses distances : la
    // Manche annonçait 0 case d'eau sur 81, le Pacifique aussi, et les
    // Amériques 81 cases d'eau sur 81. Rien n'avait disparu — les témoins
    // regardaient au mauvais endroit.
    //
    // C'est la leçon déjà écrite pour Paris et San Francisco, à l'échelle du
    // monde entier : une sonde vise une ADRESSE, jamais un u/v en dur, sinon
    // elle meurt à la prochaine remise à l'échelle.
    const geographie = await tab.evaluate(async () => {
      const { WATER_LEVEL } = await import('./src/world.js');
      const m = await import('./src/mondes.js');
      const w = window.__game.world;
      const mer = (x, z) => w.terrainHeight(x, z) < WATER_LEVEL;
      // d'une latitude et d'une longitude vers un bloc : la projection sait
      const pr = m.MONDES.terre.projection;
      const ou = (lat, lon) => {
        const z = Math.round(pr.ancre.z - ((lat - pr.lat0) * 111.19) / pr.kmParBloc);
        let a = -120000, b = 120000;
        while (b - a > 1) { const mi = (a + b) >> 1; (m.cielDe(mi, z).lon < lon) ? a = mi : b = mi; }
        return { x: a, z };
      };
      const sonde = (x, z, r) => {
        let e = 0, t = 0;
        for (let dx = -r; dx <= r; dx += Math.max(2, r >> 2)) {
          for (let dz = -r; dz <= r; dz += Math.max(2, r >> 2)) { mer(x + dx, z + dz) ? e++ : t++; }
        }
        return { e, t };
      };
      const parKm = 1 / pr.kmParBloc;
      const km = (n) => Math.round(n * parKm);
      const la = (lat, lon, rKm) => { const p = ou(lat, lon); return sonde(p.x, p.z, km(rKm)); };
      return {
        atlantique: la(40, -40, 18), manche: la(50.2, -0.5, 6),
        mediterranee: la(39, 6, 9), pacifique: la(30, -150, 18),
        france: la(47.2, 2.5, 18), ameriques: la(39, -98, 18),
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

    // LES CALOTTES SONT BLANCHES (v177). Max, capture à l'appui : « bug on
    // top and bottom on the map » — la banquise arctique et l'Antarctique,
    // déclarés terre par le planisphère, se rendaient en campagne verte. On
    // sonde le SOL du monde de part et d'autre des deux lisières : neige ou
    // glace au-delà, jamais en deçà.
    const calottes = await tab.evaluate(async () => {
      const m = await import('./src/mondes.js');
      const { BLOCK } = await import('./src/blocks.js');
      const w = window.__game.world;
      // sur l'ancien code, zDeLatitude n'existe pas : on échoue proprement
      if (!m.zDeLatitude) return { nord: -1, sud: -1, dedans: -1, sur: 9 };
      const zN = Math.round(m.zDeLatitude(78)), zS = Math.round(m.zDeLatitude(-63));
      const sol = (x, z) => w.getBlock(x, w.terrainHeight(x, z), z);
      const blanc = (id) => id === BLOCK.SNOW || id === BLOCK.ICE;
      let nord = 0, sud = 0, dedans = 0;
      for (let x = -600; x <= 600; x += 150) {
        if (blanc(sol(x, zN - 120))) nord++;
        if (blanc(sol(x, zS + 120))) sud++;
        if (blanc(sol(x, 300))) dedans++;          // la France n'est pas un pôle
      }
      return { nord, sud, dedans, sur: 9 };
    });
    verifier('les calottes polaires sont de neige et de glace, pas de prairie',
      calottes.nord === calottes.sur && calottes.sud === calottes.sur && calottes.dedans === 0,
      JSON.stringify(calottes));

    // LES VOIES FERRÉES (v179). Max : « add train connecting cities from
    // real life train lanes ». On sonde le MILIEU de chaque navette : du
    // ballast de gravier sur la terre, un viaduc de pierre au ras des flots
    // sur la mer — l'Eurostar traverse la Manche à découvert.
    const rails = await tab.evaluate(async () => {
      let m2;
      try { m2 = await import('./src/trains.js'); } catch { return { absent: true }; }
      const { BLOCK } = await import('./src/blocks.js');
      const { WATER_LEVEL } = await import('./src/world.js');
      const w = window.__game.world;
      const segs = m2.segmentsDeTrain();
      let poses = 0, viaduc = 0;
      for (const s of segs) {
        const mx = Math.round((s.x0 + s.x1) / 2), mz = Math.round((s.z0 + s.z1) / 2);
        const h = w.terrainHeight(mx, mz);
        if (h > WATER_LEVEL) { if (w.getBlock(mx, h, mz) === BLOCK.GRAVEL) poses++; }
        else if (w.getBlock(mx, WATER_LEVEL, mz) === BLOCK.STONEBRICK) { poses++; viaduc++; }
      }
      return { segments: segs.length, poses, viaduc };
    });
    verifier('les voies ferrées sont posées — ballast à terre, viaduc sur la mer',
      !rails.absent && rails.segments === 9 && rails.poses === 9 && rails.viaduc >= 1,
      JSON.stringify(rails));

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
      // L'ÉCHELLE SE DEMANDE, ELLE NE S'ÉCRIT PAS EN DUR. Ce `0.75` et cet
      // ancrage `200` étaient l'échelle du jour où le témoin a été écrit :
      // après l'agrandissement de la carte (v199), il calculait un `z` pour
      // l'ancienne projection et cherchait le sommet de l'Everest à
      // mi-chemin de l'Everest. Les montagnes n'avaient pas rapetissé — le
      // témoin regardait ailleurs.
      const pr = m.MONDES.terre.projection;
      const blocDe = (lat, lon) => {
        const z = Math.round(pr.ancre.z - ((lat - pr.lat0) * 111.19) / pr.kmParBloc);
        // LES BORNES SUIVENT LE MONDE. À 0,75 km/bloc il tenait dans
        // ±30 000 ; à 0,375 il en fait 43 000, et la dichotomie clampait —
        // l'Everest sortait de la fenêtre de recherche et le témoin lisait
        // la cote d'un endroit quelconque. On prend large.
        let a = -120000, b = 120000;
        while (b - a > 1) { const mi = (a + b) >> 1; (m.cielDe(mi, z).lon < lon) ? a = mi : b = mi; }
        return { x: a, z };
      };
      // UN RAYON DE RECHERCHE EST UNE DISTANCE RÉELLE, PAS UN NOMBRE DE
      // BLOCS. ±8 blocs valaient six kilomètres à 0,75 km/bloc ; à 0,375 ils
      // n'en valent plus que trois, et l'on cherche un sommet dans une
      // fenêtre deux fois plus étroite. Même leçon que les largeurs de Paris
      // à sa remise à l'échelle : ce qui est une longueur du monde réel se
      // reprojette, il ne se recopie pas.
      const parKm = 1 / pr.kmParBloc;                    // blocs par km
      const R = Math.round(6 * parKm);            // six kilomètres à la ronde
      const sommet = (lat, lon) => {
        const { x, z } = blocDe(lat, lon);
        let s = 0;
        for (let dx = -R; dx <= R; dx += Math.max(2, R >> 3)) {
          for (let dz = -R; dz <= R; dz += Math.max(2, R >> 3)) {
            s = Math.max(s, w.terrainHeight(x + dx, z + dz));
          }
        }
        return s;
      };
      const gc = blocDe(36.2, -112.4);
      const RC = Math.round(30 * parKm);          // le Grand Canyon fait trente km de large
      let bord = 0, fond = 99;
      for (let dz = -RC; dz <= RC; dz++) {
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
      const { BLOCK, CITY_BLOCK, DECOR_START, RUE, ARCHI } = await import('./src/blocks.js');
      const w = window.__game.world;
      const raye = (c) => DECOR_START + c * 10 + 5;
      // La palette sobre du réalisme v2 : bordeaux, vert, marine, émeraude,
      // anthracite, crème — les criards (jaune, pourpre, magenta) sont partis.
      const ENS = new Set([raye(0), raye(5), raye(10), raye(6), raye(25), raye(28)]);
      const villes = {};
      for (const cle of ['rome', 'tokyo', 'marrakech']) {
        const p = positionDe(cle);
        const c = { vitrines: 0, portes: 0, enseignes: 0, auvents: 0, lampes: 0, feux: 0,
          bancs: 0, verre: 0, batis: 0 };
        const ids = new Set();
        for (let du = -40; du <= 40; du++) {
          for (let dv = -40; dv <= 40; dv++) {
            const x = p.x + du, z = p.z + dv;
            const sol = w.terrainHeight(x, z);
            const s0 = w.getBlock(x, sol, z);
            for (let dy = 0; dy <= 8; dy++) { const id = w.getBlock(x, sol + dy, z); if (id) ids.add(id); }
            // LE VERRE DANS LE VOLUME BÂTI. Un bâtiment est CREUX : un bloc de
            // verre dans son mur, c'est un trou par lequel on voit au travers.
            for (let dy = 1; dy <= 20; dy++) {
              const id = w.getBlock(x, sol + dy, z);
              if (!id) continue;
              c.batis++;
              if (id === BLOCK.GLASS) c.verre++;
            }
            if (s0 === BLOCK.DARKPLANK) c.portes++;
            // La devanture est DESSINÉE : elle porte sa vitrine et son store
            // dans sa texture, elle est opaque, et elle s'allume la nuit.
            if (s0 === ARCHI.VITRINE) c.vitrines++;
            if (s0 === CITY_BLOCK.SIDEWALK) {
              if (ENS.has(w.getBlock(x, sol + 3, z))) c.auvents++;
              // v180 : le lampadaire est un mesh (RUE.REVERBERE), plus un
              // monolithe à chapeau d'or — et les carrefours ont leurs feux.
              if (w.getBlock(x, sol + 1, z) === RUE.REVERBERE) c.lampes++;
              if (w.getBlock(x, sol + 1, z) === RUE.FEUX) c.feux++;
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
    // 207, Tokyo 594/8/317/165, Marrakech 456/192/631/1075. Les auvents ont
    // rebaissé au réalisme v2 : par segments de trois blocs sur cinq, comme de
    // vrais stores de devanture — le seuil suit (×0,6 sur la mesure de v180).
    const sansDevanture = Object.entries(facades).filter(([, c]) =>
      !(c.vitrines >= 80 && c.portes >= 5 && c.enseignes >= 120 && c.auvents >= 60));
    verifier('les rues ont des devantures : vitrines, portes, enseignes, auvents',
      sansDevanture.length === 0,
      sansDevanture.map(([v]) => v).join(' · ') || JSON.stringify(facades));
    // Marrakech n'a pas de feux tricolores : une médina de ruelles n'en a
    // pas dans la vraie vie non plus — c'est son caractère, pas un manque.
    // UN BÂTIMENT NE SE VOIT PAS AU TRAVERS (v200).
    //
    // C'est la leçon de San Francisco (v195), qui n'avait été portée que dans
    // `sanfrancisco.js` : partout ailleurs, la grammaire des villes posait un
    // bloc de VERRE une colonne sur deux, à tous les étages, et les tours
    // deux rangs sur trois. Comme un bâtiment est creux, on voyait au
    // travers — Rome était faite d'étagères, Tokyo d'un nuage de cubes.
    // Mesuré dans le volume bâti, sur origin/main : Rome 24,7 % de verre,
    // Tokyo 47,4 %, Marrakech 33,3 %. Presque la MOITIÉ de Tokyo était un
    // trou. Une fenêtre est un DESSIN — la baie et la devanture portent leurs
    // meneaux dans leur texture, elles sont opaques, et elles s'allument déjà
    // la nuit. Le seuil est à 2 % : il reste les vitraux des monuments.
    const ajourees = Object.entries(facades).filter(([, c]) => c.verre > c.batis * 0.02);
    verifier('et l\'on ne voit pas au travers des immeubles : le verre est la minorité',
      ajourees.length === 0,
      Object.entries(facades).map(([v, c]) =>
        `${v} ${((c.verre / (c.batis || 1)) * 100).toFixed(1)}%`).join(' · '));

    // ET LES SEPT VILLES BÂTIES À LA MAIN AUSSI (v202).
    //
    // Le remède de la v200 avait été porté aux deux cent soixante-neuf villes
    // engendrées ; les villes écrites à la main le portaient encore, chacune
    // dans son propre fichier. Mesuré dans le volume bâti sur `origin/main` :
    // New York 30,4 % de verre — la pire —, Londres 23,1 %, Nice 18,7 %,
    // Lille 16,4 %, San Francisco 14,2 % hors de son centre, Washington 1,2 %.
    // Seul Paris était déjà propre, parce qu'il utilise les blocs `ARCHI`
    // depuis sa remise à l'échelle. C'est la troisième fois que cette panne
    // se paie ; ce témoin-là couvre le dernier endroit où elle pouvait vivre.
    // ON INTERROGE LE BÂTISSEUR, PAS LE MONDE CHARGÉ. `getBlock` ne répond que
    // sur les morceaux déjà engendrés : sept villes lues sans y aller
    // rendraient zéro bloc partout, et le témoin passerait au vert en ne
    // prouvant rien. Les `batirColonne*` sont des fonctions pures — on leur
    // demande directement ce qu'elles posent, et l'on exige d'avoir compté
    // quelque chose.
    const mains = await tab.evaluate(async () => {
      const { positionDe } = await import('./src/mondes.js');
      const { BLOCK } = await import('./src/blocks.js');
      const modules = {
        ny: [await import('./src/manhattan.js'), 'batirColonne'],
        londres: [await import('./src/londres.js'), 'batirColonneLondres'],
        nice: [await import('./src/nice.js'), 'batirColonneNice'],
        lille: [await import('./src/lille.js'), 'batirColonneLille'],
        sf: [await import('./src/sanfrancisco.js'), 'batirColonneSF'],
        washington: [await import('./src/washington.js'), 'batirColonneWashington'],
        paris: [await import('./src/paris.js'), 'batirColonneParis'],
      };
      const out = {};
      for (const [cle, [mod, nom]] of Object.entries(modules)) {
        const batir = mod[nom];
        const p = positionDe(cle);
        let verre = 0, batis = 0;
        const poser = (dy, id) => { batis++; if (id === BLOCK.GLASS) verre++; };
        for (let du = -40; du <= 40; du++) {
          for (let dv = -40; dv <= 40; dv++) {
            // Washington veut la cote du sol en plus — on la lui donne.
            if (cle === 'washington') batir(p.x + du, p.z + dv, 33, poser);
            else batir(p.x + du, p.z + dv, poser);
          }
        }
        out[cle] = { verre, batis };
      }
      return out;
    });
    // Le seuil est à 2 % : il reste les vitraux et les verrières des monuments
    // — la coupole du Reichstag, la Banque de Chine — qui sont voulus.
    // `batis === 0` compte comme un défaut : un bâtisseur qui ne pose rien ne
    // prouve pas que ses murs sont opaques, il prouve qu'on ne l'a pas appelé.
    const troues = Object.entries(mains).filter(([, c]) => c.batis === 0 || c.verre > c.batis * 0.02);
    verifier('et les villes bâties à la main non plus : leurs murs sont opaques',
      troues.length === 0,
      Object.entries(mains).map(([v, c]) =>
        `${v} ${((c.verre / (c.batis || 1)) * 100).toFixed(1)}%`).join(' · '));

    const sansVie = Object.entries(facades).filter(([v, c]) =>
      !(c.lampes >= 40 && (v === 'marrakech' || c.feux >= 8) && c.bancs >= 25 && c.diversite >= 20));
    verifier('et du mobilier : lampadaires, bancs — et la diversité se compte',
      sansVie.length === 0,
      sansVie.map(([v]) => v).join(' · ')
        || Object.entries(facades).map(([v, c]) => `${v} ${c.diversite} blocs différents`).join(' · '));

    // --- LES ROUTES COMME DE VRAIES ROUTES (réalisme v2, point 2) -----------
    //
    // Max : « les routes ne ressemblent pas à des routes. » La peinture vit
    // désormais DANS la texture — ligne médiane en tirets fins, zébras dans
    // l'axe de la circulation — plus jamais en blocs entièrement blancs :
    // c'est eux qui faisaient des chaussées un damier vu du ciel. On sonde
    // Moscou : zéro bloc de blanc plein au sol, et des marquages texturés
    // présents dans les DEUX orientations. Sur l'ancien code, les centaines
    // de blocs uni(27) de la chaussée font tomber le témoin — vérifié.
    const routes = await tab.evaluate(async () => {
      const { positionDe } = await import('./src/mondes.js');
      const blocs = await import('./src/blocks.js');
      const RB = blocs.ROUTE_BLOCK || {};                  // absent sur l'ancien code
      const w = window.__game.world;
      const p = positionDe('moscou');
      const c = { blancs: 0, ligneNS: 0, ligneEO: 0, passNS: 0, passEO: 0 };
      for (let du = -40; du <= 40; du++) {
        for (let dv = -40; dv <= 40; dv++) {
          const x = p.x + du, z = p.z + dv;
          const s0 = w.getBlock(x, w.terrainHeight(x, z), z);
          if (s0 === blocs.DECOR_START + 270) c.blancs++;  // uni(27), l'ancien blanc plein
          else if (s0 === RB.LIGNE_NS) c.ligneNS++;
          else if (s0 === RB.LIGNE_EO) c.ligneEO++;
          else if (s0 === RB.PASSAGE_NS) c.passNS++;
          else if (s0 === blocs.CITY_BLOCK.CROSSWALK) c.passEO++;
        }
      }
      return c;
    });
    verifier('la chaussée n\'a plus un bloc de blanc plein — la peinture est dans la texture',
      routes.blancs === 0 && routes.ligneNS >= 30 && routes.ligneEO >= 30
      && routes.passNS >= 30 && routes.passEO >= 30,
      JSON.stringify(routes));

    // --- LA GRAMMAIRE À TRAVÉES, GÉNÉRALISÉE (réalisme v2, point 3) ---------
    //
    // Max : « refait une passe sur toutes les villes. » La grammaire du pilote
    // Moscou (étages réguliers, baies encadrées, corniche) devient le défaut
    // de toute ville à trame — chacune avec SES matériaux — SAUF les médinas,
    // qui gardent leur caractère. Preuve : des corniches couronnent Rome et
    // Tokyo (sur l'ancien code, seul Moscou en avait : rouge garanti), et
    // Marrakech n'en a toujours AUCUNE.
    const couronnes = await tab.evaluate(async () => {
      const { positionDe } = await import('./src/mondes.js');
      const { ARCHI } = await import('./src/blocks.js');
      const w = window.__game.world;
      const n = {};
      for (const cle of ['rome', 'tokyo', 'marrakech']) {
        const p = positionDe(cle);
        let c = 0;
        for (let du = -40; du <= 40; du++) {
          for (let dv = -40; dv <= 40; dv++) {
            const x = p.x + du, z = p.z + dv;
            const sol = w.terrainHeight(x, z);
            for (let dy = 3; dy <= 20; dy++) {
              if (w.getBlock(x, sol + dy, z) === ARCHI.CORNICHE) { c++; break; }
            }
          }
        }
        n[cle] = c;
      }
      return n;
    });
    verifier('les corniches couronnent Rome et Tokyo — et la médina n\'en a aucune',
      couronnes.rome >= 200 && couronnes.tokyo >= 200 && couronnes.marrakech === 0,
      JSON.stringify(couronnes));

    // ================= NEW YORK À L'ÉCHELLE GTA =============================
    //
    // Verdict de Max sur les villes bâties à la main : « remettre à
    // l'échelle, beaucoup plus riches, des choses qui se passent, Times
    // Square ». Manhattan est passée de 11,7 à trente-quatre blocs par
    // kilomètre. Trois choses doivent tenir : l'île est bien là de Battery
    // à la 68e Rue, les fleuves l'entourent toujours, et Times Square est
    // un mur d'écrans. À l'ancienne échelle l'île tenait dans un quart de
    // cette emprise : rouge garanti sur les cinq sondes du nord.
    const manhattan = await tab.evaluate(async () => {
      const m = await import('./src/manhattan.js');
      const g = window.__game;
      const sol = (u, v) => g.world.terrainHeight(Math.round(m.NY.x + u), Math.round(m.NY.z + v));
      const lieux = {
        battery: sol(0, m.vDeKm(0.35) - 6),
        wallStreet: sol(0, 128),
        washingtonSq: sol(-6, 17),
        empire: sol(3, m.vDeRue(34)),
        timesSquare: sol(-32, m.vDeRue(45)),
        parc59e: sol(-20, m.vDeRue(62)),
      };
      return {
        lieux,
        surLIle: Object.values(lieux).every((h) => h === m.NY_SOL),
        hudson: sol(-95, 0), eastRiver: sol(95, 0),
        largeur: Math.round(m.demiLargeur(6) * 2),
      };
    });
    verifier('Manhattan tient de Battery à la 68e Rue, plate comme la vraie',
      manhattan.surLIle, JSON.stringify(manhattan.lieux));
    verifier('et ses deux fleuves l\'entourent toujours',
      manhattan.hudson < 26 && manhattan.eastRiver < 26,
      `Hudson ${manhattan.hudson} · East River ${manhattan.eastRiver} · île large de ${manhattan.largeur}`);

    // Times Square : ce qu'on vient y voir, ce sont les écrans. On les
    // compte au-dessus du niveau de la rue, dans les trente blocs autour de
    // la place — des aplats de couleur vive, pas du verre ni de la pierre.
    const ecrans = await tab.evaluate(async () => {
      const m = await import('./src/manhattan.js');
      const { DECOR_START } = await import('./src/blocks.js');
      const g = window.__game;
      const cx = Math.round(m.NY.x - 32), cz = Math.round(m.NY.z + m.vDeRue(45));
      let n = 0;
      for (let dx = -20; dx <= 20; dx++) {
        for (let dz = -24; dz <= 20; dz++) {
          for (let y = m.NY_SOL + 6; y < m.NY_SOL + 50; y++) {
            const id = g.world.getBlock(cx + dx, y, cz + dz);
            // les aplats de pub : des blocs de décor unis et vifs
            if (id >= DECOR_START && (id - DECOR_START) % 10 === 0) n++;
          }
        }
      }
      return n;
    });
    verifier('Times Square est un mur d\'écrans, et ça se compte',
      ecrans >= 300, `${ecrans} blocs d'écran au-dessus de la rue`);

    // ================= LA VILLE ÉCLAIRÉE LA NUIT ============================
    //
    // Max, capture de Moscou à minuit : des réverbères allumés, des feux
    // rouges, des passages piétons — et pas une fenêtre éclairée. Le monde
    // entier partageait UN matériau dont la couleur est le niveau du jour :
    // à minuit tout tombait à trente pour cent, fenêtres comprises. Une
    // ville la nuit, c'est pourtant d'abord des carrés de lumière.
    const nuit = await tab.evaluate(async () => {
      const { positionDe } = await import('./src/mondes.js');
      const g = window.__game;
      const c = positionDe('moscou');
      g.player.pos.set(c.x, g.world.terrainHeight(c.x, c.z) + 20, c.z + 20);
      g.player.vel.set(0, 0, 0);
      window.__setDayTime(0.75);                 // minuit
      // ON ATTEND QUE LA VILLE SOIT LÀ, PAS DEUX SECONDES ET DEMIE.
      //
      // Ce que ce témoin promet, c'est que les fenêtres restent allumées la
      // nuit — pas que trois morceaux de monde se maillent en 2,5 s. Le
      // compte de morceaux ÉCLAIRÉS est un compte de morceaux CHARGÉS : sur
      // un conteneur chargé il tombe à un, et le témoin accuse l'éclairage
      // alors que ses deux autres mesures sont justes (murs à 0,31, fenêtres
      // à 0,92). On attend le résultat, borné dans le temps.
      let vu = window.__lumiere();
      for (let i = 0; i < 30 && vu.morceauxEclaires < 3; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        vu = window.__lumiere();
      }
      return vu;
    });
    verifier('à minuit, les fenêtres de la ville restent allumées',
      nuit.fenetres > nuit.solide * 1.8 && nuit.morceauxEclaires >= 3,
      `murs à ${nuit.solide}, fenêtres à ${nuit.fenetres} · ${nuit.morceauxEclaires} morceaux éclairés`);

    // --- San Francisco à l'échelle GTA (v192) --------------------------------
    //
    // Neuf blocs par kilomètre, c'était un bloc pour CENT ONZE MÈTRES : Market
    // Street faisait trois cents mètres de large. Vingt-sept blocs par
    // kilomètre, et le disque passe de 66 à 220. San Francisco est à dix mille
    // blocs du point d'apparition, donc HORS de la fenêtre d'empreinte de
    // `plafond.js` : la casse ne peut pas s'y prouver, et c'est ce témoin-ci
    // qui la borne. Deux choses doivent tenir : la presqu'île va bien du Ferry
    // Building à Ocean Beach, et le Golden Gate rejoint les deux rives — à
    // l'ancienne échelle il faisait vingt-cinq blocs et s'arrêtait au milieu
    // de l'eau.
    const sf = await tab.evaluate(async () => {
      const m = await import('./src/sanfrancisco.js');
      const g = window.__game;
      // Des adresses en KILOMÈTRES RÉELS depuis le Ferry Building : elles
      // restent justes à toute échelle, un `u`/`v` en dur non. C'est la ville
      // qui les traduit (`adresseSF`), jamais le témoin.
      if (typeof m.adresseSF !== 'function') return { absent: true };
      const points = {
        ferry: [0, 0], twinPeaks: [-5.6, 2.2], mission: [-3, 1.6],
        sunset: [-8, 1], richmond: [-8, -0.5],
        // Bernal Heights : une colline que la ville DÉCLARE, donc elle est
        // forcément à terre. Hunters Point, que j'avais mis ici de mémoire,
        // tombait dans la baie — le témoin avait raison, c'est mon adresse qui
        // était fausse.
        bernal: [-2.4, 4.2],
      };
      const surTerre = {};
      for (const [nom, [dx, dz]] of Object.entries(points)) {
        const [x, z] = m.adresseSF(dx, dz);
        surTerre[nom] = m.surTerreSF(Math.round(x), Math.round(z));
      }
      // Le pont : son tablier doit traverser tout le détroit. À l'ancienne
      // échelle il faisait vingt-cinq blocs et s'arrêtait au milieu de l'eau.
      const blocs = [];
      m.buildGoldenGate((dx, dy, dz) => { if (dy === 11 && dx === -1) blocs.push(dz); });
      const tablier = blocs.length ? Math.max(...blocs) - Math.min(...blocs) + 1 : 0;
      return { rayon: m.SF.r, surTerre, tablier };
    });
    verifier('San Francisco tient du Ferry Building à Ocean Beach',
      !sf.absent && sf.rayon >= 200 && Object.values(sf.surTerre).every(Boolean),
      JSON.stringify(sf));
    verifier('et le Golden Gate traverse vraiment le détroit',
      sf.tablier !== null && sf.tablier >= 60,
      `tablier de ${sf.tablier} blocs`);

    // --- Nice à l'échelle GTA (v203) -----------------------------------------
    //
    // Dix blocs par kilomètre : la baie des Anges tenait en quatre-vingt-seize
    // blocs, la Promenade en trente, et aucune paire d'avenues ne refermait
    // une boucle — Nice n'a jamais eu une voiture. Trente blocs par kilomètre,
    // le disque passe de 48 à 144. Nice est à mille huit cents blocs du point
    // d'apparition, HORS de la fenêtre d'empreinte de `plafond.js` : comme
    // Manhattan et San Francisco, la refonte apporte ses propres témoins. Ce
    // qui doit tenir : la ville va de la Californie à Cimiez et au mont Boron,
    // la mer commence bien au sud de Masséna, le port est en eau, et au moins
    // un circuit de voitures se referme sur de la chaussée.
    const nice = await tab.evaluate(async () => {
      const m = await import('./src/nice.js');
      const g = window.__game;
      // Des adresses en KILOMÈTRES RÉELS depuis la place Masséna : elles
      // restent justes à toute échelle, un `u`/`v` en dur non.
      if (typeof m.adresseNice !== 'function' || typeof m.circuitsNice !== 'function') return { absent: true };
      const points = {
        massena: [0, 0], negresco: [-1.0, 0.03], gare: [-0.7, -0.9], cimiez: [0.3, -1.7],
        californie: [-3.2, 0.2], montBoron: [2.4, 0.1],
      };
      const surTerre = {};
      for (const [nom, [dx, dz]] of Object.entries(points)) {
        const [x, z] = m.adresseNice(dx, dz);
        surTerre[nom] = m.surTerreNice(Math.round(x), Math.round(z));
      }
      // Le rivage relevé passe à cinq cents mètres au sud de Masséna (quinze
      // blocs) : à quatre cents on a les pieds sur les galets, pas dans l'eau
      // — c'est ce que le premier portail a rendu. À sept cents mètres, on
      // est au large.
      const [mx, mz] = m.adresseNice(0, 0.7);
      const enMer = !m.surTerreNice(Math.round(mx), Math.round(mz));
      // Le bassin du port : de l'eau, servie par le bâtisseur pur, pas par le
      // monde chargé.
      const [px, pz] = m.adresseNice(1.65, 0.25);
      const port = m.solNice(Math.round(px), Math.round(pz)) === 7;
      // Les circuits se valident contre le sol de la ville, donc contre
      // `solNice` et le relief — c'est la ville qui juge son propre trajet.
      const solDe = (x, z) => g.world.terrainHeight(x, z);
      const circuits = m.circuitsNice(solDe).map((c) => ({ part: c.part, pts: c.pts.length }));
      return { rayon: m.NICE.r, surTerre, enMer, port, circuits };
    });
    verifier('Nice tient de la Californie à Cimiez et au mont Boron',
      !nice.absent && nice.rayon >= 140 && Object.values(nice.surTerre).every(Boolean),
      JSON.stringify({ absent: nice.absent, rayon: nice.rayon, surTerre: nice.surTerre }));
    verifier('la mer commence au sud de Masséna et le port Lympia est en eau',
      nice.enMer === true && nice.port === true,
      JSON.stringify({ enMer: nice.enMer, port: nice.port }));
    verifier('et des voitures peuvent enfin faire le tour de Nice',
      Array.isArray(nice.circuits) && nice.circuits.length >= 4 && nice.circuits.every((c) => c.part >= 90),
      JSON.stringify(nice.circuits));

    // --- Lille à l'échelle GTA (v204) ----------------------------------------
    //
    // Seize blocs par kilomètre, soixante-deux mètres par bloc : la citadelle
    // faisait un kilomètre de pointe à pointe, le double de la vraie, et
    // aucune paire d'avenues ne refermait une boucle. Trente-deux blocs par
    // kilomètre, le disque passe de 46 à 92. Lille est DANS la fenêtre
    // d'empreinte de `plafond.js`, qui porte la double empreinte ; ici on
    // vérifie la ville elle-même, par ses bâtisseurs purs : elle va de la
    // Citadelle à Euralille, l'étoile a ses douves en eau et le quai du Wault
    // son bassin, et ses circuits de voitures se referment sur la chaussée.
    const lille = await tab.evaluate(async () => {
      const m = await import('./src/lille.js');
      const g = window.__game;
      if (typeof m.adresseLille !== 'function' || typeof m.circuitsLille !== 'function') return { absent: true };
      const EAU = 7;
      // Des adresses en KILOMÈTRES RÉELS depuis la Grand'Place. « Sur terre »
      // veut dire : dans le disque de la ville, et pas dans l'eau.
      const points = {
        grandPlace: [0, 0], citadelle: [-1.55, -0.8], vieuxLille: [-0.15, -0.55],
        euralille: [1.55, -0.35], porteDeParis: [0.35, 0.85], wazemmes: [-0.6, 0.9],
      };
      const surTerre = {};
      for (const [nom, [dx, dz]] of Object.entries(points)) {
        const [x, z] = m.adresseLille(dx, dz);
        const dedans = Math.hypot(x - m.LILLE.x, z - m.LILLE.z) <= m.LILLE.r;
        surTerre[nom] = dedans && m.solLille(Math.round(x), Math.round(z)) !== EAU;
      }
      // Les douves : de l'eau tout autour de l'étoile, comptée dans un carré
      // de quarante blocs autour de son centre. Un anneau autour d'un CERCLE
      // de onze blocs en ferait moins de deux cents ; l'étoile, avec ses
      // cinq pointes et ses cinq rentrants, en compte plus.
      const [cx, cz] = m.adresseLille(-1.55, -0.8);
      let douves = 0;
      for (let du = -20; du <= 20; du++) {
        for (let dv = -20; dv <= 20; dv++) {
          if (m.solLille(Math.round(cx) + du, Math.round(cz) + dv) === EAU) douves++;
        }
      }
      const [wx, wz] = m.adresseLille(-0.85, -0.1);
      const wault = m.solLille(Math.round(wx), Math.round(wz)) === EAU;
      const [ex, ez] = m.adresseLille(-2.3, -0.2);
      const deule = m.solLille(Math.round(ex), Math.round(ez)) === EAU;
      const solDe = (x, z) => g.world.terrainHeight(x, z);
      const circuits = m.circuitsLille(solDe).map((c) => ({ part: c.part, pts: c.pts.length }));
      return { rayon: m.LILLE.r, surTerre, douves, wault, deule, circuits };
    });
    verifier('Lille tient de la Citadelle à Euralille, et de Wazemmes à la porte de Paris',
      !lille.absent && lille.rayon >= 90 && Object.values(lille.surTerre).every(Boolean),
      JSON.stringify({ absent: lille.absent, rayon: lille.rayon, surTerre: lille.surTerre }));
    verifier('la citadelle est une étoile, ses douves en eau, le Wault et la Deûle aussi',
      lille.douves >= 200 && lille.wault === true && lille.deule === true,
      JSON.stringify({ douves: lille.douves, wault: lille.wault, deule: lille.deule }));
    verifier('et des voitures peuvent enfin faire le tour de Lille',
      Array.isArray(lille.circuits) && lille.circuits.length >= 5 && lille.circuits.every((c) => c.part >= 90),
      JSON.stringify(lille.circuits));

    // --- WASHINGTON : DES RONDS-POINTS QUI ROULENT, ET DES CIRCUITS QUI LES
    // CONTOURNENT --------------------------------------------------------------
    //
    // Jusqu'en v204 la capitale n'avait AUCUN circuit : un carré posé au
    // hasard sur le plan de L'Enfant ne trouve jamais une rue, et ses
    // diagonales traversent quatorze ronds-points dont l'anneau entier était
    // un trottoir. Trois témoins, tous par le bâtisseur pur `solWashington`
    // et par la fiche `CERCLES` — jamais par un (u, v) en dur : chaque cercle a
    // une chaussée qui en fait le tour (huit points sur huit à r − 2) et un
    // jardin au milieu ; les circuits déclarés se referment sur la chaussée ;
    // et aucun d'eux ne coupe un jardin, échantillonné bloc par bloc le long
    // de chaque segment — un circuit qui passe entre deux points de passage
    // peut couper ce que ses sommets évitent.
    const dc = await tab.evaluate(async () => {
      const m = await import('./src/washington.js');
      const b = await import('./src/blocks.js');
      const g = window.__game;
      if (typeof m.circuitsWashington !== 'function' || !Array.isArray(m.CERCLES)) return { absent: true };
      const ROULANT = new Set([b.CITY_BLOCK.ASPHALT, b.CITY_BLOCK.ROADLINE, b.CITY_BLOCK.CROSSWALK]);
      const sol = (u, v) => m.solWashington(Math.round(m.WASHINGTON.x + u), Math.round(m.WASHINGTON.z + v));
      const anneaux = m.CERCLES.map((c) => {
        let roule = 0;
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          if (ROULANT.has(sol(c.u + (c.r - 2) * Math.cos(a), c.v + (c.r - 2) * Math.sin(a)))) roule++;
        }
        return { nom: c.nom, roule, centre: ROULANT.has(sol(c.u, c.v)) };
      });
      const solDe = (x, z) => g.world.terrainHeight(x, z);
      const circuits = m.circuitsWashington(solDe).map((c) => {
        let jardin = 0, pas = 0;
        for (let i = 0; i < c.pts.length; i++) {
          const a = c.pts[i], z = c.pts[(i + 1) % c.pts.length];
          const n = Math.max(1, Math.ceil(Math.hypot(z.x - a.x, z.z - a.z)));
          for (let k = 0; k < n; k++) {
            const u = a.x + ((z.x - a.x) * k) / n - m.WASHINGTON.x;
            const v = a.z + ((z.z - a.z) * k) / n - m.WASHINGTON.z;
            pas++;
            if (m.CERCLES.some((o) => Math.hypot(u - o.u, v - o.v) < o.r - 3)) jardin++;
          }
        }
        return { part: c.part, pts: c.pts.length, pas, jardin };
      });
      return { anneaux, circuits };
    });
    verifier('chaque rond-point de Washington a une chaussée qui en fait le tour, et un jardin au milieu',
      !dc.absent && dc.anneaux.length >= 14 && dc.anneaux.every((a) => a.roule === 8 && a.centre === false),
      JSON.stringify(dc.absent ? dc : dc.anneaux.filter((a) => a.roule < 8 || a.centre)));
    verifier('des voitures font le tour du Mall, de Penn Quarter, de Georgetown et de Capitol Hill',
      !dc.absent && dc.circuits.length >= 10 && dc.circuits.every((c) => c.part >= 90),
      JSON.stringify(dc.absent ? dc : dc.circuits.map((c) => c.part)));
    verifier('et aucun circuit ne traverse le jardin d\'un rond-point : il en fait le tour',
      !dc.absent && dc.circuits.length > 0 && dc.circuits.every((c) => c.pas > 0 && c.jardin === 0),
      JSON.stringify(dc.absent ? dc : dc.circuits.map((c) => [c.pas, c.jardin])));

    // --- LONDRES : DES AVENUES QUI SE CROISENT, ET DES BOUCLES QUI COUVRENT
    // LA VILLE -----------------------------------------------------------------
    //
    // Jusqu'en v205 Londres n'avait qu'UN circuit, le triangle de Mayfair à
    // 96 % : ses avenues étaient tracées bout à bout sans se croiser, et une
    // chaîne d'avenues ne se referme que sur des CARREFOURS. Quatre témoins,
    // tous par le bâtisseur pur `solLondres` et par le registre
    // `VOIES_LONDRES` — jamais par un (u, v) en dur :
    //   - au moins quatorze circuits, tous à 90 % sur la rue ;
    //   - presque chaque avenue nommée est sur une boucle (le seul cul-de-sac
    //     déclaré, Euston Road côté King's Cross, est une dette de TASKS.md) ;
    //   - aucun circuit ne met un pas dans l'eau ni dans un parc,
    //     échantillonné bloc par bloc le long de chaque segment ;
    //   - aucun virage de plus de 150° : une chaîne dont la mesure vaut 100 %
    //     peut faire DEMI-TOUR au milieu d'un carrefour, et un convoi qui
    //     se replie sur lui-même n'est pas une circulation.
    const ldn = await tab.evaluate(async () => {
      const m = await import('./src/londres.js');
      const b = await import('./src/blocks.js');
      const g = window.__game;
      if (typeof m.circuitsLondres !== 'function' || !Array.isArray(m.VOIES_LONDRES)) return { absent: true };
      const L = m.LONDRES;
      const solDe = (x, z) => g.world.terrainHeight(x, z);
      const PAS_ROUTE = new Set([b.BLOCK.WATER, b.BLOCK.GRASS, b.BLOCK.LEAVES]);
      const brut = m.circuitsLondres(solDe);
      const circuits = brut.map((c) => {
        let mauvais = 0, pas = 0;
        for (let i = 0; i < c.pts.length; i++) {
          const a = c.pts[i], z = c.pts[(i + 1) % c.pts.length];
          const n = Math.max(1, Math.ceil(Math.hypot(z.x - a.x, z.z - a.z)));
          for (let k = 0; k < n; k++) {
            const x = Math.round(a.x + ((z.x - a.x) * k) / n);
            const zz = Math.round(a.z + ((z.z - a.z) * k) / n);
            pas++;
            const sol = m.solLondres(x, zz);
            if (PAS_ROUTE.has(sol) || (sol === null && m.distanceTamise(x - L.x, zz - L.z) < 5)) mauvais++;
          }
        }
        // Les virages : on retire les doublons et le point de fermeture,
        // sinon un segment nul rend un angle NaN.
        const p = [];
        for (const q of c.pts) {
          const d = p[p.length - 1];
          if (!d || d.x !== q.x || d.z !== q.z) p.push(q);
        }
        if (p.length > 1 && p[0].x === p[p.length - 1].x && p[0].z === p[p.length - 1].z) p.pop();
        let virage = 0;
        for (let i = 0; i < p.length; i++) {
          const a = p[(i + p.length - 1) % p.length], o = p[i], z = p[(i + 1) % p.length];
          const ax = o.x - a.x, az = o.z - a.z, bx = z.x - o.x, bz = z.z - o.z;
          const n = Math.hypot(ax, az) * Math.hypot(bx, bz);
          if (!n) continue;
          const deg = (Math.acos(Math.max(-1, Math.min(1, (ax * bx + az * bz) / n))) * 180) / Math.PI;
          if (deg > virage) virage = deg;
        }
        return { part: c.part, pts: c.pts.length, pas, mauvais, virage: Math.round(virage) };
      });
      // Une avenue est couverte si chacun de ses points de passage est un
      // sommet d'un circuit — c'est ainsi que les circuits sont chaînés.
      const sommets = new Set(brut.flatMap((c) => c.pts.map((q) => `${Math.round(q.x)},${Math.round(q.z)}`)));
      const sansBoucle = m.VOIES_LONDRES
        .filter((v) => !v.pts.every(([u, w]) => sommets.has(`${Math.round(L.x + u)},${Math.round(L.z + w)}`)))
        .map((v) => v.nom);
      return { circuits, voies: m.VOIES_LONDRES.length, sansBoucle };
    });
    verifier('des voitures font le tour de la City, de Westminster, de Bloomsbury et de la rive sud',
      !ldn.absent && ldn.circuits.length >= 14 && ldn.circuits.every((c) => c.part >= 90),
      JSON.stringify(ldn.absent ? ldn : ldn.circuits.map((c) => c.part)));
    verifier('et presque chaque avenue de Londres est sur une boucle',
      !ldn.absent && ldn.voies >= 60 && ldn.sansBoucle.length <= 1
      && ldn.sansBoucle.every((n) => n === "Euston Road, côté King's Cross"),
      JSON.stringify(ldn.absent ? ldn : { voies: ldn.voies, sansBoucle: ldn.sansBoucle }));
    verifier('aucun circuit ne met un pas dans la Tamise ni dans un parc',
      !ldn.absent && ldn.circuits.length > 0 && ldn.circuits.every((c) => c.pas > 0 && c.mauvais === 0),
      JSON.stringify(ldn.absent ? ldn : ldn.circuits.map((c) => [c.pas, c.mauvais])));
    verifier('et aucun ne fait demi-tour au milieu d\'un carrefour',
      !ldn.absent && ldn.circuits.length > 0 && ldn.circuits.every((c) => c.virage <= 150),
      JSON.stringify(ldn.absent ? ldn : ldn.circuits.map((c) => c.virage)));

    // --- LES PARCS DU TOUR DU MONDE ONT DE VRAIS ARBRES ---------------------
    //
    // `solVillesMonde` marque des arbres dans ses parcs, ses oasis et ses
    // forêts — le Tiergarten de Berlin, le Retiro de Madrid, le jardin
    // anglais de Munich. La boucle qui dessine le monde les posait À PLAT,
    // comme n'importe quel identifiant de sol : vus du ciel, de belles taches
    // vertes ; vus de la rue, de la pelouse d'une autre nuance.
    //
    // C'est le défaut de Paris (v187), puis de Londres, Nice et Lille (v197),
    // une QUATRIÈME fois — et cette fois pour cinquante villes d'un coup. Ce
    // qui distingue un arbre d'une pelouse n'est pas sa couleur : c'est du
    // tronc au-dessus du sol, et du feuillage au-dessus du tronc.
    const bois = await tab.evaluate(async () => {
      const M = await import('./src/mondes.js');
      const { VILLES_MONDE } = await import('./src/villesmonde.js');
      const g = window.__game;
      const LOG = 5, LEAVES = 6;
      const b = M.positionDe('berlin');
      // LE TIERGARTEN SE DEMANDE À LA FICHE, IL NE SE RECOPIE PAS. Ce point
      // était écrit `b.x - 47, b.z + 12` — les unités de la fiche prises pour
      // des blocs du monde. La remise à l'échelle de la v200 l'a déplacé de
      // quarante blocs et le témoin a cherché des arbres dans une rue : « 0
      // arbres · 0 feuillage » — pas « le parc a perdu ses arbres », mais « je
      // ne suis pas dans le parc ». Un témoin qui vise un (u, v) en dur meurt
      // à la prochaine échelle, et il meurt en accusant le mauvais coupable.
      const berlin = VILLES_MONDE.find((f) => f.cle === 'berlin');
      const parc = berlin.parcs[0];
      const cx = Math.round(b.x + parc.cu * berlin.K), cz = Math.round(b.z + parc.cv * berlin.K);
      g.player.pos.set(cx, g.world.sommetColonne(cx, cz) + 30, cz);
      await new Promise((r) => setTimeout(r, 9000));
      let arbres = 0, feuillesAuSol = 0;
      for (let du = -10; du <= 10; du++) {
        for (let dv = -12; dv <= 12; dv++) {
          const x = cx + du, z = cz + dv;
          const h = g.world.terrainHeight(x, z);
          // un arbre : du tronc juste au-dessus du sol, du feuillage plus haut
          const tronc = g.world.getBlock(x, h + 1, z) === LOG
            && g.world.getBlock(x, h + 2, z) === LOG;
          const couronne = g.world.getBlock(x, h + 4, z) === LEAVES
            || g.world.getBlock(x, h + 5, z) === LEAVES;
          if (tronc && couronne) arbres++;
          // une feuille POSÉE AU SOL, c'est le défaut : de la pelouse verte
          if (g.world.getBlock(x, h, z) === LEAVES) feuillesAuSol++;
        }
      }
      return { arbres, feuillesAuSol };
    });
    verifier('les parcs du tour du monde ont de vrais arbres, pas des aplats',
      bois.arbres >= 8 && bois.feuillesAuSol === 0,
      `${bois.arbres} arbres · ${bois.feuillesAuSol} feuillage(s) posé(s) à plat`);

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
