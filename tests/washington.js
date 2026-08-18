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
  return { existe: true, visible, texte: b.textContent.trim() };
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
  return { plafond, murs, sousLesPieds: w.getBlock(x, y - 1, z) };
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
    // Six secondes : le perron, la marche du seuil et les sauts font perdre
    // la moitié de l'allure — mesuré, l'enfant avance à 2,4 m/s ici, pas 4,3.
    await avancer(tab, 6000);
    const dedans = await autour(tab);
    const ou = await pose(tab);
    // Franchi la porte ET sous un plafond : l'un sans l'autre ne prouve rien —
    // sous le portique aussi, on a quelque chose au-dessus de la tête.
    verifier('on pousse la porte et on est dans la Rotonde',
      dedans.plafond > 4 && ou.x > P.x + capitole.u - 7,
      `plafond à ${dedans.plafond} blocs, x=${(ou.x - P.x - capitole.u).toFixed(1)} du centre`);

    // Une maison ordinaire, ensuite : la capitale n'est pas qu'une vitrine.
    // Les îlots sont choisis ici, dans Node, en demandant au module lesquels
    // portent vraiment un bâtiment — sinon on éprouve des morceaux de rue et
    // des pelouses, et le témoin dit n'importe quoi.
    const ilots = [];
    for (let u = 26; u < 62 && ilots.length < 12; u += PAS_ILOT) {
      for (let v = -12; v < 30 && ilots.length < 12; v += PAS_ILOT) {
        const la = Math.floor(u / PAS_ILOT) * PAS_ILOT, lb = Math.floor(v / PAS_ILOT) * PAS_ILOT;
        const x = P.x + la + 7, z = P.z + lb + 7;
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
    let entre = false;
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      await poserLe(tab, mx + dx * 6, solM + 2, mz + dz * 6, capVers(-dx, -dz));
      await dormir(300);
      await avancer(tab, 2200);
      const dedansM = await autour(tab);
      if (dedansM.plafond > 0 && dedansM.plafond < 12) { entre = true; break; }
    }
    verifier('et on entre chez les gens : chaque îlot a sa porte', entre);

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

    for (let i = 0; i < 12; i++) await descendre(tab, 1400);
    const enBas = await pose(tab);
    verifier('en descendant l\'escalier, on arrive sur le quai',
      enBas.y < solBouche - 8, `descendu de ${(solBouche - enBas.y).toFixed(1)} blocs`);
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
    await tab.waitForFunction(() => {
      const b = document.getElementById('board-btn');
      return b && getComputedStyle(b).display !== 'none'
        && getComputedStyle(b.closest('.fun-target')).display !== 'none';
    }, null, { timeout: 70000 }).catch(() => {});   // le métro marque les
    // stations : trois rames par ligne, un passage toutes les trente secondes
    const aBord = await bouton(tab, 'board-btn');
    verifier('une rame passe, et on propose de monter dedans',
      aBord.visible, JSON.stringify(aBord));
    // La pastille de couleur dit QUELLE ligne : un enfant qui ne lit pas
    // encore bien reconnaît un rond bleu avant un mot.
    verifier('et la pastille dit de quelle ligne il s\'agit',
      /🔵|🔴|🟢|🟡/.test(aBord.texte), aBord.texte);

    await tab.evaluate(() => document.getElementById('board-btn').click());
    const embarque = await pose(tab);

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
    let arrivee = depart, parcouru = 0;
    for (let i = 0; i < 40 && arrivee.nom === depart.nom; i++) {
      await dormir(800);
      const ici = await pose(tab);
      parcouru = Math.hypot(ici.x - embarque.x, ici.z - embarque.z);
      arrivee = stationLaPlusProche(ici);
    }
    verifier('et le métro nous emmène à la station suivante',
      arrivee.nom !== depart.nom,
      `${depart.nom} → ${arrivee.nom}, ${parcouru.toFixed(0)} m`);

    const enTunnel = await pose(tab);
    const solIci = await tab.evaluate(({ x, z }) =>
      window.__game.world.terrainHeight(Math.floor(x), Math.floor(z)),
    { x: enTunnel.x, z: enTunnel.z });
    verifier('le métro de Washington est SOUTERRAIN : la rame roule sous la rue',
      enTunnel.y < solIci - 3, `rame à y=${enTunnel.y.toFixed(1)}, rue à ${solIci}`);

    await tab.evaluate(() => document.getElementById('board-btn').click());
    await dormir(1500);
    verifier('et on redescend quand on veut',
      !(await bouton(tab, 'board-btn')).texte.startsWith('⬇️'));

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

    // --- 6. l'Air et l'Espace : des avions au-dessus de la tête ---------------
    // Le musée le plus visité d'Amérique. On entre, on lève les yeux : le
    // Spirit of St. Louis et le Bell X-1 sont suspendus. C'est LE « wow »
    // demandé — un intérieur qui vaut le détour, pas quatre murs.
    const musee = D.MONUMENTS_DC.find((m) => m.nom === "Musée de l'Air et de l'Espace");
    const solMusee = await tab.evaluate(({ x, z }) =>
      window.__game.world.terrainHeight(x, z), { x: P.x + musee.u, z: P.z + musee.v });
    await poserLe(tab, P.x + musee.u, solMusee + 2, P.z + musee.v - 8, capVers(0, 1));
    await dormir(400);
    await avancer(tab, 2600);
    const dansMusee = await autour(tab);
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
      dansMusee.plafond > 3, `plafond à ${dansMusee.plafond}`);
    verifier('et des avions sont suspendus au-dessus de la tête',
      suspendus >= 4, `${suspendus} colonnes portent quelque chose en l'air`);
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length ? `\n❌ ${echecs.length} échec(s)` : '\n✅ tout est vert');
  process.exit(echecs.length ? 1 : 0);
})();
