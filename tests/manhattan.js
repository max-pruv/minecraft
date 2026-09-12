// Une seule Terre : vraies interactions tactiles et réseau, migration sans
// écrasement, architecture éditable et contrats des nouveaux personnages/taxis.
const { servirLeNuage } = require("./nuage.js");
const { Banc, dormir } = require("./banc.js");
const echecs = [];
function verifier(nom, ok, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${nom}${detail ? " — " + detail : ""}`);
  if (!ok) echecs.push(nom);
}
(async () => {
  const banc = new Banc({ portJeu: 8359, portPairs: 9359 });
  await banc.ouvrir();
  let nuage;
  try {
    const p = await banc.joueur("TerreUrbaineTest", {
      carte: "manhattan",
      rr: 2,
      tactile: true,
      viewport: { width: 700, height: 460 },
    });
    verifier(
      "l’ancien lien Manhattan ouvre la même Terre sans identifiant de carte",
      await p.evaluate(
        () =>
          !!__game.world.urbanView &&
          !__game.world.mapId &&
          __game.world.ctx === "local",
      ),
    );
    await p.locator(".who-card.active").click();
    await p.getByRole("button", { name: "Plus tard", exact: true }).click();
    await p.locator("#play-btn").click();
    await p.waitForFunction(() => __game.running);
    verifier(
      "le voyage explicite place le joueur à New York en coordonnées terrestres",
      await p.evaluate(
        () => __game.player.pos.x < -10000 && __game.player.pos.z > 2000,
      ),
    );
    const preuves = await p.evaluate(async () => {
      const { World, CHUNK, HEIGHT } = await import("/src/world.js");
      const {
        TerreUrbaine,
        ORIGINE_MANHATTAN: O,
        reunirSauvegardes,
        dansManhattan,
      } = await import("/src/manhattan-world.js");
      const {
        BATIMENTS,
        niveaux,
        RUE_14,
        MONUMENTS,
        circuitsManhattan,
        batimentA,
        surface,
      } = await import("/src/manhattan-plan.js");
      const base = new World(),
        w = new TerreUrbaine(),
        ret = {};
      let diff = 0;
      for (const [ax, az] of [
        [0, 0],
        [-200, 180],
        [O.x - 280, O.z],
        [O.x + 280, O.z],
        [O.x, O.z - 1350],
        [O.x, O.z + 1040],
      ])
        for (let z = az - 4; z <= az + 4; z++)
          for (let x = ax - 4; x <= ax + 4; x++)
            if (base.terrainHeight(x, z) !== w.terrainHeight(x, z)) diff++;
      ret.horsZone = diff;
      const site = BATIMENTS.find((b) => b.x0 > 0 && b.z0 > 0 && b.z0 < 10),
        x = O.x + site.x0,
        z = O.z + site.z0;
      const y = base.sommetColonne(x, z) + 1,
        key = `${x},${y},${z}`;
      w.mergeEdits({ [key]: [20, 100] });
      let support = 0;
      for (let dz = -2; dz <= 2; dz++)
        for (let dx = -2; dx <= 2; dx++)
          for (let yy = 0; yy < Math.min(y, 120); yy++)
            if (
              w.getBlock(x + dx, yy, z + dz) !==
              base.getBlock(x + dx, yy, z + dz)
            )
              support++;
      ret.support = support;
      ret.ancienBloc = w.getBlock(x, y, z) === 20;
      ret.monumentProtege = w.protectedBuildings.has(site.id);
      const paire = new TerreUrbaine();
      paire.mergeEdits(JSON.parse(JSON.stringify(w.exportEdits())));
      ret.pairSupport =
        paire.terrainHeight(x, z) === w.terrainHeight(x, z) &&
        paire.protectedBuildings.has(site.id);
      const source = {
        "11,35,18": [20, 101],
        "12,35,18": [21, 102],
        "11,36,18": [0, 103],
      };
      const all = {
        local: { [`${O.x + 11},35,${O.z + 18}`]: [22, 200] },
        "manhattan-v1:local": source,
      };
      const r = reunirSauvegardes(all),
        d = r.all.local,
        marque = Object.entries(d).find(([k]) =>
          k.startsWith("@manhattan-v240:"),
        )[1],
        dx = marque[2],
        dz = marque[3];
      ret.translation =
        dx !== O.x &&
        d[`${11 + dx},35,${18 + dz}`]?.[0] === 20 &&
        d[`${12 + dx},35,${18 + dz}`]?.[0] === 21 &&
        d[`${11 + dx},36,${18 + dz}`]?.[0] === 0;
      ret.conflit = d[`${O.x + 11},35,${O.z + 18}`][0] === 22;
      ret.archive =
        JSON.stringify(r.all["manhattan-v1:local"]) ===
          JSON.stringify(source) &&
        JSON.stringify(all.local) !== JSON.stringify(d);
      ret.idempotent = reunirSauvegardes(r.all).changes === 0;
      const nouveau = new TerreUrbaine();
      nouveau.setBlock(O.x + 2, 35, O.z + 3, 20, 300);
      const ami = new TerreUrbaine();
      ami.mergeEdits(nouveau.exportEdits());
      ret.natif = ami.protectedColumns.size === 0;
      const latest = new TerreUrbaine();
      latest.setBlock(1, 35, 2, 20, 10);
      latest.importerProfil({ local: { "1,35,2": [21, 20, 0] } });
      ret.cloudRecent = latest.getBlock(1, 35, 2) === 21;
      const save = World.loadAll();
      World.saveAll(r.all);
      const charge = new TerreUrbaine();
      charge.loadEdits();
      charge.clearSave();
      const reload = new TerreUrbaine();
      reload.loadEdits();
      ret.clear = reload.edits.size === 0;
      World.saveAll(save);
      let collisions = 0,
        offRoad = 0;
      for (const tr of circuitsManhattan())
        for (let i = 0; i < tr.pts.length; i++) {
          const a = tr.pts[i],
            b = tr.pts[(i + 1) % tr.pts.length],
            L = Math.hypot(b.x - a.x, b.z - a.z),
            nx = (b.z - a.z) / L,
            nz = -(b.x - a.x) / L;
          for (let t = 0; t <= L; t += 0.5) {
            const xx = a.x + ((b.x - a.x) * t) / L,
              zz = a.z + ((b.z - a.z) * t) / L;
            for (const side of [-1.1, 1.1]) {
              if (batimentA(xx + side * nx, zz + side * nz)) collisions++;
              if (surface(xx + side * nx, zz + side * nz) !== "road") offRoad++;
            }
          }
        }
      ret.routes = {
        n: circuitsManhattan().length,
        bas: circuitsManhattan().filter((c) => c.z > RUE_14).length,
        collisions,
        offRoad,
      };
      ret.empire = niveaux(MONUMENTS.find((b) => b.style === "empire")).length;
      ret.catalogue = __carte
        .catalogueDesLieux()
        .some((x) => x.c.name === "Chrysler Building");
      return ret;
    });
    verifier(
      "le relief reste identique hors Manhattan, y compris Paris et les quatre bords",
      preuves.horsZone === 0,
    );
    verifier(
      "les anciennes constructions Terre conservent leurs colonnes de support",
      preuves.support === 0 && preuves.ancienBloc && preuves.monumentProtege,
      JSON.stringify(preuves),
    );
    verifier(
      "le support protégé voyage dans le même journal vers un autre appareil",
      preuves.pairSupport,
    );
    verifier(
      "la migration translate rigidement les blocs et les retraits sans écraser la Terre",
      preuves.translation && preuves.conflit && preuves.archive,
    );
    verifier(
      "un import répété ne duplique rien et un effacement explicite ne ressuscite rien",
      preuves.idempotent && preuves.clear,
    );
    verifier(
      "un bloc neuf d’un pair ne supprime pas la ville autour de lui",
      preuves.natif,
    );
    verifier(
      "une sauvegarde cloud plus récente conserve sa priorité",
      preuves.cloudRecent,
    );
    verifier(
      "les monuments sont accessibles et l’Empire State partage dix retraits avec ses collisions",
      preuves.catalogue && preuves.empire >= 10,
    );
    verifier(
      "les circuits laissent passer la largeur réelle des voitures",
      preuves.routes.n > 10 &&
        preuves.routes.bas > 5 &&
        preuves.routes.collisions === 0,
      JSON.stringify(preuves.routes),
    );
    await p.evaluate(() => {
      const j = __game.player;
      j.pos.set(-10138.5, 33.01, 2622.5);
      j.vel.set(0, 0, 0);
      j.yaw = -Math.PI / 2;
      j.pitch = 0;
      j.flying = false;
      j.syncCamera();
    });
    await p.keyboard.down("KeyW");
    await dormir(1200);
    await p.keyboard.up("KeyW");
    verifier(
      "le déplacement s’arrête devant la façade à l’est du trottoir",
      await p.evaluate(
        () =>
          __game.player.pos.x > -10138.4 && __game.player.pos.x <= -10137.29,
      ),
    );
    const hit = await p.evaluate(async () => {
      const { raycastBlocks } = await import("/src/player.js");
      const THREE = await import("three");
      return raycastBlocks(
        __game.world,
        __game.player.eyePosition(),
        __game.camera.getWorldDirection(new THREE.Vector3()),
        5.5,
      );
    });
    verifier("le viseur atteint une façade dans le même monde", !!hit);
    if (hit) {
      const geometrieAvant = await p.evaluate(() =>
        [...__game.villeRealiste.buildings.values()].reduce(
          (n, g) => n + (g.userData.instances || 0),
          0,
        ),
      );
      await p.touchscreen.tap(350, 230);
      await dormir(1400);
      verifier(
        "le geste tactile détruit le bloc visé",
        await p.evaluate(
          (c) => __game.world.getBlock(c.x, c.y, c.z) === 0,
          hit,
        ),
      );
      await p.waitForFunction(
        () => !__game.villeRealiste.job && !__game.villeRealiste.queue?.length,
        null,
        { timeout: 60000 },
      );
      const geometrieApres = await p.evaluate(() =>
        [...__game.villeRealiste.buildings.values()].reduce(
          (n, g) => n + (g.userData.instances || 0),
          0,
        ),
      );
      verifier(
        "le trou enlève aussi la géométrie visible de la façade",
        geometrieApres < geometrieAvant,
        `${geometrieAvant} → ${geometrieApres}`,
      );
    }
    await p.evaluate(() => {
      const j = __game.player;
      j.pos.set(-10141.5, 33.01, 2622.5);
      j.yaw = 0;
      j.pitch = -0.8;
      j.syncCamera();
    });
    const avant = await p.evaluate(() => __game.world.edits.size);
    await p.locator("#mode-btn").tap();
    await p.touchscreen.tap(350, 230);
    await dormir(400);
    verifier(
      "le geste tactile construit sur la Terre",
      await p.evaluate((n) => __game.world.edits.size > n, avant),
    );
    await p.evaluate(() => __setDayTime(0.75));
    await dormir(350);
    verifier(
      "fenêtres et éclairage public fonctionnent la nuit",
      await p.evaluate(
        () =>
          __game.villeRealiste.mats.glassLit.emissiveIntensity > 0.8 &&
          __game.villeRealiste.lamps.some((l) => l.intensity > 0),
      ),
    );
    const alignements = [];
    for (const heure of [0.18, 0.73]) {
      await p.evaluate((h) => __setDayTime(h), heure);
      await dormir(100);
      alignements.push(
        await p.evaluate((h) => {
          const v = __game.villeRealiste;
          const ciel = __game.scene.children.find((g) =>
            g.children.some((m) => m.geometry?.parameters?.width === 62),
          );
          const astre = ciel?.children.find(
            (m) => m.geometry?.parameters?.width === (h < 0.5 ? 62 : 42),
          );
          return astre
            ? v.sunLight.position
                .clone()
                .sub(v.sunLight.target.position)
                .normalize()
                .dot(astre.position.clone().normalize())
            : 0;
        }, heure),
      );
    }
    verifier(
      "les ombres suivent le soleil et la lune visibles",
      alignements.every((d) => d > 0.9999),
      JSON.stringify(alignements),
    );
    const modeles = await p.evaluate(async () => {
      const v = await import("/src/vehicules.js"),
        { buildKidMesh } = await import("/src/marlon.js"),
        { construireHumain } = await import("/src/personnages.js"),
        THREE = await import("three");
      const car = await v.chargerVoitureFlotte(
        v.FLOTTE.find((e) => e.fichier === "ny-crown-victoria"),
      );
      let wheels = 0,
        volant = false;
      car.traverse((o) => {
        if (/^Wheel_/.test(o.name)) wheels++;
        if (o.name === "Interior_SteeringWheel") volant = true;
      });
      const box = new THREE.Box3().setFromObject(car),
        size = box.getSize(new THREE.Vector3());
      const human = construireHumain({ tenue: "passant" }),
        kid = buildKidMesh({
          skin: 0xe0b48c,
          hair: 0x333333,
          torsoSlabs: Array(5).fill(0x777777),
          sleeveSegs: Array(3).fill(0x777777),
          pants: 0x333333,
          shoes: 0x111111,
        });
      return {
        wheels,
        volant,
        length: size.z,
        ground: box.min.y,
        human: human.userData.anatomie,
        kid: kid.userData.anatomie,
        arms: kid.userData.arms.length,
        legs: kid.userData.legs.length,
      };
    });
    verifier(
      "le taxi possède quatre roues au sol, un habitacle et une vraie longueur de berline",
      modeles.wheels === 4 &&
        modeles.volant &&
        modeles.length > 5 &&
        Math.abs(modeles.ground) < 0.03,
      JSON.stringify(modeles),
    );
    verifier(
      "adultes et avatars partagent l’anatomie nouvelle avec leurs membres animés",
      modeles.human === "rocketbox-v241" &&
        modeles.kid === "rocketbox-v241" &&
        modeles.arms === 2 &&
        modeles.legs === 2,
    );
    await p.evaluate(() => {
      const g = __game;
      g.player.pos.set(-10143, 33.01, 2640);
      g.player.yaw = 0;
      g.player.pitch = 0;
      g.player.vel.set(0, 0, 0);
      g.animalManager.invoquer("voiture", -10143, 2637, false, {
        flotte: "ny-crown-victoria",
      });
    });
    await p.locator("#ride-btn").waitFor({ state: "visible", timeout: 15000 });
    await p.locator("#ride-btn").tap();
    const depart = await p.evaluate(() => __game.player.pos.z),
      doigt = await p.context().newCDPSession(p);
    await doigt.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 100, y: 320 }],
    });
    await doigt.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 100, y: 270 }],
    });
    await p
      .waitForFunction((z) => __game.player.pos.z < z - 8, depart, {
        timeout: 15000,
      })
      .catch(() => {});
    await doigt.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    verifier(
      "le taxi roule avec les contrôles tactiles",
      await p.evaluate((z) => __game.player.pos.z < z - 8, depart),
    );
    await p.locator("#ride-btn").tap();
    const memo = await p.evaluate(() => {
      __game.world.saveEdits();
      return __game.world.exportEdits();
    });
    await p.reload({ timeout: 90000 });
    await p.waitForFunction(() => window.__game, null, { timeout: 90000 });
    verifier(
      "le rechargement conserve les constructions et leur provenance",
      await p.evaluate(
        (m) => JSON.stringify(__game.world.exportEdits()) === JSON.stringify(m),
        memo,
      ),
    );
    verifier(
      "aucune erreur JavaScript ni WebGL",
      p.erreurs.length === 0 &&
        (await p.evaluate(() => __game.renderer.getContext().getError() === 0)),
      p.erreurs.join(" | "),
    );
    await p.evaluate(() => {
      __game.edu.today().libreJusqua = 0;
      __game.edu.startQuiz();
    });
    verifier(
      "le mode éducatif demeure actif",
      await p.evaluate(() => __game.edu.quizActive && !__game.running),
    );
    await p.close();
    // Première reprise cloud : une collision oblige tout le chantier ancien
    // à changer d'emplacement. La position doit arriver auprès de ses blocs.
    const reprise = await banc.joueur("TerreReprise", { rr: 2, tactile: true });
    await reprise.locator(".who-card.active").click();
    await reprise
      .getByRole("button", { name: "Plus tard", exact: true })
      .click();
    await reprise.locator("#play-btn").click();
    await reprise.waitForFunction(() => __game.running);
    const positionImportee = await reprise.evaluate(async () => {
      const { ORIGINE_MANHATTAN: o } = await import("/src/manhattan-world.js");
      const t = Date.now() + 60000;
      __game.profileSync.onMerged({
        pos: { "manhattan-v1:local": { x: 11.5, y: 36.2, z: 18.5, t } },
        edits: {
          local: { [`${o.x + 11},35,${o.z + 18}`]: [22, 1000, 0] },
          "manhattan-v1:local": { "11,35,18": [20, 500] },
        },
      });
      return {
        x: __game.player.pos.x,
        z: __game.player.pos.z,
        attenduX: o.x + 4096 + 11.5,
        attenduZ: o.z + 18.5,
        bloc: __game.world.getBlock(o.x + 4096 + 11, 35, o.z + 18),
      };
    });
    verifier(
      "la reprise cloud place l’enfant près du chantier déplacé après un conflit",
      positionImportee.x === positionImportee.attenduX &&
        positionImportee.z === positionImportee.attenduZ &&
        positionImportee.bloc === 20,
      JSON.stringify(positionImportee),
    );
    await reprise.close();
    nuage = await servirLeNuage(9360);
    const { p: hote, code } = await banc.creerMonde("TerreHote", {
      carte: "manhattan",
      rr: 2,
      tactile: true,
      portNuage: 9360,
    });
    const invite = await banc.rejoindre("TerreAmi", code, {
      rr: 2,
      tactile: true,
      portNuage: 9360,
    });
    await hote.evaluate(() =>
      __game.world.setBlock(-10140, 36, 2630, 20, Date.now()),
    );
    await invite.waitForFunction(
      () => __game.world.getBlock(-10140, 36, 2630) === 20,
      null,
      { timeout: 30000 },
    );
    verifier(
      "New York et le reste de la Terre partagent blocs, avatars et code",
      await invite.evaluate(
        (code) =>
          __game.world.ctx === code &&
          __game.remotePlayers.size > 0 &&
          !__game.world.protectedColumns.has("-10140,2630"),
        code,
      ),
    );
    await hote.evaluate(() => __game.cloud.push());
    verifier(
      "le cloud utilise le code Terre unique",
      nuage.monde(code)?.blocks?.["-10140,36,2630"]?.[0] === 20 &&
        !nuage.monde("manhattan-v1:" + code),
    );
    const importe = await hote.evaluate(async (code) => {
      await fetch("http://127.0.0.1:9360/rest/v1/world_saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          { code: "manhattan-v1:" + code, blocks: { "50,35,50": [21, 500] } },
        ]),
      });
      await __game.cloud.attach(code);
      return __game.world.getBlock(-10093, 35, 2665) === 21;
    }, code);
    verifier(
      "une archive Manhattan uniquement dans le cloud est reprise sur la Terre",
      importe,
    );
    verifier(
      "les deux clients restent sans erreur de jeu",
      hote.erreurs.length === 0 && invite.erreurs.length === 0,
      [...hote.erreurs, ...invite.erreurs].join(" | "),
    );
    await invite.close();
    await hote.close();
    const offline = await banc.joueur("TerreOffline", {
      carte: "manhattan",
      rr: 2,
      tactile: true,
      avecSW: true,
    });
    await offline.evaluate(() => navigator.serviceWorker.ready);
    await offline.waitForFunction(
      () => navigator.serviceWorker.controller,
      null,
      { timeout: 30000 },
    );
    await offline.context().setOffline(true);
    await offline.reload({ timeout: 90000 });
    await offline.waitForFunction(() => window.__game?.villeRealiste, null, {
      timeout: 90000,
    });
    await offline.locator(".who-card.active").click();
    await offline
      .getByRole("button", { name: "Plus tard", exact: true })
      .click();
    await offline.locator("#play-btn").click();
    await offline.waitForFunction(() => __game.running, null, {
      timeout: 30000,
    });
    verifier(
      "Terre et Manhattan sont jouables hors ligne depuis la PWA",
      await offline.evaluate(() => __game.running && !__game.world.mapId),
    );
    await offline.close();
  } finally {
    await banc.fermer();
    nuage?.fermer();
  }
})()
  .catch((e) => {
    console.error("💥", e);
    echecs.push(e.message);
  })
  .finally(() => {
    console.log(`\nManhattan : ${echecs.length} échec(s).`);
    process.exit(echecs.length ? 1 : 0);
  });
