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
    const regles = await tab.evaluate(() => ({
      vise: !!window.__game.animalManager.targeted(),
      monture: !!window.__game.animalManager.monture(),
    }));
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
