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

    // --- LE TOUR DU MONDE : les monuments se dressent-ils VRAIMENT ? --------
    //
    // Vingt et un monuments étaient bâtis au bloc près dans src/monuments.js et
    // aucun ne se dressait nulle part : on ne pouvait que les poser soi-même
    // depuis le menu du constructeur. Le témoin ne demande donc pas « le
    // monument est-il déclaré » — il l'était déjà — mais « y a-t-il vraiment de
    // la pierre à cet endroit du monde, et jusqu'à sa vraie hauteur ».
    const debout = await tab.evaluate(async () => {
      const [cap, mon] = await Promise.all([
        import('./src/capitales.js'), import('./src/monuments.js'),
      ]);
      const w = window.__game.world;
      const out = [];
      for (const s2 of cap.SITES) {
        const p = cap.positionSite(s2.cle);
        for (const m of s2.monuments) {
          const b = mon.monumentBati(m.id);
          const x = p.x + m.du, z = p.z + m.dv;
          const R = Math.ceil(Math.max(b.emprise.l, b.emprise.p) / 2) + 2;
          const sol = w.terrainHeight(x, z);
          let blocs = 0;
          for (let dx = -R; dx <= R; dx += 2) {
            for (let dz = -R; dz <= R; dz += 2) {
              for (let y = sol; y < sol + b.emprise.h + 4; y++) {
                if (w.getBlock(x + dx, y, z + dz)) blocs++;
              }
            }
          }
          // LA FLÈCHE SE VÉRIFIE À SON ADRESSE EXACTE.
          //
          // Un balayage de deux en deux rate une flèche large d'un bloc et
          // annonce Big Ben tronqué à 64 sur 70 alors qu'il est entier : c'est
          // l'échantillonnage qui manque le sommet, pas le monument. On demande
          // donc au modèle OÙ est son point le plus haut, et on regarde cette
          // colonne-là — c'est à la fois exact et bien moins coûteux.
          const e = b.emprise;
          const cx = Math.round((e.minX + e.maxX) / 2);
          const cz = Math.round((e.minZ + e.maxZ) / 2);
          let sommet = b.blocs[0];
          for (const bl of b.blocs) if (bl[1] > sommet[1]) sommet = bl;
          const fx = x + (sommet[0] - cx), fz = z + (sommet[2] - cz);
          const yFleche = sol + (sommet[1] - e.minY) + 1;
          let hMax = 0;
          for (let y = sol; y < sol + e.h + 4; y++) if (w.getBlock(fx, y, fz)) hMax = y - sol;
          out.push({ nom: b.nom, ville: p.nom, blocs, hMax, attendu: e.h, sol,
            fleche: w.getBlock(fx, yFleche, fz) !== 0 });
        }
      }
      return out;
    });
    // Huit monuments sur parvis : Big Ben et Tower Bridge ont déménagé dans
    // Londres, devenue une ville entière — ils sont éprouvés avec elle, dans
    // carte.js, au milieu de leurs rues.
    verifier('les huit monuments du tour du monde se dressent pour de vrai',
      debout.length === 8 && debout.every((m) => m.blocs > 50),
      debout.filter((m) => m.blocs <= 50).map((m) => `${m.nom} : ${m.blocs} blocs`).join(' · ')
        || `${debout.length} monuments`);
    // Et à leur VRAIE hauteur : un monument tronqué au bord d'un morceau de
    // terrain passerait le test précédent sans que sa flèche existe.
    const tronques = debout.filter((m) => !m.fleche);
    verifier('et aucun n\'est tronqué : chacun monte jusqu\'à sa flèche',
      tronques.length === 0,
      tronques.map((m) => `${m.nom} : ${m.hMax}/${m.attendu}`).join(' · ')
        || debout.map((m) => `${m.nom} ${m.hMax}`).join(', '));
    // Chacun se tient sur un parvis, pas dans un trou ni sur un pic.
    const malAssis = debout.filter((m) => m.sol !== 34);
    verifier('chacun repose sur un parvis de plain-pied',
      malAssis.length === 0,
      malAssis.map((m) => `${m.nom} : sol ${m.sol}`).join(' · ') || 'tous à la cote 34');

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
