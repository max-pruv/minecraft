// SONDE (v553) : le « trou de ciel au bord des morceaux maillés, en vol »
// (revue d'écran v532, relevé n° 19). On vole à cent blocs au-dessus de la
// campagne, puis on rend UNE image avec le dôme du ciel caché et un fond
// MAGENTA : tout pixel magenta sous l'horizon est un trou (rien n'y est
// dessiné). Pour chacun, un rayon depuis la caméra jusqu'au relief dit OÙ il
// tombe : dans un morceau maillé ou non, et à combien de blocs du bord du
// disque maillé. Isolée : aucune suite ne l'importe.
const { Banc } = require('./banc.js');
const SITE = (process.env.SITE || '1200,-900').split(',').map(Number);
(async () => {
  const banc = new Banc({ portJeu: 8473, portPairs: 9473 }); await banc.ouvrir();
  try {
    for (const bras of (process.env.BRAS || 'moyen').split(',')) {
      const params = (bras === 'haut' ? '&palier=haut' : '') + (process.env.PARAMS || '');
      const p = await banc.jouerSeul('Trou' + Math.random().toString(36).slice(2, 6), { rr: 12, params });
      const r = await p.evaluate(async ([sx, sz, vol, pitch]) => {
        const g = window.__game, W = g.world;
        const THREE = await import('three');
        const rc = new THREE.Raycaster(); rc.layers.enableAll();
        const premiers = {};
        const att = (ms) => new Promise((f) => setTimeout(f, ms));
        const sol = W.terrainHeight(sx, sz);
        g.player.pos.set(sx, sol + 100, sz); g.player.vel.set(0, 0, 0);
        g.player.flying = true; g.player.yaw = 0; g.player.pitch = pitch;
        // en vol : on avance en temps réel vers −z (cap 0) pendant la mesure
        const releves = [];
        const t0 = performance.now();
        let dernier = t0;
        await new Promise((fin) => {
          const tic = () => {
            const now = performance.now();
            g.player.pos.z -= vol * (now - dernier) / 1000; dernier = now;
            g.player.pos.y = W.terrainHeight(g.player.pos.x, g.player.pos.z) + 100;
            g.player.pitch = pitch;
            if (now - t0 > 25000) return fin();
            requestAnimationFrame(tic);
          };
          requestAnimationFrame(tic);
        });
        // une image, ciel caché, fond magenta
        const caches = [];
        g.scene.traverse((o) => { if (o.renderOrder <= -10 && o.visible) { o.visible = false; caches.push(o); } });
        const bg = g.scene.background.clone();
        g.scene.background.setRGB(1, 0, 1);
        const cam = g.camera;
        g.renderer.render(g.scene, cam);
        const gl = g.renderer.getContext();
        const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
        const px = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        g.scene.background.copy(bg);
        for (const o of caches) o.visible = true;
        const T = window.THREE || null;
        const CH = 16, cles = new Set();
        const meshed = (cx, cz) => g.chunkMeshes.has(cx + ',' + cz) || g.chunkMeshes.has(`${cx},${cz}`);
        // clé réelle : on lit une clé existante pour en déduire le format
        const uneCle = g.chunkMeshes.keys().next().value;
        const estMaille = (x, z) => {
          const cx = Math.floor(x / CH), cz = Math.floor(z / CH);
          return g.chunkMeshes.has(typeof uneCle === 'number' ? null : cx + ',' + cz);
        };
        const ray = new cam.position.constructor();
        const inv = cam.projectionMatrixInverse, mw = cam.matrixWorld;
        let trous = 0, ciel = 0, total = 0;
        const parBande = {}, exemples = [];
        let dansMaille = 0, horsMaille = 0, perdu = 0;
        const H = g.horizon, dessinees = new Set();
        for (let n = 0; n < H.geo.drawRange.count; n += 6) dessinees.add(H.geo.index.array[n]);
        const raisons = {};
        for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) {
          const o = (y * w + x) * 4;
          total++;
          if (!(px[o] > 200 && px[o + 1] < 60 && px[o + 2] > 200)) continue;
          // rayon
          ray.set((x + 0.5) / w * 2 - 1, (y + 0.5) / h * 2 - 1, 0.5).applyMatrix4(inv).applyMatrix4(mw).sub(cam.position).normalize();
          if (ray.y > -0.01) { ciel++; continue; }
          let hit = null;
          for (let d = 1; d < 3000; d += 1) {
            const qx = cam.position.x + ray.x * d, qy = cam.position.y + ray.y * d, qz = cam.position.z + ray.z * d;
            if (qy < W.terrainHeight(qx, qz) + 1) { hit = [qx, qz, d]; break; }
          }
          if (!hit) { perdu++; continue; }
          trous++;
          const m = estMaille(hit[0], hit[1]);
          if (m) dansMaille++; else horsMaille++;
          // distance (en blocs, Chebyshev par morceau) au bord du disque maillé
          const cx = Math.floor(hit[0] / CH), cz = Math.floor(hit[1] / CH);
          let bord = 99;
          for (let r = 0; r <= 4 && bord === 99; r++) {
            for (let a = -r; a <= r; a++) for (const [ax, az] of [[a, -r], [a, r], [-r, a], [r, a]]) {
              if (g.chunkMeshes.has((cx + ax) + ',' + (cz + az)) !== m) bord = Math.min(bord, r);
            }
          }
          const ix = Math.floor(hit[0] / H.pas) - H.ox, iz = Math.floor(hit[1] / H.pas) - H.oz;
          const a = ix * H.N + iz;
          const raison = ix < 0 || iz < 0 || ix >= H.CASES || iz >= H.CASES ? 'hors-grille' : dessinees.has(a) ? 'case-dessinee' : (m ? 'maille' : 'case-omise');
          raisons[raison] = (raisons[raison] || 0) + 1;
          if (raison === 'case-dessinee') {
            rc.setFromCamera(new THREE.Vector2((x + 0.5) / w * 2 - 1, (y + 0.5) / h * 2 - 1), cam);
            const hs = rc.intersectObjects(g.scene.children, true).filter((q) => q.object.visible !== false);
            const q = hs[0];
            const nom = q ? (q.object.name || q.object.type) + (q.object.material && q.object.material.transparent ? '(transp)' : '') + '@' + Math.round(q.distance) : 'rien';
            const k2 = nom.replace(/@\d+/, '');
            premiers[k2] = (premiers[k2] || 0) + 1;
            // le long du rayon : où passe-t-il SOUS le sol voxel d'un morceau maillé ?
            let sous = null;
            for (let d = 1; d < hit[2] + 2; d += 0.5) {
              const qx = cam.position.x + ray.x * d, qy = cam.position.y + ray.y * d, qz = cam.position.z + ray.z * d;
              const ck = Math.floor(qx / CH) + ',' + Math.floor(qz / CH);
              if (g.chunkMeshes.has(ck) && qy < W.terrainHeight(qx, qz) + 1) {
                const e = g.chunkMeshes.get(ck);
                const desc = {};
                for (const k of ['solid', 'water', 'sol', 'plat', 'facades', 'arbresLoin']) if (e[k]) desc[k] = (e[k].visible ? 'v' : 'c') + (e[k].parent ? '' : '-orphelin') + ':' + (e[k].geometry?.attributes?.position?.count || 0);
                sous = { ck, d: Math.round(d), y: +qy.toFixed(1), ter: W.terrainHeight(qx, qz), desc, cles: Object.keys(e).join('|').slice(0, 200) };
                break;
              }
            }
            // le long du rayon : la surface de la grille fine, case par case
            const P = H.geo.attributes.position.array;
            const yh = (qx, qz) => {
              const fx = qx / H.pas - H.ox, fz = qz / H.pas - H.oz;
              const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz;
              const a = ix * H.N + iz, b = a + 1, c = a + H.N, d2 = c + 1;
              const ya = P[a * 3 + 1], yb = P[b * 3 + 1], yc = P[c * 3 + 1], yd = P[d2 * 3 + 1];
              // triangles (a,b,c) et (b,d,c) : a=(0,0) b=(0,1) c=(1,0) d=(1,1) en (u,v)
              const y = u + v <= 1 ? ya + (yc - ya) * u + (yb - ya) * v : yd + (yb - yd) * (1 - u) + (yc - yd) * (1 - v);
              return { y, a, dess: dessinees.has(a), coins: [ya, yb, yc, yd].map((t) => +t.toFixed(1)), xs: [P[a * 3], P[a * 3 + 2], P[d2 * 3], P[d2 * 3 + 2]] };
            };
            let croise = null;
            for (let d = 1; d < hit[2] + 2; d += 0.25) {
              const qx = cam.position.x + ray.x * d, qy = cam.position.y + ray.y * d, qz = cam.position.z + ray.z * d;
              const s2 = yh(qx, qz);
              if (qy < s2.y) { croise = { d, qx: +qx.toFixed(1), qz: +qz.toFixed(1), qy: +qy.toFixed(1), ...s2, ck: Math.floor(qx / CH) + ',' + Math.floor(qz / CH), m: g.chunkMeshes.has(Math.floor(qx / CH) + ',' + Math.floor(qz / CH)) }; break; }
            }
            if (exemples.length < 4) exemples.push({ d: Math.round(hit[2]), croise });
          }
          if (false) exemples.push({ yCase: +H.geo.attributes.position.array[a * 3 + 1].toFixed(1), ter: W.terrainHeight(hit[0], hit[1]), x: Math.round(hit[0]), z: Math.round(hit[1]) });
          const k = (m ? 'M' : 'n') + bord;
          parBande[k] = (parBande[k] || 0) + 1;
        }
        // le coût de la découpe, arbres armés puis désarmés (même page, même lieu)
        const dess = (cx, cz) => g.chunkMeshes.has(cx + ',' + cz);
        const chrono = (arm) => {
          const avant = H.arbres; H.arbres = arm;
          const t = performance.now();
          for (let k = 0; k < 10; k++) H.majDecoupe(dess, g.player.pos.x, g.player.pos.z, 0, -1);
          const ms = (performance.now() - t) / 10;
          H.arbres = avant; H.majDecoupe(dess, g.player.pos.x, g.player.pos.z, 0, -1);
          return +ms.toFixed(2);
        };
        const decoupeMs = { avec: chrono(true), sans: chrono(false), avec2: chrono(true), sans2: chrono(false) };
        return { decoupeMs, glisse: [g.horizon.ox - g.horizon.oxDecoupe, g.horizon.oz - g.horizon.ozDecoupe], premiers, fog: [g.scene.fog.near, g.scene.fog.far], cam: cam.position.toArray().map(Math.round), raisons, sol, cle: uneCle, w, h, total, trous, ciel, perdu, dansMaille, horsMaille, parBande, exemples,
          morceaux: g.chunkMeshes.size, horizon: g.horizon.etat(), pos: g.player.pos.toArray().map(Math.round) };
      }, [SITE[0], SITE[1], Number(process.env.VOL || 60), Number(process.env.PITCH || -0.45)]);
      await p.close();
      console.log(bras, JSON.stringify(r));
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
