// LES TRACES DE PNEUS (v434) — la mesure du témoin de `monte.js`, partagée
// avec la sonde (`sonde-traces.cjs`) : une copie de sonde finit par diverger
// du témoin (v400).
//
// ON SE PLACE SOI-MÊME (v279) : une piste de pierre posée dans le ciel, loin
// de tout, une voiture invoquée dessus. Puis, dans l'ordre :
//   1. pleins gaz en ligne droite : les pneus tiennent, AUCUNE trace ;
//   2. une dérive tenue (le champ du contrat, figé comme dans le témoin du
//      crissement, v401) : des traces, posées un centième au-dessus de la
//      pierre, dans UN seul maillage ;
//   3. le frein à main tiré en roulant : des traces de plus ;
//   4. les CLÉS de programme avant et après (v363) : aucune neuve ;
//   5. l'effacement et la borne, en temps de jeu, par les fonctions du module.
// Sur l'ancien code le module n'existe pas : la mesure le DIT (v214) au lieu
// de s'effondrer.
async function mesurerTraces() {
  const g = window.__game;
  const { BLOCK } = await import('./src/blocks.js');
  let T;
  try { T = await import('./src/traces.js'); } catch (e) { T = null; }
  const tenir = (n) => new Promise((fin) => {
    let cumul = 0, prec = performance.now();
    const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
    requestAnimationFrame(pas);
  });
  const P = g.player;
  const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
  const cles = () => new Set(g.renderer.info.programs.map((q) => q.cacheKey));
  const traces = () => { const out = []; g.scene.traverse((o) => { if (o.name === 'traces-pneus') out.push(o); }); return out; };
  // ce que le sol porte, sans le module : les carrés sombres couchés au-dessus
  // de la piste, quel que soit leur maillage (l'ancien code n'en a aucun)
  // en rendu logiciel les traces ne se DESSINENT pas (comme les ombres) : le
  // témoin force le dessin, il juge ce que la tablette voit
  if (T && T.reglageTraces) T.reglageTraces.dessin = true;
  const etat = () => (T ? T.etatTraces() : { vivantes: 0, poses: 0, ys: [], visible: false });

  const x0 = 31200, z0 = 30600, y0 = 120;
  const poser = (x, z) => { if (g.world.getBlock(x, y0, z) !== BLOCK.STONE) g.world.setBlock(x, y0, z, BLOCK.STONE); };
  for (let x = x0 - 6; x <= x0 + 150; x++) for (let z = z0 - 24; z <= z0 + 24; z++) poser(x, z);

  P.keys.clear();
  for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
  P.pilote = null; P.avionEnVol = false; P.avionEtat = undefined; P.vitesseAvion = undefined;
  P.flying = false; P.gaz = null; P.pitch = 0; P.freinMain = false;
  delete P.choc; delete P.derive;
  P.yaw = -Math.PI / 2;
  P.pos.set(x0, y0 + 1.01, z0 + 0.5); P.vel.set(0, 0, 0);
  for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
  g.animalManager.animals.length = 0;
  if (T && T.effacerTraces) T.effacerTraces();
  await tenir(0.6);
  const voiture = g.animalManager.invoquer('voiture', x0 + 3, z0);
  if (!voiture) return { err: 'aucune voiture posée' };
  await tenir(0.5);
  for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
  if (!auVolant()) return { err: 'on n\'est pas au volant' };
  const a = g.fun.montureConduite();
  const t0 = performance.now();
  while (!(a.mesh.userData.roues && a.mesh.userData.roues.length >= 4) && performance.now() - t0 < 20000) await tenir(0.3);
  P.yaw = -Math.PI / 2; P.pos.set(x0, y0 + 1.01, z0 + 0.5); P.vel.set(0, 0, 0);
  await tenir(0.8);
  const clesAvant = cles();
  // LE CRISSEMENT SE LIT SUR LA SORTIE DU JEU (v268), dans la bande des pneus
  // (2,5 à 3,4 kHz), jamais sur un drapeau
  const ctx = window.__sons && window.__sons.contexte();
  const sortie = window.__sons && window.__sons.sortie();
  let bande = () => null;
  if (ctx && sortie) {
    const an = ctx.createAnalyser(); an.fftSize = 2048; sortie.connect(an);
    const freq = new Float32Array(an.frequencyBinCount), hz = ctx.sampleRate / an.fftSize;
    bande = () => { an.getFloatFrequencyData(freq); let s = 0, n = 0; for (let i = Math.floor(2500 / hz); i <= Math.ceil(3400 / hz); i++) { s += Math.pow(10, freq[i] / 10); n++; } return s / n; };
  }
  const moy = (t) => { const u = t.filter((x) => x != null && isFinite(x)); return u.length ? u.reduce((a, b) => a + b, 0) / u.length : null; };

  // 1. EN LIGNE DROITE, LES PNEUS TIENNENT
  P.gaz = 1;
  const d0 = P.pos.x;
  // `poses` compte depuis l'ouverture de la page : un témoin d'avant a pu en
  // poser (au portail, 54 avant la ligne droite) — on compte à partir d'ici
  const posesDepart = etat().poses;
  const tl = performance.now();
  const bandesDroit = [];
  while (P.pos.x < x0 + 30 && performance.now() - tl < 20000) { await tenir(0.1); if (P.pos.x > x0 + 15) bandesDroit.push(bande()); }
  const droit = { posees: etat().poses - posesDepart, parcouru: +(P.pos.x - d0).toFixed(1), v: +(P.vitesseVoiture || 0).toFixed(1) };

  // 2. UNE DÉRIVE TENUE : la physique la RÉÉCRIT à chaque image (v401), on la
  // fige par une propriété qui ignore ce qu'on lui écrit
  Object.defineProperty(P, 'derive', { configurable: true, enumerable: true, get: () => 0.5, set: () => {} });
  const avantDerive = etat().poses;
  const td = performance.now(); const xd = P.pos.x;
  while (P.pos.x < xd + 12 && performance.now() - td < 20000) await tenir(0.1);
  delete P.derive; P.derive = 0;
  await tenir(0.2);
  const eDerive = etat();
  const derive = { posees: eDerive.poses - avantDerive, parcouru: +(P.pos.x - xd).toFixed(1),
    ys: eDerive.ys.map((y) => +y.toFixed(3)), maillages: traces().length, visible: eDerive.visible };

  // 3. LE FREIN À MAIN TIRÉ EN ROULANT
  const avantFrein = etat().poses;
  const v0 = +(P.vitesseVoiture || 0).toFixed(1);
  P.freinMain = true;
  const tf = performance.now();
  let tire = false, images = 0; const diag = [], bandesFrein = []; let deriveFrein = 0;
  while (Math.abs(P.vitesseVoiture || 0) > 2.5 && performance.now() - tf < 8000) {
    await tenir(0.1); images++;
    tire = tire || !!P.freinMainTire;
    if (images >= 3 && Math.abs(P.vitesseVoiture || 0) > 4) { bandesFrein.push(bande()); deriveFrein = Math.max(deriveFrein, Math.abs(P.derive || 0)); }
    if (images < 6 && T) diag.push([+(P.vitesseVoiture||0).toFixed(1), !!P.enLair, +T.glissade(P.derive, P.freinMainTire, P.vitesseVoiture).toFixed(2), etat().poses]);
  }
  P.freinMain = false; P.gaz = null;
  await tenir(0.4);
  const bD = moy(bandesDroit), bF = moy(bandesFrein);
  const crisse = { droit: bD, frein: bF, rapport: bD && bF ? +(bF / bD).toFixed(2) : null, n: bandesFrein.length, deriveMax: +deriveFrein.toFixed(3) };
  const frein = { posees: etat().poses - avantFrein, tire, v0, images, diag, parcouru: +(P.pos.x - xd).toFixed(1) };

  // 4. AUCUN PROGRAMME NEUF
  const neuves = [...cles()].filter((k) => !clesAvant.has(k)).map((k) => k.slice(0, 80));

  // 5. L'EFFACEMENT ET LA BORNE, en temps de jeu, par le module lui-même
  let fondu = null, borne = null;
  if (T) {
    // six cents pas d'une roue fictive qui glisse, en zigzag sur la piste
    const faux = { userData: {}, rotation: { y: 0 }, position: { x: x0, z: z0 } };
    const suivi = {};
    for (let n = 0; n < 700; n++) {
      const k = n % 240; faux.position.x = x0 + 4 + (k < 120 ? k : 240 - k) * 0.5;
      T.marquerRoues(faux, suivi, 1, y0 + 1);
    }
    const e = etat();
    borne = { vivantes: e.vivantes, max: T.MAX_TRACES, maillages: traces().length };
    const vivAvant = etat().vivantes;
    // l'horloge du module avance d'un quart de seconde au plus par appel :
    // on la fait tourner comme la boucle du jeu le ferait
    const vieillir = (s) => { for (let t = 0; t < s; t += 0.2) T.avancerTraces(0.2); };
    vieillir(T.VIE_TRACE - T.FONDU_TRACE / 2);
    const mi = etat();
    vieillir(T.FONDU_TRACE);
    const fin = etat();
    fondu = { vivAvant, alphaMi: mi.alphaMin, vivMi: mi.vivantes, vivFin: fin.vivantes, visibleFin: fin.visible };
    T.effacerTraces();
    T.reglageTraces.dessin = null;
  }
  // on descend : la voiture reste, ses traces aussi — on ne s'en sert plus
  for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
  return { module: !!T, y0, droit, derive, frein, crisse, neuves, fondu, borne };
}

if (typeof module !== 'undefined') module.exports = { mesurerTraces };
