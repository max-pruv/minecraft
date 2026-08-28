// Monter : sur le dos d'une bête, ou à bord de ce qui roule.
//
// Le jeu savait déjà faire monter à cheval, mais presque personne ne l'avait
// jamais fait : il fallait viser l'animal dans un cône de quelques degrés,
// deviner qu'il existait une touche, et tomber sur l'une des trois seules
// espèces autorisées. Le mécanisme marchait ; le trajet de l'enfant, non.
//
// Ces scénarios suivent donc ce trajet-là, du premier regard sur l'animal
// jusqu'à la descente — et le même pour le métro qui passe.
//
//     cd tests && npm install && npm run monte

const { Banc, dormir } = require('./banc.js');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

// Ce que l'enfant voit du bouton : son texte, et s'il est réellement à l'écran.
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
  return {
    x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z,
    oeil: g.player.camera.position.y,
  };
});

// Poser une bête juste devant l'enfant, là où il regarde.
const poserDevant = (p, espece, distance = 3) => p.evaluate(({ espece, distance }) => {
  const g = window.__game;
  for (const a of [...g.animalManager.animals]) {
    g.animalManager.scene.remove(a.mesh);
  }
  g.animalManager.animals.length = 0;
  const x = g.player.pos.x - Math.sin(g.player.yaw) * distance;
  const z = g.player.pos.z - Math.cos(g.player.yaw) * distance;
  return !!g.animalManager.invoquer(espece, x, z);
}, { espece, distance });

// Un cap où l'on peut courir six mètres sans rien rencontrer : sol praticable
// devant, rien à hauteur de tête, aucun trou. Sans cela on ne compare pas
// deux vitesses mais deux obstacles — à pied on n'atteignait pas l'arbre, en
// selle on le percutait, et la monture semblait plus lente.
const capDegage = (p) => p.evaluate(() => {
  const g = window.__game;
  const w = g.world;
  const pos = g.player.pos;
  const fy = Math.floor(pos.y + 0.01);
  for (let i = 0; i < 32; i++) {
    const yaw = (i * Math.PI) / 16;
    let libre = true;
    for (let d = 1; d <= 6 && libre; d++) {
      const x = Math.floor(pos.x - Math.sin(yaw) * d);
      const z = Math.floor(pos.z - Math.cos(yaw) * d);
      // le terrain ondule : un creux d'un bloc se traverse, une bosse non
      if (!w.isSolid(x, fy - 1, z) && !w.isSolid(x, fy - 2, z)) libre = false;
      for (let dy = 0; dy <= 1; dy++) if (w.isSolid(x, fy + dy, z)) libre = false;
    }
    if (libre) return yaw;
  }
  return null;
});

// Combien de mètres on parcourt en tenant la touche « avance » une demi-seconde,
// toujours depuis le même point et dans la même direction : comparer un
// départ en terrain libre à un départ le nez contre un arbre ne prouverait
// rien du tout.
async function avancerUnDemiSeconde(p, depart) {
  await p.evaluate((d) => {
    const g = window.__game;
    g.player.pos.set(d.x, d.y, d.z);
    g.player.vel.set(0, 0, 0);
    g.player.yaw = d.yaw;
  }, depart);
  await dormir(250);
  const avant = await pose(p);
  await p.keyboard.down('KeyW');
  await dormir(500);
  await p.keyboard.up('KeyW');
  const apres = await pose(p);
  return Math.hypot(apres.x - avant.x, apres.z - avant.z);
}

(async () => {
  const banc = new Banc({ portJeu: 8326, portPairs: 9326 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Marlon', { tactile: true });

    // --- une bête devant soi -------------------------------------------------
    verifier('l\'éléphant fait partie du monde', await poserDevant(tab, 'elephant'));
    // Le bouton se rafraîchit tous les quarts de seconde : on l'attend, on ne
    // le devine pas. Une attente fixe passait sur une machine au repos et
    // tombait sous la charge du portail complet.
    await tab.waitForFunction(() => {
      const b = document.getElementById('ride-btn');
      return b && getComputedStyle(b).display !== 'none'
        && getComputedStyle(b.closest('.fun-target')).display !== 'none';
    }, null, { timeout: 5000 }).catch(() => {});

    const propose = await bouton(tab, 'ride-btn');
    verifier('un éléphant devant soi propose de monter',
      propose.visible, JSON.stringify(propose));
    verifier('et le bouton porte l\'animal qu\'on a sous les yeux',
      propose.texte.includes('🐘'), propose.texte);

    // Le vieux défaut : il fallait viser l'animal au degré près. Ici on le
    // regarde de biais, comme on le fait vraiment en marchant.
    await tab.evaluate(() => { window.__game.player.yaw += 0.5; });
    await dormir(600);
    const deBiais = await bouton(tab, 'ride-btn');
    verifier('le bouton tient bon quand on regarde l\'animal de biais',
      deBiais.visible, JSON.stringify(deBiais));

    // La preuve que ce n'est pas la même règle qu'avant : dans cette position
    // exacte, la visée — celle qui commandait le bouton et qui sert encore à
    // nourrir — ne trouve aucun animal. C'est ce cône de vingt degrés qui
    // rendait la monte introuvable.
    // Les deux règles sont lues DANS LE MÊME INSTANT — c'est ce qui rend la
    // comparaison honnête — et on attend le moment qui prouve quelque chose.
    // La bête marche : selon qu'elle dérive vers le regard ou s'en écarte, la
    // visée la trouve ou non, et un seul coup d'œil tombait parfois sur
    // l'instant où elle repassait dans le cône. Ce n'était pas la règle qui
    // vacillait, c'était l'échantillon.
    const lire = () => tab.evaluate(() => ({
      vise: !!window.__game.animalManager.targeted(),
      monture: !!window.__game.animalManager.monture(),
    }));
    let regles = await lire();
    const finDeBiais = Date.now() + 4000;
    while ((regles.vise || !regles.monture) && Date.now() < finDeBiais) {
      await dormir(200);
      regles = await lire();
    }
    verifier('là où l\'ancienne visée ne trouvait rien, la monte la voit',
      !regles.vise && regles.monture, JSON.stringify(regles));

    // Mais tourner le dos, c'est autre chose : le bouton doit disparaître.
    await tab.evaluate(() => { window.__game.player.yaw += Math.PI; });
    await dormir(600);
    verifier('et il s\'efface quand on tourne le dos à la bête',
      !(await bouton(tab, 'ride-btn')).visible);
    await tab.evaluate(() => { window.__game.player.yaw -= Math.PI + 0.5; });
    await dormir(600);

    // --- en selle ------------------------------------------------------------
    const aPied = await pose(tab);
    const cap = await capDegage(tab);
    verifier('on a trouvé un champ dégagé pour comparer les deux allures',
      cap !== null, cap === null ? 'aucun cap libre sur six mètres' : `${(cap * 180 / Math.PI).toFixed(0)}°`);
    const depart = await tab.evaluate((yaw) => {
      const g = window.__game;
      return { x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z, yaw: yaw ?? g.player.yaw };
    }, cap);
    const distanceAPied = await avancerUnDemiSeconde(tab, depart);
    await poserDevant(tab, 'elephant');
    await dormir(600);
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(700);

    const enSelle = await pose(tab);
    verifier('en selle sur l\'éléphant, on voit par-dessus les toits',
      enSelle.oeil - enSelle.y > (aPied.oeil - aPied.y) + 2,
      `œil à ${(aPied.oeil - aPied.y).toFixed(2)} m à pied, ${(enSelle.oeil - enSelle.y).toFixed(2)} m en selle`);

    const distanceEnSelle = await avancerUnDemiSeconde(tab, depart);
    verifier('et on avance plus vite qu\'à pied',
      distanceEnSelle > distanceAPied * 1.3,
      `${distanceAPied.toFixed(1)} m à pied · ${distanceEnSelle.toFixed(1)} m en selle`);

    const monture = await tab.evaluate(() => {
      const g = window.__game;
      const a = g.animalManager.animals[0];
      return a ? Math.hypot(a.pos.x - g.player.pos.x, a.pos.z - g.player.pos.z) : 99;
    });
    verifier('la bête reste bien sous nous pendant tout le trajet',
      monture < 1.5, `${monture.toFixed(2)} m`);

    const descendre = await bouton(tab, 'ride-btn');
    verifier('et le bouton propose maintenant de descendre',
      descendre.visible && descendre.texte.includes('Descendre'), JSON.stringify(descendre));
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(600);
    const aTerre = await pose(tab);
    verifier('une fois descendu, on retrouve sa taille',
      Math.abs((aTerre.oeil - aTerre.y) - (aPied.oeil - aPied.y)) < 0.2,
      `${(aTerre.oeil - aTerre.y).toFixed(2)} m`);

    // --- ce qui ne se monte pas ---------------------------------------------
    await poserDevant(tab, 'chicken');
    await dormir(600);
    verifier('une poule, elle, ne propose pas de monter dessus',
      !(await bouton(tab, 'ride-btn')).visible);

    // --- le métro qui passe --------------------------------------------------
    // On se poste sur le tracé, un peu en avant de la rame, et on attend
    // qu'elle arrive — exactement ce que fait un enfant sur le quai.
    const enAvant = await tab.evaluate(() => window.__vehicules.point(0, 20));
    verifier('le métro tourne bien quelque part sur la carte', !!enAvant,
      JSON.stringify(enAvant));
    await tab.evaluate((pt) => {
      const g = window.__game;
      g.player.flying = true;
      g.player.pos.set(pt.x, pt.y, pt.z);
      g.player.vel.set(0, 0, 0);
    }, enAvant);
    await dormir(300);
    verifier('rien à bord tant que la rame n\'est pas là',
      !(await bouton(tab, 'board-btn')).visible);

    await tab.waitForFunction(() => {
      const b = document.getElementById('board-btn');
      return b && getComputedStyle(b).display !== 'none'
        && getComputedStyle(b.closest('.fun-target')).display !== 'none';
    }, null, { timeout: 15000 }).catch(() => {});
    const aBord = await bouton(tab, 'board-btn');
    verifier('quand la rame arrive, on propose de monter à bord',
      aBord.visible, JSON.stringify(aBord));

    await tab.evaluate(() => document.getElementById('board-btn').click());
    const embarque = await pose(tab);
    // On mesure une DISTANCE, pas une vitesse : sous la charge du portail
    // complet, le jeu tourne au ralenti et le même trajet prend plus de
    // temps. Ce qui compte est qu'on soit emporté, pas le chrono.
    let parcouru = 0;
    for (let i = 0; i < 16 && parcouru < 8; i++) {
      await dormir(700);
      const ici = await pose(tab);
      parcouru = Math.hypot(ici.x - embarque.x, ici.z - embarque.z);
    }
    verifier('et le métro nous emmène pour de bon',
      parcouru > 8, `${parcouru.toFixed(1)} m`);

    const surLaRame = await tab.evaluate(() => {
      const g = window.__game;
      const pt = window.__vehicules.placeProche(4);
      return pt ? Math.hypot(pt.x - g.player.pos.x, pt.z - g.player.pos.z) : 99;
    });
    verifier('on est assis dans la rame, pas traîné derrière',
      surLaRame < 2.5, `${surLaRame.toFixed(2)} m`);

    await tab.evaluate(() => document.getElementById('board-btn').click());
    await dormir(1200);
    const laisse = await tab.evaluate(() => {
      const g = window.__game;
      return { x: g.player.pos.x, z: g.player.pos.z };
    });
    await dormir(1200);
    const apresDescente = await tab.evaluate(() => {
      const g = window.__game;
      return { x: g.player.pos.x, z: g.player.pos.z };
    });
    verifier('une fois descendu, la rame continue sans nous',
      Math.hypot(apresDescente.x - laisse.x, apresDescente.z - laisse.z) < 3,
      JSON.stringify({ laisse, apresDescente }));

    // --- la monoplace freine dans les virages -------------------------------
    //
    // Demandé par Max : « je n'arrive pas à monter sur la formule un parce
    // qu'elle va trop vite ». Elle roulait à dix-sept mètres par seconde
    // partout, épingles comprises, et traversait la zone d'embarquement entre
    // deux rafraîchissements du bouton. Une vraie monoplace freine avant le
    // virage et relance en ligne droite — c'est ce qui laisse le temps.
    const allures = [];
    for (let i = 0; i < 40; i++) {
      await dormir(400);
      const etats = await tab.evaluate(() => window.__vehicules.etat());
      // Les deux premiers convois sont les rames du métro ; les suivants sont
      // les monoplaces, et ce sont elles qui freinent.
      // UNE seule voiture, suivie dans le temps. Prendre la plus lente des six
      // à chaque instant ne suit personne : il y a toujours quelqu'un dans un
      // virage, et on mesure alors la forme du circuit, pas le comportement
      // d'une monoplace.
      if (etats[2]) allures.push(etats[2].vitesse);
    }
    const lente = Math.min(...allures), rapide = Math.max(...allures);
    verifier('la monoplace ne roule pas à la même allure partout',
      rapide / Math.max(0.1, lente) > 1.8,
      `de ${lente.toFixed(1)} à ${rapide.toFixed(1)} m/s`);
    verifier('et elle ralentit assez pour qu\'on puisse la rejoindre',
      lente < 9, `${lente.toFixed(1)} m/s au plus lent`);

    // Et le bouton, lui, doit apparaître : c'est le vrai trajet de l'enfant,
    // planté au bord du circuit à attendre qu'une voiture passe.
    const surLeCircuit = await tab.evaluate(() => window.__vehicules.point(2, 12));
    verifier('le circuit tourne quelque part sur la carte', !!surLeCircuit,
      JSON.stringify(surLeCircuit));
    await tab.evaluate((pt) => {
      const g = window.__game;
      g.player.flying = true;
      g.player.pos.set(pt.x, pt.y, pt.z);
      g.player.vel.set(0, 0, 0);
    }, surLeCircuit);
    const monteeF1 = await tab.waitForFunction(() => {
      const b = document.getElementById('board-btn');
      return !!(b && getComputedStyle(b).display !== 'none'
        && getComputedStyle(b.closest('.fun-target')).display !== 'none'
        && b.textContent.includes('🏎️'));
    }, null, { timeout: 60000 }).then(() => true).catch(() => false);
    verifier('quand la monoplace arrive, on a le temps de voir le bouton',
      monteeF1, JSON.stringify(await bouton(tab, 'board-btn')));

    // --- les pastilles de l'écran sont des boutons, pas des jauges muettes --
    //
    // Max, capture à l'appui : « je ne comprends pas à quoi servent ces
    // boutons — quand on clique, il ne se passe rien. » Désormais le
    // garde-manger ouvre l'atelier, et la jauge du chantier ouvre l'onglet
    // Chantier, qui dit OÙ est le chantier. On suit le doigt de l'enfant :
    // la récolte fait naître la pastille, le toucher fait le reste.
    await tab.evaluate(() => window.__game.animalManager.onHarvest({ meat: '🍖 Côtelette' }));
    const pastille = await tab.evaluate(() => {
      const el = document.getElementById('meat-counter');
      const st = getComputedStyle(el);
      return { visible: st.display !== 'none', touchable: st.pointerEvents !== 'none', texte: el.textContent };
    });
    verifier('la pastille du garde-manger est visible et touchable',
      pastille.visible && pastille.touchable, JSON.stringify(pastille));
    await tab.evaluate(() => document.getElementById('meat-counter').click());
    const atelier = await tab.evaluate(() => {
      const panneau = document.getElementById('fun-main-panel');
      const on = panneau.querySelector('.fun-tab.on');
      return { ouvert: getComputedStyle(panneau).display === 'block',
        onglet: on && on.dataset.t,
        gardeManger: document.getElementById('fun-tab-body').textContent.includes('Garde-manger') };
    });
    verifier('la toucher ouvre l\'atelier, garde-manger sous les yeux',
      atelier.ouvert && atelier.onglet === 'craft' && atelier.gardeManger, JSON.stringify(atelier));

    // Le chantier : on le pose par le vrai chemin (l'onglet), puis on touche
    // la jauge qui vient d'apparaître.
    await tab.evaluate(() => {
      window.__game.fun.ouvrirOnglet('chantier');
      const b = [...document.querySelectorAll('#fun-tab-body button')]
        .find((x) => x.textContent.includes('Cabane'));
      b.click();
    });
    const jauge = await tab.evaluate(() => {
      const el = document.getElementById('chantier-hud');
      const st = getComputedStyle(el);
      return { visible: st.display !== 'none', touchable: st.pointerEvents !== 'none', texte: el.textContent };
    });
    verifier('poser un chantier fait apparaître sa jauge, touchable',
      jauge.visible && jauge.touchable && /\/71$/.test(jauge.texte), JSON.stringify(jauge));
    await tab.evaluate(() => document.getElementById('chantier-hud').click());
    const ongletChantier = await tab.evaluate(() => {
      const panneau = document.getElementById('fun-main-panel');
      const on = panneau.querySelector('.fun-tab.on');
      const corps = document.getElementById('fun-tab-body').textContent;
      return { ouvert: getComputedStyle(panneau).display === 'block',
        onglet: on && on.dataset.t, ditOu: corps.includes('📍'), corps: corps.slice(0, 160) };
    });
    verifier('toucher la jauge ouvre le Chantier, qui dit où il est',
      ongletChantier.ouvert && ongletChantier.onglet === 'chantier' && ongletChantier.ditOu,
      JSON.stringify({ onglet: ongletChantier.onglet, ditOu: ongletChantier.ditOu }));

    // LA BIBLIOTHÈQUE VIT DANS LE + (v176). Max : « les bâtiments, je
    // voudrais que tu les déplaces dans le bouton plus, là où tu as les
    // blocs, la déco et les meubles. » On éprouve le trajet de l'enfant :
    // ouvrir l'inventaire, toucher l'onglet 🏛️, voir des vignettes — et
    // POSER : un tap, et le bâtiment se dresse devant soi.
    const biblio = await tab.evaluate(async () => {
      document.getElementById('inv-panel').style.display = 'flex';
      const onglet = document.querySelector('#inv-tabs button[data-tab="batiments"]');
      if (!onglet) return { onglet: false };
      onglet.click();
      // les vignettes arrivent par petits paquets d'images : on les attend
      for (let k = 0; k < 200; k++) {
        await new Promise((r) => requestAnimationFrame(r));
        if (document.querySelectorAll('#inv-grid .inv-bat').length >= 40) break;
      }
      const cellules = document.querySelectorAll('#inv-grid .inv-bat');
      const vignettes = [...cellules].filter((c) => c.querySelector('canvas')).length;
      return { onglet: true, libelle: onglet.textContent.trim(),
        cellules: cellules.length, vignettes,
        titre: document.getElementById('inv-title').textContent };
    });
    verifier('l\'onglet Bâtiments vit dans l\'inventaire, vignettes à l\'appui',
      biblio.onglet && biblio.libelle.includes('Bâtiments') && biblio.cellules >= 40
      && biblio.vignettes === biblio.cellules && /\d{3}/.test(biblio.titre),
      JSON.stringify(biblio));
    // On dégage le champ, on pose le premier bâtiment, et on compte ce qui
    // s'est dressé devant : des blocs, beaucoup, là où il n'y avait rien.
    const pose2 = await tab.evaluate(async () => {
      const g = window.__game;
      g.player.flying = true;
      g.player.pos.set(-1500, g.world.terrainHeight(-1500, -1500) + 2, -1500);
      g.player.yaw = 0; g.player.vel.set(0, 0, 0);
      await new Promise((r) => setTimeout(r, 600));
      // On compte ce que le monde retient : chaque bloc posé est une édition.
      const avant = g.world.edits.size;
      const cell = document.querySelector('#inv-grid .inv-bat');
      cell.click();
      await new Promise((r) => setTimeout(r, 800));
      return { poses: g.world.edits.size - avant,
        ferme: document.getElementById('inv-panel').style.display === 'none' };
    });
    verifier('un tap sur une vignette pose le bâtiment devant soi',
      pose2.poses > 100 && pose2.ferme, JSON.stringify(pose2));

    // --- la Giga-usine : la chaîne roule, la peinture opère, on conduit ------
    //
    // Max : « des chaînes de production, des robots, des voitures qui
    // avancent, des steps de process… je veux conduire la voiture quand elle
    // est finie. » On va donc à Austin, on regarde la chaîne travailler, et
    // on prend le volant d'une voiture neuve sur le parc.
    await tab.evaluate(async () => {
      const { USINE } = await import('./src/usine.js');
      const g = window.__game;
      const p = USINE();
      g.player.flying = true;
      g.player.pos.set(p.x - 30, g.world.terrainHeight(p.x - 30, p.z) + 3, p.z + 8);
      g.player.vel.set(0, 0, 0);
    });
    await dormir(3500);   // le temps que les morceaux du Texas arrivent

    // Un seul guetteur accumule trois preuves dans la durée : du GRIS et de
    // la COULEUR vus sur la chaîne (la peinture opère), et un ARRÊT tenu
    // presque deux secondes (les postes marquent). Un tour complet dure plus
    // de deux minutes — on laisse le temps du tour, pas davantage.
    await tab.evaluate(() => {
      window.__usineVu = { gris: false, couleur: false, arret: false, visibles: 0, d0: -1, t0: 0 };
    });
    await tab.waitForFunction(() => {
      const v = window.__usineVu;
      const e = (window.__vehicules.etat() || []).find((c) => c.nom === 'voiture de la chaîne');
      if (!e) return false;
      v.visibles = Math.max(v.visibles, e.visibles);
      for (const c of e.couleurs || []) { if (c === 0x9a9a9a) v.gris = true; else v.couleur = true; }
      if (e.visibles > 0) {
        const t = performance.now();
        if (e.distance === v.d0) { if (t - v.t0 > 1800) v.arret = true; }
        else { v.d0 = e.distance; v.t0 = t; }
      }
      return v.gris && v.couleur && v.arret;
    }, null, { timeout: 160000, polling: 300 }).catch(() => {});
    const vuUsine = await tab.evaluate(() => window.__usineVu);
    verifier('la chaîne de la Giga-usine roule, ses voitures se montrent',
      vuUsine.visibles > 0, `${vuUsine.visibles} voiture(s) vue(s)`);
    verifier('la peinture opère : des caisses grises, et des colorées, sur la même chaîne',
      vuUsine.gris && vuUsine.couleur, JSON.stringify({ gris: vuUsine.gris, couleur: vuUsine.couleur }));
    verifier('et la chaîne marque l\'arrêt à ses postes',
      vuUsine.arret, vuUsine.arret ? 'un arrêt tenu' : 'jamais vue à l\'arrêt');

    // Le garagiste : on approche du parc, trois voitures neuves attendent.
    await tab.evaluate(async () => {
      const { USINE } = await import('./src/usine.js');
      const g = window.__game;
      const p = USINE();
      g.player.pos.set(p.x + 44, g.world.terrainHeight(p.x + 44, p.z + 7) + 3, p.z + 12);
      g.player.vel.set(0, 0, 0);
    });
    const garees = await tab.waitForFunction(() => {
      const n = window.__game.animalManager.animals.filter((a) => a.def.key === 'voiture').length;
      return n >= 3 ? n : null;
    }, null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => 0);
    verifier('le garagiste gare trois voitures neuves sur le parc',
      garees >= 3, `${garees} voiture(s) garée(s)`);

    // Au volant. Le même protocole que l'éléphant : on mesure la distance
    // parcourue en une demi-seconde, à pied puis au volant, sur le même cap.
    verifier('une voiture neuve se pose devant soi', await poserDevant(tab, 'voiture'));
    await tab.waitForFunction(() => {
      const b = document.getElementById('ride-btn');
      return b && getComputedStyle(b).display !== 'none'
        && getComputedStyle(b.closest('.fun-target')).display !== 'none';
    }, null, { timeout: 5000 }).catch(() => {});
    const proposeAuto = await bouton(tab, 'ride-btn');
    verifier('elle propose de monter — clés sur le contact',
      proposeAuto.visible && proposeAuto.texte.includes('🚗'), JSON.stringify(proposeAuto));

    await tab.evaluate(() => { window.__game.player.flying = false; });
    const capAuto = await capDegage(tab);
    const departAuto = await tab.evaluate((yaw) => {
      const g = window.__game;
      return { x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z, yaw: yaw ?? g.player.yaw };
    }, capAuto);
    const distanceAPiedTexas = await avancerUnDemiSeconde(tab, departAuto);
    await poserDevant(tab, 'voiture');
    await dormir(600);
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(700);
    const distanceAuVolant = await avancerUnDemiSeconde(tab, departAuto);
    verifier('au volant, on file bien plus vite qu\'à pied — c\'est une voiture',
      distanceAuVolant > distanceAPiedTexas * 2.2,
      `${distanceAPiedTexas.toFixed(1)} m à pied · ${distanceAuVolant.toFixed(1)} m au volant`);
    const sousNous = await tab.evaluate(() => {
      const g = window.__game;
      const a = g.animalManager.animals.find((x) => x.def.key === 'voiture');
      return a ? Math.hypot(a.pos.x - g.player.pos.x, a.pos.z - g.player.pos.z) : 99;
    });
    verifier('la voiture reste sous nous pendant tout le trajet',
      sousNous < 1.5, `${sousNous.toFixed(2)} m`);

    // LA VUE PARE-BRISE (Max) : « quand on roule avec une voiture, je veux la
    // vue derrière le pare-brise, réaliste. » Assis au volant, l'œil est DANS
    // l'habitacle — au-dessus du capot (0,87), sous le toit (1,46) — et le
    // volant existe dans le modèle. L'ancien code posait la caméra à 2,6 blocs,
    // au-dessus du toit de la voiture : rouge garanti.
    const cockpit = await tab.evaluate(() => {
      const g = window.__game;
      const a = g.animalManager.animals.find((x) => x.def.key === 'voiture');
      let volant = false;
      if (a) a.mesh.traverse((m) => {
        if (m.geometry && m.geometry.type === 'TorusGeometry') volant = true;
      });
      return { oeil: +(g.player.camera.position.y - g.player.pos.y).toFixed(2), volant };
    });
    verifier('au volant, l\'œil est derrière le pare-brise, sous le toit',
      cockpit.oeil > 0.9 && cockpit.oeil < 1.46, `${cockpit.oeil} bloc au-dessus des pieds`);
    verifier('et le volant est là, dans l\'habitacle',
      cockpit.volant, cockpit.volant ? 'volant trouvé' : 'pas de volant dans le modèle');

    // LA PLACE DU CONDUCTEUR (Max : « la vue depuis l'intérieur du cockpit
    // n'est pas beau »). On s'assied À GAUCHE, pas au milieu de la banquette :
    // l'œil est décalé latéralement d'un tiers de bloc par rapport aux pieds.
    // L'ancien code ne touchait qu'à la hauteur — décalage nul, rouge garanti.
    const conducteur = await tab.evaluate(() => {
      const g = window.__game;
      return +Math.hypot(g.player.camera.position.x - g.player.pos.x,
        g.player.camera.position.z - g.player.pos.z).toFixed(3);
    });
    verifier('on est assis à la place du conducteur, pas au milieu',
      conducteur > 0.25 && conducteur < 0.5, `œil décalé de ${conducteur} bloc`);

    // LA CARROSSERIE DE LA VRAIE VIE (Max, capture à l'appui : « je les veux
    // pas en format minecraft »). Une vraie voiture a des vitres TRANSPARENTES
    // — on voit l'habitacle à travers — et une caisse sculptée à l'Atelier :
    // un maillage fusionné de centaines de sommets (galbe, capot plongeant,
    // montants), pas huit boîtes. L'ancien modèle : vitres opaques, zéro
    // maillage fusionné — rouge garanti.
    const carrosserie = await tab.evaluate(() => {
      const g = window.__game;
      const a = g.animalManager.animals.find((x) => x.def.key === 'voiture');
      let vitresTransparentes = false, sommetsFusionnes = 0;
      if (a) a.mesh.traverse((m) => {
        if (!m.isMesh) return;
        if (m.material && m.material.transparent && m.material.opacity < 0.8) vitresTransparentes = true;
        if (m.geometry && m.geometry.attributes && m.geometry.attributes.position
          && m.geometry.attributes.position.count > sommetsFusionnes) {
          sommetsFusionnes = m.geometry.attributes.position.count;
        }
      });
      return { vitresTransparentes, sommetsFusionnes };
    });
    verifier('la voiture a de vraies vitres — on voit l\'habitacle à travers',
      carrosserie.vitresTransparentes, JSON.stringify(carrosserie));
    verifier('et une carrosserie sculptée, fusionnée — pas un empilement de cubes',
      carrosserie.sommetsFusionnes >= 300, `${carrosserie.sommetsFusionnes} sommets`);
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(400);

    // LA VOITURE GARÉE NE BOUGE PLUS TOUTE SEULE (Max : « elles bougent
    // d'une position à une autre de manière radicale et violente, tac tac
    // tac »). Le vagabondage du bestiaire lui sautait un cap aléatoire au
    // plus tard toutes les quatre secondes. On la regarde cinq secondes DE
    // JEU — l'horloge du banc, pas celle du mur — : cap et position figés.
    const garee0 = await tab.evaluate(() => {
      const a = window.__game.animalManager.animals.find((x) => x.def.key === 'voiture');
      return a ? { yaw: a.mesh.rotation.y, x: a.pos.x, z: a.pos.z } : null;
    });
    await tab.evaluate(() => new Promise((fin) => {
      let sim = 0, prec = performance.now();
      const tic = (t) => {
        sim += Math.min(Math.max((t - prec) / 1000, 0), 0.05); prec = t;
        if (sim >= 5) fin(); else requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
    }));
    const garee1 = await tab.evaluate(() => {
      const a = window.__game.animalManager.animals.find((x) => x.def.key === 'voiture');
      return a ? { yaw: a.mesh.rotation.y, x: a.pos.x, z: a.pos.z } : null;
    });
    const derive = garee0 && garee1
      ? { cap: Math.abs(garee1.yaw - garee0.yaw),
        pas: Math.hypot(garee1.x - garee0.x, garee1.z - garee0.z) }
      : null;
    verifier('une voiture garée ne bouge plus toute seule — ni cap ni position',
      !!derive && derive.cap < 0.01 && derive.pas < 0.05,
      derive ? `cap ${derive.cap.toFixed(3)} rad · ${derive.pas.toFixed(2)} bloc en 5 s de jeu`
        : 'voiture introuvable');

    // --- les villes vivantes : la circulation roule, les passants marchent ---
    //
    // Max : « les villes n'ont pas de vie. Il n'y a pas de voitures qui
    // circulent, il n'y a pas de piétons. » On va à Rome : dans les secondes
    // qui suivent l'arrivée, l'anneau de circulation naît et ses voitures se
    // montrent, et six passants peuplent les rues — puis on vérifie qu'ils
    // MARCHENT, pas qu'ils posent.
    await tab.evaluate(async () => {
      const { positionDe } = await import('./src/mondes.js');
      const g = window.__game;
      const p = positionDe('rome');
      g.player.flying = true;
      g.player.pos.set(p.x, g.world.terrainHeight(p.x, p.z) + 6, p.z);
      g.player.vel.set(0, 0, 0);
    });
    await dormir(3000);
    const circule = await tab.waitForFunction(() => {
      const conv = (window.__vehicules.etat() || []).filter((c) => c.nom === 'voiture');
      const vues = conv.reduce((n, c) => n + c.visibles, 0);
      return conv.length > 0 && vues > 0 ? { convois: conv.length, vues } : null;
    }, null, { timeout: 30000, polling: 400 }).then((h) => h.jsonValue()).catch(() => null);
    verifier('la circulation naît à l\'approche, et ses voitures se montrent',
      !!circule, circule ? `${circule.convois} anneau(x), ${circule.vues} voiture(s) en vue` : 'aucune voiture');

    // LE BUS (v178). Max : « much more life in cities, cars, buses… » Chaque
    // ville a son bus sur le grand anneau — il existe, et il dessert : ses
    // arrêts sont posés sur son tracé.
    const lebus = await tab.waitForFunction(() => {
      const b2 = (window.__vehicules.etat() || []).find((c2) => c2.nom === 'bus');
      return b2 ? { present: true, total: b2.total } : null;
    }, null, { timeout: 15000, polling: 400 }).then((h) => h.jsonValue()).catch(() => null);
    verifier('et le bus de la ville roule sur le grand anneau',
      !!lebus && lebus.total >= 1, JSON.stringify(lebus));

    // LES TRAINS INTERVILLES (v179) : dix-huit rames sur neuf navettes
    // réelles (Eurostar, TGV, Shinkansen, AVE, Frecciarossa, ICE), et elles
    // ROULENT — on suit la distance d'une rame jusqu'à la voir avancer, en
    // laissant passer un éventuel arrêt en gare (quatre secondes de jeu).
    const train = await tab.evaluate(async () => {
      const v = window.__vehicules;
      const etat0 = v.etat() || [];
      // On suit UNE rame par son RANG dans la liste — deux rames partagent le
      // même nom, et suivre « le premier train dont la distance a changé »
      // comparerait deux rames différentes.
      const i0 = etat0.findIndex((c2) => c2.nom.startsWith('train '));
      const rames = etat0.filter((c2) => c2.nom.startsWith('train ')).length;
      if (i0 < 0) return { rames: 0 };
      const d0 = etat0[i0].distance;
      const t0 = performance.now();
      while (performance.now() - t0 < 60000) {
        await new Promise((r) => setTimeout(r, 800));
        const d1 = v.etat()[i0].distance;
        if (Math.abs(d1 - d0) > 10) return { rames, avance: Math.round(Math.abs(d1 - d0)) };
      }
      return { rames, avance: 0 };
    });
    verifier('les trains intervilles roulent sur leurs lignes',
      train.rames >= 9 && train.avance > 10, JSON.stringify(train));

    const peuple = await tab.waitForFunction(() => {
      const p2 = window.__game.passants;
      return p2 && p2.effectif() >= 10 ? p2.effectif() : null;
    }, null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => 0);
    verifier('les passants peuplent les rues à l\'arrivée — dix par ville',
      peuple >= 10, `${peuple} promeneur(s)`);

    // ET LES CHIENS (v178) : « dogs » — deux promeneurs sur dix trottinent à
    // quatre pattes.
    const chiens = await tab.evaluate(() => {
      const s2 = window.__game.passants.sites.find((x) => x.peuple);
      return s2.peuple.filter((h) => h.name === 'chien').length;
    });
    verifier('et deux d\'entre eux sont des chiens qui trottinent',
      chiens >= 2, `${chiens} chien(s)`);

    const avant = await tab.evaluate(() => {
      const s2 = window.__game.passants.sites.find((x) => x.peuple);
      return s2.peuple.map((h) => [h.pos.x, h.pos.z]);
    });
    await dormir(8000);
    const bouge = await tab.evaluate((av) => {
      const s2 = window.__game.passants.sites.find((x) => x.peuple);
      let n = 0;
      s2.peuple.forEach((h, i) => {
        if (Math.hypot(h.pos.x - av[i][0], h.pos.z - av[i][1]) > 0.6) n++;
      });
      return n;
    }, avant);
    verifier('et ils marchent — ce sont des passants, pas des statues',
      bouge >= 2, `${bouge} promeneur(s) sur la place ont bougé en huit secondes`);

    // --- les poissons : la mer aussi est vivante ------------------------------
    //
    // Max : « add fish swimming ». On se pose au-dessus de la mer de Marseille
    // — la côte automatique de v173 : la plage au sud, l'eau au-delà — et on
    // attend que le banc s'entretienne. Trois preuves, dans l'ordre du regard
    // de l'enfant : des poissons existent, ils sont DANS l'eau (pas dans le
    // pré ni dans le ciel), et ils NAGENT. La fenêtre se compte en secondes de
    // JEU, leçon du métro de Washington : sous SwiftShader la simulation
    // avance quatre fois plus lentement que l'horloge.
    await tab.evaluate(async () => {
      const { positionDe } = await import('./src/mondes.js');
      const g = window.__game;
      const m2 = positionDe('marseille');
      // au large : au-delà de la plage (mer à 0,55 rayon), côté sud
      g.player.flying = true;
      g.player.pos.set(m2.x + 4, 42, m2.z + m2.r * 0.8);
      g.player.vel.set(0, 0, 0);
      window.__simPoissons = 0;
      let prec = performance.now();
      const tic = (now) => {
        window.__simPoissons += Math.min(Math.max((now - prec) / 1000, 0), 0.05);
        prec = now;
        requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
    });
    const banc2 = await tab.waitForFunction(() => {
      const po = window.__game.poissons;
      if (!po) return 'absent';
      return po.effectif() >= 3 || window.__simPoissons > 45 ? po.effectif() : null;
    }, null, { timeout: 180000, polling: 800 }).then((h) => h.jsonValue()).catch(() => 0);
    verifier('des poissons peuplent la mer devant l\'enfant',
      banc2 !== 'absent' && banc2 >= 3, `${banc2} poisson(s)`);

    const dansLEau = await tab.evaluate(async () => {
      const { BLOCK } = await import('./src/blocks.js');
      const g = window.__game;
      if (!g.poissons) return null;
      return g.poissons.banc.filter((p2) => {
        const m3 = p2.mesh.position;
        return g.world.getBlock(Math.floor(m3.x), Math.floor(m3.y), Math.floor(m3.z)) !== BLOCK.WATER;
      }).length;
    });
    verifier('et chacun est dans l\'eau — pas dans le pré, pas dans le ciel',
      dansLEau === 0, `${dansLEau} hors de l'eau`);

    const nage0 = await tab.evaluate(() => ({
      sim: window.__simPoissons,
      pos: window.__game.poissons ? window.__game.poissons.banc.map((p2) => [p2.mesh.position.x, p2.mesh.position.z]) : [],
    }));
    await tab.waitForFunction((s0) => window.__simPoissons - s0 > 4, nage0.sim, { timeout: 60000 }).catch(() => {});
    const nage = await tab.evaluate((av) => {
      const po = window.__game.poissons;
      if (!po) return 0;
      let n = 0;
      po.banc.slice(0, av.length).forEach((p2, i) => {
        if (Math.hypot(p2.mesh.position.x - av[i][0], p2.mesh.position.z - av[i][1]) > 1) n++;
      });
      return n;
    }, nage0.pos);
    verifier('et ils nagent — quatre secondes de jeu les déplacent',
      nage >= 2, `${nage} sur ${nage0.pos.length} ont nagé plus d'un bloc`);

    verifier('aucune erreur JavaScript de bout en bout', tab.erreurs.length === 0,
      JSON.stringify(tab.erreurs));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ on monte sur les bêtes et à bord du métro');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
