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

// Combien de mètres on parcourt en tenant la touche « avance » une seconde.
async function avancerUneSeconde(p) {
  const avant = await pose(p);
  await p.keyboard.down('KeyW');
  await dormir(1000);
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
    await dormir(600);

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

    // Mais tourner le dos, c'est autre chose : le bouton doit disparaître.
    await tab.evaluate(() => { window.__game.player.yaw += Math.PI; });
    await dormir(600);
    verifier('et il s\'efface quand on tourne le dos à la bête',
      !(await bouton(tab, 'ride-btn')).visible);
    await tab.evaluate(() => { window.__game.player.yaw -= Math.PI + 0.5; });
    await dormir(600);

    // --- en selle ------------------------------------------------------------
    const aPied = await pose(tab);
    const distanceAPied = await avancerUneSeconde(tab);
    await poserDevant(tab, 'elephant');
    await dormir(600);
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(700);

    const enSelle = await pose(tab);
    verifier('en selle sur l\'éléphant, on voit par-dessus les toits',
      enSelle.oeil - enSelle.y > (aPied.oeil - aPied.y) + 2,
      `œil à ${(aPied.oeil - aPied.y).toFixed(2)} m à pied, ${(enSelle.oeil - enSelle.y).toFixed(2)} m en selle`);

    const distanceEnSelle = await avancerUneSeconde(tab);
    verifier('et on avance plus vite qu\'à pied',
      distanceEnSelle > distanceAPied * 1.2,
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
    const depart = await pose(tab);
    await dormir(2500);
    const arrivee = await pose(tab);
    const parcouru = Math.hypot(arrivee.x - depart.x, arrivee.z - depart.z);
    verifier('et le métro nous emmène pour de bon',
      parcouru > 8, `${parcouru.toFixed(1)} m en 2,5 s`);

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
