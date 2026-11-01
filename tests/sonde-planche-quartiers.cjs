// LA PLANCHE DE CONTRÔLE DES QUARTIERS (v583) : chaque forme de
// vendor/newyork/quartiers.glb vue de ses quatre côtés, et son lointain. C'est
// ici qu'on relève la face sur rue de chaque modèle (`face`,
// scripts/new-york-quartiers.mjs) et qu'on vérifie qu'aucune enseigne écartée
// n'est restée. La page se recharge sans cache : `?t=` (v566).
// Usage : node tests/sonde-planche-quartiers.cjs <fichier.png> [lueur]
// Sonde isolée : aucune suite ne l'importe.
const { Banc } = require('./banc.js');
const sortie = process.argv[2] || 'planche.png';
const lueur = process.argv[3] === 'lueur';

(async () => {
  const banc = new Banc({ portJeu: 8413, portPairs: 9413 });
  await banc.ouvrir();
  try {
    const page = await banc.navigateur.newPage({ viewport: { width: 1500, height: 1500 } });
    page.on('console', (m) => { if (m.type() === 'error') console.log('console :', m.text()); });
    page.on('pageerror', (e) => console.log('page :', e.message));
    const html = `<!doctype html><html><body style="margin:0;background:#556">
      <script type="importmap">{ "imports": { "three": "/vendor/three.module.min.js" } }</script>
      <canvas id="c" width="1500" height="1500"></canvas>
      <script type="module">
      import * as THREE from 'three';
      import { GLTFLoader } from '/vendor/GLTFLoader.js';
      const lueur = ${lueur};
      const gltf = await new GLTFLoader().loadAsync('/vendor/newyork/quartiers.glb?t=' + Date.now());
      const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
      r.setSize(1500, 1500); r.autoClear = false; r.toneMapping = THREE.ACESFilmicToneMapping;
      r.setClearColor(0x8aa0b0); r.clear();
      const meshes = {};
      gltf.scene.traverse((o) => { if (o.isMesh) meshes[o.name] = o; });
      const noms = Object.keys(meshes).filter((n) => !n.endsWith('-loin'));
      const DIM = { immeuble: [18.2, 17.5, 18], appartements: [18.2, 13.9, 19.8], cinema: [18.1, 20.6, 19.3], clinique: [35.7, 19.5, 17.9], lavomatique: [12.7, 9.1, 12.7], conserverie: [53, 17.8, 16], barre: [52, 31.7, 15.1], basket: [17.1, 5.2, 33.8] };
      const VUES = [[0, '+z'], [Math.PI / 2, '+x'], [Math.PI, '-z'], [-Math.PI / 2, '-x'], [0, 'loin']];
      const W = 300, H = 1500 / noms.length;
      noms.forEach((nom, ligne) => {
        VUES.forEach(([a, tag], col) => {
          const scene = new THREE.Scene();
          scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, lueur ? 0.02 : 1.8));
          const sun = new THREE.DirectionalLight(0xfff0dd, lueur ? 0 : 2.2); sun.position.set(30, 60, 40); scene.add(sun);
          const m = meshes[tag === 'loin' ? nom + '-loin' : nom].clone();
          const d = DIM[nom] || [20, 20, 20];
          m.scale.set(d[0], d[1], d[2]);
          m.position.set(0, 0, 0);
          if (lueur) { m.material = m.material.clone(); m.material.emissiveIntensity = 2; }
          scene.add(m);
          const R = Math.hypot(d[0], d[1], d[2]) * 0.95;
          const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 500);
          cam.position.set(Math.sin(a + 0.45) * R * 1.35, d[1] * 0.45 + R * 0.45, Math.cos(a + 0.45) * R * 1.35);
          cam.lookAt(0, d[1] * 0.42, 0);
          r.setViewport(col * W, 1500 - (ligne + 1) * H, W, H);
          r.setScissor(col * W, 1500 - (ligne + 1) * H, W, H);
          r.setScissorTest(true);
          r.clear();
          r.render(scene, cam);
        });
      });
      window.__fini = noms;
      </script></body></html>`;
    await page.route('**/__planche.html', (route) => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto(`http://127.0.0.1:8413/__planche.html`);
    await page.waitForFunction(() => window.__fini, null, { timeout: 120000 });
    console.log(await page.evaluate(() => window.__fini));
    await page.screenshot({ path: sortie });
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
