// QUE SONT LES CARRÉS ORANGE DU CIEL ? (v531) — la méthode de la v484, et le
// passage que lit `monte.js` (une copie de sonde finit par diverger du témoin,
// v400). Sur la page d'un joueur : l'effet de saison trouvé par sa FORME
// (l'ancien `Points` de taille 0,24 ou l'essaim `saison-*`), sa silhouette, sa
// hauteur en vol, l'écart de chaque particule à SA colonne, et les pixels qu'il
// ajoute sur le ciel vu d'une caméra de voiture. Lancée seule, elle imprime.
const mesurerSaison = (page) => page.evaluate(async () => {
      const g = window.__game, P = g.player, W = g.world, THREE = await import('three');
      const trouver = () => { let n = null; g.scene.traverse((o) => { if (o.isPoints && o.material && Math.abs(o.material.size - 0.24) < 1e-6) n = o; if (o.isInstancedMesh && /^saison-/.test(o.name)) n = o; }); return n; };
      let nuage = trouver();
      if (!nuage) return { err: 'pas de nuage de saison' };
      const images = (n) => new Promise((fin) => { const i0 = g.renderer.info.render.frame; const pas = () => (g.renderer.info.render.frame - i0 >= n ? fin() : requestAnimationFrame(pas)); requestAnimationFrame(pas); });
      const tenir = (n) => new Promise((f) => { let c = 0, p = performance.now(); const s = (t) => { c += Math.min(0.05, (t - p) / 1000); p = t; if (c >= n) f(); else requestAnimationFrame(s); }; requestAnimationFrame(s); });
      // les particules vivantes, en coordonnées du monde
      const vivantes = () => {
        nuage.updateMatrixWorld(true);
        const out = [], v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), m = new THREE.Matrix4();
        if (nuage.isPoints) {
          const pos = nuage.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(nuage.matrixWorld); out.push(v.clone()); }
        } else for (let i = 0; i < nuage.count; i++) { nuage.getMatrixAt(i, m); m.decompose(v, q, sc); if (sc.x > 1e-4) out.push(v.clone().applyMatrix4(nuage.matrixWorld)); }
        return out;
      };
      // 1. LA FORME : une silhouette alpha, pas un carré plein
      let forme = { carte: false, transparents: 0 };
      const map = nuage.material.map;
      if (map && map.image) {
        const c = document.createElement('canvas'); c.width = c.height = 32;
        const cx = c.getContext('2d'); cx.drawImage(map.image, 0, 0, 32, 32);
        const d = cx.getImageData(0, 0, 32, 32).data; let t = 0;
        for (let k = 3; k < d.length; k += 4) if (d[k] < 100) t++;
        forme = { carte: true, transparents: +(t / 1024).toFixed(2) };
      }
      // 2. EN VOL à soixante blocs : rien ne se dessine dans le ciel (v484)
      const x = 30000.5, z = 30000.5, solMer = Math.max(W.terrainHeight(30000, 30000), 30) + 1;
      P.flying = true; P.vel.set(0, 0, 0);
      P.pos.set(x, solMer + 60, z); await images(6);
      const lv = vivantes();
      const enVol = { visible: nuage.visible, haut: lv.length ? +Math.max(...lv.map((v) => v.y - solMer)).toFixed(1) : null };
      // 3. AU SOL, dans un champ dégagé : chaque particule près de SA colonne
      let x0 = -1500, z0 = -2500;
      for (let k = 0; k < 400 && W.terrainHeight(x0, z0) <= 31; k++) { x0 += 37; z0 += 11; }
      P.flying = false; P.pos.set(x0 + 0.5, W.terrainHeight(x0, z0) + 1.02, z0 + 0.5); P.vel.set(0, 0, 0);
      await tenir(5);
      let ok = null;
      for (let r = 0; r < 60 && !ok; r++) for (let dx = -r; dx <= r && !ok; dx++) {
        const cx = x0 + dx, cz = z0 + r, h = W.terrainHeight(cx, cz);
        if (h <= 31) continue;
        let libre = true;
        for (let k = 0; k < 24 && libre; k++) for (let w = -3; w <= 3; w++) { const xx = cx + w, zz = cz - k; if (W.sommetColonne(xx, zz) > W.terrainHeight(xx, zz)) { libre = false; break; } }
        if (libre) ok = [cx, cz, h];
      }
      if (!ok) return { err: 'pas de champ dégagé', forme, enVol };
      P.pos.set(ok[0] + 0.5, ok[2] + 1.02, ok[1] + 0.5); P.vel.set(0, 0, 0); P.yaw = 0; P.pitch = 0;
      await tenir(8);
      nuage = trouver();
      const lp = vivantes();
      let ecartMax = -Infinity;
      for (const v of lp) {
        // ce qui la porte : le sol sous le feuillage (une feuille le traverse), ou l'eau
        const bx = Math.floor(v.x), bz = Math.floor(v.z); let y = W.sommetColonne(bx, bz);
        while (y > 0 && W.getBlock(bx, y, bz) === 6) y--;
        ecartMax = Math.max(ecartMax, v.y - Math.max(y + 1, 30.875));
      }
      // 4. LES PIXELS, VUS D'UNE CAMÉRA DE VOITURE (trois blocs du sol, cap à
      // l'horizon) : ceux que l'effet ajoute là où, sans lui, on voit le CIEL
      // (un pixel de la couleur du haut de sa colonne).
      const R = g.renderer, cam = g.camera.clone();
      cam.position.set(ok[0] + 0.5, ok[2] + 1 + 3, ok[1] + 0.5); cam.rotation.set(0, 0, 0); cam.updateMatrixWorld(true);
      const lire = () => { R.setRenderTarget(null); R.render(g.scene, cam); const gl = R.getContext(); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight; const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return { w, h, px }; };
      const garde = nuage.visible;
      nuage.visible = true; const A = lire();
      nuage.visible = false; const B = lire();
      nuage.visible = garde;
      let ciel = 0, ailleurs = 0;
      for (let yy = 0; yy < A.h; yy++) for (let xx = 0; xx < A.w; xx++) {
        const k = (yy * A.w + xx) * 4, t = ((A.h - 1) * A.w + xx) * 4;
        const d = Math.abs(A.px[k] - B.px[k]) + Math.abs(A.px[k + 1] - B.px[k + 1]) + Math.abs(A.px[k + 2] - B.px[k + 2]);
        if (d <= 12) continue;
        const dc = Math.abs(B.px[k] - B.px[t]) + Math.abs(B.px[k + 1] - B.px[t + 1]) + Math.abs(B.px[k + 2] - B.px[t + 2]);
        if (dc < 45) ciel++; else ailleurs++;
      }
      return { forme, enVol, auSol: { visible: nuage.visible, nb: lp.length, ecartMax: +ecartMax.toFixed(2) }, pixels: { ciel, ailleurs }, type: nuage.type, mois: new Date().getMonth() };
    });
module.exports = { mesurerSaison };

if (require.main === module) {
  const { Banc, souffler } = require('./banc.js');
  (async () => {
    const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
    await banc.ouvrir();
    try {
      await souffler();
      const page = await banc.jouerSeul('SondeSaisonCiel', { rr: 3, params: '&saison=' + (process.argv[2] || 'automne') });
      console.log(JSON.stringify(await mesurerSaison(page)));
      if (process.argv[3]) await page.screenshot({ path: process.argv[3] });
    } catch (e) { console.log('ÉCHEC', e.message); }
    finally { await banc.fermer(); process.exit(0); }
  })();
}
