// CE QUE LES TEXTURES KTX2 RENDENT EN MÉMOIRE (v588), modèle par modèle.
// Usage : node tests/sonde-memoire-ktx2.cjs
//
// Deux pages, la même chose : chaque modèle déposé de la liste
// (`src/ktx2-liste.js`) chargé par le chemin du jeu — la flotte par
// `chargerVoitureFlotte` (textures partagées, v413), le reste par
// `chargeurModeles` — et ce que son prototype tient en carte graphique
// (`estimerMemoire`, v426, qui compte une texture comprimée à ses niveaux
// réels). Bras « ktx2 » : le transcodeur branché ; bras « origine » : `?ktx2=0`.
// En fin de page, toute la flotte de la rue ensemble (ce qu'une rue peut
// finir par tenir) et le format que la carte a reçu.
//
// Le banc rend en logiciel (SwiftShader) : ses formats comprimés ne sont pas
// ceux de l'iPad. La sonde imprime donc AUSSI l'estimation iPhone/iPad : ETC2
// RGB (½ octet par pixel) pour l'ETC1S opaque, ETC2 RGBA ou ASTC 4×4 (1 octet)
// pour l'ETC1S avec alpha et l'UASTC — le choix de `KTX2Loader` quand la
// carte lit l'ASTC et l'ETC2, ce que font toutes les puces Apple depuis l'A8.
const { Banc } = require('./banc.js');

async function bras(banc, nom, params) {
  const p = await banc.joueur(nom, { rr: 2, params });
  await p.waitForFunction(() => !!window.__game, null, { timeout: 90000 });
  return p.evaluate(async () => {
    const V = await import('./src/vehicules.js');
    const J = await import('./src/journal.js');
    const K = await import('./src/ktx2.js');
    const L = await import('./src/ktx2-liste.js');
    const out = { branche: K.ktx2Branche(), modeles: [], formats: {} };
    const protos = [];
    const formats = (racine) => {
      racine.traverse((o) => {
        if (!o.isMesh) return;
        for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'clearcoatNormalMap', 'alphaMap']) {
          const t = m && m[k];
          if (!t) continue;
          const c = (t.isCompressedTexture ? 'comp:' : 'rgba:') + t.format;
          out.formats[c] = (out.formats[c] || 0) + 1;
        }
      });
    };
    for (const [d, f] of L.MODELES_KTX2) {
      const t0 = performance.now();
      let racine = null;
      const e = d === 'voitures' && V.FLOTTE.find((x) => (x.asset || x.fichier) === f);
      try {
        if (e) racine = await V.chargerVoitureFlotte(e);
        else racine = (await K.chargeurModeles().loadAsync(K.urlModele('./vendor/' + d + '/' + f))).scene;
      } catch (err) { out.modeles.push({ f, err: String(err) }); continue; }
      const ms = Math.round(performance.now() - t0);
      const m = J.estimerMemoire([racine]);
      out.modeles.push({ f, flotte: !!e, ms, texMo: +m.texMo.toFixed(2), geoMo: +m.geoMo.toFixed(2), sources: m.sources });
      formats(racine);
      if (e && !e.horsRue) protos.push(racine);
    }
    const rue = J.estimerMemoire(protos);
    out.rue = { modeles: protos.length, texMo: +rue.texMo.toFixed(1), geoMo: +rue.geoMo.toFixed(1) };
    out.textures = window.__game.renderer.info.memory.textures;
    return out;
  });
}

(async () => {
  const banc = new Banc({ portJeu: 8437, portPairs: 9437 });
  await banc.ouvrir();
  try {
    const a = await bras(banc, 'MemKtx', '');
    const b = await bras(banc, 'MemOrig', '&ktx2=0');
    console.log('branché :', a.branche, '/', b.branche);
    console.log('formats ktx2 :', JSON.stringify(a.formats), ' origine :', JSON.stringify(b.formats));
    let ta = 0, tb = 0;
    for (const m of a.modeles) {
      const o = b.modeles.find((x) => x.f === m.f) || {};
      ta += m.texMo || 0; tb += o.texMo || 0;
      console.log(m.f.padEnd(40), 'tex', String(o.texMo).padStart(6), '→', String(m.texMo).padStart(6), 'Mo   géo', o.geoMo, '→', m.geoMo, '  charge', o.ms, '→', m.ms, 'ms', m.err || '');
    }
    console.log('somme par modèle : tex', tb.toFixed(1), '→', ta.toFixed(1), 'Mo');
    console.log('flotte de la rue ensemble :', JSON.stringify(b.rue), '→', JSON.stringify(a.rue));
  } finally { await banc.fermer(); process.exit(0); }
})();
