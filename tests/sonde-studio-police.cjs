// LES TROIS MODÈLES « POLICE », RENDUS SEULS (v553). Planche de contrôle des
// GLB convertis par `scripts/convertir-police.mjs` : trois-quarts avant,
// profil, trois-quarts arrière, dessus — avec un plan au sol à y = 0 et les
// pivots de roue marqués, pour voir d'un coup la pose au contrat (sol, nez en
// +Z, roues au centre du pneu). Rendu dans le navigateur du banc (SwiftShader),
// pas un studio : c'est le chargeur du jeu qui lit le fichier.
//
//   cd tests && node sonde-studio-police.cjs [dossier]
//
// Isolée (aucune suite ne l'importe).
const { Banc } = require('./banc.js');
const path = require('path');
const fs = require('fs');
const os = require('os');
const dossier = process.argv[2] || path.join(os.tmpdir(), 'studio-police');
fs.mkdirSync(dossier, { recursive: true });

(async () => {
  const banc = new Banc();
  await banc.ouvrir();
  const page = await banc.navigateur.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(`http://localhost:${banc.portJeu}/manifest.webmanifest`);
  await page.setContent(`<html><body style="margin:0;background:#cfd6de"><canvas id="c" width="1600" height="1000"></canvas>
<script type="importmap">{"imports":{"three":"http://localhost:${banc.portJeu}/vendor/three.module.min.js"}}</script></body></html>`);
  for (const fichier of ['voitures/police-car.glb', 'voitures/moto-police.glb', 'humains/policier.glb']) {
    const info = await page.evaluate(async (fichier) => {
      const THREE = await import('three');
      const { GLTFLoader } = await import(location.origin.replace('null', '') + '/vendor/GLTFLoader.js').catch(() => import('http://localhost:8321/vendor/GLTFLoader.js'));
      const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
      r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
      const gltf = await new GLTFLoader().loadAsync('http://localhost:8321/vendor/' + fichier);
      const s = new THREE.Scene(); s.background = new THREE.Color(0xcfd6de);
      s.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.2));
      const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(4, 8, 6); s.add(d);
      const sol = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x9aa2aa, roughness: 1 }));
      sol.rotation.x = -Math.PI / 2; s.add(sol);
      s.add(new THREE.GridHelper(12, 24, 0x444444, 0x777777));
      s.add(gltf.scene);
      const b = new THREE.Box3().setFromObject(gltf.scene), t = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      const roues = [];
      gltf.scene.traverse((o) => { if (/^Wheel_/.test(o.name)) { const w = o.getWorldPosition(new THREE.Vector3()); roues.push([o.name, +w.x.toFixed(3), +w.y.toFixed(3), +w.z.toFixed(3)]); const m = new THREE.Mesh(new THREE.SphereGeometry(0.04), new THREE.MeshBasicMaterial({ color: 0xff00ff, depthTest: false })); m.position.copy(w); s.add(m); } });
      let tri = 0, mats = new Set();
      gltf.scene.traverse((o) => { if (o.isMesh) { tri += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; mats.add(o.material.name); } });
      const vues = [[1, 0.45, 1], [1, 0.2, 0], [-1, 0.45, -1], [0.01, 1, 0.01]];
      const tuiles = [];
      const R = Math.max(t.x, t.y, t.z) * 1.15;
      for (const [vx, vy, vz] of vues) {
        const cam = new THREE.PerspectiveCamera(35, 1.6, 0.05, 100);
        const v = new THREE.Vector3(vx, vy, vz).normalize().multiplyScalar(R * 2.2);
        cam.position.copy(c).add(v); cam.lookAt(c);
        r.render(s, cam);
        tuiles.push(r.domElement.toDataURL('image/jpeg', 0.85));
      }
      return { tuiles, taille: [t.x, t.y, t.z].map((x) => +x.toFixed(3)), min: [b.min.x, b.min.y, b.min.z].map((x) => +x.toFixed(3)), roues, tri, mats: [...mats] };
    }, fichier);
    const nom = path.basename(fichier, '.glb');
    info.tuiles.forEach((u, i) => fs.writeFileSync(path.join(dossier, `${nom}-${i}.jpg`), Buffer.from(u.split(',')[1], 'base64')));
    delete info.tuiles;
    console.log(nom, JSON.stringify(info));
  }
  await banc.fermer();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
