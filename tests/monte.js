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

const { Banc, dormir, souffler } = require('./banc.js');

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
// `portee` : sur combien de blocs le cap doit être libre — six pour un pas
// de marche, davantage pour une voiture lancée (v262 : élan puis mesure).
const capDegage = (p, portee = 6) => p.evaluate((portee) => {
  const g = window.__game;
  const w = g.world;
  const pos = g.player.pos;
  const fy = Math.floor(pos.y + 0.01);
  for (let i = 0; i < 32; i++) {
    const yaw = (i * Math.PI) / 16;
    let libre = true;
    for (let d = 1; d <= portee && libre; d++) {
      const x = Math.floor(pos.x - Math.sin(yaw) * d);
      const z = Math.floor(pos.z - Math.cos(yaw) * d);
      // le terrain ondule : un creux d'un bloc se traverse, une bosse non
      if (!w.isSolid(x, fy - 1, z) && !w.isSolid(x, fy - 2, z)) libre = false;
      for (let dy = 0; dy <= 1; dy++) if (w.isSolid(x, fy + dy, z)) libre = false;
    }
    if (libre) return yaw;
  }
  return null;
}, portee);

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

// `elan` : des secondes de jeu d'ÉLAN avant de mesurer — une voiture a de
// l'inertie depuis la v262, et l'on mesure ce qu'elle fait une fois lancée,
// pas la demi-seconde où elle prend sa vitesse.
async function avancerUnDemiSeconde(p, depart, elan = 0) {
  if (depart) await placerA(p, depart);
  await p.keyboard.down('KeyW');
  if (elan > 0) {
    await p.evaluate((n) => new Promise((fin) => {
      let cumul = 0, prec = performance.now();
      const pas = (t) => {
        cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05);
        prec = t;
        if (cumul >= n) fin(); else requestAnimationFrame(pas);
      };
      requestAnimationFrame(pas);
    }), elan);
  }
  const avant = await pose(p);
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

    // --- ON VOIT LE PERSONNAGE CONDUIRE (v249) ------------------------------
    // Max : « fais en sorte qu'on voit le personnage conduire quand on
    // conduit une voiture ». La vue de poursuite montrait une voiture vide.
    // On monte par le bouton, comme l'enfant, et l'on vérifie ce qu'il
    // voit : son avatar est enfant du maillage de la voiture, dans
    // l'habitacle (repère du véhicule), et sa tête tombe dans le cadre de la
    // caméra ; à la descente, il n'est plus dans la scène. Sur l'ancien code
    // il n'y a pas d'avatar local du tout — et le témoin le dit.
    await poserDevant(tab, 'voiture');
    await dormir(900);
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(900);
    const conduite = await tab.evaluate(async () => {
      const g = window.__game, av = g.avatarLocal, a = g.fun.montureConduite ? g.fun.montureConduite() : null;
      if (!av || !a) return { avatar: !!av, monture: !!a };
      const THREE = await import('three');
      const tete = av.localToWorld(new THREE.Vector3(0, 1.45, 0));
      const v = tete.clone().project(g.camera);
      // LE VISAGE REGARDE LA ROUTE : le modèle a le visage en −z ; on compare
      // cette direction, dans le monde, au cap de la voiture (Max a vu le
      // premier jet assis de dos).
      const visage = av.getWorldDirection(new THREE.Vector3()).negate();
      const route = new THREE.Vector3(-Math.sin(g.player.yaw), 0, -Math.cos(g.player.yaw));
      const regardeLaRoute = +visage.dot(route).toFixed(2);
      // ET SOUS LE TOIT : le sommet du crâne (0,706 au-dessus des hanches, à
      // l'échelle de l'avatar) reste sous le pavillon mesuré de ce modèle
      // (Max : « le personnage passe à travers la carrosserie »).
      const crane = av.position.y + (0.77 + 0.706) * av.scale.x;
      // Depuis la v253 le cache du plafond est PAR SIÈGE (une Map) : on lit
      // celui du siège du conducteur ; sur l'ancien code, `y` est le nombre.
      const cache = a.plafondSiege ? a.plafondSiege.y : null;
      const toit = cache instanceof Map ? (cache.get(`${a.def.siege.x}|${a.def.siege.z}`) ?? null) : cache;
      const sousLeToit = toit === null || crane < toit;
      return { avatar: true, monture: true, dansVoiture: av.parent === a.mesh,
        x: +av.position.x.toFixed(2), y: +av.position.y.toFixed(2), z: +av.position.z.toFixed(2),
        dansLeCadre: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1, regardeLaRoute, sousLeToit, crane: +crane.toFixed(2), toit };
    });
    verifier('au volant, le personnage de l\'enfant est assis dans la voiture, sous le toit, dans le cadre, et regarde la route',
      !!conduite.dansVoiture && Math.abs(conduite.x) < 1.1 && Math.abs(conduite.z) < 2 && conduite.dansLeCadre
        && conduite.regardeLaRoute > 0.9 && conduite.sousLeToit,
      JSON.stringify(conduite));
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(700);
    const aLaDescente = await tab.evaluate(() => { const av = window.__game.avatarLocal; return { avatar: !!av, dansLaScene: !!(av && av.parent) }; });
    verifier('et il descend avec l\'enfant : plus d\'avatar dans la scène à pied',
      aLaDescente.avatar && !aLaDescente.dansLaScene, JSON.stringify(aLaDescente));

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

    // --- la pastille du garde-manger ------------------------------------------
    //
    // La récolte fait naître la pastille 🍖 dans le rail. Elle ouvrait
    // l'atelier ; l'atelier n'existe plus (v255) et elle ne fait plus que
    // compter — mais elle doit encore compter, et se voir.
    await tab.evaluate(() => window.__game.animalManager.onHarvest({ meat: '🍖 Côtelette' }));
    const pastille = await tab.evaluate(() => {
      const el = document.getElementById('meat-counter');
      return { visible: getComputedStyle(el).display !== 'none', texte: el.textContent };
    });
    verifier('la récolte fait naître la pastille du garde-manger',
      pastille.visible && /🍖 × \d+/.test(pastille.texte), JSON.stringify(pastille));

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
    const capAuto = await capDegage(tab, 14);
    const departAuto = await tab.evaluate((yaw) => {
      const g = window.__game;
      return { x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z, yaw: yaw ?? g.player.yaw };
    }, capAuto);
    const distanceAPiedTexas = await avancerUnDemiSeconde(tab, departAuto);
    await poserDevant(tab, 'voiture');
    await dormir(600);
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(700);
    const distanceAuVolant = await avancerUnDemiSeconde(tab, departAuto, 0.5);
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
    // ET LE MODÈLE DIT S'IL A DES VITRES (v247). Ce témoin est tombé au
    // portail sur un tirage : les deux modèles déposés en v230 n'ont ni
    // matériau nommé « glass » ni opacité sous 0,8 — la Lucid appelle son
    // pare-brise « Lightly tinted panoramic windshield », la Chiron Stealth
    // est une carrosserie seule sans vitrage. Le nom se lit en plusieurs
    // langues, et une carrosserie sans habitacle (`habitacle: false` dans
    // sa fiche) n'a rien à laisser voir — même lecture que le volant.
    const carrosserie = await tab.evaluate(async () => {
      const g = window.__game;
      const a = g.animalManager.animals.find((x) => x.def.key === 'voiture');
      const fiche = (await import('./src/vehicules.js')).FLOTTE
        .find((e) => e.fichier === (a && a.mesh.userData.flotte));
      let vitresTransparentes = false, sommetsFusionnes = 0;
      if (a) a.mesh.traverse((m) => {
        if (!m.isMesh) return;
        // opacité basse (Chiron d'artiste) ou vitrage nommé de la flotte,
        // déjà en alpha BLEND — l'un comme l'autre laisse voir l'habitacle
        if (m.material && m.material.transparent
          && (m.material.opacity < 0.8 || /glass|windshield|window|vitr|pare-brise/i.test(m.material.name || ''))) vitresTransparentes = true;
        if (m.geometry && m.geometry.attributes && m.geometry.attributes.position
          && m.geometry.attributes.position.count > sommetsFusionnes) {
          sommetsFusionnes = m.geometry.attributes.position.count;
        }
      });
      return { vitresTransparentes, sommetsFusionnes, modele: a && a.mesh.userData.flotte,
        attenduVitres: !fiche || fiche.habitacle !== false };
    });
    verifier('la voiture a de vraies vitres — on voit l\'habitacle à travers',
      carrosserie.vitresTransparentes || !carrosserie.attenduVitres, JSON.stringify(carrosserie));
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

    // LES REFLETS NE FIGENT PLUS L'IMAGE (v245) -------------------------------
    //
    // Max, sur l'iPad de quatre ans : « la voiture avance de manière hyper
    // saccadée ». La sonde des reflets rendait ses SIX faces dans la même
    // image, deux fois par seconde : au banc, assis dans une voiture à
    // l'arrêt, une image sur quatre durait trois fois la médiane, par paires à
    // une demi-seconde d'écart. On mesure la CAUSE et non l'effet — le banc
    // rend en logiciel, sa cadence ne dit rien de l'iPad : le compteur
    // d'images du moteur avance d'un cran par `render()`, donc de 1 + faces
    // rendues à chaque tour d'affichage. Sept sur l'ancien code ; deux au
    // plus ici, et au moins un tour à deux, sinon les reflets sont morts.
    const rendus = await tab.evaluate(async () => {
      const g = window.__game;
      const deltas = [];
      let prec = g.renderer.info.render.frame;
      await new Promise((fin) => {
        const t0 = performance.now();
        const tour = () => {
          const f = g.renderer.info.render.frame;
          deltas.push(f - prec); prec = f;
          if (performance.now() - t0 < 4000) requestAnimationFrame(tour); else fin();
        };
        requestAnimationFrame(tour);
      });
      const d = deltas.slice(1);
      return { tours: d.length, max: Math.max(...d), aDeux: d.filter((x) => x === 2).length };
    });
    verifier('au volant, aucune image ne rend plus d\'une face de reflet à la fois',
      rendus.tours > 8 && rendus.max <= 2 && rendus.aDeux >= 1,
      `${rendus.tours} tours · au plus ${rendus.max} rendus par tour · ${rendus.aDeux} tours à deux`);
    // LA RUE S'ARRÊTE DEVANT LA VOITURE DE L'ENFANT (v245) --------------------
    //
    // Max, après la v244 : « les voitures passent les unes sur les autres ».
    // Mesuré sur la rue de Rivoli, l'enfant au volant à l'arrêt sur la
    // chaussée : un convoi entier lui passait AU TRAVERS. Les convois cédaient
    // entre eux, jamais à l'enfant. On se pose au volant sur le tracé d'un
    // convoi, douze blocs devant sa tête, on attend qu'une voiture arrive à
    // moins de douze blocs, puis l'on compte pendant douze secondes les
    // rectangles de la rue qui touchent le nôtre. À L'ARRÊT, pas en roulant :
    // rouler droit sur une rue courbe avec une carrure de 2,2 blocs finit
    // dans le trottoir (0,7 bloc roulé, vitesse x à zéro — mesuré), et le
    // témoin jugeait alors la géométrie de Rivoli, pas la circulation.
    // TÉLÉPORTÉ EN VOITURE, ON GARDE SA VOITURE (v245). Le gestionnaire
    // d'animaux retire tout ce qui est à plus de soixante-dix blocs de
    // l'enfant, et il passe AVANT que la monture ne le rejoigne : un voyage
    // par la carte au volant faisait disparaître la voiture et laissait
    // l'enfant à pied avec la carrure d'une voiture — coincé entre deux murs.
    // On saute de trois cents blocs avec la voiture, et l'on doit être encore
    // au volant deux secondes plus tard.
    const saut = await tab.evaluate(async () => {
      const g = window.__game;
      const depart = { x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z };
      g.player.pos.set(depart.x + 300, g.world.terrainHeight(Math.floor(depart.x + 300), Math.floor(depart.z)) + 1.5, depart.z);
      g.player.vel.set(0, 0, 0);
      await new Promise((f) => setTimeout(f, 2000));
      const auVolant = document.getElementById('ride-btn').textContent.startsWith('⬇️');
      const gabarit = g.player.gabarit;
      g.player.pos.set(depart.x, depart.y, depart.z); g.player.vel.set(0, 0, 0);
      await new Promise((f) => setTimeout(f, 1000));
      return { auVolant, gabarit, encoreAuVolant: document.getElementById('ride-btn').textContent.startsWith('⬇️') };
    });
    verifier('téléporté de trois cents blocs au volant, on est encore au volant, et la voiture a suivi',
      saut.auVolant && saut.encoreAuVolant && saut.gabarit > 1, JSON.stringify(saut));

    // ON DESCEND AVANT DE PARTIR. Téléporté en voiture, l'enfant arrive à
    // Paris pendant que sa monture est encore au point d'apparition : le
    // gestionnaire d'animaux la retire (plus de soixante-dix blocs) avant
    // qu'elle ne le rejoigne, et l'enfant se retrouve à pied avec la carrure
    // d'une voiture — c'est ce qu'a rendu le portail (0,9 bloc roulé, puis
    // 1,1 bloc du mur à pied). On descend ici, on prend une voiture là-bas.
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(400);
    const avantParis = await tab.evaluate(async () => {
      const m = await import('./src/mondes.js'); const P = m.positionDe('paris'); const g = window.__game;
      const sauve = { x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z, yaw: g.player.yaw, flying: g.player.flying };
      g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
      return sauve;
    });
    await tab.waitForFunction(() => (window.__vehicules.etat() || []).filter((c) => c.routier).reduce((n, c) => n + c.visibles, 0) >= 4,
      null, { timeout: 60000 }).catch(() => {});
    // UNE MESURE OÙ AUCUNE VOITURE NE VIENT N'EST PAS UNE MESURE. Au portail
    // de la v252 (troisième passe) : 97 relevés de voitures à moins de douze
    // blocs, ZÉRO arrêtée, ZÉRO au travers — les voitures passaient À CÔTÉ,
    // parce que douze blocs « devant » une voiture en droite ligne ne sont pas
    // sur son tracé quand la rue tourne. On exige donc de la chaussée sous
    // toute la ligne, on classe les candidats par distance, et si personne ne
    // vient à nous en douze secondes, on se repose sur le candidat suivant :
    // le verdict porte sur ce que fait une voiture qui ARRIVE, pas sur la
    // chance qu'une voiture arrive.
    const poserAParis = (rang) => tab.evaluate(async (rang) => {
      const g = window.__game, et = window.__vehicules.etat();
      const { CHAUSSEE } = await import('./src/world.js');
      const surChaussee = (x, z) => { const bx = Math.floor(x), bz = Math.floor(z); const y = g.world.sommetColonne(bx, bz); return CHAUSSEE.has(g.world.getBlock(bx, y, bz)); };
      // toutes les places des convois routiers ; on se pose douze blocs devant
      // l'une d'elles, à un point LIBRE — aucune voiture à moins de sept blocs,
      // sinon on naît dans une voiture de la file (au portail : quatre-vingts
      // relevés « au travers », dès la première image)
      const places = [];
      et.forEach((c) => c.routier && (c.places || []).forEach((q) => places.push({ x: q[0], z: q[1], cap: q[2] })));
      const candidats = [];
      for (const q of places) {
        const x = q.x + Math.sin(q.cap) * 12, z = q.z + Math.cos(q.cap) * 12;
        if (places.some((o) => Math.hypot(o.x - x, o.z - z) < 7)) continue;
        let route = true;
        for (let t = 2; t <= 12; t += 2) if (!surChaussee(q.x + Math.sin(q.cap) * t, q.z + Math.cos(q.cap) * t)) { route = false; break; }
        if (!route) continue;
        const d = Math.hypot(x - g.player.pos.x, z - g.player.pos.z);
        candidats.push({ d, x: q.x, z: q.z, cap: q.cap });
      }
      candidats.sort((p, q) => p.d - q.d);
      const m = candidats[Math.min(rang, candidats.length - 1)] || null;
      if (!m) return null;
      const x = m.x + Math.sin(m.cap) * 12, z = m.z + Math.cos(m.cap) * 12;
      g.player.pos.set(x, g.world.terrainHeight(Math.floor(x), Math.floor(z)) + 1.5, z);
      g.player.vel.set(0, 0, 0); g.player.yaw = m.cap + Math.PI; g.player.pitch = 0; g.player.flying = false;
      for (const a of [...g.animalManager.animals]) if (a.def.key === 'voiture') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
      g.animalManager.invoquer('voiture', x - Math.sin(g.player.yaw) * 3, z - Math.cos(g.player.yaw) * 3);
      return { ...m, candidats: candidats.length };
    }, rang);
    const monterAParis = async () => {
      // Le bouton garde son `display` d'avant tant que sa ligne est cachée :
      // on attend la LIGNE, puis le « ⬇️ » qui prouve qu'on est monté — et
      // l'on réessaie, parce qu'un clic trop tôt ne monte dans rien.
      await tab.waitForFunction(() => {
        const b = document.getElementById('ride-btn');
        return b && getComputedStyle(b).display !== 'none' && getComputedStyle(b.closest('.fun-target')).display !== 'none';
      }, null, { timeout: 20000 }).catch(() => {});
      // ET ON NE RECLIQUE PAS SUR UN ENFANT DÉJÀ MONTÉ : le bouton est une
      // BASCULE, un second clic le fait descendre. Ce jet-ci attendait le
      // « ⬇️ » du bouton — écrit à l'image suivante, sondé par rAF — pendant
      // trois secondes puis recliquait : au portail de la v252, à une image
      // par seconde dans Paris, le premier clic avait monté, le second a fait
      // descendre, et trois témoins ont mesuré « au volant » à pied. L'état
      // se lit dans le jeu, jamais dans le texte d'un bouton.
      const auVolantMaintenant = () => tab.evaluate(() => !!(window.__game.fun.montureConduite && window.__game.fun.montureConduite()));
      for (let essai = 0; essai < 6; essai++) {
        if (!(await auVolantMaintenant())) await tab.evaluate(() => document.getElementById('ride-btn').click());
        const monte = await tab.waitForFunction(() => (window.__game.fun.montureConduite && window.__game.fun.montureConduite())
          && document.getElementById('ride-btn').textContent.startsWith('⬇️'), null, { timeout: 3000, polling: 200 }).then(() => true).catch(() => false);
        if (monte) break;
        await dormir(700);
      }
    };
    const mesurerChaussee = () => tab.evaluate(async () => {
      const g = window.__game, et = window.__vehicules.etat();
      let m = null;
      et.forEach((c) => c.routier && (c.places || []).forEach((q) => {
        const d = Math.hypot(q[0] - g.player.pos.x, q[1] - g.player.pos.z);
        if (!m || d < m.d) m = { d, x: q[0], z: q[1], cap: q[2] };
      }));
      if (!m) return null;
      if (!document.getElementById('ride-btn').textContent.startsWith('⬇️')) return { auVolant: false };
      g.player.keys.delete('KeyW');
      const rect = (x, z, cap) => { const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux; return [[x + ux * 2.2 + vx * 1.13, z + uz * 2.2 + vz * 1.13], [x + ux * 2.2 - vx * 1.13, z + uz * 2.2 - vz * 1.13], [x - ux * 2.2 - vx * 1.13, z - uz * 2.2 - vz * 1.13], [x - ux * 2.2 + vx * 1.13, z - uz * 2.2 + vz * 1.13]]; };
      const separes = (P, Q) => { for (const R of [P, Q]) for (let k = 0; k < 4; k++) { const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0]; const pr = (S) => S.map((q) => q[0] * ax + q[1] * az); const p1 = pr(P), p2 = pr(Q); if (Math.max(...p1) < Math.min(...p2) || Math.max(...p2) < Math.min(...p1)) return true; } return false; };
      let releves = 0, traverses = 0, proches = 0, arretees = 0, attenteSecondes = 0;
      // douze blocs, pas six : une voiture qui cède s'arrête dès que son
      // balayage de huit blocs touche notre rectangle, donc à six ou huit
      // blocs de notre centre — à six, le témoin ne la voyait jamais arriver
      const PORTEE = 12;
      const uneVoiturePres = () => { let n = 0; window.__vehicules.etat().forEach((c) => c.routier && (c.places || []).forEach((q) => { if (Math.hypot(q[0] - g.player.pos.x, q[1] - g.player.pos.z) <= PORTEE) n++; })); return n; };
      // on attend la première voiture : jusqu'à quarante secondes
      const tAttente = performance.now();
      while (performance.now() - tAttente < 40000 && !uneVoiturePres()) await new Promise((f) => setTimeout(f, 200));
      attenteSecondes = +((performance.now() - tAttente) / 1000).toFixed(1);
      const t0 = performance.now();
      while (performance.now() - t0 < 12000) {
        await new Promise((f) => setTimeout(f, 150));
        releves++;
        const moi = rect(g.player.pos.x, g.player.pos.z, g.player.yaw + Math.PI);
        window.__vehicules.etat().forEach((c) => c.routier && (c.places || []).forEach((q) => {
          if (Math.hypot(q[0] - g.player.pos.x, q[1] - g.player.pos.z) > PORTEE) return;
          proches++; if (q[5]) arretees++;
          if (!separes(moi, rect(q[0], q[1], q[2]))) traverses++;
        }));
      }
      return { releves, proches, arretees, traverses, attenteSecondes };
    });
    let poseParis = null, chaussee = null, poses = 0;
    for (let rang = 0; rang < 3; rang++) {
      poseParis = await poserAParis(rang);
      if (!poseParis) break;
      poses++;
      await monterAParis();
      chaussee = await mesurerChaussee();
      // personne n'est venu : on ne conclut pas, on se repose ailleurs
      if (!chaussee || chaussee.auVolant === false || chaussee.arretees > 0 || chaussee.traverses > 0) break;
    }
    if (chaussee) chaussee.poses = poses;
    verifier('la circulation s\'arrête devant la voiture de l\'enfant au lieu de lui passer au travers',
      !!chaussee && chaussee.auVolant !== false && chaussee.proches > 0 && chaussee.arretees > 0 && chaussee.traverses === 0,
      chaussee ? (chaussee.auVolant === false ? 'pas au volant' : `${chaussee.traverses} relevé(s) au travers · ${chaussee.proches} relevé(s) de voiture à moins de douze blocs, ${chaussee.arretees} arrêtée(s) · première voiture après ${chaussee.attenteSecondes} s · ${chaussee.poses} pose(s)`) : 'aucun convoi routier trouvé');
    // ET L'ON DESCEND AVANT DE REPARTIR — en le vérifiant. Au portail de la
    // v249, le témoin du mur qui suit a mesuré « à pied » avec la carrure
    // d'une voiture : l'enfant était encore au volant. On lit l'état avant le
    // clic, après le clic, et après le retour, pour savoir où il remonte.
    const etatVolant = () => tab.evaluate(() => { const g = window.__game; return { gabarit: g.player.gabarit,
      monture: !!(g.fun.montureConduite && g.fun.montureConduite()), bouton: document.getElementById('ride-btn').textContent,
      animaux: g.animalManager.animals.map((a) => a.def.key + (a.montee ? '*' : '')).join(',') }; });
    const avantClic = await etatVolant();
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(400);
    const apresClic = await etatVolant();
    await tab.evaluate((s) => { const g = window.__game; g.player.pos.set(s.x, s.y, s.z); g.player.vel.set(0, 0, 0); g.player.yaw = s.yaw; g.player.flying = s.flying; }, avantParis);
    await dormir(1500);
    const apresRetour = await etatVolant();
    verifier('et l\'on est descendu de la voiture de Paris, à pied au retour',
      !apresClic.monture && !apresRetour.monture && apresRetour.gabarit < 1,
      `avant le clic ${JSON.stringify(avantClic)} · après ${JSON.stringify(apresClic)} · au retour ${JSON.stringify(apresRetour)}`);

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
    // UN ROUGE QUI NE DIT PAS DANS QUEL ÉTAT IL A MESURÉ NE SE DÉMONTE PAS :
    // « à pied 1,1 bloc du mur » au portail de la v249, c'est-à-dire à pied
    // avec la carrure d'une voiture — l'état laissé par le témoin d'avant.
    const etatAPied = await tab.evaluate(() => ({ gabarit: window.__game.player.gabarit,
      auVolant: document.getElementById('ride-btn').textContent.startsWith('⬇️'),
      monture: !!(window.__game.fun.montureConduite && window.__game.fun.montureConduite()) }));
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
      `à pied ${ecartAPied} bloc du mur · au volant ${ecartAuVolant} · au volant=${auVolant} · état à pied ${JSON.stringify(etatAPied)}`);
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
    // ET LES NAISSANCES SE FONT PAR TRANCHES (v246). Dix-huit passants
    // naissaient dans la MÊME image à l'arrivée — quarante-quatre à New York
    // — chacun avec son clone de squelette : une part du gel que Max sent à
    // la téléportation. On compte, image par image, combien de passants
    // apparaissent : dix-huit d'un coup sur l'ancien code, jamais plus de
    // quelques-uns par image ici. On mesure ce que l'enfant subit (une
    // image qui fait tout) et non le mécanisme (une file), sur `effectif()`
    // que l'ancien code publie aussi.
    const naissances = await tab.evaluate(async () => {
      const { positionDe } = await import('./src/mondes.js');
      const g = window.__game;
      const p = positionDe('rome');
      const effectif = () => (g.passants && g.passants.effectif && g.passants.effectif()) || 0;
      const base = effectif();
      const parImage = [];
      let prec = base, actif = true;
      const tic = () => {
        const e = effectif();
        if (e > prec) parImage.push(e - prec);
        prec = e;
        if (actif) requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
      g.player.flying = true;
      g.player.pos.set(p.x, g.world.terrainHeight(p.x, p.z) + 6, p.z);
      g.player.vel.set(0, 0, 0);
      const t0 = performance.now();
      while (effectif() - base < 18 && performance.now() - t0 < 15000) {
        await new Promise((f) => setTimeout(f, 100));
      }
      actif = false;
      return { nees: effectif() - base, images: parImage.length, maxParImage: Math.max(0, ...parImage) };
    });
    verifier('les passants naissent par tranches, jamais tous dans la même image',
      naissances.nees >= 18 && naissances.images >= 3 && naissances.maxParImage <= 9,
      JSON.stringify(naissances));
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

    // ---- UN PASSANT QU'ON APPROCHE CONTINUE SON CHEMIN (v243) --------------
    //
    // Max : « elles regardent le joueur principal au lieu de continuer à se
    // promener ». `Habitant.think` se figeait à moins de cinq blocs et demi et
    // se tournait vers l'enfant — dix-huit fois par ville. On met un passant
    // en marche, on pose l'enfant à trois blocs de lui, et l'on regarde s'il
    // avance quand même. Sur l'ancien code il ne bouge pas d'un bloc.
    //
    // Ce banc avance à quinze pour cent du temps réel (`dt` borné, trois
    // images par seconde) : on attend le premier bloc et demi jusqu'à douze
    // secondes, et l'on rend l'enfant à sa place après.
    // Un passant lancé contre un mur n'avance pas non plus (un bloc en douze
    // secondes, vu au portail) : on essaie trois passants et quatre caps, et
    // l'on garde le premier qui avance. Sur l'ancien code aucun ne bouge,
    // quelle que soit la direction — c'est l'enfant qui le fige.
    const suit = await tab.evaluate(async () => {
      const g = window.__game, s2 = g.passants.sites.find((x) => x.peuple);
      const gens = s2.peuple.filter((q) => q.name === 'passant').slice(0, 3);
      if (!gens.length) return { err: 'aucun passant' };
      const sauve = g.player.pos.clone();
      let meilleur = 0, essais = 0;
      for (const h of gens) {
        for (const cap of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          essais++;
          h.etat = 'marche'; h.minuteur = 8; h.capYaw = cap; h.pas = h.walkSpeed;
          g.player.pos.set(h.pos.x + 3, h.pos.y, h.pos.z); g.player.vel.set(0, 0, 0);
          const x0 = h.pos.x, z0 = h.pos.z, t0 = performance.now();
          let d = 0;
          while (performance.now() - t0 < 4000 && d < 1.2) {
            await new Promise((f) => setTimeout(f, 250));
            d = Math.hypot(h.pos.x - x0, h.pos.z - z0);
          }
          if (d > meilleur) meilleur = d;
          if (d >= 1.2) { g.player.pos.copy(sauve); return { d: +d.toFixed(2), essais, secondes: +((performance.now() - t0) / 1000).toFixed(1) }; }
        }
      }
      g.player.pos.copy(sauve);
      return { d: +meilleur.toFixed(2), essais };
    });
    verifier('un passant qu\'on approche continue son chemin au lieu de s\'arrêter pour regarder l\'enfant',
      !suit.err && suit.d >= 1.2, JSON.stringify(suit));

    // ---- UN PASSANT NE TRAVERSE PAS LA VOITURE DE L'ENFANT (v259) -------------
    //
    // Max, capture à la Bastille : des passants au travers de sa voiture. Un
    // piéton ne connaît que les blocs solides ; une voiture n'en est pas un.
    // On monte dans une voiture, à l'arrêt sur la rue, et l'on lance huit
    // passants droit dessus, depuis trois ou quatre blocs — on PROVOQUE la
    // situation au lieu d'attendre qu'un passant vienne de lui-même (leçon des
    // poissons). Dix relevés par seconde pendant douze secondes : combien de
    // fois un passant a-t-il les pieds DANS le rectangle de la voiture
    // (4,4 × 2,26, cap de l'enfant) ? Sur l'ancien code, des dizaines ; ici,
    // zéro — et ils marchent quand même, sinon le vert serait celui de huit
    // statues. Ceux qui s'éloignent sont relancés vers la voiture toutes les
    // deux secondes, pour que la pression ne tombe pas. Le rectangle est
    // recopié ici, pas demandé au jeu : l'ancien code ne le publie pas.
    const traversee = await tab.evaluate(async () => {
      const g = window.__game, s2 = g.passants.sites.find((x) => x.peuple);
      const gens = s2.peuple.filter((q) => q.name === 'passant').slice(0, 8);
      if (gens.length < 6) return { err: `${gens.length} passant(s)` };
      const sauve = g.player.pos.clone(), yaw0 = g.player.yaw;
      const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
      // LES DÉPARTS SONT AU NIVEAU DE LA RUE. Seize points sur un cercle de
      // trois à quatre blocs et demi autour de l'ancre ; on ne garde que ceux
      // dont le sol est à moins d'un bloc et demi de celui de l'ancre — un
      // point tombé dans un immeuble poserait le passant SUR SON TOIT, d'où
      // il retomberait dans la voiture (vu à la sonde : des passants à
      // seize blocs de haut, comptés « dedans » par un rectangle sans y).
      // L'ancre est le premier passant qui offre au moins six départs.
      const departsAutour = (h, x0, z0, y0) => {
        const pts = [];
        for (let k = 0; k < 16; k++) {
          const a = k * Math.PI / 8, r = k % 2 ? 3.4 : 4.4;
          const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r, y = h.surfaceY(x, z);
          if (y !== null && Math.abs(y - y0) <= 1.5) pts.push([x, z]);
        }
        return pts;
      };
      let h0 = null, departs = [];
      for (const h of gens) {
        const pts = departsAutour(h, h.pos.x, h.pos.z, h.pos.y);
        if (pts.length >= 6) { h0 = h; departs = pts; break; }
      }
      if (!h0) return { err: 'aucun passant avec six départs au niveau de la rue' };
      // la voiture, devant l'enfant, sur la rue où marche ce passant
      g.player.pos.set(h0.pos.x, h0.pos.y + 0.1, h0.pos.z); g.player.vel.set(0, 0, 0); g.player.flying = false;
      for (const a of [...g.animalManager.animals]) if (a.def.key === 'voiture') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
      g.animalManager.invoquer('voiture', g.player.pos.x - Math.sin(g.player.yaw) * 3, g.player.pos.z - Math.cos(g.player.yaw) * 3);
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      for (let essai = 0; essai < 8 && !auVolant(); essai++) {
        await dormir(600);
        if (!auVolant()) document.getElementById('ride-btn').click();
        const t = performance.now();
        while (!auVolant() && performance.now() - t < 2500) await dormir(200);
      }
      if (!auVolant()) { g.player.pos.copy(sauve); return { err: 'pas monté' }; }
      g.player.vel.set(0, 0, 0);
      await dormir(400);
      const px = g.player.pos.x, pz = g.player.pos.z, cap = g.player.yaw + Math.PI;
      const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux;
      // dans la voiture : dans son rectangle ET à sa hauteur — un passant sur
      // un balcon au-dessus de la rue n'est pas dedans
      const dedans = (h) => { const dx = h.pos.x - px, dz = h.pos.z - pz; return Math.abs(dx * ux + dz * uz) <= 2.2 && Math.abs(dx * vx + dz * vz) <= 1.13 && Math.abs(h.pos.y - g.player.pos.y) <= 2.5; };
      // on écarte les départs que la voiture recouvre désormais
      departs = departs.filter(([x, z]) => !dedans({ pos: { x, z, y: g.player.pos.y } }));
      if (departs.length < 4) { g.player.pos.copy(sauve); return { err: `${departs.length} départ(s) hors de la voiture` }; }
      const lancer = (h, k) => {
        const [x, z] = departs[k % departs.length];
        h.placeAt(x, z, g.player.pos.y);
        h.poste.set(px, pz); h.rayon = 0;
        h.etat = 'marche'; h.minuteur = 30; h.pas = h.walkSpeed;
        h.capYaw = Math.atan2(px - h.pos.x, pz - h.pos.z) + Math.PI;
      };
      gens.forEach(lancer);
      const parcouru = gens.map(() => 0), prec = gens.map((h) => [h.pos.x, h.pos.z]);
      let releves = 0, traverses = 0, relances = 0;
      const t0 = performance.now();
      let dernierRelance = t0;
      while (performance.now() - t0 < 12000) {
        await dormir(100);
        releves++;
        gens.forEach((h, k) => {
          if (dedans(h)) traverses++;
          parcouru[k] += Math.hypot(h.pos.x - prec[k][0], h.pos.z - prec[k][1]);
          prec[k] = [h.pos.x, h.pos.z];
        });
        if (performance.now() - dernierRelance > 2000) {
          dernierRelance = performance.now();
          gens.forEach((h, k) => {
            const d = Math.hypot(h.pos.x - px, h.pos.z - pz);
            if (d > 5.5 || h.etat !== 'marche') { lancer(h, k + relances); relances++; }
          });
        }
      }
      const bougent = parcouru.filter((d) => d > 0.5).length;
      // on rend tout : on descend, la voiture s'en va, l'enfant retrouve sa place
      for (let essai = 0; essai < 6 && auVolant(); essai++) { document.getElementById('ride-btn').click(); await dormir(500); }
      for (const a of [...g.animalManager.animals]) if (a.def.key === 'voiture') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
      g.player.pos.copy(sauve); g.player.yaw = yaw0; g.player.vel.set(0, 0, 0);
      if (g.player.prendreGabarit && auVolant()) g.player.prendreGabarit(0);
      return { departs: departs.length, releves, traverses, bougent, relances, parcouru: parcouru.map((d) => +d.toFixed(1)), encoreAuVolant: auVolant() };
    });
    verifier('un passant lancé sur la voiture de l\'enfant s\'arrête et la contourne au lieu de la traverser',
      !traversee.err && traversee.releves >= 60 && traversee.traverses === 0 && traversee.bougent >= 4,
      JSON.stringify(traversee));

    // ---- EN ROULANT : LA VOITURE FREINE, LE PIÉTON S'ÉCARTE (v259) --------------
    //
    // Max, capture à New York : une passante au travers de son taxi, et « pas
    // un mode violent comme GTA ». Le cas d'avant est la voiture à l'arrêt ;
    // ici c'est elle qui va sur les gens. Trois passants plantés SUR l'axe de
    // la voiture, à cinq, huit et onze blocs, immobiles (ils bavardent) ;
    // l'enfant appuie sur l'accélérateur douze secondes. Sur l'ancien code la
    // voiture leur passe au travers (relevés « dedans »). Ici : zéro dedans —
    // la voiture freine devant eux, ils pressent le pas de côté, et elle
    // repart : on exige qu'elle ait avancé, sinon le vert serait celui d'une
    // voiture clouée derrière un piéton pour toujours. Le cap est choisi pour
    // que la rue soit plate devant sur seize blocs, sinon on mesure une côte.
    const roulant = await tab.evaluate(async () => {
      const g = window.__game, s2 = g.passants.sites.find((x) => x.peuple);
      const gens = s2.peuple.filter((q) => q.name === 'passant').slice(0, 3);
      if (gens.length < 3) return { err: `${gens.length} passant(s)` };
      const sauve = g.player.pos.clone(), yaw0 = g.player.yaw;
      const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
      // et sans voiture de la rue à portée du trajet (leçon de la v252) : une
      // voiture de la circulation qui arrive en face cède devant l'enfant sans
      // limite, et l'on mesurerait deux voitures nez à nez, pas les piétons
      const rueLibre = (x, z, y) => !g.vehicules.placeProche({ x, y, z }, 10);
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      const retirerVoiture = () => { for (const a of [...g.animalManager.animals]) if (a.def.key === 'voiture') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); } };
      const descendre = async () => { for (let essai = 0; essai < 6 && auVolant(); essai++) { document.getElementById('ride-btn').click(); await dormir(500); } };
      // et un COULOIR libre : le sol exactement à la même cote sur seize
      // blocs et sur la largeur de la voiture (une marche d'un bloc arrête une
      // voiture, qui ne saute pas), pas un réverbère ni un banc dessus (le
      // mobilier arrête la voiture depuis la v252, et `surfaceY` ne le voit
      // pas : non solide pour la marche), pas une voiture de la rue en
      // travers. On le mesure ici pièce par pièce, et non par
      // `player.obstacleVehicule`, qui compte désormais les piétons — les
      // dix-huit passants de Rome barreraient tout couloir.
      const { isProp } = await import('./src/blocks.js');
      const couloirLibre = (h, x0, z0, y0, ux, uz) => {
        const cap = Math.atan2(ux, uz), vx = uz, vz = -ux;
        for (let d = 1; d <= 14; d++) {
          for (const w of [-1.2, 0, 1.2]) {
            const x = x0 + ux * d + vx * w, z = z0 + uz * d + vz * w;
            const y = h.surfaceY(x, z);
            if (y === null || Math.abs(y - y0) > 0.01) return false;
            const bx = Math.floor(x), bz = Math.floor(z), by = Math.floor(y0 + 0.1);
            if (isProp(g.world.getBlock(bx, by, bz)) || isProp(g.world.getBlock(bx, by + 1, bz))) return false;
          }
          if (g.vehicules.obstacleDevant(x0 + ux * d, z0 + uz * d, cap)) return false;
        }
        return true;
      };
      // Seize caps, et trois départs par cap (sur le passant, quatre blocs en
      // arrière, quatre en avant) : au portail de la v259, huit caps depuis
      // les seuls postes des passants n'ont trouvé aucun couloir (56 essais),
      // alors que trois tours à la sonde en trouvaient dès le premier passant.
      let ancre = null, candidats = 0;
      for (const h of s2.peuple.filter((q) => q.name === 'passant')) {
        for (let k = 0; k < 16 && !ancre; k++) {
          const a = k * Math.PI / 8, ux = Math.cos(a), uz = Math.sin(a);
          for (const recul of [0, -4, 4]) {
            const x0 = h.pos.x + ux * recul, z0 = h.pos.z + uz * recul, y0 = h.surfaceY(x0, z0);
            candidats++;
            if (y0 === null || Math.abs(y0 - h.pos.y) > 0.01) continue;
            if (!rueLibre(x0, z0, y0) || !rueLibre(x0 + ux * 12, z0 + uz * 12, y0)) continue;
            if (couloirLibre(h, x0, z0, y0, ux, uz)) { ancre = { h, x0, z0, y0, ux, uz }; break; }
          }
        }
        if (ancre) break;
      }
      if (!ancre) return { err: `aucun couloir libre de quatorze blocs (${candidats} essayés)` };
      {
        const { y0, ux, uz } = ancre;
        // l'avant du joueur est (−sin yaw, −cos yaw) : on vise (ux, uz)
        g.player.yaw = Math.atan2(-ux, -uz); g.player.pitch = 0;
        g.player.pos.set(ancre.x0, y0 + 0.1, ancre.z0); g.player.vel.set(0, 0, 0); g.player.flying = false;
        retirerVoiture();
        g.animalManager.invoquer('voiture', g.player.pos.x + ux * 3, g.player.pos.z + uz * 3);
        for (let essai = 0; essai < 8 && !auVolant(); essai++) {
          await dormir(600);
          if (!auVolant()) document.getElementById('ride-btn').click();
          const t = performance.now();
          while (!auVolant() && performance.now() - t < 2500) await dormir(200);
        }
        if (!auVolant()) { g.player.pos.copy(sauve); g.player.yaw = yaw0; return { err: 'pas monté' }; }
        g.player.vel.set(0, 0, 0);
        await dormir(400);
      }
      const { ux, uz } = ancre;
      const dedans = (h) => {
        const cap = g.player.yaw + Math.PI, cx = Math.sin(cap), cz = Math.cos(cap), vx = cz, vz = -cx;
        const dx = h.pos.x - g.player.pos.x, dz = h.pos.z - g.player.pos.z;
        return Math.abs(dx * cx + dz * cz) <= 2.2 && Math.abs(dx * vx + dz * vz) <= 1.13 && Math.abs(h.pos.y - g.player.pos.y) <= 2.5;
      };
      // ET L'ON NE CONCLUT PAS SUR UNE MESURE OÙ LA CIRCULATION EST VENUE
      // (v272). Au portail : douze relevés avec une voiture de la rue à moins
      // de huit blocs, 5,4 blocs d'avance pour une barre à six, ZÉRO traversée
      // — la voiture de l'enfant s'est arrêtée devant une voiture de la rue
      // (v245), pas devant un piéton, et le verdict jugeait une situation qui
      // n'a pas eu lieu. `rueLibre` regarde le départ et l'arrivée AVANT de
      // partir ; il ne peut rien contre un convoi qui arrive pendant les douze
      // secondes. On recommence donc, au plus trois fois, et le nombre de
      // tours part dans le message. Une traversée, elle, arrête tout de suite :
      // un vrai défaut ne se rejoue pas jusqu'au vert.
      let releves = 0, traverses = 0, ecartes = 0, voituresRue = 0, avance = 0, ecartMax = 0, tours = 0;
      for (tours = 1; tours <= 3; tours++) {
        g.player.pos.set(ancre.x0, ancre.y0 + 0.1, ancre.z0); g.player.vel.set(0, 0, 0);
        await dormir(400);
        const xd = g.player.pos.x, zd = g.player.pos.z;
        gens.forEach((h, k) => {
          h.placeAt(xd + ux * (5 + 3 * k), zd + uz * (5 + 3 * k), g.player.pos.y);
          h.poste.set(h.pos.x, h.pos.z); h.etat = 'pause'; h.minuteur = 30; h.pas = 0;
        });
        releves = 0; traverses = 0; ecartes = 0; voituresRue = 0;
        g.player.keys.add('KeyW');
        const t0 = performance.now();
        while (performance.now() - t0 < 12000) {
          await dormir(100);
          releves++;
          for (const h of gens) { if (dedans(h)) traverses++; if (h.ecart) ecartes++; }
          if (g.vehicules.placeProche(g.player.pos, 8)) voituresRue++;
        }
        g.player.keys.delete('KeyW');
        avance = +Math.hypot(g.player.pos.x - xd, g.player.pos.z - zd).toFixed(1);
        ecartMax = +Math.max(...gens.map((h) => Math.abs((h.pos.x - xd) * uz - (h.pos.z - zd) * ux))).toFixed(2);
        if (traverses > 0 || voituresRue === 0 || avance >= 6) break;
      }
      await descendre(); retirerVoiture();
      g.player.pos.copy(sauve); g.player.yaw = yaw0; g.player.vel.set(0, 0, 0);
      if (g.player.prendreGabarit && auVolant()) g.player.prendreGabarit(0);
      return { candidats, tours, releves, traverses, ecartes, voituresRue, avance, ecartMax, encoreAuVolant: auVolant() };
    });
    verifier('la voiture de l\'enfant freine devant un piéton, qui s\'écarte, et elle repart sans lui passer au travers',
      !roulant.err && roulant.releves >= 60 && roulant.traverses === 0 && roulant.avance >= 6,
      JSON.stringify(roulant));

    // ---- UNE HYPERCAR VA PLUS VITE QU'UNE CITADINE (v260) ------------------------
    //
    // Max : « les voitures devraient aller plus vite et surtout une vitesse en
    // fonction du modèle (sportive faster than sedan basic) ». Toute voiture
    // conduite roulait à ×3,4, quel que soit le modèle. On invoque une
    // citadine et une Koenigsegg Jesko sur un terrain plat, loin des villes,
    // on monte, on appuie, et l'on lit la VITESSE que l'enfant obtient
    // (`player.vel`, avant collision) : la Jesko au moins 1,8 fois plus vite,
    // et la citadine elle-même plus vite qu'avant (×3,4 = 10,9). Sur l'ancien
    // code, les deux rendent 10,9. Le terrain plat se cherche à la lecture de
    // `terrainHeight`, pure, sur trente blocs de ligne droite.
    const alluresModeles = await tab.evaluate(async () => {
      const g = window.__game;
      const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      const retirerVoitures = () => { for (const a of [...g.animalManager.animals]) if (a.def.key === 'voiture') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); } };
      const descendre = async () => { for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await dormir(500); } };
      const sauve = g.player.pos.clone(), yaw0 = g.player.yaw;
      // UNE DALLE, PAS UN CHAMP. Le relief naturel n'est jamais plat sur
      // quarante blocs (« pas de champ plat » à la sonde, quatre cents
      // essais) : on pose une dalle de pierre au-dessus du relief, loin de
      // tout, comme les témoins du regard, et on la retire après.
      const { BLOCK } = await import('./src/blocks.js');
      const x0 = 30000, z0 = 30000;
      let y0 = 0;
      for (let d = -6; d <= 44; d++) for (let w = -2; w <= 3; w++) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 3;
      const dalle = [];
      for (let d = -6; d <= 44; d++) for (let w = -2; w <= 3; w++) { g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE); dalle.push([x0 + d, y0, z0 + w]); }
      const champ = { x0, z0, y0 };
      await dormir(1500);
      const out = {};
      for (const flotte of ['berline-citadine', 'koenigsegg-jesko.glb']) {
        retirerVoitures();
        g.player.flying = false; g.player.yaw = -Math.PI / 2; g.player.pitch = 0;           // avant = +x
        g.player.pos.set(champ.x0, champ.y0 + 1.5, champ.z0 + 0.5); g.player.vel.set(0, 0, 0);
        g.animalManager.invoquer('voiture', champ.x0 + 3, champ.z0 + 0.5, false, { flotte });
        await dormir(800);
        for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); const t = performance.now(); while (!auVolant() && performance.now() - t < 2500) await dormir(200); }
        if (!auVolant()) { out[flotte] = { err: 'pas monté' }; continue; }
        const monture = g.fun.montureConduite();
        g.player.keys.add('KeyW');
        // UNE VOITURE A DE L'INERTIE (v262), ET ELLE SE JOUE PAR IMAGE (dt
        // borné) : au banc, deux images par seconde, la citadine met douze
        // images — cinq secondes murales — à prendre son allure. On compte
        // donc en SECONDES DE JEU, comme `avancerUnDemiSeconde` : une seconde
        // et demie d'élan, puis les relevés sur une demi-seconde de jeu.
        const enJeu = (n) => new Promise((fin) => {
          let cumul = 0, prec = performance.now();
          const pas = (t) => {
            cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05); prec = t;
            if (cumul >= n) fin(); else requestAnimationFrame(pas);
          };
          requestAnimationFrame(pas);
        });
        await enJeu(1.5);
        const vitesses = [];
        await new Promise((fin) => {
          let cumul = 0, prec = performance.now();
          const pas = (t) => {
            cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05); prec = t;
            vitesses.push(Math.hypot(g.player.vel.x, g.player.vel.z));
            if (cumul >= 0.5) fin(); else requestAnimationFrame(pas);
          };
          requestAnimationFrame(pas);
        });
        g.player.keys.delete('KeyW');
        vitesses.sort((a, b) => a - b);
        out[flotte] = { vitesse: +vitesses[Math.floor(vitesses.length / 2)].toFixed(1), max: +vitesses[vitesses.length - 1].toFixed(1), modele: monture.mesh && monture.mesh.userData ? monture.mesh.userData.flotte : null, boost: g.player.boost };
        await descendre();
      }
      retirerVoitures();
      for (const [x, y, z] of dalle) g.world.setBlock(x, y, z, 0);
      g.player.pos.copy(sauve); g.player.yaw = yaw0; g.player.vel.set(0, 0, 0);
      return out;
    });
    const cit = alluresModeles['berline-citadine'] || {}, jes = alluresModeles['koenigsegg-jesko.glb'] || {};
    verifier('une hypercar va plus vite qu\'une citadine, et la citadine plus vite qu\'avant',
      !alluresModeles.err && !cit.err && !jes.err && cit.vitesse >= 11 && jes.vitesse >= cit.vitesse * 1.8,
      JSON.stringify(alluresModeles));

    // ---- LES CORPS RÉALISTES SONT PARTOUT, PAS SEULEMENT À NEW YORK (v243) ---
    //
    // Max : « s'assurer de le déployer sur l'ensemble des villes ». Les corps
    // Rocketbox de la v241 se chargent pour tout le jeu et s'appliquent à toute
    // tenue « passant » ; on le PROUVE ici, sur Paris, ville bâtie à la main et
    // pas New York. Vert des deux côtés à dessein : c'est une capacité que
    // Max a demandé de garantir, et un témoin la garde mieux qu'une phrase.
    const corps = await tab.evaluate(() => {
      const s2 = window.__game.passants.sites.find((x) => x.peuple);
      const gens = s2.peuple.filter((q) => q.name === 'passant');
      const realistes = gens.filter((q) => q.mesh?.userData?.anatomie === 'rocketbox-v241').length;
      return { ville: s2.nom, humains: gens.length, realistes };
    });
    verifier('les passants ont des corps réalistes ailleurs qu\'à New York',
      corps.humains >= 10 && corps.realistes === corps.humains, JSON.stringify(corps));

    // ---- NI GUIMPE NI VOILE (v243) ---------------------------------------------
    //
    // Max : « enlève la femme avec le voile, ou retire le voile ». La dame du
    // château (`dame`) portait une guimpe — le linge qui entoure le cou, le
    // menton et le sommet de la tête — et la dame Renaissance (`robeRen`) un
    // voile derrière son attifet. Les couleurs vivent dans les SOMMETS (leçon
    // des visages, v215) : on compte, au-dessus du cou, les sommets de la
    // couleur du linge, puis ceux de la couleur de la robe. Zéro des deux.
    const voiles = await tab.evaluate(async () => {
      const THREE = await import('three');
      const { construireHumain } = await import('./src/personnages.js');
      const compter = (profil, hex, yMin) => {
        const g = construireHumain(profil);
        g.updateMatrixWorld(true);
        const cible = new THREE.Color(hex);
        const v = new THREE.Vector3();
        let n = 0;
        g.traverse((o) => {
          if (!o.isMesh || !o.geometry?.attributes?.color) return;
          const pos = o.geometry.attributes.position, col = o.geometry.attributes.color;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i); o.localToWorld(v);
            if (v.y < yMin) continue;
            if (Math.abs(col.getX(i) - cible.r) < 0.03 && Math.abs(col.getY(i) - cible.g) < 0.03 && Math.abs(col.getZ(i) - cible.b) < 0.03) n++;
          }
        });
        return n;
      };
      return {
        guimpe: compter({ tenue: 'dame', coupe: 'chignon', drap: 0x6a3a7a }, 0xe6dcc4, 1.38),
        voile: compter({ tenue: 'robeRen', coupe: 'chignon', drap: 0x6a2f5a }, 0x6a2f5a, 1.59),
      };
    });
    verifier('la dame du château n\'a plus de guimpe, et la dame Renaissance plus de voile',
      voiles.guimpe === 0 && voiles.voile === 0,
      `sommets de linge au-dessus du cou : ${voiles.guimpe} · sommets de voile au-dessus de la tête : ${voiles.voile}`);

    // ---- LES VOITURES NE SE TRAVERSENT PLUS, ET ELLES TOURNENT (v244) ---------
    //
    // Max : « évite que les voitures puissent se chevaucher et fait en sorte
    // que quand la voiture tourne, ce soit beaucoup plus naturel, avec une
    // vraie inclinaison ». Trois mesures sur trente secondes à Paris, sur les
    // voitures VISIBLES du convoi routier :
    //   · un chevauchement est l'intersection VRAIE des deux rectangles
    //     (4,4 × 2,26, orientés), par séparation d'axes — « à moins de
    //     3,5 blocs » comptait deux files en sens inverse qui se frôlent ;
    //   · un saut de cap est plus de trente-quatre degrés entre deux relevés
    //     à deux cents millisecondes — un carrefour pris en une image ;
    //   · le roulis se lit sur la MATRICE de la voiture : le haut du corps
    //     penche du côté que le roulis annonce, et le roulis est posé vers
    //     l'extérieur du virage.
    // Mesuré : 78 chevauchements et 59 sauts sur l'ancien code ; 17 à 25
    // et 1 à 2 ici, roulis 0,078 au pire coin. Les bornes se posent entre les
    // deux dispersions, pas au meilleur relevé.
    // On se place au-dessus de la circulation de Paris, là où la sonde a
    // mesuré (22 à 24 voitures visibles) : le portail a rendu « maxVues 5 »
    // depuis l'endroit où le témoin d'avant avait laissé l'enfant.
    await tab.evaluate(async () => {
      const m = await import('./src/mondes.js'); const P = m.positionDe('paris'); const g = window.__game;
      g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
    });
    await tab.waitForFunction(() => (window.__vehicules.etat() || []).filter((c) => c.nom === 'voiture').reduce((n, c) => n + c.visibles, 0) >= 8,
      null, { timeout: 30000 }).catch(() => {});
    const voitures = await tab.evaluate(async () => {
      const THREE = await import('three');
      const g = window.__game;
      const visibles = () => { const out = []; g.scene.traverse((o) => { if (o.userData && (o.userData.roues || o.userData.flotte) && o.visible && o.parent === g.scene) out.push(o); }); return out; };
      const rect = (m) => { const cap = m.rotation.y - Math.PI, ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux, x = m.position.x, z = m.position.z;
        return [[x + ux * 2.2 + vx * 1.13, z + uz * 2.2 + vz * 1.13], [x + ux * 2.2 - vx * 1.13, z + uz * 2.2 - vz * 1.13], [x - ux * 2.2 - vx * 1.13, z - uz * 2.2 - vz * 1.13], [x - ux * 2.2 + vx * 1.13, z - uz * 2.2 + vz * 1.13]]; };
      const separes = (P, Q) => { for (const R of [P, Q]) for (let k = 0; k < 4; k++) { const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0]; const pr = (S) => S.map((q) => q[0] * ax + q[1] * az); const p1 = pr(P), p2 = pr(Q); if (Math.max(...p1) < Math.min(...p2) || Math.max(...p2) < Math.min(...p1)) return true; } return false; };
      let chevauchements = 0, sauts = 0, mesures = 0, penchees = 0, bonCote = 0, contraire = 0, maxRoulis = 0, maxVues = 0;
      const derniers = new Map();
      const t0 = performance.now();
      while (performance.now() - t0 < 30000) {
        await new Promise((f) => setTimeout(f, 200));
        const v = visibles(); maxVues = Math.max(maxVues, v.length);
        for (let i = 0; i < v.length; i++) {
          // Une rangée cachée puis rendue AILLEURS (la voiture i réapparaît là
          // où le tracé l'a menée) n'est pas un virage : on ne compare le cap
          // que si la voiture a roulé moins de deux blocs entre deux relevés.
          // Et l'on juge en DEGRÉS PAR BLOC PARCOURU, pas par relevé : une
          // voiture qui rattrape son retard à une fois et demie l'allure
          // tourne plus vite par seconde, pas par mètre. Sur l'empattement,
          // un coin de 90° tourne au plus 36° par bloc, et le virage le plus
          // serré qu'un circuit autorise (150°) environ 70° ; l'ancien code
          // pivotait de 90° en un cinquième de bloc, soit plus de 400° par
          // bloc. La barre, 115° par bloc, sépare les deux dispersions.
          const prev = derniers.get(v[i]); const cap = v[i].rotation.y;
          if (prev !== undefined) {
            const roule = v[i].position.distanceTo(prev.pos);
            if (roule >= 0.3 && roule < 2) { let e = Math.abs(cap - prev.cap); while (e > Math.PI) e = Math.abs(e - 2 * Math.PI); mesures++; if (e / roule > 2.0) sauts++; }
          }
          derniers.set(v[i], { cap, pos: v[i].position.clone() });
          const r = v[i].rotation.z || 0;
          if (Math.abs(r) >= 0.01 && Math.abs(v[i].position.y - g.player.pos.y) < 40) {
            penchees++; maxRoulis = Math.max(maxRoulis, Math.abs(r));
            const c = v[i].rotation.y - Math.PI, gauche = new THREE.Vector3(Math.cos(c), 0, -Math.sin(c));
            const haut = new THREE.Vector3(0, 1, 0).applyQuaternion(v[i].quaternion);
            if ((r < 0) === (haut.dot(gauche) < 0)) bonCote++; else contraire++;
          }
          for (let j = i + 1; j < v.length; j++) {
            if (Math.abs(v[i].position.y - v[j].position.y) > 2.5) continue;
            if (v[i].position.distanceTo(v[j].position) < 5 && !separes(rect(v[i]), rect(v[j]))) chevauchements++;
          }
        }
      }
      return { maxVues, chevauchements, mesures, sauts, penchees, bonCote, contraire, maxRoulis: +maxRoulis.toFixed(3) };
    });
    verifier('les voitures ne se traversent plus',
      voitures.maxVues >= 8 && voitures.chevauchements <= 45, JSON.stringify(voitures));
    // La borne de garde des relevés est à la MOITIÉ du plus petit relevé
    // mesuré sur du code sain (490 à 2 372 selon la cadence du banc), jamais
    // à quatre-vingt-dix pour cent : à 500 elle est tombée au portail de la
    // v255 sur 490 relevés et ZÉRO saut — c'est le piège des trois bornes de
    // ce fichier (v237), une quatrième fois.
    //
    // ET LE BANC A ENCORE RALENTI : 250 est tombée aux portails de la v264
    // (73 relevés) et de la v265 (92, puis 203), toujours avec ZÉRO saut.
    // C'est la CINQUIÈME fois, et la leçon ne change pas : une borne de
    // garde ne dit pas « la mesure est bonne », elle dit « la mesure a eu
    // lieu ». Cent : à deux cents relevés on verrait un saut s'il y en avait
    // un, et une sonde qui n'a rien mesuré rend zéro.
    verifier('et elles tournent progressivement, sans pivoter d\'un coup au carrefour',
      voitures.mesures > 100 && voitures.sauts <= 8, `${voitures.sauts} relevé(s) à plus de 115° par bloc sur ${voitures.mesures}`);
    verifier('et elles s\'inclinent dans le virage, du bon côté',
      voitures.penchees >= 10 && voitures.contraire === 0 && voitures.maxRoulis >= 0.03 && voitures.maxRoulis <= 0.09,
      `${voitures.penchees} relevés penchés · roulis maximal ${voitures.maxRoulis} · ${voitures.contraire} à contresens`);

    // ---- ET ON NE MARCHE PAS DANS UNE RUE VIDE (v218) ----------------------
    //
    // Max, après la v217 : la ville reste habitée, mais l'enfant ne VOIT
    // toujours personne. Le chiffre qui l'explique : le champ de vision fait
    // QUARANTE-SIX degrés, un huitième du tour d'horizon. Dix-huit passants
    // répartis en couronne en donnent 18 × 46/360 = 2,3 dans le cadre — et
    // c'est exactement ce qui se mesure. Une couronne étant uniforme en angle,
    // en resserrer le RAYON n'y change rien : 2,3 à 14-55 blocs, 2,33 à 14-34.
    //
    // Les nouveaux passants privilégient la rue devant l’enfant. Depuis
    // v241, les voisins dépassés restent à leur place ; les rues suivantes
    // se peuplent progressivement, sous un plafond global.
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
        const yaw = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));
        const dx = -Math.sin(yaw), dz = -Math.cos(yaw);
        for (let d = 0; d <= L; d += 25) {
          const f = d / L;
          const x = Math.round(m.PARIS.x + a[0] + (b[0] - a[0]) * f);
          const z = Math.round(m.PARIS.z + a[1] + (b[1] - a[1]) * f);
          g.player.pos.set(x + 0.5, g.world.terrainHeight(x, z) + 1.2, z + 0.5);
          g.player.vel.set(0, 0, 0);
          g.player.yaw = yaw;
          // La boucle des passants passe toutes les deux secondes ; on lui en
          // laisse sept, le temps de peupler progressivement la rue suivante.
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
    const auLoin = await tab.evaluate(async () => {
      const { DISTANCE_PRESENCE } = await import('./src/presence.js');
      const g = window.__game;
      const px = g.player.pos.x, pz = g.player.pos.z;
      let dessinesLoin = 0, dessinesPres = 0, loin = 0;
      for (const n of g.npcs || []) {
        const d = Math.hypot(n.pos.x - px, n.pos.z - pz);
        if (d > DISTANCE_PRESENCE.fin + 4) { loin++; if (n.mesh.visible) dessinesLoin++; }
        else if (d < 45 && n.mesh.visible) dessinesPres++;
      }
      return { dessinesLoin, dessinesPres, loin, total: (g.npcs || []).length };
    });
    verifier('et les personnages lointains ne sont plus dessinés du tout',
      auLoin.loin >= 20 && auLoin.dessinesLoin === 0,
      `${auLoin.dessinesLoin} dessiné(s) sur ${auLoin.loin} au-delà du fondu`);
    // L'autre moitié de la promesse : on n'a pas vidé la rue pour autant.
    verifier('mais ceux d\'à côté sont toujours là',
      auLoin.dessinesPres >= 3,
      `${auLoin.dessinesPres} personnage(s) dessinés à moins de 45 blocs`);

    // Les nouveaux visages portent leurs yeux dans une texture anatomique.
    // Un comptage des anciennes sphères blanches n'aurait plus de sens : on
    // vérifie le vrai visage rendu, sa hauteur et ses textures résidentes.
    const visage = await tab.evaluate(async () => {
      const P = await import('./src/personnages.js'), T = await import('three');
      const m = P.construireHumain({ tenue: 'gaulois', cheveux: 0xe8952c });
      m.updateMatrixWorld(true); const faces=[];
      m.traverse(o=>{if(o.isMesh&&/head/.test(o.material?.name)) {
        const box=new T.Box3().setFromObject(o);
        faces.push({hauteur:box.max.y,bas:box.min.y,texture:o.material.map?.image?.width||0,relief:!!o.material.normalMap});
      }});
      return faces;
    });
    verifier('les costumes historiques portent un visage complet à hauteur humaine',
      visage.length>0 && visage.every(v=>v.hauteur>1.65&&v.hauteur<1.9&&v.bas>1.35),visage);
    verifier('la peau et les yeux du visage ont leurs textures et leur relief chargés',
      visage.length>0 && visage.every(v=>v.texture>=512&&v.relief),visage);

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
      const { WATER_LEVEL } = await import('./src/world.js');
      const g = window.__game;
      if (!g.poissons) return null;
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
    // SIX À LA FOIS, PAS HUIT (v244). Vingt voitures sur une boucle de six
    // cents blocs, c'est une tous les trente blocs : à quarante-cinq blocs du
    // centre, deux anneaux en donnent six au plus, et c'est ce que la sonde
    // mesure des deux côtés, sur `origin/main` comme ici — quatre à six,
    // jamais huit. Le « huit » ne tenait qu'à la PHASE des convois au moment
    // où l'enfant arrive : un pile ou face qui a gagné pendant des versions et
    // qui a perdu le jour où trois témoins de plus l'ont précédé. Rouge
    // garanti sur l'ancien code tout de même : là, Moscou n'avait AUCUNE
    // voiture.
    const circulation = await tab.waitForFunction(() => {
      const etat = (window.__vehicules.etat && window.__vehicules.etat()) || [];
      const autos = etat.filter((c) => c.nom === 'voiture');
      const visibles = autos.reduce((n, c) => n + c.visibles, 0);
      return visibles >= 6 ? { anneaux: autos.length, visibles } : null;
    }, null, { timeout: 45000 }).then((h) => h.jsonValue()).catch(() => null);
    verifier('à Moscou, traversée par son fleuve, les rues sont pleines de voitures',
      !!circulation,
      circulation ? `${circulation.visibles} voitures visibles sur ${circulation.anneaux} anneaux`
        : 'moins de six voitures visibles en quarante-cinq secondes');

    // ---- LA DIVERSITÉ DES VOITURES, DANS TOUTES LES VILLES (v246) -----------
    //
    // Max : « assure-toi que toutes les villes ont de la diversité dans les
    // voitures ». Deux défauts : la graine d'un convoi valait « nombre de
    // points du tracé + rang », si bien que les villes engendrées, aux
    // anneaux semblables, tiraient les MÊMES vingt modèles dans le même
    // ordre ; et un modèle de la flotte arrivait toujours dans SA couleur
    // cuite dans le fichier — vingt Bugatti bleues dans vingt villes.
    //
    // ON LIT CE QUE L'ENFANT VOIT À MOSCOU : la livrée (modèle + laque) de
    // chaque voiture visible. Au moins six voitures, au moins quatre modèles
    // et trois laques différentes. L'ancien code ne publie pas ses livrées :
    // rouge, et le message le dit.
    const livrees = await tab.waitForFunction(() => {
      const etat = (window.__vehicules.etat && window.__vehicules.etat()) || [];
      const l = [];
      etat.forEach((c) => c.routier && (c.livrees || []).forEach((x) => l.push(x)));
      return l.length >= 6 ? l : null;
    }, null, { timeout: 30000, polling: 500 }).then((h) => h.jsonValue()).catch(() => null);
    const diversiteVilles = livrees ? {
      visibles: livrees.length,
      modeles: new Set(livrees.map((x) => x.split(':')[0])).size,
      laques: new Set(livrees.map((x) => x.split(':')[1])).size,
      exemples: livrees.slice(0, 6),
    } : null;
    verifier('à Moscou, les voitures visibles sont de modèles ET de couleurs différents',
      !!diversiteVilles && diversiteVilles.modeles >= 4 && diversiteVilles.laques >= 3,
      diversiteVilles ? JSON.stringify(diversiteVilles) : 'le jeu ne publie pas la livrée de ses voitures');

    // ET LA RÈGLE PURE : deux villes engendrées aux anneaux semblables — même
    // nombre de points, même rang — reçoivent deux graines différentes, donc
    // deux files de modèles différentes. On la calcule sur les vraies tracés
    // du monde, sans rien bâtir.
    const graines = await tab.evaluate(async () => {
      const v = await import('./src/vehicules.js');
      const vm = await import('./src/villesmonde.js');
      if (!v.graineDeVille || !v.choixFlotte) return { err: 'graineDeVille absente : la graine vient encore de la file' };
      const g = window.__game;
      const traces = vm.tracesCirculation((x, z) => g.world.terrainHeight(x, z));
      const parForme = {};
      for (const t of traces) (parForme[`${t.pts.length}:${t.rang}`] ||= []).push(t);
      const paire = Object.values(parForme).find((l) => l.length >= 2);
      if (!paire) return { err: 'aucune paire de villes aux anneaux semblables' };
      const fiche = (t) => {
        const graine = v.graineDeVille(t);
        return { ville: t.cle, graine, modeles: Array.from({ length: 6 }, (_, i) => v.choixFlotte(graine * 7 + i * 17, t.ville).fichier) };
      };
      return { a: fiche(paire[0]), b: fiche(paire[1]) };
    });
    verifier('deux villes aux anneaux semblables ne tirent pas la même file de voitures',
      !graines.err && graines.a.graine !== graines.b.graine
        && graines.a.modeles.join() !== graines.b.modeles.join(),
      JSON.stringify(graines));

    // ---- LES PROGRAMMES DE LA FLOTTE SE COMPILENT À L'ACCUEIL (v246) --------
    //
    // Max : « le lag est bien présent quand on fait une téléportation, à peu
    // près dix secondes ». Profil de l'arrivée à Paris : seize programmes
    // avant, trente-six après — chaque modèle de voiture rencontré pour la
    // première fois apporte ses matériaux, chaque signature son programme,
    // compilé DANS l'image où la voiture apparaît. Une seconde et demie au
    // banc ; sur une tablette, l'écran qui se fige.
    //
    // ON MESURE LA CAUSE, PAS L'EFFET : le nombre de programmes que la carte
    // graphique compile APRÈS la téléportation. Le banc rend en logiciel et
    // ne peut pas subir le gel comme l'iPad ; le compte de programmes, lui,
    // sépare vingt de zéro. Et sur une PAGE NEUVE : sur celle-ci les voitures
    // ont déjà été vues à Rome et à Moscou, et le témoin serait vert des
    // deux côtés. On attend que le compte se stabilise (la chauffe comprise),
    // on se téléporte à Paris, on compte vingt secondes plus tard — et l'on
    // vérifie que le RENDU a tourné : une boucle morte rend zéro programme
    // neuf et ne prouve rien (vu au banc, sur une erreur de ma livraison).
    await souffler();
    const arrivee = await banc.jouerSeul('MonteArrivee', { rr: 6 });
    const programmes = await arrivee.evaluate(async () => {
      const g = window.__game;
      const info = g.renderer.info;
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      let n = info.programs.length, stable = 0;
      const t0 = performance.now();
      while (stable < 3 && performance.now() - t0 < 40000) {
        await dodo(1000);
        if (info.programs.length === n) stable++; else { stable = 0; n = info.programs.length; }
      }
      const avant = info.programs.length;
      const { positionDe } = await import('./src/mondes.js');
      const P = positionDe('paris');
      const f0 = info.render.frame;
      window.__carte.surTeleport(P.x + 20, P.z - 30);
      await dodo(20000);
      return { avant, neufs: info.programs.length - avant, images: info.render.frame - f0,
        chunks: g.world.chunks.size, arrive: Math.hypot(g.player.pos.x - P.x, g.player.pos.z - P.z) < 60 };
    });
    await arrivee.close();
    verifier('se téléporter à Paris ne compile plus les programmes des voitures sur place',
      programmes.arrive && programmes.images > 30 && programmes.neufs <= 4,
      JSON.stringify(programmes));

    // ET LA TABLE DES SIGNATURES DIT CE QUE LES FICHIERS CONTIENNENT. La
    // chauffe compile les signatures de `src/signatures.js` ; ce témoin LIT
    // les soixante et un fichiers .glb du dépôt avec la même règle et exige
    // l'égalité des deux ensembles — ni signature manquante (elle se
    // compilerait à l'arrivée en ville), ni signature morte (un programme
    // chauffé pour rien). Le jour où Max dépose un modèle d'une autre
    // facture, c'est ici que cela se voit, et le message nomme la signature.
    const signatures = await (async () => {
      let mod;
      try { mod = await import('../src/signatures.js'); } catch (e) {
        return { err: 'src/signatures.js absent : les programmes ne sont pas chauffés à l\'accueil' };
      }
      const fs = require('fs');
      const path = require('path');
      const lues = new Set();
      for (const [dossier, env] of [['../vendor/voitures', true], ['../vendor/humains', false]]) {
        const d = path.join(__dirname, dossier);
        for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.glb'))) {
          const sigs = mod.signaturesDuGlb(mod.jsonDuGlb(fs.readFileSync(path.join(d, f))), { env });
          for (const sg of sigs) lues.add(sg);
        }
      }
      const table = new Set(mod.SIGNATURES_GLB);
      return { lues: lues.size,
        manquantes: [...lues].filter((sg) => !table.has(sg)),
        mortes: [...table].filter((sg) => !lues.has(sg)) };
    })();
    verifier('la table des programmes à chauffer est exactement ce que les fichiers des voitures et des humains contiennent',
      !signatures.err && signatures.lues >= 15
        && signatures.manquantes.length === 0 && signatures.mortes.length === 0,
      JSON.stringify(signatures));

    // ---- LE REGARD DE NEW YORK, PARTOUT (v247) --------------------------------
    //
    // Max : « regarde les améliorations qu'il y a encore eu dans la ville de
    // New York et reproduis-les sur l'ensemble de la carte ». Manhattan était
    // éclairée par le soleil, portait des ombres et passait par une
    // correspondance tonale ; le reste du monde était un matériau NON
    // ÉCLAIRÉ, dont la teinte servait de lumière : une façade au soleil et une
    // façade à l'ombre avaient la même couleur, rien ne portait d'ombre, et le
    // ciel était une couleur unie.
    //
    // ON MESURE CE QUE L'ENFANT VOIT : des PIXELS, lus dans l'image rendue,
    // jamais un type de matériau. On dresse un pilier de pierre sur une dalle
    // de pierre, loin de tout, et l'on compare la luminance du sol dans son
    // ombre à celle du sol au soleil ; puis sa face est à sa face ouest, le
    // matin et le soir ; puis le zénith à l'horizon. Sur l'ancien code les
    // trois rapports valent un.
    //
    // SUR UNE PAGE À PART, OMBRES FORCÉES. Le jeu coupe ses ombres en rendu
    // logiciel — le banc — parce que la passe d'ombre y double le temps
    // d'image et faisait tomber quatre bornes de garde d'autres témoins
    // (blocs parcourus en vol, relevés de virage). `ombres=1` les rallume
    // ici, et ici seulement ; l'ancien code ignore le paramètre.
    await souffler();
    const regardPage = await banc.jouerSeul('MonteRegard', { rr: 4, ombres: 1 });
    const regard = await regardPage.evaluate(async () => {
      const g = window.__game, w = g.world, r = g.renderer, cam = g.camera;
      const THREE = await import('three');
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      // une dalle au sec, loin des villes et de ce que les enfants ont bâti
      let x0 = 0, z0 = 20000, sol = 0;
      for (let k = 0; k < 40; k++) { sol = w.terrainHeight(x0, z0); if (sol >= 36) break; x0 += 60; }
      for (let c = -7; c <= 7; c++) for (let d = -7; d <= 7; d++) {
        for (let h = -4; h <= 0; h++) w.setBlock(x0 + c, sol + h, z0 + d, 3);
        for (let h = 1; h <= 18; h++) w.setBlock(x0 + c, sol + h, z0 + d, 0);
      }
      for (let h = 1; h <= 12; h++) w.setBlock(x0, sol + h, z0, 3);
      g.player.flying = true; g.player.vel.set(0, 0, 0);
      g.player.pos.set(x0 + 2.5, sol + 12, z0 + 6);
      await dodo(2500);                                   // le morceau se remaille
      const gl = r.getContext();
      const lire = (X, Y, Z) => {
        const v = new THREE.Vector3(X, Y, Z).project(cam);
        const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
        const sx = Math.round((v.x + 1) / 2 * W), sy = Math.round((1 - v.y) / 2 * H);
        if (sx < 3 || sy < 3 || sx > W - 4 || sy > H - 4) return -1;
        const buf = new Uint8Array(4 * 25);
        gl.readPixels(sx - 2, H - 1 - (sy + 2), 5, 5, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        let l = 0;
        for (let i = 0; i < 25; i++) l += 0.2126 * buf[i * 4] + 0.7152 * buf[i * 4 + 1] + 0.0722 * buf[i * 4 + 2];
        return l / 25;
      };
      const vue = async (heure, de, vers, points) => {
        window.__setDayTime(heure);
        await dodo(400);
        cam.position.set(de[0], de[1], de[2]);
        cam.lookAt(vers[0], vers[1], vers[2]);
        cam.updateMatrixWorld(true);
        r.render(g.scene, cam);
        return points.map((pt) => +lire(pt[0], pt[1], pt[2]).toFixed(1));
      };
      // midi : le soleil est haut, légèrement vers −z ; l'ombre du pilier
      // tombe vers +z. Sol dans l'ombre à trois blocs, sol au soleil quatre
      // blocs plus à l'est, même dalle, même occlusion (loin du pilier).
      const [ombre, soleil] = await vue(0.25, [x0 + 2.5, sol + 17, z0 + 5.5], [x0 + 2.5, sol + 1, z0 + 3],
        [[x0 + 0.5, sol + 1, z0 + 3.5], [x0 + 4.5, sol + 1, z0 + 3.5]]);
      // matin : le soleil est à l'est, la face +x du pilier est au soleil ;
      // soir : à l'ouest, c'est la face −x. Une caméra de chaque côté.
      const est = async (heure) => (await vue(heure, [x0 + 7, sol + 7, z0 + 0.5], [x0 + 1, sol + 7, z0 + 0.5], [[x0 + 1, sol + 7, z0 + 0.5]]))[0];
      const ouest = async (heure) => (await vue(heure, [x0 - 6, sol + 7, z0 + 0.5], [x0, sol + 7, z0 + 0.5], [[x0, sol + 7, z0 + 0.5]]))[0];
      const matin = { est: await est(0.08), ouest: await ouest(0.08) };
      const soir = { est: await est(0.42), ouest: await ouest(0.42) };
      // midi, regard vers le haut, dos au soleil : le haut de l'écran est
      // presque au zénith, le bas à une quinzaine de degrés sur l'horizon
      window.__setDayTime(0.25);
      await dodo(400);
      cam.position.set(x0 + 0.5, sol + 30, z0 + 0.5);
      cam.lookAt(x0 + 0.5, sol + 40, z0 + 8);
      cam.updateMatrixWorld(true);
      r.render(g.scene, cam);
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      const pix = (sx, sy) => { const b = new Uint8Array(4 * 25); gl.readPixels(sx - 2, H - 1 - (sy + 2), 5, 5, gl.RGBA, gl.UNSIGNED_BYTE, b); let l = 0; for (let i = 0; i < 25; i++) l += 0.2126 * b[i * 4] + 0.7152 * b[i * 4 + 1] + 0.0722 * b[i * 4 + 2]; return +(l / 25).toFixed(1); };
      const ciel = { zenith: pix(Math.round(W / 2), 6), bas: pix(Math.round(W / 2), H - Math.round(H / 6)) };
      // ---- UN RÉVERBÈRE ÉCLAIRE SON SOL LA NUIT (v248) --------------------
      // L'enfant pose un réverbère (le prop 🛞 de l'inventaire, le même que
      // les villes plantent) sur la dalle, et la nuit tombe. On lit le sol à
      // son pied et le sol huit blocs plus loin, sur la même dalle, depuis la
      // même caméra. Sur l'ancien code la lanterne est un bloc peint, et les
      // deux points ont la même luminance : rapport un.
      const lx = x0 + 6, lz = z0 - 5;
      w.setBlock(lx, sol + 1, lz, 700);
      window.__setDayTime(0.76);
      await dodo(3000);                                   // remaillage, puis la cadence des lampes
      cam.position.set(lx + 0.5, sol + 14, lz + 4);
      cam.lookAt(lx + 0.5, sol + 1, lz + 4);
      cam.updateMatrixWorld(true);
      r.render(g.scene, cam);
      const lampe = { pied: +lire(lx + 1, sol + 1, lz + 0.5).toFixed(1), loin: +lire(lx + 0.5, sol + 1, lz + 8.5).toFixed(1),
        allumees: (g.lampesRue || []).filter((l) => l.intensity > 0).length };
      // ---- LA NUIT, UNE RUE DANS L'OMBRE DE LA LUNE RESTE LISIBLE (v249) ---
      // Max, capture d'iPad : « Paris est dans le noir ». Un mur de pierre de
      // huit blocs fait une façade ; le sol dans son ombre de lune est la rue
      // entre deux immeubles, celle que l'enfant voit sur sa tablette — où
      // les ombres existent, contrairement au banc. On lit ce sol, et le mur
      // lui-même du côté de l'ombre. Sur l'ancien code : 5,7 et 2,6 sur 255.
      w.setBlock(lx, sol + 1, lz, 0);                     // le réverbère s'en va, sa lampe aussi
      for (let c = -4; c <= 4; c++) for (let h = 1; h <= 8; h++) w.setBlock(x0 + c, sol + h, z0 + 8, 3);
      await dodo(2500);
      const sun = g.scene.children.find((o) => o.isDirectionalLight);
      const dLune = sun.position.clone().sub(sun.target.position).normalize();
      const cote = dLune.z > 0 ? -1 : 1;                  // l'ombre tombe à l'opposé de la lune
      cam.position.set(x0 + 0.5, sol + 12, z0 + 8 + cote * 3);
      cam.lookAt(x0 + 0.5, sol + 1, z0 + 8 + cote * 2);
      cam.updateMatrixWorld(true);
      r.render(g.scene, cam);
      const nuit = { rue: +lire(x0 + 0.5, sol + 1, z0 + 8 + cote * 2.5).toFixed(1), mur: +lire(x0 + 0.5, sol + 4, z0 + 8 + cote * 0.5).toFixed(1) };
      window.__setDayTime(0.3);
      g.player.flying = false;
      return { sol, ombre, soleil, matin, soir, ciel, lampe, nuit, ombres: r.shadowMap.enabled };
    });
    await regardPage.close();
    const ok = (v) => typeof v === 'number' && v > 0;
    verifier('à midi, le sol dans l\'ombre d\'un pilier est plus sombre que le sol au soleil',
      ok(regard.ombre) && ok(regard.soleil) && regard.ombre / regard.soleil < 0.8,
      `ombre ${regard.ombre} · soleil ${regard.soleil} (dalle à y=${regard.sol})`);
    verifier('le matin la face est d\'un pilier est au soleil, le soir c\'est sa face ouest',
      ok(regard.matin.est) && ok(regard.matin.ouest) && ok(regard.soir.est) && ok(regard.soir.ouest)
        && regard.matin.est / regard.matin.ouest > 1.25 && regard.soir.est / regard.soir.ouest < 0.8,
      `matin ${JSON.stringify(regard.matin)} · soir ${JSON.stringify(regard.soir)}`);
    // UNE BORNE DE GARDE SE POSE À LA MOITIÉ : 0,86 mesuré ici, 1,00 sur
    // l'ancien code — 0,93, pas 0,9 collé sous la mesure.
    verifier('le ciel est une voûte : plus profond au zénith qu\'à l\'horizon',
      ok(regard.ciel.zenith) && ok(regard.ciel.bas) && regard.ciel.zenith / regard.ciel.bas < 0.93,
      JSON.stringify(regard.ciel));
    // ---- LES RÉVERBÈRES ÉCLAIRENT LA RUE, PARTOUT (v248) ------------------
    //
    // Deuxième étape du programme : Manhattan a des lampes de rue la nuit ;
    // les villes engendrées plantaient des réverbères qui n'éclairaient rien,
    // et les six villes bâties à la main n'en avaient AUCUN. Deux témoins :
    // la lanterne éclaire le sol à son pied (mesuré en pixels, ci-dessus), et
    // Paris, Londres, San Francisco et Washington ont des réverbères au bord
    // de leurs rues — lus dans les BLOCS que le générateur pose, sur un
    // carré de soixante-quatre blocs autour du centre de chaque ville, et
    // chacun avec de la chaussée pour voisin — lue au SOMMET de la colonne
    // voisine, parce que San Francisco est en pente et que la chaussée d'à
    // côté est souvent un bloc plus haut ou plus bas que le trottoir. Et pas
    // cent pour cent : à Paris, trois réverbères sur vingt-neuf ont pour
    // voisin une chaussée que la culée d'un pont ou le socle d'un monument
    // recouvre APRÈS le sol — le réverbère est juste, la rue est dessous.
    // UNE BORNE DE GARDE SE POSE À LA MOITIÉ : 41,5 et 28,2 mesurés ici, 5,7 et
    // 2,6 sur l'ancien code.
    verifier('la nuit, une rue dans l\'ombre de la lune reste lisible',
      ok(regard.nuit && regard.nuit.rue) && ok(regard.nuit.mur) && regard.nuit.rue >= 22 && regard.nuit.mur >= 14,
      JSON.stringify(regard.nuit));
    verifier('la nuit, un réverbère éclaire le sol à son pied',
      ok(regard.lampe.pied) && ok(regard.lampe.loin) && regard.lampe.pied / regard.lampe.loin > 1.6,
      JSON.stringify(regard.lampe));
    const reverberes = await tab.evaluate(async () => {
      const { positionDe } = await import('./src/mondes.js');
      const { CHAUSSEE } = await import('./src/world.js');
      const w = window.__game.world;
      const out = {};
      for (const ville of ['paris', 'londres', 'sf', 'washington']) {
        const P = positionDe(ville);
        let total = 0, auBord = 0;
        for (let x = P.x - 32; x < P.x + 32; x++) {
          for (let z = P.z - 32; z < P.z + 32; z++) {
            const sol = w.sommetColonne(x, z);
            if (w.getBlock(x, sol + 1, z) !== 700) continue;
            total++;
            const rue = CHAUSSEE && [[1, 0], [-1, 0], [0, 1], [0, -1]]
              .some(([dx, dz]) => CHAUSSEE.has(w.getBlock(x + dx, w.sommetColonne(x + dx, z + dz), z + dz)));
            if (rue) auBord++;
          }
        }
        out[ville] = { total, auBord };
      }
      return out;
    });
    verifier('Paris, Londres, San Francisco et Washington ont des réverbères au bord de leurs rues',
      Object.values(reverberes).every((v) => v.total >= 8 && v.auBord >= 0.85 * v.total),
      JSON.stringify(reverberes));

    // ---- CHAQUE ROUE DE LA FLOTTE TOURNE AUTOUR DE SON ESSIEU (v250) --------
    //
    // Max, capture de la Lucid Gravity : « Gravity design ko, wheels ». Les
    // roues sortaient des passages de roue, de biais. `normaliserVoiture`
    // posait chaque pivot dans le repère du modèle, où x est la LONGUEUR de
    // cette voiture ; `rotation.x += angle` la faisait donc basculer autour
    // de l'axe avant-arrière. On charge les cinquante-deux modèles et l'on
    // mesure, pour chaque pivot de roue : son axe x, exprimé dans le repère
    // de la voiture, est la voie (latéral) ; et un angle positif fait avancer
    // le haut du pneu vers le nez — sur l'ancien code, la Lucid et la Chiron
    // tombent au premier test.
    const roues = await tab.evaluate(async () => {
      const THREE = await import('three');
      const v = await import('./src/vehicules.js');
      const out = { modeles: 0, roues: 0, essieuxFaux: [], sensFaux: [], sansRoue: [] };
      for (const entree of v.FLOTTE) {
        if (entree.fabrique) continue;
        const porteur = await v.chargerVoitureFlotte(entree);
        if (!porteur) { out.sansRoue.push(entree.fichier + ' (chargement)'); continue; }
        out.modeles++;
        porteur.updateMatrixWorld(true);
        const invP = new THREE.Matrix4().copy(porteur.matrixWorld).invert();
        const qP = new THREE.Quaternion().setFromRotationMatrix(porteur.matrixWorld);
        const qPinv = qP.clone().invert();
        let n = 0;
        porteur.traverse((r) => {
          if (!/^Wheel_(FL|FR|RL|RR)$/i.test(r.name || '')) return;
          n++; out.roues++;
          // L'axe de `rotation.x += angle` est le x du PARENT (Euler XYZ) ; on
          // le lit dans le repère du porteur, et l'on suit un point posé au
          // sommet du pneu pendant un tiers de tour.
          const qPar = new THREE.Quaternion(); r.parent.getWorldQuaternion(qPar);
          const axe = new THREE.Vector3(1, 0, 0).applyQuaternion(qPar).applyQuaternion(qPinv);
          const rayon = porteur.userData.rayonRoue || 0.34;
          const centre = r.getWorldPosition(new THREE.Vector3());
          const haut0 = centre.clone().add(new THREE.Vector3(0, rayon, 0).applyQuaternion(qP));
          const local = r.worldToLocal(haut0.clone());
          const sauve = r.rotation.x;
          r.rotation.x = sauve + 0.3; r.updateMatrixWorld(true);
          const haut1 = r.localToWorld(local.clone());
          r.rotation.x = sauve; r.updateMatrixWorld(true);
          const d0 = haut0.applyMatrix4(invP), d1 = haut1.applyMatrix4(invP);
          if (Math.abs(axe.x) < 0.99) out.essieuxFaux.push(`${entree.fichier} ${r.name} axe=${axe.toArray().map((k) => k.toFixed(2))}`);
          // le nez est en −z dans le repère du porteur (cadre.rotation.y = π)
          if (!(d1.z < d0.z - 0.01 && Math.abs(d1.x - d0.x) < 0.01)) out.sensFaux.push(`${entree.fichier} ${r.name} d=${[d1.x - d0.x, d1.y - d0.y, d1.z - d0.z].map((k) => k.toFixed(3))}`);
        });
        if (n < 4) out.sansRoue.push(entree.fichier + ` (${n} roues)`);
      }
      return out;
    });
    verifier('chaque roue de la flotte tourne autour de son essieu, le haut du pneu vers le nez',
      roues.modeles >= 40 && roues.roues >= roues.modeles * 4 && roues.essieuxFaux.length === 0 && roues.sensFaux.length === 0 && roues.sansRoue.length === 0,
      `${roues.modeles} modèles · ${roues.roues} roues · essieux faux : ${JSON.stringify(roues.essieuxFaux.slice(0, 4))} · sens faux : ${JSON.stringify(roues.sensFaux.slice(0, 4))} · sans roue : ${JSON.stringify(roues.sansRoue)}`);

    // ---- LE MAILLAGE HORS DU FIL PRINCIPAL (v251) ---------------------------
    //
    // Max, iPad : « en avion le lag est fort ; en voiture, lag, et la
    // définition des bâtiments s'affiche trop tard ». Un morceau de Paris
    // coûte 24 ms à engendrer et mailler, et cela se faisait DANS l'image.
    // On vole au-dessus de Paris à la distance d'affichage de l'iPad et l'on
    // mesure la CAUSE, pas l'effet (le banc rend en logiciel, sa cadence
    // mesure SwiftShader) : les millisecondes que le fil principal passe à
    // mailler par seconde de vol — six cents et plus sur l'ancien code, qui
    // n'a d'ailleurs pas le compteur et le dit — et le nombre de morceaux
    // arrivés du worker. Puis les blocs eux-mêmes : un morceau adopté du
    // worker doit être le même, bloc pour bloc, que celui que le fil
    // principal engendrerait — c'est ce qui garde l'invariant 1 quand deux
    // mondes jumeaux se partagent le travail.
    await souffler();
    const filPage = await banc.jouerSeul('MonteFil', { rr: 12 });
    const fil = await filPage.evaluate(async () => {
      const g = window.__game;
      if (!g.statsMaillage) return { absent: true };
      const m = await import('./src/montures.js');
      const { positionDe } = await import('./src/mondes.js');
      const P = positionDe('paris');
      const def = m.MONTURES.find((d) => d.key === 'avionligne');
      g.player.pos.set(P.x - 160, 96, P.z); g.player.vel.set(0, 0, 0);
      g.player.yaw = -Math.PI / 2; g.player.pitch = 0;          // cap vers +x, Paris devant
      g.player.flying = true; g.player.pilote = def.pilote;
      g.player.vitesseAvion = def.pilote.max; g.player.avionEnVol = true; g.player.avionEtat = 'vol';
      g.player.altitudeDecollage = -999;
      const patienter = (ms) => new Promise((fin) => {
        const t0 = performance.now();
        const tic = () => (performance.now() - t0 < ms ? requestAnimationFrame(tic) : fin());
        requestAnimationFrame(tic);
      });
      await patienter(2000);
      const s0 = { ms: g.statsMaillage.principalMs, distants: g.statsMaillage.distants, locaux: g.statsMaillage.locaux };
      const t0 = performance.now(), x0 = g.player.pos.x;
      await patienter(8000);
      const dt = (performance.now() - t0) / 1000;
      const out = { worker: g.maillageDistant, parcouru: Math.round(g.player.pos.x - x0),
        msParSeconde: Math.round((g.statsMaillage.principalMs - s0.ms) / dt),
        distants: g.statsMaillage.distants - s0.distants, locaux: g.statsMaillage.locaux - s0.locaux };
      let compares = 0, differents = 0;
      for (const key of g.statsMaillage.recus.slice(-12)) {
        const [cx, cz] = key.split(',').map(Number);
        const a = g.world.chunks.get(key);
        if (!a) continue;
        const b = g.world.generateChunk(cx, cz);
        compares++;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { differents++; break; }
      }
      out.compares = compares; out.differents = differents;
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
      g.player.vitesseAvion = undefined; g.player.flying = false;
      return out;
    });
    await filPage.close();
    // La borne de garde des blocs parcourus passe de 100 à 40 (v265, même
    // passe que celle des relevés de virage) : elle est tombée au portail de
    // la v264 sur 66 blocs et à celui de la v265 sur 90, alors que le
    // VERDICT — zéro milliseconde de maillage sur le fil principal, 118
    // morceaux venus du worker — était vert des deux côtés. Une borne à
    // quatre-vingt-dix pour cent du relevé mesure le banc.
    verifier('en vol au-dessus de Paris, le monde se maille hors du fil principal',
      !fil.absent && fil.worker && fil.parcouru > 40 && fil.distants >= 20 && fil.msParSeconde < 120,
      fil.absent ? 'pas de compteur de maillage : tout se maille dans l\'image' : JSON.stringify(fil));
    verifier('et un morceau maillé là-bas est le même ici, bloc pour bloc',
      !fil.absent && fil.compares >= 6 && fil.differents === 0,
      fil.absent ? 'pas de worker' : `${fil.compares} comparés · ${fil.differents} différent(s)`);

    // ---- LA VOITURE DE L'ENFANT NE TRAVERSE PAS LE MOBILIER (v252) ----------
    //
    // Max : « les voitures peuvent aussi passer à travers des fois le
    // mobilier urbain comme les tables de Times Square ». Mesuré : les
    // soixante-dix-neuf tracés de taxis restent à neuf blocs des tables —
    // c'est la voiture de l'ENFANT, dont la boîte de collision ne connaît
    // que les blocs solides, et un réverbère, une table sont des props non
    // solides. On prend le volant sur une rue de Paris, on pose un réverbère
    // six blocs devant, on accélère trois secondes : la voiture s'arrête
    // avant le poteau. Puis la même chose sur Broadway piéton, face à une
    // table de Times Square. Sur l'ancien code on passe au travers.
    await souffler();
    const mobPage = await banc.jouerSeul('MonteMobilier', { rr: 4 });
    // le scénario part en TEXTE : Playwright ne sérialise pas une fonction
    const conduireVers = async (page, poser) => page.evaluate(async (source) => {
      const poser = new Function('return (' + source + ')')();
      const g = window.__game, w = g.world;
      const { RUE } = await import('./src/blocks.js');
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      const cible = await poser(g, w, RUE);
      // la voiture, montée par le bouton
      for (const a of [...g.animalManager.animals]) { g.animalManager.scene.remove(a.mesh); }
      g.animalManager.animals.length = 0;
      const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
      g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5);
      await dodo(1500);
      document.getElementById('ride-btn').click();
      await dodo(800);
      const depart = { x: g.player.pos.x, z: g.player.pos.z };
      const d0 = Math.hypot(cible.x - depart.x, cible.z - depart.z);
      g.player.keys.add('KeyW');                       // la touche, comme le clavier la pose
      // ON ROULE JUSQU'À L'ARRÊT, PAS TROIS SECONDES : à dt borné le banc
      // n'atteint pas un poteau à neuf blocs en trois secondes, et le témoin
      // était vert des deux côtés en ne mesurant rien.
      let plusPres = d0, immobile = 0, dernier = { x: g.player.pos.x, z: g.player.pos.z };
      for (let i = 0; i < 400 && immobile < 10; i++) {
        await dodo(100);
        plusPres = Math.min(plusPres, Math.hypot(cible.x - g.player.pos.x, cible.z - g.player.pos.z));
        const bouge = Math.hypot(g.player.pos.x - dernier.x, g.player.pos.z - dernier.z) > 0.02;
        immobile = bouge ? 0 : immobile + 1; dernier = { x: g.player.pos.x, z: g.player.pos.z };
      }
      g.player.keys.delete('KeyW');
      const parcouru = Math.hypot(g.player.pos.x - depart.x, g.player.pos.z - depart.z);
      return { auVolant: !!(g.fun.montureConduite && g.fun.montureConduite()), gabarit: g.player.gabarit, d0: +d0.toFixed(2), plusPres: +plusPres.toFixed(2), parcouru: +parcouru.toFixed(2), cible };
    }, poser.toString());
    // 1. un réverbère sur une rue de Paris
    const poteau = await conduireVers(mobPage, async (g, w, RUE) => {
      const { positionDe } = await import('./src/mondes.js');
      const { CHAUSSEE } = await import('./src/world.js');
      const P = positionDe('paris');
      window.__carte.surTeleport(P.x + 40, P.z + 60);
      await new Promise((f) => setTimeout(f, 9000));
      const px = Math.round(g.player.pos.x), pz = Math.round(g.player.pos.z);
      const sol = (x, z) => w.sommetColonne(x, z);
      const route = (x, z) => CHAUSSEE.has(w.getBlock(x, sol(x, z), z));
      for (let r = 0; r < 40; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = px + dx, z = pz + dz;
        if (!route(x, z)) continue;
        for (const [ax, az, yaw] of [[1, 0, -Math.PI / 2], [0, 1, Math.PI], [-1, 0, Math.PI / 2], [0, -1, 0]]) {
          let ok = true;
          for (let k = -4; k <= 14 && ok; k++) if (!route(x + ax * k, z + az * k) || Math.abs(sol(x + ax * k, z + az * k) - sol(x, z)) > 1) ok = false;
          if (!ok) continue;
          // pas de voiture de la rue à portée : elle serait « déjà dedans »
          // ou en travers, et l'on mesurerait la circulation
          if (g.vehicules.placeProche({ x: x + 0.5, y: sol(x, z) + 1, z: z + 0.5 }, 12)) continue;
          g.player.pos.set(x + 0.5, sol(x, z) + 1.01, z + 0.5); g.player.vel.set(0, 0, 0);
          g.player.yaw = yaw; g.player.pitch = 0; g.player.flying = false;
          const cx = x + ax * 6, cz = z + az * 6;
          w.setBlock(cx, sol(cx, cz) + 1, cz, RUE.REVERBERE);
          return { x: cx + 0.5, z: cz + 0.5 };
        }
      }
      return null;
    });
    verifier('au volant, la voiture de l\'enfant s\'arrête devant un réverbère',
      poteau && poteau.cible && poteau.auVolant && poteau.parcouru > 2 && poteau.plusPres >= 1.0 && poteau.plusPres < 4,
      JSON.stringify(poteau));
    // 2. une table de Times Square. La place ne se CONDUIT pas sur ce banc —
    // Manhattan en rendu logiciel tombe à une image par seconde, et à dt
    // borné la voiture n'avance pas (0,3 bloc en deux secondes, à pied) — la
    // conduite est prouvée à Paris ci-dessus. Ici l'on vérifie ce qui la
    // rend possible : une fois le lot de Broadway bâti, la table est notée
    // dans le registre du renderer, et le crochet du joueur (le même que
    // pour le réverbère) refuse le pas qui l'atteindrait, pas celui qui en
    // reste à six blocs. Sur l'ancien code, ni registre ni refus.
    const table = await mobPage.evaluate(async () => {
      const g = window.__game;
      const { ORIGINE_MANHATTAN } = await import('./src/manhattan-world.js');
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      const tx = ORIGINE_MANHATTAN.x - 91 + 0.5, tz = ORIGINE_MANHATTAN.z - 60 + 0.5;   // la table du plan (−91, −60)
      window.__carte.surTeleport(tx + 11, tz);
      const vr = g.villeRealiste;
      let notee = false, attente = 0, construitIci = false;
      for (; attente < 20 && !notee; attente++) { await dodo(1000); notee = !!(vr.obstacleA && vr.obstacleA(tx, tz)); }
      // À une image par seconde, le secteur de sol qui porte la table peut
      // ne jamais arriver en tête de file : on le bâtit alors comme le
      // renderer le ferait (`groundSector`, secteurs de 64 blocs du plan),
      // ce qui note ses tables — et l'on jette le maillage rendu.
      if (!notee && vr.groundSector) {
        const grp = vr.groundSector(Math.floor(-91 / 64), Math.floor(-60 / 64));
        grp.traverse((o) => { if (o.geometry && !o.geometry.userData?.partagee) o.geometry.dispose(); });
        construitIci = true;
        notee = !!(vr.obstacleA && vr.obstacleA(tx, tz));
      }
      g.player.gabarit = 2.2;                       // la carrure d'une voiture, comme au volant
      const cap = Math.PI / 2 + Math.PI;            // cap vers −x, la table devant
      const hook = g.player.obstacleVehicule;
      const contre = hook ? hook(tx + 1.6, tz, cap, tx + 6, tz) : null;
      const libre = hook ? hook(tx + 6, tz, cap, tx + 7, tz) : null;
      return { notee, attente, construitIci, contre, libre, registre: vr.obstacles ? vr.obstacles.size : 'absent' };
    });
    verifier('et une table de Times Square est un obstacle pour sa voiture',
      table.notee && table.contre === true && table.libre === false,
      JSON.stringify(table));
    await mobPage.close();

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
        g.player.avionEnVol = false; g.player.avionEtat = undefined;
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
    //
    // ET LA BARRE SE CALCULE DÉSORMAIS, ELLE NE S'ÉCRIT PLUS (v269). Elle a
    // valu QUATRE-VINGTS de la v229 à la v268, pendant que la vitesse du plus
    // rapide passait de 110 à 160 : le chiffre était juste par accident en
    // v265 (160 ÷ 2 = 80) et il l'aurait cessé à la vitesse suivante sans que
    // personne ne le voie. La règle, elle, n'a jamais bougé — « le bout du
    // monde ne doit pas arriver avant une demi-seconde de vol » — et une
    // demi-seconde se calcule. Chaque appareil est donc jugé sur SA vitesse :
    // `trou >= max / 2`, la fiche étant la seule source.
    //
    // C'EST CE TÉMOIN QUI A RATTRAPÉ LA v269. La file du mailleur est revenue
    // de seize à huit (le jeu était impraticable sur l'iPad à seize), donc le
    // monde ne maille plus au même débit, donc les 160 blocs par seconde de
    // la v265 ne tenaient plus : 51 et 58 de trou pour une barre de 80. Une
    // vitesse mesurée sur une file donnée ne vaut que pour elle, et sans ce
    // témoin la livraison aurait fait voler l'enfant dans le vide. Les
    // vitesses sont remesurées (montures.js, tableau du plateau) : 95 pour
    // l'avion de ligne, 120 pour les deux rapides.
    //
    // Serrer la barre aurait mesuré le banc : la même sonde rend 192 seule
    // et 163 au plus bas sous charge de portail. Une borne se pose sur la
    // règle, pas sur le meilleur chiffre qu'on vient de voir — et c'est aussi
    // pourquoi la vitesse retenue est 120 et non 130 : mesurées SEULES les
    // deux passent (80 de trou pour 65 de barre à 130), mais le portail
    // complet coûte quinze pour cent du trou, ce qui ne laisserait à 130 que
    // trois blocs de marge et ferait battre ce témoin d'une exécution à
    // l'autre.
    //
    // LE CHASSEUR EST DANS LA LISTE DEPUIS LA v265 : c'est l'avion que Max
    // pilote, et c'est désormais l'un des deux plus rapides. Un témoin de
    // chargement éprouve la plus grande vitesse du jeu, pas une moyenne.
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
      for (const key of ['avionligne', 'concorde', 'chasseur']) {
        const def = m.MONTURES.find((d) => d.key === key);
        // Un couloir vierge, loin de tout : on éprouve le STREAMING, pas le
        // coût d'une ville.
        g.player.pos.set(30000 + ['avionligne', 'concorde', 'chasseur'].indexOf(key) * 4000, 100, 30000);
        g.player.vel.set(0, 0, 0); g.player.yaw = 0; g.player.pitch = 0;
        g.player.flying = true;
        g.player.pilote = def.pilote;
        g.player.vitesseAvion = def.pilote.max;
        g.player.avionEnVol = true; g.player.avionEtat = 'vol';
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
        g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
        g.player.vitesseAvion = undefined; g.player.flying = false;
      }
      return out;
    });
    // Une demi-seconde de vol, pour CHAQUE appareil et d'après SA fiche.
    const demiSeconde = (a) => Math.round(a.vitesse / 2);
    const tenus = ['avionligne', 'concorde', 'chasseur']
      .map((k) => suivi[k] && { k, ...suivi[k], barre: demiSeconde(suivi[k]) });
    verifier('en vol, on ne rattrape pas le bout du monde qui se charge',
      !suivi.err && tenus.every((a) => a && a.trou >= a.barre),
      `barre = une demi-seconde de vol · ${JSON.stringify(tenus)} · brouillard ${suivi.brouillard}`);

    // L'ÉCRAN NE SE FIGE PLUS EN ARRIVANT SUR UNE VILLE (v235).
    //
    // Max, en vol : « il y a vraiment un lag, l'écran s'arrête pendant trois
    // secondes, il redémarre pendant une seconde ». Profilé et mesuré, vingt
    // secondes de vol au-dessus de Paris : ce n'était NI le maillage (16 ms
    // par image, le budget est respecté) NI le rendu (4 ms), mais
    // `animerLesVilles` — 557 ms dans UNE SEULE image. Les huit circuits de
    // Paris naissaient ensemble au franchissement de leur rayon de 220 blocs,
    // et chacun fabriquait une vingtaine de voitures à trente-deux maillages.
    //
    // ON MESURE CE QUE L'ENFANT SUBIT : la durée de chaque image, sans aucune
    // instrumentation dans le jeu — donc à l'identique sur l'ancien code. Ce
    // qui compte n'est pas la cadence MOYENNE (28,5 avant, 29,6 après : elle
    // ne dit rien) mais la PIRE image et la part du temps passée dans les
    // images très longues.
    // ON FAIT SOUFFLER LE BANC AVANT DE CHRONOMÉTRER. Ce témoin rend un
    // verdict en DURÉE : joué seul il mesure le jeu, joué derrière dix suites
    // il mesure la machine. Vérifié à mes dépens — 233 ms rejoué seul, 400 au
    // milieu du portail complet, sur le même code.
    await souffler();
    const secousses = await ciel.evaluate(async () => {
      const g = window.__game;
      const m = await import('./src/montures.js');
      const { positionDe } = await import('./src/mondes.js');
      const def = m.MONTURES.find((d) => d.key === 'chasseur');
      if (!def || !def.pilote) return { err: 'pas de chasseur' };
      const V = positionDe('paris');
      g.player.pos.set(V.x - 700, 96, V.z);       // en amont, cap sur la ville
      g.player.vel.set(0, 0, 0);
      g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
      g.player.flying = true;
      g.player.pilote = def.pilote;
      g.player.vitesseAvion = def.pilote.max;
      g.player.avionEnVol = true; g.player.avionEtat = 'vol';
      g.player.altitudeDecollage = -9999;
      await new Promise((f) => setTimeout(f, 3000));
      const durees = [];
      let prec = performance.now(), actif = true;
      const tic = (t) => { durees.push(t - prec); prec = t; if (actif) requestAnimationFrame(tic); };
      requestAnimationFrame(tic);
      await new Promise((f) => setTimeout(f, 18000));
      actif = false;
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
      g.player.vitesseAvion = undefined; g.player.flying = false;
      const total = durees.reduce((a, c) => a + c, 0);
      const partAuDela = (s) => +(durees.filter((d) => d > s)
        .reduce((a, c) => a + c, 0) / total * 100).toFixed(1);
      return {
        images: durees.length,
        pireImage: Math.round(Math.max(...durees)),
        partAuDela300: partAuDela(300),
        cadence: +(durees.length / (total / 1000)).toFixed(1),
      };
    });
    // LES BORNES SÉPARENT LES QUATRE MESURES, PAS UNE SEULE. Mon premier jet
    // les avait réglées sur une exécution solitaire (350 ms et 1 %) et il est
    // tombé au milieu du portail complet, sur du code sain. Relevé :
    //
    //   ancien code, seul      800 ms   10,3 %
    //   code neuf, seul        233 ms    0 %
    //   code neuf, au portail  400 ms    2,2 %
    //
    // Cinq cent cinquante et cinq pour cent laissent donc passer le portail
    // chargé et refusent l'ancien code de loin. Une borne se règle sur la
    // dispersion mesurée, jamais sur le meilleur relevé.
    // `images > 60` est une borne de GARDE — « la boucle de rendu vit » — et
    // elle est tombée au portail de la v265 sur 56 images pendant que le
    // verdict, lui, tombait pour sa propre raison. Trente, la valeur que
    // `programmes.images` utilise déjà pour dire la même chose (v246) : une
    // page morte rend zéro.
    verifier('l\'écran ne se fige pas en arrivant sur une ville',
      !secousses.err && secousses.images > 30
        && secousses.pireImage <= 550 && secousses.partAuDela300 <= 5,
      JSON.stringify(secousses));

    // VOLER NE REMPLIT PLUS LA MÉMOIRE DE LA TABLETTE (v236).
    //
    // Max, après la v235 : « Lag is very bad avec les avions fix it for
    // real ». J'avais corrigé des symptômes ; il fallait décomposer. Image par
    // image puis au profil, le vol ne coûte presque rien là où je cherchais :
    // le RENDU fait 4,6 % du temps, la caméra cubique des reflets ne tourne
    // JAMAIS en vol (mesuré : zéro image sur cent huit — le rayon de 45 blocs
    // ignore l'altitude, mais le convoi, lui, n'existe plus si loin), le
    // maillage tient son budget, et couper le contrôle des shaders ne rend
    // rien (pire image 1 800 → 1 633, dans le bruit).
    //
    // La cause est ailleurs, et elle est arithmétique : `world.chunks` ne rend
    // JAMAIS un morceau. `main.js` défait bien les MAILLAGES dépassés ; les
    // quatre-vingts kilo-octets de blocs de chaque morceau, eux, restaient
    // pour toujours. Mesuré, même vol, même distance parcourue :
    //
    //             30 s          90 s            5 min
    //   avant   245 Mo      693 Mo (tas 918)   2 328 Mo (tas 2 616)
    //   après    27 Mo       27 Mo (tas 256)      35 Mo (tas 233)
    //
    // ET LE VERDICT EST EN MÉGAOCTETS, PAS EN MILLISECONDES. Sur ce conteneur
    // la cadence est IDENTIQUE des deux côtés (35,6 contre 34,5 sur cinq
    // minutes) et le temps de ramasse-miettes aussi (4,3 s contre 4,2 sur
    // quatre-vingt-dix) : la machine a de la mémoire à revendre, elle ne
    // souffre pas. Un iPad, si — et il ferme l'onglet. C'est la leçon de la
    // minicarte par un autre bout : une DURÉE mesure le banc, une QUANTITÉ
    // non.
    //
    // ET LE TÉMOIN VÉRIFIE QU'IL A VOLÉ. Mes trois premières sondes ont mesuré
    // un jeu à l'ARRÊT : `banc.joueur` ouvre la page, il faut `jouerSeul` pour
    // que `running` passe à vrai — sans quoi `player.update` n'est jamais
    // appelé et l'avion reste sur place. Tous mes chiffres étaient faux et
    // rien ne le disait. Un témoin de déplacement mesure d'abord le
    // déplacement.
    await souffler();
    const memoire = await ciel.evaluate(async () => {
      const g = window.__game;
      const m = await import('./src/montures.js');
      const { positionDe } = await import('./src/mondes.js');
      const def = m.MONTURES.find((d) => d.key === 'chasseur');
      if (!def || !def.pilote) return { err: 'pas de chasseur' };
      const V = positionDe('paris');
      const depart = V.x - 700;
      g.player.pos.set(depart, 96, V.z);
      g.player.vel.set(0, 0, 0);
      g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
      g.player.flying = true;
      g.player.pilote = def.pilote;
      g.player.vitesseAvion = def.pilote.max;
      g.player.avionEnVol = true; g.player.avionEtat = 'vol';
      g.player.altitudeDecollage = -9999;
      await new Promise((f) => setTimeout(f, 30000));
      const morceaux = g.world.chunks.size;
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
      g.player.vitesseAvion = undefined; g.player.flying = false;
      return { morceaux, moBlocs: Math.round(morceaux * 80 / 1024),
        parcouru: Math.round(g.player.pos.x - depart) };
    });
    // La barre est mesurée, pas ronde : 245 Mo avant, 27 après, sur le même
    // vol de trente secondes. Cent la sépare des deux côtés avec de la marge.
    // ET LA BORNE DE GARDE SUR LES BLOCS PARCOURUS SE POSE À LA MOITIÉ : le
    // banc rend en logiciel et chaque lampe de rue (v248) coûte à chacun de
    // ses pixels — 1 782 blocs en v247, 1 127 en v248, 964 en v249, pour une
    // borne de 1 000 qui ne séparait plus « ça a volé » de « ça n'a pas
    // volé ». Cinq cents : un vol qui n'a pas eu lieu rend zéro.
    verifier('voler une demi-minute ne remplit pas la mémoire de la tablette',
      !memoire.err && memoire.parcouru > 500 && memoire.moBlocs <= 100,
      `barre 100 Mo · ${JSON.stringify(memoire)}`);

    // ET CE QU'UN ENFANT A POSÉ SURVIT À L'OUBLI DE SON MORCEAU.
    //
    // C'est l'invariant 1 appliqué à ma propre correction : oublier les blocs
    // d'un morceau serait irrattrapable s'ils portaient le travail d'un
    // enfant. Ils ne le portent pas — le terrain est DÉTERMINISTE et `edits`
    // est la source, que `generateChunk` réapplique — mais cela se PROUVE.
    // Sur l'ancien code, `oublierLoinDe` n'existe pas : le témoin le dit au
    // lieu de planter.
    const survie = await ciel.evaluate(() => {
      const g = window.__game, w = g.world;
      if (!w.oublierLoinDe) return { err: 'oublierLoinDe absente' };
      const x = 4321, y = 90, z = -1234;
      const avant = w.getBlock(x - 1, y, z);            // engendre le morceau
      w.setBlock(x, y, z, 1);                           // « une brique de Marlon »
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
      const tenait = w.chunks.has(cx + ',' + cz);
      w.oublierLoinDe(cx + 9999, cz, 16);               // on oublie tout
      const vide = !w.chunks.has(cx + ',' + cz);
      return { tenait, vide, avant, apres: w.getBlock(x - 1, y, z),
        brique: w.getBlock(x, y, z) };
    });
    verifier('un bloc posé par un enfant survit à l\'oubli de son morceau',
      !survie.err && survie.tenait && survie.vide
        && survie.brique === 1 && survie.apres === survie.avant,
      JSON.stringify(survie));

    // CE QU'ON RETIRE DE LA SCÈNE SE REND À LA CARTE GRAPHIQUE (v238).
    //
    // Max : « le jeu lague de plus en plus depuis un moment. » Ce n'était ni le
    // vol, ni le chargement, ni le paysage lointain — la v236 et la v237 rendent
    // la MÊME cadence debout au centre de Paris (3,7 contre 3,3 im/s). Et le
    // profil renverse la question : le fil principal est INACTIF 81 % du temps.
    // Ce conteneur rend en LOGICIEL ; sa cadence mesure SwiftShader, pas le jeu,
    // et il ne peut donc pas SUBIR la panne de Max. On mesure la CAUSE et non
    // l'effet — la leçon de la v236, reprise telle quelle.
    //
    // La cause : une créature coûte DIX-NEUF GÉOMÉTRIES ET DEMIE, `removeCreature`
    // faisait `scene.remove()` et rien d'autre, et `scene.remove()` ne rend pas
    // un octet au pilote graphique. Le jeu en fait naître une toutes les 1,2 s.
    //
    // ON N'ATTEND PAS UN ÉVÉNEMENT RARE, ON ÉPROUVE LE MÉCANISME (leçon des
    // poissons). Trois sondes ont échoué avant celle-ci, et chacune pour une
    // raison qui vaut d'être écrite :
    //   · joueur immobile, `retirees` valait ZÉRO — les créatures remplissaient
    //     seulement leur plafond de seize, ce qui s'arrête tout seul ;
    //   · à pied, l'enfant avance à 15 % du temps réel sur ce banc (`dt` borné,
    //     trois images par seconde) : six blocs en trente secondes, jamais les
    //     soixante-dix qui déclenchent un retrait ;
    //   · dix allers-retours de cent cinquante blocs provoquaient bien le
    //     renouvellement, mais le disque de morceaux ne revenait pas au même
    //     endroit d'un côté et de l'autre (92 contre 99), ce qui vaut vingt
    //     géométries d'écart : le verdict aurait mesuré le banc.
    //
    // ET LE COMPTEUR DU MOTEUR N'ENREGISTRE QUE CE QUI EST DESSINÉ. La première
    // version de cette mesure rendait 96 avant, 96 pendant et 96 après : les
    // bêtes naissaient derrière la caméra et n'y figuraient jamais. Elle ne
    // mesurait RIEN et serait passée au vert des deux côtés. D'où `frustumCulled
    // = false` : on force le dessin avant de compter.
    //
    // Mesuré, dix créatures nées puis retirées :
    //   origin/main   195 géométries prises, 0 rendues, 195 PERDUES
    //   ici           193 géométries prises, 193 rendues, 0 perdue
    await souffler();
    const rendu = await ciel.evaluate(() => {
      const g = window.__game, cm = g.creatureManager, R = g.renderer;
      if (!cm || !cm.trySpawn) return { err: 'pas de gestionnaire de créatures' };
      // `trySpawn` refuse dès que le plafond de bêtes sauvages est atteint —
      // et sur une page qui a volé, il l'est : deux naissances en quatre-vingts
      // essais. On fait de la place AVANT de compter, sinon les bêtes qu'on
      // retire ici passeraient pour des géométries rendues par le témoin.
      while (cm.creatures.length > 4) cm.removeCreature(cm.creatures[0]);
      R.render(g.scene, g.camera);
      const avant = R.info.memory.geometries;
      // `trySpawn` tire une position et peut ne rien poser (eau, pente,
      // plafond) : dix essais n'en faisaient naître que quatre sur la carte
      // ×2. On insiste jusqu'à dix bêtes — c'est le mécanisme qu'on éprouve,
      // pas le hasard du tirage.
      const nees = [];
      for (let i = 0; i < 80 && nees.length < 10; i++) {
        const n = cm.creatures.length;
        cm.trySpawn();
        if (cm.creatures.length > n) nees.push(cm.creatures[cm.creatures.length - 1]);
      }
      for (const c of nees) c.mesh.traverse((o) => { o.frustumCulled = false; });
      R.render(g.scene, g.camera);
      const pleine = R.info.memory.geometries;
      for (const c of nees) cm.removeCreature(c);
      R.render(g.scene, g.camera);
      const apres = R.info.memory.geometries;
      return { avant, pleine, apres, nees: nees.length,
        prises: pleine - avant, rendues: pleine - apres, perdues: apres - avant };
    });
    // La borne de GARDE vérifie que la mesure a EU LIEU — au moins cinq bêtes
    // nées et cent géométries prises — et se pose à la moitié de ce qui a été
    // relevé (dix bêtes, 193), jamais à quatre-vingt-dix pour cent. Le verdict,
    // lui, est exact : ce qu'on a pris, on le rend. Dix de tolérance pour un
    // remaillage qui tomberait entre deux comptes.
    verifier('ce qu\'on retire de la scène se rend à la carte graphique',
      !rendu.err && rendu.nees >= 5 && rendu.prises >= 100 && rendu.perdues <= 10,
      `barre 10 géométries perdues · ${JSON.stringify(rendu)}`);

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
      // Un couloir vierge, loin de tout — ET SUR TERRE. À (−40 000, 40 000)
      // le monde ×2 (v242) ne rend plus que du Pacifique : une minicarte
      // uniformément bleue ne change jamais d'empreinte, et le témoin
      // comptait zéro changement sans rien mesurer. Le Sahara, au sud de
      // Tombouctou (2 300 blocs de la ville la plus proche), a du relief.
      g.player.pos.set(0, 96, 20000);
      g.player.vel.set(0, 0, 0);
      g.player.yaw = 0; g.player.pitch = 0;
      g.player.flying = true;
      g.player.pilote = def.pilote;
      g.player.vitesseAvion = def.pilote.max;
      g.player.avionEnVol = true; g.player.avionEtat = 'vol';
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
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
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

    // UN AVION DÉCOLLE DE SA PISTE, ET IL S'Y POSE (v261).
    //
    // Max : « une vraie motion de décollage : accélération sur la piste puis
    // décollage en levant le nez ; idem à l'atterrissage, baisser l'altitude
    // et ouvrir le train ; et le roulage sur la piste. » Avant, le bouton ✈️
    // arrachait l'appareil du sol sur place (v228 : « il ne décolle pas »,
    // puis la montée automatique) et se poser était une descente à
    // l'aveugle jusqu'au sol, train jamais rentré.
    //
    // ON ÉPROUVE LE TRAJET DE L'ENFANT, sur une piste : une dalle de pierre
    // au-dessus du relief, loin de tout (le relief naturel n'est jamais plat
    // sur trois cents blocs). On monte PAR LE BOUTON — l'assiette et le train
    // sont rendus sur le maillage de la monture, dans `fun.js` ; poser
    // `player.pilote` à la main ferait voler un joueur sans avion. Puis la
    // touche du bouton ✈️, et l'on relève dix fois par seconde ce que
    // l'appareil fait : où il est, à quelle vitesse, nez levé ou non, train
    // sorti ou non, roues au sol ou non.
    //
    // ET LE SIGNE DE L'ASSIETTE SE MESURE SUR CE QUI EST RENDU : la hauteur
    // du nez contre celle de la queue, lues dans la matrice monde du
    // maillage. Un nez qui se lève à l'envers passerait toute mesure
    // d'amplitude — c'est la leçon du roulis (v231) et du conducteur assis
    // de dos (v249).
    const trajet = await tab.evaluate(async () => {
      const g = window.__game;
      const THREE = await import('three');
      const { BLOCK } = await import('./src/blocks.js');
      const tenirSecondes = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => {
          cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05);
          prec = t;
          if (cumul >= n) fin(); else requestAnimationFrame(pas);
        };
        requestAnimationFrame(pas);
      });
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      g.player.keys.clear();
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
      g.player.vitesseAvion = undefined; g.player.flying = false;
      // LA PISTE : trois cents blocs de pierre, un roulement de cinquante
      // blocs, une montée, une descente et un freinage tiennent dedans.
      const x0 = 30000, z0 = 30300, L = 300;
      let y0 = 0;
      for (let d = -6; d <= L; d += 4) for (let w = -4; w <= 4; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 2;
      const dalle = [];
      for (let d = -6; d <= L; d++) for (let w = -4; w <= 4; w++) {
        g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE); dalle.push([x0 + d, y0, z0 + w]);
        for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) { g.world.setBlock(x0 + d, y0 + h, z0 + w, 0); dalle.push([x0 + d, y0 + h, z0 + w]); }
      }
      const sauve = g.player.pos.clone(), yaw0 = g.player.yaw;
      g.player.yaw = -Math.PI / 2; g.player.pitch = 0;      // le nez vers +x, le long de la piste
      g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
      await tenirSecondes(1);
      const avion = g.animalManager.invoquer('avionligne', x0 + 3, z0);
      if (!avion) return { err: 'aucun avion posé' };
      await tenirSecondes(0.5);
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await tenirSecondes(0.5); }
      if (!g.player.pilote) return { err: 'on n\'est pas aux commandes' };
      await tenirSecondes(0.6);
      const nezMoinsQueue = () => {
        avion.mesh.updateMatrixWorld(true);
        const n = new THREE.Vector3(0, 1.5, -8).applyMatrix4(avion.mesh.matrixWorld);
        const q = new THREE.Vector3(0, 1.5, 8).applyMatrix4(avion.mesh.matrixWorld);
        return +(n.y - q.y).toFixed(2);
      };
      const train = () => (avion.mesh.userData.train || []).map((t) => (t.visible ? +t.rotation.x.toFixed(2) : 'rentré'));
      const releve = (t) => ({
        t: +t.toFixed(1), x: +(g.player.pos.x - x0).toFixed(1), y: +(g.player.pos.y - y0 - 1).toFixed(2),
        v: +(g.player.vitesseAvion || 0).toFixed(1), etat: g.player.avionEtat,
        assiette: +(g.player.assietteAvion || 0).toFixed(3), train: +(g.player.trainSorti ?? 1).toFixed(2),
        sol: !!g.player.onGround, nez: nezMoinsQueue(), jambes: train(),
      });
      const releves = [];
      let t = 0;
      const jusqua = async (fini, limite) => {
        while (t < limite) { await tenirSecondes(0.1); t += 0.1; const r = releve(t); releves.push(r); if (fini(r)) return r; }
        return null;
      };
      const depart = releve(0);
      // ✈️ : pleins gaz
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
      const enVol = await jusqua((r) => r.etat === 'vol', 20);
      const decollage = releves.slice();
      // ✈️ : on se pose
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
      const arret = await jusqua((r) => r.etat === 'sol', 25);
      const atterrissage = releves.slice(decollage.length);
      // puis on roule, et l'on tourne
      // LE ROULAGE EST UNE MESURE À PART, ET IL LUI FAUT DE LA PISTE DEVANT.
      // L'atterrissage consomme presque toute la dalle : rejoué seul, il
      // s'arrête à x = 291 pour trois cents blocs de pierre, et deux secondes
      // de roulage à six blocs par seconde faisaient alors SORTIR l'appareil
      // par le bout (x 303, y −1,5 : il tombe, `sol` faux). Le témoin était
      // vert au portail et rouge seul — il mesurait où l'atterrissage s'était
      // arrêté, pas le roulage. On ramène l'appareil au début de la piste,
      // immobile, avant de mesurer ce qu'on annonce.
      g.player.pos.set(x0 + 10, y0 + 1.01, z0 + 0.5);
      g.player.yaw = -Math.PI / 2; g.player.vel.set(0, 0, 0); g.player.vitesseAvion = 0;
      await tenirSecondes(0.4);
      const avantRoulage = releve(t);
      g.player.keys.add('KeyW');
      await tenirSecondes(2);
      const roule = releve(t);
      g.player.keys.add('KeyA');
      await tenirSecondes(1.5);
      const tourne = { yaw: +(g.player.yaw - (-Math.PI / 2)).toFixed(3), ...releve(t) };
      g.player.keys.clear();
      // et le train en vol, à part : rentré en croisière, sorti dès qu'on se pose
      g.player.pos.set(x0, y0 + 60, z0 + 0.5); g.player.vitesseAvion = 60;
      g.player.avionEtat = 'vol'; g.player.avionEnVol = true;
      await tenirSecondes(2.2);
      const croisiere = releve(t);
      g.player.decollerOuSePoser();
      await tenirSecondes(2.2);
      const finale = releve(t);
      // on redescend de l'avion, et l'on range la piste
      g.player.avionEtat = 'sol'; g.player.avionEnVol = false; g.player.vitesseAvion = 0;
      for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenirSecondes(0.5); }
      for (const [x, y, z] of dalle) g.world.setBlock(x, y, z, 0);
      g.player.pos.copy(sauve); g.player.yaw = yaw0; g.player.vel.set(0, 0, 0); g.player.flying = false;
      return { depart, decollage, enVol, atterrissage, arret, avantRoulage, roule, tourne, croisiere, finale };
    });
    const dec = trajet.decollage || [];
    const auSol = dec.filter((r) => r.sol && r.etat === 'decollage');
    const leve = dec.find((r) => !r.sol && r.etat === 'decollage' && r.v >= 40);
    const roulement = auSol.length ? auSol[auSol.length - 1].x - (trajet.depart ? trajet.depart.x : 0) : 0;
    // 42² / (2 × 18) = 49 blocs de roulement : on en demande au moins vingt
    // (le banc échantillonne à dix images par seconde de jeu) et moins de
    // quatre-vingt-dix — au-delà, l'appareil ne décolle pas, il roule.
    verifier('✈️ accélère sur la piste, et le nez ne se lève qu\'à la vitesse de rotation',
      !trajet.err && !!leve && roulement >= 20 && roulement <= 90
        && auSol.every((r) => r.assiette < 0.06),
      `${trajet.err || ''} roulement ${roulement} blocs, levé à ${JSON.stringify(leve)}`);
    // Douze degrés de rotation : on en demande la moitié à la lecture, ET le
    // nez rendu plus haut que la queue — c'est le signe.
    const apresLever = leve ? dec.slice(dec.indexOf(leve)) : [];
    const cabre = apresLever.find((r) => r.assiette >= 0.11);
    verifier('à la rotation le nez se lève — celui du maillage, pas un nombre',
      !!cabre && cabre.nez > 1.0,
      `nez levé : ${JSON.stringify(cabre || apresLever[apresLever.length - 1] || null)}`);
    verifier('puis l\'appareil monte au palier, train rentré en croisière',
      !!trajet.enVol && trajet.enVol.y >= 18
        && !!trajet.croisiere && trajet.croisiere.train === 0
        && trajet.croisiere.jambes.length === 3 && trajet.croisiere.jambes.every((j) => j === 'rentré'),
      `palier ${JSON.stringify(trajet.enVol)} · croisière ${JSON.stringify(trajet.croisiere)}`);
    const att = trajet.atterrissage || [];
    const touche = att.find((r) => r.etat === 'freinage');
    const avantToucher = touche ? att.slice(0, att.indexOf(touche)) : att;
    verifier('🛬 descend train sorti, touche la piste et freine jusqu\'à l\'arrêt',
      !!touche && avantToucher.length > 2 && avantToucher.every((r) => r.etat === 'atterrissage')
        && avantToucher[avantToucher.length - 1].train >= 0.97
        && !!trajet.finale && trajet.finale.train >= 0.97 && trajet.finale.jambes.every((j) => j !== 'rentré')
        && !!trajet.arret && trajet.arret.v === 0 && Math.abs(trajet.arret.y) < 0.3
        && trajet.arret.x <= 300,
      `toucher ${JSON.stringify(touche)} · arrêt ${JSON.stringify(trajet.arret)} · finale ${JSON.stringify(trajet.finale)}`);
    // Au sol, le joystick fait rouler — sans quitter la piste — et tourne.
    verifier('à l\'arrêt, le joystick fait rouler l\'appareil sur la piste et le fait tourner',
      !!trajet.roule && !!trajet.avantRoulage && trajet.roule.x - trajet.avantRoulage.x >= 4
        && Math.abs(trajet.roule.y) < 0.3 && trajet.roule.etat === 'sol'
        && !!trajet.tourne && Math.abs(trajet.tourne.yaw) > 0.15,
      `roulage ${JSON.stringify(trajet.avantRoulage)} → ${JSON.stringify(trajet.roule)} · virage ${JSON.stringify(trajet.tourne)}`);

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
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
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
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
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

    // AU VOLANT, LE JOYSTICK EST LE VOLANT ET L'ACCÉLÉRATEUR — NI MANETTE NI
    // COMPTEUR (v272, qui remplace le témoin de cadran de la v262).
    //
    // Max, capture de Hambourg : « il est marqué 86 km/h » sur une voiture
    // immobile dans le port, et « la jauge de vitesse, je ne veux pas qu'elle
    // soit existante pour une voiture ». Le cadran redevient ce qu'il a
    // toujours été : une manette des gaz d'AVION. Une voiture se conduit au
    // joystick — l'avant accélère, l'arrière freine puis recule (v269), le
    // côté tourne le volant (v262) — ce qui ne demande qu'un doigt.
    //
    // ON ÉPROUVE LE GESTE DE L'ENFANT, UN SEUL DOIGT : on pose le joystick
    // dans sa zone (le quart bas-gauche du canvas), on le pousse vers l'avant,
    // et l'on lit la vitesse que la voiture PREND, puis le cap qu'elle prend
    // quand on va à droite.
    const manette = await (async () => {
      const cdp = await tab.context().newCDPSession(tab);
      const dormirIci = (ms) => new Promise((f) => setTimeout(f, ms));
      const toucher = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      const prep = await tab.evaluate(async () => {
        const g = window.__game;
        const { BLOCK } = await import('./src/blocks.js');
        const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
        for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 400)); }
        for (const a of [...g.animalManager.animals]) if (a.def.key === 'voiture' || a.def.pilote) { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
        g.player.keys.clear(); g.player.touchMove.f = 0; g.player.touchMove.s = 0;
        g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined; g.player.flying = false;
        const x0 = 30000, z0 = 30600, L = 300, W = 8;
        let y0 = 0;
        for (let d = -6; d <= L; d += 4) for (let w = -W; w <= W; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
        y0 += 2;
        const dalle = [];
        for (let d = -6; d <= L; d++) for (let w = -W; w <= W; w++) {
          g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE); dalle.push([x0 + d, y0, z0 + w]);
          for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) { g.world.setBlock(x0 + d, y0 + h, z0 + w, 0); dalle.push([x0 + d, y0 + h, z0 + w]); }
        }
        window.__piste262 = { x0, y0, z0, dalle, sauve: g.player.pos.clone(), yaw0: g.player.yaw };
        g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
        g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
        await new Promise((f) => setTimeout(f, 1200));
        g.animalManager.invoquer('voiture', x0 + 3, z0, false, { flotte: 'berline-citadine' });
        await new Promise((f) => setTimeout(f, 800));
        for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 500)); }
        if (!auVolant()) return { err: 'pas monté dans la voiture' };
        await new Promise((f) => setTimeout(f, 600));
        // ON PROVOQUE LA SITUATION, ON NE L'ATTEND PAS (v272) : la pastille de
        // viande n'apparaît qu'à partir d'un morceau ramassé, et c'est elle
        // qui volait le doigt dans la zone du joystick. On la montre donc
        // exprès, comme un enfant qui a chassé — sinon le témoin dépend de ce
        // que les cent trente témoins d'avant ont laissé traîner.
        const pastille = document.getElementById('meat-counter');
        if (pastille) { pastille.style.display = 'block'; pastille.textContent = '🍖 × 3'; }
        const vis = (id) => getComputedStyle(document.getElementById(id)).display;
        // LA ZONE DU JOYSTICK SE DEMANDE AU JEU, ELLE NE S'ÉCRIT PAS EN
        // PIXELS : c'est une FRACTION de la vue (main.js : `clientX <
        // innerWidth * 0,45 && clientY > innerHeight * 0,4`). Écrite en
        // pixels, la règle serait juste sur l'iPhone de Max et fausse sur le
        // 420 × 760 du banc — c'est exactement le piège de la v265.
        const zone = { x: innerWidth * 0.45, y: innerHeight * 0.4 };
        const boite = (id) => {
          const e = document.getElementById(id);
          if (!e) return null;
          const st = getComputedStyle(e), b = e.getBoundingClientRect();
          if (st.display === 'none' || b.width === 0) return null;
          return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
        };
        // ET LE PANNEAU « DESCENDRE » SE LIT QUAND IL EST LÀ, PAS À L'INSTANT
        // OÙ L'ON REGARDE (v272). Au portail il a rendu `null` — display à
        // `none` — alors que le joystick du MÊME relevé prenait le doigt et
        // que les boutons de la marche étaient bien effacés : `fun.js`
        // réévalue la cible à chaque image, et à deux images par seconde on
        // tombe entre deux. `null` ne distingue pas « mal placé » de « pas
        // encore affiché » : on attend la boîte, borné, et l'attente entre
        // dans le message.
        let descendre = null, attenduDescendre = 0;
        while (attenduDescendre < 8000 && !descendre) {
          descendre = boite('fun-target');
          if (!descendre) { await new Promise((f) => setTimeout(f, 250)); attenduDescendre += 250; }
        }
        return {
          vue: { w: innerWidth, h: innerHeight }, zone,
          canvas: (document.querySelector('canvas') || {}).id || 'game',
          pastille: pastille ? getComputedStyle(pastille).display : 'absente',
          descendre, attenduDescendre,
          boutons: { saut: vis('jump-btn'), pioche: vis('mode-btn'), capture: vis('ball-btn'), coffre: vis('dex-btn'), barre: vis('hotbar'), gaz: vis('gaz-base'), val: vis('gaz-val'), socle: vis('cmd-vol'), train: vis('train-btn'), vol: vis('fly-btn') },
          boost: g.player.boost, max: 3.2 * (g.player.boost || 1),
        };
      });
      if (prep.err) return prep;
      // LE DOIGT SE POSE DANS LA ZONE DU JOYSTICK, EN FRACTION DE LA VUE.
      //
      // ET UN GESTE QUI NE PREND PAS SE DIT (v272). Le premier jet posait le
      // doigt une fois et mesurait : au portail, `f` est resté à zéro et le
      // témoin a accusé une physique JUSTE — sonde faite, même dalle, même
      // voiture, même protocole : `f = 1`, la voiture monte à son allure.
      // Le geste ne prend donc pas TOUJOURS sur une page qui a cent trente
      // témoins derrière elle. On relève donc ce que la sonde relevait — la
      // branche qui a pris le doigt (`joy` paraît-il ?), et ce que
      // `elementFromPoint` voit — et l'on repose le doigt tant qu'il n'a pas
      // pris, trois fois au plus, le NOMBRE D'ESSAIS entrant dans le verdict :
      // un geste qui demande trois essais est un fait qu'on veut voir.
      const base = { x: Math.round(prep.vue.w * 0.18), y: Math.round(prep.vue.h * 0.8) };
      const JOY = 50;   // JOY_RADIUS (main.js)
      const joy = (dx, dy) => ({ x: base.x + dx, y: base.y + dy, id: 1 });
      const doigt = () => tab.evaluate((b) => {
        const e = document.elementFromPoint(b.x, b.y);
        return {
          joy: getComputedStyle(document.getElementById('joy-base')).display,
          knob: document.getElementById('joy-knob').style.transform,
          cible: e ? (e.id || `${e.tagName}.${e.className}`) : 'rien',
          f: +window.__game.player.touchMove.f.toFixed(2),
        };
      }, base);
      // ET LE PROTOCOLE DES DOIGTS EST STRICT : `touchEnd` sans doigt posé rend
      // « Must send a TouchStart first to start a new touch » et TUE la suite
      // (mesuré). On lève donc le doigt sans exiger qu'il y en ait un.
      const lever = () => toucher('touchEnd', [joy(0, 0)]).catch(() => {});
      let essais = 0, pose = null;
      while (essais < 3) {
        essais++;
        if (essais > 1) { await lever(); await dormirIci(120); }
        await toucher('touchStart', [joy(0, 0)]);
        await dormirIci(250);
        // plein avant : le doigt monte d'un rayon de joystick
        await toucher('touchMove', [joy(0, -JOY)]);
        await dormirIci(350);
        pose = await doigt();
        if (pose.f > 0.8) break;
      }
      const lire = () => tab.evaluate(() => { const p = window.__game.player; return { gaz: p.gaz == null ? null : +p.gaz.toFixed(2), f: +p.touchMove.f.toFixed(2), v: +Math.hypot(p.vel.x, p.vel.z).toFixed(2), yaw: +p.yaw.toFixed(3), y: +(p.pos.y - window.__piste262.y0 - 1).toFixed(2), x: +(p.pos.x - window.__piste262.x0).toFixed(1) }; });
      // LE BANC NE VIT PAS EN TEMPS RÉEL (dt borné, trois images par seconde) :
      // on attend que la voiture AIT pris sa vitesse, bornée en temps mural,
      // puis on relève — jamais un délai fixe.
      const vitesses = [];
      const t0 = Date.now();
      while (Date.now() - t0 < 20000) { const r = await lire(); if (r.v >= prep.max * 0.9) break; await dormirIci(200); }
      for (let i = 0; i < 8; i++) { await dormirIci(200); vitesses.push(await lire()); }
      // puis le joystick à droite, toujours plein avant
      const avantVirage = await lire();
      for (const dx of [15, 30, 45]) { await toucher('touchMove', [joy(dx, -JOY)]); await dormirIci(60); }
      let apresVirage = avantVirage;
      const t1 = Date.now();
      while (Date.now() - t1 < 8000) { apresVirage = await lire(); if (Math.abs(apresVirage.yaw - avantVirage.yaw) > 0.3) break; await dormirIci(150); }
      await lever();
      await dormirIci(300);
      // ON LÂCHE : SANS MANETTE, UNE VOITURE RALENTIT — c'est la différence
      // avec l'avion, dont la poussée SE GARDE (v228). On attend le résultat,
      // borné, jamais un délai fixe.
      let apresLacher = await lire();
      const t2 = Date.now();
      while (Date.now() - t2 < 10000) { apresLacher = await lire(); if (apresLacher.v < prep.max * 0.3) break; await dormirIci(200); }
      // on descend : les boutons reviennent
      const apres = await tab.evaluate(async () => {
        const g = window.__game;
        const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
        for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 400)); }
        await new Promise((f) => setTimeout(f, 300));
        const vis = (id) => getComputedStyle(document.getElementById(id)).display;
        return { saut: vis('jump-btn'), pioche: vis('mode-btn'), gaz: vis('gaz-base'), barre: vis('hotbar'), gazJoueur: g.player.gaz, auVolant: auVolant() };
      });
      const tri = vitesses.map((r) => r.v).sort((a, b) => a - b);
      return { ...prep, essais, pose, mediane: tri[Math.floor(tri.length / 2)], pointe: tri[tri.length - 1], avantVirage, apresVirage, apresLacher, apres };
    })();
    verifier('au volant, l\'avant du joystick est l\'accélérateur — poussé à fond, la voiture prend son allure, et elle ralentit quand on lâche',
      !manette.err && manette.mediane >= manette.max * 0.75 && manette.pointe <= manette.max * 1.05
        && manette.apresLacher && manette.apresLacher.v < manette.max * 0.3
        && manette.apresLacher.gaz == null,
      `${manette.err || ''} médiane ${manette.mediane} pour ${manette.max && manette.max.toFixed(1)} d'allure · doigt ${JSON.stringify(manette.pose)} en ${manette.essais} essai(s) · lâché ${JSON.stringify(manette.apresLacher)}`);
    verifier('et le côté du joystick tourne le volant pendant qu\'on accélère',
      !manette.err && manette.avantVirage && manette.apresVirage
        && Math.abs(manette.apresVirage.yaw - manette.avantVirage.yaw) > 0.25
        && Math.abs(manette.apresVirage.y) < 0.3 && manette.apresVirage.v > manette.max * 0.5,
      `doigt ${JSON.stringify(manette.pose)} en ${manette.essais} essai(s) · avant ${JSON.stringify(manette.avantVirage)} · après ${JSON.stringify(manette.apresVirage)}`);
    const b = manette.boutons || {};
    verifier('au volant, les boutons de la marche s\'effacent — saut, pioche, capture, coffre, barre — ET LA JAUGE DE VITESSE N\'EXISTE PAS',
      !manette.err && b.saut === 'none' && b.pioche === 'none' && b.capture === 'none' && b.coffre === 'none'
        && b.barre === 'none' && b.vol === 'none' && b.train === 'none'
        && b.gaz === 'none' && b.val === 'none' && b.socle === 'none',
      JSON.stringify(b));
    // LE BOUTON POUR DESCENDRE N'EST PAS DANS LA ZONE DU JOYSTICK. La v265
    // l'avait poussé vers la GAUCHE pour l'écarter des commandes de bord, et
    // il est tombé dedans : un doigt posé là ne prend plus le volant, il
    // DESCEND. La règle se dit en fractions de la vue, jamais en pixels.
    const d = manette.descendre, zn = manette.zone;
    verifier('et le bouton pour descendre est hors de la zone du joystick — on ne descend pas en croyant tourner',
      !manette.err && !!d && !!zn && (d.x >= zn.x || d.y + d.h <= zn.y),
      `bouton ${JSON.stringify(d)} après ${((manette.attenduDescendre || 0) / 1000).toFixed(1)} s d'attente`
      + ` · zone du joystick x < ${zn && Math.round(zn.x)} et y > ${zn && Math.round(zn.y)} · vue ${JSON.stringify(manette.vue)}`);
    // ET RIEN D'AUTRE NE VOLE LE DOIGT (v272). C'est l'instrumentation du
    // témoin ci-dessus qui l'a trouvé : `elementFromPoint` répondait
    // « meat-counter ». La pastille de viande (🍖 × N) est posée à gauche, à
    // 150 px du bas — DANS la zone du joystick — et `#left-rail-bottom > *`
    // la rendait cliquable alors que `main.js` écrit qu'« elle ne se touche
    // plus ». Un enfant qui a ramassé de la viande ne pouvait plus prendre le
    // volant à cet endroit. Le témoin la MONTRE exprès (voir `prep`) et exige
    // que le doigt atteigne le canvas du PREMIER coup.
    verifier('et rien d\'autre ne vole le doigt dans la zone du joystick — la pastille de viande ne se touche pas',
      !manette.err && !!manette.pose && manette.pose.cible === manette.canvas
        && manette.pose.f > 0.8 && manette.essais === 1 && manette.pastille === 'block',
      `doigt ${JSON.stringify(manette.pose)} en ${manette.essais} essai(s) · canvas « ${manette.canvas} » · pastille ${manette.pastille}`);
    verifier('et ils reviennent à pied',
      !manette.err && manette.apres && !manette.apres.auVolant && manette.apres.saut !== 'none'
        && manette.apres.pioche !== 'none' && manette.apres.barre !== 'none' && manette.apres.gaz === 'none'
        && manette.apres.gazJoueur == null,
      JSON.stringify(manette.apres));

    // « IL EST MARQUÉ 86 KM/H » — UNE VOITURE À L'ARRÊT NE ROULE PAS (v272).
    //
    // Max, capture de Hambourg : le compteur annonçait 86 km/h sur une
    // voiture immobile. `vitesseVoiture` était la vitesse DEMANDÉE : ni la
    // boîte de collision ni le crochet d'obstacle ne la touchaient, si bien
    // qu'une voiture plaquée contre un mur gardait son allure pour toujours —
    // le compteur le disait, le bruit du moteur le disait, et les roues
    // tournaient dans le vide.
    //
    // ON MESURE LA CAUSE, PAS L'AFFICHAGE : le compteur n'existe plus en
    // voiture (témoin ci-dessus), mais `vitesseVoiture` alimente encore le
    // régime du moteur (v268) et la rotation des roues. C'est elle qu'on lit.
    //
    // ET L'ON ATTEND LE RÉSULTAT, JAMAIS UNE DURÉE : « il ne bouge plus »,
    // borné en temps mural, parce qu'à `dt` borné trois secondes de banc ne
    // mènent nulle part (v270, trois fichiers dans le même portail).
    const mur = await tab.evaluate(async () => {
      const g = window.__game;
      const { BLOCK } = await import('./src/blocks.js');
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 400)); }
      for (const a of [...g.animalManager.animals]) if (a.def.key === 'voiture' || a.def.pilote) { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
      g.player.keys.clear(); g.player.touchMove.f = 0; g.player.touchMove.s = 0;
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined; g.player.flying = false;
      const x0 = 30400, z0 = 30900, L = 60, W = 8;
      let y0 = 0;
      for (let d = -6; d <= L; d += 4) for (let w = -W; w <= W; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 2;
      const pose = [];
      for (let d = -6; d <= L; d++) for (let w = -W; w <= W; w++) {
        g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE); pose.push([x0 + d, y0, z0 + w]);
        for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) { g.world.setBlock(x0 + d, y0 + h, z0 + w, 0); pose.push([x0 + d, y0 + h, z0 + w]); }
      }
      // un mur en travers, à trente blocs : de quoi prendre toute son allure
      for (let w = -W; w <= W; w++) for (let h = 1; h <= 4; h++) {
        g.world.setBlock(x0 + 30, y0 + h, z0 + w, BLOCK.STONE); pose.push([x0 + 30, y0 + h, z0 + w]);
      }
      g.player.yaw = -Math.PI / 2; g.player.pitch = 0;   // cap vers +x
      g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
      await new Promise((f) => setTimeout(f, 1200));
      g.animalManager.invoquer('voiture', x0 + 3, z0, false, { flotte: 'berline-citadine' });
      await new Promise((f) => setTimeout(f, 800));
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 500)); }
      const rendre = async () => {
        for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 400)); }
        g.player.keys.clear();
        for (const [x, y, z] of pose) g.world.setBlock(x, y, z, 0);
      };
      if (!auVolant()) { await rendre(); return { err: 'pas monté dans la voiture' }; }
      g.player.keys.add('KeyW');
      // on roule jusqu'à ce que la voiture ait pris son allure
      const t0 = performance.now();
      let lance = 0;
      while (performance.now() - t0 < 20000) {
        await new Promise((f) => setTimeout(f, 200));
        lance = Math.abs(g.player.vitesseVoiture || 0);
        if (lance >= (g.player.vitesseVoitureMax || 3.2) * 0.85) break;
      }
      // puis jusqu'à ce qu'elle ne bouge plus — le mur l'arrête
      const t1 = performance.now();
      let immobile = 0, xAvant = g.player.pos.x, arret = performance.now();
      while (performance.now() - t1 < 25000 && immobile < 4) {
        await new Promise((f) => setTimeout(f, 250));
        const bouge = Math.abs(g.player.pos.x - xAvant);
        xAvant = g.player.pos.x;
        immobile = bouge < 0.02 ? immobile + 1 : 0;
      }
      arret = Math.round(performance.now() - t1);
      const contreLeMur = {
        vitesse: +Math.abs(g.player.vitesseVoiture || 0).toFixed(2),
        x: +(g.player.pos.x - x0).toFixed(1),
        immobile, arret,
      };
      // on lâche le mur : la voiture doit repartir en arrière
      g.player.keys.delete('KeyW'); g.player.keys.add('KeyS');
      const t2 = performance.now();
      let recule = 0;
      while (performance.now() - t2 < 15000 && recule < 1) {
        await new Promise((f) => setTimeout(f, 250));
        recule = (x0 + contreLeMur.x) - g.player.pos.x;
      }
      await rendre();
      return { lance: +lance.toFixed(2), max: +(g.player.vitesseVoitureMax || 3.2).toFixed(2), contreLeMur, recule: +recule.toFixed(2) };
    });
    verifier('une voiture arrêtée par un mur n\'annonce plus de vitesse — et elle repart quand on recule',
      !mur.err && mur.lance > 1 && !!mur.contreLeMur && mur.contreLeMur.immobile >= 4
        && mur.contreLeMur.vitesse < mur.lance * 0.2 && mur.recule >= 1,
      `${mur.err || ''} lancée ${mur.lance} (allure ${mur.max}) · contre le mur ${JSON.stringify(mur.contreLeMur)} · reculé ${mur.recule}`);

    // UNE VOITURE N'ENTRE PAS DANS L'EAU (v272).
    //
    // Max, capture de Hambourg : sa voiture au milieu du port. C'est le piège
    // de `sommetColonne` du v267, une famille plus bas — elle rend le premier
    // bloc SOLIDE en descendant, et l'eau n'en est pas un : au-dessus de la
    // mer elle rend le FOND, si bien que rien n'arrêtait la voiture et
    // qu'elle roulait au fond.
    //
    // ON PROVOQUE LA SITUATION, ON NE L'ATTEND PAS (leçon des poissons, v233) :
    // un quai de pierre posé au ras de l'eau, cap droit sur la mer. Et la
    // sonde DIT OÙ ELLE EST (v267) : sans la position et la hauteur d'eau, un
    // « tout va bien » ne prouve rien.
    const eau = await tab.evaluate(async () => {
      const g = window.__game;
      const { BLOCK } = await import('./src/blocks.js');
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 400)); }
      for (const a of [...g.animalManager.animals]) if (a.def.key === 'voiture' || a.def.pilote) { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
      g.player.keys.clear(); g.player.touchMove.f = 0; g.player.touchMove.s = 0;
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined; g.player.flying = false;
      // UN PORT FABRIQUÉ : un quai de pierre jusqu'à douze blocs, puis un
      // bassin en eau. On ne cherche pas un vrai rivage — il faut la MÊME
      // situation à tous les coups (leçon des poissons, v233). Et il se bâtit
      // AU-DESSUS du relief, comme la piste des témoins d'avion : le relief
      // naturel n'est jamais plat sur cinquante blocs.
      const x0 = 31200, z0 = 31500, W = 8, QUAI = 12;
      let y0 = 0;
      for (let d = -8; d <= 44; d += 4) for (let w = -W; w <= W; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 2;                       // le quai
      const surface = y0 - 1;        // la surface de l'eau, un bloc plus bas
      const fond = y0 - 5;
      const pose = [];
      const mettre = (x, y, z, id) => { g.world.setBlock(x, y, z, id); pose.push([x, y, z]); };
      for (let d = -8; d <= 44; d++) for (let w = -W; w <= W; w++) {
        if (d <= QUAI) for (let y = fond; y <= y0; y++) mettre(x0 + d, y, z0 + w, BLOCK.STONE);
        else {
          mettre(x0 + d, fond, z0 + w, BLOCK.STONE);
          for (let y = fond + 1; y <= surface; y++) mettre(x0 + d, y, z0 + w, BLOCK.WATER);
          mettre(x0 + d, y0, z0 + w, 0);
        }
        for (let h = 1; h <= 8; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) mettre(x0 + d, y0 + h, z0 + w, 0);
      }
      g.player.yaw = -Math.PI / 2; g.player.pitch = 0;   // cap vers +x, vers la mer
      g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
      await new Promise((f) => setTimeout(f, 1200));
      g.animalManager.invoquer('voiture', x0 + 3, z0, false, { flotte: 'berline-citadine' });
      await new Promise((f) => setTimeout(f, 800));
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 500)); }
      const rendre = async () => {
        for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 400)); }
        g.player.keys.clear();
        for (const [x, y, z] of pose) g.world.setBlock(x, y, z, 0);
      };
      // LA SONDE DIT OÙ ELLE EST (v267) : la distance au départ, la hauteur,
      // et surtout COMBIEN de blocs d'eau la voiture a au-dessus d'elle. Sans
      // ce dernier chiffre, un « tout va bien » ne prouve rien.
      const ou = () => {
        const bx = Math.floor(g.player.pos.x), bz = Math.floor(g.player.pos.z);
        let eau = 0;
        for (let y = Math.floor(g.player.pos.y); y <= surface; y++) if (g.world.getBlock(bx, y, bz) === BLOCK.WATER) eau++;
        return { d: +(g.player.pos.x - x0).toFixed(1), y: +g.player.pos.y.toFixed(1), eau, surface };
      };
      if (!auVolant()) { await rendre(); return { err: 'pas monté dans la voiture' }; }
      const depart = ou();
      g.player.keys.add('KeyW');
      // on pousse vers la mer jusqu'à ne plus avancer, borné en temps mural
      const t0 = performance.now();
      let immobile = 0, xAvant = g.player.pos.x;
      while (performance.now() - t0 < 30000 && immobile < 4) {
        await new Promise((f) => setTimeout(f, 250));
        const bouge = Math.abs(g.player.pos.x - xAvant);
        xAvant = g.player.pos.x;
        immobile = bouge < 0.02 ? immobile + 1 : 0;
      }
      const arrive = ou();
      // ET L'ON DOIT POUVOIR RECULER : « pas si l'on est déjà dedans » vaut
      // aussi pour l'eau, sinon une voiture tombée au port y reste à jamais.
      g.player.keys.delete('KeyW'); g.player.keys.add('KeyS');
      const t1 = performance.now();
      let recule = 0;
      while (performance.now() - t1 < 15000 && recule < 1) {
        await new Promise((f) => setTimeout(f, 250));
        recule = arrive.d - (g.player.pos.x - x0);
      }
      await rendre();
      return { depart, arrive, quai: QUAI, recule: +recule.toFixed(2), duree: Math.round(performance.now() - t0) };
    });
    verifier('une voiture n\'entre pas dans l\'eau — elle s\'arrête sur le quai, et elle peut reculer',
      !eau.err && !!eau.arrive && eau.arrive.eau === 0 && eau.arrive.y > eau.arrive.surface
        && eau.arrive.d > 2 && eau.arrive.d <= eau.quai + 2 && eau.recule >= 1,
      `${eau.err || ''} départ ${JSON.stringify(eau.depart)} → arrivée ${JSON.stringify(eau.arrive)} (quai jusqu'à ${eau.quai}) · reculé ${eau.recule} · ${eau.duree} ms`);

    // EN AVION : GAZ RÉDUITS, MANCHE EN AVANT, TRAIN SORTI PAR SON BOUTON — ON
    // SE POSE SOI-MÊME, SANS ✈️. Et sans le train, c'est sur le ventre.
    const manuel = await (async () => {
      const cdp = await tab.context().newCDPSession(tab);
      const dormirIci = (ms) => new Promise((f) => setTimeout(f, ms));
      const toucher = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      const prep = await tab.evaluate(async () => {
        const g = window.__game, P = window.__piste262;
        if (!P) return { err: 'pas de piste' };
        const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
        g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
        g.player.pos.set(P.x0, P.y0 + 1.01, P.z0 + 0.5); g.player.vel.set(0, 0, 0);
        g.animalManager.invoquer('avionligne', P.x0 + 3, P.z0);
        await new Promise((f) => setTimeout(f, 800));
        for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 500)); }
        if (!g.player.pilote) return { err: 'pas aux commandes' };
        // en croisière au-dessus du DÉBUT de la piste, quinze blocs de haut,
        // train rentré, manette à MI-COURSE : au-dessus du décrochage (47
        // contre 30), l'appareil tient l'air pendant les deux cycles de
        // train sans filer à sa pointe — à zéro il se posait tout seul avant
        // la phase mesurée, à vide il dépassait les trois cents blocs de pierre
        g.player.pos.set(P.x0, P.y0 + 16, P.z0 + 0.5);
        g.player.avionEtat = 'vol'; g.player.avionEnVol = true; g.player.vitesseAvion = 47; g.player.trainSorti = 0;
        g.player.gaz = 0.5;
        await new Promise((f) => setTimeout(f, 800));
        const r = document.getElementById('gaz-base').getBoundingClientRect();
        const vis = (id) => getComputedStyle(document.getElementById(id)).display;
        return { cadran: { x: r.left + r.width / 2, haut: r.top + 14, bas: r.bottom - 14 }, boutons: { train: vis('train-btn'), vol: vis('fly-btn'), gaz: vis('gaz-base') } };
      });
      if (prep.err) return prep;
      const lire = () => tab.evaluate(() => { const p = window.__game.player, P = window.__piste262; return { etat: p.avionEtat, v: +(p.vitesseAvion || 0).toFixed(1), y: +(p.pos.y - P.y0 - 1).toFixed(1), x: +(p.pos.x - P.x0).toFixed(0), train: +(p.trainSorti ?? 1).toFixed(2), gaz: p.gaz, ventre: !!p.ventre, sol: !!p.onGround }; });
      // le train, par son bouton : sorti, puis rentré, puis sorti pour se poser
      const attendreTrain = async (n) => {
        const t = Date.now(); let r = await lire();
        while (Date.now() - t < 12000 && Math.abs(r.train - n) > 0.03) { await dormirIci(200); r = await lire(); }
        return r;
      };
      await tab.evaluate(() => document.getElementById('train-btn').click());
      const trainSorti = await attendreTrain(1);
      await tab.evaluate(() => document.getElementById('train-btn').click());
      const trainRentre = await attendreTrain(0);
      await tab.evaluate(() => document.getElementById('train-btn').click());
      await attendreTrain(1);
      // les deux cycles de train ont fait deux cents blocs : on se remet
      // au-dessus du début de la piste pour la descente
      await tab.evaluate(() => { const g = window.__game, P = window.__piste262; g.player.pos.set(P.x0, P.y0 + 16, P.z0 + 0.5); g.player.vitesseAvion = 47; });
      // gaz à zéro et manche en avant (joystick tiré vers soi = descendre)
      const joy = { x: 70, y: 640, id: 1 };
      await toucher('touchStart', [joy]);
      await toucher('touchStart', [joy, { x: prep.cadran.x, y: prep.cadran.bas, id: 2 }]);
      await dormirIci(150);
      await toucher('touchMove', [{ ...joy, y: joy.y + 50 }, { x: prep.cadran.x, y: prep.cadran.bas, id: 2 }]);
      const releves = [];
      const t0 = Date.now();
      let toucheLaPiste = null, arret = null;
      while (Date.now() - t0 < 40000) {
        await dormirIci(200);
        const r = await lire(); releves.push(r);
        if (!toucheLaPiste && r.etat === 'freinage') toucheLaPiste = r;
        if (r.etat === 'sol') { arret = r; break; }
      }
      // LE DOIGT TENU EN ARRIÈRE FAIT RECULER DÈS QUE L'APPAREIL EST ARRÊTÉ
      // (v269, « le geste prime sur la consigne ») — c'est voulu, et c'est
      // ce que mesure le témoin de la marche arrière quinze lignes plus bas.
      // Lire la vitesse à l'instant où l'état passe à `sol`, doigt encore
      // posé, c'est donc un COUP DE DÉ sur un pas d'échantillonnage de deux
      // cents millisecondes : v = 0 au portail de la v272, v = −1,5 à celui
      // de la v273, sur la même physique et au même bloc de piste (x 56
      // contre 57). On relâche le joystick, on ATTEND que la vitesse se
      // pose, bornée, et l'on mesure ce qu'on annonce : l'appareil s'arrête
      // sur la piste.
      await toucher('touchEnd', []);
      let arretMs = 0;
      if (arret) {
        const t1 = Date.now();
        let r = await lire();
        while (Date.now() - t1 < 8000 && Math.abs(r.v) > 0.05) { await dormirIci(200); r = await lire(); }
        arretMs = Date.now() - t1;
        arret = r;
      }
      const avantToucher = toucheLaPiste ? releves.slice(0, releves.indexOf(toucheLaPiste)) : releves;
      await tab.evaluate(async () => {
        const g = window.__game, P = window.__piste262;
        const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
        g.player.avionEtat = 'sol'; g.player.avionEnVol = false; g.player.vitesseAvion = 0;
        for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 400)); }
        for (const [x, y, z] of P.dalle) g.world.setBlock(x, y, z, 0);
        g.player.pos.copy(P.sauve); g.player.yaw = P.yaw0; g.player.vel.set(0, 0, 0); g.player.flying = false;
      });
      return { ...prep, trainSorti, trainRentre, toucheLaPiste, arret, arretMs, descendu: avantToucher.length, gazMin: Math.min(...avantToucher.map((r) => r.gaz == null ? 9 : r.gaz)) };
    })();
    verifier('aux commandes, 🛞 sort et rentre le train — et le bouton n\'existe qu\'en avion',
      !manuel.err && manuel.boutons && manuel.boutons.train === 'flex' && manuel.boutons.vol !== 'none'
        && manuel.trainSorti && manuel.trainSorti.train >= 0.97 && manuel.trainRentre && manuel.trainRentre.train <= 0.03,
      `${manuel.err || ''} ${JSON.stringify({ boutons: manuel.boutons, sorti: manuel.trainSorti, rentre: manuel.trainRentre })}`);
    verifier('gaz réduits et manche en avant, on se pose soi-même sur la piste — sans ✈️, train sorti, jusqu\'à l\'arrêt',
      !manuel.err && manuel.gazMin === 0 && manuel.descendu >= 2 && !!manuel.toucheLaPiste
        && manuel.toucheLaPiste.train >= 0.9 && !manuel.toucheLaPiste.ventre
        && !!manuel.arret && Math.abs(manuel.arret.v) < 0.1 && Math.abs(manuel.arret.y) < 0.3,
      `${manuel.err || ''} toucher ${JSON.stringify(manuel.toucheLaPiste)} · arrêt ${JSON.stringify(manuel.arret)} en ${manuel.arretMs} ms après le relâcher · gaz min ${manuel.gazMin}`);

    // LE CADRAN DE CAP : LA VILLE VISÉE AU LOIN (v263).
    //
    // Max : « un cadran de pilote en avion : la ville visée au loin ». Aux
    // commandes, l'enfant tient le cap au joystick ; rien ne lui disait vers
    // quoi. Le cadran, en haut de l'écran et seulement aux commandes, donne
    // le cap en degrés, la ville la plus proche dans le cône devant
    // l'appareil avec sa distance, et un repère qui glisse quand on tourne.
    //
    // ON LIT CE QUE L'ENFANT VOIT — le texte du cadran — et l'on mesure ce
    // qu'il obtient : cap sur Lyon, le cadran nomme Lyon et la distance
    // DIMINUE en trois secondes de jeu (le banc rend deux images par seconde,
    // on compte en secondes de jeu, jamais au mur). Un quart de tour à
    // droite, la ville devant change et le cap affiché avance de quatre-vingt-
    // dix degrés : LE SIGNE SE REGARDE — yaw = −π/2 doit dire l'est, sinon la
    // règle glisserait à l'envers. À pied, le cadran est caché.
    //
    // Le mode pilote est posé à la main (aucun rendu de monture à mesurer
    // ici) — et comme le veut la v261, `avionEtat` est déclaré puis remis.
    const capAvion = await tab.evaluate(async () => {
      const g = window.__game;
      const lire = () => {
        const el = document.getElementById('cap-avion');
        if (!el) return { absent: true };
        const c = window.__cadranDeCap ? window.__cadranDeCap() : null;
        return {
          affiche: getComputedStyle(el).display !== 'none',
          degres: el.querySelector('#cap-degres').textContent,
          ville: el.querySelector('#cap-ville').textContent,
          repere: el.querySelector('#cap-repere').style.left,
          dehors: el.querySelector('#cap-repere').classList.contains('dehors'),
          distance: c && c.distance != null ? +c.distance.toFixed(1) : null,
          cle: c ? c.cle : null,
        };
      };
      const tenirSecondes = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => {
          cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05);
          prec = t;
          if (cumul >= n) fin(); else requestAnimationFrame(pas);
        };
        requestAnimationFrame(pas);
      });
      const deuxImages = () => new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(f)));
      try {
        const m = await import('./src/montures.js');
        const { positionDe } = await import('./src/mondes.js');
        const def = m.MONTURES.find((d) => d.key === 'avionligne');
        const P = positionDe('paris'), L = positionDe('lyon');
        const sauve = g.player.pos.clone(), yaw0 = g.player.yaw;
        g.player.keys.clear();
        g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
        await deuxImages();
        const aPied = lire();
        // Sur la ligne Paris–Lyon, aux six dixièmes du chemin, cap sur Lyon.
        const f = 0.6, x = P.x + (L.x - P.x) * f, z = P.z + (L.z - P.z) * f;
        const yawLyon = Math.atan2(-(L.x - x), -(L.z - z));
        g.player.pos.set(x, 120, z); g.player.vel.set(0, 0, 0);
        g.player.yaw = yawLyon; g.player.pitch = 0;
        g.player.flying = true; g.player.pilote = def.pilote;
        g.player.vitesseAvion = def.pilote.max; g.player.avionEnVol = true; g.player.avionEtat = 'vol';
        g.player.altitudeDecollage = -999; g.player.gaz = 1;
        await deuxImages();
        const depart = { ...lire(), x: +g.player.pos.x.toFixed(1), z: +g.player.pos.z.toFixed(1) };
        await tenirSecondes(3);
        const apres = { ...lire(), x: +g.player.pos.x.toFixed(1), z: +g.player.pos.z.toFixed(1) };
        // un quart de tour à droite : le nez passe de 152° à 62°
        g.player.yaw = yawLyon + Math.PI / 2;
        await deuxImages();
        const tourne = lire();
        // et l'est, pour le signe : yaw = −π/2 regarde +x
        g.player.yaw = -Math.PI / 2;
        await deuxImages();
        const est = lire();
        // on rend tout
        g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
        g.player.vitesseAvion = undefined; g.player.gaz = null; g.player.flying = false;
        g.player.pos.copy(sauve); g.player.yaw = yaw0; g.player.vel.set(0, 0, 0);
        await deuxImages();
        const rendu = lire();
        return { aPied, depart, apres, tourne, est, rendu, parcouru: +Math.hypot(apres.x - depart.x, apres.z - depart.z).toFixed(1) };
      } catch (e) { return { err: String(e && e.message || e) }; }
    });
    const cadranOk = (r) => r && !r.absent && r.affiche;
    verifier('aux commandes, cap sur Lyon, le cadran nomme Lyon avec sa distance — et la distance diminue en volant',
      !capAvion.err && cadranOk(capAvion.depart) && capAvion.depart.cle === 'lyon' && /Lyon/.test(capAvion.depart.ville)
        && /km/.test(capAvion.depart.ville) && !capAvion.depart.dehors
        && cadranOk(capAvion.apres) && capAvion.apres.cle === 'lyon'
        && capAvion.parcouru > 100 && capAvion.apres.distance < capAvion.depart.distance - 100,
      `${capAvion.err || ''} départ ${JSON.stringify(capAvion.depart)} · après ${JSON.stringify(capAvion.apres)} · parcouru ${capAvion.parcouru}`);
    verifier('un quart de tour à droite : le cap avance de 90° et une autre ville passe devant ; vers +x le cadran dit l\'est',
      !capAvion.err && cadranOk(capAvion.tourne) && capAvion.tourne.cle !== 'lyon'
        && /^152°/.test(capAvion.depart.degres) && /^062°/.test(capAvion.tourne.degres)
        && /^090° E/.test(capAvion.est.degres),
      `${capAvion.err || ''} départ ${capAvion.depart && capAvion.depart.degres} · tourné ${JSON.stringify(capAvion.tourne)} · est ${JSON.stringify(capAvion.est)}`);
    verifier('à pied, le cadran de cap est caché',
      !capAvion.err && capAvion.aPied && !capAvion.aPied.absent && !capAvion.aPied.affiche
        && capAvion.rendu && !capAvion.rendu.affiche,
      `${capAvion.err || ''} à pied ${JSON.stringify(capAvion.aPied)} · rendu ${JSON.stringify(capAvion.rendu)}`);

    // LES FLAMMES DES RÉACTEURS (v264).
    //
    // Max, capture du chasseur en vol : « voir les flammes sortir du réacteur
    // quand l'avion se déplace ». Une flamme par tuyère — deux pour l'avion
    // de ligne, quatre pour le Concorde, une pour le chasseur — dont la
    // longueur suit la MANETTE : rien à l'arrêt moteurs coupés, longue à
    // pleins gaz, plus courte quand on réduit.
    //
    // On lit CE QUI EST DESSINÉ : les maillages de flamme du modèle
    // (`userData.tuyeres`, visibles ou non, et leur longueur rendue). Le
    // compte se lit sur les trois fabriques sans page ; le reste se monte
    // PAR LE BOUTON sur une piste, comme le trajet de la v261, parce que la
    // flamme est réglée par `fun.js` sur la monture dessinée.
    const flammes = await tab.evaluate(async () => {
      const g = window.__game;
      const { BLOCK } = await import('./src/blocks.js');
      const m = await import('./src/montures.js');
      const tenirSecondes = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => {
          cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05);
          prec = t;
          if (cumul >= n) fin(); else requestAnimationFrame(pas);
        };
        requestAnimationFrame(pas);
      });
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      const comptes = {};
      for (const k of ['avionligne', 'concorde', 'chasseur']) {
        const mesh = m.MODELES_MONTURE[k]();
        comptes[k] = (mesh.userData.tuyeres || []).length;
      }
      g.player.keys.clear();
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
      g.player.vitesseAvion = undefined; g.player.flying = false; g.player.gaz = null;
      const x0 = 30000, z0 = 30900, L = 300;
      let y0 = 0;
      for (let d = -6; d <= L; d += 4) for (let w = -4; w <= 4; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 2;
      const dalle = [];
      for (let d = -6; d <= L; d++) for (let w = -4; w <= 4; w++) {
        g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE); dalle.push([x0 + d, y0, z0 + w]);
        for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) { g.world.setBlock(x0 + d, y0 + h, z0 + w, 0); dalle.push([x0 + d, y0 + h, z0 + w]); }
      }
      const sauve = g.player.pos.clone(), yaw0 = g.player.yaw;
      g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
      g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
      await tenirSecondes(1);
      const avion = g.animalManager.invoquer('avionligne', x0 + 3, z0);
      if (!avion) return { err: 'aucun avion posé', comptes };
      await tenirSecondes(0.5);
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await tenirSecondes(0.5); }
      if (!g.player.pilote) return { err: 'on n\'est pas aux commandes', comptes };
      const lire = () => (avion.mesh.userData.tuyeres || []).map((f) => ({ visible: f.visible, long: +f.scale.z.toFixed(2) }));
      await tenirSecondes(0.6);
      const arret = { v: +(g.player.vitesseAvion || 0).toFixed(1), gaz: g.player.gaz, flammes: lire() };
      // ✈️ : pleins gaz, et l'on monte
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
      let t = 0, vol = null;
      while (t < 20 && !vol) { await tenirSecondes(0.2); t += 0.2; if (g.player.avionEtat === 'vol') vol = { t: +t.toFixed(1), v: +(g.player.vitesseAvion || 0).toFixed(1), flammes: lire() }; }
      // la manette : pleins gaz, puis réduits
      g.player.gaz = 1; await tenirSecondes(0.4);
      const pleinsGaz = lire();
      g.player.gaz = 0.2; await tenirSecondes(0.4);
      const reduits = lire();
      // on redescend : les flammes s'éteignent avec le mode pilote
      g.player.pos.set(x0 + 40, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
      g.player.avionEtat = 'sol'; g.player.avionEnVol = false; g.player.vitesseAvion = 0; g.player.gaz = null;
      await tenirSecondes(0.3);
      for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenirSecondes(0.5); }
      await tenirSecondes(0.3);
      const descendu = { auVolant: auVolant(), flammes: lire() };
      for (const [x, y, z] of dalle) g.world.setBlock(x, y, z, 0);
      g.player.pos.copy(sauve); g.player.yaw = yaw0; g.player.vel.set(0, 0, 0); g.player.flying = false;
      g.player.avionEtat = undefined; g.player.gaz = null;
      return { comptes, arret, vol, pleinsGaz, reduits, descendu };
    });
    const toutes = (l, f) => Array.isArray(l) && l.length > 0 && l.every(f);
    verifier('chaque réacteur a sa tuyère : deux sur l\'avion de ligne, quatre sur le Concorde, une sur le chasseur',
      !flammes.err && flammes.comptes && flammes.comptes.avionligne === 2 && flammes.comptes.concorde === 4 && flammes.comptes.chasseur === 1,
      `${flammes.err || ''} ${JSON.stringify(flammes.comptes)}`);
    verifier('à l\'arrêt moteurs coupés, aucune flamme ; en vol, une flamme derrière chaque tuyère',
      !flammes.err && flammes.arret && flammes.arret.flammes.length === 2 && flammes.arret.flammes.every((f) => !f.visible)
        && !!flammes.vol && toutes(flammes.vol.flammes, (f) => f.visible && f.long > 0.5),
      `${flammes.err || ''} arrêt ${JSON.stringify(flammes.arret)} · vol ${JSON.stringify(flammes.vol)}`);
    verifier('la flamme suit la manette — plus longue à pleins gaz, plus courte réduite — et s\'éteint quand on descend',
      !flammes.err && toutes(flammes.pleinsGaz, (f) => f.visible) && toutes(flammes.reduits, (f) => f.visible)
        && flammes.pleinsGaz[0].long > flammes.reduits[0].long * 1.8
        && flammes.descendu && !flammes.descendu.auVolant && toutes(flammes.descendu.flammes, (f) => !f.visible),
      `${flammes.err || ''} pleins gaz ${JSON.stringify(flammes.pleinsGaz)} · réduits ${JSON.stringify(flammes.reduits)} · descendu ${JSON.stringify(flammes.descendu)}`);

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

    // LES COMMANDES DE BORD SONT UN SEUL INSTRUMENT (v265).
    //
    // Max, capture d'iPhone : « button pour les roues mal placé, pas
    // élégant ». Mesuré sur la capture, écran de 430 × 932 : ✈️ et 🛞
    // flottaient en plein ciel à 340 px du bas, VINGT PIXELS AU-DESSUS de la
    // manette et dans DEUX colonnes différentes (x 346 et x 270) ; et le
    // compteur « 684 km/h » vivait DANS la manette, replié sur deux lignes
    // sous le curseur blanc.
    //
    // Ce que le témoin dit, et pourquoi c'est formulé ainsi :
    //   — les deux boutons partagent une colonne (même x) ;
    //   — aucune commande ne dépasse le HAUT de la manette : c'est la façon
    //     exacte de dire « rien ne flotte », et elle ne dépend pas de la
    //     taille de l'écran, contrairement à « dans le tiers du bas » — que
    //     le code neuf aurait raté sur le 420 × 760 du banc ;
    //   — le compteur est HORS de la manette, donc jamais sous le curseur ;
    //   — chaque bouton porte un mot, et le mot dit l'état (un pictogramme
    //     de roue ne se devine pas à sept ans) ;
    //   — rien ne recouvre « Descendre ».
    const bord = await (async () => {
      const prep = await tab.evaluate(async () => {
        const g = window.__game;
        const { BLOCK } = await import('./src/blocks.js');
        const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
        for (const a of [...g.animalManager.animals]) if (a.def.key === 'voiture' || a.def.pilote) { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
        g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined; g.player.flying = false;
        const x0 = 30000, z0 = 31600;
        let y0 = 0;
        for (let d = -6; d <= 40; d += 2) for (let w = -6; w <= 6; w += 2) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
        y0 += 2;
        const dalle = [];
        for (let d = -6; d <= 40; d++) for (let w = -6; w <= 6; w++) {
          g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE); dalle.push([x0 + d, y0, z0 + w]);
          for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) { g.world.setBlock(x0 + d, y0 + h, z0 + w, 0); dalle.push([x0 + d, y0 + h, z0 + w]); }
        }
        window.__dalle265 = { x0, y0, z0, dalle, sauve: g.player.pos.clone(), yaw0: g.player.yaw };
        g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
        g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
        await new Promise((f) => setTimeout(f, 1200));
        g.animalManager.invoquer('chasseur', x0 + 3, z0);
        await new Promise((f) => setTimeout(f, 800));
        for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 500)); }
        if (!g.player.pilote) return { err: 'pas aux commandes' };
        await new Promise((f) => setTimeout(f, 700));
        const boite = (id) => {
          const e = document.getElementById(id);
          if (!e) return null;
          const st = getComputedStyle(e), b = e.getBoundingClientRect();
          if (st.display === 'none' || b.width === 0) return null;
          return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
        };
        const mot = (id) => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none' ? e.textContent : null; };
        const gv = document.getElementById('gaz-val');
        const nb = gv ? gv.querySelector('b') : null;
        return {
          vue: { w: innerWidth, h: innerHeight },
          gaz: boite('gaz-base'), val: boite('gaz-val'), vol: boite('fly-btn'),
          train: boite('train-btn'), cible: boite('fun-target'),
          mots: { vol: mot('fly-lb'), train: mot('train-lb') },
          nombre: nb ? { texte: nb.textContent, deborde: nb.scrollWidth > nb.clientWidth + 1 } : null,
        };
      });
      await tab.evaluate(async () => {
        const g = window.__game, P = window.__dalle265;
        if (!P) return;
        const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
        for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await new Promise((f) => setTimeout(f, 400)); }
        for (const [x, y, z] of P.dalle) g.world.setBlock(x, y, z, 0);
        g.player.pos.copy(P.sauve); g.player.yaw = P.yaw0; g.player.vel.set(0, 0, 0); g.player.flying = false;
      });
      return prep;
    })();
    const croise = (a, b) => !!a && !!b
      && Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x)
      && Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y);
    const hautGaz = bord.gaz ? bord.gaz.y : 0;
    verifier('aux commandes, ✈️ et 🛞 tiennent dans une seule colonne collée à la manette — rien ne flotte',
      !bord.err && !!bord.gaz && !!bord.vol && !!bord.train
      && bord.vol.x === bord.train.x
      && bord.vol.y >= hautGaz && bord.train.y >= hautGaz
      && bord.vol.y + bord.vol.h <= bord.gaz.y + bord.gaz.h
      && bord.train.y + bord.train.h <= bord.gaz.y + bord.gaz.h
      && bord.gaz.x - (bord.vol.x + bord.vol.w) < 30 && bord.gaz.x > bord.vol.x,
      `${bord.err || ''} ${JSON.stringify({ vue: bord.vue, gaz: bord.gaz, vol: bord.vol, train: bord.train })}`);
    verifier('la vitesse se lit hors de la manette, sur une ligne, et rien ne recouvre « Descendre »',
      !bord.err && !!bord.val && !croise(bord.val, bord.gaz)
      && !!bord.nombre && !bord.nombre.deborde
      && !croise(bord.cible, bord.gaz) && !croise(bord.cible, bord.vol) && !croise(bord.cible, bord.train)
      && !croise(bord.cible, bord.val),
      `${bord.err || ''} ${JSON.stringify({ val: bord.val, gaz: bord.gaz, cible: bord.cible, nombre: bord.nombre })}`);
    verifier('et chaque bouton dit ce qu\'il fait : au sol on DÉCOLLE, et le train est SORTI',
      !bord.err && bord.mots && bord.mots.vol === 'DÉCOLLER' && bord.mots.train === 'SORTI',
      `${bord.err || ''} ${JSON.stringify(bord.mots)}`);

    // UN AVION NE SE POSE PAS DANS L'EAU (v267).
    //
    // Max : « un avion ne peut pas atterrir dans l'eau ». `sommetColonne`
    // cherche le premier bloc SOLIDE en descendant, et l'eau n'en est pas
    // un : au-dessus de la mer elle rend le FOND. Mesuré au large de Nice
    // (sonde `v267/sonde-eau`), avion de ligne en finale : posé à y = 25,
    // SOUS CINQ BLOCS D'EAU, état `sol`, à rouler au fond de la
    // Méditerranée.
    //
    // ET LA SONDE A MENTI AU PREMIER TOUR, ce qui vaut d'être écrit : elle
    // volait vers -z, c'est-à-dire vers Nice, et l'appareil rejoignait la
    // côte en descendant — elle concluait « tout va bien » en ne mesurant
    // pas l'eau, et elle ne relevait même pas sa position. Une sonde qui
    // juge un terrain dit OÙ elle était quand elle l'a jugé.
    //
    // Le témoin part donc au large, cap au SUD, et vérifie ce qu'un enfant
    // voit : l'appareil ne descend pas sous la surface, il repasse en vol.
    const surLEau = await tab.evaluate(async () => {
      const g = window.__game;
      const m = await import('./src/montures.js');
      const { BLOCK } = await import('./src/blocks.js');
      const { WATER_LEVEL } = await import('./src/world.js');
      const { positionDe } = await import('./src/mondes.js');
      const def = m.MONTURES.find((d) => d.key === 'avionligne');
      const patienter = (ms) => new Promise((fin) => {
        const t0 = performance.now();
        const tic = () => (performance.now() - t0 < ms ? requestAnimationFrame(tic) : fin());
        requestAnimationFrame(tic);
      });
      const eauEn = (x, z) => {
        const sol = g.world.sommetColonne(Math.floor(x), Math.floor(z));
        return g.world.getBlock(Math.floor(x), sol + 1, Math.floor(z)) === BLOCK.WATER;
      };
      const N = positionDe('nice');
      let mer = null;
      for (let d = 20; d < 400 && !mer; d += 10) {
        if (eauEn(N.x, N.z + d)) mer = { x: Math.round(N.x), z: Math.round(N.z + d) };
      }
      if (!mer) return { err: 'pas de mer au sud de Nice' };
      g.player.pos.set(mer.x, 60, mer.z);
      g.player.vel.set(0, 0, 0); g.player.yaw = Math.PI; g.player.pitch = 0;
      g.player.flying = true;
      g.player.pilote = def.pilote;
      g.player.vitesseAvion = def.pilote.approche;
      g.player.avionEnVol = true; g.player.avionEtat = 'atterrissage';
      g.player.trainVoulu = true; g.player.trainSorti = 1;
      g.player.altitudeDecollage = -999;
      let plusBas = Infinity, pose = null, remise = false;
      const surAvion = g.player.surAvion;
      g.player.surAvion = (quoi) => { if (quoi === 'remiseDesGaz') remise = true; if (surAvion) surAvion(quoi); };
      for (let n = 0; n < 30 && !pose; n++) {
        await patienter(500);
        plusBas = Math.min(plusBas, g.player.pos.y);
        if (g.player.avionEtat === 'sol' || g.player.avionEtat === 'freinage') {
          pose = { y: +g.player.pos.y.toFixed(1), x: Math.round(g.player.pos.x), z: Math.round(g.player.pos.z),
            surEau: eauEn(g.player.pos.x, g.player.pos.z) };
        }
      }
      const out = {
        mer, WATER_LEVEL, plusBas: +plusBas.toFixed(1), pose, remise,
        etat: g.player.avionEtat,
        finSurEau: eauEn(g.player.pos.x, g.player.pos.z),
        x: Math.round(g.player.pos.x), z: Math.round(g.player.pos.z),
      };
      g.player.surAvion = surAvion;
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
      g.player.vitesseAvion = undefined; g.player.flying = false;
      return out;
    });
    verifier('en finale au-dessus de la mer, l\'avion ne se pose pas dans l\'eau — il remet les gaz',
      !surLEau.err && surLEau.finSurEau && !surLEau.pose
      && surLEau.plusBas > surLEau.WATER_LEVEL && surLEau.remise,
      `${surLEau.err || ''} ${JSON.stringify(surLEau)}`);

    // LE COMPTEUR DIT LA VRAIE VITESSE DE L'APPAREIL (v267).
    //
    // Max : « peut-être fake la vraie vitesse, mais quand ton avion de chasse
    // vole il devrait voler à une vitesse supersonique ; idem, un Concorde ça
    // ne vole pas à 500 km/h ». Il faisait `blocs par seconde × 3,6`, soit un
    // bloc pour un mètre — ce qu'un bloc ne vaut nulle part ici : 432 km/h
    // pour un long courrier, 576 pour un Concorde. La vraie croisière vit
    // dans la fiche (`kmh`) et l'affichage en prend la fraction atteinte ;
    // ce qui se DÉPLACE ne change pas d'un bloc.
    //
    // On lit le COMPTEUR RENDU, pas la fiche : c'est ce que l'enfant voit,
    // et c'est ce qui rougit si quelqu'un débranche l'affichage.
    const compteurs = await tab.evaluate(async () => {
      const g = window.__game;
      const m = await import('./src/montures.js');
      const lire = () => {
        const e = document.getElementById('gaz-val');
        const b = e && e.querySelector('b'), s = e && e.querySelector('small');
        return { n: b ? +b.textContent : null, unite: s ? s.textContent : null };
      };
      const out = {};
      for (const key of ['avionligne', 'concorde', 'chasseur']) {
        const def = m.MONTURES.find((d) => d.key === key);
        g.player.flying = true;
        g.player.pilote = def.pilote;
        g.player.avionEnVol = true; g.player.avionEtat = 'vol';
        g.player.vitesseAvion = def.pilote.max;      // pleins gaz
        g.player.gaz = 1;
        if (window.__majBoutonsVehicule) window.__majBoutonsVehicule();
        out[key] = lire();
      }
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
      g.player.vitesseAvion = undefined; g.player.gaz = null; g.player.flying = false;
      return out;
    });
    const MACH = 1235;
    verifier('à pleins gaz, le Concorde et le chasseur passent le mur du son, l\'avion de ligne non',
      compteurs.concorde && compteurs.chasseur && compteurs.avionligne
      && compteurs.concorde.n > MACH && /^Mach /.test(compteurs.concorde.unite)
      && compteurs.chasseur.n > MACH && /^Mach /.test(compteurs.chasseur.unite)
      && compteurs.avionligne.n > 800 && compteurs.avionligne.n < MACH
      && compteurs.avionligne.unite === 'km/h',
      JSON.stringify(compteurs));

    // LE BRUIT DU MOTEUR ET LA RADIO (v268).
    //
    // Max : « les véhicules, on devrait avoir un bruit ambiant. Quand on
    // rentre dans une voiture, on devrait avoir un bruit de radio, un petit
    // peu comme dans GTA. »
    //
    // UN TÉMOIN DE SON LIT DES ÉCHANTILLONS, JAMAIS UN DRAPEAU. `etatSon()`
    // dirait « radio : Nuit Cubique » même si plus un seul oscillateur
    // n'était branché — c'est exactement la mort de `__lumiere()`, deux fois
    // (v247, v251), pour avoir publié un mécanisme au lieu de ce qui
    // s'entend. On accroche donc un analyseur à la SORTIE du jeu et l'on
    // mesure l'énergie qui y passe : silence à pied, énergie au volant,
    // silence de nouveau à la descente.
    //
    // Mesuré à la sonde AVANT d'écrire ce témoin : sur ce banc, sans
    // périphérique de son, le contexte est bien `running`, son horloge
    // avance (1,25 s en 1,2 s de vraie vie) et un analyseur rend 0,212 pour
    // une sinusoïde d'amplitude 0,3 — soit 0,3/√2 au millième près. Sans
    // cette mesure, un témoin d'énergie aurait mesuré le banc.
    const sons = await tab.evaluate(async () => {
      const g = window.__game;
      if (!window.__sons) return { err: 'pas de module de son' };
      const { BLOCK } = await import('./src/blocks.js');
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      const ctx = window.__sons.contexte();
      const sortie = window.__sons.sortie();
      if (!ctx || !sortie) return { err: 'pas de contexte audio' };
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      sortie.connect(an);                 // une prise, pas un passage
      const buf = new Float32Array(an.fftSize);
      // LE PIRE D'UNE FENÊTRE, PAS UN INSTANTANÉ : la radio a des silences
      // entre deux notes, et un instantané sur ce qui bouge est un pile ou
      // face (leçon des poissons, v233).
      const energie = async (secondes) => {
        let fort = 0;
        for (let t = 0; t < secondes; t += 0.1) {
          an.getFloatTimeDomainData(buf);
          let somme = 0;
          for (const v of buf) somme += v * v;
          fort = Math.max(fort, Math.sqrt(somme / buf.length));
          await tenir(0.1);
        }
        return +fort.toFixed(4);
      };
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      // une dalle de pierre bien à l'écart, comme les témoins de vol
      const x0 = 30000, z0 = 31400;
      let y0 = 0;
      for (let d = -6; d <= 10; d += 2) for (let w = -6; w <= 6; w += 2) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 2;
      for (let d = -6; d <= 10; d++) for (let w = -6; w <= 6; w++) {
        g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
        for (let h = 1; h <= 4; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
      }
      g.player.keys.clear();
      g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
      g.player.vitesseAvion = undefined; g.player.flying = false; g.player.gaz = null;
      g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
      g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
      await tenir(1);
      const aPied = await energie(1.2);
      const voiture = g.animalManager.invoquer('voiture', x0 + 3, z0);
      if (!voiture) return { err: 'aucune voiture posée', aPied };
      await tenir(0.5);
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
      if (!auVolant()) return { err: 'on n\'est pas au volant', aPied };
      await tenir(0.8);
      const auRalenti = await energie(1.5);
      const station = window.__sons.station();
      // pleins gaz : le régime monte, donc l'énergie aussi
      g.player.gaz = 1;
      await tenir(1.5);
      const pleinsGaz = await energie(1.5);
      // on descend : tout doit se taire
      document.getElementById('ride-btn').click();
      await tenir(1.2);
      const apresDescente = await energie(1.2);
      const descendu = !auVolant();
      try { sortie.disconnect(an); } catch { /* déjà */ }
      g.player.gaz = null;
      return { aPied, auRalenti, pleinsGaz, apresDescente, station, descendu,
        etat: window.__sons.etat() };
    });
    // La barre est posée à la MOITIÉ de ce que le silence et le moteur
    // séparent, jamais juste au-dessus de l'un des deux : à pied on mesure
    // zéro, au ralenti quelques centièmes. Ce qui compte est le RAPPORT.
    verifier('en montant dans une voiture, on entend le moteur — et une station de radio',
      !sons.err && sons.auRalenti > 0.01 && sons.aPied < sons.auRalenti / 4 && !!sons.station,
      `${sons.err || ''} ${JSON.stringify(sons)}`);
    verifier('et en descendant, le silence revient',
      !sons.err && sons.descendu && sons.apresDescente < sons.auRalenti / 4,
      `${sons.err || ''} ${JSON.stringify(sons)}`);

    // LA MARCHE ARRIÈRE, VOITURE ET AVION (v269).
    //
    // Max : « aussi impossible de faire marche arrière avec un avion ou une
    // voiture. » L'avion ignorait purement le geste (`Math.max(0, forward)`
    // écrasait tout négatif) ; la voiture exigeait trois conditions à la
    // fois, dont ramener le cadran des gaz à zéro d'un second doigt.
    //
    // ON MESURE CE QUE L'ENFANT OBTIENT : des blocs parcourus VERS L'ARRIÈRE,
    // le cadran à sa main gauche poussé à fond d'abord — c'est la situation
    // qui ne marchait pas. Et l'on monte PAR LE BOUTON : un témoin qui pose
    // `player.pilote` à la main ne fait voler personne (v231).
    const recul = await tab.evaluate(async () => {
      const g = window.__game;
      const { BLOCK } = await import('./src/blocks.js');
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      // une dalle à l'écart, assez longue pour reculer sans rien toucher
      const x0 = 30000, z0 = 32400, L = 120;
      let y0 = 0;
      for (let d = -L; d <= L; d += 4) for (let w = -6; w <= 6; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 2;
      for (let d = -L; d <= L; d++) for (let w = -6; w <= 6; w++) {
        g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
        for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
      }
      const out = {};
      const essai = async (espece) => {
        g.player.keys.clear();
        g.player.pilote = null; g.player.avionEnVol = false; g.player.avionEtat = undefined;
        g.player.vitesseAvion = undefined; g.player.flying = false; g.player.gaz = null;
        g.player.yaw = -Math.PI / 2; g.player.pitch = 0;      // le nez vers +x
        g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
        await tenir(1);
        if (!g.animalManager.invoquer(espece, x0 + 3, z0)) return { err: `pas de ${espece}` };
        await tenir(0.5);
        for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
        if (!auVolant()) return { err: `pas monté sur ${espece}` };
        await tenir(0.6);
        // ON LANCE L'APPAREIL PAR LA COMMANDE QU'IL A VRAIMENT (v272). Une
        // voiture n'a plus de cadran — décision de Max — donc on la lance au
        // JOYSTICK, ce qu'un enfant fait. L'avion, lui, garde la situation de
        // Max : le cadran a servi, il reste où on l'a laissé, et la marche
        // arrière devenait impossible.
        const auCadran = espece !== 'voiture';
        if (auCadran) g.player.gaz = 1;
        else g.player.touchMove = { f: 1, s: 0 };
        await tenir(1.2);
        const vitesse0 = () => (espece === 'voiture' ? (g.player.vitesseVoiture || 0) : (g.player.vitesseAvion || 0));
        let lance = 0, monte = 0;
        while (monte < 8 && lance < 1) { await tenir(0.3); monte += 0.3; lance = Math.abs(vitesse0()); }
        // LE RECUL SE MESURE DEPUIS LE POINT DE REBROUSSEMENT — FREINER,
        // C'EST ENCORE AVANCER (v272). Le premier jet séparait les deux phases
        // en attendant l'arrêt sur `vitesseAvion` : au portail elle est
        // retombée à zéro alors que l'appareil bougeait encore, l'attente est
        // sortie tout de suite, et le témoin a relevé « recule −2,2 » sur une
        // physique juste — verte au portail d'avant, sur le même code. Un SENS
        // ne se lit pas entre deux instants choisis : il se lit entre le point
        // le plus AVANCÉ atteint et le point final. Aucune cadence de banc ne
        // peut le fausser, et sur la version publiée — qui ne recule jamais —
        // ce point est toujours le point courant, donc le recul reste nul.
        g.player.touchMove = { f: -1, s: 0 };
        const xAvant = g.player.pos.x;
        let xMax = xAvant, recule = 0, attente = 0;
        while (attente < 14 && recule <= 1.2) {
          await tenir(0.3);
          attente += 0.3;
          if (g.player.pos.x > xMax) xMax = g.player.pos.x;
          recule = xMax - g.player.pos.x;     // le nez est vers +x
        }
        const freine = +(xMax - xAvant).toFixed(2);
        const gazApres = g.player.gaz;
        g.player.touchMove = { f: 0, s: 0 };
        await tenir(0.4);
        document.getElementById('ride-btn').click();
        await tenir(0.8);
        return { recule: +recule.toFixed(2), gazApres, freine, descendu: !auVolant(),
          lance: +lance.toFixed(2), attente: +attente.toFixed(1) };
      };
      out.voiture = await essai('voiture');
      out.avion = await essai('avionligne');
      g.player.keys.clear(); g.player.gaz = null;
      return out;
    });
    // LA MOITIÉ D'UNE MESURE FAITE SUR UNE MACHINE QUI RESPIRE NE VAUT PAS LA
    // MOITIÉ AU PORTAIL — et ces bornes viennent de l'apprendre. Mon premier
    // jet appliquait bien la règle de la v237 (la moitié du mesuré) sur une
    // sonde jouée SEULE, machine au repos : 6,91 blocs pour la voiture, donc
    // barre à 3. La même voiture rend 3,90 au portail complet et 2,51 rejouée
    // seule après un portail — trois mesures de la MÊME physique, dans un
    // rapport de un à trois, parce que ce qui varie est la cadence du banc et
    // que le recul se mesure sur trois secondes de temps réel. Barre à 3 :
    // rouge sur du code sain.
    //
    // CE QUE CE TÉMOIN DOIT SÉPARER, C'EST UN SIGNE, PAS UNE AMPLITUDE. Sur
    // la version publiée la voiture AVANCE de 18,43 blocs et l'avion de 12,5,
    // cadran resté à fond, l'attente de l'arrêt expirant à ses huit secondes.
    // Entre « recule d'un bloc » et « avance de dix-huit », aucune cadence de
    // banc ne peut se tromper. Ce qui prouve que la MESURE A EU LIEU, ce n'est
    // pas la distance : c'est `arretEn` (l'attente n'a pas expiré) et
    // `gazApres === 0` (le geste a bien repris la main sur le cadran). La
    // borne de distance, elle, ne fait que vérifier le sens — un bloc, soit la
    // moitié de la PIRE des trois mesures, et non la moitié de la meilleure.
    //
    // CE QUI PROUVE QUE LA MESURE A EU LIEU DÉPEND DE LA COMMANDE (v272). Pour
    // l'avion c'est `gazApres === 0` : le geste a repris la main sur le
    // cadran. Une voiture n'en a plus — son cadran reste donc à `null` — et ce
    // qui prouve la mesure, c'est qu'elle ait été LANCÉE au joystick
    // (`lance`) avant de reculer ; `freine` dit ce que le freinage a encore
    // coûté de blocs vers l'avant avant le rebroussement.
    verifier('lancée au joystick, tirer le joystick en arrière fait RECULER la voiture',
      !recul.voiture.err && recul.voiture.recule > 1 && recul.voiture.gazApres == null
      && recul.voiture.lance > 1,
      JSON.stringify(recul.voiture));
    verifier('et un avion se repousse au sol au lieu de rester planté',
      !recul.avion.err && recul.avion.recule > 0.5 && recul.avion.gazApres === 0,
      JSON.stringify(recul.avion));

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
