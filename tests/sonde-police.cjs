// LA POLICE ET LA MOTO, DE BOUT EN BOUT, SUR UNE DALLE À SOI (v554).
//
//  · `passage(page)` — la police. Une voiture, une VRAIE bêtise : on fonce
//    dans une voiture garée devant soi (le choc que la physique publie, pas un
//    appel). La voiture de police apparaît derrière, la sirène sonne dans sa
//    bande, les gyrophares alternent, la pilule montre une étoile ; une
//    seconde bêtise (provoquée, v233) fait venir la moto ; on s'arrête : le
//    policier descend, la voix dit la phrase de la bonne cause, les étoiles
//    tombent et la voiture de police se gare, montable.
//  · `passageMoto(page)` — on enfourche une moto : deux roues, la carrure
//    étroite, le son d'un bicylindre ; dans un virage elle se COUCHE VERS
//    L'INTÉRIEUR (lu dans la matrice contre l'accélération mesurée sur la
//    trajectoire) ; on en descend d'un pas de côté.
//
//   cd tests && node sonde-police.cjs
//
// monte.js lit ces deux fonctions telles quelles (v400 — une copie de sonde
// finit par diverger du témoin).
const { Banc } = require('./banc.js');

// une dalle de pierre à soi, loin de tout, et le vide des bêtes
async function dalle(page, x0, z0, D) {
  return page.evaluate(async ([x0, z0, D]) => {
    const g = window.__game, { BLOCK } = await import('./src/blocks.js');
    let y0 = 0;
    for (let d = -D; d <= D; d += 4) for (let w = -D; w <= D; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
    y0 += 4;
    for (let d = -D; d <= D; d++) for (let w = -D; w <= D; w++) {
      g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
      for (let h = 1; h <= 3; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w)) g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
    }
    const am = g.animalManager;
    for (const a of [...am.animals]) { am.scene.remove(a.mesh); am.animals.splice(am.animals.indexOf(a), 1); }
    return y0;
  }, [x0, z0, D]);
}

async function passage(page) {
  const x0 = 47000, z0 = 47000;
  const y0 = await dalle(page, x0, z0, 80);
  return page.evaluate(async ([x0, z0, y0]) => {
    const g = window.__game, P = g.player, am = g.animalManager, pat = window.__patrouille;
    const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    if (!pat) return { err: 'pas de patrouille (window.__patrouille)' };
    // la règle pure, lue dans la page
    const R = await import('./src/police.js');
    const pist = new R.Piste(); pist.ajouter(0, 0, 0); pist.ajouter(10, 0, 0); const saut = pist.ajouter(100, 0, 0);
    let e0 = { points: 0, derniere: null }; e0 = R.ajouterBetise(e0, 'voiture', 0);
    const phrases = {};
    for (const k of ['voiture', 'pieton', 'mur', 'mobilier', 'police']) for (const l of ['fr', 'en']) phrases[`${k}.${l}`] = R.phrasePolice(k, l).texte;
    out.regle = {
      etoiles: [0, 29, 30, 119, 120, 240, 999].map(R.etoiles),
      arretAuPlancher: R.vitessePoursuite(30, R.ECART * R.PLANCHER - 0.01, 0, 0.05),
      freineSansBondir: R.vitessePoursuite(30, 40, 0, 0.05),
      saut,
      oubli: { vu: R.oublier(e0, 30, 1, true).points, pasVu: R.oublier(e0, 30, 1, false).points, tot: R.oublier(e0, 2, 1, false).points },
      phrasesDistinctes: new Set(Object.values(phrases)).size,
      phrasesQuiDisentQuoiFaire: Object.entries(phrases).filter(([k, t]) => (k.endsWith('fr') ? /Bonne route/ : /nice trip/).test(t)).length,
      emoji: Object.values(phrases).some((t) => /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)),
    };
    // la voix : on enregistre ce que le jeu demande de dire (v538) —
    // `speechSynthesis` est un accesseur de Window : une affectation ne fait rien
    const dits = [];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      cancel() {}, getVoices: () => [], speak(u) { dits.push({ texte: u.text, lang: u.lang }); } } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function (t) { this.text = t; } });
    // la sirène : on écoute la SORTIE (un témoin de son lit des échantillons, v268)
    const S = window.__sons;
    if (S.regler) S.regler(true);
    const ctx = S.contexte(); const ana = ctx.createAnalyser(); ana.fftSize = 4096; ana.smoothingTimeConstant = 0;
    S.sortie().connect(ana);
    const bande = async (s, f0, f1) => {
      let m = -Infinity; const t0 = performance.now();
      const d = new Float32Array(ana.frequencyBinCount), hz = ana.context.sampleRate / ana.fftSize;
      while (performance.now() - t0 < s * 1000) {
        ana.getFloatFrequencyData(d);
        for (let i = Math.floor(f0 / hz); i <= Math.ceil(f1 / hz); i++) if (d[i] > m) m = d[i];
        await dodo(60);
      }
      return +m.toFixed(1);
    };
    const pilule = () => { const el = document.getElementById('etat-police'); return el ? { vis: getComputedStyle(el).display !== 'none', svg: el.querySelectorAll('svg').length, etoiles: el.dataset.etoiles || '' } : null; };

    pat.remiseAZero();
    P.flying = false; P.yaw = 0; P.pitch = 0; P.vel.set(0, 0, 0);
    P.pos.set(x0 + 0.5, y0 + 1.2, z0 + 40.5);
    await dodo(1500);
    const a = am.invoquer('voiture', P.pos.x, P.pos.z - 3, false, { flotte: 'amg-gt-black-series.glb' });
    a.yaw = Math.PI; await dodo(400);
    for (let i = 0; i < 6 && !(g.fun.montureConduite && g.fun.montureConduite()); i++) { document.getElementById('ride-btn').click(); await dodo(600); }
    out.auVolant = !!(g.fun.montureConduite && g.fun.montureConduite());
    if (!out.auVolant) return out;
    // la bande haute de la sirène (1 100 à 1 450 Hz) sur une période entière
    // (quatre secondes), au-dessus du souffle du moteur — mesurée en roulant
    // AVANT la bêtise, puis en roulant pendant la poursuite
    P.touchMove.f = 0.8; P.touchMove.s = -1;
    out.avant = { pilule: pilule(), bande: await bande(4.2, 1100, 1450), points: pat.etat().points };
    P.touchMove.f = 0; P.touchMove.s = 0;
    for (let i = 0; i < 40 && Math.abs(P.vitesseVoiture || 0) > 0.3; i++) await dodo(100);
    P.yaw = 0; a.yaw = Math.PI;
    // LA VRAIE BÊTISE : une voiture garée sur la route, et l'on fonce dedans
    const garee = am.invoquer('voiture', P.pos.x, P.pos.z - 30, false, { flotte: 'amg-gt-black-series.glb' });
    garee.yaw = 0;
    P.touchMove.f = 1; P.touchMove.s = 0;
    const tc = performance.now();
    while (performance.now() - tc < 12000 && pat.etat().points <= 0) await dodo(100);
    out.choc = { points: pat.etat().points, derniere: pat.etat().derniere, ms: Math.round(performance.now() - tc),
      contact: P.contact && P.contact.famille, force: P.choc && P.choc.force };
    // on tourne sur la dalle : la piste s'allonge, la police arrive
    P.touchMove.f = 0.8; P.touchMove.s = -1;
    const t0 = performance.now();
    let vu = null;
    while (performance.now() - t0 < 25000) {
      await dodo(250);
      const e = pat.etat();
      if (e.unites.length && !vu) vu = { ms: Math.round(performance.now() - t0), ...e.unites[0] };
      if (vu && performance.now() - t0 > vu.ms + 2500) break;
    }
    out.apparition = vu;
    out.pendant = { pilule: pilule(), bande: await bande(4.2, 1100, 1450), sirene: S.etat().sirene };
    const unite = am.animals.find((x) => x.enService && x.def.key === 'voiture');
    out.unite = unite ? { modele: unite.mesh.userData.flotte, menee: unite.menee, montable: !unite.enService,
      eclats: unite.mesh.children.filter((o) => /^Eclat_/.test(o.name)).length } : null;
    // les gyrophares ALTERNENT : on les lit sur une seconde
    const vus = new Set();
    for (let i = 0; i < 12 && unite; i++) { vus.add(unite.mesh.children.filter((o) => /^Eclat_/.test(o.name) && o.visible).map((o) => o.name).join('+')); await dodo(90); }
    out.gyrophares = [...vus];
    // deux étoiles : la moto
    pat.betise('pieton');
    const t1 = performance.now();
    while (performance.now() - t1 < 15000 && !pat.etat().unites.some((u) => u.type === 'moto')) await dodo(300);
    out.moto = pat.etat().unites.find((u) => u.type === 'moto') || null;
    out.etoiles2 = pat.etoiles();
    // on s'arrête
    P.touchMove.f = 0; P.touchMove.s = 0;
    const t2 = performance.now();
    let ctrl = null, distMin = Infinity;
    while (performance.now() - t2 < 45000) {
      await dodo(300);
      const e = pat.etat();
      for (const u of e.unites) distMin = Math.min(distMin, Math.hypot(u.x - P.pos.x, u.z - P.pos.z));
      if (e.controle && !ctrl) ctrl = { ms: Math.round(performance.now() - t2), ...e.controle };
      if (e.controle && e.controle.etape === 'parle' && ctrl) ctrl.parle = true;
      if (ctrl && !e.controle) break;
    }
    out.controle = ctrl;
    out.distanceMin = +distMin.toFixed(2);
    out.dits = dits;
    out.apres = { etat: pat.etat(), pilule: pilule() };
    out.gareeMontable = am.animals.filter((x) => x.mesh.userData.flotte === 'police-car.glb' && !x.enService && !x.menee).length;
    // et l'on rend la main : on descend, la patrouille à zéro
    for (let i = 0; i < 6 && g.fun.montureConduite && g.fun.montureConduite(); i++) { document.getElementById('ride-btn').click(); await dodo(500); }
    pat.remiseAZero();
    return out;
  }, [x0, z0, y0]);
}

async function passageMoto(page) {
  const x0 = 49000, z0 = 49000;
  const y0 = await dalle(page, x0, z0, 80);
  return page.evaluate(async ([x0, z0, y0]) => {
    const THREE = await import('three');
    const g = window.__game, P = g.player, am = g.animalManager;
    const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    if (window.__patrouille) window.__patrouille.remiseAZero();
    P.flying = false; P.yaw = 0; P.pitch = 0; P.vel.set(0, 0, 0);
    P.pos.set(x0 + 0.5, y0 + 1.2, z0 + 40.5);
    await dodo(1200);
    const m = am.invoquer('moto', P.pos.x, P.pos.z - 2.5);
    if (!m) return { err: 'pas d\'espèce moto' };
    m.yaw = Math.PI;
    const t0 = performance.now();
    while (performance.now() - t0 < 20000 && !m.mesh.userData.modele) await dodo(200);
    out.modele = !!m.mesh.userData.modele;
    out.roues = (m.mesh.userData.roues || []).map((r) => r.name).sort();
    for (let i = 0; i < 6 && !(g.fun.montureConduite && g.fun.montureConduite()); i++) { document.getElementById('ride-btn').click(); await dodo(600); }
    const montee = g.fun.montureConduite && g.fun.montureConduite();
    out.enSelle = !!montee && montee.def.key === 'moto';
    if (!out.enSelle) return out;
    out.gabarit = P.gabarit;
    out.moteur = window.__sons.etat().moteur;
    await dodo(500);
    // l'avatar à califourchon, enfant du maillage de la moto
    let av = null; m.mesh.traverse((o) => { if (!av && o.userData && o.userData.arms && o.userData.legs) av = o; });
    out.avatar = av ? { cuisse: +av.userData.legs[0].rotation.x.toFixed(2), bras: +av.userData.arms[0].rotation.x.toFixed(2) } : null;
    // un virage à gauche à pleins gaz : la moto se couche-t-elle vers l'intérieur ?
    P.touchMove.f = 1; P.touchMove.s = 0; await dodo(1500);
    P.touchMove.s = -1;
    // relevé IMAGE PAR IMAGE (un minuteur tombe deux fois dans la même image) :
    // le côté où l'on tourne se lit sur le cap de la moto d'une image à
    // l'autre, et le haut de la moto doit pencher de ce côté-là
    const rel = [];
    let prec = null;
    const t1 = performance.now();
    await new Promise((fin) => {
      const pas = () => {
        if (performance.now() - t1 > 4000) return fin();
        const q = new THREE.Quaternion(); m.mesh.getWorldQuaternion(q);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const av = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
        const h = Math.hypot(av.x, av.z) || 1;
        const f = { x: av.x / h, z: av.z / h };
        if (prec) rel.push({ tourne: prec.z * f.x - prec.x * f.z, gx: f.z, gz: -f.x, ux: up.x, uz: up.z, v: P.vitesseVoiture || 0 });
        prec = f;
        requestAnimationFrame(pas);
      };
      requestAnimationFrame(pas);
    });
    P.touchMove.f = 0; P.touchMove.s = 0;
    let bons = 0, mauvais = 0, lean = 0;
    for (const r of rel) {
      if (Math.abs(r.tourne) < 1e-3 || Math.abs(r.v) < 4) continue;
      const h = Math.hypot(r.ux, r.uz);
      if (h < 0.05) continue;
      lean = Math.max(lean, Math.asin(Math.min(1, h)));
      const sg = Math.sign(r.tourne);
      if ((r.ux * r.gx * sg + r.uz * r.gz * sg) / h > 0.3) bons++; else mauvais++;
    }
    out.virage = { bons, mauvais, lean: +lean.toFixed(2), vMax: +Math.max(...rel.map((r) => Math.abs(r.v))).toFixed(1) };
    await dodo(1500);
    const avant = { x: P.pos.x, z: P.pos.z };
    for (let i = 0; i < 6 && g.fun.montureConduite && g.fun.montureConduite(); i++) { document.getElementById('ride-btn').click(); await dodo(500); }
    out.descendu = !(g.fun.montureConduite && g.fun.montureConduite());
    out.pasDeCote = +Math.hypot(P.pos.x - avant.x, P.pos.z - avant.z).toFixed(2);
    out.gabaritApres = P.gabarit;
    return out;
  }, [x0, z0, y0]);
}

if (require.main === module) (async () => {
  const banc = new Banc();
  await banc.ouvrir();
  try {
    const page = await banc.jouerSeul('Policia', { pret: true });
    page.on('pageerror', (e) => console.log('ERREUR', e.message));
    if (!process.env.MOTO_SEULE) console.log(JSON.stringify(await passage(page), null, 1));
    console.log(JSON.stringify(await passageMoto(page), null, 1));
  } finally { await banc.fermer(); process.exit(0); }
})();
module.exports = { passage, passageMoto };
