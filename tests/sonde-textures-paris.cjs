// CE QUE TIENNENT LES TEXTURES À PARIS, PAR FAMILLE (chantier mémoire).
// Usage : node tests/sonde-textures-paris.cjs [x z]
//
// Le journal de bord de l'iPhone (v586, plantage) disait 279 Mo de textures
// à Paris, à pied, sans dire lesquelles : `estimerMemoire` ne rend qu'un
// total. La sonde se pose au même endroit, attend que la ville se remplisse
// (convois, passants, couche HD), puis range chaque image tenue par la scène
// selon ce qui la porte : voiture (un maillage dont un ancêtre vient de la
// flotte), corps (un maillage à squelette), sol et façades (les morceaux),
// et le reste par nom. Deux bras : KTX2 branché, et `?ktx2=0`.
// Le banc rend en logiciel : les tailles comprimées sont celles de
// SwiftShader (un octet par pixel) ; l'iPhone reçoit l'ETC1S opaque à un
// demi-octet. Isolée : aucune suite ne l'importe.
const { Banc } = require('./banc.js');
const X = +process.argv[2] || -358, Z = +process.argv[3] || 317;

async function bras(banc, nom, params) {
  const p = await banc.jouerSeul(nom, { rr: 10, params, pret: true });
  await p.evaluate(({ X, Z }) => { const g = window.__game; g.player.pos.set(X, 40, Z); }, { X, Z });
  await p.waitForTimeout(45000);
  return p.evaluate(async () => {
    const J = await import('./src/journal.js');
    const g = window.__game;
    const PROPS = ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'clearcoatNormalMap', 'clearcoatMap', 'clearcoatRoughnessMap', 'bumpMap', 'specularMap', 'lightMap', 'envMap', 'transmissionMap', 'sheenColorMap'];
    const vues = new Map();
    const octets = (t) => {
      if (t.isCompressedTexture && t.mipmaps && t.mipmaps.length) return t.mipmaps.reduce((s, m) => s + ((m && m.data && m.data.byteLength) || 0), 0);
      const img = t.source ? t.source.data : t.image;
      const w = (img && (img.width || img.videoWidth)) || 0, h = (img && (img.height || img.videoHeight)) || 0;
      const d = img && img.depth || 1;
      const mip = t.generateMipmaps === false && !(t.mipmaps && t.mipmaps.length) ? 1 : 4 / 3;
      return w * h * d * 4 * mip;
    };
    const famille = (o) => {
      if (o.isSkinnedMesh) return 'corps';
      for (let a = o; a; a = a.parent) {
        const u = a.userData || {};
        if (u.protoDe || u.fichier || u.modele || u.proto) return 'voiture';
        if (/ny|newyork|empire|liberte|quartier/i.test(a.name || '')) return 'new-york';
      }
      return null;
    };
    g.scene.traverse((o) => {
      if (!o.isMesh && !o.isPoints && !o.isSprite) return;
      const fam0 = famille(o);
      for (const m of [].concat(o.material)) {
        if (!m) continue;
        const ts = PROPS.map((k) => m[k]).filter(Boolean);
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) ts.push(u.value);
        for (const t of ts) {
          if (!t.isTexture) continue;
          const src = t.source || t.image;
          if (!src || vues.has(src)) continue;
          const img = t.source ? t.source.data : t.image;
          const fam = fam0 || (m.type + ':' + (o.name || o.parent && o.parent.name || '?')).slice(0, 48);
          vues.set(src, { fam, o: octets(t), dim: (img && img.width) + 'x' + (img && img.height), comp: !!t.isCompressedTexture });
        }
      }
    });
    const parFam = {};
    for (const v of vues.values()) { const f = parFam[v.fam] || (parFam[v.fam] = { mo: 0, n: 0, comp: 0 }); f.mo += v.o / 1048576; f.n++; if (v.comp) f.comp++; }
    const tot = J.estimerMemoire([g.scene]);
    return { total: +tot.texMo.toFixed(1), geo: +tot.geoMo.toFixed(1), sources: tot.sources, parFam, pos: g.player.pos.toArray().map(Math.round) };
  });
}

(async () => {
  const banc = new Banc({ portJeu: 8438, portPairs: 9438 });
  await banc.ouvrir();
  try {
    for (const [nom, params] of [['TexKtx', '&hd=6&arbres=1'], ['TexOrig', '&hd=6&arbres=1&ktx2=0']]) {
      const r = await bras(banc, nom, params);
      console.log(`== ${nom} : textures ${r.total} Mo, géométrie ${r.geo} Mo, ${r.sources} sources, pos ${r.pos}`);
      for (const [f, v] of Object.entries(r.parFam).sort((a, b) => b[1].mo - a[1].mo)) console.log('  ', f.padEnd(50), v.mo.toFixed(1).padStart(7), 'Mo', String(v.n).padStart(4), 'images', v.comp ? `(${v.comp} comprimées)` : '');
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
