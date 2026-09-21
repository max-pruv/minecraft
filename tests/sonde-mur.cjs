// POURQUOI LA VOITURE CONTRE LE MUR ANNONCE-T-ELLE ENCORE SON ALLURE ? (v285)
//
// Le témoin de la v272 — la panne que Max a signalée de Hambourg — rend
// `vitesse: 0` sur la v284 et `vitesse: 12,16` sur la v285, DEUX FOIS de chaque
// côté. Ce n'est pas une intermittence, c'est ma livraison. Le mur du témoin fait
// QUATRE blocs, donc le franchissement ne devrait rien pouvoir monter : on ne
// devine pas, on demande à chaque pas ce que chaque pièce a fait.
const { Banc, souffler } = require('./banc.js');

(async () => {
  const banc = new Banc({ portJeu: 8396, portPairs: 9396 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeMur', { rr: 4 });
    const out = await page.evaluate(async () => {
      const g = window.__game;
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const BLOCK = g.BLOCK || { STONE: 1 };
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());

      // Le couloir vide de la v237, et le MÊME mur que le témoin.
      const x0 = 30400, z0 = 30900, L = 60, W = 8;
      let y0 = 0;
      for (let d = -6; d <= L; d += 4) for (let w = -W; w <= W; w += 4)
        y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 2;
      for (let d = -6; d <= L; d++) for (let w = -W; w <= W; w++) {
        g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
        for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0)
          g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
      }
      for (let w = -W; w <= W; w++) for (let h = 1; h <= 4; h++)
        g.world.setBlock(x0 + 30, y0 + h, z0 + w, BLOCK.STONE);

      g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
      g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
      await dodo(1200);
      for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await dodo(400); }
      for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
      g.animalManager.animals.length = 0;
      g.animalManager.invoquer('voiture', x0 + 3, z0, false, { flotte: 'berline-citadine' });
      await dodo(800);
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await dodo(500); }
      if (!auVolant()) return { err: 'pas au volant' };

      // ON ENVELOPPE LE FRANCHISSEMENT : combien de fois est-il TENTÉ, combien de
      // fois ABOUTIT-il ? Sans ce compte, « le mur fait quatre blocs donc il ne
      // monte pas » reste un raisonnement.
      const vrai = g.player.franchirEnRoulant.bind(g.player);
      let tentes = 0, reussis = 0;
      g.player.franchirEnRoulant = function (dx, dz) {
        tentes++;
        const ok = vrai(dx, dz);
        if (ok) reussis++;
        return ok;
      };

      g.player.keys.add('KeyW');
      const t0 = performance.now();
      while (performance.now() - t0 < 20000) {
        await dodo(200);
        if (Math.abs(g.player.vitesseVoiture || 0) >= (g.player.vitesseVoitureMax || 3.2) * 0.85) break;
      }
      const lance = +Math.abs(g.player.vitesseVoiture || 0).toFixed(2);
      // ON ATTEND LA SITUATION : mon premier jet s'arrêtait après vingt-quatre pas
      // et n'était arrivé qu'à douze blocs du départ — le mur est à trente, et la
      // sonde rendait « 0 tentative » sans avoir jamais touché quoi que ce soit.
      const pas = [];
      let xAvant = g.player.pos.x, tAv = tentes, rAv = reussis;
      const tMur = performance.now();
      let cales = 0;
      while (performance.now() - tMur < 40000 && cales < 8) {
        await dodo(250);
        if (Math.abs(g.player.pos.x - xAvant) < 0.02) cales++; else cales = 0;
        pas.push({
          dx: +(g.player.pos.x - x0).toFixed(2),
          y: +(g.player.pos.y - y0).toFixed(2),
          bouge: +Math.abs(g.player.pos.x - xAvant).toFixed(3),
          v: +Math.abs(g.player.vitesseVoiture || 0).toFixed(2),
          velx: +g.player.vel.x.toFixed(2),
          sol: !!g.player.onGround,
          tentes: tentes - tAv, reussis: reussis - rAv,
        });
        xAvant = g.player.pos.x; tAv = tentes; rAv = reussis;
      }
      while (pas.length > 14) pas.shift();     // on garde la fin, près du mur
      g.player.keys.delete('KeyW');
      g.player.franchirEnRoulant = vrai;
      return { lance, y0, gabarit: g.player.gabarit, pas, tentes, reussis };
    });
    await page.close();
    if (out.err) { console.log('ÉCHEC : ' + out.err); process.exit(0); }
    console.log(`\nlancée ${out.lance} · gabarit ${out.gabarit} · sol y=${out.y0}`);
    console.log(`franchissement : ${out.tentes} tentative(s), ${out.reussis} aboutie(s)`);
    console.log('\n   dx     y   bouge     v   velx  sol  tent  reus');
    for (const p of out.pas) console.log(
      `${String(p.dx).padStart(6)} ${String(p.y).padStart(5)} ${String(p.bouge).padStart(7)}`
      + ` ${String(p.v).padStart(5)} ${String(p.velx).padStart(6)}  ${p.sol ? 'oui' : 'NON'}`
      + ` ${String(p.tentes).padStart(5)} ${String(p.reussis).padStart(5)}`);
  } finally { await banc.fermer(); }
  process.exit(0);
})().catch((e) => { console.error('💥 SONDE PLANTÉE :', e); process.exit(2); });
