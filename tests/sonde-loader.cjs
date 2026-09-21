// LE LOADER RETIENT-IL UN ENFANT QUI A LE DROIT DE JOUER ? (v286)
//
// Après une mise à jour, deux attentes tournent en parallèle sur des conditions
// EMBOÎTÉES, et c'est la plus longue qui garde la plus faible :
//   veillerPrep   corps ET chauffe ET carte  → dégrise « Jouer »   45 s
//   loader        corps ET chauffe           → s'efface            90 s
// Entre les deux bornes, « Jouer » est cliquable et le loader le cache.
//
// AU BANC LA SÉQUENCE PREND SIX SECONDES (v257) : l'inversion ne se reproduit
// donc pas toute seule, on la PROVOQUE (leçon des poissons, v233) en raccourcissant
// la borne de préparation — `?prepms=` —, et l'on rejoue le chemin d'après-mise-à-
// jour sans en faire une — `?apresmaj=1`.
const { Banc, souffler } = require('./banc.js');

(async () => {
  const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.joueur('SondeLoader',
      { prep: 1, params: '&apresmaj=1&prepms=2000' });
    const releves = await page.evaluate(async () => {
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const depart = performance.now();
      const pas = [];
      while (performance.now() - depart < 40000) {
        const l = document.getElementById('boot-loader');
        const b = document.getElementById('play-btn');
        if (!l || !b) { await dodo(50); continue; }
        const p = window.__preparation ? window.__preparation() : null;
        pas.push({
          t: Math.round(performance.now() - depart),
          depuis: p && p.depuis, hum: p && p.humains, prog: p && p.programmes,
          loader: !l.classList.contains('hidden'),
          jouable: !b.disabled,
        });
        if (l.classList.contains('hidden') && !b.disabled) break;
        await dodo(50);
      }
      return pas;
    });
    await page.close();
    const fautifs = releves.filter((p) => p.loader && p.jouable);
    const loaderCache = releves.find((p) => !p.loader);
    const degrise = releves.find((p) => p.jouable);
    console.log(`\nrelevés : ${releves.length}`);
    console.log(`« Jouer » dégrisé à        : ${degrise ? degrise.depuis + ' ms (page)' : 'jamais'}`);
    console.log(`loader effacé à            : ${loaderCache ? loaderCache.depuis + ' ms (page)' : 'jamais dans la fenêtre'}`);
    console.log(`RELEVÉS FAUTIFS (loader affiché ET « Jouer » cliquable) : ${fautifs.length}`);
    if (fautifs.length) console.log(`   de ${fautifs[0].depuis} à ${fautifs[fautifs.length - 1].depuis} ms (page)`
      + ` — soit ${fautifs[fautifs.length - 1].depuis - fautifs[0].depuis} ms où l'enfant peut jouer sans le savoir`
      + ` · corps ${fautifs[0].hum} · programmes ${fautifs[0].prog}`);
  } finally { await banc.fermer(); }
  process.exit(0);
})().catch((e) => { console.error('💥 SONDE PLANTÉE :', e); process.exit(2); });
