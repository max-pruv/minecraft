// La carte réaliste doit rester un JEU : collisions, édition, sauvegarde,
// échange entre deux enfants et retour à la Terre. Pas un test de captures.
const { servirLeNuage } = require('./nuage.js');
const { Banc, dormir } = require('./banc.js');
const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ' — ' + detail : ''}`);
  if (!ok) echecs.push(nom);
}
(async () => {
  const banc = new Banc({ portJeu: 8359, portPairs: 9359 });
  await banc.ouvrir();
  let nuage;
  try {
    const p = await banc.joueur('UrbainTest', {
      carte: 'manhattan',
      rr: 2,
      tactile: true,
      viewport: { width: 700, height: 460 },
    });
    const existe = await p.evaluate(
      () =>
        !!window.__game.villeRealiste &&
        window.__game.world.mapId === 'manhattan-v1'
    );
    verifier('Manhattan ouvre le vrai jeu dans une carte indépendante', existe);
    // Rouge lisible sur la version précédente, sans planter sur un module absent.
    if (!existe) return;
    await p.locator('.who-card.active').click();
    await p.getByRole('button', { name: 'Plus tard', exact: true }).click();
    await p.evaluate(() => {
      __game.edu.today().libreJusqua = 86400;
    });
    await p.locator('#play-btn').click();
    await p.waitForFunction(() => __game.running);
    await p.waitForFunction(
      () =>
        __game.villeRealiste.stats.queued === 0 &&
        __game.villeRealiste.buildings.size > 0,
      null,
      { timeout: 90000 }
    );
    const protections = await p.evaluate(async () => {
      const { World, migrerLesBlocs } = await import('/src/world.js');
      const { BLOCK } = await import('/src/blocks.js');
      const w = __game.world,
        terre = new World();
      terre.setBlock(11, 35, 18, BLOCK.BRICK, 100);
      terre.saveEdits();
      const avant = JSON.stringify(World.loadAll().local);
      w.setBlock(11, 35, 18, BLOCK.DIAMOND, 200);
      w.saveEdits();
      const sauvegarde = World.loadAll();
      w.oublierLoinDe(1000, 1000, 1);
      const apresOubli = w.getBlock(11, 35, 18);
      w.switchContext('12345');
      const autre = w.getBlock(11, 35, 18);
      w.switchContext('local');
      const retour = w.getBlock(11, 35, 18);
      localStorage.removeItem('web-minecraft-carte-v1');
      migrerLesBlocs(
        () => World.loadAll(),
        (a) => World.saveAll(a)
      );
      const migration =
        JSON.stringify(World.loadAll()['manhattan-v1:local']) ===
        JSON.stringify(sauvegarde['manhattan-v1:local']);
      return {
        intact: JSON.stringify(sauvegarde.local) === avant,
        separes:
          sauvegarde.local['11,35,18'][0] === BLOCK.BRICK &&
          sauvegarde['manhattan-v1:local']['11,35,18'][0] === BLOCK.DIAMOND,
        retrouve:
          apresOubli === BLOCK.DIAMOND &&
          retour === BLOCK.DIAMOND &&
          autre !== BLOCK.DIAMOND,
        migration,
        ctx: w.ctx,
        cloud: __game.cloud.configured,
      };
    });
    verifier(
      'une construction sur la Terre reste intacte aux mêmes coordonnées',
      protections.intact && protections.separes
    );
    verifier(
      'les blocs reviennent après déchargement et changement de partie',
      protections.retrouve,
      protections.ctx
    );
    verifier(
      'la migration historique de la Terre ignore Manhattan',
      protections.migration
    );
    verifier(
      'cloud= coupe réellement les services distants pendant les essais',
      !protections.cloud
    );

    await p.evaluate(() => {
      const w = __game.world;
      w.setBlock(11, 35, 18, 0);
      const j = __game.player;
      j.flying = false;
      j.pos.set(14.5, 33.01, 14.5);
      j.vel.set(0, 0, 0);
      j.yaw = -Math.PI / 2;
      j.pitch = 0;
      j.syncCamera();
    });
    const debut = await p.evaluate(() => __game.player.pos.x);
    await p.keyboard.down('KeyW');
    await p
      .waitForFunction(() => __game.player.pos.x > 15.6, null, {
        timeout: 15000,
      })
      .catch(() => {});
    await p.keyboard.up('KeyW');
    const collision = await p.evaluate(() => ({
      x: __game.player.pos.x,
      y: __game.player.pos.y,
      running: __game.running,
    }));
    verifier(
      'le joueur avance puis s’arrête contre une façade réelle',
      collision.running && collision.x > debut + 0.2 && collision.x <= 15.71,
      JSON.stringify(collision)
    );
    // Le viseur du jeu, pas une coordonnée inventée pour le clic.
    const cible = await p.evaluate(async () => {
      const { raycastBlocks } = await import('/src/player.js');
      const THREE = await import('three');
      const g = __game;
      return raycastBlocks(
        g.world,
        g.player.eyePosition(),
        g.camera.getWorldDirection(new THREE.Vector3()),
        5.5
      );
    });
    verifier(
      'la façade détaillée est visable avec le viseur de construction',
      !!cible
    );
    if (cible) {
      const avant = await p.evaluate(() =>
        [...__game.villeRealiste.buildings.values()].reduce(
          (n, g) => n + g.userData.instances,
          0
        )
      );
      await p.touchscreen.tap(350, 230);
      await dormir(1400);
      const id = await p.evaluate(
        (c) => __game.world.getBlock(c.x, c.y, c.z),
        cible
      );
      verifier(
        'le toucher de destruction retire le bloc visé',
        id === 0,
        `bloc ${id}`
      );
      await p.waitForFunction(
        () => !__game.villeRealiste.job && !__game.villeRealiste.queue?.length,
        null,
        { timeout: 60000 }
      );
      const apres = await p.evaluate(() =>
        [...__game.villeRealiste.buildings.values()].reduce(
          (n, g) => n + g.userData.instances,
          0
        )
      );
      verifier(
        'le trou retire aussi la géométrie de façade, sans décor fantôme',
        apres < avant,
        `${avant} → ${apres} instances`
      );
    }
    // Poser au sol, par le geste de construction du jeu.
    await p.evaluate(() => {
      const j = __game.player;
      j.pos.set(3.5, 33.01, 17.5);
      j.yaw = 0;
      j.pitch = -0.8;
      j.syncCamera();
    });
    const editsAvant = await p.evaluate(() => __game.world.edits.size);
    await p.locator('#mode-btn').tap();
    await p.touchscreen.tap(350, 230);
    await dormir(500);
    verifier(
      'le toucher de construction ajoute un bloc au monde',
      await p.evaluate((n) => __game.world.edits.size > n, editsAvant)
    );

    const contenu = await p.evaluate(async () => {
      const plan = await import('/src/manhattan-plan.js');
      const routes = plan.circuitsManhattan();
      let horsRue = 0;
      for (const tr of routes)
        for (let i = 0; i < tr.pts.length; i++) {
          const a = tr.pts[i],
            b = tr.pts[(i + 1) % tr.pts.length],
            n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
          for (let j = 0; j <= n; j++) {
            const x = a.x + ((b.x - a.x) * j) / n,
              z = a.z + ((b.z - a.z) * j) / n;
            // La largeur de carrosserie est éprouvée, pas seulement son centre.
            for (const d of [-1.13, 1.13])
              if (
                __game.world.originalBlock(
                  Math.floor(x + d),
                  34,
                  Math.floor(z + d)
                )
              )
                horsRue++;
          }
        }
      return {
        n: plan.BATIMENTS.length,
        lieux: __carte.catalogueDesLieux().map((x) => x.c.name),
        routes: routes.length,
        horsRue,
        draw: __game.villeRealiste.stats.drawCalls,
        instances: [...__game.villeRealiste.buildings.values()].reduce(
          (n, g) => n + g.userData.instances,
          0
        ),
      };
    });
    verifier(
      'les quartiers et monuments sont des destinations de voyage',
      contenu.lieux.includes('Chrysler Building') &&
        contenu.lieux.includes('Central Park · The Mall') &&
        contenu.lieux.includes('Financial District'),
      `${contenu.n} bâtiments`
    );
    verifier(
      'la circulation parcourt des rues libres sur toute la largeur du véhicule',
      contenu.routes > 10 && contenu.horsRue === 0,
      `${contenu.routes} circuits, ${contenu.horsRue} collisions`
    );
    verifier(
      'les détails sont instanciés avec un budget de dessin borné',
      contenu.instances > 100 && contenu.draw < 700,
      `${contenu.draw} appels, ${contenu.instances} instances`
    );
    await p.evaluate(() => {
      __setDayTime(0.75);
    });
    await dormir(300);
    verifier(
      'les fenêtres et lampadaires s’allument réellement la nuit',
      await p.evaluate(
        () =>
          __game.villeRealiste.mats.glassLit.emissiveIntensity > 0.8 &&
          __game.villeRealiste.mats.farLimestone.emissiveIntensity > 0.7 &&
          __game.villeRealiste.lamps.some((l) => l.intensity > 0)
      )
    );
    // Le joystick conduit les mêmes personnages et véhicules que sur la Terre.
    await p.evaluate(() => {
      const g = __game;
      g.player.pos.set(-4, 33.01, 20);
      g.player.yaw = 0;
      g.player.pitch = 0;
      g.player.vel.set(0, 0, 0);
      g.animalManager.invoquer('voiture', -4, 17);
    });
    await p.locator('#ride-btn').waitFor({ state: 'visible', timeout: 15000 });
    await p.locator('#ride-btn').tap();
    const departAuto = await p.evaluate(() => __game.player.pos.z);
    const doigt = await p.context().newCDPSession(p);
    await doigt.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 100, y: 320 }],
    });
    await doigt.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 100, y: 270 }],
    });
    await p
      .waitForFunction((z) => __game.player.pos.z < z - 8, departAuto, {
        timeout: 15000,
      })
      .catch(() => {});
    await doigt.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    const trajetAuto = await p.evaluate(
      (z) => z - __game.player.pos.z,
      departAuto
    );
    verifier(
      'on monte en voiture et le joystick la fait rouler dans l’avenue',
      trajetAuto > 8,
      `${trajetAuto.toFixed(1)} mètres`
    );
    await p.locator('#ride-btn').tap();
    await p.locator('#pause-btn').click();
    await p.locator('#partage-btn').click();
    verifier(
      'le lien partagé conserve la carte Manhattan',
      (await p.locator('#partage-lien').innerText()).includes(
        '?carte=manhattan'
      )
    );
    await p.locator('#partage-close').click();
    await p.locator('#resume-btn').click();
    const memo = await p.evaluate(() => ({
      ctx: __game.world.ctx,
      edits: __game.world.exportEdits(),
    }));
    await p.evaluate(() => __game.world.saveEdits());
    await p.reload({ timeout: 90000 });
    await p.waitForFunction(() => window.__game, null, { timeout: 90000 });
    verifier(
      'recharger retrouve les modifications de Manhattan',
      await p.evaluate(
        (m) =>
          JSON.stringify(__game.world.exportEdits()) ===
            JSON.stringify(m.edits) && __game.world.ctx === m.ctx,
        memo
      )
    );
    verifier(
      'aucune erreur JavaScript ni WebGL',
      p.erreurs.length === 0 &&
        (await p.evaluate(() => __game.renderer.getContext().getError() === 0)),
      p.erreurs.join(' | ')
    );
    await p.evaluate(() => {
      __game.edu.today().libreJusqua = 0;
      __game.edu.startQuiz();
    });
    verifier(
      'le quiz éducatif reste actif dans Manhattan',
      await p.evaluate(() => __game.edu.quizActive && !__game.running)
    );
    await p.close();

    // Même code court sur les deux cartes : jamais la Terre chez Manhattan.
    nuage = await servirLeNuage(9360);
    const { p: hote, code } = await banc.creerMonde('UrbainHote', {
      carte: 'manhattan',
      rr: 2,
      tactile: true,
      portNuage: 9360,
    });
    const invite = await banc.rejoindre('UrbainAmi', code, {
      carte: 'manhattan',
      rr: 2,
      tactile: true,
      portNuage: 9360,
    });
    await hote.evaluate(() => __game.world.setBlock(8, 36, 18, 20, Date.now()));
    await invite.waitForFunction(
      () => __game.world.getBlock(8, 36, 18) === 20,
      null,
      { timeout: 30000 }
    );
    verifier(
      'deux joueurs de Manhattan échangent leurs blocs et leurs avatars',
      await invite.evaluate(
        () =>
          __game.remotePlayers.size > 0 &&
          __game.world.ctx.startsWith('manhattan-v1:')
      )
    );
    await hote.evaluate(() => __game.cloud.push());
    verifier(
      'le nuage range les blocs sous la clé de Manhattan',
      nuage.monde('manhattan-v1:' + code)?.blocks?.['8,36,18']?.[0] === 20 &&
        !nuage.monde(code)
    );
    await invite.close();
    const terre = await banc.joueur('TerreTemoin', { rr: 2, tactile: true });
    const iso = await terre.evaluate(async (code) => {
      const { NetSession } = await import('/src/net.js');
      const n = new NetSession({
        world: __game.world,
        toast() {},
        onPlayers() {},
        onState() {},
      });
      await n.start(code, true, { name: 'TerreTemoin', lookIdx: 0 });
      const r = { host: n.isHost, channel: n.channel, ctx: __game.world.ctx };
      n.stop();
      return r;
    }, code);
    verifier(
      'le même code sur la Terre ouvre un espace réseau distinct',
      iso.host && iso.channel === code && iso.ctx === 'local'
    );
    verifier(
      'les deux clients ne signalent aucune erreur de jeu',
      hote.erreurs.length === 0 && invite.erreurs.length === 0,
      [...hote.erreurs, ...invite.erreurs].join(' | ')
    );
    await terre.close();
    await hote.close();
    const horsLigne = await banc.joueur('UrbainHorsLigne', {
      carte: 'manhattan',
      rr: 2,
      tactile: true,
      avecSW: true,
    });
    await horsLigne.evaluate(() => navigator.serviceWorker.ready);
    await horsLigne.waitForFunction(
      () => navigator.serviceWorker.controller,
      null,
      { timeout: 30000 }
    );
    await horsLigne.context().setOffline(true);
    await horsLigne.reload({ timeout: 90000 });
    await horsLigne.waitForFunction(() => window.__game?.villeRealiste, null, {
      timeout: 90000,
    });
    await horsLigne.locator('.who-card.active').click();
    await horsLigne
      .getByRole('button', { name: 'Plus tard', exact: true })
      .click();
    await horsLigne.locator('#play-btn').click();
    await horsLigne.waitForFunction(() => __game.running, null, {
      timeout: 30000,
    });
    verifier(
      'Manhattan redémarre et se joue hors ligne depuis le cache PWA',
      await horsLigne.evaluate(
        () => __game.running && __game.world.mapId === 'manhattan-v1'
      )
    );
    await horsLigne.close();
  } finally {
    await banc.fermer();
    nuage?.fermer();
  }
})()
  .catch((e) => {
    console.error('💥', e);
    echecs.push(e.message);
  })
  .finally(() => {
    console.log(`\nManhattan : ${echecs.length} échec(s).`);
    process.exit(echecs.length ? 1 : 0);
  });
