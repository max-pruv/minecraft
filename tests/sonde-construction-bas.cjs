// LA BARRE DE BLOCS EN CONSTRUCTION, MESURÉE ET PHOTOGRAPHIÉE (v503).
//   node tests/sonde-construction-bas.cjs <dossier> <étiquette>
// Aux deux tailles (le banc, l'iPhone de Max), page tactile : la boîte de la
// barre, le nombre de cases visibles en entier, leur taille, la boîte de
// « Terminer », de Poser et de Casser, puis une capture. Lancée depuis un
// arbre d'`origin/main`, elle photographie l'avant.
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'apres';
(async () => {
  const banc = new Banc({ portJeu: 8417, portPairs: 9417 });
  await banc.ouvrir();
  try {
    for (const vue of [{ width: 430, height: 932 }, { width: 420, height: 760 }]) {
      await souffler();
      const page = await banc.jouerSeul('Bati' + vue.width, { viewport: vue, tactile: true, rr: 4 });
      const r = await page.evaluate(async () => {
        const att = (ms) => new Promise((f) => setTimeout(f, ms));
        window.__setDayTime(0.25);
        window.__commandes.construire(true);
        await att(1500);
        const boite = (el) => { if (!el) return null; const b = el.getBoundingClientRect(), st = getComputedStyle(el);
          return st.display === 'none' || b.width === 0 ? null : { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
        const hb = document.getElementById('hotbar'), hbB = hb.getBoundingClientRect();
        const slots = [...hb.querySelectorAll('.slot')];
        const entieres = slots.filter((s) => { const b = s.getBoundingClientRect(); return b.left >= hbB.left - 0.5 && b.right <= hbB.right + 0.5; }).length;
        return { vue: [innerWidth, innerHeight], barre: boite(hb), cases: slots.length, entieres,
          taille: boite(slots[0]), fin: boite(document.getElementById('construction-fin')),
          pilule: boite(document.getElementById('construction-pill')),
          poser: boite(document.getElementById('poser-btn')), casser: boite(document.getElementById('casser-btn')),
          sauter: boite(document.getElementById('jump-btn')) };
      });
      console.log(tag, JSON.stringify(r));
      await page.screenshot({ path: path.join(dossier, `construction-${tag}-${vue.width}x${vue.height}.png`) });
      await page.close();
    }
  } finally { await banc.fermer(); process.exit(0); }
})().catch((e) => { console.error(e); process.exit(1); });
