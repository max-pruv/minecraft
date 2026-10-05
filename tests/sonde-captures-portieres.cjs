// LES PORTIÈRES EN CAPTURE (v357) : pour quelques modèles, la voiture fermée
// puis portière gauche ouverte, vue de trois quarts arrière gauche, dans une
// scène à part rendue par le renderer du jeu (mêmes programmes, mêmes couches).
const { Banc } = require('./banc.js');
const fs = require('fs');
const DOSSIER = process.argv[2] || '.';
const MODELES = (process.argv[3] || 'amg-gt-black-series.glb,ferrari-sf90.glb,rolls-royce-spectre.glb,lucid-gravity.glb,bugatti-chiron-stealth.glb,acura-nsx-type-s.glb').split(',');
(async () => {
  const banc = new Banc({ portJeu: 8419, portPairs: 9419 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('SondeCapPortes');
    for (const nom of MODELES) {
      for (const ouvert of [0, 1]) {
        const url = await tab.evaluate(async ({ nom, ouvert }) => {
          const THREE = await import('three');
          const { MODELES_MONTURE } = await import('./src/montures.js');
          const V = await import('./src/vehicules.js');
          const P = await import('./src/portieres.js');
          const f = V.FLOTTE.find((e) => e.fichier === nom);
          const g = MODELES_MONTURE.voiture({ flotte: f.fichier });
          await V.chargerVoitureFlotte(f); await new Promise((r) => setTimeout(r, 0));
          const eq = P.equiperPortieres(g);
          if (eq) P.ouvrir(eq['-1'], ouvert);
          const sc = new THREE.Scene();
          sc.background = new THREE.Color(0x9fc4e8);
          sc.add(new THREE.HemisphereLight(0xffffff, 0x556644, 1.4));
          const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(-4, 8, 6); sc.add(sol);
          const dalle = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshLambertMaterial({ color: 0x777777 }));
          dalle.rotation.x = -Math.PI / 2; sc.add(dalle);
          sc.add(g);
          const cam = new THREE.PerspectiveCamera(46, 4 / 3, 0.05, 100);
          cam.layers.enableAll();
          cam.position.set(-4.2, 2.2, 3.4); cam.lookAt(-0.6, 0.7, -0.3);
          const r = window.__game.renderer;
          const t = new THREE.WebGLRenderTarget(640, 480);
          r.setRenderTarget(t); r.render(sc, cam); r.setRenderTarget(null);
          const px = new Uint8Array(640 * 480 * 4);
          r.readRenderTargetPixels(t, 0, 0, 640, 480, px);
          const c = document.createElement('canvas'); c.width = 640; c.height = 480;
          const cx = c.getContext('2d'); const im = cx.createImageData(640, 480);
          for (let y = 0; y < 480; y++) im.data.set(px.subarray((479 - y) * 640 * 4, (480 - y) * 640 * 4), y * 640 * 4);
          cx.putImageData(im, 0, 0);
          return { url: c.toDataURL('image/png'), eq: !!eq };
        }, { nom, ouvert });
        fs.writeFileSync(`${DOSSIER}/porte-${nom.replace('.glb', '')}-${ouvert}.png`, Buffer.from(url.url.split(',')[1], 'base64'));
        console.log(nom, ouvert, 'equipee', url.eq);
      }
    }
    console.log('erreurs', JSON.stringify(tab.erreurs.slice(0, 5)));
  } finally { await banc.fermer(); process.exit(0); }
})();
