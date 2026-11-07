// Le dôme à midi (0,25), angle par angle : la lecture exacte du témoin « le
// ciel est une voûte » (zénith en haut de l'écran, bas à 15° sur l'horizon,
// caméra du jeu posée comme lui), puis la luminance du ciel à plusieurs
// élévations, vers le soleil, à 90° et à l'opposé — pour savoir si c'est la
// voûte qui a changé ou l'auréole autour de l'astre. Isolée : aucune suite ne
// l'importe. `node tests/sonde-ciel.cjs [racine] [port]` — la racine d'un
// autre arbre (`git worktree`) pour la double mesure (v195).
// Mesuré (vNEXT contre v585, midi, soleil à 70°) : haut de l'écran 176 contre
// 156 (∠soleil 20°) ; 60° à l'opposé 164 contre 162 ; 15° à l'opposé 190
// contre 188. C'est l'auréole qui change, pas la voûte.
const ROOT = process.argv[2] || require('path').join(__dirname, '..');
const PORT = +(process.argv[3] || 8125);
const { Banc, dormir } = require(ROOT + '/tests/banc.js');
(async () => {
  console.log("sonde-ciel: depart", ROOT, PORT);
  const banc = new Banc({ portJeu: PORT, portPairs: PORT + 1000 });
  await banc.ouvrir();
  try {
    const p = await banc.jouerSeul('Cieline', { rr: 4, ombres: 1 });
    await p.waitForFunction(() => __game.renderer.info.render.frame > 5, null, { timeout: 60000 }).catch(() => {});
    await p.evaluate(() => window.__setDayTime(0.25));
    await p.waitForFunction(() => !__game.etatLumiere || (__game.etatLumiere().jour > 0.95 && __game.etatLumiere().soleil.y > 0.5), null, { timeout: 30000 }).catch(() => {});
    await dormir(6000);
    const r = await p.evaluate(() => {
      const g = __game, r = g.renderer, cam = g.camera, gl = r.getContext();
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      const pix = (sx, sy) => { const b = new Uint8Array(4 * 25); gl.readPixels(sx - 2, H - 1 - (sy + 2), 5, 5, gl.RGBA, gl.UNSIGNED_BYTE, b); let l = 0, rr = 0, gg = 0, bb = 0; for (let i = 0; i < 25; i++) { rr += b[i * 4]; gg += b[i * 4 + 1]; bb += b[i * 4 + 2]; l += 0.2126 * b[i * 4] + 0.7152 * b[i * 4 + 1] + 0.0722 * b[i * 4 + 2]; } return { l: +(l / 25).toFixed(1), rgb: [rr, gg, bb].map((v) => Math.round(v / 25)) }; };
      const x0 = Math.floor(g.player.pos.x), z0 = Math.floor(g.player.pos.z);
      const sol = g.world.sommetColonne ? g.world.sommetColonne(x0, z0) : g.player.pos.y;
      r.setRenderTarget(null);
      cam.position.set(x0 + 0.5, sol + 30, z0 + 0.5); cam.lookAt(x0 + 0.5, sol + 40, z0 + 8); cam.updateMatrixWorld(true);
      r.render(g.scene, cam);
      const temoin = { zenith: pix(Math.round(W / 2), 6), bas: pix(Math.round(W / 2), H - Math.round(H / 6)) };
      const s = g.etatLumiere ? g.etatLumiere().soleil.clone().normalize() : (() => { const dl = g.scene.getObjectByProperty('isDirectionalLight', true); return dl.position.clone().sub(g.player.pos).normalize(); })();
      const azS = Math.atan2(s.x, s.z);
      const lignes = [];
      for (const el of [88, 75, 60, 45, 30, 15, 6]) for (const [nom, dAz] of [['soleil', 0], ['90', Math.PI / 2], ['oppose', Math.PI]]) {
        const az = azS + dAz, e = el * Math.PI / 180;
        const d = { x: Math.sin(az) * Math.cos(e), y: Math.sin(e), z: Math.cos(az) * Math.cos(e) };
        cam.position.set(x0 + 0.5, sol + 30, z0 + 0.5); cam.lookAt(cam.position.x + d.x, cam.position.y + d.y, cam.position.z + d.z); cam.updateMatrixWorld(true);
        r.render(g.scene, cam);
        const c = pix(Math.round(W / 2), Math.round(H / 2));
        lignes.push({ el, az: nom, versSoleilDeg: +(Math.acos(Math.max(-1, Math.min(1, d.x * s.x + d.y * s.y + d.z * s.z))) * 180 / Math.PI).toFixed(0), l: c.l, rgb: c.rgb });
      }
      return { heure: 0.25, soleil: [s.x, s.y, s.z].map((v) => +v.toFixed(2)), W, H, temoin, lignes };
    });
    console.log('TEMOIN', JSON.stringify(r.temoin), 'soleil', JSON.stringify(r.soleil), `${r.W}x${r.H}`);
    for (const l of r.lignes) console.log(`el ${String(l.el).padStart(2)}  ${l.az.padEnd(6)} ∠soleil ${String(l.versSoleilDeg).padStart(3)}°  L ${l.l}  rgb ${l.rgb.join(',')}`);
    await p.close();
  } catch (e) { console.error('ERREUR', e && (e.stack || e.message || e)); }
  finally { await banc.fermer().catch(() => {}); process.exit(0); }
})().catch((e) => { console.error(e); process.exit(1); });
