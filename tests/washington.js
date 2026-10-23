// Washington : la capitale, ses bâtiments ouverts, et son métro.
//
// Trois choses ont été demandées, et ce sont exactement les trois que ces
// scénarios éprouvent — non pas comme un mécanicien qui vérifie une fonction,
// mais comme un enfant qui arrive :
//
//   1. la ville est là, à sa place, et le Mall se lit du Capitole au Lincoln ;
//   2. **on entre dans les bâtiments** : on pousse une porte et on est dedans,
//      avec un plafond au-dessus de la tête ;
//   3. **on prend le métro** : on descend l'escalier depuis la rue, on attend
//      sur le quai, une rame arrive, on monte, elle nous emmène.
//
// Chacun de ces trois-là est rouge sur la version d'avant : la ville n'existe
// pas, donc `world.cityAt` ne renvoie rien, et le tracé du métro est vide.
//
//     cd tests && npm install && npm run washington

const { Banc, dormir } = require('./banc.js');
const path = require('path');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

const bouton = (p, id) => p.evaluate((id) => {
  const b = document.getElementById(id);
  if (!b) return { existe: false, visible: false, texte: '' };
  const rangee = b.closest('.fun-target');
  const visible = getComputedStyle(b).display !== 'none'
    && (!rangee || getComputedStyle(rangee).display !== 'none');
  return { existe: true, visible, texte: b.textContent.trim(), quoi: b.dataset.quoi || '', pastille: !!b.querySelector('.pastille') };
}, id);

const pose = (p) => p.evaluate(() => {
  const g = window.__game;
  return { x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z };
});

// Se poser quelque part, debout, sans voler.
const poserLe = (p, x, y, z, yaw = 0) => p.evaluate(({ x, y, z, yaw }) => {
  const g = window.__game;
  g.player.flying = false;
  g.player.pos.set(x + 0.5, y, z + 0.5);
  g.player.vel.set(0, 0, 0);
  g.player.yaw = yaw;
}, { x, y, z, yaw });

// Ce qu'il y a autour de l'enfant, là où il se tient : du plein au-dessus de la
// tête, c'est qu'on est à l'intérieur de quelque chose.
const autour = (p) => p.evaluate(() => {
  const g = window.__game, w = g.world;
  const x = Math.floor(g.player.pos.x), y = Math.floor(g.player.pos.y), z = Math.floor(g.player.pos.z);
  let plafond = -1;
  for (let h = y + 2; h < y + 30; h++) if (w.getBlock(x, h, z) !== 0) { plafond = h - y; break; }
  const murs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .filter(([dx, dz]) => w.getBlock(x + dx, y, z + dz) !== 0).length;
  // On rend aussi OÙ l'on est : « plafond à 2 » sans position recouvre trois
  // pannes — coincé dans la porte, resté sur le perron, tombé à côté — et
  // un rouge qui ne les distingue pas ne se démonte pas.
  return { plafond, murs, sousLesPieds: w.getBlock(x, y - 1, z), x, y, z, px: g.player.pos.x, pz: g.player.pos.z };
});

// Le cap qui mène dans une direction donnée. Le joueur avance vers
// (-sin yaw, -cos yaw) — c'est écrit dans player.js, et se tromper de signe
// fait marcher l'enfant dans l'autre sens sans que rien ne le dise.
const capVers = (dx, dz) => Math.atan2(-dx, -dz);

// Marcher, en sautant : dans ce jeu il n'y a pas de pas automatique, et une
// marche d'un bloc — un perron, un escalier — se franchit en sautant. C'est ce
// que fait un enfant, doigt sur la barre d'espace.
const avancer = async (p, ms) => {
  await p.keyboard.down('KeyW');
  await p.keyboard.down('Space');
  await dormir(ms);
  await p.keyboard.up('Space');
  await p.keyboard.up('KeyW');
  await dormir(250);
};

// Descendre, sans sauter : on ne saute que pour MONTER. Sauter en descendant
// un escalier fait rebondir d'une marche à l'autre et on n'arrive jamais.
const descendre = async (p, ms) => {
  await p.keyboard.down('KeyW');
  await dormir(ms);
  await p.keyboard.up('KeyW');
  await dormir(250);
};

(async () => {
  // Sur l'ancien code, le module n'existe pas. Le témoin doit alors ÉCHOUER,
  // pas s'effondrer : un banc qui plante au premier scénario masque les quinze
  // suivants, et on ne voit jamais l'étendue de ce qui manque.
  const D = await import('../src/washington.js').catch(() => null);
  if (!D) {
    verifier('la capitale existe', false, 'src/washington.js est absent');
    console.log('\n❌ 1 échec(s)');
    process.exit(1);
  }
  const P = D.WASHINGTON;
  const PAS_ILOT = 12;  // la trame de la ville : une rue dessinée tous les douze blocs
  // --- 0. ce qui se vérifie sans navigateur --------------------------------
  //
  // La ville est bâtie à seize blocs par kilomètre alors que ses monuments sont
  // dessinés cinq à sept fois trop grands : à leur adresse exacte, ils se
  // marcheraient dessus. Leurs positions ont donc été résolues une fois et
  // figées. Ces trois contrôles-là sont la raison pour laquelle on peut les
  // figer sans crainte : si quelqu'un déplace un monument d'un bloc, ou change
  // le cours du Potomac, ils le disent tout de suite.
  const M = await import('../src/dcmonuments.js');
  const FN = {
    'Capitole des États-Unis': 'buildCapitole', 'Monument de Washington': 'buildObelisque',
    'Lincoln Memorial': 'buildLincoln', 'Mémorial de la Seconde Guerre mondiale': 'buildMemorialGuerre',
    "Galerie nationale d'art — Est": 'buildNGAEst', "Galerie nationale d'art": 'buildGalerieArt',
    "Musée d'Histoire naturelle": 'buildHistoireNaturelle', "Musée d'Histoire américaine": 'buildHistoireAmericaine',
    'Musée afro-américain': 'buildAfroAmericain', "Musée de l'Indien d'Amérique": 'buildIndienAmerique',
    "Musée de l'Air et de l'Espace": 'buildAirEspace', 'Hirshhorn': 'buildHirshhorn',
    'Arts et Industries': 'buildArtsIndustries', 'Château du Smithsonian': 'buildChateauSmithsonian',
    'Galerie Freer': 'buildFreer', 'Maison-Blanche': 'buildMaisonBlanche', 'Le Trésor': 'buildTresor',
    'Archives nationales': 'buildArchives', 'Arc de Chinatown': 'buildArcChinatown',
    'Théâtre Ford': 'buildFordTheatre', 'Cour suprême': 'buildCourSupreme',
    'Bibliothèque du Congrès': 'buildBibliotheque', 'Union Station': 'buildUnionStation',
    'Mémorial des vétérans du Vietnam': 'buildVietnam', 'Mémorial de la guerre de Corée': 'buildCoree',
    'Mémorial Martin Luther King': 'buildMLK', 'Mémorial Roosevelt': 'buildRoosevelt',
    'Mémorial Jefferson': 'buildJefferson', 'Kennedy Center': 'buildKennedyCenter',
    'Pentagone': 'buildPentagone', 'Tombe du Soldat inconnu': 'buildSoldatInconnu',
    'Mémorial Iwo Jima': 'buildIwoJima', 'Pont du Mémorial': 'buildPontMemorial',
    'Pont de la 14e Rue': 'buildPont14e', 'Key Bridge': 'buildKeyBridge',
  };
  const emprises = D.MONUMENTS_DC.map((m) => {
    const cols = new Set();
    M[FN[m.nom]]((dx, dy, dz) => cols.add(`${m.u + dx},${m.v + dz}`));
    return { ...m, cols };
  });
  verifier('les trente-cinq repères de la capitale sont tous dessinés',
    emprises.length === 35 && emprises.every((m) => m.cols.size > 0), `${emprises.length}`);

  const collisions = [];
  for (let i = 0; i < emprises.length; i++) {
    if (emprises[i].pont) continue;   // un pont touche ce qu'il dessert
    for (let j = i + 1; j < emprises.length; j++) {
      if (emprises[j].pont) continue;
      const n = [...emprises[j].cols].filter((k) => emprises[i].cols.has(k)).length;
      if (n) collisions.push(`${emprises[i].nom} × ${emprises[j].nom} (${n})`);
    }
  }
  verifier('et aucun ne se pose sur un autre', collisions.length === 0,
    collisions.slice(0, 3).join(' ; '));

  const mouilles = emprises.filter((m) => !m.eau
    && [...m.cols].some((k) => D.surEauWashington(...k.split(',').map(Number))));
  verifier('aucun n\'a les pieds dans le fleuve', mouilles.length === 0,
    mouilles.map((m) => m.nom).join(', '));

  const debordent = emprises.filter((m) => [...m.cols].some((k) => {
    const [u, v] = k.split(',').map(Number);
    return Math.abs(u - m.u) > m.bu || Math.abs(v - m.v) > m.bv;
  }));
  verifier('et chacun tient dans la boîte qu\'il annonce', debordent.length === 0,
    debordent.map((m) => m.nom).join(', '));

  const bouchesNoyees = D.BOUCHES_METRO.filter((b) => {
    for (let d = 6; d <= b.longueur + 2; d++) {
      if (D.surEauWashington(b.u + b.nu * d, b.v + b.nv * d)) return true;
    }
    return false;
  });
  verifier('et les vingt bouches de métro sortent au sec',
    bouchesNoyees.length === 0 && D.BOUCHES_METRO.length === 20,
    bouchesNoyees.map((b) => b.nom).join(', ') || `${D.BOUCHES_METRO.length} bouches`);

  // --- Le métro sous toute la boîte, pas seulement le cercle (v478) --------
  // La ville s'arrête au cercle du registre (187 blocs) ; la boîte et les
  // tiroirs des terminus vont au-delà. Sur l'ancien code, rien n'y était
  // creusé : 309 points de la Bleue sur 986 avaient un bloc plein dans le
  // gabarit, et les quais d'Arlington Cemetery et de Pentagon étaient de la
  // pierre. Le témoin lit le MONDE engendré (`getBlock`), comme la rame.
  {
    const { World, DATE_METRO_BOITE_DC } = await import('../src/world.js');
    const { isSolid, BLOCK } = await import('../src/blocks.js');
    const w = new World();
    const murs = [];
    for (const l of D.LIGNES) {
      let n = 0;
      for (const p of D.traceLigneMetro(l.nom)) {
        const x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z);
        if ([1, 2, 3].some((k) => isSolid(w.getBlock(x, y + k, z)))) n++;
      }
      if (n) murs.push(`${l.nom} ${n}`);
    }
    verifier('aucune rame ne roule dans la roche, même hors du cercle de la ville',
      murs.length === 0, murs.join(', ') || 'zéro point de voie avec un bloc dans le gabarit');
    // Le quai : à deux blocs du centre le long de la voie (ni pylône, ni banc),
    // un sol de carrelage et deux blocs d'air au-dessus.
    // Depuis la v529 les pylônes du nom et les bancs se choisissent contre
    // les points de voie (`q.pylones`, `q.bancs`) et peuvent tomber à deux
    // blocs du centre : on prend la case la plus proche qui n'en porte aucun.
    const libre = (q) => {
      // et, sur un quai central, l'escalier qui monte à la passerelle occupe
      // l'axe de `k0 − 1` à `k0 + 6` (`libreK`, washington.js)
      const occ = [...(q.pylones || []), ...(q.bancs || [])];
      const k0 = q.k0 ?? -99;
      return [2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7].find((le) => {
        const kk = le * (q.fin || 1);
        return occ.every((k) => Math.abs(k - kk) > 1) && (kk < k0 - 1 || kk > k0 + 6);
      }) ?? 2;
    };
    const quais = D.QUAIS_METRO.filter((q) => {
      const le = libre(q);
      const x = D.WASHINGTON.x + Math.round(q.u + q.du * le), z = D.WASHINGTON.z + Math.round(q.v + q.dv * le);
      return isSolid(w.getBlock(x, q.y + 2, z)) || isSolid(w.getBlock(x, q.y + 3, z))
        || w.getBlock(x, q.y + 1, z) === BLOCK.STONE;
    });
    verifier('et chaque quai est praticable, Arlington Cemetery et Pentagon compris',
      quais.length === 0, quais.map((q) => q.nom).join(', ') || `${D.QUAIS_METRO.length} quais`);
    // Un bloc d'enfant posé hors du cercle avant la date : la bouche ne creuse
    // pas sous sa maison (le sol reste), le tunnel profond passe toujours.
    if (typeof D.creuserMetroWashington !== 'function' || !DATE_METRO_BOITE_DC) {
      verifier('et une bouche hors du cercle ne creuse pas sous ce qu\'un enfant a bâti', false,
        'creuserMetroWashington absent');
    } else {
      let cible = null;
      for (let u = D.BOITE.u0; u <= D.BOITE.u1 && !cible; u++) for (let v = D.BOITE.v0; v <= D.BOITE.v1 && !cible; v++) {
        if (Math.hypot(u, v) < 195) continue;
        const x = D.WASHINGTON.x + u, z = D.WASHINGTON.z + v;
        if (w.cityAt(x, z) || D.dansEauWashington(x, z)) continue;
        const h = w.terrainHeight(x, z);
        let creuse = false;
        D.creuserMetroWashington(x, z, h, (dy, id) => { if (dy === 0 && id === BLOCK.AIR) creuse = true; });
        if (creuse) cible = { x, z, h };
      }
      // et un second bloc posé au-dessus de la Bleue, à Arlington : sous lui,
      // le tunnel (quatorze blocs sous le sol) se creuse quand même
      const voie = D.traceLigneMetro('Bleue').find((p) => Math.hypot(p.x - D.WASHINGTON.x, p.z - D.WASHINGTON.z) > 200
        && !w.cityAt(Math.floor(p.x), Math.floor(p.z)) && !D.dansEauWashington(Math.floor(p.x), Math.floor(p.z)));
      const vx = Math.floor(voie.x), vz = Math.floor(voie.z), vy = Math.floor(voie.y);
      const garde = new World();
      const k = `${cible.x},${cible.h + 1},${cible.z}`;
      const k2 = `${vx},${w.terrainHeight(vx, vz) + 1},${vz}`;
      garde.installerEdits(new Map([[k, BLOCK.PLANK], [k2, BLOCK.PLANK]]),
        new Map([[k, DATE_METRO_BOITE_DC - 3600e3], [k2, DATE_METRO_BOITE_DC - 3600e3]]));
      const apres = new World();
      apres.installerEdits(new Map([[k, BLOCK.PLANK]]), new Map([[k, DATE_METRO_BOITE_DC + 3600e3]]));
      const sousGarde = garde.getBlock(cible.x, cible.h, cible.z), sousApres = apres.getBlock(cible.x, cible.h, cible.z);
      const murs2 = [1, 2, 3].filter((d) => isSolid(garde.getBlock(vx, vy + d, vz))).length;
      verifier('et une bouche hors du cercle ne creuse pas sous ce qu\'un enfant a bâti',
        isSolid(sousGarde) && sousApres === BLOCK.AIR && murs2 === 0,
        `(${cible.x - D.WASHINGTON.x}, ${cible.z - D.WASHINGTON.z}) : sol ${sousGarde} sous le bloc d'avant, ${sousApres} sous celui d'après, ${murs2} bloc(s) dans le gabarit sous le bloc posé au-dessus de la Bleue en (${vx - D.WASHINGTON.x}, ${vz - D.WASHINGTON.z})`);
    }
  }

  // --- Les panneaux à lire sur place : la règle, sous node (v460) -----------
  // Une horloge fabriquée : on éprouve « une fois par visite », « jamais en
  // rafale » et « une visite neuve rouvre le panneau » sans dépendre de la
  // cadence du banc. Sur l'ancien code le module n'existe pas : rouge propre.
  const G = await import('../src/guides.js').catch(() => null);
  if (!G) {
    verifier('des panneaux racontent Washington sur place', false, 'src/guides.js est absent');
  } else {
    let t = 0; const dits = [];
    const gd = G.creerGuides({ dire: (x) => dits.push(x), maintenant: () => t });
    const L = G.GUIDES_DC.find((g) => g.id === 'lincoln');
    const O = G.GUIDES_DC.find((g) => g.id === 'obelisque');
    const C = G.GUIDES_DC.find((g) => g.id === 'cerisiers');
    // On marche vers le Lincoln, puis on tourne autour pendant vingt secondes.
    for (let k = 40; k >= -6; k--) { t += 300; gd.update(L.x + k, L.z); }
    const unSeul = dits.length;
    // On s'éloigne franchement, on revient : visite neuve.
    for (let k = 0; k <= 45; k++) { t += 300; gd.update(L.x + k, L.z); }
    for (let k = 45; k >= 0; k--) { t += 300; gd.update(L.x + k, L.z); }
    const apresRetour = dits.length;
    // Deux lieux en même temps (rayons élargis à dessein) : jamais deux panneaux
    // à moins d'ESPACEMENT_MS, mais le second finit par passer.
    let t2 = 0; const temps = [];
    const g2 = G.creerGuides({ dire: () => temps.push(t2), maintenant: () => t2,
      guides: [{ ...O, r: 200 }, { ...C, r: 200 }] });
    for (let i = 0; i < 80; i++) { t2 += 250; g2.update(O.x, O.z); }
    const ecart = temps.length === 2 ? temps[1] - temps[0] : 0;
    const chevauchent = [];
    for (const a of G.GUIDES_DC) for (const b of G.GUIDES_DC) {
      if (a.id < b.id && Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r) chevauchent.push(`${a.id}/${b.id}`);
    }
    verifier('des panneaux racontent Washington sur place',
      G.GUIDES_DC.length >= 7 && unSeul === 1 && apresRetour === 2
        && temps.length === 2 && ecart >= G.ESPACEMENT_MS && chevauchent.length === 0,
      `${G.GUIDES_DC.length} lieux ; en tournant au Lincoln ${unSeul} panneau, après une nouvelle visite ${apresRetour} ; `
        + `deux lieux à la fois : ${temps.length} panneaux, ${ecart} ms d'écart ; rayons qui se recouvrent ${JSON.stringify(chevauchent)}`);
  }

  // --- Les guides des villes : Paris, Londres, Rome, New York (v535) --------
  // Pur, sous node. Chaque lieu se trouve dans le registre des repères ; chaque
  // panneau a son français ET son anglais, deux ou trois phrases ; la langue du
  // profil choisit (en `both`, on alterne) ; aucun rayon n'en recouvre un autre ;
  // et, hors de Manhattan (dont le plan n'est pas fait de blocs, éprouvé au
  // navigateur plus bas), chaque guide trouve un sol à ciel ouvert, au niveau
  // de la rue, dans le rayon de son panneau. Sur l'ancien code le module
  // n'existe pas : rouge propre.
  const GV = await import('../src/guidesvilles.js').catch(() => null);
  if (!GV) {
    verifier('des guides racontent Paris, Londres, Rome et New York', false, 'src/guidesvilles.js est absent');
  } else {
    const parVille = {};
    for (const l of GV.GUIDES_VILLES) parVille[l.ville] = (parVille[l.ville] || 0) + 1;
    const phrases = (t) => (t.match(/[.!?](\s|$)/g) || []).length;
    const fautes = GV.TOUS_LES_GUIDES.filter((l) => !l.guide || typeof l.texte !== 'object'
      || !l.texte.fr || !l.texte.en || phrases(l.texte.fr) < 1 || phrases(l.texte.fr) > 3
      || phrases(l.texte.en) > 3 || l.texte.fr.length > 230 || l.texte.en.length > 230).map((l) => l.id);
    verifier('des guides racontent Paris, Londres, Rome et New York',
      ['Paris', 'Londres', 'Rome', 'New York'].every((v) => parVille[v] >= 3) && fautes.length === 0,
      `${JSON.stringify(parVille)} ; panneaux sans guide, sans anglais ou trop longs ${JSON.stringify(fautes)}`);
    const eif = GV.GUIDES_VILLES.find((l) => l.id === 'eiffel');
    const fr = G.texteDuGuide(eif, 'fr'), en = G.texteDuGuide(eif, 'en');
    const both = [0, 1, 2].map((k) => G.texteDuGuide(eif, 'both', k));
    verifier('le guide parle la langue du profil, et alterne en « les deux »',
      fr.includes('tour Eiffel') && fr.includes('Capucine') && en.includes('Eiffel Tower')
        && both[0] === fr && both[1] === en && both[2] === fr,
      `fr « ${fr.slice(0, 40)}… » · en « ${en.slice(0, 40)}… » · alternance ${both.map((t) => (t === fr ? 'fr' : t === en ? 'en' : '?')).join('-')}`);
    const recouvrent = [];
    for (const a of GV.TOUS_LES_GUIDES) for (const b of GV.TOUS_LES_GUIDES) {
      if (a.id < b.id && Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r) recouvrent.push(`${a.id}/${b.id}`);
    }
    const { World, CHAUSSEE } = await import('../src/world.js');
    const { isSolid } = await import('../src/blocks.js');
    const w = new World();
    // La règle du jeu (vie.js) : sol plein, à ciel ouvert, et jamais la chaussée.
    const essai = GV.essaiParBlocs((x, y, z) => w.getBlock(x, y, z), (x, z) => w.terrainHeight(x, z), isSolid,
      (id) => CHAUSSEE.has(id));
    const sansPoste = [], couverts = [], surLaRue = [];
    for (const l of GV.TOUS_LES_GUIDES) {
      if (l.ville === 'New York') continue;
      const p = GV.posteDuGuide(l, essai);
      if (!p || Math.hypot(p.x - l.x, p.z - l.z) > l.r) { sansPoste.push(l.id); continue; }
      for (let y = p.y; y < p.y + 40; y++) if (w.getBlock(Math.floor(p.x), y, Math.floor(p.z)) !== 0) { couverts.push(l.id); break; }
      if (CHAUSSEE.has(w.getBlock(Math.floor(p.x), p.y - 1, Math.floor(p.z)))) surLaRue.push(l.id);
    }
    verifier('chaque guide a sa place au pied de son monument, à ciel ouvert, hors de la chaussée',
      recouvrent.length === 0 && sansPoste.length === 0 && couverts.length === 0 && surLaRue.length === 0,
      `rayons qui se recouvrent ${JSON.stringify(recouvrent)} ; sans poste ${JSON.stringify(sansPoste)} ; sous une voûte ${JSON.stringify(couverts)} ; sur la chaussée ${JSON.stringify(surLaRue)}`);
  }

  const banc = new Banc({ portJeu: 8331, portPairs: 9331 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Alice');

    // --- 1. la capitale est à sa place ---------------------------------------
    const mall = await tab.evaluate(({ x, z }) => {
      const w = window.__game.world;
      const ville = w.cityAt(x, z);
      return { ville: ville ? ville.key : null, sol: w.terrainHeight(x, z) };
    }, { x: P.x - 60, z: P.z });
    verifier('le Mall est bien dans Washington', mall.ville === 'dc',
      `${mall.ville} · sol ${mall.sol}`);

    const axe = await tab.evaluate(({ px, pz, pts }) => {
      const w = window.__game.world;
      return pts.map(([u, v]) => {
        let haut = 0;
        const sol = w.terrainHeight(px + u, pz + v);
        for (let y = sol + 1; y < 140; y++) if (w.getBlock(px + u, y, pz + v) !== 0) haut = y - sol;
        return haut;
      });
    }, { px: P.x, pz: P.z, pts: [[0, 0], [-110, 0], [-172, 2]] });
    verifier('le dôme du Capitole domine la pelouse', axe[0] > 25, `${axe[0]} blocs`);
    verifier('et l\'obélisque domine tout le reste', axe[1] > 60 && axe[1] > axe[0],
      `${axe[1]} blocs contre ${axe[0]} au Capitole`);
    verifier('le Lincoln ferme l\'axe à l\'ouest', axe[2] > 8, `${axe[2]} blocs`);

    // Les ormes du Mall — les deux rangées qui bordent Jefferson et Madison
    // Drive, une colonne sur deux. `solWashington` rend ARBRE comme un
    // identifiant de SOL ; jusqu'à la v205, `world.js` ne faisait pas pousser
    // de fût pour Washington, et l'orme était une feuille posée À PLAT sur le
    // gravier — vu en capture de rue (Independence Avenue). On lit ce que
    // l'enfant voit : un tronc de trois blocs qu'on contourne, une couronne
    // sous laquelle on marche, et pas une seule feuille au sol sur le Mall.
    // La rangée se déduit du REGISTRE (P) : v = ±4, u pair de -96 à -32.
    const ormes = await tab.evaluate(({ px, pz }) => {
      const w = window.__game.world;
      const LOG = 5, LEAVES = 6, AIR = 0;
      let arbres = 0, dessous = 0, feuillesAuSol = 0, lus = 0;
      for (const v of [-4, 4]) for (let u = -96; u <= -32; u++) {
        const x = px + u, z = pz + v;
        const sol = w.terrainHeight(x, z);
        lus++;
        const b = (dy) => w.getBlock(x, sol + dy, z);
        const couronne = b(4) === LEAVES || b(5) === LEAVES;
        if ((u & 1) === 0) {
          if (b(1) === LOG && b(2) === LOG && b(3) === LOG && couronne) arbres++;
        } else if (b(1) === AIR && b(2) === AIR && b(3) === AIR && couronne) dessous++;
      }
      for (let v = -5; v <= 5; v++) for (let u = -100; u <= -27; u++) {
        const x = px + u, z = pz + v;
        if (w.getBlock(x, w.terrainHeight(x, z), z) === LEAVES) feuillesAuSol++;
      }
      return { arbres, dessous, feuillesAuSol, lus };
    }, { px: P.x, pz: P.z });
    verifier('les ormes du Mall ont un tronc et une couronne',
      ormes.arbres >= 20 && ormes.dessous >= 20 && ormes.feuillesAuSol === 0,
      `${ormes.arbres} ormes à tronc · ${ormes.dessous} colonnes où l'on marche sous la couronne `
      + `· ${ormes.feuillesAuSol} feuillage(s) posé(s) à plat sur le Mall (${ormes.lus} colonnes lues)`);

    // La loi de 1910 : aucun immeuble ORDINAIRE ne dépasse le dôme. C'est ce
    // qui fait qu'on voit le Capitole de partout, et ça se vérifie.
    //
    // « Ordinaire » est le mot qui compte : un monument a le droit d'être haut,
    // c'est même tout son propos. Le balayage commençait à quatre blocs du
    // centre alors que le Capitole s'étend jusqu'à dix — il mesurait donc le
    // dôme qu'il prend pour référence, et ne passait que parce que la grille
    // d'échantillonnage manquait la pointe. On écarte les emprises réservées.
    const emprisesDC = D.MONUMENTS_DC.map((m) => [m.u, m.v, m.bu + 2, m.bv + 2]);
    const plusHaut = await tab.evaluate(({ px, pz, emprisesDC }) => {
      const w = window.__game.world;
      const surUnMonument = (u, v) => emprisesDC.some(
        ([mu, mv, bu, bv]) => Math.abs(u - mu) <= bu && Math.abs(v - mv) <= bv);
      let max = 0;
      for (let u = -120; u < -40; u += 4) {
        for (let v = -75; v < -25; v += 4) {
          if (surUnMonument(u, v)) continue;
          const sol = w.terrainHeight(px + u, pz + v);
          let h = 0;
          for (let y = sol + 1; y < 80; y++) if (w.getBlock(px + u, y, pz + v) !== 0) h = y - sol;
          if (h > max) max = h;
        }
      }
      return max;
    }, { px: P.x, pz: P.z, emprisesDC });
    verifier('et la loi de 1910 tient : rien d\'ordinaire ne dépasse le dôme',
      plusHaut < axe[0], `le plus haut immeuble fait ${plusHaut} blocs`);

    // --- 2. on entre dans les bâtiments ---------------------------------------
    // Le Capitole d'abord : on se met devant la porte d'honneur, façade ouest,
    // et on marche droit devant. C'est ce que fait un enfant.
    const capitole = D.MONUMENTS_DC.find((m) => m.nom === 'Capitole des États-Unis');
    const solCap = await tab.evaluate(({ x, z }) =>
      window.__game.world.terrainHeight(x, z), { x: P.x + capitole.u, z: P.z + capitole.v });
    await poserLe(tab, P.x + capitole.u - 16, solCap + 5, P.z + capitole.v, capVers(1, 0));
    await dormir(500);
    const dehors = await autour(tab);
    verifier('devant le Capitole, on a le ciel au-dessus de la tête',
      dehors.plafond < 0, `plafond à ${dehors.plafond}`);
    // ON MARCHE JUSQU'À ÊTRE ARRIVÉ, PAS PENDANT UNE DURÉE. Une durée fixe
    // était bimodale : sur banc chargé l'enfant avance à 2,4 m/s et six
    // secondes le laissaient SOUS le porche ouest (plafond 4) ; sur banc au
    // repos il file à 4,3 et les mêmes six secondes le faisaient TRAVERSER la
    // Rotonde et ressortir sous le porche est (plafond 4, x = +7). On avance
    // donc par petits pas, et on s'arrête quand on est dans la salle : sous un
    // vrai plafond, à moins de cinq blocs du centre.
    // ET LE NOMBRE DE PAS N'EST PAS UNE BORNE (v256). Quatorze pas de 700 ms
    // font onze blocs à un bloc par seconde — la cadence d'un portail chargé,
    // mesurée deux fois de suite après `hote.js` (arrêté à x = −5,7 puis
    // −6,2, sous le porche) ; rejoué seul, le même code fait x = −4,9. On
    // marche donc jusqu'à être entré, ou ressorti, ou jusqu'à ne plus avancer
    // sur trois pas — exactement comme les musées plus bas — avec une borne
    // large qui ne peut pas mesurer le banc.
    let dedans = await autour(tab);
    let ou = await pose(tab);
    let avantOu = null;
    let figeRotonde = 0;
    for (let pas = 0; pas < 60; pas++) {
      const centre = ou.x - (P.x + capitole.u);
      if (dedans.plafond > 4 && Math.abs(centre) < 5) break;
      if (centre > 5) break;                      // ressorti côté est : constat
      await avancer(tab, 700);
      dedans = await autour(tab);
      ou = await pose(tab);
      const bouge = !avantOu || Math.hypot(ou.x - avantOu.x, ou.z - avantOu.z) >= 0.05;
      figeRotonde = bouge ? 0 : figeRotonde + 1;
      if (figeRotonde >= 3) break;                // un mur, pas un hoquet
      avantOu = ou;
    }
    // Dans la salle ET sous un vrai plafond : l'un sans l'autre ne prouve
    // rien — sous les deux porches aussi, on a quelque chose au-dessus de la
    // tête, mais à quatre blocs seulement.
    verifier('on pousse la porte et on est dans la Rotonde',
      dedans.plafond > 4 && Math.abs(ou.x - (P.x + capitole.u)) < 5,
      `plafond à ${dedans.plafond} blocs, x=${(ou.x - P.x - capitole.u).toFixed(1)} du centre`);

    // Une maison ordinaire, ensuite : la capitale n'est pas qu'une vitrine.
    // Les îlots sont choisis ici, dans Node, en demandant au module lesquels
    // portent vraiment un bâtiment — sinon on éprouve des morceaux de rue et
    // des pelouses, et le témoin dit n'importe quoi.
    const ilots = [];
    // Le centre de chaque maison se DEMANDE au module (`coinDeMaisonDC`, v370) :
    // depuis la règle du kit un îlot en porte quatre autour de sa ruelle, et
    // une maison n'est plus au milieu de son îlot. Repli sur la trame d'avant.
    const centres = [];
    if (typeof D.coinDeMaisonDC === 'function') {
      for (let la = 0; la < 6; la++) for (let lb = -2; lb < 3; lb++) {
        const [cu, cv] = D.coinDeMaisonDC(la, lb);
        centres.push([P.x + cu + 4, P.z + cv + 4]);
      }
    } else {
      for (let u = 26; u < 62; u += PAS_ILOT) for (let v = -12; v < 30; v += PAS_ILOT) {
        centres.push([P.x + Math.floor(u / PAS_ILOT) * PAS_ILOT + 7, P.z + Math.floor(v / PAS_ILOT) * PAS_ILOT + 7]);
      }
    }
    for (const [x, z] of centres) {
      if (ilots.length >= 12) break;
      {
        // « dedans » au sens du générateur : les quatre voisins bâtissables.
        // Une colonne au bord de l'îlot porte un mur, et c'est normal — un
        // témoin qui la prend pour un salon accuse la maison à tort.
        const dedansIlot = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]
          .every(([dx, dz]) => D.lotWashingtonLibre(x + dx, z + dz));
        if (dedansIlot) ilots.push([x, z]);
      }
    }
    const maisons = await tab.evaluate((pts) => {
      const w = window.__game.world;
      let creuses = 0;
      for (const [x, z] of pts) {
        const sol = w.terrainHeight(x, z);
        let toit = 0;
        for (let y = sol + 3; y < sol + 20; y++) if (w.getBlock(x, y, z) !== 0) { toit = y; break; }
        // sol + 2, pas sol + 1 : le premier bloc au-dessus du plancher porte la
        // lampe de la maison, et une lampe n'est pas du vide
        if (w.getBlock(x, sol + 2, z) === 0 && toit) creuses++;
      }
      return { creuses, testees: pts.length };
    }, ilots);
    verifier('et les maisons de la ville sont creuses, pas pleines',
      maisons.testees > 6 && maisons.creuses === maisons.testees,
      `${maisons.creuses}/${maisons.testees}`);

    // Creuse ne suffit pas : il faut une PORTE. On se pose devant une façade
    // et on entre, comme au Capitole.
    const [mx, mz] = ilots[0];
    const solM = await tab.evaluate(({ x, z }) =>
      window.__game.world.terrainHeight(x, z), { x: mx, z: mz });
    // ON MARCHE JUSQU'À ÊTRE ENTRÉ, PAS PENDANT 2,2 SECONDES — même remède
    // qu'à l'Air et l'Espace trente lignes plus bas, et pour la même raison.
    //
    // `avancer(2200)` compte en temps RÉEL, quand le joueur, lui, avance en
    // `dt` borné à un vingtième de seconde. À trois images par seconde, ces
    // 2,2 secondes ne valent plus que sept images, soit UN bloc au lieu des
    // six qui séparent le trottoir de la porte : le témoin rougissait sur le
    // perron. Vert rejoué seul, deux fois, sur la branche ET sur `origin/main`
    // — c'était une mesure du banc, pas de la maison.
    //
    // Et « ne plus avancer » se constate sur TROIS pas : un mur arrête à
    // chaque pas, un hoquet du banc à un seul.
    //
    // ENFIN, IL DIT CE QU'IL A VU. Ce témoin ne rendait AUCUN détail : son
    // rouge ne disait ni où l'on s'était arrêté, ni si un mur barrait, ni
    // quelle façade avait été essayée. Un rouge muet ne se démonte pas.
    let entre = false;
    let dernier = null;
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      await poserLe(tab, mx + dx * 6, solM + 2, mz + dz * 6, capVers(-dx, -dz));
      await dormir(300);
      let etat = await autour(tab);
      let avant = null;
      let immobile = 0;
      for (let pas = 0; pas < 12 && !(etat.plafond > 0 && etat.plafond < 12); pas++) {
        await avancer(tab, 700);
        etat = await autour(tab);
        const bouge = !avant || Math.hypot(etat.px - avant.px, etat.pz - avant.pz) >= 0.05;
        immobile = bouge ? 0 : immobile + 1;
        if (immobile >= 3) break;
        avant = etat;
      }
      dernier = { face: `${dx},${dz}`, ...etat };
      if (etat.plafond > 0 && etat.plafond < 12) { entre = true; break; }
    }
    verifier('et on entre chez les gens : chaque îlot a sa porte', entre,
      dernier ? `façade ${dernier.face}, plafond à ${dernier.plafond}, ${dernier.murs} mur(s),`
        + ` à (${Math.round(dernier.x)}, ${Math.round(dernier.z)}) pour une maison en (${mx}, ${mz})`
        : 'aucun îlot bâtissable trouvé');

    // --- 3. le métro : de la rue au quai --------------------------------------
    const quai = D.QUAIS_METRO.find((q) => q.nom === 'Smithsonian');
    verifier('la station Smithsonian existe, sous le Mall', !!quai,
      quai ? `quai à y=${quai.y + 2}` : '');

    // On se pose au pied du pylône brun, dans la rue, et on descend.
    const bouche = D.BOUCHES_METRO.find((b) => b.nom === 'Smithsonian');
    const solBouche = await tab.evaluate(({ x, z }) =>
      window.__game.world.terrainHeight(x, z),
    { x: P.x + Math.round(bouche.tu), z: P.z + Math.round(bouche.tv) });
    const capVersQuai = capVers(-bouche.nu, -bouche.nv);
    await poserLe(tab, P.x + Math.round(bouche.tu), solBouche + 2,
      P.z + Math.round(bouche.tv), capVersQuai);
    await dormir(500);
    const enRue = await pose(tab);
    verifier('la bouche de métro débouche bien dans la rue',
      Math.abs(enRue.y - (solBouche + 1)) < 2.5, `y=${enRue.y.toFixed(1)} pour un sol à ${solBouche}`);

    // ON DESCEND JUSQU'À ÊTRE EN BAS, PAS PENDANT DOUZE PAS (v270). Le
    // verdict était une DURÉE déguisée : douze pas de 1,4 s, et comme
    // `main.js` borne `dt` à un vingtième, l'enfant descend d'autant moins
    // que la cadence du banc est basse. Mesuré sur le MÊME code de jeu —
    // 13,0 blocs la suite rejouée seule, 9,0 aux portails des v268 et v269,
    // et 7,0 à celui de la v270, pour une barre à 8. Douze pour cent de
    // marge : la borne était condamnée, et c'est le banc qu'elle mesurait.
    //
    // Le remède était écrit QUINZE LIGNES PLUS HAUT, dans ce fichier : le
    // témoin des portes marche « jusqu'à être entré OU jusqu'à ne plus
    // avancer », depuis qu'il est tombé pour la même raison. Il n'avait
    // jamais été appliqué à l'escalier. C'est le piège des bornes de
    // `monte.js` (v237) à l'échelle d'un autre fichier : quand une borne se
    // révèle mal posée, on relit TOUTES celles du fichier dans la même passe.
    //
    // « Ne plus descendre » se constate sur TROIS pas, comme « ne plus
    // avancer » : un mur arrête à chaque pas, un hoquet de banc à un seul.
    //
    // ET « NE PLUS DESCENDRE » N'EST PAS « NE PLUS AVANCER » : LE COULOIR
    // COMMENCE À PLAT (v279). Le portail de référence sur `origin/main` a rendu
    // « descendu de -0,0 blocs · bloqué : trois pas sans descendre », et j'en ai
    // conclu que le métro était inaccessible. **C'était faux, et c'est une sonde
    // pure qui l'a dit** — sans navigateur, en lisant les blocs le long du
    // couloir : vingt et un pas praticables de y=34 à y=20, aucune marche de
    // plus d'un bloc, deux blocs d'air d'un bout à l'autre, le quai à 19.
    // L'escalier est sain.
    //
    // Ce que la sonde a montré en plus, et qui condamne la règle d'abandon :
    // **les six premiers blocs depuis la bouche sont PLATS**, et par
    // construction — la bouche est posée à `longueur` du centre, et le couloir
    // ne commence à descendre qu'au-delà du palier d'entrée (`DEMI_VOUTE` vaut
    // sept). Or l'enfant avance de l'ordre du quart de bloc par pas de 1,4 s sur
    // ce banc (v238 : « à pied, un enfant avance à 15 % du temps réel ») : trois
    // pas ne font même pas un bloc, donc « trois pas sans descendre » se
    // déclenche AVANT la première marche, quoi que fasse le jeu. La borne était
    // condamnée à rougir dès que le banc ralentissait un peu plus.
    //
    // On constate donc « ne plus AVANCER », comme le témoin des portes quinze
    // lignes plus haut — ce qui était déjà la leçon citée ci-dessus, appliquée à
    // la mauvaise grandeur. Un mur arrête le déplacement ; un palier n'arrête
    // que la descente.
    //
    // ET L'ESCALIER TOURNE (v529). Depuis la v529 la bouche descend à une
    // mezzanine, et une passerelle mène au bout du quai : marcher tout droit
    // s'arrêtait sept blocs plus bas, contre le mur de la mezzanine. On suit
    // donc le chemin que `sonde-stations.cjs` trace case par case dans le
    // monde (celui que le vrai joueur y parcourt sous node, aux deux sens), et
    // l'on vise à chaque pas la case qui suit la plus proche.
    let pts = null;
    try {
      const { mesurer } = require('./sonde-stations.cjs');
      const m = await mesurer(path.resolve(__dirname, '..'), { joueur: false, seul: /^Smithsonian$/, garderPts: true });
      pts = (m.stations.find((s) => s.ville === 'Washington' && s.arrive) || {}).pts || null;
    } catch (e) { pts = null; }
    if (pts) await poserLe(tab, pts[0][0], pts[0][1] + 0.01, pts[0][2], capVersQuai);
    const viser = async () => {
      if (!pts) return false;
      const ici = await pose(tab);
      let i0 = 0, d0 = Infinity;
      pts.forEach(([x, y, z], i) => {
        const d = Math.hypot(x + 0.5 - ici.x, z + 0.5 - ici.z) + Math.abs(y - ici.y) * 2;
        if (d < d0) { d0 = d; i0 = i; }
      });
      // la case suivante, sauf si l'on est déjà dessus
      let j = Math.min(pts.length - 1, i0 + 1);
      if (Math.hypot(pts[j][0] + 0.5 - ici.x, pts[j][2] + 0.5 - ici.z) < 0.4) j = Math.min(pts.length - 1, j + 1);
      const [nx, ny, nz] = pts[j];
      await tab.evaluate((yaw) => { window.__game.player.yaw = yaw; },
        capVers(nx + 0.5 - ici.x, nz + 0.5 - ici.z));
      // on ne saute que pour MONTER une marche, comme la sonde
      return ny > Math.floor(ici.y + 0.01);
    };
    let enBas = await pose(tab);
    let immobileBas = 0, avance = 0;
    for (let i = 0; i < 60 && enBas.y >= solBouche - 8; i++) {
      const avantPas = enBas;
      const monte = await viser();
      if (monte) await avancer(tab, 1400); else await descendre(tab, 1400);
      enBas = await pose(tab);
      const pas = Math.hypot(enBas.x - avantPas.x, enBas.z - avantPas.z);
      avance += pas;
      immobileBas = pas >= 0.2 || avantPas.y - enBas.y >= 0.2 ? 0 : immobileBas + 1;
      if (immobileBas >= 3) break;
    }
    verifier('en descendant l\'escalier, on arrive sur le quai',
      enBas.y < solBouche - 8,
      `descendu de ${(solBouche - enBas.y).toFixed(1)} blocs`
      + ` · avancé de ${avance.toFixed(1)} blocs dans le couloir`
      + (immobileBas >= 3 ? ' · bloqué : trois pas sans avancer ni descendre' : '')
      + (pts ? ` · chemin de la sonde (${pts.length} cases)` : ' · sans chemin de sonde, tout droit')
      + ` · arrêté en (${Math.floor(enBas.x)}, ${enBas.y.toFixed(1)}, ${Math.floor(enBas.z)})`);
    // On laisse l'enfant se poser avant de regarder en l'air : mesuré en pleine
    // chute, le plafond change d'un bloc d'une exécution à l'autre.
    await dormir(900);
    const sousVoute = await autour(tab);
    verifier('et on a bien un plafond au-dessus de la tête : on est sous terre',
      sousVoute.plafond >= 2, `plafond à ${sousVoute.plafond} blocs`);

    // --- 4. la rame arrive, on monte -----------------------------------------
    // On se pose au milieu du quai et on attend, comme sur un vrai quai.
    await poserLe(tab, P.x + quai.u, quai.y + 2, P.z + quai.v);
    await dormir(600);
    // ON ATTEND EN SECONDES DE JEU, ET LE ROUGE SE DÉMONTE (v283).
    //
    // Cette attente était bornée à SOIXANTE-DIX SECONDES DE MONTRE pour un
    // passage que le jeu promet toutes les trente secondes DE JEU. Le banc
    // borne `dt` à un vingtième et rend trois à cinq images par seconde à
    // Washington : trente secondes de jeu valent alors deux à quatre minutes de
    // montre, et la fenêtre était trop courte d'un facteur deux à trois. C'est
    // la famille de la v270 — on attend le RÉSULTAT, borné, et en secondes de
    // JEU — exactement ce que la seconde moitié de ce témoin fait déjà.
    //
    // ET LE ROUGE NE DISTINGUAIT RIEN. `aBord.visible` faux recouvre trois
    // pannes très différentes : la rame n'est jamais venue ; elle est venue mais
    // hors de la portée d'embarquement ; elle est venue à portée et le bouton
    // est resté caché. `null` n'est pas un verdict, c'est une absence de mesure
    // (v272) — on relève donc, tour par tour, la distance et le Δy du convoi
    // souterrain le plus proche, et le meilleur des deux entre dans le message.
    await tab.evaluate(() => {
      window.__simQuai = 0;
      let prec = performance.now();
      const tic = (now) => {
        window.__simQuai += Math.min(Math.max((now - prec) / 1000, 0), 0.05);
        prec = now;
        requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
    });
    // 45 s de JEU : une fois et demie l'intervalle annoncé. Le garde-fou au mur
    // (250 tours de 800 ms) n'existe que pour ne jamais attendre un jeu mort.
    let vu = null, simQuai = 0, approche = null;
    for (let i = 0; i < 250 && !vu && simQuai < 45; i++) {
      const etat = await tab.evaluate(() => {
        const b = document.getElementById('board-btn');
        const cible = b && b.closest('.fun-target');
        const visible = !!(b && getComputedStyle(b).display !== 'none'
          && cible && getComputedStyle(cible).display !== 'none');
        const p = window.__game.player.pos;
        // Le convoi de MÉTRO le plus proche, avec son Δy : c'est ce qui
        // sépare « la rame n'est jamais venue » de « elle est venue mais le
        // garde de hauteur l'a écartée » (|Δy| > 2,5 empêche un quai
        // souterrain d'attraper une voiture de la rue).
        let best = null;
        for (const c of (window.__vehicules.etat() || [])) {
          if (!/métro/i.test(c.nom || '')) continue;
          for (const q of c.places) {
            const d = Math.hypot(q[0] - p.x, q[1] - p.z);
            if (!best || d < best.d) {
              best = { nom: c.nom, d: +d.toFixed(1), dy: +(c.y - p.y).toFixed(1), vus: c.visibles };
            }
          }
        }
        return { visible, best, sim: window.__simQuai };
      });
      simQuai = etat.sim;
      if (!approche || (etat.best && etat.best.d < approche.d)) approche = etat.best || approche;
      if (etat.visible) { vu = etat; break; }
      await dormir(800);
    }
    const aBord = await bouton(tab, 'board-btn');
    verifier('une rame passe, et on propose de monter dedans',
      aBord.visible,
      `${JSON.stringify(aBord)} · ${simQuai.toFixed(0)} s de jeu d'attente`
      + ` · la rame la plus proche vue à ${approche ? approche.d : '—'} blocs`
      + ` (${approche ? `${approche.nom}, Δy ${approche.dy}, ${approche.vus} visible(s)` : 'aucune'})`);
    // La pastille de couleur dit QUELLE ligne : un enfant qui ne lit pas
    // encore bien reconnaît un rond bleu avant un mot.
    verifier('et la pastille dit de quelle ligne il s\'agit',
      aBord.pastille, JSON.stringify(aBord));

    await tab.evaluate(() => document.getElementById('board-btn').click());
    const embarque = await pose(tab);
    // L'HORLOGE DU JEU, PAS CELLE DU MUR. Le jeu borne dt à un vingtième de
    // seconde : sous cinq images par seconde (SwiftShader au banc), une
    // seconde de mur ne fait avancer la simulation que d'un quart de seconde.
    // Un témoin qui attend « trente-deux secondes » au mur n'en offre alors
    // que huit au train — la pause en gare les mange, et il accuse un métro
    // qui roule très bien. On accumule donc le MÊME dt que le jeu, et c'est
    // en secondes de jeu que la fenêtre se compte. Mesuré : v172 et v173
    // rendent pareil (4,9 contre 5,2 fps à Washington) — le rouge de la
    // première passe disait la lenteur du banc, pas celle du métro.
    await tab.evaluate(() => {
      window.__simDC = 0;
      let prec = performance.now();
      const tic = (now) => {
        window.__simDC += Math.min(Math.max((now - prec) / 1000, 0), 0.05);
        prec = now;
        requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
    });

    // CE QU'ON MESURE : PAS DES MÈTRES, UNE STATION.
    //
    // Un enfant ne prend pas le métro pour parcourir douze mètres, il le prend
    // pour aller ailleurs. Et depuis que les rames marquent les arrêts, la
    // distance parcourue en quinze secondes ne veut plus rien dire : le train
    // peut être à quai. Ce qui compte est qu'on change de station.
    const stationLaPlusProche = (p) => {
      let best = null, bd = 1e9;
      for (const q of D.QUAIS_METRO) {
        const d = Math.hypot(p.x - (P.x + q.u), p.z - (P.z + q.v));
        if (d < bd) { bd = d; best = q.nom; }
      }
      return { nom: best, d: bd };
    };
    const depart = stationLaPlusProche(embarque);
    let arrivee = depart, parcouru = 0, simJeu = 0;
    // Le budget : la pause à quai (3 s) plus le trajet inter-stations à
    // 8 m/s, avec de la marge — 40 s de JEU. Le garde-fou au mur (300 tours
    // de 800 ms) n'existe que pour ne jamais attendre sans fin un jeu mort.
    for (let i = 0; i < 300 && arrivee.nom === depart.nom && simJeu < 40; i++) {
      await dormir(800);
      const ici = await pose(tab);
      parcouru = Math.hypot(ici.x - embarque.x, ici.z - embarque.z);
      arrivee = stationLaPlusProche(ici);
      simJeu = await tab.evaluate(() => window.__simDC);
    }
    verifier('et le métro nous emmène à la station suivante',
      arrivee.nom !== depart.nom,
      `${depart.nom} → ${arrivee.nom}, ${parcouru.toFixed(0)} m en ${simJeu.toFixed(0)} s de jeu`);

    const enTunnel = await pose(tab);
    const solIci = await tab.evaluate(({ x, z }) =>
      window.__game.world.terrainHeight(Math.floor(x), Math.floor(z)),
    { x: enTunnel.x, z: enTunnel.z });
    verifier('le métro de Washington est SOUTERRAIN : la rame roule sous la rue',
      enTunnel.y < solIci - 3, `rame à y=${enTunnel.y.toFixed(1)}, rue à ${solIci}`);

    await tab.evaluate(() => document.getElementById('board-btn').click());
    await dormir(1500);
    verifier('et on redescend quand on veut',
      !(await bouton(tab, 'board-btn')).texte.includes('Descendre'));

    // --- 5. le pont de la Jaune -----------------------------------------------
    // La chose la plus spectaculaire du vrai réseau, et elle est vraie : la
    // Jaune sort de terre, franchit le Potomac À L'AIR LIBRE sur son pont, et
    // replonge. On vérifie le tablier au-dessus de l'eau : du rail sous le
    // ciel, de l'eau sous le rail.
    const surLePont = D.traceLigneMetro('Jaune')
      .map((pt) => ({ u: Math.round(pt.x - P.x), v: Math.round(pt.z - P.z), y: Math.round(pt.y) }))
      .filter((pt) => pt.y >= 33 && D.surEauWashington(pt.u, pt.v));
    verifier('la Jaune a un pont sur le Potomac, pas un tunnel',
      surLePont.length > 12, `${surLePont.length} points de voie au-dessus de l'eau`);
    const tablier = surLePont[Math.floor(surLePont.length / 2)];
    const pont = await tab.evaluate(({ x, y, z }) => {
      const w = window.__game.world;
      let eau = false;
      for (let yy = y - 2; yy > 20; yy--) if (w.getBlock(x, yy, z) === 7) { eau = true; break; }   // 7 = l'eau
      // le tablier est à la cote du tracé, à l'arrondi de tronçon près
      const tablier = w.getBlock(x, y, z) !== 0 || w.getBlock(x, y - 1, z) !== 0;
      return { tablier, cielOuvert: w.getBlock(x, y + 6, z) === 0, eau };
    }, { x: P.x + tablier.u, y: tablier.y, z: P.z + tablier.v });
    verifier('et le train y roule sous le ciel, au-dessus de l\'eau',
      pont.tablier && pont.cielOuvert && pont.eau, JSON.stringify(pont));

    // --- 6. l'Orange et l'Argent sur les rails de la Bleue (v468) -------------
    // Dans la vraie ville, trois couleurs partagent le tunnel de Rosslyn à
    // Stadium-Armory. Ici : Eastern Market → Foggy Bottom, puis leur propre
    // tunnel sous le Potomac vers Rosslyn. Deux témoins : elles roulent, et
    // aucune rame n'entre dans une autre — sur UN TOUR D'HORLOGE entier, par la
    // grille du jeu (`distanceA`), wagon par wagon : une position lue à une
    // seule heure est un tirage (v318).
    const famille = await tab.evaluate(async () => {
      const W = await import('./src/washington.js');
      const V = await import('./src/vehicules.js');
      const conv = (window.__vehicules.etat() || [])
        .filter((c) => /^métro (Bleue|Orange|Argent)$/.test(c.nom || ''));
      const parc = {};
      for (const n of ['Bleue', 'Orange', 'Argent']) {
        if (W.LIGNES.some((l) => l.nom === n)) parc[n] = new V.Parcours(W.traceLigneMetro(n));
      }
      const H = window.__game.vehicules.horloge();
      const ecart = (W.HORAIRE_METRO && W.HORAIRE_METRO.ecart) || 7.6;
      let P = 0;
      for (const c of conv) {
        const L = parc[c.nom.slice(6)].longueur;
        // la période : l'heure où la tête a fait un tour de plus
        let lo = 0, hi = 2000;
        const d0 = window.__game.vehicules.distanceA(c.cle, H);
        for (let k = 0; k < 50; k++) {
          const m = (lo + hi) / 2;
          if (window.__game.vehicules.distanceA(c.cle, H + m) - d0 < L) lo = m; else hi = m;
        }
        P = Math.max(P, hi);
      }
      let pire = 1e9, quand = null, contacts = 0, releves = 0;
      for (let t = 0; t < P; t += 0.25) {
        const pos = conv.map((c) => {
          const d = window.__game.vehicules.distanceA(c.cle, H + t);
          const p = parc[c.nom.slice(6)];
          return Array.from({ length: 4 }, (_, i) => p.a(d - i * ecart));
        });
        for (let a = 0; a < conv.length; a++) {
          for (let b = a + 1; b < conv.length; b++) {
            let m = 1e9;
            for (const qa of pos[a]) for (const qb of pos[b]) m = Math.min(m, Math.hypot(qa.x - qb.x, qa.z - qb.z));
            releves++;
            if (m < 5) contacts++;
            if (m < pire) { pire = m; quand = `${conv[a].nom}/${conv[b].nom} à t=${t}`; }
          }
        }
      }
      return {
        noms: conv.map((c) => c.nom), P: +P.toFixed(1), pire: +pire.toFixed(1), quand, contacts, releves,
      };
    });
    verifier('l\'Orange et l\'Argent roulent dans le tunnel de la Bleue',
      famille.noms.some((n) => /Orange/.test(n)) && famille.noms.some((n) => /Argent/.test(n)),
      famille.noms.join(', '));
    verifier('et sur un tour d\'horloge, aucune rame n\'entre dans une autre',
      famille.noms.length >= 4 && famille.releves > 0 && famille.contacts === 0,
      `${famille.contacts} contact(s) sur ${famille.releves} relevés, au plus près ${famille.pire} blocs`
      + ` (${famille.quand}), tour de ${famille.P} s`);

    // Le trajet de l'enfant : sur le quai de Smithsonian, une rame ORANGE
    // arrive, on monte, elle nous emmène à la station suivante, on descend.
    // On n'attend pas trois minutes de jeu qu'elle passe : la rue est une
    // fonction de l'heure (v305), on avance l'horloge jusqu'à quatre secondes
    // avant son arrivée — exactement ce que fait une tablette qui adopte
    // l'heure de l'hôte.
    const smith = D.QUAIS_METRO.find((q) => q.nom === 'Smithsonian');
    await poserLe(tab, P.x + smith.u, smith.y + 2, P.z + smith.v);
    const rdv = await tab.evaluate(async ({ px, pz, su, sv }) => {
      const V = await import('./src/vehicules.js');
      const W = await import('./src/washington.js');
      if (!W.LIGNES.some((l) => l.nom === 'Orange')) return null;
      const c = window.__vehicules.etat().find((x) => x.nom === 'métro Orange');
      if (!c) return null;
      const p = new V.Parcours(W.traceLigneMetro('Orange'));
      const H = window.__game.vehicules.horloge();
      for (let t = 0; t < 400; t += 0.25) {
        const q = p.a(window.__game.vehicules.distanceA(c.cle, H + t));
        if (Math.hypot(q.x - (px + su), q.z - (pz + sv)) < 6) {   // la voie est à quatre blocs de l'axe du quai
          window.__game.vehicules.adopterHorloge(H + t - 4);
          return { t };
        }
      }
      return { t: null };
    }, { px: P.x, pz: P.z, su: smith.u, sv: smith.v });
    let orange = null;
    for (let i = 0; i < 120 && rdv && rdv.t !== null; i++) {
      const b = await bouton(tab, 'board-btn');
      if (b.visible && /Orange/.test(b.quoi)) { orange = b; break; }
      await dormir(500);
    }
    verifier('sur le quai, une rame Orange arrive et propose de monter',
      !!orange, `${JSON.stringify(rdv)} · ${orange ? orange.texte : 'pas de bouton 🟠'}`);
    let trajet = { depart: null, arrivee: null };
    if (orange) {
      await tab.evaluate(() => document.getElementById('board-btn').click());
      const monte = await pose(tab);
      trajet.depart = stationLaPlusProche(monte).nom;
      trajet.arrivee = trajet.depart;
      await tab.evaluate(() => { window.__simDC = 0; });
      for (let i = 0; i < 300 && trajet.arrivee === trajet.depart; i++) {
        await dormir(800);
        const ici = await pose(tab);
        const st = stationLaPlusProche(ici);
        if (st.d < 6) trajet.arrivee = st.nom;
        if ((await tab.evaluate(() => window.__simDC)) > 40) break;
      }
      await tab.evaluate(() => document.getElementById('board-btn').click());
      await dormir(1500);
      trajet.descendu = !(await bouton(tab, 'board-btn')).texte.includes('Descendre');
    }
    verifier('elle nous emmène à la station suivante, et l\'on en descend',
      !!orange && trajet.arrivee !== trajet.depart && trajet.descendu, JSON.stringify(trajet));

    // --- 6. l'Air et l'Espace : des avions au-dessus de la tête ---------------
    // Le musée le plus visité d'Amérique. On entre, on lève les yeux : le
    // Spirit of St. Louis et le Bell X-1 sont suspendus. C'est LE « wow »
    // demandé — un intérieur qui vaut le détour, pas quatre murs.
    const musee = D.MONUMENTS_DC.find((m) => m.nom === "Musée de l'Air et de l'Espace");
    const solMusee = await tab.evaluate(({ x, z }) =>
      window.__game.world.terrainHeight(x, z), { x: P.x + musee.u, z: P.z + musee.v });
    // On part d'une colonne IMPAIRE : depuis la v205 les ormes du Mall ont un
    // tronc, une colonne sur deux (u pair) à v = ±4, et l'axe du musée (u -46)
    // tombe pile sur l'un d'eux — l'enfant se cognait à l'arbre sur le perron
    // et le témoin annonçait « plafond à 2, 1 mur ». Entre deux ormes on
    // marche sous la couronne, et la porte fait trois blocs (u -47 à -45).
    await poserLe(tab, P.x + musee.u + 1, solMusee + 2, P.z + musee.v - 8, capVers(0, 1));
    await dormir(400);
    // ON MARCHE JUSQU'À ÊTRE ENTRÉ, PAS PENDANT UN NOMBRE DE SECONDES.
    //
    // Ce témoin accordait 2,6 s pour franchir huit blocs, ce qui tenait à 4,3
    // blocs par seconde et ne tient plus à 3,2 depuis que la marche a été
    // calmée (v192) : l'enfant s'arrêtait sur le perron et le témoin annonçait
    // « plafond à -1 » comme si le musée n'avait pas de toit. Une durée mesure
    // la vitesse du joueur ; ce qu'on veut mesurer, c'est qu'il y a une porte
    // et une salle derrière.
    //
    // ET HUIT PAS DE 700 MS NE SONT PAS HUIT BLOCS NON PLUS. Depuis que des
    // voitures roulent sur Independence Avenue (v205), le banc rend ici à
    // quatre images par seconde au lieu de quinze ; comme main.js borne dt à
    // un vingtième de seconde, le monde avance alors quatre fois moins vite
    // que l'horloge, et les huit pas ne faisaient plus que quatre blocs :
    // « plafond à 2 », sur le perron. Le rouge était une mesure du banc, pas
    // du musée. On marche donc jusqu'à être entré OU jusqu'à ne plus
    // avancer — un mur, une porte absente — avec un plafond large.
    //
    // ET « NE PLUS AVANCER » SE CONSTATE SUR PLUSIEURS PAS, PAS SUR UN SEUL.
    // Dans le portail complet, un pas de 700 ms peut tomber tout entier dans
    // un hoquet du banc — un remaillage, un ramasse-miettes — et le joueur n'a
    // pas bougé d'un centimètre sans qu'aucun mur ne l'arrête : « plafond à
    // -1, 0 mur(s), à (u -45, v 3) », arrêté sur la pelouse à trois blocs de
    // la porte. Seul et sur origin/main, le même témoin était vert. Un mur,
    // lui, arrête le joueur à CHAQUE pas : on n'abandonne qu'après trois pas
    // consécutifs sans mouvement.
    let dansMusee = await autour(tab);
    let avant = null;
    let immobile = 0;
    for (let pas = 0; pas < 40 && !(dansMusee.plafond > 3); pas++) {
      await avancer(tab, 700);
      dansMusee = await autour(tab);
      const bouge = !avant || Math.hypot(dansMusee.px - avant.px, dansMusee.pz - avant.pz) >= 0.05;
      immobile = bouge ? 0 : immobile + 1;
      if (immobile >= 3) break;
      avant = dansMusee;
    }
    const suspendus = await tab.evaluate(({ px, pz, u, v }) => {
      const w = window.__game.world;
      const sol = w.terrainHeight(px + u, pz + v);
      let n = 0;
      for (let du = -5; du <= 5; du++) {
        for (let dv = -3; dv <= 3; dv++) {
          for (let dy = 5; dy <= 10; dy++) {
            if (w.getBlock(px + u + du, sol + dy, pz + v + dv) !== 0) { n++; break; }
          }
        }
      }
      return n;
    }, { px: P.x, pz: P.z, u: musee.u, v: musee.v });
    verifier('on entre dans l\'Air et l\'Espace',
      dansMusee.plafond > 3,
      `plafond à ${dansMusee.plafond}, ${dansMusee.murs} mur(s), à (u ${dansMusee.x - P.x}, v ${dansMusee.z - P.z}, y ${dansMusee.y}), sol du musée ${solMusee}`);
    verifier('et des avions sont suspendus au-dessus de la tête',
      suspendus >= 4, `${suspendus} colonnes portent quelque chose en l'air`);

    // --- L'enfant marche jusqu'au Lincoln : le panneau passe, une fois (v460) --
    // On avance d'un bloc toutes les 120 ms de vraie vie depuis le Mall, on
    // fait les cent pas devant la statue, et l'on relève ce que le bandeau
    // affiche. Les guides comptent en temps réel : la cadence du banc n'y
    // change rien, seule la position compte.
    const vuPanneau = await tab.evaluate(async ({ x0, z0 }) => {
      const g = window.__game;
      const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
      const el = document.getElementById('toast');
      const affiches = [];
      let avant = '';
      const noter = () => {
        const txt = el ? el.textContent : '';
        if (el && txt !== avant && el.style.opacity === '1' && txt.includes('Lincoln')) affiches.push(txt);
        avant = txt;
      };
      const poser = (u) => { g.player.pos.x = x0 + u; g.player.pos.z = z0 + 2; };
      for (let u = -140; u >= -172; u--) { poser(u); await dormir(120); noter(); }
      for (let i = 0; i < 40; i++) { poser(-172 + (i % 2 ? 3 : -3)); await dormir(120); noter(); }
      const journal = window.__guides ? window.__guides.journal.map((j) => j.id) : null;
      return { affiches: affiches.length, texte: affiches[0] || el.textContent, journal };
    }, { x0: P.x, z0: P.z });
    // Depuis la v504 (Max : « tu vires tous ces messages-là »), le panneau ne
    // passe plus à l'écran ; la visite se compte toujours, une fois.
    verifier('en marchant jusqu\'au Lincoln, la visite se compte une fois — et rien ne s\'affiche',
      vuPanneau.affiches === 0 && !!vuPanneau.journal
        && vuPanneau.journal.filter((id) => id === 'lincoln').length === 1,
      `${vuPanneau.affiches} affichage(s), journal ${JSON.stringify(vuPanneau.journal)}, « ${vuPanneau.texte} »`);

    // --- Les guides des villes, au navigateur (v535) ------------------------
    // On se pose au-dessus du monument, le guide naît (borné à une minute), on
    // descend à trois blocs de lui : il est dessiné, il regarde l'enfant, et
    // son panneau signé passe — en français, puis en anglais une fois la
    // langue changée par le bouton des Réglages. Et à Manhattan, dont le plan
    // n'est pas fait de blocs, le guide de l'Empire State trouve son trottoir.
    // Le passage vit dans la sonde (`visiter`) : une copie finirait par
    // diverger (v400).
    const { visiter } = require('./sonde-guides-villes.cjs');
    const langue = (l) => tab.evaluate((l) => document.querySelector(`.pb-toggle[data-lang="${l}"]`)?.click(), l);
    const pret = await tab.evaluate(() => typeof window.__guidesVilles === 'function');
    if (!pret) {
      verifier('à la tour Eiffel, Capucine raconte la tour', false, 'pas de guides des villes dans la page');
    } else {
      await langue('fr');
      const eif = await visiter(tab, 'eiffel');
      verifier('à la tour Eiffel, Capucine raconte la tour — à voix haute, sans bandeau',
        !!eif.dit && eif.dit.includes('Capucine') && eif.dit.includes('Eiffel') && eif.visible && eif.regard > 0.9
          && !!eif.parle && eif.parle.lang === 'fr-FR' && eif.parle.text.includes('Capucine')
          && !/\p{Extended_Pictographic}/u.test(eif.parle.text) && !eif.affiche,
        JSON.stringify(eif));
      await langue('en');
      const arc = await visiter(tab, 'arc');
      verifier('et en anglais à l\'Arc de Triomphe, si le profil parle anglais',
        !!arc.dit && arc.dit.includes('Napoleon') && arc.dit.includes('Paris guide')
          && !!arc.parle && arc.parle.lang === 'en-US',
        JSON.stringify(arc));
      await langue('both');
      const emp = await visiter(tab, 'empire');
      verifier('à New York, le guide de l\'Empire State trouve son trottoir',
        emp.d !== undefined && emp.visible && !!emp.dit && emp.dit.includes('Jasmine'),
        JSON.stringify(emp));
    }
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length ? `\n❌ ${echecs.length} échec(s)` : '\n✅ tout est vert');
  process.exit(echecs.length ? 1 : 0);
})();
