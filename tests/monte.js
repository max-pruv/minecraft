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
    const poursuite = await tab.evaluate(() => {
      const g = window.__game;
      const a = g.animalManager.animals.find((x) => x.def.key === 'voiture');
      let volant = false;
      if (a) a.mesh.traverse((m) => {
        // le tore du cockpit sculpté, ou le SteeringWheel des modèles de la
        // flotte — chacun des cinquante-et-un a l'un ou l'autre
        if ((m.geometry && m.geometry.type === 'TorusGeometry')
          || /steeringwheel/i.test(m.name || '')) volant = true;
      });
      const dx = g.player.camera.position.x - g.player.pos.x;
      const dz = g.player.camera.position.z - g.player.pos.z;
      // le regard porte vers (-sin, -cos) : un produit scalaire négatif dit
      // que la caméra est bien DERRIÈRE, pas devant
      const devant = dx * -Math.sin(g.player.yaw) + dz * -Math.cos(g.player.yaw);
      return { volant,
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
      poursuite.volant, poursuite.volant ? 'volant trouvé' : 'pas de volant dans le modèle');

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
    // modèles différents parmi les cinquante-et-un. Le choix est écrit à la
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
