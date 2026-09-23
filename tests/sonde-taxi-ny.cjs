// POURQUOI LE BOUTON D'EMBARQUEMENT RESTE-T-IL CACHÉ À NEW YORK ? (v291)
//
// Le témoin du taxi pose l'enfant à y = 33,01 et invoque sa voiture à trois
// blocs. Le verdict propre dit : une seule bête, bouton « 🐴 Monter » en
// display:none — donc pas à portée d'embarquement, pas « le taxi ne roule
// pas ». `invoquer` pose la bête à `sommetColonne + 1,1`, et `sommetColonne`
// rend le premier bloc SOLIDE en descendant : sur une colonne d'immeuble,
// c'est le TOIT (piège de la v282). Le garde de hauteur (|Δy| > 2,5, v201)
// la rejette alors.
//
// Cette sonde imprime les trois nombres qui distinguent les cas : le sol sous
// l'enfant, le sol sous la voiture, et la cote où la voiture atterrit.
const { Banc } = require('./banc.js');

(async () => {
  const banc = new Banc({ portJeu: 8396, portPairs: 9396 });
  await banc.ouvrir();
  try {
    const { positionDe } = await import('../src/mondes.js');
    const NY = positionDe('ny');
    const p = await banc.joueur('SondeTaxiNY', {
      carte: 'manhattan', rr: 2, tactile: true,
      viewport: { width: 700, height: 460 },
    });
    await p.locator('.who-card.active').click();
    await p.getByRole('button', { name: 'Plus tard', exact: true }).click();
    await p.locator('#play-btn').click();
    await p.waitForFunction(() => __game.running);
    const r = await p.evaluate((NY) => {
      const g = __game;
      g.player.pos.set(NY.x, 33.01, NY.z + 25);
      g.player.yaw = 0; g.player.pitch = 0; g.player.vel.set(0, 0, 0);
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const som = (x, z) => g.world.sommetColonne(Math.floor(x), Math.floor(z));
      const bete = g.animalManager.invoquer('voiture', NY.x, NY.z + 22, false,
        { flotte: 'ny-crown-victoria' });
      window.__sondeTaxi = { bete, solJ: som(NY.x, NY.z + 25), solV: som(NY.x, NY.z + 22) };
      return {
        joueurY: +g.player.pos.y.toFixed(2),
        solSousJoueur: som(NY.x, NY.z + 25),
        solSousVoiture: som(NY.x, NY.z + 22),
        beteCreee: !!bete,
        beteYaussitot: bete ? +bete.mesh.position.y.toFixed(2) : null,
      };
    }, NY);
    console.log('aussitôt : ' + JSON.stringify(r));
    // ET L'ON MESURE LA SUITE : le modèle de la flotte se charge de façon
    // ASYNCHRONE. On relève la cote du maillage et l'état du bouton pendant
    // quinze secondes — la fenêtre que le témoin s'accorde — pour distinguer
    // « le maillage se pose une image plus tard » de « il ne se pose jamais ».
    const suite = await p.evaluate(async () => {
      const dodo = (ms) => new Promise((x) => setTimeout(x, ms));
      const g = window.__game;
      const { bete, solJ } = window.__sondeTaxi;
      const releves = [];
      for (let i = 0; i < 16; i++) {
        const b = document.getElementById('ride-btn');
        releves.push({
          s: i,
          y: +bete.mesh.position.y.toFixed(2),
          x: +bete.mesh.position.x.toFixed(1),
          joueurY: +g.player.pos.y.toFixed(2),
          bouton: b ? b.textContent.trim() : null,
          vu: b ? getComputedStyle(b).display : null,
          betes: g.animalManager.animals.length,
        });
        await dodo(1000);
      }
      return { solJ, releves };
    });
    console.log('sol sous le joueur : ' + suite.solJ);
    for (const r of suite.releves) console.log('  ' + JSON.stringify(r));
  } catch (e) {
    console.log('ÉCHEC DE LA SONDE : ' + (e && e.message ? e.message : e));
  }
  process.exit(0);
})();
