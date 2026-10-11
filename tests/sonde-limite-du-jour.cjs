// SONDE (banc-intermittents) : la cascade de monte.js tombait à 45,8 minutes
// de la suite — l'arrêt quotidien de 45 minutes de jeu sur la page qu'elle
// garde ouverte. On pose le temps de jeu du jour à cinq secondes de la limite
// et l'on lit, vingt secondes plus tard, si la partie tourne encore. Deux
// bras : `jouerSeul` d'aujourd'hui (déblocages du jour posés) et le clic
// d'avant (répit de quiz seul).
const { Banc, dormir } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8468, portPairs: 9468 }); await banc.ouvrir();
  try {
    for (const neuf of [true, false, true, false]) {
      const nom = 'Limite' + Math.random().toString(36).slice(2, 6);
      const p = neuf ? await banc.jouerSeul(nom) : await (async () => { const q = await banc.joueur(nom);
        await q.evaluate(() => { window.__game.edu.today().libreJusqua = 86400; document.getElementById('play-btn').click(); });
        await q.waitForFunction(() => window.__game.running, null, { timeout: 30000 }); return q; })();
      await p.evaluate(() => { window.__game.edu.today().play = 45 * 60 - 5; });
      await dormir(20000);
      const r = await p.evaluate(() => ({ running: !!window.__game.running, arret: !!window.__game.edu.hardStopActive,
        play: Math.round(window.__game.edu.today().play), unlocks: window.__game.edu.today().unlocks }));
      console.log(neuf ? 'banc neuf  ' : 'banc d\'avant', JSON.stringify(r));
      await p.close();
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
