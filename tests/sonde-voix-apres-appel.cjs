// SONDE (v375) : « caméra éteinte, le jeu reprend sa voix normale » — le
// niveau d'après (0,0177) est-il une voix PLUS BASSE, ou un autre moment de la
// mélodie ? Une page seule, sans visio : on lit le niveau en régime établi,
// puis juste après un aller-retour du mode appel (`appelEnCours`), plusieurs
// fois, avec la fenêtre du témoin (1,5 s) et une longue (4 s).
const { Banc, dormir } = require('./banc.js');
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  try {
    const p = await banc.jouerSeul('Alice');
    const r = await p.evaluate(async () => {
      const S = await import('./src/sons.js');
      const niveau = async (ms) => {
        const c = window.__sons.contexte(), sortie = window.__sons.sortie();
        if (c.state === 'suspended') await c.resume().catch(() => {});
        const an = c.createAnalyser(); an.fftSize = 2048; sortie.connect(an);
        const buf = new Float32Array(an.fftSize); let pire = 0; const t0 = performance.now();
        while (performance.now() - t0 < ms) { an.getFloatTimeDomainData(buf); let s2 = 0; for (const v of buf) s2 += v * v;
          pire = Math.max(pire, Math.sqrt(s2 / buf.length)); await new Promise((r) => setTimeout(r, 50)); }
        try { sortie.disconnect(an); } catch {} return +pire.toFixed(4);
      };
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      S.radioDemarre(0); await dodo(3000);
      const etabli = []; for (let k = 0; k < 6; k++) etabli.push(await niveau(1500));
      const etabliLong = []; for (let k = 0; k < 3; k++) etabliLong.push(await niveau(4000));
      const apres = [], apresLong = [], apresAttente = [], gains = [];
      for (let k = 0; k < 5; k++) {
        S.appelEnCours(true); await dodo(1500); S.appelEnCours(false);
        gains.push(+window.__sons.sortie().gain.value.toFixed(3));
        apres.push(await niveau(1500));
        S.appelEnCours(true); await dodo(1500); S.appelEnCours(false);
        apresLong.push(await niveau(4000));
        S.appelEnCours(true); await dodo(1500); S.appelEnCours(false); await dodo(3000);
        apresAttente.push(await niveau(1500));
      }
      return { etabli, etabliLong, apres, apresLong, apresAttente, gains };
    });
    console.log(JSON.stringify(r));
  } finally { process.exit(0); }
})();
