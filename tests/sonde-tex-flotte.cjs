// Sonde isolée (v588) : les images de la flotte sous la borne tactile.
// node tests/sonde-tex-flotte.cjs [texvoiture]
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8471, portPairs: 9471 });
  await banc.ouvrir();
  try {
    const t = process.argv[2] ?? '512';
    const pt = await banc.jouerSeul('Images', { rr: 2, pret: true, params: '&texvoiture=' + t });
    const r = await pt.evaluate(async () => {
      const V = await import('./src/vehicules.js');
      const out = { borne: V.TEX_FLOTTE_MAX, modeles: [] };
      for (const f of ['police-car.glb', 'maserati-mc12-gt1.glb', 'lamborghini-revuelto.glb', 'generique-berline.glb']) {
        const e = V.FLOTTE.find((x) => x.fichier === f), p = e && await V.chargerVoitureFlotte(e);
        const ts = new Set(); if (p) p.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) for (const k in m) if (m[k] && m[k].isTexture) ts.add(m[k]); });
        let mo = 0, mx = 0; for (const x of ts) { const i = x.image || {}; const w = i.naturalWidth || i.width || 0, h = i.naturalHeight || i.height || 0; mx = Math.max(mx, w, h); mo += w * h * 4 * 4 / 3 / 1048576; }
        out.modeles.push({ f, n: ts.size, max: mx, mo: +mo.toFixed(1) });
      }
      return out;
    });
    console.log(JSON.stringify(r));
  } finally { await banc.fermer(); process.exit(0); }
})();
