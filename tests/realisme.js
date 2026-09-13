// Les régressions signalées : visage géométrique rudimentaire, corps déformés,
// disparition au seuil de distance et voisins remplacés au demi-tour.
const { Banc, dormir } = require("./banc.js");
const echecs = [];
const verifier = (nom, ok, detail) => {
  console.log(
    `${ok ? "✅" : "❌"} ${nom}${detail ? " — " + JSON.stringify(detail) : ""}`,
  );
  if (!ok) echecs.push(nom);
};
(async () => {
  const banc = new Banc({ portJeu: 8361, portPairs: 9361 });
  await banc.ouvrir();
  try {
    const p = await banc.joueur("Presence241", {
      carte: "manhattan",
      rr: 2,
      viewport: { width: 1280, height: 800 },
    });
    await p.locator(".who-card.active").click();
    await p.getByRole("button", { name: "Plus tard", exact: true }).click();
    await p.locator("#play-btn").click();
    await p.waitForFunction(() =>
      __game.passants.sites.some((s) => s.urbain && s.peuple?.length),
    );
    await dormir(3000);
    const anatomie = await p.evaluate(async () => {
      const { construireHumain } = await import("/src/personnages.js"),
        { buildKidMesh } = await import("/src/marlon.js"),
        { animerHumain, chargerHumains } = await import("/src/humains.js"),
        T = await import("three");
      // les modèles arrivent après l'accueil (v245) : on bâtit quand ils sont là
      if (chargerHumains) await chargerHumains();
      const adulte = construireHumain({ tenue: "passant" });
      adulte.updateMatrixWorld(true);
      const avant = new T.Box3().setFromObject(adulte);
      const look = {
        skin: 0xdab595,
        hair: 0x443322,
        torsoSlabs: Array(5).fill(0x6080ac),
        sleeveSegs: Array(3).fill(0x6080ac),
        pants: 0x34393e,
        shoes: 0x222222,
      };
      const enfant = buildKidMesh(look);
      adulte.updateMatrixWorld(true);
      const apres = new T.Box3().setFromObject(adulte),
        kidBox = new T.Box3().setFromObject(enfant);
      const rig = adulte.userData.rig;
      const repos = rig.L_Calf.bone.quaternion.clone();
      animerHumain(adulte, 0.65, 1.6);
      adulte.updateMatrixWorld(true);
      let skins = 0,
        textures = 0,
        triangles = 0;
      adulte.traverse((o) => {
        if (o.isSkinnedMesh) skins++;
        if (o.isMesh) {
          triangles +=
            (o.geometry.index?.count || o.geometry.attributes.position.count) /
            3;
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            if (m.map && m.normalMap) textures++;
        }
      });
      let horsVolume = 0;
      const point = new T.Vector3();
      for (let phase = 0; phase < 16; phase++) {
        animerHumain(adulte, phase * Math.PI / (8 * 6.2), 1.6);
        adulte.updateMatrixWorld(true);
        adulte.traverse((o) => {
          if (!o.isSkinnedMesh) return;
          o.skeleton.update();
          for (let i = 0; i < o.geometry.attributes.position.count; i++) {
            o.getVertexPosition(i, point);
            if (!o.boundingSphere.containsPoint(point)) horsVolume++;
          }
        });
      }
      const costume = construireHumain({ tenue: "gaulois" });
      let faces = 0;
      costume.traverse((o) => {
        if (o.isMesh && /head/.test(o.material?.name) && o.material.map)
          faces++;
      });
      return {
        skins,
        horsVolume,
        textures,
        triangles,
        adulte: avant.getSize(new T.Vector3()).y,
        enfant: kidBox.getSize(new T.Vector3()).y,
        partageIntact: avant.equals(apres),
        genouAnime: repos.angleTo(rig.L_Calf.bone.quaternion),
        costumeFaces: faces,
      };
    });
    verifier(
      "adultes et enfants possèdent des peaux articulées et des textures de visage et de tissu",
      anatomie.skins >= 2 &&
        anatomie.textures >= 2 &&
        anatomie.triangles > 4000 &&
        anatomie.triangles < 15000,
      anatomie,
    );
    verifier(
      "fabriquer un avatar enfant ne rétrécit pas la géométrie partagée des adultes",
      anatomie.partageIntact &&
        anatomie.adulte > 1.65 &&
        anatomie.enfant > 1.35 &&
        anatomie.enfant < 1.6,
    );
    verifier(
      "la marche fléchit réellement le genou",
      anatomie.genouAnime > 0.15,
    );
    verifier(
      "les costumes historiques gardent un visage texturé",
      anatomie.costumeFaces > 0,
    );
    verifier(
      "le volume de visibilité contient les membres pendant une foulée complète",
      anatomie.horsVolume === 0,
      { sommetsHorsVolume: anatomie.horsVolume },
    );
    const stable = await p.evaluate(() => {
      const s = __game.passants.sites.find((s) => s.urbain && s.peuple);
      window.__voisins241 = s.peuple.map((h) => ({
        h,
        poste: h.poste.toArray(),
      }));
      return { n: s.peuple.length, yaw: __game.player.yaw };
    });
    await p.evaluate(() => {
      __game.player.yaw += Math.PI;
      __game.player.syncCamera();
    });
    await dormir(4500);
    const demiTour = await p.evaluate(
      () =>
        __voisins241.filter(
          ({ h, poste }) => h.poste.x !== poste[0] || h.poste.y !== poste[1],
        ).length,
    );
    verifier(
      "un demi-tour retrouve les mêmes voisins, sans rapatriement caché",
      demiTour === 0,
      { deplaces: demiTour, voisins: stable.n },
    );
    const fade = await p.evaluate(async () => {
      const { actualiserPresence, DISTANCE_PRESENCE } = await import(
        "/src/presence.js"
      );
      const h = __game.passants.sites.find((s) => s.urbain).peuple[0];
      const result = {};
      for (const d of [60, 62, 64, 80, 96, 112]) {
        for (let i = 0; i < 120; i++) actualiserPresence(h, d, 1 / 60);
        result[d] = { visible: h.mesh.visible, alpha: h.presence.valeur };
      }
      actualiserPresence(h, 20, 1 / 60);
      result.retour = h.presence.valeur;
      for (let i = 0; i < 120; i++) actualiserPresence(h, 20, 1 / 60);
      result.final = h.presence.valeur;
      // Une chute subite de cadence ne saute pas le fondu, même à grande vitesse.
      actualiserPresence(h, 300, 0.5);
      result.apresVoyage = h.presence.valeur;
      result.limites = DISTANCE_PRESENCE;
      return result;
    });
    verifier(
      "le seuil historique de 62 mètres ne coupe plus les personnages",
      fade[60].visible && fade[62].visible && fade[64].alpha === 1,
      fade,
    );
    verifier(
      "l’éloignement et le retour passent par des états intermédiaires",
      fade[96].alpha > 0 &&
        fade[96].alpha < 1 &&
        !fade[112].visible &&
        fade.retour > 0 &&
        fade.retour < 0.1 &&
        fade.final === 1,
    );
    verifier(
      "un déplacement très rapide ne coupe pas le modèle en une image",
      fade.apresVoyage > 0.8,
    );
    const car = await p.evaluate(async () => {
      const { construireTaxi } = await import("/src/taxis.js"),
        T = await import("three");
      const g = construireTaxi();
      g.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(g);
      let roues = [],
        tris = 0;
      g.traverse((o) => {
        if (/^Wheel_/.test(o.name))
          roues.push(new T.Box3().setFromObject(o).min.y);
        if (o.isMesh)
          tris +=
            (o.geometry.index?.count || o.geometry.attributes.position.count) /
            3;
      });
      return {
        length: box.max.z - box.min.z,
        width: box.max.x - box.min.x,
        roues,
        tris,
        volant: !!g.getObjectByName("Interior_SteeringWheel"),
      };
    });
    verifier(
      "la berline garde quatre pneus au sol, son empattement et son habitacle",
      car.roues.length === 4 &&
        car.roues.every((y) => Math.abs(y) < 0.01) &&
        car.length > 5.2 &&
        car.length < 5.6 &&
        car.width < 2.21 &&
        car.volant,
      car,
    );
    verifier(
      "le détail automobile reste dans un budget de géométrie borné",
      car.tris < 70000,
    );
    const reflets = await p.evaluate(async () => {
      const { chargerVoitureFlotte, FLOTTE, majRefletsVoiture } = await import('/src/vehicules.js');
      const { scene, renderer, player } = __game;
      const modele = (await chargerVoitureFlotte(FLOTTE.find(e => e.fichier === 'ny-crown-victoria'))).clone(true);
      modele.position.copy(player.pos);
      modele.position.z -= 7;
      scene.add(modele);
      const gl = renderer.getContext();
      const avant = gl.getError();
      const erreurs = [];
      for (let i = 0; i < 4; i++) {
        majRefletsVoiture(renderer, scene, modele.position);
        renderer.render(scene, player.camera);
        erreurs.push(gl.getError());
      }
      let caches = 0;
      modele.traverse(o => { if (o.isMesh && !o.visible) caches++; });
      scene.remove(modele);
      return { avant, erreurs, caches };
    });
    verifier(
      "les reflets du taxi se renouvellent sans boucle WebGL et restaurent sa carrosserie",
      reflets.avant === 0 && reflets.erreurs.every(e => e === 0) && reflets.caches === 0,
      reflets,
    );
    verifier(
      "aucune erreur de jeu pendant les contrôles",
      p.erreurs.length === 0,
      p.erreurs,
    );

    // ---- L'ACCUEIL RÉPOND AVANT LES CORPS RÉALISTES (v245) -------------------
    //
    // Max, sur l'iPad de quatre ans : « il faut attendre quasiment vingt
    // secondes le temps de pouvoir cliquer sur le bouton ». Les neuf modèles
    // (8,2 Mo) étaient attendus par `humains.js` AVANT que `main.js` ne
    // s'exécute : aucun bouton n'était attaché tant qu'ils n'étaient pas là.
    // On ralentit chaque modèle de cinq secondes, comme un Wi-Fi d'hôtel, et
    // l'on regarde combien sont arrivés quand le jeu s'attache : zéro ici,
    // neuf sur l'ancien code. Puis on joue, et les gens nés en attendant —
    // le château, l'avatar — doivent recevoir leur corps réaliste SUR PLACE,
    // sans changer d'objet ni sortir de la scène.
    // LA PAGE DE MANHATTAN SE FERME D'ABORD. Ouverte à côté, elle fait durer
    // le démarrage de celle-ci cinq à onze MINUTES sur ce banc — un seul
    // processus graphique en rendu logiciel, que la ville accapare — contre
    // quatre secondes et sept dixièmes une fois fermée ; mesuré en trois
    // variantes, avec et sans route. Ce n'est pas le jeu, c'est le banc, et
    // c'est de toute façon la fin de la suite.
    await p.close();
    const lent = await banc.navigateur.newContext();
    const q = await lent.newPage();
    const fautes = [];
    q.on("pageerror", (e) => fautes.push(e.message));
    // Le service worker est coupé, comme partout au banc sauf dans maj.js.
    await q.addInitScript(() => {
      if (navigator.serviceWorker)
        navigator.serviceWorker.register = () =>
          Promise.reject(new Error("désactivé pour les tests"));
    });
    let servis = 0;
    await q.route("**/vendor/humains/*.glb", async (r) => {
      await dormir(5000);
      servis++;
      r.continue();
    });
    const depart = Date.now();
    await q.goto(
      "http://127.0.0.1:8361/index.html?peerhost=127.0.0.1:9361&cloud=&stay=1&rr=2",
      { waitUntil: "load", timeout: 120000 },
    );
    await q.waitForFunction(() => window.__game, null, { timeout: 120000 });
    const attache = { secondes: +((Date.now() - depart) / 1000).toFixed(1), servis };
    verifier(
      "le jeu attache ses boutons sans attendre les modèles de personnages",
      attache.servis === 0,
      attache,
    );
    const avant = await q.evaluate(async () => {
      const g = window.__game,
        m = await import("/src/personnages.js");
      const npcs = g.npcs || [];
      window.__corpsAvant = new Map(npcs.map((n) => [n, n.mesh]));
      return {
        npcs: npcs.length,
        enAttente: m.corpsEnAttente ? m.corpsEnAttente() : -1,
      };
    });
    await q.evaluate(() => {
      window.__game.edu.today().libreJusqua = 86400;
      document.getElementById("play-btn").click();
    });
    await q.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    // `waitForFunction` ne suit pas une promesse : on interroge à la main
    let arrives = false;
    for (const fin = Date.now() + 90000; !arrives && Date.now() < fin; ) {
      await dormir(500);
      arrives = await q.evaluate(async () => {
        const m = await import("/src/humains.js");
        return m.humainsCharges ? m.humainsCharges() : true;
      });
    }
    await dormir(4000);
    const apres = await q.evaluate(async () => {
      const g = window.__game,
        m = await import("/src/personnages.js");
      const npcs = g.npcs || [];
      const compte = {};
      let memeObjet = 0,
        dansScene = 0,
        presenceFausse = 0;
      for (const n of npcs) {
        const a = n.mesh?.userData?.anatomie || "?";
        compte[a] = (compte[a] || 0) + 1;
        if (window.__corpsAvant.get(n) === n.mesh) memeObjet++;
        if (n.mesh.parent) dansScene++;
        if (n.presence && n.presence.version !== (n.mesh.userData.miseANiveau || 0))
          presenceFausse++;
      }
      return {
        npcs: npcs.length,
        compte,
        memeObjet,
        dansScene,
        presenceFausse,
        enAttente: m.corpsEnAttente ? m.corpsEnAttente() : -1,
        avatar: g.marlon?.mesh?.userData?.anatomie,
      };
    });
    await lent.close();
    verifier(
      "les gens nés avant les modèles reçoivent leur corps réaliste sur place",
      arrives &&
        avant.enAttente > 0 &&
        apres.enAttente === 0 &&
        apres.npcs > 0 &&
        // ceux qui existaient avant sont les mêmes objets ; les passants nés
        // entre-temps ne comptent pas (141 à la fin pour 123 au départ, au portail)
        apres.memeObjet === avant.npcs &&
        apres.dansScene === apres.npcs &&
        apres.presenceFausse === 0 &&
        !apres.compte["humaine-v2"] &&
        apres.avatar === "rocketbox-v241" &&
        fautes.length === 0,
      { avant, apres, fautes },
    );
  } finally {
    await banc.fermer();
  }
  console.log(`\nRéalisme et présence : ${echecs.length} échec(s).`);
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
