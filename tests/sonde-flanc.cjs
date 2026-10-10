const { Banc, dormir, souffler } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8465, portPairs: 9465 }); await banc.ouvrir();
  try {
    for (let k = 0; k < Number(process.env.N || 3); k++) {
    const pageGta = await banc.jouerSeul('MonteConduite' + k, { tactile: true });
    const gta = await pageGta.evaluate(async () => {
      // les passants de la page ne roulent pas sur la dalle des témoins
      if (window.__game.npcs) for (const n of window.__game.npcs) { if (n.pos) n.pos.set(n.pos.x, -500, n.pos.z); }
      const g = window.__game, P = g.player;
      const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
      const { BLOCK } = await import('./src/blocks.js');
      const C = await import('./src/conduite.js').catch(() => null);
      const x0 = 41000, z0 = 41000; let y0 = 0;
      for (let d = -20; d <= 420; d += 4) for (let w = -60; w <= 60; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 3;
      const poses = [];
      const poser = (x, y, z) => { g.world.setBlock(x, y, z, BLOCK.STONE); poses.push([x, y, z]); };
      for (let d = -20; d <= 420; d++) for (let w = -60; w <= 60; w++) poser(x0 + d, y0, z0 + w);
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      const vider = () => { for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh); g.animalManager.animals.length = 0; };
      // UN TÉMOIN SE PLACE LUI-MÊME, ET COMMENCE PAR FAIRE LE VIDE (v284)
      for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await dormir(400); }
      vider();
      P.flying = false; P.yaw = -Math.PI / 2; P.pitch = 0;
      P.pos.set(x0, y0 + 1.2, z0 + 0.5); P.vel.set(0, 0, 0);
      g.animalManager.invoquer('voiture', x0 + 3, z0 + 0.5, false, { flotte: 'koenigsegg-jesko.glb' });
      await dormir(600);
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); const t = performance.now(); while (!auVolant() && performance.now() - t < 2500) await dormir(150); }
      if (!auVolant()) { for (const [x, y, z] of poses) g.world.setBlock(x, y, z, 0); return { err: 'pas au volant' }; }
      const enJeu = (n, cb) => new Promise((fin) => { let c = 0, p = performance.now(); const pas = (t) => { const d = Math.min(Math.max((t - p) / 1000, 0), 0.05); c += d; p = t; if (cb) cb(c, d); if (c >= n) fin(c); else requestAnimationFrame(pas); }; requestAnimationFrame(pas); });
      // LES DÉGÂTS (v343) comptent chaque choc : trois chocs à la suite
      // pourraient mettre la voiture en feu et déposer l'enfant au milieu de la
      // série. On la répare (le garage) avant chaque mesure — c'est la
      // physique qu'on éprouve ici, pas les dégâts.
      const reparer = () => { const m = g.fun.montureConduite && g.fun.montureConduite(); if (m && g.fun.degats && g.fun.degats.reparer) g.fun.degats.reparer(m.mesh); };
      const placer = (x, z, yaw, v) => { reparer(); P.pos.set(x0 + x, y0 + 1.05, z0 + z); P.yaw = yaw; P.vitesseVoiture = v; P.derive = 0; P.braquage = 0; P.vel.set(-Math.sin(yaw) * v, 0, -Math.cos(yaw) * v); };
      const res = {};
      await enJeu(0.3);
      // — 0 → 100 km/h et pointe, plein avant au joystick —
      placer(0, 0.5, -Math.PI / 2, 0);
      P.touchMove.f = 1; P.touchMove.s = 0;
      let t100 = null, images = 0; const tw = performance.now();
      await enJeu(7, (c) => { images++; if (t100 === null && Math.abs(P.vitesseVoiture || 0) >= 27.78) t100 = c; });
      res.cadence = +(images / ((performance.now() - tw) / 1000)).toFixed(1);
      res.t100 = t100 == null ? null : +t100.toFixed(2);
      res.pointe = +Math.abs(P.vitesseVoiture || 0).toFixed(1);
      res.fiche = P.ficheVoiture || null;
      res.theorie = C && P.ficheVoiture ? { t100: +C.tempsJusqua(27.78, P.ficheVoiture).toFixed(2), vmax: P.ficheVoiture.vmax } : null;
      // — le freinage, joystick tiré —
      P.touchMove.f = -1; let tf = null;
      await enJeu(6, (c) => { if (tf === null && (P.vitesseVoiture || 0) <= 0.5) tf = c; });
      res.freinage = tf == null ? null : +tf.toFixed(2);
      P.touchMove.f = 0;
      // — le rayon de virage, volant à fond, à 6 puis à 20 blocs/s —
      const rayon = async (v) => {
        placer(150, 0, -Math.PI / 2, v);
        P.touchMove.s = 1;
        const pts = [];
        const vmax = P.ficheVoiture ? P.ficheVoiture.vmax : 25.6;
        await enJeu(5, (c) => { P.touchMove.f = Math.max(0, Math.min(1, v / vmax + (v - Math.abs(P.vitesseVoiture || 0)) * 0.2)); if (c > 1.5) pts.push([P.pos.x, P.pos.z, Math.abs(P.vitesseVoiture || 0), Math.abs(P.derive || 0)]); });
        P.touchMove.s = 0; P.touchMove.f = 0;
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        return { v, R: +(pts.reduce((a, p) => a + Math.hypot(p[0] - cx, p[1] - cz), 0) / pts.length).toFixed(1),
          vMoy: +(pts.reduce((a, p) => a + p[2], 0) / pts.length).toFixed(1), derive: +Math.max(...pts.map((p) => p[3])).toFixed(3),
          theorie: C && P.ficheVoiture ? +C.rayonDeVirage(v, P.ficheVoiture).toFixed(1) : null };
      };
      res.lent = await rayon(6);
      res.vite = await rayon(20);
      // — un mur rasant : la voiture arrive à douze degrés, à 24 blocs/s —
      for (let x = 100; x <= 400; x++) for (let h = 1; h <= 3; h++) poser(x0 + x, y0 + h, z0 + 20);
      const ang = 12 * Math.PI / 180;
      placer(110, 15, -Math.PI / 2 - ang, 24);
      P.touchMove.f = 0.75; P.choc = null; let n0 = P.chocs || 0, contact = null;
      await enJeu(2.5, (c) => { if (!contact && (P.chocs || 0) > n0) contact = { t: +c.toFixed(2), choc: P.choc }; });
      res.rasant = { contact, x: +(P.pos.x - x0).toFixed(1), v: +Math.abs(P.vitesseVoiture || 0).toFixed(1), capDeg: +((P.yaw + Math.PI / 2) * 180 / Math.PI).toFixed(1) };
      P.touchMove.f = 0;
      // — un mur de face, en travers, pris à 22 blocs/s —
      for (let z = -30; z <= 0; z++) for (let h = 1; h <= 3; h++) poser(x0 + 90, y0 + h, z0 + z);
      placer(50, -12, -Math.PI / 2, 22);
      P.choc = null; n0 = P.chocs || 0; let face = null, vMin = 0;
      await enJeu(3, (c) => { if (!face && (P.chocs || 0) > n0) face = { t: +c.toFixed(2), choc: P.choc }; if (face) vMin = Math.min(vMin, P.vitesseVoiture || 0); });
      res.face = { face, rebond: +vMin.toFixed(2), x: +(P.pos.x - x0).toFixed(1), v: +(P.vitesseVoiture || 0).toFixed(2) };
      // — une voiture de la rue : la famille « voiture » du crochet de main.js,
      // posée à la main en travers à x = 70 (le crochet RÉEL est éprouvé plus
      // haut, « la circulation s'arrête devant la voiture de l'enfant ») —
      const vrai = P.obstacleVehicule;
      P.obstacleVehicule = (x, z, cap, xa, za) => ((x - x0) > 66 && (xa - x0) <= 66 && Math.abs(z - z0 - 40) < 6 ? 'voiture' : (vrai ? vrai(x, z, cap, xa, za) : false));
      placer(20, 40, -Math.PI / 2, 18);
      P.touchMove.f = 1; P.choc = null; n0 = P.chocs || 0; let rue = null;
      await enJeu(3, (c) => { if (!rue && (P.chocs || 0) > n0) rue = { t: +c.toFixed(2), choc: P.choc, v: +(P.vitesseVoiture || 0).toFixed(2) }; });
      P.obstacleVehicule = vrai; P.touchMove.f = 0;
      res.rue = { rue, x: +(P.pos.x - x0).toFixed(1) };
      // — UNE VRAIE VOITURE DE LA RUE, PAR LE VRAI CROCHET (v397) : un convoi
      // d'une voiture garée (vitesse nulle) sur un anneau de la dalle. Une
      // voiture qui ROULE ne se rattrape pas au banc : la rue avance en temps
      // RÉEL (v305) et la nôtre en temps de jeu, dix fois plus lent à deux
      // images par seconde (sonde-vraie-rue.cjs). La vitesse relative se garde
      // donc sous node (plafond.js) ; ici, le crochet rend SA boîte
      // (`voitureContre`) et le choc prend la normale de son rectangle. On
      // frôle son flanc à quinze degrés, puis on la percute par l'arrière. Sur
      // l'ancien code, le flanc frôlé prend la normale du mouvement : un choc
      // franc, et l'on rebondit. —
      const zr = z0 - 50;
      const anneau = [[250, 0], [410, 0], [410, -8], [120, -8], [120, 0], [250, 0]].map(([dx, dz]) => ({ x: x0 + dx, y: y0 + 1, z: zr + dz }));
      const conv = g.vehicules.circulation(anneau, 77, { nb: 1, vitesse: 0 });
      const contre = async (pose, f, repere) => {
        reparer();
        const q = conv.place(0);
        const [dx, dz, yaw, v] = pose(q);
        // ON SE POSE, PUIS L'ON ATTEND UNE IMAGE : la rue relit ce qui
        // l'entoure à chaque image (`cederLePassage`), et une voiture posée de
        // loin à côté d'elle n'est pas encore dans sa liste — au premier pas,
        // la nôtre entrerait sans la voir, et serait « déjà dedans » ensuite.
        P.pos.set(dx, y0 + 1.05, dz); P.yaw = yaw; P.vitesseVoiture = 0; P.derive = 0; P.braquage = 0; P.vel.set(0, 0, 0);
        P.touchMove.f = 0;
        await enJeu(0.3);
        // ET L'ON ATTEND LE FAIT, PAS UNE DURÉE (banc-intermittents). Au
        // portail, le flanc rendait `{ c: null, lu: false }` une fois sur deux
        // ou trois, des deux côtés : la voiture n'était pas encore dans la
        // collecte de la rue quand la nôtre est partie, et deux secondes de jeu
        // à côté d'elle n'en voyaient jamais la boîte — le témoin mesurait
        // l'instant où la rue relit ses voitures, pas le choc. On attend que le
        // crochet la rende À SA PLACE (huit secondes au plus, en temps réel),
        // et le temps pris entre dans le message.
        const tVue = performance.now(); let vue = false;
        while (!(vue = !!(P.voitureContre && P.voitureContre(q.x, q.z, yaw + Math.PI))) && performance.now() - tVue < 8000) await enJeu(0.2);
        const attenteVue = Math.round(performance.now() - tVue);
        // ET L'ON SE POSE DANS LE REPÈRE DE LA VOITURE, PAS DANS CELUI DU MONDE
        // (banc-intermittents). Rejoué SEUL trois fois de chaque côté, le
        // flanc rendait `c: null` 3/3 sur la branche ET sur `origin/main` : la
        // voiture d'un convoi à l'arrêt se gare au COIN de l'anneau (x 410,
        // `garee`), pas sur sa ligne droite, et la pose « un bloc derrière,
        // trois de côté, quinze degrés vers elle » écrite pour une voiture
        // tournée vers +x la manquait. La pose se donne donc par rapport à la
        // BOÎTE que le crochet rend (centre, axe), quand le crochet la rend.
        const boite = vue ? P.voitureContre(q.x, q.z, yaw + Math.PI) : null;
        const [px, pz, pyaw] = boite && repere ? repere(boite) : [dx, dz, yaw];
        P.pos.set(px, y0 + 1.05, pz); P.yaw = pyaw; P.vitesseVoiture = v;
        P.vel.set(-Math.sin(pyaw) * v, 0, -Math.cos(pyaw) * v);
        P.touchMove.f = f; P.choc = null; P.contact = null; const n = P.chocs || 0; let c = null; const lus = [];
        const vrai = P.voitureContre;
        P.voitureContre = (x, z, cap) => { const o = vrai ? vrai(x, z, cap) : null; lus.push(!!o); return o; };
        // au PREMIER contact (un choc publié, ou une voiture touchée sous le
        // seuil d'un choc) : la force, la vitesse d'après, et où sur NOTRE
        // caisse le choc s'est dit (le long du cap, en travers)
        await enJeu(2, () => { if (!c && ((P.chocs || 0) > n || (P.contact && P.contact.famille === 'voiture'))) {
          const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
          const ch = (P.chocs || 0) > n ? P.choc : null;
          const ex = ch ? ch.x - P.pos.x : 0, ez = ch ? ch.z - P.pos.z : 0;
          c = { force: ch ? ch.force : 0, v: +(P.vitesseVoiture || 0).toFixed(1), long: +(ex * fx + ez * fz).toFixed(2), lat: +Math.abs(ex * fz - ez * fx).toFixed(2), contact: P.contact ? P.contact.famille : null };
        } });
        P.voitureContre = vrai; P.touchMove.f = 0;
        return { c, lu: lus.some(Boolean), garee: [+(q.x - x0).toFixed(1), +(q.z - zr).toFixed(1)], axe: boite ? [+boite.ux.toFixed(2), +boite.uz.toFixed(2)] : null, vue, attenteVue };
      };
      await enJeu(0.5);
      // le flanc : à côté d'elle, quinze degrés vers elle, à 16 (à dix degrés
      // le contact reste sous le seuil d'un choc, et rien ne se publie)
      const a15 = 15 * Math.PI / 180;
      res.vraieFlanc = await contre((q) => [q.x - 1, q.z + 3, Math.atan2(-Math.cos(a15), Math.sin(a15)), 16], 0.6,
        // dans son repère : h son axe, n son côté ; un bloc en arrière, trois
        // de côté, le cap tourné de quinze degrés vers elle
        (o) => { const hx = o.ux, hz = o.uz, nx = -hz, nz = hx;
          const fx = Math.cos(a15) * hx - Math.sin(a15) * nx, fz = Math.cos(a15) * hz - Math.sin(a15) * nz;
          return [o.x - hx + 3 * nx, o.z - hz + 3 * nz, Math.atan2(-fx, -fz)]; });
      // par l'arrière, à 18, sur sa voie, cap +x
      res.vraieArriere = await contre((q) => [q.x - 9, q.z, -Math.PI / 2, 18], 0.6);
      g.vehicules.retirer(`${conv.cle}#0`);
      // — une panne posée à la main : le joystick ne fait plus rien —
      placer(0, -40, -Math.PI / 2, 0);
      // les dégâts (v343) réécrivent `etatVoiture` à chaque image depuis LEUR
      // état de la voiture : on fige le champ le temps de la mesure — c'est
      // la LECTURE par la physique qu'on éprouve, pas l'écriture des dégâts
      const panneFigee = { sante: 0, moteur: 0, direction: 0, enPanne: true, enFeu: false };
      Object.defineProperty(P, 'etatVoiture', { configurable: true, get: () => panneFigee, set: () => {} });
      P.touchMove.f = 1; P.touchMove.s = 1; const yawPanne = P.yaw;
      await enJeu(2);
      res.panne = { v: +Math.abs(P.vitesseVoiture || 0).toFixed(2), x: +(P.pos.x - x0).toFixed(2), tourne: +Math.abs(P.yaw - yawPanne).toFixed(3) };
      P.touchMove.f = 0; P.touchMove.s = 0;
      delete P.etatVoiture; P.etatVoiture = undefined;
      // — UNE VOITURE NEUVE N'HÉRITE PAS DU DERNIER CHOC DE LA PRÉCÉDENTE
      // (v358). Les dégâts rejouent tout `choc` dont la date n'est pas la
      // dernière vue POUR CETTE VOITURE ; une voiture neuve n'en a vu aucun.
      // On frappe un choc franc, on descend, on prend une voiture neuve, et
      // l'on lit ce que les dégâts publient pour elle — sans rouler. —
      P.choc = { force: 1, t: performance.now(), x: P.pos.x, z: P.pos.z };
      await enJeu(0.3);
      for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await dormir(400); }
      vider();
      P.pos.set(x0, y0 + 1.2, z0 + 20.5); P.vel.set(0, 0, 0); P.yaw = -Math.PI / 2;
      g.animalManager.invoquer('voiture', x0 + 3, z0 + 20.5, false, { flotte: 'berline-citadine' });
      await dormir(600);
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); const t = performance.now(); while (!auVolant() && performance.now() - t < 2500) await dormir(150); }
      await enJeu(0.5);
      const evNeuve = P.etatVoiture;
      res.neuve = { auVolant: auVolant(), ev: evNeuve ? { sante: +(+evNeuve.sante).toFixed(3), moteur: +(+evNeuve.moteur).toFixed(3), direction: +(+evNeuve.direction || 0).toFixed(4) } : null };
      for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await dormir(400); }
      vider();
      for (const [x, y, z] of poses) g.world.setBlock(x, y, z, 0);
      return res;
    });
      const f = gta || {};
      console.log(`passage ${k} : flanc ${JSON.stringify(f.vraieFlanc)} · arrière ${JSON.stringify(f.vraieArriere)} ${f.err || ''}`);
      await pageGta.close().catch(() => {});
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
