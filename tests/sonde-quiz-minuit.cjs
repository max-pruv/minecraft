// SONDE (banc-intermittents) : un portail qui passe minuit ouvre-t-il un quiz
// au milieu d'une suite ? `jouerSeul` pose `libreJusqua` sur la journée du
// jour ; `today()` range sous la date locale. On simule minuit en déplaçant la
// journée courante sous la clé d'hier (ce que fait le calendrier), avec un
// compte à rebours de quinze secondes au lieu de quinze minutes, et l'on lit
// `quizActive` trente secondes plus tard. Deux bras : le répit du banc armé
// (`jouerSeul` d'aujourd'hui) et désarmé (le clic d'avant).
const { Banc, dormir } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8463, portPairs: 9463 }); await banc.ouvrir();
  try {
    for (const arme of [true, false, true, false]) {
      const p = arme ? await banc.jouerSeul('Minuit' + Math.random().toString(36).slice(2, 6))
        : await (async () => { const q = await banc.joueur('Minuit' + Math.random().toString(36).slice(2, 6));
          await q.evaluate(() => { window.__game.edu.today().libreJusqua = 86400; document.getElementById('play-btn').click(); });
          await q.waitForFunction(() => window.__game.running, null, { timeout: 30000 }); return q; })();
      const r = await p.evaluate(async () => {
        const e = window.__game.edu, k = Object.keys(e.data.days).sort().pop();
        e.sessionSeconds = 15;
        e.data.days['1999-12-31'] = e.data.days[k]; delete e.data.days[k]; e.remaining = 15;   // minuit (le compte à rebours, réduit à 15 s)
        const t0 = performance.now();
        while (performance.now() - t0 < 30000 && !e.quizActive) await new Promise((r) => setTimeout(r, 500));
        return { quiz: !!e.quizActive, apres: Math.round(performance.now() - t0), libre: e.today().libreJusqua };
      });
      console.log(arme ? 'répit armé   ' : 'répit d\'avant', JSON.stringify(r));
      await p.close();
    }
  } catch (err) { console.log('ERREUR', err.message); } finally { process.exit(0); }
})();
