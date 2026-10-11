// SONDE (v447) — la circulation de Paris devant la voiture de l'enfant, sous
// des images LENTES provoquées (LENT=ms brûlées par image). Le passage est
// celui du témoin « la circulation s'arrête devant la voiture de l'enfant »
// de `monte.js`, recopié tel quel ; seul le frein d'images s'ajoute.
//     cd tests && N=4 LENT=700 node sonde-voiture-lente.cjs
const { Banc, dormir } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8473, portPairs: 9473 });
  await banc.ouvrir();
  try {
    for (let k = 0; k < Number(process.env.N || 3); k++) {
      const tab = await banc.jouerSeul('Lent' + k, { tactile: true });
    const avantParis = await tab.evaluate(async () => {
      const m = await import('./src/mondes.js'); const P = m.positionDe('paris'); const g = window.__game;
      const sauve = { x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z, yaw: g.player.yaw, flying: g.player.flying };
      g.player.pos.set(P.x + 30, 70, P.z - 10); g.player.vel.set(0, 0, 0); g.player.flying = true;
      return sauve;
    });
    await tab.waitForFunction(() => (window.__vehicules.etat() || []).filter((c) => c.routier).reduce((n, c) => n + c.visibles, 0) >= 4,
      null, { timeout: 60000 }).catch(() => {});
    // UNE MESURE OÙ AUCUNE VOITURE NE VIENT N'EST PAS UNE MESURE. Au portail
    // de la v252 (troisième passe) : 97 relevés de voitures à moins de douze
    // blocs, ZÉRO arrêtée, ZÉRO au travers — les voitures passaient À CÔTÉ,
    // parce que douze blocs « devant » une voiture en droite ligne ne sont pas
    // sur son tracé quand la rue tourne. On exige donc de la chaussée sous
    // toute la ligne, on classe les candidats par distance, et si personne ne
    // vient à nous en douze secondes, on se repose sur le candidat suivant :
    // le verdict porte sur ce que fait une voiture qui ARRIVE, pas sur la
    // chance qu'une voiture arrive.
    const poserAParis = (rang) => tab.evaluate(async (rang) => {
      const g = window.__game, et = window.__vehicules.etat();
      const { CHAUSSEE } = await import('./src/world.js');
      const surChaussee = (x, z) => { const bx = Math.floor(x), bz = Math.floor(z); const y = g.world.sommetColonne(bx, bz); return CHAUSSEE.has(g.world.getBlock(bx, y, bz)); };
      // toutes les places des convois routiers ; on se pose douze blocs devant
      // l'une d'elles, à un point LIBRE — aucune voiture à moins de sept blocs,
      // sinon on naît dans une voiture de la file (au portail : quatre-vingts
      // relevés « au travers », dès la première image)
      const places = [];
      et.forEach((c) => c.routier && (c.places || []).forEach((q) => places.push({ x: q[0], z: q[1], cap: q[2] })));
      const candidats = [];
      for (const q of places) {
        const x = q.x + Math.sin(q.cap) * 12, z = q.z + Math.cos(q.cap) * 12;
        if (places.some((o) => Math.hypot(o.x - x, o.z - z) < 7)) continue;
        let route = true;
        for (let t = 2; t <= 12; t += 2) if (!surChaussee(q.x + Math.sin(q.cap) * t, q.z + Math.cos(q.cap) * t)) { route = false; break; }
        if (!route) continue;
        const d = Math.hypot(x - g.player.pos.x, z - g.player.pos.z);
        candidats.push({ d, x: q.x, z: q.z, cap: q.cap });
      }
      candidats.sort((p, q) => p.d - q.d);
      const m = candidats[Math.min(rang, candidats.length - 1)] || null;
      if (!m) return null;
      const x = m.x + Math.sin(m.cap) * 12, z = m.z + Math.cos(m.cap) * 12;
      g.player.pos.set(x, g.world.terrainHeight(Math.floor(x), Math.floor(z)) + 1.5, z);
      g.player.vel.set(0, 0, 0); g.player.yaw = m.cap + Math.PI; g.player.pitch = 0; g.player.flying = false;
      // ON DESCEND AVANT DE RETIRER LA VOITURE (l'idiome de la v284 : on
      // descend, on RETIRE les bêtes, PUIS on invoque). À la seconde pose,
      // l'enfant était encore assis dans la voiture de la première : le jeu
      // le fait descendre quand sa monture disparaît (v245), `monterAParis`
      // le croyait au volant, et le clic de descente d'après le faisait
      // MONTER — rouge chaque fois qu'il fallait deux poses (v330, 2 sur 2).
      if (g.fun.montureConduite && g.fun.montureConduite()) document.getElementById('ride-btn').click();
      for (const a of [...g.animalManager.animals]) if (a.def.key === 'voiture') { g.animalManager.scene.remove(a.mesh); g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1); }
      g.animalManager.invoquer('voiture', x - Math.sin(g.player.yaw) * 3, z - Math.cos(g.player.yaw) * 3);
      return { ...m, candidats: candidats.length };
    }, rang);
    const monterAParis = async () => {
      // Le bouton garde son `display` d'avant tant que sa ligne est cachée :
      // on attend la LIGNE, puis le « ⬇️ » qui prouve qu'on est monté — et
      // l'on réessaie, parce qu'un clic trop tôt ne monte dans rien.
      await tab.waitForFunction(() => {
        const b = document.getElementById('ride-btn');
        return b && getComputedStyle(b).display !== 'none' && getComputedStyle(b.closest('.fun-target')).display !== 'none';
      }, null, { timeout: 20000 }).catch(() => {});
      // ET ON NE RECLIQUE PAS SUR UN ENFANT DÉJÀ MONTÉ : le bouton est une
      // BASCULE, un second clic le fait descendre. Ce jet-ci attendait le
      // « ⬇️ » du bouton — écrit à l'image suivante, sondé par rAF — pendant
      // trois secondes puis recliquait : au portail de la v252, à une image
      // par seconde dans Paris, le premier clic avait monté, le second a fait
      // descendre, et trois témoins ont mesuré « au volant » à pied. L'état
      // se lit dans le jeu, jamais dans le texte d'un bouton.
      const auVolantMaintenant = () => tab.evaluate(() => !!(window.__game.fun.montureConduite && window.__game.fun.montureConduite()));
      for (let essai = 0; essai < 6; essai++) {
        if (!(await auVolantMaintenant())) await tab.evaluate(() => document.getElementById('ride-btn').click());
        const monte = await tab.waitForFunction(() => (window.__game.fun.montureConduite && window.__game.fun.montureConduite())
          && document.getElementById('ride-btn').textContent.startsWith('⬇️'), null, { timeout: 3000, polling: 200 }).then(() => true).catch(() => false);
        if (monte) break;
        await dormir(700);
      }
    };
    const mesurerChaussee = () => tab.evaluate(async () => {
      const g = window.__game, et = window.__vehicules.etat();
      let m = null;
      et.forEach((c) => c.routier && (c.places || []).forEach((q) => {
        const d = Math.hypot(q[0] - g.player.pos.x, q[1] - g.player.pos.z);
        if (!m || d < m.d) m = { d, x: q[0], z: q[1], cap: q[2] };
      }));
      if (!m) return null;
      if (!document.getElementById('ride-btn').textContent.startsWith('⬇️')) return { auVolant: false };
      g.player.keys.delete('KeyW');
      const rect = (x, z, cap) => { const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux; return [[x + ux * 2.2 + vx * 1.13, z + uz * 2.2 + vz * 1.13], [x + ux * 2.2 - vx * 1.13, z + uz * 2.2 - vz * 1.13], [x - ux * 2.2 - vx * 1.13, z - uz * 2.2 - vz * 1.13], [x - ux * 2.2 + vx * 1.13, z - uz * 2.2 + vz * 1.13]]; };
      const separes = (P, Q) => { for (const R of [P, Q]) for (let k = 0; k < 4; k++) { const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0]; const pr = (S) => S.map((q) => q[0] * ax + q[1] * az); const p1 = pr(P), p2 = pr(Q); if (Math.max(...p1) < Math.min(...p2) || Math.max(...p2) < Math.min(...p1)) return true; } return false; };
      let releves = 0, traverses = 0, proches = 0, arretees = 0, attenteSecondes = 0;
      // « PAS SI L'ON EST DÉJÀ DEDANS » VAUT AUSSI POUR LE TÉMOIN (v245, par
      // l'autre bout). Le jeu laisse EXPRÈS continuer une voiture déjà dans la
      // nôtre — attendre là, c'est y rester pour toujours — et la v245 avait
      // déjà vu le témoin se poser sur une file et compter quatre-vingts relevés
      // « au travers » dès la première image. Vert quatre passages de suite, ce
      // témoin a rendu 51 relevés sur 214 au cinquième, sur du code inchangé,
      // une voiture étant à portée dès la première seconde. On note donc qui
      // chevauche AU PREMIER RELEVÉ et l'on ne compte pas celle-là : elle ne
      // peut rendre aucun verdict, ni dans un sens ni dans l'autre. Quand la
      // pose est propre, cet ensemble est vide et rien ne change.
      let dejaDedans = null, exclus = 0;
      // douze blocs, pas six : une voiture qui cède s'arrête dès que son
      // balayage de huit blocs touche notre rectangle, donc à six ou huit
      // blocs de notre centre — à six, le témoin ne la voyait jamais arriver
      const PORTEE = 12;
      const uneVoiturePres = () => { let n = 0; window.__vehicules.etat().forEach((c) => c.routier && (c.places || []).forEach((q) => { if (Math.hypot(q[0] - g.player.pos.x, q[1] - g.player.pos.z) <= PORTEE) n++; })); return n; };
      // on attend la première voiture : jusqu'à quarante secondes
      const tAttente = performance.now();
      while (performance.now() - tAttente < 40000 && !uneVoiturePres()) await new Promise((f) => setTimeout(f, 200));
      attenteSecondes = +((performance.now() - tAttente) / 1000).toFixed(1);
      const t0 = performance.now();
      while (performance.now() - t0 < 12000) {
        await new Promise((f) => setTimeout(f, 150));
        releves++;
        const moi = rect(g.player.pos.x, g.player.pos.z, g.player.yaw + Math.PI);
        const chevauchants = new Set();
        window.__vehicules.etat().forEach((c, ci) => c.routier && (c.places || []).forEach((q, qi) => {
          if (Math.hypot(q[0] - g.player.pos.x, q[1] - g.player.pos.z) > PORTEE) return;
          proches++; if (q[5]) arretees++;
          if (!separes(moi, rect(q[0], q[1], q[2]))) chevauchants.add(ci + ':' + qi);
        }));
        if (dejaDedans === null) dejaDedans = chevauchants;
        for (const cle of chevauchants) { if (dejaDedans.has(cle)) exclus++; else traverses++; }
      }
      return { releves, proches, arretees, traverses, attenteSecondes,
        dedansAuDepart: dejaDedans ? dejaDedans.size : 0, exclus };
    });
    let poseParis = null, chaussee = null, poses = 0;
    for (let rang = 0; rang < 3; rang++) {
      poseParis = await poserAParis(rang);
      if (!poseParis) break;
      poses++;
      await monterAParis();
      await tab.evaluate((l) => { if (l > 0 && !window.__frein) { window.__frein = true; const br = () => { const t = performance.now(); while (performance.now() - t < l); requestAnimationFrame(br); }; requestAnimationFrame(br); } }, Number(process.env.LENT || 0));
      chaussee = await mesurerChaussee();
      // personne n'est venu : on ne conclut pas, on se repose ailleurs
      if (!chaussee || chaussee.auVolant === false || chaussee.arretees > 0 || chaussee.traverses > 0) break;
    }
    if (chaussee) chaussee.poses = poses;
      console.log('passage ' + k + ' LENT=' + (process.env.LENT || 0) + ' ' + JSON.stringify(chaussee));
      await tab.close();
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
