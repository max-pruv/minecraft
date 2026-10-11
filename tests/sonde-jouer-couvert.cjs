// désarmement du verdict « Jouer est actif et rien ne le recouvre » (realisme.js)
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8467, portPairs: 9467 }); await banc.ouvrir();
  try {
    const p = await banc.joueur('Couvert', { carte: 'manhattan', rr: 2, viewport: { width: 1280, height: 800 } });
    await p.evaluate(() => document.querySelector('.who-card.active').click());
    await p.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Plus tard' && b.getBoundingClientRect().width > 0), null, { timeout: 60000 });
    await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Plus tard').click());
    for (const t0 = Date.now(); Date.now() - t0 < 15000;) { const o = await p.evaluate(() => { const m = document.getElementById('id-modal'); if (!m || getComputedStyle(m).display === 'none') return false; const b = [...m.querySelectorAll('button')].find((e) => e.textContent.trim() === 'Plus tard' && e.getBoundingClientRect().width > 0); if (b) b.click(); return true; }); if (!o) break; await new Promise((r) => setTimeout(r, 500)); } console.log('modales', JSON.stringify(await p.evaluate(() => [document.getElementById('id-modal')].filter(Boolean).map((m) => [getComputedStyle(m).display, m.textContent.replace(/\s+/g, ' ').slice(0, 160)]))));  for (const geste of ['rien', 'grisé', 'couvert']) {
      const vu = await p.evaluate((geste) => {
        const b = document.getElementById('play-btn'); b.disabled = geste === 'grisé';
        if (geste === 'couvert') { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:99999'; document.body.appendChild(d); }
        const r = b.getBoundingClientRect(); const dessus = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { actif: !b.disabled, visible: getComputedStyle(b).visibility !== 'hidden', dessus: dessus === b || b.contains(dessus), qui: dessus ? (dessus.id || dessus.className) : null };
      }, geste);
      console.log(geste, JSON.stringify(vu), vu.actif && vu.visible && vu.dessus ? 'VERT' : 'ROUGE');
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
