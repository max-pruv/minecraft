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
  // L'origine de New York se DEMANDE au registre, jamais ne se recopie : la
  // carte a doublé deux fois (v199, v242) et chaque fois les littéraux d'un
  // témoin ont menti sans rougir.
  const { positionDe } = await import("../src/mondes.js");
  const NY = positionDe("ny");
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
        (NY) => Math.hypot(__game.player.pos.x - NY.x, __game.player.pos.z - NY.z) < 1400,
        NY,
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
    await p.evaluate((NY) => {
      const j = __game.player;
      j.pos.set(NY.x + 4.5, 33.01, NY.z + 7.5);
      j.vel.set(0, 0, 0);
      j.yaw = -Math.PI / 2;
      j.pitch = 0;
      j.flying = false;
      j.syncCamera();
    }, NY);
    // ON MARCHE JUSQU'À S'ARRÊTER, PAS PENDANT 1,2 s (v242). Pendant que les
    // façades se construisent, le banc en rendu logiciel tombe à une image
    // par seconde : 1,2 s de touche enfoncée ne valaient qu'UN pas de 0,16
    // bloc, et la barre est à 0,1 — un pile ou face qui mesurait le banc,
    // pas le mur. On tient la touche jusqu'à ce que trois relevés d'affilée
    // ne bougent plus (leçon de l'Air et l'Espace, washington.js).
    // Et l'immobilité ne compte qu'APRÈS le premier pas : à une image par
    // seconde, trois relevés sans mouvement arrivent avant que la touche n'ait
    // produit une seule image — le témoin annonçait « arrêt à 4,5 », le point
    // de départ. Trente secondes au plus, ce qui laisse le temps de démarrer.
    await p.keyboard.down("KeyW");
    const departX = await p.evaluate(() => __game.player.pos.x);
    let figee = 0,
      dernierX = departX,
      parti = false;
    for (let i = 0; i < 60 && figee < 3; i++) {
      await dormir(500);
      const x = await p.evaluate(() => __game.player.pos.x);
      if (!parti) parti = Math.abs(x - departX) > 0.05;
      else figee = Math.abs(x - dernierX) < 0.01 ? figee + 1 : 0;
      dernierX = x;
    }
    await p.keyboard.up("KeyW");
    const arret = await p.evaluate((NY) => +(__game.player.pos.x - NY.x).toFixed(2), NY);
    verifier(
      "le déplacement s’arrête devant la façade à l’est du trottoir",
      arret > 4.6 && arret <= 5.71,
      `arrêt à ${arret} blocs de l'origine (façade à 6)`,
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
    await p.evaluate((NY) => {
      const j = __game.player;
      j.pos.set(NY.x + 1.5, 33.01, NY.z + 7.5);
      j.yaw = 0;
      j.pitch = -0.8;
      j.syncCamera();
    }, NY);
    // MANHATTAN REND 0,4 IMAGE PAR SECONDE SUR CE BANC (v259), ET UNE HEURE
    // POSÉE NE PREND EFFET QU'À L'IMAGE SUIVANTE. Les deux témoins de ciel
    // ci-dessous dormaient 100 et 350 ms : mesuré à la sonde
    // (`sonde-ombres-ny.cjs`), le ciel met 755 à 1 947 ms à tourner. Ils
    // lisaient donc l'heure d'AVANT — la lune sous l'horizon, opacité 0, et un
    // alignement de −1 pour une barre de +0,9999. On attend le FAIT DU MONDE
    // (le soleil du bon côté de l'horizon), jamais le verdict, et la durée
    // entre dans le message (v270, v290).
    const tournerLeCiel = async (h) => {
      const t0 = Date.now();
      await p.evaluate((x) => __setDayTime(x), h);
      const vu = await p
        .waitForFunction(
          (x) => {
            const larg = (m) => m.geometry?.parameters?.width;
            const ciel = __game.scene.children.find((g) =>
              g.children?.some((m) => larg(m) === 62),
            );
            const soleil = ciel?.children.find((m) => larg(m) === 62);
            return soleil ? (x < 0.5 ? soleil.position.y > 0 : soleil.position.y < 0) : false;
          },
          h,
          { timeout: 40000 },
        )
        .then(() => true)
        .catch(() => false);
      return { vu, ms: Date.now() - t0 };
    };
    const avant = await p.evaluate(() => __game.world.edits.size);
    await p.locator("#mode-btn").tap();
    await p.touchscreen.tap(350, 230);
    await dormir(400);
    verifier(
      "le geste tactile construit sur la Terre",
      await p.evaluate((n) => __game.world.edits.size > n, avant),
    );
    const nuitVenue = await tournerLeCiel(0.75);
    verifier(
      "fenêtres et éclairage public fonctionnent la nuit",
      nuitVenue.vu &&
        (await p.evaluate(
          () =>
            __game.villeRealiste.mats.glassLit.emissiveIntensity > 0.8 &&
            __game.villeRealiste.lamps.some((l) => l.intensity > 0),
        )),
      `nuit tombée en ${nuitVenue.ms} ms${nuitVenue.vu ? "" : " — jamais tombée"}`,
    );
    const alignements = [];
    const attentesCiel = [];
    for (const heure of [0.18, 0.73]) {
      const tourne = await tournerLeCiel(heure);
      attentesCiel.push(tourne.ms);
      if (!tourne.vu) {
        alignements.push(null);
        continue;
      }
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
      alignements.every((d) => d !== null && d > 0.9999),
      `${JSON.stringify(alignements)} — ciel tourné en ${attentesCiel.join(" et ")} ms`,
    );
    const modeles = await p.evaluate(async () => {
      const v = await import("/src/vehicules.js"),
        { buildKidMesh } = await import("/src/marlon.js"),
        { construireHumain } = await import("/src/personnages.js"),
        { chargerHumains } = await import("/src/humains.js"),
        THREE = await import("three");
      // les modèles arrivent après l'accueil (v245) : on bâtit quand ils sont là
      if (chargerHumains) await chargerHumains();
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
    await p.evaluate((NY) => {
      const g = __game;
      g.player.pos.set(NY.x, 33.01, NY.z + 25);
      g.player.yaw = 0;
      g.player.pitch = 0;
      g.player.vel.set(0, 0, 0);
      // UN TÉMOIN SE PLACE LUI-MÊME, ET « SE PLACER » COMMENCE PAR FAIRE LE
      // VIDE (v284). Les bêtes naissent sur une cadence en TEMPS RÉEL (v226),
      // et une bête à moins de huit blocs passe AVANT la voiture qu'on regarde
      // (fun.js, v257) : le bouton annonce alors « 🐴 Monter ». L'idiome de la
      // v284 n'avait jamais été appliqué à ce bouton-ci.
      //
      // ON NE SAIT PAS ENCORE CE QUI CACHE LE BOUTON, et ce commentaire ne le
      // devine pas. Mesuré sur page neuve (`sonde-taxi-ny.cjs`) : sol plat à 32
      // sous l'enfant ET sous la voiture, bouton visible dès le premier relevé,
      // maillage de la voiture à (0,0,0) pendant quatre secondes — le modèle se
      // charge de façon asynchrone — puis posé à y = 33, libellé 🐴 → 🚗 à la
      // neuvième seconde. Le jeu offre donc l'embarquement ; c'est la suite qui
      // ne l'obtient pas. Les étapes sont dans `TASKS.md`, l'A/B DANS la suite
      // en premier (v277).
      for (const a of [...g.animalManager.animals]) {
        g.animalManager.scene.remove(a.mesh);
      }
      g.animalManager.animals.length = 0;
      g.animalManager.invoquer("voiture", NY.x, NY.z + 22, false, {
        flotte: "ny-crown-victoria",
      });
    }, NY);
    // ET UNE ATTENTE QUI JETTE MASQUE TOUT CE QUI SUIT : ce `waitFor` a levé
    // son délai au portail de la v291 et la suite s'est arrêtée là — NEUF
    // témoins jamais atteints, dont les deux du hors ligne. « Un témoin doit
    // échouer PROPREMENT sur l'ancien code, pas s'effondrer » vaut aussi pour
    // le neuf : on attend, borné, puis on REND un verdict, et la durée comme
    // ce que le bouton annonce entrent dans le message.
    const t0Taxi = Date.now();
    const taxiPret = await p
      .locator("#ride-btn")
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (!taxiPret) {
      const vu = await p.evaluate(() => {
        const b = document.getElementById("ride-btn");
        return {
          bouton: b ? b.textContent.trim() : null,
          affiche: b ? getComputedStyle(b).display : null,
          betes: __game.animalManager.animals.length,
        };
      });
      verifier(
        "le taxi roule avec les contrôles tactiles",
        false,
        `bouton jamais visible en ${Date.now() - t0Taxi} ms — ${JSON.stringify(vu)}`,
      );
    } else {
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
    const avance = await p.evaluate(
      (z) => +(z - __game.player.pos.z).toFixed(2),
      depart,
    );
    verifier(
      "le taxi roule avec les contrôles tactiles",
      avance > 8,
      `${avance} blocs en ${Date.now() - t0Taxi} ms`,
    );
    await p.locator("#ride-btn").tap();
    }
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
    const BLOC = { x: NY.x + 3, y: 36, z: NY.z + 15 };
    await hote.evaluate(
      (B) => __game.world.setBlock(B.x, B.y, B.z, 20, Date.now()),
      BLOC,
    );
    await invite.waitForFunction(
      (B) => __game.world.getBlock(B.x, B.y, B.z) === 20,
      BLOC,
      { timeout: 30000 },
    );
    verifier(
      "New York et le reste de la Terre partagent blocs, avatars et code",
      await invite.evaluate(
        ({ code, B }) =>
          __game.world.ctx === code &&
          __game.remotePlayers.size > 0 &&
          !__game.world.protectedColumns.has(`${B.x},${B.z}`),
        { code, B: BLOC },
      ),
    );
    await hote.evaluate(() => __game.cloud.push());
    verifier(
      "le cloud utilise le code Terre unique",
      nuage.monde(code)?.blocks?.[`${BLOC.x},${BLOC.y},${BLOC.z}`]?.[0] === 20 &&
        !nuage.monde("manhattan-v1:" + code),
    );
    const importe = await hote.evaluate(async ({ code, NY }) => {
      await fetch("http://127.0.0.1:9360/rest/v1/world_saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          { code: "manhattan-v1:" + code, blocks: { "50,35,50": [21, 500] } },
        ]),
      });
      await __game.cloud.attach(code);
      return __game.world.getBlock(NY.x + 50, 35, NY.z + 50) === 21;
    }, { code, NY });
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
