// LA TRAVERSÉE DE PARIS : l'état des lieux, avant d'y toucher (v293).
//
// Max : « marcher dans des rues crédibles, croiser des gens et des voitures,
// monter dans une voiture et rouler dans la ville sans couture ». Ce trajet-là
// n'a jamais été mesuré d'un bout à l'autre. Quatre postes, sur la MÊME page :
//
//   1. À PIED, le long d'une avenue — blocs parcourus par seconde de JEU, pas
//      bloqués, et la part du temps passée sur le TROTTOIR.
//   2. AU VOLANT, sur le même axe — blocs parcourus, arrêts, part hors chaussée.
//   3. LES PASSANTS — combien existent, combien sont ANIMÉS, et où ils marchent.
//   4. LE RENDU — appels de dessin, triangles, médiane par image.
//
// LA MONNAIE EST LE TEMPS DE JEU (v277) : `dt` est borné à un vingtième, donc
// une mesure en secondes de MONTRE mesurerait la cadence du banc. Et le couloir
// se CHERCHE (v285) : une adresse écrite à la main tombe dans un immeuble.
const { Banc, souffler } = require('./banc.js');

(async () => {
  const banc = new Banc({ portJeu: 8406, portPairs: 9406 });
  await banc.ouvrir();
  try {
    await souffler();
    // UNE SEULE `evaluate` DE DIX MINUTES FAIT MOURIR LA PAGE (mesuré deux
    // fois : « Target page, context or browser has been closed »). On installe
    // les outils dans la page, puis on l'interroge par courtes questions.
    const page = await banc.jouerSeul('Traversee', { rr: 6 });
    await page.evaluate(() => { window.__trav = null; window.__travErr = null; });
    // ET L'ON NE TIENT PAS `evaluate` OUVERTE PENDANT DIX MINUTES : la mesure
    // part comme une tâche de la PAGE, et node vient lire le résultat par de
    // courtes questions. Deux exécutions sont mortes sur « Target page,
    // context or browser has been closed » avant ce découpage.
    await page.evaluate(() => { (async () => {
      try {
      const g = window.__game;
      const { adresseParis } = await import('./src/paris.js');
      const { CHAUSSEE } = await import('./src/world.js');
      const { CITY_BLOCK } = await import('./src/blocks.js');
      const dodo = (ms) => new Promise((res) => setTimeout(res, ms));
      // Le temps de JEU, comme `tenirSecondes` de monte.js.
      const tenir = (n, pendant) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => {
          const dt = Math.min(Math.max((t - prec) / 1000, 0), 0.05);
          cumul += dt; prec = t;
          if (pendant) pendant(cumul, dt);
          if (cumul >= n) fin(cumul); else requestAnimationFrame(pas);
        };
        requestAnimationFrame(pas);
      });
      const solDe = (x, z) => {
        const xi = Math.floor(x), zi = Math.floor(z);
        return g.world.getBlock(xi, g.world.sommetColonne(xi, zi), zi);
      };
      const estChaussee = (x, z) => CHAUSSEE.has(solDe(x, z));
      const estTrottoir = (x, z) => solDe(x, z) === CITY_BLOCK.SIDEWALK;

      // --- LE PARCOURS EST UN CIRCUIT DE LA VILLE, PAS UN AXE DU MONDE ------
      //
      // Mon premier jet cherchait le plus long alignement de chaussée le long
      // de x ou de z : il n'en a trouvé AUCUN de soixante-dix blocs, et c'est
      // normal — les avenues de Paris sont tracées sur de vraies coordonnées,
      // donc obliques dans le repère du monde. Le trajet que l'enfant fait,
      // c'est celui des convois : `circuitsParis`, les mêmes points que les
      // voitures suivent. On le prend, et on marche dessus.
      // `circuitsParis` est une FABRIQUE : elle attend la cote roulable, comme
      // `main.js` la lui donne (v210 — le terrain n'est pas la surface
      // roulable, un pont passe au-dessus du fleuve).
      const { circuitsParis } = await import('./src/paris.js');
      const circuits = circuitsParis((x, z) => g.world.coteRoulable(x, z));
      if (!circuits || !circuits.length) throw new Error('aucun circuit à Paris');
      // Le plus long, et son point le plus proche du centre : c'est là que
      // l'enfant arrive.
      // ON CHOISIT LE CIRCUIT SUR CE QU'IL A SOUS LES ROUES, PAS SUR SA LONGUEUR.
      // Mon premier jet prenait le plus LONG : mesuré sous node, celui-là est à
      // 47 % de chaussée, quand deux de ses voisins sont à 91 % et 100 %. La
      // sonde mesurait donc le pire trajet de la ville et l'appelait « la
      // traversée » — un témoin qui écrit son terrain se trompe de terrain
      // (v285). On publie la table des huit, et on roule sur le meilleur.
      const analyse = circuits.map((c) => {
        const pts = c.pts;
        let bons = 0, run = 0, meilleur = 0, debut = 0, courantDebut = 0;
        for (let i = 0; i < pts.length; i++) {
          if (estChaussee(pts[i].x, pts[i].z)) {
            if (run === 0) courantDebut = i;
            bons++; run++;
            if (run > meilleur) { meilleur = run; debut = courantDebut; }
          } else run = 0;
        }
        let d = 0; for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i-1].x, pts[i].z - pts[i-1].z);
        return { pts, points: pts.length, chaussee: +(100 * bons / pts.length).toFixed(0),
          suite: meilleur, debut, longueur: Math.round(d) };
      }).sort((a, b) => b.suite - a.suite);
      const table = analyse.map((a) => ({ points: a.points, chaussee: a.chaussee, suite: a.suite, longueur: a.longueur }));
      const piste = analyse[0].pts;
      const k0 = analyse[0].debut;
      const p0 = piste[k0], p1 = piste[(k0 + 3) % piste.length];
      const couloir = { x: Math.round(p0.x), z: Math.round(p0.z),
        ux: Math.sign(Math.round(p1.x - p0.x)) || 0, uz: Math.sign(Math.round(p1.z - p0.z)) || 0,
        suite: analyse[0].suite, circuits: circuits.length,
        pointsDuCircuit: piste.length, longueur: analyse[0].longueur, table };

      // --- ON SUIT LA PISTE, ON NE MARCHE PAS TOUT DROIT -----------------------
      //
      // Mon premier jet posait un cap une fois pour toutes et tenait « avant »
      // douze secondes : l'avenue tourne, et au bout de trente-huit blocs
      // l'enfant était dans les jardins — vingt et un relevés « ailleurs » sur
      // vingt-quatre. Ce n'était pas le jeu, c'était ma sonde qui se trompait
      // de terrain (v285). On vise le point SUIVANT du circuit à chaque relevé,
      // exactement comme un convoi.
      const versLePoint = (k) => {
        const p = piste[k % piste.length];
        g.player.yaw = Math.atan2(-(p.x - g.player.pos.x), -(p.z - g.player.pos.z));
      };
      const suivre = async (secondes, arrive) => {
        let k = k0 + 1, releves = 0, trottoir = 0, chaussee = 0, autre = 0, bloques = 0;
        let prochain = 0, prec = { x: g.player.pos.x, z: g.player.pos.z };
        const d0 = { x: g.player.pos.x, z: g.player.pos.z };
        let parcouru = 0;
        g.player.keys.add('KeyW');
        await tenir(secondes, (cumul) => {
          const p = g.player.pos;
          const cible = piste[k % piste.length];
          if (Math.hypot(p.x - cible.x, p.z - cible.z) < 3) { k++; }
          versLePoint(k);
          if (cumul < prochain) return;
          prochain = cumul + 0.5;
          releves++;
          if (estTrottoir(p.x, p.z)) trottoir++;
          else if (estChaussee(p.x, p.z)) chaussee++;
          else autre++;
          const pas = Math.hypot(p.x - prec.x, p.z - prec.z);
          parcouru += pas;
          if (pas < 0.08) bloques++;
          prec = { x: p.x, z: p.z };
        });
        g.player.keys.delete('KeyW');
        return { parcouru: +parcouru.toFixed(1), parSeconde: +(parcouru / secondes).toFixed(2),
          volOiseau: +Math.hypot(g.player.pos.x - d0.x, g.player.pos.z - d0.z).toFixed(1),
          pointsFranchis: k - k0 - 1, releves, bloques, trottoir, chaussee, autre };
      };

      // --- 1. à pied, sur le trottoir d'à côté --------------------------------
      let bord = null;
      for (let kk = 1; kk <= 6 && !bord; kk++) {
        for (const sg of [1, -1]) {
          const px = couloir.x + couloir.uz * kk * sg, pz = couloir.z - couloir.ux * kk * sg;
          if (estTrottoir(px, pz)) { bord = { x: px, z: pz }; break; }
        }
      }
      const poser = (x, z) => {
        g.player.flying = false;
        g.player.pos.set(x + 0.5, g.world.sommetColonne(Math.floor(x), Math.floor(z)) + 1.2, z + 0.5);
        g.player.vel.set(0, 0, 0);
        g.player.pitch = 0;
      };
      const depart = bord || { x: couloir.x, z: couloir.z };
      poser(depart.x, depart.z);
      await dodo(1200);
      const marche = { ...(await suivre(12)), depart: [Math.round(depart.x), Math.round(depart.z)],
        surLeTrottoirAuDepart: !!bord };

      // --- 2. au volant, sur le circuit ---------------------------------------
      const auVolant = () => !!(g.fun && g.fun.montureConduite && g.fun.montureConduite());
      const bouton = () => document.getElementById('ride-btn');
      if (auVolant() && bouton()) bouton().click();
      for (const b of [...(g.animalManager.animals || [])]) g.animalManager.removeCreature?.(b);
      poser(couloir.x, couloir.z);
      versLePoint(k0 + 1);
      await dodo(400);
      g.animalManager.invoquer('voiture',
        g.player.pos.x - Math.sin(g.player.yaw) * 3, g.player.pos.z - Math.cos(g.player.yaw) * 3);
      for (let essai = 0; essai < 8 && !auVolant(); essai++) {
        await dodo(600);
        if (!auVolant() && bouton()) bouton().click();
        const t = performance.now();
        while (!auVolant() && performance.now() - t < 2500) await dodo(200);
      }
      let conduite = { err: 'pas monté' };
      if (auVolant()) {
        g.player.vel.set(0, 0, 0);
        await dodo(300);
        // ON SÉPARE LES CAUSES D'UN ARRÊT (v223) : la voiture de l'enfant est
        // arrêtée par QUATRE familles d'obstacle (main.js) — la circulation,
        // le mobilier, un piéton, l'eau. Un seul chiffre pour quatre pannes ne
        // se démonte pas. On enveloppe le crochet et l'on redemande à chacune.
        const brut = g.player.obstacleVehicule;
        const causes = { total: 0, circulation: 0, autre: 0 };
        g.player.obstacleVehicule = (x, z, cap, x0, z0) => {
          const r = brut(x, z, cap, x0, z0);
          if (r) {
            causes.total++;
            if (g.vehicules.obstacleDevant(x, z, cap) && !g.vehicules.obstacleDevant(x0, z0, cap)) causes.circulation++;
            else causes.autre++;
          }
          return r;
        };
        conduite = { ...(await suivre(12)), couloirEnPoints: couloir.suite, causes };
        g.player.obstacleVehicule = brut;
        if (bouton()) bouton().click();
      }

      // --- 3. les passants -----------------------------------------------------
      let gens = { err: 'aucun site peuplé' };
      const site = g.passants && g.passants.sites && g.passants.sites.find((s) => s.peuple && s.peuple.length);
      if (site) {
        const avant = site.peuple.map((h) => ({ x: h.pos.x, z: h.pos.z }));
        await tenir(8);
        let animes = 0, surTrottoir = 0, surChaussee = 0, ailleurs = 0, vus = 0;
        site.peuple.forEach((h, i) => {
          if (Math.hypot(h.pos.x - avant[i].x, h.pos.z - avant[i].z) > 0.4) animes++;
          if (estTrottoir(h.pos.x, h.pos.z)) surTrottoir++;
          else if (estChaussee(h.pos.x, h.pos.z)) surChaussee++;
          else ailleurs++;
          if (Math.hypot(h.pos.x - g.player.pos.x, h.pos.z - g.player.pos.z) < 62) vus++;
        });
        gens = { total: site.peuple.length, animes, surTrottoir, surChaussee, ailleurs, aMoinsDe62Blocs: vus };
      }

      // --- 4. le rendu ----------------------------------------------------------
      const images = [];
      let der = performance.now();
      for (let i = 0; i < 40; i++) {
        await new Promise((res) => requestAnimationFrame(res));
        const n = performance.now(); images.push(n - der); der = n;
      }
      images.sort((a, b) => a - b);
      const info = g.renderer.info;
      window.__trav = { couloir, marche, conduite, gens,
        rendu: { appels: info.render.calls, triangles: info.render.triangles,
          medianeMs: +images[images.length >> 1].toFixed(1), pireMs: +images[images.length - 1].toFixed(1) } };
      } catch (e) { window.__travErr = String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '); }
    })(); });
    // On attend le résultat, borné, et la durée entre dans le message (v270).
    const t0 = Date.now();
    let r = null;
    while (Date.now() - t0 < 20 * 60 * 1000) {
      const etat = await page.evaluate(() => ({ r: window.__trav, e: window.__travErr }));
      if (etat.e) { r = { err: etat.e }; break; }
      if (etat.r) { r = etat.r; break; }
      await new Promise((res) => setTimeout(res, 5000));
    }
    if (!r) r = { err: `rien rendu en ${Math.round((Date.now() - t0) / 1000)} s` };
    console.log(JSON.stringify(r, null, 1));
  } catch (e) {
    // UNE SONDE QUI AVALE SON ERREUR NE MESURE RIEN (v288) : le `finally`
    // sortait en zéro sans un mot, et la sonde annonçait un succès muet.
    console.log('ÉCHEC :', String((e && e.stack) || e).split('\n').slice(0, 4).join('\n'));
  } finally { await banc.fermer(); process.exit(0); }
})();
