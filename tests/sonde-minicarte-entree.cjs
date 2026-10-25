// SONDE (v551) : la minicarte à l'entrée en jeu, image par image du temps
// écoulé depuis « Jouer », à la taille de l'iPad et de l'iPhone, trois fois
// chacune. Sépare les cas : la décision (`voulue`) est fausse — et pourquoi
// (accueil, carte du monde, quiz) — ou la décision est vraie et le DOM ne suit
// pas (display, boîte), ou la boîte est hors de l'écran.
//
//     cd tests && node sonde-minicarte-entree.cjs [passes]
const { Banc } = require('./banc.js');
const PASSES = +(process.argv[2] || 3);
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  try {
    for (const vue of [{ width: 820, height: 1180 }, { width: 430, height: 932 }]) for (let i = 0; i < PASSES; i++) {
      const p = await banc.jouerSeul('Entree' + vue.width + 'x' + i, { viewport: vue, tactile: true, rr: 2 });
      const r = await p.evaluate(async () => {
        const att = (ms) => new Promise((f) => setTimeout(f, ms));
        const mm = document.getElementById('minimap'), g = window.__game, t0 = performance.now(), rel = [];
        for (let k = 0; k < 8; k++) {
          const m = window.__minicarte(), b = mm.getBoundingClientRect(), st = getComputedStyle(mm);
          rel.push({ ms: Math.round(performance.now() - t0), vis: m.visible, voulue: m.voulue,
            overlay: document.getElementById('overlay').style.display, carte: !!(window.__carte && window.__carte.ouverte),
            quiz: !!g.edu.quizActive, inline: mm.style.display, css: st.display, vh: st.visibility,
            b: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)],
            hud: document.body.classList.contains('hud-simple'), classe: document.body.classList.contains('minicarte-ouverte') });
          await att(k < 3 ? 300 : 1500);
        }
        return rel;
      });
      await p.close();
      console.log(`${vue.width}×${vue.height} #${i}`);
      for (const x of r) console.log('   ' + JSON.stringify(x));
    }
  } finally { await banc.fermer(); process.exit(0); }
})().catch((e) => { console.error(e); process.exit(2); });
