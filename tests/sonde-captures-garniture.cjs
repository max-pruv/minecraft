// LA GARNITURE EN CAPTURE (vNEXT) : pour chaque modèle, la portière gauche
// ouverte vue de trois quarts arrière, et le regard DANS l'ouverture, en une
// planche. `node sonde-captures-garniture.cjs <dossier> [modèles,…] [avant]`
// — `avant` coupe la garniture, pour la planche d'avant.
const { Banc } = require('./banc.js');
const fs = require('fs');
const DOSSIER = process.argv[2] || '.';
const LISTE = process.argv[3] && process.argv[3] !== 'tout' ? process.argv[3].split(',') : null;
const AVANT = process.argv[4] === 'avant';
(async () => {
  const banc = new Banc({ portJeu: 8421, portPairs: 9421 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('SondeCapGarni');
    const noms = LISTE || await tab.evaluate(async () => (await import('./src/vehicules.js')).FLOTTE.filter((f) => !f.fabrique || true).map((f) => f.fichier));
    const url = await tab.evaluate(async ({ noms, AVANT }) => {
      const THREE = await import('three');
      const { MODELES_MONTURE } = await import('./src/montures.js');
      const V = await import('./src/vehicules.js');
      const P = await import('./src/portieres.js');
      const W = 360, H = 270, COL = 4;
      const lignes = Math.ceil(noms.length * 2 / COL);
      const c = document.createElement('canvas'); c.width = W * COL; c.height = H * lignes;
      const cx = c.getContext('2d');
      const r = window.__game.renderer;
      const t = new THREE.WebGLRenderTarget(W, H);
      const px = new Uint8Array(W * H * 4);
      let n = 0;
      for (const nom of noms) {
        const f = V.FLOTTE.find((e) => e.fichier === nom);
        const g = MODELES_MONTURE.voiture({ flotte: f.fichier });
        await V.chargerVoitureFlotte(f); await new Promise((res) => setTimeout(res, 0));
        const eq = P.equiperPortieres(g, false, { ciseau: f.portiere === 'ciseau', garniture: !AVANT });
        if (eq) P.ouvrir(eq['-1'], 1);
        const sc = new THREE.Scene();
        sc.background = new THREE.Color(0x9fc4e8);
        sc.add(new THREE.HemisphereLight(0xffffff, 0x556644, 1.4));
        const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(-4, 8, 6); sc.add(sol);
        const dalle = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshLambertMaterial({ color: 0x777777 }));
        dalle.rotation.x = -Math.PI / 2; sc.add(dalle);
        sc.add(g); g.updateMatrixWorld(true);
        const vues = [[[-4.2, 2.2, 3.4], [-0.6, 0.7, -0.3]], [[-3.2, 1.25, -0.2], [0.2, 0.62, -0.25]]];
        for (const [p, l] of vues) {
          const cam = new THREE.PerspectiveCamera(46, W / H, 0.05, 100);
          cam.layers.enableAll(); cam.position.set(...p); cam.lookAt(...l);
          r.setRenderTarget(t); r.render(sc, cam); r.setRenderTarget(null);
          r.readRenderTargetPixels(t, 0, 0, W, H, px);
          const im = cx.createImageData(W, H);
          for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
          cx.putImageData(im, (n % COL) * W, Math.floor(n / COL) * H);
          cx.fillStyle = '#000'; cx.font = '13px sans-serif'; cx.fillText(nom.replace('.glb', '') + (eq ? '' : ' (sans portière)'), (n % COL) * W + 6, Math.floor(n / COL) * H + 16);
          n++;
        }
      }
      return c.toDataURL('image/png');
    }, { noms, AVANT });
    fs.writeFileSync(`${DOSSIER}/garniture${AVANT ? '-avant' : ''}.png`, Buffer.from(url.split(',')[1], 'base64'));
    console.log('erreurs', JSON.stringify(tab.erreurs.slice(0, 5)));
  } finally { await banc.fermer(); process.exit(0); }
})();
