// LES VOITURES NOIRES (v589). Chaque modèle de FLOTTE rendu seul, de trois
// quarts, sous les lampes du jeu (jour, nuit du monde, nuit de New York), dans
// la page même (le renderer, ACES, la même tâche que le readPixels — v247).
// On publie la luminance moyenne (sRGB, 0–255) des pixels de la voiture et la
// part de sa surface en métal sans reflet.
// Usage : node tests/sonde-voitures-sombres.cjs [json-sortie]
// Exporte `mesurer(page)` pour un témoin.
const { Banc, souffler } = require('./banc.js');

async function mesurer(page, { fichiers = null } = {}) {
  return page.evaluate(async (fichiers) => {
    const THREE = await import('three');
    const V = await import('./src/vehicules.js');
    const g = window.__game, r = g.renderer;
    const MR = await import('./src/manhattan-render.js');
    const ny = MR.NUIT_NY || { ciel: 0.46, lune: 0.12 };
    const LAMPES = {
      jour: { hemi: [0.88, 0xffffff, 0x6e6a5e], soleil: [1.14, 0xffefd6] },
      nuitMonde: { hemi: [1.63, 0x8497bb, 0x6e6a5e], soleil: [0.5, 0x8fa8d8] },
      nuitNY: { hemi: [ny.ciel, 0x7395b8, 0x57534b], soleil: [ny.lune, 0x86a5db] },
    };
    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(), sol = new THREE.DirectionalLight();
    sol.position.set(4, 8, 6); scene.add(hemi, sol, sol.target);
    const cam = new THREE.PerspectiveCamera(30, 1.6, 0.1, 100);
    const W = 320, H = 200;
    const res = [];
    for (const e of V.FLOTTE) {
      if (fichiers && !fichiers.includes(e.fichier)) continue;
      let proto = null;
      try { proto = await V.chargerVoitureFlotte(e); } catch { proto = null; }
      if (!proto) { res.push({ fichier: e.fichier, erreur: 'pas chargé' }); continue; }
      const v = proto.clone(true);
      v.traverse((o) => { o.layers.enableAll(); });
      let aire = 0, metalNu = 0;
      v.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        const p = o.geometry.attributes.position; if (!p) return;
        const a = (o.geometry.index ? o.geometry.index.count : p.count) / 3;
        aire += a;
        for (const m of ms) if (m && (m.metalness || 0) > 0.5 && !m.envMap && !m.transparent) metalNu += a / ms.length;
      });
      scene.add(v);
      const boite = new THREE.Box3().setFromObject(v), c = boite.getCenter(new THREE.Vector3()), t = boite.getSize(new THREE.Vector3());
      const d = Math.max(t.x, t.z) * 2.6;
      cam.position.set(c.x + d * 0.7, c.y + d * 0.35, c.z + d * 0.7); cam.lookAt(c); cam.updateMatrixWorld();
      cam.layers.enableAll();
      const out = { fichier: e.fichier, metalNu: +(metalNu / Math.max(1, aire)).toFixed(2) };
      const avant = { t: r.getRenderTarget(), bg: scene.background };
      for (const [nom, L] of Object.entries(LAMPES)) {
        hemi.intensity = L.hemi[0]; hemi.color.set(L.hemi[1]); hemi.groundColor.set(L.hemi[2]);
        sol.intensity = L.soleil[0]; sol.color.set(L.soleil[1]);
        const rt = new THREE.WebGLRenderTarget(W, H);
        rt.texture.colorSpace = THREE.SRGBColorSpace;
        r.setRenderTarget(rt);
        r.setClearColor(0x000000, 0); r.clear();
        r.render(scene, cam);
        const px = new Uint8Array(W * H * 4);
        r.readRenderTargetPixels(rt, 0, 0, W, H, px);
        r.setRenderTarget(avant.t);
        rt.dispose();
        let s = 0, n = 0;
        for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 200) { s += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; n++; }
        out[nom] = n ? +(s / n).toFixed(1) : null;
      }
      scene.remove(v);
      res.push(out);
    }
    return res;
  }, fichiers);
}
module.exports = { mesurer };

if (require.main === module) (async () => {
  const banc = new Banc({ portJeu: 8414, portPairs: 9414 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Voitures', { rr: 2 });
    const r = await mesurer(page);
    r.sort((a, b) => (a.nuitNY ?? 0) - (b.nuitNY ?? 0));
    for (const x of r) console.log(JSON.stringify(x));
    if (process.argv[2]) require('fs').writeFileSync(process.argv[2], JSON.stringify(r, null, 1));
  } finally { await banc.fermer(); process.exit(0); }
})();
