// SONDE (banc-lot3) : « et la faire glisser non plus (bridé ×4) » relève la
// PLUS LONGUE tâche du fil principal pendant trois secondes de glisser plus
// une et demie : 405 à 719 ms selon les portails, pour une barre à 400. Une
// tâche longue n'est pas forcément la carte : une image de jeu bridée ×4,
// l'arrivée d'un lot de morceaux, un ramasse-miettes. On sépare, sur la MÊME
// page et en ordre alterné : la carte ouverte IMMOBILE (même fenêtre) contre
// la carte qu'on fait glisser, et l'on mesure aussi le temps passé DANS la
// carte (ses fonctions de dessin enveloppées) pendant chaque fenêtre.
const { Banc, dormir } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8475, portPairs: 9475 }); await banc.ouvrir();
  try {
    const nino = await banc.joueur('NinoSonde', { prep: 1, dpr: 1 });
    await nino.waitForFunction(() => !document.getElementById('play-btn').disabled, null, { timeout: 60000 }).catch(() => {});
    await nino.evaluate(() => { window.__game.edu.today().libreJusqua = 86400; document.getElementById('play-btn').click(); });
    await nino.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    const cdp = await nino.context().newCDPSession(nino);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await dormir(1500);
    await nino.evaluate(() => {
      window.__longues = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] });
      if (document.getElementById('minimap').style.display !== 'block') document.getElementById('map-btn').click();
    });
    await dormir(2500);
    await nino.evaluate(() => document.getElementById('minimap').click());
    await nino.waitForFunction(() => window.__carte && window.__carte.ouverte, null, { timeout: 30000 });
    await dormir(2500);
    // les fonctions de la carte qu'on peut envelopper (celles qui dessinent)
    const env = await nino.evaluate(() => {
      const c = window.__carte; window.__msCarte = 0; window.__pireAppel = 0; let prof = 0; const noms = [];
      for (const k of ['peindre', 'avancerFond', 'commencerFond', 'rendreCalque', 'preparer']) {
        if (typeof c[k] !== 'function') continue;
        const f = c[k]; noms.push(k);
        c[k] = function (...a) { const t = performance.now(); prof++; try { return f.apply(this, a); } finally { prof--; const d = performance.now() - t; if (!prof) { window.__msCarte += d; window.__pireAppel = Math.max(window.__pireAppel, d); } } };
      }
      return noms;
    });
    console.log('enveloppées :', env.join(', ') || '(aucune)');
    // DÉSARMÉ : le fond se calcule d'un seul tenant (budget infini) — le
    // chemin d'avant la v258 ; le témoin doit le voir
    if (process.env.DESARME) await nino.evaluate(() => { const c = window.__carte, f = c.avancerFond; c.avancerFond = function () { return f.call(this, 1e9); }; });
    for (const bras of (process.env.BRAS || 'glisser,immobile,immobile,glisser,glisser,immobile').split(',')) {
      await nino.evaluate(() => { window.__longues.length = 0; window.__msCarte = 0; window.__pireAppel = 0; });
      await nino.evaluate((bras) => new Promise((fin) => {
        const c = window.__carte; const t0 = performance.now(); let images = 0;
        const pas = () => { images++; if (bras === 'glisser') { c.vue.cx += 2; c.vue.cz += 1; } if (performance.now() - t0 < 3000) requestAnimationFrame(pas); else fin(images); };
        requestAnimationFrame(pas);
      }), bras);
      await dormir(1500);
      const r = await nino.evaluate(() => ({ longues: window.__longues.slice(), msCarte: Math.round(window.__msCarte), pireAppel: Math.round(window.__pireAppel) }));
      console.log(`${bras.padEnd(9)} pire ${Math.max(0, ...r.longues)} ms · tâches ${JSON.stringify(r.longues)} · dans la carte ${r.msCarte} ms, pire appel ${r.pireAppel} ms`);
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
