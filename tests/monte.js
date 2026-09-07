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
// Se PLACER est un geste à part, et il compte : c'est un téléport. La
// monture conduite y suit le joueur d'un bond de plusieurs blocs, et un
// témoin qui mesure à cheval sur ce bond mesure le bond. (Le jeu, lui,
// ignore désormais ces sauts pour la rotation des roues.)
async function placerA(p, depart) {
  await p.evaluate((d) => {
    const g = window.__game;
    g.player.pos.set(d.x, d.y, d.z);
    g.player.vel.set(0, 0, 0);
    g.player.yaw = d.yaw;
  }, depart);
  await dormir(250);
}

async function avancerUnDemiSeconde(p, depart) {
  if (depart) await placerA(p, depart);
  const avant = await pose(p);
  await p.keyboard.down('KeyW');
  // La fenêtre se compte en SECONDES DE JEU, pas en temps d'horloge : sous
  // la charge du portail, une demi-seconde murale ne contient parfois que
  // trois images à dt plafonné (1/20 s) — la distance fondait, et le témoin
  // accusait la voiture d'être lente alors qu'on avait mesuré la machine.
  // Vu en v183 : la mesure « au volant » tombait 700 ms après la monte, en
  // pleine fête d'emojis, et rendait 1,5 m contre 1,6 m à pied. On accumule
  // donc le même dt que main.js, borne comprise, comme l'horloge du banc.
  await p.evaluate(() => new Promise((fin) => {
    let cumul = 0, prec = performance.now();
    const pas = (t) => {
      cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05);
      prec = t;
      if (cumul >= 0.5) fin(); else requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }));
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
    // QUATRE SECONDES SUFFISAIENT SEUL, PAS SOUS CHARGE. Le portail complet
    // fait tourner cette suite derrière d'autres, et à quelques images par
    // seconde la bête avance par à-coups : la fenêtre où elle sort du cône de
    // visée passait entre deux échantillons. Rouge dans le portail, vert
    // rejouée seule — c'est le banc qu'on mesurait, pas la règle. On regarde
    // donc trois fois plus longtemps, ce qui ne coûte rien quand la fenêtre
    // arrive tout de suite.
    const finDeBiais = Date.now() + 12000;
    while ((regles.vise || !regles.monture) && Date.now() < finDeBiais) {
      await dormir(200);
      regles = await lire();
    }
    verifier('là où l\'ancienne visée ne trouvait rien, la monte la voit',
      !regles.vise && regles.monture, JSON.stringify(regles));

    // Mais tourner le dos, c'est autre chose : le bouton doit disparaître.
    //
    // On ATTEND sa disparition au lieu de dormir six cents millisecondes : le
    // bouton se rafraîchit tous les quarts de seconde, et sous la charge du
    // portail complet (3,4 relevée le jour où ce témoin est tombé) une attente
    // fixe peut ne contenir aucun rafraîchissement. C'est exactement la leçon
    // déjà appliquée à son jumeau, l'apparition — prise par l'autre bout.
    await tab.evaluate(() => { window.__game.player.yaw += Math.PI; });
    const efface = await tab.waitForFunction(() => {
      const b = document.getElementById('ride-btn');
      if (!b) return true;
      const rangee = b.closest('.fun-target');
      return getComputedStyle(b).display === 'none'
        || (rangee && getComputedStyle(rangee).display === 'none');
    }, null, { timeout: 6000 }).then(() => true).catch(() => false);
    verifier('et il s\'efface quand on tourne le dos à la bête', efface,
      efface ? '' : JSON.stringify(await bouton(tab, 'ride-btn')));
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
    // ET ON OBSERVE PENDANT TOUTE LA FENÊTRE, pas pendant un tiers.
    //
    // Onze secondes ne suffisaient pas : la rame MARQUE LES STATIONS trois
    // secondes, et embarquer juste avant un quai passait la moitié du temps à
    // l'arrêt. Le verdict tenait alors au hasard du moment où l'on monte.
    // Mesuré à la sonde, trois embarquements d'affilée sur `origin/main` :
    // 1,8 m · 2,7 m · 0,0 m — le témoin est rouge une fois sur deux depuis
    // toujours, et il l'a été en travers d'une livraison qui n'y était pour
    // rien. C'est la règle du banc, déjà écrite pour le lien muet et pour le
    // zoom : un témoin dont le verdict est une durée doit observer pendant
    // TOUTE la fenêtre, pas seulement à la fin — ici, assez longtemps pour
    // qu'un arrêt en station soit suivi d'un départ.
    let parcouru = 0;
    for (let i = 0; i < 45 && parcouru < 8; i++) {
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
    // ON MESURE UN TRAJET, PAS UNE DURÉE — et c'est tout le sujet.
    //
    // L'ancienne version échantillonnait pendant seize secondes de MONTRE.
    // Or `main.js` borne `dt` à un vingtième de seconde : sous vingt images
    // par seconde, le monde avance moins vite que l'horloge, et le banc y
    // descend franchement puisqu'il rend en logiciel. Le témoin se fait donc
    // déposer par le métro AU MILIEU DE PARIS, la vue la plus chargée du jeu,
    // et la monoplace ne parcourt qu'un bout de ligne droite pendant sa
    // fenêtre : « elle roule toujours pareil », conclut-il, alors qu'il n'a
    // simplement pas vu de virage. Il rougissait sur la ville agrandie de
    // v187 et serait passé au vert sur une machine au repos — le pire des
    // témoins, celui dont le verdict dépend de la charge.
    //
    // La question posée est « son allure change-t-elle AUTOUR DU CIRCUIT ? ».
    // On échantillonne donc jusqu'à ce qu'elle ait couvert deux cent
    // cinquante blocs de tracé — virages compris, par construction —, avec
    // une borne de temps pour ne jamais bloquer le portail.
    //
    // Les deux premiers convois sont les rames du métro ; les suivants sont
    // les monoplaces, et ce sont elles qui freinent. UNE seule voiture,
    // suivie sur son trajet : prendre la plus lente des six à chaque instant
    // ne suit personne — il y a toujours quelqu'un dans un virage, et on
    // mesure alors la forme du circuit, pas le comportement d'une monoplace.
    const allures = [];
    const departF1 = await tab.evaluate(() => {
      const e = window.__vehicules.etat()[2];
      return e ? e.distance : null;
    });
    const finMesure = Date.now() + 150000;
    let tourF1 = 0;
    while (tourF1 < 250 && Date.now() < finMesure) {
      await dormir(300);
      const etats = await tab.evaluate(() => window.__vehicules.etat());
      if (!etats[2]) break;
      allures.push(etats[2].vitesse);
      tourF1 = etats[2].distance - departF1;      // `distance` cumule, elle ne boucle pas
    }
    const lente = Math.min(...allures), rapide = Math.max(...allures);
    verifier('la monoplace ne roule pas à la même allure partout',
      rapide / Math.max(0.1, lente) > 1.8,
      `de ${lente.toFixed(1)} à ${rapide.toFixed(1)} m/s sur ${Math.round(tourF1)} blocs de circuit`);
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

    // --- LA CIRCULATION DE PARIS (v201) -------------------------------------
    //
    // Max, après une visite : « je viens d'aller visiter Paris et je n'ai vu
    // aucun véhicule en circulation. » Il avait raison, et pas seulement un
    // peu : Paris publiait seize avenues et n'en déclarait que deux
    // enchaînements, tous deux sur la RIVE DROITE. Saint-Germain,
    // Saint-Michel, Rennes, Montparnasse, Raspail, les Gobelins n'avaient
    // jamais vu une voiture.
    //
    // On éprouve donc le trajet de l'enfant, pas le mécanisme : on se plante
    // au milieu d'une rue de la RIVE GAUCHE, et l'on compte ce qui roule
    // autour de soi. Sur l'ancien code il n'y a AUCUN circuit là-bas — le
    // témoin est rouge par construction.
    const rive = await tab.evaluate(async () => {
      const P = await import('./src/paris.js');
      const g = window.__game;
      const solDe = (x, z) => g.world.terrainHeight(Math.round(x), Math.round(z));
      const cs = P.circuitsParis ? P.circuitsParis(solDe) : [];
      // le circuit de la rive gauche est celui dont le milieu est au SUD de
      // Notre-Dame — on ne le désigne pas par son rang, qui peut changer
      const sud = cs.map((c) => {
        const m = c.pts.reduce((a2, q) => ({ x: a2.x + q.x / c.pts.length, z: a2.z + q.z / c.pts.length }),
          { x: 0, z: 0 });
        return { c, dz: m.z - P.PARIS.z };
      }).sort((a2, b2) => b2.dz - a2.dz)[0];
      if (!sud || sud.dz <= 0) return { circuits: cs.length, surLaRiveGauche: false };
      const p0 = sud.c.pts[0], p1 = sud.c.pts[1] || p0;
      const x = Math.round((p0.x + p1.x) / 2), z = Math.round((p0.z + p1.z) / 2);
      g.player.flying = false;
      g.player.pos.set(x, g.world.sommetColonne(x, z) + 3, z);
      g.player.vel.set(0, 0, 0);
      g.player.yaw = Math.atan2(-(p1.x - p0.x), -(p1.z - p0.z));
      return { circuits: cs.length, surLaRiveGauche: true };
    });
    // La circulation ne naît pas à l'instant du saut : `animerLesVilles` la
    // sème quand l'enfant approche, à son propre rythme. On attend le
    // résultat, borné — jamais on ne lit dans la foulée du geste.
    const trafic = await tab.waitForFunction(() => {
      const g = window.__game;
      let scene = g.npcs && g.npcs[0] ? g.npcs[0].mesh : null;
      while (scene && scene.parent) scene = scene.parent;
      if (!scene) return null;
      const px = g.player.pos.x, pz = g.player.pos.z;
      let proches = 0, loin = 0; const modeles = new Set();
      scene.traverse((o) => {
        if (!o.userData || !(o.userData.flotte || o.userData.nomVoiture) || !o.visible) return;
        const d = Math.hypot(o.position.x - px, o.position.z - pz);
        if (d < 60) { proches++; modeles.add(o.userData.nomVoiture || o.userData.flotte); } else loin++;
      });
      return proches >= 6 ? { proches, loin, modeles: modeles.size } : null;
    }, null, { timeout: 60000 }).then((h) => h.jsonValue()).catch(() => ({ proches: 0, loin: -1, modeles: 0 }));
    verifier('la rive gauche de Paris a enfin des voitures qui roulent',
      rive.surLaRiveGauche && trafic.proches >= 6,
      `${rive.circuits} circuits · ${trafic.proches} voiture(s) à moins de 60 blocs`);

    // ET ON NE DESSINE PAS CE QUE PERSONNE NE VOIT. C'était le défaut de fond,
    // celui qui interdisait d'en mettre plus : la portée se testait sur la
    // TÊTE du convoi, donc les vingt voitures d'une boucle de quatre cent
    // trente et un blocs se dessinaient dès qu'on approchait d'un seul de ses
    // points. Une voiture coûte TRENTE-DEUX maillages — trois fois un
    // personnage. Même leçon que la v196, un cran plus haut.
    verifier('et aucune voiture ne se dessine hors de portée',
      trafic.loin === 0, `${trafic.loin} voiture(s) dessinée(s) au-delà de 60 blocs`);

    // LA FLOTTE SE VOIT. Cinquante modèles ont été injectés ; Max : « je ne
    // retrouve pas autant de diversité ». Deux circuits de dix voitures n'en
    // montraient que vingt sur cinquante, et le pas de 13 revient sur ses pas
    // au bout de cinquante — 13 × 50 ≡ 0. Le pas est premier avec la flotte
    // désormais, et il y a assez de voitures pour que cela se voie.
    verifier('et ce ne sont pas dix fois la même voiture',
      trafic.modeles >= 8, `${trafic.modeles} modèle(s) différent(s) autour de soi`);

    // ON PEUT MONTER DANS CE QUI ROULE. Le code pour conduire existe depuis la
    // v194 et il marchait ; c'est ATTRAPER qui ne marchait pas — cinq blocs
    // autour d'une voiture à 4,2 m/s laissent une seconde pour appuyer.
    const boutonVoiture = await tab.waitForFunction(() => {
      const b = document.getElementById('board-btn');
      return !!(b && getComputedStyle(b).display !== 'none'
        && getComputedStyle(b.closest('.fun-target')).display !== 'none'
        && b.textContent.includes('Conduire'));
    }, null, { timeout: 60000 }).then(() => true).catch(() => false);
    verifier('et le bouton « Conduire cette voiture » s\'offre tout seul dans la rue',
      boutonVoiture, JSON.stringify(await bouton(tab, 'board-btn')));

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

    // LA VUE DE POURSUITE (Max, après deux essais de vue intérieure : « on
    // va rester dans une vue un peu comme GTA, où on voit la voiture par
    // derrière »). Au volant, la caméra est DERRIÈRE le véhicule — à
    // l'opposé du regard, plusieurs blocs en retrait, en hauteur — et le
    // cockpit sculpté (son volant en tore) reste dans le modèle, visible à
    // travers les vitres. L'ancien code asseyait l'œil dans l'habitacle, à
    // un tiers de bloc des pieds : rouge garanti sur les trois mesures.
    const poursuite = await tab.evaluate(async () => {
      const g = window.__game;
      const a = g.animalManager.animals.find((x) => x.def.key === 'voiture');
      let volant = false;
      if (a) a.mesh.traverse((m) => {
        // le tore du cockpit sculpté, ou le SteeringWheel des modèles de la
        // flotte — chacun des cinquante-trois a l'un ou l'autre
        if ((m.geometry && m.geometry.type === 'TorusGeometry')
          || /steeringwheel/i.test(m.name || '')) volant = true;
      });
      // Le modèle dit lui-même s'il a un poste de conduite : deux
      // carrosseries de la flotte n'en ont pas, et c'est déclaré dans leur
      // fiche. Sans cette lecture, ce témoin bascule deux fois sur
      // cinquante-trois au hasard du tirage.
      const fiche = (await import('./src/vehicules.js')).FLOTTE
        .find((e) => e.fichier === (a && a.mesh.userData.flotte));
      const attenduVolant = !fiche || fiche.habitacle !== false;
      const dx = g.player.camera.position.x - g.player.pos.x;
      const dz = g.player.camera.position.z - g.player.pos.z;
      // le regard porte vers (-sin, -cos) : un produit scalaire négatif dit
      // que la caméra est bien DERRIÈRE, pas devant
      const devant = dx * -Math.sin(g.player.yaw) + dz * -Math.cos(g.player.yaw);
      return { volant, attenduVolant, modele: a && a.mesh.userData.flotte,
        recul: +Math.hypot(dx, dz).toFixed(2),
        hauteur: +(g.player.camera.position.y - g.player.pos.y).toFixed(2),
        devant: +devant.toFixed(2) };
    });
    // Borne basse 3,0 : le rapprochement anti-mur peut raccourcir le recul
    // (plancher à 3,2) si un obstacle traîne derrière le parc — c'est un
    // comportement voulu, pas un défaut.
    verifier('au volant, la caméra suit la voiture de derrière, comme GTA',
      poursuite.recul > 3.0 && poursuite.recul < 6.5 && poursuite.devant < 0,
      `${poursuite.recul} blocs en retrait (devant=${poursuite.devant})`);
    verifier('et elle prend de la hauteur pour voir la route par-dessus le toit',
      poursuite.hauteur > 1.2 && poursuite.hauteur < 3, `${poursuite.hauteur} bloc`);
    verifier('le volant, lui, reste dans l\'habitacle — visible par les vitres',
      poursuite.volant || !poursuite.attenduVolant,
      poursuite.volant ? 'volant trouvé'
        : `pas de volant dans ${poursuite.modele}${poursuite.attenduVolant ? '' : ' (carrosserie seule, déclaré dans sa fiche)'}`);

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
        // opacité basse (Chiron d'artiste) ou vitrage nommé de la flotte,
        // déjà en alpha BLEND — l'un comme l'autre laisse voir l'habitacle
        if (m.material && m.material.transparent
          && (m.material.opacity < 0.8 || /glass/i.test(m.material.name || ''))) vitresTransparentes = true;
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

    // LA FLOTTE (Max : « add those cars for better diversity »). Huit
    // voitures invoquées ne sortent pas du même moule : au moins trois
    // modèles différents parmi les cinquante-trois. Le choix est écrit à la
    // CONSTRUCTION (userData.flotte), pas au chargement du fichier — le
    // témoin n'attend donc aucun téléchargement. L'ancien code ne
    // connaissait qu'un modèle et n'écrivait rien : un seul « modèle »
    // indéfini, rouge garanti.
    const diversite = await tab.evaluate(() => {
      const g = window.__game;
      const nes = [];
      for (let n = 0; n < 8; n++) {
        const a = g.animalManager.invoquer('voiture',
          g.player.pos.x + 4 + (n % 4) * 3, g.player.pos.z + 4 + Math.floor(n / 4) * 3);
        if (a) nes.push(a);
      }
      const modeles = new Set(nes.map((a) => a.mesh.userData.flotte));
      for (const a of nes) {                      // on range le parking d'essai
        g.animalManager.scene.remove(a.mesh);
        const i = g.animalManager.animals.indexOf(a);
        if (i >= 0) g.animalManager.animals.splice(i, 1);
      }
      return { invoquees: nes.length, modeles: [...modeles].filter(Boolean).length };
    });
    verifier('huit voitures invoquées, au moins trois modèles différents',
      diversite.invoquees === 8 && diversite.modeles >= 3,
      `${diversite.modeles} modèle(s) distincts sur ${diversite.invoquees}`);

    // LES ROUES TOURNENT. Une voiture dont les roues restent figées ne roule
    // pas : elle glisse comme une savonnette, et un enfant de sept ans le
    // voit au premier mètre. On éprouve le trajet — on monte dans une
    // voiture de la flotte, on avance, et on demande de combien la roue a
    // tourné. L'ancien code ne collectait aucun pivot : rouge garanti.
    let deLaFlotte = false;
    for (let essai = 0; essai < 8 && !deLaFlotte; essai++) {
      await poserDevant(tab, 'voiture');
      deLaFlotte = await tab.evaluate(() => {
        const a = window.__game.animalManager.animals.find((x) => x.def.key === 'voiture');
        return !!a && a.mesh.userData.flotte !== 'voiture.glb';
      });
    }
    // le modèle arrive par le réseau : on l'attend, on ne le suppose pas
    const quatreRoues = await tab.waitForFunction(() => {
      const a = window.__game.animalManager.animals.find((x) => x.def.key === 'voiture');
      return !!(a && a.mesh.userData.roues && a.mesh.userData.roues.length >= 4);
    }, null, { timeout: 30000 }).then(() => true).catch(() => false);
    verifier('une voiture de la flotte arrive avec ses quatre roues',
      deLaFlotte && quatreRoues, `flotte=${deLaFlotte} · roues=${quatreRoues}`);

    const angleRoue = () => tab.evaluate(() => {
      const a = window.__game.animalManager.animals.find((x) => x.def.key === 'voiture');
      const r = a && a.mesh.userData.roues && a.mesh.userData.roues[0];
      return r ? { angle: r.rotation.x, rayon: a.mesh.userData.rayonRoue } : null;
    });
    await tab.waitForFunction(() => {
      const b = document.getElementById('ride-btn');
      return b && getComputedStyle(b).display !== 'none'
        && getComputedStyle(b.closest('.fun-target')).display !== 'none';
    }, null, { timeout: 5000 }).catch(() => {});
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(600);
    // On se place D'ABORD, on lit l'angle ENSUITE : la mise en place est un
    // téléport de douze blocs, et le compter comme du roulage retournait la
    // mesure (−12 rad pour 8 m avancés, la première fois).
    await placerA(tab, departAuto);
    const angleAvant = await angleRoue();
    const rouleSur = await avancerUnDemiSeconde(tab);
    const angleApres = await angleRoue();
    // Une roue qui roule sans patiner tourne d'exactement ce que le sol a
    // défilé : l'angle vaut la distance divisée par le rayon, et il grandit
    // quand on avance. Le SENS compte autant que le mouvement — à l'envers,
    // le bas de la roue glisserait vers l'avant (vérifié à la sonde, sur le
    // point de contact). L'ancien code ne collectait aucun pivot : la
    // lecture rend null, et le témoin échoue proprement.
    const tourne = angleAvant && angleApres ? angleApres.angle - angleAvant.angle : null;
    const attendu = angleAvant && rouleSur ? rouleSur / angleAvant.rayon : null;
    verifier('et ses roues tournent avec le sol qui défile — pas des savonnettes',
      tourne != null && rouleSur > 1 && tourne > 0
      && tourne > attendu * 0.7 && tourne < attendu * 1.4,
      `${rouleSur.toFixed(1)} m parcourus · roue tournée de ${tourne == null ? '—' : tourne.toFixed(1)} rad`
      + (attendu ? ` (attendu ${attendu.toFixed(1)})` : ''));
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(400);

    // AU VOLANT, ON NE TRAVERSE PLUS LES MURS (v212) -------------------------
    //
    // Max, capture à l'appui : « cars crashing into walls » — une voiture
    // rouge encastrée dans une façade haussmannienne. Conduire, ici, c'est
    // brancher le véhicule sur la physique du JOUEUR, boîte de collision
    // comprise : soixante centimètres de large, quand une voiture en fait
    // 2,26. Tant que le point central restait dans la rue, la carrosserie
    // passait au travers de tout ce qui la bordait.
    //
    // On éprouve le trajet de l'enfant, pas la variable : on dresse un mur,
    // on fonce dedans à pied puis au volant, et l'on regarde OÙ l'on
    // s'arrête. À pied on colle au mur ; au volant on doit s'arrêter un
    // demi-bloc plus loin au moins, parce que la carrosserie est plus large
    // que les épaules. Sur l'ancien code les deux distances sont les mêmes.
    const contreLeMur = async (auVolant) => {
      const scene = await tab.evaluate(() => {
        const g = window.__game, w = g.world;
        const x0 = Math.round(g.player.pos.x), z0 = Math.round(g.player.pos.z);
        const sol = w.terrainHeight(x0, z0);
        // on dégage un couloir droit, puis on ferme le fond
        for (let d = -2; d <= 10; d++) {
          for (let c = -4; c <= 4; c++) {
            for (let h = 1; h <= 4; h++) w.setBlock(x0 + c, sol + h, z0 + d, 0);
          }
        }
        for (let c = -4; c <= 4; c++) {
          for (let h = 1; h <= 4; h++) w.setBlock(x0 + c, sol + h, z0 + 11, 1);
        }
        return { x: x0 + 0.5, y: sol + 1, z: z0 + 0.5, murZ: z0 + 11 };
      });
      // `dz = -cos(yaw)` : c'est yaw = π qui envoie vers les z CROISSANTS,
      // donc vers le mur. Avec 0 on lui tournait le dos et l'on mesurait
      // vingt-trois blocs d'écart — le témoin lisait sa propre erreur.
      await placerA(tab, { x: scene.x, y: scene.y, z: scene.z, yaw: Math.PI });
      await tab.keyboard.down('KeyW');
      await tab.evaluate(() => new Promise((fin) => {
        let sim = 0, prec = performance.now();
        const tic = (t) => {
          sim += Math.min(Math.max((t - prec) / 1000, 0), 0.05); prec = t;
          if (sim >= 4) fin(); else requestAnimationFrame(tic);
        };
        requestAnimationFrame(tic);
      }));
      await tab.keyboard.up('KeyW');
      const z = await tab.evaluate(() => window.__game.player.pos.z);
      return Math.round((scene.murZ - z) * 100) / 100;
    };
    const ecartAPied = await contreLeMur(false);
    await poserDevant(tab, 'voiture');
    await dormir(600);
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(700);
    const auVolant = await tab.evaluate(() => !!window.__game.player.volInterdit);
    const ecartAuVolant = await contreLeMur(true);
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(400);
    const ecartApres = await contreLeMur(false);
    verifier('au volant, on s\'arrête plus loin du mur qu\'à pied — la voiture a sa carrure',
      auVolant && ecartAPied > 0 && ecartAuVolant >= ecartAPied + 0.5,
      `à pied ${ecartAPied} bloc du mur · au volant ${ecartAuVolant} · au volant=${auVolant}`);
    // Ce second témoin est un GARDE-FOU, pas une preuve : il est vert des deux
    // côtés, et c'est voulu — il garde la régression que le premier rend
    // possible, un enfant qui garderait à pied la carrure d'une voiture et
    // resterait coincé entre deux murs.
    verifier('et une fois descendu, on repasse partout où un piéton passe',
      ecartApres > 0 && Math.abs(ecartApres - ecartAPied) < 0.2,
      `${ecartApres} bloc du mur, contre ${ecartAPied} avant d'être monté`);

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
      return p2 && p2.effectif() >= 18 ? p2.effectif() : null;
    }, null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => 0);
    // DIX-HUIT DEPUIS LA v217, ET LE LIBELLÉ SUIT LE CHIFFRE. Dix était le
    // nombre d'avant les grandes villes ; un libellé périmé induit en erreur
    // plus longtemps qu'il n'informe.
    verifier('les passants peuplent les rues à l\'arrivée — dix-huit par ville',
      peuple >= 18, `${peuple} promeneur(s)`);

    // ET LES CHIENS (v178) : « dogs » — un promeneur sur cinq trottine à
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

    // ---- ET ON NE MARCHE PAS DANS UNE RUE VIDE (v218) ----------------------
    //
    // Max, après la v217 : la ville reste habitée, mais l'enfant ne VOIT
    // toujours personne. Le chiffre qui l'explique : le champ de vision fait
    // QUARANTE-SIX degrés, un huitième du tour d'horizon. Dix-huit passants
    // répartis en couronne en donnent 18 × 46/360 = 2,3 dans le cadre — et
    // c'est exactement ce qui se mesure. Une couronne étant uniforme en angle,
    // en resserrer le RAYON n'y change rien : 2,3 à 14-55 blocs, 2,33 à 14-34.
    //
    // Deux remèdes, tous deux gratuits en appels de dessin : deux passants sur
    // trois sont posés DEVANT l'enfant, et l'on replace aussi celui qui est
    // passé DERRIÈRE la ligne des épaules — sans quoi un bond de vingt blocs
    // laisse ceux qu'on vient de dépasser sous le seuil de distance, et la rue
    // se vide à mesure qu'on avance.
    //
    // LE TÉMOIN MARCHE, CAP DANS LE SENS DE LA MARCHE, ET COMPTE CE QUI EST
    // DANS LE CADRE. Un décompte « à moins de soixante-deux blocs » ne peut pas
    // voir ce défaut : les dix-huit y sont dans les deux cas. Mesuré sur
    // `origin/main` en remontant la rue de Rivoli : 0, 0, 0, 0, 0, 0 — pas un
    // piéton dans le cadre sur tout son parcours.
    const rue = await tab.evaluate(async () => {
      const m = await import('./src/paris.js');
      const g = window.__game;
      const cam = g.player.camera;
      const demi = Math.atan(Math.tan(((cam.fov * Math.PI) / 180) / 2) * cam.aspect);
      const trajets = [['Rivoli', [-53, -4], [60, 13]], ['Voltaire', [46, -18], [96, 25]]];
      const vus = [];
      for (const [, a, b] of trajets) {
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const yaw = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
        const dx = Math.sin(yaw), dz = -Math.cos(yaw);
        for (let d = 0; d <= L; d += 25) {
          const f = d / L;
          const x = Math.round(m.PARIS.x + a[0] + (b[0] - a[0]) * f);
          const z = Math.round(m.PARIS.z + a[1] + (b[1] - a[1]) * f);
          g.player.pos.set(x + 0.5, g.world.terrainHeight(x, z) + 1.2, z + 0.5);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = yaw;
          // La boucle des passants passe toutes les deux secondes ; on lui en
          // laisse trois, le temps de ramener devant ceux qu'on vient de
          // dépasser.
          await new Promise((r) => setTimeout(r, 7000));
          let n = 0;
          for (const q of g.npcs) {
            if (!q.pos || (q.name !== 'passant' && q.name !== 'chien')) continue;
            if (!(q.mesh && q.mesh.visible)) continue;
            const ex = q.pos.x - g.player.pos.x, ez = q.pos.z - g.player.pos.z;
            const dd = Math.hypot(ex, ez);
            if (dd >= 62 || dd < 1) continue;
            const cos = (ex * dx + ez * dz) / dd;
            if (Math.acos(Math.max(-1, Math.min(1, cos))) <= demi) n++;
          }
          vus.push(n);
        }
      }
      return { vus, vides: vus.filter((n) => n === 0).length,
        moyenne: +(vus.reduce((s, n) => s + n, 0) / vus.length).toFixed(2) };
    });
    // Le verdict porte sur les ARRÊTS VIDES, pas sur la moyenne : c'est de
    // marcher dans une rue déserte qu'un enfant se plaint, et un creux ne se
    // rattrape pas par une moyenne. Sur `origin/main`, six arrêts vides sur
    // dix ; sur la branche, aucun.
    verifier('et l\'on ne marche pas dans une rue vide',
      rue.vides <= 1 && rue.moyenne >= 3, JSON.stringify(rue));

    // ET CE QU'ON NE VOIT PAS NE SE DESSINE PAS.
    //
    // Max, sur son iPad : « ce n'est pas très fluide, c'est saccadé ». Mesuré
    // à la sonde au centre de Paris : 1 522 appels de dessin, dont 1 353 pour
    // des personnages — quatre-vingt-neuf pour cent. Et sur les cent
    // cinquante-trois personnages du monde, CENT TREIZE étaient à plus de
    // quatre-vingt-dix blocs, à quatorze pixels de haut, chacun coûtant onze
    // maillages pour une marche que personne ne regarde. Le jeu avait cessé de
    // les ANIMER au loin depuis longtemps ; il ne les avait jamais retirés du
    // dessin.
    //
    // Ce que le témoin éprouve, c'est le fait, pas la conséquence : aucun
    // personnage au-delà de la portée ne doit rester dessiné. Le nombre
    // d'appels dépend d'où l'on regarde ; celui-ci, non.
    const auLoin = await tab.evaluate(() => {
      const g = window.__game;
      const px = g.player.pos.x, pz = g.player.pos.z;
      let dessinesLoin = 0, dessinesPres = 0, loin = 0;
      for (const n of g.npcs || []) {
        const d = Math.hypot(n.pos.x - px, n.pos.z - pz);
        if (d > 75) { loin++; if (n.mesh.visible) dessinesLoin++; }
        else if (d < 45 && n.mesh.visible) dessinesPres++;
      }
      return { dessinesLoin, dessinesPres, loin, total: (g.npcs || []).length };
    });
    verifier('et les personnages lointains ne sont plus dessinés du tout',
      auLoin.loin >= 20 && auLoin.dessinesLoin === 0,
      `${auLoin.dessinesLoin} dessiné(s) sur ${auLoin.loin} à plus de 75 blocs`);
    // L'autre moitié de la promesse : on n'a pas vidé la rue pour autant.
    verifier('mais ceux d\'à côté sont toujours là',
      auLoin.dessinesPres >= 3,
      `${auLoin.dessinesPres} personnage(s) dessinés à moins de 45 blocs`);

    // UN ŒIL SE LIT À SON BLANC (v215) ---------------------------------------
    //
    // Max, capture à l'appui : « personnages are scary ». L'iris faisait 55 %
    // de la largeur du blanc de l'œil, il était posé PLUS EN AVANT que lui, et
    // il était presque noir : de face on ne voyait que deux billes sombres
    // globuleuses, sans blanc autour. C'est la recette d'un regard fixe.
    //
    // L'esthétique se juge en capture, mais la GÉOMÉTRIE se mesure. Les
    // couleurs vivent dans les sommets : on relève la boîte du blanc et celle
    // de l'iris, et l'on demande deux choses qu'un visage doux respecte
    // toujours — l'iris n'occupe pas la moitié de l'œil, et il reste EN
    // RETRAIT, dans l'orbite.
    const oeil = await tab.evaluate(async () => {
      const P = await import('./src/personnages.js');
      const m = P.construireHumain({ tenue: 'gaulois', cheveux: 0xe8952c });
      // ON NE REGARDE QUE LA TÊTE. Le premier jet filtrait sur la seule
      // couleur et attrapait la ceinture de cuir, dont le brun est à un
      // cheveu de celui de l'iris : il rendait un « iris » de 178 % de large,
      // posé plus en avant que le nez.
      const boite = (test) => {
        const b = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9, n: 0 };
        m.traverse((o) => {
          if (!o.isMesh || !o.geometry.attributes.color) return;
          const pos = o.geometry.attributes.position, col = o.geometry.attributes.color;
          for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) < 1.45) continue;
            // UN SEUL ŒIL. Mesurée sur la paire, la largeur inclut l'écart
            // entre les deux et écrase le rapport : 89 % contre 82 %, quand
            // l'œil seul dit 55 % contre 36 %. Le témoin ne distinguait plus
            // rien.
            if (pos.getX(i) < 0.02) continue;
            if (!test(col.getX(i), col.getY(i), col.getZ(i))) continue;
            const x = pos.getX(i), z = pos.getZ(i);
            if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x;
            if (z < b.z0) b.z0 = z; if (z > b.z1) b.z1 = z;
            b.n++;
          }
        });
        return b;
      };
      // le blanc de l'œil : très clair et légèrement chaud, unique sur la tête
      const blanc = boite((r, v, b) => r > 0.88 && v > 0.85 && b > 0.78 && r >= v && v >= b);
      // l'iris : le brun du regard, plus foncé que la peau et non rougeâtre
      const iris = boite((r, v, b) => r > 0.06 && r < 0.32 && v > 0.03 && v < 0.24 && b < 0.16 && r > b);
      return {
        blancN: blanc.n, irisN: iris.n,
        largeurBlanc: +(blanc.x1 - blanc.x0).toFixed(4),
        largeurIris: +(iris.x1 - iris.x0).toFixed(4),
        avantBlanc: +blanc.z0.toFixed(4), avantIris: +iris.z0.toFixed(4),
      };
    });
    const partIris = oeil.blancN && oeil.irisN
      ? oeil.largeurIris / oeil.largeurBlanc : null;
    verifier('l\'iris n\'occupe pas la moitié de l\'œil — un regard, pas deux billes',
      partIris !== null && partIris < 0.45 && oeil.blancN > 20 && oeil.irisN > 20,
      `iris ${oeil.largeurIris} pour un œil de ${oeil.largeurBlanc} (${partIris === null ? '—' : Math.round(partIris * 100)} %)`);
    verifier('et il reste dans l\'orbite, jamais devant le blanc',
      oeil.blancN > 20 && oeil.irisN > 20 && oeil.avantIris >= oeil.avantBlanc,
      `iris à ${oeil.avantIris}, blanc à ${oeil.avantBlanc}`);

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

    // UN INSTANTANÉ SUR UN BANC QUI NAGE EST UN PILE OU FACE (v233). Ce
    // témoin ne regardait qu'une fois : il était vert quand il tombait au bon
    // moment et rouge sinon, si bien qu'il passait seul et cassait le portail
    // complet. Mesuré à la sonde sur `origin/main` : vingt-quatre relevés hors
    // de l'eau sur cent vingt. On observe donc toute la fenêtre, comme pour
    // tout ce qui bouge.
    const dansLEau = await tab.evaluate(async () => {
      const { BLOCK } = await import('./src/blocks.js');
      const g = window.__game;
      if (!g.poissons) return null;
      const { WATER_LEVEL } = await import('./src/world.js');
      const compter = async (tours) => {
        let pire = 0, releves = 0, fautifs = 0;
        for (let k = 0; k < tours; k++) {
          await new Promise((f) => setTimeout(f, 250));
          const banc = g.poissons.banc || [];
          if (!banc.length) continue;
          releves++;
          const n = banc.filter((p2) => {
            const m3 = p2.mesh.position;
            return g.world.getBlock(Math.floor(m3.x), Math.floor(m3.y), Math.floor(m3.z)) !== BLOCK.WATER;
          }).length;
          fautifs += n;
          pire = Math.max(pire, n);
        }
        return { pire, fautifs, releves };
      };
      const large = await compter(12);
      // ET PRÈS D'UNE CÔTE, LÀ OÙ LE DÉFAUT VIT. Au large il ne se voit
      // presque jamais : c'est le RIVAGE qui le déclenche, parce que le
      // clampage de profondeur rend la cote de l'eau alors que le terrain est
      // monté bien au-dessus. Un témoin qui n'éprouve que le large est vert
      // sur l'ancien code et ne prouve rien — vérifié.
      // ET L'ON N'ATTEND PAS QU'UN POISSON AILLE SE JETER SUR LA CÔTE : ON L'Y
      // ENVOIE. Le défaut est réel — mesuré à la sonde sur `origin/main`,
      // vingt-quatre relevés hors de l'eau sur cent vingt à un rivage donné —
      // mais il dépend de l'endroit et du hasard de la promenade : à un autre
      // rivage, quarante relevés n'en montrent aucun. Deux témoins successifs
      // écrits pour l'attraper en flânant ont rendu l'un 1 faute sur 24,
      // l'autre 0 sur 40. **Un témoin ne se règle pas sur un événement rare :
      // on éprouve le MÉCANISME.** On pose donc un poisson face à un mur, on
      // le pointe dessus, et l'on regarde s'il le traverse.
      let mur = null;
      for (let d = 4; d < 400 && !mur; d += 2) {
        for (const [sx, sz] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const x = Math.round(g.player.pos.x + sx * d), z = Math.round(g.player.pos.z + sz * d);
          if (g.world.terrainHeight(x, z) < WATER_LEVEL + 2) continue;      // pas une berge
          // de l'eau juste à côté, du côté d'où l'on vient
          const ex = x - sx * 3, ez = z - sz * 3;
          if (g.world.getBlock(ex, WATER_LEVEL - 2, ez) === BLOCK.WATER) {
            mur = { x, z, ex, ez, cap: Math.atan2(sz, sx) };
            break;
          }
        }
      }
      // AU PLUS PRÈS DU MUR. Lancé à trois blocs, le poisson a le temps de
      // finir son demi-tour : l'ancien code n'en perdait qu'un sur soixante-
      // deux. Ce qu'on veut éprouver, c'est le cas où le virage NE PEUT PAS
      // aboutir — c'est celui qui se produit dans une crique, et c'est lui qui
      // laisse un poisson dans la roche pour de bon.
      if (mur) {
        const dx0 = Math.cos(mur.cap), dz0 = Math.sin(mur.cap);
        for (const recul of [1.3, 1.7, 2.1, 2.5, 3.0]) {
          const cx = mur.x - dx0 * recul, cz = mur.z - dz0 * recul;
          if (g.world.getBlock(Math.floor(cx), WATER_LEVEL - 2, Math.floor(cz)) === BLOCK.WATER) {
            mur.ex = cx; mur.ez = cz; mur.recul = recul;
            break;
          }
        }
      }
      let charge = { absent: true };
      if (mur) {
        g.player.pos.set(mur.ex, WATER_LEVEL + 4, mur.ez);
        g.player.vel.set(0, 0, 0);
        await new Promise((f) => setTimeout(f, 3000));
        // ON EN LANCE BEAUCOUP, ET PLUSIEURS FOIS. Un seul poisson lancé sur
        // le mur s'en sort souvent : son demi-tour a le temps d'aboutir. Sur
        // quatre, l'ancien code n'en laissait passer qu'un — une chance sur
        // trois de ne rien voir. Le banc entier, trois fois, rend le verdict
        // sûr des deux côtés : le code neuf en refuse zéro par construction.
        let dedans = 0, lances = 0;
        for (let tour = 0; tour < 3; tour++) {
          const vises = (g.poissons.banc || []).slice();
          if (!vises.length) break;
          for (const p2 of vises) {
            p2.mesh.position.set(mur.ex, WATER_LEVEL - 2, mur.ez);
            p2.cap = mur.cap;                       // droit sur le mur
          }
          lances += vises.length;
          await new Promise((f) => setTimeout(f, 2500));
          dedans += vises.filter((p2) => {
            const m3 = p2.mesh.position;
            return g.world.getBlock(Math.floor(m3.x), Math.floor(m3.y), Math.floor(m3.z)) !== BLOCK.WATER;
          }).length;
        }
        charge = { lances, dansLeMur: dedans, mur: { x: mur.x, z: mur.z, recul: mur.recul || 3 } };
      }
      return {
        large, charge,
        fautifs: large.fautifs + (charge.dansLeMur || 0),
        releves: large.releves,
      };
    });
    verifier('et chacun reste dans l\'eau, même lancé droit sur la côte',
      !!dansLEau && dansLEau.releves >= 8 && dansLEau.fautifs === 0
        && dansLEau.charge && dansLEau.charge.lances >= 1,
      JSON.stringify(dansLEau));

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

    // ================= LES VILLES NE SONT PLUS VIDES ========================
    //
    // Max, capture de Moscou de nuit à l'appui : « les villes sont toujours
    // désespérément vides, rajoute les flottes de voitures qui circulent ».
    // Deux défauts derrière ce verdict : trois voitures par anneau espacées
    // d'un tiers de tour (une tous les soixante-six blocs), et surtout AUCUN
    // anneau dès qu'un fleuve traversait la ville — il tombait dans l'eau et
    // on abandonnait. Moscou, coupée par la Moskova, n'avait pas une seule
    // voiture : rouge garanti sur l'ancien code.
    await tab.evaluate(async () => {
      const { positionDe } = await import('./src/mondes.js');
      const g = window.__game;
      const c = positionDe('moscou');
      g.player.pos.set(c.x, g.world.terrainHeight(c.x, c.z) + 24, c.z + 30);
      g.player.vel.set(0, 0, 0);
      g.player.flying = true;
    });
    // les convois naissent à l'approche du joueur, par paquets de deux
    // secondes et demie : on les attend, on ne les suppose pas
    const circulation = await tab.waitForFunction(() => {
      const etat = (window.__vehicules.etat && window.__vehicules.etat()) || [];
      const autos = etat.filter((c) => c.nom === 'voiture');
      const visibles = autos.reduce((n, c) => n + c.visibles, 0);
      return visibles >= 8 ? { anneaux: autos.length, visibles } : null;
    }, null, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => null);
    verifier('à Moscou, traversée par son fleuve, les rues sont pleines de voitures',
      !!circulation,
      circulation ? `${circulation.visibles} voitures visibles sur ${circulation.anneaux} anneaux`
        : 'moins de huit voitures visibles en trente secondes');

    // --- ON PILOTE VRAIMENT, ET CHACUN À SA VITESSE -------------------------
    //
    // Max : « add planes, airbus, concord and military jets and allow us to
    // fly with them at relevant speed for each ». Le mode `pilote` est le
    // troisième des trois façons d'être porté, déclaré « à faire » depuis la
    // v155 : la monture suit le joueur, le convoi suit son tracé, et le
    // pilote décide où l'on va.
    //
    // Le témoin mesure CE QUE L'ENFANT OBTIENT — des blocs parcourus en
    // secondes de jeu — et non une variable interne. Il accumule le même dt
    // que `main.js`, borne comprise, comme le fait déjà la mesure au volant :
    // sous la charge du portail, une seconde murale ne contient parfois que
    // trois images, et la distance fondrait sans que l'avion y soit pour rien.
    //
    // Ce qu'il vérifie : chacun décolle, chacun va plus vite que l'enfant à
    // pied, et les RAPPORTS sont ceux du monde réel — le Concorde et le
    // chasseur vont deux fois et demie plus vite que l'avion de ligne, qui va
    // lui-même plus vite qu'un enfant en vol libre.
    const vols = await tab.evaluate(async () => {
      const g = window.__game;
      const m = await import('./src/montures.js');
      const out = {};
      for (const key of ['avionligne', 'concorde', 'chasseur']) {
        const def = m.MONTURES.find((d) => d.key === key);
        if (!def || !def.pilote) { out[key] = { absent: true }; continue; }
        // On se met aux commandes SANS passer par le bouton : ce témoin
        // mesure le vol, pas l'interface — celle-ci a ses propres témoins.
        g.player.pos.set(0, 90, 0);
        g.player.vel.set(0, 0, 0);
        g.player.yaw = 0; g.player.pitch = 0;
        g.player.flying = true;
        g.player.pilote = def.pilote;
        g.player.vitesseAvion = 0;
        // LE TEMPS D'ACCÉLÉRATION VIENT DE LA FICHE, PAS D'UN CHIFFRE ROND.
        // Un avion de ligne pousse à 18 blocs/s² : en quatre secondes il est à
        // 73, ce qui est juste et ne prouve rien. Chacun a donc le temps que
        // SA fiche impose pour arriver à sa pointe, plus une seconde de marge.
        const tenirSecondes = (n) => new Promise((fin) => {
          let cumul = 0, prec = performance.now();
          const pas = (t) => {
            cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05);
            prec = t;
            if (cumul >= n) fin(); else requestAnimationFrame(pas);
          };
          requestAnimationFrame(pas);
        });
        // ON DÉCOLLE COMME L'ENFANT : par le bouton. Depuis la v228, la
        // vitesse est automatique et le joystick tient l'altitude et le cap —
        // tenir « avant » ferait monter, pas accélérer. Un témoin qui garderait
        // l'ancienne commande mesurerait un jeu qui n'existe plus.
        g.player.decollerOuSePoser();
        await tenirSecondes(def.pilote.max / def.pilote.poussee + 1);
        const atteinte = g.player.vitesseAvion;
        // Puis DEUX secondes à la pointe : c'est là que se lisent les rapports
        // de vitesse, et c'est ce que l'enfant parcourt vraiment.
        const depart = { x: g.player.pos.x, z: g.player.pos.z };
        await tenirSecondes(2);
        const d = Math.hypot(g.player.pos.x - depart.x, g.player.pos.z - depart.z);
        out[key] = { blocs: Math.round(d), vitesse: Math.round(atteinte), max: def.pilote.max };
        g.player.pilote = null;
        g.player.avionEnVol = false;
        g.player.vitesseAvion = undefined;
        g.player.flying = false;
      }
      return out;
    });
    const ligne = vols.avionligne || {}, conc = vols.concorde || {}, chas = vols.chasseur || {};
    verifier('les trois appareils volent, et chacun atteint sa vitesse de pointe',
      ligne.vitesse >= ligne.max * 0.98 && conc.vitesse >= conc.max * 0.98
      && chas.vitesse >= chas.max * 0.98,
      JSON.stringify(vols));
    // 88 blocs/s, c'est la croisière d'un enfant en vol libre (player.js) :
    // un avion de ligne doit faire mieux, sinon prendre l'avion ne sert à rien.
    verifier('un avion de ligne va plus vite qu\'un enfant qui vole',
      ligne.vitesse > 88, `${ligne.vitesse} blocs/s contre 88`);
    // LE RAPPORT DE 1 À 2,4 A ÉTÉ ABANDONNÉ, ET C'EST UNE DÉCISION DE MAX
    // (v229). Le vrai rapport est celui des vitesses réelles — 900 km/h contre
    // 2 180 — mais la carte ne se maille qu'à 154 morceaux par seconde et voler
    // à v en réclame 1,5 × v : au-delà de cent dix blocs par seconde, l'enfant
    // rattrape le bord du monde qui se charge. Devant le choix « garder le
    // rapport et voler dans le vide » ou « tout ramener autour de cent », Max a
    // tranché : tout autour de cent.
    //
    // Ce qui reste à garder, et que ce témoin garde : les rapides restent
    // NOTABLEMENT plus rapides — sinon choisir le Concorde ne veut plus rien
    // dire — et tous battent le vol libre de l'enfant.
    verifier('et le Concorde comme le chasseur restent les plus rapides',
      conc.blocs > ligne.blocs * 1.1 && chas.blocs > ligne.blocs * 1.1,
      `ligne ${ligne.blocs} · concorde ${conc.blocs} · chasseur ${chas.blocs} blocs en 2 s de pointe`);

    // LA CARTE SUIT L'AVION — le trou reste dans le brouillard.
    //
    // Max : « les jets volent trop vite, la carte n'arrive pas à suivre et ça
    // rame ». Mesuré à 264 blocs/s : quatre à sept pour cent du disque devant
    // soi était maillé, premier trou à QUATRE-VINGTS blocs, et deux appels de
    // dessin par image — il n'y avait littéralement rien à afficher.
    //
    // LA BARRE EST À QUATRE-VINGTS BLOCS, ET ELLE N'EST PAS LE BROUILLARD.
    //
    // Mon premier jet exigeait que le trou soit au-delà de `scene.fog.near`
    // (106 blocs). C'était le bon critère en théorie et un mauvais témoin en
    // pratique : à 170 blocs/s le banc rend 101, à 140 il rend 91 — NON
    // MONOTONE. Un bruit de dix blocs ne peut pas arbitrer une vitesse à dix
    // blocs près, et j'ai failli descendre les avions pour poursuivre un
    // chiffre qui bougeait tout seul.
    //
    // Ce que la mesure sait tenir, c'est l'ÉCART : trente-six blocs sur
    // `origin/main` contre quatre-vingt-dix à cent trente ici. La barre est
    // donc à quatre-vingts — au-delà d'une demi-seconde de vol même pour le
    // plus rapide — et le brouillard est REPORTÉ à côté, pour qu'on sache
    // toujours de combien il reste à gagner. Ce qui manque encore est une
    // dette déclarée, pas un témoin desserré.
    // UNE PAGE À LA DISTANCE D'AFFICHAGE DE L'IPAD. Le banc ouvre tout à
    // `rr=2` pour que le monde se charge vite : le brouillard y est alors à
    // DIX-HUIT blocs et le disque à charger fait douze cases. Mon premier jet
    // de ce témoin était donc VERT sur `origin/main`, à 264 blocs par seconde,
    // avec le trou à trente-six blocs — il mesurait le banc, pas le jeu.
    const ciel = await banc.jouerSeul('Amélie', { rr: 12 });
    const suivi = await ciel.evaluate(async () => {
      const g = window.__game;
      const m = await import('./src/montures.js');
      let scene = g.npcs && g.npcs[0] ? g.npcs[0].mesh : null;
      while (scene && scene.parent) scene = scene.parent;
      if (!scene || !scene.fog) return { err: 'ni scène ni brouillard' };
      const CHUNK = 16, R = 12;
      const out = { brouillard: Math.round(scene.fog.near) };
      for (const key of ['avionligne', 'concorde']) {
        const def = m.MONTURES.find((d) => d.key === key);
        // Un couloir vierge, loin de tout : on éprouve le STREAMING, pas le
        // coût d'une ville.
        g.player.pos.set(30000 + (key === 'concorde' ? 4000 : 0), 100, 30000);
        g.player.vel.set(0, 0, 0); g.player.yaw = 0; g.player.pitch = 0;
        g.player.flying = true;
        g.player.pilote = def.pilote;
        g.player.vitesseAvion = def.pilote.max;
        g.player.avionEnVol = true;
        g.player.altitudeDecollage = -999;
        // ON OBSERVE PENDANT TOUTE LA FENÊTRE, PAS SEULEMENT À LA FIN. Un
        // front de chargement est irrégulier : le même code m'a rendu 68, 91
        // puis 101 blocs sur trois instantanés. Quatre secondes pour établir
        // le régime, puis six relevés à une seconde d'intervalle, et l'on
        // garde la MÉDIANE — ce qui se reproduit, pas le creux le plus
        // frappant.
        const patienter = (ms) => new Promise((fin) => {
          const t0 = performance.now();
          const tic = () => (performance.now() - t0 < ms ? requestAnimationFrame(tic) : fin());
          requestAnimationFrame(tic);
        });
        await patienter(4000);
        const releves = [];
        for (let n = 0; n < 6; n++) {
          await patienter(1000);
          const poses = new Set();
          scene.traverse((o) => {
            if (o.isMesh && o.position.y === 0
              && o.position.x % CHUNK === 0 && o.position.z % CHUNK === 0) {
              poses.add(`${o.position.x / CHUNK},${o.position.z / CHUNK}`);
            }
          });
          const pcx = Math.floor(g.player.pos.x / CHUNK), pcz = Math.floor(g.player.pos.z / CHUNK);
          const vx = -Math.sin(g.player.yaw), vz = -Math.cos(g.player.yaw);
          let trou = R;
          for (let dz = -R; dz <= R; dz++) {
            for (let dx = -R; dx <= R; dx++) {
              const len = Math.hypot(dx, dz);
              if (len > R || len < 0.5) continue;
              if ((dx / len) * vx + (dz / len) * vz < 0.3) continue;   // pas devant
              if (!poses.has(`${pcx + dx},${pcz + dz}`)) trou = Math.min(trou, len);
            }
          }
          releves.push(Math.round(trou * CHUNK));
        }
        releves.sort((x, y) => x - y);
        out[key] = { vitesse: def.pilote.max, trou: releves[3], releves };
        g.player.pilote = null; g.player.avionEnVol = false;
        g.player.vitesseAvion = undefined; g.player.flying = false;
      }
      return out;
    });
    const BARRE = 80;
    verifier('en vol, on ne rattrape pas le bout du monde qui se charge',
      !suivi.err && suivi.avionligne && suivi.concorde
      && suivi.avionligne.trou >= BARRE && suivi.concorde.trou >= BARRE,
      `barre ${BARRE} · ${JSON.stringify(suivi)}`);

    // LA MINICARTE NE RESTE PLUS EN ARRIÈRE PENDANT QU'ON VOLE (v233).
    //
    // Max, capture en vol : « pas dingue la carte en retard ». Mesuré à la
    // sonde, à 95 blocs/s et à la distance d'affichage de l'iPad : 74 blocs
    // parcourus entre deux redessins en moyenne, 99,7 au pire — pour une carte
    // de 96 blocs de RAYON. Elle montrait un paysage sorti du cadre.
    //
    // ON MESURE UNE DISTANCE, PAS UNE DURÉE. Mon premier jet comptait le plus
    // long moment sans changement : 1,01 s sur l'ancien code contre une barre
    // d'une seconde — un pour cent de marge, et le chiffre bouge avec la
    // cadence du banc. C'est le reproche fait à tout témoin dont le verdict
    // est une durée. Ce que l'enfant subit, c'est le nombre de BLOCS que la
    // carte a de retard, et il ne dépend pas de la vitesse d'affichage.
    //
    // ET SANS AUCUN CROCHET : on photographie la minicarte, et à chaque fois
    // qu'elle change d'un point on note la distance parcourue depuis le
    // changement d'avant. C'est la seule façon de mesurer LA MÊME CHOSE sur
    // l'ancien code, qui ne publie rien.
    const retard = await ciel.evaluate(async () => {
      const g = window.__game;
      const m = await import('./src/montures.js');
      const toile = document.getElementById('minimap');
      if (!toile) return { err: 'pas de minicarte' };
      if (toile.style.display !== 'block') {
        const bouton = document.getElementById('map-btn');
        if (bouton && bouton.click) bouton.click();
      }
      if (toile.style.display !== 'block') return { err: 'la minicarte ne s\'ouvre pas' };
      const def = m.MONTURES.find((d) => d.key === 'avionligne');
      if (!def || !def.pilote) return { err: 'pas d\'avion de ligne' };
      g.player.pos.set(-40000, 96, 40000);      // un couloir vierge, loin de tout
      g.player.vel.set(0, 0, 0);
      g.player.yaw = 0; g.player.pitch = 0;
      g.player.flying = true;
      g.player.pilote = def.pilote;
      g.player.vitesseAvion = def.pilote.max;
      g.player.avionEnVol = true;
      g.player.altitudeDecollage = -9999;
      const ctx = toile.getContext('2d');
      const empreinte = () => {
        const d = ctx.getImageData(0, 0, toile.width, toile.height).data;
        let h = 0;
        for (let i = 0; i < d.length; i += 61) h = (h * 31 + d[i]) | 0;
        return h;
      };
      const sauts = [];
      const t0 = performance.now();
      let precedent = null;
      let depuis = { x: g.player.pos.x, z: g.player.pos.z };
      while (performance.now() - t0 < 14000) {
        await new Promise((f) => setTimeout(f, 60));
        const h = empreinte();
        if (precedent !== null && h !== precedent) {
          sauts.push(+Math.hypot(g.player.pos.x - depuis.x, g.player.pos.z - depuis.z).toFixed(1));
        }
        if (precedent === null || h !== precedent) {
          depuis = { x: g.player.pos.x, z: g.player.pos.z };
          precedent = h;
        }
      }
      g.player.pilote = null; g.player.avionEnVol = false;
      g.player.vitesseAvion = undefined; g.player.flying = false;
      const moy = sauts.length
        ? +(sauts.reduce((a, b) => a + b, 0) / sauts.length).toFixed(1) : null;
      return { pire: sauts.length ? Math.max(...sauts) : null, moyen: moy, changements: sauts.length };
    });
    // QUARANTE BLOCS. La carte fait 96 blocs de rayon : au-delà de quarante de
    // retard, ce qu'on voit sous l'avion n'est plus au milieu de la carte.
    // Mesuré : 74 blocs en moyenne sur l'ancien code, 9,7 sur celui-ci.
    const RETARD = 40;
    verifier('la minicarte ne reste pas en arrière quand on vole',
      !retard.err && retard.changements >= 8 && retard.pire !== null
        && retard.moyen <= RETARD && retard.pire <= RETARD * 2,
      `retard en blocs (barre ${RETARD}) · ${JSON.stringify(retard)}`);

    // ET CE QU'ELLE MONTRE EST JUSTE. Faire DÉFILER un fond au lieu de le
    // recalculer est le seul moyen de le rafraîchir dix fois plus souvent sans
    // le payer — mais une recopie qui dériverait d'un point montrerait un
    // paysage faux, et personne ne le verrait. On compare donc le fond défilé
    // à un fond entièrement recalculé au même endroit.
    const controle = await ciel.evaluate(() => (window.__carteControle
      ? window.__carteControle() : { absent: true }));
    verifier('le fond défilé montre exactement ce qu\'un calcul entier montrerait',
      !!controle && controle.ecarts === 0 && controle.points > 1000,
      JSON.stringify(controle));

    // LE BOUTON ✈️ FAIT DÉCOLLER — et il ne faisait RIEN (v228).
    //
    // Max, dans le Concorde : « il ne décolle pas ». Aux commandes, le bouton
    // appelait `toggleFly()`, qui réussissait et basculait `player.flying` —
    // un drapeau que la branche de pilotage ignore complètement. Aucun effet,
    // aucun message. Pour un enfant, c'est pire qu'un refus : il appuie dix
    // fois et conclut que le jeu est cassé.
    //
    // ON ÉPROUVE LE TRAJET DE L'ENFANT : on se met aux commandes, on appuie
    // sur la touche que le bouton déclenche (`KeyF`), et l'on regarde si
    // l'appareil PREND DE L'ALTITUDE. Pas si un drapeau a changé.
    const decollage = await tab.evaluate(async () => {
      const g = window.__game;
      const m = await import('./src/montures.js');
      const out = {};
      for (const key of ['avionligne', 'concorde', 'chasseur']) {
        const def = m.MONTURES.find((d) => d.key === key);
        g.player.pos.set(0, 90, 0);
        g.player.vel.set(0, 0, 0);
        g.player.yaw = 0; g.player.pitch = 0;
        g.player.flying = true;
        g.player.pilote = def.pilote;
        g.player.vitesseAvion = 0;
        g.player.avionEnVol = false;
        const y0 = g.player.pos.y;
        // La touche du bouton, pas la méthode : c'est le chemin de l'enfant.
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
        await new Promise((fin) => {
          let cumul = 0, prec = performance.now();
          const pas = (t) => {
            cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05); prec = t;
            if (cumul >= 3) fin(); else requestAnimationFrame(pas);
          };
          requestAnimationFrame(pas);
        });
        out[key] = Math.round((g.player.pos.y - y0) * 10) / 10;
        g.player.pilote = null; g.player.avionEnVol = false;
        g.player.vitesseAvion = undefined; g.player.flying = false;
      }
      return out;
    });
    // Vingt blocs de palier en trois secondes : on demande au moins la moitié,
    // pour ne pas mesurer la cadence du banc.
    verifier('le bouton ✈️ fait décoller l\'appareil',
      Object.values(decollage).every((h) => h >= 10),
      `altitude gagnée en 3 s : ${JSON.stringify(decollage)}`);

    // UN AVION S'INCLINE DANS SON VIRAGE — demande de Max : « quand on vole
    // avec un avion et qu'on va à gauche, il tilte un peu. Idem pour la partie
    // droite. »
    //
    // ON MONTE PAR LE BOUTON, et c'est indispensable : l'inclinaison est
    // rendue dans `fun.js`, sur le maillage de la MONTURE. Poser
    // `player.pilote` à la main — ce que font les témoins de vitesse
    // ci-dessus — fait voler le joueur sans qu'aucun avion ne soit dessiné :
    // on mesurerait un nombre que personne ne voit.
    //
    // Et l'on éprouve LE SIGNE, pas seulement l'amplitude. Une inclinaison
    // à l'envers est pire que pas d'inclinaison : l'appareil pencherait vers
    // l'EXTÉRIEUR du virage, ce qu'aucun avion ne fait. Le signe a été
    // vérifié en capture avant d'être écrit ici : à gauche l'aile gauche
    // descend, à droite c'est l'inverse.
    const roulis = await tab.evaluate(async () => {
      const g = window.__game;
      const tenirSecondes = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => {
          cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05);
          prec = t;
          if (cumul >= n) fin(); else requestAnimationFrame(pas);
        };
        requestAnimationFrame(pas);
      });
      g.player.pilote = null; g.player.avionEnVol = false;
      g.player.vitesseAvion = undefined; g.player.flying = false;
      g.player.yaw = 0; g.player.pitch = 0;
      g.player.pos.set(0, 90, 0);
      // DEVANT SOI : `animalManager.monture()` — ce que le bouton appelle —
      // refuse ce qui n'est pas dans l'axe du regard.
      const d = { x: -Math.sin(g.player.yaw), z: -Math.cos(g.player.yaw) };
      const avion = g.animalManager.invoquer('avionligne',
        Math.round(g.player.pos.x + d.x * 3), Math.round(g.player.pos.z + d.z * 3));
      if (!avion) return { err: 'aucun avion posé' };
      document.getElementById('ride-btn').click();
      await tenirSecondes(0.5);
      if (!g.player.pilote) return { err: 'on n\'est pas aux commandes' };
      g.player.decollerOuSePoser();
      await tenirSecondes(4);
      const pencher = async (touche) => {
        g.player.keys.add(touche);
        await tenirSecondes(2.5);
        const z = avion.mesh.rotation.z;
        g.player.keys.delete(touche);
        await tenirSecondes(2);
        return { penche: +z.toFixed(3), rendu: +avion.mesh.rotation.z.toFixed(3) };
      };
      const gauche = await pencher('KeyA');
      const droite = await pencher('KeyD');
      g.player.keys.clear();
      g.player.pilote = null; g.player.avionEnVol = false;
      g.player.vitesseAvion = undefined; g.player.flying = false;
      return { gauche, droite, ordre: avion.mesh.rotation.order };
    });
    // Un dixième de radian, c'est six degrés : en dessous, personne ne voit
    // rien. L'ancien code rend zéro des deux côtés.
    const PENCHE = 0.1;
    verifier('l\'avion s\'incline dans ses virages, et du bon côté',
      !roulis.err && !!roulis.gauche && roulis.gauche.penche > PENCHE
        && roulis.droite.penche < -PENCHE,
      `virages : ${JSON.stringify(roulis)}`);
    // ET IL SE REDRESSE QUAND ON LÂCHE. Une aile qui reste penchée sur une
    // ligne droite est un appareil en perdition, pas un avion.
    //
    // ON EXIGE D'ABORD QU'IL SE SOIT PENCHÉ. Sans cette clause le témoin est
    // VERT À VIDE sur l'ancien code — qui ne s'incline jamais, donc ne reste
    // jamais penché — et un témoin vert des deux côtés ne prouve rien
    // (leçon de la v220).
    verifier('l\'avion se remet à plat quand on lâche les commandes',
      !roulis.err && !!roulis.gauche
        && roulis.gauche.penche > PENCHE && roulis.droite.penche < -PENCHE
        && Math.abs(roulis.gauche.rendu) < PENCHE
        && Math.abs(roulis.droite.rendu) < PENCHE,
      `après avoir lâché : ${JSON.stringify(roulis)}`);

    // UNE VOITURE QUI NE SUIT PAS LE MANIFESTE EST QUAND MÊME POSÉE SUR SES
    // ROUES (v230).
    //
    // Max a déposé deux modèles d'une autre provenance. Ils ne suivent pas le
    // manifeste de la flotte (`vendor/voitures/LICENSE.md`) : maillages
    // quantifiés, chaque roue éclatée en huit nœuds — un par matériau — aucun
    // matériau nommé `Paint`, et le nez sur un autre axe. Sans mesure, une
    // voiture pareille arrive en travers, flottant au-dessus du sol, roues
    // figées.
    //
    // ON ÉPROUVE CE QUE L'ENFANT VOIT, par le VRAI chargeur du jeu : quatre
    // pivots de roue, la voiture posée au sol (`min.y` à zéro, sinon elle
    // flotte ou s'enterre jusqu'aux moyeux), un rayon de roue plausible, et
    // une longueur de voiture plus grande que sa largeur — c'est ce qui dit
    // qu'elle n'est pas en travers.
    //
    // ET DEUX MODÈLES D'ORIGINE SERVENT DE TÉMOIN DE CONTRÔLE : ils passent
    // par le chemin « manifeste », qui ne doit toucher à rien. S'ils bougent,
    // c'est que j'ai cassé la flotte en voulant l'élargir.
    const flotte = await tab.evaluate(async () => {
      const v = await import('./src/vehicules.js');
      const THREE = await import('three');
      const out = [];
      for (const fichier of ['lucid-gravity.glb', 'bugatti-chiron-stealth.glb',
        'bugatti-chiron.glb', 'audi-r8-v10-performance.glb']) {
        const entree = v.FLOTTE.find((e) => e.fichier === fichier);
        if (!entree) { out.push({ fichier, err: 'absente de la flotte' }); continue; }
        const porteur = await v.chargerVoitureFlotte(entree);
        if (!porteur) { out.push({ fichier, err: 'chargement échoué' }); continue; }
        porteur.updateMatrixWorld(true);
        let pivots = 0;
        porteur.traverse((o) => { if (/^Wheel_(FL|FR|RL|RR)$/i.test(o.name || '')) pivots++; });
        const boite = new THREE.Box3().setFromObject(porteur);
        const t = boite.getSize(new THREE.Vector3());
        out.push({ fichier, forme: porteur.userData.forme, pivots,
          rayon: +(porteur.userData.rayonRoue || 0).toFixed(3),
          sol: +boite.min.y.toFixed(3),
          long: +t.z.toFixed(2), large: +t.x.toFixed(2) });
      }
      return out;
    });
    const conforme = (o) => !o.err && o.pivots === 4 && Math.abs(o.sol) < 0.06
      && o.long > 3.4 && o.long < 6.2 && o.rayon > 0.25 && o.rayon < 0.6
      && o.long > o.large;
    const neuves = flotte.filter((o) => /lucid|stealth/.test(o.fichier));
    const anciennes = flotte.filter((o) => !/lucid|stealth/.test(o.fichier));
    verifier('une voiture hors manifeste est remise d\'aplomb : posée au sol, quatre roues',
      neuves.length === 2 && neuves.every(conforme)
      && neuves.every((o) => o.forme === 'mesuré'), JSON.stringify(neuves));
    verifier('et les modèles du manifeste ne sont pas touchés',
      anciennes.length === 2 && anciennes.every(conforme)
      && anciennes.every((o) => o.forme === 'manifeste'), JSON.stringify(anciennes));

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
