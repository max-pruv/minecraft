// LA POLICE, DE BOUT EN BOUT, SUR UNE DALLE À SOI (v554). Une voiture, une
// bêtise PROVOQUÉE (`__patrouille.betise`, v233 : on provoque, on n'attend
// pas), un cercle à pleins gaz : la voiture de police apparaît derrière,
// sirène dans sa bande, gyrophares allumés ; à deux étoiles la moto ; on
// s'arrête : le policier descend, la voix dit la phrase, les étoiles tombent
// et la voiture de police se gare, montable.
//
//   cd tests && node sonde-police.cjs
//
// Exporte `passage(page)` : monte.js le lit tel quel (v400 — une copie de
// sonde finit par diverger du témoin).
const { Banc } = require('./banc.js');

async function passage(page) {
  return page.evaluate(async () => {
    const g = window.__game, P = g.player, am = g.animalManager, pat = window.__patrouille;
    const { BLOCK } = await import('./src/blocks.js');
    const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = { etapes: [] };
    if (!pat) return { err: 'pas de patrouille' };
    // la voix : on enregistre ce que le jeu demande de dire (v538)
    const dits = [];
    // `speechSynthesis` est un accesseur de Window : une simple affectation ne fait rien
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      cancel() {}, getVoices: () => [], speak(u) { dits.push({ texte: u.text, lang: u.lang }); } } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function (t) { this.text = t; } });
    if (window.__sons && window.__sons.regler) window.__sons.regler(true);   // le banc coupe le son
    // la sirène : on écoute la sortie (un témoin de son lit des échantillons, v268)
    const S = window.__sons;
    let ana = null;
    if (S && S.sortie) {
      const c = S.contexte(); ana = c.createAnalyser(); ana.fftSize = 4096; ana.smoothingTimeConstant = 0;
      S.sortie().connect(ana);
    }
    const bande = (f0, f1) => {
      if (!ana) return null;
      const d = new Float32Array(ana.frequencyBinCount); ana.getFloatFrequencyData(d);
      const hz = ana.context.sampleRate / ana.fftSize; let m = -Infinity;
      for (let i = Math.floor(f0 / hz); i <= Math.ceil(f1 / hz); i++) m = Math.max(m, d[i]);
      return +m.toFixed(1);
    };
    // une dalle à soi, loin de tout
    const x0 = 47000, z0 = 47000, D = 80; let y0 = 0;
    for (let d = -D; d <= D; d += 4) for (let w = -D; w <= D; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
    y0 += 4;
    for (let d = -D; d <= D; d++) for (let w = -D; w <= D; w++) {
      g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
      for (let h = 1; h <= 3; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w)) g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
    }
    for (const a of [...am.animals]) { am.scene.remove(a.mesh); am.animals.splice(am.animals.indexOf(a), 1); }
    pat.remiseAZero();
    P.flying = false; P.yaw = 0; P.pitch = 0; P.vel.set(0, 0, 0);
    P.pos.set(x0 + 0.5, y0 + 1.2, z0 + 20.5);
    await dodo(1500);
    const a = am.invoquer('voiture', P.pos.x, P.pos.z - 3, false, { flotte: 'amg-gt-black-series.glb' });
    a.yaw = Math.PI; await dodo(400);
    for (let i = 0; i < 6 && !(g.fun.montureConduite && g.fun.montureConduite()); i++) { document.getElementById('ride-btn').click(); await dodo(600); }
    out.auVolant = !!(g.fun.montureConduite && g.fun.montureConduite());
    if (!out.auVolant) return out;
    // un tour de dalle pour faire une piste, puis la bêtise
    P.touchMove.f = 0.8; P.touchMove.s = -1;
    await dodo(3000);
    pat.betise('voiture');
    const t0 = performance.now();
    let vu = null;
    while (performance.now() - t0 < 25000) {
      await dodo(250);
      const e = pat.etat();
      if (e.unites.length && !vu) vu = { t: Math.round(performance.now() - t0), ...e.unites[0] };
      if (vu && performance.now() - t0 > vu.t + 3000) break;
    }
    out.apparition = vu;
    out.etat1 = pat.etat();
    out.sireneEnMarche = S && S.etat ? S.etat().sirene : null;
    out.bandeSirene = bande(600, 1500);
    const unite = am.animals.find((x) => x.enService);
    out.eclats = unite ? unite.mesh.children.filter((o) => /^Eclat_/.test(o.name)).length : 0;
    out.eclatsVisibles = unite ? unite.mesh.children.filter((o) => /^Eclat_/.test(o.name) && o.visible).length : 0;
    // deux étoiles : la moto
    pat.betise('pieton'); pat.betise('voiture');
    const t1 = performance.now();
    while (performance.now() - t1 < 15000 && !pat.etat().unites.some((u) => u.type === 'moto')) await dodo(300);
    out.moto = pat.etat().unites.find((u) => u.type === 'moto') || null;
    // on s'arrête
    P.touchMove.f = 0; P.touchMove.s = 0;
    const t2 = performance.now();
    let ctrl = null;
    while (performance.now() - t2 < 40000) {
      await dodo(300);
      const e = pat.etat();
      out.etapes.push({ t: Math.round(performance.now() - t2), p: [Math.round(P.pos.x), Math.round(P.pos.z)], v: +(P.vitesseVoiture || 0).toFixed(1), pts: Math.round(e.points),
        u: e.unites.map((u) => [u.type[0], Math.round(u.x), Math.round(u.z), +u.v.toFixed(1), +u.ecart.toFixed(1)]), c: e.controle && [e.controle.etape, Math.round(e.controle.x), Math.round(e.controle.z)] });
      if (e.controle && !ctrl) ctrl = { t: Math.round(performance.now() - t2), ...e.controle };
      if (ctrl && !e.controle) break;
    }
    out.controle = ctrl;
    out.dits = dits; out.sonActif = window.__sons.actif();
    out.etat2 = pat.etat();
    out.gareeMontable = am.animals.filter((x) => x.mesh.userData.flotte === 'police-car.glb' && !x.enService && !x.menee).length;
    return out;
  });
}

if (require.main === module) (async () => {
  const banc = new Banc();
  await banc.ouvrir();
  try {
    const page = await banc.jouerSeul('Policia', { pret: true });
    page.on('pageerror', (e) => console.log('ERREUR', e.message));
    console.log(JSON.stringify(await passage(page), null, 1));
  } finally { await banc.fermer(); process.exit(0); }
})();
module.exports = { passage };
