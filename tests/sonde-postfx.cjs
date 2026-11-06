// LA SONDE DU POST-TRAITEMENT (v586) — lue par `parishd.js`, donc pas isolée.
//
// Quatre questions, une fonction chacune, sur une page du banc ouverte avec
// `?postfx=1&ombres=1&hd=2` :
//
// - `clesNeuves(page, avant)` : les clés de programme nées depuis `avant`
//   (v363 : on lit les CLÉS, jamais leur compte). Sous le post-traitement
//   TOUT programme se compile pour la cible HDR ; une chauffe faite vers
//   l'écran rendrait des dizaines de clés neuves à la première image.
// - `bloomLaNuit(page)` : la même image développée avec et sans bloom
//   (`regler({ bloom })`, le reste de la chaîne identique) ; le bloom ne fait
//   qu'AJOUTER de la lumière, et il l'ajoute autour de ce qui émet. On compte
//   les pixels éclaircis et les pixels assombris.
// - `pariteDuJour(page)` : la même image rendue par l'ancien chemin — droit
//   sur l'écran, les matériaux portant alors ACES et l'exposition du jeu — et
//   par le post-traitement ; les luminances moyennes doivent se tenir. À jouer
//   EN DERNIER : rendre sur l'écran compile les variantes d'écran des
//   programmes, c'est-à-dire des clés neuves.
// - `lirePixels(page, zones)` : des moyennes RGB sur l'écran, l'écran reposé
//   d'abord (la cible HDR reste posée entre deux images, v586).
const lumi = (r, v, b) => 0.2126 * r + 0.7152 * v + 0.0722 * b;

async function clesNeuves(page, avant) {
  const apres = await page.evaluate(() => [...new Set(__game.renderer.info.programs.map((q) => q.cacheKey))]);
  return apres.filter((k) => !avant.includes(k));
}
const cles = (page) => page.evaluate(() => [...new Set(__game.renderer.info.programs.map((q) => q.cacheKey))]);

// Lit l'écran entier (un pixel sur `pas`) pour chaque mode demandé, DANS UNE
// SEULE tâche de la page : entre deux images la rue bouge, et deux lectures à
// deux images comparées donneraient le mouvement pour un réglage. Le monde se
// dessine une fois dans la cible ; `postfx` le développe tel quel,
// `sansBloom` le redéveloppe bloom à zéro (sans redessiner le monde),
// `ancien` le rend droit sur l'écran par l'ancien chemin.
const lireEcran = `(pas, modes) => {
  const g = __game; const gl = g.renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const buf = new Uint8Array(w * h * 4);
  const lire = () => { g.renderer.setRenderTarget(null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const out = []; for (let y = 0; y < h; y += pas) for (let x = 0; x < w; x += pas) { const i = (y * w + x) * 4; out.push(buf[i], buf[i + 1], buf[i + 2]); } return out; };
  const res = {};
  g.rendreLImage();
  for (const mode of modes) {
    if (mode === 'postfx') { g.postfx.rendre(g.scene, g.camera, g.etatLumiere(), { sansScene: true }); res[mode] = lire(); }
    else if (mode === 'sansBloom') { g.postfx.regler({ bloom: 0 }); g.postfx.rendre(g.scene, g.camera, g.etatLumiere(), { sansScene: true }); g.postfx.regler({ bloom: 1 }); res[mode] = lire(); }
    else if (mode === 'ancien') { g.renderer.setRenderTarget(null); g.renderer.render(g.scene, g.camera); res[mode] = lire(); }
  }
  g.renderer.setRenderTarget(g.postfx.cibleDuRendu());
  return { w, h, pas, ...res };
}`;

async function bloomLaNuit(page, pas = 2) {
  const r = await page.evaluate(`(${lireEcran})(${pas}, ['postfx', 'sansBloom'])`);
  const avec = r.postfx, sans = r.sansBloom;
  let eclaircis = 0, assombris = 0, somme = 0, n = avec.length / 3;
  for (let i = 0; i < avec.length; i += 3) {
    const d = lumi(avec[i], avec[i + 1], avec[i + 2]) - lumi(sans[i], sans[i + 1], sans[i + 2]);
    if (d > 6) eclaircis++; else if (d < -6) assombris++;
    somme += d;
  }
  return { eclaircis, assombris, moyenne: somme / n, pixels: n, part: eclaircis / n };
}

async function pariteDuJour(page, pas = 2) {
  const r = await page.evaluate(`(${lireEcran})(${pas}, ['postfx', 'ancien'])`);
  const neuf = r.postfx, ancien = r.ancien;
  let a = 0, b = 0, n = neuf.length / 3;
  for (let i = 0; i < neuf.length; i += 3) {
    a += lumi(neuf[i], neuf[i + 1], neuf[i + 2]);
    b += lumi(ancien[i], ancien[i + 1], ancien[i + 2]);
  }
  return { postfx: a / n, ancien: b / n, rapport: (a / n) / Math.max(1, b / n) };
}

async function lirePixels(page, zones) {
  return page.evaluate((zones) => {
    const g = __game; const gl = g.renderer.getContext();
    g.renderer.setRenderTarget(null); g.rendreLImage(); g.renderer.setRenderTarget(null);
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const b = new Uint8Array(4 * 16); const out = [];
    for (const [fx, fy] of zones) {
      gl.readPixels(Math.floor(w * fx), Math.floor(h * (1 - fy)), 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, b);
      let r = 0, v = 0, bl = 0; for (let i = 0; i < 16; i++) { r += b[i * 4]; v += b[i * 4 + 1]; bl += b[i * 4 + 2]; }
      out.push([Math.round(r / 16), Math.round(v / 16), Math.round(bl / 16)]);
    }
    g.renderer.setRenderTarget(g.postfx.cibleDuRendu());
    return out;
  }, zones);
}

module.exports = { cles, clesNeuves, bloomLaNuit, pariteDuJour, lirePixels, lumi };
