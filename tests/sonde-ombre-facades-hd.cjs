// L'OMBRE DES FAÇADES HD (v569) : une croisée au matériau de la couche HD jette-
// t-elle une ombre ajourée — le bois ombre, la vitre (vide dans la tuile)
// laisse passer le soleil — ou une ombre pleine, ou pas d'ombre du tout ?
//   node tests/sonde-ombre-facades-hd.cjs [rapport.json] [préfixe des captures] [&ombrehd=0]
//
// Page à ombres forcées (`ombres=1`, v247), à Paris (`hd=2`) : le matériau HD
// et ce que le jeu pose sur ses maillages de façades se lisent sur un vrai
// morceau. Un panneau HORIZONTAL de deux croisées sur deux, aux UV en unités du
// monde (0..2, repliées par le shader comme sur une façade), seize blocs de
// côté, dix blocs au-dessus d'une dalle qui reçoit l'ombre, très au-dessus des
// toits. On lit la dalle derrière le centre des carreaux et derrière le meneau.
// Témoin : un panneau plein (un matériau sans carte) lit « ombre » partout.
//
// La mesure est exportée (`mesurer`) : `parishd.js` la lit telle quelle (v400).
const { Banc, souffler } = require('./banc.js');

async function mesurer(page) {
  return page.evaluate(async () => {
    const g = window.__game, r = g.renderer, cam = g.camera, scene = g.scene;
    const THREE = await import('three');
    const { geometrieHD } = await import('./src/matierehd.js');
    const { rectHD } = await import('./src/facadeshd.js');
    const { adresseParis } = await import('./src/paris.js');
    const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
    const [px, pz] = adresseParis(0, 0);
    g.player.flying = true; g.player.vel.set(0, 0, 0);
    g.player.pos.set(px + 0.5, 140, pz + 0.5);
    // un vrai maillage de façades : son matériau et ce que le jeu pose dessus
    const t0 = performance.now();
    let facade = null;
    while (performance.now() - t0 < 90000) {
      for (const e of g.chunkMeshes.values()) if (e.facades) { facade = e.facades; break; }
      if (facade) break;
      await dodo(500);
    }
    if (!facade) return { erreur: 'aucun maillage de façades en 90 s' };
    const attente = Math.round(performance.now() - t0);
    const materiau = Array.isArray(facade.material) ? facade.material[0] : facade.material;
    // la dalle qui reçoit, le panneau qui jette
    const Y = 150, H = 40, C = 16;
    const cx = px + 0.5, cz = pz + 0.5;
    const dalle = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshLambertMaterial({ color: 0xdddddd, fog: false }));
    dalle.rotation.x = -Math.PI / 2; dalle.position.set(cx, Y, cz); dalle.receiveShadow = true;
    const [u0, v0, du, dv] = rectHD('croisee');
    const h = C / 2;
    const tampon = {
      positions: new Float32Array([-h, 0, h, h, 0, h, h, 0, -h, -h, 0, -h]),
      normals: new Float32Array([0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0]),
      uvs: new Float32Array([0, 0, 2, 0, 2, 2, 0, 2]),
      colors: new Float32Array(12).fill(1),
      tiles: new Float32Array([u0, v0, du, dv, u0, v0, du, dv, u0, v0, du, dv, u0, v0, du, dv]),
      matiere: new Float32Array([0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0]),
      lueur: new Float32Array(4),
      // tourné vers le BAS : three dessine les ombres par la face arrière
      // (`shadowSide` nul → l'envers du côté), comme le dos d'une façade
      indices: new Uint16Array([0, 2, 1, 0, 3, 2]),
    };
    const panneau = new THREE.Mesh(geometrieHD(tampon), materiau);
    panneau.position.set(cx, Y + H, cz);
    panneau.castShadow = true;
    if (facade.customDepthMaterial) panneau.customDepthMaterial = facade.customDepthMaterial;
    const plein = new THREE.Mesh(panneau.geometry, new THREE.MeshLambertMaterial());
    plein.position.copy(panneau.position); plein.castShadow = true; plein.visible = false;
    scene.add(dalle, panneau, plein);
    window.__setDayTime(0.15);
    await dodo(1500);
    const sun = scene.children.find((o) => o.isDirectionalLight);
    const gl = r.getContext();
    const lire = (X, Yy, Z) => {
      const v = new THREE.Vector3(X, Yy, Z).project(cam);
      const W = gl.drawingBufferWidth, Hh = gl.drawingBufferHeight;
      const sx = Math.round((v.x + 1) / 2 * W), sy = Math.round((1 - v.y) / 2 * Hh);
      if (sx < 3 || sy < 3 || sx > W - 4 || sy > Hh - 4) return -1;
      const buf = new Uint8Array(4 * 9);
      gl.readPixels(sx - 1, Hh - 1 - (sy + 1), 3, 3, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let l = 0;
      for (let i = 0; i < 9; i++) l += 0.2126 * buf[i * 4] + 0.7152 * buf[i * 4 + 1] + 0.0722 * buf[i * 4 + 2];
      return +(l / 9).toFixed(1);
    };
    // fract(uv) → position sur le panneau ; la tuile est retournée en v (flipY)
    // carreaux : colonnes 15 et 45 de 128, rangs 15 et 70 ; meneau : colonne 64
    const carreaux = [], bois = [];
    for (const bx of [0, 1]) for (const bz of [0, 1]) {
      for (const [fu, fv] of [[15 / 128, 1 - 15 / 128], [45 / 128, 1 - 70 / 128], [83 / 128, 1 - 15 / 128], [111 / 128, 1 - 70 / 128]]) carreaux.push([bx + fu, bz + fv]);
      for (const fv of [0.15, 0.75]) bois.push([bx + 0.5, bz + fv]);
    }
    const releve = () => {
      g.player.pos.set(px + 0.5, 140, pz + 0.5);
      const d = sun.position.clone().sub(sun.target.position).normalize();
      const off = H / d.y;
      // u → +x, v → −z (le quad va de (-h, h) en uv (0,0) à (h, -h) en (2,2))
      const sol = ([u, v]) => [cx - h + u * h - d.x * off, Y + 0.01, cz + h - v * h - d.z * off];
      const centre = sol([1, 1]);
      // la caméra SOUS le panneau (il est derrière elle) : vu d'en haut, il
      // cacherait sa propre ombre
      cam.position.set(centre[0], Y + 20, centre[2] + 0.01);
      cam.lookAt(centre[0], Y, centre[2]);
      cam.updateMatrixWorld(true);
      r.render(scene, cam);
      const lc = carreaux.map((p) => lire(...sol(p))), lb = bois.map((p) => lire(...sol(p)));
      const loin = lire(centre[0] + 13, Y, centre[2]);
      if (window.__imagesOmbre) window.__imagesOmbre.push(r.domElement.toDataURL('image/png'));
      return { carreaux: lc, bois: lb, soleil: loin };
    };
    // la caméra suit le joueur à chaque image : on rend nous-mêmes, joueur figé
    const avant = g.player.update; g.player.update = () => {};
    let hd, temoin;
    try {
      await dodo(300);
      hd = releve();
      panneau.visible = false; plein.visible = true;
      await dodo(300);
      temoin = releve();
    } finally { g.player.update = avant; }
    scene.remove(dalle, panneau, plein);
    const dSol = sun.position.clone().sub(sun.target.position).normalize();
    const moy = (a) => +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(1);
    window.__setDayTime(0.3);
    return { attente, ombres: r.shadowMap.enabled, profondeur: !!facade.customDepthMaterial,
      hd: { carreaux: moy(hd.carreaux), bois: moy(hd.bois), soleil: hd.soleil, detail: hd },
      plein: { carreaux: moy(temoin.carreaux), bois: moy(temoin.bois), soleil: temoin.soleil },
      programmes: r.info.programs.length, soleilDir: [dSol.x, dSol.y, dSol.z].map((x) => +x.toFixed(2)).join(' ') };
  });
}
module.exports = { mesurer };

if (require.main === module) {
  (async () => {
    const banc = new Banc({ portJeu: 8471, portPairs: 9471 });
    await banc.ouvrir();
    try {
      await souffler();
      const page = await banc.jouerSeul('Ombre', { rr: 4, ombres: 1, viewport: { width: 1280, height: 720 }, dpr: 1, params: '&hd=2' + (process.argv[4] || '') });
      // les captures (dalle sous le panneau HD, puis sous le panneau plein)
      await page.evaluate(() => { window.__imagesOmbre = []; });
      const res = await mesurer(page);
      const imgs = await page.evaluate(() => window.__imagesOmbre || []);
      imgs.forEach((u, i) => require('fs').writeFileSync(`${process.argv[3] || '/tmp/ombre'}-${i}.png`, Buffer.from(u.split(',')[1], 'base64')));
      console.log(JSON.stringify(res, null, 1));
      if (process.argv[2]) require('fs').writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
    } finally { await banc.fermer(); process.exit(0); }
  })();
}
