// LES DÉGÂTS DE LA VOITURE (v343).
//
// Max : « Comme dans GTA, quand tu crashes ton véhicule, il s'abîme, tu vois
// vraiment les défauts de carrosserie… La voiture perd son sens, à un moment
// elle ne marche plus, potentiellement elle prend feu, on se retrouve à sortir
// de la voiture. »
//
// UNE SUITE À ELLE, ET PAS DES LIGNES DE PLUS DANS `monte.js` : celle-ci dure
// un quart d'heure et six sessions du chantier « conduite » y écrivent en même
// temps. Les dégâts tiennent sur UNE page de jeu et une dalle à l'écart.
//
// Deux temps. D'abord la règle, sous node (`src/degats.js` est pur) : la
// santé, les zones, la panne, le feu, le repli de détection, le réseau. Puis le
// trajet de l'enfant, dans le jeu : il fonce dans un mur, la tôle s'enfonce à
// l'avant et pas à l'arrière, l'autre voiture du même modèle reste intacte, la
// voiture cale, prend feu, et l'enfant se retrouve debout à côté.
//
// Chaque témoin est vérifié ROUGE sur l'ancien code : sans `degats.js` la
// règle n'existe pas, et sans le crochet de `fun.js` aucun choc n'est compté.
//
//     cd tests && node degats.js

const { Banc, dormir, jusqua } = require('./banc.js');

const echecs = [];
let _dernier = Date.now();
function verifier(nom, ok, detail = '') {
  const dt = Math.round((Date.now() - _dernier) / 1000);
  _dernier = Date.now();
  console.log(`${ok ? '✅' : '❌'} [${String(dt).padStart(3)} s] ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

(async () => {
  // ---------------------------------------------------------------- la règle
  const D = await import('../src/degats.js').catch(() => null);
  verifier('la règle des dégâts existe, et elle se lit sans navigateur', !!D);
  if (D) {
    // la santé baisse avec la force ; un frôlement ne compte pas
    const faible = D.etatNeuf(), fort = D.etatNeuf(), frole = D.etatNeuf();
    D.subirChoc(faible, { force: 0.3, lx: 0, lz: -2.2 });
    D.subirChoc(fort, { force: 0.9, lx: 0, lz: -2.2 });
    D.subirChoc(frole, { force: 0.03, lx: 0, lz: -2.2 });
    verifier('la santé baisse avec la force du choc, et un frôlement ne coûte rien',
      fort.sante < faible.sante && faible.sante < 1 && frole.sante === 1,
      `fort ${fort.sante} · faible ${faible.sante} · frôlé ${frole.sante}`);

    // le point d'impact du MONDE tombe sur la bonne zone, quel que soit le cap
    const zones = [];
    for (const cap of [0, 0.7, Math.PI / 2, 2.4, -1.9]) {
      const av = { x: -Math.sin(cap), z: -Math.cos(cap) };      // l'avant du joueur
      const dr = { x: Math.cos(cap), z: -Math.sin(cap) };       // sa droite
      const pt = (u, k) => D.versRepere(0, 0, cap, u.x * k, u.z * k);
      const z = (p) => D.zoneDe(p.lx, p.lz);
      zones.push([z(pt(av, 2.4)), z(pt(av, -2.4)), z(pt(dr, 1.2)), z(pt(dr, -1.2))].join('/'));
    }
    verifier('un impact devant touche l\'avant, derrière l\'arrière, à droite le flanc droit — à tous les caps',
      zones.every((z) => z === 'avant/arriere/droite/gauche'), zones.join(' '));

    // la zone touchée prend, les autres non ; un flanc enfoncé fait tirer
    const flanc = D.etatNeuf();
    D.subirChoc(flanc, { force: 0.8, lx: -1.13, lz: 0 });
    verifier('un choc sur le flanc gauche abîme ce flanc, et la direction tire à gauche',
      flanc.zones.gauche < 1 && flanc.zones.avant === 1 && flanc.zones.arriere === 1 && flanc.direction > 0,
      JSON.stringify({ zones: flanc.zones, direction: flanc.direction }));

    // le moteur est touché : la voiture va moins vite ; sous le seuil, elle cale
    const e = D.etatNeuf();
    D.subirChoc(e, { force: 0.8, lx: 0, lz: -2.2 });
    const touchee = D.effetsConduite(e);
    D.subirChoc(e, { force: 0.8, lx: 0, lz: -2.2 });
    const calee = D.effetsConduite(e);
    verifier('moteur touché : l\'allure baisse ; sous le seuil, la voiture CALE (allure nulle)',
      touchee.allure < 1 && touchee.allure > 0 && e.enPanne && calee.allure === 0,
      `touchée ${touchee.allure.toFixed(2)} · après ${calee.allure} · ${JSON.stringify(D.publier(e))}`);

    // sous le seuil critique, le feu ; il dépose l'enfant, s'éteint, la carcasse s'en va
    const feu = D.etatNeuf();
    for (let i = 0; i < 4; i++) D.subirChoc(feu, { force: 0.9, lx: 0, lz: i % 2 ? 2.2 : -2.2 });
    const evts = [];
    for (let t = 0; t < D.DUREE_FEU + D.DUREE_CARCASSE + 2; t += 0.1) {
      const ev = D.avancerFeu(feu, 0.1, true);
      if (ev) evts.push(`${ev}@${t.toFixed(1)}`);
    }
    verifier('sous le seuil critique la voiture brûle : on sort, le feu s\'éteint, la carcasse s\'en va',
      evts.length === 3 && evts[0].startsWith('sortir') && evts[1].startsWith('eteint') && evts[2].startsWith('partie'),
      evts.join(' '));

    // le repli : un frein n'est pas un choc, un mur si
    const vmax = 20.5, dt = 1 / 30;
    const frein = D.detecterChoc(20, 20 - 2.5 * vmax * dt, dt, vmax);
    const mur = D.detecterChoc(20, 0.4, dt, vmax);
    verifier('le repli de détection : freiner n\'est pas un choc, un mur à pleine vitesse en est un fort',
      frein === 0 && mur > 0.8, `frein ${frein} · mur ${mur}`);

    // le réseau rejoue la même voiture
    const r = D.depuisReseau(JSON.parse(JSON.stringify(D.versReseau(feu))));
    verifier('le champ réseau rejoue la même voiture chez l\'ami (santé, zones, feu)',
      Math.abs(r.sante - feu.sante) < 0.02 && r.zones.avant === feu.zones.avant && r.eteint === feu.eteint,
      `${JSON.stringify(D.publier(r))} contre ${JSON.stringify(D.publier(feu))}`);
  }

  // ----------------------------------------------------------- dans le jeu
  const banc = new Banc({ portJeu: 8417, portPairs: 9417 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Dégâts', { rr: 2, pret: true });
    const erreurs = [];
    tab.on('pageerror', (e) => erreurs.push(String(e.message || e)));

    // UNE DALLE À L'ÉCART, UN MUR AU BOUT, DEUX VOITURES DU MÊME MODÈLE. Le
    // témoin se place lui-même (v284) : on descend, on retire les bêtes, puis
    // on invoque — sinon la monture laissée là par un témoin d'avant est
    // remontée au premier clic.
    const prep = await tab.evaluate(async () => {
      const g = window.__game;
      const { BLOCK } = await import('./src/blocks.js');
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      const x0 = 30000, z0 = 32400, L = 70;
      let y0 = 0;
      for (let d = -L; d <= L; d += 4) for (let w = -8; w <= 8; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 2;
      for (let d = -L; d <= L; d++) for (let w = -8; w <= 8; w++) {
        g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
        for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
      }
      // le mur, à quarante blocs devant (vers +x)
      for (let w = -8; w <= 8; w++) for (let h = 1; h <= 4; h++) g.world.setBlock(x0 + 40, y0 + h, z0 + w, BLOCK.STONE);
      g.player.keys.clear();
      g.player.pilote = null; g.player.flying = false; g.player.gaz = null;
      g.player.yaw = -Math.PI / 2; g.player.pitch = 0;          // le nez vers +x
      g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
      await tenir(1);
      for (let e = 0; e < 6 && g.fun.montureConduite && g.fun.montureConduite(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
      for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
      g.animalManager.animals.length = 0;
      const flotte = 'ferrari-f40.glb';
      const a = g.animalManager.invoquer('voiture', x0 + 3, z0, false, { flotte });
      const b = g.animalManager.invoquer('voiture', x0 - 12, z0 + 6, false, { flotte });
      if (!a || !b) return { err: 'aucune voiture posée' };
      const t0 = performance.now();
      while (performance.now() - t0 < 30000 && !(a.mesh.userData.roues && b.mesh.userData.roues)) await tenir(0.3);
      if (!a.mesh.userData.roues) return { err: 'le modèle n\'est jamais arrivé' };
      a.pos.y = y0 + 1.01; a.mesh.position.y = a.pos.y;
      for (let e = 0; e < 8 && !(g.fun.montureConduite && g.fun.montureConduite()); e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
      const auVolant = !!(g.fun.montureConduite && g.fun.montureConduite());
      window.__essai = { a, b, x0, z0, y0 };
      return { auVolant, y0, flotte, attente: Math.round(performance.now() - t0) };
    });
    verifier('on est au volant d\'une voiture de la flotte, sur la dalle d\'essai', !prep.err && prep.auVolant, JSON.stringify(prep));

    // AVANT TOUT CHOC : les programmes et les lampes de la scène, voiture
    // dessinée, quelques images passées.
    const avant = await tab.evaluate(async () => {
      const g = window.__game;
      await new Promise((f) => setTimeout(f, 1500));
      let lampes = 0;
      g.scene.traverse((o) => { if (o.isLight) lampes++; });
      // LES CLÉS, PAS LE COMPTE (v363) : un programme RENDU par un objet qui
      // s'en va fait baisser le compte (97 → 96 mesuré, rouge des deux côtés)
      // sans rien dire d'une compilation. Ce qui est compilé au choc est une
      // clé qui n'existait pas avant.
      return { programmes: g.renderer.info.programs.length, cles: g.renderer.info.programs.map((q) => q.cacheKey), lampes };
    });

    // 1. LE TRAJET DE L'ENFANT : pleins gaz, droit dans le mur. Le choc passe
    // par le VRAI chemin (la physique s'il publie `player.choc`, le repli sinon).
    const crash = await tab.evaluate(async () => {
      const g = window.__game, { a } = window.__essai;
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      const d = g.fun.degats;
      if (!d) return { err: 'pas de module de dégâts (fun.degats)' };
      // ce qui sert à prouver le chemin (v365) : les chocs que la PHYSIQUE a
      // publiés (`player.chocs`, compté par player.js), et par quel chemin les
      // dégâts les ont pris
      const chocsPhys0 = g.player.chocs || 0, chemins0 = d.chemins ? d.chemins() : null;
      const choc0 = g.player.choc, lit = g.player.physiqueLitEtat;
      g.player.gaz = 1;
      let vmax = 0, etat = null;
      const t0 = performance.now();
      while (performance.now() - t0 < 25000) {
        await tenir(0.1);
        vmax = Math.max(vmax, Math.abs(g.player.vitesseVoiture || 0));
        etat = d.etat(a.mesh);
        if (etat && etat.chocs.length) break;
      }
      g.player.gaz = 0;
      await tenir(0.5);
      // LA TÔLE DU VRAI CHOC, lue dans la géométrie avant tout autre choc
      const THREE = await import('three');
      const p = new THREE.Vector3(), q = new THREE.Vector3();
      let avantMax = 0, arriereMax = 0;
      for (const pc of d.pieces(a.mesh) || []) {
        if (!pc.propre) continue;
        const o = pc.geoOrig.attributes.position, n = pc.mesh.geometry.attributes.position;
        for (let i = 0; i < o.count; i++) {
          p.set(o.getX(i), o.getY(i), o.getZ(i)).applyMatrix4(pc.M);
          q.set(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix4(pc.M);
          const dep = p.distanceTo(q);
          if (p.z < -1.2) avantMax = Math.max(avantMax, dep);
          if (p.z > 1.2) arriereMax = Math.max(arriereMax, dep);
        }
      }
      // L'EFFET SUR LA CONDUITE, appliqué UNE fois : l'allure (`boost`) reste
      // celle de la classe — c'est la physique qui lit le moteur, dans son
      // plafond (0,35 + 0,65 × moteur) — et rien n'a été appliqué ici
      const { allureDe } = await import('./src/vehicules.js');
      const allure = allureDe ? allureDe(a.mesh.userData.flotte) : null;
      const ev = g.player.etatVoiture;
      const r3 = (v) => Math.round(v * 1000) / 1000;
      return { vmax: Math.round(vmax * 10) / 10, etat: etat ? { sante: etat.sante, zones: etat.zones, chocs: etat.chocs } : null,
        publie: g.player.etatVoiture, mesure: d.mesure(a.mesh), x: Math.round(g.player.pos.x - window.__essai.x0),
        chocsPhys: (g.player.chocs || 0) - chocsPhys0, choc0: choc0 === undefined ? 'undefined' : choc0, lit,
        chemins0, chemins: d.chemins ? d.chemins() : null,
        avantMax: r3(avantMax), arriereMax: r3(arriereMax),
        boost: g.player.boost, allure,
        plafondLu: g.player.ficheVoiture ? r3(g.player.vitesseVoitureMax / g.player.ficheVoiture.vmax) : null,
        plafondAttendu: ev ? r3(0.35 + 0.65 * Math.max(0, Math.min(1, ev.moteur))) : null };
    });
    verifier('foncer dans un mur abîme la voiture : la santé baisse, l\'AVANT est touché, l\'état est publié pour la physique',
      !crash.err && crash.etat && crash.etat.sante < 1 && crash.etat.zones.avant < crash.etat.zones.arriere
        && crash.publie && crash.publie.sante < 1,
      JSON.stringify(crash));

    // A. LE CONTRAT, BOUT À BOUT, PAR LA VRAIE PHYSIQUE (v365). Le témoin du
    // contrat plus bas publie ses chocs à la main ; celui-ci n'écrit RIEN dans
    // `player` : c'est player.js qui publie le choc du mur, et l'on vérifie ce
    // que chaque côté en a fait.
    const ch = crash.chemins, ch0 = crash.chemins0 || {};
    verifier('un mur pris de face à pleine vitesse, par la VRAIE physique : un choc publié, pris par ce chemin et par lui seul',
      !crash.err && crash.chocsPhys >= 1 && crash.choc0 !== 'undefined' && crash.lit === true && !!ch
        && ch.publies - (ch0.publies || 0) >= 1 && ch.repli === (ch0.repli || 0),
      JSON.stringify({ chocsPhys: crash.chocsPhys, choc0: crash.choc0, lit: crash.lit, chemins0: ch0, chemins: ch }));
    verifier('… la tôle froissée à l\'AVANT seulement, lue sur la géométrie de CE choc-là',
      !crash.err && crash.avantMax > 0.05 && crash.arriereMax < 0.02,
      `avant ${crash.avantMax}, arrière ${crash.arriereMax}`);
    verifier('… et l\'effet sur la conduite appliqué UNE fois : allure de la classe intacte, le moteur lu dans le plafond de la physique, rien appliqué ici',
      !crash.err && !!ch && ch.effetsIci === (ch0.effetsIci || 0) && crash.allure != null
        && Math.abs(crash.boost - crash.allure) < 1e-6 && crash.plafondLu != null && Math.abs(crash.plafondLu - crash.plafondAttendu) < 0.002,
      JSON.stringify({ boost: crash.boost, allure: crash.allure, plafondLu: crash.plafondLu, plafondAttendu: crash.plafondAttendu,
        effetsIci: ch && ch.effetsIci, sante: crash.publie && crash.publie.sante }));

    // Un second choc fort à l'avant, par la porte publique : la mesure de la
    // géométrie doit voir un enfoncement net, à l'avant seulement.
    const geo = await tab.evaluate(async () => {
      const g = window.__game, { a, b } = window.__essai, d = g.fun.degats;
      if (!d) return { err: 'pas de module' };
      // B. CE QUE FAIT UN CHOC, EN COMPTES ET NON EN MILLISECONDES (v365) :
      // les positions et les normales de chaque pièce, relevées avant, puis
      // comparées — combien de sommets ont bougé, combien de normales ont été
      // réécrites, sur combien de sommets en tout.
      const avantPieces = (d.pieces(a.mesh) || []).map((pc) => {
        const g2 = pc.mesh.geometry;
        return { g: g2, pos: g2.attributes.position.array.slice(), nor: g2.attributes.normal ? g2.attributes.normal.array.slice() : null };
      });
      const r = d.choc(a.mesh, { force: 1, lx: 0, lz: -2.2 });
      const pieces = d.pieces(a.mesh) || [];
      let sommets = 0, bouges = 0, normales = 0, avecNormales = 0;
      for (let k = 0; k < pieces.length; k++) {
        const g2 = pieces[k].mesh.geometry, av = avantPieces[k];
        const pos = g2.attributes.position, nor = g2.attributes.normal;
        // une pièce clonée À CE CHOC se compare à l'original (même tableau)
        const ap = av && av.g === g2 ? av.pos : pieces[k].geoOrig.attributes.position.array;
        const an = av && av.g === g2 ? av.nor : (pieces[k].geoOrig.attributes.normal ? pieces[k].geoOrig.attributes.normal.array : null);
        sommets += pos.count;
        for (let i = 0; i < pos.count; i++) {
          const i3 = i * 3;
          const b = pos.array[i3] !== ap[i3] || pos.array[i3 + 1] !== ap[i3 + 1] || pos.array[i3 + 2] !== ap[i3 + 2];
          if (b) bouges++;
          if (nor && an) {
            avecNormales++;
            if (Math.abs(nor.array[i3] - an[i3]) + Math.abs(nor.array[i3 + 1] - an[i3 + 1]) + Math.abs(nor.array[i3 + 2] - an[i3 + 2]) > 1e-6 && !b) normales++;
          }
        }
      }
      // ET RIEN PAR IMAGE : une seconde après le choc, aucun enfoncement de
      // plus et pas une version de tampon qui ait bougé
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      const versions = () => pieces.reduce((n, pc) => n + pc.mesh.geometry.attributes.position.version
        + (pc.mesh.geometry.attributes.normal ? pc.mesh.geometry.attributes.normal.version : 0), 0);
      const enf0 = d.chemins ? d.chemins().enfoncements : null, v0 = versions(), img0 = g.renderer.info.render.frame;
      await tenir(1);
      const parImage = { enfoncements: d.chemins ? d.chemins().enfoncements - enf0 : null, versions: versions() - v0,
        images: g.renderer.info.render.frame - img0 };
      const THREE = await import('three');
      let avantMax = 0, arriereMax = 0, clones = 0, lues = 0;
      const p = new THREE.Vector3(), q = new THREE.Vector3();
      for (const pc of pieces) {
        if (!pc.propre) continue;
        clones++;
        const o = pc.geoOrig.attributes.position, n = pc.mesh.geometry.attributes.position;
        for (let i = 0; i < o.count; i++) {
          p.set(o.getX(i), o.getY(i), o.getZ(i)).applyMatrix4(pc.M);
          q.set(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix4(pc.M);
          const dep = p.distanceTo(q);
          lues++;
          if (p.z < -1.2) avantMax = Math.max(avantMax, dep);
          if (p.z > 1.2) arriereMax = Math.max(arriereMax, dep);
        }
      }
      // L'AUTRE VOITURE DU MÊME MODÈLE : ses géométries sont les originales,
      // partagées, et pas un sommet n'a bougé.
      const originales = new Set(pieces.map((pc) => pc.geoOrig));
      let partagees = 0, propresB = 0;
      b.mesh.traverse((o) => { if (o.isMesh && o.geometry) { if (originales.has(o.geometry)) partagees++; } });
      for (const pc of pieces) if (pc.propre && pc.mesh.geometry === pc.geoOrig) propresB++;
      // et un sommet de l'original, relu : identique à ce qu'il était
      return { r, clones, lues, avantMax: Math.round(avantMax * 1000) / 1000, arriereMax: Math.round(arriereMax * 1000) / 1000,
        partagees, propresB, ms: r && r.mesure ? Math.round(r.mesure.ms * 10) / 10 : null,
        sommets, bouges, normales, avecNormales, parImage };
    });
    verifier('la tôle s\'enfonce À L\'AVANT (sommets déplacés, lus dans la géométrie) et PAS à l\'arrière',
      !geo.err && geo.lues > 0 && geo.avantMax > 0.15 && geo.arriereMax < 0.02,
      JSON.stringify(geo));
    verifier('l\'autre voiture du même modèle reste INTACTE : elle garde la géométrie commune, que personne n\'a touchée',
      !geo.err && geo.clones > 0 && geo.partagees > 0 && geo.propresB === 0, JSON.stringify(geo));
    // B. UNE GRANDEUR QUI NE DÉPEND PAS DU PROCESSEUR PARTAGÉ (v365). Le
    // témoin d'avant bornait des millisecondes : 15 seul, 31,1 une fois au
    // portail de la v348 — il mesurait la charge. Ce qu'un choc FAIT ne
    // dépend pas d'elle : il ne déplace qu'une part de la voiture, il ne
    // réécrit AUCUNE normale d'un sommet resté en place (la limitation de la
    // v343 : `computeVertexNormals` sur toute la pièce les réécrivait toutes),
    // et après lui, plus rien par image. Les millisecondes restent dans le
    // MESSAGE (v270) : elles servent à démonter un rouge, jamais à en faire un.
    // La part déplacée vaut 25,6 % au choc de force 1 (5 493 sur 21 412) : la
    // barre de garde est à la MOITIÉ (v237), elle sépare « une zone » de « tout ».
    const premier = crash.mesure ? Math.round(crash.mesure.ms * 10) / 10 : null;
    const pi = geo.parImage || {};
    verifier('enfoncer touche une part de la voiture, ne réécrit aucune normale de sommet resté en place, et rien par image',
      !geo.err && geo.bouges > 0 && geo.bouges < geo.sommets * 0.5 && geo.avecNormales > 0 && geo.normales === 0
        && pi.enfoncements === 0 && pi.versions === 0 && pi.images > 0,
      `${geo.bouges} sommets déplacés sur ${geo.sommets}, ${geo.normales} normales réécrites hors d'eux (sur ${geo.avecNormales}), `
        + `par image : ${JSON.stringify(pi)} — premier choc ${premier} ms (clone ${crash.mesure && crash.mesure.msClone}, normales ${crash.mesure && crash.mesure.msNormales}), suivant ${geo.ms} ms`);

    const pieces = await tab.evaluate(() => {
      const g = window.__game, { a, b } = window.__essai, d = g.fun.degats;
      const ps = (d && d.pieces(a.mesh)) || [];
      const phares = ps.filter((pc) => /light_front|lights_front/i.test(pc.nom));
      const vitres = ps.filter((pc) => /glass|window/i.test(pc.nom));
      const em = (m) => (m && m.emissive ? m.emissive.r + m.emissive.g + m.emissive.b : -1);
      let emB = -1;
      b.mesh.traverse((o) => { if (o.isMesh && /lights_front/i.test(o.name)) emB = em(o.material); });
      return {
        phares: phares.map((pc) => ({ casse: !!pc.cassee, em: em(pc.mesh.material), propre: pc.matPropre })),
        vitres: vitres.map((pc) => ({ etoilee: !!pc.etoilee })),
        emB,
      };
    });
    verifier('phares cassés (l\'émissif s\'éteint) et vitres étoilées — sur CETTE voiture, pas sur l\'autre',
      pieces.phares.length > 0 && pieces.phares.every((p) => p.casse && p.em === 0)
        && pieces.vitres.some((v) => v.etoilee) && pieces.emB > 0,
      JSON.stringify(pieces));

    // 2. LA FUMÉE, LA PANNE : la voiture ne repart plus.
    const panne = await tab.evaluate(async () => {
      const g = window.__game, { a } = window.__essai, d = g.fun.degats;
      if (!d) return { err: 'pas de module de dégâts' };
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      // on recule la voiture au milieu de la dalle, nez vers −x, loin du mur
      const { x0, z0, y0 } = window.__essai;
      g.player.pos.set(x0 + 5, y0 + 1.01, z0 + 0.5); g.player.yaw = Math.PI / 2; g.player.vitesseVoiture = 0;
      await tenir(0.5);
      while (!d.etat(a.mesh).enPanne) d.choc(a.mesh, { force: 0.5, lx: 0, lz: 2.2 });
      await tenir(0.6);
      const fumee = d.particulesVisibles().fumee;
      const p0 = { x: g.player.pos.x, z: g.player.pos.z };
      g.player.gaz = 1;
      await tenir(2.5);
      g.player.gaz = 0;
      const bouge = Math.hypot(g.player.pos.x - p0.x, g.player.pos.z - p0.z);
      return { fumee, bouge: Math.round(bouge * 100) / 100, publie: g.player.etatVoiture,
        auVolant: !!g.fun.montureConduite(), sante: d.etat(a.mesh).sante };
    });
    verifier('le moteur atteint FUME, et sous le seuil la voiture cale : pleins gaz, elle ne bouge plus',
      panne.fumee > 0 && panne.publie && panne.publie.enPanne && panne.bouge < 0.3 && panne.auVolant,
      JSON.stringify(panne));

    // 3. LE FEU : l'enfant est déposé À CÔTÉ, debout et à pied, sain et sauf.
    const feu = await tab.evaluate(async () => {
      const g = window.__game, { a } = window.__essai, d = g.fun.degats;
      if (!d) return { err: 'pas de module de dégâts' };
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      while (!d.etat(a.mesh).enFeu) d.choc(a.mesh, { force: 0.6, lx: 1.1, lz: 0 });
      const t0 = performance.now();
      let flammes = 0, appels = null;
      while (performance.now() - t0 < 12000 && g.fun.montureConduite()) {
        await tenir(0.2);
        flammes = Math.max(flammes, d.particulesVisibles().flammes);
        // CE QUE LE FEU COÛTE EN APPELS DE DESSIN (v348) : la même image
        // rendue deux fois, l'essaim caché puis montré, dans la même tâche.
        // Mesuré une fois le feu bien pris (au moins une seconde, et plus de
        // deux carrés à l'écran — sinon l'égalité ne prouverait rien).
        const vis = d.particulesVisibles();
        if (!appels && performance.now() - t0 > 1000 && vis.fumee + vis.flammes > 4) {
          const fx = g.scene.getObjectByName('degats-fx');
          if (fx) {
            const cam = g.player.camera, info = g.renderer.info;
            fx.visible = false; g.renderer.render(g.scene, cam); const sans = info.render.calls;
            fx.visible = true; g.renderer.render(g.scene, cam); const avec = info.render.calls;
            appels = { sans, avec, feu: avec - sans, carres: vis.fumee + vis.flammes };
          }
        }
      }
      const sortie = Math.round(performance.now() - t0);
      await tenir(1);
      flammes = Math.max(flammes, d.particulesVisibles().flammes);
      const dist = Math.hypot(g.player.pos.x - a.pos.x, g.player.pos.z - a.pos.z);
      const pied = g.world.isSolid(Math.floor(g.player.pos.x), Math.floor(g.player.pos.y + 0.2), Math.floor(g.player.pos.z));
      const tete = g.world.isSolid(Math.floor(g.player.pos.x), Math.floor(g.player.pos.y + 1.2), Math.floor(g.player.pos.z));
      // et la carcasse ne se reprend pas : face à elle, aucune monture proposée
      g.player.yaw = Math.atan2(-(a.pos.x - g.player.pos.x), -(a.pos.z - g.player.pos.z));
      await tenir(0.4);
      const proposee = g.animalManager.monture() === a;
      return { sortie, flammes, appels, aPied: !g.fun.montureConduite(), gabarit: g.player.gabarit,
        dist: Math.round(dist * 100) / 100, dansUnMur: pied || tete, proposee, publie: g.player.etatVoiture };
    });
    verifier('la voiture prend feu (des flammes), et quelques secondes plus tard l\'enfant est DÉPOSÉ à côté, à pied, hors de tout mur',
      feu.aPied && feu.flammes > 0 && feu.sortie > 3000 && feu.sortie < 11000 && feu.dist > 1.5 && feu.dist < 5
        && !feu.dansUnMur && !(feu.gabarit > 1) && feu.publie === null,
      JSON.stringify(feu));
    // LA BARRE SE CALCULE : DEUX — un appel pour toute la fumée, un pour
    // toutes les flammes, quel que soit le nombre de carrés (v196 : sur
    // l'iPad, ce sont les appels de dessin qui coûtent).
    verifier('le feu coûte DEUX appels de dessin au plus, quel que soit le nombre de flammes et de nuages',
      !!feu.appels && feu.appels.carres > 4 && feu.appels.feu <= 2, JSON.stringify(feu.appels));
    verifier('la carcasse qui brûle ne se reprend pas : le bouton ne la propose plus', !feu.err && feu.flammes > 0 && !feu.proposee, JSON.stringify(feu));

    // 4. NI LAMPE NI PROGRAMME NEUF : la fumée et les flammes ont été chauffées
    // pendant l'accueil (v246), et l'on n'a changé que des uniformes.
    const apres = await tab.evaluate(async () => {
      const g = window.__game;
      await new Promise((f) => setTimeout(f, 1500));
      let lampes = 0;
      g.scene.traverse((o) => { if (o.isLight) lampes++; });
      // LES CLÉS, PAS LE COMPTE (v363) : un programme RENDU par un objet qui
      // s'en va fait baisser le compte (97 → 96 mesuré, rouge des deux côtés)
      // sans rien dire d'une compilation. Ce qui est compilé au choc est une
      // clé qui n'existait pas avant.
      return { programmes: g.renderer.info.programs.length, cles: g.renderer.info.programs.map((q) => q.cacheKey), lampes };
    });
    // (et seulement si le feu a VRAIMENT brûlé : sans flammes, l'égalité ne
    // prouverait rien — elle serait vraie sur l'ancien code)
    verifier('aucune lampe de plus dans la scène (quatre pour tout le jeu, v248)', feu.flammes > 0 && apres.lampes === avant.lampes,
      `${avant.lampes} → ${apres.lampes}, flammes ${feu.flammes}`);
    const neufs = apres.cles.filter((k) => !avant.cles.includes(k));
    verifier('aucun programme de shader compilé au choc ni au feu (chauffés à l\'accueil)', feu.flammes > 0 && neufs.length === 0,
      `${neufs.length} clé(s) neuve(s) ${neufs.map((k) => k.slice(0, 60)).join(' | ')} — compte ${avant.programmes} → ${apres.programmes}, flammes ${feu.flammes}`);

    // 4 bis. LE COÛT RÉEL SE LIT SUR LA TABLETTE (v364). Le banc rend en
    // logiciel : ses millisecondes ne se transposent pas (v247). Le journal de
    // bord (v296) doit donc garder ce que l'appareil a mesuré — le dernier
    // enfoncement et ce que coûte le feu — pour que Max le relise sur l'iPad.
    const journalDegats = await tab.evaluate(async () => {
      const j = window.__journal, d = window.__game.fun.degats;
      if (!j) return { err: 'pas de journal' };
      const t0 = performance.now();
      let r = null;
      while (performance.now() - t0 < 12000) {
        r = [...j.doc.releves].reverse().find((x) => x.degats) || null;
        if (r && r.degats.feu > 0) break;
        await new Promise((f) => setTimeout(f, 300));
      }
      return { releve: r ? r.degats : null, bilan: d && d.bilan ? d.bilan() : null, attente: Math.round(performance.now() - t0) };
    });
    verifier('le journal de bord garde le coût réel des dégâts : le dernier enfoncement en ms, et les appels du feu',
      !journalDegats.err && journalDegats.releve && journalDegats.releve.chocs > 0 && journalDegats.releve.dernierMs > 0
        && journalDegats.releve.feu >= 1 && journalDegats.releve.feu <= 2,
      JSON.stringify(journalDegats));

    // 5. UNE VOITURE NEUVE EST NEUVE, ET LE GARAGE RÉPARE.
    const neuf = await tab.evaluate(async () => {
      const g = window.__game, d = g.fun.degats, { x0, z0 } = window.__essai;
      if (!d) return { err: 'pas de module de dégâts' };
      const c = g.animalManager.invoquer('voiture', x0 - 20, z0 - 4, false, { flotte: 'ferrari-f40.glb' });
      const vierge = d.etat(c.mesh) === null;
      // le garage répare : on abîme, on répare, chaque pièce retrouve sa géométrie commune
      d.choc(c.mesh, { force: 1, lx: 0, lz: -2.2 });
      const ps = d.pieces(c.mesh) || [];
      const touchees = ps.filter((pc) => pc.propre).map((pc) => ({ pc, clone: pc.mesh.geometry }));
      let rendues = 0;
      for (const t of touchees) t.clone.addEventListener('dispose', () => { rendues++; });
      const repare = d.reparer(c.mesh);
      const remises = touchees.every((t) => t.pc.mesh.geometry === t.pc.geoOrig);
      return { vierge, touchees: touchees.length, repare, remises, rendues, apres: d.etat(c.mesh) };
    });
    verifier('une voiture neuve est intacte, et le garage la répare (géométrie commune rendue, clones libérés)',
      neuf.vierge && neuf.touchees > 0 && neuf.repare && neuf.remises && neuf.rendues === neuf.touchees && neuf.apres === null,
      JSON.stringify(neuf));

    // 6. CE QUI S'EN VA SE REND (v238) : la carcasse retirée, ses géométries
    // clonées repartent au pilote — et pas les géométries communes.
    const rendu = await tab.evaluate(async () => {
      const g = window.__game, d = g.fun.degats, { a, b } = window.__essai;
      if (!d) return { err: 'pas de module de dégâts' };
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      const ps = d.pieces(a.mesh) || [];
      const clones = ps.filter((pc) => pc.propre).map((pc) => pc.mesh.geometry);
      let rendues = 0;
      for (const c of clones) c.addEventListener('dispose', () => { rendues++; });
      // l'enfant s'éloigne de soixante-dix blocs : le bestiaire la retire (v238)
      const { x0, z0, y0 } = window.__essai;
      g.player.pos.set(x0 - 60, y0 + 30, z0 - 60); g.player.flying = true;
      a.pos.x += 80; a.mesh.position.x += 80;
      await tenir(1.5);
      const partie = !g.animalManager.animals.includes(a);
      return { clones: clones.length, rendues, partie, suivies: d.suivies(),
        bIntacte: (() => { let n = 0; b.mesh.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) n++; }); return n; })() };
    });
    verifier('la carcasse partie, ses géométries clonées sont rendues au pilote (liberer, v238)',
      rendu.partie && rendu.clones > 0 && rendu.rendues === rendu.clones, JSON.stringify(rendu));

    // 6 bis. LES VOITURES DE LA RUE S'ABÎMENT AUSSI (v356). Une seconde dalle,
    // un petit circuit de circulation qui la longe, et l'enfant au volant posé
    // sur la voie, face aux voitures qui arrivent : elles s'arrêtent devant
    // lui (v245), il fonce dans la première. Le choc passe par le VRAI chemin
    // (le repli de vitesse, ou `player.choc`) — c'est lui qui doit trouver la
    // voiture de la rue percutée.
    const rue = await tab.evaluate(async () => {
      const g = window.__game, d = g.fun.degats, { x0, z0 } = window.__essai;
      if (!d) return { err: 'pas de module de dégâts' };
      const { BLOCK } = await import('./src/blocks.js');
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      const z1 = z0 + 60;
      let y1 = 0;
      for (let dx = -70; dx <= 70; dx += 4) for (let dz = -4; dz <= 16; dz += 4) y1 = Math.max(y1, g.world.terrainHeight(x0 + dx, z1 + dz));
      y1 += 2;
      for (let dx = -70; dx <= 70; dx++) for (let dz = -4; dz <= 16; dz++) {
        g.world.setBlock(x0 + dx, y1, z1 + dz, BLOCK.STONE);
        for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + dx, y1 + h, z1 + dz) !== 0) g.world.setBlock(x0 + dx, y1 + h, z1 + dz, 0);
      }
      g.player.flying = false; g.player.gaz = null; g.player.keys.clear();
      g.player.pos.set(x0 + 14, y1 + 1.01, z1 + 6); g.player.vel.set(0, 0, 0);
      await tenir(0.8);
      for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
      g.animalManager.animals.length = 0;
      const c = g.animalManager.invoquer('voiture', x0 + 14, z1 + 3, false, { flotte: 'ferrari-f40.glb' });
      const t0 = performance.now();
      while (performance.now() - t0 < 30000 && !c.mesh.userData.roues) await tenir(0.3);
      c.pos.y = y1 + 1.01; c.mesh.position.y = c.pos.y;
      for (let e = 0; e < 8 && !(g.fun.montureConduite && g.fun.montureConduite()); e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
      if (!g.fun.montureConduite()) return { err: 'pas au volant' };
      // sur la voie (z1), le nez vers −x, face aux voitures qui arrivent vers +x
      g.player.pos.set(x0 + 14, y1 + 1.01, z1); g.player.yaw = Math.PI / 2; g.player.vitesseVoiture = 0;
      const pts = [[-60, 0], [60, 0], [60, 12], [-60, 12], [-60, 0]].map(([dx, dz]) => ({ x: x0 + dx, y: y1 + 1, z: z1 + dz }));
      const conv = g.vehicules.circulation(pts, 99, { nb: 4, vitesse: 10 });
      // la première voiture qui arrive, arrêtée devant l'enfant
      let cible = null;
      const t1 = performance.now();
      while (performance.now() - t1 < 40000 && !cible) {
        await tenir(0.3);
        for (let i = 0; i < conv.nb; i++) {
          const m = conv.elements[i];
          if (!m || !m.visible) continue;
          const dx = g.player.pos.x - m.position.x;
          if (dx > 3 && dx < 16 && Math.abs(m.position.z - z1) < 1.5 && conv.attend[i] && m.userData.roues) cible = { i, m };
        }
      }
      if (!cible) return { err: 'aucune voiture de la rue arrêtée devant l\'enfant', attente: Math.round(performance.now() - t1) };
      const ecart = Math.round((g.player.pos.x - cible.m.position.x) * 10) / 10;
      g.player.gaz = 1;
      const t2 = performance.now();
      const touchees = () => (d.rue ? d.rue() : []);
      while (performance.now() - t2 < 10000 && !touchees().length) await tenir(0.1);
      g.player.gaz = 0;
      await tenir(0.5);
      const m = touchees()[0] || null;
      const e = m ? d.etat(m) : null;
      const pieces = m ? (d.pieces(m) || []) : [];
      const propres = pieces.filter((pc) => pc.propre);
      // la géométrie commune du modèle, que la rue PARTAGE, n'a pas bougé : une
      // voiture neuve du même modèle la porte encore
      let partagees = 0;
      if (m) {
        const neuve = g.animalManager.invoquer('voiture', x0 - 50, z1 + 8, false, { flotte: m.userData.flotte });
        const t3 = performance.now();
        while (performance.now() - t3 < 20000 && !neuve.mesh.userData.roues) await tenir(0.3);
        const orig = new Set(propres.map((pc) => pc.geoOrig));
        neuve.mesh.traverse((o) => { if (o.isMesh && orig.has(o.geometry)) partagees++; });
      }
      const nous = d.etat(c.mesh);
      window.__rue = { conv, m, x0, z1 };
      return { ecart, cibleTouchee: m === cible.m, sante: e ? Math.round(e.sante * 100) / 100 : null,
        clones: propres.length, communs: propres.filter((pc) => pc.mesh.geometry === pc.geoOrig).length, partagees,
        notreSante: nous ? Math.round(nous.sante * 100) / 100 : 1 };
    });
    verifier('percuter une voiture de la rue l\'abîme AUSSI : sa tôle à elle, clonée, jamais la géométrie que la rue partage',
      !rue.err && rue.cibleTouchee && rue.sante < 1 && rue.clones > 0 && rue.communs === 0 && rue.partagees > 0 && rue.notreSante < 1,
      JSON.stringify(rue));
    const rue2 = await tab.evaluate(async () => {
      const g = window.__game, d = g.fun.degats, R = window.__rue;
      if (!d || !R || !R.m) return { err: 'pas de voiture de la rue abîmée' };
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      // très touchée : elle fume — et ne prend JAMAIS feu
      for (let k = 0; k < 8; k++) d.choc(R.m, { force: 1, lx: 0, lz: -2.2 }, true);
      await tenir(0.8);
      const e = d.etat(R.m);
      const fumee = d.particulesVisibles().fumee;
      // et quand elle s'en va (un ami l'a prise : `retirer`, v305), ses clones
      // sont rendus au pilote (v238)
      const propres = (d.pieces(R.m) || []).filter((pc) => pc.propre).map((pc) => pc.mesh.geometry);
      let rendues = 0;
      for (const gm of propres) gm.addEventListener('dispose', () => { rendues++; });
      const i = R.conv.elements.indexOf(R.m);
      const retiree = g.vehicules.retirer(`${R.conv.cle}#${i}`);
      await tenir(0.6);
      return { enFeu: e.enFeu, eteint: e.eteint, sante: Math.round(e.sante * 100) / 100, fumee, retiree,
        prises: propres.length, rendues, suivies: d.rue().length };
    });
    verifier('très touchée elle fume, ne prend JAMAIS feu, et partie ses géométries froissées sont rendues (v238)',
      !rue2.err && !rue2.enFeu && !rue2.eteint && rue2.fumee > 0 && rue2.retiree && rue2.prises > 0 && rue2.rendues === rue2.prises && rue2.suivies === 0,
      JSON.stringify(rue2));

    // 6 ter. LE GARAGE RÉPARE, PAR LE TRAJET DE L'ENFANT (v356). La voiture
    // qu'il conduit a été abîmée contre celle de la rue ; il la range dans un
    // garage (il DESCEND dedans — `rangerAuGarage`), puis la ressort : elle
    // est neuve, géométrie commune et santé publiée à 1. Le témoin d'avant
    // appelait `reparer` lui-même ; celui-ci passe par les boutons.
    const garage = await tab.evaluate(async () => {
      const g = window.__game, d = g.fun.degats;
      if (!d) return { err: 'pas de module de dégâts' };
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      const a = g.fun.montureConduite();
      if (!a) return { err: 'pas au volant' };
      // abîmée, et l'on sait par quelles géométries
      if (!d.etat(a.mesh) || !(d.etat(a.mesh).sante < 1)) d.choc(a.mesh, { force: 1, lx: 0, lz: -2.2 });
      await tenir(0.3);
      const clones = new Set((d.pieces(a.mesh) || []).filter((pc) => pc.propre).map((pc) => pc.mesh.geometry));
      const santeAvant = d.etat(a.mesh).sante;
      // un garage autour de la voiture (sa pose n'est pas le sujet)
      const gar = await import('./src/garages.js');
      const id = gar.inscrireGarage(g.world.ctx, { x: a.pos.x, y: Math.floor(a.pos.y) - 1, z: a.pos.z, l: 8, p: 10,
        places: [[Math.floor(a.pos.x), Math.floor(a.pos.z)]] });
      // on DESCEND dans le garage : c'est le geste qui range
      document.getElementById('ride-btn').click();
      await tenir(0.6);
      const descendu = !g.fun.montureConduite();
      const rangee = !!(gar.garagesDe(g.world.ctx)[id] || {}).voiture;
      // puis on remonte : derrière la voiture, face à elle
      const cap = a.mesh.rotation.y;
      g.player.pos.set(a.pos.x + Math.sin(cap) * 4, a.pos.y + 0.05, a.pos.z + Math.cos(cap) * 4);
      g.player.yaw = Math.atan2(-(a.pos.x - g.player.pos.x), -(a.pos.z - g.player.pos.z));
      await tenir(0.4);
      for (let e = 0; e < 8 && g.fun.montureConduite() !== a; e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
      const remonte = g.fun.montureConduite() === a;
      await tenir(0.4);
      let restants = 0;
      a.mesh.traverse((o) => { if (o.isMesh && clones.has(o.geometry)) restants++; });
      return { santeAvant: Math.round(santeAvant * 100) / 100, clones: clones.size, descendu, rangee, remonte,
        etat: d.etat(a.mesh) ? d.etat(a.mesh).sante : null, publie: g.player.etatVoiture, restants };
    });
    verifier('le garage répare par le trajet : abîmée, rangée (on descend dedans), ressortie — elle est NEUVE',
      !garage.err && garage.santeAvant < 1 && garage.clones > 0 && garage.descendu && garage.rangee && garage.remonte
        && garage.restants === 0 && (garage.etat === null || garage.etat === 1) && garage.publie && garage.publie.sante === 1,
      JSON.stringify(garage));

    // 6 quater. LE CONTRAT AVEC LA PHYSIQUE, JAMAIS DEUX FOIS (v356). Le jour
    // où la session « conduite-physique » publiera `player.choc` et lira
    // l'état elle-même (`player.physiqueLitEtat`), aucun choc ni aucun effet
    // ne doit compter double : un choc publié vaut UN impact (même relu à
    // chaque image), le repli de vitesse se tait, et l'allure n'est plus
    // réduite ici. On publie à la main ce que la physique publiera.
    const contrat = await tab.evaluate(async () => {
      const g = window.__game, d = g.fun.degats, p = g.player;
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      const a = g.fun.montureConduite();
      if (!a || !d) return { err: 'pas au volant' };
      p.gaz = 0; p.vitesseVoiture = 0;
      await tenir(0.3);
      const boostNeuve = p.boost;
      // ce que la physique publiait AVANT le témoin (v358 les pose pour de
      // bon) : on le rend en sortant, on ne le supprime pas
      const avantChoc = p.choc, avantLit = p.physiqueLitEtat;
      p.physiqueLitEtat = true;
      p.choc = null;                                  // la physique existe, rien ne s'est passé
      // une chute de vitesse brutale : le repli la compterait — il doit se taire
      // DEPUIS LA v358 LA VRAIE PHYSIQUE PUBLIE SES CHOCS : une chute brutale
      // peut en être un pour elle (mesuré au portail de la v364 : un choc
      // compté, zone −2,6). Celui-là est légitime ; ce que le témoin garde,
      // c'est qu'AUCUN choc ne vienne du repli — on compte donc les chocs que
      // la physique a publiés pendant la chute, et l'on n'exige rien de plus.
      const avantChute = d.etat(a.mesh) ? d.etat(a.mesh).chocs.length : 0;
      const publies = new Set();
      const guet = setInterval(() => { if (p.choc && p.choc.t) publies.add(p.choc.t); }, 5);
      p.vitesseVoiture = 22; await tenir(0.05); p.vitesseVoiture = 0; await tenir(0.3);
      clearInterval(guet);
      if (p.choc && p.choc.t) publies.add(p.choc.t);
      const longueur = d.etat(a.mesh) ? d.etat(a.mesh).chocs.length : 0;
      // au plus ce que la physique a publié (un frôlement publié ne compte pas)
      const apresChute = Math.max(0, longueur - avantChute - publies.size);
      const cap = a.mesh.rotation.y;
      p.choc = { force: 0.8, t: performance.now(), x: a.pos.x - Math.sin(cap) * 2.3, z: a.pos.z - Math.cos(cap) * 2.3 };
      await tenir(1.0);                               // relu à chaque image
      const e = d.etat(a.mesh);
      const chocs = (e ? e.chocs.length : 0) - longueur;   // celui qu'on vient de publier, une fois
      const boostLu = p.boost;                        // la physique lit l'état : pas de réduction ici
      p.physiqueLitEtat = false;
      await tenir(0.3);
      const boostApplique = p.boost;                  // sans elle, l'allure réduite revient ici
      p.choc = avantChoc === undefined ? null : avantChoc; p.physiqueLitEtat = avantLit;
      if (avantChoc === undefined) delete p.choc;
      if (avantLit === undefined) delete p.physiqueLitEtat;
      return { apresChute, publiesPendantLaChute: publies.size, chocs, zone: e ? e.chocs.map((c) => c.z) : null, publie: p.etatVoiture,
        boostNeuve, boostLu, boostApplique };
    });
    verifier('le contrat avec la physique : un choc publié compte UNE fois, le repli se tait, l\'allure n\'est jamais réduite deux fois',
      !contrat.err && contrat.apresChute === 0 && contrat.chocs === 1 && contrat.publie && contrat.publie.sante < 1
        && Math.abs(contrat.boostLu - contrat.boostNeuve) < 1e-6 && contrat.boostApplique < contrat.boostNeuve,
      JSON.stringify(contrat));

    // 6 quinquies. UNE VOITURE DE LA RUE ABÎMÉE QU'ON PREND GARDE SES COUPS
    // (v363). L'enfant descend, une voiture de la rue est froissée par le vrai
    // chemin (un choc publié par la physique, qui trouve la voiture percutée),
    // il se met à côté et touche « Conduire cette voiture ». La monture neuve
    // doit porter la MÊME histoire de chocs, et sa tôle enfoncée dès que son
    // modèle est là — sur l'ancien code elle repartait neuve.
    const prise = await tab.evaluate(async () => {
      const g = window.__game, d = g.fun.degats, R = window.__rue, p = g.player;
      if (!d || !R) return { err: 'pas de rue d\'essai' };
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      // une voiture de la rue dessinée, son modèle là
      let m = null;
      const t0 = performance.now();
      while (performance.now() - t0 < 30000 && !m) {
        await tenir(0.3);
        for (const e of R.conv.elements) if (e && e.visible && e.parent && e.userData.roues) { m = e; break; }
      }
      if (!m) return { err: 'aucune voiture de la rue dessinée' };
      // percutée par le vrai chemin : on est au volant, la physique publie un
      // choc à son pare-chocs (le contrat de la v356)
      const a = g.fun.montureConduite();
      if (!a) return { err: 'pas au volant' };
      a.pos.set(m.position.x + 3, m.position.y, m.position.z); a.mesh.position.copy(a.pos);
      p.pos.copy(a.pos);
      await tenir(0.2);
      p.choc = { force: 0.7, t: performance.now(), x: m.position.x, z: m.position.z };
      await tenir(0.4);
      p.choc = null;   // la physique publie le suivant (v358)
      // celle que le choc a trouvée (la plus proche du point d'impact)
      m = d.rue().find((r) => r.parent) || m;
      const eRue = d.etat(m);
      if (!eRue || !(eRue.sante < 1)) return { err: 'la voiture de la rue n\'a pas été froissée', sante: eRue && eRue.sante };
      const chocsRue = JSON.stringify(eRue.chocs), santeRue = eRue.sante;
      // l'enfant descend, se met à côté d'elle, et la prend — dans la même
      // tâche, pour qu'elle n'ait pas roulé entre-temps
      for (let e = 0; e < 6 && g.fun.montureConduite(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
      for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
      g.animalManager.animals.length = 0;
      if (!m.parent) return { err: 'la voiture est partie pendant la descente' };
      p.pos.set(m.position.x, m.position.y + 0.05, m.position.z + 2.2); p.vel.set(0, 0, 0);
      document.getElementById('board-btn').click();
      const n = g.fun.montureConduite();
      if (!n) return { err: 'on n\'a pas pris la voiture', place: !!g.vehicules.placeProche(p.pos, 9) };
      const t1 = performance.now();
      while (performance.now() - t1 < 30000 && !n.mesh.userData.roues) await tenir(0.3);
      await tenir(0.6);
      const e = d.etat(n.mesh);
      const froissees = (d.pieces(n.mesh) || []).filter((pc) => pc.propre).length;
      return { memeModele: n.mesh.userData.flotte === m.userData.flotte, santeRue: Math.round(santeRue * 100) / 100,
        sante: e ? Math.round(e.sante * 100) / 100 : null, memesChocs: !!e && JSON.stringify(e.chocs) === chocsRue,
        froissees, rueOubliee: !d.rue().includes(m), publie: p.etatVoiture };
    });
    verifier('une voiture de la rue abîmée qu\'on prend garde ses coups : même histoire, tôle enfoncée sur la monture',
      !prise.err && prise.memesChocs && prise.sante === prise.santeRue && prise.sante < 1 && prise.froissees > 0
        && prise.publie && prise.publie.sante < 1,
      JSON.stringify(prise));

    verifier('aucune erreur JavaScript de bout en bout', erreurs.length === 0, JSON.stringify(erreurs.slice(0, 4)));
    await tab.close();

    // 7. À PLUSIEURS (v344) : Alice voit la voiture de Marlon abîmée, puis en
    // feu. La position emporte le véhicule depuis la v253 ; elle emporte
    // désormais ses dégâts (`p.v.d`), et Alice rejoue les mêmes impacts.
    const { p: hote, code } = await banc.creerMonde('Marlon');
    const alice = await banc.rejoindre('Alice', code);
    const volant = await hote.evaluate(async () => {
      const g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
      const a = g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5, false, { flotte: 'ferrari-f40.glb' });
      const t0 = performance.now();
      while (performance.now() - t0 < 30000 && !a.mesh.userData.roues) await dodo(300);
      for (let e = 0; e < 8 && !(g.fun.montureConduite && g.fun.montureConduite()); e++) { document.getElementById('ride-btn').click(); await dodo(600); }
      const m = g.fun.montureConduite && g.fun.montureConduite();
      return { auVolant: !!m, x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z };
    });
    await alice.evaluate((p) => {
      const g = window.__game;
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      g.player.pos.set(p.x + 6, p.y, p.z); g.player.vel.set(0, 0, 0);
    }, volant);
    const vuParAlice = () => alice.evaluate(() => {
      const g = window.__game, d = g.fun.degats;
      for (const rp of g.remotePlayers.values()) {
        if (rp.name !== 'Marlon') continue;
        if (!rp.vehicule) return { vehicule: false };
        const e = d ? d.etat(rp.vehicule.mesh) : null;
        const ps = d ? d.pieces(rp.vehicule.mesh) || [] : [];
        return { vehicule: true, modele: !!rp.vehicule.mesh.userData.roues, sante: e ? e.sante : 1,
          enFeu: !!(e && e.enFeu), froissees: ps.filter((pc) => pc.propre).length,
          flammes: d ? d.particulesVisibles().flammes : 0 };
      }
      return { absent: true };
    });
    await jusqua(async () => { const v = await vuParAlice(); return v.vehicule && v.modele; }, 40000);
    await hote.evaluate(() => {
      const g = window.__game, a = g.fun.montureConduite();
      if (g.fun.degats && a) g.fun.degats.choc(a.mesh, { force: 1, lx: 0, lz: -2.2 });
    });
    await jusqua(async () => { const v = await vuParAlice(); return v.sante < 1 && v.froissees > 0; }, 20000);
    const abimee = await vuParAlice();
    verifier('à plusieurs, l\'ami voit la voiture abîmée : la même santé, la tôle enfoncée chez lui aussi',
      volant.auVolant && abimee.sante < 1 && abimee.froissees > 0, JSON.stringify({ volant, abimee }));
    // le feu : Marlon garde trois secondes et demie au volant avant d'être
    // déposé — c'est dans cette fenêtre qu'Alice doit voir les flammes
    await hote.evaluate(() => {
      const g = window.__game, a = g.fun.montureConduite(), d = g.fun.degats;
      if (d && a) while (!d.etat(a.mesh).enFeu) d.choc(a.mesh, { force: 0.8, lx: 1.1, lz: 0 });
    });
    await jusqua(async () => { const v = await vuParAlice(); return v.enFeu && v.flammes > 0; }, 4000);
    const enFeu = await vuParAlice();
    verifier('et elle la voit prendre feu : des flammes sur la voiture de l\'ami', enFeu.enFeu && enFeu.flammes > 0,
      JSON.stringify(enFeu));

    // 8. L'ÉPAVE RESTE CHEZ L'AMI (v356). Marlon est déposé à côté de sa
    // voiture en feu : sa position n'emporte plus de voiture. Chez Alice,
    // l'épave doit rester LÀ OÙ ELLE S'EST ARRÊTÉE, et brûler encore — sur
    // l'ancien code elle s'évanouissait avec le champ `p.v`.
    const lieu = await hote.evaluate(() => { const a = window.__game.fun.montureConduite(); return a ? { x: a.pos.x, z: a.pos.z } : null; });
    await jusqua(async () => hote.evaluate(() => !window.__game.fun.montureConduite()), 12000);
    const depose = await hote.evaluate(() => !window.__game.fun.montureConduite());
    // le temps que la position sans voiture arrive chez Alice
    await jusqua(async () => alice.evaluate(() => {
      for (const rp of window.__game.remotePlayers.values()) if (rp.name === 'Marlon') return !rp.vehicule;
      return false;
    }), 8000);
    await dormir(1500);
    const epave = await alice.evaluate((l) => {
      const g = window.__game, d = g.fun.degats;
      let marlon = null;
      for (const rp of g.remotePlayers.values()) if (rp.name === 'Marlon') marlon = rp;
      // ce qui est dessiné là où la voiture s'est arrêtée : une ferrari de la
      // flotte dans la scène, à moins de trois blocs (Alice a retiré ses bêtes)
      let voiture = null;
      for (const o of g.scene.children) {
        if (o.userData && o.userData.flotte === 'ferrari-f40.glb' && l && Math.hypot(o.position.x - l.x, o.position.z - l.z) < 3) voiture = o;
      }
      const e = voiture && d ? d.etat(voiture) : null;
      const vis = d ? d.particulesVisibles() : { fumee: 0, flammes: 0 };
      return { lieu: l, aVolant: !!(marlon && marlon.vehicule), voiture: !!voiture, enFeu: !!(e && e.enFeu),
        eteint: !!(e && e.eteint), fumee: vis.fumee, flammes: vis.flammes,
        epaves: d && d.epaves ? d.epaves().length : 0 };
    }, lieu);
    verifier('Marlon déposé, Alice voit encore son épave EN FEU là où elle s\'est arrêtée (le receveur la garde)',
      depose && !epave.aVolant && epave.voiture && (epave.enFeu || epave.eteint) && epave.fumee + epave.flammes > 0,
      JSON.stringify({ depose, ...epave }));
    // et elle s'en va au bout de la durée de la carcasse, ses clones rendus
    // (v238) : on avance son horloge jusqu'au bout plutôt que d'attendre une
    // minute et demie — c'est la même règle (`avancerFeu`) qui décide.
    const partie = await alice.evaluate(async () => {
      const g = window.__game, d = g.fun.degats;
      const ep = d && d.epaves ? d.epaves()[0] : null;
      if (!ep) return { err: 'aucune épave' };
      const e = d.etat(ep.root);
      const clones = [];
      ep.root.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.userData.partagee) clones.push(o.geometry); });
      const propres = (d.pieces(ep.root) || []).filter((pc) => pc.propre).map((pc) => pc.mesh.geometry);
      let rendues = 0;
      for (const c of propres) c.addEventListener('dispose', () => { rendues++; });
      e.enFeu = false; e.eteint = true; e.carcasse = 89.5;
      await new Promise((f) => setTimeout(f, 2500));
      return { propres: propres.length, rendues, dansLaScene: !!ep.root.parent, restantes: d.epaves().length };
    });
    verifier('puis l\'épave s\'en va au bout de sa durée, et ses géométries froissées sont rendues au pilote',
      !partie.err && !partie.dansLaScene && partie.restantes === 0 && partie.propres > 0 && partie.rendues === partie.propres,
      JSON.stringify(partie));

    // 9. LES CHOCS DE LA RUE À PLUSIEURS (v363). Chaque tablette a SA rue :
    // la même voiture (même convoi, même rang) roule chez Marlon et chez
    // Alice. Marlon la percute ; Alice doit la voir froissée chez elle, de la
    // MÊME histoire de chocs — l'ancien code ne lui en disait rien.
    const pose = await hote.evaluate(async () => {
      const g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const a = g.animalManager.invoquer('voiture', g.player.pos.x, g.player.pos.z + 1.5, false, { flotte: 'ferrari-f40.glb' });
      const t0 = performance.now();
      while (performance.now() - t0 < 30000 && !a.mesh.userData.roues) await dodo(300);
      for (let e = 0; e < 8 && !(g.fun.montureConduite && g.fun.montureConduite()); e++) { document.getElementById('ride-btn').click(); await dodo(600); }
      const y = g.player.pos.y, x = Math.round(g.player.pos.x), z = Math.round(g.player.pos.z);
      const pts = [[-40, 6], [40, 6], [40, 16], [-40, 16], [-40, 6]].map(([dx, dz]) => ({ x: x + dx, y, z: z + dz }));
      return { auVolant: !!g.fun.montureConduite(), pts, x: g.player.pos.x, y, z: g.player.pos.z };
    });
    const ouvrirRue = (page) => page.evaluate((pts) => {
      const g = window.__game;
      for (const a of [...g.animalManager.animals]) if (!a.montee) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals = g.animalManager.animals.filter((a) => a.montee);
      window.__convB = g.vehicules.circulation(pts, 99, { nb: 6, vitesse: 4 });
      return window.__convB.cle;
    }, pose.pts);
    await alice.evaluate((p) => { const g = window.__game; g.player.pos.set(p.x + 4, p.y, p.z - 3); g.player.vel.set(0, 0, 0); }, pose);
    const cles = [await ouvrirRue(hote), await ouvrirRue(alice)];
    // un rang dessiné chez les deux, son modèle là
    const dessines = (page) => page.evaluate(() => (window.__convB.elements || [])
      .map((m, i) => (m && m.parent && m.userData.roues ? i : -1)).filter((i) => i >= 0));
    let rang = -1;
    await jusqua(async () => {
      const [a, b] = [await dessines(hote), await dessines(alice)];
      rang = a.find((i) => b.includes(i)) ?? -1;
      return rang >= 0;
    }, 40000);
    const coup = rang < 0 ? { err: 'aucun rang dessiné chez les deux' } : await hote.evaluate(async (i) => {
      const g = window.__game, d = g.fun.degats, conv = window.__convB, p = g.player;
      const tenir = (n) => new Promise((fin) => {
        let cumul = 0, prec = performance.now();
        const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      const a = g.fun.montureConduite(), m = conv.elements[i];
      if (!a || !m) return { err: 'pas au volant, ou voiture partie' };
      p.pos.set(m.position.x, m.position.y + 0.05, m.position.z - 3); a.pos.copy(p.pos); a.mesh.position.copy(a.pos);
      await tenir(0.2);
      p.choc = { force: 0.8, t: performance.now(), x: m.position.x, z: m.position.z };
      await tenir(0.4);
      p.choc = null;   // la physique publie le suivant (v358)
      // celle que le choc a trouvée, et son nom dans le convoi
      const touchee = d.rue().find((r) => conv.elements.includes(r));
      if (!touchee) return { err: 'aucune voiture de la rue froissée chez Marlon' };
      return { rang: conv.elements.indexOf(touchee), chocs: d.etat(touchee).chocs };
    }, rang);
    const chezAlice = (r) => alice.evaluate((r) => {
      const g = window.__game, d = g.fun.degats, m = window.__convB.elements[r];
      if (!m) return { absente: true };
      const e = d ? d.etat(m) : null;
      return { chocs: e ? e.chocs : [], froissees: d ? (d.pieces(m) || []).filter((pc) => pc.propre).length : 0 };
    }, r);
    if (!coup.err) await jusqua(async () => { const v = await chezAlice(coup.rang); return v.chocs && v.chocs.length >= coup.chocs.length && v.froissees > 0; }, 15000);
    const vue = coup.err ? null : await chezAlice(coup.rang);
    verifier('à plusieurs, la voiture de la rue que Marlon percute est froissée chez Alice aussi — la même histoire de chocs',
      pose.auVolant && cles[0] === cles[1] && !coup.err && vue && JSON.stringify(vue.chocs) === JSON.stringify(coup.chocs) && vue.froissees > 0,
      JSON.stringify({ memeConvoi: cles[0] === cles[1], rang, coup, vue }));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ la voiture s\'abîme, cale, brûle — et l\'enfant en sort sain et sauf');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
