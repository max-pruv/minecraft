// SONDE (banc-intermittents) : pourquoi `realisme.js` meurt-il au clic
// « Jouer » ? Trois causes possibles, et le message de Playwright ne les
// sépare pas (« locator.click: Timeout 30000ms ») : le bouton est grisé, un
// autre élément le recouvre, ou la page ne rend plus assez d'images pour que
// la vérification de STABILITÉ de Playwright (deux images de suite) aboutisse.
// On ouvre la page exactement comme la suite, on charge la machine (CHARGE=n
// boucles de calcul dans des processus à part, BRIDE=n bridage du processeur
// de la page) et l'on publie les trois grandeurs.
const { Banc, dormir } = require('./banc.js');
const { fork } = require('child_process');
if (process.argv[2] === 'brule') { for (;;) { /* un cœur occupé */ } }
(async () => {
  const brules = [];
  for (let i = 0; i < Number(process.env.CHARGE || 0); i++) brules.push(fork(__filename, ['brule']));
  const banc = new Banc({ portJeu: 8461, portPairs: 9461 });
  await banc.ouvrir();
  try {
    for (let k = 0; k < Number(process.env.N || 2); k++) {
      const p = await banc.joueur('Sonde' + k, { carte: 'manhattan', rr: 2, viewport: { width: 1280, height: 800 } });
      if (process.env.BRIDE) {
        const cdp = await p.context().newCDPSession(p);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.BRIDE) });
      }
      await p.locator('.who-card.active').click();
      await p.getByRole('button', { name: 'Plus tard', exact: true }).click();
      const etat = await p.evaluate(() => new Promise((res) => {
        const b = document.getElementById('play-btn');
        const r = b.getBoundingClientRect();
        const dessus = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        let n = 0; const t0 = performance.now();
        const compter = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(compter); else fin(); };
        const fin = () => res({
          desactive: b.disabled, visible: r.width > 0 && getComputedStyle(b).visibility !== 'hidden',
          dessus: dessus === b || b.contains(dessus) ? 'le bouton' : (dessus ? (dessus.id || dessus.className || dessus.tagName) : null),
          imagesParSeconde: +(n / ((performance.now() - t0) / 1000)).toFixed(2),
          running: !!(window.__game && window.__game.running),
        });
        requestAnimationFrame(compter);
      }));
      const t = Date.now(); let clic;
      try { await p.locator('#play-btn').click({ timeout: 30000 }); clic = `ok en ${Date.now() - t} ms`; }
      catch (e) { clic = `ÉCHEC en ${Date.now() - t} ms : ${e.message.split('\n').slice(0, 6).join(' | ')}`; }
      console.log(`passage ${k} :`, JSON.stringify(etat), '→ clic', clic);
      await p.close();
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { brules.forEach((b) => b.kill()); process.exit(0); }
})();
