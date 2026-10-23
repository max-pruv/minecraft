// LES GUIDES DES VILLES, AU NAVIGATEUR (v535).
//   node tests/sonde-guides-villes.cjs [lieu…]   → une ligne par lieu
// On se pose au-dessus du monument (le banc ne charge que deux morceaux autour de l'enfant), on attend que le guide naisse
// (borné), puis l'on marche jusqu'à lui : où il est, s'il est dessiné, s'il
// regarde l'enfant, et ce que le panneau a dit. Manhattan ne se juge qu'ici :
// son plan n'est pas fait de blocs, la pose sous node ne le voit pas.
const { Banc } = require('./banc.js');
const ids = process.argv.slice(2);
module.exports.visiter = async function visiter(tab, id, borneMs = 60000) {
  return tab.evaluate(async ({ id, borneMs }) => {
    const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
    const g = window.__game, gv = window.__guidesVilles();
    const l = gv && (await import('./src/guidesvilles.js')).TOUS_LES_GUIDES.find((x) => x.id === id);
    if (!l) return { id, erreur: 'lieu ou guides absents' };
    // La voix du navigateur (v504) : on la remplace par un enregistreur, pour
    // lire ce que le jeu a VRAIMENT demandé de dire, et dans quelle langue.
    if (!window.__voixEntendue) {
      window.__voixEntendue = [];
      window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [], cancel: () => {}, speak: (u) => window.__voixEntendue.push({ text: u.text, lang: u.lang }),
      } });
    }
    const entendues0 = window.__voixEntendue.length;
    g.player.flying = true; g.player.vel.set(0, 0, 0);
    g.player.pos.set(l.x + 6, 80, l.z);
    const t0 = performance.now();
    while (!gv.nes.has(id) && !gv.echecs.has(id) && performance.now() - t0 < borneMs) await dormir(250);
    const ne = Math.round(performance.now() - t0);
    const guide = gv.nes.get(id);
    if (!guide) return { id, ne, echec: gv.echecs.has(id) };
    // on se pose à trois blocs du guide, au sol, et l'on attend le panneau
    g.player.flying = false;
    g.player.pos.set(guide.pos.x + 3, guide.pos.y + 0.5, guide.pos.z);
    const el = document.getElementById('toast');
    let dit = '';
    const t1 = performance.now();
    while (performance.now() - t1 < 15000) {
      await dormir(250);
      const j = window.__guides.journal.filter((e) => e.id === id);
      if (j.length) { dit = j[j.length - 1].texte; break; }
    }
    // Le regard se lit hors d'un pas de côté (v259) : le guide est un piéton,
    // et une voiture qui passe sur la rue voisine le fait s'écarter un instant,
    // dos à l'enfant. Lu à un instant fixe, c'était un tirage (vu au portail de
    // la v535 : regard −0,7, `ecart` vrai). On attend le FAIT — pas d'écart en
    // cours et le visage vers l'enfant —, borné, et l'on dit ce qu'on a vu.
    const lireRegard = () => {
      const dx = g.player.pos.x - guide.pos.x, dz = g.player.pos.z - guide.pos.z;
      return Math.cos(guide.yaw - Math.atan2(-dx, -dz));
    };
    let regard = lireRegard(), ecarts = 0;
    const t2 = performance.now();
    do {
      await dormir(250);
      if (guide.ecart) ecarts++;
      regard = lireRegard();
    } while ((guide.ecart || regard <= 0.9) && performance.now() - t2 < 8000);
    const msRegard = Math.round(performance.now() - t2);
    return {
      id, ne, d: Math.round(Math.hypot(guide.pos.x - l.x, guide.pos.z - l.z) * 10) / 10,
      y: Math.round(guide.pos.y * 10) / 10, visible: guide.mesh.visible,
      regard: Math.round(regard * 100) / 100, ecarts, msRegard, dit, toast: el ? el.textContent.slice(0, 80) : null,
      affiche: !!el && el.style.opacity === '1' && el.textContent.includes(l.guide),
      parle: window.__voixEntendue.slice(entendues0).pop() || null,
    };
  }, { id, borneMs });
};
if (require.main === module) (async () => {
  const banc = new Banc({ portJeu: 8391, portPairs: 9391 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Sondeur');
    for (const id of ids.length ? ids : ['eiffel', 'empire']) {
      console.log(JSON.stringify(await module.exports.visiter(tab, id)));
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
