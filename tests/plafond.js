// Le plafond du monde : on l'a relevé, et le sol ne doit pas avoir bougé.
//
// Le monde s'arrêtait à quatre-vingt-seize blocs de haut. C'était assez pour
// une maison, pas pour une tour Eiffel. Il monte maintenant à cent soixante.
//
// Le danger n'est pas dans le ciel qu'on ouvre : il est dans le sol. Des
// mondes existent déjà, avec des milliers de blocs posés par les enfants, et
// chacun est repéré par ses coordonnées absolues. Que le relief se décale
// d'un seul bloc, et une maison se retrouve enterrée ou suspendue en l'air.
// C'est irrattrapable — personne ne peut deviner où elle était.
//
// Ces témoins gardent donc deux choses, dans cet ordre d'importance : que le
// paysage engendré est resté exactement le même, et qu'on peut désormais
// bâtir bien plus haut.
//
//     cd tests && npm install && npm run plafond

const { Banc, dormir } = require('./banc.js');
const { createHash } = require('crypto');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

// L'empreinte du relief, sur deux cent mille colonnes réparties sur toute la
// carte.
//
// Si ce chiffre change, c'est que le terrain engendré n'est plus le même —
// donc que tous les mondes déjà sauvegardés viennent de se décaler. Ce n'est
// pas une valeur à mettre à jour d'un revers de main : c'est une décision, et
// elle se paie en maisons perdues.
//
// **Elle a changé une fois**, en v161, pour Washington : bâtir une capitale de
// cent soixante-quinze blocs de large déplace forcément le sol sous elle. C'est
// l'exception que Max a accordée pour la remise à plat de la carte sur la vraie
// géographie — « on peut se permettre de casser certaines choses pour refaire
// bien le fond ». Ancienne valeur, pour mémoire :
// eb490353e3ffb238d8090c0854f9654045ff6bef.
const EMPREINTE_RELIEF = 'b29a76348ff4b20a5827ba585b65d1786f19131b';

// ET CELLE-CI, ELLE, N'A PAS LE DROIT DE BOUGER.
//
// La même empreinte, en retirant les colonnes que Washington touche. C'est
// elle qui prouve que la casse est CONFINÉE : hors de la zone d'influence de
// la capitale — fondu du pourtour compris — le paysage est identique au bloc
// près à ce qu'il était avant. Le point d'apparition, le musée et le quartier
// des enfants sont dehors, et c'est vérifié plus bas.
//
// Autrement dit : la première empreinte dit « on a bâti une ville », la
// seconde dit « et on n'a rien cassé ailleurs ». C'est la seconde qui protège
// les maisons de Marlon et d'Alice.
const EMPREINTE_HORS_WASHINGTON = '7c3324fd0611e3c59513c2a22a0200f0d2e3fa33';

// Quelques colonnes nommées, pour que l'échec dise quelque chose de lisible.
const COLONNES = [
  [0, 0, 33], [40, -20, 42], [-240, 200, 34], [400, 110, 35], [112, 210, 34],
  [-140, 420, 53], [60, -190, 35], [620, 80, 37], [250, 205, 34], [-140, 80, 35],
  [-420, 300, 34], [450, 420, 36], [-520, -480, 41],
  [-100, -100, 26], [300, -300, 24], [-64, 16, 46],
  // (100, 100) et (16, 64) étaient ici, à 26 et 35. Washington est passée
  // dessus : la première est sur Capitol Hill, la seconde sur les hauteurs du
  // nord-est. On les garde, avec leurs nouvelles cotes — c'est plus parlant
  // que de les effacer, et si elles rebougeaient un jour, on le saurait.
  [100, 100, 36], [16, 64, 37],
];

// Une maison telle que l'aurait sauvegardée la version d'avant : des
// coordonnées absolues, et rien d'autre. Le sol est à 26 autour de
// (-100, -100) ; le plancher repose donc sur 27.
//
// Loin du point d'apparition, volontairement : bâtie à l'origine, elle
// enfermait l'enfant dans ses propres murs dès l'ouverture du monde, et c'est
// le test qui fabriquait la panne qu'il croyait mesurer. Elle était en
// (100, 100) jusqu'à ce que Washington s'y installe — un témoin qui prouve
// qu'une maison ne bouge pas ne peut pas être bâti sous une ville neuve.
const MAISON_X = -100, MAISON_Z = -100, SOL_MAISON = 26;
const MAISON = [];
for (let x = MAISON_X - 1; x <= MAISON_X + 1; x++) {
  for (let z = MAISON_Z - 1; z <= MAISON_Z + 1; z++) MAISON.push([x, SOL_MAISON + 1, z]);
}

(async () => {
  // --- ce qui se vérifie sans navigateur ------------------------------------
  const { World, HEIGHT, SOMMET_TERRAIN } = await import('../src/world.js');
  const w = new World();

  verifier('le ciel est monté', HEIGHT >= 160, `${HEIGHT} blocs`);
  verifier('et le sol a son propre plafond, qui ne suit pas le ciel',
    SOMMET_TERRAIN === 80, `${SOMMET_TERRAIN}`);

  const { ZONE_WASHINGTON: Z } = await import('../src/washington.js');
  const vals = [], hors = [];
  for (let x = -700; x <= 700; x += 3) {
    for (let z = -700; z <= 700; z += 3) {
      const h = w.terrainHeight(x, z);
      vals.push(h);
      if (x < Z.x0 || x > Z.x1 || z < Z.z0 || z > Z.z1) hors.push(h);
    }
  }
  const empreinte = createHash('sha1').update(vals.join(',')).digest('hex');
  verifier('le paysage est resté exactement le même',
    empreinte === EMPREINTE_RELIEF, `${vals.length} colonnes · ${empreinte.slice(0, 12)}`);
  const empreinteHors = createHash('sha1').update(hors.join(',')).digest('hex');
  verifier('et hors de Washington, il n\'a pas bougé d\'un bloc',
    empreinteHors === EMPREINTE_HORS_WASHINGTON,
    `${hors.length} colonnes · ${empreinteHors.slice(0, 12)}`);

  // Ce que la zone d'influence NE DOIT PAS toucher : les endroits où les
  // enfants ont bâti. Si l'un d'eux tombe dedans un jour, ce témoin le dira
  // avant que le sol ne se dérobe sous une maison.
  const SANCTUAIRES = [
    ['le point d\'apparition', 0, 0, 4],
    ['le quartier des enfants', 26, -14, 16],
    ['le musée', -34, 40, 10],
  ];
  const atteints = SANCTUAIRES.filter(([, x, z, r]) =>
    x + r >= Z.x0 && x - r <= Z.x1 && z + r >= Z.z0 && z - r <= Z.z1);
  verifier('et la capitale ne touche à rien de ce que les enfants ont bâti',
    atteints.length === 0, atteints.map((a) => a[0]).join(', '));

  const decalees = COLONNES.filter(([x, z, h]) => w.terrainHeight(x, z) !== h);
  verifier('aucune colonne de référence n\'a bougé', decalees.length === 0,
    JSON.stringify(decalees.map(([x, z, h]) => ({ x, z, attendu: h, trouve: w.terrainHeight(x, z) }))));

  const trop = [];
  for (let x = -700; x <= 700; x += 7) {
    for (let z = -700; z <= 700; z += 7) {
      const h = w.terrainHeight(x, z);
      if (h > SOMMET_TERRAIN) trop.push([x, z, h]);
    }
  }
  verifier('et aucune montagne n\'a poussé dans le ciel neuf', trop.length === 0,
    JSON.stringify(trop.slice(0, 3)));

  // --- ce qui se vérifie en jouant ------------------------------------------
  const banc = new Banc({ portJeu: 8327, portPairs: 9327 });
  await banc.ouvrir();
  try {
    const tab = await banc.joueur('Marlon');
    const contexte = await tab.evaluate(() => window.__game.world.ctx);

    // La maison d'avant, écrite comme l'ancienne version l'aurait laissée.
    //
    // On la sème AVANT le chargement de la page, et pas après : en quittant,
    // le jeu range le monde qu'il a en mémoire, et il écrasait la graine juste
    // posée. Semer à l'ouverture, c'est reproduire ce que vit l'enfant — une
    // sauvegarde déjà sur la tablette quand le jeu démarre.
    await tab.addInitScript(({ maison, ctx }) => {
      const tout = JSON.parse(localStorage.getItem('web-minecraft-edits-v3') || '{}');
      tout[ctx] = tout[ctx] || {};
      for (const [x, y, z] of maison) tout[ctx][`${x},${y},${z}`] = [4, 1];
      localStorage.setItem('web-minecraft-edits-v3', JSON.stringify(tout));
    }, { maison: MAISON, ctx: contexte });
    await tab.reload({ waitUntil: 'load' });
    await tab.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await tab.evaluate(() => {
      window.__game.edu.today().libreJusqua = 86400;
      document.getElementById('play-btn').click();
    });
    await tab.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    await dormir(3000);

    const maison = await tab.evaluate(({ maison, sol, ctx }) => {
      const g = window.__game;
      if (g.world.ctx !== ctx) return { contexte: g.world.ctx };
      const posees = maison.filter(([x, y, z]) => g.world.getBlock(x, y, z) === 4).length;
      const surLeSol = maison.filter(([x, y, z]) => g.world.isSolid(x, sol, z)).length;
      const enLair = maison.filter(([x, , z]) => !g.world.isSolid(x, sol, z)).length;
      return { posees, surLeSol, enLair, total: maison.length };
    }, { maison: MAISON, sol: SOL_MAISON, ctx: contexte });

    verifier('une maison sauvegardée avant le changement est toujours là',
      maison.posees === maison.total, JSON.stringify(maison));
    verifier('et elle repose toujours sur le sol, ni enterrée ni en l\'air',
      maison.enLair === 0 && maison.surLeSol === maison.total, JSON.stringify(maison));

    // Monter là où l'on ne pouvait pas aller.
    //
    // On rend d'abord le clavier au jeu : le bouton « Jouer » garde le focus
    // après un clic, et c'est LUI qui recevait la barre d'espace. Un enfant
    // touche l'écran avant de voler ; le banc doit faire pareil, sinon il
    // mesure le focus du navigateur et pas le vol.
    await tab.evaluate(() => {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.__game.player.flying = true;
    });
    await tab.keyboard.down('Space');
    // On REGARDE PENDANT que la touche est tenue, pas une fois à la fin.
    //
    // Le décollage était lu après sept cents millisecondes de montre. Or ce
    // qui fait monter le joueur, ce sont des tours d'affichage — et sur un
    // conteneur chargé, sept cents millisecondes de montre peuvent n'en
    // contenir presque aucun. Le témoin annonçait alors « vy 0 », c'est-à-dire
    // que la touche ne faisait rien, alors qu'elle n'avait pas encore eu
    // l'occasion d'agir. On lui laisse le temps de faire ses preuves, borné.
    const decolle = await (async () => {
      const fin = Date.now() + 6000;
      let e = null;
      do {
        e = await tab.evaluate(() => ({
          vy: window.__game.player.vel.y, y: window.__game.player.pos.y,
        }));
        if (e.vy > 0) return e;
        await dormir(150);
      } while (Date.now() < fin);
      return e;
    })();
    verifier('la touche « monter » fait bien décoller', decolle.vy > 0, JSON.stringify(decolle));
    await dormir(12000);
    await tab.keyboard.up('Space');
    const haut = await tab.evaluate(() => ({
      y: window.__game.player.pos.y,
      jeu: window.__game.running,
    }));
    verifier('on monte bien au-dessus de l\'ancien plafond',
      haut.y > 110, `${haut.y.toFixed(0)} blocs`);
    // Le vol n'avait aucun toit : en gardant le doigt appuyé, on sortait du
    // monde par le haut, là où poser un bloc ne fait rien, et le jeu finissait
    // par nous reposer au sol sans explication.
    verifier('mais on ne sort plus du monde par le haut',
      haut.jeu && haut.y < HEIGHT - 1, `${haut.y.toFixed(0)} pour un monde de ${HEIGHT}`);

    // Y bâtir, et retrouver ce qu'on y a bâti.
    const perchoir = await tab.evaluate(() => {
      const g = window.__game;
      const x = Math.floor(g.player.pos.x), z = Math.floor(g.player.pos.z);
      const y = Math.floor(g.player.pos.y) - 2;
      g.world.setBlock(x, y, z, 4);
      g.world.saveEdits();
      return { x, y, z };
    });
    verifier('on peut poser un bloc bien plus haut que l\'ancien monde',
      perchoir.y > 100, `y = ${perchoir.y}`);
    await dormir(1200);
    const maille = await tab.evaluate(() => window.__game.world.dirty.size);
    verifier('et le jeu le dessine sans rien laisser en attente', maille === 0,
      `${maille} morceau(x) en attente`);

    await tab.reload({ waitUntil: 'load' });
    await tab.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await tab.evaluate(() => {
      window.__game.edu.today().libreJusqua = 86400;
      document.getElementById('play-btn').click();
    });
    await tab.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    await dormir(2500);
    const retrouve = await tab.evaluate((p) => window.__game.world.getBlock(p.x, p.y, p.z), perchoir);
    verifier('ce qu\'on bâtit dans le ciel neuf est encore là au retour',
      retrouve === 4, `bloc ${retrouve} en ${perchoir.y}`);

    // La carte se dessine toujours, et n'est pas devenue noire.
    const carte = await tab.evaluate(() => {
      const c = document.getElementById('minimap-canvas') || document.querySelector('#minimap canvas');
      if (!c) return { trouvee: false };
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let somme = 0;
      for (let i = 0; i < d.length; i += 4) somme += d[i] + d[i + 1] + d[i + 2];
      return { trouvee: true, clarte: somme / (d.length / 4) / 3 };
    });
    if (carte.trouvee) {
      verifier('la carte reste éclairée comme avant', carte.clarte > 40,
        `clarté moyenne ${carte.clarte.toFixed(0)}/255`);
    }

    verifier('aucune erreur JavaScript de bout en bout', tab.erreurs.length === 0,
      JSON.stringify(tab.erreurs));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ le ciel a doublé, le sol n\'a pas bougé d\'un bloc');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
